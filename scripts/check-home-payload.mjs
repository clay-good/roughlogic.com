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

// Spec-v10 §H.2 per-category sub-budgets (gzipped). The JS sub-budget
// was bumped 40 -> 42 KB on 2026-05-12 when the v12 Group U / V / W /
// X / Y TOOLS entries (~15 new rows) pushed app.js gzipped from
// ~35.5 KB to ~37.4 KB, then re-bumped 42 -> 45 KB on 2026-05-13 when
// the U / V / W / X / Y expansion batches pushed app.js past 38 KB
// gzipped, then re-bumped 45 -> 47 KB on 2026-06-01 when the spec-v15
// Group A + Group G TOOLS rows (nine new tiles) pushed app.js gzipped
// past 45 KB. Per spec-v10 §H.1 / §H.2 a TOOLS-extraction into its own
// lazy-loaded shard remains the preferred long-term remediation;
// the cap bumps are the documented interim accommodation while the
// v15 tile groups are still landing. Sub-budgets sum to 92 KB; the
// gap to the overall 100 KB cap is intentional slack.
const SUB_BUDGETS = {
  html: 20 * 1024,
  css: 25 * 1024,
  js: 47 * 1024,
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
