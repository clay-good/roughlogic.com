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
import { renderLimitationBanner, getLimitationCopy } from "./limitation-banner.js";

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


// --- Utility 40: Stair Calculator ---

// dims: in { total_rise_in: L, preferred_riser_height_in: L } out: { risers: dimensionless, riser_height_in: L, tread_depth_in: L, total_run_in: L }
export function computeStairs({ total_rise_in, preferred_riser_height_in = 7.5 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (total_rise_in <= 0) return { error: "Total rise must be positive." };
  if (!(preferred_riser_height_in > 0)) return { error: "Preferred riser height must be positive." };
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

// dims: in { rise: L, run: L, mode: dimensionless } out: { pitch_in_per_ft: dimensionless, percent: dimensionless, degrees: dimensionless }
export function computeRoofPitch({ rise = null, run = 12, mode = "rise_run" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { horizontal_span_ft: L, pitch_rise_per_12: dimensionless, overhang_ft: L } out: { rafter_length_ft: L }
export function computeRafter({ horizontal_span_ft, pitch_rise_per_12, overhang_ft = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // pitch is rise per 12 in run. Hypotenuse multiplier = sqrt(rise^2 + 12^2)/12.
  const m = Math.sqrt(pitch_rise_per_12 * pitch_rise_per_12 + 144) / 12;
  const rafter_ft = (horizontal_span_ft + overhang_ft) * m;
  return { rafter_length_ft: rafter_ft, multiplier: m };
}

export const rafterExample = {
  inputs: { horizontal_span_ft: 12, pitch_rise_per_12: 6, overhang_ft: 1 },
};

// --- Utility 43: Square Footage ---

// dims: in { shape: dimensionless, dims: dimensionless } out: { area: L^2 }
export function computeArea({ shape, ...dims }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { thickness_in: L, width_in: L, length_ft: L, count: dimensionless } out: { board_feet: L^3, total_board_feet: L^3 }
export function computeBoardFootage({ thickness_in, width_in, length_ft, count = 1 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { shape: dimensionless, waste_factor: dimensionless, d: dimensionless } out: { volume_yd3: L^3, bags_60: dimensionless, bags_80: dimensionless }
export function computeConcreteVolume({ shape, waste_factor = 0.10, ...d }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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
  // v8 §C.4: bag-count rollup. Quikrete / Sakrete published yields:
  // 60 lb bag yields ~ 0.45 ft³; 80 lb bag yields ~ 0.60 ft³ of mixed concrete.
  // Use the with-waste cubic-foot total so the count covers a job's actual purchase.
  const cubic_ft_with_waste = with_waste * 27;
  const bags_60lb = Math.ceil(cubic_ft_with_waste / 0.45);
  const bags_80lb = Math.ceil(cubic_ft_with_waste / 0.60);
  return {
    cubic_feet: cubic_ft, cubic_yards, cubic_yards_with_waste: with_waste, waste_factor,
    bags_60lb, bags_80lb,
  };
}

export const concreteExample = {
  inputs: { shape: "slab", length_ft: 10, width_ft: 10, thickness_in: 4, waste_factor: 0.10 },
  expectedRange: { cubic_yards: { min: 1.2, max: 1.3 } },
};

// --- Utility 46: Rebar Spacing and Quantity ---

// dims: in { length_ft: L, width_ft: L, spacing_in: L, edge_clearance_in: L, bar_size: dimensionless } out: { bars_count: dimensionless, total_length_ft: L }
export function computeRebar({ length_ft, width_ft, spacing_in, edge_clearance_in = 3, bar_size = "#4" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { species_grade: dimensionless, nominal_size: dimensionless, total_load_psf: M L^-1 T^-2, tributary_width_in: L, deflection_limit: dimensionless } out: { max_span_ft: L, governing: dimensionless }
export function computeLumberSpan({ species_grade, nominal_size, total_load_psf, tributary_width_in = 16, deflection_limit = 360 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const props = LUMBER_SPECIES_GRADES[species_grade];
  if (!props) return { error: "Unknown species/grade." };
  const dim = LUMBER_NOMINAL_TO_ACTUAL[nominal_size];
  if (!dim) return { error: "Unknown nominal size." };
  // DR-03 (RC-1): zero/negative load drives sqrt(.../load) and cbrt(.../load)
  // to Infinity, rendering "Infinity ft." The span is only defined for a
  // positive applied load.
  if (!(total_load_psf > 0)) return { error: "Total load must be positive." };
  if (!(tributary_width_in > 0)) return { error: "Tributary width must be positive." };
  if (!(deflection_limit > 0)) return { error: "Deflection limit must be positive." };
  const w_lb_ft = total_load_psf * (tributary_width_in / 12);
  const L_b = allowableSpanByBending({ w_lb_ft, Fb_psi: props.F_b_psi, b_in: dim.b_in, d_in: dim.d_in });
  const L_d = allowableSpanByDeflection({ w_lb_ft, E_psi: props.E_psi, b_in: dim.b_in, d_in: dim.d_in, deflectionLimit: deflection_limit });
  const L_max = Math.min(L_b, L_d);
  const governs = L_b < L_d ? "bending" : "deflection";
  // v8 §C.4: actual deflection (inches) at the allowable span.
  // δ = 5 × w × L⁴ / (384 × E × I)  with w in lb/in, L in in, E in psi, I in in⁴.
  const sec = rectangularSection({ b_in: dim.b_in, d_in: dim.d_in });
  const w_lb_in = w_lb_ft / 12;
  const L_in = L_max * 12;
  const deflection_in = (5 * w_lb_in * Math.pow(L_in, 4)) / (384 * props.E_psi * sec.I_in4);
  // Allowable deflection at the limit (e.g., L/360 in inches).
  const allowable_deflection_in = L_in / deflection_limit;
  // Margin: for spans governed by bending, deflection may be well under the
  // limit. For deflection-governed spans this should be near 1.0.
  const deflection_ratio = allowable_deflection_in > 0 ? deflection_in / allowable_deflection_in : null;
  return {
    allowable_span_ft: L_max,
    by_bending_ft: L_b,
    by_deflection_ft: L_d,
    governing: governs,
    F_b_psi: props.F_b_psi,
    E_psi: props.E_psi,
    section: sec,
    deflection_in,
    allowable_deflection_in,
    deflection_ratio,
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

// dims: in { fastener_type: dimensionless, fastener_size: dimensionless, species: dimensionless, penetration_in: L } out: { withdrawal_lb: M L T^-2 }
export function computePullout({ fastener_type, fastener_size, species, penetration_in }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { load_type: dimensionless, load_value: dimensionless, length_ft: L, E_psi: M L^-1 T^-2, b_in: L, d_in: L } out: { max_moment: M L^2 T^-2, deflection_in: L, max_stress_psi: M L^-1 T^-2 }
export function computeBeamLoading({ load_type, load_value, length_ft, E_psi, b_in, d_in }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // DR-04 (RC-1): zero depth -> I = 0 -> deflection 5wL^4/(384 E I) = Infinity;
  // zero E is the same. Guard the section/material geometry before solving.
  if (!(b_in > 0) || !(d_in > 0) || !(E_psi > 0)) {
    return { error: "Width, depth, and modulus of elasticity must be positive." };
  }
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

// dims: in { assembly: dimensionless, area_ft2: L^2 } out: { units: dimensionless }
export function computeMaterialQuantity({ assembly, area_ft2 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderStairs(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per IRC 2021 §R311.7 (stair dimensions). Riser height = total rise / risers; default tread depth 10 in. AHJ governs final inspection. Free at codes.iccsafe.org.";
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderRafter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per IRC 2021 Table R802.5.1 (rafter spans). Rafter = horizontal span * sqrt(1 + (rise/run)^2) by Pythagoras. AHJ governs. Free at codes.iccsafe.org.";
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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
  // v8 §C.4: 60 lb / 80 lb bag rollup (Quikrete / Sakrete published yields).
  const oBags60 = makeOutputLine(outputRegion, "60 lb bags", "co-out-bag60");
  const oBags80 = makeOutputLine(outputRegion, "80 lb bags", "co-out-bag80");
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
    if (r.error) { oCF.textContent = r.error; oCY.textContent = "-"; oCYW.textContent = "-"; oBags60.textContent = "-"; oBags80.textContent = "-"; return; }
    oCF.textContent = fmt(r.cubic_feet, 2);
    oCY.textContent = fmt(r.cubic_yards, 3);
    oCYW.textContent = fmt(r.cubic_yards_with_waste, 3);
    oBags60.textContent = r.bags_60lb + " bags";
    oBags80.textContent = r.bags_80lb + " bags";
  }
  shape.select.addEventListener("input", () => { refreshDims(); update(); });
  waste.input.addEventListener("input", update);
  refreshDims();
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderLumberSpans(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per IRC 2021 Tables R502.5, R602.5 (joist / header / framing spans); AWC NDS-2018 governs by reference. M = w*L^2/8; sigma = Mc/I; delta = 5wL^4/(384*E*I). AHJ governs. Free at codes.iccsafe.org and awc.org.";
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
  // v8 §C.4: actual deflection at the allowable span (inches).
  const oDef = makeOutputLine(outputRegion, "Deflection at allowable span", "ls-out-def");
  const update = debounce(() => {
    const r = computeLumberSpan({
      species_grade: sp.select.value,
      nominal_size: sz.select.value,
      total_load_psf: Number(tl.input.value) || 0,
      tributary_width_in: Number(tw.input.value) || 0,
      deflection_limit: Number(dl.input.value) || 360,
    });
    if (r.error) { oS.textContent = r.error; oB.textContent = "-"; oD.textContent = "-"; oG.textContent = "-"; oDef.textContent = "-"; return; }
    oS.textContent = fmt(r.allowable_span_ft, 2) + " ft";
    oB.textContent = fmt(r.by_bending_ft, 2) + " ft";
    oD.textContent = fmt(r.by_deflection_ft, 2) + " ft";
    oG.textContent = r.governing;
    oDef.textContent = fmt(r.deflection_in, 3) + " in (limit " + fmt(r.allowable_deflection_in, 3) + " in)";
  }, DEBOUNCE_MS);
  for (const el of [sp.select, sz.select, tl.input, tw.input, dl.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { total_rise_in: L, total_run_in: L, tread_cut_depth_in: L } out: { stringer_in: L, board_feet: L^3 }
export function computeStairStringer({ total_rise_in, total_run_in, tread_cut_depth_in = 1 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { uniform_load_plf: M T^-2, span_ft: L, E_psi: M L^-1 T^-2, I_in4: L^4 } out: { deflection_in: L, limit_360_in: L, limit_240_in: L }
export function computeJoistDeflection({ uniform_load_plf, span_ft, E_psi, I_in4 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { column_load_lb: M L T^-2, soil_class: dimensionless, applied_moment_lbft: M L^2 T^-2 } out: { area_ft2: L^2, side_ft: L, q_max_psf: M L^-1 T^-2, q_min_psf: M L^-1 T^-2 }
export function computeFootingArea({ column_load_lb, soil_class, applied_moment_lbft = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const P = Number(column_load_lb) || 0;
  const allow = SOIL_BEARING_PSF[soil_class];
  if (allow === undefined) return { error: "Unknown soil class." };
  if (P <= 0) return { error: "Column load must be positive." };
  const required_area_ft2 = P / allow;
  const side_ft = Math.sqrt(required_area_ft2);
  // Round side up to next 6-inch increment.
  const side_in = side_ft * 12;
  const rounded_side_in = Math.ceil(side_in / 6) * 6;
  const b_ft = rounded_side_in / 12;
  // v23 EN.10: actual bearing pressure check vs allowable, with the eccentric
  // (non-uniform) case flagged when a moment is entered. For a square pad of
  // side b: q = P/b^2 +/- 6M/b^3. q_min < 0 means uplift at the toe.
  let M = Number(applied_moment_lbft) || 0; if (!Number.isFinite(M)) M = 0;
  const A = b_ft * b_ft;
  const axial = P / A;
  const bending = b_ft > 0 ? (6 * M) / (b_ft * b_ft * b_ft) : 0;
  const q_max_psf = axial + Math.abs(bending);
  const q_min_psf = axial - Math.abs(bending);
  const eccentric_flag = M !== 0;
  const uplift_flag = q_min_psf < 0;
  const bearing_pass = q_max_psf <= allow && !uplift_flag;
  return {
    required_area_ft2,
    side_ft,
    rounded_side_in,
    rounded_side_ft: b_ft,
    allowable_psf: allow,
    q_max_psf, q_min_psf, bearing_pass, eccentric_flag, uplift_flag,
  };
}

export const footingAreaExample = {
  inputs: { column_load_lb: 12000, soil_class: "clay" },
  expected: { required_area_ft2: 8 },
};

// --- Utility 93: Tile Count and Grout Volume ---

// dims: in { area_ft2: L^2, tile_width_in: L, tile_height_in: L, grout_joint_width_in: L, tile_thickness_in: L, waste_factor: dimensionless } out: { tiles: dimensionless, grout_volume_in3: L^3 }
export function computeTileCount({ area_ft2, tile_width_in, tile_height_in, grout_joint_width_in = 0.125, tile_thickness_in = 0.25, waste_factor = 0.10 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { area_ft2: L^2, coats: dimensionless, primer_needed: dimensionless, surface_porosity: dimensionless } out: { gallons: L^3 }
export function computePaintCoverage({ area_ft2, coats = 2, primer_needed = false, surface_porosity = "smooth" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { length_ft: L, width_ft: L, depth_ft: L, side_slope_angle_deg: dimensionless } out: { volume_yd3: L^3 }
export function computeExcavationVolume({ length_ft, width_ft, depth_ft, side_slope_angle_deg = 90 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { wall_area_ft2: L^2, unit_type: dimensionless, mortar_joint_in: L, waste_factor: dimensionless } out: { units: dimensionless, mortar_ft3: L^3 }
export function computeMasonryCount({ wall_area_ft2, unit_type, mortar_joint_in = 0.375, waste_factor = 0.05 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
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

// dims: in { V_mph: L T^-1, exposure: dimensionless, Kz: dimensionless, Kzt: dimensionless, Kd: dimensionless, G: dimensionless } out: { q_psf: M L^-1 T^-2, windward_psf: M L^-1 T^-2, leeward_psf: M L^-1 T^-2, q_design_psf: M L^-1 T^-2 }
export function computeWindPressure({ V_mph, exposure = "C", Kz = 0, Kzt = 1.0, Kd = 0.85, G = 0.85 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const V = Number(V_mph) || 0;
  if (V <= 0) return { error: "Wind speed must be positive." };
  const q_psf = 0.00256 * V * V;
  // Exposure multipliers (Kz at 30 ft for typical exposures); orientation only.
  const kz = exposure === "B" ? 0.70 : exposure === "D" ? 1.03 : 0.85;
  const qz = q_psf * kz;
  // v23 EN.8: full ASCE 7 Ch.26-27 design velocity pressure with the
  // exposure/height (Kz), topographic (Kzt), directionality (Kd), and gust
  // (G) factors exposed. q = 0.00256*Kz*Kzt*Kd*V^2; p = q*G*Cp. A blank Kz
  // (0) falls back to the exposure-derived kz; all factors = 1 reproduces
  // the bare 0.00256*V^2 reference pressure.
  let kzEff = Number(Kz); if (!Number.isFinite(kzEff) || kzEff <= 0) kzEff = kz;
  let kzt = Number(Kzt); if (!Number.isFinite(kzt) || kzt <= 0) kzt = 1.0;
  let kd = Number(Kd); if (!Number.isFinite(kd) || kd <= 0) kd = 0.85;
  let g = Number(G); if (!Number.isFinite(g) || g <= 0) g = 0.85;
  const q_design_psf = 0.00256 * kzEff * kzt * kd * V * V;
  return {
    q_psf,
    qz_at_30ft_psf: qz,
    Cp_windward: WIND_PRESSURE_CP.windward,
    Cp_leeward: WIND_PRESSURE_CP.leeward,
    pressure_windward_psf: qz * WIND_PRESSURE_CP.windward,
    pressure_leeward_psf: qz * WIND_PRESSURE_CP.leeward,
    q_design_psf,
    p_design_windward_psf: q_design_psf * g * WIND_PRESSURE_CP.windward,
    p_design_leeward_psf: q_design_psf * g * WIND_PRESSURE_CP.leeward,
    Kz_used: kzEff, Kzt: kzt, Kd: kd, G: g,
  };
}

export const windPressureExample = {
  inputs: { V_mph: 100, exposure: "C" },
  expectedRange: { q_psf: { min: 25, max: 26 } },
};

// --- Utility 98: Snow Load (ASCE 7 flat-roof) ---
//
// Pf = 0.7 * Ce * Ct * Is * Pg  (psf)  [public ASCE 7 formula]

// dims: in { Pg_psf: M L^-1 T^-2, Ce: dimensionless, Ct: dimensionless, Is: dimensionless, Cs: dimensionless, drift_upwind_length_ft: L } out: { Pf_psf: M L^-1 T^-2, Ps_psf: M L^-1 T^-2, drift_height_ft: L }
export function computeSnowLoad({ Pg_psf, Ce = 1.0, Ct = 1.0, Is = 1.0, Cs = 1.0, drift_upwind_length_ft = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Pg = Number(Pg_psf) || 0;
  if (Pg <= 0) return { error: "Ground snow load must be positive." };
  const Pf = 0.7 * Ce * Ct * Is * Pg;
  // v23 EN.7: sloped-roof load Ps = Cs * Pf (Cs default 1 -> Ps = Pf), and the
  // ASCE 7 Ch.7 leeward drift height from the upwind fetch (optional).
  let cs = Number(Cs); if (!Number.isFinite(cs) || cs < 0) cs = 1.0;
  const Ps = cs * Pf;
  let drift_height_ft = null;
  const lu = Number(drift_upwind_length_ft) || 0;
  if (lu > 0 && Number.isFinite(lu)) {
    const hd = 0.43 * Math.cbrt(lu) * Math.pow(Pg + 10, 0.25) - 1.5;
    if (Number.isFinite(hd)) drift_height_ft = Math.max(0, hd);
  }
  return { Pf_psf: Pf, Ps_psf: Ps, drift_height_ft, Pg_psf: Pg, Ce, Ct, Is, Cs: cs };
}

export const snowLoadExample = {
  inputs: { Pg_psf: 30, Ce: 1.0, Ct: 1.0, Is: 1.0 },
  expected: { Pf_psf: 21 },
};

// --- Utility 99: Anchor Bolt Embedment ---
//
// Pull-out capacity per public bond strength: T = 0.7 * sqrt(fc) * pi * d * ld.
// Solve for ld given target T: ld = T / (0.7 * sqrt(fc) * pi * d).

// dims: in { uplift_lb: M L T^-2, bolt_diameter_in: L, fc_psi: M L^-1 T^-2, cracked: dimensionless, edge_distance_in: L } out: { embedment_in: L, embedment_cracked_in: L, edge_critical_in: L }
export function computeAnchorEmbedment({ uplift_lb, bolt_diameter_in, fc_psi, cracked = false, edge_distance_in = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const T = Number(uplift_lb) || 0;
  const d = Number(bolt_diameter_in) || 0;
  const fc = Number(fc_psi) || 0;
  if (T <= 0 || d <= 0 || fc <= 0) return { error: "Provide positive uplift, diameter, fc." };
  const ld_in = T / (0.7 * Math.sqrt(fc) * Math.PI * d);
  // v23 EN.9: cracked-concrete derate (ACI 318 Ch.17: cracked capacity ~0.7
  // of uncracked, so the required embedment grows) and an edge-distance flag
  // against the 1.5*hef critical edge distance for breakout. Defaults
  // (uncracked, no edge) leave the base embedment unchanged.
  const embedment_cracked_in = cracked ? ld_in / 0.7 : ld_in;
  const edge_critical_in = 1.5 * embedment_cracked_in;
  let edge_reduced_flag = false;
  const edge = Number(edge_distance_in) || 0;
  if (edge > 0 && Number.isFinite(edge) && edge < edge_critical_in) edge_reduced_flag = true;
  return { embedment_in: ld_in, embedment_cracked_in, edge_critical_in, edge_reduced_flag, cracked: !!cracked, embedment_ft: ld_in / 12, T_lb: T };
}

export const anchorEmbedmentExample = {
  inputs: { uplift_lb: 5000, bolt_diameter_in: 0.625, fc_psi: 3000 },
  expectedRange: { embedment_in: { min: 1, max: 100 } },
};

// --- v2 view renderers ---

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderStairStringer(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: stringer_ft = sqrt(rise^2 + run^2). Board-foot estimate uses a 2x12 stringer (1.5 in x 11.25 in actual).";
  // v10 §B.3 wiring: simplified-screening banner (AHJ-adopted code edition governs final geometry).
  renderLimitationBanner(inputRegion, getLimitationCopy("stair-stringer"));
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderFootingArea(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per IRC 2021 §R401-R403 (foundations); allowable soil-bearing values per IBC 2021 Table 1806.2. required_area = load / allowable_bearing. AHJ governs. Free at codes.iccsafe.org.";
  const P = makeNumber("Column load (lb)", "fa-p", { step: "any", min: "0" });
  const soil = makeSelect("Soil class", "fa-s", Object.keys(SOIL_BEARING_PSF).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  // v23 EN.10: optional applied moment for the eccentric bearing-pressure check.
  const M = makeNumber("Applied moment (lb-ft, optional)", "fa-m", { step: "any", min: "0" });
  for (const f of [P, soil, M]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { P.input.value = "12000"; soil.select.value = "clay"; M.input.value = "4000"; update(); });
  const oA = makeOutputLine(outputRegion, "Required area", "fa-out-a");
  const oS = makeOutputLine(outputRegion, "Side dimension", "fa-out-s");
  const oR = makeOutputLine(outputRegion, "Rounded side (next 6 in)", "fa-out-r");
  const oB = makeOutputLine(outputRegion, "Bearing pressure check", "fa-out-b");
  const update = debounce(() => {
    const r = computeFootingArea({ column_load_lb: Number(P.input.value) || 0, soil_class: soil.select.value, applied_moment_lbft: Number(M.input.value) || 0 });
    if (r.error) { oA.textContent = r.error; oS.textContent = "-"; oR.textContent = "-"; oB.textContent = "-"; return; }
    oA.textContent = fmt(r.required_area_ft2, 2) + " ft^2 @ " + r.allowable_psf + " psf";
    oS.textContent = fmt(r.side_ft, 2) + " ft (" + fmt(r.side_ft * 12, 1) + " in)";
    oR.textContent = r.rounded_side_in + " in (" + fmt(r.rounded_side_ft, 2) + " ft)";
    oB.textContent = "q_max " + fmt(r.q_max_psf, 0) + " psf" + (r.eccentric_flag ? " / q_min " + fmt(r.q_min_psf, 0) + " psf (eccentric" + (r.uplift_flag ? ", UPLIFT at toe" : "") + ")" : " (uniform)") + " - " + (r.bearing_pass ? "PASS vs allowable" : "FAIL: exceeds allowable or uplift");
  }, DEBOUNCE_MS);
  for (const el of [P.input, soil.select, M.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
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

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderWindPressure(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: q = 0.00256 * V^2 (V mph) per public ASCE 7 formula. Cp +0.8 windward, -0.5 leeward (typical).";
  const V = makeNumber("Basic wind speed (mph)", "wp-v", { step: "any", min: "0" });
  const exp = makeSelect("Exposure", "wp-e", [
    { value: "B", label: "B" }, { value: "C", label: "C", selected: true }, { value: "D", label: "D" },
  ]);
  // v23 EN.8: ASCE 7 design-pressure coefficients exposed (blank Kz = exposure default).
  const kz = makeNumber("Kz (blank = exposure default)", "wp-kz", { step: "any", min: "0" });
  const kzt = makeNumber("Kzt (topographic)", "wp-kzt", { step: "any", min: "0", value: "1.0" }); kzt.input.value = "1.0";
  const kd = makeNumber("Kd (directionality)", "wp-kd", { step: "any", min: "0", value: "0.85" }); kd.input.value = "0.85";
  const g = makeNumber("G (gust factor)", "wp-g", { step: "any", min: "0", value: "0.85" }); g.input.value = "0.85";
  for (const f of [V, exp, kz, kzt, kd, g]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { V.input.value = "100"; exp.select.value = "C"; kz.input.value = ""; kzt.input.value = "1.0"; kd.input.value = "0.85"; g.input.value = "0.85"; update(); });
  const oQ = makeOutputLine(outputRegion, "Velocity pressure q", "wp-out-q");
  const oZ = makeOutputLine(outputRegion, "qz at 30 ft", "wp-out-z");
  const oW = makeOutputLine(outputRegion, "Windward pressure", "wp-out-w");
  const oL = makeOutputLine(outputRegion, "Leeward pressure", "wp-out-l");
  const oD = makeOutputLine(outputRegion, "Design pressure (Kz Kzt Kd, G Cp)", "wp-out-d");
  const update = debounce(() => {
    const r = computeWindPressure({
      V_mph: Number(V.input.value) || 0,
      exposure: exp.select.value,
      Kz: Number(kz.input.value) || 0, Kzt: Number(kzt.input.value) || 1, Kd: Number(kd.input.value) || 0.85, G: Number(g.input.value) || 0.85,
    });
    if (r.error) { oQ.textContent = r.error; oZ.textContent = "-"; oW.textContent = "-"; oL.textContent = "-"; oD.textContent = "-"; return; }
    oQ.textContent = fmt(r.q_psf, 2) + " psf";
    oZ.textContent = fmt(r.qz_at_30ft_psf, 2) + " psf";
    oW.textContent = fmt(r.pressure_windward_psf, 2) + " psf (Cp " + r.Cp_windward + ")";
    oL.textContent = fmt(r.pressure_leeward_psf, 2) + " psf (Cp " + r.Cp_leeward + ")";
    oD.textContent = "q_design " + fmt(r.q_design_psf, 2) + " psf -> windward " + fmt(r.p_design_windward_psf, 2) + " psf (Kz " + fmt(r.Kz_used, 2) + ")";
  }, DEBOUNCE_MS);
  for (const el of [V.input, exp.select, kz.input, kzt.input, kd.input, g.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderSnowLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Pf = 0.7 * Ce * Ct * Is * Pg per public ASCE 7 formula.";
  const Pg = makeNumber("Ground snow load Pg (psf)", "sl-pg", { step: "any", min: "0" });
  const Ce = makeNumber("Exposure factor Ce", "sl-ce", { step: "any", min: "0", value: "1.0" });
  Ce.input.value = "1.0";
  const Ct = makeNumber("Thermal factor Ct", "sl-ct", { step: "any", min: "0", value: "1.0" });
  Ct.input.value = "1.0";
  const Is = makeNumber("Importance factor Is", "sl-is", { step: "any", min: "0", value: "1.0" });
  Is.input.value = "1.0";
  // v23 EN.7: sloped-roof factor Cs and the optional drift upwind fetch.
  const Cs = makeNumber("Sloped-roof factor Cs", "sl-cs", { step: "any", min: "0", value: "1.0" }); Cs.input.value = "1.0";
  const lu = makeNumber("Drift upwind fetch (ft, optional)", "sl-lu", { step: "any", min: "0" });
  for (const f of [Pg, Ce, Ct, Is, Cs, lu]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { Pg.input.value = "30"; Ce.input.value = "1.0"; Ct.input.value = "1.0"; Is.input.value = "1.0"; Cs.input.value = "0.9"; lu.input.value = "50"; update(); });
  const oP = makeOutputLine(outputRegion, "Flat-roof snow load Pf", "sl-out-p");
  const oPs = makeOutputLine(outputRegion, "Sloped-roof load Ps", "sl-out-ps");
  const oDr = makeOutputLine(outputRegion, "Leeward drift height", "sl-out-dr");
  const update = debounce(() => {
    const r = computeSnowLoad({
      Pg_psf: Number(Pg.input.value) || 0,
      Ce: Number(Ce.input.value) || 1,
      Ct: Number(Ct.input.value) || 1,
      Is: Number(Is.input.value) || 1,
      Cs: Number(Cs.input.value) || 1,
      drift_upwind_length_ft: Number(lu.input.value) || 0,
    });
    if (r.error) { oP.textContent = r.error; oPs.textContent = "-"; oDr.textContent = "-"; return; }
    oP.textContent = fmt(r.Pf_psf, 2) + " psf";
    oPs.textContent = fmt(r.Ps_psf, 2) + " psf (Cs " + fmt(r.Cs, 2) + ")";
    oDr.textContent = r.drift_height_ft == null ? "(enter upwind fetch)" : fmt(r.drift_height_ft, 2) + " ft";
  }, DEBOUNCE_MS);
  for (const el of [Pg.input, Ce.input, Ct.input, Is.input, Cs.input, lu.input]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderAnchorEmbedment(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ld = T / (0.7 * sqrt(fc) * pi * d). Public bond strength formula.";
  const T = makeNumber("Uplift load (lb)", "ae-t", { step: "any", min: "0" });
  const d = makeNumber("Bolt diameter (in)", "ae-d", { step: "any", min: "0" });
  const fc = makeNumber("Concrete fc (psi)", "ae-fc", { step: "any", min: "0" });
  // v23 EN.9: cracked-concrete toggle + edge distance.
  const cracked = makeSelect("Concrete condition", "ae-cr", [{ value: "uncracked", label: "Uncracked" }, { value: "cracked", label: "Cracked" }]);
  const edge = makeNumber("Edge distance (in, optional)", "ae-ed", { step: "any", min: "0" });
  for (const f of [T, d, fc, cracked, edge]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { T.input.value = "5000"; d.input.value = "0.625"; fc.input.value = "3000"; cracked.select.value = "cracked"; edge.input.value = "3"; update(); });
  const oI = makeOutputLine(outputRegion, "Required embedment", "ae-out-i");
  const oF = makeOutputLine(outputRegion, "Required embedment (ft)", "ae-out-f");
  const oE = makeOutputLine(outputRegion, "Cracked / edge check", "ae-out-e");
  const update = debounce(() => {
    const r = computeAnchorEmbedment({
      uplift_lb: Number(T.input.value) || 0,
      bolt_diameter_in: Number(d.input.value) || 0,
      fc_psi: Number(fc.input.value) || 0,
      cracked: cracked.select.value === "cracked",
      edge_distance_in: Number(edge.input.value) || 0,
    });
    if (r.error) { oI.textContent = r.error; oF.textContent = "-"; oE.textContent = "-"; return; }
    oI.textContent = fmt(r.embedment_in, 2) + " in";
    oF.textContent = fmt(r.embedment_ft, 3) + " ft";
    oE.textContent = (r.cracked ? "cracked: " + fmt(r.embedment_cracked_in, 2) + " in required; " : "uncracked; ") + "critical edge " + fmt(r.edge_critical_in, 2) + " in" + (r.edge_reduced_flag ? " - FLAG: edge below critical, capacity reduced" : "");
  }, DEBOUNCE_MS);
  for (const el of [T.input, d.input, fc.input, cracked.select, edge.input]) el.addEventListener("input", update);
}

// =====================================================================
// v3 utilities (147 through 158). See spec-v3.md section 2.5.
// =====================================================================

// --- Utility 147: Drywall Sheet Count and Mud ---

export const SHEET_AREAS_FT2 = { "4x8": 32, "4x10": 40, "4x12": 48 };

// dims: in { wall_area_ft2: L^2, ceiling_area_ft2: L^2, sheet_size: dimensionless, waste_percent: dimensionless } out: { sheets: dimensionless }
export function computeDrywall({ wall_area_ft2 = 0, ceiling_area_ft2 = 0, sheet_size = "4x8", waste_percent = 10 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(wall_area_ft2 >= 0 && ceiling_area_ft2 >= 0)) return { error: "Areas must be non-negative." };
  const sheetA = SHEET_AREAS_FT2[sheet_size];
  if (!sheetA) return { error: "Unknown sheet size." };
  const total_ft2 = wall_area_ft2 + ceiling_area_ft2;
  if (total_ft2 === 0) return { error: "Provide a wall or ceiling area." };
  const sheets = Math.ceil((total_ft2 * (1 + waste_percent / 100)) / sheetA);
  // Public engineering practice benchmarks: 0.053 gal mud / ft^2; 1.0 lf tape / ft^2.
  const mud_gal = total_ft2 * 0.053;
  const tape_lf = total_ft2 * 1.0;
  const screws = Math.ceil((wall_area_ft2 / sheetA) * 28 + (ceiling_area_ft2 / sheetA) * 32);
  return { sheets, mud_gal, tape_lf, screws, total_ft2 };
}

export const drywallExample = {
  inputs: { wall_area_ft2: 1200, ceiling_area_ft2: 600, sheet_size: "4x8", waste_percent: 10 },
};

// --- Utility 148: Roofing Squares and Bundles ---

export const SHINGLE_BUNDLES_PER_SQUARE = { "3-tab": 3, architectural: 3, premium: 4 };

// dims: in { roof_area_ft2: L^2, pitch_rise: dimensionless, shingle_product: dimensionless, perimeter_ft: L } out: { squares: dimensionless, bundles: dimensionless }
export function computeRoofingSquares({ roof_area_ft2 = 0, pitch_rise = 0, shingle_product = "architectural", perimeter_ft = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(roof_area_ft2 > 0)) return { error: "Roof area must be positive." };
  if (!(pitch_rise >= 0 && pitch_rise <= 24)) return { error: "Pitch rise must be 0-24 inches per 12." };
  const bundlesPerSquare = SHINGLE_BUNDLES_PER_SQUARE[shingle_product];
  if (!Number.isFinite(bundlesPerSquare)) return { error: "Unknown shingle product." };
  // Waste factor scales with pitch (engineering practice).
  let waste = 0.10;
  if (pitch_rise >= 6 && pitch_rise < 9) waste = 0.12;
  else if (pitch_rise >= 9 && pitch_rise < 12) waste = 0.15;
  else if (pitch_rise >= 12) waste = 0.18;
  const squares = (roof_area_ft2 / 100) * (1 + waste);
  const bundles = Math.ceil(squares * bundlesPerSquare);
  // Underlayment: 4 squares per roll (typical 15 lb felt or synthetic).
  const underlayment_rolls = Math.ceil(squares / 4);
  return {
    squares,
    bundles,
    underlayment_rolls,
    drip_edge_lf: perimeter_ft,
    starter_strip_lf: perimeter_ft,
    waste_factor: waste,
  };
}

export const roofingSquaresExample = {
  inputs: { roof_area_ft2: 2200, pitch_rise: 6, shingle_product: "architectural", perimeter_ft: 200 },
};

// --- Utility 149: Asphalt Tonnage ---

// dims: in { area_ft2: L^2, depth_in: L, density_pcf: M L^-3, paving_width_ft: L } out: { tons: M }
export function computeAsphaltTonnage({ area_ft2 = 0, depth_in = 0, density_pcf = 145, paving_width_ft = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(area_ft2 > 0)) return { error: "Area must be positive." };
  if (!(depth_in > 0)) return { error: "Depth must be positive." };
  if (!(density_pcf > 0)) return { error: "Density must be positive." };
  const volume_ft3 = area_ft2 * (depth_in / 12);
  const tons = (volume_ft3 * density_pcf) / 2000;
  const truck_loads_at_20T = Math.ceil(tons / 20);
  // v8 §C.4: paving distance at the entered paving width. Lets the foreman
  // see "this much asphalt = X feet of road at Y ft wide".
  const paving_distance_ft = paving_width_ft > 0
    ? area_ft2 / paving_width_ft : null;
  // Per-truck paving distance (handy for staging multiple loads).
  const distance_per_truck_ft = paving_distance_ft !== null && truck_loads_at_20T > 0
    ? paving_distance_ft / truck_loads_at_20T : null;
  return {
    tons, volume_ft3,
    truck_loads_at_20T,
    paving_distance_ft,
    distance_per_truck_ft,
  };
}

export const asphaltTonnageExample = { inputs: { area_ft2: 5000, depth_in: 3, density_pcf: 145 } };

// --- Utility 150: Aggregate / Gravel Cubic Yards ---

export const AGGREGATE_DENSITIES_PCF = {
  sand: 100, pea_gravel: 110, crushed_stone: 100, road_base: 130,
};

// dims: in { area_ft2: L^2, depth_in: L, material: dimensionless } out: { volume_yd3: L^3, tons: M }
export function computeAggregate({ area_ft2 = 0, depth_in = 0, material = "crushed_stone" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(area_ft2 > 0)) return { error: "Area must be positive." };
  if (!(depth_in > 0)) return { error: "Depth must be positive." };
  const pcf = AGGREGATE_DENSITIES_PCF[material];
  if (!Number.isFinite(pcf)) return { error: "Unknown material." };
  const volume_ft3 = area_ft2 * (depth_in / 12);
  const cubic_yards = volume_ft3 / 27;
  const tons = (volume_ft3 * pcf) / 2000;
  return { cubic_yards, tons, pcf };
}

export const aggregateExample = { inputs: { area_ft2: 1000, depth_in: 4, material: "crushed_stone" } };

// --- Utility 151: Mortar Mix and Yield ---
//
// Yield from PCA references: roughly 30 standard (modular) bricks per bag of
// mortar with 3/8 in joints; 30 8-inch CMU per 3 bags.

export const MORTAR_TYPES = ["N", "S", "M"];

// dims: in { unit_count: dimensionless, unit_kind: dimensionless, joint_in: L, mortar_type: dimensionless } out: { bags_70: dimensionless, sand_ft3: L^3 }
export function computeMortarMix({ unit_count = 0, unit_kind = "brick", joint_in = 0.375, mortar_type = "N" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(unit_count > 0)) return { error: "Unit count must be positive." };
  if (!MORTAR_TYPES.includes(mortar_type)) return { error: "Unknown mortar type." };
  // Joint thickness adjustment vs 3/8 baseline.
  const joint_factor = joint_in / 0.375;
  let bags;
  if (unit_kind === "brick") bags = Math.ceil((unit_count / 30) * joint_factor);
  else if (unit_kind === "cmu_8") bags = Math.ceil((unit_count / 10) * joint_factor);
  else return { error: "Unknown unit kind." };
  return { bags, mortar_type, joint_factor };
}

export const mortarMixExample = { inputs: { unit_count: 600, unit_kind: "brick", joint_in: 0.375, mortar_type: "N" } };

// --- Utility 152: Concrete Mix Design (Simplified, ACI 211 style) ---
//
// w/c interpolation by strength and exposure. Public-domain ACI 211 curve points.

export const ACI_211_W_C = {
  interior: { 2500: 0.65, 3000: 0.58, 3500: 0.52, 4000: 0.48, 5000: 0.40, 6000: 0.36 },
  freeze_thaw: { 2500: 0.50, 3000: 0.48, 3500: 0.45, 4000: 0.42, 5000: 0.38, 6000: 0.34 },
  marine: { 2500: 0.45, 3000: 0.45, 3500: 0.42, 4000: 0.40, 5000: 0.38, 6000: 0.34 },
  sulfate: { 2500: 0.50, 3000: 0.45, 3500: 0.42, 4000: 0.40, 5000: 0.38, 6000: 0.34 },
};

// dims: in { strength_psi: M L^-1 T^-2, exposure: dimensionless, max_aggregate_in: L, slump_in: L } out: { wc_ratio: dimensionless, cement_lb_per_yd3: M L^-3 }
export function computeConcreteMixDesign({ strength_psi = 3000, exposure = "interior", max_aggregate_in = 1, slump_in = 4 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const tbl = ACI_211_W_C[exposure];
  if (!tbl) return { error: "Unknown exposure class." };
  if (!(strength_psi >= 1500)) return { error: "Strength must be at least 1500 psi." };
  // Find bracketing strengths.
  const strengths = Object.keys(tbl).map((k) => Number(k)).sort((a, b) => a - b);
  let wc;
  if (strength_psi <= strengths[0]) wc = tbl[strengths[0]];
  else if (strength_psi >= strengths[strengths.length - 1]) wc = tbl[strengths[strengths.length - 1]];
  else {
    for (let i = 0; i < strengths.length - 1; i++) {
      if (strength_psi >= strengths[i] && strength_psi <= strengths[i + 1]) {
        const t = (strength_psi - strengths[i]) / (strengths[i + 1] - strengths[i]);
        wc = tbl[strengths[i]] + t * (tbl[strengths[i + 1]] - tbl[strengths[i]]);
        break;
      }
    }
  }
  // Water content from slump and max aggregate (public ACI 211 typical values, lb/yd^3).
  const waterByAgg = { 0.375: 385, 0.5: 365, 0.75: 340, 1: 325, 1.5: 300, 2: 285 };
  const sizes = Object.keys(waterByAgg).map((k) => Number(k)).sort((a, b) => a - b);
  let baseWater = 325;
  for (let i = 0; i < sizes.length; i++) if (max_aggregate_in <= sizes[i]) { baseWater = waterByAgg[sizes[i]]; break; }
  // Slump correction: +6 lb/in over 4 in baseline.
  const water_lb_yd3 = baseWater + Math.max(0, slump_in - 4) * 6;
  const cement_lb_yd3 = water_lb_yd3 / wc;
  const cement_bags_yd3 = cement_lb_yd3 / 94;
  // Coarse aggregate ~ 1700 lb/yd^3 typical; fine aggregate fills volume.
  const coarse_lb_yd3 = 1700;
  // Total weight ~ 4000 lb/yd^3 typical.
  const total_lb_yd3 = 4000;
  const fine_lb_yd3 = Math.max(0, total_lb_yd3 - water_lb_yd3 - cement_lb_yd3 - coarse_lb_yd3);
  return {
    wc_ratio: wc, water_lb_yd3, cement_lb_yd3, cement_bags_yd3,
    coarse_lb_yd3, fine_lb_yd3,
  };
}

export const concreteMixDesignExample = { inputs: { strength_psi: 4000, exposure: "interior", max_aggregate_in: 1, slump_in: 4 } };

// --- Utility 153: Bolt Torque to Clamp Load ---
//
// T = K * D * F (short form). Bundled proof loads from public ASTM/SAE benchmarks.

export const BOLT_PROOF_LOADS_PSI = {
  SAE_2: 55000, SAE_5: 85000, SAE_8: 120000,
  ASTM_A307: 36000, ASTM_A325: 92000, ASTM_A490: 120000,
};

export const TORQUE_K_FACTOR = { dry: 0.20, oiled: 0.18, antiseize: 0.15 };

// Tensile stress area from public ANSI/ASME B1.1 short form: A_t = 0.7854 * (D - 0.9743 * P)^2,
// for unified coarse threads. We approximate per-diameter stress areas.
const BOLT_TENSILE_AREA_IN2 = {
  0.25: 0.0318, 0.3125: 0.0524, 0.375: 0.0775, 0.4375: 0.1063, 0.5: 0.1419,
  0.5625: 0.1820, 0.625: 0.2260, 0.75: 0.3340, 0.875: 0.4620, 1: 0.6060, 1.25: 0.9690, 1.5: 1.405,
};

// dims: in { grade: dimensionless, diameter_in: L, lubrication: dimensionless, preload_fraction: dimensionless } out: { torque_ft_lb: M L^2 T^-2, preload_lb: M L T^-2 }
export function computeBoltTorque({ grade = "SAE_5", diameter_in = 0.5, lubrication = "dry", preload_fraction = 0.75 }) {
  const proof = BOLT_PROOF_LOADS_PSI[grade];
  if (!Number.isFinite(proof)) return { error: "Unknown bolt grade." };
  const K = TORQUE_K_FACTOR[lubrication];
  if (!Number.isFinite(K)) return { error: "Unknown lubrication condition." };
  if (!(diameter_in > 0)) return { error: "Diameter must be positive." };
  if (!(preload_fraction > 0 && preload_fraction <= 1)) return { error: "Preload fraction must be 0..1." };
  const At = BOLT_TENSILE_AREA_IN2[diameter_in];
  if (!Number.isFinite(At)) return { error: "Unsupported bolt diameter." };
  const F = proof * At * preload_fraction;
  const T_in_lb = K * diameter_in * F;
  const T_ft_lb = T_in_lb / 12;
  return { K, F_lb: F, torque_in_lb: T_in_lb, torque_ft_lb: T_ft_lb };
}

export const boltTorqueExample = { inputs: { grade: "SAE_5", diameter_in: 0.5, lubrication: "dry", preload_fraction: 0.75 } };

// --- Utility 154: Sheet Metal Bend Allowance ---
//
// BA = (pi/180) * angle * (R + K * t)
// flat_blank = leg_a + leg_b + BA - 2*(R + t)*tan(angle/2)  [common practice]

// dims: in { thickness_in: L, bend_angle_deg: dimensionless, inside_radius_in: L, k_factor: dimensionless, leg_a_in: L, leg_b_in: L } out: { bend_allowance_in: L, setback_in: L, bend_deduction_in: L, flat_blank_in: L }
export function computeBendAllowance({ thickness_in = 0, bend_angle_deg = 0, inside_radius_in = 0, k_factor = 0.44, leg_a_in = 0, leg_b_in = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(thickness_in > 0)) return { error: "Thickness must be positive." };
  if (!(bend_angle_deg > 0 && bend_angle_deg < 180)) return { error: "Bend angle must be 0-180 deg." };
  if (!(inside_radius_in >= 0)) return { error: "Inside radius cannot be negative." };
  const ba = (Math.PI / 180) * bend_angle_deg * (inside_radius_in + k_factor * thickness_in);
  // Outside setback (OSSB) for the flat-pattern formula.
  const setback = (inside_radius_in + thickness_in) * Math.tan((bend_angle_deg / 2) * Math.PI / 180);
  // v24 EN.3: bend deduction BD = 2*OSSB - BA, the per-bend amount subtracted
  // from the sum of flange lengths to get the developed flat-blank length.
  const bend_deduction_in = 2 * setback - ba;
  const flat_blank = leg_a_in + leg_b_in - bend_deduction_in;
  return { bend_allowance_in: ba, setback_in: setback, bend_deduction_in, flat_blank_in: flat_blank };
}

export const bendAllowanceExample = { inputs: { thickness_in: 0.06, bend_angle_deg: 90, inside_radius_in: 0.125, k_factor: 0.44, leg_a_in: 2, leg_b_in: 3 } };

// --- Utility 155: Shop Speeds and Feeds ---
//
// RPM = SFM * 3.82 / D
// IPM = RPM * chipload_ipt * flutes

export const SFM_TABLE = {
  // tool x material -> { sfm, chipload_ipt }
  drill: {
    steel: { sfm: 80, chipload_ipt: 0.005 },
    stainless: { sfm: 50, chipload_ipt: 0.003 },
    aluminum: { sfm: 250, chipload_ipt: 0.008 },
    brass: { sfm: 150, chipload_ipt: 0.006 },
    hardwood: { sfm: 250, chipload_ipt: 0.010 },
    softwood: { sfm: 350, chipload_ipt: 0.012 },
    plastic: { sfm: 200, chipload_ipt: 0.005 },
  },
  end_mill: {
    steel: { sfm: 100, chipload_ipt: 0.003 },
    stainless: { sfm: 60, chipload_ipt: 0.002 },
    aluminum: { sfm: 600, chipload_ipt: 0.005 },
    brass: { sfm: 200, chipload_ipt: 0.004 },
    hardwood: { sfm: 1000, chipload_ipt: 0.010 },
    softwood: { sfm: 1200, chipload_ipt: 0.012 },
    plastic: { sfm: 500, chipload_ipt: 0.006 },
  },
  lathe: {
    steel: { sfm: 100, chipload_ipt: 0.010 },
    stainless: { sfm: 60, chipload_ipt: 0.008 },
    aluminum: { sfm: 400, chipload_ipt: 0.012 },
    brass: { sfm: 250, chipload_ipt: 0.010 },
    hardwood: { sfm: 600, chipload_ipt: 0.015 },
    softwood: { sfm: 800, chipload_ipt: 0.020 },
    plastic: { sfm: 300, chipload_ipt: 0.010 },
  },
};

// dims: in { tool: dimensionless, material: dimensionless, diameter_in: L, flutes: dimensionless } out: { rpm: T^-1, feed_ipm: L T^-1 }
export function computeSpeedsAndFeeds({ tool = "drill", material = "steel", diameter_in = 0, flutes = 1 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const t = SFM_TABLE[tool];
  if (!t) return { error: "Unknown tool type." };
  const m = t[material];
  if (!m) return { error: "Unknown material." };
  if (!(diameter_in > 0)) return { error: "Diameter must be positive." };
  if (!(flutes >= 1)) return { error: "Flutes must be at least 1." };
  const rpm = m.sfm * 3.82 / diameter_in;
  const ipm = rpm * m.chipload_ipt * flutes;
  return { sfm: m.sfm, chipload_ipt: m.chipload_ipt, rpm, ipm };
}

export const speedsAndFeedsExample = { inputs: { tool: "end_mill", material: "aluminum", diameter_in: 0.5, flutes: 2 } };

// --- Utility 156: Welding Rod and Wire Usage ---

export const WELD_DEPOSITION_EFFICIENCY = { SMAW: 0.60, GMAW: 0.90, FCAW: 0.80, GTAW: 1.00 };
export const WELD_GAS_FLOW_CFH = { SMAW: 0, GMAW: 35, FCAW: 35, GTAW: 20 };

// dims: in { process: dimensionless, weld_cross_section_in2: L^2, weld_length_in: L, deposition_rate_lb_per_min: M T^-1 } out: { electrode_lb: M, arc_time_min: T }
export function computeWeldUsage({ process = "GMAW", weld_cross_section_in2 = 0, weld_length_in = 0, deposition_rate_lb_per_min = 4 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const eff = WELD_DEPOSITION_EFFICIENCY[process];
  if (!Number.isFinite(eff)) return { error: "Unknown welding process." };
  if (!(weld_cross_section_in2 > 0)) return { error: "Cross-section must be positive." };
  if (!(weld_length_in > 0)) return { error: "Weld length must be positive." };
  if (!(deposition_rate_lb_per_min > 0)) return { error: "Deposition rate must be positive." };
  // Steel density 0.283 lb/in^3.
  const deposit_lb = weld_cross_section_in2 * weld_length_in * 0.283;
  const consumable_lb = deposit_lb / eff;
  const minutes = deposit_lb / deposition_rate_lb_per_min;
  const gas_cfh = WELD_GAS_FLOW_CFH[process];
  const gas_ft3 = (gas_cfh * minutes) / 60;
  return { deposit_lb, consumable_lb, minutes, gas_ft3, efficiency: eff };
}

export const weldUsageExample = { inputs: { process: "GMAW", weld_cross_section_in2: 0.05, weld_length_in: 120, deposition_rate_lb_per_min: 4 } };

// --- Utility 157: Demolition Debris Weight ---

export const DEMO_DEBRIS_PCF = { wood_frame: 50, mixed: 100, masonry: 130, concrete: 150 };
export const DUMPSTER_SIZES_YD3 = [10, 20, 30, 40];

// dims: in { structure_type: dimensionless, volume_yd3: L^3 } out: { debris_yd3: L^3, containers: dimensionless }
export function computeDemoDebris({ structure_type = "wood_frame", volume_yd3 = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const pcf = DEMO_DEBRIS_PCF[structure_type];
  if (!Number.isFinite(pcf)) return { error: "Unknown structure type." };
  if (!(volume_yd3 > 0)) return { error: "Volume must be positive." };
  const volume_ft3 = volume_yd3 * 27;
  const tons = (volume_ft3 * pcf) / 2000;
  // Dumpster recommendation (volume-based; weight limits per dumpster vary by hauler).
  const dumpster_yd3 = DUMPSTER_SIZES_YD3.find((s) => s >= volume_yd3) || DUMPSTER_SIZES_YD3[DUMPSTER_SIZES_YD3.length - 1];
  return { tons, volume_ft3, dumpster_yd3, pcf };
}

export const demoDebrisExample = { inputs: { structure_type: "wood_frame", volume_yd3: 25 } };

// --- Utility 158: Formwork Pressure (ACI 347 short form) ---
//
// P = C_w * (150 + 9000R/T)  capped at wet head (rho * h) for tall pours.

export const ACI_C_W = { normal: 1.0, lightweight_115: 0.85, lightweight_135: 0.93, plasticized: 1.20 };

// dims: in { args: dimensionless } out: { pressure_psf: M L^-1 T^-2 }
export function computeFormworkPressure({
  pour_rate_ft_per_hr = 0, concrete_temp_F = 70, weight_factor = "normal", unit_weight_pcf = 150, wall_height_ft = 100,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pour_rate_ft_per_hr > 0)) return { error: "Pour rate must be positive." };
  if (!(concrete_temp_F > 0)) return { error: "Concrete temperature must be positive." };
  const Cw = ACI_C_W[weight_factor];
  if (!Number.isFinite(Cw)) return { error: "Unknown weight factor." };
  const P_aci = Cw * (150 + (9000 * pour_rate_ft_per_hr) / concrete_temp_F);
  const P_wet = unit_weight_pcf * wall_height_ft;
  const cap_applied = P_aci > P_wet;
  return {
    pressure_psf: Math.min(P_aci, P_wet),
    aci_pressure_psf: P_aci,
    wet_head_psf: P_wet,
    cap_applied,
    weight_factor: Cw,
  };
}

export const formworkPressureExample = { inputs: { pour_rate_ft_per_hr: 5, concrete_temp_F: 70, weight_factor: "normal", unit_weight_pcf: 150, wall_height_ft: 12 } };

// --- v3 renderers (compact) ---

import {
  DEBOUNCE_MS as _DC, debounce as _debC, makeNumber as _mnC, makeSelect as _msC,
  makeOutputLine as _moC, attachExampleButton as _aeC, fmt as _fmtC,
} from "./ui-fields.js";

function _simpleRenderer(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    _aeC(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = _msC(f.label, f.id, f.options);
      else field = _mnC(f.label, f.id, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) {
        if (f.kind === "select") field.select.value = f.default;
        else field.input.value = String(f.default);
      }
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = _moC(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        if (f.kind === "select") fields[f.key].select.value = v[f.key];
        else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = _debC(() => {
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
      for (const o of spec.outputs) {
        const val = o.value(r);
        outs[o.key].textContent = val;
      }
    }, _DC);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener("input", update);
    }
  };
}

const renderDrywall = _simpleRenderer({
  citation: "Citation: Public engineering practice (0.053 gal mud / ft^2; 1.0 lf tape / ft^2; 28-32 screws / sheet).",
  example: drywallExample.inputs,
  fields: [
    { key: "wall_area_ft2", label: "Wall area (ft^2)", kind: "number" },
    { key: "ceiling_area_ft2", label: "Ceiling area (ft^2)", kind: "number" },
    { key: "sheet_size", label: "Sheet size", kind: "select", options: [{ value: "4x8", label: "4x8" }, { value: "4x10", label: "4x10" }, { value: "4x12", label: "4x12" }] },
    { key: "waste_percent", label: "Waste (%)", kind: "number", default: 10 },
  ],
  outputs: [
    { key: "sheets", id: "dr-out-s", label: "Sheets", value: (r) => String(r.sheets) },
    { key: "mud", id: "dr-out-m", label: "Mud (gal)", value: (r) => _fmtC(r.mud_gal, 1) },
    { key: "tape", id: "dr-out-t", label: "Tape (lf)", value: (r) => _fmtC(r.tape_lf, 0) },
    { key: "screws", id: "dr-out-c", label: "Screws", value: (r) => String(r.screws) },
  ],
  compute: computeDrywall,
});

const renderRoofingSquares = _simpleRenderer({
  citation: "Citation: Roofing squares (1 sq = 100 ft^2). Bundles per square per shingle product (3 for 3-tab/architectural, 4 for premium). Manufacturer benchmarks generally.",
  example: roofingSquaresExample.inputs,
  fields: [
    { key: "roof_area_ft2", label: "Roof area (ft^2)", kind: "number" },
    { key: "pitch_rise", label: "Pitch rise (in / 12)", kind: "number" },
    { key: "shingle_product", label: "Shingle product", kind: "select", options: [{ value: "3-tab", label: "3-tab" }, { value: "architectural", label: "Architectural" }, { value: "premium", label: "Premium" }] },
    { key: "perimeter_ft", label: "Perimeter (ft)", kind: "number" },
  ],
  outputs: [
    { key: "sq", id: "rs-out-s", label: "Squares", value: (r) => _fmtC(r.squares, 1) },
    { key: "b", id: "rs-out-b", label: "Bundles", value: (r) => String(r.bundles) },
    { key: "u", id: "rs-out-u", label: "Underlayment rolls", value: (r) => String(r.underlayment_rolls) },
    { key: "d", id: "rs-out-d", label: "Drip edge / starter (lf)", value: (r) => _fmtC(r.drip_edge_lf, 0) },
  ],
  compute: computeRoofingSquares,
});

const renderAsphaltTonnage = _simpleRenderer({
  citation: "Citation: Tons = volume * density / 2000. Default density 145 pcf for hot mix. Optional paving width yields paving distance and per-truck length.",
  example: asphaltTonnageExample.inputs,
  fields: [
    { key: "area_ft2", label: "Paved area (ft^2)", kind: "number" },
    { key: "depth_in", label: "Compacted depth (in)", kind: "number" },
    { key: "density_pcf", label: "Mix density (pcf)", kind: "number", default: 145 },
    // v8 §C.4: optional paving width activates paving-distance + per-truck length.
    { key: "paving_width_ft", label: "Paving width (ft, optional)", kind: "number", attrs: { step: "any", min: "0" } },
  ],
  outputs: [
    { key: "t", id: "at-out-t", label: "Tons", value: (r) => _fmtC(r.tons, 1) },
    { key: "tl", id: "at-out-tl", label: "Truck loads (20T)", value: (r) => String(r.truck_loads_at_20T) },
    { key: "pd", id: "at-out-pd", label: "Paving distance", value: (r) => r.paving_distance_ft === null ? "-" : _fmtC(r.paving_distance_ft, 0) + " ft" },
    { key: "dpt", id: "at-out-dpt", label: "Length per truck", value: (r) => r.distance_per_truck_ft === null ? "-" : _fmtC(r.distance_per_truck_ft, 0) + " ft / truck" },
  ],
  compute: computeAsphaltTonnage,
});

const renderAggregate = _simpleRenderer({
  citation: "Citation: Cubic yards from area * depth / 27; tons from volume * pcf / 2000. Densities from public engineering tables.",
  example: aggregateExample.inputs,
  fields: [
    { key: "area_ft2", label: "Area (ft^2)", kind: "number" },
    { key: "depth_in", label: "Depth (in)", kind: "number" },
    { key: "material", label: "Material", kind: "select", options: Object.keys(AGGREGATE_DENSITIES_PCF).map((k) => ({ value: k, label: k.replace(/_/g, " ") })) },
  ],
  outputs: [
    { key: "y", id: "ag-out-y", label: "Cubic yards", value: (r) => _fmtC(r.cubic_yards, 2) },
    { key: "t", id: "ag-out-t", label: "Tons", value: (r) => _fmtC(r.tons, 2) },
  ],
  compute: computeAggregate,
});

const renderMortarMix = _simpleRenderer({
  citation: "Citation: PCA references (typical 30 standard bricks / bag at 3/8 in joint; 30 8-in CMU / 3 bags).",
  example: mortarMixExample.inputs,
  fields: [
    { key: "unit_count", label: "Unit count", kind: "number" },
    { key: "unit_kind", label: "Unit kind", kind: "select", options: [{ value: "brick", label: "Standard brick" }, { value: "cmu_8", label: "8-in CMU" }] },
    { key: "joint_in", label: "Joint thickness (in)", kind: "number", default: 0.375 },
    { key: "mortar_type", label: "Mortar type", kind: "select", options: [{ value: "N", label: "Type N" }, { value: "S", label: "Type S" }, { value: "M", label: "Type M" }] },
  ],
  outputs: [
    { key: "b", id: "mm-out-b", label: "Bags of mortar mix", value: (r) => String(r.bags) },
  ],
  compute: computeMortarMix,
});

const renderConcreteMixDesign = _simpleRenderer({
  citation: "Notice: Simplified mix design. A submittal-grade mix requires the full ACI 211 procedure. Citation: ACI 211 by name only; values are interpolated public-domain points.",
  example: concreteMixDesignExample.inputs,
  fields: [
    { key: "strength_psi", label: "Target strength (psi)", kind: "number" },
    { key: "exposure", label: "Exposure class", kind: "select", options: ["interior", "freeze_thaw", "marine", "sulfate"].map((v) => ({ value: v, label: v.replace(/_/g, " ") })) },
    { key: "max_aggregate_in", label: "Max aggregate (in)", kind: "number", default: 1 },
    { key: "slump_in", label: "Slump (in)", kind: "number", default: 4 },
  ],
  outputs: [
    { key: "wc", id: "cmd-out-wc", label: "Water-to-cement", value: (r) => _fmtC(r.wc_ratio, 3) },
    { key: "w", id: "cmd-out-w", label: "Water (lb/yd^3)", value: (r) => _fmtC(r.water_lb_yd3, 0) },
    { key: "c", id: "cmd-out-c", label: "Cement (bags/yd^3)", value: (r) => _fmtC(r.cement_bags_yd3, 2) },
    { key: "ca", id: "cmd-out-ca", label: "Coarse agg (lb/yd^3)", value: (r) => _fmtC(r.coarse_lb_yd3, 0) },
    { key: "fa", id: "cmd-out-fa", label: "Fine agg (lb/yd^3)", value: (r) => _fmtC(r.fine_lb_yd3, 0) },
  ],
  compute: computeConcreteMixDesign,
});

const renderBoltTorque = _simpleRenderer({
  citation: "Citation: Short-form bolt torque T = K * D * F. Proof loads from ASTM/SAE benchmarks (cited by name only). K-factors are widely-cited engineering practice.",
  example: boltTorqueExample.inputs,
  fields: [
    { key: "grade", label: "Grade", kind: "select", options: Object.keys(BOLT_PROOF_LOADS_PSI).map((k) => ({ value: k, label: k })) },
    { key: "diameter_in", label: "Diameter (in)", kind: "number" },
    { key: "lubrication", label: "Lubrication", kind: "select", options: [{ value: "dry", label: "Dry K=0.20" }, { value: "oiled", label: "Oiled K=0.18" }, { value: "antiseize", label: "Anti-seize K=0.15" }] },
    { key: "preload_fraction", label: "Preload fraction (0-1)", kind: "number", default: 0.75 },
  ],
  outputs: [
    { key: "T", id: "bt-out-t", label: "Torque", value: (r) => _fmtC(r.torque_ft_lb, 1) + " ft-lb" },
    { key: "F", id: "bt-out-f", label: "Clamp load", value: (r) => _fmtC(r.F_lb, 0) + " lb" },
  ],
  compute: computeBoltTorque,
});

const renderBendAllowance = _simpleRenderer({
  citation: "Citation: BA = (pi/180) * angle * (R + K * t). Public sheet-metal practice.",
  example: bendAllowanceExample.inputs,
  fields: [
    { key: "thickness_in", label: "Thickness (in)", kind: "number" },
    { key: "bend_angle_deg", label: "Bend angle (deg)", kind: "number" },
    { key: "inside_radius_in", label: "Inside radius (in)", kind: "number" },
    { key: "k_factor", label: "K-factor", kind: "number", default: 0.44 },
    { key: "leg_a_in", label: "Leg A (in)", kind: "number" },
    { key: "leg_b_in", label: "Leg B (in)", kind: "number" },
  ],
  outputs: [
    { key: "ba", id: "ba-out-ba", label: "Bend allowance", value: (r) => _fmtC(r.bend_allowance_in, 4) + " in" },
    { key: "bd", id: "ba-out-bd", label: "Bend deduction", value: (r) => _fmtC(r.bend_deduction_in, 4) + " in" },
    { key: "fl", id: "ba-out-fl", label: "Flat blank length", value: (r) => _fmtC(r.flat_blank_in, 4) + " in" },
  ],
  compute: computeBendAllowance,
});

const renderSpeedsAndFeeds = _simpleRenderer({
  citation: "Citation: RPM = SFM * 3.82 / D; IPM = RPM * chipload * flutes. SFM and chipload from public engineering practice.",
  example: speedsAndFeedsExample.inputs,
  fields: [
    { key: "tool", label: "Tool", kind: "select", options: [{ value: "drill", label: "Drill" }, { value: "end_mill", label: "End mill" }, { value: "lathe", label: "Lathe" }] },
    { key: "material", label: "Material", kind: "select", options: ["steel", "stainless", "aluminum", "brass", "hardwood", "softwood", "plastic"].map((v) => ({ value: v, label: v })) },
    { key: "diameter_in", label: "Diameter (in)", kind: "number" },
    { key: "flutes", label: "Flutes", kind: "number", default: 1 },
  ],
  outputs: [
    { key: "rpm", id: "sf-out-rpm", label: "RPM", value: (r) => _fmtC(r.rpm, 0) },
    { key: "ipm", id: "sf-out-ipm", label: "IPM", value: (r) => _fmtC(r.ipm, 2) },
    { key: "sfm", id: "sf-out-sfm", label: "SFM", value: (r) => String(r.sfm) },
  ],
  compute: computeSpeedsAndFeeds,
});

const renderWeldUsage = _simpleRenderer({
  citation: "Citation: Deposition mass = cross-section * length * 0.283 lb/in^3 (steel). Process efficiency from AWS benchmarks (cited by name only): SMAW 60%, GMAW 90%, FCAW 80%, GTAW 100%.",
  example: weldUsageExample.inputs,
  fields: [
    { key: "process", label: "Process", kind: "select", options: ["SMAW", "GMAW", "FCAW", "GTAW"].map((v) => ({ value: v, label: v })) },
    { key: "weld_cross_section_in2", label: "Weld cross-section (in^2)", kind: "number" },
    { key: "weld_length_in", label: "Weld length (in)", kind: "number" },
    { key: "deposition_rate_lb_per_min", label: "Deposition rate (lb/min)", kind: "number", default: 4 },
  ],
  outputs: [
    { key: "d", id: "wu-out-d", label: "Deposit (lb)", value: (r) => _fmtC(r.deposit_lb, 2) },
    { key: "c", id: "wu-out-c", label: "Consumable (lb)", value: (r) => _fmtC(r.consumable_lb, 2) },
    { key: "m", id: "wu-out-m", label: "Time (min)", value: (r) => _fmtC(r.minutes, 1) },
    { key: "g", id: "wu-out-g", label: "Shielding gas (ft^3)", value: (r) => _fmtC(r.gas_ft3, 1) },
  ],
  compute: computeWeldUsage,
});

const renderDemoDebris = _simpleRenderer({
  citation: "Citation: Public engineering benchmarks (wood frame 50 pcf, mixed 100, masonry 130, concrete 150). Dumpster sizes 10/20/30/40 yd^3.",
  example: demoDebrisExample.inputs,
  fields: [
    { key: "structure_type", label: "Structure type", kind: "select", options: Object.keys(DEMO_DEBRIS_PCF).map((k) => ({ value: k, label: k.replace(/_/g, " ") })) },
    { key: "volume_yd3", label: "Volume (yd^3)", kind: "number" },
  ],
  outputs: [
    { key: "t", id: "dd-out-t", label: "Tons", value: (r) => _fmtC(r.tons, 1) },
    { key: "d", id: "dd-out-d", label: "Recommended dumpster (yd^3)", value: (r) => String(r.dumpster_yd3) },
  ],
  compute: computeDemoDebris,
});

const renderFormworkPressure = _simpleRenderer({
  citation: "Notice: Verify formwork shoring with the design engineer. Pour-rate spikes can exceed this. Citation: ACI 347 short form P = C_w * (150 + 9000R/T) capped at wet head.",
  example: formworkPressureExample.inputs,
  fields: [
    { key: "pour_rate_ft_per_hr", label: "Pour rate (ft/hr)", kind: "number" },
    { key: "concrete_temp_F", label: "Concrete temperature (F)", kind: "number" },
    { key: "weight_factor", label: "Weight factor", kind: "select", options: Object.keys(ACI_C_W).map((k) => ({ value: k, label: k.replace(/_/g, " ") })) },
    { key: "unit_weight_pcf", label: "Unit weight (pcf)", kind: "number", default: 150 },
    { key: "wall_height_ft", label: "Wall height (ft)", kind: "number" },
  ],
  outputs: [
    { key: "p", id: "fp-out-p", label: "Pressure", value: (r) => _fmtC(r.pressure_psf, 0) + " psf" },
    { key: "a", id: "fp-out-a", label: "ACI value", value: (r) => _fmtC(r.aci_pressure_psf, 0) + " psf" },
    { key: "w", id: "fp-out-w", label: "Wet-head cap", value: (r) => _fmtC(r.wet_head_psf, 0) + " psf" },
    { key: "c", id: "fp-out-c", label: "Cap applied", value: (r) => r.cap_applied ? "yes" : "no" },
  ],
  compute: computeFormworkPressure,
});

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
  // v3
  "drywall": renderDrywall,
  "roofing-squares": renderRoofingSquares,
  "asphalt-tonnage": renderAsphaltTonnage,
  "aggregate": renderAggregate,
  "mortar-mix": renderMortarMix,
  "concrete-mix-design": renderConcreteMixDesign,
  "bolt-torque": renderBoltTorque,
  "bend-allowance": renderBendAllowance,
  "speeds-feeds": renderSpeedsAndFeeds,
  "weld-usage": renderWeldUsage,
  "demo-debris": renderDemoDebris,
  "formwork-pressure": renderFormworkPressure,
};

// =====================================================================
// v7 Group E extensions (utilities 246 through 251)
// =====================================================================

import {
  DEBOUNCE_MS as _V7C_DEB, debounce as _v7c_debounce, fmt as _v7c_fmt,
  makeNumber as _v7c_makeNumber, makeSelect as _v7c_makeSelect,
  attachExampleButton as _v7c_attachEx, makeOutputLine as _v7c_makeOut,
} from "./ui-fields.js";

// --- 246: Stair Stringer Layout (code-check pass/fail) ---

// dims: in { args: dimensionless } out: { stringer_in: L, board_feet: L^3 }
export function computeStairStringerV7({
  total_rise_in = 0, target_rise_in = 7.0, target_tread_in = 11.0,
  nosing_in = 1, stringer_thickness_in = 11.25,
  code_max_rise_in = 7.75, code_min_tread_in = 10,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(total_rise_in > 0)) return { error: "Total rise must be positive." };
  if (!(target_rise_in > 0)) return { error: "Target rise must be positive." };
  if (!(target_tread_in > 0)) return { error: "Target tread must be positive." };
  if (!(stringer_thickness_in > 0)) return { error: "Stringer thickness must be positive." };
  const riser_count = Math.ceil(total_rise_in / target_rise_in);
  const exact_rise_in = total_rise_in / riser_count;
  const tread_count = Math.max(1, riser_count - 1);
  const total_run_in = tread_count * target_tread_in;
  const stringer_length_in = Math.sqrt(total_rise_in * total_rise_in + total_run_in * total_run_in);
  const theta = Math.atan2(total_rise_in, total_run_in);
  const throat_in = stringer_thickness_in * Math.cos(theta) - exact_rise_in * Math.sin(theta);
  const rise_pass = exact_rise_in <= code_max_rise_in;
  const tread_pass = target_tread_in + Math.max(0, nosing_in) >= code_min_tread_in;
  return {
    riser_count, exact_rise_in,
    tread_depth_in: target_tread_in, tread_count,
    total_run_in, stringer_length_in,
    angle_deg: theta * 180 / Math.PI,
    throat_in, rise_pass, tread_pass,
  };
}

export const stairStringerExampleV7 = {
  inputs: { total_rise_in: 109, target_rise_in: 7.0, target_tread_in: 11.0, nosing_in: 1, stringer_thickness_in: 11.25, code_max_rise_in: 7.75, code_min_tread_in: 10 },
};

// --- 247: Hip, Valley, and Jack Rafter Schedule ---

// dims: in { args: dimensionless } out: { hip_length_ft: L, valley_length_ft: L }
export function computeHipValleyRafter({
  run_ft = 0, pitch = 6, pitch_irregular = 0,
  overhang_in = 12, jack_oc_in = 16,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(run_ft > 0) || !Number.isFinite(run_ft)) return { error: "Building run must be a finite positive length." };
  if (!(pitch >= 0)) return { error: "Pitch must be non-negative." };
  const m_common = Math.sqrt(pitch * pitch + 144) / 12;
  const m_hip = Math.sqrt(pitch * pitch + 288) / 12;
  const common_length_ft = run_ft * m_common;
  const hip_length_ft = run_ft * m_hip;
  const overhang_factor = m_common * (Number(overhang_in) || 0) / 12;
  const total_common_with_overhang_ft = common_length_ft + overhang_factor;
  const dx_oc_ft = (Number(jack_oc_in) || 16) / 12;
  // A non-positive jack spacing would make `n * dx_oc_ft < run_ft` loop
  // forever and exhaust memory (v18 C-6/D-6).
  if (!(dx_oc_ft > 0)) return { error: "Jack spacing must be positive." };
  const jacks = [];
  let n = 1;
  while (n * dx_oc_ft < run_ft) {
    const length_ft = (run_ft - n * dx_oc_ft) * m_common;
    jacks.push({ index: n, distance_from_corner_ft: n * dx_oc_ft, length_ft });
    n += 1;
  }
  const irregular = pitch_irregular > 0 ? {
    pitch_2: pitch_irregular,
    common_2_run_multiplier: Math.sqrt(pitch_irregular * pitch_irregular + 144) / 12,
    common_2_length_ft: run_ft * Math.sqrt(pitch_irregular * pitch_irregular + 144) / 12,
  } : null;
  return {
    common_run_multiplier: m_common,
    hip_run_multiplier: m_hip,
    common_length_ft,
    common_with_overhang_ft: total_common_with_overhang_ft,
    hip_length_ft,
    jacks, irregular,
    pitch_diagonal_factor_for_12: 16.97,
  };
}

export const hipValleyRafterExample = {
  inputs: { run_ft: 14, pitch: 6, pitch_irregular: 0, overhang_in: 12, jack_oc_in: 16 },
};

// --- 248: Rebar Bend and Weight Schedule ---

export const REBAR_UNIT_WEIGHTS = {
  "#3": 0.376, "#4": 0.668, "#5": 1.043, "#6": 1.502, "#7": 2.044,
  "#8": 2.670, "#9": 3.400, "#10": 4.303, "#11": 5.313,
};

export const REBAR_BAR_DIAMETERS_IN = {
  "#3": 0.375, "#4": 0.500, "#5": 0.625, "#6": 0.750, "#7": 0.875,
  "#8": 1.000, "#9": 1.128, "#10": 1.270, "#11": 1.410,
};

const REBAR_BEND_ALLOWANCE_DIAMETERS = {
  bend_90: 6, bend_135: 6, bend_180: 4, stirrup: 14, hook: 6,
};

// dims: in { rows: dimensionless } out: { total_weight_lb: M, total_length_ft: L }
export function computeRebarSchedule({ rows = [] } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return { error: "Provide at least one bar row." };
  const summary = {};
  const detailed = [];
  for (const r of rows) {
    const size = r.size;
    const w_per_ft = REBAR_UNIT_WEIGHTS[size];
    const d_in = REBAR_BAR_DIAMETERS_IN[size];
    if (w_per_ft === undefined || d_in === undefined) return { error: "Unknown bar size " + size };
    const straight_ft = Math.max(0, Number(r.straight_ft) || 0);
    const pieces = Math.max(0, Number(r.pieces) || 1);
    let bend_allowance_in = 0;
    if (Array.isArray(r.bends)) {
      for (const b of r.bends) {
        if (!(b in REBAR_BEND_ALLOWANCE_DIAMETERS)) return { error: "Unknown bend type " + b };
        bend_allowance_in += REBAR_BEND_ALLOWANCE_DIAMETERS[b] * d_in;
      }
    }
    const cut_length_ft = straight_ft + bend_allowance_in / 12;
    const row_weight_lb = cut_length_ft * w_per_ft * pieces;
    detailed.push({ size, straight_ft, bend_allowance_in, cut_length_ft, pieces, row_weight_lb });
    summary[size] = (summary[size] || 0) + row_weight_lb;
  }
  const total_weight_lb = Object.values(summary).reduce((a, b) => a + b, 0);
  return { detailed, by_size_lb: summary, total_weight_lb };
}

export const rebarScheduleExample = {
  inputs: { rows: [
    { size: "#5", straight_ft: 20, bends: ["bend_90", "bend_90"], pieces: 12 },
    { size: "#4", straight_ft: 16, bends: ["stirrup"], pieces: 30 },
    { size: "#6", straight_ft: 30, bends: [], pieces: 8 },
  ] },
};

// --- 249: Plywood and OSB Sheathing Span Rating ---

export const APA_SPAN_RATINGS = {
  "24/0":  { roof: { spacing_in: 24, live_psf: 30, total_psf: 40 }, floor: null },
  "24/16": { roof: { spacing_in: 24, live_psf: 40, total_psf: 50 }, floor: { spacing_in: 16, total_psf: 100 } },
  "32/16": { roof: { spacing_in: 32, live_psf: 30, total_psf: 40 }, floor: { spacing_in: 16, total_psf: 100 } },
  "40/20": { roof: { spacing_in: 40, live_psf: 30, total_psf: 40 }, floor: { spacing_in: 20, total_psf: 100 } },
  "48/24": { roof: { spacing_in: 48, live_psf: 25, total_psf: 35 }, floor: { spacing_in: 24, total_psf: 100 } },
};

// dims: in { args: dimensionless } out: { max_span_in: L, deflection_in: L }
export function computePlywoodSpan({
  span_rating = "24/16", panel_thickness_in = 0,
  application = "roof", support_spacing_in = 0,
  live_load_psf = 0, dead_load_psf = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const rating = APA_SPAN_RATINGS[span_rating];
  if (!rating) return { error: "Unknown span rating." };
  const branch = rating[application];
  if (!branch) return { error: "This rating does not apply to '" + application + "'." };
  if (!(support_spacing_in > 0)) return { error: "Support spacing must be positive." };
  const spacing_pass = support_spacing_in <= branch.spacing_in;
  let live_pass = true;
  if (branch.live_psf !== undefined) live_pass = live_load_psf <= branch.live_psf;
  const total_pass = (live_load_psf + dead_load_psf) <= branch.total_psf;
  return {
    span_rating, application,
    allowable_spacing_in: branch.spacing_in,
    allowable_live_psf: branch.live_psf || null,
    allowable_total_psf: branch.total_psf,
    panel_thickness_in,
    spacing_pass, live_pass, total_pass,
    pass: spacing_pass && live_pass && total_pass,
  };
}

export const plywoodSpanExample = {
  inputs: { span_rating: "24/16", panel_thickness_in: 0.5, application: "roof", support_spacing_in: 24, live_load_psf: 30, dead_load_psf: 8 },
};

// --- 250: Helical Pile Torque-to-Capacity ---

export const HELICAL_PILE_KT = {
  "1.5_inch_solid":  { Kt: 10, description: "1.5 inch solid square shaft (manufacturer typical)" },
  "1.75_inch_solid": { Kt: 9,  description: "1.75 inch solid square shaft" },
  "2.875_inch_pipe": { Kt: 7,  description: "2.875 inch round pipe shaft" },
  "3.5_inch_pipe":   { Kt: 5,  description: "3.5 inch round pipe shaft" },
};

// dims: in { shaft: dimensionless, torque_ft_lb: M L^2 T^-2, factor_of_safety: dimensionless } out: { capacity_lb: M L T^-2 }
export function computeHelicalPile({ shaft = "1.5_inch_solid", torque_ft_lb = 0, factor_of_safety = 2.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const e = HELICAL_PILE_KT[shaft];
  if (!e) return { error: "Unknown shaft type." };
  if (!(torque_ft_lb > 0)) return { error: "Installation torque must be positive." };
  if (!(factor_of_safety >= 1)) return { error: "Factor of safety must be ≥ 1." };
  const ultimate_lb = e.Kt * torque_ft_lb;
  const allowable_lb = ultimate_lb / factor_of_safety;
  return { Kt: e.Kt, description: e.description, ultimate_lb, allowable_lb };
}

export const helicalPileExample = {
  inputs: { shaft: "1.5_inch_solid", torque_ft_lb: 4500, factor_of_safety: 2.0 },
};

// --- 251: Crane Lift Plan Quick-Math ---

// dims: in { args: dimensionless } out: { radius_ft: L, capacity_lb: M L T^-2, utilization: dimensionless }
export function computeCraneLiftCheck({
  load_lb = 0, rigging_lb = 0, block_lb = 0, jib_deduct_lb = 0,
  sling_legs = 1, sling_angle_deg = 90, chart_capacity_lb = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(load_lb > 0)) return { error: "Load must be positive." };
  if (!(sling_legs >= 1)) return { error: "Sling legs ≥ 1." };
  if (!(sling_angle_deg > 0 && sling_angle_deg <= 90)) return { error: "Sling angle in (0, 90] degrees." };
  const gross_load_lb = (Number(load_lb) || 0) + (Number(rigging_lb) || 0) + (Number(block_lb) || 0) + (Number(jib_deduct_lb) || 0);
  const theta = sling_angle_deg * Math.PI / 180;
  const per_leg_lb = (Number(load_lb) || 0) / (sling_legs * Math.sin(theta / 2));
  if (!(chart_capacity_lb > 0)) {
    return {
      gross_load_lb, per_leg_lb, input_complete: false,
      message: "Enter the chart capacity for the supplied boom length, angle, and radius. The crane manufacturer's load chart governs.",
    };
  }
  const percent_of_chart = (gross_load_lb / chart_capacity_lb) * 100;
  let flag;
  if (percent_of_chart >= 90) flag = "RED";
  else if (percent_of_chart >= 75) flag = "YELLOW";
  else flag = "GREEN";
  return { gross_load_lb, per_leg_lb, chart_capacity_lb, percent_of_chart, flag, input_complete: true };
}

export const craneLiftCheckExample = {
  inputs: { load_lb: 8000, rigging_lb: 600, block_lb: 250, jib_deduct_lb: 0, sling_legs: 4, sling_angle_deg: 60, chart_capacity_lb: 12000 },
};

// --- v7 renderers (all use _simple* helpers) ---

function _v7c_renderStairStringer(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles geometry. Code-check pass/fail uses the user-entered local-code rise max and tread min; the tool does not bundle code values. AHJ governs.";
  _v7c_attachEx(inputRegion, () => fillExample(stairStringerExampleV7.inputs));
  const tr = _v7c_makeNumber("Total rise (in)", "ss-tr", { step: "any", min: "0" });
  const r = _v7c_makeNumber("Target rise (in)", "ss-r", { step: "any", min: "0" });
  r.input.value = "7.0";
  const t = _v7c_makeNumber("Target tread (in)", "ss-t", { step: "any", min: "0" });
  t.input.value = "11.0";
  const n = _v7c_makeNumber("Nosing (in)", "ss-n", { step: "any", min: "0" });
  n.input.value = "1";
  const sk = _v7c_makeNumber("Stringer thickness (in)", "ss-sk", { step: "any", min: "0" });
  sk.input.value = "11.25";
  const cr = _v7c_makeNumber("Code max rise (in, your AHJ)", "ss-cr", { step: "any", min: "0" });
  cr.input.value = "7.75";
  const ct = _v7c_makeNumber("Code min tread (in, your AHJ)", "ss-ct", { step: "any", min: "0" });
  ct.input.value = "10";
  for (const f of [tr, r, t, n, sk, cr, ct]) inputRegion.appendChild(f.wrap);
  const oC = _v7c_makeOut(outputRegion, "Riser count", "ss-out-c");
  const oR = _v7c_makeOut(outputRegion, "Exact rise", "ss-out-r");
  const oT = _v7c_makeOut(outputRegion, "Tread depth", "ss-out-t");
  const oRun = _v7c_makeOut(outputRegion, "Total run", "ss-out-run");
  const oSL = _v7c_makeOut(outputRegion, "Stringer length", "ss-out-sl");
  const oTh = _v7c_makeOut(outputRegion, "Throat depth", "ss-out-th");
  const oP = _v7c_makeOut(outputRegion, "Code pass/fail", "ss-out-p");
  function fillExample(x) { tr.input.value = x.total_rise_in; r.input.value = x.target_rise_in; t.input.value = x.target_tread_in; n.input.value = x.nosing_in; sk.input.value = x.stringer_thickness_in; cr.input.value = x.code_max_rise_in; ct.input.value = x.code_min_tread_in; update(); }
  const update = _v7c_debounce(() => {
    const x = computeStairStringerV7({
      total_rise_in: Number(tr.input.value) || 0, target_rise_in: Number(r.input.value) || 0,
      target_tread_in: Number(t.input.value) || 0, nosing_in: Number(n.input.value) || 0,
      stringer_thickness_in: Number(sk.input.value) || 0,
      code_max_rise_in: Number(cr.input.value) || 0, code_min_tread_in: Number(ct.input.value) || 0,
    });
    if (x.error) { oC.textContent = x.error; for (const o of [oR, oT, oRun, oSL, oTh, oP]) o.textContent = "-"; return; }
    oC.textContent = x.riser_count;
    oR.textContent = _v7c_fmt(x.exact_rise_in, 3) + " in";
    oT.textContent = _v7c_fmt(x.tread_depth_in, 2) + " in";
    oRun.textContent = _v7c_fmt(x.total_run_in, 1) + " in (" + _v7c_fmt(x.total_run_in / 12, 2) + " ft)";
    oSL.textContent = _v7c_fmt(x.stringer_length_in, 1) + " in (" + _v7c_fmt(x.angle_deg, 1) + "° slope)";
    oTh.textContent = _v7c_fmt(x.throat_in, 2) + " in";
    oP.textContent = (x.rise_pass ? "Rise PASS" : "Rise FAIL") + " / " + (x.tread_pass ? "Tread PASS" : "Tread FAIL");
  }, _V7C_DEB);
  for (const f of [tr.input, r.input, t.input, n.input, sk.input, cr.input, ct.input]) f.addEventListener("input", update);
}

function _v7c_renderHipValleyRafter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Carpentry framing-square method by name. Common-rafter run multiplier sqrt(P² + 144)/12; hip / valley multiplier sqrt(P² + 288)/12 (diagonal-of-12-by-12 = 16.97).";
  _v7c_attachEx(inputRegion, () => fillExample(hipValleyRafterExample.inputs));
  const run = _v7c_makeNumber("Building run (ft, half-width)", "hv-run", { step: "any", min: "0" });
  const p = _v7c_makeNumber("Pitch (rise per 12 in)", "hv-p", { step: "any", min: "0" });
  const p2 = _v7c_makeNumber("Irregular-hip second pitch (optional)", "hv-p2", { step: "any", min: "0" });
  const oh = _v7c_makeNumber("Overhang (in)", "hv-oh", { step: "any", min: "0" });
  oh.input.value = "12";
  const oc = _v7c_makeNumber("Jack OC (in)", "hv-oc", { step: "any", min: "0" });
  oc.input.value = "16";
  for (const f of [run, p, p2, oh, oc]) inputRegion.appendChild(f.wrap);
  const oM = _v7c_makeOut(outputRegion, "Common multiplier", "hv-out-m");
  const oH = _v7c_makeOut(outputRegion, "Hip multiplier", "hv-out-h");
  const oCL = _v7c_makeOut(outputRegion, "Common length", "hv-out-cl");
  const oCO = _v7c_makeOut(outputRegion, "With overhang", "hv-out-co");
  const oHL = _v7c_makeOut(outputRegion, "Hip rafter length", "hv-out-hl");
  const oN = _v7c_makeOut(outputRegion, "Jack count", "hv-out-n");
  const oI = _v7c_makeOut(outputRegion, "Irregular-side common", "hv-out-i");
  function fillExample(x) { run.input.value = x.run_ft; p.input.value = x.pitch; p2.input.value = x.pitch_irregular; oh.input.value = x.overhang_in; oc.input.value = x.jack_oc_in; update(); }
  const update = _v7c_debounce(() => {
    const r = computeHipValleyRafter({
      run_ft: Number(run.input.value) || 0, pitch: Number(p.input.value) || 0,
      pitch_irregular: Number(p2.input.value) || 0, overhang_in: Number(oh.input.value) || 0, jack_oc_in: Number(oc.input.value) || 16,
    });
    if (r.error) { oM.textContent = r.error; for (const o of [oH, oCL, oCO, oHL, oN, oI]) o.textContent = "-"; return; }
    oM.textContent = _v7c_fmt(r.common_run_multiplier, 4);
    oH.textContent = _v7c_fmt(r.hip_run_multiplier, 4) + " (16.97/12 at 0 pitch)";
    oCL.textContent = _v7c_fmt(r.common_length_ft, 2) + " ft";
    oCO.textContent = _v7c_fmt(r.common_with_overhang_ft, 2) + " ft";
    oHL.textContent = _v7c_fmt(r.hip_length_ft, 2) + " ft";
    oN.textContent = r.jacks.length + " jacks (per side)";
    oI.textContent = r.irregular ? _v7c_fmt(r.irregular.common_2_length_ft, 2) + " ft (pitch " + r.irregular.pitch_2 + "/12)" : "n/a (regular hip)";
  }, _V7C_DEB);
  for (const f of [run.input, p.input, p2.input, oh.input, oc.input]) f.addEventListener("input", update);
}

function _v7c_renderRebarSchedule(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Unit weights from data/construction/rebar-unit-weights.json (ACI/CRSI by name only). Bend allowance 90°/135° = 6 db, 180° = 4 db, stirrup = 14 db, hook = 6 db. Engineer of record governs the schedule.";
  _v7c_attachEx(inputRegion, () => fillExample(rebarScheduleExample.inputs));
  const size = _v7c_makeSelect("Bar size", "rs-size", Object.keys(REBAR_UNIT_WEIGHTS).map((k) => ({ value: k, label: k + " (" + REBAR_UNIT_WEIGHTS[k] + " lb/ft)" })));
  const sl = _v7c_makeNumber("Straight length (ft)", "rs-sl", { step: "any", min: "0" });
  const bend = _v7c_makeSelect("Bend type", "rs-b", [
    { value: "", label: "(none)" },
    { value: "bend_90", label: "90° bend (6 db)" },
    { value: "bend_135", label: "135° bend (6 db)" },
    { value: "bend_180", label: "180° bend (4 db)" },
    { value: "stirrup", label: "Stirrup (14 db total)" },
    { value: "hook", label: "Hook (6 db)" },
  ]);
  const pcs = _v7c_makeNumber("Pieces", "rs-p", { step: "1", min: "1" });
  pcs.input.value = "1";
  for (const f of [size, sl, bend, pcs]) inputRegion.appendChild(f.wrap);
  const oCl = _v7c_makeOut(outputRegion, "Cut length per bar", "rs-out-cl");
  const oW = _v7c_makeOut(outputRegion, "Row weight", "rs-out-w");
  const oTotal = _v7c_makeOut(outputRegion, "Total weight (this row)", "rs-out-t");
  function fillExample(x) {
    const r0 = (x.rows || [])[0]; if (!r0) return;
    size.select.value = r0.size; sl.input.value = r0.straight_ft;
    bend.select.value = (r0.bends && r0.bends[0]) || ""; pcs.input.value = r0.pieces;
    update();
  }
  const update = _v7c_debounce(() => {
    const bends = bend.select.value ? [bend.select.value] : [];
    const r = computeRebarSchedule({ rows: [{ size: size.select.value, straight_ft: Number(sl.input.value) || 0, bends, pieces: Number(pcs.input.value) || 1 }] });
    if (r.error) { oCl.textContent = r.error; oW.textContent = "-"; oTotal.textContent = "-"; return; }
    const d = r.detailed[0];
    oCl.textContent = _v7c_fmt(d.cut_length_ft, 3) + " ft (+" + _v7c_fmt(d.bend_allowance_in, 2) + " in for bends)";
    oW.textContent = _v7c_fmt(d.row_weight_lb, 1) + " lb";
    oTotal.textContent = _v7c_fmt(r.total_weight_lb, 1) + " lb";
  }, _V7C_DEB);
  for (const f of [size.select, sl.input, bend.select, pcs.input]) f.addEventListener("input", update);
}

function _v7c_renderPlywoodSpan(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: APA span-rating tables (data/construction/apa-span-ratings.json) cited by APA name only. AHJ governs.";
  _v7c_attachEx(inputRegion, () => fillExample(plywoodSpanExample.inputs));
  const sr = _v7c_makeSelect("Span rating", "py-sr", Object.keys(APA_SPAN_RATINGS).map((k) => ({ value: k, label: k })));
  const t = _v7c_makeNumber("Panel thickness (in)", "py-t", { step: "any", min: "0" });
  const app = _v7c_makeSelect("Application", "py-app", [{ value: "roof", label: "Roof" }, { value: "floor", label: "Subfloor" }]);
  const sp = _v7c_makeNumber("Support spacing (in)", "py-sp", { step: "any", min: "0" });
  const ll = _v7c_makeNumber("Live load (psf)", "py-ll", { step: "any", min: "0" });
  const dl = _v7c_makeNumber("Dead load (psf)", "py-dl", { step: "any", min: "0" });
  for (const f of [sr, t, app, sp, ll, dl]) inputRegion.appendChild(f.wrap);
  const oS = _v7c_makeOut(outputRegion, "Allowable spacing", "py-out-s");
  const oL = _v7c_makeOut(outputRegion, "Allowable live", "py-out-l");
  const oTL = _v7c_makeOut(outputRegion, "Allowable total", "py-out-tl");
  const oP = _v7c_makeOut(outputRegion, "Pass/fail", "py-out-p");
  function fillExample(x) { sr.select.value = x.span_rating; t.input.value = x.panel_thickness_in; app.select.value = x.application; sp.input.value = x.support_spacing_in; ll.input.value = x.live_load_psf; dl.input.value = x.dead_load_psf; update(); }
  const update = _v7c_debounce(() => {
    const r = computePlywoodSpan({
      span_rating: sr.select.value, panel_thickness_in: Number(t.input.value) || 0,
      application: app.select.value, support_spacing_in: Number(sp.input.value) || 0,
      live_load_psf: Number(ll.input.value) || 0, dead_load_psf: Number(dl.input.value) || 0,
    });
    if (r.error) { oS.textContent = r.error; oL.textContent = "-"; oTL.textContent = "-"; oP.textContent = "-"; return; }
    oS.textContent = r.allowable_spacing_in + " in OC";
    oL.textContent = r.allowable_live_psf === null ? "(table doesn't list live)" : r.allowable_live_psf + " psf";
    oTL.textContent = r.allowable_total_psf + " psf";
    oP.textContent = r.pass ? "PASS" : "FAIL (spacing " + (r.spacing_pass ? "OK" : "X") + " / live " + (r.live_pass ? "OK" : "X") + " / total " + (r.total_pass ? "OK" : "X") + ")";
  }, _V7C_DEB);
  for (const f of [sr.select, t.input, app.select, sp.input, ll.input, dl.input]) f.addEventListener("input", update);
}

function _v7c_renderHelicalPile(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Torque correlation by name. Kt benchmarks from data/construction/helical-pile-kt.json (manufacturer-attributed). Engineer of record governs the design capacity and acceptance.";
  _v7c_attachEx(inputRegion, () => fillExample(helicalPileExample.inputs));
  const sh = _v7c_makeSelect("Shaft type", "hp-sh", Object.keys(HELICAL_PILE_KT).map((k) => ({ value: k, label: HELICAL_PILE_KT[k].description + " (Kt=" + HELICAL_PILE_KT[k].Kt + ")" })));
  const tq = _v7c_makeNumber("Installation torque (ft·lb)", "hp-tq", { step: "any", min: "0" });
  const fs = _v7c_makeNumber("Factor of safety", "hp-fs", { step: "any", min: "1" });
  fs.input.value = "2.0";
  for (const f of [sh, tq, fs]) inputRegion.appendChild(f.wrap);
  const oU = _v7c_makeOut(outputRegion, "Ultimate axial capacity", "hp-out-u");
  const oA = _v7c_makeOut(outputRegion, "Allowable capacity", "hp-out-a");
  function fillExample(x) { sh.select.value = x.shaft; tq.input.value = x.torque_ft_lb; fs.input.value = x.factor_of_safety; update(); }
  const update = _v7c_debounce(() => {
    const r = computeHelicalPile({ shaft: sh.select.value, torque_ft_lb: Number(tq.input.value) || 0, factor_of_safety: Number(fs.input.value) || 2.0 });
    if (r.error) { oU.textContent = r.error; oA.textContent = "-"; return; }
    oU.textContent = _v7c_fmt(r.ultimate_lb, 0) + " lb (Kt=" + r.Kt + ")";
    oA.textContent = _v7c_fmt(r.allowable_lb, 0) + " lb";
  }, _V7C_DEB);
  for (const f of [sh.select, tq.input, fs.input]) f.addEventListener("input", update);
}

function _v7c_renderCraneLiftCheck(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASME B30.5 by section. The crane manufacturer's load chart governs. The qualified lift director governs. Math aid only. Do not attempt a lift over 75% of chart capacity without a written critical-lift plan.";
  _v7c_attachEx(inputRegion, () => fillExample(craneLiftCheckExample.inputs));
  const ld = _v7c_makeNumber("Load (lb)", "cl-ld", { step: "any", min: "0" });
  const rg = _v7c_makeNumber("Rigging (lb)", "cl-rg", { step: "any", min: "0" });
  const bk = _v7c_makeNumber("Block (lb)", "cl-bk", { step: "any", min: "0" });
  const jb = _v7c_makeNumber("Jib deduct (lb)", "cl-jb", { step: "any", min: "0" });
  const sl = _v7c_makeNumber("Sling legs (n)", "cl-sl", { step: "1", min: "1" });
  sl.input.value = "1";
  const ang = _v7c_makeNumber("Sling angle (deg)", "cl-ang", { step: "any", min: "0", max: "90" });
  ang.input.value = "90";
  const cap = _v7c_makeNumber("Chart capacity for this configuration (lb)", "cl-cap", { step: "any", min: "0" });
  for (const f of [ld, rg, bk, jb, sl, ang, cap]) inputRegion.appendChild(f.wrap);
  const oG = _v7c_makeOut(outputRegion, "Gross load", "cl-out-g");
  const oS = _v7c_makeOut(outputRegion, "Per-leg sling tension", "cl-out-s");
  const oP = _v7c_makeOut(outputRegion, "Percent of chart", "cl-out-p");
  const oF = _v7c_makeOut(outputRegion, "Flag", "cl-out-f");
  function fillExample(x) { ld.input.value = x.load_lb; rg.input.value = x.rigging_lb; bk.input.value = x.block_lb; jb.input.value = x.jib_deduct_lb; sl.input.value = x.sling_legs; ang.input.value = x.sling_angle_deg; cap.input.value = x.chart_capacity_lb; update(); }
  const update = _v7c_debounce(() => {
    const r = computeCraneLiftCheck({
      load_lb: Number(ld.input.value) || 0, rigging_lb: Number(rg.input.value) || 0,
      block_lb: Number(bk.input.value) || 0, jib_deduct_lb: Number(jb.input.value) || 0,
      sling_legs: Number(sl.input.value) || 1, sling_angle_deg: Number(ang.input.value) || 90,
      chart_capacity_lb: Number(cap.input.value) || 0,
    });
    if (r.error) { oG.textContent = r.error; oS.textContent = "-"; oP.textContent = "-"; oF.textContent = "-"; return; }
    oG.textContent = _v7c_fmt(r.gross_load_lb, 0) + " lb";
    oS.textContent = _v7c_fmt(r.per_leg_lb, 0) + " lb";
    if (!r.input_complete) {
      oP.textContent = "(input incomplete)";
      oF.textContent = r.message;
      return;
    }
    oP.textContent = _v7c_fmt(r.percent_of_chart, 1) + " %";
    oF.textContent = r.flag;
  }, _V7C_DEB);
  for (const f of [ld.input, rg.input, bk.input, jb.input, sl.input, ang.input, cap.input]) f.addEventListener("input", update);
}

CONSTRUCTION_RENDERERS["stair-stringer-layout"] = _v7c_renderStairStringer;
CONSTRUCTION_RENDERERS["hip-valley-rafter"] = _v7c_renderHipValleyRafter;
CONSTRUCTION_RENDERERS["rebar-schedule"] = _v7c_renderRebarSchedule;
CONSTRUCTION_RENDERERS["plywood-span"] = _v7c_renderPlywoodSpan;
CONSTRUCTION_RENDERERS["helical-pile"] = _v7c_renderHelicalPile;
CONSTRUCTION_RENDERERS["crane-lift-quick"] = _v7c_renderCraneLiftCheck;

// =====================================================================
// v8 Phase E.4 (utility 256): Residential Framing Package
// =====================================================================

// Total stud + plate + joist + rafter rollup from a single set of
// dimensional inputs. Stud spacing 16 or 24 in OC; plate count = 2 (top
// + sole). 2x lumber section is 1.5 in × 3.5 in (S4S 2x4) or 1.5 × 5.5
// (2x6); board feet uses nominal × actual length.

// dims: in { args: dimensionless } out: { studs: dimensionless, plates_lf: L, sheathing_sheets: dimensionless }
export function computeResidentialFraming({
  footprint_ft2 = 0, perimeter_ft = 0, wall_height_ft = 8,
  stud_oc_in = 16,
  joist_span_ft = 14, joist_oc_in = 16,
  rafter_span_ft = 14, rafter_oc_in = 24,
  building_run_ft = 14, pitch = 6,
  stud_size = "2x4", joist_size = "2x10", rafter_size = "2x8",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(footprint_ft2 > 0)) return { error: "Footprint must be positive." };
  if (!(perimeter_ft > 0)) return { error: "Perimeter must be positive." };
  if (!(wall_height_ft > 0)) return { error: "Wall height must be positive." };
  if (!(stud_oc_in > 0)) return { error: "Stud OC must be positive." };
  if (!(joist_span_ft > 0 && joist_oc_in > 0)) return { error: "Joist span and OC must be positive." };
  if (!(rafter_span_ft > 0 && rafter_oc_in > 0)) return { error: "Rafter span and OC must be positive." };
  if (!(building_run_ft > 0)) return { error: "Building run must be positive." };
  // Stud count: every wall stud plus per-corner / per-T extras (engineering practice ~ 1 stud per linear ft for 16 OC).
  const stud_oc_ft = stud_oc_in / 12;
  const stud_count = Math.ceil(perimeter_ft / stud_oc_ft) + 2 * 4; // approx 8 corner / T allowance for a simple rectangle
  // Plates: 1 sole + 2 top = 3 lengths × perimeter + ~ 10% waste.
  const plate_lf = Math.ceil(perimeter_ft * 3 * 1.10);
  // Joists: count = ceil(footprint span_ft / oc_ft) + 1.
  const joist_oc_ft = joist_oc_in / 12;
  // Approximate joist count: 2 × footprint area / (joist_span × joist_oc).
  const joist_count = Math.ceil(footprint_ft2 / (joist_span_ft * joist_oc_ft)) + 2;
  // Rafters per side: pairs along the building length; common rafter run multiplier from utility 247.
  const m_common = Math.sqrt(pitch * pitch + 144) / 12;
  const rafter_length_ft = building_run_ft * m_common;
  const rafter_oc_ft = rafter_oc_in / 12;
  // Rafter count assuming the building length equals the longer footprint dimension; conservative 2 rafters per OC unit.
  const approx_length_ft = footprint_ft2 / (2 * building_run_ft);
  const rafter_count = Math.ceil(approx_length_ft / rafter_oc_ft) * 2 + 2; // both sides + ridge ends
  // Board feet rollup. 2x4 = 0.667 bf/ft; 2x6 = 1.0; 2x8 = 1.333; 2x10 = 1.667; 2x12 = 2.0.
  const BF_PER_FT = { "2x4": 0.667, "2x6": 1.0, "2x8": 1.333, "2x10": 1.667, "2x12": 2.0 };
  if (!BF_PER_FT[stud_size]) return { error: "Unknown stud size." };
  if (!BF_PER_FT[joist_size]) return { error: "Unknown joist size." };
  if (!BF_PER_FT[rafter_size]) return { error: "Unknown rafter size." };
  const stud_bf = stud_count * wall_height_ft * BF_PER_FT[stud_size];
  const plate_bf = plate_lf * BF_PER_FT[stud_size];
  const joist_bf = joist_count * joist_span_ft * BF_PER_FT[joist_size];
  const rafter_bf = rafter_count * rafter_length_ft * BF_PER_FT[rafter_size];
  const total_bf = stud_bf + plate_bf + joist_bf + rafter_bf;
  return {
    stud_count, stud_bf,
    plate_lf, plate_bf,
    joist_count, joist_bf,
    rafter_count, rafter_length_ft, rafter_bf,
    total_bf,
    summary: stud_count + " " + stud_size + " studs (" + Math.ceil(stud_bf) + " bf), " +
             plate_lf + " ft of " + stud_size + " plate (" + Math.ceil(plate_bf) + " bf), " +
             joist_count + " " + joist_size + " joists (" + Math.ceil(joist_bf) + " bf), " +
             rafter_count + " " + rafter_size + " rafters (" + Math.ceil(rafter_bf) + " bf)",
  };
}

export const residentialFramingExample = {
  inputs: {
    footprint_ft2: 1500, perimeter_ft: 160, wall_height_ft: 9,
    stud_oc_in: 16, joist_span_ft: 14, joist_oc_in: 16,
    rafter_span_ft: 16, rafter_oc_in: 24, building_run_ft: 16, pitch: 6,
    stud_size: "2x4", joist_size: "2x10", rafter_size: "2x8",
  },
};

function _v8c_renderResidentialFraming(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per IRC 2021 Tables R502.5 (joist spans), R602.5 (stud schedules), R802.5.1 (rafter spans). AHJ governs. Free at codes.iccsafe.org. Board-feet conventions per WWPA standard grading rules.";
  _v7c_attachEx(inputRegion, () => fillExample(residentialFramingExample.inputs));
  const fp = _v7c_makeNumber("Footprint (ft²)", "rf-fp", { step: "any", min: "0" });
  const per = _v7c_makeNumber("Wall perimeter (ft)", "rf-per", { step: "any", min: "0" });
  const wh = _v7c_makeNumber("Wall height (ft)", "rf-wh", { step: "any", min: "0" });
  wh.input.value = "8";
  const oc = _v7c_makeNumber("Stud OC (in)", "rf-oc", { step: "any", min: "0" });
  oc.input.value = "16";
  const js = _v7c_makeNumber("Joist span (ft)", "rf-js", { step: "any", min: "0" });
  const jo = _v7c_makeNumber("Joist OC (in)", "rf-jo", { step: "any", min: "0" });
  jo.input.value = "16";
  const rs = _v7c_makeNumber("Rafter span (ft)", "rf-rs", { step: "any", min: "0" });
  const ro = _v7c_makeNumber("Rafter OC (in)", "rf-ro", { step: "any", min: "0" });
  ro.input.value = "24";
  const br = _v7c_makeNumber("Building run (ft)", "rf-br", { step: "any", min: "0" });
  const p = _v7c_makeNumber("Pitch (rise per 12)", "rf-p", { step: "any", min: "0" });
  p.input.value = "6";
  for (const f of [fp, per, wh, oc, js, jo, rs, ro, br, p]) inputRegion.appendChild(f.wrap);
  const oS = _v7c_makeOut(outputRegion, "Studs (count + bf)", "rf-out-s");
  const oPl = _v7c_makeOut(outputRegion, "Plates (linear ft + bf)", "rf-out-pl");
  const oJ = _v7c_makeOut(outputRegion, "Joists (count + bf)", "rf-out-j");
  const oR = _v7c_makeOut(outputRegion, "Rafters (count + bf)", "rf-out-r");
  const oT = _v7c_makeOut(outputRegion, "Total board feet", "rf-out-t");
  function fillExample(x) {
    fp.input.value = x.footprint_ft2; per.input.value = x.perimeter_ft;
    wh.input.value = x.wall_height_ft; oc.input.value = x.stud_oc_in;
    js.input.value = x.joist_span_ft; jo.input.value = x.joist_oc_in;
    rs.input.value = x.rafter_span_ft; ro.input.value = x.rafter_oc_in;
    br.input.value = x.building_run_ft; p.input.value = x.pitch;
    update();
  }
  const update = _v7c_debounce(() => {
    const r = computeResidentialFraming({
      footprint_ft2: Number(fp.input.value) || 0, perimeter_ft: Number(per.input.value) || 0,
      wall_height_ft: Number(wh.input.value) || 0, stud_oc_in: Number(oc.input.value) || 0,
      joist_span_ft: Number(js.input.value) || 0, joist_oc_in: Number(jo.input.value) || 0,
      rafter_span_ft: Number(rs.input.value) || 0, rafter_oc_in: Number(ro.input.value) || 0,
      building_run_ft: Number(br.input.value) || 0, pitch: Number(p.input.value) || 0,
    });
    if (r.error) { oS.textContent = r.error; for (const o of [oPl, oJ, oR, oT]) o.textContent = "-"; return; }
    oS.textContent = r.stud_count + " studs (" + _v7c_fmt(r.stud_bf, 0) + " bf)";
    oPl.textContent = r.plate_lf + " lf (" + _v7c_fmt(r.plate_bf, 0) + " bf)";
    oJ.textContent = r.joist_count + " joists (" + _v7c_fmt(r.joist_bf, 0) + " bf)";
    oR.textContent = r.rafter_count + " rafters (" + _v7c_fmt(r.rafter_bf, 0) + " bf, " + _v7c_fmt(r.rafter_length_ft, 2) + " ft each)";
    oT.textContent = _v7c_fmt(r.total_bf, 0) + " bf total";
  }, _V7C_DEB);
  for (const f of [fp.input, per.input, wh.input, oc.input, js.input, jo.input, rs.input, ro.input, br.input, p.input]) f.addEventListener("input", update);
}

CONSTRUCTION_RENDERERS["residential-framing"] = _v8c_renderResidentialFraming;

// =====================================================================
// v9 §G.2: Excavation slope and bench-step optimizer
// =====================================================================
//
// Turns the OSHA Appendix B soil-class slope ratio into an excavation
// plan with the quantities a foreman orders against: total spoil
// volume (yd^3), surface footprint (ft^2), and a bench-step layout for
// type A / B soils. Companion to the existing v3 trench-slope tile,
// which returns the slope ratio alone.
//
// OSHA 29 CFR 1926 Subpart P Appendix B slope ratios:
//   Type A: 0.75 H : 1 V (cohesive, stable)
//   Type B: 1.0 H : 1 V (cohesive, less stable)
//   Type C: 1.5 H : 1 V (granular or wet)
//
// Bench-step geometry: 4 ft per bench typical for Type A / B. Type C
// soils generally cannot be benched - the calculator reports a sloped-
// only plan in that case.
//
// Cross-section: trapezoidal with assumed 2 ft bottom width (utility-
// trench common case). Total spoil volume = cross-section area x
// length / 27.

export const OSHA_SOIL_SLOPES = {
  A: { ratio_H_to_V: 0.75, ratio_label: "0.75 H : 1 V", soil_label: "Type A (cohesive, stable)" },
  B: { ratio_H_to_V: 1.0,  ratio_label: "1 H : 1 V",     soil_label: "Type B (cohesive, less stable)" },
  C: { ratio_H_to_V: 1.5,  ratio_label: "1.5 H : 1 V",   soil_label: "Type C (granular or wet)" },
};

const BENCH_HEIGHT_FT = 4;       // typical max bench height per OSHA Subpart P
const BOTTOM_WIDTH_FT_DEFAULT = 2;
const SURCHARGE_BUMP = 0.25;     // additive H:V increase under surcharge (engineering practice)

// dims: in { args: dimensionless } out: { benches: dimensionless, total_volume_yd3: L^3 }
export function computeExcavationBenchPlan({
  depth_ft = 0,
  soil_class = "B",
  surcharge = false,
  length_ft = 0,
  bottom_width_ft = BOTTOM_WIDTH_FT_DEFAULT,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D = Number(depth_ft) || 0;
  const L = Number(length_ft) || 0;
  // If user explicitly passes a non-positive bottom width, reject it
  // instead of silently falling back to the default.
  const W_bot_input = bottom_width_ft === undefined || bottom_width_ft === null
    ? BOTTOM_WIDTH_FT_DEFAULT
    : Number(bottom_width_ft);
  const W_bot = W_bot_input;
  if (!(D > 0)) return { error: "Depth must be positive (ft)." };
  if (!(L > 0)) return { error: "Excavation length must be positive (ft)." };
  if (!Number.isFinite(W_bot) || !(W_bot > 0)) return { error: "Bottom width must be positive (ft)." };
  const s = OSHA_SOIL_SLOPES[soil_class];
  if (!s) return { error: "Soil class must be A, B, or C per OSHA Subpart P Appendix B." };
  if (D > 20) return { error: "Depth above 20 ft requires a registered professional engineer's design per 1926.652(b)(4); this calculator stops here." };

  const ratio = s.ratio_H_to_V + (surcharge ? SURCHARGE_BUMP : 0);
  // Sloped-only plan.
  const horizontal_offset_ft = D * ratio;
  const top_width_ft = W_bot + 2 * horizontal_offset_ft;
  const cross_section_ft2 = ((W_bot + top_width_ft) / 2) * D;
  const volume_yd3 = (cross_section_ft2 * L) / 27;
  const footprint_ft2 = top_width_ft * L;

  // Bench-step layout (Type A / B only).
  let bench_layout = null;
  if (soil_class === "A" || soil_class === "B") {
    const bench_count = Math.ceil(D / BENCH_HEIGHT_FT);
    const last_bench_height_ft = D - (bench_count - 1) * BENCH_HEIGHT_FT;
    const step_per_bench_ft = BENCH_HEIGHT_FT * ratio;
    bench_layout = {
      bench_count,
      bench_height_ft: BENCH_HEIGHT_FT,
      last_bench_height_ft,
      horizontal_step_ft: step_per_bench_ft,
      total_step_ft: bench_count * step_per_bench_ft,
    };
  }

  const warnings = [];
  if (D < 5) warnings.push("Depth below 5 ft does not require sloping per OSHA 1926.652(a)(1); the AHJ may waive the slope plan.");
  if (surcharge) warnings.push("Surcharge load near trench adds " + (SURCHARGE_BUMP * 100).toFixed(0) + "% to the H:V ratio per engineering practice; the competent person on-site governs the final plan.");
  if (soil_class === "C") warnings.push("Type C soil cannot typically be benched; only the sloped plan is reported. Verify with the competent person.");

  return {
    soil_class,
    soil_label: s.soil_label,
    ratio_H_to_V: ratio,
    ratio_label: s.ratio_label + (surcharge ? " (with surcharge bump)" : ""),
    top_width_ft,
    horizontal_offset_ft,
    cross_section_ft2,
    spoil_volume_yd3: volume_yd3,
    footprint_ft2,
    bench_layout,
    warnings,
  };
}

export const excavationBenchExample = {
  // 8 ft deep, Type B, 50 ft long, no surcharge.
  // ratio = 1.0; horizontal_offset = 8; top_width = 2 + 16 = 18 ft.
  // cross_section = (2 + 18) / 2 * 8 = 80 ft^2.
  // volume = 80 * 50 / 27 = 148.15 yd^3.
  // footprint = 18 * 50 = 900 ft^2.
  // bench: 2 benches of 4 ft, step = 4 ft each.
  inputs: { depth_ft: 8, soil_class: "B", surcharge: false, length_ft: 50, bottom_width_ft: 2 },
};

function _v9c_renderExcavationBenchPlan(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per OSHA 29 CFR 1926 Subpart P Appendix B (soil classification and slope) and §1926.652. Competent person on-site governs the final plan; this calculator outputs geometry only. Free at ecfr.gov.";

  const d = _v7c_makeNumber("Trench depth (ft)", "eb-d", { step: "any", min: "0" });
  const s = _v7c_makeSelect("Soil class (OSHA Appendix B)", "eb-s",
    Object.keys(OSHA_SOIL_SLOPES).map((k) => ({ value: k, label: OSHA_SOIL_SLOPES[k].soil_label + " - " + OSHA_SOIL_SLOPES[k].ratio_label, selected: k === "B" })),
  );
  const sur = _v7c_makeSelect("Surcharge load near trench", "eb-sur", [
    { value: "false", label: "No", selected: true },
    { value: "true",  label: "Yes (adds 0.25 H:V)" },
  ]);
  const L = _v7c_makeNumber("Excavation length (ft)", "eb-L", { step: "any", min: "0" });
  const bw = _v7c_makeNumber("Bottom width (ft; default 2)", "eb-bw", { step: "any", min: "0", value: "2" });
  bw.input.value = "2";
  for (const f of [d, s, sur, L, bw]) inputRegion.appendChild(f.wrap);

  _v7c_attachEx(inputRegion, () => {
    d.input.value = "8"; s.select.value = "B"; sur.select.value = "false";
    L.input.value = "50"; bw.input.value = "2"; update();
  });

  const oR = _v7c_makeOut(outputRegion, "Slope ratio (H:V)", "eb-out-r");
  const oTW = _v7c_makeOut(outputRegion, "Top width (ft)", "eb-out-tw");
  const oV = _v7c_makeOut(outputRegion, "Spoil volume (yd^3)", "eb-out-v");
  const oF = _v7c_makeOut(outputRegion, "Surface footprint (ft^2)", "eb-out-f");
  const oB = _v7c_makeOut(outputRegion, "Bench layout", "eb-out-b");
  const oW = _v7c_makeOut(outputRegion, "Notes", "eb-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = _v7c_debounce(() => {
    const r = computeExcavationBenchPlan({
      depth_ft: readNum(d.input),
      soil_class: s.select.value,
      surcharge: sur.select.value === "true",
      length_ft: readNum(L.input),
      bottom_width_ft: readNum(bw.input),
    });
    if (r.error) {
      oR.textContent = r.error; oTW.textContent = ""; oV.textContent = ""; oF.textContent = ""; oB.textContent = ""; oW.textContent = "";
      return;
    }
    oR.textContent = r.ratio_label + " (" + r.ratio_H_to_V.toFixed(2) + " : 1)";
    oTW.textContent = _v7c_fmt(r.top_width_ft, 2) + " ft (offset " + _v7c_fmt(r.horizontal_offset_ft, 2) + " ft each side)";
    oV.textContent = _v7c_fmt(r.spoil_volume_yd3, 1) + " yd^3";
    oF.textContent = _v7c_fmt(r.footprint_ft2, 0) + " ft^2";
    if (r.bench_layout) {
      const bl = r.bench_layout;
      oB.textContent = bl.bench_count + " benches @ " + bl.bench_height_ft + " ft (last " + _v7c_fmt(bl.last_bench_height_ft, 1) + " ft); step " + _v7c_fmt(bl.horizontal_step_ft, 2) + " ft per bench";
    } else {
      oB.textContent = "Sloped-only plan (Type C does not bench)";
    }
    oW.textContent = r.warnings.length > 0 ? r.warnings.join(" ") : "OSHA Subpart P geometry; competent person on-site governs the final plan.";
  }, _V7C_DEB);
  for (const f of [d.input, s.select, sur.select, L.input, bw.input]) f.addEventListener("input", update);
}

CONSTRUCTION_RENDERERS["excavation-bench-plan"] = _v9c_renderExcavationBenchPlan;

// =====================================================================
// spec-v15 Group E close: E.7 header sizing + E.8 deck post / beam
// =====================================================================
//
// Both tiles compute from first-principles simple-span beam mechanics
// (the same allowableSpanByBending / allowableSpanByDeflection engine the
// v1 lumber-spans tile uses) plus bundled AWC NDS reference design values.
// No paywalled IRC span table is reproduced; the output is cross-checked
// against the IRC table by physics, and the AHJ governs the adopted code.

import {
  DEBOUNCE_MS as _V15C_DEB, debounce as _v15c_debounce, fmt as _v15c_fmt,
  makeNumber as _v15c_makeNumber, makeSelect as _v15c_makeSelect,
  attachExampleButton as _v15c_attachEx, makeOutputLine as _v15c_makeOut,
} from "./ui-fields.js";

// AWC NDS reference compression-perpendicular-to-grain (F_c-perp) values
// for the species the lumber engine already bundles. Used for the header
// bearing (jack-stud) check. Public NDS Supplement Table 4A values.
export const LUMBER_FC_PERP_PSI = {
  "DF-L": 625, "SPF": 425, "SYP": 565, "Hem-Fir": 405,
};

// AWC NDS reference compression-parallel-to-grain (F_c) and stability
// modulus (E_min) for the No.2 grades used by the deck-post column check.
export const LUMBER_FC_PSI = {
  "DF-L": 1350, "SPF": 1150, "SYP": 1450, "Hem-Fir": 1300,
};
export const LUMBER_EMIN_PSI = {
  "DF-L": 580000, "SPF": 510000, "SYP": 580000, "Hem-Fir": 470000,
};

function _v15cSpeciesPrefix(species_grade) {
  return String(species_grade || "").split("_")[0];
}

// Header / deck-beam member candidates: built-up dimension lumber. Search
// shallow-to-deep, fewer plies before more, and return the first member that
// carries the span within both the bending and the deflection limit.
const _V15C_BEAM_SIZES = ["2x6", "2x8", "2x10", "2x12"];
const _V15C_DECK_SIZES = ["2x8", "2x10", "2x12"];

// AWC NDS bending size factor C_F for visually-graded dimension lumber
// (No.2, 2-4 in thick) by nominal depth. Public NDS Supplement Table 4A
// adjustment. SYP tabulated values already include the size effect, so SYP
// uses C_F = 1.0. C_D is the load-duration factor (snow 1.15, occupancy 1.0).
const _V15C_CF_BENDING = { "2x4": 1.5, "2x6": 1.3, "2x8": 1.2, "2x10": 1.1, "2x12": 1.0 };

function _v15cSizeFactor(size, species_grade) {
  if (_v15cSpeciesPrefix(species_grade) === "SYP") return 1.0;
  return _V15C_CF_BENDING[size] || 1.0;
}

function _v15cSmallestMember({ sizes, plyOptions, props, species_grade, w_plf, span_ft, deflection_limit, c_d = 1.0 }) {
  // Ply-outer, depth-inner: prefer fewer plies and go deeper before adding a
  // third ply, matching carpentry practice and the IRC table preference for a
  // deeper double over a triple of a shallower member.
  for (const plies of plyOptions) {
    for (const size of sizes) {
      const dim = LUMBER_NOMINAL_TO_ACTUAL[size];
      if (!dim) continue;
      const Fb_adj = props.F_b_psi * c_d * _v15cSizeFactor(size, species_grade);
      const b_in = 1.5 * plies;
      const Lb = allowableSpanByBending({ w_lb_ft: w_plf, Fb_psi: Fb_adj, b_in, d_in: dim.d_in });
      const Ld = allowableSpanByDeflection({ w_lb_ft: w_plf, E_psi: props.E_psi, b_in, d_in: dim.d_in, deflectionLimit: deflection_limit });
      const allowable = Math.min(Lb, Ld);
      if (allowable >= span_ft) {
        return { size, plies, b_in, d_in: dim.d_in, Fb_adj, allowable_span_ft: allowable, by_bending_ft: Lb, by_deflection_ft: Ld };
      }
    }
  }
  return null;
}

// --- E.7: Window / Door Header Sizing (IRC R602.7) ---
//
// Tributary uniform load to the header w (plf) = total area load (psf) times
// the supported tributary width (ft). Roof load = ground snow (live) + 15 psf
// dead; each floor above adds 50 psf (40 live + 10 dead). The smallest built-up
// member that carries the clear span within bending and L/360 deflection is
// reported, with the AWC NDS bending / deflection verification and the IRC
// R602.7.5 jack-stud count from the end reaction and F_c-perp bearing.

// dims: in { header_span_ft: L, tributary_width_ft: L, floors_above: dimensionless, ground_snow_psf: M L^-1 T^-2, species_grade: dimensionless } out: { member_size: dimensionless, plies: dimensionless, jack_studs_each_end: dimensionless, f_b_psi: M L^-1 T^-2 }
export function computeHeaderSizing({
  header_span_ft = 0,
  tributary_width_ft = 0,
  floors_above = 0,
  ground_snow_psf = 30,
  species_grade = "SPF_No2",
  deflection_limit = 360,
} = {}) {
  const span = Number(header_span_ft) || 0;
  const trib = Number(tributary_width_ft) || 0;
  const floors = Math.max(0, Math.round(Number(floors_above) || 0));
  const snow = Number(ground_snow_psf) || 0;
  const limit = Number(deflection_limit) || 360;
  const props = LUMBER_SPECIES_GRADES[species_grade];
  if (!props) return { error: "Unknown species/grade." };
  if (!(span > 0)) return { error: "Header span must be positive (ft)." };
  if (!(trib > 0)) return { error: "Tributary width must be positive (ft); use half the building width the header supports." };
  if (snow < 0) return { error: "Ground snow load cannot be negative (psf)." };
  if (floors > 2) return { error: "This tile covers 0, 1, or 2 floors above per the IRC R602.7 table range." };

  // Area loads (psf) on the tributary width.
  const roof_psf = snow + 15; // snow live + roof/ceiling dead
  const floor_psf = 50 * floors; // 40 live + 10 dead per floor
  const total_psf = roof_psf + floor_psf;
  const w_plf = total_psf * trib;
  // Load-duration factor C_D: snow governs the roof-only case (1.15);
  // floor occupancy governs once a floor is supported (1.0, more conservative).
  const c_d = floors > 0 ? 1.0 : 1.15;

  const member = _v15cSmallestMember({ sizes: _V15C_BEAM_SIZES, plyOptions: [2, 3], props, species_grade, w_plf, span_ft: span, deflection_limit: limit, c_d });
  if (!member) {
    return {
      error: "No bundled built-up dimension-lumber member (up to a triple 2x12) carries this span and load. This is an engineered-beam condition (LVL / steel); consult a design professional.",
      w_plf,
    };
  }

  // AWC NDS verification at the actual span.
  const M_lbin = (w_plf * span * span / 8) * 12;
  const S_in3 = member.plies * (1.5 * member.d_in * member.d_in / 6);
  const f_b_psi = M_lbin / S_in3;
  const Fb_allow_psi = member.Fb_adj;
  const I_in4 = member.plies * (1.5 * Math.pow(member.d_in, 3) / 12);
  const w_lb_in = w_plf / 12;
  const L_in = span * 12;
  const deflection_in = (5 * w_lb_in * Math.pow(L_in, 4)) / (384 * props.E_psi * I_in4);
  const allowable_deflection_in = L_in / limit;

  // Jack (trimmer) studs each end: end reaction over the F_c-perp bearing
  // capacity of one 2x4 stud (1.5 x 3.5 = 5.25 in^2 of bearing).
  const reaction_lb = w_plf * span / 2;
  const fcp = LUMBER_FC_PERP_PSI[_v15cSpeciesPrefix(species_grade)] || 425;
  const jack_capacity_lb = fcp * 5.25;
  const jack_studs_each_end = Math.max(1, Math.ceil(reaction_lb / jack_capacity_lb));

  const ply_label = member.plies === 1 ? "single" : member.plies === 2 ? "double" : "triple";
  const member_label = "(" + member.plies + ") " + member.size + " " + species_grade.replace("_", " ");

  const warnings = [];
  if (span > 12) warnings.push("Header span above 12 ft is at or beyond the IRC R602.7 table range; treat as an engineered-design condition.");
  if (member.plies >= 3) warnings.push("Triple-ply member required; confirm the rough-opening width and king/jack-stud packing.");
  if (jack_studs_each_end >= 3) warnings.push("Three or more jack studs per end; verify the bearing detail and consider a wider post.");

  return {
    member_size: member.size,
    plies: member.plies,
    ply_label,
    member_label,
    species_grade,
    total_load_psf: total_psf,
    w_plf,
    allowable_span_ft: member.allowable_span_ft,
    by_bending_ft: member.by_bending_ft,
    by_deflection_ft: member.by_deflection_ft,
    governing: member.by_bending_ft < member.by_deflection_ft ? "bending" : "deflection",
    f_b_psi,
    F_b_psi: Fb_allow_psi,
    F_b_base_psi: props.F_b_psi,
    c_d,
    bending_ok: f_b_psi <= Fb_allow_psi,
    deflection_in,
    allowable_deflection_in,
    deflection_ok: deflection_in <= allowable_deflection_in,
    reaction_lb,
    jack_studs_each_end,
    warnings,
  };
}

export const headerSizingExample = {
  // 6 ft header, 14 ft tributary (28 ft-wide building, half each side), roof
  // only, 30 psf ground snow, SPF #2: total 45 psf x 14 ft = 630 plf; with the
  // snow load-duration factor (C_D 1.15) a double 2x10 carries the 6 ft span.
  inputs: { header_span_ft: 6, tributary_width_ft: 14, floors_above: 0, ground_snow_psf: 30, species_grade: "SPF_No2" },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v15c_renderHeaderSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per IRC 2021 §R602.7 (headers). Member sized from first-principles simple-span mechanics (M = wL^2/8; sigma = M/S; delta = 5wL^4/384EI) with AWC NDS-2018 reference design values bundled per the lumber-spans tile. Jack studs from the end reaction over the NDS F_c-perp bearing. Allowable spans verified against IRC Table R602.7(1) by physics; the AHJ governs the adopted code. Free at codes.iccsafe.org and awc.org.";
  const span = _v15c_makeNumber("Header clear span (ft)", "hdr-span", { step: "any", min: "0", value: "6" });
  span.input.value = "6";
  const trib = _v15c_makeNumber("Tributary width (ft; half the building width)", "hdr-trib", { step: "any", min: "0", value: "14" });
  trib.input.value = "14";
  const floors = _v15c_makeSelect("Floors supported above", "hdr-floors", [
    { value: "0", label: "Roof / ceiling only" },
    { value: "1", label: "Roof + 1 floor" },
    { value: "2", label: "Roof + 2 floors" },
  ]);
  const snow = _v15c_makeNumber("Ground snow load (psf)", "hdr-snow", { step: "any", min: "0", value: "30" });
  snow.input.value = "30";
  const sp = _v15c_makeSelect("Species and grade", "hdr-sp", Object.keys(LUMBER_SPECIES_GRADES).map((k) => ({ value: k, label: k.replace("_", " ") })));
  sp.select.value = "SPF_No2";
  for (const f of [span, trib, floors, snow, sp]) inputRegion.appendChild(f.wrap);
  _v15c_attachEx(inputRegion, () => {
    span.input.value = "6"; trib.input.value = "14"; floors.select.value = "0"; snow.input.value = "30"; sp.select.value = "SPF_No2"; update();
  });

  const oMember = _v15c_makeOut(outputRegion, "Recommended header", "hdr-out-member");
  const oLoad = _v15c_makeOut(outputRegion, "Design load on header", "hdr-out-load");
  const oVerify = _v15c_makeOut(outputRegion, "NDS verification (bending / deflection)", "hdr-out-verify");
  const oJack = _v15c_makeOut(outputRegion, "Jack (trimmer) studs each end", "hdr-out-jack");
  const oW = _v15c_makeOut(outputRegion, "Notes", "hdr-out-w");

  function readNum(input) { if (input.value === "") return null; const n = Number(input.value); return Number.isFinite(n) ? n : null; }
  const update = _v15c_debounce(() => {
    const r = computeHeaderSizing({
      header_span_ft: readNum(span.input),
      tributary_width_ft: readNum(trib.input),
      floors_above: Number(floors.select.value),
      ground_snow_psf: readNum(snow.input),
      species_grade: sp.select.value,
    });
    if (r.error) { oMember.textContent = r.error; oLoad.textContent = "-"; oVerify.textContent = "-"; oJack.textContent = "-"; oW.textContent = ""; return; }
    oMember.textContent = r.member_label + " (allowable span " + _v15c_fmt(r.allowable_span_ft, 2) + " ft, governed by " + r.governing + ")";
    oLoad.textContent = _v15c_fmt(r.w_plf, 0) + " plf (" + _v15c_fmt(r.total_load_psf, 0) + " psf on tributary)";
    oVerify.textContent = "f_b " + _v15c_fmt(r.f_b_psi, 0) + " / " + r.F_b_psi + " psi " + (r.bending_ok ? "OK" : "OVER") + "; deflection " + _v15c_fmt(r.deflection_in, 3) + " / " + _v15c_fmt(r.allowable_deflection_in, 3) + " in " + (r.deflection_ok ? "OK" : "OVER");
    oJack.textContent = String(r.jack_studs_each_end) + " (end reaction " + _v15c_fmt(r.reaction_lb, 0) + " lb)";
    oW.textContent = r.warnings.length ? r.warnings.join(" ") : "Within the IRC R602.7 table range; the AHJ governs the final inspection.";
  }, _V15C_DEB);
  for (const el of [span.input, trib.input, snow.input]) el.addEventListener("input", update);
  for (const el of [floors.select, sp.select]) el.addEventListener("change", update);
}

CONSTRUCTION_RENDERERS["header-sizing"] = _v15c_renderHeaderSizing;

// --- E.8: Deck Post and Beam Sizing (IRC R507) ---
//
// Tributary width to the beam = joist span / 2 (the ledger carries the other
// half on an attached deck). Beam uniform load w (plf) = (live + dead) psf x
// tributary width. The smallest built-up beam that carries the post spacing
// within bending and L/360 deflection is reported; the interior-post axial
// load drives an AWC NDS column check (C_P stability factor) to pick a 4x4 or
// 6x6; the post load drives a footing from the E.1 soil-bearing engine; and
// the ledger fastener spacing follows the public IRC Table R507.9.1.3(1).

// IRC R507.9.1.3(1): on-center spacing of 1/2 in lag screws / approved
// fasteners through a 2x ledger, by joist span, for a 40 psf live + 10 psf
// dead deck. Public code table (a number per row, not the table text).
const _V15C_LEDGER_SPACING_IN = [
  { max_joist_span_ft: 6, spacing_in: 30 },
  { max_joist_span_ft: 8, spacing_in: 23 },
  { max_joist_span_ft: 10, spacing_in: 18 },
  { max_joist_span_ft: 12, spacing_in: 15 },
  { max_joist_span_ft: 14, spacing_in: 13 },
  { max_joist_span_ft: 16, spacing_in: 11 },
  { max_joist_span_ft: 18, spacing_in: 10 },
];

function _v15cPostColumnCapacity({ d_in, height_ft, F_c, E_min }) {
  // NDS column equation for a square sawn post, pinned-pinned (K_e = 1).
  const A_in2 = d_in * d_in;
  const le_d = (height_ft * 12) / d_in;
  const F_cE = (0.822 * E_min) / (le_d * le_d);
  const c = 0.8; // sawn lumber
  const ratio = F_cE / F_c;
  const C_P = (1 + ratio) / (2 * c) - Math.sqrt(Math.pow((1 + ratio) / (2 * c), 2) - ratio / c);
  const F_c_prime = F_c * C_P;
  return { A_in2, le_d, C_P, allowable_load_lb: F_c_prime * A_in2 };
}

// dims: in { joist_span_ft: L, beam_span_ft: L, post_height_ft: L, live_load_psf: M L^-1 T^-2, dead_load_psf: M L^-1 T^-2, species_grade: dimensionless } out: { beam_label: dimensionless, post_size: dimensionless, footing_side_in: L }
export function computeDeckBeamPost({
  joist_span_ft = 0,
  beam_span_ft = 0,
  post_height_ft = 8,
  live_load_psf = 40,
  dead_load_psf = 10,
  species_grade = "SYP_No2",
  soil_class = "clay",
  deck_height_in = 24,
  ledger = "attached",
  deflection_limit = 360,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const joist = Number(joist_span_ft) || 0;
  const beamSpan = Number(beam_span_ft) || 0;
  const postH = Number(post_height_ft) || 0;
  const live = Number(live_load_psf) || 0;
  const dead = Number(dead_load_psf) || 0;
  const limit = Number(deflection_limit) || 360;
  const props = LUMBER_SPECIES_GRADES[species_grade];
  if (!props) return { error: "Unknown species/grade." };
  if (!(joist > 0)) return { error: "Joist span (deck depth) must be positive (ft)." };
  if (!(beamSpan > 0)) return { error: "Beam span (post spacing) must be positive (ft)." };
  if (!(postH > 0)) return { error: "Post height must be positive (ft)." };
  if (live < 0 || dead < 0) return { error: "Loads cannot be negative (psf)." };

  const tributary_width_ft = joist / 2;
  const total_psf = live + dead;
  const w_plf = total_psf * tributary_width_ft;

  const beam = _v15cSmallestMember({ sizes: _V15C_DECK_SIZES, plyOptions: [2, 3], props, species_grade, w_plf, span_ft: beamSpan, deflection_limit: limit, c_d: 1.0 });
  if (!beam) {
    return { error: "No bundled built-up dimension-lumber beam (up to a triple 2x12) carries this post spacing and load. Reduce the beam span (add a post) or use an engineered beam.", w_plf };
  }
  const beam_label = "(" + beam.plies + ") " + beam.size + " " + species_grade.replace("_", " ");

  // Interior post axial load = full bay tributary = w_plf * beam span.
  const post_load_lb = w_plf * beamSpan;
  const prefix = _v15cSpeciesPrefix(species_grade);
  const F_c = LUMBER_FC_PSI[prefix] || 1150;
  const E_min = LUMBER_EMIN_PSI[prefix] || 510000;
  let post_size = null;
  let post_capacity = null;
  for (const cand of [{ label: "4x4", d_in: 3.5 }, { label: "6x6", d_in: 5.5 }]) {
    const cap = _v15cPostColumnCapacity({ d_in: cand.d_in, height_ft: postH, F_c, E_min });
    if (cap.allowable_load_lb >= post_load_lb) { post_size = cand.label; post_capacity = cap; break; }
  }
  let post_warning = null;
  if (!post_size) {
    post_size = "6x6";
    post_capacity = _v15cPostColumnCapacity({ d_in: 5.5, height_ft: postH, F_c, E_min });
    post_warning = "A 6x6 is overloaded at this height and load; shorten the post, reduce the beam span, or use an engineered column.";
  }

  // Footing from the E.1 soil-bearing engine.
  const footing = computeFootingArea({ column_load_lb: post_load_lb, soil_class });

  // Ledger fastener spacing (attached decks only).
  let ledger_spacing_in = null;
  if (ledger === "attached") {
    const row = _V15C_LEDGER_SPACING_IN.find((r) => joist <= r.max_joist_span_ft);
    ledger_spacing_in = row ? row.spacing_in : null;
  }

  const warnings = [];
  if (Number(deck_height_in) > 30) warnings.push("Walking surface above 30 in requires a guardrail per IRC R312.");
  if (beamSpan > 12) warnings.push("Beam span above 12 ft is beyond the common IRC R507 table range; verify against the adopted table or engineer the beam.");
  if (post_warning) warnings.push(post_warning);
  if (ledger === "attached" && ledger_spacing_in === null) warnings.push("Joist span exceeds the IRC R507.9.1.3 ledger-fastener table; an engineered connection is required.");

  return {
    tributary_width_ft,
    total_load_psf: total_psf,
    w_plf,
    beam_size: beam.size,
    beam_plies: beam.plies,
    beam_label,
    beam_allowable_span_ft: beam.allowable_span_ft,
    beam_governing: beam.by_bending_ft < beam.by_deflection_ft ? "bending" : "deflection",
    post_load_lb,
    post_size,
    post_allowable_load_lb: post_capacity ? post_capacity.allowable_load_lb : null,
    post_slenderness_le_d: post_capacity ? post_capacity.le_d : null,
    footing_side_in: footing.error ? null : footing.rounded_side_in,
    footing_soil_psf: footing.error ? null : footing.allowable_psf,
    ledger,
    ledger_spacing_in,
    warnings,
  };
}

export const deckBeamPostExample = {
  // 12 ft deep, 12x16 deck: joist span 12 ft, beam span (post spacing) 8 ft,
  // 40 + 10 psf, SYP #2, 8 ft posts on 1500 psf clay, attached ledger.
  inputs: { joist_span_ft: 12, beam_span_ft: 8, post_height_ft: 8, live_load_psf: 40, dead_load_psf: 10, species_grade: "SYP_No2", soil_class: "clay", deck_height_in: 36, ledger: "attached" },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v15c_renderDeckBeamPost(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per IRC 2021 §R507 (decks). Beam and post sized from first-principles mechanics (M = wL^2/8; L/360 deflection; NDS column C_P stability factor) with AWC NDS-2018 reference values bundled. Footing from the soil-bearing tile (IRC Table R401.4.1). Ledger fastener spacing per the public IRC Table R507.9.1.3(1). AHJ governs. Free at codes.iccsafe.org and awc.org.";
  const joist = _v15c_makeNumber("Joist span / deck depth (ft)", "dk-joist", { step: "any", min: "0", value: "12" });
  joist.input.value = "12";
  const beamSpan = _v15c_makeNumber("Beam span / post spacing (ft)", "dk-beam", { step: "any", min: "0", value: "8" });
  beamSpan.input.value = "8";
  const postH = _v15c_makeNumber("Post height (ft)", "dk-posth", { step: "any", min: "0", value: "8" });
  postH.input.value = "8";
  const live = _v15c_makeNumber("Live load (psf)", "dk-live", { step: "any", min: "0", value: "40" });
  live.input.value = "40";
  const dead = _v15c_makeNumber("Dead load (psf)", "dk-dead", { step: "any", min: "0", value: "10" });
  dead.input.value = "10";
  const sp = _v15c_makeSelect("Beam / post species and grade", "dk-sp", Object.keys(LUMBER_SPECIES_GRADES).map((k) => ({ value: k, label: k.replace("_", " ") })));
  sp.select.value = "SYP_No2";
  const soil = _v15c_makeSelect("Soil bearing", "dk-soil", Object.keys(SOIL_BEARING_PSF).map((k) => ({ value: k, label: k.replace("_", " ") + " (" + SOIL_BEARING_PSF[k] + " psf)" })));
  soil.select.value = "clay";
  const deckH = _v15c_makeNumber("Walking-surface height (in)", "dk-h", { step: "any", min: "0", value: "36" });
  deckH.input.value = "36";
  const ledger = _v15c_makeSelect("Ledger condition", "dk-ledger", [
    { value: "attached", label: "Attached to house (ledger)" },
    { value: "freestanding", label: "Freestanding (no ledger)" },
  ]);
  for (const f of [joist, beamSpan, postH, live, dead, sp, soil, deckH, ledger]) inputRegion.appendChild(f.wrap);
  _v15c_attachEx(inputRegion, () => {
    joist.input.value = "12"; beamSpan.input.value = "8"; postH.input.value = "8"; live.input.value = "40"; dead.input.value = "10"; sp.select.value = "SYP_No2"; soil.select.value = "clay"; deckH.input.value = "36"; ledger.select.value = "attached"; update();
  });

  const oBeam = _v15c_makeOut(outputRegion, "Recommended beam", "dk-out-beam");
  const oPost = _v15c_makeOut(outputRegion, "Post size (axial load)", "dk-out-post");
  const oFoot = _v15c_makeOut(outputRegion, "Footing", "dk-out-foot");
  const oLedger = _v15c_makeOut(outputRegion, "Ledger fastener spacing", "dk-out-ledger");
  const oW = _v15c_makeOut(outputRegion, "Notes", "dk-out-w");

  function readNum(input) { if (input.value === "") return null; const n = Number(input.value); return Number.isFinite(n) ? n : null; }
  const update = _v15c_debounce(() => {
    const r = computeDeckBeamPost({
      joist_span_ft: readNum(joist.input),
      beam_span_ft: readNum(beamSpan.input),
      post_height_ft: readNum(postH.input),
      live_load_psf: readNum(live.input),
      dead_load_psf: readNum(dead.input),
      species_grade: sp.select.value,
      soil_class: soil.select.value,
      deck_height_in: readNum(deckH.input),
      ledger: ledger.select.value,
    });
    if (r.error) { oBeam.textContent = r.error; oPost.textContent = "-"; oFoot.textContent = "-"; oLedger.textContent = "-"; oW.textContent = ""; return; }
    oBeam.textContent = r.beam_label + " (allowable span " + _v15c_fmt(r.beam_allowable_span_ft, 2) + " ft, governed by " + r.beam_governing + "; " + _v15c_fmt(r.w_plf, 0) + " plf)";
    oPost.textContent = r.post_size + " (load " + _v15c_fmt(r.post_load_lb, 0) + " lb; capacity " + _v15c_fmt(r.post_allowable_load_lb, 0) + " lb at le/d " + _v15c_fmt(r.post_slenderness_le_d, 1) + ")";
    oFoot.textContent = r.footing_side_in != null ? (r.footing_side_in + " in square on " + r.footing_soil_psf + " psf soil") : "-";
    oLedger.textContent = r.ledger === "attached" ? (r.ledger_spacing_in != null ? ("1/2 in lag / SDS at " + r.ledger_spacing_in + " in OC (IRC R507.9.1.3)") : "engineered connection required") : "freestanding: provide a beam and footings at the house side";
    oW.textContent = r.warnings.length ? r.warnings.join(" ") : "Within the IRC R507 prescriptive range; the AHJ governs the final inspection.";
  }, _V15C_DEB);
  for (const el of [joist.input, beamSpan.input, postH.input, live.input, dead.input, deckH.input]) el.addEventListener("input", update);
  for (const el of [sp.select, soil.select, ledger.select]) el.addEventListener("change", update);
}

CONSTRUCTION_RENDERERS["deck-beam-post"] = _v15c_renderDeckBeamPost;

// =====================================================================
// v23 E.1: Braced-wall-panel length (IRC R602.10)
// =====================================================================
// The required total braced-panel length on a braced wall line is the
// adopted IRC table's bracing percent times the wall-line length. The
// percent is user-supplied (it depends on method, seismic design
// category, and exposure - the table is not reproduced). Provided vs.
// required gives the pass/fail.
//
// dims: in { wall_line_length_ft: L, bracing_percent: dimensionless, provided_length_ft: L, method: dimensionless } out: { required_length_ft: L, provided_length_ft: L, pass: dimensionless }
export function computeWallBracingLength({ wall_line_length_ft = 0, bracing_percent = 0, provided_length_ft = 0, method = "cs-wsp" } = {}) {
  const L = Number(wall_line_length_ft) || 0;
  const pct = Number(bracing_percent) || 0;
  if (!(L > 0 && Number.isFinite(L))) return { error: "Wall-line length must be positive (ft)." };
  if (!(pct > 0 && pct <= 100 && Number.isFinite(pct))) return { error: "Required bracing percent must be in (0, 100]." };
  let provided = Number(provided_length_ft);
  if (!Number.isFinite(provided) || provided < 0) provided = 0;
  const required_length_ft = (pct / 100) * L;
  const pass = provided > 0 ? provided >= required_length_ft : null;
  return { required_length_ft, provided_length_ft: provided, pass, method: String(method || "") };
}

export const wallBracingLengthExample = { inputs: { wall_line_length_ft: 40, bracing_percent: 20, provided_length_ft: 9, method: "cs-wsp" } };

const renderWallBracingLength = _simpleRenderer({
  citation: "Citation: Per the IRC R602.10 wall-bracing provisions. The required bracing percent is user-supplied from the adopted IRC table (it depends on method, seismic design category, and wind exposure). The AHJ-adopted edition governs. Free read-only at codes.iccsafe.org.",
  example: wallBracingLengthExample.inputs,
  fields: [
    { key: "method", label: "Bracing method", kind: "select", options: [
      { value: "cs-wsp", label: "CS-WSP (wood structural panel)" },
      { value: "cs-pf", label: "CS-PF (portal frame)" },
      { value: "lib", label: "LIB (let-in brace)" },
      { value: "gb", label: "GB (gypsum board)" },
      { value: "other", label: "Other (per table)" },
    ] },
    { key: "wall_line_length_ft", label: "Braced wall-line length (ft)", kind: "number" },
    { key: "bracing_percent", label: "Required bracing (% of line, from IRC table)", kind: "number" },
    { key: "provided_length_ft", label: "Provided braced length (ft)", kind: "number" },
  ],
  outputs: [
    { key: "req", id: "wbl-out-req", label: "Required braced length", value: (r) => _fmtC(r.required_length_ft, 2) + " ft" },
    { key: "prov", id: "wbl-out-prov", label: "Provided vs. required", value: (r) => r.provided_length_ft > 0 ? (_fmtC(r.provided_length_ft, 2) + " ft provided") : "(enter provided length)" },
    { key: "pass", id: "wbl-out-pass", label: "Verdict", value: (r) => r.pass === null ? "(enter provided length to check)" : (r.pass ? "PASS - meets required bracing" : "FAIL - add braced-panel length") },
  ],
  compute: computeWallBracingLength,
});
CONSTRUCTION_RENDERERS["wall-bracing-length"] = renderWallBracingLength;

// =====================================================================
// v23 E.2: Deck ledger fastener spacing (IRC R507.9)
// =====================================================================
// The IRC ledger-connection table gives an on-center fastener spacing
// for a fastener type / joist-span row (user-supplied). The fastener
// count along the ledger follows; spans beyond the table (18 ft) need an
// engineered connection.
//
// dims: in { joist_span_ft: L, spacing_in: L, ledger_length_ft: L, fastener: dimensionless } out: { spacing_in: L, fastener_count: dimensionless, joist_span_ft: L, pass: dimensionless }
export function computeDeckLedgerFasteners({ joist_span_ft = 0, spacing_in = 0, ledger_length_ft = 0, fastener = "lag" } = {}) {
  const span = Number(joist_span_ft) || 0;
  const spacing = Number(spacing_in) || 0;
  const len = Number(ledger_length_ft) || 0;
  if (!(span > 0 && Number.isFinite(span))) return { error: "Joist span must be positive (ft)." };
  if (!(spacing > 0 && Number.isFinite(spacing))) return { error: "On-center spacing must be positive (in)." };
  if (!(len > 0 && Number.isFinite(len))) return { error: "Ledger length must be positive (ft)." };
  const within_table = span <= 18;
  // One fastener every `spacing` inches plus the closing fastener at the end.
  const fastener_count = Math.floor((len * 12) / spacing) + 1;
  return { spacing_in: spacing, fastener_count, joist_span_ft: span, within_table, pass: within_table, fastener: String(fastener || "") };
}

export const deckLedgerFastenersExample = { inputs: { joist_span_ft: 12, spacing_in: 16, ledger_length_ft: 16, fastener: "lag" } };

const renderDeckLedgerFasteners = _simpleRenderer({
  citation: "Citation: Per the IRC R507.9 deck ledger connection provisions; the on-center spacing is user-supplied from the adopted IRC table for the fastener type / joist-span row. Bolt edge-distance and stagger apply; bottom-of-ledger spacing excluded. The AHJ-adopted edition governs. Free read-only at codes.iccsafe.org.",
  example: deckLedgerFastenersExample.inputs,
  fields: [
    { key: "fastener", label: "Fastener type", kind: "select", options: [
      { value: "lag", label: "1/2-in lag screw" },
      { value: "bolt", label: "1/2-in through-bolt" },
      { value: "sds", label: "Proprietary structural screw" },
    ] },
    { key: "joist_span_ft", label: "Joist span (ft)", kind: "number" },
    { key: "spacing_in", label: "On-center spacing (in, from IRC table)", kind: "number" },
    { key: "ledger_length_ft", label: "Ledger length (ft)", kind: "number" },
  ],
  outputs: [
    { key: "oc", id: "dlf-out-oc", label: "On-center spacing", value: (r) => _fmtC(r.spacing_in, 0) + " in OC" },
    { key: "count", id: "dlf-out-count", label: "Fasteners for ledger", value: (r) => String(r.fastener_count) },
    { key: "pass", id: "dlf-out-pass", label: "Span / table check", value: (r) => r.pass ? "Within IRC R507.9 table range (span <= 18 ft)" : "Span exceeds the IRC table - engineered connection required" },
  ],
  compute: computeDeckLedgerFasteners,
});
CONSTRUCTION_RENDERERS["deck-ledger-fasteners"] = renderDeckLedgerFasteners;

// ===========================================================================
// spec-v20 Phase E - three new construction tiles (v18/v21 tile contract).
// ===========================================================================

// --- v20 E.1: Bearing length on a wood plate (`point-load-bearing`) ---
// A_req = P / (Fc_perp * Cb); length = A_req / width; f_c_perp = P/(width*len).
// dims: in { load_lb: M*L*T^-2, width_in: L, fc_perp_psi: M*L^-1*T^-2, cb: dimensionless, provided_length_in: L } out: { req_length_in: L, actual_stress_psi: M*L^-1*T^-2 }
export function computePointLoadBearing({ load_lb = 0, width_in = 0, fc_perp_psi = 0, cb = 1, provided_length_in = 0 } = {}) {
  const P = Number(load_lb) || 0;
  const w = Number(width_in) || 0;
  const fc = Number(fc_perp_psi) || 0;
  const Cb = Number(cb) || 0;
  const prov = Number(provided_length_in) || 0;
  if (!(P > 0 && Number.isFinite(P))) return { error: "Reaction load must be positive (lb)." };
  if (!(w > 0 && Number.isFinite(w))) return { error: "Bearing width must be positive (in)." };
  if (!(fc > 0 && Number.isFinite(fc))) return { error: "Allowable Fc-perp must be positive (psi)." };
  if (!(Cb > 0 && Number.isFinite(Cb))) return { error: "Bearing-area factor Cb must be positive." };
  const aReq = P / (fc * Cb);
  const reqLen = aReq / w;
  let actualStress = null, pass = null;
  if (prov > 0) { actualStress = P / (w * prov); pass = actualStress <= fc * Cb; }
  return {
    req_area_in2: Number.isFinite(aReq) ? aReq : null,
    req_length_in: Number.isFinite(reqLen) ? reqLen : null,
    actual_stress_psi: actualStress != null && Number.isFinite(actualStress) ? actualStress : null,
    pass,
    note: "Compression perpendicular to grain; Cb applies only to bearings under ~6 in not near a member end. Perpendicular vs. parallel-grain values differ greatly. Does not check crushing of the supported member.",
  };
}
export const pointLoadBearingExample = { inputs: { load_lb: 4000, width_in: 3.0, fc_perp_psi: 625, cb: 1, provided_length_in: 0 } };

function renderPointLoadBearing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the National Design Specification (NDS) for Wood Construction - compression perpendicular to grain and the bearing-area factor Cb, by name; Fc-perp values user-supplied by species/grade. The IBC-adopted NDS edition governs. AWC publishes the NDS free read-only at awc.org.";
  const p = makeNumber("Reaction load (lb)", "plb-p", { step: "any", min: "0", value: "4000" });
  p.input.value = "4000";
  const w = makeNumber("Member bearing width (in)", "plb-w", { step: "any", min: "0", value: "3.0" });
  w.input.value = "3.0";
  const fc = makeNumber("Allowable Fc-perp (psi)", "plb-fc", { step: "any", min: "0", value: "625" });
  fc.input.value = "625";
  const cb = makeNumber("Bearing-area factor Cb", "plb-cb", { step: "any", min: "0", value: "1" });
  cb.input.value = "1";
  const prov = makeNumber("Provided bearing length (in, optional)", "plb-prov", { step: "any", min: "0" });
  for (const f of [p, w, fc, cb, prov]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { p.input.value = "4000"; w.input.value = "3.0"; fc.input.value = "625"; cb.input.value = "1"; prov.input.value = ""; update(); });
  const oReq = makeOutputLine(outputRegion, "Required bearing length", "plb-out-req");
  const oStress = makeOutputLine(outputRegion, "Actual bearing stress / verdict", "plb-out-stress");
  const oNote = makeOutputLine(outputRegion, "Note", "plb-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computePointLoadBearing({ load_lb: readNum(p.input), width_in: readNum(w.input), fc_perp_psi: readNum(fc.input), cb: cb.input.value === "" ? 1 : readNum(cb.input), provided_length_in: readNum(prov.input) });
    if (r.error) { oReq.textContent = r.error; oStress.textContent = ""; oNote.textContent = ""; return; }
    oReq.textContent = fmt(r.req_length_in, 3) + " in (" + fmt(r.req_area_in2, 2) + " in2)";
    oStress.textContent = r.actual_stress_psi != null ? fmt(r.actual_stress_psi, 0) + " psi - " + (r.pass ? "PASS" : "FAIL") : "Enter a provided length to check stress.";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [p.input, w.input, fc.input, cb.input, prov.input]) f.addEventListener("input", update);
}
CONSTRUCTION_RENDERERS["point-load-bearing"] = renderPointLoadBearing;

// --- v20 E.2: Wood column capacity, slenderness (`column-buckling-wood`) ---
// le/d governs; FcE = 0.822*Emin/(le/d)^2; a = FcE/Fc*; c = 0.8 (sawn);
// Cp = (1+a)/(2c) - sqrt(((1+a)/(2c))^2 - a/c); Fc' = Fc**Cp; cap = Fc'*b*d.
// dims: in { b_in: L, d_in: L, le_in: L, fc_star_psi: M*L^-1*T^-2, emin_psi: M*L^-1*T^-2, ke: dimensionless } out: { cp: dimensionless, capacity_lb: M*L*T^-2 }
export function computeColumnBucklingWood({ b_in = 0, d_in = 0, le_in = 0, fc_star_psi = 0, emin_psi = 0, ke = 1 } = {}) {
  const b = Number(b_in) || 0;
  const d = Number(d_in) || 0;
  const le0 = Number(le_in) || 0;
  const fcStar = Number(fc_star_psi) || 0;
  const emin = Number(emin_psi) || 0;
  const Ke = Number(ke) || 1;
  if (!(b > 0 && d > 0 && Number.isFinite(b) && Number.isFinite(d))) return { error: "Column dimensions b and d must be positive (in)." };
  if (!(le0 > 0 && Number.isFinite(le0))) return { error: "Unbraced length must be positive (in)." };
  if (!(fcStar > 0 && Number.isFinite(fcStar))) return { error: "Fc* must be positive (psi)." };
  if (!(emin > 0 && Number.isFinite(emin))) return { error: "Emin must be positive (psi)." };
  const le = le0 * (Number.isFinite(Ke) && Ke > 0 ? Ke : 1);
  const minDim = Math.min(b, d);
  const slenderness = le / minDim; // larger le/d governs (smaller dimension)
  if (slenderness > 50) return { error: "le/d exceeds the NDS limit of 50 - column too slender." };
  const c = 0.8;
  const FcE = 0.822 * emin / (slenderness * slenderness);
  const alpha = FcE / fcStar;
  const term = (1 + alpha) / (2 * c);
  const cp = term - Math.sqrt(term * term - alpha / c);
  const fcPrime = fcStar * cp;
  const capacity = fcPrime * b * d;
  return {
    slenderness_ratio: Number.isFinite(slenderness) ? slenderness : null,
    fce_psi: Number.isFinite(FcE) ? FcE : null,
    cp: Number.isFinite(cp) ? cp : null,
    fc_prime_psi: Number.isFinite(fcPrime) ? fcPrime : null,
    capacity_lb: Number.isFinite(capacity) ? capacity : null,
    note: "Solid rectangular sawn lumber (c = 0.8); the larger le/d (smaller dimension) governs. Built-up / round columns are out of scope. Reference design values user-supplied.",
  };
}
export const columnBucklingWoodExample = { inputs: { b_in: 3.5, d_in: 3.5, le_in: 96, fc_star_psi: 1150, emin_psi: 580000, ke: 1 } };

function renderColumnBucklingWood(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the NDS column-stability provisions (the Cp / Euler buckling basis), by name; reference design values user-supplied. Solid rectangular sawn lumber, c = 0.8. The IBC-adopted NDS edition governs. AWC publishes the NDS free read-only at awc.org.";
  const b = makeNumber("Column width b (in)", "cbw-b", { step: "any", min: "0", value: "3.5" });
  b.input.value = "3.5";
  const d = makeNumber("Column depth d (in)", "cbw-d", { step: "any", min: "0", value: "3.5" });
  d.input.value = "3.5";
  const le = makeNumber("Unbraced length le (in)", "cbw-le", { step: "any", min: "0", value: "96" });
  le.input.value = "96";
  const fc = makeNumber("Fc* (psi)", "cbw-fc", { step: "any", min: "0", value: "1150" });
  fc.input.value = "1150";
  const emin = makeNumber("Emin (psi)", "cbw-emin", { step: "any", min: "0", value: "580000" });
  emin.input.value = "580000";
  const ke = makeNumber("Effective-length factor Ke", "cbw-ke", { step: "any", min: "0", value: "1" });
  ke.input.value = "1";
  for (const f of [b, d, le, fc, emin, ke]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { b.input.value = "3.5"; d.input.value = "3.5"; le.input.value = "96"; fc.input.value = "1150"; emin.input.value = "580000"; ke.input.value = "1"; update(); });
  const oSlen = makeOutputLine(outputRegion, "Slenderness le/d", "cbw-out-slen");
  const oCp = makeOutputLine(outputRegion, "Column stability factor Cp", "cbw-out-cp");
  const oCap = makeOutputLine(outputRegion, "Allowable axial capacity", "cbw-out-cap");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeColumnBucklingWood({ b_in: readNum(b.input), d_in: readNum(d.input), le_in: readNum(le.input), fc_star_psi: readNum(fc.input), emin_psi: readNum(emin.input), ke: ke.input.value === "" ? 1 : readNum(ke.input) });
    if (r.error) { oSlen.textContent = r.error; oCp.textContent = ""; oCap.textContent = ""; return; }
    oSlen.textContent = fmt(r.slenderness_ratio, 2);
    oCp.textContent = fmt(r.cp, 4) + " (Fc' " + fmt(r.fc_prime_psi, 0) + " psi)";
    oCap.textContent = fmt(r.capacity_lb, 0) + " lb";
  }, DEBOUNCE_MS);
  for (const f of [b.input, d.input, le.input, fc.input, emin.input, ke.input]) f.addEventListener("input", update);
}
CONSTRUCTION_RENDERERS["column-buckling-wood"] = renderColumnBucklingWood;

// --- v20 E.3: Simple-span beam reactions and max moment (`beam-reactions`) ---
// UDL: R = wL/2, M = wL^2/8. Point load: R_left = P(L-a)/L, R_right = Pa/L,
// moment at load = R_left*a. Superpose.
// dims: in { span_ft: L, w_plf: M*T^-2, point_lb: M*L*T^-2, a_ft: L } out: { r_left_lb: M*L*T^-2, m_max_ftlb: M*L^2*T^-2 }
export function computeBeamReactions({ span_ft = 0, w_plf = 0, point_lb = 0, a_ft = 0 } = {}) {
  const L = Number(span_ft) || 0;
  const w = Number(w_plf) || 0;
  const P = Number(point_lb) || 0;
  const a = Number(a_ft) || 0;
  if (!(L > 0 && Number.isFinite(L))) return { error: "Span must be positive (ft)." };
  if (w < 0 || !Number.isFinite(w)) return { error: "Uniform load must be non-negative (plf)." };
  if (P < 0 || !Number.isFinite(P)) return { error: "Point load must be non-negative (lb)." };
  if (P > 0 && (a < 0 || a > L)) return { error: "Point-load location must be within 0 <= a <= L." };
  const rUdl = w * L / 2;
  const mUdl = w * L * L / 8;
  const rLeftP = P > 0 ? P * (L - a) / L : 0;
  const rRightP = P > 0 ? P * a / L : 0;
  const mP = P > 0 ? rLeftP * a : 0;
  const rLeft = rUdl + rLeftP;
  const rRight = rUdl + rRightP;
  // Max moment: UDL at midspan + point-load contribution (approx superposition at the load point for the combined case; report the larger of midspan and load-point moment)
  // Bending moment at distance x: M(x) = R_left*x - w*x^2/2 - (x>a ? P*(x-a) : 0)
  const Mtot = (x) => (rLeft) * x - w * x * x / 2 - (x > a && P > 0 ? P * (x - a) : 0);
  let mMax = 0;
  const xc = rLeft / w; // location of zero shear for UDL-dominant
  const candidates = [a, Number.isFinite(xc) && xc > 0 && xc < L ? xc : L / 2, L / 2];
  for (const x of candidates) { if (x >= 0 && x <= L) mMax = Math.max(mMax, Mtot(x)); }
  return {
    r_left_lb: Number.isFinite(rLeft) ? rLeft : null,
    r_right_lb: Number.isFinite(rRight) ? rRight : null,
    max_shear_lb: Number.isFinite(Math.max(rLeft, rRight)) ? Math.max(rLeft, rRight) : null,
    m_max_ftlb: Number.isFinite(mMax) ? mMax : null,
    note: "Simple-span pinned-roller only; fixed/continuous/cantilever out of scope. Self-weight not added unless folded into w. Outputs reactions and max moment for post/footing sizing.",
  };
}
export const beamReactionsExample = { inputs: { span_ft: 16, w_plf: 200, point_lb: 0, a_ft: 0 } };

function renderBeamReactions(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Statics / AISC Steel Construction Manual simple-beam diagram formulas (public; also in the AWC/NDS and any statics text). Simple-span pinned-roller only. Distinct from the beam-loading and joist-deflection tiles - this outputs reactions and moment for post/footing sizing, not stress or deflection.";
  const span = makeNumber("Span L (ft)", "br-l", { step: "any", min: "0", value: "16" });
  span.input.value = "16";
  const w = makeNumber("Uniform load w (plf)", "br-w", { step: "any", min: "0", value: "200" });
  w.input.value = "200";
  const p = makeNumber("Point load P (lb, optional)", "br-p", { step: "any", min: "0" });
  const a = makeNumber("Point-load distance a from left (ft)", "br-a", { step: "any", min: "0" });
  for (const f of [span, w, p, a]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { span.input.value = "16"; w.input.value = "200"; p.input.value = ""; a.input.value = ""; update(); });
  const oR = makeOutputLine(outputRegion, "Left / right reactions", "br-out-r");
  const oV = makeOutputLine(outputRegion, "Max shear", "br-out-v");
  const oM = makeOutputLine(outputRegion, "Max bending moment", "br-out-m");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeBeamReactions({ span_ft: readNum(span.input), w_plf: readNum(w.input), point_lb: readNum(p.input), a_ft: readNum(a.input) });
    if (r.error) { oR.textContent = r.error; oV.textContent = ""; oM.textContent = ""; return; }
    oR.textContent = fmt(r.r_left_lb, 0) + " lb / " + fmt(r.r_right_lb, 0) + " lb";
    oV.textContent = fmt(r.max_shear_lb, 0) + " lb";
    oM.textContent = fmt(r.m_max_ftlb, 0) + " ft-lb";
  }, DEBOUNCE_MS);
  for (const f of [span.input, w.input, p.input, a.input]) f.addEventListener("input", update);
}
CONSTRUCTION_RENDERERS["beam-reactions"] = renderBeamReactions;

// --- v24 E.x: Weld heat input (`weld-heat-input`) ---
// Heat input HI = (60 * V * I) / TS gives arc energy per unit length (J/in
// when TS is in/min); multiply by arc efficiency eta and divide by 1000 for
// kJ/in. Process sets a default eta (user-editable). Optional WPS range
// (kJ/in) gives a pass/fail.
// dims: in { voltage_V: M L^2 T^-3 I^-1, current_A: I, travel_in_min: L T^-1, efficiency: dimensionless, wps_min_kj_in: M L T^-2, wps_max_kj_in: M L T^-2 } out: { arc_energy_j_in: M L T^-2, heat_input_kj_in: M L T^-2, heat_input_kj_mm: M L T^-2 }
export function computeWeldHeatInput({ process, voltage_V, current_A, travel_in_min, efficiency, wps_min_kj_in, wps_max_kj_in } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const V = Number(voltage_V) || 0;
  const I = Number(current_A) || 0;
  const TS = Number(travel_in_min) || 0;
  if (!(V > 0)) return { error: "Voltage must be greater than zero." };
  if (!(I > 0)) return { error: "Current must be greater than zero." };
  if (!(TS > 0)) return { error: "Travel speed must be greater than zero." };
  const eta = efficiency > 0 && efficiency <= 1 ? efficiency : null;
  if (eta === null) return { error: "Efficiency must be between 0 and 1." };
  const arc_energy_j_in = (60 * V * I) / TS;
  const heat_input_kj_in = (arc_energy_j_in * eta) / 1000;
  const heat_input_kj_mm = heat_input_kj_in * 0.0393701;
  let pass = null;
  if (wps_min_kj_in != null && wps_max_kj_in != null && wps_min_kj_in !== "" && wps_max_kj_in !== "") {
    const lo = Number(wps_min_kj_in);
    const hi = Number(wps_max_kj_in);
    if (Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo) {
      pass = heat_input_kj_in >= lo && heat_input_kj_in <= hi;
    }
  }
  return {
    arc_energy_j_in: Number.isFinite(arc_energy_j_in) ? arc_energy_j_in : null,
    heat_input_kj_in: Number.isFinite(heat_input_kj_in) ? heat_input_kj_in : null,
    heat_input_kj_mm: Number.isFinite(heat_input_kj_mm) ? heat_input_kj_mm : null,
    pass,
    note: "Arc efficiency varies by process and is user-editable. WPS/PQR ranges are user-supplied; the adopted code edition and the qualified WPS govern.",
  };
}
export const weldHeatInputExample = { inputs: { process: "SMAW", voltage_V: 25, current_A: 200, travel_in_min: 8, efficiency: 0.8 } };

function renderWeldHeatInput(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per AWS D1.1 Structural Welding Code and ASME BPVC Section IX, the heat-input definition HI = (60 * V * I) / TS, by name, with an arc-efficiency factor by process. WPS/PQR ranges are user-supplied; the adopted code edition and the qualified WPS govern. Free overviews at aws.org.";
  const ETA_BY_PROCESS = { SMAW: 0.8, GMAW: 0.8, FCAW: 0.8, GTAW: 0.6, SAW: 1.0 };
  const proc = makeSelect("Process", "whi-proc", [
    { value: "SMAW", label: "SMAW" }, { value: "GMAW", label: "GMAW" },
    { value: "FCAW", label: "FCAW" }, { value: "GTAW", label: "GTAW" }, { value: "SAW", label: "SAW" },
  ]);
  const volt = makeNumber("Voltage (V)", "whi-v", { step: "any", min: "0", value: "25" });
  volt.input.value = "25";
  const cur = makeNumber("Current (A)", "whi-i", { step: "any", min: "0", value: "200" });
  cur.input.value = "200";
  const ts = makeNumber("Travel speed (in/min)", "whi-ts", { step: "any", min: "0", value: "8" });
  ts.input.value = "8";
  const eff = makeNumber("Arc efficiency (0-1)", "whi-eta", { step: "any", min: "0", max: "1", value: "0.8" });
  eff.input.value = "0.8";
  const wmin = makeNumber("WPS min (kJ/in, optional)", "whi-min", { step: "any", min: "0" });
  const wmax = makeNumber("WPS max (kJ/in, optional)", "whi-max", { step: "any", min: "0" });
  for (const f of [proc, volt, cur, ts, eff, wmin, wmax]) inputRegion.appendChild(f.wrap);
  proc.select.addEventListener("input", () => { eff.input.value = String(ETA_BY_PROCESS[proc.select.value]); update(); });
  attachExampleButton(inputRegion, () => { proc.select.value = "SMAW"; volt.input.value = "25"; cur.input.value = "200"; ts.input.value = "8"; eff.input.value = "0.8"; wmin.input.value = ""; wmax.input.value = ""; update(); });
  const oArc = makeOutputLine(outputRegion, "Arc energy", "whi-out-arc");
  const oHi = makeOutputLine(outputRegion, "Heat input", "whi-out-hi");
  const oPass = makeOutputLine(outputRegion, "WPS range", "whi-out-pass");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeWeldHeatInput({
      process: proc.select.value,
      voltage_V: readNum(volt.input),
      current_A: readNum(cur.input),
      travel_in_min: readNum(ts.input),
      efficiency: readNum(eff.input),
      wps_min_kj_in: wmin.input.value === "" ? null : readNum(wmin.input),
      wps_max_kj_in: wmax.input.value === "" ? null : readNum(wmax.input),
    });
    if (r.error) { oArc.textContent = r.error; oHi.textContent = ""; oPass.textContent = ""; return; }
    oArc.textContent = fmt(r.arc_energy_j_in, 0) + " J/in";
    oHi.textContent = fmt(r.heat_input_kj_in, 2) + " kJ/in (" + fmt(r.heat_input_kj_mm, 3) + " kJ/mm)";
    oPass.textContent = r.pass == null ? "(enter min and max to check)" : (r.pass ? "Within WPS range" : "Outside WPS range");
  }, DEBOUNCE_MS);
  for (const f of [volt.input, cur.input, ts.input, eff.input, wmin.input, wmax.input]) f.addEventListener("input", update);
}
CONSTRUCTION_RENDERERS["weld-heat-input"] = renderWeldHeatInput;

// --- v24 E.x: Metal weight by shape (`metal-weight`) ---
// weight = cross-section area * length * density. Per-shape area from the
// governing dimensions (in); density in lb/in^3 from an alloy table or a
// user-supplied custom value. Total = per-piece * quantity; kg = lb * 0.453592.
// dims: in { dia_in: L, side_in: L, width_in: L, height_in: L, thickness_in: L, wall_in: L, leg1_in: L, leg2_in: L, length_in: L, quantity: dimensionless, density_lb_in3: M L^-3 } out: { cross_section_area_in2: L^2, weight_per_piece_lb: M, weight_total_lb: M, weight_total_kg: M }
export function computeMetalWeight({ shape, dia_in, id_in, side_in, width_in, height_in, thickness_in, wall_in, leg1_in, leg2_in, length_in, quantity, density_lb_in3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const len = Number(length_in) || 0;
  const qty = quantity == null || quantity === "" ? 1 : Number(quantity) || 0;
  const density = Number(density_lb_in3) || 0;
  if (!(density > 0)) return { error: "Density must be greater than zero." };
  if (!(len > 0)) return { error: "Length must be greater than zero." };
  if (!(qty > 0)) return { error: "Quantity must be greater than zero." };
  const PI = Math.PI;
  let area = null;
  if (shape === "plate") {
    const w = Number(width_in) || 0, t = Number(thickness_in) || 0;
    if (!(w > 0 && t > 0)) return { error: "Width and thickness must be greater than zero." };
    area = w * t;
  } else if (shape === "round-bar") {
    const d = Number(dia_in) || 0;
    if (!(d > 0)) return { error: "Diameter must be greater than zero." };
    area = (PI / 4) * d * d;
  } else if (shape === "square-bar") {
    const s = Number(side_in) || 0;
    if (!(s > 0)) return { error: "Side must be greater than zero." };
    area = s * s;
  } else if (shape === "hex-bar") {
    const w = Number(width_in) || 0;
    if (!(w > 0)) return { error: "Across-flats width must be greater than zero." };
    area = 0.866 * w * w;
  } else if (shape === "round-tube") {
    const od = Number(dia_in) || 0, id = Number(id_in) || 0;
    if (!(od > 0)) return { error: "Outside diameter must be greater than zero." };
    if (!(id >= 0)) return { error: "Inside diameter must be non-negative." };
    if (id >= od) return { error: "Inside diameter must be less than outside diameter." };
    area = (PI / 4) * (od * od - id * id);
  } else if (shape === "rect-tube") {
    const ow = Number(width_in) || 0, oh = Number(height_in) || 0, wall = Number(wall_in) || 0;
    if (!(ow > 0 && oh > 0)) return { error: "Outer width and height must be greater than zero." };
    if (!(wall > 0)) return { error: "Wall thickness must be greater than zero." };
    const iw = ow - 2 * wall, ih = oh - 2 * wall;
    if (iw <= 0 || ih <= 0) return { error: "Wall thickness too large for the outer dimensions." };
    area = ow * oh - iw * ih;
  } else if (shape === "angle") {
    const l1 = Number(leg1_in) || 0, l2 = Number(leg2_in) || 0, t = Number(thickness_in) || 0;
    if (!(l1 > 0 && l2 > 0 && t > 0)) return { error: "Legs and thickness must be greater than zero." };
    if (t >= l1 || t >= l2) return { error: "Thickness must be less than each leg." };
    area = (l1 + l2 - t) * t;
  } else if (shape === "flat-bar") {
    const w = Number(width_in) || 0, t = Number(thickness_in) || 0;
    if (!(w > 0 && t > 0)) return { error: "Width and thickness must be greater than zero." };
    area = w * t;
  } else {
    return { error: "Unknown shape." };
  }
  if (!(area > 0) || !Number.isFinite(area)) return { error: "Cross-section area is not valid for the given dimensions." };
  const perPiece = area * len * density;
  const totalLb = perPiece * qty;
  const totalKg = totalLb * 0.453592;
  return {
    cross_section_area_in2: Number.isFinite(area) ? area : null,
    weight_per_piece_lb: Number.isFinite(perPiece) ? perPiece : null,
    weight_total_lb: Number.isFinite(totalLb) ? totalLb : null,
    weight_total_kg: Number.isFinite(totalKg) ? totalKg : null,
    note: "Densities are published nominal values for common alloys (a small bundled public reference) or user-supplied. Mill certs and actual alloy temper govern.",
  };
}
export const metalWeightExample = { inputs: { shape: "plate", width_in: 12, thickness_in: 1, length_in: 120, quantity: 1, density_lb_in3: 0.2836 } };

function renderMetalWeight(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-principles weight = volume x density. Densities are published nominal values for common alloys (a small bundled public reference) or user-supplied. Mill certs and actual alloy temper govern.";
  const ALLOYS = {
    "carbon-steel": 0.2836, "stainless": 0.289, "aluminum-6061": 0.098,
    "copper": 0.323, "brass": 0.307,
  };
  const shape = makeSelect("Shape", "mw-shape", [
    { value: "plate", label: "Plate / sheet" }, { value: "round-bar", label: "Round bar" },
    { value: "square-bar", label: "Square bar" }, { value: "hex-bar", label: "Hex bar" },
    { value: "round-tube", label: "Round tube" }, { value: "rect-tube", label: "Rectangular tube" },
    { value: "angle", label: "Angle" }, { value: "flat-bar", label: "Flat bar" },
  ]);
  inputRegion.appendChild(shape.wrap);
  const dimsHost = document.createElement("div");
  inputRegion.appendChild(dimsHost);
  const len = makeNumber("Length (in)", "mw-len", { step: "any", min: "0", value: "120" });
  len.input.value = "120";
  const qty = makeNumber("Quantity", "mw-qty", { step: "1", min: "1", value: "1" });
  qty.input.value = "1";
  const alloy = makeSelect("Alloy", "mw-alloy", [
    { value: "carbon-steel", label: "Carbon steel (0.2836)" }, { value: "stainless", label: "Stainless (0.289)" },
    { value: "aluminum-6061", label: "Aluminum 6061 (0.098)" }, { value: "copper", label: "Copper (0.323)" },
    { value: "brass", label: "Brass (0.307)" }, { value: "custom", label: "Custom density" },
  ]);
  const dens = makeNumber("Density (lb/in^3)", "mw-dens", { step: "any", min: "0", value: "0.2836" });
  dens.input.value = "0.2836";
  for (const f of [len, qty, alloy, dens]) inputRegion.appendChild(f.wrap);
  const oArea = makeOutputLine(outputRegion, "Cross-section area", "mw-out-area");
  const oEach = makeOutputLine(outputRegion, "Weight per piece", "mw-out-each");
  const oTot = makeOutputLine(outputRegion, "Total weight", "mw-out-tot");
  let dimInputs = {};
  function readNum(i) { if (!i || i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  function refreshDims() {
    while (dimsHost.firstChild) dimsHost.removeChild(dimsHost.firstChild);
    dimInputs = {};
    const make = (label, key, val) => {
      const f = makeNumber(label, "mw-d-" + key, { step: "any", min: "0", value: val == null ? "" : String(val) });
      if (val != null) f.input.value = String(val);
      dimsHost.appendChild(f.wrap); dimInputs[key] = f.input;
      f.input.addEventListener("input", update);
    };
    const s = shape.select.value;
    if (s === "plate" || s === "flat-bar") { make("Width (in)", "width_in", 12); make("Thickness (in)", "thickness_in", 1); }
    else if (s === "round-bar") { make("Diameter (in)", "dia_in", 2); }
    else if (s === "square-bar") { make("Side (in)", "side_in", 2); }
    else if (s === "hex-bar") { make("Across-flats width (in)", "width_in", 1); }
    else if (s === "round-tube") { make("Outside diameter (in)", "dia_in", 2); make("Inside diameter (in)", "id_in", 1.5); }
    else if (s === "rect-tube") { make("Outer width (in)", "width_in", 4); make("Outer height (in)", "height_in", 2); make("Wall thickness (in)", "wall_in", 0.125); }
    else if (s === "angle") { make("Leg 1 (in)", "leg1_in", 3); make("Leg 2 (in)", "leg2_in", 3); make("Thickness (in)", "thickness_in", 0.25); }
  }
  function update() {
    const dims = {};
    for (const [k, el] of Object.entries(dimInputs)) dims[k] = readNum(el);
    const r = computeMetalWeight({
      shape: shape.select.value,
      ...dims,
      length_in: readNum(len.input),
      quantity: readNum(qty.input),
      density_lb_in3: readNum(dens.input),
    });
    if (r.error) { oArea.textContent = r.error; oEach.textContent = ""; oTot.textContent = ""; return; }
    oArea.textContent = fmt(r.cross_section_area_in2, 4) + " in^2";
    oEach.textContent = fmt(r.weight_per_piece_lb, 2) + " lb";
    oTot.textContent = fmt(r.weight_total_lb, 2) + " lb (" + fmt(r.weight_total_kg, 2) + " kg)";
  }
  shape.select.addEventListener("input", () => { refreshDims(); update(); });
  alloy.select.addEventListener("input", () => { if (alloy.select.value !== "custom") { dens.input.value = String(ALLOYS[alloy.select.value]); } update(); });
  attachExampleButton(inputRegion, () => { shape.select.value = "plate"; refreshDims(); dimInputs.width_in.value = "12"; dimInputs.thickness_in.value = "1"; len.input.value = "120"; qty.input.value = "1"; alloy.select.value = "carbon-steel"; dens.input.value = "0.2836"; update(); });
  for (const el of [len.input, qty.input, dens.input]) el.addEventListener("input", update);
  refreshDims();
}
CONSTRUCTION_RENDERERS["metal-weight"] = renderMetalWeight;

// --- v24 E.x: Layout squaring (`layout-squaring`) ---
// find-diagonal: ideal diagonal = sqrt(a^2 + b^2) by Pythagoras, plus the
// largest whole 3-4-5 multiple that fits the sides. check-square: compare the
// two measured diagonals; out_of_square = |d1 - d2|; the longer diagonal marks
// the corner to draw in. Triangle inequality flags an impossible measurement.
// dims: in { side_a: L, side_b: L, diag1: L, diag2: L } out: { ideal_diagonal: L, out_of_square: L, triple_a: L, triple_b: L, triple_c: L }
export function computeLayoutSquaring({ mode, side_a, side_b, diag1, diag2 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const a = Number(side_a) || 0;
  const b = Number(side_b) || 0;
  if (!(a > 0)) return { error: "Side a must be greater than zero." };
  if (!(b > 0)) return { error: "Side b must be greater than zero." };
  const ideal = Math.sqrt(a * a + b * b);
  if (!Number.isFinite(ideal)) return { error: "Ideal diagonal is not finite." };
  if (mode === "check-square") {
    const d1 = Number(diag1) || 0;
    const d2 = Number(diag2) || 0;
    if (!(d1 > 0)) return { error: "Measured diagonal 1 must be greater than zero." };
    if (!(d2 > 0)) return { error: "Measured diagonal 2 must be greater than zero." };
    if (d1 > a + b || d2 > a + b) return { error: "A measured diagonal exceeds side a + side b (impossible for a quadrilateral with these sides)." };
    const out_of_square = Math.abs(d1 - d2);
    const corner = d1 === d2 ? "square (diagonals equal)" : (d1 > d2 ? "shorten toward the diagonal-1 corner" : "shorten toward the diagonal-2 corner");
    return {
      mode: "check-square",
      ideal_diagonal: Number.isFinite(ideal) ? ideal : null,
      out_of_square: Number.isFinite(out_of_square) ? out_of_square : null,
      diag1_diff_from_ideal: Number.isFinite(d1 - ideal) ? d1 - ideal : null,
      diag2_diff_from_ideal: Number.isFinite(d2 - ideal) ? d2 - ideal : null,
      corner_to_draw_in: corner,
      note: "A layout aid, not a substitute for a transit or string-line. Equal diagonals indicate a square (rectangular) layout.",
    };
  }
  // find-diagonal (default)
  const shortSide = Math.min(a, b);
  const longSide = Math.max(a, b);
  const n = Math.max(1, Math.floor(Math.min(shortSide / 3, longSide / 4)));
  return {
    mode: "find-diagonal",
    ideal_diagonal: Number.isFinite(ideal) ? ideal : null,
    triple_a: 3 * n,
    triple_b: 4 * n,
    triple_c: 5 * n,
    triple_multiple: n,
    note: "Mark 3n along one side and 4n along the adjacent side; when the diagonal between the marks reads 5n the corner is square. A layout aid, not a substitute for a transit or string-line.",
  };
}
export const layoutSquaringExample = { inputs: { mode: "find-diagonal", side_a: 3, side_b: 4 } };

function renderLayoutSquaring(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: The Pythagorean 3-4-5 right-angle layout method (public) and the standard foundation and deck squaring technique. A layout aid, not a substitute for a transit or string-line.";
  const mode = makeSelect("Mode", "lsq-mode", [
    { value: "find-diagonal", label: "Find diagonal" }, { value: "check-square", label: "Check square" },
  ]);
  inputRegion.appendChild(mode.wrap);
  const a = makeNumber("Side a", "lsq-a", { step: "any", min: "0", value: "3" });
  a.input.value = "3";
  const b = makeNumber("Side b", "lsq-b", { step: "any", min: "0", value: "4" });
  b.input.value = "4";
  const diagHost = document.createElement("div");
  for (const f of [a, b]) inputRegion.appendChild(f.wrap);
  inputRegion.appendChild(diagHost);
  const oIdeal = makeOutputLine(outputRegion, "Ideal diagonal", "lsq-out-ideal");
  const oTriple = makeOutputLine(outputRegion, "3-4-5 marks", "lsq-out-triple");
  const oOut = makeOutputLine(outputRegion, "Out of square", "lsq-out-oos");
  const oCorner = makeOutputLine(outputRegion, "Adjustment", "lsq-out-corner");
  let d1, d2;
  function readNum(i) { if (!i || i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  function refreshDiag() {
    while (diagHost.firstChild) diagHost.removeChild(diagHost.firstChild);
    d1 = null; d2 = null;
    if (mode.select.value === "check-square") {
      d1 = makeNumber("Measured diagonal 1", "lsq-d1", { step: "any", min: "0" });
      d2 = makeNumber("Measured diagonal 2", "lsq-d2", { step: "any", min: "0" });
      for (const f of [d1, d2]) { diagHost.appendChild(f.wrap); f.input.addEventListener("input", update); }
    }
  }
  function update() {
    const r = computeLayoutSquaring({
      mode: mode.select.value,
      side_a: readNum(a.input),
      side_b: readNum(b.input),
      diag1: d1 ? readNum(d1.input) : 0,
      diag2: d2 ? readNum(d2.input) : 0,
    });
    if (r.error) { oIdeal.textContent = r.error; oTriple.textContent = ""; oOut.textContent = ""; oCorner.textContent = ""; return; }
    oIdeal.textContent = fmt(r.ideal_diagonal, 4);
    if (r.mode === "find-diagonal") {
      oTriple.textContent = fmt(r.triple_a, 2) + " by " + fmt(r.triple_b, 2) + " -> diagonal " + fmt(r.triple_c, 2) + " (n = " + String(r.triple_multiple) + ")";
      oOut.textContent = "(check-square mode reports out-of-square)";
      oCorner.textContent = "";
    } else {
      oTriple.textContent = "(find-diagonal mode reports 3-4-5 marks)";
      oOut.textContent = fmt(r.out_of_square, 4);
      oCorner.textContent = r.corner_to_draw_in;
    }
  }
  mode.select.addEventListener("input", () => { refreshDiag(); update(); });
  attachExampleButton(inputRegion, () => { mode.select.value = "find-diagonal"; refreshDiag(); a.input.value = "3"; b.input.value = "4"; update(); });
  for (const el of [a.input, b.input]) el.addEventListener("input", update);
  refreshDiag();
}
CONSTRUCTION_RENDERERS["layout-squaring"] = renderLayoutSquaring;

// =====================================================================
// spec-v27 Part I - Group E: the welding bench (1 tile)
// Fillet weld strength and size per AWS D1.1 / AISC 360 §J2.
// =====================================================================
import {
  makeNumber as _v27makeNumber, makeSelect as _v27makeSelect,
  makeOutputLine as _v27makeOut, attachExampleButton as _v27attachEx,
  debounce as _v27debounce, DEBOUNCE_MS as _V27_DEB, fmt as _v27fmt,
} from "./ui-fields.js";

const _V27_FEXX = { E60: 60, E70: 70, E80: 80 }; // electrode tensile strength, ksi
// AISC Table J2.4 minimum fillet size (in) by thickness of the thinner part (in).
function _v27MinFillet(t) {
  if (t <= 0.25) return 0.125;       // <= 1/4
  if (t <= 0.5) return 0.1875;       // 1/4 to 1/2
  if (t <= 0.75) return 0.25;        // 1/2 to 3/4
  return 0.3125;                     // > 3/4
}
// AISC §J2.2b maximum fillet size (in) along an edge of the thinner part.
function _v27MaxFillet(t) { return t < 0.25 ? t : t - 0.0625; }

// dims: in { leg_in: L, length_in: L, base_thickness_in: L, applied_load_lb: dimensionless } out: { throat_in: L, strength_per_in_lb: dimensionless, capacity_lb: dimensionless }
export function computeFilletWeldStrength({ mode = "capacity-from-size", leg_in = 0, length_in = 0, electrode = "E70", base_thickness_in = 0, applied_load_lb = 0, method = "ASD" } = {}) {
  const _g = _finiteGuard({ leg_in, length_in, base_thickness_in, applied_load_lb }); if (_g) return _g;
  const Fexx = _V27_FEXX[electrode] || 70;
  const L = Number(length_in);
  const M = String(method) === "LRFD" ? "LRFD" : "ASD";
  // unit shear strength per inch of weld: ASD allowable 0.30*Fexx; LRFD 0.75*0.60*Fexx.
  const stress_ksi = M === "LRFD" ? 0.75 * 0.60 * Fexx : 0.30 * Fexx;

  if (mode === "size-from-load") {
    const load = Number(applied_load_lb);
    if (!(L > 0)) return { error: "Weld length must be positive (in)." };
    if (!(load > 0)) return { error: "Applied load must be positive (lb) for size-from-load." };
    // load = stress_ksi*1000 * 0.707*leg * L  ->  leg = load / (stress_ksi*1000*0.707*L)
    const leg = load / (stress_ksi * 1000 * 0.707 * L);
    const t = Number(base_thickness_in) || 0;
    const minF = t > 0 ? _v27MinFillet(t) : null;
    const maxF = t > 0 ? _v27MaxFillet(t) : null;
    const notes = [M + " basis; required leg sizes the weld for the load only - the connection geometry, base-metal, and matching filler are the engineer's."];
    if (minF !== null && leg < minF) notes.push("Required leg " + _v27fmt(leg, 3) + " in is below the AISC J2.4 minimum (" + _v27fmt(minF, 4) + " in) for the joint; use the minimum.");
    return { mode, method: M, electrode, F_Exx_ksi: Fexx, required_leg_in: leg, length_in: L, min_fillet_in: minF, max_fillet_in: maxF, notes };
  }

  // capacity-from-size
  const leg = Number(leg_in);
  if (!(leg > 0)) return { error: "Fillet leg size must be positive (in)." };
  if (!(L > 0)) return { error: "Weld length must be positive (in)." };
  const throat_in = 0.707 * leg;
  const strength_per_in_lb = stress_ksi * 1000 * throat_in;
  const capacity_lb = strength_per_in_lb * L;
  const t = Number(base_thickness_in) || 0;
  const minF = t > 0 ? _v27MinFillet(t) : null;
  const maxF = t > 0 ? _v27MaxFillet(t) : null;
  let size_ok = null;
  const notes = [M + " basis: unit shear stress " + _v27fmt(stress_ksi, 2) + " ksi (" + electrode + "). The qualified WPS, the weld inspector, and the engineer of record govern."];
  if (minF !== null) {
    size_ok = leg >= minF && leg <= maxF;
    if (leg < minF) notes.push("Fillet leg " + _v27fmt(leg, 4) + " in is below the AISC J2.4 minimum (" + _v27fmt(minF, 4) + " in) for a " + _v27fmt(t, 3) + " in part.");
    else if (leg > maxF) notes.push("Fillet leg " + _v27fmt(leg, 4) + " in exceeds the AISC J2.2b maximum (" + _v27fmt(maxF, 4) + " in) along the edge of a " + _v27fmt(t, 3) + " in part.");
  }
  let utilization = null;
  const load = Number(applied_load_lb) || 0;
  if (load > 0) utilization = load / capacity_lb;
  return { mode, method: M, electrode, F_Exx_ksi: Fexx, throat_in, stress_ksi, strength_per_in_lb, capacity_lb, length_in: L, min_fillet_in: minF, max_fillet_in: maxF, size_in_range: size_ok, utilization, notes };
}

export const filletWeldStrengthExample = { inputs: { mode: "capacity-from-size", leg_in: 0.25, length_in: 6, electrode: "E70", base_thickness_in: 0.5, method: "ASD" } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v27renderFilletWeldStrength(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Fillet-weld effective throat (0.707*leg) and shear strength (allowable 0.30*F_Exx; LRFD 0.75*0.60*F_Exx) per AWS D1.1 Structural Welding Code - Steel and AISC 360 §J2, by name, with the minimum/maximum fillet sizes of AISC Table J2.4 and §J2.2b. The qualified WPS, the weld inspector, and the engineer of record govern; base-metal and matching-filler checks are the engineer's.";
  const mode = _v27makeSelect("Mode", "fws-mode", [
    { value: "capacity-from-size", label: "Capacity from size", selected: true },
    { value: "size-from-load", label: "Size from load" },
  ]);
  const method = _v27makeSelect("Method", "fws-method", [
    { value: "ASD", label: "ASD (allowable)", selected: true },
    { value: "LRFD", label: "LRFD (design)" },
  ]);
  const elec = _v27makeSelect("Electrode", "fws-elec", [
    { value: "E60", label: "E60" }, { value: "E70", label: "E70", selected: true }, { value: "E80", label: "E80" },
  ]);
  const leg = _v27makeNumber("Fillet leg size (in)", "fws-leg", { step: "any", min: "0" });
  const len = _v27makeNumber("Weld length (in)", "fws-len", { step: "any", min: "0" });
  const thk = _v27makeNumber("Thinner part thickness (in, optional)", "fws-thk", { step: "any", min: "0" });
  const load = _v27makeNumber("Applied load (lb, optional)", "fws-load", { step: "any", min: "0" });
  for (const f of [mode, method, elec, leg, len, thk, load]) inputRegion.appendChild(f.wrap);
  _v27attachEx(inputRegion, () => { mode.select.value = "capacity-from-size"; method.select.value = "ASD"; elec.select.value = "E70"; leg.input.value = "0.25"; len.input.value = "6"; thk.input.value = "0.5"; load.input.value = ""; update(); });

  const oThroat = _v27makeOut(outputRegion, "Throat / unit strength", "fws-out-throat");
  const oCap = _v27makeOut(outputRegion, "Capacity / required leg", "fws-out-cap");
  const oRange = _v27makeOut(outputRegion, "AISC min / max fillet", "fws-out-range");
  const oUtil = _v27makeOut(outputRegion, "Utilization", "fws-out-util");
  const oNote = _v27makeOut(outputRegion, "Notes", "fws-out-note");

  const update = _v27debounce(() => {
    const r = computeFilletWeldStrength({
      mode: mode.select.value, method: method.select.value, electrode: elec.select.value,
      leg_in: Number(leg.input.value) || 0, length_in: Number(len.input.value) || 0,
      base_thickness_in: Number(thk.input.value) || 0, applied_load_lb: Number(load.input.value) || 0,
    });
    if (r.error) { oThroat.textContent = r.error; oCap.textContent = "-"; oRange.textContent = "-"; oUtil.textContent = "-"; oNote.textContent = ""; return; }
    if (r.mode === "size-from-load") {
      oThroat.textContent = "(size-from-load)";
      oCap.textContent = "required leg " + _v27fmt(r.required_leg_in, 4) + " in";
    } else {
      oThroat.textContent = "throat " + _v27fmt(r.throat_in, 4) + " in; " + _v27fmt(r.strength_per_in_lb, 0) + " lb/in";
      oCap.textContent = _v27fmt(r.capacity_lb, 0) + " lb (" + _v27fmt(r.capacity_lb / 1000, 2) + " kip)";
    }
    oRange.textContent = r.min_fillet_in !== null ? ("min " + _v27fmt(r.min_fillet_in, 4) + " in, max " + _v27fmt(r.max_fillet_in, 4) + " in") : "(enter part thickness)";
    oUtil.textContent = r.utilization !== null && r.utilization !== undefined ? _v27fmt(r.utilization, 3) : "(enter load)";
    oNote.textContent = r.notes.join(" ");
  }, _V27_DEB);
  for (const f of [leg.input, len.input, thk.input, load.input]) f.addEventListener("input", update);
  for (const f of [mode.select, method.select, elec.select]) f.addEventListener("change", update);
}
CONSTRUCTION_RENDERERS["fillet-weld-strength"] = _v27renderFilletWeldStrength;

// =====================================================================
// spec-v69: Surface prep and coatings (Group E).
// =====================================================================

// --- coating-coverage-dft: Coating Coverage from Volume-Solids and DFT ---
//
// theoretical = 1604 x (vol_solids/100) / dft; practical = theoretical x
// (1 - loss/100); gallons = area / practical; wft = dft / (vol_solids/100).
// 1604 ft^2-mil per gallon at 100% solids is the exact conversion.
// dims: in { vol_solids_pct: dimensionless, dft_mils: L, area_ft2: L^2, loss_pct: dimensionless } out: { theoretical_cov_ft2_gal: L^-1, practical_cov_ft2_gal: L^-1, gallons: L^3, wft_mils: L }
// (Volume-solids and loss are dimensionless percents; the DFT and WFT are
//  lengths L (mils); the coverage is area-per-volume L^-1 and the gallons L^3.)
export function computeCoatingCoverageDft({ vol_solids_pct, dft_mils, area_ft2, loss_pct = 35 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const solids = Number(vol_solids_pct);
  const dft = Number(dft_mils);
  const area = Number(area_ft2);
  const loss = Number(loss_pct);
  if (!Number.isFinite(solids) || solids <= 0 || solids > 100) return { error: "Volume solids must be between 0 and 100 percent." };
  if (!Number.isFinite(dft) || dft <= 0) return { error: "Dry-film thickness must be a positive finite number (mils)." };
  if (!Number.isFinite(area) || area <= 0) return { error: "Area must be a positive finite number (ft^2)." };
  if (!Number.isFinite(loss) || loss < 0 || loss >= 100) return { error: "Loss must be between 0 and 100 percent." };
  const theoreticalCov = 1604 * (solids / 100) / dft;
  const practicalCov = theoreticalCov * (1 - loss / 100);
  const gallons = area / practicalCov;
  const wftMils = dft / (solids / 100);
  if (![theoreticalCov, practicalCov, gallons, wftMils].every(Number.isFinite)) return { error: "Coverage math is not a finite value." };
  return {
    theoretical_cov_ft2_gal: theoreticalCov,
    practical_cov_ft2_gal: practicalCov,
    gallons,
    wft_mils: wftMils,
    note: "1604 is the exact conversion (a gallon spread one mil thick covers 1604 ft^2 at 100% solids). The product data sheet's volume-solids is the governing number and thinning lowers it. The loss factor is the honest difference between theory and the job; 35% spray loss is a default, not a promise. DFT is verified with a gauge per SSPC / AMPP PA 2, not assumed from the WFT. Multiple coats and touch-up are not in this single-coat number.",
  };
}

function _v69renderCoatingCoverageDft(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: SSPC / AMPP PA 2 (dry-film thickness) and the 1604 ft^2-mil/gal coverage constant by name. theoretical = 1604 x volume-solids / DFT; practical applies the loss factor; WFT = DFT / volume-solids. The product data sheet governs.";
  const solids = makeNumber("Volume solids (%, from the data sheet)", "cc-solids", { step: "any", min: "0" });
  const dft = makeNumber("Target dry-film thickness (mils)", "cc-dft", { step: "any", min: "0" });
  const area = makeNumber("Area to coat (ft^2)", "cc-area", { step: "any", min: "0" });
  const loss = makeNumber("Application loss (%, spray ~35)", "cc-loss", { step: "any", min: "0", value: "35" });
  loss.input.value = "35";
  for (const f of [solids, dft, area, loss]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { solids.input.value = "60"; dft.input.value = "5.0"; area.input.value = "2000"; loss.input.value = "35"; update(); });
  const oTheo = makeOutputLine(outputRegion, "Theoretical coverage", "cc-out-theo");
  const oPrac = makeOutputLine(outputRegion, "Practical coverage (after loss)", "cc-out-prac");
  const oGal = makeOutputLine(outputRegion, "Gallons required", "cc-out-gal");
  const oWft = makeOutputLine(outputRegion, "Wet-film thickness to read", "cc-out-wft");
  const update = debounce(() => {
    const r = computeCoatingCoverageDft({ vol_solids_pct: Number(solids.input.value) || 0, dft_mils: Number(dft.input.value) || 0, area_ft2: Number(area.input.value) || 0, loss_pct: loss.input.value === "" ? 35 : Number(loss.input.value) });
    if (r.error) { oTheo.textContent = r.error; for (const o of [oPrac, oGal, oWft]) o.textContent = "-"; return; }
    oTheo.textContent = fmt(r.theoretical_cov_ft2_gal, 1) + " ft^2/gal";
    oPrac.textContent = fmt(r.practical_cov_ft2_gal, 1) + " ft^2/gal";
    oGal.textContent = fmt(r.gallons, 1) + " gal";
    oWft.textContent = fmt(r.wft_mils, 2) + " mils";
  }, DEBOUNCE_MS);
  for (const f of [solids, dft, area, loss]) f.input.addEventListener("input", update);
}
CONSTRUCTION_RENDERERS["coating-coverage-dft"] = _v69renderCoatingCoverageDft;

// --- abrasive-blast: Abrasive Blast Air and Abrasive Consumption ---
//
// Representative nozzle values at 100 psi (the maker's chart governs), scaled
// approximately linearly with pressure. Helpers above the dims block.
const BLAST_NOZZLE = [
  [0.1875, 74, 178], [0.25, 137, 296], [0.3125, 196, 530],
  [0.375, 283, 768], [0.4375, 385, 1032], [0.5, 503, 1320],
];
const _blastNozzle = (bore) => {
  let best = BLAST_NOZZLE[0];
  let bestDiff = Math.abs(bore - best[0]);
  for (const row of BLAST_NOZZLE) {
    const d = Math.abs(bore - row[0]);
    if (d < bestDiff) { best = row; bestDiff = d; }
  }
  return best;
};
// dims: in { nozzle_bore_in: L, pressure_psi: M L^-1 T^-2, area_ft2: L^2, lb_per_ft2: dimensionless } out: { cfm: L^3 T^-1, compressor_hp: dimensionless, abrasive_lb_hr: M T^-1, abrasive_lb: M, abrasive_tons: M }
// (The nozzle bore is a length L; pressure is M L^-1 T^-2; the air-flow is a
//  volume-rate L^3 T^-1; abrasive consumption is a mass-rate M T^-1 and the
//  totals are masses M.)
export function computeAbrasiveBlast({ nozzle_bore_in, pressure_psi = 100, area_ft2, lb_per_ft2 = 8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const bore = Number(nozzle_bore_in);
  const pressure = Number(pressure_psi);
  const area = Number(area_ft2);
  const lbPerFt2 = Number(lb_per_ft2);
  if (!Number.isFinite(bore) || bore <= 0) return { error: "Nozzle bore must be a positive finite number (in)." };
  if (!Number.isFinite(pressure) || pressure <= 0) return { error: "Blast pressure must be a positive finite number (psi)." };
  if (!Number.isFinite(area) || area <= 0) return { error: "Area must be a positive finite number (ft^2)." };
  if (!Number.isFinite(lbPerFt2) || lbPerFt2 <= 0) return { error: "Abrasive consumption per ft^2 must be a positive finite number." };
  const [matchedBore, baseCfm, baseLbHr] = _blastNozzle(bore);
  const scale = pressure / 100;
  const cfm = baseCfm * scale;
  const compressorHp = cfm / 4;
  const abrasiveLbHr = baseLbHr * scale;
  const abrasiveLb = area * lbPerFt2;
  const abrasiveTons = abrasiveLb / 2000;
  if (![cfm, compressorHp, abrasiveLbHr, abrasiveLb, abrasiveTons].every(Number.isFinite)) return { error: "Blast math is not a finite value." };
  return {
    cfm,
    compressor_hp: compressorHp,
    abrasive_lb_hr: abrasiveLbHr,
    abrasive_lb: abrasiveLb,
    abrasive_tons: abrasiveTons,
    matched_bore_in: matchedBore,
    note: "The bundled nozzle values are representative at 100 psi and the nozzle manufacturer's chart is the real source. Pressure scaling is approximate, and nozzle wear opens the bore and runs the numbers up over a shift. The abrasive-per-ft^2 swings widely with the surface, the profile spec, and the abrasive; 8 lb/ft^2 is a heavy-prep default. Blasting is silica / lead / dust-regulated work requiring respiratory protection, containment, and air monitoring per OSHA.",
  };
}

function _v69renderAbrasiveBlast(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: SSPC / AMPP surface-preparation (SP) specifications and the nozzle manufacturer's air / abrasive chart by name. cfm scales from the representative 100 psi value; compressor ~4 cfm per hp; abrasive = area x lb/ft^2. The nozzle chart governs.";
  const bore = makeSelect("Nozzle bore", "ab-bore", [
    { value: "0.1875", label: "3/16 in" }, { value: "0.25", label: "1/4 in" }, { value: "0.3125", label: "5/16 in" },
    { value: "0.375", label: "3/8 in", selected: true }, { value: "0.4375", label: "7/16 in" }, { value: "0.5", label: "1/2 in" },
  ]);
  const pressure = makeNumber("Blast pressure (psi)", "ab-press", { step: "any", min: "0", value: "100" });
  pressure.input.value = "100";
  const area = makeNumber("Area to blast (ft^2)", "ab-area", { step: "any", min: "0" });
  const lbPerFt2 = makeNumber("Abrasive per ft^2 (lb, heavy-prep ~8)", "ab-lb", { step: "any", min: "0", value: "8" });
  lbPerFt2.input.value = "8";
  for (const f of [bore, pressure, area, lbPerFt2]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { bore.select.value = "0.375"; pressure.input.value = "100"; area.input.value = "3000"; lbPerFt2.input.value = "8"; update(); });
  const oCfm = makeOutputLine(outputRegion, "Nozzle air-flow", "ab-out-cfm");
  const oHp = makeOutputLine(outputRegion, "Compressor horsepower", "ab-out-hp");
  const oLbHr = makeOutputLine(outputRegion, "Abrasive consumption", "ab-out-lbhr");
  const oTotal = makeOutputLine(outputRegion, "Total abrasive for the area", "ab-out-total");
  const update = debounce(() => {
    const r = computeAbrasiveBlast({ nozzle_bore_in: Number(bore.select.value), pressure_psi: pressure.input.value === "" ? 100 : Number(pressure.input.value), area_ft2: Number(area.input.value) || 0, lb_per_ft2: lbPerFt2.input.value === "" ? 8 : Number(lbPerFt2.input.value) });
    if (r.error) { oCfm.textContent = r.error; for (const o of [oHp, oLbHr, oTotal]) o.textContent = "-"; return; }
    oCfm.textContent = fmt(r.cfm, 0) + " cfm";
    oHp.textContent = fmt(r.compressor_hp, 1) + " hp";
    oLbHr.textContent = fmt(r.abrasive_lb_hr, 0) + " lb/hr";
    oTotal.textContent = fmt(r.abrasive_lb, 0) + " lb (" + fmt(r.abrasive_tons, 1) + " tons)";
  }, DEBOUNCE_MS);
  bore.select.addEventListener("change", update);
  for (const f of [pressure, area, lbPerFt2]) f.input.addEventListener("input", update);
}
CONSTRUCTION_RENDERERS["abrasive-blast"] = _v69renderAbrasiveBlast;

// =====================================================================
// spec-v94 E - fencing take-off: fence-estimate, post-hole-concrete.
// One of the most common residential/light-commercial take-offs.
// GOVERNANCE.general (layout + concrete arithmetic). posts = sections + 1;
// hole concrete = cylinder less the post displacement; 1728 cu in/cu ft,
// 27 cu ft/cu yd, 0.45/0.60 cu ft bag yields (60/80 lb).
// =====================================================================

// dims: in { length_ft: L, post_spacing_ft: L, rails_per_section: dimensionless, picket_width_in: L, picket_gap_in: L } out: { sections: dimensionless, posts: dimensionless, rails: dimensionless, pickets: dimensionless }
export function computeFenceEstimate({ length_ft = 0, post_spacing_ft = 8, rails_per_section = 2, picket_width_in = 0, picket_gap_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (picket_gap_in < 0) return { error: "Picket gap must be non-negative." };
  if (!(length_ft > 0)) return { error: "Fence run must be positive." };
  if (!(post_spacing_ft > 0)) return { error: "Post spacing must be positive." };
  if (!(rails_per_section > 0)) return { error: "Rails per section must be positive." };
  const sections = Math.ceil(length_ft / post_spacing_ft);
  const posts = sections + 1;
  const rails = sections * rails_per_section;
  const pickets = picket_width_in > 0 ? Math.ceil(length_ft * 12 / (picket_width_in + picket_gap_in)) : null;
  return {
    sections, posts, rails, pickets,
    note: "For a straight run the posts are the sections plus one; every corner, end, and gate post is an extra you add by eye from the layout. Rails are the sections times the rails per section (2 for most privacy and picket fence, 3 for tall or ranch rail). Pickets divide the run by the picket width plus the gap. Add a waste allowance and order full bundles - this is the material count, post-hole-concrete sizes the footing.",
  };
}
const fenceEstimateExample = { inputs: { length_ft: 120, post_spacing_ft: 8, rails_per_section: 3, picket_width_in: 5.5, picket_gap_in: 0.25 } };
const renderFenceEstimate = _simpleRenderer({
  citation: "Citation: Standard fence-layout identities (posts = sections + 1, rails = sections x rails/section, pickets = run / (width + gap)). Field-judgment extras for corners/ends/gates.",
  example: fenceEstimateExample.inputs,
  fields: [
    { key: "length_ft", label: "Fence run (ft)", kind: "number" },
    { key: "post_spacing_ft", label: "Post spacing (ft)", kind: "number", default: 8 },
    { key: "rails_per_section", label: "Rails per section", kind: "number", default: 2 },
    { key: "picket_width_in", label: "Picket width (in, optional)", kind: "number" },
    { key: "picket_gap_in", label: "Picket gap (in)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "s", id: "fe-out-s", label: "Sections", value: (r) => String(r.sections) },
    { key: "p", id: "fe-out-p", label: "Posts", value: (r) => String(r.posts) },
    { key: "r", id: "fe-out-r", label: "Rails", value: (r) => String(r.rails) },
    { key: "k", id: "fe-out-k", label: "Pickets", value: (r) => r.pickets === null ? "-" : String(r.pickets) },
    { key: "n", id: "fe-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFenceEstimate,
});
CONSTRUCTION_RENDERERS["fence-estimate"] = renderFenceEstimate;

// dims: in { num_posts: dimensionless, hole_diameter_in: L, hole_depth_in: L, post_side_in: L, bag_yield_cuft: L^3 } out: { concrete_each_cuft: L^3, total_cuft: L^3, bags: dimensionless }
export function computePostHoleConcrete({ num_posts = 0, hole_diameter_in = 0, hole_depth_in = 0, post_side_in = 0, bag_yield_cuft = 0.45 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (post_side_in < 0) return { error: "Post side must be non-negative." };
  if (!(num_posts > 0)) return { error: "Number of posts must be positive." };
  if (!(hole_diameter_in > 0)) return { error: "Hole diameter must be positive." };
  if (!(hole_depth_in > 0)) return { error: "Hole depth must be positive." };
  if (!(bag_yield_cuft > 0)) return { error: "Bag yield must be positive." };
  const hole_vol_each = Math.PI * Math.pow(hole_diameter_in / 2, 2) * hole_depth_in / 1728;
  const post_displace_each = post_side_in > 0 ? (post_side_in * post_side_in * hole_depth_in) / 1728 : 0;
  const concrete_each = hole_vol_each - post_displace_each;
  if (!(concrete_each > 0)) return { error: "The post is as large as the hole - check the post side and hole diameter." };
  const total_cuft = concrete_each * num_posts;
  return {
    concrete_each_cuft: concrete_each,
    total_cuft,
    total_cuyd: total_cuft / 27,
    bags: Math.ceil(total_cuft / bag_yield_cuft),
    note: "The concrete per hole is the cylinder volume less what the post displaces, so set the post side to net it out. A 60-lb bag yields about 0.45 cu ft and an 80-lb bag about 0.60 cu ft of mixed concrete - match the yield to the bag you buy. The rule of thumb sets the hole depth at about a third of the post's above-grade height and below the frost line, with the diameter about three times the post width. Round bags up and add a bag or two for spillage.",
  };
}
const postHoleConcreteExample = { inputs: { num_posts: 16, hole_diameter_in: 10, hole_depth_in: 30, post_side_in: 3.5, bag_yield_cuft: 0.45 } };
const renderPostHoleConcrete = _simpleRenderer({
  citation: "Citation: Cylinder-volume geometry less post displacement; bagged-concrete yields ~0.45 cu ft (60-lb) / 0.60 cu ft (80-lb). 1728 cu in/cu ft, 27 cu ft/cu yd.",
  example: postHoleConcreteExample.inputs,
  fields: [
    { key: "num_posts", label: "Number of post holes", kind: "number" },
    { key: "hole_diameter_in", label: "Hole diameter (in)", kind: "number" },
    { key: "hole_depth_in", label: "Hole depth (in)", kind: "number" },
    { key: "post_side_in", label: "Square post side (in, optional)", kind: "number" },
    { key: "bag_yield_cuft", label: "Bag yield (cu ft)", kind: "number", default: 0.45 },
  ],
  outputs: [
    { key: "e", id: "phc-out-e", label: "Concrete per hole", value: (r) => fmt(r.concrete_each_cuft, 3) + " cu ft" },
    { key: "t", id: "phc-out-t", label: "Total concrete", value: (r) => fmt(r.total_cuft, 2) + " cu ft (" + fmt(r.total_cuyd, 3) + " cu yd)" },
    { key: "b", id: "phc-out-b", label: "Bags", value: (r) => String(r.bags) },
    { key: "n", id: "phc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePostHoleConcrete,
});
CONSTRUCTION_RENDERERS["post-hole-concrete"] = renderPostHoleConcrete;

// =====================================================================
// spec-v96 E - concrete contraction joints + rebar lap splices:
// control-joint-spacing, rebar-lap-splice. The two pieces of field
// arithmetic a flatwork or concrete crew runs after the take-off.
// control-joint-spacing GOVERNANCE.general (crack-control rule of thumb);
// rebar-lap-splice GOVERNANCE.structural (a splice carries tension).
// ACI 302.1R/360R joint guidance; ACI 318 development-and-splice basis
// (the 40-48 bar-diameter jobsite lap, never less than 12 in). The
// engineer of record and the drawings govern.
// =====================================================================

// dims: in { slab_thickness_in: L, spacing_factor: dimensionless, max_spacing_ft: L, slab_length_ft: L, slab_width_ft: L } out: { spacing_ft: L, depth_in: L, panels: dimensionless, aspect: dimensionless }
export function computeControlJointSpacing({ slab_thickness_in = 0, spacing_factor = 2.5, max_spacing_ft = 18, slab_length_ft = 0, slab_width_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (slab_length_ft < 0 || slab_width_ft < 0) return { error: "Slab dimensions must be non-negative." };
  if (!(slab_thickness_in > 0)) return { error: "Slab thickness must be positive." };
  if (!(spacing_factor > 0)) return { error: "Spacing factor must be positive." };
  if (!(max_spacing_ft > 0)) return { error: "Maximum spacing must be positive." };
  const spacing_ft = Math.min(spacing_factor * slab_thickness_in, max_spacing_ft);
  const depth_in = 0.25 * slab_thickness_in;
  const panels_long = slab_length_ft > 0 ? Math.ceil(slab_length_ft / spacing_ft) : null;
  const panels_wide = slab_width_ft > 0 ? Math.ceil(slab_width_ft / spacing_ft) : null;
  const panels = (panels_long && panels_wide) ? panels_long * panels_wide : null;
  let aspect = null;
  if (panels_long && panels_wide) {
    const a = slab_length_ft / panels_long, b = slab_width_ft / panels_wide;
    aspect = Math.max(a, b) / Math.min(a, b);
  }
  return {
    spacing_ft, depth_in, panels_long, panels_wide, panels, aspect,
    aspect_over: aspect !== null ? aspect > 1.5 : false,
    note: "Cut contraction joints at about two to three times the slab thickness in feet (a 4 in slab joints every 8-12 ft), capped near 15-18 ft so a panel does not crack mid-bay. Keep panels close to square (under about 1.5 to 1) - a long, narrow panel cracks across the middle. Cut at least a quarter of the slab depth, early (within the first few hours). This is a crack-control rule of thumb; the structural drawings govern a designed slab.",
  };
}
const controlJointSpacingExample = { inputs: { slab_thickness_in: 4, spacing_factor: 2.5, max_spacing_ft: 18, slab_length_ft: 40, slab_width_ft: 24 } };
const renderControlJointSpacing = _simpleRenderer({
  citation: "Citation: ACI 302.1R / 360R slab-on-ground joint guidance (by name). Spacing ~ 2-3 ft per inch of thickness (capped); depth >= 1/4 slab; panels kept under ~1.5:1.",
  example: controlJointSpacingExample.inputs,
  fields: [
    { key: "slab_thickness_in", label: "Slab thickness (in)", kind: "number" },
    { key: "spacing_factor", label: "Spacing factor (ft/in)", kind: "number", default: 2.5 },
    { key: "max_spacing_ft", label: "Max spacing (ft)", kind: "number", default: 18 },
    { key: "slab_length_ft", label: "Slab length (ft, optional)", kind: "number" },
    { key: "slab_width_ft", label: "Slab width (ft, optional)", kind: "number" },
  ],
  outputs: [
    { key: "s", id: "cjs-out-s", label: "Joint spacing", value: (r) => fmt(r.spacing_ft, 1) + " ft" },
    { key: "d", id: "cjs-out-d", label: "Saw-cut depth", value: (r) => fmt(r.depth_in, 2) + " in" },
    { key: "p", id: "cjs-out-p", label: "Panel grid", value: (r) => r.panels === null ? "-" : r.panels_long + " x " + r.panels_wide + " = " + r.panels + " panels" },
    { key: "a", id: "cjs-out-a", label: "Aspect ratio", value: (r) => r.aspect === null ? "-" : fmt(r.aspect, 2) + (r.aspect_over ? " (over 1.5 - re-grid)" : " (ok)") },
    { key: "n", id: "cjs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeControlJointSpacing,
});
CONSTRUCTION_RENDERERS["control-joint-spacing"] = renderControlJointSpacing;

const _REBAR_DB_IN = { "#3": 0.375, "#4": 0.5, "#5": 0.625, "#6": 0.75, "#7": 0.875, "#8": 1.0, "#9": 1.128, "#10": 1.270, "#11": 1.410 };
// dims: in { bar_size: dimensionless, lap_factor: dimensionless, min_lap_in: L } out: { db: L, lap_in: L }
export function computeRebarLapSplice({ bar_size = "#5", lap_factor = 48, min_lap_in = 12 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const db = _REBAR_DB_IN[bar_size];
  if (db === undefined) return { error: "Choose a bar size from #3 through #11." };
  if (!(lap_factor > 0)) return { error: "Lap factor must be positive." };
  if (!(min_lap_in > 0)) return { error: "Minimum lap must be positive." };
  const byDiameter = lap_factor * db;
  const lap_in = Math.max(byDiameter, min_lap_in);
  const ft = Math.floor(lap_in / 12);
  const inch = lap_in - ft * 12;
  return {
    db, lap_in, lap_ft: ft, lap_in_rem: inch,
    governed: byDiameter >= min_lap_in ? "bar-diameter multiple" : "minimum lap",
    note: "A tension lap overlaps two bars so the load transfers through the concrete; the field rule is about 40-48 bar diameters for typical Grade 60 bar in 4,000 psi normal-weight concrete (a Class B lap is roughly 1.3 times the development length). Never lap less than 12 in. Epoxy-coated bar, top bars, lightweight concrete, and bars bunched close together all lengthen the lap - treat this as a starting figure and confirm against the structural drawings. Stagger adjacent splices.",
  };
}
const rebarLapSpliceExample = { inputs: { bar_size: "#5", lap_factor: 48, min_lap_in: 12 } };
const renderRebarLapSplice = _simpleRenderer({
  citation: "Citation: ACI 318 development-and-splice basis (Class B tension lap ~1.3 x development length, by name). Field rule 40-48 bar diameters, never less than 12 in.",
  example: rebarLapSpliceExample.inputs,
  fields: [
    { key: "bar_size", label: "Bar size", kind: "select", options: Object.keys(_REBAR_DB_IN).map((k) => ({ value: k, label: k })) },
    { key: "lap_factor", label: "Lap factor (bar diameters)", kind: "number", default: 48 },
    { key: "min_lap_in", label: "Minimum lap (in)", kind: "number", default: 12 },
  ],
  outputs: [
    { key: "d", id: "rls-out-d", label: "Bar diameter", value: (r) => fmt(r.db, 3) + " in" },
    { key: "l", id: "rls-out-l", label: "Lap length", value: (r) => fmt(r.lap_in, 1) + " in (" + r.lap_ft + " ft " + fmt(r.lap_in_rem, 0) + " in)" },
    { key: "g", id: "rls-out-g", label: "Governed by", value: (r) => r.governed },
    { key: "n", id: "rls-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRebarLapSplice,
});
CONSTRUCTION_RENDERERS["rebar-lap-splice"] = renderRebarLapSplice;

// =====================================================================
// spec-v113: guard-handrail-check (Group E) - guard and handrail code check.
// Whether a guard is required (surface over 30 in), the minimum guard height
// (36 in residential / 42 in commercial), the maximum infill opening (4 in
// sphere, 4-3/8 in on the stair triangle), and the 34-38 in stair handrail
// band. IRC R312 / R311.7.8 / IBC 1015; the AHJ governs and a 200 lb load
// applies regardless.
// =====================================================================

// dims: in { occupancy: dimensionless, surface_height_in: L, measured_guard_in: L, measured_infill_gap_in: L, at_stairs: dimensionless, measured_handrail_in: L } out: { min_guard: L, max_infill: L }
export function computeGuardHandrailCheck({ occupancy = "residential", surface_height_in = 0, measured_guard_in = 0, measured_infill_gap_in = 0, at_stairs = "no", measured_handrail_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (surface_height_in < 0 || measured_guard_in < 0 || measured_infill_gap_in < 0 || measured_handrail_in < 0) {
    return { error: "Heights and gaps must be non-negative (in)." };
  }
  const isCommercial = occupancy === "commercial";
  const onStairs = at_stairs === "yes" || at_stairs === true;
  const guard_required = surface_height_in > 30;
  const min_guard = isCommercial ? 42 : 36;
  const max_infill = onStairs ? 4.375 : 4.0;
  const guard_ok = !guard_required || measured_guard_in >= min_guard;
  const infill_ok = measured_infill_gap_in <= max_infill;
  const handrail_ok = !onStairs || (measured_handrail_in >= 34 && measured_handrail_in <= 38);
  const all_pass = guard_ok && infill_ok && handrail_ok;
  return {
    guard_required, min_guard, max_infill, guard_ok, infill_ok, handrail_ok, all_pass,
    load_note: "Guards and handrails must also resist a 200 lb concentrated load applied in any direction at any point (IRC R301.5 / IBC 1607); the AHJ governs.",
    note: "A guard is required where the walking surface is more than 30 in above the grade or floor below. Minimum guard height is 36 in residential (IRC R312.1.2) and 42 in commercial (IBC 1015.3). Infill openings must reject a 4 in sphere (4-3/8 in on the stair side triangle), and a stair handrail sits 34-38 in above the nosings (IRC R311.7.8.1). These are dimensional minimums; the AHJ-adopted code and edition govern, and the assembly must also carry the 200 lb load.",
  };
}
const guardHandrailCheckExample = { inputs: { occupancy: "residential", surface_height_in: 48, measured_guard_in: 36, measured_infill_gap_in: 3.5, at_stairs: "no", measured_handrail_in: 36 } };
const renderGuardHandrailCheck = _simpleRenderer({
  citation: "Citation: IRC R312 (guards) / R311.7.8 (handrails) and IBC 1015 (by section, not reproduced). Guard required over 30 in; 36 in residential / 42 in commercial; 4 in sphere infill (4-3/8 in stair triangle); 34-38 in handrail. A 200 lb load applies regardless; the AHJ governs. Free at codes.iccsafe.org.",
  example: guardHandrailCheckExample.inputs,
  fields: [
    { key: "occupancy", label: "Occupancy", kind: "select", options: [{ value: "residential", label: "Residential (IRC)" }, { value: "commercial", label: "Commercial (IBC)" }] },
    { key: "surface_height_in", label: "Walking-surface height above below (in)", kind: "number", default: 48 },
    { key: "measured_guard_in", label: "Measured guard height (in)", kind: "number", default: 36 },
    { key: "measured_infill_gap_in", label: "Largest infill / baluster gap (in)", kind: "number", default: 3.5 },
    { key: "at_stairs", label: "On a stair?", kind: "select", options: [{ value: "no", label: "No (level run)" }, { value: "yes", label: "Yes (stair)" }] },
    { key: "measured_handrail_in", label: "Measured handrail height (in, stairs)", kind: "number", default: 36 },
  ],
  outputs: [
    { key: "req", id: "ghc-out-req", label: "Guard required", value: (r) => r.guard_required ? "yes (surface over 30 in)" : "no (30 in or less)" },
    { key: "g", id: "ghc-out-g", label: "Guard height", value: (r) => (r.guard_ok ? "ok" : "FAIL") + " (min " + fmt(r.min_guard, 0) + " in)" },
    { key: "i", id: "ghc-out-i", label: "Infill gap", value: (r) => (r.infill_ok ? "ok" : "FAIL") + " (max " + fmt(r.max_infill, 3) + " in)" },
    { key: "h", id: "ghc-out-h", label: "Handrail height", value: (r) => r.handrail_ok ? "ok (34-38 in or n/a)" : "FAIL (needs 34-38 in)" },
    { key: "v", id: "ghc-out-v", label: "Verdict", value: (r) => r.all_pass ? "all checks pass" : "one or more checks fail" },
    { key: "load", id: "ghc-out-load", label: "Load", value: (r) => r.load_note },
    { key: "n", id: "ghc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGuardHandrailCheck,
});
CONSTRUCTION_RENDERERS["guard-handrail-check"] = renderGuardHandrailCheck;

// =====================================================================
// spec-v212..v214 (Group E) - masonry and finish takeoffs the two-tile
// masonry shelf left open: grouted-cell volume, modular coursing,
// wallcovering rolls. First-principles takeoff relations; TMS 602 /
// ACI 530.1, NCMA TEK, BIA Technical Notes, and wallcovering estimating
// practice govern by name.
// =====================================================================

// --- spec-v212: cmu-grout-volume ---
// dims: in { wall_len_ft: L, wall_ht_ft: L, core_spacing_in: L, core_area_in2: L^2, bond_area_in2: L^2 } out: { cores: dimensionless, vert_ft3: L^3, bond_ft3: L^3, total_ft3: L^3, total_yd3: L^3 }
export function computeCmuGroutVolume({ wall_len_ft = 0, wall_ht_ft = 0, core_spacing_in = 0, core_area_in2 = 24, bond_area_in2 = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(wall_len_ft > 0)) return { error: "Wall length must be positive (ft)." };
  if (!(wall_ht_ft > 0)) return { error: "Wall height must be positive (ft)." };
  if (!(core_spacing_in > 0)) return { error: "Core spacing must be positive (in)." };
  if (!(core_area_in2 > 0)) return { error: "Core cross-section must be positive (in^2)." };
  if (bond_area_in2 < 0) return { error: "Bond-beam cross-section must be zero or positive (in^2)." };
  const cores = Math.floor(wall_len_ft * 12 / core_spacing_in) + 1;
  const vert_ft3 = cores * wall_ht_ft * (core_area_in2 / 144);
  const bond_ft3 = wall_len_ft * (bond_area_in2 / 144);
  const total_ft3 = vert_ft3 + bond_ft3;
  const total_yd3 = total_ft3 / 27;
  return {
    cores, vert_ft3, bond_ft3, total_ft3, total_yd3,
    note: "Grouted cores = floor(wall length x 12 / core spacing) + 1 (both ends grouted). Vertical grout = cores x wall height x core cross-section / 144 (in^2 to ft^2). Bond-beam grout = wall length x bond cross-section / 144, one continuous top course (0 for none). Total in ft^3 and cubic yards (/27); order grout with a waste and pump allowance on top. The grouted-cell spacing and the cross-section areas come from the structural drawings and the unit data, and the engineer of record governs the reinforcement - this is a material takeoff, not a structural design.",
  };
}
const cmuGroutVolumeExample = { inputs: { wall_len_ft: 20, wall_ht_ft: 8, core_spacing_in: 24, core_area_in2: 24, bond_area_in2: 30 } };
const renderCmuGroutVolume = _simpleRenderer({
  citation: "Citation: first-principles core-count and grout-volume relations with TMS 602 / ACI 530.1 (Specification for Masonry Structures) and the NCMA TEK grout references (by name). cores = floor(len x 12 / spacing) + 1; vert = cores x ht x area/144; bond = len x area/144; total/27 = yd^3. The EOR governs the reinforcement; this is a material takeoff, not a structural design.",
  example: cmuGroutVolumeExample.inputs,
  fields: [
    { key: "wall_len_ft", label: "Wall length (ft)", kind: "number" },
    { key: "wall_ht_ft", label: "Wall height (ft)", kind: "number" },
    { key: "core_spacing_in", label: "Grouted-core spacing oc (in)", kind: "number" },
    { key: "core_area_in2", label: "Core cross-section (in^2, ~24 for 8 in)", kind: "number", default: 24 },
    { key: "bond_area_in2", label: "Bond-beam cross-section (in^2, 0 = none)", kind: "number", default: 30 },
  ],
  outputs: [
    { key: "c", id: "cgv-out-c", label: "Grouted cores", value: (r) => String(r.cores) },
    { key: "v", id: "cgv-out-v", label: "Vertical grout", value: (r) => _fmtC(r.vert_ft3, 2) + " ft^3" },
    { key: "b", id: "cgv-out-b", label: "Bond-beam grout", value: (r) => _fmtC(r.bond_ft3, 2) + " ft^3" },
    { key: "t", id: "cgv-out-t", label: "Total grout", value: (r) => _fmtC(r.total_ft3, 2) + " ft^3 (" + _fmtC(r.total_yd3, 2) + " yd^3)" },
    { key: "n", id: "cgv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCmuGroutVolume,
});
CONSTRUCTION_RENDERERS["cmu-grout-volume"] = renderCmuGroutVolume;

// --- spec-v213: masonry-coursing ---
// dims: in { target_in: L, unit_in: L, joint_in: L } out: { course_in: L, courses: dimensionless, built_in: L, off_in: L }
export function computeMasonryCoursing({ target_in = 0, unit_in = 7.625, joint_in = 0.375 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(target_in > 0)) return { error: "Target height must be positive (in)." };
  if (!(unit_in > 0)) return { error: "Unit height must be positive (in)." };
  if (!(joint_in > 0)) return { error: "Bed joint must be positive (in)." };
  const course_in = unit_in + joint_in;
  const courses = Math.round(target_in / course_in);
  const built_in = courses * course_in;
  const off_in = target_in - built_in;
  const on_module = Math.abs(off_in) < 0.0625;
  return {
    course_in, courses, built_in, off_in, on_module,
    note: "Course height = unit height + one bed joint (modular defaults: CMU 7.625 + 0.375 = 8.0 in; modular brick 2.25 + 0.4167 = 2.6667 in, so three courses = 8 in). Courses = round(target / course); built height = courses x course; off-module = target minus built (+ means the target sits above the nearest course). On module when |off| < 1/16 in. Off module, the wall top or opening forces a cut course or a fudged joint. The unit and joint dimensions are nominal/modular and the actual product and the mason's joint govern - this is a layout aid, not a stamped elevation.",
  };
}
const masonryCoursingExample = { inputs: { target_in: 96, unit_in: 7.625, joint_in: 0.375 } };
const renderMasonryCoursing = _simpleRenderer({
  citation: "Citation: first-principles coursing relation with the Brick Industry Association (BIA) Technical Notes on modular masonry and the NCMA TEK dimensioning references (by name). course = unit + joint; courses = round(target / course); off = target - courses x course; on module when |off| < 1/16 in. Nominal dimensions; the actual product and the mason's joint govern - a coursing check, not a stamped elevation.",
  example: masonryCoursingExample.inputs,
  fields: [
    { key: "target_in", label: "Height to reach (in)", kind: "number" },
    { key: "unit_in", label: "Unit height (in, CMU 7.625 / brick 2.25)", kind: "number", default: 7.625 },
    { key: "joint_in", label: "Bed joint (in, typ 0.375 / brick 0.4167)", kind: "number", default: 0.375 },
  ],
  outputs: [
    { key: "ci", id: "mco-out-ci", label: "Course height", value: (r) => _fmtC(r.course_in, 4) + " in" },
    { key: "co", id: "mco-out-co", label: "Courses", value: (r) => String(r.courses) },
    { key: "bi", id: "mco-out-bi", label: "Built height", value: (r) => _fmtC(r.built_in, 3) + " in" },
    { key: "m", id: "mco-out-m", label: "Course-out", value: (r) => r.on_module ? "on module (lands on a course)" : "NOT on module - off by " + _fmtC(r.off_in, 3) + " in (cut course or fattened joints)" },
    { key: "n", id: "mco-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMasonryCoursing,
});
CONSTRUCTION_RENDERERS["masonry-coursing"] = renderMasonryCoursing;

// --- spec-v214: wallpaper-rolls ---
// dims: in { perimeter_in: L, height_in: L, roll_width_in: L, roll_len_in: L, repeat_in: L } out: { strips_needed: dimensionless, strip_len_in: L, strips_per_roll: dimensionless, rolls: dimensionless }
export function computeWallpaperRolls({ perimeter_in = 0, height_in = 0, roll_width_in = 0, roll_len_in = 0, repeat_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(perimeter_in > 0)) return { error: "Wall perimeter must be positive (in)." };
  if (!(height_in > 0)) return { error: "Wall height must be positive (in)." };
  if (!(roll_width_in > 0)) return { error: "Roll width must be positive (in)." };
  if (!(roll_len_in > 0)) return { error: "Roll length must be positive (in)." };
  if (repeat_in < 0) return { error: "Pattern repeat must be zero or positive (in)." };
  const strip_len_in = height_in + repeat_in;
  if (strip_len_in > roll_len_in) return { error: "Pattern repeat plus wall height exceeds the roll length - no full strip fits this roll." };
  const strips_needed = Math.ceil(perimeter_in / roll_width_in);
  const strips_per_roll = Math.floor(roll_len_in / strip_len_in);
  const rolls = Math.ceil(strips_needed / strips_per_roll);
  return {
    strips_needed, strip_len_in, strips_per_roll, rolls,
    note: "Strips needed = ceil(perimeter / roll width). Strip length = wall height + one pattern repeat (one repeat wasted per strip to match the run). Strips per roll = floor(roll length / strip length). Rolls = ceil(strips needed / strips per roll). A large repeat drops the strips-per-roll yield and can nearly double the order for the same wall area - the area is identical, the repeat is what costs. The roll dimensions are the product's stated bolt size (single/double/Euro rolls vary), door and window openings are a manual strip credit on the perimeter, and this is a material takeoff, not a hang plan.",
  };
}
const wallpaperRollsExample = { inputs: { perimeter_in: 624, height_in: 108, roll_width_in: 20.5, roll_len_in: 396, repeat_in: 19 } };
const renderWallpaperRolls = _simpleRenderer({
  citation: "Citation: first-principles strips-and-rolls relations with wallcovering industry estimating practice (the strip method and the one-repeat-per-strip waste rule, by name). strips = ceil(perimeter / width); strip length = height + repeat; strips/roll = floor(roll length / strip length); rolls = ceil(strips / strips per roll). Roll dimensions are the product's bolt size; openings are a manual credit - an ordering aid, not an installation layout.",
  example: wallpaperRollsExample.inputs,
  fields: [
    { key: "perimeter_in", label: "Wall run to cover (in, less openings)", kind: "number" },
    { key: "height_in", label: "Wall height (in)", kind: "number" },
    { key: "roll_width_in", label: "Roll width (in, Euro ~20.5 / US ~27)", kind: "number", default: 20.5 },
    { key: "roll_len_in", label: "Roll length (in, Euro single ~396)", kind: "number", default: 396 },
    { key: "repeat_in", label: "Pattern repeat (in, 0 = random)", kind: "number" },
  ],
  outputs: [
    { key: "s", id: "wpr-out-s", label: "Strips needed", value: (r) => String(r.strips_needed) },
    { key: "p", id: "wpr-out-p", label: "Strips per roll", value: (r) => String(r.strips_per_roll) + " (strip " + _fmtC(r.strip_len_in, 0) + " in)" },
    { key: "r", id: "wpr-out-r", label: "Rolls", value: (r) => String(r.rolls) },
    { key: "n", id: "wpr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWallpaperRolls,
});
CONSTRUCTION_RENDERERS["wallpaper-rolls"] = renderWallpaperRolls;

// --- spec-v215..v217 roofing material-takeoff batch (Group E) ---
// The install-side gaps the shingle-only roofing-squares left: the eave ice
// barrier (v215), the metal-panel alternative (v216), and the ridge-cap and
// fastener accessories (v217). Each is a material takeoff, not an installation
// detail. Lazy-loaded, absent from the home first paint.

// --- Utility: Eave Ice-Barrier Membrane Coverage and Rolls (spec-v215) ---

// dims: in { eave_length_ft: L, overhang_in: L, pitch_rise: L, roll_width_in: L, roll_len_ft: L, side_lap_in: L } out: { slope_factor: dimensionless, coverage_in: L, courses: dimensionless, roll_lf: L, rolls: dimensionless }
export function computeIceBarrierCoverage({ eave_length_ft = 0, overhang_in = 0, pitch_rise = 0, roll_width_in = 36, roll_len_ft = 66.7, side_lap_in = 6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(eave_length_ft > 0)) return { error: "Eave length must be positive." };
  if (!(roll_width_in > 0)) return { error: "Roll width must be positive." };
  if (!(roll_len_ft > 0)) return { error: "Roll length must be positive." };
  if (overhang_in < 0) return { error: "Overhang cannot be negative." };
  if (side_lap_in < 0) return { error: "Side lap cannot be negative." };
  if (!(pitch_rise >= 0 && pitch_rise <= 24)) return { error: "Pitch rise must be 0-24 inches per 12." };
  if (side_lap_in >= roll_width_in) return { error: "Side lap must be less than the roll width (no net coverage per course)." };
  // IRC R905.1.2: ice barrier from the eave to 24 in inside the exterior wall
  // line, measured up the slope -> multiply the run by the slope factor.
  const slope_factor = Math.sqrt(pitch_rise * pitch_rise + 144) / 12;
  const coverage_in = (overhang_in + 24) * slope_factor;
  const effective_course = roll_width_in - side_lap_in; // net width each course beyond the first adds
  const courses = coverage_in <= roll_width_in
    ? 1
    : 1 + Math.ceil((coverage_in - roll_width_in) / effective_course);
  const roll_lf = courses * eave_length_ft;
  const rolls = Math.ceil(roll_lf / roll_len_ft);
  return { slope_factor, coverage_in, courses, roll_lf, rolls };
}

export const iceBarrierCoverageExample = {
  inputs: { eave_length_ft: 40, overhang_in: 12, pitch_rise: 4, roll_width_in: 36, roll_len_ft: 66.7, side_lap_in: 6 },
};

const renderIceBarrierCoverage = _simpleRenderer({
  citation: "Citation: IRC R905.1.2 (ice barrier from the eave to 24 in inside the exterior wall line, measured up the slope) and ASTM D1970 self-adhering membrane. slope_factor = sqrt(rise^2 + 144) / 12; coverage = (overhang + 24) * slope_factor; courses = coverage <= roll width ? 1 : 1 + ceil((coverage - roll width) / (roll width - side lap)); rolls = ceil(courses * eave / roll length). Required only where the AHJ has adopted it; valley and low-slope-transition coverage is a separate manual add. A material takeoff, not a flashing plan.",
  example: iceBarrierCoverageExample.inputs,
  fields: [
    { key: "eave_length_ft", label: "Eave run to protect (ft, all eaves)", kind: "number" },
    { key: "overhang_in", label: "Overhang from wall line (in)", kind: "number" },
    { key: "pitch_rise", label: "Pitch rise (in / 12)", kind: "number" },
    { key: "roll_width_in", label: "Roll width (in)", kind: "number", default: 36 },
    { key: "roll_len_ft", label: "Roll length (ft)", kind: "number", default: 66.7 },
    { key: "side_lap_in", label: "Course side lap (in)", kind: "number", default: 6 },
  ],
  outputs: [
    { key: "sf", id: "ibc-out-sf", label: "Slope factor", value: (r) => _fmtC(r.slope_factor, 3) },
    { key: "cov", id: "ibc-out-cov", label: "Coverage up slope (in)", value: (r) => _fmtC(r.coverage_in, 1) },
    { key: "c", id: "ibc-out-c", label: "Courses", value: (r) => String(r.courses) },
    { key: "lf", id: "ibc-out-lf", label: "Membrane (lf)", value: (r) => _fmtC(r.roll_lf, 0) },
    { key: "r", id: "ibc-out-r", label: "Rolls", value: (r) => String(r.rolls) },
  ],
  compute: computeIceBarrierCoverage,
});
CONSTRUCTION_RENDERERS["ice-barrier-coverage"] = renderIceBarrierCoverage;

// --- Utility: Metal Roof Panel and Fastener Takeoff (spec-v216) ---

// dims: in { eave_width_ft: L, panel_length_ft: L, panel_net_in: L, fasteners_per_sq: dimensionless } out: { panels: dimensionless, total_panel_lf: L, plane_area_ft2: L^2, squares: dimensionless, fasteners: dimensionless }
export function computeMetalRoofPanels({ eave_width_ft = 0, panel_length_ft = 0, panel_net_in = 36, fasteners_per_sq = 80 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(eave_width_ft > 0)) return { error: "Eave width must be positive." };
  if (!(panel_length_ft > 0)) return { error: "Panel length must be positive." };
  if (!(panel_net_in > 0)) return { error: "Panel net coverage width must be positive." };
  if (!(fasteners_per_sq > 0)) return { error: "Fasteners per square must be positive." };
  // Panel count turns on the product's net coverage width, not the sheet width.
  const panels = Math.ceil((eave_width_ft * 12) / panel_net_in);
  const total_panel_lf = panels * panel_length_ft;
  // panel_length is the on-slope length, so width x length is slope (plane) area.
  const plane_area_ft2 = eave_width_ft * panel_length_ft;
  const squares = plane_area_ft2 / 100;
  const fasteners = Math.ceil(squares * fasteners_per_sq);
  return { panels, total_panel_lf, plane_area_ft2, squares, fasteners };
}

export const metalRoofPanelsExample = {
  inputs: { eave_width_ft: 40, panel_length_ft: 18, panel_net_in: 36, fasteners_per_sq: 80 },
};

const renderMetalRoofPanels = _simpleRenderer({
  citation: "Citation: Metal Construction Association (MCA) / Metal Roofing Alliance (MRA) install references and manufacturer panel-coverage and fastening charts. panels = ceil(eave width x 12 / net coverage in); plane area = eave width x panel length (on-slope); squares = area / 100; fasteners = ceil(squares x fasteners per square). The net coverage width is the published value (not the overall sheet width); fastener density is the manufacturer's wind-zone pattern (standing seam substitutes concealed clips for exposed screws); per roof plane (double for a symmetric gable). A material takeoff, not a wind-uplift design.",
  example: metalRoofPanelsExample.inputs,
  fields: [
    { key: "eave_width_ft", label: "Eave width, one plane (ft)", kind: "number" },
    { key: "panel_length_ft", label: "Panel length eave-to-ridge (ft)", kind: "number" },
    { key: "panel_net_in", label: "Panel net coverage (in)", kind: "number", default: 36 },
    { key: "fasteners_per_sq", label: "Fasteners / clips per square", kind: "number", default: 80 },
  ],
  outputs: [
    { key: "p", id: "mrp-out-p", label: "Panels", value: (r) => String(r.panels) },
    { key: "lf", id: "mrp-out-lf", label: "Total panel (lf)", value: (r) => _fmtC(r.total_panel_lf, 0) },
    { key: "a", id: "mrp-out-a", label: "Plane area (ft^2)", value: (r) => _fmtC(r.plane_area_ft2, 0) },
    { key: "sq", id: "mrp-out-sq", label: "Squares", value: (r) => _fmtC(r.squares, 1) },
    { key: "f", id: "mrp-out-f", label: "Fasteners", value: (r) => String(r.fasteners) },
  ],
  compute: computeMetalRoofPanels,
});
CONSTRUCTION_RENDERERS["metal-roof-panels"] = renderMetalRoofPanels;

// --- Utility: Ridge / Hip Cap and Roofing-Nail Takeoff (spec-v217) ---

// dims: in { ridge_lf: L, hip_lf: L, cap_lf_per_bundle: L, cap_exposure_in: L, squares: dimensionless, shingles_per_sq: dimensionless, nails_per_shingle: dimensionless, nails_per_lb: dimensionless } out: { cap_len_lf: L, cap_bundles: dimensionless, field_nails: dimensionless, cap_pieces: dimensionless, cap_nails: dimensionless, total_nails: dimensionless, nail_lbs: dimensionless }
export function computeRidgeCapFasteners({ ridge_lf = 0, hip_lf = 0, cap_lf_per_bundle = 20, cap_exposure_in = 5, squares = 0, shingles_per_sq = 64, nails_per_shingle = 4, nails_per_lb = 150 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (ridge_lf < 0) return { error: "Ridge length cannot be negative." };
  if (hip_lf < 0) return { error: "Hip length cannot be negative." };
  if (!(cap_lf_per_bundle > 0)) return { error: "Cap coverage per bundle must be positive." };
  if (!(cap_exposure_in > 0)) return { error: "Cap exposure must be positive." };
  if (!(shingles_per_sq > 0)) return { error: "Shingles per square must be positive." };
  if (!(nails_per_lb > 0)) return { error: "Nails per pound must be positive." };
  if (!(nails_per_shingle >= 2 && nails_per_shingle <= 8)) return { error: "Nails per shingle must be 2-8." };
  if (!(squares >= 0)) return { error: "Squares cannot be negative." };
  const cap_len_lf = ridge_lf + hip_lf;
  if (cap_len_lf === 0 && squares === 0) return { error: "Nothing to order: cap length and field squares are both zero." };
  const cap_bundles = Math.ceil(cap_len_lf / cap_lf_per_bundle);
  // IRC R905.2.6: four nails standard, six in the high-wind / steep rows.
  const field_nails = squares * shingles_per_sq * nails_per_shingle;
  const cap_pieces = Math.ceil((cap_len_lf * 12) / cap_exposure_in);
  const cap_nails = cap_pieces * 2; // two nails per cap piece
  const total_nails = field_nails + cap_nails;
  const nail_lbs = Math.ceil(total_nails / nails_per_lb);
  return { cap_len_lf, cap_bundles, field_nails, cap_pieces, cap_nails, total_nails, nail_lbs };
}

export const ridgeCapFastenersExample = {
  inputs: { ridge_lf: 40, hip_lf: 0, cap_lf_per_bundle: 20, cap_exposure_in: 5, squares: 24, shingles_per_sq: 64, nails_per_shingle: 4, nails_per_lb: 150 },
};

const renderRidgeCapFasteners = _simpleRenderer({
  citation: "Citation: IRC R905.2.6 (asphalt-shingle fastening: four nails standard, six in the high-wind / steep-slope rows) and the manufacturer's application instructions. cap length = ridge + hip; cap bundles = ceil(cap length / lf per bundle); field nails = squares x shingles per square x nails per shingle; cap pieces = ceil(cap length x 12 / exposure); cap nails = 2 per piece; nail lbs = ceil(total nails / nails per pound). The nails-per-shingle and cap coverage per bundle come from the product wrapper and the adopted wind zone (a pre-formed hip/ridge product covers far less than field-cut 3-tab). A material takeoff, not a nailing schedule.",
  example: ridgeCapFastenersExample.inputs,
  fields: [
    { key: "ridge_lf", label: "Ridge length (ft)", kind: "number" },
    { key: "hip_lf", label: "Hip length (ft)", kind: "number" },
    { key: "cap_lf_per_bundle", label: "Cap coverage per bundle (lf)", kind: "number", default: 20 },
    { key: "cap_exposure_in", label: "Cap exposure (in)", kind: "number", default: 5 },
    { key: "squares", label: "Field squares", kind: "number" },
    { key: "shingles_per_sq", label: "Field shingles per square", kind: "number", default: 64 },
    { key: "nails_per_shingle", label: "Nails per shingle (4 / 6 high-wind)", kind: "number", default: 4 },
    { key: "nails_per_lb", label: "Roofing nails per pound", kind: "number", default: 150 },
  ],
  outputs: [
    { key: "cb", id: "rcf-out-cb", label: "Cap bundles", value: (r) => String(r.cap_bundles) },
    { key: "fn", id: "rcf-out-fn", label: "Field nails", value: (r) => String(r.field_nails) },
    { key: "cn", id: "rcf-out-cn", label: "Cap nails", value: (r) => String(r.cap_nails) },
    { key: "tn", id: "rcf-out-tn", label: "Total nails", value: (r) => String(r.total_nails) },
    { key: "lb", id: "rcf-out-lb", label: "Nail weight (lb)", value: (r) => String(r.nail_lbs) },
  ],
  compute: computeRidgeCapFasteners,
});
CONSTRUCTION_RENDERERS["ridge-cap-fasteners"] = renderRidgeCapFasteners;

// ===================== spec-v224: roof rain load and ponding head (ASCE 7 Ch. 8) =====================

// dims: in { static_head_in: L, hydraulic_head_in: L, roof_area_ft2: L^2, rainfall_in_hr: L T^-1 } out: { rain_load_psf: M L^-1 T^-2, design_flow_gpm: L^3 T^-1 }
export function computeRainLoadPonding({ static_head_in = 0, hydraulic_head_in = 0, roof_area_ft2 = 0, rainfall_in_hr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (static_head_in < 0 || hydraulic_head_in < 0) return { error: "Head cannot be negative (in)." };
  if (roof_area_ft2 < 0) return { error: "Roof area cannot be negative (ft^2)." };
  if (rainfall_in_hr < 0) return { error: "Rainfall cannot be negative (in/hr)." };
  const rain_load_psf = 5.2 * (static_head_in + hydraulic_head_in);
  const design_flow_gpm = roof_area_ft2 > 0 && rainfall_in_hr > 0
    ? 0.0104 * roof_area_ft2 * rainfall_in_hr
    : null;
  return {
    rain_load_psf, design_flow_gpm,
    note: "ASCE 7 Ch. 8: rain load R = 5.2 x (ds + dh), where ds is the static head to the secondary (overflow) inlet and dh is the hydraulic head above it at design flow (5.2 psf per inch of water). The hydraulic head dh comes from the secondary drain or scupper's flow capacity at the design flow (a manufacturer or weir relation, entered here, not a bundled chart). The optional design flow Q = 0.0104 x area x rainfall (IPC) uses the 100-year hourly intensity for the site. A roof too flexible to shed the water must also pass the ASCE 7 §8.4 ponding-instability check. A load and flow aid, not a stamped roof-drainage design.",
  };
}
const rainLoadPondingExample = { inputs: { static_head_in: 2, hydraulic_head_in: 1, roof_area_ft2: 2000, rainfall_in_hr: 3 } };
CONSTRUCTION_RENDERERS["rain-load-ponding"] = _simpleRenderer({
  citation: "Citation: ASCE 7 Ch. 8 rain load R = 5.2 x (ds + dh), the static head ds to the secondary inlet plus the hydraulic head dh above it at design flow, and the IPC roof-drainage design flow Q = 0.0104 x area x rainfall (by name). The hydraulic head comes from the secondary drain/scupper capacity; the design rainfall is the 100-year hourly intensity. A flat roof must also pass the §8.4 ponding-instability check. A load and flow aid, not a stamped design.",
  example: rainLoadPondingExample.inputs,
  fields: [
    { key: "static_head_in", label: "Static head to secondary inlet ds (in)", kind: "number" },
    { key: "hydraulic_head_in", label: "Hydraulic head at design flow dh (in)", kind: "number" },
    { key: "roof_area_ft2", label: "Tributary roof area (ft^2, optional)", kind: "number", default: 0 },
    { key: "rainfall_in_hr", label: "Design rainfall (in/hr, optional)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "r", id: "rlp-out-r", label: "Rain load", value: (r) => _fmtC(r.rain_load_psf, 1) + " psf" },
    { key: "q", id: "rlp-out-q", label: "Design flow to secondary", value: (r) => r.design_flow_gpm === null ? "enter roof area + rainfall" : _fmtC(r.design_flow_gpm, 1) + " gpm" },
    { key: "n", id: "rlp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRainLoadPonding,
});

// ===================== spec-v225: ASCE 7 ASD load combinations =====================

// dims: in { dead_psf: M L^-1 T^-2, live_psf: M L^-1 T^-2, snow_psf: M L^-1 T^-2, wind_psf: M L^-1 T^-2 } out: { governing_gravity_psf: M L^-1 T^-2, controlling_case_psf: M L^-1 T^-2, net_uplift_psf: M L^-1 T^-2 }
export function computeAsce7LoadCombinations({ dead_psf = 0, live_psf = 0, snow_psf = 0, wind_psf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (dead_psf < 0) return { error: "Dead load cannot be negative (psf)." };
  if (live_psf < 0) return { error: "Live load cannot be negative (psf)." };
  if (snow_psf < 0) return { error: "Roof (snow/rain) load cannot be negative (psf)." };
  const combos = [
    dead_psf,
    dead_psf + live_psf,
    dead_psf + snow_psf,
    dead_psf + 0.75 * live_psf + 0.75 * snow_psf,
    dead_psf + 0.6 * wind_psf,
    dead_psf + 0.75 * live_psf + 0.75 * 0.6 * wind_psf + 0.75 * snow_psf,
    0.6 * dead_psf + 0.6 * wind_psf,
  ];
  const governing_gravity_psf = Math.max(...combos);
  const controlling_case_psf = Math.min(...combos);
  const net_uplift_psf = controlling_case_psf < 0 ? -controlling_case_psf : 0;
  return {
    combos, governing_gravity_psf, controlling_case_psf, net_uplift_psf,
    note: "ASCE 7 §2.4.1 basic ASD load combinations: D; D+L; D+(Lr or S or R); D+0.75L+0.75(Lr or S or R); D+0.6W; D+0.75L+0.75(0.6W)+0.75(Lr or S or R); 0.6D+0.6W. The governing gravity demand is the largest (it sizes the member); a controlling case below zero is a net uplift the connection must resist. Wind is signed: positive downward, negative uplift. The roof load entered as snow stands in for the governing of roof-live / snow / rain; the dead in the 0.6D combinations is the reliably-present dead only. The basic ASD set (seismic E and the LRFD strength set are separate). A load-combination aid, not a member design.",
  };
}
const asce7LoadCombinationsExample = { inputs: { dead_psf: 15, live_psf: 0, snow_psf: 30, wind_psf: -25 } };
CONSTRUCTION_RENDERERS["asce7-load-combinations"] = _simpleRenderer({
  citation: "Citation: ASCE 7 §2.4.1 basic ASD load combinations (D; D+L; D+(Lr or S or R); D+0.75L+0.75(Lr or S or R); D+0.6W; D+0.75L+0.75(0.6W)+0.75(Lr or S or R); 0.6D+0.6W), by name. The governing gravity demand sizes the member; a controlling case below zero is a net uplift. Wind is signed (+ down, - uplift). Basic ASD set only. A load-combination aid, not a member design.",
  example: asce7LoadCombinationsExample.inputs,
  fields: [
    { key: "dead_psf", label: "Dead load D (psf)", kind: "number" },
    { key: "live_psf", label: "Floor live load L (psf)", kind: "number", default: 0 },
    { key: "snow_psf", label: "Roof load Lr/S/R (psf)", kind: "number", default: 0 },
    { key: "wind_psf", label: "Wind load W (psf, + down / - uplift)", kind: "number", default: 0, attrs: { step: "any" } },
  ],
  outputs: [
    { key: "g", id: "alc-out-g", label: "Governing gravity demand", value: (r) => _fmtC(r.governing_gravity_psf, 2) + " psf" },
    { key: "u", id: "alc-out-u", label: "Net uplift", value: (r) => r.net_uplift_psf > 0 ? _fmtC(r.net_uplift_psf, 2) + " psf (resist)" : "none" },
    { key: "m", id: "alc-out-m", label: "Controlling (min) case", value: (r) => _fmtC(r.controlling_case_psf, 2) + " psf" },
    { key: "c", id: "alc-out-c", label: "All 7 combinations (psf)", value: (r) => r.combos.map((c) => _fmtC(c, 2)).join(", ") },
    { key: "n", id: "alc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAsce7LoadCombinations,
});

// ===================== spec-v226: seismic base shear (ASCE 7 §12.8 ELF) =====================

// dims: in { weight_kip: M L T^-2, sds: dimensionless, sd1: dimensionless, r_factor: dimensionless, ie: dimensionless, period_s: T } out: { cs: dimensionless, base_shear_kip: M L T^-2 }
export function computeSeismicBaseShear({ weight_kip = 0, sds = 0, sd1 = 0, r_factor = 0, ie = 1.0, period_s = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(weight_kip > 0)) return { error: "Seismic weight must be positive (kips)." };
  if (!(sds > 0)) return { error: "SDS must be positive (g)." };
  if (!(r_factor > 0)) return { error: "Response-modification factor R must be positive." };
  if (!(period_s > 0)) return { error: "Fundamental period must be positive (s)." };
  if (!(ie >= 1.0 && ie <= 1.5)) return { error: "Importance factor Ie must be 1.0 to 1.5." };
  const r_over_ie = r_factor / ie;
  const cs_basic = sds / r_over_ie;
  const cs_cap = sd1 / (period_s * r_over_ie);
  const cs_min = Math.max(0.044 * sds * ie, 0.01);
  const cs = Math.max(cs_min, Math.min(cs_basic, cs_cap));
  const base_shear_kip = cs * weight_kip;
  const governing = cs === cs_min ? "code minimum" : (cs_cap < cs_basic ? "period cap (T <= TL)" : "basic Cs");
  return {
    cs_basic, cs_cap, cs_min, cs, base_shear_kip, governing,
    note: "ASCE 7 §12.8 equivalent lateral force: Cs = SDS / (R / Ie), capped at SD1 / (T x (R / Ie)) for T <= TL, with the minimum max(0.044 x SDS x Ie, 0.01); the base shear V = Cs x W. SDS and SD1 are the site's design spectral accelerations from the USGS seismic design maps (entered, not a bundled hazard map); R is from ASCE 7 Table 12.2-1 for the chosen lateral system; the long-period transition TL is assumed not to govern. The equivalent-lateral-force base shear for a regular building, not a modal or response-history analysis and not the vertical distribution. A licensed engineer governs.",
  };
}
const seismicBaseShearExample = { inputs: { weight_kip: 200, sds: 1.0, sd1: 0.6, r_factor: 6.5, ie: 1.0, period_s: 0.3 } };
CONSTRUCTION_RENDERERS["seismic-base-shear"] = _simpleRenderer({
  citation: "Citation: ASCE 7 §12.8 equivalent lateral force Cs = SDS / (R / Ie), capped at SD1 / (T x (R / Ie)) for T <= TL, minimum max(0.044 x SDS x Ie, 0.01), base shear V = Cs x W (by name). SDS / SD1 are from the USGS seismic design maps; R is from Table 12.2-1. The ELF base shear for a regular building, not a modal analysis. A licensed engineer governs.",
  example: seismicBaseShearExample.inputs,
  fields: [
    { key: "weight_kip", label: "Seismic weight W (kips)", kind: "number" },
    { key: "sds", label: "SDS, short-period (g)", kind: "number" },
    { key: "sd1", label: "SD1, 1-second (g)", kind: "number" },
    { key: "r_factor", label: "Response-modification factor R", kind: "number" },
    { key: "ie", label: "Importance factor Ie (1.0-1.5)", kind: "number", default: 1.0 },
    { key: "period_s", label: "Fundamental period Ta (s)", kind: "number" },
  ],
  outputs: [
    { key: "cs", id: "sbs-out-cs", label: "Seismic response coefficient Cs", value: (r) => _fmtC(r.cs, 4) },
    { key: "v", id: "sbs-out-v", label: "Base shear V", value: (r) => _fmtC(r.base_shear_kip, 1) + " kips" },
    { key: "g", id: "sbs-out-g", label: "Governed by", value: (r) => r.governing },
    { key: "d", id: "sbs-out-d", label: "Cs basic / cap / min", value: (r) => _fmtC(r.cs_basic, 4) + " / " + _fmtC(r.cs_cap, 4) + " / " + _fmtC(r.cs_min, 4) },
    { key: "n", id: "sbs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSeismicBaseShear,
});
