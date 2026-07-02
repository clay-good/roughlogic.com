// Group E (cont.): AISC 360 structural-steel member and connection bench.
// spec-v254..v256 establish this new lazy-loaded renderer module -- the
// steel-member companion to the wood-framing (beam-loading, column-buckling-
// wood) and steel-weld (fillet-weld-strength, groove-weld-strength) tiles the
// catalog already carried, which sized welds but never the member itself.
// spec-v266..v268 add the bolted-connection trio (the eccentric bolt group,
// the per-bolt shear/bearing strength, and the column base plate), the bolted
// counterpart to the existing weld-group-eccentric tile. Every tile keeps
// group: "E" (a tile's group letter is independent of the module that holds it
// -- the spec-v70..v98 split precedent). Tiles:
//   v254 steel-beam-flexure     (AISC 360 Ch. F, compact + braced)
//   v255 steel-beam-shear       (AISC 360 Ch. G, web shear)
//   v256 steel-column-capacity  (AISC 360 Ch. E, flexural buckling)
//   v266 bolt-group-eccentric   (elastic vector method)
//   v267 bolt-shear-bearing     (AISC 360 J3.6 / J3.10)
//   v268 column-base-plate      (AISC Design Guide 1 / 360 J8)
// All GOVERNANCE.general design aids; the reference design values (Zx, d, tw,
// Fnv, etc.) are user-supplied from the AISC Manual. See spec-v254.md..v268.md.

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

// Compact renderer factory (same shape as the calc-finish / calc-construction
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

export const STEEL_RENDERERS = {};

// ===================== spec-v254: steel beam flexural capacity =====================

// dims: in { fy: M L^-1 T^-2, zx: L^3, mu: M L^2 T^-2 } out: { mp_kipin: M L^2 T^-2, mn_kipft: M L^2 T^-2, ma_kipft: M L^2 T^-2, phi_mn: M L^2 T^-2, util_asd: dimensionless }
export function computeSteelBeamFlexure({ fy = 50, zx = 0, mu = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fy > 0)) return { error: "Yield stress Fy must be positive (ksi)." };
  if (!(zx > 0)) return { error: "Plastic section modulus Zx must be positive (in^3)." };
  if (mu < 0) return { error: "Required moment cannot be negative (kip-ft)." };
  const mp_kipin = fy * zx;
  const mn_kipft = mp_kipin / 12;
  const ma_kipft = mn_kipft / 1.67;
  const phi_mn = 0.90 * mn_kipft;
  const util_asd = mu > 0 ? mu / ma_kipft : null;
  return { mp_kipin, mn_kipft, ma_kipft, phi_mn, util_asd };
}

export const steelBeamFlexureExample = { inputs: { fy: 50, zx: 101, mu: 200 } };

STEEL_RENDERERS["steel-beam-flexure"] = _simpleRenderer({
  citation: "Citation: AISC 360-22 Chapter F (F2.1) nominal flexural strength of a compact, laterally-braced doubly-symmetric I-shape: Mn = Mp = Fy x Zx. The ASD allowable is Mn / Omega_b (Omega_b = 1.67) and the LRFD design strength is phi_b x Mn (phi_b = 0.90), per §B3.1 / §B3.2. This is the plastic-moment plateau only -- it assumes the section is compact (F2 applies, not the F3 flange-local-buckling or F4/F5 slender-web reductions) and the compression flange is continuously braced or Lb <= Lp (no lateral-torsional buckling, F2.2). Take Zx from the AISC Steel Construction Manual for the actual shape. A design aid, not a substitute for the engineer of record.",
  example: steelBeamFlexureExample.inputs,
  fields: [
    { key: "fy", label: "Yield stress Fy (ksi)", kind: "number", default: 50 },
    { key: "zx", label: "Plastic section modulus Zx (in^3)", kind: "number" },
    { key: "mu", label: "Required moment Mu (kip-ft, 0 to skip)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "mn", id: "sbf-out-mn", label: "Nominal Mn", value: (r) => fmt(r.mn_kipft, 1) + " kip-ft" },
    { key: "ma", id: "sbf-out-ma", label: "ASD allowable Mn/Omega", value: (r) => fmt(r.ma_kipft, 1) + " kip-ft" },
    { key: "pm", id: "sbf-out-pm", label: "LRFD design phi_b*Mn", value: (r) => fmt(r.phi_mn, 1) + " kip-ft" },
    { key: "ut", id: "sbf-out-ut", label: "Demand / capacity (ASD)", value: (r) => r.util_asd === null ? "-" : fmt(r.util_asd, 2) + (r.util_asd > 1 ? " (OVER)" : "") },
  ],
  compute: computeSteelBeamFlexure,
});

// ===================== spec-v255: steel beam web shear capacity =====================

// dims: in { fy: M L^-1 T^-2, d: L, tw: L, cv1: dimensionless, omega_v: dimensionless, vu: M L T^-2 } out: { aw: L^2, vn: M L T^-2, va: M L T^-2, phi_vn: M L T^-2, util_asd: dimensionless }
export function computeSteelBeamShear({ fy = 50, d = 0, tw = 0, cv1 = 1.0, omega_v = 1.50, vu = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fy > 0)) return { error: "Yield stress Fy must be positive (ksi)." };
  if (!(d > 0)) return { error: "Section depth d must be positive (in)." };
  if (!(tw > 0)) return { error: "Web thickness tw must be positive (in)." };
  if (!(cv1 > 0)) return { error: "Web shear coefficient Cv1 must be positive." };
  if (!(omega_v > 0)) return { error: "Safety factor Omega_v must be positive." };
  if (vu < 0) return { error: "Required shear cannot be negative (kips)." };
  const aw = d * tw;
  const vn = 0.6 * fy * aw * cv1;
  const phi_v = omega_v === 1.50 ? 1.00 : 0.90;
  const va = vn / omega_v;
  const phi_vn = phi_v * vn;
  const util_asd = vu > 0 ? vu / va : null;
  return { aw, vn, phi_v, va, phi_vn, util_asd };
}

export const steelBeamShearExample = { inputs: { fy: 50, d: 17.99, tw: 0.355, cv1: 1.0, omega_v: 1.50, vu: 0 } };

STEEL_RENDERERS["steel-beam-shear"] = _simpleRenderer({
  citation: "Citation: AISC 360-22 Chapter G (G2.1) web shear strength of a rolled I-shape: Vn = 0.6 x Fy x Aw x Cv1 with Aw = d x tw. For rolled I-shapes with h/tw <= 2.24 sqrt(E/Fy) (about 53.9 at Fy = 50 ksi), Cv1 = 1.0 and the paired factors are Omega_v = 1.50 (ASD) / phi_v = 1.00 (LRFD) per G2.1(a); slenderer webs take Cv1 < 1.0 and the general Omega_v = 1.67 / phi_v = 0.90 per G2.1(b). The ASD allowable is Vn / Omega_v and the LRFD design strength is phi_v x Vn. Block shear at a coped or bolted end (J4.3) is a separate check. Take d and tw from the AISC Manual for the actual shape. A design aid, not a substitute for the engineer of record.",
  example: steelBeamShearExample.inputs,
  fields: [
    { key: "fy", label: "Yield stress Fy (ksi)", kind: "number", default: 50 },
    { key: "d", label: "Section depth d (in)", kind: "number" },
    { key: "tw", label: "Web thickness tw (in)", kind: "number" },
    { key: "cv1", label: "Web shear coefficient Cv1", kind: "number", default: 1.0 },
    { key: "omega_v", label: "ASD safety factor Omega_v (1.50 or 1.67)", kind: "number", default: 1.50 },
    { key: "vu", label: "Required shear Vu (kips, 0 to skip)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "aw", id: "sbs-out-aw", label: "Web area Aw", value: (r) => fmt(r.aw, 2) + " in^2" },
    { key: "vn", id: "sbs-out-vn", label: "Nominal Vn", value: (r) => fmt(r.vn, 1) + " kips" },
    { key: "va", id: "sbs-out-va", label: "ASD allowable Vn/Omega", value: (r) => fmt(r.va, 1) + " kips" },
    { key: "pv", id: "sbs-out-pv", label: "LRFD design phi_v*Vn", value: (r) => fmt(r.phi_vn, 1) + " kips" },
    { key: "ut", id: "sbs-out-ut", label: "Demand / capacity (ASD)", value: (r) => r.util_asd === null ? "-" : fmt(r.util_asd, 2) + (r.util_asd > 1 ? " (OVER)" : "") },
  ],
  compute: computeSteelBeamShear,
});

// ===================== spec-v256: steel column compressive capacity =====================

// dims: in { fy: M L^-1 T^-2, e_mod: M L^-1 T^-2, k: dimensionless, l_ft: L, r_in: L, ag: L^2, pu: M L T^-2 } out: { slender: dimensionless, fe: M L^-1 T^-2, limit: dimensionless, fcr: M L^-1 T^-2, pn: M L T^-2, pa: M L T^-2, phi_pn: M L T^-2, util_asd: dimensionless }
export function computeSteelColumnCapacity({ fy = 50, e_mod = 29000, k = 1.0, l_ft = 0, r_in = 0, ag = 0, pu = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fy > 0)) return { error: "Yield stress Fy must be positive (ksi)." };
  if (!(e_mod > 0)) return { error: "Modulus E must be positive (ksi)." };
  if (!(k > 0)) return { error: "Effective-length factor K must be positive." };
  if (!(l_ft > 0)) return { error: "Unbraced length must be positive (ft)." };
  if (!(r_in > 0)) return { error: "Radius of gyration r must be positive (in)." };
  if (!(ag > 0)) return { error: "Gross area Ag must be positive (in^2)." };
  if (pu < 0) return { error: "Required axial load cannot be negative (kips)." };
  const slender = k * l_ft * 12 / r_in;
  const fe = Math.PI * Math.PI * e_mod / (slender * slender);
  const limit = 4.71 * Math.sqrt(e_mod / fy);
  const fcr = slender <= limit ? Math.pow(0.658, fy / fe) * fy : 0.877 * fe;
  const pn = fcr * ag;
  const pa = pn / 1.67;
  const phi_pn = 0.90 * pn;
  const util_asd = pu > 0 ? pu / pa : null;
  return { slender, fe, limit, elastic: slender > limit, fcr, pn, pa, phi_pn, util_asd };
}

export const steelColumnCapacityExample = { inputs: { fy: 50, e_mod: 29000, k: 1.0, l_ft: 14, r_in: 2.01, ag: 13.3, pu: 0 } };

STEEL_RENDERERS["steel-column-capacity"] = _simpleRenderer({
  citation: "Citation: AISC 360-22 Chapter E (E3) flexural-buckling compressive strength of a doubly-symmetric member with no slender elements: KL/r is the slenderness about the governing axis (usually the weak axis, r = ry), Fe = pi^2 E / (KL/r)^2 is the elastic buckling stress, and Fcr = (0.658^(Fy/Fe)) x Fy when KL/r <= 4.71 sqrt(E/Fy) (inelastic) else 0.877 x Fe (elastic). Pn = Fcr x Ag; the ASD allowable is Pn / Omega_c (Omega_c = 1.67) and the LRFD design strength is phi_c x Pn (phi_c = 0.90). Flexural buckling only (no torsional / flexural-torsional, no slender-element Q reduction); take K from the end conditions (or an alignment chart) and r, Ag from the AISC Manual for the actual shape. A design aid, not a substitute for the engineer of record.",
  example: steelColumnCapacityExample.inputs,
  fields: [
    { key: "fy", label: "Yield stress Fy (ksi)", kind: "number", default: 50 },
    { key: "e_mod", label: "Modulus E (ksi)", kind: "number", default: 29000 },
    { key: "k", label: "Effective-length factor K", kind: "number", default: 1.0 },
    { key: "l_ft", label: "Unbraced length L (ft)", kind: "number" },
    { key: "r_in", label: "Radius of gyration r (in)", kind: "number" },
    { key: "ag", label: "Gross area Ag (in^2)", kind: "number" },
    { key: "pu", label: "Required axial load Pu (kips, 0 to skip)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "sl", id: "scc-out-sl", label: "Slenderness KL/r", value: (r) => fmt(r.slender, 1) + (r.elastic ? " (elastic)" : " (inelastic)") },
    { key: "fc", id: "scc-out-fc", label: "Critical stress Fcr", value: (r) => fmt(r.fcr, 1) + " ksi" },
    { key: "pn", id: "scc-out-pn", label: "Nominal Pn", value: (r) => fmt(r.pn, 0) + " kips" },
    { key: "pa", id: "scc-out-pa", label: "ASD allowable Pn/Omega", value: (r) => fmt(r.pa, 0) + " kips" },
    { key: "pp", id: "scc-out-pp", label: "LRFD design phi_c*Pn", value: (r) => fmt(r.phi_pn, 0) + " kips" },
    { key: "ut", id: "scc-out-ut", label: "Demand / capacity (ASD)", value: (r) => r.util_asd === null ? "-" : fmt(r.util_asd, 2) + (r.util_asd > 1 ? " (OVER)" : "") },
  ],
  compute: computeSteelColumnCapacity,
});

// ===================== spec-v266: eccentric bolt group (elastic vector) =====================

// dims: in { load_kip: M L T^-2, ecc_in: L, ncols: dimensionless, nrows: dimensionless, gage_in: L, pitch_in: L } out: { n: dimensionless, moment: M L^2 T^-2, ip: L^2, direct_kip: M L T^-2, tors_h: M L T^-2, tors_v: M L T^-2, resultant_kip: M L T^-2 }
export function computeBoltGroupEccentric({ load_kip = 0, ecc_in = 0, ncols = 2, nrows = 3, gage_in = 3, pitch_in = 3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(load_kip > 0)) return { error: "Load P must be positive (kip)." };
  if (ecc_in < 0) return { error: "Eccentricity cannot be negative (in)." };
  const nc = Math.round(ncols);
  const nr = Math.round(nrows);
  if (!(nc >= 1)) return { error: "Number of columns must be at least 1." };
  if (!(nr >= 1)) return { error: "Number of rows must be at least 1." };
  if (!(gage_in > 0)) return { error: "Column gage must be positive (in)." };
  if (!(pitch_in > 0)) return { error: "Row pitch must be positive (in)." };
  const n = nc * nr;
  const moment = load_kip * ecc_in;
  const xmax = (nc - 1) * gage_in / 2;
  const ymax = (nr - 1) * pitch_in / 2;
  const ix = nc * pitch_in * pitch_in * (nr * nr * nr - nr) / 12; // sum of y^2
  const iy = nr * gage_in * gage_in * (nc * nc * nc - nc) / 12;   // sum of x^2
  const ip = ix + iy;
  const direct_kip = load_kip / n;
  const tors_h = ip > 0 ? moment * ymax / ip : 0;
  const tors_v = ip > 0 ? moment * xmax / ip : 0;
  const rx = tors_h;
  const ry = direct_kip + tors_v;
  const resultant_kip = Math.sqrt(rx * rx + ry * ry);
  return { n, moment, ix, iy, ip, direct_kip, tors_h, tors_v, resultant_kip };
}

export const boltGroupEccentricExample = { inputs: { load_kip: 30, ecc_in: 6, ncols: 2, nrows: 3, gage_in: 3, pitch_in: 3 } };

STEEL_RENDERERS["bolt-group-eccentric"] = _simpleRenderer({
  citation: "Citation: The elastic (vector) method for an eccentric bolt group in shear: superpose the direct shear P/n on every bolt with the torsional shear from the moment M = P x e, distributed by the group polar moment of inertia Ip = sum(x^2 + y^2) taken about the centroid, so the critical (far-corner) bolt carries a horizontal M*ymax/Ip and a vertical M*xmax/Ip added vectorially to the direct P/n. This is the traditional, conservative method (the instantaneous-center-of-rotation method in the AISC Manual gives a higher, less conservative capacity). It returns the force on the worst bolt; compare it to the per-bolt design strength from bolt-shear-bearing (AISC J3). In-plane vertical load on a planar group only. A design aid, not a substitute for the engineer of record.",
  example: boltGroupEccentricExample.inputs,
  fields: [
    { key: "load_kip", label: "Vertical load P (kip)", kind: "number" },
    { key: "ecc_in", label: "Eccentricity e (in)", kind: "number" },
    { key: "ncols", label: "Number of bolt columns", kind: "number", default: 2 },
    { key: "nrows", label: "Number of bolt rows", kind: "number", default: 3 },
    { key: "gage_in", label: "Column gage gx (in)", kind: "number", default: 3 },
    { key: "pitch_in", label: "Row pitch gy (in)", kind: "number", default: 3 },
  ],
  outputs: [
    { key: "n", id: "bge-out-n", label: "Total bolts", value: (r) => String(r.n) },
    { key: "ip", id: "bge-out-ip", label: "Polar moment Ip", value: (r) => fmt(r.ip, 1) + " in^2" },
    { key: "dir", id: "bge-out-dir", label: "Direct shear P/n", value: (r) => fmt(r.direct_kip, 2) + " kip" },
    { key: "res", id: "bge-out-res", label: "Critical bolt force R", value: (r) => fmt(r.resultant_kip, 2) + " kip" },
  ],
  compute: computeBoltGroupEccentric,
});

// ===================== spec-v267: bolt shear + bearing / tearout =====================

// dims: in { d_in: L, ab_in2: L^2, fnv_ksi: M L^-1 T^-2, nplanes: dimensionless, t_in: L, fu_ksi: M L^-1 T^-2, le_in: L, dh_in: L, s_in: L } out: { rn_shear: M L T^-2, bearing_cap: M L T^-2, rn_edge: M L T^-2, rn_int: M L T^-2, rn_gov: M L T^-2, phi_rn: M L T^-2, rn_asd: M L T^-2 }
export function computeBoltShearBearing({ d_in = 0.75, ab_in2 = 0.4418, fnv_ksi = 54, nplanes = 1, t_in = 0.5, fu_ksi = 58, le_in = 1.5, dh_in = 0, s_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(d_in > 0)) return { error: "Bolt diameter d must be positive (in)." };
  if (!(ab_in2 > 0)) return { error: "Bolt area Ab must be positive (in^2)." };
  if (!(fnv_ksi > 0)) return { error: "Bolt shear stress Fnv must be positive (ksi)." };
  if (!(nplanes >= 1)) return { error: "Number of shear planes must be at least 1." };
  if (!(t_in > 0)) return { error: "Ply thickness t must be positive (in)." };
  if (!(fu_ksi > 0)) return { error: "Tensile strength Fu must be positive (ksi)." };
  if (le_in < 0) return { error: "Edge distance cannot be negative (in)." };
  const dh = dh_in > 0 ? dh_in : d_in + 0.0625;
  if (dh <= d_in) return { error: "Hole diameter dh must exceed the bolt diameter d." };
  const rn_shear = nplanes * fnv_ksi * ab_in2;
  const bearing_cap = 2.4 * d_in * t_in * fu_ksi;
  const lc_edge = le_in - dh / 2;
  const rn_edge = Math.min(1.2 * lc_edge * t_in * fu_ksi, bearing_cap);
  const lc_int = s_in > 0 ? s_in - dh : null;
  const rn_int = s_in > 0 ? Math.min(1.2 * lc_int * t_in * fu_ksi, bearing_cap) : null;
  const rn_gov = Math.min(rn_shear, rn_edge);
  const governed_by = rn_shear <= rn_edge ? "bolt shear" : "edge tearout/bearing";
  const phi_rn = 0.75 * rn_gov;
  const rn_asd = rn_gov / 2.00;
  return { rn_shear, bearing_cap, lc_edge, rn_edge, lc_int, rn_int, rn_gov, governed_by, phi_rn, rn_asd };
}

export const boltShearBearingExample = { inputs: { d_in: 0.75, ab_in2: 0.4418, fnv_ksi: 54, nplanes: 1, t_in: 0.5, fu_ksi: 58, le_in: 1.5, dh_in: 0.8125, s_in: 3 } };

STEEL_RENDERERS["bolt-shear-bearing"] = _simpleRenderer({
  citation: "Citation: AISC 360-22 §J3.6 bolt shear rupture Rn = nplanes x Fnv x Ab (Fnv from Table J3.2: 54 ksi A325-N, 68 ksi A325-X, 68 ksi A490-N, 84 ksi A490-X) and §J3.10 bearing / tearout at a bolt hole Rn = 1.2 lc t Fu <= 2.4 d t Fu, where lc is the clear distance in the line of force (edge bolt: le - dh/2; interior bolt: s - dh). The governing per-bolt nominal strength is the smaller of bolt shear and edge bearing/tearout; the design strength is phi x Rn (phi = 0.75) and the allowable is Rn / Omega (Omega = 2.00). Standard holes and the deformation-considered coefficients; one bolt at one hole (group effects, slip-critical, and combined tension-shear are separate checks). A design aid, not a substitute for the engineer of record.",
  example: boltShearBearingExample.inputs,
  fields: [
    { key: "d_in", label: "Bolt diameter d (in)", kind: "number", default: 0.75 },
    { key: "ab_in2", label: "Bolt area Ab (in^2)", kind: "number", default: 0.4418 },
    { key: "fnv_ksi", label: "Bolt shear stress Fnv (ksi)", kind: "number", default: 54 },
    { key: "nplanes", label: "Shear planes (1 single, 2 double)", kind: "number", default: 1 },
    { key: "t_in", label: "Connected ply thickness t (in)", kind: "number", default: 0.5 },
    { key: "fu_ksi", label: "Material tensile strength Fu (ksi)", kind: "number", default: 58 },
    { key: "le_in", label: "Edge distance le (in)", kind: "number", default: 1.5 },
    { key: "dh_in", label: "Hole diameter dh (in, 0 = d + 1/16)", kind: "number", default: 0 },
    { key: "s_in", label: "Bolt pitch s (in, 0 to skip interior)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "sh", id: "bsb-out-sh", label: "Bolt shear Rn", value: (r) => fmt(r.rn_shear, 1) + " kip" },
    { key: "ed", id: "bsb-out-ed", label: "Edge bearing/tearout Rn", value: (r) => fmt(r.rn_edge, 1) + " kip" },
    { key: "gv", id: "bsb-out-gv", label: "Governing per-bolt Rn", value: (r) => fmt(r.rn_gov, 1) + " kip (" + r.governed_by + ")" },
    { key: "ph", id: "bsb-out-ph", label: "LRFD design phi*Rn", value: (r) => fmt(r.phi_rn, 1) + " kip" },
    { key: "as", id: "bsb-out-as", label: "ASD allowable Rn/Omega", value: (r) => fmt(r.rn_asd, 1) + " kip" },
  ],
  compute: computeBoltShearBearing,
});

// ===================== spec-v268: column base plate under axial load =====================

// dims: in { pu_kip: M L T^-2, fc_ksi: M L^-1 T^-2, fy_ksi: M L^-1 T^-2, d_in: L, bf_in: L, b_in: L, n_in: L } out: { a1_req: L^2, a1: L^2, m: L, n: L, np: L, l: L, fpu: M L^-1 T^-2, tp: L }
export function computeColumnBasePlate({ pu_kip = 0, fc_ksi = 4, fy_ksi = 36, d_in = 0, bf_in = 0, b_in = 0, n_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pu_kip > 0)) return { error: "Axial load Pu must be positive (kip)." };
  if (!(fc_ksi > 0)) return { error: "Concrete strength f'c must be positive (ksi)." };
  if (!(fy_ksi > 0)) return { error: "Plate yield Fy must be positive (ksi)." };
  if (!(d_in > 0)) return { error: "Column depth d must be positive (in)." };
  if (!(bf_in > 0)) return { error: "Flange width bf must be positive (in)." };
  if (!(b_in > 0)) return { error: "Plate width B must be positive (in)." };
  if (!(n_in > 0)) return { error: "Plate length N must be positive (in)." };
  if (n_in < 0.95 * d_in) return { error: "Plate length N is smaller than 0.95 d (negative m cantilever) - enlarge the plate." };
  if (b_in < 0.80 * bf_in) return { error: "Plate width B is smaller than 0.80 bf (negative n cantilever) - enlarge the plate." };
  const a1_req = pu_kip / (0.65 * 0.85 * fc_ksi);
  const a1 = b_in * n_in;
  const area_ok = a1 >= a1_req;
  const m = (n_in - 0.95 * d_in) / 2;
  const n = (b_in - 0.80 * bf_in) / 2;
  const np = Math.sqrt(d_in * bf_in) / 4;
  const l = Math.max(m, n, np);
  const fpu = pu_kip / a1;
  const tp = l * Math.sqrt(2 * pu_kip / (0.90 * fy_ksi * b_in * n_in));
  return { a1_req, a1, area_ok, m, n, np, l, fpu, tp };
}

export const columnBasePlateExample = { inputs: { pu_kip: 400, fc_ksi: 4, fy_ksi: 36, d_in: 9.98, bf_in: 10.0, b_in: 14, n_in: 14 } };

STEEL_RENDERERS["column-base-plate"] = _simpleRenderer({
  citation: "Citation: AISC Design Guide 1 §3.1 and AISC 360-22 §J8 concentrically-loaded column base plate: the required concrete bearing area A1_req = Pu / (phi_c x 0.85 x f'c) with phi_c = 0.65 and the confinement factor sqrt(A2/A1) taken as 1.0 (base case); the cantilever dimensions m = (N - 0.95 d)/2, n = (B - 0.80 bf)/2, and n' = sqrt(d bf)/4 (with lambda = 1.0); and the plate thickness tp = l x sqrt(2 Pu / (0.90 Fy B N)) where l = max(m, n, n'). Concentric axial compression only (no moment / uplift); the anchor rods, the shear-transfer mechanism, and the concrete breakout / pier design are separate checks. A design aid, not a substitute for the engineer of record.",
  example: columnBasePlateExample.inputs,
  fields: [
    { key: "pu_kip", label: "Axial load Pu (kip)", kind: "number" },
    { key: "fc_ksi", label: "Concrete strength f'c (ksi)", kind: "number", default: 4 },
    { key: "fy_ksi", label: "Plate yield Fy (ksi)", kind: "number", default: 36 },
    { key: "d_in", label: "Column depth d (in)", kind: "number" },
    { key: "bf_in", label: "Flange width bf (in)", kind: "number" },
    { key: "b_in", label: "Plate width B (in)", kind: "number" },
    { key: "n_in", label: "Plate length N (in)", kind: "number" },
  ],
  outputs: [
    { key: "ar", id: "cbp-out-ar", label: "Required bearing A1", value: (r) => fmt(r.a1_req, 0) + " in^2 (have " + fmt(r.a1, 0) + (r.area_ok ? ", OK)" : ", TOO SMALL)") },
    { key: "l", id: "cbp-out-l", label: "Governing cantilever l", value: (r) => fmt(r.l, 2) + " in" },
    { key: "tp", id: "cbp-out-tp", label: "Required plate thickness", value: (r) => fmt(r.tp, 2) + " in" },
  ],
  compute: computeColumnBasePlate,
});
