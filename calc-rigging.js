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

// max-wind-speed-for-lift: inverse of wind-on-load. The forward tile gives the
// swing angle from a wind speed; the in-service shutdown question is the inverse
// -- the wind speed at which a suspended load reaches a maximum allowable swing.
// From swing = atan(wind_lb / weight) and wind_lb = 0.00256 V^2 x area x shape,
// V = sqrt( weight x tan(swing) / (0.00256 x area x shape) ).
// dims: in { max_swing_deg: dimensionless, load_weight_lb: M L T^-2, sail_area_ft2: L^2, shape_coef: dimensionless } out: { max_wind_mph: L T^-1, wind_lb: M L T^-2 }
export function computeMaxWindSpeedForLift({ max_swing_deg = 5, load_weight_lb, sail_area_ft2, shape_coef = 1.6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const swing = Number(max_swing_deg);
  const weight = Number(load_weight_lb);
  const area = Number(sail_area_ft2);
  const shape = Number(shape_coef);
  if (!Number.isFinite(swing) || !(swing > 0 && swing < 90)) return { error: "Max swing angle must be over 0 and under 90 degrees." };
  if (!Number.isFinite(weight) || weight <= 0) return { error: "Load weight must be a positive finite number (lb)." };
  if (!Number.isFinite(area) || area <= 0) return { error: "Sail area must be a positive finite number (ft^2)." };
  if (!Number.isFinite(shape) || shape <= 0) return { error: "Shape coefficient must be a positive finite number." };
  const wind_lb = weight * Math.tan(swing * Math.PI / 180);
  const max_wind_mph = Math.sqrt(wind_lb / (0.00256 * area * shape));
  if (![wind_lb, max_wind_mph].every(Number.isFinite)) return { error: "Wind math is not a finite value." };
  return {
    max_wind_mph, wind_lb,
    note: "The sustained wind speed at which a suspended load reaches the chosen swing limit (about 5 degrees is a common in-service planning threshold; the load chart and manufacturer set the real limit). Large-area, light loads (panels, tanks, ductwork, wind-turbine blades) reach it at low wind and are the most dangerous. This is a planning estimate off the sustained wind and the projected sail area; gusts exceed the sustained number, a tag-line crew controls the rest, and the manufacturer's maximum permissible in-service wind speed and the load chart's wind/area limits govern -- many large lifts shut down well below storm wind.",
  };
}
export const maxWindSpeedForLiftExample = { inputs: { max_swing_deg: 5, load_weight_lb: 4000, sail_area_ft2: 200, shape_coef: 1.6 } };
function renderMaxWindSpeedForLift(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASCE velocity-pressure q = 0.00256 V^2 and the swing relation swing = atan(wind force / weight) solved for the wind speed, V = sqrt(weight x tan(swing) / (0.00256 x area x shape)); OSHA 1926 Subpart CC by name. Estimate - the manufacturer's in-service wind limit governs.";
  const swing = makeNumber("Max allowable swing (deg, ~5 planning)", "mws-swing", { step: "any", min: "0", value: "5" });
  swing.input.value = "5";
  const weight = makeNumber("Load weight (lb)", "mws-weight", { step: "any", min: "0" });
  const area = makeNumber("Projected sail area (ft^2)", "mws-area", { step: "any", min: "0" });
  const shape = makeNumber("Shape coefficient (flat panel ~1.2-2.0)", "mws-shape", { step: "any", min: "0", value: "1.6" });
  shape.input.value = "1.6";
  for (const f of [swing, weight, area, shape]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { swing.input.value = "5"; weight.input.value = "4000"; area.input.value = "200"; shape.input.value = "1.6"; update(); });
  const oV = makeOutputLine(outputRegion, "Max sustained wind speed", "mws-out-v");
  const oF = makeOutputLine(outputRegion, "Lateral force at the limit", "mws-out-f");
  const oN = makeOutputLine(outputRegion, "Note", "mws-out-n");
  const update = debounce(() => {
    const r = computeMaxWindSpeedForLift({
      max_swing_deg: swing.input.value === "" ? 5 : Number(swing.input.value),
      load_weight_lb: Number(weight.input.value) || 0,
      sail_area_ft2: Number(area.input.value) || 0,
      shape_coef: shape.input.value === "" ? 1.6 : Number(shape.input.value),
    });
    if (r.error) { oV.textContent = r.error; oF.textContent = "-"; oN.textContent = "-"; return; }
    oV.textContent = fmt(r.max_wind_mph, 1) + " mph";
    oF.textContent = fmt(r.wind_lb, 1) + " lb";
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [swing, weight, area, shape]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["max-wind-speed-for-lift"] = renderMaxWindSpeedForLift;

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
    note: "A tag line kept shallow (near horizontal) pulls close to the lateral force it resists; as it steepens toward vertical the tension climbs steeply (T = force / cos of the angle above horizontal), so keep handlers back and the line low. Tag lines control rotation and position; they do not arrest a falling or runaway load. Handlers stand clear of the swing path and pinch points, and 50 lb sustained per person is a planning default, not a maximum a tired crew can hold in gusts.",
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

// =====================================================================
// spec-v66: hardware and below-the-hook (Group Z, calc-rigging.js).
// =====================================================================

// --- shackle-eyebolt-wll: Hardware WLL and Angular Derate ---
//
// derated_capacity = rated_wll x derate(angle, hardware); pass when it meets
// the leg load. Side-load / angular-pull derate curves are editable
// approximations of the ASME B30.26 manufacturer charts. Helpers above dims.
const SHACKLE_DERATE = [[0, 1.00], [45, 0.70], [90, 0.50]];
const EYEBOLT_DERATE = [[0, 1.00], [15, 0.75], [30, 0.55], [45, 0.30], [60, 0.15]];
const _derateInterp = (curve, angle) => {
  if (angle <= curve[0][0]) return curve[0][1];
  if (angle >= curve[curve.length - 1][0]) return curve[curve.length - 1][1];
  for (let i = 1; i < curve.length; i++) {
    if (angle <= curve[i][0]) {
      const [x1, y1] = curve[i - 1], [x2, y2] = curve[i];
      return y1 + (angle - x1) * (y2 - y1) / (x2 - x1);
    }
  }
  return curve[curve.length - 1][1];
};
// dims: in { leg_load_lb: M L T^-2, rated_wll_lb: M L T^-2, angle_deg: dimensionless, hardware: dimensionless, design_factor: dimensionless } out: { required_wll_lb: M L T^-2, derate: dimensionless, derated_capacity_lb: M L T^-2, mbs_lb: M L T^-2 }
// (Leg load and rated WLL are forces M L T^-2; the angle and derate are
//  dimensionless; the derated capacity and minimum breaking strength are forces.)
export function computeShackleEyeboltWll({ leg_load_lb, rated_wll_lb, angle_deg = 0, hardware = "shackle", design_factor = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const leg = Number(leg_load_lb);
  const rated = Number(rated_wll_lb);
  const angle = Number(angle_deg);
  const df = Number(design_factor);
  if (!Number.isFinite(leg) || leg <= 0) return { error: "Leg load must be a positive finite number (lb)." };
  if (!Number.isFinite(rated) || rated <= 0) return { error: "Rated WLL must be a positive finite number (lb)." };
  if (!Number.isFinite(angle) || angle < 0 || angle > 90) return { error: "Angle of pull must be between 0 and 90 degrees." };
  if (!Number.isFinite(df) || df <= 0) return { error: "Design factor must be a positive finite number." };
  const curve = hardware === "shoulder_eyebolt" ? EYEBOLT_DERATE : SHACKLE_DERATE;
  const derate = _derateInterp(curve, angle);
  const deratedCapacity = rated * derate;
  const mbs = rated * df;
  if (![derate, deratedCapacity, mbs].every(Number.isFinite)) return { error: "Derate math is not a finite value." };
  return {
    required_wll_lb: leg,
    derate,
    derated_capacity_lb: deratedCapacity,
    mbs_lb: mbs,
    hardware: hardware === "shoulder_eyebolt" ? "shoulder eye bolt" : "shackle",
    pass: deratedCapacity >= leg,
    verdict: deratedCapacity >= leg ? "pass" : "fail - hardware undersized at this angle",
    note: "Shackles are loaded in line through the bow and pin; a side load follows the manufacturer's reduced chart. An eye bolt pulled at an angle can lose more than half its rating, and an angular pull on a plain (non-shoulder) eye bolt is not permitted. The 5:1 design factor is on the WLL, not a license to load to the minimum breaking strength. Inspect every piece; the manufacturer's exact chart governs.",
  };
}

function renderShackleEyeboltWll(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASME B30.26 (Rigging Hardware) and ASME B18.15 / manufacturer eye-bolt data by name; the angular derate curves ship as editable approximations. Estimate - the rating plate governs.";
  const leg = makeNumber("Leg load (lb)", "se-leg", { step: "any", min: "0" });
  const rated = makeNumber("Catalog WLL of the hardware (lb)", "se-rated", { step: "any", min: "0" });
  const hardware = makeSelect("Hardware", "se-hw", [
    { value: "shackle", label: "Shackle (side load)", selected: true }, { value: "shoulder_eyebolt", label: "Shoulder eye bolt (angular pull)" },
  ]);
  const angle = makeNumber("Angle of pull off axis (deg)", "se-angle", { step: "any", min: "0" });
  for (const f of [leg, rated, hardware, angle]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { leg.input.value = "3000"; rated.input.value = "7000"; hardware.select.value = "shoulder_eyebolt"; angle.input.value = "45"; update(); });
  const oReq = makeOutputLine(outputRegion, "Required WLL", "se-out-req");
  const oDerate = makeOutputLine(outputRegion, "Derate at this angle", "se-out-derate");
  const oCap = makeOutputLine(outputRegion, "Derated capacity", "se-out-cap");
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "se-out-verdict");
  const update = debounce(() => {
    const r = computeShackleEyeboltWll({ leg_load_lb: Number(leg.input.value) || 0, rated_wll_lb: Number(rated.input.value) || 0, angle_deg: Number(angle.input.value) || 0, hardware: hardware.select.value });
    if (r.error) { oReq.textContent = r.error; for (const o of [oDerate, oCap, oVerdict]) o.textContent = "-"; return; }
    oReq.textContent = fmt(r.required_wll_lb, 0) + " lb (MBS at 5:1 " + fmt(r.mbs_lb, 0) + " lb)";
    oDerate.textContent = fmt(r.derate * 100, 0) + "% (" + r.hardware + ")";
    oCap.textContent = fmt(r.derated_capacity_lb, 0) + " lb";
    oVerdict.textContent = r.verdict;
  }, DEBOUNCE_MS);
  for (const f of [leg, rated, angle]) f.input.addEventListener("input", update);
  hardware.select.addEventListener("change", update);
}
RIGGING_RENDERERS["shackle-eyebolt-wll"] = renderShackleEyeboltWll;

// --- spreader-beam: Spreader Bar vs Lifting Beam Below the Hook ---
//
// sling_angle = atan(h / (S/2)); top_sling = (W/2)/sin(angle);
// bar_compression = (W/2)/tan(angle); beam_moment = (W/2)(S/2); headroom = h.
// dims: in { load_lb: M L T^-2, bar_length_ft: L, top_height_ft: L } out: { sling_angle_deg: dimensionless, top_sling_tension_lb: M L T^-2, bar_compression_lb: M L T^-2, beam_moment_ftlb: M L^2 T^-2, headroom_ft: L }
// (Load is a force M L T^-2; bar length and top height are lengths L; the bending
//  moment is a force-times-length M L^2 T^-2.)
export function computeSpreaderBeam({ load_lb, bar_length_ft, top_height_ft } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const load = Number(load_lb);
  const bar = Number(bar_length_ft);
  const top = Number(top_height_ft);
  if (!Number.isFinite(load) || load <= 0) return { error: "Load must be a positive finite number (lb)." };
  if (!Number.isFinite(bar) || bar <= 0) return { error: "Bar length must be a positive finite number (ft)." };
  if (!Number.isFinite(top) || top <= 0) return { error: "Top height must be a positive finite number (ft)." };
  const half = load / 2;
  const slingAngleRad = Math.atan(top / (bar / 2));
  const slingAngleDeg = slingAngleRad * 180 / Math.PI;
  const topSlingTension = half / Math.sin(slingAngleRad);
  const barCompression = half / Math.tan(slingAngleRad);
  const beamMoment = half * (bar / 2);
  if (![slingAngleDeg, topSlingTension, barCompression, beamMoment].every(Number.isFinite)) return { error: "Spreader math is not a finite value." };
  return {
    sling_angle_deg: slingAngleDeg,
    top_sling_tension_lb: topSlingTension,
    bar_compression_lb: barCompression,
    beam_moment_ftlb: beamMoment,
    headroom_ft: top,
    note: "A spreader bar keeps the slings off the load and carries axial compression - check it for buckling, not just stress. A lifting beam needs more headroom but lets the slings hang vertical. Both are engineered below-the-hook devices marked with a rated capacity; ASME BTH-1 / B30.20 and the rating plate govern. This tile sizes the demand, not the device.",
  };
}

function renderSpreaderBeam(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASME BTH-1 (Design of Below-the-Hook Lifting Devices) and ASME B30.20 by name. Spreader bar = axial compression, lifting beam = bending moment; top sling tension = (W/2)/sin(angle). Estimate - the rating plate governs.";
  const load = makeNumber("Total load (lb)", "sb-load", { step: "any", min: "0" });
  const bar = makeNumber("Bar length, pick to pick (ft)", "sb-bar", { step: "any", min: "0" });
  const top = makeNumber("Top point height above bar (ft)", "sb-top", { step: "any", min: "0" });
  for (const f of [load, bar, top]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { load.input.value = "10000"; bar.input.value = "10"; top.input.value = "6"; update(); });
  const oAngle = makeOutputLine(outputRegion, "Sling angle at bar end", "sb-out-angle");
  const oTop = makeOutputLine(outputRegion, "Top sling tension (each)", "sb-out-top");
  const oBar = makeOutputLine(outputRegion, "Spreader bar compression", "sb-out-bar");
  const oMoment = makeOutputLine(outputRegion, "Lifting beam moment", "sb-out-moment");
  const oHead = makeOutputLine(outputRegion, "Headroom consumed", "sb-out-head");
  const update = debounce(() => {
    const r = computeSpreaderBeam({ load_lb: Number(load.input.value) || 0, bar_length_ft: Number(bar.input.value) || 0, top_height_ft: Number(top.input.value) || 0 });
    if (r.error) { oAngle.textContent = r.error; for (const o of [oTop, oBar, oMoment, oHead]) o.textContent = "-"; return; }
    oAngle.textContent = fmt(r.sling_angle_deg, 1) + " deg";
    oTop.textContent = fmt(r.top_sling_tension_lb, 0) + " lb";
    oBar.textContent = fmt(r.bar_compression_lb, 0) + " lb";
    oMoment.textContent = fmt(r.beam_moment_ftlb, 0) + " ft-lb";
    oHead.textContent = fmt(r.headroom_ft, 1) + " ft";
  }, DEBOUNCE_MS);
  for (const f of [load, bar, top]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["spreader-beam"] = renderSpreaderBeam;

// spreader-beam-min-height: inverse of spreader-beam. The forward tile gives the top-sling tension from the top-point
// height; the inverse recovers the minimum top-point height so the top-sling tension stays within the sling WLL, since a
// taller rig makes a steeper (nearer-vertical) sling that carries less tension. From
// top_sling_tension = (load/2) / sin(angle) and angle = atan(top / (bar/2)),
// angle_min = asin( load / (2 x WLL) ) and top_min = (bar/2) x tan(angle_min). Only solvable when WLL > load/2, since
// each top sling carries at least half the load even hung vertical.
// dims: in { load_lb: M L T^-2, bar_length_ft: L, sling_wll_lb: M L T^-2 } out: { min_top_height_ft: L, sling_angle_deg: dimensionless, bar_compression_lb: M L T^-2 }
export function computeSpreaderBeamMinHeight({ load_lb, bar_length_ft, sling_wll_lb } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const load = Number(load_lb);
  const bar = Number(bar_length_ft);
  const wll = Number(sling_wll_lb);
  if (!Number.isFinite(load) || load <= 0) return { error: "Load must be a positive finite number (lb)." };
  if (!Number.isFinite(bar) || bar <= 0) return { error: "Bar length must be a positive finite number (ft)." };
  if (!Number.isFinite(wll) || wll <= 0) return { error: "Sling WLL must be a positive finite number (lb)." };
  const ratio = load / (2 * wll);
  if (!(ratio < 1)) return { error: "Sling WLL must exceed half the load (each top sling carries at least W/2 even hung vertical)." };
  const angleRad = Math.asin(ratio);
  const sling_angle_deg = angleRad * 180 / Math.PI;
  const min_top_height_ft = (bar / 2) * Math.tan(angleRad);
  const bar_compression_lb = (load / 2) / Math.tan(angleRad);
  if (![sling_angle_deg, min_top_height_ft, bar_compression_lb].every(Number.isFinite)) return { error: "Min-height math is not a finite value." };
  return {
    min_top_height_ft, sling_angle_deg, bar_compression_lb,
    note: "Minimum top-point height so the top-sling tension stays within the sling WLL: angle = asin( load / (2 x WLL) ), then top = (bar/2) x tan(angle). A taller rig makes a steeper (nearer-vertical) sling that carries less tension, so this is a floor - build to at least this height, and more is safer. Each top sling still carries at least half the load even hung vertical, so the WLL must exceed W/2 or no height works. The spreader bar carries the axial compression shown - check it for buckling. Both spreader bars and lifting beams are engineered below-the-hook devices; ASME BTH-1 / B30.20 and the rating plate govern. This tile sizes the demand, not the device.",
  };
}
function renderSpreaderBeamMinHeight(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASME BTH-1 (Design of Below-the-Hook Lifting Devices) and ASME B30.20 by name; top sling tension = (W/2)/sin(angle) solved for the height: angle = asin( W / (2 x WLL) ), top = (bar/2) x tan(angle). Estimate - the rating plate governs.";
  const load = makeNumber("Total load (lb)", "sbm-load", { step: "any", min: "0" });
  const bar = makeNumber("Bar length, pick to pick (ft)", "sbm-bar", { step: "any", min: "0" });
  const wll = makeNumber("Top sling WLL, each (lb)", "sbm-wll", { step: "any", min: "0" });
  for (const f of [load, bar, wll]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { load.input.value = "10000"; bar.input.value = "10"; wll.input.value = "6000"; update(); });
  const oHeight = makeOutputLine(outputRegion, "Minimum top-point height", "sbm-out-height");
  const oAngle = makeOutputLine(outputRegion, "Sling angle at that height", "sbm-out-angle");
  const oBar = makeOutputLine(outputRegion, "Spreader bar compression", "sbm-out-bar");
  const oNote = makeOutputLine(outputRegion, "Note", "sbm-out-note");
  const update = debounce(() => {
    const r = computeSpreaderBeamMinHeight({ load_lb: Number(load.input.value) || 0, bar_length_ft: Number(bar.input.value) || 0, sling_wll_lb: Number(wll.input.value) || 0 });
    if (r.error) { oHeight.textContent = r.error; for (const o of [oAngle, oBar, oNote]) o.textContent = o === oNote ? "" : "-"; return; }
    oHeight.textContent = fmt(r.min_top_height_ft, 2) + " ft";
    oAngle.textContent = fmt(r.sling_angle_deg, 1) + " deg";
    oBar.textContent = fmt(r.bar_compression_lb, 0) + " lb";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [load, bar, wll]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["spreader-beam-min-height"] = renderSpreaderBeamMinHeight;

// --- forklift-capacity-derate: Load-Center and Attachment Derating ---
//
// net_capacity = rated_cap x rated_lc / actual_lc (data-plate method);
// pass when load <= net; margin_pct = (net - load)/net x 100.
// dims: in { rated_cap_lb: M L T^-2, rated_lc_in: L, actual_lc_in: L, load_lb: M L T^-2 } out: { net_capacity_lb: M L T^-2, margin_pct: dimensionless }
// (Rated capacity and load are forces M L T^-2; the load centers are lengths L;
//  the margin is a dimensionless percent.)
export function computeForkliftCapacityDerate({ rated_cap_lb, rated_lc_in = 24, actual_lc_in, load_lb } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ratedCap = Number(rated_cap_lb);
  const ratedLc = Number(rated_lc_in);
  const actualLc = Number(actual_lc_in);
  const load = Number(load_lb);
  if (!Number.isFinite(ratedCap) || ratedCap <= 0) return { error: "Rated capacity must be a positive finite number (lb)." };
  if (!Number.isFinite(ratedLc) || ratedLc <= 0) return { error: "Rated load center must be a positive finite number (in)." };
  if (!Number.isFinite(actualLc) || actualLc <= 0) return { error: "Actual load center must be a positive finite number (in)." };
  if (!Number.isFinite(load) || load <= 0) return { error: "Load must be a positive finite number (lb)." };
  const netCapacity = ratedCap * ratedLc / actualLc;
  const marginPct = (netCapacity - load) / netCapacity * 100;
  if (![netCapacity, marginPct].every(Number.isFinite)) return { error: "Derate math is not a finite value." };
  return {
    net_capacity_lb: netCapacity,
    margin_pct: marginPct,
    pass: load <= netCapacity,
    verdict: load <= netCapacity ? "pass" : "fail - over the derated capacity",
    note: "The truck's capacity plate is the legal rating, and an attachment changes the plate - a derated plate must be fitted by the dealer for any attachment. Raising the load, tilting forward, soft ground, and grade all reduce real capacity further. A load whose CG is beyond the rated load center tips the truck forward before the rear wheels can react.",
  };
}

function renderForkliftCapacityDerate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASME B56.1 (Powered Industrial Trucks) and the truck data plate by name. net capacity = rated x rated load center / actual load center. Estimate - the capacity plate is the legal rating.";
  const ratedCap = makeNumber("Rated capacity (lb)", "fk-cap", { step: "any", min: "0" });
  const ratedLc = makeNumber("Rated load center (in)", "fk-rlc", { step: "any", min: "0", value: "24" });
  ratedLc.input.value = "24";
  const actualLc = makeNumber("Actual load center (in)", "fk-alc", { step: "any", min: "0" });
  const load = makeNumber("Load to handle (lb)", "fk-load", { step: "any", min: "0" });
  for (const f of [ratedCap, ratedLc, actualLc, load]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ratedCap.input.value = "5000"; ratedLc.input.value = "24"; actualLc.input.value = "36"; load.input.value = "3000"; update(); });
  const oNet = makeOutputLine(outputRegion, "Net capacity at actual load center", "fk-out-net");
  const oMargin = makeOutputLine(outputRegion, "Margin", "fk-out-margin");
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "fk-out-verdict");
  const update = debounce(() => {
    const r = computeForkliftCapacityDerate({ rated_cap_lb: Number(ratedCap.input.value) || 0, rated_lc_in: Number(ratedLc.input.value) || 0, actual_lc_in: Number(actualLc.input.value) || 0, load_lb: Number(load.input.value) || 0 });
    if (r.error) { oNet.textContent = r.error; oMargin.textContent = "-"; oVerdict.textContent = "-"; return; }
    oNet.textContent = fmt(r.net_capacity_lb, 0) + " lb";
    oMargin.textContent = fmt(r.margin_pct, 1) + "%";
    oVerdict.textContent = r.verdict;
  }, DEBOUNCE_MS);
  for (const f of [ratedCap, ratedLc, actualLc, load]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["forklift-capacity-derate"] = renderForkliftCapacityDerate;

// --- roller-jack-force: Push / Pull Force on Rollers, Skates, or an Incline ---
//
// roll_force = load x coef x cos(incline); grade_force = load x sin(incline);
// push_steady = roll + grade; push_breakaway = steady x 1.5;
// skates = ceil(load / skate_cap).
// dims: in { load_lb: M L T^-2, roll_coef: dimensionless, incline_deg: dimensionless, skate_cap_lb: M L T^-2 } out: { roll_force_lb: M L T^-2, grade_force_lb: M L T^-2, push_steady_lb: M L T^-2, push_breakaway_lb: M L T^-2, skates_needed: dimensionless }
// (Load and skate capacity are forces M L T^-2; the rolling coefficient and
//  incline are dimensionless; the forces are M L T^-2 and the skate count dimensionless.)
export function computeRollerJackForce({ load_lb, roll_coef = 0.03, incline_deg = 0, skate_cap_lb } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const load = Number(load_lb);
  const coef = Number(roll_coef);
  const incline = Number(incline_deg);
  const skateCap = Number(skate_cap_lb);
  if (!Number.isFinite(load) || load <= 0) return { error: "Load must be a positive finite number (lb)." };
  if (!Number.isFinite(coef) || coef <= 0) return { error: "Rolling coefficient must be a positive finite number." };
  if (!Number.isFinite(incline) || incline < 0 || incline >= 90) return { error: "Incline must be between 0 and 90 degrees." };
  if (!Number.isFinite(skateCap) || skateCap <= 0) return { error: "Skate capacity must be a positive finite number (lb)." };
  const inclineRad = incline * Math.PI / 180;
  const rollForce = load * coef * Math.cos(inclineRad);
  const gradeForce = load * Math.sin(inclineRad);
  const pushSteady = rollForce + gradeForce;
  const pushBreakaway = pushSteady * 1.5;
  const skatesNeeded = Math.ceil(load / skateCap);
  if (![rollForce, gradeForce, pushSteady, pushBreakaway, skatesNeeded].every(Number.isFinite)) return { error: "Roller math is not a finite value." };
  return {
    roll_force_lb: rollForce,
    grade_force_lb: gradeForce,
    push_steady_lb: pushSteady,
    push_breakaway_lb: pushBreakaway,
    skates_needed: skatesNeeded,
    note: "The rolling coefficient depends on the skate, the floor, and debris - a single chip under a roller stops the move. On any grade the load wants to run away and must be controlled with a winch or come-along on the downhill side, never by hand. Skate count is sized by capacity and by keeping the load stable on at least three points, and the floor's own capacity must be verified for the concentrated wheel load.",
  };
}

function renderRollerJackForce(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: standard machinery-moving practice (rolling resistance + grade) by name. roll force = load x coefficient x cos(incline); grade force = load x sin(incline); breakaway = 1.5x steady. Estimate - verify the floor capacity.";
  const load = makeNumber("Load on the skates (lb)", "rj-load", { step: "any", min: "0" });
  const coef = makeNumber("Rolling coefficient (skate ~0.02-0.05)", "rj-coef", { step: "any", min: "0", value: "0.03" });
  coef.input.value = "0.03";
  const incline = makeNumber("Incline (deg, 0 = level)", "rj-incline", { step: "any", min: "0" });
  const skateCap = makeNumber("Capacity of one skate (lb)", "rj-skate", { step: "any", min: "0" });
  for (const f of [load, coef, incline, skateCap]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { load.input.value = "12000"; coef.input.value = "0.03"; incline.input.value = "0"; skateCap.input.value = "5000"; update(); });
  const oRoll = makeOutputLine(outputRegion, "Rolling force", "rj-out-roll");
  const oPush = makeOutputLine(outputRegion, "Steady push (grade + roll)", "rj-out-push");
  const oBreak = makeOutputLine(outputRegion, "Breakaway push", "rj-out-break");
  const oSkates = makeOutputLine(outputRegion, "Skates by capacity", "rj-out-skates");
  const update = debounce(() => {
    const r = computeRollerJackForce({ load_lb: Number(load.input.value) || 0, roll_coef: coef.input.value === "" ? 0.03 : Number(coef.input.value), incline_deg: Number(incline.input.value) || 0, skate_cap_lb: Number(skateCap.input.value) || 0 });
    if (r.error) { oRoll.textContent = r.error; for (const o of [oPush, oBreak, oSkates]) o.textContent = "-"; return; }
    oRoll.textContent = fmt(r.roll_force_lb, 0) + " lb (grade " + fmt(r.grade_force_lb, 0) + " lb)";
    oPush.textContent = fmt(r.push_steady_lb, 0) + " lb";
    oBreak.textContent = fmt(r.push_breakaway_lb, 0) + " lb";
    oSkates.textContent = r.skates_needed + " skates";
  }, DEBOUNCE_MS);
  for (const f of [load, coef, incline, skateCap]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["roller-jack-force"] = renderRollerJackForce;

// --- chain-lever-hoist: Hand Chain / Lever Hoist Effort and Chain Travel ---
//
// hand_pull = load / (mech_adv x efficiency); hand_chain_travel = lift x
// mech_adv; pass when load <= rated.
// dims: in { load_lb: M L T^-2, rated_wll_lb: M L T^-2, mech_adv: dimensionless, efficiency: dimensionless, lift_ft: L } out: { hand_pull_lb: M L T^-2, hand_chain_travel_ft: L }
// (Load and rated WLL are forces M L T^-2; mechanical advantage and efficiency
//  are dimensionless; the lift and chain travel are lengths L.)
export function computeChainLeverHoist({ load_lb, rated_wll_lb, mech_adv, efficiency = 0.85, lift_ft = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const load = Number(load_lb);
  const rated = Number(rated_wll_lb);
  const ma = Number(mech_adv);
  const eff = Number(efficiency);
  const lift = Number(lift_ft);
  if (!Number.isFinite(load) || load <= 0) return { error: "Load must be a positive finite number (lb)." };
  if (!Number.isFinite(rated) || rated <= 0) return { error: "Rated WLL must be a positive finite number (lb)." };
  if (!Number.isFinite(ma) || ma <= 0) return { error: "Mechanical advantage must be a positive finite number." };
  if (!Number.isFinite(eff) || eff <= 0) return { error: "Efficiency must be a positive finite number." };
  if (!Number.isFinite(lift) || lift < 0) return { error: "Lift distance must be a non-negative finite number (ft)." };
  const handPull = load / (ma * eff);
  const handChainTravel = lift * ma;
  if (![handPull, handChainTravel].every(Number.isFinite)) return { error: "Hoist math is not a finite value." };
  return {
    hand_pull_lb: handPull,
    hand_chain_travel_ft: handChainTravel,
    pass: load <= rated,
    verdict: load <= rated ? "pass" : "fail - over the rated WLL",
    note: "ASME B30.16 / B30.21 limit the effort one person may apply - a load that needs a cheater bar or a second person on the lever is overloaded, stop. The hoist's rated WLL is the ceiling regardless of the leverage available. The hand chain is long because the advantage is high, and the load drops fast if the brake is defeated. Inspect the hoist, hooks, and chain before the lift.",
  };
}

function renderChainLeverHoist(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASME B30.16 (Overhead Hoists) and ASME B30.21 (Lever Hoists) by name. hand pull = load / (mechanical advantage x efficiency); hand-chain travel = lift x mechanical advantage. Estimate - the rated WLL is the ceiling.";
  const load = makeNumber("Load (lb)", "ch-load", { step: "any", min: "0" });
  const rated = makeNumber("Hoist rated WLL (lb)", "ch-rated", { step: "any", min: "0" });
  const ma = makeNumber("Mechanical advantage", "ch-ma", { step: "any", min: "0" });
  const eff = makeNumber("Drivetrain efficiency", "ch-eff", { step: "any", min: "0", value: "0.85" });
  eff.input.value = "0.85";
  const lift = makeNumber("Lift distance (ft)", "ch-lift", { step: "any", min: "0" });
  for (const f of [load, rated, ma, eff, lift]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { load.input.value = "2000"; rated.input.value = "2000"; ma.input.value = "32"; eff.input.value = "0.85"; lift.input.value = "4"; update(); });
  const oPull = makeOutputLine(outputRegion, "Hand pull required", "ch-out-pull");
  const oTravel = makeOutputLine(outputRegion, "Hand-chain travel for the lift", "ch-out-travel");
  const oVerdict = makeOutputLine(outputRegion, "Verdict vs rated WLL", "ch-out-verdict");
  const update = debounce(() => {
    const r = computeChainLeverHoist({ load_lb: Number(load.input.value) || 0, rated_wll_lb: Number(rated.input.value) || 0, mech_adv: Number(ma.input.value) || 0, efficiency: eff.input.value === "" ? 0.85 : Number(eff.input.value), lift_ft: Number(lift.input.value) || 0 });
    if (r.error) { oPull.textContent = r.error; oTravel.textContent = "-"; oVerdict.textContent = "-"; return; }
    oPull.textContent = fmt(r.hand_pull_lb, 1) + " lb";
    oTravel.textContent = fmt(r.hand_chain_travel_ft, 0) + " ft";
    oVerdict.textContent = r.verdict;
  }, DEBOUNCE_MS);
  for (const f of [load, rated, ma, eff, lift]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["chain-lever-hoist"] = renderChainLeverHoist;

// --- block-redirect-load: Resultant Force on a Rigging Block ---
//
// resultant = 2 x line_tension x sin(direction_change / 2).
// dims: in { line_tension_lb: M L T^-2, direction_chg_deg: dimensionless } out: { resultant_lb: M L T^-2 }
// (Line tension and the resultant are forces M L T^-2; the direction change is
//  a dimensionless angle.)
export function computeBlockRedirectLoad({ line_tension_lb, direction_chg_deg } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const tension = Number(line_tension_lb);
  const angle = Number(direction_chg_deg);
  if (!Number.isFinite(tension) || tension <= 0) return { error: "Line tension must be a positive finite number (lb)." };
  if (!Number.isFinite(angle) || angle < 0 || angle > 180) return { error: "Direction change must be between 0 and 180 degrees." };
  const resultant = 2 * tension * Math.sin(angle * Math.PI / 360);
  if (!Number.isFinite(resultant)) return { error: "Resultant is not a finite value." };
  return {
    resultant_lb: resultant,
    direction_chg_deg: angle,
    note: "A block that turns the line 180 degrees sees twice the line tension on its anchor - size the block, the anchor sling, and the attachment point for the resultant, not the line tension. The block's rated capacity is for the resultant load. Shock loading (a line snapping taut) multiplies this further.",
  };
}

function renderBlockRedirectLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASME B30.26 and standard rigging statics by name. resultant = 2 x line tension x sin(direction change / 2); a 180-degree turn doubles the line tension on the anchor. Estimate - size for the resultant.";
  const tension = makeNumber("Line tension through the block (lb)", "br-tension", { step: "any", min: "0" });
  const angle = makeNumber("Direction change (deg, 180 = doubled back)", "br-angle", { step: "any", min: "0" });
  for (const f of [tension, angle]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { tension.input.value = "3000"; angle.input.value = "90"; update(); });
  const oResultant = makeOutputLine(outputRegion, "Resultant on the block / anchor", "br-out-resultant");
  const oAngle = makeOutputLine(outputRegion, "Direction change", "br-out-angle");
  const update = debounce(() => {
    const r = computeBlockRedirectLoad({ line_tension_lb: Number(tension.input.value) || 0, direction_chg_deg: Number(angle.input.value) || 0 });
    if (r.error) { oResultant.textContent = r.error; oAngle.textContent = "-"; return; }
    oResultant.textContent = fmt(r.resultant_lb, 0) + " lb";
    oAngle.textContent = fmt(r.direction_chg_deg, 0) + " deg";
  }, DEBOUNCE_MS);
  for (const f of [tension, angle]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["block-redirect-load"] = renderBlockRedirectLoad;

// block-redirect-max-angle: inverse of block-redirect-load. The forward tile gives the resultant on the block/anchor from
// the direction change; the inverse recovers the largest direction change a block or anchor of a rated WLL can turn the
// line without the resultant exceeding the rating. From resultant = 2 x T x sin(angle/2), angle = 2 x asin( WLL / (2T) ),
// which only has a solution when WLL < 2T (a 180-degree turn peaks the resultant at 2T); if WLL >= 2T any turn up to 180
// degrees is within rating.
// dims: in { line_tension_lb: M L T^-2, block_wll_lb: M L T^-2 } out: { max_angle_deg: dimensionless, resultant_at_max_lb: M L T^-2 }
export function computeBlockRedirectMaxAngle({ line_tension_lb, block_wll_lb } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const tension = Number(line_tension_lb);
  const wll = Number(block_wll_lb);
  if (!Number.isFinite(tension) || tension <= 0) return { error: "Line tension must be a positive finite number (lb)." };
  if (!Number.isFinite(wll) || wll <= 0) return { error: "Block / anchor WLL must be a positive finite number (lb)." };
  const ratio = wll / (2 * tension);
  const unlimited = ratio >= 1;
  const max_angle_deg = unlimited ? 180 : 2 * Math.asin(ratio) * 180 / Math.PI;
  const resultant_at_max_lb = 2 * tension * Math.sin(max_angle_deg * Math.PI / 360);
  if (![max_angle_deg, resultant_at_max_lb].every(Number.isFinite)) return { error: "Max-angle math is not a finite value." };
  return {
    max_angle_deg, resultant_at_max_lb, unlimited,
    note: "Max direction change = 2 x asin( WLL / (2 x line tension) ), the inverse of resultant = 2 x T x sin(angle/2). A block that turns the line 180 degrees sees twice the line tension on its anchor, so the resultant peaks at 2T; if the block and anchor are rated for at least 2T, any redirect up to 180 degrees is within rating. Below the max angle the block is within its rating; past it, resize the block, the anchor sling, and the attachment point for the resultant. Shock loading (a line snapping taut) multiplies this further - keep margin. A design aid; the qualified rigger and the block / anchor tags govern.",
  };
}

function renderBlockRedirectMaxAngle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASME B30.26 and standard rigging statics by name. resultant = 2 x line tension x sin(direction change / 2), solved for the angle: max direction change = 2 x asin( WLL / (2 x line tension) ); the resultant peaks at 2T at a 180-degree turn. Estimate - size for the resultant.";
  const tension = makeNumber("Line tension through the block (lb)", "bra-tension", { step: "any", min: "0" });
  const wll = makeNumber("Block / anchor rated WLL (lb)", "bra-wll", { step: "any", min: "0" });
  for (const f of [tension, wll]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { tension.input.value = "3000"; wll.input.value = "5000"; update(); });
  const oAngle = makeOutputLine(outputRegion, "Max direction change", "bra-out-angle");
  const oResultant = makeOutputLine(outputRegion, "Resultant at that angle", "bra-out-resultant");
  const oNote = makeOutputLine(outputRegion, "Note", "bra-out-note");
  const update = debounce(() => {
    const r = computeBlockRedirectMaxAngle({ line_tension_lb: Number(tension.input.value) || 0, block_wll_lb: Number(wll.input.value) || 0 });
    if (r.error) { oAngle.textContent = r.error; oResultant.textContent = "-"; oNote.textContent = ""; return; }
    oAngle.textContent = fmt(r.max_angle_deg, 1) + " deg" + (r.unlimited ? " (any turn up to 180 deg is within rating)" : "");
    oResultant.textContent = fmt(r.resultant_at_max_lb, 0) + " lb";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [tension, wll]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["block-redirect-max-angle"] = renderBlockRedirectMaxAngle;

// =====================================================================
// spec-v117: multi-leg-sling + wire-rope-strength (Group Z) - rigging.
// multi-leg-sling returns the tension per sling leg (conservatively over the
// 2 legs ASME assumes carry a rigid load) at the leg angle; wire-rope-strength
// estimates the breaking strength and WLL from the rope diameter. ASME B30.9 /
// Wire Rope Users Manual; the qualified rigger and the certified rating govern.
// =====================================================================

// dims: in { total_load_lb: M L T^-2, num_legs: dimensionless, horizontal_angle_deg: dimensionless } out: { tension_per_leg_lb: M L T^-2, equal_share_lb: M L T^-2, load_factor: dimensionless }
export function computeMultiLegSling({ total_load_lb = 0, num_legs = 2, horizontal_angle_deg = 60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(total_load_lb > 0)) return { error: "Total load must be positive (lb)." };
  if (!(num_legs >= 1)) return { error: "Number of legs must be at least 1." };
  if (!(horizontal_angle_deg > 0) || horizontal_angle_deg > 90) return { error: "Leg angle from horizontal must be between 0 and 90 degrees (exclusive of 0)." };
  const sin = Math.sin(horizontal_angle_deg * Math.PI / 180);
  if (!(sin > 0)) return { error: "Leg angle yields a non-positive sine." };
  const share_legs = num_legs >= 3 ? 2 : num_legs;
  const load_factor = 1 / sin;
  const tension_per_leg_lb = (total_load_lb / share_legs) * load_factor;
  const equal_share_lb = (total_load_lb / num_legs) * load_factor;
  return {
    share_legs, tension_per_leg_lb, equal_share_lb, load_factor,
    note: "Per ASME B30.9, a rigid load on 3 or more legs is assumed to hang from only 2 of them (the load cannot be guaranteed to share across all legs), so the conservative tension divides the load over 2 legs, then divides by sin(angle). The equal-share value is shown for reference only - do not use it unless an engineer qualifies a true equal-share lift. The load factor 1/sin(angle) grows fast as the angle flattens (1.155 at 60 deg, 1.414 at 45 deg, 2.0 at 30 deg). The qualified rigger and the sling's tag rating govern.",
  };
}
export const multiLegSlingExample = { inputs: { total_load_lb: 8000, num_legs: 4, horizontal_angle_deg: 60 } };

function renderMultiLegSling(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASME B30.9 (slings) and standard rigging statics by name. Conservative tension = (load / 2 legs for >=3-leg rigid loads) / sin(angle from horizontal); the equal-share value is reference-only. The qualified rigger and the sling tag govern.";
  const load = makeNumber("Total load (lb)", "mls-load", { step: "any", min: "0", value: "8000" });
  const legs = makeSelect("Number of sling legs", "mls-legs", [
    { value: "2", label: "2 legs" }, { value: "3", label: "3 legs" }, { value: "4", label: "4 legs" },
  ]);
  const angle = makeNumber("Leg angle from horizontal (deg)", "mls-angle", { step: "any", min: "0", value: "60" });
  load.input.value = "8000"; angle.input.value = "60";
  for (const f of [load, legs, angle]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { load.input.value = "8000"; legs.select.value = "4"; angle.input.value = "60"; update(); });
  const oT = makeOutputLine(outputRegion, "Tension per leg (conservative)", "mls-out-t");
  const oE = makeOutputLine(outputRegion, "Equal-share reference", "mls-out-e");
  const oF = makeOutputLine(outputRegion, "Load factor (1/sin)", "mls-out-f");
  const oN = makeOutputLine(outputRegion, "Note", "mls-out-n");
  const update = debounce(() => {
    const r = computeMultiLegSling({ total_load_lb: Number(load.input.value) || 0, num_legs: Number(legs.select.value) || 0, horizontal_angle_deg: Number(angle.input.value) || 0 });
    if (r.error) { oT.textContent = r.error; oE.textContent = "-"; oF.textContent = "-"; oN.textContent = "-"; return; }
    oT.textContent = fmt(r.tension_per_leg_lb, 0) + " lb (over " + r.share_legs + " legs)";
    oE.textContent = fmt(r.equal_share_lb, 0) + " lb";
    oF.textContent = fmt(r.load_factor, 3);
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [load, angle]) f.input.addEventListener("input", update);
  legs.select.addEventListener("change", update);
}
RIGGING_RENDERERS["multi-leg-sling"] = renderMultiLegSling;

// dims: in { diameter_in: L, construction_factor: dimensionless, design_factor: dimensionless } out: { mbs_tons: M L T^-2, wll_tons: M L T^-2 }
export function computeWireRopeStrength({ diameter_in = 0, construction_factor = 46, design_factor = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(diameter_in > 0)) return { error: "Rope diameter must be positive (in)." };
  if (!(construction_factor > 0)) return { error: "Construction factor must be positive." };
  if (!(design_factor > 0)) return { error: "Design factor must be positive." };
  const mbs_tons = construction_factor * diameter_in * diameter_in;
  const wll_tons = mbs_tons / design_factor;
  return {
    mbs_tons, wll_tons,
    note: "ESTIMATE only. Minimum breaking strength MBS = construction factor x diameter^2 (the default 46 is the rule-of-thumb tons/in^2 for IPS 6x19; bright IPS, EIPS, and other constructions/grades differ - edit it). Working load limit = MBS / design factor (5:1 is typical for general rigging). Use the manufacturer's certified breaking strength for any real lift; do not place unmarked or uncertified rope in service. The certified rating and the qualified rigger govern.",
  };
}
export const wireRopeStrengthExample = { inputs: { diameter_in: 0.5, construction_factor: 46, design_factor: 5 } };

function renderWireRopeStrength(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Wire Rope Users Manual rule-of-thumb by name. MBS = factor x d^2 (factor ~46 tons/in^2 for IPS 6x19, editable); WLL = MBS / design factor (5:1 typical). ESTIMATE - the manufacturer's certified rating governs; never use unmarked rope.";
  const dia = makeNumber("Rope nominal diameter (in)", "wrs-dia", { step: "any", min: "0", value: "0.5" });
  const cf = makeNumber("Construction factor (tons/in^2)", "wrs-cf", { step: "any", min: "0", value: "46" });
  const df = makeNumber("Design factor (safety factor)", "wrs-df", { step: "any", min: "0", value: "5" });
  dia.input.value = "0.5"; cf.input.value = "46"; df.input.value = "5";
  for (const f of [dia, cf, df]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dia.input.value = "0.5"; cf.input.value = "46"; df.input.value = "5"; update(); });
  const oM = makeOutputLine(outputRegion, "Estimated breaking strength", "wrs-out-m");
  const oW = makeOutputLine(outputRegion, "Working load limit", "wrs-out-w");
  const oN = makeOutputLine(outputRegion, "Note", "wrs-out-n");
  const update = debounce(() => {
    const r = computeWireRopeStrength({ diameter_in: Number(dia.input.value) || 0, construction_factor: Number(cf.input.value) || 0, design_factor: Number(df.input.value) || 0 });
    if (r.error) { oM.textContent = r.error; oW.textContent = "-"; oN.textContent = "-"; return; }
    oM.textContent = fmt(r.mbs_tons, 2) + " tons";
    oW.textContent = fmt(r.wll_tons, 2) + " tons";
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [dia, cf, df]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["wire-rope-strength"] = renderWireRopeStrength;

// wire-rope-diameter-for-wll: inverse of wire-rope-strength. The forward tile
// gives the WLL from a diameter; sizing the rope to a required load is the
// inverse. From WLL = (construction_factor x d^2) / design_factor,
// d = sqrt(WLL x design_factor / construction_factor); then round up to the next
// standard rope diameter and report its actual WLL.
const _WIRE_ROPE_STD_DIA = [0.25, 0.3125, 0.375, 0.4375, 0.5, 0.5625, 0.625, 0.75, 0.875, 1.0, 1.125, 1.25, 1.375, 1.5];
// dims: in { wll_required_tons: M L T^-2, construction_factor: dimensionless, design_factor: dimensionless } out: { diameter_in: L, selected_diameter_in: L, selected_wll_tons: M L T^-2 }
export function computeWireRopeDiameterForWll({ wll_required_tons = 0, construction_factor = 46, design_factor = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const wll = Number(wll_required_tons) || 0;
  const cf = Number(construction_factor) || 0;
  const df = Number(design_factor) || 0;
  if (!(wll > 0)) return { error: "Required working load limit must be positive (tons)." };
  if (!(cf > 0)) return { error: "Construction factor must be positive." };
  if (!(df > 0)) return { error: "Design factor must be positive." };
  const diameter_in = Math.sqrt(wll * df / cf);
  const selected_diameter_in = _WIRE_ROPE_STD_DIA.find((d) => d >= diameter_in - 1e-9) || null;
  const selected_wll_tons = selected_diameter_in ? cf * selected_diameter_in * selected_diameter_in / df : null;
  return {
    diameter_in, selected_diameter_in, selected_wll_tons,
    note: "ESTIMATE only. From MBS = construction factor x diameter^2 and WLL = MBS / design factor, the exact diameter for the required WLL is sqrt(WLL x design factor / construction factor); round UP to the next standard rope diameter (a smaller rope is under-rated). The default construction factor 46 is the rule-of-thumb tons/in^2 for IPS 6x19 - bright IPS, EIPS, and other constructions/grades differ, so edit it, and 5:1 is the typical general-rigging design factor. Use the manufacturer's certified breaking strength for any real lift; do not place unmarked or uncertified rope in service. The certified rating and the qualified rigger govern.",
  };
}
export const wireRopeDiameterForWllExample = { inputs: { wll_required_tons: 5, construction_factor: 46, design_factor: 5 } };
function renderWireRopeDiameterForWll(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Wire Rope Users Manual rule-of-thumb solved for the diameter: d = sqrt(WLL x design factor / construction factor), from MBS = factor x d^2 (factor ~46 tons/in^2 for IPS 6x19, editable) and WLL = MBS / design factor (5:1 typical). ESTIMATE - the manufacturer's certified rating governs; never use unmarked rope.";
  const wll = makeNumber("Required working load limit (tons)", "wrd-wll", { step: "any", min: "0", value: "5" });
  const cf = makeNumber("Construction factor (tons/in^2)", "wrd-cf", { step: "any", min: "0", value: "46" });
  const df = makeNumber("Design factor (safety factor)", "wrd-df", { step: "any", min: "0", value: "5" });
  wll.input.value = "5"; cf.input.value = "46"; df.input.value = "5";
  for (const f of [wll, cf, df]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { wll.input.value = "5"; cf.input.value = "46"; df.input.value = "5"; update(); });
  const oD = makeOutputLine(outputRegion, "Exact diameter required", "wrd-out-d");
  const oS = makeOutputLine(outputRegion, "Next standard size", "wrd-out-s");
  const oN = makeOutputLine(outputRegion, "Note", "wrd-out-n");
  const update = debounce(() => {
    const r = computeWireRopeDiameterForWll({ wll_required_tons: Number(wll.input.value) || 0, construction_factor: Number(cf.input.value) || 0, design_factor: Number(df.input.value) || 0 });
    if (r.error) { oD.textContent = r.error; oS.textContent = "-"; oN.textContent = "-"; return; }
    oD.textContent = fmt(r.diameter_in, 3) + " in";
    oS.textContent = r.selected_diameter_in ? fmt(r.selected_diameter_in, 4) + " in (WLL " + fmt(r.selected_wll_tons, 2) + " tons)" : "over 1-1/2 in -- use the manufacturer's table";
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [wll, cf, df]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["wire-rope-diameter-for-wll"] = renderWireRopeDiameterForWll;

// --- spanline-sag-tension: Sag and Tension on a Horizontally Spanned Cable ---
//
// Shallow-parabola statics: a uniform load w over a span L sagging d at
// midspan develops H = w L^2 / (8 d), a support tension T = H sqrt(1 + (4d/L)^2),
// and a developed length L + 8 d^2 / (3 L). Tension is inversely proportional to
// the sag: pulling the span tight multiplies the rope and anchor load.
// dims: in { span_ft: L, load_lb_per_ft: M T^-2, sag_ft: L } out: { horizontal_tension_lb: M L T^-2, support_tension_lb: M L T^-2, cable_length_ft: L, slack_ft: L, sag_ratio: dimensionless }
// (Span, sag, length and slack are lengths L; the uniform load is a force per
//  length M T^-2; the tensions are forces M L T^-2; the sag ratio is dimensionless.)
export function computeSpanlineSagTension({ span_ft, load_lb_per_ft, sag_ft } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L = Number(span_ft);
  const w = Number(load_lb_per_ft);
  const d = Number(sag_ft);
  if (!Number.isFinite(L) || L <= 0) return { error: "Span must be a positive finite number (ft)." };
  if (!Number.isFinite(w) || w <= 0) return { error: "Uniform load must be a positive finite number (lb/ft)." };
  if (!Number.isFinite(d) || d <= 0) return { error: "Sag must be a positive finite number (ft); a zero sag is the infinite-tension limit." };
  const horizontal_tension_lb = w * L * L / (8 * d);
  const support_tension_lb = horizontal_tension_lb * Math.sqrt(1 + Math.pow(4 * d / L, 2));
  const cable_length_ft = L + 8 * d * d / (3 * L);
  const slack_ft = cable_length_ft - L;
  const sag_ratio = d / L;
  const shallow = sag_ratio <= 0.1;
  if (![horizontal_tension_lb, support_tension_lb, cable_length_ft, slack_ft, sag_ratio].every(Number.isFinite)) return { error: "Spanline math is not a finite value." };
  return {
    horizontal_tension_lb, support_tension_lb, cable_length_ft, slack_ft, sag_ratio, shallow,
    note: "Shallow-cable parabola: the horizontal tension H = w L^2 / (8 d), the support (anchor) tension T = H sqrt(1 + (4 d / L)^2), and the developed length L + 8 d^2 / (3 L), for a uniform load w over a span L sagging d at midspan. The tension is inversely proportional to the sag - halve the sag and you double the tension - so pulling a span tight to take out the sag multiplies the rope and anchor load, and a nearly level span can reach many times the load it carries. Valid where the sag is under about a tenth of the span (a deep sag trends toward the catenary; the shallow flag drops when the ratio is exceeded); the load is taken as uniform along the horizontal span (the rope self-weight plus any evenly distributed load - a concentrated load is the sling-angle point-load case instead), and the supports are taken as level. A planning screen; the wire-rope working load limit, the anchor capacity, and the head rigger govern the actual pick.",
  };
}
export const spanlineSagTensionExample = { inputs: { span_ft: 100, load_lb_per_ft: 1.0, sag_ft: 2.5 } };

function renderSpanlineSagTension(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: shallow-cable parabola H = w L^2 / (8 d), support tension T = H sqrt(1 + (4 d / L)^2), developed length L + 8 d^2 / (3 L), by name. Tension is inverse to the sag - a tight span multiplies the load. Uniform load, level supports, sag under ~1/10 of the span. A planning screen; the WLL chart and the head rigger govern.";
  const span = makeNumber("Horizontal span (ft)", "sst-span", { step: "any", min: "0" });
  const load = makeNumber("Uniform load along span (lb/ft)", "sst-load", { step: "any", min: "0" });
  const sag = makeNumber("Sag at midspan (ft)", "sst-sag", { step: "any", min: "0" });
  for (const f of [span, load, sag]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { span.input.value = "100"; load.input.value = "1.0"; sag.input.value = "2.5"; update(); });
  const oH = makeOutputLine(outputRegion, "Horizontal tension", "sst-out-h");
  const oT = makeOutputLine(outputRegion, "Support (anchor) tension", "sst-out-t");
  const oLen = makeOutputLine(outputRegion, "Cable length / slack", "sst-out-len");
  const oRatio = makeOutputLine(outputRegion, "Sag ratio", "sst-out-ratio");
  const oNote = makeOutputLine(outputRegion, "Note", "sst-out-note");
  const update = debounce(() => {
    const r = computeSpanlineSagTension({ span_ft: Number(span.input.value) || 0, load_lb_per_ft: Number(load.input.value) || 0, sag_ft: Number(sag.input.value) || 0 });
    if (r.error) { oH.textContent = r.error; oT.textContent = "-"; oLen.textContent = "-"; oRatio.textContent = "-"; oNote.textContent = "-"; return; }
    oH.textContent = fmt(r.horizontal_tension_lb, 1) + " lb";
    oT.textContent = fmt(r.support_tension_lb, 1) + " lb";
    oLen.textContent = fmt(r.cable_length_ft, 3) + " ft (" + fmt(r.slack_ft, 3) + " ft slack)";
    oRatio.textContent = fmt(r.sag_ratio, 3) + (r.shallow ? " (shallow-parabola valid)" : " (deep - trends to catenary; treat as approximate)");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [span, load, sag]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["spanline-sag-tension"] = renderSpanlineSagTension;

// --- spanline-sag-for-tension: Minimum Sag to Keep a Spanline Under a Tension Limit ---
//
// Inverse of spanline-sag-tension solved for the support (anchor) tension, the
// value the rope WLL and the anchor capacity actually limit. From
// T = w L^2 / (8 d) sqrt(1 + (4 d / L)^2), squaring gives
// T^2 = w^2 L^4 / (64 d^2) + w^2 L^2 / 4, so
// d_min = w L^2 / (8 sqrt(T_allow^2 - (w L / 2)^2)). The vertical reaction at
// each support is w L / 2, so the tension can never be below that; T_allow must
// exceed it or no sag can carry the load.
// dims: in { span_ft: L, load_lb_per_ft: M T^-2, allowable_tension_lb: M L T^-2 } out: { min_sag_ft: L, horizontal_tension_lb: M L T^-2, sag_ratio: dimensionless }
export function computeSpanlineSagForTension({ span_ft, load_lb_per_ft, allowable_tension_lb } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L = Number(span_ft);
  const w = Number(load_lb_per_ft);
  const T = Number(allowable_tension_lb);
  if (!Number.isFinite(L) || L <= 0) return { error: "Span must be a positive finite number (ft)." };
  if (!Number.isFinite(w) || w <= 0) return { error: "Uniform load must be a positive finite number (lb/ft)." };
  if (!Number.isFinite(T) || T <= 0) return { error: "Allowable tension must be a positive finite number (lb)." };
  const vertical_reaction_lb = w * L / 2;
  if (!(T > vertical_reaction_lb)) return { error: "Allowable tension must exceed the support vertical reaction w L / 2 = " + fmt(vertical_reaction_lb, 1) + " lb; below that no sag can carry the load." };
  const min_sag_ft = w * L * L / (8 * Math.sqrt(T * T - vertical_reaction_lb * vertical_reaction_lb));
  const horizontal_tension_lb = w * L * L / (8 * min_sag_ft);
  const sag_ratio = min_sag_ft / L;
  const shallow = sag_ratio <= 0.1;
  if (![min_sag_ft, horizontal_tension_lb, sag_ratio].every(Number.isFinite) || !(min_sag_ft > 0)) return { error: "Spanline math is not a finite value." };
  return {
    min_sag_ft, horizontal_tension_lb, sag_ratio, shallow, vertical_reaction_lb,
    note: "The least sag a spanline can be pulled to before the support (anchor) tension reaches the allowable, the inverse of the spanline-sag-tension tile: from T = w L^2 / (8 d) sqrt(1 + (4 d / L)^2), d_min = w L^2 / (8 sqrt(T_allow^2 - (w L / 2)^2)). Any tighter (less sag) and the tension exceeds the limit, because tension is inversely proportional to the sag. The allowable tension limits the SUPPORT tension - the true maximum in the cable, at the anchors - not the horizontal component, and it must exceed the support vertical reaction w L / 2 or no sag can carry the load. Enter the allowable as the rope working load limit (WLL) or the anchor capacity, whichever is lower, with your design factor already applied. Valid where the resulting sag is under about a tenth of the span (a deep sag trends toward the catenary; the shallow flag drops when exceeded); uniform load, level supports. A planning screen; the WLL chart, the anchor capacity, and the head rigger govern the actual pick.",
  };
}
export const spanlineSagForTensionExample = { inputs: { span_ft: 100, load_lb_per_ft: 1.0, allowable_tension_lb: 502.5 } };

function renderSpanlineSagForTension(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: shallow-cable parabola solved for the sag at a tension limit: d_min = w L^2 / (8 sqrt(T_allow^2 - (w L / 2)^2)), the inverse of T = w L^2 / (8 d) sqrt(1 + (4 d / L)^2). The allowable limits the SUPPORT (anchor) tension and must exceed the w L / 2 vertical reaction. Uniform load, level supports, sag under ~1/10 of the span. A planning screen; the WLL chart and the head rigger govern.";
  const span = makeNumber("Horizontal span (ft)", "ssft-span", { step: "any", min: "0" });
  const load = makeNumber("Uniform load along span (lb/ft)", "ssft-load", { step: "any", min: "0" });
  const tension = makeNumber("Allowable tension (lb, WLL or anchor)", "ssft-t", { step: "any", min: "0" });
  for (const f of [span, load, tension]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { span.input.value = "100"; load.input.value = "1.0"; tension.input.value = "502.5"; update(); });
  const oSag = makeOutputLine(outputRegion, "Minimum sag at midspan", "ssft-out-sag");
  const oH = makeOutputLine(outputRegion, "Horizontal tension at that sag", "ssft-out-h");
  const oRatio = makeOutputLine(outputRegion, "Sag ratio", "ssft-out-ratio");
  const oNote = makeOutputLine(outputRegion, "Note", "ssft-out-note");
  const update = debounce(() => {
    const r = computeSpanlineSagForTension({ span_ft: Number(span.input.value) || 0, load_lb_per_ft: Number(load.input.value) || 0, allowable_tension_lb: Number(tension.input.value) || 0 });
    if (r.error) { oSag.textContent = r.error; oH.textContent = "-"; oRatio.textContent = "-"; oNote.textContent = "-"; return; }
    oSag.textContent = fmt(r.min_sag_ft, 3) + " ft";
    oH.textContent = fmt(r.horizontal_tension_lb, 1) + " lb";
    oRatio.textContent = fmt(r.sag_ratio, 3) + (r.shallow ? " (shallow-parabola valid)" : " (deep - trends to catenary; treat as approximate)");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [span, load, tension]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["spanline-sag-for-tension"] = renderSpanlineSagForTension;

// --- spec-v544 Z: Two-leg asymmetric bridle leg tension (`bridle-leg-tension`) ---
// L=sqrt(run^2+rise^2), a=run/L, b=rise/L. den = a2*b1 + a1*b2. T1 = W*a2/den, T2 = W*a1/den. H = T1*a1.
// dims: in { apex_load_lb: M L T^-2, run1_ft: L, rise1_ft: L, run2_ft: L, rise2_ft: L } out: { t1_lb: M L T^-2, t2_lb: M L T^-2, horizontal_lb: M L T^-2 }
export function computeBridleLegTension({ apex_load_lb, run1_ft, rise1_ft, run2_ft, rise2_ft } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const W = Number(apex_load_lb);
  const r1 = Number(run1_ft), h1 = Number(rise1_ft), r2 = Number(run2_ft), h2 = Number(rise2_ft);
  if (!Number.isFinite(W) || W <= 0) return { error: "Apex load must be a positive finite number (lb)." };
  if (!Number.isFinite(r1) || r1 <= 0 || !Number.isFinite(h1) || h1 <= 0) return { error: "Leg 1 needs a positive horizontal run and vertical rise (ft)." };
  if (!Number.isFinite(r2) || r2 <= 0 || !Number.isFinite(h2) || h2 <= 0) return { error: "Leg 2 needs a positive horizontal run and vertical rise (ft)." };
  const L1 = Math.hypot(r1, h1), L2 = Math.hypot(r2, h2);
  const a1 = r1 / L1, b1 = h1 / L1, a2 = r2 / L2, b2 = h2 / L2;
  const den = a2 * b1 + a1 * b2;
  if (!(den > 0)) return { error: "Bridle geometry is degenerate (legs on the same side)." };
  const t1_lb = W * a2 / den;
  const t2_lb = W * a1 / den;
  const horizontal_lb = t1_lb * a1;
  const angle1_deg = Math.atan2(h1, r1) * 180 / Math.PI;
  const angle2_deg = Math.atan2(h2, r2) * 180 / Math.PI;
  const over_load = t1_lb > W || t2_lb > W;
  return {
    l1_ft: L1, l2_ft: L2, t1_lb, t2_lb, horizontal_lb, angle1_deg, angle2_deg, over_load,
    note: "An off-center or unequal-height apex makes the two legs carry unequal tension (the steeper or shorter leg carries more). A shallow bridle multiplies leg tension so a leg can exceed the hung load and drives a large horizontal pull into the beams. This is a static two-dimensional resolution (a three-point bridle or out-of-plane geometry differs). The hardware ratings and a qualified rigger govern.",
  };
}

function renderBridleLegTension(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Entertainment rigging bridle geometry (static two-dimensional resolution), by name. L = sqrt(run^2 + rise^2); a = run/L, b = rise/L; den = a2 b1 + a1 b2; T1 = W a2/den, T2 = W a1/den; H = T1 a1 = T2 a2. An off-center apex makes the legs carry unequal tension; a shallow bridle multiplies tension above the load and drives a large horizontal pull into the beams. The hardware ratings and a qualified rigger govern.";
  const w = makeNumber("Apex load (lb)", "blt-w", { step: "any", min: "0" });
  const r1 = makeNumber("Leg 1 horizontal run (ft)", "blt-r1", { step: "any", min: "0" });
  const h1 = makeNumber("Leg 1 vertical rise (ft)", "blt-h1", { step: "any", min: "0" });
  const r2 = makeNumber("Leg 2 horizontal run (ft)", "blt-r2", { step: "any", min: "0" });
  const h2 = makeNumber("Leg 2 vertical rise (ft)", "blt-h2", { step: "any", min: "0" });
  for (const f of [w, r1, h1, r2, h2]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { w.input.value = "1000"; r1.input.value = "4"; h1.input.value = "8"; r2.input.value = "10"; h2.input.value = "6"; update(); });
  const oT1 = makeOutputLine(outputRegion, "Leg 1 tension / angle", "blt-out-t1");
  const oT2 = makeOutputLine(outputRegion, "Leg 2 tension / angle", "blt-out-t2");
  const oH = makeOutputLine(outputRegion, "Horizontal beam reaction", "blt-out-h");
  const update = debounce(() => {
    const r = computeBridleLegTension({ apex_load_lb: Number(w.input.value) || 0, run1_ft: Number(r1.input.value) || 0, rise1_ft: Number(h1.input.value) || 0, run2_ft: Number(r2.input.value) || 0, rise2_ft: Number(h2.input.value) || 0 });
    if (r.error) { oT1.textContent = r.error; for (const o of [oT2, oH]) o.textContent = "-"; return; }
    oT1.textContent = fmt(r.t1_lb, 0) + " lb at " + fmt(r.angle1_deg, 0) + " deg (" + fmt(r.l1_ft, 2) + " ft)" + (r.t1_lb > (Number(w.input.value) || 0) ? " - over the load" : "");
    oT2.textContent = fmt(r.t2_lb, 0) + " lb at " + fmt(r.angle2_deg, 0) + " deg (" + fmt(r.l2_ft, 2) + " ft)" + (r.t2_lb > (Number(w.input.value) || 0) ? " - over the load" : "");
    oH.textContent = fmt(r.horizontal_lb, 0) + " lb" + (r.over_load ? " - shallow bridle, check the beams" : "");
  }, DEBOUNCE_MS);
  for (const f of [w, r1, h1, r2, h2]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["bridle-leg-tension"] = renderBridleLegTension;

// --- spec-v545 Z: Winch drum line pull and capacity by layer (`winch-drum-line-pull`) ---
// Dn = drum + (2n-1)*rope. Pn = rated*drum/Dn. Vn = drum_speed*Dn/drum. wraps = floor(barrel/rope).
// dims: in { rated_pull_lb: M L T^-2, drum_dia_in: L, rope_dia_in: L, barrel_width_in: L, target_layer: dimensionless } out: { mean_dia_in: L, pull_at_layer_lb: M L T^-2, speed_ratio: dimensionless, wraps_per_layer: dimensionless }
export function computeWinchDrumLinePull({ rated_pull_lb, drum_dia_in, rope_dia_in, barrel_width_in, target_layer = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const P1 = Number(rated_pull_lb);
  const D1 = Number(drum_dia_in);
  const dr = Number(rope_dia_in);
  const bw = Number(barrel_width_in);
  const n = Number(target_layer);
  if (!Number.isFinite(P1) || P1 <= 0) return { error: "Rated pull must be a positive finite number (lb)." };
  if (!Number.isFinite(D1) || D1 <= 0) return { error: "Drum diameter must be a positive finite number (in)." };
  if (!Number.isFinite(dr) || dr <= 0) return { error: "Rope diameter must be a positive finite number (in)." };
  if (!Number.isFinite(bw) || bw <= 0) return { error: "Barrel width must be a positive finite number (in)." };
  if (!Number.isFinite(n) || n < 1) return { error: "Target layer must be at least 1." };
  const layer = Math.floor(n);
  const mean_dia_in = D1 + (2 * layer - 1) * dr;
  const pull_at_layer_lb = P1 * D1 / mean_dia_in;
  const speed_ratio = mean_dia_in / D1;
  const wraps_per_layer = Math.floor(bw / dr);
  const derate_pct = (1 - pull_at_layer_lb / P1) * 100;
  return {
    mean_dia_in, pull_at_layer_lb, speed_ratio, wraps_per_layer, derate_pct,
    note: "The rated line pull is a bare-drum figure for the first wrap; it falls layer by layer as the growing moment arm works against the motor (outer layers can be 30-40% weaker) while the line speed rises in proportion. The rope must also fit the drum capacity. The winch manufacturer's layer ratings govern.",
  };
}

function renderWinchDrumLinePull(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Wire-rope drum mechanics / SAE winch rating convention, by name. Dn = drum_dia + (2n - 1) x rope_dia; Pn = rated_pull x drum_dia / Dn; Vn = drum_speed x Dn / drum_dia; wraps_per_layer = floor(barrel_width / rope_dia). The rated pull is a bare-drum first-wrap figure that fades layer by layer (outer layers 30-40% weaker) as line speed rises in proportion. The winch manufacturer's layer ratings govern.";
  const p = makeNumber("Bare-drum rated pull (lb)", "wdl-p", { step: "any", min: "0" });
  const d = makeNumber("Bare drum diameter (in)", "wdl-d", { step: "any", min: "0" });
  const rr = makeNumber("Wire rope diameter (in)", "wdl-r", { step: "any", min: "0" });
  const bw = makeNumber("Drum barrel width (in)", "wdl-bw", { step: "any", min: "0" });
  const n = makeNumber("Target layer (1 = bare)", "wdl-n", { step: "1", min: "1", value: "1" });
  n.input.value = "1";
  for (const f of [p, d, rr, bw, n]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { p.input.value = "10000"; d.input.value = "10"; rr.input.value = "0.5"; bw.input.value = "12"; n.input.value = "4"; update(); });
  const oM = makeOutputLine(outputRegion, "Mean diameter at layer", "wdl-out-m");
  const oP = makeOutputLine(outputRegion, "Pull at layer", "wdl-out-p");
  const oS = makeOutputLine(outputRegion, "Speed / wraps per layer", "wdl-out-s");
  const update = debounce(() => {
    const r = computeWinchDrumLinePull({ rated_pull_lb: Number(p.input.value) || 0, drum_dia_in: Number(d.input.value) || 0, rope_dia_in: Number(rr.input.value) || 0, barrel_width_in: Number(bw.input.value) || 0, target_layer: Number(n.input.value) || 0 });
    if (r.error) { oM.textContent = r.error; for (const o of [oP, oS]) o.textContent = "-"; return; }
    oM.textContent = fmt(r.mean_dia_in, 2) + " in";
    oP.textContent = fmt(r.pull_at_layer_lb, 0) + " lb (" + fmt(r.derate_pct, 0) + "% below rated)";
    oS.textContent = fmt(r.speed_ratio, 2) + "x speed, " + r.wraps_per_layer + " wraps/layer";
  }, DEBOUNCE_MS);
  for (const f of [p, d, rr, bw, n]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["winch-drum-line-pull"] = renderWinchDrumLinePull;

// --- spec-v550 Z: Crane outrigger reaction from lift geometry (`crane-outrigger-reaction`) ---
// even = (W+Wc)/4. M = W*R - Wc*Rc. R_max = even + M/(sqrt(2)*spread).
// dims: in { gross_load_kip: M L T^-2, counterweight_kip: M L T^-2, load_radius_ft: L, cw_radius_ft: L, outrigger_spread_ft: L } out: { even_share_kip: M L T^-2, overturning_kipft: M L^2 T^-2, reaction_max_kip: M L T^-2 }
export function computeCraneOutriggerReaction({ gross_load_kip, counterweight_kip = 0, load_radius_ft, cw_radius_ft = 0, outrigger_spread_ft } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const W = Number(gross_load_kip);
  const Wc = Number(counterweight_kip);
  const R = Number(load_radius_ft);
  const Rc = Number(cw_radius_ft);
  const sp = Number(outrigger_spread_ft);
  if (!Number.isFinite(W) || W <= 0) return { error: "Gross load must be a positive finite number (kip)." };
  if (!Number.isFinite(Wc) || Wc < 0) return { error: "Counterweight must be a non-negative finite number (kip)." };
  if (!Number.isFinite(R) || R <= 0) return { error: "Load radius must be a positive finite number (ft)." };
  if (!Number.isFinite(Rc) || Rc < 0) return { error: "Counterweight radius must be a non-negative finite number (ft)." };
  if (!Number.isFinite(sp) || sp <= 0) return { error: "Outrigger spread must be a positive finite number (ft)." };
  const even_share_kip = (W + Wc) / 4;
  const overturning_kipft = W * R - Wc * Rc;
  const reaction_max_kip = even_share_kip + overturning_kipft / (Math.SQRT2 * sp);
  return {
    even_share_kip, overturning_kipft, reaction_max_kip,
    note: "The maximum reaction is not a quarter of the total: swinging the boom over a corner concentrates the overturning into one diagonal outrigger (which can carry well over half the load). A wider outrigger spread lowers the reaction. This is a planning estimate that feeds crane-ground-bearing; the crane manufacturer's load-moment chart and outrigger reaction data govern.",
  };
}

function renderCraneOutriggerReaction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Crane load-moment method / SAE J1063 stability, by name. even = (W + Wc)/4; overturning M = W R - Wc Rc; R_max = even + M/(sqrt(2) spread). The maximum outrigger reaction is not a quarter of the total - over a corner the overturning concentrates into one diagonal outrigger. A wider spread lowers it. A planning estimate feeding crane-ground-bearing; the crane load-moment chart and outrigger reaction data govern.";
  const w = makeNumber("Gross suspended load (kip)", "cor-w", { step: "any", min: "0" });
  const wc = makeNumber("Counterweight (kip)", "cor-wc", { step: "any", min: "0", value: "0" });
  const r = makeNumber("Load radius R (ft)", "cor-r", { step: "any", min: "0" });
  const rc = makeNumber("Counterweight radius Rc (ft)", "cor-rc", { step: "any", min: "0", value: "0" });
  const sp = makeNumber("Outrigger spread (ft, center to center)", "cor-sp", { step: "any", min: "0" });
  for (const f of [w, wc, r, rc, sp]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { w.input.value = "40"; wc.input.value = "30"; r.input.value = "30"; rc.input.value = "12"; sp.input.value = "20"; update(); });
  const oE = makeOutputLine(outputRegion, "Even quarter-share", "cor-out-e");
  const oM = makeOutputLine(outputRegion, "Net overturning moment", "cor-out-m");
  const oR = makeOutputLine(outputRegion, "Max outrigger reaction (over corner)", "cor-out-r");
  const update = debounce(() => {
    const x = computeCraneOutriggerReaction({ gross_load_kip: Number(w.input.value) || 0, counterweight_kip: Number(wc.input.value) || 0, load_radius_ft: Number(r.input.value) || 0, cw_radius_ft: Number(rc.input.value) || 0, outrigger_spread_ft: Number(sp.input.value) || 0 });
    if (x.error) { oE.textContent = x.error; for (const o of [oM, oR]) o.textContent = "-"; return; }
    oE.textContent = fmt(x.even_share_kip, 1) + " kip";
    oM.textContent = fmt(x.overturning_kipft, 0) + " kip-ft";
    oR.textContent = fmt(x.reaction_max_kip, 1) + " kip";
  }, DEBOUNCE_MS);
  for (const f of [w, wc, r, rc, sp]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["crane-outrigger-reaction"] = renderCraneOutriggerReaction;

// --- spec-v554 Z: Lifting lug / padeye pin-hole check (ASME BTH-1 3-3.3) ---
// bearing = 1.25 Fy Dp t/Nd. tension = Fu(w-Dh)t/Nd. tearout = 0.70 Fu (2t(a+Dp/2-Dh/2))/Nd.
// dims: in { applied_load_kip: M L T^-2, plate_thick_in: L, hole_dia_in: L, pin_dia_in: L, edge_dist_in: L, plate_width_in: L, fy_ksi: M L^-1 T^-2, fu_ksi: M L^-1 T^-2, design_factor: dimensionless } out: { bearing_kip: M L T^-2, tension_kip: M L T^-2, tearout_kip: M L T^-2, dcr: dimensionless }
export function computeLiftingLugDesign({ applied_load_kip, plate_thick_in, hole_dia_in, pin_dia_in, edge_dist_in, plate_width_in, fy_ksi = 36, fu_ksi = 58, design_factor = 2.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const P = Number(applied_load_kip), t = Number(plate_thick_in), Dh = Number(hole_dia_in), Dp = Number(pin_dia_in);
  const a = Number(edge_dist_in), w = Number(plate_width_in), Fy = Number(fy_ksi), Fu = Number(fu_ksi), Nd = Number(design_factor);
  if (!Number.isFinite(P) || P <= 0) return { error: "Applied load must be a positive finite number (kip)." };
  if (!Number.isFinite(t) || t <= 0) return { error: "Plate thickness must be positive (in)." };
  if (!Number.isFinite(Dh) || Dh <= 0) return { error: "Hole diameter must be positive (in)." };
  if (!Number.isFinite(Dp) || Dp <= 0) return { error: "Pin diameter must be positive (in)." };
  if (Dp > Dh) return { error: "Pin diameter cannot exceed the hole diameter." };
  if (!Number.isFinite(a) || a <= 0) return { error: "Edge distance must be positive (in)." };
  if (!Number.isFinite(w) || w <= 0) return { error: "Plate width must be positive (in)." };
  if (!Number.isFinite(Fy) || Fy <= 0) return { error: "Yield strength must be positive (ksi)." };
  if (!Number.isFinite(Fu) || Fu <= 0) return { error: "Ultimate strength must be positive (ksi)." };
  if (!Number.isFinite(Nd) || Nd < 1) return { error: "Design factor Nd must be at least 1." };
  if (w <= Dh) return { error: "Plate width must exceed the hole diameter (no net tension section)." };
  const bearing_kip = 1.25 * Fy * Dp * t / Nd;
  const tension_kip = Fu * (w - Dh) * t / Nd;
  const tearout_kip = 0.70 * Fu * (2 * t * (a + Dp / 2 - Dh / 2)) / Nd;
  const governing_kip = Math.min(bearing_kip, tension_kip, tearout_kip);
  const governing_mode = governing_kip === bearing_kip ? "bearing" : governing_kip === tension_kip ? "net tension" : "shear tear-out";
  const dcr = P / governing_kip;
  return {
    bearing_kip, tension_kip, tearout_kip, governing_kip, governing_mode, dcr, adequate: dcr <= 1.0,
    note: "The four modes trade off through hole placement: moving the hole from the edge cures tear-out but shrinks the net tension width, and the pin-to-hole clearance drives bearing - a lug sized for gross tension alone can tear out at the pin. The design factor Nd depends on the ASME BTH-1 design category and service class. Cheek plates and weld design are separate checks. ASME BTH-1 and the engineer of record govern.",
  };
}

function renderLiftingLugDesign(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASME BTH-1 Section 3-3.3 pin-connected plates (lifting lug / padeye): bearing = 1.25 Fy Dp t/Nd; net tension = Fu(w-Dh)t/Nd; double-plane shear tear-out = 0.70 Fu(2t(a+Dp/2-Dh/2))/Nd; governing = the minimum. The four modes trade off through hole placement - a lug sized for gross tension alone can tear out at the pin. Nd depends on the BTH-1 design category and service class. ASME BTH-1 and the engineer of record govern.";
  const P = makeNumber("Applied load (kip)", "llg-p", { step: "any", min: "0" });
  const t = makeNumber("Plate thickness t (in)", "llg-t", { step: "any", min: "0" });
  const Dh = makeNumber("Hole diameter Dh (in)", "llg-dh", { step: "any", min: "0" });
  const Dp = makeNumber("Pin diameter Dp (in)", "llg-dp", { step: "any", min: "0" });
  const a = makeNumber("Hole-center to edge a (in)", "llg-a", { step: "any", min: "0" });
  const w = makeNumber("Plate width at hole w (in)", "llg-w", { step: "any", min: "0" });
  const fy = makeNumber("Yield Fy (ksi)", "llg-fy", { step: "any", min: "0", value: "36" }); fy.input.value = "36";
  const fu = makeNumber("Ultimate Fu (ksi)", "llg-fu", { step: "any", min: "0", value: "58" }); fu.input.value = "58";
  const nd = makeNumber("Design factor Nd", "llg-nd", { step: "any", min: "1", value: "2.0" }); nd.input.value = "2.0";
  for (const f of [P, t, Dh, Dp, a, w, fy, fu, nd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { P.input.value = "20"; t.input.value = "1.0"; Dh.input.value = "1.06"; Dp.input.value = "1.0"; a.input.value = "2.0"; w.input.value = "4.0"; fy.input.value = "36"; fu.input.value = "58"; nd.input.value = "2.0"; update(); });
  const oCap = makeOutputLine(outputRegion, "Bearing / tension / tear-out", "llg-out-cap");
  const oGov = makeOutputLine(outputRegion, "Governing mode / capacity", "llg-out-gov");
  const oDcr = makeOutputLine(outputRegion, "Demand / capacity", "llg-out-dcr");
  const update = debounce(() => {
    const r = computeLiftingLugDesign({ applied_load_kip: Number(P.input.value) || 0, plate_thick_in: Number(t.input.value) || 0, hole_dia_in: Number(Dh.input.value) || 0, pin_dia_in: Number(Dp.input.value) || 0, edge_dist_in: Number(a.input.value) || 0, plate_width_in: Number(w.input.value) || 0, fy_ksi: Number(fy.input.value) || 0, fu_ksi: Number(fu.input.value) || 0, design_factor: Number(nd.input.value) || 0 });
    if (r.error) { oCap.textContent = r.error; for (const o of [oGov, oDcr]) o.textContent = "-"; return; }
    oCap.textContent = fmt(r.bearing_kip, 1) + " / " + fmt(r.tension_kip, 1) + " / " + fmt(r.tearout_kip, 1) + " kip";
    oGov.textContent = r.governing_mode + " at " + fmt(r.governing_kip, 1) + " kip";
    oDcr.textContent = fmt(r.dcr, 2) + (r.adequate ? " (adequate)" : " - OVER, fails by " + r.governing_mode);
  }, DEBOUNCE_MS);
  for (const f of [P, t, Dh, Dp, a, w, fy, fu, nd]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["lifting-lug-design"] = renderLiftingLugDesign;

// --- spec-v615 Z: Three-point bridle leg tension, 3-D resolution (`three-point-bridle`) ---
// Li = sqrt(e^2 + n^2 + rise^2); ui = (e, n, rise)/Li; solve T1 u1 + T2 u2 + T3 u3 = (0, 0, W) by Cramer's rule.
// dims: in { apex_load_lb: M L T^-2, e1_ft: L, n1_ft: L, r1_ft: L, e2_ft: L, n2_ft: L, r2_ft: L, e3_ft: L, n3_ft: L, r3_ft: L } out: { len1_ft: L, len2_ft: L, len3_ft: L, angle1_deg: dimensionless, angle2_deg: dimensionless, angle3_deg: dimensionless, t1_lb: M L T^-2, t2_lb: M L T^-2, t3_lb: M L T^-2 }
export function computeThreePointBridle({ apex_load_lb, e1_ft, n1_ft, r1_ft, e2_ft, n2_ft, r2_ft, e3_ft, n3_ft, r3_ft } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const W = Number(apex_load_lb);
  if (!Number.isFinite(W) || W <= 0) return { error: "Apex load must be a positive finite number (lb)." };
  const legs = [[e1_ft, n1_ft, r1_ft], [e2_ft, n2_ft, r2_ft], [e3_ft, n3_ft, r3_ft]].map((p) => p.map(Number));
  const u = [], len = [];
  for (let i = 0; i < 3; i++) {
    const [e, n, r] = legs[i];
    if (!Number.isFinite(e) || !Number.isFinite(n) || !Number.isFinite(r)) return { error: "Leg " + (i + 1) + " offsets must be finite numbers (ft)." };
    if (!(r > 0)) return { error: "Leg " + (i + 1) + " rise must be positive (ft) - every leg goes up from the apex." };
    const L = Math.hypot(e, n, r);
    len.push(L);
    u.push([e / L, n / L, r / L]);
  }
  // Columns of the 3x3 system are the leg unit vectors; RHS is (0, 0, W).
  const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const A = [[u[0][0], u[1][0], u[2][0]], [u[0][1], u[1][1], u[2][1]], [u[0][2], u[1][2], u[2][2]]];
  const D = det3(A);
  if (!(Math.abs(D) > 1e-9)) return { error: "Degenerate geometry - the three legs are coplanar with the load and cannot balance it." };
  const b = [0, 0, W];
  const T = [];
  for (let i = 0; i < 3; i++) {
    const M = A.map((row) => row.slice());
    for (let r = 0; r < 3; r++) M[r][i] = b[r];
    T.push(det3(M) / D);
  }
  if (T.some((t) => !(t > 0))) return { error: "A leg goes slack - the apex hangs horizontally outside the triangle of the attachment points (a rope can only pull). Move a point or use a different pick." };
  const ang = u.map((v) => Math.asin(v[2]) * 180 / Math.PI);
  return {
    len1_ft: len[0], len2_ft: len[1], len3_ft: len[2],
    angle1_deg: ang[0], angle2_deg: ang[1], angle3_deg: ang[2],
    t1_lb: T[0], t2_lb: T[1], t3_lb: T[2],
    note: "Exact static 3-D resolution. The solution is physical only while every leg tension is positive - the apex must hang horizontally inside the triangle of its attachment points. An asymmetric hang splits the load far from evenly (the near, steep legs carry most of it). The hardware ratings and a qualified rigger govern.",
  };
}

function renderThreePointBridle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Entertainment rigging three-point bridle geometry (static 3-D resolution), by name. Li = sqrt(e^2 + n^2 + rise^2); ui = (e, n, rise)/Li; T1 u1 + T2 u2 + T3 u3 = (0, 0, W) solved by Cramer's rule. Physical only while every tension is positive (a rope can only pull - the apex must hang inside the triangle of its attachment points); an asymmetric hang splits the load far from evenly. The hardware ratings and a qualified rigger govern.";
  const w = makeNumber("Apex load (lb)", "tpb-w", { step: "any", min: "0" });
  const e1 = makeNumber("Leg 1 east offset (ft, - west)", "tpb-e1", { step: "any" });
  const n1 = makeNumber("Leg 1 north offset (ft, - south)", "tpb-n1", { step: "any" });
  const r1 = makeNumber("Leg 1 rise (ft)", "tpb-r1", { step: "any", min: "0" });
  const e2 = makeNumber("Leg 2 east offset (ft)", "tpb-e2", { step: "any" });
  const n2 = makeNumber("Leg 2 north offset (ft)", "tpb-n2", { step: "any" });
  const r2 = makeNumber("Leg 2 rise (ft)", "tpb-r2", { step: "any", min: "0" });
  const e3 = makeNumber("Leg 3 east offset (ft)", "tpb-e3", { step: "any" });
  const n3 = makeNumber("Leg 3 north offset (ft)", "tpb-n3", { step: "any" });
  const r3 = makeNumber("Leg 3 rise (ft)", "tpb-r3", { step: "any", min: "0" });
  const fields = [w, e1, n1, r1, e2, n2, r2, e3, n3, r3];
  for (const f of fields) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    w.input.value = "1200";
    e1.input.value = "6"; n1.input.value = "0"; r1.input.value = "8";
    e2.input.value = "-3"; n2.input.value = "5.196"; r2.input.value = "8";
    e3.input.value = "-3"; n3.input.value = "-5.196"; r3.input.value = "8";
    update();
  });
  const oT1 = makeOutputLine(outputRegion, "Leg 1 tension / angle", "tpb-out-t1");
  const oT2 = makeOutputLine(outputRegion, "Leg 2 tension / angle", "tpb-out-t2");
  const oT3 = makeOutputLine(outputRegion, "Leg 3 tension / angle", "tpb-out-t3");
  const update = debounce(() => {
    const r = computeThreePointBridle({
      apex_load_lb: Number(w.input.value) || 0,
      e1_ft: Number(e1.input.value) || 0, n1_ft: Number(n1.input.value) || 0, r1_ft: Number(r1.input.value) || 0,
      e2_ft: Number(e2.input.value) || 0, n2_ft: Number(n2.input.value) || 0, r2_ft: Number(r2.input.value) || 0,
      e3_ft: Number(e3.input.value) || 0, n3_ft: Number(n3.input.value) || 0, r3_ft: Number(r3.input.value) || 0,
    });
    if (r.error) { oT1.textContent = r.error; oT2.textContent = "-"; oT3.textContent = "-"; return; }
    const W = Number(w.input.value) || 0;
    oT1.textContent = fmt(r.t1_lb, 0) + " lb at " + fmt(r.angle1_deg, 0) + " deg (" + fmt(r.len1_ft, 2) + " ft)" + (r.t1_lb > W ? " - over the load" : "");
    oT2.textContent = fmt(r.t2_lb, 0) + " lb at " + fmt(r.angle2_deg, 0) + " deg (" + fmt(r.len2_ft, 2) + " ft)" + (r.t2_lb > W ? " - over the load" : "");
    oT3.textContent = fmt(r.t3_lb, 0) + " lb at " + fmt(r.angle3_deg, 0) + " deg (" + fmt(r.len3_ft, 2) + " ft)" + (r.t3_lb > W ? " - over the load" : "");
  }, DEBOUNCE_MS);
  for (const f of fields) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["three-point-bridle"] = renderThreePointBridle;

// --- spec-v616 Z: Beam clamp reaction and side-pull check (`beam-clamp-side-pull`) ---
// V = T sin(angle), H = T cos(angle); utilizations vs the vertical WLL and the (often zero) side-pull rating.
// dims: in { leg_tension_lb: M L T^-2, leg_angle_deg: dimensionless, vertical_wll_lb: M L T^-2, side_pull_lb: M L T^-2 } out: { vertical_lb: M L T^-2, horizontal_lb: M L T^-2, resultant_lb: M L T^-2, pull_from_vertical_deg: dimensionless, vertical_util_pct: dimensionless }
export function computeBeamClampSidePull({ leg_tension_lb, leg_angle_deg, vertical_wll_lb, side_pull_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const T = Number(leg_tension_lb);
  const th = Number(leg_angle_deg);
  const Vcap = Number(vertical_wll_lb);
  const Hcap = Number(side_pull_lb) || 0;
  if (!Number.isFinite(T) || T <= 0) return { error: "Leg tension must be a positive finite number (lb)." };
  if (!Number.isFinite(th) || !(th > 0 && th <= 90)) return { error: "Leg angle must be in (0, 90] degrees above horizontal (90 = straight vertical)." };
  if (!Number.isFinite(Vcap) || Vcap <= 0) return { error: "Vertical WLL must be a positive finite number (lb)." };
  if (!Number.isFinite(Hcap) || Hcap < 0) return { error: "Side-pull rating must be zero (not rated) or positive (lb)." };
  const rad = th * Math.PI / 180;
  const vertical_lb = T * Math.sin(rad);
  const horizontal_lb = th === 90 ? 0 : T * Math.cos(rad);
  const resultant_lb = T;
  const pull_from_vertical_deg = Math.atan2(horizontal_lb, vertical_lb) * 180 / Math.PI;
  const vertical_util_pct = vertical_lb / Vcap * 100;
  const horizontal_rated = Hcap > 0;
  const horizontal_util_pct = horizontal_rated ? horizontal_lb / Hcap * 100 : null;
  const needs_rerig = !horizontal_rated && horizontal_lb > 1e-9;
  const vertical_ok = vertical_lb <= Vcap;
  const horizontal_ok = horizontal_rated ? horizontal_lb <= Hcap : !needs_rerig;
  const ok = vertical_ok && horizontal_ok;
  return {
    vertical_lb, horizontal_lb, resultant_lb, pull_from_vertical_deg, vertical_util_pct, horizontal_util_pct,
    horizontal_rated, needs_rerig, ok,
    note: needs_rerig
      ? "A horizontal component lands on a clamp with no side-pull rating - re-rig (spot the attachment over the load, or use a trolley or spanner beam), do not accept the number. The hardware ratings and a qualified rigger govern."
      : "The clamp WLL is a vertical rating; the side pull is checked against the manufacturer's documented allowance only. The hardware ratings and a qualified rigger govern.",
  };
}

function renderBeamClampSidePull(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Static force resolution; ASME B30.20 / beam-clamp manufacturer practice (the WLL is a vertical rating and side pull is prohibited unless the manufacturer rates it), by name. V = T sin(angle); H = T cos(angle); utilizations V / V_WLL and H / H_allow. Most beam clamps carry no side-pull rating at all - when a horizontal component lands on an unrated clamp, re-rig (spot the attachment over the load, or use a trolley or spanner beam). The hardware ratings and a qualified rigger govern.";
  const t = makeNumber("Leg tension (lb)", "bcs-t", { step: "any", min: "0" });
  const a = makeNumber("Leg angle above horizontal (deg, 90 = vertical)", "bcs-a", { step: "any", min: "0", max: "90" });
  const vc = makeNumber("Clamp vertical WLL (lb)", "bcs-vc", { step: "any", min: "0" });
  const hc = makeNumber("Side-pull rating (lb, 0 = not rated)", "bcs-hc", { step: "any", min: "0", value: "0" });
  hc.input.value = "0";
  for (const f of [t, a, vc, hc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { t.input.value = "860.23"; a.input.value = "63.43"; vc.input.value = "2000"; hc.input.value = "500"; update(); });
  const oV = makeOutputLine(outputRegion, "Vertical component", "bcs-out-v");
  const oH = makeOutputLine(outputRegion, "Horizontal (side pull)", "bcs-out-h");
  const oN = makeOutputLine(outputRegion, "Verdict", "bcs-out-n");
  const update = debounce(() => {
    const r = computeBeamClampSidePull({ leg_tension_lb: Number(t.input.value) || 0, leg_angle_deg: Number(a.input.value) || 0, vertical_wll_lb: Number(vc.input.value) || 0, side_pull_lb: Number(hc.input.value) || 0 });
    if (r.error) { oV.textContent = r.error; oH.textContent = "-"; oN.textContent = "-"; return; }
    oV.textContent = fmt(r.vertical_lb, 1) + " lb (" + fmt(r.vertical_util_pct, 1) + "% of the WLL)";
    oH.textContent = fmt(r.horizontal_lb, 1) + " lb" + (r.horizontal_rated ? " (" + fmt(r.horizontal_util_pct, 1) + "% of the side-pull rating)" : " - no side-pull rating") + ", pulling " + fmt(r.pull_from_vertical_deg, 1) + " deg off vertical";
    oN.textContent = r.needs_rerig ? "RE-RIG - side pull on an unrated clamp" : (r.ok ? "Within both ratings" : "OVER a rating - do not make this pick");
  }, DEBOUNCE_MS);
  for (const f of [t, a, vc, hc]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["beam-clamp-side-pull"] = renderBeamClampSidePull;

// ===================== spec-v938: wire-rope clip count and spacing (OSHA Table H-2/H-20) =====================
// dims: in { rope_diameter_in: L } out: { clip_count: dimensionless, spacing_in: L, minimum_tail_in: L }
export function computeWireRopeClips({ rope_diameter_in = 0.75 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rope_diameter_in > 0)) return { error: "Rope diameter must be positive (in)." };
  // OSHA 1926.251 Table H-2 (formerly H-20) minimum U-bolt clip count by rope diameter.
  const d = rope_diameter_in;
  const clip_count = d < 0.5 ? 2 : d <= 0.625 ? 3 : d <= 0.875 ? 4 : d <= 1.0 ? 5 : d <= 1.25 ? 6 : d <= 1.5 ? 7 : 8;
  // Spacing between clips = 6 x the rope diameter (per the table); the tail past the last clip carries the same spacing.
  const spacing_in = 6 * rope_diameter_in;
  const minimum_tail_in = (clip_count - 1) * spacing_in + spacing_in;
  if (![clip_count, spacing_in, minimum_tail_in].every(Number.isFinite)) return { error: "Wire-rope-clip math is not a finite value." };
  return {
    clip_count,
    spacing_in,
    minimum_tail_in,
    note: "The minimum number of U-bolt wire-rope clips and their spacing to form a load-bearing eye, per OSHA 29 CFR 1926.251 Table H-2 (the old H-20): a 3/4 in rope takes 4 clips at 6 x the diameter (4.5 in) on center. The clips MUST be installed with the U-bolt (saddle) on the DEAD (short) end and the saddle (base) on the LIVE (load) end -- 'never saddle a dead horse' -- torqued to the maker's value in sequence, retorqued after the first load. Below 1/2 in the OSHA table does not list a count; 2 clips is the common manufacturer minimum. Use only the wire-rope thimble and clips rated for the rope, and re-check the torque; the clip and rope manufacturer and OSHA govern the termination, and a properly formed clip eye develops only about 80% of the rope's strength." ,
  };
}

export const wireRopeClipsExample = { inputs: { rope_diameter_in: 0.75 } };

function _v938renderWireRopeClips(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: wire-rope clip count and spacing by name (OSHA 29 CFR 1926.251 Table H-2 / H-20). clips by rope diameter (1/2->3, 3/4->4, 1->5, ...); spacing = 6 x diameter. U-bolt on the dead end ('never saddle a dead horse'); torque per the maker. The manufacturer and OSHA govern the termination.";
  const dia = makeNumber("Wire rope diameter (in)", "wrc-dia", { step: "any", min: "0", value: "0.75" });
  dia.input.value = "0.75";
  inputRegion.appendChild(dia.wrap);
  attachExampleButton(inputRegion, () => { dia.input.value = "0.75"; update(); });
  const oClips = makeOutputLine(outputRegion, "Minimum clips", "wrc-out-clips");
  const oSpace = makeOutputLine(outputRegion, "Clip spacing (6 x diameter)", "wrc-out-space");
  const oTail = makeOutputLine(outputRegion, "Minimum turnback / tail", "wrc-out-tail");
  const update = debounce(() => {
    const r = computeWireRopeClips({ rope_diameter_in: dia.input.value === "" ? 0.75 : Number(dia.input.value) });
    if (r.error) { oClips.textContent = r.error; oSpace.textContent = "-"; oTail.textContent = "-"; return; }
    oClips.textContent = fmt(r.clip_count, 0) + " clips";
    oSpace.textContent = fmt(r.spacing_in, 2) + " in on center";
    oTail.textContent = "about " + fmt(r.minimum_tail_in, 1) + " in of tail past the thimble";
  }, DEBOUNCE_MS);
  dia.input.addEventListener("input", update);
}
RIGGING_RENDERERS["wire-rope-clips"] = _v938renderWireRopeClips;

// ===================== spec-v953: crane load radius and boom-tip height from boom geometry =====================
// dims: in { args: dimensionless } out: { load_radius_ft: dimensionless, boom_tip_height_ft: dimensionless, angle_for_target_radius_deg: dimensionless }
export function computeCraneLoadRadiusBoom({ boom_length_ft = 30, boom_angle_deg = 60, boom_foot_offset_ft = 4, boom_foot_height_ft = 6, target_radius_ft = 25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(boom_length_ft > 0)) return { error: "Boom length must be positive (ft)." };
  if (!(boom_angle_deg >= 0 && boom_angle_deg <= 90)) return { error: "Boom angle must be between 0 and 90 degrees from horizontal." };
  if (!(boom_foot_offset_ft >= 0)) return { error: "Boom-foot offset cannot be negative (ft)." };
  if (!(boom_foot_height_ft >= 0)) return { error: "Boom-foot height cannot be negative (ft)." };
  if (!(target_radius_ft > 0)) return { error: "Target radius must be positive (ft)." };
  // Load radius = the horizontal distance from the center of rotation to the hook; tip height above ground.
  const theta = boom_angle_deg * Math.PI / 180;
  const load_radius_ft = boom_foot_offset_ft + boom_length_ft * Math.cos(theta);
  const boom_tip_height_ft = boom_foot_height_ft + boom_length_ft * Math.sin(theta);
  // Inverse: the boom angle that puts the hook at a target load radius (if the boom can reach it).
  const ratio = (target_radius_ft - boom_foot_offset_ft) / boom_length_ft;
  let angle_for_target_radius_deg = null;
  let target_reachable = true;
  if (ratio >= -1 && ratio <= 1) angle_for_target_radius_deg = Math.acos(ratio) * 180 / Math.PI;
  else target_reachable = false;
  if (![load_radius_ft, boom_tip_height_ft].every(Number.isFinite)) return { error: "Crane-geometry math is not a finite value." };
  return {
    load_radius_ft,
    boom_tip_height_ft,
    angle_for_target_radius_deg,
    target_reachable,
    note: "The load radius and boom-tip height from the boom length and angle -- the geometry that turns the crane's boom-angle-indicator reading into the RADIUS the load chart is actually indexed by. Load radius = the boom-foot horizontal offset from the center of rotation + boom length x cos(angle); tip height = the boom-foot height + boom length x sin(angle). A 30 ft boom at 60 degrees off a foot 4 ft out and 6 ft up puts the hook at a 19 ft radius and a 32 ft tip height; lowering the boom to 45 degrees swings the hook out to a 25 ft radius. The inverse -- the angle that lands the hook at a target radius -- is acos((target - offset)/boom length), so a 25 ft radius needs about 46 degrees; if the target exceeds the boom's reach it is flagged unreachable. This is boom geometry only: it does NOT include boom deflection under load, the load-radius increase as the boom bends out, wire-rope stretch, or out-of-level effects, all of which INCREASE the actual radius. The crane's load chart, the load-moment indicator, and a qualified operator/lift director govern the rated capacity at the radius.",
  };
}

export const craneLoadRadiusBoomExample = { inputs: { boom_length_ft: 30, boom_angle_deg: 60, boom_foot_offset_ft: 4, boom_foot_height_ft: 6, target_radius_ft: 25 } };

function _v953renderCraneLoadRadiusBoom(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: crane load radius and boom-tip height from boom geometry, by name. radius = boom-foot offset + boom length x cos(angle); tip height = boom-foot height + boom length x sin(angle); angle for a target radius = acos((target - offset)/length). Boom geometry only (no deflection/stretch/out-of-level, which increase the real radius). The load chart, load-moment indicator, and qualified operator govern.";
  const bl = makeNumber("Boom length (ft)", "clr-bl", { step: "any", min: "0", value: "30" });
  bl.input.value = "30";
  const ba = makeNumber("Boom angle from horizontal (deg)", "clr-ba", { step: "any", min: "0", value: "60" });
  ba.input.value = "60";
  const bo = makeNumber("Boom-foot offset from center pin (ft)", "clr-bo", { step: "any", min: "0", value: "4" });
  bo.input.value = "4";
  const bh = makeNumber("Boom-foot height (ft)", "clr-bh", { step: "any", min: "0", value: "6" });
  bh.input.value = "6";
  const tr = makeNumber("Target load radius (ft)", "clr-tr", { step: "any", min: "0", value: "25" });
  tr.input.value = "25";
  for (const f of [bl, ba, bo, bh, tr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { bl.input.value = "30"; ba.input.value = "60"; bo.input.value = "4"; bh.input.value = "6"; tr.input.value = "25"; update(); });
  const oR = makeOutputLine(outputRegion, "Load radius", "clr-out-r");
  const oH = makeOutputLine(outputRegion, "Boom-tip height", "clr-out-h");
  const oA = makeOutputLine(outputRegion, "Angle for target radius", "clr-out-a");
  const update = debounce(() => {
    const r = computeCraneLoadRadiusBoom({
      boom_length_ft: bl.input.value === "" ? 30 : Number(bl.input.value), boom_angle_deg: ba.input.value === "" ? 60 : Number(ba.input.value),
      boom_foot_offset_ft: bo.input.value === "" ? 4 : Number(bo.input.value), boom_foot_height_ft: bh.input.value === "" ? 6 : Number(bh.input.value),
      target_radius_ft: tr.input.value === "" ? 25 : Number(tr.input.value),
    });
    if (r.error) { oR.textContent = r.error; oH.textContent = "-"; oA.textContent = "-"; return; }
    oR.textContent = fmt(r.load_radius_ft, 2) + " ft";
    oH.textContent = fmt(r.boom_tip_height_ft, 2) + " ft";
    oA.textContent = r.target_reachable ? fmt(r.angle_for_target_radius_deg, 1) + " deg for " + fmt(Number(tr.input.value) || 25, 0) + " ft radius" : "target radius beyond boom reach";
  }, DEBOUNCE_MS);
  for (const f of [bl, ba, bo, bh, tr]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["crane-load-radius-boom"] = _v953renderCraneLoadRadiusBoom;

// ===================== spec-v991: block-and-tackle reeving line pull =====================
// dims: in { args: dimensionless } out: { hauling_line_pull_lb: dimensionless, frictionless_pull_lb: dimensionless, reeving_efficiency: dimensionless }
export function computeReevingPartsOfLine({ load_lb = 20000, parts_of_line = 4, sheave_efficiency = 0.98 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(load_lb > 0)) return { error: "Load must be positive (lb)." };
  if (!(parts_of_line >= 1) || !Number.isInteger(parts_of_line)) return { error: "Parts of line must be a whole number >= 1." };
  if (!(sheave_efficiency > 0 && sheave_efficiency <= 1)) return { error: "Per-sheave efficiency must be between 0 and 1 (~0.98 roller, 0.96 plain)." };
  const N = parts_of_line;
  const k = sheave_efficiency;
  const frictionless_pull_lb = load_lb / N;
  // Friction stacks per sheave: tension in part i = T*k^(i-1); summing = load, so T = load*(1-k)/(1-k^N).
  const hauling_line_pull_lb = (k === 1) ? frictionless_pull_lb : load_lb * (1 - k) / (1 - Math.pow(k, N));
  const reeving_efficiency = load_lb / (N * hauling_line_pull_lb);
  if (![hauling_line_pull_lb, frictionless_pull_lb, reeving_efficiency].every(Number.isFinite)) return { error: "Reeving math is not a finite value." };
  return {
    hauling_line_pull_lb,
    frictionless_pull_lb,
    reeving_efficiency,
    note: "The pull needed on the hauling (lead) line of a block-and-tackle or crane hoist reeved with N parts of line, and how much friction costs you. In a frictionless ideal the load divides evenly over the parts, so each part -- and the pull -- is the load divided by N. Real sheaves lose a few percent each to bearing and rope-bending friction, and that loss STACKS: the part nearest the hauling end carries the most, and the tension in successive parts falls by the per-sheave efficiency k, so summing the parts to equal the load gives a hauling-line pull of load x (1 - k) / (1 - k^N). With a 20,000 lb load on 4 parts and k = 0.98 (a roller-bearing sheave), the pull is 20,000 x 0.02 / (1 - 0.98^4) = 5,152 lb -- above the frictionless 5,000 lb -- and the reeving efficiency is load / (N x pull) = 97.0%. Plain-bronze (bushed) sheaves run nearer k = 0.96 and cost more; more parts multiply the load advantage but also stack more friction, so doubling the parts never quite halves the pull. This is the STEADY hauling pull, not the higher force to overcome inertia and start the load moving, and it is the pull on the lead line only. A rigging screen; the block and rope ratings, the actual sheave friction, the reeving pattern, and a qualified rigger and the lift plan govern.",
  };
}

export const reevingPartsOfLineExample = { inputs: { load_lb: 20000, parts_of_line: 4, sheave_efficiency: 0.98 } };

function _v991renderReevingPartsOfLine(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: block-and-tackle reeving line pull, by name. pull = load x (1 - k) / (1 - k^N); reeving efficiency = load / (N x pull); k per-sheave ~0.98 roller / 0.96 plain. Steady hauling pull on the lead line only (not the inertia to start the load). The block/rope ratings, the sheave friction, and a qualified rigger and lift plan govern.";
  const ld = makeNumber("Load (lb)", "rpl-ld", { step: "any", min: "0", value: "20000" });
  ld.input.value = "20000";
  const np = makeNumber("Parts of line", "rpl-np", { step: "1", min: "1", value: "4" });
  np.input.value = "4";
  const ke = makeNumber("Per-sheave efficiency (0.98 roller, 0.96 plain)", "rpl-ke", { step: "any", min: "0", max: "1", value: "0.98" });
  ke.input.value = "0.98";
  for (const f of [ld, np, ke]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ld.input.value = "20000"; np.input.value = "4"; ke.input.value = "0.98"; update(); });
  const oP = makeOutputLine(outputRegion, "Hauling-line pull", "rpl-out-p");
  const oE = makeOutputLine(outputRegion, "Reeving efficiency", "rpl-out-e");
  const update = debounce(() => {
    const r = computeReevingPartsOfLine({
      load_lb: ld.input.value === "" ? 20000 : Number(ld.input.value), parts_of_line: np.input.value === "" ? 4 : Number(np.input.value),
      sheave_efficiency: ke.input.value === "" ? 0.98 : Number(ke.input.value),
    });
    if (r.error) { oP.textContent = r.error; oE.textContent = "-"; return; }
    oP.textContent = fmt(r.hauling_line_pull_lb, 0) + " lb (frictionless " + fmt(r.frictionless_pull_lb, 0) + " lb)";
    oE.textContent = fmt(r.reeving_efficiency * 100, 1) + "%";
  }, DEBOUNCE_MS);
  for (const f of [ld, np, ke]) f.input.addEventListener("input", update);
}
RIGGING_RENDERERS["reeving-parts-of-line"] = _v991renderReevingPartsOfLine;
