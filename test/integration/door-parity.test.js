// The browser half of the two-door parity check (unit half:
// test/unit/door-parity.test.js).
//
// `rankTools` returns nothing for an all-digit-led query, so trade shorthand
// and code sections -- "12/2", "240.21", "62.2" -- are answered by the
// fallback pass in search-discovery.js rather than by the ranker. The unit test
// pins the agent door to that pass by running the real MCP `search()`. Nothing
// could pin the browser door the same way: `searchTools` lives inside app.js's
// IIFE and cannot be imported, and a Node-side restatement of its algorithm is
// exactly the gate that passes while the product is broken. So this drives the
// real combobox in a real browser and reads the rows a person would see.
//
// CI-only, like its neighbours.
import { test, expect } from "@playwright/test";
import { TOOLS } from "../../tools-data.js";

const nameOf = (id) => {
  const t = TOOLS.find((x) => x.id === id);
  if (!t) throw new Error(`no such tile: ${id}`);
  return t.name;
};

// Each query is answered by a human-committed alias, not by the ranker.
const CASES = [
  { query: "12/2", id: "wire-ampacity" },
  { query: "240.21", id: "feeder-tap-rule" },
  { query: "62.2", id: "ashrae-622-ventilation" },
  // Added with the eight sections curated from the tiles' own citations; this
  // one answered nothing on either door before.
  { query: "130.5", id: "arc-flash-screen" },
];

for (const c of CASES) {
  test(`door parity: the site answers "${c.query}" with the tile a human mapped it to`, async ({ page }) => {
    await page.goto("/");
    const input = page.locator("#search-input");
    await input.click();
    await input.fill(c.query);
    // The 21 alias shards load on first interaction, and the fallback cannot
    // answer until they land. Retry the read rather than racing the fetch; a
    // wrong answer still fails, it just fails at the timeout instead of
    // immediately. Same reasoning as awaitSearchData in search-prefill.
    await expect(page.locator("#search-results .search-result").first().locator(".sr-name"))
      .toHaveText(nameOf(c.id), { timeout: 30000 });
  });
}
