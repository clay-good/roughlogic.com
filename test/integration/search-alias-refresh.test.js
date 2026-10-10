// The first search keystroke loads 21 alias shards. Until 2026-10-10 each one
// re-ranked the query and rebuilt the result list as it landed: 21 full
// refreshes back to back, about 100 ms each, which blocked the main thread for
// over two seconds on a fast laptop and for longer than a 5 s test timeout on
// a loaded CI runner (runs 38056106460 and 38058775183 failed on it).
//
// Shards that arrive together are now folded in with one refresh per short
// window. This holds every alias shard, releases them at once, and counts how
// many times the list is rebuilt afterwards. It is a count, not a stopwatch,
// so it does not depend on how fast the machine is; the ceiling leaves room
// for a slow runner to spread the shards over a few windows.
import { test, expect } from "@playwright/test";

const isAliasShard = (url) => /\/data\/search\/aliases-[a-z0-9]+\.json$/.test(new URL(url).pathname);

test("search: alias shards that land together refresh the results a few times, not once each", async ({ page }) => {
  const held = [];
  let release = false;
  await page.route("**/data/search/aliases-*.json", async (route) => {
    if (release) return route.continue();
    held.push(route);
  });
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill("voltage drop");
  // The catalog ranks without aliases first; wait for that list.
  await expect(page.locator("#search-results .search-result").first()).toBeVisible({ timeout: 20000 });
  await expect.poll(() => held.length, { timeout: 20000 }).toBeGreaterThanOrEqual(15);
  const shards = held.length;

  await page.evaluate(() => {
    window.__rebuilds = 0;
    new MutationObserver(() => { window.__rebuilds++; }).observe(document.getElementById("search-results"), { childList: true });
  });
  release = true;
  const responses = Promise.all(held.map((r) => page.waitForResponse((resp) => resp.url() === r.request().url())));
  await Promise.all(held.map((r) => r.continue()));
  await responses;
  // An alias-only phrase resolves once the shards are in: the refresh happened.
  await input.fill("ampacity derating");
  await expect(page.locator("#search-results .search-result").first()).toBeVisible();
  // Let any trailing window fire, then read the count from before that last keystroke's own render.
  await page.waitForTimeout(400);
  const rebuilds = await page.evaluate(() => window.__rebuilds);
  expect(shards).toBeGreaterThanOrEqual(15);
  // One per shard would be `shards` (21) plus the keystroke. A few windows is fine.
  expect(rebuilds, `the list was rebuilt ${rebuilds} times for ${shards} shards`).toBeLessThanOrEqual(8);
  expect(rebuilds).toBeGreaterThanOrEqual(1);
  expect(isAliasShard(held[0].request().url())).toBe(true);
});

test("search: an alias loaded from a shard still ranks its tile", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  // "add a hole test" is an alias row, not a tile name or description phrase.
  await input.fill("add a hole test");
  await expect(page.locator("#search-results .search-result").first().locator(".sr-name"))
    .toHaveText("Add-a-Hole Zone Leakage (Flow Through an Attic, Garage or Crawl Space)", { timeout: 20000 });
});
