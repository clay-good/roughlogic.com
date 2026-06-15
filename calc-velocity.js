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
  const vp = _v23h_makeNumber("Velocity pressure (in. w.c.)", "dvp-vp", { step: "any", min: "0", value: "0.25" });
  vp.input.value = "0.25";
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
  const mf = _v23h_makeNumber("Mass flow (lb/hr)", "rv-mf", { step: "any", min: "0", value: "600" });
  mf.input.value = "600";
  const id = _v23h_makeNumber("Line inside diameter (in)", "rv-id", { step: "any", min: "0", value: "0.75" });
  id.input.value = "0.75";
  const sv = _v23h_makeNumber("Specific volume (ft^3/lb)", "rv-sv", { step: "any", min: "0", value: "0.5" });
  sv.input.value = "0.5";
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
