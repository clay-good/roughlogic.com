#!/usr/bin/env node
// Static-page value gate.
//
// `render-no-nan` drives every tile in a browser and asserts the LIVE app never
// renders NaN / Infinity / undefined. Nothing made the same assertion about the
// static tile pages -- and those are what a crawler, a no-JS reader, and every
// link preview actually get. `check-shells` covers their titles, descriptions,
// JSON-LD and gzip size, but never looks at the numbers on them.
//
// That gap shipped real defects. Two were found by hand on this surface: an
// answer unit applied to a value the renderer scales first (a 70% sling bend
// efficiency printed as "0.7%"), and a boolean answer printed as a bare "0"
// ("PMI required? 0"). Both were caught by reading pages, which is not a gate.
//
// This asserts the part that is unambiguous: no rendered value may be NaN,
// Infinity, undefined, "[object Object]", or empty. Every one of those is a
// leak with no legitimate instance -- verified across all 1,804 pages, which is
// why this can be fail-on-any rather than a baseline.
//
// Deliberately NOT gated here: a JSON literal (six rows are the honest
// rendering for a data-keyed map or a nested shape) and the words true/false
// (a checkbox input's value). Those have legitimate instances, so gating them
// would need an allowlist -- and an allowlist that starts nearly empty exists
// only to absorb the first regression silently.
//
// Reads dist/, so it runs after a build. Standalone Node 20, built-ins only.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS_DIR = resolve(ROOT, "dist", "tools");

// A rendered row is `<li><span>caption</span> <b>value</b></li>`; an uncaptioned
// one leads with <code>. Both carry the value in the same <b>.
const ROW = /<li>(?:<span>([^<]*)<\/span>|<code>([^<]*)<\/code>) <b>([^<]*)<\/b><\/li>/g;
const BAD = [
  [/\bNaN\b/, "NaN"],
  [/\bInfinity\b/, "Infinity"],
  [/\bundefined\b/, "undefined"],
  [/\[object Object\]/, "[object Object]"],
];

function main() {
  if (!existsSync(TOOLS_DIR)) {
    console.error("✗ check-shell-values: dist/tools is missing. Run `npm run build` first.");
    process.exit(1);
  }
  const failures = [];
  let pages = 0, rows = 0;
  for (const id of readdirSync(TOOLS_DIR)) {
    const file = resolve(TOOLS_DIR, id, "index.html");
    if (!existsSync(file)) continue;
    pages++;
    const html = readFileSync(file, "utf8");
    for (const block of ["You enter", "You get"]) {
      const seg = new RegExp(block + "([\\s\\S]*?)(?:<details|You get)").exec(html);
      if (!seg) continue;
      for (const m of seg[1].matchAll(ROW)) {
        const caption = (m[1] ?? m[2] ?? "").trim();
        const value = m[3].trim();
        rows++;
        if (value === "") {
          failures.push(`${id}: "${caption}" renders an EMPTY value.`);
          continue;
        }
        for (const [re, name] of BAD) {
          if (re.test(value)) failures.push(`${id}: "${caption}" renders ${name} -- "${value.slice(0, 60)}".`);
        }
      }
    }
  }
  if (failures.length) {
    for (const f of failures) console.error("ERROR: " + f);
    console.error(`check-shell-values FAILED: ${failures.length} bad rendered value(s).`);
    process.exit(1);
  }
  console.log(`check-shell-values OK: ${rows} rendered rows across ${pages} tile pages; no NaN, Infinity, undefined, [object Object] or empty value.`);
}

main();
