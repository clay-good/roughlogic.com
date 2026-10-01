// spec-v1926: curated collections -- the check-collections rules and the
// rendered page.

import { test } from "node:test";
import assert from "node:assert/strict";
import { COLLECTIONS } from "../../collections.js";
import { TOOLS } from "../../tools-data.js";
import { checkCollections, proposedTileIds } from "../../scripts/check-collections.mjs";
import { collectionShell, landedCollections } from "../../scripts/build-shells.mjs";

const live = new Set(TOOLS.map((t) => t.id));

test("check-collections passes the shipped collections", async () => {
  const planned = await proposedTileIds();
  assert.deepStrictEqual(checkCollections(COLLECTIONS, live, planned), []);
});

test("check-collections fails a misspelled id, a duplicate, and an empty section (seeded)", () => {
  const seeded = [{
    slug: "seeded",
    title: "Seeded",
    sections: [
      { heading: "One", ids: ["ohms-law", "ohms-lwa", "ohms-law"] },
      { heading: "Two", ids: [] },
    ],
  }];
  const errors = checkCollections(seeded, live, new Set());
  assert.ok(errors.some((e) => e.includes('"ohms-lwa" is neither')));
  assert.ok(errors.some((e) => e.includes('"ohms-law" is listed twice')));
  assert.ok(errors.some((e) => e.includes('section "Two" is empty')));
});

test("a planned id passes the gate but is omitted from the page", () => {
  const c = { slug: "t", title: "T", lead: "L", sections: [{ heading: "S", ids: ["ohms-law", "not-landed-yet", "voltage-drop"] }] };
  assert.deepStrictEqual(checkCollections([c], live, new Set(["not-landed-yet"])), []);
  const [{ landed, omitted }] = landedCollections([c], TOOLS);
  assert.deepStrictEqual(landed, ["ohms-law", "voltage-drop"]);
  assert.deepStrictEqual(omitted, ["not-landed-yet"]);
  const html = collectionShell(c, TOOLS, {});
  assert.ok(!html.includes("not-landed-yet"));
});

test("the disaster-response page lists exactly the landed subset, in order, with each tile's group", () => {
  const c = COLLECTIONS.find((x) => x.slug === "disaster-response");
  const names = { A: "Electrical", M: "Water" };
  const html = collectionShell(c, TOOLS, names);
  const linked = [...html.matchAll(/<li><a href="\.\.\/\.\.\/tools\/([a-z0-9-]+)\/">[^<]*<\/a> <span class="shell-group-tag">([^<]*)<\/span>/g)];
  const expected = c.sections.flatMap((s) => s.ids).filter((id) => live.has(id));
  assert.deepStrictEqual(linked.map((m) => m[1]), expected);
  const byId = new Map(TOOLS.map((t) => [t.id, t]));
  for (const [, id, label] of linked) {
    const g = byId.get(id).group;
    assert.strictEqual(label, names[g] || "Group " + g);
  }
  assert.ok(html.includes('<body class="shell-page">'));
});
