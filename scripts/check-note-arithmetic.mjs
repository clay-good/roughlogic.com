#!/usr/bin/env node
// Note-string arithmetic lint.
//
// Every tile's user-facing `note:` string carries a worked example -- "1.732 x
// 25 = 43.3 kVA", "744 / 1,200 = 62.0%", "D/4 = 2.31 in". The compute code and
// its fixtures are gated and tested, but the hardcoded arithmetic INSIDE the
// note prose is not re-derived by anything: a wrong result there ships silently
// (the calculator still returns the right number; only the explainer text lies).
//
// Two such errors shipped and were caught by hand on 2026-07-19: open-delta-
// transformer said "43.3 / sqrt(3) = 21.65" (it equals 25.0; 21.65 is 43.3/2),
// and a guy-wire note said a 63-degree guy "more than triples the download"
// (tan63/tan45 ~ 2, it doubles). This gate catches the arithmetic half of that
// class in milliseconds.
//
// The rule: for every "EXPR = RESULT" claim in a note where EXPR is fully
// evaluable (decimal literals, + - x/× * / ^, sqrt(N), pi) and RESULT is a
// number, a fraction (7/8), or a percent (62.0%), evaluate EXPR and require it
// to match RESULT within rounding. Anything with a token we cannot evaluate (a
// variable, a spelled-out constant, a units word) is skipped -- conservative by
// design, so a clean run means "no evaluable note example disagrees with its
// own arithmetic," never a false alarm. A percent RESULT is matched against
// EXPR*100 (the note states a fraction as a percentage); nominal-lumber tokens
// (2x4, 4x8, ...) are not multiplications and are skipped. Standalone Node
// script, built-ins only. Wired into npm run lint.

import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");

// Nominal dimensional-lumber tokens ("2x4" is a size, not 2 times 4).
const LUMBER = new Set([
  "2x2", "2x4", "2x6", "2x8", "2x10", "2x12",
  "4x4", "4x6", "4x8", "4x10", "4x12", "6x6", "8x8",
]);

let failed = false;
function fail(msg) {
  console.error("check-note-arithmetic: " + msg);
  failed = true;
}

// Tokenize an expression. Returns a token array, or null if any token cannot be
// evaluated (an unknown identifier / units word) -> caller skips the claim.
function tokenize(expr) {
  const toks = [];
  const s = expr.replace(/×/g, "x");
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t") { i++; continue; }
    if ("()+-/*^".includes(c)) { toks.push(c); i++; continue; }
    if (c === "x") { toks.push("*"); i++; continue; }
    if (/[0-9.]/.test(c)) {
      const m = s.slice(i).match(/^[0-9][0-9,]*\.?[0-9]*/);
      if (!m) return null;
      toks.push(parseFloat(m[0].replace(/,/g, "")));
      i += m[0].length;
      continue;
    }
    const w = s.slice(i).match(/^[a-zA-Z]+/);
    if (!w) return null;
    const word = w[0].toLowerCase();
    if (word === "pi") { toks.push(Math.PI); i += w[0].length; continue; }
    if (word === "sqrt") { toks.push("sqrt"); i += w[0].length; continue; }
    return null; // unknown identifier -> not safely evaluable
  }
  return toks;
}

// Recursive-descent evaluate. Throws on malformed token stream.
function parseEval(toks) {
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  function base() {
    const t = peek();
    if (t === "-") { next(); return -base(); }
    if (t === "sqrt") { next(); if (next() !== "(") throw 0; const v = expr(); if (next() !== ")") throw 0; return Math.sqrt(v); }
    if (t === "(") { next(); const v = expr(); if (next() !== ")") throw 0; return v; }
    if (typeof t === "number") { next(); return t; }
    throw 0;
  }
  function factor() { let v = base(); if (peek() === "^") { next(); v = Math.pow(v, factor()); } return v; }
  function term() { let v = factor(); while (peek() === "*" || peek() === "/") { const op = next(); const r = factor(); v = op === "*" ? v * r : v / r; } return v; }
  function expr() { let v = term(); while (peek() === "+" || peek() === "-") { const op = next(); const r = term(); v = op === "+" ? v + r : v - r; } return v; }
  const v = expr();
  if (p !== toks.length) throw 0;
  return v;
}

// EXPR = RESULT, where EXPR is a run of evaluable tokens (starts at a number)
// and RESULT is a number or a fraction, optionally followed by %.
const EQ_RE = /(\d[\d,]*\.?\d*(?:\s*(?:sqrt\(\s*[0-9.]+\s*\)|pi|[-+*/^]|[x×]|[()]|\d[\d,]*\.?\d*)\s*)*?)\s*=\s*(\d[\d,]*\.?\d*(?:\s*\/\s*\d[\d,]*\.?\d*)?)(\s*%)?/gi;
const NOTE_RE = /note:\s*"((?:[^"\\]|\\.)*)"/g;

async function main() {
  const modules = (await readdir(ROOT, { withFileTypes: true }))
    .filter((d) => d.isFile() && /^calc-.*\.js$/.test(d.name))
    .map((d) => d.name)
    .sort();

  let checked = 0;
  for (const file of modules) {
    const src = await readFile(resolve(ROOT, file), "utf8");
    let nm;
    NOTE_RE.lastIndex = 0;
    while ((nm = NOTE_RE.exec(src)) !== null) {
      const note = nm[1];
      let m;
      EQ_RE.lastIndex = 0;
      while ((m = EQ_RE.exec(note)) !== null) {
        const lhsRaw = m[1].trim();
        const rhsRaw = m[2].trim();
        const isPct = !!m[3];
        // Require a genuine binary operator in the LHS (skip "25 = 25").
        if (!/[x×*/^+]|\d\s*-\s*[\d(]|sqrt|pi/i.test(lhsRaw)) continue;
        if (LUMBER.has(lhsRaw.replace(/\s/g, "").toLowerCase())) continue;
        const lt = tokenize(lhsRaw);
        if (!lt) continue;
        const rt = tokenize(rhsRaw);
        if (!rt) continue;
        let lhs, rhs;
        try { lhs = parseEval(lt); rhs = parseEval(rt); } catch { continue; }
        if (!Number.isFinite(lhs) || !Number.isFinite(rhs)) continue;
        checked++;
        const decimals = rhsRaw.includes("/") ? 3 : (rhsRaw.split(".")[1] || "").length;
        const tol = Math.max(Math.pow(10, -decimals), Math.abs(rhs) * 0.02);
        // A computed value `a` agrees with the stated `b` within rounding. When
        // BOTH are integers a valid worked example is exact (you never round an
        // integer to a different integer), so require exact agreement there --
        // this catches an exact integer typo like "10 / 2 = 6" that the loose
        // last-place tolerance (>= 1 for an integer RESULT) would otherwise
        // swallow, while still tolerating ceil/floor rounding of a NON-integer
        // result (e.g. 1200 * 1.1 / 50 -> 27 pails).
        const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-6;
        const agrees = (a, b) => (isInt(a) && isInt(b) ? Math.abs(a - b) < 0.5 : Math.abs(a - b) <= tol);
        const direct = agrees(lhs, rhs);
        const asPct = agrees(lhs * 100, rhs);
        // A percent RESULT means the note states EXPR as a percentage; a plain
        // RESULT should match EXPR directly (but tolerate the fraction/percent
        // convention either way to stay false-positive-free).
        if (isPct ? (asPct || direct) : (direct || asPct)) continue;
        fail(
          file + ": note worked example \"" + lhsRaw + " = " + rhsRaw + (isPct ? "%" : "") +
          "\" is wrong -- " + lhsRaw + " evaluates to " + lhs.toFixed(Math.max(decimals, 3)) +
          (isPct ? " (" + (lhs * 100).toFixed(Math.max(decimals, 1)) + "%)" : "") +
          ", not " + rhsRaw + (isPct ? "%" : "") + ". Fix the note arithmetic.",
        );
      }
    }
  }

  if (failed) {
    console.error("check-note-arithmetic: see failures above.");
    process.exit(1);
  }
  console.log(
    "check-note-arithmetic OK: " + checked + " evaluable worked example(s) in tile note strings " +
    "across " + modules.length + " calc-* modules match their own arithmetic.",
  );
}

main().catch((e) => {
  console.error("check-note-arithmetic: unexpected error", e);
  process.exit(1);
});
