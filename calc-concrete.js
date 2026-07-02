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
