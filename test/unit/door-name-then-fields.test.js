// A question that opens with a calculator's whole published name, followed by
// that calculator's own field names and values, is answered by that
// calculator. Measured 2026-11-16 across every tile's worked example: 318 of
// 2,243 went to a sibling or to NO_MATCH before, 13 after (names and labels
// whose punctuation the rule does not read). These are a sample of the 318.
import { test } from "node:test";
import assert from "node:assert/strict";
import { answerQuery } from "../../mcp/catalog.mjs";

const CASES = [
  ["voltage-drop", "Voltage Drop Phase single, Material copper, AWG 10, Length one-way 150 ft, Current 20 a, Source voltage 240 v"],
  ["breaker-sizing", "Breaker Sizing Load current 16 a"],
  ["transformer-sizing", "Transformer Sizing Load 90 kw, Power factor 0.9, Primary voltage 480 v, Secondary voltage 208 v, Phase three"],
  ["voltage-imbalance", "Voltage Imbalance Line A voltage 480 v, Line B voltage 475 v, Line C voltage 470 v"],
  ["conduit-offset", "Conduit Offset Bend Offset depth 6 in, Bend angle 30"],
  ["pipe-volume", "Pipe Volume Length 100 ft, Nominal Sch size 1"],
];

test("a calculator named in full, then given its own fields, answers", async () => {
  for (const [id, q] of CASES) {
    const r = await answerQuery({ query: q });
    assert.equal(r.id, id, q);
  }
});

test("a word that is not the named calculator's still narrows to a sibling", async () => {
  // "hose" is not a Friction Loss field: the reader is asking for the fire-hose tile.
  assert.equal((await answerQuery({ query: "friction loss 200 ft of hose at 150 gpm" })).id, "fire-friction");
});
