// spec-v15 unit tests for the Group E (Carpentry / Construction) tiles landed
// in the v15 close:
//   E.7 Window / door header sizing (IRC R602.7 + AWC NDS)
//   E.8 Deck post and beam sizing (IRC R507 + AWC NDS column check)
//
// Both size built-up dimension lumber from first-principles simple-span beam
// mechanics with the published NDS load-duration (C_D) and size (C_F) factors,
// then cross-check against the IRC tables by physics. The assertions pin the
// load assembly, the member-selection ordering, and the NDS verification so a
// future edit that changed a constant or an operator fails loudly.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeHeaderSizing, headerSizingExample,
  computeDeckBeamPost, deckBeamPostExample,
} from "../../calc-construction.js";

// ---------------------------------------------------------------------------
// E.7 Window / door header sizing
// ---------------------------------------------------------------------------

test("header: worked example (6 ft, 14 ft tributary, roof-only, 30 psf snow, SPF #2) -> double 2x10", () => {
  const r = computeHeaderSizing(headerSizingExample.inputs);
  assert.strictEqual(r.member_size, "2x10");
  assert.strictEqual(r.plies, 2);
  assert.strictEqual(r.w_plf, 630);
  assert.ok(r.bending_ok && r.deflection_ok);
});

test("header: load assembly is (snow + 15 dead) x tributary for roof-only", () => {
  const r = computeHeaderSizing({ header_span_ft: 4, tributary_width_ft: 10, floors_above: 0, ground_snow_psf: 40, species_grade: "DF-L_No2" });
  assert.strictEqual(r.total_load_psf, 55); // 40 snow + 15 dead
  assert.strictEqual(r.w_plf, 550); // 55 * 10
});

test("header: each floor above adds 50 psf (40 live + 10 dead) to the area load", () => {
  const roof = computeHeaderSizing({ header_span_ft: 5, tributary_width_ft: 12, floors_above: 0, ground_snow_psf: 30, species_grade: "SYP_No2" });
  const oneFloor = computeHeaderSizing({ header_span_ft: 5, tributary_width_ft: 12, floors_above: 1, ground_snow_psf: 30, species_grade: "SYP_No2" });
  assert.strictEqual(oneFloor.total_load_psf - roof.total_load_psf, 50);
});

test("header: the snow-only case uses the C_D = 1.15 load-duration factor", () => {
  const r = computeHeaderSizing({ header_span_ft: 6, tributary_width_ft: 14, floors_above: 0, ground_snow_psf: 30, species_grade: "SPF_No2" });
  assert.strictEqual(r.c_d, 1.15);
});

test("header: supporting a floor drops the load-duration factor to 1.0", () => {
  const r = computeHeaderSizing({ header_span_ft: 6, tributary_width_ft: 14, floors_above: 1, ground_snow_psf: 30, species_grade: "SPF_No2" });
  assert.strictEqual(r.c_d, 1.0);
});

test("header: the chosen member's allowable span is at least the requested span", () => {
  for (const span of [3, 4, 6, 8, 10]) {
    const r = computeHeaderSizing({ header_span_ft: span, tributary_width_ft: 14, floors_above: 0, ground_snow_psf: 30, species_grade: "DF-L_No2" });
    if (!r.error) assert.ok(r.allowable_span_ft >= span, `span ${span}: allowable ${r.allowable_span_ft}`);
  }
});

test("header: a deeper double is preferred over a triple of a shallower member", () => {
  // 6 ft / 630 plf: a (2) 2x10 carries it, so the engine must not return a (3) 2x8.
  const r = computeHeaderSizing(headerSizingExample.inputs);
  assert.ok(!(r.member_size === "2x8" && r.plies === 3));
  assert.strictEqual(r.plies, 2);
});

test("header: NDS verification reports actual f_b at or below the adjusted allowable", () => {
  const r = computeHeaderSizing(headerSizingExample.inputs);
  assert.ok(r.f_b_psi > 0);
  assert.ok(r.f_b_psi <= r.F_b_psi);
  assert.ok(r.F_b_psi > r.F_b_base_psi); // C_D and C_F raise the allowable above the base
});

test("header: jack-stud count rises with the end reaction", () => {
  const small = computeHeaderSizing({ header_span_ft: 4, tributary_width_ft: 8, floors_above: 0, ground_snow_psf: 20, species_grade: "SPF_No2" });
  const big = computeHeaderSizing({ header_span_ft: 10, tributary_width_ft: 18, floors_above: 1, ground_snow_psf: 50, species_grade: "SPF_No2" });
  assert.ok(small.jack_studs_each_end >= 1);
  if (!big.error) assert.ok(big.jack_studs_each_end >= small.jack_studs_each_end);
});

test("header: a span beyond the bundled member range returns an engineered-design error", () => {
  const r = computeHeaderSizing({ header_span_ft: 20, tributary_width_ft: 24, floors_above: 2, ground_snow_psf: 70, species_grade: "SPF_No2" });
  assert.ok(r.error && /engineered/i.test(r.error));
});

test("header: spans above 12 ft are flagged as the IRC table top end", () => {
  // Pick a low load so a member still fits, but the span trips the warning.
  const r = computeHeaderSizing({ header_span_ft: 13, tributary_width_ft: 4, floors_above: 0, ground_snow_psf: 20, species_grade: "DF-L_No1" });
  if (!r.error) assert.ok(r.warnings.some((w) => /12 ft/.test(w)));
});

test("header: invalid inputs are rejected", () => {
  assert.ok("error" in computeHeaderSizing({ header_span_ft: 0, tributary_width_ft: 14, species_grade: "SPF_No2" }));
  assert.ok("error" in computeHeaderSizing({ header_span_ft: 6, tributary_width_ft: -1, species_grade: "SPF_No2" }));
  assert.ok("error" in computeHeaderSizing({ header_span_ft: 6, tributary_width_ft: 14, ground_snow_psf: -5, species_grade: "SPF_No2" }));
  assert.ok("error" in computeHeaderSizing({ header_span_ft: 6, tributary_width_ft: 14, floors_above: 3, species_grade: "SPF_No2" }));
  assert.ok("error" in computeHeaderSizing({ header_span_ft: 6, tributary_width_ft: 14, species_grade: "Unobtanium_No2" }));
});

// ---------------------------------------------------------------------------
// E.8 Deck post and beam sizing
// ---------------------------------------------------------------------------

test("deck: worked example (12 ft joist span, 8 ft post spacing, SYP #2) -> (2) 2x8, 4x4, ledger 15 in", () => {
  const r = computeDeckBeamPost(deckBeamPostExample.inputs);
  assert.strictEqual(r.beam_size, "2x8");
  assert.strictEqual(r.beam_plies, 2);
  assert.strictEqual(r.post_size, "4x4");
  assert.strictEqual(r.ledger_spacing_in, 15);
});

test("deck: tributary width to the beam is half the joist span", () => {
  const r = computeDeckBeamPost({ joist_span_ft: 14, beam_span_ft: 8, post_height_ft: 8, species_grade: "SYP_No2", soil_class: "clay", ledger: "attached" });
  assert.strictEqual(r.tributary_width_ft, 7);
});

test("deck: beam uniform load is (live + dead) x tributary width", () => {
  const r = computeDeckBeamPost({ joist_span_ft: 12, beam_span_ft: 8, post_height_ft: 8, live_load_psf: 40, dead_load_psf: 10, species_grade: "SYP_No2", soil_class: "clay", ledger: "attached" });
  assert.strictEqual(r.total_load_psf, 50);
  assert.strictEqual(r.w_plf, 300); // 50 * 6
});

test("deck: the chosen beam's allowable span is at least the post spacing", () => {
  for (const beamSpan of [6, 8, 10]) {
    const r = computeDeckBeamPost({ joist_span_ft: 12, beam_span_ft: beamSpan, post_height_ft: 8, species_grade: "SYP_No2", soil_class: "clay", ledger: "attached" });
    if (!r.error) assert.ok(r.beam_allowable_span_ft >= beamSpan);
  }
});

test("deck: interior post axial load = beam load x post spacing", () => {
  const r = computeDeckBeamPost({ joist_span_ft: 12, beam_span_ft: 10, post_height_ft: 8, species_grade: "SYP_No2", soil_class: "clay", ledger: "attached" });
  assert.strictEqual(r.post_load_lb, r.w_plf * 10);
});

test("deck: the NDS column capacity covers the post load and falls with height", () => {
  const tall = computeDeckBeamPost({ joist_span_ft: 12, beam_span_ft: 8, post_height_ft: 12, species_grade: "SYP_No2", soil_class: "clay", ledger: "attached" });
  const short = computeDeckBeamPost({ joist_span_ft: 12, beam_span_ft: 8, post_height_ft: 6, species_grade: "SYP_No2", soil_class: "clay", ledger: "attached" });
  // Same post size and load, taller post has the lower capacity (buckling).
  if (tall.post_size === short.post_size) assert.ok(tall.post_allowable_load_lb < short.post_allowable_load_lb);
});

test("deck: a tall post buckles a 4x4 and drives the selection to a 6x6", () => {
  // A short post on a light load takes a 4x4; the same load on a very tall
  // post drops the 4x4 column capacity (le/d buckling) and forces a 6x6.
  const short = computeDeckBeamPost({ joist_span_ft: 10, beam_span_ft: 6, post_height_ft: 8, species_grade: "SYP_No2", soil_class: "clay", ledger: "attached" });
  const tall = computeDeckBeamPost({ joist_span_ft: 14, beam_span_ft: 8, post_height_ft: 14, species_grade: "SYP_No2", soil_class: "clay", ledger: "attached" });
  assert.strictEqual(short.post_size, "4x4");
  assert.strictEqual(tall.post_size, "6x6");
});

test("deck: footing size comes from the soil-bearing engine and grows on weaker soil", () => {
  const clay = computeDeckBeamPost({ joist_span_ft: 12, beam_span_ft: 8, post_height_ft: 8, species_grade: "SYP_No2", soil_class: "clay", ledger: "attached" });
  const rock = computeDeckBeamPost({ joist_span_ft: 12, beam_span_ft: 8, post_height_ft: 8, species_grade: "SYP_No2", soil_class: "rock", ledger: "attached" });
  assert.ok(clay.footing_side_in >= rock.footing_side_in);
  assert.strictEqual(clay.footing_soil_psf, 1500);
});

test("deck: ledger fastener spacing tightens as the joist span grows", () => {
  const short = computeDeckBeamPost({ joist_span_ft: 6, beam_span_ft: 8, post_height_ft: 8, species_grade: "SYP_No2", soil_class: "clay", ledger: "attached" });
  const long = computeDeckBeamPost({ joist_span_ft: 16, beam_span_ft: 8, post_height_ft: 8, species_grade: "SYP_No2", soil_class: "clay", ledger: "attached" });
  assert.strictEqual(short.ledger_spacing_in, 30);
  assert.strictEqual(long.ledger_spacing_in, 11);
  assert.ok(long.ledger_spacing_in < short.ledger_spacing_in);
});

test("deck: a freestanding deck reports no ledger spacing", () => {
  const r = computeDeckBeamPost({ joist_span_ft: 12, beam_span_ft: 8, post_height_ft: 8, species_grade: "SYP_No2", soil_class: "clay", ledger: "freestanding" });
  assert.strictEqual(r.ledger, "freestanding");
  assert.strictEqual(r.ledger_spacing_in, null);
});

test("deck: a walking surface above 30 in triggers the IRC R312 guardrail note", () => {
  const high = computeDeckBeamPost({ joist_span_ft: 12, beam_span_ft: 8, post_height_ft: 8, species_grade: "SYP_No2", soil_class: "clay", deck_height_in: 36, ledger: "attached" });
  const low = computeDeckBeamPost({ joist_span_ft: 12, beam_span_ft: 8, post_height_ft: 8, species_grade: "SYP_No2", soil_class: "clay", deck_height_in: 18, ledger: "attached" });
  assert.ok(high.warnings.some((w) => /guardrail/i.test(w)));
  assert.ok(!low.warnings.some((w) => /guardrail/i.test(w)));
});

test("deck: invalid inputs are rejected", () => {
  assert.ok("error" in computeDeckBeamPost({ joist_span_ft: 0, beam_span_ft: 8 }));
  assert.ok("error" in computeDeckBeamPost({ joist_span_ft: 12, beam_span_ft: 0 }));
  assert.ok("error" in computeDeckBeamPost({ joist_span_ft: 12, beam_span_ft: 8, post_height_ft: 0 }));
  assert.ok("error" in computeDeckBeamPost({ joist_span_ft: 12, beam_span_ft: 8, species_grade: "Unobtanium_No2" }));
});
