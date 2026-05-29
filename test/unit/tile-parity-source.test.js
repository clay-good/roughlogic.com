// v10 Phase E (lite) source-text parity audits.
//
// Spec-v10 §E.1 / §E.2 / §E.3 declare Playwright-driven parity audits
// (print render, CSV export, axe-core a11y). Playwright is gated; in
// the meantime this test holds the structural invariants those audits
// rely on, via static source-text assertions over the renderer files.
// When Playwright lands, these tests stay as the cheap-and-fast
// counterpart to the e2e audits.
//
// Invariants asserted:
//   §E.1 (print parity): every renderer file sets citationEl
//        somewhere (print view captures the citation footer).
//   §E.2 (CSV parity): every renderer file uses makeOutputLine at
//        least once (the CSV exporter reads outputs wired by that
//        helper).
//   §E.3 (a11y parity, partial): no calc-*.js uses innerHTML, eval,
//        Function constructor, or new Function. The two existing
//        innerHTML mentions are in comments asserting the invariant;
//        whitelisted explicitly.
//   Index.html invariants: exactly one <h1>; search-input present;
//        datalist present.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function calcFiles() {
  const entries = await readdir(ROOT);
  return entries.filter((f) => f.startsWith("calc-") && f.endsWith(".js"));
}

async function readCalc(name) {
  return readFile(resolve(ROOT, name), "utf8");
}

test("§E.1 (print parity): every calc-*.js renderer file sets citationEl", async () => {
  const files = await calcFiles();
  assert.ok(files.length > 0, "no calc-*.js files found");
  for (const f of files) {
    const t = await readCalc(f);
    assert.match(
      t,
      /citationEl\.textContent\s*=/,
      f + ": missing `citationEl.textContent =` (print view captures the citation footer)",
    );
  }
});

test("§E.2 (CSV parity): every calc-*.js renderer file uses makeOutputLine", async () => {
  // Exempt: tiles whose output is a table or reference matrix rather
  // than line-by-line numeric outputs. The CSV-export helper reads the
  // table directly in those cases. Document each exemption inline so a
  // future auditor can confirm intentionality.
  const EXEMPT = new Set([
    // calc-historical.js renders the price-history percentile bands as
    // a <dl> + <table>; the v5 §269 CSV path reads the table rows
    // directly rather than makeOutputLine outputs.
    "calc-historical.js",
  ]);
  const files = await calcFiles();
  for (const f of files) {
    if (EXEMPT.has(f)) continue;
    const t = await readCalc(f);
    assert.match(
      t,
      /\bmakeOutputLine\b/,
      f + ": missing `makeOutputLine` call (CSV exporter reads outputs wired via this helper)",
    );
  }
});

test("§E.3 (a11y parity): no calc-*.js uses innerHTML, eval, or Function constructor", async () => {
  const files = await calcFiles();
  // Two known mentions of "innerHTML" in source live in comments that
  // assert the invariant ("no innerHTML"). They are non-functional and
  // pass the gate; we still want to fail if a renderer ever uses the
  // setter form `.innerHTML = ...` (regex below catches that).
  for (const f of files) {
    const t = await readCalc(f);
    // .innerHTML = (assignment) anywhere in source.
    assert.doesNotMatch(t, /\.\s*innerHTML\s*=/, f + ": uses .innerHTML setter");
    // eval / new Function / Function constructor.
    assert.doesNotMatch(t, /\beval\s*\(/, f + ": uses eval()");
    assert.doesNotMatch(t, /\bnew\s+Function\s*\(/, f + ": uses new Function()");
  }
});

test("§E.3 (a11y parity): index.html has exactly one <h1> and the search combobox", async () => {
  const html = await readFile(resolve(ROOT, "index.html"), "utf8");
  const h1Count = (html.match(/<h1[\s>]/g) || []).length;
  assert.equal(h1Count, 1, "index.html must have exactly one <h1>; got " + h1Count);
  // One search bar (a combobox input) plus its results listbox; no second
  // dropdown control.
  assert.match(html, /id="search-input"/);
  assert.match(html, /role="combobox"/);
  assert.match(html, /id="search-results"/);
});

test("home-view modules do not use innerHTML setter, eval, or new Function", async () => {
  const HOME_FILES = ["app.js", "theme.js", "integrity.js", "routing.js"];
  for (const f of HOME_FILES) {
    const t = await readFile(resolve(ROOT, f), "utf8");
    assert.doesNotMatch(t, /\.\s*innerHTML\s*=/, f + ": uses .innerHTML setter");
    assert.doesNotMatch(t, /\beval\s*\(/, f + ": uses eval()");
    assert.doesNotMatch(t, /\bnew\s+Function\s*\(/, f + ": uses new Function()");
  }
});

test("v10 shared helpers do not use innerHTML setter, eval, or new Function", async () => {
  const HELPERS = ["limitation-banner.js", "search-discovery.js", "tile-meta.js"];
  for (const f of HELPERS) {
    const t = await readFile(resolve(ROOT, f), "utf8");
    assert.doesNotMatch(t, /\.\s*innerHTML\s*=/, f + ": uses .innerHTML setter");
    assert.doesNotMatch(t, /\beval\s*\(/, f + ": uses eval()");
    assert.doesNotMatch(t, /\bnew\s+Function\s*\(/, f + ": uses new Function()");
  }
});
