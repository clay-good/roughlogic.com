#!/usr/bin/env node
// makeSelect options-shape lint.
//
// ui-fields.js makeSelect(label, id, options) iterates its options and reads
// `o.value` / `o.label` / `o.selected` off every element:
//
//     for (const o of options) {
//       opt.value = o.value;          // <- object property access
//       opt.textContent = o.label;
//       ...
//     }
//
// Pass a bare array of primitives -- makeSelect("Size", "id", ["1/2","3/4"])
// -- and every `o.value` / `o.label` is `undefined`. No throw, no NaN: the
// dropdown silently renders `<option value="undefined">undefined</option>`
// for every choice. The crash-safe boundary never fires (nothing threw) and
// render-no-nan never fires (no NaN reaches an output), so the tile ships
// visibly broken with ZERO gate signal -- a strictly quieter failure than the
// vessel-head-volume `.input`/`.select` crash that check-field-accessors now
// catches. The realistic mistake is forgetting the object wrapper:
//     makeSelect(l, id, sizes)                       // sizes is ["a","b"]  -- BROKEN
//     makeSelect(l, id, sizes.map(s => ({ value: s, label: s })))  // correct
//
// The rule: a makeSelect call's 3rd argument must resolve to {value,label}
// objects. Conservatively FAIL only the two unambiguous mistake shapes --
// an array literal of primitives (no `{` and no `.map`), or a bare
// `Object.keys(...)` / `Object.values(...)` with no `.map`. Anything with a
// `.map(...)`, an object literal, or an indirect identifier/call reference is
// assumed correct (matches how check-field-accessors skips ambiguous binds).
// Standalone Node script, built-ins only. Wired into npm run lint.

import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");

let failed = false;
function fail(msg) {
  console.error("check-select-options: " + msg);
  failed = true;
}

// Extract the balanced 3rd argument of every `\w*makeSelect(` call, with the
// source index of the call so we can report a line number.
function selectCalls(src) {
  const out = [];
  const re = /\w*makeSelect\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    let i = m.index + m[0].length;
    let depth = 1;
    let args = "";
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (c === "(") depth++;
      else if (c === ")") { depth--; if (depth === 0) break; }
      args += c;
      i++;
    }
    // Split on top-level commas (ignore commas inside nested (), [], {}).
    const parts = [];
    let d = 0;
    let cur = "";
    for (const ch of args) {
      if ("([{".includes(ch)) d++;
      else if (")]}".includes(ch)) d--;
      if (ch === "," && d === 0) { parts.push(cur); cur = ""; }
      else cur += ch;
    }
    parts.push(cur);
    out.push({ index: m.index, opt: (parts[2] || "").trim() });
  }
  return out;
}

function lineOf(src, index) {
  let line = 1;
  for (let i = 0; i < index && i < src.length; i++) if (src[i] === "\n") line++;
  return line;
}

async function main() {
  const modules = (await readdir(ROOT, { withFileTypes: true }))
    .filter((d) => d.isFile() && /^calc-.*\.js$/.test(d.name))
    .map((d) => d.name)
    .sort();

  let checked = 0;
  for (const file of modules) {
    const src = await readFile(resolve(ROOT, file), "utf8");
    for (const { index, opt } of selectCalls(src)) {
      checked++;
      // A `.map(...)` anywhere is assumed to produce objects -> OK.
      if (/\.map\s*\(/.test(opt)) continue;
      // Array literal: OK iff it contains an object (a `{`), else it's a bare
      // array of primitives -- every o.value/o.label would be undefined.
      if (/^\[/.test(opt)) {
        if (!opt.includes("{")) {
          fail(
            file + ":" + lineOf(src, index) + ": makeSelect options is a bare array of " +
            "primitives `" + opt.slice(0, 60).replace(/\s+/g, " ") + "` -- makeSelect reads " +
            "`o.value`/`o.label` off each element, so every option renders as " +
            "value/text 'undefined'. Wrap each as an object: `.map((v) => ({ value: v, label: v }))`.",
          );
        }
        continue;
      }
      // Bare Object.keys(...) / Object.values(...) with no `.map` -> array of
      // strings, same undefined-option failure.
      if (/^Object\.(keys|values)\s*\([^]*\)$/.test(opt) && !/\.map\s*\(/.test(opt)) {
        fail(
          file + ":" + lineOf(src, index) + ": makeSelect options is a bare " +
          "`" + opt.slice(0, 60).replace(/\s+/g, " ") + "` (an array of strings) -- each option " +
          "would render as value/text 'undefined'. Map to objects: `.map((k) => ({ value: k, label: k }))`.",
        );
        continue;
      }
      // Everything else (object-literal array, identifier, function call,
      // spread) is indirection we assume correct -- same conservatism as
      // check-field-accessors' ambiguous-bind skip.
    }
  }

  if (failed) {
    console.error("check-select-options: see failures above.");
    process.exit(1);
  }
  console.log(
    "check-select-options OK: " + checked + " makeSelect call(s) across " + modules.length +
    " calc-* modules pass {value,label} object options (no bare-primitive arrays).",
  );
}

main().catch((e) => {
  console.error("check-select-options: unexpected error", e);
  process.exit(1);
});
