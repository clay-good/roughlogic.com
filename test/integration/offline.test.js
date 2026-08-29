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
