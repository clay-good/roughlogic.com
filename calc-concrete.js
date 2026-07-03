// Group E (cont.): ACI 318-19 reinforced-concrete member bench.
// spec-v257..v259 establish this new lazy-loaded renderer module -- the
// reinforced-concrete member companion to the steel-member bench
// (calc-steel.js, spec-v254..v256) one material over. The catalog already
// placed and cured the concrete (concrete, concrete-mix-design,
// concrete-evaporation-rate, concrete-strength-gain) and counted the rebar
// (rebar, rebar-schedule, rebar-lap-splice), but nothing checked the
// reinforced-concrete member itself: does the beam carry the moment, does it
// carry the shear, and does the bar develop its force. Every tile keeps
// group: "E" (a tile's group letter is independent of the module that holds
// it -- the spec-v70..v98 split precedent). Tiles:
//   v257 rc-beam-flexure        (ACI 318-19 §22.2, singly-reinforced, tension-controlled)
//   v258 rc-beam-shear          (ACI 318-19 §22.5, Vc + Vs and stirrup spacing)
//   v259 rc-development-length  (ACI 318-19 §25.4.2, straight-bar tension ld)
// All GOVERNANCE.general design aids; the psi factors and material strengths
// are user-supplied from the drawings and ACI 318-19 tables. See
// spec-v257.md..v259.md.

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

// Compact renderer factory (same shape as the calc-steel / calc-firesprinkler
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

export const CONCRETE_RENDERERS = {};

// ===================== spec-v257: reinforced concrete beam flexural capacity =====================

// dims: in { fc: M L^-1 T^-2, fy: M L^-1 T^-2, as_in2: L^2, b: L, d: L, mu: M L^2 T^-2 } out: { a_in: L, mn_kipft: M L^2 T^-2, phi_mn: M L^2 T^-2, util: dimensionless }
export function computeRcBeamFlexure({ fc = 4000, fy = 60000, as_in2 = 0, b = 0, d = 0, mu = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fc > 0)) return { error: "Concrete strength f'c must be positive (psi)." };
  if (!(fy > 0)) return { error: "Steel yield fy must be positive (psi)." };
  if (!(as_in2 > 0)) return { error: "Tension steel area As must be positive (in^2)." };
  if (!(b > 0)) return { error: "Beam width b must be positive (in)." };
  if (!(d > 0)) return { error: "Effective depth d must be positive (in)." };
  const a_in = (as_in2 * fy) / (0.85 * fc * b);
  const mn_kipin = as_in2 * fy * (d - a_in / 2) / 1000;
  const mn_kipft = mn_kipin / 12;
  const phi_mn = 0.90 * mn_kipft;
  const util = mu > 0 ? mu / phi_mn : null;
  return { a_in, mn_kipft, phi_mn, util };
}

export const rcBeamFlexureExample = { inputs: { fc: 4000, fy: 60000, as_in2: 3.00, b: 12, d: 21.5, mu: 200 } };

CONCRETE_RENDERERS["rc-beam-flexure"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 §22.2.2.4.1 (equivalent rectangular stress block, a = As x fy / (0.85 x f'c x b)), §22.2 (Mn = As x fy x (d - a/2)), and §21.2.2 (phi = 0.90 for a tension-controlled section). Covers only a singly-reinforced rectangular section assumed tension-controlled -- confirm the net tensile strain epsilon_t is at least 0.005 (§21.2.2); compression reinforcement, T-beam flange action, minimum steel (§9.6.1.2), and shear are not checked here (see the RC beam shear tile). Take As and d from the reinforcement schedule for the actual section. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: rcBeamFlexureExample.inputs,
  fields: [
    { key: "fc", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "fy", label: "Steel yield fy (psi)", kind: "number", default: 60000 },
    { key: "as_in2", label: "Tension steel area As (in^2)", kind: "number" },
    { key: "b", label: "Beam width b (in)", kind: "number" },
    { key: "d", label: "Effective depth d (in)", kind: "number" },
    { key: "mu", label: "Required moment Mu (kip-ft, 0 = capacity only)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "a", id: "rbf-out-a", label: "Stress-block depth a", value: (r) => fmt(r.a_in, 2) + " in" },
    { key: "mn", id: "rbf-out-mn", label: "Nominal moment Mn", value: (r) => fmt(r.mn_kipft, 1) + " kip-ft" },
    { key: "pm", id: "rbf-out-pm", label: "Design moment phi Mn (phi = 0.90)", value: (r) => fmt(r.phi_mn, 1) + " kip-ft" },
    { key: "ut", id: "rbf-out-ut", label: "Demand / capacity", value: (r) => r.util === null ? "- (no Mu entered)" : fmt(r.util, 2) + (r.util <= 1 ? " (OK)" : " (OVER)") },
  ],
  compute: computeRcBeamFlexure,
});

// ===================== spec-v258: reinforced concrete beam shear and stirrup spacing =====================

// dims: in { fc: M L^-1 T^-2, fyt: M L^-1 T^-2, bw: L, d: L, av_in2: L^2, vu: M L T^-2, lambda: dimensionless } out: { vc_kip: M L T^-2, phi_vc: M L T^-2, vs_req_kip: M L T^-2, s_req_in: L, s_max_in: L }
export function computeRcBeamShear({ fc = 4000, fyt = 60000, bw = 0, d = 0, av_in2 = 0, vu = 0, lambda = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fc > 0)) return { error: "Concrete strength f'c must be positive (psi)." };
  if (!(fyt > 0)) return { error: "Stirrup yield fyt must be positive (psi)." };
  if (!(bw > 0)) return { error: "Web width bw must be positive (in)." };
  if (!(d > 0)) return { error: "Effective depth d must be positive (in)." };
  if (!(av_in2 > 0)) return { error: "Stirrup area Av must be positive (in^2)." };
  if (!(lambda > 0)) return { error: "Lightweight factor lambda must be positive." };
  const vc_kip = 2 * lambda * Math.sqrt(fc) * bw * d / 1000;
  const phi_vc = 0.75 * vc_kip;
  const vs_req_kip = vu > 0 ? Math.max(0, vu / 0.75 - vc_kip) : 0;
  const s_req_in = vs_req_kip > 0 ? av_in2 * fyt * d / (vs_req_kip * 1000) : null;
  const s_max_in = d / 2;
  const stirrups = vu > phi_vc;
  return { vc_kip, phi_vc, vs_req_kip, s_req_in, s_max_in, stirrups };
}

export const rcBeamShearExample = { inputs: { fc: 4000, fyt: 60000, bw: 12, d: 21.5, av_in2: 0.22, vu: 40, lambda: 1.0 } };

CONCRETE_RENDERERS["rc-beam-shear"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 §22.5.5.1 (Vc = 2 x lambda x sqrt(f'c) x bw x d, the simplified concrete shear for a non-prestressed member without axial load, psi units), §22.5.10.5.3 (Vs = Av x fyt x d / s for vertical stirrups), §21.2.1 (phi = 0.75 for shear), and §9.7.6.2.2 (the d/2 maximum stirrup spacing, halved to d/4 when Vs exceeds 4 x sqrt(f'c) x bw x d). Uses the simplified Vc, not the detailed §22.5.5.1 expression with the reinforcement-ratio and size-effect terms; covers vertical stirrups on a member without significant axial load; does not check the §22.5.1.2 upper limit Vs <= 8 x sqrt(f'c) x bw x d on the section size, the §9.6.3 minimum shear reinforcement, or deep-beam action. Lambda is 1.0 normalweight, 0.75 lightweight (§19.2.4). A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: rcBeamShearExample.inputs,
  fields: [
    { key: "fc", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "fyt", label: "Stirrup yield fyt (psi)", kind: "number", default: 60000 },
    { key: "bw", label: "Web width bw (in)", kind: "number" },
    { key: "d", label: "Effective depth d (in)", kind: "number" },
    { key: "av_in2", label: "Stirrup area Av, both legs (in^2)", kind: "number" },
    { key: "vu", label: "Factored shear Vu (kip, 0 = capacity only)", kind: "number", default: 0 },
    { key: "lambda", label: "Lightweight factor lambda (1.0 normalweight)", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "vc", id: "rbs-out-vc", label: "Concrete shear Vc", value: (r) => fmt(r.vc_kip, 1) + " kip" },
    { key: "pv", id: "rbs-out-pv", label: "Design concrete shear phi Vc (phi = 0.75)", value: (r) => fmt(r.phi_vc, 1) + " kip" },
    { key: "st", id: "rbs-out-st", label: "Stirrups required by strength", value: (r) => r.stirrups ? "YES (Vu > phi Vc)" : "no (concrete carries Vu; minimums still apply)" },
    { key: "vs", id: "rbs-out-vs", label: "Stirrup shear demand Vs,req", value: (r) => fmt(r.vs_req_kip, 1) + " kip" },
    { key: "sr", id: "rbs-out-sr", label: "Required stirrup spacing", value: (r) => r.s_req_in === null ? "- (none required by strength)" : fmt(r.s_req_in, 1) + " in" },
    { key: "sm", id: "rbs-out-sm", label: "Code max spacing d/2", value: (r) => fmt(r.s_max_in, 2) + " in (d/4 if Vs is high)" },
  ],
  compute: computeRcBeamShear,
});

// ===================== spec-v259: rebar tension development length =====================

// dims: in { fc: M L^-1 T^-2, fy: M L^-1 T^-2, db: L, psi_t: dimensionless, psi_e: dimensionless, psi_s: dimensionless, psi_g: dimensionless, lambda: dimensionless, conf: dimensionless } out: { te: dimensionless, conf_eff: dimensionless, ld_in: L, ld_db: dimensionless }
export function computeRcDevelopmentLength({ fc = 4000, fy = 60000, db = 0, psi_t = 1.0, psi_e = 1.0, psi_s = 1.0, psi_g = 1.0, lambda = 1.0, conf = 2.5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fc > 0)) return { error: "Concrete strength f'c must be positive (psi)." };
  if (!(fy > 0)) return { error: "Bar yield fy must be positive (psi)." };
  if (!(db > 0)) return { error: "Bar diameter db must be positive (in)." };
  if (!(conf > 0)) return { error: "Confinement term (cb + Ktr)/db must be positive." };
  if (!(psi_t > 0) || !(psi_e > 0) || !(psi_s > 0) || !(psi_g > 0)) return { error: "The psi factors must be positive." };
  if (!(lambda > 0)) return { error: "Lightweight factor lambda must be positive." };
  const te = Math.min(psi_t * psi_e, 1.7);
  const conf_eff = Math.min(conf, 2.5);
  const ld_calc = (3 / 40) * fy * te * psi_s * psi_g / (lambda * Math.sqrt(fc) * conf_eff) * db;
  const ld_in = Math.max(ld_calc, 12);
  const ld_db = ld_in / db;
  return { te, conf_eff, ld_in, ld_db };
}

export const rcDevelopmentLengthExample = { inputs: { fc: 4000, fy: 60000, db: 1.00, psi_t: 1.0, psi_e: 1.0, psi_s: 1.0, psi_g: 1.0, lambda: 1.0, conf: 2.5 } };

CONCRETE_RENDERERS["rc-development-length"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 §25.4.2.3 (the general tension development-length equation ld = (3/40) x (fy x psi_t x psi_e x psi_s x psi_g) / (lambda x sqrt(f'c) x ((cb + Ktr)/db)) x db), §25.4.2.4 (the (cb + Ktr)/db confinement term, capped at 2.5), §25.4.2.5 / Table 25.4.2.5 (psi_t casting position 1.3 top bar / 1.0 other, psi_e coating 1.5 or 1.2 epoxy / 1.0 uncoated, psi_s size 0.8 for #6 and smaller / 1.0 for #7 and larger, psi_g grade 1.0 Gr 60 / 1.15 Gr 80 / 1.3 Gr 100, with psi_t x psi_e capped at 1.7), and §25.4.2.1 (the 12 in minimum). The psi factors are user-selected inputs, not derived here -- the tool does not read cover, spacing, or transverse reinforcement to compute cb or Ktr. Straight-bar tension development only: not a standard hook (§25.4.3), a compression bar (§25.4.9), or a lap splice (§25.5, see the rebar lap splice tile). Lambda is 1.0 normalweight, 0.75 lightweight. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's detailing governs.",
  example: rcDevelopmentLengthExample.inputs,
  fields: [
    { key: "fc", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "fy", label: "Bar yield fy (psi)", kind: "number", default: 60000 },
    { key: "db", label: "Bar diameter db (in, #8 = 1.00)", kind: "number" },
    { key: "psi_t", label: "Casting position psi_t (1.3 top bar, 1.0 other)", kind: "number", default: 1.0 },
    { key: "psi_e", label: "Coating psi_e (1.5 / 1.2 epoxy, 1.0 uncoated)", kind: "number", default: 1.0 },
    { key: "psi_s", label: "Bar size psi_s (0.8 for #6 and smaller, else 1.0)", kind: "number", default: 1.0 },
    { key: "psi_g", label: "Grade psi_g (1.0 Gr 60, 1.15 Gr 80, 1.3 Gr 100)", kind: "number", default: 1.0 },
    { key: "lambda", label: "Lightweight factor lambda (1.0 normalweight)", kind: "number", default: 1.0 },
    { key: "conf", label: "Confinement (cb + Ktr)/db (max 2.5)", kind: "number", default: 2.5 },
  ],
  outputs: [
    { key: "te", id: "rdl-out-te", label: "psi_t x psi_e (capped 1.7)", value: (r) => fmt(r.te, 2) },
    { key: "ce", id: "rdl-out-ce", label: "Confinement term used (capped 2.5)", value: (r) => fmt(r.conf_eff, 2) },
    { key: "ld", id: "rdl-out-ld", label: "Development length ld (12 in floor)", value: (r) => fmt(r.ld_in, 1) + " in" },
    { key: "db", id: "rdl-out-db", label: "In bar diameters", value: (r) => fmt(r.ld_db, 1) + " db" },
  ],
  compute: computeRcDevelopmentLength,
});

// ===================== spec-v284..v286: reinforced-concrete member depth batch =====================
// The ACI checks the beam flexure/shear/development bench left open: the tied
// column's concentric axial capacity (22.4), two-way punching shear at a
// column (22.6), and the standard-hook development length (25.4.3).

// dims: in { b_in: L, h_in: L, fc_psi: M L^-1 T^-2, fy_psi: M L^-1 T^-2, ast_in2: L^2 } out: { ag_in2: L^2, rho_g: dimensionless, po_kip: M L T^-2, phi_pn_kip: M L T^-2 }
export function computeRcColumnAxial({ b_in = 0, h_in = 0, fc_psi = 4000, fy_psi = 60000, ast_in2 = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(b_in > 0) || !(h_in > 0)) return { error: "Column dimensions must be positive (in)." };
  if (!(fc_psi > 0) || !(fy_psi > 0)) return { error: "Concrete and steel strengths must be positive (psi)." };
  if (!(ast_in2 > 0)) return { error: "Longitudinal steel area must be positive (in^2)." };
  const ag_in2 = b_in * h_in;
  if (!(ast_in2 < ag_in2)) return { error: "The steel area must be less than the gross section." };
  const rho_g = ast_in2 / ag_in2;
  const rho_flag = rho_g < 0.01 ? "below the ACI 10.6.1 1% minimum" : (rho_g > 0.08 ? "above the ACI 10.6.1 8% maximum" : "within the ACI 10.6.1 1-8% range");
  const po_lb = 0.85 * fc_psi * (ag_in2 - ast_in2) + fy_psi * ast_in2;
  const phi_pn_lb = 0.80 * 0.65 * po_lb;
  const po_kip = po_lb / 1000;
  const phi_pn_kip = phi_pn_lb / 1000;
  return {
    ag_in2, rho_g, rho_flag, po_kip, phi_pn_kip,
    note: "ACI 318-19 22.4.2: nominal axial strength Po = 0.85 f'c (Ag - Ast) + fy Ast, with the 22.4.2.1 tied-column design cap phi Pn,max = 0.80 phi Po (phi = 0.65, compression-controlled tied) covering the accidental eccentricity a concentric load never truly avoids. Longitudinal steel belongs in the 10.6.1 1-8% ratio band. Concentric short tied column only - no P-M interaction diagram, no slenderness or second-order effects, and the spiral (0.85 / phi = 0.75) variant and tie detailing are separate. A design aid, not a substitute for the structural engineer of record's stamped design.",
  };
}
export const rcColumnAxialExample = { inputs: { b_in: 16, h_in: 16, fc_psi: 4000, fy_psi: 60000, ast_in2: 6.32 } };

CONCRETE_RENDERERS["rc-column-axial"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 22.4.2 nominal axial strength Po = 0.85 f'c (Ag - Ast) + fy Ast with the 22.4.2.1 tied-column cap phi Pn,max = 0.80 phi Po (phi = 0.65) and the 10.6.1 1-8% longitudinal ratio, by name. Concentric short tied column; no P-M interaction or slenderness. A design aid, not a substitute for the engineer of record.",
  example: rcColumnAxialExample.inputs,
  fields: [
    { key: "b_in", label: "Column width b (in)", kind: "number" },
    { key: "h_in", label: "Column depth h (in)", kind: "number" },
    { key: "fc_psi", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "fy_psi", label: "Steel yield fy (psi)", kind: "number", default: 60000 },
    { key: "ast_in2", label: "Total longitudinal steel Ast (in^2)", kind: "number" },
  ],
  outputs: [
    { key: "ag", id: "rca-out-ag", label: "Gross area Ag", value: (r) => fmt(r.ag_in2, 0) + " in^2" },
    { key: "rho", id: "rca-out-rho", label: "Steel ratio rho_g", value: (r) => fmt(r.rho_g * 100, 2) + "% (" + r.rho_flag + ")" },
    { key: "po", id: "rca-out-po", label: "Nominal Po", value: (r) => fmt(r.po_kip, 0) + " kip" },
    { key: "pn", id: "rca-out-pn", label: "Design phi Pn,max (0.80 x 0.65 x Po)", value: (r) => fmt(r.phi_pn_kip, 0) + " kip" },
    { key: "n", id: "rca-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRcColumnAxial,
});

// dims: in { c1_in: L, c2_in: L, d_in: L, fc_psi: M L^-1 T^-2, position: dimensionless, lambda: dimensionless } out: { bo_in: L, beta: dimensionless, vc_psi: M L^-1 T^-2, phi_vc_kip: M L T^-2 }
export function computeRcPunchingShear({ c1_in = 0, c2_in = 0, d_in = 0, fc_psi = 4000, position = "interior", lambda = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(c1_in > 0) || !(c2_in > 0)) return { error: "Column plan dimensions must be positive (in)." };
  if (!(d_in > 0)) return { error: "Effective slab depth must be positive (in)." };
  if (!(fc_psi > 0)) return { error: "Concrete strength must be positive (psi)." };
  if (!(lambda > 0 && lambda <= 1)) return { error: "The lightweight factor lambda is over 0 and up to 1.0." };
  const alpha_s = position === "edge" ? 30 : (position === "corner" ? 20 : 40);
  const bo_in = 2 * (c1_in + d_in) + 2 * (c2_in + d_in);
  const beta = Math.max(c1_in, c2_in) / Math.min(c1_in, c2_in);
  const t1 = 4;
  const t2 = 2 + 4 / beta;
  const t3 = 2 + (alpha_s * d_in) / bo_in;
  const least = Math.min(t1, t2, t3);
  const governs = least === t1 ? "the 4 sqrt(f'c) base term" : (least === t2 ? "the aspect-ratio (2 + 4/beta) term" : "the (2 + alpha_s d/bo) large-column term");
  const vc_psi = least * lambda * Math.sqrt(fc_psi);
  const phi_vc_kip = (0.75 * vc_psi * bo_in * d_in) / 1000;
  return {
    bo_in, beta, alpha_s, t2, t3, least, governs, vc_psi, phi_vc_kip,
    note: "ACI 318-19 Table 22.6.5.2 two-way (punching) shear on the d/2 critical perimeter: vc is the least of 4 lambda sqrt(f'c), (2 + 4/beta) lambda sqrt(f'c), and (2 + alpha_s d/bo) lambda sqrt(f'c), with alpha_s = 40/30/20 for an interior/edge/corner column and phi = 0.75; phi Vc = phi vc bo d. Shear without unbalanced-moment transfer (no gamma_v amplification), no shear reinforcement or drop panel, rectangular column with the full d/2 perimeter available. A design aid, not a substitute for the structural engineer of record's stamped design.",
  };
}
export const rcPunchingShearExample = { inputs: { c1_in: 20, c2_in: 20, d_in: 6, fc_psi: 4000, position: "interior", lambda: 1.0 } };

CONCRETE_RENDERERS["rc-punching-shear"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 Table 22.6.5.2 two-way shear (least of 4, 2 + 4/beta, 2 + alpha_s d/bo, each x lambda sqrt(f'c)) on the 22.6.4.1 d/2 critical perimeter, alpha_s = 40/30/20 interior/edge/corner, phi = 0.75, by name. No unbalanced-moment transfer or shear reinforcement. A design aid, not a substitute for the engineer of record.",
  example: rcPunchingShearExample.inputs,
  fields: [
    { key: "c1_in", label: "Column dimension c1 (in)", kind: "number" },
    { key: "c2_in", label: "Column dimension c2 (in)", kind: "number" },
    { key: "d_in", label: "Effective slab depth d (in)", kind: "number" },
    { key: "fc_psi", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "position", label: "Column position (alpha_s)", kind: "select", options: [
      { value: "interior", label: "Interior (alpha_s = 40)" },
      { value: "edge", label: "Edge (alpha_s = 30)" },
      { value: "corner", label: "Corner (alpha_s = 20)" },
    ], default: "interior" },
    { key: "lambda", label: "Lightweight factor lambda", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "bo", id: "rps-out-bo", label: "Critical perimeter bo (at d/2)", value: (r) => fmt(r.bo_in, 0) + " in" },
    { key: "gov", id: "rps-out-gov", label: "Governing term", value: (r) => r.governs },
    { key: "vc", id: "rps-out-vc", label: "Concrete shear stress vc", value: (r) => fmt(r.vc_psi, 0) + " psi" },
    { key: "pvc", id: "rps-out-pvc", label: "Design capacity phi Vc", value: (r) => fmt(r.phi_vc_kip, 1) + " kip" },
    { key: "n", id: "rps-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRcPunchingShear,
});

// dims: in { db_in: L, fy_psi: M L^-1 T^-2, fc_psi: M L^-1 T^-2, psi_e: dimensionless, psi_r: dimensionless, psi_o: dimensionless, lambda: dimensionless } out: { psi_c: dimensionless, ldh_eq_in: L, ldh_in: L }
export function computeRcHookDevelopment({ db_in = 0, fy_psi = 60000, fc_psi = 4000, psi_e = 1.0, psi_r = 1.0, psi_o = 1.0, lambda = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(db_in > 0)) return { error: "Bar diameter must be positive (in)." };
  if (!(fy_psi > 0) || !(fc_psi > 0)) return { error: "Steel and concrete strengths must be positive (psi)." };
  if (!(psi_e > 0) || !(psi_r > 0) || !(psi_o > 0)) return { error: "Modification factors must be positive (1.0 is the base)." };
  if (!(lambda > 0 && lambda <= 1)) return { error: "The lightweight factor lambda is over 0 and up to 1.0." };
  const psi_c = fc_psi < 6000 ? fc_psi / 15000 + 0.6 : 1.0;
  const ldh_eq_in = (fy_psi * psi_e * psi_r * psi_o * psi_c / (55 * lambda * Math.sqrt(fc_psi))) * Math.pow(db_in, 1.5);
  const floor_in = Math.max(8 * db_in, 6);
  const ldh_in = Math.max(ldh_eq_in, floor_in);
  const floor_governs = floor_in >= ldh_eq_in;
  return {
    psi_c, ldh_eq_in, floor_in, floor_governs, ldh_in,
    note: "ACI 318-19 Eq. 25.4.3.1a standard-hook tension development: ldh = (fy psi_e psi_r psi_o psi_c / (55 lambda sqrt(f'c))) db^1.5, not less than max(8 db, 6 in), with the 25.4.3.2 factors (psi_e 1.0 uncoated / 1.2-1.3 coated; psi_r confinement; psi_o location/cover; psi_c = f'c/15,000 + 0.6 below 6,000 psi, 1.0 at or above). The db^1.5 scaling is why a hook multiple-of-db rule of thumb misleads. Standard 90/180 degree hooks on deformed bars only - headed bars (25.4.4), compression development, and the bend-diameter/geometry detailing are separate. A design aid, not a substitute for the structural engineer of record's stamped detailing.",
  };
}
export const rcHookDevelopmentExample = { inputs: { db_in: 1.0, fy_psi: 60000, fc_psi: 4000, psi_e: 1.0, psi_r: 1.0, psi_o: 1.0, lambda: 1.0 } };

CONCRETE_RENDERERS["rc-hook-development"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 Eq. 25.4.3.1a hooked-bar development ldh = (fy psi_e psi_r psi_o psi_c / (55 lambda sqrt(f'c))) db^1.5 with the 25.4.3.2 modification factors (psi_c = f'c/15,000 + 0.6 under 6,000 psi) and the max(8 db, 6 in) floor, by name. Standard 90/180 hooks; headed bars are separate. A design aid, not a substitute for the engineer of record.",
  example: rcHookDevelopmentExample.inputs,
  fields: [
    { key: "db_in", label: "Bar diameter db (in; #8 = 1.0)", kind: "number" },
    { key: "fy_psi", label: "Steel yield fy (psi)", kind: "number", default: 60000 },
    { key: "fc_psi", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "psi_e", label: "Epoxy factor psi_e", kind: "number", default: 1.0 },
    { key: "psi_r", label: "Confinement factor psi_r", kind: "number", default: 1.0 },
    { key: "psi_o", label: "Location/cover factor psi_o", kind: "number", default: 1.0 },
    { key: "lambda", label: "Lightweight factor lambda", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "pc", id: "rhd-out-pc", label: "Strength factor psi_c", value: (r) => fmt(r.psi_c, 3) },
    { key: "eq", id: "rhd-out-eq", label: "Equation ldh (before floor)", value: (r) => fmt(r.ldh_eq_in, 1) + " in" },
    { key: "ldh", id: "rhd-out-ldh", label: "Hook development ldh", value: (r) => fmt(r.ldh_in, 1) + " in" + (r.floor_governs ? " (the max(8db, 6 in) floor governs)" : "") },
    { key: "n", id: "rhd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRcHookDevelopment,
});
