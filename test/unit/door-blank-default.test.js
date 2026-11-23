// 2026-11-23: the agent door gives an unfilled box its declared default, as the
// page does. Before, every unfilled number went to the compute as null, which
// 334 calculators read as 0 -- a silent change of answer, not a refusal.
import { test } from "node:test";
import assert from "node:assert/strict";

test("door: an unfilled field with a declared default takes it; a null default stays null", async () => {
  const { inputDefaults } = await import("../../mcp/catalog.mjs");
  // A non-null default is omitted so the compute applies it...
  assert.ok((await inputDefaults("growing-degree-days")).has("base_f"));
  assert.ok((await inputDefaults("concrete")).has("waste_factor"));
  // ...and ohms-law's null defaults ("solve for this") are not.
  const ohm = await inputDefaults("ohms-law");
  for (const k of ["V", "I", "R", "P"]) assert.ok(!ohm.has(k), k);
});

test("door: a slab question answers with the page's 10% waste, not 0%", async () => {
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  const out = await answerQuery({ query: "concrete for a 10 by 10 slab 4 inches thick" });
  assert.equal(out.status, "OK");
  assert.ok(Math.abs(out.result.cubic_yards_with_waste - out.result.cubic_yards * 1.1) < 1e-9);
});

test("door: a question that is only a calculator's name gives no values", async () => {
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  const { TOOLS } = await import("../../tools-data.js");
  const name = TOOLS.find((t) => t.id === "loop-voltage-budget").name;
  assert.equal((await answerQuery({ query: name })).status, "NO_VALUES");
});

test("door: an OK answer names what it did not read and what it defaulted", async () => {
  const { answerQuery } = await import("../../mcp/catalog.mjs");
  const a = await answerQuery({ query: "electricity cost 1500 watts 8 hours a day 15 cents per kwh for 3 people" });
  assert.equal(a.status, "OK");
  assert.deepEqual(a.unread, ["3 people"]);
  assert.ok(a.defaulted.includes("days_per_year"));
  // A room by its plan and ceiling height is its volume (2026-11-23: "room 12"
  // read as a 12 cu ft room and answered 1.2 CFM).
  const n = await answerQuery({ query: "ceiling height 8 ft room 12 by 12 cfm for 6 air changes" });
  assert.equal(n.id, "nam-sizing");
  assert.ok(Math.abs(n.result.required_cfm - 115.2) < 1e-9);
});
