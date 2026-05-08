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
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeText,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";
import { attachCsvExport, attachGlossaryTooltip } from "./v5-platform.js";

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

export function computeDilution({ c1, v1, c2, v2 }) {
  const knowns = [c1, v1, c2, v2].filter((x) => Number.isFinite(x) && x > 0).length;
  if (knowns < 3) return { error: "Provide three of c1, v1, c2, v2 (positive values)." };
  let out = { c1, v1, c2, v2 };
  if (!(c1 > 0)) out.c1 = (c2 * v2) / v1;
  else if (!(v1 > 0)) out.v1 = (c2 * v2) / c1;
  else if (!(c2 > 0)) out.c2 = (c1 * v1) / v2;
  else if (!(v2 > 0)) out.v2 = (c1 * v1) / c2;
  const diluent_volume = out.v2 - out.v1;
  return { ...out, diluent_volume };
}

export const dilutionExample = { inputs: { c1: 1.0, v1: 0, c2: 0.1, v2: 0.010 }, expected: { v1: 0.001 } };

// --- 256: Serial Dilution Planner ---

export function computeSerialDilution({
  starting_concentration = 0, dilution_factor = 10, volume_per_tube = 0.001,
  number_of_steps = 1,
}) {
  if (!(starting_concentration > 0)) return { error: "Starting concentration must be positive." };
  if (!(dilution_factor > 1)) return { error: "Dilution factor must be > 1." };
  if (!(volume_per_tube > 0)) return { error: "Volume per tube must be positive." };
  if (!(number_of_steps >= 1)) return { error: "Need at least one step." };
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

export function computeMassMoles({ mass_g, moles, molecular_weight }) {
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

export function computeRcf({ rotor_radius_mm = 0, rpm, rcf }) {
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

export function computeResuspension({ mass_g = 0, target_concentration = 0 }) {
  if (!(mass_g > 0)) return { error: "Lyophilized mass must be positive." };
  if (!(target_concentration > 0)) return { error: "Target concentration must be positive." };
  // mass_g / target = volume in volume units consistent with target denominator.
  return { mass_g, target_concentration, volume: mass_g / target_concentration };
}

export const resuspendExample = { inputs: { mass_g: 0.001, target_concentration: 1.0 } };

// --- 261: PCR Master Mix ---

export function computePcrMix({
  number_of_reactions = 1, components = [], fudge_factor_pct = 10,
}) {
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

export function computeBeerLambert({ absorbance = 0, path_length_cm = 1, epsilon = 0 }) {
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

export function computeHendersonHasselbalch({
  pKa = 0, target_pH = 0, total_buffer_concentration = 0, total_volume = 0,
}) {
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

export function computeHemocytometer({
  total_cells_counted = 0, squares_counted = 4, dilution_factor = 1,
  dead_cells = null,
}) {
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
    dil.textContent = fmt(r.diluent_volume, 4) + " L";
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
  const ta = makeText("Components (name,uL_per_reaction per line)", "pcr-c");
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
