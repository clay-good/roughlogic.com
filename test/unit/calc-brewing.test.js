// calc-brewing.js (spec-v1776..v1788) against references the specs did not
// write. The worked-example fixture recomputes each spec's own example, so a
// spec and its tile that share an error agree with each other; these tests
// hold the tiles to published tables and to the physical identities the notes
// claim (extract conserved through the boil, proof gallons twice the alcohol,
// an energy balance that closes).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeMashStrikeWater, computeSpargeWaterVolume, computeBrewhouseEfficiency,
  computeIbuTinseth, computeBeerColorSrm, computeYeastPitchRate, computeKettleBoilOff,
  computeCarbonationVolumesPressure, computeFermenterGlycolLoad, computeProofGallonYield,
  computePackagingYieldLoss, computeMashTunGrainBed, computeDryHopBeerLoss,
} from "../../calc-brewing.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

// ---- published tables ----

test("Tinseth utilization carries Tinseth's published constants", () => {
  // Tinseth's table (realbeer.com/hops/research.html) tabulates his own fit,
  // so this pins the constants rather than an independent measurement: 0.231
  // at 60 min and 0.177 at 30 min in 1.050 wort, 0.176 at 60 min in 1.080.
  const at = (sg, min) => computeIbuTinseth({
    batch_volume_gal: 5, hop_weight_lb: 0.1, alpha_acid_pct: 10, boil_minutes: min,
    boil_gravity: sg, short_boil_minutes: min, strong_boil_gravity: sg,
  }).utilization;
  within(at(1.05, 60), 0.231, 0.5, "1.050 / 60 min");
  within(at(1.05, 30), 0.177, 0.5, "1.050 / 30 min");
  within(at(1.08, 60), 0.176, 0.5, "1.080 / 60 min");
});

test("degrees Plato track the ASBC extract table within 1%", () => {
  // ASBC Table 1 (sucrose): 1.040 -> 9.99, 1.060 -> 14.74, 1.080 -> 19.32 degP.
  const plato = (sg) => computeYeastPitchRate({
    batch_volume_gal: 1, original_gravity: sg, pitch_rate_million_per_ml_plato: 1,
    slurry_cells_per_ml: 1e9, viability_pct: 100, aged_viability_pct: 100, strong_original_gravity: sg,
  }).plato;
  within(plato(1.04), 9.99, 1, "1.040");
  within(plato(1.06), 14.74, 1, "1.060");
  within(plato(1.08), 19.32, 1, "1.080");
});

test("carbonation agrees with the independent ASBC-table regression within 1.5%", () => {
  // The regression most brewing software carries, fitted separately to the
  // same solubility tables: psig = -16.6999 - 0.0101059 T + 0.00116512 T^2
  // + 0.173354 T V + 4.24267 V - 0.0684226 V^2 (T in degF, V in volumes).
  const psig = (t, v) => -16.6999 - 0.0101059 * t + 0.00116512 * t * t + 0.173354 * t * v + 4.24267 * v - 0.0684226 * v * v;
  for (const [t, v] of [[34, 2.5], [38, 2.6], [45, 2.4], [60, 2.0]]) {
    const r = computeCarbonationVolumesPressure({ beer_temp_f: t, gauge_psig: psig(t, v), target_volumes: v, warm_temp_f: t });
    within(r.co2_volumes, v, 1.5, `${t} degF at ${v} volumes`);
  }
});

test("Morey's equation reproduces its published constants", () => {
  // SRM = 1.4922 x MCU^0.6859: MCU 10 -> 7.25, MCU 1 -> 1.4922.
  const srm = (mcu) => computeBeerColorSrm({ base_malt_lb: mcu, base_lovibond: 1, batch_volume_gal: 1 }).srm;
  within(srm(1), 1.4922, 1e-6, "MCU 1");
  within(srm(10), 1.4922 * Math.pow(10, 0.6859), 1e-6, "MCU 10");
  within(srm(10), 7.25, 0.5, "MCU 10 rounded");
});

// ---- identities the notes claim ----

test("strike water: the energy balance closes and the tun drop uses the whole mash", () => {
  const r = computeMashStrikeWater({ grain_weight_lb: 542, mash_thickness_qt_per_lb: 1.25, grain_temp_f: 68, target_mash_temp_f: 152, grain_specific_heat: 0.4, tun_weight_lb: 180, tun_specific_heat: 0.12, tun_temp_f: 68 });
  // Heat the water gives up equals the heat the grain takes.
  close(r.water_lb * (r.strike_temp_f - 152), 542 * 0.4 * (152 - 68), "water vs grain");
  // After the tun equilibrates, what the mash lost is what the tun gained.
  close(r.mash_heat_capacity * r.tun_drop_f, 180 * 0.12 * (r.mash_temp_after_tun_f - 68), "mash vs tun");
  // No tun, no drop.
  const bare = computeMashStrikeWater({ grain_weight_lb: 542, mash_thickness_qt_per_lb: 1.25, grain_temp_f: 68, target_mash_temp_f: 152, grain_specific_heat: 0.4, tun_weight_lb: 0, tun_specific_heat: 0.12, tun_temp_f: 68 });
  assert.equal(bare.tun_drop_f, 0);
});

test("sparge: every gallon heated is either absorbed, left in the vessel, or reaches the kettle", () => {
  const r = computeSpargeWaterVolume({ grain_weight_lb: 542, mash_thickness_qt_per_lb: 1.25, absorption_gal_per_lb: 0.125, preboil_volume_gal: 350, deadspace_gal: 5, alternative_grain_weight_lb: 850 });
  close(r.total_water_gal, 350 + 5 + r.absorbed_gal, "water balance");
  assert.ok(r.alternative_sparge_gal < r.sparge_gal, "a bigger mash leaves a smaller sparge");
});

test("brewhouse efficiency inverts: the gravity an efficiency predicts gives that efficiency back", () => {
  const og = 1 + 542 * 37 * 0.78 / 310 / 1000;
  const r = computeBrewhouseEfficiency({ grain_weight_lb: 542, extract_potential_ppg: 37, volume_gal: 310, original_gravity: og, transfer_loss_gal: 15, strong_grain_weight_lb: 850, assumed_efficiency_pct: 85, achieved_efficiency_pct: 75 });
  close(r.kettle_efficiency_pct, 78, "kettle efficiency");
  close(r.fermenter_efficiency_pct, 78 * 295 / 310, "fermenter efficiency");
  // The malt that recovers the shortfall, mashed at the achieved efficiency,
  // yields exactly the shortfall.
  close(r.malt_to_recover_lb * 37 * 0.75, r.shortfall_point_gallons, "recovery malt");
});

test("IBU is linear in hops, rises with boil time, and falls with gravity", () => {
  const base = { batch_volume_gal: 310, hop_weight_lb: 5, alpha_acid_pct: 12, boil_minutes: 60, boil_gravity: 1.05, short_boil_minutes: 15, strong_boil_gravity: 1.08 };
  const r = computeIbuTinseth(base);
  close(computeIbuTinseth({ ...base, hop_weight_lb: 10 }).ibu, 2 * r.ibu, "double the hops");
  assert.ok(r.short_boil_ibu < r.ibu && r.strong_gravity_ibu < r.ibu);
  // The hops that hold bitterness in the stronger wort do hold it.
  const matched = computeIbuTinseth({ ...base, hop_weight_lb: r.hops_to_match_lb, boil_gravity: 1.08 });
  close(matched.ibu, r.ibu, "matched bitterness");
});

test("yeast: cells scale with volume, slurry with the inverse of viability", () => {
  const base = { batch_volume_gal: 310, original_gravity: 1.055, pitch_rate_million_per_ml_plato: 0.75, slurry_cells_per_ml: 1.2e9, viability_pct: 90, aged_viability_pct: 60, strong_original_gravity: 1.08 };
  const r = computeYeastPitchRate(base);
  close(computeYeastPitchRate({ ...base, batch_volume_gal: 620 }).cells_required, 2 * r.cells_required, "double the batch");
  close(r.aged_slurry_ml / r.slurry_ml, 90 / 60, "viability ratio");
});

test("kettle boil-off conserves extract at every step", () => {
  const r = computeKettleBoilOff({ preboil_volume_gal: 350, preboil_gravity: 1.049, boiloff_pct_per_hour: 8, boil_hours: 1, shrinkage_pct: 4, hard_boiloff_pct_per_hour: 12 });
  close(r.hot_og_points * r.hot_volume_gal, 49 * 350, "hot");
  close(r.cooled_og_points * r.cooled_volume_gal, 49 * 350, "cooled");
  close(r.hard_og_points * r.hard_cooled_volume_gal, 49 * 350, "hard boil");
});

test("carbonation round-trips and colder beer holds more gas", () => {
  const r = computeCarbonationVolumesPressure({ beer_temp_f: 38, gauge_psig: 12, target_volumes: 2.6, warm_temp_f: 45 });
  const back = computeCarbonationVolumesPressure({ beer_temp_f: 38, gauge_psig: r.pressure_for_target_psig, target_volumes: 2.6, warm_temp_f: 45 });
  close(back.co2_volumes, 2.6, "pressure -> volumes");
  assert.ok(r.warm_co2_volumes < r.co2_volumes);
  assert.ok(r.overcarbonation_volumes > 2.6);
});

test("glycol: the fermentation load sees the cellar across a fermenting tank, not a crashed one", () => {
  // spec-v1784 states ambient gain as area x U x (room - BEER), then evaluated
  // the fermentation-period gain at the 34 degF crash target while the beer
  // ferments at 68. With the cellar at the fermentation temperature there is
  // no ambient gain during fermentation at all, so the peak load is the heat
  // of fermentation alone.
  const base = { batch_volume_gal: 310, original_gravity: 1.055, final_gravity: 1.012, heat_of_fermentation_btu_per_lb: 280, peak_day_share_pct: 40, crash_start_temp_f: 68, crash_target_temp_f: 34, crash_hours: 24, tank_surface_sqft: 143, tank_u_factor: 0.15, cellar_temp_f: 68, glycol_delta_t_f: 8 };
  const r = computeFermenterGlycolLoad(base);
  close(r.fermentation_load_btuh, r.fermentation_heat_btu * 0.4 / 24, "no ambient gain at equal temperatures");
  // The crash still sees the cellar across a 34 degF tank.
  close(r.crash_load_btuh, r.crash_heat_btu / 24 + 143 * 0.15 * (68 - 34), "crash ambient");
  // Glycol flow carries exactly the crash load.
  close(r.glycol_gpm * 60 * 8.6 * 0.9 * 8, r.crash_load_btuh, "glycol heat balance");
});

test("proof gallons are twice the recovered alcohol at every proof", () => {
  for (const [collect, cut] of [[140, 80], [190, 100], [100, 40]]) {
    const r = computeProofGallonYield({ wash_volume_gal: 500, wash_abv_pct: 8, recovery_pct: 85, collection_proof: collect, alternative_proof: cut, hearts_share_pct: 75, excise_rate_per_pg: 2.7 });
    close(r.proof_gallons, 2 * 34, `collected at ${collect}`);
    close(r.alternative_proof_gallons, 2 * 34, `cut to ${cut}`);
  }
});

test("packaging: packages plus remainder account for every packaged gallon", () => {
  const r = computePackagingYieldLoss({ brite_volume_gal: 310, transfer_loss_pct: 2, fill_loss_pct: 1.5, package_gal: 15.5, smallest_package_gal: 5.16, revenue_per_package: 175 });
  close(r.saleable_gal + r.remainder_gal, r.packaged_volume_gal, "volume balance");
  assert.ok(r.remainder_gal >= 0 && r.remainder_gal < 15.5);
});

test("mash tun: the maximum grain bill fills the bed exactly to the limit, and capacity goes as diameter squared", () => {
  const base = { tun_diameter_ft: 6, grain_weight_lb: 542, mash_thickness_qt_per_lb: 1.25, grain_displacement_gal_per_lb: 0.08, max_bed_depth_in: 18, batch_volume_gal: 310, efficiency_pct: 78, extract_potential_ppg: 37, alternative_diameter_ft: 8 };
  const r = computeMashTunGrainBed(base);
  close(computeMashTunGrainBed({ ...base, grain_weight_lb: r.max_grain_lb }).bed_depth_in, 18, "depth at the limit");
  close(r.alternative_max_grain_lb / r.max_grain_lb, 64 / 36, "diameter squared");
});

test("dry-hop loss is exactly proportional to the rate", () => {
  const r = computeDryHopBeerLoss({ batch_volume_gal: 310, dry_hop_lb_per_bbl: 2, absorption_gal_per_lb: 1, package_gal: 15.5, revenue_per_package: 175, heavy_dry_hop_lb_per_bbl: 4 });
  close(r.heavy_absorbed_gal, 2 * r.absorbed_gal, "double the rate");
  close(r.absorbed_gal, 2 * 10, "2 lb/bbl x 10 bbl x 1 gal/lb");
});
