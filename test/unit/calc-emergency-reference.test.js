// The emergency-response tiles (restoration, flood fight, outage, USAR,
// treatment, drainage, septic, relief water, field, fire) against references
// the specs did not write. The worked-example fixture recomputes each spec's
// OWN example, so a spec and its tile that share an error agree with each
// other; these tests re-derive the answers a second way -- time-stepped
// simulations against the closed-form exponentials, geometry by integration,
// mass and energy balances, published table values, and hand counts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFloodCutTakeoff, computeWaterExtractionRate, computeSewageLossDisposal } from "../../calc-restoration.js";
import { computeEmergencyEarthLeveeSection, computeBasementFloodPumpdown, computeStormPanelPlywood } from "../../calc-floodfight.js";
import { computeBuildingOutageCooldown, computeRefrigerationOutageHoldover, computePipeFreezeTime } from "../../calc-outage.js";
import { computePicketAnchorSoil, computeReliefStorageFloorLoad } from "../../calc-usar.js";
import { computePoolTileCopingPerimeter, computePoolInteriorFinishVolume, computeParticleSettlingVelocity } from "../../calc-treatment.js";
import { computePipePartialFlowDepth } from "../../calc-drainage.js";
import { computeLeachFieldAggregate } from "../../calc-septic.js";
import { computeResponderCampSanitation } from "../../calc-reliefwater.js";
import { computeLitterCarryTeam } from "../../calc-field.js";
import { computePpvFanSizing } from "../../calc-fire.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};

// Conversions used as outside references, never taken from the modules.
const GAL_PER_CF = 7.4805195; // 1728 cu in / 231 cu in per gallon
const LB_PER_GAL = 8.3454;    // water at 60 F
const LB_PER_CF = 62.4;       // water, the civil-engineering value

// ===================== calc-restoration.js =====================

// ---- flood-cut-takeoff: hand-counted strips and sheets ----

test("flood cut: a 12 x 16 ft room cut 18 in high is 56 lf of cut line, 84 sq ft of board, 3 sheets -- counted by hand", () => {
  // Perimeter 2(12+16) = 56 ft. A strip 1.5 ft tall around it is 84 sq ft.
  // 84 / 32 = 2.625 sheets, so three 4x8 sheets are bought.
  const r = computeFloodCutTakeoff({ wall_perimeter_ft: 56, cut_height_in: 18, removed_faces: 1, has_insulation: 1, has_baseboard: 1 });
  within(r.cut_line_lf, 56, 1e-9, "cut line");
  within(r.drywall_sf, 84, 1e-9, "strip area");
  assert.equal(r.drywall_sheets, 3);
  within(r.baseboard_lf, 56, 1e-9, "baseboard follows the cut line");
});

test("flood cut: the sheet count is the smallest whole number of 32 sq ft sheets that covers the strip", () => {
  for (const perim of [8, 13.5, 56, 120, 333.3]) {
    for (const cut of [12, 18, 24, 48]) {
      for (const faces of [1, 2]) {
        const r = computeFloodCutTakeoff({ wall_perimeter_ft: perim, cut_height_in: cut, removed_faces: faces });
        assert.ok(r.drywall_sheets * 32 >= r.drywall_sf - 1e-9, `sheets cover the area at ${perim}/${cut}/${faces}`);
        assert.ok((r.drywall_sheets - 1) * 32 < r.drywall_sf + 1e-9, `no spare sheet at ${perim}/${cut}/${faces}`);
      }
    }
  }
  // An exact fit buys no extra sheet: 16 lf cut 24 in is exactly 32 sq ft.
  assert.equal(computeFloodCutTakeoff({ wall_perimeter_ft: 16, cut_height_in: 24 }).drywall_sheets, 1);
  assert.equal(computeFloodCutTakeoff({ wall_perimeter_ft: 32, cut_height_in: 24 }).drywall_sheets, 2);
});

test("flood cut: opening both faces doubles the board and the base but not the insulation -- one cavity, two skins", () => {
  const one = computeFloodCutTakeoff({ wall_perimeter_ft: 90, cut_height_in: 24, removed_faces: 1, has_insulation: 1, has_baseboard: 1 });
  const two = computeFloodCutTakeoff({ wall_perimeter_ft: 90, cut_height_in: 24, removed_faces: 2, has_insulation: 1, has_baseboard: 1 });
  within(two.drywall_sf / one.drywall_sf, 2, 1e-9, "two skins of board");
  within(two.cut_line_lf / one.cut_line_lf, 2, 1e-9, "a score cut on each side");
  within(two.baseboard_lf / one.baseboard_lf, 2, 1e-9, "base on each side");
  within(two.insulation_sf, one.insulation_sf, 1e-9, "the cavity is counted once");
  // The insulation strip is the wall's own area, independent of how many skins came off.
  within(one.insulation_sf, 90 * 2, 1e-9, "insulation = perimeter x cut height");
  assert.equal(computeFloodCutTakeoff({ wall_perimeter_ft: 90, cut_height_in: 24, has_insulation: 0 }).insulation_sf, 0);
});

// ---- water-extraction-rate: the same water weighed two ways ----

test("water extraction: standing water converts by volume -- 800 sq ft under 1 in is 66.67 cu ft and 498.7 gal", () => {
  // 800 x (1/12) = 66.667 cu ft; x 7.48052 gal/cu ft = 498.70 gal.
  const r = computeWaterExtractionRate({ area_sqft: 800, standing_depth_in: 1, absorption_gal_per_sqft: 0.15, extraction_rate_gpm: 5, waste_tank_gal: 100, dehu_gal_per_day: 15 });
  within(r.standing_gal, 66.6667 * GAL_PER_CF, 0.01, "standing gallons");
  within(r.standing_gal, 498.70, 0.01, "standing gallons, hand value");
  within(r.absorbed_gal, 120, 1e-9, "absorbed = 800 x 0.15");
  within(r.total_gal, r.standing_gal + r.absorbed_gal, 1e-9, "the two sources add");
});

test("water extraction: the load weighs the same whether weighed per gallon or per cubic foot", () => {
  for (const c of [
    { area_sqft: 800, standing_depth_in: 1, absorption_gal_per_sqft: 0.15 },
    { area_sqft: 2500, standing_depth_in: 0.25, absorption_gal_per_sqft: 0 },
    { area_sqft: 140, standing_depth_in: 0, absorption_gal_per_sqft: 0.4 },
  ]) {
    const r = computeWaterExtractionRate({ ...c, extraction_rate_gpm: 5, waste_tank_gal: 100 });
    const cubic_ft = r.total_gal / GAL_PER_CF;
    within(r.water_weight_lb, cubic_ft * LB_PER_CF, 0.1, "weight by density of water");
    within(r.water_weight_lb / r.total_gal, LB_PER_GAL, 0.01, "lb per gallon");
  }
});

test("water extraction: the dumps are a fencepost count and the speed ratio is a ratio of rates", () => {
  // 1000 sq ft holding 0.1 gal/sq ft is exactly 100 gal: a 100 gal tank is one
  // trip, not two; a 30 gal tank is four.
  const base = { area_sqft: 1000, standing_depth_in: 0, absorption_gal_per_sqft: 0.1, extraction_rate_gpm: 5 };
  assert.equal(computeWaterExtractionRate({ ...base, waste_tank_gal: 100 }).tank_dumps, 1);
  assert.equal(computeWaterExtractionRate({ ...base, waste_tank_gal: 30 }).tank_dumps, 4);
  assert.equal(computeWaterExtractionRate({ ...base, waste_tank_gal: 50 }).tank_dumps, 2);
  const r = computeWaterExtractionRate({ ...base, waste_tank_gal: 100, dehu_gal_per_day: 15 });
  within(r.wand_time_min, 20, 1e-9, "100 gal at 5 gpm");
  within(r.wand_time_hr, 1 / 3, 1e-9, "minutes to hours");
  // The gallons cancel: the wand-to-dehu speedup is (gpm x 1440) / (gal per day).
  within(r.speed_ratio, 5 * 1440 / 15, 1e-6, "speed ratio from the rates alone");
});

// ---- sewage-loss-disposal: volume in, volume out ----

test("sewage disposal: a bag holds its rated gallons -- 33 gal is 4.41 cu ft", () => {
  for (const bag of [20, 33, 55]) {
    const r = computeSewageLossDisposal({ soft_area_sqft: 100, soft_thickness_in: 1, bag_capacity_gal: bag });
    within(r.bag_cf * GAL_PER_CF, bag, 1e-6, "bag volume round trip");
  }
  within(computeSewageLossDisposal({ soft_area_sqft: 100, soft_thickness_in: 1, bag_capacity_gal: 33 }).bag_cf, 4.4115, 0.05, "33 gal in cu ft");
});

test("sewage disposal: 500 sq ft of carpet and pad plus 120 sq ft of half-inch board is 26 cu ft in place, 78 loose, 18 bags", () => {
  // 500 x 0.5/12 = 20.83 cu ft; 120 x 0.5/12 = 5.00; total 25.83. At a bulking
  // factor of 3 that is 77.5 loose cu ft, and 77.5 / 4.4115 = 17.57 -> 18 bags.
  // A 10 cu yd box is 270 cu ft, so the load fills 28.7% of it.
  const r = computeSewageLossDisposal({ soft_area_sqft: 500, soft_thickness_in: 0.5, board_area_sqft: 120, board_thickness_in: 0.5, bulking_factor: 3, bag_capacity_gal: 33, container_cy: 10, extracted_gal: 400 });
  within(r.in_place_cf, 25.833, 0.05, "in-place volume");
  within(r.loose_cf, 77.5, 0.05, "loose volume");
  assert.equal(r.bag_count, 18);
  within(r.container_cf, 270, 1e-9, "10 cu yd in cu ft");
  within(r.container_utilization_pct, 77.5 / 270 * 100, 0.05, "utilization");
  assert.equal(r.oversized, true);
  within(r.liquid_weight_lb, 400 * LB_PER_GAL, 1e-9, "extracted water weight");
  within(r.liquid_weight_lb, 400 / GAL_PER_CF * LB_PER_CF, 0.1, "the same weight by density");
});

test("sewage disposal: bulking is a multiplier on the in-place volume and nothing else moves", () => {
  const base = { soft_area_sqft: 300, soft_thickness_in: 1.5, board_area_sqft: 200, board_thickness_in: 0.625, bag_capacity_gal: 33, container_cy: 20 };
  const one = computeSewageLossDisposal({ ...base, bulking_factor: 1 });
  within(one.loose_cf, one.in_place_cf, 1e-9, "a factor of 1 is no bulking");
  let prev = 0;
  for (const f of [1, 1.5, 2, 3, 4.5]) {
    const r = computeSewageLossDisposal({ ...base, bulking_factor: f });
    within(r.in_place_cf, one.in_place_cf, 1e-9, "in-place volume does not depend on bulking");
    within(r.loose_cf / one.in_place_cf, f, 1e-9, "loose scales with the factor");
    assert.ok(r.bag_count >= prev, "bags never fall as the debris bulks");
    prev = r.bag_count;
  }
});

// ===================== calc-floodfight.js =====================

// ---- emergency-earth-levee-section: the trapezoid by integration ----

test("emergency levee: the section area by integrating the width over the height matches the trapezoid", () => {
  // Width at elevation y above the toe is top + (s_river + s_land)(H - y);
  // integrating it from 0 to H is an independent route to the cross-section.
  for (const c of [
    { height_ft: 4, fill: "sand", top_width_ft: 10, length_ft: 100 },
    { height_ft: 6.5, fill: "clay", top_width_ft: 8, length_ft: 250 },
    { height_ft: 2, fill: "sand", top_width_ft: 12, length_ft: 40 },
  ]) {
    const r = computeEmergencyEarthLeveeSection({ ...c, foundation: "fine_sand" });
    const s = r.riverside_slope_h + r.landside_slope_h;
    const N = 200000;
    let area = 0;
    for (let i = 0; i < N; i++) {
      const y = (i + 0.5) * c.height_ft / N;
      area += (c.top_width_ft + s * (c.height_ft - y)) * (c.height_ft / N);
    }
    within(r.area_sqft, area, 0.001, "section area by integration");
    within(r.base_width_ft, c.top_width_ft + s * c.height_ft, 1e-9, "base width at the toe");
    within(r.fill_cy, area * c.length_ft / 27, 0.001, "prismatic volume in cu yd");
  }
});

test("emergency levee: the handbook sections -- sand 1V:3H river and 1V:5H land, clay 1V:2.5H both faces", () => {
  // USACE/FEMA flood-fight handbook sand section: 10 ft crown, 3H:1V riverside,
  // 5H:1V landside. Clay section: 2.5H:1V both faces.
  const sand = computeEmergencyEarthLeveeSection({ height_ft: 4, fill: "sand", top_width_ft: 10, length_ft: 100 });
  assert.equal(sand.riverside_slope_h, 3);
  assert.equal(sand.landside_slope_h, 5);
  within(sand.base_width_ft, 10 + 3 * 4 + 5 * 4, 1e-9, "base = crown + both slope runs");
  within(sand.area_sqft, (10 + 42) / 2 * 4, 1e-9, "trapezoid by hand");
  within(sand.fill_cy, 104 * 100 / 27, 1e-9, "385.2 cu yd per 100 ft");
  assert.equal(sand.top_below_handbook, false);
  assert.equal(computeEmergencyEarthLeveeSection({ height_ft: 4, fill: "sand", top_width_ft: 6, length_ft: 100 }).top_below_handbook, true);
  const clay = computeEmergencyEarthLeveeSection({ height_ft: 4, fill: "clay", top_width_ft: 10, length_ft: 100 });
  assert.equal(clay.riverside_slope_h, 2.5);
  assert.equal(clay.landside_slope_h, 2.5);
});

test("emergency levee: Bligh's creep coefficients, and the shortfall is the path the base does not provide", () => {
  // Bligh's weighted-creep coefficients: fine sand C = 15, fine gravel C = 9,
  // an impervious foundation needs no seepage path. The required path is C x H.
  const h = 6, top = 10;
  const clayOnSand = computeEmergencyEarthLeveeSection({ height_ft: h, fill: "clay", foundation: "fine_sand", top_width_ft: top, length_ft: 100 });
  assert.equal(clayOnSand.creep_ratio, 15);
  within(clayOnSand.required_path_ft, 15 * h, 1e-9, "C x H");
  within(clayOnSand.base_width_ft, top + 5 * h, 1e-9, "clay base");
  within(clayOnSand.berm_shortfall_ft, 90 - 40, 1e-9, "shortfall = required - base");
  assert.equal(computeEmergencyEarthLeveeSection({ height_ft: h, fill: "clay", foundation: "fine_gravel", top_width_ft: top, length_ft: 100 }).creep_ratio, 9);
  // A base already long enough leaves nothing to make up.
  const wide = computeEmergencyEarthLeveeSection({ height_ft: 2, fill: "clay", foundation: "fine_gravel", top_width_ft: 40, length_ft: 100 });
  within(wide.required_path_ft, 18, 1e-9, "9 x 2");
  within(wide.berm_shortfall_ft, 0, 1e-9, "no shortfall when the base exceeds the path");
  // An impervious foundation and the sand section are outside the check.
  assert.equal(computeEmergencyEarthLeveeSection({ height_ft: h, fill: "clay", foundation: "impervious", top_width_ft: top, length_ft: 100 }).creep_applies, false);
  assert.equal(computeEmergencyEarthLeveeSection({ height_ft: h, fill: "sand", foundation: "fine_sand", top_width_ft: top, length_ft: 100 }).creep_applies, false);
});

// ---- basement-flood-pumpdown: the staged schedule counted by hand ----

test("basement pump-down: FEMA's two 1 ft test days then the daily rate -- the day counts by hand", () => {
  // 8 ft at 2.5 ft/day: 1, 1, 2.5, 2.5, 1 -- five days, largest 2.5 ft.
  const a = computeBasementFloodPumpdown({ floor_area_sqft: 1200, water_depth_ft: 8, daily_drawdown_ft: 2.5, pump_gpm: 150 });
  assert.equal(a.days, 5);
  within(a.largest_day_ft, 2.5, 1e-9, "largest day");
  assert.equal(a.schedule.split("day ").length - 1, a.days, "the schedule lists every day");
  // 2 ft at 2 ft/day is two 1 ft test days and nothing after.
  const b = computeBasementFloodPumpdown({ floor_area_sqft: 500, water_depth_ft: 2, daily_drawdown_ft: 2, pump_gpm: 100 });
  assert.equal(b.days, 2);
  within(b.largest_day_ft, 1, 1e-9, "test days cap at 1 ft");
  // Less than a foot is one short day.
  const c = computeBasementFloodPumpdown({ floor_area_sqft: 500, water_depth_ft: 0.4, daily_drawdown_ft: 3, pump_gpm: 100 });
  assert.equal(c.days, 1);
  within(c.largest_day_ft, 0.4, 1e-9, "the only day is the water that is there");
  // 1.5 ft at 3 ft/day: 1 then 0.5.
  assert.equal(computeBasementFloodPumpdown({ floor_area_sqft: 500, water_depth_ft: 1.5, daily_drawdown_ft: 3, pump_gpm: 100 }).days, 2);
});

test("basement pump-down: the water balances -- the days sum to the depth and the gallons to the volume", () => {
  for (const c of [
    { floor_area_sqft: 1200, water_depth_ft: 8, daily_drawdown_ft: 2.5, pump_gpm: 150 },
    { floor_area_sqft: 640, water_depth_ft: 5.25, daily_drawdown_ft: 2, pump_gpm: 60 },
    { floor_area_sqft: 2000, water_depth_ft: 3, daily_drawdown_ft: 3, pump_gpm: 400 },
  ]) {
    const r = computeBasementFloodPumpdown(c);
    within(r.gal_per_ft, c.floor_area_sqft * GAL_PER_CF, 1e-6, "gallons in a foot of basement");
    within(r.total_gal, c.floor_area_sqft * c.water_depth_ft * GAL_PER_CF, 1e-6, "total volume");
    within(r.largest_day_gal, r.largest_day_ft * r.gal_per_ft, 1e-9, "the big day's gallons");
    // Sum the printed feet back up: the schedule must dewater the basement exactly.
    const feet = [...r.schedule.matchAll(/day \d+: ([\d.]+) ft/g)].map((m) => Number(m[1]));
    assert.equal(feet.length, r.days);
    within(feet.reduce((s, x) => s + x, 0), c.water_depth_ft, 0.5, "the schedule removes all the water");
    assert.ok(r.days >= Math.ceil(c.water_depth_ft / c.daily_drawdown_ft), "never faster than the daily cap allows");
    within(r.largest_day_run_min, r.largest_day_gal / c.pump_gpm, 1e-9, "run time on the big day");
    assert.equal(r.pump_keeps_up, r.largest_day_run_min <= 1440);
  }
});

test("basement pump-down: the FEMA 2-to-3 ft/day band is enforced at its edges", () => {
  assert.ok(computeBasementFloodPumpdown({ floor_area_sqft: 500, water_depth_ft: 6, daily_drawdown_ft: 3, pump_gpm: 100 }).days > 0);
  assert.ok(computeBasementFloodPumpdown({ floor_area_sqft: 500, water_depth_ft: 6, daily_drawdown_ft: 3.01, pump_gpm: 100 }).error);
  assert.equal(computeBasementFloodPumpdown({ floor_area_sqft: 500, water_depth_ft: 6, daily_drawdown_ft: 1.5, pump_gpm: 100 }).below_fema_rate, true);
  assert.equal(computeBasementFloodPumpdown({ floor_area_sqft: 500, water_depth_ft: 6, daily_drawdown_ft: 2, pump_gpm: 100 }).below_fema_rate, false);
});

// ---- storm-panel-plywood: fencepost fasteners and sheet packing ----

test("storm panels: a 36 x 60 in opening with 4 in overlap is a 44 x 68 in panel spanning 44 in", () => {
  const r = computeStormPanelPlywood({ opening_width_in: 36, opening_height_in: 60, overlap_in: 4, fastener_spacing_in: 12, edge_distance_in: 1, opening_count: 1 });
  within(r.panel_width_in, 44, 1e-9, "width plus two overlaps");
  within(r.panel_height_in, 68, 1e-9, "height plus two overlaps");
  // Fastened along the long edges, the panel spans the short way: 44 in.
  within(r.span_in, 44, 1e-9, "span between fastened edges");
  within(r.fastened_edge_in, 68, 1e-9, "the fastened edge is the long one");
  assert.equal(r.table_column, "panel span <= 4 ft");
  // Fencepost: the fastener field is 68 - 2(1) = 66 in; 66/12 = 5.5 -> 6 spaces
  // -> 7 fasteners per edge, 14 per panel.
  assert.equal(r.fasteners_per_edge, 7);
  assert.equal(r.fasteners_per_panel, 14);
  assert.equal(computeStormPanelPlywood({ opening_width_in: 36, opening_height_in: 60, overlap_in: 4, fastener_spacing_in: 12, edge_distance_in: 1, opening_count: 5 }).total_fasteners, 70);
});

test("storm panels: the fastener row covers its edge at no more than the table spacing, and one fewer would not", () => {
  for (const c of [
    { opening_width_in: 36, opening_height_in: 60, fastener_spacing_in: 12 },
    { opening_width_in: 24, opening_height_in: 36, fastener_spacing_in: 9 },
    { opening_width_in: 72, opening_height_in: 48, fastener_spacing_in: 16 },
    { opening_width_in: 42, opening_height_in: 42, fastener_spacing_in: 6 },
  ]) {
    const r = computeStormPanelPlywood({ overlap_in: 4, edge_distance_in: 1, opening_count: 1, ...c });
    const field = r.fastened_edge_in - 2 * 1;
    assert.ok((r.fasteners_per_edge - 1) * c.fastener_spacing_in >= field - 1e-9, "the row reaches the far edge distance");
    assert.ok((r.fasteners_per_edge - 2) * c.fastener_spacing_in < field - 1e-9, "no fastener to spare");
  }
  // An exact fit adds no extra: field 48 in at 12 in is 4 spaces, 5 fasteners.
  const exact = computeStormPanelPlywood({ opening_width_in: 42, opening_height_in: 10, overlap_in: 4, fastener_spacing_in: 12, edge_distance_in: 1, opening_count: 1 });
  within(exact.fastened_edge_in, 50, 1e-9, "42 + 8");
  assert.equal(exact.fasteners_per_edge, 5);
});

test("storm panels: the panels nested on a 4 x 8 sheet never claim more area than the sheet has", () => {
  for (const c of [
    { opening_width_in: 36, opening_height_in: 60 },
    { opening_width_in: 14, opening_height_in: 24 },
    { opening_width_in: 30, opening_height_in: 30 },
    { opening_width_in: 20, opening_height_in: 88 },
  ]) {
    const r = computeStormPanelPlywood({ overlap_in: 4, fastener_spacing_in: 12, edge_distance_in: 1, opening_count: 3, ...c });
    if (!r.needs_splice) {
      assert.ok(r.per_sheet * r.panel_width_in * r.panel_height_in <= 48 * 96 + 1e-9, "the nesting fits in 4608 sq in");
      assert.ok(r.sheets * r.per_sheet >= 3, "enough sheets for three openings");
      assert.ok((r.sheets - 1) * r.per_sheet < 3, "no spare sheet");
    }
  }
  // 22 x 32 in panels: 2 across x 3 down = 6 per sheet (the other way gives 4).
  const six = computeStormPanelPlywood({ opening_width_in: 14, opening_height_in: 24, overlap_in: 4, fastener_spacing_in: 12, edge_distance_in: 1, opening_count: 6 });
  within(six.panel_width_in, 22, 1e-9, "panel width");
  within(six.panel_height_in, 32, 1e-9, "panel height");
  assert.equal(six.per_sheet, 6);
  assert.equal(six.sheets, 1);
});

test("storm panels: the IRC exception's own limits -- 7/16 in minimum thickness and an 8 ft maximum span", () => {
  const thin = computeStormPanelPlywood({ opening_width_in: 36, opening_height_in: 60, thickness_in: 0.375, fastener_spacing_in: 12 });
  assert.ok(thin.error && /7\/16/.test(thin.error), "3/8 in is refused");
  assert.ok(!computeStormPanelPlywood({ opening_width_in: 36, opening_height_in: 60, thickness_in: 7 / 16, fastener_spacing_in: 12 }).error, "7/16 in is accepted");
  // 92 x 92 in openings give a 100 in span, past the 8 ft limit.
  const wide = computeStormPanelPlywood({ opening_width_in: 92, opening_height_in: 92, overlap_in: 4, fastener_spacing_in: 12 });
  assert.ok(wide.error && /8 ft/.test(wide.error), "a 100 in span is refused");
  // 88 x 88 openings give exactly 96 in -- the limit is inclusive.
  assert.ok(!computeStormPanelPlywood({ opening_width_in: 88, opening_height_in: 88, overlap_in: 4, fastener_spacing_in: 12 }).error, "exactly 8 ft is allowed");
});

// ===================== calc-outage.js =====================

// A forward Euler walk of C dT/dt = Q_internal - UA (T - T_out): the closed-form
// exponential the tile uses has to agree with the differential equation it solves.
const eulerCooldown = (ua, cap, start, out, gain, hours, dt = 0.0005) => {
  let T = start;
  for (let t = 0; t < hours - 1e-12; t += dt) T += dt * (gain - ua * (T - out)) / cap;
  return T;
};
const eulerHoursTo = (ua, cap, start, out, gain, target, dt = 0.0005, cap_hours = 20000) => {
  let T = start, t = 0;
  while (T > target && t < cap_hours) { T += dt * (gain - ua * (T - out)) / cap; t += dt; }
  return T > target ? null : t;
};

test("building cooldown: the exponential matches a time-stepped walk of the heat balance", () => {
  for (const c of [
    { envelope_ua_btuh_per_degf: 309.7, capacitance_btu_per_degf: 10000, indoor_start_degf: 68, outdoor_degf: 10, occupants: 0, other_gains_btuh: 0, first_threshold_degf: 50, second_threshold_degf: 40 },
    { envelope_ua_btuh_per_degf: 600, capacitance_btu_per_degf: 45000, indoor_start_degf: 70, outdoor_degf: -5, occupants: 12, other_gains_btuh: 500, first_threshold_degf: 55, second_threshold_degf: 45 },
    { envelope_ua_btuh_per_degf: 120, capacitance_btu_per_degf: 8000, indoor_start_degf: 65, outdoor_degf: 25, occupants: 0, other_gains_btuh: 0, first_threshold_degf: 50, second_threshold_degf: 35 },
  ]) {
    const r = computeBuildingOutageCooldown(c);
    const gain = c.occupants * 250 + c.other_gains_btuh;
    for (const h of [12, 24, 48]) {
      const sim = eulerCooldown(c.envelope_ua_btuh_per_degf, c.capacitance_btu_per_degf, c.indoor_start_degf, c.outdoor_degf, gain, h);
      within(r[`temp_after_${h}h_degf`], sim, 0.2, `temperature at ${h} h`);
    }
    const simFirst = eulerHoursTo(c.envelope_ua_btuh_per_degf, c.capacitance_btu_per_degf, c.indoor_start_degf, c.outdoor_degf, gain, c.first_threshold_degf);
    if (simFirst === null) assert.equal(r.hours_to_first, null, "the simulation never gets there either");
    else within(r.hours_to_first, simFirst, 0.5, "hours to the first threshold");
    const simSecond = eulerHoursTo(c.envelope_ua_btuh_per_degf, c.capacitance_btu_per_degf, c.indoor_start_degf, c.outdoor_degf, gain, c.second_threshold_degf);
    if (simSecond === null) assert.equal(r.hours_to_second, null, "the simulation never gets there either");
    else within(r.hours_to_second, simSecond, 0.5, "hours to the second threshold");
  }
});

test("building cooldown: the steady state is the outdoor temperature lifted by the gains over UA, and a threshold below it is never reached", () => {
  const c = { envelope_ua_btuh_per_degf: 300, capacitance_btu_per_degf: 20000, indoor_start_degf: 68, outdoor_degf: 10, occupants: 10, other_gains_btuh: 0, first_threshold_degf: 30, second_threshold_degf: 15 };
  const r = computeBuildingOutageCooldown(c);
  // 10 people at 250 Btu/h sensible each is 2,500 Btu/h; over UA 300 that is
  // 8.33 degF of lift, so the building settles at 18.3 degF.
  within(r.internal_gain_btuh, 2500, 1e-9, "sensible gain");
  within(r.equilibrium_degf, 10 + 2500 / 300, 1e-9, "equilibrium");
  const far = eulerCooldown(300, 20000, 68, 10, 2500, 3000);
  within(r.equilibrium_degf, far, 0.01, "the walk settles there too");
  assert.ok(r.hours_to_first !== null, "30 degF is above the settling point");
  assert.equal(r.hours_to_second, null, "15 degF is below it and is never reached");
  assert.equal(r.second_reached, false);
  within(r.time_constant_hours, 20000 / 300, 1e-9, "tau = C / UA");
});

test("building cooldown: the mass helper adds published specific heats, Btu per degF per pound", () => {
  // cp: gypsum 0.26, wood 0.3, concrete 0.2, water 1.0 Btu/lb-degF.
  const r = computeBuildingOutageCooldown({ envelope_ua_btuh_per_degf: 300, capacitance_btu_per_degf: 1000, gypsum_lb: 5000, wood_lb: 2000, concrete_lb: 10000, water_lb: 400, indoor_start_degf: 68, outdoor_degf: 20 });
  within(r.helper_capacitance_btu_per_degf, 5000 * 0.26 + 2000 * 0.3 + 10000 * 0.2 + 400 * 1.0, 1e-9, "sum of m cp");
  within(r.helper_capacitance_btu_per_degf, 4300, 1e-9, "4,300 Btu/degF by hand");
  within(r.total_capacitance_btu_per_degf, 5300, 1e-9, "entered plus helper");
  // Doubling every mass doubles the helper and so the time constant.
  const d = computeBuildingOutageCooldown({ envelope_ua_btuh_per_degf: 300, capacitance_btu_per_degf: 0, gypsum_lb: 10000, wood_lb: 4000, concrete_lb: 20000, water_lb: 800, indoor_start_degf: 68, outdoor_degf: 20 });
  within(d.time_constant_hours, 2 * 4300 / 300, 1e-9, "tau doubles with the mass");
});

// ---- refrigeration-outage-holdover: an energy balance on the box ----

test("refrigeration holdover: the box surface, the leak, and the reserve by hand -- 8 x 10 x 8 ft walk-in", () => {
  // Surface 2(8x10 + 8x8 + 10x8) = 448 sq ft. Leak = 448 x 0.04 x (90 - 38) =
  // 931.8 Btu/h transmission, x 1.10 for closed-door infiltration = 1,025.
  // Reserve = 3,000 lb x 0.9 Btu/lb-degF x (41 - 35) = 16,200 Btu.
  const r = computeRefrigerationOutageHoldover({ box_length_ft: 8, box_width_ft: 10, box_height_ft: 8, panel_u_btuh_per_sqft_degf: 0.04, ambient_degf: 90, box_degf: 38, infiltration_pct: 10, product_lb: 3000, product_cp_btu_per_lb_degf: 0.9, product_start_degf: 35, allowable_degf: 41, outage_hours: 72 });
  within(r.surface_sqft, 448, 1e-9, "six faces");
  within(r.transmission_btuh, 448 * 0.04 * 52, 1e-9, "U A dT");
  within(r.heat_gain_btuh, 1025.02, 0.1, "with the infiltration allowance");
  within(r.reserve_btu, 16200, 1e-9, "m cp dT");
  within(r.holdover_hours, 16200 / 1025.02, 0.1, "reserve divided by leak");
});

test("refrigeration holdover: a time-stepped warm-up reaches the allowable temperature when the holdover says it does", () => {
  for (const c of [
    { box_length_ft: 8, box_width_ft: 10, box_height_ft: 8, panel_u_btuh_per_sqft_degf: 0.04, ambient_degf: 90, box_degf: 38, infiltration_pct: 10, product_lb: 3000, product_cp_btu_per_lb_degf: 0.9, product_start_degf: 35, allowable_degf: 41 },
    { entered_heat_gain_btuh: 2400, product_lb: 800, product_cp_btu_per_lb_degf: 0.45, product_start_degf: 0, allowable_degf: 10, box_degf: 0 },
  ]) {
    const r = computeRefrigerationOutageHoldover({ ...c, outage_hours: 0 });
    // Walk the product temperature up at a constant leak: T += gain dt / (m cp).
    let T = c.product_start_degf, t = 0;
    const dt = 0.001;
    while (T < c.allowable_degf && t < 1e5) { T += dt * r.heat_gain_btuh / (c.product_lb * c.product_cp_btu_per_lb_degf); t += dt; }
    within(r.holdover_hours, t, 0.5, "holdover from the stepped warm-up");
  }
});

test("refrigeration holdover: the dry ice makes up exactly the energy the reserve does not cover (246 Btu/lb)", () => {
  // Sublimation of CO2 is about 246 Btu/lb. Over the outage:
  // gain x hours = reserve + 246 x dry ice.
  for (const hours of [0, 8, 15, 72, 240]) {
    const r = computeRefrigerationOutageHoldover({ entered_heat_gain_btuh: 1025, product_lb: 3000, product_cp_btu_per_lb_degf: 0.9, product_start_degf: 35, allowable_degf: 41, box_degf: 38, outage_hours: hours });
    const covered = Math.min(r.reserve_btu, r.heat_gain_btuh * hours);
    within(r.outage_dry_ice_lb * 246 + covered, r.heat_gain_btuh * hours, 1e-6, `energy balance at ${hours} h`);
    assert.equal(r.outage_hours <= r.holdover_hours, r.outage_dry_ice_lb === 0 || hours * r.heat_gain_btuh <= r.reserve_btu);
    within(r.dry_ice_lb_per_day, r.dry_ice_lb_per_hour * 24, 1e-9, "per day is 24 x per hour");
    within(r.dry_ice_lb_per_hour * 246, r.heat_gain_btuh, 1e-6, "steady-state dry ice absorbs the whole leak");
  }
  // USDA FSIS: 50 lb of dry ice holds a full 18 cu ft freezer about two days,
  // which implies a leak of 50 x 246 / 48 = 256 Btu/h.
  const any = computeRefrigerationOutageHoldover({ entered_heat_gain_btuh: 1000, product_lb: 100, product_cp_btu_per_lb_degf: 0.9, product_start_degf: 0, allowable_degf: 10, box_degf: 0 });
  within(any.usda_check_leak_btuh, 256.25, 0.1, "the USDA rule of thumb in Btu/h");
});

// ---- pipe-freeze-time: lumped capacitance plus latent heat ----

test("pipe freeze: the water in a 0.785 in bore weighs 0.21 lb/ft and carries 1 Btu/lb-degF", () => {
  // Area = pi/4 x 0.785^2 = 0.4840 sq in = 0.003361 sq ft; x 62.4 lb/cu ft.
  const r = computePipeFreezeTime({ pipe_od_in: 0.875, pipe_id_in: 0.785, pipe_lb_per_ft: 0.455, insulation_thickness_in: 0.5, space_degf: 0 });
  const area_sqft = Math.PI / 4 * 0.785 ** 2 / 144;
  within(r.water_lb_per_ft, area_sqft * LB_PER_CF, 0.01, "water per foot");
  within(r.water_lb_per_ft, 0.2097, 0.5, "0.21 lb/ft by hand");
  // Copper's cp is 0.092 Btu/lb-degF; the tube adds m cp to the water's.
  within(r.heat_capacity_btu_per_degf_ft, r.water_lb_per_ft * 1.0 + 0.455 * 0.092, 1e-9, "water plus tube");
});

test("pipe freeze: the insulation UA matches a radial conduction resistance summed shell by shell", () => {
  for (const c of [
    { pipe_od_in: 0.875, insulation_thickness_in: 0.5, insulation_k: 0.25, surface_h_btuh_per_sqft_degf: 1.5 },
    { pipe_od_in: 2.375, insulation_thickness_in: 1.5, insulation_k: 0.27, surface_h_btuh_per_sqft_degf: 2.0 },
    { pipe_od_in: 4.5, insulation_thickness_in: 2, insulation_k: 0.23, surface_h_btuh_per_sqft_degf: 1.2 },
  ]) {
    const r = computePipeFreezeTime({ pipe_id_in: c.pipe_od_in * 0.9, pipe_lb_per_ft: 1, space_degf: 10, ...c });
    // Resistance of the insulation by adding up thin shells dr / (2 pi r k),
    // k converted from Btu-in/h-sq ft-degF to Btu/h-ft-degF.
    const r1 = c.pipe_od_in / 2 / 12, r2 = (c.pipe_od_in / 2 + c.insulation_thickness_in) / 12;
    const k = c.insulation_k / 12;
    const N = 200000;
    let R = 0;
    for (let i = 0; i < N; i++) {
      const rr = r1 + (i + 0.5) * (r2 - r1) / N;
      R += ((r2 - r1) / N) / (2 * Math.PI * rr * k);
    }
    const R_surface = 1 / (c.surface_h_btuh_per_sqft_degf * 2 * Math.PI * r2);
    within(r.ua_insulated_btuh_per_degf_ft, 1 / (R + R_surface), 0.01, "UA from the summed shells");
    within(r.ua_bare_btuh_per_degf_ft, c.surface_h_btuh_per_sqft_degf * 2 * Math.PI * r1, 1e-9, "bare UA is h x the pipe's own surface");
    within(r.loss_reduction_pct, 100 * (1 - r.ua_insulated_btuh_per_degf_ft / r.ua_bare_btuh_per_degf_ft), 1e-9, "loss reduction");
  }
  // Zero insulation has to collapse onto the bare pipe.
  const bare = computePipeFreezeTime({ pipe_od_in: 0.875, pipe_id_in: 0.785, pipe_lb_per_ft: 0.455, insulation_thickness_in: 0, space_degf: 0 });
  within(bare.ua_insulated_btuh_per_degf_ft, bare.ua_bare_btuh_per_degf_ft, 1e-9, "no insulation, no difference");
  within(bare.time_ratio, 1, 1e-9, "no delay");
  within(bare.loss_reduction_pct, 0, 1e-9, "no reduction");
});

test("pipe freeze: the onset and the latent stage match a stepped cool-down and a 143.5 Btu/lb ice balance", () => {
  for (const c of [
    { pipe_od_in: 0.875, pipe_id_in: 0.785, pipe_lb_per_ft: 0.455, insulation_thickness_in: 0.5, water_start_degf: 55, space_degf: 0 },
    { pipe_od_in: 2.375, pipe_id_in: 2.157, pipe_lb_per_ft: 2.5, insulation_thickness_in: 1, water_start_degf: 45, space_degf: 20 },
  ]) {
    const r = computePipeFreezeTime(c);
    // Stage 1: C dT/dt = -UA (T - space) until 32 degF.
    let T = c.water_start_degf, t = 0;
    const dt = 0.0002;
    while (T > 32 && t < 1e4) { T += dt * (-r.ua_insulated_btuh_per_degf_ft * (T - c.space_degf)) / r.heat_capacity_btu_per_degf_ft; t += dt; }
    within(r.onset_insulated_hours, t, 0.5, "hours to 32 degF");
    // Stage 2: the latent heat of fusion, 143.5 Btu/lb, leaving at UA x (32 - space).
    const latent = r.water_lb_per_ft * 143.5;
    within(r.freeze_stage_insulated_hours, latent / (r.ua_insulated_btuh_per_degf_ft * (32 - c.space_degf)), 1e-6, "freezing-solid stage");
    within(r.solid_insulated_hours, r.onset_insulated_hours + r.freeze_stage_insulated_hours, 1e-9, "the two stages add");
    // Both stages scale as 1/UA, so the bare and insulated totals keep the UA ratio.
    within(r.solid_insulated_hours / r.solid_bare_hours, r.time_ratio, 1e-9, "time ratio is the UA ratio");
  }
  // At or above freezing nothing freezes.
  const warm = computePipeFreezeTime({ pipe_od_in: 0.875, pipe_id_in: 0.785, pipe_lb_per_ft: 0.455, insulation_thickness_in: 0.5, water_start_degf: 55, space_degf: 32 });
  assert.equal(warm.freezes, false);
  assert.equal(warm.onset_insulated_hours, null);
  assert.equal(warm.solid_bare_hours, null);
});

// ===================== calc-usar.js =====================

test("picket anchor: the table's own shape -- bigger picket, better soil, more hold; cohesionless holds almost nothing", () => {
  const cap = (dia, soil) => computePicketAnchorSoil({ required_force_lb: 1, picket_dia: dia, soil }).design_load_per_picket_lb;
  for (const dia of ["1", "3"]) {
    assert.ok(cap(dia, "cohesive_poor") < cap(dia, "cohesive_average"), "average beats poor");
    assert.ok(cap(dia, "cohesive_average") < cap(dia, "cohesive_good"), "good beats average");
    assert.ok(cap(dia, "cohesionless_loose") < cap(dia, "cohesionless_medium"), "medium beats loose");
    assert.ok(cap(dia, "cohesionless_medium") < cap(dia, "cohesionless_dense"), "dense beats medium");
    for (const soil of ["cohesive_poor", "cohesive_average", "cohesive_good"]) {
      assert.ok(cap("3", soil) >= 2 * cap("1", soil) - 1e-9, "the 3 in picket at least doubles the 1 in");
    }
    assert.ok(cap(dia, "cohesive_poor") > 5 * cap(dia, "cohesionless_dense"), "cohesive soil holds many times what sand does");
  }
  assert.equal(computePicketAnchorSoil({ required_force_lb: 1, picket_dia: "1", soil: "cohesive_average" }).cohesionless, false);
  assert.equal(computePicketAnchorSoil({ required_force_lb: 1, picket_dia: "1", soil: "cohesionless_dense" }).cohesionless, true);
});

test("picket anchor: the count is the fewest pickets that carry the load, and one fewer would not", () => {
  for (const force of [1, 749, 750, 751, 1520, 3000, 4500.5]) {
    for (const dia of ["1", "3"]) {
      for (const soil of ["cohesive_poor", "cohesive_average", "cohesionless_loose"]) {
        const r = computePicketAnchorSoil({ required_force_lb: force, picket_dia: dia, soil });
        assert.ok(r.group_capacity_lb >= force - 1e-9, `${force} lb is carried`);
        assert.ok((r.pickets_required - 1) * r.design_load_per_picket_lb < force - 1e-9, `${force} lb needs them all`);
        within(r.group_capacity_lb, r.pickets_required * r.design_load_per_picket_lb, 1e-9, "group capacity");
      }
    }
  }
  // 1,520 lb on 1 in pickets in average cohesive soil (750 lb each) is three.
  assert.equal(computePicketAnchorSoil({ required_force_lb: 1520, picket_dia: "1", soil: "cohesive_average" }).pickets_required, 3);
  // An exact multiple does not buy a spare: 1,500 / 750 = 2.
  assert.equal(computePicketAnchorSoil({ required_force_lb: 1500, picket_dia: "1", soil: "cohesive_average" }).pickets_required, 2);
  const std = computePicketAnchorSoil({ required_force_lb: 1520, picket_dia: "1", soil: "cohesive_average" });
  within(std.standard_pattern_capacity_lb / std.design_load_per_picket_lb, 6, 1e-9, "the standard pattern is six pickets");
  assert.equal(std.beyond_standard_pattern, false);
  assert.equal(computePicketAnchorSoil({ required_force_lb: 9000, picket_dia: "1", soil: "cohesive_average" }).beyond_standard_pattern, true);
});

test("picket anchor: the 36 in embedment is the table's basis and shallower is flagged", () => {
  assert.equal(computePicketAnchorSoil({ required_force_lb: 1000, embedment_in: 35.9 }).shallow, true);
  assert.equal(computePicketAnchorSoil({ required_force_lb: 1000, embedment_in: 36 }).shallow, false);
  assert.equal(computePicketAnchorSoil({ required_force_lb: 1000, embedment_in: 48 }).shallow, false);
});

test("relief storage: the pressure under a stack in psf equals the same load worked in psi x 144", () => {
  // 2,300 lb pallets, 48 x 40 in footprint, two high: 4,600 lb on 1,920 sq in
  // is 2.396 psi, which is 345 psf.
  const r = computeReliefStorageFloorLoad({ pallet_weight_lb: 2300, footprint_length_in: 48, footprint_width_in: 40, tiers: 2, coverage_fraction: 0.6, floor_area_sqft: 4800, design_live_load_psf: 100 });
  within(r.footprint_area_sqft, 48 * 40 / 144, 1e-9, "footprint in sq ft");
  within(r.footprint_area_sqft, 13.3333, 0.01, "13.33 sq ft");
  within(r.stack_weight_lb, 4600, 1e-9, "two tiers");
  within(r.footprint_psf, 4600 / 1920 * 144, 1e-9, "psi x 144");
  within(r.footprint_psf, 345, 0.01, "345 psf by hand");
  within(r.average_psf, 345 * 0.6, 0.01, "207 psf averaged over the bay");
  within(r.footprint_ratio, 3.45, 0.01, "3.45 times a 100 psf floor");
});

test("relief storage: the stacks that fit, weighed over the whole floor, give back the average pressure", () => {
  for (const c of [
    { pallet_weight_lb: 2300, footprint_length_in: 48, footprint_width_in: 40, tiers: 2, coverage_fraction: 0.6, floor_area_sqft: 4800, design_live_load_psf: 100 },
    { pallet_weight_lb: 1500, footprint_length_in: 48, footprint_width_in: 48, tiers: 3, coverage_fraction: 0.5, floor_area_sqft: 10000, design_live_load_psf: 125 },
  ]) {
    const r = computeReliefStorageFloorLoad(c);
    // The positions that fit, each carrying a full stack, spread over the floor.
    const spread = r.stack_positions * r.stack_weight_lb / c.floor_area_sqft;
    assert.ok(spread <= r.average_psf + 1e-6, "the whole-floor average is not exceeded by the positions that fit");
    within(spread, r.average_psf, 1, "position count reproduces the average pressure");
    // The allowances are the design load's own capacity, and stacking cannot beat it.
    assert.ok(r.pallets_allowed * c.pallet_weight_lb <= c.floor_area_sqft * c.design_live_load_psf + 1e-6, "pallets allowed fit the live load");
    assert.ok(r.stacks_allowed * r.stack_weight_lb <= c.floor_area_sqft * c.design_live_load_psf + 1e-6, "stacks allowed fit the live load");
    assert.equal(r.stacks_allowed, Math.floor(r.pallets_allowed / c.tiers + 1e-9), "stacking does not change the total weight the floor takes");
    within(r.average_ratio / r.footprint_ratio, c.coverage_fraction, 1e-9, "the two ratios differ only by coverage");
  }
  // Exactly at the design load the verdict is still "within".
  const edge = computeReliefStorageFloorLoad({ pallet_weight_lb: 1000, footprint_length_in: 48, footprint_width_in: 48, tiers: 1, coverage_fraction: 1, floor_area_sqft: 1000, design_live_load_psf: 62.5 });
  within(edge.footprint_psf, 62.5, 1e-9, "1,000 lb on 16 sq ft");
  within(edge.average_ratio, 1, 1e-9, "exactly at the limit");
  assert.match(edge.average_verdict, /within/);
});

// ===================== calc-treatment.js =====================

test("pool tile and coping: the waterline is a closed loop -- 96 ft of perimeter at 6 in is exactly 192 tiles", () => {
  const r = computePoolTileCopingPerimeter({ length_ft: 32, width_ft: 16, tile_length_in: 6, courses: 1, coping_length_in: 12, waste_pct: 0 });
  within(r.perimeter_ft, 96, 1e-9, "2(32 + 16)");
  assert.equal(r.waterline_tiles, 192, "two 6 in tiles per foot, no fencepost extra on a closed loop");
  assert.equal(r.coping_units, 96, "one 12 in coping unit per foot");
  // Two courses is twice the tile; waste rounds up to the next whole piece.
  assert.equal(computePoolTileCopingPerimeter({ length_ft: 32, width_ft: 16, tile_length_in: 6, courses: 2, coping_length_in: 12, waste_pct: 0 }).waterline_tiles, 384);
  assert.equal(computePoolTileCopingPerimeter({ length_ft: 32, width_ft: 16, tile_length_in: 6, courses: 1, coping_length_in: 12, waste_pct: 10 }).waterline_tiles, 212); // 211.2
  assert.equal(computePoolTileCopingPerimeter({ length_ft: 32, width_ft: 16, tile_length_in: 6, courses: 1, coping_length_in: 12, waste_pct: 10 }).coping_units, 106); // 105.6
});

test("pool tile and coping: the counts cover the run they are bought for", () => {
  for (const c of [
    { length_ft: 20, width_ft: 10, tile_length_in: 7, coping_length_in: 18, waste_pct: 0 },
    { length_ft: 41.5, width_ft: 17.25, tile_length_in: 4, coping_length_in: 24, waste_pct: 12 },
    { length_ft: 8, width_ft: 8, tile_length_in: 12, coping_length_in: 12, waste_pct: 0 },
  ]) {
    const r = computePoolTileCopingPerimeter({ courses: 1, ...c });
    within(r.perimeter_ft, 2 * (c.length_ft + c.width_ft), 1e-9, "perimeter");
    assert.ok(r.waterline_tiles * (c.tile_length_in / 12) >= r.perimeter_ft - 1e-9, "the tile reaches around");
    assert.ok(r.coping_units * (c.coping_length_in / 12) >= r.perimeter_ft - 1e-9, "the coping reaches around");
  }
});

test("pool interior finish: the wetted area is the floor plus four walls, and the finishes are that area times a thickness", () => {
  // 30 x 15 pool, 5.5 ft average: floor 450 sq ft + walls 2(30 + 15) x 5.5 =
  // 495 sq ft, so 945 sq ft of interior.
  const r = computePoolInteriorFinishVolume({ length_ft: 30, width_ft: 15, avg_depth_ft: 5.5, shell_thickness_in: 8, plaster_thickness_in: 0.375, waste_pct: 15 });
  within(r.interior_area_sf, 945, 1e-9, "floor plus perimeter walls");
  // Plaster 3/8 in over 945 sq ft = 29.53 cu ft = 1.094 cu yd, neat.
  within(r.plaster_cy, 945 * (0.375 / 12) / 27, 1e-9, "plaster volume");
  within(r.plaster_cy, 1.0938, 0.1, "1.09 cu yd by hand");
  // Gunite 8 in = 630 cu ft = 23.33 cu yd neat, plus 15% rebound = 26.83.
  within(r.gunite_cy, 23.3333 * 1.15, 0.01, "shell with rebound");
  // Documented: the waste allowance is gunite rebound, so plaster is neat.
  const no_waste = computePoolInteriorFinishVolume({ length_ft: 30, width_ft: 15, avg_depth_ft: 5.5, shell_thickness_in: 8, plaster_thickness_in: 0.375, waste_pct: 0 });
  within(no_waste.plaster_cy, r.plaster_cy, 1e-9, "plaster carries no rebound allowance");
  within(r.gunite_cy / no_waste.gunite_cy, 1.15, 1e-9, "rebound applies to the shell only");
  // A 10 x 10 pool 1 ft deep: 100 + 2(20)(1) = 140 sq ft.
  within(computePoolInteriorFinishVolume({ length_ft: 10, width_ft: 10, avg_depth_ft: 1, shell_thickness_in: 6, plaster_thickness_in: 0.5, waste_pct: 0 }).interior_area_sf, 140, 1e-9, "small-pool area by hand");
});

test("particle settling: Stokes' law re-derived from the force balance by root-finding, with published water properties", () => {
  // Buoyant weight (pi/6) d^3 (rho_p - rho_w) g balanced against Stokes drag
  // 3 pi mu d v. Water at 20 C: mu = 1.002e-3 N s/m^2, rho = 998.2 kg/m^3
  // (CRC / Davis & Cornwell table values, not the tile's correlation).
  const mu = 1.002e-3, rho_w = 998.2, g = 9.81;
  for (const d_mm of [0.01, 0.05, 0.1]) {
    const d = d_mm / 1000, rho_p = 2650;
    const net = (v) => (Math.PI / 6) * d ** 3 * (rho_p - rho_w) * g - 3 * Math.PI * mu * d * v;
    let lo = 0, hi = 10;
    for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (net(mid) > 0) lo = mid; else hi = mid; }
    const v_ref = (lo + hi) / 2;
    const r = computeParticleSettlingVelocity({ particle_diameter_mm: d_mm, particle_sg: 2.65, water_temp_f: 68 });
    within(r.settling_velocity_mm_s, v_ref * 1000, 1.5, `settling velocity at ${d_mm} mm`);
    within(r.reynolds, rho_w * v_ref * d / mu, 2, `Reynolds number at ${d_mm} mm`);
    within(r.settling_velocity_ft_min, v_ref * 3.28084 * 60, 1.5, "the same velocity in ft/min");
  }
  // 0.1 mm quartz sand at 20 C settles about 0.9 cm/s -- the standard table value.
  within(computeParticleSettlingVelocity({ particle_diameter_mm: 0.1, particle_sg: 2.65, water_temp_f: 68 }).settling_velocity_mm_s, 8.98, 3, "0.1 mm sand");
});

test("particle settling: the viscosity correlation reproduces the published table at 10, 20 and 30 C", () => {
  // Invert Stokes on the returned velocity to recover the viscosity the tile
  // used: mu = g (rho_p - rho_w) d^2 / (18 v). Table: 1.307e-3 at 10 C,
  // 1.002e-3 at 20 C, 0.798e-3 at 30 C N s/m^2.
  const d = 1e-5; // 0.01 mm, deep in the laminar regime
  for (const [f, mu_pub, rho_pub] of [[50, 1.307e-3, 999.7], [68, 1.002e-3, 998.2], [86, 0.798e-3, 995.65]]) {
    const v = computeParticleSettlingVelocity({ particle_diameter_mm: 0.01, particle_sg: 2.65, water_temp_f: f }).settling_velocity_mm_s / 1000;
    const mu_implied = 9.81 * (2650 - rho_pub) * d * d / (18 * v);
    within(mu_implied, mu_pub, 1.5, `viscosity at ${f} F`);
  }
});

test("particle settling: the regime labels follow the Reynolds number, and hindered settling only slows it", () => {
  for (const d_mm of [0.005, 0.05, 0.1, 0.5, 2, 10]) {
    const r = computeParticleSettlingVelocity({ particle_diameter_mm: d_mm, particle_sg: 2.65, water_temp_f: 68 });
    if (r.reynolds < 1) assert.match(r.regime, /Stokes \(laminar\)/);
    else if (r.reynolds <= 1000) assert.match(r.regime, /transition/);
    else assert.match(r.regime, /Newton/);
  }
  const free = computeParticleSettlingVelocity({ particle_diameter_mm: 0.05, particle_sg: 2.65, water_temp_f: 68, solids_volume_pct: 0 });
  within(free.hindered_velocity_mm_s, free.settling_velocity_mm_s, 1e-9, "no solids, no hindrance");
  let prev = free.hindered_velocity_mm_s;
  for (const pct of [1, 5, 10, 25, 50]) {
    const r = computeParticleSettlingVelocity({ particle_diameter_mm: 0.05, particle_sg: 2.65, water_temp_f: 68, solids_volume_pct: pct });
    assert.ok(r.hindered_velocity_mm_s < prev, `hindered settling falls at ${pct}% solids`);
    within(r.settling_velocity_mm_s, free.settling_velocity_mm_s, 1e-9, "the free velocity is unchanged");
    prev = r.hindered_velocity_mm_s;
  }
  // Richardson-Zaki at 10% solids with n = 4.65 is 0.9^4.65 = 0.613 of free settling.
  const rz = computeParticleSettlingVelocity({ particle_diameter_mm: 0.01, particle_sg: 2.65, water_temp_f: 68, solids_volume_pct: 10 });
  assert.equal(rz.richardson_zaki_n, 4.65, "Re < 0.2 uses n = 4.65");
  within(rz.hindered_velocity_mm_s / rz.settling_velocity_mm_s, Math.pow(0.9, 4.65), 1e-9, "0.613");
});

// ===================== calc-drainage.js =====================

test("partial pipe flow: the depth comes back through the exact circular-segment area and by integration", () => {
  for (const c of [
    { d_in: 8, slope: 0.02, flow_gpm: 150, material: "pvc" },
    { d_in: 4, slope: 0.0104, flow_gpm: 30, material: "pvc" },
    { d_in: 24, slope: 0.005, flow_gpm: 3000, material: "concrete" },
    { d_in: 12, slope: 0.01, flow_gpm: 40, material: "cast_iron" },
  ]) {
    const r = computePipePartialFlowDepth(c);
    const D = c.d_in / 12, R = D / 2, h = r.depth_in / 12;
    // Exact segment area from the depth alone: R^2 acos((R-h)/R) - (R-h) sqrt(2Rh - h^2).
    const seg = R * R * Math.acos((R - h) / R) - (R - h) * Math.sqrt(2 * R * h - h * h);
    within(r.a_ft2, seg, 0.01, "flow area from the depth");
    // And by integrating the chord width from the invert up to the surface.
    const N = 200000;
    let area = 0;
    for (let i = 0; i < N; i++) {
      const y = (i + 0.5) * h / N;
      area += 2 * Math.sqrt(Math.max(0, R * R - (R - y) ** 2)) * (h / N);
    }
    within(r.a_ft2, area, 0.05, "flow area by integration");
    // Wetted perimeter from the same depth: D acos((R - h)/R).
    const P = D * Math.acos((R - h) / R);
    within(r.r_ft, seg / P, 0.05, "hydraulic radius");
    // Manning on the independently measured section must give back the flow asked for.
    const q_cfs = 1.486 / r.n * seg * Math.pow(seg / P, 2 / 3) * Math.sqrt(c.slope);
    within(q_cfs * 60 * GAL_PER_CF, c.flow_gpm, 0.5, "the depth carries the entered flow");
    within(r.v_fps, c.flow_gpm / (60 * GAL_PER_CF) / r.a_ft2, 1e-6, "velocity is flow over area");
    within(r.d_over_d, r.depth_in / c.d_in, 1e-9, "relative depth");
    within(r.shear_psf, 62.4 * r.r_ft * c.slope, 1e-9, "tractive stress gamma R S");
  }
});

test("partial pipe flow: full-barrel capacity, and the published 0.938 and 0.81 maxima", () => {
  const r = computePipePartialFlowDepth({ d_in: 8, slope: 0.02, flow_gpm: 150, material: "pvc" });
  // Full bore: A = pi D^2/4, R = D/4 -- the closed form the handbooks print.
  const D = 8 / 12, A = Math.PI * D * D / 4, Rh = D / 4;
  const q_full = 1.486 / 0.009 * A * Math.pow(Rh, 2 / 3) * Math.sqrt(0.02);
  within(r.q_full_gpm, q_full * 60 * GAL_PER_CF, 0.01, "full-flow capacity");
  within(r.pct_full, 150 / r.q_full_gpm * 100, 0.01, "percent of full flow");
  // Maximum discharge at d/D = 0.938 and maximum velocity at d/D = 0.81.
  within(r.d_over_d_at_max_q, 0.938, 0.5, "d/D at maximum Q");
  within(r.d_over_d_at_max_v, 0.8128, 0.5, "d/D at maximum V");
  assert.ok(r.q_max_gpm > r.q_full_gpm, "a pipe flowing at 94% carries more than a full one");
  within(r.q_max_gpm / r.q_full_gpm, 1.076, 1, "the 7.6% bulge the handbook curve shows");
  // Past the maximum the tile refuses rather than returning the wrong root.
  assert.ok(computePipePartialFlowDepth({ d_in: 8, slope: 0.02, flow_gpm: r.q_max_gpm * 1.01, material: "pvc" }).error);
});

test("partial pipe flow: deeper water carries more, and the 2 fps self-cleansing flag follows the velocity", () => {
  let prev = 0;
  for (const q of [10, 25, 60, 150, 300, 500]) {
    const r = computePipePartialFlowDepth({ d_in: 8, slope: 0.02, flow_gpm: q, material: "pvc" });
    assert.ok(r.depth_in > prev, `depth rises with flow at ${q} gpm`);
    prev = r.depth_in;
    assert.equal(r.self_cleansing, r.v_fps >= 2 - 1e-9, "the flag is the 2 fps rule");
  }
  // A rougher pipe runs deeper and slower at the same flow and slope.
  const pvc = computePipePartialFlowDepth({ d_in: 8, slope: 0.01, flow_gpm: 150, material: "pvc" });
  const cmp = computePipePartialFlowDepth({ d_in: 8, slope: 0.01, flow_gpm: 150, material: "corrugated_metal" });
  assert.ok(cmp.depth_in > pvc.depth_in, "corrugated metal runs deeper");
  assert.ok(cmp.v_fps < pvc.v_fps, "and slower");
});

// ===================== calc-septic.js =====================

test("leach field aggregate: three 60 ft trenches 24 in wide and 12 in deep hold 360 cu ft of stone", () => {
  // 3 x 60 x 2 x 1 = 360 cu ft = 13.33 cu yd neat; +10% waste = 14.67 cu yd.
  const r = computeLeachFieldAggregate({ num_trenches: 3, trench_length_ft: 60, trench_width_in: 24, stone_depth_in: 12, waste_pct: 10 });
  within(r.stone_cf, 360, 1e-9, "trench volume by hand");
  within(r.stone_cy, 360 / 27 * 1.1, 1e-9, "cubic yards with waste");
  within(r.stone_cy, 14.667, 0.01, "14.67 cu yd");
  // 1.4 tons per cu yd is 2,800 lb / 27 cu ft = 104 pcf, in the published
  // 95-110 pcf range for washed drain rock.
  const pcf = r.stone_tons / r.stone_cy * 2000 / 27;
  assert.ok(pcf > 95 && pcf < 110, `drain-rock density ${pcf} pcf is a published value`);
  within(r.stone_tons, r.stone_cy * 1.4, 1e-9, "tons from cubic yards");
});

test("leach field aggregate: the volume is linear in every dimension and the waste is a clean multiplier", () => {
  const base = { num_trenches: 3, trench_length_ft: 60, trench_width_in: 24, stone_depth_in: 12, waste_pct: 0 };
  const r = computeLeachFieldAggregate(base);
  for (const k of ["num_trenches", "trench_length_ft", "trench_width_in", "stone_depth_in"]) {
    const d = computeLeachFieldAggregate({ ...base, [k]: base[k] * 2 });
    within(d.stone_cf / r.stone_cf, 2, 1e-9, `doubling ${k} doubles the stone`);
  }
  within(computeLeachFieldAggregate({ ...base, waste_pct: 25 }).stone_cy / r.stone_cy, 1.25, 1e-9, "waste multiplier");
  within(r.stone_cy * 27, r.stone_cf, 1e-9, "27 cu ft in a cu yd");
});

// ===================== calc-reliefwater.js =====================

test("responder camp: OSHA 1910.142 ratios hand-counted at their boundaries", () => {
  // Toilets 1 per 15 of each sex with a 2-unit floor; urinals 1 per 25 men with
  // 2 ft of trough each; wash basins 1 per 6; shower heads 1 per 10; laundry
  // trays 1 per 30; drinking fountains 1 per 100 where water is under pressure.
  const r = computeResponderCampSanitation({ men_count: 30, women_count: 10, pressure_water: "yes" });
  assert.equal(r.toilets_men, 2);
  assert.equal(r.toilets_women, 2, "10 women still get the two-unit minimum");
  assert.equal(r.toilets_total, 4);
  assert.equal(r.urinals, 2);
  within(r.urinal_trough_ft, 4, 1e-9, "2 ft per urinal");
  assert.equal(r.handwash_basins, 7, "40 / 6 = 6.67");
  assert.equal(r.showerheads, 4);
  assert.equal(r.laundry_trays, 2, "40 / 30 = 1.33");
  assert.equal(r.drinking_fountains, 1);
  assert.equal(r.total_occupants, 40);
  // Boundaries: 15 men is one by ratio but two by the minimum; 16 is two; 31 is three.
  assert.equal(computeResponderCampSanitation({ men_count: 15, women_count: 0 }).toilets_men, 2);
  assert.equal(computeResponderCampSanitation({ men_count: 16, women_count: 0 }).toilets_men, 2);
  assert.equal(computeResponderCampSanitation({ men_count: 31, women_count: 0 }).toilets_men, 3);
  assert.equal(computeResponderCampSanitation({ men_count: 0, women_count: 20 }).toilets_men, 0, "a sex not housed gets none");
  assert.equal(computeResponderCampSanitation({ men_count: 25, women_count: 0 }).urinals, 1);
  assert.equal(computeResponderCampSanitation({ men_count: 26, women_count: 0 }).urinals, 2);
  assert.equal(computeResponderCampSanitation({ men_count: 60, women_count: 60, pressure_water: "no" }).drinking_fountains, 0, "no pressure, no fountains");
});

test("responder camp: 35 gal per person per day, a 2.5 peaking factor, and 50 sq ft of sleeping area each", () => {
  for (const [m, w] of [[1, 0], [30, 10], [120, 80]]) {
    const r = computeResponderCampSanitation({ men_count: m, women_count: w, pressure_water: "yes" });
    const n = m + w;
    within(r.water_gal_per_day, 35 * n, 1e-9, "daily demand");
    within(r.average_gph, 35 * n / 24, 1e-9, "averaged over 24 h");
    within(r.peak_gph, 2.5 * 35 * n / 24, 1e-9, "peak hour");
    within(r.peak_gpm, r.peak_gph / 60, 1e-9, "peak in gpm");
    within(r.sleeping_area_sqft, 50 * n, 1e-9, "sleeping area");
    // Per-sex toilets are never fewer than the whole-camp ratio would ask for.
    assert.ok(r.toilets_total >= r.whole_camp_ratio, "splitting by sex never reduces the count");
  }
});

// ===================== calc-field.js =====================

test("litter carry: 1.5 mi at 1.0 mph with two six-carrier teams is 90 min, 14 people, 21 person-hours, 9 rotations", () => {
  const r = computeLitterCarryTeam({ distance_mi: 1.5, pace_mph: 1.0, carriers_per_litter: 6, duty_fraction: 0.5, rotation_interval_min: 10, support_personnel: 2 });
  within(r.carry_time_hr, 1.5, 1e-9, "distance over pace");
  within(r.carry_time_min, 90, 1e-9, "in minutes");
  assert.equal(r.teams_needed, 2);
  assert.equal(r.carriers_needed, 12);
  assert.equal(r.total_personnel, 14);
  within(r.person_hours, 21, 1e-9, "14 people for 1.5 h");
  within(r.rotations, 9, 1e-9, "90 min at 10 min each");
});

test("litter carry: the team count is the fewest whole teams that cover a full duty cycle", () => {
  for (const [duty, teams] of [[1, 1], [0.75, 2], [0.5, 2], [0.4, 3], [1 / 3, 3], [0.3, 4], [0.25, 4], [0.2, 5]]) {
    const r = computeLitterCarryTeam({ distance_mi: 1, pace_mph: 1, duty_fraction: duty });
    assert.equal(r.teams_needed, teams, `duty ${duty}`);
    assert.ok(r.teams_needed * duty >= 1 - 1e-9, "the teams together cover the whole carry");
    assert.ok((r.teams_needed - 1) * duty < 1 - 1e-9, "one team fewer would not");
  }
});

test("litter carry: person-hours close on the head count, and halving the pace doubles the cost", () => {
  for (const c of [
    { distance_mi: 1.5, pace_mph: 1.0, carriers_per_litter: 6, duty_fraction: 0.5, rotation_interval_min: 10, support_personnel: 2 },
    { distance_mi: 4.2, pace_mph: 0.6, carriers_per_litter: 8, duty_fraction: 1 / 3, rotation_interval_min: 15, support_personnel: 5 },
  ]) {
    const r = computeLitterCarryTeam(c);
    within(r.person_hours, r.total_personnel * r.carry_time_hr, 1e-9, "person-hours close");
    within(r.total_personnel, r.carriers_needed + c.support_personnel, 1e-9, "head count");
    within(r.rotations, r.carry_time_min / c.rotation_interval_min, 1e-9, "rotations");
    const slow = computeLitterCarryTeam({ ...c, pace_mph: c.pace_mph / 2 });
    within(slow.carry_time_hr / r.carry_time_hr, 2, 1e-9, "half the pace, twice the time");
    within(slow.person_hours / r.person_hours, 2, 1e-9, "and twice the person-hours");
    assert.equal(slow.teams_needed, r.teams_needed, "the pace does not change the staffing pattern");
  }
});

// ===================== calc-fire.js =====================

test("PPV: the clearing time matches a time-stepped dilution of a perfectly mixed room", () => {
  // dC/dt = -(Q_eff / V) C. Walk it and read off when C / C0 falls to the target.
  for (const c of [
    { volume_cf: 18000, fan_cfm: 12000, entrainment_efficiency: 0.6, remaining_fraction: 0.10 },
    { volume_cf: 42000, fan_cfm: 9000, entrainment_efficiency: 0.5, remaining_fraction: 0.01 },
    { volume_cf: 3200, fan_cfm: 14000, entrainment_efficiency: 0.7, remaining_fraction: 0.25 },
  ]) {
    const r = computePpvFanSizing({ ...c, target_time_min: 0 });
    const q_eff = c.fan_cfm * c.entrainment_efficiency;
    let C = 1, t = 0;
    const dt = 0.0005;
    while (C > c.remaining_fraction && t < 1e5) { C += dt * (-(q_eff / c.volume_cf) * C); t += dt; }
    within(r.clearing_min, t, 0.2, "clearing time from the stepped dilution");
    within(r.effective_cfm, q_eff, 1e-9, "effective flow");
    within(r.air_change_min, c.volume_cf / q_eff, 1e-9, "minutes per air change");
  }
});

test("PPV: dilution, not displacement -- one air change leaves 1/e, 90% clear takes 2.3 changes and 99% takes 4.6", () => {
  const base = { volume_cf: 18000, fan_cfm: 12000, entrainment_efficiency: 0.6, target_time_min: 0 };
  within(computePpvFanSizing({ ...base, remaining_fraction: Math.exp(-1) }).air_changes_needed, 1, 1e-9, "one air change removes 63%");
  within(computePpvFanSizing({ ...base, remaining_fraction: 0.10 }).air_changes_needed, 2.3026, 0.01, "90% clear");
  within(computePpvFanSizing({ ...base, remaining_fraction: 0.01 }).air_changes_needed, 4.6052, 0.01, "99% clear");
  // Getting from 90% to 99% costs as long again as reaching 90% did.
  const ten = computePpvFanSizing({ ...base, remaining_fraction: 0.10 });
  const one = computePpvFanSizing({ ...base, remaining_fraction: 0.01 });
  within(one.clearing_min - ten.clearing_min, ten.clearing_min, 0.01, "the second decade costs the same as the first");
  within(ten.air_change_min, 2.5, 1e-9, "18,000 cu ft at 7,200 effective cfm");
  within(ten.clearing_min, 5.757, 0.1, "5.8 min to 90% clear");
  // Halving the effective flow doubles the time: the opening, not the fan.
  within(computePpvFanSizing({ ...base, entrainment_efficiency: 0.3, remaining_fraction: 0.10 }).clearing_min, 2 * ten.clearing_min, 1e-9, "half the effective flow, twice the time");
});

test("PPV: the fan the target time asks for, fed back in, clears in exactly that time", () => {
  for (const target of [3, 5.8, 12]) {
    const r = computePpvFanSizing({ volume_cf: 18000, fan_cfm: 12000, entrainment_efficiency: 0.6, remaining_fraction: 0.10, target_time_min: target });
    const back = computePpvFanSizing({ volume_cf: 18000, fan_cfm: r.required_cfm, entrainment_efficiency: 0.6, remaining_fraction: 0.10, target_time_min: 0 });
    within(back.clearing_min, target, 1e-6, `round trip at ${target} min`);
  }
  assert.equal(computePpvFanSizing({ volume_cf: 18000, fan_cfm: 12000, entrainment_efficiency: 0.6, remaining_fraction: 0.10, target_time_min: 0 }).required_cfm, null, "no target, no required fan");
});
