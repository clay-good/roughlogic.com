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

// wind-speed-from-velocity-pressure: inverse of wind-pressure's base velocity
// pressure. The forward tile gives q = 0.00256 V^2 (before the Kz/Kzt/Kd/G/Cp
// factors); backing out the equivalent basic wind speed from a bare velocity
// pressure is the inverse: V = sqrt(q / 0.00256). This inverts the VELOCITY
// pressure, not a Cp-loaded design surface pressure.
// dims: in { velocity_pressure_psf: M L^-1 T^-2 } out: { wind_speed_mph: L T^-1 }
export function computeWindSpeedFromVelocityPressure({ velocity_pressure_psf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const q = Number(velocity_pressure_psf) || 0;
  if (!(q > 0)) return { error: "Velocity pressure must be positive (psf)." };
  const wind_speed_mph = Math.sqrt(q / 0.00256);
  return {
    wind_speed_mph,
    note: "The equivalent basic wind speed behind a velocity pressure: V = sqrt(q / 0.00256), the ASCE 7 q = 0.00256 V^2 relation solved for V. Enter the BARE velocity pressure q (psf); this is not a Cp-loaded surface design pressure -- to work back from a component/cladding or MWFRS design pressure, first divide out the exposure/height Kz, topographic Kzt, directionality Kd, gust G, and pressure Cp factors to recover q. Useful to read the wind speed a rated q corresponds to, or to sanity-check a q against the site basic wind speed. A design aid; ASCE 7 and the engineer of record govern.",
  };
}
export const windSpeedFromVelocityPressureExample = { inputs: { velocity_pressure_psf: 25 } };
function renderWindSpeedFromVelocityPressure(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASCE 7 velocity pressure q = 0.00256 V^2 (V mph, q psf) solved for the wind speed, V = sqrt(q / 0.00256). Enter the bare velocity pressure, not a Cp-loaded design surface pressure. A design aid; ASCE 7 and the engineer of record govern.";
  const q = makeNumber("Velocity pressure q (psf)", "wsv-q", { step: "any", min: "0", value: "25" });
  q.input.value = "25";
  inputRegion.appendChild(q.wrap);
  attachExampleButton(inputRegion, () => { q.input.value = "25"; update(); });
  const oV = makeOutputLine(outputRegion, "Equivalent basic wind speed", "wsv-out-v");
  const oN = makeOutputLine(outputRegion, "Note", "wsv-out-n");
  const update = debounce(() => {
    const r = computeWindSpeedFromVelocityPressure({ velocity_pressure_psf: Number(q.input.value) || 0 });
    if (r.error) { oV.textContent = r.error; oN.textContent = "-"; return; }
    oV.textContent = fmt(r.wind_speed_mph, 1) + " mph";
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  q.input.addEventListener("input", update);
}

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

// --- asphalt-paving-speed: Asphalt Paver Speed and Production Rate (spec-v811) ---
//
// tons/hr = speed x eff_min x width x (depth/12) x density / 2000;
// lane_ft/hr = speed x eff_min; daily = hourly x hours.
// dims: in { speed_fpm: L T^-1, width_ft: L, depth_in: L, density_pcf: M L^-3, eff_min_per_hr: T, hours_per_day: T } out: { tons_per_hour: M T^-1, lane_ft_per_hour: L T^-1, daily_tons: M, daily_lane_ft: L }
// (Paver speed is L T^-1; width and depth L; compacted density M L^-3; the
//  working-minutes and day-hours T; both hourly figures are rates and the daily
//  figures a mass M and a length L, with the "per hour" implicit.)
export function computeAsphaltPavingSpeed({ speed_fpm = 0, width_ft = 0, depth_in = 0, density_pcf = 145, eff_min_per_hr = 50, hours_per_day = 8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(speed_fpm > 0)) return { error: "Paver speed must be positive (ft/min)." };
  if (!(width_ft > 0)) return { error: "Mat width must be positive (ft)." };
  if (!(depth_in > 0)) return { error: "Mat depth must be positive (in)." };
  if (!(density_pcf > 0)) return { error: "Density must be positive (pcf)." };
  if (!(eff_min_per_hr > 0)) return { error: "Working minutes per hour must be positive." };
  if (!(hours_per_day > 0)) return { error: "Hours per day must be positive." };
  const lane_ft_per_hour = speed_fpm * eff_min_per_hr;
  const tons_per_hour = lane_ft_per_hour * width_ft * (depth_in / 12) * density_pcf / 2000;
  const daily_tons = tons_per_hour * hours_per_day;
  const daily_lane_ft = lane_ft_per_hour * hours_per_day;
  if (![lane_ft_per_hour, tons_per_hour, daily_tons, daily_lane_ft].every(Number.isFinite)) return { error: "Production math is not a finite value." };
  return {
    tons_per_hour,
    lane_ft_per_hour,
    daily_tons,
    daily_lane_ft,
    note: "The compacted HMA density (typically ~145 pcf for a dense-graded mix) and the laydown temperature govern the real tonnage. The 50-minute hour is a planning default, not a guarantee. To keep the paver moving without starving the hopper or stacking trucks, match the forward speed to the plant delivery: required speed = delivery rate / tons per lane-foot / working minutes.",
  };
}

export const asphaltPavingSpeedExample = { inputs: { speed_fpm: 20, width_ft: 12, depth_in: 2, density_pcf: 145, eff_min_per_hr: 50, hours_per_day: 8 } };

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
  makeTextarea,
} from "./ui-fields.js";

function _simpleRenderer(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    _aeC(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = _msC(f.label, f.id || f.key, f.options);
      else field = _mnC(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
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

const renderAsphaltPavingSpeed = _simpleRenderer({
  citation: "Citation: paving production identity by name. tons/hr = speed x working-minutes x width x depth x compacted density over the ton (2000 lb); lane-ft/hr = speed x working-minutes.",
  example: asphaltPavingSpeedExample.inputs,
  fields: [
    { key: "speed_fpm", label: "Paver forward speed (ft/min)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "width_ft", label: "Mat / screed width (ft)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "depth_in", label: "Compacted mat thickness (in)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "density_pcf", label: "Compacted HMA density (pcf)", kind: "number", default: 145 },
    { key: "eff_min_per_hr", label: "Working minutes per hour", kind: "number", default: 50 },
    { key: "hours_per_day", label: "Productive hours per day", kind: "number", default: 8 },
  ],
  outputs: [
    { key: "tph", id: "aps-out-tph", label: "Production", value: (r) => _fmtC(r.tons_per_hour, 1) + " tons/hr" },
    { key: "lph", id: "aps-out-lph", label: "Lane feet per hour", value: (r) => _fmtC(r.lane_ft_per_hour, 0) + " lane-ft/hr" },
    { key: "dt", id: "aps-out-dt", label: "Daily tonnage", value: (r) => _fmtC(r.daily_tons, 0) + " tons/day" },
    { key: "dl", id: "aps-out-dl", label: "Daily lane feet", value: (r) => _fmtC(r.daily_lane_ft, 0) + " lane-ft/day" },
    { key: "n", id: "aps-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAsphaltPavingSpeed,
});

// --- asphalt-tack-coat-quantity: Asphalt Tack / Prime Coat Quantity (spec-v815) ---
//
// The DOT spec sets a RESIDUAL rate (asphalt left after the water breaks) but the
// truck meters EMULSION; the residue fraction grosses the residual up to the order.
// dims: in { area_sf: L^2, residual_rate_gal_sy: L, residue_pct: dimensionless } out: { area_sy: L^2, undiluted_gal_sy: L, emulsion_gallons: L^3, residual_gallons: L^3 }
export function computeAsphaltTackCoatQuantity({ area_sf = 0, residual_rate_gal_sy = 0.04, residue_pct = 60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(area_sf > 0)) return { error: "Area must be positive (ft^2)." };
  if (!(residual_rate_gal_sy > 0)) return { error: "Residual application rate must be positive (gal/sy)." };
  if (!(residue_pct > 0) || residue_pct > 100) return { error: "Residue must be between 0 and 100 percent." };
  const area_sy = area_sf / 9;
  const undiluted_gal_sy = residual_rate_gal_sy / (residue_pct / 100);
  const emulsion_gallons = undiluted_gal_sy * area_sy;
  const residual_gallons = residual_rate_gal_sy * area_sy;
  if (![area_sy, undiluted_gal_sy, emulsion_gallons, residual_gallons].every(Number.isFinite)) return { error: "Coverage math is not a finite value." };
  return {
    area_sy,
    undiluted_gal_sy,
    emulsion_gallons,
    residual_gallons,
    note: "The DOT specification or the engineer sets the residual application rate (typically 0.02-0.08 gal/sy for tack, higher for prime). The emulsion residue fraction (roughly 0.55-0.65 for common SS / CSS grades) comes from the supplier's data sheet - it grosses the order up above the residual figure. The sprayed rate governs bond: too much tack bleeds and slips, too little delaminates.",
  };
}
export const asphaltTackCoatQuantityExample = { inputs: { area_sf: 10000, residual_rate_gal_sy: 0.04, residue_pct: 60 } };
const _v815renderAsphaltTackCoatQuantity = _simpleRenderer({
  citation: "Citation: coverage identity by name. emulsion gallons = area / 9 (sy) x residual rate / residue fraction; residual gallons = area / 9 x residual rate. The DOT spec sets the residual rate; the supplier's data sheet sets the residue fraction.",
  example: asphaltTackCoatQuantityExample.inputs,
  fields: [
    { key: "area_sf", label: "Area to shoot (ft^2)", kind: "number" },
    { key: "residual_rate_gal_sy", label: "Residual application rate (gal/sy)", kind: "number", default: 0.04 },
    { key: "residue_pct", label: "Emulsion asphalt residue (%)", kind: "number", default: 60 },
  ],
  outputs: [
    { key: "e", id: "atc-out-e", label: "Emulsion to order", value: (r) => _fmtC(r.emulsion_gallons, 1) + " gal (" + _fmtC(r.undiluted_gal_sy, 4) + " gal/sy undiluted)" },
    { key: "r", id: "atc-out-r", label: "Residual asphalt", value: (r) => _fmtC(r.residual_gallons, 1) + " gal" },
    { key: "a", id: "atc-out-a", label: "Area", value: (r) => _fmtC(r.area_sy, 1) + " sy" },
    { key: "n", id: "atc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAsphaltTackCoatQuantity,
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
  "wind-speed-from-velocity-pressure": renderWindSpeedFromVelocityPressure,
  "snow-load": renderSnowLoad,
  "anchor-embedment": renderAnchorEmbedment,
  // v3
  "drywall": renderDrywall,
  "roofing-squares": renderRoofingSquares,
  "asphalt-tonnage": renderAsphaltTonnage,
  "asphalt-paving-speed": renderAsphaltPavingSpeed,
  "asphalt-tack-coat-quantity": _v815renderAsphaltTackCoatQuantity,
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

// dims: in { shaft: dimensionless, target_capacity_lb: M L T^-2, capacity_basis: dimensionless, factor_of_safety: dimensionless } out: { torque_ft_lb: M L^2 T^-2 }
export function computeHelicalPileTorque({ shaft = "1.5_inch_solid", target_capacity_lb = 0, capacity_basis = "allowable", factor_of_safety = 2.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const e = HELICAL_PILE_KT[shaft];
  if (!e) return { error: "Unknown shaft type." };
  const cap = Number(target_capacity_lb) || 0;
  const basis = String(capacity_basis);
  const fs = Number(factor_of_safety) || 0;
  if (!(cap > 0)) return { error: "Target capacity must be positive (lb)." };
  if (basis !== "allowable" && basis !== "ultimate") return { error: "Capacity basis must be allowable or ultimate." };
  if (!(fs >= 1)) return { error: "Factor of safety must be >= 1." };
  // Inverse of ultimate = Kt x torque and allowable = ultimate / FS:
  // ultimate = (basis == allowable ? capacity x FS : capacity); torque = ultimate / Kt.
  const ultimate_lb = basis === "allowable" ? cap * fs : cap;
  const torque_ft_lb = ultimate_lb / e.Kt;
  if (!Number.isFinite(torque_ft_lb) || !(torque_ft_lb > 0)) return { error: "Torque math is not a finite positive value." };
  return {
    torque_ft_lb, ultimate_lb, Kt: e.Kt, description: e.description,
    note: "The installation torque a helical pile must reach to confirm a target capacity, the inverse of the helical-pile tile: from ultimate = Kt x torque and allowable = ultimate / FS, torque = (allowable x FS) / Kt = ultimate / Kt. This is the field-acceptance torque the crew watches on the drive-head gauge as the pile advances; reaching it verifies the correlated capacity. Kt is a shaft-specific empirical torque-to-capacity factor (larger shafts have a lower Kt), and the correlation is an installation check, not a substitute for a load test. The engineer of record specifies the project Kt, the factor of safety, and the acceptance torque; a load test governs the true capacity."
  };
}
export const helicalPileTorqueExample = { inputs: { shaft: "1.5_inch_solid", target_capacity_lb: 22500, capacity_basis: "allowable", factor_of_safety: 2.0 } };

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
  // sling_angle_deg is measured from horizontal (90 deg = vertical pick). Per-leg
  // tension T = W / (n * sin(angle)): at 90 deg this is the vertical W/n, and it
  // diverges as the sling flattens toward horizontal. (A prior sin(angle/2) form
  // gave 1.41*W/n at the vertical default instead of W/n.)
  const theta = sling_angle_deg * Math.PI / 180;
  const per_leg_lb = (Number(load_lb) || 0) / (sling_legs * Math.sin(theta));
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

function renderHelicalPileTorque(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: torque correlation solved for the acceptance torque: torque = (allowable x FS) / Kt = ultimate / Kt, from ultimate = Kt x torque. Kt benchmarks from data/construction/helical-pile-kt.json (manufacturer-attributed). Engineer of record governs the design capacity and acceptance; a load test governs the true capacity.";
  _v7c_attachEx(inputRegion, () => { sh.select.value = "1.5_inch_solid"; cap.input.value = "22500"; basis.select.value = "allowable"; fs.input.value = "2.0"; update(); });
  const sh = _v7c_makeSelect("Shaft type", "hpt-sh", Object.keys(HELICAL_PILE_KT).map((k) => ({ value: k, label: HELICAL_PILE_KT[k].description + " (Kt=" + HELICAL_PILE_KT[k].Kt + ")" })));
  const cap = _v7c_makeNumber("Target capacity (lb)", "hpt-cap", { step: "any", min: "0" });
  const basis = _v7c_makeSelect("Capacity basis", "hpt-basis", [{ value: "allowable", label: "Allowable (design)" }, { value: "ultimate", label: "Ultimate" }]);
  const fs = _v7c_makeNumber("Factor of safety", "hpt-fs", { step: "any", min: "1" });
  fs.input.value = "2.0";
  for (const f of [sh, cap, basis, fs]) inputRegion.appendChild(f.wrap);
  const oT = _v7c_makeOut(outputRegion, "Required installation torque", "hpt-out-t");
  const oN = _v7c_makeOut(outputRegion, "Note", "hpt-out-n");
  const update = _v7c_debounce(() => {
    const r = computeHelicalPileTorque({ shaft: sh.select.value, target_capacity_lb: Number(cap.input.value) || 0, capacity_basis: basis.select.value, factor_of_safety: Number(fs.input.value) || 2.0 });
    if (r.error) { oT.textContent = r.error; oN.textContent = ""; return; }
    oT.textContent = _v7c_fmt(r.torque_ft_lb, 0) + " ft-lb (Kt=" + r.Kt + ", ultimate " + _v7c_fmt(r.ultimate_lb, 0) + " lb)";
    oN.textContent = r.note;
  }, _V7C_DEB);
  for (const f of [sh.select, cap.input, basis.select, fs.input]) f.addEventListener("input", update);
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
CONSTRUCTION_RENDERERS["helical-pile-torque"] = renderHelicalPileTorque;
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

// ===================== spec-v481: stair geometry code check (IBC 1011 / IRC R311) =====================

// dims: in { occupancy: dimensionless, riser_height_in: L, tread_depth_in: L, stair_width_in: L } out: { max_riser: L, min_tread: L, min_width: L, two_r_plus_t: L }
export function computeStairCodeCheck({ occupancy = "commercial", riser_height_in = 0, tread_depth_in = 0, stair_width_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (riser_height_in < 0 || tread_depth_in < 0 || stair_width_in < 0) {
    return { error: "Riser, tread, and width must be non-negative (in)." };
  }
  const isCommercial = occupancy === "commercial";
  // IBC 2021 §1011.5.2 / §1011.2 (commercial) vs IRC 2021 R311.7.5 / R311.7.1 (residential).
  const max_riser = isCommercial ? 7.0 : 7.75;
  const min_riser = isCommercial ? 4.0 : 0;
  const min_tread = isCommercial ? 11.0 : 10.0;
  const min_width = isCommercial ? 44 : 36;
  const riser_ok = riser_height_in <= max_riser && riser_height_in >= min_riser;
  const tread_ok = tread_depth_in >= min_tread;
  const width_ok = stair_width_in >= min_width;
  const two_r_plus_t = 2 * riser_height_in + tread_depth_in;
  const comfort_ok = two_r_plus_t >= 24 && two_r_plus_t <= 25;
  const all_pass = riser_ok && tread_ok && width_ok;
  return {
    max_riser, min_riser, min_tread, min_width, riser_ok, tread_ok, width_ok, two_r_plus_t, comfort_ok, all_pass,
    note: "Dimensional stair limits for the selected occupancy: IBC 2021 §1011.5.2 caps the commercial riser at 7 in (4 in minimum) and floors the tread at 11 in, with §1011.2 requiring 44 in of width (36 in where the occupant load is under 50); IRC 2021 R311.7.5 allows a 7-3/4 in residential riser and a 10 in tread at 36 in of width (R311.7.1). The tread is the horizontal run excluding the nosing. 2R + T between 24 and 25 in is a design comfort rule of thumb, not a code pass/fail. The 3/8 in riser/tread uniformity limit over a flight, the nosing profile, the landings, and winder/spiral geometry are separate checks; the egress width the occupant load requires is the egress-capacity tile. A design aid, not a code-official determination; the AHJ and the adopted code and edition govern.",
  };
}
const stairCodeCheckExample = { inputs: { occupancy: "commercial", riser_height_in: 7, tread_depth_in: 11, stair_width_in: 44 } };
const renderStairCodeCheck = _simpleRenderer({
  citation: "Citation: IBC 2021 §1011.5.2 (commercial riser 4-7 in, tread 11 in min) / §1011.2 (44 in width, 36 in where occupant load under 50) and IRC 2021 R311.7.5 (residential riser 7-3/4 in max, tread 10 in min) / R311.7.1 (36 in width), by section. 2R + T of 24-25 in is a comfort rule of thumb, not code. Uniformity, nosing, landings, and winders are separate checks; the AHJ governs. Free at codes.iccsafe.org.",
  example: stairCodeCheckExample.inputs,
  fields: [
    { key: "occupancy", label: "Occupancy / code", kind: "select", options: [{ value: "commercial", label: "Commercial (IBC)" }, { value: "residential", label: "Residential (IRC)" }] },
    { key: "riser_height_in", label: "Proposed riser height (in)", kind: "number", default: 7 },
    { key: "tread_depth_in", label: "Proposed tread run, no nosing (in)", kind: "number", default: 11 },
    { key: "stair_width_in", label: "Proposed clear stair width (in)", kind: "number", default: 44 },
  ],
  outputs: [
    { key: "r", id: "scc-out-r", label: "Riser height", value: (r) => (r.riser_ok ? "ok" : "FAIL") + " (" + fmt(r.min_riser, 0) + "-" + fmt(r.max_riser, 2) + " in)" },
    { key: "t", id: "scc-out-t", label: "Tread depth", value: (r) => (r.tread_ok ? "ok" : "FAIL") + " (min " + fmt(r.min_tread, 0) + " in)" },
    { key: "w", id: "scc-out-w", label: "Stair width", value: (r) => (r.width_ok ? "ok" : "FAIL") + " (min " + fmt(r.min_width, 0) + " in)" },
    { key: "c", id: "scc-out-c", label: "2R + T comfort", value: (r) => fmt(r.two_r_plus_t, 2) + " in (" + (r.comfort_ok ? "in the 24-25 in band" : "outside the 24-25 in band") + ")" },
    { key: "v", id: "scc-out-v", label: "Verdict", value: (r) => r.all_pass ? "all dimensional checks pass" : "one or more checks fail" },
    { key: "n", id: "scc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeStairCodeCheck,
});
CONSTRUCTION_RENDERERS["stair-code-check"] = renderStairCodeCheck;

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
// spec-v593: defaults and the example fill are the US double-roll bolt
// (27 in x 27 ft = 324 in); the Euro sizes stay named in the labels as the
// alternative. Compute unchanged (inches in, counts out).
const wallpaperRollsExample = { inputs: { perimeter_in: 624, height_in: 108, roll_width_in: 27, roll_len_in: 324, repeat_in: 19 } };
const renderWallpaperRolls = _simpleRenderer({
  citation: "Citation: first-principles strips-and-rolls relations with wallcovering industry estimating practice (the strip method and the one-repeat-per-strip waste rule, by name). strips = ceil(perimeter / width); strip length = height + repeat; strips/roll = floor(roll length / strip length); rolls = ceil(strips / strips per roll). Roll dimensions are the product's bolt size; openings are a manual credit - an ordering aid, not an installation layout.",
  example: wallpaperRollsExample.inputs,
  fields: [
    { key: "perimeter_in", label: "Wall run to cover (in, less openings)", kind: "number" },
    { key: "height_in", label: "Wall height (in)", kind: "number" },
    { key: "roll_width_in", label: "Roll width (in, US ~27 / Euro ~20.5)", kind: "number", default: 27 },
    { key: "roll_len_in", label: "Roll length (in, US double-roll bolt ~324 / Euro single ~396)", kind: "number", default: 324 },
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

// ----- spec-v477: Vertical Distribution of Seismic Forces (ASCE 7-22 12.8.3 / 12.8.4) -----

// dims: in { base_shear_kip: M L T^-2, period_s: T, stories: dimensionless } out: { k: dimensionless, sigma_wh: dimensionless, fx_top_kip: M L T^-2, vx_base_kip: M L T^-2, level_count: dimensionless }
export function computeSeismicVerticalDistribution({ base_shear_kip = 0, period_s = 0, stories = [] } = {}) {
  if (!Array.isArray(stories) || stories.length === 0) return { error: "Provide at least one level: weight_kips,height_ft per line, bottom-up." };
  if (!Number.isFinite(base_shear_kip) || !(base_shear_kip > 0)) return { error: "Base shear V must be positive (kips)." };
  if (!Number.isFinite(period_s) || !(period_s > 0)) return { error: "Fundamental period T must be positive (s)." };
  // ASCE 7 12.8.3: k = 1 at or below 0.5 s, 2 at or above 2.5 s, linear interpolation between.
  const k = period_s <= 0.5 ? 1 : period_s >= 2.5 ? 2 : 1 + (period_s - 0.5) / 2;
  const levels = [];
  let sigma_wh = 0;
  let prev_h = 0;
  for (const s of stories) {
    const w = Number(s.w);
    const h = Number(s.h);
    if (!Number.isFinite(w) || !Number.isFinite(h)) return { error: "All level inputs must be finite numbers." };
    if (!(w > 0)) return { error: "Each level weight must be positive (kips)." };
    if (!(h > prev_h)) return { error: "Level heights must be positive and increase bottom-up (ft from the base)." };
    prev_h = h;
    const wh = w * Math.pow(h, k);
    levels.push({ w, h, wh });
    sigma_wh += wh;
  }
  const per_level = levels.map((l) => {
    const cvx = l.wh / sigma_wh;
    return { w: l.w, h: l.h, cvx, fx_kip: cvx * base_shear_kip };
  });
  // Eq. 12.8-13: the story shear at level x is the sum of the forces at and above it.
  let running = 0;
  for (let i = per_level.length - 1; i >= 0; i--) {
    running += per_level[i].fx_kip;
    per_level[i].vx_kip = running;
  }
  return {
    k, sigma_wh, per_level,
    fx_top_kip: per_level[per_level.length - 1].fx_kip,
    vx_base_kip: per_level[0].vx_kip,
    level_count: per_level.length,
  };
}

export const seismicVerticalDistributionExample = {
  inputs: { base_shear_kip: 200, period_s: 0.4, stories: [{ w: 1000, h: 12 }, { w: 1000, h: 24 }, { w: 800, h: 36 }] },
};

// Custom renderer: V + T + a bottom-up level list (textarea per the check-multiline-inputs rule).
function _renderSeismicVerticalDistribution(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASCE 7-22 12.8.3 vertical distribution, Fx = Cvx x V (Eq. 12.8-11) with Cvx = wx hx^k / Sum(wi hi^k) (Eq. 12.8-12), and 12.8.4 story shear Vx = Sum Fi at and above the level (Eq. 12.8-13). The exponent k = 1 for T at or below 0.5 s, k = 2 at or above 2.5 s, linear interpolation between (the standard also permits k = 2 outright in that band). Weights are the effective seismic weights per 12.7.2; heights are from the base. Assumes the ELF procedure is permitted for the structure (12.6 system and irregularity limits). Feeds the story shear that seismic-story-drift and seismic-pdelta-stability consume. A design aid, not a lateral-analysis substitute; the engineer of record governs.";
  _aeC(inputRegion, () => fillExample(seismicVerticalDistributionExample.inputs));
  const vIn = _mnC("Base shear V (kips)", "svd-v", { step: "any", min: "0" });
  const tIn = _mnC("Fundamental period T (s)", "svd-t", { step: "any", min: "0" });
  const list = makeTextarea("Levels bottom-up: weight(kips),height(ft) per line", "svd-list", { rows: "5" });
  inputRegion.appendChild(vIn.wrap); inputRegion.appendChild(tIn.wrap); inputRegion.appendChild(list.wrap);
  const oK = _moC(outputRegion, "Distribution exponent k", "svd-out-k");
  const oF = _moC(outputRegion, "Level forces Fx, bottom-up (kips)", "svd-out-f");
  const oS = _moC(outputRegion, "Story shears Vx, bottom-up (kips)", "svd-out-s");
  const oC = _moC(outputRegion, "Check", "svd-out-c");
  function fillExample(x) {
    vIn.input.value = x.base_shear_kip;
    tIn.input.value = x.period_s;
    list.input.value = (x.stories || []).map((s) => s.w + "," + s.h).join("\n");
    update();
  }
  const update = _debC(() => {
    const stories = [];
    for (const line of String(list.input.value).split("\n")) {
      const t = line.trim();
      if (!t) continue;
      const parts = t.split(",");
      stories.push({ w: Number(parts[0]), h: Number(parts[1]) });
    }
    const r = computeSeismicVerticalDistribution({ base_shear_kip: Number(vIn.input.value) || 0, period_s: Number(tIn.input.value) || 0, stories });
    if (r.error) { oK.textContent = r.error; oF.textContent = "-"; oS.textContent = "-"; oC.textContent = "-"; return; }
    oK.textContent = _fmtC(r.k, 2);
    oF.textContent = r.per_level.map((l) => _fmtC(l.fx_kip, 1)).join(" / ");
    oS.textContent = r.per_level.map((l) => _fmtC(l.vx_kip, 1)).join(" / ");
    oC.textContent = "Sum Fx = " + _fmtC(r.vx_base_kip, 1) + " kips = V (base story carries the full shear)";
  }, _DC);
  vIn.input.addEventListener("input", update);
  tIn.input.addEventListener("input", update);
  list.input.addEventListener("input", update);
}
CONSTRUCTION_RENDERERS["seismic-vertical-distribution"] = _renderSeismicVerticalDistribution;

// ===================== spec-v480: seismic overturning moment (ASCE 7-22 12.8.5) =====================

// dims: in { base_shear_kip: M L T^-2, period_s: T, stories: dimensionless } out: { k: dimensionless, m_base_kipft: M L^2 T^-2, m_base_reduced_kipft: M L^2 T^-2, level_count: dimensionless }
export function computeSeismicOverturningMoment({ base_shear_kip = 0, period_s = 0, stories = [] } = {}) {
  if (!Array.isArray(stories) || stories.length === 0) return { error: "Provide at least one level: weight_kips,height_ft per line, bottom-up." };
  if (!Number.isFinite(base_shear_kip) || !(base_shear_kip > 0)) return { error: "Base shear V must be positive (kips)." };
  if (!Number.isFinite(period_s) || !(period_s > 0)) return { error: "Fundamental period T must be positive (s)." };
  // ASCE 7 12.8.3: k = 1 at or below 0.5 s, 2 at or above 2.5 s, linear interpolation between.
  const k = period_s <= 0.5 ? 1 : period_s >= 2.5 ? 2 : 1 + (period_s - 0.5) / 2;
  const levels = [];
  let sigma_wh = 0;
  let prev_h = 0;
  for (const s of stories) {
    const w = Number(s.w);
    const h = Number(s.h);
    if (!Number.isFinite(w) || !Number.isFinite(h)) return { error: "All level inputs must be finite numbers." };
    if (!(w > 0)) return { error: "Each level weight must be positive (kips)." };
    if (!(h > prev_h)) return { error: "Level heights must be positive and increase bottom-up (ft from the base)." };
    prev_h = h;
    const wh = w * Math.pow(h, k);
    levels.push({ w, h, wh });
    sigma_wh += wh;
  }
  const per_level = levels.map((l) => ({ h: l.h, fx_kip: (l.wh / sigma_wh) * base_shear_kip }));
  // 12.8.5 overturning: about the base M0 = Sum(Fi hi); about level x, Mx = Sum over i above x of Fi (hi - hx).
  // Report the moment at the base of each level's plane (the base plane at h = 0 first), bottom-up.
  const planes = [0, ...per_level.slice(0, -1).map((p) => p.h)];
  const m_levels_kipft = planes.map((hj) =>
    per_level.filter((p) => p.h > hj).reduce((acc, p) => acc + p.fx_kip * (p.h - hj), 0)
  );
  const m_base_kipft = per_level.reduce((acc, p) => acc + p.fx_kip * p.h, 0);
  const m_base_reduced_kipft = 0.75 * m_base_kipft; // ASCE 7 12.13.4 soil-interface 25% reduction
  return {
    k, per_level, m_levels_kipft, m_base_kipft, m_base_reduced_kipft,
    level_count: per_level.length,
  };
}

export const seismicOverturningMomentExample = {
  inputs: { base_shear_kip: 200, period_s: 0.4, stories: [{ w: 1000, h: 12 }, { w: 1000, h: 24 }, { w: 800, h: 36 }] },
};

// Custom renderer: V + T + a bottom-up level list (textarea per the check-multiline-inputs rule),
// mirroring the sibling seismic-vertical-distribution.
function _renderSeismicOverturningMoment(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASCE 7-22 12.8.5 (Overturning): the structure resists the overturning caused by the 12.8.3 story forces Fx = Cvx V, Cvx = wx hx^k / Sum(wi hi^k), with k = 1 for T at or below 0.5 s, k = 2 at or above 2.5 s, linear between. The base overturning moment M0 = Sum(Fi hi); the moment about level x is Sum over the forces above x of Fi (hi - hx). 12.13.4 permits a 25% reduction of the ELF overturning moment at the soil-foundation interface, reported as the reduced foundation moment. Weights are the effective seismic weights per 12.7.2; V and T come from seismic-base-shear and the distribution. The resisting dead load, the foundation stability ratio, and the shear-wall hold-down design are separate checks. A design aid, not a lateral-analysis substitute; the engineer of record governs.";
  _aeC(inputRegion, () => fillExample(seismicOverturningMomentExample.inputs));
  const vIn = _mnC("Base shear V (kips)", "som-v", { step: "any", min: "0" });
  const tIn = _mnC("Fundamental period T (s)", "som-t", { step: "any", min: "0" });
  const list = makeTextarea("Levels bottom-up: weight(kips),height(ft) per line", "som-list", { rows: "5" });
  inputRegion.appendChild(vIn.wrap); inputRegion.appendChild(tIn.wrap); inputRegion.appendChild(list.wrap);
  const oK = _moC(outputRegion, "Distribution exponent k", "som-out-k");
  const oF = _moC(outputRegion, "Level forces Fx, bottom-up (kips)", "som-out-f");
  const oM = _moC(outputRegion, "Overturning moment about each level, base-up (kip-ft)", "som-out-m");
  const oB = _moC(outputRegion, "Base overturning moment M0 (kip-ft)", "som-out-b");
  const oR = _moC(outputRegion, "Reduced foundation moment, 0.75 M0 (kip-ft)", "som-out-r");
  function fillExample(x) {
    vIn.input.value = x.base_shear_kip;
    tIn.input.value = x.period_s;
    list.input.value = (x.stories || []).map((s) => s.w + "," + s.h).join("\n");
    update();
  }
  const update = _debC(() => {
    const stories = [];
    for (const line of String(list.input.value).split("\n")) {
      const t = line.trim();
      if (!t) continue;
      const parts = t.split(",");
      stories.push({ w: Number(parts[0]), h: Number(parts[1]) });
    }
    const r = computeSeismicOverturningMoment({ base_shear_kip: Number(vIn.input.value) || 0, period_s: Number(tIn.input.value) || 0, stories });
    if (r.error) { oK.textContent = r.error; oF.textContent = "-"; oM.textContent = "-"; oB.textContent = "-"; oR.textContent = "-"; return; }
    oK.textContent = _fmtC(r.k, 2);
    oF.textContent = r.per_level.map((l) => _fmtC(l.fx_kip, 1)).join(" / ");
    oM.textContent = r.m_levels_kipft.map((m) => _fmtC(m, 0)).join(" / ");
    oB.textContent = _fmtC(r.m_base_kipft, 0);
    oR.textContent = _fmtC(r.m_base_reduced_kipft, 0);
  }, _DC);
  vIn.input.addEventListener("input", update);
  tIn.input.addEventListener("input", update);
  list.input.addEventListener("input", update);
}
CONSTRUCTION_RENDERERS["seismic-overturning-moment"] = _renderSeismicOverturningMoment;

// ===================================================================================
// spec-v242..v244 IBC/IPC occupancy trio + spec-v245..v247 cast-in-place concrete
// trio + spec-v251..v253 IBC plan-review trio (Group E). The three code numbers a
// tenant-improvement clears (occupant load -> egress -> fixtures), the three a
// concrete super manages between the takeoff and the finished slab (shore load,
// evaporation, strength gain), and the three every commercial permit set clears
// (allowable area, travel distance, opening protection). Each is a design/takeoff
// aid, not a code-official determination. Lazy-loaded, absent from the home paint.
// ===================================================================================

// ----- spec-v242: Building Occupant Load from Area and Use (IBC 2021 §1004.5) -----

// dims: in { spaces: dimensionless } out: { total_load: dimensionless, space_count: dimensionless }
export function computeOccupantLoad({ spaces = [] } = {}) {
  if (!Array.isArray(spaces) || spaces.length === 0) return { error: "Provide at least one space (area + occupant-load factor)." };
  let total_load = 0;
  const per_space = [];
  for (const s of spaces) {
    const area = Number(s.area);
    const olf = Number(s.olf);
    if (!Number.isFinite(area) || !Number.isFinite(olf)) return { error: "All space inputs must be finite numbers." };
    if (!(area > 0)) return { error: "Each space area must be positive (ft^2)." };
    if (!(olf > 0)) return { error: "Each occupant-load factor must be positive (ft^2/occupant)." };
    // IBC §1004.2: a fraction of a person is counted as a whole person.
    const load = Math.ceil(area / olf);
    per_space.push({ area, olf, load });
    total_load += load;
  }
  return { per_space, total_load, space_count: spaces.length };
}

export const occupantLoadExample = {
  inputs: { spaces: [{ area: 3000, olf: 150 }, { area: 600, olf: 15 }] },
};

// Custom renderer: three space rows (area + occupant-load factor), summed.
function _renderOccupantLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IBC 2021 §1004.5 and Table 1004.5 (occupant load = sum over spaces of ceil(area / occupant-load factor)); §1004.2 (round each space up to a whole person). Representative factors (ft^2/occ): assembly standing 5 net, chairs-only 7 net, tables-and-chairs 15 net, business 150 gross, mercantile 60 gross, classroom 20 net, commercial kitchen 200 gross, industrial 100 gross, storage 500 gross, residential 200 gross. The factor and its net-vs-gross basis come from the AHJ-adopted code edition and the actual use, not the tenant's label; a mezzanine or accessory use is its own line. A design aid, not a code-official determination.";
  _aeC(inputRegion, () => fillExample(occupantLoadExample.inputs));
  const rows = [];
  for (let i = 1; i <= 3; i++) {
    const a = _mnC("Space " + i + " area (ft^2)", "ocl-a" + i, { step: "any", min: "0" });
    const o = _mnC("Space " + i + " factor (ft^2/occ)", "ocl-o" + i, { step: "any", min: "0" });
    inputRegion.appendChild(a.wrap); inputRegion.appendChild(o.wrap);
    rows.push({ a, o });
  }
  const oT = _moC(outputRegion, "Total occupant load", "ocl-out-t");
  const oB = _moC(outputRegion, "By space", "ocl-out-b");
  function fillExample(x) {
    const sp = x.spaces || [];
    for (let i = 0; i < 3; i++) {
      rows[i].a.input.value = sp[i] ? sp[i].area : "";
      rows[i].o.input.value = sp[i] ? sp[i].olf : "";
    }
    update();
  }
  const update = _debC(() => {
    const spaces = [];
    for (const r of rows) {
      const area = Number(r.a.input.value) || 0;
      const olf = Number(r.o.input.value) || 0;
      if (area > 0 && olf > 0) spaces.push({ area, olf });
    }
    if (spaces.length === 0) { oT.textContent = "Enter at least one space."; oB.textContent = "-"; return; }
    const r = computeOccupantLoad({ spaces });
    if (r.error) { oT.textContent = r.error; oB.textContent = "-"; return; }
    oT.textContent = r.total_load + " occupants";
    oB.textContent = r.per_space.map((s) => s.load).join(" + ") + " = " + r.total_load;
  }, _DC);
  for (const r of rows) { r.a.input.addEventListener("input", update); r.o.input.addEventListener("input", update); }
}
CONSTRUCTION_RENDERERS["occupant-load"] = _renderOccupantLoad;

// ----- spec-v243: Egress Capacity, Exit Count, and Required Width (IBC 2021 §1005.3 / §1006.2 / §1010.1.1) -----

// dims: in { occupant_load: dimensionless, min_door_in: L } out: { total_width_in: L, per_exit_in: L, exits_required: dimensionless }
export function computeEgressCapacity({ occupant_load = 0, sprinklered = true, path = "level", min_door_in = 32 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(occupant_load > 0)) return { error: "Occupant load must be positive." };
  if (!(min_door_in > 0)) return { error: "Minimum door clear width must be positive (in)." };
  const sprk = sprinklered === true || sprinklered === "yes" || sprinklered === "true";
  const isStair = path === "stair";
  const factor = isStair ? (sprk ? 0.2 : 0.3) : (sprk ? 0.15 : 0.2);
  const exits_required = occupant_load <= 49 ? 1 : occupant_load <= 500 ? 2 : occupant_load <= 1000 ? 3 : 4;
  const total_width_in = occupant_load * factor;
  const per_exit_in = Math.max(total_width_in / exits_required, min_door_in);
  const governed = per_exit_in === min_door_in ? "door/leaf minimum" : "required width";
  return { factor, exits_required, total_width_in, per_exit_in, governed, sprinklered: sprk, path: isStair ? "stair" : "level" };
}

export const egressCapacityExample = {
  inputs: { occupant_load: 160, sprinklered: true, path: "level", min_door_in: 32 },
};

function _renderEgressCapacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IBC 2021 §1005.3 (egress width = occupant load x capacity factor), §1006.2 / Table 1006.3.4 (exit-count thresholds: 1 up to 49, 2 to 500, 3 to 1000, 4 beyond), §1010.1.1 (32 in minimum door clear width). Capacity factors: sprinklered-with-alarm 0.2 in/occ stairs, 0.15 in/occ level; non-sprinklered 0.3 / 0.2. The reduced factors require the §1005.3.1/.2 sprinkler and emergency-communication conditions; the width is divided among the required exits; the door-leaf minimum and §1005.7 projections can govern. A design aid, not a code-official determination.";
  _aeC(inputRegion, () => fillExample(egressCapacityExample.inputs));
  const ol = _mnC("Occupant load (persons)", "egc-ol", { step: "any", min: "0" });
  const sp = _msC("Sprinklered + alarm (1005.3.1/.2)", "egc-sp", [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]);
  const pa = _msC("Egress component", "egc-pa", [{ value: "level", label: "Level (doors, corridors, ramps)" }, { value: "stair", label: "Stairway" }]);
  const md = _mnC("Minimum door clear width (in)", "egc-md", { step: "any", min: "0" });
  md.input.value = "32";
  for (const f of [ol, sp, pa, md]) inputRegion.appendChild(f.wrap);
  const oE = _moC(outputRegion, "Exits required", "egc-out-e");
  const oT = _moC(outputRegion, "Total egress width", "egc-out-t");
  const oP = _moC(outputRegion, "Width per exit", "egc-out-p");
  const oG = _moC(outputRegion, "Governed by", "egc-out-g");
  function fillExample(x) { ol.input.value = x.occupant_load; sp.select.value = x.sprinklered ? "yes" : "no"; pa.select.value = x.path; md.input.value = x.min_door_in; update(); }
  const update = _debC(() => {
    const r = computeEgressCapacity({ occupant_load: Number(ol.input.value) || 0, sprinklered: sp.select.value, path: pa.select.value, min_door_in: Number(md.input.value) || 0 });
    if (r.error) { oE.textContent = r.error; oT.textContent = "-"; oP.textContent = "-"; oG.textContent = "-"; return; }
    oE.textContent = String(r.exits_required);
    oT.textContent = _fmtC(r.total_width_in, 1) + " in";
    oP.textContent = _fmtC(r.per_exit_in, 1) + " in";
    oG.textContent = r.governed;
  }, _DC);
  for (const f of [ol.input, sp.select, pa.select, md.input]) f.addEventListener("input", update);
}
CONSTRUCTION_RENDERERS["egress-capacity"] = _renderEgressCapacity;

// ----- spec-v244: Required Plumbing Fixture Count by Occupancy (IBC 2021 §2902 / Table 2902.1) -----

// dims: in { occupant_load: dimensionless, wc_ratio: dimensionless, wc_ratio_over: dimensionless, wc_tier: dimensionless, lav_ratio: dimensionless, fountain_ratio: dimensionless, distribution: dimensionless } out: { wc_total: dimensionless, lav_total: dimensionless, fountains: dimensionless, service_sinks: dimensionless }
export function computePlumbingFixtureCount({ occupant_load = 0, wc_ratio = 25, wc_ratio_over = 50, wc_tier = 50, lav_ratio = 40, fountain_ratio = 100, distribution = 0.5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(occupant_load > 0)) return { error: "Occupant load must be positive." };
  if (!(wc_ratio > 0)) return { error: "Water-closet ratio must be positive." };
  if (!(lav_ratio > 0)) return { error: "Lavatory ratio must be positive." };
  if (!(fountain_ratio > 0)) return { error: "Drinking-fountain ratio must be positive." };
  if (!(distribution >= 0 && distribution <= 1)) return { error: "Distribution must be between 0 and 1." };
  // Per sex, per IBC §2902.1.1 each ratio rounds up. The water closet uses a
  // two-tier schedule (wc_ratio for the first wc_tier occupants, wc_ratio_over
  // beyond); set wc_tier = 0 for a single-tier ratio.
  const wcFor = (n) => {
    const tierN = Math.min(n, wc_tier);
    const over = Math.max(n - wc_tier, 0);
    return Math.ceil(tierN / wc_ratio) + (wc_ratio_over > 0 ? Math.ceil(over / wc_ratio_over) : 0);
  };
  const per_sex_a = occupant_load * distribution;
  const per_sex_b = occupant_load * (1 - distribution);
  const wc_a = wcFor(per_sex_a);
  const wc_b = wcFor(per_sex_b);
  const lav_a = Math.ceil(per_sex_a / lav_ratio);
  const lav_b = Math.ceil(per_sex_b / lav_ratio);
  const wc_total = wc_a + wc_b;
  const lav_total = lav_a + lav_b;
  const fountains = Math.ceil(occupant_load / fountain_ratio);
  return { per_sex_a, per_sex_b, wc_a, wc_b, lav_a, lav_b, wc_total, lav_total, fountains, service_sinks: 1 };
}

export const plumbingFixtureCountExample = {
  inputs: { occupant_load: 100, wc_ratio: 25, wc_ratio_over: 50, wc_tier: 50, lav_ratio: 40, fountain_ratio: 100, distribution: 0.5 },
};

const _renderPlumbingFixtureCount = _simpleRenderer({
  citation: "Citation: IBC 2021 §2902 and Table 2902.1 (mirrored in IPC Table 403.1): fixtures = ceil(occupants-per-sex / ratio), each rounded up per §2902.1.1; the load splits evenly between two sexes unless a distribution override is given. Representative ratios: business water closet 1:25 first-50 then 1:50, lavatory 1:40; restaurant (A-2) water closet 1:75, lavatory 1:200; drinking fountain 1:100 business / 1:500 assembly; service sink minimum 1. The ratios, net-vs-gross basis, even-split assumption, and any single-user/family-restroom reductions come from the AHJ-adopted code edition and the actual occupancy. A design aid, not a code-official determination.",
  example: plumbingFixtureCountExample.inputs,
  fields: [
    { key: "occupant_load", label: "Occupant load (persons)", kind: "number" },
    { key: "wc_ratio", label: "WC ratio, first tier (occ/WC)", kind: "number", default: 25 },
    { key: "wc_ratio_over", label: "WC ratio above tier (0 = n/a)", kind: "number", default: 50 },
    { key: "wc_tier", label: "First-tier size per sex (0 = single)", kind: "number", default: 50 },
    { key: "lav_ratio", label: "Lavatory ratio (occ/lav)", kind: "number", default: 40 },
    { key: "fountain_ratio", label: "Fountain ratio (occ/DF)", kind: "number", default: 100 },
    { key: "distribution", label: "Share as one sex (0-1)", kind: "number", default: 0.5 },
  ],
  outputs: [
    { key: "wc", id: "pfc-out-wc", label: "Water closets (total)", value: (r) => String(r.wc_total) },
    { key: "lav", id: "pfc-out-lav", label: "Lavatories (total)", value: (r) => String(r.lav_total) },
    { key: "df", id: "pfc-out-df", label: "Drinking fountains", value: (r) => String(r.fountains) },
    { key: "ss", id: "pfc-out-ss", label: "Service sinks", value: (r) => String(r.service_sinks) },
    { key: "sx", id: "pfc-out-sx", label: "Per sex (WC / lav)", value: (r) => r.wc_a + " / " + r.lav_a + " each" },
  ],
  compute: computePlumbingFixtureCount,
});
CONSTRUCTION_RENDERERS["plumbing-fixture-count"] = _renderPlumbingFixtureCount;

// ----- spec-v245: Formwork Shore Post Load and Spacing (ACI 347) -----

// dims: in { slab_in: L, unit_weight: M L^-3, form_load: M L^-1 T^-2, live_load: M L^-1 T^-2, spacing_x: L, spacing_y: L, shore_capacity: M L T^-2, min_design_psf: M L^-1 T^-2 } out: { slab_load: M L^-1 T^-2, design_psf: M L^-1 T^-2, shore_load: M L T^-2, utilization: dimensionless }
export function computeShorePostLoad({ slab_in = 0, unit_weight = 150, form_load = 10, live_load = 50, spacing_x = 0, spacing_y = 0, shore_capacity = 0, min_design_psf = 100 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(slab_in > 0)) return { error: "Slab thickness must be positive (in)." };
  if (!(unit_weight > 0)) return { error: "Unit weight must be positive (pcf)." };
  if (!(spacing_x > 0) || !(spacing_y > 0)) return { error: "Shore spacing must be positive (ft)." };
  if (!(shore_capacity > 0)) return { error: "Rated shore capacity must be positive (lb)." };
  if (form_load < 0 || live_load < 0 || min_design_psf < 0) return { error: "Loads cannot be negative (psf)." };
  const slab_load = slab_in / 12 * unit_weight;
  // ACI 347: combined design load not less than 100 psf (125 with buggies).
  const design_psf = Math.max(slab_load + form_load + live_load, min_design_psf);
  const trib_area = spacing_x * spacing_y;
  const shore_load = design_psf * trib_area;
  const utilization = shore_load / shore_capacity;
  return { slab_load, design_psf, trib_area, shore_load, utilization };
}

export const shorePostLoadExample = {
  inputs: { slab_in: 8, unit_weight: 150, form_load: 10, live_load: 50, spacing_x: 4, spacing_y: 4, shore_capacity: 6000, min_design_psf: 100 },
};

const _renderShorePostLoad = _simpleRenderer({
  citation: "Citation: ACI 347 (Guide to Formwork for Concrete): design pressure = max(slab_in/12 x unit weight + form load + construction live load, 100 psf minimum); load per shore = design pressure x tributary area (spacing_x x spacing_y). Construction live load rises to 75 psf and the floor to 125 psf where motorized buggies run. The rated shore capacity is the manufacturer's allowable for the extended height and bracing (a taller or unbraced post rates far lower); reshoring and multi-level load distribution (ACI 347.2R) and the strength of the slab below are separate analyses. A design aid, not a stamped shoring plan.",
  example: shorePostLoadExample.inputs,
  fields: [
    { key: "slab_in", label: "Slab / pour thickness (in)", kind: "number" },
    { key: "unit_weight", label: "Concrete unit weight (pcf)", kind: "number", default: 150 },
    { key: "form_load", label: "Formwork dead load (psf)", kind: "number", default: 10 },
    { key: "live_load", label: "Construction live load (psf)", kind: "number", default: 50 },
    { key: "spacing_x", label: "Shore spacing one way (ft)", kind: "number" },
    { key: "spacing_y", label: "Shore spacing other way (ft)", kind: "number" },
    { key: "shore_capacity", label: "Rated shore capacity (lb)", kind: "number" },
    { key: "min_design_psf", label: "Combined-load floor (psf)", kind: "number", default: 100 },
  ],
  outputs: [
    { key: "sl", id: "spl-out-sl", label: "Slab dead load", value: (r) => _fmtC(r.slab_load, 1) + " psf" },
    { key: "dp", id: "spl-out-dp", label: "Design pressure", value: (r) => _fmtC(r.design_psf, 1) + " psf" },
    { key: "sh", id: "spl-out-sh", label: "Load per shore", value: (r) => _fmtC(r.shore_load, 0) + " lb" },
    { key: "ut", id: "spl-out-ut", label: "Utilization", value: (r) => _fmtC(r.utilization, 2) + (r.utilization > 1 ? " (OVER capacity)" : "") },
  ],
  compute: computeShorePostLoad,
});
CONSTRUCTION_RENDERERS["shore-post-load"] = _renderShorePostLoad;

// ----- spec-v812: Scaffold Mudsill Bearing Pressure and Sill Length (OSHA 1926.451(c)(2)) -----
//
// The plank under a scaffold base plate spreads one leg's load onto the soil.
// bearing = leg load / (width x length / 144), compared to the allowable soil
// bearing; the required sill length grows the area until bearing <= allowable.
// dims: in { leg_load_lb: M L T^-2, plank_width_in: L, plank_length_in: L, allowable_psf: M L^-1 T^-2 } out: { mudsill_area_ft2: L^2, bearing_psf: M L^-1 T^-2, required_area_ft2: L^2, required_length_in: L }
export function computeScaffoldMudsillBearing({ leg_load_lb = 0, plank_width_in = 0, plank_length_in = 0, allowable_psf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(leg_load_lb > 0)) return { error: "Leg load must be positive (lb)." };
  if (!(plank_width_in > 0)) return { error: "Plank width must be positive (in)." };
  if (!(plank_length_in > 0)) return { error: "Plank length must be positive (in)." };
  if (!(allowable_psf > 0)) return { error: "Allowable soil bearing must be positive (psf)." };
  const mudsill_area_ft2 = (plank_width_in * plank_length_in) / 144;
  const bearing_psf = leg_load_lb / mudsill_area_ft2;
  const required_area_ft2 = leg_load_lb / allowable_psf;
  const required_length_in = (required_area_ft2 * 144) / plank_width_in;
  const pass = bearing_psf <= allowable_psf;
  if (![mudsill_area_ft2, bearing_psf, required_area_ft2, required_length_in].every(Number.isFinite)) return { error: "Bearing math is not a finite value." };
  return {
    mudsill_area_ft2,
    bearing_psf,
    required_area_ft2,
    required_length_in,
    pass,
    note: "The manufacturer's allowable base-plate load and the geotechnical allowable soil bearing govern - \"looks solid\" is not a number. OSHA 1926.451(c)(2) requires scaffold legs on base plates and mudsills on a sound, rigid foundation. Frost, voids, backfill, slopes, and adjacent excavations all cut soil capacity. A competent person verifies the setup; this is a first-check estimator, not the engineered design.",
  };
}

export const scaffoldMudsillBearingExample = { inputs: { leg_load_lb: 4000, plank_width_in: 9.25, plank_length_in: 24, allowable_psf: 2000 } };

const _renderScaffoldMudsillBearing = _simpleRenderer({
  citation: "Citation: bearing-pressure identity by name. pressure = leg load / mudsill area (width x length / 144), compared to the allowable soil bearing; required length = (leg load / allowable) x 144 / width. OSHA 1926.451(c)(2) requires base plates and mudsills on a sound, rigid foundation.",
  example: scaffoldMudsillBearingExample.inputs,
  fields: [
    { key: "leg_load_lb", label: "Load on one scaffold leg (lb)", kind: "number" },
    { key: "plank_width_in", label: "Mudsill board width (in, e.g. 9.25 for a 2x10)", kind: "number", default: 9.25 },
    { key: "plank_length_in", label: "Provided mudsill length (in)", kind: "number" },
    { key: "allowable_psf", label: "Allowable soil bearing (psf)", kind: "number", default: 2000 },
  ],
  outputs: [
    { key: "a", id: "smb-out-a", label: "Mudsill area", value: (r) => _fmtC(r.mudsill_area_ft2, 3) + " ft^2" },
    { key: "b", id: "smb-out-b", label: "Bearing pressure", value: (r) => _fmtC(r.bearing_psf, 0) + " psf" + (r.pass ? " (OK)" : " (OVER allowable)") },
    { key: "rl", id: "smb-out-rl", label: "Required sill length", value: (r) => _fmtC(r.required_length_in, 1) + " in" },
    { key: "n", id: "smb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeScaffoldMudsillBearing,
});
CONSTRUCTION_RENDERERS["scaffold-mudsill-bearing"] = _renderScaffoldMudsillBearing;

// --- scaffold-leg-load: Scaffold Per-Leg Load and OSHA 4:1 Check ---
//
// The load-side companion to scaffold-mudsill-bearing: total intended bay load
// divided over the legs, checked against the OSHA 4:1 safe working load.
//   total_load_lb = platform_dead_lb + num_workers x worker_lb + material_lb
//   leg_load_lb = total_load_lb / n_legs; swl_lb = component_rating_lb / 4
//   pass = leg_load_lb <= swl_lb
// dims: in { platform_dead_lb: M L T^-2, num_workers: dimensionless, worker_lb: M L T^-2, material_lb: M L T^-2, n_legs: dimensionless, component_rating_lb: M L T^-2 } out: { total_load_lb: M L T^-2, leg_load_lb: M L T^-2, swl_lb: M L T^-2, utilization: dimensionless }
export function computeScaffoldLegLoad({ platform_dead_lb = 100, num_workers = 2, worker_lb = 250, material_lb = 500, n_legs = 4, component_rating_lb = 2500 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(n_legs > 0)) return { error: "Leg count must be positive." };
  if (!(component_rating_lb > 0)) return { error: "Component rating must be positive (lb)." };
  if (!(worker_lb > 0)) return { error: "Worker weight must be positive (lb)." };
  if (platform_dead_lb < 0) return { error: "Platform dead load cannot be negative (lb)." };
  if (material_lb < 0) return { error: "Material load cannot be negative (lb)." };
  if (num_workers < 0) return { error: "Worker count cannot be negative." };
  const total_load_lb = platform_dead_lb + num_workers * worker_lb + material_lb;
  const leg_load_lb = total_load_lb / n_legs;
  const swl_lb = component_rating_lb / 4;
  const utilization = leg_load_lb / swl_lb;
  const pass = leg_load_lb <= swl_lb;
  if (![total_load_lb, leg_load_lb, swl_lb, utilization].every(Number.isFinite)) return { error: "Scaffold-load math is not a finite value." };
  return {
    total_load_lb,
    leg_load_lb,
    swl_lb,
    utilization,
    pass,
    note: "The component rating is the manufacturer's; OSHA 1926.451(a)(1) sets the 4:1 minimum and counts 250 lb per person. The distribution to legs depends on the configuration and any stacked lifts above - this assumes an even share. A competent person verifies the load and setup. The leg load feeds scaffold-mudsill-bearing for the foundation check.",
  };
}

export const scaffoldLegLoadExample = { inputs: { platform_dead_lb: 100, num_workers: 2, worker_lb: 250, material_lb: 500, n_legs: 4, component_rating_lb: 2500 } };

const _renderScaffoldLegLoad = _simpleRenderer({
  citation: "Citation: OSHA capacity rule by name. safe working load = component rating / 4; leg load = total intended load / legs; total = platform dead + workers x weight + material. OSHA 1926.451(a)(1) requires 4x the intended load and counts 250 lb per person.",
  example: scaffoldLegLoadExample.inputs,
  fields: [
    { key: "platform_dead_lb", label: "Platform + scaffold dead load in the bay (lb)", kind: "number", default: 100 },
    { key: "num_workers", label: "Workers on the bay (count)", kind: "number", default: 2 },
    { key: "worker_lb", label: "Weight per worker with tools (lb)", kind: "number", default: 250 },
    { key: "material_lb", label: "Stored material load (lb)", kind: "number", default: 500 },
    { key: "n_legs", label: "Legs sharing the bay (count)", kind: "number", default: 4 },
    { key: "component_rating_lb", label: "Manufacturer leg / frame rating (lb)", kind: "number", default: 2500 },
  ],
  outputs: [
    { key: "leg", id: "sll-out-leg", label: "Load per leg", value: (r) => _fmtC(r.leg_load_lb, 0) + " lb" + (r.pass ? " (OK)" : " (OVER the 4:1 SWL)") },
    { key: "swl", id: "sll-out-swl", label: "Safe working load per leg", value: (r) => _fmtC(r.swl_lb, 0) + " lb" },
    { key: "u", id: "sll-out-u", label: "Utilization", value: (r) => _fmtC(r.utilization * 100, 0) + "% of SWL" },
    { key: "n", id: "sll-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeScaffoldLegLoad,
});
CONSTRUCTION_RENDERERS["scaffold-leg-load"] = _renderScaffoldLegLoad;

// --- scaffold-takeoff: Frame Scaffold Material Takeoff ---
//
// The frames, cross braces, planks, and base plates a frame-scaffold run takes,
// off the bay layout and the number of lifts:
//   bays = ceil(run / bay length); frames = (bays + 1) x lifts
//   braces = 2 x bays x lifts; planks = bays x planks_per_bay
//   base_plates = (bays + 1) x 2
// dims: in { run_length_ft: L, bay_length_ft: L, lifts: dimensionless, planks_per_bay: dimensionless } out: { bays: dimensionless, frames: dimensionless, braces: dimensionless, planks: dimensionless, base_plates: dimensionless }
export function computeScaffoldTakeoff({ run_length_ft = 40, bay_length_ft = 7, lifts = 1, planks_per_bay = 4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(run_length_ft > 0)) return { error: "Run length must be positive (ft)." };
  if (!(bay_length_ft > 0)) return { error: "Bay length must be positive (ft)." };
  if (!(lifts > 0)) return { error: "Lifts must be positive." };
  if (!(planks_per_bay > 0)) return { error: "Planks per bay must be positive." };
  const bays = Math.ceil(run_length_ft / bay_length_ft);
  const frames = (bays + 1) * lifts;
  const braces = 2 * bays * lifts;
  const planks = bays * planks_per_bay;
  const base_plates = (bays + 1) * 2;
  if (![bays, frames, braces, planks, base_plates].every(Number.isFinite)) return { error: "Takeoff math is not a finite value." };
  return {
    bays,
    frames,
    braces,
    planks,
    base_plates,
    note: "The counts are for a single-width frame scaffold run. Guardrails, ties, screw jacks, and access (ladders or stair towers) are taken off separately. A competent person designs the erection - this is a material count, not the engineered plan.",
  };
}

export const scaffoldTakeoffExample = { inputs: { run_length_ft: 40, bay_length_ft: 7, lifts: 3, planks_per_bay: 4 } };

const _renderScaffoldTakeoff = _simpleRenderer({
  citation: "Citation: frame-scaffold takeoff geometry by name. bays = ceil(run / bay length); frames = (bays + 1) x lifts; braces = 2 x bays x lifts; planks = bays x planks per bay; base plates = (bays + 1) x 2. A single-width run; a competent person designs the erection.",
  example: scaffoldTakeoffExample.inputs,
  fields: [
    { key: "run_length_ft", label: "Scaffold run length (ft)", kind: "number", default: 40 },
    { key: "bay_length_ft", label: "Bay / cross-brace length (ft)", kind: "number", default: 7 },
    { key: "lifts", label: "Frame levels high (count)", kind: "number", default: 3 },
    { key: "planks_per_bay", label: "Planks per bay platform (count)", kind: "number", default: 4 },
  ],
  outputs: [
    { key: "b", id: "sto-out-b", label: "Bays", value: (r) => _fmtC(r.bays, 0) },
    { key: "f", id: "sto-out-f", label: "Frames (end frames)", value: (r) => _fmtC(r.frames, 0) },
    { key: "br", id: "sto-out-br", label: "Cross braces", value: (r) => _fmtC(r.braces, 0) },
    { key: "p", id: "sto-out-p", label: "Planks", value: (r) => _fmtC(r.planks, 0) },
    { key: "bp", id: "sto-out-bp", label: "Base plates", value: (r) => _fmtC(r.base_plates, 0) },
    { key: "n", id: "sto-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeScaffoldTakeoff,
});
CONSTRUCTION_RENDERERS["scaffold-takeoff"] = _renderScaffoldTakeoff;

// --- asphalt-spread-rate: Asphalt Spread Rate and Yield Check ---
//
// The lb/sy a mat lays and the sy/ton it yields, the roll-ahead QC a paving
// crew checks load by load:
//   spread_lb_per_sy = thickness_in x density_pcf x 0.75  (0.75 = 9 sf/sy / 12 in/ft)
//   yield_sy_per_ton = 2000 / spread_lb_per_sy
// dims: in { thickness_in: L, density_pcf: M L^-3 } out: { spread_lb_per_sy: M L^-2, yield_sy_per_ton: L^2 M^-1 }
export function computeAsphaltSpreadRate({ thickness_in = 2, density_pcf = 145 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(thickness_in > 0)) return { error: "Thickness must be positive (in)." };
  if (!(density_pcf > 0)) return { error: "Density must be positive (pcf)." };
  const spread_lb_per_sy = thickness_in * density_pcf * 0.75;
  const yield_sy_per_ton = 2000 / spread_lb_per_sy;
  if (![spread_lb_per_sy, yield_sy_per_ton].every(Number.isFinite)) return { error: "Spread-rate math is not a finite value." };
  return {
    spread_lb_per_sy,
    yield_sy_per_ton,
    note: "The mix design's compacted density governs (typically about 145 pcf for a dense-graded mix). Crews check the roll-ahead yield load by load against the plan: a low yield means the mat is running thick or the trucks are short. The 0.75 factor is 9 sf/sy divided by 12 in/ft.",
  };
}

export const asphaltSpreadRateExample = { inputs: { thickness_in: 2, density_pcf: 145 } };

const _renderAsphaltSpreadRate = _simpleRenderer({
  citation: "Citation: spread / yield identity by name. spread (lb/sy) = thickness (in) x density (pcf) x 0.75 (= 9 sf/sy / 12 in/ft); yield (sy/ton) = 2000 / spread. The mix design's compacted density governs.",
  example: asphaltSpreadRateExample.inputs,
  fields: [
    { key: "thickness_in", label: "Compacted mat thickness (in)", kind: "number", default: 2 },
    { key: "density_pcf", label: "Compacted HMA density (pcf)", kind: "number", default: 145 },
  ],
  outputs: [
    { key: "s", id: "asr-out-s", label: "Spread rate", value: (r) => _fmtC(r.spread_lb_per_sy, 1) + " lb/sy" },
    { key: "y", id: "asr-out-y", label: "Yield", value: (r) => _fmtC(r.yield_sy_per_ton, 2) + " sy/ton" },
    { key: "n", id: "asr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAsphaltSpreadRate,
});
CONSTRUCTION_RENDERERS["asphalt-spread-rate"] = _renderAsphaltSpreadRate;

// --- pavement-milling-production: Cold-Planing (Milling) Production and RAP Tonnage ---
//
// The sy/hr a cold planer cuts and the reclaimed-asphalt (RAP) tonnage it makes,
// which sizes the haul fleet that keeps the mill moving:
//   sy_per_hr = drum_width_ft x speed_fpm x 60 x efficiency / 9
//   spread_lb_per_sy = depth_in x density_pcf x 0.75
//   rap_tph = sy_per_hr x spread_lb_per_sy / 2000
// dims: in { drum_width_ft: L, speed_fpm: L T^-1, depth_in: L, density_pcf: M L^-3, efficiency: dimensionless } out: { sy_per_hr: L^2 T^-1, spread_lb_per_sy: M L^-2, rap_tph: M T^-1 }
export function computePavementMillingProduction({ drum_width_ft = 7, speed_fpm = 30, depth_in = 4, density_pcf = 148, efficiency = 0.7 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(drum_width_ft > 0)) return { error: "Drum width must be positive (ft)." };
  if (!(speed_fpm > 0)) return { error: "Speed must be positive (ft/min)." };
  if (!(depth_in > 0)) return { error: "Cut depth must be positive (in)." };
  if (!(density_pcf > 0)) return { error: "Density must be positive (pcf)." };
  if (!(efficiency > 0)) return { error: "Efficiency must be positive." };
  const sy_per_hr = (drum_width_ft * speed_fpm * 60 * efficiency) / 9;
  const spread_lb_per_sy = depth_in * density_pcf * 0.75;
  const rap_tph = (sy_per_hr * spread_lb_per_sy) / 2000;
  if (![sy_per_hr, spread_lb_per_sy, rap_tph].every(Number.isFinite)) return { error: "Milling-production math is not a finite value." };
  return {
    sy_per_hr,
    spread_lb_per_sy,
    rap_tph,
    note: "Milling efficiency runs lower than paving (frequent truck changes and repositioning), so field conditions govern the efficiency factor. The RAP density is that of the existing pavement being cut. The RAP tonnage sizes the haul fleet that keeps the mill cutting - if the trucks fall behind, the mill stops.",
  };
}

export const pavementMillingProductionExample = { inputs: { drum_width_ft: 7, speed_fpm: 30, depth_in: 4, density_pcf: 148, efficiency: 0.7 } };

const _renderPavementMillingProduction = _simpleRenderer({
  citation: "Citation: milling production identity by name. sy/hr = drum width x speed x 60 x efficiency / 9; RAP tph = sy/hr x spread / 2000, where spread = depth x density x 0.75. Milling efficiency runs lower than paving; field conditions govern.",
  example: pavementMillingProductionExample.inputs,
  fields: [
    { key: "drum_width_ft", label: "Cutting drum width (ft)", kind: "number", default: 7 },
    { key: "speed_fpm", label: "Milling forward speed (ft/min)", kind: "number", default: 30 },
    { key: "depth_in", label: "Cut depth (in)", kind: "number", default: 4 },
    { key: "density_pcf", label: "Existing pavement density (pcf)", kind: "number", default: 148 },
    { key: "efficiency", label: "Job efficiency (0-1)", kind: "number", default: 0.7 },
  ],
  outputs: [
    { key: "a", id: "pmp-out-a", label: "Milling production", value: (r) => _fmtC(r.sy_per_hr, 0) + " sy/hr" },
    { key: "r", id: "pmp-out-r", label: "RAP generated", value: (r) => _fmtC(r.rap_tph, 1) + " tph" },
    { key: "n", id: "pmp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePavementMillingProduction,
});
CONSTRUCTION_RENDERERS["pavement-milling-production"] = _renderPavementMillingProduction;

// --- striping-paint-quantity: Pavement Marking Paint and Glass Bead Quantity ---
//
// The paint and the glass beads dropped into it for a striping run - the order
// that architectural wall-paint coverage never touches:
//   stripe_sf = length_ft x width_in / 12
//   paint_gal = stripe_sf / coverage_sf_per_gal
//   beads_lb = paint_gal x bead_rate_lb_per_gal
// dims: in { length_ft: L, width_in: L, coverage_sf_per_gal: L^-1, bead_rate_lb_per_gal: M L^-3 } out: { stripe_sf: L^2, paint_gal: L^3, beads_lb: M }
export function computeStripingPaintQuantity({ length_ft = 5280, width_in = 4, coverage_sf_per_gal = 320, bead_rate_lb_per_gal = 6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(length_ft > 0)) return { error: "Length must be positive (ft)." };
  if (!(width_in > 0)) return { error: "Width must be positive (in)." };
  if (!(coverage_sf_per_gal > 0)) return { error: "Coverage must be positive (sf/gal)." };
  if (!(bead_rate_lb_per_gal > 0)) return { error: "Bead rate must be positive (lb/gal)." };
  const stripe_sf = (length_ft * width_in) / 12;
  const paint_gal = stripe_sf / coverage_sf_per_gal;
  const beads_lb = paint_gal * bead_rate_lb_per_gal;
  if (![stripe_sf, paint_gal, beads_lb].every(Number.isFinite)) return { error: "Striping math is not a finite value." };
  return {
    stripe_sf,
    paint_gal,
    beads_lb,
    note: "The coverage (sf/gal) follows the specified wet-mil thickness - a waterborne line near 15 mil runs about 320-360 sf/gal. The glass-bead drop rate is set by the retroreflectivity spec. A skip (dashed) line applies a duty-cycle fraction of the length, so enter the painted length, not the run. Distinct from architectural wall-paint coverage.",
  };
}

export const stripingPaintQuantityExample = { inputs: { length_ft: 5280, width_in: 4, coverage_sf_per_gal: 320, bead_rate_lb_per_gal: 6 } };

const _renderStripingPaintQuantity = _simpleRenderer({
  citation: "Citation: marking quantity identity by name. stripe area (sf) = length x width / 12; paint (gal) = area / coverage (sf/gal); beads (lb) = gallons x bead rate (lb/gal). The coverage follows the wet-mil thickness; the bead rate follows the retroreflectivity spec.",
  example: stripingPaintQuantityExample.inputs,
  fields: [
    { key: "length_ft", label: "Stripe length (ft)", kind: "number", default: 5280 },
    { key: "width_in", label: "Stripe width (in)", kind: "number", default: 4 },
    { key: "coverage_sf_per_gal", label: "Paint coverage (sf/gal)", kind: "number", default: 320 },
    { key: "bead_rate_lb_per_gal", label: "Glass bead rate (lb/gal)", kind: "number", default: 6 },
  ],
  outputs: [
    { key: "p", id: "spq-out-p", label: "Paint", value: (r) => _fmtC(r.paint_gal, 2) + " gal" },
    { key: "b", id: "spq-out-b", label: "Glass beads", value: (r) => _fmtC(r.beads_lb, 1) + " lb" },
    { key: "a", id: "spq-out-a", label: "Stripe area", value: (r) => _fmtC(r.stripe_sf, 0) + " sf" },
    { key: "n", id: "spq-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeStripingPaintQuantity,
});
CONSTRUCTION_RENDERERS["striping-paint-quantity"] = _renderStripingPaintQuantity;

// --- concrete-vibrator-spacing: Internal Vibrator Spacing (ACI 309) ---
//
// Spaces the internal-vibrator insertions that consolidate fresh concrete, per
// ACI 309: spacing at 1.5 x radius of action, head within 0.75 R of the form:
//   max_spacing_in = 1.5 x radius_of_action_in
//   edge_max_in    = 0.75 x radius_of_action_in
//   insertions     = ceil(lift_length_ft x 12 / max_spacing_in)
// dims: in { radius_of_action_in: L, lift_length_ft: L } out: { max_spacing_in: L, edge_max_in: L, insertions: dimensionless }
export function computeConcreteVibratorSpacing({ radius_of_action_in = 12, lift_length_ft = 20 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(radius_of_action_in > 0)) return { error: "Radius of action must be positive (in)." };
  if (!(lift_length_ft > 0)) return { error: "Lift length must be positive (ft)." };
  const max_spacing_in = 1.5 * radius_of_action_in;
  const edge_max_in = 0.75 * radius_of_action_in;
  const insertions = Math.ceil((lift_length_ft * 12) / max_spacing_in);
  if (![max_spacing_in, edge_max_in, insertions].every(Number.isFinite)) return { error: "Vibrator-spacing math is not a finite value." };
  return {
    max_spacing_in,
    edge_max_in,
    insertions,
    note: "The radius of action comes from the vibrator manufacturer for the head diameter and the mix. The head is inserted vertically with the action circles overlapping and withdrawn slowly; over-vibration segregates the mix. ACI 309 governs the practice - this is a spacing plan, not a substitute for a competent finisher.",
  };
}

export const concreteVibratorSpacingExample = { inputs: { radius_of_action_in: 12, lift_length_ft: 20 } };

const _renderConcreteVibratorSpacing = _simpleRenderer({
  citation: "Citation: ACI 309 spacing rule by name. max spacing = 1.5 x radius of action; edge distance <= 0.75 x radius of action; insertions = ceil(lift length x 12 / spacing). The radius of action comes from the vibrator manufacturer.",
  example: concreteVibratorSpacingExample.inputs,
  fields: [
    { key: "radius_of_action_in", label: "Vibrator radius of action R (in)", kind: "number", default: 12 },
    { key: "lift_length_ft", label: "Lift / run length to consolidate (ft)", kind: "number", default: 20 },
  ],
  outputs: [
    { key: "s", id: "cvs-out-s", label: "Max insertion spacing", value: (r) => _fmtC(r.max_spacing_in, 1) + " in" },
    { key: "e", id: "cvs-out-e", label: "Max distance from the form", value: (r) => _fmtC(r.edge_max_in, 1) + " in" },
    { key: "i", id: "cvs-out-i", label: "Insertion points", value: (r) => _fmtC(r.insertions, 0) },
    { key: "n", id: "cvs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteVibratorSpacing,
});
CONSTRUCTION_RENDERERS["concrete-vibrator-spacing"] = _renderConcreteVibratorSpacing;

// --- formwork-tie-load: Formwork Tie Load and Spacing ---
//
// Sizes the wall-form ties that take the lateral concrete pressure in tension,
// completing the formwork family (pressure, vertical shores, horizontal ties):
//   tie_load_lb = lateral_pressure_psf x h_spacing_ft x v_spacing_ft
//   utilization = tie_load_lb / tie_swl_lb; pass = tie_load_lb <= tie_swl_lb
//   max_trib_area_ft2 = tie_swl_lb / lateral_pressure_psf
// dims: in { lateral_pressure_psf: M L^-1 T^-2, h_spacing_ft: L, v_spacing_ft: L, tie_swl_lb: M L T^-2 } out: { tie_load_lb: M L T^-2, utilization: dimensionless, max_trib_area_ft2: L^2 }
export function computeFormworkTieLoad({ lateral_pressure_psf = 600, h_spacing_ft = 2, v_spacing_ft = 2, tie_swl_lb = 3000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(lateral_pressure_psf > 0)) return { error: "Lateral pressure must be positive (psf)." };
  if (!(h_spacing_ft > 0)) return { error: "Horizontal spacing must be positive (ft)." };
  if (!(v_spacing_ft > 0)) return { error: "Vertical spacing must be positive (ft)." };
  if (!(tie_swl_lb > 0)) return { error: "Tie safe working load must be positive (lb)." };
  const tie_load_lb = lateral_pressure_psf * h_spacing_ft * v_spacing_ft;
  const utilization = tie_load_lb / tie_swl_lb;
  const pass = tie_load_lb <= tie_swl_lb;
  const max_trib_area_ft2 = tie_swl_lb / lateral_pressure_psf;
  if (![tie_load_lb, utilization, max_trib_area_ft2].every(Number.isFinite)) return { error: "Tie-load math is not a finite value." };
  return {
    tie_load_lb,
    utilization,
    pass,
    max_trib_area_ft2,
    note: "The lateral pressure comes from formwork-pressure (ACI 347); the tie safe working load is the manufacturer's rating with its own safety factor. Wales and studs are sized separately. A tie failure is a form blowout - pour faster (higher pressure) and the grid has to tighten. A quick-check estimator like formwork-pressure and shore-post-load, not the engineered design.",
  };
}

export const formworkTieLoadExample = { inputs: { lateral_pressure_psf: 600, h_spacing_ft: 2, v_spacing_ft: 2, tie_swl_lb: 3000 } };

const _renderFormworkTieLoad = _simpleRenderer({
  citation: "Citation: tie-load identity by name. tie load = lateral pressure x horizontal spacing x vertical spacing; max tributary = tie SWL / pressure. The lateral pressure comes from formwork-pressure (ACI 347); the tie SWL is the manufacturer's rating.",
  example: formworkTieLoadExample.inputs,
  fields: [
    { key: "lateral_pressure_psf", label: "Design lateral form pressure (psf)", kind: "number", default: 600 },
    { key: "h_spacing_ft", label: "Tie horizontal spacing (ft)", kind: "number", default: 2 },
    { key: "v_spacing_ft", label: "Tie vertical spacing (ft)", kind: "number", default: 2 },
    { key: "tie_swl_lb", label: "Tie safe working load (lb)", kind: "number", default: 3000 },
  ],
  outputs: [
    { key: "t", id: "ftl-out-t", label: "Load per tie", value: (r) => _fmtC(r.tie_load_lb, 0) + " lb" + (r.pass ? " (OK)" : " (OVER the tie SWL)") },
    { key: "u", id: "ftl-out-u", label: "Utilization", value: (r) => _fmtC(r.utilization * 100, 0) + "% of SWL" },
    { key: "a", id: "ftl-out-a", label: "Max tributary per tie", value: (r) => _fmtC(r.max_trib_area_ft2, 2) + " sf" },
    { key: "n", id: "ftl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFormworkTieLoad,
});
CONSTRUCTION_RENDERERS["formwork-tie-load"] = _renderFormworkTieLoad;

// --- mass-concrete-temp-rise: Mass Concrete Adiabatic Temperature Rise Screen (ACI 207) ---
//
// Screens mass-concrete heat: the adiabatic temperature rise from the cement's
// heat of hydration and the peak the placement will reach, per ACI 207:
//   delta_t_f = cementitious_lb_per_cy x rise_f_per_100lb / 100
//   peak_temp_f = placing_temp_f + delta_t_f
//   exceeds_screen = delta_t_f > diff_limit_f
// dims: in { cementitious_lb_per_cy: dimensionless, rise_f_per_100lb: dimensionless, placing_temp_f: T, diff_limit_f: T } out: { delta_t_f: T, peak_temp_f: T }
export function computeMassConcreteTempRise({ cementitious_lb_per_cy = 600, rise_f_per_100lb = 12, placing_temp_f = 70, diff_limit_f = 35 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(cementitious_lb_per_cy > 0)) return { error: "Cementitious content must be positive (lb/cy)." };
  if (!(rise_f_per_100lb > 0)) return { error: "Rise coefficient must be positive (degF/100lb)." };
  if (!(diff_limit_f > 0)) return { error: "Differential limit must be positive (degF)." };
  const delta_t_f = (cementitious_lb_per_cy * rise_f_per_100lb) / 100;
  const peak_temp_f = placing_temp_f + delta_t_f;
  const exceeds_screen = delta_t_f > diff_limit_f;
  if (![delta_t_f, peak_temp_f].every(Number.isFinite)) return { error: "Temperature-rise math is not a finite value." };
  return {
    delta_t_f,
    peak_temp_f,
    exceeds_screen,
    note: "This is a SCREEN, not a thermal analysis. The rise coefficient depends on the cement type and the supplementary cementitious materials (slag and fly ash lower it) - enter it from the mix data. The ~35 degF surface-to-core differential is the crack-control target a thermal-control plan enforces through modeling. The engineer of record governs; a wrong number here means thermal cracking (repair), not injury.",
  };
}

export const massConcreteTempRiseExample = { inputs: { cementitious_lb_per_cy: 600, rise_f_per_100lb: 12, placing_temp_f: 70, diff_limit_f: 35 } };

const _renderMassConcreteTempRise = _simpleRenderer({
  citation: "Citation: ACI 207 adiabatic-rise identity by name. rise = cementitious x coefficient / 100; peak = placing + rise. A screen, not a thermal analysis; the rise coefficient comes from the mix data and the engineer of record governs the thermal-control plan.",
  example: massConcreteTempRiseExample.inputs,
  fields: [
    { key: "cementitious_lb_per_cy", label: "Total cementitious content (lb/cy)", kind: "number", default: 600 },
    { key: "rise_f_per_100lb", label: "Adiabatic rise per 100 lb cementitious (degF)", kind: "number", default: 12 },
    { key: "placing_temp_f", label: "Concrete placing temperature (degF)", kind: "number", default: 70 },
    { key: "diff_limit_f", label: "Surface-core differential target (degF)", kind: "number", default: 35 },
  ],
  outputs: [
    { key: "d", id: "mctr-out-d", label: "Adiabatic temperature rise", value: (r) => _fmtC(r.delta_t_f, 0) + " degF" + (r.exceeds_screen ? " (over screen - thermal plan)" : " (under screen)") },
    { key: "p", id: "mctr-out-p", label: "Estimated peak temperature", value: (r) => _fmtC(r.peak_temp_f, 0) + " degF" },
    { key: "n", id: "mctr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMassConcreteTempRise,
});
CONSTRUCTION_RENDERERS["mass-concrete-temp-rise"] = _renderMassConcreteTempRise;

// --- concrete-washout-volume: Concrete Washout Containment Volume ---
//
// Sizes the lined pit or container that catches chute and pump rinse so high-pH
// slurry never reaches the ground or a storm drain (required by the CGP):
//   total_gal = trucks x washout_gal_per_truck
//   required_cf = total_gal / 7.48052 x (1 + freeboard_pct/100); required_cy = required_cf / 27
//   pit_side_ft = sqrt(required_cf / pit_depth_ft)
// dims: in { trucks: dimensionless, washout_gal_per_truck: L^3, freeboard_pct: dimensionless, pit_depth_ft: L } out: { total_gal: L^3, required_cf: L^3, required_cy: L^3, pit_side_ft: L }
export function computeConcreteWashoutVolume({ trucks = 20, washout_gal_per_truck = 50, freeboard_pct = 15, pit_depth_ft = 2 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(trucks > 0)) return { error: "Truck count must be positive." };
  if (!(washout_gal_per_truck > 0)) return { error: "Washout per truck must be positive (gal)." };
  if (!(pit_depth_ft > 0)) return { error: "Pit depth must be positive (ft)." };
  if (freeboard_pct < 0) return { error: "Freeboard cannot be negative (percent)." };
  const total_gal = trucks * washout_gal_per_truck;
  const required_cf = (total_gal / 7.48052) * (1 + freeboard_pct / 100);
  const required_cy = required_cf / 27;
  const pit_side_ft = Math.sqrt(required_cf / pit_depth_ft);
  if (![total_gal, required_cf, required_cy, pit_side_ft].every(Number.isFinite)) return { error: "Washout-volume math is not a finite value." };
  return {
    total_gal,
    required_cf,
    required_cy,
    pit_side_ft,
    note: "Washout captures chute and pump rinse plus returned slurry and must be contained per the SWPPP / CGP - no discharge to ground or storm. The slurry is caustic (high pH). Clean out the container at about three-quarters full and dispose per the plan. The per-truck figure is a planning estimate the crew tunes to the actual chute-rinse practice.",
  };
}

export const concreteWashoutVolumeExample = { inputs: { trucks: 20, washout_gal_per_truck: 50, freeboard_pct: 15, pit_depth_ft: 2 } };

const _renderConcreteWashoutVolume = _simpleRenderer({
  citation: "Citation: washout-containment identity by name. required volume (cf) = trucks x washout (gal) / 7.48 x (1 + freeboard); pit side = sqrt(volume / depth). Washout must be contained per the SWPPP / CGP - no discharge to ground or storm.",
  example: concreteWashoutVolumeExample.inputs,
  fields: [
    { key: "trucks", label: "Ready-mix trucks (or pump washes)", kind: "number", default: 20 },
    { key: "washout_gal_per_truck", label: "Washout volume per truck (gal)", kind: "number", default: 50 },
    { key: "freeboard_pct", label: "Freeboard allowance (percent)", kind: "number", default: 15 },
    { key: "pit_depth_ft", label: "Usable pit depth (ft)", kind: "number", default: 2 },
  ],
  outputs: [
    { key: "v", id: "cwv-out-v", label: "Required containment", value: (r) => _fmtC(r.required_cf, 1) + " cf (" + _fmtC(r.required_cy, 2) + " cy)" },
    { key: "s", id: "cwv-out-s", label: "Square pit side at that depth", value: (r) => _fmtC(r.pit_side_ft, 1) + " ft" },
    { key: "g", id: "cwv-out-g", label: "Total washout collected", value: (r) => _fmtC(r.total_gal, 0) + " gal" },
    { key: "n", id: "cwv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteWashoutVolume,
});
CONSTRUCTION_RENDERERS["concrete-washout-volume"] = _renderConcreteWashoutVolume;

// ----- spec-v246: Concrete Surface Evaporation Rate and Plastic-Shrinkage Risk (ACI 305) -----

// dims: in { air_temp_f: T, concrete_temp_f: T, rh_pct: dimensionless, wind_mph: L T^-1 } out: { E_metric: M L^-2 T^-1, E_us: M L^-2 T^-1 }
export function computeConcreteEvaporationRate({ air_temp_f = 70, concrete_temp_f = null, rh_pct = 50, wind_mph = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ct = (concrete_temp_f === null || concrete_temp_f === undefined || concrete_temp_f === "") ? air_temp_f : concrete_temp_f;
  if (!(rh_pct >= 0 && rh_pct <= 100)) return { error: "Relative humidity must be 0 to 100 percent." };
  if (wind_mph < 0) return { error: "Wind speed cannot be negative (mph)." };
  const Tc = (ct - 32) / 1.8;
  const Ta = (air_temp_f - 32) / 1.8;
  // The Menzel/NRMCA form needs (T + 18) > 0 (i.e. T > -18 C, ~ 0 F).
  if (Tc <= -18 || Ta <= -18) return { error: "Temperature is below the model's valid range (about 0 F)." };
  const V = wind_mph * 1.609;
  const E_metric = 5 * (Math.pow(Tc + 18, 2.5) - (rh_pct / 100) * Math.pow(Ta + 18, 2.5)) * (V + 4) * 1e-6;
  const E_us = E_metric * 0.2048;
  const flag = E_us >= 0.2 ? "precautions" : E_us >= 0.1 ? "caution" : "ok";
  return { Tc, Ta, E_metric, E_us, flag };
}

export const concreteEvaporationRateExample = {
  inputs: { air_temp_f: 90, concrete_temp_f: 90, rh_pct: 40, wind_mph: 15 },
};

const _renderConcreteEvaporationRate = _simpleRenderer({
  citation: "Citation: ACI 305 (Hot Weather Concreting) nomograph and the Menzel/NRMCA evaporation equation: E [kg/m^2/hr] = 5 x [(Tc + 18)^2.5 - (RH/100)(Ta + 18)^2.5](V + 4) x 10^-6, with Tc, Ta in C and V in km/h (converted from F and mph; 1 kg/m^2/hr = 0.2048 lb/ft^2/hr). Take precautions above 0.2 lb/ft^2/hr (~1.0 kg/m^2/hr); use the lower 0.1 lb/ft^2/hr caution for low-bleed mixes (low w/c, silica fume, high-early cement). The concrete temperature, not the air, drives the vapor term; a low-bleed mix cracks below the nominal threshold. A field screen, not a curing specification (curing follows ACI 308).",
  example: concreteEvaporationRateExample.inputs,
  fields: [
    { key: "air_temp_f", label: "Air temperature (F)", kind: "number", attrs: { step: "any" } },
    { key: "concrete_temp_f", label: "Concrete temperature (F)", kind: "number", attrs: { step: "any" } },
    { key: "rh_pct", label: "Relative humidity (%)", kind: "number" },
    { key: "wind_mph", label: "Wind speed (mph)", kind: "number" },
  ],
  outputs: [
    { key: "us", id: "cer-out-us", label: "Evaporation rate", value: (r) => _fmtC(r.E_us, 3) + " lb/ft^2/hr" },
    { key: "me", id: "cer-out-me", label: "Metric rate", value: (r) => _fmtC(r.E_metric, 3) + " kg/m^2/hr" },
    { key: "fl", id: "cer-out-fl", label: "Plastic-shrinkage risk", value: (r) => r.flag === "precautions" ? "TAKE PRECAUTIONS" : r.flag === "caution" ? "Caution (low-bleed mix)" : "OK" },
  ],
  compute: computeConcreteEvaporationRate,
});
CONSTRUCTION_RENDERERS["concrete-evaporation-rate"] = _renderConcreteEvaporationRate;

// ----- spec-v247: Concrete Age-Strength Gain for Form Stripping and Loading (ACI 209) -----

// dims: in { fc28: M L^-1 T^-2, age_days: T, a: T, b: dimensionless, target_pct: dimensionless } out: { fraction: dimensionless, fc_t: M L^-1 T^-2 }
export function computeConcreteStrengthGain({ fc28 = 0, age_days = 0, a = 4.0, b = 0.85, target_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fc28 > 0)) return { error: "Specified 28-day strength must be positive (psi)." };
  if (!(age_days > 0)) return { error: "Age must be positive (days)." };
  if (!(a > 0) || !(b > 0)) return { error: "ACI 209 constants a and b must be positive." };
  const fraction = age_days / (a + b * age_days);
  const fc_t = fraction * fc28;
  let target_age = null;
  if (target_pct > 0) {
    const f = target_pct / 100;
    // The model's asymptote is 1/b; a target at or above it never occurs.
    if (b * f >= 1) return { error: "Target percent is at or above the model asymptote (1/b)." };
    target_age = (a * f) / (1 - b * f);
  }
  return { fraction, fc_t, target_age, pct: fraction * 100 };
}

export const concreteStrengthGainExample = {
  inputs: { fc28: 4000, age_days: 7, a: 4.0, b: 0.85, target_pct: 75 },
};

const _renderConcreteStrengthGain = _simpleRenderer({
  citation: "Citation: ACI 209R strength-development model: f'c(t) = [t / (a + b x t)] x f'c(28), with the developed fraction relative to the 28-day strength. Bundled constants (editable): Type I/II moist-cured a = 4.0, b = 0.85 (steam-cured and Type III mixes take different pairs). The constants are for the cement type and curing named; other cements or accelerators shift the curve. An estimate of the mean strength trend, not a substitute for field-cured cylinder breaks or the maturity method (ASTM C1074); the engineer of record and the project specification set the actual strip / shore-removal / stressing strengths (commonly ~75% of f'c to remove shores), and cold weather slows the gain the model does not see. A scheduling estimate, not a strength acceptance.",
  example: concreteStrengthGainExample.inputs,
  fields: [
    { key: "fc28", label: "Specified 28-day strength f'c (psi)", kind: "number" },
    { key: "age_days", label: "Concrete age (days)", kind: "number" },
    { key: "a", label: "ACI 209 constant a", kind: "number", default: 4.0 },
    { key: "b", label: "ACI 209 constant b", kind: "number", default: 0.85 },
    { key: "target_pct", label: "Target % of f'c (0 = none)", kind: "number", default: 75 },
  ],
  outputs: [
    { key: "fr", id: "csg-out-fr", label: "Developed fraction", value: (r) => _fmtC(r.pct, 1) + "% of f'c" },
    { key: "fc", id: "csg-out-fc", label: "Developed strength", value: (r) => _fmtC(r.fc_t, 0) + " psi" },
    { key: "ta", id: "csg-out-ta", label: "Age to reach target", value: (r) => r.target_age === null ? "(no target set)" : _fmtC(r.target_age, 1) + " days" },
  ],
  compute: computeConcreteStrengthGain,
});
CONSTRUCTION_RENDERERS["concrete-strength-gain"] = _renderConcreteStrengthGain;

// ----- spec-v476: Concrete Maturity and Equivalent Age (ASTM C1074) -----

// dims: in { concrete_temp_f: T, hours: T, datum_f: T, q_kelvin: T, ref_temp_f: T, target_ttf_c: T^2 } out: { M_c: T^2, M_f: T^2, age_factor: dimensionless, te_hours: T, te_days: T, target_hours: T, target_days: T }
export function computeConcreteMaturity({ concrete_temp_f = 0, hours = 0, datum_f = 32, q_kelvin = 5000, ref_temp_f = 68, target_ttf_c = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(hours > 0)) return { error: "Elapsed time must be positive (hours)." };
  if (!(q_kelvin > 0)) return { error: "Activation constant Q must be positive (kelvin)." };
  if (target_ttf_c < 0) return { error: "Target TTF cannot be negative (deg C-hr)." };
  const Tc = (concrete_temp_f - 32) / 1.8;
  const T0 = (datum_f - 32) / 1.8;
  const Tr = (ref_temp_f - 32) / 1.8;
  // Below the datum the mix accrues no maturity (ASTM C1074); the inverse would divide by <= 0.
  if (!(Tc > T0)) return { error: "Concrete temperature must be above the datum; at or below it no maturity accrues." };
  if (!(Tr > T0)) return { error: "Reference temperature must be above the datum." };
  const M_c = (Tc - T0) * hours;
  const M_f = M_c * 1.8;
  const age_factor = Math.exp(-q_kelvin * (1 / (Tc + 273.15) - 1 / (Tr + 273.15)));
  const te_hours = age_factor * hours;
  const te_days = te_hours / 24;
  let target_hours = null, target_days = null;
  if (target_ttf_c > 0) {
    target_hours = target_ttf_c / (Tc - T0);
    target_days = target_hours / 24;
  }
  return { Tc, T0, M_c, M_f, age_factor, te_hours, te_days, target_hours, target_days };
}

export const concreteMaturityExample = {
  inputs: { concrete_temp_f: 50, hours: 168, datum_f: 32, q_kelvin: 5000, ref_temp_f: 68, target_ttf_c: 1600 },
};

const _renderConcreteMaturity = _simpleRenderer({
  citation: "Citation: ASTM C1074 maturity method. Nurse-Saul time-temperature factor M = Sum (Ta - T0) x dt in deg C-hr, evaluated here over one constant-temperature interval; recommended datum T0 = 0 C (32 F) for Type I cement without admixtures cured 0 to 40 C, otherwise per the C1074 datum procedure. Arrhenius equivalent age te = exp(-Q x (1/Ta - 1/Tr)) x t with temperatures in kelvin; Q = 5000 K for Type I without admixtures and Tr = 20 C (68 F) traditional per C1074 (23 C also permissible; both editable). The strength a TTF represents comes only from the lab-calibrated strength-maturity curve for the project's own mix (the C1074 procedure); compare the field TTF to that calibrated target. Intervals at or below the datum accrue no maturity. A scheduling estimate that supplements, not replaces, acceptance cylinders; the engineer of record and the project specification govern.",
  example: concreteMaturityExample.inputs,
  fields: [
    { key: "concrete_temp_f", label: "Average concrete temperature (F)", kind: "number", attrs: { step: "any" } },
    { key: "hours", label: "Elapsed curing time (hours)", kind: "number", attrs: { step: "any" } },
    { key: "datum_f", label: "Datum temperature T0 (F)", kind: "number", default: 32, attrs: { step: "any" } },
    { key: "q_kelvin", label: "Arrhenius constant Q (K)", kind: "number", default: 5000 },
    { key: "ref_temp_f", label: "Reference temperature Tr (F)", kind: "number", default: 68, attrs: { step: "any" } },
    { key: "target_ttf_c", label: "Target TTF (deg C-hr, 0 = none)", kind: "number", default: 1600 },
  ],
  outputs: [
    { key: "mc", id: "cmat-out-mc", label: "Maturity index (TTF)", value: (r) => _fmtC(r.M_c, 0) + " deg C-hr" },
    { key: "mf", id: "cmat-out-mf", label: "TTF in F-hr", value: (r) => _fmtC(r.M_f, 0) + " deg F-hr" },
    { key: "te", id: "cmat-out-te", label: "Equivalent age at Tr", value: (r) => _fmtC(r.te_days, 2) + " days (" + _fmtC(r.te_hours, 1) + " hr)" },
    { key: "tt", id: "cmat-out-tt", label: "Time to target TTF", value: (r) => r.target_hours === null ? "(no target set)" : _fmtC(r.target_hours, 1) + " hr (" + _fmtC(r.target_days, 2) + " days)" },
  ],
  compute: computeConcreteMaturity,
});
CONSTRUCTION_RENDERERS["concrete-maturity"] = _renderConcreteMaturity;

// ----- spec-v251: Allowable Building Area per Story (IBC 2021 Chapter 5) -----

// dims: in { tabular_area: L^2, ns_area: L^2, frontage_ft: L, perimeter_ft: L, open_width_ft: L, actual_area: L^2 } out: { frontage_if: dimensionless, allowable: L^2 }
export function computeAllowableArea({ tabular_area = 0, ns_area = 0, frontage_ft = 0, perimeter_ft = 0, open_width_ft = 30, actual_area = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(tabular_area > 0)) return { error: "Tabular area At must be positive (ft^2)." };
  if (!(perimeter_ft > 0)) return { error: "Building perimeter must be positive (ft)." };
  if (ns_area < 0 || frontage_ft < 0 || open_width_ft < 0 || actual_area < 0) return { error: "Area, frontage, and width cannot be negative." };
  if (frontage_ft > perimeter_ft) return { error: "Frontage F cannot exceed the perimeter P." };
  const w_eff = Math.min(open_width_ft, 30);
  const ratio = frontage_ft / perimeter_ft;
  // §506.3.1: no increase unless 25% or more of the perimeter fronts open space.
  const frontage_if = ratio < 0.25 ? 0 : (ratio - 0.25) * (w_eff / 30);
  const allowable = tabular_area + ns_area * frontage_if;
  return { w_eff, ratio, frontage_if, allowable, pass: actual_area <= allowable, margin: allowable - actual_area };
}

export const allowableAreaExample = {
  inputs: { tabular_area: 27000, ns_area: 9000, frontage_ft: 200, perimeter_ft: 400, open_width_ft: 30, actual_area: 25000 },
};

const _renderAllowableArea = _simpleRenderer({
  citation: "Citation: IBC 2021 §506.2 (Aa = At + NS x If), §506.3.1 (If = 0 unless F/P >= 0.25 on open space 20 ft or wider), §506.3.2 (If = [F/P - 0.25] x W/30), §506.3.3 (W capped at 30 ft in the equation). At and NS come from Table 506.2 for the actual occupancy group and construction type in the correct sprinkler column (NS nonsprinklered, S1 single-story sprinklered, SM multistory). A mixed-occupancy or multistory building uses the §506.2.2 / §508.4 sum-of-ratios and the §506.2.3 story multiplier instead of this single-occupancy single-story form. A feasibility aid, not a code-official determination.",
  example: allowableAreaExample.inputs,
  fields: [
    { key: "tabular_area", label: "Tabular area At (ft^2, correct column)", kind: "number" },
    { key: "ns_area", label: "Nonsprinklered area NS (ft^2)", kind: "number" },
    { key: "frontage_ft", label: "Open-frontage length F (ft)", kind: "number" },
    { key: "perimeter_ft", label: "Total perimeter P (ft)", kind: "number" },
    { key: "open_width_ft", label: "Open-space width W (ft)", kind: "number", default: 30 },
    { key: "actual_area", label: "Proposed story area (ft^2)", kind: "number" },
  ],
  outputs: [
    { key: "if", id: "ala-out-if", label: "Frontage factor If", value: (r) => _fmtC(r.frontage_if, 3) },
    { key: "aa", id: "ala-out-aa", label: "Allowable area / story", value: (r) => _fmtC(r.allowable, 0) + " ft^2" },
    { key: "pf", id: "ala-out-pf", label: "Proposed area", value: (r) => r.pass ? "PASS (" + _fmtC(r.margin, 0) + " ft^2 to spare)" : "FAIL (over by " + _fmtC(-r.margin, 0) + " ft^2)" },
  ],
  compute: computeAllowableArea,
});
CONSTRUCTION_RENDERERS["allowable-area"] = _renderAllowableArea;

// ----- spec-v252: Egress Travel Distance, Common Path, and Dead-End Check (IBC 2021 Chapter 10) -----

// dims: in { travel_ft: L, travel_limit_ft: L, common_path_ft: L, common_path_limit_ft: L, dead_end_ft: L, dead_end_limit_ft: L } out: { margin_travel: L, margin_common: L, margin_deadend: L }
export function computeEgressTravelDistance({ travel_ft = 0, travel_limit_ft = 300, common_path_ft = 0, common_path_limit_ft = 100, dead_end_ft = 0, dead_end_limit_ft = 50 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (travel_ft < 0 || common_path_ft < 0 || dead_end_ft < 0) return { error: "Measured distances cannot be negative (ft)." };
  if (!(travel_limit_ft > 0) || !(common_path_limit_ft > 0) || !(dead_end_limit_ft > 0)) return { error: "Limits must be positive (ft)." };
  const pass_travel = travel_ft <= travel_limit_ft;
  const pass_common = common_path_ft <= common_path_limit_ft;
  const pass_deadend = dead_end_ft <= dead_end_limit_ft;
  return {
    pass_travel, pass_common, pass_deadend,
    pass: pass_travel && pass_common && pass_deadend,
    margin_travel: travel_limit_ft - travel_ft,
    margin_common: common_path_limit_ft - common_path_ft,
    margin_deadend: dead_end_limit_ft - dead_end_ft,
  };
}

export const egressTravelDistanceExample = {
  inputs: { travel_ft: 240, travel_limit_ft: 300, common_path_ft: 68, common_path_limit_ft: 100, dead_end_ft: 18, dead_end_limit_ft: 50 },
};

const _renderEgressTravelDistance = _simpleRenderer({
  citation: "Citation: IBC 2021 §1017 / Table 1017.2 (maximum exit-access travel distance), §1006.2.1 / Table 1006.2.1 (common path of egress travel), §1020.5 (dead-end corridor). Defaults are a sprinklered Group B floor (travel 300 ft, common path 100 ft, dead-end 50 ft). Each limit depends on the occupancy group and whether the building is sprinklered per §903.3.1.1; travel distance is measured along the natural path of travel around obstructions, not in a straight line; common-path and dead-end limits tighten for higher-hazard uses and above the §1006.2.1 occupant-load thresholds. A design aid, not a code-official determination.",
  example: egressTravelDistanceExample.inputs,
  fields: [
    { key: "travel_ft", label: "Measured travel distance (ft)", kind: "number" },
    { key: "travel_limit_ft", label: "Travel limit, Table 1017.2 (ft)", kind: "number", default: 300 },
    { key: "common_path_ft", label: "Measured common path (ft)", kind: "number" },
    { key: "common_path_limit_ft", label: "Common-path limit (ft)", kind: "number", default: 100 },
    { key: "dead_end_ft", label: "Longest dead-end corridor (ft)", kind: "number" },
    { key: "dead_end_limit_ft", label: "Dead-end limit, §1020.5 (ft)", kind: "number", default: 50 },
  ],
  outputs: [
    { key: "t", id: "etd-out-t", label: "Travel distance", value: (r) => (r.pass_travel ? "PASS" : "FAIL") + " (" + _fmtC(r.margin_travel, 0) + " ft margin)" },
    { key: "c", id: "etd-out-c", label: "Common path", value: (r) => (r.pass_common ? "PASS" : "FAIL") + " (" + _fmtC(r.margin_common, 0) + " ft margin)" },
    { key: "d", id: "etd-out-d", label: "Dead-end corridor", value: (r) => (r.pass_deadend ? "PASS" : "FAIL") + " (" + _fmtC(r.margin_deadend, 0) + " ft margin)" },
    { key: "o", id: "etd-out-o", label: "Overall", value: (r) => r.pass ? "PASS (all three)" : "FAIL" },
  ],
  compute: computeEgressTravelDistance,
});
CONSTRUCTION_RENDERERS["egress-travel-distance"] = _renderEgressTravelDistance;

// ----- spec-v253: Exterior Wall Opening Protection by Fire Separation Distance (IBC 2021 Table 705.8) -----

// dims: in { fsd_ft: L, wall_area: L^2, actual_opening: L^2 } out: { allowable_pct: dimensionless, allowable_area: L^2 }
export function computeExteriorOpeningProtection({ fsd_ft = 0, wall_area = 0, protected: prot = false, actual_opening = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (fsd_ft < 0) return { error: "Fire separation distance cannot be negative (ft)." };
  if (!(wall_area > 0)) return { error: "Wall area must be positive (ft^2)." };
  if (actual_opening < 0) return { error: "Opening area cannot be negative (ft^2)." };
  const p = prot === true || prot === "yes" || prot === "true";
  let band;
  if (fsd_ft < 3) band = 0;
  else if (fsd_ft < 5) band = p ? 0.15 : 0;
  else if (fsd_ft < 10) band = p ? 0.25 : 0.10;
  else if (fsd_ft < 15) band = p ? 0.45 : 0.15;
  else if (fsd_ft < 20) band = p ? 0.75 : 0.25;
  else if (fsd_ft < 25) band = p ? Infinity : 0.45;
  else if (fsd_ft < 30) band = p ? Infinity : 0.70;
  else band = Infinity;
  const no_limit = band === Infinity;
  const allowable_pct = no_limit ? Infinity : band * 100;
  const allowable_area = no_limit ? Infinity : band * wall_area;
  const pass = no_limit ? true : actual_opening <= allowable_area;
  return { protected: p, no_limit, allowable_pct, allowable_area, pass };
}

export const exteriorOpeningProtectionExample = {
  inputs: { fsd_ft: 8, wall_area: 1200, protected: true, actual_opening: 240 },
};

function _renderExteriorOpeningProtection(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IBC 2021 Table 705.8 (maximum area of exterior wall openings), keyed by fire separation distance and by protection / sprinkler status: <3 ft none; 3 to <5 ft 15% protected else none; 5 to <10 ft 25% / 10%; 10 to <15 ft 45% / 15%; 15 to <20 ft 75% / 25%; 20 to <25 ft no limit / 45%; 25 to <30 ft no limit / 70%; >=30 ft no limit. The FSD is measured per §705.3 to the lot line, the centerline of a public way, or an imaginary line between buildings; unprotected openings in a sprinklered building take the protected allowance (Note a). The §705.8.5 vertical-separation and §705.8.6 rules can further govern. A design aid, not a code-official determination.";
  _aeC(inputRegion, () => fillExample(exteriorOpeningProtectionExample.inputs));
  const fsd = _mnC("Fire separation distance (ft)", "eop-fsd", { step: "any", min: "0" });
  const wa = _mnC("Exterior wall area (ft^2)", "eop-wa", { step: "any", min: "0" });
  const pr = _msC("Protected openings / sprinklered", "eop-pr", [{ value: "no", label: "No (unprotected, nonsprinklered)" }, { value: "yes", label: "Yes (protected or sprinklered)" }]);
  const ao = _mnC("Proposed opening area (ft^2)", "eop-ao", { step: "any", min: "0" });
  for (const f of [fsd, wa, pr, ao]) inputRegion.appendChild(f.wrap);
  const oP = _moC(outputRegion, "Allowable opening %", "eop-out-p");
  const oA = _moC(outputRegion, "Allowable opening area", "eop-out-a");
  const oR = _moC(outputRegion, "Proposed openings", "eop-out-r");
  function fillExample(x) { fsd.input.value = x.fsd_ft; wa.input.value = x.wall_area; pr.select.value = x.protected ? "yes" : "no"; ao.input.value = x.actual_opening; update(); }
  const update = _debC(() => {
    const r = computeExteriorOpeningProtection({ fsd_ft: Number(fsd.input.value) || 0, wall_area: Number(wa.input.value) || 0, protected: pr.select.value, actual_opening: Number(ao.input.value) || 0 });
    if (r.error) { oP.textContent = r.error; oA.textContent = "-"; oR.textContent = "-"; return; }
    oP.textContent = r.no_limit ? "no limit" : _fmtC(r.allowable_pct, 0) + "%";
    oA.textContent = r.no_limit ? "no limit" : _fmtC(r.allowable_area, 0) + " ft^2";
    oR.textContent = r.pass ? "PASS" : "FAIL (exceeds allowance)";
  }, _DC);
  for (const f of [fsd.input, wa.input, pr.select, ao.input]) f.addEventListener("input", update);
}
CONSTRUCTION_RENDERERS["exterior-opening-protection"] = _renderExteriorOpeningProtection;

// ----- spec-v263: Wood Bending Member (NDS Adjusted Bending Value Fb' and Beam Stability Factor CL) -----

// dims: in { fb_star_psi: M L^-1 T^-2, emin_psi: M L^-1 T^-2, b_in: L, d_in: L, le_in: L } out: { rb: dimensionless, fbe_psi: M L^-1 T^-2, cl: dimensionless, fb_prime_psi: M L^-1 T^-2, s_in3: L^3, m_prime_inlb: M L^2 T^-2, m_prime_ftlb: M L^2 T^-2 }
export function computeWoodBeamBending({ fb_star_psi = 0, emin_psi = 620000, b_in = 0, d_in = 0, le_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fb_star_psi > 0)) return { error: "Fb* must be positive (psi)." };
  if (!(emin_psi > 0)) return { error: "Emin' must be positive (psi)." };
  if (!(b_in > 0)) return { error: "Breadth b must be positive (in)." };
  if (!(d_in > 0)) return { error: "Depth d must be positive (in)." };
  if (!(le_in > 0)) return { error: "Effective unbraced length le must be positive (in)." };
  const rb = Math.sqrt(le_in * d_in / (b_in * b_in));
  if (rb > 50) return { error: "RB exceeds the NDS slenderness limit of 50 - too slender to be a bending member." };
  const fbe = 1.20 * emin_psi / (rb * rb);
  const ratio = fbe / fb_star_psi;
  const term = (1 + ratio) / 1.9;
  let cl = term - Math.sqrt(term * term - ratio / 0.95);
  if (cl > 1) cl = 1; // the physical stability factor never exceeds 1.0
  const fb_prime = fb_star_psi * cl;
  const s_in3 = b_in * d_in * d_in / 6;
  const m_prime_inlb = fb_prime * s_in3;
  return { rb, fbe_psi: fbe, ratio, cl, fb_prime_psi: fb_prime, s_in3, m_prime_inlb, m_prime_ftlb: m_prime_inlb / 12 };
}

export const woodBeamBendingExample = {
  inputs: { fb_star_psi: 1350, emin_psi: 620000, b_in: 3.5, d_in: 11.25, le_in: 144 },
};

const _renderWoodBeamBending = _simpleRenderer({
  citation: "Citation: NDS 3.3.3 beam stability factor CL for a solid rectangular sawn-lumber bending member bent about its strong axis: RB = sqrt(le x d / b^2) (<= 50), FbE = 1.20 x Emin' / RB^2, CL = (1 + FbE/Fb*)/1.9 - sqrt(((1 + FbE/Fb*)/1.9)^2 - (FbE/Fb*)/0.95), Fb' = Fb* x CL, M' = Fb' x S with S = b d^2 / 6. Fb* is the reference bending value already multiplied by every applicable adjustment factor except CL itself (the user supplies it; the reference values and CD, CM, Ct, CF, Cfu, Ci, Cr come from the NDS Supplement for the actual species, grade, and service condition); le is the effective unbraced length of the compression edge from NDS Table 3.3.3 (not the clear span). Emin' default 620,000 psi (a common visually-graded Douglas Fir-Larch reference minimum modulus). Strong-axis bending only; does not cover the glulam volume factor CV, biaxial bending, or combined bending-plus-axial. A design aid, not a substitute for the engineer of record.",
  example: woodBeamBendingExample.inputs,
  fields: [
    { key: "fb_star_psi", label: "Fb* (reference bending x factors except CL) (psi)", kind: "number" },
    { key: "emin_psi", label: "Emin' (psi)", kind: "number", default: 620000 },
    { key: "b_in", label: "Breadth b (in)", kind: "number" },
    { key: "d_in", label: "Depth d (in)", kind: "number" },
    { key: "le_in", label: "Effective unbraced length le (in)", kind: "number" },
  ],
  outputs: [
    { key: "rb", id: "wbb-out-rb", label: "Slenderness RB", value: (r) => _fmtC(r.rb, 2) },
    { key: "fbe", id: "wbb-out-fbe", label: "Critical FbE", value: (r) => _fmtC(r.fbe_psi, 0) + " psi" },
    { key: "cl", id: "wbb-out-cl", label: "Stability factor CL", value: (r) => _fmtC(r.cl, 3) },
    { key: "fbp", id: "wbb-out-fbp", label: "Adjusted Fb'", value: (r) => _fmtC(r.fb_prime_psi, 0) + " psi" },
    { key: "mp", id: "wbb-out-mp", label: "Allowable moment M'", value: (r) => _fmtC(r.m_prime_ftlb, 0) + " ft-lb (" + _fmtC(r.m_prime_inlb, 0) + " in-lb)" },
  ],
  compute: computeWoodBeamBending,
});
CONSTRUCTION_RENDERERS["wood-beam-bending"] = _renderWoodBeamBending;

// ----- spec-v264: Wood Bending Member Shear (Rectangular fv and the NDS Tension-Side End-Notch Reduction) -----

// dims: in { fv_prime_psi: M L^-1 T^-2, b_in: L, d_in: L, dn_in: L, v_applied_lb: M L T^-2 } out: { vr_lb: M L T^-2, ratio: dimensionless, vr_notch_lb: M L T^-2, fv_psi: M L^-1 T^-2, dcr: dimensionless }
export function computeWoodBeamShear({ fv_prime_psi = 0, b_in = 0, d_in = 0, dn_in = 0, v_applied_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fv_prime_psi > 0)) return { error: "Fv' must be positive (psi)." };
  if (!(b_in > 0)) return { error: "Breadth b must be positive (in)." };
  if (!(d_in > 0)) return { error: "Full depth d must be positive (in)." };
  if (!(dn_in > 0)) return { error: "Net depth dn must be positive (in)." };
  if (dn_in > d_in) return { error: "Net depth dn cannot exceed the full depth d (a notch cannot be deeper than the beam)." };
  if (v_applied_lb < 0) return { error: "Applied shear cannot be negative (lb)." };
  const vr = (2 / 3) * fv_prime_psi * b_in * d_in;
  const ratio = dn_in / d_in;
  const vr_notch = (2 / 3) * fv_prime_psi * b_in * dn_in * ratio * ratio;
  const fv = v_applied_lb > 0 ? 3 * v_applied_lb / (2 * b_in * dn_in) : null;
  const dcr = v_applied_lb > 0 ? v_applied_lb / vr_notch : null;
  return { vr_lb: vr, ratio, vr_notch_lb: vr_notch, fv_psi: fv, dcr };
}

export const woodBeamShearExample = {
  inputs: { fv_prime_psi: 180, b_in: 3.5, d_in: 11.25, dn_in: 9.25, v_applied_lb: 2000 },
};

const _renderWoodBeamShear = _simpleRenderer({
  citation: "Citation: NDS 3.4.2 rectangular-section shear stress fv = 3V / (2 b d), and the NDS 3.4.3.2 tension-side end-notch rule V' = (2/3) Fv' b dn (dn/d)^2 for a notch on the tension side at the end of a bending member. Fv' is the reference shear value already multiplied by every applicable adjustment factor (the user supplies it; the reference Fv and the factors come from the NDS Supplement for the actual species, grade, and service condition). Tension-side end-notch case only; does not cover compression-side notches (a different rule), notches away from the support, sloped / bevel / round notches, or the Cvr shear-reduction factor for members with connections in the shear zone. Loads within a distance d of the support may be neglected in V per NDS 3.4.3.1 (the user applies that to the input). A design aid, not a substitute for the engineer of record.",
  example: woodBeamShearExample.inputs,
  fields: [
    { key: "fv_prime_psi", label: "Adjusted shear value Fv' (psi)", kind: "number" },
    { key: "b_in", label: "Breadth b (in)", kind: "number" },
    { key: "d_in", label: "Full depth d (in)", kind: "number" },
    { key: "dn_in", label: "Net depth at notch dn (dn = d if un-notched) (in)", kind: "number" },
    { key: "v_applied_lb", label: "Applied end shear V (lb, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "vr", id: "wbs-out-vr", label: "Un-notched allowable Vr", value: (r) => _fmtC(r.vr_lb, 0) + " lb" },
    { key: "ra", id: "wbs-out-ra", label: "Depth ratio dn/d", value: (r) => _fmtC(r.ratio, 3) },
    { key: "vn", id: "wbs-out-vn", label: "Notched allowable Vr'", value: (r) => _fmtC(r.vr_notch_lb, 0) + " lb" },
    { key: "fv", id: "wbs-out-fv", label: "Actual stress fv", value: (r) => r.fv_psi === null ? "-" : _fmtC(r.fv_psi, 1) + " psi" },
    { key: "dc", id: "wbs-out-dc", label: "Demand / capacity", value: (r) => r.dcr === null ? "-" : _fmtC(r.dcr, 2) + (r.dcr > 1 ? " (OVERSTRESS)" : "") },
  ],
  compute: computeWoodBeamShear,
});
CONSTRUCTION_RENDERERS["wood-beam-shear"] = _renderWoodBeamShear;

// ----- spec-v265: Single-Shear Bolted/Dowel Lateral Design Value (NDS Yield-Limit Z) -----

// dims: in { d_in: L, lm_in: L, ls_in: L, gm: dimensionless, gs: dimensionless, fyb_psi: M L^-1 T^-2, theta_deg: dimensionless } out: { fem_psi: M L^-1 T^-2, fes_psi: M L^-1 T^-2, re: dimensionless, rt: dimensionless, ktheta: dimensionless, k1: dimensionless, k2: dimensionless, k3: dimensionless, z_im: M L T^-2, z_is: M L T^-2, z_ii: M L T^-2, z_iiim: M L T^-2, z_iiis: M L T^-2, z_iv: M L T^-2, z_lb: M L T^-2 }
export function computeWoodBoltConnection({ d_in = 0, lm_in = 0, ls_in = 0, gm = 0.50, gs = 0.50, fyb_psi = 45000, theta_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(d_in > 0)) return { error: "Bolt diameter D must be positive (in)." };
  if (!(lm_in > 0)) return { error: "Main-member bearing length lm must be positive (in)." };
  if (!(ls_in > 0)) return { error: "Side-member bearing length ls must be positive (in)." };
  if (!(gm > 0 && gm < 1)) return { error: "Main-member specific gravity Gm must be between 0 and 1." };
  if (!(gs > 0 && gs < 1)) return { error: "Side-member specific gravity Gs must be between 0 and 1." };
  if (!(fyb_psi > 0)) return { error: "Bolt bending yield Fyb must be positive (psi)." };
  if (!(theta_deg >= 0 && theta_deg <= 90)) return { error: "Angle to grain must be between 0 and 90 degrees." };
  const t = theta_deg * Math.PI / 180;
  const feAt = (G) => {
    const fpar = 11200 * G;
    const fperp = 6100 * Math.pow(G, 1.45) / Math.sqrt(d_in);
    return fpar * fperp / (fpar * Math.sin(t) ** 2 + fperp * Math.cos(t) ** 2);
  };
  const fem = feAt(gm);
  const fes = feAt(gs);
  const re = fem / fes;
  const rt = lm_in / ls_in;
  const ktheta = 1 + 0.25 * (theta_deg / 90);
  const k1 = (Math.sqrt(re + 2 * re * re * (1 + rt + rt * rt) + rt * rt * re * re * re) - re * (1 + rt)) / (1 + re);
  const k2 = -1 + Math.sqrt(2 * (1 + re) + (2 * fyb_psi * (1 + 2 * re) * d_in * d_in) / (3 * fem * lm_in * lm_in));
  const k3 = -1 + Math.sqrt(2 * (1 + re) / re + (2 * fyb_psi * (2 + re) * d_in * d_in) / (3 * fem * ls_in * ls_in));
  const z_im = d_in * lm_in * fem / (4.0 * ktheta);
  const z_is = d_in * ls_in * fes / (4.0 * ktheta);
  const z_ii = k1 * d_in * ls_in * fes / (3.6 * ktheta);
  const z_iiim = k2 * d_in * lm_in * fem / ((1 + 2 * re) * 3.2 * ktheta);
  const z_iiis = k3 * d_in * ls_in * fem / ((2 + re) * 3.2 * ktheta);
  const z_iv = (d_in * d_in / (3.2 * ktheta)) * Math.sqrt(2 * fem * fyb_psi / (3 * (1 + re)));
  const modes = [["Im", z_im], ["Is", z_is], ["II", z_ii], ["IIIm", z_iiim], ["IIIs", z_iiis], ["IV", z_iv]];
  let z = Infinity, gov = null;
  for (const [name, val] of modes) { if (val < z) { z = val; gov = name; } }
  return { fem_psi: fem, fes_psi: fes, re, rt, ktheta, k1, k2, k3, z_im, z_is, z_ii, z_iiim, z_iiis, z_iv, z_lb: z, governing_mode: gov };
}

export const woodBoltConnectionExample = {
  inputs: { d_in: 0.5, lm_in: 3.5, ls_in: 1.5, gm: 0.50, gs: 0.50, fyb_psi: 45000, theta_deg: 0 },
};

const _renderWoodBoltConnection = _simpleRenderer({
  citation: "Citation: NDS Table 12.3.1A single-shear yield-limit equations (modes Im, Is, II, IIIm, IIIs, IV with coefficients k1, k2, k3), the dowel bearing strengths Fe|| = 11,200 G and Fe_perp = 6,100 G^1.45 / sqrt(D) (NDS 12.3.3) blended by the Hankinson formula, and the reduction terms Rd = (4, 3.6, 3.2) x Ktheta with Ktheta = 1 + 0.25(theta/90) for 1/4 in <= D <= 1 in bolts (NDS Table 12.3.1B). Defaults (editable): Fyb 45,000 psi, Gm = Gs = 0.50 (Douglas Fir-Larch / Southern Pine band), theta = 0 (load parallel to grain). This is the reference lateral design value Z of a single fastener in single shear (two members) before the adjustment factors of NDS Table 11.3.1 (CD, CM, Ct, group action Cg, geometry C_delta, end grain Ceg) and before any group / row multiplication (the user applies those). The 1/4..1 in band selects the bolt reduction terms and excludes small-dowel nails / screws and the spacing / end-and-edge-distance geometry checks. A design aid, not a substitute for the engineer of record.",
  example: woodBoltConnectionExample.inputs,
  fields: [
    { key: "d_in", label: "Bolt diameter D (1/4 to 1 in) (in)", kind: "number" },
    { key: "lm_in", label: "Main-member bearing length lm (in)", kind: "number" },
    { key: "ls_in", label: "Side-member bearing length ls (in)", kind: "number" },
    { key: "gm", label: "Main-member specific gravity Gm", kind: "number", default: 0.50 },
    { key: "gs", label: "Side-member specific gravity Gs", kind: "number", default: 0.50 },
    { key: "fyb_psi", label: "Bolt bending yield Fyb (psi)", kind: "number", default: 45000 },
    { key: "theta_deg", label: "Angle of load to grain theta (0 to 90 deg)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "im", id: "wbc-out-im", label: "Mode Im", value: (r) => _fmtC(r.z_im, 0) + " lb" },
    { key: "is", id: "wbc-out-is", label: "Mode Is", value: (r) => _fmtC(r.z_is, 0) + " lb" },
    { key: "ii", id: "wbc-out-ii", label: "Mode II", value: (r) => _fmtC(r.z_ii, 0) + " lb" },
    { key: "iiim", id: "wbc-out-iiim", label: "Mode IIIm", value: (r) => _fmtC(r.z_iiim, 0) + " lb" },
    { key: "iiis", id: "wbc-out-iiis", label: "Mode IIIs", value: (r) => _fmtC(r.z_iiis, 0) + " lb" },
    { key: "iv", id: "wbc-out-iv", label: "Mode IV", value: (r) => _fmtC(r.z_iv, 0) + " lb" },
    { key: "z", id: "wbc-out-z", label: "Governing Z", value: (r) => _fmtC(r.z_lb, 0) + " lb (mode " + r.governing_mode + ")" },
  ],
  compute: computeWoodBoltConnection,
});
CONSTRUCTION_RENDERERS["wood-bolt-connection"] = _renderWoodBoltConnection;

// ===================== spec-v290..v292: NDS wood-member depth batch =====================
// The checks the wood bending/shear/compression/connection bench left open:
// bearing perpendicular to grain at a support (3.10), tension parallel to
// grain on the net section (3.8), and the beam-column interaction (3.9.2).

// dims: in { r_lb: M L T^-2, b_in: L, lb_in: L, fcperp_psi: M L^-1 T^-2, near_end: dimensionless } out: { cb_f: dimensionless, fcperp_adj_psi: M L^-1 T^-2, fc_perp_psi: M L^-1 T^-2, dcr: dimensionless, lb_req_in: L }
export function computeWoodBearingPerpendicular({ r_lb = 0, b_in = 0, lb_in = 0, fcperp_psi = 625, near_end = "no" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(r_lb > 0)) return { error: "Bearing reaction must be positive (lb)." };
  if (!(b_in > 0) || !(lb_in > 0)) return { error: "Bearing width and length must be positive (in)." };
  if (!(fcperp_psi > 0)) return { error: "The Fc-perp design value must be positive (psi)." };
  const cb_applies = lb_in < 6 && near_end !== "yes";
  const cb_f = cb_applies ? (lb_in + 0.375) / lb_in : 1.0;
  const cb_flag = cb_applies ? "Cb applies (bearing under 6 in, not within 3 in of the end)" : "Cb = 1.0 (bearing 6 in or longer, or within 3 in of the member end)";
  const fcperp_adj_psi = fcperp_psi * cb_f;
  const fc_perp_psi = r_lb / (b_in * lb_in);
  const dcr = fc_perp_psi / fcperp_adj_psi;
  const lb_req_in = r_lb / (b_in * fcperp_psi);
  return {
    cb_f, cb_flag, fcperp_adj_psi, fc_perp_psi, dcr, lb_req_in,
    note: "NDS 3.10.2 bearing perpendicular to grain: fc_perp = R / (b x lb) against Fc_perp' = Fc_perp x Cb, with the 3.10.4 bearing-area factor Cb = (lb + 0.375) / lb for a bearing under 6 in and not within 3 in of the member end (1.0 otherwise). The required length reported uses Cb = 1 (conservative). Fc_perp is not adjusted by the load-duration factor CD; enter it already carrying wet-service CM / temperature Ct if they apply. Angle-to-grain bearing (Hankinson), the member's bending and shear, and the 0.04 in deformation-limit alternative are separate. A design aid, not a substitute for the engineer of record.",
  };
}
export const woodBearingPerpendicularExample = { inputs: { r_lb: 800, b_in: 1.5, lb_in: 1.5, fcperp_psi: 625, near_end: "no" } };

const _renderWoodBearingPerpendicular = _simpleRenderer({
  citation: "Citation: NDS 2018 3.10.2 bearing stress fc_perp = R/(b lb) against Fc_perp' = Fc_perp x Cb, with the 3.10.4 bearing-area factor Cb = (lb + 0.375)/lb for bearings under 6 in not within 3 in of the end, by name. Fc_perp takes no CD. A design aid, not a substitute for the engineer of record.",
  example: woodBearingPerpendicularExample.inputs,
  fields: [
    { key: "r_lb", label: "Reaction / bearing force (lb)", kind: "number" },
    { key: "b_in", label: "Bearing width b (in)", kind: "number" },
    { key: "lb_in", label: "Bearing length lb (in)", kind: "number" },
    { key: "fcperp_psi", label: "Reference Fc-perp (psi)", kind: "number", default: 625 },
    { key: "near_end", label: "Within 3 in of the member end?", kind: "select", options: [
      { value: "no", label: "No - Cb may apply" },
      { value: "yes", label: "Yes - Cb = 1.0" },
    ], default: "no" },
  ],
  outputs: [
    { key: "cb", id: "wbp-out-cb", label: "Bearing-area factor Cb", value: (r) => fmt(r.cb_f, 3) + " (" + r.cb_flag + ")" },
    { key: "fa", id: "wbp-out-fa", label: "Adjusted Fc-perp'", value: (r) => fmt(r.fcperp_adj_psi, 0) + " psi" },
    { key: "fs", id: "wbp-out-fs", label: "Applied bearing stress", value: (r) => fmt(r.fc_perp_psi, 0) + " psi" },
    { key: "dcr", id: "wbp-out-dcr", label: "Demand / capacity", value: (r) => fmt(r.dcr, 2) + (r.dcr > 1 ? " (OVER - add bearing length or a plate)" : "") },
    { key: "req", id: "wbp-out-req", label: "Required bearing length (Cb = 1)", value: (r) => fmt(r.lb_req_in, 2) + " in" },
    { key: "n", id: "wbp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWoodBearingPerpendicular,
});
CONSTRUCTION_RENDERERS["wood-bearing-perpendicular"] = _renderWoodBearingPerpendicular;

// dims: in { t_lb: M L T^-2, b_in: L, d_in: L, dh_in: L, nh: dimensionless, ft_psi: M L^-1 T^-2, cd_f: dimensionless, cf_f: dimensionless } out: { ag_in2: L^2, an_in2: L^2, ft_adj_psi: M L^-1 T^-2, ft_applied_psi: M L^-1 T^-2, dcr: dimensionless }
export function computeWoodTensionMember({ t_lb = 0, b_in = 0, d_in = 0, dh_in = 0, nh = 0, ft_psi = 575, cd_f = 1.0, cf_f = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(t_lb > 0)) return { error: "Tension force must be positive (lb)." };
  if (!(b_in > 0) || !(d_in > 0)) return { error: "Member width and depth must be positive (in)." };
  if (dh_in < 0) return { error: "Hole diameter cannot be negative (in)." };
  if (nh < 0 || !Number.isInteger(nh)) return { error: "Hole count must be a whole number (0 for none)." };
  if (!(ft_psi > 0)) return { error: "The tension design value Ft must be positive (psi)." };
  if (!(cd_f > 0) || !(cf_f > 0)) return { error: "The CD and CF factors must be positive (1.0 base)." };
  const ag_in2 = b_in * d_in;
  const an_in2 = ag_in2 - nh * dh_in * b_in;
  if (!(an_in2 > 0)) return { error: "The fastener holes consume the whole section - the net area must be positive." };
  const ft_adj_psi = ft_psi * cd_f * cf_f;
  const ft_applied_psi = t_lb / an_in2;
  const dcr = ft_applied_psi / ft_adj_psi;
  return {
    ag_in2, an_in2, ft_adj_psi, ft_applied_psi, dcr,
    note: "NDS 3.8.1 tension parallel to grain: ft = T / An against Ft' = Ft x CD x CF (supply the remaining CM / Ct / Ci inside the entered factors if they apply), with the net area An = b d - nh dh b deducting fastener holes in a single transverse line (no staggered-row chain). Perpendicular-to-grain tension is avoided, not checked; the fastener yield is the wood-bolt-connection tile; row/group tear-out is separate. A design aid, not a substitute for the engineer of record.",
  };
}
export const woodTensionMemberExample = { inputs: { t_lb: 3000, b_in: 1.5, d_in: 5.5, dh_in: 0.75, nh: 1, ft_psi: 575, cd_f: 1.0, cf_f: 1.3 } };

const _renderWoodTensionMember = _simpleRenderer({
  citation: "Citation: NDS 2018 3.8.1 tension parallel to grain ft = T/An <= Ft' with An = b d - nh dh b and Ft' = Ft x CD x CF, by name. Net section, single transverse hole line. The bolt itself is the wood-bolt-connection tile. A design aid, not a substitute for the engineer of record.",
  example: woodTensionMemberExample.inputs,
  fields: [
    { key: "t_lb", label: "Tension force T (lb)", kind: "number" },
    { key: "b_in", label: "Member width b (in)", kind: "number" },
    { key: "d_in", label: "Member depth d (in)", kind: "number" },
    { key: "dh_in", label: "Fastener-hole diameter (in, 0 if none)", kind: "number", default: 0 },
    { key: "nh", label: "Holes across the section", kind: "number", attrs: { step: "1", min: "0" }, default: 0 },
    { key: "ft_psi", label: "Reference Ft (psi)", kind: "number", default: 575 },
    { key: "cd_f", label: "Load-duration factor CD", kind: "number", default: 1.0 },
    { key: "cf_f", label: "Size factor CF", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "an", id: "wtm-out-an", label: "Gross / net area", value: (r) => fmt(r.ag_in2, 3) + " / " + fmt(r.an_in2, 3) + " in^2" },
    { key: "fa", id: "wtm-out-fa", label: "Adjusted Ft'", value: (r) => fmt(r.ft_adj_psi, 0) + " psi" },
    { key: "ft", id: "wtm-out-ft", label: "Applied tension stress", value: (r) => fmt(r.ft_applied_psi, 0) + " psi" },
    { key: "dcr", id: "wtm-out-dcr", label: "Demand / capacity", value: (r) => fmt(r.dcr, 2) + (r.dcr > 1 ? " (OVER)" : "") },
    { key: "n", id: "wtm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWoodTensionMember,
});
CONSTRUCTION_RENDERERS["wood-tension-member"] = _renderWoodTensionMember;

// dims: in { p_lb: M L T^-2, m_inlb: M L^2 T^-2, a_in2: L^2, s_in3: L^3, fc_adj_psi: M L^-1 T^-2, fb_adj_psi: M L^-1 T^-2, emin_adj_psi: M L^-1 T^-2, le_in: L, d_in: L } out: { fc_psi: M L^-1 T^-2, fb_psi: M L^-1 T^-2, fce_psi: M L^-1 T^-2, amplifier: dimensionless, interaction: dimensionless }
export function computeWoodCombinedBendingAxial({ p_lb = 0, m_inlb = 0, a_in2 = 0, s_in3 = 0, fc_adj_psi = 0, fb_adj_psi = 0, emin_adj_psi = 580000, le_in = 0, d_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(p_lb > 0)) return { error: "Axial compression must be positive (lb)." };
  if (m_inlb < 0) return { error: "Bending moment cannot be negative (in-lb)." };
  if (!(a_in2 > 0) || !(s_in3 > 0)) return { error: "Area and section modulus must be positive." };
  if (!(fc_adj_psi > 0) || !(fb_adj_psi > 0)) return { error: "The adjusted Fc' and Fb' must be positive (psi)." };
  if (!(emin_adj_psi > 0)) return { error: "The adjusted Emin' must be positive (psi)." };
  if (!(le_in > 0) || !(d_in > 0)) return { error: "Effective length and depth must be positive (in)." };
  const fc_psi = p_lb / a_in2;
  const fb_psi = m_inlb / s_in3;
  const slr = le_in / d_in;
  const fce_psi = (0.822 * emin_adj_psi) / (slr * slr);
  if (!(fc_psi < fce_psi)) return { error: "The axial stress reaches the Euler buckling stress FcE - the column buckles before the interaction applies. Shorten the unbraced length or enlarge the member." };
  const amplifier = 1 / (1 - fc_psi / fce_psi);
  const interaction = Math.pow(fc_psi / fc_adj_psi, 2) + fb_psi / (fb_adj_psi * (1 - fc_psi / fce_psi));
  const verdict = interaction <= 1.0 ? "passes (at or under 1.0)" : "FAILS the NDS 3.9.2 interaction (over 1.0)";
  return {
    fc_psi, fb_psi, fce_psi, amplifier, interaction, verdict,
    note: "NDS 3.9.2 beam-column interaction (fc/Fc')^2 + fb/[Fb'(1 - fc/FcE)] <= 1.0 with the Euler stress FcE = 0.822 Emin'/(le/d)^2; the 1 - fc/FcE term is the P-delta moment magnifier that grows without bound as the axial stress approaches FcE. Uniaxial bending plus concentric compression; enter Fc' already carrying Cp (column-buckling-wood) and Fb' already carrying CL (wood-beam-bending). Biaxial bending, the eccentric 6e/d term, and tension-plus-bending (3.9.1) are separate. A design aid, not a substitute for the engineer of record.",
  };
}
export const woodCombinedBendingAxialExample = { inputs: { p_lb: 3000, m_inlb: 3000, a_in2: 12.25, s_in3: 7.15, fc_adj_psi: 1150, fb_adj_psi: 1350, emin_adj_psi: 580000, le_in: 96, d_in: 3.5 } };

const _renderWoodCombinedBendingAxial = _simpleRenderer({
  citation: "Citation: NDS 2018 3.9.2 combined bending and axial compression (fc/Fc')^2 + fb/[Fb'(1 - fc/FcE)] <= 1.0 with FcE = 0.822 Emin'/(le/d)^2 (the P-delta amplifier), by name. Uniaxial, adjusted values entered (Cp in Fc', CL in Fb'). A design aid, not a substitute for the engineer of record.",
  example: woodCombinedBendingAxialExample.inputs,
  fields: [
    { key: "p_lb", label: "Axial compression P (lb)", kind: "number" },
    { key: "m_inlb", label: "Bending moment M (in-lb)", kind: "number" },
    { key: "a_in2", label: "Area A (in^2)", kind: "number" },
    { key: "s_in3", label: "Section modulus S (in^3)", kind: "number" },
    { key: "fc_adj_psi", label: "Adjusted Fc' (with Cp, psi)", kind: "number" },
    { key: "fb_adj_psi", label: "Adjusted Fb' (with CL, psi)", kind: "number" },
    { key: "emin_adj_psi", label: "Adjusted Emin' (psi)", kind: "number", default: 580000 },
    { key: "le_in", label: "Effective length le (in)", kind: "number" },
    { key: "d_in", label: "Depth d, bending axis (in)", kind: "number" },
  ],
  outputs: [
    { key: "st", id: "wcba-out-st", label: "Applied fc / fb", value: (r) => fmt(r.fc_psi, 0) + " / " + fmt(r.fb_psi, 0) + " psi" },
    { key: "fce", id: "wcba-out-fce", label: "Euler stress FcE", value: (r) => fmt(r.fce_psi, 0) + " psi" },
    { key: "amp", id: "wcba-out-amp", label: "P-delta amplifier 1/(1 - fc/FcE)", value: (r) => fmt(r.amplifier, 2) + "x" },
    { key: "ix", id: "wcba-out-ix", label: "Interaction (<= 1.0 passes)", value: (r) => fmt(r.interaction, 2) + " - " + r.verdict },
    { key: "n", id: "wcba-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWoodCombinedBendingAxial,
});
CONSTRUCTION_RENDERERS["wood-combined-bending-axial"] = _renderWoodCombinedBendingAxial;

// ===================== spec-v296..v298: ASCE 7 wind-and-snow load depth batch =====================
// The load cases the single velocity-pressure and flat-snow tiles never build:
// the components-and-cladding suction (Ch 30), the snow drift surcharge at a
// step or parapet (Ch 7), and the main-wind-force wall pressure (Ch 27).

// dims: in { v_mph: L T^-1, kz: dimensionless, gcp: dimensionless, kzt: dimensionless, kd: dimensionless, ke: dimensionless, gcpi: dimensionless } out: { qh_psf: M L^-1 T^-2, p_a_psf: M L^-1 T^-2, p_b_psf: M L^-1 T^-2, p_gov_psf: M L^-1 T^-2 }
export function computeWindCcPressure({ v_mph = 0, kz = 0, gcp = 0, kzt = 1.0, kd = 0.85, ke = 1.0, gcpi = 0.18 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(v_mph > 0)) return { error: "Basic wind speed must be positive (mph)." };
  if (!(kz > 0)) return { error: "The exposure coefficient Kz must be positive." };
  if (!(kzt > 0) || !(kd > 0) || !(ke > 0)) return { error: "Kzt, Kd, and Ke must be positive." };
  if (gcpi < 0) return { error: "Enter the internal pressure magnitude GCpi as a positive number (0.18 enclosed)." };
  const qh_psf = 0.00256 * kz * kzt * kd * ke * v_mph * v_mph;
  const p_a_psf = qh_psf * (gcp - gcpi);
  const p_b_psf = qh_psf * (gcp + gcpi);
  const p_gov_psf = Math.abs(p_a_psf) >= Math.abs(p_b_psf) ? p_a_psf : p_b_psf;
  return {
    qh_psf, p_a_psf, p_b_psf, p_gov_psf,
    note: "ASCE 7-22 Chapter 30 components-and-cladding design pressure p = qh [(GCp) - (GCpi)], with the velocity pressure qh = 0.00256 Kz Kzt Kd Ke V^2 (Kd = 0.85, V in mph) and GCpi = +/-0.18 for an enclosed building; both internal-pressure signs are evaluated and the larger-magnitude one governs. GCp is read from the Chapter 30 figures for the roof/wall zone and effective wind area (enter it) - a roof corner (Zone 3) draws the worst suction. This is the local cladding/fastener pressure, not the MWFRS whole-building pressure (wind-mwfrs-pressure), and it excludes the parapet/overhang special cases. A design aid, not a substitute for the engineer of record.",
  };
}
export const windCcPressureExample = { inputs: { v_mph: 115, kz: 0.90, gcp: -1.8, kzt: 1.0, kd: 0.85, ke: 1.0, gcpi: 0.18 } };

const _renderWindCcPressure = _simpleRenderer({
  citation: "Citation: ASCE 7-22 Chapter 30 C&C pressure p = qh [(GCp) - (GCpi)] with qh = 0.00256 Kz Kzt Kd Ke V^2 (Kd = 0.85) and GCpi = +/-0.18 (enclosed), by name. GCp from the Ch. 30 zone figures. Local cladding pressure, not MWFRS. A design aid, not a substitute for the engineer of record.",
  example: windCcPressureExample.inputs,
  fields: [
    { key: "v_mph", label: "Basic wind speed V (mph)", kind: "number" },
    { key: "kz", label: "Exposure coefficient Kz (mean roof ht)", kind: "number" },
    { key: "gcp", label: "External coefficient GCp (signed, zone)", kind: "number" },
    { key: "kzt", label: "Topographic factor Kzt", kind: "number", default: 1.0 },
    { key: "kd", label: "Directionality factor Kd", kind: "number", default: 0.85 },
    { key: "ke", label: "Ground-elevation factor Ke", kind: "number", default: 1.0 },
    { key: "gcpi", label: "Internal GCpi magnitude", kind: "number", default: 0.18 },
  ],
  outputs: [
    { key: "qh", id: "wcc-out-qh", label: "Velocity pressure qh", value: (r) => fmt(r.qh_psf, 1) + " psf" },
    { key: "pa", id: "wcc-out-pa", label: "With +GCpi / -GCpi", value: (r) => fmt(r.p_a_psf, 1) + " / " + fmt(r.p_b_psf, 1) + " psf" },
    { key: "pg", id: "wcc-out-pg", label: "Governing design pressure", value: (r) => fmt(r.p_gov_psf, 1) + " psf" },
    { key: "n", id: "wcc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWindCcPressure,
});
CONSTRUCTION_RENDERERS["wind-cc-pressure"] = _renderWindCcPressure;

// dims: in { lu_ft: L, pg_psf: M L^-1 T^-2, hc_ft: L } out: { gamma_pcf: M L^-2 T^-2, hd_ft: L, w_ft: L, pd_psf: M L^-1 T^-2 }
export function computeSnowDriftLoad({ lu_ft = 0, pg_psf = 0, hc_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(lu_ft > 0)) return { error: "Upwind fetch must be positive (ft)." };
  if (!(pg_psf > 0)) return { error: "Ground snow load must be positive (psf)." };
  if (hc_ft < 0) return { error: "Clear height cannot be negative (ft)." };
  const gamma_pcf = Math.min(0.13 * pg_psf + 14, 30);
  const hd_ft = Math.max(0.43 * Math.cbrt(lu_ft) * Math.pow(pg_psf + 10, 0.25) - 1.5, 0);
  let w_ft;
  if (hc_ft > 0 && hd_ft > hc_ft) {
    w_ft = Math.min((4 * hd_ft * hd_ft) / hc_ft, 8 * hc_ft);
  } else {
    w_ft = 4 * hd_ft;
  }
  const pd_psf = hd_ft * gamma_pcf;
  return {
    gamma_pcf, hd_ft, w_ft, pd_psf,
    note: "ASCE 7-22 Chapter 7 leeward snow drift: hd = 0.43 (lu)^(1/3) (pg + 10)^(1/4) - 1.5 (lu upwind fetch ft, pg ground snow psf), the density gamma = 0.13 pg + 14 <= 30 pcf, the peak surcharge pd = hd gamma at the step, and the width w = 4 hd for a full-height triangle (hd <= hc; when the drift reaches the upper roof, w = 4 hd^2/hc <= 8 hc). This is the drift surcharge riding ON TOP OF the balanced load (snow-load) - it uses the leeward form (the windward drift uses 0.75 hd and a different fetch), and excludes the sliding-snow surcharge (7.9) and the unbalanced-gable case (7.6.1). A design aid, not a substitute for the engineer of record.",
  };
}
export const snowDriftLoadExample = { inputs: { lu_ft: 100, pg_psf: 30, hc_ft: 0 } };

const _renderSnowDriftLoad = _simpleRenderer({
  citation: "Citation: ASCE 7-22 Chapter 7 leeward snow drift hd = 0.43 (lu)^(1/3) (pg + 10)^(1/4) - 1.5, density gamma = 0.13 pg + 14 <= 30 pcf, surcharge pd = hd gamma, width w = 4 hd (hd <= hc), by name. The drift on top of the balanced snow-load. A design aid, not a substitute for the engineer of record.",
  example: snowDriftLoadExample.inputs,
  fields: [
    { key: "lu_ft", label: "Upwind fetch lu (ft)", kind: "number" },
    { key: "pg_psf", label: "Ground snow load pg (psf)", kind: "number" },
    { key: "hc_ft", label: "Clear height hc to the step (ft, 0 = full triangle)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "g", id: "sdl-out-g", label: "Snow density gamma", value: (r) => fmt(r.gamma_pcf, 1) + " pcf" },
    { key: "hd", id: "sdl-out-hd", label: "Drift height hd", value: (r) => fmt(r.hd_ft, 2) + " ft" },
    { key: "w", id: "sdl-out-w", label: "Drift width w", value: (r) => fmt(r.w_ft, 1) + " ft" },
    { key: "pd", id: "sdl-out-pd", label: "Peak drift surcharge pd", value: (r) => fmt(r.pd_psf, 1) + " psf (at the step, tapering to 0)" },
    { key: "n", id: "sdl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSnowDriftLoad,
});
CONSTRUCTION_RENDERERS["snow-drift-load"] = _renderSnowDriftLoad;

// dims: in { qz_psf: M L^-1 T^-2, qh_psf: M L^-1 T^-2, cp_ww: dimensionless, cp_lw: dimensionless, g_f: dimensionless, gcpi: dimensionless } out: { p_ww_psf: M L^-1 T^-2, p_lw_psf: M L^-1 T^-2, p_net_psf: M L^-1 T^-2 }
export function computeWindMwfrsPressure({ qz_psf = 0, qh_psf = 0, cp_ww = 0.8, cp_lw = -0.5, g_f = 0.85, gcpi = 0.18 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(qz_psf > 0) || !(qh_psf > 0)) return { error: "The windward and leeward velocity pressures must be positive (psf)." };
  if (!(g_f > 0)) return { error: "The gust-effect factor G must be positive (0.85 rigid)." };
  if (gcpi < 0) return { error: "Enter the internal pressure magnitude GCpi as a positive number (0.18 enclosed)." };
  // Each wall is designed for the external pressure plus the internal-pressure
  // case that maximizes its magnitude: the inward-pushing windward wall is
  // worst with internal suction (-GCpi), the outward leeward suction is worst
  // with internal pressurization (+GCpi). The NET horizontal pressure the
  // lateral system resists is the external difference -- the internal term acts
  // equally outward on both walls and cancels in the net (ASCE 7 Ch. 27
  // commentary), so the story force is insensitive to enclosure while the
  // individual walls are not.
  const ext_ww = qz_psf * g_f * cp_ww;
  const ext_lw = qh_psf * g_f * cp_lw;
  const internal = qh_psf * gcpi;
  const p_ww_psf = ext_ww + (ext_ww >= 0 ? internal : -internal);
  const p_lw_psf = ext_lw + (ext_lw >= 0 ? internal : -internal);
  const p_net_psf = ext_ww - ext_lw;
  return {
    p_ww_psf, p_lw_psf, p_net_psf,
    note: "ASCE 7-22 Chapter 27 MWFRS wall pressure p = q G Cp - qi (GCpi), with G = 0.85 (rigid building), the wall Cp = +0.8 windward / -0.5 leeward (for L/B <= 1), and GCpi = +/-0.18 (enclosed). Each wall is reported at the internal-pressure sign that maximizes its magnitude; the net horizontal pressure the diaphragm, shear walls, and overturning anchors resist is the external difference, because the internal pressure pushes equally outward on both walls and cancels in the net (so the story force is insensitive to enclosure while the individual walls are not). Enter qz/qh from wind-pressure. Walls only - it does not compute the roof MWFRS pressures, the flexible-building Gf, or the torsional (Case 2-4) patterns. A design aid, not a substitute for the engineer of record.",
  };
}
export const windMwfrsPressureExample = { inputs: { qz_psf: 25.9, qh_psf: 25.9, cp_ww: 0.8, cp_lw: -0.5, g_f: 0.85, gcpi: 0.18 } };

const _renderWindMwfrsPressure = _simpleRenderer({
  citation: "Citation: ASCE 7-22 Chapter 27 MWFRS wall pressure p = q G Cp - qi (GCpi), G = 0.85 (rigid), Cp = +0.8 windward / -0.5 leeward, GCpi = +/-0.18 (enclosed), by name. Walls only; enter qz/qh from wind-pressure. A design aid, not a substitute for the engineer of record.",
  example: windMwfrsPressureExample.inputs,
  fields: [
    { key: "qz_psf", label: "Windward velocity pressure qz (psf)", kind: "number" },
    { key: "qh_psf", label: "Leeward velocity pressure qh (psf)", kind: "number" },
    { key: "cp_ww", label: "Windward wall Cp", kind: "number", default: 0.8 },
    { key: "cp_lw", label: "Leeward wall Cp", kind: "number", default: -0.5 },
    { key: "g_f", label: "Gust-effect factor G", kind: "number", default: 0.85 },
    { key: "gcpi", label: "Internal GCpi magnitude", kind: "number", default: 0.18 },
  ],
  outputs: [
    { key: "ww", id: "wmw-out-ww", label: "Windward wall pressure", value: (r) => fmt(r.p_ww_psf, 1) + " psf (pushing in)" },
    { key: "lw", id: "wmw-out-lw", label: "Leeward wall pressure", value: (r) => fmt(r.p_lw_psf, 1) + " psf (suction)" },
    { key: "net", id: "wmw-out-net", label: "Net horizontal design pressure", value: (r) => fmt(r.p_net_psf, 1) + " psf" },
    { key: "n", id: "wmw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWindMwfrsPressure,
});
CONSTRUCTION_RENDERERS["wind-mwfrs-pressure"] = _renderWindMwfrsPressure;

// ===================== spec-v332..v334: wood-fastener withdrawal batch =====================
// The NDS withdrawal design equations the typical-value fastener-pullout tile
// only tabulates: the nail (12.2.3), the lag screw (12.2.1), and the wood screw
// (12.2.2), each with its own empirical constant and diameter/penetration law.

// dims: in { g: dimensionless, d_in: L, p_in: L, cd: dimensionless, toenail: dimensionless } out: { w_lbin: M T^-2, z_w: M L T^-2 }
export function computeWoodNailWithdrawal({ g = 0, d_in = 0, p_in = 0, cd = 1.0, toenail = "no" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(g > 0)) return { error: "Specific gravity must be positive (0.50 DF-L, 0.42 SPF)." };
  if (!(d_in > 0)) return { error: "Nail diameter must be positive (in)." };
  if (!(p_in > 0)) return { error: "Penetration must be positive (in)." };
  if (!(cd > 0)) return { error: "The load-duration factor CD must be positive." };
  const w_lbin = 1380 * Math.pow(g, 2.5) * d_in;
  const ctn = toenail === "yes" ? 0.67 : 1.0;
  const z_w = w_lbin * p_in * cd * ctn;
  return {
    w_lbin, ctn, z_w,
    note: "NDS 12.2.3 nail/spike reference withdrawal design value W = 1,380 G^(5/2) D (lb/in), with G the specific gravity of the holding member and D the fastener diameter, and the total capacity W x p_pen times the load-duration CD and the toenail factor Ctn = 0.67 (12.5.4). Withdrawal from side grain only - withdrawal from end grain is not permitted (12.2.3.4). The toenail penalty nearly cancels the wind-duration bump, which is why toenailed uplift connections are weak and framing hardware replaces them. This does not cover lateral (shear) loading (the yield-limit model), the head pull-through, or combined withdrawal-plus-lateral. A design aid, not a substitute for the structural engineer of record's stamped design.",
  };
}
export const woodNailWithdrawalExample = { inputs: { g: 0.50, d_in: 0.162, p_in: 1.5, cd: 1.0, toenail: "no" } };

const _renderWoodNailWithdrawal = _simpleRenderer({
  citation: "Citation: NDS 2018 12.2.3 nail withdrawal W = 1,380 G^(5/2) D (lb/in), capacity W x p x CD x Ctn (Ctn = 0.67 toenailed), side grain only (no end-grain withdrawal), by name. A design aid, not a substitute for the engineer of record.",
  example: woodNailWithdrawalExample.inputs,
  fields: [
    { key: "g", label: "Specific gravity G (0.50 DF-L, 0.42 SPF)", kind: "number" },
    { key: "d_in", label: "Nail diameter D (in; 16d common = 0.162)", kind: "number" },
    { key: "p_in", label: "Penetration into holding member (in)", kind: "number" },
    { key: "cd", label: "Load-duration factor CD (1.6 wind/seismic)", kind: "number", default: 1.0 },
    { key: "toenail", label: "Toenailed? (Ctn = 0.67)", kind: "select", options: [{ value: "no", label: "No (face-nailed)" }, { value: "yes", label: "Yes (toenailed)" }], default: "no" },
  ],
  outputs: [
    { key: "w", id: "wnw-out-w", label: "Reference withdrawal W", value: (r) => fmt(r.w_lbin, 1) + " lb/in" },
    { key: "z", id: "wnw-out-z", label: "Withdrawal capacity", value: (r) => fmt(r.z_w, 0) + " lb" },
    { key: "n", id: "wnw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWoodNailWithdrawal,
});
CONSTRUCTION_RENDERERS["wood-nail-withdrawal"] = _renderWoodNailWithdrawal;

// dims: in { g: dimensionless, d_in: L, p_thread_in: L, cd: dimensionless, end_grain: dimensionless } out: { w_lbin: M T^-2, z_w: M L T^-2 }
export function computeWoodLagWithdrawal({ g = 0, d_in = 0, p_thread_in = 0, cd = 1.0, end_grain = "no" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(g > 0)) return { error: "Specific gravity must be positive (0.50 DF-L, 0.42 SPF)." };
  if (!(d_in > 0)) return { error: "Lag shank diameter must be positive (in)." };
  if (!(p_thread_in > 0)) return { error: "Thread penetration must be positive (in)." };
  if (!(cd > 0)) return { error: "The load-duration factor CD must be positive." };
  const w_lbin = 1800 * Math.pow(g, 1.5) * Math.pow(d_in, 0.75);
  const ceg = end_grain === "yes" ? 0.75 : 1.0;
  const z_w = w_lbin * p_thread_in * cd * ceg;
  return {
    w_lbin, ceg, z_w,
    note: "NDS 12.2.1 lag-screw reference withdrawal design value W = 1,800 G^(3/2) D^(3/4) (lb/in of thread penetration), with G the holding member's specific gravity and D the shank diameter, and the capacity W x p_thread times the load-duration CD and the end-grain factor Ceg = 0.75. Withdrawal scales only with the 3/4 power of diameter, so a bigger lag buys proportionally less capacity - more or deeper lags beat one fat lag. This is the withdrawal (axial) value only, not the lateral yield-limit connection or the head/washer bearing. A design aid, not a substitute for the structural engineer of record's stamped design.",
  };
}
export const woodLagWithdrawalExample = { inputs: { g: 0.50, d_in: 0.5, p_thread_in: 4, cd: 1.0, end_grain: "no" } };

const _renderWoodLagWithdrawal = _simpleRenderer({
  citation: "Citation: NDS 2018 12.2.1 lag-screw withdrawal W = 1,800 G^(3/2) D^(3/4) (lb/in), capacity W x p_thread x CD x Ceg (Ceg = 0.75 end grain), by name. Axial withdrawal only. A design aid, not a substitute for the engineer of record.",
  example: woodLagWithdrawalExample.inputs,
  fields: [
    { key: "g", label: "Specific gravity G (0.50 DF-L, 0.42 SPF)", kind: "number" },
    { key: "d_in", label: "Lag shank diameter D (in)", kind: "number" },
    { key: "p_thread_in", label: "Thread penetration (in)", kind: "number" },
    { key: "cd", label: "Load-duration factor CD", kind: "number", default: 1.0 },
    { key: "end_grain", label: "Into end grain? (Ceg = 0.75)", kind: "select", options: [{ value: "no", label: "No (side grain)" }, { value: "yes", label: "Yes (end grain)" }], default: "no" },
  ],
  outputs: [
    { key: "w", id: "wlw-out-w", label: "Reference withdrawal W", value: (r) => fmt(r.w_lbin, 0) + " lb/in" },
    { key: "z", id: "wlw-out-z", label: "Withdrawal capacity", value: (r) => fmt(r.z_w, 0) + " lb" },
    { key: "n", id: "wlw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWoodLagWithdrawal,
});
CONSTRUCTION_RENDERERS["wood-lag-withdrawal"] = _renderWoodLagWithdrawal;

// dims: in { g: dimensionless, d_in: L, p_in: L, cd: dimensionless } out: { w_lbin: M T^-2, z_w: M L T^-2 }
export function computeWoodScrewWithdrawal({ g = 0, d_in = 0, p_in = 0, cd = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(g > 0)) return { error: "Specific gravity must be positive (0.50 DF-L, 0.42 SPF)." };
  if (!(d_in > 0)) return { error: "Screw diameter must be positive (in)." };
  if (!(p_in > 0)) return { error: "Penetration must be positive (in)." };
  if (!(cd > 0)) return { error: "The load-duration factor CD must be positive." };
  const w_lbin = 2850 * g * g * d_in;
  const z_w = w_lbin * p_in * cd;
  return {
    w_lbin, z_w,
    note: "NDS 12.2.2 wood-screw reference withdrawal design value W = 2,850 G^2 D (lb/in), with G the holding member's specific gravity and D the screw diameter, and the capacity W x p times the load-duration CD. Withdrawal scales with the SQUARE of the specific gravity, so a screw that holds in Douglas Fir-Larch (G 0.50) can strip in a softer spruce (G 0.42) - about a 30% drop. This is the withdrawal (axial) value only, not the lateral connection or the head pull-through. A design aid, not a substitute for the structural engineer of record's stamped design.",
  };
}
export const woodScrewWithdrawalExample = { inputs: { g: 0.50, d_in: 0.190, p_in: 1.0, cd: 1.0 } };

const _renderWoodScrewWithdrawal = _simpleRenderer({
  citation: "Citation: NDS 2018 12.2.2 wood-screw withdrawal W = 2,850 G^2 D (lb/in), capacity W x p x CD, by name. Axial withdrawal only. A design aid, not a substitute for the engineer of record.",
  example: woodScrewWithdrawalExample.inputs,
  fields: [
    { key: "g", label: "Specific gravity G (0.50 DF-L, 0.42 SPF)", kind: "number" },
    { key: "d_in", label: "Screw diameter D (in; #10 ~ 0.190)", kind: "number" },
    { key: "p_in", label: "Penetration into holding member (in)", kind: "number" },
    { key: "cd", label: "Load-duration factor CD", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "w", id: "wsw-out-w", label: "Reference withdrawal W", value: (r) => fmt(r.w_lbin, 1) + " lb/in" },
    { key: "z", id: "wsw-out-z", label: "Withdrawal capacity", value: (r) => fmt(r.z_w, 0) + " lb" },
    { key: "n", id: "wsw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWoodScrewWithdrawal,
});
CONSTRUCTION_RENDERERS["wood-screw-withdrawal"] = _renderWoodScrewWithdrawal;

// ===================== spec-v341..v343: structural-mechanics batch =====================
// The bench-mechanics primitives the member-specific tiles (beam spans, columns,
// AISC/NDS checks) assume you already have: the cantilever's moment/shear/deflection
// (v341), a cross-section's A/I/S/r for any of four shapes (v342), and the combined
// axial+bending fiber stresses with the kern threshold (v343).

// dims: in { L_ft: L, P_lb: M L T^-2, w_plf: M T^-2, E_psi: M L^-1 T^-2, I_in4: L^4 } out: { M_lbft: M L^2 T^-2, V_lb: M L T^-2, delta_in: L }
export function computeCantileverBeam({ L_ft = 0, P_lb = 0, w_plf = 0, E_psi = 29e6, I_in4 = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(L_ft > 0)) return { error: "Cantilever length must be positive (ft)." };
  if (!(E_psi > 0)) return { error: "Modulus of elasticity must be positive (psi)." };
  if (!(I_in4 > 0)) return { error: "Moment of inertia must be positive (in^4)." };
  if (!(P_lb > 0) && !(w_plf > 0)) return { error: "Enter a tip point load, a uniform load, or both." };
  const L = L_ft * 12;
  const M_lbft = P_lb * L_ft + w_plf * L_ft * L_ft / 2;
  const V_lb = P_lb + w_plf * L_ft;
  const delta_in = P_lb * Math.pow(L, 3) / (3 * E_psi * I_in4)
    + (w_plf / 12) * Math.pow(L, 4) / (8 * E_psi * I_in4);
  return {
    M_lbft, V_lb, delta_in, span_ratio: delta_in > 0 ? L / delta_in : null,
    note: "Cantilever fixed at the support: max moment M = P L + w L^2/2 and max shear V = P + w L both occur at the fixed end; tip deflection delta = P L^3/(3 E I) + w L^4/(8 E I) (L in inches, w converted to lb/in). A distributed load of equal total force makes less moment and about a third the tip deflection of a tip point load, because its resultant acts at mid-span. Elastic, small-deflection, prismatic member; no self-weight unless included in w, no lateral-torsional buckling or shear deformation. A design aid, not a substitute for the engineer of record.",
  };
}
export const cantileverBeamExample = { inputs: { L_ft: 6, P_lb: 2000, w_plf: 0, E_psi: 29e6, I_in4: 53 } };

const _renderCantileverBeam = _simpleRenderer({
  citation: "Citation: Cantilever beam first-principles (Roark / AISC Manual beam diagrams): M = P L + w L^2/2, V = P + w L at the support, delta = P L^3/(3 E I) + w L^4/(8 E I) at the tip. Elastic small-deflection prismatic member. A design aid, not a substitute for the engineer of record.",
  example: cantileverBeamExample.inputs,
  fields: [
    { key: "L_ft", label: "Cantilever length L (ft)", kind: "number" },
    { key: "P_lb", label: "Tip point load P (lb, optional)", kind: "number" },
    { key: "w_plf", label: "Uniform load w (lb/ft, optional)", kind: "number" },
    { key: "E_psi", label: "Modulus E (psi; 29e6 steel, 1.6e6 wood)", kind: "number", default: 29000000 },
    { key: "I_in4", label: "Moment of inertia I (in^4)", kind: "number" },
  ],
  outputs: [
    { key: "m", id: "cb-out-m", label: "Max moment (at support)", value: (r) => fmt(r.M_lbft, 0) + " lb-ft" },
    { key: "v", id: "cb-out-v", label: "Max shear (at support)", value: (r) => fmt(r.V_lb, 0) + " lb" },
    { key: "d", id: "cb-out-d", label: "Tip deflection", value: (r) => fmt(r.delta_in, 3) + " in" + (r.span_ratio ? " (L/" + fmt(r.span_ratio, 0) + ")" : "") },
    { key: "n", id: "cb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCantileverBeam,
});
CONSTRUCTION_RENDERERS["cantilever-beam"] = _renderCantileverBeam;

// dims: in { shape: dimensionless, b_in: L, h_in: L, d_in: L, di_in: L } out: { A_in2: L^2, I_in4: L^4, S_in3: L^3, c_in: L, r_in: L }
export function computeSectionProperties({ shape = "rectangle", b_in = 0, h_in = 0, d_in = 0, di_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  let A, I, c;
  if (shape === "rectangle") {
    if (!(b_in > 0) || !(h_in > 0)) return { error: "Width and height must be positive (in)." };
    A = b_in * h_in; I = b_in * Math.pow(h_in, 3) / 12; c = h_in / 2;
  } else if (shape === "round") {
    if (!(d_in > 0)) return { error: "Diameter must be positive (in)." };
    A = Math.PI * d_in * d_in / 4; I = Math.PI * Math.pow(d_in, 4) / 64; c = d_in / 2;
  } else if (shape === "pipe") {
    if (!(d_in > 0)) return { error: "Outer diameter must be positive (in)." };
    if (!(di_in > 0) || !(di_in < d_in)) return { error: "Inner diameter must be positive and smaller than the outer." };
    A = Math.PI * (d_in * d_in - di_in * di_in) / 4;
    I = Math.PI * (Math.pow(d_in, 4) - Math.pow(di_in, 4)) / 64; c = d_in / 2;
  } else if (shape === "tube") {
    if (!(b_in > 0) || !(h_in > 0)) return { error: "Outer width and height must be positive (in)." };
    if (!(di_in > 0) || !(di_in < h_in)) return { error: "Wall thickness must leave a positive inner dimension." };
    // di_in is the wall thickness; inner dims = outer minus 2t.
    const bi = b_in - 2 * di_in, hi = h_in - 2 * di_in;
    if (!(bi > 0) || !(hi > 0)) return { error: "Wall thickness is too large for the tube dimensions." };
    A = b_in * h_in - bi * hi;
    I = (b_in * Math.pow(h_in, 3) - bi * Math.pow(hi, 3)) / 12; c = h_in / 2;
  } else {
    return { error: "Unknown shape." };
  }
  if (!(A > 0) || !(I > 0)) return { error: "Section properties are not valid for these dimensions." };
  const S = I / c;
  const r = Math.sqrt(I / A);
  return {
    A_in2: A, I_in4: I, S_in3: S, c_in: c, r_in: r,
    note: "Cross-section properties about the bending (strong) axis: area A, moment of inertia I, section modulus S = I/c, extreme-fiber distance c, and radius of gyration r = sqrt(I/A). I scales with the cube of the depth in the bending direction, so orientation dominates - turning a board flatwise can cost an order of magnitude in stiffness. Tube uses the entered wall thickness. A design aid, not a substitute for the engineer of record.",
  };
}
export const sectionPropertiesExample = { inputs: { shape: "rectangle", b_in: 1.5, h_in: 7.25, d_in: 0, di_in: 0 } };

const _renderSectionProperties = _simpleRenderer({
  citation: "Citation: Cross-section properties first-principles: rectangle I = b h^3/12, round I = pi d^4/64, pipe I = pi(d^4 - di^4)/64, hollow tube I = (b h^3 - bi hi^3)/12; S = I/c, r = sqrt(I/A). A design aid, not a substitute for the engineer of record.",
  example: sectionPropertiesExample.inputs,
  fields: [
    { key: "shape", label: "Shape", kind: "select", options: [
      { value: "rectangle", label: "Rectangle (b x h)" },
      { value: "round", label: "Solid round (d)" },
      { value: "pipe", label: "Pipe (d outer, di inner)" },
      { value: "tube", label: "Rect. tube (b x h, wall t)" },
    ], default: "rectangle" },
    { key: "b_in", label: "Width b (in; rectangle/tube)", kind: "number" },
    { key: "h_in", label: "Height/depth h (in; bending axis)", kind: "number" },
    { key: "d_in", label: "Outer diameter d (in; round/pipe)", kind: "number" },
    { key: "di_in", label: "Inner dia. (pipe) or wall t (tube)", kind: "number" },
  ],
  outputs: [
    { key: "a", id: "sp-out-a", label: "Area A", value: (r) => fmt(r.A_in2, 2) + " in^2" },
    { key: "i", id: "sp-out-i", label: "Moment of inertia I", value: (r) => fmt(r.I_in4, 2) + " in^4" },
    { key: "s", id: "sp-out-s", label: "Section modulus S", value: (r) => fmt(r.S_in3, 2) + " in^3 (c = " + fmt(r.c_in, 3) + " in)" },
    { key: "r", id: "sp-out-r", label: "Radius of gyration r", value: (r) => fmt(r.r_in, 3) + " in" },
    { key: "n", id: "sp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSectionProperties,
});
CONSTRUCTION_RENDERERS["section-properties"] = _renderSectionProperties;

// dims: in { P_lb: M L T^-2, M_lbin: M L^2 T^-2, A_in2: L^2, c_in: L, I_in4: L^4, e_in: L } out: { sigma_axial: M L^-1 T^-2, sigma_bend: M L^-1 T^-2, sigma_max: M L^-1 T^-2, sigma_min: M L^-1 T^-2 }
export function computeCombinedStressAxialBending({ P_lb = 0, M_lbin = 0, A_in2 = 0, c_in = 0, I_in4 = 0, e_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(A_in2 > 0)) return { error: "Cross-sectional area must be positive (in^2)." };
  if (!(c_in > 0)) return { error: "Extreme-fiber distance c must be positive (in)." };
  if (!(I_in4 > 0)) return { error: "Moment of inertia must be positive (in^4)." };
  // Eccentricity, if entered, defines the moment M = P e.
  const M = e_in > 0 ? P_lb * e_in : M_lbin;
  const sigma_axial = P_lb / A_in2;
  const sigma_bend = M * c_in / I_in4;
  const sigma_max = sigma_axial + sigma_bend;
  const sigma_min = sigma_axial - sigma_bend;
  const S_in3 = I_in4 / c_in;
  return {
    sigma_axial, sigma_bend, sigma_max, sigma_min, M_used: M, S_in3,
    no_tension: sigma_min >= 0,
    note: "Combined axial-plus-bending fiber stress on a short (non-buckling) member: sigma = P/A +/- M c/I, with the extreme compression fiber at P/A + M c/I and the other fiber at P/A - M c/I (tension where negative). Enter a moment directly, or an eccentricity e to set M = P e. The far face stays in compression only while M c/I <= P/A - the kern limit e <= r^2/c, the same no-tension threshold the eccentric-footing tile enforces. Short member: this does NOT include the P-delta / column amplification of a slender member (use a beam-column interaction check). A design aid, not a substitute for the engineer of record.",
  };
}
export const combinedStressAxialBendingExample = { inputs: { P_lb: 20000, M_lbin: 30000, A_in2: 30.25, c_in: 2.75, I_in4: 76.3, e_in: 0 } };

const _renderCombinedStressAxialBending = _simpleRenderer({
  citation: "Citation: Combined axial + bending stress first-principles (mechanics of materials): sigma = P/A +/- M c/I; the kern / no-tension threshold e <= r^2/c. Short member (no P-delta amplification). A design aid, not a substitute for the engineer of record.",
  example: combinedStressAxialBendingExample.inputs,
  fields: [
    { key: "P_lb", label: "Axial force P (lb, + compression)", kind: "number" },
    { key: "M_lbin", label: "Bending moment M (lb-in)", kind: "number" },
    { key: "e_in", label: "OR eccentricity e (in; sets M = P e)", kind: "number" },
    { key: "A_in2", label: "Area A (in^2)", kind: "number" },
    { key: "c_in", label: "Extreme-fiber distance c (in)", kind: "number" },
    { key: "I_in4", label: "Moment of inertia I (in^4)", kind: "number" },
  ],
  outputs: [
    { key: "ax", id: "cs-out-ax", label: "Axial stress P/A", value: (r) => fmt(r.sigma_axial, 0) + " psi" },
    { key: "bn", id: "cs-out-bn", label: "Bending stress Mc/I", value: (r) => fmt(r.sigma_bend, 0) + " psi" },
    { key: "mx", id: "cs-out-mx", label: "Max fiber (compression)", value: (r) => fmt(r.sigma_max, 0) + " psi" },
    { key: "mn", id: "cs-out-mn", label: "Min fiber", value: (r) => fmt(r.sigma_min, 0) + " psi (" + (r.no_tension ? "all compression" : "net tension") + ")" },
    { key: "n", id: "cs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCombinedStressAxialBending,
});
CONSTRUCTION_RENDERERS["combined-stress-axial-bending"] = _renderCombinedStressAxialBending;

// ===================== spec-v359..v361: applied-mechanics batch =====================
// The machine- and pressure-element mechanics the structural-member tiles never
// give: a shaft's torsional shear stress and angle of twist (v359), the stress
// and force from a restrained temperature change (v360), and a thin-wall
// pressure vessel's hoop and longitudinal stress (v361).

// dims: in { T_lbin: M L^2 T^-2, d_in: L, di_in: L, L_in: L, G_psi: M L^-1 T^-2 } out: { J_in4: L^4, tau_psi: M L^-1 T^-2, theta_deg: dimensionless }
export function computeShaftTorsion({ T_lbin = 0, d_in = 0, di_in = 0, L_in = 0, G_psi = 11.5e6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const T = Number(T_lbin) || 0;
  const d = Number(d_in) || 0;
  const di = Number(di_in) || 0;
  const L = Number(L_in) || 0;
  const G = Number(G_psi) || 0;
  if (!(T > 0)) return { error: "Torque must be positive (lb-in)." };
  if (!(d > 0)) return { error: "Outer diameter must be positive (in)." };
  if (!(di >= 0 && di < d)) return { error: "Inner diameter must be zero or positive and less than the outer." };
  const J = Math.PI * (Math.pow(d, 4) - Math.pow(di, 4)) / 32;
  if (!(J > 0)) return { error: "Polar moment is not valid." };
  const tau_psi = T * (d / 2) / J;
  let theta_rad = null, theta_deg = null;
  if (L > 0 && G > 0) { theta_rad = T * L / (J * G); theta_deg = theta_rad * 180 / Math.PI; }
  return {
    J_in4: J, tau_psi, theta_rad, theta_deg,
    note: "Circular-shaft torsion: polar moment J = pi(d^4 - di^4)/32, max surface shear stress tau = T r / J (= 16T/(pi d^3) for a solid shaft), and the angle of twist theta = T L / (J G). Stress falls with the cube of diameter and twist with the fourth power, so a modest diameter increase pays off fast. Elastic, prismatic, circular cross-section, pure torsion (no bending or axial load, no stress concentration at keyways or shoulders). A design aid, not a substitute for the engineer of record.",
  };
}
export const shaftTorsionExample = { inputs: { T_lbin: 12000, d_in: 1.5, di_in: 0, L_in: 24, G_psi: 11.5e6 } };

const _renderShaftTorsion = _simpleRenderer({
  citation: "Citation: circular-shaft torsion first-principles (mechanics of materials): J = pi(d^4 - di^4)/32, tau = T r / J, theta = T L / (J G). Elastic prismatic circular section, pure torsion (no keyway stress concentration). A design aid, not a substitute for the engineer of record.",
  example: shaftTorsionExample.inputs,
  fields: [
    { key: "T_lbin", label: "Torque T (lb-in)", kind: "number" },
    { key: "d_in", label: "Outer diameter d (in)", kind: "number" },
    { key: "di_in", label: "Inner diameter (in; 0 = solid)", kind: "number" },
    { key: "L_in", label: "Length for twist L (in, optional)", kind: "number" },
    { key: "G_psi", label: "Shear modulus G (psi; 11.5e6 steel)", kind: "number", default: 11500000 },
  ],
  outputs: [
    { key: "tau", id: "st-out-tau", label: "Max shear stress", value: (r) => fmt(r.tau_psi, 0) + " psi" },
    { key: "j", id: "st-out-j", label: "Polar moment J", value: (r) => fmt(r.J_in4, 4) + " in^4" },
    { key: "th", id: "st-out-th", label: "Angle of twist", value: (r) => r.theta_deg == null ? "(enter length and G)" : fmt(r.theta_deg, 2) + " deg (" + fmt(r.theta_rad, 4) + " rad)" },
    { key: "n", id: "st-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeShaftTorsion,
});
CONSTRUCTION_RENDERERS["shaft-torsion"] = _renderShaftTorsion;

// shaft-diameter-for-torsion: inverse of shaft-torsion (solid shaft). The forward tile gives the shear stress from the
// diameter; the inverse recovers the minimum solid-shaft diameter that keeps the max surface shear stress within an
// allowable, so a designer sizes the shaft to a torsional-stress limit. For a solid shaft tau = 16 T / (pi d^3), so
// d = (16 T / (pi tau_allow))^(1/3). The angle of twist at that diameter is reported when a length and G are entered.
// dims: in { T_lbin: M L^2 T^-2, tau_allow_psi: M L^-1 T^-2, L_in: L, G_psi: M L^-1 T^-2 } out: { d_in: L, J_in4: L^4, theta_deg: dimensionless }
export function computeShaftDiameterForTorsion({ T_lbin = 0, tau_allow_psi = 0, L_in = 0, G_psi = 11.5e6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const T = Number(T_lbin) || 0;
  const tau = Number(tau_allow_psi) || 0;
  const L = Number(L_in) || 0;
  const G = Number(G_psi) || 0;
  if (!(T > 0)) return { error: "Torque must be positive (lb-in)." };
  if (!(tau > 0)) return { error: "Allowable shear stress must be positive (psi)." };
  const d_in = Math.cbrt(16 * T / (Math.PI * tau));
  const J_in4 = Math.PI * Math.pow(d_in, 4) / 32;
  let theta_rad = null, theta_deg = null;
  if (L > 0 && G > 0) { theta_rad = T * L / (J_in4 * G); theta_deg = theta_rad * 180 / Math.PI; }
  if (![d_in, J_in4].every(Number.isFinite)) return { error: "Shaft-diameter math is not a finite value." };
  return {
    d_in, J_in4, theta_rad, theta_deg,
    note: "Minimum SOLID-shaft diameter for an allowable torsional shear stress: from tau = 16 T / (pi d^3), d = (16 T / (pi tau_allow))^(1/3). Stress falls with the cube of the diameter, so a small size bump drops the stress fast; round UP to a stock size. Use an allowable that already includes the factor of safety (a common design value is a fraction of the yield shear). This sizes for STRESS only - a shaft can pass stress but still twist too much, so check the angle of twist (shown when a length and G are entered) against the service limit, and note this is pure torsion with no bending, axial load, or keyway/shoulder stress concentration. A design aid, not a substitute for the engineer of record.",
  };
}
export const shaftDiameterForTorsionExample = { inputs: { T_lbin: 12000, tau_allow_psi: 8000, L_in: 24, G_psi: 11.5e6 } };

const _renderShaftDiameterForTorsion = _simpleRenderer({
  citation: "Citation: circular-shaft torsion first-principles (mechanics of materials), solid shaft, solved for the diameter: tau = 16 T / (pi d^3) -> d = (16 T / (pi tau_allow))^(1/3); J = pi d^4 / 32, theta = T L / (J G). Elastic prismatic circular section, pure torsion (no keyway stress concentration). A design aid, not a substitute for the engineer of record.",
  example: shaftDiameterForTorsionExample.inputs,
  fields: [
    { key: "T_lbin", label: "Torque T (lb-in)", kind: "number" },
    { key: "tau_allow_psi", label: "Allowable shear stress (psi)", kind: "number" },
    { key: "L_in", label: "Length for twist L (in, optional)", kind: "number" },
    { key: "G_psi", label: "Shear modulus G (psi; 11.5e6 steel)", kind: "number", default: 11500000 },
  ],
  outputs: [
    { key: "d", id: "sdt-out-d", label: "Minimum solid-shaft diameter", value: (r) => fmt(r.d_in, 3) + " in" },
    { key: "j", id: "sdt-out-j", label: "Polar moment J at that diameter", value: (r) => fmt(r.J_in4, 4) + " in^4" },
    { key: "th", id: "sdt-out-th", label: "Angle of twist", value: (r) => r.theta_deg == null ? "(enter length and G)" : fmt(r.theta_deg, 2) + " deg (" + fmt(r.theta_rad, 4) + " rad)" },
    { key: "n", id: "sdt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeShaftDiameterForTorsion,
});
CONSTRUCTION_RENDERERS["shaft-diameter-for-torsion"] = _renderShaftDiameterForTorsion;

// dims: in { E_psi: M L^-1 T^-2, alpha: dimensionless, dT_F: T, A_in2: L^2, L_in: L, restraint: dimensionless } out: { sigma_psi: M L^-1 T^-2, F_lb: M L T^-2, free_delta_in: L }
export function computeThermalStressRestrained({ E_psi = 0, alpha = 0, dT_F = 0, A_in2 = 0, L_in = 0, restraint = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const E = Number(E_psi) || 0;
  const a = Number(alpha) || 0;
  const dT = Number(dT_F) || 0;
  const A = Number(A_in2) || 0;
  const L = Number(L_in) || 0;
  let r = Number(restraint);
  if (!Number.isFinite(r) || r === 0) r = 1;
  if (!(E > 0)) return { error: "Modulus of elasticity must be positive (psi)." };
  if (!(a > 0)) return { error: "Thermal expansion coefficient must be positive (/F)." };
  if (dT === 0) return { error: "Temperature change must be non-zero (F)." };
  if (!(r > 0 && r <= 1)) return { error: "Restraint factor must be over 0 and up to 1." };
  const sigma_psi = E * a * dT * r;
  const F_lb = A > 0 ? sigma_psi * A : null;
  const free_delta_in = L > 0 ? a * L * dT : null;
  return {
    sigma_psi, F_lb, free_delta_in,
    compression: dT > 0,
    note: "Restrained thermal stress: a member blocked from expanding develops sigma = E x alpha x dT x restraint (independent of length), and the restraint force F = sigma x A. Heating a restrained member puts it in compression; cooling puts it in tension. The free (unrestrained) expansion alpha x L x dT is the movement the restraint blocks. Aluminum's larger expansion coefficient but lower modulus can net a lower thermal stress than steel. Fully restrained is the worst case; real supports give partial restraint. A design aid, not a substitute for the engineer of record.",
  };
}
export const thermalStressRestrainedExample = { inputs: { E_psi: 29e6, alpha: 6.5e-6, dT_F: 100, A_in2: 5, L_in: 240, restraint: 1 } };

const _renderThermalStressRestrained = _simpleRenderer({
  citation: "Citation: restrained thermal stress first-principles: sigma = E alpha dT x restraint, F = sigma A, free expansion = alpha L dT. Fully restrained is the worst case; real supports give partial restraint. A design aid, not a substitute for the engineer of record.",
  example: thermalStressRestrainedExample.inputs,
  fields: [
    { key: "E_psi", label: "Modulus E (psi; 29e6 steel, 10e6 alum)", kind: "number", default: 29000000 },
    { key: "alpha", label: "Thermal expansion alpha (/F; 6.5e-6 steel)", kind: "number" },
    { key: "dT_F", label: "Temperature change dT (F, + heating)", kind: "number" },
    { key: "A_in2", label: "Cross-section area A (in^2, for force)", kind: "number" },
    { key: "L_in", label: "Length L (in, for free expansion)", kind: "number" },
    { key: "restraint", label: "Restraint factor (0-1, default 1)", kind: "number", default: 1 },
  ],
  outputs: [
    { key: "s", id: "tsr-out-s", label: "Thermal stress", value: (r) => fmt(r.sigma_psi, 0) + " psi (" + (r.compression ? "compression" : "tension") + ")" },
    { key: "f", id: "tsr-out-f", label: "Restraint force", value: (r) => r.F_lb == null ? "(enter area)" : fmt(r.F_lb, 0) + " lb" },
    { key: "d", id: "tsr-out-d", label: "Free (blocked) expansion", value: (r) => r.free_delta_in == null ? "(enter length)" : fmt(r.free_delta_in, 3) + " in" },
    { key: "n", id: "tsr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeThermalStressRestrained,
});
CONSTRUCTION_RENDERERS["thermal-stress-restrained"] = _renderThermalStressRestrained;

// dims: in { allowable_stress_psi: M L^-1 T^-2, E_psi: M L^-1 T^-2, alpha: dimensionless, restraint: dimensionless } out: { max_dT_F: T }
export function computeThermalStressMaxDeltaT({ allowable_stress_psi = 0, E_psi = 0, alpha = 0, restraint = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const S = Number(allowable_stress_psi) || 0;
  const E = Number(E_psi) || 0;
  const a = Number(alpha) || 0;
  let r = Number(restraint);
  if (!Number.isFinite(r) || r === 0) r = 1;
  if (!(S > 0)) return { error: "Allowable stress must be positive (psi)." };
  if (!(E > 0)) return { error: "Modulus of elasticity must be positive (psi)." };
  if (!(a > 0)) return { error: "Thermal expansion coefficient must be positive (/F)." };
  if (!(r > 0 && r <= 1)) return { error: "Restraint factor must be over 0 and up to 1." };
  // Inverse of sigma = E x alpha x dT x restraint: dT_max = sigma_allow / (E x alpha x restraint).
  const max_dT_F = S / (E * a * r);
  if (!Number.isFinite(max_dT_F) || !(max_dT_F > 0)) return { error: "Temperature-change math is not a finite positive value." };
  return {
    max_dT_F,
    note: "The largest temperature change a restrained member can take before its thermal stress reaches the allowable, the inverse of the thermal-stress-restrained tile: dT_max = sigma_allow / (E x alpha x restraint). The stress is independent of length, so the limit depends only on the material (E, alpha), the restraint, and the allowable. Heating a restrained member is compression, cooling is tension - if the allowable differs by direction, use the governing (smaller) one. A lower modulus or expansion coefficient (or partial restraint) raises the tolerable swing, which is why aluminum can take a larger temperature change than steel for the same stress. Fully restrained is the worst case; real supports give partial restraint. A design aid, not a substitute for the engineer of record.",
  };
}
export const thermalStressMaxDeltaTExample = { inputs: { allowable_stress_psi: 18850, E_psi: 29e6, alpha: 6.5e-6, restraint: 1 } };

const _renderThermalStressMaxDeltaT = _simpleRenderer({
  citation: "Citation: restrained thermal stress solved for the temperature change: dT_max = sigma_allow / (E x alpha x restraint), from sigma = E alpha dT x restraint. Heating is compression, cooling is tension. Fully restrained is the worst case; real supports give partial restraint. A design aid, not a substitute for the engineer of record.",
  example: thermalStressMaxDeltaTExample.inputs,
  fields: [
    { key: "allowable_stress_psi", label: "Allowable stress (psi)", kind: "number" },
    { key: "E_psi", label: "Modulus E (psi; 29e6 steel, 10e6 alum)", kind: "number", default: 29000000 },
    { key: "alpha", label: "Thermal expansion alpha (/F; 6.5e-6 steel)", kind: "number" },
    { key: "restraint", label: "Restraint factor (0-1, default 1)", kind: "number", default: 1 },
  ],
  outputs: [
    { key: "dt", id: "tsmd-out-dt", label: "Max temperature change", value: (r) => fmt(r.max_dT_F, 1) + " F" },
    { key: "n", id: "tsmd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeThermalStressMaxDeltaT,
});
CONSTRUCTION_RENDERERS["thermal-stress-max-deltat"] = _renderThermalStressMaxDeltaT;

// dims: in { P_psi: M L^-1 T^-2, D_in: L, t_in: L, S_allow: M L^-1 T^-2 } out: { sigma_h_psi: M L^-1 T^-2, sigma_l_psi: M L^-1 T^-2, Dt: dimensionless, DCR: dimensionless }
export function computeHoopStressThinWall({ P_psi = 0, D_in = 0, t_in = 0, S_allow = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const P = Number(P_psi) || 0;
  const D = Number(D_in) || 0;
  const t = Number(t_in) || 0;
  const S = Number(S_allow) || 0;
  if (!(P > 0)) return { error: "Internal pressure must be positive (psi)." };
  if (!(D > 0)) return { error: "Diameter must be positive (in)." };
  if (!(t > 0)) return { error: "Wall thickness must be positive (in)." };
  const sigma_h_psi = P * D / (2 * t);
  const sigma_l_psi = P * D / (4 * t);
  const Dt = D / t;
  const thin_wall_ok = Dt >= 20;
  const DCR = S > 0 ? sigma_h_psi / S : null;
  return {
    sigma_h_psi, sigma_l_psi, Dt, thin_wall_ok, DCR,
    note: "Thin-wall pressure vessel: hoop (circumferential) stress sigma_h = P D / (2 t) and longitudinal stress sigma_l = P D / (4 t) = half the hoop, which is why a cylinder splits along its length, not around. The thin-wall formula assumes D/t >= 20; below that the wall is 'thick' and the simple PD/2t under-reports the higher inner-surface stress (use a Lame thick-wall check). D is the mean/inner diameter. Static internal pressure, no external pressure, discontinuity, or nozzle stress. A design aid, not a substitute for a pressure-vessel code (ASME BPVC) or the engineer of record.",
  };
}
export const hoopStressThinWallExample = { inputs: { P_psi: 150, D_in: 12, t_in: 0.25, S_allow: 15000 } };

const _renderHoopStressThinWall = _simpleRenderer({
  citation: "Citation: thin-wall pressure-vessel stress first-principles: hoop sigma_h = P D / (2 t), longitudinal sigma_l = P D / (4 t), valid for D/t >= 20. Not a substitute for the ASME BPVC or the engineer of record.",
  example: hoopStressThinWallExample.inputs,
  fields: [
    { key: "P_psi", label: "Internal pressure P (psi)", kind: "number" },
    { key: "D_in", label: "Diameter D (in, mean/inner)", kind: "number" },
    { key: "t_in", label: "Wall thickness t (in)", kind: "number" },
    { key: "S_allow", label: "Allowable stress S (psi, optional)", kind: "number" },
  ],
  outputs: [
    { key: "h", id: "hs-out-h", label: "Hoop (circumferential) stress", value: (r) => fmt(r.sigma_h_psi, 0) + " psi" },
    { key: "l", id: "hs-out-l", label: "Longitudinal stress", value: (r) => fmt(r.sigma_l_psi, 0) + " psi (half the hoop)" },
    { key: "dt", id: "hs-out-dt", label: "D/t (thin-wall if >= 20)", value: (r) => fmt(r.Dt, 1) + (r.thin_wall_ok ? " (thin-wall valid)" : " -- thick wall; a Lame check is advisable") },
    { key: "dcr", id: "hs-out-dcr", label: "Demand/capacity (hoop)", value: (r) => r.DCR == null ? "(enter an allowable stress)" : fmt(r.DCR, 2) },
    { key: "n", id: "hs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHoopStressThinWall,
});
CONSTRUCTION_RENDERERS["hoop-stress-thin-wall"] = _renderHoopStressThinWall;

// dims: in { t_in: L, D_in: L, S_allow: M L^-1 T^-2 } out: { p_max_psi: M L^-1 T^-2, p_max_long_psi: M L^-1 T^-2, Dt: dimensionless }
export function computeHoopStressMawp({ t_in = 0, D_in = 0, S_allow = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const t = Number(t_in) || 0;
  const D = Number(D_in) || 0;
  const S = Number(S_allow) || 0;
  if (!(t > 0)) return { error: "Wall thickness must be positive (in)." };
  if (!(D > 0)) return { error: "Diameter must be positive (in)." };
  if (!(S > 0)) return { error: "Allowable stress must be positive (psi)." };
  // Inverse of sigma_h = P D / (2 t) at sigma_h = S_allow: P_max = 2 t S_allow / D.
  const p_max_psi = 2 * t * S / D;
  const p_max_long_psi = 4 * t * S / D;
  const Dt = D / t;
  const thin_wall_ok = Dt >= 20;
  return {
    p_max_psi, p_max_long_psi, Dt, thin_wall_ok,
    note: "The maximum allowable working pressure of a thin-wall cylinder, the inverse of the hoop-stress-thin-wall tile: solving sigma_h = P D / (2 t) for the pressure at the allowable stress gives P_max = 2 t S_allow / D (hoop-governed). The longitudinal stress is half the hoop, so the longitudinal limit allows twice the pressure (4 t S_allow / D) -- the hoop governs, which is why a cylinder splits along its length. To size the wall for a known design pressure instead, rearrange to t_min = P D / (2 S_allow). The thin-wall formula assumes D/t >= 20; below that use a Lame thick-wall check. D is the mean/inner diameter, static internal pressure only. A design aid, not a substitute for a pressure-vessel code (ASME BPVC) or the engineer of record.",
  };
}
export const hoopStressMawpExample = { inputs: { t_in: 0.25, D_in: 12, S_allow: 15000 } };

const _renderHoopStressMawp = _simpleRenderer({
  citation: "Citation: thin-wall pressure-vessel MAWP first-principles: solving hoop sigma_h = P D / (2 t) for the pressure at the allowable stress gives P_max = 2 t S_allow / D (hoop-governed; the longitudinal limit is double). Valid for D/t >= 20. Not a substitute for the ASME BPVC or the engineer of record.",
  example: hoopStressMawpExample.inputs,
  fields: [
    { key: "t_in", label: "Wall thickness t (in)", kind: "number" },
    { key: "D_in", label: "Diameter D (in, mean/inner)", kind: "number" },
    { key: "S_allow", label: "Allowable stress S (psi)", kind: "number" },
  ],
  outputs: [
    { key: "p", id: "hsm-out-p", label: "Max allowable pressure (hoop-governed)", value: (r) => fmt(r.p_max_psi, 0) + " psi" },
    { key: "pl", id: "hsm-out-pl", label: "Longitudinal-limited pressure", value: (r) => fmt(r.p_max_long_psi, 0) + " psi (double the hoop; hoop governs)" },
    { key: "dt", id: "hsm-out-dt", label: "D/t (thin-wall if >= 20)", value: (r) => fmt(r.Dt, 1) + (r.thin_wall_ok ? " (thin-wall valid)" : " -- thick wall; a Lame check is advisable") },
    { key: "n", id: "hsm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHoopStressMawp,
});
CONSTRUCTION_RENDERERS["hoop-stress-mawp"] = _renderHoopStressMawp;

// ===================== spec-v381..v383: seismic-parameters trio (ASCE 7-22) =====================

// dims: in { ss: dimensionless, s1: dimensionless, fa: dimensionless, fv: dimensionless } out: { sms: dimensionless, sm1: dimensionless, sds: dimensionless, sd1: dimensionless }
export function computeSeismicDesignSpectralAcceleration({ ss = 0, s1 = 0, fa = 0, fv = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Ss = Number(ss) || 0, S1 = Number(s1) || 0, Fa = Number(fa) || 0, Fv = Number(fv) || 0;
  if (!(Ss >= 0) || !(S1 >= 0)) return { error: "Mapped accelerations Ss and S1 must be non-negative (fraction of g)." };
  if (!(Fa > 0)) return { error: "Short-period site coefficient Fa must be positive." };
  if (!(Fv > 0)) return { error: "One-second site coefficient Fv must be positive." };
  const sms = Fa * Ss, sm1 = Fv * S1;
  const sds = (2 / 3) * sms, sd1 = (2 / 3) * sm1;
  return {
    sms, sm1, sds, sd1,
    note: "ASCE 7-22 §11.4.4/§11.4.5: site-adjust the mapped MCER accelerations by the site coefficients (SMS = Fa Ss, SM1 = Fv S1), then take two-thirds for the design values (SDS = 2/3 SMS, SD1 = 2/3 SM1). Fa and Fv come from Tables 11.4-1/11.4-2 by Site Class; a geotechnical report sets the Site Class. SDS and SD1 feed the base shear and drift checks. A design aid; the engineer of record's stamped design governs.",
  };
}
export const seismicDesignSpectralAccelerationExample = { inputs: { ss: 1.0, s1: 0.4, fa: 1.1, fv: 1.6 } };
const _renderSeismicSpectral = _simpleRenderer({
  citation: "Citation: ASCE 7-22 §11.4.4 (SMS = Fa Ss, SM1 = Fv S1) and §11.4.5 (SDS = 2/3 SMS, SD1 = 2/3 SM1). Fa and Fv are the site coefficients from Tables 11.4-1 and 11.4-2, selected by Site Class from a geotechnical report; the mapped Ss and S1 come from the USGS seismic design maps for the site. Returns the design spectral accelerations that feed the base shear and drift; it does not select the Site Class or the SDC. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: seismicDesignSpectralAccelerationExample.inputs,
  fields: [
    { key: "ss", label: "Mapped Ss (short-period, fraction of g)", kind: "number" },
    { key: "s1", label: "Mapped S1 (1-second, fraction of g)", kind: "number" },
    { key: "fa", label: "Site coefficient Fa (Table 11.4-1)", kind: "number", default: 1.0 },
    { key: "fv", label: "Site coefficient Fv (Table 11.4-2)", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "sms", id: "ssa-out-sms", label: "SMS = Fa Ss (MCER short)", value: (r) => fmt(r.sms, 3) + "g" },
    { key: "sm1", id: "ssa-out-sm1", label: "SM1 = Fv S1 (MCER 1-sec)", value: (r) => fmt(r.sm1, 3) + "g" },
    { key: "sds", id: "ssa-out-sds", label: "SDS = 2/3 SMS (design short)", value: (r) => fmt(r.sds, 3) + "g" },
    { key: "sd1", id: "ssa-out-sd1", label: "SD1 = 2/3 SM1 (design 1-sec)", value: (r) => fmt(r.sd1, 3) + "g" },
    { key: "n", id: "ssa-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSeismicDesignSpectralAcceleration,
});
CONSTRUCTION_RENDERERS["seismic-design-spectral-acceleration"] = _renderSeismicSpectral;

// dims: in { delta_xe_in: L, cd: dimensionless, ie: dimensionless, hsx_in: L, drift_ratio: dimensionless } out: { delta_x: L, delta_a: L, util: dimensionless }
export function computeSeismicStoryDrift({ delta_xe_in = 0, cd = 0, ie = 1.0, hsx_in = 0, drift_ratio = 0.020 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const dxe = Number(delta_xe_in) || 0, Cd = Number(cd) || 0, Ie = Number(ie) || 0, hsx = Number(hsx_in) || 0, dr = Number(drift_ratio) || 0;
  if (!(dxe > 0)) return { error: "Elastic story drift must be positive (in)." };
  if (!(Cd > 0)) return { error: "Deflection amplification factor Cd must be positive." };
  if (!(Ie > 0)) return { error: "Importance factor Ie must be positive." };
  if (!(hsx > 0)) return { error: "Story height must be positive (in)." };
  if (!(dr > 0)) return { error: "Allowable drift ratio must be positive." };
  const delta_x = Cd * dxe / Ie;
  const delta_a = dr * hsx;
  const util = delta_x / delta_a;
  return {
    delta_x, delta_a, util, ok: delta_x <= delta_a,
    note: "ASCE 7-22 Eq. 12.8-15: the amplified design story drift delta_x = Cd delta_xe / Ie, compared with the allowable delta_a = (drift coefficient) x story height (Table 12.12-1, commonly 0.020 hsx for most buildings, 0.010-0.025 by risk category and system). delta_xe is the elastic drift from the strength-level analysis. Exceeding delta_a means stiffen the frame. A design aid; the engineer of record's stamped design governs.",
  };
}
export const seismicStoryDriftExample = { inputs: { delta_xe_in: 0.5, cd: 5.5, ie: 1.0, hsx_in: 144, drift_ratio: 0.020 } };
const _renderSeismicStoryDrift = _simpleRenderer({
  citation: "Citation: ASCE 7-22 Eq. 12.8-15 (delta_x = Cd delta_xe / Ie) and Table 12.12-1 (allowable story drift delta_a = drift coefficient x story height, commonly 0.020 hsx). Cd is the deflection amplification factor from Table 12.2-1 for the seismic force-resisting system; delta_xe is the elastic drift from the strength-level analysis. Checks a single story against its allowable; it does not run the analysis or check torsional amplification. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: seismicStoryDriftExample.inputs,
  fields: [
    { key: "delta_xe_in", label: "Elastic story drift delta_xe (in)", kind: "number" },
    { key: "cd", label: "Deflection amplification Cd (Table 12.2-1)", kind: "number" },
    { key: "ie", label: "Importance factor Ie", kind: "number", default: 1.0 },
    { key: "hsx_in", label: "Story height hsx (in)", kind: "number" },
    { key: "drift_ratio", label: "Allowable drift coefficient (default 0.020)", kind: "number", default: 0.020 },
  ],
  outputs: [
    { key: "dx", id: "ssd-out-dx", label: "Design story drift delta_x = Cd delta_xe / Ie", value: (r) => fmt(r.delta_x, 2) + " in" },
    { key: "da", id: "ssd-out-da", label: "Allowable drift delta_a", value: (r) => fmt(r.delta_a, 2) + " in" },
    { key: "ok", id: "ssd-out-ok", label: "Check", value: (r) => (r.ok ? "OK" : "NOT OK -- stiffen the frame") + " (util " + fmt(r.util, 3) + ")" },
    { key: "n", id: "ssd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSeismicStoryDrift,
});
CONSTRUCTION_RENDERERS["seismic-story-drift"] = _renderSeismicStoryDrift;

// dims: in { px_kip: M L T^-2, delta_in: L, ie: dimensionless, vx_kip: M L T^-2, hsx_in: L, cd: dimensionless, beta: dimensionless } out: { theta: dimensionless, theta_max: dimensionless, amplifier: dimensionless }
export function computeSeismicPdeltaStability({ px_kip = 0, delta_in = 0, ie = 1.0, vx_kip = 0, hsx_in = 0, cd = 0, beta = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Px = Number(px_kip) || 0, delta = Number(delta_in) || 0, Ie = Number(ie) || 0, Vx = Number(vx_kip) || 0, hsx = Number(hsx_in) || 0, Cd = Number(cd) || 0, b = Number(beta) || 0;
  if (!(Px > 0)) return { error: "Gravity load Px must be positive (kip)." };
  if (!(delta > 0)) return { error: "Design story drift must be positive (in)." };
  if (!(Ie > 0)) return { error: "Importance factor Ie must be positive." };
  if (!(Vx > 0)) return { error: "Seismic story shear Vx must be positive (kip)." };
  if (!(hsx > 0)) return { error: "Story height must be positive (in)." };
  if (!(Cd > 0)) return { error: "Deflection amplification factor Cd must be positive." };
  if (!(b > 0)) return { error: "Shear demand/capacity ratio beta must be positive." };
  const theta = Px * delta * Ie / (Vx * hsx * Cd);
  const theta_max = Math.min(0.5 / (b * Cd), 0.25);
  let verdict, amplifier = null;
  if (theta <= 0.10) verdict = "neglect P-delta (theta <= 0.10)";
  else if (theta <= theta_max) { amplifier = 1 / (1 - theta); verdict = "amplify forces and drifts by 1/(1 - theta)"; }
  else verdict = "potentially unstable -- redesign (theta > theta_max)";
  return {
    theta, theta_max, amplifier, verdict,
    note: "ASCE 7-22 §12.8.7 stability coefficient theta = Px delta Ie / (Vx hsx Cd). Below 0.10 P-delta may be neglected; between 0.10 and theta_max = min(0.5/(beta Cd), 0.25) the forces and drifts must be amplified by 1/(1 - theta); above theta_max the story is potentially unstable and must be redesigned (stiffen it). Px is the total gravity design load at and above the story; beta is the shear demand-to-capacity ratio (1.0 if unknown). A design aid; the engineer of record's stamped design governs.",
  };
}
export const seismicPdeltaStabilityExample = { inputs: { px_kip: 400, delta_in: 2.75, ie: 1.0, vx_kip: 80, hsx_in: 144, cd: 5.5, beta: 1.0 } };
const _renderSeismicPdelta = _simpleRenderer({
  citation: "Citation: ASCE 7-22 §12.8.7: the P-delta stability coefficient theta = Px delta Ie / (Vx hsx Cd), the neglect threshold 0.10, the amplification 1/(1 - theta), and the maximum theta_max = min(0.5/(beta Cd), 0.25) above which the structure is potentially unstable. Px is the total gravity design load at and above the story, delta the design story drift, beta the shear demand/capacity ratio (1.0 if unknown). A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: seismicPdeltaStabilityExample.inputs,
  fields: [
    { key: "px_kip", label: "Gravity load at/above story Px (kip)", kind: "number" },
    { key: "delta_in", label: "Design story drift delta (in)", kind: "number" },
    { key: "ie", label: "Importance factor Ie", kind: "number", default: 1.0 },
    { key: "vx_kip", label: "Seismic story shear Vx (kip)", kind: "number" },
    { key: "hsx_in", label: "Story height hsx (in)", kind: "number" },
    { key: "cd", label: "Deflection amplification Cd", kind: "number" },
    { key: "beta", label: "Shear demand/capacity ratio beta (default 1.0)", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "th", id: "spd-out-th", label: "Stability coefficient theta", value: (r) => fmt(r.theta, 3) },
    { key: "tm", id: "spd-out-tm", label: "Maximum theta_max", value: (r) => fmt(r.theta_max, 3) },
    { key: "v", id: "spd-out-v", label: "Verdict", value: (r) => r.verdict + (r.amplifier != null ? " = " + fmt(r.amplifier, 3) : "") },
    { key: "n", id: "spd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSeismicPdeltaStability,
});
CONSTRUCTION_RENDERERS["seismic-pdelta-stability"] = _renderSeismicPdelta;

// ===================== spec-v430..v431: concrete field-work pair (Group E) [v429 CUT as dupe of formwork-pressure] =====================

const _V430_REBAR_UNIT_WT = { "3": 0.376, "4": 0.668, "5": 1.043, "6": 1.502, "7": 2.044, "8": 2.670, "9": 3.400, "10": 4.303, "11": 5.313, "14": 7.65, "18": 13.60 };

// dims: in { bar_size: dimensionless, total_len_ft: L, price_per_lb: dimensionless } out: { unit_wt: dimensionless, weight_lb: M, tons: dimensionless }
export function computeRebarWeightTakeoff({ bar_size = "5", total_len_ft = 0, price_per_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const size = String(bar_size);
  const len = Number(total_len_ft) || 0;
  const price = Number(price_per_lb) || 0;
  const unit_wt = _V430_REBAR_UNIT_WT[size];
  if (!Number.isFinite(unit_wt)) return { error: "Unrecognized bar size (use 3-11, 14, or 18)." };
  if (!(len > 0)) return { error: "Total length must be positive (ft)." };
  const weight_lb = unit_wt * len;
  const tons = weight_lb / 2000;
  const cost_usd = price > 0 ? weight_lb * price : null;
  return {
    unit_wt, weight_lb, tons, cost_usd,
    note: "Rebar weight takeoff: the ASTM A615 nominal unit weight per foot (a #N bar is about N/8 inch in diameter; #3 is 0.376 lb/ft up to #11 at 5.313, then #14 at 7.65 and #18 at 13.60) times the total linear feet of that size, converted to tons and priced. Rebar is bought and priced by weight, so a bill of material is summed size-by-size. Add lap-splice and waste length before this (the takeoff is of the placed length). A quantity aid; the shop drawings and the mill's actual weights govern.",
  };
}
export const rebarWeightTakeoffExample = { inputs: { bar_size: "5", total_len_ft: 500, price_per_lb: 0 } };
const _v430renderRebarWeightTakeoff = _simpleRenderer({
  citation: "Citation: Rebar weight takeoff (ASTM A615 nominal bar weights): unit weight per foot x total linear feet, to tons and cost. #3 0.376, #4 0.668, #5 1.043, ... #11 5.313, #14 7.65, #18 13.60 lb/ft. A quantity aid; the shop drawings and mill weights govern.",
  example: rebarWeightTakeoffExample.inputs,
  fields: [
    { key: "bar_size", label: "Bar size", kind: "select", options: [
      { value: "3", label: "#3 (0.376 lb/ft)" }, { value: "4", label: "#4 (0.668)" }, { value: "5", label: "#5 (1.043)" },
      { value: "6", label: "#6 (1.502)" }, { value: "7", label: "#7 (2.044)" }, { value: "8", label: "#8 (2.670)" },
      { value: "9", label: "#9 (3.400)" }, { value: "10", label: "#10 (4.303)" }, { value: "11", label: "#11 (5.313)" },
      { value: "14", label: "#14 (7.65)" }, { value: "18", label: "#18 (13.60)" },
    ], default: "5" },
    { key: "total_len_ft", label: "Total linear feet of this size", kind: "number", default: 500 },
    { key: "price_per_lb", label: "Rebar price ($/lb, optional)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "w", id: "rwt-out-w", label: "Weight", value: (r) => fmt(r.weight_lb, 0) + " lb (" + fmt(r.tons, 2) + " ton, at " + fmt(r.unit_wt, 3) + " lb/ft)" },
    { key: "c", id: "rwt-out-c", label: "Cost", value: (r) => r.cost_usd == null ? "(enter a price)" : "$" + fmt(r.cost_usd, 2) },
    { key: "n", id: "rwt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRebarWeightTakeoff,
});
CONSTRUCTION_RENDERERS["rebar-weight-takeoff"] = _v430renderRebarWeightTakeoff;

// dims: in { volume_yd3: L^3, waste_pct: dimensionless, load_yd3: L^3, min_yd3: L^3, price_per_yd3: dimensionless } out: { ordered_yd3: L^3, trucks: dimensionless, last_load_yd3: L^3 }
export function computeReadyMixConcreteOrder({ volume_yd3 = 0, waste_pct = 8, load_yd3 = 10, min_yd3 = 10, price_per_yd3 = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const vol = Number(volume_yd3) || 0;
  const waste = Number(waste_pct) || 0;
  const load = Number(load_yd3) > 0 ? Number(load_yd3) : 10;
  const min = Number(min_yd3) || 0;
  const price = Number(price_per_yd3) || 0;
  if (!(vol > 0)) return { error: "Required volume must be positive (yd^3)." };
  if (waste < 0) return { error: "Waste allowance must be non-negative (%)." };
  if (!(load > 0)) return { error: "Truck capacity must be positive (yd^3)." };
  if (min < 0) return { error: "Plant minimum must be non-negative (yd^3)." };
  const ordered_yd3 = vol * (1 + waste / 100);
  const trucks = Math.ceil(ordered_yd3 / load);
  const last_load_yd3 = ordered_yd3 - (trucks - 1) * load;
  const short_load = ordered_yd3 < min;
  const cost_usd = price > 0 ? ordered_yd3 * price : null;
  return {
    ordered_yd3, trucks, last_load_yd3, short_load, cost_usd,
    note: "Ready-mix concrete order: the ordered volume = the in-place volume x (1 + a waste/over-order allowance, commonly 5-10% for spillage, over-excavation, and a safety margin so the pour is not short), the number of truckloads = the ordered volume / the truck capacity rounded up, and a short-load fee applies when the order is below the plant minimum (often ~10 yd^3). Running short mid-pour risks a cold joint, so ordering a little long is cheaper than a second small delivery. A quantity aid; the ready-mix supplier's truck size, minimum, and short-load and standby (waiting-time) fees govern.",
  };
}
export const readyMixConcreteOrderExample = { inputs: { volume_yd3: 42, waste_pct: 8, load_yd3: 10, min_yd3: 10, price_per_yd3: 0 } };
const _v431renderReadyMixConcreteOrder = _simpleRenderer({
  citation: "Citation: Ready-mix concrete order (concrete-supply practice): ordered = in-place volume x (1 + waste%), trucks = ceil(ordered / truck capacity), short-load fee when the order is below the plant minimum. A quantity aid; the supplier's truck size, minimum, and short-load/standby fees govern.",
  example: readyMixConcreteOrderExample.inputs,
  fields: [
    { key: "volume_yd3", label: "Required in-place volume (yd^3)", kind: "number", default: 42 },
    { key: "waste_pct", label: "Waste/over-order allowance (%)", kind: "number", default: 8 },
    { key: "load_yd3", label: "Truck capacity (yd^3, default 10)", kind: "number", default: 10 },
    { key: "min_yd3", label: "Plant minimum before short-load fee (yd^3)", kind: "number", default: 10 },
    { key: "price_per_yd3", label: "Concrete price ($/yd^3, optional)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "o", id: "rmc-out-o", label: "Order / trucks", value: (r) => fmt(r.ordered_yd3, 2) + " yd^3 -> " + r.trucks + " truck(s), last load " + fmt(r.last_load_yd3, 2) + " yd^3" },
    { key: "s", id: "rmc-out-s", label: "Short-load fee", value: (r) => r.short_load ? "YES -- order below the plant minimum" : "no (order meets the minimum)" },
    { key: "c", id: "rmc-out-c", label: "Cost", value: (r) => r.cost_usd == null ? "(enter a price)" : "$" + fmt(r.cost_usd, 2) },
    { key: "n", id: "rmc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeReadyMixConcreteOrder,
});
CONSTRUCTION_RENDERERS["ready-mix-concrete-order"] = _v431renderReadyMixConcreteOrder;

// ----- spec-v816: Shotcrete / Gunite Order Quantity with Rebound (Group E) -----
//
// A large fraction of shotcrete/gunite bounces off the work (rebound) and never
// stays, so the order grosses up: shot = in-place / (1 - rebound fraction).
// dims: in { area_sf: L^2, thickness_in: L, rebound_pct: dimensionless } out: { in_place_cy: L^3, shot_cy: L^3, rebound_cy: L^3 }
export function computeShotcreteReboundQuantity({ area_sf = 0, thickness_in = 0, rebound_pct = 20 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(area_sf > 0)) return { error: "Area must be positive (ft^2)." };
  if (!(thickness_in > 0)) return { error: "Thickness must be positive (in)." };
  if (!(rebound_pct >= 0) || rebound_pct >= 100) return { error: "Rebound must be between 0 and 100 percent (100 would order infinite material)." };
  const in_place_cy = (area_sf * (thickness_in / 12)) / 27;
  const shot_cy = in_place_cy / (1 - rebound_pct / 100);
  const rebound_cy = shot_cy - in_place_cy;
  if (![in_place_cy, shot_cy, rebound_cy].every(Number.isFinite)) return { error: "Shotcrete math is not a finite value." };
  return {
    in_place_cy,
    shot_cy,
    rebound_cy,
    note: "Rebound depends on process and orientation - roughly 5-15% for wet-mix vertical work and 15-30% for dry-mix (gunite) overhead. The value comes from the applicator's field record or the spec, not a constant. Rebound must be cleaned out and never worked back into the section. The shot volume is what you order; the in-place volume is what stays on the wall.",
  };
}
export const shotcreteReboundQuantityExample = { inputs: { area_sf: 500, thickness_in: 4, rebound_pct: 20 } };
const _v816renderShotcreteReboundQuantity = _simpleRenderer({
  citation: "Citation: rebound gross-up identity by name. shot volume = in-place volume / (1 - rebound fraction), where in-place = area x thickness/12 / 27 and rebound = shot minus in-place over shot. The applicator's field rebound governs.",
  example: shotcreteReboundQuantityExample.inputs,
  fields: [
    { key: "area_sf", label: "Area to shoot (ft^2)", kind: "number" },
    { key: "thickness_in", label: "In-place section thickness (in)", kind: "number" },
    { key: "rebound_pct", label: "Rebound loss (% of material shot)", kind: "number", default: 20 },
  ],
  outputs: [
    { key: "s", id: "src-out-s", label: "Shotcrete to order", value: (r) => _fmtC(r.shot_cy, 2) + " cy shot" },
    { key: "i", id: "src-out-i", label: "In-place volume", value: (r) => _fmtC(r.in_place_cy, 2) + " cy" },
    { key: "r", id: "src-out-r", label: "Rebound (lost)", value: (r) => _fmtC(r.rebound_cy, 2) + " cy" },
    { key: "n", id: "src-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeShotcreteReboundQuantity,
});
CONSTRUCTION_RENDERERS["shotcrete-rebound-quantity"] = _v816renderShotcreteReboundQuantity;

// ----- spec-v817: Annular Grout Volume for Cased Bore / Pipe-in-Casing (Group E) -----
//
// The grout in the ring between a bored casing and the carrier pipe: annular
// area = pi/4 (bore^2 - carrier^2); volume = area x length, grossed for waste.
// dims: in { bore_dia_in: L, carrier_od_in: L, length_ft: L, waste_pct: dimensionless } out: { annular_area_in2: L^2, neat_ft3: L^3, grout_cy: L^3, grout_gal: L^3 }
export function computeAnnularGroutVolume({ bore_dia_in = 0, carrier_od_in = 0, length_ft = 0, waste_pct = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(bore_dia_in > 0)) return { error: "Bore diameter must be positive (in)." };
  if (!(carrier_od_in > 0)) return { error: "Carrier diameter must be positive (in)." };
  if (!(length_ft > 0)) return { error: "Length must be positive (ft)." };
  if (carrier_od_in >= bore_dia_in) return { error: "Carrier diameter must be smaller than the bore (a positive annulus)." };
  if (!(waste_pct >= 0)) return { error: "Waste must be non-negative (%)." };
  const annular_area_in2 = (Math.PI / 4) * (bore_dia_in * bore_dia_in - carrier_od_in * carrier_od_in);
  const neat_ft3 = (annular_area_in2 / 144) * length_ft;
  const grout_cy = (neat_ft3 / 27) * (1 + waste_pct / 100);
  const grout_gal = neat_ft3 * 7.48052 * (1 + waste_pct / 100);
  if (![annular_area_in2, neat_ft3, grout_cy, grout_gal].every(Number.isFinite)) return { error: "Grout-volume math is not a finite value." };
  return {
    annular_area_in2,
    neat_ft3,
    grout_cy,
    grout_gal,
    note: "The grout fills the void so the carrier neither floats during the pour nor settles after. The theoretical volume assumes a clean concentric annulus; the field always overruns it (voids, overcut, an out-of-round bore), so the waste factor is a floor, not a ceiling. The mix design and the AHJ / owner spec govern.",
  };
}
export const annularGroutVolumeExample = { inputs: { bore_dia_in: 24, carrier_od_in: 16, length_ft: 100, waste_pct: 5 } };
const _v817renderAnnularGroutVolume = _simpleRenderer({
  citation: "Citation: annular-area identity by name. area = pi/4 x (bore^2 - carrier^2); neat volume = area / 144 x length; ordered = neat x (1 + waste). The field always overruns the neat annulus.",
  example: annularGroutVolumeExample.inputs,
  fields: [
    { key: "bore_dia_in", label: "Bore / casing inside diameter (in)", kind: "number" },
    { key: "carrier_od_in", label: "Carrier pipe outside diameter (in)", kind: "number" },
    { key: "length_ft", label: "Run length (ft)", kind: "number" },
    { key: "waste_pct", label: "Pumping / overcut waste (%)", kind: "number", default: 5 },
  ],
  outputs: [
    { key: "cy", id: "agv-out-cy", label: "Grout to order", value: (r) => _fmtC(r.grout_cy, 2) + " cy (" + _fmtC(r.grout_gal, 0) + " gal)" },
    { key: "n0", id: "agv-out-n0", label: "Neat annulus volume", value: (r) => _fmtC(r.neat_ft3, 1) + " ft^3" },
    { key: "a", id: "agv-out-a", label: "Annular area", value: (r) => _fmtC(r.annular_area_in2, 1) + " in^2" },
    { key: "n", id: "agv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAnnularGroutVolume,
});
CONSTRUCTION_RENDERERS["annular-grout-volume"] = _v817renderAnnularGroutVolume;

// ----- spec-v818: Conical Stockpile Volume and Tonnage (Group E) -----
//
// A free-standing cone of material stands at its angle of repose: height =
// radius x tan(repose); volume = 1/3 pi r^2 h; tonnage from the bulk density.
// dims: in { base_diameter_ft: L, repose_angle_deg: dimensionless, density_pcf: M L^-3 } out: { radius_ft: L, height_ft: L, volume_ft3: L^3, volume_cy: L^3, tons: M }
export function computeStockpileVolume({ base_diameter_ft = 0, repose_angle_deg = 37, density_pcf = 100 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(base_diameter_ft > 0)) return { error: "Base diameter must be positive (ft)." };
  if (!(density_pcf > 0)) return { error: "Density must be positive (pcf)." };
  if (!(repose_angle_deg > 0) || repose_angle_deg >= 90) return { error: "Repose angle must be between 0 and 90 degrees (exclusive)." };
  const radius_ft = base_diameter_ft / 2;
  const height_ft = radius_ft * Math.tan((repose_angle_deg * Math.PI) / 180);
  const volume_ft3 = (1 / 3) * Math.PI * radius_ft * radius_ft * height_ft;
  const volume_cy = volume_ft3 / 27;
  const tons = (volume_ft3 * density_pcf) / 2000;
  if (![radius_ft, height_ft, volume_ft3, volume_cy, tons].every(Number.isFinite)) return { error: "Stockpile math is not a finite value." };
  return {
    radius_ft,
    height_ft,
    volume_ft3,
    volume_cy,
    tons,
    note: "The pile is idealized as a clean cone on flat ground - an irregular base, a flat top, or a pile against a wall all change it. The angle of repose depends on the material and its moisture (roughly 30-40 degrees for granular material) and steepens as the material gets damp or angular. A survey volume governs for payment.",
  };
}
export const stockpileVolumeExample = { inputs: { base_diameter_ft: 60, repose_angle_deg: 37, density_pcf: 100 } };
const _v818renderStockpileVolume = _simpleRenderer({
  citation: "Citation: right-circular-cone identity by name. height = radius x tan(repose angle); volume = 1/3 x pi x radius^2 x height; tonnage = volume x bulk density / 2000. The pile is idealized as a clean cone; a survey governs for payment.",
  example: stockpileVolumeExample.inputs,
  fields: [
    { key: "base_diameter_ft", label: "Pile base diameter (ft)", kind: "number" },
    { key: "repose_angle_deg", label: "Angle of repose (degrees)", kind: "number", default: 37 },
    { key: "density_pcf", label: "Loose bulk density (pcf)", kind: "number", default: 100 },
  ],
  outputs: [
    { key: "v", id: "spv-out-v", label: "Volume", value: (r) => _fmtC(r.volume_cy, 0) + " cy (" + _fmtC(r.volume_ft3, 0) + " ft^3)" },
    { key: "t", id: "spv-out-t", label: "Tonnage", value: (r) => _fmtC(r.tons, 0) + " tons" },
    { key: "h", id: "spv-out-h", label: "Pile height", value: (r) => _fmtC(r.height_ft, 1) + " ft" },
    { key: "n", id: "spv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeStockpileVolume,
});
CONSTRUCTION_RENDERERS["stockpile-volume"] = _v818renderStockpileVolume;

// ----- spec-v819: Welded-Wire Reinforcement (Mesh) Sheet Takeoff (Group E) -----
//
// Slab mesh is lapped one full square at the sides and ends, so the effective
// coverage per sheet shrinks and drives the purchase count above the nominal.
// dims: in { slab_area_sf: L^2, sheet_width_ft: L, sheet_length_ft: L, side_lap_in: L, end_lap_in: L, waste_pct: dimensionless } out: { effective_sheet_sf: L^2, gross_area_sf: L^2, sheets: dimensionless, purchased_sf: L^2 }
export function computeWeldedWireMesh({ slab_area_sf = 0, sheet_width_ft = 5, sheet_length_ft = 10, side_lap_in = 6, end_lap_in = 6, waste_pct = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(slab_area_sf > 0)) return { error: "Slab area must be positive (ft^2)." };
  if (!(sheet_width_ft > 0)) return { error: "Sheet width must be positive (ft)." };
  if (!(sheet_length_ft > 0)) return { error: "Sheet length must be positive (ft)." };
  if (!(waste_pct >= 0)) return { error: "Waste must be non-negative (%)." };
  const eff_w = sheet_width_ft - side_lap_in / 12;
  const eff_l = sheet_length_ft - end_lap_in / 12;
  if (!(eff_w > 0) || !(eff_l > 0)) return { error: "Lap must be smaller than the sheet dimension (a positive effective sheet)." };
  const effective_sheet_sf = eff_w * eff_l;
  const gross_area_sf = slab_area_sf * (1 + waste_pct / 100);
  const sheets = Math.ceil(gross_area_sf / effective_sheet_sf);
  const purchased_sf = sheets * sheet_width_ft * sheet_length_ft;
  if (![effective_sheet_sf, gross_area_sf, sheets, purchased_sf].every(Number.isFinite)) return { error: "Mesh-takeoff math is not a finite value." };
  return {
    effective_sheet_sf,
    gross_area_sf,
    sheets,
    purchased_sf,
    note: "Mesh is lapped one full square (6 in minimum) at the sides and ends, so the effective coverage per sheet is less than its nominal area - ignoring the laps under-counts. The ACI / structural drawings set the sheet size and style (for example 6x6 W2.9). This is a purchase quantity, not a placement plan.",
  };
}
export const weldedWireMeshExample = { inputs: { slab_area_sf: 2000, sheet_width_ft: 5, sheet_length_ft: 10, side_lap_in: 6, end_lap_in: 6, waste_pct: 5 } };
const _v819renderWeldedWireMesh = _simpleRenderer({
  citation: "Citation: lapped-coverage identity by name. effective sheet = (width - side lap/12) x (length - end lap/12); sheets = ceil(slab area x (1 + waste) / effective sheet). Mesh is lapped one full square at the sides and ends; the structural drawings set the style.",
  example: weldedWireMeshExample.inputs,
  fields: [
    { key: "slab_area_sf", label: "Slab area to reinforce (ft^2)", kind: "number" },
    { key: "sheet_width_ft", label: "Mesh sheet width (ft)", kind: "number", default: 5 },
    { key: "sheet_length_ft", label: "Mesh sheet length (ft)", kind: "number", default: 10 },
    { key: "side_lap_in", label: "Side lap (in)", kind: "number", default: 6 },
    { key: "end_lap_in", label: "End lap (in)", kind: "number", default: 6 },
    { key: "waste_pct", label: "Waste / cutting allowance (%)", kind: "number", default: 5 },
  ],
  outputs: [
    { key: "s", id: "wwm-out-s", label: "Sheets to order", value: (r) => String(r.sheets) + " sheets (" + _fmtC(r.purchased_sf, 0) + " sf purchased)" },
    { key: "e", id: "wwm-out-e", label: "Effective coverage per sheet", value: (r) => _fmtC(r.effective_sheet_sf, 2) + " sf" },
    { key: "g", id: "wwm-out-g", label: "Gross area with waste", value: (r) => _fmtC(r.gross_area_sf, 0) + " sf" },
    { key: "n", id: "wwm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWeldedWireMesh,
});
CONSTRUCTION_RENDERERS["welded-wire-mesh"] = _v819renderWeldedWireMesh;

// ----- spec-v814: Concrete Pour Rate, Rate of Rise, and Delivery Cadence (Group E) -----
//
// The placement-logistics complement to formwork-pressure, which takes the rate
// of rise as an input this tile produces from the crew's placement rate and the
// form footprint, plus the pour duration and the ready-mix delivery cadence.
// dims: in { placement_rate_cyhr: L^3 T^-1, form_plan_area_ft2: L^2, total_volume_cy: L^3, truck_load_cy: L^3 } out: { rate_of_rise_ft_hr: L T^-1, pour_hours: T, trucks_per_hour: dimensionless }
export function computeConcretePourRate({ placement_rate_cyhr = 0, form_plan_area_ft2 = 0, total_volume_cy = 0, truck_load_cy = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(placement_rate_cyhr > 0)) return { error: "Placement rate must be positive (cy/hr)." };
  if (!(form_plan_area_ft2 > 0)) return { error: "Form plan area must be positive (ft^2)." };
  if (!(total_volume_cy > 0)) return { error: "Total volume must be positive (cy)." };
  if (!(truck_load_cy > 0)) return { error: "Truck load must be positive (cy)." };
  const rate_of_rise_ft_hr = (placement_rate_cyhr * 27) / form_plan_area_ft2;
  const pour_hours = total_volume_cy / placement_rate_cyhr;
  const trucks_per_hour = placement_rate_cyhr / truck_load_cy;
  if (![rate_of_rise_ft_hr, pour_hours, trucks_per_hour].every(Number.isFinite)) return { error: "Pour-rate math is not a finite value." };
  return {
    rate_of_rise_ft_hr,
    pour_hours,
    trucks_per_hour,
    note: "The rate of rise is the input formwork-pressure uses to set the design lateral pressure - placing faster than the forms are designed for is how a form blowout happens, so feed this number back into formwork-pressure before speeding up. The pour must stay continuous to avoid a cold joint. The delivery cadence assumes the plant can sustain the trucks-per-hour; standby and short-load fees are separate. The form design governs the safe rate of rise.",
  };
}
export const concretePourRateExample = { inputs: { placement_rate_cyhr: 20, form_plan_area_ft2: 100, total_volume_cy: 44.44, truck_load_cy: 10 } };
const _v814renderConcretePourRate = _simpleRenderer({
  citation: "Citation: rate-of-rise identity by name. rate of rise = placement rate (cy/hr) x 27 / form plan footprint area (ft^2); pour duration = total volume / placement rate; trucks per hour = placement rate / truck load. The rate of rise is the input formwork-pressure consumes.",
  example: concretePourRateExample.inputs,
  fields: [
    { key: "placement_rate_cyhr", label: "Crew placement rate (cy/hr)", kind: "number" },
    { key: "form_plan_area_ft2", label: "Form plan footprint (ft^2, wall = length x thickness)", kind: "number" },
    { key: "total_volume_cy", label: "Total pour volume (cy)", kind: "number" },
    { key: "truck_load_cy", label: "Ready-mix truck load (cy)", kind: "number", default: 10 },
  ],
  outputs: [
    { key: "ror", id: "cpr-out-ror", label: "Rate of rise", value: (r) => _fmtC(r.rate_of_rise_ft_hr, 2) + " ft/hr" },
    { key: "ph", id: "cpr-out-ph", label: "Pour duration", value: (r) => _fmtC(r.pour_hours, 2) + " hr" },
    { key: "tph", id: "cpr-out-tph", label: "Delivery cadence", value: (r) => _fmtC(r.trucks_per_hour, 2) + " trucks/hr" },
    { key: "n", id: "cpr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcretePourRate,
});
CONSTRUCTION_RENDERERS["concrete-pour-rate"] = _v814renderConcretePourRate;

// ===================== spec-v439..v440: finish-carpentry takeoff pair (Group E) [v438 CUT as dupe of flooring-takeoff] =====================

// dims: in { area_ft2: L^2, coverage_per_batt: L^2, coverage_per_bag: L^2, waste_pct: dimensionless } out: { net_ft2: L^2, batts: dimensionless, bags: dimensionless }
export function computeInsulationBattCoverage({ area_ft2 = 0, coverage_per_batt = 0, coverage_per_bag = 0, waste_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(area_ft2) || 0;
  const covBatt = Number(coverage_per_batt) || 0;
  const covBag = Number(coverage_per_bag) || 0;
  const waste = Number(waste_pct) || 0;
  if (!(area > 0)) return { error: "Cavity area must be positive (ft^2)." };
  if (waste < 0) return { error: "Waste allowance must be non-negative (%)." };
  if (!(covBatt > 0) && !(covBag > 0)) return { error: "Enter the coverage per batt and/or per bag (ft^2)." };
  const net_ft2 = area * (1 + waste / 100);
  const batts = covBatt > 0 ? Math.ceil(net_ft2 / covBatt) : null;
  const bags = covBag > 0 ? Math.ceil(net_ft2 / covBag) : null;
  return {
    net_ft2, batts, bags,
    note: "Batt insulation takeoff: the net cavity area (wall or ceiling, less window and door openings) times a waste allowance, divided by the coverage of one batt (a piece) and by the coverage per bag from the label, each rounded up. Coverage depends on the R-value and cavity width: an R-13 batt for a 15 in on-center 2x4 wall covers about 10.67 ft^2, and a deeper R-value packs fewer square feet per bag. Buy by the bag but count the batts to confirm the wall is fully filled. A quantity aid; the manufacturer's label coverage governs.",
  };
}
export const insulationBattCoverageExample = { inputs: { area_ft2: 500, coverage_per_batt: 10.67, coverage_per_bag: 88, waste_pct: 0 } };
const _v439renderInsulationBattCoverage = _simpleRenderer({
  citation: "Citation: Batt insulation takeoff (manufacturer label coverage): net area x (1 + waste%), divided by the coverage per batt and per bag, each rounded up. Coverage depends on R-value and cavity width (an R-13 15 in batt covers ~10.67 ft^2). A quantity aid; the label coverage governs.",
  example: insulationBattCoverageExample.inputs,
  fields: [
    { key: "area_ft2", label: "Net cavity area (ft^2, less openings)", kind: "number", default: 500 },
    { key: "coverage_per_batt", label: "Coverage per batt (ft^2, e.g. 10.67 for R-13 15 in)", kind: "number", default: 10.67 },
    { key: "coverage_per_bag", label: "Coverage per bag (ft^2, from the label)", kind: "number", default: 88 },
    { key: "waste_pct", label: "Waste allowance (%)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "b", id: "ibc-out-b", label: "Batts (pieces)", value: (r) => r.batts == null ? "(enter coverage per batt)" : r.batts + " batts" },
    { key: "g", id: "ibc-out-g", label: "Bags", value: (r) => r.bags == null ? "(enter coverage per bag)" : r.bags + " bags (net " + fmt(r.net_ft2, 0) + " ft^2)" },
    { key: "n", id: "ibc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeInsulationBattCoverage,
});
CONSTRUCTION_RENDERERS["insulation-batt-coverage"] = _v439renderInsulationBattCoverage;

// dims: in { perimeter_ft: L, openings_ft: L, waste_pct: dimensionless, stock_len_ft: L, spring_deg: dimensionless } out: { net_ft: L, pieces: dimensionless, miter_deg: dimensionless, bevel_deg: dimensionless }
export function computeTrimLinearFootage({ perimeter_ft = 0, openings_ft = 0, waste_pct = 10, stock_len_ft = 16, spring_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const perim = Number(perimeter_ft) || 0;
  const openings = Number(openings_ft) || 0;
  const waste = Number(waste_pct) || 0;
  const stock = Number(stock_len_ft) > 0 ? Number(stock_len_ft) : 16;
  const spring = Number(spring_deg) || 0;
  if (!(perim > 0)) return { error: "Perimeter must be positive (ft)." };
  if (openings < 0) return { error: "Opening width must be non-negative (ft)." };
  if (!(openings < perim)) return { error: "Openings cannot meet or exceed the perimeter." };
  if (waste < 0) return { error: "Waste allowance must be non-negative (%)." };
  const trimmed_ft = perim - openings;
  const net_ft = trimmed_ft * (1 + waste / 100);
  const pieces = Math.ceil(net_ft / stock);
  const crown = spring > 0 && spring < 90;
  const sr = spring * Math.PI / 180;
  const miter_deg = crown ? Math.atan(Math.sin(sr) * Math.tan(Math.PI / 4)) * 180 / Math.PI : 45;
  const bevel_deg = crown ? Math.asin(Math.cos(sr) * Math.sin(Math.PI / 4)) * 180 / Math.PI : 0;
  return {
    net_ft, pieces, miter_deg, bevel_deg, crown,
    note: "Trim linear footage and corner cuts: the run to trim = the room perimeter minus the door openings (no base or casing runs across a doorway), times a waste allowance (commonly 10% for cuts and defects), divided by the stock length and rounded up to the number of sticks. For baseboard and casing an inside/outside corner is a flat 45-degree miter; for crown molding cut flat on the saw, the compound cut is miter = atan(sin(spring) x tan 45) and bevel = asin(cos(spring) x sin 45) from the crown's spring angle (38 or 45 degrees). A quantity and setup aid; verify the miter on a scrap and the actual wall angles.",
  };
}
export const trimLinearFootageExample = { inputs: { perimeter_ft: 70, openings_ft: 6, waste_pct: 10, stock_len_ft: 16, spring_deg: 0 } };
const _v440renderTrimLinearFootage = _simpleRenderer({
  citation: "Citation: Trim takeoff and corner cuts (finish-carpentry practice): net = (perimeter - openings) x (1 + waste%), pieces = ceil(net / stock length). Corners are 45-degree miters for base/casing; for crown cut flat, miter = atan(sin(spring) tan 45), bevel = asin(cos(spring) sin 45). A quantity and setup aid; verify on a scrap.",
  example: trimLinearFootageExample.inputs,
  fields: [
    { key: "perimeter_ft", label: "Room perimeter (ft)", kind: "number", default: 70 },
    { key: "openings_ft", label: "Total door-opening width (ft, no trim below)", kind: "number", default: 6 },
    { key: "waste_pct", label: "Waste allowance (%)", kind: "number", default: 10 },
    { key: "stock_len_ft", label: "Trim stock length (ft, default 16)", kind: "number", default: 16 },
    { key: "spring_deg", label: "Crown spring angle (deg, 0 = baseboard/casing)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "lf", id: "tlf-out-lf", label: "Trim to order / pieces", value: (r) => fmt(r.net_ft, 1) + " ft -> " + r.pieces + " stick(s)" },
    { key: "cut", id: "tlf-out-cut", label: "Corner cut", value: (r) => r.crown ? "crown: " + fmt(r.miter_deg, 1) + " deg miter, " + fmt(r.bevel_deg, 1) + " deg bevel (cut flat)" : "45 deg miter (base/casing)" },
    { key: "n", id: "tlf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTrimLinearFootage,
});
CONSTRUCTION_RENDERERS["trim-linear-footage"] = _v440renderTrimLinearFootage;

// ===================== spec-v448: glulam volume factor Cv (NDS 5.3.6) =====================
// dims: in { span_ft: L, depth_in: L, width_in: L, x: dimensionless, kl: dimensionless } out: { cv: dimensionless, reduction_pct: dimensionless }
export function computeGlulamVolumeFactor({ span_ft = 0, depth_in = 0, width_in = 0, x = 10, kl = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const span = Number(span_ft) || 0;
  const d = Number(depth_in) || 0;
  const b = Number(width_in) || 0;
  const xExp = Number(x) || 0;
  const kL = Number(kl) || 0;
  if (!(span > 0)) return { error: "Span must be positive (ft)." };
  if (!(d > 0)) return { error: "Depth must be positive (in)." };
  if (!(b > 0)) return { error: "Width must be positive (in)." };
  if (!(xExp > 0)) return { error: "Species exponent x must be positive (10 softwood, 20 Southern Pine)." };
  if (!(kL > 0)) return { error: "Loading factor KL must be positive." };
  const raw = kL * Math.pow(21 / span, 1 / xExp) * Math.pow(12 / d, 1 / xExp) * Math.pow(5.125 / b, 1 / xExp);
  const cv = Math.min(raw, 1.0);
  const reduction_pct = (1 - cv) * 100;
  return {
    cv, reduction_pct, capped: raw > 1.0,
    note: "NDS 2018 §5.3.6 glulam volume factor Cv = KL x (21/L)^(1/x) x (12/d)^(1/x) x (5.125/b)^(1/x), capped at 1.0, where L is the span (ft), d and b the depth and width (in), x = 10 for softwoods (20 for Southern Pine), and KL = 1.0 for a uniformly loaded simple span. A larger stressed volume is more likely to contain a strength-limiting defect, so the reference bending value is reduced. The allowable bending uses the LESSER of Cv and the beam-stability factor CL; Cv applies to glulam bending about the x-x axis, not sawn lumber. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  };
}
export const glulamVolumeFactorExample = { inputs: { span_ft: 20, depth_in: 18, width_in: 5.125, x: 10, kl: 1.0 } };
const _v448renderGlulamVolumeFactor = _simpleRenderer({
  citation: "Citation: NDS 2018 §5.3.6 glulam volume factor Cv = KL x (21/L)^(1/x) x (12/d)^(1/x) x (5.125/b)^(1/x) <= 1.0, with x = 10 (softwood) or 20 (Southern Pine) and KL = 1.0 for a uniformly loaded simple span. The allowable bending uses the lesser of Cv and the stability factor CL. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: glulamVolumeFactorExample.inputs,
  fields: [
    { key: "span_ft", label: "Beam span L (ft)", kind: "number", default: 20 },
    { key: "depth_in", label: "Beam depth d (in)", kind: "number", default: 18 },
    { key: "width_in", label: "Beam width b (in)", kind: "number", default: 5.125 },
    { key: "x", label: "Species exponent x", kind: "select", default: "10", options: [{ value: "10", label: "10 (softwood, DF/SPF)" }, { value: "20", label: "20 (Southern Pine)" }] },
    { key: "kl", label: "Loading factor KL (1.0 uniform simple span)", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "cv", id: "gvf-out-cv", label: "Volume factor Cv", value: (r) => fmt(r.cv, 3) + (r.capped ? " (capped at 1.0)" : "") },
    { key: "red", id: "gvf-out-red", label: "Bending-value reduction", value: (r) => fmt(r.reduction_pct, 1) + "%" },
    { key: "n", id: "gvf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGlulamVolumeFactor,
});
CONSTRUCTION_RENDERERS["glulam-volume-factor"] = _v448renderGlulamVolumeFactor;

// ===================== spec-v453: intermittent fillet weld schedule (AISC J2 / AWS) =====================
// dims: in { w_req_in: L, w_intermit_in: L, increment_in: L } out: { fraction: dimensionless, pitch_in: L, min_incr_in: L }
export function computeIntermittentFilletWeld({ w_req_in = 0, w_intermit_in = 0, increment_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const wReq = Number(w_req_in) || 0;
  const wInt = Number(w_intermit_in) || 0;
  const incr = Number(increment_in) || 0;
  if (!(wReq > 0)) return { error: "Required continuous weld size must be positive (in)." };
  if (!(wInt > 0)) return { error: "Intermittent weld size must be positive (in)." };
  if (!(incr > 0)) return { error: "Weld increment length must be positive (in)." };
  if (wReq > wInt) return { error: "Intermittent size must be at least the required continuous size (a stitch weld cannot be weaker than the weld it replaces)." };
  const fraction = wReq / wInt;
  const pitch_in = incr / fraction;
  const min_incr_in = Math.max(4 * wInt, 1.5);
  const ok = incr >= min_incr_in;
  return {
    fraction, pitch_in, min_incr_in, ok, increment_in: incr,
    note: "Intermittent (stitch) fillet weld schedule: when a required continuous fillet is smaller than the practical minimum weld for the plate, weld a larger intermittent fillet over only part of the length. To match a continuous weld of size w_req with an intermittent weld of size w, weld a fraction w_req/w of the length; the pitch (center to center) is P = increment / fraction, so you weld the increment, skip (pitch - increment), and repeat. AISC 360 J2.2b requires each increment be at least the greater of 4 x the weld size or 1.5 in. The maximum longitudinal spacing (J3.5), end returns, and minimum-length rules are separate checks. A design aid, not a substitute for the engineer of record.",
  };
}
export const intermittentFilletWeldExample = { inputs: { w_req_in: 0.1875, w_intermit_in: 0.3125, increment_in: 3 } };
const _v453renderIntermittentFilletWeld = _simpleRenderer({
  citation: "Citation: AISC 360 J2.2b / AWS D1.1 intermittent fillet weld: weld a fraction w_req/w of the length at the larger stitch size w, pitch P = increment / fraction, each increment at least the greater of 4 x weld size or 1.5 in. Maximum spacing and end returns are separate checks. A design aid, not a substitute for the engineer of record.",
  example: intermittentFilletWeldExample.inputs,
  fields: [
    { key: "w_req_in", label: "Required continuous fillet size (in)", kind: "number", default: 0.1875 },
    { key: "w_intermit_in", label: "Intermittent (stitch) fillet size (in)", kind: "number", default: 0.3125 },
    { key: "increment_in", label: "Weld increment length (in)", kind: "number", default: 3 },
  ],
  outputs: [
    { key: "frac", id: "ifw-out-frac", label: "Fraction of length to weld", value: (r) => fmt(r.fraction * 100, 1) + "%" },
    { key: "pitch", id: "ifw-out-pitch", label: "Pitch (center to center)", value: (r) => fmt(r.pitch_in, 2) + " in (weld " + fmt(r.increment_in, 2) + " in, skip " + fmt(r.pitch_in - r.increment_in, 2) + " in)" },
    { key: "min", id: "ifw-out-min", label: "Minimum increment check", value: (r) => "min " + fmt(r.min_incr_in, 2) + " in -- " + (r.ok ? "increment OK" : "increment TOO SHORT") },
    { key: "n", id: "ifw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeIntermittentFilletWeld,
});
CONSTRUCTION_RENDERERS["intermittent-fillet-weld"] = _v453renderIntermittentFilletWeld;

// ===================== spec-v454: multi-bend flat pattern (developed length) =====================
// dims: in { mold_line_in: L, n_bends: dimensionless, bd_in: L } out: { flat_in: L, total_deduction_in: L }
export function computeMultiBendFlatPattern({ mold_line_in = 0, n_bends = 0, bd_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const mold = Number(mold_line_in) || 0;
  const n = Number(n_bends) || 0;
  const bd = Number(bd_in) || 0;
  if (!(mold > 0)) return { error: "Mold-line length must be positive (in)." };
  if (!(n > 0) || !Number.isInteger(n)) return { error: "Number of bends must be a positive whole number." };
  if (!(bd >= 0)) return { error: "Bend deduction must be non-negative (in)." };
  const total_deduction_in = n * bd;
  const flat_in = mold - total_deduction_in;
  if (!(flat_in > 0)) return { error: "Total bend deduction exceeds the mold-line length -- check the deduction and bend count." };
  return {
    flat_in, total_deduction_in,
    note: "Multi-bend flat pattern (developed length): the flat blank for a part with several bends is the sum of the outside (mold-line) flange dimensions minus the bend deduction for each bend, flat = mold_line - n_bends x BD, where the per-bend BD comes from the bend-deduction/setback relation (see bend-allowance). Each bend pulls material out of the blank, so more bends give a shorter flat. Mold-line dimensions are measured to the theoretical sharp outside corners. A layout aid; confirm the first part against a test bend on the actual press brake, since the real BD shifts with tooling, material, and grain direction.",
  };
}
export const multiBendFlatPatternExample = { inputs: { mold_line_in: 8, n_bends: 2, bd_in: 0.1355 } };
const _v454renderMultiBendFlatPattern = _simpleRenderer({
  citation: "Citation: Multi-bend flat pattern: flat = mold_line - n_bends x BD, the sum of outside (mold-line) flange dimensions minus the bend deduction per bend (from bend-allowance). A layout aid; confirm the first part against a test bend, since the real BD shifts with tooling, material, and grain.",
  example: multiBendFlatPatternExample.inputs,
  fields: [
    { key: "mold_line_in", label: "Sum of mold-line (outside) flanges (in)", kind: "number", default: 8 },
    { key: "n_bends", label: "Number of bends", kind: "number", default: 2 },
    { key: "bd_in", label: "Bend deduction per bend (in, from bend-allowance)", kind: "number", default: 0.1355 },
  ],
  outputs: [
    { key: "flat", id: "mbfp-out-flat", label: "Developed flat length", value: (r) => fmt(r.flat_in, 3) + " in" },
    { key: "ded", id: "mbfp-out-ded", label: "Total deduction", value: (r) => fmt(r.total_deduction_in, 3) + " in" },
    { key: "n", id: "mbfp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMultiBendFlatPattern,
});
CONSTRUCTION_RENDERERS["multi-bend-flat-pattern"] = _v454renderMultiBendFlatPattern;

// ===================== spec-v467: powered attic ventilator sizing =====================
// dims: in { attic_area_ft2: L^2, cfm_per_ft2: dimensionless, dark_roof: dimensionless } out: { fan_cfm: L^3 T^-1, intake_ft2: L^2, intake_in2: L^2 }
export function computePoweredAtticVentilator({ attic_area_ft2 = 0, cfm_per_ft2 = 0.7, dark_roof = "no" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(attic_area_ft2) || 0;
  const factor = Number(cfm_per_ft2) || 0;
  const dark = dark_roof === "yes" || dark_roof === true;
  if (!(area > 0)) return { error: "Attic floor area must be positive (ft^2)." };
  if (!(factor > 0)) return { error: "Airflow factor must be positive (CFM per ft^2)." };
  const fan_cfm = area * factor * (dark ? 1.15 : 1.0);
  const intake_ft2 = fan_cfm / 300;
  const intake_in2 = intake_ft2 * 144;
  return {
    fan_cfm, intake_ft2, intake_in2, dark,
    note: "Powered attic ventilator (fan) sizing: size the fan to about 0.7 CFM per square foot of attic floor (roughly 10 air changes per hour for a typical attic), with about a 15% increase for a dark roof that runs hotter. The fan needs matching intake (soffit) net free area of roughly 1 ft^2 per 300 CFM so it pulls outdoor air rather than starving and depressurizing the attic (which can back-draft combustion appliances or pull conditioned air from the house). Powered ventilators are one approach; balanced passive ridge-and-soffit ventilation (see the attic-ventilation tile) is often preferred and some codes restrict powered fans. A sizing aid; the fan manufacturer's data and the local code govern.",
  };
}
export const poweredAtticVentilatorExample = { inputs: { attic_area_ft2: 1500, cfm_per_ft2: 0.7, dark_roof: "no" } };
const _v467renderPoweredAtticVentilator = _simpleRenderer({
  citation: "Citation: Powered attic ventilator sizing: fan ~0.7 CFM per ft^2 of attic floor (about 10 ACH), +~15% for a dark roof; matching intake net free area ~1 ft^2 per 300 CFM. Balanced passive ventilation is often preferred and some codes restrict powered fans. A sizing aid; the fan manufacturer's data and the local code govern.",
  example: poweredAtticVentilatorExample.inputs,
  fields: [
    { key: "attic_area_ft2", label: "Attic floor area (ft^2)", kind: "number", default: 1500 },
    { key: "cfm_per_ft2", label: "Airflow factor (CFM per ft^2)", kind: "number", default: 0.7 },
    { key: "dark_roof", label: "Dark roof (~15% increase)?", kind: "select", default: "no", options: [{ value: "no", label: "No (light/average roof)" }, { value: "yes", label: "Yes (dark roof)" }] },
  ],
  outputs: [
    { key: "fan", id: "pav-out-fan", label: "Fan size", value: (r) => fmt(r.fan_cfm, 0) + " CFM" + (r.dark ? " (dark-roof adjusted)" : "") },
    { key: "in", id: "pav-out-in", label: "Required intake (soffit) area", value: (r) => fmt(r.intake_ft2, 1) + " ft^2 (" + fmt(r.intake_in2, 0) + " in^2)" },
    { key: "n", id: "pav-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePoweredAtticVentilator,
});
CONSTRUCTION_RENDERERS["powered-attic-ventilator"] = _v467renderPoweredAtticVentilator;

// ===================== spec-v468: rain-on-snow surcharge (ASCE 7-22 7.10) =====================
// dims: in { pf_psf: M L^-1 T^-2, pg_psf: M L^-1 T^-2, slope_deg: dimensionless, eave_to_ridge_ft: L, surcharge_psf: M L^-1 T^-2 } out: { total_psf: M L^-1 T^-2 }
export function computeRainOnSnowSurcharge({ pf_psf = 0, pg_psf = 0, slope_deg = 0, eave_to_ridge_ft = 0, surcharge_psf = 8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const pf = Number(pf_psf) || 0;
  const pg = Number(pg_psf) || 0;
  const slope = Number(slope_deg) || 0;
  const W = Number(eave_to_ridge_ft) || 0;
  const surcharge = Number(surcharge_psf) || 0;
  if (!(pf > 0)) return { error: "Flat-roof snow load Pf must be positive (psf)." };
  if (!(pg > 0)) return { error: "Ground snow load Pg must be positive (psf)." };
  if (!(W > 0)) return { error: "Eave-to-ridge distance W must be positive (ft)." };
  if (slope < 0) return { error: "Slope must be non-negative (deg)." };
  if (surcharge < 0) return { error: "Surcharge must be non-negative (psf)." };
  const applies = pg <= 20 && slope < W / 50;
  const total_psf = pf + (applies ? surcharge : 0);
  return {
    applies, total_psf, added_psf: applies ? surcharge : 0,
    note: "Rain-on-snow surcharge (ASCE 7-22 §7.10): where the ground snow load Pg is 20 psf or less and the roof slope (in degrees) is less than W/50 with W the eave-to-ridge distance in feet, add a surcharge to the balanced flat-roof snow load Pf. ASCE 7-22 raised this surcharge to 5-8 psf (commonly 8) from the older flat 5 psf, because a low-slope roof in a warm, wet-snow climate can hold rain in the snowpack that would run off a steeper roof. It applies only to the balanced load case and only where both triggers are met; a steep roof or a deep-snow (high-Pg) region does not take the surcharge. A design aid, not a substitute for the engineer of record.",
  };
}
export const rainOnSnowSurchargeExample = { inputs: { pf_psf: 15, pg_psf: 18, slope_deg: 1, eave_to_ridge_ft: 100, surcharge_psf: 8 } };
const _v468renderRainOnSnowSurcharge = _simpleRenderer({
  citation: "Citation: Rain-on-snow surcharge (ASCE 7-22 §7.10): where Pg <= 20 psf and the slope (deg) < W/50, add a surcharge (5-8 psf, commonly 8) to the balanced flat-roof snow load Pf. Balanced case only, both triggers required. A design aid, not a substitute for the engineer of record.",
  example: rainOnSnowSurchargeExample.inputs,
  fields: [
    { key: "pf_psf", label: "Balanced flat-roof snow Pf (psf)", kind: "number", default: 15 },
    { key: "pg_psf", label: "Ground snow load Pg (psf)", kind: "number", default: 18 },
    { key: "slope_deg", label: "Roof slope (deg)", kind: "number", default: 1 },
    { key: "eave_to_ridge_ft", label: "Eave-to-ridge distance W (ft)", kind: "number", default: 100 },
    { key: "surcharge_psf", label: "Surcharge value (psf, ASCE 7-22 ~8)", kind: "number", default: 8 },
  ],
  outputs: [
    { key: "tot", id: "ros-out-tot", label: "Total with surcharge", value: (r) => fmt(r.total_psf, 1) + " psf" },
    { key: "app", id: "ros-out-app", label: "Surcharge applies?", value: (r) => r.applies ? "YES -- +" + fmt(r.added_psf, 1) + " psf" : "no (Pg > 20 or slope >= W/50)" },
    { key: "n", id: "ros-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRainOnSnowSurcharge,
});
CONSTRUCTION_RENDERERS["rain-on-snow-surcharge"] = _v468renderRainOnSnowSurcharge;

// ===================== spec-v469: sliding snow load on a lower roof (ASCE 7 7.9) =====================
// dims: in { pf_upper_psf: M L^-1 T^-2, eave_ridge_ft: L, lower_width_ft: L } out: { total_lb_ft: M T^-2, surcharge_psf: M L^-1 T^-2 }
export function computeSlidingSnowLoad({ pf_upper_psf = 0, eave_ridge_ft = 0, lower_width_ft = 15 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const pf = Number(pf_upper_psf) || 0;
  const W = Number(eave_ridge_ft) || 0;
  const lower = Number(lower_width_ft) || 0;
  if (!(pf > 0)) return { error: "Upper-roof snow load must be positive (psf)." };
  if (!(W > 0)) return { error: "Upper-roof eave-to-ridge length must be positive (ft)." };
  if (!(lower > 0)) return { error: "Lower-roof width must be positive (ft)." };
  const total_lb_ft = 0.4 * pf * W;
  const dist_width = Math.min(15, lower);
  const surcharge_psf = total_lb_ft / dist_width;
  return {
    total_lb_ft, dist_width, surcharge_psf, narrow: lower < 15,
    note: "Sliding snow load on a lower roof (ASCE 7 §7.9): snow that slides off a slippery upper roof piles on the lower roof below. The total sliding load per foot of shared eave = 0.4 x the upper roof's flat snow load Pf x its horizontal eave-to-ridge length W. That load is distributed uniformly over the lower roof out to 15 ft from the upper roof's eave (or the full lower-roof width if it is narrower than 15 ft), so a narrower catch roof concentrates the same total into a heavier surcharge. It adds to the lower roof's own balanced snow load, and applies where the upper roof is slippery and sloped enough to shed. A design aid, not a substitute for the engineer of record.",
  };
}
export const slidingSnowLoadExample = { inputs: { pf_upper_psf: 20, eave_ridge_ft: 40, lower_width_ft: 15 } };
const _v469renderSlidingSnowLoad = _simpleRenderer({
  citation: "Citation: Sliding snow load (ASCE 7 §7.9): total = 0.4 x upper Pf x upper eave-to-ridge W (lb/ft), distributed over the lesser of 15 ft or the lower-roof width. Adds to the lower roof's own snow. A design aid, not a substitute for the engineer of record.",
  example: slidingSnowLoadExample.inputs,
  fields: [
    { key: "pf_upper_psf", label: "Upper-roof flat snow load Pf (psf)", kind: "number", default: 20 },
    { key: "eave_ridge_ft", label: "Upper-roof eave-to-ridge length W (ft)", kind: "number", default: 40 },
    { key: "lower_width_ft", label: "Lower-roof width available (ft)", kind: "number", default: 15 },
  ],
  outputs: [
    { key: "tot", id: "sls-out-tot", label: "Total sliding load", value: (r) => fmt(r.total_lb_ft, 0) + " lb/ft over " + fmt(r.dist_width, 0) + " ft" },
    { key: "sur", id: "sls-out-sur", label: "Surcharge on lower roof", value: (r) => fmt(r.surcharge_psf, 1) + " psf" + (r.narrow ? " (narrow roof concentrates it)" : "") },
    { key: "n", id: "sls-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSlidingSnowLoad,
});
CONSTRUCTION_RENDERERS["sliding-snow-load"] = _v469renderSlidingSnowLoad;

// ===================== spec-v470: minimum roof snow load (ASCE 7 7.3.4) =====================
// dims: in { pg_psf: M L^-1 T^-2, importance: dimensionless, pf_computed: M L^-1 T^-2 } out: { pm_psf: M L^-1 T^-2, governing_psf: M L^-1 T^-2 }
export function computeMinimumRoofSnow({ pg_psf = 0, importance = 1.0, pf_computed = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const pg = Number(pg_psf) || 0;
  const Is = Number(importance) || 0;
  const pfc = Number(pf_computed) || 0;
  if (!(pg > 0)) return { error: "Ground snow load Pg must be positive (psf)." };
  if (!(Is > 0)) return { error: "Snow importance factor Is must be positive." };
  if (pfc < 0) return { error: "Computed flat-roof snow must be non-negative (psf)." };
  const pm_psf = pg <= 20 ? Is * pg : 20 * Is;
  const governing_psf = Math.max(pm_psf, pfc);
  return {
    pm_psf, governing_psf, min_governs: pm_psf >= pfc,
    note: "Minimum roof snow load (ASCE 7 §7.3.4): a low-slope roof (slope less than 15 degrees, and monoslope/hip/gable roofs with W <= a limit) has a minimum snow load Pm that the design cannot fall below, meant to catch a single heavy snowfall before it is reduced by the exposure, thermal, and slope factors. Pm = Is x Pg where Pg is 20 psf or less, or 20 x Is where Pg is over 20 psf (Is the snow importance factor from ASCE 7 Table 1.5-2). The design flat-roof snow load is the greater of this minimum and the computed Pf. The minimum applies only to the balanced case, not to partial-loading, drift, or sliding cases. A design aid, not a substitute for the engineer of record.",
  };
}
export const minimumRoofSnowExample = { inputs: { pg_psf: 15, importance: 1.0, pf_computed: 0 } };
const _v470renderMinimumRoofSnow = _simpleRenderer({
  citation: "Citation: Minimum roof snow load (ASCE 7 §7.3.4): Pm = Is x Pg for Pg <= 20 psf, else 20 x Is; the design flat-roof snow is the greater of Pm and the computed Pf. Low-slope, balanced case only. A design aid, not a substitute for the engineer of record.",
  example: minimumRoofSnowExample.inputs,
  fields: [
    { key: "pg_psf", label: "Ground snow load Pg (psf)", kind: "number", default: 15 },
    { key: "importance", label: "Snow importance factor Is (Table 1.5-2)", kind: "number", default: 1.0 },
    { key: "pf_computed", label: "Computed flat-roof snow Pf (psf, optional)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "pm", id: "mrs-out-pm", label: "Minimum roof snow Pm", value: (r) => fmt(r.pm_psf, 1) + " psf" },
    { key: "gov", id: "mrs-out-gov", label: "Governing flat-roof snow", value: (r) => fmt(r.governing_psf, 1) + " psf (" + (r.min_governs ? "minimum governs" : "computed Pf governs") + ")" },
    { key: "n", id: "mrs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMinimumRoofSnow,
});
CONSTRUCTION_RENDERERS["minimum-roof-snow"] = _v470renderMinimumRoofSnow;

// ===================== spec-v474: ADA ramp slope, runs, and landings (IBC 1012 / ADA) =====================
// dims: in { rise_in: L, slope_ratio: dimensionless, landing_in: L } out: { run_in: L, slope_pct: dimensionless, total_len_in: L, landings_in: L }
export function computeAdaRampSlope({ rise_in = 0, slope_ratio = 12, landing_in = 60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const rise = Number(rise_in) || 0;
  const ratio = Number(slope_ratio) || 0;
  const landing = Number(landing_in) || 0;
  if (!(rise > 0)) return { error: "Rise must be positive (in)." };
  if (!(ratio >= 12)) return { error: "Slope ratio (run:rise) must be at least 12 (a 1:12 maximum; steeper is not accessible)." };
  if (!(landing > 0)) return { error: "Landing length must be positive (in)." };
  const run_in = rise * ratio;
  const slope_pct = 100 / ratio;
  const runs = Math.ceil(rise / 30);
  const landings_in = (runs - 1) * landing;
  const total_len_in = run_in + landings_in;
  const handrails = rise > 6;
  return {
    run_in, slope_pct, runs, landings_in, total_len_in, handrails,
    note: "ADA / IBC 1012 ramp layout: an accessible ramp runs no steeper than 1:12 (8.33%), so the sloped run = rise x the slope ratio. A single run may rise at most 30 in before a level landing (at least 60 in long) is required, so the number of runs = ceil(rise / 30) and the intermediate landings add (runs - 1) x the landing length to the total. Handrails are required on both sides where the rise exceeds 6 in. Landings are also required at the top and bottom and where the ramp changes direction (not added here). A layout aid; the adopted building code and ADA/ANSI A117.1 govern the running slope, cross slope, width, edge protection, and handrail details.",
  };
}
export const adaRampSlopeExample = { inputs: { rise_in: 24, slope_ratio: 12, landing_in: 60 } };
const _v474renderAdaRampSlope = _simpleRenderer({
  citation: "Citation: ADA / IBC 1012 ramp: max 1:12 (8.33%) slope, run = rise x ratio; max 30 in rise per run then a >=60 in landing, runs = ceil(rise/30); handrails where rise > 6 in. A layout aid; the adopted code and ADA/ANSI A117.1 govern slope, width, and handrail details.",
  example: adaRampSlopeExample.inputs,
  fields: [
    { key: "rise_in", label: "Total vertical rise (in)", kind: "number", default: 24 },
    { key: "slope_ratio", label: "Slope ratio run:rise (12 = 1:12 max)", kind: "number", default: 12 },
    { key: "landing_in", label: "Landing length between runs (in)", kind: "number", default: 60 },
  ],
  outputs: [
    { key: "run", id: "ars-out-run", label: "Sloped run / slope", value: (r) => fmt(r.run_in, 0) + " in (" + fmt(r.run_in / 12, 1) + " ft) at " + fmt(r.slope_pct, 2) + "%" },
    { key: "tot", id: "ars-out-tot", label: "Runs / landings / total length", value: (r) => r.runs + " run(s), " + fmt(r.landings_in, 0) + " in landings, " + fmt(r.total_len_in / 12, 1) + " ft total" },
    { key: "hr", id: "ars-out-hr", label: "Handrails", value: (r) => r.handrails ? "required (rise > 6 in)" : "not required (rise <= 6 in)" },
    { key: "n", id: "ars-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAdaRampSlope,
});
CONSTRUCTION_RENDERERS["ada-ramp-slope"] = _v474renderAdaRampSlope;

// --- spec-v546 E: Wind force on solid freestanding wall / sign (`wind-solid-sign`) ---
// F = qh G Cf As (ASCE 7-22 29.3). Case B eccentric moment M = F x 0.2 x B.
// dims: in { velocity_pressure_psf: M L^-1 T^-2, gust_factor: dimensionless, force_coefficient: dimensionless, solid_area_ft2: L^2, width_ft: L } out: { wind_force_lb: M L T^-2, moment_caseb_lbft: M L^2 T^-2 }
export function computeWindSolidSign({ velocity_pressure_psf = 0, gust_factor = 0.85, force_coefficient = 0, solid_area_ft2 = 0, width_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const qh = Number(velocity_pressure_psf) || 0;
  const G = Number(gust_factor) || 0;
  const Cf = Number(force_coefficient) || 0;
  const As = Number(solid_area_ft2) || 0;
  const B = Number(width_ft) || 0;
  if (!(qh > 0)) return { error: "Velocity pressure must be positive (psf)." };
  if (!(G > 0 && G <= 2)) return { error: "Gust factor must be between 0 and 2 (0.85 rigid default)." };
  if (!(Cf > 0)) return { error: "Force coefficient Cf must be positive (net, ~1.2-2.0 from Fig 29.3-1)." };
  if (!(As > 0)) return { error: "Solid area must be positive (ft^2)." };
  if (!(B > 0)) return { error: "Width B must be positive (ft)." };
  const wind_force_lb = qh * G * Cf * As;
  const moment_caseb_lbft = wind_force_lb * 0.2 * B;
  return {
    wind_force_lb, moment_caseb_lbft,
    note: "Cf here is a net two-face force coefficient from ASCE 7-22 Figure 29.3-1 as a function of the aspect ratio B/s and the clearance ratio s/h (not the +/- GCp of a building wall); it rises for tall, narrow signs. Case B applies the resultant at a 0.2B eccentricity (the torsion that sizes the post and footing), and a wide sign (B/s >= 2) adds a Case C strip loading. The ASCE 7 figures and the engineer of record govern.",
  };
}
export const windSolidSignExample = { inputs: { velocity_pressure_psf: 17, gust_factor: 0.85, force_coefficient: 1.35, solid_area_ft2: 64, width_ft: 8 } };

const _v546renderWindSolidSign = _simpleRenderer({
  citation: "Citation: ASCE 7-22 Section 29.3 (solid freestanding walls and signs); F = qh G Cf As, Case B eccentric moment M = F x 0.2 x B. Cf is a net two-face coefficient from Fig 29.3-1 (a function of B/s and s/h, ~1.2-2.0), not the +/- GCp of a building wall; it rises for tall narrow signs. The Case B 0.2B eccentricity is the torsion that sizes the post and footing. The ASCE 7 figures and the engineer of record govern.",
  example: windSolidSignExample.inputs,
  fields: [
    { key: "velocity_pressure_psf", label: "Velocity pressure qh (psf)", kind: "number" },
    { key: "gust_factor", label: "Gust factor G", kind: "number", default: 0.85 },
    { key: "force_coefficient", label: "Force coefficient Cf (net, Fig 29.3-1)", kind: "number" },
    { key: "solid_area_ft2", label: "Solid area As (ft^2)", kind: "number" },
    { key: "width_ft", label: "Width B (ft)", kind: "number" },
  ],
  outputs: [
    { key: "f", id: "wss-out-f", label: "Design wind force", value: (r) => fmt(r.wind_force_lb, 0) + " lb" },
    { key: "m", id: "wss-out-m", label: "Case B eccentric moment (torsion)", value: (r) => fmt(r.moment_caseb_lbft, 0) + " lb-ft" },
    { key: "n", id: "wss-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWindSolidSign,
});
CONSTRUCTION_RENDERERS["wind-solid-sign"] = _v546renderWindSolidSign;

// --- spec-v553 E: Unbalanced snow load on gable roof (ASCE 7-22 7.6.1) ---
// Applies for ~2.38-30.2 deg and W>20 ft. Windward 0.3 ps, leeward ps + hd*gamma/sqrt(S).
// dims: in { ground_snow_pg_psf: M L^-1 T^-2, flat_roof_ps_psf: M L^-1 T^-2, roof_rise_on_12: dimensionless, eave_to_ridge_ft: L } out: { windward_psf: M L^-1 T^-2, leeward_peak_psf: M L^-1 T^-2, extent_ft: L }
export function computeSnowUnbalancedGable({ ground_snow_pg_psf = 0, flat_roof_ps_psf = 0, roof_rise_on_12 = 0, eave_to_ridge_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const pg = Number(ground_snow_pg_psf) || 0;
  const ps = Number(flat_roof_ps_psf) || 0;
  const rise = Number(roof_rise_on_12) || 0;
  const W = Number(eave_to_ridge_ft) || 0;
  if (!(pg > 0)) return { error: "Ground snow load must be positive (psf)." };
  if (!(ps > 0)) return { error: "Flat/sloped-roof snow load must be positive (psf)." };
  if (!(rise > 0)) return { error: "Roof rise-on-12 must be positive." };
  if (!(W > 0)) return { error: "Eave-to-ridge length must be positive (ft)." };
  const slope_deg = Math.atan(rise / 12) * 180 / Math.PI;
  const applicable = slope_deg >= 2.38 && slope_deg <= 30.2 && W > 20;
  const gamma = Math.min(0.13 * pg + 14, 30);
  const S = 12 / rise;
  const hd = 0.43 * Math.pow(W, 1 / 3) * Math.pow(pg + 10, 1 / 4) - 1.5;
  const windward_psf = 0.3 * ps;
  const surcharge_psf = hd * gamma / Math.sqrt(S);
  const leeward_peak_psf = ps + surcharge_psf;
  const extent_ft = 8 * hd * Math.sqrt(S) / 3;
  return {
    slope_deg, applicable, gamma, hd_ft: hd, windward_psf, surcharge_psf, leeward_peak_psf, extent_ft,
    note: applicable
      ? "The windward slope drops to 0.3 ps while the leeward carries ps plus a ridge drift surcharge - this sizes the leeward rafter and the ridge, which the balanced case misses. ASCE 7-22 Section 7.6.1; the engineer of record governs."
      : "The unbalanced case applies only in the slope band of about 2.38 to 30.2 degrees (roughly 1/2-on-12 to 7-on-12) with an eave-to-ridge length over 20 ft. Outside it, only the balanced load governs. ASCE 7-22 Section 7.6.1; the engineer of record governs.",
  };
}
export const snowUnbalancedGableExample = { inputs: { ground_snow_pg_psf: 30, flat_roof_ps_psf: 25, roof_rise_on_12: 4, eave_to_ridge_ft: 30 } };

const _v553renderSnowUnbalancedGable = _simpleRenderer({
  citation: "Citation: ASCE 7-22 Section 7.6.1 unbalanced snow load on gable roofs: snow density gamma = min(0.13 pg + 14, 30); drift height hd = 0.43 W^(1/3) (pg+10)^(1/4) - 1.5; windward slope 0.3 ps; leeward peak ps + hd gamma/sqrt(S) (S = 12/rise); surcharge extent 8 hd sqrt(S)/3. Applies only in the ~2.38-30.2 degree band with W > 20 ft. This sizes the leeward rafter and ridge the balanced case misses. ASCE 7 and the engineer of record govern.",
  example: snowUnbalancedGableExample.inputs,
  fields: [
    { key: "ground_snow_pg_psf", label: "Ground snow load pg (psf)", kind: "number" },
    { key: "flat_roof_ps_psf", label: "Balanced sloped-roof snow ps (psf)", kind: "number" },
    { key: "roof_rise_on_12", label: "Roof slope (rise on 12)", kind: "number" },
    { key: "eave_to_ridge_ft", label: "Eave-to-ridge length W (ft)", kind: "number" },
  ],
  outputs: [
    { key: "ap", id: "sug-out-ap", label: "Unbalanced case applies?", value: (r) => r.applicable ? "YES (slope " + fmt(r.slope_deg, 1) + " deg, in band)" : "NO (slope " + fmt(r.slope_deg, 1) + " deg / W - out of band; balanced governs)" },
    { key: "ww", id: "sug-out-ww", label: "Windward slope load", value: (r) => fmt(r.windward_psf, 1) + " psf" },
    { key: "lw", id: "sug-out-lw", label: "Leeward peak at ridge", value: (r) => fmt(r.leeward_peak_psf, 1) + " psf (surcharge +" + fmt(r.surcharge_psf, 1) + ")" },
    { key: "ex", id: "sug-out-ex", label: "Surcharge extent from ridge", value: (r) => fmt(r.extent_ft, 1) + " ft" },
    { key: "n", id: "sug-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSnowUnbalancedGable,
});
CONSTRUCTION_RENDERERS["snow-unbalanced-gable"] = _v553renderSnowUnbalancedGable;

// ===================== spec-v797: concrete yield, relative yield, cement content (ASTM C138) =====================
// Mass conservation: the batched materials have a fixed total mass; the fresh unit weight (density) is
// measured per ASTM C138, so the volume actually produced is total mass / density. Relative yield compares
// that to the design volume, and the actual cement content is the batched cement over the produced yards.
// dims: in { total_batch_mass_lb: M, measured_unit_weight_lb_ft3: M L^-3, design_volume_yd3: L^3, cement_mass_lb: M } out: { yield_ft3: L^3, yield_yd3: L^3, relative_yield: dimensionless, cement_content_lb_yd3: M L^-3 }
export function computeConcreteYield({ total_batch_mass_lb = 0, measured_unit_weight_lb_ft3 = 0, design_volume_yd3 = 0, cement_mass_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const mass = Number(total_batch_mass_lb) || 0;
  const uw = Number(measured_unit_weight_lb_ft3) || 0;
  const design = Number(design_volume_yd3) || 0;
  const cement = Number(cement_mass_lb) || 0;
  if (!(mass > 0)) return { error: "Total batch mass must be positive (lb)." };
  if (!(uw > 0)) return { error: "Measured unit weight must be positive (lb/ft^3)." };
  if (!(design > 0)) return { error: "Design (batched) volume must be positive (yd^3)." };
  if (cement < 0) return { error: "Cement mass cannot be negative (lb)." };
  const yield_ft3 = mass / uw;
  const yield_yd3 = yield_ft3 / 27;
  const relative_yield = yield_yd3 / design;
  const cement_content_lb_yd3 = cement > 0 ? cement / yield_yd3 : null;
  if (![yield_ft3, yield_yd3, relative_yield].every(Number.isFinite)) return { error: "Concrete-yield math is not a finite value." };
  const short = relative_yield < 1;
  return {
    yield_ft3, yield_yd3, relative_yield, cement_content_lb_yd3, short,
    note: "ASTM C138 concrete yield: the volume a batch actually makes is its total mass divided by the measured fresh unit weight (density), and the relative yield is that over the design volume. A relative yield BELOW 1.0 means the load ran short -- the concrete is denser than designed (low air, heavy or extra aggregate, too little water), so the customer got fewer cubic yards than ordered and the actual cement content per yard is HIGHER than the mix design. Above 1.0 is over-yield -- lighter or higher-air concrete diluting the cement content, which can cost strength. A relative yield within about 1% of 1.0 is a good, honest batch. The unit weight must be measured per C138 (a rodded, struck-off known-volume measure), not estimated. This checks the batch's volume and cement content, not its air content (which needs the theoretical density from the material specific gravities) or its strength. A QC check; the mix design, the C138 measurement, and the mix producer govern.",
  };
}
export const concreteYieldExample = { inputs: { total_batch_mass_lb: 3993, measured_unit_weight_lb_ft3: 148.0, design_volume_yd3: 1.0, cement_mass_lb: 564 } };
const _v797renderConcreteYield = _simpleRenderer({
  citation: "Citation: ASTM C138 / AASHTO T121 concrete yield: yield(ft^3) = total batch mass / measured unit weight; yield(yd^3) = yield/27; relative yield = yield / design volume; actual cement content = cement batched / yield(yd^3). Relative yield below 1.0 = short load (denser than designed, more cement per yard); above 1.0 = over-yield (lighter/high-air, cement diluted). Unit weight measured per C138. A QC check; the mix design and the measurement govern.",
  example: concreteYieldExample.inputs,
  fields: [
    { key: "total_batch_mass_lb", label: "Total batch mass (lb, sum of all materials)", kind: "number", default: 3993 },
    { key: "measured_unit_weight_lb_ft3", label: "Measured fresh unit weight (lb/ft^3, per C138)", kind: "number", default: 148 },
    { key: "design_volume_yd3", label: "Design (batched) volume (yd^3)", kind: "number", default: 1 },
    { key: "cement_mass_lb", label: "Cementitious in the batch (lb, 0 to skip)", kind: "number", default: 564 },
  ],
  outputs: [
    { key: "y", id: "cyld-out-y", label: "Yield produced", value: (r) => fmt(r.yield_yd3, 3) + " yd^3 (" + fmt(r.yield_ft3, 2) + " ft^3)" },
    { key: "r", id: "cyld-out-r", label: "Relative yield", value: (r) => fmt(r.relative_yield, 3) + (r.short ? " -- SHORT load (denser than designed)" : (r.relative_yield > 1.01 ? " -- over-yield (light / high air)" : " -- on target") ) },
    { key: "c", id: "cyld-out-c", label: "Actual cement content", value: (r) => r.cement_content_lb_yd3 === null ? "(enter cementitious mass)" : fmt(r.cement_content_lb_yd3, 1) + " lb/yd^3" },
    { key: "n", id: "cyld-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteYield,
});
CONSTRUCTION_RENDERERS["concrete-yield"] = _v797renderConcreteYield;

// ===================== spec-v800: water-cementitious (w/cm) ratio with exposure cap (ACI 318) =====================
// w/cm = mass of mixing water / mass of cementitious (cement + supplementary cementitious materials).
// ACI 318 Table 19.3.2.1 sets exposure-class maxima; equal caps are grouped in the selector.
const _WCM_EXPOSURE_CAPS = {
  none: { cap: null, label: "No durability w/cm cap" },
  f1: { cap: 0.55, label: "F1 freeze-thaw (0.55)" },
  w_s1: { cap: 0.50, label: "W low-permeability / S1 sulfate (0.50)" },
  f2_s2: { cap: 0.45, label: "F2 freeze-thaw / S2-S3 sulfate (0.45)" },
  f3_c2: { cap: 0.40, label: "F3 freeze-thaw / C2 corrosion (0.40)" },
};
// dims: in { water_lb: M, cement_lb: M, scm_lb: M, exposure_class: dimensionless } out: { wcm: dimensionless, cementitious_lb: M }
export function computeWaterCementRatio({ water_lb = 0, cement_lb = 0, scm_lb = 0, exposure_class = "none" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const water = Number(water_lb) || 0;
  const cement = Number(cement_lb) || 0;
  const scm = Number(scm_lb) || 0;
  const exp = _WCM_EXPOSURE_CAPS[exposure_class];
  if (!exp) return { error: "Choose a valid exposure class." };
  if (!(water > 0)) return { error: "Mixing water must be positive (lb)." };
  if (!(cement > 0)) return { error: "Cement must be positive (lb)." };
  if (scm < 0) return { error: "Supplementary cementitious materials cannot be negative (lb)." };
  const cementitious_lb = cement + scm;
  const wcm = water / cementitious_lb;
  if (!Number.isFinite(wcm)) return { error: "Water-cementitious-ratio math is not a finite value." };
  const cap = exp.cap;
  const passes = cap === null ? null : wcm <= cap + 1e-9;
  return {
    wcm, cementitious_lb, cap, passes, scm_fraction: scm / cementitious_lb,
    note: "Water-cementitious ratio (ACI 318 / ACI 211.1): w/cm = the mass of mixing water divided by the TOTAL cementitious mass -- cement plus every supplementary cementitious material (fly ash, slag cement, silica fume, natural pozzolans). It is the single strongest lever on hardened concrete: lower w/cm means higher strength and, more importantly for durability, lower permeability, so ACI 318 Table 19.3.2.1 caps the w/cm by exposure class -- 0.55 for moderate freeze-thaw (F1), down to 0.40 for severe freeze-thaw (F3) or external-chloride corrosion (C2). Count the water in the aggregate's free surface moisture and any admixture water, not just the batch water at the plant, or the real w/cm is higher than the ticket shows. This checks the ratio against the durability cap only; the strength requirement, the minimum cementitious content, and the air content are separate ACI 318 / mix-design limits. A durability screen; the project specification and the mix design govern.",
  };
}
export const waterCementRatioExample = { inputs: { water_lb: 282, cement_lb: 470, scm_lb: 94, exposure_class: "f2_s2" } };
const _v800renderWaterCementRatio = _simpleRenderer({
  citation: "Citation: water-cementitious (w/cm) ratio (ACI 318 Table 19.3.2.1 exposure caps; ACI 211.1): w/cm = mixing water / total cementitious (cement + fly ash + slag + pozzolans). Exposure maxima: F1 0.55, W/S1 0.50, F2/S2-S3 0.45, F3/C2 0.40. Count aggregate free-moisture and admixture water, not just batch water. Checks the durability cap only; strength, minimum cementitious, and air are separate. A durability screen; the spec and mix design govern.",
  example: waterCementRatioExample.inputs,
  fields: [
    { key: "water_lb", label: "Total mixing water (lb, incl. aggregate free moisture)", kind: "number", default: 282 },
    { key: "cement_lb", label: "Portland cement (lb)", kind: "number", default: 470 },
    { key: "scm_lb", label: "Supplementary cementitious -- fly ash/slag/etc (lb)", kind: "number", default: 94 },
    { key: "exposure_class", label: "Exposure class (ACI 318 cap)", kind: "select", options: [
      { value: "none", label: "No durability cap" },
      { value: "f1", label: "F1 freeze-thaw (0.55)" },
      { value: "w_s1", label: "W low-permeability / S1 sulfate (0.50)" },
      { value: "f2_s2", label: "F2 freeze-thaw / S2-S3 sulfate (0.45)" },
      { value: "f3_c2", label: "F3 freeze-thaw / C2 corrosion (0.40)" },
    ] },
  ],
  outputs: [
    { key: "w", id: "wcm-out-w", label: "Water-cementitious ratio", value: (r) => fmt(r.wcm, 3) },
    { key: "c", id: "wcm-out-c", label: "Total cementitious", value: (r) => fmt(r.cementitious_lb, 0) + " lb (" + fmt(r.scm_fraction * 100, 0) + "% SCM)" },
    { key: "p", id: "wcm-out-p", label: "Against exposure cap", value: (r) => r.cap === null ? "(no durability cap selected)" : (r.passes ? "PASSES the " + fmt(r.cap, 2) + " cap" : "EXCEEDS the " + fmt(r.cap, 2) + " cap -- reduce water or add cementitious") },
    { key: "n", id: "wcm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWaterCementRatio,
});
CONSTRUCTION_RENDERERS["water-cement-ratio"] = _v800renderWaterCementRatio;

const _LL_MEMBER_KLL = {
  interior_column: { kll: 4, label: "Interior column (KLL 4)" },
  exterior_column: { kll: 4, label: "Exterior column, no cantilever slab (KLL 4)" },
  edge_column_cant: { kll: 3, label: "Edge column w/ cantilever slab (KLL 3)" },
  corner_column_cant: { kll: 2, label: "Corner column w/ cantilever slab (KLL 2)" },
  edge_beam: { kll: 2, label: "Edge beam, no cantilever slab (KLL 2)" },
  interior_beam: { kll: 2, label: "Interior beam (KLL 2)" },
  other: { kll: 1, label: "Other members / one- & two-way slabs (KLL 1)" },
};
// dims: in { unreduced_load_psf: M L^-1 T^-2, tributary_area_ft2: L^2, member_type: dimensionless, floors_supported: dimensionless } out: { reduced_load_psf: M L^-1 T^-2, kll_at_ft2: L^2, reduction_percent: dimensionless }
export function computeAsceLiveLoadReduction({ unreduced_load_psf = 0, tributary_area_ft2 = 0, member_type = "interior_column", floors_supported = "one" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L0 = Number(unreduced_load_psf) || 0;
  const AT = Number(tributary_area_ft2) || 0;
  const m = _LL_MEMBER_KLL[member_type];
  if (!m) return { error: "Choose a valid member type (sets KLL)." };
  if (floors_supported !== "one" && floors_supported !== "two_plus") return { error: "Choose one or two-or-more floors supported." };
  if (!(L0 > 0)) return { error: "Unreduced live load must be positive (psf)." };
  if (!(AT > 0)) return { error: "Tributary area must be positive (ft^2)." };
  const KLL = m.kll;
  const kll_at_ft2 = KLL * AT;
  const floor_fraction = floors_supported === "two_plus" ? 0.40 : 0.50;
  let reduced_load_psf, multiplier, floored = false;
  const applies = kll_at_ft2 >= 400;
  if (!applies) {
    multiplier = 1;
    reduced_load_psf = L0;
  } else {
    multiplier = 0.25 + 15 / Math.sqrt(kll_at_ft2);
    reduced_load_psf = L0 * multiplier;
    const floor_psf = L0 * floor_fraction;
    if (reduced_load_psf < floor_psf) { reduced_load_psf = floor_psf; floored = true; }
  }
  if (![reduced_load_psf, kll_at_ft2, multiplier].every(Number.isFinite)) return { error: "Live-load-reduction math is not a finite value." };
  const reduction_percent = (1 - reduced_load_psf / L0) * 100;
  return {
    reduced_load_psf, kll_at_ft2, KLL, multiplier, applies, floored, floor_fraction, reduction_percent,
    high_load: L0 > 100,
    note: "ASCE 7 §4.7 live load reduction: a member with enough tributary area is unlikely to see the full design live load everywhere at once, so L = L0 (0.25 + 15/sqrt(KLL x AT)), where L0 is the unreduced (tabulated) live load, AT the tributary area, and KLL the live-load element factor from Table 4.7-1 (interior/exterior columns 4, edge/interior beams and cantilever-slab edge columns 2-3, other members 1). The reduction is permitted ONLY where KLL x AT >= 400 ft^2, and the reduced L must not fall below 0.50 L0 for a member supporting one floor or 0.40 L0 for two or more floors. Live loads over 100 psf, passenger-vehicle garages, and assembly occupancies are generally NOT reducible (with narrow multi-floor exceptions) -- verify the occupancy before applying this. A design aid; the adopted code and the engineer of record govern.",
  };
}
export const asceLiveLoadReductionExample = { inputs: { unreduced_load_psf: 50, tributary_area_ft2: 400, member_type: "interior_column", floors_supported: "one" } };
const _v803renderAsceLiveLoadReduction = _simpleRenderer({
  citation: "Citation: ASCE 7 §4.7 live load reduction: L = L0 (0.25 + 15/sqrt(KLL x AT)), permitted where KLL x AT >= 400 ft^2, floored at 0.50 L0 (one floor) or 0.40 L0 (two+ floors). KLL from Table 4.7-1. Loads over 100 psf, garages, and assembly occupancies are generally not reducible. A design aid; the adopted code and the engineer of record govern.",
  example: asceLiveLoadReductionExample.inputs,
  fields: [
    { key: "unreduced_load_psf", label: "Unreduced live load L0 (psf)", kind: "number", default: 50 },
    { key: "tributary_area_ft2", label: "Tributary area AT (ft^2)", kind: "number", default: 400 },
    { key: "member_type", label: "Member type (KLL, Table 4.7-1)", kind: "select", options: [
      { value: "interior_column", label: "Interior column (KLL 4)" },
      { value: "exterior_column", label: "Exterior column, no cantilever slab (KLL 4)" },
      { value: "edge_column_cant", label: "Edge column w/ cantilever slab (KLL 3)" },
      { value: "corner_column_cant", label: "Corner column w/ cantilever slab (KLL 2)" },
      { value: "edge_beam", label: "Edge beam, no cantilever slab (KLL 2)" },
      { value: "interior_beam", label: "Interior beam (KLL 2)" },
      { value: "other", label: "Other members / one- & two-way slabs (KLL 1)" },
    ] },
    { key: "floors_supported", label: "Floors supported", kind: "select", options: [
      { value: "one", label: "One floor (floor 0.50 L0)" },
      { value: "two_plus", label: "Two or more floors (floor 0.40 L0)" },
    ] },
  ],
  outputs: [
    { key: "l", id: "llr-out-l", label: "Reduced live load L", value: (r) => fmt(r.reduced_load_psf, 2) + " psf" + (!r.applies ? " (no reduction; KLL x AT < 400)" : r.floored ? " (at the floor)" : "") },
    { key: "k", id: "llr-out-k", label: "KLL x AT / reduction", value: (r) => fmt(r.kll_at_ft2, 0) + " ft^2 (KLL " + r.KLL + "), " + fmt(r.reduction_percent, 1) + "% reduction" },
    { key: "h", id: "llr-out-h", label: "Reducibility", value: (r) => r.high_load ? "L0 > 100 psf -- generally NOT reducible; verify the occupancy" : "verify the occupancy is not a garage or assembly space" },
    { key: "n", id: "llr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAsceLiveLoadReduction,
});
CONSTRUCTION_RENDERERS["asce-live-load-reduction"] = _v803renderAsceLiveLoadReduction;

// --- shingle-nails: Roofing Nail Count by Wind Zone ---
//
// Counts the field fasteners for an asphalt-shingle roof, where the wind zone
// drives the nailing pattern (four per shingle standard, six on steep/high-wind):
//   nails_total = squares x shingles_per_square x nails_per_shingle
//   nail_weight_lb = nails_total / nails_per_lb
// dims: in { squares: dimensionless, shingles_per_square: dimensionless, nails_per_shingle: dimensionless, nails_per_lb: dimensionless } out: { nails_total: dimensionless, nail_weight_lb: M }
export function computeShingleNails({ squares = 30, shingles_per_square = 80, nails_per_shingle = 4, nails_per_lb = 140 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(squares > 0)) return { error: "Squares must be positive." };
  if (!(shingles_per_square > 0)) return { error: "Shingles per square must be positive." };
  if (!(nails_per_shingle > 0)) return { error: "Nails per shingle must be positive." };
  if (!(nails_per_lb > 0)) return { error: "Nails per pound must be positive." };
  const nails_total = squares * shingles_per_square * nails_per_shingle;
  const nail_weight_lb = nails_total / nails_per_lb;
  if (![nails_total, nail_weight_lb].every(Number.isFinite)) return { error: "Nail-count math is not a finite value." };
  return {
    nails_total,
    nail_weight_lb,
    note: "The nails-per-shingle comes from the manufacturer and the wind zone - IRC and most manufacturers require six on steep or high-wind roofs and along the eaves and rakes, four elsewhere. The shingles-per-square depends on the product (about 80 for three-tab, 64 for many architectural shingles). This counts field fasteners, not the ridge and hip caps.",
  };
}

export const shingleNailsExample = { inputs: { squares: 30, shingles_per_square: 80, nails_per_shingle: 6, nails_per_lb: 140 } };

const _v850renderShingleNails = _simpleRenderer({
  citation: "Citation: fastener-count identity by name. nails = squares x shingles-per-square x nails-per-shingle; weight = nails / nails-per-pound. The nails-per-shingle comes from the manufacturer and the wind zone (six on steep/high-wind, four elsewhere).",
  example: shingleNailsExample.inputs,
  fields: [
    { key: "squares", label: "Roof area (squares)", kind: "number", default: 30 },
    { key: "shingles_per_square", label: "Shingles per square (~80 three-tab, ~64 architectural)", kind: "number", default: 80 },
    { key: "nails_per_shingle", label: "Nails per shingle (4 standard, 6 high-wind)", kind: "number", default: 6 },
    { key: "nails_per_lb", label: "Nails per pound", kind: "number", default: 140 },
  ],
  outputs: [
    { key: "n", id: "shn-out-n", label: "Nails to order", value: (r) => _fmtC(r.nails_total, 0) },
    { key: "w", id: "shn-out-w", label: "Nail weight", value: (r) => _fmtC(r.nail_weight_lb, 1) + " lb" },
    { key: "note", id: "shn-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeShingleNails,
});
CONSTRUCTION_RENDERERS["shingle-nails"] = _v850renderShingleNails;

// --- duct-metal-weight: Galvanized Duct Sheet-Metal Weight Takeoff ---
//
// Duct sheet-metal weight from the perimeter, run, and gauge - the number that
// sizes the coil order and the hangers:
//   perimeter_ft = 2 x (width_in + height_in) / 12
//   area_sf = perimeter_ft x length_ft
//   weight_lb = area_sf x lb_per_sf x seam_factor
// dims: in { width_in: L, height_in: L, length_ft: L, lb_per_sf: M L^-2, seam_factor: dimensionless } out: { perimeter_ft: L, area_sf: L^2, weight_lb: M }
export function computeDuctMetalWeight({ width_in = 24, height_in = 12, length_ft = 100, lb_per_sf = 1.156, seam_factor = 1.15 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(width_in > 0)) return { error: "Duct width must be positive (in)." };
  if (!(height_in > 0)) return { error: "Duct height must be positive (in)." };
  if (!(length_ft > 0)) return { error: "Run length must be positive (ft)." };
  if (!(lb_per_sf > 0)) return { error: "Sheet weight must be positive (lb/ft^2)." };
  if (!(seam_factor > 0)) return { error: "Seam factor must be positive." };
  const perimeter_ft = (2 * (width_in + height_in)) / 12;
  const area_sf = perimeter_ft * length_ft;
  const weight_lb = area_sf * lb_per_sf * seam_factor;
  if (![perimeter_ft, area_sf, weight_lb].every(Number.isFinite)) return { error: "Duct-weight math is not a finite value." };
  return {
    perimeter_ft,
    area_sf,
    weight_lb,
    note: "The per-gauge sheet weight is entered from the metal - about 0.906 lb/ft^2 for 26-gauge, 1.156 for 24-gauge, 1.656 for 20-gauge galvanized. The seam factor (about 1.15) covers seams, laps, and reinforcement per SMACNA. Fittings are taken off separately. The spec's gauge schedule drives the coil order.",
  };
}

export const ductMetalWeightExample = { inputs: { width_in: 24, height_in: 12, length_ft: 100, lb_per_sf: 1.156, seam_factor: 1.15 } };

const _v851renderDuctMetalWeight = _simpleRenderer({
  citation: "Citation: duct-weight identity by name. perimeter = 2 x (width + height); weight = perimeter x length x sheet weight x seam factor. The per-gauge sheet weight is entered from the metal; the seam factor (~1.15) covers seams and reinforcement per SMACNA.",
  example: ductMetalWeightExample.inputs,
  fields: [
    { key: "width_in", label: "Duct width (in)", kind: "number", default: 24 },
    { key: "height_in", label: "Duct height (in)", kind: "number", default: 12 },
    { key: "length_ft", label: "Run length (ft)", kind: "number", default: 100 },
    { key: "lb_per_sf", label: "Sheet weight for the gauge (lb/ft^2)", kind: "number", default: 1.156 },
    { key: "seam_factor", label: "Seam / reinforcement allowance", kind: "number", default: 1.15 },
  ],
  outputs: [
    { key: "w", id: "dmw-out-w", label: "Sheet metal to order", value: (r) => _fmtC(r.weight_lb, 0) + " lb" },
    { key: "a", id: "dmw-out-a", label: "Developed sheet area", value: (r) => _fmtC(r.area_sf, 0) + " sf (" + _fmtC(r.perimeter_ft, 1) + " ft girth)" },
    { key: "note", id: "dmw-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeDuctMetalWeight,
});
CONSTRUCTION_RENDERERS["duct-metal-weight"] = _v851renderDuctMetalWeight;

// --- duct-bank-concrete: Electrical Duct-Bank Concrete Encasement Volume ---
//
// The concrete for an electrical duct bank - the encasement around a bundle of
// conduits, the cross-section minus the conduits times the run:
//   net_area_ft2 = bank_width_ft x bank_height_ft - num_conduits x (PI/4) x (conduit_od_in/12)^2
//   volume_cy = net_area_ft2 x length_ft / 27; ordered_cy = volume_cy x (1 + waste_pct/100)
// dims: in { bank_width_ft: L, bank_height_ft: L, length_ft: L, num_conduits: dimensionless, conduit_od_in: L, waste_pct: dimensionless } out: { net_area_ft2: L^2, volume_cy: L^3, ordered_cy: L^3 }
export function computeDuctBankConcrete({ bank_width_ft = 2.0, bank_height_ft = 1.5, length_ft = 100, num_conduits = 6, conduit_od_in = 4.5, waste_pct = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(bank_width_ft > 0)) return { error: "Bank width must be positive (ft)." };
  if (!(bank_height_ft > 0)) return { error: "Bank height must be positive (ft)." };
  if (!(length_ft > 0)) return { error: "Run length must be positive (ft)." };
  if (!(conduit_od_in > 0)) return { error: "Conduit OD must be positive (in)." };
  if (num_conduits < 0) return { error: "Conduit count cannot be negative." };
  if (waste_pct < 0) return { error: "Waste cannot be negative (percent)." };
  const conduit_area_ft2 = num_conduits * (Math.PI / 4) * Math.pow(conduit_od_in / 12, 2);
  const net_area_ft2 = bank_width_ft * bank_height_ft - conduit_area_ft2;
  if (!(net_area_ft2 > 0)) return { error: "Conduit area exceeds the bank area (no net concrete)." };
  const volume_cy = (net_area_ft2 * length_ft) / 27;
  const ordered_cy = volume_cy * (1 + waste_pct / 100);
  if (![net_area_ft2, volume_cy, ordered_cy].every(Number.isFinite)) return { error: "Duct-bank math is not a finite value." };
  return {
    net_area_ft2,
    volume_cy,
    ordered_cy,
    note: "The conduit OD is the actual outside diameter (a 4-in conduit runs about 4.5 in OD). The mix (often red-dyed concrete or flowable fill) and the encasement dimensions come from the engineer and AHJ. Rebar and spacers are taken off separately. Pour in one continuous lift to avoid a cold joint.",
  };
}

export const ductBankConcreteExample = { inputs: { bank_width_ft: 2.0, bank_height_ft: 1.5, length_ft: 100, num_conduits: 6, conduit_od_in: 4.5, waste_pct: 5 } };

const _v853renderDuctBankConcrete = _simpleRenderer({
  citation: "Citation: encasement identity by name. net area = bank width x height - conduits x pi/4 x OD^2; volume = net area x length / 27. The conduit OD is the actual outside diameter; the engineer and AHJ set the encasement.",
  example: ductBankConcreteExample.inputs,
  fields: [
    { key: "bank_width_ft", label: "Duct-bank envelope width (ft)", kind: "number", default: 2.0 },
    { key: "bank_height_ft", label: "Duct-bank envelope height (ft)", kind: "number", default: 1.5 },
    { key: "length_ft", label: "Run length (ft)", kind: "number", default: 100 },
    { key: "num_conduits", label: "Number of conduits in the bank", kind: "number", default: 6 },
    { key: "conduit_od_in", label: "Conduit actual outside diameter (in)", kind: "number", default: 4.5 },
    { key: "waste_pct", label: "Waste allowance (percent)", kind: "number", default: 5 },
  ],
  outputs: [
    { key: "o", id: "dbc-out-o", label: "Concrete to order", value: (r) => _fmtC(r.ordered_cy, 2) + " cy (with waste)" },
    { key: "v", id: "dbc-out-v", label: "Neat encasement volume", value: (r) => _fmtC(r.volume_cy, 2) + " cy (" + _fmtC(r.net_area_ft2, 3) + " ft^2 net)" },
    { key: "note", id: "dbc-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeDuctBankConcrete,
});
CONSTRUCTION_RENDERERS["duct-bank-concrete"] = _v853renderDuctBankConcrete;

// --- duct-wrap-takeoff: Duct Wrap / Liner Material Takeoff ---
//
// The external duct-wrap insulation area and rolls, where the overlap and corner
// compression add to the bare surface:
//   perimeter_ft = 2 x (width_in + height_in) / 12
//   wrap_sf = perimeter_ft x length_ft x overlap_waste_factor
//   rolls = ceil(wrap_sf / roll_coverage_sf)
// dims: in { width_in: L, height_in: L, length_ft: L, overlap_waste_factor: dimensionless, roll_coverage_sf: L^2 } out: { perimeter_ft: L, wrap_sf: L^2, rolls: dimensionless }
export function computeDuctWrapTakeoff({ width_in = 20, height_in = 12, length_ft = 40, overlap_waste_factor = 1.15, roll_coverage_sf = 100 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(width_in > 0)) return { error: "Duct width must be positive (in)." };
  if (!(height_in > 0)) return { error: "Duct height must be positive (in)." };
  if (!(length_ft > 0)) return { error: "Run length must be positive (ft)." };
  if (!(overlap_waste_factor > 0)) return { error: "Overlap/waste factor must be positive." };
  if (!(roll_coverage_sf > 0)) return { error: "Roll coverage must be positive (ft^2)." };
  const perimeter_ft = (2 * (width_in + height_in)) / 12;
  const wrap_sf = perimeter_ft * length_ft * overlap_waste_factor;
  const rolls = Math.ceil(wrap_sf / roll_coverage_sf);
  if (![perimeter_ft, wrap_sf, rolls].every(Number.isFinite)) return { error: "Duct-wrap math is not a finite value." };
  return {
    perimeter_ft,
    wrap_sf,
    rolls,
    note: "The overlap/waste factor (about 1.15) covers the stapled and taped 2 in overlap and compression at the corners. The roll coverage is the product's installed coverage (less than its nominal square feet). This is external wrap - internal liner is taken off on the interior perimeter.",
  };
}

export const ductWrapTakeoffExample = { inputs: { width_in: 20, height_in: 12, length_ft: 40, overlap_waste_factor: 1.15, roll_coverage_sf: 100 } };

const _v859renderDuctWrapTakeoff = _simpleRenderer({
  citation: "Citation: wrap-takeoff identity by name. perimeter = 2 x (width + height); wrap = perimeter x length x overlap/waste factor; rolls = ceil(wrap / roll coverage). The factor (~1.15) covers the taped overlap and corner compression; the roll coverage is the installed coverage.",
  example: ductWrapTakeoffExample.inputs,
  fields: [
    { key: "width_in", label: "Duct width (in)", kind: "number", default: 20 },
    { key: "height_in", label: "Duct height (in)", kind: "number", default: 12 },
    { key: "length_ft", label: "Run length (ft)", kind: "number", default: 40 },
    { key: "overlap_waste_factor", label: "Overlap + waste multiplier", kind: "number", default: 1.15 },
    { key: "roll_coverage_sf", label: "Installed coverage per roll (ft^2)", kind: "number", default: 100 },
  ],
  outputs: [
    { key: "r", id: "dwt-out-r", label: "Wrap rolls to order", value: (r) => _fmtC(r.rolls, 0) + " rolls" },
    { key: "a", id: "dwt-out-a", label: "Wrap area", value: (r) => _fmtC(r.wrap_sf, 0) + " sf (" + _fmtC(r.perimeter_ft, 2) + " ft girth)" },
    { key: "note", id: "dwt-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeDuctWrapTakeoff,
});
CONSTRUCTION_RENDERERS["duct-wrap-takeoff"] = _v859renderDuctWrapTakeoff;

// --- duct-hanger-load: Duct Hanger Load and Count ---
//
// The weight each duct hanger carries at a chosen spacing and the number a run
// needs, completing the HVAC sheet-metal trio (metal, wrap, support):
//   load_per_hanger_lb = duct_lb_per_ft x spacing_ft
//   count = ceil(run_ft / spacing_ft) + 1
//   utilization = hanger SWL > 0 ? load / SWL : null
// dims: in { duct_lb_per_ft: M T^-2, spacing_ft: L, run_ft: L, hanger_swl_lb: M L T^-2 } out: { load_per_hanger_lb: M L T^-2, count: dimensionless }
export function computeDuctHangerLoad({ duct_lb_per_ft = 5.5, spacing_ft = 8, run_ft = 40, hanger_swl_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(duct_lb_per_ft > 0)) return { error: "Duct weight per foot must be positive (lb/ft)." };
  if (!(spacing_ft > 0)) return { error: "Hanger spacing must be positive (ft)." };
  if (!(run_ft > 0)) return { error: "Run length must be positive (ft)." };
  if (hanger_swl_lb < 0) return { error: "Hanger SWL cannot be negative (lb)." };
  const load_per_hanger_lb = duct_lb_per_ft * spacing_ft;
  const count = Math.ceil(run_ft / spacing_ft) + 1;
  if (![load_per_hanger_lb, count].every(Number.isFinite)) return { error: "Hanger math is not a finite value." };
  const utilization = hanger_swl_lb > 0 ? load_per_hanger_lb / hanger_swl_lb : null;
  return {
    load_per_hanger_lb,
    count,
    utilization,
    note: "The maximum spacing follows SMACNA (about 8-10 ft for rectangular duct). The per-foot weight comes from duct-metal-weight, plus wrap and any water in a coil. The hanger, rod, or strap safe working load is the manufacturer's. Large duct goes on a trapeze; wider spacing means fewer hangers but more load on each.",
  };
}

export const ductHangerLoadExample = { inputs: { duct_lb_per_ft: 5.5, spacing_ft: 8, run_ft: 40, hanger_swl_lb: 0 } };

const _v860renderDuctHangerLoad = _simpleRenderer({
  citation: "Citation: duct-hanger identity by name. load per hanger = per-foot weight x spacing; count = ceil(run / spacing) + 1. The max spacing follows SMACNA (~8-10 ft rectangular); the per-foot weight comes from duct-metal-weight; the hanger SWL is the manufacturer's.",
  example: ductHangerLoadExample.inputs,
  fields: [
    { key: "duct_lb_per_ft", label: "Duct weight per foot (lb/ft)", kind: "number", default: 5.5 },
    { key: "spacing_ft", label: "Hanger spacing (ft)", kind: "number", default: 8 },
    { key: "run_ft", label: "Run length (ft)", kind: "number", default: 40 },
    { key: "hanger_swl_lb", label: "Hanger safe working load (lb, 0 = skip)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "l", id: "dhl-out-l", label: "Load per hanger", value: (r) => _fmtC(r.load_per_hanger_lb, 0) + " lb" + (r.utilization === null ? "" : " (" + _fmtC(r.utilization * 100, 0) + "% of SWL)") },
    { key: "c", id: "dhl-out-c", label: "Hangers for the run", value: (r) => _fmtC(r.count, 0) },
    { key: "note", id: "dhl-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeDuctHangerLoad,
});
CONSTRUCTION_RENDERERS["duct-hanger-load"] = _v860renderDuctHangerLoad;

// --- roof-underlayment-rolls: Roof Underlayment Roll Count ---
//
// The field underlayment rolls over the whole deck (distinct from the eave/valley
// ice-and-water membrane):
//   rolls = ceil(roof_area_sf x (1 + lap_waste_pct/100) / roll_coverage_sf)
// dims: in { roof_area_sf: L^2, roll_coverage_sf: L^2, lap_waste_pct: dimensionless } out: { rolls: dimensionless }
export function computeRoofUnderlaymentRolls({ roof_area_sf = 2500, roll_coverage_sf = 1000, lap_waste_pct = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(roof_area_sf > 0)) return { error: "Roof area must be positive (ft^2)." };
  if (!(roll_coverage_sf > 0)) return { error: "Roll coverage must be positive (ft^2)." };
  if (lap_waste_pct < 0) return { error: "Lap/waste cannot be negative (percent)." };
  const rolls = Math.ceil((roof_area_sf * (1 + lap_waste_pct / 100)) / roll_coverage_sf);
  if (!Number.isFinite(rolls)) return { error: "Underlayment-roll math is not a finite value." };
  return {
    rolls,
    note: "Full-deck field underlayment: synthetic runs about 10 squares a roll (1,000 sf), 15-lb felt about 4 squares (400 sf). The lap and waste allowance covers the head and side laps plus offcuts. This is distinct from the eave/valley ice-barrier-coverage; the code and manufacturer set the underlayment and lap requirements.",
  };
}

export const roofUnderlaymentRollsExample = { inputs: { roof_area_sf: 2500, roll_coverage_sf: 1000, lap_waste_pct: 10 } };

const _v862renderRoofUnderlaymentRolls = _simpleRenderer({
  citation: "Citation: roll-count identity by name. rolls = ceil(roof area x (1 + lap + waste) / roll coverage). Full-deck field underlayment (synthetic ~10 squares/roll, 15-lb felt ~4); distinct from the eave/valley ice-barrier-coverage.",
  example: roofUnderlaymentRollsExample.inputs,
  fields: [
    { key: "roof_area_sf", label: "Roof deck area (ft^2)", kind: "number", default: 2500 },
    { key: "roll_coverage_sf", label: "Coverage per roll (ft^2, ~1000 synthetic, ~400 felt)", kind: "number", default: 1000 },
    { key: "lap_waste_pct", label: "Lap + waste allowance (percent)", kind: "number", default: 10 },
  ],
  outputs: [
    { key: "r", id: "rur-out-r", label: "Underlayment rolls to order", value: (r) => _fmtC(r.rolls, 0) + " rolls" },
    { key: "note", id: "rur-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeRoofUnderlaymentRolls,
});
CONSTRUCTION_RENDERERS["roof-underlayment-rolls"] = _v862renderRoofUnderlaymentRolls;

// --- membrane-roof-takeoff: Single-Ply Membrane Roof Rolls and Seam Length ---
//
// Takes off a single-ply membrane (TPO/EPDM/PVC) - the rolls, where the side lap
// eats the usable width, and the seam length that sizes the welding:
//   usable_w_ft = roll_width_ft - sidelap_in/12
//   rolls = ceil(roof_area_sf x (1 + waste_pct/100) / (usable_w_ft x roll_length_ft))
//   seam_lf = roof_area_sf / usable_w_ft
// dims: in { roof_area_sf: L^2, roll_width_ft: L, roll_length_ft: L, sidelap_in: L, waste_pct: dimensionless } out: { usable_w_ft: L, rolls: dimensionless, seam_lf: L }
export function computeMembraneRoofTakeoff({ roof_area_sf = 8000, roll_width_ft = 10, roll_length_ft = 100, sidelap_in = 6, waste_pct = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(roof_area_sf > 0)) return { error: "Roof area must be positive (ft^2)." };
  if (!(roll_width_ft > 0)) return { error: "Roll width must be positive (ft)." };
  if (!(roll_length_ft > 0)) return { error: "Roll length must be positive (ft)." };
  if (waste_pct < 0) return { error: "Waste cannot be negative (percent)." };
  const usable_w_ft = roll_width_ft - sidelap_in / 12;
  if (!(usable_w_ft > 0)) return { error: "Side lap exceeds the roll width (no usable width)." };
  const rolls = Math.ceil((roof_area_sf * (1 + waste_pct / 100)) / (usable_w_ft * roll_length_ft));
  const seam_lf = roof_area_sf / usable_w_ft;
  if (![usable_w_ft, rolls, seam_lf].every(Number.isFinite)) return { error: "Membrane-takeoff math is not a finite value." };
  return {
    usable_w_ft,
    rolls,
    seam_lf,
    note: "The usable width nets out the side lap. The seam length sizes the hot-air welding or adhesive and the labor. Fasteners, plates, and cover tape are taken off separately. The membrane and lap are set by the manufacturer and the wind-uplift design; a wider sheet cuts both the rolls and the welding.",
  };
}

export const membraneRoofTakeoffExample = { inputs: { roof_area_sf: 8000, roll_width_ft: 10, roll_length_ft: 100, sidelap_in: 6, waste_pct: 5 } };

const _v863renderMembraneRoofTakeoff = _simpleRenderer({
  citation: "Citation: membrane-takeoff identity by name. usable width = roll width - side lap; rolls = ceil(area x (1 + waste) / (usable width x roll length)); seam = area / usable width. The usable width nets out the side lap; the seam sizes the welding.",
  example: membraneRoofTakeoffExample.inputs,
  fields: [
    { key: "roof_area_sf", label: "Roof area (ft^2)", kind: "number", default: 8000 },
    { key: "roll_width_ft", label: "Membrane roll width (ft)", kind: "number", default: 10 },
    { key: "roll_length_ft", label: "Membrane roll length (ft)", kind: "number", default: 100 },
    { key: "sidelap_in", label: "Side lap (in)", kind: "number", default: 6 },
    { key: "waste_pct", label: "Waste allowance (percent)", kind: "number", default: 5 },
  ],
  outputs: [
    { key: "r", id: "mrt-out-r", label: "Membrane rolls", value: (r) => _fmtC(r.rolls, 0) + " rolls" },
    { key: "s", id: "mrt-out-s", label: "Seam length to weld", value: (r) => _fmtC(r.seam_lf, 0) + " LF (" + _fmtC(r.usable_w_ft, 1) + " ft usable width)" },
    { key: "note", id: "mrt-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeMembraneRoofTakeoff,
});
CONSTRUCTION_RENDERERS["membrane-roof-takeoff"] = _v863renderMembraneRoofTakeoff;

// --- tapered-roof-insulation: Tapered Roof Insulation Average Thickness and Quantity ---
//
// The average thickness across a slope-to-drain layout, the board-feet to order,
// and the average R the taper delivers (distinct from a steady flat R):
//   avg_thk_in = start_thk_in + slope_in_per_ft x run_ft / 2
//   board_feet = area_sf x avg_thk_in; avg_r = avg_thk_in x r_per_in
// dims: in { run_ft: L, slope_in_per_ft: dimensionless, start_thk_in: L, area_sf: L^2, r_per_in: dimensionless } out: { avg_thk_in: L, board_feet: L^3, avg_r: dimensionless }
export function computeTaperedRoofInsulation({ run_ft = 40, slope_in_per_ft = 0.25, start_thk_in = 0.5, area_sf = 2000, r_per_in = 5.7 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(run_ft > 0)) return { error: "Taper run must be positive (ft)." };
  if (!(area_sf > 0)) return { error: "Field area must be positive (ft^2)." };
  if (!(r_per_in > 0)) return { error: "R per inch must be positive." };
  if (slope_in_per_ft < 0) return { error: "Slope cannot be negative (in/ft)." };
  if (start_thk_in < 0) return { error: "Start thickness cannot be negative (in)." };
  const avg_thk_in = start_thk_in + (slope_in_per_ft * run_ft) / 2;
  const board_feet = area_sf * avg_thk_in;
  const avg_r = avg_thk_in * r_per_in;
  if (![avg_thk_in, board_feet, avg_r].every(Number.isFinite)) return { error: "Tapered-insulation math is not a finite value." };
  return {
    avg_thk_in,
    board_feet,
    avg_r,
    note: "The taper layout (slope and start thickness) comes from the manufacturer's design to hit both the code drainage slope (a low-slope roof needs at least 1/4 in per foot) and the design R. Tapered polyiso is ordered by the board-foot (a square foot one inch thick). Distinct from the steady flat assembly-r-value; the slope has to serve both drainage and the code R.",
  };
}

export const taperedRoofInsulationExample = { inputs: { run_ft: 40, slope_in_per_ft: 0.25, start_thk_in: 0.5, area_sf: 2000, r_per_in: 5.7 } };

const _v864renderTaperedRoofInsulation = _simpleRenderer({
  citation: "Citation: tapered-insulation identity by name. average thickness = start + slope x run / 2; board-feet = area x average thickness; average R = average thickness x R-per-inch. The taper layout serves both the code drainage slope and the design R.",
  example: taperedRoofInsulationExample.inputs,
  fields: [
    { key: "run_ft", label: "Taper run length to drain (ft)", kind: "number", default: 40 },
    { key: "slope_in_per_ft", label: "Taper slope (in/ft)", kind: "number", default: 0.25 },
    { key: "start_thk_in", label: "Thickness at the low (start) edge (in)", kind: "number", default: 0.5 },
    { key: "area_sf", label: "Field area (ft^2)", kind: "number", default: 2000 },
    { key: "r_per_in", label: "Insulation R per inch", kind: "number", default: 5.7 },
  ],
  outputs: [
    { key: "b", id: "tri-out-b", label: "Board-feet to order", value: (r) => _fmtC(r.board_feet, 0) + " bf (" + _fmtC(r.avg_thk_in, 2) + " in average)" },
    { key: "r", id: "tri-out-r", label: "Average R the taper delivers", value: (r) => "R-" + _fmtC(r.avg_r, 1) },
    { key: "note", id: "tri-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeTaperedRoofInsulation,
});
CONSTRUCTION_RENDERERS["tapered-roof-insulation"] = _v864renderTaperedRoofInsulation;

// --- sheathing-takeoff: Wall / Roof Sheathing Panel and Nail Takeoff ---
//
// Takes off the sheathing panels and nails for a wall or roof:
//   sheets = ceil(area_sf x (1 + waste_pct/100) / sheet_sf)
//   nails = sheets x nails_per_sheet
// dims: in { area_sf: L^2, waste_pct: dimensionless, sheet_sf: L^2, nails_per_sheet: dimensionless } out: { sheets: dimensionless, nails: dimensionless }
export function computeSheathingTakeoff({ area_sf = 1600, waste_pct = 8, sheet_sf = 32, nails_per_sheet = 60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(area_sf > 0)) return { error: "Area must be positive (ft^2)." };
  if (!(sheet_sf > 0)) return { error: "Panel area must be positive (ft^2)." };
  if (!(nails_per_sheet > 0)) return { error: "Nails per sheet must be positive." };
  if (waste_pct < 0) return { error: "Waste cannot be negative (percent)." };
  const sheets = Math.ceil((area_sf * (1 + waste_pct / 100)) / sheet_sf);
  const nails = sheets * nails_per_sheet;
  if (![sheets, nails].every(Number.isFinite)) return { error: "Sheathing-takeoff math is not a finite value." };
  return {
    sheets,
    nails,
    note: "The nails-per-sheet comes from the nailing schedule the carpenter reads off the plans - a 6-in edge / 12-in field pattern is about 60 nails on a 4x8, a 4-in / 6-in shear panel far more. Distinct from the plywood-span rating and the residential-framing lumber rollup; the nailing schedule, not the area, drives the fastener order.",
  };
}

export const sheathingTakeoffExample = { inputs: { area_sf: 1600, waste_pct: 8, sheet_sf: 32, nails_per_sheet: 60 } };

const _v865renderSheathingTakeoff = _simpleRenderer({
  citation: "Citation: sheathing-takeoff identity by name. sheets = ceil(area x (1 + waste) / sheet area); nails = sheets x nails-per-sheet. The nails-per-sheet comes from the nailing schedule on the plans (~60 for a 6/12 pattern, far more for a shear panel).",
  example: sheathingTakeoffExample.inputs,
  fields: [
    { key: "area_sf", label: "Area to sheathe (ft^2)", kind: "number", default: 1600 },
    { key: "waste_pct", label: "Waste allowance (percent)", kind: "number", default: 8 },
    { key: "sheet_sf", label: "Panel area (ft^2, 32 for a 4x8)", kind: "number", default: 32 },
    { key: "nails_per_sheet", label: "Nails per panel from the schedule", kind: "number", default: 60 },
  ],
  outputs: [
    { key: "s", id: "sht-out-s", label: "Sheathing panels", value: (r) => _fmtC(r.sheets, 0) + " sheets" },
    { key: "n", id: "sht-out-n", label: "Nails to order", value: (r) => _fmtC(r.nails, 0) },
    { key: "note", id: "sht-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeSheathingTakeoff,
});
CONSTRUCTION_RENDERERS["sheathing-takeoff"] = _v865renderSheathingTakeoff;
