// The README's headline promise is "works offline". Until now that was
// verified only by unit assertions on sw.js's SOURCE -- cache names keyed by
// BUILD_HASH, an atomic install, a navigation fallback -- and never by cutting
// the network and asking for a calculator.
//
// That distinction has bitten before: a new `data/fields/` shard once shipped
// unlisted in the precache, which would have left one group's tiles fetching
// over a network that is not there. A file-list gate caught it; nothing would
// have caught a regression in the serving path itself.
//
// So this installs the worker for real, goes offline, and computes.
//
// These pass in a few hundred milliseconds, which looks like they are not doing
// anything. They are: everything is being served from the precache. Verified
// with a control that blocks sw.js from registering and then goes offline --
// the reload fails outright with net::ERR_INTERNET_DISCONNECTED, so the
// assertions below are known to depend on the worker rather than on Playwright
// or the HTTP cache quietly serving them.
import { test, expect } from "@playwright/test";

async function installWorker(page) {
  await page.goto("/");
  // `ready` resolves after ACTIVATION, which follows a completed install --
  // and the install handler awaits its cache.addAll, so a resolved `ready`
  // means the precache is on disk.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
}

test("offline: the home view still loads with the network cut", async ({ page, context }) => {
  await installWorker(page);
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.locator("#search-input")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test("offline: a calculator still computes with the network cut", async ({ page, context }) => {
  await installWorker(page);
  // Warm this tile's lazily-loaded module while the network is up, the way a
  // reader who opened it once would have.
  await page.goto("/#ohms-law");
  await expect(page.locator("#view-region h1")).toBeVisible();

  await context.setOffline(true);
  try {
    await page.reload();
    // The calculator has to render AND answer: a cached shell that cannot
    // compute is not "works offline".
    await expect(page.locator("#view-region h1")).toBeVisible();
    const boxes = page.locator("#view-region input[type=number], #view-region input[type=text]");
    await expect(boxes.first()).toBeVisible();
    await boxes.nth(0).fill("120");
    await boxes.nth(1).fill("10");
    const out = page.locator("#view-region .output-region");
    await expect(out).toContainText(/[0-9]/, { timeout: 10000 });
    await expect(out).not.toContainText(/NaN|Infinity|undefined/);
  } finally {
    await context.setOffline(false);
  }
});

test("offline: a calculator backed by a data shard still computes", async ({ page, context }) => {
  // The two tests above use ohms-law, which is pure arithmetic. A tile that
  // READS a shard exercises a different path, and that path grew a step on
  // 2026-08-29: every shard fetch now hands its bytes to integrity.js's
  // verifyShard, which fetches the folder's manifest to look the hash up.
  // Offline that fetch cannot succeed, so the design returns null and skips
  // rather than throwing or accusing -- but "by design" and "verified" are not
  // the same claim, and the README promises the second one.
  //
  // Note what carries the shard: sw.js precaches data/realestate/manifest.json
  // but NOT loan-limits.json. The shard is served from the runtime DATA_CACHE,
  // which the fetch handler populates cache-first on first read, so this works
  // for a reader who has opened the tile before -- which is what warming it
  // below models. Confirmed against the same control the tests above use: with
  // the worker blocked, the offline reload fails outright with
  // net::ERR_INTERNET_DISCONNECTED, so nothing here is the HTTP cache.
  await installWorker(page);
  await page.goto("/#loan-limits");
  await expect(page.locator("#view-region h1")).toBeVisible();
  const example = page.locator("#view-region button").filter({ hasText: /example/i }).first();
  await example.click();
  const out = page.locator("#view-region .output-region");
  await expect(out).toContainText(/San Francisco/, { timeout: 15000 });

  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.locator("#view-region h1")).toBeVisible();
    await page.locator("#view-region button").filter({ hasText: /example/i }).first().click();
    // The shard's own content, not just a rendered shell: this county and this
    // limit come out of data/realestate/loan-limits.json.
    await expect(out).toContainText(/San Francisco/, { timeout: 15000 });
    await expect(out).toContainText(/1,209,750/);
    await expect(out).not.toContainText(/NaN|Infinity|undefined/);
    // A failed manifest fetch must not be reported to the reader as tampering.
    await expect(page.locator("#integrity-banner")).toHaveCount(0);
  } finally {
    await context.setOffline(false);
  }
});
