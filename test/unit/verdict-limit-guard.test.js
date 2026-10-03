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

// A verdict can also be a field of the returned object (`fits_shift: a <= b,`).
// 2026-10-03: a waste route that fit its 9 h shift exactly read 9.000000000000002
// h and "does not fit"; 83 such fields were guarded. A field whose expression
// holds a top-level comma or a string literal is skipped (not a single verdict).
function propVerdict(line, name) {
  const m = new RegExp("^\\s*(" + name + "): (.+),\\s*(//.*)?$").exec(line);
  if (!m || /["'`]/.test(m[2])) return null;
  let d = 0;
  for (const c of m[2]) { if ("([{".includes(c)) d++; else if (")]}".includes(c)) d--; else if (c === "," && d === 0) return null; }
  return m;
}

// Split at top-level && / || (a top-level ternary skips the line: its branches
// are values, not verdict terms), and flag each term that is a single
// inclusive comparison without slack. 2026-10-03: a second codemod pass covered
// 81 such terms inside compound verdicts (`a >= b && c <= d`).
function splitTop(expr) {
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
  return terms.map((t) => t.trim());
}

// A term wrapped whole in parentheses -- `!x || (a >= 34 && a <= 38)` -- is
// opened and checked term by term (2026-10-03: a handrail window hid there).
function wrapped(t) {
  if (!(t.startsWith("(") && t.endsWith(")"))) return false;
  let d = 0;
  for (let i = 0; i < t.length - 1; i++) { if (t[i] === "(") d++; else if (t[i] === ")") d--; if (d === 0) return false; }
  return true;
}

// A ternary verdict -- `rating === null ? null : force <= rating` -- is checked
// in its two branches; the condition picks a branch and is not a verdict term
// (2026-10-03: a tree-cabling rating hid there; a codemod then guarded 124
// such terms, and a fixture snapshot was unchanged).
function ternaryBranches(expr) {
  let d = 0, q = -1, n = 0;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if ("([{".includes(c)) d++;
    else if (")]}".includes(c)) d--;
    else if (d === 0 && c === "?" && expr[i + 1] !== "?" && expr[i + 1] !== "." && expr[i - 1] !== "?") {
      if (q < 0) q = i; n++;
    } else if (d === 0 && c === ":" && q >= 0 && --n === 0) return [expr.slice(q + 1, i), expr.slice(i + 1)];
  }
  return null;
}

function flatTerms(expr) {
  const br = ternaryBranches(expr);
  if (br) return br.flatMap((b) => flatTerms(b.trim()));
  return splitTop(expr).flatMap((t) => (wrapped(t) ? flatTerms(t.slice(1, -1)) : [t]));
}

function unguardedTerms(expr) {
  return flatTerms(expr).filter((t) => !t.includes("1e-") && singleInclusive(t));
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
      const m = LINE.exec(line) || propVerdict(line, NAME);
      if (!m) return;
      for (const t of unguardedTerms(m[2])) bad.push(f + ":" + (i + 1) + " " + m[1] + ": " + t.slice(0, 60));
    });
  }
  assert.deepEqual(bad, []);
});

// The mirror image: a FAILURE verdict with a strict operator (`over = a > b`)
// reads "over" when a sits exactly on b plus float noise. 2026-10-03: 84 such
// terms in exceed / over / too_ / short / undersize verdicts gained slack the
// other way (`a > b + 1e-9 * Math.abs(b)`); a fixture snapshot was unchanged.
// A "governs" flag compares two alternatives, not a value against a limit,
// and a comparison against literal 0 has no relative slack to give.
const FAIL = new RegExp("^\\s*const ((?![a-z_]*govern)[a-z_]*(?:exceed|over|fail|violat|insufficient|inadequate|too_|undersize|short)[a-z_]*) = (.+);\\s*(//.*)?$");

function singleStrict(t) {
  let d = 0, n = 0, rhs = "";
  for (let i = 0; i < t.length; i++) {
    const c = t[i], two = t.slice(i, i + 2);
    if ("([{".includes(c)) d++;
    else if (")]}".includes(c)) d--;
    else if (d === 0) {
      if (["==", "!=", "<=", ">=", "=>", "<<", ">>"].includes(two)) return false;
      if (c === "<" || c === ">") { n++; rhs = t.slice(i + 1).trim(); }
    }
  }
  return n === 1 && !/^0(\.0*)?$/.test(rhs);
}

test("every strict failure verdict against a limit carries float slack away from it", () => {
  const bad = [];
  for (const f of readdirSync(ROOT).filter((n) => /^calc-.*\.js$/.test(n))) {
    readFileSync(resolve(ROOT, f), "utf8").split("\n").forEach((line, i) => {
      const m = FAIL.exec(line) || propVerdict(line, "(?![a-z_]*govern)[a-z_]*(?:exceed|over|fail|violat|insufficient|inadequate|too_|undersize|short)[a-z_]*");
      if (!m) return;
      const terms = flatTerms(m[2]);
      for (const t of terms) if (!t.includes("1e-") && !t.startsWith("!") && !t.startsWith("(") && singleStrict(t)) bad.push(f + ":" + (i + 1) + " " + m[1] + ": " + t.slice(0, 60));
    });
  }
  assert.deepEqual(bad, []);
});

// A demand/capacity unity check (`dcr <= 1`, `utilization > 1`) lives in
// returned objects, verdict strings, and output labels, not only in `_ok`
// consts. A member sized exactly at capacity computes 1.0000000000000002 and
// read OVER. 2026-10-03: 23 such checks gained `1 + 1e-9`. Input validation
// (`return { error`) is exempt; it bounds an entered value, not a result.
test("every demand/capacity unity check carries float slack", () => {
  const bad = [];
  const re = /\b\w*(?:util|dcr|interaction)\w* (?:<=|>) 1(?:\.0)?(?![\d.]| \+ 1e-)/;
  for (const f of readdirSync(ROOT).filter((n) => /^calc-.*\.js$/.test(n))) {
    readFileSync(resolve(ROOT, f), "utf8").split("\n").forEach((line, i) => {
      if (re.test(line) && !/return \{ error/.test(line) && !/^\s*\/\//.test(line)) bad.push(f + ":" + (i + 1) + " " + line.trim().slice(0, 80));
    });
  }
  assert.deepEqual(bad, []);
});
