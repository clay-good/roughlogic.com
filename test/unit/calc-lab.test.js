// Unit tests for calc-lab.js v5 utilities (255-264).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDilution, dilutionExample,
  computeSerialDilution, serialDilutionExample,
  computeMolecularWeight, mwExample, IUPAC_ATOMIC_WEIGHTS,
  computeMassMoles, massMolesExample,
  computeRcf, rcfExample, CENTRIFUGE_ROTORS,
  computeResuspension, resuspendExample,
  computePcrMix, pcrExample,
  computeBeerLambert, beerExample,
  computeHendersonHasselbalch, hhExample, BUFFER_PKA,
  computeHemocytometer, hemoExample,
  LAB_RENDERERS,
} from "../../calc-lab.js";

const close = (a, b, tol = 0.001) => Math.abs(a - b) <= tol;
const closeRel = (a, b, tol = 0.001) => Math.abs(a - b) / Math.abs(b) <= tol;

// 255 Dilution
test("Dilution: example solves V1", () => { const r = computeDilution(dilutionExample.inputs); assert.ok(close(r.v1, 0.001)); });
test("Dilution: solve C2 from C1V1V2", () => { const r = computeDilution({ c1: 2, v1: 0.005, c2: 0, v2: 0.020 }); assert.ok(close(r.c2, 0.5)); });
test("Dilution: diluent volume = V2 - V1", () => { const r = computeDilution({ c1: 1, v1: 0, c2: 0.1, v2: 0.010 }); assert.ok(close(r.diluent_volume, 0.009)); });
test("Dilution: too few knowns errors", () => { assert.ok(computeDilution({ c1: 1, v1: 0, c2: 0, v2: 0 }).error); });

// 256 Serial dilution
test("Serial: example concentrations decrease 10x each step", () => { const r = computeSerialDilution(serialDilutionExample.inputs); for (let i = 1; i < r.tubes.length; i++) assert.ok(close(r.tubes[i-1].concentration / r.tubes[i].concentration, 10, 0.0001)); });
test("Serial: 5 steps from 1.0 / 10x ends at 1e-5", () => { const r = computeSerialDilution({ starting_concentration: 1.0, dilution_factor: 10, volume_per_tube: 0.001, number_of_steps: 5 }); assert.ok(close(r.tubes[4].concentration, 1e-5, 1e-7)); });
test("Serial: transfer + diluent = volume", () => { const r = computeSerialDilution({ starting_concentration: 1, dilution_factor: 10, volume_per_tube: 0.001, number_of_steps: 3 }); assert.ok(close(r.transfer_volume + r.diluent_volume, 0.001, 1e-9)); });
test("Serial: factor <= 1 errors", () => { assert.ok(computeSerialDilution({ starting_concentration: 1, dilution_factor: 1, volume_per_tube: 0.001, number_of_steps: 3 }).error); });

// 257 Molecular weight
test("MW: NaCl ≈ 58.44", () => { const r = computeMolecularWeight({ formula: "NaCl" }); assert.ok(close(r.molecular_weight, 22.990 + 35.45, 0.01)); });
test("MW: glucose C6H12O6 ≈ 180.16", () => { const r = computeMolecularWeight({ formula: "C6H12O6" }); assert.ok(close(r.molecular_weight, 6*12.011 + 12*1.008 + 6*15.999, 0.01)); });
test("MW: (NH4)2SO4 example ≈ 132.14", () => { const r = computeMolecularWeight(mwExample.inputs); assert.ok(closeRel(r.molecular_weight, 132.14, 0.001)); });
test("MW: Ca(OH)2 parens + multiplier", () => { const r = computeMolecularWeight({ formula: "Ca(OH)2" }); assert.ok(close(r.molecular_weight, 40.078 + 2*(15.999 + 1.008), 0.01)); });
test("MW: Fe2(SO4)3 nested", () => { const r = computeMolecularWeight({ formula: "Fe2(SO4)3" }); assert.ok(close(r.molecular_weight, 2*55.845 + 3*(32.06 + 4*15.999), 0.01)); });
test("MW: K2HPO4 mixed", () => { const r = computeMolecularWeight({ formula: "K2HPO4" }); assert.ok(close(r.molecular_weight, 2*39.098 + 1.008 + 30.974 + 4*15.999, 0.01)); });
test("MW: unknown element errors", () => { assert.ok(computeMolecularWeight({ formula: "Xx2O" }).error); });
test("MW: empty errors", () => { assert.ok(computeMolecularWeight({ formula: "" }).error); });
test("MW: nested parens NaCl is just two atoms", () => { const r = computeMolecularWeight({ formula: "Na2SO4" }); assert.ok(close(r.molecular_weight, 2*22.990 + 32.06 + 4*15.999, 0.01)); });
test("MW: every common element bundled", () => { for (const sym of ["H", "C", "N", "O", "Na", "K", "Mg", "Ca", "Fe", "Cu", "Zn", "Cl", "P", "S"]) assert.ok(IUPAC_ATOMIC_WEIGHTS[sym], "missing " + sym); });

// 258 Mass-moles
test("MassMoles: 5 g NaCl / 58.44 ≈ 0.0856 mol", () => { const r = computeMassMoles(massMolesExample.inputs); assert.ok(closeRel(r.moles, 5/58.44, 0.001)); });
test("MassMoles: 0.1 mol * 18 g/mol = 1.8 g", () => { const r = computeMassMoles({ moles: 0.1, molecular_weight: 18.015 }); assert.ok(close(r.mass_g, 1.8015, 0.001)); });
test("MassMoles: needs exactly one of mass/moles", () => { assert.ok(computeMassMoles({ mass_g: 1, moles: 1, molecular_weight: 18 }).error); });

// 259 RCF
test("RCF: example 84 mm @ 14000 rpm ≈ 18412 g", () => { const r = computeRcf(rcfExample.inputs); assert.ok(closeRel(r.rcf, 1.118e-5 * 8.4 * 14000 * 14000, 0.001)); });
test("RCF: round-trip RCF -> RPM -> RCF", () => { const a = computeRcf({ rotor_radius_mm: 100, rpm: 10000 }); const b = computeRcf({ rotor_radius_mm: 100, rcf: a.rcf }); assert.ok(closeRel(b.rpm, 10000, 0.0001)); });
test("RCF: zero radius errors", () => { assert.ok(computeRcf({ rotor_radius_mm: 0, rpm: 10000 }).error); });
test("RCF: every bundled rotor has manufacturer + radius", () => { for (const v of Object.values(CENTRIFUGE_ROTORS)) { assert.ok(v.manufacturer); assert.ok(v.radius_mm > 0); } });

// 260 Resuspension
test("Resuspend: example", () => { const r = computeResuspension(resuspendExample.inputs); assert.ok(close(r.volume, 0.001, 1e-9)); });
test("Resuspend: zero mass errors", () => { assert.ok(computeResuspension({ mass_g: 0, target_concentration: 1 }).error); });

// 261 PCR mix
test("PCR: example produces total > 0", () => { const r = computePcrMix(pcrExample.inputs); assert.ok(r.total_master_mix > 0); });
test("PCR: 24 reactions @10% fudge = 26.4x", () => { const r = computePcrMix({ number_of_reactions: 24, fudge_factor_pct: 10, components: [{ name: "x", per_reaction: 1 }] }); assert.ok(close(r.scaling_factor, 26.4, 0.001)); });
test("PCR: per_reaction sum equals total per reaction", () => { const r = computePcrMix(pcrExample.inputs); assert.ok(close(r.total_per_reaction, 25.0, 0.01)); });
test("PCR: zero reactions errors", () => { assert.ok(computePcrMix({ number_of_reactions: 0, components: [{ name: "x", per_reaction: 1 }] }).error); });

// 262 Beer-Lambert
test("Beer: example A=0.5 L=1 e=50000 -> 1e-5 M", () => { const r = computeBeerLambert(beerExample.inputs); assert.ok(closeRel(r.concentration, 1e-5, 0.0001)); });
test("Beer: zero epsilon errors", () => { assert.ok(computeBeerLambert({ absorbance: 0.5, path_length_cm: 1, epsilon: 0 }).error); });
test("Beer: linear in absorbance", () => { const a = computeBeerLambert({ absorbance: 0.5, path_length_cm: 1, epsilon: 1000 }); const b = computeBeerLambert({ absorbance: 1.0, path_length_cm: 1, epsilon: 1000 }); assert.ok(closeRel(b.concentration / a.concentration, 2, 0.0001)); });

// 263 Henderson-Hasselbalch
test("HH: example pKa=7.20 pH=7.40 ratio ≈ 10^0.2", () => { const r = computeHendersonHasselbalch(hhExample.inputs); assert.ok(closeRel(r.ratio_base_acid, Math.pow(10, 0.2), 0.0001)); });
test("HH: pH = pKa -> ratio 1, half base half acid", () => { const r = computeHendersonHasselbalch({ pKa: 7, target_pH: 7, total_buffer_concentration: 1, total_volume: 1 }); assert.ok(closeRel(r.ratio_base_acid, 1, 0.0001)); assert.ok(closeRel(r.fraction_base, 0.5, 0.0001)); });
test("HH: total moles = c * V", () => { const r = computeHendersonHasselbalch({ pKa: 7, target_pH: 7.5, total_buffer_concentration: 0.1, total_volume: 0.5 }); assert.ok(close(r.total_moles, 0.05, 1e-6)); });
test("HH: bundled buffers all have pKa and citation", () => { for (const v of Object.values(BUFFER_PKA)) { assert.ok(v.pKa > 0); assert.ok(v.citation); } });
test("HH: zero pKa errors", () => { assert.ok(computeHendersonHasselbalch({ pKa: 0, target_pH: 7, total_buffer_concentration: 1, total_volume: 1 }).error); });

// 264 Hemocytometer
test("Hemo: example", () => { const r = computeHemocytometer(hemoExample.inputs); assert.ok(closeRel(r.cells_per_mL, (200/4) * 1e4 * 2, 0.0001)); });
test("Hemo: viability pct = (total - dead) / total", () => { const r = computeHemocytometer(hemoExample.inputs); assert.ok(closeRel(r.viability_pct, (190/200) * 100, 0.0001)); });
test("Hemo: no dead -> viability null", () => { const r = computeHemocytometer({ total_cells_counted: 100, squares_counted: 4, dilution_factor: 1 }); assert.equal(r.viability_pct, null); });
test("Hemo: zero squares errors", () => { assert.ok(computeHemocytometer({ total_cells_counted: 100, squares_counted: 0, dilution_factor: 1 }).error); });

// Renderer registry
test("LAB_RENDERERS exposes all 12 utilities", () => {
  const ids = Object.keys(LAB_RENDERERS);
  assert.equal(ids.length, 21);
  for (const id of [
    "molarity-dilution", "serial-dilution", "molecular-weight", "mass-moles",
    "rcf-rpm", "resuspension-volume", "pcr-master-mix", "beer-lambert",
    "henderson-hasselbalch", "hemocytometer", "od600-cell-count", "gel-percent-agarose",
  ]) assert.ok(typeof LAB_RENDERERS[id] === "function", id);
});
