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

// rc-column-steel-for-load: inverse of rc-column-axial. The forward tile gives the design axial strength from the steel
// area; the inverse recovers the longitudinal steel a target factored axial load needs for a given column size. From
// phi Pn = 0.80 x 0.65 x [0.85 f'c (Ag - Ast) + fy Ast] = 0.52 x Po,
// Ast = (phi Pn / 0.52 - 0.85 f'c Ag) / (fy - 0.85 f'c). The 1% minimum governs the minimum and 8% the maximum (ACI 10.6.1).
// dims: in { target_load_kip: M L T^-2, b_in: L, h_in: L, fc_psi: M L^-1 T^-2, fy_psi: M L^-1 T^-2 } out: { ast_required_in2: L^2, ag_in2: L^2, rho_g: dimensionless }
export function computeRcColumnSteelForLoad({ target_load_kip = 0, b_in = 0, h_in = 0, fc_psi = 4000, fy_psi = 60000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const target = Number(target_load_kip) || 0;
  const b = Number(b_in) || 0;
  const h = Number(h_in) || 0;
  const fc = Number(fc_psi) || 0;
  const fy = Number(fy_psi) || 0;
  if (!(target > 0)) return { error: "Target factored axial load must be positive (kip)." };
  if (!(b > 0) || !(h > 0)) return { error: "Column dimensions must be positive (in)." };
  if (!(fc > 0) || !(fy > 0)) return { error: "Concrete and steel strengths must be positive (psi)." };
  if (!(fy > 0.85 * fc)) return { error: "Steel yield must exceed 0.85 f'c." };
  const ag_in2 = b * h;
  const ast_strength = (target * 1000 / 0.52 - 0.85 * fc * ag_in2) / (fy - 0.85 * fc);
  const ast_min = 0.01 * ag_in2;
  const ast_max = 0.08 * ag_in2;
  const ast_required_in2 = Math.max(ast_strength, ast_min);
  const rho_g = ast_required_in2 / ag_in2;
  const governs = ast_strength <= ast_min ? "the ACI 10.6.1 1% minimum" : "strength";
  const over_max = ast_required_in2 > ast_max;
  if (![ast_required_in2, ag_in2, rho_g].every(Number.isFinite)) return { error: "Column-steel math is not a finite value." };
  return {
    ast_required_in2, ag_in2, rho_g, ast_min_in2: ast_min, ast_max_in2: ast_max, governs, over_max,
    note: "ACI 318-19 22.4.2 concentric tied column solved for the steel: Ast = (phi Pn / 0.52 - 0.85 f'c Ag) / (fy - 0.85 f'c), with phi Pn = 0.80 x 0.65 x Po the tied-column design cap. The reported Ast is the LARGER of the strength requirement and the ACI 10.6.1 1% minimum (Ast_min = 0.01 Ag); if the strength requirement exceeds the 8% maximum (0.08 Ag), the section is too small for the load - enlarge the column or raise f'c. Round UP to a whole-bar layout that also satisfies the tie and clear-cover detailing. Concentric short tied column only - no P-M interaction, slenderness, or second-order effects, and a spiral column uses different phi factors. A design aid, not a substitute for the structural engineer of record's stamped design.",
  };
}
export const rcColumnSteelForLoadExample = { inputs: { target_load_kip: 639, b_in: 16, h_in: 16, fc_psi: 4000, fy_psi: 60000 } };
CONCRETE_RENDERERS["rc-column-steel-for-load"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 22.4.2 concentric tied column phi Pn = 0.80 x 0.65 x [0.85 f'c (Ag - Ast) + fy Ast] solved for the steel: Ast = (phi Pn / 0.52 - 0.85 f'c Ag) / (fy - 0.85 f'c), with the 10.6.1 1-8% band. Concentric short tied column; no P-M interaction or slenderness. A design aid, not a substitute for the engineer of record.",
  example: rcColumnSteelForLoadExample.inputs,
  fields: [
    { key: "target_load_kip", label: "Target factored axial load phi Pn (kip)", kind: "number" },
    { key: "b_in", label: "Column width b (in)", kind: "number" },
    { key: "h_in", label: "Column depth h (in)", kind: "number" },
    { key: "fc_psi", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "fy_psi", label: "Steel yield fy (psi)", kind: "number", default: 60000 },
  ],
  outputs: [
    { key: "ast", id: "rcs-out-ast", label: "Required longitudinal steel Ast", value: (r) => fmt(r.ast_required_in2, 2) + " in^2 (" + fmt(r.rho_g * 100, 2) + "%, governed by " + r.governs + ")" + (r.over_max ? " -- OVER 8%, section too small" : "") },
    { key: "band", id: "rcs-out-band", label: "ACI 1-8% band", value: (r) => fmt(r.ast_min_in2, 2) + " to " + fmt(r.ast_max_in2, 2) + " in^2 (Ag " + fmt(r.ag_in2, 0) + " in^2)" },
    { key: "n", id: "rcs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRcColumnSteelForLoad,
});

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

// ===================== spec-v299..v301: reinforced-concrete depth-2 batch =====================
// The ACI checks the strength tiles never make: the deflection-control minimum
// thickness (Table 7.3.1.1 / 9.3.1.1), the doubly-reinforced beam with
// compression steel, and shear friction across an interface (22.9).
const _RC_BETA1 = (fc_psi) => fc_psi <= 4000 ? 0.85 : Math.max(0.85 - 0.05 * (fc_psi - 4000) / 1000, 0.65);

// dims: in { l_ft: L, support: dimensionless, fy_psi: M L^-1 T^-2, wc_pcf: M L^-2 T^-2 } out: { base_in: L, kfy: dimensionless, klw: dimensionless, hmin_in: L }
export function computeRcSlabMinThickness({ l_ft = 0, support = "simply", fy_psi = 60000, wc_pcf = 145 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(l_ft > 0)) return { error: "Span must be positive (ft)." };
  if (!(fy_psi > 0)) return { error: "Steel yield fy must be positive (psi)." };
  if (!(wc_pcf > 0)) return { error: "Concrete unit weight must be positive (pcf)." };
  const denoms = { simply: 20, "one-end": 24, "both-ends": 28, cantilever: 10 };
  const denom = denoms[support];
  if (!denom) return { error: "Support condition must be simply, one-end, both-ends, or cantilever." };
  const base_in = (l_ft * 12) / denom;
  const kfy = fy_psi === 60000 ? 1.0 : 0.4 + fy_psi / 100000;
  const klw = wc_pcf >= 145 ? 1.0 : Math.max(1.65 - 0.005 * wc_pcf, 1.09);
  const hmin_in = base_in * kfy * klw;
  return {
    base_in, kfy, klw, hmin_in,
    note: "ACI 318-19 Table 7.3.1.1 (one-way slabs) / 9.3.1.1 (beams) deflection-control minimum thickness: l/20 simply supported, l/24 one end continuous, l/28 both ends continuous, l/10 cantilever, times (0.4 + fy/100,000) for fy other than 60,000 psi and the 1.65 - 0.005 wc lightweight factor (>= 1.09). This is the depth that WAIVES an explicit deflection calculation - it applies to normalweight (unless wc is set) members not supporting or attached to partitions or construction likely to be damaged by large deflections, uses the clear span, and is not the strength (flexure/shear) design or the actual deflection of a thinner member. A design aid, not a substitute for the structural engineer of record's stamped design.",
  };
}
export const rcSlabMinThicknessExample = { inputs: { l_ft: 12, support: "simply", fy_psi: 60000, wc_pcf: 145 } };

CONCRETE_RENDERERS["rc-slab-min-thickness"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 Table 7.3.1.1 (one-way slabs) / 9.3.1.1 (beams) deflection-control minimum thickness (l/20, l/24, l/28, l/10), the (0.4 + fy/100,000) grade modifier, and the lightweight factor, by name. The depth that waives a deflection check, not a strength design. A design aid, not a substitute for the engineer of record.",
  example: rcSlabMinThicknessExample.inputs,
  fields: [
    { key: "l_ft", label: "Span l (ft, clear span)", kind: "number" },
    { key: "support", label: "Support condition", kind: "select", options: [
      { value: "simply", label: "Simply supported (l/20)" },
      { value: "one-end", label: "One end continuous (l/24)" },
      { value: "both-ends", label: "Both ends continuous (l/28)" },
      { value: "cantilever", label: "Cantilever (l/10)" },
    ], default: "simply" },
    { key: "fy_psi", label: "Steel yield fy (psi)", kind: "number", default: 60000 },
    { key: "wc_pcf", label: "Concrete unit weight (pcf)", kind: "number", default: 145 },
  ],
  outputs: [
    { key: "base", id: "rsmt-out-base", label: "Base thickness (l / denominator)", value: (r) => fmt(r.base_in, 2) + " in" },
    { key: "mods", id: "rsmt-out-mods", label: "Grade / lightweight modifiers", value: (r) => fmt(r.kfy, 3) + " / " + fmt(r.klw, 3) },
    { key: "hmin", id: "rsmt-out-hmin", label: "Minimum thickness hmin", value: (r) => fmt(r.hmin_in, 2) + " in" },
    { key: "n", id: "rsmt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRcSlabMinThickness,
});

// rc-slab-max-span-for-thickness: inverse of rc-slab-min-thickness. The forward
// tile gives hmin from a span; with the depth fixed, the max span that still
// waives a deflection check is the inverse: hmin = l x (12/denom) x kfy x klw is
// linear in l, so max_span = available_thickness / hmin(at l = 1 ft). Reuses the
// forward at l = 1 ft to carry the denom / kfy / klw geometry in one place.
// dims: in { available_thickness_in: L, support: dimensionless, fy_psi: M L^-1 T^-2, wc_pcf: M L^-2 T^-2 } out: { max_span_ft: L, kfy: dimensionless, klw: dimensionless, denom: dimensionless }
export function computeRcSlabMaxSpanForThickness({ available_thickness_in = 0, support = "simply", fy_psi = 60000, wc_pcf = 145 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const h = Number(available_thickness_in) || 0;
  if (!(h > 0)) return { error: "Available thickness must be positive (in)." };
  const base = computeRcSlabMinThickness({ l_ft: 1, support, fy_psi, wc_pcf });
  if (base.error) return { error: base.error };
  const hmin_per_ft = base.hmin_in;
  const max_span_ft = h / hmin_per_ft;
  const denoms = { simply: 20, "one-end": 24, "both-ends": 28, cantilever: 10 };
  return {
    max_span_ft, kfy: base.kfy, klw: base.klw, denom: denoms[support],
    note: "ACI 318-19 Table 7.3.1.1 / 9.3.1.1 deflection-control minimum thickness solved for the span: with the depth fixed, this is the longest span that still WAIVES an explicit deflection calculation (max_span = h x denom / (12 kfy klw), denom 20 / 24 / 28 / 10). A longer span needs either a deflection calculation or a deeper member. It applies to normalweight (unless wc is set) members not supporting or attached to partitions or construction likely to be damaged by large deflections, uses the clear span, and is not the strength (flexure/shear) design. A design aid, not a substitute for the structural engineer of record's stamped design.",
  };
}
export const rcSlabMaxSpanForThicknessExample = { inputs: { available_thickness_in: 10, support: "both-ends", fy_psi: 60000, wc_pcf: 145 } };
CONCRETE_RENDERERS["rc-slab-max-span-for-thickness"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 Table 7.3.1.1 (one-way slabs) / 9.3.1.1 (beams) deflection-control minimum thickness solved for the span, max_span = h x denom / (12 kfy klw), by name. The longest span the depth covers without a deflection check, not a strength design. A design aid, not a substitute for the engineer of record.",
  example: rcSlabMaxSpanForThicknessExample.inputs,
  fields: [
    { key: "available_thickness_in", label: "Available thickness h (in)", kind: "number", default: 10 },
    { key: "support", label: "Support condition", kind: "select", options: [
      { value: "simply", label: "Simply supported (l/20)" },
      { value: "one-end", label: "One end continuous (l/24)" },
      { value: "both-ends", label: "Both ends continuous (l/28)" },
      { value: "cantilever", label: "Cantilever (l/10)" },
    ], default: "simply" },
    { key: "fy_psi", label: "Steel yield fy (psi)", kind: "number", default: 60000 },
    { key: "wc_pcf", label: "Concrete unit weight (pcf)", kind: "number", default: 145 },
  ],
  outputs: [
    { key: "span", id: "rms-out-span", label: "Max span (no deflection check)", value: (r) => fmt(r.max_span_ft, 2) + " ft" },
    { key: "mods", id: "rms-out-mods", label: "Grade / lightweight modifiers", value: (r) => fmt(r.kfy, 3) + " / " + fmt(r.klw, 3) },
    { key: "n", id: "rms-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRcSlabMaxSpanForThickness,
});

// dims: in { b_in: L, d_in: L, dp_in: L, as_in2: L^2, asp_in2: L^2, fc_psi: M L^-1 T^-2, fy_psi: M L^-1 T^-2 } out: { a_in: L, c_in: L, eps_sp: dimensionless, eps_t: dimensionless, mn_kipft: M L^2 T^-2, phi_mn_kipft: M L^2 T^-2 }
export function computeRcDoublyReinforced({ b_in = 0, d_in = 0, dp_in = 0, as_in2 = 0, asp_in2 = 0, fc_psi = 4000, fy_psi = 60000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(b_in > 0) || !(d_in > 0)) return { error: "Beam width and effective depth must be positive (in)." };
  if (!(dp_in > 0)) return { error: "Compression-steel depth d' must be positive (in)." };
  if (!(dp_in < d_in)) return { error: "The compression-steel depth d' must be less than the effective depth d." };
  if (!(as_in2 > 0)) return { error: "Tension steel As must be positive (in^2)." };
  if (asp_in2 < 0) return { error: "Compression steel A's cannot be negative (in^2)." };
  if (!(as_in2 > asp_in2)) return { error: "The tension steel must exceed the compression steel (As > A's) for a net tension couple." };
  if (!(fc_psi > 0) || !(fy_psi > 0)) return { error: "Concrete and steel strengths must be positive (psi)." };
  const beta1 = _RC_BETA1(fc_psi);
  const a_in = ((as_in2 - asp_in2) * fy_psi) / (0.85 * fc_psi * b_in);
  const c_in = a_in / beta1;
  const eps_y = fy_psi / 29e6;
  const eps_sp = 0.003 * (c_in - dp_in) / c_in;
  const eps_t = 0.003 * (d_in - c_in) / c_in;
  const comp_yields = eps_sp >= eps_y;
  const tension_controlled = eps_t >= 0.005;
  const phi = tension_controlled ? 0.90 : (eps_t <= eps_y ? 0.65 : 0.65 + 0.25 * (eps_t - eps_y) / (0.005 - eps_y));
  const mn_lbin = (as_in2 - asp_in2) * fy_psi * (d_in - a_in / 2) + asp_in2 * fy_psi * (d_in - dp_in);
  const mn_kipft = mn_lbin / 12000;
  const phi_mn_kipft = phi * mn_kipft;
  return {
    a_in, c_in, beta1, eps_sp, eps_t, eps_y, comp_yields, tension_controlled, phi, mn_kipft, phi_mn_kipft,
    note: "ACI 318-19 doubly-reinforced rectangular-beam flexure: a = (As - A's) fy / (0.85 f'c b), c = a/beta1, and Mn = (As - A's) fy (d - a/2) + A's fy (d - d') - the singly-reinforced couple plus the steel-to-steel couple. This ASSUMES both steel layers yield (the compression-steel yield check epsilon's = 0.003 (c - d')/c >= fy/Es is flagged when it fails, where a rigorous solution would iterate with f's = Es epsilon's <= fy), confirms the tension-controlled phi = 0.90 at epsilon_t >= 0.005, and covers a rectangular section (no T-beam flange). Minimum steel, bar spacing, and development are not checked. A design aid, not a substitute for the structural engineer of record's stamped design.",
  };
}
export const rcDoublyReinforcedExample = { inputs: { b_in: 14, d_in: 22, dp_in: 2.0, as_in2: 8.0, asp_in2: 3.0, fc_psi: 4000, fy_psi: 60000 } };

CONCRETE_RENDERERS["rc-doubly-reinforced"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 doubly-reinforced flexure a = (As - A's) fy / (0.85 f'c b), Mn = (As - A's) fy (d - a/2) + A's fy (d - d'), the compression-steel yield check epsilon's >= fy/Es, and the tension-controlled phi = 0.90, by name. Both layers assumed to yield; rectangular section. A design aid, not a substitute for the engineer of record.",
  example: rcDoublyReinforcedExample.inputs,
  fields: [
    { key: "b_in", label: "Beam width b (in)", kind: "number" },
    { key: "d_in", label: "Effective depth d (in)", kind: "number" },
    { key: "dp_in", label: "Compression-steel depth d' (in)", kind: "number" },
    { key: "as_in2", label: "Tension steel As (in^2)", kind: "number" },
    { key: "asp_in2", label: "Compression steel A's (in^2)", kind: "number" },
    { key: "fc_psi", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "fy_psi", label: "Steel yield fy (psi)", kind: "number", default: 60000 },
  ],
  outputs: [
    { key: "ac", id: "rdr-out-ac", label: "Stress block a / neutral axis c", value: (r) => fmt(r.a_in, 2) + " / " + fmt(r.c_in, 2) + " in" },
    { key: "yld", id: "rdr-out-yld", label: "Compression steel yields?", value: (r) => (r.comp_yields ? "yes (epsilon's " + fmt(r.eps_sp, 5) + " >= " + fmt(r.eps_y, 5) + ")" : "NO - both-yield assumption not met; result unconservative") },
    { key: "tc", id: "rdr-out-tc", label: "Section (phi)", value: (r) => (r.tension_controlled ? "tension-controlled (phi 0.90)" : "transition (phi " + fmt(r.phi, 3) + ")") + ", epsilon_t " + fmt(r.eps_t, 4) },
    { key: "mn", id: "rdr-out-mn", label: "Nominal Mn", value: (r) => fmt(r.mn_kipft, 1) + " kip-ft" },
    { key: "pm", id: "rdr-out-pm", label: "Design phi Mn", value: (r) => fmt(r.phi_mn_kipft, 1) + " kip-ft" },
    { key: "n", id: "rdr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRcDoublyReinforced,
});

// dims: in { avf_in2: L^2, fy_psi: M L^-1 T^-2, ac_in2: L^2, fc_psi: M L^-1 T^-2, iface: dimensionless, lambda: dimensionless } out: { mu_f: dimensionless, vn0_kip: M L T^-2, cap_kip: M L T^-2, vn_kip: M L T^-2, phi_vn_kip: M L T^-2 }
export function computeRcShearFriction({ avf_in2 = 0, fy_psi = 60000, ac_in2 = 0, fc_psi = 4000, iface = "roughened", lambda = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(avf_in2 > 0)) return { error: "The friction reinforcement area Avf must be positive (in^2)." };
  if (!(fy_psi > 0)) return { error: "Steel yield fy must be positive (psi)." };
  if (!(ac_in2 > 0)) return { error: "The interface area Ac must be positive (in^2)." };
  if (!(fc_psi > 0)) return { error: "Concrete strength f'c must be positive (psi)." };
  if (!(lambda > 0 && lambda <= 1)) return { error: "The lightweight factor lambda is over 0 and up to 1.0." };
  const mus = { monolithic: 1.4, roughened: 1.0, unroughened: 0.6, steel: 0.7 };
  const base_mu = mus[iface];
  if (!base_mu) return { error: "The interface must be monolithic, roughened, unroughened, or steel." };
  const mu_f = base_mu * lambda;
  const vn0_kip = (mu_f * avf_in2 * fy_psi) / 1000;
  const cap_governs_mono = iface === "monolithic" || iface === "roughened";
  const cap_kip = (Math.min(0.2 * fc_psi, 480 + 0.08 * fc_psi, 1600) * ac_in2) / 1000;
  const vn_kip = cap_governs_mono ? Math.min(vn0_kip, cap_kip) : vn0_kip;
  const capped = cap_governs_mono && cap_kip < vn0_kip;
  const phi_vn_kip = 0.75 * vn_kip;
  return {
    mu_f, vn0_kip, cap_kip, vn_kip, capped, phi_vn_kip,
    note: "ACI 318-19 22.9 shear-friction strength Vn = mu Avf fy, with mu = 1.4 lambda (monolithic), 1.0 lambda (against roughened hardened concrete), 0.6 lambda (unroughened), 0.7 lambda (against as-rolled steel), capped by min(0.2 f'c, 480 + 0.08 f'c, 1600) Ac for a NORMALWEIGHT monolithic or roughened interface, and phi = 0.75. This returns the shear transferred across a single well-defined plane by friction in the perpendicular (no permanent net tension) case; a net tension across the plane needs added reinforcement Avf = Vu/(phi fy mu) + An. The reduced caps for lightweight or other interface conditions, the anchorage/development of the crossing bars, and the concrete bracket/corbel bearing are separate. A design aid, not a substitute for the structural engineer of record's stamped design.",
  };
}
export const rcShearFrictionExample = { inputs: { avf_in2: 2.0, fy_psi: 60000, ac_in2: 192, fc_psi: 4000, iface: "roughened", lambda: 1.0 } };

CONCRETE_RENDERERS["rc-shear-friction"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 22.9 shear friction Vn = mu Avf fy (mu 1.4/1.0/0.6/0.7 x lambda by interface), capped by min(0.2 f'c, 480 + 0.08 f'c, 1600) Ac for normalweight monolithic/roughened, phi = 0.75, by name. Perpendicular (no net tension) case, single plane. A design aid, not a substitute for the engineer of record.",
  example: rcShearFrictionExample.inputs,
  fields: [
    { key: "avf_in2", label: "Reinforcement crossing the plane Avf (in^2)", kind: "number" },
    { key: "fy_psi", label: "Steel yield fy (psi)", kind: "number", default: 60000 },
    { key: "ac_in2", label: "Interface area Ac (in^2)", kind: "number" },
    { key: "fc_psi", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "iface", label: "Interface condition (mu)", kind: "select", options: [
      { value: "monolithic", label: "Monolithic (1.4)" },
      { value: "roughened", label: "Against roughened concrete (1.0)" },
      { value: "unroughened", label: "Against unroughened concrete (0.6)" },
      { value: "steel", label: "Against as-rolled steel (0.7)" },
    ], default: "roughened" },
    { key: "lambda", label: "Lightweight factor lambda", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "mu", id: "rsf-out-mu", label: "Friction coefficient mu", value: (r) => fmt(r.mu_f, 2) },
    { key: "vn0", id: "rsf-out-vn0", label: "Friction strength mu Avf fy", value: (r) => fmt(r.vn0_kip, 1) + " kip" },
    { key: "cap", id: "rsf-out-cap", label: "Interface cap", value: (r) => fmt(r.cap_kip, 1) + " kip" + (r.capped ? " (governs)" : "") },
    { key: "vn", id: "rsf-out-vn", label: "Nominal Vn", value: (r) => fmt(r.vn_kip, 1) + " kip" },
    { key: "pv", id: "rsf-out-pv", label: "Design phi Vn", value: (r) => fmt(r.phi_vn_kip, 1) + " kip" },
    { key: "n", id: "rsf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRcShearFriction,
});

// ===================== spec-v378..v380: concrete material-properties trio =====================

// dims: in { fc_psi: M L^-1 T^-2, wc_pcf: M L^-3 } out: { ec_psi: M L^-1 T^-2, ec_ksi: M L^-1 T^-2, ec_normal_psi: M L^-1 T^-2 }
export function computeConcreteElasticModulus({ fc_psi = 4000, wc_pcf = 145 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fc_psi > 0)) return { error: "Concrete strength f'c must be positive (psi)." };
  if (!(wc_pcf > 0)) return { error: "Unit weight wc must be positive (pcf)." };
  const ec_psi = Math.pow(wc_pcf, 1.5) * 33 * Math.sqrt(fc_psi);
  const ec_normal_psi = 57000 * Math.sqrt(fc_psi);
  const out_of_band = wc_pcf < 90 || wc_pcf > 160;
  return {
    ec_psi, ec_ksi: ec_psi / 1000, ec_normal_psi, ec_normal_ksi: ec_normal_psi / 1000, out_of_band,
    note: "ACI 318-19 §19.2.2.1(a): Ec = wc^1.5 x 33 x sqrt(f'c) psi, valid for 90 <= wc <= 160 pcf; the §19.2.2.1(b) normalweight shortcut is 57000 x sqrt(f'c). Ec sets the stiffness behind every deflection, drift, and short-column calculation. A lightweight deck (lower wc) is markedly less stiff at the same strength. A design aid; the engineer of record's stamped design governs.",
  };
}
export const concreteElasticModulusExample = { inputs: { fc_psi: 4000, wc_pcf: 145 } };
CONCRETE_RENDERERS["concrete-elastic-modulus"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 §19.2.2.1(a): Ec = wc^1.5 x 33 x sqrt(f'c) (psi), applicable for wc between 90 and 160 pcf; §19.2.2.1(b) gives the normalweight shortcut Ec = 57000 x sqrt(f'c). Returns the secant modulus used for deflection, drift, and stiffness; it is not the dynamic or tangent modulus, and the actual in-place modulus varies with aggregate and mix. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: concreteElasticModulusExample.inputs,
  fields: [
    { key: "fc_psi", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "wc_pcf", label: "Unit weight wc (pcf, 145 normalweight)", kind: "number", default: 145 },
  ],
  outputs: [
    { key: "ec", id: "cem-out-ec", label: "Modulus Ec = wc^1.5 x 33 x sqrt(f'c)", value: (r) => fmt(r.ec_psi, 0) + " psi (" + fmt(r.ec_ksi, 0) + " ksi)" },
    { key: "en", id: "cem-out-en", label: "Normalweight shortcut 57000 x sqrt(f'c)", value: (r) => fmt(r.ec_normal_psi, 0) + " psi (" + fmt(r.ec_normal_ksi, 0) + " ksi)" },
    { key: "ob", id: "cem-out-ob", label: "Unit-weight range", value: (r) => r.out_of_band ? "OUT OF BAND (wc outside 90-160 pcf; ACI eq. not applicable)" : "within ACI 90-160 pcf" },
    { key: "n", id: "cem-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteElasticModulus,
});

// concrete-strength-from-modulus: inverse of concrete-elastic-modulus. The forward
// tile gives Ec from f'c; backing out the in-place strength from a measured (or
// specified) stiffness is the inverse: Ec = wc^1.5 x 33 x sqrt(f'c), so
// f'c = (Ec / (wc^1.5 x 33))^2.
// dims: in { ec_psi: M L^-1 T^-2, wc_pcf: M L^-3 } out: { fc_psi: M L^-1 T^-2, fc_ksi: M L^-1 T^-2 }
export function computeConcreteStrengthFromModulus({ ec_psi = 0, wc_pcf = 145 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ec = Number(ec_psi) || 0;
  const wc = Number(wc_pcf) || 0;
  if (!(ec > 0)) return { error: "Elastic modulus Ec must be positive (psi)." };
  if (!(wc > 0)) return { error: "Unit weight wc must be positive (pcf)." };
  const root = ec / (Math.pow(wc, 1.5) * 33);
  const fc_psi = root * root;
  const out_of_band = wc < 90 || wc > 160;
  return {
    fc_psi, fc_ksi: fc_psi / 1000, out_of_band,
    note: "ACI 318-19 §19.2.2.1(a) Ec = wc^1.5 x 33 x sqrt(f'c) solved for the strength: f'c = (Ec / (wc^1.5 x 33))^2. Useful for backing out the equivalent in-place f'c from a resonance / sonic modulus test or a specified stiffness. The relation is valid for 90 <= wc <= 160 pcf; the in-place modulus scatters with aggregate and mix, so this is an equivalent strength, not a cylinder-break value. A design aid; the engineer of record's stamped design governs.",
  };
}
export const concreteStrengthFromModulusExample = { inputs: { ec_psi: 3644147, wc_pcf: 145 } };
CONCRETE_RENDERERS["concrete-strength-from-modulus"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 §19.2.2.1(a) Ec = wc^1.5 x 33 x sqrt(f'c) solved for f'c = (Ec / (wc^1.5 x 33))^2, by name. Backs out an equivalent in-place strength from a measured or specified modulus; the in-place modulus scatters with aggregate and mix, so this is not a cylinder-break value. A design aid, not a substitute for the engineer of record.",
  example: concreteStrengthFromModulusExample.inputs,
  fields: [
    { key: "ec_psi", label: "Elastic modulus Ec (psi)", kind: "number", default: 3644147 },
    { key: "wc_pcf", label: "Unit weight wc (pcf, 145 normalweight)", kind: "number", default: 145 },
  ],
  outputs: [
    { key: "fc", id: "csm-out-fc", label: "Equivalent strength f'c", value: (r) => fmt(r.fc_psi, 0) + " psi (" + fmt(r.fc_ksi, 2) + " ksi)" },
    { key: "ob", id: "csm-out-ob", label: "Unit-weight range", value: (r) => r.out_of_band ? "OUT OF BAND (wc outside 90-160 pcf; ACI eq. not applicable)" : "within ACI 90-160 pcf" },
    { key: "n", id: "csm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteStrengthFromModulus,
});

// dims: in { fc_psi: M L^-1 T^-2, lambda: dimensionless } out: { fr_psi: M L^-1 T^-2, fr_fraction: dimensionless }
export function computeConcreteModulusOfRupture({ fc_psi = 4000, lambda = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fc_psi > 0)) return { error: "Concrete strength f'c must be positive (psi)." };
  if (!(lambda > 0)) return { error: "Lightweight factor lambda must be positive." };
  const fr_psi = 7.5 * lambda * Math.sqrt(fc_psi);
  const fr_fraction = fr_psi / fc_psi;
  const out_of_band = lambda < 0.75 || lambda > 1.0;
  return {
    fr_psi, fr_fraction, out_of_band,
    note: "ACI 318-19 §19.2.3.1: fr = 7.5 x lambda x sqrt(f'c) psi, the flexural tensile stress at which plain concrete first cracks. lambda is 1.0 normalweight, 0.75 all-lightweight (§19.2.4). fr sets the cracking moment Mcr behind deflection (Ie) and minimum-reinforcement checks. It is a lower-bound design value, well below the actual scatter of a beam test. A design aid; the engineer of record's stamped design governs.",
  };
}
export const concreteModulusOfRuptureExample = { inputs: { fc_psi: 4000, lambda: 1.0 } };
CONCRETE_RENDERERS["concrete-modulus-of-rupture"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 §19.2.3.1: fr = 7.5 x lambda x sqrt(f'c) (psi), the modulus of rupture, with lambda = 1.0 normalweight and 0.75 all-lightweight (§19.2.4). This is the code cracking stress used for the cracking moment Mcr and minimum flexural reinforcement; the true rupture strength of a given mix scatters above this conservative design value. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: concreteModulusOfRuptureExample.inputs,
  fields: [
    { key: "fc_psi", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "lambda", label: "Lightweight factor lambda (1.0 NW, 0.75 LW)", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "fr", id: "cmr-out-fr", label: "Modulus of rupture fr = 7.5 lambda sqrt(f'c)", value: (r) => fmt(r.fr_psi, 0) + " psi" },
    { key: "ff", id: "cmr-out-ff", label: "As a fraction of f'c", value: (r) => fmt(r.fr_fraction, 4) + " x f'c" },
    { key: "ob", id: "cmr-out-ob", label: "Lambda range", value: (r) => r.out_of_band ? "OUT OF BAND (lambda outside 0.75-1.0)" : "within 0.75-1.0" },
    { key: "n", id: "cmr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteModulusOfRupture,
});

// concrete-strength-from-rupture: inverse of concrete-modulus-of-rupture. The
// forward tile gives fr from f'c; backing out the strength from a flexural-beam
// (modulus-of-rupture) test is the inverse: fr = 7.5 x lambda x sqrt(f'c), so
// f'c = (fr / (7.5 x lambda))^2.
// dims: in { fr_psi: M L^-1 T^-2, lambda: dimensionless } out: { fc_psi: M L^-1 T^-2, fc_ksi: M L^-1 T^-2 }
export function computeConcreteStrengthFromRupture({ fr_psi = 0, lambda = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const fr = Number(fr_psi) || 0;
  const lam = Number(lambda) > 0 ? Number(lambda) : 1.0;
  if (!(fr > 0)) return { error: "Modulus of rupture fr must be positive (psi)." };
  if (!(lam > 0)) return { error: "Lightweight factor lambda must be positive." };
  const root = fr / (7.5 * lam);
  const fc_psi = root * root;
  const out_of_band = lam < 0.75 || lam > 1.0;
  return {
    fc_psi, fc_ksi: fc_psi / 1000, out_of_band,
    note: "ACI 318-19 §19.2.3.1 fr = 7.5 x lambda x sqrt(f'c) solved for the strength: f'c = (fr / (7.5 x lambda))^2. Backs out the equivalent f'c implied by a flexural-beam (modulus-of-rupture) test, with lambda 1.0 normalweight and 0.75 all-lightweight. The code fr is a conservative lower bound and a real beam test scatters above it, so the implied f'c is a lower-bound equivalent, not a cylinder-break value. A design aid; the engineer of record's stamped design governs.",
  };
}
export const concreteStrengthFromRuptureExample = { inputs: { fr_psi: 474.342, lambda: 1.0 } };
CONCRETE_RENDERERS["concrete-strength-from-rupture"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 §19.2.3.1 fr = 7.5 x lambda x sqrt(f'c) solved for f'c = (fr / (7.5 x lambda))^2, by name, with lambda = 1.0 normalweight and 0.75 all-lightweight. The equivalent f'c from a flexural-beam test; the code fr is a conservative lower bound the true rupture strength scatters above. A design aid, not a substitute for the engineer of record.",
  example: concreteStrengthFromRuptureExample.inputs,
  fields: [
    { key: "fr_psi", label: "Modulus of rupture fr (psi)", kind: "number", default: 474.342 },
    { key: "lambda", label: "Lightweight factor lambda (1.0 NW, 0.75 LW)", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "fc", id: "csr-out-fc", label: "Equivalent strength f'c", value: (r) => fmt(r.fc_psi, 0) + " psi (" + fmt(r.fc_ksi, 2) + " ksi)" },
    { key: "ob", id: "csr-out-ob", label: "Lambda range", value: (r) => r.out_of_band ? "OUT OF BAND (lambda outside 0.75-1.0)" : "within 0.75-1.0" },
    { key: "n", id: "csr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteStrengthFromRupture,
});

// dims: in { b_in: L, h_in: L, fc_psi: M L^-1 T^-2, lambda: dimensionless } out: { fr_psi: M L^-1 T^-2, sm_in3: L^3, mcr_lbin: M L^2 T^-2, mcr_kipft: M L^2 T^-2 }
export function computeConcreteCrackingMoment({ b_in = 0, h_in = 0, fc_psi = 4000, lambda = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(b_in > 0)) return { error: "Section width b must be positive (in)." };
  if (!(h_in > 0)) return { error: "Section depth h must be positive (in)." };
  if (!(fc_psi > 0)) return { error: "Concrete strength f'c must be positive (psi)." };
  if (!(lambda > 0)) return { error: "Lightweight factor lambda must be positive." };
  const fr_psi = 7.5 * lambda * Math.sqrt(fc_psi);
  const sm_in3 = b_in * h_in * h_in / 6;
  const mcr_lbin = fr_psi * sm_in3;
  const mcr_kipft = mcr_lbin / 12000;
  const out_of_band = lambda < 0.75 || lambda > 1.0;
  return {
    fr_psi, sm_in3, mcr_lbin, mcr_kipft, out_of_band,
    note: "ACI 318-19 cracking moment Mcr = fr Ig / yt, the bending moment at which a plain (uncracked) section first cracks in flexure. With the modulus of rupture fr = 7.5 lambda sqrt(f'c) (§19.2.3.1; lambda 1.0 normalweight, 0.75 all-lightweight) and the gross rectangular section modulus S = Ig/yt = b h^2/6, Mcr = fr b h^2/6. This is the value behind the effective-moment-of-inertia (Ie) deflection analysis and the minimum-flexural-reinforcement check (the design strength must reach at least 1.2 Mcr). Gross rectangular section with the reinforcement transform neglected (the standard approximation); a T-beam or a heavily reinforced section uses the transformed Ig. A design aid; the engineer of record's stamped design governs.",
  };
}
export const concreteCrackingMomentExample = { inputs: { b_in: 12, h_in: 20, fc_psi: 4000, lambda: 1.0 } };
CONCRETE_RENDERERS["concrete-cracking-moment"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 cracking moment Mcr = fr Ig/yt = fr b h^2/6 for a gross rectangular section, with the modulus of rupture fr = 7.5 lambda sqrt(f'c) (§19.2.3.1). The value behind the Ie deflection analysis and the minimum-reinforcement check (design strength >= 1.2 Mcr). A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: concreteCrackingMomentExample.inputs,
  fields: [
    { key: "b_in", label: "Section width b (in)", kind: "number", default: 12 },
    { key: "h_in", label: "Section total depth h (in)", kind: "number", default: 20 },
    { key: "fc_psi", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "lambda", label: "Lightweight factor lambda (1.0 NW, 0.75 LW)", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "mcr", id: "ccm-out-mcr", label: "Cracking moment Mcr", value: (r) => fmt(r.mcr_kipft, 2) + " kip-ft (" + fmt(r.mcr_lbin, 0) + " lb-in)" },
    { key: "fr", id: "ccm-out-fr", label: "Modulus of rupture fr", value: (r) => fmt(r.fr_psi, 0) + " psi" + (r.out_of_band ? " (lambda out of 0.75-1.0)" : "") },
    { key: "sm", id: "ccm-out-sm", label: "Gross section modulus S = b h^2/6", value: (r) => fmt(r.sm_in3, 0) + " in^3" },
    { key: "n", id: "ccm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteCrackingMoment,
});

// concrete-depth-for-cracking-moment: inverse of concrete-cracking-moment. The forward tile gives the cracking moment
// from the section depth; the inverse recovers the section depth that reaches a target cracking moment for a given width,
// so a designer sizes the section to a target Mcr (e.g. 1.2 Mcr for minimum flexural reinforcement). From
// Mcr = fr b h^2 / 6 with fr = 7.5 lambda sqrt(f'c), h = sqrt( 6 Mcr / (fr b) ).
// dims: in { target_mcr_kipft: M L^2 T^-2, b_in: L, fc_psi: M L^-1 T^-2, lambda: dimensionless } out: { h_in: L, fr_psi: M L^-1 T^-2, sm_in3: L^3 }
export function computeConcreteDepthForCrackingMoment({ target_mcr_kipft = 0, b_in = 0, fc_psi = 4000, lambda = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const mcr = Number(target_mcr_kipft) || 0;
  const b = Number(b_in) || 0;
  const fc = Number(fc_psi) || 0;
  const lam = Number(lambda) || 0;
  if (!(mcr > 0)) return { error: "Target cracking moment must be positive (kip-ft)." };
  if (!(b > 0)) return { error: "Section width b must be positive (in)." };
  if (!(fc > 0)) return { error: "Concrete strength f'c must be positive (psi)." };
  if (!(lam > 0)) return { error: "Lightweight factor lambda must be positive." };
  const fr_psi = 7.5 * lam * Math.sqrt(fc);
  const mcr_lbin = mcr * 12000;
  const h_in = Math.sqrt(6 * mcr_lbin / (fr_psi * b));
  const sm_in3 = b * h_in * h_in / 6;
  const out_of_band = lam < 0.75 || lam > 1.0;
  if (![fr_psi, h_in, sm_in3].every(Number.isFinite)) return { error: "Section-depth math is not a finite value." };
  return {
    h_in, fr_psi, sm_in3, out_of_band,
    note: "ACI 318-19 cracking moment Mcr = fr b h^2/6 solved for the total depth: h = sqrt( 6 Mcr / (fr b) ), with the modulus of rupture fr = 7.5 lambda sqrt(f'c) (§19.2.3.1). Size to the target Mcr you need - for the minimum-flexural-reinforcement check the design strength must reach at least 1.2 Mcr, so a common use is to enter 1.2 Mcr and check the section against it. This is a gross rectangular section with the reinforcement transform neglected (the standard approximation); a T-beam or heavily reinforced section uses the transformed Ig, and the flexural, shear, and deflection design still govern the final depth. A design aid; the engineer of record's stamped design governs.",
  };
}
export const concreteDepthForCrackingMomentExample = { inputs: { target_mcr_kipft: 31.6, b_in: 12, fc_psi: 4000, lambda: 1.0 } };
CONCRETE_RENDERERS["concrete-depth-for-cracking-moment"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 cracking moment Mcr = fr b h^2/6 (fr = 7.5 lambda sqrt(f'c), §19.2.3.1) solved for the depth: h = sqrt( 6 Mcr / (fr b) ). The value behind the minimum-reinforcement check (design strength >= 1.2 Mcr). A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: concreteDepthForCrackingMomentExample.inputs,
  fields: [
    { key: "target_mcr_kipft", label: "Target cracking moment Mcr (kip-ft)", kind: "number" },
    { key: "b_in", label: "Section width b (in)", kind: "number", default: 12 },
    { key: "fc_psi", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "lambda", label: "Lightweight factor lambda (1.0 NW, 0.75 LW)", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "h", id: "cdcm-out-h", label: "Required total depth h", value: (r) => fmt(r.h_in, 2) + " in" },
    { key: "fr", id: "cdcm-out-fr", label: "Modulus of rupture fr", value: (r) => fmt(r.fr_psi, 0) + " psi" + (r.out_of_band ? " (lambda out of 0.75-1.0)" : "") },
    { key: "sm", id: "cdcm-out-sm", label: "Gross section modulus S = b h^2/6", value: (r) => fmt(r.sm_in3, 0) + " in^3" },
    { key: "n", id: "cdcm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteDepthForCrackingMoment,
});

// dims: in { h_in: L, b_in: L, grade_ksi: M L^-1 T^-2 } out: { ratio: dimensionless, as_min_in2: L^2, s_max_in: L }
export function computeConcreteShrinkageTemperatureSteel({ h_in = 0, b_in = 12, grade_ksi = 60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(h_in > 0)) return { error: "Slab thickness h must be positive (in)." };
  if (!(b_in > 0)) return { error: "Design strip width b must be positive (in)." };
  if (!(grade_ksi > 0)) return { error: "Reinforcement grade must be positive (ksi)." };
  const ratio = Math.max(grade_ksi >= 60 ? 0.0018 : 0.0020, 0.0014);
  const ag_in2 = b_in * h_in;
  const as_min_in2 = ratio * ag_in2;
  const s_max_in = Math.min(5 * h_in, 18);
  const spacing_governor = 5 * h_in < 18 ? "5h" : "18 in cap";
  return {
    ratio, ag_in2, as_min_in2, s_max_in, spacing_governor,
    note: "ACI 318-19 §24.4.3.2: minimum shrinkage-and-temperature reinforcement ratio is 0.0018 for Grade 60 (and higher-yield deformed bars per §24.4.3.2(c) scaled by 60/fy but never below 0.0014), 0.0020 for Grade 40/50; As,min = ratio x b x h per strip. §24.4.3.3 caps the spacing at the smaller of 5h and 18 in. This is the steel perpendicular to the main bars in a one-way slab, not the flexural steel. A design aid; the engineer of record's stamped design governs.",
  };
}
export const concreteShrinkageTemperatureSteelExample = { inputs: { h_in: 6, b_in: 12, grade_ksi: 60 } };
CONCRETE_RENDERERS["concrete-shrinkage-temperature-steel"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 §24.4.3.2 (minimum shrinkage and temperature reinforcement ratio: 0.0018 for Grade 60, 0.0020 for Grade 40/50, never below 0.0014) and §24.4.3.3 (spacing not to exceed the smaller of 5h and 18 in). As,min = ratio x b x h is the reinforcement perpendicular to the main bars in a one-way slab. Does not size the flexural (main) steel or check crack width for exposure. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: concreteShrinkageTemperatureSteelExample.inputs,
  fields: [
    { key: "h_in", label: "Slab thickness h (in)", kind: "number" },
    { key: "b_in", label: "Design strip width b (in, default 12)", kind: "number", default: 12 },
    { key: "grade_ksi", label: "Reinforcement grade (ksi)", kind: "select", options: [
      { value: "60", label: "Grade 60 (ratio 0.0018)" },
      { value: "40", label: "Grade 40 (ratio 0.0020)" },
      { value: "50", label: "Grade 50 (ratio 0.0020)" },
    ], default: "60" },
  ],
  outputs: [
    { key: "rt", id: "csts-out-rt", label: "Reinforcement ratio", value: (r) => fmt(r.ratio, 4) },
    { key: "as", id: "csts-out-as", label: "Minimum area As,min = ratio x b x h", value: (r) => fmt(r.as_min_in2, 3) + " in^2 per strip" },
    { key: "sm", id: "csts-out-sm", label: "Max spacing min(5h, 18 in)", value: (r) => fmt(r.s_max_in, 1) + " in (" + r.spacing_governor + " governs)" },
    { key: "n", id: "csts-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteShrinkageTemperatureSteel,
});

// ===================== spec-v393..v395: concrete design-details trio =====================

// dims: in { bw_in: L, hf_in: L, ln_in: L, sw_in: L, beam_type: dimensionless } out: { overhang_in: L, be_in: L }
export function computeTBeamEffectiveFlangeWidth({ bw_in = 0, hf_in = 0, ln_in = 0, sw_in = 0, beam_type = "interior" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const bw = Number(bw_in) || 0;
  const hf = Number(hf_in) || 0;
  const ln = Number(ln_in) || 0;
  const sw = Number(sw_in) || 0;
  if (!(bw > 0)) return { error: "Web width bw must be positive (in)." };
  if (!(hf > 0)) return { error: "Flange (slab) thickness hf must be positive (in)." };
  if (!(ln > 0)) return { error: "Clear span ln must be positive (in)." };
  if (!(sw > 0)) return { error: "Clear distance to the adjacent web sw must be positive (in)." };
  const edge = beam_type === "edge";
  const overhang = edge
    ? Math.min(6 * hf, sw / 2, ln / 12)
    : Math.min(8 * hf, sw / 2, ln / 8);
  const be_in = edge ? bw + overhang : bw + 2 * overhang;
  const governs = edge
    ? (overhang === 6 * hf ? "6 hf" : overhang === sw / 2 ? "sw/2" : "ln/12")
    : (overhang === 8 * hf ? "8 hf" : overhang === sw / 2 ? "sw/2" : "ln/8");
  return {
    overhang_in: overhang, be_in, governs,
    note: "ACI 318-19 §6.3.2 effective flange width of a T-beam: the slab that acts with the web is limited to the smallest of a multiple of the flange thickness, half the clear distance to the next web, and a fraction of the clear span - taken on both sides for an interior beam (be = bw + 2 x overhang) and one side for an edge/spandrel beam (be = bw + overhang). Only this width is counted as the compression flange in the flexural design. A design aid; the engineer of record's stamped design governs.",
  };
}
export const tBeamEffectiveFlangeWidthExample = { inputs: { bw_in: 12, hf_in: 4, ln_in: 240, sw_in: 48, beam_type: "interior" } };
CONCRETE_RENDERERS["t-beam-effective-flange-width"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 §6.3.2.1 (interior T-beam effective flange overhang = smallest of 8 hf, half the clear distance to the next web, and ln/8; be = bw + 2 x overhang) and §6.3.2.1 for an edge beam (6 hf, half the clear distance, ln/12; be = bw + overhang). Only the effective flange acts as the compression flange in flexure. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: tBeamEffectiveFlangeWidthExample.inputs,
  fields: [
    { key: "bw_in", label: "Web width bw (in)", kind: "number", default: 12 },
    { key: "hf_in", label: "Flange (slab) thickness hf (in)", kind: "number", default: 4 },
    { key: "ln_in", label: "Clear span ln (in)", kind: "number", default: 240 },
    { key: "sw_in", label: "Clear distance to adjacent web sw (in)", kind: "number", default: 48 },
    { key: "beam_type", label: "Beam type", kind: "select", options: [
      { value: "interior", label: "Interior (flange both sides)" },
      { value: "edge", label: "Edge / spandrel (flange one side)" },
    ], default: "interior" },
  ],
  outputs: [
    { key: "oh", id: "tbf-out-oh", label: "Per-side flange overhang", value: (r) => fmt(r.overhang_in, 1) + " in (" + r.governs + " governs)" },
    { key: "be", id: "tbf-out-be", label: "Effective flange width be", value: (r) => fmt(r.be_in, 1) + " in" },
    { key: "n", id: "tbf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTBeamEffectiveFlangeWidth,
});

// dims: in { fc_psi: M L^-1 T^-2, fy_psi: M L^-1 T^-2, bw_in: L, d_in: L } out: { ratio: dimensionless, as_min_in2: L^2 }
export function computeConcreteBeamMinFlexuralSteel({ fc_psi = 4000, fy_psi = 60000, bw_in = 0, d_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const fc = Number(fc_psi) || 0;
  const fy = Number(fy_psi) || 0;
  const bw = Number(bw_in) || 0;
  const d = Number(d_in) || 0;
  if (!(fc > 0)) return { error: "Concrete strength f'c must be positive (psi)." };
  if (!(fy > 0)) return { error: "Steel yield fy must be positive (psi)." };
  if (!(bw > 0)) return { error: "Web width bw must be positive (in)." };
  if (!(d > 0)) return { error: "Effective depth d must be positive (in)." };
  const term_sqrt = 3 * Math.sqrt(fc) / fy;
  const term_flat = 200 / fy;
  const ratio = Math.max(term_sqrt, term_flat);
  const as_min_in2 = ratio * bw * d;
  const governs = term_sqrt >= term_flat ? "3 sqrt(f'c)/fy" : "200/fy";
  return {
    ratio, as_min_in2, governs,
    note: "ACI 318-19 §9.6.1.2 minimum flexural reinforcement: As,min = max(3 sqrt(f'c)/fy, 200/fy) x bw x d, so the beam has more capacity cracked than uncracked and does not fail suddenly at first cracking. The 200/fy floor governs up to about f'c = 4444 psi; above that the 3 sqrt(f'c)/fy term controls. For a statically determinate T-beam with the flange in tension, bw is replaced by the smaller of 2 bw and the flange width (not applied here). A design aid; the engineer of record's stamped design governs.",
  };
}
export const concreteBeamMinFlexuralSteelExample = { inputs: { fc_psi: 4000, fy_psi: 60000, bw_in: 12, d_in: 20 } };
CONCRETE_RENDERERS["concrete-beam-min-flexural-steel"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 §9.6.1.2: minimum flexural reinforcement As,min = max(3 sqrt(f'c)/fy, 200/fy) x bw x d, ensuring the cracking moment does not exceed the flexural capacity (no sudden failure at first crack). The 200/fy floor governs to about f'c = 4444 psi; the sqrt term controls above. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: concreteBeamMinFlexuralSteelExample.inputs,
  fields: [
    { key: "fc_psi", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "fy_psi", label: "Steel yield fy (psi)", kind: "number", default: 60000 },
    { key: "bw_in", label: "Web width bw (in)", kind: "number", default: 12 },
    { key: "d_in", label: "Effective depth d (in)", kind: "number", default: 20 },
  ],
  outputs: [
    { key: "rt", id: "cmf-out-rt", label: "Minimum steel ratio", value: (r) => fmt(r.ratio, 5) + " (" + r.governs + " governs)" },
    { key: "as", id: "cmf-out-as", label: "Minimum area As,min", value: (r) => fmt(r.as_min_in2, 2) + " in^2" },
    { key: "n", id: "cmf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteBeamMinFlexuralSteel,
});

// dims: in { fs_psi: M L^-1 T^-2, cc_in: L } out: { s1_in: L, s2_in: L, s_max_in: L }
export function computeConcreteCrackControlSpacing({ fs_psi = 40000, cc_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const fs = Number(fs_psi) || 0;
  const cc = Number(cc_in) || 0;
  if (!(fs > 0)) return { error: "Service-load steel stress fs must be positive (psi)." };
  if (!(cc >= 0)) return { error: "Clear cover must be non-negative (in)." };
  const s1 = 15 * (40000 / fs) - 2.5 * cc;
  const s2 = 12 * (40000 / fs);
  const s_max = Math.min(s1, s2);
  if (!(s_max > 0)) return { error: "Required spacing is not positive -- reduce cover or steel stress (the section needs redesign)." };
  return {
    s1_in: s1, s2_in: s2, s_max_in: s_max,
    governs: s1 <= s2 ? "s1 (cover term)" : "s2 (12 x 40000/fs cap)",
    note: "ACI 318-19 §24.3.2 maximum spacing of tension reinforcement for flexural crack control: s = 15(40000/fs) - 2.5 cc, but not more than 12(40000/fs), where fs is the service-load stress (permitted as 2/3 fy) and cc is the clear cover to the nearest bar surface. Wider spacing or higher stress opens wider cracks; more cover requires tighter spacing. This is a serviceability (crack-width) limit, not a strength check. A design aid; the engineer of record's stamped design governs.",
  };
}
export const concreteCrackControlSpacingExample = { inputs: { fs_psi: 40000, cc_in: 2 } };
CONCRETE_RENDERERS["concrete-crack-control-spacing"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 §24.3.2: maximum tension-bar spacing for flexural crack control s = 15(40000/fs) - 2.5 cc, not more than 12(40000/fs), with fs the service-load steel stress (may be taken as 2/3 fy) and cc the clear cover. A serviceability crack-control limit, not a strength check. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: concreteCrackControlSpacingExample.inputs,
  fields: [
    { key: "fs_psi", label: "Service steel stress fs (psi, default 2/3 fy)", kind: "number", default: 40000 },
    { key: "cc_in", label: "Clear cover cc (in)", kind: "number", default: 2 },
  ],
  outputs: [
    { key: "s1", id: "ccs-out-s1", label: "s1 = 15(40000/fs) - 2.5 cc", value: (r) => fmt(r.s1_in, 1) + " in" },
    { key: "s2", id: "ccs-out-s2", label: "s2 = 12(40000/fs) cap", value: (r) => fmt(r.s2_in, 1) + " in" },
    { key: "sm", id: "ccs-out-sm", label: "Max bar spacing", value: (r) => fmt(r.s_max_in, 1) + " in (" + r.governs + ")" },
    { key: "n", id: "ccs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteCrackControlSpacing,
});

// ===================== spec-v447: concrete threshold and cracking torsion (ACI 318-19 22.7) =====================
// dims: in { fc_psi: M L^-1 T^-2, b_in: L, h_in: L, lambda: dimensionless } out: { acp_in2: L^2, pcp_in: L, tth_inlb: M L^2 T^-2, neglect_inlb: M L^2 T^-2, tcr_inlb: M L^2 T^-2 }
export function computeConcreteTorsionThreshold({ fc_psi = 4000, b_in = 0, h_in = 0, lambda = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const fc = Number(fc_psi) || 0;
  const b = Number(b_in) || 0;
  const h = Number(h_in) || 0;
  const lam = Number(lambda) || 0;
  if (!(fc > 0)) return { error: "Specified strength f'c must be positive (psi)." };
  if (!(b > 0)) return { error: "Section width must be positive (in)." };
  if (!(h > 0)) return { error: "Section height must be positive (in)." };
  if (!(lam > 0)) return { error: "Lightweight factor lambda must be positive." };
  const acp_in2 = b * h;
  const pcp_in = 2 * (b + h);
  const tth_inlb = lam * Math.sqrt(fc) * (acp_in2 * acp_in2 / pcp_in);
  const neglect_inlb = 0.75 * tth_inlb;
  const tcr_inlb = 4 * tth_inlb;
  return {
    acp_in2, pcp_in, tth_inlb, neglect_inlb, tcr_inlb,
    note: "ACI 318-19 §22.7 torsion thresholds for a solid non-prestressed section: the threshold torsion Tth = lambda x sqrt(f'c) x (Acp^2 / pcp), where Acp = b x h is the area enclosed by the outside perimeter and pcp = 2(b + h) is that perimeter. Torsion may be neglected when the factored torque Tu is below phi x Tth (phi = 0.75); the section cracks in torsion at Tcr = 4 x Tth. Above phi x Tth the beam must be designed for torsion with closed stirrups (At/s) and longitudinal steel (Al) per §9.5.4. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  };
}
export const concreteTorsionThresholdExample = { inputs: { fc_psi: 4000, b_in: 12, h_in: 20, lambda: 1.0 } };
CONCRETE_RENDERERS["concrete-torsion-threshold"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 §22.7.4.1: threshold torsion Tth = lambda x sqrt(f'c) x (Acp^2/pcp), neglect torsion when Tu < phi x Tth (phi = 0.75), cracking torsion Tcr = 4 x Tth, with Acp and pcp the area and perimeter of the outside section. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: concreteTorsionThresholdExample.inputs,
  fields: [
    { key: "fc_psi", label: "Specified strength f'c (psi)", kind: "number", default: 4000 },
    { key: "b_in", label: "Section width b (in)", kind: "number", default: 12 },
    { key: "h_in", label: "Section height h (in)", kind: "number", default: 20 },
    { key: "lambda", label: "Lightweight factor lambda (1.0 normal)", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "tth", id: "ctt-out-tth", label: "Threshold torsion Tth", value: (r) => fmt(r.tth_inlb, 0) + " in-lb (" + fmt(r.tth_inlb / 12000, 2) + " ft-kip)" },
    { key: "ne", id: "ctt-out-ne", label: "Neglect if Tu below phi x Tth", value: (r) => fmt(r.neglect_inlb / 12000, 2) + " ft-kip" },
    { key: "tcr", id: "ctt-out-tcr", label: "Cracking torsion Tcr = 4 Tth", value: (r) => fmt(r.tcr_inlb / 12000, 2) + " ft-kip" },
    { key: "ap", id: "ctt-out-ap", label: "Acp / pcp", value: (r) => fmt(r.acp_in2, 0) + " in^2 / " + fmt(r.pcp_in, 0) + " in" },
    { key: "n", id: "ctt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteTorsionThreshold,
});

// ===================== spec-v490: concrete bearing strength (ACI 318-19 §22.8) =====================

// dims: in { loaded_area_in2: L^2, support_area_in2: L^2, fc_psi: M L^-1 T^-2, factored_load_kip: M L T^-2 } out: { sqrt_ratio: dimensionless, bn_lb: M L T^-2, phibn_kip: M L T^-2, dcr: dimensionless }
export function computeConcreteBearingStrength({ loaded_area_in2 = 0, support_area_in2 = 0, fc_psi = 4000, factored_load_kip = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const a1 = Number(loaded_area_in2) || 0;
  const a2 = Number(support_area_in2) || 0;
  const fc = Number(fc_psi) || 0;
  const pu = Number(factored_load_kip) || 0;
  if (!(a1 > 0)) return { error: "Loaded area A1 must be positive (in^2)." };
  if (!(a2 >= a1)) return { error: "Supporting area A2 must be at least the loaded area A1 (A2 < A1 is geometrically impossible)." };
  if (!(fc > 0)) return { error: "Concrete strength f'c must be positive (psi)." };
  if (pu < 0) return { error: "Factored load must be non-negative (kip; 0 = capacity only)." };
  const sqrt_ratio = Math.min(Math.sqrt(a2 / a1), 2.0);
  const bn_lb = 0.85 * fc * a1 * sqrt_ratio;
  const phibn_kip = 0.65 * bn_lb / 1000;
  const dcr = pu > 0 ? pu / phibn_kip : null;
  if (![sqrt_ratio, bn_lb, phibn_kip].every(Number.isFinite)) return { error: "Bearing-strength math is not a finite value." };
  return { sqrt_ratio, bn_lb, phibn_kip, dcr };
}

export const concreteBearingStrengthExample = { inputs: { loaded_area_in2: 144, support_area_in2: 1296, fc_psi: 4000, factored_load_kip: 500 } };

CONCRETE_RENDERERS["concrete-bearing-strength"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 §22.8.3 bearing strength: sqrt_ratio = min(sqrt(A2 / A1), 2.0), Bn = 0.85 x f'c x A1 x sqrt_ratio, phiBn = 0.65 x Bn (phi = 0.65 for bearing, §21.2). The sqrt(A2/A1) confinement bonus applies only when the supporting surface is wider than the loaded area on all sides and the slopes/steps meet §22.8.3.2, and it is capped at 2.0. A required bearing area exceeding the member may need a bearing plate or confinement reinforcement. A design aid, not a substitute for the structural engineer of record's stamped design.",
  example: concreteBearingStrengthExample.inputs,
  fields: [
    { key: "loaded_area_in2", label: "Loaded area A1 (in^2)", kind: "number" },
    { key: "support_area_in2", label: "Supporting area A2 (in^2, >= A1)", kind: "number" },
    { key: "fc_psi", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "factored_load_kip", label: "Factored load Pu (kip, 0 = capacity only)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "sr", id: "cbs-out-sr", label: "Confinement factor sqrt(A2/A1), capped at 2.0", value: (r) => fmt(r.sqrt_ratio, 3) + (r.sqrt_ratio >= 2 ? " (at the 2.0 cap)" : "") },
    { key: "bn", id: "cbs-out-bn", label: "Nominal bearing strength Bn", value: (r) => fmt(r.bn_lb, 0) + " lb (" + fmt(r.bn_lb / 1000, 1) + " kip)" },
    { key: "pb", id: "cbs-out-pb", label: "Design bearing strength phiBn (phi = 0.65)", value: (r) => fmt(r.phibn_kip, 1) + " kip" },
    { key: "dcr", id: "cbs-out-dcr", label: "Demand / capacity", value: (r) => r.dcr === null ? "- (no Pu entered)" : fmt(r.dcr, 2) + (r.dcr <= 1 ? " (OK)" : " (OVER)") },
  ],
  compute: computeConcreteBearingStrength,
});

// ===================== spec-v491: rebar compression development length (ACI 318-19 §25.4.9) =====================

// dims: in { bar_diameter_in: L, fy_psi: M L^-1 T^-2, fc_psi: M L^-1 T^-2, lambda: dimensionless, psi_r: dimensionless } out: { term1_in: L, term2_in: L, ldc_in: L, governing: dimensionless }
export function computeRcCompressionDevLength({ bar_diameter_in = 0, fy_psi = 60000, fc_psi = 4000, lambda = 1.0, psi_r = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const db = Number(bar_diameter_in) || 0;
  const fy = Number(fy_psi) || 0;
  const fc = Number(fc_psi) || 0;
  const lam = Number(lambda) || 0;
  const pr = Number(psi_r) || 0;
  if (!(db > 0)) return { error: "Bar diameter db must be positive (in)." };
  if (!(fy > 0)) return { error: "Bar yield fy must be positive (psi)." };
  if (!(fc > 0)) return { error: "Concrete strength f'c must be positive (psi)." };
  if (!(lam > 0 && lam <= 1)) return { error: "Lightweight factor lambda must be in (0, 1] (1.0 normalweight, 0.75 lightweight)." };
  if (!(pr >= 0.75 && pr <= 1.0)) return { error: "Confinement factor psi_r must be 0.75 to 1.0 (0.75 with ties/spiral per 25.4.9.3, else 1.0)." };
  const term1_in = (fy * pr) / (50 * lam * Math.sqrt(fc)) * db;
  const term2_in = 0.0003 * fy * pr * db;
  const ldc_in = Math.max(term1_in, term2_in, 8.0);
  const governing = ldc_in <= 8.0 ? "8 in minimum" : (term1_in >= term2_in ? "term1: fy / (50 lambda sqrt(f'c))" : "term2: 0.0003 fy floor");
  if (![term1_in, term2_in, ldc_in].every(Number.isFinite)) return { error: "Compression-development math is not a finite value." };
  return { term1_in, term2_in, ldc_in, governing };
}

export const rcCompressionDevLengthExample = { inputs: { bar_diameter_in: 1.0, fy_psi: 60000, fc_psi: 4000, lambda: 1.0, psi_r: 1.0 } };

CONCRETE_RENDERERS["rc-compression-dev-length"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 §25.4.9.2 compression development length ldc = max((fy x psi_r) / (50 x lambda x sqrt(f'c)) x db, 0.0003 x fy x psi_r x db, 8 in). Compression development is shorter than tension because the bar end bears on the concrete (no flexural-cracking penalty). The 0.0003 fy db term governs at high f'c, where the sqrt(f'c) term keeps shrinking. psi_r = 0.75 applies only where §25.4.9.3 confining reinforcement (ties or a spiral of the stated size and spacing) wraps the developed bar; lambda = 0.75 for lightweight concrete. Lap-splice (§25.5) and minimum-length provisions still apply. A design aid, not a substitute for the engineer of record's detailing.",
  example: rcCompressionDevLengthExample.inputs,
  fields: [
    { key: "bar_diameter_in", label: "Bar diameter db (in, #8 = 1.00)", kind: "number" },
    { key: "fy_psi", label: "Bar yield fy (psi)", kind: "number", default: 60000 },
    { key: "fc_psi", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "lambda", label: "Lightweight factor lambda (1.0 normalweight, 0.75 lightweight)", kind: "number", default: 1.0 },
    { key: "psi_r", label: "Confinement factor psi_r (0.75 with ties/spiral, else 1.0)", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "t1", id: "rcd-out-t1", label: "Term 1: fy / (50 lambda sqrt(f'c)) x db", value: (r) => fmt(r.term1_in, 2) + " in" },
    { key: "t2", id: "rcd-out-t2", label: "Term 2: 0.0003 fy db (floor)", value: (r) => fmt(r.term2_in, 2) + " in" },
    { key: "ld", id: "rcd-out-ld", label: "Compression development length ldc (8 in min)", value: (r) => fmt(r.ldc_in, 1) + " in" },
    { key: "gv", id: "rcd-out-gv", label: "Governing term", value: (r) => r.governing },
  ],
  compute: computeRcCompressionDevLength,
});

// ===================== spec-v497: long-term deflection multiplier (ACI 318-19 §24.2.4.1) =====================

// dims: in { immediate_defl_in: L, duration_months: T, comp_steel_ratio: dimensionless } out: { xi: dimensionless, lambda: dimensionless, additional_defl_in: L, total_defl_in: L }
export function computeConcreteLongtermDefl({ immediate_defl_in = 0, duration_months = 60, comp_steel_ratio = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const di = Number(immediate_defl_in) || 0;
  const mo = Number(duration_months) || 0;
  const rho = Number(comp_steel_ratio) || 0;
  if (di < 0) return { error: "Immediate deflection cannot be negative (in)." };
  if (!(mo > 0)) return { error: "Sustained-load duration must be positive (months)." };
  if (rho < 0) return { error: "Compression-steel ratio cannot be negative." };
  const xi = mo >= 60 ? 2.0 : mo >= 12 ? 1.4 : mo >= 6 ? 1.2 : 1.0;
  const lambda = xi / (1 + 50 * rho);
  const additional_defl_in = lambda * di;
  const total_defl_in = di + additional_defl_in;
  if (![xi, lambda, additional_defl_in, total_defl_in].every(Number.isFinite)) return { error: "Long-term-deflection math is not a finite value." };
  return { xi, lambda, additional_defl_in, total_defl_in };
}

export const concreteLongtermDeflExample = { inputs: { immediate_defl_in: 0.4, duration_months: 60, comp_steel_ratio: 0 } };

CONCRETE_RENDERERS["concrete-longterm-defl"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 §24.2.4.1.1 additional time-dependent (creep and shrinkage) deflection: lambda = xi / (1 + 50 rho'), additional = lambda x immediate, total = immediate + additional. The time factor xi is 2.0 at 5 years or more, 1.4 at 12 months, 1.2 at 6 months, 1.0 at 3 months. The multiplier applies to the immediate deflection from the SUSTAINED portion of the load (dead plus the sustained fraction of live). Compression reinforcement rho' = As'/(b d) reduces creep, so a doubly-reinforced beam deflects far less over time. The total long-term deflection is what the L/240 and L/480 serviceability limits are checked against; the immediate deflection itself comes from an effective-moment-of-inertia (Ie) analysis. A design aid, not a substitute for the engineer of record's design.",
  example: concreteLongtermDeflExample.inputs,
  fields: [
    { key: "immediate_defl_in", label: "Immediate deflection from sustained load (in)", kind: "number" },
    { key: "duration_months", label: "Sustained-load duration (months, >=60 = 5 yr)", kind: "number", default: 60 },
    { key: "comp_steel_ratio", label: "Compression-steel ratio rho' = As'/(b d) (0 if none)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "xi", id: "cld-out-xi", label: "Time factor xi", value: (r) => fmt(r.xi, 2) },
    { key: "lm", id: "cld-out-lm", label: "Creep multiplier lambda", value: (r) => fmt(r.lambda, 3) },
    { key: "ad", id: "cld-out-ad", label: "Additional long-term deflection", value: (r) => fmt(r.additional_defl_in, 3) + " in" },
    { key: "tot", id: "cld-out-tot", label: "Total deflection (immediate + long-term)", value: (r) => fmt(r.total_defl_in, 3) + " in" },
  ],
  compute: computeConcreteLongtermDefl,
});

// ===================== spec-v548: cast-in anchor tension concrete breakout (ACI 318-19 Ch. 17) =====================

// dims: in { embedment_in: L, fc_psi: M L^-1 T^-2, edge_distance_in: L, anchor_type: dimensionless, lambda: dimensionless } out: { nb_lb: M L T^-2, ncb_lb: M L T^-2, phi_ncb_lb: M L T^-2 }
export function computeConcreteAnchorBreakout({ embedment_in = 0, fc_psi = 0, edge_distance_in = 0, anchor_type = "cast-in", lambda = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const hef = Number(embedment_in) || 0;
  const fc = Number(fc_psi) || 0;
  const ca1 = Number(edge_distance_in) || 0;
  const lam = Number(lambda) || 0;
  if (!(hef > 0)) return { error: "Effective embedment must be positive (in)." };
  if (!(fc > 0)) return { error: "Concrete strength f'c must be positive (psi)." };
  if (ca1 < 0) return { error: "Edge distance cannot be negative (in)." };
  if (!(lam > 0)) return { error: "Lightweight factor lambda must be positive (1.0 normalweight)." };
  const kc = anchor_type === "cast-in" ? 24 : anchor_type === "post-installed" ? 17 : null;
  if (kc === null) return { error: "Anchor type must be cast-in or post-installed." };
  const nb_lb = kc * lam * Math.sqrt(fc) * Math.pow(hef, 1.5);
  const ANco = 9 * hef * hef;
  const psi_ed = ca1 < 1.5 * hef ? 0.7 + 0.3 * ca1 / (1.5 * hef) : 1.0;
  const ANc = Math.min(ca1 + 1.5 * hef, 3 * hef) * (2 * 1.5 * hef);
  const area_ratio = Math.min(ANc / ANco, 1.0);
  const ncb_lb = area_ratio * psi_ed * nb_lb;
  const phi_ncb_lb = 0.70 * ncb_lb;
  return {
    nb_lb, ANco, psi_ed, ANc, area_ratio, ncb_lb, phi_ncb_lb, kc,
    note: "The basic strength scales with the embedment to the 1.5 power (a deeper anchor gains fast); a near-edge anchor loses capacity to the edge factor psi_ed and a truncated projected area (a full cone needs 1.5 hef of edge on all sides). Cast-in (kc = 24) and post-installed (kc = 17) anchors differ; the cracked-vs-uncracked factor psi_c also applies (taken as 1.0 here). phi = 0.70 is Condition B (no supplementary reinforcement). ACI 318-19 Chapter 17 and the engineer of record govern.",
  };
}

export const concreteAnchorBreakoutExample = { inputs: { embedment_in: 6, fc_psi: 4000, edge_distance_in: 100, anchor_type: "cast-in", lambda: 1.0 } };

// ===================== spec-v552: slender column moment magnification, nonsway (ACI 318-19 6.6.4.5) =====================

// dims: in { factored_axial_kip: M L T^-2, end_moment_m2_kft: M L^2 T^-2, end_moment_m1_kft: M L^2 T^-2, unbraced_len_ft: L, eff_length_k: dimensionless, eff_stiffness_ei: M L^3 T^-2, column_dim_h_in: L } out: { cm: dimensionless, pc_kip: M L T^-2, delta_ns: dimensionless, mc_kft: M L^2 T^-2 }
export function computeRcSlenderColumnMagnify({ factored_axial_kip = 0, end_moment_m2_kft = 0, end_moment_m1_kft = 0, unbraced_len_ft = 0, eff_length_k = 1.0, eff_stiffness_ei = 0, column_dim_h_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Pu = Number(factored_axial_kip) || 0;
  const M2 = Number(end_moment_m2_kft) || 0;
  const M1 = Number(end_moment_m1_kft) || 0;
  const lu = Number(unbraced_len_ft) || 0;
  const k = Number(eff_length_k) || 0;
  const EI = Number(eff_stiffness_ei) || 0;
  const h = Number(column_dim_h_in) || 0;
  if (!(Pu > 0)) return { error: "Factored axial load must be positive (kip)." };
  if (!(M2 > 0)) return { error: "Larger end moment M2 must be positive (kip-ft)." };
  if (!(lu > 0)) return { error: "Unbraced length must be positive (ft)." };
  if (!(k > 0)) return { error: "Effective-length factor k must be positive." };
  if (!(EI > 0)) return { error: "Effective stiffness EI must be positive (kip-in^2)." };
  if (h < 0) return { error: "Column dimension h cannot be negative (in)." };
  const cm = Math.max(0.6 + 0.4 * (M1 / M2), 0.4);
  const lu_in = lu * 12;
  const pc_kip = Math.PI * Math.PI * EI / Math.pow(k * lu_in, 2);
  if (Pu >= 0.75 * pc_kip) return { error: "Axial load is at or above 0.75 x Pc - the column has buckled; increase the section or reduce the length." };
  const delta_ns = Math.max(cm / (1 - Pu / (0.75 * pc_kip)), 1.0);
  const m2_min_kft = Pu * (0.6 + 0.03 * h) / 12;
  const mc_kft = Math.max(delta_ns * M2, m2_min_kft);
  return {
    cm, pc_kip, delta_ns, m2_min_kft, mc_kft,
    note: "The critical buckling load Pc carries a 0.75 stiffness reduction in the denominator; the design moment is floored at M2,min = Pu(0.6 + 0.03h). A column just over the slenderness limit k lu/r <= 34 - 12(M1/M2) picks up a magnifier the flexure check never applies. M1/M2 is negative for double curvature (which lowers Cm). ACI 318 and the engineer of record govern.",
  };
}

export const rcSlenderColumnMagnifyExample = { inputs: { factored_axial_kip: 200, end_moment_m2_kft: 80, end_moment_m1_kft: 50, unbraced_len_ft: 14, eff_length_k: 1.0, eff_stiffness_ei: 1500000, column_dim_h_in: 16 } };

CONCRETE_RENDERERS["rc-slender-column-magnify"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 Section 6.6.4.5 nonsway (braced) moment magnifier: Cm = max(0.6 + 0.4 M1/M2, 0.4); Pc = pi^2 EI / (k lu)^2; delta_ns = max(Cm / (1 - Pu/(0.75 Pc)), 1.0); Mc = max(delta_ns M2, M2,min), M2,min = Pu(0.6 + 0.03h). The 0.75 stiffness reduction sits in the denominator; the moment is floored at M2,min. A column just over the slenderness limit picks up an amplifier the flexure check never applies. ACI 318 and the engineer of record govern.",
  example: rcSlenderColumnMagnifyExample.inputs,
  fields: [
    { key: "factored_axial_kip", label: "Factored axial load Pu (kip)", kind: "number" },
    { key: "end_moment_m2_kft", label: "Larger end moment M2 (kip-ft)", kind: "number" },
    { key: "end_moment_m1_kft", label: "Smaller end moment M1 (kip-ft, - double curvature)", kind: "number" },
    { key: "unbraced_len_ft", label: "Unbraced length lu (ft)", kind: "number" },
    { key: "eff_length_k", label: "Effective-length factor k", kind: "number", default: 1.0 },
    { key: "eff_stiffness_ei", label: "Effective stiffness EI (kip-in^2)", kind: "number" },
    { key: "column_dim_h_in", label: "Column dimension h (in)", kind: "number" },
  ],
  outputs: [
    { key: "cm", id: "scm-out-cm", label: "Cm", value: (r) => fmt(r.cm, 3) },
    { key: "pc", id: "scm-out-pc", label: "Critical buckling load Pc", value: (r) => fmt(r.pc_kip, 1) + " kip" },
    { key: "dns", id: "scm-out-dns", label: "Moment magnifier delta_ns", value: (r) => fmt(r.delta_ns, 2) },
    { key: "mc", id: "scm-out-mc", label: "Magnified design moment Mc", value: (r) => fmt(r.mc_kft, 1) + " kip-ft (M2,min " + fmt(r.m2_min_kft, 1) + ")" },
  ],
  compute: computeRcSlenderColumnMagnify,
});

// ===================== spec-v556: concrete corbel / bracket design (ACI 318-19 16.5) =====================

// dims: in { factored_shear_lb: M L T^-2, horiz_tension_lb: M L T^-2, shear_span_av_in: L, eff_depth_d_in: L, height_h_in: L, width_b_in: L, fc_psi: M L^-1 T^-2, fy_psi: M L^-1 T^-2, friction_mu: dimensionless } out: { nuc_lb: M L T^-2, asc_in2: L^2, phi_vn_lb: M L T^-2 }
export function computeConcreteCorbelBracket({ factored_shear_lb = 0, horiz_tension_lb = 0, shear_span_av_in = 0, eff_depth_d_in = 0, height_h_in = 0, width_b_in = 0, fc_psi = 4000, fy_psi = 60000, friction_mu = 1.4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Vu = Number(factored_shear_lb) || 0;
  const Nuc_in = Number(horiz_tension_lb) || 0;
  const av = Number(shear_span_av_in) || 0;
  const d = Number(eff_depth_d_in) || 0;
  const h = Number(height_h_in) || 0;
  const b = Number(width_b_in) || 0;
  const fc = Number(fc_psi) || 0;
  const fy = Number(fy_psi) || 0;
  const mu = Number(friction_mu) || 0;
  if (!(Vu > 0)) return { error: "Factored shear Vu must be positive (lb)." };
  if (!(d > 0)) return { error: "Effective depth d must be positive (in)." };
  if (!(b > 0)) return { error: "Width b must be positive (in)." };
  if (!(h > 0)) return { error: "Height h must be positive (in)." };
  if (!(fc > 0)) return { error: "Concrete strength f'c must be positive (psi)." };
  if (!(fy > 0)) return { error: "Yield strength fy must be positive (psi)." };
  if (!(mu > 0)) return { error: "Shear-friction coefficient must be positive." };
  if (av < 0) return { error: "Shear span cannot be negative (in)." };
  if (av > d) return { error: "Shear span av exceeds d (av/d > 1) - outside the ACI 16.5 corbel range; design as a cantilever beam." };
  const nuc_lb = Math.max(Nuc_in, 0.2 * Vu);
  const avf_in2 = Vu / (0.75 * mu * fy);
  const mu_lbin = Vu * av + nuc_lb * (h - d);
  const af_in2 = mu_lbin / (0.75 * fy * 0.85 * d);
  const an_in2 = nuc_lb / (0.75 * fy);
  const flex_path = af_in2 + an_in2;
  const sf_path = (2 / 3) * avf_in2 + an_in2;
  const asc_in2 = Math.max(flex_path, sf_path);
  const governing_path = flex_path >= sf_path ? "flexure + tension" : "shear-friction + tension";
  const phi_vn_lb = 0.75 * Math.min(0.2 * fc, 480 + 0.08 * fc, 1600) * b * d;
  return {
    nuc_lb, avf_in2, af_in2, an_in2, flex_path, sf_path, asc_in2, governing_path, phi_vn_lb, shear_ok: Vu <= phi_vn_lb,
    note: "The horizontal tension Nuc of at least 0.2 Vu is mandatory (restrained shrinkage and creep drag on the bearing) and drives the top steel. The primary steel is the greater of the flexure-plus-tension and shear-friction-plus-tension paths (which governs flips with the shear span). The shear is capped by the min-of-three limit, not the sqrt(f'c) shear, so a deep short corbel is cap-governed. ACI 318 and the engineer of record govern.",
  };
}

export const concreteCorbelBracketExample = { inputs: { factored_shear_lb: 40000, horiz_tension_lb: 0, shear_span_av_in: 4, eff_depth_d_in: 12, height_h_in: 14, width_b_in: 14, fc_psi: 4000, fy_psi: 60000, friction_mu: 1.4 } };

CONCRETE_RENDERERS["concrete-corbel-bracket"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 Section 16.5 brackets and corbels: Nuc = max(input, 0.2 Vu); Avf = Vu/(phi mu fy); Mu = Vu av + Nuc(h - d); Af = Mu/(phi fy 0.85 d); An = Nuc/(phi fy); Asc = max(Af + An, (2/3)Avf + An); phiVn = phi min(0.2 f'c, 480 + 0.08 f'c, 1600) b d (phi = 0.75). The 0.2 Vu horizontal tension is mandatory and drives the top steel; the primary steel is the greater of two paths; the shear is capped by the min-of-three limit. ACI 318 and the engineer of record govern.",
  example: concreteCorbelBracketExample.inputs,
  fields: [
    { key: "factored_shear_lb", label: "Factored shear Vu (lb)", kind: "number" },
    { key: "horiz_tension_lb", label: "Horizontal tension Nuc (lb, clamped to 0.2 Vu)", kind: "number" },
    { key: "shear_span_av_in", label: "Shear span av (in, av/d <= 1)", kind: "number" },
    { key: "eff_depth_d_in", label: "Effective depth d (in)", kind: "number" },
    { key: "height_h_in", label: "Total height h (in)", kind: "number" },
    { key: "width_b_in", label: "Width b (in)", kind: "number" },
    { key: "fc_psi", label: "Concrete f'c (psi)", kind: "number", default: 4000 },
    { key: "fy_psi", label: "Steel fy (psi)", kind: "number", default: 60000 },
    { key: "friction_mu", label: "Shear-friction mu", kind: "number", default: 1.4 },
  ],
  outputs: [
    { key: "n", id: "ccb-out-n", label: "Mandatory tension Nuc", value: (r) => fmt(r.nuc_lb, 0) + " lb" },
    { key: "asc", id: "ccb-out-asc", label: "Primary steel Asc (governing)", value: (r) => fmt(r.asc_in2, 3) + " in^2 (" + r.governing_path + ")" },
    { key: "paths", id: "ccb-out-paths", label: "Flexure vs shear-friction path", value: (r) => fmt(r.flex_path, 3) + " / " + fmt(r.sf_path, 3) + " in^2" },
    { key: "v", id: "ccb-out-v", label: "Shear cap phiVn", value: (r) => fmt(r.phi_vn_lb / 1000, 1) + " kip - " + (r.shear_ok ? "OK" : "OVER, deepen the corbel") },
  ],
  compute: computeConcreteCorbelBracket,
});

CONCRETE_RENDERERS["concrete-anchor-breakout"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 Section 17.6.2 concrete breakout in tension (CCD method): Nb = kc lambda sqrt(f'c) hef^1.5 (kc = 24 cast-in, 17 post-installed), ANco = 9 hef^2, edge factor psi_ed = 0.7 + 0.3 ca1/(1.5 hef) when ca1 < 1.5 hef, Ncb = (ANc/ANco) psi_ed Nb, phiNcb = 0.70 Ncb (Condition B, no supplementary reinforcement). The basic strength scales with embedment^1.5; a near-edge anchor loses capacity to the edge factor and a truncated projected area. Cracked-vs-uncracked psi_c applies (1.0 here). ACI 318 Chapter 17 and the engineer of record govern.",
  example: concreteAnchorBreakoutExample.inputs,
  fields: [
    { key: "embedment_in", label: "Effective embedment hef (in)", kind: "number" },
    { key: "fc_psi", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "edge_distance_in", label: "Nearest edge distance ca1 (in, large = away)", kind: "number" },
    { key: "anchor_type", label: "Anchor type", kind: "select", options: [{ value: "cast-in", label: "Cast-in (kc = 24)" }, { value: "post-installed", label: "Post-installed (kc = 17)" }] },
    { key: "lambda", label: "Lightweight factor lambda", kind: "number", default: 1.0 },
  ],
  outputs: [
    { key: "nb", id: "cab-out-nb", label: "Basic breakout Nb", value: (r) => fmt(r.nb_lb, 0) + " lb" },
    { key: "ncb", id: "cab-out-ncb", label: "Nominal breakout Ncb (edge-modified)", value: (r) => fmt(r.ncb_lb, 0) + " lb (psi_ed " + fmt(r.psi_ed, 2) + ", area " + fmt(r.area_ratio, 3) + ")" },
    { key: "phi", id: "cab-out-phi", label: "Design capacity phiNcb", value: (r) => fmt(r.phi_ncb_lb, 0) + " lb" },
    { key: "n", id: "cab-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteAnchorBreakout,
});

// --- spec-v612 E: Concrete headed-anchor pullout (ACI 318-19 17.6.3) ---
// Np = 8 * Abrg * fc. Npn = psi_cP * Np (1.4 uncracked, 1.0 cracked). phiNpn = 0.70 * Npn.
// dims: in { head_bearing_area_in2: L^2, fc_psi: M L^-1 T^-2, cracking: dimensionless } out: { np_lb: M L T^-2, npn_lb: M L T^-2, phi_npn_lb: M L T^-2 }
export function computeConcreteAnchorPullout({ head_bearing_area_in2 = 0, fc_psi = 0, cracking = "cracked" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const abrg = Number(head_bearing_area_in2) || 0;
  const fc = Number(fc_psi) || 0;
  if (!(abrg > 0)) return { error: "Head bearing area must be positive (in^2)." };
  if (!(fc > 0)) return { error: "Concrete strength must be positive (psi)." };
  const uncracked = cracking === "uncracked";
  if (cracking !== "cracked" && cracking !== "uncracked") return { error: "Cracking must be cracked or uncracked." };
  const psi_cP = uncracked ? 1.4 : 1.0;
  const np_lb = 8 * abrg * fc;
  const npn_lb = psi_cP * np_lb;
  const phi_npn_lb = 0.70 * npn_lb;
  return {
    np_lb, npn_lb, phi_npn_lb, psi_cP,
    note: "Pullout does not depend on embedment - deepening the anchor does not raise it (that is the breakout mode). It applies to headed anchors where the head bears on the concrete, not to adhesive or expansion anchors (which use a tested bond or slip value). Abrg is the net bearing area of the head or nut. The 1.4 uncracked factor applies only when analysis shows the concrete stays uncracked at service load; use 1.0 otherwise. phi = 0.70 is Condition B (no supplementary reinforcement). ACI 318 Chapter 17 and the engineer of record govern - a design check, not a stamped anchor design.",
  };
}
export const concreteAnchorPulloutExample = { inputs: { head_bearing_area_in2: 0.654, fc_psi: 4000, cracking: "cracked" } };
CONCRETE_RENDERERS["concrete-anchor-pullout"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 Section 17.6.3 headed-anchor pullout: Np = 8 x Abrg x f'c; Npn = psi_cP x Np (psi_cP = 1.4 uncracked at service, 1.0 cracked); phiNpn = 0.70 x Npn (Condition B, no supplementary reinforcement). Pullout does not depend on embedment (that is the breakout mode); it applies to headed anchors where the head bears on the concrete, not adhesive or expansion anchors. Abrg is the net bearing area of the head or nut. ACI 318 Chapter 17 and the engineer of record govern.",
  example: concreteAnchorPulloutExample.inputs,
  fields: [
    { key: "head_bearing_area_in2", label: "Head/nut net bearing area Abrg (in^2)", kind: "number" },
    { key: "fc_psi", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "cracking", label: "Concrete condition at service", kind: "select", options: [{ value: "cracked", label: "Cracked (psi_cP = 1.0)", selected: true }, { value: "uncracked", label: "Uncracked (psi_cP = 1.4)" }] },
  ],
  outputs: [
    { key: "np", id: "cap-out-np", label: "Basic pullout Np", value: (r) => fmt(r.np_lb, 0) + " lb (" + fmt(r.np_lb / 1000, 1) + " kip)" },
    { key: "npn", id: "cap-out-npn", label: "Nominal pullout Npn", value: (r) => fmt(r.npn_lb, 0) + " lb (psi_cP " + fmt(r.psi_cP, 1) + ")" },
    { key: "phi", id: "cap-out-phi", label: "Design pullout phiNpn", value: (r) => fmt(r.phi_npn_lb, 0) + " lb (" + fmt(r.phi_npn_lb / 1000, 1) + " kip)" },
    { key: "n", id: "cap-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteAnchorPullout,
});

// --- spec-v617 E: Concrete anchor side-face blowout (ACI 318-19 17.6.4) ---
// Nsb = 160 * ca1 * sqrt(Abrg) * lambda * sqrt(f'c); corner (1 + ca2/ca1)/4 when ca2 < 3 ca1; phi = 0.70. Governs when hef > 2.5 ca1.
// dims: in { edge_distance_in: L, head_bearing_area_in2: L^2, fc_psi: M L^-1 T^-2, embedment_in: L, perp_edge_in: L, lambda: dimensionless } out: { nsb_lb: M L T^-2, corner_factor: dimensionless, nsbn_lb: M L T^-2, phi_nsb_lb: M L T^-2 }
export function computeConcreteAnchorBlowout({ edge_distance_in = 0, head_bearing_area_in2 = 0, fc_psi = 0, embedment_in = 0, perp_edge_in = 0, lambda = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ca1 = Number(edge_distance_in) || 0;
  const abrg = Number(head_bearing_area_in2) || 0;
  const fc = Number(fc_psi) || 0;
  const hef = Number(embedment_in) || 0;
  const ca2 = Number(perp_edge_in) || 0;
  const lam = Number(lambda) || 0;
  if (!(ca1 > 0)) return { error: "Edge distance c_a1 must be positive (in)." };
  if (!(abrg > 0)) return { error: "Head bearing area must be positive (in^2)." };
  if (!(fc > 0)) return { error: "Concrete strength must be positive (psi)." };
  if (!(hef > 0)) return { error: "Embedment must be positive (in)." };
  if (!(lam > 0 && lam <= 1)) return { error: "Lambda must be in (0, 1] (1.0 normal weight)." };
  if (ca2 < 0) return { error: "Perpendicular edge distance must be zero (none) or positive (in)." };
  if (ca2 > 0 && ca2 < ca1) return { error: "c_a1 must be the minimum edge distance - swap the edges so c_a1 <= c_a2." };
  const nsb_lb = 160 * ca1 * Math.sqrt(abrg) * lam * Math.sqrt(fc);
  const corner_factor = ca2 > 0 && ca2 < 3 * ca1 ? (1 + ca2 / ca1) / 4 : 1.0;
  const nsbn_lb = nsb_lb * corner_factor;
  const phi_nsb_lb = 0.70 * nsbn_lb;
  const applicable = hef > 2.5 * ca1;
  return {
    nsb_lb, corner_factor, nsbn_lb, phi_nsb_lb, applicable,
    note: (applicable
      ? "Blowout governs at this embedment (hef > 2.5 c_a1) - the strength does not depend on embedment; the edge distance is the knob."
      : "NOT the governing mode here: hef <= 2.5 c_a1, so concrete breakout (concrete-anchor-breakout) governs; the blowout numbers are shown for reference.")
      + " Applies to headed cast-in anchors where the head bears on the concrete. Closely spaced anchors along the edge interact per ACI 318-19 17.6.4.2 (not included). phi = 0.70 is Condition B (no supplementary reinforcement). ACI 318 Chapter 17 and the engineer of record govern - a design check, not a stamped anchor design.",
  };
}
export const concreteAnchorBlowoutExample = { inputs: { edge_distance_in: 3, head_bearing_area_in2: 0.654, fc_psi: 4000, embedment_in: 10, perp_edge_in: 0, lambda: 1.0 } };
CONCRETE_RENDERERS["concrete-anchor-blowout"] = _simpleRenderer({
  citation: "Citation: ACI 318-19 Section 17.6.4 side-face blowout: Nsb = 160 x c_a1 x sqrt(Abrg) x lambda_a x sqrt(f'c); corner modification (1 + c_a2/c_a1)/4 where c_a2 < 3 c_a1; phiNsb = 0.70 x Nsb (Condition B). Governs for headed cast-in anchors with deep embedment near an edge (hef > 2.5 c_a1; shallower anchors are governed by breakout) and does not depend on embedment. Closely spaced anchors along the edge interact per 17.6.4.2. ACI 318 Chapter 17 and the engineer of record govern.",
  example: concreteAnchorBlowoutExample.inputs,
  fields: [
    { key: "edge_distance_in", label: "Nearest edge distance c_a1 (in)", kind: "number" },
    { key: "head_bearing_area_in2", label: "Head/nut net bearing area Abrg (in^2)", kind: "number" },
    { key: "fc_psi", label: "Concrete strength f'c (psi)", kind: "number", default: 4000 },
    { key: "embedment_in", label: "Embedment hef (in)", kind: "number" },
    { key: "perp_edge_in", label: "Perpendicular edge c_a2 (in, 0 = none)", kind: "number", default: 0 },
    { key: "lambda", label: "Lightweight factor lambda_a (1.0 normal weight)", kind: "number", default: 1 },
  ],
  outputs: [
    { key: "nsb", id: "cab-out-nsb", label: "Basic blowout Nsb", value: (r) => fmt(r.nsb_lb, 0) + " lb (" + fmt(r.nsb_lb / 1000, 1) + " kip)" },
    { key: "nsbn", id: "cab-out-nsbn", label: "Nominal Nsbn (corner factor)", value: (r) => fmt(r.nsbn_lb, 0) + " lb (factor " + fmt(r.corner_factor, 3) + ")" },
    { key: "phi", id: "cab-out-phi", label: "Design phiNsb", value: (r) => fmt(r.phi_nsb_lb, 0) + " lb (" + fmt(r.phi_nsb_lb / 1000, 1) + " kip)" + (r.applicable ? "" : " - breakout governs (hef <= 2.5 c_a1)") },
    { key: "n", id: "cab-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteAnchorBlowout,
});

// ===================== spec-v793: fresh (batch) concrete temperature (ACI 305.1) =====================
// Mass-weighted thermal-energy balance: mixture T = sum(c_i m_i T_i) / sum(c_i m_i), with the specific
// heat of solids (cement + aggregate) ~0.22 Btu/lb-F and water = 1.0. Free surface moisture on the
// aggregate is water at the aggregate temperature.
// dims: in { agg_weight_lb: M, agg_temp_f: T, cement_weight_lb: M, cement_temp_f: T, water_weight_lb: M, water_temp_f: T, agg_moisture_weight_lb: M } out: { concrete_temp_f: T }
export function computeFreshConcreteTemp({ agg_weight_lb = 0, agg_temp_f = 0, cement_weight_lb = 0, cement_temp_f = 0, water_weight_lb = 0, water_temp_f = 0, agg_moisture_weight_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Wa = Number(agg_weight_lb) || 0;
  const Ta = Number(agg_temp_f);
  const Wc = Number(cement_weight_lb) || 0;
  const Tc = Number(cement_temp_f);
  const Ww = Number(water_weight_lb) || 0;
  const Tw = Number(water_temp_f);
  const Wwa = Number(agg_moisture_weight_lb) || 0;
  if (!(Wa > 0)) return { error: "Aggregate weight must be positive (lb)." };
  if (!(Wc > 0)) return { error: "Cement weight must be positive (lb)." };
  if (!(Ww > 0)) return { error: "Added (mix) water weight must be positive (lb)." };
  if (Wwa < 0) return { error: "Aggregate free-moisture weight cannot be negative (lb)." };
  if (![Ta, Tc, Tw].every(Number.isFinite)) return { error: "Enter valid temperatures (F)." };
  const num = 0.22 * (Ta * Wa + Tc * Wc) + Tw * Ww + Ta * Wwa;
  const den = 0.22 * (Wa + Wc) + Ww + Wwa;
  if (!(den > 0)) return { error: "The total heat-capacity weight must be positive." };
  const concrete_temp_f = num / den;
  if (!Number.isFinite(concrete_temp_f)) return { error: "Fresh-concrete-temperature math is not a finite value." };
  const hot = concrete_temp_f > 90;
  return {
    concrete_temp_f, hot,
    note: "ACI 305.1 fresh-concrete temperature by heat balance: the mix temperature is the mass-weighted average of its ingredients, weighting the solids (cement and aggregate) by their specific heat ~0.22 Btu/lb-F and water by 1.0, so T = [0.22(Ta Wa + Tc Wc) + Tw Ww + Twa Wwa] / [0.22(Wa + Wc) + Ww + Wwa]. Because water's heat capacity is over four times the solids', the MIX WATER is the cheapest lever -- chilling it, or replacing part of it with ice (crediting the 144 Btu/lb heat of fusion), pulls the batch down the most per pound. The aggregate, being the largest mass, sets the baseline, and its free surface moisture rides at the aggregate temperature. Hot-weather concreting (ACI 305) commonly caps the placing temperature near 90 F; above it, set time shortens, slump loss and plastic-shrinkage cracking rise, and 28-day strength can drop. Cement heat of hydration and mixer friction add a few degrees this static balance omits. A batching aid; the mix design and the project specification govern.",
  };
}
export const freshConcreteTempExample = { inputs: { agg_weight_lb: 3000, agg_temp_f: 80, cement_weight_lb: 564, cement_temp_f: 150, water_weight_lb: 240, water_temp_f: 70, agg_moisture_weight_lb: 60 } };
CONCRETE_RENDERERS["fresh-concrete-temp"] = _simpleRenderer({
  citation: "Citation: ACI 305.1 hot-weather fresh-concrete temperature (heat balance): T = [0.22(Ta Wa + Tc Wc) + Tw Ww + Twa Wwa] / [0.22(Wa + Wc) + Ww + Wwa], solids specific heat ~0.22 Btu/lb-F, water 1.0, free aggregate moisture at the aggregate temperature. Water is the cheapest lever (chill it or add ice, 144 Btu/lb of fusion). ACI 305 commonly caps placing near 90 F. Omits hydration heat and mixer friction. A batching aid; the mix design and spec govern.",
  example: freshConcreteTempExample.inputs,
  fields: [
    { key: "agg_weight_lb", label: "Aggregate weight (lb)", kind: "number", default: 3000 },
    { key: "agg_temp_f", label: "Aggregate temperature (F)", kind: "number", default: 80 },
    { key: "cement_weight_lb", label: "Cement weight (lb)", kind: "number", default: 564 },
    { key: "cement_temp_f", label: "Cement temperature (F)", kind: "number", default: 150 },
    { key: "water_weight_lb", label: "Added (mix) water weight (lb)", kind: "number", default: 240 },
    { key: "water_temp_f", label: "Mix water temperature (F)", kind: "number", default: 70 },
    { key: "agg_moisture_weight_lb", label: "Free moisture on aggregate (lb)", kind: "number", default: 60 },
  ],
  outputs: [
    { key: "t", id: "fct-out-t", label: "Fresh concrete temperature", value: (r) => fmt(r.concrete_temp_f, 1) + " F" + (r.hot ? " -- above the ~90 F hot-weather ceiling" : "") },
    { key: "n", id: "fct-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFreshConcreteTemp,
});

// ===================== spec-v918: curing compound coverage =====================
// dims: in { slab_area_sf: L^2, coats: dimensionless, coverage_sf_per_gal: L^2, waste_pct: dimensionless } out: { gallons_needed: dimensionless, gallons_exact: dimensionless, pails_5gal: dimensionless }
export function computeCuringCompoundCoverage({ slab_area_sf = 2500, coats = 1, coverage_sf_per_gal = 200, waste_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(slab_area_sf > 0)) return { error: "Slab area must be positive (sf)." };
  if (!(coats > 0)) return { error: "Coats must be positive." };
  if (!(coverage_sf_per_gal > 0)) return { error: "Coverage rate must be positive (sf/gal)." };
  if (waste_pct < 0) return { error: "Waste cannot be negative (percent)." };
  const gallons_exact = slab_area_sf * coats / coverage_sf_per_gal * (100 + waste_pct) / 100;
  const gallons_needed = Math.ceil(gallons_exact);
  const pails_5gal = Math.ceil(gallons_needed / 5);
  if (![gallons_exact, gallons_needed, pails_5gal].every(Number.isFinite)) return { error: "Coverage math is not a finite value." };
  return {
    gallons_exact,
    gallons_needed,
    pails_5gal,
    note: "Liquid membrane-forming curing compound (ASTM C309): gallons = area x coats / coverage, rounded up. Coverage runs about 200 sf/gal but the product label governs -- a rougher broom or tined finish, a second coat, and vertical faces all cut it. Apply right after the surface sheen leaves so the membrane seals in the mix water; a dissipating-resin (Type 1-D) or a white-pigmented (Type 2, reflects heat) is chosen per the job. A material-ordering estimate; the product data sheet and the spec govern the rate and the type.",
  };
}
export const curingCompoundCoverageExample = { inputs: { slab_area_sf: 2500, coats: 1, coverage_sf_per_gal: 200, waste_pct: 0 } };

CONCRETE_RENDERERS["curing-compound-coverage"] = _simpleRenderer({
  citation: "Citation: liquid membrane cure coverage by name (ASTM C309). gallons = ceil(area x coats / coverage x (1 + waste)); coverage ~200 sf/gal but the product label governs. Apply after the surface sheen leaves. A material estimate; the product data sheet and the spec govern.",
  example: curingCompoundCoverageExample.inputs,
  fields: [
    { key: "slab_area_sf", label: "Slab area (sf)", kind: "number", default: 2500 },
    { key: "coats", label: "Coats", kind: "number", default: 1 },
    { key: "coverage_sf_per_gal", label: "Coverage (sf/gal, label governs)", kind: "number", default: 200 },
    { key: "waste_pct", label: "Waste / overspray (%)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "g", id: "ccc-out-g", label: "Curing compound", value: (r) => fmt(r.gallons_needed, 0) + " gal (" + fmt(r.gallons_exact, 1) + " exact)" },
    { key: "p", id: "ccc-out-p", label: "5-gallon pails", value: (r) => fmt(r.pails_5gal, 0) + " pails" },
    { key: "n", id: "ccc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCuringCompoundCoverage,
});

// ===================== spec-v921: concrete isolation-joint filler takeoff =====================
// dims: in { slab_length_ft: L, slab_width_ft: L, num_columns: dimensionless, column_perimeter_ft: L, strip_length_ft: L } out: { slab_perimeter_ft: L, column_isolation_ft: L, filler_lf: L, strips: dimensionless }
export function computeConcreteIsolationJoint({ slab_length_ft = 40, slab_width_ft = 30, num_columns = 6, column_perimeter_ft = 4, strip_length_ft = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(slab_length_ft > 0)) return { error: "Slab length must be positive (ft)." };
  if (!(slab_width_ft > 0)) return { error: "Slab width must be positive (ft)." };
  if (num_columns < 0) return { error: "Column count cannot be negative." };
  if (column_perimeter_ft < 0) return { error: "Column perimeter cannot be negative (ft)." };
  if (!(strip_length_ft > 0)) return { error: "Strip length must be positive (ft)." };
  const slab_perimeter_ft = 2 * (slab_length_ft + slab_width_ft);
  const column_isolation_ft = Math.round(num_columns) * column_perimeter_ft;
  const filler_lf = slab_perimeter_ft + column_isolation_ft;
  const strips = Math.ceil(filler_lf / strip_length_ft);
  if (![slab_perimeter_ft, column_isolation_ft, filler_lf, strips].every(Number.isFinite)) return { error: "Isolation-joint math is not a finite value." };
  return {
    slab_perimeter_ft,
    column_isolation_ft,
    filler_lf,
    strips,
    note: "Pre-molded isolation-joint filler (usually 1/2 in fiber or foam) wraps a slab-on-grade wherever it abuts a rigid element so the slab can move independently: the slab perimeter against walls and footings, plus the full perimeter of each column, pier, or equipment pad it surrounds. filler = 2 x (L + W) + columns x column-perimeter; strips = ceil(filler / strip length). A 40 x 30 ft slab around six 12 in columns is 164 LF, 17 ten-foot strips. This is distinct from the sawn CONTROL joints (concrete-sawcut-footage), which relieve shrinkage within the slab. The structural and slab-on-grade details (ACI 302 / ACI 360) govern the joint locations and the filler.",
  };
}
export const concreteIsolationJointExample = { inputs: { slab_length_ft: 40, slab_width_ft: 30, num_columns: 6, column_perimeter_ft: 4, strip_length_ft: 10 } };

CONCRETE_RENDERERS["concrete-isolation-joint"] = _simpleRenderer({
  citation: "Citation: isolation-joint filler takeoff by name. filler = 2 x (L + W) + columns x column-perimeter; strips = ceil(filler / strip length). Isolation joints let a slab move independently of rigid elements (walls, footings, columns); distinct from sawn control joints. ACI 302 / ACI 360 and the structural detail govern.",
  example: concreteIsolationJointExample.inputs,
  fields: [
    { key: "slab_length_ft", label: "Slab length (ft)", kind: "number", default: 40 },
    { key: "slab_width_ft", label: "Slab width (ft)", kind: "number", default: 30 },
    { key: "num_columns", label: "Columns / piers in the slab", kind: "number", default: 6 },
    { key: "column_perimeter_ft", label: "Perimeter per column (ft, 12 in sq = 4)", kind: "number", default: 4 },
    { key: "strip_length_ft", label: "Filler strip length (ft)", kind: "number", default: 10 },
  ],
  outputs: [
    { key: "f", id: "cij-out-f", label: "Isolation-joint filler", value: (r) => fmt(r.filler_lf, 0) + " LF (" + fmt(r.slab_perimeter_ft, 0) + " perimeter + " + fmt(r.column_isolation_ft, 0) + " columns)" },
    { key: "s", id: "cij-out-s", label: "Filler strips", value: (r) => fmt(r.strips, 0) + " strips" },
    { key: "n", id: "cij-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteIsolationJoint,
});

// ===================== spec-v936: concrete stair / stoop volume takeoff =====================
// dims: in { num_risers: dimensionless, riser_in: L, tread_in: L, width_in: L, throat_in: L } out: { volume_in3: L^3, volume_ft3: L^3, volume_cy: L^3 }
export function computeConcreteStairVolume({ num_risers = 4, riser_in = 7, tread_in = 11, width_in = 48, throat_in = 4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(num_risers >= 1)) return { error: "Number of risers must be at least 1." };
  if (!(riser_in > 0)) return { error: "Riser height must be positive (in)." };
  if (!(tread_in > 0)) return { error: "Tread depth must be positive (in)." };
  if (!(width_in > 0)) return { error: "Width must be positive (in)." };
  if (!(throat_in > 0)) return { error: "Throat (waist) thickness must be positive (in)." };
  const n = Math.round(num_risers);
  // Cross-section = the sawtooth steps (n triangles of 1/2 R T) plus the raking waist slab (throat x rake length).
  const steps_area = n * 0.5 * riser_in * tread_in;
  const rake_length = Math.sqrt((n * riser_in) ** 2 + (n * tread_in) ** 2);
  const slab_area = throat_in * rake_length;
  const volume_in3 = (steps_area + slab_area) * width_in;
  const volume_ft3 = volume_in3 / 1728;
  const volume_cy = volume_in3 / 46656;
  if (![volume_in3, volume_ft3, volume_cy].every(Number.isFinite)) return { error: "Stair-volume math is not a finite value." };
  return {
    volume_in3,
    volume_ft3,
    volume_cy,
    note: "Concrete volume of a poured stair or stoop = the stepped wedge plus the raking waist slab: cross-section = n triangular steps (each 1/2 x riser x tread) + the throat slab (throat thickness x the rake length sqrt((n x riser)^2 + (n x tread)^2)), times the width. A 4-riser stoop at 7 in rise, 11 in tread, 48 in wide on a 4 in throat is about 10.1 ft3 (0.37 cy). Order a bit over -- this is the neat geometry, and it ignores the nosing overhang, a top landing or bottom footing, the reinforcing displacement, and the fact that the run is taken as risers x tread. A ready-mix ordering estimate; the structural stair detail and the finisher's forms govern the actual pour." ,
  };
}

export const concreteStairVolumeExample = { inputs: { num_risers: 4, riser_in: 7, tread_in: 11, width_in: 48, throat_in: 4 } };

CONCRETE_RENDERERS["concrete-stair-volume"] = _simpleRenderer({
  citation: "Citation: concrete stair volume geometry by name. cross-section = n x (1/2 x riser x tread) steps + throat x rake-length slab; volume = cross-section x width; cy = in3 / 46656. A ready-mix estimate; the stair detail and forms govern.",
  example: concreteStairVolumeExample.inputs,
  fields: [
    { key: "num_risers", label: "Number of risers", kind: "number", default: 4 },
    { key: "riser_in", label: "Riser height (in)", kind: "number", default: 7 },
    { key: "tread_in", label: "Tread depth (in)", kind: "number", default: 11 },
    { key: "width_in", label: "Stair width (in)", kind: "number", default: 48 },
    { key: "throat_in", label: "Throat / waist thickness (in)", kind: "number", default: 4 },
  ],
  outputs: [
    { key: "cy", id: "csv-out-cy", label: "Concrete volume", value: (r) => fmt(r.volume_cy, 2) + " cy (" + fmt(r.volume_ft3, 1) + " ft3)" },
    { key: "n", id: "csv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeConcreteStairVolume,
});
