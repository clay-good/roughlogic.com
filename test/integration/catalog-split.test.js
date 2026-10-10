// The catalog reaches the browser in two parts since 2026-10-10: tools-lead.js
// (every tile, description cut to its opening sentence) and data/desc/<x>.json
// (the remainders). test/unit/catalog-lead-split.test.js proves the FILES are a
// lossless split. What only a browser can show is that app.js actually uses
// them the way the split promised:
//   - a deep link loads the lead catalog and ONE shard, never the full catalog;
//   - the tile still prints its whole description in Details;
//   - search still finds a tile by words that appear only after its opening
//     sentence, which means it waited for the shards before ranking.
import { test, expect } from "@playwright/test";
import { TOOLS as FULL } from "../../tools-data.js";
import { TOOLS as LEAD } from "../../tools-lead.js";
import { restOfDescription } from "../../text-lead.js";
import { descBucket } from "../../desc-bucket.js";

// A description shard, not the folder manifest the startup integrity check reads.
const isShard = (p) => /\/data\/desc\/[a-z0-9]+\.json$/.test(p) && !p.endsWith("/manifest.json");

// A few tiles with a remainder, in different shards.
const SAMPLE = ["voltage-drop", "bare-pipe-heat-loss", "stairs", "manual-j-cooling"]
  .filter((id) => (LEAD.find((t) => t.id === id) || {}).more);

for (const id of SAMPLE) {
  test(`catalog split: #${id} loads the lead catalog and one shard, and prints its whole description`, async ({ page }) => {
    const requested = [];
    page.on("request", (r) => requested.push(new URL(r.url()).pathname));
    await page.goto("/#" + id);
    const full = FULL.find((t) => t.id === id);
    await expect(page.locator(".view-title")).toHaveText(full.name);
    // The remainder is filled from the shard; toHaveText waits for it.
    await expect(page.locator("details.proof .view-detail:not(.view-detail-note)")).toHaveText(restOfDescription(full.desc));
    expect(requested.some((p) => p.endsWith("/tools-lead.js"))).toBe(true);
    expect(requested.filter((p) => p.endsWith("/tools-data.js"))).toEqual([]);
    const shards = [...new Set(requested.filter((p) => isShard(p)))];
    expect(shards).toEqual(["/data/desc/" + descBucket(id) + ".json"]);
  });
}

test("catalog split: search finds a tile by words that are only in the remainder of its description", async ({ page }) => {
  // A distinctive phrase from past the opening sentence of one tile, absent
  // from every lead in the catalog and from every tile name.
  let pick = null;
  for (let i = 0; i < FULL.length && !pick; i++) {
    if (!LEAD[i].more) continue;
    const rest = FULL[i].desc.slice(LEAD[i].desc.length);
    for (const m of rest.matchAll(/\b([a-z]{9,})\b/g)) {
      const w = m[1];
      const elsewhere = FULL.some((t, j) => (j !== i && t.desc.toLowerCase().includes(w)) || t.name.toLowerCase().includes(w) || t.id.includes(w));
      if (!elsewhere && !LEAD[i].desc.toLowerCase().includes(w)) { pick = { tool: FULL[i], word: w }; break; }
    }
  }
  expect(pick, "a word unique to one description's remainder").not.toBeNull();
  const requested = [];
  page.on("request", (r) => requested.push(new URL(r.url()).pathname));
  await page.goto("/");
  const input = page.locator("#search-input");
  await input.click();
  await input.fill(pick.word);
  await expect(page.locator("#search-results .search-result .sr-name").first()).toHaveText(pick.tool.name, { timeout: 20000 });
  // Search restored every description first: all the shards were fetched.
  const shards = new Set(requested.filter((p) => isShard(p)));
  const expected = new Set(LEAD.filter((t) => t.more).map((t) => "/data/desc/" + descBucket(t.id) + ".json"));
  expect([...shards].sort()).toEqual([...expected].sort());
  expect(requested.filter((p) => p.endsWith("/tools-data.js"))).toEqual([]);
});
