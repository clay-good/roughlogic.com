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
  // It used to route home and scroll to the trade strip under the hero. With
  // the strip gone the fork has to be a real destination, or the dead end
  // stays a dead end.
  await expect(browse).toHaveAttribute("href", "tools/");
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

// spec-v1342: the ask card.
//
// A query carrying most of what a tile needs lands with one box empty and no
// sign which one. The card asks for it in words, names its unit, and shows a
// receipt of what is already in so the work does not look lost.

const ASK_QUERY = "asphalt tonnage 2400 sq ft 3 in deep 12 ft wide";

test("spec-v1342 ask card: asks for the missing value, naming its unit", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill(ASK_QUERY);
  await expect(page.locator("#search-results .search-result").first().locator(".sr-name"))
    .toHaveText("Asphalt Tonnage");
  await input.press("Enter");

  const card = page.locator(".ask-card");
  await expect(card).toBeVisible();
  // The unit matters: "What is the mix density?" is unanswerable beside a box
  // measured in pcf.
  await expect(card.locator(".ask-q")).toHaveText("What is the mix density in pcf?");
  await expect(card.locator(".ask-receipt")).toContainText("paved area 2400");

  // A tile that reads a blank required field as zero renders a confident
  // answer that looks exactly like a real one. It stays hidden while asking.
  await expect(page.locator(".output-region")).toBeHidden();

  // The question is a real <label for>, not an aria-label: check-field-accessors
  // and the a11y sweep both hold dynamically created inputs to one.
  const askId = await card.locator("input").getAttribute("id");
  await expect(page.locator(`label[for="${askId}"]`)).toHaveCount(1);
});

test("spec-v1342 ask card: answering it computes and dismisses", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill(ASK_QUERY);
  await expect(page.locator("#search-results .search-result").first().locator(".sr-name"))
    .toHaveText("Asphalt Tonnage");
  await input.press("Enter");

  const card = page.locator(".ask-card");
  await expect(card).toBeVisible();
  await card.locator("input").fill("145");
  await card.locator(".ask-go").click();

  await expect(card).toHaveCount(0);
  await expect(page.locator("#density_pcf")).toHaveValue("145");
  const answer = page.locator(".output-region");
  await expect(answer).toBeVisible();
  await expect(answer).toContainText("43.5");
  expect(await answer.textContent()).not.toMatch(/NaN|Infinity|undefined/);
});

test("spec-v1342 ask card: it is a shortcut, never a gate", async ({ page }) => {
  // Filling the real field below dismisses it just as well. The whole tile
  // stays interactive underneath the card the entire time.
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill(ASK_QUERY);
  await expect(page.locator("#search-results .search-result").first().locator(".sr-name"))
    .toHaveText("Asphalt Tonnage");
  await input.press("Enter");
  await expect(page.locator(".ask-card")).toBeVisible();

  await page.locator("#density_pcf").fill("150");
  await expect(page.locator(".ask-card")).toHaveCount(0);
  await expect(page.locator(".output-region")).toBeVisible();
});

test("spec-v1342 ask card: no card when nothing was extracted", async ({ page }) => {
  // The reader typed a tool name, not a sentence. The tile's own form is the
  // right answer and a question would be noise.
  await page.goto("/#asphalt-tonnage");
  await expect(page.locator("#area_ft2")).toBeVisible();
  await expect(page.locator(".ask-card")).toHaveCount(0);
});

// spec-v1338: the answer comes first.

test("spec-v1338: the answer region precedes the inputs in the DOM", async ({ page }) => {
  await page.goto("/#ohms-law");
  await page.waitForSelector(".input-region input");
  const answerFirst = await page.evaluate(() => {
    const out = document.querySelector(".output-region");
    const inp = document.querySelector(".input-region");
    return Boolean(out.compareDocumentPosition(inp) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(answerFirst).toBe(true);
});

test("spec-v1338: an untouched tile shows no empty answer box", async ({ page }) => {
  // Most renderers build their answer ROWS at mount and leave the values
  // blank, so ohms-law used to open as "V: Copy  I: Copy  R: Copy  P: Copy".
  // Below the inputs that was untidy; above them it is the first thing seen.
  await page.goto("/#ohms-law");
  await page.waitForSelector(".input-region input");
  await expect(page.locator(".output-region")).toBeHidden();

  await page.locator("#ol-v").fill("120");
  await page.locator("#ol-i").fill("10");
  await expect(page.locator(".output-region")).toBeVisible();
  await expect(page.locator(".output-region")).toContainText("12.000");
});

test("spec-v1338: a table-only answer is never hidden", async ({ page }) => {
  // loan-amortization's summary spans can stay empty while its schedule table
  // carries the whole answer. Reading only the value spans hid a fully
  // populated region -- and took the CSV export button and Copy-all with it.
  await page.goto("/#loan-amortization");
  await page.waitForSelector(".input-region button");
  await page.locator(".input-region button").first().click();
  await expect(page.locator(".output-region table").first()).toBeVisible();
  await expect(page.locator(".copy-all-btn")).toBeVisible();
});

// spec-v1337: the home page is one box.

test("spec-v1337 home: one box, four chips, and all 21 trade links kept", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1.home-h1")).toHaveText("Field math, answered.");
  // The count stays in the lede: check-readme-counts holds it, and a visible
  // count no gate watches is how a README once drifted to 1145 of 1564.
  await expect(page.locator("p.home-lede")).toContainText("1,771 free calculators");
  await expect(page.locator(".hero-chip")).toHaveCount(4);

  // spec-v1347: the browse-by-trade strip is gone from the home document --
  // the box is the whole page. The 21 group hubs keep their internal links
  // through /tools/, which the footer reaches from every page, and they stay
  // in the sitemap; assert both here so the link graph cannot quietly drop
  // them the way deleting the strip alone would have.
  await expect(page.locator(".home-trades-list")).toHaveCount(0);
  await expect(page.locator("footer a[href$='tools/']")).toHaveCount(1);
});

test("spec-v1337 chips: a chip fills the box and leaves the results open", async ({ page }) => {
  // The document click handler that closes the listbox treated a chip as a
  // click OUTSIDE the search UI, so a chip filled the box and instantly closed
  // the results it had just opened.
  await page.goto("/");
  const chip = page.locator(".hero-chip").first();
  const query = await chip.getAttribute("data-q");
  await chip.click();
  await expect(page.locator("#search-input")).toHaveValue(query);
  await expect(page.locator("#search-results")).toBeVisible();
  await expect(page.locator(".search-result").first()).toBeVisible();
});

test("spec-v1337 chips: every chip routes to a real tile with values", async ({ page }) => {
  // A chip that teaches a query the site cannot answer is worse than no chip.
  const count = await (async () => { await page.goto("/"); return page.locator(".hero-chip").count(); })();
  for (let i = 0; i < count; i++) {
    await page.goto("/");
    await page.locator(".hero-chip").nth(i).click();
    await expect(page.locator(".search-result").first()).toBeVisible();
    await page.locator("#search-input").press("Enter");
    await expect(page).toHaveURL(/#[a-z0-9-]+\?v=1&/);
    await expect(page.locator(".field-provenance").first()).toBeVisible();
  }
});

test("spec-v1337 chips: 48px touch targets", async ({ page }) => {
  await page.goto("/");
  const chips = page.locator(".hero-chip");
  const n = await chips.count();
  for (let i = 0; i < n; i++) {
    const box = await chips.nth(i).boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

// spec-v1343: two or three plain choices when the query is ambiguous.

test("spec-v1343: a vague query asks instead of guessing", async ({ page }) => {
  // "pressure drop" is compressed-air AND filter AND flash-steam. They are not
  // variants of one calculator; they answer different questions.
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill("pressure drop");
  await expect(page.locator(".search-result").first()).toBeVisible();
  await input.press("Enter");

  const card = page.locator(".pick-card");
  await expect(card).toBeVisible();
  const picks = card.locator(".pick");
  expect(await picks.count()).toBeGreaterThanOrEqual(2);
  expect(await picks.count()).toBeLessThanOrEqual(3);
  // Named by the question each answers, not by a group label.
  await expect(picks.first().locator(".pick-name")).not.toBeEmpty();
  await expect(picks.first().locator(".pick-desc")).not.toBeEmpty();

  // NOTHING routes until the reader chooses.
  expect(page.url()).not.toMatch(/#\w/);
});

test("spec-v1343: choosing an option routes to that calculator", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill("pressure drop");
  await expect(page.locator(".search-result").first()).toBeVisible();
  await input.press("Enter");
  await expect(page.locator(".pick-card")).toBeVisible();

  await page.locator(".pick").first().click();
  await expect(page).toHaveURL(/#[a-z0-9-]+/);
  await expect(page.locator(".pick-card")).toHaveCount(0);
  await expect(page.locator(".input-region")).toBeVisible();
});

test("spec-v1343: a specific query routes straight through, no card", async ({ page }) => {
  // The gate must not fire on a query that carries its own values -- that is
  // the whole point of the split.
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill("voltage drop 120v 150 ft 12 awg copper 20a single phase");
  await expect(page.locator("#search-results .search-result").first().locator(".sr-name"))
    .toHaveText("Voltage Drop");
  await input.press("Enter");
  await expect(page).toHaveURL(/#voltage-drop\?v=1&/);
  await expect(page.locator(".pick-card")).toHaveCount(0);
});

test("spec-v1343: arrowing to a row is a deliberate pick and routes", async ({ page }) => {
  // render() calls setActive(0), so activeIndex is 0 the moment anything is
  // typed. Without the userPicked flag every Enter looks deliberate and the
  // ambiguity check never runs -- the feature would ship silently dead.
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill("pressure drop");
  await expect(page.locator(".search-result").first()).toBeVisible();
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page).toHaveURL(/#[a-z0-9-]+/);
  await expect(page.locator(".pick-card")).toHaveCount(0);
});
