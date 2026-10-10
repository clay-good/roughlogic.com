// Group T: Bench Science and Laboratory Math (utilities 255-264).
// See spec-v5.md section 2.3 / Step 60.
//
// Audience: graduate student, technician, high-school chemistry teacher,
// small-shop biotech engineer. All formulas are public physics or public
// chemistry. The data shards bundle physical constants and standard
// tables (IUPAC atomic weights, common laboratory buffer pKa values,
// representative centrifuge rotor radii). Per-tool inline notice carries
// the v5 bench-science variant: "Verify protocol against your lab's SOP
// before pipetting. A miscalculated dilution can ruin a run or a sample."

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeText, makeTextarea,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";
import { attachCsvExport, attachGlossaryTooltip } from "./v5-platform.js";

// v18 §7 contract guard: reject a non-finite numeric input. A renderer
// coerces an empty number field to 0 (Number("") === 0), so a NaN or
// Infinity reaching a solver is genuinely unusable (a pasted 1e999, a
// degenerate computed slot); per the spec-v18 §2 output contract the
// solver returns {error} rather than leaking a non-finite output field.
// Generic over the input object, so it needs no per-tile slot list, and
// it inspects only own numeric values (strings/arrays/null pass through).
// Non-exported, so it adds no v14 derivation-corpus row.
const _finiteGuard = (o) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const v of Object.values(o)) {
      if (typeof v === "number" && !Number.isFinite(v)) {
        return { error: "All numeric inputs must be finite numbers." };
      }
    }
  }
  return null;
};


// --- IUPAC standard atomic weights (g/mol) ---
//
// Source: IUPAC/CIAAW Abridged Standard Atomic Weights 2024 (4-significant-figure rounded
// where the published value carries an interval, e.g., H, B, C, N, O, S).
// Public reference; cite IUPAC by year. data/lab/iupac-atomic-weights.json
export const IUPAC_ATOMIC_WEIGHTS = {
  H: 1.008,   He: 4.0026, Li: 6.94,    Be: 9.0122, B: 10.81,
  C: 12.011,  N: 14.007,  O: 15.999,   F: 18.998,  Ne: 20.180,
  Na: 22.990, Mg: 24.305, Al: 26.982,  Si: 28.085, P: 30.974,
  S: 32.06,   Cl: 35.45,  Ar: 39.95,   K: 39.098,  Ca: 40.078,
  Sc: 44.956, Ti: 47.867, V: 50.942,   Cr: 51.996, Mn: 54.938,
  Fe: 55.845, Co: 58.933, Ni: 58.693,  Cu: 63.546, Zn: 65.38,
  Ga: 69.723, Ge: 72.630, As: 74.922,  Se: 78.971, Br: 79.904,
  Kr: 83.798, Rb: 85.468, Sr: 87.62,   Y: 88.906,  Zr: 91.222,
  Nb: 92.906, Mo: 95.95,  Tc: 98.0,    Ru: 101.07, Rh: 102.91,
  Pd: 106.42, Ag: 107.87, Cd: 112.41,  In: 114.82, Sn: 118.71,
  Sb: 121.76, Te: 127.60, I: 126.90,   Xe: 131.29, Cs: 132.91,
  Ba: 137.33, La: 138.91, Ce: 140.12,  Pt: 195.08, Au: 196.97,
  Hg: 200.59, Pb: 207.2,  Bi: 208.98,  U: 238.03,
  // Common biology / pharmacology subset; expand as needed.
};

// --- Common laboratory buffer pKa values, all at 25 C ---
// data/lab/buffer-pka.json
//
// The four Good's buffers used to be cited to Good et al. 1966 for numbers
// that were a MIX of two temperatures: Good tabulates at 20 C, and HEPES
// (7.55) and MOPS (7.20) were his 20 C values sitting in a table this comment
// called 25 C, while MES (6.10) and PIPES (6.76) had already been carried to
// 25 C by somebody who stopped halfway. Corrected 2026-09-09 to the 25 C
// column of PanReac AppliChem's Biological buffers IP-022EN, which agrees with
// Good's own 20 C values carried across by the d(pKa)/dT it publishes:
// HEPES 7.55 - 5(0.014) = 7.48, MOPS 7.20 - 5(0.011) = 7.14, and the two that
// were already right, MES 6.15 - 5(0.011) = 6.10 and PIPES 6.80 - 5(0.0085)
// = 6.76. A buffer's pKa without its temperature is not a constant.
export const BUFFER_PKA = {
  Tris:        { pKa: 8.06, useful_range: "7.0-9.0", citation: "CRC Handbook of Chemistry and Physics, 95th ed." },
  HEPES:       { pKa: 7.48, useful_range: "6.8-8.2", citation: "Good et al., Biochemistry 5(2): 467 (1966); Good tabulates 20 C, 25 C value per PanReac AppliChem IP-022EN" },
  MES:         { pKa: 6.10, useful_range: "5.5-6.7", citation: "Good et al., Biochemistry 5(2): 467 (1966); Good tabulates 20 C, 25 C value per PanReac AppliChem IP-022EN" },
  MOPS:        { pKa: 7.14, useful_range: "6.5-7.9", citation: "Good et al., Biochemistry 5(2): 467 (1966); Good tabulates 20 C, 25 C value per PanReac AppliChem IP-022EN" },
  PIPES:       { pKa: 6.76, useful_range: "6.1-7.5", citation: "Good et al., Biochemistry 5(2): 467 (1966); Good tabulates 20 C, 25 C value per PanReac AppliChem IP-022EN" },
  phosphate:   { pKa: 7.20, useful_range: "5.8-8.0", citation: "CRC Handbook (H2PO4- / HPO4^2-)" },
  acetate:     { pKa: 4.76, useful_range: "3.6-5.6", citation: "CRC Handbook (acetic acid / acetate)" },
  bicarbonate: { pKa: 6.35, useful_range: "5.5-7.5", citation: "CRC Handbook (H2CO3 / HCO3-)" },
};

// --- Representative centrifuge rotor radii (mm) ---
// Per-manufacturer attribution. data/lab/centrifuge-rotors.json
export const CENTRIFUGE_ROTORS = {
  // The 5424/5424R rotor is the FA-45-24-11 (24 x 1.5/2.0 mL, 15,000 rpm,
  // 21,130 x g). This row named the FA-45-30-11, which is the 5430's rotor --
  // the radius was right for the 5424 and only the part number was wrong.
  // Confirmed 2026-09-09 against Eppendorf distributor listings, and by the
  // radius each published speed/RCF pair implies: 21,130 / (1.118e-6 x 15,000^2)
  // is 84.0 mm, while the FA-45-30-11's 20,817 at 14,000 rpm is 95.0 mm.
  eppendorf_5424_FA452411:    { radius_mm: 84,  manufacturer: "Eppendorf", part: "FA-45-24-11 (5424/5424R)" },
  // The other three rows were read the same way on 2026-09-09, and all three
  // were wrong. The FA-45-6-30 carried 95 mm -- the FA-45-30-11's radius, the
  // same wrong-rotor copy the 5424 row made. Eppendorf's instructions give
  // 12.3 cm, and both published pairs agree: 16,639 x g at 11,000 rpm and
  // 20,133 at 12,100 each imply 123.0 mm.
  eppendorf_5810_FA45630:     { radius_mm: 123, manufacturer: "Eppendorf", part: "FA-45-6-30 (5810/5810R)" },
  // The A-4-81 carried 162 mm, which is the MTP/Flex plate bucket (2,900 x g
  // at 4,000 rpm implies 162.1; Eppendorf states 16.3 cm) under a label naming
  // the rotor generally. With the buckets it ships with -- 500 mL rectangular
  // or 7 x 50 mL conical -- Eppendorf states 18 cm, and its published
  // 3,220 x g at 4,000 rpm implies 180.0 mm. The label now names the bucket.
  eppendorf_5810_A48140:      { radius_mm: 180, manufacturer: "Eppendorf", part: "A-4-81 swing-bucket, 500 mL rectangular or 7 x 50 mL conical buckets (5810/5810R)" },
  beckman_JA10:               { radius_mm: 158, manufacturer: "Beckman Coulter", part: "JA-10 fixed-angle" },
  beckman_JA20:               { radius_mm: 108, manufacturer: "Beckman Coulter", part: "JA-20 fixed-angle" },
  // The Fiberlite carried 137 mm against a published 10.4 cm -- every RCF it
  // gave was 32% high. Thermo publishes 14,500 rpm / 24,446 x g, which implies
  // 104.0 mm.
  thermo_F15_8x50c:           { radius_mm: 104, manufacturer: "Thermo Fisher", part: "Fiberlite F15-8x50c" },
};

// --- 255: Molarity and Dilution (C1V1 = C2V2) ---
//
// Solve for the missing fourth from any three. Units handled in M and L
// internally; renderer does unit conversion before calling.

// dims: in { c1: N L^-3, v1: L^3, c2: N L^-3, v2: L^3 }
//        out: { c1: N L^-3, v1: L^3, c2: N L^-3, v2: L^3, diluent_volume: L^3 }
// (Molarity is amount-per-volume `N L^-3`; volume is `L^3`. The
//  solver returns the missing fourth from C1V1 = C2V2 and a diluent
//  volume that is the additive difference v2 - v1 in the same `L^3`.)
export function computeDilution({ c1, v1, c2, v2 }) {
  // A non-finite input (NaN/Infinity) reaching the solve branch leaks
  // non-finite output fields; reject it up front (C-1/C-3). null/undefined are
  // the "blank to solve" sentinels and are left for the knowns counter.
  for (const x of [c1, v1, c2, v2]) {
    if (x !== undefined && x !== null && !Number.isFinite(x)) return { error: "Inputs must be finite numbers." };
  }
  const knowns = [c1, v1, c2, v2].filter((x) => Number.isFinite(x) && x > 0).length;
  if (knowns < 3) return { error: "Provide three of c1, v1, c2, v2 (positive values)." };
  let out = { c1, v1, c2, v2 };
  if (!(c1 > 0)) out.c1 = (c2 * v2) / v1;
  else if (!(v1 > 0)) out.v1 = (c2 * v2) / c1;
  else if (!(c2 > 0)) out.c2 = (c1 * v1) / v2;
  else if (!(v2 > 0)) out.v2 = (c1 * v1) / c2;
  // DR-16: when the target volume is below the starting volume this is a
  // concentration step, not a dilution; v2 - v1 would present a negative
  // "volume to add." Flag it and withhold the negative field.
  if (out.v2 < out.v1) {
    return { ...out, diluent_volume: null, flag: "Target volume is less than starting volume; this is a concentration step, not a dilution." };
  }
  const diluent_volume = out.v2 - out.v1;
  return { ...out, diluent_volume };
}

export const dilutionExample = { inputs: { c1: 1.0, v1: 0, c2: 0.1, v2: 0.05 }, expected: { v1: 0.005 } };

// --- 256: Serial Dilution Planner ---

// dims: in { starting_concentration: N L^-3, dilution_factor: dimensionless, volume_per_tube: L^3, number_of_steps: dimensionless }
//        out: { transfer_volume: L^3, diluent_volume: L^3, dilution_factor: dimensionless, volume_per_tube: L^3 }
// (Each step divides the molar concentration `N L^-3` by a
//  dimensionless dilution factor; transfer and diluent volumes are
//  derived from per-tube volume in `L^3`. The `tubes` array carries
//  per-step `N L^-3` concentrations matching the input dimension.)
export function computeSerialDilution({
  starting_concentration = 0, dilution_factor = 10, volume_per_tube = 0.001,
  number_of_steps = 1,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(starting_concentration > 0)) return { error: "Starting concentration must be positive." };
  if (!(dilution_factor > 1)) return { error: "Dilution factor must be > 1." };
  if (!(volume_per_tube > 0)) return { error: "Volume per tube must be positive." };
  if (!(number_of_steps >= 1)) return { error: "Need at least one step." };
  // Bound the tube array: number_of_steps = Infinity would allocate without
  // limit and exhaust memory (v18 C-6/D-6). 1,000 steps is far beyond any
  // real serial dilution.
  if (!Number.isFinite(number_of_steps) || number_of_steps > 1000) return { error: "Number of steps must be a realistic count (≤ 1000)." };
  const transfer_volume = volume_per_tube / dilution_factor;
  const diluent_volume = volume_per_tube - transfer_volume;
  const tubes = [];
  let conc = starting_concentration;
  for (let i = 0; i < number_of_steps; i++) {
    conc = conc / dilution_factor;
    tubes.push({ step: i + 1, concentration: conc });
  }
  return { transfer_volume, diluent_volume, tubes, dilution_factor, volume_per_tube };
}

export const serialDilutionExample = { inputs: { starting_concentration: 1.0, dilution_factor: 10, volume_per_tube: 0.001, number_of_steps: 5 } };

// --- 257: Molecular Weight from Formula ---
//
// Tiny recursive-descent parser over a chemical formula string that
// supports parentheses and integer subscripts. Examples accepted:
//   NaCl, C6H12O6, K2HPO4, (NH4)2SO4, Ca(OH)2, Fe2(SO4)3.
// Unknown element symbols cause an error.

function parseFormula(s) {
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "(" || c === ")") { tokens.push({ kind: c }); i++; }
    else if (/[A-Z]/.test(c)) {
      let sym = c; i++;
      if (i < s.length && /[a-z]/.test(s[i])) { sym += s[i]; i++; }
      let num = "";
      while (i < s.length && /[0-9]/.test(s[i])) { num += s[i]; i++; }
      tokens.push({ kind: "el", sym, count: num ? Number(num) : 1 });
    }
    else if (/[0-9]/.test(c)) {
      let num = "";
      while (i < s.length && /[0-9]/.test(s[i])) { num += s[i]; i++; }
      tokens.push({ kind: "num", count: Number(num) });
    }
    else if (c === "·" || c === ".") {
      // Hydrate notation; treat as new molecule, return as separate tally.
      tokens.push({ kind: "·" });
      i++;
    }
    else if (/\s/.test(c)) { i++; }
    else { return { error: "Unrecognized character: " + c }; }
  }
  // Parse by walking tokens; track stack of multipliers from "(...)N".
  let pos = 0;
  function parseGroup(stopAtClose) {
    const tally = {};
    while (pos < tokens.length) {
      const t = tokens[pos];
      if (t.kind === "(") {
        pos++;
        const inner = parseGroup(true);
        if (inner.error) return inner;
        // Optional multiplier after closing paren.
        let mult = 1;
        if (pos < tokens.length && tokens[pos].kind === "num") {
          mult = tokens[pos].count;
          pos++;
        }
        for (const [k, v] of Object.entries(inner.tally)) tally[k] = (tally[k] || 0) + v * mult;
      } else if (t.kind === ")") {
        if (!stopAtClose) return { error: "Unmatched close paren." };
        pos++;
        return { tally };
      } else if (t.kind === "el") {
        tally[t.sym] = (tally[t.sym] || 0) + t.count;
        pos++;
      } else if (t.kind === "num") {
        return { error: "Unexpected number." };
      } else if (t.kind === "·") {
        pos++;
        // Treat hydrate dot as concatenation.
      } else {
        return { error: "Unexpected token." };
      }
    }
    if (stopAtClose) return { error: "Unmatched open paren." };
    return { tally };
  }
  const r = parseGroup(false);
  return r;
}

// dims: in { formula: dimensionless }
//        out: { molecular_weight: M N^-1 }
// (Chemical formula is a categorical token string (dimensionless);
//  the IUPAC-weighted sum surfaces as molar mass `M N^-1`
//  (grams-per-mole). The `breakdown` array reports per-element
//  counts (dimensionless) and weighted contributions in the same
//  `M N^-1` units.)
export function computeMolecularWeight({ formula = "" }) {
  if (!formula || typeof formula !== "string") return { error: "Provide a formula string." };
  const r = parseFormula(formula.trim());
  if (r.error) return { error: r.error };
  let mw = 0;
  const breakdown = [];
  for (const [sym, n] of Object.entries(r.tally)) {
    const w = IUPAC_ATOMIC_WEIGHTS[sym];
    if (w === undefined) return { error: "Unknown element symbol: " + sym };
    const contrib = w * n;
    mw += contrib;
    breakdown.push({ symbol: sym, count: n, atomic_weight: w, contribution: contrib });
  }
  return { formula, molecular_weight: mw, breakdown };
}

export const mwExample = { inputs: { formula: "(NH4)2SO4" }, expected: { molecular_weight: 132.14 } };

// --- 258: Mass-to-Moles and Moles-to-Mass ---

// dims: in { mass_g: M, moles: N, molecular_weight: M N^-1 }
//        out: { mass_g: M, moles: N, molecular_weight: M N^-1 }
// (n = m / MW: dividing mass `M` by molar mass `M N^-1` yields amount
//  of substance `N`. The solver returns the missing third quantity
//  in its native base dimension.)
export function computeMassMoles({ mass_g, moles, molecular_weight }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(molecular_weight > 0)) return { error: "Molecular weight must be positive." };
  if (Number.isFinite(mass_g) && mass_g > 0 && (!Number.isFinite(moles) || moles === 0)) {
    return { mass_g, moles: mass_g / molecular_weight, molecular_weight };
  }
  if (Number.isFinite(moles) && moles > 0 && (!Number.isFinite(mass_g) || mass_g === 0)) {
    return { mass_g: moles * molecular_weight, moles, molecular_weight };
  }
  return { error: "Provide exactly one of mass_g or moles." };
}

export const massMolesExample = { inputs: { mass_g: 10, molecular_weight: 58.44 } };

// --- spec-v1228: ideal gas law (PV = nRT) ---
// The lab basic-chemistry set has mass-moles, molecular-weight, and molarity-dilution but no gas law --
// the member that connects moles to a gas's pressure, volume, and temperature. This adds it: PV = nRT,
// solvable for any one of the four, with R = 0.0820573 L*atm/(mol*K). Density needs the molar mass
// (see molecular-weight / mass-moles).
// dims: in { solve_for: dimensionless, pressure_atm: M L^-1 T^-2, volume_l: L^3, moles: N, temperature_c: T } out: { pressure_atm: M L^-1 T^-2, volume_l: L^3, moles: N, temperature_c: T, molar_volume_l: L^3 }
export function computeIdealGasLaw({ solve_for = "moles", pressure_atm = 0, volume_l = 0, moles = 0, temperature_c = 25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const R = 0.0820573; // L*atm/(mol*K)
  const P = Number(pressure_atm) || 0;
  const V = Number(volume_l) || 0;
  const n = Number(moles) || 0;
  const Tc = Number(temperature_c);
  if (!["moles", "pressure", "volume", "temperature"].includes(solve_for)) return { error: "Solve-for must be moles, pressure, volume, or temperature." };
  if (!Number.isFinite(Tc) && solve_for !== "temperature") return { error: "Temperature must be a number (C)." };
  const Tk = Tc + 273.15;
  const out = { pressure_atm: P, volume_l: V, moles: n, temperature_c: Tc, temperature_k: Tk };
  if (solve_for === "moles") {
    if (!(P > 0) || !(V > 0)) return { error: "Pressure and volume must be positive (atm, L)." };
    if (!(Tk > 0)) return { error: "Temperature must be above absolute zero (-273.15 C)." };
    out.moles = P * V / (R * Tk);
  } else if (solve_for === "pressure") {
    if (!(n > 0) || !(V > 0)) return { error: "Moles and volume must be positive (mol, L)." };
    if (!(Tk > 0)) return { error: "Temperature must be above absolute zero (-273.15 C)." };
    out.pressure_atm = n * R * Tk / V;
  } else if (solve_for === "volume") {
    if (!(n > 0) || !(P > 0)) return { error: "Moles and pressure must be positive (mol, atm)." };
    if (!(Tk > 0)) return { error: "Temperature must be above absolute zero (-273.15 C)." };
    out.volume_l = n * R * Tk / P;
  } else { // temperature
    if (!(P > 0) || !(V > 0) || !(n > 0)) return { error: "Pressure, volume, and moles must be positive (atm, L, mol)." };
    out.temperature_k = P * V / (n * R);
    out.temperature_c = out.temperature_k - 273.15;
  }
  out.molar_volume_l = out.moles > 0 ? out.volume_l / out.moles : null;
  if (![out.pressure_atm, out.volume_l, out.moles, out.temperature_k].every(Number.isFinite)) return { error: "Ideal-gas math is not a finite value." };
  out.note = "The ideal gas law PV = nRT, the member that links moles (from the mass-moles or molecular-weight tiles) to a gas's pressure, volume, and temperature -- solvable for whichever of the four is unknown, with R = 0.0820573 L*atm/(mol*K) and the temperature in kelvin (entered in C). One mole of any ideal gas fills 22.41 L at STP (0 C, 1 atm) and 24.47 L at 25 C and 1 atm, so a bench chemist reads moles straight off a measured gas volume. Solving for pressure gives a sealed vessel's pressure as it is heated or filled; solving for volume sizes a gas-collection or displacement setup; solving for temperature backs out the gas temperature from a closed P-V state. Real gases deviate at high pressure or near condensation (van-der-waals, or for natural gas gas-z-factor, makes the correction); the density = P x molar_mass / (R x T) needs the molar mass, which the molecular-weight tile supplies. A first-principles chemistry aid; the measurement conditions and the gas's real behavior govern.";
  return out;
}
export const idealGasLawExample = { inputs: { solve_for: "volume", pressure_atm: 1, volume_l: 0, moles: 1, temperature_c: 25 } };

// --- spec-v1258: van der Waals real-gas pressure and compressibility Z ---
// The ideal-gas-law note names its own missing member: "Real gases deviate at high
// pressure or near condensation (a van der Waals or compressibility Z correction is
// separate)." This adds that correction. The van der Waals equation of state
// (P + a n^2/V^2)(V - n b) = n R T, solved for pressure, gives P_real = n R T/(V - n b)
// - a n^2/V^2; the a (attraction) and b (excluded-volume) constants are tabulated per
// gas from the public-domain CRC Handbook. Z = P V/(n R T) reports the deviation from
// ideal. R = 0.0820573 L*atm/(mol*K), b in L/mol, T in kelvin. The CRC tabulates a
// in L^2*bar/mol^2; it is divided by 1.01325 bar/atm before use. Until 2026-09-19
// the bar figure was applied as atm, overstating the attraction term by 1.3%.
const _BAR_PER_ATM = 1.01325;
const _VDW_CONSTANTS = {
  // gas: [a (L^2*bar/mol^2), b (L/mol)] -- CRC Handbook of Chemistry & Physics, van der Waals constants
  helium: [0.0346, 0.0238],
  hydrogen: [0.2476, 0.02661],
  nitrogen: [1.370, 0.0387],
  oxygen: [1.382, 0.03186],
  air: [1.358, 0.0364],
  "carbon-dioxide": [3.640, 0.04267],
  methane: [2.283, 0.04278],
  ammonia: [4.225, 0.03707],
  "water-vapor": [5.536, 0.03049],
};
// dims: in { gas: dimensionless, moles: N, volume_l: L^3, temperature_c: T } out: { pressure_real_atm: M L^-1 T^-2, pressure_ideal_atm: M L^-1 T^-2, z_factor: dimensionless, deviation_pct: dimensionless, molar_volume_l: L^3, temperature_k: T }
export function computeVanDerWaals({ gas = "carbon-dioxide", moles = 0, volume_l = 0, temperature_c = 25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const R = 0.0820573; // L*atm/(mol*K)
  const c = _VDW_CONSTANTS[gas];
  if (!c) return { error: "Gas must be one of the listed gases (helium, nitrogen, carbon-dioxide, ...)." };
  const n = Number(moles) || 0;
  const V = Number(volume_l) || 0;
  const Tc = Number(temperature_c);
  if (!(n > 0)) return { error: "Moles must be positive (mol)." };
  if (!(V > 0)) return { error: "Volume must be positive (L)." };
  if (!Number.isFinite(Tc)) return { error: "Temperature must be a number (C)." };
  const Tk = Tc + 273.15;
  if (!(Tk > 0)) return { error: "Temperature must be above absolute zero (-273.15 C)." };
  const a = c[0] / _BAR_PER_ATM, b = c[1];
  if (!(V > n * b)) return { error: "Volume is at or below the molecules' own excluded volume (n b); the gas is too compressed for this model." };
  const pReal = (n * R * Tk) / (V - n * b) - (a * n * n) / (V * V);
  const pIdeal = (n * R * Tk) / V;
  if (!(pReal > 0)) return { error: "Real-gas pressure is not positive at this density; the state is outside the model's valid range." };
  const z = (pReal * V) / (n * R * Tk);
  const deviationPct = ((pReal - pIdeal) / pIdeal) * 100;
  const molarVolume = V / n;
  const out = { pressure_real_atm: pReal, pressure_ideal_atm: pIdeal, z_factor: z, deviation_pct: deviationPct, molar_volume_l: molarVolume, temperature_k: Tk };
  if (![pReal, pIdeal, z, deviationPct, molarVolume].every(Number.isFinite)) return { error: "Van der Waals math is not a finite value." };
  out.note = "The van der Waals equation of state (P + a n^2/V^2)(V - n b) = n R T, the real-gas correction the ideal gas law leaves out -- solved for pressure it gives P = n R T/(V - n b) - a n^2/V^2, where the b term is the volume the molecules themselves occupy and the a term is the pull between them. The compressibility factor Z = PV/(nRT) is 1 for an ideal gas; below 1 the attraction dominates (the gas is easier to compress than ideal, typical near condensation) and above 1 the excluded volume dominates (harder to compress, typical at very high pressure). Z drifts furthest from 1 at high pressure and low temperature, which is exactly where the ideal gas law misreads a sealed vessel or a compressed-gas cylinder. The a and b constants are the CRC Handbook values for each gas. A first-principles chemistry aid; near the critical point or two-phase region a fuller EOS and the real measurement govern.";
  return out;
}
export const vanDerWaalsExample = { inputs: { gas: "carbon-dioxide", moles: 1, volume_l: 1, temperature_c: 0 } };

// --- spec-v1229: Arrhenius rate/temperature dependence ---
// The lab kinetics set (doubling-time, growth-projected-count, michaelis-menten) has no rate-vs-temperature
// member. This adds the Arrhenius equation via its two-point form: from two rate constants at two
// temperatures, solve the activation energy Ea = R ln(k2/k1) / (1/T1 - 1/T2), the pre-exponential A, and
// the Q10 temperature coefficient. R = 8.314 J/(mol*K), temperatures in kelvin.
// dims: in { k1: dimensionless, temp1_c: T, k2: dimensionless, temp2_c: T } out: { ea_j_mol: dimensionless, ea_kj_mol: dimensionless, pre_exponential_a: dimensionless, q10: dimensionless }
export function computeArrheniusEquation({ k1 = 0, temp1_c = 0, k2 = 0, temp2_c = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const R = 8.314; // J/(mol*K)
  const K1 = Number(k1) || 0;
  const K2 = Number(k2) || 0;
  const t1c = Number(temp1_c);
  const t2c = Number(temp2_c);
  if (!(K1 > 0) || !(K2 > 0)) return { error: "Both rate constants k1 and k2 must be positive." };
  if (!Number.isFinite(t1c) || !Number.isFinite(t2c)) return { error: "Both temperatures must be numbers (C)." };
  const T1 = t1c + 273.15;
  const T2 = t2c + 273.15;
  if (!(T1 > 0) || !(T2 > 0)) return { error: "Temperatures must be above absolute zero (-273.15 C)." };
  if (t1c === t2c) return { error: "The two temperatures must differ." };
  const ea_j_mol = R * Math.log(K2 / K1) / (1 / T1 - 1 / T2);
  const pre_exponential_a = K1 * Math.exp(ea_j_mol / (R * T1));
  const q10 = Math.pow(K2 / K1, 10 / (t2c - t1c));
  if (![ea_j_mol, pre_exponential_a, q10].every(Number.isFinite)) return { error: "Arrhenius math is not a finite value." };
  return {
    ea_j_mol, ea_kj_mol: ea_j_mol / 1000, pre_exponential_a, q10,
    note: "The Arrhenius activation energy from two rate measurements, the rate-vs-temperature member the lab kinetics set (doubling-time, Michaelis-Menten) leaves out. Reaction rate rises with temperature as k = A exp(-Ea/RT); measuring the rate constant k at two temperatures and taking the ratio cancels the pre-exponential A and gives the activation energy Ea = R ln(k2/k1) / (1/T1 - 1/T2), with R = 8.314 J/(mol*K) and the temperatures in kelvin. A reaction whose rate doubles from 25 to 35 C has Ea = 52.9 kJ/mol; once Ea is known the pre-exponential A = k1 exp(Ea/(R T1)) follows, and k at any other temperature is A exp(-Ea/RT). The tile also reports the Q10 temperature coefficient (the factor the rate changes per 10 C, (k2/k1)^(10/dT)), the everyday shorthand in biology and food science -- Q10 = 2 means the rate doubles per 10 C. A higher Ea means a more temperature-sensitive reaction. Assumes Arrhenius behavior over the interval (a single mechanism, no change of rate-limiting step); a curved Arrhenius plot signals a mechanism change. A first-principles chemistry aid; the measured kinetics govern.",
  };
}
export const arrheniusEquationExample = { inputs: { k1: 1.0, temp1_c: 25, k2: 2.0, temp2_c: 35 } };

// The enthalpy of vaporization from two vapor-pressure / temperature points, the
// phase-equilibrium member the lab phys-chem set (ideal gas, Arrhenius, Nernst) leaves out.
// Clausius-Clapeyron: ln(P2/P1) = -(dHvap/R)(1/T2 - 1/T1), so dHvap = R ln(P2/P1)/(1/T1 - 1/T2).
// Only the pressure RATIO enters, so any consistent pressure unit works. R = 8.314 J/(mol*K).
// dims: in { pressure1: dimensionless, temp1_c: T, pressure2: dimensionless, temp2_c: T } out: { enthalpy_j_mol: dimensionless, enthalpy_kj_mol: dimensionless }
export function computeClausiusClapeyron({ pressure1 = 0, temp1_c = 0, pressure2 = 0, temp2_c = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const R = 8.314; // J/(mol*K)
  const P1 = Number(pressure1) || 0;
  const P2 = Number(pressure2) || 0;
  const t1c = Number(temp1_c);
  const t2c = Number(temp2_c);
  if (!(P1 > 0) || !(P2 > 0)) return { error: "Both vapor pressures P1 and P2 must be positive (any consistent unit; only the ratio matters)." };
  if (!Number.isFinite(t1c) || !Number.isFinite(t2c)) return { error: "Both temperatures must be numbers (C)." };
  const T1 = t1c + 273.15;
  const T2 = t2c + 273.15;
  if (!(T1 > 0) || !(T2 > 0)) return { error: "Temperatures must be above absolute zero (-273.15 C)." };
  if (t1c === t2c) return { error: "The two temperatures must differ." };
  const enthalpy_j_mol = R * Math.log(P2 / P1) / (1 / T1 - 1 / T2);
  const slope_k = -enthalpy_j_mol / R; // d(ln P)/d(1/T)
  if (![enthalpy_j_mol, slope_k].every(Number.isFinite)) return { error: "Clausius-Clapeyron math is not a finite value." };
  return {
    enthalpy_j_mol, enthalpy_kj_mol: enthalpy_j_mol / 1000, slope_k,
    note: "The molar enthalpy of vaporization from two vapor-pressure/temperature points, the phase-equilibrium member the lab phys-chem set (ideal gas, Arrhenius, Nernst) leaves out. The Clausius-Clapeyron equation ln(P2/P1) = -(dHvap/R)(1/T2 - 1/T1) rearranges to dHvap = R ln(P2/P1) / (1/T1 - 1/T2), with R = 8.314 J/(mol*K) and the temperatures in kelvin. Only the pressure RATIO enters, so any consistent pressure unit (kPa, mmHg, atm, psi) gives the same enthalpy. Water going from 760 mmHg at 100 C to 525.9 mmHg at 90 C returns about 41.5 kJ/mol, close to the tabulated 40.7 kJ/mol (the small excess is the constant-enthalpy, ideal-vapor, negligible-liquid-volume approximation over a 10 C interval). The slope of a ln(P) vs 1/T plot is -dHvap/R. To predict a vapor pressure at a third temperature or a boiling point at a new pressure, apply the same equation with the enthalpy found here. Assumes dHvap constant over the interval and an ideal vapor; a first-principles chemistry aid, the measured data govern.",
  };
}
export const clausiusClapeyronExample = { inputs: { pressure1: 760, temp1_c: 100, pressure2: 525.9, temp2_c: 90 } };

// --- spec-v1246: solution osmolarity and osmotic pressure (van't Hoff) ---
// The colligative-property member the lab set (molarity, dilution, Beer-Lambert, Henderson-Hasselbalch)
// leaves out. Osmolarity = i * C (i the van't Hoff dissociation number: 1 glucose/urea, 2 NaCl/KCl,
// 3 CaCl2/MgCl2/Na2SO4); osmotic pressure Pi = Osm * R * T, R = 0.08206 L*atm/(mol*K), T in kelvin.
// dims: in { concentration_mol_l: dimensionless, vant_hoff_i: dimensionless, temperature_c: T } out: { osmolarity_osmol_l: dimensionless, osmolarity_mosmol_l: dimensionless, osmotic_pressure_atm: dimensionless }
export function computeOsmolarity({ concentration_mol_l = 0, vant_hoff_i = 1, temperature_c = 37 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const C = Number(concentration_mol_l) || 0;
  const i = Number(vant_hoff_i) || 0;
  const Tc = Number(temperature_c);
  if (!(C > 0)) return { error: "Molar concentration must be positive (mol/L)." };
  if (!(i > 0)) return { error: "The van't Hoff factor i must be positive (1 = non-dissociating, 2 = NaCl/KCl, 3 = CaCl2)." };
  if (!Number.isFinite(Tc)) return { error: "Temperature must be a number (C)." };
  const T = Tc + 273.15;
  if (!(T > 0)) return { error: "Temperature must be above absolute zero (-273.15 C)." };
  const R = 0.08206; // L*atm/(mol*K)
  const osmolarity_osmol_l = i * C;
  const osmolarity_mosmol_l = osmolarity_osmol_l * 1000;
  const osmotic_pressure_atm = osmolarity_osmol_l * R * T;
  if (![osmolarity_osmol_l, osmolarity_mosmol_l, osmotic_pressure_atm].every(Number.isFinite)) return { error: "Osmolarity math is not a finite value." };
  return {
    osmolarity_osmol_l, osmolarity_mosmol_l, osmotic_pressure_atm,
    note: "The osmolarity and osmotic pressure of a solution from the molar concentration and the van't Hoff factor, the colligative-property member the lab chemistry set leaves out. Osmolarity Osm = i x C counts the effective number of dissolved particles: the van't Hoff factor i is 1 for a non-dissociating solute (glucose, urea), 2 for a 1:1 salt (NaCl, KCl), and 3 for a 1:2 salt (CaCl2, MgCl2, Na2SO4). The osmotic pressure Pi = Osm x R x T follows from van't Hoff's law (the ideal-solution analog of the ideal gas law), with R = 0.08206 L*atm/(mol*K) and T in kelvin. Physiological saline, 0.9% NaCl = 0.154 mol/L with i = 2, is 0.308 Osmol/L (308 mOsm/L) and exerts about 7.8 atm at body temperature - the reason isotonic fluids are formulated to about 300 mOsm/L so cells neither swell nor shrink. This is the ideal (dilute-solution) form; at higher concentrations the real i falls below the nominal value (ion pairing) and an osmotic coefficient corrects it. Report osmolarity per liter of SOLUTION (osmolality is per kg of solvent, slightly different). A first-principles chemistry aid; the measured osmometer reading governs.",
  };
}
export const osmolarityExample = { inputs: { concentration_mol_l: 0.154, vant_hoff_i: 2, temperature_c: 37 } };

// --- spec-v1230: Nernst equation (cell / electrode potential) ---
// The lab chemistry set has no electrochemistry member. This adds the Nernst equation
// E = E0 - (RT/nF) ln Q, R = 8.314 J/(mol*K), F = 96485 C/mol; at 25 C the slope RT ln(10)/(nF) is
// 0.05916/n V per decade of Q. Practical for battery, corrosion, and ion/pH-electrode work.
// dims: in { standard_potential_v: M L^2 T^-3 I^-1, electrons_n: dimensionless, reaction_quotient: dimensionless, temperature_c: T } out: { cell_potential_v: M L^2 T^-3 I^-1, nernst_slope_v: M L^2 T^-3 I^-1 }
export function computeNernstEquation({ standard_potential_v = 0, electrons_n = 1, reaction_quotient = 1, temperature_c = 25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const R = 8.314; // J/(mol*K)
  const F = 96485; // C/mol
  const E0 = Number(standard_potential_v);
  const n = Number(electrons_n) || 0;
  const Q = Number(reaction_quotient) || 0;
  const Tc = Number(temperature_c);
  if (!Number.isFinite(E0)) return { error: "Standard potential E0 must be a number (V)." };
  if (!(n > 0)) return { error: "The number of electrons transferred n must be positive." };
  if (!(Q > 0)) return { error: "The reaction quotient Q must be positive (a ratio of activities/concentrations)." };
  if (!Number.isFinite(Tc)) return { error: "Temperature must be a number (C)." };
  const T = Tc + 273.15;
  if (!(T > 0)) return { error: "Temperature must be above absolute zero (-273.15 C)." };
  const cell_potential_v = E0 - (R * T / (n * F)) * Math.log(Q);
  const nernst_slope_v = (R * T * Math.log(10)) / (n * F);
  if (![cell_potential_v, nernst_slope_v].every(Number.isFinite)) return { error: "Nernst math is not a finite value." };
  return {
    cell_potential_v, nernst_slope_v,
    note: "The Nernst equation, the electrochemistry member the lab chemistry set leaves out: the actual cell (or electrode) potential at non-standard conditions, E = E0 - (RT/nF) ln Q, where E0 is the standard potential, n the electrons transferred, Q the reaction quotient (the products-over-reactants activity ratio), R = 8.314 J/(mol*K), and F = 96485 C/mol (the Faraday constant). At 25 C the term RT ln(10)/(nF) collapses to the familiar 0.05916/n volts per DECADE of Q, so a Zn-Cu (Daniell) cell with E0 = 1.10 V and n = 2 rises to 1.16 V when the products are diluted 100-fold (Q = 0.01) and falls to 1.04 V when they are concentrated 100-fold (Q = 100). Set Q = 1 (standard conditions) and E = E0. The same relation is the basis of the pH electrode (a 59 mV-per-pH-unit slope at 25 C for n = 1) and of corrosion and battery-state-of-charge estimates. Uses activities approximated by concentrations (dilute-solution assumption); it does not include the junction potential, activity coefficients at high ionic strength, or kinetic overpotential. A first-principles electrochemistry aid; the measured cell and reference electrode govern.",
  };
}
export const nernstEquationExample = { inputs: { standard_potential_v: 1.10, electrons_n: 2, reaction_quotient: 0.01, temperature_c: 25 } };

// --- 259: Centrifuge RPM <-> RCF ---
//
// RCF (g) = 1.118e-5 * r_cm * RPM^2  (r in cm, RPM in revolutions / minute)

// dims: in { rotor_radius_mm: L, rpm: T^-1, rcf: dimensionless }
//        out: { rotor_radius_mm: L, rpm: T^-1, rcf: dimensionless }
// (Rotor radius in mm is length `L`; RPM is revolutions-per-time
//  `T^-1`; relative centrifugal force is a ratio of accelerations
//  (dimensionless multiple of g). The 1.118e-5 constant absorbs the
//  cm-vs-mm length-unit conversion and the (2*pi/60)^2 / g factor
//  baked into the published RCF formula.)
export function computeRcf({ rotor_radius_mm = 0, rpm, rcf }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rotor_radius_mm > 0)) return { error: "Rotor radius (mm) must be positive." };
  const r_cm = rotor_radius_mm / 10;
  if (Number.isFinite(rpm) && rpm > 0) {
    const computed = 1.118e-5 * r_cm * rpm * rpm;
    return { rotor_radius_mm, rpm, rcf: computed };
  }
  if (Number.isFinite(rcf) && rcf > 0) {
    const computedRpm = Math.sqrt(rcf / (1.118e-5 * r_cm));
    return { rotor_radius_mm, rpm: computedRpm, rcf };
  }
  return { error: "Provide one of rpm or rcf." };
}

export const rcfExample = { inputs: { rotor_radius_mm: 85, rpm: 10000 } };

// --- 260: Resuspension Volume ---

// dims: in { mass_g: M, target_concentration: M L^-3 }
//        out: { mass_g: M, target_concentration: M L^-3, volume: L^3 }
// (Volume = mass / concentration: dividing mass `M` by mass-per-
//  volume `M L^-3` yields volume `L^3`. The lyophilized-protein
//  resuspension case uses g/L (mass concentration) rather than
//  molarity since MW is not always known.)
export function computeResuspension({ mass_g = 0, target_concentration = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(mass_g > 0)) return { error: "Lyophilized mass must be positive." };
  if (!(target_concentration > 0)) return { error: "Target concentration must be positive." };
  // mass_g / target = volume in volume units consistent with target denominator.
  return { mass_g, target_concentration, volume: mass_g / target_concentration };
}

export const resuspendExample = { inputs: { mass_g: 0.001, target_concentration: 1.0 } };

// --- 261: PCR Master Mix ---

// dims: in { number_of_reactions: dimensionless, components: dimensionless, fudge_factor_pct: dimensionless }
//        out: { total_per_reaction: L^3, total_master_mix: L^3, scaling_factor: dimensionless }
// (Reaction count and fudge factor are dimensionless; each
//  component's `per_reaction` carries the caller's microliter
//  volume convention. The aggregator multiplies volumes `L^3` by a
//  dimensionless scaling factor, preserving the volume dimension on
//  the totals and on each `rows[].total`.)
export function computePcrMix({
  number_of_reactions = 1, components = [], fudge_factor_pct = 10,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(number_of_reactions >= 1)) return { error: "Need at least one reaction." };
  if (!Array.isArray(components) || components.length === 0) return { error: "Provide at least one component." };
  if (!(fudge_factor_pct >= 0)) return { error: "Fudge factor cannot be negative." };
  const factor = number_of_reactions * (1 + fudge_factor_pct / 100);
  const rows = components.map((c) => ({
    name: c.name,
    per_reaction: Number(c.per_reaction) || 0,
    total: (Number(c.per_reaction) || 0) * factor,
  }));
  const total_per_reaction = rows.reduce((a, b) => a + b.per_reaction, 0);
  const total_master_mix = rows.reduce((a, b) => a + b.total, 0);
  return { rows, total_per_reaction, total_master_mix, scaling_factor: factor };
}

export const pcrExample = {
  inputs: {
    number_of_reactions: 24, fudge_factor_pct: 10,
    components: [
      { name: "2x Master Mix", per_reaction: 12.5 },
      { name: "Forward primer (10 uM)", per_reaction: 1.0 },
      { name: "Reverse primer (10 uM)", per_reaction: 1.0 },
      { name: "Template", per_reaction: 2.0 },
      { name: "Nuclease-free water", per_reaction: 8.5 },
    ],
  },
};

// --- 262: Beer-Lambert Concentration ---
//
// A = epsilon * c * L  =>  c = A / (epsilon * L)

// dims: in { absorbance: dimensionless, path_length_cm: L, epsilon: N^-1 L^2 }
//        out: { absorbance: dimensionless, path_length_cm: L, epsilon: N^-1 L^2, concentration: N L^-3 }
// (Beer-Lambert A = epsilon * c * L: absorbance is the log10 ratio
//  I0/I (dimensionless); molar extinction coefficient in
//  `M^-1 cm^-1` expands to `(N L^-3)^-1 L^-1 = N^-1 L^2`; path
//  length is `L`; concentration is `N L^-3`. The product
//  `(N^-1 L^2) * (N L^-3) * L = dimensionless` is consistent.)
export function computeBeerLambert({ absorbance = 0, path_length_cm = 1, epsilon = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  absorbance = Number(absorbance);
  if (!(absorbance >= 0)) return { error: "Absorbance cannot be negative." };
  if (!(path_length_cm > 0)) return { error: "Path length must be positive." };
  if (!(epsilon > 0)) return { error: "Molar extinction coefficient must be positive." };
  const c = absorbance / (epsilon * path_length_cm);
  return { absorbance, path_length_cm, epsilon, concentration: c };
}

export const beerExample = { inputs: { absorbance: 0.5, path_length_cm: 1, epsilon: 50000 } };

// --- 263: Henderson-Hasselbalch Buffer ---
//
// pH = pKa + log10([A-] / [HA])
// ratio = 10^(pH - pKa)
// fraction_base = ratio / (ratio + 1); fraction_acid = 1 - fraction_base.

// dims: in { pKa: dimensionless, target_pH: dimensionless, total_buffer_concentration: N L^-3, total_volume: L^3 }
//        out: { ratio_base_acid: dimensionless, fraction_base: dimensionless, fraction_acid: dimensionless, moles_base: N, moles_acid: N, total_moles: N, pKa: dimensionless, target_pH: dimensionless }
// (pH and pKa are -log10 activities and dimensionless; ratio and
//  fractions are dimensionless. Total moles `N` come from
//  concentration `N L^-3` times volume `L^3`, with base and acid
//  shares apportioned by the dimensionless Henderson-Hasselbalch
//  fractions.)
export function computeHendersonHasselbalch({
  pKa = 0, target_pH = 0, total_buffer_concentration = 0, total_volume = 0,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pKa > 0)) return { error: "pKa must be positive." };
  if (!(target_pH > 0)) return { error: "Target pH must be positive." };
  if (!(total_buffer_concentration > 0)) return { error: "Total buffer concentration must be positive." };
  if (!(total_volume > 0)) return { error: "Total volume must be positive." };
  const ratio_base_acid = Math.pow(10, target_pH - pKa);
  const fraction_base = ratio_base_acid / (ratio_base_acid + 1);
  const fraction_acid = 1 - fraction_base;
  const moles_total = total_buffer_concentration * total_volume;
  const moles_base = moles_total * fraction_base;
  const moles_acid = moles_total * fraction_acid;
  if (![ratio_base_acid].every(Number.isFinite)) return { error: "The henderson hasselbalch result is not a finite number; check the inputs for a value that is far out of range." };
  return {
    ratio_base_acid, fraction_base, fraction_acid,
    moles_base, moles_acid, total_moles: moles_total,
    pKa, target_pH,
  };
}

export const hhExample = { inputs: { pKa: 7.20, target_pH: 7.40, total_buffer_concentration: 0.1, total_volume: 1.0 } };

// --- 264: Hemocytometer Cell Count ---
//
// Standard Neubauer (improved): each large square = 0.1 uL = 1e-4 mL.
// cells/mL = (avg cells per large square) * 10^4 * dilution_factor.

// dims: in { total_cells_counted: dimensionless, squares_counted: dimensionless, dilution_factor: dimensionless, dead_cells: dimensionless }
//        out: { avg_per_square: dimensionless, cells_per_mL: L^-3, viability_pct: dimensionless, squares_counted: dimensionless, dilution_factor: dimensionless }
// (Cell counts and the dilution factor are dimensionless integers
//  / ratios; the 1e4 factor converts the standard Neubauer large-
//  square volume (0.1 uL) to a per-mL count, so `cells_per_mL`
//  carries inverse-volume `L^-3`. Viability is a percent
//  (dimensionless ratio scaled by 100).)
export function computeHemocytometer({
  total_cells_counted = 0, squares_counted = 4, dilution_factor = 1,
  dead_cells = null,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(total_cells_counted >= 0)) return { error: "Cell count cannot be negative." };
  if (!(squares_counted > 0)) return { error: "Need at least one square counted." };
  if (!(dilution_factor > 0)) return { error: "Dilution factor must be positive." };
  if (Number.isFinite(dead_cells) && dead_cells > total_cells_counted) return { error: "Dead cells cannot exceed the total cells counted." };
  const avg_per_square = total_cells_counted / squares_counted;
  const cells_per_mL = avg_per_square * 1e4 * dilution_factor;
  let viability_pct = null;
  if (Number.isFinite(dead_cells) && dead_cells >= 0 && total_cells_counted > 0) {
    const live = total_cells_counted - dead_cells;
    viability_pct = (live / total_cells_counted) * 100;
  }
  return { avg_per_square, cells_per_mL, viability_pct, squares_counted, dilution_factor };
}

export const hemoExample = { inputs: { total_cells_counted: 200, squares_counted: 4, dilution_factor: 2, dead_cells: 10 } };

// --- Notice ---

const LAB_NOTICE = "Verify protocol against your lab's SOP before pipetting. A miscalculated dilution can ruin a run or a sample.";

function makeNotice(text) {
  const p = document.createElement("p");
  p.className = "tool-notice";
  p.textContent = text;
  return p;
}

// --- Renderers (compact pattern) ---

function renderDilution(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: dilution formula C1V1 = C2V2. First principles.";
  inputRegion.appendChild(makeNotice(LAB_NOTICE));
  const t = document.createElement("span"); t.textContent = "C1V1 = C2V2 (molarity)"; inputRegion.appendChild(t); attachGlossaryTooltip(t, "C1V1_C2V2");
  const c1 = makeNumber("C1 (M, leave 0 to solve)", "dl-c1", { step: "any", min: "0" });
  const v1 = makeNumber("V1 (L, leave 0 to solve)", "dl-v1", { step: "any", min: "0" });
  const c2 = makeNumber("C2 (M, leave 0 to solve)", "dl-c2", { step: "any", min: "0" });
  const v2 = makeNumber("V2 (L, leave 0 to solve)", "dl-v2", { step: "any", min: "0" });
  for (const f of [c1, v1, c2, v2]) inputRegion.appendChild(f.wrap);
  const out = makeOutputLine(outputRegion, "Solved", "dl-out");
  const dil = makeOutputLine(outputRegion, "Diluent volume", "dl-out-dv");
  const update = debounce(() => {
    const r = computeDilution({
      c1: Number(c1.input.value) || 0, v1: Number(v1.input.value) || 0,
      c2: Number(c2.input.value) || 0, v2: Number(v2.input.value) || 0,
    });
    if (r.error) { out.textContent = r.error; dil.textContent = ""; return; }
    out.textContent = "C1 " + fmt(r.c1, 4) + " M / V1 " + fmt(r.v1, 4) + " L / C2 " + fmt(r.c2, 4) + " M / V2 " + fmt(r.v2, 4) + " L";
    dil.textContent = r.diluent_volume === null ? r.flag : fmt(r.diluent_volume, 4) + " L";
  }, DEBOUNCE_MS);
  for (const f of [c1, v1, c2, v2]) f.input.addEventListener("input", update);
  attachExampleButton(inputRegion, () => { c1.input.value = 1.0; v1.input.value = 0; c2.input.value = 0.1; v2.input.value = 0.05; update(); });
}

function renderSerialDilution(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: serial dilution. First principles. Each step concentration = previous / dilution factor.";
  inputRegion.appendChild(makeNotice(LAB_NOTICE));
  const sc = makeNumber("Starting concentration", "sd-sc", { step: "any", min: "0" });
  const df = makeNumber("Dilution factor (>1)", "sd-df", { step: "any", min: "1.0001" });
  df.input.value = "10";
  const vp = makeNumber("Volume per tube (L)", "sd-vp", { step: "any", min: "0" });
  vp.input.value = "0.001";
  const ns = makeNumber("Number of steps", "sd-ns", { step: "1", min: "1" });
  ns.input.value = "5";
  for (const f of [sc, df, vp, ns]) inputRegion.appendChild(f.wrap);
  const tv = makeOutputLine(outputRegion, "Transfer volume per step", "sd-out-tv");
  const dv = makeOutputLine(outputRegion, "Diluent volume per tube", "sd-out-dv");
  const tableWrap = document.createElement("div"); outputRegion.appendChild(tableWrap);
  const update = debounce(() => {
    const r = computeSerialDilution({
      starting_concentration: Number(sc.input.value), dilution_factor: Number(df.input.value),
      volume_per_tube: Number(vp.input.value), number_of_steps: Number(ns.input.value),
    });
    while (tableWrap.firstChild) tableWrap.removeChild(tableWrap.firstChild);
    if (r.error) { tv.textContent = r.error; dv.textContent = ""; return; }
    tv.textContent = fmt(r.transfer_volume, 6) + " L";
    dv.textContent = fmt(r.diluent_volume, 6) + " L";
    const t = document.createElement("table");
    const trh = document.createElement("tr"); for (const h of ["Step", "Concentration"]) { const th = document.createElement("th"); th.textContent = h; trh.appendChild(th); }
    t.appendChild(trh);
    for (const tube of r.tubes) {
      const tr = document.createElement("tr");
      const td1 = document.createElement("td"); td1.textContent = tube.step; tr.appendChild(td1);
      const td2 = document.createElement("td"); td2.textContent = tube.concentration.toExponential(3); tr.appendChild(td2);
      t.appendChild(tr);
    }
    tableWrap.appendChild(t);
  }, DEBOUNCE_MS);
  for (const f of [sc, df, vp, ns]) f.input.addEventListener("input", update);
  attachExampleButton(inputRegion, () => { sc.input.value = 1.0; df.input.value = 10; vp.input.value = 0.001; ns.input.value = 5; update(); });
}

function renderMolecularWeight(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IUPAC/CIAAW Abridged Standard Atomic Weights 2024. Bundled.";
  inputRegion.appendChild(makeNotice(LAB_NOTICE));
  const t = document.createElement("span"); t.textContent = "IUPAC atomic weights"; inputRegion.appendChild(t); attachGlossaryTooltip(t, "IUPAC");
  const f = makeText("Chemical formula", "mw-f");
  f.input.placeholder = "(NH4)2SO4";
  inputRegion.appendChild(f.wrap);
  const mwOut = makeOutputLine(outputRegion, "Molecular weight", "mw-out-w");
  const breakOut = document.createElement("p"); outputRegion.appendChild(breakOut);
  const update = debounce(() => {
    const r = computeMolecularWeight({ formula: f.input.value });
    if (r.error) { mwOut.textContent = r.error; breakOut.textContent = ""; return; }
    mwOut.textContent = fmt(r.molecular_weight, 4) + " g/mol";
    breakOut.textContent = r.breakdown.map((b) => b.symbol + " x " + b.count + " (" + b.atomic_weight + ")").join("; ");
  }, DEBOUNCE_MS);
  f.input.addEventListener("input", update);
  attachExampleButton(inputRegion, () => { f.input.value = "NaCl"; update(); });
}

function renderMassMoles(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: moles = mass / molecular weight. First principles.";
  inputRegion.appendChild(makeNotice(LAB_NOTICE));
  const mass = makeNumber("Mass (g, leave 0 to solve)", "mm-m", { step: "any", min: "0" });
  const moles = makeNumber("Moles (leave 0 to solve)", "mm-n", { step: "any", min: "0" });
  const mw = makeNumber("Molecular weight (g/mol)", "mm-mw", { step: "any", min: "0" });
  for (const fl of [mass, moles, mw]) inputRegion.appendChild(fl.wrap);
  const out = makeOutputLine(outputRegion, "Result", "mm-out");
  const update = debounce(() => {
    const r = computeMassMoles({ mass_g: Number(mass.input.value) || 0, moles: Number(moles.input.value) || 0, molecular_weight: Number(mw.input.value) || 0 });
    if (r.error) { out.textContent = r.error; return; }
    out.textContent = fmt(r.mass_g, 4) + " g = " + fmt(r.moles, 6) + " mol (MW " + fmt(r.molecular_weight, 4) + " g/mol)";
  }, DEBOUNCE_MS);
  for (const fl of [mass, moles, mw]) fl.input.addEventListener("input", update);
  attachExampleButton(inputRegion, () => { mass.input.value = 10; moles.input.value = 0; mw.input.value = 58.44; update(); });
}

function renderIdealGasLaw(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ideal gas law PV = nRT, R = 0.0820573 L*atm/(mol*K), temperatures in kelvin; solvable for any of P, V, n, T (any general chemistry text). Real gases deviate at high pressure / near condensation (van-der-waals, or for natural gas gas-z-factor, makes the correction); density needs the molar mass. First principles.";
  inputRegion.appendChild(makeNotice(LAB_NOTICE));
  const solve = makeSelect("Solve for", "igl-solve", [
    { value: "moles", label: "Moles n" },
    { value: "pressure", label: "Pressure P (atm)" },
    { value: "volume", label: "Volume V (L)", selected: true },
    { value: "temperature", label: "Temperature T (°C)" },
  ]);
  const p = makeNumber("Pressure (atm)", "igl-p", { step: "any", min: "0" });
  const v = makeNumber("Volume (L)", "igl-v", { step: "any", min: "0" });
  const n = makeNumber("Moles (mol)", "igl-n", { step: "any", min: "0" });
  const t = makeNumber("Temperature (°C)", "igl-t", { step: "any" });
  for (const f of [solve, p, v, n, t]) inputRegion.appendChild(f.wrap);
  const oRes = makeOutputLine(outputRegion, "Result", "igl-out-res");
  const oMv = makeOutputLine(outputRegion, "Molar volume", "igl-out-mv");
  const oNote = makeOutputLine(outputRegion, "Note", "igl-out-note");
  const rd = (i) => (i.value === "" ? 0 : Number(i.value) || 0);
  const update = debounce(() => {
    const r = computeIdealGasLaw({ solve_for: solve.select.value, pressure_atm: rd(p.input), volume_l: rd(v.input), moles: rd(n.input), temperature_c: t.input.value === "" ? 25 : Number(t.input.value) });
    if (r.error) { oRes.textContent = r.error; oMv.textContent = "-"; oNote.textContent = ""; return; }
    const sf = solve.select.value;
    if (sf === "moles") oRes.textContent = fmt(r.moles, 5) + " mol";
    else if (sf === "pressure") oRes.textContent = fmt(r.pressure_atm, 4) + " atm";
    else if (sf === "volume") oRes.textContent = fmt(r.volume_l, 4) + " L";
    else oRes.textContent = fmt(r.temperature_c, 2) + " C (" + fmt(r.temperature_k, 2) + " K)";
    oMv.textContent = r.molar_volume_l == null ? "-" : fmt(r.molar_volume_l, 3) + " L/mol";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { solve.select.value = "volume"; p.input.value = "1"; v.input.value = ""; n.input.value = "1"; t.input.value = "25"; update(); });
  for (const f of [p, v, n, t]) f.input.addEventListener("input", update);
  solve.select.addEventListener("change", update);
}

function renderVanDerWaals(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: van der Waals equation of state (P + a n^2/V^2)(V - n b) = nRT, solved for pressure; a and b constants per gas from the CRC Handbook of Chemistry & Physics; R = 0.0820573 L*atm/(mol*K), T in kelvin. Compressibility Z = PV/(nRT). First principles. Near the critical point a fuller EOS governs.";
  inputRegion.appendChild(makeNotice(LAB_NOTICE));
  const gas = makeSelect("Gas", "vdw-gas", [
    { value: "helium", label: "Helium" },
    { value: "hydrogen", label: "Hydrogen" },
    { value: "nitrogen", label: "Nitrogen" },
    { value: "oxygen", label: "Oxygen" },
    { value: "air", label: "Air" },
    { value: "carbon-dioxide", label: "Carbon dioxide", selected: true },
    { value: "methane", label: "Methane" },
    { value: "ammonia", label: "Ammonia" },
    { value: "water-vapor", label: "Water vapor" },
  ]);
  const n = makeNumber("Moles (mol)", "vdw-n", { step: "any", min: "0" });
  const v = makeNumber("Volume (L)", "vdw-v", { step: "any", min: "0" });
  const t = makeNumber("Temperature (°C)", "vdw-t", { step: "any" });
  for (const f of [gas, n, v, t]) inputRegion.appendChild(f.wrap);
  const oReal = makeOutputLine(outputRegion, "Real pressure (van der Waals)", "vdw-out-real");
  const oIdeal = makeOutputLine(outputRegion, "Ideal pressure (PV=nRT)", "vdw-out-ideal");
  const oZ = makeOutputLine(outputRegion, "Compressibility Z / deviation", "vdw-out-z");
  const oNote = makeOutputLine(outputRegion, "Note", "vdw-out-note");
  const rd = (i) => (i.value === "" ? 0 : Number(i.value) || 0);
  const update = debounce(() => {
    const r = computeVanDerWaals({ gas: gas.select.value, moles: rd(n.input), volume_l: rd(v.input), temperature_c: t.input.value === "" ? 0 : Number(t.input.value) });
    if (r.error) { oReal.textContent = r.error; oIdeal.textContent = "-"; oZ.textContent = "-"; oNote.textContent = ""; return; }
    oReal.textContent = fmt(r.pressure_real_atm, 4) + " atm";
    oIdeal.textContent = fmt(r.pressure_ideal_atm, 4) + " atm";
    oZ.textContent = "Z " + fmt(r.z_factor, 4) + " (" + (r.deviation_pct >= 0 ? "+" : "") + fmt(r.deviation_pct, 2) + "% vs ideal)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { gas.select.value = "carbon-dioxide"; n.input.value = "1"; v.input.value = "1"; t.input.value = "0"; update(); });
  for (const f of [n, v, t]) f.input.addEventListener("input", update);
  gas.select.addEventListener("change", update);
}

function renderArrheniusEquation(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Arrhenius equation k = A exp(-Ea/RT), two-point form Ea = R ln(k2/k1)/(1/T1 - 1/T2), R = 8.314 J/(mol*K), temperatures in kelvin (Arrhenius, 1889). Q10 = (k2/k1)^(10/dT). Assumes a single mechanism over the interval. First principles.";
  inputRegion.appendChild(makeNotice(LAB_NOTICE));
  const k1 = makeNumber("Rate constant k1", "arr-k1", { step: "any", min: "0" });
  const t1 = makeNumber("Temperature 1 (°C)", "arr-t1", { step: "any" });
  const k2 = makeNumber("Rate constant k2", "arr-k2", { step: "any", min: "0" });
  const t2 = makeNumber("Temperature 2 (°C)", "arr-t2", { step: "any" });
  for (const f of [k1, t1, k2, t2]) inputRegion.appendChild(f.wrap);
  const oEa = makeOutputLine(outputRegion, "Activation energy Ea", "arr-out-ea");
  const oA = makeOutputLine(outputRegion, "Pre-exponential A / Q10", "arr-out-a");
  const oNote = makeOutputLine(outputRegion, "Note", "arr-out-note");
  const rd = (i) => (i.value === "" ? 0 : Number(i.value) || 0);
  const update = debounce(() => {
    const r = computeArrheniusEquation({ k1: rd(k1.input), temp1_c: t1.input.value === "" ? 0 : Number(t1.input.value), k2: rd(k2.input), temp2_c: t2.input.value === "" ? 0 : Number(t2.input.value) });
    if (r.error) { oEa.textContent = r.error; oA.textContent = "-"; oNote.textContent = ""; return; }
    oEa.textContent = fmt(r.ea_kj_mol, 2) + " kJ/mol (" + fmt(r.ea_j_mol, 0) + " J/mol)";
    oA.textContent = r.pre_exponential_a.toExponential(3) + " / Q10 " + fmt(r.q10, 3);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { k1.input.value = "1"; t1.input.value = "25"; k2.input.value = "2"; t2.input.value = "35"; update(); });
  for (const f of [k1, t1, k2, t2]) f.input.addEventListener("input", update);
}

function renderClausiusClapeyron(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Clausius-Clapeyron equation ln(P2/P1) = -(dHvap/R)(1/T2 - 1/T1), so dHvap = R ln(P2/P1)/(1/T1 - 1/T2), R = 8.314 J/(mol*K), temperatures in kelvin. Only the pressure ratio enters, so any consistent unit works. Assumes constant dHvap and an ideal vapor. First principles.";
  inputRegion.appendChild(makeNotice(LAB_NOTICE));
  const p1 = makeNumber("Vapor pressure P1 (any unit)", "cc-p1", { step: "any", min: "0" });
  const t1 = makeNumber("Temperature 1 (°C)", "cc-t1", { step: "any" });
  const p2 = makeNumber("Vapor pressure P2 (same unit as P1)", "cc-p2", { step: "any", min: "0" });
  const t2 = makeNumber("Temperature 2 (°C)", "cc-t2", { step: "any" });
  for (const f of [p1, t1, p2, t2]) inputRegion.appendChild(f.wrap);
  const oH = makeOutputLine(outputRegion, "Enthalpy of vaporization dHvap", "cc-out-h");
  const oS = makeOutputLine(outputRegion, "ln(P) vs 1/T slope", "cc-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "cc-out-note");
  const rd = (i) => (i.value === "" ? 0 : Number(i.value) || 0);
  const update = debounce(() => {
    const r = computeClausiusClapeyron({ pressure1: rd(p1.input), temp1_c: t1.input.value === "" ? 0 : Number(t1.input.value), pressure2: rd(p2.input), temp2_c: t2.input.value === "" ? 0 : Number(t2.input.value) });
    if (r.error) { oH.textContent = r.error; oS.textContent = "-"; oNote.textContent = ""; return; }
    oH.textContent = fmt(r.enthalpy_kj_mol, 2) + " kJ/mol (" + fmt(r.enthalpy_j_mol, 0) + " J/mol)";
    oS.textContent = fmt(r.slope_k, 1) + " K";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { p1.input.value = "760"; t1.input.value = "100"; p2.input.value = "525.9"; t2.input.value = "90"; update(); });
  for (const f of [p1, t1, p2, t2]) f.input.addEventListener("input", update);
}

function renderOsmolarity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: osmolarity Osm = i x C (i the van't Hoff dissociation number: 1 glucose/urea, 2 NaCl/KCl, 3 CaCl2/MgCl2) and osmotic pressure Pi = Osm R T, R = 0.08206 L*atm/(mol*K), T in kelvin (van't Hoff's law; standard physical chemistry). Ideal dilute-solution form; report per liter of solution. First principles.";
  inputRegion.appendChild(makeNotice(LAB_NOTICE));
  const c = makeNumber("Molar concentration C (mol/L)", "osm-c", { step: "any", min: "0" });
  const i = makeNumber("van't Hoff factor i (1 glucose, 2 NaCl, 3 CaCl2)", "osm-i", { step: "any", min: "0" });
  const t = makeNumber("Temperature (°C)", "osm-t", { step: "any" });
  for (const f of [c, i, t]) inputRegion.appendChild(f.wrap);
  const oOsm = makeOutputLine(outputRegion, "Osmolarity", "osm-out-osm");
  const oPi = makeOutputLine(outputRegion, "Osmotic pressure", "osm-out-pi");
  const oNote = makeOutputLine(outputRegion, "Note", "osm-out-note");
  const rd = (x) => (x.value === "" ? 0 : Number(x.value) || 0);
  const update = debounce(() => {
    const r = computeOsmolarity({ concentration_mol_l: rd(c.input), vant_hoff_i: rd(i.input), temperature_c: t.input.value === "" ? 37 : Number(t.input.value) });
    if (r.error) { oOsm.textContent = r.error; oPi.textContent = "-"; oNote.textContent = ""; return; }
    oOsm.textContent = fmt(r.osmolarity_osmol_l, 4) + " Osmol/L (" + fmt(r.osmolarity_mosmol_l, 0) + " mOsm/L)";
    oPi.textContent = fmt(r.osmotic_pressure_atm, 2) + " atm";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { c.input.value = "0.154"; i.input.value = "2"; t.input.value = "37"; update(); });
  for (const f of [c, i, t]) f.input.addEventListener("input", update);
}

function renderNernstEquation(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Nernst equation E = E0 - (RT/nF) ln Q, R = 8.314 J/(mol*K), F = 96485 C/mol; at 25 C the slope is 0.05916/n V per decade of Q (Nernst; standard electrochemistry). Uses activities approximated by concentrations; excludes junction potential and overpotential. First principles.";
  inputRegion.appendChild(makeNotice(LAB_NOTICE));
  const e0 = makeNumber("Standard potential E0 (V)", "ns-e0", { step: "any" });
  const n = makeNumber("Electrons transferred n", "ns-n", { step: "any", min: "0" });
  const q = makeNumber("Reaction quotient Q", "ns-q", { step: "any", min: "0" });
  const t = makeNumber("Temperature (°C)", "ns-t", { step: "any" });
  for (const f of [e0, n, q, t]) inputRegion.appendChild(f.wrap);
  const oE = makeOutputLine(outputRegion, "Cell / electrode potential E", "ns-out-e");
  const oS = makeOutputLine(outputRegion, "Nernst slope (per decade of Q)", "ns-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "ns-out-note");
  const rd = (i) => (i.value === "" ? 0 : Number(i.value) || 0);
  const update = debounce(() => {
    const r = computeNernstEquation({ standard_potential_v: e0.input.value === "" ? 0 : Number(e0.input.value), electrons_n: rd(n.input), reaction_quotient: rd(q.input), temperature_c: t.input.value === "" ? 25 : Number(t.input.value) });
    if (r.error) { oE.textContent = r.error; oS.textContent = "-"; oNote.textContent = ""; return; }
    oE.textContent = fmt(r.cell_potential_v, 4) + " V";
    oS.textContent = fmt(r.nernst_slope_v * 1000, 2) + " mV/decade";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { e0.input.value = "1.10"; n.input.value = "2"; q.input.value = "0.01"; t.input.value = "25"; update(); });
  for (const f of [e0, n, q, t]) f.input.addEventListener("input", update);
}

function renderRcf(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: RCF (g) = 1.118e-5 * r(cm) * RPM^2. First principles.";
  inputRegion.appendChild(makeNotice(LAB_NOTICE));
  const tRcf = document.createElement("span"); tRcf.textContent = "RCF"; inputRegion.appendChild(tRcf); attachGlossaryTooltip(tRcf, "RCF");
  const tRpm = document.createElement("span"); tRpm.textContent = "RPM"; tRpm.style.marginLeft = "12px"; inputRegion.appendChild(tRpm); attachGlossaryTooltip(tRpm, "RPM");
  const rotor = makeSelect("Rotor preset", "rcf-rotor", [{ value: "", label: "(custom)" }].concat(Object.entries(CENTRIFUGE_ROTORS).map(([k, v]) => ({ value: k, label: v.manufacturer + " " + v.part + " (" + v.radius_mm + " mm)" }))));
  const r = makeNumber("Rotor radius (mm)", "rcf-r", { step: "any", min: "0" });
  const rpm = makeNumber("RPM (leave 0 to solve)", "rcf-rpm", { step: "any", min: "0" });
  const rcf = makeNumber("RCF (g, leave 0 to solve)", "rcf-rcf", { step: "any", min: "0" });
  for (const f of [rotor, r, rpm, rcf]) inputRegion.appendChild(f.wrap);
  const out = makeOutputLine(outputRegion, "Result", "rcf-out");
  rotor.select.addEventListener("change", () => {
    const v = CENTRIFUGE_ROTORS[rotor.select.value];
    if (v) r.input.value = v.radius_mm;
  });
  const update = debounce(() => {
    const res = computeRcf({ rotor_radius_mm: Number(r.input.value), rpm: Number(rpm.input.value) || 0, rcf: Number(rcf.input.value) || 0 });
    if (res.error) { out.textContent = res.error; return; }
    out.textContent = "RPM " + fmt(res.rpm, 0) + " | RCF " + fmt(res.rcf, 0) + " g (radius " + fmt(res.rotor_radius_mm, 1) + " mm)";
  }, DEBOUNCE_MS);
  for (const f of [r, rpm, rcf]) f.input.addEventListener("input", update);
  rotor.select.addEventListener("change", update);
  attachExampleButton(inputRegion, () => { rotor.select.value = ""; r.input.value = 85; rpm.input.value = 10000; rcf.input.value = 0; update(); });
}

function renderResuspend(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: volume = mass / target concentration. First principles.";
  inputRegion.appendChild(makeNotice(LAB_NOTICE));
  const m = makeNumber("Lyophilized mass (g)", "rs-m", { step: "any", min: "0" });
  const t = makeNumber("Target concentration (g/L)", "rs-t", { step: "any", min: "0" });
  for (const f of [m, t]) inputRegion.appendChild(f.wrap);
  const out = makeOutputLine(outputRegion, "Diluent volume", "rs-out");
  const update = debounce(() => {
    const r = computeResuspension({ mass_g: Number(m.input.value), target_concentration: Number(t.input.value) });
    if (r.error) { out.textContent = r.error; return; }
    out.textContent = fmt(r.volume, 6) + " L (" + fmt(r.volume * 1000, 3) + " mL)";
  }, DEBOUNCE_MS);
  for (const f of [m, t]) f.input.addEventListener("input", update);
  attachExampleButton(inputRegion, () => { m.input.value = 0.05; t.input.value = 10; update(); });
}

function renderPcrMix(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: master-mix arithmetic. component_total = per_reaction * n_reactions * (1 + fudge_factor_pct / 100).";
  inputRegion.appendChild(makeNotice(LAB_NOTICE));
  const n = makeNumber("Number of reactions", "pcr-n", { step: "1", min: "1" });
  n.input.value = "24";
  const ff = makeNumber("Fudge factor (%)", "pcr-ff", { step: "any", min: "0" });
  ff.input.value = "10";
  const ta = makeTextarea("Components (name,uL_per_reaction per line)", "pcr-c", { rows: "4" });
  ta.input.placeholder = "2x Master Mix,12.5";
  for (const fld of [n, ff, ta]) inputRegion.appendChild(fld.wrap);
  const tableWrap = document.createElement("div"); tableWrap.className = "tabular-tool"; outputRegion.appendChild(tableWrap);
  const totOut = makeOutputLine(outputRegion, "Total master mix volume (uL)", "pcr-out-t");
  const update = debounce(() => {
    const components = String(ta.input.value || "").split("\n").map((s) => s.split(",").map((x) => x.trim())).filter((p) => p.length === 2 && p[0]).map((p) => ({ name: p[0], per_reaction: Number(p[1]) }));
    const r = computePcrMix({ number_of_reactions: Number(n.input.value), fudge_factor_pct: Number(ff.input.value), components });
    while (tableWrap.firstChild) tableWrap.removeChild(tableWrap.firstChild);
    if (r.error) { totOut.textContent = r.error; return; }
    const t = document.createElement("table");
    const thead = document.createElement("thead");
    const trh = document.createElement("tr"); for (const h of ["Component", "Per reaction (uL)", "Total (uL)"]) { const th = document.createElement("th"); th.textContent = h; trh.appendChild(th); }
    thead.appendChild(trh); t.appendChild(thead);
    const tbody = document.createElement("tbody");
    for (const row of r.rows) {
      const tr = document.createElement("tr");
      for (const v of [row.name, fmt(row.per_reaction, 3), fmt(row.total, 3)]) { const td = document.createElement("td"); td.textContent = String(v); tr.appendChild(td); }
      tbody.appendChild(tr);
    }
    t.appendChild(tbody);
    tableWrap.appendChild(t);
    totOut.textContent = fmt(r.total_master_mix, 2);
    attachCsvExport({
      table: t, parent: tableWrap, toolId: "pcr-master-mix",
      inputProvider: () => n.input.value + "|" + ff.input.value + "|" + ta.input.value,
    });
  }, DEBOUNCE_MS);
  for (const fld of [n, ff, ta]) fld.input.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    n.input.value = 24; ff.input.value = 10;
    ta.input.value = "2x Master Mix,12.5\nForward primer (10 uM),1.0\nReverse primer (10 uM),1.0\nTemplate,2.0\nNuclease-free water,8.5";
    update();
  });
}

function renderBeerLambert(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Beer-Lambert law A = epsilon * c * L. First principles.";
  inputRegion.appendChild(makeNotice(LAB_NOTICE));
  const a = makeNumber("Absorbance (AU)", "bl-a", { step: "any", min: "0" });
  const l = makeNumber("Path length (cm)", "bl-l", { step: "any", min: "0" });
  l.input.value = "1";
  const e = makeNumber("Molar extinction coefficient (M^-1 cm^-1)", "bl-e", { step: "any", min: "0" });
  for (const f of [a, l, e]) inputRegion.appendChild(f.wrap);
  const out = makeOutputLine(outputRegion, "Concentration", "bl-out");
  const update = debounce(() => {
    const r = computeBeerLambert({ absorbance: Number(a.input.value), path_length_cm: Number(l.input.value), epsilon: Number(e.input.value) });
    if (r.error) { out.textContent = r.error; return; }
    out.textContent = r.concentration.toExponential(4) + " M";
  }, DEBOUNCE_MS);
  for (const f of [a, l, e]) f.input.addEventListener("input", update);
  attachExampleButton(inputRegion, () => { a.input.value = 0.5; l.input.value = 1; e.input.value = 50000; update(); });
}

function renderHendersonHasselbalch(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Henderson-Hasselbalch pH = pKa + log10([A-]/[HA]). First principles.";
  inputRegion.appendChild(makeNotice(LAB_NOTICE));
  const t = document.createElement("span"); t.textContent = "pKa"; inputRegion.appendChild(t); attachGlossaryTooltip(t, "pKa");
  const buf = makeSelect("Bundled buffer pKa (25 C)", "hh-buf", [{ value: "", label: "(custom)" }].concat(Object.entries(BUFFER_PKA).map(([k, v]) => ({ value: k, label: k + " (pKa " + v.pKa + ")" }))));
  const pKa = makeNumber("pKa", "hh-pka", { step: "any", min: "0" });
  const pH = makeNumber("Target pH", "hh-ph", { step: "any", min: "0" });
  const cT = makeNumber("Total buffer concentration (M)", "hh-c", { step: "any", min: "0" });
  const vT = makeNumber("Total volume (L)", "hh-v", { step: "any", min: "0" });
  for (const f of [buf, pKa, pH, cT, vT]) inputRegion.appendChild(f.wrap);
  buf.select.addEventListener("change", () => { const v = BUFFER_PKA[buf.select.value]; if (v) pKa.input.value = v.pKa; });
  const ratio = makeOutputLine(outputRegion, "[A-] / [HA] ratio", "hh-out-r");
  const baseOut = makeOutputLine(outputRegion, "Moles conjugate base", "hh-out-b");
  const acidOut = makeOutputLine(outputRegion, "Moles acid", "hh-out-a");
  const update = debounce(() => {
    const r = computeHendersonHasselbalch({
      pKa: Number(pKa.input.value), target_pH: Number(pH.input.value),
      total_buffer_concentration: Number(cT.input.value), total_volume: Number(vT.input.value),
    });
    if (r.error) { ratio.textContent = r.error; baseOut.textContent = acidOut.textContent = ""; return; }
    ratio.textContent = fmt(r.ratio_base_acid, 4);
    baseOut.textContent = fmt(r.moles_base, 6) + " mol";
    acidOut.textContent = fmt(r.moles_acid, 6) + " mol";
  }, DEBOUNCE_MS);
  for (const f of [pKa, pH, cT, vT]) f.input.addEventListener("input", update);
  buf.select.addEventListener("change", update);
  attachExampleButton(inputRegion, () => { buf.select.value = "phosphate"; pKa.input.value = 7.20; pH.input.value = 7.40; cT.input.value = 0.1; vT.input.value = 1.0; update(); });
}

function renderHemocytometer(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: standard Neubauer hemocytometer; each large square = 0.1 uL. cells/mL = (avg/sq) * 1e4 * dilution.";
  inputRegion.appendChild(makeNotice(LAB_NOTICE));
  const t = document.createElement("span"); t.textContent = "Hemocytometer"; inputRegion.appendChild(t); attachGlossaryTooltip(t, "hemocytometer");
  const cnt = makeNumber("Total cells counted", "hc-c", { step: "1", min: "0" });
  const sq = makeNumber("Squares counted", "hc-s", { step: "1", min: "1" });
  sq.input.value = "4";
  const df = makeNumber("Dilution factor", "hc-d", { step: "any", min: "0" });
  df.input.value = "1";
  const dead = makeNumber("Dead cells (optional, trypan blue)", "hc-dead", { step: "1", min: "0" });
  for (const f of [cnt, sq, df, dead]) inputRegion.appendChild(f.wrap);
  const out = makeOutputLine(outputRegion, "Cells per mL", "hc-out-cm");
  const via = makeOutputLine(outputRegion, "Viability", "hc-out-v");
  const update = debounce(() => {
    const r = computeHemocytometer({
      total_cells_counted: Number(cnt.input.value), squares_counted: Number(sq.input.value),
      dilution_factor: Number(df.input.value), dead_cells: dead.input.value === "" ? null : Number(dead.input.value),
    });
    if (r.error) { out.textContent = r.error; via.textContent = ""; return; }
    out.textContent = r.cells_per_mL.toExponential(3);
    via.textContent = r.viability_pct == null ? "-" : fmt(r.viability_pct, 1) + "%";
  }, DEBOUNCE_MS);
  for (const f of [cnt, sq, df, dead]) f.input.addEventListener("input", update);
  attachExampleButton(inputRegion, () => { cnt.input.value = 240; sq.input.value = 4; df.input.value = 2; dead.input.value = 12; update(); });
}

export const LAB_RENDERERS = {
  "molarity-dilution": renderDilution,
  "serial-dilution": renderSerialDilution,
  "molecular-weight": renderMolecularWeight,
  "mass-moles": renderMassMoles,
  "ideal-gas-law": renderIdealGasLaw,
  "van-der-waals": renderVanDerWaals,
  "arrhenius-equation": renderArrheniusEquation,
  "clausius-clapeyron": renderClausiusClapeyron,
  "osmolarity": renderOsmolarity,
  "nernst-equation": renderNernstEquation,
  "rcf-rpm": renderRcf,
  "resuspension-volume": renderResuspend,
  "pcr-master-mix": renderPcrMix,
  "beer-lambert": renderBeerLambert,
  "henderson-hasselbalch": renderHendersonHasselbalch,
  "hemocytometer": renderHemocytometer,
};

// =====================================================================
// v23 T.2: OD600 to cell density (cells/mL = OD600 * factor * dilution)
// =====================================================================
// The OD-to-cells conversion factor is strain- and instrument-specific and
// user-supplied (no universal constant). The linear range is typically
// OD < ~0.8; above it, dilute and re-read (flagged).
//
// dims: in { od600: dimensionless, factor_cells_per_od: dimensionless, dilution: dimensionless } out: { cells_per_ml: dimensionless }
export function computeOd600CellCount({ od600 = 0, factor_cells_per_od = 0, dilution = 1 } = {}) {
  const od = Number(od600) || 0;
  const factor = Number(factor_cells_per_od) || 0;
  const dil = Number(dilution) || 0;
  if (!(od > 0 && Number.isFinite(od))) return { error: "OD600 must be positive." };
  if (!(factor > 0 && Number.isFinite(factor))) return { error: "Conversion factor (cells/mL per OD) must be supplied and positive." };
  if (!(dil > 0 && Number.isFinite(dil))) return { error: "Dilution factor must be positive." };
  const cells_per_ml = od * factor * dil;
  const in_linear_range = od < 0.8;
  return { cells_per_ml, od600: od, in_linear_range, note: in_linear_range ? "Within the typical linear range (OD < ~0.8)." : "OD above ~0.8 linear range - dilute and re-read for accuracy." };
}

export const od600CellCountExample = { inputs: { od600: 0.5, factor_cells_per_od: 800000000, dilution: 1 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderOd600CellCount(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard microbiology spectrophotometry; cells/mL = OD600 x factor x dilution. The OD-to-cells factor is strain- and instrument-specific and user-supplied (no universal constant). Linear range typically OD < ~0.8. Lab SOP governs.";
  const od = makeNumber("OD600 reading", "odc-od", { step: "any", min: "0" });
  const factor = makeNumber("Conversion factor (cells/mL per OD)", "odc-factor", { step: "any", min: "0" });
  const dil = makeNumber("Dilution factor", "odc-dil", { step: "any", min: "0" });
  for (const f of [od, factor, dil]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { od.input.value = "0.5"; factor.input.value = "800000000"; dil.input.value = "1"; update(); });
  const oCells = makeOutputLine(outputRegion, "Cell density", "odc-out");
  const oNote = makeOutputLine(outputRegion, "Linear-range note", "odc-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeOd600CellCount({ od600: readNum(od.input), factor_cells_per_od: readNum(factor.input), dilution: readNum(dil.input) });
    if (r.error) { oCells.textContent = r.error; oNote.textContent = ""; return; }
    oCells.textContent = r.cells_per_ml.toExponential(2) + " cells/mL";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [od.input, factor.input, dil.input]) f.addEventListener("input", update);
}
LAB_RENDERERS["od600-cell-count"] = renderOd600CellCount;

// =====================================================================
// v23 shared simple-renderer (select + number fields). Non-exported.
// =====================================================================
function _v23SimpleRenderer(spec) {
  const _rlRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = f.kind === "select" ? makeSelect(f.label, f.id || f.key, f.options) : makeNumber(f.label, f.id || f.key, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) { if (f.kind === "select") field.select.value = f.default; else field.input.value = String(f.default); }
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        if (f.kind === "select") fields[f.key].select.value = v[f.key]; else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) params[f.key] = f.kind === "select" ? fields[f.key].select.value : (Number(fields[f.key].input.value) || 0);
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) (f.kind === "select" ? fields[f.key].select : fields[f.key].input).addEventListener("input", update);
  };

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind ?? "number", options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? (f.kind && f.kind !== "number" ? null : { step: "any" }) })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

// =====================================================================
// v23 T.1: Agarose gel percent (Sambrook & Russell resolution map)
// =====================================================================
// dims: in { target_bp_high: dimensionless, gel_percent: dimensionless, buffer_volume_ml: dimensionless } out: { recommended_percent: dimensionless, used_percent: dimensionless, grams_agarose: dimensionless, out_of_standard: dimensionless }
export function computeGelPercentAgarose({ target_bp_high = 0, gel_percent = 0, buffer_volume_ml = 0 } = {}) {
  const bp = Number(target_bp_high) || 0;
  let chosen = Number(gel_percent); if (!Number.isFinite(chosen) || chosen < 0) chosen = 0;
  const vol = Number(buffer_volume_ml) || 0;
  if (!(vol > 0 && Number.isFinite(vol))) return { error: "Buffer volume must be positive (mL)." };
  let recommended_percent = null;
  if (bp > 0 && Number.isFinite(bp)) {
    recommended_percent = bp >= 20000 ? 0.5 : bp >= 10000 ? 0.8 : bp >= 7000 ? 1.0 : bp >= 3000 ? 1.2 : bp >= 1000 ? 1.5 : 2.0;
  }
  let used_percent = chosen > 0 ? chosen : recommended_percent;
  if (used_percent === null) return { error: "Provide a target fragment size or a chosen gel percent." };
  used_percent = Math.min(3, Math.max(0.5, used_percent));
  const grams_agarose = (used_percent / 100) * vol;
  const out_of_standard = bp > 0 && (bp < 100 || bp > 50000);
  return { recommended_percent, used_percent, grams_agarose, out_of_standard };
}
export const gelPercentAgaroseExample = { inputs: { target_bp_high: 10000, gel_percent: 0, buffer_volume_ml: 100 } };
const renderGelPercentAgarose = _v23SimpleRenderer({
  citation: "Citation: Per Sambrook & Russell, Molecular Cloning, gel-electrophoresis resolution tables (agarose percent vs. fragment-size range). Complements the pcr-master-mix tile. Very small/large fragments fall outside standard agarose (PAGE / pulsed-field). Lab SOP governs.",
  example: gelPercentAgaroseExample.inputs,
  fields: [
    { key: "target_bp_high", label: "Largest fragment to resolve (bp)", kind: "number" },
    { key: "gel_percent", label: "Gel percent override (optional)", kind: "number" },
    { key: "buffer_volume_ml", label: "Buffer / gel volume (mL)", kind: "number" },
  ],
  outputs: [
    { key: "pct", id: "gpa-out-pct", label: "Gel percent", value: (r) => fmt(r.used_percent, 1) + "%" + (r.recommended_percent !== null ? " (recommended " + fmt(r.recommended_percent, 1) + "% for the range)" : "") + (r.out_of_standard ? " - outside standard agarose; consider PAGE / pulsed-field" : "") },
    { key: "g", id: "gpa-out-g", label: "Agarose to weigh", value: (r) => fmt(r.grams_agarose, 2) + " g" },
  ],
  compute: computeGelPercentAgarose,
});
LAB_RENDERERS["gel-percent-agarose"] = renderGelPercentAgarose;
