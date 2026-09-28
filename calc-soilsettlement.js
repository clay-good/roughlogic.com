// Group E (cont.): settlement, footing-pressure, and consolidation-time bench.
// spec-v1857 moves these existing calculators out of calc-geotech.js so the
// geotechnical module stays below its gzip cap. Calculator behavior, IDs,
// citations, examples, and Group E assignments are unchanged.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

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

function _simpleRenderer(spec) {
  const _rlRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id || f.key, f.options);
      else field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
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

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

export const SOILSETTLEMENT_RENDERERS = {};

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

SOILSETTLEMENT_RENDERERS["soil-consolidation-settlement"] = _simpleRenderer({
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

// spec-v1202: over-consolidated primary consolidation. The NC-clay tile above uses Cc alone;
// most natural clays are OVER-consolidated, where settlement follows the flat recompression
// index Cr until the load pushes the stress past the preconsolidation pressure sigma'p, then
// the steep virgin Cc. Below sigma'p the settlement is a fraction of the NC value -- the whole
// reason knowing sigma'p matters. Reduces exactly to the NC tile when sigma'p = sigma'0.
// dims: in { cc: dimensionless, cr: dimensionless, h_ft: L, e0: dimensionless, sig0_psf: M L^-1 T^-2, sigp_psf: M L^-1 T^-2, dsig_psf: M L^-1 T^-2 } out: { sc_ft: L, sc_in: L, ocr: dimensionless }
export function computeOverconsolidatedSettlement({ cc = 0, cr = 0, h_ft = 0, e0 = 0, sig0_psf = 0, sigp_psf = 0, dsig_psf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  dsig_psf = Number(dsig_psf);
  if (!(cc > 0)) return { error: "The compression index Cc must be positive." };
  if (!(cr > 0)) return { error: "The recompression index Cr must be positive (typically Cr is about 0.1 to 0.2 of Cc)." };
  if (cr > cc) return { error: "The recompression index Cr cannot exceed the compression index Cc." };
  if (!(h_ft > 0)) return { error: "Layer thickness must be positive (ft)." };
  if (!(1 + e0 > 0)) return { error: "The void ratio e0 must give a positive (1 + e0)." };
  if (!(sig0_psf > 0)) return { error: "The initial effective stress must be positive (psf)." };
  if (!(sigp_psf >= sig0_psf)) return { error: "The preconsolidation stress cannot be less than the current effective stress (that soil is under-consolidated, a different case)." };
  if (dsig_psf < 0) return { error: "The stress increase cannot be negative (psf)." };
  const factor = h_ft / (1 + e0);
  const final_stress_psf = sig0_psf + dsig_psf;
  let sc_ft, crosses_preconsolidation;
  if (final_stress_psf <= sigp_psf) {
    // Stays on the recompression curve.
    sc_ft = cr * factor * Math.log10(final_stress_psf / sig0_psf);
    crosses_preconsolidation = false;
  } else {
    // Recompression up to sigma'p, then virgin compression beyond it.
    sc_ft = cr * factor * Math.log10(sigp_psf / sig0_psf) + cc * factor * Math.log10(final_stress_psf / sigp_psf);
    crosses_preconsolidation = true;
  }
  const sc_in = sc_ft * 12;
  const ocr = sigp_psf / sig0_psf;
  if (![sc_ft, sc_in, ocr].every(Number.isFinite)) return { error: "Consolidation math is not a finite value." };
  return {
    sc_ft, sc_in, ocr, crosses_preconsolidation, final_stress_psf,
    note: "Terzaghi primary consolidation of an OVER-consolidated clay, the common natural case the NC-clay tile does not cover: settlement follows the flat recompression index Cr while the effective stress stays below the preconsolidation pressure sigma'p, and only the portion of the load that pushes the stress past sigma'p follows the steep virgin compression index Cc. So Sc = (Cr H/(1+e0)) log10(sigma'p/sigma'0) + (Cc H/(1+e0)) log10((sigma'0+d_sigma)/sigma'p) when the load crosses sigma'p, or just the recompression term when it does not -- and in that case the settlement is a small fraction of what the NC formula predicts, which is the whole reason an over-consolidation ratio (OCR = sigma'p/sigma'0) matters. Cr is typically 0.1 to 0.2 of Cc; sigma'p comes from a consolidation (oedometer) test by the Casagrande construction. At OCR = 1 (sigma'p = sigma'0) this reduces exactly to the NC tile. Primary consolidation only -- the secondary compression and the time rate are separate (consolidation-time-rate). A design aid; the oedometer data and the geotechnical engineer of record govern.",
  };
}
export const overconsolidatedSettlementExample = { inputs: { cc: 0.25, cr: 0.05, h_ft: 10, e0: 0.90, sig0_psf: 2000, sigp_psf: 3000, dsig_psf: 2000 } };

SOILSETTLEMENT_RENDERERS["overconsolidated-settlement"] = _simpleRenderer({
  citation: "Citation: Terzaghi primary consolidation of an over-consolidated clay, Sc = (Cr H/(1+e0)) log10(sigma'p/sigma'0) + (Cc H/(1+e0)) log10((sigma'0+d_sigma)/sigma'p) when the load crosses the preconsolidation pressure sigma'p, else the recompression term alone, as compiled in Das / NAVFAC, by name. Cr is typically 0.1 to 0.2 of Cc; sigma'p is from a consolidation (oedometer) test. Reduces to the NC-clay tile at OCR = 1. A design aid; the oedometer data and the geotechnical engineer of record govern.",
  example: overconsolidatedSettlementExample.inputs,
  fields: [
    { key: "cc", label: "Compression index Cc (virgin)", kind: "number" },
    { key: "cr", label: "Recompression index Cr (~0.1 to 0.2 Cc)", kind: "number" },
    { key: "h_ft", label: "Clay layer thickness H (ft)", kind: "number" },
    { key: "e0", label: "Initial void ratio e0", kind: "number" },
    { key: "sig0_psf", label: "Initial effective stress at mid-layer (psf)", kind: "number" },
    { key: "sigp_psf", label: "Preconsolidation pressure sigma'p (psf)", kind: "number" },
    { key: "dsig_psf", label: "Stress increase from load (psf)", kind: "number" },
  ],
  outputs: [
    { key: "sc", id: "ocs-out-sc", label: "Primary consolidation settlement Sc", value: (r) => fmt(r.sc_in, 2) + " in (" + fmt(r.sc_ft, 4) + " ft)" },
    { key: "ocr", id: "ocs-out-ocr", label: "Over-consolidation ratio / load path", value: (r) => "OCR " + fmt(r.ocr, 2) + " -- " + (r.crosses_preconsolidation ? "load crosses sigma'p into virgin compression" : "stays below sigma'p (recompression only)") },
    { key: "n", id: "ocs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeOverconsolidatedSettlement,
});

// dims: in { c_alpha: dimensionless, h_ft: L, ep: dimensionless, t1_yr: T, t2_yr: T } out: { ss_in: L, ss_ft: L, c_alpha_eps: dimensionless }
export function computeSecondaryCompression({ c_alpha = 0, h_ft = 0, ep = 0, t1_yr = 0, t2_yr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(c_alpha > 0)) return { error: "The secondary compression index C-alpha must be positive." };
  if (!(h_ft > 0)) return { error: "Layer thickness must be positive (ft)." };
  if (!(1 + ep > 0)) return { error: "The void ratio at end of primary must give a positive (1 + ep)." };
  if (!(t1_yr > 0)) return { error: "The time to end of primary consolidation must be positive (yr)." };
  if (!(t2_yr > t1_yr)) return { error: "The time of interest must be later than the end of primary consolidation (t2 > t1)." };
  const c_alpha_eps = c_alpha / (1 + ep);                       // modified secondary compression index
  const ss_ft = c_alpha_eps * h_ft * Math.log10(t2_yr / t1_yr);
  const ss_in = ss_ft * 12;
  if (![ss_ft, ss_in, c_alpha_eps].every(Number.isFinite)) return { error: "Secondary-compression math is not a finite value." };
  return {
    ss_ft, ss_in, c_alpha_eps,
    note: "Secondary compression (creep) settlement, the slow settlement that continues AFTER primary consolidation is complete -- the part the primary-consolidation tiles leave out and the part that governs the long-term movement of organic and highly plastic clays. Ss = (C-alpha/(1+ep)) H log10(t2/t1), where C-alpha is the secondary compression index (the slope of void ratio versus log-time from the oedometer's tail), ep the void ratio at the end of primary consolidation, H the layer thickness, t1 the time primary consolidation completes, and t2 the time of interest. A 10 ft clay with C-alpha 0.02, ep 0.85, from the end of primary at 1 year out to 50 years, creeps another 2.2 in. Because it grows with the LOG of the time ratio, most of it accrues in the first decades but it never truly stops. C-alpha is roughly 0.04 (inorganic) to 0.05 (organic) times the compression index Cc (Mesri). Independent of the primary settlement and its time rate (consolidation-time-rate); add it to the primary total for the long-term settlement. A design aid; the oedometer data and the geotechnical engineer of record govern.",
  };
}
export const secondaryCompressionExample = { inputs: { c_alpha: 0.02, h_ft: 10, ep: 0.85, t1_yr: 1, t2_yr: 50 } };
SOILSETTLEMENT_RENDERERS["secondary-compression-settlement"] = _simpleRenderer({
  citation: "Citation: Secondary compression (creep) settlement Ss = (C-alpha/(1+ep)) H log10(t2/t1), the post-primary consolidation settlement, as compiled in Das / Holtz-Kovacs / Mesri, by name. C-alpha (secondary compression index) and ep (void ratio at end of primary) are from a consolidation (oedometer) test; C-alpha/Cc is about 0.04 inorganic to 0.05 organic (Mesri). Independent of the primary settlement and its time rate. A design aid; the oedometer data and the geotechnical engineer of record govern.",
  example: secondaryCompressionExample.inputs,
  fields: [
    { key: "c_alpha", label: "Secondary compression index C-alpha", kind: "number" },
    { key: "h_ft", label: "Clay layer thickness H (ft)", kind: "number" },
    { key: "ep", label: "Void ratio at end of primary ep", kind: "number" },
    { key: "t1_yr", label: "Time to end of primary t1 (yr)", kind: "number" },
    { key: "t2_yr", label: "Time of interest t2 (yr)", kind: "number" },
  ],
  outputs: [
    { key: "ss", id: "scs-out-ss", label: "Secondary compression settlement Ss", value: (r) => fmt(r.ss_in, 2) + " in (" + fmt(r.ss_ft, 4) + " ft)" },
    { key: "cae", id: "scs-out-cae", label: "Modified secondary index C-alpha-eps", value: (r) => fmt(r.c_alpha_eps, 4) },
    { key: "n", id: "scs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSecondaryCompression,
});

// dims: in { sc_allow_in: L, cc: dimensionless, h_ft: L, e0: dimensionless, sig0_psf: M L^-1 T^-2 } out: { dsig_psf: M L^-1 T^-2, final_stress_psf: M L^-1 T^-2, stress_ratio: dimensionless }
export function computeSettlementLimitLoad({ sc_allow_in = 0, cc = 0, h_ft = 0, e0 = 0, sig0_psf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(sc_allow_in > 0)) return { error: "Allowable settlement must be positive (in)." };
  if (!(cc > 0)) return { error: "The compression index Cc must be positive." };
  if (!(h_ft > 0)) return { error: "Layer thickness must be positive (ft)." };
  if (!(1 + e0 > 0)) return { error: "The void ratio e0 must give a positive (1 + e0)." };
  if (!(sig0_psf > 0)) return { error: "The initial effective stress must be positive (psf)." };
  const sc_ft = sc_allow_in / 12;
  const stress_ratio = Math.pow(10, sc_ft * (1 + e0) / (cc * h_ft));
  const dsig_psf = sig0_psf * (stress_ratio - 1);
  const final_stress_psf = sig0_psf + dsig_psf;
  return {
    dsig_psf, final_stress_psf, stress_ratio,
    note: "The inverse of the primary-consolidation settlement tile: the maximum load-induced stress increase d_sigma that keeps a normally-consolidated clay's primary settlement within an allowable limit. Solving Sc = (Cc H/(1 + e0)) log10((sigma'0 + d_sigma)/sigma'0) for d_sigma gives d_sigma = sigma'0 (10^(Sc(1 + e0)/(Cc H)) - 1). Because settlement grows with the log of the stress RATIO, the allowable increment is a fraction of the existing stress, and a tighter settlement limit allows disproportionately less load. Single normally-consolidated layer at one representative mid-layer stress (sublayer the profile for accuracy) - not the immediate elastic settlement, secondary creep, or the time rate. A design aid, not a substitute for the geotechnical engineer of record's report.",
  };
}
export const settlementLimitLoadExample = { inputs: { sc_allow_in: 2, cc: 0.25, h_ft: 10, e0: 0.90, sig0_psf: 2000 } };
SOILSETTLEMENT_RENDERERS["settlement-limit-load"] = _simpleRenderer({
  citation: "Citation: Terzaghi primary consolidation solved for the allowable load: d_sigma = sigma'0 (10^(Sc(1 + e0)/(Cc H)) - 1), the inverse of Sc = (Cc H/(1 + e0)) log10((sigma'0 + d_sigma)/sigma'0), for a normally-consolidated clay, as compiled in Das / NAVFAC, by name. Single NC layer, one representative mid-layer stress. A design aid, not a substitute for the geotechnical engineer's report.",
  example: settlementLimitLoadExample.inputs,
  fields: [
    { key: "sc_allow_in", label: "Allowable settlement (in)", kind: "number" },
    { key: "cc", label: "Compression index Cc", kind: "number" },
    { key: "h_ft", label: "Clay layer thickness H (ft)", kind: "number" },
    { key: "e0", label: "Initial void ratio e0", kind: "number" },
    { key: "sig0_psf", label: "Initial effective stress at mid-layer (psf)", kind: "number" },
  ],
  outputs: [
    { key: "ds", id: "sll-out-ds", label: "Max allowable stress increase", value: (r) => fmt(r.dsig_psf, 0) + " psf" },
    { key: "fs", id: "sll-out-fs", label: "Resulting mid-layer stress", value: (r) => fmt(r.final_stress_psf, 0) + " psf (stress ratio " + fmt(r.stress_ratio, 3) + ")" },
    { key: "n", id: "sll-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSettlementLimitLoad,
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

SOILSETTLEMENT_RENDERERS["footing-eccentric-pressure"] = _simpleRenderer({
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
    sigma_h_psf = (0.20 * ql_plf / h_ft) * n_ratio / Math.pow(0.16 + n_ratio * n_ratio, 2);
  } else {
    sigma_h_psf = (1.28 * ql_plf / h_ft) * (m_ratio * m_ratio * n_ratio) / Math.pow(m_ratio * m_ratio + n_ratio * n_ratio, 2);
  }
  return {
    m_ratio, n_ratio, sigma_h_psf,
    note: "NAVFAC DM-7.2 modified-Boussinesq lateral pressure from a line load qL (parallel to the wall) at setback x, depth z, wall height H, with m = x/H, n = z/H: sigma_h = (0.20 qL/H) n/(0.16 + n^2)^2 for m <= 0.4, and (1.28 qL/H)(m^2 n)/(m^2 + n^2)^2 for m > 0.4 - the doubled elastic Boussinesq solution for an unyielding (non-deflecting) rigid wall (a flexible wall that can deflect sees roughly the un-doubled value). Pressure at a single depth from a line load - a point or strip load uses the companion NAVFAC forms; it does not integrate the resultant thrust and its point of application or add the earth pressure beneath it (lateral-earth-pressure). A design aid, not a substitute for the geotechnical engineer of record's report.",
  };
}
export const boussinesqSurchargeWallExample = { inputs: { ql_plf: 1000, h_ft: 10, x_ft: 4, z_ft: 3 } };

SOILSETTLEMENT_RENDERERS["boussinesq-surcharge-wall"] = _simpleRenderer({
  citation: "Citation: NAVFAC DM-7.2 modified-Boussinesq line-load lateral pressure sigma_h = (0.20 qL/H, NAVFAC DM-7.02 Figure 11) n/(0.16 + n^2)^2 (m <= 0.4) and (1.28 qL/H)(m^2 n)/(m^2 + n^2)^2 (m > 0.4), the rigid-wall doubling, m = x/H, n = z/H, by name. Line load, single depth. A design aid, not a substitute for the geotechnical engineer's report.",
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

// dims: in { u_percent: dimensionless, cv_ft2_day: L^2 T^-1, hdr_ft: L } out: { tv: dimensionless, t_days: dimensionless }
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
SOILSETTLEMENT_RENDERERS["consolidation-time-rate"] = _simpleRenderer({
  citation: "Citation: Terzaghi 1-D consolidation time factor: Tv = (pi/4)(U/100)^2 for U <= 60%, else 1.781 - 0.933 log10(100 - U); time t = Tv Hdr^2 / cv, with Hdr the longest drainage path (full layer for single, half for double drainage). A design aid; the engineer of record and the site cv govern.",
  example: consolidationTimeRateExample.inputs,
  fields: [
    { key: "u_percent", label: "Target degree of consolidation U (%)", kind: "number" },
    { key: "cv_ft2_day", label: "Coefficient of consolidation cv (ft²/day)", kind: "number" },
    { key: "hdr_ft", label: "Drainage path Hdr (ft)", kind: "number" },
  ],
  outputs: [
    { key: "tv", id: "ctr-out-tv", label: "Time factor Tv", value: (r) => fmt(r.tv, 3) },
    { key: "t", id: "ctr-out-t", label: "Time to reach U", value: (r) => fmt(r.t_days, 0) + " days (" + fmt(r.t_years, 2) + " yr)" },
    { key: "n", id: "ctr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConsolidationTimeRate,
});

// dims: in { cv_ft2_day: L^2 T^-1, hdr_ft: L, t_days: dimensionless } out: { tv: dimensionless, u_percent: dimensionless }
export function computeConsolidationDegree({ cv_ft2_day = 0, hdr_ft = 0, t_days = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cv = Number(cv_ft2_day) || 0;
  const hdr = Number(hdr_ft) || 0;
  const t = Number(t_days) || 0;
  if (!(cv > 0)) return { error: "Coefficient of consolidation cv must be positive (ft^2/day)." };
  if (!(hdr > 0)) return { error: "Drainage path Hdr must be positive (ft)." };
  if (!(t > 0)) return { error: "Elapsed time must be positive (days)." };
  const tv = cv * t / (hdr * hdr);
  const TV_60 = (Math.PI / 4) * 0.36; // Tv at U = 60%
  const u_percent = tv <= TV_60
    ? 100 * Math.sqrt(4 * tv / Math.PI)
    : 100 - Math.pow(10, (1.781 - tv) / 0.933);
  return {
    tv, u_percent,
    note: "Inverse Terzaghi 1-D consolidation: the degree of consolidation U reached after an elapsed time t, from the time factor Tv = cv t / Hdr^2 inverted - U = 100 sqrt(4 Tv / pi) for Tv <= 0.283 (U <= 60%) and U = 100 - 10^((1.781 - Tv)/0.933) above. This is the inverse of the consolidation-time tile (which gives the time to reach a target U): the field/monitoring question of how far a surcharge or fill has consolidated so far. Hdr is the longest drainage path - the full layer for single (one-way) drainage, half for double - so mis-setting it changes Tv by a factor of four. The decelerating curve means U approaches 100% asymptotically and never quite reaches it. A design aid; the engineer of record and the site-specific cv govern.",
  };
}
export const consolidationDegreeExample = { inputs: { cv_ft2_day: 0.1, hdr_ft: 10, t_days: 848 } };
SOILSETTLEMENT_RENDERERS["consolidation-degree"] = _simpleRenderer({
  citation: "Citation: Terzaghi 1-D consolidation degree from elapsed time - Tv = cv t / Hdr^2, then U = 100 sqrt(4 Tv / pi) for Tv <= 0.283 (U <= 60%), else U = 100 - 10^((1.781 - Tv)/0.933); the inverse of the consolidation-time tile. Hdr is the longest drainage path (full layer for single, half for double drainage). A design aid; the engineer of record and the site cv govern.",
  example: consolidationDegreeExample.inputs,
  fields: [
    { key: "cv_ft2_day", label: "Coefficient of consolidation cv (ft²/day)", kind: "number" },
    { key: "hdr_ft", label: "Drainage path Hdr (ft)", kind: "number" },
    { key: "t_days", label: "Elapsed time (days)", kind: "number" },
  ],
  outputs: [
    { key: "tv", id: "ccd-out-tv", label: "Time factor Tv", value: (r) => fmt(r.tv, 3) },
    { key: "u", id: "ccd-out-u", label: "Degree of consolidation U", value: (r) => fmt(r.u_percent, 1) + " %" },
    { key: "n", id: "ccd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConsolidationDegree,
});

// ===================== spec-v1207: coefficient of consolidation cv from an oedometer curve =====================
// The consolidation-time-rate and consolidation-degree tiles both REQUIRE cv as an input, but
// nothing in the catalog produced it. cv comes from fitting the oedometer (ASTM D2435) dial-reading
// vs. time curve of one load increment by one of the two standard curve-fitting methods:
//   Casagrande log-time (find t50):  cv = T50 Hdr^2 / t50, T50 = 0.197
//   Taylor square-root-time (find t90): cv = T90 Hdr^2 / t90, T90 = 0.848
// Hdr is the drainage path of the TEST SPECIMEN during that increment: half the specimen height for
// the usual two-way (top-and-bottom porous stone) drainage, the full height for one-way. Output is
// in^2/min (lab), cm^2/s (lab), and ft^2/day (the unit the two consolidation-time tiles consume).
// dims: in { method: dimensionless, t_fit_min: T, specimen_height_in: L, drainage: dimensionless }
//       out: { tv: dimensionless, hdr_in: L, cv_in2_min: L^2 T^-1, cv_cm2_s: L^2 T^-1, cv_ft2_day: L^2 T^-1 }
export function computeCoefficientOfConsolidation({ method = "casagrande", t_fit_min = 0, specimen_height_in = 0, drainage = "double" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const t = Number(t_fit_min) || 0;
  const H = Number(specimen_height_in) || 0;
  const m = String(method).toLowerCase();
  const d = String(drainage).toLowerCase();
  if (m !== "casagrande" && m !== "taylor") return { error: "Method must be 'casagrande' (log-time, t50) or 'taylor' (sqrt-time, t90)." };
  if (d !== "double" && d !== "single") return { error: "Drainage must be 'double' (two-way) or 'single' (one-way)." };
  if (!(t > 0)) return { error: "The fitting time (t50 for Casagrande, t90 for Taylor) must be positive (min)." };
  if (!(H > 0)) return { error: "Specimen height must be positive (in)." };
  const tv = m === "casagrande" ? 0.197 : 0.848;
  const hdr_in = d === "double" ? H / 2 : H;
  const cv_in2_min = tv * hdr_in * hdr_in / t;
  const cv_ft2_day = cv_in2_min * 10; // 1 in^2/min = (1/144 ft^2)/(1/1440 day) = 10 ft^2/day.
  const cv_cm2_s = cv_in2_min * (6.4516 / 60); // 1 in^2 = 6.4516 cm^2, 1 min = 60 s.
  if (![tv, hdr_in, cv_in2_min, cv_ft2_day, cv_cm2_s].every(Number.isFinite)) return { error: "Coefficient-of-consolidation math is not a finite value." };
  return {
    tv, hdr_in, cv_in2_min, cv_ft2_day, cv_cm2_s,
    fit_percent: m === "casagrande" ? 50 : 90,
    note: "The coefficient of consolidation cv, the one input the consolidation-time-rate and consolidation-degree tiles need but the catalog did not produce, from an oedometer (ASTM D2435) time-settlement curve. Two standard curve-fitting methods: Casagrande's LOG-TIME method reads the time t50 at 50% consolidation and uses cv = T50 Hdr^2/t50 with T50 = 0.197; Taylor's SQUARE-ROOT-TIME method reads t90 at 90% and uses cv = T90 Hdr^2/t90 with T90 = 0.848. Hdr is the drainage path of the small TEST SPECIMEN during the load increment - half the specimen height for the usual two-way drainage (porous stones top and bottom), the full height for one-way - not the field layer thickness. A 1 in specimen drained both ways (Hdr 0.5 in) with a Casagrande t50 of 5 min gives cv 0.00985 in^2/min = 0.0985 ft^2/day = 1.06e-3 cm^2/s, which is then fed to the time-rate tiles with the FIELD drainage path. Report cv from several load increments (it varies with stress); the two methods often differ, and Taylor tends to run higher. A design aid; the oedometer data and the geotechnical engineer of record govern.",
  };
}
export const coefficientOfConsolidationExample = { inputs: { method: "casagrande", t_fit_min: 5, specimen_height_in: 1.0, drainage: "double" } };
SOILSETTLEMENT_RENDERERS["coefficient-of-consolidation"] = _simpleRenderer({
  citation: "Citation: coefficient of consolidation from an oedometer (ASTM D2435) time-settlement curve by the two standard fitting methods - Casagrande log-time cv = T50 Hdr^2/t50 (T50 = 0.197) and Taylor square-root-time cv = T90 Hdr^2/t90 (T90 = 0.848), with Hdr the specimen drainage path (half the specimen height for two-way drainage), as compiled in Das / Holtz-Kovacs / Terzaghi, by name. Feeds the consolidation-time-rate and consolidation-degree tiles. A design aid; the oedometer data and the engineer of record govern.",
  example: coefficientOfConsolidationExample.inputs,
  fields: [
    { key: "method", label: "Fitting method", kind: "select", default: "casagrande", options: [
      { value: "casagrande", label: "Casagrande log-time (t50, T50 = 0.197)" },
      { value: "taylor", label: "Taylor sqrt-time (t90, T90 = 0.848)" },
    ] },
    { key: "t_fit_min", label: "Fitting time t50 or t90 (min)", kind: "number" },
    { key: "specimen_height_in", label: "Specimen height (in)", kind: "number" },
    { key: "drainage", label: "Specimen drainage", kind: "select", default: "double", options: [
      { value: "double", label: "Two-way (Hdr = H/2)" },
      { value: "single", label: "One-way (Hdr = H)" },
    ] },
  ],
  outputs: [
    { key: "cv", id: "coc-out-cv", label: "cv (feed the time-rate tiles)", value: (r) => fmt(r.cv_ft2_day, 4) + " ft^2/day" },
    { key: "cvlab", id: "coc-out-cvlab", label: "cv (lab units)", value: (r) => fmt(r.cv_in2_min, 5) + " in^2/min / " + r.cv_cm2_s.toExponential(3) + " cm^2/s" },
    { key: "tvhdr", id: "coc-out-tvhdr", label: "Time factor Tv / specimen Hdr", value: (r) => fmt(r.tv, 3) + " (U " + fmt(r.fit_percent, 0) + "%) / " + fmt(r.hdr_in, 3) + " in" },
    { key: "n", id: "coc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCoefficientOfConsolidation,
});

