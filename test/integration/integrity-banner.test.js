// The threat model's T4 promises a reader something specific: if bundled data
// is tampered with, "the worst case is a visible warning, never silent
// corruption". Until now the warning half was verified one layer below the
// promise. `test/unit/integrity.test.js` proves verifyManifestIntegrity RETURNS
// a mismatch, and `test/integration/offline.test.js` proves the banner is
// ABSENT when nothing is wrong -- an assertion that would pass just as happily
// if showIntegrityBanner were deleted outright.
//
// Nothing had ever tampered with a shard and looked at the page. So this does:
// it rewrites data/integrity.json in flight so a real manifest no longer
// matches its recorded hash, then asserts a reader actually sees the warning,
// that it is announced rather than merely present, and that it stays
// non-blocking -- the calculators keep working, which is the other half of the
// control and the part a "fail closed" mistake would break.
import { test, expect } from "@playwright/test";

// Both halves of the claim, in one journey, because they trade off against each
// other: a banner that blocks the page would satisfy "visible" and break
// "non-blocking", and a page that quietly carries on satisfies "non-blocking"
// and breaks "visible".
test("integrity: a tampered manifest hash warns the reader and does not block the page", async ({ page }) => {
  await page.route("**/data/integrity.json", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    // One folder, not all of them: the banner has to name what it caught, and a
    // blanket rewrite could pass a test that only checks the banner exists.
    body.manifests.electrical = "0".repeat(64);
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(body),
    });
  });

  await page.goto("/");

  const banner = page.locator("#integrity-banner");
  await expect(banner).toBeVisible({ timeout: 30_000 });
  // role="alert" is the difference between a reader seeing it and a screen
  // reader user not being told.
  await expect(banner).toHaveAttribute("role", "alert");
  // It must name the dataset it caught, and say what to do.
  await expect(banner).toContainText("electrical");
  await expect(banner).toContainText(/unreliable/i);

  // Non-blocking: the site still works. If this ever fails, the control has
  // turned into a denial of service triggerable by one corrupted byte.
  await expect(page.locator("#search-input")).toBeVisible();
  await page.locator("#search-input").click();
  await page.locator("#search-input").fill("ohms law");
  await expect(page.locator(".search-result").first()).toBeVisible({ timeout: 30_000 });
});

// The mirror, and the reason the assertion above cannot be trivially satisfied:
// an untampered load must show nothing. offline.test.js asserts this too, but
// under a service worker and offline, which is a different path -- and a banner
// that fires on every load would be worse than one that never fires.
test("integrity: an untampered load shows no banner", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#search-input")).toBeVisible();
  await expect(page.locator("#integrity-banner")).toHaveCount(0);
});
