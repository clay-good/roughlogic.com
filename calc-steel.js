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

// ===================== spec-v281..v283: steel members-and-connections depth batch =====================
// The checks the v254..v256 member trio explicitly defers: lateral-torsional
// buckling of an unbraced beam (F2), block-shear rupture at a bolted/coped
// end (J4.3), and the tension member's yield/rupture with shear lag (D2/D3).
const _E_STEEL = 29000; // ksi

// dims: in { fy: M L^-1 T^-2, zx: L^3, sx: L^3, ry: L, rts: L, j: L^4, ho: L, lb_ft: L, cb: dimensionless } out: { mp_kipft: M L^2 T^-2, lp_ft: L, lr_ft: L, mn_kipft: M L^2 T^-2, ma_kipft: M L^2 T^-2, phi_mn: M L^2 T^-2 }
export function computeSteelBeamLtb({ fy = 50, zx = 0, sx = 0, ry = 0, rts = 0, j = 0, ho = 0, lb_ft = 0, cb = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fy > 0)) return { error: "Yield stress Fy must be positive (ksi)." };
  for (const [k, v] of [["Zx", zx], ["Sx", sx], ["ry", ry], ["rts", rts], ["J", j], ["ho", ho]]) {
    if (!(v > 0)) return { error: "Section property " + k + " must be positive." };
  }
  if (!(lb_ft > 0)) return { error: "Unbraced length Lb must be positive (ft)." };
  if (!(cb > 0)) return { error: "Cb must be positive (1.0 is conservative)." };
  const c = 1; // doubly symmetric
  const mp = fy * zx; // kip-in
  const mr = 0.7 * fy * sx; // kip-in
  const lp_ft = 1.76 * ry * Math.sqrt(_E_STEEL / fy) / 12;
  const t1 = (j * c) / (sx * ho);
  const lr_ft = (1.95 * rts / 12) * (_E_STEEL / (0.7 * fy)) * Math.sqrt(t1) * Math.sqrt(1 + Math.sqrt(1 + 6.76 * Math.pow((0.7 * fy / _E_STEEL) / t1, 2)));
  let mn, zone, fcr_ksi = null;
  if (lb_ft <= lp_ft) {
    zone = "plastic (Lb <= Lp): full Mp, no LTB reduction";
    mn = mp;
  } else if (lb_ft <= lr_ft) {
    zone = "inelastic LTB (Lp < Lb <= Lr): linear interpolation";
    mn = Math.min(cb * (mp - (mp - mr) * (lb_ft - lp_ft) / (lr_ft - lp_ft)), mp);
  } else {
    zone = "elastic LTB (Lb > Lr): Fcr governs";
    const slr = (12 * lb_ft) / rts;
    fcr_ksi = (cb * Math.PI * Math.PI * _E_STEEL) / (slr * slr) * Math.sqrt(1 + 0.078 * t1 * slr * slr);
    mn = Math.min(fcr_ksi * sx, mp);
  }
  const mp_kipft = mp / 12;
  const mn_kipft = mn / 12;
  const ma_kipft = mn_kipft / 1.67;
  const phi_mn = 0.90 * mn_kipft;
  return {
    mp_kipft, lp_ft, lr_ft, zone, fcr_ksi, mn_kipft, ma_kipft, phi_mn,
    note: "AISC 360-22 F2 for a doubly-symmetric compact I-shape about the strong axis: Lp = 1.76 ry sqrt(E/Fy); Lr from the F2-6 closed form (c = 1); between them Mn = Cb[Mp - (Mp - 0.7 Fy Sx)(Lb - Lp)/(Lr - Lp)] <= Mp, and beyond Lr the elastic Fcr = Cb pi^2 E/(Lb/rts)^2 sqrt(1 + 0.078 Jc/(Sx ho) (Lb/rts)^2). E = 29,000 ksi. Section properties from the AISC Manual; Cb must match the moment diagram (1.0 is conservative). Noncompact/slender shapes (F3-F5) and channels are outside this tile. A design aid, not a substitute for the engineer of record.",
  };
}
export const steelBeamLtbExample = { inputs: { fy: 50, zx: 101, sx: 88.9, ry: 1.65, rts: 1.98, j: 1.24, ho: 17.4, lb_ft: 10, cb: 1.0 } };

STEEL_RENDERERS["steel-beam-ltb"] = _simpleRenderer({
  citation: "Citation: AISC 360-22 Section F2 lateral-torsional buckling of a doubly-symmetric compact I-shape: Lp = 1.76 ry sqrt(E/Fy), Lr per Eq. F2-6, inelastic Mn = Cb[Mp - (Mp - 0.7 Fy Sx)(Lb-Lp)/(Lr-Lp)] <= Mp, elastic Fcr per Eq. F2-4 (E = 29,000 ksi, c = 1). ASD Omega_b = 1.67, LRFD phi_b = 0.90. Cb must match the moment diagram. A design aid, not a substitute for the engineer of record.",
  example: steelBeamLtbExample.inputs,
  fields: [
    { key: "fy", label: "Yield stress Fy (ksi)", kind: "number", default: 50 },
    { key: "zx", label: "Plastic section modulus Zx (in^3)", kind: "number" },
    { key: "sx", label: "Elastic section modulus Sx (in^3)", kind: "number" },
    { key: "ry", label: "Weak-axis radius of gyration ry (in)", kind: "number" },
    { key: "rts", label: "Effective radius for LTB rts (in)", kind: "number" },
    { key: "j", label: "Torsional constant J (in^4)", kind: "number" },
    { key: "ho", label: "Distance between flange centroids ho (in)", kind: "number" },
    { key: "lb_ft", label: "Unbraced length Lb (ft)", kind: "number" },
    { key: "cb", label: "LTB modification factor Cb", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "lims", id: "sbl-out-lims", label: "Lp / Lr", value: (r) => fmt(r.lp_ft, 2) + " ft / " + fmt(r.lr_ft, 2) + " ft" },
    { key: "zone", id: "sbl-out-zone", label: "Governing zone", value: (r) => r.zone },
    { key: "mn", id: "sbl-out-mn", label: "Nominal Mn (vs braced Mp)", value: (r) => fmt(r.mn_kipft, 1) + " kip-ft (Mp " + fmt(r.mp_kipft, 1) + ")" },
    { key: "ma", id: "sbl-out-ma", label: "ASD allowable Mn/Omega", value: (r) => fmt(r.ma_kipft, 1) + " kip-ft" },
    { key: "pm", id: "sbl-out-pm", label: "LRFD design phi_b*Mn", value: (r) => fmt(r.phi_mn, 1) + " kip-ft" },
    { key: "n", id: "sbl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSteelBeamLtb,
});

// dims: in { t_in: L, fy: M L^-1 T^-2, fu: M L^-1 T^-2, n: dimensionless, s_in: L, end_in: L, edge_in: L, dh_in: L, ubs: dimensionless } out: { agv: L^2, anv: L^2, ant: L^2, rn_kip: M L T^-2, asd_kip: M L T^-2, lrfd_kip: M L T^-2 }
export function computeSteelBlockShear({ t_in = 0, fy = 36, fu = 58, n = 0, s_in = 3, end_in = 0, edge_in = 0, dh_in = 0.875, ubs = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(t_in > 0)) return { error: "Element thickness must be positive (in)." };
  if (!(fy > 0) || !(fu > 0)) return { error: "Fy and Fu must be positive (ksi)." };
  if (!(n >= 1)) return { error: "The shear line needs at least one bolt." };
  if (!Number.isInteger(n)) return { error: "Bolt count must be a whole number." };
  if (n > 1 && !(s_in > 0)) return { error: "Bolt spacing must be positive (in)." };
  if (!(end_in > 0) || !(edge_in > 0)) return { error: "End and edge distances must be positive (in)." };
  if (!(dh_in > 0)) return { error: "Hole diameter must be positive (in)." };
  if (!(ubs === 1.0 || ubs === 0.5)) return { error: "Ubs is 1.0 (uniform tension) or 0.5 (nonuniform)." };
  const lgv = end_in + (n - 1) * s_in;
  const agv = lgv * t_in;
  const anv = (lgv - (n - 0.5) * dh_in) * t_in;
  const ant = (edge_in - 0.5 * dh_in) * t_in;
  if (!(anv > 0)) return { error: "The net shear path is fully consumed by the holes - lengthen the end distance or spacing." };
  if (!(ant > 0)) return { error: "The net tension path is fully consumed by the half hole - widen the tension edge distance." };
  const rupture = 0.6 * fu * anv + ubs * fu * ant;
  const cap = 0.6 * fy * agv + ubs * fu * ant;
  const rn_kip = Math.min(rupture, cap);
  const governs = cap < rupture ? "gross-shear-yield cap governs" : "net-rupture path governs";
  const asd_kip = rn_kip / 2.00;
  const lrfd_kip = 0.75 * rn_kip;
  return {
    lgv, agv, anv, ant, rupture, cap, rn_kip, governs, asd_kip, lrfd_kip,
    note: "AISC 360-22 J4.3 block shear: Rn = 0.6 Fu Anv + Ubs Fu Ant, capped by 0.6 Fy Agv + Ubs Fu Ant (Omega = 2.00, phi = 0.75); Ubs = 1.0 for uniform tension. Net areas deduct (n - 0.5) holes on the shear tear and a half hole on the tension plane, standard holes at bolt diameter + 1/8 in unless entered. One bolt row, one tension plane - chain multi-row or re-entrant coped-beam blocks by hand, and check bolt shear/bearing and the tension member separately. A design aid, not a substitute for the engineer of record.",
  };
}
export const steelBlockShearExample = { inputs: { t_in: 0.5, fy: 36, fu: 58, n: 3, s_in: 3, end_in: 1.5, edge_in: 1.5, dh_in: 0.875, ubs: 1.0 } };

STEEL_RENDERERS["steel-block-shear"] = _simpleRenderer({
  citation: "Citation: AISC 360-22 Section J4.3 block-shear rupture Rn = 0.6 Fu Anv + Ubs Fu Ant <= 0.6 Fy Agv + Ubs Fu Ant (Omega = 2.00 / phi = 0.75; Ubs = 1.0 uniform), with the (n - 0.5)-hole shear-path and half-hole tension-path deductions, by name. Single row, standard holes. Bolt shear/bearing is the separate bolt-shear-bearing tile. A design aid, not a substitute for the engineer of record.",
  example: steelBlockShearExample.inputs,
  fields: [
    { key: "t_in", label: "Element thickness (in)", kind: "number" },
    { key: "fy", label: "Yield stress Fy (ksi)", kind: "number", default: 36 },
    { key: "fu", label: "Tensile stress Fu (ksi)", kind: "number", default: 58 },
    { key: "n", label: "Bolts in the shear line", kind: "number", attrs: { step: "1", min: "1" } },
    { key: "s_in", label: "Bolt spacing / pitch (in)", kind: "number", default: 3 },
    { key: "end_in", label: "End distance (in)", kind: "number" },
    { key: "edge_in", label: "Tension edge distance (in)", kind: "number" },
    { key: "dh_in", label: "Hole diameter (in, bolt + 1/8)", kind: "number", default: 0.875 },
    { key: "ubs", label: "Ubs (1.0 uniform, 0.5 nonuniform)", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "areas", id: "sbs-out-areas", label: "Agv / Anv / Ant", value: (r) => fmt(r.agv, 3) + " / " + fmt(r.anv, 3) + " / " + fmt(r.ant, 3) + " in^2" },
    { key: "paths", id: "sbs-out-paths", label: "Rupture path vs yield cap", value: (r) => fmt(r.rupture, 1) + " / " + fmt(r.cap, 1) + " kip (" + r.governs + ")" },
    { key: "rn", id: "sbs-out-rn", label: "Nominal Rn", value: (r) => fmt(r.rn_kip, 1) + " kip" },
    { key: "asd", id: "sbs-out-asd", label: "ASD allowable Rn/Omega", value: (r) => fmt(r.asd_kip, 1) + " kip" },
    { key: "lrfd", id: "sbs-out-lrfd", label: "LRFD design phi*Rn", value: (r) => fmt(r.lrfd_kip, 1) + " kip" },
    { key: "n", id: "sbs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSteelBlockShear,
});

// dims: in { ag_in2: L^2, fy: M L^-1 T^-2, fu: M L^-1 T^-2, t_in: L, dh_in: L, nh: dimensionless, xbar_in: L, l_in: L, u_in: dimensionless } out: { an_in2: L^2, ae_in2: L^2, pn_yield_kip: M L T^-2, pn_rupt_kip: M L T^-2, p_asd_kip: M L T^-2, p_lrfd_kip: M L T^-2 }
export function computeSteelTensionMember({ ag_in2 = 0, fy = 36, fu = 58, t_in = 0, dh_in = 0.875, nh = 0, xbar_in = 0, l_in = 0, u_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(ag_in2 > 0)) return { error: "Gross area must be positive (in^2)." };
  if (!(fy > 0) || !(fu > 0)) return { error: "Fy and Fu must be positive (ksi)." };
  if (nh < 0 || !Number.isInteger(nh)) return { error: "Hole lines across the section must be a whole number (0 for a welded member)." };
  if (nh > 0 && !(t_in > 0)) return { error: "Thickness at the holes must be positive (in) when holes are deducted." };
  if (nh > 0 && !(dh_in > 0)) return { error: "Hole diameter must be positive (in) when holes are deducted." };
  if (xbar_in < 0 || l_in < 0 || u_in < 0) return { error: "Eccentricity, connection length, and U cannot be negative." };
  const an_in2 = ag_in2 - nh * dh_in * t_in;
  if (!(an_in2 > 0)) return { error: "The holes consume the whole section - the net area must be positive." };
  let u;
  if (u_in > 0) {
    u = Math.min(u_in, 1.0);
  } else if (xbar_in > 0) {
    if (!(l_in > 0)) return { error: "The shear-lag connection length must be positive (in) when an eccentricity is entered." };
    if (xbar_in >= l_in) return { error: "The connection eccentricity must be less than the connection length for U = 1 - xbar/L." };
    u = Math.min(1 - xbar_in / l_in, 1.0);
  } else {
    u = 1.0;
  }
  const ae_in2 = u * an_in2;
  const pn_yield_kip = fy * ag_in2;
  const pn_rupt_kip = fu * ae_in2;
  const asd_yield = pn_yield_kip / 1.67;
  const asd_rupt = pn_rupt_kip / 2.00;
  const p_asd_kip = Math.min(asd_yield, asd_rupt);
  const lrfd_yield = 0.90 * pn_yield_kip;
  const lrfd_rupt = 0.75 * pn_rupt_kip;
  const p_lrfd_kip = Math.min(lrfd_yield, lrfd_rupt);
  const governs = asd_rupt < asd_yield ? "net-section rupture governs (shear lag)" : "gross-section yielding governs";
  return {
    an_in2, u, ae_in2, pn_yield_kip, pn_rupt_kip, asd_yield, asd_rupt, p_asd_kip, p_lrfd_kip, governs,
    note: "AISC 360-22 Chapter D tension member: gross yielding Pn = Fy Ag (Omega = 1.67, phi = 0.90) against net rupture Pn = Fu Ae with Ae = U An (Omega = 2.00, phi = 0.75); An deducts nh holes at the entered diameter, and U = 1 - xbar/L (Table D3.1 Case 2) unless overridden. Single transverse hole line (no staggered s^2/4g chain); block shear and the bolts are the separate steel-block-shear and bolt-shear-bearing tiles; L/r slenderness is serviceability guidance. A design aid, not a substitute for the engineer of record.",
  };
}
export const steelTensionMemberExample = { inputs: { ag_in2: 3.75, fy: 36, fu: 58, t_in: 0.5, dh_in: 0.875, nh: 1, xbar_in: 1.18, l_in: 6, u_in: 0 } };

STEEL_RENDERERS["steel-tension-member"] = _simpleRenderer({
  citation: "Citation: AISC 360-22 D2 gross yielding Pn = Fy Ag (Omega = 1.67 / phi = 0.90) and D3 net rupture Pn = Fu Ae, Ae = U An, with U = 1 - xbar/L (Table D3.1 Case 2) and An = Ag - nh dh t, by name. Single hole line, entered or Case-2 U. Block shear and bolt checks are separate tiles. A design aid, not a substitute for the engineer of record.",
  example: steelTensionMemberExample.inputs,
  fields: [
    { key: "ag_in2", label: "Gross area Ag (in^2)", kind: "number" },
    { key: "fy", label: "Yield stress Fy (ksi)", kind: "number", default: 36 },
    { key: "fu", label: "Tensile stress Fu (ksi)", kind: "number", default: 58 },
    { key: "nh", label: "Hole lines across the section (0 if welded)", kind: "number", attrs: { step: "1", min: "0" } },
    { key: "t_in", label: "Thickness at the holes (in)", kind: "number" },
    { key: "dh_in", label: "Hole diameter (in, bolt + 1/8)", kind: "number", default: 0.875 },
    { key: "xbar_in", label: "Connection eccentricity xbar (in, 0 => U = 1)", kind: "number", default: 0 },
    { key: "l_in", label: "Connection length L (in)", kind: "number", default: 0 },
    { key: "u_in", label: "Shear-lag U override (blank = compute)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "areas", id: "stm-out-areas", label: "An / U / Ae", value: (r) => fmt(r.an_in2, 3) + " in^2 / " + fmt(r.u, 3) + " / " + fmt(r.ae_in2, 3) + " in^2" },
    { key: "yield", id: "stm-out-yield", label: "Gross yielding (ASD)", value: (r) => fmt(r.pn_yield_kip, 1) + " kip nominal, " + fmt(r.asd_yield, 1) + " kip allowable" },
    { key: "rupt", id: "stm-out-rupt", label: "Net rupture (ASD)", value: (r) => fmt(r.pn_rupt_kip, 1) + " kip nominal, " + fmt(r.asd_rupt, 1) + " kip allowable" },
    { key: "gov", id: "stm-out-gov", label: "Governing capacity", value: (r) => fmt(r.p_asd_kip, 1) + " kip ASD / " + fmt(r.p_lrfd_kip, 1) + " kip LRFD (" + r.governs + ")" },
    { key: "n", id: "stm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSteelTensionMember,
});

// ===================== spec-v293..v295: steel connection/detailing depth batch =====================
// The checks the member tiles never touch: the beam web under a concentrated
// force (J10 yielding + crippling), the slip-critical pretensioned bolt
// (J3.8), and the fillet-weld detailing size limits (J2.2b / Table J2.4).

// dims: in { fy: M L^-1 T^-2, tw: L, tf: L, k_in: L, d_in: L, lb_in: L, location: dimensionless } out: { wly_rn: M L T^-2, wc_rn: M L T^-2, asd_kip: M L T^-2, lrfd_kip: M L T^-2 }
export function computeSteelWebLocalStrength({ fy = 50, tw = 0, tf = 0, k_in = 0, d_in = 0, lb_in = 0, location = "interior" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fy > 0)) return { error: "Yield stress Fy must be positive (ksi)." };
  for (const [nm, v] of [["web thickness", tw], ["flange thickness", tf], ["k distance", k_in], ["depth", d_in], ["bearing length", lb_in]]) {
    if (!(v > 0)) return { error: "The " + nm + " must be positive (in)." };
  }
  const interior = location !== "end";
  const wly_rn = interior ? fy * tw * (5 * k_in + lb_in) : fy * tw * (2.5 * k_in + lb_in);
  const wc_rn = 0.80 * tw * tw * (1 + 3 * (lb_in / d_in) * Math.pow(tw / tf, 1.5)) * Math.sqrt((_E_STEEL * fy * tf) / tw);
  const wly_asd = wly_rn / 1.50, wly_lrfd = 1.00 * wly_rn;
  const wc_asd = wc_rn / 2.00, wc_lrfd = 0.75 * wc_rn;
  const asd_kip = Math.min(wly_asd, wc_asd);
  const lrfd_kip = Math.min(wly_lrfd, wc_lrfd);
  const asd_governs = wc_asd < wly_asd ? "web crippling governs (ASD)" : "web local yielding governs (ASD)";
  return {
    wly_rn, wc_rn, wly_asd, wc_asd, asd_kip, lrfd_kip, asd_governs,
    note: "AISC 360-22 J10 concentrated-force web checks: J10.2 web local yielding Rn = Fy tw (5k + lb) at an interior location, (2.5k + lb) at an end (phi = 1.00 / Omega = 1.50), and J10.3 web crippling Rn = 0.80 tw^2 [1 + 3(lb/d)(tw/tf)^1.5] sqrt(E Fy tf/tw) (phi = 0.75 / Omega = 2.00, E = 29,000 ksi, k = kdes). Because the safety factors differ, the governing limit state can flip between ASD and LRFD. The near-end crippling reduction for lb/d > 0.2, web sidesway/compression buckling (J10.4/J10.5), and the bearing-stiffener design are separate. A design aid, not a substitute for the engineer of record.",
  };
}
export const steelWebLocalStrengthExample = { inputs: { fy: 50, tw: 0.355, tf: 0.570, k_in: 1.25, d_in: 18.0, lb_in: 4, location: "interior" } };

STEEL_RENDERERS["steel-web-local-strength"] = _simpleRenderer({
  citation: "Citation: AISC 360-22 J10.2 web local yielding Rn = Fy tw (5k + lb) interior / (2.5k + lb) end (phi 1.00 / Omega 1.50) and J10.3 web crippling Rn = 0.80 tw^2 [1 + 3(lb/d)(tw/tf)^1.5] sqrt(E Fy tf/tw) (phi 0.75 / Omega 2.00), E = 29,000 ksi, by name. Stiffener design and sidesway buckling are separate. A design aid, not a substitute for the engineer of record.",
  example: steelWebLocalStrengthExample.inputs,
  fields: [
    { key: "fy", label: "Yield stress Fy (ksi)", kind: "number", default: 50 },
    { key: "tw", label: "Web thickness tw (in)", kind: "number" },
    { key: "tf", label: "Flange thickness tf (in)", kind: "number" },
    { key: "k_in", label: "k distance kdes (in)", kind: "number" },
    { key: "d_in", label: "Member depth d (in)", kind: "number" },
    { key: "lb_in", label: "Bearing length lb (in)", kind: "number" },
    { key: "location", label: "Force location", kind: "select", options: [
      { value: "interior", label: "Interior (5k + lb)" },
      { value: "end", label: "Near the member end (2.5k + lb)" },
    ], default: "interior" },
  ],
  outputs: [
    { key: "wly", id: "swls-out-wly", label: "Web local yielding Rn (ASD)", value: (r) => fmt(r.wly_rn, 1) + " kip (" + fmt(r.wly_asd, 1) + " kip)" },
    { key: "wc", id: "swls-out-wc", label: "Web crippling Rn (ASD)", value: (r) => fmt(r.wc_rn, 1) + " kip (" + fmt(r.wc_asd, 1) + " kip)" },
    { key: "asd", id: "swls-out-asd", label: "Governing ASD capacity", value: (r) => fmt(r.asd_kip, 1) + " kip (" + r.asd_governs + ")" },
    { key: "lrfd", id: "swls-out-lrfd", label: "Governing LRFD capacity", value: (r) => fmt(r.lrfd_kip, 1) + " kip" },
    { key: "n", id: "swls-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSteelWebLocalStrength,
});

// dims: in { mu: dimensionless, tb_kip: M L T^-2, ns: dimensionless, n: dimensionless, hf: dimensionless, du: dimensionless } out: { rn_bolt_kip: M L T^-2, asd_bolt_kip: M L T^-2, lrfd_bolt_kip: M L T^-2, asd_total_kip: M L T^-2, lrfd_total_kip: M L T^-2 }
export function computeSteelBoltSlipCritical({ mu = 0.30, tb_kip = 0, ns = 1, n = 1, hf = 1.0, du = 1.13 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(mu > 0 && mu <= 1)) return { error: "The slip coefficient mu is over 0 and up to 1 (0.30 Class A, 0.50 Class B)." };
  if (!(tb_kip > 0)) return { error: "The minimum pretension Tb must be positive (kip)." };
  if (!(ns >= 1) || !Number.isInteger(ns)) return { error: "Slip planes must be a whole number of at least 1." };
  if (!(n >= 1) || !Number.isInteger(n)) return { error: "The bolt count must be a whole number of at least 1." };
  if (!(hf > 0 && hf <= 1)) return { error: "The filler factor hf is over 0 and up to 1.0." };
  if (!(du > 0)) return { error: "The Du multiplier must be positive (1.13 standard)." };
  const rn_bolt_kip = mu * du * hf * tb_kip * ns;
  const asd_bolt_kip = rn_bolt_kip / 1.50;
  const lrfd_bolt_kip = 1.00 * rn_bolt_kip;
  const asd_total_kip = n * asd_bolt_kip;
  const lrfd_total_kip = n * lrfd_bolt_kip;
  return {
    rn_bolt_kip, asd_bolt_kip, lrfd_bolt_kip, asd_total_kip, lrfd_total_kip,
    note: "AISC 360-22 J3.8 slip resistance of a pretensioned high-strength bolt: Rn = mu Du hf Tb ns, with mu = 0.30 (Class A unpainted mill scale) / 0.50 (Class B blast-cleaned), Du = 1.13, hf = 1.0 with no fillers or fillers developed, Tb from Table J3.1, and phi = 1.00 / Omega = 1.50 for STANDARD holes (oversized and slotted holes reduce phi / raise Omega). The strength-level bolt shear and bearing (bolt-shear-bearing) must ALSO be satisfied; the tension-slip interaction (J3.9) and the pretensioning method (turn-of-nut, DTI) are separate. A design aid, not a substitute for the engineer of record.",
  };
}
export const steelBoltSlipCriticalExample = { inputs: { mu: 0.30, tb_kip: 28, ns: 1, n: 1, hf: 1.0, du: 1.13 } };

STEEL_RENDERERS["steel-bolt-slip-critical"] = _simpleRenderer({
  citation: "Citation: AISC 360-22 J3.8 slip-critical resistance Rn = mu Du hf Tb ns (mu 0.30 Class A / 0.50 Class B, Du = 1.13, Tb per Table J3.1), phi = 1.00 / Omega = 1.50 standard holes, by name. Bolt shear/bearing must also be checked. A design aid, not a substitute for the engineer of record.",
  example: steelBoltSlipCriticalExample.inputs,
  fields: [
    { key: "mu", label: "Slip coefficient mu (0.30 A / 0.50 B)", kind: "number", default: 0.30 },
    { key: "tb_kip", label: "Minimum pretension Tb (kip, Table J3.1)", kind: "number" },
    { key: "ns", label: "Slip planes ns (1 single, 2 double)", kind: "number", attrs: { step: "1", min: "1" }, default: 1 },
    { key: "n", label: "Number of bolts", kind: "number", attrs: { step: "1", min: "1" }, default: 1 },
    { key: "hf", label: "Filler factor hf", kind: "number", default: 1.0 },
    { key: "du", label: "Du multiplier", kind: "number", default: 1.13 },
  ],
  outputs: [
    { key: "rb", id: "sbsc-out-rb", label: "Slip resistance per bolt", value: (r) => fmt(r.rn_bolt_kip, 2) + " kip (ASD " + fmt(r.asd_bolt_kip, 2) + " / LRFD " + fmt(r.lrfd_bolt_kip, 2) + ")" },
    { key: "ta", id: "sbsc-out-ta", label: "Connection total (ASD)", value: (r) => fmt(r.asd_total_kip, 1) + " kip" },
    { key: "tl", id: "sbsc-out-tl", label: "Connection total (LRFD)", value: (r) => fmt(r.lrfd_total_kip, 1) + " kip" },
    { key: "n", id: "sbsc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSteelBoltSlipCritical,
});

// dims: in { t1_in: L, t2_in: L, w_in: L } out: { t_thin: L, min_leg_in: L, max_leg_in: L, te_in: L, min_len_in: L }
export function computeSteelFilletWeldSize({ t1_in = 0, t2_in = 0, w_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(t1_in > 0) || !(t2_in > 0)) return { error: "Both part thicknesses must be positive (in)." };
  if (w_in < 0) return { error: "The chosen weld leg cannot be negative (enter 0 to skip it)." };
  const t_thin = Math.min(t1_in, t2_in);
  const min_leg_in = t_thin <= 0.25 ? 0.125 : (t_thin <= 0.5 ? 0.1875 : (t_thin <= 0.75 ? 0.25 : 0.3125));
  const max_leg_in = t_thin < 0.25 ? t_thin : t_thin - 0.0625;
  let te_in = null, min_len_in = null, window_flag = "enter a chosen leg to check it against the window";
  if (w_in > 0) {
    te_in = 0.707 * w_in;
    min_len_in = 4 * w_in;
    window_flag = w_in >= min_leg_in && w_in <= max_leg_in
      ? "the chosen leg complies with the Table J2.4 / J2.2b window"
      : (w_in < min_leg_in ? "the chosen leg is BELOW the Table J2.4 minimum" : "the chosen leg EXCEEDS the J2.2b along-an-edge maximum");
  }
  return {
    t_thin, min_leg_in, max_leg_in, te_in, min_len_in, window_flag,
    note: "AISC 360-22 fillet-weld detailing: Table J2.4 minimum leg by the THINNER part joined (1/8 in up to 1/4; 3/16 over 1/4 to 1/2; 1/4 over 1/2 to 3/4; 5/16 over 3/4), the J2.2b maximum along an edge (the full thickness under 1/4 in, thickness minus 1/16 in at or over 1/4 in), the equal-leg effective throat te = 0.707 w, and the 4w minimum load-carrying length. Detailing geometry only - the strength is the fillet-weld-strength tile; equal-leg fillets along the thinner part's edge (an interior fillet away from an edge is not edge-limited); skewed tees and PJP grooves are separate. A fabrication aid; the AWS D1.1 WPS and the engineer of record govern.",
  };
}
export const steelFilletWeldSizeExample = { inputs: { t1_in: 0.5, t2_in: 0.375, w_in: 0.25 } };

STEEL_RENDERERS["steel-fillet-weld-size"] = _simpleRenderer({
  citation: "Citation: AISC 360-22 Table J2.4 minimum fillet leg by thinner-part thickness, the J2.2b along-an-edge maximum (t under 1/4 in; t - 1/16 at or over), te = 0.707 w, and the 4w minimum length, by name. Detailing limits, not strength (fillet-weld-strength). A fabrication aid; the AWS D1.1 WPS and the engineer of record govern.",
  example: steelFilletWeldSizeExample.inputs,
  fields: [
    { key: "t1_in", label: "Part 1 thickness (in)", kind: "number" },
    { key: "t2_in", label: "Part 2 thickness (in)", kind: "number" },
    { key: "w_in", label: "Chosen weld leg w (in, 0 to skip)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "win", id: "sfws-out-win", label: "Permitted leg window (min to max)", value: (r) => fmt(r.min_leg_in, 4) + " to " + fmt(r.max_leg_in, 4) + " in (thinner part " + fmt(r.t_thin, 3) + " in)" },
    { key: "chk", id: "sfws-out-chk", label: "Chosen-leg check", value: (r) => r.window_flag },
    { key: "te", id: "sfws-out-te", label: "Effective throat te = 0.707 w", value: (r) => (r.te_in === null ? "-" : fmt(r.te_in, 3) + " in") },
    { key: "len", id: "sfws-out-len", label: "Minimum length 4w", value: (r) => (r.min_len_in === null ? "-" : fmt(r.min_len_in, 2) + " in") },
    { key: "n", id: "sfws-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSteelFilletWeldSize,
});

// ===================== spec-v314..v316: steel beam-column-and-connection depth batch =====================
// The interaction checks the single-action steel tiles never make: combined
// axial plus flexure (H1.1), the column effective-length factor K from the
// alignment-chart G factors, and the bolt under combined tension and shear
// (J3.7).

// dims: in { pr_kip: M L T^-2, pc_kip: M L T^-2, mrx_kft: M L^2 T^-2, mcx_kft: M L^2 T^-2, mry_kft: M L^2 T^-2, mcy_kft: M L^2 T^-2 } out: { ratio: dimensionless, interaction: dimensionless }
export function computeSteelH1Interaction({ pr_kip = 0, pc_kip = 0, mrx_kft = 0, mcx_kft = 0, mry_kft = 0, mcy_kft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pr_kip >= 0)) return { error: "Required axial strength cannot be negative (kip)." };
  if (!(pc_kip > 0)) return { error: "Available axial strength must be positive (kip)." };
  if (mrx_kft < 0 || mry_kft < 0) return { error: "Required moments cannot be negative (kip-ft)." };
  if (!(mcx_kft > 0)) return { error: "Available strong-axis moment must be positive (kip-ft)." };
  if (mry_kft > 0 && !(mcy_kft > 0)) return { error: "Enter the available weak-axis moment when a weak-axis moment is present." };
  const ratio = pr_kip / pc_kip;
  const moment_term = mrx_kft / mcx_kft + (mry_kft > 0 ? mry_kft / mcy_kft : 0);
  const interaction = ratio >= 0.2 ? ratio + (8 / 9) * moment_term : ratio / 2 + moment_term;
  const branch = ratio >= 0.2 ? "high-axial branch (Pr/Pc >= 0.2): Pr/Pc + (8/9)(sum Mr/Mc)" : "low-axial branch (Pr/Pc < 0.2): Pr/(2Pc) + (sum Mr/Mc)";
  const pass = interaction <= 1.0;
  return {
    ratio, interaction, branch, pass,
    note: "AISC 360-22 H1.1 combined axial force and flexure: for Pr/Pc >= 0.2, Pr/Pc + (8/9)(Mrx/Mcx + Mry/Mcy) <= 1.0; for Pr/Pc < 0.2, Pr/(2Pc) + (Mrx/Mcx + Mry/Mcy) <= 1.0, consistent for ASD (available = nominal/Omega) or LRFD (available = phi x nominal). This evaluates the interaction from the required and available strengths supplied - it takes Pc and Mc as already computed (from steel-column-capacity and steel-beam-ltb in the same ASD or LRFD basis), assumes the second-order (P-delta/P-Delta) amplification is already in Mr (Chapter C / Appendix 8), and does not cover the H1.3 out-of-plane or H2 unsymmetric-member cases. A design aid, not a substitute for the engineer of record.",
  };
}
export const steelH1InteractionExample = { inputs: { pr_kip: 100, pc_kip: 400, mrx_kft: 80, mcx_kft: 200, mry_kft: 0, mcy_kft: 0 } };

STEEL_RENDERERS["steel-h1-interaction"] = _simpleRenderer({
  citation: "Citation: AISC 360-22 H1.1 combined axial and flexure interaction - Pr/Pc + (8/9)(Mrx/Mcx + Mry/Mcy) for Pr/Pc >= 0.2, Pr/(2Pc) + (sum Mr/Mc) below - consistent for ASD or LRFD, by name. Pc/Mc from the member tiles; second-order Mr assumed. A design aid, not a substitute for the engineer of record.",
  example: steelH1InteractionExample.inputs,
  fields: [
    { key: "pr_kip", label: "Required axial Pr (kip, 2nd-order)", kind: "number" },
    { key: "pc_kip", label: "Available axial Pc (kip)", kind: "number" },
    { key: "mrx_kft", label: "Required strong-axis moment Mrx (kip-ft)", kind: "number" },
    { key: "mcx_kft", label: "Available strong-axis moment Mcx (kip-ft)", kind: "number" },
    { key: "mry_kft", label: "Required weak-axis moment Mry (kip-ft, 0 if none)", kind: "number", default: 0 },
    { key: "mcy_kft", label: "Available weak-axis moment Mcy (kip-ft)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "ratio", id: "sh1-out-ratio", label: "Axial ratio Pr/Pc", value: (r) => fmt(r.ratio, 3) },
    { key: "br", id: "sh1-out-br", label: "Governing branch", value: (r) => r.branch },
    { key: "ix", id: "sh1-out-ix", label: "Interaction (<= 1.0 passes)", value: (r) => fmt(r.interaction, 3) + (r.pass ? " (OK)" : " (OVER)") },
    { key: "n", id: "sh1-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSteelH1Interaction,
});

// dims: in { ga: dimensionless, gb: dimensionless, frame: dimensionless } out: { k_factor: dimensionless }
export function computeSteelEffectiveLengthK({ ga = 0, gb = 0, frame = "sway" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(ga > 0)) return { error: "The stiffness ratio GA must be positive (10 pinned, 1 fixed)." };
  if (!(gb > 0)) return { error: "The stiffness ratio GB must be positive (10 pinned, 1 fixed)." };
  if (frame !== "sway" && frame !== "braced") return { error: "Frame must be sway or braced." };
  let k_factor;
  if (frame === "sway") {
    k_factor = Math.sqrt((1.6 * ga * gb + 4 * (ga + gb) + 7.5) / (ga + gb + 7.5));
  } else {
    k_factor = (3 * ga * gb + 1.4 * (ga + gb) + 0.64) / (3 * ga * gb + 2 * (ga + gb) + 1.28);
  }
  return {
    k_factor,
    note: "AISC alignment-chart effective-length factor K from the joint stiffness ratios G = sum(EI/L)_columns / sum(EI/L)_beams, via the Dumonteil closed-form fits: sway K = sqrt((1.6 GA GB + 4(GA + GB) + 7.5)/(GA + GB + 7.5)), braced K = (3 GA GB + 1.4(GA + GB) + 0.64)/(3 GA GB + 2(GA + GB) + 1.28). A sway frame nearly doubles the effective length of the same column versus braced, so bracing is the cheapest way to shorten a column. Within ~2% of the nomograph, with the chart's idealizing assumptions (elastic, all columns buckling simultaneously, equal L/r); enter G (or 10 pinned / 1 fixed) - it does not compute G from member sizes or apply the inelastic tau_b stiffness reduction. A design aid, not a substitute for the engineer of record.",
  };
}
export const steelEffectiveLengthKExample = { inputs: { ga: 1.0, gb: 2.0, frame: "sway" } };

STEEL_RENDERERS["steel-effective-length-k"] = _simpleRenderer({
  citation: "Citation: AISC alignment-chart effective-length factor K from the joint stiffness ratios G, via the Dumonteil sway K = sqrt((1.6 GA GB + 4(GA+GB) + 7.5)/(GA+GB+7.5)) and braced fits, by name. Enter G (10 pinned / 1 fixed); no tau_b. A design aid, not a substitute for the engineer of record.",
  example: steelEffectiveLengthKExample.inputs,
  fields: [
    { key: "ga", label: "Stiffness ratio GA (10 pinned, 1 fixed)", kind: "number" },
    { key: "gb", label: "Stiffness ratio GB", kind: "number" },
    { key: "frame", label: "Frame type", kind: "select", options: [
      { value: "sway", label: "Sway (moment) frame" },
      { value: "braced", label: "Braced (non-sway) frame" },
    ], default: "sway" },
  ],
  outputs: [
    { key: "k", id: "selk-out-k", label: "Effective-length factor K", value: (r) => fmt(r.k_factor, 3) },
    { key: "n", id: "selk-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSteelEffectiveLengthK,
});

// dims: in { fnt_ksi: M L^-1 T^-2, fnv_ksi: M L^-1 T^-2, ab_in2: L^2, frv_ksi: M L^-1 T^-2, method: dimensionless } out: { fpnt_ksi: M L^-1 T^-2, avail_tension_kip: M L T^-2 }
export function computeSteelBoltTensionShear({ fnt_ksi = 90, fnv_ksi = 54, ab_in2 = 0, frv_ksi = 0, method = "LRFD" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fnt_ksi > 0) || !(fnv_ksi > 0)) return { error: "Fnt and Fnv must be positive (ksi)." };
  if (!(ab_in2 > 0)) return { error: "Bolt area Ab must be positive (in^2)." };
  if (frv_ksi < 0) return { error: "Required shear stress cannot be negative (ksi)." };
  if (method !== "LRFD" && method !== "ASD") return { error: "Method must be LRFD or ASD." };
  const k = method === "LRFD" ? fnt_ksi / (0.75 * fnv_ksi) : (2.00 * fnt_ksi) / fnv_ksi;
  const fpnt_ksi = Math.max(Math.min(1.3 * fnt_ksi - k * frv_ksi, fnt_ksi), 0);
  const avail_tension_kip = method === "LRFD" ? 0.75 * fpnt_ksi * ab_in2 : (fpnt_ksi * ab_in2) / 2.00;
  const pure_tension_kip = method === "LRFD" ? 0.75 * fnt_ksi * ab_in2 : (fnt_ksi * ab_in2) / 2.00;
  return {
    fpnt_ksi, avail_tension_kip, pure_tension_kip, method,
    note: "AISC 360-22 J3.7 reduced tensile stress for a bearing-type bolt in combined tension and shear: F'nt = 1.3 Fnt - (Fnt/(phi Fnv)) frv <= Fnt (LRFD, phi = 0.75), or 1.3 Fnt - (Omega Fnt/Fnv) frv <= Fnt (ASD, Omega = 2.00), with the required shear stress frv = required shear / Ab and the available tension = phi F'nt Ab (LRFD) or F'nt Ab / Omega (ASD). Table J3.2 values: A325/F1852 Fnt = 90, Fnv = 54 (threads-N) or 68 (threads-X) ksi. F'nt is capped at Fnt (no 1.3 benefit when shear is absent) and floored at zero. Bearing-type interaction only (a slip-critical joint reduces the slip resistance instead, J3.9); the bolt shear/bearing and connected-element limit states are separate. A design aid, not a substitute for the engineer of record.",
  };
}
export const steelBoltTensionShearExample = { inputs: { fnt_ksi: 90, fnv_ksi: 54, ab_in2: 0.442, frv_ksi: 20, method: "LRFD" } };

STEEL_RENDERERS["steel-bolt-tension-shear"] = _simpleRenderer({
  citation: "Citation: AISC 360-22 J3.7 combined tension and shear F'nt = 1.3 Fnt - (Fnt/(phi Fnv)) frv <= Fnt (LRFD) / 1.3 Fnt - (Omega Fnt/Fnv) frv <= Fnt (ASD), available tension phi F'nt Ab, Table J3.2 Fnt/Fnv, by name. Bearing-type; slip-critical is J3.9. A design aid, not a substitute for the engineer of record.",
  example: steelBoltTensionShearExample.inputs,
  fields: [
    { key: "fnt_ksi", label: "Nominal tensile stress Fnt (ksi, 90 A325)", kind: "number", default: 90 },
    { key: "fnv_ksi", label: "Nominal shear stress Fnv (ksi, 54 N / 68 X)", kind: "number", default: 54 },
    { key: "ab_in2", label: "Nominal bolt area Ab (in^2)", kind: "number" },
    { key: "frv_ksi", label: "Required shear stress frv (ksi = V/Ab)", kind: "number" },
    { key: "method", label: "Method", kind: "select", options: [
      { value: "LRFD", label: "LRFD (phi = 0.75)" },
      { value: "ASD", label: "ASD (Omega = 2.00)" },
    ], default: "LRFD" },
  ],
  outputs: [
    { key: "fpnt", id: "sbts-out-fpnt", label: "Reduced tensile stress F'nt", value: (r) => fmt(r.fpnt_ksi, 1) + " ksi" },
    { key: "at", id: "sbts-out-at", label: "Available tension (vs pure)", value: (r) => fmt(r.avail_tension_kip, 1) + " kip (pure " + fmt(r.pure_tension_kip, 1) + ")" },
    { key: "n", id: "sbts-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSteelBoltTensionShear,
});

// ===================== spec-v411..v413: steel composite-beam trio (Group E) =====================

// dims: in { asc_in2: L^2, fc_psi: M L^-1 T^-2, ec_psi: M L^-1 T^-2, fu_ksi: M L^-1 T^-2, rg: dimensionless, rp: dimensionless, vprime_kip: M L T^-2 } out: { qn_calc_kip: M L T^-2, qn_cap_kip: M L T^-2, qn_kip: M L T^-2, studs_each_side: dimensionless }
export function computeShearStudStrength({ asc_in2 = 0, fc_psi = 4000, ec_psi = 0, fu_ksi = 65, rg = 1.0, rp = 0.75, vprime_kip = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const asc = Number(asc_in2) || 0;
  const fc = Number(fc_psi) || 0;
  const ec = Number(ec_psi) || 0;
  const fu = Number(fu_ksi) || 0;
  const Rg = Number(rg) || 0;
  const Rp = Number(rp) || 0;
  const vprime = Number(vprime_kip) || 0;
  if (!(asc > 0)) return { error: "Stud area Asc must be positive (in^2)." };
  if (!(fc > 0)) return { error: "Concrete strength f'c must be positive (psi)." };
  if (!(ec > 0)) return { error: "Concrete modulus Ec must be positive (psi)." };
  if (!(fu > 0)) return { error: "Stud tensile strength Fu must be positive (ksi)." };
  if (!(Rg > 0)) return { error: "Group factor Rg must be positive." };
  if (!(Rp > 0)) return { error: "Position factor Rp must be positive." };
  const qn_calc_kip = 0.5 * asc * Math.sqrt(fc * ec) / 1000;
  const qn_cap_kip = Rg * Rp * asc * fu;
  const qn_kip = Math.min(qn_calc_kip, qn_cap_kip);
  const cap_governs = qn_cap_kip <= qn_calc_kip;
  const studs_each_side = vprime > 0 ? Math.ceil(vprime / qn_kip) : null;
  return {
    qn_calc_kip, qn_cap_kip, qn_kip, cap_governs, studs_each_side,
    note: "AISC 360-22 §I8.2a nominal strength of one steel headed stud anchor: Qn = 0.5 Asc sqrt(f'c Ec) but not more than Rg Rp Asc Fu, where Rg is the group factor and Rp the position factor from Table I8.1 (deck orientation, number of studs per rib, weak vs strong position). The upper bound (Rg Rp Asc Fu) usually governs. The number of studs each side of the maximum-moment point = the horizontal shear V' for full composite action / Qn, rounded up. A design aid; the engineer of record's stamped design governs.",
  };
}
export const shearStudStrengthExample = { inputs: { asc_in2: 0.442, fc_psi: 4000, ec_psi: 3644000, fu_ksi: 65, rg: 1.0, rp: 0.75, vprime_kip: 400 } };
STEEL_RENDERERS["shear-stud-strength"] = _simpleRenderer({
  citation: "Citation: AISC 360-22 §I8.2a: nominal shear-stud strength Qn = 0.5 Asc sqrt(f'c Ec) <= Rg Rp Asc Fu, with Rg (group) and Rp (position) from Table I8.1; the number of studs each side = V' / Qn rounded up. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: shearStudStrengthExample.inputs,
  fields: [
    { key: "asc_in2", label: "Stud area Asc (in^2)", kind: "number", default: 0.442 },
    { key: "fc_psi", label: "Slab f'c (psi)", kind: "number", default: 4000 },
    { key: "ec_psi", label: "Concrete modulus Ec (psi)", kind: "number", default: 3644000 },
    { key: "fu_ksi", label: "Stud tensile Fu (ksi)", kind: "number", default: 65 },
    { key: "rg", label: "Group factor Rg (Table I8.1)", kind: "number", default: 1.0 },
    { key: "rp", label: "Position factor Rp (Table I8.1)", kind: "number", default: 0.75 },
    { key: "vprime_kip", label: "Horizontal shear V' (kip, 0 = strength only)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "qn", id: "sss-out-qn", label: "Stud strength Qn", value: (r) => fmt(r.qn_kip, 1) + " kip (" + (r.cap_governs ? "Rg Rp Asc Fu cap governs" : "0.5 Asc sqrt(f'c Ec) governs") + ")" },
    { key: "calc", id: "sss-out-calc", label: "Calc vs cap", value: (r) => fmt(r.qn_calc_kip, 1) + " / " + fmt(r.qn_cap_kip, 1) + " kip" },
    { key: "n", id: "sss-out-n", label: "Studs each side", value: (r) => r.studs_each_side == null ? "(enter V' for the count)" : r.studs_each_side + " studs" },
    { key: "note", id: "sss-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeShearStudStrength,
});

// dims: in { as_in2: L^2, fy_ksi: M L^-1 T^-2, d_in: L, tslab_in: L, be_in: L, fc_ksi: M L^-1 T^-2 } out: { c_kip: M L T^-2, a_in: L, mn_kipft: M L^2 T^-2, phi_mn_kipft: M L^2 T^-2 }
export function computeCompositeBeamFlexure({ as_in2 = 0, fy_ksi = 50, d_in = 0, tslab_in = 0, be_in = 0, fc_ksi = 4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const as = Number(as_in2) || 0;
  const fy = Number(fy_ksi) || 0;
  const d = Number(d_in) || 0;
  const tslab = Number(tslab_in) || 0;
  const be = Number(be_in) || 0;
  const fc = Number(fc_ksi) || 0;
  if (!(as > 0)) return { error: "Steel area As must be positive (in^2)." };
  if (!(fy > 0)) return { error: "Steel yield Fy must be positive (ksi)." };
  if (!(d > 0)) return { error: "Section depth d must be positive (in)." };
  if (!(tslab > 0)) return { error: "Slab thickness must be positive (in)." };
  if (!(be > 0)) return { error: "Effective slab width be must be positive (in)." };
  if (!(fc > 0)) return { error: "Slab f'c must be positive (ksi)." };
  const c_kip = as * fy;
  const a_in = c_kip / (0.85 * fc * be);
  const pna_in_slab = a_in <= tslab;
  if (!pna_in_slab) {
    return {
      c_kip, a_in, pna_in_slab, mn_kipft: null, phi_mn_kipft: null,
      note: "The plastic neutral axis falls in the steel section (a = " + a_in.toFixed(2) + " in > slab " + tslab.toFixed(2) + " in): the full steel yield force exceeds the slab's concrete compression capacity, so this simplified full-composite equation does not apply. Widen the effective slab, thicken the slab, or use the general AISC 360-22 I3 method with the PNA in the steel. A design aid; the engineer of record's stamped design governs.",
    };
  }
  const mn_kipin = c_kip * (d / 2 + tslab - a_in / 2);
  const mn_kipft = mn_kipin / 12;
  const phi_mn_kipft = 0.90 * mn_kipft;
  return {
    c_kip, a_in, pna_in_slab, mn_kipft, phi_mn_kipft,
    note: "AISC 360-22 §I3.2a composite beam flexural strength with the plastic neutral axis in the slab: the steel yields fully in tension (C = As Fy), balanced by a concrete compression block of depth a = C / (0.85 f'c be); the nominal moment Mn = C x (d/2 + tslab - a/2) taken about the steel centroid, and phi Mn = 0.90 Mn. Valid only while a <= slab thickness (full composite, PNA in slab); a deeper block flags the PNA in steel and defers to the general method. Assumes full composite action (enough shear studs). A design aid; the engineer of record's stamped design governs.",
  };
}
export const compositeBeamFlexureExample = { inputs: { as_in2: 8.0, fy_ksi: 50, d_in: 16, tslab_in: 4, be_in: 90, fc_ksi: 4 } };
STEEL_RENDERERS["composite-beam-flexure"] = _simpleRenderer({
  citation: "Citation: AISC 360-22 §I3.2a: composite beam flexural strength with the PNA in the slab -- C = As Fy, a = C/(0.85 f'c be), Mn = C(d/2 + tslab - a/2), phi Mn = 0.90 Mn, valid while a <= slab thickness (full composite). Beyond that the PNA is in the steel and the general method applies. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: compositeBeamFlexureExample.inputs,
  fields: [
    { key: "as_in2", label: "Steel area As (in^2)", kind: "number", default: 8.0 },
    { key: "fy_ksi", label: "Steel yield Fy (ksi)", kind: "number", default: 50 },
    { key: "d_in", label: "Steel depth d (in)", kind: "number", default: 16 },
    { key: "tslab_in", label: "Slab thickness (in)", kind: "number", default: 4 },
    { key: "be_in", label: "Effective slab width be (in)", kind: "number", default: 90 },
    { key: "fc_ksi", label: "Slab f'c (ksi)", kind: "number", default: 4 },
  ],
  outputs: [
    { key: "a", id: "cbf-out-a", label: "Compression block depth a", value: (r) => fmt(r.a_in, 2) + " in (C = " + fmt(r.c_kip, 0) + " kip)" },
    { key: "pm", id: "cbf-out-pm", label: "Design moment phi Mn", value: (r) => r.phi_mn_kipft == null ? "PNA in steel -- general method needed" : fmt(r.phi_mn_kipft, 0) + " kip-ft (Mn " + fmt(r.mn_kipft, 0) + ")" },
    { key: "n", id: "cbf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCompositeBeamFlexure,
});

// dims: in { w_kip_ft: M T^-2, span_ft: L, moi_in4: L^4, e_ksi: M L^-1 T^-2, fraction: dimensionless } out: { defl_in: L, camber_in: L }
export function computeSteelCamber({ w_kip_ft = 0, span_ft = 0, moi_in4 = 0, e_ksi = 29000, fraction = 0.80 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(w_kip_ft) || 0;
  const span = Number(span_ft) || 0;
  const moi = Number(moi_in4) || 0;
  const e = Number(e_ksi) || 0;
  const frac = Number(fraction) || 0;
  if (!(w > 0)) return { error: "Dead load must be positive (kip/ft)." };
  if (!(span > 0)) return { error: "Span must be positive (ft)." };
  if (!(moi > 0)) return { error: "Moment of inertia must be positive (in^4)." };
  if (!(e > 0)) return { error: "Modulus must be positive (ksi)." };
  if (!(frac > 0 && frac <= 1)) return { error: "Camber fraction must be between 0 and 1." };
  const L = span * 12;
  const defl_in = 5 * (w / 12) * Math.pow(L, 4) / (384 * e * moi);
  const camber_raw = frac * defl_in;
  const camber_in = Math.round(camber_raw / 0.25) * 0.25;
  const cambered = camber_in >= 0.75;
  return {
    defl_in, camber_raw, camber_in, cambered,
    note: "Steel beam camber from the dead-load deflection: the simple-span midspan deflection delta = 5 w L^4 / (384 E I) under the deflection-causing (dead) load, cambered at a fraction (commonly 75-80%) of it, rounded to the nearest 1/4 in. Fabricators do not camber below about 3/4 in (the mill tolerance and cost are not worth it), so a stiff or short beam is left flat. Camber removes the dead-load sag so the floor is level after the concrete cures; the live-load deflection is not cambered out. A detailing aid; the structural drawings govern the specified camber.",
  };
}
export const steelCamberExample = { inputs: { w_kip_ft: 1.0, span_ft: 40, moi_in4: 2100, e_ksi: 29000, fraction: 0.80 } };
STEEL_RENDERERS["steel-camber"] = _simpleRenderer({
  citation: "Citation: Steel beam camber from the dead-load deflection: delta = 5 w L^4 / (384 E I), camber = a fraction (commonly 75-80%) of delta rounded to the nearest 1/4 in; fabricators leave a beam flat below about 3/4 in (AISC / fabrication practice). A detailing aid; the structural drawings govern the specified camber.",
  example: steelCamberExample.inputs,
  fields: [
    { key: "w_kip_ft", label: "Uniform dead load (kip/ft)", kind: "number", default: 1.0 },
    { key: "span_ft", label: "Simple span (ft)", kind: "number", default: 40 },
    { key: "moi_in4", label: "Moment of inertia I (in^4)", kind: "number", default: 2100 },
    { key: "e_ksi", label: "Modulus E (ksi)", kind: "number", default: 29000 },
    { key: "fraction", label: "Camber fraction of DL deflection", kind: "number", default: 0.80 },
  ],
  outputs: [
    { key: "d", id: "scm-out-d", label: "Dead-load deflection", value: (r) => fmt(r.defl_in, 2) + " in" },
    { key: "c", id: "scm-out-c", label: "Specified camber", value: (r) => r.cambered ? fmt(r.camber_in, 2) + " in" : "leave flat (below ~3/4 in practical minimum)" },
    { key: "n", id: "scm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSteelCamber,
});

// ===================== spec-v547: steel floor walking vibration (AISC DG11) =====================

// dims: in { natural_freq_hz: T^-1, effective_wt_lb: M L T^-2, damping_ratio: dimensionless, walker_force_lb: M L T^-2, limit_ratio: dimensionless } out: { ap_over_g: dimensionless, limit_ratio: dimensionless }
export function computeSteelFloorVibration({ natural_freq_hz = 0, effective_wt_lb = 0, damping_ratio = 0.03, walker_force_lb = 65, limit_ratio = 0.005 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const fn = Number(natural_freq_hz) || 0;
  const W = Number(effective_wt_lb) || 0;
  const beta = Number(damping_ratio) || 0;
  const P0 = Number(walker_force_lb) || 0;
  const limit = Number(limit_ratio) || 0;
  if (!(fn > 0)) return { error: "Natural frequency must be positive (Hz)." };
  if (!(W > 0)) return { error: "Effective panel weight must be positive (lb)." };
  if (!(P0 > 0)) return { error: "Walker force P0 must be positive (lb)." };
  if (!(beta > 0 && beta < 1)) return { error: "Damping ratio must be between 0 and 1 (0.02-0.05 typical)." };
  if (!(limit > 0)) return { error: "Occupancy limit must be positive (e.g. 0.005 office)." };
  const ap_over_g = P0 * Math.exp(-0.35 * fn) / (beta * W);
  const pass = ap_over_g <= limit;
  return {
    ap_over_g, limit_ratio: limit, pass,
    note: "Stiffer is not automatically better: the e^(-0.35 fn) term makes low-frequency floors (about 4-8 Hz) resonate with the walking harmonic, so a floor tuned into that band accelerates more, not less. Damping (beta) and the effective panel weight (W) matter as much as the frequency. The natural frequency comes from the combined beam-plus-girder deflection. A full DG11 evaluation and the engineer of record govern.",
  };
}

export const steelFloorVibrationExample = { inputs: { natural_freq_hz: 5, effective_wt_lb: 30000, damping_ratio: 0.03, walker_force_lb: 65, limit_ratio: 0.005 } };

STEEL_RENDERERS["steel-floor-vibration"] = _simpleRenderer({
  citation: "Citation: AISC Design Guide 11 (2nd ed.) walking-vibration serviceability check: ap/g = P0 x e^(-0.35 fn) / (beta W), pass when ap/g <= ao/g. Common values: P0 ~ 65 lb (office), occupancy limit 0.5% g (office/residence), 1.5% g (mall). Stiffer is not automatically better - the exponential term makes low-frequency floors (~4-8 Hz) resonate with the walking harmonic. A serviceability screen; a full DG11 evaluation and the engineer of record govern.",
  example: steelFloorVibrationExample.inputs,
  fields: [
    { key: "natural_freq_hz", label: "Floor natural frequency fn (Hz)", kind: "number" },
    { key: "effective_wt_lb", label: "Effective panel weight W (lb)", kind: "number" },
    { key: "damping_ratio", label: "Damping ratio beta", kind: "number", default: 0.03 },
    { key: "walker_force_lb", label: "Walker force P0 (lb)", kind: "number", default: 65 },
    { key: "limit_ratio", label: "Occupancy limit ao/g", kind: "number", default: 0.005 },
  ],
  outputs: [
    { key: "a", id: "sfv-out-a", label: "Peak acceleration ap/g", value: (r) => fmt(r.ap_over_g * 100, 2) + "% g" },
    { key: "p", id: "sfv-out-p", label: "Walking-vibration check", value: (r) => (r.pass ? "PASS" : "FAIL") + " (limit " + fmt(r.limit_ratio * 100, 2) + "% g)" },
    { key: "n", id: "sfv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSteelFloorVibration,
});
