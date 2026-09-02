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
//
// One boundary on what these can prove, found by trying to measure the COLD
// case -- a reader who goes offline having never opened a data-backed tile.
// Playwright's context.setOffline() covers page-initiated requests: probed from
// page.evaluate, three never-cached shards all come back 504 from the worker's
// own offline branch, which is the correct behaviour. It does NOT reliably
// cover the fetches the service worker itself makes: the same shard probes 504
// before the tile asks for it and 200 immediately after, offline throughout,
// so something serviced that request. The cold case is therefore NOT measurable
// with this harness and no test here claims it. What is claimed below is the
// warm path, which is what "works offline after the first load" promises.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

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
  // The tile is warmed online first, which is what a reader who has opened it
  // before would have done, and confirmed against the same control the tests
  // above use: with the worker blocked, the offline reload fails outright with
  // net::ERR_INTERNET_DISCONNECTED, so nothing here is the HTTP cache.
  //
  // The assertion is the matched COUNTY, not the dollar figure. Both matter:
  // sw.js does not name loan-limits.json anywhere, so the shard reaches this
  // page through the runtime DATA_CACHE rather than the precache, and if it
  // failed to arrive the compute falls back to the bundled baseline instead of
  // erroring. That fallback publishes ceiling_high_cost_one_unit_usd, which is
  // the SAME number as the San Francisco row. Asserting the dollars alone would
  // pass with the shard entirely absent. The county lookup ("San Francisco (CA,
  // FIPS 06075)") exists only in the shard's high_cost_counties_one_unit table,
  // so it is what actually pins this.
  //
  // The ceiling itself is read from the shard rather than written here as a
  // literal. It used to be the literal 1,209,750, and this spec went red in CI
  // on the 2026 FHFA/HUD refresh -- a test failing because a bundled federal
  // figure was brought up to date is a test asserting the wrong thing.
  const shard = JSON.parse(
    readFileSync(new URL("../../data/realestate/loan-limits.json", import.meta.url), "utf8"),
  );
  const ceilingText = shard.baseline.ceiling_high_cost_one_unit_usd.toLocaleString("en-US");

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
    await expect(out).toContainText(/San Francisco \(CA, FIPS 06075\)/, { timeout: 15000 });
    await expect(out).toContainText(ceilingText);
    await expect(out).not.toContainText(/NaN|Infinity|undefined/);
    // A failed manifest fetch must not be reported to the reader as tampering.
    await expect(page.locator("#integrity-banner")).toHaveCount(0);
  } finally {
    await context.setOffline(false);
  }
});

// A reader who bookmarks a tile page bookmarks the SHELL url, /tools/<id>/ --
// that is what a search result links to and what the address bar shows. The
// 1,804 tile shells are not precached (the group hubs and the catalog hub are),
// so opening one offline falls to the service worker's navigation fallback.
// That fallback used to hand back index.html AT THE SHELL URL, and every asset
// in index.html is a RELATIVE path: styles.css and app.js resolved to
// /tools/<id>/styles.css and 504'd. Measured 2026-08-31 -- an unstyled page
// showing the home view's "Field math, answered.", not the calculator asked
// for. It now redirects to the root with the tile as the hash.
test("offline: a bookmarked tile shell URL opens that calculator, styled", async ({ page, context }) => {
  await installWorker(page);
  await context.setOffline(true);
  try {
    await page.goto("/tools/ohms-law/");
    await expect(page).toHaveURL(/\/#ohms-law$/);
    await expect(page).toHaveTitle(/Ohm.s Law/);
    await expect(page.locator("h1", { hasText: "Ohm's Law" })).toBeVisible();
    // The stylesheet resolved: an unstyled document leaves the body background
    // transparent, which is how the old fallback presented.
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  } finally {
    await context.setOffline(false);
  }
});

test("offline: a group hub URL lands on the working app, not a broken page", async ({ page, context }) => {
  // No shell is precached -- 1,826 pages is not a precache -- so every shell
  // URL takes the same fallback. A group hub has no hash route of its own, so
  // it lands on the home view, which is the app with its search box, rather
  // than on index.html served under /groups/<slug>/ with its stylesheet 404ing.
  await installWorker(page);
  await context.setOffline(true);
  try {
    await page.goto("/groups/electrical/");
    await expect(page).toHaveURL(/localhost:8080\/$/);
    await expect(page.locator("#search-input")).toBeVisible();
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  } finally {
    await context.setOffline(false);
  }
});
