#!/usr/bin/env node
// Spec section 11.1 / spec-v2 section 6: home-view payload budget.
//
// The home view is what the user receives on first paint. It must be
// under 100 KB after gzip. The home-view payload is index.html plus the
// CSS, JS, and routing helpers that render the tile grid. Calculator
// modules (calc-*.js) and their support libs (hash-state, data-stamp,
// clipboard, ui-fields, ui-validity, pure-math) are dynamic-imported on
// first tool open and do not contribute to the home-view payload.
//
// Usage: `npm run check:home-payload` (also wired into npm run lint).
//   Exits non-zero if the budget is exceeded.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");

// Files that are loaded on the home view. Calculator modules are not
// included (they are dynamic-imported only when a tool is opened).
// theme.js is a small synchronous head-loaded script that runs before
// the first paint to apply the saved theme without flicker; it counts
// toward home-view first-paint cost and so is included here.
const HOME_FILES = [
  "index.html",
  "styles.css",
  "theme.js",
  "app.js",
  "integrity.js",
  "routing.js",
];

const BUDGET_BYTES = 100 * 1024;

let total = 0;
const sizes = [];
for (const rel of HOME_FILES) {
  const buf = await readFile(resolve(ROOT, rel));
  const gz = gzipSync(buf).length;
  total += gz;
  sizes.push({ file: rel, raw: buf.length, gzip: gz });
}

console.log("home-view payload (gzipped):");
for (const s of sizes) {
  console.log("  " + s.file.padEnd(20) + " " + String(s.gzip).padStart(8) + " B (raw " + s.raw + ")");
}
console.log("  " + "total".padEnd(20) + " " + String(total).padStart(8) + " B / " + BUDGET_BYTES + " B budget");

if (total > BUDGET_BYTES) {
  console.error("FAIL: home-view payload " + total + " B exceeds " + BUDGET_BYTES + " B budget (spec section 11.1).");
  process.exit(1);
} else {
  const pct = ((total / BUDGET_BYTES) * 100).toFixed(1);
  console.log("OK: home-view payload " + total + " B (" + pct + "% of " + BUDGET_BYTES + " B budget).");
}
