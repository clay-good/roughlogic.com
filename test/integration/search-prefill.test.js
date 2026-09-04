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

// The dropdown's ranking and its computed preview both depend on data the page
// only fetches on first interaction: 21 per-group alias shards (256 KB in
// total), plus the slot and preview maps. On a loaded runner those can outlast
// the default 5 s expect timeout, and the assertion then reports a ranking bug
// that is really a fetch still in flight -- which is exactly how a green suite
// went red on commits touching no browser code at all.
//
// So wait for the data instead of racing it. The waiter is registered BEFORE
// the interaction that triggers the fetch, because waitForResponse only sees
// responses that arrive after it is attached. This is a precondition, not a
// softened assertion: the ranking still has to be right once the data is in,
// and a real regression still fails.
function awaitSearchData(page, ...parts) {
  return Promise.all(parts.map((part) =>
    page.waitForResponse((r) => r.url().includes(part) && r.ok(), { timeout: 30000 })));
}

// spec-v592: the computed answer renders inside the dropdown on the
// top-ranked row once the slots map, and Escape clears it with the rest
// of the dropdown.
test("search preview: flagship query shows a computed answer in the dropdown", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("#search-input");
  const ready = awaitSearchData(page, "slots.json", "preview-map.json");
  await input.click();
  await input.fill("voltage drop 120v 150 ft 20 amps");
  await ready;
  const preview = page.locator("#search-result-0 .sr-preview");
  // The data being in is not the same as the preview being drawn: the last
  // step imports the tile's calculator module and runs it, and there is no
  // response left to wait on. Measured on this machine, the preview appears
  // 795 ms after the keystroke unthrottled and 5,880 ms at a 4x CPU throttle,
  // so the default 5 s expect timeout is under the real cost of a loaded
  // runner -- and the failure it reports is "element(s) not found", which
  // reads as a ranking bug rather than a slow machine. This is still a real
  // assertion: a preview that never renders fails it. The suite's timing
  // guarantees live in perf.test.js, not here.
  await expect(preview).toBeVisible({ timeout: 30_000 });
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
  const ranked = awaitSearchData(page, "aliases-e.json");
  await input.click();
  await input.fill(ASK_QUERY);
  await ranked;
  // The 30 s budget the rest of this file uses for anything gated on a lazy
  // shard: `ranked` resolving means the response landed, not that the ranker
  // has re-run and repainted, and on a loaded runner those are seconds apart.
  await expect(page.locator("#search-results .search-result").first().locator(".sr-name"))
    .toHaveText("Asphalt Tonnage", { timeout: 30_000 });
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
  const ranked = awaitSearchData(page, "aliases-e.json");
  await input.click();
  await input.fill(ASK_QUERY);
  await ranked;
  await expect(page.locator("#search-results .search-result").first().locator(".sr-name"))
    // 30 s, matching its two siblings above and below, which already carry it.
    // This one did not, and it was the only ask-card assertion that did not --
    // it went red in CI once the 2026-09-02 mousemove fix stopped a parked
    // pointer from freezing the list: the ranking now re-renders when the late
    // alias shards land, which is correct, and correct takes longer than a
    // frozen first paint. The assertion is unchanged.
    .toHaveText("Asphalt Tonnage", { timeout: 30_000 });
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
  const ranked = awaitSearchData(page, "aliases-e.json");
  await input.click();
  await input.fill(ASK_QUERY);
  await ranked;
  await expect(page.locator("#search-results .search-result").first().locator(".sr-name"))
    .toHaveText("Asphalt Tonnage", { timeout: 30_000 });
  await input.press("Enter");
  await expect(page.locator(".ask-card")).toBeVisible({ timeout: 30_000 });

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
  await expect(page.locator("p.home-lede")).toContainText("1,804 free calculators");
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
  // Its own visible text. These read `data-q` until 2026-09-02, which is to
  // say they asserted the chip worked using a string the reader never sees --
  // and the string the reader DOES see ranked a different tile first on three
  // of the four chips.
  const query = (await chip.textContent()).trim();
  await chip.click();
  await expect(page.locator("#search-input")).toHaveValue(query);
  await expect(page.locator("#search-results")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".search-result").first()).toBeVisible({ timeout: 30_000 });
});

test("spec-v1337 chips: every chip routes to a real tile with values", async ({ page }) => {
  // A chip that teaches a query the site cannot answer is worse than no chip.
  const count = await (async () => { await page.goto("/"); return page.locator(".hero-chip").count(); })();
  for (let i = 0; i < count; i++) {
    await page.goto("/");
    await page.locator(".hero-chip").nth(i).click();
    // Same lazily-fetched search data as the flagship preview above, and the
    // same reason for an explicit timeout: a chip opens results only once the
    // alias shards land, and prefill draws provenance only once the field
    // shard does. Loaded, that outlasts the 5 s default.
    await expect(page.locator(".search-result").first()).toBeVisible({ timeout: 30_000 });
    await page.locator("#search-input").press("Enter");
    // Explicit, for the reason the block comment below gives: the first row
    // renders long before the ranking settles under a throttled CI runner, so
    // the hash this waits for can be 5-8 s away. The assertion is unchanged --
    // only the patience is.
    await expect(page).toHaveURL(/#[a-z0-9-]+\?v=1&/, { timeout: 30_000 });
    await expect(page.locator(".field-provenance").first()).toBeVisible({ timeout: 30_000 });
  }
});

// One test per chip, not one test over all four. The four-chip loop does eight
// full navigations with the 30 s data waits this file documents, which cannot
// fit inside Playwright's 30 s per-test budget on a loaded CI runner -- it
// failed there three times while passing locally. Per chip, each gets its own
// budget, and a failure names which chip broke.
for (const chipIndex of [0, 1, 2, 3]) {
  test(`spec-v1337 chips: chip ${chipIndex} and its own text reach the same tile`, async ({ page }) => {
    // Two full journeys with the lazily-fetched search data in each: ~3.5 s
    // locally, and this file measures the same work at 5-8x under a throttled
    // runner. test.slow() triples the budget rather than leaving it one bad
    // minute from red.
    test.slow();
    // The chips are the site's demonstration of "type the job the way you'd say
    // it". A chip that shows one query and runs another teaches a sentence that
    // does not work -- which is what a `data-q` did until 2026-09-02, and three
    // of the four visible labels ranked a different tile first.
    await page.goto("/");
    const label = (await page.locator(".hero-chip").nth(chipIndex).textContent()).trim();

    await page.locator(".hero-chip").nth(chipIndex).click();
    await expect(page.locator(".search-result").first()).toBeVisible({ timeout: 30_000 });
    await page.locator("#search-input").press("Enter");
    await expect(page).toHaveURL(/#[a-z0-9-]+\?v=1&/, { timeout: 30_000 });
    const viaChip = page.url().split("#")[1].split("?")[0];

    await page.goto("/");
    await page.locator("#search-input").pressSequentially(label, { delay: 5 });
    await expect(page.locator(".search-result").first()).toBeVisible({ timeout: 30_000 });
    await page.locator("#search-input").press("Enter");
    await expect(page).toHaveURL(/#[a-z0-9-]+/, { timeout: 30_000 });
    const viaTyping = page.url().split("#")[1].split("?")[0];

    expect(viaTyping, `chip ${JSON.stringify(label)} routes to ${viaChip} when clicked but ${viaTyping} when typed`)
      .toBe(viaChip);
  });
}

test("spec-v1337 chips: a resting mouse does not choose a row", async ({ page }) => {
  // The rows are rendered under wherever the pointer happens to be sitting
  // after the click, and the browser dispatches `mouseenter` when layout brings
  // an element beneath a stationary cursor. That was wired to "the reader
  // picked this row": Enter then opened whichever tile had drifted under the
  // mouse, and `userPicked` also suppressed the re-rank when the alias shards
  // landed -- so a pointer that never moved both stole the highlight and
  // pinned it against the better answer arriving a moment later.
  //
  // The mouse is deliberately NOT moved after the click here. That is the bug.
  await page.goto("/");
  await page.locator(".hero-chip").nth(1).click();
  await expect(page.locator(".search-result").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#search-input")).toHaveAttribute("aria-activedescendant", "search-result-0", {
    timeout: 30_000,
  });
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

// The dropdown assertions below carry an explicit timeout for the same reason
// the flagship preview does: awaitSearchData waits on the shard RESPONSES, but
// rendering the rows from them is the reader's own machine doing work, and it
// is the part that runs long. Measured here, the first .search-result appears
// 88 ms after the keystroke unthrottled, 5,114 ms at a 4x CPU throttle and
// 7,732 ms at 6x -- past the 5 s default, which is how three of these routing
// specs flaked across today's runs. A dropdown that never renders still fails.

// spec-v1343: two or three plain choices when the query is ambiguous.

test("spec-v1343: a vague query asks instead of guessing", async ({ page }) => {
  // "pressure drop" is compressed-air AND filter AND flash-steam. They are not
  // variants of one calculator; they answer different questions.
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill("pressure drop");
  await expect(page.locator(".search-result").first()).toBeVisible({ timeout: 30_000 });
  await input.press("Enter");

  const card = page.locator(".pick-card");
  // Same explicit budget as the row assertion above. This flaked once in a
  // suite run that took 25 minutes against a normal 13, and passes in 2-3 s
  // three times running on an idle machine, so it is the 5 s default meeting a
  // loaded runner rather than anything about the card.
  await expect(card).toBeVisible({ timeout: 30_000 });
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
  // Whether "pressure drop" is AMBIGUOUS enough to raise the pick card depends
  // on the ranking, and the ranking depends on the alias shards. Its candidates
  // come from groups C, G and B, so wait for those three before asking whether
  // the card appeared -- every group's shard is fetched regardless of the query,
  // so this cannot hang. Without it the test races its own data and reports a
  // missing card that is really a fetch in flight.
  const ranked = awaitSearchData(page, "aliases-c.json", "aliases-g.json", "aliases-b.json");
  await input.click();
  await input.fill("pressure drop");
  await ranked;
  await expect(page.locator(".search-result").first()).toBeVisible({ timeout: 30_000 });
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
  await expect(page.locator(".search-result").first()).toBeVisible({ timeout: 30_000 });
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page).toHaveURL(/#[a-z0-9-]+/);
  await expect(page.locator(".pick-card")).toHaveCount(0);
});

// The answer preview needs THREE async dependencies -- search-discovery.js,
// data/search/slots.json, and data/search/preview-map.json -- and
// schedulePreview() bails silently when any is missing. All three are started
// fire-and-forget by loadAndRender(), so whether the preview appears at all was
// a race against the reader's typing: finish the query before a dependency
// lands and nothing re-runs, because the re-render only happens on the next
// keystroke and a reader who has stopped typing never sends one.
//
// ensureDiscovery() had always re-rendered on arrival for exactly this reason;
// ensureSlots() and ensurePreview() did not, which is why this surfaced on CI
// as three search-preview tests failing every retry on a docs-only commit --
// a slow cold runner loses the race consistently, so the retries lose it too.
//
// Delaying both fetches makes the race deterministic instead of leaving it to
// runner speed. Without the late-arrival re-render this test fails; with it the
// preview fills in when the data lands.
test("search preview survives its data arriving after the reader stops typing", async ({ page }) => {
  for (const shard of ["**/data/search/slots.json", "**/data/search/preview-map.json"]) {
    await page.route(shard, async (route) => {
      await new Promise((r) => setTimeout(r, 1200));
      await route.continue();
    });
  }
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill("voltage drop 120v 150 ft 20 amps");
  // One fill, then no further input: nothing else will re-trigger the preview.
  const preview = page.locator("#search-result-0 .sr-preview");
  await expect(preview).toBeVisible({ timeout: 30_000 });
  const text = await preview.textContent();
  expect(text).toMatch(/drop \d+(\.\d+)? V/);
  expect(text).not.toMatch(/NaN|Infinity|undefined/);
});

// A select can REBUILD the form. `concrete` renders its dimension boxes only
// for the chosen shape, tearing the old ones out of the DOM and making new
// ones, so a prefill that resolved every element up front and then wrote the
// shape left the rest of its writes landing on detached nodes: three empty
// boxes captioned "from your question", above an answer of zero.
test("a shape-changing select does not orphan the fields prefilled after it", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill("concrete volume slab length 20 ft width 10 ft thickness 4 in");
  const option = page.locator("#search-results [role=option]", { hasText: /^Concrete Volume/ }).first();
  await option.click();

  await expect(page.locator("#co-s")).toHaveValue("slab");
  await expect(page.locator("#co-length_ft")).toHaveValue("20");
  await expect(page.locator("#co-width_ft")).toHaveValue("10");
  await expect(page.locator("#co-thickness_in")).toHaveValue("4");
  // 20 x 10 x 4in = 66.67 ft^3; the tile answers rather than showing zero.
  await expect(page.locator("#co-out-cf")).toHaveText(/66\.67/);
});

// A transient failure fetching the alias shards must not cost the session its
// aliases. Without them the ranking is visibly worse: this very query leads
// with a carpet takeoff instead of Asphalt Tonnage, which is what a CI runner
// saw when the shards did not arrive in time. `aliasLoaded` was latched before
// the fetches resolved, so the only recovery was a full page reload --
// `ensureDiscovery` has always released its flag on failure, and now these do
// too.
test("spec-v590: a failed alias fetch is retried on the next keystroke", async ({ browser }) => {
  // A context with service workers BLOCKED. The worker precaches all 21 alias
  // shards and serves them from its own cache, which page.route cannot
  // intercept -- so with it installed, aborting the network fetch proves
  // nothing: the shards arrive anyway. That is the app working as designed, and
  // it made this test pass for the wrong reason and then flake. Blocking the
  // worker leaves the network as the only path the aliases have, which is the
  // path this test is about.
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  let failNext = true;
  // The service worker precaches all 21 alias shards and serves them from its
  // own cache, which page.route cannot intercept -- so with the worker allowed
  // to install, aborting the network fetch proves nothing: the shards arrive
  // anyway and the "degraded" ranking is not degraded. That is the app working
  // as designed, and it made this test pass for the wrong reason. Keep the
  // worker out so the abort is the only path the aliases have.
  await page.route("**/data/search/aliases-*.json", (route) => {
    if (failNext) return route.abort();
    return route.continue();
  });

  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill(ASK_QUERY);

  // This used to assert the degraded ranking does NOT lead with Asphalt Tonnage,
  // which was true and is no longer: with no aliases at all the ranker used to
  // lead with a carpet takeoff, and after the identity-coverage sort key it
  // leads with Asphalt Tonnage on the tile's own name. The degraded state got
  // better, so "the ranking is visibly wrong" stopped being a usable signal for
  // "the aliases have not loaded".
  //
  // That assertion was only ever a proxy. What spec-v590 is about is the LATCH:
  // a failed alias fetch must not cost the session its aliases, so the next
  // keystroke has to retry. The retry is observed directly below by waiting on
  // the shard response itself -- if the latch stays set, no request is made and
  // that wait times out. Assert the results rendered at all, which is what puts
  // us in the degraded state, and let the latch be proven by the thing that
  // actually proves it.
  const top = page.locator("#search-results .search-result").first().locator(".sr-name");
  await expect(top).toBeVisible({ timeout: 30_000 });

  // Let the shards through and type one more character: the latch must have
  // been released, so the aliases load and the ranking corrects itself.
  //
  // The correction waits on a NETWORK fetch of a shard this spec deliberately
  // aborted once, in a context with the service worker blocked so every other
  // shard is fetched cold too. On 2026-09-01 that ran past the 5 s default
  // expect timeout on a loaded CI runner and failed all three attempts, which
  // reads exactly like a race but was the clock -- the same diagnosis the
  // preview-map spec below already carries. Wait for the shard, the way that
  // spec does, rather than widening the budget and hoping; the waiter is
  // registered BEFORE the keystroke that triggers the fetch.
  failNext = false;
  const reranked = awaitSearchData(page, "aliases-e.json");
  await input.press("End");
  await input.type(" ");
  await reranked;
  await expect(top).toHaveText("Asphalt Tonnage", { timeout: 30_000 });
  await context.close();
});

// The alias retry above is one of THREE latches released on failure. The other
// two were unprotected: removing `slotsLoading = false` and
// `previewLoading = false` broke no test at all, so a revert would have been
// silent. Both are observable, so both are asserted here rather than left to a
// source-shape check.
//
// Service workers are blocked for the same reason as the alias spec: sw.js
// precaches slots.json and preview-map.json, and a worker-served response never
// reaches page.route, so with it installed the abort proves nothing.
test("spec-v592: a failed preview-map fetch is retried on the next keystroke", async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  let failNext = true;
  await page.route("**/data/search/preview-map.json", (route) =>
    (failNext ? route.abort() : route.continue()));

  await page.goto("/");
  const input = page.locator("#search-input");
  // This context blocks the service worker AND intercepts one shard, so every
  // other shard is fetched cold; it is the slowest spec in the file. Its flake
  // was "element(s) not found" for the preview, but the missing element was the
  // ROW: with the alias shards still in flight there is no #search-result-0 to
  // carry a preview, and the 15 s budget was already running. The retry itself
  // is sound -- measured, the preview returns 193 ms after the second keystroke
  // unthrottled and 240 ms at a 4x CPU throttle -- so wait for the rows rather
  // than widen the budget and hope.
  const ranked = awaitSearchData(page, "aliases-e.json");
  await input.click();
  await input.fill("voltage drop 120v 150 ft 20 amps");
  await ranked;
  await expect(page.locator(".search-result").first()).toBeVisible({ timeout: 30_000 });

  // With the map missing, schedulePreview bails and no answer appears.
  const preview = page.locator("#search-result-0 .sr-preview");
  await expect(preview).toHaveCount(0);

  // Let it through and type once more: the latch must have been released, so
  // the fetch is retried and the computed answer arrives.
  failNext = false;
  await input.press("End");
  await input.type(" ");
  await expect(preview).toBeVisible({ timeout: 15000 });
  await expect(preview).toContainText(/drop \d+(\.\d+)? V/);
  await context.close();
});

// A behavioural test for the SLOTS latch was written and then deleted, because
// it passed with slots.json permanently blocked: the hash params it asserted
// come from the data/fields index (spec-v1339), which arrived after the slot
// table (spec-v591) and covers this query without it. The test proved nothing.
// The latch release is asserted by shape in alias-autocomplete-wiring instead,
// which at least catches a revert.
