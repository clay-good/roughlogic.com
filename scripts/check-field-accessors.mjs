#!/usr/bin/env node
// Field-accessor / factory-shape lint.
//
// The ui-fields.js field factories return different shapes:
//   makeNumber / makeText / makeTextarea / makeCheckbox -> { wrap, input }
//   makeSelect                                          -> { wrap, select }
// A renderer that binds a <select> with makeSelect but then reads it as
// `sel.input.value` (or wires `sel.input.addEventListener`) touches an
// undefined property, throwing a TypeError at render time. The crash-safe
// boundary swallows the throw and paints a fallback, so the tile ships
// visibly broken with no build/lint signal -- the ONLY gate that catches it
// today is the spec-v18 §5.4 render-no-nan Playwright run (~30 min in CI,
// per-tile real-chromium). The symmetric mistake -- `.select` on a
// makeNumber var -- fails the same way.
//
// Shipped once as vessel-head-volume (calc-fab.js, spec-v912): `ht =
// makeSelect(...)` read as `ht.input.value` / `ht.input.addEventListener`.
// This gate makes that a lint failure in milliseconds instead of a 30-min
// integration failure.
//
// The rule: within a single top-level renderer chunk, a variable bound from
// makeSelect must not be accessed as `.input`, and a variable bound from
// makeNumber/makeText/makeTextarea/makeCheckbox must not be accessed as
// `.select`. Standalone Node script, built-ins only. Wired into npm run lint.

import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");

// Match a var bound from a factory, allowing a module-local wrapper prefix
// (e.g. _v26makeTextarea) via the leading \w* on the factory name.
const SELECT_BIND_RE = /(?:const|let|var)\s+(\w+)\s*=\s*\w*makeSelect\s*\(/g;
const INPUT_BIND_RE = /(?:const|let|var)\s+(\w+)\s*=\s*\w*make(?:Number|Textarea|Text|Checkbox)\s*\(/g;

let failed = false;
function fail(msg) {
  console.error("check-field-accessors: " + msg);
  failed = true;
}

function bindings(re, chunk) {
  const set = new Set();
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(chunk)) !== null) set.add(m[1]);
  return set;
}

async function main() {
  const entries = await readdir(ROOT, { withFileTypes: true });
  const modules = entries
    .filter((d) => d.isFile() && /^calc-.*\.js$/.test(d.name))
    .map((d) => d.name)
    .sort();

  let rendererCount = 0;
  let checkedVars = 0;
  for (const file of modules) {
    const src = await readFile(resolve(ROOT, file), "utf8");
    const chunks = src.split(/\n(?=(?:export )?function )/);
    for (const chunk of chunks) {
      const m = chunk.match(/^(?:export )?function\s+(\w+)/);
      if (!m) continue;
      if (!/\binputRegion\b/.test(chunk)) continue; // renderers only
      const name = m[1];
      rendererCount++;

      const selectVars = bindings(SELECT_BIND_RE, chunk);
      const inputVars = bindings(INPUT_BIND_RE, chunk);

      for (const v of selectVars) {
        if (inputVars.has(v)) continue; // reused/shadowed name -> ambiguous, skip
        checkedVars++;
        if (new RegExp("\\b" + v + "\\.input\\b").test(chunk)) {
          fail(
            file + ": " + name + ": '" + v + "' is bound from makeSelect (returns " +
            "{ wrap, select }) but is accessed as '" + v + ".input'. makeSelect has no " +
            "'.input' -- this throws at render time. Use '" + v + ".select'.",
          );
        }
      }
      for (const v of inputVars) {
        if (selectVars.has(v)) continue;
        checkedVars++;
        if (new RegExp("\\b" + v + "\\.select\\b").test(chunk)) {
          fail(
            file + ": " + name + ": '" + v + "' is bound from an input factory (returns " +
            "{ wrap, input }) but is accessed as '" + v + ".select'. Use '" + v + ".input'.",
          );
        }
      }
    }
  }

  if (failed) {
    console.error("check-field-accessors: see failures above.");
    process.exit(1);
  }
  console.log(
    "check-field-accessors OK: " + checkedVars + " factory-bound field var(s) across " +
    rendererCount + " renderer(s) in " + modules.length + " calc-* modules use the accessor " +
    "matching their factory ('.select' for makeSelect, '.input' otherwise).",
  );
}

main().catch((e) => {
  console.error("check-field-accessors: unexpected error", e);
  process.exit(1);
});
