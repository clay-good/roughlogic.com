#!/usr/bin/env node
// Static site build for Cloudflare Pages.
//
// Copies the runtime files (HTML, CSS, JS, sw.js, _headers, manifest, icons,
// robots.txt, sitemap.xml, data/, CHANGELOG.md, LICENSE) into ./dist.
// No bundler. No transpiler. No minifier. The shipped files are the source.

import { readdir, mkdir, copyFile, stat, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const DIST = resolve(ROOT, "dist");

// Top-level files copied verbatim.
const FILES = [
  "index.html",
  "changelog.html",
  "changelog.js",
  "styles.css",
  "app.js",
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
  "calc-plumbing.js",
  "calc-hvac.js",
  "calc-restoration.js",
  "calc-construction.js",
  "calc-fire.js",
  "calc-cross.js",
  "calc-references.js",
  "calc-meta.js",
  "calc-trucking.js",
  "calc-mechanic.js",
  "calc-agriculture.js",
  "calc-water.js",
  "calc-stage.js",
  "calc-kitchen.js",
  "calc-field.js",
  "calc-historical.js",
  "calc-accounting.js",
  "calc-legal.js",
  "calc-lab.js",
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
  // v10 Phase D runtime helper (alias / companion resolvers)
  "search-discovery.js",
  "bundle.js",
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

async function main() {
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
