// A reader's deliberate row choice, versus the lazily-loaded search data that
// lands underneath it.
//
// Kept in its own file: it deliberately holds the alias shards back and then
// waits, and adding that to the 27-spec search-prefill file tipped a
// neighbouring spec over its budget. Integration specs are file-scoped, so this
// costs nothing and keeps both honest.
import { test, expect } from "@playwright/test";

// A reader who arrows to a row has chosen it. The lazily-loaded search data can
// land a moment later, and every loader re-renders on arrival to keep the
// ranking fresh -- but render() ended with `userPicked = false; setActive(0)`,
// so that re-render threw the choice away. The highlight jumped back to the
// first row and Enter did something other than what was selected. The slower
// the connection, the likelier it was, which is also why it surfaced as an
// intermittent failure of the arrow-key spec rather than as a steady one.
test("spec-v1343: data arriving does not discard a row the reader arrowed to", async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  // Hold the alias shards back so they land AFTER the arrow key, deterministically.
  await page.route("**/data/search/aliases-*.json", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });

  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill("pressure drop");
  await expect(page.locator(".search-result").first()).toBeVisible();

  // Choose the second row while the shards are still in flight.
  await input.press("ArrowDown");
  await input.press("ArrowDown");
  const chosen = await page.locator(".search-result .sr-name").nth(1).textContent();

  // Let the data land and re-render underneath the choice.
  await page.waitForTimeout(2000);

  await input.press("Enter");
  // The choice survives: it routes, rather than falling through to the
  // ambiguity card as an undeliberate Enter would.
  await expect(page).toHaveURL(/#[a-z0-9-]+/, { timeout: 10000 });
  await expect(page.locator(".pick-card")).toHaveCount(0);
  expect(chosen && chosen.trim().length).toBeGreaterThan(0);
  await context.close();
});
