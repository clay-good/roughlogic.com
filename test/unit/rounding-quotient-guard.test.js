// A count rounded from a floating-point quotient lands a hair off a whole
// number: 12 x 1.1 / 0.6 is 22.000000000000004, so Math.ceil said 23 bags.
// On 2026-10-01 a differential fuzz found 63 tiles reading one unit off at
// round inputs, and every simple Math.ceil / Math.floor of a quotient in the
// calc modules gained a 1e-9 guard. This holds the line: a NEW unguarded one
// fails here. The budget is the complex expressions (ternaries, commas) the
// codemod left for review -- lower it as they are guarded, never raise it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BUDGET = 39;

function unguarded(src) {
  const found = [];
  const re = /Math\.(ceil|floor)\(/g;
  let m;
  while ((m = re.exec(src))) {
    let depth = 1, j = m.index + m[0].length;
    const start = j;
    while (depth && j < src.length) { const c = src[j]; if (c === "(") depth++; else if (c === ")") depth--; j++; }
    const inner = src.slice(start, j - 1);
    let d = 0, topDiv = false;
    for (let k = 0; k < inner.length; k++) {
      const c = inner[k];
      if (c === "(" || c === "[") d++;
      else if (c === ")" || c === "]") d--;
      else if (c === "/" && d === 0 && inner[k + 1] !== "/" && inner[k + 1] !== "*" && inner[k - 1] !== "*") topDiv = true;
    }
    if (topDiv && !/1e-9|1e-6|1e-12|EPS/.test(inner)) found.push(inner.slice(0, 80));
  }
  return found;
}

test("every Math.ceil / Math.floor of a quotient carries a float guard (within the review budget)", () => {
  const all = [];
  for (const f of readdirSync(ROOT).filter((n) => /^calc-.*\.js$/.test(n))) {
    for (const hit of unguarded(readFileSync(resolve(ROOT, f), "utf8"))) all.push(f + ": " + hit);
  }
  assert.ok(all.length <= BUDGET, `${all.length} unguarded quotient roundings (budget ${BUDGET}):\n${all.join("\n")}`);
});
