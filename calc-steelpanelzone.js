// Group E (cont.): AISC 360 steel panel-zone checks and doubler-plate sizing,
// and (spec-v1928) prying action on tee and angle flanges in tension.
// spec-v1861 moves these existing calculators out of calc-steel.js so the
// structural-steel module stays below its gzip cap. Calculator behavior, IDs,
// citations, examples, and Group E assignments are unchanged.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeOutputLine, attachExampleButton, fmt,
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
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind ?? "number", options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? (f.kind && f.kind !== "number" ? null : { step: "any", min: "0" }) })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

export const STEELPANELZONE_RENDERERS = {};

// ===================== spec-v555: column web panel-zone shear (AISC 360-16 J10.6) =====================

// dims: in { fy_ksi: M L^-1 T^-2, col_depth_dc_in: L, col_web_tw_in: L, col_flange_bcf_in: L, col_flange_tcf_in: L, beam_depth_db_in: L, beam_flange_tf_in: L, demand_moment_kin: M L^2 T^-2, col_shear_kip: M L T^-2, pz_in_analysis: dimensionless } out: { rn_basic_kip: M L T^-2, rn_pz_kip: M L T^-2, phi_rn_kip: M L T^-2, demand_kip: M L T^-2 }
export function computeSteelPanelZoneShear({ fy_ksi = 50, col_depth_dc_in = 0, col_web_tw_in = 0, col_flange_bcf_in = 0, col_flange_tcf_in = 0, beam_depth_db_in = 0, beam_flange_tf_in = 0, demand_moment_kin = 0, col_shear_kip = 0, pz_in_analysis = "no" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Fy = Number(fy_ksi) || 0;
  const dc = Number(col_depth_dc_in) || 0;
  const tw = Number(col_web_tw_in) || 0;
  const bcf = Number(col_flange_bcf_in) || 0;
  const tcf = Number(col_flange_tcf_in) || 0;
  const db = Number(beam_depth_db_in) || 0;
  const tf = Number(beam_flange_tf_in) || 0;
  const Mf = Number(demand_moment_kin) || 0;
  const Vcol = Number(col_shear_kip) || 0;
  const included = pz_in_analysis === true || pz_in_analysis === "yes";
  if (!(Fy > 0)) return { error: "Yield strength must be positive (ksi)." };
  if (!(dc > 0)) return { error: "Column depth must be positive (in)." };
  if (!(tw > 0)) return { error: "Column web thickness must be positive (in)." };
  if (bcf < 0) return { error: "Column flange width cannot be negative (in)." };
  if (tf < 0) return { error: "Beam flange thickness cannot be negative (in)." };
  if (!(db > tf)) return { error: "Beam depth must exceed the flange thickness (in)." };
  if (Mf < 0) return { error: "Demand moment cannot be negative (kip-in)." };
  const rn_basic_kip = 0.60 * Fy * dc * tw;
  const bonus = 1 + 3 * bcf * tcf * tcf / (db * dc * tw);
  const rn_pz_kip = rn_basic_kip * bonus;
  const rn_kip = included ? rn_pz_kip : rn_basic_kip;
  const phi_rn_kip = 0.90 * rn_kip;
  const demand_kip = Mf / (db - tf) - Vcol;
  const doubler = demand_kip > phi_rn_kip;
  return {
    rn_basic_kip, rn_pz_kip, bonus, phi_rn_kip, demand_kip, doubler, included,
    note: "The flange-stiffened bonus term (Eq. J10-11) is permitted only when the panel-zone deformation is accounted for in the frame analysis; otherwise use the basic strength (Eq. J10-9). A high column axial load (Pr > 0.4 Pc) reduces the strength by a further factor (not applied here - low-axial case). The moment-frame joint often fails here before the beam or column; a doubler plate is the fix. AISC 360 and the engineer of record govern.",
  };
}

export const steelPanelZoneShearExample = { inputs: { fy_ksi: 50, col_depth_dc_in: 14, col_web_tw_in: 0.5, col_flange_bcf_in: 14.5, col_flange_tcf_in: 0.75, beam_depth_db_in: 24, beam_flange_tf_in: 1.0, demand_moment_kin: 5500, col_shear_kip: 40, pz_in_analysis: "no" } };

STEELPANELZONE_RENDERERS["steel-panel-zone-shear"] = _simpleRenderer({
  citation: "Citation: AISC 360-16 Section J10.6 panel-zone shear: basic Rn = 0.60 Fy dc tw (Eq. J10-9); with panel-zone deformation in the analysis Rn = 0.60 Fy dc tw [1 + 3 bcf tcf^2/(db dc tw)] (Eq. J10-11); phiRn = 0.90 Rn; demand Vpz = sum(Mf)/(db - tf) - Vcol. The flange bonus is permitted only when the panel-zone deformation is modeled. A high column axial load (Pr > 0.4 Pc) reduces the strength further. A doubler plate is the fix. AISC 360 and the engineer of record govern.",
  example: steelPanelZoneShearExample.inputs,
  fields: [
    { key: "fy_ksi", label: "Column yield Fy (ksi)", kind: "number" },
    { key: "col_depth_dc_in", label: "Column depth dc (in)", kind: "number" },
    { key: "col_web_tw_in", label: "Column web tw (in)", kind: "number" },
    { key: "col_flange_bcf_in", label: "Column flange width bcf (in)", kind: "number" },
    { key: "col_flange_tcf_in", label: "Column flange thickness tcf (in)", kind: "number" },
    { key: "beam_depth_db_in", label: "Beam depth db (in)", kind: "number" },
    { key: "beam_flange_tf_in", label: "Beam flange tf (in)", kind: "number" },
    { key: "demand_moment_kin", label: "Sum of beam flange moments (kip-in)", kind: "number" },
    { key: "col_shear_kip", label: "Column shear Vcol (kip)", kind: "number", attrs: { step: "any" } },
    { key: "pz_in_analysis", label: "Panel-zone deformation in the frame analysis?", kind: "select", options: [{ value: "no", label: "No (use basic strength J10-9)" }, { value: "yes", label: "Yes (flange bonus J10-11 allowed)" }] },
  ],
  outputs: [
    { key: "rb", id: "spz-out-rb", label: "Basic strength Rn (J10-9)", value: (r) => fmt(r.rn_basic_kip, 0) + " kip" },
    { key: "rp", id: "spz-out-rp", label: "Flange-stiffened Rn (J10-11)", value: (r) => fmt(r.rn_pz_kip, 0) + " kip (bonus " + fmt(r.bonus, 3) + ")" },
    { key: "phi", id: "spz-out-phi", label: "Design phiRn (used branch)", value: (r) => fmt(r.phi_rn_kip, 0) + " kip (" + (r.included ? "flange-stiffened" : "basic") + ")" },
    { key: "d", id: "spz-out-d", label: "Panel-zone demand / doubler", value: (r) => fmt(r.demand_kip, 0) + " kip - " + (r.doubler ? "DOUBLER PLATE needed" : "OK, no doubler") },
  ],
  compute: computeSteelPanelZoneShear,
});

// --- spec-v603 E: Panel-zone doubler-plate thickness sizer (AISC 360-16 J10.6; AISC 341 stability limit) ---
// phiRn_bare = 0.90*0.6*Fy*dc*tw. shortfall = max(0, Vu - phiRn_bare). t_strength = shortfall/(0.90*0.6*Fy*dc).
// t_stability = (dz+wz)/90 (AISC 341 Seismic Provisions; AISC 360 has no such limit -- until 2026-09-25 this was credited to 360 Eq. J10-12). t_required = shortfall>0 ? max(t_strength, t_stability) : 0. t_plate = ceil to 1/16 in.
// dims: in { required_shear_kip: M L T^-2, fy_ksi: M L^-1 T^-2, col_depth_dc_in: L, col_web_tw_in: L, pz_depth_dz_in: L, pz_width_wz_in: L } out: { phi_rn_bare_kip: M L T^-2, shortfall_kip: M L T^-2, t_strength_in: L, t_stability_in: L, t_required_in: L, t_plate_in: L }
export function computeSteelDoublerPlate({ required_shear_kip = 0, fy_ksi = 50, col_depth_dc_in = 0, col_web_tw_in = 0, pz_depth_dz_in = 0, pz_width_wz_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Vu = Number(required_shear_kip) || 0;
  const Fy = Number(fy_ksi) || 0;
  const dc = Number(col_depth_dc_in) || 0;
  const tw = Number(col_web_tw_in) || 0;
  const dz = Number(pz_depth_dz_in) || 0;
  const wz = Number(pz_width_wz_in) || 0;
  if (!(Vu > 0)) return { error: "Required panel-zone shear must be positive (kip)." };
  if (!(Fy > 0)) return { error: "Yield strength must be positive (ksi)." };
  if (!(dc > 0)) return { error: "Column depth must be positive (in)." };
  if (!(tw > 0)) return { error: "Column web thickness must be positive (in)." };
  if (!(dz > 0)) return { error: "Panel-zone depth must be positive (in)." };
  if (!(wz > 0)) return { error: "Panel-zone width must be positive (in)." };
  const perInch = 0.90 * 0.60 * Fy * dc;
  const phi_rn_bare_kip = perInch * tw;
  const shortfall_kip = Math.max(0, Vu - phi_rn_bare_kip);
  const t_strength_in = shortfall_kip / perInch;
  const t_stability_in = (dz + wz) / 90;
  const needs_doubler = shortfall_kip > 0;
  const t_required_in = needs_doubler ? Math.max(t_strength_in, t_stability_in) : 0;
  const t_plate_in = needs_doubler ? Math.ceil(t_required_in * 16 - 1e-9) / 16 : 0;
  const governed_by = !needs_doubler ? "none" : (t_stability_in > t_strength_in ? "stability (AISC 341, (dz + wz) / 90)" : "strength (J10-9 shortfall)");
  return {
    phi_rn_bare_kip, shortfall_kip, t_strength_in, t_stability_in, t_required_in, t_plate_in, needs_doubler, governed_by,
    note: "The stability minimum (AISC 341 Seismic Provisions, t >= (dz + wz) / 90; AISC 360 has no such limit) applies per individual doubler plate when it is not plug-welded to the web; a plug-welded doubler lets the combined thickness resist buckling. The basic bare strength (J10-9) is used for the shortfall - the flange-stiffened bonus (J10-11) is only allowed when panel-zone deformation is modeled. A high column axial load (Pr > 0.4 Pc) reduces the strength further and is not applied here. Above roughly a half-inch shortfall the engineer often chooses a heavier column or a pair of plates. AISC 360 and the engineer of record govern - a detailing aid, not a stamped connection design.",
  };
}
export const steelDoublerPlateExample = { inputs: { required_shear_kip: 300, fy_ksi: 50, col_depth_dc_in: 14, col_web_tw_in: 0.485, pz_depth_dz_in: 22.64, pz_width_wz_in: 12.44 } };
STEELPANELZONE_RENDERERS["steel-doubler-plate"] = _simpleRenderer({
  citation: "Citation: AISC 360-16 Section J10.6 panel-zone doubler plate: phiRn_bare = 0.90 x 0.60 Fy dc tw; t_strength = max(0, Vu - phiRn_bare) / (0.90 x 0.60 Fy dc); the stability minimum t >= (dz + wz)/90 (from AISC 341, the Seismic Provisions -- AISC 360 J10.9 sets doubler strength and welding only; Eq. J10-12 is the high-axial panel-zone strength) per individual doubler not plug-welded to the web; t_required = max(t_strength, t_stability). The basic strength (J10-9) is used for the shortfall; a high column axial load (Pr > 0.4 Pc) reduces the strength further. AISC 360 and the engineer of record govern.",
  example: steelDoublerPlateExample.inputs,
  fields: [
    { key: "required_shear_kip", label: "Panel-zone shear demand Vu (kip)", kind: "number" },
    { key: "fy_ksi", label: "Column yield Fy (ksi)", kind: "number" },
    { key: "col_depth_dc_in", label: "Column depth dc (in)", kind: "number" },
    { key: "col_web_tw_in", label: "Existing column web tw (in)", kind: "number" },
    { key: "pz_depth_dz_in", label: "Panel-zone depth dz (in, ~ beam depth between flanges)", kind: "number" },
    { key: "pz_width_wz_in", label: "Panel-zone width wz (in, ~ column depth between flanges)", kind: "number" },
  ],
  outputs: [
    { key: "phi", id: "sdp-out-phi", label: "Bare web design strength phiRn", value: (r) => fmt(r.phi_rn_bare_kip, 0) + " kip" },
    { key: "short", id: "sdp-out-short", label: "Shortfall to make up", value: (r) => r.needs_doubler ? fmt(r.shortfall_kip, 0) + " kip" : "0 kip - the bare web suffices, no doubler" },
    { key: "t", id: "sdp-out-t", label: "Doubler thickness (strength / stability)", value: (r) => r.needs_doubler ? fmt(r.t_strength_in, 3) + " / " + fmt(r.t_stability_in, 3) + " in - governed by " + r.governed_by : "-" },
    { key: "plate", id: "sdp-out-plate", label: "Required plate (next 1/16 in)", value: (r) => r.needs_doubler ? fmt(r.t_required_in, 3) + " in -> use " + fmt(r.t_plate_in, 4) + " in" : "none" },
    { key: "n", id: "sdp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSteelDoublerPlate,
});

// ===================== spec-v618: panel-zone shear under high column axial (AISC 360-16 J10-10 / J10-12) =====================

// dims: in { fy_ksi: M L^-1 T^-2, col_depth_dc_in: L, col_web_tw_in: L, col_area_ag_in2: L^2, pr_kip: M L T^-2, pz_in_analysis: dimensionless, col_flange_bcf_in: L, col_flange_tcf_in: L, beam_depth_db_in: L } out: { py_kip: M L T^-2, axial_ratio: dimensionless, reduction_factor: dimensionless, rn_kip: M L T^-2, phi_rn_kip: M L T^-2 }
export function computeSteelPanelZoneAxial({ fy_ksi = 50, col_depth_dc_in = 0, col_web_tw_in = 0, col_area_ag_in2 = 0, pr_kip = 0, pz_in_analysis = "no", col_flange_bcf_in = 0, col_flange_tcf_in = 0, beam_depth_db_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Fy = Number(fy_ksi) || 0;
  const dc = Number(col_depth_dc_in) || 0;
  const tw = Number(col_web_tw_in) || 0;
  const Ag = Number(col_area_ag_in2) || 0;
  const Pr = Number(pr_kip) || 0;
  const included = pz_in_analysis === true || pz_in_analysis === "yes";
  const bcf = Number(col_flange_bcf_in) || 0;
  const tcf = Number(col_flange_tcf_in) || 0;
  const db = Number(beam_depth_db_in) || 0;
  if (!(Fy > 0)) return { error: "Yield strength must be positive (ksi)." };
  if (!(dc > 0)) return { error: "Column depth must be positive (in)." };
  if (!(tw > 0)) return { error: "Column web thickness must be positive (in)." };
  if (!(Ag > 0)) return { error: "Column gross area must be positive (in^2)." };
  if (!(Pr > 0)) return { error: "Axial demand must be positive (kip) - use steel-panel-zone-shear for the no-axial case." };
  const py_kip = Fy * Ag;
  const axial_ratio = Pr / py_kip;
  if (axial_ratio >= 1) return { error: "Axial demand is at or above the column axial yield Py = Fy x Ag - the column itself is past yield." };
  let bonus = 1;
  if (included) {
    if (!(bcf > 0)) return { error: "Column flange width is needed for the deformation-modeled branch (in)." };
    if (!(tcf > 0)) return { error: "Column flange thickness is needed for the deformation-modeled branch (in)." };
    if (!(db > 0)) return { error: "Beam depth is needed for the deformation-modeled branch (in)." };
    bonus = 1 + 3 * bcf * tcf * tcf / (db * dc * tw);
  }
  const threshold = included ? 0.75 : 0.40;
  const high_axial = axial_ratio > threshold;
  const reduction_factor = !high_axial ? 1.0 : (included ? 1.9 - 1.2 * axial_ratio : 1.4 - axial_ratio);
  const rn_kip = 0.60 * Fy * dc * tw * bonus * reduction_factor;
  const phi_rn_kip = 0.90 * rn_kip;
  return {
    py_kip, axial_ratio, bonus, high_axial, reduction_factor, rn_kip, phi_rn_kip,
    note: (high_axial
      ? "High-axial branch: " + (included ? "Eq. J10-12, factor 1.9 - 1.2 Pr/Pc" : "Eq. J10-10, factor 1.4 - Pr/Pc") + " applies."
      : "Below the " + (included ? "0.75" : "0.40") + " Pc threshold the factor is 1.0 - this matches steel-panel-zone-shear exactly.")
      + " Pc = Py = Fy x Ag (LRFD). The flange-stiffened equations are permitted only when the panel-zone deformation is accounted for in the frame analysis. Compare the reduced phiRn against the joint demand from steel-panel-zone-shear; steel-doubler-plate sizes the fix. AISC 360 and the engineer of record govern - a design aid, not a connection design.",
  };
}

export const steelPanelZoneAxialExample = { inputs: { fy_ksi: 50, col_depth_dc_in: 14, col_web_tw_in: 0.5, col_area_ag_in2: 26.5, pr_kip: 600, pz_in_analysis: "no", col_flange_bcf_in: 14.5, col_flange_tcf_in: 0.75, beam_depth_db_in: 24 } };

STEELPANELZONE_RENDERERS["steel-panel-zone-axial"] = _simpleRenderer({
  citation: "Citation: AISC 360-16 Section J10.6 panel-zone shear with column axial load: Pr <= 0.4 Pc -> Rn = 0.60 Fy dc tw (Eq. J10-9); Pr > 0.4 Pc -> x (1.4 - Pr/Pc) (Eq. J10-10); deformation-modeled: Pr <= 0.75 Pc -> Rn = 0.60 Fy dc tw [1 + 3 bcf tcf^2/(db dc tw)] (Eq. J10-11); Pr > 0.75 Pc -> x (1.9 - 1.2 Pr/Pc) (Eq. J10-12). Pc = Py = Fy Ag (LRFD); phiRn = 0.90 Rn. The flange bonus is permitted only when the panel-zone deformation is modeled. AISC 360 and the engineer of record govern.",
  example: steelPanelZoneAxialExample.inputs,
  fields: [
    { key: "fy_ksi", label: "Column yield Fy (ksi)", kind: "number" },
    { key: "col_depth_dc_in", label: "Column depth dc (in)", kind: "number" },
    { key: "col_web_tw_in", label: "Column web tw (in)", kind: "number" },
    { key: "col_area_ag_in2", label: "Column gross area Ag (in²)", kind: "number" },
    { key: "pr_kip", label: "Axial demand Pr at the joint (kip)", kind: "number" },
    { key: "pz_in_analysis", label: "Panel-zone deformation in the analysis?", kind: "select", options: [{ value: "no", label: "No (J10-9 / J10-10)", selected: true }, { value: "yes", label: "Yes (J10-11 / J10-12)" }] },
    { key: "col_flange_bcf_in", label: "Column flange width bcf (in, yes-branch)", kind: "number", default: 0 },
    { key: "col_flange_tcf_in", label: "Column flange thickness tcf (in, yes-branch)", kind: "number", default: 0 },
    { key: "beam_depth_db_in", label: "Beam depth db (in, yes-branch)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "ratio", id: "pza-out-ratio", label: "Axial ratio Pr / Pc", value: (r) => fmt(r.axial_ratio, 3) + " (Py = " + fmt(r.py_kip, 0) + " kip)" + (r.high_axial ? " - high-axial branch" : " - below the threshold") },
    { key: "factor", id: "pza-out-factor", label: "Axial reduction factor", value: (r) => fmt(r.reduction_factor, 4) },
    { key: "rn", id: "pza-out-rn", label: "Reduced Rn / phiRn", value: (r) => fmt(r.rn_kip, 1) + " kip / " + fmt(r.phi_rn_kip, 1) + " kip" },
    { key: "n", id: "pza-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSteelPanelZoneAxial,
});

// ===================== spec-v1928: prying action in tees and angles (AISC Manual Part 9) =====================
// The bolt-tension tiles take the applied tension per bolt at face value; a flexible flange levers
// it up. AISC Manual Part 9: b' = b - d/2, a' = min(a, 1.25 b) + d/2, rho = b'/a', delta = 1 - d'/p.
// Minimum flange thickness with prying: t_min = sqrt(k T b' / (p Fu (1 + delta alpha'))), alpha' = 1
// if beta >= 1, else min(1, beta / (delta (1 - beta))), beta = (B/T - 1) / rho; to eliminate prying,
// t = sqrt(k T b' / (p Fu)); k = 4/0.90 (LRFD) or 4 x 1.67 (ASD). Available tension per bolt at the
// actual t: t_c = sqrt(k B b' / (p Fu)), alpha = (1 / (delta (1 + rho))) ((t_c/t)^2 - 1), and
// T_avail = B when alpha < 0, B (t/t_c)^2 (1 + delta alpha) up to alpha = 1, B (t/t_c)^2 (1 + delta)
// beyond. Checked against AISC Design Example II.D-1 (WT8x28.5, 3/4 in bolts at 4 in): t_min 0.521 in.
// dims: in { tension_per_bolt_kip: M L T^-2, bolt_available_kip: M L T^-2, bolt_dia_in: L, hole_dia_in: L, tributary_p_in: L, b_in: L, a_in: L, flange_t_in: L, fu_ksi: M L^-1 T^-2, method: dimensionless } out: { t_min_in: L, t_no_prying_in: L, t_c_in: L, available_tension_kip: M L T^-2, prying_force_kip: M L T^-2 }
export function computeBoltPryingAction({ tension_per_bolt_kip = 0, bolt_available_kip = 0, bolt_dia_in = 0, hole_dia_in = 0, tributary_p_in = 0, b_in = 0, a_in = 0, flange_t_in = 0, fu_ksi = 65, method = "LRFD" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const T = tension_per_bolt_kip, B = bolt_available_kip, d = bolt_dia_in, p = tributary_p_in, t = flange_t_in;
  if (!(T > 0)) return { error: "Required tension per bolt must be positive (kip)." };
  if (!(B > 0)) return { error: "Available bolt tension B must be positive (kip per bolt)." };
  if (!(d > 0)) return { error: "Bolt diameter must be positive (in)." };
  const dh = hole_dia_in > 0 ? hole_dia_in : d + 1 / 16;
  if (!(dh >= d)) return { error: "The hole cannot be smaller than the bolt." };
  if (!(p > dh)) return { error: "Tributary length per bolt p must exceed the hole diameter (in)." };
  if (!(b_in > d / 2)) return { error: "Distance b from the bolt line to the stem face must exceed half the bolt diameter (in)." };
  if (!(a_in > 0)) return { error: "Edge distance a must be positive (in)." };
  if (!(t > 0)) return { error: "Flange thickness must be positive (in)." };
  if (!(fu_ksi > 0)) return { error: "Flange tensile strength Fu must be positive (ksi)." };
  if (method !== "LRFD" && method !== "ASD") return { error: "Method must be LRFD or ASD." };
  const k = method === "LRFD" ? 4 / 0.9 : 4 * 1.67;
  const b_prime = b_in - d / 2;
  const a_used = Math.min(a_in, 1.25 * b_in);
  const a_prime = a_used + d / 2;
  const rho = b_prime / a_prime;
  const delta = 1 - dh / p;
  const beta = (B / T - 1) / rho;
  const alpha_prime_min = beta >= 1 ? 1 : Math.min(1, Math.max(0, beta / (delta * (1 - beta))));
  const t_min_in = Math.sqrt(k * T * b_prime / (p * fu_ksi * (1 + delta * alpha_prime_min)));
  const t_no_prying_in = Math.sqrt(k * T * b_prime / (p * fu_ksi));
  const t_c_in = Math.sqrt(k * B * b_prime / (p * fu_ksi));
  const alpha_prime = (1 / (delta * (1 + rho))) * (Math.pow(t_c_in / t, 2) - 1);
  const ratio = Math.pow(t / t_c_in, 2);
  const available_tension_kip = alpha_prime < 1e-9 ? B : alpha_prime <= 1 ? B * ratio * (1 + delta * alpha_prime) : B * ratio * (1 + delta);
  const passes = T <= available_tension_kip * (1 + 1e-9) && t >= t_min_in * (1 - 1e-9);
  const prying_free = t >= t_no_prying_in * (1 - 1e-9);
  const outs = [b_prime, a_prime, rho, delta, t_min_in, t_no_prying_in, t_c_in, available_tension_kip];
  if (!outs.every(Number.isFinite)) return { error: "Prying math is not a finite value." };
  return {
    b_prime_in: b_prime, a_prime_in: a_prime, a_capped: a_used < a_in, rho, delta, beta, alpha_prime_min,
    t_min_in, t_no_prying_in, t_c_in, alpha_prime, available_tension_kip, passes, prying_free,
    note: "A tee or angle flange bolted in tension bends, and as it bends its tips bear on the support and lever extra tension into the bolts: prying. The bolt that looks adequate for the applied load can be overloaded by the prying force, or the flange can yield first. AISC Manual Part 9 gives the flange thickness that makes the connection work with prying counted, the thicker flange that makes prying negligible, and the tension a bolt can deliver at the actual thickness. b is measured from the bolt line to the face of the stem (or angle leg), a from the bolt line to the flange tip, taken no more than 1.25 b; p is the flange length tributary to one bolt. B is the bolt's available tension (LRFD phi rn, or ASD rn / Omega) and T the required tension per bolt on the same basis. Fu is the flange's, 65 ksi for A992. A check of the flange and bolts in prying; the stem, welds, and the supporting member are separate checks, and the engineer of record governs.",
  };
}
const boltPryingExample = { inputs: { tension_per_bolt_kip: 20, bolt_available_kip: 29.8, bolt_dia_in: 0.75, hole_dia_in: 0.8125, tributary_p_in: 4, b_in: 1.79, a_in: 1.56, flange_t_in: 0.715, fu_ksi: 65, method: "LRFD" } };
STEELPANELZONE_RENDERERS["bolt-prying-action"] = _simpleRenderer({
  citation: "Citation: AISC Steel Construction Manual Part 9, prying action in tees and angles, by name: b' = b - d/2, a' = a + d/2 with a no more than 1.25 b, rho = b'/a', delta = 1 - d'/p; t_min = sqrt(4 T b' / (phi p Fu (1 + delta alpha'))), with 4/phi = 4.44 (LRFD) or 4 Omega = 6.66 (ASD); prying negligible at sqrt(4 T b' / (phi p Fu)); available tension from t_c = sqrt(4 B b' / (phi p Fu)). As worked in AISC Design Example II.D-1. Bolt available tension, flange Fu, and geometry are the user's. The engineer of record governs.",
  example: boltPryingExample.inputs,
  fields: [
    { key: "tension_per_bolt_kip", label: "Required tension per bolt T (kip)", kind: "number" },
    { key: "bolt_available_kip", label: "Bolt available tension B (kip, phi rn or rn/Omega)", kind: "number" },
    { key: "bolt_dia_in", label: "Bolt diameter d (in)", kind: "number" },
    { key: "hole_dia_in", label: "Hole diameter d' (in, blank = d + 1/16)", kind: "number" },
    { key: "tributary_p_in", label: "Flange length per bolt p (in)", kind: "number" },
    { key: "b_in", label: "Bolt line to stem face b (in)", kind: "number" },
    { key: "a_in", label: "Bolt line to flange tip a (in)", kind: "number" },
    { key: "flange_t_in", label: "Flange thickness t (in)", kind: "number" },
    { key: "fu_ksi", label: "Flange Fu (ksi, 65 for A992)", kind: "number", default: 65 },
    { key: "method", label: "Design basis", kind: "select", options: [{ value: "LRFD", label: "LRFD (phi 0.90)", selected: true }, { value: "ASD", label: "ASD (Omega 1.67)" }] },
  ],
  outputs: [
    { key: "g", id: "bpa-out-g", label: "Geometry", value: (r) => "b' " + fmt(r.b_prime_in, 3) + " in, a' " + fmt(r.a_prime_in, 3) + " in" + (r.a_capped ? " (a capped at 1.25 b)" : "") + ", rho " + fmt(r.rho, 3) + ", delta " + fmt(r.delta, 3) },
    { key: "m", id: "bpa-out-m", label: "Minimum flange thickness with prying", value: (r) => fmt(r.t_min_in, 3) + " in (alpha' " + fmt(r.alpha_prime_min, 2) + ")" },
    { key: "z", id: "bpa-out-z", label: "Thickness for negligible prying at T", value: (r) => fmt(r.t_no_prying_in, 3) + " in" + (r.prying_free ? " -- the flange is this thick" : "") },
    { key: "a", id: "bpa-out-a", label: "Available tension per bolt at this flange", value: (r) => fmt(r.available_tension_kip, 1) + " kip -- " + (r.passes ? "OK for the required tension" : "LESS THAN THE REQUIRED TENSION: thicken the flange or add bolts") },
    { key: "n", id: "bpa-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBoltPryingAction,
});
