// calc-process.js, the plastics and foundry bench of spec-v1705..v1716, against
// references the specs did not write: the full Fourier-series solution for a
// cooling plate (the tile uses its first term), a riser's modulus computed from
// the cylinder itself, ASTM D955's definition of mould shrinkage, the ideal-gas
// volume of steam, and the identities the tiles' notes claim. These tiles' only
// worked-example rows recompute their own specs, so an error a spec and its
// tile share passes that fixture.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeInjectionClampTonnage, computeShotSizeResidenceTime, computeInjectionCoolingTime,
  computeMoldShrinkageDimension, computeExtrusionOutputRate, computeThermoformingDrawRatio,
  computeHdpeFusionPressureTime, computeThermoplasticTemperatureDerate, computeCastingPourYield,
  computeRiserModulusFeeding, computeSandPermeabilityVent, computeMeltFurnaceEnergy,
} from "../../calc-process.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};
const close = (got, want, label) => within(got, want, 1e-9, label);

// ---- independent references ----

test("cooling time: at the tile's time the plate's centreline, by the full series, is at the ejection temperature", () => {
  // A plate of thickness h between walls at Tw, initially at Tm: the centreline
  // excess is (4/pi) sum (-1)^n / (2n+1) exp(-(2n+1)^2 pi^2 alpha t / h^2).
  const inputs = { wall_thickness_in: 0.1, alpha_in2_s: 0.00015, melt_temp_f: 450, mould_temp_f: 100, eject_temp_f: 180, alt_wall_thickness_in: 0.125, non_cooling_cycle_s: 8, annual_parts: 1e6 };
  const r = computeInjectionCoolingTime(inputs);
  let theta = 0;
  for (let n = 0; n < 200; n++) {
    const k = 2 * n + 1;
    theta += (4 / Math.PI) * (n % 2 ? -1 : 1) / k * Math.exp(-k * k * Math.PI ** 2 * 0.00015 * r.cooling_time_s / 0.01);
  }
  within(100 + 350 * theta, 180, 0.5, "centreline at ejection");
  close(r.alt_cooling_time_s / r.cooling_time_s, (0.125 / 0.1) ** 2, "time as thickness squared");
});

test("riser: a cylinder with height equal to its diameter has modulus D / 6", () => {
  const r = computeRiserModulusFeeding({ section_length_in: 8, section_width_in: 6, section_thickness_in: 1.5, modulus_ratio: 1.2, shrinkage_pct: 4, riser_efficiency_pct: 15, sleeve_factor: 1 });
  const D = r.riser_diameter_in;
  const cylModulus = (Math.PI / 4 * D ** 3) / (2 * Math.PI / 4 * D ** 2 + Math.PI * D * D);
  close(cylModulus, r.riser_modulus_in, "V / A of the riser");
  close(r.casting_modulus_in, 72 / (2 * (48 + 12 + 9)), "V / A of the plate");
});

test("shrinkage: ASTM D955 measures it against the MOULD, so the cavity is part / (1 - s)", () => {
  const r = computeMoldShrinkageDimension({ part_dimension_in: 4, shrinkage_flow_in_in: 0.018, shrinkage_cross_in_in: 0.012, shrinkage_low_in_in: 0.015, shrinkage_high_in_in: 0.022, existing_cavity_in: 4.0201 });
  close((r.cavity_flow_in - 4) / r.cavity_flow_in, 0.018, "shrinkage of the cavity it prescribes");
});

test("sand venting: steam volume from the ideal gas law", () => {
  const r = computeSandPermeabilityVent({ mould_sand_lb: 800, moisture_pct: 3.5, binder_lb: 4, binder_gas_cm3_g: 15, pour_temp_f: 2600, vent_area_in2: 6, permeability_number: 120, fineness_change_pct: 20 });
  const mol = 28 / 18.0153;
  within(r.steam_volume_in3, mol * 10.7316 * (2600 + 459.67) / 14.696 * 1728, 1e-9, "V = nRT / P");
  close(r.binder_gas_in3, 4 * 453.59237 * 15 / 16.387064, "binder gas in cubic inches");
});

// ---- identities the notes claim ----

test("clamp: tonnage is projected area times cavity pressure, runner included", () => {
  const r = computeInjectionClampTonnage({ cavities: 4, part_projected_area_in2: 12, runner_projected_area_in2: 6, cavity_pressure_tsi: 2.5, safety_factor_pct: 15, machine_rating_tons: 150 });
  close(r.clamp_with_safety_tons, 54 * 2.5 * 1.15, "clamp");
  close(r.max_cavity_pressure_tsi * 54 * 1.15, 150, "the machine's limit");
});

test("shot size: residence is the shots in the barrel times the cycle", () => {
  const r = computeShotSizeResidenceTime({ barrel_capacity_oz: 12, shot_weight_oz: 4.2, cycle_time_s: 32, min_pct: 20, max_pct: 80, max_residence_min: 4, alt_cycle_time_s: 45 });
  close(r.residence_min, 12 / 4.2 * 32 / 60, "residence");
  close(r.min_barrel_oz * 0.8, 4.2, "the smallest barrel at 80%");
});

test("extrusion: output is the section's weight per foot times line speed", () => {
  const r = computeExtrusionOutputRate({ product_od_in: 2.5, wall_thickness_in: 0.1, line_speed_ft_min: 45, melt_density_lb_in3: 0.0347, extruder_output_lb_h: 400, die_opening_in: 3, cooling_capacity_lb_h: 500, shift_hours: 8 });
  close(r.lb_per_ft, Math.PI / 4 * (6.25 - 2.3 ** 2) * 12 * 0.0347, "lb/ft");
  close(r.speed_at_output_ft_min * r.lb_per_ft * 60, 400, "speed round trip");
});

test("thermoforming: a cup's areal draw ratio is 1 + 4 h / D, and the wall thins by it", () => {
  const r = computeThermoformingDrawRatio({ opening_diameter_in: 10, draw_depth_in: 6, sheet_thickness_in: 0.06, corner_fraction: 0.4, min_wall_in: 0.015, hd_limit: 0.5 });
  close(r.areal_draw_ratio, 1 + 4 * 6 / 10, "areal draw ratio");
  close(r.average_wall_in * r.areal_draw_ratio, 0.06, "volume conserved");
});

test("HDPE fusion: gauge pressure is interfacial pressure on the face area over the cylinder area, plus drag", () => {
  const r = computeHdpeFusionPressureTime({ pipe_od_in: 6.625, dimension_ratio: 11, wall_thickness_in: 0, cylinder_area_in2: 3.15, interfacial_pressure_psi: 75, drag_pressure_psi: 60, alt_pipe_od_in: 12.75 });
  const t = 6.625 / 11;
  close(r.total_gauge_psi, 75 * Math.PI * (6.625 - t) * t / 3.15 + 60, "gauge");
});

test("derate and yield: rated pressure times the factor; saleable over poured", () => {
  const d = computeThermoplasticTemperatureDerate({ rated_pressure_psi: 200, operating_temp_f: 120, derating_factor: 0.4, operating_pressure_psi: 100, max_rated_temp_f: 140, alt_derating_factor: 0.82 });
  close(d.derated_pressure_psi, 80, "derated");
  assert.equal(d.passes, false);
  const y = computeCastingPourYield({ casting_weight_lb: 280, gating_weight_lb: 170, castings_per_mould: 1, melt_energy_btu_lb: 500, target_yield_pct: 70, annual_castings: 5000 });
  close(y.yield_pct, 100 * 280 / 450, "yield");
  close(y.btu_per_saleable_lb, 500 * 450 / 280, "energy per saleable pound");
});

test("melt furnace: input is theoretical over efficiency", () => {
  const r = computeMeltFurnaceEnergy({ charge_weight_lb: 2000, theoretical_btu_lb: 190, furnace_efficiency_pct: 70, energy_cost_per_kwh: 0.1, alt_efficiency_pct: 30, alt_theoretical_btu_lb: 500, casting_yield_pct: 62 });
  close(r.input_btu * 0.7, 2000 * 190, "efficiency");
  close(r.alt_input_mmbtu * 0.3, r.theoretical_mmbtu, "the other furnace");
});
