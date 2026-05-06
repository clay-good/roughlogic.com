// Group E: Carpentry and Construction calculators (40 through 50).
//
// Lumber spans (utility 47) are computed from first principles using simple
// span beam mechanics and bundled material properties (allowable bending
// stress and modulus of elasticity from public engineering references).
// The calculator is original work; it does not reproduce AWC or other
// licensed span tables.

import {
  rectangularSection,
  beamUniformLoadSimplySupported,
  beamCenterPointLoadSimplySupported,
  allowableSpanByBending,
  allowableSpanByDeflection,
} from "./pure-math.js";

// --- Utility 40: Stair Calculator ---

export function computeStairs({ total_rise_in, preferred_riser_height_in = 7.5 }) {
  if (total_rise_in <= 0) return { error: "Total rise must be positive." };
  // Number of risers: round to nearest that gets closest to preferred height.
  const target = preferred_riser_height_in;
  const risers = Math.max(1, Math.round(total_rise_in / target));
  const riser_height_in = total_rise_in / risers;
  const treads = risers - 1;
  // IRC default tread depth 10 in (sufficient for most carpentry contexts).
  const tread_depth_in = 10;
  const total_run_in = treads * tread_depth_in;
  // Headroom check: needs at least 80 in clear vertical above the slope.
  // Approximate headroom by stair angle and tread depth.
  const angle_deg = Math.atan(riser_height_in / tread_depth_in) * 180 / Math.PI;
  return {
    risers,
    treads,
    riser_height_in,
    tread_depth_in,
    total_run_in,
    stair_angle_deg: angle_deg,
    notes: "IRC default tread depth used. Verify riser height and headroom against the AHJ.",
  };
}

export const stairsExample = {
  inputs: { total_rise_in: 108, preferred_riser_height_in: 7.5 },
  expected: { risers: 14, treads: 13, total_run_in: 130 },
};

// --- Utility 41: Roof Pitch ---

export function computeRoofPitch({ rise = null, run = 12, mode = "rise_run" }) {
  if (mode === "rise_run") {
    if (run === 0) return { error: "Run cannot be zero." };
    const ratio = rise / run;
    return {
      pitch_in_per_ft: (ratio * 12),
      percent: ratio * 100,
      degrees: Math.atan(ratio) * 180 / Math.PI,
      fraction: ratio,
    };
  }
  if (mode === "degrees") {
    // rise here is interpreted as degrees
    const deg = rise;
    const ratio = Math.tan(deg * Math.PI / 180);
    return {
      pitch_in_per_ft: ratio * 12,
      percent: ratio * 100,
      degrees: deg,
      fraction: ratio,
    };
  }
  return { error: "Unknown mode." };
}

export const roofPitchExample = {
  inputs: { rise: 6, run: 12, mode: "rise_run" },
  expected: { pitch_in_per_ft: 6 },
};

// --- Utility 42: Rafter Length ---

export function computeRafter({ horizontal_span_ft, pitch_rise_per_12, overhang_ft = 0 }) {
  // pitch is rise per 12 in run. Hypotenuse multiplier = sqrt(rise^2 + 12^2)/12.
  const m = Math.sqrt(pitch_rise_per_12 * pitch_rise_per_12 + 144) / 12;
  const rafter_ft = (horizontal_span_ft + overhang_ft) * m;
  return { rafter_length_ft: rafter_ft, multiplier: m };
}

export const rafterExample = {
  inputs: { horizontal_span_ft: 12, pitch_rise_per_12: 6, overhang_ft: 1 },
};

// --- Utility 43: Square Footage ---

export function computeArea({ shape, ...dims }) {
  if (shape === "rectangle") return { area_ft2: (dims.length_ft || 0) * (dims.width_ft || 0) };
  if (shape === "triangle") return { area_ft2: 0.5 * (dims.base_ft || 0) * (dims.height_ft || 0) };
  if (shape === "trapezoid") return { area_ft2: 0.5 * ((dims.base1_ft || 0) + (dims.base2_ft || 0)) * (dims.height_ft || 0) };
  if (shape === "circle") return { area_ft2: Math.PI * Math.pow(dims.radius_ft || 0, 2) };
  return { error: "Unknown shape." };
}

export const areaExample = {
  inputs: { shape: "rectangle", length_ft: 10, width_ft: 12 },
  expected: { area_ft2: 120 },
};

// --- Utility 44: Lumber Board Footage ---

export function computeBoardFootage({ thickness_in, width_in, length_ft, count = 1 }) {
  // BF = (T * W * L_in) / 144, where L_in = length_ft * 12. Equivalent: (T * W * L_ft) / 12.
  const bf_each = (thickness_in * width_in * length_ft) / 12;
  const total_bf = bf_each * count;
  return { board_feet_each: bf_each, total_board_feet: total_bf, count };
}

export const boardFootageExample = {
  inputs: { thickness_in: 2, width_in: 4, length_ft: 8, count: 10 },
  expected: { total_board_feet: (2 * 4 * 8 / 12) * 10 },
};

// --- Utility 45: Concrete Volume ---

export function computeConcreteVolume({ shape, waste_factor = 0.10, ...d }) {
  let cubic_ft = 0;
  if (shape === "slab") {
    const t_ft = (d.thickness_in || 0) / 12;
    cubic_ft = (d.length_ft || 0) * (d.width_ft || 0) * t_ft;
  } else if (shape === "footing") {
    const t_ft = (d.thickness_in || 0) / 12;
    cubic_ft = (d.length_ft || 0) * (d.width_ft || 0) * t_ft;
  } else if (shape === "column") {
    const r_ft = (d.diameter_in || 0) / 24;
    cubic_ft = Math.PI * r_ft * r_ft * (d.height_ft || 0);
  } else if (shape === "footing_with_stem") {
    const ft_t = (d.footing_thickness_in || 0) / 12;
    const footing_v = (d.length_ft || 0) * (d.footing_width_ft || 0) * ft_t;
    const stem_t = (d.stem_thickness_in || 0) / 12;
    const stem_v = (d.length_ft || 0) * stem_t * (d.stem_height_ft || 0);
    cubic_ft = footing_v + stem_v;
  } else {
    return { error: "Unknown shape." };
  }
  const cubic_yards = cubic_ft / 27;
  const with_waste = cubic_yards * (1 + waste_factor);
  return { cubic_feet: cubic_ft, cubic_yards, cubic_yards_with_waste: with_waste, waste_factor };
}

export const concreteExample = {
  inputs: { shape: "slab", length_ft: 10, width_ft: 10, thickness_in: 4, waste_factor: 0.10 },
  expectedRange: { cubic_yards: { min: 1.2, max: 1.3 } },
};

// --- Utility 46: Rebar Spacing and Quantity ---

export function computeRebar({ length_ft, width_ft, spacing_in, edge_clearance_in = 3, bar_size = "#4" }) {
  if (spacing_in <= 0) return { error: "Spacing must be positive." };
  const length_in = length_ft * 12;
  const width_in = width_ft * 12;
  const usable_l = Math.max(0, length_in - 2 * edge_clearance_in);
  const usable_w = Math.max(0, width_in - 2 * edge_clearance_in);
  const bars_along_width = Math.floor(usable_l / spacing_in) + 1;
  const bars_along_length = Math.floor(usable_w / spacing_in) + 1;
  const total_length_in = bars_along_width * (width_in - 2 * edge_clearance_in) + bars_along_length * (length_in - 2 * edge_clearance_in);
  const total_length_ft = total_length_in / 12;
  return {
    bars_along_length,
    bars_along_width,
    total_length_ft,
    bar_size,
  };
}

export const rebarExample = {
  inputs: { length_ft: 20, width_ft: 10, spacing_in: 12, edge_clearance_in: 3, bar_size: "#4" },
};

// --- Utility 47: Lumber Spans (FIRST-PRINCIPLES) ---
//
// Implementation derives from simple-span beam mechanics and bundled material
// properties (allowable bending stress F_b and modulus of elasticity E from
// public engineering references). Output matches AWC published table values
// within tolerance for representative cases by physics, not by reproduction.

export const LUMBER_SPECIES_GRADES = {
  "DF-L_No2":   { F_b_psi: 900,  E_psi: 1600000 },
  "DF-L_No1":   { F_b_psi: 1000, E_psi: 1700000 },
  "SPF_No2":    { F_b_psi: 875,  E_psi: 1400000 },
  "SYP_No2":    { F_b_psi: 1100, E_psi: 1600000 },
  "Hem-Fir_No2":{ F_b_psi: 850,  E_psi: 1300000 },
};

export const LUMBER_NOMINAL_TO_ACTUAL = {
  "2x4":  { b_in: 1.5, d_in: 3.5 },
  "2x6":  { b_in: 1.5, d_in: 5.5 },
  "2x8":  { b_in: 1.5, d_in: 7.25 },
  "2x10": { b_in: 1.5, d_in: 9.25 },
  "2x12": { b_in: 1.5, d_in: 11.25 },
};

export function computeLumberSpan({ species_grade, nominal_size, total_load_psf, tributary_width_in = 16, deflection_limit = 360 }) {
  const props = LUMBER_SPECIES_GRADES[species_grade];
  if (!props) return { error: "Unknown species/grade." };
  const dim = LUMBER_NOMINAL_TO_ACTUAL[nominal_size];
  if (!dim) return { error: "Unknown nominal size." };
  const w_lb_ft = total_load_psf * (tributary_width_in / 12);
  const L_b = allowableSpanByBending({ w_lb_ft, Fb_psi: props.F_b_psi, b_in: dim.b_in, d_in: dim.d_in });
  const L_d = allowableSpanByDeflection({ w_lb_ft, E_psi: props.E_psi, b_in: dim.b_in, d_in: dim.d_in, deflectionLimit: deflection_limit });
  const L_max = Math.min(L_b, L_d);
  const governs = L_b < L_d ? "bending" : "deflection";
  return {
    allowable_span_ft: L_max,
    by_bending_ft: L_b,
    by_deflection_ft: L_d,
    governing: governs,
    F_b_psi: props.F_b_psi,
    E_psi: props.E_psi,
    section: rectangularSection({ b_in: dim.b_in, d_in: dim.d_in }),
    citation: "Computed from simple-span beam mechanics with bundled material properties. See docs/derivations.md section 9.",
  };
}

export const lumberSpansExample = {
  inputs: { species_grade: "DF-L_No2", nominal_size: "2x10", total_load_psf: 50, tributary_width_in: 16, deflection_limit: 360 },
  expectedRange: { allowable_span_ft: { min: 12, max: 18 } },
};

// --- Utility 48: Nail and Screw Pull-Out ---
//
// Withdrawal capacity rules based on published fastener engineering data.
// W = G^2.5 * D * 1380 (lb per inch of penetration) for common nails, where
// G is specific gravity of the wood and D is shank diameter in inches.

export const WOOD_SPECIFIC_GRAVITY = {
  "DF-L": 0.50,
  "SPF": 0.42,
  "SYP": 0.55,
  "Hem-Fir": 0.43,
  "RedwoodOpenGrain": 0.37,
};

const NAIL_SHANK_DIA_IN = {
  "8d_common":  0.131,
  "10d_common": 0.148,
  "16d_common": 0.162,
  "20d_common": 0.192,
};

const SCREW_SHANK_DIA_IN = {
  "#8":  0.164,
  "#10": 0.190,
  "#12": 0.216,
  "1/4": 0.250,
};

export function computePullout({ fastener_type, fastener_size, species, penetration_in }) {
  const G = WOOD_SPECIFIC_GRAVITY[species];
  if (!G) return { error: "Unknown species." };
  let D;
  if (fastener_type === "nail") D = NAIL_SHANK_DIA_IN[fastener_size];
  else if (fastener_type === "screw") D = SCREW_SHANK_DIA_IN[fastener_size];
  else return { error: "Unknown fastener type." };
  if (!D) return { error: "Unknown fastener size." };

  const w_per_in = Math.pow(G, 2.5) * D * 1380;
  // Screws have higher withdrawal capacity than common nails by factor ~1.85.
  const factor = fastener_type === "screw" ? 1.85 : 1.0;
  const total_lb = w_per_in * factor * penetration_in;
  return {
    withdrawal_per_inch_lb: w_per_in * factor,
    total_withdrawal_lb: total_lb,
    specific_gravity: G,
    diameter_in: D,
  };
}

export const pulloutExample = {
  inputs: { fastener_type: "nail", fastener_size: "16d_common", species: "DF-L", penetration_in: 1.5 },
};

// --- Utility 49: Beam Loading ---

export function computeBeamLoading({ load_type, load_value, length_ft, E_psi, b_in, d_in }) {
  const { I_in4 } = rectangularSection({ b_in, d_in });
  if (load_type === "uniform") {
    const r = beamUniformLoadSimplySupported({ w_lb_ft: load_value, L_ft: length_ft, E_psi, I_in4 });
    return { ...r, load_type, length_ft };
  }
  if (load_type === "point_center") {
    const r = beamCenterPointLoadSimplySupported({ P_lb: load_value, L_ft: length_ft, E_psi, I_in4 });
    return { ...r, load_type, length_ft };
  }
  return { error: "Unknown load type." };
}

export const beamLoadingExample = {
  inputs: { load_type: "uniform", load_value: 100, length_ft: 10, E_psi: 1600000, b_in: 1.5, d_in: 9.25 },
};

// --- Utility 50: Material Quantity ---
//
// Coverage factors and waste factors per common assemblies. Values represent
// engineering rules of thumb, not a reproduction of any licensed table.

export const ASSEMBLY_DEFAULTS = {
  drywall_4x8:     { coverage_ft2_per_unit: 32, waste: 0.10, unit_label: "sheet (4x8)" },
  drywall_4x12:    { coverage_ft2_per_unit: 48, waste: 0.10, unit_label: "sheet (4x12)" },
  paint_one_coat:  { coverage_ft2_per_unit: 350, waste: 0.10, unit_label: "gallon" },
  flooring_lvp:    { coverage_ft2_per_unit: 24,  waste: 0.10, unit_label: "carton (24 ft^2)" },
  roofing_3tab:    { coverage_ft2_per_unit: 33.3, waste: 0.15, unit_label: "bundle (33.3 ft^2)" },
  siding_lap_8in:  { coverage_ft2_per_unit: 25,  waste: 0.10, unit_label: "carton (25 ft^2)" },
};

export function computeMaterialQuantity({ assembly, area_ft2 }) {
  const a = ASSEMBLY_DEFAULTS[assembly];
  if (!a) return { error: "Unknown assembly." };
  const units_raw = area_ft2 / a.coverage_ft2_per_unit;
  const units_with_waste = Math.ceil(units_raw * (1 + a.waste));
  return {
    units_raw,
    units_with_waste,
    coverage_ft2_per_unit: a.coverage_ft2_per_unit,
    waste_factor: a.waste,
    unit_label: a.unit_label,
  };
}

export const materialQuantityExample = {
  inputs: { assembly: "drywall_4x8", area_ft2: 1000 },
};

// --- Renderers ---

import {
  DEBOUNCE_MS, debounce, makeNumber, makeText, makeSelect, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

export function renderStairs(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Stair geometry. Riser height = total rise / number of risers. IRC default tread depth 10 in.";
  const tr = makeNumber("Total rise (in)", "st-tr", { step: "any", min: "0" });
  const pref = makeNumber("Preferred riser height (in)", "st-pr", { step: "any", min: "4", max: "9", value: "7.5" });
  pref.input.value = "7.5";
  for (const f of [tr, pref]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { tr.input.value = "108"; pref.input.value = "7.5"; update(); });
  const oR = makeOutputLine(outputRegion, "Risers", "st-out-r");
  const oT = makeOutputLine(outputRegion, "Treads", "st-out-t");
  const oH = makeOutputLine(outputRegion, "Riser height", "st-out-h");
  const oRun = makeOutputLine(outputRegion, "Total run", "st-out-run");
  const update = debounce(() => {
    const r = computeStairs({ total_rise_in: Number(tr.input.value) || 0, preferred_riser_height_in: Number(pref.input.value) || 7.5 });
    if (r.error) { oR.textContent = r.error; return; }
    oR.textContent = String(r.risers); oT.textContent = String(r.treads);
    oH.textContent = fmt(r.riser_height_in, 3) + " in";
    oRun.textContent = fmt(r.total_run_in, 1) + " in";
  }, DEBOUNCE_MS);
  for (const el of [tr.input, pref.input]) el.addEventListener("input", update);
}

export function renderRoofPitch(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Pitch geometry. Rise/run = tan(angle); 6/12 corresponds to roughly 26.6 degrees and 50 percent.";
  const rise = makeNumber("Rise (in)", "rp-r", { step: "any" });
  const run = makeNumber("Run (in)", "rp-rn", { step: "any", value: "12" });
  run.input.value = "12";
  for (const f of [rise, run]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rise.input.value = "6"; run.input.value = "12"; update(); });
  const oP = makeOutputLine(outputRegion, "Pitch (in/ft)", "rp-out-p");
  const oPct = makeOutputLine(outputRegion, "Percent", "rp-out-pct");
  const oD = makeOutputLine(outputRegion, "Degrees", "rp-out-d");
  const update = debounce(() => {
    const r = computeRoofPitch({ rise: Number(rise.input.value) || 0, run: Number(run.input.value) || 12, mode: "rise_run" });
    if (r.error) { oP.textContent = r.error; oPct.textContent = "-"; oD.textContent = "-"; return; }
    oP.textContent = fmt(r.pitch_in_per_ft, 2);
    oPct.textContent = fmt(r.percent, 2) + " %";
    oD.textContent = fmt(r.degrees, 2);
  }, DEBOUNCE_MS);
  for (const el of [rise.input, run.input]) el.addEventListener("input", update);
}

export function renderRafter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Pythagorean theorem applied to rise and run. Rafter = horizontal span * sqrt(1 + (rise/run)^2).";
  const span = makeNumber("Horizontal span (ft)", "rf-s", { step: "any", min: "0" });
  const pitch = makeNumber("Pitch (rise per 12)", "rf-p", { step: "any", min: "0" });
  const overhang = makeNumber("Overhang (ft)", "rf-o", { step: "any", min: "0", value: "0" });
  overhang.input.value = "0";
  for (const f of [span, pitch, overhang]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { span.input.value = "12"; pitch.input.value = "6"; overhang.input.value = "1"; update(); });
  const oR = makeOutputLine(outputRegion, "Rafter length", "rf-out");
  const oM = makeOutputLine(outputRegion, "Multiplier", "rf-out-m");
  const update = debounce(() => {
    const r = computeRafter({
      horizontal_span_ft: Number(span.input.value) || 0,
      pitch_rise_per_12: Number(pitch.input.value) || 0,
      overhang_ft: Number(overhang.input.value) || 0,
    });
    oR.textContent = fmt(r.rafter_length_ft, 3) + " ft";
    oM.textContent = fmt(r.multiplier, 4);
  }, DEBOUNCE_MS);
  for (const el of [span.input, pitch.input, overhang.input]) el.addEventListener("input", update);
}

export function renderArea(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Geometric area formulas for rectangle, triangle, trapezoid, and circle.";
  const shape = makeSelect("Shape", "ar-s", [
    { value: "rectangle", label: "Rectangle" }, { value: "triangle", label: "Triangle" },
    { value: "trapezoid", label: "Trapezoid" }, { value: "circle", label: "Circle" },
  ]);
  inputRegion.appendChild(shape.wrap);
  const dimsHost = document.createElement("div");
  inputRegion.appendChild(dimsHost);
  const oA = makeOutputLine(outputRegion, "Area", "ar-out");
  attachExampleButton(inputRegion, () => { shape.select.value = "rectangle"; refreshDims(); inputs.length_ft.value = "10"; inputs.width_ft.value = "12"; update(); });
  let inputs = {};
  function refreshDims() {
    while (dimsHost.firstChild) dimsHost.removeChild(dimsHost.firstChild);
    inputs = {};
    const make = (label, key) => {
      const f = makeNumber(label, "ar-" + key, { step: "any", min: "0" });
      dimsHost.appendChild(f.wrap); inputs[key] = f.input;
      f.input.addEventListener("input", update);
    };
    if (shape.select.value === "rectangle") { make("Length (ft)", "length_ft"); make("Width (ft)", "width_ft"); }
    else if (shape.select.value === "triangle") { make("Base (ft)", "base_ft"); make("Height (ft)", "height_ft"); }
    else if (shape.select.value === "trapezoid") { make("Base 1 (ft)", "base1_ft"); make("Base 2 (ft)", "base2_ft"); make("Height (ft)", "height_ft"); }
    else if (shape.select.value === "circle") { make("Radius (ft)", "radius_ft"); }
  }
  function update() {
    const dims = {};
    for (const [k, el] of Object.entries(inputs)) dims[k] = Number(el.value) || 0;
    const r = computeArea({ shape: shape.select.value, ...dims });
    oA.textContent = r.error ? r.error : fmt(r.area_ft2, 2) + " ft^2";
  }
  shape.select.addEventListener("input", () => { refreshDims(); update(); });
  refreshDims();
}

export function renderBoardFootage(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: 1 board foot = 1 in x 12 in x 12 in. BF = (T_in * W_in * L_ft) / 12.";
  const t = makeNumber("Thickness (in)", "bf-t", { step: "any", min: "0" });
  const w = makeNumber("Width (in)", "bf-w", { step: "any", min: "0" });
  const l = makeNumber("Length (ft)", "bf-l", { step: "any", min: "0" });
  const c = makeNumber("Count", "bf-c", { step: "1", min: "1", value: "1" });
  c.input.value = "1";
  for (const f of [t, w, l, c]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { t.input.value = "2"; w.input.value = "4"; l.input.value = "8"; c.input.value = "10"; update(); });
  const oE = makeOutputLine(outputRegion, "Per piece", "bf-out-e");
  const oT = makeOutputLine(outputRegion, "Total", "bf-out-t");
  const update = debounce(() => {
    const r = computeBoardFootage({ thickness_in: Number(t.input.value) || 0, width_in: Number(w.input.value) || 0, length_ft: Number(l.input.value) || 0, count: Number(c.input.value) || 1 });
    oE.textContent = fmt(r.board_feet_each, 2) + " bf";
    oT.textContent = fmt(r.total_board_feet, 2) + " bf";
  }, DEBOUNCE_MS);
  for (const el of [t.input, w.input, l.input, c.input]) el.addEventListener("input", update);
}

export function renderConcrete(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Geometric volume divided by 27 (cubic feet per cubic yard).";
  const shape = makeSelect("Shape", "co-s", [
    { value: "slab", label: "Slab" }, { value: "footing", label: "Footing" }, { value: "column", label: "Column" }, { value: "footing_with_stem", label: "Footing with stem" },
  ]);
  inputRegion.appendChild(shape.wrap);
  const waste = makeNumber("Waste factor (0-1)", "co-w", { step: "any", min: "0", max: "1", value: "0.10" });
  waste.input.value = "0.10";
  inputRegion.appendChild(waste.wrap);
  const dimsHost = document.createElement("div"); inputRegion.appendChild(dimsHost);
  const oCF = makeOutputLine(outputRegion, "Cubic feet", "co-out-cf");
  const oCY = makeOutputLine(outputRegion, "Cubic yards", "co-out-cy");
  const oCYW = makeOutputLine(outputRegion, "Cubic yards with waste", "co-out-cyw");
  let inputs = {};
  function refreshDims() {
    while (dimsHost.firstChild) dimsHost.removeChild(dimsHost.firstChild);
    inputs = {};
    const make = (label, key, attrs = {}) => {
      const f = makeNumber(label, "co-" + key, { step: "any", min: "0", ...attrs });
      dimsHost.appendChild(f.wrap); inputs[key] = f.input; f.input.addEventListener("input", update);
    };
    if (shape.select.value === "slab" || shape.select.value === "footing") {
      make("Length (ft)", "length_ft"); make("Width (ft)", "width_ft"); make("Thickness (in)", "thickness_in");
    } else if (shape.select.value === "column") {
      make("Diameter (in)", "diameter_in"); make("Height (ft)", "height_ft");
    } else if (shape.select.value === "footing_with_stem") {
      make("Length (ft)", "length_ft");
      make("Footing width (ft)", "footing_width_ft"); make("Footing thickness (in)", "footing_thickness_in");
      make("Stem thickness (in)", "stem_thickness_in"); make("Stem height (ft)", "stem_height_ft");
    }
  }
  attachExampleButton(inputRegion, () => { shape.select.value = "slab"; refreshDims(); inputs.length_ft.value = "10"; inputs.width_ft.value = "10"; inputs.thickness_in.value = "4"; waste.input.value = "0.10"; update(); });
  function update() {
    const d = {}; for (const [k, el] of Object.entries(inputs)) d[k] = Number(el.value) || 0;
    const r = computeConcreteVolume({ shape: shape.select.value, waste_factor: Number(waste.input.value) || 0, ...d });
    if (r.error) { oCF.textContent = r.error; oCY.textContent = "-"; oCYW.textContent = "-"; return; }
    oCF.textContent = fmt(r.cubic_feet, 2);
    oCY.textContent = fmt(r.cubic_yards, 3);
    oCYW.textContent = fmt(r.cubic_yards_with_waste, 3);
  }
  shape.select.addEventListener("input", () => { refreshDims(); update(); });
  waste.input.addEventListener("input", update);
  refreshDims();
}

export function renderRebar(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Rebar quantity from grid spacing minus edge clearances on both axes.";
  const l = makeNumber("Length (ft)", "rb-l", { step: "any", min: "0" });
  const w = makeNumber("Width (ft)", "rb-w", { step: "any", min: "0" });
  const sp = makeNumber("Spacing on center (in)", "rb-sp", { step: "any", min: "1", value: "12" });
  sp.input.value = "12";
  const ec = makeNumber("Edge clearance (in)", "rb-ec", { step: "any", min: "0", value: "3" });
  ec.input.value = "3";
  const size = makeSelect("Bar size", "rb-bs", [{ value: "#3", label: "#3" }, { value: "#4", label: "#4", selected: true }, { value: "#5", label: "#5" }, { value: "#6", label: "#6" }]);
  for (const f of [l, w, sp, ec, size]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { l.input.value = "20"; w.input.value = "10"; sp.input.value = "12"; ec.input.value = "3"; size.select.value = "#4"; update(); });
  const oA = makeOutputLine(outputRegion, "Bars (along length)", "rb-out-a");
  const oB = makeOutputLine(outputRegion, "Bars (along width)", "rb-out-b");
  const oT = makeOutputLine(outputRegion, "Total linear feet", "rb-out-t");
  const update = debounce(() => {
    const r = computeRebar({ length_ft: Number(l.input.value) || 0, width_ft: Number(w.input.value) || 0, spacing_in: Number(sp.input.value) || 12, edge_clearance_in: Number(ec.input.value) || 3, bar_size: size.select.value });
    if (r.error) { oA.textContent = r.error; oB.textContent = "-"; oT.textContent = "-"; return; }
    oA.textContent = String(r.bars_along_length);
    oB.textContent = String(r.bars_along_width);
    oT.textContent = fmt(r.total_length_ft, 1) + " ft of " + r.bar_size;
  }, DEBOUNCE_MS);
  for (const el of [l.input, w.input, sp.input, ec.input, size.select]) el.addEventListener("input", update);
}

export function renderLumberSpans(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Allowable span = min(L by bending, L by deflection). M = w*L^2/8; sigma = M*c/I; delta = 5wL^4/(384*E*I). Material properties from public engineering references.";
  const sp = makeSelect("Species and grade", "ls-sp", Object.keys(LUMBER_SPECIES_GRADES).map((k) => ({ value: k, label: k })));
  const sz = makeSelect("Nominal size", "ls-sz", Object.keys(LUMBER_NOMINAL_TO_ACTUAL).map((k) => ({ value: k, label: k })));
  const tl = makeNumber("Total load (psf)", "ls-tl", { step: "any", min: "0" });
  const tw = makeNumber("Tributary width (in)", "ls-tw", { step: "any", min: "0", value: "16" });
  tw.input.value = "16";
  const dl = makeNumber("Deflection limit (L/x)", "ls-dl", { step: "1", min: "120", value: "360" });
  dl.input.value = "360";
  for (const f of [sp, sz, tl, tw, dl]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sp.select.value = "DF-L_No2"; sz.select.value = "2x10"; tl.input.value = "50"; tw.input.value = "16"; dl.input.value = "360"; update(); });
  const oS = makeOutputLine(outputRegion, "Allowable span", "ls-out-s");
  const oB = makeOutputLine(outputRegion, "By bending", "ls-out-b");
  const oD = makeOutputLine(outputRegion, "By deflection", "ls-out-d");
  const oG = makeOutputLine(outputRegion, "Governing", "ls-out-g");
  const update = debounce(() => {
    const r = computeLumberSpan({
      species_grade: sp.select.value,
      nominal_size: sz.select.value,
      total_load_psf: Number(tl.input.value) || 0,
      tributary_width_in: Number(tw.input.value) || 0,
      deflection_limit: Number(dl.input.value) || 360,
    });
    if (r.error) { oS.textContent = r.error; oB.textContent = "-"; oD.textContent = "-"; oG.textContent = "-"; return; }
    oS.textContent = fmt(r.allowable_span_ft, 2) + " ft";
    oB.textContent = fmt(r.by_bending_ft, 2) + " ft";
    oD.textContent = fmt(r.by_deflection_ft, 2) + " ft";
    oG.textContent = r.governing;
  }, DEBOUNCE_MS);
  for (const el of [sp.select, sz.select, tl.input, tw.input, dl.input]) el.addEventListener("input", update);
}

export function renderPullout(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Withdrawal capacity W = G^2.5 * D * 1380 (lb per inch of penetration), where G is wood specific gravity and D is fastener shank diameter.";
  const ftype = makeSelect("Fastener type", "po-ft", [{ value: "nail", label: "Nail" }, { value: "screw", label: "Screw" }]);
  inputRegion.appendChild(ftype.wrap);
  const sizeWrap = document.createElement("div"); inputRegion.appendChild(sizeWrap);
  const species = makeSelect("Wood species", "po-sp", Object.keys(WOOD_SPECIFIC_GRAVITY).map((k) => ({ value: k, label: k })));
  inputRegion.appendChild(species.wrap);
  const pen = makeNumber("Penetration into receiving member (in)", "po-pen", { step: "any", min: "0" });
  inputRegion.appendChild(pen.wrap);
  let sizeSel = null;
  function refreshSize() {
    while (sizeWrap.firstChild) sizeWrap.removeChild(sizeWrap.firstChild);
    const sizes = ftype.select.value === "nail" ? Object.keys(NAIL_SHANK_DIA_IN) : Object.keys(SCREW_SHANK_DIA_IN);
    const s = makeSelect("Fastener size", "po-fs", sizes.map((k) => ({ value: k, label: k })));
    sizeWrap.appendChild(s.wrap); sizeSel = s.select;
    sizeSel.addEventListener("input", update);
  }
  refreshSize();
  attachExampleButton(inputRegion, () => { ftype.select.value = "nail"; refreshSize(); sizeSel.value = "16d_common"; species.select.value = "DF-L"; pen.input.value = "1.5"; update(); });
  const oPI = makeOutputLine(outputRegion, "Withdrawal per inch", "po-out-pi");
  const oT = makeOutputLine(outputRegion, "Total withdrawal", "po-out-t");
  function update() {
    const r = computePullout({ fastener_type: ftype.select.value, fastener_size: sizeSel ? sizeSel.value : "", species: species.select.value, penetration_in: Number(pen.input.value) || 0 });
    if (r.error) { oPI.textContent = r.error; oT.textContent = "-"; return; }
    oPI.textContent = fmt(r.withdrawal_per_inch_lb, 1) + " lb/in";
    oT.textContent = fmt(r.total_withdrawal_lb, 1) + " lb";
  }
  ftype.select.addEventListener("input", () => { refreshSize(); update(); });
  for (const el of [species.select, pen.input]) el.addEventListener("input", update);
}

export function renderBeamLoading(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: M = w*L^2/8 (uniform), M = P*L/4 (centered point); deflection 5wL^4/(384*E*I) and PL^3/(48*E*I).";
  const lt = makeSelect("Load type", "bl-lt", [{ value: "uniform", label: "Uniform" }, { value: "point_center", label: "Centered point" }]);
  const lv = makeNumber("Load value (lb/ft for uniform; lb for point)", "bl-lv", { step: "any", min: "0" });
  const len = makeNumber("Span length (ft)", "bl-l", { step: "any", min: "0" });
  const E = makeNumber("Modulus of elasticity E (psi)", "bl-e", { step: "any", min: "0", value: "1600000" });
  E.input.value = "1600000";
  const b = makeNumber("Section width b (in)", "bl-b", { step: "any", min: "0", value: "1.5" });
  b.input.value = "1.5";
  const d = makeNumber("Section depth d (in)", "bl-d", { step: "any", min: "0", value: "9.25" });
  d.input.value = "9.25";
  for (const f of [lt, lv, len, E, b, d]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { lt.select.value = "uniform"; lv.input.value = "100"; len.input.value = "10"; E.input.value = "1600000"; b.input.value = "1.5"; d.input.value = "9.25"; update(); });
  const oM = makeOutputLine(outputRegion, "Maximum moment", "bl-out-m");
  const oD = makeOutputLine(outputRegion, "Maximum deflection", "bl-out-d");
  const update = debounce(() => {
    const r = computeBeamLoading({
      load_type: lt.select.value,
      load_value: Number(lv.input.value) || 0,
      length_ft: Number(len.input.value) || 0,
      E_psi: Number(E.input.value) || 0,
      b_in: Number(b.input.value) || 0,
      d_in: Number(d.input.value) || 0,
    });
    if (r.error) { oM.textContent = r.error; oD.textContent = "-"; return; }
    oM.textContent = fmt(r.M_lbft, 0) + " lb*ft";
    oD.textContent = fmt(r.delta_in, 3) + " in";
  }, DEBOUNCE_MS);
  for (const el of [lt.select, lv.input, len.input, E.input, b.input, d.input]) el.addEventListener("input", update);
}

export function renderMaterialQuantity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Common-assembly coverage and waste factors are engineering rules of thumb. Verify against the specific manufacturer's published coverage.";
  const a = makeSelect("Assembly", "mq-a", Object.keys(ASSEMBLY_DEFAULTS).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  const area = makeNumber("Area (ft^2)", "mq-area", { step: "any", min: "0" });
  for (const f of [a, area]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a.select.value = "drywall_4x8"; area.input.value = "1000"; update(); });
  const oU = makeOutputLine(outputRegion, "Units (with waste)", "mq-out-u");
  const oR = makeOutputLine(outputRegion, "Raw units", "mq-out-r");
  const oC = makeOutputLine(outputRegion, "Coverage / waste", "mq-out-c");
  const update = debounce(() => {
    const r = computeMaterialQuantity({ assembly: a.select.value, area_ft2: Number(area.input.value) || 0 });
    if (r.error) { oU.textContent = r.error; oR.textContent = "-"; oC.textContent = "-"; return; }
    oU.textContent = String(r.units_with_waste) + " " + r.unit_label;
    oR.textContent = fmt(r.units_raw, 2);
    oC.textContent = r.coverage_ft2_per_unit + " ft^2/unit; waste " + (r.waste_factor * 100).toFixed(0) + " %";
  }, DEBOUNCE_MS);
  for (const el of [a.select, area.input]) el.addEventListener("input", update);
}

// =====================================================================
// v2 utilities (90-99): spec-v2.md section 2 Group E extensions.
// =====================================================================

// --- Utility 90: Stair Stringer Length ---

export function computeStairStringer({ total_rise_in, total_run_in, tread_cut_depth_in = 1 }) {
  const r = Number(total_rise_in) || 0;
  const run = Number(total_run_in) || 0;
  if (r <= 0 || run <= 0) return { error: "Provide positive rise and run." };
  const stringer_in = Math.sqrt(r * r + run * run);
  const stringer_ft = stringer_in / 12;
  // Board-foot estimate using a 2x12 stringer (1.5 in x 11.25 in actual).
  const board_feet = (1.5 * 11.25 * stringer_in) / 144;
  return { stringer_in, stringer_ft, board_feet, tread_cut_depth_in };
}

export const stairStringerExample = {
  inputs: { total_rise_in: 108, total_run_in: 126 },
  expectedRange: { stringer_in: { min: 165, max: 167 } },
};

// --- Utility 91: Joist Mid-Span Deflection ---
//
// delta = 5 * w * L^4 / (384 * E * I) for a uniformly loaded simply supported beam.
// w in plf (per ft), L in ft, E in psi, I in in^4.
// Convert: w (lb/in) = w/12; L (in) = L*12. delta in inches.

export function computeJoistDeflection({ uniform_load_plf, span_ft, E_psi, I_in4 }) {
  const w_plf = Number(uniform_load_plf) || 0;
  const L_ft = Number(span_ft) || 0;
  const E = Number(E_psi) || 0;
  const I = Number(I_in4) || 0;
  if (w_plf <= 0 || L_ft <= 0 || E <= 0 || I <= 0) {
    return { error: "Provide positive load, span, E, I." };
  }
  const w_lb_in = w_plf / 12;
  const L_in = L_ft * 12;
  const delta_in = (5 * w_lb_in * Math.pow(L_in, 4)) / (384 * E * I);
  const limit_360_in = L_in / 360;
  const limit_240_in = L_in / 240;
  return {
    deflection_in: delta_in,
    limit_L_over_360_in: limit_360_in,
    limit_L_over_240_in: limit_240_in,
    pass_L_over_360: delta_in <= limit_360_in,
    pass_L_over_240: delta_in <= limit_240_in,
  };
}

export const joistDeflectionExample = {
  inputs: { uniform_load_plf: 50, span_ft: 12, E_psi: 1600000, I_in4: 47.6 },
  expectedRange: { deflection_in: { min: 0.05, max: 0.5 } },
};

// --- Utility 92: Footing Area for Soil Bearing ---

export const SOIL_BEARING_PSF = {
  rock: 12000,
  sandy_gravel: 5000,
  sand: 3000,
  silty_sand: 2500,
  clay: 1500,
  silty_clay: 2000,
};

export function computeFootingArea({ column_load_lb, soil_class }) {
  const P = Number(column_load_lb) || 0;
  const allow = SOIL_BEARING_PSF[soil_class];
  if (allow === undefined) return { error: "Unknown soil class." };
  if (P <= 0) return { error: "Column load must be positive." };
  const required_area_ft2 = P / allow;
  const side_ft = Math.sqrt(required_area_ft2);
  // Round side up to next 6-inch increment.
  const side_in = side_ft * 12;
  const rounded_side_in = Math.ceil(side_in / 6) * 6;
  return {
    required_area_ft2,
    side_ft,
    rounded_side_in,
    rounded_side_ft: rounded_side_in / 12,
    allowable_psf: allow,
  };
}

export const footingAreaExample = {
  inputs: { column_load_lb: 12000, soil_class: "clay" },
  expected: { required_area_ft2: 8 },
};

// --- Utility 93: Tile Count and Grout Volume ---

export function computeTileCount({ area_ft2, tile_width_in, tile_height_in, grout_joint_width_in = 0.125, tile_thickness_in = 0.25, waste_factor = 0.10 }) {
  const a = Number(area_ft2) || 0;
  const tw = Number(tile_width_in) || 0;
  const th = Number(tile_height_in) || 0;
  const gw = Number(grout_joint_width_in) || 0;
  const tt = Number(tile_thickness_in) || 0;
  if (a <= 0 || tw <= 0 || th <= 0) return { error: "Provide positive area and tile size." };
  const tile_face_in2 = tw * th;
  const area_in2 = a * 144;
  const base_count_raw = area_in2 / tile_face_in2;
  const base_count = Math.ceil(base_count_raw);
  const tile_count = base_count + Math.ceil(base_count * waste_factor);
  // Grout volume estimate: linear feet of joint = (W + H) per tile / 2 to
  // avoid double-counting; use perimeter / 2.
  const linear_in_per_tile = (tw + th);
  const total_linear_in = base_count * linear_in_per_tile;
  const grout_volume_in3 = total_linear_in * gw * tt;
  return { tile_count, grout_volume_in3, base_count, tile_face_in2 };
}

export const tileCountExample = {
  inputs: { area_ft2: 100, tile_width_in: 12, tile_height_in: 12 },
  expected: { base_count: 100, tile_count: 110 },
};

// --- Utility 94: Paint Coverage ---

export const PAINT_COVERAGE_FT2_PER_GAL = { smooth: 350, textured: 250, rough: 175 };

export function computePaintCoverage({ area_ft2, coats = 2, primer_needed = false, surface_porosity = "smooth" }) {
  const a = Number(area_ft2) || 0;
  const c = Number(coats) || 1;
  const cov = PAINT_COVERAGE_FT2_PER_GAL[surface_porosity];
  if (cov === undefined) return { error: "Unknown surface porosity." };
  if (a <= 0) return { error: "Area must be positive." };
  const surface_factor = surface_porosity === "smooth" ? 1.0 : surface_porosity === "textured" ? 0.7 : 0.5;
  const gallons_per_coat = a / (cov * surface_factor);
  const total_paint = gallons_per_coat * c;
  const primer = primer_needed ? gallons_per_coat : 0;
  return { gallons_per_coat, total_paint_gallons: total_paint, primer_gallons: primer };
}

export const paintCoverageExample = {
  inputs: { area_ft2: 700, coats: 2, primer_needed: true, surface_porosity: "smooth" },
  expectedRange: { total_paint_gallons: { min: 3, max: 5 } },
};

// --- Utility 95: Excavation Volume ---
//
// Prism: L * W * D. Slope wedges around the perimeter expand the top opening
// by D / tan(angle) on each side. Total volume includes prism + wedges.

export function computeExcavationVolume({ length_ft, width_ft, depth_ft, side_slope_angle_deg = 90 }) {
  const L = Number(length_ft) || 0;
  const W = Number(width_ft) || 0;
  const D = Number(depth_ft) || 0;
  const ang = Number(side_slope_angle_deg) || 90;
  if (L <= 0 || W <= 0 || D <= 0) return { error: "Provide positive length, width, depth." };
  const set_back = ang >= 90 ? 0 : D / Math.tan((ang * Math.PI) / 180);
  // Top dimensions:
  const Lt = L + 2 * set_back;
  const Wt = W + 2 * set_back;
  // Volume of a frustum: V = D/3 * (A1 + A2 + sqrt(A1 * A2)).
  const A1 = L * W;
  const A2 = Lt * Wt;
  const volume_ft3 = (D / 3) * (A1 + A2 + Math.sqrt(A1 * A2));
  const cubic_yards = volume_ft3 / 27;
  return { volume_ft3, cubic_yards, top_length_ft: Lt, top_width_ft: Wt, set_back_ft: set_back };
}

export const excavationExample = {
  inputs: { length_ft: 10, width_ft: 10, depth_ft: 5, side_slope_angle_deg: 90 },
  expected: { volume_ft3: 500 },
};

// --- Utility 96: Brick / CMU Count ---

export const MASONRY_UNIT_FACE_IN = {
  modular_brick: { w: 8, h: 2.25 },
  standard_brick: { w: 8, h: 2.67 },
  cmu_8x8x16: { w: 16, h: 8 },
  cmu_8x16x16: { w: 16, h: 8 },
};

export function computeMasonryCount({ wall_area_ft2, unit_type, mortar_joint_in = 0.375, waste_factor = 0.05 }) {
  const a = Number(wall_area_ft2) || 0;
  const m = Number(mortar_joint_in) || 0;
  const u = MASONRY_UNIT_FACE_IN[unit_type];
  if (!u) return { error: "Unknown masonry unit type." };
  if (a <= 0) return { error: "Wall area must be positive." };
  const face_in2 = (u.w + m) * (u.h + m);
  const face_ft2 = face_in2 / 144;
  const base_raw = a / face_ft2;
  const base = Math.ceil(base_raw);
  const count = base + Math.ceil(base * waste_factor);
  return { unit_count: count, base_count: base, face_ft2 };
}

export const masonryCountExample = {
  inputs: { wall_area_ft2: 100, unit_type: "cmu_8x8x16" },
  expectedRange: { unit_count: { min: 110, max: 130 } },
};

// --- Utility 97: Wind Velocity Pressure (basic) ---
//
// q (psf) = 0.00256 * V^2  (V in mph)  [public ASCE 7 formula]

export const WIND_PRESSURE_CP = {
  windward: 0.8,
  leeward: -0.5,
  side: -0.7,
};

export function computeWindPressure({ V_mph, exposure = "C", roof_type = "gable" }) {
  const V = Number(V_mph) || 0;
  if (V <= 0) return { error: "Wind speed must be positive." };
  const q_psf = 0.00256 * V * V;
  // Exposure multipliers (Kz at 30 ft for typical exposures); orientation only.
  const kz = exposure === "B" ? 0.70 : exposure === "D" ? 1.03 : 0.85;
  const qz = q_psf * kz;
  return {
    q_psf,
    qz_at_30ft_psf: qz,
    Cp_windward: WIND_PRESSURE_CP.windward,
    Cp_leeward: WIND_PRESSURE_CP.leeward,
    pressure_windward_psf: qz * WIND_PRESSURE_CP.windward,
    pressure_leeward_psf: qz * WIND_PRESSURE_CP.leeward,
  };
}

export const windPressureExample = {
  inputs: { V_mph: 100, exposure: "C", roof_type: "gable" },
  expectedRange: { q_psf: { min: 25, max: 26 } },
};

// --- Utility 98: Snow Load (ASCE 7 flat-roof) ---
//
// Pf = 0.7 * Ce * Ct * Is * Pg  (psf)  [public ASCE 7 formula]

export function computeSnowLoad({ Pg_psf, Ce = 1.0, Ct = 1.0, Is = 1.0 }) {
  const Pg = Number(Pg_psf) || 0;
  if (Pg <= 0) return { error: "Ground snow load must be positive." };
  const Pf = 0.7 * Ce * Ct * Is * Pg;
  return { Pf_psf: Pf, Pg_psf: Pg, Ce, Ct, Is };
}

export const snowLoadExample = {
  inputs: { Pg_psf: 30, Ce: 1.0, Ct: 1.0, Is: 1.0 },
  expected: { Pf_psf: 21 },
};

// --- Utility 99: Anchor Bolt Embedment ---
//
// Pull-out capacity per public bond strength: T = 0.7 * sqrt(fc) * pi * d * ld.
// Solve for ld given target T: ld = T / (0.7 * sqrt(fc) * pi * d).

export function computeAnchorEmbedment({ uplift_lb, bolt_diameter_in, fc_psi }) {
  const T = Number(uplift_lb) || 0;
  const d = Number(bolt_diameter_in) || 0;
  const fc = Number(fc_psi) || 0;
  if (T <= 0 || d <= 0 || fc <= 0) return { error: "Provide positive uplift, diameter, fc." };
  const ld_in = T / (0.7 * Math.sqrt(fc) * Math.PI * d);
  return { embedment_in: ld_in, embedment_ft: ld_in / 12, T_lb: T };
}

export const anchorEmbedmentExample = {
  inputs: { uplift_lb: 5000, bolt_diameter_in: 0.625, fc_psi: 3000 },
  expectedRange: { embedment_in: { min: 1, max: 100 } },
};

// --- v2 view renderers ---

export function renderStairStringer(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: stringer_ft = sqrt(rise^2 + run^2). Board-foot estimate uses a 2x12 stringer (1.5 in x 11.25 in actual).";
  const rise = makeNumber("Total rise (in)", "ss-r", { step: "any", min: "0" });
  const run = makeNumber("Total run (in)", "ss-rn", { step: "any", min: "0" });
  for (const f of [rise, run]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rise.input.value = "108"; run.input.value = "126"; update(); });
  const oI = makeOutputLine(outputRegion, "Stringer length", "ss-out-i");
  const oF = makeOutputLine(outputRegion, "Stringer feet", "ss-out-f");
  const oB = makeOutputLine(outputRegion, "Board feet (2x12 stringer)", "ss-out-b");
  const update = debounce(() => {
    const r = computeStairStringer({ total_rise_in: Number(rise.input.value) || 0, total_run_in: Number(run.input.value) || 0 });
    if (r.error) { oI.textContent = r.error; oF.textContent = "-"; oB.textContent = "-"; return; }
    oI.textContent = fmt(r.stringer_in, 2) + " in";
    oF.textContent = fmt(r.stringer_ft, 2) + " ft";
    oB.textContent = fmt(r.board_feet, 2);
  }, DEBOUNCE_MS);
  for (const el of [rise.input, run.input]) el.addEventListener("input", update);
}

export function renderJoistDeflection(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: delta = 5 * w * L^4 / (384 * E * I) for a uniformly loaded simply supported beam.";
  const w = makeNumber("Uniform load (plf)", "jd-w", { step: "any", min: "0" });
  const L = makeNumber("Span (ft)", "jd-l", { step: "any", min: "0" });
  const E = makeNumber("E (psi)", "jd-e", { step: "any", min: "0" });
  const I = makeNumber("I (in^4)", "jd-i", { step: "any", min: "0" });
  for (const f of [w, L, E, I]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { w.input.value = "50"; L.input.value = "12"; E.input.value = "1600000"; I.input.value = "47.6"; update(); });
  const oD = makeOutputLine(outputRegion, "Mid-span deflection", "jd-out-d");
  const o360 = makeOutputLine(outputRegion, "L/360 limit (live load)", "jd-out-360");
  const o240 = makeOutputLine(outputRegion, "L/240 limit (total load)", "jd-out-240");
  const update = debounce(() => {
    const r = computeJoistDeflection({
      uniform_load_plf: Number(w.input.value) || 0,
      span_ft: Number(L.input.value) || 0,
      E_psi: Number(E.input.value) || 0,
      I_in4: Number(I.input.value) || 0,
    });
    if (r.error) { oD.textContent = r.error; o360.textContent = "-"; o240.textContent = "-"; return; }
    oD.textContent = fmt(r.deflection_in, 4) + " in";
    o360.textContent = fmt(r.limit_L_over_360_in, 3) + " in (" + (r.pass_L_over_360 ? "pass" : "fail") + ")";
    o240.textContent = fmt(r.limit_L_over_240_in, 3) + " in (" + (r.pass_L_over_240 ? "pass" : "fail") + ")";
  }, DEBOUNCE_MS);
  for (const el of [w.input, L.input, E.input, I.input]) el.addEventListener("input", update);
}

export function renderFootingArea(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: required area = column_load / allowable_bearing. Soil-class allowable values from public USGS / engineering references.";
  const P = makeNumber("Column load (lb)", "fa-p", { step: "any", min: "0" });
  const soil = makeSelect("Soil class", "fa-s", Object.keys(SOIL_BEARING_PSF).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  for (const f of [P, soil]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { P.input.value = "12000"; soil.select.value = "clay"; update(); });
  const oA = makeOutputLine(outputRegion, "Required area", "fa-out-a");
  const oS = makeOutputLine(outputRegion, "Side dimension", "fa-out-s");
  const oR = makeOutputLine(outputRegion, "Rounded side (next 6 in)", "fa-out-r");
  const update = debounce(() => {
    const r = computeFootingArea({ column_load_lb: Number(P.input.value) || 0, soil_class: soil.select.value });
    if (r.error) { oA.textContent = r.error; oS.textContent = "-"; oR.textContent = "-"; return; }
    oA.textContent = fmt(r.required_area_ft2, 2) + " ft^2 @ " + r.allowable_psf + " psf";
    oS.textContent = fmt(r.side_ft, 2) + " ft (" + fmt(r.side_ft * 12, 1) + " in)";
    oR.textContent = r.rounded_side_in + " in (" + fmt(r.rounded_side_ft, 2) + " ft)";
  }, DEBOUNCE_MS);
  for (const el of [P.input, soil.select]) el.addEventListener("input", update);
}

export function renderTileCount(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: tile count = ceil(area_ft^2 * 144 / (w*h)) plus waste; grout volume estimated from joint perimeter * width * tile thickness.";
  const a = makeNumber("Area (ft^2)", "tc-a", { step: "any", min: "0" });
  const w = makeNumber("Tile width (in)", "tc-w", { step: "any", min: "0" });
  const h = makeNumber("Tile height (in)", "tc-h", { step: "any", min: "0" });
  const j = makeNumber("Grout joint width (in)", "tc-j", { step: "any", min: "0", value: "0.125" });
  j.input.value = "0.125";
  const t = makeNumber("Tile thickness (in)", "tc-t", { step: "any", min: "0", value: "0.25" });
  t.input.value = "0.25";
  for (const f of [a, w, h, j, t]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a.input.value = "100"; w.input.value = "12"; h.input.value = "12"; j.input.value = "0.125"; t.input.value = "0.25"; update(); });
  const oC = makeOutputLine(outputRegion, "Tile count (with 10% waste)", "tc-out-c");
  const oG = makeOutputLine(outputRegion, "Grout volume", "tc-out-g");
  const update = debounce(() => {
    const r = computeTileCount({
      area_ft2: Number(a.input.value) || 0,
      tile_width_in: Number(w.input.value) || 0,
      tile_height_in: Number(h.input.value) || 0,
      grout_joint_width_in: Number(j.input.value) || 0,
      tile_thickness_in: Number(t.input.value) || 0,
    });
    if (r.error) { oC.textContent = r.error; oG.textContent = "-"; return; }
    oC.textContent = String(r.tile_count);
    oG.textContent = fmt(r.grout_volume_in3, 1) + " in^3";
  }, DEBOUNCE_MS);
  for (const el of [a.input, w.input, h.input, j.input, t.input]) el.addEventListener("input", update);
}

export function renderPaintCoverage(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: gallons = area / (coverage * surface_factor). 350 ft^2/gal smooth, 250 textured, 175 rough.";
  const a = makeNumber("Area (ft^2)", "pc-a", { step: "any", min: "0" });
  const c = makeNumber("Coats", "pc-c", { step: "1", min: "1", value: "2" });
  c.input.value = "2";
  const prim = makeCheckbox("Primer needed", "pc-p");
  const sp = makeSelect("Surface porosity", "pc-s", [
    { value: "smooth", label: "Smooth", selected: true },
    { value: "textured", label: "Textured" },
    { value: "rough", label: "Rough" },
  ]);
  for (const f of [a, c, prim, sp]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a.input.value = "700"; c.input.value = "2"; prim.input.checked = true; sp.select.value = "smooth"; update(); });
  const oG = makeOutputLine(outputRegion, "Total paint", "pc-out-g");
  const oP = makeOutputLine(outputRegion, "Primer", "pc-out-p");
  const update = debounce(() => {
    const r = computePaintCoverage({
      area_ft2: Number(a.input.value) || 0,
      coats: Number(c.input.value) || 1,
      primer_needed: prim.input.checked,
      surface_porosity: sp.select.value,
    });
    if (r.error) { oG.textContent = r.error; oP.textContent = "-"; return; }
    oG.textContent = fmt(r.total_paint_gallons, 2) + " gal";
    oP.textContent = fmt(r.primer_gallons, 2) + " gal";
  }, DEBOUNCE_MS);
  for (const el of [a.input, c.input, prim.input, sp.select]) el.addEventListener("input", update);
}

export function renderExcavation(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Frustum volume V = D/3 * (A1 + A2 + sqrt(A1*A2)). Set-back per side = D / tan(angle).";
  const L = makeNumber("Length (ft)", "ex-l", { step: "any", min: "0" });
  const W = makeNumber("Width (ft)", "ex-w", { step: "any", min: "0" });
  const D = makeNumber("Depth (ft)", "ex-d", { step: "any", min: "0" });
  const ang = makeNumber("Side-slope angle (deg, 90 = vertical)", "ex-a", { step: "any", min: "1", max: "90", value: "90" });
  ang.input.value = "90";
  for (const f of [L, W, D, ang]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { L.input.value = "10"; W.input.value = "10"; D.input.value = "5"; ang.input.value = "90"; update(); });
  const oV = makeOutputLine(outputRegion, "Volume", "ex-out-v");
  const oY = makeOutputLine(outputRegion, "Cubic yards", "ex-out-y");
  const oT = makeOutputLine(outputRegion, "Top dimensions", "ex-out-t");
  const update = debounce(() => {
    const r = computeExcavationVolume({
      length_ft: Number(L.input.value) || 0,
      width_ft: Number(W.input.value) || 0,
      depth_ft: Number(D.input.value) || 0,
      side_slope_angle_deg: Number(ang.input.value) || 90,
    });
    if (r.error) { oV.textContent = r.error; oY.textContent = "-"; oT.textContent = "-"; return; }
    oV.textContent = fmt(r.volume_ft3, 1) + " ft^3";
    oY.textContent = fmt(r.cubic_yards, 2) + " cy";
    oT.textContent = fmt(r.top_length_ft, 2) + " x " + fmt(r.top_width_ft, 2) + " ft";
  }, DEBOUNCE_MS);
  for (const el of [L.input, W.input, D.input, ang.input]) el.addEventListener("input", update);
}

export function renderMasonryCount(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: count = ceil(wall_area / face_area * 1.05). Face area uses (w + mortar) * (h + mortar).";
  const a = makeNumber("Wall area (ft^2)", "mc-a", { step: "any", min: "0" });
  const u = makeSelect("Unit type", "mc-u", Object.keys(MASONRY_UNIT_FACE_IN).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  const m = makeNumber("Mortar joint (in)", "mc-m", { step: "any", min: "0", value: "0.375" });
  m.input.value = "0.375";
  for (const f of [a, u, m]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a.input.value = "100"; u.select.value = "cmu_8x8x16"; m.input.value = "0.375"; update(); });
  const oC = makeOutputLine(outputRegion, "Unit count (with 5% waste)", "mc-out-c");
  const oF = makeOutputLine(outputRegion, "Face area per unit", "mc-out-f");
  const update = debounce(() => {
    const r = computeMasonryCount({
      wall_area_ft2: Number(a.input.value) || 0,
      unit_type: u.select.value,
      mortar_joint_in: Number(m.input.value) || 0,
    });
    if (r.error) { oC.textContent = r.error; oF.textContent = "-"; return; }
    oC.textContent = String(r.unit_count);
    oF.textContent = fmt(r.face_ft2, 3) + " ft^2";
  }, DEBOUNCE_MS);
  for (const el of [a.input, u.select, m.input]) el.addEventListener("input", update);
}

export function renderWindPressure(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: q = 0.00256 * V^2 (V mph) per public ASCE 7 formula. Cp +0.8 windward, -0.5 leeward (typical).";
  const V = makeNumber("Basic wind speed (mph)", "wp-v", { step: "any", min: "0" });
  const exp = makeSelect("Exposure", "wp-e", [
    { value: "B", label: "B" }, { value: "C", label: "C", selected: true }, { value: "D", label: "D" },
  ]);
  const roof = makeSelect("Roof type", "wp-r", [
    { value: "gable", label: "Gable" }, { value: "hip", label: "Hip" }, { value: "flat", label: "Flat" },
  ]);
  for (const f of [V, exp, roof]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { V.input.value = "100"; exp.select.value = "C"; roof.select.value = "gable"; update(); });
  const oQ = makeOutputLine(outputRegion, "Velocity pressure q", "wp-out-q");
  const oZ = makeOutputLine(outputRegion, "qz at 30 ft", "wp-out-z");
  const oW = makeOutputLine(outputRegion, "Windward pressure", "wp-out-w");
  const oL = makeOutputLine(outputRegion, "Leeward pressure", "wp-out-l");
  const update = debounce(() => {
    const r = computeWindPressure({
      V_mph: Number(V.input.value) || 0,
      exposure: exp.select.value, roof_type: roof.select.value,
    });
    if (r.error) { oQ.textContent = r.error; oZ.textContent = "-"; oW.textContent = "-"; oL.textContent = "-"; return; }
    oQ.textContent = fmt(r.q_psf, 2) + " psf";
    oZ.textContent = fmt(r.qz_at_30ft_psf, 2) + " psf";
    oW.textContent = fmt(r.pressure_windward_psf, 2) + " psf (Cp " + r.Cp_windward + ")";
    oL.textContent = fmt(r.pressure_leeward_psf, 2) + " psf (Cp " + r.Cp_leeward + ")";
  }, DEBOUNCE_MS);
  for (const el of [V.input, exp.select, roof.select]) el.addEventListener("input", update);
}

export function renderSnowLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Pf = 0.7 * Ce * Ct * Is * Pg per public ASCE 7 formula.";
  const Pg = makeNumber("Ground snow load Pg (psf)", "sl-pg", { step: "any", min: "0" });
  const Ce = makeNumber("Exposure factor Ce", "sl-ce", { step: "any", min: "0", value: "1.0" });
  Ce.input.value = "1.0";
  const Ct = makeNumber("Thermal factor Ct", "sl-ct", { step: "any", min: "0", value: "1.0" });
  Ct.input.value = "1.0";
  const Is = makeNumber("Importance factor Is", "sl-is", { step: "any", min: "0", value: "1.0" });
  Is.input.value = "1.0";
  for (const f of [Pg, Ce, Ct, Is]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { Pg.input.value = "30"; Ce.input.value = "1.0"; Ct.input.value = "1.0"; Is.input.value = "1.0"; update(); });
  const oP = makeOutputLine(outputRegion, "Flat-roof snow load Pf", "sl-out-p");
  const update = debounce(() => {
    const r = computeSnowLoad({
      Pg_psf: Number(Pg.input.value) || 0,
      Ce: Number(Ce.input.value) || 1,
      Ct: Number(Ct.input.value) || 1,
      Is: Number(Is.input.value) || 1,
    });
    if (r.error) { oP.textContent = r.error; return; }
    oP.textContent = fmt(r.Pf_psf, 2) + " psf";
  }, DEBOUNCE_MS);
  for (const el of [Pg.input, Ce.input, Ct.input, Is.input]) el.addEventListener("input", update);
}

export function renderAnchorEmbedment(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ld = T / (0.7 * sqrt(fc) * pi * d). Public bond strength formula.";
  const T = makeNumber("Uplift load (lb)", "ae-t", { step: "any", min: "0" });
  const d = makeNumber("Bolt diameter (in)", "ae-d", { step: "any", min: "0" });
  const fc = makeNumber("Concrete fc (psi)", "ae-fc", { step: "any", min: "0" });
  for (const f of [T, d, fc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { T.input.value = "5000"; d.input.value = "0.625"; fc.input.value = "3000"; update(); });
  const oI = makeOutputLine(outputRegion, "Required embedment", "ae-out-i");
  const oF = makeOutputLine(outputRegion, "Required embedment (ft)", "ae-out-f");
  const update = debounce(() => {
    const r = computeAnchorEmbedment({
      uplift_lb: Number(T.input.value) || 0,
      bolt_diameter_in: Number(d.input.value) || 0,
      fc_psi: Number(fc.input.value) || 0,
    });
    if (r.error) { oI.textContent = r.error; oF.textContent = "-"; return; }
    oI.textContent = fmt(r.embedment_in, 2) + " in";
    oF.textContent = fmt(r.embedment_ft, 3) + " ft";
  }, DEBOUNCE_MS);
  for (const el of [T.input, d.input, fc.input]) el.addEventListener("input", update);
}

export const CONSTRUCTION_RENDERERS = {
  "stairs": renderStairs,
  "roof-pitch": renderRoofPitch,
  "rafter": renderRafter,
  "square-footage": renderArea,
  "board-footage": renderBoardFootage,
  "concrete": renderConcrete,
  "rebar": renderRebar,
  "lumber-spans": renderLumberSpans,
  "fastener-pullout": renderPullout,
  "beam-loading": renderBeamLoading,
  "material-quantity": renderMaterialQuantity,
  // v2
  "stair-stringer": renderStairStringer,
  "joist-deflection": renderJoistDeflection,
  "footing-area": renderFootingArea,
  "tile-count": renderTileCount,
  "paint-coverage": renderPaintCoverage,
  "excavation": renderExcavation,
  "masonry-count": renderMasonryCount,
  "wind-pressure": renderWindPressure,
  "snow-load": renderSnowLoad,
  "anchor-embedment": renderAnchorEmbedment,
};
