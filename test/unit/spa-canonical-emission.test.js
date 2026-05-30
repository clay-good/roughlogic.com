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
  assert.match(APP_JS, /clearChildren\(view\);\s*updateHeadForHome\(/);
});

test("updateHeadForTool emits an absolute /tools/<id>/ canonical href", () => {
  // Must be the absolute origin form (SITE_ORIGIN + "/tools/<id>/") to
  // match the prerendered shells; a relative canonical fails Lighthouse SEO.
  assert.match(APP_JS, /const SITE_ORIGIN\s*=\s*"https:\/\/roughlogic\.com"/);
  assert.match(APP_JS, /setHeadLink\("canonical",\s*SITE_ORIGIN\s*\+\s*"\/tools\/"\s*\+\s*id\s*\+\s*"\/"\)/);
});

test("updateHeadForHome reverts canonical to the absolute home origin", () => {
  assert.match(APP_JS, /setHeadLink\("canonical",\s*SITE_ORIGIN\s*\+\s*"\/"\)/);
});

test("updateHeadForTool sets document.title with the brand suffix", () => {
  assert.match(APP_JS, /document\.title\s*=\s*tool\.name\s*\+\s*" - Rough Logic"/);
});

test("updateHeadForHome reverts document.title to the home title", () => {
  assert.match(APP_JS, /document\.title\s*=\s*HOME_TITLE/);
  assert.match(APP_JS, /const HOME_TITLE\s*=\s*"[^"]*Rough Logic"/);
});

test("updateHeadForTool updates the meta description from tool.desc", () => {
  assert.match(APP_JS, /setHeadMeta\("description",\s*tool\.desc\)/);
});

test("setHeadLink + setHeadMeta helpers exist and create the element if missing", () => {
  assert.match(APP_JS, /function setHeadLink\(/);
  assert.match(APP_JS, /function setHeadMeta\(/);
  assert.match(APP_JS, /document\.createElement\("link"\)/);
});
