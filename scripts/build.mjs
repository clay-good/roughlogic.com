#!/usr/bin/env node
// Static site build for Cloudflare Pages.
//
// Copies the runtime files (HTML, CSS, JS, sw.js, _headers, manifest, icons,
// robots.txt, sitemap.xml, data/, CHANGELOG.md, LICENSE) into ./dist.
// No bundler. No transpiler. No minifier. The shipped files are the source.

import { readdir, mkdir, copyFile, stat, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const DIST = resolve(ROOT, "dist");

// Top-level files copied verbatim.
const FILES = [
  "index.html",
  "changelog.html",
  "changelog.js",
  "styles.css",
  "app.js",
  "tools-data.js",
  "sw.js",
  "manual-j-worker.js",
  "pure-math.js",
  "routing.js",
  "hash-state.js",
  "data-stamp.js",
  "clipboard.js",
  "ui-fields.js",
  "ui-validity.js",
  "integrity.js",
  "calc-electrical.js",
  "calc-feeder.js",
  "calc-lowvoltage.js",
  "calc-metalair.js",
  "calc-gas.js",
  "calc-pipefit.js",
  "calc-plumbing.js",
  "calc-drainage.js",
  "calc-hvac.js",
  "calc-velocity.js",
  "calc-restoration.js",
  "calc-demo.js",
  "calc-construction.js",
  "calc-earthwork.js",
  "calc-fire.js",
  "calc-cross.js",
  "calc-fab.js",
  "calc-layout.js",
  "calc-shop.js",
  "calc-references.js",
  "calc-trucking.js",
  "calc-mechanic.js",
  "calc-machining.js",
  "calc-agriculture.js",
  "calc-water.js",
  "calc-treatment.js",
  "calc-stage.js",
  "calc-kitchen.js",
  "calc-field.js",
  "calc-survey.js",
  "calc-historical.js",
  "calc-accounting.js",
  "calc-legal.js",
  "calc-lab.js",
  // v12 Group U: Veterinary.
  "calc-vet.js",
  // v12 Group V: EMS / Pre-hospital.
  "calc-ems.js",
  // v12 Group W: Pilots / Aviation.
  "calc-aviation.js",
  // v12 Group X: Real Estate.
  "calc-realestate.js",
  // v12 Group Y: Educators / K-12.
  "calc-edu.js",
  // v65 Group Z (Rigging and Heavy Lift)
  "calc-rigging.js",
  // v5 platform helpers (CSV export, print-table CSS hook, glossary tooltip)
  // imported by the three v5 calc modules above.
  "v5-platform.js",
  "citations.js",
  // v8 Phase D shared helpers
  "cost-output.js",
  "context-band.js",
  "standard-sizes.js",
  // v10 Phase B.1 shared helper (limitation banner for simplified-screening tiles)
  "limitation-banner.js",
  // v10 Phase B.2 per-tile meta object registry (build-time + future
  // limitation-banner runtime lookup)
  "tile-meta.js",
  // v10 Phase D runtime helper (alias resolvers; the companion-strip
  // resolver was retired with calc-meta / bundle.js in commit 5734d28)
  "search-discovery.js",
  "theme.js",
  "_headers",
  "robots.txt",
  "sitemap.xml",
  "site.webmanifest",
  "favicon.svg",
  "CHANGELOG.md",
  "LICENSE",
];

// Optional files: copied if present (legacy ICO/PNG fallbacks).
const OPTIONAL = [
  "favicon.ico",
  "apple-touch-icon.png",
];

async function copyDir(src, dst) {
  if (!existsSync(src)) return;
  const entries = await readdir(src);
  if (!existsSync(dst)) await mkdir(dst, { recursive: true });
  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const s = resolve(src, name);
    const d = resolve(dst, name);
    const st = await stat(s);
    if (st.isDirectory()) await copyDir(s, d);
    else await copyFile(s, d);
  }
}

// Guard against the recurring "new .js file at repo root, forgot to
// add it to FILES, dist/ ships incomplete" bug. v5-platform.js was
// shipped to dist/ via the service-worker pre-cache but not by the
// build copy until 2026-05-12 (a fresh Cloudflare deploy would 404
// any v5 calc-accounting / calc-legal / calc-lab tile on first open
// because v5-platform.js was absent from dist/). This check walks
// the repo root, ignoring known-non-runtime files, and fails the
// build if a *.js file exists that the FILES list omits.
async function checkRuntimeFilesEnumerated() {
  const filesSet = new Set(FILES);
  const skip = new Set([
    "package.json", "package-lock.json",
    "wrangler.jsonc", "lighthouserc.json",
    // changelog.js is in FILES; this list covers things never shipped.
  ]);
  const missing = [];
  for (const name of await readdir(ROOT)) {
    if (skip.has(name) || name.startsWith(".")) continue;
    if (!name.endsWith(".js")) continue;
    const st = await stat(resolve(ROOT, name));
    if (!st.isFile()) continue;
    if (!filesSet.has(name)) missing.push(name);
  }
  if (missing.length > 0) {
    console.error("build: top-level .js files not enumerated in FILES: " + missing.join(", "));
    console.error("build: add them to FILES in scripts/build.mjs or to the skip list above.");
    process.exit(1);
  }
}

async function main() {
  await checkRuntimeFilesEnumerated();
  if (existsSync(DIST)) await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  for (const f of FILES) {
    const s = resolve(ROOT, f);
    if (!existsSync(s)) {
      console.error("missing required file: " + f);
      process.exit(1);
    }
    const d = resolve(DIST, f);
    await mkdir(dirname(d), { recursive: true });
    await copyFile(s, d);
  }

  for (const f of OPTIONAL) {
    const s = resolve(ROOT, f);
    if (!existsSync(s)) continue;
    await copyFile(s, resolve(DIST, f));
  }

  // Copy data/ wholesale.
  await copyDir(resolve(ROOT, "data"), resolve(DIST, "data"));

  // Stamp build hash into a small build-info file (used by the service worker
  // diff and by the data-version footer line).
  const stamp = new Date().toISOString();
  await writeFile(resolve(DIST, "build-info.json"), JSON.stringify({ built: stamp }, null, 2) + "\n", "utf8");

  // Patch the service worker's BUILD_HASH so each build gets a unique
  // shell-cache name. Without this, browsers would never invalidate the
  // old cache. Per spec.md section 6: "Cache name includes the build
  // hash; old caches are deleted on activation."
  const swPath = resolve(DIST, "sw.js");
  const swText = await readFile(swPath, "utf8");
  // Build hash: YYYYMMDDTHHMMSS (15 chars, second-precision; ISO timestamp
  // minus the milliseconds, the trailing Z, and the dash/colon separators).
  const buildHash = stamp.replace(/\.\d+Z$/, "").replace(/[-:]/g, "");
  const patched = swText.replace(/const\s+BUILD_HASH\s*=\s*"[^"]*";/, `const BUILD_HASH = "${buildHash}";`);
  if (patched === swText) {
    throw new Error("build: sw.js BUILD_HASH constant not found; cannot patch.");
  }
  await writeFile(swPath, patched, "utf8");

  // spec-v13 Phase A + D + F: emit per-tile and per-group shells + an
  // expanded sitemap.xml. Runs after the verbatim copy + build-info stamp
  // so it can read dist/build-info.json for the lastmod date.
  const shellsResult = spawnSync(process.execPath, [resolve(ROOT, "scripts/build-shells.mjs")], {
    stdio: "inherit",
  });
  if (shellsResult.status !== 0) {
    console.error("build: build-shells.mjs failed (exit " + shellsResult.status + ").");
    process.exit(1);
  }

  // Final size summary.
  let total = 0;
  let count = 0;
  async function walk(dir) {
    for (const name of await readdir(dir)) {
      const p = resolve(dir, name);
      const st = await stat(p);
      if (st.isDirectory()) await walk(p);
      else { total += st.size; count += 1; }
    }
  }
  await walk(DIST);
  console.log("build: " + count + " files, " + (total / 1024).toFixed(1) + " KB total at " + relative(ROOT, DIST));
}

await main();
