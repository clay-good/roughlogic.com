#!/usr/bin/env node
// spec-v12 Phase G.3: dist/-vs-runtime cross-check.
//
// After `npm run build` produces dist/, walk every shipped HTML / JS /
// CSS / JSON file under dist/ and assert that every same-origin reference
// resolves to a file actually present in dist/. A dangling reference
// (e.g., a fetch("data/foo/bar.json") that the build did not copy)
// becomes a CI failure with the path of the missing target.
//
// This is the inverse of the G.2 check-wiring lint:
//
//   G.2: runtime-imported .js -> scripts/build.mjs FILES (catches the
//        v5-platform.js miss class).
//   G.3: shipped dist/ references -> on-disk dist/ files (catches the
//        inverse: a data shard referenced by app.js or by a renderer
//        but missing from the data/ tree the build copied).
//
// The check also emits a *warning* (not a failure) for files that are
// present in dist/ but never referenced anywhere in the shipped bundle;
// this catches the orthogonal class of bug ("we shipped a stale shard
// that nothing reads") without failing the build.
//
// Standalone Node 20 script using only built-ins. No network, no deps.
// Runs after `build` in `npm run audit`.

import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, relative, dirname, posix } from "node:path";
import { existsSync } from "node:fs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const DIST = resolve(ROOT, "dist");

if (!existsSync(DIST)) {
  console.error("check-dist: dist/ does not exist. Run `npm run build` first.");
  process.exit(1);
}

let failed = false;
function fail(msg) {
  console.error("check-dist: " + msg);
  failed = true;
}

// Recursively walk dist/ collecting every relative file path.
async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
    } else if (entry.isFile()) {
      out.push(relative(DIST, full).split("\\").join("/"));
    }
  }
  return out;
}

// Per file type, decide what to scan for. Returns an array of
// { match: RegExp, capture: index, kind: string } scanners.
function scannersFor(rel) {
  const ext = rel.split(".").pop();
  if (ext === "html") {
    return [
      { match: /<(?:script|img|link|source|video|audio)[^>]*\b(?:src|href)\s*=\s*["']([^"'#?][^"'?#]*)["']/g, capture: 1, kind: "html-asset" },
      { match: /<link[^>]*\brel\s*=\s*["'](?:icon|manifest|preload)["'][^>]*\bhref\s*=\s*["']([^"'#?][^"'?#]*)["']/g, capture: 1, kind: "html-link" },
    ];
  }
  if (ext === "js" || ext === "mjs") {
    const scanners = [
      // Static + dynamic imports of same-origin .js (relative).
      { match: /from\s+["']\.?\/?([a-zA-Z0-9_./-]+\.(?:js|mjs))["']/g, capture: 1, kind: "js-import" },
      { match: /\bimport\(\s*["']\.?\/?([a-zA-Z0-9_./-]+\.(?:js|mjs))["']\s*\)/g, capture: 1, kind: "js-dynamic-import" },
      // app.js declare("./calc-X.js", "X_RENDERERS", [...]) helper for
      // dynamic tile-module registration. The runtime calls
      // import(meta.path) where meta.path is the first declare() arg.
      { match: /\bdeclare\s*\(\s*["']\.?\/?([a-zA-Z0-9_./-]+\.(?:js|mjs))["']/g, capture: 1, kind: "js-declare" },
      // new Worker("./<x>.js", { type: "module" }) for the v3 §HVAC
      // Manual J background worker (and any future workers).
      { match: /new\s+Worker\s*\(\s*["']\.?\/?([a-zA-Z0-9_./-]+\.(?:js|mjs))["']/g, capture: 1, kind: "js-worker" },
      // fetch("data/foo/bar.json"), fetch("./data/x.json"), etc.
      { match: /\bfetch\s*\(\s*["']([^"':?#][^"'?#]*\.(?:json|csv|txt|svg|png|jpg|jpeg|gif|webp|wasm))["']/g, capture: 1, kind: "js-fetch" },
    ];
    // sw.js precaches the application shell as a plain string array
    // (SHELL_ASSETS / DATA_MANIFESTS). Those entries don't match any
    // import / fetch syntax, so without this scanner the runtime-cached
    // modules show up as orphan warnings. Scan ./<file>.<ext> string
    // literals so the SW precache list counts as a reference (and a
    // typo in that list surfaces as a G.3 dangling-reference failure).
    if (rel === "sw.js") {
      scanners.push({
        match: /["']\.\/([a-zA-Z0-9_./-]+\.(?:js|mjs|css|html|svg|json|webmanifest|txt|xml|md))["']/g,
        capture: 1,
        kind: "sw-precache",
      });
    }
    return scanners;
  }
  if (ext === "css") {
    return [
      { match: /url\(\s*["']?([^"')#?][^"')?#]*)["']?\s*\)/g, capture: 1, kind: "css-url" },
    ];
  }
  if (ext === "json") {
    // Manifests reference siblings via short keys (file). The integrity
    // index records folder names. Skip JSON cross-references; they're
    // already covered by data:verify against expected-hashes.json.
    return [];
  }
  return [];
}

// Resolve a reference from a source file to a normalized dist/ path.
// Returns the relative-to-dist path or null if external / non-local.
function resolveRef(sourceRel, ref) {
  // Strip query / fragment.
  ref = ref.split("?")[0].split("#")[0];
  if (!ref) return null;
  // Absolute URLs (http(s):, mailto:, etc.) are not our concern.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(ref)) return null;
  // Protocol-relative.
  if (ref.startsWith("//")) return null;
  // Skip leading "/" (treat as relative to dist root).
  let resolved;
  if (ref.startsWith("/")) {
    resolved = ref.slice(1);
  } else {
    const dir = posix.dirname(sourceRel);
    resolved = posix.normalize(posix.join(dir, ref));
  }
  // Strip any ./ or trailing slash artifacts.
  if (resolved.startsWith("./")) resolved = resolved.slice(2);
  return resolved;
}

async function main() {
  const files = await walk(DIST);
  const present = new Set(files);
  const referenced = new Set();
  let totalRefsChecked = 0;

  for (const rel of files) {
    const scanners = scannersFor(rel);
    if (scanners.length === 0) continue;
    let text;
    try {
      text = await readFile(resolve(DIST, rel), "utf8");
    } catch {
      continue;
    }
    for (const s of scanners) {
      for (const m of text.matchAll(s.match)) {
        const ref = m[s.capture];
        const resolved = resolveRef(rel, ref);
        if (resolved === null) continue;
        totalRefsChecked++;
        referenced.add(resolved);
        if (!present.has(resolved)) {
          // The G.3 spec says: a dangling reference is a FAILURE.
          fail(rel + " references ./" + resolved + " (" + s.kind + ") but dist/ does not ship that path");
        }
      }
    }
  }

  // Warning: files in dist/ that are never referenced from anywhere
  // shipped. Allow-list the files that legitimately have no inbound
  // reference (entry HTML, the service worker, _headers, robots,
  // sitemap, LICENSE, CHANGELOG.md, build-info.json, top-level
  // manifest icons, etc.).
  const ORPHAN_EXEMPT = new Set([
    "index.html",
    "sw.js",
    "_headers",
    "robots.txt",
    "sitemap.xml",
    "LICENSE",
    "build-info.json",
    "favicon.svg",
    "site.webmanifest",
  ]);
  const orphans = [];
  for (const rel of files) {
    if (ORPHAN_EXEMPT.has(rel)) continue;
    // Per-folder manifest.json files and integrity.json are part of the
    // data-verify pipeline; the runtime integrity.js loads them at start.
    if (rel === "data/integrity.json") continue;
    if (rel.endsWith("/manifest.json") && rel.startsWith("data/")) continue;
    // Per-shard JSON files under data/ are fetched by tile renderers
    // via dynamic paths. The G.2 + worked-examples-runner already
    // exercises the actual fetch path; we exempt them here so the
    // orphan warning does not duplicate that signal.
    if (rel.startsWith("data/") && rel.endsWith(".json")) continue;
    // spec-v13 Phase A + D: per-tile and per-group prerendered shells
    // live under dist/tools/<id>/index.html and dist/groups/<slug>/
    // index.html. The shells are crawler-facing reference pages
    // (sitemap-listed, canonical URLs) and are not referenced by any
    // other HTML / JS / CSS asset. Exempt them from the orphan warning.
    if (rel.startsWith("tools/") && rel.endsWith("/index.html")) continue;
    if (rel.startsWith("groups/") && rel.endsWith("/index.html")) continue;
    if (!referenced.has(rel)) orphans.push(rel);
  }
  if (orphans.length > 0) {
    console.warn("check-dist: " + orphans.length + " orphan file(s) shipped to dist/ but not referenced by any HTML / JS / CSS:");
    for (const o of orphans) console.warn("  - " + o);
  }

  if (failed) {
    console.error("");
    console.error("check-dist: at least one dangling reference. fix the above and re-run.");
    process.exit(1);
  }
  console.log("v12 dist/-vs-runtime cross-check OK (" +
    files.length + " files in dist/; " +
    totalRefsChecked + " same-origin references resolved; " +
    orphans.length + " orphan warning(s) [G.3]).");
}

await main();
