// Group L: Agriculture and Forestry (utilities 203-209).
// See spec-v4.md section 2.3.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeText, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

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


// --- 203: Chemical Application Rate (GPA) ---
//
// GPA = (5940 * GPM) / (speed_mph * spacing_in)

// dims: in { gpm: L^3 T^-1, spacing_in: L, speed_mph: L T^-1, target_gpa: L }
//        out: { gpa: L, required_gpm: L^3 T^-1 }
// (GPA = volume / area; gal/acre collapses to a length `L` per the
//  §7.1 dimensional convention (volume `L^3` over area `L^2`).
//  Flow rate gpm is volume-per-time `L^3 T^-1`; nozzle spacing and
//  ground speed are length `L` and length-per-time `L T^-1`. The
//  5940 constant absorbs the in -> ft, gpm <-> gal/acre, and
//  mph -> ft/min unit conversions baked into the published formula.)
export function computeGPA({ gpm = 0, spacing_in = 0, speed_mph = 0, target_gpa = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(gpm >= 0)) return { error: "GPM must be non-negative." };
  if (!(spacing_in > 0)) return { error: "Nozzle spacing must be positive." };
  if (!(speed_mph > 0)) return { error: "Speed must be positive." };
  const gpa = (5940 * gpm) / (speed_mph * spacing_in);
  let required_gpm = null;
  if (target_gpa > 0) required_gpm = (target_gpa * speed_mph * spacing_in) / 5940;
  return { gpa, required_gpm };
}

export const gpaExample = { inputs: { gpm: 0.4, spacing_in: 20, speed_mph: 5, target_gpa: 25 } };

// --- 204: Timber Cruise (Doyle, Scribner, International 1/4) ---
//
// Doyle:        BF = ((D-4)^2) * (L/16)
// Int'l 1/4:    BF = (0.22 D^2 - 0.71 D)  (board feet per 16 ft log)
// Scribner:     bundled public-domain table per small-end DIB.

export const SCRIBNER_TABLE_16FT = {
  // small-end DIB (in) -> board feet for a 16 ft log
  6: 18, 7: 21, 8: 32, 9: 41, 10: 54, 11: 64, 12: 79, 13: 95, 14: 114, 15: 124,
  16: 144, 17: 161, 18: 187, 19: 207, 20: 235, 22: 290, 24: 350, 26: 423, 28: 493, 30: 568,
};

// dims: in { small_end_dib_in: L, log_length_ft: L, rule: dimensionless, price_per_bf: dimensionless }
//        out: { board_feet: L^3, rule: dimensionless, note: dimensionless, value_usd: dimensionless }
// (Diameter and length are lengths `L`; board-feet is a volume
//  `L^3` (one BF = 144 in^3). Doyle / International / Scribner
//  rules embed empirical taper and waste constants; the rule
//  selector is a categorical token (dimensionless). Monetary
//  price-per-BF and stand value follow the §7.1 dimensionless-
//  money convention.)
export function computeTimberCruise({ small_end_dib_in = 0, log_length_ft = 16, rule = "doyle", price_per_bf = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(small_end_dib_in > 0)) return { error: "Small-end DIB must be positive." };
  if (!(log_length_ft > 0)) return { error: "Log length must be positive." };
  let bf;
  if (rule === "doyle") {
    bf = Math.max(0, Math.pow(small_end_dib_in - 4, 2) * (log_length_ft / 16));
  } else if (rule === "international") {
    // International is per 16 ft log; scale linearly by length / 16.
    bf = Math.max(0, (0.22 * small_end_dib_in * small_end_dib_in - 0.71 * small_end_dib_in)) * (log_length_ft / 16);
  } else if (rule === "scribner") {
    const dib = Math.round(small_end_dib_in);
    let raw = SCRIBNER_TABLE_16FT[dib];
    if (raw === undefined) {
      // Linear interpolate between known points.
      const keys = Object.keys(SCRIBNER_TABLE_16FT).map(Number).sort((a, b) => a - b);
      if (dib < keys[0] || dib > keys[keys.length - 1]) return { error: "Diameter outside Scribner table range." };
      for (let i = 0; i < keys.length - 1; i++) {
        if (dib >= keys[i] && dib <= keys[i + 1]) {
          const t = (dib - keys[i]) / (keys[i + 1] - keys[i]);
          raw = SCRIBNER_TABLE_16FT[keys[i]] + t * (SCRIBNER_TABLE_16FT[keys[i + 1]] - SCRIBNER_TABLE_16FT[keys[i]]);
          break;
        }
      }
    }
    bf = raw * (log_length_ft / 16);
  } else {
    return { error: "Unknown rule." };
  }
  const note = rule === "doyle" ? "Doyle is industry-standard but underestimates small logs."
    : rule === "international" ? "International 1/4 is most accurate for small logs."
    : "Scribner is from a published public-domain table.";
  // v8 §C.6: optional stand-value output. value_usd = bf × $/bf when supplied.
  const value_usd = price_per_bf > 0 && bf > 0 ? bf * price_per_bf : null;
  return { board_feet: bf, rule, note, value_usd };
}

export const timberCruiseExample = { inputs: { small_end_dib_in: 14, log_length_ft: 16, rule: "doyle" } };

// --- 205: Planting Density and Seed Rate ---

// dims: in { row_width_in: L, in_row_spacing_in: L, target_pop_per_acre: L^-2, seeds_per_lb: M^-1, germination_pct: dimensionless, seed_price_per_lb: dimensionless }
//        out: { seeds_per_acre: L^-2, lbs_per_acre: M L^-2, cost_per_acre: dimensionless }
// (Row width and in-row spacing are lengths `L`; target population
//  per acre is a count per area `L^-2`; seeds-per-lb is a count
//  per mass `M^-1`; germination is a percent (dimensionless). The
//  derived lbs-per-acre is mass per area `M L^-2`. The 6,272,640
//  constant is acre-in-square-inches and absorbs the unit
//  conversion at the source level.)
export function computeSeedRate({ row_width_in = 0, in_row_spacing_in = 0, target_pop_per_acre = 0, seeds_per_lb = 0, germination_pct = 100, seed_price_per_lb = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(row_width_in > 0)) return { error: "Row width must be positive." };
  if (!(seeds_per_lb > 0)) return { error: "Seeds per lb must be positive." };
  if (!(germination_pct > 0 && germination_pct <= 100)) return { error: "Germination must be 1-100%." };
  // 1 acre = 43560 ft^2 = 6,272,640 in^2.
  const acre_in2 = 6272640;
  let seeds_per_acre;
  if (target_pop_per_acre > 0) {
    seeds_per_acre = target_pop_per_acre / (germination_pct / 100);
  } else if (in_row_spacing_in > 0) {
    seeds_per_acre = acre_in2 / (row_width_in * in_row_spacing_in);
  } else {
    return { error: "Provide either target population or in-row spacing." };
  }
  const lbs_per_acre = seeds_per_acre / seeds_per_lb;
  const cost_per_acre = seed_price_per_lb > 0 ? lbs_per_acre * seed_price_per_lb : null;
  return { seeds_per_acre, lbs_per_acre, cost_per_acre };
}

export const seedRateExample = { inputs: { row_width_in: 30, in_row_spacing_in: 0, target_pop_per_acre: 32000, seeds_per_lb: 1500, germination_pct: 95, seed_price_per_lb: 4.50 } };

// --- 206: Tractor Drawbar Power ---

export const TRACTIVE_EFFICIENCY = {
  concrete: 0.87, firm_soil: 0.72, tilled_soil: 0.55, sand: 0.50,
};

// dims: in { pull_lb: M L T^-2, speed_mph: L T^-1, surface: dimensionless }
//        out: { drawbar_hp: M L^2 T^-3, pto_hp_estimate: M L^2 T^-3, tractive_efficiency: dimensionless }
// (Drawbar pull is a force `M L T^-2` (lb-force in the field
//  context); ground speed is `L T^-1`. Their product is power
//  `M L^2 T^-3` and the 375 constant in (pull * mph)/375 = HP
//  absorbs the lbf*mph -> ft-lb/s -> HP unit conversion. The
//  ASABE D497 tractive-efficiency lookup converts drawbar to PTO,
//  both `M L^2 T^-3`; surface class is a categorical token.)
export function computeDrawbarPower({ pull_lb = 0, speed_mph = 0, surface = "firm_soil" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pull_lb > 0)) return { error: "Pull must be positive." };
  if (!(speed_mph > 0)) return { error: "Speed must be positive." };
  const eff = TRACTIVE_EFFICIENCY[surface];
  if (!Number.isFinite(eff)) return { error: "Unknown surface." };
  const dbhp = (pull_lb * speed_mph) / 375;
  // Public ASABE D497 drawbar-to-PTO benchmark: PTO ~= DBHP / tractive_efficiency.
  const pto_hp = dbhp / eff;
  return { drawbar_hp: dbhp, pto_hp_estimate: pto_hp, tractive_efficiency: eff };
}

export const drawbarPowerExample = { inputs: { pull_lb: 4500, speed_mph: 4.5, surface: "firm_soil" } };

// --- 207: Irrigation Sprinkler Uniformity ---

// dims: in { catch_volumes: dimensionless }
//        out: { mean: dimensionless, CU: dimensionless, DU: dimensionless, pass_CU_85: dimensionless, pass_DU_75: dimensionless }
// (Catch-can readings are a caller-typed equal-units array (ml or
//  oz) treated as dimensionless per §7.1 array convention; the
//  Christiansen CU and Distribution Uniformity reduce to ratios of
//  identical-unit aggregates, so both surface as dimensionless
//  percents and the pass-flag booleans are dimensionless.)
export function computeUniformity({ catch_volumes = [] }) {
  if (!Array.isArray(catch_volumes) || catch_volumes.length < 4) return { error: "Need at least 4 catch-can readings." };
  const vals = catch_volumes.map(Number).filter((v) => Number.isFinite(v) && v >= 0);
  if (vals.length < 4) return { error: "Need at least 4 valid readings." };
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (mean <= 0) return { error: "Mean catch volume must be positive." };
  // Christiansen CU = 100 * (1 - sum|x - mean| / (n * mean))
  const sumAbs = vals.reduce((s, v) => s + Math.abs(v - mean), 0);
  const cu = 100 * (1 - sumAbs / (vals.length * mean));
  // DU = 100 * mean(low quartile) / mean.
  const sorted = [...vals].sort((a, b) => a - b);
  const lowQ = sorted.slice(0, Math.max(1, Math.floor(sorted.length / 4)));
  const lowMean = lowQ.reduce((a, b) => a + b, 0) / lowQ.length;
  const du = (lowMean / mean) * 100;
  return { mean, CU: cu, DU: du, pass_CU_85: cu >= 85, pass_DU_75: du >= 75 };
}

export const uniformityExample = { inputs: { catch_volumes: [1.05, 0.95, 1.10, 0.98, 1.02, 0.93, 1.07, 0.99] } };

// --- 208: Soil Bulk Density and Compaction ---

export const COMPACTION_THRESHOLDS_PCC = {
  sand: 1.80, sandy_loam: 1.75, loam: 1.55, clay_loam: 1.45, clay: 1.40,
};

// dims: in { dry_mass_g: M, core_volume_cc: L^3, particle_density_pcc: M L^-3, texture: dimensionless }
//        out: { bulk_density: M L^-3, total_porosity: dimensionless, compaction_threshold: M L^-3, compacted: dimensionless }
// (Dry mass is `M`; core sample volume in cc is `L^3`; particle
//  density and bulk density are both mass-per-volume `M L^-3`.
//  Porosity = 1 - (bulk/particle) is a ratio of like-dim mass-
//  densities, hence dimensionless. NRCS texture class is a
//  categorical token (dimensionless).)
export function computeBulkDensity({ dry_mass_g = 0, core_volume_cc = 0, particle_density_pcc = 2.65, texture = "loam" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(dry_mass_g > 0)) return { error: "Dry mass must be positive." };
  if (!(core_volume_cc > 0)) return { error: "Core volume must be positive." };
  if (!(particle_density_pcc > 0)) return { error: "Particle density must be positive." };
  const bulk_density = dry_mass_g / core_volume_cc;
  const total_porosity = 1 - (bulk_density / particle_density_pcc);
  const threshold = COMPACTION_THRESHOLDS_PCC[texture];
  if (!Number.isFinite(threshold)) return { error: "Unknown texture class." };
  const compacted = bulk_density >= threshold;
  return { bulk_density, total_porosity, compaction_threshold: threshold, compacted };
}

export const bulkDensityExample = { inputs: { dry_mass_g: 200, core_volume_cc: 150, particle_density_pcc: 2.65, texture: "loam" } };

// --- 209: Crop Yield and Harvest Loss ---
//
// Public extension-service practice: yield_bu_per_acre = (test_strip_weight_lb * 43560) / (length * row_width_ft * test_lb_per_bu)
// adjusted to standard moisture.

export const STD_MOISTURE_PCT = { corn: 15.5, soy: 13, wheat: 13.5 };
export const TEST_WEIGHT_LB_PER_BU = { corn: 56, soy: 60, wheat: 60 };

// dims: in { crop: dimensionless, rows_per_pass: dimensionless, row_spacing_in: L, measured_length_ft: L, weight_in_strip_lb: M, current_moisture_pct: dimensionless, ground_loss_lb_in_area: M, ground_loss_area_ft2: L^2 }
//        out: { yield_bu_per_acre: L, std_moisture_pct: dimensionless, harvest_loss_pct: dimensionless }
// (Crop token and row count are dimensionless; row spacing and
//  measured length are lengths `L`; strip and ground-loss weights
//  are mass `M`; ground-loss area is `L^2`. Yield bu/acre is a
//  volume-per-area ratio `L^3 L^-2 = L` (one bushel is the dry
//  volume 2150.42 in^3). The 43560 ft^2/acre and test-weight
//  lb/bu constants absorb the unit conversions at the source level.)
export function computeCropYield({
  crop = "corn", rows_per_pass = 1, row_spacing_in = 30, measured_length_ft = 0,
  weight_in_strip_lb = 0, current_moisture_pct = 0, ground_loss_lb_in_area = 0,
  ground_loss_area_ft2 = 0,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const stdMoist = STD_MOISTURE_PCT[crop];
  const testWeight = TEST_WEIGHT_LB_PER_BU[crop];
  if (!Number.isFinite(stdMoist)) return { error: "Unknown crop." };
  if (!(rows_per_pass >= 1)) return { error: "Rows per pass must be at least 1." };
  if (!(row_spacing_in > 0)) return { error: "Row spacing must be positive." };
  if (!(measured_length_ft > 0)) return { error: "Measured length must be positive." };
  if (!(weight_in_strip_lb >= 0)) return { error: "Strip weight must be non-negative." };
  if (!(current_moisture_pct >= 0 && current_moisture_pct < 100)) return { error: "Moisture must be 0-100%." };
  const strip_area_ft2 = rows_per_pass * (row_spacing_in / 12) * measured_length_ft;
  // Adjust for moisture: dry_lb = strip * (1 - cur)/(1 - std)
  const adjusted_lb = weight_in_strip_lb * ((100 - current_moisture_pct) / (100 - stdMoist));
  const acres = strip_area_ft2 / 43560;
  const bu_per_acre = acres > 0 ? (adjusted_lb / acres) / testWeight : 0;
  let loss_pct = null;
  if (ground_loss_area_ft2 > 0 && ground_loss_lb_in_area > 0 && weight_in_strip_lb > 0) {
    // Project ground loss to per-acre lb, compare to harvested per-acre lb.
    const loss_per_acre_lb = (ground_loss_lb_in_area / ground_loss_area_ft2) * 43560;
    const harvested_per_acre_lb = adjusted_lb / acres;
    loss_pct = (loss_per_acre_lb / (harvested_per_acre_lb + loss_per_acre_lb)) * 100;
  }
  return { yield_bu_per_acre: bu_per_acre, std_moisture_pct: stdMoist, harvest_loss_pct: loss_pct };
}

export const cropYieldExample = { inputs: { crop: "corn", rows_per_pass: 6, row_spacing_in: 30, measured_length_ft: 100, weight_in_strip_lb: 220, current_moisture_pct: 18, ground_loss_lb_in_area: 0, ground_loss_area_ft2: 0 } };

// --- Renderers (compact factory) ---

function _r(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id, f.options);
      else field = makeNumber(f.label, f.id, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) {
        if (f.kind === "select") field.select.value = f.default;
        else field.input.value = String(f.default);
      }
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        if (f.kind === "select") fields[f.key].select.value = v[f.key];
        else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) {
        if (f.kind === "select") params[f.key] = fields[f.key].select.value;
        else params[f.key] = Number(fields[f.key].input.value) || 0;
      }
      const r = spec.compute(params);
      if (r.error) {
        for (const k of Object.keys(outs)) outs[k].textContent = "-";
        outs[spec.outputs[0].key].textContent = r.error;
        return;
      }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener("input", update);
    }
  };
}

const renderGPA = _r({
  citation: "Notice: Read and follow the product label. The label is the law. Citation: GPA = (5940 * GPM) / (speed * spacing).",
  example: gpaExample.inputs,
  fields: [
    { key: "gpm", label: "Nozzle GPM", kind: "number" },
    { key: "spacing_in", label: "Nozzle spacing (in)", kind: "number" },
    { key: "speed_mph", label: "Ground speed (mph)", kind: "number" },
    { key: "target_gpa", label: "Target GPA (optional)", kind: "number" },
  ],
  outputs: [
    { key: "g", id: "gp-out-g", label: "GPA", value: (r) => fmt(r.gpa, 2) + " gal/acre" },
    { key: "r", id: "gp-out-r", label: "Required GPM for target", value: (r) => r.required_gpm === null ? "-" : fmt(r.required_gpm, 3) },
  ],
  compute: computeGPA,
});

const renderTimberCruise = _r({
  citation: "Citation: Public USDA Forest Service technical reports by name only. Doyle: BF = (D-4)^2 * (L/16). International 1/4: BF = (0.22 D^2 - 0.71 D) per 16 ft log.",
  example: timberCruiseExample.inputs,
  fields: [
    { key: "small_end_dib_in", label: "Small-end DIB (in)", kind: "number" },
    { key: "log_length_ft", label: "Log length (ft)", kind: "number", default: 16 },
    { key: "rule", label: "Rule", kind: "select", options: [{ value: "doyle", label: "Doyle" }, { value: "scribner", label: "Scribner" }, { value: "international", label: "International 1/4" }] },
    { key: "price_per_bf", label: "Price ($/bf, optional)", kind: "number", attrs: { step: "any", min: "0" } },
  ],
  outputs: [
    { key: "bf", id: "tc-out-bf", label: "Board feet", value: (r) => fmt(r.board_feet, 1) },
    { key: "n",  id: "tc-out-n",  label: "Note",       value: (r) => r.note },
    { key: "v",  id: "tc-out-v",  label: "Estimated stand value", value: (r) => r.value_usd === null ? "-" : "$" + fmt(r.value_usd, 2) + " (bf x $/bf)" },
  ],
  compute: computeTimberCruise,
});

const renderSeedRate = _r({
  citation: "Citation: Public agronomy practice. seeds/acre = 6,272,640 / (row * spacing) or population / germination.",
  example: seedRateExample.inputs,
  fields: [
    { key: "row_width_in", label: "Row width (in)", kind: "number" },
    { key: "in_row_spacing_in", label: "In-row spacing (in, optional)", kind: "number" },
    { key: "target_pop_per_acre", label: "Target population / acre", kind: "number" },
    { key: "seeds_per_lb", label: "Seeds per lb", kind: "number" },
    { key: "germination_pct", label: "Germination %", kind: "number", default: 95 },
    { key: "seed_price_per_lb", label: "Seed price ($/lb, optional)", kind: "number" },
  ],
  outputs: [
    { key: "s", id: "sr-out-s", label: "Seeds / acre", value: (r) => fmt(r.seeds_per_acre, 0) },
    { key: "l", id: "sr-out-l", label: "Lbs / acre",   value: (r) => fmt(r.lbs_per_acre, 2) },
    { key: "c", id: "sr-out-c", label: "Cost / acre",  value: (r) => r.cost_per_acre === null ? "-" : "$" + fmt(r.cost_per_acre, 2) },
  ],
  compute: computeSeedRate,
});

const renderDrawbarPower = _r({
  citation: "Citation: ASABE D497 by name only. Drawbar HP = (pull * speed) / 375. PTO HP estimate uses public drawbar-to-PTO benchmark.",
  example: drawbarPowerExample.inputs,
  fields: [
    { key: "pull_lb", label: "Drawbar pull (lb)", kind: "number" },
    { key: "speed_mph", label: "Ground speed (mph)", kind: "number" },
    { key: "surface", label: "Surface", kind: "select", options: Object.keys(TRACTIVE_EFFICIENCY).map((k) => ({ value: k, label: k.replace(/_/g, " ") })) },
  ],
  outputs: [
    { key: "d", id: "tp-out-d", label: "Drawbar HP", value: (r) => fmt(r.drawbar_hp, 1) + " hp" },
    { key: "p", id: "tp-out-p", label: "PTO HP estimate", value: (r) => fmt(r.pto_hp_estimate, 1) + " hp" },
    { key: "e", id: "tp-out-e", label: "Tractive efficiency", value: (r) => fmt(r.tractive_efficiency, 2) },
  ],
  compute: computeDrawbarPower,
});

function renderUniformity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Christiansen 1942. CU = 100 * (1 - sum|x - mean| / (n * mean)). DU = 100 * mean(low quartile) / mean.";
  attachExampleButton(inputRegion, () => fillExample(uniformityExample.inputs));
  const list = document.createElement("div"); inputRegion.appendChild(list);
  const rows = [];
  for (let i = 0; i < 12; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const v = document.createElement("input"); v.type = "number"; v.step = "any"; v.min = "0"; v.inputMode = "decimal"; v.placeholder = "Catch can " + (i + 1); v.setAttribute("aria-label", "Catch can " + (i + 1) + " volume");
    wrap.appendChild(v); list.appendChild(wrap);
    v.addEventListener("input", update);
    rows.push(v);
  }
  const oM = makeOutputLine(outputRegion, "Mean", "iu-out-m");
  const oC = makeOutputLine(outputRegion, "Christiansen CU", "iu-out-c");
  const oD = makeOutputLine(outputRegion, "Distribution Uniformity", "iu-out-d");
  const oF = makeOutputLine(outputRegion, "Pass / fail", "iu-out-f");
  function fillExample(v) {
    for (let i = 0; i < rows.length; i++) {
      rows[i].value = v.catch_volumes[i] !== undefined ? v.catch_volumes[i] : "";
    }
    update();
  }
  function update() {
    const vals = rows.map((r) => Number(r.value)).filter((v) => Number.isFinite(v) && v > 0);
    if (vals.length < 4) { oM.textContent = "Need at least 4 readings."; oC.textContent = "-"; oD.textContent = "-"; oF.textContent = "-"; return; }
    const r = computeUniformity({ catch_volumes: vals });
    if (r.error) { oM.textContent = r.error; return; }
    oM.textContent = fmt(r.mean, 3);
    oC.textContent = fmt(r.CU, 1) + " %";
    oD.textContent = fmt(r.DU, 1) + " %";
    oF.textContent = (r.pass_CU_85 ? "CU pass" : "CU fail") + " / " + (r.pass_DU_75 ? "DU pass" : "DU fail");
  }
}

const renderBulkDensity = _r({
  citation: "Citation: USDA NRCS technical notes by name only. Bulk density = dry mass / core volume; porosity = 1 - (bulk / particle).",
  example: bulkDensityExample.inputs,
  fields: [
    { key: "dry_mass_g", label: "Dry core mass (g)", kind: "number" },
    { key: "core_volume_cc", label: "Core volume (cc)", kind: "number" },
    { key: "particle_density_pcc", label: "Particle density (g/cc)", kind: "number", default: 2.65 },
    { key: "texture", label: "Texture", kind: "select", options: Object.keys(COMPACTION_THRESHOLDS_PCC).map((k) => ({ value: k, label: k.replace(/_/g, " ") })) },
  ],
  outputs: [
    { key: "b", id: "bd-out-b", label: "Bulk density", value: (r) => fmt(r.bulk_density, 2) + " g/cc" },
    { key: "p", id: "bd-out-p", label: "Porosity",     value: (r) => fmt(r.total_porosity * 100, 1) + " %" },
    { key: "f", id: "bd-out-f", label: "Compacted?",   value: (r) => r.compacted ? "YES (>= " + r.compaction_threshold + " g/cc)" : "no (< " + r.compaction_threshold + " g/cc)" },
  ],
  compute: computeBulkDensity,
});

const renderCropYield = _r({
  citation: "Citation: Public extension-service practice. Yield bu/acre = strip lb adjusted to standard moisture / acres in strip / test weight.",
  example: cropYieldExample.inputs,
  fields: [
    { key: "crop", label: "Crop", kind: "select", options: Object.keys(STD_MOISTURE_PCT).map((k) => ({ value: k, label: k })) },
    { key: "rows_per_pass", label: "Rows per pass", kind: "number", default: 6 },
    { key: "row_spacing_in", label: "Row spacing (in)", kind: "number", default: 30 },
    { key: "measured_length_ft", label: "Measured length (ft)", kind: "number" },
    { key: "weight_in_strip_lb", label: "Weight in strip (lb)", kind: "number" },
    { key: "current_moisture_pct", label: "Current moisture %", kind: "number" },
    { key: "ground_loss_lb_in_area", label: "Ground-loss weight (lb, optional)", kind: "number" },
    { key: "ground_loss_area_ft2", label: "Ground-loss area (ft^2, optional)", kind: "number" },
  ],
  outputs: [
    { key: "y", id: "cy-out-y", label: "Yield (bu/acre, std moisture)", value: (r) => fmt(r.yield_bu_per_acre, 1) },
    { key: "s", id: "cy-out-s", label: "Standard moisture", value: (r) => r.std_moisture_pct + " %" },
    { key: "l", id: "cy-out-l", label: "Harvest loss", value: (r) => r.harvest_loss_pct === null ? "-" : fmt(r.harvest_loss_pct, 1) + " %" },
  ],
  compute: computeCropYield,
});

// =====================================================================
// v9 §H.4: Temperature-Humidity Index (THI) for livestock
// =====================================================================
//
// USDA-ARS / Kansas State Cooperative Extension public formula. The
// THI index combines dry-bulb temperature and relative humidity into
// a single heat-stress index, with species-specific stress bands.
//
//   THI = T_F - (0.55 - 0.0055 * RH) * (T_F - 58)
//
// Equivalent in Celsius:
//   THI = (1.8 * T_C + 32) - (0.55 - 0.0055 * RH) * (1.8 * T_C - 26)
//
// The two forms are algebraically equivalent given F = 1.8C + 32; the
// implementation works in Fahrenheit internally to avoid conversion
// noise.

// Species-specific stress thresholds. Mild / moderate / severe /
// emergency bands per USDA-ARS livestock heat-stress publications and
// Kansas State University Cooperative Extension. The dairy-cow values
// (THI 72 / 79 / 89 / 99 break points) are the most commonly cited;
// other species adapted from the same sources.
export const THI_THRESHOLDS = {
  "dairy-cow":  { mild: 72, moderate: 79, severe: 89, emergency: 99, label: "Dairy cattle (most heat-sensitive)" },
  "beef-cow":   { mild: 74, moderate: 80, severe: 90, emergency: 99, label: "Beef cattle" },
  "hog":        { mild: 75, moderate: 82, severe: 90, emergency: 99, label: "Swine (hog)" },
  "poultry":    { mild: 70, moderate: 75, severe: 85, emergency: 95, label: "Poultry (broiler)" },
  "horse":      { mild: 72, moderate: 79, severe: 89, emergency: 99, label: "Horse" },
};

const THI_INTERVENTIONS = {
  none:      "No intervention needed.",
  mild:      "Mild stress: provide shade and adequate fresh water.",
  moderate:  "Moderate stress: add fans or sprinklers; verify watering capacity.",
  severe:    "Severe stress: combine fans + sprinklers / soakers; reduce stocking density.",
  emergency: "Emergency: full cooling required; consider relocating animals to climate-controlled facilities.",
};

// dims: in { temperature: T, unit: dimensionless, rh_percent: dimensionless, animal: dimensionless, ventilation: dimensionless }
//        out: { THI: T, T_F: T, T_C: T, band: dimensionless, intervention: dimensionless, animal: dimensionless, species_label: dimensionless, species_thresholds: dimensionless, warnings: dimensionless }
// (Temperature inputs and outputs carry the §7.1 base-token `T`
//  (time-or-temperature shortcut). The unit toggle, species
//  selector, and ventilation mode are categorical tokens
//  (dimensionless); relative humidity is a percent (dimensionless).
//  The Kansas State THI formula combines temperature `T` with a
//  dimensionless humidity correction, so the index surfaces as a
//  temperature `T`.)
export function computeTHI({
  temperature = 0,
  unit = "F",
  rh_percent = 0,
  animal = "dairy-cow",
  ventilation = "closed",
} = {}) {
  const T = Number(temperature);
  const RH = Number(rh_percent);
  if (!Number.isFinite(T)) return { error: "Temperature must be a number." };
  if (!(RH >= 0 && RH <= 100)) return { error: "Relative humidity must be 0 to 100 percent." };
  const species = THI_THRESHOLDS[animal];
  if (!species) return { error: "Unknown animal type. Use one of: " + Object.keys(THI_THRESHOLDS).join(", ") + "." };
  const u = String(unit).toUpperCase();
  if (u !== "F" && u !== "C") return { error: "Unit must be 'F' or 'C'." };

  const T_F = u === "F" ? T : (1.8 * T + 32);
  const T_C = u === "C" ? T : ((T - 32) / 1.8);
  const THI = T_F - (0.55 - 0.0055 * RH) * (T_F - 58);

  let band;
  let intervention_key;
  if (THI < species.mild)          { band = "none";      intervention_key = "none"; }
  else if (THI < species.moderate) { band = "mild";      intervention_key = "mild"; }
  else if (THI < species.severe)   { band = "moderate";  intervention_key = "moderate"; }
  else if (THI < species.emergency){ band = "severe";    intervention_key = "severe"; }
  else                             { band = "emergency"; intervention_key = "emergency"; }

  const warnings = [];
  if (T_F < 50) warnings.push("Temperature below 50 F: no heat stress expected; check cold-stress tools instead.");
  if (ventilation === "open") warnings.push("Open ventilation provides natural cooling; effective THI band may be one step lower than computed.");

  return {
    THI,
    T_F, T_C,
    band,
    intervention: THI_INTERVENTIONS[intervention_key],
    animal,
    species_label: species.label,
    species_thresholds: species,
    warnings,
  };
}

export const thiExample = {
  // 90 F, 60% RH, dairy cow -> THI 82.96, moderate band per the USDA-ARS table.
  inputs: { temperature: 90, unit: "F", rh_percent: 60, animal: "dairy-cow", ventilation: "closed" },
};

function renderTHI(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per USDA-ARS livestock heat-stress research publications and Kansas State University Cooperative Extension. Public domain. Free at usda.gov and at K-State Research and Extension.";

  const t = makeNumber("Temperature", "thi-t", { step: "any" });
  const u = makeSelect("Unit", "thi-u", [
    { value: "F", label: "Fahrenheit", selected: true },
    { value: "C", label: "Celsius" },
  ]);
  const rh = makeNumber("Relative humidity (%)", "thi-rh", { step: "any", min: "0", max: "100" });
  const a = makeSelect("Animal type", "thi-animal",
    Object.keys(THI_THRESHOLDS).map((k) => ({ value: k, label: THI_THRESHOLDS[k].label, selected: k === "dairy-cow" })),
  );
  const v = makeSelect("Ventilation", "thi-vent", [
    { value: "closed", label: "Closed / housed", selected: true },
    { value: "open",   label: "Open / pasture" },
  ]);
  for (const f of [t, u, rh, a, v]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    t.input.value = "90"; u.select.value = "F"; rh.input.value = "60";
    a.select.value = "dairy-cow"; v.select.value = "closed"; update();
  });

  const oTHI = makeOutputLine(outputRegion, "THI", "thi-out-thi");
  const oB = makeOutputLine(outputRegion, "Stress band", "thi-out-b");
  const oI = makeOutputLine(outputRegion, "Recommended intervention", "thi-out-i");
  const oW = makeOutputLine(outputRegion, "Notes", "thi-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeTHI({
      temperature: readNum(t.input),
      unit: u.select.value,
      rh_percent: readNum(rh.input),
      animal: a.select.value,
      ventilation: v.select.value,
    });
    if (r.error) {
      oTHI.textContent = r.error; oB.textContent = ""; oI.textContent = ""; oW.textContent = "";
      return;
    }
    oTHI.textContent = fmt(r.THI, 1);
    oB.textContent = r.band;
    oI.textContent = r.intervention;
    oW.textContent = r.warnings.length > 0 ? r.warnings.join(" ") : "USDA-ARS thresholds; consult a veterinarian for site-specific guidance.";
  }, DEBOUNCE_MS);
  for (const f of [t.input, u.select, rh.input, a.select, v.select]) f.addEventListener("input", update);
}

// =====================================================================
// v9 §H.3: Sprayer 1/128-acre calibration
// =====================================================================
//
// USDA Cooperative Extension public method. The 1/128-acre method
// exploits the convenient identity that 1 fluid ounce per nozzle
// collected over 1/128 acre equals 1 gallon per acre application
// rate, because there are 128 fl oz in a gallon.
//
//   acre_fraction      = 1 / 128 (definition)
//   1/128 acre (ft^2)  = 43560 / 128 = 340.3125
//   travel_distance_ft = 340.3125 / boom_width_ft
//   gpa_actual         = oz_per_nozzle  (when measured over 1/128 acre)
//
// The renderer surfaces the travel-distance lookup, the elapsed time
// (for ground-speed verification), and the application rate against
// an optional target. When the actual GPA exceeds the target, the
// calculator suggests reducing speed or pressure; when below, the
// opposite.

// dims: in { boom_width_ft: L, oz_per_nozzle: L^3, time_s: T, target_gpa: L }
//        out: { travel_distance_ft: L, gpa_actual: L, ground_speed_mph: L T^-1, suggested_speed_mph: L T^-1, adjustment: dimensionless, target_gpa: L, warnings: dimensionless }
// (Boom width and travel distance are lengths `L`; ounces per
//  nozzle is a volume `L^3`; travel time is `T` (time leg of the
//  shortcut). GPA carries volume-per-area `L^3 L^-2 = L` per the
//  same §7.1 convention as computeGPA. Ground speed is `L T^-1`.
//  The 43560/128 acre-fraction constant absorbs the 1/128-acre
//  identity at the source level. Adjustment / warnings are
//  categorical (dimensionless).)
export function computeSprayerCalibration({
  boom_width_ft = 0,
  oz_per_nozzle = 0,
  time_s = 0,
  target_gpa = 0,
  field_acres = 0,
  tank_size_gal = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const W = Number(boom_width_ft) || 0;
  const oz = Number(oz_per_nozzle) || 0;
  const t = Number(time_s) || 0;
  const target = Number(target_gpa) || 0;
  if (!(W > 0)) return { error: "Boom width must be positive (ft)." };
  if (!(oz > 0)) return { error: "Ounces per nozzle must be positive." };
  if (!(t > 0)) return { error: "Travel time must be positive (s)." };
  if (target < 0) return { error: "Target GPA cannot be negative." };

  // 1/128 acre in square feet.
  const acre_fraction_ft2 = 43560 / 128;
  const travel_distance_ft = acre_fraction_ft2 / W;
  // 1/128-acre identity: gpa_actual = oz_per_nozzle.
  const gpa_actual = oz;
  // Verify ground speed for record-keeping.
  const speed_mph = (travel_distance_ft / t) * (3600 / 5280);

  let adjustment = null;
  let suggested_speed_mph = null;
  if (target > 0) {
    if (Math.abs(gpa_actual - target) / target > 0.05) {
      // > 5% deviation; suggest a speed change to land at target.
      // GPA scales inversely with speed: speed_new / speed_now = gpa_actual / target.
      suggested_speed_mph = speed_mph * (gpa_actual / target);
      adjustment = gpa_actual > target
        ? "Over-applying: increase ground speed (or reduce pressure) to reduce GPA."
        : "Under-applying: reduce ground speed (or increase pressure) to raise GPA.";
    } else {
      adjustment = "Within 5% of target; calibration acceptable.";
    }
  }

  const warnings = [];
  if (travel_distance_ft < 50) warnings.push("Travel distance under 50 ft: boom-width is large enough that the precision degrades; consider 2x distance.");
  if (oz < 1) warnings.push("Volume per nozzle under 1 oz: below the precision threshold; re-collect at 2x distance.");

  // v23 EN.19: tank batches and refill points from field acres + tank size.
  // total spray volume = GPA x acres; loads = ceil(volume / tank); acres per
  // tank = tank / GPA. All optional; default (no field/tank) omits them.
  const facres = Number(field_acres) || 0;
  const tank = Number(tank_size_gal) || 0;
  let total_volume_gal = null, tank_loads = null, acres_per_tank = null;
  if (facres > 0 && Number.isFinite(facres) && gpa_actual > 0) {
    const v = gpa_actual * facres;
    if (Number.isFinite(v)) total_volume_gal = v;
  }
  if (tank > 0 && Number.isFinite(tank)) {
    if (total_volume_gal != null) tank_loads = Math.ceil(total_volume_gal / tank);
    if (gpa_actual > 0) { const a = tank / gpa_actual; if (Number.isFinite(a)) acres_per_tank = a; }
  }

  return {
    travel_distance_ft,
    gpa_actual,
    ground_speed_mph: speed_mph,
    suggested_speed_mph,
    adjustment,
    target_gpa: target > 0 ? target : null,
    total_volume_gal,
    tank_loads,
    acres_per_tank,
    warnings,
  };
}

export const sprayerCalibrationExample = {
  // USDA worked example: 20 ft boom at 4 mph
  // travel = 340.3125 / 20 = 17.016 ft
  // time at 4 mph = 17.016 / (4 * 5280/3600) = 17.016 / 5.867 = 2.9 s
  // catch 20 oz per nozzle -> 20 GPA at target 20 -> within 5%
  inputs: { boom_width_ft: 20, oz_per_nozzle: 20, time_s: 2.9, target_gpa: 20 },
};

function renderSprayerCalibration(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per USDA Cooperative Extension Service public 1/128-acre calibration method. Pesticide label rates govern application; pesticide-applicator license governs use. Free at extension.org and at land-grant university extension offices.";

  const w = makeNumber("Boom width (ft)", "sc-w", { step: "any", min: "0" });
  const oz = makeNumber("Ounces collected per nozzle (over 1/128 acre)", "sc-oz", { step: "any", min: "0" });
  const t = makeNumber("Time to travel the distance (s)", "sc-t", { step: "any", min: "0" });
  const tg = makeNumber("Target application rate (GPA; optional)", "sc-tg", { step: "any", min: "0" });
  // v23 EN.19: field acres + tank size for tank-batches and refill points.
  const fa = makeNumber("Field acres (optional)", "sc-fa", { step: "any", min: "0" });
  const tk = makeNumber("Tank size (gal; optional)", "sc-tk", { step: "any", min: "0" });
  for (const f of [w, oz, t, tg, fa, tk]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    w.input.value = "20"; oz.input.value = "20"; t.input.value = "2.9"; tg.input.value = "20"; fa.input.value = "80"; tk.input.value = "300"; update();
  });

  const oTD = makeOutputLine(outputRegion, "Travel distance for 1/128 acre (ft)", "sc-out-td");
  const oG = makeOutputLine(outputRegion, "Application rate (GPA)", "sc-out-g");
  const oS = makeOutputLine(outputRegion, "Ground speed (mph)", "sc-out-s");
  const oA = makeOutputLine(outputRegion, "Adjustment", "sc-out-a");
  const oTank = makeOutputLine(outputRegion, "Tank batches (if acres + tank)", "sc-out-tank");
  const oW = makeOutputLine(outputRegion, "Notes", "sc-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeSprayerCalibration({
      boom_width_ft: readNum(w.input),
      oz_per_nozzle: readNum(oz.input),
      time_s: readNum(t.input),
      target_gpa: readNum(tg.input) || 0,
      field_acres: readNum(fa.input) || 0,
      tank_size_gal: readNum(tk.input) || 0,
    });
    if (r.error) {
      oTD.textContent = r.error; oG.textContent = ""; oS.textContent = ""; oA.textContent = ""; oTank.textContent = ""; oW.textContent = "";
      return;
    }
    oTD.textContent = fmt(r.travel_distance_ft, 1) + " ft";
    oG.textContent = fmt(r.gpa_actual, 1) + " GPA";
    oS.textContent = fmt(r.ground_speed_mph, 2) + " mph";
    oTank.textContent = r.total_volume_gal == null ? "(enter field acres)" : (fmt(r.total_volume_gal, 0) + " gal total" + (r.tank_loads == null ? "" : ", " + r.tank_loads + " tank loads, " + fmt(r.acres_per_tank, 1) + " acres/tank"));
    if (r.adjustment) {
      oA.textContent = r.adjustment + (r.suggested_speed_mph ? " Try " + fmt(r.suggested_speed_mph, 2) + " mph." : "");
    } else {
      oA.textContent = "(no target entered)";
    }
    oW.textContent = r.warnings.length > 0 ? r.warnings.join(" ") : "USDA public-domain method; pesticide label governs.";
  }, DEBOUNCE_MS);
  for (const f of [w.input, oz.input, t.input, tg.input]) f.addEventListener("input", update);
}

// --- spec-v17 L.1 Acre-foot irrigation requirement (ET-based) --------

// Mid-season crop coefficients Kc per FAO Irrigation and Drainage Paper
// 56 (Allen et al. 1998) Table 12. Representative single-value mid-season
// Kc; the full FAO 56 method varies Kc by growth stage. The reference ET
// (ET0) is user-supplied from the local CIMIS / Mesonet / NOAA station.
export const FAO56_CROP_KC = {
  alfalfa: 1.15,
  corn: 1.20,
  cotton: 1.15,
  wheat: 1.15,
  pasture: 0.95,
  turfgrass: 0.80,
  vegetables: 1.05,
};

// Application efficiency by irrigation method (NRCS Irrigation Guide).
export const IRRIGATION_EFFICIENCY_PCT = {
  drip: 90,
  sprinkler: 75,
  flood: 50,
};

const GAL_PER_ACRE_FT = 325851;

// dims: in { args: dimensionless } out: { et_crop_in: L, gross_in: L, acre_ft: L^3, gallons: L^3 }
export function computeIrrigationRequirement({
  crop = "corn",
  et_ref_in_per_day = 0,
  period_days = 0,
  area_acres = 0,
  efficiency_pct = 75,
  rainfall_in = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const kc = FAO56_CROP_KC[crop];
  if (kc === undefined) return { error: "Unknown crop '" + crop + "'." };
  const et0 = Number(et_ref_in_per_day);
  const days = Number(period_days);
  const area = Number(area_acres);
  const eff = Number(efficiency_pct);
  const rain = Number(rainfall_in) || 0;
  if (!(et0 > 0)) return { error: "Enter a positive reference ET (in/day)." };
  if (!(days > 0)) return { error: "Enter a positive period length (days)." };
  if (!(area > 0)) return { error: "Enter a positive field area (acres)." };
  if (!(eff > 0 && eff <= 100)) return { error: "Irrigation efficiency must be between 0 and 100 percent." };

  const et_crop_in = kc * et0 * days;
  const net_in = Math.max(0, et_crop_in - rain);
  const gross_in = net_in / (eff / 100);
  const acre_ft = (gross_in * area) / 12;
  const gallons = acre_ft * GAL_PER_ACRE_FT;

  const warnings = [];
  if (kc < 0.2 || kc > 1.4) warnings.push("Crop coefficient outside the typical 0.2-1.4 range; verify against FAO 56 Table 12 for the growth stage.");
  if (net_in === 0) warnings.push("Rainfall meets or exceeds crop ET for the period; no irrigation is required.");

  return {
    crop,
    kc,
    et_ref_in_per_day: et0,
    period_days: days,
    et_crop_in,
    rainfall_in: rain,
    net_in,
    efficiency_pct: eff,
    gross_in,
    area_acres: area,
    acre_ft,
    gallons,
    warnings,
  };
}

export const irrigationRequirementExample = {
  // Corn (Kc 1.20), 0.25 in/day ET0 over a 30-day period, 80 acres,
  // 90% drip efficiency, 1.0 in rainfall.
  // ET_crop = 1.20 * 0.25 * 30 = 9.0 in; net = 8.0; gross = 8.889 in;
  // acre-ft = 8.889 * 80 / 12 = 59.26.
  inputs: { crop: "corn", et_ref_in_per_day: 0.25, period_days: 30, area_acres: 80, efficiency_pct: 90, rainfall_in: 1.0 },
};

function renderIrrigationRequirement(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per FAO Irrigation and Drainage Paper 56 (Crop Evapotranspiration, Allen et al. 1998) and the USDA NRCS Irrigation Guide. ET_crop = Kc x ET0 x days; gross = max(0, ET_crop - rainfall) / efficiency; acre-ft = gross_in x acres / 12. Kc values from FAO 56 Table 12. Reference ET0 from your local CIMIS / Mesonet / NOAA station. Free at fao.org.";
  const crop = makeSelect("Crop", "ir-crop", Object.keys(FAO56_CROP_KC).map((k) => ({ value: k, label: k.charAt(0).toUpperCase() + k.slice(1) + " (Kc " + FAO56_CROP_KC[k] + ")", selected: k === "corn" })));
  const et0 = makeNumber("Reference ET0 (in/day)", "ir-et0", { step: "any", min: "0", value: "0.25" });
  const days = makeNumber("Period length (days)", "ir-days", { step: "any", min: "0", value: "30" });
  const area = makeNumber("Field area (acres)", "ir-area", { step: "any", min: "0", value: "80" });
  const eff = makeSelect("Irrigation method (efficiency)", "ir-eff", [
    { value: "90", label: "Drip (90%)", selected: true },
    { value: "75", label: "Sprinkler (75%)" },
    { value: "50", label: "Flood (50%)" },
  ]);
  const rain = makeNumber("Effective rainfall over the period (in)", "ir-rain", { step: "any", min: "0", value: "1.0" });
  for (const f of [crop, et0, days, area, eff, rain]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    crop.select.value = "corn"; et0.input.value = "0.25"; days.input.value = "30";
    area.input.value = "80"; eff.select.value = "90"; rain.input.value = "1.0"; update();
  });

  const oEt = makeOutputLine(outputRegion, "Crop ET demand", "ir-out-et");
  const oNet = makeOutputLine(outputRegion, "Net / gross depth", "ir-out-net");
  const oVol = makeOutputLine(outputRegion, "Total water", "ir-out-vol");
  const oNote = makeOutputLine(outputRegion, "Notes", "ir-out-note");

  function readNum(input) { if (input.value === "") return null; const n = Number(input.value); return Number.isFinite(n) ? n : null; }
  const update = debounce(() => {
    const r = computeIrrigationRequirement({
      crop: crop.select.value,
      et_ref_in_per_day: readNum(et0.input),
      period_days: readNum(days.input),
      area_acres: readNum(area.input),
      efficiency_pct: Number(eff.select.value),
      rainfall_in: readNum(rain.input),
    });
    if (r.error) { oEt.textContent = r.error; oNet.textContent = "-"; oVol.textContent = "-"; oNote.textContent = ""; return; }
    oEt.textContent = fmt(r.et_crop_in, 2) + " in (Kc " + r.kc + " x " + fmt(r.et_ref_in_per_day, 2) + " in/day x " + fmt(r.period_days, 0) + " d)";
    oNet.textContent = fmt(r.net_in, 2) + " in net / " + fmt(r.gross_in, 2) + " in gross (" + r.efficiency_pct + "% eff)";
    oVol.textContent = fmt(r.acre_ft, 2) + " acre-ft (" + fmt(r.gallons, 0) + " gal) over " + fmt(r.area_acres, 0) + " acres";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Gross depth applied across the field; compare against your water right or allocation.";
  }, DEBOUNCE_MS);
  for (const el of [et0.input, days.input, area.input, rain.input]) el.addEventListener("input", update);
  for (const s of [crop.select, eff.select]) s.addEventListener("change", update);
}

// --- spec-v17 L.3 Cattle stocking rate (AUM) -------------------------

// Animal-unit equivalents (USDA NRCS National Range and Pasture Handbook
// Ch. 6). One animal unit (AU) = a 1,000 lb cow consuming ~26 lb dry
// matter per day; one animal-unit-month (AUM) = 26 x 30 = 780 lb.
export const ANIMAL_UNIT_EQUIV = {
  cow_calf: 1.0,
  yearling: 0.7,
  sheep: 0.2,
  horse: 1.25,
};
const AUM_LB_DM = 780;
const AU_LB_DM_PER_DAY = 26;

// dims: in { args: dimensionless } out: { available_forage_lb: M, aums_available: dimensionless, grazing_days: T }
export function computeStockingRate({
  area_acres = 0,
  forage_lb_per_acre = 0,
  utilization_pct = 40,
  animal_class = "cow_calf",
  herd_size = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const au = ANIMAL_UNIT_EQUIV[animal_class];
  if (au === undefined) return { error: "Unknown animal class '" + animal_class + "'." };
  const area = Number(area_acres);
  const forage = Number(forage_lb_per_acre);
  const util = Number(utilization_pct);
  const herd = Number(herd_size) || 0;
  if (!(area > 0)) return { error: "Enter a positive pasture area (acres)." };
  if (!(forage > 0)) return { error: "Enter a positive forage production (lb/acre)." };
  if (!(util > 0 && util <= 100)) return { error: "Utilization must be between 0 and 100 percent." };

  const available_forage_lb = forage * area * (util / 100);
  const aums_available = available_forage_lb / AUM_LB_DM;
  // Head of this animal class the pasture carries for one 30-day month.
  const head_one_month = aums_available / au;
  // Grazing days for the entered herd of this class.
  const grazing_days = herd > 0 ? available_forage_lb / (herd * au * AU_LB_DM_PER_DAY) : null;
  const acres_per_head = herd > 0 ? area / herd : null;

  const warnings = [];
  if (util > 60) warnings.push("Utilization above 60% is an overgrazing risk on rangeland; the take-half-leave-half guideline targets 25-50% on arid range.");
  if (grazing_days != null && grazing_days < 30) warnings.push("The entered herd grazes the available forage in under a month; reduce herd size or supplement.");

  return {
    animal_class,
    au_equiv: au,
    area_acres: area,
    forage_lb_per_acre: forage,
    utilization_pct: util,
    available_forage_lb,
    aums_available,
    head_one_month,
    herd_size: herd,
    grazing_days,
    acres_per_head,
    warnings,
  };
}

export const stockingRateExample = {
  // 160 acres, 1,500 lb/acre forage, 40% utilization, cow-calf pairs,
  // herd of 30. available = 1500 * 160 * 0.40 = 96,000 lb; AUMs =
  // 96,000 / 780 = 123.08; grazing days (30 head) = 96,000 / (30*26) = 123.08.
  inputs: { area_acres: 160, forage_lb_per_acre: 1500, utilization_pct: 40, animal_class: "cow_calf", herd_size: 30 },
};

function renderStockingRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per USDA NRCS National Range and Pasture Handbook Ch. 6 (stocking rate). available forage = production x area x utilization; AUMs = available / 780 lb (26 lb dry matter/day x 30 days per animal unit). Drought and climate adjustments are essential. Free at nrcs.usda.gov for the handbook.";
  const area = makeNumber("Pasture area (acres)", "sr-area", { step: "any", min: "0", value: "160" });
  const forage = makeNumber("Forage production (lb/acre)", "sr-forage", { step: "any", min: "0", value: "1500" });
  const util = makeNumber("Utilization (%)", "sr-util", { step: "any", min: "0", max: "100", value: "40" });
  const cls = makeSelect("Animal class", "sr-cls", [
    { value: "cow_calf", label: "Cow-calf pair (1.0 AU)", selected: true },
    { value: "yearling", label: "Yearling (0.7 AU)" },
    { value: "sheep", label: "Sheep (0.2 AU)" },
    { value: "horse", label: "Horse (1.25 AU)" },
  ]);
  const herd = makeNumber("Herd size (optional)", "sr-herd", { step: "1", min: "0", value: "30" });
  for (const f of [area, forage, util, cls, herd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    area.input.value = "160"; forage.input.value = "1500"; util.input.value = "40";
    cls.select.value = "cow_calf"; herd.input.value = "30"; update();
  });

  const oForage = makeOutputLine(outputRegion, "Available forage", "sr-out-forage");
  const oAum = makeOutputLine(outputRegion, "AUMs / carrying capacity", "sr-out-aum");
  const oDays = makeOutputLine(outputRegion, "Grazing days for the herd", "sr-out-days");
  const oNote = makeOutputLine(outputRegion, "Notes", "sr-out-note");

  function readNum(input) { if (input.value === "") return null; const n = Number(input.value); return Number.isFinite(n) ? n : null; }
  const update = debounce(() => {
    const r = computeStockingRate({
      area_acres: readNum(area.input),
      forage_lb_per_acre: readNum(forage.input),
      utilization_pct: readNum(util.input),
      animal_class: cls.select.value,
      herd_size: readNum(herd.input),
    });
    if (r.error) { oForage.textContent = r.error; oAum.textContent = "-"; oDays.textContent = "-"; oNote.textContent = ""; return; }
    oForage.textContent = fmt(r.available_forage_lb, 0) + " lb dry matter (" + r.utilization_pct + "% of " + fmt(r.forage_lb_per_acre * r.area_acres, 0) + " lb)";
    oAum.textContent = fmt(r.aums_available, 1) + " AUMs; ~" + Math.floor(r.head_one_month) + " head of this class for 30 days";
    oDays.textContent = r.grazing_days != null ? fmt(r.grazing_days, 0) + " days for " + r.herd_size + " head (" + fmt(r.acres_per_head, 1) + " acres/head)" : "enter a herd size";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Carrying capacity from clip-and-weigh or the NRCS Ecological Site Description; adjust for drought.";
  }, DEBOUNCE_MS);
  for (const el of [area.input, forage.input, util.input, herd.input]) el.addEventListener("input", update);
  cls.select.addEventListener("change", update);
}

// --- spec-v17 L.4 Grain bin capacity ---------------------------------

// USDA FGIS standard test weights (lb per bushel).
export const GRAIN_TEST_WEIGHT_LB_BU = {
  corn: 56,
  wheat: 60,
  soybeans: 60,
  oats: 32,
};
// 1 ft^3 = 0.8036 bushels (1 bushel = 1.2445 ft^3).
const BUSHELS_PER_FT3 = 0.8036;

// dims: in { args: dimensionless } out: { cylinder_ft3: L^3, cone_ft3: L^3, total_bushels: dimensionless, weight_lb: M }
export function computeGrainBin({
  diameter_ft = 0,
  eave_height_ft = 0,
  peak_height_ft = 0,
  grain = "corn",
  packing_factor = 1.0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const d = Number(diameter_ft);
  const eave = Number(eave_height_ft);
  const peak = Number(peak_height_ft) || 0;
  const pack = Number(packing_factor) || 1.0;
  const tw = GRAIN_TEST_WEIGHT_LB_BU[grain];
  if (tw === undefined) return { error: "Unknown grain '" + grain + "'." };
  if (!(d > 0)) return { error: "Enter a positive bin diameter (ft)." };
  if (!(eave > 0)) return { error: "Enter a positive eave (wall) height (ft)." };
  if (peak < 0) return { error: "Peak height cannot be negative." };
  if (!(pack > 0)) return { error: "Packing factor must be positive." };

  const area_ft2 = Math.PI * (d / 2) * (d / 2);
  const cylinder_ft3 = area_ft2 * eave;
  const cone_ft3 = (1 / 3) * area_ft2 * peak;
  const total_ft3 = (cylinder_ft3 + cone_ft3) * pack;
  const total_bushels = total_ft3 * BUSHELS_PER_FT3;
  const cylinder_bushels = cylinder_ft3 * pack * BUSHELS_PER_FT3;
  const cone_bushels = cone_ft3 * pack * BUSHELS_PER_FT3;
  const weight_lb = total_bushels * tw;

  const warnings = [];
  if (d > 105) warnings.push("Bin diameter above 105 ft is outside the typical farm range; verify the structure is commercial-engineered.");
  if (total_bushels > 1e6) warnings.push("Capacity above 1,000,000 bushels is commercial-elevator scale.");

  return {
    diameter_ft: d,
    grain,
    test_weight_lb_bu: tw,
    packing_factor: pack,
    cylinder_ft3,
    cone_ft3,
    total_ft3,
    cylinder_bushels,
    cone_bushels,
    total_bushels,
    weight_lb,
    warnings,
  };
}

export const grainBinExample = {
  // 30 ft diameter, 20 ft eave, 8 ft peak cone, corn, free-flow packing.
  // area = pi*15^2 = 706.86 ft^2; cyl = 14,137.2 ft^3; cone = 1,884.96;
  // total = 16,022.1 ft^3 -> 12,875 bu -> 721,022 lb at 56 lb/bu.
  inputs: { diameter_ft: 30, eave_height_ft: 20, peak_height_ft: 8, grain: "corn", packing_factor: 1.0 },
};

function renderGrainBin(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Bin geometry first-principles (cylinder + cone); bushels = ft^3 x 0.8036 (1 bushel = 1.2445 ft^3); test weights per USDA FGIS (Federal Grain Inspection Service) standards. Free at ams.usda.gov/services/grain-inspection.";
  const d = makeNumber("Bin diameter (ft)", "gb-d", { step: "any", min: "0", value: "30" });
  const eave = makeNumber("Eave (wall) height (ft)", "gb-eave", { step: "any", min: "0", value: "20" });
  const peak = makeNumber("Peak cone height (ft; 0 for flat)", "gb-peak", { step: "any", min: "0", value: "8" });
  const grain = makeSelect("Grain", "gb-grain", [
    { value: "corn", label: "Corn (56 lb/bu)", selected: true },
    { value: "wheat", label: "Wheat (60 lb/bu)" },
    { value: "soybeans", label: "Soybeans (60 lb/bu)" },
    { value: "oats", label: "Oats (32 lb/bu)" },
  ]);
  const pack = makeSelect("Packing factor", "gb-pack", [
    { value: "1.0", label: "Free-flow (1.00)", selected: true },
    { value: "1.05", label: "Packed (1.05)" },
  ]);
  for (const f of [d, eave, peak, grain, pack]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    d.input.value = "30"; eave.input.value = "20"; peak.input.value = "8";
    grain.select.value = "corn"; pack.select.value = "1.0"; update();
  });

  const oCyl = makeOutputLine(outputRegion, "Cylinder volume", "gb-out-cyl");
  const oCone = makeOutputLine(outputRegion, "Cone volume", "gb-out-cone");
  const oBu = makeOutputLine(outputRegion, "Total capacity", "gb-out-bu");
  const oNote = makeOutputLine(outputRegion, "Notes", "gb-out-note");

  function readNum(input) { if (input.value === "") return null; const n = Number(input.value); return Number.isFinite(n) ? n : null; }
  const update = debounce(() => {
    const r = computeGrainBin({
      diameter_ft: readNum(d.input),
      eave_height_ft: readNum(eave.input),
      peak_height_ft: readNum(peak.input),
      grain: grain.select.value,
      packing_factor: Number(pack.select.value),
    });
    if (r.error) { oCyl.textContent = r.error; oCone.textContent = "-"; oBu.textContent = "-"; oNote.textContent = ""; return; }
    oCyl.textContent = fmt(r.cylinder_ft3, 0) + " ft^3 (" + fmt(r.cylinder_bushels, 0) + " bu)";
    oCone.textContent = fmt(r.cone_ft3, 0) + " ft^3 (" + fmt(r.cone_bushels, 0) + " bu)";
    oBu.textContent = fmt(r.total_bushels, 0) + " bu (" + fmt(r.weight_lb, 0) + " lb at " + r.test_weight_lb_bu + " lb/bu)";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Total capacity at the entered packing factor; actual fill depends on the fill cone angle and moisture.";
  }, DEBOUNCE_MS);
  for (const el of [d.input, eave.input, peak.input]) el.addEventListener("input", update);
  for (const s of [grain.select, pack.select]) s.addEventListener("change", update);
}

// --- spec-v17 L.2 NPK blend from soil test --------------------------

// Representative crop nutrient demand (lb/acre of N, P2O5, K2O) drawn from
// USDA NRCS Agronomy Technical Note ranges and typical Cooperative
// Extension recommendations. These are mid-range starting points only:
// the certified soil-test lab report and the state Extension
// recommendation for your soil and yield goal govern. Legumes (soybeans,
// alfalfa) fix their own nitrogen, so their fertilizer N demand is ~0.
export const CROP_NUTRIENT_DEMAND = {
  corn:     { n: 150, p: 60, k: 40 },
  wheat:    { n: 100, p: 50, k: 30 },
  cotton:   { n: 90,  p: 50, k: 60 },
  soybeans: { n: 0,   p: 45, k: 80 },
  alfalfa:  { n: 0,   p: 60, k: 200 },
  vegetables: { n: 120, p: 80, k: 100 },
};

// Default straight-fertilizer sources (grade as N-P2O5-K2O percent). The
// blend is solved from three straights, the standard Extension method:
// potash for K, DAP for P (which also carries N), urea for the balance of
// N. Each grade is user-overridable for the product on hand.
const NPK_DEFAULT_SOURCES = {
  urea_n_pct: 46,   // urea 46-0-0 (N source)
  dap_n_pct: 18,    // diammonium phosphate 18-46-0 (P source, adds N)
  dap_p_pct: 46,
  mop_k_pct: 60,    // muriate of potash 0-0-60 (K source)
};

// dims: in { args: dimensionless } out: { rec_n_lb_per_acre: M L^-2, rec_p_lb_per_acre: M L^-2, rec_k_lb_per_acre: M L^-2, urea_lb_per_acre: M L^-2, dap_lb_per_acre: M L^-2, mop_lb_per_acre: M L^-2, urea_total_lb: M, dap_total_lb: M, mop_total_lb: M }
export function computeNpkBlend({
  crop = "corn",
  soil_n_lb_per_acre = 0,
  soil_p_lb_per_acre = 0,
  soil_k_lb_per_acre = 0,
  area_acres = 0,
  urea_n_pct = NPK_DEFAULT_SOURCES.urea_n_pct,
  dap_n_pct = NPK_DEFAULT_SOURCES.dap_n_pct,
  dap_p_pct = NPK_DEFAULT_SOURCES.dap_p_pct,
  mop_k_pct = NPK_DEFAULT_SOURCES.mop_k_pct,
  bag_weight_lb = 50,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const demand = CROP_NUTRIENT_DEMAND[crop];
  if (demand === undefined) return { error: "Unknown crop '" + crop + "'." };
  const area = Number(area_acres);
  if (!(area > 0)) return { error: "Enter a positive field area (acres)." };
  const soilN = Math.max(0, Number(soil_n_lb_per_acre) || 0);
  const soilP = Math.max(0, Number(soil_p_lb_per_acre) || 0);
  const soilK = Math.max(0, Number(soil_k_lb_per_acre) || 0);
  const ureaN = Number(urea_n_pct) / 100;
  const dapN = Number(dap_n_pct) / 100;
  const dapP = Number(dap_p_pct) / 100;
  const mopK = Number(mop_k_pct) / 100;

  // Nutrient still needed after the soil-test credit (floored at zero).
  const rec_n = Math.max(0, demand.n - soilN);
  const rec_p = Math.max(0, demand.p - soilP);
  const rec_k = Math.max(0, demand.k - soilK);

  const warnings = [];

  // Solve the three straights in order: K from potash, P from DAP, then
  // the N balance from urea after crediting the N that DAP carries.
  let mop_lb = 0;
  if (rec_k > 0) {
    if (!(mopK > 0)) return { error: "Potash grade (K2O %) must be positive to supply potassium." };
    mop_lb = rec_k / mopK;
  }
  let dap_lb = 0;
  if (rec_p > 0) {
    if (!(dapP > 0)) return { error: "DAP grade (P2O5 %) must be positive to supply phosphorus." };
    dap_lb = rec_p / dapP;
  }
  const n_from_dap = dap_lb * dapN;
  let urea_lb = 0;
  const n_balance = rec_n - n_from_dap;
  if (n_balance > 0) {
    if (!(ureaN > 0)) return { error: "Urea grade (N %) must be positive to supply nitrogen." };
    urea_lb = n_balance / ureaN;
  } else if (rec_n > 0 && n_from_dap > rec_n) {
    warnings.push("The phosphorus source (DAP) alone supplies " + n_from_dap.toFixed(0) + " lb N/acre, more than the " + rec_n.toFixed(0) + " lb N/acre needed; no urea is added and N is over-applied by " + (n_from_dap - rec_n).toFixed(0) + " lb/acre. Consider a low-N phosphate (e.g. triple superphosphate 0-46-0).");
  }

  // Nutrients actually delivered by the blend.
  const n_delivered = urea_lb * ureaN + dap_lb * dapN;
  const p_delivered = dap_lb * dapP;
  const k_delivered = mop_lb * mopK;

  if (demand.n === 0) warnings.push(cap(crop) + " is a legume and fixes its own nitrogen; fertilizer N demand is treated as zero.");
  if (rec_n > 250) warnings.push("Nitrogen recommendation above 250 lb/acre is excessive for most crops; verify the soil test and yield goal.");
  if (rec_p > 100) warnings.push("Phosphorus recommendation above 100 lb P2O5/acre risks soil-test P buildup and runoff loss.");
  if (rec_n === 0 && rec_p === 0 && rec_k === 0) warnings.push("Soil-test levels meet or exceed crop demand for all three nutrients; no fertilizer is recommended.");

  return {
    crop,
    rec_n_lb_per_acre: rec_n,
    rec_p_lb_per_acre: rec_p,
    rec_k_lb_per_acre: rec_k,
    urea_lb_per_acre: urea_lb,
    dap_lb_per_acre: dap_lb,
    mop_lb_per_acre: mop_lb,
    urea_total_lb: urea_lb * area,
    dap_total_lb: dap_lb * area,
    mop_total_lb: mop_lb * area,
    n_delivered_lb_per_acre: n_delivered,
    p_delivered_lb_per_acre: p_delivered,
    k_delivered_lb_per_acre: k_delivered,
    area_acres: area,
    // v23 EN.18: bag count for the field, total blend tonnage, and a kg/ha
    // companion for the application rates (1 lb/acre = 1.12085 kg/ha).
    bag_weight_lb: (Number(bag_weight_lb) > 0 && Number.isFinite(Number(bag_weight_lb))) ? Number(bag_weight_lb) : 50,
    urea_bags: _npkBags(urea_lb * area, bag_weight_lb),
    dap_bags: _npkBags(dap_lb * area, bag_weight_lb),
    mop_bags: _npkBags(mop_lb * area, bag_weight_lb),
    total_blend_tons: ((urea_lb + dap_lb + mop_lb) * area) / 2000,
    rec_n_kg_per_ha: rec_n * 1.12085,
    rec_p_kg_per_ha: rec_p * 1.12085,
    rec_k_kg_per_ha: rec_k * 1.12085,
    warnings,
  };
}

function _npkBags(totalLb, bagLb) {
  const bw = (Number(bagLb) > 0 && Number.isFinite(Number(bagLb))) ? Number(bagLb) : 50;
  const t = Number(totalLb);
  if (!Number.isFinite(t) || t <= 0) return 0;
  return Math.ceil(t / bw);
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

export const npkBlendExample = {
  // Corn (demand 150-60-40 lb/acre N-P2O5-K2O), soil-test credit
  // 20 N / 10 P / 15 K lb/acre, 80 acres, default straights.
  // rec = 130 N / 50 P / 25 K. DAP = 50/0.46 = 108.7 lb/acre, carrying
  // 19.57 lb N/acre; urea = (130-19.57)/0.46 = 240.1 lb/acre; potash =
  // 25/0.60 = 41.67 lb/acre.
  inputs: { crop: "corn", soil_n_lb_per_acre: 20, soil_p_lb_per_acre: 10, soil_k_lb_per_acre: 15, area_acres: 80 },
};

function renderNpkBlend(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per USDA NRCS Agronomy Technical Note ranges and the state Cooperative Extension Service published recommendations (state-keyed). Recommendation = max(0, crop demand - soil-test credit); the blend is solved from three straights (potash 0-0-60 for K, DAP 18-46-0 for P, urea 46-0-0 for the N balance). Your certified soil-test lab report and state Extension recommendation govern. Free at nrcs.usda.gov.";
  const crop = makeSelect("Crop", "npk-crop", Object.keys(CROP_NUTRIENT_DEMAND).map((k) => ({ value: k, label: cap(k) + " (" + CROP_NUTRIENT_DEMAND[k].n + "-" + CROP_NUTRIENT_DEMAND[k].p + "-" + CROP_NUTRIENT_DEMAND[k].k + ")", selected: k === "corn" })));
  const soilN = makeNumber("Soil-test N credit (lb/acre)", "npk-sn", { step: "any", min: "0", value: "20" });
  const soilP = makeNumber("Soil-test P2O5 credit (lb/acre)", "npk-sp", { step: "any", min: "0", value: "10" });
  const soilK = makeNumber("Soil-test K2O credit (lb/acre)", "npk-sk", { step: "any", min: "0", value: "15" });
  const area = makeNumber("Field area (acres)", "npk-area", { step: "any", min: "0", value: "80" });
  for (const f of [crop, soilN, soilP, soilK, area]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    crop.select.value = "corn"; soilN.input.value = "20"; soilP.input.value = "10";
    soilK.input.value = "15"; area.input.value = "80"; update();
  });

  // v23 EN.18: bag weight for the bag-count output.
  const bag = makeNumber("Bag weight (lb)", "npk-bag", { step: "any", min: "0", value: "50" });
  inputRegion.appendChild(bag.wrap);
  const oRec = makeOutputLine(outputRegion, "Nutrient recommendation", "npk-out-rec");
  const oRate = makeOutputLine(outputRegion, "Blend (lb/acre)", "npk-out-rate");
  const oKg = makeOutputLine(outputRegion, "Recommendation (kg/ha)", "npk-out-kg");
  const oTotal = makeOutputLine(outputRegion, "Total product", "npk-out-total");
  const oBags = makeOutputLine(outputRegion, "Bags / tonnage for the field", "npk-out-bags");
  const oNote = makeOutputLine(outputRegion, "Notes", "npk-out-note");

  function readNum(input) { if (input.value === "") return null; const n = Number(input.value); return Number.isFinite(n) ? n : null; }
  const update = debounce(() => {
    const r = computeNpkBlend({
      crop: crop.select.value,
      soil_n_lb_per_acre: readNum(soilN.input),
      soil_p_lb_per_acre: readNum(soilP.input),
      soil_k_lb_per_acre: readNum(soilK.input),
      area_acres: readNum(area.input),
      bag_weight_lb: readNum(bag.input) || 50,
    });
    if (r.error) { oRec.textContent = r.error; oRate.textContent = "-"; oKg.textContent = "-"; oTotal.textContent = "-"; oBags.textContent = "-"; oNote.textContent = ""; return; }
    oRec.textContent = fmt(r.rec_n_lb_per_acre, 0) + " N / " + fmt(r.rec_p_lb_per_acre, 0) + " P2O5 / " + fmt(r.rec_k_lb_per_acre, 0) + " K2O lb/acre still needed";
    oRate.textContent = "Urea " + fmt(r.urea_lb_per_acre, 1) + " + DAP " + fmt(r.dap_lb_per_acre, 1) + " + Potash " + fmt(r.mop_lb_per_acre, 1) + " lb/acre";
    oKg.textContent = fmt(r.rec_n_kg_per_ha, 0) + " N / " + fmt(r.rec_p_kg_per_ha, 0) + " P2O5 / " + fmt(r.rec_k_kg_per_ha, 0) + " K2O kg/ha";
    oTotal.textContent = "Urea " + fmt(r.urea_total_lb, 0) + " + DAP " + fmt(r.dap_total_lb, 0) + " + Potash " + fmt(r.mop_total_lb, 0) + " lb over " + fmt(r.area_acres, 0) + " acres";
    oBags.textContent = r.urea_bags + " urea + " + r.dap_bags + " DAP + " + r.mop_bags + " potash bags (" + fmt(r.bag_weight_lb, 0) + " lb each); " + fmt(r.total_blend_tons, 2) + " tons total";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Blend delivers " + fmt(r.n_delivered_lb_per_acre, 0) + " N / " + fmt(r.p_delivered_lb_per_acre, 0) + " P2O5 / " + fmt(r.k_delivered_lb_per_acre, 0) + " K2O lb/acre. Apply per your certified soil-test recommendation.";
  }, DEBOUNCE_MS);
  for (const el of [soilN.input, soilP.input, soilK.input, area.input, bag.input]) el.addEventListener("input", update);
  crop.select.addEventListener("change", update);
}

// --- spec-v17 L.5 Pesticide tank-mix and acres-per-tank -------------

// Liquid product units expressed in fluid ounces; dry product units in
// ounces (avoirdupois). The nozzle-output calibration (GPA from nozzle
// GPM, spacing and speed) is the separate `gpa-rate` tile; this tile is
// the tank-loading accounting (acres per tank, product per tank, tanks
// and totals for a field) the calibration tile does not cover.
const FL_OZ_PER = { fl_oz: 1, pt: 16, qt: 32, gal: 128 };
const DRY_OZ_PER = { oz: 1, lb: 16 };
const ML_PER_FL_OZ = 29.5735;
const G_PER_OZ = 28.3495;

// dims: in { args: dimensionless } out: { acres_per_tank: L^2, product_per_tank_unit: dimensionless, tanks_needed: dimensionless, total_carrier_water_gal: L^3 }
export function computeTankMix({
  tank_gal = 0,
  spray_volume_gpa = 0,
  product_rate_per_acre = 0,
  product_unit = "fl_oz",
  field_area_acres = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const tank = Number(tank_gal);
  const gpa = Number(spray_volume_gpa);
  const rate = Number(product_rate_per_acre);
  const isLiquid = Object.prototype.hasOwnProperty.call(FL_OZ_PER, product_unit);
  const isDry = Object.prototype.hasOwnProperty.call(DRY_OZ_PER, product_unit);
  if (!isLiquid && !isDry) return { error: "Unknown product unit '" + product_unit + "'." };
  if (!(tank > 0)) return { error: "Enter a positive tank capacity (gal)." };
  if (!(gpa > 0)) return { error: "Enter a positive spray volume (GPA)." };
  if (!(rate > 0)) return { error: "Enter a positive product rate per acre." };
  const area = Math.max(0, Number(field_area_acres) || 0);

  const acres_per_tank = tank / gpa;
  const product_per_tank_unit = acres_per_tank * rate; // in the entered unit

  // Canonical conversions for readability.
  let liquid = null, dry = null;
  if (isLiquid) {
    const fl_oz = product_per_tank_unit * FL_OZ_PER[product_unit];
    liquid = { fl_oz, gal: fl_oz / 128, ml: fl_oz * ML_PER_FL_OZ };
  } else {
    const oz = product_per_tank_unit * DRY_OZ_PER[product_unit];
    dry = { oz, lb: oz / 16, g: oz * G_PER_OZ };
  }

  const warnings = [];
  if (gpa < 5 || gpa > 30) warnings.push("Spray volume " + gpa + " GPA is outside the typical 5-30 GPA boom-spray band; verify the label's carrier-volume range.");

  const out = {
    tank_gal: tank,
    spray_volume_gpa: gpa,
    product_rate_per_acre: rate,
    product_unit,
    acres_per_tank,
    product_per_tank_unit,
    liquid,
    dry,
    warnings,
  };

  if (area > 0) {
    out.field_area_acres = area;
    out.tanks_needed = Math.ceil(area / acres_per_tank);
    out.total_product_unit = area * rate;
    out.total_carrier_water_gal = area * gpa;
    if (isLiquid) {
      const tfl = out.total_product_unit * FL_OZ_PER[product_unit];
      out.total_liquid = { fl_oz: tfl, gal: tfl / 128, ml: tfl * ML_PER_FL_OZ };
    } else {
      const toz = out.total_product_unit * DRY_OZ_PER[product_unit];
      out.total_dry = { oz: toz, lb: toz / 16, g: toz * G_PER_OZ };
    }
  }
  return out;
}

export const tankMixExample = {
  // 300 gal tank, 15 GPA carrier, 1.5 pt/acre product, 80-acre field.
  // acres/tank = 300/15 = 20; product/tank = 20*1.5 = 30 pt = 3.75 gal;
  // tanks = ceil(80/20) = 4; total product = 120 pt = 15 gal; water = 1,200 gal.
  inputs: { tank_gal: 300, spray_volume_gpa: 15, product_rate_per_acre: 1.5, product_unit: "pt", field_area_acres: 80 },
};

function renderTankMix(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: The EPA pesticide label is the law (FIFRA); follow its rate, carrier volume, REI, and PPE. Tank-mix math first-principles: acres/tank = tank gal / GPA; product/tank = acres/tank x rate. NRCS Agronomy Technical Note 5 for spray calibration. The separate nozzle-output (GPA) calibration is the Chemical Application Rate (GPA) tile. Free at epa.gov/pesticide-labels.";
  const tank = makeNumber("Tank capacity (gal)", "tm-tank", { step: "any", min: "0", value: "300" });
  const gpa = makeNumber("Spray volume (GPA)", "tm-gpa", { step: "any", min: "0", value: "15" });
  const rate = makeNumber("Product rate per acre", "tm-rate", { step: "any", min: "0", value: "1.5" });
  const unit = makeSelect("Product unit", "tm-unit", [
    { value: "fl_oz", label: "fluid ounces (liquid)" },
    { value: "pt", label: "pints (liquid)", selected: true },
    { value: "qt", label: "quarts (liquid)" },
    { value: "gal", label: "gallons (liquid)" },
    { value: "oz", label: "ounces (dry)" },
    { value: "lb", label: "pounds (dry)" },
  ]);
  const area = makeNumber("Field area (acres; optional)", "tm-area", { step: "any", min: "0", value: "80" });
  for (const f of [tank, gpa, rate, unit, area]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    tank.input.value = "300"; gpa.input.value = "15"; rate.input.value = "1.5";
    unit.select.value = "pt"; area.input.value = "80"; update();
  });

  const oAcres = makeOutputLine(outputRegion, "Acres per tank", "tm-out-acres");
  const oProduct = makeOutputLine(outputRegion, "Product per tank", "tm-out-product");
  const oField = makeOutputLine(outputRegion, "Field totals", "tm-out-field");
  const oNote = makeOutputLine(outputRegion, "Notes", "tm-out-note");

  function readNum(input) { if (input.value === "") return null; const n = Number(input.value); return Number.isFinite(n) ? n : null; }
  function unitLabel(u) { return u === "fl_oz" ? "fl oz" : u; }
  const update = debounce(() => {
    const r = computeTankMix({
      tank_gal: readNum(tank.input),
      spray_volume_gpa: readNum(gpa.input),
      product_rate_per_acre: readNum(rate.input),
      product_unit: unit.select.value,
      field_area_acres: readNum(area.input),
    });
    if (r.error) { oAcres.textContent = r.error; oProduct.textContent = "-"; oField.textContent = "-"; oNote.textContent = ""; return; }
    oAcres.textContent = fmt(r.acres_per_tank, 2) + " acres (" + fmt(r.tank_gal, 0) + " gal / " + fmt(r.spray_volume_gpa, 0) + " GPA)";
    if (r.liquid) {
      oProduct.textContent = fmt(r.product_per_tank_unit, 2) + " " + unitLabel(r.product_unit) + " = " + fmt(r.liquid.gal, 2) + " gal (" + fmt(r.liquid.ml, 0) + " mL)";
    } else {
      oProduct.textContent = fmt(r.product_per_tank_unit, 2) + " " + unitLabel(r.product_unit) + " = " + fmt(r.dry.lb, 2) + " lb (" + fmt(r.dry.g, 0) + " g)";
    }
    if (r.tanks_needed !== undefined) {
      const total = r.total_liquid ? fmt(r.total_liquid.gal, 2) + " gal" : fmt(r.total_dry.lb, 2) + " lb";
      oField.textContent = r.tanks_needed + " tank(s) for " + fmt(r.field_area_acres, 0) + " acres; " + fmt(r.total_product_unit, 1) + " " + unitLabel(r.product_unit) + " (" + total + ") product; " + fmt(r.total_carrier_water_gal, 0) + " gal carrier water";
    } else {
      oField.textContent = "Enter a field area for tanks-needed and totals.";
    }
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "The EPA label is the law: follow its rate, REI, and PPE. Product volume displaces a negligible share of the carrier at label rates.";
  }, DEBOUNCE_MS);
  for (const el of [tank.input, gpa.input, rate.input, area.input]) el.addEventListener("input", update);
  unit.select.addEventListener("change", update);
}

export const AGRICULTURE_RENDERERS = {
  "gpa-rate":      renderGPA,
  "timber-cruise": renderTimberCruise,
  "seed-rate":     renderSeedRate,
  "drawbar-power": renderDrawbarPower,
  "irrigation-uniformity": renderUniformity,
  "bulk-density":  renderBulkDensity,
  "crop-yield":    renderCropYield,
  // v9
  "thi-livestock":       renderTHI,
  "sprayer-calibration": renderSprayerCalibration,
  // v17
  "irrigation-requirement": renderIrrigationRequirement,
  "cattle-stocking-rate":   renderStockingRate,
  "grain-bin-capacity":     renderGrainBin,
  "npk-blend":              renderNpkBlend,
  "tank-mix":               renderTankMix,
};

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
// v23 L.1: Pesticide REI / PHI clock (EPA WPS 40 CFR 170 + label PHI)
// =====================================================================
// The restricted-entry interval (hr) and pre-harvest interval (days) come
// from the product label (the label is the law). This clock reports the
// time remaining and a violation flag from the elapsed time since
// application. The label always governs over any default.
//
// dims: in { rei_hours: dimensionless, phi_days: dimensionless, hours_since_application: dimensionless, days_since_application: dimensionless } out: { rei_remaining_hours: dimensionless, phi_remaining_days: dimensionless, rei_clear: dimensionless, phi_clear: dimensionless, early_entry_violation: dimensionless, early_harvest_violation: dimensionless }
export function computePesticideReiPhi({ rei_hours = 0, phi_days = 0, hours_since_application = 0, days_since_application = 0 } = {}) {
  const rei = Number(rei_hours) || 0;
  const phi = Number(phi_days) || 0;
  let he = Number(hours_since_application); if (!Number.isFinite(he) || he < 0) he = 0;
  let de = Number(days_since_application); if (!Number.isFinite(de) || de < 0) de = 0;
  if (!(rei >= 0 && Number.isFinite(rei))) return { error: "REI hours must be zero or positive." };
  if (!(phi >= 0 && Number.isFinite(phi))) return { error: "PHI days must be zero or positive." };
  const rei_remaining_hours = Math.max(0, rei - he);
  const phi_remaining_days = Math.max(0, phi - de);
  const rei_clear = he >= rei;
  const phi_clear = de >= phi;
  return { rei_remaining_hours, phi_remaining_days, rei_clear, phi_clear, early_entry_violation: !rei_clear, early_harvest_violation: !phi_clear };
}
export const pesticideReiPhiExample = { inputs: { rei_hours: 12, phi_days: 7, hours_since_application: 4, days_since_application: 2 } };
const renderPesticideReiPhi = _v23SimpleRenderer({
  citation: "Citation: Per the EPA Worker Protection Standard 40 CFR 170 (restricted-entry interval) and the product label's pre-harvest interval - the label is the law (FIFRA). REI/PHI values are user-supplied from the label; the label always governs over any default. Free at epa.gov and ecfr.gov.",
  example: pesticideReiPhiExample.inputs,
  fields: [
    { key: "rei_hours", label: "Restricted-entry interval (hr, from label)", kind: "number" },
    { key: "phi_days", label: "Pre-harvest interval (days, from label)", kind: "number" },
    { key: "hours_since_application", label: "Hours since application", kind: "number" },
    { key: "days_since_application", label: "Days since application", kind: "number" },
  ],
  outputs: [
    { key: "rei", id: "rei-out-rei", label: "REI status", value: (r) => r.rei_clear ? "CLEAR - early-entry restriction lifted" : ("RESTRICTED - " + fmt(r.rei_remaining_hours, 1) + " hr remaining (early-entry violation)") },
    { key: "phi", id: "rei-out-phi", label: "PHI status", value: (r) => r.phi_clear ? "CLEAR - harvest permitted" : ("HOLD - " + fmt(r.phi_remaining_days, 1) + " days remaining (early-harvest violation)") },
  ],
  compute: computePesticideReiPhi,
});
AGRICULTURE_RENDERERS["pesticide-rei-phi"] = renderPesticideReiPhi;

// ===========================================================================
// spec-v20 Phase L - three new agriculture tiles (v18/v21 tile contract).
// ===========================================================================

// --- v20 L.1: Growing degree days (`growing-degree-days`) ---
// GDD = ((min(Tmax,cutoff) + Tmin_adj)/2) - base, floored at 0. Modified
// method caps Tmax at cutoff AND floors Tmin at base before averaging.
// dims: in { tmax_series: dimensionless, tmin_series: dimensionless, base_f: T, cutoff_f: T, method: dimensionless } out: { accumulated_gdd: dimensionless, days: dimensionless }
export function computeGrowingDegreeDays({ days_series = [], base_f = 50, cutoff_f = 0, method = "standard" } = {}) {
  const base = Number(base_f) || 0;
  const cutoff = Number(cutoff_f) || 0;
  if (!Array.isArray(days_series) || days_series.length === 0) return { error: "Enter at least one day of Tmax/Tmin." };
  if (!Number.isFinite(base)) return { error: "Base temperature must be finite (F)." };
  let accumulated = 0, counted = 0, flagged = 0;
  const daily = [];
  for (const d of days_series) {
    const tmax = Number(d && d.tmax);
    const tmin = Number(d && d.tmin);
    if (!Number.isFinite(tmax) || !Number.isFinite(tmin)) { flagged++; daily.push(null); continue; }
    if (tmin > tmax) { flagged++; daily.push(null); continue; }
    let tmaxAdj = cutoff > 0 ? Math.min(tmax, cutoff) : tmax;
    let tminAdj = tmin;
    if (method === "modified") {
      if (cutoff > 0) tmaxAdj = Math.min(tmax, cutoff);
      tminAdj = Math.max(tmin, base);
    }
    const avg = (tmaxAdj + tminAdj) / 2;
    const gdd = Math.max(0, avg - base);
    accumulated += gdd;
    counted++;
    daily.push(gdd);
  }
  return {
    accumulated_gdd: Number.isFinite(accumulated) ? accumulated : null,
    days: counted,
    flagged_days: flagged,
    daily,
    note: "GDD is floored at 0 (never subtracted). The modified method caps Tmax at the cutoff and floors Tmin at the base before averaging - it diverges from the standard method on hot days. Days with Tmin > Tmax are skipped.",
  };
}
export const growingDegreeDaysExample = { inputs: { days_series: [{ tmax: 92, tmin: 64 }], base_f: 50, cutoff_f: 86, method: "modified" } };

function renderGrowingDegreeDays(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the USDA / NWS growing-degree-day method and McMaster & Wilhelm (1997), 'Growing degree-days: one equation, two interpretations,' Agric. & Forest Meteorology 87, by name. Corn 50/86 F base/cutoff is the land-grant extension convention. Free at university extension sites.";
  const data = makeText("Daily Tmax/Tmin pairs (e.g. 92/64, 90/62)", "gdd-data", { value: "92/64" });
  data.input.value = "92/64";
  const base = makeNumber("Base temperature (F)", "gdd-base", { step: "any", value: "50" }); base.input.value = "50";
  const cutoff = makeNumber("Upper cutoff (F, 0 = none)", "gdd-cut", { step: "any", min: "0", value: "86" }); cutoff.input.value = "86";
  const method = makeSelect("Method", "gdd-method", [{ value: "standard", label: "Standard" }, { value: "modified", label: "Modified (cap/floor)", selected: true }]);
  for (const f of [data, base, cutoff, method]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { data.input.value = "92/64"; base.input.value = "50"; cutoff.input.value = "86"; method.select.value = "modified"; update(); });
  const oAcc = makeOutputLine(outputRegion, "Accumulated GDD", "gdd-out-acc");
  const oDays = makeOutputLine(outputRegion, "Days counted", "gdd-out-days");
  const oNote = makeOutputLine(outputRegion, "Note", "gdd-out-note");
  function parseSeries(s) {
    return String(s).split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean).map((p) => { const [a, b] = p.split("/"); return { tmax: Number(a), tmin: Number(b) }; });
  }
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeGrowingDegreeDays({ days_series: parseSeries(data.input.value), base_f: readNum(base.input), cutoff_f: readNum(cutoff.input), method: method.select.value });
    if (r.error) { oAcc.textContent = r.error; oDays.textContent = ""; oNote.textContent = ""; return; }
    oAcc.textContent = fmt(r.accumulated_gdd, 1) + " GDD";
    oDays.textContent = r.days + " day(s)" + (r.flagged_days ? " (" + r.flagged_days + " skipped)" : "");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [data.input, base.input, cutoff.input, method.select]) f.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["growing-degree-days"] = renderGrowingDegreeDays;

// --- v20 L.2: Pearson-square feed ration (`pearson-square-ration`) ---
// parts_a = |B - target|; parts_b = |A - target|; pct_a = parts_a/(parts_a+parts_b).
// dims: in { feed_a_pct: dimensionless, feed_b_pct: dimensionless, target_pct: dimensionless, batch_lb: M } out: { pct_a: dimensionless, pct_b: dimensionless }
export function computePearsonSquareRation({ feed_a_pct = 0, feed_b_pct = 0, target_pct = 0, batch_lb = 0 } = {}) {
  const A = Number(feed_a_pct), B = Number(feed_b_pct), T = Number(target_pct);
  let batch = Number(batch_lb) || 0;
  if (!Number.isFinite(batch) || batch < 0) batch = 0;
  if (!Number.isFinite(A) || !Number.isFinite(B) || !Number.isFinite(T)) return { error: "Nutrient percentages must be finite." };
  if (A === B) return { error: "Feed A and feed B nutrient percent are equal - blend is degenerate." };
  const lo = Math.min(A, B), hi = Math.max(A, B);
  if (!(T > lo && T < hi)) return { error: "Target must lie strictly between the two feed values - blend impossible otherwise." };
  const partsA = Math.abs(B - T);
  const partsB = Math.abs(A - T);
  const totalParts = partsA + partsB;
  const pctA = partsA / totalParts * 100;
  const pctB = partsB / totalParts * 100;
  const verify = (pctA / 100) * A + (pctB / 100) * B;
  return {
    parts_a: partsA, parts_b: partsB,
    pct_a: Number.isFinite(pctA) ? pctA : null,
    pct_b: Number.isFinite(pctB) ? pctB : null,
    lb_a: batch > 0 ? batch * pctA / 100 : null,
    lb_b: batch > 0 ? batch * pctB / 100 : null,
    verified_pct: Number.isFinite(verify) ? verify : null,
    note: "Single nutrient only - does not balance energy and protein simultaneously. The verified blend percent should equal the target.",
  };
}
export const pearsonSquareRationExample = { inputs: { feed_a_pct: 9, feed_b_pct: 44, target_pct: 16, batch_lb: 0 } };

function renderPearsonSquareRation(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Pearson square method - standard land-grant animal-science ration formulation (USDA / university extension; Ensminger 'Feeds & Nutrition'), by name. The square is public arithmetic. Single nutrient only. Free at university extension sites.";
  const a = makeNumber("Feed A nutrient %", "psr-a", { step: "any", value: "9" }); a.input.value = "9";
  const b = makeNumber("Feed B nutrient %", "psr-b", { step: "any", value: "44" }); b.input.value = "44";
  const target = makeNumber("Target %", "psr-t", { step: "any", value: "16" }); target.input.value = "16";
  const batch = makeNumber("Total batch (lb, optional)", "psr-batch", { step: "any", min: "0" });
  for (const f of [a, b, target, batch]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a.input.value = "9"; b.input.value = "44"; target.input.value = "16"; batch.input.value = ""; update(); });
  const oPct = makeOutputLine(outputRegion, "Percent A / B", "psr-out-pct");
  const oLb = makeOutputLine(outputRegion, "Pounds A / B", "psr-out-lb");
  const oNote = makeOutputLine(outputRegion, "Note", "psr-out-note");
  function readNum(i) { if (i.value === "") return NaN; const n = Number(i.value); return Number.isFinite(n) ? n : NaN; }
  const update = debounce(() => {
    const r = computePearsonSquareRation({ feed_a_pct: readNum(a.input), feed_b_pct: readNum(b.input), target_pct: readNum(target.input), batch_lb: batch.input.value === "" ? 0 : readNum(batch.input) });
    if (r.error) { oPct.textContent = r.error; oLb.textContent = ""; oNote.textContent = ""; return; }
    oPct.textContent = fmt(r.pct_a, 1) + "% A, " + fmt(r.pct_b, 1) + "% B";
    oLb.textContent = r.lb_a != null ? fmt(r.lb_a, 1) + " lb A, " + fmt(r.lb_b, 1) + " lb B" : "Enter a batch size for pounds.";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [a.input, b.input, target.input, batch.input]) f.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["pearson-square-ration"] = renderPearsonSquareRation;

// --- v20 L.3: Livestock water requirement (`livestock-water-requirement`) ---
// Table method: interpolate per-head gallons between two user-supplied
// temperature breakpoints. Intake-ratio method: gal = DMI * ratio / 8.345.
// dims: in { method: dimensionless, head: dimensionless, temp_f: T, t_low_f: T, gal_low: L^3, t_high_f: T, gal_high: L^3, dmi_lb: M, water_per_dmi: dimensionless, lactating: dimensionless } out: { per_head_gpd: L^3, herd_gpd: L^3 }
export function computeLivestockWaterRequirement({ method = "table", head = 1, temp_f = 0, t_low_f = 0, gal_low = 0, t_high_f = 0, gal_high = 0, dmi_lb = 0, water_per_dmi = 3.5, lactating = false } = {}) {
  const n = Math.round(Number(head) || 0);
  if (!(n >= 1)) return { error: "Head count must be at least 1." };
  let perHead = 0;
  if (method === "intake") {
    const dmi = Number(dmi_lb) || 0;
    const ratio = Number(water_per_dmi) || 0;
    if (!(dmi > 0 && Number.isFinite(dmi))) return { error: "Dry-matter intake must be positive (lb)." };
    if (!(ratio > 0 && Number.isFinite(ratio))) return { error: "Water-per-DMI ratio must be positive." };
    perHead = dmi * ratio / 8.345; // lb water / (lb/gal) = gal
    var outRange = false;
  } else {
    const t = Number(temp_f), tl = Number(t_low_f), th = Number(t_high_f), gl = Number(gal_low), gh = Number(gal_high);
    if (![t, tl, th, gl, gh].every(Number.isFinite)) return { error: "Temperature and gallon breakpoints must be finite." };
    if (th <= tl) return { error: "High-temperature breakpoint must exceed the low breakpoint." };
    perHead = gl + (gh - gl) * (t - tl) / (th - tl);
    var outRange = t < tl || t > th;
  }
  if (lactating) perHead *= 2;
  const herd = perHead * n;
  return {
    per_head_gpd: Number.isFinite(perHead) ? perHead : null,
    herd_gpd: Number.isFinite(herd) ? herd : null,
    out_of_range: outRange,
    note: (outRange ? "Air temperature is outside the entered breakpoints - extrapolated, flagged. " : "")
      + (lactating ? "Lactation roughly doubles demand (applied). " : "")
      + "Per-class gallon breakpoints are user-supplied (NRC / NRCS table values, not bundled). The intake-ratio thumb rule is approximate vs. the table method.",
  };
}
export const livestockWaterRequirementExample = { inputs: { method: "table", head: 50, temp_f: 80, t_low_f: 40, gal_low: 8, t_high_f: 90, gal_high: 20, lactating: false } };

function renderLivestockWaterRequirement(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per NRC Nutrient Requirements of Beef Cattle / Dairy Cattle water-intake guidance and the USDA NRCS National Range and Pasture Handbook water section, by name; per-class gallon breakpoints user-supplied (table values, not reproduced). Distinct from thi-livestock. Free NRCS guidance at nrcs.usda.gov.";
  const method = makeSelect("Method", "lwr-method", [{ value: "table", label: "Temperature table (interpolate)", selected: true }, { value: "intake", label: "Intake ratio (water per DMI)" }]);
  const head = makeNumber("Head count", "lwr-head", { step: "1", min: "1", value: "50" }); head.input.value = "50";
  const temp = makeNumber("Air temperature (F)", "lwr-temp", { step: "any", value: "80" }); temp.input.value = "80";
  const tl = makeNumber("Low breakpoint temp (F)", "lwr-tl", { step: "any", value: "40" }); tl.input.value = "40";
  const gl = makeNumber("Gallons/head at low temp", "lwr-gl", { step: "any", min: "0", value: "8" }); gl.input.value = "8";
  const th = makeNumber("High breakpoint temp (F)", "lwr-th", { step: "any", value: "90" }); th.input.value = "90";
  const gh = makeNumber("Gallons/head at high temp", "lwr-gh", { step: "any", min: "0", value: "20" }); gh.input.value = "20";
  const dmi = makeNumber("Dry-matter intake (lb, intake method)", "lwr-dmi", { step: "any", min: "0" });
  const ratio = makeNumber("Water per lb DMI (gal-lb basis)", "lwr-ratio", { step: "any", min: "0", value: "3.5" }); ratio.input.value = "3.5";
  const lact = makeCheckbox("Lactating (doubles demand)", "lwr-lact");
  for (const f of [method, head, temp, tl, gl, th, gh, dmi, ratio, lact]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { method.select.value = "table"; head.input.value = "50"; temp.input.value = "80"; tl.input.value = "40"; gl.input.value = "8"; th.input.value = "90"; gh.input.value = "20"; lact.input.checked = false; update(); });
  const oPer = makeOutputLine(outputRegion, "Gallons per head per day", "lwr-out-per");
  const oHerd = makeOutputLine(outputRegion, "Total herd gallons per day", "lwr-out-herd");
  const oNote = makeOutputLine(outputRegion, "Note", "lwr-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeLivestockWaterRequirement({ method: method.select.value, head: readNum(head.input), temp_f: readNum(temp.input), t_low_f: readNum(tl.input), gal_low: readNum(gl.input), t_high_f: readNum(th.input), gal_high: readNum(gh.input), dmi_lb: readNum(dmi.input), water_per_dmi: ratio.input.value === "" ? 3.5 : readNum(ratio.input), lactating: lact.input.checked });
    if (r.error) { oPer.textContent = r.error; oHerd.textContent = ""; oNote.textContent = ""; return; }
    oPer.textContent = fmt(r.per_head_gpd, 1) + " gal/head/day";
    oHerd.textContent = fmt(r.herd_gpd, 0) + " gal/day";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [method.select, head.input, temp.input, tl.input, gl.input, th.input, gh.input, dmi.input, ratio.input, lact.input]) f.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["livestock-water-requirement"] = renderLivestockWaterRequirement;

// --- v35 L: Two-stroke fuel/oil mix (`two-stroke-mix`) ---
// oil volume = fuel volume / ratio (gas:oil by volume); 1 US gal = 128 fl oz.
// dims: in { ratio: dimensionless, fuel_amount: L^3, fuel_unit: dimensionless } out: { oil_oz: L^3, oil_ml: L^3, oz_per_gallon: dimensionless }
export function computeTwoStrokeMix({ ratio = 50, fuel_amount = 0, fuel_unit = "gallon" } = {}) {
  const _g = _finiteGuard({ ratio, fuel_amount }); if (_g) return _g;
  const r = Number(ratio);
  const amt = Number(fuel_amount);
  if (!(r > 0)) return { error: "Mix ratio must be positive (the X in X:1)." };
  if (!(amt >= 0)) return { error: "Fuel amount must be zero or positive." };
  const unit = String(fuel_unit) === "liter" ? "liter" : "gallon";
  const ML_PER_OZ = 29.5735295625;
  const OZ_PER_GAL = 128;
  let oil_oz, oil_ml;
  if (unit === "liter") {
    oil_ml = (amt / r) * 1000;
    oil_oz = oil_ml / ML_PER_OZ;
  } else {
    oil_oz = (amt / r) * OZ_PER_GAL;
    oil_ml = oil_oz * ML_PER_OZ;
  }
  const oz_per_gallon = OZ_PER_GAL / r;
  const ml_per_liter = 1000 / r;
  const notes = [];
  notes.push("Oil volume = fuel volume / ratio (the ratio is gas:oil by volume). This mix is " + fmt(oz_per_gallon, 2) + " oz per gallon (" + fmt(ml_per_liter, 1) + " mL per liter).");
  notes.push("Use the oil grade and ratio the equipment maker specifies; modern air-cooled two-strokes are commonly 50:1 with a JASO/ISO oil. The equipment manual governs.");
  return { ratio: r, fuel_amount: amt, fuel_unit: unit, oil_oz, oil_ml, oz_per_gallon, ml_per_liter, notes };
}
export const twoStrokeMixExample = { inputs: { ratio: 50, fuel_amount: 1, fuel_unit: "gallon" } };

function renderTwoStrokeMix(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Two-stroke fuel/oil mix - oil volume = fuel volume / ratio (gas:oil by volume); 1 US gallon = 128 fl oz, 1 fl oz = 29.5735 mL - first-principles volume arithmetic, public. Use the oil grade and ratio the equipment maker specifies; the equipment manual governs.";
  const ratio = makeNumber("Mix ratio (X in X:1)", "tsm-ratio", { step: "any", min: "0", value: "50" }); ratio.input.value = "50";
  const amt = makeNumber("Fuel amount", "tsm-amt", { step: "any", min: "0", value: "1" }); amt.input.value = "1";
  const unit = makeSelect("Fuel unit", "tsm-unit", [
    { value: "gallon", label: "US gallons", selected: true }, { value: "liter", label: "liters" },
  ]);
  for (const f of [ratio, amt, unit]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ratio.input.value = "50"; amt.input.value = "1"; unit.select.value = "gallon"; update(); });
  const oOil = makeOutputLine(outputRegion, "Oil to add", "tsm-out-oil");
  const oDose = makeOutputLine(outputRegion, "Dose", "tsm-out-dose");
  const oNote = makeOutputLine(outputRegion, "Notes", "tsm-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeTwoStrokeMix({ ratio: readNum(ratio.input), fuel_amount: readNum(amt.input), fuel_unit: unit.select.value });
    if (r.error) { oOil.textContent = r.error; oDose.textContent = "-"; oNote.textContent = ""; return; }
    oOil.textContent = fmt(r.oil_oz, 2) + " fl oz (" + fmt(r.oil_ml, 1) + " mL) for " + fmt(r.fuel_amount, 2) + " " + (r.fuel_unit === "liter" ? "L" : "gal");
    oDose.textContent = fmt(r.oz_per_gallon, 2) + " oz/gal (" + fmt(r.ml_per_liter, 1) + " mL/L) at " + fmt(r.ratio, 0) + ":1";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [ratio.input, amt.input]) f.addEventListener("input", update);
  unit.select.addEventListener("change", update);
}
AGRICULTURE_RENDERERS["two-stroke-mix"] = renderTwoStrokeMix;

// --- spec-v84 sprayer nozzle / drift / field-capacity bench (3 tiles, Group L) ---
// gpa-rate takes the nozzle flow as an input; these three derive that flow from
// the tip's rated flow and the operating pressure (the square-root law), size the
// downwind drift buffer a drift-sensitive job needs, and give the field time and
// tank count. Sources named, not reproduced: the nozzle-flow square-root relation,
// USDA / land-grant extension sprayer-calibration and drift-management guidance,
// and the EPA pesticide label / Worker Protection Standard (40 CFR 170).

// Representative base drift buffers (ft) by droplet class at the 10 mph / 20 in
// reference; editable planning values, NOT the label's mandatory buffer.
const _v84_DROPLET_BASE = { very_coarse: 5, coarse: 10, medium: 20, fine: 40 };

// dims: in { rated_gpm: L^3, rated_psi: dimensionless, new_psi: dimensionless, target_gpm: dimensionless } out: { new_gpm: L^3, req_psi: dimensionless }
export function computeNozzleFlowPressure({ rated_gpm, rated_psi, new_psi, target_gpm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ratedGpm = Number(rated_gpm);
  const ratedPsi = Number(rated_psi);
  const newPsi = Number(new_psi);
  const targetGpm = Number(target_gpm) || 0;
  if (!(ratedGpm > 0)) return { error: "Rated flow must be positive (gpm)." };
  if (!(ratedPsi > 0)) return { error: "Rated pressure must be positive (psi)." };
  if (!(newPsi > 0)) return { error: "Operating pressure must be positive (psi)." };
  const newGpm = ratedGpm * Math.sqrt(newPsi / ratedPsi);
  const reqPsi = targetGpm > 0 ? ratedPsi * Math.pow(targetGpm / ratedGpm, 2) : null;
  return {
    new_gpm: newGpm,
    req_psi: reqPsi,
    req_psi_in_band: reqPsi === null ? true : (reqPsi >= 15 && reqPsi <= 60),
    note: "Pressure changes flow only by its square root, so it is a fine-tuning lever, not a rate knob -- to change the application rate, swap to a different tip size; raising pressure also shrinks the droplets and increases drift, so stay inside the tip's rated band (typically 15 to 60 psi for flat-fan); and the per-nozzle flow feeds gpa-rate and sprayer-calibration to close on a target GPA.",
  };
}

// dims: in { base_buffer_ft: L, wind_mph: dimensionless, boom_height_in: L, ref_height_in: L } out: { buffer_ft: L }
export function computeSprayDriftBuffer({ base_buffer_ft = 0, droplet_class = "medium", wind_mph, boom_height_in = 20, ref_height_in = 20 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const classBase = _v84_DROPLET_BASE[String(droplet_class)] || _v84_DROPLET_BASE.medium;
  const base = Number(base_buffer_ft) > 0 ? Number(base_buffer_ft) : classBase;
  const wind = Number(wind_mph);
  const boom = Number(boom_height_in);
  const ref = Number(ref_height_in);
  if (!(base > 0)) return { error: "Base buffer must be positive (ft)." };
  if (!(wind > 0)) return { error: "Wind speed must be positive (mph)." };
  if (!(boom > 0)) return { error: "Release height must be positive (in)." };
  if (!(ref > 0)) return { error: "Reference height must be positive (in)." };
  const buffer = base * (wind / 10) * (boom / ref);
  return {
    buffer_ft: buffer,
    base_buffer_ft: base,
    note: "This is a RELATIVE planning estimate that grows with wind, release height, and finer droplets -- it is NOT the label's required buffer, which is the law (FIFRA); do not spray when the wind carries toward a sensitive area, during a temperature inversion, or above the label's maximum wind speed; and coarser droplets and a lower boom cut drift far more than any buffer can recover.",
  };
}

// dims: in { boom_width_ft: L, speed_mph: dimensionless, field_efficiency_pct: dimensionless, field_acres: dimensionless, tank_gal: L^3, gpa: dimensionless } out: { theoretical_ac_hr: dimensionless, effective_ac_hr: dimensionless, spray_time_hr: dimensionless, acres_per_tank: dimensionless, tanks_needed: dimensionless }
export function computeSprayerFieldCapacity({ boom_width_ft, speed_mph, field_efficiency_pct = 70, field_acres, tank_gal, gpa } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const boom = Number(boom_width_ft);
  const speed = Number(speed_mph);
  const eff = Number(field_efficiency_pct);
  const acres = Number(field_acres);
  const tank = Number(tank_gal);
  const gpaVal = Number(gpa);
  if (!(boom > 0)) return { error: "Boom width must be positive (ft)." };
  if (!(speed > 0)) return { error: "Ground speed must be positive (mph)." };
  if (!(eff > 0)) return { error: "Field efficiency must be positive (%)." };
  if (!(acres > 0)) return { error: "Field area must be positive (acres)." };
  if (!(tank > 0)) return { error: "Tank capacity must be positive (gal)." };
  if (!(gpaVal > 0)) return { error: "GPA must be positive." };
  const theoretical = (boom * speed) / 8.25;
  const effective = theoretical * (eff / 100);
  const sprayTime = acres / effective;
  const acresPerTank = tank / gpaVal;
  const tanksNeeded = Math.ceil(acres / acresPerTank);
  return {
    theoretical_ac_hr: theoretical,
    effective_ac_hr: effective,
    spray_time_hr: sprayTime,
    acres_per_tank: acresPerTank,
    tanks_needed: tanksNeeded,
    note: "Theoretical capacity assumes no overlap, turns, or refills, and the field efficiency (typically 60 to 80% for boom spraying) captures all of that loss; speed and pressure are linked, so changing speed changes the GPA unless you re-calibrate (gpa-rate, nozzle-flow-pressure); and the tank count pairs with tank-mix for the product to load per tank.",
  };
}

function _v84renderNozzleFlowPressure(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: nozzle-flow square-root relation Q proportional to sqrt(pressure) (standard spray-nozzle hydraulics), by name, and USDA / land-grant extension sprayer-calibration guidance. The product label is the law (FIFRA); your state lead agency governs. Pressure is a fine-tuning lever; change tips to change the rate.";
  const ratedGpm = makeNumber("Tip rated flow (gpm)", "nfp-rg", { step: "any", min: "0" });
  const ratedPsi = makeNumber("Rated pressure (psi)", "nfp-rp", { step: "any", min: "0" });
  const newPsi = makeNumber("Operating pressure (psi)", "nfp-np", { step: "any", min: "0" });
  const target = makeNumber("Target flow (gpm, optional)", "nfp-tg", { step: "any", min: "0", value: "0" });
  target.input.value = "0";
  for (const f of [ratedGpm, ratedPsi, newPsi, target]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ratedGpm.input.value = "0.4"; ratedPsi.input.value = "40"; newPsi.input.value = "60"; target.input.value = "0"; update(); });
  const oFlow = makeOutputLine(outputRegion, "Flow at operating pressure", "nfp-out-flow");
  const oReq = makeOutputLine(outputRegion, "Pressure for target flow", "nfp-out-req");
  const update = debounce(() => {
    const r = computeNozzleFlowPressure({
      rated_gpm: Number(ratedGpm.input.value) || 0,
      rated_psi: Number(ratedPsi.input.value) || 0,
      new_psi: Number(newPsi.input.value) || 0,
      target_gpm: target.input.value === "" ? 0 : Number(target.input.value),
    });
    if (r.error) { oFlow.textContent = r.error; oReq.textContent = "-"; return; }
    oFlow.textContent = fmt(r.new_gpm, 3) + " gpm";
    oReq.textContent = r.req_psi === null ? "n/a (enter a target flow)" : fmt(r.req_psi, 1) + " psi" + (r.req_psi_in_band ? "" : " (outside 15-60 psi -- change tips instead)");
  }, DEBOUNCE_MS);
  for (const f of [ratedGpm, ratedPsi, newPsi, target]) f.input.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["nozzle-flow-pressure"] = _v84renderNozzleFlowPressure;

function _v84renderSprayDriftBuffer(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: USDA / land-grant extension drift-management guidance and the EPA pesticide label / Worker Protection Standard (40 CFR 170), by name. The product label is the law (FIFRA); the label's mandatory buffer and wind limits govern. This is a relative planning aid, not the required buffer.";
  const droplet = makeSelect("Droplet class", "sdb-dc", [
    { value: "very_coarse", label: "Very Coarse (base 5 ft)" },
    { value: "coarse", label: "Coarse (base 10 ft)" },
    { value: "medium", label: "Medium (base 20 ft)" },
    { value: "fine", label: "Fine (base 40 ft)" },
  ]);
  droplet.select.value = "medium";
  const base = makeNumber("Base buffer override (ft, 0 = use class)", "sdb-base", { step: "any", min: "0", value: "0" });
  base.input.value = "0";
  const wind = makeNumber("Wind speed (mph)", "sdb-wind", { step: "any", min: "0" });
  const boom = makeNumber("Release height (in)", "sdb-boom", { step: "any", min: "0", value: "20" });
  boom.input.value = "20";
  const ref = makeNumber("Reference height (in)", "sdb-ref", { step: "any", min: "0", value: "20" });
  ref.input.value = "20";
  for (const f of [droplet, base, wind, boom, ref]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { droplet.select.value = "medium"; base.input.value = "0"; wind.input.value = "15"; boom.input.value = "30"; ref.input.value = "20"; update(); });
  const oBuf = makeOutputLine(outputRegion, "Recommended downwind buffer", "sdb-out-buf");
  const update = debounce(() => {
    const r = computeSprayDriftBuffer({
      base_buffer_ft: base.input.value === "" ? 0 : Number(base.input.value),
      droplet_class: droplet.select.value,
      wind_mph: Number(wind.input.value) || 0,
      boom_height_in: boom.input.value === "" ? 20 : Number(boom.input.value),
      ref_height_in: ref.input.value === "" ? 20 : Number(ref.input.value),
    });
    if (r.error) { oBuf.textContent = r.error; return; }
    oBuf.textContent = fmt(r.buffer_ft, 1) + " ft (planning aid -- the label buffer is the law)";
  }, DEBOUNCE_MS);
  droplet.select.addEventListener("input", update);
  for (const f of [base, wind, boom, ref]) f.input.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["spray-drift-buffer"] = _v84renderSprayDriftBuffer;

function _v84renderSprayerFieldCapacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: USDA / land-grant extension sprayer field-efficiency guidance, by name. Theoretical acres/hr = boom width x speed / 8.25; effective applies the field efficiency. The product label is the law (FIFRA); your state lead agency governs.";
  const boom = makeNumber("Boom / swath width (ft)", "sfc-boom", { step: "any", min: "0" });
  const speed = makeNumber("Ground speed (mph)", "sfc-speed", { step: "any", min: "0" });
  const eff = makeNumber("Field efficiency (%)", "sfc-eff", { step: "any", min: "0", value: "70" });
  eff.input.value = "70";
  const acres = makeNumber("Field size (acres)", "sfc-ac", { step: "any", min: "0" });
  const tank = makeNumber("Tank capacity (gal)", "sfc-tank", { step: "any", min: "0" });
  const gpa = makeNumber("Spray volume (GPA)", "sfc-gpa", { step: "any", min: "0" });
  for (const f of [boom, speed, eff, acres, tank, gpa]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { boom.input.value = "30"; speed.input.value = "6"; eff.input.value = "70"; acres.input.value = "80"; tank.input.value = "300"; gpa.input.value = "15"; update(); });
  const oTheo = makeOutputLine(outputRegion, "Theoretical capacity", "sfc-out-theo");
  const oEff = makeOutputLine(outputRegion, "Effective capacity", "sfc-out-eff");
  const oTime = makeOutputLine(outputRegion, "Spray time for the field", "sfc-out-time");
  const oTanks = makeOutputLine(outputRegion, "Tank loads needed", "sfc-out-tanks");
  const update = debounce(() => {
    const r = computeSprayerFieldCapacity({
      boom_width_ft: Number(boom.input.value) || 0,
      speed_mph: Number(speed.input.value) || 0,
      field_efficiency_pct: eff.input.value === "" ? 70 : Number(eff.input.value),
      field_acres: Number(acres.input.value) || 0,
      tank_gal: Number(tank.input.value) || 0,
      gpa: Number(gpa.input.value) || 0,
    });
    if (r.error) { oTheo.textContent = r.error; for (const o of [oEff, oTime, oTanks]) o.textContent = "-"; return; }
    oTheo.textContent = fmt(r.theoretical_ac_hr, 1) + " ac/hr";
    oEff.textContent = fmt(r.effective_ac_hr, 1) + " ac/hr";
    oTime.textContent = fmt(r.spray_time_hr, 1) + " hr";
    oTanks.textContent = r.tanks_needed + " tanks (" + fmt(r.acres_per_tank, 1) + " ac/tank)";
  }, DEBOUNCE_MS);
  for (const f of [boom, speed, eff, acres, tank, gpa]) f.input.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["sprayer-field-capacity"] = _v84renderSprayerFieldCapacity;
