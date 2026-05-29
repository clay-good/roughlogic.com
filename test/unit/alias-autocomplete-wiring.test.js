// v10 Phase D autocomplete UI wiring tests (spec-v10 §6.1).
//
// Source-text assertions that the home-view search combobox lazy-loads
// aliases.json on first focus and folds the alias terms into the matcher
// so a free-text industry term resolves to its target tile.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const readApp = () => readFile(resolve(ROOT, "app.js"), "utf8");

test("bindSearch lazy-loads aliases.json via ensureAliases", async () => {
  const t = await readApp();
  assert.match(t, /async function ensureAliases\(\)/);
  // Lazy fetch with privacy-preserving credentials posture per spec §6.3.
  assert.match(t, /fetch\("data\/search\/aliases\.json",\s*\{\s*credentials:\s*"omit"\s*\}\)/);
  // ensureAliases is triggered on first focus (not at load) so the
  // home-view first paint is not delayed by an alias fetch.
  assert.match(t, /addEventListener\("focus",\s*\(\)\s*=>\s*\{\s*ensureAliases\(\);/);
});

test("alias terms are kept only for targets that are real tile ids", async () => {
  const t = await readApp();
  // Defensive filter: a renamed tile in aliases.json must not become a
  // dead navigation.
  assert.match(
    t,
    /if\s*\(!nameToId\.has\(row\.target\)\s*&&\s*!TOOLS\.some\(\(t\)\s*=>\s*t\.id\s*===\s*row\.target\)\)\s*continue;/,
  );
});

test("alias terms map a free-text phrase to a tile id", async () => {
  const t = await readApp();
  assert.match(t, /aliasTerms\.push\(\{\s*term:\s*row\.term\.toLowerCase\(\),\s*id:\s*row\.target\s*\}\)/);
});

test("the matcher folds alias-term matches into the results", async () => {
  const t = await readApp();
  // searchTools walks aliasTerms and surfaces the matching target tile.
  assert.match(t, /for\s*\(const al of aliasTerms\)/);
  assert.match(t, /al\.term\.includes\(q\)/);
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
