// Group C (HVAC): duct velocity pressure + refrigerant line velocity (spec-v23).
//
// spec-v74 cap-relief split: the two spec-v23 velocity tiles
// (duct-velocity-pressure, refrigerant-velocity) were extracted verbatim from
// calc-hvac.js (which sat at 95.9% of its size cap -- the tightest remaining
// calc module) into this module. Both tiles KEEP group "C" -- a tile's group
// letter is independent of the module that holds it (the
// v28/v30/v36/v39/v42/v70/v71/v72/v73 precedent). Their ids, citations, worked
// examples, dimensional annotations, and behavior are byte-for-byte unchanged.
// Lazy-loaded on first open of one of its tiles, so it is not in the home-view
// first-paint payload.

import {
  DEBOUNCE_MS as _V23H_DEB, debounce as _v23h_debounce, fmt as _v23h_fmt,
  makeNumber as _v23h_makeNumber, makeSelect as _v23h_makeSelect,
  attachExampleButton as _v23h_attachEx, makeOutputLine as _v23h_makeOut,
  makeTextarea as _v23h_makeTextarea,
} from "./ui-fields.js";

export const VELOCITY_RENDERERS = {};

// --- C.1: Duct velocity pressure (V = 4005*sqrt(VP), sea-level std air) ---
// The 4005 constant assumes standard air density (0.075 lb/ft^3 at sea
// level, 70 F). At altitude or high temperature the density correction is
// not applied; the result is then a standard-air equivalent, flagged.
//
// dims: in { solve_for: dimensionless, vp_inwc: dimensionless, velocity_fpm: L T^-1 } out: { velocity_fpm: L T^-1, vp_inwc: dimensionless }
export function computeDuctVelocityPressure({ solve_for = "velocity", vp_inwc = 0, velocity_fpm = 0 } = {}) {
  const K = 4005;
  if (solve_for === "vp") {
    const v = Number(velocity_fpm) || 0;
    if (!(v > 0 && Number.isFinite(v))) return { error: "Air velocity must be positive (fpm)." };
    const vp = (v / K) ** 2;
    return { solve_for, velocity_fpm: v, vp_inwc: vp };
  }
  // solve_for velocity (default)
  const vp = Number(vp_inwc) || 0;
  if (!(vp > 0 && Number.isFinite(vp))) return { error: "Velocity pressure must be positive (in. w.c.)." };
  const v = K * Math.sqrt(vp);
  return { solve_for: "velocity", vp_inwc: vp, velocity_fpm: v };
}

export const ductVelocityPressureExample = { inputs: { solve_for: "velocity", vp_inwc: 0.25, velocity_fpm: 0 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderDuctVelocityPressure(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the ACCA Manual D / ASHRAE Fundamentals velocity-pressure relation V = 4005 x sqrt(VP) for standard air (0.075 lb/ft^3, sea level). At altitude or high temperature apply a density correction. Public duct-design relation.";
  const mode = _v23h_makeSelect("Solve for", "dvp-mode", [
    { value: "velocity", label: "Velocity from VP", selected: true },
    { value: "vp", label: "VP from velocity" },
  ]);
  const vp = _v23h_makeNumber("Velocity pressure (in. w.c.)", "dvp-vp", { step: "any", min: "0" });
  const vel = _v23h_makeNumber("Air velocity (fpm)", "dvp-vel", { step: "any", min: "0" });
  for (const f of [mode, vp, vel]) inputRegion.appendChild(f.wrap);
  _v23h_attachEx(inputRegion, () => { mode.select.value = "velocity"; vp.input.value = "0.25"; vel.input.value = ""; update(); });
  const oOut = _v23h_makeOut(outputRegion, "Result", "dvp-out");
  const oNote = _v23h_makeOut(outputRegion, "Note", "dvp-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = _v23h_debounce(() => {
    const r = computeDuctVelocityPressure({ solve_for: mode.select.value, vp_inwc: readNum(vp.input), velocity_fpm: readNum(vel.input) });
    if (r.error) { oOut.textContent = r.error; oNote.textContent = ""; return; }
    oOut.textContent = r.solve_for === "vp" ? _v23h_fmt(r.vp_inwc, 4) + " in. w.c." : _v23h_fmt(r.velocity_fpm, 0) + " fpm";
    oNote.textContent = "Standard-air constant (4005); apply a density correction at altitude or high temperature.";
  }, _V23H_DEB);
  for (const f of [mode.select, vp.input, vel.input]) f.addEventListener("input", update);
}
VELOCITY_RENDERERS["duct-velocity-pressure"] = renderDuctVelocityPressure;

// --- C.2: Refrigerant line velocity / oil return ---
// V_fpm = (mass_flow_lb_hr * specific_volume_ft3_lb) / area_ft2 / 60.
// Oil return needs a minimum velocity (higher in a suction riser); above
// ~4000 fpm the line is noisy. Specific volume is user-supplied at the line
// condition; manufacturer line-sizing tables govern.
//
// dims: in { mass_flow_lb_hr: M T^-1, line_id_in: L, specific_volume_ft3_lb: L^3 M^-1, orientation: dimensionless } out: { velocity_fpm: L T^-1 }
export function computeRefrigerantVelocity({ mass_flow_lb_hr = 0, line_id_in = 0, specific_volume_ft3_lb = 0, orientation = "horizontal" } = {}) {
  const m = Number(mass_flow_lb_hr) || 0;
  const d = Number(line_id_in) || 0;
  const sv = Number(specific_volume_ft3_lb) || 0;
  if (!(m > 0 && Number.isFinite(m))) return { error: "Mass flow must be positive (lb/hr)." };
  if (!(d > 0 && Number.isFinite(d))) return { error: "Line inside diameter must be positive (in)." };
  if (!(sv > 0 && Number.isFinite(sv))) return { error: "Specific volume must be positive (ft^3/lb)." };
  const area_ft2 = (Math.PI / 4) * (d / 12) ** 2;
  const q_ft3_hr = m * sv;
  const velocity_fpm = q_ft3_hr / area_ft2 / 60;
  const riser_min = 1500; // suction-riser oil-return minimum (fpm), advisory
  const horiz_min = 700;  // horizontal minimum (fpm), advisory
  const noise_max = 4000;
  const min = orientation === "riser" ? riser_min : horiz_min;
  let verdict = "within oil-return window";
  if (velocity_fpm < min) verdict = "below oil-return minimum (risk of oil trapping)";
  else if (velocity_fpm > noise_max) verdict = "above ~4000 fpm (noise / erosion risk)";
  return { velocity_fpm, area_ft2, oil_return_min_fpm: min, verdict };
}

export const refrigerantVelocityExample = { inputs: { mass_flow_lb_hr: 600, line_id_in: 0.75, specific_volume_ft3_lb: 0.5, orientation: "riser" } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderRefrigerantVelocity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the ASHRAE Refrigeration Handbook line-sizing and oil-return guidance, by name. Refrigerant specific volume at the line condition is user-supplied. Estimate; manufacturer line-sizing tables govern.";
  const mf = _v23h_makeNumber("Mass flow (lb/hr)", "rv-mf", { step: "any", min: "0"});
  const id = _v23h_makeNumber("Line inside diameter (in)", "rv-id", { step: "any", min: "0"});
  const sv = _v23h_makeNumber("Specific volume (ft^3/lb)", "rv-sv", { step: "any", min: "0"});
  const orient = _v23h_makeSelect("Orientation", "rv-or", [
    { value: "horizontal", label: "Horizontal", selected: true },
    { value: "riser", label: "Suction riser (higher minimum)" },
  ]);
  for (const f of [mf, id, sv, orient]) inputRegion.appendChild(f.wrap);
  _v23h_attachEx(inputRegion, () => { mf.input.value = "600"; id.input.value = "0.75"; sv.input.value = "0.5"; orient.select.value = "riser"; update(); });
  const oV = _v23h_makeOut(outputRegion, "Velocity", "rv-out-v");
  const oVerdict = _v23h_makeOut(outputRegion, "Oil-return verdict", "rv-out-verdict");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = _v23h_debounce(() => {
    const r = computeRefrigerantVelocity({ mass_flow_lb_hr: readNum(mf.input), line_id_in: readNum(id.input), specific_volume_ft3_lb: readNum(sv.input), orientation: orient.select.value });
    if (r.error) { oV.textContent = r.error; oVerdict.textContent = ""; return; }
    oV.textContent = _v23h_fmt(r.velocity_fpm, 0) + " fpm";
    oVerdict.textContent = r.verdict + " (min ~ " + r.oil_return_min_fpm + " fpm)";
  }, _V23H_DEB);
  for (const f of [mf.input, id.input, sv.input, orient.select]) f.addEventListener("input", update);
}
VELOCITY_RENDERERS["refrigerant-velocity"] = renderRefrigerantVelocity;

// refrigerant-line-size: inverse of refrigerant-velocity. The forward tile
// gives the velocity from a line ID; oil return needs a MINIMUM velocity, so
// the design question is the largest line ID that still meets it. Solving
// V = (m sv) / area / 60 for the diameter: area = m sv / (60 V),
// d = 12 sqrt(4 area / pi).
// dims: in { mass_flow_lb_hr: M T^-1, specific_volume_ft3_lb: L^3 M^-1, target_velocity_fpm: L T^-1 } out: { line_id_in: L, area_ft2: L^2, q_ft3_hr: L^3 T^-1 }
export function computeRefrigerantLineSize({ mass_flow_lb_hr = 0, specific_volume_ft3_lb = 0, target_velocity_fpm = 1500 } = {}) {
  const m = Number(mass_flow_lb_hr) || 0;
  const sv = Number(specific_volume_ft3_lb) || 0;
  const v = Number(target_velocity_fpm) > 0 ? Number(target_velocity_fpm) : 1500;
  if (!(m > 0 && Number.isFinite(m))) return { error: "Mass flow must be positive (lb/hr)." };
  if (!(sv > 0 && Number.isFinite(sv))) return { error: "Specific volume must be positive (ft^3/lb)." };
  if (!(v > 0 && Number.isFinite(v))) return { error: "Target velocity must be positive (fpm)." };
  const q_ft3_hr = m * sv;
  const area_ft2 = q_ft3_hr / v / 60;
  const line_id_in = 12 * Math.sqrt(area_ft2 * 4 / Math.PI);
  return {
    line_id_in, area_ft2, q_ft3_hr, target_velocity_fpm: v,
    note: "The largest line inside diameter that still meets the target velocity: oil return needs a minimum velocity (about 1500 fpm in a suction riser, 700 fpm horizontal), so a line at or below this ID keeps the refrigerant moving fast enough to sweep oil back, while a larger line drops below the minimum and traps oil. A smaller line raises the velocity and the pressure drop. Specific volume is user-supplied at the line condition; the manufacturer's line-sizing tables govern.",
  };
}
export const refrigerantLineSizeExample = { inputs: { mass_flow_lb_hr: 600, specific_volume_ft3_lb: 0.5, target_velocity_fpm: 1500 } };
// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderRefrigerantLineSize(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the ASHRAE Refrigeration Handbook line-sizing and oil-return guidance, by name (the velocity relation solved for the line ID). Refrigerant specific volume at the line condition is user-supplied. Estimate; manufacturer line-sizing tables govern.";
  const mf = _v23h_makeNumber("Mass flow (lb/hr)", "rls-mf", { step: "any", min: "0"});
  const sv = _v23h_makeNumber("Specific volume (ft^3/lb)", "rls-sv", { step: "any", min: "0"});
  const orient = _v23h_makeSelect("Oil-return minimum", "rls-or", [
    { value: "1500", label: "Suction riser (~1500 fpm)", selected: true },
    { value: "700", label: "Horizontal (~700 fpm)" },
  ]);
  for (const f of [mf, sv, orient]) inputRegion.appendChild(f.wrap);
  _v23h_attachEx(inputRegion, () => { mf.input.value = "600"; sv.input.value = "0.5"; orient.select.value = "1500"; update(); });
  const oD = _v23h_makeOut(outputRegion, "Max line inside diameter", "rls-out-d");
  const oNote = _v23h_makeOut(outputRegion, "Note", "rls-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = _v23h_debounce(() => {
    const r = computeRefrigerantLineSize({ mass_flow_lb_hr: readNum(mf.input), specific_volume_ft3_lb: readNum(sv.input), target_velocity_fpm: Number(orient.select.value) });
    if (r.error) { oD.textContent = r.error; oNote.textContent = ""; return; }
    oD.textContent = _v23h_fmt(r.line_id_in, 3) + " in (at " + _v23h_fmt(r.target_velocity_fpm, 0) + " fpm)";
    oNote.textContent = r.note;
  }, _V23H_DEB);
  for (const f of [mf.input, sv.input, orient.select]) f.addEventListener("input", update);
}
VELOCITY_RENDERERS["refrigerant-line-size"] = renderRefrigerantLineSize;

// ===================== spec-v385: pitot traverse airflow (HVAC airflow field-methods trio) =====================

// dims: in { vp_avg_inwc: dimensionless, w_in: L, h_in: L } out: { v_fpm: L T^-1, area_ft2: L^2, cfm: L^3 T^-1 }
export function computePitotTraverseCfm({ vp_avg_inwc = 0, w_in = 0, h_in = 0 } = {}) {
  const vp = Number(vp_avg_inwc) || 0;
  const w = Number(w_in) || 0;
  const h = Number(h_in) || 0;
  if (!(vp > 0 && Number.isFinite(vp))) return { error: "Average velocity pressure must be positive (in. w.c.)." };
  if (!(w > 0 && Number.isFinite(w))) return { error: "Duct width must be positive (in)." };
  if (!(h > 0 && Number.isFinite(h))) return { error: "Duct height must be positive (in)." };
  const v_fpm = 4005 * Math.sqrt(vp);
  const area_ft2 = (w * h) / 144;
  const cfm = v_fpm * area_ft2;
  return { v_fpm, area_ft2, cfm };
}

export const pitotTraverseCfmExample = { inputs: { vp_avg_inwc: 0.15, w_in: 24, h_in: 12 } };

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderPitotTraverseCfm(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Pitot-tube traverse airflow (ASHRAE Fundamentals / AABC-NEBB field practice): velocity V = 4005 x sqrt(VP) for standard air (0.075 lb/ft^3, sea level) from a single traverse-average velocity pressure, then CFM = V x duct area. This takes one pre-averaged VP; the more exact method converts each point's VP to a velocity and averages the velocities (the pitot-traverse-average tile), which reads slightly lower because the square root is concave. Apply a density correction at altitude or high temperature. A field measurement, not a substitute for a calibrated flow station.";
  const vp = _v23h_makeNumber("Average velocity pressure (in. w.c.)", "ptc-vp", { step: "any", min: "0" });
  const w = _v23h_makeNumber("Duct width (in)", "ptc-w", { step: "any", min: "0" });
  const h = _v23h_makeNumber("Duct height (in)", "ptc-h", { step: "any", min: "0" });
  for (const f of [vp, w, h]) inputRegion.appendChild(f.wrap);
  _v23h_attachEx(inputRegion, () => { vp.input.value = "0.15"; w.input.value = "24"; h.input.value = "12"; update(); });
  const oVel = _v23h_makeOut(outputRegion, "Traverse velocity", "ptc-out-v");
  const oArea = _v23h_makeOut(outputRegion, "Duct area", "ptc-out-a");
  const oCfm = _v23h_makeOut(outputRegion, "Airflow", "ptc-out-cfm");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = _v23h_debounce(() => {
    const r = computePitotTraverseCfm({ vp_avg_inwc: readNum(vp.input), w_in: readNum(w.input), h_in: readNum(h.input) });
    if (r.error) { oVel.textContent = r.error; oArea.textContent = ""; oCfm.textContent = ""; return; }
    oVel.textContent = _v23h_fmt(r.v_fpm, 0) + " fpm";
    oArea.textContent = _v23h_fmt(r.area_ft2, 2) + " ft^2";
    oCfm.textContent = _v23h_fmt(r.cfm, 0) + " CFM";
  }, _V23H_DEB);
  for (const f of [vp.input, w.input, h.input]) f.addEventListener("input", update);
}
VELOCITY_RENDERERS["pitot-traverse-cfm"] = renderPitotTraverseCfm;

// ===================== spec-v1199: pitot traverse from raw point readings =====================
// The pitot-traverse-cfm tile takes ONE already-averaged velocity pressure and
// its own note flags the shortcut: averaging the velocity pressures first and
// taking a single square root reads high, because velocity (not velocity
// pressure) is what integrates to flow over the equal-area points. This tile
// takes the raw per-point VP readings, converts EACH to a velocity, and averages
// the velocities -- the method NEBB/AABC/ASHRAE actually require -- and shows how
// much the single-average-VP shortcut over-reads.
// dims: in { vp_readings: dimensionless, w_in: L, h_in: L } out: { v_avg_fpm: L T^-1, area_ft2: L^2, cfm: L^3 T^-1, v_vp_average_fpm: L T^-1, cfm_vp_average: L^3 T^-1, overread_pct: dimensionless, point_count: dimensionless }
export function computePitotTraverseAverage({ vp_readings, w_in = 0, h_in = 0 } = {}) {
  const w = Number(w_in) || 0;
  const h = Number(h_in) || 0;
  if (!Array.isArray(vp_readings) || vp_readings.length < 1) return { error: "Enter at least one traverse-point velocity pressure (in. w.c.)." };
  for (const vp of vp_readings) { if (!Number.isFinite(vp) || !(vp > 0)) return { error: "Every velocity-pressure reading must be positive (in. w.c.)." }; }
  if (!(w > 0 && Number.isFinite(w))) return { error: "Duct width must be positive (in)." };
  if (!(h > 0 && Number.isFinite(h))) return { error: "Duct height must be positive (in)." };
  const K = 4005; // standard-air velocity constant (0.075 lb/ft^3, sea level)
  const velocities = vp_readings.map((vp) => K * Math.sqrt(vp));
  const n = velocities.length;
  const v_avg_fpm = velocities.reduce((a, b) => a + b, 0) / n;
  const vp_mean = vp_readings.reduce((a, b) => a + b, 0) / n;
  const v_vp_average_fpm = K * Math.sqrt(vp_mean);
  const area_ft2 = (w * h) / 144;
  const cfm = v_avg_fpm * area_ft2;
  const cfm_vp_average = v_vp_average_fpm * area_ft2;
  const overread_pct = (v_vp_average_fpm / v_avg_fpm - 1) * 100;
  return {
    v_avg_fpm, area_ft2, cfm, v_vp_average_fpm, cfm_vp_average, overread_pct, point_count: n,
    note: "The correct pitot-traverse average converts each equal-area point's velocity pressure to a velocity (V = 4005 sqrt(VP) for standard air) and averages the VELOCITIES, because velocity is what integrates to flow across the duct; CFM = average velocity x duct area. Averaging the velocity pressures first and taking one square root (the pitot-traverse-cfm tile's single-input shortcut) always reads high, since the square root is concave -- here by " + overread_pct.toFixed(2) + " percent. Space the points on an equal-area or log-Tchebycheff traverse per NEBB/AABC/ASHRAE, use enough points, and apply a density correction at altitude or high temperature. A field measurement, not a substitute for a calibrated flow station.",
  };
}
export const pitotTraverseAverageExample = { inputs: { vp_readings: [0.09, 0.16, 0.25, 0.16], w_in: 24, h_in: 12 } };
// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderPitotTraverseAverage(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Pitot-tube traverse airflow averaged the correct way (ASHRAE Fundamentals / AABC / NEBB field practice, by name): convert each equal-area point's velocity pressure to a velocity V = 4005 x sqrt(VP) for standard air (0.075 lb/ft^3, sea level), average the velocities, then CFM = average velocity x duct area. Averaging the velocity pressures first reads high because the square root is concave. Apply a density correction at altitude or high temperature. A field measurement, not a substitute for a calibrated flow station.";
  const reads = _v23h_makeTextarea("Velocity pressure at each traverse point (in. w.c.), one per line", "pta-reads", { rows: "5" });
  reads.input.value = "0.09\n0.16\n0.25\n0.16";
  const w = _v23h_makeNumber("Duct width (in)", "pta-w", { step: "any", min: "0" });
  const h = _v23h_makeNumber("Duct height (in)", "pta-h", { step: "any", min: "0" });
  for (const f of [reads, w, h]) inputRegion.appendChild(f.wrap);
  _v23h_attachEx(inputRegion, () => { reads.input.value = "0.09\n0.16\n0.25\n0.16"; w.input.value = "24"; h.input.value = "12"; update(); });
  const oV = _v23h_makeOut(outputRegion, "Average velocity (velocity-averaged)", "pta-out-v");
  const oCfm = _v23h_makeOut(outputRegion, "Airflow", "pta-out-cfm");
  const oShortcut = _v23h_makeOut(outputRegion, "VP-average shortcut (over-reads)", "pta-out-short");
  const oNote = _v23h_makeOut(outputRegion, "Note", "pta-out-note");
  function parseNums(text) {
    const out = [];
    for (const raw of String(text).split("\n")) {
      const line = raw.trim(); if (!line) continue;
      const v = Number(line); if (!Number.isFinite(v)) return null; out.push(v);
    }
    return out;
  }
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = _v23h_debounce(() => {
    const list = parseNums(reads.input.value);
    if (list === null) { oV.textContent = "Each velocity pressure must be a finite number, one per line."; oCfm.textContent = "-"; oShortcut.textContent = "-"; oNote.textContent = ""; return; }
    const r = computePitotTraverseAverage({ vp_readings: list, w_in: readNum(w.input), h_in: readNum(h.input) });
    if (r.error) { oV.textContent = r.error; oCfm.textContent = "-"; oShortcut.textContent = "-"; oNote.textContent = ""; return; }
    oV.textContent = _v23h_fmt(r.v_avg_fpm, 0) + " fpm over " + r.point_count + " points (" + _v23h_fmt(r.area_ft2, 2) + " ft^2)";
    oCfm.textContent = _v23h_fmt(r.cfm, 0) + " CFM";
    oShortcut.textContent = _v23h_fmt(r.cfm_vp_average, 0) + " CFM (" + _v23h_fmt(r.overread_pct, 2) + " percent high)";
    oNote.textContent = r.note;
  }, _V23H_DEB);
  for (const f of [reads.input, w.input, h.input]) f.addEventListener("input", update);
}
VELOCITY_RENDERERS["pitot-traverse-average"] = renderPitotTraverseAverage;

// ===================== spec-v1267: differential-pressure flow meter (orifice / venturi / nozzle) =====================
// The dp-flow-signal-scaling tile linearizes the 4-20 mA loop but says the "primary element's discharge coefficient
// and beta ratio are already baked into the transmitter's calibrated range" -- it does NOT compute the physical flow.
// This adds the primary-element equation itself: Bernoulli across a restriction gives the volumetric flow of an
// (incompressible) liquid, Q = Cd A2 sqrt( 2 dP / (rho (1 - beta^4)) ), with A2 the throat area, beta = d/D the
// diameter ratio (the 1 - beta^4 term is the velocity-of-approach correction). Cd ~ 0.61 square-edge orifice,
// ~0.98 venturi, ~0.97 flow nozzle (editable). Liquid only (an expansion factor Y is separate for gases).
// dims: in { pipe_id_in: L, bore_in: L, dp_psi: M L^-1 T^-2, cd: dimensionless, fluid_density_lb_ft3: M L^-3 } out: { flow_gpm: L^3 T^-1, throat_velocity_fps: L T^-1, pipe_velocity_fps: L T^-1, beta_ratio: dimensionless }
export function computeDpFlowMeter({ pipe_id_in = 0, bore_in = 0, dp_psi = 0, cd = 0.61, fluid_density_lb_ft3 = 62.4 } = {}) {
  const D = Number(pipe_id_in), d = Number(bore_in), dp = Number(dp_psi), Cd = Number(cd), rhoUS = Number(fluid_density_lb_ft3);
  if (![D, d, dp, Cd, rhoUS].every(Number.isFinite)) return { error: "All inputs must be finite numbers." };
  if (!(D > 0)) return { error: "Pipe inside diameter must be positive (in)." };
  if (!(d > 0)) return { error: "Bore / throat diameter must be positive (in)." };
  if (!(d < D)) return { error: "The bore diameter must be smaller than the pipe inside diameter." };
  if (!(dp > 0)) return { error: "Differential pressure must be positive (psi)." };
  if (!(Cd > 0) || Cd > 1.2) return { error: "Discharge coefficient must be between 0 and 1.2 (orifice ~0.61, venturi ~0.98)." };
  if (!(rhoUS > 0)) return { error: "Fluid density must be positive (lb/ft^3)." };
  const D_m = D * 0.0254, d_m = d * 0.0254;
  const A2 = Math.PI / 4 * d_m * d_m; // throat area, m^2
  const Apipe = Math.PI / 4 * D_m * D_m; // pipe area, m^2
  const beta = d / D;
  const dp_pa = dp * 6894.757293168361;
  const rho = rhoUS * 16.018463; // kg/m^3
  const q_m3s = Cd * A2 * Math.sqrt(2 * dp_pa / (rho * (1 - Math.pow(beta, 4))));
  const flow_gpm = q_m3s * 15850.323;
  const throat_velocity_fps = (q_m3s / A2) * 3.2808399;
  const pipe_velocity_fps = (q_m3s / Apipe) * 3.2808399;
  if (![flow_gpm, throat_velocity_fps, pipe_velocity_fps, beta].every(Number.isFinite)) return { error: "DP-flow math is not a finite value." };
  return {
    flow_gpm, throat_velocity_fps, pipe_velocity_fps, beta_ratio: beta,
    note: "The liquid flow through an orifice plate, venturi, or flow nozzle from the differential pressure across it, the physical primary-element equation the DP-loop scaling tile leaves to the transmitter's calibration: Q = Cd A2 sqrt( 2 dP / (rho (1 - beta^4)) ). The restriction speeds the fluid up and drops its pressure; measuring that drop backs out the flow, which is why flow tracks the SQUARE ROOT of dP (four times the flow reads as sixteen times the dP). beta = bore / pipe ID sets the range and the permanent pressure loss; the 1 - beta^4 term corrects for the velocity the fluid already has approaching the plate. The discharge coefficient Cd accounts for the vena contracta and friction: about 0.61 for a square-edge orifice, 0.98 for a classical venturi, 0.97 for a flow nozzle -- a venturi passes far more flow at the same dP and recovers most of the pressure. Enter dP in psi (1 psi = 27.7 in w.c.) and the fluid density (water 62.4 lb/ft^3). This is the incompressible-liquid form; a gas needs a separate expansion factor Y, and a precise Cd comes from ISO 5167 / the meter's calibration. A field/sizing estimate; the calibrated meter governs.",
  };
}
export const dpFlowMeterExample = { inputs: { pipe_id_in: 4, bore_in: 2, dp_psi: 1, cd: 0.61, fluid_density_lb_ft3: 62.4 } };
// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderDpFlowMeter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: differential-pressure flow meter (orifice / venturi / nozzle), Bernoulli primary-element equation Q = Cd A2 sqrt(2 dP / (rho (1 - beta^4))), beta = d/D, by name (ISO 5167 defines the precise Cd; the equation is public physics). Cd ~ 0.61 orifice, 0.98 venturi, 0.97 nozzle. Incompressible liquid only (a gas needs an expansion factor Y). The calibrated meter governs.";
  const D = _v23h_makeNumber("Pipe inside diameter (in)", "dpf-D", { step: "any", min: "0" });
  const d = _v23h_makeNumber("Bore / throat diameter (in)", "dpf-d", { step: "any", min: "0" });
  const dp = _v23h_makeNumber("Differential pressure (psi)", "dpf-dp", { step: "any", min: "0" });
  const cd = _v23h_makeNumber("Discharge coefficient Cd (orifice 0.61, venturi 0.98)", "dpf-cd", { step: "any", min: "0" }); cd.input.value = "0.61";
  const rho = _v23h_makeNumber("Fluid density (lb/ft3, water 62.4)", "dpf-rho", { step: "any", min: "0" }); rho.input.value = "62.4";
  for (const f of [D, d, dp, cd, rho]) inputRegion.appendChild(f.wrap);
  const oQ = _v23h_makeOut(outputRegion, "Flow rate", "dpf-out-q");
  const oV = _v23h_makeOut(outputRegion, "Throat / pipe velocity", "dpf-out-v");
  const oB = _v23h_makeOut(outputRegion, "Beta ratio (d/D)", "dpf-out-b");
  const oNote = _v23h_makeOut(outputRegion, "Note", "dpf-out-n");
  function readNum(i) { if (i.value === "") return NaN; const n = Number(i.value); return Number.isFinite(n) ? n : NaN; }
  const update = _v23h_debounce(() => {
    const r = computeDpFlowMeter({ pipe_id_in: readNum(D.input), bore_in: readNum(d.input), dp_psi: readNum(dp.input), cd: readNum(cd.input), fluid_density_lb_ft3: readNum(rho.input) });
    if (r.error) { oQ.textContent = r.error; oV.textContent = "-"; oB.textContent = "-"; oNote.textContent = ""; return; }
    oQ.textContent = _v23h_fmt(r.flow_gpm, 1) + " gpm";
    oV.textContent = _v23h_fmt(r.throat_velocity_fps, 2) + " / " + _v23h_fmt(r.pipe_velocity_fps, 2) + " ft/s";
    oB.textContent = _v23h_fmt(r.beta_ratio, 3);
    oNote.textContent = r.note;
  }, _V23H_DEB);
  _v23h_attachEx(inputRegion, () => { D.input.value = "4"; d.input.value = "2"; dp.input.value = "1"; cd.input.value = "0.61"; rho.input.value = "62.4"; update(); });
  for (const f of [D, d, dp, cd, rho]) f.input.addEventListener("input", update);
}
VELOCITY_RENDERERS["dp-flow-meter"] = renderDpFlowMeter;

// spec-v1274: gas (compressible) differential-pressure flow meter. The dp-flow-meter tile does the
// incompressible LIQUID case and its own note says "a gas needs a separate expansion factor Y"; this adds it.
// ISO 5167-2 orifice plate: the expansibility (expansion) factor
//   eps = 1 - (0.351 + 0.256 beta^4 + 0.93 beta^8)(1 - (p2/p1)^(1/kappa))
// corrects the incompressible form for the gas density dropping across the restriction, and the mass flow is
//   qm = (Cd / sqrt(1 - beta^4)) eps (pi/4) d^2 sqrt(2 gc dP rho1)
// with rho1 the upstream density from the ideal-gas law rho = p1 MW / (R Tabs). Reported as mass, actual (acfm),
// and standard (scfm) flow. Valid for p2/p1 >= 0.75 (the tile flags below that).
// dims: in { pipe_id_in: L, bore_in: L, p1_psia: M L^-1 T^-2, dp_psi: M L^-1 T^-2, temp_f: dimensionless, gas_sg: dimensionless, kappa: dimensionless, cd: dimensionless } out: { expansion_factor: dimensionless, mass_flow_lb_min: M T^-1, scfm: L^3 T^-1, acfm: L^3 T^-1, beta_ratio: dimensionless }
export function computeGasDpFlowMeter({ pipe_id_in = 0, bore_in = 0, p1_psia = 0, dp_psi = 0, temp_f = 60, gas_sg = 1.0, kappa = 1.4, cd = 0.61 } = {}) {
  const D = Number(pipe_id_in), d = Number(bore_in), p1 = Number(p1_psia), dp = Number(dp_psi), tF = Number(temp_f), sg = Number(gas_sg), k = Number(kappa), Cd = Number(cd);
  if (![D, d, p1, dp, tF, sg, k, Cd].every(Number.isFinite)) return { error: "All inputs must be finite numbers." };
  if (!(D > 0)) return { error: "Pipe inside diameter must be positive (in)." };
  if (!(d > 0)) return { error: "Bore / throat diameter must be positive (in)." };
  if (!(d < D)) return { error: "The bore diameter must be smaller than the pipe inside diameter." };
  if (!(p1 > 0)) return { error: "Upstream static pressure must be positive (psia, absolute = psig + 14.7)." };
  if (!(dp > 0)) return { error: "Differential pressure must be positive (psi; 1 psi = 27.68 in w.c.)." };
  if (!(dp < p1)) return { error: "The differential pressure must be less than the upstream absolute pressure." };
  if (!(tF > -459.67)) return { error: "Temperature must be above absolute zero (F)." };
  if (!(sg > 0)) return { error: "Gas specific gravity (relative to air) must be positive." };
  if (!(k > 1)) return { error: "Isentropic exponent (ratio of specific heats) must be greater than 1 (air ~1.4, natural gas ~1.3)." };
  if (!(Cd > 0) || Cd > 1.2) return { error: "Discharge coefficient must be between 0 and 1.2 (orifice ~0.61, venturi ~0.98)." };
  const beta = d / D;
  const b4 = Math.pow(beta, 4), b8 = Math.pow(beta, 8);
  const p2 = p1 - dp;
  const tau = p2 / p1;
  const expansion_factor = 1 - (0.351 + 0.256 * b4 + 0.93 * b8) * (1 - Math.pow(tau, 1 / k));
  const MW = 28.9647 * sg;               // molecular weight, lb/lbmol
  const tR = tF + 459.67;                // absolute temperature, deg R
  const R = 10.7316;                     // psia ft^3 / (lbmol deg R)
  const rho1 = p1 * MW / (R * tR);       // upstream density, lb/ft^3
  const rhoStd = 14.696 * MW / (R * 519.67); // standard density at 14.696 psia, 60 F
  const A = Math.PI / 4 * Math.pow(d / 12, 2); // bore area, ft^2
  const gc = 32.174;                     // lbm ft / (lbf s^2)
  const dp_psf = dp * 144;
  const qm = (Cd / Math.sqrt(1 - b4)) * expansion_factor * A * Math.sqrt(2 * gc * dp_psf * rho1); // lbm/s
  const mass_flow_lb_min = qm * 60;
  const acfm = qm / rho1 * 60;
  const scfm = qm / rhoStd * 60;
  if (![expansion_factor, mass_flow_lb_min, scfm, acfm, rho1, beta].every(Number.isFinite)) return { error: "Gas DP-flow math is not a finite value." };
  const lowRatio = tau < 0.75;
  return {
    expansion_factor, mass_flow_lb_min, scfm, acfm, upstream_density_lb_ft3: rho1, pressure_ratio: tau, beta_ratio: beta, low_pressure_ratio: lowRatio,
    note: "The compressible-GAS flow through an orifice plate from the differential pressure across it -- the case the dp-flow-meter tile (liquid only) names as separate. A gas expands and thins as it drops through the restriction, so the incompressible equation is multiplied by the ISO 5167 expansibility factor eps = 1 - (0.351 + 0.256 beta^4 + 0.93 beta^8)(1 - (p2/p1)^(1/kappa)), which falls below 1 as the pressure ratio drops (a bigger dp relative to line pressure = more expansion). The mass flow is qm = (Cd / sqrt(1 - beta^4)) eps (pi/4) d^2 sqrt(2 gc dP rho1), with the upstream density rho1 from the ideal-gas law (rho = p1 MW / (R T), MW = 28.97 x specific gravity). Air (SG 1, kappa 1.4) in a 2 in orifice in a 4 in line at 100 psia and 60 F with 1 psi dP reads eps 0.997 and about 748 scfm; raise the dP to 10 psi and eps falls to 0.973. Enter the UPSTREAM ABSOLUTE pressure (psia = psig + 14.7) and dP in psi (1 psi = 27.68 in w.c.); kappa is about 1.4 for air and diatomic gases, 1.3 for natural gas, 1.13 for propane. Results are the mass flow, the actual (acfm) and standard (scfm, at 14.696 psia and 60 F) volumetric flow. The eps correlation is for orifice plates and holds for p2/p1 >= 0.75 (the tile flags below that); a precise Cd and the venturi/nozzle expansion form come from ISO 5167 and the meter's calibration. A field/sizing estimate; the calibrated meter governs.",
  };
}
export const gasDpFlowMeterExample = { inputs: { pipe_id_in: 4, bore_in: 2, p1_psia: 100, dp_psi: 1, temp_f: 60, gas_sg: 1.0, kappa: 1.4, cd: 0.61 } };
// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderGasDpFlowMeter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: gas (compressible) differential-pressure flow meter (orifice), ISO 5167-2 expansibility factor eps = 1 - (0.351 + 0.256 beta^4 + 0.93 beta^8)(1 - (p2/p1)^(1/kappa)) and qm = (Cd/sqrt(1-beta^4)) eps A sqrt(2 gc dP rho1), by name; rho1 from the ideal-gas law. Enter upstream ABSOLUTE pressure (psia). Valid for p2/p1 >= 0.75; the calibrated meter governs.";
  const D = _v23h_makeNumber("Pipe inside diameter (in)", "gdpf-D", { step: "any", min: "0" });
  const d = _v23h_makeNumber("Bore / throat diameter (in)", "gdpf-d", { step: "any", min: "0" });
  const p1 = _v23h_makeNumber("Upstream static pressure (psia, absolute = psig + 14.7)", "gdpf-p1", { step: "any", min: "0" });
  const dp = _v23h_makeNumber("Differential pressure (psi; 1 psi = 27.68 in w.c.)", "gdpf-dp", { step: "any", min: "0" });
  const tF = _v23h_makeNumber("Upstream temperature (F)", "gdpf-t", { step: "any" });
  const sg = _v23h_makeNumber("Gas specific gravity (air 1.0, nat gas ~0.6)", "gdpf-sg", { step: "any", min: "0" }); sg.input.value = "1.0";
  const kap = _v23h_makeNumber("Isentropic exponent kappa (air 1.4, nat gas 1.3)", "gdpf-k", { step: "any", min: "0" }); kap.input.value = "1.4";
  const cd = _v23h_makeNumber("Discharge coefficient Cd (orifice 0.61)", "gdpf-cd", { step: "any", min: "0" }); cd.input.value = "0.61";
  for (const f of [D, d, p1, dp, tF, sg, kap, cd]) inputRegion.appendChild(f.wrap);
  const oE = _v23h_makeOut(outputRegion, "Expansion factor Y (eps)", "gdpf-out-e");
  const oS = _v23h_makeOut(outputRegion, "Standard flow", "gdpf-out-s");
  const oM = _v23h_makeOut(outputRegion, "Mass / actual flow", "gdpf-out-m");
  const oB = _v23h_makeOut(outputRegion, "Beta ratio / pressure ratio", "gdpf-out-b");
  const oNote = _v23h_makeOut(outputRegion, "Note", "gdpf-out-n");
  function readNum(i) { if (i.value === "") return NaN; const n = Number(i.value); return Number.isFinite(n) ? n : NaN; }
  const update = _v23h_debounce(() => {
    const r = computeGasDpFlowMeter({ pipe_id_in: readNum(D.input), bore_in: readNum(d.input), p1_psia: readNum(p1.input), dp_psi: readNum(dp.input), temp_f: readNum(tF.input), gas_sg: readNum(sg.input), kappa: readNum(kap.input), cd: readNum(cd.input) });
    if (r.error) { oE.textContent = r.error; oS.textContent = "-"; oM.textContent = "-"; oB.textContent = "-"; oNote.textContent = ""; return; }
    oE.textContent = _v23h_fmt(r.expansion_factor, 4);
    oS.textContent = _v23h_fmt(r.scfm, 1) + " scfm";
    oM.textContent = _v23h_fmt(r.mass_flow_lb_min, 2) + " lb/min / " + _v23h_fmt(r.acfm, 1) + " acfm";
    oB.textContent = _v23h_fmt(r.beta_ratio, 3) + " / " + _v23h_fmt(r.pressure_ratio, 3) + (r.low_pressure_ratio ? " (below 0.75: eps out of range)" : "");
    oNote.textContent = r.note;
  }, _V23H_DEB);
  _v23h_attachEx(inputRegion, () => { D.input.value = "4"; d.input.value = "2"; p1.input.value = "100"; dp.input.value = "1"; tF.input.value = "60"; sg.input.value = "1.0"; kap.input.value = "1.4"; cd.input.value = "0.61"; update(); });
  for (const f of [D, d, p1, dp, tF, sg, kap, cd]) f.input.addEventListener("input", update);
}
VELOCITY_RENDERERS["gas-dp-flow-meter"] = renderGasDpFlowMeter;

// ===================== spec-v1280: orifice permanent (unrecovered) pressure loss (ISO 5167) =====================
// The dp-flow-meter tiles compute the FLOW from the differential pressure but not the PERMANENT pressure loss --
// the dp-flow-meter note only remarks that "a venturi ... recovers most of the pressure." The differential dP
// measured across the taps is largely recovered downstream as the jet re-expands; what is NOT recovered is the
// permanent head loss the pump or fan must make up. ISO 5167-1/2 gives the square-edge orifice loss as a fraction
// of the measured dP:  dW/dP = (sqrt(1 - beta^4 (1 - Cd^2)) - Cd beta^2) / (sqrt(1 - beta^4 (1 - Cd^2)) + Cd beta^2).
// A smaller bore (lower beta) meters a wider range but wastes far more pressure. Orifice plates only -- a classical
// venturi recovers most of the dP (its loss is a separate, much smaller diffuser calculation).
// dims: in { pipe_id_in: L, bore_in: L, dp_psi: M L^-1 T^-2, cd: dimensionless } out: { beta_ratio: dimensionless, loss_fraction: dimensionless, permanent_loss_psi: M L^-1 T^-2, permanent_loss_inwc: M L^-1 T^-2, recovered_psi: M L^-1 T^-2 }
export function computeOrificePressureLoss({ pipe_id_in = 0, bore_in = 0, dp_psi = 0, cd = 0.61 } = {}) {
  const D = Number(pipe_id_in), d = Number(bore_in), dp = Number(dp_psi), Cd = Number(cd);
  if (![D, d, dp, Cd].every(Number.isFinite)) return { error: "All inputs must be finite numbers." };
  if (!(D > 0)) return { error: "Pipe inside diameter must be positive (in)." };
  if (!(d > 0)) return { error: "Bore / orifice diameter must be positive (in)." };
  if (!(d < D)) return { error: "The bore diameter must be smaller than the pipe inside diameter." };
  if (!(dp > 0)) return { error: "Differential pressure must be positive (psi)." };
  if (!(Cd > 0) || Cd > 1.0) return { error: "Orifice discharge coefficient must be between 0 and 1.0 (square-edge orifice ~0.61)." };
  const beta = d / D;
  const b4 = Math.pow(beta, 4);
  const root = Math.sqrt(1 - b4 * (1 - Cd * Cd));
  const cb2 = Cd * beta * beta;
  const loss_fraction = (root - cb2) / (root + cb2);
  const permanent_loss_psi = loss_fraction * dp;
  const permanent_loss_inwc = permanent_loss_psi * 27.68;
  const recovered_psi = dp - permanent_loss_psi;
  if (![loss_fraction, permanent_loss_psi, permanent_loss_inwc, recovered_psi, beta].every(Number.isFinite)) return { error: "Orifice pressure-loss math is not a finite value." };
  return {
    beta_ratio: beta, loss_fraction, permanent_loss_psi, permanent_loss_inwc, recovered_psi, recovered_fraction: 1 - loss_fraction,
    note: "The PERMANENT (unrecovered) pressure loss across a square-edge orifice plate -- the head the pump or fan actually pays, which the dp-flow-meter tiles (flow only) leave out. The differential pressure measured across the taps is mostly recovered downstream as the jet re-expands; only a fraction stays lost. ISO 5167-1/2 gives that fraction as dW/dP = (sqrt(1 - beta^4 (1 - Cd^2)) - Cd beta^2) / (sqrt(1 - beta^4 (1 - Cd^2)) + Cd beta^2), where beta = bore / pipe ID and Cd is the orifice discharge coefficient (about 0.61). A 2 in orifice in a 4 in line (beta 0.5) loses about 73% of the differential; shrink the bore to 1.2 in (beta 0.3) and the loss climbs to 90%, while opening it to 2.8 in (beta 0.7) drops it to 51% -- so a small bore meters a wide flow range but wastes the most pressure, the central trade in sizing an orifice. Square-edge orifice plates only: a classical venturi recovers most of the differential (its permanent loss, roughly 10-20% of dP, comes from the divergent cone and is a separate calculation), and a flow nozzle sits between the two. 1 psi = 27.68 in w.c. A sizing estimate; the manufacturer's or ISO 5167 loss data governs.",
  };
}
export const orificePressureLossExample = { inputs: { pipe_id_in: 4, bore_in: 2, dp_psi: 1, cd: 0.61 } };
// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderOrificePressureLoss(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ISO 5167-1/2 permanent pressure loss for a square-edge orifice, dW/dP = (sqrt(1 - beta^4 (1 - Cd^2)) - Cd beta^2) / (sqrt(1 - beta^4 (1 - Cd^2)) + Cd beta^2), beta = d/D, by name. Orifice plates only (a venturi recovers most of the dP -- a separate calculation). 1 psi = 27.68 in w.c. The manufacturer's or ISO 5167 loss data governs.";
  const D = _v23h_makeNumber("Pipe inside diameter (in)", "opl-D", { step: "any", min: "0" });
  const d = _v23h_makeNumber("Bore / orifice diameter (in)", "opl-d", { step: "any", min: "0" });
  const dp = _v23h_makeNumber("Differential pressure across taps (psi)", "opl-dp", { step: "any", min: "0" });
  const cd = _v23h_makeNumber("Orifice discharge coefficient Cd (~0.61)", "opl-cd", { step: "any", min: "0" }); cd.input.value = "0.61";
  for (const f of [D, d, dp, cd]) inputRegion.appendChild(f.wrap);
  const oL = _v23h_makeOut(outputRegion, "Permanent pressure loss", "opl-out-l");
  const oF = _v23h_makeOut(outputRegion, "Loss fraction of dP", "opl-out-f");
  const oR = _v23h_makeOut(outputRegion, "Recovered downstream", "opl-out-r");
  const oB = _v23h_makeOut(outputRegion, "Beta ratio (d/D)", "opl-out-b");
  const oNote = _v23h_makeOut(outputRegion, "Note", "opl-out-n");
  function readNum(i) { if (i.value === "") return NaN; const n = Number(i.value); return Number.isFinite(n) ? n : NaN; }
  const update = _v23h_debounce(() => {
    const r = computeOrificePressureLoss({ pipe_id_in: readNum(D.input), bore_in: readNum(d.input), dp_psi: readNum(dp.input), cd: readNum(cd.input) });
    if (r.error) { oL.textContent = r.error; oF.textContent = "-"; oR.textContent = "-"; oB.textContent = "-"; oNote.textContent = ""; return; }
    oL.textContent = _v23h_fmt(r.permanent_loss_psi, 3) + " psi (" + _v23h_fmt(r.permanent_loss_inwc, 1) + " in w.c.)";
    oF.textContent = _v23h_fmt(r.loss_fraction * 100, 1) + "% lost";
    oR.textContent = _v23h_fmt(r.recovered_psi, 3) + " psi (" + _v23h_fmt(r.recovered_fraction * 100, 1) + "% recovered)";
    oB.textContent = _v23h_fmt(r.beta_ratio, 3);
    oNote.textContent = r.note;
  }, _V23H_DEB);
  _v23h_attachEx(inputRegion, () => { D.input.value = "4"; d.input.value = "2"; dp.input.value = "1"; cd.input.value = "0.61"; update(); });
  for (const f of [D, d, dp, cd]) f.input.addEventListener("input", update);
}
VELOCITY_RENDERERS["orifice-pressure-loss"] = renderOrificePressureLoss;
