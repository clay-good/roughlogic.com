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

// dims: in { power_hp: M L^2 T^-3, power_basis: dimensionless, speed_mph: L T^-1, surface: dimensionless } out: { pull_lb: M L T^-2, drawbar_hp: M L^2 T^-3 }
export function computeDrawbarPull({ power_hp = 0, power_basis = "drawbar", speed_mph = 0, surface = "firm_soil" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const power = Number(power_hp) || 0;
  const basis = String(power_basis);
  const speed = Number(speed_mph) || 0;
  if (!(power > 0)) return { error: "Power must be positive (hp)." };
  if (!(speed > 0)) return { error: "Speed must be positive (mph)." };
  if (basis !== "drawbar" && basis !== "pto") return { error: "Power basis must be drawbar or pto." };
  const eff = TRACTIVE_EFFICIENCY[surface];
  if (!Number.isFinite(eff)) return { error: "Unknown surface." };
  // Inverse of drawbar_hp = pull x speed / 375: pull = 375 x drawbar_hp / speed.
  // A PTO rating converts to drawbar first: drawbar_hp = pto_hp x tractive_efficiency.
  const drawbar_hp = basis === "pto" ? power * eff : power;
  const pull_lb = 375 * drawbar_hp / speed;
  if (!Number.isFinite(pull_lb) || !(pull_lb > 0)) return { error: "Drawbar-pull math is not a finite positive value." };
  return {
    pull_lb, drawbar_hp, tractive_efficiency: eff,
    note: "The drawbar pull a tractor can develop at a working speed for a given power, the inverse of the drawbar-power tile: from drawbar_hp = pull x speed / 375, pull = 375 x drawbar_hp / speed. A PTO rating is converted to drawbar first with the ASABE D497 tractive efficiency (drawbar_hp = pto_hp x efficiency; concrete 0.87, firm soil 0.72, tilled soil 0.55, sand 0.50), because a soft surface wastes engine power as slip. Pull rises as speed drops, which is why heavy tillage is pulled in a low gear. This is the steady-state drawbar pull the power supports; traction (weight x soil coefficient) can limit the usable pull below this, and the ballast, tires, and conditions govern the real number."
  };
}
export const drawbarPullExample = { inputs: { power_hp: 54, power_basis: "drawbar", speed_mph: 4.5, surface: "firm_soil" } };

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
      if (f.kind === "select") field = makeSelect(f.label, f.id || f.key, f.options);
      else field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any" });
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

const renderDrawbarPull = _r({
  citation: "Citation: ASABE D497 by name only. Drawbar pull = 375 x drawbar_hp / speed, from drawbar HP = (pull * speed) / 375. A PTO rating converts to drawbar with the tractive efficiency (drawbar_hp = pto_hp x efficiency).",
  example: drawbarPullExample.inputs,
  fields: [
    { key: "power_hp", label: "Power (hp)", kind: "number" },
    { key: "power_basis", label: "Power basis", kind: "select", options: [{ value: "drawbar", label: "Drawbar HP" }, { value: "pto", label: "PTO HP" }] },
    { key: "speed_mph", label: "Ground speed (mph)", kind: "number" },
    { key: "surface", label: "Surface", kind: "select", options: Object.keys(TRACTIVE_EFFICIENCY).map((k) => ({ value: k, label: k.replace(/_/g, " ") })) },
  ],
  outputs: [
    { key: "p", id: "dbp-out-p", label: "Drawbar pull", value: (r) => fmt(r.pull_lb, 0) + " lb" },
    { key: "d", id: "dbp-out-d", label: "Drawbar HP used", value: (r) => fmt(r.drawbar_hp, 1) + " hp (tractive eff " + fmt(r.tractive_efficiency, 2) + ")" },
    { key: "n", id: "dbp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDrawbarPull,
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

// dims: in { target_bushels: dimensionless, diameter_ft: L, peak_height_ft: L, packing_factor: dimensionless } out: { eave_height_ft: L }
export function computeGrainBinHeightForCapacity({ target_bushels = 0, diameter_ft = 0, peak_height_ft = 0, packing_factor = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const target = Number(target_bushels) || 0;
  const d = Number(diameter_ft) || 0;
  const peak = Number(peak_height_ft) || 0;
  const pack = Number(packing_factor) || 1.0;
  if (!(target > 0)) return { error: "Target capacity must be positive (bushels)." };
  if (!(d > 0)) return { error: "Bin diameter must be positive (ft)." };
  if (peak < 0) return { error: "Peak height cannot be negative." };
  if (!(pack > 0)) return { error: "Packing factor must be positive." };
  const area_ft2 = Math.PI * (d / 2) * (d / 2);
  const cone_ft3 = (1 / 3) * area_ft2 * peak;
  const target_ft3 = target / BUSHELS_PER_FT3;
  // Inverse of total_bushels = (area x eave + cone) x pack x 0.8036: eave = (target_ft3/pack - cone) / area.
  const eave_height_ft = (target_ft3 / pack - cone_ft3) / area_ft2;
  if (!Number.isFinite(eave_height_ft) || !(eave_height_ft > 0)) return { error: "The roof-cone capacity alone already meets the target at this diameter; no wall height is needed (lower the peak, narrow the bin, or raise the target)." };
  return {
    eave_height_ft, area_ft2, cone_bushels: cone_ft3 * pack * BUSHELS_PER_FT3,
    note: "The eave (wall) height a round bin needs to hold a target capacity, the inverse of the grain-bin-capacity tile: from bushels = (floor_area x eave + roof_cone) x packing x 0.8036, eave = (target_ft3/packing - cone_ft3) / floor_area, with 1 ft^3 = 0.8036 bushels. If a peaked (coned) fill is entered, its volume is credited first, so the wall is shorter. Capacity grows with the SQUARE of the diameter but only linearly with the wall, which is why a wider bin holds far more per foot of steel - doubling the diameter quarters the wall height for the same bushels. This is the geometric fill volume, not a structural or aeration check; the bin manufacturer's rated capacity and the wall/foundation design govern."
  };
}
export const grainBinHeightForCapacityExample = { inputs: { target_bushels: 12875, diameter_ft: 30, peak_height_ft: 8, packing_factor: 1.0 } };

function renderGrainBinHeightForCapacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: bin geometry solved for the wall height: eave = (target_ft3/packing - roof_cone_ft3) / floor_area, from bushels = (area x eave + cone) x packing x 0.8036 (1 bushel = 1.2445 ft^3). A geometric fill volume; the bin manufacturer's rated capacity and the structure govern.";
  const bu = makeNumber("Target capacity (bushels)", "gbh-bu", { step: "any", min: "0", value: "12875" });
  const d = makeNumber("Bin diameter (ft)", "gbh-d", { step: "any", min: "0", value: "30" });
  const peak = makeNumber("Roof/peak cone height (ft, 0 = flat)", "gbh-peak", { step: "any", min: "0", value: "8" });
  const pack = makeNumber("Packing factor", "gbh-pack", { step: "any", min: "0", value: "1.0" });
  bu.input.value = "12875"; d.input.value = "30"; peak.input.value = "8"; pack.input.value = "1.0";
  for (const f of [bu, d, peak, pack]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { bu.input.value = "12875"; d.input.value = "30"; peak.input.value = "8"; pack.input.value = "1.0"; update(); });
  const oEave = makeOutputLine(outputRegion, "Required eave (wall) height", "gbh-out-eave");
  const oNote = makeOutputLine(outputRegion, "Note", "gbh-out-note");
  const update = debounce(() => {
    const r = computeGrainBinHeightForCapacity({ target_bushels: Number(bu.input.value) || 0, diameter_ft: Number(d.input.value) || 0, peak_height_ft: Number(peak.input.value) || 0, packing_factor: Number(pack.input.value) || 1.0 });
    if (r.error) { oEave.textContent = r.error; oNote.textContent = ""; return; }
    oEave.textContent = fmt(r.eave_height_ft, 1) + " ft";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [bu, d, peak, pack]) f.input.addEventListener("input", update);
}

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
  "drawbar-pull": renderDrawbarPull,
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
  "grain-bin-height-for-capacity": renderGrainBinHeightForCapacity,
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

// --- spec-v653 L: two-stroke mix ratio CHECK (`two-stroke-mix-ratio-check`) ---
// The inverse of two-stroke-mix: the achieved gas:oil ratio from the oil you
// actually poured, flagged against a target. ratio = fuel volume / oil volume.
// dims: in { fuel_amount: L^3, fuel_unit: dimensionless, oil_amount: L^3, target_ratio: dimensionless } out: { ratio: dimensionless, oz_per_gallon: dimensionless, ml_per_liter: dimensionless }
export function computeTwoStrokeMixRatioCheck({ fuel_amount = 0, fuel_unit = "gallon", oil_amount = 0, target_ratio = 50 } = {}) {
  const _g = _finiteGuard({ fuel_amount, oil_amount, target_ratio }); if (_g) return _g;
  const fuel = Number(fuel_amount);
  const oil = Number(oil_amount);
  const tr = Number(target_ratio);
  if (!(fuel > 0)) return { error: "Fuel amount must be positive." };
  if (!(oil > 0)) return { error: "Oil amount must be positive." };
  const unit = String(fuel_unit) === "liter" ? "liter" : "gallon";
  const OZ_PER_GAL = 128;
  const ratio = unit === "liter" ? (fuel * 1000) / oil : (fuel * OZ_PER_GAL) / oil;
  const oz_per_gallon = OZ_PER_GAL / ratio;
  const ml_per_liter = 1000 / ratio;
  let verdict;
  if (!(tr > 0)) {
    verdict = "Enter a target ratio to compare.";
  } else {
    const pct = (ratio / tr - 1) * 100;
    if (Math.abs(pct) <= 5) verdict = "on spec - within 5% of the " + fmt(tr, 0) + ":1 target";
    else if (ratio > tr) verdict = "LEAN (too little oil) - " + fmt(ratio, 0) + ":1 vs the " + fmt(tr, 0) + ":1 target; a lean mix starves the bearings and risks scoring or seizure - add oil";
    else verdict = "RICH (too much oil) - " + fmt(ratio, 0) + ":1 vs the " + fmt(tr, 0) + ":1 target; a rich mix smokes and fouls the plug but is the safer error - thin with fuel";
  }
  return {
    ratio, oz_per_gallon, ml_per_liter, verdict,
    note: "The inverse of the two-stroke mix tile: the achieved gas:oil ratio from the oil actually poured, ratio = fuel volume / oil volume (both in the same units; 1 US gallon = 128 fl oz). This mix is " + fmt(oz_per_gallon, 2) + " oz per gallon (" + fmt(ml_per_liter, 1) + " mL per liter). A LEAN mix (a higher X:1 than the target, too little oil) starves the bearings and is the dangerous error; a RICH mix (a lower X:1, too much oil) smokes and fouls but protects the engine. Use the oil grade and ratio the equipment maker specifies (commonly 50:1 with a JASO/ISO oil on modern air-cooled two-strokes); the equipment manual governs.",
  };
}
export const twoStrokeMixRatioCheckExample = { inputs: { fuel_amount: 1, fuel_unit: "gallon", oil_amount: 2.56, target_ratio: 50 } };
function renderTwoStrokeMixRatioCheck(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Two-stroke mix ratio check - ratio = fuel volume / oil volume (gas:oil by volume); 1 US gallon = 128 fl oz - first-principles volume arithmetic, the inverse of the two-stroke mix tile, public. Use the oil grade and ratio the equipment maker specifies; the equipment manual governs.";
  const fuel = makeNumber("Fuel amount", "tsmc-fuel", { step: "any", min: "0", value: "1" }); fuel.input.value = "1";
  const unit = makeSelect("Fuel unit", "tsmc-unit", [
    { value: "gallon", label: "US gallons", selected: true }, { value: "liter", label: "liters" },
  ]);
  const oil = makeNumber("Oil added (fl oz for gallons, mL for liters)", "tsmc-oil", { step: "any", min: "0", value: "2.56" }); oil.input.value = "2.56";
  const tr = makeNumber("Target ratio (X in X:1)", "tsmc-tr", { step: "any", min: "0", value: "50" }); tr.input.value = "50";
  for (const f of [fuel, unit, oil, tr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { fuel.input.value = "1"; unit.select.value = "gallon"; oil.input.value = "2.56"; tr.input.value = "50"; update(); });
  const oRatio = makeOutputLine(outputRegion, "Achieved ratio", "tsmc-out-ratio");
  const oDose = makeOutputLine(outputRegion, "Dose", "tsmc-out-dose");
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "tsmc-out-verdict");
  const oNote = makeOutputLine(outputRegion, "Note", "tsmc-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeTwoStrokeMixRatioCheck({ fuel_amount: readNum(fuel.input), fuel_unit: unit.select.value, oil_amount: readNum(oil.input), target_ratio: readNum(tr.input) });
    if (r.error) { oRatio.textContent = r.error; oDose.textContent = "-"; oVerdict.textContent = "-"; oNote.textContent = ""; return; }
    oRatio.textContent = fmt(r.ratio, 1) + ":1";
    oDose.textContent = fmt(r.oz_per_gallon, 2) + " oz/gal (" + fmt(r.ml_per_liter, 1) + " mL/L)";
    oVerdict.textContent = r.verdict;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [fuel.input, oil.input, tr.input]) f.addEventListener("input", update);
  unit.select.addEventListener("change", update);
}
AGRICULTURE_RENDERERS["two-stroke-mix-ratio-check"] = renderTwoStrokeMixRatioCheck;

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

// =====================================================================
// spec-v118: hay-dry-matter (Group L) - hay dry-matter and safe-storage
// weight. The dry-matter pounds in a bale, the weight restated at a target
// moisture, and the heating/mold risk flag against a safe-storage ceiling.
// First-principles dry-matter balance; producer and extension guidance govern.
// =====================================================================

// dims: in { bale_weight_lb: M, moisture_pct: dimensionless, target_moisture_pct: dimensionless, safe_threshold_pct: dimensionless } out: { dry_matter_lb: M, weight_at_target_lb: M }
export function computeHayDryMatter({ bale_weight_lb = 0, moisture_pct = 0, target_moisture_pct = 15, safe_threshold_pct = 18 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(bale_weight_lb > 0)) return { error: "Bale weight must be positive (lb)." };
  if (moisture_pct < 0 || moisture_pct >= 100) return { error: "Moisture must be between 0 and 100 percent." };
  if (target_moisture_pct < 0 || target_moisture_pct >= 100) return { error: "Target moisture must be between 0 and 100 percent." };
  if (!(safe_threshold_pct > 0)) return { error: "Safe-storage threshold must be positive (percent)." };
  const dry_matter_lb = bale_weight_lb * (1 - moisture_pct / 100);
  const weight_at_target_lb = dry_matter_lb / (1 - target_moisture_pct / 100);
  const over_threshold = moisture_pct > safe_threshold_pct;
  return {
    dry_matter_lb, weight_at_target_lb, over_threshold,
    flag: over_threshold
      ? "above the " + fmt(safe_threshold_pct, 0) + "% safe ceiling - heating / mold risk; do not store tight, consider a preservative or further drying"
      : "at or below the " + fmt(safe_threshold_pct, 0) + "% safe ceiling - ok to store",
    note: "Dry matter is the bale weight times (1 - moisture). Restating at a target moisture (dry matter / (1 - target)) lets you compare loads bought and sold at different moistures on an equal basis. Bale tight only below the safe-storage moisture ceiling (about 18% for large packages, 20% for small squares - both editable); wetter hay heats and molds, and very wet stacks can spontaneously combust. The producer and local extension guidance govern.",
  };
}
export const hayDryMatterExample = { inputs: { bale_weight_lb: 1200, moisture_pct: 22, target_moisture_pct: 15, safe_threshold_pct: 18 } };

function renderHayDryMatter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles dry-matter balance with USDA NRCS / land-grant extension safe-storage guidance (by name). Dry matter = weight x (1 - moisture); weight at target = dry matter / (1 - target). Safe ceiling ~18% large / 20% small (editable). The producer and extension govern.";
  const wt = makeNumber("Bale weight, as-baled (lb)", "hdm-wt", { step: "any", min: "0", value: "1200" });
  const moist = makeNumber("Measured moisture (%)", "hdm-m", { step: "any", min: "0", value: "22" });
  const tgt = makeNumber("Target moisture (%)", "hdm-t", { step: "any", min: "0", value: "15" });
  const safe = makeNumber("Safe-storage ceiling (%)", "hdm-s", { step: "any", min: "0", value: "18" });
  wt.input.value = "1200"; moist.input.value = "22"; tgt.input.value = "15"; safe.input.value = "18";
  for (const f of [wt, moist, tgt, safe]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { wt.input.value = "1200"; moist.input.value = "22"; tgt.input.value = "15"; safe.input.value = "18"; update(); });
  const oDm = makeOutputLine(outputRegion, "Dry matter", "hdm-out-dm");
  const oWt = makeOutputLine(outputRegion, "Weight at target moisture", "hdm-out-wt");
  const oFlag = makeOutputLine(outputRegion, "Storage flag", "hdm-out-flag");
  const oN = makeOutputLine(outputRegion, "Note", "hdm-out-n");
  const update = debounce(() => {
    const r = computeHayDryMatter({
      bale_weight_lb: Number(wt.input.value) || 0, moisture_pct: Number(moist.input.value) || 0,
      target_moisture_pct: tgt.input.value === "" ? 15 : Number(tgt.input.value), safe_threshold_pct: safe.input.value === "" ? 18 : Number(safe.input.value),
    });
    if (r.error) { oDm.textContent = r.error; oWt.textContent = "-"; oFlag.textContent = "-"; oN.textContent = "-"; return; }
    oDm.textContent = fmt(r.dry_matter_lb, 0) + " lb";
    oWt.textContent = fmt(r.weight_at_target_lb, 0) + " lb";
    oFlag.textContent = r.flag;
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [wt.input, moist.input, tgt.input, safe.input]) el.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["hay-dry-matter"] = renderHayDryMatter;

// =====================================================================
// spec-v207..v211 (Group L) - landscape irrigation and planting install
// cluster: precipitation rate, zone runtime, drip flow, plant spacing,
// sod takeoff. First-principles design relations; the Irrigation
// Association and major-manufacturer design references govern by name.
// =====================================================================

// --- spec-v207: sprinkler-precip-rate ---
// dims: in { zone_gpm: L^3 T^-1, zone_ft2: L^2 } out: { precip_in_hr: L T^-1 }
export function computeSprinklerPrecipRate({ zone_gpm = 0, zone_ft2 = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(zone_gpm > 0)) return { error: "Zone flow must be positive (gpm)." };
  if (!(zone_ft2 > 0)) return { error: "Zone area must be positive (ft^2)." };
  const precip_in_hr = 96.3 * zone_gpm / zone_ft2;
  return {
    precip_in_hr,
    note: "Precipitation rate = 96.3 x zone gpm / zone area (ft^2): how fast a valve zone puts water on the ground, in in/hr. The 96.3 constant spreads 1 gpm over 1 ft^2 (231 in^3/gal / 144 in^2/ft^2 x 60 min/hr). This is the number that sets the zone's runtime, and the reason spray heads (~1.5-2 in/hr) and rotors (~0.4-0.8 in/hr) never share a valve - the same gpm applies water roughly three times faster from sprays. The head flows come from the manufacturer's nozzle chart at the operating pressure, the zone area is the area the heads actually cover, and this is a design-rate estimate, not a system audit (irrigation-uniformity audits the installed result).",
  };
}
export const sprinklerPrecipRateExample = { inputs: { zone_gpm: 15, zone_ft2: 1200 } };
const renderSprinklerPrecipRate = _v23SimpleRenderer({
  citation: "Citation: first-principles precipitation-rate relation with the Irrigation Association design references and the Rain Bird / Hunter design manuals (by name). PR = 96.3 x zone gpm / zone area (ft^2), in in/hr. The 96.3 constant is the standard irrigation conversion. Head flows come from the nozzle chart at the operating pressure; this is a design-rate estimate, not a system audit.",
  example: sprinklerPrecipRateExample.inputs,
  fields: [
    { key: "zone_gpm", label: "Zone flow, all heads (gpm)", kind: "number" },
    { key: "zone_ft2", label: "Zone area covered (ft^2)", kind: "number" },
  ],
  outputs: [
    { key: "pr", id: "spr-out-pr", label: "Precipitation rate", value: (r) => fmt(r.precip_in_hr, 2) + " in/hr" },
    { key: "n", id: "spr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSprinklerPrecipRate,
});
AGRICULTURE_RENDERERS["sprinkler-precip-rate"] = renderSprinklerPrecipRate;

// --- spec-v208: irrigation-zone-runtime ---
// dims: in { target_in: L, precip_in_hr: L T^-1, du: dimensionless, max_cycle_min: T } out: { net_min: T, gross_min: T, cycles: dimensionless, per_cycle_min: T }
export function computeIrrigationZoneRuntime({ target_in = 0, precip_in_hr = 0, du = 1.0, max_cycle_min = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(target_in > 0)) return { error: "Target depth must be positive (in)." };
  if (!(precip_in_hr > 0)) return { error: "Precipitation rate must be positive (in/hr)." };
  if (!(max_cycle_min > 0)) return { error: "Maximum cycle length must be positive (min)." };
  if (!(du > 0 && du <= 1)) return { error: "Distribution uniformity must be in (0, 1]." };
  const net_min = target_in / precip_in_hr * 60;
  const gross_min = net_min / du;
  const cycles = Math.ceil(gross_min / max_cycle_min);
  const per_cycle_min = gross_min / cycles;
  return {
    net_min, gross_min, cycles, per_cycle_min,
    note: "Net runtime = target depth / precipitation rate x 60. Gross runtime = net / distribution uniformity - the lower quarter needs the extra water so the dry corners get the target. Cycle-and-soak splits the gross time into runs no longer than the soil/slope's runoff limit (cycles = ceil(gross / max-cycle), each run = gross / cycles), with soak gaps between them so water infiltrates instead of running off. The DU comes from a catch-can audit (irrigation-uniformity), the soil intake rate that caps the cycle length comes from the soil type, and this is a scheduling estimate the controller and the site's actual runoff govern.",
  };
}
export const irrigationZoneRuntimeExample = { inputs: { target_in: 0.75, precip_in_hr: 1.20, du: 0.75, max_cycle_min: 10 } };
const renderIrrigationZoneRuntime = _v23SimpleRenderer({
  citation: "Citation: first-principles runtime and cycle-and-soak relations with the Irrigation Association scheduling references (by name). Net = depth / rate x 60; gross = net / DU; cycles = ceil(gross / max-cycle); per cycle = gross / cycles. DU from a catch-can audit, the max-cycle from the soil; this is a program aid, not a guaranteed schedule.",
  example: irrigationZoneRuntimeExample.inputs,
  fields: [
    { key: "target_in", label: "Target depth this run (in)", kind: "number" },
    { key: "precip_in_hr", label: "Precipitation rate (in/hr)", kind: "number" },
    { key: "du", label: "Distribution uniformity (0-1)", kind: "number", default: 1.0 },
    { key: "max_cycle_min", label: "Max cycle before runoff (min)", kind: "number" },
  ],
  outputs: [
    { key: "net", id: "izr-out-net", label: "Net runtime", value: (r) => fmt(r.net_min, 1) + " min" },
    { key: "gross", id: "izr-out-gross", label: "Gross runtime (DU adjusted)", value: (r) => fmt(r.gross_min, 1) + " min" },
    { key: "prog", id: "izr-out-prog", label: "Program", value: (r) => r.cycles + (r.cycles === 1 ? " cycle of " : " cycles of ") + fmt(r.per_cycle_min, 1) + " min" },
    { key: "n", id: "izr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeIrrigationZoneRuntime,
});
AGRICULTURE_RENDERERS["irrigation-zone-runtime"] = renderIrrigationZoneRuntime;

// --- spec-v209: drip-zone-flow ---
// dims: in { mode: dimensionless, tubing_ft: L, spacing_in: L, emitter_gph: L^3 T^-1, emitter_count: dimensionless, valve_gpm: L^3 T^-1 } out: { emitters: dimensionless, zone_gph: L^3 T^-1, zone_gpm: L^3 T^-1, utilization: dimensionless }
export function computeDripZoneFlow({ mode = "inline", tubing_ft = 0, spacing_in = 0, emitter_gph = 0, emitter_count = 0, valve_gpm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(emitter_gph > 0)) return { error: "Per-emitter flow must be positive (gph)." };
  if (!(valve_gpm > 0)) return { error: "Valve flow limit must be positive (gpm)." };
  let emitters;
  if (mode === "point") {
    if (!(emitter_count > 0)) return { error: "Emitter count must be positive." };
    emitters = Math.floor(emitter_count);
  } else {
    if (!(tubing_ft > 0)) return { error: "Tubing length must be positive (ft)." };
    if (!(spacing_in > 0)) return { error: "Emitter spacing must be positive (in)." };
    emitters = Math.floor(tubing_ft * 12 / spacing_in);
  }
  const zone_gph = emitters * emitter_gph;
  const zone_gpm = zone_gph / 60;
  const utilization = zone_gpm / valve_gpm * 100;
  return {
    emitters, zone_gph, zone_gpm, utilization,
    over_limit: utilization > 100,
    note: "Total emitter flow = emitters x rated gph; convert to gpm (/60) and check it against the valve's and lateral tubing's flow limit. Inline mode derives the emitter count from the dripline length and emitter spacing (emitters = floor(length x 12 / spacing)); point-source mode takes the count directly. Keep utilization under 100% - over the valve or lateral limit, the far emitters starve. The per-emitter flow is the manufacturer's rated gph at the design pressure, the valve and lateral limits come from the product's published maximum flow, and this is a flow-budget check, not a hydraulic pressure-loss model.",
  };
}
export const dripZoneFlowExample = { inputs: { mode: "inline", tubing_ft: 300, spacing_in: 18, emitter_gph: 0.9, emitter_count: 0, valve_gpm: 12 } };
const renderDripZoneFlow = _v23SimpleRenderer({
  citation: "Citation: first-principles total-flow and utilization relations with the Irrigation Association low-volume references and the major-manufacturer drip design data (by name). zone gph = emitters x rated gph; zone gpm = gph / 60; utilization = zone gpm / valve gpm x 100. Per-emitter flow is the rated gph at the design pressure; this is a flow-budget check, not a full lateral-line hydraulic analysis.",
  example: dripZoneFlowExample.inputs,
  fields: [
    { key: "mode", label: "Input mode", kind: "select", options: [{ value: "inline", label: "Inline (length + spacing)" }, { value: "point", label: "Point-source (emitter count)" }] },
    { key: "tubing_ft", label: "Dripline length (ft, inline)", kind: "number" },
    { key: "spacing_in", label: "Emitter spacing (in, inline)", kind: "number" },
    { key: "emitter_count", label: "Emitter count (point-source)", kind: "number" },
    { key: "emitter_gph", label: "Rated flow per emitter (gph)", kind: "number" },
    { key: "valve_gpm", label: "Valve / lateral limit (gpm)", kind: "number" },
  ],
  outputs: [
    { key: "e", id: "dzf-out-e", label: "Emitters", value: (r) => String(r.emitters) },
    { key: "f", id: "dzf-out-f", label: "Zone flow", value: (r) => fmt(r.zone_gph, 0) + " gph (" + fmt(r.zone_gpm, 2) + " gpm)" },
    { key: "u", id: "dzf-out-u", label: "Valve utilization", value: (r) => fmt(r.utilization, 1) + "%" + (r.over_limit ? " - OVER limit, far emitters starve" : " - within limit") },
    { key: "n", id: "dzf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDripZoneFlow,
});
AGRICULTURE_RENDERERS["drip-zone-flow"] = renderDripZoneFlow;

// --- spec-v210: plant-spacing-count ---
// dims: in { bed_ft2: L^2, spacing_in: L } out: { square_n: dimensionless, triangular_n: dimensionless }
export function computePlantSpacingCount({ bed_ft2 = 0, spacing_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(bed_ft2 > 0)) return { error: "Bed area must be positive (ft^2)." };
  if (!(spacing_in > 0)) return { error: "On-center spacing must be positive (in)." };
  const s_ft = spacing_in / 12;
  const square_n = Math.ceil(bed_ft2 / (s_ft * s_ft));
  const triangular_n = Math.ceil(bed_ft2 / (0.866 * s_ft * s_ft));
  return {
    square_n, triangular_n,
    note: "Square grid: plants = bed area / spacing^2 (rows and columns square). Triangular (staggered 60-degree) grid: plants = bed area / (0.866 x spacing^2) - the 0.866 = sqrt(3)/2 row offset packs about 15% more plants into the same bed because the offset rows sit closer, the way groundcover is actually planted. The spacing comes from the plant's mature spread or the planting plan, edge plants are rounded up so the bed is covered, and this is a planting-density count, not a horticultural plan.",
  };
}
export const plantSpacingCountExample = { inputs: { bed_ft2: 200, spacing_in: 12 } };
const renderPlantSpacingCount = _v23SimpleRenderer({
  citation: "Citation: first-principles square- and triangular-grid relations with nursery / landscape estimating references for the staggered-grid 0.866 = sqrt(3)/2 factor (by name). square = area / spacing^2; triangular = area / (0.866 x spacing^2), about 15% more. Spacing from the mature spread or planting plan; this is a takeoff aid, not a horticultural plan.",
  example: plantSpacingCountExample.inputs,
  fields: [
    { key: "bed_ft2", label: "Bed area to plant (ft^2)", kind: "number" },
    { key: "spacing_in", label: "On-center spacing (in)", kind: "number" },
  ],
  outputs: [
    { key: "sq", id: "psc-out-sq", label: "Square grid", value: (r) => String(r.square_n) + " plants" },
    { key: "tri", id: "psc-out-tri", label: "Triangular grid", value: (r) => String(r.triangular_n) + " plants (staggered, ~15% more)" },
    { key: "n", id: "psc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePlantSpacingCount,
});
AGRICULTURE_RENDERERS["plant-spacing-count"] = renderPlantSpacingCount;

// --- spec-v211: sod-takeoff ---
// dims: in { lawn_ft2: L^2, waste_pct: dimensionless, slab_ft2: L^2, pallet_ft2: L^2 } out: { order_ft2: L^2, order_syd: L^2, slabs: dimensionless, pallets: dimensionless }
export function computeSodTakeoff({ lawn_ft2 = 0, waste_pct = 0, slab_ft2 = 10, pallet_ft2 = 450 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(lawn_ft2 > 0)) return { error: "Lawn area must be positive (ft^2)." };
  if (waste_pct < 0) return { error: "Waste allowance must be zero or positive (percent)." };
  if (!(slab_ft2 > 0)) return { error: "Slab coverage must be positive (ft^2)." };
  if (!(pallet_ft2 > 0)) return { error: "Pallet coverage must be positive (ft^2)." };
  const order_ft2 = lawn_ft2 * (1 + waste_pct / 100);
  const order_syd = order_ft2 / 9;
  const slabs = Math.ceil(order_ft2 / slab_ft2);
  const pallets = Math.ceil(order_ft2 / pallet_ft2);
  return {
    order_ft2, order_syd, slabs, pallets,
    note: "Ordered area = lawn area x (1 + waste/100), restated in square yards (/9); slabs = ceil(order / slab coverage); pallets = ceil(order / pallet coverage). The waste allowance covers the cuts and edges of a curvy lawn. Slab and pallet sizes vary by farm and grass (defaults ~10 ft^2 per slab, ~450 ft^2 per pallet, both editable); the supplier's published piece and skid sizes govern. This is a material takeoff, not a site-prep or establishment plan.",
  };
}
export const sodTakeoffExample = { inputs: { lawn_ft2: 2500, waste_pct: 5, slab_ft2: 10, pallet_ft2: 450 } };
const renderSodTakeoff = _v23SimpleRenderer({
  citation: "Citation: first-principles area-plus-waste takeoff relation with turfgrass producer / landscape estimating references (by name). order = lawn x (1 + waste/100); slabs = ceil(order / slab); pallets = ceil(order / pallet). Slab/pallet coverage vary by farm (defaults ~10 / ~450 ft^2, editable); this is an ordering aid, not an agronomic spec.",
  example: sodTakeoffExample.inputs,
  fields: [
    { key: "lawn_ft2", label: "Lawn area to sod (ft^2)", kind: "number" },
    { key: "waste_pct", label: "Cut / edge waste (%)", kind: "number", default: 5 },
    { key: "slab_ft2", label: "Slab coverage (ft^2)", kind: "number", default: 10 },
    { key: "pallet_ft2", label: "Pallet coverage (ft^2)", kind: "number", default: 450 },
  ],
  outputs: [
    { key: "o", id: "sod-out-o", label: "Order area", value: (r) => fmt(r.order_ft2, 0) + " ft^2 (" + fmt(r.order_syd, 1) + " syd)" },
    { key: "s", id: "sod-out-s", label: "Slabs", value: (r) => String(r.slabs) },
    { key: "p", id: "sod-out-p", label: "Pallets", value: (r) => String(r.pallets) },
    { key: "n", id: "sod-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSodTakeoff,
});
AGRICULTURE_RENDERERS["sod-takeoff"] = renderSodTakeoff;

// --- spec-v338 L.x: Grain drying shrink & net market bushels (`grain-shrink-moisture`) ---
// Moisture shrink from wet to market moisture, dried weight, handling shrink, and
// net market bushels at the crop's test weight. moist_shrink = (Mw-Md)/(100-Md);
// W_dry = W(100-Mw)/(100-Md); W_net = W_dry(1-h/100); bu = W_net/tw.
// dims: in { W_lb: M, M_wet_pct: dimensionless, M_dry_pct: dimensionless, handling: dimensionless, tw_lbbu: M } out: { W_dry_lb: M, W_net_lb: M, bushels: dimensionless, moist_shrink_pct: dimensionless, total_shrink_pct: dimensionless }
export function computeGrainShrinkMoisture({ W_lb = 0, M_wet_pct = 0, M_dry_pct = 0, handling = 0.5, tw_lbbu = 56 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const W = Number(W_lb) || 0;
  const Mw = Number(M_wet_pct) || 0;
  const Md = Number(M_dry_pct) || 0;
  const h = Number(handling) || 0;
  const tw = Number(tw_lbbu) || 0;
  if (!(W > 0)) return { error: "Enter a positive gross (wet) weight." };
  if (!(Mw > 0 && Mw < 100)) return { error: "Wet moisture must be between 0 and 100 percent." };
  if (!(Md >= 0 && Md < 100)) return { error: "Market moisture must be between 0 and 100 percent." };
  if (!(Mw > Md)) return { error: "Wet moisture must be above the market moisture (you cannot dry up)." };
  if (!(tw > 0)) return { error: "Enter a positive test weight (lb/bu)." };
  const moist_shrink = (Mw - Md) / (100 - Md);
  const W_dry = W * (100 - Mw) / (100 - Md);
  const W_net = W_dry * (1 - h / 100);
  const bushels = W_net / tw;
  const total_shrink = (W - W_net) / W * 100;
  return {
    W_dry_lb: W_dry, W_net_lb: W_net, bushels,
    moist_shrink_pct: moist_shrink * 100, total_shrink_pct: total_shrink,
  };
}
export const grainShrinkMoistureExample = { inputs: { W_lb: 10000, M_wet_pct: 20, M_dry_pct: 15, handling: 0.5, tw_lbbu: 56 } };

function renderGrainShrinkMoisture(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Grain drying shrink per the standard moisture-shrink relation used by USDA and land-grant extension: dry weight = wet weight x (100 - wet moisture)/(100 - market moisture), then a handling/invisible shrink deduction; net bushels = net weight / market test weight (56 lb corn, 60 wheat/soybeans). The buyer's contract, moisture discount schedule, and settlement scale govern.";
  const W = makeNumber("Gross wet weight (lb)", "gsm-w", { step: "any", min: "0", value: "10000" });
  W.input.value = "10000";
  const Mw = makeNumber("Wet moisture (%)", "gsm-mw", { step: "any", min: "0", max: "100", value: "20" });
  Mw.input.value = "20";
  const Md = makeNumber("Market moisture (%)", "gsm-md", { step: "any", min: "0", max: "100", value: "15" });
  Md.input.value = "15";
  const h = makeNumber("Handling shrink (%)", "gsm-h", { step: "any", min: "0", value: "0.5" });
  h.input.value = "0.5";
  const tw = makeNumber("Test weight (lb/bu; 56 corn, 60 wheat/soy)", "gsm-tw", { step: "any", min: "0", value: "56" });
  tw.input.value = "56";
  for (const f of [W, Mw, Md, h, tw]) inputRegion.appendChild(f.wrap);
  const oNet = makeOutputLine(outputRegion, "Net market weight", "gsm-out-net");
  const oBu = makeOutputLine(outputRegion, "Net market bushels", "gsm-out-bu");
  const oShrink = makeOutputLine(outputRegion, "Shrink", "gsm-out-shrink");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeGrainShrinkMoisture({
      W_lb: readNum(W.input), M_wet_pct: readNum(Mw.input), M_dry_pct: readNum(Md.input),
      handling: readNum(h.input), tw_lbbu: readNum(tw.input),
    });
    if (r.error) { oNet.textContent = r.error; oBu.textContent = ""; oShrink.textContent = ""; return; }
    oNet.textContent = fmt(r.W_net_lb, 0) + " lb (dried " + fmt(r.W_dry_lb, 0) + " lb)";
    oBu.textContent = fmt(r.bushels, 1) + " bu";
    oShrink.textContent = fmt(r.total_shrink_pct, 2) + "% total (" + fmt(r.moist_shrink_pct, 2) + "% moisture)";
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { W.input.value = "10000"; Mw.input.value = "20"; Md.input.value = "15"; h.input.value = "0.5"; tw.input.value = "56"; update(); });
  for (const f of [W.input, Mw.input, Md.input, h.input, tw.input]) f.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["grain-shrink-moisture"] = renderGrainShrinkMoisture;

// --- spec-v339 L.x: Livestock dry-matter intake & as-fed ration (`livestock-dry-matter-intake`) ---
// DMI = BW x intake%; as-fed = DMI / (feed_DM%); herd as-fed = as-fed x head.
// Intake is always figured on a dry-matter basis; wet feeds weigh far more as-fed.
// dims: in { BW_lb: M, intake: dimensionless, feed_DM: dimensionless, head: dimensionless } out: { DMI_lb: M, asfed_lb: M, herd_asfed_lb: M }
export function computeLivestockDryMatterIntake({ BW_lb = 0, intake = 0, feed_DM = 0, head = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const BW = Number(BW_lb) || 0;
  const intk = Number(intake) || 0;
  const dm = Number(feed_DM) || 0;
  const hd = Number(head) || 1;
  if (!(BW > 0)) return { error: "Enter a positive body weight." };
  if (!(intk > 0)) return { error: "Enter a positive dry-matter intake percentage." };
  if (!(dm > 0 && dm <= 100)) return { error: "Feed dry matter must be between 0 and 100 percent." };
  if (!(hd > 0)) return { error: "Enter a positive number of animals." };
  const DMI = BW * intk / 100;
  const asfed = DMI / (dm / 100);
  const herd_asfed = asfed * hd;
  return { DMI_lb: DMI, asfed_lb: asfed, herd_asfed_lb: herd_asfed, head: hd };
}
export const livestockDryMatterIntakeExample = { inputs: { BW_lb: 1200, intake: 2.5, feed_DM: 88, head: 1 } };

function renderLivestockDryMatterIntake(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Dry-matter intake per NRC Nutrient Requirements of Beef Cattle / Dairy Cattle: DMI = body weight x intake (% of BW on a dry-matter basis); as-fed = DMI / feed dry-matter fraction. Feed dry matter runs about 88% for dry hay and 30-40% for corn silage. A ration balancer and a nutritionist govern the actual diet.";
  const BW = makeNumber("Body weight (lb)", "ldm-bw", { step: "any", min: "0", value: "1200" });
  BW.input.value = "1200";
  const intake = makeNumber("Dry-matter intake (% of body weight)", "ldm-in", { step: "any", min: "0", value: "2.5" });
  intake.input.value = "2.5";
  const dm = makeNumber("Feed dry matter (%; 88 hay, 35 silage)", "ldm-dm", { step: "any", min: "0", max: "100", value: "88" });
  dm.input.value = "88";
  const head = makeNumber("Number of animals", "ldm-head", { step: "1", min: "0", value: "1" });
  head.input.value = "1";
  for (const f of [BW, intake, dm, head]) inputRegion.appendChild(f.wrap);
  const oDMI = makeOutputLine(outputRegion, "Dry-matter intake", "ldm-out-dmi");
  const oAF = makeOutputLine(outputRegion, "As-fed intake", "ldm-out-af");
  const oHerd = makeOutputLine(outputRegion, "Herd as-fed", "ldm-out-herd");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeLivestockDryMatterIntake({
      BW_lb: readNum(BW.input), intake: readNum(intake.input), feed_DM: readNum(dm.input), head: readNum(head.input),
    });
    if (r.error) { oDMI.textContent = r.error; oAF.textContent = ""; oHerd.textContent = ""; return; }
    oDMI.textContent = fmt(r.DMI_lb, 1) + " lb/day dry matter";
    oAF.textContent = fmt(r.asfed_lb, 1) + " lb/day as-fed (bunk weight)";
    oHerd.textContent = r.head > 1 ? fmt(r.herd_asfed_lb, 0) + " lb/day for " + r.head + " head" : "(enter head count > 1 for herd total)";
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { BW.input.value = "1200"; intake.input.value = "2.5"; dm.input.value = "88"; head.input.value = "1"; update(); });
  for (const f of [BW.input, intake.input, dm.input, head.input]) f.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["livestock-dry-matter-intake"] = renderLivestockDryMatterIntake;

// --- spec-v340 L.x: Nutrient-based manure application rate (`manure-application-rate`) ---
// available_per_unit = total_nutr x availability%; rate = crop_need / available_per_unit
// (ton/acre for solid, 1,000 gal/acre for liquid). Closes: rate x available = crop_need.
// dims: in { crop_need: dimensionless, total_nutr: dimensionless, availability: dimensionless } out: { available_per_unit: dimensionless, rate: dimensionless, applied_nutrient: dimensionless }
export function computeManureApplicationRate({ crop_need = 0, total_nutr = 0, availability = 0, form = "solid" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const need = Number(crop_need) || 0;
  const total = Number(total_nutr) || 0;
  const avail = Number(availability) || 0;
  if (!(need > 0)) return { error: "Enter a positive crop nutrient requirement (lb/acre)." };
  if (!(total > 0)) return { error: "Enter a positive total nutrient in the manure." };
  if (!(avail > 0 && avail <= 100)) return { error: "Availability must be between 0 and 100 percent." };
  const available_per_unit = total * avail / 100;
  const rate = need / available_per_unit;
  const applied_nutrient = rate * available_per_unit;
  return { available_per_unit, rate, applied_nutrient, form };
}
export const manureApplicationRateExample = { inputs: { crop_need: 150, total_nutr: 10, availability: 50, form: "solid" } };

function renderManureApplicationRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Nutrient-based manure rate per USDA NRCS Code 590 (Nutrient Management) and land-grant manure-management guidance: available nutrient per unit = total nutrient x first-year availability; application rate = crop requirement / available per unit. Solid manure is ton/acre, liquid is 1,000 gal/acre. The rate is set by the most limiting of N or P2O5 under the farm's nutrient-management plan; a manure test and the plan govern.";
  const need = makeNumber("Crop nutrient need (lb/acre, N or P2O5)", "mar-need", { step: "any", min: "0", value: "150" });
  need.input.value = "150";
  const form = makeSelect("Manure form", "mar-form", [
    { value: "solid", label: "Solid (lb/ton -> ton/acre)", selected: true },
    { value: "liquid", label: "Liquid (lb/1,000 gal -> 1,000 gal/acre)" },
  ]);
  const total = makeNumber("Total nutrient (lb/ton or lb/1,000 gal)", "mar-total", { step: "any", min: "0", value: "10" });
  total.input.value = "10";
  const avail = makeNumber("First-year availability (%)", "mar-avail", { step: "any", min: "0", max: "100", value: "50" });
  avail.input.value = "50";
  for (const f of [need, form, total, avail]) inputRegion.appendChild(f.wrap);
  const oAvail = makeOutputLine(outputRegion, "Available nutrient per unit", "mar-out-avail");
  const oRate = makeOutputLine(outputRegion, "Application rate", "mar-out-rate");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeManureApplicationRate({
      crop_need: readNum(need.input), total_nutr: readNum(total.input),
      availability: readNum(avail.input), form: form.select.value,
    });
    if (r.error) { oAvail.textContent = r.error; oRate.textContent = ""; return; }
    const solid = r.form === "solid";
    oAvail.textContent = fmt(r.available_per_unit, 2) + (solid ? " lb/ton available" : " lb/1,000 gal available");
    oRate.textContent = solid
      ? fmt(r.rate, 1) + " ton/acre"
      : fmt(r.rate, 2) + " (x1,000 gal) = " + fmt(r.rate * 1000, 0) + " gal/acre";
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { need.input.value = "150"; form.select.value = "solid"; total.input.value = "10"; avail.input.value = "50"; update(); });
  for (const f of [need.input, total.input, avail.input]) f.addEventListener("input", update);
  form.select.addEventListener("change", update);
}
AGRICULTURE_RENDERERS["manure-application-rate"] = renderManureApplicationRate;

// ===================== spec-v417..v419: landscape/agriculture trio (Group L) =====================

// dims: in { area_ft2: L^2, depth_in: L, bulk_density: dimensionless, bag_ft3: L^3, load_yd3: L^3, waste_pct: dimensionless } out: { yd3: L^3, bags: dimensionless, tons: dimensionless, loads: dimensionless }
export function computeMulchTopsoilVolume({ area_ft2 = 0, depth_in = 0, bulk_density = 0, bag_ft3 = 2, load_yd3 = 10, waste_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(area_ft2) || 0;
  const depth = Number(depth_in) || 0;
  const dens = Number(bulk_density) || 0;
  const bag = Number(bag_ft3) > 0 ? Number(bag_ft3) : 2;
  const load = Number(load_yd3) > 0 ? Number(load_yd3) : 10;
  const waste = Number(waste_pct) || 0;
  if (!(area > 0)) return { error: "Area must be positive (ft^2)." };
  if (!(depth > 0)) return { error: "Depth must be positive (in)." };
  if (!(dens > 0)) return { error: "Bulk density must be positive (ton/yd^3)." };
  if (waste < 0) return { error: "Waste allowance must be non-negative (%)." };
  const yd3 = area * (depth / 12) / 27 * (1 + waste / 100);
  const bags = Math.ceil(yd3 * 27 / bag);
  const tons = yd3 * dens;
  const loads = Math.ceil(yd3 / load);
  return {
    yd3, bags, tons, loads,
    note: "Bulk landscape material: cubic yards = area x (depth/12) / 27, times a waste/compaction allowance, then bagged (ceil of yd^3 x 27 / bag ft^3), weighed (yd^3 x bulk density), and trucked (ceil of yd^3 / load). Bulk densities vary: mulch about 0.5, topsoil about 1.1, and gravel about 1.4 ton/yd^3, so the same volume weighs very differently. A quantity aid; the supplier's actual bag size, load size, and product density govern.",
  };
}
export const mulchTopsoilVolumeExample = { inputs: { area_ft2: 1000, depth_in: 3, bulk_density: 1.1, bag_ft3: 2, load_yd3: 10, waste_pct: 0 } };
function renderMulchTopsoilVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Bulk landscape material take-off (first-principles volume): cubic yards = area x depth / 324 (depth in inches), bags = ceil(yd^3 x 27 / bag size), tons = yd^3 x bulk density, truckloads = ceil(yd^3 / load). Bulk densities: mulch ~0.5, topsoil ~1.1, gravel ~1.4 ton/yd^3. A quantity aid; the supplier's bag/load size and product density govern.";
  const area = makeNumber("Area (ft^2)", "mtv-area", { step: "any", min: "0", value: "1000" });
  const depth = makeNumber("Depth (in)", "mtv-depth", { step: "any", min: "0", value: "3" });
  const dens = makeNumber("Bulk density (ton/yd^3: mulch 0.5, topsoil 1.1, gravel 1.4)", "mtv-dens", { step: "any", min: "0", value: "1.1" });
  const bag = makeNumber("Bag size (ft^3, default 2)", "mtv-bag", { step: "any", min: "0", value: "2" });
  const load = makeNumber("Truck load (yd^3, default 10)", "mtv-load", { step: "any", min: "0", value: "10" });
  const waste = makeNumber("Waste/compaction allowance (%)", "mtv-waste", { step: "any", min: "0", value: "0" });
  for (const f of [area, depth, dens, bag, load, waste]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "1000"; depth.input.value = "3"; dens.input.value = "1.1"; bag.input.value = "2"; load.input.value = "10"; waste.input.value = "0"; update(); });
  const oYd = makeOutputLine(outputRegion, "Volume", "mtv-out-yd");
  const oBags = makeOutputLine(outputRegion, "Bags / tons / loads", "mtv-out-b");
  const oNote = makeOutputLine(outputRegion, "Note", "mtv-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeMulchTopsoilVolume({ area_ft2: readNum(area.input), depth_in: readNum(depth.input), bulk_density: readNum(dens.input), bag_ft3: readNum(bag.input), load_yd3: readNum(load.input), waste_pct: readNum(waste.input) });
    if (r.error) { oYd.textContent = r.error; oBags.textContent = ""; oNote.textContent = ""; return; }
    oYd.textContent = fmt(r.yd3, 2) + " yd^3";
    oBags.textContent = r.bags + " bags / " + fmt(r.tons, 1) + " tons / " + r.loads + " load(s)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [area.input, depth.input, dens.input, bag.input, load.input, waste.input]) f.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["mulch-topsoil-volume"] = renderMulchTopsoilVolume;

// dims: in { bushels: dimensionless, lb_per_bushel: dimensionless, mi_percent: dimensionless, mf_percent: dimensionless, btu_per_lb: dimensionless, price_per_gal: dimensionless } out: { weight_lb: M, water_lb: M, energy_btu: M L^2 T^-2, propane_gal: dimensionless }
export function computeGrainDryingEnergy({ bushels = 0, lb_per_bushel = 56, mi_percent = 0, mf_percent = 0, btu_per_lb = 1500, price_per_gal = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const bu = Number(bushels) || 0;
  const lbbu = Number(lb_per_bushel) || 0;
  const mi = Number(mi_percent) || 0;
  const mf = Number(mf_percent) || 0;
  const btu = Number(btu_per_lb) > 0 ? Number(btu_per_lb) : 1500;
  const price = Number(price_per_gal) || 0;
  if (!(bu > 0)) return { error: "Bushels must be positive." };
  if (!(lbbu > 0)) return { error: "Test weight must be positive (lb/bushel)." };
  if (!(mf >= 0 && mf < 100)) return { error: "Final moisture must be between 0 and 100%." };
  if (!(mi > mf)) return { error: "Initial moisture must exceed the final (target) moisture." };
  const weight_lb = bu * lbbu;
  const water_lb = weight_lb * (mi - mf) / (100 - mf);
  const energy_btu = water_lb * btu;
  const propane_gal = energy_btu / 91500;
  const cost_usd = price > 0 ? propane_gal * price : null;
  return {
    weight_lb, water_lb, energy_btu, propane_gal, cost_usd,
    note: "Grain drying energy: the water removed = wet weight x (Mi - Mf) / (100 - Mf) on the wet basis (the shrink formula), the drying energy = water x the per-pound energy (about 1500 Btu/lb including dryer efficiency), and the propane = energy / 91,500 Btu per gallon. Removing fewer moisture points removes disproportionately less water because the denominator shifts. A planning aid; the dryer's actual efficiency, the fuel heat content, and the market discount schedule govern.",
  };
}
export const grainDryingEnergyExample = { inputs: { bushels: 1000, lb_per_bushel: 56, mi_percent: 20, mf_percent: 15, btu_per_lb: 1500, price_per_gal: 0 } };
function renderGrainDryingEnergy(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Grain drying energy (first-principles shrink + heat balance): water removed = weight x (Mi - Mf)/(100 - Mf), energy = water x ~1500 Btu/lb (dryer efficiency included), propane = energy / 91,500 Btu/gal. A planning aid; the dryer efficiency, fuel heat content, and market discount schedule govern.";
  const bu = makeNumber("Quantity (bushels)", "gde-bu", { step: "any", min: "0", value: "1000" });
  const lbbu = makeNumber("Test weight (lb/bu: corn 56, wheat/soy 60)", "gde-lb", { step: "any", min: "0", value: "56" });
  const mi = makeNumber("Initial moisture (%)", "gde-mi", { step: "any", min: "0", value: "20" });
  const mf = makeNumber("Final moisture (%)", "gde-mf", { step: "any", min: "0", value: "15" });
  const btu = makeNumber("Drying energy (Btu/lb water, default 1500)", "gde-btu", { step: "any", min: "0", value: "1500" });
  const price = makeNumber("Propane price ($/gal, optional)", "gde-price", { step: "any", min: "0", value: "" });
  for (const f of [bu, lbbu, mi, mf, btu, price]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { bu.input.value = "1000"; lbbu.input.value = "56"; mi.input.value = "20"; mf.input.value = "15"; btu.input.value = "1500"; price.input.value = ""; update(); });
  const oWater = makeOutputLine(outputRegion, "Water removed", "gde-out-water");
  const oEnergy = makeOutputLine(outputRegion, "Energy / propane", "gde-out-energy");
  const oCost = makeOutputLine(outputRegion, "Fuel cost", "gde-out-cost");
  const oNote = makeOutputLine(outputRegion, "Note", "gde-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeGrainDryingEnergy({ bushels: readNum(bu.input), lb_per_bushel: readNum(lbbu.input), mi_percent: readNum(mi.input), mf_percent: readNum(mf.input), btu_per_lb: readNum(btu.input), price_per_gal: readNum(price.input) });
    if (r.error) { oWater.textContent = r.error; oEnergy.textContent = ""; oCost.textContent = ""; oNote.textContent = ""; return; }
    oWater.textContent = fmt(r.water_lb, 0) + " lb (of " + fmt(r.weight_lb, 0) + " lb)";
    oEnergy.textContent = fmt(r.energy_btu / 1e6, 2) + " million Btu, " + fmt(r.propane_gal, 0) + " gal propane";
    oCost.textContent = r.cost_usd == null ? "(enter a propane price)" : "$" + fmt(r.cost_usd, 2);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [bu.input, lbbu.input, mi.input, mf.input, btu.input, price.input]) f.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["grain-drying-energy"] = renderGrainDryingEnergy;

// dims: in { crop_n_need_lb_acre: dimensionless, total_n_lb_ton: dimensionless, availability_pct: dimensionless, p2o5_lb_ton: dimensionless, k2o_lb_ton: dimensionless } out: { avail_n_per_ton: dimensionless, rate_ton_acre: dimensionless, p2o5_applied: dimensionless, k2o_applied: dimensionless }
export function computeManureNutrientApplication({ crop_n_need_lb_acre = 0, total_n_lb_ton = 0, availability_pct = 0, p2o5_lb_ton = 0, k2o_lb_ton = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const need = Number(crop_n_need_lb_acre) || 0;
  const totalN = Number(total_n_lb_ton) || 0;
  const avail = Number(availability_pct) || 0;
  const p2o5 = Number(p2o5_lb_ton) || 0;
  const k2o = Number(k2o_lb_ton) || 0;
  if (!(need > 0)) return { error: "Crop nitrogen need must be positive (lb/acre)." };
  if (!(totalN > 0)) return { error: "Manure nitrogen content must be positive (lb/ton)." };
  if (!(avail > 0 && avail <= 100)) return { error: "Availability must be between 0 and 100%." };
  if (p2o5 < 0 || k2o < 0) return { error: "Phosphate and potash content must be non-negative (lb/ton)." };
  const avail_n_per_ton = totalN * avail / 100;
  const rate_ton_acre = need / avail_n_per_ton;
  const p2o5_applied = p2o5 > 0 ? rate_ton_acre * p2o5 : null;
  const k2o_applied = k2o > 0 ? rate_ton_acre * k2o : null;
  return {
    avail_n_per_ton, rate_ton_acre, p2o5_applied, k2o_applied,
    note: "Manure application rate set by the nitrogen need: the available N per ton = total N x the first-year availability (mineralization), and the rate = crop N need / available N per ton. Meeting the N need with manure also delivers whatever P2O5 and K2O ride along, and because manure is N-poor relative to P, an N-based rate usually over-applies phosphorus - the classic reason a nutrient-management plan switches to a P-based rate on high-P soils. This reports the P and K delivered so that over-application is visible. A planning aid; a manure test, the soil test, and the NRCS Code 590 nutrient-management plan govern.",
  };
}
export const manureNutrientApplicationExample = { inputs: { crop_n_need_lb_acre: 150, total_n_lb_ton: 10, availability_pct: 50, p2o5_lb_ton: 5, k2o_lb_ton: 8 } };
function renderManureNutrientApplication(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: N-based manure application rate (USDA NRCS Code 590 Nutrient Management): available N per ton = total N x first-year availability, rate = crop N need / available N per ton, with the P2O5 and K2O delivered at that rate reported so phosphorus over-application is visible. A planning aid; a manure test, the soil test, and the nutrient-management plan govern.";
  const need = makeNumber("Crop N need (lb/acre)", "mna-need", { step: "any", min: "0", value: "150" });
  const totalN = makeNumber("Manure total N (lb/ton)", "mna-tn", { step: "any", min: "0", value: "10" });
  const avail = makeNumber("First-year N availability (%)", "mna-av", { step: "any", min: "0", max: "100", value: "50" });
  const p2o5 = makeNumber("Manure P2O5 (lb/ton, optional)", "mna-p", { step: "any", min: "0", value: "5" });
  const k2o = makeNumber("Manure K2O (lb/ton, optional)", "mna-k", { step: "any", min: "0", value: "8" });
  for (const f of [need, totalN, avail, p2o5, k2o]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { need.input.value = "150"; totalN.input.value = "10"; avail.input.value = "50"; p2o5.input.value = "5"; k2o.input.value = "8"; update(); });
  const oRate = makeOutputLine(outputRegion, "Application rate (N-based)", "mna-out-rate");
  const oPK = makeOutputLine(outputRegion, "P2O5 / K2O also applied", "mna-out-pk");
  const oNote = makeOutputLine(outputRegion, "Note", "mna-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeManureNutrientApplication({ crop_n_need_lb_acre: readNum(need.input), total_n_lb_ton: readNum(totalN.input), availability_pct: readNum(avail.input), p2o5_lb_ton: readNum(p2o5.input), k2o_lb_ton: readNum(k2o.input) });
    if (r.error) { oRate.textContent = r.error; oPK.textContent = ""; oNote.textContent = ""; return; }
    oRate.textContent = fmt(r.rate_ton_acre, 1) + " ton/acre (" + fmt(r.avail_n_per_ton, 2) + " lb available N/ton)";
    oPK.textContent = (r.p2o5_applied == null ? "P2O5 -" : fmt(r.p2o5_applied, 0) + " lb P2O5") + " / " + (r.k2o_applied == null ? "K2O -" : fmt(r.k2o_applied, 0) + " lb K2O") + " per acre";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [need.input, totalN.input, avail.input, p2o5.input, k2o.input]) f.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["manure-nutrient-application"] = renderManureNutrientApplication;

// --- spec-v568 L: Center-pivot application depth and runtime ---
// hours = area x depth x 452.6 / flow. gross_gpm_per_acre = flow / area. net_depth = depth x eff / 100.
// dims: in { system_flow_gpm: L^3 T^-1, area_acres: L^2, target_depth_in: L, efficiency_pct: dimensionless } out: { hours: T, gross_gpm_per_acre: dimensionless, net_depth_in: L }
export function computeCenterPivotRuntime({ system_flow_gpm = 0, area_acres = 0, target_depth_in = 0, efficiency_pct = 85 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const flow = Number(system_flow_gpm) || 0;
  const area = Number(area_acres) || 0;
  const depth = Number(target_depth_in) || 0;
  const eff = Number(efficiency_pct) || 0;
  if (!(flow > 0)) return { error: "System flow must be positive (gpm)." };
  if (!(area > 0)) return { error: "Irrigated area must be positive (acres)." };
  if (!(depth > 0)) return { error: "Target depth must be positive (in)." };
  if (!(eff > 0 && eff <= 100)) return { error: "Efficiency must be over 0 and at most 100 (%)." };
  const hours = area * depth * 452.6 / flow;
  const gross_gpm_per_acre = flow / area;
  const net_depth_in = depth * eff / 100;
  return {
    hours, gross_gpm_per_acre, net_depth_in,
    note: "The depth is set by the outer-tower speed (percent timer), and the outer spans cover far more area than the inner ones, so a uniform depth needs increasing flow per foot outward. The instantaneous application rate under an outer span can exceed the soil intake rate and run off even when the daily depth is right - the depth sets the hours, not the runoff risk. The 452.6 factor converts acre-inches to gallons over minutes. The actual pivot design and soil intake govern.",
  };
}
export const centerPivotRuntimeExample = { inputs: { system_flow_gpm: 800, area_acres: 125, target_depth_in: 1.0, efficiency_pct: 85 } };

function _v568renderCenterPivotRuntime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: center-pivot application depth and runtime (USDA-NRCS center-pivot design; university extension), by name. hours = area x depth x 452.6 / flow; gross_gpm_per_acre = flow / area; net_depth = depth x efficiency / 100. The depth is set by the outer-tower speed; the outer spans cover more area, so the instantaneous application rate under an outer span can run off even when the daily depth is right. The pivot design and soil intake govern.";
  const flow = makeNumber("System flow Q (gpm)", "cpr-flow", { step: "any", min: "0", value: "800" }); flow.input.value = "800";
  const area = makeNumber("Irrigated area (acres)", "cpr-area", { step: "any", min: "0", value: "125" }); area.input.value = "125";
  const depth = makeNumber("Gross target depth (in)", "cpr-depth", { step: "any", min: "0", value: "1.0" }); depth.input.value = "1.0";
  const eff = makeNumber("Application efficiency (%)", "cpr-eff", { step: "any", min: "0", max: "100", value: "85" }); eff.input.value = "85";
  for (const f of [flow, area, depth, eff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { flow.input.value = "800"; area.input.value = "125"; depth.input.value = "1.0"; eff.input.value = "85"; update(); });
  const oHours = makeOutputLine(outputRegion, "Runtime per pass", "cpr-out-hours");
  const oGross = makeOutputLine(outputRegion, "Gross capacity per acre", "cpr-out-gross");
  const oNet = makeOutputLine(outputRegion, "Net depth applied", "cpr-out-net");
  const oNote = makeOutputLine(outputRegion, "Note", "cpr-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeCenterPivotRuntime({ system_flow_gpm: readNum(flow.input), area_acres: readNum(area.input), target_depth_in: readNum(depth.input), efficiency_pct: eff.input.value === "" ? 85 : readNum(eff.input) });
    if (r.error) { oHours.textContent = r.error; oGross.textContent = "-"; oNet.textContent = "-"; oNote.textContent = ""; return; }
    oHours.textContent = fmt(r.hours, 1) + " hr (" + fmt(r.hours / 24, 1) + " days)";
    oGross.textContent = fmt(r.gross_gpm_per_acre, 1) + " gpm/ac";
    oNet.textContent = fmt(r.net_depth_in, 2) + " in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [flow, area, depth, eff]) f.input.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["center-pivot-runtime"] = _v568renderCenterPivotRuntime;

// --- spec-v602 L: Center-pivot outer-span application rate vs soil intake ---
// speed = 2*pi*L/(T*60). wetting = W/speed. app_rate = D*2*pi*L/(T*W). exceeds if app_rate > intake.
// dims: in { pass_depth_in: L, pivot_length_ft: L, revolution_hr: T, wetted_band_ft: L, soil_intake_in_hr: dimensionless } out: { speed_ft_min: dimensionless, wetting_min: T, app_rate_in_hr: dimensionless, ratio: dimensionless }
export function computePivotApplicationRate({ pass_depth_in = 0, pivot_length_ft = 0, revolution_hr = 0, wetted_band_ft = 0, soil_intake_in_hr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D = Number(pass_depth_in) || 0;
  const L = Number(pivot_length_ft) || 0;
  const T = Number(revolution_hr) || 0;
  const W = Number(wetted_band_ft) || 0;
  const intake = Number(soil_intake_in_hr) || 0;
  if (!(D > 0)) return { error: "Pass depth must be positive (in)." };
  if (!(L > 0)) return { error: "Pivot length must be positive (ft)." };
  if (!(T > 0)) return { error: "Revolution time must be positive (hr)." };
  if (!(W > 0)) return { error: "Wetted band must be positive (ft)." };
  if (!(intake > 0)) return { error: "Soil intake rate must be positive (in/hr)." };
  const speed_ft_min = 2 * Math.PI * L / (T * 60);
  const wetting_min = W / speed_ft_min;
  const app_rate_in_hr = D * 2 * Math.PI * L / (T * W);
  const exceeds_intake = app_rate_in_hr > intake;
  const ratio = app_rate_in_hr / intake;
  return {
    speed_ft_min, wetting_min, app_rate_in_hr, exceeds_intake, ratio,
    note: "This is the average rate over the wetted band at the outer span; the true peak of a bell-shaped pattern runs a little higher (about 6% for an elliptical package). The outer end always governs because it moves fastest. Runoff is avoided in practice only by the short wetting time and a little surface storage, so a slope or a crusted or tight soil will run off when the rate exceeds the intake - slow the pivot, narrow the band, or pick a lower-rate package. The pivot design, the sprinkler package, and the measured soil intake govern - a design screen, not a runoff model.",
  };
}
export const pivotApplicationRateExample = { inputs: { pass_depth_in: 1.0, pivot_length_ft: 1320, revolution_hr: 24, wetted_band_ft: 100, soil_intake_in_hr: 0.5 } };
function _v602renderPivotApplicationRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: center-pivot outer-span application rate (USDA-NRCS center-pivot design; university extension), by name. speed = 2 x pi x pivot_length / (revolution_hr x 60); wetting = wetted_band / speed; app_rate = pass_depth x 2 x pi x pivot_length / (revolution_hr x wetted_band). This is the average rate over the wetted band at the outer span (the true peak runs about 6% higher); the outer end governs because it moves fastest. Runoff is avoided only by the short wetting time and surface storage, so a slope or a tight soil runs off when the rate exceeds the intake.";
  const D = makeNumber("Gross pass depth (in)", "par-d", { step: "any", min: "0", value: "1.0" }); D.input.value = "1.0";
  const L = makeNumber("Pivot length to outer tower (ft)", "par-l", { step: "any", min: "0", value: "1320" }); L.input.value = "1320";
  const T = makeNumber("Revolution time (hr)", "par-t", { step: "any", min: "0", value: "24" }); T.input.value = "24";
  const W = makeNumber("Wetted band at outer span (ft)", "par-w", { step: "any", min: "0", value: "100" }); W.input.value = "100";
  const intake = makeNumber("Soil intake rate (in/hr: sand ~1.0, loam ~0.5, clay ~0.15)", "par-i", { step: "any", min: "0", value: "0.5" }); intake.input.value = "0.5";
  for (const f of [D, L, T, W, intake]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { D.input.value = "1.0"; L.input.value = "1320"; T.input.value = "24"; W.input.value = "100"; intake.input.value = "0.5"; update(); });
  const oRate = makeOutputLine(outputRegion, "Outer-span application rate", "par-out-rate");
  const oWet = makeOutputLine(outputRegion, "Wetting time at a point", "par-out-wet");
  const oCheck = makeOutputLine(outputRegion, "Against soil intake", "par-out-check");
  const oNote = makeOutputLine(outputRegion, "Note", "par-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computePivotApplicationRate({ pass_depth_in: readNum(D.input), pivot_length_ft: readNum(L.input), revolution_hr: readNum(T.input), wetted_band_ft: readNum(W.input), soil_intake_in_hr: readNum(intake.input) });
    if (r.error) { oRate.textContent = r.error; oWet.textContent = "-"; oCheck.textContent = "-"; oNote.textContent = ""; return; }
    oRate.textContent = fmt(r.app_rate_in_hr, 2) + " in/hr";
    oWet.textContent = fmt(r.wetting_min, 1) + " min (" + fmt(r.speed_ft_min, 1) + " ft/min at the end tower)";
    oCheck.textContent = r.exceeds_intake ? fmt(r.ratio, 1) + "x the intake - RUNOFF RISK on a slope or a tight soil" : fmt(r.ratio, 2) + "x the intake - within the soil's intake rate";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [D, L, T, W, intake]) f.input.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["pivot-application-rate"] = _v602renderPivotApplicationRate;

// --- spec-v604 L: Center-pivot percent-timer to depth ---
// revolution = T100*100/timer. depth = Q*revolution/(452.6*A). pass_days = revolution/24.
// dims: in { system_flow_gpm: L^3 T^-1, area_acres: L^2, revolution_100_hr: T, timer_pct: dimensionless } out: { revolution_hr: T, depth_in: L, pass_days: T }
export function computePivotTimerDepth({ system_flow_gpm = 0, area_acres = 0, revolution_100_hr = 0, timer_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Q = Number(system_flow_gpm) || 0;
  const A = Number(area_acres) || 0;
  const T100 = Number(revolution_100_hr) || 0;
  const timer = Number(timer_pct) || 0;
  if (!(Q > 0)) return { error: "System flow must be positive (gpm)." };
  if (!(A > 0)) return { error: "Irrigated area must be positive (acres)." };
  if (!(T100 > 0)) return { error: "Full-speed revolution time must be positive (hr)." };
  if (!(timer > 0 && timer <= 100)) return { error: "Timer setting must be over 0 and at most 100 (%)." };
  const revolution_hr = T100 * 100 / timer;
  const depth_in = Q * revolution_hr / (452.6 * A);
  const pass_days = revolution_hr / 24;
  return {
    revolution_hr, depth_in, pass_days,
    note: "The timer sets the outer-tower speed, so the depth is inversely proportional to the setting - halving the timer doubles the depth, which irrigators get backwards constantly. The 452.6 factor converts acre-inches to gallons over minutes; the full-speed revolution time is the machine's rated maximum-speed pass. The pivot design, the actual field area under the machine, and the panel calibration govern - an operating aid, not a uniformity or scheduling design.",
  };
}
export const pivotTimerDepthExample = { inputs: { system_flow_gpm: 800, area_acres: 125, revolution_100_hr: 20, timer_pct: 50 } };
function _v604renderPivotTimerDepth(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: center-pivot percent-timer to depth (USDA-NRCS center-pivot design; university extension), by name. revolution = revolution_100_hr x 100 / timer_pct; depth = system_flow x revolution / (452.6 x area); pass_days = revolution / 24. The timer sets the outer-tower speed, so the depth is inversely proportional to the setting - halving the timer doubles the depth. The full-speed revolution time is the machine's rated maximum-speed pass.";
  const Q = makeNumber("System flow Q (gpm)", "ptd-q", { step: "any", min: "0", value: "800" }); Q.input.value = "800";
  const A = makeNumber("Irrigated area (acres)", "ptd-a", { step: "any", min: "0", value: "125" }); A.input.value = "125";
  const T100 = makeNumber("Revolution time at 100% timer (hr)", "ptd-t", { step: "any", min: "0", value: "20" }); T100.input.value = "20";
  const timer = makeNumber("End-tower timer setting (%)", "ptd-p", { step: "any", min: "0", max: "100", value: "50" }); timer.input.value = "50";
  for (const f of [Q, A, T100, timer]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { Q.input.value = "800"; A.input.value = "125"; T100.input.value = "20"; timer.input.value = "50"; update(); });
  const oRev = makeOutputLine(outputRegion, "Revolution time", "ptd-out-rev");
  const oDepth = makeOutputLine(outputRegion, "Gross depth per pass", "ptd-out-depth");
  const oDays = makeOutputLine(outputRegion, "Days per pass", "ptd-out-days");
  const oNote = makeOutputLine(outputRegion, "Note", "ptd-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computePivotTimerDepth({ system_flow_gpm: readNum(Q.input), area_acres: readNum(A.input), revolution_100_hr: readNum(T100.input), timer_pct: readNum(timer.input) });
    if (r.error) { oRev.textContent = r.error; oDepth.textContent = "-"; oDays.textContent = "-"; oNote.textContent = ""; return; }
    oRev.textContent = fmt(r.revolution_hr, 1) + " hr";
    oDepth.textContent = fmt(r.depth_in, 3) + " in";
    oDays.textContent = fmt(r.pass_days, 2) + " days";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [Q, A, T100, timer]) f.input.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["pivot-timer-depth"] = _v604renderPivotTimerDepth;

// --- spec-v569 L: Stored-grain aeration fan airflow ---
// required_cfm = rate x bushels. cooling_hours = 15 / rate.
// dims: in { bin_capacity_bu: dimensionless, airflow_rate: dimensionless } out: { required_cfm: L^3 T^-1, cooling_hours: T }
export function computeGrainAerationAirflow({ bin_capacity_bu = 0, airflow_rate = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const bu = Number(bin_capacity_bu) || 0;
  const rate = Number(airflow_rate) || 0;
  if (!(bu > 0)) return { error: "Bin capacity must be positive (bushels)." };
  if (!(rate > 0)) return { error: "Airflow rate must be positive (cfm/bu)." };
  const required_cfm = rate * bu;
  const cooling_hours = 15 / rate;
  const mode = rate >= 0.5 ? "natural-air drying" : rate >= 0.1 ? "aeration cooling" : "low-rate aeration";
  return {
    required_cfm, cooling_hours, mode,
    note: "Static pressure rises steeply with grain depth, and fan power grows about fourfold when the airflow rate or the depth doubles - so a fan sized on cfm/bu alone stalls against back-pressure in a tall bin, and the fan curve must be read at the actual static pressure. Aeration cooling (0.1-0.25 cfm/bu) is NOT the same job as natural-air drying (0.5-1.0 cfm/bu) - mixing them up either wastes fan or fails to dry. A sizing aid; the fan selection at the design static pressure and the grain condition govern.",
  };
}
export const grainAerationAirflowExample = { inputs: { bin_capacity_bu: 20000, airflow_rate: 0.15 } };

function _v569renderGrainAerationAirflow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: stored-grain aeration fan airflow (MWPS / university extension; Shedd airflow-resistance curves), by name. required_cfm = rate_cfm_per_bu x bushels; cooling_hours = 15 / rate (per cooling front). Bands: aeration cooling 0.1-0.25 cfm/bu, natural-air drying 0.5-1.0 cfm/bu. Static pressure rises steeply with depth and fan power grows ~fourfold when the rate or depth doubles - read the fan curve at the actual static pressure. The fan selection and grain condition govern.";
  const bu = makeNumber("Stored grain (bushels)", "gaa-bu", { step: "any", min: "0", value: "20000" }); bu.input.value = "20000";
  const rate = makeNumber("Target airflow (cfm/bu, 0.1-0.25 cool, 0.5-1.0 dry)", "gaa-rate", { step: "any", min: "0", value: "0.15" }); rate.input.value = "0.15";
  for (const f of [bu, rate]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { bu.input.value = "20000"; rate.input.value = "0.15"; update(); });
  const oCfm = makeOutputLine(outputRegion, "Required fan airflow", "gaa-out-cfm");
  const oHours = makeOutputLine(outputRegion, "Approx. cooling time / mode", "gaa-out-hours");
  const oNote = makeOutputLine(outputRegion, "Note", "gaa-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeGrainAerationAirflow({ bin_capacity_bu: readNum(bu.input), airflow_rate: readNum(rate.input) });
    if (r.error) { oCfm.textContent = r.error; oHours.textContent = "-"; oNote.textContent = ""; return; }
    oCfm.textContent = fmt(r.required_cfm, 0) + " cfm";
    oHours.textContent = fmt(r.cooling_hours, 0) + " hr per cooling front (" + r.mode + ")";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [bu, rate]) f.input.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["grain-aeration-airflow"] = _v569renderGrainAerationAirflow;

// --- spec-v582 L: NRCS 313 waste storage facility volume ---
// manure = (daily_manure+wastewater+bedding)*storage_days. precip_storm = area*(net_precip+storm)/12. freeboard = area*freeboard/12. total = sum.
// dims: in { daily_manure_ft3: L^3 T^-1, wastewater_ft3: L^3 T^-1, bedding_ft3: L^3 T^-1, storage_days: T, surface_area_ft2: L^2, net_precip_in: L, storm_in: L, freeboard_in: L } out: { manure_volume_ft3: L^3, precip_storm_ft3: L^3, freeboard_ft3: L^3, total_ft3: L^3, total_gal: L^3 }
export function computeManureStorageVolume({ daily_manure_ft3 = 0, wastewater_ft3 = 0, bedding_ft3 = 0, storage_days = 0, surface_area_ft2 = 0, net_precip_in = 0, storm_in = 0, freeboard_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const manure = Number(daily_manure_ft3) || 0;
  const ww = Number(wastewater_ft3) || 0;
  const bed = Number(bedding_ft3) || 0;
  const days = Number(storage_days) || 0;
  const area = Number(surface_area_ft2) || 0;
  const precip = Number(net_precip_in) || 0;
  const storm = Number(storm_in) || 0;
  const fb = Number(freeboard_in) || 0;
  if (!(manure > 0)) return { error: "Daily manure production must be positive (ft3/day)." };
  if (!(days > 0)) return { error: "Storage period must be positive (days)." };
  if (ww < 0 || bed < 0) return { error: "Added wastewater and bedding cannot be negative (ft3/day)." };
  if (area < 0) return { error: "Surface area cannot be negative (ft2)." };
  if (precip < 0 || storm < 0) return { error: "Net precipitation and storm depth cannot be negative (in)." };
  if (fb < 0) return { error: "Freeboard cannot be negative (in)." };
  const manure_volume_ft3 = (manure + ww + bed) * days;
  const precip_storm_ft3 = area * (precip + storm) / 12;
  const freeboard_ft3 = area * fb / 12;
  const total_ft3 = manure_volume_ft3 + precip_storm_ft3 + freeboard_ft3;
  const total_gal = total_ft3 * 7.48052;
  const short_days = days < 120;
  return {
    manure_volume_ft3, precip_storm_ft3, freeboard_ft3, total_ft3, total_gal, short_days,
    note: "An uncovered liquid facility must bank the net precipitation and the 25-year, 24-hour storm falling on its own surface over the storage period - sizing to manure alone overtops in a wet spring. The minimum storage is 120 days (or the nutrient-management plan), and freeboard is 6 inches for a vertical-wall tank and 12 inches for other structures. NRCS 313 and the engineer/planner govern - a planning aid, not the engineer of record.",
  };
}
export const manureStorageVolumeExample = { inputs: { daily_manure_ft3: 150, wastewater_ft3: 0, bedding_ft3: 20, storage_days: 120, surface_area_ft2: 8000, net_precip_in: 6, storm_in: 4, freeboard_in: 12 } };
function _v582renderManureStorageVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A planning aid, not the engineer of record; NRCS 313 and the engineer/planner govern. Citation: NRCS Conservation Practice Standard 313 / ASABE D384 manure production, by name. manure = (daily + wastewater + bedding) x storage_days; precip_storm = area x (net_precip + storm) / 12; freeboard = area x freeboard_in / 12; total = the sum. An uncovered facility must bank the net precipitation and the 25-year, 24-hour storm over the storage period; minimum storage is 120 days; freeboard is 6 in (vertical wall) or 12 in (other).";
  const manure = makeNumber("Daily manure (ft3/day = head x rate)", "msv-manure", { step: "any", min: "0", value: "150" }); manure.input.value = "150";
  const ww = makeNumber("Added wastewater (ft3/day, 0 if none)", "msv-ww", { step: "any", min: "0", value: "0" }); ww.input.value = "0";
  const bed = makeNumber("Added bedding (ft3/day, 0 if none)", "msv-bed", { step: "any", min: "0", value: "20" }); bed.input.value = "20";
  const days = makeNumber("Storage period (days, >= 120)", "msv-days", { step: "any", min: "0", value: "120" }); days.input.value = "120";
  const area = makeNumber("Surface area (ft2, 0 if roofed)", "msv-area", { step: "any", min: "0", value: "8000" }); area.input.value = "8000";
  const precip = makeNumber("Net precipitation over period (in)", "msv-precip", { step: "any", min: "0", value: "6" }); precip.input.value = "6";
  const storm = makeNumber("25-yr 24-hr storm depth (in)", "msv-storm", { step: "any", min: "0", value: "4" }); storm.input.value = "4";
  const fb = makeNumber("Freeboard (in: 6 vertical wall / 12 other)", "msv-fb", { step: "any", min: "0", value: "12" }); fb.input.value = "12";
  for (const f of [manure, ww, bed, days, area, precip, storm, fb]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { manure.input.value = "150"; ww.input.value = "0"; bed.input.value = "20"; days.input.value = "120"; area.input.value = "8000"; precip.input.value = "6"; storm.input.value = "4"; fb.input.value = "12"; update(); });
  const oManure = makeOutputLine(outputRegion, "Manure + wastewater + bedding volume", "msv-out-manure");
  const oPrecip = makeOutputLine(outputRegion, "Precipitation + 25-yr storm volume", "msv-out-precip");
  const oFree = makeOutputLine(outputRegion, "Freeboard volume", "msv-out-free");
  const oTotal = makeOutputLine(outputRegion, "Total required storage", "msv-out-total");
  const oNote = makeOutputLine(outputRegion, "Note", "msv-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeManureStorageVolume({ daily_manure_ft3: readNum(manure.input), wastewater_ft3: readNum(ww.input), bedding_ft3: readNum(bed.input), storage_days: readNum(days.input), surface_area_ft2: readNum(area.input), net_precip_in: readNum(precip.input), storm_in: readNum(storm.input), freeboard_in: readNum(fb.input) });
    if (r.error) { oManure.textContent = r.error; oPrecip.textContent = "-"; oFree.textContent = "-"; oTotal.textContent = "-"; oNote.textContent = ""; return; }
    oManure.textContent = fmt(r.manure_volume_ft3, 0) + " ft3";
    oPrecip.textContent = fmt(r.precip_storm_ft3, 0) + " ft3";
    oFree.textContent = fmt(r.freeboard_ft3, 0) + " ft3";
    oTotal.textContent = fmt(r.total_ft3, 0) + " ft3 (" + fmt(r.total_gal, 0) + " gal)" + (r.short_days ? " - under the 120-day minimum" : "");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [manure, ww, bed, days, area, precip, storm, fb]) f.input.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["manure-storage-volume"] = _v582renderManureStorageVolume;

// --- spec-v606 L: Manure storage covered-vs-open roof savings ---
// open = (manure+ww+bed)*days + area*(precip+storm)/12 + area*fb/12. roof_saving = area*(precip+storm)/12. covered = open - roof_saving.
// dims: in { daily_manure_ft3: L^3 T^-1, wastewater_ft3: L^3 T^-1, bedding_ft3: L^3 T^-1, storage_days: T, surface_area_ft2: L^2, net_precip_in: L, storm_in: L, freeboard_in: L } out: { open_ft3: L^3, covered_ft3: L^3, roof_saving_ft3: L^3, roof_saving_gal: L^3, percent_saved: dimensionless }
export function computeManureCoverSavings({ daily_manure_ft3 = 0, wastewater_ft3 = 0, bedding_ft3 = 0, storage_days = 0, surface_area_ft2 = 0, net_precip_in = 0, storm_in = 0, freeboard_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const manure = Number(daily_manure_ft3) || 0;
  const ww = Number(wastewater_ft3) || 0;
  const bed = Number(bedding_ft3) || 0;
  const days = Number(storage_days) || 0;
  const area = Number(surface_area_ft2) || 0;
  const precip = Number(net_precip_in) || 0;
  const storm = Number(storm_in) || 0;
  const fb = Number(freeboard_in) || 0;
  if (!(manure > 0)) return { error: "Daily manure production must be positive (ft3/day)." };
  if (!(days > 0)) return { error: "Storage period must be positive (days)." };
  if (!(area > 0)) return { error: "Surface area must be positive (ft2) - there is nothing for a roof to cover." };
  if (ww < 0 || bed < 0) return { error: "Added wastewater and bedding cannot be negative (ft3/day)." };
  if (precip < 0 || storm < 0) return { error: "Net precipitation and storm depth cannot be negative (in)." };
  if (fb < 0) return { error: "Freeboard cannot be negative (in)." };
  const manure_volume_ft3 = (manure + ww + bed) * days;
  const roof_saving_ft3 = area * (precip + storm) / 12;
  const freeboard_ft3 = area * fb / 12;
  const open_ft3 = manure_volume_ft3 + roof_saving_ft3 + freeboard_ft3;
  const covered_ft3 = open_ft3 - roof_saving_ft3;
  const roof_saving_gal = roof_saving_ft3 * 7.48052;
  const percent_saved = open_ft3 > 0 ? roof_saving_ft3 / open_ft3 * 100 : 0;
  return {
    open_ft3, covered_ft3, roof_saving_ft3, roof_saving_gal, percent_saved,
    note: "The roof saving is the net precipitation and the 25-year, 24-hour storm the open facility must otherwise bank on its own surface. The freeboard is held the same in both cases (a conservatism - a roofed structure can often carry less). The saving is clean rainwater the operation also avoids hauling and land-applying, so the payback is both smaller storage and less spreading. NRCS 313 and the engineer/planner govern - a planning aid, not the engineer of record.",
  };
}
export const manureCoverSavingsExample = { inputs: { daily_manure_ft3: 150, wastewater_ft3: 0, bedding_ft3: 20, storage_days: 120, surface_area_ft2: 8000, net_precip_in: 6, storm_in: 4, freeboard_in: 12 } };
function _v606renderManureCoverSavings(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: manure storage covered-vs-open comparison (USDA-NRCS Conservation Practice 313 waste storage facility), by name. open = (manure + wastewater + bedding) x days + area x (net_precip + storm)/12 + area x freeboard/12; roof_saving = area x (net_precip + storm)/12; covered = open - roof_saving. The roof saving is the net precipitation and the 25-year, 24-hour storm the open facility must otherwise bank on its own surface; the freeboard is held the same in both cases. The saving is clean rainwater the operation also avoids hauling.";
  const manure = makeNumber("Daily manure (ft3/day)", "mcs-manure", { step: "any", min: "0", value: "150" }); manure.input.value = "150";
  const ww = makeNumber("Added wastewater (ft3/day)", "mcs-ww", { step: "any", min: "0", value: "0" }); ww.input.value = "0";
  const bed = makeNumber("Added bedding (ft3/day)", "mcs-bed", { step: "any", min: "0", value: "20" }); bed.input.value = "20";
  const days = makeNumber("Storage period (days)", "mcs-days", { step: "any", min: "0", value: "120" }); days.input.value = "120";
  const area = makeNumber("Surface / roof area (ft2)", "mcs-area", { step: "any", min: "0", value: "8000" }); area.input.value = "8000";
  const precip = makeNumber("Net precipitation over the period (in)", "mcs-precip", { step: "any", min: "0", value: "6" }); precip.input.value = "6";
  const storm = makeNumber("25-yr 24-hr storm depth (in)", "mcs-storm", { step: "any", min: "0", value: "4" }); storm.input.value = "4";
  const fb = makeNumber("Freeboard (in: 6 vertical wall, 12 other)", "mcs-fb", { step: "any", min: "0", value: "12" }); fb.input.value = "12";
  for (const f of [manure, ww, bed, days, area, precip, storm, fb]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { manure.input.value = "150"; ww.input.value = "0"; bed.input.value = "20"; days.input.value = "120"; area.input.value = "8000"; precip.input.value = "6"; storm.input.value = "4"; fb.input.value = "12"; update(); });
  const oOpen = makeOutputLine(outputRegion, "Open facility volume", "mcs-out-open");
  const oCovered = makeOutputLine(outputRegion, "Covered (roofed) volume", "mcs-out-covered");
  const oSave = makeOutputLine(outputRegion, "Volume a roof saves", "mcs-out-save");
  const oNote = makeOutputLine(outputRegion, "Note", "mcs-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeManureCoverSavings({ daily_manure_ft3: readNum(manure.input), wastewater_ft3: readNum(ww.input), bedding_ft3: readNum(bed.input), storage_days: readNum(days.input), surface_area_ft2: readNum(area.input), net_precip_in: readNum(precip.input), storm_in: readNum(storm.input), freeboard_in: readNum(fb.input) });
    if (r.error) { oOpen.textContent = r.error; oCovered.textContent = "-"; oSave.textContent = "-"; oNote.textContent = ""; return; }
    oOpen.textContent = fmt(r.open_ft3, 0) + " ft3";
    oCovered.textContent = fmt(r.covered_ft3, 0) + " ft3";
    oSave.textContent = fmt(r.roof_saving_ft3, 0) + " ft3 (" + fmt(r.roof_saving_gal, 0) + " gal, " + fmt(r.percent_saved, 0) + "% of the facility)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [manure, ww, bed, days, area, precip, storm, fb]) f.input.addEventListener("input", update);
}
AGRICULTURE_RENDERERS["manure-cover-savings"] = _v606renderManureCoverSavings;
