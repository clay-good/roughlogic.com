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
  // home-view first paint is not delayed by an alias fetch. Since
  // spec-v17 §H.2 the focus handler is loadAndRender, which first
  // lazy-loads the TOOLS catalog (ensureTools) and only then builds the
  // search indexes and folds in the aliases — keeping both the catalog
  // and the alias fetch off the first-paint path. spec-v589 adds the
  // ranking module to the same lazy path (ensureDiscovery).
  assert.match(t, /input\.addEventListener\("focus",\s*loadAndRender\)/);
  assert.match(t, /function loadAndRender\(\)\s*\{\s*ensureDiscovery\(\);\s*ensureSlots\(\);\s*ensureTools\(\)\.then\(\(\)\s*=>\s*\{\s*initSearchData\(\);\s*ensureAliases\(\);/);
});

test("the spec-v591 slot shard lazy-loads and prefills the pick hash", async () => {
  const t = await readApp();
  assert.match(t, /fetch\("data\/search\/slots\.json",\s*\{\s*credentials:\s*"omit"\s*\}\)/);
  assert.match(t, /discovery\.mapSlots\(discovery\.extractQuantities\(typed\),\s*row\)/);
  assert.match(t, /navigateTo\(prefillHash\(tool,\s*typed\)\)/);
});

test("the spec-v589 ranking module lazy-loads off the first-paint path", async () => {
  const t = await readApp();
  assert.match(t, /import\("\.\/search-discovery\.js"\)/);
  // searchTools prefers normalizeQuery + rankTools once the module is in.
  assert.match(t, /discovery\.normalizeQuery\(q\)/);
  assert.match(t, /discovery\.rankTools\(tokens,\s*TOOLS,\s*aliasRows,\s*\{\s*limit:\s*12\s*\}\)/);
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
  // Shard row shape ({ term, target }) is preserved so the rows feed
  // rankTools directly (spec-v589).
  assert.match(t, /rows\.push\(\{\s*term:\s*row\.term\.toLowerCase\(\),\s*target:\s*row\.target\s*\}\)/);
});

test("the matcher folds alias-term matches into the results", async () => {
  const t = await readApp();
  // The substring fallback walks aliasRows and surfaces the target tile.
  assert.match(t, /for\s*\(const al of aliasRows\)/);
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
