// Unit tests for calc-trucking.js v4 utilities (188-194).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDIM, dimExample, DIM_DIVISORS,
  computeFreightDensity, freightDensityExample, NMFC_DENSITY_BRACKETS,
  computePalletLoadout, palletLoadoutExample, TRAILER_DIMENSIONS_IN,
  computeHOS, hosExample, HOS_PROFILES,
  computeBridgeFormula, bridgeFormulaExample,
  computeReeferBurn, reeferBurnExample, REEFER_BURN_GPH,
  computeIncoterm, incotermExample, INCOTERMS_2020,
  TRUCKING_RENDERERS,
} from "../../calc-trucking.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// 188 DIM
test("DIM: example UPS Daily 24x18x12 -> 37.3 lb", () => { const r = computeDIM(dimExample.inputs); assert.ok(close(r.dim_lb, (24 * 18 * 12) / 139, 0.01)); });
test("DIM: billable = max(DIM, actual)", () => { const r = computeDIM({ length_in: 12, width_in: 12, height_in: 12, actual_weight_lb: 50, carrier: "UPS_Daily" }); assert.equal(r.billable_lb, 50); });
test("DIM: USPS divisor 166", () => { const r = computeDIM({ length_in: 24, width_in: 18, height_in: 12, actual_weight_lb: 1, carrier: "USPS" }); assert.equal(r.divisor, 166); });
test("DIM: unknown carrier errors", () => { const r = computeDIM({ length_in: 12, width_in: 12, height_in: 12, actual_weight_lb: 10, carrier: "Acme" }); assert.ok(r.error); });
test("DIM: zero dimension errors", () => { const r = computeDIM({ length_in: 0, width_in: 12, height_in: 12, actual_weight_lb: 10, carrier: "UPS_Daily" }); assert.ok(r.error); });
test("DIM: every divisor positive", () => { for (const k of Object.keys(DIM_DIVISORS)) assert.ok(DIM_DIVISORS[k].divisor > 0); });
test("DIM: linear in volume", () => { const a = computeDIM({ length_in: 12, width_in: 12, height_in: 12, actual_weight_lb: 0, carrier: "UPS_Daily" }); const b = computeDIM({ length_in: 24, width_in: 12, height_in: 12, actual_weight_lb: 0, carrier: "UPS_Daily" }); assert.ok(close(b.dim_lb / a.dim_lb, 2, 0.001)); });
test("DIM: attribution string set", () => { const r = computeDIM(dimExample.inputs); assert.match(r.attribution, /UPS/); });
test("DIM: actual > DIM yields actual as billable", () => { const r = computeDIM({ length_in: 6, width_in: 6, height_in: 6, actual_weight_lb: 100, carrier: "UPS_Daily" }); assert.equal(r.billable_lb, 100); });
test("DIM: freight divisor 250", () => { assert.equal(DIM_DIVISORS.freight.divisor, 250); });

// 189 Freight density
test("Freight density: example density positive", () => { const r = computeFreightDensity(freightDensityExample.inputs); assert.ok(r.density_pcf > 0); assert.ok(r.density_class >= 50); });
test("Freight density: high density picks Class 50", () => { const r = computeFreightDensity({ length_in: 24, width_in: 12, height_in: 12, weight_lb: 1000 }); assert.equal(r.density_class, 50); });
test("Freight density: very low density picks Class 500", () => { const r = computeFreightDensity({ length_in: 48, width_in: 48, height_in: 48, weight_lb: 1 }); assert.equal(r.density_class, 500); });
test("Freight density: zero weight errors", () => { const r = computeFreightDensity({ length_in: 12, width_in: 12, height_in: 12, weight_lb: 0 }); assert.ok(r.error); });
test("Freight density: zero dimension errors", () => { const r = computeFreightDensity({ length_in: 0, width_in: 12, height_in: 12, weight_lb: 100 }); assert.ok(r.error); });
test("Freight density: cube = L*W*H/1728", () => { const r = computeFreightDensity({ length_in: 12, width_in: 12, height_in: 12, weight_lb: 100 }); assert.ok(close(r.cubic_ft, 1, 0.001)); });
test("Freight density: 12 lb/ft^3 -> Class 85", () => { const r = computeFreightDensity({ length_in: 12, width_in: 12, height_in: 12, weight_lb: 12 }); assert.equal(r.density_class, 85); });
test("Freight density: every bracket monotonic", () => { for (let i = 1; i < NMFC_DENSITY_BRACKETS.length; i++) assert.ok(NMFC_DENSITY_BRACKETS[i].min_pcf <= NMFC_DENSITY_BRACKETS[i - 1].min_pcf); });
test("Freight density: 50 pcf boundary", () => { const r = computeFreightDensity({ length_in: 12, width_in: 12, height_in: 12, weight_lb: 50 }); assert.equal(r.density_class, 50); });
test("Freight density: 9 pcf boundary -> Class 100", () => { const r = computeFreightDensity({ length_in: 12, width_in: 12, height_in: 12, weight_lb: 9 }); assert.equal(r.density_class, 100); });

// 190 Pallet loadout
test("Pallet: example yields positive pallet count", () => { const r = computePalletLoadout(palletLoadoutExample.inputs); assert.ok(r.pallets_total > 0); assert.ok(r.cube_fill_percent > 0); });
test("Pallet: 53 ft van fits ~26 pallets aligned", () => { const r = computePalletLoadout({ ...palletLoadoutExample.inputs, case_weight_lb: 1, cases_per_pallet: 1 }); assert.ok(r.pallets_by_floor >= 26 && r.pallets_by_floor <= 30); });
test("Pallet: heavy pallet weighs out before cube", () => { const r = computePalletLoadout({ ...palletLoadoutExample.inputs, case_weight_lb: 500, cases_per_pallet: 36 }); assert.equal(r.flag, "weigh-out"); });
test("Pallet: light pallet cubes out", () => { const r = computePalletLoadout({ ...palletLoadoutExample.inputs, case_weight_lb: 1, cases_per_pallet: 1 }); assert.equal(r.flag, "cube-out"); });
test("Pallet: unknown trailer errors", () => { const r = computePalletLoadout({ ...palletLoadoutExample.inputs, trailer: "spaceship" }); assert.ok(r.error); });
test("Pallet: zero case dimension errors", () => { const r = computePalletLoadout({ ...palletLoadoutExample.inputs, case_length_in: 0 }); assert.ok(r.error); });
test("Pallet: zero pallet dimension errors (was a 'By floor: Infinity' render leak)", () => { const r = computePalletLoadout({ ...palletLoadoutExample.inputs, pallet_length_in: 0 }); assert.ok(r.error); });
test("Pallet: cases_per_pallet < 1 errors", () => { const r = computePalletLoadout({ ...palletLoadoutExample.inputs, cases_per_pallet: 0 }); assert.ok(r.error); });
test("Pallet: pup_28 fits fewer than 53 ft", () => { const a = computePalletLoadout({ ...palletLoadoutExample.inputs, trailer: "dry_van_53" }); const b = computePalletLoadout({ ...palletLoadoutExample.inputs, trailer: "pup_28" }); assert.ok(b.pallets_by_floor < a.pallets_by_floor); });
test("Pallet: trailer cube ft^3 returned", () => { const r = computePalletLoadout(palletLoadoutExample.inputs); assert.ok(r.trailer_cube_ft3 > 3000); });
test("Pallet: every trailer in registry has positive volume", () => { for (const k of Object.keys(TRAILER_DIMENSIONS_IN)) { const t = TRAILER_DIMENSIONS_IN[k]; assert.ok(t.L > 0 && t.W > 0 && t.H > 0); } });

// 191 HOS
test("HOS: example consumes 9 hr drive", () => { const r = computeHOS(hosExample.inputs); assert.equal(r.drive_used, 9); });
test("HOS: drive_remaining = 11 - drive_used", () => { const r = computeHOS({ profile: "property_70_8", events: [{ kind: "drive", hours: 5 }] }); assert.equal(r.drive_remaining, 6); });
test("HOS: 14-hour window math", () => { const r = computeHOS({ profile: "property_70_8", events: [{ kind: "drive", hours: 8 }, { kind: "on_duty", hours: 2 }] }); assert.equal(r.on_duty_remaining, 4); });
test("HOS: weekly subtracts on-duty used", () => { const r = computeHOS({ profile: "property_70_8", events: [{ kind: "drive", hours: 8 }], weekly_on_duty_used_hr: 50 }); assert.equal(r.weekly_remaining, 12); });
test("HOS: needs_break flag at 8 hr drive without break", () => { const r = computeHOS({ profile: "property_70_8", events: [{ kind: "drive", hours: 8 }] }); assert.equal(r.needs_break, true); });
test("HOS: 30-min off_duty resets break flag", () => { const r = computeHOS({ profile: "property_70_8", events: [{ kind: "drive", hours: 4 }, { kind: "off_duty", hours: 0.5 }, { kind: "drive", hours: 4 }] }); assert.equal(r.needs_break, false); });
test("HOS: unknown profile errors", () => { const r = computeHOS({ profile: "x", events: [] }); assert.ok(r.error); });
test("HOS: unknown event kind errors", () => { const r = computeHOS({ profile: "property_70_8", events: [{ kind: "naps", hours: 2 }] }); assert.ok(r.error); });
test("HOS: passenger profile drive_max 10", () => { const r = computeHOS({ profile: "passenger_70_7", events: [{ kind: "drive", hours: 10 }] }); assert.equal(r.drive_remaining, 0); });
test("HOS: every profile has positive caps", () => { for (const k of Object.keys(HOS_PROFILES)) { const p = HOS_PROFILES[k]; assert.ok(p.drive_max > 0 && p.on_duty_window > 0 && p.weekly_max > 0); } });

// 192 Bridge formula
test("Bridge: total weight summed", () => { const r = computeBridgeFormula({ axle_weights_lb: [12000, 17000, 17000], axle_spacings_ft: [12, 4] }); assert.equal(r.total_weight_lb, 46000); });
test("Bridge: over_interstate flag", () => { const r = computeBridgeFormula({ axle_weights_lb: [20000, 20000, 20000, 20000, 20000], axle_spacings_ft: [10, 10, 10, 10] }); assert.equal(r.over_interstate, true); });
test("Bridge: tandem over 34k flagged", () => { const r = computeBridgeFormula({ axle_weights_lb: [12000, 18000, 18000], axle_spacings_ft: [10, 4] }); assert.ok(r.axle_violations.some((v) => /tandem/.test(v))); });
test("Bridge: single over 20k flagged", () => { const r = computeBridgeFormula({ axle_weights_lb: [22000, 17000, 17000], axle_spacings_ft: [12, 4] }); assert.ok(r.axle_violations.length > 0); });
test("Bridge: spacing length mismatch errors", () => { const r = computeBridgeFormula({ axle_weights_lb: [12000, 17000], axle_spacings_ft: [12, 4] }); assert.ok(r.error); });
test("Bridge: empty list errors", () => { const r = computeBridgeFormula({ axle_weights_lb: [], axle_spacings_ft: [] }); assert.ok(r.error); });
test("Bridge: clean rig passes", () => { const r = computeBridgeFormula({ axle_weights_lb: [10000, 16000, 16000, 16000, 16000], axle_spacings_ft: [12, 4, 30, 4] }); assert.equal(r.over_interstate, false); assert.equal(r.axle_violations.length, 0); });
test("Bridge: example yields finite total", () => { const r = computeBridgeFormula(bridgeFormulaExample.inputs); assert.ok(Number.isFinite(r.total_weight_lb)); });
test("Bridge: bridge_violations is an array", () => { const r = computeBridgeFormula(bridgeFormulaExample.inputs); assert.ok(Array.isArray(r.bridge_violations)); });
test("Bridge: 80,000 cap reported", () => { const r = computeBridgeFormula({ axle_weights_lb: [10000], axle_spacings_ft: [] }); assert.equal(r.interstate_cap_lb, 80000); });

// 193 Reefer
test("Reefer: example continuous burn finite", () => { const r = computeReeferBurn(reeferBurnExample.inputs); assert.ok(r.fuel_burned > 0); assert.ok(r.run_time_hr > 0); });
test("Reefer: hot ambient burns 20% more", () => { const a = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 50, haul_hr: 10, ambient_band: "moderate" }); const b = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 50, haul_hr: 10, ambient_band: "hot" }); assert.ok(close(b.fuel_burned / a.fuel_burned, 1.20, 0.01)); });
test("Reefer: cycle mode burns less than continuous", () => { const a = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 50, haul_hr: 10, ambient_band: "moderate" }); const b = computeReeferBurn({ unit: "thermo_king_cycle", tank_gal: 50, haul_hr: 10, ambient_band: "moderate" }); assert.ok(b.fuel_burned < a.fuel_burned); });
test("Reefer: refuel flag when haul exceeds tank", () => { const r = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 20, haul_hr: 60, ambient_band: "moderate" }); assert.equal(r.refuel_required, true); });
test("Reefer: no refuel for short haul", () => { const r = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 50, haul_hr: 6, ambient_band: "moderate" }); assert.equal(r.refuel_required, false); });
test("Reefer: unknown unit errors", () => { const r = computeReeferBurn({ unit: "x", tank_gal: 50, haul_hr: 10, ambient_band: "moderate" }); assert.ok(r.error); });
test("Reefer: zero tank errors", () => { const r = computeReeferBurn({ unit: "carrier_continuous", tank_gal: 0, haul_hr: 10, ambient_band: "moderate" }); assert.ok(r.error); });
test("Reefer: zero haul errors", () => { const r = computeReeferBurn({ unit: "carrier_continuous", tank_gal: 50, haul_hr: 0, ambient_band: "moderate" }); assert.ok(r.error); });
test("Reefer: every unit has attribution", () => { for (const k of Object.keys(REEFER_BURN_GPH)) assert.ok(REEFER_BURN_GPH[k].attribution.length > 0); });
test("Reefer: run_time_hr = tank / gph", () => { const r = computeReeferBurn({ unit: "thermo_king_continuous", tank_gal: 50, haul_hr: 24, ambient_band: "moderate" }); assert.ok(close(r.run_time_hr, 50 / 0.65, 0.01)); });

// 194 Incoterm
test("Incoterm: FOB freight buyer", () => { const r = computeIncoterm({ term: "FOB" }); assert.equal(r.freight, "buyer"); });
test("Incoterm: DDP everything seller", () => { const r = computeIncoterm({ term: "DDP" }); assert.equal(r.freight, "seller"); assert.equal(r.import_clearance, "seller"); });
test("Incoterm: EXW buyer pays everything", () => { const r = computeIncoterm({ term: "EXW" }); assert.equal(r.freight, "buyer"); assert.equal(r.export_clearance, "buyer"); });
test("Incoterm: CIF includes insurance + freight by seller", () => { const r = computeIncoterm({ term: "CIF" }); assert.equal(r.freight, "seller"); });
test("Incoterm: unknown term errors", () => { const r = computeIncoterm({ term: "XYZ" }); assert.ok(r.error); });
test("Incoterm: every term has all fields", () => { for (const k of Object.keys(INCOTERMS_2020)) { const t = INCOTERMS_2020[k]; assert.ok(t.name && t.freight && t.risk_transfer && t.export_clearance && t.import_clearance); } });
test("Incoterm: citation references ICC by name only", () => { assert.match(computeIncoterm({ term: "FOB" }).citation, /ICC Incoterms 2020/); });
test("Incoterm: 11 standard terms", () => { assert.equal(Object.keys(INCOTERMS_2020).length, 11); });
test("Incoterm: example default", () => { assert.equal(incotermExample.inputs.term, "FOB"); });
test("Incoterm: FCA risk transfers at carrier", () => { const r = computeIncoterm({ term: "FCA" }); assert.match(r.risk_transfer, /carrier/); });

// Renderer registry
test("TRUCKING_RENDERERS: includes all 7 ids", () => { for (const id of ["dim-weight", "freight-density", "pallet-loadout", "hos-math", "bridge-formula", "reefer-burn", "incoterm-decoder"]) assert.equal(typeof TRUCKING_RENDERERS[id], "function", id); });
