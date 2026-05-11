// v10 Phase D UI wiring tests (spec-v10 §6.2). Source-text assertions
// that the companion-tile strip is wired into the tool view in
// [app.js], with the right lazy-load path and the spec-mandated
// privacy posture (no per-user fetch beyond the static
// data/search/companions.json shard).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("renderToolView mounts the companion strip after the renderer returns", async () => {
  const t = await readFile(resolve(ROOT, "app.js"), "utf8");
  // The mount call lives in the post-renderer continuation so the
  // calculator paints first; the strip must not block the renderer.
  assert.match(t, /mountCompanionStrip\(view,\s*id\)\.catch\(\(\)\s*=>\s*\{\}\)/);
});

test("mountCompanionStrip lazy-loads search-discovery.js and companions.json", async () => {
  const t = await readFile(resolve(ROOT, "app.js"), "utf8");
  assert.match(t, /import\("\.\/search-discovery\.js"\)/);
  assert.match(t, /fetch\("data\/search\/companions\.json"/);
  // Spec-v10 §6.3: no telemetry. The fetch must omit credentials so the
  // browser cannot send a cookie that would identify the user, and there
  // must not be any other outbound network call from the strip code.
  assert.match(t, /credentials:\s*"omit"/);
});

test("mountCompanionStrip filters companions through the live TOOLS array", async () => {
  const t = await readFile(resolve(ROOT, "app.js"), "utf8");
  // The resolver call must pass the live TOOLS id list so a renamed
  // tile in companions.json silently drops out instead of rendering a
  // dead link.
  assert.match(
    t,
    /resolver\.getCompanions\(\s*id,\s*companionsJson\.companions,\s*TOOLS\.map\(\(t\)\s*=>\s*t\.id\),?\s*\)/,
  );
});

test("companion-strip renders an aside with the spec-mandated structure", async () => {
  const t = await readFile(resolve(ROOT, "app.js"), "utf8");
  // <aside class="companion-strip" aria-label="Related tiles">
  assert.match(t, /aside\.className\s*=\s*"companion-strip"/);
  assert.match(t, /aria-label",\s*"Related tiles"/);
  // <h3 class="companion-strip-heading">After this, you might want:</h3>
  assert.match(t, /After this, you might want:/);
  // <ul class="companion-strip-list">
  assert.match(t, /companion-strip-list/);
  // Each link is an internal hash link to the companion tile.
  assert.match(t, /a\.href\s*=\s*"#"\s*\+\s*cid/);
});

test("service worker pre-caches the data/search/ shards", async () => {
  const t = await readFile(resolve(ROOT, "sw.js"), "utf8");
  assert.match(t, /\.\/data\/search\/manifest\.json/);
  assert.match(t, /\.\/data\/search\/aliases\.json/);
  assert.match(t, /\.\/data\/search\/companions\.json/);
});

test("service worker pre-caches the v10 shared helpers", async () => {
  const t = await readFile(resolve(ROOT, "sw.js"), "utf8");
  assert.match(t, /\.\/limitation-banner\.js/);
  assert.match(t, /\.\/search-discovery\.js/);
});

test("companion-strip CSS is shipped in styles.css", async () => {
  const t = await readFile(resolve(ROOT, "styles.css"), "utf8");
  assert.match(t, /\.companion-strip\s*\{/);
  assert.match(t, /\.companion-strip-list\s*\{/);
  assert.match(t, /\.companion-strip-link\s*\{/);
});
