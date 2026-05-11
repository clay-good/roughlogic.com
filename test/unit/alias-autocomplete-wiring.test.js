// v10 Phase D autocomplete UI wiring tests (spec-v10 §6.1).
//
// Source-text assertions that the home-view search input lazy-loads
// aliases.json on first keystroke and routes alias matches to their
// target tile id.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const readApp = () => readFile(resolve(ROOT, "app.js"), "utf8");

test("bindSearch lazy-loads aliases.json on first input keystroke", async () => {
  const t = await readApp();
  // The ensureAliases helper lives inside bindSearch.
  assert.match(t, /async function ensureAliases\(\)/);
  // Lazy fetch with privacy-preserving credentials posture per spec §6.3.
  assert.match(t, /fetch\("data\/search\/aliases\.json",\s*\{\s*credentials:\s*"omit"\s*\}\)/);
  // The keystroke triggers it (and not before) so the home-view first
  // paint is not delayed by an alias fetch.
  assert.match(t, /input\.addEventListener\("input",\s*\(\)\s*=>\s*\{\s*\n?\s*ensureAliases\(\);/);
});

test("alias map is populated only with targets that are real tile ids", async () => {
  const t = await readApp();
  // Defensive filter: a renamed tile in aliases.json must not become a
  // dead navigation.
  assert.match(
    t,
    /if\s*\(!nameToId\.has\(row\.target\)\s*&&\s*!TOOLS\.some\(\(t\)\s*=>\s*t\.id\s*===\s*row\.target\)\)\s*continue;/,
  );
});

test("alias suggestions are appended to the existing tool-name datalist", async () => {
  const t = await readApp();
  // The same datalist (#tool-suggestions) carries both tool names and
  // alias terms so the user gets a single combined suggestion list.
  assert.match(t, /opt\.value\s*=\s*row\.term/);
  assert.match(t, /dl\.appendChild\(opt\)/);
});

test("an alias-term match resolves to its target tile id", async () => {
  const t = await readApp();
  // The exact-id lookup falls back to the alias map.
  assert.match(
    t,
    /const exactId\s*=\s*nameToId\.get\(raw\.toLowerCase\(\)\)\s*\|\|\s*aliasMap\.get\(raw\.toLowerCase\(\)\);/,
  );
});

test("alias autocomplete failure is a no-op (does not block search)", async () => {
  const t = await readApp();
  // The fetch is wrapped in try/catch; failure is silent so the rest of
  // search works offline / in the failure case.
  assert.match(
    t,
    /catch\s*\{\s*\/\*\s*alias autocomplete is opt-in;\s*failure is a no-op\s*\*\/\s*\}/,
  );
});
