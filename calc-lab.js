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
// Source: IUPAC Standard Atomic Weights 2021 (4-significant-figure rounded
// where the published value carries an interval, e.g., H, B, C, N, O, S).
// Public reference; cite IUPAC by year. data/lab/iupac-atomic-weights.json
export const IUPAC_ATOMIC_WEIGHTS = {
  H: 1.008,   He: 4.0026, Li: 6.94,    Be: 9.0122, B: 10.81,
  C: 12.011,  N: 14.007,  O: 15.999,   F: 18.998,  Ne: 20.180,
  Na: 22.990, Mg: 24.305, Al: 26.982,  Si: 28.085, P: 30.974,
  S: 32.06,   Cl: 35.45,  Ar: 39.948,  K: 39.098,  Ca: 40.078,
  Sc: 44.956, Ti: 47.867, V: 50.942,   Cr: 51.996, Mn: 54.938,
  Fe: 55.845, Co: 58.933, Ni: 58.693,  Cu: 63.546, Zn: 65.38,
  Ga: 69.723, Ge: 72.630, As: 74.922,  Se: 78.971, Br: 79.904,
  Kr: 83.798, Rb: 85.468, Sr: 87.62,   Y: 88.906,  Zr: 91.224,
  Nb: 92.906, Mo: 95.95,  Tc: 98.0,    Ru: 101.07, Rh: 102.91,
  Pd: 106.42, Ag: 107.87, Cd: 112.41,  In: 114.82, Sn: 118.71,
  Sb: 121.76, Te: 127.60, I: 126.90,   Xe: 131.29, Cs: 132.91,
  Ba: 137.33, La: 138.91, Ce: 140.12,  Pt: 195.08, Au: 196.97,
  Hg: 200.59, Pb: 207.2,  Bi: 208.98,  U: 238.03,
  // Common biology / pharmacology subset; expand as needed.
};

// --- Common laboratory buffer pKa values (25 C unless noted) ---
// data/lab/buffer-pka.json
export const BUFFER_PKA = {
  Tris:        { pKa: 8.06, useful_range: "7.0-9.0", citation: "CRC Handbook of Chemistry and Physics, 95th ed." },
  HEPES:       { pKa: 7.55, useful_range: "6.8-8.2", citation: "Good et al., Biochemistry 5(2): 467 (1966)" },
  MES:         { pKa: 6.10, useful_range: "5.5-6.7", citation: "Good et al., Biochemistry 5(2): 467 (1966)" },
  MOPS:        { pKa: 7.20, useful_range: "6.5-7.9", citation: "Good et al., Biochemistry 5(2): 467 (1966)" },
  PIPES:       { pKa: 6.76, useful_range: "6.1-7.5", citation: "Good et al., Biochemistry 5(2): 467 (1966)" },
  phosphate:   { pKa: 7.20, useful_range: "5.8-8.0", citation: "CRC Handbook (H2PO4- / HPO4^2-)" },
  acetate:     { pKa: 4.76, useful_range: "3.6-5.6", citation: "CRC Handbook (acetic acid / acetate)" },
  bicarbonate: { pKa: 6.35, useful_range: "5.5-7.5", citation: "CRC Handbook (H2CO3 / HCO3-)" },
};

// --- Representative centrifuge rotor radii (mm) ---
// Per-manufacturer attribution. data/lab/centrifuge-rotors.json
export const CENTRIFUGE_ROTORS = {
  eppendorf_5424_FA453011:    { radius_mm: 84,  manufacturer: "Eppendorf", part: "FA-45-30-11 (5424)" },
  eppendorf_5810_FA45630:     { radius_mm: 95,  manufacturer: "Eppendorf", part: "FA-45-6-30 (5810/5810R)" },
  eppendorf_5810_A48140:      { radius_mm: 162, manufacturer: "Eppendorf", part: "A-4-81 swing-bucket (5810/5810R)" },
  beckman_JA10:               { radius_mm: 158, manufacturer: "Beckman Coulter", part: "JA-10 fixed-angle" },
  beckman_JA20:               { radius_mm: 108, manufacturer: "Beckman Coulter", part: "JA-20 fixed-angle" },
  thermo_F15_8x50c:           { radius_mm: 137, manufacturer: "Thermo Fisher", part: "Fiberlite F15-8x50c" },
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

export const dilutionExample = { inputs: { c1: 1.0, v1: 0, c2: 0.1, v2: 0.010 }, expected: { v1: 0.001 } };

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

export const massMolesExample = { inputs: { mass_g: 5, molecular_weight: 58.44 } };

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

export const rcfExample = { inputs: { rotor_radius_mm: 84, rpm: 14000 } };

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
  attachExampleButton(inputRegion, () => { c1.input.value = 1.0; v1.input.value = 0; c2.input.value = 0.1; v2.input.value = 0.010; update(); });
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
  citationEl.textContent = "Citation: IUPAC Standard Atomic Weights 2021. Bundled.";
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
  attachExampleButton(inputRegion, () => { f.input.value = "(NH4)2SO4"; update(); });
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
  attachExampleButton(inputRegion, () => { mass.input.value = 5; moles.input.value = 0; mw.input.value = 58.44; update(); });
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
  attachExampleButton(inputRegion, () => { rotor.select.value = "eppendorf_5424_FA453011"; r.input.value = 84; rpm.input.value = 14000; rcf.input.value = 0; update(); });
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
  attachExampleButton(inputRegion, () => { m.input.value = 0.001; t.input.value = 1.0; update(); });
}

function renderPcrMix(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: master-mix arithmetic. component_total = per_reaction * n_reactions * (1 + fudge_factor).";
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
  const buf = makeSelect("Bundled buffer pKa", "hh-buf", [{ value: "", label: "(custom)" }].concat(Object.entries(BUFFER_PKA).map(([k, v]) => ({ value: k, label: k + " (pKa " + v.pKa + ")" }))));
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
      dilution_factor: Number(df.input.value), dead_cells: Number(dead.input.value) || null,
    });
    if (r.error) { out.textContent = r.error; via.textContent = ""; return; }
    out.textContent = r.cells_per_mL.toExponential(3);
    via.textContent = r.viability_pct == null ? "-" : fmt(r.viability_pct, 1) + "%";
  }, DEBOUNCE_MS);
  for (const f of [cnt, sq, df, dead]) f.input.addEventListener("input", update);
  attachExampleButton(inputRegion, () => { cnt.input.value = 200; sq.input.value = 4; df.input.value = 2; dead.input.value = 10; update(); });
}

export const LAB_RENDERERS = {
  "molarity-dilution": renderDilution,
  "serial-dilution": renderSerialDilution,
  "molecular-weight": renderMolecularWeight,
  "mass-moles": renderMassMoles,
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
  const od = makeNumber("OD600 reading", "odc-od", { step: "any", min: "0", value: "0.5" });
  od.input.value = "0.5";
  const factor = makeNumber("Conversion factor (cells/mL per OD)", "odc-factor", { step: "any", min: "0", value: "800000000" });
  factor.input.value = "800000000";
  const dil = makeNumber("Dilution factor", "odc-dil", { step: "any", min: "0", value: "1" });
  dil.input.value = "1";
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
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = f.kind === "select" ? makeSelect(f.label, f.id, f.options) : makeNumber(f.label, f.id, f.attrs || { step: "any" });
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

// ===========================================================================
// spec-v20 Phase T - two new lab tiles (v18/v21 tile contract).
// ===========================================================================

// --- v20 T.1: Primer melting temperature (`primer-tm`) ---
// Wallace (<=14 nt): Tm = 2(A+T) + 4(G+C). Basic GC% (>14 nt): Tm = 64.9 + 41*(G+C-16.4)/len.
// dims: in { sequence: dimensionless, method: dimensionless } out: { tm_c: T, length_nt: dimensionless }
export function computePrimerTm({ sequence = "", method = "auto" } = {}) {
  const seq = String(sequence || "").toUpperCase().replace(/\s+/g, "");
  const cleaned = seq.replace(/[^ATGC]/g, "");
  const dropped = seq.length - cleaned.length;
  const len = cleaned.length;
  if (len === 0) return { error: "Enter a primer sequence (A/T/G/C)." };
  let A = 0, T = 0, G = 0, C = 0;
  for (const b of cleaned) { if (b === "A") A++; else if (b === "T") T++; else if (b === "G") G++; else if (b === "C") C++; }
  const gc = G + C;
  const at = A + T;
  let useMethod = method;
  if (method === "auto") useMethod = len <= 14 ? "wallace" : "gc";
  let tm;
  if (useMethod === "wallace") tm = 2 * at + 4 * gc;
  else tm = 64.9 + 41 * (gc - 16.4) / len;
  const gcContent = gc / len * 100;
  return {
    tm_c: Number.isFinite(tm) ? tm : null,
    length_nt: len,
    gc_content_pct: Number.isFinite(gcContent) ? gcContent : null,
    method_used: useMethod,
    dropped_chars: dropped,
    note: "The Wallace rule is valid only for short primers (<=14 nt) at ~1 M NaCl. Nearest-neighbor (SantaLucia) thermodynamics is the modern gold standard - these are quick estimates. Non-ACGT characters are flagged and dropped.",
  };
}
export const primerTmExample = { inputs: { sequence: "GCGGATCCATG", method: "auto" } };

function renderPrimerTm(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per Wallace R.B. et al., Nucleic Acids Research 6 (1979), for the short-oligo rule and Marmur & Doty, J Mol Biol 5 (1962) / standard molecular-biology references for the GC% formula, by name. Complements the pcr-master-mix tile. Nearest-neighbor (SantaLucia) thermodynamics is the modern gold standard. Free abstracts at pubmed.ncbi.nlm.nih.gov.";
  const seq = makeText("Primer sequence (5' -> 3')", "ptm-seq", { value: "GCGGATCCATG" }); seq.input.value = "GCGGATCCATG";
  const method = makeSelect("Method", "ptm-method", [
    { value: "auto", label: "Auto (Wallace <=14 nt, else GC%)", selected: true },
    { value: "wallace", label: "Wallace 2(A+T)+4(G+C)" },
    { value: "gc", label: "Basic GC%" },
  ]);
  for (const f of [seq, method]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { seq.input.value = "GCGGATCCATG"; method.select.value = "auto"; update(); });
  const oTm = makeOutputLine(outputRegion, "Tm", "ptm-out-tm");
  const oLen = makeOutputLine(outputRegion, "Length / GC content", "ptm-out-len");
  const oNote = makeOutputLine(outputRegion, "Note", "ptm-out-note");
  const update = debounce(() => {
    const r = computePrimerTm({ sequence: seq.input.value, method: method.select.value });
    if (r.error) { oTm.textContent = r.error; oLen.textContent = ""; oNote.textContent = ""; return; }
    oTm.textContent = fmt(r.tm_c, 1) + " C (" + r.method_used + ")";
    oLen.textContent = r.length_nt + " nt, " + fmt(r.gc_content_pct, 0) + "% GC";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [seq.input, method.select]) f.addEventListener("input", update);
}
LAB_RENDERERS["primer-tm"] = renderPrimerTm;

// --- v20 T.2: CFU/mL viable plate count (`cfu-plate-count`) ---
// CFU/mL = colonies / (dilution_factor * volume_plated). Dilution accepted as
// 1e-5 (factor) or 100000 (x) - both normalized to the same result.
// dims: in { colonies: dimensionless, dilution_factor: dimensionless, volume_ml: L^3 } out: { cfu_per_ml: dimensionless }
export function computeCfuPlateCount({ colonies = 0, dilution_factor = 0, volume_ml = 0, low = 25, high = 250 } = {}) {
  const col = Number(colonies) || 0;
  let df = Number(dilution_factor) || 0;
  const vol = Number(volume_ml) || 0;
  if (col < 0 || !Number.isFinite(col)) return { error: "Colony count must be non-negative." };
  if (!(df > 0 && Number.isFinite(df))) return { error: "Dilution factor must be positive." };
  if (!(vol > 0 && Number.isFinite(vol))) return { error: "Volume plated must be positive (mL)." };
  // Normalize: if df >= 1 it is the "times" form (e.g. 100000); multiply.
  // If df < 1 it is the fraction form (e.g. 1e-5); divide.
  const cfuPerMl = df >= 1 ? col * df / vol : col / (df * vol);
  const inRange = col >= low && col <= high;
  return {
    cfu_per_ml: Number.isFinite(cfuPerMl) ? cfuPerMl : null,
    in_countable_range: inRange,
    note: (col > high ? "Count above the countable range (TNTC) - statistically unreliable. " : col < low && col > 0 ? "Count below the countable range (TFTC) - statistically unreliable. " : "")
      + "Countable range 25-250 (FDA BAM) or 30-300 (APHA). Spread/pour/spiral change the effective plated volume.",
  };
}
export const cfuPlateCountExample = { inputs: { colonies: 150, dilution_factor: 1e-5, volume_ml: 0.1 } };

function renderCfuPlateCount(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the FDA Bacteriological Analytical Manual (BAM) Chapter 3 (Aerobic Plate Count) and APHA Standard Methods, by name; both public/free. Countable range 25-250 (FDA BAM) or 30-300 (APHA). Free at fda.gov/food/science-research-food/laboratory-methods-food.";
  const col = makeNumber("Colonies counted", "cfu-col", { step: "any", min: "0", value: "150" }); col.input.value = "150";
  const df = makeNumber("Dilution factor (e.g. 1e-5 or 100000)", "cfu-df", { step: "any", min: "0", value: "0.00001" }); df.input.value = "0.00001";
  const vol = makeNumber("Volume plated (mL)", "cfu-vol", { step: "any", min: "0", value: "0.1" }); vol.input.value = "0.1";
  for (const f of [col, df, vol]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { col.input.value = "150"; df.input.value = "0.00001"; vol.input.value = "0.1"; update(); });
  const oCfu = makeOutputLine(outputRegion, "CFU/mL", "cfu-out-cfu");
  const oRange = makeOutputLine(outputRegion, "Countable range", "cfu-out-range");
  const oNote = makeOutputLine(outputRegion, "Note", "cfu-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeCfuPlateCount({ colonies: readNum(col.input), dilution_factor: readNum(df.input), volume_ml: readNum(vol.input) });
    if (r.error) { oCfu.textContent = r.error; oRange.textContent = ""; oNote.textContent = ""; return; }
    oCfu.textContent = r.cfu_per_ml.toExponential(2) + " CFU/mL";
    oRange.textContent = r.in_countable_range ? "Within countable range" : "Outside countable range";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [col.input, df.input, vol.input]) f.addEventListener("input", update);
}
LAB_RENDERERS["cfu-plate-count"] = renderCfuPlateCount;

// --- spec-v531 T: Molarity from a concentrated reagent (`molarity-from-stock`) ---
// M = 10 * %(w/w) * density / MW. volume_to_draw = target_M * final_volume / stock_M.
// dims: in { purity_pct: dimensionless, density_g_ml: dimensionless, mol_weight: dimensionless, target_m: dimensionless, final_volume_ml: dimensionless } out: { stock_m: dimensionless, volume_to_draw_ml: dimensionless }
export function computeMolarityFromStock({ purity_pct = 0, density_g_ml = 0, mol_weight = 0, target_m = 0, final_volume_ml = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const purity = Number(purity_pct) || 0;
  const density = Number(density_g_ml) || 0;
  const mw = Number(mol_weight) || 0;
  const target = Number(target_m) || 0;
  const finalVol = Number(final_volume_ml) || 0;
  if (!(purity > 0)) return { error: "Assay / purity percent must be positive." };
  if (purity > 100) return { error: "Purity percent cannot exceed 100." };
  if (!(density > 0)) return { error: "Density must be positive (g/mL)." };
  if (!(mw > 0)) return { error: "Molecular weight must be positive (g/mol)." };
  const stock_m = 10 * purity * density / mw;
  let volume_to_draw_ml = null;
  if (target > 0 || finalVol > 0) {
    if (!(target > 0)) return { error: "Target molarity must be positive when preparing a dilution." };
    if (!(finalVol > 0)) return { error: "Final volume must be positive (mL) when preparing a dilution." };
    if (target > stock_m) return { error: "Target molarity exceeds the stock molarity - you cannot concentrate by dilution." };
    volume_to_draw_ml = target * finalVol / stock_m;
  }
  return {
    stock_m,
    volume_to_draw_ml,
    note: "A concentrated liquid reagent is labeled by weight percent and density, not molarity, so both must be combined with the molecular weight (ignoring either is a 20-40% error); the 10 factor converts g per 100 mL to per liter. Always add concentrated acid to water, never the reverse. The reagent lot assay and lab safety procedures govern.",
  };
}
export const molarityFromStockExample = { inputs: { purity_pct: 37, density_g_ml: 1.19, mol_weight: 36.46, target_m: 1.0, final_volume_ml: 1000 } };

function renderMolarityFromStock(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard reagent preparation - stock molarity from assay and density, stock_M = 10 x purity_pct x density / MW; volume_to_draw = target_M x final_volume / stock_M. A concentrated liquid reagent is labeled by weight percent and density, not molarity, so both must be combined with the molecular weight (ignoring either is a 20-40% error). Always add concentrated acid to water, never the reverse. The reagent lot certificate of analysis and lab safety procedures govern.";
  const purity = makeNumber("Assay / purity (% w/w)", "mfs-purity", { step: "any", min: "0", value: "37" }); purity.input.value = "37";
  const density = makeNumber("Density (g/mL)", "mfs-density", { step: "any", min: "0", value: "1.19" }); density.input.value = "1.19";
  const mw = makeNumber("Molecular weight (g/mol)", "mfs-mw", { step: "any", min: "0", value: "36.46" }); mw.input.value = "36.46";
  const target = makeNumber("Target molarity (mol/L, optional)", "mfs-target", { step: "any", min: "0", value: "1" }); target.input.value = "1";
  const finalVol = makeNumber("Final volume to prepare (mL, optional)", "mfs-vol", { step: "any", min: "0", value: "1000" }); finalVol.input.value = "1000";
  for (const f of [purity, density, mw, target, finalVol]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { purity.input.value = "37"; density.input.value = "1.19"; mw.input.value = "36.46"; target.input.value = "1"; finalVol.input.value = "1000"; update(); });
  const oStock = makeOutputLine(outputRegion, "Stock molarity", "mfs-out-stock");
  const oDraw = makeOutputLine(outputRegion, "Volume of concentrate to draw", "mfs-out-draw");
  const oNote = makeOutputLine(outputRegion, "Note", "mfs-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeMolarityFromStock({ purity_pct: readNum(purity.input), density_g_ml: readNum(density.input), mol_weight: readNum(mw.input), target_m: readNum(target.input), final_volume_ml: readNum(finalVol.input) });
    if (r.error) { oStock.textContent = r.error; oDraw.textContent = ""; oNote.textContent = ""; return; }
    oStock.textContent = fmt(r.stock_m, 2) + " mol/L";
    oDraw.textContent = r.volume_to_draw_ml !== null ? fmt(r.volume_to_draw_ml, 1) + " mL (into water)" : "- (enter a target molarity and final volume)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [purity.input, density.input, mw.input, target.input, finalVol.input]) f.addEventListener("input", update);
}
LAB_RENDERERS["molarity-from-stock"] = renderMolarityFromStock;

// --- spec-v533 T: Nucleic-acid concentration from A260 (`nucleic-acid-a260`) ---
// concentration = A260 x factor x dilution (factor 50 dsDNA, 33 ssDNA/oligo, 40 RNA). purity = A260/A280.
const NUCLEIC_ACID_FACTORS = { dsDNA: 50, ssDNA: 33, oligo: 33, RNA: 40 };
// dims: in { a260: dimensionless, na_type: dimensionless, dilution_factor: dimensionless, a280: dimensionless } out: { concentration_ng_ul: dimensionless, purity_260_280: dimensionless }
export function computeNucleicAcidA260({ a260 = 0, na_type = "dsDNA", dilution_factor = 1, a280 = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const a = Number(a260) || 0;
  const dil = Number(dilution_factor) || 0;
  const a2 = Number(a280) || 0;
  if (a < 0) return { error: "A260 must be non-negative." };
  const factor = NUCLEIC_ACID_FACTORS[na_type];
  if (!factor) return { error: "Nucleic-acid type must be dsDNA, ssDNA, oligo, or RNA." };
  if (!(dil > 0)) return { error: "Dilution factor must be positive." };
  const concentration_ng_ul = a * factor * dil;
  let purity_260_280 = null;
  if (a2 !== 0) {
    if (!(a2 > 0)) return { error: "A280 must be positive when a purity ratio is requested." };
    purity_260_280 = a / a2;
  }
  const threshold = na_type === "RNA" ? 2.0 : 1.8;
  const clean = purity_260_280 === null ? null : purity_260_280 >= threshold;
  return {
    concentration_ng_ul,
    purity_260_280,
    factor,
    clean,
    note: "The factor is an empirical mass coefficient, not a molar one, and it differs by strandedness (ssDNA absorbs more per mass, so it reads a lower concentration at the same A260). A 260/280 below about 1.8 (DNA) or 2.0 (RNA) flags protein or phenol carryover that makes the concentration unreliable. The read assumes a clean 1 cm path and a blanked instrument. The sample and instrument govern.",
  };
}
export const nucleicAcidA260Example = { inputs: { a260: 0.6, na_type: "dsDNA", dilution_factor: 50, a280: 0.324 } };

function renderNucleicAcidA260(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard spectrophotometric nucleic-acid quantitation (Beer-Lambert at 260 nm); concentration = A260 x factor x dilution, factor 50 (dsDNA) / 33 (ssDNA, oligo) / 40 (RNA) ug/mL per A260; purity = A260 / A280. The factor is an empirical mass coefficient, not molar, and differs by strandedness. A 260/280 below ~1.8 (DNA) or ~2.0 (RNA) flags protein/phenol carryover. Assumes a clean 1 cm path and a blanked instrument. The sample and instrument govern.";
  const a260 = makeNumber("A260 (absorbance at 260 nm)", "na260-a260", { step: "any", min: "0", value: "0.6" }); a260.input.value = "0.6";
  const type = makeSelect("Nucleic-acid type", "na260-type", [
    { value: "dsDNA", label: "Double-stranded DNA (factor 50)" },
    { value: "ssDNA", label: "Single-stranded DNA (factor 33)" },
    { value: "oligo", label: "Oligo (factor 33)" },
    { value: "RNA", label: "RNA (factor 40)" },
  ]);
  const dil = makeNumber("Dilution factor", "na260-dil", { step: "any", min: "0", value: "50" }); dil.input.value = "50";
  const a280 = makeNumber("A280 (optional, for 260/280 purity)", "na260-a280", { step: "any", min: "0", value: "0.324" }); a280.input.value = "0.324";
  for (const f of [a260, type, dil, a280]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a260.input.value = "0.6"; type.select.value = "dsDNA"; dil.input.value = "50"; a280.input.value = "0.324"; update(); });
  const oConc = makeOutputLine(outputRegion, "Concentration", "na260-out-conc");
  const oPurity = makeOutputLine(outputRegion, "260/280 purity", "na260-out-purity");
  const oNote = makeOutputLine(outputRegion, "Note", "na260-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeNucleicAcidA260({ a260: readNum(a260.input), na_type: type.select.value, dilution_factor: readNum(dil.input), a280: readNum(a280.input) });
    if (r.error) { oConc.textContent = r.error; oPurity.textContent = ""; oNote.textContent = ""; return; }
    oConc.textContent = fmt(r.concentration_ng_ul, 1) + " ng/uL (factor " + r.factor + ")";
    oPurity.textContent = r.purity_260_280 !== null ? fmt(r.purity_260_280, 2) + (r.clean ? " - clean" : " - below threshold, protein/phenol carryover") : "- (enter A280)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [a260.input, type.select, dil.input, a280.input]) f.addEventListener("input", update);
}
LAB_RENDERERS["nucleic-acid-a260"] = renderNucleicAcidA260;

// --- spec-v534 T: Ligation insert:vector molar ratio (`ligation-molar-ratio`) ---
// insert_ng = ratio x (insert_len/vector_len) x vector_ng. pmol = ng / (len x 650) x 1e6.
// dims: in { vector_ng: dimensionless, vector_length_bp: dimensionless, insert_length_bp: dimensionless, molar_ratio: dimensionless } out: { insert_ng: dimensionless, vector_pmol: dimensionless, insert_pmol: dimensionless }
export function computeLigationMolarRatio({ vector_ng = 0, vector_length_bp = 0, insert_length_bp = 0, molar_ratio = 3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const vng = Number(vector_ng) || 0;
  const vlen = Number(vector_length_bp) || 0;
  const ilen = Number(insert_length_bp) || 0;
  const ratio = Number(molar_ratio) || 0;
  if (!(vng > 0)) return { error: "Vector mass must be positive (ng)." };
  if (!(vlen > 0)) return { error: "Vector length must be positive (bp)." };
  if (!(ilen > 0)) return { error: "Insert length must be positive (bp)." };
  if (!(ratio > 0)) return { error: "Molar ratio must be positive." };
  const insert_ng = ratio * (ilen / vlen) * vng;
  // ng / (bp * 650 g/mol) gives mol; x 1e3 converts to pmol (the spec's 1e6 yields femtomoles).
  const vector_pmol = vng / (vlen * 650) * 1e3;
  const insert_pmol = ratio * vector_pmol;
  return {
    insert_ng,
    vector_pmol,
    insert_pmol,
    note: "The ratio is molar, not mass, so a short insert needs proportionally less mass than the vector (equal masses over-represent small fragments and cut efficiency). 650 g/mol per base pair is the double-stranded DNA average (single-stranded and RNA differ). The standard 3:1 insert:vector is a starting point optimized empirically. The enzyme protocol and fragment ends govern.",
  };
}
export const ligationMolarRatioExample = { inputs: { vector_ng: 50, vector_length_bp: 5000, insert_length_bp: 1000, molar_ratio: 3 } };

function renderLigationMolarRatio(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard molecular cloning - ligation insert:vector molar-ratio setup; insert_ng = ratio x (insert_length / vector_length) x vector_ng; vector_pmol = vector_ng / (vector_length x 650) x 1e3; insert_pmol = ratio x vector_pmol. The ratio is molar, not mass; 650 g/mol per bp is the dsDNA average (ssDNA and RNA differ); 3:1 is a starting point optimized empirically. The enzyme protocol and fragment ends govern.";
  const vng = makeNumber("Vector mass (ng)", "lmr-vng", { step: "any", min: "0", value: "50" }); vng.input.value = "50";
  const vlen = makeNumber("Vector length (bp)", "lmr-vlen", { step: "any", min: "0", value: "5000" }); vlen.input.value = "5000";
  const ilen = makeNumber("Insert length (bp)", "lmr-ilen", { step: "any", min: "0", value: "1000" }); ilen.input.value = "1000";
  const ratio = makeNumber("Insert:vector molar ratio", "lmr-ratio", { step: "any", min: "0", value: "3" }); ratio.input.value = "3";
  for (const f of [vng, vlen, ilen, ratio]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { vng.input.value = "50"; vlen.input.value = "5000"; ilen.input.value = "1000"; ratio.input.value = "3"; update(); });
  const oInsert = makeOutputLine(outputRegion, "Insert mass to add", "lmr-out-insert");
  const oPmol = makeOutputLine(outputRegion, "Amounts (pmol)", "lmr-out-pmol");
  const oNote = makeOutputLine(outputRegion, "Note", "lmr-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeLigationMolarRatio({ vector_ng: readNum(vng.input), vector_length_bp: readNum(vlen.input), insert_length_bp: readNum(ilen.input), molar_ratio: readNum(ratio.input) });
    if (r.error) { oInsert.textContent = r.error; oPmol.textContent = ""; oNote.textContent = ""; return; }
    oInsert.textContent = fmt(r.insert_ng, 1) + " ng of insert";
    oPmol.textContent = "vector " + fmt(r.vector_pmol, 4) + " pmol, insert " + fmt(r.insert_pmol, 4) + " pmol";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [vng.input, vlen.input, ilen.input, ratio.input]) f.addEventListener("input", update);
}
LAB_RENDERERS["ligation-molar-ratio"] = renderLigationMolarRatio;

// --- spec-v535 T: Cell-culture doubling time (`doubling-time`) ---
// Td = t x ln(2) / ln(N/N0). mu = ln(N/N0)/t. doublings = log2(N/N0).
// dims: in { initial_count: dimensionless, final_count: dimensionless, elapsed_time: dimensionless } out: { doubling_time: dimensionless, growth_rate: dimensionless, doublings: dimensionless }
export function computeDoublingTime({ initial_count = 0, final_count = 0, elapsed_time = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const n0 = Number(initial_count) || 0;
  const n = Number(final_count) || 0;
  const t = Number(elapsed_time) || 0;
  if (!(n0 > 0)) return { error: "Initial count (or OD) must be positive." };
  if (!(n > 0)) return { error: "Final count (or OD) must be positive." };
  if (!(n > n0)) return { error: "Final count must exceed the initial count (no growth to measure)." };
  if (!(t > 0)) return { error: "Elapsed time must be positive." };
  const ratio = n / n0;
  const doubling_time = t * Math.LN2 / Math.log(ratio);
  const growth_rate = Math.log(ratio) / t;
  const doublings = Math.log2(ratio);
  return {
    doubling_time,
    growth_rate,
    doublings,
    note: "Doubling time is constant only during log (exponential) phase - a measurement spanning lag or stationary phase is meaningless. If N is an optical density, the ratio assumes OD stays proportional to cell count (which fails at high density). The culture, medium, and conditions govern.",
  };
}
export const doublingTimeExample = { inputs: { initial_count: 1e5, final_count: 8e5, elapsed_time: 24 } };

function renderDoublingTime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Standard exponential-growth / population-doubling kinetics; Td = elapsed x ln(2) / ln(N / N0); mu = ln(N / N0) / elapsed; doublings = log2(N / N0). Doubling time is constant only during log (exponential) phase; a measurement spanning lag or stationary phase is meaningless. If N is an optical density, the ratio assumes OD stays proportional to cell count (fails at high density). The culture, medium, and conditions govern.";
  const n0 = makeNumber("Initial count or OD (N0)", "dt-n0", { step: "any", min: "0", value: "100000" }); n0.input.value = "100000";
  const n = makeNumber("Final count or OD (N)", "dt-n", { step: "any", min: "0", value: "800000" }); n.input.value = "800000";
  const t = makeNumber("Elapsed time (h)", "dt-t", { step: "any", min: "0", value: "24" }); t.input.value = "24";
  for (const f of [n0, n, t]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { n0.input.value = "100000"; n.input.value = "800000"; t.input.value = "24"; update(); });
  const oTd = makeOutputLine(outputRegion, "Doubling time", "dt-out-td");
  const oMu = makeOutputLine(outputRegion, "Specific growth rate / doublings", "dt-out-mu");
  const oNote = makeOutputLine(outputRegion, "Note", "dt-out-note");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeDoublingTime({ initial_count: readNum(n0.input), final_count: readNum(n.input), elapsed_time: readNum(t.input) });
    if (r.error) { oTd.textContent = r.error; oMu.textContent = ""; oNote.textContent = ""; return; }
    oTd.textContent = fmt(r.doubling_time, 2) + " h";
    oMu.textContent = fmt(r.growth_rate, 3) + " /h, " + fmt(r.doublings, 2) + " doublings";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [n0.input, n.input, t.input]) f.addEventListener("input", update);
}
LAB_RENDERERS["doubling-time"] = renderDoublingTime;
