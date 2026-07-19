#!/usr/bin/env node
// _simpleRenderer output-key lint.
//
// A `_simpleRenderer({ compute: computeX, outputs: [...] })` tile renders each
// output via `value: (r) => ... r.KEY ...`, where `r` is the object computeX
// returns. If an output reads `r.KEY` for a KEY that computeX never returns,
// `r.KEY` is `undefined`. For a NUMBER that surfaces as `NaN` and the spec-v18
// render-no-nan Playwright gate catches it -- but for a STRING it renders the
// literal text "undefined" with no NaN, so the tile ships a visibly broken
// output (e.g. a Verdict line reading "OK: undefined") that NO gate sees.
//
// Shipped once as trailer-tongue-weight (calc-trucking.js): the compute built
// the `verdict` string but omitted it from its return object, so the Verdict
// output rendered "undefined". This gate makes that a millisecond lint failure.
//
// The rule: for every _simpleRenderer whose `compute` returns a resolvable
// object shape, each `r.KEY` the block reads must be a key that compute returns.
// The return shape is resolved from `return { ... }` literals and from a
// returned local object carrier (`out = { ... }; out.k = ...; return out`); an
// error passthrough (`const x = computeY(...); if (x.error) return x;`) is
// ignored since the main literal return carries the output keys. Only a return
// that stays opaque -- an object spread (`return { ...t }`) or a returned value
// we cannot resolve -- is skipped, so a clean run is never a false alarm.
// Standalone Node script, built-ins only. Wired into npm run lint.

import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");

let failed = false;
function fail(msg) {
  console.error("check-render-output-keys: " + msg);
  failed = true;
}

// Top-level keys of a compute's `return { ... }` literals, plus flags for the
// two unresolvable shapes. `_g` (the _finiteGuard early return) is ignored.
function returnInfo(src, fnName) {
  const p = src.indexOf(`function ${fnName}(`);
  if (p < 0) return null;
  const end = src.indexOf("\nexport function", p + 1);
  const region = src.slice(p, end < 0 ? src.length : end);
  const keys = new Set();
  let spread = false;
  let unresolvable = false;

  // Add the top-level keys of a `{ ... }` object body to `keys`; sets `spread`
  // if the body contains an object spread.
  const addLiteralKeys = (body) => {
    if (/\.\.\./.test(body)) spread = true;
    let depth = 0;
    let tok = "";
    let inStr = false;
    let q = "";
    const flush = () => { const t = tok.match(/([A-Za-z_]\w*)\s*$/); if (t) keys.add(t[1]); tok = ""; };
    for (let k = 0; k < body.length; k++) {
      const c = body[k];
      if (inStr) { if (c === q && body[k - 1] !== "\\") inStr = false; continue; }
      if (c === '"' || c === "'" || c === "`") { inStr = true; q = c; continue; }
      if ("{[(".includes(c)) depth++;
      else if ("}])".includes(c)) depth--;
      if (depth === 0 && c === ":") {
        flush();
        let vd = 0; // skip the value up to the next top-level comma (respecting strings)
        k++;
        for (; k < body.length; k++) {
          const cc = body[k];
          if (cc === '"' || cc === "'" || cc === "`") { const qq = cc; k++; for (; k < body.length; k++) { if (body[k] === qq && body[k - 1] !== "\\") break; } continue; }
          if ("{[(".includes(cc)) vd++;
          else if ("}])".includes(cc)) vd--;
          else if (cc === "," && vd === 0) break;
        }
        continue;
      }
      if (depth === 0 && c === ",") { flush(); continue; }
      tok += c;
    }
    flush();
  };

  // Return the body of the first `<open>...<close>` balanced brace group at/after `from`.
  const braceBody = (from) => {
    let j = region.indexOf("{", from);
    if (j < 0) return null;
    const start = j;
    let d = 0;
    for (; j < region.length; j++) {
      const c = region[j];
      if (c === "{") d++;
      else if (c === "}") { d--; if (d === 0) break; }
    }
    return region.slice(start + 1, j);
  };

  // `return { ... }` object literals.
  let idx = 0;
  while ((idx = region.indexOf("return {", idx)) !== -1) {
    addLiteralKeys(braceBody(idx) || "");
    idx = region.indexOf("{", idx) + 1;
  }

  // `return <var>;` (not the _finiteGuard `return _g;`) -- resolve <var> from its
  // `<var> = { ... }` object-literal declaration plus any `<var>.KEY = ...`
  // property assignments. If <var> has no resolvable literal, the return is
  // opaque, so mark the whole compute unresolvable (skipped by the caller).
  for (const m of region.matchAll(/return\s+([A-Za-z_]\w*)\s*;/g)) {
    const v = m[1];
    if (v === "_g") continue;
    // `return <var>;` where <var> = someCompute(...) is an error passthrough
    // (`if (x.error) return x;`) -- it forwards another compute's error object,
    // not this tile's output shape, so ignore it (the main literal return
    // carries the real keys). Only an opaque local carrier disqualifies.
    if (new RegExp("\\b(?:const|let|var)\\s+" + v + "\\s*=\\s*\\w*compute\\w*\\s*\\(").test(region)) continue;
    const decl = region.match(new RegExp("\\b(?:const|let|var)\\s+" + v + "\\s*=\\s*\\{"));
    if (decl) {
      addLiteralKeys(braceBody(region.indexOf(decl[0])) || "");
      for (const a of region.matchAll(new RegExp("\\b" + v + "\\.(\\w+)\\s*=(?!=)", "g"))) keys.add(a[1]);
    } else {
      unresolvable = true;
    }
  }

  keys.add("error");
  return { keys, spread, unresolvable };
}

async function main() {
  const modules = (await readdir(ROOT, { withFileTypes: true }))
    .filter((d) => d.isFile() && /^calc-.*\.js$/.test(d.name))
    .map((d) => d.name)
    .sort();

  let checked = 0;
  let skipped = 0;
  for (const file of modules) {
    const src = await readFile(resolve(ROOT, file), "utf8");
    let idx = 0;
    while ((idx = src.indexOf("_simpleRenderer({", idx)) !== -1) {
      let j = src.indexOf("{", idx);
      let d = 0;
      const start = j;
      for (; j < src.length; j++) {
        const c = src[j];
        if (c === "{") d++;
        else if (c === "}") { d--; if (d === 0) break; }
      }
      const block = src.slice(start, j);
      idx = start + 1;
      const cm = block.match(/compute:\s*(compute\w+)/);
      if (!cm) continue;
      const info = returnInfo(src, cm[1]);
      if (!info || info.spread || info.unresolvable) { skipped++; continue; }
      for (const m of block.matchAll(/\br\.(\w+)\b/g)) {
        checked++;
        if (!info.keys.has(m[1])) {
          fail(
            file + ": _simpleRenderer for '" + cm[1] + "' reads 'r." + m[1] + "' in an output, " +
            "but '" + cm[1] + "' never returns '" + m[1] + "'. It renders as the literal text " +
            "'undefined' (a missing string output the render-no-nan gate cannot see). Return '" +
            m[1] + "', or fix the reference.",
          );
        }
      }
    }
  }

  if (failed) {
    console.error("check-render-output-keys: see failures above.");
    process.exit(1);
  }
  console.log(
    "check-render-output-keys OK: " + checked + " _simpleRenderer output reference(s) across " +
    modules.length + " calc-* modules resolve to a key their compute returns (" + skipped +
    " compute(s) skipped: spread or opaque returns).",
  );
}

main().catch((e) => {
  console.error("check-render-output-keys: unexpected error", e);
  process.exit(1);
});
