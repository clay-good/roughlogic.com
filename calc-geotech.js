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
