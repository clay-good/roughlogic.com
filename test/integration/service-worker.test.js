// The service-worker contract, run in a browser.
//
// spec-v10 §H.4 requires that a release bumps `BUILD_HASH`, that the reader
// gets the fresh shell within one page load, and that old caches are deleted on
// activation. `test/unit/sw-freshness.test.js` holds those by reading sw.js as
// TEXT, and says so in its own header: "These are static-source assertions
// because Playwright is gated." Playwright is not gated any more -- there is a
// full integration suite, and offline.test.js already drives a registered
// worker.
//
// A source-text test pins the shape it is handed, which is how a stale-deploy
// bug would look green: the strings are all present, and nothing has ever
// watched the caches the running worker actually creates and destroys. The
// failure mode is the one `_headers` calls out in its own comment -- new HTML
// paired with stale JS, which "breaks the site for everyone until the TTL
// expires or the cache is purged."
//
// So: register it, read the caches, and evict one.

import { test, expect } from "@playwright/test";

async function waitForController(page) {
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, {
    timeout: 60_000,
  });
}

test("service worker: activates, controls the page, and names its caches after the served build", async ({ page }) => {
  test.slow();
  await page.goto("/");
  await waitForController(page);

  // The hash the SERVER is serving, not the one in the repo -- the source keeps
  // a `dev-` placeholder and the build patches it, so reading the source here
  // would assert the wrong thing.
  const served = await (await page.request.get("/sw.js")).text();
  const hash = (/const BUILD_HASH = "([^"]+)"/.exec(served) || [])[1];
  expect(hash, "the served sw.js carries no BUILD_HASH").toBeTruthy();
  expect(hash, "the build did not patch the dev placeholder into dist/sw.js").not.toMatch(/^dev-/);

  const state = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return { scope: reg && reg.scope, active: reg && reg.active && reg.active.state, keys: await caches.keys() };
  });
  expect(state.active).toBe("activated");
  expect(state.scope).toBe(new URL("/", page.url()).href);
  expect([...state.keys].sort()).toEqual([`roughlogic-data-${hash}`, `roughlogic-shell-${hash}`]);
});

test("service worker: every asset it lists is really in one of its caches", async ({ page }) => {
  test.slow();
  await page.goto("/");
  await waitForController(page);

  // The precache list, read from the worker the server is serving. `check-sw-
  // precache` reads the same list statically; what a browser adds is that the
  // fetch for each entry SUCCEEDED -- a listed path that 404s installs a worker
  // whose cache silently lacks it, and the page only finds out offline.
  const served = await (await page.request.get("/sw.js")).text();
  const listed = [...served.matchAll(/"\.\/([^"]+)"/g)].map((m) => m[1]);
  expect(listed.length, "read no precache entries out of the served sw.js").toBeGreaterThan(50);

  const missing = await page.evaluate(async (assets) => {
    const keys = await caches.keys();
    const caches_ = await Promise.all(keys.map((k) => caches.open(k)));
    const out = [];
    for (const asset of assets) {
      let found = false;
      for (const c of caches_) {
        if (await c.match("/" + asset)) { found = true; break; }
      }
      if (!found) out.push(asset);
    }
    return out;
  }, listed);

  expect(missing, `precached paths absent from every cache: ${missing.join(", ")}`).toEqual([]);
});

test("service worker: a previous build's caches are deleted on activation", async ({ page }) => {
  test.slow();
  await page.goto("/");
  await waitForController(page);

  // Stand in for what a returning reader carries after a release: the caches a
  // previous BUILD_HASH left behind. The activate handler is supposed to delete
  // every cache whose name is not the current pair.
  await page.evaluate(async () => {
    (await caches.open("roughlogic-shell-STALE0000")).put("/styles.css", new Response("/* stale */"));
    (await caches.open("roughlogic-data-STALE0000")).put("/data/integrity.json", new Response("{}"));
  });
  const before = await page.evaluate(() => caches.keys());
  expect(before).toContain("roughlogic-shell-STALE0000");

  // Unregister and reload, which runs a fresh install/activate cycle -- the
  // same lifecycle a new BUILD_HASH triggers, without mutating the dist/ that
  // every other spec in this suite is reading at the same time.
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg.unregister();
  });
  await page.reload();
  await waitForController(page);

  await expect
    .poll(() => page.evaluate(() => caches.keys()), { timeout: 30_000 })
    .not.toContain("roughlogic-shell-STALE0000");
  const after = await page.evaluate(() => caches.keys());
  expect(after, "a previous build's data cache survived activation").not.toContain("roughlogic-data-STALE0000");
  // And the current pair is still there: eviction that took the live caches
  // with it would pass a "the stale one is gone" check and break the site.
  expect(after.length).toBe(2);
});
