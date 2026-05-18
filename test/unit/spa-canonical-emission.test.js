// spec-v13 §5.5 source-text invariant: the SPA must emit
// <link rel="canonical">, document.title, and a <meta name="description">
// update whenever a tile opens, and revert those to home values on
// return. The full handler runs against the DOM and is exercised by the
// Playwright integration suite; this Node-only test holds the source-text
// shape so an accidental rename / removal fails before CI runs the
// browser tests.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const APP_JS = await readFile(resolve(ROOT, "app.js"), "utf8");

test("app.js carries updateHeadForTool + updateHeadForHome", () => {
  assert.match(APP_JS, /function updateHeadForTool\(/);
  assert.match(APP_JS, /function updateHeadForHome\(/);
});

test("applyRoute calls updateHeadForTool on tool route, updateHeadForHome on home", () => {
  assert.match(APP_JS, /renderToolView\([^)]*\);\s*updateHeadForTool\(/);
  assert.match(APP_JS, /renderHome\(\);\s*updateHeadForHome\(/);
});

test("updateHeadForTool emits a /tools/<id>/ canonical href", () => {
  assert.match(APP_JS, /setHeadLink\("canonical",\s*"\/tools\/"\s*\+\s*id\s*\+\s*"\/"\)/);
});

test("updateHeadForHome reverts canonical to /", () => {
  assert.match(APP_JS, /setHeadLink\("canonical",\s*"\/"\)/);
});

test("updateHeadForTool sets document.title with the brand suffix", () => {
  assert.match(APP_JS, /document\.title\s*=\s*tool\.name\s*\+\s*" - Rough Logic"/);
});

test("updateHeadForHome reverts document.title to Rough Logic", () => {
  assert.match(APP_JS, /document\.title\s*=\s*"Rough Logic"/);
});

test("updateHeadForTool updates the meta description from tool.desc", () => {
  assert.match(APP_JS, /setHeadMeta\("description",\s*tool\.desc\)/);
});

test("setHeadLink + setHeadMeta helpers exist and create the element if missing", () => {
  assert.match(APP_JS, /function setHeadLink\(/);
  assert.match(APP_JS, /function setHeadMeta\(/);
  assert.match(APP_JS, /document\.createElement\("link"\)/);
});
