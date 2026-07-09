// Group E (cont.): shallow-foundation and earth-retaining geotechnics bench.
// spec-v260..v262 establish this new lazy-loaded renderer module -- where the
// load path the steel (calc-steel.js, v254..v256) and reinforced-concrete
// (calc-concrete.js, v257..v259) member benches trace finally meets the
// ground. The catalog divided a service load by an allowable pressure keyed
// to a soil class (footing-area) and counted a segmental wall's blocks
// (retaining-wall-block), but nothing computed the allowable pressure from
// the soil's own strength, the lateral push of retained soil, or the
// tip/slide/bearing stability of the cantilever wall that resists it.
// Every tile keeps group: "E" (a tile's group letter is independent of the
// module that holds it -- the spec-v70..v98 split precedent). Tiles:
//   v260 soil-bearing-capacity     (general bearing-capacity eq., Vesic factors)
//   v261 lateral-earth-pressure    (Rankine Ka / Kp, thrust and line of action)
//   v262 retaining-wall-stability  (overturning / sliding / toe bearing)
// All GOVERNANCE.general design aids; c, phi, gamma come from the
// geotechnical report for the actual site. See spec-v260.md..v262.md.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input (copied verbatim
// from the sibling calc-* modules; non-exported, so it adds no corpus row).
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

// Compact renderer factory (same shape as the calc-steel / calc-concrete
// _simpleRenderer factories) supporting number and select inputs.
function _simpleRenderer(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id, f.options);
      else field = makeNumber(f.label, f.id, f.attrs || { step: "any", min: "0" });
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
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener(f.kind === "select" ? "change" : "input", update);
    }
  };
}

export const GEOTECH_RENDERERS = {};

// ===================== spec-v260: shallow foundation bearing capacity =====================

// dims: in { c: M L^-1 T^-2, phi: dimensionless, gamma: M L^-2 T^-2, b_ft: L, df_ft: L, fs: dimensionless } out: { nc: dimensionless, nq: dimensionless, ngamma: dimensionless, q_surch: M L^-1 T^-2, qu: M L^-1 T^-2, q_all: M L^-1 T^-2 }
export function computeSoilBearingCapacity({ c = 0, phi = 0, gamma = 120, b_ft = 0, df_ft = 0, shape = "strip", fs = 3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(gamma > 0)) return { error: "Soil unit weight must be positive (pcf)." };
  if (!(b_ft > 0)) return { error: "Footing width must be positive (ft)." };
  if (!(fs > 0)) return { error: "Factor of safety must be positive." };
  if (c < 0) return { error: "Cohesion cannot be negative (psf)." };
  if (df_ft < 0) return { error: "Embedment depth cannot be negative (ft)." };
  if (phi < 0 || phi >= 50) return { error: "Friction angle must be between 0 and 50 degrees." };
  const phi_r = phi * Math.PI / 180;
  const nq = Math.exp(Math.PI * Math.tan(phi_r)) * Math.tan(Math.PI / 4 + phi_r / 2) ** 2;
  const nc = phi < 0.01 ? 2 + Math.PI : (nq - 1) / Math.tan(phi_r);
  const ngamma = 2 * (nq + 1) * Math.tan(phi_r);
  const bl = shape === "strip" ? 0 : 1;
  const sc = 1 + bl * (nq / nc);
  const sq = 1 + bl * Math.tan(phi_r);
  const sgamma = 1 - 0.4 * bl;
  const q_surch = gamma * df_ft;
  const qu = c * nc * sc + q_surch * nq * sq + 0.5 * gamma * b_ft * ngamma * sgamma;
  const q_all = qu / fs;
  return { nc, nq, ngamma, sc, sq, sgamma, q_surch, qu, q_all };
}

export const soilBearingCapacityExample = { inputs: { c: 0, phi: 32, gamma: 120, b_ft: 6, df_ft: 4, shape: "strip", fs: 3 } };

GEOTECH_RENDERERS["soil-bearing-capacity"] = _simpleRenderer({
  citation: "Citation: the general bearing-capacity equation qu = c Nc sc + q Nq sq + 0.5 gamma B Ngamma sgamma with the Vesic (1973) factors Nq = e^(pi tan phi) x tan^2(45 + phi/2), Nc = (Nq - 1) x cot phi (5.14 at phi = 0), Ngamma = 2 x (Nq + 1) x tan phi, and the De Beer / Vesic shape factors, as compiled in Das, Principles of Foundation Engineering, and FHWA-NHI-16-009 (GEC 6, Shallow Foundations). Returns the gross ultimate and allowable pressure for general-shear failure of a level, concentrically loaded footing with level ground and the water table at or below one footing width beneath the base -- the net-bearing, groundwater, load-inclination, eccentricity, local/punching-shear, and settlement corrections are not applied, and settlement (not strength) usually governs a footing on sand. Take c, phi, and gamma from the geotechnical report for the actual site. A design aid, not a substitute for a geotechnical engineer's report -- the geotechnical engineer of record's stamped recommendation governs.",
  example: soilBearingCapacityExample.inputs,
  fields: [
    { key: "c", label: "Soil cohesion c (psf, 0 for clean sand)", kind: "number", default: 0 },
    { key: "phi", label: "Friction angle phi (deg, 0 for undrained clay)", kind: "number" },
    { key: "gamma", label: "Soil unit weight (pcf)", kind: "number", default: 120 },
    { key: "b_ft", label: "Footing width B (ft)", kind: "number" },
    { key: "df_ft", label: "Embedment depth Df (ft)", kind: "number", default: 0 },
    { key: "shape", label: "Footing shape", kind: "select", options: [{ value: "strip", label: "Strip (continuous)" }, { value: "square", label: "Square" }, { value: "circular", label: "Circular" }], default: "strip" },
    { key: "fs", label: "Factor of safety", kind: "number", default: 3 },
  ],
  outputs: [
    { key: "nf", id: "sbc-out-nf", label: "Bearing factors Nc / Nq / Ngamma", value: (r) => fmt(r.nc, 2) + " / " + fmt(r.nq, 2) + " / " + fmt(r.ngamma, 2) },
    { key: "qs", id: "sbc-out-qs", label: "Surcharge at footing level", value: (r) => fmt(r.q_surch, 0) + " psf" },
    { key: "qu", id: "sbc-out-qu", label: "Ultimate gross bearing qu", value: (r) => fmt(r.qu, 0) + " psf (" + fmt(r.qu / 1000, 2) + " ksf)" },
    { key: "qa", id: "sbc-out-qa", label: "Allowable gross bearing", value: (r) => fmt(r.q_all, 0) + " psf (" + fmt(r.q_all / 1000, 2) + " ksf)" },
  ],
  compute: computeSoilBearingCapacity,
});

// ===================== spec-v261: Rankine lateral earth pressure and thrust =====================

// dims: in { phi: dimensionless, gamma: M L^-2 T^-2, h_ft: L, q: M L^-1 T^-2 } out: { ka: dimensionless, kp: dimensionless, pa_base: M L^-1 T^-2, pa_soil: M T^-2, pa_surch: M T^-2, pa_tot: M T^-2, y_bar: L, pp: M T^-2 }
export function computeLateralEarthPressure({ phi = 0, gamma = 120, h_ft = 0, q = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(gamma > 0)) return { error: "Soil unit weight must be positive (pcf)." };
  if (!(h_ft > 0)) return { error: "Retained height must be positive (ft)." };
  if (q < 0) return { error: "Surcharge cannot be negative (psf)." };
  if (phi <= 0 || phi >= 50) return { error: "Friction angle must be between 0 and 50 degrees (exclusive)." };
  const phi_r = phi * Math.PI / 180;
  const ka = (1 - Math.sin(phi_r)) / (1 + Math.sin(phi_r));
  const kp = 1 / ka;
  const pa_base = ka * gamma * h_ft;
  const pa_soil = 0.5 * ka * gamma * h_ft * h_ft;
  const pa_surch = ka * q * h_ft;
  const pa_tot = pa_soil + pa_surch;
  const y_bar = (pa_soil * (h_ft / 3) + pa_surch * (h_ft / 2)) / pa_tot;
  const pp = 0.5 * kp * gamma * h_ft * h_ft;
  return { ka, kp, pa_base, pa_soil, pa_surch, pa_tot, y_bar, pp };
}

export const lateralEarthPressureExample = { inputs: { phi: 30, gamma: 120, h_ft: 10, q: 0 } };

GEOTECH_RENDERERS["lateral-earth-pressure"] = _simpleRenderer({
  citation: "Citation: Rankine (1857) lateral earth pressure -- Ka = tan^2(45 - phi/2) = (1 - sin phi) / (1 + sin phi), Kp = 1/Ka = tan^2(45 + phi/2), resultant active thrust Pa = 0.5 x Ka x gamma x H^2 acting at H/3 above the base, plus a uniform-surcharge thrust Ka x q x H at H/2 -- as compiled in Das, Principles of Foundation Engineering, and NAVFAC DM-7.02 (Foundations and Earth Structures). The Rankine case only: a cohesionless soil (the 2c sqrt(Ka) tension-crack reduction of a cohesive backfill is not applied), a vertical wall face with no wall friction (Coulomb theory is required for an inclined or rough face and gives a lower active thrust), a dry level backfill with no water table (a submerged zone must be run with buoyant unit weight plus separate hydrostatic pressure), and the fully-mobilized active and passive limit states (the wall must move enough to reach them). Take phi and gamma from the geotechnical report. A design aid, not a substitute for a geotechnical engineer's report -- the geotechnical engineer of record's recommendation governs.",
  example: lateralEarthPressureExample.inputs,
  fields: [
    { key: "phi", label: "Friction angle phi (deg)", kind: "number" },
    { key: "gamma", label: "Soil unit weight (pcf)", kind: "number", default: 120 },
    { key: "h_ft", label: "Retained height H (ft)", kind: "number" },
    { key: "q", label: "Uniform surcharge q (psf)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "k", id: "lep-out-k", label: "Coefficients Ka / Kp", value: (r) => fmt(r.ka, 3) + " / " + fmt(r.kp, 2) },
    { key: "pb", id: "lep-out-pb", label: "Active pressure at base", value: (r) => fmt(r.pa_base, 0) + " psf" },
    { key: "pa", id: "lep-out-pa", label: "Active thrust Pa (soil + surcharge)", value: (r) => fmt(r.pa_tot, 0) + " lb/ft (" + fmt(r.pa_soil, 0) + " + " + fmt(r.pa_surch, 0) + ")" },
    { key: "yb", id: "lep-out-yb", label: "Resultant height above base", value: (r) => fmt(r.y_bar, 2) + " ft" },
    { key: "pp", id: "lep-out-pp", label: "Passive thrust Pp", value: (r) => fmt(r.pp, 0) + " lb/ft" },
  ],
  compute: computeLateralEarthPressure,
});

// ===================== spec-v262: cantilever retaining wall stability =====================

// dims: in { h_ft: L, b_ft: L, t_base: L, t_stem: L, toe_ft: L, gamma_s: M L^-2 T^-2, gamma_c: M L^-2 T^-2, phi: dimensionless, mu: dimensionless, q: M L^-1 T^-2 } out: { sum_v: M T^-2, mr: M L T^-2, mo: M L T^-2, pa_tot: M T^-2, fs_ot: dimensionless, fs_sl: dimensionless, ecc: L, q_max: M L^-1 T^-2, q_min: M L^-1 T^-2 }
export function computeRetainingWallStability({ h_ft = 0, b_ft = 0, t_base = 0, t_stem = 0, toe_ft = 0, gamma_s = 110, gamma_c = 150, phi = 0, mu = 0.5, q = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(h_ft > 0)) return { error: "Wall height must be positive (ft)." };
  if (!(b_ft > 0)) return { error: "Base width must be positive (ft)." };
  if (!(t_base > 0)) return { error: "Base thickness must be positive (ft)." };
  if (!(t_stem > 0)) return { error: "Stem thickness must be positive (ft)." };
  if (toe_ft < 0) return { error: "Toe length cannot be negative (ft)." };
  if (!(gamma_s > 0)) return { error: "Soil unit weight must be positive (pcf)." };
  if (!(gamma_c > 0)) return { error: "Concrete unit weight must be positive (pcf)." };
  if (!(mu > 0)) return { error: "Base friction coefficient must be positive." };
  if (q < 0) return { error: "Surcharge cannot be negative (psf)." };
  if (phi <= 0 || phi >= 50) return { error: "Friction angle must be between 0 and 50 degrees (exclusive)." };
  if (!(h_ft > t_base)) return { error: "Wall height must exceed the base thickness (ft)." };
  const heel = b_ft - toe_ft - t_stem;
  if (!(heel > 0)) return { error: "Toe plus stem thickness must be less than the base width (no heel)." };
  const h_stem = h_ft - t_base;
  const phi_r = phi * Math.PI / 180;
  const ka = (1 - Math.sin(phi_r)) / (1 + Math.sin(phi_r));
  const w_stem = gamma_c * t_stem * h_stem, a_stem = toe_ft + t_stem / 2;
  const w_base = gamma_c * b_ft * t_base, a_base = b_ft / 2;
  const w_soil = gamma_s * heel * h_stem, a_soil = toe_ft + t_stem + heel / 2;
  const w_surch = q * heel, a_surch = a_soil;
  const sum_v = w_stem + w_base + w_soil + w_surch;
  const mr = w_stem * a_stem + w_base * a_base + w_soil * a_soil + w_surch * a_surch;
  const pa_soil = 0.5 * ka * gamma_s * h_ft * h_ft;
  const pa_surch = ka * q * h_ft;
  const pa_tot = pa_soil + pa_surch;
  const mo = pa_soil * (h_ft / 3) + pa_surch * (h_ft / 2);
  const fs_ot = mr / mo;
  const fs_sl = mu * sum_v / pa_tot;
  const x_bar = (mr - mo) / sum_v;
  const ecc = b_ft / 2 - x_bar;
  const q_max = (sum_v / b_ft) * (1 + 6 * ecc / b_ft);
  const q_min = (sum_v / b_ft) * (1 - 6 * ecc / b_ft);
  const middle_third = Math.abs(ecc) <= b_ft / 6;
  return { ka, sum_v, mr, mo, pa_tot, fs_ot, fs_sl, ecc, q_max, q_min, middle_third };
}

export const retainingWallStabilityExample = { inputs: { h_ft: 10, b_ft: 6, t_base: 1, t_stem: 1, toe_ft: 1, gamma_s: 110, gamma_c: 150, phi: 30, mu: 0.5, q: 0 } };

GEOTECH_RENDERERS["retaining-wall-stability"] = _simpleRenderer({
  citation: "Citation: the standard cantilever-retaining-wall global-stability checks -- overturning FS = Mr / Mo, sliding FS = mu x sum(V) / Pa, and toe bearing q = (sum(V)/B) x (1 +/- 6e/B) with Rankine active pressure -- as compiled in Das, Principles of Foundation Engineering, and NAVFAC DM-7.02, against the IBC 1807.2.3 minimum factor of safety of 1.5 for both sliding and overturning (standard practice designs overturning to 2.0). A global-stability check of a level, cohesionless, dry backfill on a level base with the stem, base, and heel soil idealized as rectangles: it does not check the internal reinforced-concrete design of the stem or base (see the RC beam tiles), does not credit passive resistance at the toe (conservatively neglected), does not apply seismic (Mononobe-Okabe) pressure or a sloped or submerged backfill, and reports gross toe pressure the user must compare against the allowable from the soil bearing capacity tile. Take the geometry from the drawings and the soil parameters from the geotechnical report. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: retainingWallStabilityExample.inputs,
  fields: [
    { key: "h_ft", label: "Total wall height H (ft)", kind: "number" },
    { key: "b_ft", label: "Base width B, toe to heel (ft)", kind: "number" },
    { key: "t_base", label: "Base slab thickness (ft)", kind: "number" },
    { key: "t_stem", label: "Stem thickness (ft)", kind: "number" },
    { key: "toe_ft", label: "Toe length (ft)", kind: "number" },
    { key: "gamma_s", label: "Soil unit weight (pcf)", kind: "number", default: 110 },
    { key: "gamma_c", label: "Concrete unit weight (pcf)", kind: "number", default: 150 },
    { key: "phi", label: "Backfill friction angle phi (deg)", kind: "number" },
    { key: "mu", label: "Base friction coefficient mu", kind: "number", default: 0.5 },
    { key: "q", label: "Backfill surcharge q (psf)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "sv", id: "rws-out-sv", label: "Vertical resultant / resisting moment", value: (r) => fmt(r.sum_v, 0) + " lb/ft, Mr " + fmt(r.mr, 0) + " ft-lb/ft" },
    { key: "mo", id: "rws-out-mo", label: "Active thrust / overturning moment", value: (r) => fmt(r.pa_tot, 0) + " lb/ft, Mo " + fmt(r.mo, 0) + " ft-lb/ft" },
    { key: "ot", id: "rws-out-ot", label: "Overturning FS (target 2.0)", value: (r) => fmt(r.fs_ot, 2) + (r.fs_ot >= 2.0 ? " (pass)" : r.fs_ot >= 1.5 ? " (below 2.0 target; IBC min 1.5)" : " (FAIL, below IBC 1.5)") },
    { key: "sl", id: "rws-out-sl", label: "Sliding FS (min 1.5)", value: (r) => fmt(r.fs_sl, 2) + (r.fs_sl >= 1.5 ? " (pass)" : " (FAIL, below IBC 1.5)") },
    { key: "ec", id: "rws-out-ec", label: "Eccentricity e (middle third = B/6)", value: (r) => fmt(r.ecc, 2) + " ft" + (r.middle_third ? " (in middle third)" : " (OUTSIDE middle third, heel uplift)") },
    { key: "qp", id: "rws-out-qp", label: "Toe / heel pressure", value: (r) => fmt(r.q_max, 0) + " / " + fmt(r.q_min, 0) + " psf (compare toe to allowable bearing)" },
  ],
  compute: computeRetainingWallStability,
});

// ===================== spec-v287..v289: geotechnical foundation depth batch =====================
// The checks the bearing/earth-pressure/wall bench left open: the immediate
// elastic settlement soil-bearing-capacity calls separate, the alpha-method
// pile capacity beside helical-pile's torque correlation, and the
// infinite-slope translational factor of safety.

// dims: in { q_ksf: M L^-1 T^-2, b_ft: L, es_ksf: M L^-1 T^-2, nu: dimensionless, is_f: dimensionless } out: { se_ft: L, se_in: L }
export function computeSoilSettlementElastic({ q_ksf = 0, b_ft = 0, es_ksf = 0, nu = 0.3, is_f = 0.82 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(q_ksf > 0)) return { error: "Net contact pressure must be positive (ksf)." };
  if (!(b_ft > 0)) return { error: "Footing width must be positive (ft)." };
  if (!(es_ksf > 0)) return { error: "Soil elastic modulus must be positive (ksf)." };
  if (!(nu >= 0 && nu < 0.5)) return { error: "Poisson's ratio must be at least 0 and below 0.5." };
  if (!(is_f > 0)) return { error: "The influence factor must be positive (0.82 rigid square)." };
  const se_ft = (q_ksf * b_ft * (1 - nu * nu) * is_f) / es_ksf;
  const se_in = se_ft * 12;
  const verdict = se_in <= 1 ? "within the customary 1 in serviceability limit" : "over the customary 1 in limit - resize the footing or improve the soil";
  return {
    se_ft, se_in, verdict,
    note: "Theory-of-elasticity immediate settlement Se = q B (1 - nu^2) Is / Es, with the shape-and-rigidity influence factor Is (~0.82 rigid square, ~0.95 flexible-square average, larger for strips) as compiled in Bowles and the customary geotechnical texts. Immediate (elastic) settlement on a deep uniform elastic layer only - not the time-dependent consolidation settlement of a clay; one homogeneous modulus (no layering or increase with depth); influence factor as entered; no embedment correction. A design aid, not a substitute for the geotechnical engineer of record's report.",
  };
}
export const soilSettlementElasticExample = { inputs: { q_ksf: 3, b_ft: 6, es_ksf: 250, nu: 0.3, is_f: 0.82 } };

GEOTECH_RENDERERS["soil-settlement-elastic"] = _simpleRenderer({
  citation: "Citation: theory-of-elasticity immediate settlement Se = q B (1 - nu^2) Is / Es with the shape/rigidity influence factor Is (Bowles and the customary geotechnical texts), by name. Immediate settlement on a uniform elastic layer; consolidation and embedment are separate. A design aid, not a substitute for the geotechnical engineer's report.",
  example: soilSettlementElasticExample.inputs,
  fields: [
    { key: "q_ksf", label: "Net contact pressure q (ksf)", kind: "number" },
    { key: "b_ft", label: "Footing width B (ft)", kind: "number" },
    { key: "es_ksf", label: "Soil elastic modulus Es (ksf)", kind: "number" },
    { key: "nu", label: "Poisson's ratio nu (0.3 sand)", kind: "number", default: 0.3 },
    { key: "is_f", label: "Influence factor Is (0.82 rigid square)", kind: "number", default: 0.82 },
  ],
  outputs: [
    { key: "se", id: "sse-out-se", label: "Elastic settlement Se", value: (r) => fmt(r.se_in, 2) + " in (" + fmt(r.se_ft, 4) + " ft)" },
    { key: "v", id: "sse-out-v", label: "Serviceability read", value: (r) => r.verdict },
    { key: "n", id: "sse-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSoilSettlementElastic,
});

// dims: in { d_ft: L, l_ft: L, cu_ksf: M L^-1 T^-2, alpha: dimensionless, fs: dimensionless } out: { as_ft2: L^2, ap_ft2: L^2, qs_kip: M T^-2, qp_kip: M T^-2, qult_kip: M T^-2, qall_kip: M T^-2 }
export function computePileAxialCapacity({ d_ft = 0, l_ft = 0, cu_ksf = 0, alpha = 0.55, fs = 3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(d_ft > 0)) return { error: "Pile diameter must be positive (ft)." };
  if (!(l_ft > 0)) return { error: "Embedded length must be positive (ft)." };
  if (!(cu_ksf > 0)) return { error: "Undrained shear strength must be positive (ksf)." };
  if (!(alpha > 0 && alpha <= 1)) return { error: "The adhesion factor alpha is over 0 and up to 1.0." };
  if (!(fs > 0)) return { error: "The factor of safety must be positive." };
  const as_ft2 = Math.PI * d_ft * l_ft;
  const ap_ft2 = (Math.PI * d_ft * d_ft) / 4;
  const qs_kip = alpha * cu_ksf * as_ft2;
  const qp_kip = 9 * cu_ksf * ap_ft2;
  const qult_kip = qs_kip + qp_kip;
  const qall_kip = qult_kip / fs;
  const skin_frac = qs_kip / qult_kip;
  return {
    as_ft2, ap_ft2, qs_kip, qp_kip, qult_kip, qall_kip, skin_frac,
    note: "Alpha (total-stress) method for a single straight-shaft pile in a uniform cohesive soil: Qult = alpha cu (pi D L) + 9 cu (pi D^2/4), with the adhesion factor alpha (~1.0 soft clay to ~0.5 stiff; ~0.55 medium stiff) and the tip bearing factor Nc = 9, as compiled in the FHWA and Das foundation texts; the customary factor of safety without a load test is 2 to 3. Compression capacity from the soil's shear strength - not the beta effective-stress method for sand, one soil layer, no group efficiency, no negative skin friction or uplift, no dynamic/driving capacity. A design aid; the geotechnical engineer of record and, where required, a load test govern.",
  };
}
export const pileAxialCapacityExample = { inputs: { d_ft: 1.3333, l_ft: 40, cu_ksf: 1, alpha: 0.55, fs: 3 } };

GEOTECH_RENDERERS["pile-axial-capacity"] = _simpleRenderer({
  citation: "Citation: alpha (total-stress) pile capacity in clay, Qult = alpha cu (pi D L) + 9 cu (pi D^2/4), with the adhesion factor and Nc = 9 as compiled in the FHWA / Das foundation references, and the customary FS of 2-3 without a load test, by name. Single pile, uniform clay. A design aid; the geotechnical engineer and a load test govern.",
  example: pileAxialCapacityExample.inputs,
  fields: [
    { key: "d_ft", label: "Pile diameter D (ft)", kind: "number" },
    { key: "l_ft", label: "Embedded length L (ft)", kind: "number" },
    { key: "cu_ksf", label: "Undrained shear strength cu (ksf)", kind: "number" },
    { key: "alpha", label: "Adhesion factor alpha (~0.55 medium stiff)", kind: "number", default: 0.55 },
    { key: "fs", label: "Factor of safety FS", kind: "number", default: 3 },
  ],
  outputs: [
    { key: "qs", id: "pac-out-qs", label: "Skin friction Qs", value: (r) => fmt(r.qs_kip, 1) + " kip (" + fmt(r.skin_frac * 100, 0) + "% of capacity)" },
    { key: "qp", id: "pac-out-qp", label: "End bearing Qp (Nc = 9)", value: (r) => fmt(r.qp_kip, 1) + " kip" },
    { key: "qu", id: "pac-out-qu", label: "Ultimate Qult", value: (r) => fmt(r.qult_kip, 1) + " kip" },
    { key: "qa", id: "pac-out-qa", label: "Allowable Qall (Qult / FS)", value: (r) => fmt(r.qall_kip, 1) + " kip" },
    { key: "n", id: "pac-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePileAxialCapacity,
});

// dims: in { beta_deg: dimensionless, phi_deg: dimensionless, c_psf: M L^-1 T^-2, gamma_pcf: M L^-2 T^-2, h_ft: L } out: { driving_psf: M L^-1 T^-2, resisting_psf: M L^-1 T^-2, fs_slope: dimensionless }
export function computeSlopeStabilityInfinite({ beta_deg = 0, phi_deg = 0, c_psf = 0, gamma_pcf = 120, h_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(beta_deg > 0 && beta_deg < 90)) return { error: "Slope angle must be between 0 and 90 degrees (exclusive)." };
  if (!(phi_deg >= 0 && phi_deg < 90)) return { error: "Friction angle must be at least 0 and below 90 degrees." };
  if (c_psf < 0) return { error: "Effective cohesion cannot be negative (psf)." };
  if (!(gamma_pcf > 0)) return { error: "Unit weight must be positive (pcf)." };
  if (!(h_ft > 0)) return { error: "Failure-plane depth must be positive (ft)." };
  const b = (beta_deg * Math.PI) / 180;
  const p = (phi_deg * Math.PI) / 180;
  const driving_psf = gamma_pcf * h_ft * Math.sin(b) * Math.cos(b);
  const resisting_psf = c_psf + gamma_pcf * h_ft * Math.cos(b) * Math.cos(b) * Math.tan(p);
  const fs_slope = resisting_psf / driving_psf;
  const verdict = fs_slope >= 1.5 ? "at or above the customary 1.5 - the slope holds" : (fs_slope >= 1.0 ? "between 1.0 and 1.5 - marginal; flatten the slope or retain it" : "below 1.0 - the slope is predicted to slide");
  return {
    driving_psf, resisting_psf, fs_slope, verdict,
    note: "Infinite-slope factor of safety FS = (c' + gamma H cos^2 beta tan phi') / (gamma H sin beta cos beta), as compiled in the Das and NAVFAC slope-stability references; for a cohesionless soil (c' = 0) it collapses to FS = tan phi' / tan beta - depth- and weight-independent, which is why a dry sand slope stands exactly at its angle of repose. Shallow translational slide on a plane parallel to a long uniform slope, dry (no seepage or pore pressure; the submerged gamma - gamma_w case is a follow-on), drained effective-stress parameters, no seismic loading - not a circular Bishop/Spencer analysis. A screening aid; the geotechnical engineer of record governs.",
  };
}
export const slopeStabilityInfiniteExample = { inputs: { beta_deg: 25, phi_deg: 30, c_psf: 200, gamma_pcf: 120, h_ft: 8 } };

GEOTECH_RENDERERS["slope-stability-infinite"] = _simpleRenderer({
  citation: "Citation: infinite-slope stability FS = (c' + gamma H cos^2 beta tan phi') / (gamma H sin beta cos beta) with the cohesionless reduction tan phi' / tan beta (Das / NAVFAC slope-stability references), by name. Translational slide, no seepage, uniform soil. A screening aid, not a substitute for the geotechnical engineer's stability analysis.",
  example: slopeStabilityInfiniteExample.inputs,
  fields: [
    { key: "beta_deg", label: "Slope angle beta (deg)", kind: "number" },
    { key: "phi_deg", label: "Effective friction angle phi' (deg)", kind: "number" },
    { key: "c_psf", label: "Effective cohesion c' (psf, 0 cohesionless)", kind: "number", default: 0 },
    { key: "gamma_pcf", label: "Soil unit weight (pcf)", kind: "number", default: 120 },
    { key: "h_ft", label: "Depth to failure plane H (ft)", kind: "number" },
  ],
  outputs: [
    { key: "drv", id: "ssi-out-drv", label: "Driving shear stress", value: (r) => fmt(r.driving_psf, 1) + " psf" },
    { key: "res", id: "ssi-out-res", label: "Available shear strength", value: (r) => fmt(r.resisting_psf, 1) + " psf" },
    { key: "fs", id: "ssi-out-fs", label: "Factor of safety", value: (r) => fmt(r.fs_slope, 2) + " (" + r.verdict + ")" },
    { key: "n", id: "ssi-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSlopeStabilityInfinite,
});

// ===================== spec-v308..v310: geotechnical depth-2 batch =====================
// The settlement and pressure cases the first geotech batch deferred: primary
// consolidation of clay (the time-dependent settlement soil-settlement-elastic
// names separate), the eccentric footing bearing pressure and kern check, and
// the concentrated (line-load) surcharge lateral pressure on a wall.

// dims: in { cc: dimensionless, h_ft: L, e0: dimensionless, sig0_psf: M L^-1 T^-2, dsig_psf: M L^-1 T^-2 } out: { sc_ft: L, sc_in: L }
export function computeSoilConsolidationSettlement({ cc = 0, h_ft = 0, e0 = 0, sig0_psf = 0, dsig_psf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(cc > 0)) return { error: "The compression index Cc must be positive." };
  if (!(h_ft > 0)) return { error: "Layer thickness must be positive (ft)." };
  if (!(1 + e0 > 0)) return { error: "The void ratio e0 must give a positive (1 + e0)." };
  if (!(sig0_psf > 0)) return { error: "The initial effective stress must be positive (psf)." };
  if (dsig_psf < 0) return { error: "The stress increase cannot be negative (psf)." };
  const sc_ft = (cc * h_ft / (1 + e0)) * Math.log10((sig0_psf + dsig_psf) / sig0_psf);
  const sc_in = sc_ft * 12;
  return {
    sc_ft, sc_in,
    note: "Terzaghi primary consolidation of a normally-consolidated clay Sc = (Cc H/(1 + e0)) log10((sigma'0 + d_sigma)/sigma'0), with the compression index Cc (often ~0.009(LL - 10) for remolded clay); an overconsolidated clay uses the recompression index Cr below the preconsolidation stress. Because settlement grows with the log of the STRESS RATIO (not the stress), the first load increment is the costly one. Single normally-consolidated layer at one representative mid-layer stress (sublayer the profile for accuracy) - not the immediate elastic settlement, the secondary (creep) settlement, or the time rate (that needs the coefficient of consolidation). A design aid, not a substitute for the geotechnical engineer of record's report.",
  };
}
export const soilConsolidationSettlementExample = { inputs: { cc: 0.25, h_ft: 10, e0: 0.90, sig0_psf: 2000, dsig_psf: 1000 } };

GEOTECH_RENDERERS["soil-consolidation-settlement"] = _simpleRenderer({
  citation: "Citation: Terzaghi primary consolidation Sc = (Cc H/(1 + e0)) log10((sigma'0 + d_sigma)/sigma'0) for a normally-consolidated clay, with the Cc/Cr distinction, as compiled in Das / NAVFAC, by name. Single NC layer, no time rate. A design aid, not a substitute for the geotechnical engineer's report.",
  example: soilConsolidationSettlementExample.inputs,
  fields: [
    { key: "cc", label: "Compression index Cc", kind: "number" },
    { key: "h_ft", label: "Clay layer thickness H (ft)", kind: "number" },
    { key: "e0", label: "Initial void ratio e0", kind: "number" },
    { key: "sig0_psf", label: "Initial effective stress at mid-layer (psf)", kind: "number" },
    { key: "dsig_psf", label: "Stress increase from load (psf)", kind: "number" },
  ],
  outputs: [
    { key: "sc", id: "scs-out-sc", label: "Primary consolidation settlement Sc", value: (r) => fmt(r.sc_in, 2) + " in (" + fmt(r.sc_ft, 4) + " ft)" },
    { key: "n", id: "scs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSoilConsolidationSettlement,
});

// dims: in { p_kip: M L T^-2, m_kft: M L^2 T^-2, b_ft: L, l_ft: L } out: { e_ft: L, q_max_ksf: M L^-1 T^-2, q_min_ksf: M L^-1 T^-2, bearing_len_ft: L }
export function computeFootingEccentricPressure({ p_kip = 0, m_kft = 0, b_ft = 0, l_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(p_kip > 0)) return { error: "Vertical load must be positive (kip)." };
  if (m_kft < 0) return { error: "Enter the moment magnitude as non-negative (kip-ft)." };
  if (!(b_ft > 0) || !(l_ft > 0)) return { error: "Footing dimensions must be positive (ft)." };
  const e_ft = m_kft / p_kip;
  const kern = b_ft / 6;
  let q_max_ksf, q_min_ksf, bearing_len_ft, kern_status;
  if (e_ft <= kern) {
    const q_avg = p_kip / (b_ft * l_ft);
    q_max_ksf = q_avg * (1 + (6 * e_ft) / b_ft);
    q_min_ksf = q_avg * (1 - (6 * e_ft) / b_ft);
    bearing_len_ft = b_ft;
    kern_status = "inside the middle-third kern (e <= B/6): full trapezoidal bearing";
  } else {
    if (!(b_ft / 2 - e_ft > 0)) return { error: "The eccentricity reaches or passes the footing edge (e >= B/2) - the footing overturns." };
    q_max_ksf = (2 * p_kip) / (3 * l_ft * (b_ft / 2 - e_ft));
    q_min_ksf = 0;
    bearing_len_ft = 3 * (b_ft / 2 - e_ft);
    kern_status = "outside the kern (e > B/6): heel lifts, triangular bearing over the front " + fmt(bearing_len_ft, 2) + " ft";
  }
  return {
    e_ft, kern, q_max_ksf, q_min_ksf, bearing_len_ft, kern_status,
    note: "Rigid-footing bearing pressure under a one-way eccentric (axial + moment) load, e = M/P: while the resultant stays in the middle-third kern (e <= B/6) the pressure is trapezoidal, q = (P/BL)(1 +/- 6e/B); once e > B/6 the heel lifts and the pressure is a triangle over the reduced front length 3(B/2 - e) with q_min = 0 and q_max = 2P/(3L(B/2 - e)). Uniaxial eccentricity (a biaxial ex, ey load needs the two-way form), a rigid footing on linear-elastic soil - it does not check the allowable bearing (soil-bearing-capacity), settlement, or the footing's own flexure/shear. A design aid, not a substitute for the structural/geotechnical engineer of record's design.",
  };
}
export const footingEccentricPressureExample = { inputs: { p_kip: 60, m_kft: 60, b_ft: 8, l_ft: 8 } };

GEOTECH_RENDERERS["footing-eccentric-pressure"] = _simpleRenderer({
  citation: "Citation: eccentric footing bearing pressure - the middle-third rule q = (P/BL)(1 +/- 6e/B) for e <= B/6, and the outside-kern triangle q_max = 2P/(3L(B/2 - e)), q_min = 0, with e = M/P, by name. Uniaxial, rigid footing. A design aid, not a substitute for the engineer of record.",
  example: footingEccentricPressureExample.inputs,
  fields: [
    { key: "p_kip", label: "Vertical load P (kip)", kind: "number" },
    { key: "m_kft", label: "Moment about the B axis M (kip-ft)", kind: "number" },
    { key: "b_ft", label: "Footing width B, eccentricity direction (ft)", kind: "number" },
    { key: "l_ft", label: "Footing length L (ft)", kind: "number" },
  ],
  outputs: [
    { key: "e", id: "fep-out-e", label: "Eccentricity e = M/P (kern B/6)", value: (r) => fmt(r.e_ft, 3) + " ft (kern " + fmt(r.kern, 2) + " ft)" },
    { key: "qx", id: "fep-out-qx", label: "Maximum bearing pressure q_max", value: (r) => fmt(r.q_max_ksf, 2) + " ksf" },
    { key: "qn", id: "fep-out-qn", label: "Minimum bearing pressure q_min", value: (r) => fmt(r.q_min_ksf, 2) + " ksf" },
    { key: "k", id: "fep-out-k", label: "Kern status", value: (r) => r.kern_status },
    { key: "n", id: "fep-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFootingEccentricPressure,
});

// dims: in { ql_plf: M T^-2, h_ft: L, x_ft: L, z_ft: L } out: { m_ratio: dimensionless, n_ratio: dimensionless, sigma_h_psf: M L^-1 T^-2 }
export function computeBoussinesqSurchargeWall({ ql_plf = 0, h_ft = 0, x_ft = 0, z_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(ql_plf > 0)) return { error: "Line load must be positive (lb/ft)." };
  if (!(h_ft > 0)) return { error: "Wall height must be positive (ft)." };
  if (!(x_ft > 0)) return { error: "Setback must be positive (ft)." };
  if (z_ft < 0) return { error: "Depth cannot be negative (ft)." };
  if (z_ft > h_ft) return { error: "Depth must be within the wall height (z <= H)." };
  const m_ratio = x_ft / h_ft;
  const n_ratio = z_ft / h_ft;
  let sigma_h_psf;
  if (m_ratio <= 0.4) {
    sigma_h_psf = (0.203 * ql_plf / h_ft) * n_ratio / Math.pow(0.16 + n_ratio * n_ratio, 2);
  } else {
    sigma_h_psf = (1.28 * ql_plf / h_ft) * (m_ratio * m_ratio * n_ratio) / Math.pow(m_ratio * m_ratio + n_ratio * n_ratio, 2);
  }
  return {
    m_ratio, n_ratio, sigma_h_psf,
    note: "NAVFAC DM-7.2 modified-Boussinesq lateral pressure from a line load qL (parallel to the wall) at setback x, depth z, wall height H, with m = x/H, n = z/H: sigma_h = (0.203 qL/H) n/(0.16 + n^2)^2 for m <= 0.4, and (1.28 qL/H)(m^2 n)/(m^2 + n^2)^2 for m > 0.4 - the doubled elastic Boussinesq solution for an unyielding (non-deflecting) rigid wall (a flexible wall that can deflect sees roughly the un-doubled value). Pressure at a single depth from a line load - a point or strip load uses the companion NAVFAC forms; it does not integrate the resultant thrust and its point of application or add the earth pressure beneath it (lateral-earth-pressure). A design aid, not a substitute for the geotechnical engineer of record's report.",
  };
}
export const boussinesqSurchargeWallExample = { inputs: { ql_plf: 1000, h_ft: 10, x_ft: 4, z_ft: 3 } };

GEOTECH_RENDERERS["boussinesq-surcharge-wall"] = _simpleRenderer({
  citation: "Citation: NAVFAC DM-7.2 modified-Boussinesq line-load lateral pressure sigma_h = (0.203 qL/H) n/(0.16 + n^2)^2 (m <= 0.4) and (1.28 qL/H)(m^2 n)/(m^2 + n^2)^2 (m > 0.4), the rigid-wall doubling, m = x/H, n = z/H, by name. Line load, single depth. A design aid, not a substitute for the geotechnical engineer's report.",
  example: boussinesqSurchargeWallExample.inputs,
  fields: [
    { key: "ql_plf", label: "Line load qL (lb/ft, parallel to wall)", kind: "number" },
    { key: "h_ft", label: "Wall height H (ft)", kind: "number" },
    { key: "x_ft", label: "Setback of the load x (ft)", kind: "number" },
    { key: "z_ft", label: "Depth to evaluate z (ft)", kind: "number" },
  ],
  outputs: [
    { key: "mn", id: "bsw-out-mn", label: "m = x/H / n = z/H", value: (r) => fmt(r.m_ratio, 3) + " / " + fmt(r.n_ratio, 3) },
    { key: "sh", id: "bsw-out-sh", label: "Lateral pressure sigma_h", value: (r) => fmt(r.sigma_h_psf, 1) + " psf" },
    { key: "n", id: "bsw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBoussinesqSurchargeWall,
});

// ===================== spec-v414..v416: geotechnical settlement/foundation trio (Group E) =====================

// dims: in { u_percent: dimensionless, cv_ft2_day: dimensionless, hdr_ft: L } out: { tv: dimensionless, t_days: dimensionless }
export function computeConsolidationTimeRate({ u_percent = 0, cv_ft2_day = 0, hdr_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const u = Number(u_percent) || 0;
  const cv = Number(cv_ft2_day) || 0;
  const hdr = Number(hdr_ft) || 0;
  if (!(u > 0 && u < 100)) return { error: "Degree of consolidation must be between 0 and 100%." };
  if (!(cv > 0)) return { error: "Coefficient of consolidation cv must be positive (ft^2/day)." };
  if (!(hdr > 0)) return { error: "Drainage path Hdr must be positive (ft)." };
  const tv = u <= 60 ? (Math.PI / 4) * Math.pow(u / 100, 2) : 1.781 - 0.933 * Math.log10(100 - u);
  const t_days = tv * hdr * hdr / cv;
  return {
    tv, t_days, t_years: t_days / 365.25,
    note: "Terzaghi one-dimensional consolidation time: the time factor Tv = (pi/4)(U/100)^2 for U <= 60% and 1.781 - 0.933 log10(100 - U) above, then the time t = Tv Hdr^2 / cv. Hdr is the longest drainage path - the full layer thickness for single (one-way) drainage, or half the thickness for double (two-way) drainage - so mis-setting it changes the time by a factor of four. The decelerating curve means the last increment of settlement takes far longer than the first. A design aid; the engineer of record and the site-specific cv govern.",
  };
}
export const consolidationTimeRateExample = { inputs: { u_percent: 90, cv_ft2_day: 0.1, hdr_ft: 10 } };
GEOTECH_RENDERERS["consolidation-time-rate"] = _simpleRenderer({
  citation: "Citation: Terzaghi 1-D consolidation time factor: Tv = (pi/4)(U/100)^2 for U <= 60%, else 1.781 - 0.933 log10(100 - U); time t = Tv Hdr^2 / cv, with Hdr the longest drainage path (full layer for single, half for double drainage). A design aid; the engineer of record and the site cv govern.",
  example: consolidationTimeRateExample.inputs,
  fields: [
    { key: "u_percent", label: "Target degree of consolidation U (%)", kind: "number", default: 90 },
    { key: "cv_ft2_day", label: "Coefficient of consolidation cv (ft^2/day)", kind: "number", default: 0.1 },
    { key: "hdr_ft", label: "Drainage path Hdr (ft)", kind: "number", default: 10 },
  ],
  outputs: [
    { key: "tv", id: "ctr-out-tv", label: "Time factor Tv", value: (r) => fmt(r.tv, 3) },
    { key: "t", id: "ctr-out-t", label: "Time to reach U", value: (r) => fmt(r.t_days, 0) + " days (" + fmt(r.t_years, 2) + " yr)" },
    { key: "n", id: "ctr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConsolidationTimeRate,
});

// dims: in { n60: dimensionless, b_ft: L, d_ft: L } out: { qa_base_ksf: M L^-1 T^-2, kd: dimensionless, qa_ksf: M L^-1 T^-2 }
export function computeSptBearingCapacity({ n60 = 0, b_ft = 0, d_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const n = Number(n60) || 0;
  const b = Number(b_ft) || 0;
  const d = Number(d_ft) || 0;
  if (!(n > 0)) return { error: "SPT N60 must be positive." };
  if (!(b > 0)) return { error: "Footing width B must be positive (ft)." };
  if (!(d > 0)) return { error: "Embedment depth D must be positive (ft)." };
  const qa_base_ksf = b <= 4 ? n / 4 : (n / 6) * Math.pow((b + 1) / b, 2);
  const kd = Math.min(1 + 0.33 * d / b, 1.33);
  const qa_ksf = qa_base_ksf * kd;
  return {
    qa_base_ksf, kd, qa_ksf, small_footing: b <= 4,
    note: "Meyerhof allowable soil bearing on sand for a 1 inch settlement, from the energy-corrected SPT N60: qa = N60/4 (ksf) for B <= 4 ft, or (N60/6)((B+1)/B)^2 for wider footings, times the depth factor Kd = 1 + 0.33 D/B (capped at 1.33). This is a settlement-controlled allowable, not the ultimate bearing capacity, so no additional factor of safety applies. The N60 must be energy-corrected; a shallow water table roughly halves the capacity (not applied here). A design aid; the engineer of record and the geotechnical report govern.",
  };
}
export const sptBearingCapacityExample = { inputs: { n60: 20, b_ft: 6, d_ft: 2 } };
GEOTECH_RENDERERS["spt-bearing-capacity"] = _simpleRenderer({
  citation: "Citation: Meyerhof SPT allowable bearing on sand for 1 in settlement: qa = N60/4 ksf for B <= 4 ft, else (N60/6)((B+1)/B)^2, times Kd = min(1 + 0.33 D/B, 1.33). A settlement-controlled allowable (no added factor of safety); N60 must be energy-corrected. A design aid; the engineer of record and the geotechnical report govern.",
  example: sptBearingCapacityExample.inputs,
  fields: [
    { key: "n60", label: "SPT N60 (energy-corrected)", kind: "number", default: 20 },
    { key: "b_ft", label: "Footing width B (ft)", kind: "number", default: 6 },
    { key: "d_ft", label: "Embedment depth D (ft)", kind: "number", default: 2 },
  ],
  outputs: [
    { key: "qab", id: "spt-out-qab", label: "Base allowable (before depth factor)", value: (r) => fmt(r.qa_base_ksf, 2) + " ksf (" + (r.small_footing ? "B <= 4 branch" : "wide-footing branch") + ")" },
    { key: "kd", id: "spt-out-kd", label: "Depth factor Kd", value: (r) => fmt(r.kd, 2) },
    { key: "qa", id: "spt-out-qa", label: "Allowable bearing qa", value: (r) => fmt(r.qa_ksf, 2) + " ksf" },
    { key: "n", id: "spt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSptBearingCapacity,
});

// dims: in { amax_g: dimensionless, sigma_v_psf: M L^-1 T^-2, sigma_vp_psf: M L^-1 T^-2, depth_m: L, crr: dimensionless, msf: dimensionless } out: { rd: dimensionless, csr: dimensionless, fs: dimensionless }
export function computeLiquefactionScreening({ amax_g = 0, sigma_v_psf = 0, sigma_vp_psf = 0, depth_m = 0, crr = 0, msf = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const amax = Number(amax_g) || 0;
  const sv = Number(sigma_v_psf) || 0;
  const svp = Number(sigma_vp_psf) || 0;
  const depth = Number(depth_m) || 0;
  const crrv = Number(crr) || 0;
  const msfv = Number(msf) || 0;
  if (!(amax > 0)) return { error: "Peak ground acceleration must be positive (g)." };
  if (!(sv > 0)) return { error: "Total vertical stress must be positive (psf)." };
  if (!(svp > 0)) return { error: "Effective vertical stress must be positive (psf)." };
  if (!(svp <= sv)) return { error: "Effective stress cannot exceed the total stress." };
  if (!(depth > 0)) return { error: "Depth must be positive (m)." };
  if (!(crrv > 0)) return { error: "Cyclic resistance ratio CRR must be positive." };
  if (!(msfv > 0)) return { error: "Magnitude scaling factor must be positive." };
  const rd = depth <= 9.15 ? 1 - 0.00765 * depth : 1.174 - 0.0267 * depth;
  const csr = 0.65 * amax * (sv / svp) * rd;
  const fs = (crrv / csr) * msfv;
  return {
    rd, csr, fs, liquefiable: fs < 1.0,
    note: "Seed-Idriss simplified liquefaction-triggering screen: the stress-reduction factor rd = 1 - 0.00765 z for z <= 9.15 m (else 1.174 - 0.0267 z), the cyclic stress ratio CSR = 0.65 amax (sigma_v/sigma'_v) rd, and the factor of safety FS = (CRR/CSR) x MSF, with liquefaction triggered when FS < 1. CRR comes from the (N1)60 or CPT charts for the sand, and the magnitude scaling factor adjusts from the Mw 7.5 reference. This is a screening tool for level ground; a site-specific analysis, the fines correction, and the post-liquefaction settlement are the engineer's work. A design aid; the geotechnical engineer of record governs.",
  };
}
export const liquefactionScreeningExample = { inputs: { amax_g: 0.30, sigma_v_psf: 2000, sigma_vp_psf: 1200, depth_m: 5, crr: 0.20, msf: 1.0 } };
GEOTECH_RENDERERS["liquefaction-screening"] = _simpleRenderer({
  citation: "Citation: Seed-Idriss simplified liquefaction triggering: rd = 1 - 0.00765 z (z <= 9.15 m) else 1.174 - 0.0267 z, CSR = 0.65 amax (sigma_v/sigma'_v) rd, FS = (CRR/CSR) MSF, liquefiable if FS < 1. A screening tool for level ground; the geotechnical engineer of record and a site-specific analysis govern.",
  example: liquefactionScreeningExample.inputs,
  fields: [
    { key: "amax_g", label: "Peak ground acceleration (g)", kind: "number", default: 0.30 },
    { key: "sigma_v_psf", label: "Total vertical stress (psf)", kind: "number", default: 2000 },
    { key: "sigma_vp_psf", label: "Effective vertical stress (psf)", kind: "number", default: 1200 },
    { key: "depth_m", label: "Depth (m)", kind: "number", default: 5 },
    { key: "crr", label: "Cyclic resistance ratio CRR", kind: "number", default: 0.20 },
    { key: "msf", label: "Magnitude scaling factor (Mw 7.5 = 1.0)", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "csr", id: "liq-out-csr", label: "Cyclic stress ratio CSR", value: (r) => fmt(r.csr, 3) + " (rd " + fmt(r.rd, 3) + ")" },
    { key: "fs", id: "liq-out-fs", label: "Factor of safety FS", value: (r) => fmt(r.fs, 2) + (r.liquefiable ? " -- LIQUEFIABLE (FS < 1)" : " -- not liquefiable") },
    { key: "n", id: "liq-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLiquefactionScreening,
});

// ===================== spec-v498: pile group efficiency, Converse-Labarre =====================

// dims: in { rows_n: dimensionless, cols_m: dimensionless, diameter_in: L, spacing_in: L, single_allow_kip: M L T^-2 } out: { theta_deg: dimensionless, eg: dimensionless, n_piles: dimensionless, group_kip: M L T^-2, naive_kip: M L T^-2 }
export function computePileGroupEfficiency({ rows_n = 0, cols_m = 0, diameter_in = 0, spacing_in = 0, single_allow_kip = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const n = Number(rows_n) || 0;
  const m = Number(cols_m) || 0;
  const d = Number(diameter_in) || 0;
  const s = Number(spacing_in) || 0;
  const q = Number(single_allow_kip) || 0;
  if (!(n >= 1)) return { error: "Number of rows must be at least 1." };
  if (!(m >= 1)) return { error: "Number of columns must be at least 1." };
  if (!(d > 0)) return { error: "Pile diameter must be positive (in)." };
  if (!(s >= d)) return { error: "Center-to-center spacing must be at least the pile diameter (in)." };
  if (q < 0) return { error: "Single-pile allowable cannot be negative (kip)." };
  const theta_deg = Math.atan(d / s) * 180 / Math.PI;
  const eg = 1 - theta_deg * ((n - 1) * m + (m - 1) * n) / (90 * m * n);
  const n_piles = m * n;
  const group_kip = eg * n_piles * q;
  const naive_kip = n_piles * q;
  if (![theta_deg, eg, group_kip, naive_kip].every(Number.isFinite)) return { error: "Pile-group math is not a finite value." };
  return {
    theta_deg, eg, n_piles, group_kip, naive_kip,
    note: "Converse-Labarre pile-group efficiency: a pile group carries LESS than the sum of its piles because the stress bulbs of adjacent piles overlap. theta = atan(d/s), Eg = 1 - theta x ((n-1)m + (m-1)n) / (90 m n), and the group allowable = Eg x (m x n) x Q_single. Efficiency drops as the spacing tightens -- below about 3d it falls under 0.7, so close-spaced piles give diminishing returns and adding piles at tight spacing over-predicts the group. This is an empirical friction-pile hand check; a block (pier) failure of the group acting as a unit and group settlement are separate checks this tile does not replace. A design aid, not a substitute for the geotechnical engineer of record.",
  };
}
export const pileGroupEfficiencyExample = { inputs: { rows_n: 3, cols_m: 3, diameter_in: 12, spacing_in: 36, single_allow_kip: 100 } };

GEOTECH_RENDERERS["pile-group-efficiency"] = _simpleRenderer({
  citation: "Citation: Converse-Labarre pile-group efficiency (standard geotechnical practice): theta = atan(d/s) in degrees; Eg = 1 - theta x ((n-1)m + (m-1)n) / (90 m n); group allowable = Eg x (m x n) x Q_single. Group capacity is less than the sum of the piles because the stress bulbs overlap; efficiency drops as spacing tightens. An empirical friction-pile hand check; block failure and settlement are separate. A design aid; the geotechnical engineer of record governs.",
  example: pileGroupEfficiencyExample.inputs,
  fields: [
    { key: "rows_n", label: "Pile rows n", kind: "number", attrs: { step: "1", min: "1" } },
    { key: "cols_m", label: "Pile columns m", kind: "number", attrs: { step: "1", min: "1" } },
    { key: "diameter_in", label: "Pile diameter d (in)", kind: "number" },
    { key: "spacing_in", label: "Center-to-center spacing s (in, >= d)", kind: "number" },
    { key: "single_allow_kip", label: "Single-pile allowable Q (kip)", kind: "number" },
  ],
  outputs: [
    { key: "th", id: "pge-out-th", label: "Angle theta = atan(d/s)", value: (r) => fmt(r.theta_deg, 2) + " deg" },
    { key: "eg", id: "pge-out-eg", label: "Converse-Labarre efficiency Eg", value: (r) => fmt(r.eg, 3) },
    { key: "grp", id: "pge-out-grp", label: "Group allowable (" + "Eg x n x Q)", value: (r) => fmt(r.group_kip, 0) + " kip (" + r.n_piles + " piles)" },
    { key: "nv", id: "pge-out-nv", label: "Naive sum it corrects", value: (r) => fmt(r.naive_kip, 0) + " kip (over-predicts by " + fmt(r.naive_kip - r.group_kip, 0) + " kip)" },
  ],
  compute: computePileGroupEfficiency,
});
