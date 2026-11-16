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

// The first words of a name several siblings share ("Service Load" opens three)
// go to the one sibling whose own fields account for every other word.
test("a shared short name goes to the sibling whose fields the question gives", async () => {
  assert.equal((await answerQuery({ query: "Service Load Conditioned area 2000 ft2, Small-appliance circuits 2, Laundry circuits 1" })).id, "service-load");
  assert.equal((await answerQuery({ query: "Ceiling Speaker Ceiling height 10 ft, Listener ear height 4 ft, Target coverage diameter / spacing 8 ft" })).id, "ceiling-speaker-coverage-angle");
});

test("a word that is not the named calculator's still narrows to a sibling", async () => {
  // "hose" is not a Friction Loss field: the reader is asking for the fire-hose tile.
  assert.equal((await answerQuery({ query: "friction loss 200 ft of hose at 150 gpm" })).id, "fire-friction");
});

// 2026-11-16: a calculator that runs and refuses is not an answer.
test("answer_query never says OK while the calculator refused", async () => {
  const r = await answerQuery({ query: "ansi z21 400 ppm" });
  assert.notEqual(r.status, "OK");
  assert.equal(r.status, "MISSING_INPUTS");
  // Either named before running (the door's own required flag) or relayed
  // from the calculator's refusal: the O2 reading is what it lacks.
  assert.ok(/O2/.test(r.error || "") || r.missing.some((m) => /O2/.test(m.label)), JSON.stringify(r));
});

// 2026-11-16: a mode the question chose is tried before naming "required" fields
// that only the default mode reads.
test("a question that picks a mode is answered in that mode", async () => {
  const r = await answerQuery({ query: "pipe size for 10 gpm" });
  assert.equal(r.id, "pipe-velocity");
  assert.equal(r.status, "OK");
  assert.equal(r.inputs.mode, "size-for-flow");
  assert.equal(r.result.nominal_size_in, 1);
  const hp = await answerQuery({ query: "horsepower from torque 400 ft-lb at 5000 rpm" });
  assert.equal(hp.status, "OK");
  assert.ok(Math.abs(hp.result.hp - 380.8) < 0.1);
});

// 2026-11-16: the door's own required flag (`n`): a field that takes its
// declared default when the door sends null is not asked for.
test("the door answers with a field's default instead of asking for it", async () => {
  const r = await answerQuery({ query: "btu per hour 400 cfm 20 degree delta t" });
  assert.equal(r.id, "sensible-heat-airflow");
  assert.equal(r.status, "OK");
  assert.equal(r.result.q_btuh, 8640);
  const s = await answerQuery({ query: "how many studs for a 40 ft wall 16 on center" });
  assert.equal(s.status, "OK");
  assert.equal(s.result.field_studs, 31);
});
