// Group E (cont.): SDPWS wood lateral-force-resisting-system bench.
// spec-v272..v274 establish this new lazy-loaded renderer module -- the
// lateral counterpart to the NDS sawn-lumber member trio (v263..v265): the
// members were sized, this bench carries the lateral force into them. The
// catalog computed the demand (seismic-base-shear, wind-pressure) but had no
// wood member to hand it to: the diaphragm that collects the story force,
// the shear wall that takes it to the foundation with its holdown, and the
// drift that wall deflects. Every tile keeps group: "E" (a tile's group
// letter is independent of the module that holds it -- the spec-v70..v98
// split precedent). Tiles:
//   v272 diaphragm-shear        (flexible-diaphragm deep-beam v = wL/2b, chord = M/b)
//   v273 shearwall-overturning  (unit shear + 0.6D net holdown uplift)
//   v274 shearwall-deflection   (SDPWS Eq 4.3-1 three-term deflection)
// All GOVERNANCE.general design aids; the sheathing schedule, Ga, and the
// load combination come from SDPWS tables and the engineer of record.
// See spec-v272.md..v274.md.

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

// Compact renderer factory (same shape as the calc-steel / calc-masonry
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

export const LATERAL_RENDERERS = {};

// ===================== spec-v272: flexible wood diaphragm unit shear and chord force =====================

// dims: in { w_plf: M T^-2, l_ft: L, b_ft: L } out: { v_end_lb: M L T^-2, v_plf: M T^-2, m_ftlb: M L^2 T^-2, chord_kip: M L T^-2 }
export function computeDiaphragmShear({ w_plf = 0, l_ft = 0, b_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (w_plf < 0) return { error: "Lateral load w cannot be negative (plf)." };
  if (!(l_ft > 0)) return { error: "Diaphragm span L must be positive (ft)." };
  if (!(b_ft > 0)) return { error: "Diaphragm depth b must be positive (ft)." };
  const v_end_lb = w_plf * l_ft / 2;
  const v_plf = v_end_lb / b_ft;
  const m_ftlb = w_plf * l_ft * l_ft / 8;
  const chord_lb = m_ftlb / b_ft;
  const chord_kip = chord_lb / 1000;
  return { v_end_lb, v_plf, m_ftlb, chord_lb, chord_kip };
}

export const diaphragmShearExample = { inputs: { w_plf: 516, l_ft: 192, b_ft: 120 } };

LATERAL_RENDERERS["diaphragm-shear"] = _simpleRenderer({
  citation: "Citation: the AWC Special Design Provisions for Wind and Seismic (SDPWS) simple-span flexible-diaphragm model -- the diaphragm as a deep horizontal beam with maximum unit shear v = w L / (2 b) at the supports and chord force T = C = M / b from the maximum moment M = w L^2 / 8 -- as compiled in the AWC/APA engineered-wood-diaphragm design guides. Returns the maximum service-level unit shear and chord force of a simple-span, uniformly loaded flexible diaphragm: it assumes the diaphragm spans between two parallel resisting lines under a uniform load, is the flexible-diaphragm (tributary-area) distribution rather than a rigid-diaphragm (relative-stiffness) one, and does not add the collector / drag-strut force at intermediate lines, the diaphragm deflection, or openings. The unit shear is compared against the SDPWS nominal capacity for the chosen sheathing and nailing (with the ASD reduction or the seismic factor). A design aid, not a substitute for the engineer of record's stamped lateral design.",
  example: diaphragmShearExample.inputs,
  fields: [
    { key: "w_plf", label: "Uniform lateral load w (plf)", kind: "number" },
    { key: "l_ft", label: "Diaphragm span L between wall lines (ft)", kind: "number" },
    { key: "b_ft", label: "Diaphragm depth b, parallel to load (ft)", kind: "number" },
  ],
  outputs: [
    { key: "ve", id: "dsh-out-ve", label: "End reaction V", value: (r) => fmt(r.v_end_lb, 0) + " lb" },
    { key: "vp", id: "dsh-out-vp", label: "Max unit shear v = wL/(2b)", value: (r) => fmt(r.v_plf, 0) + " plf" },
    { key: "mm", id: "dsh-out-mm", label: "Max moment M = wL^2/8", value: (r) => fmt(r.m_ftlb, 0) + " lb-ft" },
    { key: "ch", id: "dsh-out-ch", label: "Chord force T = C = M/b", value: (r) => fmt(r.chord_lb, 0) + " lb (" + fmt(r.chord_kip, 1) + " kip)" },
  ],
  compute: computeDiaphragmShear,
});

// ===================== spec-v273: wood shear wall unit shear and holdown overturning =====================

// dims: in { v_lb: M L T^-2, b_ft: L, h_ft: L, w_lb: M L T^-2 } out: { v_plf: M T^-2, mot_ftlb: M L^2 T^-2, mr_ftlb: M L^2 T^-2, t_kip: M L T^-2 }
export function computeShearwallOverturning({ v_lb = 0, b_ft = 0, h_ft = 0, w_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (v_lb < 0) return { error: "Story shear V cannot be negative (lb)." };
  if (w_lb < 0) return { error: "Dead load W cannot be negative (lb)." };
  if (!(b_ft > 0)) return { error: "Wall length must be positive (ft)." };
  if (!(h_ft > 0)) return { error: "Wall height must be positive (ft)." };
  const v_plf = v_lb / b_ft;
  const mot_ftlb = v_lb * h_ft;
  const mr_ftlb = 0.6 * w_lb * (b_ft / 2);
  const t_raw = (mot_ftlb - mr_ftlb) / b_ft;
  const t_lb = Math.max(t_raw, 0);
  const t_kip = t_lb / 1000;
  const holdown_required = t_raw > 0;
  return { v_plf, mot_ftlb, mr_ftlb, t_lb, t_kip, holdown_required };
}

export const shearwallOverturningExample = { inputs: { v_lb: 8000, b_ft: 8, h_ft: 10, w_lb: 3000 } };

LATERAL_RENDERERS["shearwall-overturning"] = _simpleRenderer({
  citation: "Citation: the AWC SDPWS segmented shear-wall model with the ASCE 7 / IBC allowable-stress overturning check -- unit shear v = V / b, overturning moment Mot = V h resisted by 0.6 times the dead-load moment W x (b/2) per the 0.6D + 0.7E ASD load combination, net holdown tension T = (V h - 0.6 W b/2) / b -- as compiled in the AWC/APA wood-frame shear-wall design guides. Returns the service-level unit shear and net holdown uplift of a single fully sheathed shear-wall segment. Uses the 0.6D resisting dead load of the ASD seismic combination (use the wind combination's factor where wind governs); W is the dead load tributary to and acting on the wall (not the whole floor); the wall is segmented (not force-transfer-around-openings or perforated); the sheathing nailing check and the compression-chord bearing check are separate. When 0.6D stabilizes the wall the uplift clamps to zero (no holdown required for overturning; sill anchorage and shear transfer still govern). The unit shear is compared against the SDPWS nominal capacity for the chosen sheathing and nailing. A design aid, not a substitute for the engineer of record's stamped lateral design.",
  example: shearwallOverturningExample.inputs,
  fields: [
    { key: "v_lb", label: "Story shear V on the wall (lb)", kind: "number" },
    { key: "b_ft", label: "Shear-wall length b (ft)", kind: "number" },
    { key: "h_ft", label: "Shear-wall height h (ft)", kind: "number" },
    { key: "w_lb", label: "Tributary dead load W (lb)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "vp", id: "swo-out-vp", label: "Unit shear v = V/b", value: (r) => fmt(r.v_plf, 0) + " plf" },
    { key: "mo", id: "swo-out-mo", label: "Overturning Mot / resisting 0.6D Mr", value: (r) => fmt(r.mot_ftlb, 0) + " / " + fmt(r.mr_ftlb, 0) + " lb-ft" },
    { key: "td", id: "swo-out-td", label: "Net holdown tension T", value: (r) => r.holdown_required ? fmt(r.t_lb, 0) + " lb (" + fmt(r.t_kip, 1) + " kip)" : "0 lb (dead load stabilizes; no holdown required for overturning)" },
  ],
  compute: computeShearwallOverturning,
});

// ===================== spec-v274: wood shear wall deflection (SDPWS Eq 4.3-1) =====================

// dims: in { v_plf: M T^-2, h_ft: L, b_ft: L, e_psi: M L^-1 T^-2, a_in2: L^2, ga_kin: M T^-2, da_in: L } out: { bend_in: L, shear_in: L, anchor_in: L, delta_in: L, drift_ratio: dimensionless }
export function computeShearwallDeflection({ v_plf = 0, h_ft = 0, b_ft = 0, e_psi = 1600000, a_in2 = 0, ga_kin = 0, da_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(v_plf > 0)) return { error: "Unit shear v must be positive (plf)." };
  if (!(h_ft > 0)) return { error: "Wall height must be positive (ft)." };
  if (!(b_ft > 0)) return { error: "Wall length must be positive (ft)." };
  if (!(e_psi > 0)) return { error: "Chord modulus E must be positive (psi)." };
  if (!(a_in2 > 0)) return { error: "End-post area A must be positive (in^2)." };
  if (!(ga_kin > 0)) return { error: "Apparent shear stiffness Ga must be positive (kips/in)." };
  if (da_in < 0) return { error: "Anchorage slip da cannot be negative (in)." };
  // SDPWS Eq 4.3-1 is unit-specific (calibrated): v plf, h/b ft, E psi,
  // A in^2, Ga kips/in, da in -> delta in. No rescaling.
  const bend_in = 8 * v_plf * h_ft ** 3 / (e_psi * a_in2 * b_ft);
  const shear_in = v_plf * h_ft / (1000 * ga_kin);
  const anchor_in = h_ft * da_in / b_ft;
  const delta_in = bend_in + shear_in + anchor_in;
  const drift_ratio = delta_in / (h_ft * 12);
  return { bend_in, shear_in, anchor_in, delta_in, drift_ratio };
}

export const shearwallDeflectionExample = { inputs: { v_plf: 400, h_ft: 10, b_ft: 8, e_psi: 1600000, a_in2: 12.25, ga_kin: 15, da_in: 0.15 } };

LATERAL_RENDERERS["shearwall-deflection"] = _simpleRenderer({
  citation: "Citation: the AWC Special Design Provisions for Wind and Seismic (SDPWS) Equation 4.3-1 three-term shear-wall deflection delta = 8 v h^3 / (E A b) + v h / (1000 Ga) + h da / b -- the linearized (apparent-shear-stiffness Ga) form of the legacy four-term equation, with the terms being end-post bending, combined panel-shear-and-nail-slip, and anchorage rotation -- in the unit-specific convention (v in plf, h and b in ft, E in psi, A in in^2, Ga in kips/in, da and delta in inches; the equation is calibrated, so the tool does not rescale), as compiled in the AWC/APA wood-frame shear-wall design guides. Returns the top-of-wall deflection of a single segmented shear wall at the given service (ASD) unit shear. Ga is the tabulated apparent shear stiffness for the chosen sheathing and nailing (SDPWS Table 4.3A/4.3B, the seismic column); da is the total vertical anchorage elongation (holdown deformation, plate crushing, rod stretch and shrinkage) at that shear; the segmented-wall form (not perforated or force-transfer-around-openings). Compare against the ASCE 7 allowable story drift. A design aid, not a substitute for the engineer of record's stamped lateral design.",
  example: shearwallDeflectionExample.inputs,
  fields: [
    { key: "v_plf", label: "Unit shear v (plf, service/ASD)", kind: "number" },
    { key: "h_ft", label: "Wall height h (ft)", kind: "number" },
    { key: "b_ft", label: "Wall length b (ft)", kind: "number" },
    { key: "e_psi", label: "End-post modulus E (psi)", kind: "number", default: 1600000 },
    { key: "a_in2", label: "End-post area A (in^2)", kind: "number" },
    { key: "ga_kin", label: "Apparent shear stiffness Ga (kips/in)", kind: "number" },
    { key: "da_in", label: "Anchorage elongation da (in)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "bd", id: "swd-out-bd", label: "End-post bending term", value: (r) => fmt(r.bend_in, 3) + " in" },
    { key: "sh", id: "swd-out-sh", label: "Panel shear + nail slip term", value: (r) => fmt(r.shear_in, 3) + " in" },
    { key: "an", id: "swd-out-an", label: "Anchorage rotation term", value: (r) => fmt(r.anchor_in, 3) + " in" },
    { key: "dt", id: "swd-out-dt", label: "Total deflection delta", value: (r) => fmt(r.delta_in, 2) + " in (drift " + fmt(r.drift_ratio * 100, 2) + "%)" },
  ],
  compute: computeShearwallDeflection,
});
