// spec-v591 search prefill integration (two seed tiles).
//
// Type a question carrying numbers-with-units into the hero combobox,
// press Enter, and assert the routed tile arrives with those inputs
// already populated and a non-empty output region (render-no-nan style).
// This exercises the full chain: ensureDiscovery / ensureSlots lazy
// loads -> rankTools pick -> extractQuantities + mapSlots -> the
// #tile?v=1&<id>=<value> hash -> applyHashState -> live compute.
//
// CI-only. Local dev does not require Playwright; `npm test` only runs
// unit tests.

import { test, expect } from "@playwright/test";

const CASES = [
  {
    name: "voltage-drop",
    query: "voltage drop 120v 150 ft 20 amps",
    filled: { "vd-src": "120", "vd-len": "150", "vd-cur": "20" },
  },
  {
    name: "fire-friction",
    query: "friction loss 200 ft of hose at 150 gpm",
    filled: { "ff-l": "200", "ff-q": "150" },
  },
];

// spec-v592: the computed answer renders inside the dropdown on the
// top-ranked row once the slots map, and Escape clears it with the rest
// of the dropdown.
test("search preview: flagship query shows a computed answer in the dropdown", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill("voltage drop 120v 150 ft 20 amps");
  const preview = page.locator("#search-result-0 .sr-preview");
  await expect(preview).toBeVisible();
  const text = await preview.textContent();
  expect(text).toMatch(/drop \d+(\.\d+)? V/);
  expect(text).not.toMatch(/NaN|Infinity|undefined/);
  await input.press("Escape");
  await expect(page.locator("#search-results")).toBeHidden();
  await expect(preview).toHaveCount(0);
});

test("search did-you-mean: an all-typo result set says what it matched", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill("condiut fill");
  const note = page.locator(".search-didyoumean");
  await expect(note).toBeVisible();
  await expect(note).toContainText('showing matches for "conduit fill"');
});

test("search no-match: the dead end offers the browse-all-trades fork", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill("zzzzqqqq");
  const browse = page.locator(".search-browse a");
  await expect(browse).toBeVisible();
  await expect(browse).toContainText("Browse all 21 trades");
});

for (const c of CASES) {
  test(`search prefill: "${c.query}" arrives on ${c.name} with inputs filled`, async ({ page }) => {
    await page.goto("/");
    const input = page.locator("#search-input");
    await input.click();
    await input.fill(c.query);
    // Let the lazy tools/aliases/slots/discovery loads land and the
    // dropdown render before Enter picks the top match.
    await expect(page.locator("#search-results .search-result").first()).toBeVisible();
    await input.press("Enter");
    await expect(page).toHaveURL(new RegExp("#" + c.name + "\\?v=1&"));
    for (const [id, value] of Object.entries(c.filled)) {
      await expect(page.locator("#" + id)).toHaveValue(value);
    }
    const outputText = await page.locator(".output-region").textContent();
    expect(outputText.trim().length).toBeGreaterThan(0);
    expect(outputText).not.toMatch(/NaN|Infinity|undefined/);
  });
}
