#!/usr/bin/env node
// Spec section 11.1 / spec-v2 section 6: home-view payload budget.
// Spec-v10 §H.2: per-asset sub-budgets (HTML 20 KB, CSS 25 KB, JS 40 KB
// gzipped). The sub-budgets sum to less than 100 KB to leave slack for
// future growth.
//
// The home view is what the user receives on first paint. It must be
// under 100 KB after gzip. The home-view payload is index.html plus the
// CSS, JS, and routing helpers that render the tile grid. Calculator
// modules (calc-*.js) and their support libs (hash-state, data-stamp,
// clipboard, ui-fields, ui-validity, pure-math) are dynamic-imported on
// first tool open and do not contribute to the home-view payload.
//
// Usage: `npm run check:home-payload` (also wired into npm run lint).
//   Exits non-zero if the total budget or any sub-budget is exceeded.

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
  { rel: "index.html", category: "html" },
  { rel: "styles.css", category: "css" },
  { rel: "theme.js", category: "js" },
  { rel: "app.js", category: "js" },
  { rel: "integrity.js", category: "js" },
  { rel: "routing.js", category: "js" },
];

const BUDGET_BYTES = 100 * 1024;

// Spec-v10 §H.2 per-category sub-budgets (gzipped).
//
// THE JS SUB-BUDGET IS BACK TO ITS SPECIFIED 40 KB. It had been bumped five
// times -- 40 -> 42 -> 45 -> 47 -> 49 -> 52 KB between 2026-05-12 and
// 2026-08-26 -- because every tile added to the catalog cost app.js a
// tile-id string in its inline TOOL_MODULES table, and each bump was
// recorded as an interim accommodation for the remediation spec-v10
// §§H.1/H.2 actually calls for: extracting that table into its own
// lazy-loaded shard.
//
// That extraction landed on 2026-08-27. The table is now `tool-modules.js`,
// imported on the first tile open rather than at boot, and app.js gzipped
// went from 47,085 B to 22,878 B -- the registry was 24.4 KB of it, 46% of
// the entire JS sub-budget, for a table the home view never reads. The
// home-view JS total went from 50,385 B (94.6% of the inflated 52 KB cap)
// to 26,178 B, which is 64% of the ORIGINAL 40 KB budget.
//
// The budget is therefore restored rather than left at its accommodated
// value, so the gate means what the spec says again. Note what changed and
// what did not: the home view no longer pays for catalog growth at all, so
// adding tiles moves tool-modules.js (which has no home-view budget) and
// leaves this number alone.
//
// Sub-budgets sum to 85 KB; the gap to the overall 100 KB cap is
// intentional slack.
const SUB_BUDGETS = {
  html: 20 * 1024,
  css: 25 * 1024,
  js: 40 * 1024,
};

let total = 0;
const sizes = [];
const subTotals = { html: 0, css: 0, js: 0 };
for (const f of HOME_FILES) {
  const buf = await readFile(resolve(ROOT, f.rel));
  const gz = gzipSync(buf).length;
  total += gz;
  subTotals[f.category] += gz;
  sizes.push({ file: f.rel, category: f.category, raw: buf.length, gzip: gz });
}

console.log("home-view payload (gzipped):");
for (const s of sizes) {
  console.log(
    "  " +
      s.file.padEnd(20) +
      " " +
      String(s.gzip).padStart(8) +
      " B (raw " +
      s.raw +
      ")  [" +
      s.category +
      "]",
  );
}
console.log(
  "  " + "total".padEnd(20) + " " + String(total).padStart(8) + " B / " + BUDGET_BYTES + " B budget",
);

console.log("per-category sub-budgets (spec-v10 §H.2):");
const failures = [];
for (const cat of ["html", "css", "js"]) {
  const used = subTotals[cat];
  const cap = SUB_BUDGETS[cat];
  const pct = ((used / cap) * 100).toFixed(1);
  console.log(
    "  " + cat.padEnd(20) + " " + String(used).padStart(8) + " B / " + cap + " B (" + pct + "%)",
  );
  if (used > cap) {
    failures.push(
      cat.toUpperCase() + " sub-budget: " + used + " B exceeds " + cap + " B (spec-v10 §H.2).",
    );
  }
}

// docs/performance.md quotes the measured payload in two places. Both said
// 47,209 B against a live 47,307 -- drift small enough that nobody would catch
// it by reading, and large enough to compound. Checked with a 2% band rather
// than byte-exactly: a stated figure exists to tell a reader the order of
// magnitude, and a pin that fails on 98 bytes of CSS would be edited out of
// the way rather than obeyed.
const DOC = resolve(ROOT, "docs", "performance.md");
const docText = await readFile(DOC, "utf8");
const stated = [...docText.matchAll(/payload (?:is|gzips to) \*\*([\d,]+) B\*\*/g)].map((m) => Number(m[1].replace(/,/g, "")));
if (stated.length === 0) {
  failures.push("docs/performance.md no longer states the home-view payload; the drift check has nothing to compare.");
}
for (const n of stated) {
  if (Math.abs(n - total) > total * 0.02) {
    failures.push(
      "docs/performance.md states a home-view payload of " + n + " B; the live figure is " + total +
      " B, more than 2% away. Update the prose.",
    );
  }
}

if (total > BUDGET_BYTES) {
  failures.push(
    "Total payload: " + total + " B exceeds " + BUDGET_BYTES + " B (spec section 11.1).",
  );
}

if (failures.length > 0) {
  for (const f of failures) console.error("FAIL: " + f);
  process.exit(1);
} else {
  const pct = ((total / BUDGET_BYTES) * 100).toFixed(1);
  console.log("OK: home-view payload " + total + " B (" + pct + "% of " + BUDGET_BYTES + " B budget).");
}
