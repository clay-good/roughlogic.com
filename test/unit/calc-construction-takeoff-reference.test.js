// Independent reference checks for the construction takeoff and snow-load
// tiles in calc-construction.js, against references the specs did not write.
// The worked-example fixture recomputes each spec's own example, so a spec and
// its tile that share an error agree with each other; these tests hold the
// tiles to published table values, to counted small cases, and to conservation
// and scaling identities derived another way.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDrainageBoardTakeoff,
  computeRoofBallastWeight,
  computeFoundationWaterproofingTakeoff,
  computeConcreteSawcutFootage,
  computeJoistHangerCount,
  computeGlassVacuumLift,
  computePolymericSandBags,
  computeRigidFoamBoardCount,
  computeRoofInsulationFasteners,
  computeHousewrapRolls,
  computeChainLinkFenceTakeoff,
  computeCurbGutterVolume,
  computeRebarChairCount,
  computeReadyMixConcreteOrder,
  computeInsulationBattCoverage,
  computeIntermittentFilletWeld,
  computeRainOnSnowSurcharge,
  computeMinimumRoofSnow,
} from "../../calc-construction.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};

// ---- drainage-board-takeoff: the rolls bought must cover the wall, and only just ----

test("drainage board: the rolls bought cover the wall plus waste, and one roll fewer would not", () => {
  const cases = [
    { perimeter_ft: 150, below_grade_height_ft: 8, roll_width_ft: 4, roll_length_ft: 50, waste_pct: 10 },
    { perimeter_ft: 212, below_grade_height_ft: 9.5, roll_width_ft: 6.5, roll_length_ft: 65.6, waste_pct: 0 },
    { perimeter_ft: 40, below_grade_height_ft: 3, roll_width_ft: 4, roll_length_ft: 50, waste_pct: 25 },
  ];
  for (const c of cases) {
    const r = computeDrainageBoardTakeoff(c);
    const need = c.perimeter_ft * c.below_grade_height_ft * (1 + c.waste_pct / 100);
    const cover = c.roll_width_ft * c.roll_length_ft;
    assert.ok(r.rolls * cover >= need - 1e-6, `rolls cover the need: ${r.rolls} x ${cover} vs ${need}`);
    assert.ok((r.rolls - 1) * cover < need + 1e-6, `no spare roll: ${r.rolls - 1} x ${cover} vs ${need}`);
    assert.ok(Number.isInteger(r.rolls));
  }
});

test("drainage board: a wall that divides evenly into rolls takes exactly that many -- counted by hand", () => {
  // 100 ft of wall 8 ft below grade is 800 sf; a 4 ft x 50 ft roll is 200 sf,
  // so four rolls with no waste, and the termination bar is the perimeter.
  const r = computeDrainageBoardTakeoff({ perimeter_ft: 100, below_grade_height_ft: 8, roll_width_ft: 4, roll_length_ft: 50, waste_pct: 0 });
  within(r.wall_area_sf, 800, 1e-9, "wall area");
  assert.equal(r.rolls, 4);
  within(r.termination_lf, 100, 1e-9, "top-edge termination bar runs the perimeter");
});

// ---- roof-ballast-weight: the ordered stone must weigh what the roof carries ----

test("roof ballast: the ordered volume at the stated bulk density weighs the stated total -- mass balance", () => {
  for (const c of [
    { roof_area_sqft: 5000, ballast_psf: 12, stone_density_pcf: 100 },
    { roof_area_sqft: 18250, ballast_psf: 15.5, stone_density_pcf: 92 },
    { roof_area_sqft: 640, ballast_psf: 10, stone_density_pcf: 105 },
  ]) {
    const r = computeRoofBallastWeight(c);
    within(r.volume_cy * 27 * c.stone_density_pcf, r.total_ballast_lb, 1e-9, "volume x density = weight");
    within(r.total_tons * 2000, r.total_ballast_lb, 1e-9, "a short ton is 2,000 lb");
    // Depth is the same stone read as a thickness: volume / area, in inches.
    within(r.stone_depth_in, r.volume_cy * 27 / c.roof_area_sqft * 12, 1e-9, "depth from volume over area");
  }
});

test("roof ballast: the SPRI RP-4 nominal minimum of 1,000 lb per square is 10 psf", () => {
  // A roofing "square" is 100 sf; the RP-4 minimum ballast of ~10 psf of #4
  // washed gravel is the familiar 1,000 lb per square. Checked at one square.
  const r = computeRoofBallastWeight({ roof_area_sqft: 100, ballast_psf: 10, stone_density_pcf: 100 });
  within(r.total_ballast_lb, 1000, 1e-9, "one square at the RP-4 minimum");
  // 1,000 lb of 100 pcf stone is 10 ft^3 over 100 sf = 0.1 ft = 1.2 in deep.
  within(r.stone_depth_in, 1.2, 1e-9, "depth of the minimum layer");
});

// ---- foundation-waterproofing-takeoff: coats are a multiplier, pails hold five ----

test("foundation waterproofing: a job that divides evenly needs exactly the counted gallons and pails", () => {
  // 100 ft perimeter x 4 ft below grade = 400 sf; two coats at 100 sf/gal per
  // coat with no waste is 800 sf of coverage = 8 gal = 2 five-gallon pails.
  const r = computeFoundationWaterproofingTakeoff({ perimeter_ft: 100, below_grade_height_ft: 4, coverage_sf_per_gal: 100, waste_pct: 0, coats: 2 });
  within(r.wall_area_sf, 400, 1e-9, "wall area");
  assert.equal(r.gallons, 8);
  assert.equal(r.pails_5gal, 2);
});

test("foundation waterproofing: the coverage rate is per coat, so two coats take twice the product", () => {
  const base = { perimeter_ft: 200, below_grade_height_ft: 5, coverage_sf_per_gal: 50, waste_pct: 0 };
  const one = computeFoundationWaterproofingTakeoff({ ...base, coats: 1 });
  const two = computeFoundationWaterproofingTakeoff({ ...base, coats: 3 });
  within(two.gallons, 3 * one.gallons, 1e-9, "gallons scale with the coat count");
  // W.R. Meadows Sealmastic brush grade: ~45 sf/gal per coat, two coats on a
  // 1,000 sf wall is 1,000 x 2 / 45 = 44.4 -> 45 gal (9 pails).
  const meadows = computeFoundationWaterproofingTakeoff({ perimeter_ft: 125, below_grade_height_ft: 8, coverage_sf_per_gal: 45, waste_pct: 0, coats: 2 });
  assert.equal(meadows.wall_area_sf, 1000);
  assert.equal(meadows.gallons, 45);
  assert.equal(meadows.pails_5gal, 9);
});

// ---- concrete-sawcut-footage: the cut length counted joint by joint ----

test("concrete saw cut: a 60 x 40 slab on 12 ft joints takes 20 panels and 340 LF -- counted joint by joint", () => {
  // 60 / 12 = 5 panels along the length, so 4 cuts run across the 40 ft width
  // = 160 LF. 40 / 12 = 3.33 -> 4 panels across, so 3 cuts run the 60 ft
  // length = 180 LF. 160 + 180 = 340 LF, in a 5 x 4 = 20 panel grid.
  const r = computeConcreteSawcutFootage({ length_ft: 60, width_ft: 40, spacing_ft: 12 });
  assert.equal(r.panels_l, 5);
  assert.equal(r.panels_w, 4);
  assert.equal(r.panels, 20);
  within(r.joint_lf, 340, 1e-9, "saw-cut footage");
});

test("concrete saw cut: no panel is longer than the joint spacing, and one panel each way takes no cut", () => {
  for (const c of [
    { length_ft: 60, width_ft: 40, spacing_ft: 12 },
    { length_ft: 101, width_ft: 37, spacing_ft: 14 },
    { length_ft: 12.5, width_ft: 12.5, spacing_ft: 12 },
  ]) {
    const r = computeConcreteSawcutFootage(c);
    assert.ok(c.length_ft / r.panels_l <= c.spacing_ft + 1e-9, "panel length within the spacing");
    assert.ok(c.width_ft / r.panels_w <= c.spacing_ft + 1e-9, "panel width within the spacing");
  }
  // A slab no bigger than one panel each way is poured without a joint.
  const small = computeConcreteSawcutFootage({ length_ft: 10, width_ft: 9, spacing_ft: 12 });
  assert.equal(small.panels, 1);
  within(small.joint_lf, 0, 1e-9, "a single panel takes no saw cut");
});

// ---- joist-hanger-count: the fencepost count, listed out ----

test("joist hangers: joists are the fencepost count floor(span/spacing)+1 -- small runs listed out", () => {
  // 4 ft at 16 in o.c.: joists at 0, 16, 32, 48 in = 4 joists (3 bays + 1).
  assert.equal(computeJoistHangerCount({ run_width_ft: 4, spacing_in: 16 }).joists, 4);
  // 8 ft at 24 in o.c.: 0, 24, 48, 72, 96 in = 5 joists.
  assert.equal(computeJoistHangerCount({ run_width_ft: 8, spacing_in: 24 }).joists, 5);
  // 16 ft at 16 in o.c.: 192 / 16 = 12 bays = 13 joists.
  assert.equal(computeJoistHangerCount({ run_width_ft: 16, spacing_in: 16 }).joists, 13);
  // A run that does not divide evenly still gets an end joist: 17 ft at 16 in
  // puts joists at 0..192 in (13) plus one at the 204 in end = 14.
  assert.equal(computeJoistHangerCount({ run_width_ft: 17, spacing_in: 16 }).joists, 14);
});

test("joist hangers: one hanger per hung end and one nail per hanger hole -- a top-bearing end takes none", () => {
  const two = computeJoistHangerCount({ run_width_ft: 16, spacing_in: 16, ends_per_joist: 2, nails_per_hanger: 10 });
  const one = computeJoistHangerCount({ run_width_ft: 16, spacing_in: 16, ends_per_joist: 1, nails_per_hanger: 10 });
  assert.equal(two.hangers, 2 * one.hangers, "hanging both ends doubles the hangers");
  assert.equal(two.hanger_nails, two.hangers * 10, "every hanger hole is filled");
  const none = computeJoistHangerCount({ run_width_ft: 16, spacing_in: 16, ends_per_joist: 0, nails_per_hanger: 10 });
  assert.equal(none.hangers, 0);
  assert.equal(none.hanger_nails, 0);
});

// ---- glass-vacuum-lift: the published weight of soda-lime glass ----

test("glass lift: the default density matches soda-lime glass -- 1/4 in clear weighs about 3.27 psf", () => {
  // Soda-lime float glass is ~2,500 kg/m^3 = 156.1 pcf, i.e. 13.0 lb/ft^2 per
  // inch of thickness; the glazing tables list 1/4 in clear at 3.27 psf and
  // 1/2 in at 6.54 psf.
  within(computeGlassVacuumLift({ area_sf: 1, glass_thickness_in: 0.25 }).weight_lb, 3.27, 1.5, "1/4 in clear, per ft^2");
  within(computeGlassVacuumLift({ area_sf: 1, glass_thickness_in: 0.5 }).weight_lb, 6.54, 1.5, "1/2 in clear, per ft^2");
  // An insulated unit of two 1/4 in lites weighs the same as one 1/2 in lite.
  within(
    computeGlassVacuumLift({ area_sf: 40, glass_thickness_in: 0.5 }).weight_lb,
    2 * computeGlassVacuumLift({ area_sf: 40, glass_thickness_in: 0.25 }).weight_lb,
    1e-9, "an IGU sums its lites",
  );
});

test("glass lift: the cups bought hold the factored weight, and a rated cup at factor 1 needs a quarter as many", () => {
  const c = { area_sf: 32, glass_thickness_in: 0.5, cup_wll_lb: 150, glass_density_psf_in: 13.0 };
  const r = computeGlassVacuumLift({ ...c, safety_factor: 4 });
  // 32 sf x 0.5 in x 13 psf/in = 208 lb; 4 x 208 = 832 lb / 150 = 5.55 -> 6.
  within(r.weight_lb, 208, 1e-9, "glass weight");
  assert.equal(r.cups, 6);
  assert.ok(r.cups * c.cup_wll_lb >= 4 * r.weight_lb - 1e-9, "the cups carry the factored load");
  // Wood's Powr-Grip rates a 9 in cup at 150 lb WITH its 3:1 design factor
  // already in; entered at factor 1 the same lite needs 2 cups, not 6.
  assert.equal(computeGlassVacuumLift({ ...c, safety_factor: 1 }).cups, 2);
});

// ---- polymeric-sand-bags / rigid-foam-board-count: bracketed bag and board counts ----

test("polymeric sand: an area that divides evenly buys exactly that many bags, and the count brackets the need", () => {
  // 750 sf at the 75 sf/bag chart rate with no waste is 10 bags, not 11.
  assert.equal(computePolymericSandBags({ area_sf: 750, coverage_per_bag_sf: 75, waste_pct: 0 }).bags, 10);
  for (const c of [
    { area_sf: 400, coverage_per_bag_sf: 75, waste_pct: 5 },
    { area_sf: 1234, coverage_per_bag_sf: 36, waste_pct: 12.5 },
    { area_sf: 61, coverage_per_bag_sf: 110, waste_pct: 0 },
  ]) {
    const r = computePolymericSandBags(c);
    const need = c.area_sf * (1 + c.waste_pct / 100);
    assert.ok(r.bags * c.coverage_per_bag_sf >= need - 1e-6, "the bags cover the joints");
    assert.ok((r.bags - 1) * c.coverage_per_bag_sf < need + 1e-6, "no spare bag");
  }
});

test("rigid foam: a 4 x 8 sheet is 32 sf, so 1,600 sf takes 50 boards a layer and layers multiply", () => {
  const one = computeRigidFoamBoardCount({ area_sf: 1600, board_area_sf: 32, layers: 1, waste_pct: 0 });
  assert.equal(one.boards_per_layer, 50);
  assert.equal(one.boards, 50);
  const three = computeRigidFoamBoardCount({ area_sf: 1600, board_area_sf: 32, layers: 3, waste_pct: 0 });
  assert.equal(three.boards, 150, "three offset layers take three times the boards");
  // The boards bought cover the wall plus waste, and one fewer would not.
  const w = computeRigidFoamBoardCount({ area_sf: 2175, board_area_sf: 32, layers: 1, waste_pct: 8 });
  const need = 2175 * 1.08;
  assert.ok(w.boards_per_layer * 32 >= need - 1e-6, "covers");
  assert.ok((w.boards_per_layer - 1) * 32 < need + 1e-6, "no spare board");
});

// ---- roof-insulation-fasteners: the zones add, and one plate rides each fastener ----

test("roof insulation fasteners: the three zones superpose, and the plate count equals the fastener count", () => {
  const full = { field_boards: 100, field_per_board: 8, perimeter_boards: 20, perimeter_per_board: 12, corner_boards: 5, corner_per_board: 16 };
  const zero = { field_boards: 0, field_per_board: 0, perimeter_boards: 0, perimeter_per_board: 0, corner_boards: 0, corner_per_board: 0 };
  const field = computeRoofInsulationFasteners({ ...zero, field_boards: 100, field_per_board: 8 });
  const perim = computeRoofInsulationFasteners({ ...zero, perimeter_boards: 20, perimeter_per_board: 12 });
  const corner = computeRoofInsulationFasteners({ ...zero, corner_boards: 5, corner_per_board: 16 });
  const r = computeRoofInsulationFasteners(full);
  assert.equal(field.fasteners + perim.fasteners + corner.fasteners, r.fasteners, "the zones add");
  // Counted by hand: 800 + 240 + 80 = 1,120.
  assert.equal(r.fasteners, 1120);
  assert.equal(r.plates, r.fasteners, "mechanically attached board takes one plate per fastener");
});

// ---- housewrap-rolls: the roll geometry and the fastener grid ----

test("housewrap: a 9 ft x 150 ft roll is the 1,350 sf default, and the tape run is the wrap length", () => {
  // The common WRB roll is 9 ft x 150 ft = 1,350 sf. A 4,000 sf wall wrapped
  // in 9 ft courses runs 4,000 / 9 = 444.4 ft of course, which is the upper
  // bound on horizontal seam tape.
  const r = computeHousewrapRolls({ wall_area_sf: 4000, roll_coverage_sf: 9 * 150, overlap_waste_pct: 0, fasteners_per_sf: 0.5, roll_width_ft: 9 });
  within(r.seam_tape_lf, 4000 / 9, 1e-9, "course run");
  within(r.rolls * 9 * 150, 4050, 1e-9, "three rolls cover 4,000 sf");
  assert.equal(r.rolls, 3);
  // 2,700 sf is exactly two rolls with no overlap allowance.
  assert.equal(computeHousewrapRolls({ wall_area_sf: 2700, roll_coverage_sf: 1350, overlap_waste_pct: 0, fasteners_per_sf: 0.5, roll_width_ft: 9 }).rolls, 2);
});

test("housewrap: a 16 x 16 in cap-fastener grid is about 0.56 per ft^2 and the count follows the area", () => {
  // One fastener per 16 x 16 in = 1.778 ft^2 is 0.5625 per ft^2; on 1,600 sf
  // that is 900 cap nails, counted from the grid rather than the formula.
  const r = computeHousewrapRolls({ wall_area_sf: 1600, roll_coverage_sf: 1350, overlap_waste_pct: 10, fasteners_per_sf: 144 / (16 * 16), roll_width_ft: 9 });
  assert.equal(r.cap_fasteners, 900);
});

// ---- chain-link-fence-takeoff: posts by the fencepost rule, bands from the catalog ----

test("chain link: a closed loop takes one post per bay, an open run one more -- counted", () => {
  // A 200 ft closed loop on 10 ft centers has 20 bays and 20 posts (the last
  // bay closes onto the first post). The same 200 ft as an open run with two
  // end posts stands 21.
  assert.equal(computeChainLinkFenceTakeoff({ perimeter_ft: 200, height_ft: 4, corners: 4, line_post_spacing_ft: 10 }).total_posts, 20);
  assert.equal(computeChainLinkFenceTakeoff({ perimeter_ft: 200, height_ft: 4, corners: 0, end_posts: 2, line_post_spacing_ft: 10 }).total_posts, 21);
  // Posts never fall below the terminals they must include.
  const stub = computeChainLinkFenceTakeoff({ perimeter_ft: 25, height_ft: 4, corners: 4, line_post_spacing_ft: 10 });
  assert.ok(stub.total_posts >= stub.terminals, "no terminal is missing a post");
  assert.ok(stub.line_posts >= 0, "line posts cannot be negative");
});

test("chain link: tension bands follow the Master Halco rule -- 3 on a 42 in fence, a corner taking two sets", () => {
  // Master Halco: one band per foot of fabric height less one, so a 42 in
  // (3.5 ft) fence takes 3 bands per terminal set and a 6 ft fence takes 5.
  const h42 = computeChainLinkFenceTakeoff({ perimeter_ft: 100, height_ft: 3.5, corners: 1, line_post_spacing_ft: 10 });
  assert.equal(h42.tension_bands, 2 * 3, "one corner is two sets of 3");
  const h6 = computeChainLinkFenceTakeoff({ perimeter_ft: 100, height_ft: 6, corners: 0, end_posts: 1, line_post_spacing_ft: 10 });
  assert.equal(h6.tension_bands, 5, "an end post is one set of 5");
  // A corner ties fabric from two sides, an end post from one.
  const corner = computeChainLinkFenceTakeoff({ perimeter_ft: 100, height_ft: 4, corners: 1, line_post_spacing_ft: 10 });
  const end = computeChainLinkFenceTakeoff({ perimeter_ft: 100, height_ft: 4, corners: 0, end_posts: 1, line_post_spacing_ft: 10 });
  assert.equal(corner.tension_bands, 2 * end.tension_bands);
});

test("chain link: gate openings come out of the fabric and add two jamb posts", () => {
  const noGate = computeChainLinkFenceTakeoff({ perimeter_ft: 200, height_ft: 4, gate_width_ft: 0, corners: 4, line_post_spacing_ft: 10 });
  const gate = computeChainLinkFenceTakeoff({ perimeter_ft: 200, height_ft: 4, gate_width_ft: 12, corners: 4, line_post_spacing_ft: 10 });
  within(gate.fabric_lf, noGate.fabric_lf - 12, 1e-9, "the opening is not fabric");
  within(gate.rail_wire_lf, gate.fabric_lf, 1e-9, "top rail and tension wire follow the fabric");
  assert.equal(gate.terminals, noGate.terminals + 2, "two gate jambs");
});

// ---- curb-gutter-volume: the cubic-yard conversion, checked against a counted section ----

test("curb and gutter: 27 ft^3 to the yard -- a 2.7 ft^2 section is exactly 10 cy per 100 LF", () => {
  const r = computeCurbGutterVolume({ cross_section_ft2: 2.7, length_ft: 100, waste_pct: 0 });
  within(r.cy_per_100lf, 10, 1e-9, "ordering rate");
  within(r.volume_cy, 10, 1e-9, "100 LF at the rate");
  // A standard 6 in curb x 18 in high over a 24 in x 6 in gutter pan is
  // (0.5 x 1.5) + (2.0 x 0.5) = 1.75 ft^2; 300 ft of it is 525 ft^3 = 19.44 cy.
  within(computeCurbGutterVolume({ cross_section_ft2: 1.75, length_ft: 300, waste_pct: 0 }).volume_cy, 525 / 27, 1e-9, "counted section");
});

test("curb and gutter: the rate times the length times the waste is the order, and waste only adds", () => {
  for (const c of [
    { cross_section_ft2: 2.0, length_ft: 300, waste_pct: 8 },
    { cross_section_ft2: 1.33, length_ft: 1250, waste_pct: 0 },
    { cross_section_ft2: 3.4, length_ft: 75, waste_pct: 15 },
  ]) {
    const r = computeCurbGutterVolume(c);
    within(r.volume_cy, r.cy_per_100lf * (c.length_ft / 100) * (1 + c.waste_pct / 100), 1e-9, "rate x stations x waste");
    const clean = computeCurbGutterVolume({ ...c, waste_pct: 0 });
    assert.ok(r.volume_cy >= clean.volume_cy - 1e-12, "waste never reduces the order");
  }
});

// ---- rebar-chair-count: the grid density ----

test("rebar chairs: the spacing enters squared -- halving it quadruples the chairs", () => {
  const four = computeRebarChairCount({ slab_area_sf: 1600, support_spacing_ft: 4, waste_pct: 0 });
  const two = computeRebarChairCount({ slab_area_sf: 1600, support_spacing_ft: 2, waste_pct: 0 });
  // 1,600 sf on a 4 ft grid is 100 chairs; on a 2 ft grid, 400.
  assert.equal(four.chairs, 100);
  assert.equal(two.chairs, 400);
  within(two.raw_chairs / four.raw_chairs, 4, 1e-9, "inverse-square in the spacing");
});

test("rebar chairs: the count is the tributary-area rule, one chair per spacing square", () => {
  // SUSPECTED DEFECT (reported, not asserted as wrong): this is the CRSI
  // estimating rule area / spacing^2, which is a tributary-area count and sits
  // below a laid-out grid of (ceil(L/s)+1)^2 supports on a small slab -- a
  // 40 x 40 ft slab on 4 ft centers lays out 11 x 11 = 121 chairs against the
  // 100 below. The tile states the rule it uses; current behavior pinned here.
  const r = computeRebarChairCount({ slab_area_sf: 1600, support_spacing_ft: 4, waste_pct: 0 });
  assert.equal(r.chairs, 100);
  // Waste is an addition on top of the grid count, rounded up to a whole chair.
  const w = computeRebarChairCount({ slab_area_sf: 1000, support_spacing_ft: 4, waste_pct: 5 });
  within(w.raw_chairs, 1000 / 16 * 1.05, 1e-9, "raw count before rounding");
  assert.equal(w.chairs, Math.ceil(w.raw_chairs - 1e-9));
  assert.ok(w.chairs >= computeRebarChairCount({ slab_area_sf: 1000, support_spacing_ft: 4, waste_pct: 0 }).chairs);
});

// ---- ready-mix-concrete-order: the loads must add back up to the order ----

test("ready mix: the truckloads close -- full loads plus the last load equal the order", () => {
  for (const c of [
    { volume_yd3: 42, waste_pct: 8, load_yd3: 10, min_yd3: 10 },
    { volume_yd3: 7.3, waste_pct: 0, load_yd3: 9, min_yd3: 10 },
    { volume_yd3: 120, waste_pct: 5, load_yd3: 8, min_yd3: 10 },
    { volume_yd3: 40, waste_pct: 0, load_yd3: 10, min_yd3: 10 },
  ]) {
    const r = computeReadyMixConcreteOrder(c);
    within((r.trucks - 1) * c.load_yd3 + r.last_load_yd3, r.ordered_yd3, 1e-9, "the loads sum to the order");
    assert.ok(r.last_load_yd3 > 0 && r.last_load_yd3 <= c.load_yd3 + 1e-9, `last load in range: ${r.last_load_yd3}`);
    assert.ok(r.trucks * c.load_yd3 >= r.ordered_yd3 - 1e-9, "the trucks carry the order");
  }
});

test("ready mix: an exactly divisible order takes no extra truck, and the short-load flag follows the plant minimum", () => {
  // 40 yd^3 with no waste is 4 full 10 yd^3 loads, not 5.
  const even = computeReadyMixConcreteOrder({ volume_yd3: 40, waste_pct: 0, load_yd3: 10, min_yd3: 10 });
  assert.equal(even.trucks, 4);
  within(even.last_load_yd3, 10, 1e-9, "the last load is full");
  assert.equal(even.short_load, false, "an order at the minimum is not short");
  // 9 yd^3 plus 8% is 9.72, below a 10 yd^3 plant minimum: short-load fee.
  const short = computeReadyMixConcreteOrder({ volume_yd3: 9, waste_pct: 8, load_yd3: 10, min_yd3: 10 });
  assert.equal(short.short_load, true);
  // Price is linear in the ordered volume, so doubling the pour doubles it.
  const p1 = computeReadyMixConcreteOrder({ volume_yd3: 20, waste_pct: 8, load_yd3: 10, min_yd3: 10, price_per_yd3: 185 });
  const p2 = computeReadyMixConcreteOrder({ volume_yd3: 40, waste_pct: 8, load_yd3: 10, min_yd3: 10, price_per_yd3: 185 });
  within(p2.cost_usd, 2 * p1.cost_usd, 1e-9, "cost scales with the pour");
  within(p1.cost_usd / p1.ordered_yd3, 185, 1e-9, "cost is the unit price times the ordered volume");
});

// ---- insulation-batt-coverage: the Owens Corning label geometry ----

test("batt insulation: the label coverage is the batt geometry -- a 15 x 93 in R-13 batt is 9.69 ft^2", () => {
  // 15 in x 93 in = 1,395 in^2 / 144 = 9.6875 ft^2, and Owens Corning packs 13
  // of them to a 125.94 ft^2 bag (13 x 9.6875 = 125.94).
  within(15 * 93 / 144, 9.6875, 1e-9, "batt geometry");
  within(13 * 9.6875, 125.94, 0.01, "thirteen batts to the bag");
  // So on any wall the batts should come out to about 13 per bag.
  const r = computeInsulationBattCoverage({ area_ft2: 1259.4, coverage_per_batt: 9.69, coverage_per_bag: 125.94, waste_pct: 0 });
  assert.equal(r.bags, 10);
  assert.equal(r.batts, 130, "ten bags of thirteen batts");
});

test("batt insulation: the batts and bags bought both cover the net area, and waste only adds", () => {
  for (const c of [
    { area_ft2: 500, coverage_per_batt: 9.69, coverage_per_bag: 125.94, waste_pct: 0 },
    { area_ft2: 2340, coverage_per_batt: 7.33, coverage_per_bag: 88, waste_pct: 7.5 },
  ]) {
    const r = computeInsulationBattCoverage(c);
    within(r.net_ft2, c.area_ft2 * (1 + c.waste_pct / 100), 1e-9, "net area with waste");
    assert.ok(r.batts * c.coverage_per_batt >= r.net_ft2 - 1e-6, "the batts fill the cavities");
    assert.ok((r.batts - 1) * c.coverage_per_batt < r.net_ft2 + 1e-6, "no spare batt");
    assert.ok(r.bags * c.coverage_per_bag >= r.net_ft2 - 1e-6, "the bags cover the wall");
  }
  // Either side of the label may be left blank.
  assert.equal(computeInsulationBattCoverage({ area_ft2: 500, coverage_per_bag: 125.94 }).batts, null);
  assert.equal(computeInsulationBattCoverage({ area_ft2: 500, coverage_per_batt: 9.69 }).bags, null);
});

// ---- intermittent-fillet-weld: AISC 360 J2.2b and the strength equivalence ----

test("stitch weld: the welded fraction carries the continuous weld's strength -- throat x length is conserved", () => {
  // A fillet's strength per inch of joint is proportional to its leg size, so
  // welding a fraction f of the length at size w matches a continuous w_req
  // when w x f = w_req. The classic 3/16 continuous replaced by a 5/16 stitch
  // is f = 0.1875 / 0.3125 = 60%, welded 3 in on a 5 in pitch -- a "3-5" weld.
  const r = computeIntermittentFilletWeld({ w_req_in: 0.1875, w_intermit_in: 0.3125, increment_in: 3 });
  within(r.fraction, 0.6, 1e-9, "welded fraction");
  within(r.pitch_in, 5, 1e-9, "pitch");
  within(r.fraction * r.pitch_in, r.increment_in, 1e-9, "the welded run per pitch is the increment");
  within(0.3125 * r.fraction, 0.1875, 1e-9, "size x fraction = the required continuous size");
  // A 1/4 in requirement met with a 5/16 stitch is 80%: 4 in welded, 5 in pitch.
  const r2 = computeIntermittentFilletWeld({ w_req_in: 0.25, w_intermit_in: 0.3125, increment_in: 4 });
  within(r2.fraction, 0.8, 1e-9, "4/5 of the length");
  within(r2.pitch_in, 5, 1e-9, "pitch");
  // Same size both ways is a continuous weld: fraction 1, pitch = increment.
  const cont = computeIntermittentFilletWeld({ w_req_in: 0.25, w_intermit_in: 0.25, increment_in: 2 });
  within(cont.fraction, 1, 1e-9, "continuous");
  within(cont.pitch_in, 2, 1e-9, "no skip");
});

test("stitch weld: the minimum segment is AISC 360 J2.2b -- four times the weld size, never under 1.5 in", () => {
  // AISC 360 J2.2b: segments of intermittent fillet welds are at least 4 x the
  // weld size and not less than 1-1/2 in. At 1/4 in, 4w = 1 in, so 1.5 in
  // governs; at 1/2 in, 4w = 2 in governs.
  within(computeIntermittentFilletWeld({ w_req_in: 0.25, w_intermit_in: 0.25, increment_in: 2 }).min_incr_in, 1.5, 1e-9, "1.5 in floor at 1/4 in");
  within(computeIntermittentFilletWeld({ w_req_in: 0.5, w_intermit_in: 0.5, increment_in: 2 }).min_incr_in, 2, 1e-9, "4w at 1/2 in");
  within(computeIntermittentFilletWeld({ w_req_in: 0.375, w_intermit_in: 0.375, increment_in: 2 }).min_incr_in, 1.5, 1e-9, "4 x 3/8 = 1.5 in, the crossover");
  // A 1.25 in segment of 1/2 in weld is too short; 2 in is exactly at the limit.
  assert.equal(computeIntermittentFilletWeld({ w_req_in: 0.25, w_intermit_in: 0.5, increment_in: 1.25 }).ok, false);
  assert.equal(computeIntermittentFilletWeld({ w_req_in: 0.25, w_intermit_in: 0.5, increment_in: 2 }).ok, true);
  // A stitch weaker than the weld it replaces is refused.
  assert.ok(computeIntermittentFilletWeld({ w_req_in: 0.375, w_intermit_in: 0.25, increment_in: 3 }).error);
});

// ---- rain-on-snow-surcharge: ASCE 7 7.10 triggers ----

test("rain-on-snow: both ASCE 7 7.10 triggers must be met -- ground snow at or under the cap, slope under W/50", () => {
  const base = { pf_psf: 15, pg_psf: 18, eave_to_ridge_ft: 100, surcharge_psf: 8, risk_category: "II" };
  // W = 100 ft, so the slope limit is 100/50 = 2.0 deg, and it is a strict
  // "less than": 1.99 deg takes the surcharge, 2.0 deg does not.
  assert.equal(computeRainOnSnowSurcharge({ ...base, slope_deg: 1.99 }).applies, true);
  assert.equal(computeRainOnSnowSurcharge({ ...base, slope_deg: 2.0 }).applies, false);
  assert.equal(computeRainOnSnowSurcharge({ ...base, slope_deg: 2.5 }).applies, false);
  // Deep-snow country does not take the surcharge: at risk category II the cap
  // is pm,max = 30 psf (ASCE 7-22 Table 7.3-4), so 30 takes it and 31 does not.
  assert.equal(computeRainOnSnowSurcharge({ ...base, pg_psf: 30, slope_deg: 1 }).applies, true);
  assert.equal(computeRainOnSnowSurcharge({ ...base, pg_psf: 31, slope_deg: 1 }).applies, false);
  // And the surcharge is an addition to the balanced load, nothing else.
  const on = computeRainOnSnowSurcharge({ ...base, slope_deg: 1 });
  within(on.total_psf, 15 + 8, 1e-9, "Pf plus the surcharge");
  within(computeRainOnSnowSurcharge({ ...base, slope_deg: 3 }).total_psf, 15, 1e-9, "a steeper roof takes Pf alone");
});

test("rain-on-snow: the ground-snow cap is the risk-category table, 25 / 30 / 35 / 40 psf", () => {
  // ASCE 7-22 Table 7.3-4 pm,max by risk category.
  for (const [cat, cap] of [["I", 25], ["II", 30], ["III", 35], ["IV", 40]]) {
    const r = computeRainOnSnowSurcharge({ pf_psf: 12, pg_psf: cap, slope_deg: 0.5, eave_to_ridge_ft: 60, surcharge_psf: 8, risk_category: cat });
    within(r.pm_max_psf, cap, 1e-9, `pm,max for category ${cat}`);
    assert.equal(r.applies, true, `at exactly pm,max the surcharge applies (${cat})`);
    assert.equal(computeRainOnSnowSurcharge({ pf_psf: 12, pg_psf: cap + 0.1, slope_deg: 0.5, eave_to_ridge_ft: 60, surcharge_psf: 8, risk_category: cat }).applies, false);
  }
  assert.ok(computeRainOnSnowSurcharge({ pf_psf: 12, pg_psf: 10, slope_deg: 0.5, eave_to_ridge_ft: 60, risk_category: "V" }).error);
});

test("rain-on-snow: the ASCE 7-16 case is reproducible by entering its 5 psf surcharge", () => {
  // SUSPECTED DEFECT (reported, not asserted as wrong): the tile defaults the
  // surcharge to 8 psf for ASCE 7-22, where 7-16 and earlier used 5 psf. A
  // 7-16 check is only reachable by overriding the field, and only the slope
  // trigger is shared -- 7-16 also capped the trigger at a flat pg <= 20 psf
  // rather than at pm,max, so 20 < pg <= pm,max is a 7-22-only surcharge.
  const asce716 = computeRainOnSnowSurcharge({ pf_psf: 15, pg_psf: 18, slope_deg: 1, eave_to_ridge_ft: 100, surcharge_psf: 5, risk_category: "II" });
  within(asce716.total_psf, 20, 1e-9, "15 + 5 psf under ASCE 7-16");
  const dflt = computeRainOnSnowSurcharge({ pf_psf: 15, pg_psf: 18, slope_deg: 1, eave_to_ridge_ft: 100 });
  within(dflt.added_psf, 8, 1e-9, "current default surcharge");
  // 7-16 would not add anything here (pg > 20); the tile does.
  assert.equal(computeRainOnSnowSurcharge({ pf_psf: 15, pg_psf: 24, slope_deg: 1, eave_to_ridge_ft: 100 }).applies, true);
});

// ---- minimum-roof-snow: ASCE 7 minimum roof snow load ----

test("minimum roof snow: Pm is the ground snow capped at the risk-category pm,max of 25 / 30 / 35 / 40 psf", () => {
  // ASCE 7-22 Table 7.3-4. Below the cap the minimum is the ground snow
  // itself; above it the minimum stops at the cap.
  for (const [cat, cap] of [["I", 25], ["II", 30], ["III", 35], ["IV", 40]]) {
    within(computeMinimumRoofSnow({ pg_psf: 15, risk_category: cat }).pm_psf, 15, 1e-9, `below the cap (${cat})`);
    within(computeMinimumRoofSnow({ pg_psf: cap, risk_category: cat }).pm_psf, cap, 1e-9, `at the cap (${cat})`);
    within(computeMinimumRoofSnow({ pg_psf: 200, risk_category: cat }).pm_psf, cap, 1e-9, `far above the cap (${cat})`);
    within(computeMinimumRoofSnow({ pg_psf: 15, risk_category: cat }).pm_max_psf, cap, 1e-9, `the cap itself (${cat})`);
  }
  assert.ok(computeMinimumRoofSnow({ pg_psf: 15, risk_category: "V" }).error);
});

test("minimum roof snow: the design value is the greater of the minimum and the computed Pf, and never falls below it", () => {
  // A light exposure or thermal factor cannot drop the design below Pm.
  const low = computeMinimumRoofSnow({ pg_psf: 15, risk_category: "II", pf_computed: 9 });
  within(low.governing_psf, 15, 1e-9, "the minimum governs a light computed Pf");
  assert.equal(low.min_governs, true);
  const high = computeMinimumRoofSnow({ pg_psf: 15, risk_category: "II", pf_computed: 22 });
  within(high.governing_psf, 22, 1e-9, "a heavy computed Pf governs");
  assert.equal(high.min_governs, false);
  // Pm is non-decreasing in Pg and never exceeds it.
  let prev = 0;
  for (const pg of [1, 5, 12, 20, 25, 30, 45, 80]) {
    const r = computeMinimumRoofSnow({ pg_psf: pg, risk_category: "II" });
    assert.ok(r.pm_psf >= prev - 1e-12, "Pm is non-decreasing in Pg");
    assert.ok(r.pm_psf <= pg + 1e-12, "the minimum never exceeds the ground snow");
    prev = r.pm_psf;
  }
});

test("minimum roof snow: the ASCE 7-16 Is-based minimum differs only in the 20 to pm,max band", () => {
  // SUSPECTED DEFECT (reported, not asserted as wrong): the spec (v470) writes
  // the ASCE 7-16 rule Pm = Is x Pg for Pg <= 20 psf and Pm = 20 x Is above,
  // while the tile implements the ASCE 7-22 rule Pm = min(Pg, pm,max) with no
  // importance factor. At Is = 1.0 the two agree for Pg <= 20 psf; they part
  // above it, where 7-16 gives a flat 20 psf.
  for (const pg of [5, 12, 20]) {
    within(computeMinimumRoofSnow({ pg_psf: pg, risk_category: "II" }).pm_psf, Math.min(pg, 20), 1e-9, `7-16 and 7-22 agree at Pg = ${pg}`);
  }
  // 7-16 at Is = 1.0 would read 20 psf here; the tile reads the 7-22 value.
  within(computeMinimumRoofSnow({ pg_psf: 28, risk_category: "II" }).pm_psf, 28, 1e-9, "7-22 value above the 7-16 branch");
  within(computeMinimumRoofSnow({ pg_psf: 50, risk_category: "II" }).pm_psf, 30, 1e-9, "capped at pm,max");
});
