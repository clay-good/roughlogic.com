// Two IRC rules the tiles had wrong under both the 2021 and 2024 editions
// (read in both printings 2026-10-17).
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeIceBarrierCoverage } from "../../calc-construction.js";
import { computeCrawlSpaceVentilation } from "../../calc-finish.js";

// R905.1.2: on a roof of 8:12 or steeper the ice barrier reaches at least 36 in
// along the slope from the eave, whatever the wall-line distance gives.
test("ice barrier: the 36 in steep-roof minimum applies from 8:12", () => {
  const steep = computeIceBarrierCoverage({ eave_length_ft: 40, overhang_in: 0, pitch_rise: 8 });
  assert.ok(Math.abs(steep.wall_line_in - 24 * Math.sqrt(64 + 144) / 12) < 1e-9); // 28.8 in
  assert.equal(steep.coverage_in, 36);
  assert.equal(steep.steep_min_applies, true);
  const shallow = computeIceBarrierCoverage({ eave_length_ft: 40, overhang_in: 0, pitch_rise: 7.99 });
  assert.ok(shallow.coverage_in < 36);
  const deep = computeIceBarrierCoverage({ eave_length_ft: 40, overhang_in: 24, pitch_rise: 8 });
  assert.ok(Math.abs(deep.coverage_in - 48 * Math.sqrt(208) / 12) < 1e-9); // already past 36
});

// R408.2: the 1/1500 reduction needs only the Class I vapor retarder (exception 1);
// with the retarder, cross ventilation lifts the corner rule (exception 2).
test("crawl space: the retarder alone gives 1/1500; cross ventilation lifts only the corner rule", () => {
  const ret = computeCrawlSpaceVentilation({ floor_area_sf: 1500, vapor_retarder: "yes" });
  assert.equal(ret.ratio_used, 1500);
  assert.equal(ret.vents_required, 4); // 3 by area, 4 corners govern
  const cross = computeCrawlSpaceVentilation({ floor_area_sf: 1500, vapor_retarder: "yes", cross_ventilated: "yes" });
  assert.equal(cross.corner_waived, true);
  assert.equal(cross.vents_required, 3);
  const small = computeCrawlSpaceVentilation({ floor_area_sf: 300, vapor_retarder: "yes", cross_ventilated: "yes" });
  assert.equal(small.vents_required, 2); // 1 by area, two to cross-ventilate
  const noRet = computeCrawlSpaceVentilation({ floor_area_sf: 1500, cross_ventilated: "yes" });
  assert.equal(noRet.corner_waived, false); // exception 2 needs the retarder too
  assert.equal(noRet.ratio_used, 150);
});
