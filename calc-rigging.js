// =====================================================================
// calc-rigging.js - Group Z (Rigging and Heavy Lift), the lift-planning
// core (spec-v65). Seven tiles behind RIGGING_RENDERERS:
//   cg-load-share          center of gravity and per-pick-point share
//   crane-net-capacity     net capacity after the OSHA 1926.1417(o) stack
//   crane-ground-bearing   outrigger/crawler ground bearing and mat size
//   sling-d-d-efficiency   wire-rope sling D/d bend efficiency
//   wind-on-load           wind force and swing angle on a suspended load
//   tagline-force          tag-line pull and handler count
//   tandem-lift-share      two-crane (tandem) lift load share
//
// All seven carry GOVERNANCE.rigging: the head rigger and the
// manufacturer's load chart govern; every screen says so. The sources
// (ASME B30.5/B30.9/B30.10, OSHA 1926 Subpart CC, the WRTB Wire Rope
// Users Manual) are named in the citations, never reproduced.
//
// Mirrors calc-gas.js / calc-fab.js: a ui-fields import, a module-local
// _finiteGuard, exported compute functions plus non-exported renderers,
// and the exported RIGGING_RENDERERS map.
// =====================================================================

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

export const RIGGING_RENDERERS = {};

// --- cg-load-share: Center of Gravity and Per-Pick-Point Load Share ---
//
// load_p1 = W * d2 / span; load_p2 = W * d1 / span (the pick nearest the
// CG carries more); cg_outside flags a CG beyond the two pick points.
// dims: in { total_weight_lb: M L T^-2, span_in: L, cg_from_p1_in: L } out: { load_p1: M L T^-2, load_p2: M L T^-2, imbalance_pct: dimensionless }
// (Weight is a force M L T^-2; span and CG offset are lengths L; the
//  per-point loads are forces and the imbalance a dimensionless percent.)
export function computeCgLoadShare({ total_weight_lb, span_in, cg_from_p1_in } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(total_weight_lb);
  const span = Number(span_in);
  const d1 = Number(cg_from_p1_in);
  if (!Number.isFinite(w) || w <= 0) return { error: "Total weight must be a positive finite number (lb)." };
  if (!Number.isFinite(span) || span <= 0) return { error: "Span must be a positive finite number (in)." };
  if (!Number.isFinite(d1)) return { error: "CG distance must be a finite number (in)." };
  const d2 = span - d1;
  const loadP1 = w * d2 / span;
  const loadP2 = w * d1 / span;
  const imbalancePct = Math.abs(loadP1 - loadP2) / w * 100;
  const cgOutside = d1 < 0 || d1 > span;
  if (![loadP1, loadP2, imbalancePct].every(Number.isFinite)) return { error: "Load share is not a finite value." };
  return {
    load_p1: loadP1,
    load_p2: loadP2,
    imbalance_pct: imbalancePct,
    cg_outside: cgOutside,
    verdict: cgOutside ? "CG outside the pick points - load tips, re-rig" : "CG between the pick points",
    note: "Size the heavier sling, shackle, and hook to the higher leg, not the average. A load that lifts crooked has its CG off the hook centerline - set it down and re-rig. The published or estimated weight is only as good as its source; weigh it when in doubt.",
  };
}

function renderCgLoadShare(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASME B30.9 (Slings) and ITI rigging practice by name. load_p1 = W x (span - d1) / span; the pick nearest the CG carries more. Estimate - the head rigger and the load weight govern.";
  const w = makeNumber("Total load weight (lb)", "cls-w", { step: "any", min: "0" });
  const span = makeNumber("Span between pick points (in)", "cls-span", { step: "any", min: "0" });
  const d1 = makeNumber("Distance from pick 1 to CG (in)", "cls-d1", { step: "any" });
  for (const f of [w, span, d1]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { w.input.value = "12000"; span.input.value = "120"; d1.input.value = "40"; update(); });
  const oP1 = makeOutputLine(outputRegion, "Load on pick 1", "cls-out-p1");
  const oP2 = makeOutputLine(outputRegion, "Load on pick 2", "cls-out-p2");
  const oImb = makeOutputLine(outputRegion, "Imbalance", "cls-out-imb");
  const oVerdict = makeOutputLine(outputRegion, "CG position", "cls-out-verdict");
  const update = debounce(() => {
    const r = computeCgLoadShare({ total_weight_lb: Number(w.input.value) || 0, span_in: Number(span.input.value) || 0, cg_from_p1_in: Number(d1.input.value) || 0 });
    if (r.error) { oP1.textContent = r.error; for (const o of [oP2, oImb, oVerdict]) o.textContent = "-"; return; }
    oP1.textContent = fmt(r.load_p1, 0) + " lb";
    oP2.textContent = fmt(r.load_p2, 0) + " lb";
    oImb.textContent = fmt(r.imbalance_pct, 1) + "%";
    oVerdict.textContent = r.verdict;
  }, DEBOUNCE_MS);
  for (const f of [w, span, d1]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["cg-load-share"] = renderCgLoadShare;

// --- crane-net-capacity: Net Capacity After the Deduction Stack ---
//
// net = gross - hook_block - jib - wire_rope; total_hook = load + below_hook;
// pct_of_net = total_hook / net * 100; 75/90/100 percent flags.
// dims: in { gross_chart_lb: M L T^-2, hook_block_lb: M L T^-2, jib_attach_lb: M L T^-2, wire_rope_lb: M L T^-2, below_hook_lb: M L T^-2, load_weight_lb: M L T^-2 } out: { net_capacity_lb: M L T^-2, total_hook_lb: M L T^-2, pct_of_net: dimensionless }
// (Every weight is a force M L T^-2; the percent of net is dimensionless.)
export function computeCraneNetCapacity({ gross_chart_lb, hook_block_lb = 0, jib_attach_lb = 0, wire_rope_lb = 0, below_hook_lb = 0, load_weight_lb } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const gross = Number(gross_chart_lb);
  const hookBlock = Number(hook_block_lb) || 0;
  const jib = Number(jib_attach_lb) || 0;
  const wireRope = Number(wire_rope_lb) || 0;
  const belowHook = Number(below_hook_lb) || 0;
  const load = Number(load_weight_lb);
  if (!Number.isFinite(gross) || gross <= 0) return { error: "Gross chart capacity must be a positive finite number (lb)." };
  if (!Number.isFinite(load) || load <= 0) return { error: "Load weight must be a positive finite number (lb)." };
  const netCapacity = gross - hookBlock - jib - wireRope;
  if (!(netCapacity > 0)) return { error: "Net capacity is zero or negative after deductions - the rigging exceeds the chart." };
  const totalHook = load + belowHook;
  const pctOfNet = totalHook / netCapacity * 100;
  if (![netCapacity, totalHook, pctOfNet].every(Number.isFinite)) return { error: "Net-capacity math is not a finite value." };
  let flag = "ok";
  if (pctOfNet > 100) flag = "STOP - over chart";
  else if (pctOfNet > 90) flag = "margin gone - reduce radius, add crane, or re-stage";
  else if (pctOfNet > 75) flag = "critical / engineered lift - plan and document";
  return {
    net_capacity_lb: netCapacity,
    total_hook_lb: totalHook,
    pct_of_net: pctOfNet,
    flag,
    note: "This is arithmetic on numbers you read off the manufacturer's chart and rating plate. The chart, the configuration (boom length, radius, outrigger spread, counterweight), and a qualified operator govern. Structural-vs-stability ratings and an out-of-level deration live on the chart, not in this tile.",
  };
}

function renderCraneNetCapacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: OSHA 29 CFR 1926.1417(o) deduction stack and ASME B30.5 by name. net = gross - hook block - jib - wire rope; percent = (load + below-hook) / net. Estimate - the manufacturer's load chart governs.";
  const gross = makeNumber("Gross chart capacity at radius (lb)", "cnc-gross", { step: "any", min: "0" });
  const hook = makeNumber("Hook block / overhaul ball (lb)", "cnc-hook", { step: "any", min: "0", value: "0" });
  const jib = makeNumber("Erected jib / extension (lb)", "cnc-jib", { step: "any", min: "0", value: "0" });
  const wire = makeNumber("Wire-rope deduction (lb)", "cnc-wire", { step: "any", min: "0", value: "0" });
  const below = makeNumber("Below-the-hook gear (lb)", "cnc-below", { step: "any", min: "0", value: "0" });
  const load = makeNumber("Load weight (lb)", "cnc-load", { step: "any", min: "0" });
  for (const f of [hook, jib, wire, below]) f.input.value = "0";
  for (const f of [gross, hook, jib, wire, below, load]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { gross.input.value = "30000"; hook.input.value = "800"; jib.input.value = "0"; wire.input.value = "400"; below.input.value = "600"; load.input.value = "22000"; update(); });
  const oNet = makeOutputLine(outputRegion, "Net capacity for the hook", "cnc-out-net");
  const oHook = makeOutputLine(outputRegion, "Total hook load", "cnc-out-hook");
  const oPct = makeOutputLine(outputRegion, "Percent of net", "cnc-out-pct");
  const oFlag = makeOutputLine(outputRegion, "Flag", "cnc-out-flag");
  const update = debounce(() => {
    const r = computeCraneNetCapacity({
      gross_chart_lb: Number(gross.input.value) || 0,
      hook_block_lb: Number(hook.input.value) || 0,
      jib_attach_lb: Number(jib.input.value) || 0,
      wire_rope_lb: Number(wire.input.value) || 0,
      below_hook_lb: Number(below.input.value) || 0,
      load_weight_lb: Number(load.input.value) || 0,
    });
    if (r.error) { oNet.textContent = r.error; for (const o of [oHook, oPct, oFlag]) o.textContent = "-"; return; }
    oNet.textContent = fmt(r.net_capacity_lb, 0) + " lb";
    oHook.textContent = fmt(r.total_hook_lb, 0) + " lb";
    oPct.textContent = fmt(r.pct_of_net, 1) + "%";
    oFlag.textContent = r.flag;
  }, DEBOUNCE_MS);
  for (const f of [gross, hook, jib, wire, below, load]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["crane-net-capacity"] = renderCraneNetCapacity;

// --- crane-ground-bearing: Ground Bearing Pressure and Mat Size ---
//
// gbp = reaction / area; required_area = reaction / allowable; mat side =
// sqrt(required_area).
// dims: in { reaction_lb: M L T^-2, bearing_area_ft2: L^2, allowable_psf: M L^-1 T^-2 } out: { gbp_psf: M L^-1 T^-2, required_ft2: L^2, mat_side_ft: L }
// (Reaction is a force M L T^-2 over an area L^2, giving a pressure
//  M L^-1 T^-2; the required area is L^2 and its square root a length L.)
export function computeCraneGroundBearing({ reaction_lb, bearing_area_ft2, allowable_psf } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const reaction = Number(reaction_lb);
  const area = Number(bearing_area_ft2);
  const allowable = Number(allowable_psf);
  if (!Number.isFinite(reaction) || reaction <= 0) return { error: "Reaction must be a positive finite number (lb)." };
  if (!Number.isFinite(area) || area <= 0) return { error: "Bearing area must be a positive finite number (ft^2)." };
  if (!Number.isFinite(allowable) || allowable <= 0) return { error: "Allowable soil bearing must be a positive finite number (psf)." };
  const gbp = reaction / area;
  const requiredFt2 = reaction / allowable;
  const matSideFt = Math.sqrt(requiredFt2);
  if (![gbp, requiredFt2, matSideFt].every(Number.isFinite)) return { error: "Ground-bearing math is not a finite value." };
  return {
    gbp_psf: gbp,
    pass: gbp <= allowable,
    verdict: gbp <= allowable ? "pass" : "fail - increase the bearing area",
    required_ft2: requiredFt2,
    mat_side_ft: matSideFt,
    note: "The maximum reaction comes from the manufacturer's outrigger-reaction chart for the lift quadrant, not the static average - the heaviest corner is during the swing. Allowable soil bearing must come from a geotechnical source; \"looks solid\" is not a number. Voids, backfill, frost, slopes, and adjacent excavations all reduce capacity, and a qualified person verifies the setup.",
  };
}

function renderCraneGroundBearing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: OSHA 29 CFR 1926 Subpart CC and the manufacturer's outrigger-reaction chart by name. gbp = reaction / area; required area = reaction / allowable. Estimate - a geotech source and a qualified person govern.";
  const reaction = makeNumber("Worst-corner reaction (lb)", "cgb-reaction", { step: "any", min: "0" });
  const area = makeNumber("Float / pad / track contact area (ft^2)", "cgb-area", { step: "any", min: "0" });
  const allowable = makeNumber("Allowable soil bearing (psf)", "cgb-allow", { step: "any", min: "0" });
  for (const f of [reaction, area, allowable]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { reaction.input.value = "60000"; area.input.value = "4"; allowable.input.value = "3000"; update(); });
  const oGbp = makeOutputLine(outputRegion, "Ground bearing pressure", "cgb-out-gbp");
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "cgb-out-verdict");
  const oReq = makeOutputLine(outputRegion, "Area required to pass", "cgb-out-req");
  const oMat = makeOutputLine(outputRegion, "Square mat side", "cgb-out-mat");
  const update = debounce(() => {
    const r = computeCraneGroundBearing({ reaction_lb: Number(reaction.input.value) || 0, bearing_area_ft2: Number(area.input.value) || 0, allowable_psf: Number(allowable.input.value) || 0 });
    if (r.error) { oGbp.textContent = r.error; for (const o of [oVerdict, oReq, oMat]) o.textContent = "-"; return; }
    oGbp.textContent = fmt(r.gbp_psf, 0) + " psf";
    oVerdict.textContent = r.verdict;
    oReq.textContent = fmt(r.required_ft2, 1) + " ft^2";
    oMat.textContent = fmt(r.mat_side_ft, 2) + " ft";
  }, DEBOUNCE_MS);
  for (const f of [reaction, area, allowable]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["crane-ground-bearing"] = renderCraneGroundBearing;

// --- sling-d-d-efficiency: Wire-Rope Sling D/d Bend Efficiency ---
//
// ratio = D/d; efficiency interpolated from the WRTB 6x19 / 6x37 curve;
// reduced_wll = rated_wll * efficiency.
const DD_CURVE = [[1, 0.50], [2, 0.65], [3, 0.70], [4, 0.75], [6, 0.83], [8, 0.87], [10, 0.90], [15, 0.92], [20, 0.94], [25, 1.00]];
const _ddEfficiency = (ratio) => {
  if (ratio <= DD_CURVE[0][0]) return DD_CURVE[0][1];
  if (ratio >= DD_CURVE[DD_CURVE.length - 1][0]) return DD_CURVE[DD_CURVE.length - 1][1];
  for (let i = 1; i < DD_CURVE.length; i++) {
    if (ratio <= DD_CURVE[i][0]) {
      const [x1, y1] = DD_CURVE[i - 1], [x2, y2] = DD_CURVE[i];
      return y1 + (ratio - x1) * (y2 - y1) / (x2 - x1);
    }
  }
  return 1.0;
};
// dims: in { rated_wll_lb: M L T^-2, bend_dia_in: L, sling_dia_in: L } out: { ratio: dimensionless, efficiency: dimensionless, reduced_wll_lb: M L T^-2 }
// (Rated WLL is a force M L T^-2; the two diameters are lengths L whose
//  ratio and the bend efficiency are dimensionless; the reduced WLL is a force.)
export function computeSlingDdEfficiency({ rated_wll_lb, bend_dia_in, sling_dia_in } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const rated = Number(rated_wll_lb);
  const bend = Number(bend_dia_in);
  const sling = Number(sling_dia_in);
  if (!Number.isFinite(rated) || rated <= 0) return { error: "Rated WLL must be a positive finite number (lb)." };
  if (!Number.isFinite(bend) || bend <= 0) return { error: "Bend diameter must be a positive finite number (in)." };
  if (!Number.isFinite(sling) || sling <= 0) return { error: "Sling diameter must be a positive finite number (in)." };
  const ratio = bend / sling;
  const efficiency = _ddEfficiency(ratio);
  const reducedWll = rated * efficiency;
  if (![ratio, efficiency, reducedWll].every(Number.isFinite)) return { error: "D/d math is not a finite value." };
  return {
    ratio,
    efficiency,
    reduced_wll_lb: reducedWll,
    note: "The bundled curve is for 6x19 / 6x37 wire-rope slings (synthetic round and web slings follow their own bend factors). The rated WLL is the catalog straight-pull value; the sling-angle factor and any choker-hitch reduction apply on top of this bend efficiency. A damaged or kinked sling is removed from service regardless of the math.",
  };
}

function renderSlingDdEfficiency(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Wire Rope Technical Board Wire Rope Users Manual (D/d bend efficiency) and ASME B30.9 by name. ratio = bend diameter / sling diameter; the curve ships as editable breakpoints. Estimate - inspect every sling.";
  const rated = makeNumber("Catalog WLL, straight pull (lb)", "sdd-rated", { step: "any", min: "0" });
  const bend = makeNumber("Bend diameter D (in) - pin / load", "sdd-bend", { step: "any", min: "0" });
  const sling = makeNumber("Sling diameter d (in)", "sdd-sling", { step: "any", min: "0" });
  for (const f of [rated, bend, sling]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rated.input.value = "10000"; bend.input.value = "3"; sling.input.value = "1"; update(); });
  const oRatio = makeOutputLine(outputRegion, "D/d ratio", "sdd-out-ratio");
  const oEff = makeOutputLine(outputRegion, "Bend efficiency", "sdd-out-eff");
  const oWll = makeOutputLine(outputRegion, "Reduced WLL", "sdd-out-wll");
  const update = debounce(() => {
    const r = computeSlingDdEfficiency({ rated_wll_lb: Number(rated.input.value) || 0, bend_dia_in: Number(bend.input.value) || 0, sling_dia_in: Number(sling.input.value) || 0 });
    if (r.error) { oRatio.textContent = r.error; oEff.textContent = "-"; oWll.textContent = "-"; return; }
    oRatio.textContent = fmt(r.ratio, 2);
    oEff.textContent = fmt(r.efficiency * 100, 1) + "%";
    oWll.textContent = fmt(r.reduced_wll_lb, 0) + " lb";
  }, DEBOUNCE_MS);
  for (const f of [rated, bend, sling]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["sling-d-d-efficiency"] = renderSlingDdEfficiency;

// --- wind-on-load: Wind Force and Swing Angle on a Suspended Load ---
//
// q = 0.00256 * V^2 (ASCE velocity-pressure constant, the same one the
// Group E wind-pressure tile uses); wind_lb = q * area * shape_coef;
// swing = atan(wind_lb / weight).
// dims: in { sail_area_ft2: L^2, wind_mph: L T^-1, shape_coef: dimensionless, load_weight_lb: M L T^-2 } out: { q_psf: M L^-1 T^-2, wind_lb: M L T^-2, swing_deg: dimensionless }
// (Sail area is L^2, wind speed L T^-1; the 0.00256 constant carries the
//  velocity pressure to M L^-1 T^-2 (psf); the lateral force is M L T^-2.)
export function computeWindOnLoad({ sail_area_ft2, wind_mph, shape_coef = 1.6, load_weight_lb } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(sail_area_ft2);
  const wind = Number(wind_mph);
  const shape = Number(shape_coef);
  const weight = Number(load_weight_lb);
  if (!Number.isFinite(area) || area <= 0) return { error: "Sail area must be a positive finite number (ft^2)." };
  if (!Number.isFinite(wind) || wind < 0) return { error: "Wind speed must be a non-negative finite number (mph)." };
  if (!Number.isFinite(shape) || shape <= 0) return { error: "Shape coefficient must be a positive finite number." };
  if (!Number.isFinite(weight) || weight <= 0) return { error: "Load weight must be a positive finite number (lb)." };
  const qPsf = 0.00256 * wind * wind;
  const windLb = qPsf * area * shape;
  const swingDeg = Math.atan(windLb / weight) * 180 / Math.PI;
  if (![qPsf, windLb, swingDeg].every(Number.isFinite)) return { error: "Wind math is not a finite value." };
  return {
    q_psf: qPsf,
    wind_lb: windLb,
    swing_deg: swingDeg,
    note: "Large-area, light loads (panels, tanks, ductwork, wind-turbine components) swing the most and are the most dangerous. The manufacturer's maximum permissible in-service wind speed and the load chart's wind / area limits govern - many large lifts shut down well below storm wind. Gusts exceed the sustained number, and a tag-line crew controls what is left.",
  };
}

function renderWindOnLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASCE velocity-pressure constant q = 0.00256 V^2 (the same the wind-pressure tile uses) and OSHA 1926 Subpart CC by name. wind force = q x sail area x shape coefficient. Estimate - the in-service wind limit governs.";
  const area = makeNumber("Projected sail area (ft^2)", "wol-area", { step: "any", min: "0" });
  const wind = makeNumber("Sustained wind at the load (mph)", "wol-wind", { step: "any", min: "0" });
  const shape = makeNumber("Shape coefficient (flat panel ~1.2-2.0)", "wol-shape", { step: "any", min: "0", value: "1.6" });
  shape.input.value = "1.6";
  const weight = makeNumber("Load weight (lb)", "wol-weight", { step: "any", min: "0" });
  for (const f of [area, wind, shape, weight]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "200"; wind.input.value = "20"; shape.input.value = "1.6"; weight.input.value = "4000"; update(); });
  const oQ = makeOutputLine(outputRegion, "Velocity pressure", "wol-out-q");
  const oForce = makeOutputLine(outputRegion, "Lateral wind force", "wol-out-force");
  const oSwing = makeOutputLine(outputRegion, "Swing angle off vertical", "wol-out-swing");
  const update = debounce(() => {
    const r = computeWindOnLoad({
      sail_area_ft2: Number(area.input.value) || 0,
      wind_mph: Number(wind.input.value) || 0,
      shape_coef: shape.input.value === "" ? 1.6 : Number(shape.input.value),
      load_weight_lb: Number(weight.input.value) || 0,
    });
    if (r.error) { oQ.textContent = r.error; oForce.textContent = "-"; oSwing.textContent = "-"; return; }
    oQ.textContent = fmt(r.q_psf, 3) + " psf";
    oForce.textContent = fmt(r.wind_lb, 1) + " lb";
    oSwing.textContent = fmt(r.swing_deg, 1) + " deg";
  }, DEBOUNCE_MS);
  for (const f of [area, wind, shape, weight]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["wind-on-load"] = renderWindOnLoad;

// --- tagline-force: Tag Line Pull to Control a Suspended Load ---
//
// tag_tension = lateral_force / cos(angle); handlers = ceil(tension /
// per_person); mechanical_help when tension exceeds two handlers.
// dims: in { lateral_force_lb: M L T^-2, tagline_angle_deg: dimensionless, per_person_lb: M L T^-2 } out: { tag_tension_lb: M L T^-2, handlers: dimensionless }
// (Lateral force and per-person pull are forces M L T^-2; the angle and the
//  handler count are dimensionless.)
export function computeTaglineForce({ lateral_force_lb, tagline_angle_deg, per_person_lb = 50 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const force = Number(lateral_force_lb);
  const angle = Number(tagline_angle_deg);
  const perPerson = Number(per_person_lb);
  if (!Number.isFinite(force) || force < 0) return { error: "Lateral force must be a non-negative finite number (lb)." };
  if (!Number.isFinite(angle) || angle <= 0 || angle >= 90) return { error: "Tag-line angle must be greater than 0 and less than 90 degrees." };
  if (!Number.isFinite(perPerson) || perPerson <= 0) return { error: "Per-person pull must be a positive finite number (lb)." };
  const tagTension = force / Math.cos(angle * Math.PI / 180);
  const handlers = Math.ceil(tagTension / perPerson);
  if (![tagTension, handlers].every(Number.isFinite)) return { error: "Tag-line math is not a finite value." };
  return {
    tag_tension_lb: tagTension,
    handlers,
    mechanical_help: tagTension > perPerson * 2,
    verdict: tagTension > perPerson * 2 ? "rig a mechanical tag (snatch block / winch)" : "hand control acceptable",
    note: "A tag line at a shallow angle to horizontal pulls far harder than the lateral force it resists. Tag lines control rotation and position; they do not arrest a falling or runaway load. Handlers stand clear of the swing path and pinch points, and 50 lb sustained per person is a planning default, not a maximum a tired crew can hold in gusts.",
  };
}

function renderTaglineForce(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: OSHA 1926 Subpart CC and standard rigging practice by name. tag tension = lateral force / cos(angle above horizontal); handlers = ceil(tension / per-person pull). Estimate - the lift director governs.";
  const force = makeNumber("Lateral force to resist (lb)", "tgl-force", { step: "any", min: "0" });
  const angle = makeNumber("Tag-line angle above horizontal (deg)", "tgl-angle", { step: "any", min: "0" });
  const perPerson = makeNumber("Safe pull per handler (lb)", "tgl-pp", { step: "any", min: "0", value: "50" });
  perPerson.input.value = "50";
  for (const f of [force, angle, perPerson]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { force.input.value = "328"; angle.input.value = "30"; perPerson.input.value = "50"; update(); });
  const oTension = makeOutputLine(outputRegion, "Tag-line tension", "tgl-out-tension");
  const oHandlers = makeOutputLine(outputRegion, "Handlers at the per-person limit", "tgl-out-handlers");
  const oVerdict = makeOutputLine(outputRegion, "Control method", "tgl-out-verdict");
  const update = debounce(() => {
    const r = computeTaglineForce({
      lateral_force_lb: Number(force.input.value) || 0,
      tagline_angle_deg: Number(angle.input.value) || 0,
      per_person_lb: perPerson.input.value === "" ? 50 : Number(perPerson.input.value),
    });
    if (r.error) { oTension.textContent = r.error; oHandlers.textContent = "-"; oVerdict.textContent = "-"; return; }
    oTension.textContent = fmt(r.tag_tension_lb, 1) + " lb";
    oHandlers.textContent = r.handlers + " handlers";
    oVerdict.textContent = r.verdict;
  }, DEBOUNCE_MS);
  for (const f of [force, angle, perPerson]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["tagline-force"] = renderTaglineForce;

// --- tandem-lift-share: Two-Crane (Tandem) Lift Load Share ---
//
// share_c1 = W * (span - cg) / span; share_c2 = W * cg / span; each crane's
// derated allowable = net chart * derate / 100; combined pass.
// dims: in { total_weight_lb: M L T^-2, span_in: L, cg_from_c1_in: L, derate_pct: dimensionless, c1_chart_lb: M L T^-2, c2_chart_lb: M L T^-2 } out: { share_c1: M L T^-2, share_c2: M L T^-2, allow_c1: M L T^-2, allow_c2: M L T^-2 }
// (Weight and chart capacities are forces M L T^-2; span and CG offset are
//  lengths L; the derate is a dimensionless percent.)
export function computeTandemLiftShare({ total_weight_lb, span_in, cg_from_c1_in, derate_pct = 75, c1_chart_lb, c2_chart_lb } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(total_weight_lb);
  const span = Number(span_in);
  const cg = Number(cg_from_c1_in);
  const derate = Number(derate_pct);
  const c1 = Number(c1_chart_lb);
  const c2 = Number(c2_chart_lb);
  if (!Number.isFinite(w) || w <= 0) return { error: "Total weight must be a positive finite number (lb)." };
  if (!Number.isFinite(span) || span <= 0) return { error: "Span must be a positive finite number (in)." };
  if (!Number.isFinite(cg)) return { error: "CG distance must be a finite number (in)." };
  if (!Number.isFinite(derate) || derate <= 0) return { error: "Derate must be a positive finite number (percent)." };
  if (!Number.isFinite(c1) || c1 <= 0) return { error: "Crane 1 capacity must be a positive finite number (lb)." };
  if (!Number.isFinite(c2) || c2 <= 0) return { error: "Crane 2 capacity must be a positive finite number (lb)." };
  const shareC1 = w * (span - cg) / span;
  const shareC2 = w * cg / span;
  const allowC1 = c1 * derate / 100;
  const allowC2 = c2 * derate / 100;
  if (![shareC1, shareC2, allowC1, allowC2].every(Number.isFinite)) return { error: "Tandem-share math is not a finite value." };
  const passC1 = shareC1 <= allowC1;
  const passC2 = shareC2 <= allowC2;
  return {
    share_c1: shareC1,
    share_c2: shareC2,
    allow_c1: allowC1,
    allow_c2: allowC2,
    pass_c1: passC1,
    pass_c2: passC2,
    pass: passC1 && passC2,
    verdict: passC1 && passC2 ? "pass" : "fail - move the pick point or upsize a crane",
    note: "A designated lift director controls a tandem lift. The 75% derate is a common planning default; the engineered lift plan or the more restrictive manufacturer guidance governs. Load shift during travel, boom-to-load geometry, and out-of-level all change the share in real time, and a critical-lift procedure with an engineered plan is standard for multi-crane work.",
  };
}

function renderTandemLiftShare(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASME B30.5 and OSHA 1926 Subpart CC by name. Each crane's share is the cg-load-share statics; allowable = net chart x derate. Estimate - a designated lift director and an engineered plan govern.";
  const w = makeNumber("Total load weight (lb)", "tls-w", { step: "any", min: "0" });
  const span = makeNumber("Span between crane picks (in)", "tls-span", { step: "any", min: "0" });
  const cg = makeNumber("Distance from crane 1 to CG (in)", "tls-cg", { step: "any" });
  const derate = makeNumber("Per-crane derate (percent)", "tls-derate", { step: "any", min: "0", value: "75" });
  derate.input.value = "75";
  const c1 = makeNumber("Crane 1 net capacity (lb)", "tls-c1", { step: "any", min: "0" });
  const c2 = makeNumber("Crane 2 net capacity (lb)", "tls-c2", { step: "any", min: "0" });
  for (const f of [w, span, cg, derate, c1, c2]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { w.input.value = "40000"; span.input.value = "300"; cg.input.value = "120"; derate.input.value = "75"; c1.input.value = "28000"; c2.input.value = "24000"; update(); });
  const oS1 = makeOutputLine(outputRegion, "Crane 1 share / allowable", "tls-out-s1");
  const oS2 = makeOutputLine(outputRegion, "Crane 2 share / allowable", "tls-out-s2");
  const oVerdict = makeOutputLine(outputRegion, "Combined verdict", "tls-out-verdict");
  const update = debounce(() => {
    const r = computeTandemLiftShare({
      total_weight_lb: Number(w.input.value) || 0,
      span_in: Number(span.input.value) || 0,
      cg_from_c1_in: Number(cg.input.value) || 0,
      derate_pct: derate.input.value === "" ? 75 : Number(derate.input.value),
      c1_chart_lb: Number(c1.input.value) || 0,
      c2_chart_lb: Number(c2.input.value) || 0,
    });
    if (r.error) { oS1.textContent = r.error; oS2.textContent = "-"; oVerdict.textContent = "-"; return; }
    oS1.textContent = fmt(r.share_c1, 0) + " / " + fmt(r.allow_c1, 0) + " lb " + (r.pass_c1 ? "(ok)" : "(over)");
    oS2.textContent = fmt(r.share_c2, 0) + " / " + fmt(r.allow_c2, 0) + " lb " + (r.pass_c2 ? "(ok)" : "(over)");
    oVerdict.textContent = r.verdict;
  }, DEBOUNCE_MS);
  for (const f of [w, span, cg, derate, c1, c2]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["tandem-lift-share"] = renderTandemLiftShare;
