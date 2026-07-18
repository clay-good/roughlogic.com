// v10 Phase H.4 service-worker freshness audit (spec-v10.md §10.4).
//
// Spec-v10 §H.4 requires:
//   - A new release bumps the cache version (BUILD_HASH).
//   - On next visit, the user receives the fresh shell within one page
//     load (skipWaiting + clients.claim is the cache-update flow used).
//   - The cache-update path must NOT interrupt a calculation in
//     progress (the URL hash is preserved across the refresh).
//   - Old caches are deleted on activation.
//
// These are static-source assertions because Playwright is gated.
// Together with the existing build-sw-patch.test.js (which asserts the
// dist/ BUILD_HASH is patched at build time), they hold the contract.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function readSw() {
  return readFile(resolve(ROOT, "sw.js"), "utf8");
}

test("cache names are keyed by BUILD_HASH (so a new release evicts the prior shell)", async () => {
  const t = await readSw();
  assert.match(t, /const\s+BUILD_HASH\s*=\s*"[^"]+";/);
  assert.match(t, /const\s+SHELL_CACHE\s*=\s*"roughlogic-shell-"\s*\+\s*BUILD_HASH;/);
  assert.match(t, /const\s+DATA_CACHE\s*=\s*"roughlogic-data-"\s*\+\s*BUILD_HASH;/);
});

test("install handler calls skipWaiting so the new SW takes over on next visit", async () => {
  const t = await readSw();
  // The fresh-shell-within-one-page-load promise hinges on skipWaiting.
  assert.match(t, /self\.skipWaiting\(\)/);
});

test("activate handler claims clients and deletes prior caches", async () => {
  const t = await readSw();
  assert.match(t, /self\.clients\.claim\(\)/);
  // The activate handler must filter out the current SHELL_CACHE and
  // DATA_CACHE keys when deleting prior caches.
  assert.match(t, /caches\.keys\(\)/);
  assert.match(t, /\.filter\(\(k\)\s*=>\s*k\s*!==\s*SHELL_CACHE\s*&&\s*k\s*!==\s*DATA_CACHE\)/);
  assert.match(t, /\.map\(\(k\)\s*=>\s*caches\.delete\(k\)\)/);
});

test("fetch handler is same-origin only and routes data/* through DATA_CACHE", async () => {
  const t = await readSw();
  // Same-origin guard.
  assert.match(t, /url\.origin\s*!==\s*self\.location\.origin/);
  // Data shards go through DATA_CACHE; shell falls through to SHELL_CACHE.
  assert.match(t, /url\.pathname\.includes\("\/data\/"\)/);
  assert.match(t, /cacheFirst\(DATA_CACHE,\s*req\)/);
  assert.match(t, /cacheFirst\(SHELL_CACHE,\s*req\)/);
});

test("offline navigation falls back to the cached shell index", async () => {
  const t = await readSw();
  // Cache-first with offline fallback: a navigation request whose
  // network attempt fails serves the cached index.html instead of a
  // 5xx, so a calculation in progress can re-render after the SW
  // upgrade without interrupting the URL hash.
  assert.match(t, /request\.mode\s*===\s*"navigate"/);
  assert.match(t, /shell\.match\("\.\/index\.html"\)/);
});

test("the shell pre-cache list is in sync with the v10 shipped helper modules", async () => {
  const t = await readSw();
  // Each v10 shared helper must be pre-cached on install so the offline
  // case can dynamic-import it.
  for (const f of ["limitation-banner.js", "search-discovery.js", "citations.js"]) {
    assert.match(t, new RegExp("\\./" + f.replace(".", "\\.")));
  }
});

test("the shell pre-cache list includes the data/search/ shards", async () => {
  const t = await readSw();
  // Per-group alias shards (spec-v590 split remediation). The letter set
  // is gated against tools-data.js by build-alias-shards.mjs --check;
  // here we pin the precache wiring for every current group.
  const letters = ["a", "b", "c", "d", "e", "f", "g", "h", "j", "k", "l", "m", "n", "o", "p", "q", "r", "t", "x", "y", "z"];
  for (const f of ["manifest.json", ...letters.map((l) => "aliases-" + l + ".json")]) {
    assert.match(t, new RegExp("\\./data/search/" + f.replace(".", "\\.")));
  }
  // The authoring master must NOT be precached: the runtime never fetches
  // it, and precaching it would double the alias install payload.
  assert.doesNotMatch(t, /"\.\/data\/search\/aliases\.json"/);
});
