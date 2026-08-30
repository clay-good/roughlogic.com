// The related block on a tile page, for the 167 tiles nobody curated.
//
// The fallback used to be "the first 5 other tiles in the same group, by TOOLS
// order", which handed every uncurated tile in a group the SAME five links:
// Sheet-Metal Gauge pointed a reader at stair stringers and roof pitch. It also
// squeezed the internal link graph -- 482 of 1,804 tiles received no related
// link from any tile page while `square-footage` received 50. The fallback now
// ranks the tile's own name against its group siblings through the same
// `rankTools` the search box uses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { relatedTiles } from "../../scripts/build-shells.mjs";
import { RELATED } from "../../scripts/related-tiles.mjs";
import { TOOLS } from "../../tools-data.js";

test("curated entries lead, in the order the registry records them", () => {
  // Every curated tile, not a sample: the padding must never reorder or drop an
  // editorial pick, only append to one that is short of the spec's three.
  const wrong = [];
  for (const tool of TOOLS) {
    const curated = (RELATED[tool.id] || []).filter((id) => TOOLS.some((t) => t.id === id) && id !== tool.id);
    if (!curated.length) continue;
    const got = relatedTiles(tool, TOOLS, RELATED).map((t) => t.id);
    if (got.slice(0, curated.length).join(",") !== curated.join(",")) {
      wrong.push(`${tool.id}: curated [${curated}] but rendered [${got}]`);
    }
    if (got.length < Math.min(3, curated.length)) wrong.push(`${tool.id}: lost an entry`);
  }
  assert.deepEqual(wrong, []);
});

test("a short curated list is padded to three, not left at one", () => {
  const short = TOOLS.filter((t) => (RELATED[t.id] || []).length > 0 && (RELATED[t.id] || []).length < 3);
  assert.ok(short.length > 100, `expected the short-entry population, found ${short.length}`);
  for (const t of short.slice(0, 40)) {
    const siblings = TOOLS.filter((x) => x.group === t.group && x.id !== t.id).length;
    assert.ok(relatedTiles(t, TOOLS, RELATED).length >= Math.min(3, siblings + 1), t.id);
  }
});

test("an uncurated tile gets group siblings that share its vocabulary", () => {
  const tool = TOOLS.find((t) => t.id === "sheet-metal-gauge");
  const got = relatedTiles(tool, TOOLS, RELATED).map((t) => t.id);
  assert.equal(got.length, 5);
  assert.ok(!got.includes(tool.id), "a tile must not relate to itself");
  for (const id of got) {
    assert.equal(TOOLS.find((t) => t.id === id).group, tool.group, `${id} is outside the group`);
  }
  // Named, because the aggregate can improve while a specific page stays wrong.
  assert.ok(got.includes("bend-springback"), `sheet-metal-gauge related: ${got.join(", ")}`);
  assert.ok(!got.includes("stairs"), `the old fixed list is back: ${got.join(", ")}`);
});

test("uncurated tiles in a group do not all receive the same five links", () => {
  const uncurated = TOOLS.filter((t) => !RELATED[t.id] || !RELATED[t.id].length);
  const byGroup = new Map();
  for (const t of uncurated) {
    const list = byGroup.get(t.group) || [];
    list.push(t);
    byGroup.set(t.group, list);
  }
  let checked = 0;
  for (const [group, tiles] of byGroup) {
    if (tiles.length < 3) continue;
    checked++;
    const shapes = new Set(tiles.map((t) => relatedTiles(t, TOOLS, RELATED).map((x) => x.id).join(",")));
    assert.ok(shapes.size > 1, `every uncurated tile in group ${group} got the same related list`);
  }
  assert.ok(checked >= 3, `expected several groups with uncurated tiles, checked ${checked}`);
});

test("every tile gets at least three related links", () => {
  // spec-v13 §5.2 asks for 3-6. A tile in a tiny group can legitimately have
  // fewer siblings than that; assert against what the group can actually offer.
  const thin = [];
  for (const t of TOOLS) {
    const siblings = TOOLS.filter((x) => x.group === t.group && x.id !== t.id).length;
    const n = relatedTiles(t, TOOLS, RELATED).length;
    if (n < Math.min(3, siblings)) thin.push(`${t.id}: ${n} of ${siblings} possible`);
  }
  assert.deepEqual(thin, [], `tiles with too few related links:\n${thin.join("\n")}`);
});
