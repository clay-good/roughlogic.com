// calc-masonry.js against references the specs did not write. The
// worked-example fixture recomputes each spec's own example, so a spec and its
// tile that share an error agree with each other; these tests hold the tiles
// to conservation and to the conventions their notes claim.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMasonryCleaningDilution } from "../../calc-masonry.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};

// ---- masonry-cleaning-dilution: mass balance on the mix ----

const MCD_CASES = [
  { area_ft2: 2400, dilution_parts_water: 5, coverage_ft2_per_gal: 150, prewet_gal_per_100ft2: 5, rinse_gal_per_100ft2: 12, acid_safe_unit: 1 },
  { area_ft2: 875, dilution_parts_water: 12, coverage_ft2_per_gal: 90, prewet_gal_per_100ft2: 3.5, rinse_gal_per_100ft2: 8, acid_safe_unit: 1 },
  { area_ft2: 10000, dilution_parts_water: 0.5, coverage_ft2_per_gal: 200, prewet_gal_per_100ft2: 0, rinse_gal_per_100ft2: 20, acid_safe_unit: 0 },
];

test("masonry cleaning: the mix closes -- concentrate plus water is the diluted volume, in the ratio 1 : N", () => {
  for (const c of MCD_CASES) {
    const r = computeMasonryCleaningDilution(c);
    within(r.concentrate_gal + r.water_gal, r.diluted_gal, 1e-9, "volume conserved");
    within(r.water_gal / r.concentrate_gal, c.dilution_parts_water, 1e-9, "parts water per part concentrate");
    within(r.diluted_gal * c.coverage_ft2_per_gal, c.area_ft2, 1e-9, "the diluted volume covers exactly the area");
  }
});

test("masonry cleaning: the active ingredient balances -- C1 V1 = C2 V2", () => {
  // A concentrate of strength S (any unit) diluted 1:N must leave S x V_conc of
  // active ingredient in the bucket, i.e. a mix strength of S x concentrate_pct/100.
  const S = 31.45; // e.g. 20 degree Baume muriatic acid, % HCl by weight (strength only scales)
  for (const c of MCD_CASES) {
    const r = computeMasonryCleaningDilution(c);
    within(S * r.concentrate_gal, (S * r.concentrate_pct / 100) * r.diluted_gal, 1e-9, "solute in = solute out");
  }
});

test("masonry cleaning: 1 part to N parts is 1/(N+1) of the mix -- the known special cases", () => {
  // Equal parts is half strength; 1:9 is a tenth; 1:3 is a quarter. Reading
  // 1:N as 1/N (the error the note warns of) would give 100%, 11.1% and 33.3%.
  const base = { area_ft2: 100, coverage_ft2_per_gal: 100, prewet_gal_per_100ft2: 0, rinse_gal_per_100ft2: 0 };
  within(computeMasonryCleaningDilution({ ...base, dilution_parts_water: 1 }).concentrate_pct, 50, 1e-9, "1:1");
  within(computeMasonryCleaningDilution({ ...base, dilution_parts_water: 9 }).concentrate_pct, 10, 1e-9, "1:9");
  within(computeMasonryCleaningDilution({ ...base, dilution_parts_water: 3 }).concentrate_pct, 25, 1e-9, "1:3");
});

test("masonry cleaning: site water is the mix water plus the per-area prewet and rinse, and scales with the wall", () => {
  for (const c of MCD_CASES) {
    const r = computeMasonryCleaningDilution(c);
    const want = r.water_gal + (c.prewet_gal_per_100ft2 + c.rinse_gal_per_100ft2) * c.area_ft2 / 100;
    within(r.total_water_gal, want, 1e-9, "water balance");
    const r2 = computeMasonryCleaningDilution({ ...c, area_ft2: 3 * c.area_ft2 });
    for (const k of ["diluted_gal", "concentrate_gal", "water_gal", "prewet_gal", "rinse_gal", "total_water_gal"]) {
      if (r[k] > 0) within(r2[k] / r[k], 3, 1e-9, `${k} linear in area`);
    }
    within(r2.concentrate_pct, r.concentrate_pct, 1e-9, "strength independent of area");
  }
});

// spec-v1983: the hearth extension minimums, swept across opening sizes against the R1001.10 text.
import { computeHearthExtensionCheck as _hearth } from "../../calc-masonry.js";
test("hearth-extension-check: every opening from 12 to 60 in wide and 12 to 48 in tall gets the R1001.10 front and side for its area", () => {
  for (let w = 12; w <= 60; w += 2) for (let h = 12; h <= 48; h += 2) {
    const r = _hearth({ opening_width_in: w, opening_height_in: h });
    const big = w * h >= 864; // 6 sq ft = 864 sq in, worked in square inches
    assert.equal(r.req_front_in, big ? 20 : 16);
    assert.equal(r.req_side_in, big ? 12 : 8);
    assert.equal(r.footprint_width_in, w + (big ? 24 : 16));
  }
});
