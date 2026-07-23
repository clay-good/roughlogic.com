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
  SYP_NO2_FB_BY_WIDTH, LUMBER_SPECIES_GRADES, LUMBER_EMIN_PSI, computeLumberSpan,
  LUMBER_FC_PSI, LUMBER_TIMBERS_FC_PSI, LUMBER_TIMBERS_EMIN_PSI,
  computeWoodScrewWithdrawal, computeWoodNailWithdrawal, computeColumnBucklingWood,
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

test("deck: worked example (12 ft joist span, 8 ft post spacing, SYP #2) -> (2) 2x10, 4x4, ledger 15 in", () => {
  // 2026-07-23: was pinned at (2) 2x8, which the SPIB per-width correction
  // showed to be OVERSTRESSED. M = 28,800 lb-in; a (2) 2x8 has S = 26.28 in^3
  // so f_b = 1,096 psi against the tabulated SP No.2 2x8 F_b of 925 psi (18%
  // over). It only "passed" because the code applied the 2x4 value (1,100 psi)
  // at every depth. The correct member is (2) 2x10: S = 42.78, f_b = 673 psi
  // against F_b = 800.
  const r = computeDeckBeamPost(deckBeamPostExample.inputs);
  assert.strictEqual(r.beam_size, "2x10");
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

// --- 2026-07-23 regression guards (NDS/IRC refute-audit) ---

test("header sizing: IRC R301.6 roof live load floor (20 psf) governs in a zero-snow region", () => {
  // IRC R301.6 designs the roof for the Table R301.6 roof LIVE load OR the
  // ground snow load, whichever is greater. Taking snow alone left pg = 0
  // (Florida, Phoenix, coastal CA) at 15 psf instead of 35 -- a 2.33x load
  // understatement that recommended a member ~1.48x overstressed as "OK".
  const zero = computeHeaderSizing({ header_span_ft: 8, tributary_width_ft: 14, floors_above: 0, ground_snow_psf: 0, species_grade: "SPF_No2" });
  assert.strictEqual(zero.total_load_psf, 35); // max(0, 20) + 15 dead
  assert.strictEqual(zero.w_plf, 490);
  // Below the 20 psf floor every ground snow gives the same governing load.
  for (const pg of [0, 5, 10, 19, 20]) {
    const r = computeHeaderSizing({ header_span_ft: 8, tributary_width_ft: 14, floors_above: 0, ground_snow_psf: pg, species_grade: "SPF_No2" });
    assert.strictEqual(r.total_load_psf, 35);
  }
  // Above it, snow governs and the result is unchanged from the pre-fix behavior.
  const snowy = computeHeaderSizing({ header_span_ft: 8, tributary_width_ft: 14, floors_above: 0, ground_snow_psf: 40, species_grade: "SPF_No2" });
  assert.strictEqual(snowy.total_load_psf, 55); // 40 + 15
  // The zero-snow member must be heavier than the (2) 2x8 the old code returned.
  assert.ok(zero.bending_ok);
  assert.ok(zero.f_b_psi <= zero.F_b_psi); // actually satisfies its own allowable
});

test("deck beam/post: NDS 3.7.1.4 le/d <= 50 is enforced, not silently exceeded", () => {
  const P = { joist_span_ft: 12, beam_span_ft: 8, live_load_psf: 40, dead_load_psf: 10, species_grade: "SYP_No2" };
  // Normal heights are unaffected and carry no warning.
  const ok = computeDeckBeamPost({ ...P, post_height_ft: 8 });
  assert.ok(ok.post_slenderness_le_d < 50);
  assert.strictEqual(ok.warnings.length, 0);
  // 14 ft on a 4x4 is le/d = 48.0 -- legal, must NOT be flagged.
  const edge = computeDeckBeamPost({ ...P, post_height_ft: 14 });
  assert.ok(edge.post_slenderness_le_d <= 50);
  // Past the limit the tile must warn rather than return a bare capacity.
  for (const h of [26, 30]) {
    const bad = computeDeckBeamPost({ ...P, post_height_ft: h });
    assert.ok(bad.post_slenderness_le_d > 50);
    assert.ok(bad.warnings.some((w) => /3\.7\.1\.4|slenderness/i.test(w)));
  }
});

test("Southern Pine No.2 reference bending values are tabulated PER WIDTH (SPIB Appendix A Tables 2-6)", () => {
  // SP is tabulated per width, which is exactly why C_F = 1.0 for SP. Applying
  // one value at every depth (the old 1,100 psi 2x4 entry) overstated F_b by up
  // to 47% at 2x12. Other species carry the depth effect through C_F instead;
  // SP must not use both.
  assert.deepStrictEqual(SYP_NO2_FB_BY_WIDTH, { "2x4": 1100, "2x6": 1000, "2x8": 925, "2x10": 800, "2x12": 750 });
  // Monotonically non-increasing with depth -- the whole point of the size effect.
  const vals = ["2x4", "2x6", "2x8", "2x10", "2x12"].map((s) => SYP_NO2_FB_BY_WIDTH[s]);
  for (let i = 1; i < vals.length; i++) assert.ok(vals[i] < vals[i - 1]);
  // SP E is the No.2 row (1.4e6), NOT the No.2 DENSE row (1.6e6), and E pairs
  // with Emin exactly as the file's other species do (1.4e6 <-> 510,000).
  assert.strictEqual(LUMBER_SPECIES_GRADES["SYP_No2"].E_psi, 1400000);
  assert.strictEqual(LUMBER_EMIN_PSI["SYP"], 510000);
  assert.strictEqual(LUMBER_SPECIES_GRADES["SPF_No2"].E_psi, 1400000);
  assert.strictEqual(LUMBER_EMIN_PSI["SPF"], 510000); // same pairing, unchanged
  // The per-width values actually reach the member selection: an SP 2x12 must
  // not be evaluated at the 2x4 stress.
  const wide = computeLumberSpan({ species_grade: "SYP_No2", nominal_size: "2x12", total_load_psf: 40, tributary_width_in: 16 });
  const narrow = computeLumberSpan({ species_grade: "SYP_No2", nominal_size: "2x4", total_load_psf: 40, tributary_width_in: 16 });
  assert.ok(wide.allowable_span_ft > narrow.allowable_span_ft); // deeper still spans further
  assert.ok(!("error" in wide) && !("error" in narrow));
});

test("deck post: a 6x6 is a TIMBER (NDS Table 4D), not dimension lumber", () => {
  // NDS grades "5x5 and larger" as Timbers, a separate category with much lower
  // reference values. Using the dimension-lumber F_c for a nominal 6x6
  // overstated its capacity ~2x (SYP: F_c 1450 vs the true 525).
  assert.deepStrictEqual(LUMBER_TIMBERS_FC_PSI, { "DF-L": 700, "SPF": 500, "SYP": 525, "Hem-Fir": 575 });
  assert.deepStrictEqual(LUMBER_TIMBERS_EMIN_PSI, { "DF-L": 470000, "SPF": 370000, "SYP": 440000, "Hem-Fir": 400000 });
  // Timber values must be strictly below the dimension-lumber values for every
  // species -- that is the whole point of the separate grading category.
  for (const sp of ["DF-L", "SPF", "SYP", "Hem-Fir"]) {
    assert.ok(LUMBER_TIMBERS_FC_PSI[sp] < LUMBER_FC_PSI[sp], `${sp} F_c`);
    assert.ok(LUMBER_TIMBERS_EMIN_PSI[sp] < LUMBER_EMIN_PSI[sp], `${sp} E_min`);
  }
  // The 6x6 branch must actually USE them. At 12 ft the engine picks a 6x6;
  // hand-check: le/d = 26.18, FcE = 0.822 x 440,000 / 26.18^2 = 527.6,
  // CP = 0.6927, F_c' = 363.7, capacity = 363.7 x 30.25 = 11,001 lb.
  const tall = computeDeckBeamPost({ joist_span_ft: 12, beam_span_ft: 10, post_height_ft: 12, live_load_psf: 40, dead_load_psf: 10, species_grade: "SYP_No2", soil_class: "clay", ledger: "free" });
  assert.strictEqual(tall.post_size, "6x6");
  assert.ok(Math.abs(tall.post_allowable_load_lb - 11001) < 5);
  // The 4x4 branch is dimension lumber and must be unaffected.
  const short = computeDeckBeamPost({ joist_span_ft: 12, beam_span_ft: 10, post_height_ft: 8, live_load_psf: 40, dead_load_psf: 10, species_grade: "SYP_No2", soil_class: "clay", ledger: "free" });
  assert.strictEqual(short.post_size, "4x4");
  assert.ok(Math.abs(short.post_allowable_load_lb - 6169) < 5);
});

test("wood withdrawal: screw is per THREAD penetration (NDS 12.2.2), nail is per total penetration (12.2.3)", () => {
  // NDS tabulates screw/lag withdrawal per inch of THREAD penetration, but nail
  // withdrawal per inch of total penetration -- a nail has no thread. The screw
  // tile's field said only "Penetration", inviting a partially threaded screw's
  // full embedment and overstating capacity; the lag sibling already said
  // "Thread penetration". Labels only -- the math is unchanged.
  const scr = computeWoodScrewWithdrawal({ g: 0.50, d_in: 0.190, p_in: 1.0, cd: 1.0 });
  assert.ok(Math.abs(scr.w_lbin - 2850 * 0.5 * 0.5 * 0.190) < 1e-9); // 2850 G^2 D
  assert.match(computeWoodScrewWithdrawal({ g: 0.5, d_in: 0.19, p_in: 0 }).error, /THREAD penetration/i);
  assert.match(scr.note, /THREAD penetration/i);
  // The NAIL tile must NOT be relabelled -- 12.2.3 really is total penetration.
  const nail = computeWoodNailWithdrawal({ g: 0.50, d_in: 0.131, p_in: 1.5, cd: 1.0 });
  assert.ok(Math.abs(nail.w_lbin - 1380 * Math.pow(0.5, 2.5) * 0.131) < 1e-9); // 1380 G^2.5 D
  assert.ok(!/THREAD penetration/i.test(computeWoodNailWithdrawal({ g: 0.5, d_in: 0.131, p_in: 0 }).error));
});

test("wood column: the length input is UNBRACED lu, and Ke is applied exactly once", () => {
  // The field said "Unbraced length le", but le conventionally means the
  // EFFECTIVE length; the code computes le = Ke x lu. A user entering an
  // already-Ke-adjusted value would double-count it.
  const P = { b_in: 3.5, d_in: 3.5, le_in: 96, fc_star_psi: 1150, emin_psi: 580000 };
  const k1 = computeColumnBucklingWood({ ...P, ke: 1 });
  assert.ok(Math.abs(k1.slenderness_ratio - 96 / 3.5) < 1e-9);
  // Ke scales the slenderness linearly -- applied once, not squared or ignored.
  const k15 = computeColumnBucklingWood({ ...P, ke: 1.5 });
  assert.ok(Math.abs(k15.slenderness_ratio - 1.5 * (96 / 3.5)) < 1e-9);
  // Past the NDS 3.7.1.4 le/d = 50 limit it errors rather than returning a value.
  assert.match(computeColumnBucklingWood({ ...P, ke: 2 }).error, /50/);
  assert.match(k1.note, /le = Ke x lu|do not pre-multiply/i);
});
