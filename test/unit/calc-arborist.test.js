// calc-arborist.js (spec-v1675..v1679) against references the specs did not
// write: crown geometry integrated numerically, lever-arm statics on the cable,
// and the identities the tiles' notes claim. These tiles' only worked-example
// rows recompute their own specs.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeCrownReductionLeafArea, computeRootBallSizeWeight, computeTreeCablingRating,
  computeStumpGrindingVolume, computeSoilVolumeForCanopy,
} from "../../calc-arborist.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

test("crown reduction: the annulus removed, by a numeric integral of 2 pi r dr", () => {
  const r = computeCrownReductionLeafArea({ crown_radius_ft: 20, reduction_ft: 4, outer_third_leaf_share: 0.75, live_crown_cap_pct: 25 });
  let a = 0; const n = 20000;
  for (let i = 0; i < n; i++) { const rr = 16 + (i + 0.5) * 4 / n; a += 2 * Math.PI * rr * 4 / n; }
  within(r.area_removed_ft2, a, 1e-6, "annulus");
  close(r.area_removed_pct, 100 * (1 - 0.8 ** 2), "a fifth of the radius, 36% of the area");
  assert.ok(r.leaf_area_removed_pct > r.area_removed_pct, "the outer third carries more leaf");
});

test("cabling: the load at the tips, carried at a lower point, grows by the lever ratio", () => {
  const r = computeTreeCablingRating({ defect_to_tips_ft: 24, placement_fraction: 2 / 3, alternative_placement_ft: 8, design_load_lb: 1200, cable_rating_lb: 4000, termination_rating_lb: 3600, anchor_rating_lb: 2800, cable_count: 1 });
  close(r.force_at_placement_lb * 16, 1200 * 24, "moments about the defect");
  close(r.system_rating_lb, 2800, "the weakest component");
  close(r.force_multiple, 2, "half the height, twice the force");
});

test("root ball, stump and soil: volumes times density, swell, and the canopy's soil ratio", () => {
  const b = computeRootBallSizeWeight({ caliper_in: 6, ball_per_caliper_in: 10, depth_ratio: 0.65, soil_density_pcf: 105, handling_limit_lb: 2000 });
  close(b.ball_weight_lb, Math.PI / 4 * 25 * 3.25 * 105, "a 60 in ball, 39 in deep");
  const s = computeStumpGrindingVolume({ stump_diameter_in: 24, grind_diameter_in: 36, grind_depth_in: 12, swell_factor: 1.8, settlement_fraction: 0.3 });
  close(s.flare_multiple, 2.25, "the flare, as the diameter ratio squared");
  close(s.chip_volume_ft3, s.in_place_volume_ft3 * 1.8, "swell");
  const c = computeSoilVolumeForCanopy({ canopy_diameter_ft: 25, soil_per_canopy_ft3_per_ft2: 2, pit_length_ft: 5, pit_width_ft: 5, pit_depth_ft: 3, usable_fraction: 1 });
  close(c.soil_required_ft3, Math.PI / 4 * 625 * 2, "soil for the canopy");
  close(Math.PI / 4 * c.supported_canopy_ft ** 2 * 2, 75, "the canopy a 75 cu ft pit supports");
});
