// A verdict that compares a computed value against a limit with an INCLUSIVE
// operator (<= or >=) must carry float slack toward inclusion, or a value
// exactly at the limit reads on the wrong side: 3 x 0.1 A is
// 0.30000000000000004 A and failed a 0.3 A supply; 34.3 - 15.8 ft is
// 18.499999999999996 and failed an 18.5 ft NESC clearance. Batches 46-70 of
// the printed-example campaign fixed about 30 of these by hand; on 2026-10-03 a
// codemod gave the remaining 229 simple single-comparison verdicts
// (`const x_ok = a <= b;`) the sign-safe form `a <= b + 1e-9 * Math.abs(b)`,
// and a snapshot of every fixture row's full output was unchanged. This holds
// the line: a NEW simple inclusive verdict without slack fails here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const NAME = "[a-z_]*(?:ok|pass|passes|within|meets|fits|reaches|adequate|compliant|safe|covers|sufficient)[a-z_]*";
const LINE = new RegExp("^\\s*const (" + NAME + ") = (.+);\\s*(//.*)?$");

// Split at top-level && / || (a top-level ternary skips the line: its branches
// are values, not verdict terms), and flag each term that is a single
// inclusive comparison without slack. 2026-10-03: a second codemod pass covered
// 81 such terms inside compound verdicts (`a >= b && c <= d`).
function unguardedTerms(expr) {
  const terms = []; let d = 0, start = 0;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i], two = expr.slice(i, i + 2);
    if ("([{".includes(c)) d++;
    else if (")]}".includes(c)) d--;
    else if (d === 0) {
      if (c === "?" && expr[i + 1] !== "?") return [];
      if (two === "??") return [];
      if (two === "&&" || two === "||") { terms.push(expr.slice(start, i)); start = i + 2; i++; }
    }
  }
  terms.push(expr.slice(start));
  return terms.map((t) => t.trim()).filter((t) => !t.includes("1e-") && singleInclusive(t));
}

function singleInclusive(t) {
  let d = 0, n = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i], two = t.slice(i, i + 2);
    if ("([{".includes(c)) d++;
    else if (")]}".includes(c)) d--;
    else if (d === 0) {
      if (two === "==" || two === "!=") return false;
      if (two === "<=" || two === ">=") { n++; i++; continue; }
      if (c === "<" || c === ">") return false;
    }
  }
  return n === 1;
}

test("every simple inclusive verdict comparison carries float slack toward the limit", () => {
  const bad = [];
  for (const f of readdirSync(ROOT).filter((n) => /^calc-.*\.js$/.test(n))) {
    readFileSync(resolve(ROOT, f), "utf8").split("\n").forEach((line, i) => {
      const m = LINE.exec(line);
      if (!m) return;
      for (const t of unguardedTerms(m[2])) bad.push(f + ":" + (i + 1) + " " + m[1] + ": " + t.slice(0, 60));
    });
  }
  assert.deepEqual(bad, []);
});
