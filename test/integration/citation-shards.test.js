// A tile's reference block reaches the browser in two parts since 2026-10-10:
// citation-block.js (the renderer) and one data/citations/<bucket>.json shard.
// test/unit/citation-shards.test.js proves the FILES say what citations.js
// says. What only a browser can show is that app.js uses them as promised:
//   - a deep link fetches the renderer and ONE shard, never the registry;
//   - the block on the page states that tile's formula and edition;
//   - "Copy answer with full reference block" still carries the reference.
import { test, expect } from "@playwright/test";
import { CITATIONS } from "../../citations.js";
import { citationBucket } from "../../citation-bucket.js";

const isShard = (p) => /\/data\/citations\/\d+\.json$/.test(p);

// Tiles in different shards, old and new.
const SAMPLE = ["voltage-drop", "stairs", "saturated-steam-properties", "zonal-add-a-hole"];

for (const id of SAMPLE) {
  test(`citation shards: #${id} loads the renderer and one shard, and prints its reference block`, async ({ page }) => {
    const requested = [];
    page.on("request", (r) => requested.push(new URL(r.url()).pathname));
    await page.goto("/#" + id);
    const c = CITATIONS[id];
    const block = page.locator(".sources-region .v6-reference-block");
    await expect(block.locator(".v6-reference-row-formula .v6-reference-value")).toHaveText(c.formula);
    await expect(block.locator(".v6-reference-row-edition .v6-reference-value")).toHaveText(c.edition);
    await expect(block.locator(".v6-assumption-row")).toHaveCount(c.assumptions.length);
    expect(requested.some((p) => p.endsWith("/citation-block.js"))).toBe(true);
    expect(requested.filter((p) => p.endsWith("/citations.js"))).toEqual([]);
    expect([...new Set(requested.filter(isShard))]).toEqual(["/data/citations/" + citationBucket(id) + ".json"]);
    // The registry is not on the site at all.
    expect((await page.request.get("/citations.js")).status()).toBe(404);
  });
}

test("citation shards: two tiles in one shard fetch it once", async ({ page }) => {
  const byBucket = new Map();
  for (const id of Object.keys(CITATIONS)) {
    const b = citationBucket(id);
    if (!byBucket.has(b)) byBucket.set(b, []);
    byBucket.get(b).push(id);
  }
  const [first, second] = [...byBucket.values()].find((ids) => ids.length >= 2);
  const requested = [];
  page.on("request", (r) => requested.push(new URL(r.url()).pathname));
  await page.goto("/#" + first);
  await expect(page.locator(".v6-reference-row-formula .v6-reference-value")).toHaveText(CITATIONS[first].formula);
  await page.evaluate((h) => { location.hash = h; }, second);
  await expect(page.locator(".v6-reference-row-formula .v6-reference-value")).toHaveText(CITATIONS[second].formula);
  expect(requested.filter(isShard)).toHaveLength(1);
});
