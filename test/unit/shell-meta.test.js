// shell-meta.js is the single implementation of the tile <title> and
// <meta name="description"> rules, shared by scripts/build-shells.mjs (which
// writes the prerendered shell) and app.js (which writes the SPA head on a
// tile route). It exists because those two surfaces built the same two strings
// independently and disagreed about the same canonical URL on most of the
// catalog: 1,396 of 1,804 titles and 1,685 of 1,804 descriptions, measured
// 2026-09-01.
//
// The caps are exercised in detail by shell-description-cap.test.js and
// shell-title-truncation.test.js. What this suite adds is the catalog-wide
// sweep -- every tile in TOOLS, not a sample -- because a rule that holds on
// twelve tiles and fails on the thirteenth is what the shells shipped for
// months.

import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS } from "../../tools-data.js";
import {
  escapeHtml,
  headForTool,
  professionNounFor,
  TITLE_CAP,
  DESCRIPTION_CAP,
  PROFESSION_NOUN,
} from "../../shell-meta.js";

test("every tile's title and description fit their caps measured after escaping", () => {
  const overTitle = [];
  const overDesc = [];
  for (const tool of TOOLS) {
    const head = headForTool(tool);
    if (escapeHtml(head.title).length > TITLE_CAP) overTitle.push(tool.id);
    if (escapeHtml(head.description).length > DESCRIPTION_CAP) overDesc.push(tool.id);
  }
  assert.deepEqual(overTitle, [], "tiles whose escaped <title> exceeds the cap");
  assert.deepEqual(overDesc, [], "tiles whose escaped meta description exceeds the cap");
});

test("every tile's title keeps the brand suffix and opens with its own name", () => {
  const bad = [];
  for (const tool of TOOLS) {
    const { title } = headForTool(tool);
    if (!title.endsWith(" - Rough Logic")) bad.push([tool.id, title]);
    // A truncated title keeps a leading run of the name; an untruncated one
    // keeps all of it. Either way the title has to start with the tile.
    else if (!tool.name.startsWith(title.slice(0, 6))) bad.push([tool.id, title]);
  }
  assert.deepEqual(bad, [], "titles that lost the brand suffix or the tile name");
});

test("every tile's description starts with the tile's own opening sentence", () => {
  const bad = [];
  for (const tool of TOOLS) {
    const { description } = headForTool(tool);
    const lead = tool.desc.trim();
    const head = lead.slice(0, Math.min(40, lead.length));
    if (!description.startsWith(head)) bad.push([tool.id, description.slice(0, 60)]);
  }
  assert.deepEqual(bad, [], "descriptions that do not lead with the tile's own words");
});

test("every tile resolves a profession noun from its own trades, not the fallback", () => {
  // "Trades" is a real noun for the `reference` trade, so the failure this
  // catches is a NEW trade slug added to tools-data.js that nobody added to
  // PROFESSION_NOUN -- which silently retitles those tiles "... - Trades ...".
  const unmapped = [];
  for (const tool of TOOLS) {
    const primary = tool.trades && tool.trades[0];
    if (!primary || !Object.prototype.hasOwnProperty.call(PROFESSION_NOUN, primary)) {
      unmapped.push([tool.id, primary]);
    }
  }
  assert.deepEqual(unmapped, [], "tiles whose primary trade has no profession noun");
});

// The other direction, and the one that actually let this sit: `realestate`
// and `edu` were in the map while every tile spelled those trades
// `real-estate` and `education`, so 64 tiles matched nothing and silently took
// the "Trades" fallback. A key no tile can reach is a key that is wrong.
test("every profession noun maps a trade slug some tile actually carries", () => {
  const live = new Set();
  for (const tool of TOOLS) for (const trade of tool.trades || []) live.add(trade);
  const dead = Object.keys(PROFESSION_NOUN).filter((k) => !live.has(k));
  assert.deepEqual(dead, [], "PROFESSION_NOUN keys no tile's trades array uses");
});

test("the profession noun comes off the FIRST trade", () => {
  assert.equal(professionNounFor({ trades: ["plumbing", "electrical"] }), "Plumbers");
  assert.equal(professionNounFor({ trades: [] }), "Trades");
  assert.equal(professionNounFor({}), "Trades");
});

test("a short tile keeps the noun and the reference tail", () => {
  const head = headForTool({ name: "Ohm's Law", trades: ["electrical"], desc: "Compute V, I, R, or P from any two known values." });
  assert.equal(head.title, "Ohm's Law - Electricians - Rough Logic");
  assert.equal(
    head.description,
    "Compute V, I, R, or P from any two known values. Client-side, ad-free, account-free reference for electricians.",
  );
});

test("the profession noun is the first thing dropped when the title overflows", () => {
  const name = "A Tile Name Long Enough To Crowd Out The Profession Noun";
  const head = headForTool({ name, trades: ["electrical"], desc: "Compute something." });
  assert.equal(head.title, name + " - Rough Logic");
  assert.ok(escapeHtml(head.title).length <= TITLE_CAP);
});

test("a description too long for the pair drops the tail rather than clipping the sentence", () => {
  const desc = "Compute " + "a".repeat(150) + " from the inputs.";
  const head = headForTool({ name: "T", trades: ["electrical"], desc });
  assert.equal(head.description, desc, "the whole sentence survives; only the tail goes");
  assert.ok(!head.description.includes("Client-side"));
});
