// Group L: Agriculture and Forestry (utilities 203-209).
// See spec-v4.md section 2.3.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// --- 203: Chemical Application Rate (GPA) ---
//
// GPA = (5940 * GPM) / (speed_mph * spacing_in)

export function computeGPA({ gpm = 0, spacing_in = 0, speed_mph = 0, target_gpa = 0 }) {
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

export function computeTimberCruise({ small_end_dib_in = 0, log_length_ft = 16, rule = "doyle" }) {
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
  return { board_feet: bf, rule, note };
}

export const timberCruiseExample = { inputs: { small_end_dib_in: 14, log_length_ft: 16, rule: "doyle" } };

// --- 205: Planting Density and Seed Rate ---

export function computeSeedRate({ row_width_in = 0, in_row_spacing_in = 0, target_pop_per_acre = 0, seeds_per_lb = 0, germination_pct = 100, seed_price_per_lb = 0 }) {
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

export function computeDrawbarPower({ pull_lb = 0, speed_mph = 0, surface = "firm_soil" }) {
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

export function computeBulkDensity({ dry_mass_g = 0, core_volume_cc = 0, particle_density_pcc = 2.65, texture = "loam" }) {
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

export function computeCropYield({
  crop = "corn", rows_per_pass = 1, row_spacing_in = 30, measured_length_ft = 0,
  weight_in_strip_lb = 0, current_moisture_pct = 0, ground_loss_lb_in_area = 0,
  ground_loss_area_ft2 = 0,
}) {
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
  ],
  outputs: [
    { key: "bf", id: "tc-out-bf", label: "Board feet", value: (r) => fmt(r.board_feet, 1) },
    { key: "n",  id: "tc-out-n",  label: "Note",       value: (r) => r.note },
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
    const v = document.createElement("input"); v.type = "number"; v.step = "any"; v.min = "0"; v.placeholder = "Catch can " + (i + 1);
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

export const AGRICULTURE_RENDERERS = {
  "gpa-rate":      renderGPA,
  "timber-cruise": renderTimberCruise,
  "seed-rate":     renderSeedRate,
  "drawbar-power": renderDrawbarPower,
  "irrigation-uniformity": renderUniformity,
  "bulk-density":  renderBulkDensity,
  "crop-yield":    renderCropYield,
};
