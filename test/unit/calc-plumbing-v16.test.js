// spec-v16 Group B unit tests for the plumbing tiles landed in v16:
// B.1 water-heater-recovery, B.2 wh-expansion-tank, B.5 sanitary-dfu,
// B.6 trap-primer, and B.8 backflow-sizing. Worked examples cross-check
// against the published references named in each tile's citation
// (DOE/AHRI, ASPE/ASME, IPC 2021, IPC 312 / AWWA M14 / EPA 40 CFR 141.85).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeWaterHeaterRecovery, waterHeaterRecoveryExample, WATER_HEATER_EFFICIENCY,
  computeWhExpansionTank, whExpansionTankExample, WATER_DENSITY_LB_FT3, EXPANSION_TANK_SIZES_GAL,
  computeSanitaryDfu, sanitaryDfuExample, SANITARY_DFU_VALUES, SANITARY_BRANCH_STACK_MAX_DFU,
  computeTrapPrimer, trapPrimerExample, TRAP_PRIMER_DRAINS_PER_UNIT,
  computeBackflowSizing, backflowSizingExample, BACKFLOW_ASSEMBLY_TO_CLASS,
  PLUMBING_RENDERERS,
} from "../../calc-plumbing.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const closePct = (a, b, pct) => Math.abs(a - b) <= Math.max(Math.abs(b) * (pct / 100), 1e-6);

// --- B.1 Water heater recovery rate (10 tests) -----------------------

test("water-heater-recovery: 40 kBTU atmospheric gas, 50->120 F, 40 gal -> 54.9 gph recovery, 82.9 gph FHR", () => {
  const r = computeWaterHeaterRecovery(waterHeaterRecoveryExample.inputs);
  assert.ok(!r.error);
  assert.strictEqual(r.q_useful_btu_hr, 32000);
  assert.ok(closePct(r.recovery_gph, 54.879, 0.5));
  assert.ok(closePct(r.first_hour_gph, 82.879, 0.5));
});

test("water-heater-recovery: recovery follows gph = input*eff/(8.33*dT)", () => {
  const r = computeWaterHeaterRecovery({ heater_type: "gas_atmospheric", input_btu_hr: 50000, efficiency: 0.80, incoming_F: 60, setpoint_F: 130 });
  assert.ok(close(r.recovery_gph, (50000 * 0.80) / (8.33 * 70), 1e-9));
});

test("water-heater-recovery: 4500 W electric defaults to 0.98 efficiency and kW*3412 input", () => {
  const r = computeWaterHeaterRecovery({ heater_type: "electric", input_kw: 4.5, incoming_F: 50, setpoint_F: 140, tank_gal: 50 });
  assert.strictEqual(r.efficiency, WATER_HEATER_EFFICIENCY.electric);
  assert.ok(close(r.input_btu_hr, 4.5 * 3412, 1e-9));
  assert.ok(close(r.recovery_gph, (4.5 * 3412 * 0.98) / (8.33 * 90), 1e-9));
});

test("water-heater-recovery: condensing gas default efficiency is 0.94", () => {
  const r = computeWaterHeaterRecovery({ heater_type: "gas_condensing", input_btu_hr: 100000, incoming_F: 50, setpoint_F: 120 });
  assert.strictEqual(r.efficiency, 0.94);
  assert.ok(close(r.q_useful_btu_hr, 94000, 1e-9));
});

test("water-heater-recovery: first-hour rating adds 70% of stored volume", () => {
  const r = computeWaterHeaterRecovery({ heater_type: "gas_atmospheric", input_btu_hr: 40000, efficiency: 0.80, incoming_F: 50, setpoint_F: 120, tank_gal: 50 });
  assert.ok(close(r.first_hour_gph - r.recovery_gph, 0.70 * 50, 1e-9));
});

test("water-heater-recovery: user efficiency overrides the type default", () => {
  const r = computeWaterHeaterRecovery({ heater_type: "gas_atmospheric", input_btu_hr: 40000, efficiency: 0.82, incoming_F: 50, setpoint_F: 120 });
  assert.strictEqual(r.efficiency, 0.82);
});

test("water-heater-recovery: rise outside 20-130 F is flagged", () => {
  const r = computeWaterHeaterRecovery({ heater_type: "gas_atmospheric", input_btu_hr: 40000, incoming_F: 110, setpoint_F: 125 });
  assert.ok(r.warnings.some((w) => /20-130/.test(w)));
});

test("water-heater-recovery: set point above 140 F warns of scald risk", () => {
  const r = computeWaterHeaterRecovery({ heater_type: "gas_atmospheric", input_btu_hr: 40000, incoming_F: 50, setpoint_F: 150 });
  assert.ok(r.warnings.some((w) => /scald/.test(w)));
});

test("water-heater-recovery: zero input and inverted temps are rejected", () => {
  assert.ok("error" in computeWaterHeaterRecovery({ input_btu_hr: 0 }));
  assert.ok("error" in computeWaterHeaterRecovery({ input_btu_hr: 40000, incoming_F: 120, setpoint_F: 100 }));
});

test("water-heater-recovery: a published ~41 gph at 90 F rise check (40 kBTU, 0.80)", () => {
  // AHRI directories list ~41 gph recovery at a 90 F rise for a 40,000
  // BTU/hr 80%-efficient atmospheric gas heater.
  const r = computeWaterHeaterRecovery({ heater_type: "gas_atmospheric", input_btu_hr: 40000, efficiency: 0.80, incoming_F: 50, setpoint_F: 140 });
  assert.ok(closePct(r.recovery_gph, 42.7, 5));
});

// --- B.2 Water heater thermal expansion tank (10 tests) --------------

test("wh-expansion-tank: 40 gal, 50->120 F, acceptance 0.46 -> ~0.45 gal expansion, 2 gal tank", () => {
  const r = computeWhExpansionTank(whExpansionTankExample.inputs);
  assert.ok(!r.error);
  assert.ok(closePct(r.v_expansion_gal, 0.4537, 1));
  assert.ok(closePct(r.v_tank_gal, 0.9864, 1));
  assert.strictEqual(r.recommended_gal, 2);
});

test("wh-expansion-tank: expansion factor is (rho_cold - rho_hot)/rho_hot", () => {
  const r = computeWhExpansionTank({ water_heater_vol_gal: 40, incoming_F: 50, setpoint_F: 120, acceptance_factor: 0.46 });
  assert.ok(close(r.expansion_factor, (62.41 - 61.71) / 61.71, 1e-9));
});

test("wh-expansion-tank: V_tank = V_expansion / acceptance_factor", () => {
  const r = computeWhExpansionTank({ water_heater_vol_gal: 80, incoming_F: 60, setpoint_F: 140, acceptance_factor: 0.5 });
  assert.ok(close(r.v_tank_gal, r.v_expansion_gal / 0.5, 1e-9));
});

test("wh-expansion-tank: pre-charge equals incoming pressure", () => {
  const r = computeWhExpansionTank({ water_heater_vol_gal: 40, incoming_psi: 65, incoming_F: 50, setpoint_F: 120 });
  assert.strictEqual(r.pre_charge_psi, 65);
});

test("wh-expansion-tank: recommended size is the smallest standard tank that fits", () => {
  const r = computeWhExpansionTank({ water_heater_vol_gal: 120, incoming_F: 40, setpoint_F: 180, acceptance_factor: 0.46 });
  assert.ok(EXPANSION_TANK_SIZES_GAL.includes(r.recommended_gal));
  assert.ok(r.recommended_gal >= r.v_tank_gal || r.recommended_gal === EXPANSION_TANK_SIZES_GAL[EXPANSION_TANK_SIZES_GAL.length - 1]);
});

test("wh-expansion-tank: density table is monotonic decreasing in temperature", () => {
  for (let i = 1; i < WATER_DENSITY_LB_FT3.length; i++) {
    assert.ok(WATER_DENSITY_LB_FT3[i].rho < WATER_DENSITY_LB_FT3[i - 1].rho);
  }
});

test("wh-expansion-tank: incoming pressure above 80 psi flags the PRV requirement", () => {
  const r = computeWhExpansionTank({ water_heater_vol_gal: 50, incoming_psi: 90, incoming_F: 50, setpoint_F: 120 });
  assert.ok(r.warnings.some((w) => /604\.8|PRV/.test(w)));
});

test("wh-expansion-tank: temperature rise above 100 F is flagged", () => {
  const r = computeWhExpansionTank({ water_heater_vol_gal: 40, incoming_F: 40, setpoint_F: 160 });
  assert.ok(r.warnings.some((w) => /100 F/.test(w)));
});

test("wh-expansion-tank: warmer incoming water yields a smaller expansion volume", () => {
  const cold = computeWhExpansionTank({ water_heater_vol_gal: 40, incoming_F: 40, setpoint_F: 120 });
  const warm = computeWhExpansionTank({ water_heater_vol_gal: 40, incoming_F: 70, setpoint_F: 120 });
  assert.ok(warm.v_expansion_gal < cold.v_expansion_gal);
});

test("wh-expansion-tank: rejects zero volume, bad acceptance, and inverted temps", () => {
  assert.ok("error" in computeWhExpansionTank({ water_heater_vol_gal: 0 }));
  assert.ok("error" in computeWhExpansionTank({ water_heater_vol_gal: 40, acceptance_factor: 1.5 }));
  assert.ok("error" in computeWhExpansionTank({ water_heater_vol_gal: 40, incoming_F: 130, setpoint_F: 120 }));
});

// --- B.5 Sanitary stack / branch DFU sizing (10 tests) ---------------

test("sanitary-dfu: single-bath branch = 6 DFU, 2 in minimum", () => {
  const r = computeSanitaryDfu(sanitaryDfuExample.inputs);
  assert.strictEqual(r.total_dfu, 6);
  assert.strictEqual(r.min_size_in, 2);
  assert.strictEqual(r.capacity_at_size, 6);
});

test("sanitary-dfu: DFU total sums count * Table 709.1 value", () => {
  const r = computeSanitaryDfu({ fixtures: { water_closet_public: 2, lavatory: 2, urinal: 1 }, config: "horizontal_branch" });
  assert.strictEqual(r.total_dfu, 2 * 4 + 2 * 1 + 1 * 4);
});

test("sanitary-dfu: 24-fixture commercial stack sizes to 4 in", () => {
  const r = computeSanitaryDfu({ fixtures: { water_closet_public: 20, lavatory: 8, urinal: 6 }, config: "stack" });
  assert.strictEqual(r.total_dfu, 112);
  assert.strictEqual(r.min_size_in, 4);
});

test("sanitary-dfu: building-drain sizing is slope-aware", () => {
  const flat = computeSanitaryDfu({ fixtures: { water_closet_public: 50, lavatory: 30 }, config: "building_drain", slope_in_per_ft: 0.125 });
  const steep = computeSanitaryDfu({ fixtures: { water_closet_public: 50, lavatory: 30 }, config: "building_drain", slope_in_per_ft: 0.5 });
  // 230 DFU: 4 in at 1/2 (250) but 5 in at 1/8 (216 < 230 -> next size).
  assert.strictEqual(flat.total_dfu, 230);
  assert.ok(steep.min_size_in <= flat.min_size_in);
});

test("sanitary-dfu: 2 in horizontal branch caps at 6 DFU (7th DFU bumps to 2.5 in)", () => {
  const r = computeSanitaryDfu({ fixtures: { water_closet_private: 2, lavatory: 1 }, config: "horizontal_branch" });
  assert.strictEqual(r.total_dfu, 7);
  assert.strictEqual(r.min_size_in, 2.5);
});

test("sanitary-dfu: branch and stack columns differ for the same DFU load", () => {
  const branch = computeSanitaryDfu({ fixtures: { water_closet_private: 6 }, config: "horizontal_branch" });
  const stack = computeSanitaryDfu({ fixtures: { water_closet_private: 6 }, config: "stack" });
  // 18 DFU: branch max 20 at 3 in; stack max 24 at 2 in.
  assert.strictEqual(branch.min_size_in, 3);
  assert.strictEqual(stack.min_size_in, 2);
});

test("sanitary-dfu: a proposed undersized pipe is flagged not adequate", () => {
  const r = computeSanitaryDfu({ fixtures: { water_closet_public: 20, lavatory: 8, urinal: 6 }, config: "stack", proposed_size_in: 3 });
  assert.strictEqual(r.adequate, false);
  assert.ok(r.warnings.some((w) => /undersized/.test(w)));
});

test("sanitary-dfu: a proposed adequate pipe reports adequate", () => {
  const r = computeSanitaryDfu({ fixtures: { water_closet_private: 1, lavatory: 1, bathtub: 1 }, config: "horizontal_branch", proposed_size_in: 3 });
  assert.strictEqual(r.adequate, true);
});

test("sanitary-dfu: DFU values and capacity table are internally consistent", () => {
  assert.strictEqual(SANITARY_DFU_VALUES.water_closet_private, 3);
  assert.strictEqual(SANITARY_DFU_VALUES.water_closet_public, 4);
  // Capacity table is strictly increasing in branch and stack columns.
  for (let i = 1; i < SANITARY_BRANCH_STACK_MAX_DFU.length; i++) {
    assert.ok(SANITARY_BRANCH_STACK_MAX_DFU[i].branch > SANITARY_BRANCH_STACK_MAX_DFU[i - 1].branch);
    assert.ok(SANITARY_BRANCH_STACK_MAX_DFU[i].stack > SANITARY_BRANCH_STACK_MAX_DFU[i - 1].stack);
  }
});

test("sanitary-dfu: empty fixtures and an invalid slope are rejected", () => {
  assert.ok("error" in computeSanitaryDfu({ fixtures: {} }));
  assert.ok("error" in computeSanitaryDfu({ fixtures: { lavatory: 1 }, config: "building_drain", slope_in_per_ft: 0.33 }));
});

// --- B.6 Trap primer sizing (8 tests) --------------------------------

test("trap-primer: 6 occupied electronic drains -> 2 units, ~136.9 gal/yr, compliant", () => {
  const r = computeTrapPrimer(trapPrimerExample.inputs);
  assert.strictEqual(r.primers_needed, 2);
  assert.ok(closePct(r.water_gal_per_year, 136.875, 0.5));
  assert.strictEqual(r.compliant, true);
});

test("trap-primer: primer count is ceil(drains / drains-per-unit)", () => {
  const r = computeTrapPrimer({ floor_drain_count: 9, prime_method: "electronic" });
  assert.strictEqual(r.drains_per_unit, TRAP_PRIMER_DRAINS_PER_UNIT.electronic);
  assert.strictEqual(r.primers_needed, 3);
});

test("trap-primer: manual prime is one unit per drain", () => {
  const r = computeTrapPrimer({ floor_drain_count: 4, prime_method: "manual", zone: "mech_room" });
  assert.strictEqual(r.primers_needed, 4);
});

test("trap-primer: annual water = drains * (oz/cycle / 128) * cycles/day * 365", () => {
  const r = computeTrapPrimer({ floor_drain_count: 3, prime_method: "electronic", prime_volume_oz: 16, cycles_per_day: 2 });
  assert.ok(close(r.water_gal_per_year, 3 * (16 / 128) * 2 * 365, 1e-9));
});

test("trap-primer: manual prime in occupied space is non-compliant per IPC 1002.4", () => {
  const r = computeTrapPrimer({ floor_drain_count: 2, prime_method: "manual", zone: "occupied" });
  assert.strictEqual(r.compliant, false);
  assert.ok(r.warnings.some((w) => /1002\.4/.test(w)));
});

test("trap-primer: manual prime in a mechanical room is compliant", () => {
  const r = computeTrapPrimer({ floor_drain_count: 2, prime_method: "manual", zone: "mech_room" });
  assert.strictEqual(r.compliant, true);
});

test("trap-primer: parking-structure manual prime warns about seasonal evaporation", () => {
  const r = computeTrapPrimer({ floor_drain_count: 2, prime_method: "manual", zone: "parking" });
  assert.ok(r.warnings.some((w) => /seasonal|evaporate/.test(w)));
});

test("trap-primer: zero drains is rejected", () => {
  assert.ok("error" in computeTrapPrimer({ floor_drain_count: 0 }));
});

// --- B.8 Backflow assembly sizing screen (10 tests) ------------------

test("backflow-sizing: high-hazard double-check is overridden to RP, 2 in at 100 GPM -> 7 psi loss, 63 psi downstream", () => {
  const r = computeBackflowSizing(backflowSizingExample.inputs);
  assert.ok(!r.error);
  assert.strictEqual(r.required_assembly, "RP");
  assert.strictEqual(r.overridden, true);
  assert.ok(close(r.head_loss_psi, 7, 1e-9));
  assert.ok(close(r.downstream_psi, 63, 1e-9));
});

test("backflow-sizing: downstream pressure = upstream - head loss", () => {
  const r = computeBackflowSizing({ service_flow_gpm: 40, hazard: "low", assembly_type: "DC", pipe_size_in: "1", upstream_pressure_psi: 60 });
  assert.ok(close(r.downstream_psi, r.upstream_pressure_psi - r.head_loss_psi, 1e-9));
});

test("backflow-sizing: a low-hazard double-check is kept (no override)", () => {
  const r = computeBackflowSizing({ service_flow_gpm: 40, hazard: "low", assembly_type: "DC", pipe_size_in: "1", upstream_pressure_psi: 60 });
  assert.strictEqual(r.required_assembly, "DC");
  assert.strictEqual(r.overridden, false);
  assert.strictEqual(r.curve_class, "DCV");
});

test("backflow-sizing: any high hazard forces RP regardless of the selected assembly", () => {
  for (const sel of ["DC", "PVB", "AVB"]) {
    const r = computeBackflowSizing({ service_flow_gpm: 20, hazard: "high", assembly_type: sel, pipe_size_in: "1", upstream_pressure_psi: 65 });
    assert.strictEqual(r.required_assembly, "RP", sel + " should override to RP");
    assert.ok(r.overridden);
  }
  // RP selected for high hazard is not flagged as an override.
  const rp = computeBackflowSizing({ service_flow_gpm: 20, hazard: "high", assembly_type: "RP", pipe_size_in: "1", upstream_pressure_psi: 65 });
  assert.strictEqual(rp.overridden, false);
});

test("backflow-sizing: head loss rises with flow on a given assembly/size curve", () => {
  const lo = computeBackflowSizing({ service_flow_gpm: 20, hazard: "high", assembly_type: "RP", pipe_size_in: "2", upstream_pressure_psi: 80 });
  const hi = computeBackflowSizing({ service_flow_gpm: 160, hazard: "high", assembly_type: "RP", pipe_size_in: "2", upstream_pressure_psi: 80 });
  assert.ok(hi.head_loss_psi > lo.head_loss_psi);
});

test("backflow-sizing: a low downstream residual is flagged", () => {
  const r = computeBackflowSizing({ service_flow_gpm: 30, hazard: "high", assembly_type: "RP", pipe_size_in: "0.75", upstream_pressure_psi: 18 });
  assert.strictEqual(r.low_pressure, true);
  assert.ok(r.warnings.some((w) => /minimum residual/.test(w)));
});

test("backflow-sizing: the compliance note cites EPA 40 CFR 141.85 / AWWA M14", () => {
  const r = computeBackflowSizing(backflowSizingExample.inputs);
  assert.match(r.compliance_note, /141\.85/);
  assert.match(r.compliance_note, /AWWA M14/);
});

test("backflow-sizing: assembly-type-to-curve mapping is stable", () => {
  assert.strictEqual(BACKFLOW_ASSEMBLY_TO_CLASS.DC, "DCV");
  assert.strictEqual(BACKFLOW_ASSEMBLY_TO_CLASS.RP, "RP");
});

test("backflow-sizing: a size not on the assembly's curve surfaces an error", () => {
  // AVB curves only carry 0.75 and 1 in; a 2 in AVB low-hazard request errors.
  const r = computeBackflowSizing({ service_flow_gpm: 20, hazard: "low", assembly_type: "AVB", pipe_size_in: "2", upstream_pressure_psi: 60 });
  assert.ok("error" in r);
});

test("backflow-sizing: non-positive upstream pressure and unknown assembly are rejected", () => {
  assert.ok("error" in computeBackflowSizing({ service_flow_gpm: 40, hazard: "low", assembly_type: "DC", pipe_size_in: "1", upstream_pressure_psi: 0 }));
  assert.ok("error" in computeBackflowSizing({ service_flow_gpm: 40, hazard: "low", assembly_type: "ZZ", pipe_size_in: "1", upstream_pressure_psi: 60 }));
});

// --- Wiring sentinel -------------------------------------------------

test("v16 plumbing renderers are registered in PLUMBING_RENDERERS", () => {
  for (const id of ["water-heater-recovery", "wh-expansion-tank", "sanitary-dfu", "trap-primer", "backflow-sizing"]) {
    assert.strictEqual(typeof PLUMBING_RENDERERS[id], "function", id + " renderer missing");
  }
});
