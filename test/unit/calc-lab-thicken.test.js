// Additional v5 lab utility tests to push toward the spec 10/utility bar.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDilution, computeSerialDilution, computeMolecularWeight,
  computeMassMoles, computeRcf, computeResuspension, computePcrMix,
  computeBeerLambert, computeHendersonHasselbalch, computeHemocytometer,
  IUPAC_ATOMIC_WEIGHTS, BUFFER_PKA, CENTRIFUGE_ROTORS,
} from "../../calc-lab.js";

const close = (a, b, tol = 0.001) => Math.abs(a - b) <= tol;
const closeRel = (a, b, tol = 0.001) => Math.abs(a - b) / Math.abs(b) <= tol;

// --- Dilution: 6 more tests ---
test("Dilution: solving v2 from c1v1c2", () => { const r = computeDilution({ c1: 1, v1: 0.001, c2: 0.05, v2: 0 }); assert.ok(close(r.v2, 0.020)); });
test("Dilution: 1:100 dilution preserves invariant", () => { const r = computeDilution({ c1: 1, v1: 0, c2: 0.01, v2: 0.010 }); assert.ok(close(r.v1, 0.0001, 1e-9)); });
test("Dilution: diluent cannot exceed v2", () => { const r = computeDilution({ c1: 1, v1: 0, c2: 0.5, v2: 0.001 }); assert.ok(r.diluent_volume < r.v2); });
test("Dilution: extreme dilution (1e-9 c2)", () => { const r = computeDilution({ c1: 1, v1: 0, c2: 1e-9, v2: 1.0 }); assert.ok(close(r.v1, 1e-9, 1e-12)); });
test("Dilution: identical c yields v1 = v2", () => { const r = computeDilution({ c1: 0.5, v1: 0, c2: 0.5, v2: 0.010 }); assert.ok(close(r.v1, 0.010, 1e-9)); });

// --- Serial dilution: 4 more tests ---
test("Serial: 100 steps decreases concentration to 1e-100", () => { const r = computeSerialDilution({ starting_concentration: 1, dilution_factor: 10, volume_per_tube: 0.001, number_of_steps: 50 }); assert.ok(r.tubes[49].concentration > 0); });
test("Serial: factor 5 with 4 steps gives 1/625", () => { const r = computeSerialDilution({ starting_concentration: 1, dilution_factor: 5, volume_per_tube: 0.001, number_of_steps: 4 }); assert.ok(close(r.tubes[3].concentration, 1/625, 1e-6)); });
test("Serial: tubes array length matches step count", () => { const r = computeSerialDilution({ starting_concentration: 1, dilution_factor: 2, volume_per_tube: 0.001, number_of_steps: 7 }); assert.equal(r.tubes.length, 7); });
test("Serial: zero starting concentration errors", () => { assert.ok(computeSerialDilution({ starting_concentration: 0, dilution_factor: 10, volume_per_tube: 0.001, number_of_steps: 5 }).error); });

// --- Molecular weight: 7 more tests covering parser edges ---
test("MW: single element no subscript (Au)", () => { const r = computeMolecularWeight({ formula: "Au" }); assert.ok(close(r.molecular_weight, 196.97, 0.01)); });
test("MW: O2", () => { const r = computeMolecularWeight({ formula: "O2" }); assert.ok(close(r.molecular_weight, 31.998, 0.01)); });
test("MW: methane CH4", () => { const r = computeMolecularWeight({ formula: "CH4" }); assert.ok(close(r.molecular_weight, 12.011 + 4*1.008, 0.01)); });
test("MW: KMnO4 mixed-case multi-letter", () => { const r = computeMolecularWeight({ formula: "KMnO4" }); assert.ok(close(r.molecular_weight, 39.098 + 54.938 + 4*15.999, 0.01)); });
test("MW: stuck-together unrecognized chars error cleanly", () => { const r = computeMolecularWeight({ formula: "X@Y" }); assert.ok(r.error); });
test("MW: lowercase-only formula error", () => { const r = computeMolecularWeight({ formula: "abc" }); assert.ok(r.error); });
test("MW: every bundled element has positive weight", () => { for (const [s, w] of Object.entries(IUPAC_ATOMIC_WEIGHTS)) assert.ok(w > 0, s + " weight " + w); });
test("MW: noble gas He = 4.0026", () => { const r = computeMolecularWeight({ formula: "He" }); assert.ok(close(r.molecular_weight, 4.0026, 0.001)); });

// --- Mass-moles: 3 more tests ---
test("MassMoles: 18 g water = 1 mol", () => { const r = computeMassMoles({ mass_g: 18.015, molecular_weight: 18.015 }); assert.ok(close(r.moles, 1.0, 0.001)); });
test("MassMoles: 0.5 mol * 60 g/mol = 30 g", () => { const r = computeMassMoles({ moles: 0.5, molecular_weight: 60 }); assert.equal(r.mass_g, 30); });
test("MassMoles: negative MW errors", () => { assert.ok(computeMassMoles({ mass_g: 1, molecular_weight: -10 }).error); });

// --- RCF: 5 more tests ---
test("RCF: 5000 RPM at 100 mm gives expected RCF", () => { const r = computeRcf({ rotor_radius_mm: 100, rpm: 5000 }); assert.ok(closeRel(r.rcf, 1.118e-5 * 10 * 5000 * 5000, 0.001)); });
test("RCF: 1000 g RCF at 100 mm gives ~3000 RPM", () => { const r = computeRcf({ rotor_radius_mm: 100, rcf: 1000 }); assert.ok(closeRel(r.rpm, 2992.2, 0.005)); });
test("RCF: doubling radius doubles RCF at fixed RPM", () => {
  const a = computeRcf({ rotor_radius_mm: 50, rpm: 5000 });
  const b = computeRcf({ rotor_radius_mm: 100, rpm: 5000 });
  assert.ok(closeRel(b.rcf / a.rcf, 2.0, 0.001));
});
test("RCF: quadrupling RPM gives 16x RCF (squared)", () => {
  const a = computeRcf({ rotor_radius_mm: 100, rpm: 1000 });
  const b = computeRcf({ rotor_radius_mm: 100, rpm: 4000 });
  assert.ok(closeRel(b.rcf / a.rcf, 16.0, 0.001));
});
test("RCF: every bundled rotor radius is reasonable (40-200 mm)", () => { for (const v of Object.values(CENTRIFUGE_ROTORS)) assert.ok(v.radius_mm >= 40 && v.radius_mm <= 200); });

// --- Resuspension: 3 more tests ---
test("Resuspend: doubling mass doubles volume at fixed concentration", () => {
  const a = computeResuspension({ mass_g: 0.001, target_concentration: 1.0 });
  const b = computeResuspension({ mass_g: 0.002, target_concentration: 1.0 });
  assert.ok(closeRel(b.volume / a.volume, 2.0, 0.001));
});
test("Resuspend: zero target concentration errors", () => { assert.ok(computeResuspension({ mass_g: 0.001, target_concentration: 0 }).error); });
test("Resuspend: very high concentration gives small volume", () => { const r = computeResuspension({ mass_g: 1.0, target_concentration: 1000 }); assert.ok(close(r.volume, 0.001)); });

// --- PCR mix: 4 more tests ---
test("PCR: 1 reaction with 0% fudge yields per-reaction volume exactly", () => { const r = computePcrMix({ number_of_reactions: 1, fudge_factor_pct: 0, components: [{ name: "x", per_reaction: 25 }] }); assert.equal(r.total_master_mix, 25); });
test("PCR: total_per_reaction sums components correctly", () => { const r = computePcrMix({ number_of_reactions: 10, fudge_factor_pct: 10, components: [{ name: "a", per_reaction: 5 }, { name: "b", per_reaction: 7 }, { name: "c", per_reaction: 3 }] }); assert.equal(r.total_per_reaction, 15); });
test("PCR: arbitrary component count (10 components)", () => {
  const components = Array.from({ length: 10 }, (_, i) => ({ name: "c" + i, per_reaction: 1 }));
  const r = computePcrMix({ number_of_reactions: 5, fudge_factor_pct: 10, components });
  assert.equal(r.rows.length, 10);
});
test("PCR: negative fudge factor errors", () => { assert.ok(computePcrMix({ number_of_reactions: 5, fudge_factor_pct: -10, components: [{ name: "x", per_reaction: 5 }] }).error); });

// --- Beer-Lambert: 4 more tests ---
test("Beer: doubling path doubles concentration solved", () => {
  const a = computeBeerLambert({ absorbance: 0.5, path_length_cm: 1, epsilon: 1000 });
  const b = computeBeerLambert({ absorbance: 0.5, path_length_cm: 0.5, epsilon: 1000 });
  assert.ok(closeRel(b.concentration / a.concentration, 2.0, 0.0001));
});
test("Beer: doubling epsilon halves concentration", () => {
  const a = computeBeerLambert({ absorbance: 0.5, path_length_cm: 1, epsilon: 1000 });
  const b = computeBeerLambert({ absorbance: 0.5, path_length_cm: 1, epsilon: 2000 });
  assert.ok(closeRel(a.concentration / b.concentration, 2.0, 0.0001));
});
test("Beer: negative absorbance errors", () => { assert.ok(computeBeerLambert({ absorbance: -0.1, path_length_cm: 1, epsilon: 1000 }).error); });
test("Beer: 1 cm cuvette is the conventional default", () => { const r = computeBeerLambert({ absorbance: 1.0, path_length_cm: 1, epsilon: 100000 }); assert.ok(closeRel(r.concentration, 1e-5, 0.0001)); });

// --- Henderson-Hasselbalch: 5 more tests ---
test("HH: pH 1 unit below pKa -> 90% acid 10% base", () => {
  const r = computeHendersonHasselbalch({ pKa: 7, target_pH: 6, total_buffer_concentration: 1, total_volume: 1 });
  assert.ok(closeRel(r.fraction_acid, 10/11, 0.001));
  assert.ok(closeRel(r.fraction_base, 1/11, 0.001));
});
test("HH: phosphate pKa = 7.20", () => { assert.equal(BUFFER_PKA.phosphate.pKa, 7.20); });
test("HH: acetate has lower pKa than Tris", () => { assert.ok(BUFFER_PKA.acetate.pKa < BUFFER_PKA.Tris.pKa); });
test("HH: every bundled buffer has useful_range string", () => { for (const v of Object.values(BUFFER_PKA)) assert.ok(v.useful_range); });
test("HH: total_moles invariant: base+acid = total", () => {
  const r = computeHendersonHasselbalch({ pKa: 6.5, target_pH: 7.0, total_buffer_concentration: 0.2, total_volume: 0.5 });
  assert.ok(close(r.moles_base + r.moles_acid, r.total_moles, 1e-9));
});

// --- Hemocytometer: 4 more tests ---
test("Hemo: 4 squares, dilution=10, 50 cells/sq -> 5e6 cells/mL", () => { const r = computeHemocytometer({ total_cells_counted: 200, squares_counted: 4, dilution_factor: 10 }); assert.ok(closeRel(r.cells_per_mL, 5e6, 0.001)); });
test("Hemo: viability 50% from 100 total / 50 dead", () => { const r = computeHemocytometer({ total_cells_counted: 100, squares_counted: 4, dilution_factor: 1, dead_cells: 50 }); assert.equal(r.viability_pct, 50); });
test("Hemo: dead > total still computes (operator error noted)", () => { const r = computeHemocytometer({ total_cells_counted: 100, squares_counted: 4, dilution_factor: 1, dead_cells: 150 }); assert.ok(r.viability_pct <= 0); });
test("Hemo: zero counts -> zero cells/mL", () => { const r = computeHemocytometer({ total_cells_counted: 0, squares_counted: 4, dilution_factor: 1 }); assert.equal(r.cells_per_mL, 0); });
