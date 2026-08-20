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
    title: "Voltage Drop",
    query: "voltage drop 120v 150 ft 20 amps",
    filled: { "vd-src": "120", "vd-len": "150", "vd-cur": "20" },
  },
  {
    name: "fire-friction",
    title: "Fire Hose Friction Loss",
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
    // Enter picks whatever is ranked first AT THAT MOMENT, and the ranking
    // keeps moving while the lazy alias / slot / discovery shards land -- so
    // waiting for merely "a row is visible" raced, and under full-suite load
    // this query landed on max-circuit-length-for-vd instead of voltage-drop.
    // Wait for the row that should win to actually be the first one.
    await expect(page.locator("#search-results .search-result").first().locator(".sr-name"))
      .toHaveText(c.title);
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

// spec-v1341: the generic prefill and its provenance.
//
// The slot templates cover 49 tiles; the field index covers 1,331. These
// assert the generic path fills fields the template never listed, that every
// value the reader's own words produced is captioned, and -- the one that
// matters for anyone who shares a link -- that the SAME hash carries no
// provenance when it is arrived at cold.

test("spec-v1341 prefill: a template's gaps are filled from the question too", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill("voltage drop 120v 150 ft 12 awg copper 20a single phase");
  await expect(page.locator("#search-results .search-result").first().locator(".sr-name"))
    .toHaveText("Voltage Drop");
  await input.press("Enter");

  // The slots.json template sets source/length/current. It does NOT list the
  // AWG select, so before this spec a reader who typed "12 awg" got a tile
  // sitting on its first option (18) and an answer computed from it.
  await expect(page.locator("#vd-awg")).toHaveValue("12");
  await expect(page.locator("#vd-mat")).toHaveValue("copper");
  await expect(page.locator("#vd-src")).toHaveValue("120");

  // Whatever was filled is encoded into the URL by the existing hash wiring,
  // so a prefilled answer is still a shareable link.
  await expect(page).toHaveURL(/vd-awg=12/);

  const answer = await page.locator(".output-region").textContent();
  expect(answer).not.toMatch(/NaN|Infinity|undefined/);
});

test("spec-v1341 provenance: captioned on a typed question, cleared on edit", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill("voltage drop 120v 150 ft 12 awg copper 20a single phase");
  await expect(page.locator("#search-results .search-result").first().locator(".sr-name"))
    .toHaveText("Voltage Drop");
  await input.press("Enter");

  const captions = page.locator(".field-provenance");
  await expect(captions.first()).toBeVisible();
  await expect(captions.first()).toHaveText("from your question");
  const before = await captions.count();
  expect(before).toBeGreaterThan(1);

  // The first edit makes it the reader's value, not ours.
  await page.locator("#vd-len").fill("200");
  await expect(page.locator("#vd-len").locator("xpath=ancestor::*[contains(@class,'field')][1]")
    .locator(".field-provenance")).toHaveCount(0);
  expect(await captions.count()).toBe(before - 1);
});

test("spec-v1341 provenance: a shared link never claims its recipient typed it", async ({ page }) => {
  // The identical hash, arrived at cold. Hash state is the transport, not the
  // provenance -- reading it off the URL would caption a link someone was sent.
  await page.goto("/#voltage-drop?v=1&vd-phase=single&vd-mat=copper&vd-awg=12&vd-len=150&vd-cur=20&vd-src=120");
  await expect(page.locator("#vd-awg")).toHaveValue("12");
  await expect(page.locator("#vd-len")).toHaveValue("150");
  await expect(page.locator(".field-provenance")).toHaveCount(0);
});
