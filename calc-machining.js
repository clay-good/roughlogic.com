// Group K: Machining - spindle speed / feed and drill-point geometry.
// spec-v76 cap-relief split: the cohesive machining bench (cutting-speed-rpm,
// drill-point-depth) relocated verbatim out of calc-mechanic.js (which had
// reached 95.6% of cap -- the tightest remaining calc module). Both tiles keep
// group: "K" (group letter independent of module, the v42/v70..v75 precedent).
// See spec-v31 K.4 and spec-v34 K.5.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
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

export const MACHINING_RENDERERS = {};

// --- v31 K.4: Machining speed and feed (`cutting-speed-rpm`) ---
// Spindle RPM = 12 * SFM / (pi * dia); feed IPM = RPM * flutes * chip load.
// dims: in { surface_speed_sfm: L*T^-1, diameter_in: L, num_flutes: dimensionless, chip_load_in: L } out: { rpm: T^-1, feed_ipm: L*T^-1 }
export function computeCuttingSpeed({ surface_speed_sfm = 0, diameter_in = 0, num_flutes = 0, chip_load_in = 0 } = {}) {
  const _g = _finiteGuard({ surface_speed_sfm, diameter_in, num_flutes, chip_load_in }); if (_g) return _g;
  const sfm = Number(surface_speed_sfm) || 0;
  const dia = Number(diameter_in) || 0;
  if (!(sfm > 0)) return { error: "Surface speed must be positive (SFM)." };
  if (!(dia > 0)) return { error: "Diameter must be positive (in)." };
  // Surface speed SFM = pi * dia(in) * RPM / 12, so RPM = 12 * SFM / (pi * dia).
  const rpm = (12 * sfm) / (Math.PI * dia);
  const flutes = Math.max(0, Math.floor(Number(num_flutes) || 0));
  const ipt = Number(chip_load_in) || 0;
  let feed_ipm = null;
  if (flutes > 0 && ipt > 0) feed_ipm = rpm * flutes * ipt;
  const notes = [];
  notes.push("RPM = 12 x SFM / (pi x diameter); the 12/pi = 3.8197 surface-feet-per-minute to RPM constant. For milling and drilling the diameter is the cutter or drill; for turning it is the workpiece.");
  if (feed_ipm === null) notes.push("Enter the number of flutes or teeth and the chip load per tooth to size the feed rate.");
  else notes.push("Feed = RPM x flutes x chip load per tooth.");
  notes.push("The recommended surface speed (SFM) and chip load per tooth come from the tool manufacturer's chart for the material and tool combination (user-supplied); the machine, setup, and rigidity govern the safe spindle speed.");
  return { surface_speed_sfm: sfm, diameter_in: dia, rpm, num_flutes: flutes, chip_load_in: ipt, feed_ipm, notes };
}
export const cuttingSpeedExample = { inputs: { surface_speed_sfm: 100, diameter_in: 0.5, num_flutes: 2, chip_load_in: 0.002 } };

function renderCuttingSpeed(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Machining spindle speed RPM = 12 x SFM / (pi x diameter) and feed rate IPM = RPM x flutes x chip load per tooth - first-principles cutting geometry (the speeds-and-feeds method as in Machinery's Handbook, Industrial Press, by name). The recommended surface speed (SFM) and chip load per tooth come from the tool / material chart (user-supplied); the machine, fixturing, and rigidity govern the safe spindle speed.";
  const sfm = makeNumber("Surface speed (SFM)", "csr-sfm", { step: "any", min: "0", value: "100" }); sfm.input.value = "100";
  const dia = makeNumber("Diameter (in: cutter for mill/drill, work for turning)", "csr-dia", { step: "any", min: "0", value: "0.5" }); dia.input.value = "0.5";
  const flutes = makeNumber("Flutes / teeth (optional, for feed)", "csr-flutes", { step: "1", min: "0" });
  const ipt = makeNumber("Chip load per tooth (in, optional)", "csr-ipt", { step: "any", min: "0" });
  for (const f of [sfm, dia, flutes, ipt]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sfm.input.value = "100"; dia.input.value = "0.5"; flutes.input.value = "2"; ipt.input.value = "0.002"; update(); });
  const oRpm = makeOutputLine(outputRegion, "Spindle speed", "csr-out-rpm");
  const oFeed = makeOutputLine(outputRegion, "Feed rate", "csr-out-feed");
  const oNote = makeOutputLine(outputRegion, "Notes", "csr-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeCuttingSpeed({ surface_speed_sfm: readNum(sfm.input), diameter_in: readNum(dia.input), num_flutes: readNum(flutes.input), chip_load_in: readNum(ipt.input) });
    if (r.error) { oRpm.textContent = r.error; oFeed.textContent = "-"; oNote.textContent = ""; return; }
    oRpm.textContent = fmt(r.rpm, 0) + " RPM";
    oFeed.textContent = r.feed_ipm === null ? "(enter flutes + chip load)" : fmt(r.feed_ipm, 3) + " in/min (IPM)";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [sfm.input, dia.input, flutes.input, ipt.input]) f.addEventListener("input", update);
}
MACHINING_RENDERERS["cutting-speed-rpm"] = renderCuttingSpeed;

// --- v34 K.5: Drill point depth / tip allowance (`drill-point-depth`) ---
// point length = (diameter/2) / tan(point angle / 2); a 118-deg point ~ 0.3*dia.
// dims: in { diameter_in: L, point_angle_deg: dimensionless, full_depth_in: L } out: { point_length_in: L, drill_to_depth_in: L }
export function computeDrillPointDepth({ diameter_in = 0, point_angle_deg = 118, full_depth_in = 0 } = {}) {
  const _g = _finiteGuard({ diameter_in, point_angle_deg, full_depth_in }); if (_g) return _g;
  const d = Number(diameter_in);
  const ang = Number(point_angle_deg);
  if (!(d > 0)) return { error: "Drill diameter must be positive (in)." };
  if (!(ang > 0 && ang < 180)) return { error: "Point angle must be between 0 and 180 degrees." };
  const half = ((ang / 2) * Math.PI) / 180;
  const point_length_in = (d / 2) / Math.tan(half);
  const fd = Number(full_depth_in) || 0;
  const drill_to_depth_in = fd > 0 ? fd + point_length_in : null;
  const notes = [];
  notes.push("Point length = (diameter / 2) / tan(point angle / 2); a 118-degree point is about 0.3 x diameter. The drill tip reaches this far past the full-diameter shoulder.");
  if (drill_to_depth_in === null) notes.push("Enter the desired full-diameter depth to get the tip (drill-to) depth.");
  else notes.push("To reach the full-diameter depth, advance the drill tip to the drill-to depth shown.");
  notes.push("Geometry only; web thinning, drift, and the machine depth stop govern the actual hole.");
  return { diameter_in: d, point_angle_deg: ang, point_length_in, full_depth_in: fd || null, drill_to_depth_in, notes };
}
export const drillPointDepthExample = { inputs: { diameter_in: 0.5, point_angle_deg: 118, full_depth_in: 1.0 } };

function renderDrillPointDepth(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Drill point depth (tip allowance) = (diameter / 2) / tan(point angle / 2) - first-principles drill-point geometry (the standard 118-degree / 135-degree drill-point relation as in Machinery's Handbook, by name). Geometry only; web thinning, drift, and the machine depth stop govern the actual hole.";
  const dia = makeNumber("Drill diameter (in)", "dpd-dia", { step: "any", min: "0", value: "0.5" }); dia.input.value = "0.5";
  const ang = makeNumber("Point angle (deg)", "dpd-ang", { step: "any", min: "0", value: "118" }); ang.input.value = "118";
  const depth = makeNumber("Desired full-diameter depth (in, optional)", "dpd-depth", { step: "any", min: "0" });
  for (const f of [dia, ang, depth]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dia.input.value = "0.5"; ang.input.value = "118"; depth.input.value = "1.0"; update(); });
  const oPoint = makeOutputLine(outputRegion, "Point length (tip allowance)", "dpd-out-point");
  const oDrill = makeOutputLine(outputRegion, "Drill-to (tip) depth", "dpd-out-drill");
  const oNote = makeOutputLine(outputRegion, "Notes", "dpd-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeDrillPointDepth({ diameter_in: readNum(dia.input), point_angle_deg: readNum(ang.input), full_depth_in: readNum(depth.input) });
    if (r.error) { oPoint.textContent = r.error; oDrill.textContent = "-"; oNote.textContent = ""; return; }
    oPoint.textContent = fmt(r.point_length_in, 4) + " in (about " + fmt(r.point_length_in / r.diameter_in, 2) + " x diameter)";
    oDrill.textContent = r.drill_to_depth_in === null ? "(enter a full-diameter depth)" : fmt(r.drill_to_depth_in, 4) + " in tip depth";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [dia.input, ang.input, depth.input]) f.addEventListener("input", update);
}
MACHINING_RENDERERS["drill-point-depth"] = renderDrillPointDepth;

// drill-point-angle-from-length: inverse of drill-point-depth. The forward tile
// gives the point length (tip allowance) from the diameter and point angle; the
// inverse recovers the included point angle from a measured or target point
// length -- the number you back out when you sharpen to a length or measure a
// tip on a comparator. From point_length = (d/2)/tan(angle/2),
// angle = 2 x atan( (d/2) / point_length ).
// dims: in { diameter_in: L, point_length_in: L } out: { point_angle_deg: dimensionless, half_angle_deg: dimensionless, length_per_diameter: dimensionless }
export function computeDrillPointAngleFromLength({ diameter_in = 0, point_length_in = 0 } = {}) {
  const _g = _finiteGuard({ diameter_in, point_length_in }); if (_g) return _g;
  const d = Number(diameter_in);
  const plen = Number(point_length_in);
  if (!(d > 0)) return { error: "Drill diameter must be positive (in)." };
  if (!(plen > 0)) return { error: "Point length must be positive (in)." };
  const half_rad = Math.atan((d / 2) / plen);
  const half_angle_deg = (half_rad * 180) / Math.PI;
  const point_angle_deg = 2 * half_angle_deg;
  const length_per_diameter = plen / d;
  if (![point_angle_deg, half_angle_deg, length_per_diameter].every(Number.isFinite)) return { error: "Point-angle math is not a finite value." };
  const notes = [];
  notes.push("Included point angle = 2 x atan( (diameter / 2) / point length ), the inverse of point length = (diameter / 2) / tan(point angle / 2). A shorter tip for a given diameter means a blunter (larger) angle; the standard 118-degree point runs about 0.3 x diameter.");
  if (point_angle_deg > 135.5) notes.push("Over ~135 degrees is a blunt, flat point (split-point / sheet-metal territory); confirm the grind.");
  else if (point_angle_deg < 90) notes.push("Under 90 degrees is a very steep point (soft/plastic materials); confirm the grind.");
  notes.push("Geometry only; web thinning, drift, and the actual grind govern the drilled hole.");
  return { diameter_in: d, point_length_in: plen, point_angle_deg, half_angle_deg, length_per_diameter, notes };
}
export const drillPointAngleFromLengthExample = { inputs: { diameter_in: 0.5, point_length_in: 0.15 } };

function renderDrillPointAngleFromLength(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Included point angle = 2 x atan( (diameter / 2) / point length ) - first-principles drill-point geometry (the standard 118-degree / 135-degree drill-point relation as in Machinery's Handbook, by name) solved for the angle. Geometry only; web thinning, drift, and the actual grind govern the drilled hole.";
  const dia = makeNumber("Drill diameter (in)", "dpa-dia", { step: "any", min: "0", value: "0.5" }); dia.input.value = "0.5";
  const plen = makeNumber("Point length / tip allowance (in)", "dpa-plen", { step: "any", min: "0", value: "0.15" }); plen.input.value = "0.15";
  for (const f of [dia, plen]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dia.input.value = "0.5"; plen.input.value = "0.15"; update(); });
  const oAngle = makeOutputLine(outputRegion, "Included point angle", "dpa-out-angle");
  const oHalf = makeOutputLine(outputRegion, "Half (lip) angle", "dpa-out-half");
  const oNote = makeOutputLine(outputRegion, "Notes", "dpa-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeDrillPointAngleFromLength({ diameter_in: readNum(dia.input), point_length_in: readNum(plen.input) });
    if (r.error) { oAngle.textContent = r.error; oHalf.textContent = "-"; oNote.textContent = ""; return; }
    oAngle.textContent = fmt(r.point_angle_deg, 1) + " deg (tip about " + fmt(r.length_per_diameter, 2) + " x diameter)";
    oHalf.textContent = fmt(r.half_angle_deg, 1) + " deg from the axis";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [dia.input, plen.input]) f.addEventListener("input", update);
}
MACHINING_RENDERERS["drill-point-angle-from-length"] = renderDrillPointAngleFromLength;

// cutting-diameter-for-rpm: inverse of cutting-speed-rpm. The forward tile gives the spindle RPM for a diameter at a
// surface speed; the inverse recovers the cutter or work diameter that runs at a target (or the machine's maximum)
// spindle RPM for a given surface speed. From RPM = 12 x SFM / (pi x diameter), diameter = 12 x SFM / (pi x RPM). At a
// fixed SFM a larger diameter turns slower, so a machine RPM ceiling sets the SMALLEST diameter that still reaches the
// full surface speed -- a smaller cutter tops out the spindle before it gets there.
// dims: in { surface_speed_sfm: L T^-1, target_rpm: T^-1 } out: { diameter_in: L, sfm_to_rpm_const: dimensionless }
export function computeCuttingDiameterForRpm({ surface_speed_sfm = 0, target_rpm = 0 } = {}) {
  const _g = _finiteGuard({ surface_speed_sfm, target_rpm }); if (_g) return _g;
  const sfm = Number(surface_speed_sfm) || 0;
  const rpm = Number(target_rpm) || 0;
  if (!(sfm > 0)) return { error: "Surface speed must be positive (SFM)." };
  if (!(rpm > 0)) return { error: "Spindle RPM must be positive." };
  const diameter_in = (12 * sfm) / (Math.PI * rpm);
  if (!Number.isFinite(diameter_in)) return { error: "Diameter math is not a finite value." };
  const notes = [];
  notes.push("Diameter = 12 x SFM / (pi x RPM), the inverse of RPM = 12 x SFM / (pi x diameter). At a fixed surface speed a larger diameter turns slower, so if the RPM is your machine's maximum this is the SMALLEST cutter (or work) that still reaches the full surface speed - a smaller diameter would top out the spindle before hitting the recommended SFM, so it runs under-speed. For milling and drilling the diameter is the cutter or drill; for turning it is the workpiece.");
  notes.push("The recommended surface speed (SFM) comes from the tool manufacturer's chart for the material and tool combination (user-supplied); the machine, setup, and rigidity govern the safe spindle speed.");
  return { surface_speed_sfm: sfm, target_rpm: rpm, diameter_in, sfm_to_rpm_const: 12 / Math.PI, notes };
}
export const cuttingDiameterForRpmExample = { inputs: { surface_speed_sfm: 100, target_rpm: 1000 } };

function renderCuttingDiameterForRpm(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Machining spindle speed RPM = 12 x SFM / (pi x diameter) - first-principles cutting geometry (the speeds-and-feeds method as in Machinery's Handbook, Industrial Press, by name) - solved for the diameter: diameter = 12 x SFM / (pi x RPM). The recommended surface speed (SFM) comes from the tool / material chart (user-supplied); the machine, fixturing, and rigidity govern the safe spindle speed.";
  const sfm = makeNumber("Surface speed (SFM)", "cdr-sfm", { step: "any", min: "0", value: "100" }); sfm.input.value = "100";
  const rpm = makeNumber("Spindle RPM (e.g. machine maximum)", "cdr-rpm", { step: "any", min: "0", value: "1000" }); rpm.input.value = "1000";
  for (const f of [sfm, rpm]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sfm.input.value = "100"; rpm.input.value = "1000"; update(); });
  const oDia = makeOutputLine(outputRegion, "Diameter at that RPM", "cdr-out-dia");
  const oNote = makeOutputLine(outputRegion, "Notes", "cdr-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeCuttingDiameterForRpm({ surface_speed_sfm: readNum(sfm.input), target_rpm: readNum(rpm.input) });
    if (r.error) { oDia.textContent = r.error; oNote.textContent = ""; return; }
    oDia.textContent = fmt(r.diameter_in, 4) + " in (" + fmt(r.diameter_in * 25.4, 2) + " mm)";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [sfm.input, rpm.input]) f.addEventListener("input", update);
}
MACHINING_RENDERERS["cutting-diameter-for-rpm"] = renderCuttingDiameterForRpm;

// =====================================================================
// spec-v100 K - cutting-fluid concentration and top-up (machine shop).
// Running concentration from a refractometer Brix reading and the
// coolant's factor, and the concentrate (or water) to bring a sump to a
// target. GOVERNANCE.general; concentration % = Brix x factor (off the
// data sheet); add as pre-mixed coolant in practice, never neat.
// (paint-mix-ratio lands in calc-mechanic.js.)
// =====================================================================

// dims: in { brix_reading: dimensionless, refractometer_factor: dimensionless, sump_volume_gal: L^3, target_pct: dimensionless } out: { current_pct: dimensionless, add_gal: L^3 }
export function computeCuttingFluidConcentration({ brix_reading = 0, refractometer_factor = 0, sump_volume_gal = 0, target_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (brix_reading < 0) return { error: "Brix reading must be non-negative." };
  if (!(refractometer_factor > 0)) return { error: "Refractometer factor must be positive." };
  if (!(sump_volume_gal > 0)) return { error: "Sump volume must be positive." };
  if (!(target_pct > 0 && target_pct < 100)) return { error: "Target must be between 0 and 100 percent." };
  const current_pct = brix_reading * refractometer_factor;
  let action = "none", add_gal = 0;
  if (current_pct < target_pct) { action = "add concentrate"; add_gal = sump_volume_gal * (target_pct - current_pct) / (100 - target_pct); }
  else if (current_pct > target_pct) { action = "add water"; add_gal = sump_volume_gal * (current_pct - target_pct) / target_pct; }
  return {
    current_pct, action, add_gal,
    note: "Read the concentration as the Brix times the coolant's refractometer factor (on the data sheet, usually between 1 and 4 - do not assume Brix is the concentration). Keep the sump in the maker's range, often about 6-10% for general machining - too lean invites rust and bacteria (and the sour smell), too rich leaves residue and can irritate skin. The concentrate figure here is the neat deficit, but in practice add it as pre-mixed coolant, never neat concentrate straight into the sump. Skim tramp oil and check the Brix at the same spot and temperature each time.",
  };
}
const cuttingFluidConcentrationExample = { inputs: { brix_reading: 3.0, refractometer_factor: 2.0, sump_volume_gal: 50, target_pct: 8 } };
function renderCuttingFluidConcentration(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Metalworking-fluid refractometer method (concentration % = Brix x factor; factor and range off the coolant data sheet, by name).";
  const brix = makeNumber("Refractometer Brix", "cfc-brix", { step: "any", min: "0" });
  const factor = makeNumber("Refractometer factor", "cfc-factor", { step: "any", min: "0" });
  const sump = makeNumber("Sump volume (gal)", "cfc-sump", { step: "any", min: "0" });
  const target = makeNumber("Target concentration (%)", "cfc-target", { step: "any", min: "0" });
  for (const f of [brix, factor, sump, target]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { brix.input.value = "3.0"; factor.input.value = "2.0"; sump.input.value = "50"; target.input.value = "8"; update(); });
  const oCur = makeOutputLine(outputRegion, "Current concentration", "cfc-out-cur");
  const oAct = makeOutputLine(outputRegion, "Action", "cfc-out-act");
  const oAdd = makeOutputLine(outputRegion, "Add", "cfc-out-add");
  const oNote = makeOutputLine(outputRegion, "Note", "cfc-out-note");
  const update = debounce(() => {
    const r = computeCuttingFluidConcentration({ brix_reading: Number(brix.input.value) || 0, refractometer_factor: Number(factor.input.value) || 0, sump_volume_gal: Number(sump.input.value) || 0, target_pct: Number(target.input.value) || 0 });
    if (r.error) { oCur.textContent = r.error; oAct.textContent = "-"; oAdd.textContent = "-"; oNote.textContent = ""; return; }
    oCur.textContent = fmt(r.current_pct, 2) + "%";
    oAct.textContent = r.action;
    oAdd.textContent = r.action === "none" ? "0 gal (at target)" : fmt(r.add_gal, 2) + " gal";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [brix.input, factor.input, sump.input, target.input]) f.addEventListener("input", update);
}
MACHINING_RENDERERS["cutting-fluid-concentration"] = renderCuttingFluidConcentration;

// --- spec-v135 K: Cutting Power and Spindle Torque from Material Removal Rate ---
// cutting_hp = MRR x unit_power; motor_hp = cutting_hp / efficiency;
// torque_lbft = 5252 x cutting_hp / rpm (the 5252 constant reused from v122).
// dims: in { mrr_in3_min: L^3 T^-1, unit_power_hp: dimensionless, efficiency_pct: dimensionless, rpm: T^-1 } out: { cutting_hp: M L^2 T^-3, motor_hp: M L^2 T^-3, spindle_torque_lbft: M L^2 T^-2 }
export function computeSpindlePowerTorque({ mrr_in3_min = 0, unit_power_hp = 1.0, efficiency_pct = 80, rpm = 0 } = {}) {
  const _g = _finiteGuard({ mrr_in3_min, unit_power_hp, efficiency_pct, rpm }); if (_g) return _g;
  const mrr = Number(mrr_in3_min);
  const unitPower = Number(unit_power_hp);
  const eff = Number(efficiency_pct);
  const rpmVal = Number(rpm);
  if (!(mrr > 0)) return { error: "Material removal rate must be positive (in3/min)." };
  if (!(unitPower > 0)) return { error: "Unit power must be positive (hp per in3/min)." };
  if (!(eff > 0 && eff <= 100)) return { error: "Efficiency must be in (0, 100] percent." };
  if (!(rpmVal > 0)) return { error: "Spindle speed must be positive (rpm)." };
  const cuttingHp = mrr * unitPower;
  const motorHp = cuttingHp / (eff / 100);
  const spindleTorque = 5252 * cuttingHp / rpmVal;
  return {
    cutting_hp: cuttingHp,
    motor_hp: motorHp,
    spindle_torque_lbft: spindleTorque,
    note: "Specific cutting energy turns removal rate into power: cutting hp = MRR x unit power (about 1.0 hp per in3/min for carbon steel, 0.33 aluminum, 1.5 stainless/titanium); motor hp = cutting hp / drive efficiency; spindle torque = 5252 x cutting hp / rpm. The unit-power values are Machinery's Handbook tabular references; the tool, sharpness, and machine govern the real draw -- this is the check before committing a heavy cut.",
  };
}
export const spindlePowerTorqueExample = { inputs: { mrr_in3_min: 3.0, unit_power_hp: 1.0, efficiency_pct: 80, rpm: 800 } };

function renderSpindlePowerTorque(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles specific-cutting-energy relation with Machinery's Handbook unit-power values (tabular reference), by name. Cutting hp = MRR x unit power; motor hp = cutting hp / efficiency; torque = 5252 x cutting hp / rpm. The tool, sharpness, and machine govern the real cut.";
  const mrr = makeNumber("Material removal rate (in3/min)", "spt-mrr", { step: "any", min: "0" });
  const unitPower = makeNumber("Unit power (hp per in3/min)", "spt-up", { step: "any", min: "0", value: "1.0" });
  unitPower.input.value = "1.0";
  const eff = makeNumber("Spindle drive efficiency (%)", "spt-eff", { step: "any", min: "0", value: "80" });
  eff.input.value = "80";
  const rpm = makeNumber("Spindle speed (rpm)", "spt-rpm", { step: "any", min: "0" });
  for (const f of [mrr, unitPower, eff, rpm]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mrr.input.value = "3.0"; unitPower.input.value = "1.0"; eff.input.value = "80"; rpm.input.value = "800"; update(); });
  const oCut = makeOutputLine(outputRegion, "Cutting horsepower", "spt-out-cut");
  const oMotor = makeOutputLine(outputRegion, "Motor horsepower needed", "spt-out-motor");
  const oTorque = makeOutputLine(outputRegion, "Spindle torque", "spt-out-torque");
  const update = debounce(() => {
    const r = computeSpindlePowerTorque({
      mrr_in3_min: Number(mrr.input.value) || 0,
      unit_power_hp: unitPower.input.value === "" ? 1.0 : Number(unitPower.input.value),
      efficiency_pct: eff.input.value === "" ? 80 : Number(eff.input.value),
      rpm: Number(rpm.input.value) || 0,
    });
    if (r.error) { oCut.textContent = r.error; for (const o of [oMotor, oTorque]) o.textContent = "-"; return; }
    oCut.textContent = fmt(r.cutting_hp, 2) + " hp";
    oMotor.textContent = fmt(r.motor_hp, 2) + " hp";
    oTorque.textContent = fmt(r.spindle_torque_lbft, 1) + " lb-ft";
  }, DEBOUNCE_MS);
  for (const f of [mrr, unitPower, eff, rpm]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["spindle-power-torque"] = renderSpindlePowerTorque;

// --- spec-v711 K: Max Material Removal Rate from Available Spindle Power (inverse) ---
// The inverse of spindle-power-torque: the forward tile gives the motor hp a cut
// needs; given the motor you have, the power-limited max removal rate is
// max_MRR = motor_hp x (efficiency/100) / unit_power.
// dims: in { available_motor_hp: M L^2 T^-3, unit_power_hp: dimensionless, efficiency_pct: dimensionless } out: { max_mrr_in3_min: L^3 T^-1, cutting_hp: M L^2 T^-3 }
export function computeSpindleMaxMrr({ available_motor_hp = 0, unit_power_hp = 1.0, efficiency_pct = 80 } = {}) {
  const _g = _finiteGuard({ available_motor_hp, unit_power_hp, efficiency_pct }); if (_g) return _g;
  const motor = Number(available_motor_hp);
  const unitPower = Number(unit_power_hp);
  const eff = Number(efficiency_pct);
  if (!(motor > 0)) return { error: "Available motor horsepower must be positive (hp)." };
  if (!(unitPower > 0)) return { error: "Unit power must be positive (hp per in3/min)." };
  if (!(eff > 0 && eff <= 100)) return { error: "Efficiency must be in (0, 100] percent." };
  const cutting_hp = motor * (eff / 100);
  const max_mrr_in3_min = cutting_hp / unitPower;
  return {
    max_mrr_in3_min, cutting_hp,
    note: "Specific cutting energy solved for the removal rate: the spindle can only deliver cutting hp = motor hp x drive efficiency, and each in3/min of stock costs the unit power (about 1.0 hp per in3/min for carbon steel, 0.33 aluminum, 1.5 stainless/titanium), so max MRR = motor hp x efficiency / unit power. This is the power (stall) limit only - the actual depth/width/feed that reaches it, tool strength, rigidity, and finish are separate limits, and a light finishing pass runs far below it. The unit-power values are Machinery's Handbook references; the tool and machine govern the real cut.",
  };
}
export const spindleMaxMrrExample = { inputs: { available_motor_hp: 5, unit_power_hp: 1.0, efficiency_pct: 80 } };
function renderSpindleMaxMrr(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles specific-cutting-energy relation solved for the removal rate, max MRR = motor hp x efficiency / unit power, with Machinery's Handbook unit-power values (tabular reference), by name. The power (stall) limit only; depth/feed, tool strength, and rigidity are separate limits. The tool and machine govern the real cut.";
  const motor = makeNumber("Available motor horsepower (hp)", "smm-motor", { step: "any", min: "0", value: "5" });
  motor.input.value = "5";
  const unitPower = makeNumber("Unit power (hp per in3/min)", "smm-up", { step: "any", min: "0", value: "1.0" });
  unitPower.input.value = "1.0";
  const eff = makeNumber("Spindle drive efficiency (%)", "smm-eff", { step: "any", min: "0", value: "80" });
  eff.input.value = "80";
  for (const f of [motor, unitPower, eff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { motor.input.value = "5"; unitPower.input.value = "1.0"; eff.input.value = "80"; update(); });
  const oMrr = makeOutputLine(outputRegion, "Max material removal rate", "smm-out-mrr");
  const oCut = makeOutputLine(outputRegion, "Cutting hp at the limit", "smm-out-cut");
  const oNote = makeOutputLine(outputRegion, "Note", "smm-out-note");
  const update = debounce(() => {
    const r = computeSpindleMaxMrr({
      available_motor_hp: Number(motor.input.value) || 0,
      unit_power_hp: unitPower.input.value === "" ? 1.0 : Number(unitPower.input.value),
      efficiency_pct: eff.input.value === "" ? 80 : Number(eff.input.value),
    });
    if (r.error) { oMrr.textContent = r.error; oCut.textContent = "-"; oNote.textContent = ""; return; }
    oMrr.textContent = fmt(r.max_mrr_in3_min, 2) + " in3/min";
    oCut.textContent = fmt(r.cutting_hp, 2) + " hp";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [motor, unitPower, eff]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["spindle-max-mrr"] = renderSpindleMaxMrr;

// ===================== spec-v317..v319: machining depth batch =====================
// The cutting-geometry effects the speeds-and-feeds tile never captures: radial
// chip thinning at light radial engagement, boring-bar/overhang deflection and
// the L/D chatter limit, and the ballnose scallop height from stepover.

// dims: in { ae_in: L, d_in: L, fz_target: L } out: { ratio: dimensionless, rctf: dimensionless, fz_prog: L }
export function computeRadialChipThinning({ ae_in = 0, d_in = 0, fz_target = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(d_in > 0)) return { error: "Cutter diameter must be positive (in)." };
  if (!(ae_in > 0)) return { error: "Radial width of cut must be positive (in)." };
  if (fz_target < 0) return { error: "Target chip load cannot be negative (in/tooth)." };
  const ratio = ae_in / d_in;
  let rctf, flag;
  if (ratio >= 0.5) {
    rctf = 1.0;
    flag = ratio >= 1 ? "ae >= D (a full slot): no radial thinning, RCTF = 1.0" : "at or above half immersion (ae >= D/2): no thinning, RCTF = 1.0";
  } else {
    rctf = 1 / (2 * Math.sqrt(ratio - ratio * ratio));
    flag = "light radial engagement (ae < D/2): compensate the feed by RCTF";
  }
  const fz_prog = fz_target * rctf;
  return {
    ratio, rctf, fz_prog, flag,
    note: "Radial chip thinning factor RCTF = 1/(2 sqrt((ae/D) - (ae/D)^2)) for a radial width of cut ae below half the cutter diameter D, with the compensated feed per tooth fz_prog = fz_target x RCTF; RCTF = 1.0 at half immersion and above. At light engagement the actual chip is thinner than the programmed feed, so raising the feed restores the intended chip load - the basis of high-feed and trochoidal milling, and the difference between a light pass that rubs and one that cuts. This is the radial (not axial/lead-angle) thinning; it does not cap the result against the machine feed limit, the tool's maximum chip load, or the spindle power. A shop aid; the tool manufacturer's recommended chip load and the machine govern.",
  };
}
export const radialChipThinningExample = { inputs: { ae_in: 0.05, d_in: 0.5, fz_target: 0.004 } };

function renderRadialChipThinning(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: radial chip thinning factor RCTF = 1/(2 sqrt((ae/D) - (ae/D)^2)) for ae < D/2, the compensated feed fz_prog = fz_target x RCTF, RCTF = 1.0 at half immersion and above, per the modern milling / Machinery's Handbook references, by name. Radial thinning only. A shop aid; the tool maker's chip load governs.";
  const ae = makeNumber("Radial width of cut ae (in)", "rct-ae", { step: "any", min: "0" });
  const d = makeNumber("Cutter diameter D (in)", "rct-d", { step: "any", min: "0" });
  const fz = makeNumber("Target chip load fz (in/tooth)", "rct-fz", { step: "any", min: "0" });
  for (const f of [ae, d, fz]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ae.input.value = "0.05"; d.input.value = "0.5"; fz.input.value = "0.004"; update(); });
  const oRctf = makeOutputLine(outputRegion, "Radial chip thinning factor", "rct-out-rctf");
  const oFz = makeOutputLine(outputRegion, "Compensated feed per tooth", "rct-out-fz");
  const oNote = makeOutputLine(outputRegion, "Note", "rct-out-note");
  const update = debounce(() => {
    const r = computeRadialChipThinning({ ae_in: Number(ae.input.value) || 0, d_in: Number(d.input.value) || 0, fz_target: Number(fz.input.value) || 0 });
    if (r.error) { oRctf.textContent = r.error; oFz.textContent = "-"; oNote.textContent = "-"; return; }
    oRctf.textContent = fmt(r.rctf, 3) + " (ae/D " + fmt(r.ratio, 3) + ")";
    oFz.textContent = fmt(r.fz_prog, 4) + " in/tooth";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ae, d, fz]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["radial-chip-thinning"] = renderRadialChipThinning;

// dims: in { d_in: L, l_in: L, f_lb: M L T^-2, e_psi: M L^-1 T^-2 } out: { i_in4: L^4, delta_in: L, ld: dimensionless }
export function computeBoringBarDeflection({ d_in = 0, l_in = 0, f_lb = 0, e_psi = 30e6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(d_in > 0)) return { error: "Bar diameter must be positive (in)." };
  if (!(l_in > 0)) return { error: "Overhang length must be positive (in)." };
  if (!(f_lb > 0)) return { error: "Cutting force must be positive (lb)." };
  if (!(e_psi > 0)) return { error: "Modulus must be positive (psi)." };
  const i_in4 = (Math.PI * Math.pow(d_in, 4)) / 64;
  const delta_in = (f_lb * Math.pow(l_in, 3)) / (3 * e_psi * i_in4);
  const ld = l_in / d_in;
  const verdict = ld <= 4 ? "L/d <= 4: stable for a steel bar" : (ld <= 8 ? "L/d 4-8: carbide/damped-bar territory" : "L/d > 8: chatter-prone, shorten the overhang or use a damped bar");
  return {
    i_in4, delta_in, ld, verdict,
    note: "Static cantilever tip deflection delta = F L^3/(3 E I) with I = pi d^4/64 for a round bar, and the length-to-diameter ratio L/d for chatter risk (a steel bar is stable to about 4:1, a solid-carbide bar to 6:1-8:1, higher with heavy-metal or damped bars; E = 30e6 psi steel, ~90e6 carbide). The overhang, not the force, dominates via the L^3 law - halving the stickout cuts the deflection to one-eighth, which is why choking up on the tool is the first fix for chatter. A uniform solid round cantilever under a tip point load (a stepped or hollow bar changes I; a real cut adds a dynamic/regenerative-chatter component this static estimate does not capture). A shop aid; the tool and setup govern.",
  };
}
export const boringBarDeflectionExample = { inputs: { d_in: 0.75, l_in: 6, f_lb: 100, e_psi: 30e6 } };

function renderBoringBarDeflection(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: cantilever tip deflection delta = F L^3/(3 E I), I = pi d^4/64, E = 30e6 psi steel / ~90e6 carbide, and the practical L/d overhang limits, by name. Static solid-round model, not a stability-lobe analysis. A shop aid; the tool and setup govern.";
  const d = makeNumber("Bar / tool diameter d (in)", "bbd-d", { step: "any", min: "0" });
  const l = makeNumber("Overhang length L (in)", "bbd-l", { step: "any", min: "0" });
  const f = makeNumber("Radial cutting force F (lb)", "bbd-f", { step: "any", min: "0" });
  const e = makeNumber("Modulus E (psi: 30e6 steel, ~90e6 carbide)", "bbd-e", { step: "any", min: "0" }); e.input.value = "30000000";
  for (const x of [d, l, f, e]) inputRegion.appendChild(x.wrap);
  attachExampleButton(inputRegion, () => { d.input.value = "0.75"; l.input.value = "6"; f.input.value = "100"; e.input.value = "30000000"; update(); });
  const oDelta = makeOutputLine(outputRegion, "Tip deflection", "bbd-out-delta");
  const oLd = makeOutputLine(outputRegion, "L/d ratio", "bbd-out-ld");
  const oNote = makeOutputLine(outputRegion, "Note", "bbd-out-note");
  const update = debounce(() => {
    const r = computeBoringBarDeflection({ d_in: Number(d.input.value) || 0, l_in: Number(l.input.value) || 0, f_lb: Number(f.input.value) || 0, e_psi: Number(e.input.value) || 0 });
    if (r.error) { oDelta.textContent = r.error; oLd.textContent = "-"; oNote.textContent = "-"; return; }
    oDelta.textContent = fmt(r.delta_in, 4) + " in (" + fmt(r.delta_in * 1000, 1) + " mil)";
    oLd.textContent = fmt(r.ld, 1) + " - " + r.verdict;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const x of [d, l, f, e]) x.input.addEventListener("input", update);
}
MACHINING_RENDERERS["boring-bar-deflection"] = renderBoringBarDeflection;

// dims: in { d_in: L, f_lb: M L T^-2, allowable_deflection_in: L, e_psi: M L^-1 T^-2 } out: { max_overhang_in: L, i_in4: L^4, ld: dimensionless }
export function computeBoringBarMaxOverhang({ d_in = 0, f_lb = 0, allowable_deflection_in = 0, e_psi = 30e6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const d = Number(d_in) || 0;
  const f = Number(f_lb) || 0;
  const delta = Number(allowable_deflection_in) || 0;
  const e = (e_psi === undefined || e_psi === null || e_psi === "") ? 30e6 : Number(e_psi);
  if (!(d > 0)) return { error: "Bar diameter must be positive (in)." };
  if (!(f > 0)) return { error: "Cutting force must be positive (lb)." };
  if (!(delta > 0)) return { error: "Allowable tip deflection must be positive (in)." };
  if (!(e > 0)) return { error: "Modulus must be positive (psi)." };
  const i_in4 = (Math.PI * Math.pow(d, 4)) / 64;
  // Inverse of delta = F L^3 / (3 E I): L_max = (3 E I delta / F)^(1/3).
  const max_overhang_in = Math.cbrt(3 * e * i_in4 * delta / f);
  if (!Number.isFinite(max_overhang_in) || !(max_overhang_in > 0)) return { error: "Overhang math is not a finite positive value." };
  const ld = max_overhang_in / d;
  const chatter_note = ld <= 4 ? "L/d <= 4: within the steel-bar chatter limit" : (ld <= 8 ? "L/d 4-8: past the steel limit - use carbide or a damped bar, or shorten further" : "L/d > 8: chatter-prone even for carbide; the chatter limit, not deflection, governs - shorten the overhang");
  return {
    max_overhang_in, i_in4, ld, chatter_note,
    note: "The longest overhang a boring bar or tool can stick out before its tip deflection reaches the allowable, the inverse of the boring-bar-deflection tile: from delta = F L^3 / (3 E I) with I = pi d^4 / 64, L_max = (3 E I delta / F)^(1/3). Deflection is only half the story: check the reported L/d against the chatter limit (a steel bar is stable to about 4:1, solid carbide to 6:1-8:1). If the deflection-limited overhang exceeds the chatter L/d, chatter governs and the real max overhang is the shorter one. Because deflection scales with L^3, this length is a hard wall - a little more stickout blows the tolerance. Static solid-round cantilever; a real cut adds dynamic/regenerative chatter this does not model. A shop aid; the tool and setup govern."
  };
}
export const boringBarMaxOverhangExample = { inputs: { d_in: 0.75, f_lb: 100, allowable_deflection_in: 0.015, e_psi: 30e6 } };

function renderBoringBarMaxOverhang(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: cantilever deflection solved for overhang: L_max = (3 E I delta / F)^(1/3), I = pi d^4/64, E = 30e6 psi steel / ~90e6 carbide, with the practical L/d chatter limits, by name. Static solid-round model, not a stability-lobe analysis. A shop aid; the tool and setup govern.";
  const d = makeNumber("Bar / tool diameter d (in)", "bbmo-d", { step: "any", min: "0" });
  const f = makeNumber("Radial cutting force F (lb)", "bbmo-f", { step: "any", min: "0" });
  const delta = makeNumber("Allowable tip deflection (in)", "bbmo-delta", { step: "any", min: "0" });
  const e = makeNumber("Modulus E (psi: 30e6 steel, ~90e6 carbide)", "bbmo-e", { step: "any", min: "0" }); e.input.value = "30000000";
  for (const x of [d, f, delta, e]) inputRegion.appendChild(x.wrap);
  attachExampleButton(inputRegion, () => { d.input.value = "0.75"; f.input.value = "100"; delta.input.value = "0.015"; e.input.value = "30000000"; update(); });
  const oL = makeOutputLine(outputRegion, "Max overhang (deflection-limited)", "bbmo-out-l");
  const oLd = makeOutputLine(outputRegion, "L/d at that overhang", "bbmo-out-ld");
  const oNote = makeOutputLine(outputRegion, "Note", "bbmo-out-note");
  const update = debounce(() => {
    const r = computeBoringBarMaxOverhang({ d_in: Number(d.input.value) || 0, f_lb: Number(f.input.value) || 0, allowable_deflection_in: Number(delta.input.value) || 0, e_psi: e.input.value === "" ? 30e6 : Number(e.input.value) });
    if (r.error) { oL.textContent = r.error; oLd.textContent = "-"; oNote.textContent = "-"; return; }
    oL.textContent = fmt(r.max_overhang_in, 3) + " in";
    oLd.textContent = fmt(r.ld, 1) + " - " + r.chatter_note;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const x of [d, f, delta, e]) x.input.addEventListener("input", update);
}
MACHINING_RENDERERS["boring-bar-max-overhang"] = renderBoringBarMaxOverhang;

// dims: in { r_in: L, mode: dimensionless, s_in: L, h_in: L } out: { out_in: L }
export function computeBallnoseScallopHeight({ r_in = 0, mode = "scallop-from-stepover", s_in = 0, h_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(r_in > 0)) return { error: "Ballnose radius must be positive (in)." };
  if (mode === "scallop-from-stepover") {
    if (!(s_in > 0)) return { error: "Stepover must be positive (in)." };
    if (s_in > 2 * r_in) return { error: "The stepover exceeds the cutter diameter (s > 2R) - adjacent passes do not overlap." };
    const h_out = r_in - Math.sqrt(r_in * r_in - (s_in / 2) * (s_in / 2));
    return {
      out_kind: "scallop", out_in: h_out, s_in, h_in: h_out,
      note: "Ballnose scallop (cusp) height h = R - sqrt(R^2 - (s/2)^2) between parallel passes of a ballnose cutter of radius R at stepover s, with the small-scallop approximation h ~ s^2/(8R) near the bottom (so the scallop scales with s^2 - doubling the stepover quadruples it). The theoretical geometric cusp on a FLAT surface: a sloped surface changes the effective stepover, and tool deflection and runout add to the real finish; the cusp along the feed direction is the separate turning-surface-finish geometry, and this does not convert to Ra. A shop aid; the actual finish depends on the tool, deflection, and surface slope.",
    };
  } else if (mode === "stepover-from-scallop") {
    if (!(h_in > 0)) return { error: "Target scallop height must be positive (in)." };
    if (h_in >= r_in) return { error: "The target scallop must be less than the ballnose radius." };
    const s_out = 2 * Math.sqrt(r_in * r_in - (r_in - h_in) * (r_in - h_in));
    return {
      out_kind: "stepover", out_in: s_out, s_in: s_out, h_in,
      note: "Inverse ballnose scallop: the stepover s = 2 sqrt(R^2 - (R - h)^2) that holds a target scallop height h for a ballnose of radius R, the inverse of h = R - sqrt(R^2 - (s/2)^2). The theoretical geometric cusp on a flat surface; a sloped surface, tool deflection, and runout change the real finish, and this does not convert to Ra. A shop aid; the actual finish depends on the tool, deflection, and surface slope.",
    };
  }
  return { error: "Mode must be scallop-from-stepover or stepover-from-scallop." };
}
export const ballnoseScallopHeightExample = { inputs: { r_in: 0.25, mode: "scallop-from-stepover", s_in: 0.030, h_in: 0 } };

function renderBallnoseScallopHeight(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ballnose scallop height h = R - sqrt(R^2 - (s/2)^2) and its inverse s = 2 sqrt(R^2 - (R - h)^2), with the small-scallop h ~ s^2/(8R) approximation, per the CAM / mold-machining references, by name. Theoretical flat-surface cusp, not Ra. A shop aid; the real finish depends on the tool and slope.";
  const r = makeNumber("Ballnose radius R (in = cutter dia / 2)", "bsh-r", { step: "any", min: "0" });
  const mode = makeSelect("Mode", "bsh-mode", [
    { value: "scallop-from-stepover", label: "Scallop from stepover" },
    { value: "stepover-from-scallop", label: "Stepover from scallop" },
  ]);
  const s = makeNumber("Stepover s (in, for scallop mode)", "bsh-s", { step: "any", min: "0" });
  const h = makeNumber("Target scallop h (in, for stepover mode)", "bsh-h", { step: "any", min: "0" });
  inputRegion.appendChild(r.wrap);
  inputRegion.appendChild(mode.wrap);
  inputRegion.appendChild(s.wrap);
  inputRegion.appendChild(h.wrap);
  attachExampleButton(inputRegion, () => { r.input.value = "0.25"; mode.select.value = "scallop-from-stepover"; s.input.value = "0.030"; h.input.value = ""; update(); });
  const oOut = makeOutputLine(outputRegion, "Result", "bsh-out-res");
  const oNote = makeOutputLine(outputRegion, "Note", "bsh-out-note");
  const update = debounce(() => {
    const res = computeBallnoseScallopHeight({ r_in: Number(r.input.value) || 0, mode: mode.select.value, s_in: Number(s.input.value) || 0, h_in: Number(h.input.value) || 0 });
    if (res.error) { oOut.textContent = res.error; oNote.textContent = "-"; return; }
    if (res.out_kind === "scallop") oOut.textContent = "Scallop height " + fmt(res.out_in, 5) + " in (" + fmt(res.out_in * 1000, 2) + " mil)";
    else oOut.textContent = "Stepover " + fmt(res.out_in, 4) + " in";
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  r.input.addEventListener("input", update);
  mode.select.addEventListener("change", update);
  s.input.addEventListener("input", update);
  h.input.addEventListener("input", update);
}
MACHINING_RENDERERS["ballnose-scallop-height"] = renderBallnoseScallopHeight;

// ===================== spec-v401: spur gear tooth geometry (fabrication shop-math trio) =====================

// dims: in { diametral_pitch: dimensionless, teeth: dimensionless, mating_teeth: dimensionless } out: { pitch_dia_in: L, outside_dia_in: L, addendum_in: L, dedendum_in: L, whole_depth_in: L, root_dia_in: L, center_dist_in: L }
export function computeSpurGearGeometry({ diametral_pitch = 0, teeth = 0, mating_teeth = 0 } = {}) {
  const _g = _finiteGuard({ diametral_pitch, teeth, mating_teeth }); if (_g) return _g;
  const pd = Number(diametral_pitch) || 0;
  const n = Number(teeth) || 0;
  const nm = Number(mating_teeth) || 0;
  if (!(pd > 0)) return { error: "Diametral pitch must be positive (teeth/in)." };
  if (!(n > 0)) return { error: "Number of teeth must be positive." };
  if (nm < 0) return { error: "Mating tooth count must be non-negative." };
  const pitch_dia_in = n / pd;
  const outside_dia_in = (n + 2) / pd;
  const addendum_in = 1 / pd;
  const dedendum_in = 1.25 / pd;
  const whole_depth_in = 2.25 / pd;
  const root_dia_in = (n - 2.5) / pd;
  const center_dist_in = nm > 0 ? (n + nm) / (2 * pd) : null;
  return {
    pitch_dia_in, outside_dia_in, addendum_in, dedendum_in, whole_depth_in, root_dia_in, center_dist_in,
    note: "Spur gear geometry from the diametral pitch Pd (teeth per inch of pitch diameter, the unit that must match for two gears to mesh): pitch diameter = N/Pd, outside diameter = (N+2)/Pd, addendum = 1/Pd, dedendum = 1.25/Pd, whole depth = 2.25/Pd, root diameter = (N-2.5)/Pd, and the center distance of a mating pair = (N1+N2)/(2 Pd). Standard 20-degree full-depth involute proportions. A finer pitch (larger Pd) makes every dimension smaller for the same tooth count. A shop aid; the gear drawing and AGMA standard govern.",
  };
}
export const spurGearGeometryExample = { inputs: { diametral_pitch: 10, teeth: 40, mating_teeth: 20 } };
function renderSpurGearGeometry(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Spur gear tooth proportions (diametral-pitch system, 20-degree full-depth involute; AGMA / Machinery's Handbook): pitch dia = N/Pd, OD = (N+2)/Pd, addendum = 1/Pd, dedendum = 1.25/Pd, whole depth = 2.25/Pd, root = (N-2.5)/Pd, center distance = (N1+N2)/(2 Pd). A shop aid; the gear drawing and AGMA standard govern.";
  const pd = makeNumber("Diametral pitch Pd (teeth/in)", "sgg-pd", { step: "any", min: "0" }); pd.input.value = "10";
  const n = makeNumber("Number of teeth N", "sgg-n", { step: "any", min: "0" }); n.input.value = "40";
  const nm = makeNumber("Mating gear teeth (optional)", "sgg-nm", { step: "any", min: "0" }); nm.input.value = "20";
  for (const f of [pd, n, nm]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { pd.input.value = "10"; n.input.value = "40"; nm.input.value = "20"; update(); });
  const oPd = makeOutputLine(outputRegion, "Pitch / outside diameter", "sgg-out-pd");
  const oDepth = makeOutputLine(outputRegion, "Addendum / dedendum / whole depth", "sgg-out-d");
  const oRoot = makeOutputLine(outputRegion, "Root diameter", "sgg-out-r");
  const oCd = makeOutputLine(outputRegion, "Center distance (with mate)", "sgg-out-cd");
  const oNote = makeOutputLine(outputRegion, "Note", "sgg-out-n");
  const update = debounce(() => {
    const r = computeSpurGearGeometry({ diametral_pitch: Number(pd.input.value) || 0, teeth: Number(n.input.value) || 0, mating_teeth: Number(nm.input.value) || 0 });
    if (r.error) { oPd.textContent = r.error; oDepth.textContent = "-"; oRoot.textContent = "-"; oCd.textContent = "-"; oNote.textContent = ""; return; }
    oPd.textContent = fmt(r.pitch_dia_in, 3) + " in / " + fmt(r.outside_dia_in, 3) + " in";
    oDepth.textContent = fmt(r.addendum_in, 3) + " / " + fmt(r.dedendum_in, 3) + " / " + fmt(r.whole_depth_in, 3) + " in";
    oRoot.textContent = fmt(r.root_dia_in, 3) + " in";
    oCd.textContent = r.center_dist_in == null ? "(enter the mating tooth count)" : fmt(r.center_dist_in, 3) + " in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [pd, n, nm]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["spur-gear-geometry"] = renderSpurGearGeometry;

// ===================== spec-v649: gear identification (inverse of spur gear geometry) =====================
// Standard diametral-pitch series (Machinery's Handbook coarse + fine), used only
// to snap a measured Pd to the nearest catalog value for identification.
const _STD_PD = [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 24, 32, 40, 48, 64];
// dims: in { teeth: dimensionless, outside_dia_in: L } out: { pd: dimensionless, pitch_dia_in: L, module_mm: L, nearest_std_pd: dimensionless, pct_off: dimensionless }
export function computeGearIdentification({ teeth = 0, outside_dia_in = 0 } = {}) {
  const _g = _finiteGuard({ teeth, outside_dia_in }); if (_g) return _g;
  const n = Number(teeth) || 0;
  const od = Number(outside_dia_in) || 0;
  if (!(n > 0)) return { error: "Number of teeth must be positive." };
  if (!(od > 0)) return { error: "Measured outside diameter must be positive (in)." };
  const pd = (n + 2) / od;
  const pitch_dia_in = n / pd;
  const module_mm = 25.4 / pd;
  let nearest_std_pd = _STD_PD[0];
  for (const s of _STD_PD) { if (Math.abs(s - pd) < Math.abs(nearest_std_pd - pd)) nearest_std_pd = s; }
  const pct_off = Math.abs(pd - nearest_std_pd) / nearest_std_pd * 100;
  return {
    pd, pitch_dia_in, module_mm, nearest_std_pd, pct_off,
    note: "Identify an unknown spur gear from a tooth count and a measured outside (tip) diameter, the inverse of the spur-gear-geometry tile. Because OD = (N + 2)/Pd, the diametral pitch is Pd = (N + 2)/OD (teeth per inch), the pitch diameter is N/Pd, and the metric module equivalent is 25.4/Pd. The measured Pd is snapped to the nearest standard value so a caliper reading a hair off still identifies the gear; a large percent-off means a worn tip, a stub-tooth gear, or a metric-module gear read in inches. Standard 20-degree full-depth involute proportions; a stub, high, or nonstandard tooth form shifts the OD-to-Pd relation. A shop aid; confirm against the gear drawing or a gear gauge.",
  };
}
export const gearIdentificationExample = { inputs: { teeth: 40, outside_dia_in: 4.2 } };
function renderGearIdentification(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Spur gear identification (diametral-pitch system, 20-degree full-depth involute; AGMA / Machinery's Handbook), the inverse of OD = (N+2)/Pd: Pd = (N+2)/OD, pitch dia = N/Pd, module = 25.4/Pd, snapped to the nearest standard Pd. A shop aid; confirm against the gear drawing or a gear gauge.";
  const n = makeNumber("Number of teeth N (counted)", "gid-n", { step: "any", min: "0" }); n.input.value = "40";
  const od = makeNumber("Measured outside diameter (in)", "gid-od", { step: "any", min: "0" }); od.input.value = "4.2";
  for (const f of [n, od]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { n.input.value = "40"; od.input.value = "4.2"; update(); });
  const oPd = makeOutputLine(outputRegion, "Diametral pitch Pd", "gid-out-pd");
  const oDia = makeOutputLine(outputRegion, "Pitch diameter", "gid-out-dia");
  const oMod = makeOutputLine(outputRegion, "Metric module equivalent", "gid-out-mod");
  const oNote = makeOutputLine(outputRegion, "Note", "gid-out-n");
  const update = debounce(() => {
    const r = computeGearIdentification({ teeth: Number(n.input.value) || 0, outside_dia_in: Number(od.input.value) || 0 });
    if (r.error) { oPd.textContent = r.error; oDia.textContent = "-"; oMod.textContent = "-"; oNote.textContent = ""; return; }
    oPd.textContent = fmt(r.pd, 2) + " teeth/in (nearest standard " + fmt(r.nearest_std_pd, 2) + ", " + fmt(r.pct_off, 1) + "% off)";
    oDia.textContent = fmt(r.pitch_dia_in, 3) + " in";
    oMod.textContent = fmt(r.module_mm, 3) + " mm";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [n, od]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["gear-identification"] = renderGearIdentification;

// ===================== v775: gear-tooth chordal thickness for caliper inspection =====================
// Standard 20-degree full-depth involute, no profile shift. Half-angle = 90/N deg.
// chordal tooth thickness tc = (N/Pd) x sin(90/N deg); chordal addendum (caliper
// tongue depth) ac = 1/Pd + (N/(2Pd)) x (1 - cos(90/N deg)). Arc thickness = pi/(2Pd).
// dims: in { diametral_pitch: dimensionless, teeth: dimensionless } out: { chordal_thickness_in: L, chordal_addendum_in: L, arc_thickness_in: L }
export function computeGearChordalThickness({ diametral_pitch = 0, teeth = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Pd = Number(diametral_pitch) || 0;
  const N = Number(teeth) || 0;
  if (!(Pd > 0)) return { error: "Diametral pitch must be positive (teeth/in)." };
  if (!(N >= 3) || N !== Math.floor(N)) return { error: "Tooth count must be a whole number of at least 3." };
  const halfAngleRad = (Math.PI / 2) / N; // 90 deg / N, in radians
  const chordal_thickness_in = (N / Pd) * Math.sin(halfAngleRad);
  const chordal_addendum_in = 1 / Pd + (N / (2 * Pd)) * (1 - Math.cos(halfAngleRad));
  const arc_thickness_in = Math.PI / (2 * Pd);
  return {
    chordal_thickness_in, chordal_addendum_in, arc_thickness_in,
    note: "Gear-tooth caliper (vernier gear-tooth caliper) inspection dimensions for a standard 20-degree full-depth involute spur gear: set the caliper tongue to the chordal addendum ac and read the chordal tooth thickness tc across the tooth at the pitch line. tc = (N/Pd) sin(90/N deg) is the straight chord of the circular tooth thickness (the arc thickness pi/(2Pd)), so tc is always a hair less than the arc; ac = 1/Pd + (N/(2Pd))(1 - cos(90/N deg)) is slightly more than the addendum 1/Pd because the chord sits below the outside circle. Assumes standard tooth proportions with no profile shift (addendum modification) and no backlash/tooth-thinning allowance - subtract the drawing's allowance from tc for a working gear. A shop inspection aid; the gear drawing and AGMA govern.",
  };
}
export const gearChordalThicknessExample = { inputs: { diametral_pitch: 10, teeth: 40 } };

function renderGearChordalThickness(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: gear-tooth caliper chordal dimensions for a 20-degree full-depth involute spur gear - chordal tooth thickness tc = (N/Pd) sin(90/N deg), chordal addendum ac = 1/Pd + (N/(2Pd))(1 - cos(90/N deg)), the standard Machinery's Handbook / AGMA gear-tooth-caliper method. Standard tooth, no profile shift or backlash allowance. A shop inspection aid; the gear drawing and AGMA govern.";
  const pd = makeNumber("Diametral pitch Pd (teeth/in)", "gct-pd", { step: "any", min: "0", value: "10" });
  pd.input.value = "10";
  const n = makeNumber("Number of teeth N", "gct-n", { step: "1", min: "3", value: "40" });
  n.input.value = "40";
  for (const f of [pd, n]) inputRegion.appendChild(f.wrap);
  const oTc = makeOutputLine(outputRegion, "Chordal tooth thickness (caliper reading)", "gct-out-tc");
  const oAc = makeOutputLine(outputRegion, "Chordal addendum (caliper tongue depth)", "gct-out-ac");
  const oArc = makeOutputLine(outputRegion, "Arc tooth thickness (reference)", "gct-out-arc");
  const oNote = makeOutputLine(outputRegion, "Note", "gct-out-note");
  const update = debounce(() => {
    const r = computeGearChordalThickness({ diametral_pitch: Number(pd.input.value) || 0, teeth: Number(n.input.value) || 0 });
    if (r.error) { oTc.textContent = r.error; oAc.textContent = "-"; oArc.textContent = "-"; oNote.textContent = ""; return; }
    oTc.textContent = fmt(r.chordal_thickness_in, 4) + " in";
    oAc.textContent = fmt(r.chordal_addendum_in, 4) + " in";
    oArc.textContent = fmt(r.arc_thickness_in, 4) + " in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { pd.input.value = "10"; n.input.value = "40"; update(); });
  for (const f of [pd, n]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["gear-chordal-thickness"] = renderGearChordalThickness;

// ===================== spec-v504: rolling-bearing L10 rating life (ISO 281) =====================
// dims: in { dynamic_rating_lbf: M L T^-2, equivalent_load_lbf: M L T^-2, speed_rpm: T^-1, bearing_type: dimensionless } out: { p_exp: dimensionless, l10_rev: dimensionless, l10_hr: T }
export function computeBearingL10Life({ dynamic_rating_lbf = 0, equivalent_load_lbf = 0, speed_rpm = 0, bearing_type = "ball" } = {}) {
  const _g = _finiteGuard({ dynamic_rating_lbf, equivalent_load_lbf, speed_rpm }); if (_g) return _g;
  const c = Number(dynamic_rating_lbf) || 0;
  const pl = Number(equivalent_load_lbf) || 0;
  const rpm = Number(speed_rpm) || 0;
  const type = String(bearing_type);
  if (!(c > 0)) return { error: "Dynamic load rating C must be positive (lbf)." };
  if (!(pl > 0)) return { error: "Equivalent dynamic load P must be positive (lbf)." };
  if (!(rpm > 0)) return { error: "Speed must be positive (rpm)." };
  if (type !== "ball" && type !== "roller") return { error: "Bearing type must be ball or roller." };
  const p_exp = type === "roller" ? 10 / 3 : 3;
  const l10_rev = Math.pow(c / pl, p_exp) * 1e6;
  const l10_hr = l10_rev / (60 * rpm);
  if (![p_exp, l10_rev, l10_hr].every(Number.isFinite)) return { error: "Bearing-life math is not a finite value." };
  return {
    p_exp, l10_rev, l10_hr,
    note: "ISO 281 basic rating life: L10 = (C/P)^p x 10^6 revolutions, L10h = L10 / (60 x rpm) hours, with p = 3 for ball bearings and 10/3 for roller bearings. Life scales as the CUBE (ball) of the load ratio, so a modest overload cuts life sharply -- a 25% overload roughly halves it -- and a small load reduction (better alignment, lighter belt tension) buys a large life gain. The basic L10 assumes clean, well-lubricated operation; contamination, misalignment, and lubricant condition are handled by the modified aISO life. L10 is the life at which 10% of a population has failed, not the average. A planning estimate, not a warranty; the mounting, lubrication, and application govern.",
  };
}
export const bearingL10LifeExample = { inputs: { dynamic_rating_lbf: 5000, equivalent_load_lbf: 1000, speed_rpm: 1750, bearing_type: "ball" } };
function renderBearingL10Life(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ISO 281 / ABMA 9 & 11 basic rating life: L10 = (C/P)^p x 10^6 rev, L10h = L10 / (60 x rpm), p = 3 ball / 10/3 roller. Life scales as the cube (ball) of the load ratio. Basic L10 assumes clean, well-lubricated operation; L10 is the life at which 10% have failed, not the average. A planning estimate; the mounting, lubrication, and application govern.";
  const c = makeNumber("Basic dynamic load rating C (lbf)", "bl10-c", { step: "any", min: "0" }); c.input.value = "5000";
  const p = makeNumber("Equivalent dynamic load P (lbf)", "bl10-p", { step: "any", min: "0" }); p.input.value = "1000";
  const rpm = makeNumber("Operating speed (rpm)", "bl10-rpm", { step: "any", min: "0" }); rpm.input.value = "1750";
  const type = makeSelect("Bearing type", "bl10-type", [
    { value: "ball", label: "Ball (p = 3)", selected: true },
    { value: "roller", label: "Roller (p = 10/3)" },
  ]);
  for (const f of [c, p, rpm, type]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { c.input.value = "5000"; p.input.value = "1000"; rpm.input.value = "1750"; type.select.value = "ball"; update(); });
  const oRev = makeOutputLine(outputRegion, "Rating life L10", "bl10-out-rev");
  const oHr = makeOutputLine(outputRegion, "Rating life L10h", "bl10-out-hr");
  const oNote = makeOutputLine(outputRegion, "Note", "bl10-out-n");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeBearingL10Life({ dynamic_rating_lbf: readNum(c.input), equivalent_load_lbf: readNum(p.input), speed_rpm: readNum(rpm.input), bearing_type: type.select.value });
    if (r.error) { oRev.textContent = r.error; oHr.textContent = "-"; oNote.textContent = ""; return; }
    oRev.textContent = fmt(r.l10_rev / 1e6, 1) + " million rev (p = " + fmt(r.p_exp, 3) + ")";
    oHr.textContent = fmt(r.l10_hr, 0) + " hr";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [c, p, rpm]) f.input.addEventListener("input", update);
  type.select.addEventListener("change", update);
}
MACHINING_RENDERERS["bearing-l10-life"] = renderBearingL10Life;

// ===================== spec-v672: max bearing load for a target L10 life (inverse of bearing-l10-life) =====================
// dims: in { dynamic_rating_lbf: M L T^-2, target_life_hr: T, speed_rpm: T^-1, bearing_type: dimensionless } out: { max_equivalent_load_lbf: M L T^-2, p_exp: dimensionless, l10_rev: dimensionless }
export function computeBearingMaxLoad({ dynamic_rating_lbf = 0, target_life_hr = 0, speed_rpm = 0, bearing_type = "ball" } = {}) {
  const _g = _finiteGuard({ dynamic_rating_lbf, target_life_hr, speed_rpm }); if (_g) return _g;
  const c = Number(dynamic_rating_lbf) || 0;
  const hr = Number(target_life_hr) || 0;
  const rpm = Number(speed_rpm) || 0;
  const type = String(bearing_type);
  if (!(c > 0)) return { error: "Dynamic load rating C must be positive (lbf)." };
  if (!(hr > 0)) return { error: "Target life must be positive (hr)." };
  if (!(rpm > 0)) return { error: "Speed must be positive (rpm)." };
  if (type !== "ball" && type !== "roller") return { error: "Bearing type must be ball or roller." };
  const p_exp = type === "roller" ? 10 / 3 : 3;
  // Inverse of L10 = (C/P)^p x 1e6 with L10 = target_hr x 60 x rpm: P_max = C x (1e6 / L10_rev)^(1/p).
  const l10_rev = hr * 60 * rpm;
  const max_equivalent_load_lbf = c * Math.pow(1e6 / l10_rev, 1 / p_exp);
  if (![p_exp, l10_rev, max_equivalent_load_lbf].every(Number.isFinite) || !(max_equivalent_load_lbf > 0)) return { error: "Bearing-load math is not a finite value." };
  return {
    max_equivalent_load_lbf, p_exp, l10_rev,
    note: "The largest equivalent dynamic load a bearing can carry and still reach a target L10 life, the inverse of the bearing-l10-life tile: from L10 = (C/P)^p x 10^6 rev with L10 = target_hr x 60 x rpm, P_max = C x (10^6 / L10_rev)^(1/p), p = 3 ball / 10/3 roller. Because life scales as the cube (ball) of the load ratio, the load limit is only weakly sensitive to the target life - doubling the required hours cuts the allowable load by about 20% (ball) - so a bearing sized for a long life still carries a fair load. The basic L10 assumes clean, well-lubricated operation (contamination needs the modified aISO life) and is the life at which 10% have failed, not the average. A planning estimate, not a warranty; the mounting, lubrication, and application govern.",
  };
}
export const bearingMaxLoadExample = { inputs: { dynamic_rating_lbf: 5000, target_life_hr: 1190, speed_rpm: 1750, bearing_type: "ball" } };
function renderBearingMaxLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ISO 281 / ABMA 9 & 11 basic rating life solved for the load: P_max = C x (10^6 / L10_rev)^(1/p) with L10_rev = target_hr x 60 x rpm, p = 3 ball / 10/3 roller. Life scales as the cube (ball) of the load ratio. Basic L10 assumes clean, well-lubricated operation; L10 is the life at which 10% have failed, not the average. A planning estimate; the mounting, lubrication, and application govern.";
  const c = makeNumber("Basic dynamic load rating C (lbf)", "bml-c", { step: "any", min: "0" }); c.input.value = "5000";
  const hr = makeNumber("Target rating life L10h (hr)", "bml-hr", { step: "any", min: "0" }); hr.input.value = "1190";
  const rpm = makeNumber("Operating speed (rpm)", "bml-rpm", { step: "any", min: "0" }); rpm.input.value = "1750";
  const type = makeSelect("Bearing type", "bml-type", [
    { value: "ball", label: "Ball (p = 3)", selected: true },
    { value: "roller", label: "Roller (p = 10/3)" },
  ]);
  for (const f of [c, hr, rpm, type]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { c.input.value = "5000"; hr.input.value = "1190"; rpm.input.value = "1750"; type.select.value = "ball"; update(); });
  const oLoad = makeOutputLine(outputRegion, "Max equivalent load P", "bml-out-load");
  const oNote = makeOutputLine(outputRegion, "Note", "bml-out-n");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeBearingMaxLoad({ dynamic_rating_lbf: readNum(c.input), target_life_hr: readNum(hr.input), speed_rpm: readNum(rpm.input), bearing_type: type.select.value });
    if (r.error) { oLoad.textContent = r.error; oNote.textContent = ""; return; }
    oLoad.textContent = fmt(r.max_equivalent_load_lbf, 0) + " lbf (p = " + fmt(r.p_exp, 3) + ")";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [c, hr, rpm]) f.input.addEventListener("input", update);
  type.select.addEventListener("change", update);
}
MACHINING_RENDERERS["bearing-max-load"] = renderBearingMaxLoad;

// ===================== spec-v509: countersink diameter and cutting depth =====================
// dims: in { countersink_dia_in: L, included_angle_deg: dimensionless, pilot_hole_dia_in: L } out: { z_in: L, z_full_in: L }
export function computeCountersinkDepth({ countersink_dia_in = 0, included_angle_deg = 82, pilot_hole_dia_in = 0 } = {}) {
  const _g = _finiteGuard({ countersink_dia_in, included_angle_deg, pilot_hole_dia_in }); if (_g) return _g;
  const dcs = Number(countersink_dia_in) || 0;
  const ang = Number(included_angle_deg) || 0;
  const dhole = Number(pilot_hole_dia_in) || 0;
  if (!(dcs > 0)) return { error: "Countersink diameter must be positive (in)." };
  if (dhole < 0) return { error: "Pilot-hole diameter cannot be negative (in)." };
  if (!(dhole < dcs)) return { error: "Pilot-hole diameter must be less than the countersink diameter (in)." };
  if (!(ang > 0 && ang < 180)) return { error: "Included angle must be between 0 and 180 degrees." };
  const halfRad = (ang / 2) * Math.PI / 180;
  const tanHalf = Math.tan(halfRad);
  const z_in = (dcs - dhole) / (2 * tanHalf);
  const z_full_in = dcs / (2 * tanHalf);
  if (![z_in, z_full_in].every(Number.isFinite)) return { error: "Countersink-depth math is not a finite value." };
  return {
    z_in, z_full_in,
    note: "Countersink diameter-to-depth: the print calls out the finished (major) DIAMETER, but the machine is set to a plunge DEPTH -- Z = (D_cs - d_hole) / (2 tan(angle/2)), the depth below the surface to open the cone from the pilot hole out to the countersink diameter. A few thousandths of over-plunge sits a flat-head screw proud or buried. The included angle is not interchangeable: 82 degrees is the inch flat-head standard and 90 degrees is the metric standard, and a screw and a sink of mismatched angles never seat flush. A shallower angle drives the tool deeper for the same diameter, so the angle callout matters as much as the diameter. A setup aid, not the print; the actual tool geometry and the fastener callout govern.",
  };
}
export const countersinkDepthExample = { inputs: { countersink_dia_in: 0.5, included_angle_deg: 82, pilot_hole_dia_in: 0.25 } };
function renderCountersinkDepth(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: countersink diameter-to-depth (Machinery's Handbook countersinking): Z = (D_cs - d_hole) / (2 tan(angle/2)); full-cone travel = D_cs / (2 tan(angle/2)). 82 deg inch flat-head and 90 deg metric heads are not interchangeable. A setup aid; the tool geometry and the fastener callout govern.";
  const d = makeNumber("Finished countersink diameter D_cs (in)", "csd-d", { step: "any", min: "0" }); d.input.value = "0.5";
  const ang = makeSelect("Included angle (deg)", "csd-ang", [
    { value: "82", label: "82 (inch flat-head)", selected: true },
    { value: "90", label: "90 (metric flat-head)" },
    { value: "100", label: "100 (aircraft flush)" },
    { value: "120", label: "120" },
    { value: "60", label: "60 (lathe center)" },
  ]);
  const hole = makeNumber("Pilot / through-hole diameter (in)", "csd-hole", { step: "any", min: "0" }); hole.input.value = "0.25";
  for (const f of [d, ang, hole]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { d.input.value = "0.5"; ang.select.value = "82"; hole.input.value = "0.25"; update(); });
  const oZ = makeOutputLine(outputRegion, "Plunge depth below surface", "csd-out-z");
  const oZf = makeOutputLine(outputRegion, "Theoretical full-cone travel", "csd-out-zf");
  const oNote = makeOutputLine(outputRegion, "Note", "csd-out-n");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeCountersinkDepth({ countersink_dia_in: readNum(d.input), included_angle_deg: Number(ang.select.value), pilot_hole_dia_in: readNum(hole.input) });
    if (r.error) { oZ.textContent = r.error; oZf.textContent = "-"; oNote.textContent = ""; return; }
    oZ.textContent = fmt(r.z_in, 4) + " in";
    oZf.textContent = fmt(r.z_full_in, 4) + " in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [d, hole]) f.input.addEventListener("input", update);
  ang.select.addEventListener("change", update);
}
MACHINING_RENDERERS["countersink-depth"] = renderCountersinkDepth;

// ===================== spec-v733: countersink diameter from a plunge depth (inverse of countersink-depth) =====================
// The forward tile gives the plunge depth from the finished countersink diameter; the inverse recovers the finished
// (major) diameter a set plunge depth opens, so a machinist checking a dial or a Z stop can read off the diameter.
// From Z = (D_cs - d_hole) / (2 tan(angle/2)), D_cs = 2 Z tan(angle/2) + d_hole. A shallower (larger) angle opens a
// wider diameter for the same depth. cone_dia = 2 Z tan(angle/2) is the diameter the plunge alone opens (pilot at zero).
// dims: in { plunge_depth_in: L, included_angle_deg: dimensionless, pilot_hole_dia_in: L } out: { countersink_dia_in: L, cone_dia_in: L }
export function computeCountersinkDiameterFromDepth({ plunge_depth_in = 0, included_angle_deg = 82, pilot_hole_dia_in = 0 } = {}) {
  const _g = _finiteGuard({ plunge_depth_in, included_angle_deg, pilot_hole_dia_in }); if (_g) return _g;
  const z = Number(plunge_depth_in) || 0;
  const ang = Number(included_angle_deg) || 0;
  const dhole = Number(pilot_hole_dia_in) || 0;
  if (!(z > 0)) return { error: "Plunge depth must be positive (in)." };
  if (dhole < 0) return { error: "Pilot-hole diameter cannot be negative (in)." };
  if (!(ang > 0 && ang < 180)) return { error: "Included angle must be between 0 and 180 degrees." };
  const halfRad = (ang / 2) * Math.PI / 180;
  const tanHalf = Math.tan(halfRad);
  const cone_dia_in = 2 * z * tanHalf;
  const countersink_dia_in = cone_dia_in + dhole;
  if (![cone_dia_in, countersink_dia_in].every(Number.isFinite)) return { error: "Countersink-diameter math is not a finite value." };
  return {
    countersink_dia_in, cone_dia_in,
    note: "Countersink depth-to-diameter: the machine is set to a plunge DEPTH, but the print calls out the finished (major) DIAMETER -- D_cs = 2 Z tan(angle/2) + d_hole, the diameter the cone opens to at that depth below the surface. A few thousandths of over-plunge sits a flat-head screw proud or buried, so read the diameter back from the actual Z. The included angle is not interchangeable: 82 degrees is the inch flat-head standard and 90 degrees is the metric standard, and a screw and a sink of mismatched angles never seat flush. A shallower (larger) angle opens a wider diameter for the same depth. A setup aid, not the print; the actual tool geometry and the fastener callout govern.",
  };
}
export const countersinkDiameterFromDepthExample = { inputs: { plunge_depth_in: 0.1438, included_angle_deg: 82, pilot_hole_dia_in: 0.25 } };
function renderCountersinkDiameterFromDepth(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: countersink depth-to-diameter (Machinery's Handbook countersinking) solved for the diameter: D_cs = 2 Z tan(angle/2) + d_hole. 82 deg inch flat-head and 90 deg metric heads are not interchangeable. A setup aid; the tool geometry and the fastener callout govern.";
  const z = makeNumber("Plunge depth below surface Z (in)", "cdd-z", { step: "any", min: "0" }); z.input.value = "0.1438";
  const ang = makeSelect("Included angle (deg)", "cdd-ang", [
    { value: "82", label: "82 (inch flat-head)", selected: true },
    { value: "90", label: "90 (metric flat-head)" },
    { value: "100", label: "100 (aircraft flush)" },
    { value: "120", label: "120" },
    { value: "60", label: "60 (lathe center)" },
  ]);
  const hole = makeNumber("Pilot / through-hole diameter (in)", "cdd-hole", { step: "any", min: "0" }); hole.input.value = "0.25";
  for (const f of [z, ang, hole]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { z.input.value = "0.1438"; ang.select.value = "82"; hole.input.value = "0.25"; update(); });
  const oD = makeOutputLine(outputRegion, "Finished countersink diameter D_cs", "cdd-out-d");
  const oC = makeOutputLine(outputRegion, "Cone diameter from the plunge alone", "cdd-out-c");
  const oNote = makeOutputLine(outputRegion, "Note", "cdd-out-n");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeCountersinkDiameterFromDepth({ plunge_depth_in: readNum(z.input), included_angle_deg: Number(ang.select.value), pilot_hole_dia_in: readNum(hole.input) });
    if (r.error) { oD.textContent = r.error; oC.textContent = "-"; oNote.textContent = ""; return; }
    oD.textContent = fmt(r.countersink_dia_in, 4) + " in";
    oC.textContent = fmt(r.cone_dia_in, 4) + " in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [z, hole]) f.input.addEventListener("input", update);
  ang.select.addEventListener("change", update);
}
MACHINING_RENDERERS["countersink-diameter-from-depth"] = renderCountersinkDiameterFromDepth;

// ===================== spec-v513: shaft key and keyseat size (ANSI B17.1) =====================
// ANSI B17.1 standard square-key width by shaft-diameter band (upper bound inclusive, in).
const _B17_1_KEY_BANDS = [
  { maxD: 0.4375, w: 3 / 32 },
  { maxD: 0.5625, w: 1 / 8 },
  { maxD: 0.875, w: 3 / 16 },
  { maxD: 1.25, w: 1 / 4 },
  { maxD: 1.375, w: 5 / 16 },
  { maxD: 1.75, w: 3 / 8 },
  { maxD: 2.25, w: 1 / 2 },
  { maxD: 2.75, w: 5 / 8 },
  { maxD: 3.25, w: 3 / 4 },
  { maxD: 3.75, w: 7 / 8 },
  { maxD: 4.5, w: 1 },
  { maxD: 5.5, w: 1.25 },
  { maxD: 6.5, w: 1.5 },
];
// dims: in { shaft_diameter_in: L, torque_in_lb: M L^2 T^-2, key_length_in: L } out: { key_width_in: L, key_height_in: L, shaft_keyseat_depth_in: L, shear_stress_psi: M L^-1 T^-2, bearing_stress_psi: M L^-1 T^-2 }
export function computeKeyseatKeySize({ shaft_diameter_in = 0, torque_in_lb = 0, key_length_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const d = Number(shaft_diameter_in) || 0;
  const t = Number(torque_in_lb) || 0;
  const len = Number(key_length_in) || 0;
  if (!(d > 0)) return { error: "Shaft diameter must be positive (in)." };
  const wantStress = t > 0 || len > 0;
  if (wantStress) {
    if (!(t > 0)) return { error: "Torque must be positive (in-lb) for the stress check (0 = geometry only)." };
    if (!(len > 0)) return { error: "Key length must be positive (in) for the stress check (0 = geometry only)." };
  }
  let band = _B17_1_KEY_BANDS.find((b) => d <= b.maxD);
  if (!band) band = _B17_1_KEY_BANDS[_B17_1_KEY_BANDS.length - 1];
  const key_width_in = band.w;
  const key_height_in = band.w; // square key
  const shaft_keyseat_depth_in = key_height_in / 2;
  const shear_stress_psi = wantStress ? 2 * t / (d * key_width_in * len) : null;
  const bearing_stress_psi = wantStress ? 4 * t / (d * key_height_in * len) : null;
  if (![key_width_in, key_height_in, shaft_keyseat_depth_in].every(Number.isFinite)) return { error: "Key-size math is not a finite value." };
  return {
    key_width_in, key_height_in, shaft_keyseat_depth_in, shear_stress_psi, bearing_stress_psi,
    note: "ANSI B17.1 key and keyseat sizing: the standard key WIDTH comes from the shaft-diameter band table, not exactly D/4 -- a 1 in shaft (over 7/8 to 1-1/4 band) takes a 1/4 in square key. The SHAFT keyseat is cut to half the key height (H/2), the depth machinists mis-read off the full key height and cut too deep, weakening the shaft. Key stresses: shear = 2T / (D x W x L), bearing = 4T / (D x H x L). A key LONGER than the hub adds no torque capacity -- the hub is the limit -- so enter the effective (hub) length, not the key stock, and a key past the hub is wasted. This tile models a square key; larger shafts use rectangular keys per the table. A design aid; the material allowables and the fit class govern.",
  };
}
export const keyseatKeySizeExample = { inputs: { shaft_diameter_in: 1.0, torque_in_lb: 1000, key_length_in: 1.5 } };
function renderKeyseatKeySize(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ANSI B17.1 Keys and Keyseats (Machinery's Handbook): the standard key width from the shaft-diameter band; shaft keyseat depth = key height / 2; key shear = 2T/(D W L), bearing = 4T/(D H L). The key width is band-based, not D/4; a key longer than the hub adds no capacity. A design aid; the material allowables and fit class govern.";
  const d = makeNumber("Shaft diameter D (in)", "kks-d", { step: "any", min: "0" }); d.input.value = "1.0";
  const t = makeNumber("Transmitted torque (in-lb, 0 = geometry only)", "kks-t", { step: "any", min: "0" }); t.input.value = "1000";
  const len = makeNumber("Key / hub engagement length L (in, 0 = geometry only)", "kks-l", { step: "any", min: "0" }); len.input.value = "1.5";
  for (const f of [d, t, len]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { d.input.value = "1.0"; t.input.value = "1000"; len.input.value = "1.5"; update(); });
  const oW = makeOutputLine(outputRegion, "Standard key (W x H)", "kks-out-w");
  const oDepth = makeOutputLine(outputRegion, "Shaft keyseat depth (H/2)", "kks-out-depth");
  const oShear = makeOutputLine(outputRegion, "Key shear stress", "kks-out-shear");
  const oBear = makeOutputLine(outputRegion, "Key bearing stress", "kks-out-bear");
  const oNote = makeOutputLine(outputRegion, "Note", "kks-out-n");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeKeyseatKeySize({ shaft_diameter_in: readNum(d.input), torque_in_lb: readNum(t.input), key_length_in: readNum(len.input) });
    if (r.error) { oW.textContent = r.error; oDepth.textContent = "-"; oShear.textContent = "-"; oBear.textContent = "-"; oNote.textContent = ""; return; }
    oW.textContent = fmt(r.key_width_in, 4) + " x " + fmt(r.key_height_in, 4) + " in";
    oDepth.textContent = fmt(r.shaft_keyseat_depth_in, 4) + " in";
    oShear.textContent = r.shear_stress_psi === null ? "- (enter torque and length)" : fmt(r.shear_stress_psi, 0) + " psi";
    oBear.textContent = r.bearing_stress_psi === null ? "-" : fmt(r.bearing_stress_psi, 0) + " psi";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [d, t, len]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["keyseat-key-size"] = renderKeyseatKeySize;

// ===================== spec-v910: knurling blank diameter for clean tracking =====================
// dims: in { target_diameter_in: L, knurl_tpi: L^-1 } out: { teeth: dimensionless, blank_diameter_in: L, adjustment_in: L }
export function computeKnurlBlankDiameter({ target_diameter_in = 0.75, knurl_tpi = 21 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(target_diameter_in > 0)) return { error: "Target diameter must be positive (in)." };
  if (!(knurl_tpi > 0)) return { error: "Knurl TPI must be positive." };
  // A circular-pitch (TPI) knurl tracks cleanly only when the blank circumference is a whole
  // number of teeth, so round pi x D x TPI to an integer and back-solve the blank diameter.
  const teeth = Math.round(Math.PI * target_diameter_in * knurl_tpi);
  if (teeth < 1) return { error: "Diameter is too small for even one knurl tooth at this pitch." };
  const blank_diameter_in = teeth / (Math.PI * knurl_tpi);
  const adjustment_in = blank_diameter_in - target_diameter_in;
  if (![teeth, blank_diameter_in, adjustment_in].every(Number.isFinite)) return { error: "Knurl blank math is not a finite value." };
  return {
    teeth,
    blank_diameter_in,
    adjustment_in,
    note: "For a circular-pitch (TPI) knurl to track cleanly, the blank circumference must be a whole number of teeth: teeth = round(pi x D x TPI), then turn the blank to teeth / (pi x TPI). The adjustment is signed -- turn slightly over or under the nominal. Diamond and straight knurls in TPI (teeth per inch) form; diametral-pitch knurls and the knurl maker's tracking chart govern the finished pattern.",
  };
}

export const knurlBlankDiameterExample = { inputs: { target_diameter_in: 0.75, knurl_tpi: 21 } };

function _v910renderKnurlBlankDiameter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: knurl tracking rule by name. A circular-pitch (TPI) knurl tracks cleanly when the blank circumference is a whole number of teeth: teeth = round(pi x D x TPI); blank diameter = teeth / (pi x TPI).";
  const td = makeNumber("Target diameter (in)", "kbd-td", { step: "any", min: "0", value: "0.75" });
  td.input.value = "0.75";
  const tp = makeNumber("Knurl pitch (TPI)", "kbd-tp", { step: "any", min: "0", value: "21" });
  tp.input.value = "21";
  for (const f of [td, tp]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { td.input.value = "0.75"; tp.input.value = "21"; update(); });
  const oTeeth = makeOutputLine(outputRegion, "Teeth around blank", "kbd-out-teeth");
  const oBlank = makeOutputLine(outputRegion, "Turn blank to", "kbd-out-blank");
  const oAdj = makeOutputLine(outputRegion, "Adjustment from target", "kbd-out-adj");
  const update = debounce(() => {
    const r = computeKnurlBlankDiameter({
      target_diameter_in: td.input.value === "" ? 0.75 : Number(td.input.value), knurl_tpi: tp.input.value === "" ? 21 : Number(tp.input.value),
    });
    if (r.error) { oTeeth.textContent = r.error; oBlank.textContent = "-"; oAdj.textContent = "-"; return; }
    oTeeth.textContent = fmt(r.teeth, 0) + " teeth";
    oBlank.textContent = fmt(r.blank_diameter_in, 4) + " in";
    oAdj.textContent = (r.adjustment_in >= 0 ? "+" : "") + fmt(r.adjustment_in, 4) + " in";
  }, DEBOUNCE_MS);
  for (const f of [td, tp]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["knurl-blank-diameter"] = _v910renderKnurlBlankDiameter;

// ===================== spec-v911: grinding wheel surface speed and max safe RPM =====================
// dims: in { wheel_diameter_in: L, rated_max_sfpm: L*T^-1, grinder_rpm: T^-1 } out: { max_rpm: T^-1, actual_sfpm: L*T^-1, margin_rpm: T^-1, within_rating: dimensionless }
export function computeGrindingWheelRpm({ wheel_diameter_in = 7, rated_max_sfpm = 6500, grinder_rpm = 3450 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(wheel_diameter_in > 0)) return { error: "Wheel diameter must be positive (in)." };
  if (!(rated_max_sfpm > 0)) return { error: "Rated max surface speed must be positive (SFPM)." };
  if (!(grinder_rpm > 0)) return { error: "Grinder speed must be positive (RPM)." };
  // Surface speed SFPM = pi x D_in x RPM / 12 (in -> ft). Solve for the RPM that hits the rating.
  const max_rpm = rated_max_sfpm * 12 / (Math.PI * wheel_diameter_in);
  const actual_sfpm = Math.PI * wheel_diameter_in * grinder_rpm / 12;
  const margin_rpm = max_rpm - grinder_rpm;
  const within_rating = grinder_rpm <= max_rpm;
  if (![max_rpm, actual_sfpm, margin_rpm].every(Number.isFinite)) return { error: "Grinding-wheel speed math is not a finite value." };
  return {
    max_rpm,
    actual_sfpm,
    margin_rpm,
    within_rating,
    verdict: within_rating ? "WITHIN RATING" : "OVER RATED SPEED",
    note: "The wheel's rated maximum operating speed (in SFPM, printed on the wheel blotter) and the grinder nameplate govern -- NEVER mount a wheel on a machine whose spindle speed exceeds the wheel's rating; an over-speed wheel can burst. This converts the blotter SFPM rating to a maximum RPM for the wheel diameter and checks the grinder RPM against it. As the wheel wears down its safe RPM rises, but the machine speed is fixed. Per ANSI B7.1; the blotter and machine nameplate are the authority.",
  };
}

export const grindingWheelRpmExample = { inputs: { wheel_diameter_in: 7, rated_max_sfpm: 6500, grinder_rpm: 3450 } };

function _v911renderGrindingWheelRpm(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: surface speed identity by name. SFPM = pi x wheel diameter (in) x RPM / 12; max RPM = rated SFPM x 12 / (pi x diameter). Per ANSI B7.1; the wheel blotter rating and the machine nameplate govern -- never exceed the wheel's rated speed.";
  const wd = makeNumber("Wheel diameter (in)", "gwr-wd", { step: "any", min: "0", value: "7" });
  wd.input.value = "7";
  const rs = makeNumber("Wheel rated max speed (SFPM)", "gwr-rs", { step: "any", min: "0", value: "6500" });
  rs.input.value = "6500";
  const gr = makeNumber("Grinder speed (RPM)", "gwr-gr", { step: "any", min: "0", value: "3450" });
  gr.input.value = "3450";
  for (const f of [wd, rs, gr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { wd.input.value = "7"; rs.input.value = "6500"; gr.input.value = "3450"; update(); });
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "gwr-out-v");
  const oMax = makeOutputLine(outputRegion, "Max RPM for this wheel", "gwr-out-max");
  const oAct = makeOutputLine(outputRegion, "Surface speed at grinder RPM", "gwr-out-act");
  const update = debounce(() => {
    const r = computeGrindingWheelRpm({
      wheel_diameter_in: wd.input.value === "" ? 7 : Number(wd.input.value), rated_max_sfpm: rs.input.value === "" ? 6500 : Number(rs.input.value),
      grinder_rpm: gr.input.value === "" ? 3450 : Number(gr.input.value),
    });
    if (r.error) { oVerdict.textContent = r.error; oMax.textContent = "-"; oAct.textContent = "-"; return; }
    oVerdict.textContent = r.verdict + " (" + (r.margin_rpm >= 0 ? "+" : "") + fmt(r.margin_rpm, 0) + " RPM margin)";
    oMax.textContent = fmt(r.max_rpm, 0) + " RPM";
    oAct.textContent = fmt(r.actual_sfpm, 0) + " SFPM (rated " + fmt(Number(rs.input.value) || 6500, 0) + ")";
  }, DEBOUNCE_MS);
  for (const f of [wd, rs, gr]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["grinding-wheel-rpm"] = _v911renderGrindingWheelRpm;
