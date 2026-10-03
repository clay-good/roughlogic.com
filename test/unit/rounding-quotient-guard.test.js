// A count rounded from a floating-point quotient lands a hair off a whole
// number: 12 x 1.1 / 0.6 is 22.000000000000004, so Math.ceil said 23 bags.
// On 2026-10-01 a differential fuzz found 63 tiles reading one unit off at
// round inputs, and every simple Math.ceil / Math.floor of a quotient in the
// calc modules gained a 1e-9 guard. This holds the line: a NEW unguarded one
// fails here. The budget started at the complex expressions the codemod left;
// all were guarded 2026-10-01. Keep it at zero.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BUDGET = 0;

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
    // 2026-10-02: a PRODUCT rounds the same way (50 x 1.1 = 55.00000000000001
    // ordered 56 pieces), and a division nested in parentheses -- n x (1 + w/100)
    // -- hid from the top-level check. Any * or / inside now needs the guard.
    const arithmetic = topDiv || /[*/]/.test(inner.replace(/\/\/.*$/gm, ""));
    if (arithmetic && !/1e-9|1e-6|1e-12|EPS/.test(inner)) found.push(inner.slice(0, 80));
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

// The same error one step removed: the quotient is stored first and the
// variable is rounded (`const g = a / b * k; Math.ceil(g)`). The check above
// only sees a "/" inside the parentheses, so 2026-10-02 found curing compound
// ordering 11 gal for an exact 10.000000000000002 and 20 more such sites.
// A bare variable whose own definition divides or multiplies must be guarded
// too. The reviewed exceptions: a DMS formatter that carries its own rollover
// and a percentile's two bracketing indices (the interpolation weight absorbs
// the error).
const REVIEWED = new Set(["calc-survey.js:mFloat", "calc-historical.js:idx"]);

function unguardedVariables(src) {
  const found = [];
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/Math\.(ceil|floor)\(([A-Za-z_]\w*)\)/g)) {
      const v = m[2];
      for (let k = i; k >= Math.max(0, i - 80); k--) {
        const d = new RegExp("(?:const|let|var)\\s+(?:[^=;]*,\\s*)?" + v + "\\s*=\\s*([^;]*)").exec(lines[k]);
        if (!d) continue;
        if (/[/*]/.test(d[1].replace(/\/\/.*$/, ""))) found.push(v);
        break;
      }
    }
  });
  return found;
}

test("a rounded variable that holds a computed quotient or product carries a float guard", () => {
  const all = [];
  for (const f of readdirSync(ROOT).filter((n) => /^calc-.*\.js$/.test(n))) {
    for (const v of unguardedVariables(readFileSync(resolve(ROOT, f), "utf8"))) {
      if (!REVIEWED.has(f + ":" + v)) all.push(f + ": " + v);
    }
  }
  assert.deepEqual(all, []);
});
