// Group F: Technical Rescue & Confined-Space calculators.
//
// spec-v82 cap-relief split: the cohesive spec-v3 technical-rescue bench
// (confined-space air-change time, rope-rescue mechanical advantage, and
// sling-angle load multiplier) was extracted from calc-fire.js (which sat
// at 94.9% of its gzip cap) into this module. These are life-safety /
// rescue-rigging decisions, distinct from the fire-suppression hydraulics
// (hose friction, pump discharge, hydrant flow, fire flow, master stream)
// that stay in calc-fire.js. All three tiles KEEP group: "F" (the module is
// independent of the group letter, per the v28/v30/v36/v39/v70..v81
// precedent); their ids, citations, worked examples, dimensional
// annotations, and behavior are byte-for-byte unchanged.
//
// All Group F utilities carry the SOP-and-incident-command notice variant
// (rendered by app.js based on the tool's trade tag).

import {
  DEBOUNCE_MS as _DF, debounce as _debF, makeNumber as _mnF, makeSelect as _msF,
  makeOutputLine as _moF, attachExampleButton as _aeF, fmt as _fmtF,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input. A renderer
// coerces an empty number field to 0 (Number("") === 0), so a NaN or
// Infinity reaching a solver is genuinely unusable (a pasted 1e999, a
// degenerate computed slot); per the spec-v18 §2 output contract the
// solver returns {error} rather than leaking a non-finite output field.
// Generic over the input object, so it needs no per-tile slot list, and
// it inspects only own numeric values (strings/arrays/null pass through).
// Non-exported, so it adds no v14 derivation-corpus row.
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

// =====================================================================
// v3 utilities (159 through 161). See spec-v3.md section 2.6.
// =====================================================================

// --- Utility 159: Confined Space Air Change Time ---
//
// minutes = (volume * target_purges) / CFM. OSHA 1910.146 cited by section.

// dims: in { volume_ft3: L^3, blower_cfm: L^3 T^-1, target_purges: dimensionless } out: minutes: T
export function computeConfinedSpacePurge({ volume_ft3 = 0, blower_cfm = 0, target_purges = 7 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(volume_ft3 > 0)) return { error: "Volume must be positive." };
  if (!(blower_cfm > 0)) return { error: "Blower CFM must be positive." };
  if (!(target_purges > 0)) return { error: "Target purges must be positive." };
  const minutes = (volume_ft3 * target_purges) / blower_cfm;
  return { minutes };
}

export const confinedSpacePurgeExample = { inputs: { volume_ft3: 1000, blower_cfm: 200, target_purges: 7 } };

// --- Utility 160: Rope Rescue Mechanical Advantage ---
//
// theoretical MA from rig type; actual MA = theoretical * (efficiency)^pulleys.
// haul_force = load / actual MA. NFA / NFPA training literature cited by name.

export const ROPE_RIGS = {
  "1:1": { ma: 1, pulleys: 0 },
  "2:1": { ma: 2, pulleys: 1 },
  "3:1": { ma: 3, pulleys: 2 },
  "4:1": { ma: 4, pulleys: 3 },
  "5:1": { ma: 5, pulleys: 3 },
  T_method: { ma: 5, pulleys: 4 },
  "5:1_piggyback": { ma: 5, pulleys: 4 },
};

// dims: in { rig: dimensionless, efficiency: dimensionless, load_lb: M L T^-2 }
//        out: { theoretical_ma: dimensionless, actual_ma: dimensionless, haul_force_lb: M L T^-2, pulleys: dimensionless }
export function computeRopeMA({ rig = "3:1", efficiency = 0.9, load_lb = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const r = ROPE_RIGS[rig];
  if (!r) return { error: "Unknown rig type." };
  if (!(efficiency > 0 && efficiency <= 1)) return { error: "Efficiency must be 0..1." };
  if (!(load_lb >= 0)) return { error: "Load must be non-negative." };
  const actual_ma = r.ma * Math.pow(efficiency, r.pulleys);
  const haul_force_lb = load_lb / actual_ma;
  return { theoretical_ma: r.ma, actual_ma, haul_force_lb, pulleys: r.pulleys };
}

export const ropeMAExample = { inputs: { rig: "4:1", efficiency: 0.9, load_lb: 600 } };

// --- Utility 161: Sling Angle Load Multiplier ---
//
// L = W / (n * sin(theta/2)) for basket / vertical.
// Choker reduction factor 0.75 typical. ASME B30.9 cited by section.

// spec-v27 EN: standard wire-rope D/d bend-efficiency curve (sling diameter
// over the pin/load radius it bends around). Interpolated; D/d >= 25 -> 100%.
const _V27_DD_EFFICIENCY = [[1, 0.50], [2, 0.65], [4, 0.80], [6, 0.85], [8, 0.92], [10, 0.95], [15, 0.96], [20, 0.97], [25, 1.00]];
function _v27SlingDDEfficiency(dd) {
  if (!(dd > 0)) return 1.0;
  const t = _V27_DD_EFFICIENCY;
  if (dd <= t[0][0]) return t[0][1];
  if (dd >= t[t.length - 1][0]) return 1.0;
  for (let i = 0; i < t.length - 1; i++) {
    if (dd >= t[i][0] && dd <= t[i + 1][0]) {
      const [x0, y0] = t[i], [x1, y1] = t[i + 1];
      return y0 + ((dd - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return 1.0;
}

// dims: in { load_lb: M L T^-2, sling_config: dimensionless, included_angle_deg: dimensionless, n_legs: dimensionless }
//        out: { tension_per_leg_lb: M L T^-2, choker_factor: dimensionless }
export function computeSlingAngle({ load_lb = 0, sling_config = "vertical", included_angle_deg = 60, n_legs = 2, dd_ratio = 0, sling_rated_capacity_lb = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(load_lb >= 0)) return { error: "Load must be non-negative." };
  if (!(n_legs >= 1)) return { error: "At least one leg required." };
  if (!(included_angle_deg > 0 && included_angle_deg < 180)) return { error: "Included angle must be 0-180 deg." };
  const theta_rad = (included_angle_deg / 2) * Math.PI / 180;
  let tension_per_leg;
  let factor;
  if (sling_config === "vertical") {
    tension_per_leg = load_lb / n_legs;
    factor = 1;
  } else if (sling_config === "basket" || sling_config === "bridle") {
    tension_per_leg = load_lb / (n_legs * Math.sin(theta_rad));
    factor = 1;
  } else if (sling_config === "choker") {
    tension_per_leg = load_lb / (n_legs * Math.sin(theta_rad));
    factor = 0.75;
    tension_per_leg = tension_per_leg / factor; // applied capacity reduction = effective tension increase
  } else {
    return { error: "Unknown sling configuration." };
  }
  // spec-v27 EN (folds the dropped sling-load-tension delta in here): the
  // sling must be rated for at least the per-leg tension; the angle (load)
  // factor doubles at ~30 deg from horizontal; an optional D/d bend
  // efficiency de-rates the sling's rated capacity. All additive.
  const min_required_capacity_lb = tension_per_leg;
  const per_leg_share = load_lb / n_legs;
  const angle_factor = per_leg_share > 0 ? tension_per_leg / per_leg_share : 1;
  const low_angle_hazard = angle_factor >= 2; // ~30 deg from horizontal or flatter
  const dd_efficiency = _v27SlingDDEfficiency(Number(dd_ratio) || 0);
  let effective_capacity_lb = null, utilization = null;
  const rated = Number(sling_rated_capacity_lb) || 0;
  if (rated > 0) {
    effective_capacity_lb = rated * dd_efficiency;
    utilization = effective_capacity_lb > 0 ? tension_per_leg / effective_capacity_lb : null;
  }
  return {
    tension_per_leg_lb: tension_per_leg, choker_factor: factor,
    min_required_capacity_lb, angle_factor, low_angle_hazard,
    dd_efficiency, effective_capacity_lb, utilization,
  };
}

export const slingAngleExample = { inputs: { load_lb: 2000, sling_config: "basket", included_angle_deg: 60, n_legs: 2 } };

// --- v3 renderers ---

function renderConfinedSpacePurge(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: Departmental SOPs and incident command govern all confined-space and worker-safety operations. Citation: OSHA 1910.146 by section number only. Formula: t (min) = (V * N) / CFM.";
  _aeF(inputRegion, () => fillExample(confinedSpacePurgeExample.inputs));
  const v = _mnF("Space volume (ft^3)", "cs-v", { step: "any", min: "0" });
  const c = _mnF("Blower CFM", "cs-c", { step: "any", min: "0" });
  const n = _mnF("Target air changes", "cs-n", { step: "any", min: "0", value: "7" });
  n.input.value = "7";
  for (const f of [v, c, n]) inputRegion.appendChild(f.wrap);
  const oM = _moF(outputRegion, "Minutes to purge", "cs-out-m");
  function fillExample(x) { v.input.value = x.volume_ft3; c.input.value = x.blower_cfm; n.input.value = x.target_purges; update(); }
  const update = _debF(() => {
    const r = computeConfinedSpacePurge({ volume_ft3: Number(v.input.value) || 0, blower_cfm: Number(c.input.value) || 0, target_purges: Number(n.input.value) || 0 });
    if (r.error) { oM.textContent = r.error; return; }
    oM.textContent = _fmtF(r.minutes, 1) + " min";
  }, _DF);
  for (const el of [v.input, c.input, n.input]) el.addEventListener("input", update);
}

function renderRopeMA(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: Departmental SOPs and incident command govern all rope-rescue operations. Citation: NFA / NFPA training literature by name only.";
  _aeF(inputRegion, () => fillExample(ropeMAExample.inputs));
  const r = _msF("Rig", "rm-r", Object.keys(ROPE_RIGS).map((k) => ({ value: k, label: k })));
  const e = _mnF("Pulley efficiency (0-1)", "rm-e", { step: "any", min: "0", max: "1", value: "0.9" });
  e.input.value = "0.9";
  const l = _mnF("Load (lb)", "rm-l", { step: "any", min: "0" });
  for (const f of [r, e, l]) inputRegion.appendChild(f.wrap);
  const oT = _moF(outputRegion, "Theoretical MA", "rm-out-t");
  const oA = _moF(outputRegion, "Actual MA (after pulley losses)", "rm-out-a");
  const oH = _moF(outputRegion, "Haul force", "rm-out-h");
  function fillExample(x) { r.select.value = x.rig; e.input.value = x.efficiency; l.input.value = x.load_lb; update(); }
  const update = _debF(() => {
    const x = computeRopeMA({ rig: r.select.value, efficiency: Number(e.input.value) || 0, load_lb: Number(l.input.value) || 0 });
    if (x.error) { oT.textContent = x.error; oA.textContent = "-"; oH.textContent = "-"; return; }
    oT.textContent = String(x.theoretical_ma);
    oA.textContent = _fmtF(x.actual_ma, 2);
    oH.textContent = _fmtF(x.haul_force_lb, 0) + " lb";
  }, _DF);
  for (const el of [r.select, e.input, l.input]) el.addEventListener("input", update);
}

function renderSlingAngle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: Departmental SOPs and incident command govern all rigging and lifting operations. Citation: ASME B30.9 by section number only. L = W / (n * sin(theta/2)).";
  _aeF(inputRegion, () => fillExample(slingAngleExample.inputs));
  const w = _mnF("Load (lb)", "sa-w", { step: "any", min: "0" });
  const c = _msF("Sling configuration", "sa-c", [{ value: "vertical", label: "Vertical" }, { value: "basket", label: "Basket" }, { value: "bridle", label: "Bridle" }, { value: "choker", label: "Choker" }]);
  const a = _mnF("Included angle (deg)", "sa-a", { step: "any", min: "0", max: "180" });
  const n = _mnF("Legs", "sa-n", { step: "1", min: "1", value: "2" });
  n.input.value = "2";
  // spec-v27 EN: optional rated capacity + D/d bend efficiency (folds the
  // dropped sling-load-tension delta into this tile).
  const cap = _mnF("Sling rated capacity (lb, optional)", "sa-cap", { step: "any", min: "0" });
  const dd = _mnF("D/d ratio (bend efficiency, optional)", "sa-dd", { step: "any", min: "0" });
  for (const f of [w, c, a, n, cap, dd]) inputRegion.appendChild(f.wrap);
  const oT = _moF(outputRegion, "Tension per leg", "sa-out-t");
  const oReq = _moF(outputRegion, "Min rated capacity / utilization", "sa-out-req");
  const oHaz = _moF(outputRegion, "Angle factor", "sa-out-haz");
  function fillExample(x) { w.input.value = x.load_lb; c.select.value = x.sling_config; a.input.value = x.included_angle_deg; n.input.value = x.n_legs; cap.input.value = ""; dd.input.value = ""; update(); }
  const update = _debF(() => {
    const r = computeSlingAngle({ load_lb: Number(w.input.value) || 0, sling_config: c.select.value, included_angle_deg: Number(a.input.value) || 0, n_legs: Number(n.input.value) || 1, sling_rated_capacity_lb: Number(cap.input.value) || 0, dd_ratio: Number(dd.input.value) || 0 });
    if (r.error) { oT.textContent = r.error; oReq.textContent = "-"; oHaz.textContent = "-"; return; }
    oT.textContent = _fmtF(r.tension_per_leg_lb, 0) + " lb";
    oReq.textContent = r.utilization !== null && r.utilization !== undefined
      ? ("rated " + _fmtF(r.effective_capacity_lb, 0) + " lb effective (D/d " + _fmtF(r.dd_efficiency, 2) + "); utilization " + _fmtF(r.utilization, 2))
      : ("needs >= " + _fmtF(r.min_required_capacity_lb, 0) + " lb rated");
    oHaz.textContent = _fmtF(r.angle_factor, 2) + "x" + (r.low_angle_hazard ? " - HAZARD: at or below ~30 deg from horizontal" : "");
  }, _DF);
  for (const el of [w.input, c.select, a.input, n.input, cap.input, dd.input]) el.addEventListener("input", update);
}

// --- spec-v540 P: Search track spacing and coverage (`search-track-spacing`) ---
// coverage = W/S. POD = 1 - e^(-coverage). Inverse: spacing = W / (-ln(1 - target_POD)).
// dims: in { sweep_width_m: L, track_spacing_m: L, target_pod: dimensionless } out: { coverage: dimensionless, pod: dimensionless, spacing_for_pod_m: L }
export function computeSearchTrackSpacing({ sweep_width_m = 0, track_spacing_m = 0, target_pod = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(sweep_width_m) || 0;
  const s = Number(track_spacing_m) || 0;
  const tp = Number(target_pod) || 0;
  if (!(w > 0)) return { error: "Sweep width must be positive." };
  const solveSpacing = !(s > 0);
  if (solveSpacing) {
    if (!(tp > 0 && tp < 1)) return { error: "Provide a track spacing, or a target POD between 0 and 1 to solve the spacing." };
  }
  const coverage = s > 0 ? w / s : null;
  const pod = coverage !== null ? 1 - Math.exp(-coverage) : null;
  const spacing_for_pod_m = (tp > 0 && tp < 1) ? w / (-Math.log(1 - tp)) : null;
  return {
    coverage, pod, spacing_for_pod_m,
    note: "The sweep width must first be corrected for weather, fatigue, terrain, and speed (the raw detection range overstates it). The exponential random-search model is conservative - parallel-track sweeps reach a higher POD at the same coverage. This is single-pass POD (multiple passes compound via search-probability). The incident commander and search plan govern.",
  };
}
export const searchTrackSpacingExample = { inputs: { sweep_width_m: 100, track_spacing_m: 50, target_pod: 0.80 } };

function renderSearchTrackSpacing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: The incident commander and search plan govern all SAR operations. Citation: NSARC / USCG search theory (exponential detection model) by name. coverage = W / S; POD = 1 - e^(-coverage); spacing = W / (-ln(1 - target_POD)). The sweep width must be corrected for weather, fatigue, terrain, and speed. The random-search model is conservative; parallel-track sweeps reach higher POD at the same coverage.";
  _aeF(inputRegion, () => fillExample(searchTrackSpacingExample.inputs));
  const w = _mnF("Corrected sweep width W (ft)", "sts-w", { step: "any", min: "0" });
  const s = _mnF("Track spacing S (ft, 0 = solve from target POD)", "sts-s", { step: "any", min: "0" });
  const t = _mnF("Target single-pass POD (0-1, used when spacing is 0)", "sts-t", { step: "any", min: "0", max: "1" });
  for (const f of [w, s, t]) inputRegion.appendChild(f.wrap);
  const oC = _moF(outputRegion, "Coverage", "sts-out-c");
  const oP = _moF(outputRegion, "Single-pass POD", "sts-out-p");
  const oS = _moF(outputRegion, "Spacing for target POD", "sts-out-s");
  function fillExample(x) { w.input.value = (x.sweep_width_m * 3.280839895).toFixed(1); s.input.value = (x.track_spacing_m * 3.280839895).toFixed(1); t.input.value = x.target_pod; update(); }
  const update = _debF(() => {
    const r = computeSearchTrackSpacing({ sweep_width_m: (Number(w.input.value) || 0) * 0.3048, track_spacing_m: (Number(s.input.value) || 0) * 0.3048, target_pod: Number(t.input.value) || 0 });
    if (r.error) { oC.textContent = r.error; oP.textContent = "-"; oS.textContent = "-"; return; }
    oC.textContent = r.coverage !== null ? _fmtF(r.coverage, 2) : "- (enter a track spacing)";
    oP.textContent = r.pod !== null ? _fmtF(r.pod * 100, 1) + "%" : "-";
    oS.textContent = r.spacing_for_pod_m !== null ? _fmtF(r.spacing_for_pod_m * 3.280839895, 1) + " ft" : "- (enter a target POD)";
  }, _DF);
  for (const el of [w.input, s.input, t.input]) el.addEventListener("input", update);
}

// --- spec-v541 P: Sweat rate and fluid replacement (`sweat-rate-hydration`) ---
// sweat_loss = (pre-post)*16 + fluid - urine. rate = loss/hr. rehydration = 1.5 x max(0, deficit).
// dims: in { pre_weight_lb: dimensionless, post_weight_lb: dimensionless, fluid_oz: L, urine_oz: L, duration_hr: T } out: { sweat_loss_oz: L, sweat_rate_oz_hr: dimensionless, pct_bw_loss: dimensionless, rehydration_oz: L }
export function computeSweatRateHydration({ pre_weight_lb = 0, post_weight_lb = 0, fluid_oz = 0, urine_oz = 0, duration_hr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const pre = Number(pre_weight_lb) || 0;
  const post = Number(post_weight_lb) || 0;
  const fluid = Number(fluid_oz) || 0;
  const urine = Number(urine_oz) || 0;
  const hrs = Number(duration_hr) || 0;
  if (!(pre > 0)) return { error: "Pre-activity weight must be positive (lb)." };
  if (post < 0) return { error: "Post-activity weight must be non-negative (lb)." };
  if (fluid < 0) return { error: "Fluid consumed must be non-negative (fl oz)." };
  if (urine < 0) return { error: "Urine output must be non-negative (fl oz)." };
  if (!(hrs > 0)) return { error: "Duration must be positive (hours)." };
  const weight_change_oz = (pre - post) * 16;
  const sweat_loss_oz = weight_change_oz + fluid - urine;
  const sweat_rate_oz_hr = sweat_loss_oz / hrs;
  const pct_bw_loss = (pre - post) / pre * 100;
  const rehydration_oz = 1.5 * Math.max(0, weight_change_oz);
  return {
    sweat_loss_oz, sweat_rate_oz_hr, pct_bw_loss, rehydration_oz,
    over_2pct: pct_bw_loss >= 2,
    note: "A stable body weight means intake matched sweat; a drop of even 2% of body weight measurably degrades performance and judgment. Rehydration targets about 1.25-1.5x the deficit because sweating continues and urine takes some. This is fluid volume, not electrolyte replacement. Individual and medical guidance governs.",
  };
}
export const sweatRateHydrationExample = { inputs: { pre_weight_lb: 180, post_weight_lb: 177, fluid_oz: 20, urine_oz: 0, duration_hr: 2 } };

function renderSweatRateHydration(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: Individual and medical guidance governs all field-hydration decisions. Citation: ACSM / NATA position on fluid replacement, by name. sweat_loss = (pre - post) x 16 + fluid - urine; sweat_rate = sweat_loss / hours; pct_bw_loss = (pre - post) / pre x 100; rehydration = 1.5 x max(0, deficit). A drop of even 2% of body weight degrades performance and judgment. This is fluid volume, not electrolyte replacement.";
  _aeF(inputRegion, () => fillExample(sweatRateHydrationExample.inputs));
  const pre = _mnF("Pre-activity weight (lb)", "swr-pre", { step: "any", min: "0" });
  const post = _mnF("Post-activity weight (lb)", "swr-post", { step: "any", min: "0" });
  const fluid = _mnF("Fluid consumed (fl oz)", "swr-fluid", { step: "any", min: "0" });
  const urine = _mnF("Urine output (fl oz, 0 if none)", "swr-urine", { step: "any", min: "0", value: "0" });
  urine.input.value = "0";
  const dur = _mnF("Duration (hr)", "swr-dur", { step: "any", min: "0" });
  for (const f of [pre, post, fluid, urine, dur]) inputRegion.appendChild(f.wrap);
  const oL = _moF(outputRegion, "Sweat loss / rate", "swr-out-l");
  const oP = _moF(outputRegion, "Body-weight loss", "swr-out-p");
  const oR = _moF(outputRegion, "Rehydration target", "swr-out-r");
  function fillExample(x) { pre.input.value = x.pre_weight_lb; post.input.value = x.post_weight_lb; fluid.input.value = x.fluid_oz; urine.input.value = x.urine_oz; dur.input.value = x.duration_hr; update(); }
  const update = _debF(() => {
    const r = computeSweatRateHydration({ pre_weight_lb: Number(pre.input.value) || 0, post_weight_lb: Number(post.input.value) || 0, fluid_oz: Number(fluid.input.value) || 0, urine_oz: Number(urine.input.value) || 0, duration_hr: Number(dur.input.value) || 0 });
    if (r.error) { oL.textContent = r.error; oP.textContent = "-"; oR.textContent = "-"; return; }
    oL.textContent = _fmtF(r.sweat_loss_oz, 0) + " oz (" + _fmtF(r.sweat_rate_oz_hr, 0) + " oz/hr)";
    oP.textContent = _fmtF(r.pct_bw_loss, 1) + "%" + (r.over_2pct ? " - at or past the 2% performance-loss line" : "");
    oR.textContent = _fmtF(r.rehydration_oz, 0) + " oz";
  }, _DF);
  for (const el of [pre.input, post.input, fluid.input, urine.input, dur.input]) el.addEventListener("input", update);
}

// --- spec-v595 P: Search effort in searcher-hours (`searcher-hours`) ---
// track_ft = 43,560 x acres / spacing; searcher_hours = track_ft / (mph x 5,280); clock = effort / searchers.
// dims: in { area_acres: L^2, track_spacing_ft: L, speed_mph: L T^-1, searchers: dimensionless } out: { track_line_mi: L, searcher_hours: T, team_clock_hr: T }
export function computeSearcherHours({ area_acres = 0, track_spacing_ft = 0, speed_mph = 0, searchers = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const a = Number(area_acres) || 0;
  const s = Number(track_spacing_ft) || 0;
  const v = Number(speed_mph) || 0;
  const n = Number(searchers) || 0;
  if (!(a > 0)) return { error: "Segment area must be positive (acres)." };
  if (!(s > 0)) return { error: "Track spacing must be positive (ft)." };
  if (!(v > 0)) return { error: "Ground speed must be positive (mph)." };
  if (!(n >= 1)) return { error: "Searchers must be at least 1." };
  const track_ft = 43560 * a / s;
  const track_line_mi = track_ft / 5280;
  const searcher_hours = track_ft / (v * 5280);
  const team_clock_hr = searcher_hours / n;
  return {
    track_line_mi, searcher_hours, team_clock_hr,
    note: "This is the raw grid-walking effort - briefing, travel to and from the segment, rest breaks, and terrain detours add on top. The spacing comes from a POD calculation (search-track-spacing) and repeated passes compound via search-probability. The incident commander and search plan govern - a planning aid, not a promise of coverage.",
  };
}
export const searcherHoursExample = { inputs: { area_acres: 160, track_spacing_ft: 40, speed_mph: 1.5, searchers: 8 } };

function renderSearcherHours(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: The incident commander and search plan govern all SAR operations; a planning aid, not a promise of coverage. Citation: NSARC / USCG search-planning practice (effort = area over spacing over speed), by name. track_ft = 43,560 x area_acres / spacing_ft; searcher_hours = track_ft / (speed_mph x 5,280); team_clock_hr = searcher_hours / searchers. Raw grid-walking effort only - briefing, travel, rest, and terrain detours add on top.";
  _aeF(inputRegion, () => fillExample(searcherHoursExample.inputs));
  const a = _mnF("Segment area (acres)", "shr-a", { step: "any", min: "0" });
  const s = _mnF("Track spacing (ft)", "shr-s", { step: "any", min: "0" });
  const v = _mnF("Ground speed (mph)", "shr-v", { step: "any", min: "0" });
  const n = _mnF("Searchers walking simultaneously", "shr-n", { step: "1", min: "1", value: "1" });
  n.input.value = "1";
  for (const f of [a, s, v, n]) inputRegion.appendChild(f.wrap);
  const oT = _moF(outputRegion, "Track-line length", "shr-out-t");
  const oE = _moF(outputRegion, "Total effort", "shr-out-e");
  const oC = _moF(outputRegion, "Team clock time", "shr-out-c");
  const oN = _moF(outputRegion, "Note", "shr-out-n");
  function fillExample(x) { a.input.value = x.area_acres; s.input.value = x.track_spacing_ft; v.input.value = x.speed_mph; n.input.value = x.searchers; update(); }
  const update = _debF(() => {
    const r = computeSearcherHours({ area_acres: Number(a.input.value) || 0, track_spacing_ft: Number(s.input.value) || 0, speed_mph: Number(v.input.value) || 0, searchers: n.input.value === "" ? 1 : Number(n.input.value) || 0 });
    if (r.error) { oT.textContent = r.error; oE.textContent = "-"; oC.textContent = "-"; oN.textContent = ""; return; }
    oT.textContent = _fmtF(r.track_line_mi, 1) + " mi";
    oE.textContent = _fmtF(r.searcher_hours, 1) + " searcher-hours";
    oC.textContent = _fmtF(r.team_clock_hr, 2) + " hr";
    oN.textContent = r.note;
  }, _DF);
  for (const el of [a.input, s.input, v.input, n.input]) el.addEventListener("input", update);
}

// --- spec-v614 P: Sweep width correction for weather, speed, and fatigue (`sweep-width-correction`) ---
// W = Wu x f_weather x f_speed x f_fatigue; the corrected width is what search-track-spacing expects as W.
// dims: in { uncorrected_width_ft: L, weather_factor: dimensionless, speed_factor: dimensionless, fatigue_factor: dimensionless } out: { corrected_width_ft: L, total_factor: dimensionless, reduction_pct: dimensionless }
export function computeSweepWidthCorrection({ uncorrected_width_ft = 0, weather_factor = 1, speed_factor = 1, fatigue_factor = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const wu = Number(uncorrected_width_ft) || 0;
  const fw = Number(weather_factor) || 0;
  const fv = Number(speed_factor) || 0;
  const ff = Number(fatigue_factor) || 0;
  if (!(wu > 0)) return { error: "Uncorrected sweep width must be positive (ft)." };
  if (!(fw > 0 && fw <= 1)) return { error: "Weather factor must be in (0, 1] - weather only degrades detection." };
  if (!(fv > 0 && fv <= 1.5)) return { error: "Speed factor must be in (0, 1.5] - near 1 at the reference pace." };
  if (!(ff > 0 && ff <= 1)) return { error: "Fatigue factor must be in (0, 1] - 1 fresh, 0.9 typical fatigued." };
  const total_factor = fw * fv * ff;
  const corrected_width_ft = wu * total_factor;
  const reduction_pct = (1 - total_factor) * 100;
  return {
    corrected_width_ft, total_factor, reduction_pct,
    note: "The corrected width is the W that search-track-spacing expects; the uncorrected width comes from published sweep-width tables or a detection-range experiment, and the factors from the published correction tables for the conditions. The incident commander and search plan govern - a planning aid, not a promise of detection.",
  };
}
export const sweepWidthCorrectionExample = { inputs: { uncorrected_width_ft: 120, weather_factor: 0.5, speed_factor: 1, fatigue_factor: 0.9 } };

function renderSweepWidthCorrection(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: The incident commander and search plan govern all SAR operations; a planning aid, not a promise of detection. Citation: IAMSAR Manual Vol. II / US National SAR Supplement sweep-width correction (W = Wu x f_weather x f_speed x f_fatigue), by name. The uncorrected width comes from published sweep-width tables or a detection-range experiment; the factors come from the published correction tables for the conditions; the corrected width is the W that search-track-spacing expects.";
  _aeF(inputRegion, () => fillExample(sweepWidthCorrectionExample.inputs));
  const w = _mnF("Uncorrected sweep width (ft)", "swc-w", { step: "any", min: "0" });
  const fw = _mnF("Weather factor (0-1, 1 = clear)", "swc-fw", { step: "any", min: "0" });
  const fv = _mnF("Speed factor (1 = reference pace)", "swc-fv", { step: "any", min: "0", value: "1" });
  fv.input.value = "1";
  const ff = _mnF("Fatigue factor (1 fresh, 0.9 fatigued)", "swc-ff", { step: "any", min: "0", value: "1" });
  ff.input.value = "1";
  for (const f of [w, fw, fv, ff]) inputRegion.appendChild(f.wrap);
  const oW = _moF(outputRegion, "Corrected sweep width", "swc-out-w");
  const oF = _moF(outputRegion, "Combined factor", "swc-out-f");
  const oN = _moF(outputRegion, "Note", "swc-out-n");
  function fillExample(x) { w.input.value = x.uncorrected_width_ft; fw.input.value = x.weather_factor; fv.input.value = x.speed_factor; ff.input.value = x.fatigue_factor; update(); }
  const update = _debF(() => {
    const r = computeSweepWidthCorrection({ uncorrected_width_ft: Number(w.input.value) || 0, weather_factor: Number(fw.input.value) || 0, speed_factor: fv.input.value === "" ? 1 : Number(fv.input.value) || 0, fatigue_factor: ff.input.value === "" ? 1 : Number(ff.input.value) || 0 });
    if (r.error) { oW.textContent = r.error; oF.textContent = "-"; oN.textContent = ""; return; }
    oW.textContent = _fmtF(r.corrected_width_ft, 1) + " ft";
    oF.textContent = _fmtF(r.total_factor, 2) + " (" + _fmtF(r.reduction_pct, 0) + "% reduction)";
    oN.textContent = r.note;
  }, _DF);
  for (const el of [w.input, fw.input, fv.input, ff.input]) el.addEventListener("input", update);
}

// --- v779 F: Required fall-arrest clearance below the anchor (`fall-arrest-clearance`) ---
// RFC = free-fall distance + deceleration distance + worker height (D-ring to feet)
// + safety margin. If the available clearance is below RFC the worker strikes the level.
// dims: in { free_fall_distance_ft: L, deceleration_distance_ft: L, worker_height_ft: L, safety_margin_ft: L, available_clearance_ft: L } out: { required_clearance_ft: L, margin_ft: L, adequate: dimensionless }
export function computeFallArrestClearance({ free_fall_distance_ft = 0, deceleration_distance_ft = 0, worker_height_ft = 0, safety_margin_ft = 0, available_clearance_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ffd = Number(free_fall_distance_ft);
  const dd = Number(deceleration_distance_ft);
  const hh = Number(worker_height_ft);
  const sf = Number(safety_margin_ft);
  const avail = Number(available_clearance_ft) || 0;
  if (!(ffd >= 0)) return { error: "Free-fall distance must be zero or greater (ft)." };
  if (!(dd >= 0)) return { error: "Deceleration distance must be zero or greater (ft)." };
  if (!(hh > 0)) return { error: "Worker height (D-ring to feet) must be positive (ft)." };
  if (!(sf >= 0)) return { error: "Safety margin must be zero or greater (ft)." };
  const required_clearance_ft = ffd + dd + hh + sf;
  const hasAvail = avail > 0;
  const margin_ft = hasAvail ? avail - required_clearance_ft : null;
  const adequate = hasAvail ? margin_ft >= 0 : null;
  return {
    required_clearance_ft, margin_ft, adequate,
    note: "Required fall clearance below the anchor for a personal fall-arrest system: RFC = free-fall distance + deceleration distance + worker height (harness D-ring to the feet) + a safety margin. Enter each explicitly - the free-fall distance depends on the anchor position relative to the D-ring (a foot-level anchor gives a large free fall, an overhead anchor a small one) and on the connector length; the deceleration distance is the energy absorber's stroke, which ANSI Z359.1 caps at 3.5 ft for a shock-absorbing lanyard (a self-retracting lifeline is much less); the worker height D-ring-to-feet is about 5 ft; and the safety margin (commonly 2-3 ft) keeps the feet off the lower level. If the available clearance below the anchor is less than RFC, the worker contacts the level before the system arrests the fall. A planning aid; the equipment manufacturer's instructions and a qualified/competent person govern per ANSI Z359 and OSHA 1926 Subpart M.",
  };
}
export const fallArrestClearanceExample = { inputs: { free_fall_distance_ft: 6, deceleration_distance_ft: 3.5, worker_height_ft: 5, safety_margin_ft: 3, available_clearance_ft: 0 } };

function renderFallArrestClearance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: the equipment manufacturer's instructions and a qualified / competent person govern all fall protection per ANSI Z359.1 and OSHA 1926 Subpart M; a planning aid. Citation: required fall clearance RFC = free-fall distance + deceleration distance + worker height (D-ring to feet) + safety margin. Deceleration distance is capped at 3.5 ft for a shock-absorbing lanyard (Z359); the free-fall distance depends on the anchor position and connector length.";
  _aeF(inputRegion, () => fillExample(fallArrestClearanceExample.inputs));
  const ffd = _mnF("Free-fall distance (ft)", "fac-ffd", { step: "any", min: "0", value: "6" });
  ffd.input.value = "6";
  const dd = _mnF("Deceleration distance (ft, <= 3.5 lanyard)", "fac-dd", { step: "any", min: "0", value: "3.5" });
  dd.input.value = "3.5";
  const hh = _mnF("Worker height, D-ring to feet (ft)", "fac-hh", { step: "any", min: "0", value: "5" });
  hh.input.value = "5";
  const sf = _mnF("Safety margin (ft)", "fac-sf", { step: "any", min: "0", value: "3" });
  sf.input.value = "3";
  const av = _mnF("Available clearance below anchor (ft, optional)", "fac-av", { step: "any", min: "0" });
  for (const f of [ffd, dd, hh, sf, av]) inputRegion.appendChild(f.wrap);
  const oR = _moF(outputRegion, "Required clearance below anchor", "fac-out-r");
  const oM = _moF(outputRegion, "Margin vs available", "fac-out-m");
  const oN = _moF(outputRegion, "Note", "fac-out-n");
  function fillExample(x) { ffd.input.value = x.free_fall_distance_ft; dd.input.value = x.deceleration_distance_ft; hh.input.value = x.worker_height_ft; sf.input.value = x.safety_margin_ft; av.input.value = ""; update(); }
  const update = _debF(() => {
    const r = computeFallArrestClearance({ free_fall_distance_ft: Number(ffd.input.value) || 0, deceleration_distance_ft: Number(dd.input.value) || 0, worker_height_ft: Number(hh.input.value) || 0, safety_margin_ft: Number(sf.input.value) || 0, available_clearance_ft: Number(av.input.value) || 0 });
    if (r.error) { oR.textContent = r.error; oM.textContent = "-"; oN.textContent = ""; return; }
    oR.textContent = _fmtF(r.required_clearance_ft, 1) + " ft";
    oM.textContent = r.margin_ft === null ? "enter available clearance to check" : _fmtF(r.margin_ft, 1) + " ft (" + (r.adequate ? "adequate" : "NOT adequate - shorten the connector, use an SRL, or move the anchor up") + ")";
    oN.textContent = r.note;
  }, _DF);
  for (const el of [ffd.input, dd.input, hh.input, sf.input, av.input]) el.addEventListener("input", update);
}

export const RESCUE_RENDERERS = {
  "fall-arrest-clearance": renderFallArrestClearance,
  "confined-space-purge": renderConfinedSpacePurge,
  "rope-ma": renderRopeMA,
  "sling-angle": renderSlingAngle,
  "search-track-spacing": renderSearchTrackSpacing,
  "sweat-rate-hydration": renderSweatRateHydration,
  "searcher-hours": renderSearcherHours,
  "sweep-width-correction": renderSweepWidthCorrection,
};
