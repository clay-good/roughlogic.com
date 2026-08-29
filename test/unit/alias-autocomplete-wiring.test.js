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

test("bindSearch lazy-loads the per-group alias shards via ensureAliases", async () => {
  const t = await readApp();
  assert.match(t, /async function ensureAliases\(\)/);
  // Per-group shards (spec-v590 split remediation): every group's shard
  // fetches in parallel, with the privacy-preserving credentials posture
  // per spec §6.3, and folds in as it arrives.
  assert.match(t, /fetch\("data\/search\/aliases-" \+ String\(g\)\.toLowerCase\(\) \+ "\.json",\s*\{\s*credentials:\s*"omit"\s*\}\)/);
  assert.match(t, /const groups = \[\.\.\.new Set\(TOOLS\.map\(\(t\) => t\.group\)\)\];/);
  // ensureAliases is triggered on first focus (not at load) so the
  // home-view first paint is not delayed by an alias fetch. Since
  // spec-v17 §H.2 the focus handler is loadAndRender, which first
  // lazy-loads the TOOLS catalog (ensureTools) and only then builds the
  // search indexes and folds in the aliases — keeping both the catalog
  // and the alias fetch off the first-paint path. spec-v589 adds the
  // ranking module to the same lazy path (ensureDiscovery).
  assert.match(t, /input\.addEventListener\("focus",\s*loadAndRender\)/);
  assert.match(t, /function loadAndRender\(\)\s*\{\s*ensureDiscovery\(\);\s*ensureSlots\(\);\s*ensurePreview\(\);\s*ensureTools\(\)\.then\(\(\)\s*=>\s*\{\s*initSearchData\(\);\s*ensureAliases\(\);/);
});

test("the spec-v592 preview, did-you-mean, and browse fallback are wired", async () => {
  const t = await readApp();
  assert.match(t, /fetch\("data\/search\/preview-map\.json",\s*\{\s*credentials:\s*"omit"\s*\}\)/);
  assert.match(t, /span\.className = "sr-preview"/);
  assert.match(t, /search-didyoumean/);
  assert.match(t, /search-browse/);
  // Placeholder rotation is day-of-month indexed, no timers.
  assert.match(t, /QUESTION_PLACEHOLDERS\[\(new Date\(\)\.getDate\(\) - 1\) % QUESTION_PLACEHOLDERS\.length\]/);
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

test("alias autocomplete failure is a no-op, and does not latch", async () => {
  const t = await readApp();
  // Each group's fetch is wrapped in try/catch, so one failing group leaves
  // the rest of search working -- offline included.
  assert.match(
    t,
    /catch\s*\{\s*\/\*\s*one group failing leaves the rest searchable\s*\*\/\s*\}/,
  );
  // ...but a run in which NOTHING loaded must release the latch, or one blip
  // costs the session its aliases until a reload and the ranking stays
  // visibly worse. `ensureDiscovery` has always released its flag on failure.
  // The behaviour itself is pinned by the spec-v590 retry integration test.
  assert.match(t, /if \(!aliasRows\.length\) aliasLoaded = false;/);
});

test("every lazy search loader releases its latch on failure", async () => {
  const t = await readApp();
  // ensureDiscovery always did; the other three did not, so one blip cost the
  // session its aliases, its prefill and its answer previews until a reload.
  // The alias and preview releases are pinned behaviourally by integration
  // specs. The SLOTS one is not: a behavioural test for it passed with
  // slots.json permanently blocked, because the data/fields index now supplies
  // the same hash params, so this shape assertion is what catches a revert.
  assert.match(t, /catch\(\(\) => \{ discoveryLoading = false; \}\)/);
  assert.match(t, /catch\(\(\) => \{ slotsLoading = false; \}\)/);
  assert.match(t, /catch\(\(\) => \{ previewLoading = false; \}\)/);
  assert.match(t, /if \(!aliasRows\.length\) aliasLoaded = false;/);
});
