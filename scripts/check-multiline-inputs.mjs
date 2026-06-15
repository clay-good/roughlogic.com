#!/usr/bin/env node
// Multi-line input control lint.
//
// A tile renderer that parses a newline-delimited list (the input the user
// authors "one per line") MUST build that field with makeTextarea, not the
// single-line makeText helper. An HTML <input type="text"> applies the value
// sanitization algorithm "strip newlines from the value", so any string set
// with embedded "\n" -- whether by the "Test with example" button or by the
// user pressing Enter -- collapses to a single line. The renderer's
// String(value).split("\n") parser then sees one run-together line and either
// computes a silently-wrong-but-finite answer or returns a graceful "need at
// least N rows" error.
//
// This defect class shipped three separate times and was invisible to every
// existing gate: the spec-v18 §5.4 render-leak gate only scans output for
// NaN/Infinity/undefined tokens (a wrong finite number or a worded error
// passes), and the worked-example fixtures call the compute function with a
// real array, bypassing the renderer's text parsing entirely. Affected on
// 2026-06-10: duct-static-pressure-total (calc-metalair), cable-tray-fill
// (calc-lowvoltage), area-by-coordinates + traverse-closure (calc-survey).
//
// The rule: in any calc-*.js, a top-level renderer function (one that
// references inputRegion) that parses input with .split("\n") must also call
// makeTextarea. Standalone Node script, built-ins only. Wired into npm run lint.

import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");

const NEWLINE_SPLIT_RE = /\.split\(\s*["'`]\\n["'`]\s*\)|\.split\(\s*\/\\n/;

let failed = false;
function fail(msg) {
  console.error("check-multiline-inputs: " + msg);
  failed = true;
}

async function main() {
  const entries = await readdir(ROOT, { withFileTypes: true });
  const modules = entries
    .filter((d) => d.isFile() && /^calc-.*\.js$/.test(d.name))
    .map((d) => d.name)
    .sort();

  let renderersChecked = 0;
  for (const file of modules) {
    const src = await readFile(resolve(ROOT, file), "utf8");
    // Split into top-level function chunks. Renderers are column-0
    // `function renderX(` / `function _renderX(`; nested helpers (the
    // indented `function parse(text)`) stay inside their parent chunk.
    const chunks = src.split(/\n(?=(?:export )?function )/);
    for (const chunk of chunks) {
      const m = chunk.match(/^(?:export )?function\s+(\w+)/);
      if (!m) continue;
      const name = m[1];
      const isRenderer = /\binputRegion\b/.test(chunk);
      const parsesNewlines = NEWLINE_SPLIT_RE.test(chunk);
      if (!(isRenderer && parsesNewlines)) continue;
      renderersChecked++;
      // Accept makeTextarea and any module-local wrapper whose name ends in
      // makeTextarea (e.g. calc-feeder's _v26makeTextarea) -- all build a
      // <textarea>, which preserves newlines.
      if (!/makeTextarea\s*\(/.test(chunk)) {
        fail(
          file + ": " + name + " parses newline-delimited input (.split(\"\\n\")) but does " +
          "not build it with makeTextarea. A single-line makeText <input> strips newlines, so " +
          "the multi-line list collapses to one row and the parsed answer is wrong. Use " +
          "makeTextarea(label, id, { rows: \"N\" }).",
        );
      }
    }
  }

  if (failed) {
    console.error("check-multiline-inputs: see failures above.");
    process.exit(1);
  }
  console.log(
    "check-multiline-inputs OK: " + renderersChecked + " renderer(s) that parse newline-" +
    "delimited input across " + modules.length + " calc-* modules all build it with a " +
    "multi-line <textarea>.",
  );
}

main().catch((e) => {
  console.error("check-multiline-inputs: unexpected error", e);
  process.exit(1);
});
