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
export const cuttingFluidConcentrationExample = { inputs: { brix_reading: 3.0, refractometer_factor: 2.0, sump_volume_gal: 50, target_pct: 8 } };
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
export const boringBarMaxOverhangExample = { inputs: { d_in: 0.75, f_lb: 100, allowable_deflection_in: 0.0154524, e_psi: 30e6 } };

function renderBoringBarMaxOverhang(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: cantilever deflection solved for overhang: L_max = (3 E I delta / F)^(1/3), I = pi d^4/64, E = 30e6 psi steel / ~90e6 carbide, with the practical L/d chatter limits, by name. Static solid-round model, not a stability-lobe analysis. A shop aid; the tool and setup govern.";
  const d = makeNumber("Bar / tool diameter d (in)", "bbmo-d", { step: "any", min: "0" });
  const f = makeNumber("Radial cutting force F (lb)", "bbmo-f", { step: "any", min: "0" });
  const delta = makeNumber("Allowable tip deflection (in)", "bbmo-delta", { step: "any", min: "0" });
  const e = makeNumber("Modulus E (psi: 30e6 steel, ~90e6 carbide)", "bbmo-e", { step: "any", min: "0" }); e.input.value = "30000000";
  for (const x of [d, f, delta, e]) inputRegion.appendChild(x.wrap);
  attachExampleButton(inputRegion, () => { d.input.value = "0.75"; f.input.value = "100"; delta.input.value = "0.0154524"; e.input.value = "30000000"; update(); });
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

// ===================== spec-v1219: worm and worm-wheel geometry =====================
// The one gear type absent from an otherwise complete Group K gear suite (spur geometry,
// identification, chordal thickness, undercut/backlash, Lewis bending, Barth dynamic). A worm drive
// is the right-angle, high-ratio, often self-locking pair used in hoists, jacks, and rotary tables.
// Machinery's Handbook, first-principles: lead L = axial pitch x starts; lead angle lambda =
// atan(L/(pi d_worm)); ratio = wheel teeth / worm starts; wheel pitch dia = N px / pi; center
// distance = (d_worm + d_wheel)/2; a small lead angle tends to self-lock (no back-driving).
// dims: in { axial_pitch_in: L, worm_starts: dimensionless, worm_pitch_dia_in: L, wheel_teeth: dimensionless } out: { lead_in: L, lead_angle_deg: dimensionless, gear_ratio: dimensionless, wheel_pitch_dia_in: L, center_distance_in: L }
export function computeWormGearGeometry({ axial_pitch_in = 0, worm_starts = 0, worm_pitch_dia_in = 0, wheel_teeth = 0 } = {}) {
  const _g = _finiteGuard({ axial_pitch_in, worm_starts, worm_pitch_dia_in, wheel_teeth }); if (_g) return _g;
  const px = Number(axial_pitch_in) || 0;
  const nw = Number(worm_starts) || 0;
  const dw = Number(worm_pitch_dia_in) || 0;
  const ng = Number(wheel_teeth) || 0;
  if (!(px > 0)) return { error: "Axial pitch must be positive (in)." };
  if (!(nw > 0)) return { error: "The number of worm starts (threads) must be positive (1 to 4 typical)." };
  if (!(dw > 0)) return { error: "Worm pitch diameter must be positive (in)." };
  if (!(ng > 0)) return { error: "The number of worm-wheel teeth must be positive." };
  const lead_in = px * nw;
  const lead_angle_deg = Math.atan(lead_in / (Math.PI * dw)) * 180 / Math.PI;
  const gear_ratio = ng / nw;
  const wheel_pitch_dia_in = ng * px / Math.PI;
  const center_distance_in = (dw + wheel_pitch_dia_in) / 2;
  const self_locking = lead_angle_deg < 5;
  if (![lead_in, lead_angle_deg, gear_ratio, wheel_pitch_dia_in, center_distance_in].every(Number.isFinite)) return { error: "Worm-gear math is not a finite value." };
  return {
    lead_in, lead_angle_deg, gear_ratio, wheel_pitch_dia_in, center_distance_in, self_locking,
    note: "Worm and worm-wheel geometry, the right-angle high-ratio pair the spur-gear suite leaves out. The worm is a screw whose axial pitch equals the wheel's circular pitch: the lead L = axial pitch x number of starts (the distance the wheel advances per worm turn), the lead angle lambda = atan(L/(pi x d_worm)), the gear ratio = wheel teeth / worm starts (a single-start worm on a 40-tooth wheel is 40:1 in one stage -- the reason worm drives give huge reductions compactly), the wheel pitch diameter = N x axial_pitch / pi, and the center distance = (d_worm + d_wheel)/2. The lead angle sets whether the drive back-drives: a small lead angle (below about 5 degrees, friction dependent) tends to SELF-LOCK, which is why a single-start, high-ratio worm is chosen for a hoist or jack that must hold its load, while a multi-start, low-ratio worm (steeper lead angle) back-drives freely. A 0.5 in axial pitch single-start worm of 2 in pitch diameter on a 40-tooth wheel gives a 0.5 in lead, a 4.55 degree lead angle (self-locking), a 40:1 ratio, a 6.37 in wheel, and a 4.18 in center distance. Geometry only -- the load rating, efficiency, and heat all depend on the material pair and lubrication. A shop aid; the gear drawing and the AGMA / Machinery's Handbook data govern.",
  };
}
export const wormGearGeometryExample = { inputs: { axial_pitch_in: 0.5, worm_starts: 1, worm_pitch_dia_in: 2, wheel_teeth: 40 } };
function renderWormGearGeometry(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: worm and worm-wheel geometry (Machinery's Handbook, first-principles): lead = axial pitch x starts, lead angle = atan(lead/(pi x worm pitch dia)), ratio = wheel teeth / starts, wheel pitch dia = N x axial pitch / pi, center distance = (d_worm + d_wheel)/2; a lead angle below ~5 degrees tends to self-lock. A shop aid; the gear drawing and the AGMA / Machinery's Handbook data govern.";
  const px = makeNumber("Worm axial pitch (in)", "wgg-px", { step: "any", min: "0" }); px.input.value = "0.5";
  const nw = makeNumber("Worm starts (threads, 1-4)", "wgg-nw", { step: "any", min: "0" }); nw.input.value = "1";
  const dw = makeNumber("Worm pitch diameter (in)", "wgg-dw", { step: "any", min: "0" }); dw.input.value = "2";
  const ng = makeNumber("Worm-wheel teeth N", "wgg-ng", { step: "any", min: "0" }); ng.input.value = "40";
  for (const f of [px, nw, dw, ng]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { px.input.value = "0.5"; nw.input.value = "1"; dw.input.value = "2"; ng.input.value = "40"; update(); });
  const oLead = makeOutputLine(outputRegion, "Lead / lead angle", "wgg-out-lead");
  const oRatio = makeOutputLine(outputRegion, "Gear ratio", "wgg-out-ratio");
  const oWheel = makeOutputLine(outputRegion, "Wheel pitch dia / center distance", "wgg-out-wheel");
  const oNote = makeOutputLine(outputRegion, "Note", "wgg-out-n");
  const update = debounce(() => {
    const r = computeWormGearGeometry({ axial_pitch_in: Number(px.input.value) || 0, worm_starts: Number(nw.input.value) || 0, worm_pitch_dia_in: Number(dw.input.value) || 0, wheel_teeth: Number(ng.input.value) || 0 });
    if (r.error) { oLead.textContent = r.error; oRatio.textContent = "-"; oWheel.textContent = "-"; oNote.textContent = ""; return; }
    oLead.textContent = fmt(r.lead_in, 3) + " in / " + fmt(r.lead_angle_deg, 2) + " deg" + (r.self_locking ? " (self-locking)" : " (back-drivable)");
    oRatio.textContent = fmt(r.gear_ratio, 2) + " : 1";
    oWheel.textContent = fmt(r.wheel_pitch_dia_in, 3) + " in / " + fmt(r.center_distance_in, 3) + " in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [px, nw, dw, ng]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["worm-gear-geometry"] = renderWormGearGeometry;

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

// ===================== spec-v1285: rolling-bearing dynamic equivalent load P (ISO 281) =====================
// Both bearing-l10-life and bearing-max-load take the equivalent dynamic load P as a GIVEN input; combining the
// actual radial load Fr and thrust Fa into that single P is the standard ISO 281 step upstream of both, and no
// tile produced it. For a single-row deep-groove ball bearing, P = X Fr + Y Fa, where the e-ratio and the thrust
// factor Y are interpolated from the standard ISO 281 / SKF table on Fa/C0 (C0 the basic static load rating). Below
// the e-ratio the pure radial load governs (X = 1, Y = 0, P = Fr); above it X = 0.56 and Y applies. With Fa = 0 the
// result is exactly P = Fr, chaining cleanly into bearing-l10-life.
// ISO 281 single-row deep-groove ball table: rows of [Fa/C0, e, Y] (X = 0.56 for Fa/Fr > e).
const BEARING_XY_TABLE = [
  [0.025, 0.22, 2.0], [0.04, 0.24, 1.8], [0.07, 0.27, 1.6],
  [0.13, 0.31, 1.4], [0.25, 0.37, 1.2], [0.50, 0.44, 1.0],
];
// dims: in { radial_load_lbf: M L T^-2, thrust_load_lbf: M L T^-2, static_rating_lbf: M L T^-2 } out: { equivalent_load_lbf: M L T^-2, e_ratio: dimensionless, x_factor: dimensionless, y_factor: dimensionless }
export function computeBearingEquivalentLoad({ radial_load_lbf = 0, thrust_load_lbf = 0, static_rating_lbf = 0 } = {}) {
  const _g = _finiteGuard({ radial_load_lbf, thrust_load_lbf, static_rating_lbf }); if (_g) return _g;
  const Fr = Number(radial_load_lbf) || 0;
  const Fa = Number(thrust_load_lbf) || 0;
  const C0 = Number(static_rating_lbf) || 0;
  if (!(Fr > 0)) return { error: "Radial load Fr must be positive (lbf)." };
  if (Fa < 0) return { error: "Thrust (axial) load Fa cannot be negative (lbf)." };
  if (!(C0 > 0)) return { error: "Basic static load rating C0 must be positive (lbf)." };
  const ratio = Fa / C0;
  // Interpolate e and Y from the ISO 281 table on Fa/C0 (clamped at the ends).
  let e, Y;
  if (ratio <= BEARING_XY_TABLE[0][0]) { e = BEARING_XY_TABLE[0][1]; Y = BEARING_XY_TABLE[0][2]; }
  else if (ratio >= BEARING_XY_TABLE[BEARING_XY_TABLE.length - 1][0]) { e = BEARING_XY_TABLE[BEARING_XY_TABLE.length - 1][1]; Y = BEARING_XY_TABLE[BEARING_XY_TABLE.length - 1][2]; }
  else {
    for (let i = 0; i < BEARING_XY_TABLE.length - 1; i++) {
      const [x0, e0, y0] = BEARING_XY_TABLE[i];
      const [x1, e1, y1] = BEARING_XY_TABLE[i + 1];
      if (ratio >= x0 && ratio <= x1) {
        const f = (ratio - x0) / (x1 - x0);
        e = e0 + f * (e1 - e0);
        Y = y0 + f * (y1 - y0);
        break;
      }
    }
  }
  const thrust_governs = Fa / Fr > e;
  const x_factor = thrust_governs ? 0.56 : 1;
  const y_factor = thrust_governs ? Y : 0;
  const equivalent_load_lbf = x_factor * Fr + y_factor * Fa;
  if (![e, Y, equivalent_load_lbf].every(Number.isFinite) || !(equivalent_load_lbf > 0)) return { error: "Equivalent-load math is not a finite value." };
  return {
    equivalent_load_lbf, e_ratio: e, x_factor, y_factor, thrust_governs, fa_over_fr: Fa / Fr,
    note: "ISO 281 dynamic equivalent load for a single-row deep-groove ball bearing, P = X Fr + Y Fa, the input the bearing-l10-life and bearing-max-load tiles need but do not compute. The thrust factor Y and the e-ratio come from the standard ISO 281 / SKF table interpolated on Fa/C0 (C0 the basic static load rating). If the thrust-to-radial ratio Fa/Fr is at or below e the pure radial load governs (X = 1, Y = 0, so P = Fr); above e the bearing carries the thrust as extra equivalent load with X = 0.56 and the interpolated Y. With Fa = 0 the result is exactly P = Fr, which feeds bearing-l10-life directly. Single-row radial deep-groove ball bearings, rotating inner ring (V = 1); angular-contact, tapered-, and spherical-roller bearings use the maker's bearing-specific factors. A planning estimate; ISO 281 and the bearing maker's catalogue govern.",
  };
}
export const bearingEquivalentLoadExample = { inputs: { radial_load_lbf: 1000, thrust_load_lbf: 500, static_rating_lbf: 5000 } };
function renderBearingEquivalentLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ISO 281 dynamic equivalent load P = X Fr + Y Fa for a single-row deep-groove ball bearing, with the e-ratio and thrust factor Y interpolated from the standard ISO 281 / SKF table on Fa/C0 (X = 0.56 above e; X = 1, Y = 0 at or below e). Feed P into bearing-l10-life. A planning estimate; ISO 281 and the bearing maker's catalogue govern.";
  const fr = makeNumber("Radial load Fr (lbf)", "beq-fr", { step: "any", min: "0" }); fr.input.value = "1000";
  const fa = makeNumber("Thrust (axial) load Fa (lbf)", "beq-fa", { step: "any", min: "0" }); fa.input.value = "500";
  const c0 = makeNumber("Basic static load rating C0 (lbf)", "beq-c0", { step: "any", min: "0" }); c0.input.value = "5000";
  for (const f of [fr, fa, c0]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { fr.input.value = "1000"; fa.input.value = "500"; c0.input.value = "5000"; update(); });
  const oP = makeOutputLine(outputRegion, "Equivalent dynamic load P", "beq-out-p");
  const oXY = makeOutputLine(outputRegion, "Factors used", "beq-out-xy");
  const oNote = makeOutputLine(outputRegion, "Note", "beq-out-n");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeBearingEquivalentLoad({ radial_load_lbf: readNum(fr.input), thrust_load_lbf: readNum(fa.input), static_rating_lbf: readNum(c0.input) });
    if (r.error) { oP.textContent = r.error; oXY.textContent = "-"; oNote.textContent = ""; return; }
    oP.textContent = fmt(r.equivalent_load_lbf, 0) + " lbf";
    oXY.textContent = "X = " + fmt(r.x_factor, 2) + ", Y = " + fmt(r.y_factor, 2) + ", e = " + fmt(r.e_ratio, 3) + (r.thrust_governs ? " (thrust governs)" : " (radial governs, P = Fr)");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [fr, fa, c0]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["bearing-equivalent-load"] = renderBearingEquivalentLoad;

// ===================== spec-v1286: fluctuating-stress fatigue safety factor (Goodman/Soderberg/Gerber) =====================
// The machine-design bench has the static checks (shaft-torsion, combined-stress-axial-bending, spring/gear
// stresses) but nothing for fatigue under a fluctuating load, which is how rotating shafts, springs, and fasteners
// actually fail. Standard alternating/mean-stress safety factor on the three failure lines, plus the Langer
// first-cycle-yield check. The corrected endurance limit Se is an INPUT so no Marin-factor tables are needed.
//   Goodman:   1/n = sa/Se + sm/Sut
//   Soderberg: 1/n = sa/Se + sm/Sy
//   Gerber:    n sa/Se + (n sm/Sut)^2 = 1  (solved for n)
//   Langer:    ny = Sy/(sa + sm);  governing = min(n, ny)
// dims: in { alternating_stress_psi: M L^-1 T^-2, mean_stress_psi: M L^-1 T^-2, endurance_limit_psi: M L^-1 T^-2, ultimate_strength_psi: M L^-1 T^-2, yield_strength_psi: M L^-1 T^-2, criterion: dimensionless } out: { fatigue_n: dimensionless, langer_ny: dimensionless, governing_n: dimensionless }
export function computeFatigueSafetyFactor({ alternating_stress_psi = 0, mean_stress_psi = 0, endurance_limit_psi = 0, ultimate_strength_psi = 0, yield_strength_psi = 0, criterion = "goodman" } = {}) {
  const _g = _finiteGuard({ alternating_stress_psi, mean_stress_psi, endurance_limit_psi, ultimate_strength_psi, yield_strength_psi }); if (_g) return _g;
  const sa = Number(alternating_stress_psi) || 0;
  const sm = Number(mean_stress_psi) || 0;
  const Se = Number(endurance_limit_psi) || 0;
  const Sut = Number(ultimate_strength_psi) || 0;
  const Sy = Number(yield_strength_psi) || 0;
  const crit = String(criterion);
  if (sa < 0) return { error: "Alternating stress cannot be negative (psi)." };
  if (sm < 0) return { error: "Mean stress cannot be negative (psi); this tile treats the tensile-mean case." };
  if (!(sa + sm > 0)) return { error: "The total stress (alternating + mean) must be positive (psi)." };
  if (!(Se > 0)) return { error: "Corrected endurance limit Se must be positive (psi)." };
  if (!(Sut > 0)) return { error: "Ultimate strength Sut must be positive (psi)." };
  if (!(Sy > 0)) return { error: "Yield strength Sy must be positive (psi)." };
  if (crit !== "goodman" && crit !== "soderberg" && crit !== "gerber") return { error: "Criterion must be goodman, soderberg, or gerber." };
  let fatigue_n;
  if (crit === "goodman") {
    fatigue_n = 1 / (sa / Se + sm / Sut);
  } else if (crit === "soderberg") {
    fatigue_n = 1 / (sa / Se + sm / Sy);
  } else { // gerber: (sm^2/Sut^2) n^2 + (sa/Se) n - 1 = 0
    const a = (sm * sm) / (Sut * Sut);
    const b = sa / Se;
    fatigue_n = a === 0 ? Se / sa : (-b + Math.sqrt(b * b + 4 * a)) / (2 * a);
  }
  const langer_ny = Sy / (sa + sm);
  const governing_n = Math.min(fatigue_n, langer_ny);
  if (![fatigue_n, langer_ny, governing_n].every(Number.isFinite) || !(fatigue_n > 0)) return { error: "Fatigue math is not a finite value; check the inputs." };
  const governs = governing_n === langer_ny && langer_ny < fatigue_n ? "first-cycle yield (Langer)" : "fatigue";
  return {
    fatigue_n, langer_ny, governing_n, governs,
    note: "Infinite-life fatigue safety factor for a uniaxial fluctuating stress, with the alternating amplitude sigma_a and the mean (midrange) sigma_m. Modified Goodman 1/n = sa/Se + sm/Sut is the standard design line; Soderberg 1/n = sa/Se + sm/Sy is the most conservative (it never yields); Gerber n sa/Se + (n sm/Sut)^2 = 1 is the least conservative and the best fit to test data. Se is the CORRECTED endurance limit (Se' ~= 0.5 Sut for steel with Sut < 200 ksi, times the Marin surface/size/load/temperature/reliability factors) and is an input here so the tile needs no material tables. The Langer line ny = Sy/(sa + sm) catches first-cycle yielding, which can govern at high mean stress; the reported governing factor is the smaller of the two. With sigma_m = 0 (fully reversed) every criterion gives n = Se/sigma_a. Uniaxial stress, infinite life; building Se from the Marin factors, notch sensitivity (Kf), finite-life S-N counting, and multiaxial combination are separate. A design aid; Shigley / Juvinall and the engineer of record govern.",
  };
}
export const fatigueSafetyFactorExample = { inputs: { alternating_stress_psi: 25000, mean_stress_psi: 30000, endurance_limit_psi: 40000, ultimate_strength_psi: 100000, yield_strength_psi: 80000, criterion: "goodman" } };
function renderFatigueSafetyFactor(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: fluctuating-stress fatigue criteria (Shigley, Mechanical Engineering Design; Juvinall): modified Goodman 1/n = sa/Se + sm/Sut, Soderberg 1/n = sa/Se + sm/Sy, Gerber n sa/Se + (n sm/Sut)^2 = 1, with the Langer first-cycle-yield line ny = Sy/(sa + sm). Se is the corrected endurance limit (an input). Infinite-life, uniaxial; the engineer of record governs.";
  const sa = makeNumber("Alternating stress sigma_a (psi)", "fat-sa", { step: "any", min: "0" }); sa.input.value = "25000";
  const sm = makeNumber("Mean stress sigma_m (psi)", "fat-sm", { step: "any", min: "0" }); sm.input.value = "30000";
  const se = makeNumber("Corrected endurance limit Se (psi)", "fat-se", { step: "any", min: "0" }); se.input.value = "40000";
  const sut = makeNumber("Ultimate strength Sut (psi)", "fat-sut", { step: "any", min: "0" }); sut.input.value = "100000";
  const sy = makeNumber("Yield strength Sy (psi)", "fat-sy", { step: "any", min: "0" }); sy.input.value = "80000";
  const crit = makeSelect("Criterion", "fat-crit", [
    { value: "goodman", label: "Modified Goodman (standard)", selected: true },
    { value: "soderberg", label: "Soderberg (conservative)" },
    { value: "gerber", label: "Gerber (best data fit)" },
  ]);
  for (const f of [sa, sm, se, sut, sy, crit]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sa.input.value = "25000"; sm.input.value = "30000"; se.input.value = "40000"; sut.input.value = "100000"; sy.input.value = "80000"; crit.select.value = "goodman"; update(); });
  const oN = makeOutputLine(outputRegion, "Fatigue safety factor n", "fat-out-n");
  const oNy = makeOutputLine(outputRegion, "First-cycle yield factor n_y", "fat-out-ny");
  const oGov = makeOutputLine(outputRegion, "Governing", "fat-out-gov");
  const oNote = makeOutputLine(outputRegion, "Note", "fat-out-note");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeFatigueSafetyFactor({ alternating_stress_psi: readNum(sa.input), mean_stress_psi: readNum(sm.input), endurance_limit_psi: readNum(se.input), ultimate_strength_psi: readNum(sut.input), yield_strength_psi: readNum(sy.input), criterion: crit.select.value });
    if (r.error) { oN.textContent = r.error; oNy.textContent = "-"; oGov.textContent = "-"; oNote.textContent = ""; return; }
    oN.textContent = fmt(r.fatigue_n, 2);
    oNy.textContent = fmt(r.langer_ny, 2);
    oGov.textContent = "n = " + fmt(r.governing_n, 2) + " (" + r.governs + (r.governing_n < 1 ? "; UNSAFE, n < 1" : "") + ")";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [sa, sm, se, sut, sy]) f.input.addEventListener("input", update);
  crit.select.addEventListener("change", update);
}
MACHINING_RENDERERS["fatigue-safety-factor"] = renderFatigueSafetyFactor;

// ===================== spec-v1287: corrected endurance limit (Shigley Marin factors) =====================
// fatigue-safety-factor takes the CORRECTED endurance limit Se as an input and names building it "from the Marin
// factors" as separate. This is that step: Se = ka kb kc kd ke Se', the Shigley Ch.6 correction that turns the
// ultimate strength into the real endurance limit, feeding the fatigue tile. Se' = 0.5 Sut (steel, Sut <= 200 ksi).
// The a/b surface constants use Sut in kpsi; output is in psi so it drops straight into fatigue-safety-factor.
const MARIN_SURFACE = {
  ground: { a: 1.34, b: -0.085, label: "Ground" },
  machined: { a: 2.70, b: -0.265, label: "Machined / cold-drawn" },
  "hot-rolled": { a: 14.4, b: -0.718, label: "Hot-rolled" },
  "as-forged": { a: 39.9, b: -0.995, label: "As-forged" },
};
const MARIN_RELIABILITY = { "50": 1.0, "90": 0.897, "95": 0.868, "99": 0.814, "99.9": 0.753 };
const MARIN_KC = { bending: 1.0, axial: 0.85, torsion: 0.59 };
// dims: in { ultimate_strength_psi: M L^-1 T^-2, surface_finish: dimensionless, diameter_in: L, load_type: dimensionless, reliability_pct: dimensionless, temperature_factor_kd: dimensionless } out: { endurance_limit_psi: M L^-1 T^-2, uncorrected_se_psi: M L^-1 T^-2, ka: dimensionless, kb: dimensionless, kc: dimensionless, ke: dimensionless }
export function computeEnduranceLimitMarin({ ultimate_strength_psi = 0, surface_finish = "machined", diameter_in = 1, load_type = "bending", reliability_pct = "99", temperature_factor_kd = 1 } = {}) {
  const _g = _finiteGuard({ ultimate_strength_psi, diameter_in, temperature_factor_kd }); if (_g) return _g;
  const Sut = Number(ultimate_strength_psi) || 0;
  const d = Number(diameter_in) || 0;
  const kd = Number(temperature_factor_kd) || 0;
  const surf = MARIN_SURFACE[surface_finish];
  const kc = MARIN_KC[load_type];
  const ke = MARIN_RELIABILITY[String(reliability_pct)];
  if (!(Sut > 0)) return { error: "Ultimate strength Sut must be positive (psi)." };
  if (!surf) return { error: "Surface finish must be ground, machined, hot-rolled, or as-forged." };
  if (kc === undefined) return { error: "Load type must be bending, axial, or torsion." };
  if (ke === undefined) return { error: "Reliability must be 50, 90, 95, 99, or 99.9 (%)." };
  if (!(kd > 0)) return { error: "Temperature factor kd must be positive." };
  const Sut_ksi = Sut / 1000;
  const uncorrected_se_psi = Sut_ksi <= 200 ? 0.5 * Sut : 100000; // steel rotating-beam limit, capped at 100 ksi
  const ka = surf.a * Math.pow(Sut_ksi, surf.b);
  let kb;
  if (load_type === "axial") {
    kb = 1; // size factor does not apply to axial loading
  } else {
    if (!(d >= 0.11 && d <= 10)) return { error: "Diameter must be 0.11-10 in for the bending/torsion size factor (axial ignores it)." };
    kb = d <= 2 ? 0.879 * Math.pow(d, -0.107) : 0.91 * Math.pow(d, -0.157);
  }
  const endurance_limit_psi = ka * kb * kc * kd * ke * uncorrected_se_psi;
  if (![ka, kb, kc, ke, endurance_limit_psi].every(Number.isFinite) || !(endurance_limit_psi > 0)) return { error: "Endurance-limit math is not a finite value; check the inputs." };
  return {
    endurance_limit_psi, uncorrected_se_psi, ka, kb, kc, kd, ke,
    note: "The corrected endurance limit Se = ka kb kc kd ke Se' (Shigley Ch. 6 Marin equation), the input the fatigue-safety-factor tile needs. Se' is the rotating-beam limit, 0.5 Sut for steel with Sut <= 200 ksi (capped at 100 ksi above that). ka = a (Sut in kpsi)^b corrects for surface finish (ground 1.34/-0.085, machined 2.70/-0.265, hot-rolled 14.4/-0.718, as-forged 39.9/-0.995); kb is the size factor 0.879 d^-0.107 (0.11-2 in) or 0.91 d^-0.157 (2-10 in) for rotating bending/torsion, and 1 for axial loading; kc is the load factor (1 bending, 0.85 axial, 0.59 torsion); kd the temperature factor (1 at room temperature); ke the reliability factor (0.897 at 90%, 0.814 at 99%). The five factors typically cut the raw 0.5 Sut roughly in half, which is why a part sized on Se' alone can be fatigue-unsafe. Feed Se into fatigue-safety-factor. Steel; non-steel materials, stress concentration (Kf), and finite-life S-N reductions are separate. A design aid; Shigley and the engineer of record govern.",
  };
}
export const enduranceLimitMarinExample = { inputs: { ultimate_strength_psi: 105000, surface_finish: "machined", diameter_in: 1, load_type: "bending", reliability_pct: "99", temperature_factor_kd: 1 } };
function renderEnduranceLimitMarin(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: corrected endurance limit Se = ka kb kc kd ke Se' with the Shigley Marin factors (Mechanical Engineering Design, Ch. 6): Se' = 0.5 Sut (steel, Sut <= 200 ksi); ka = a Sut_ksi^b by surface finish; kb the size factor; kc the load factor (1/0.85/0.59); kd temperature; ke reliability. Steel; feed Se into fatigue-safety-factor. A design aid; Shigley and the engineer of record govern.";
  const sut = makeNumber("Ultimate strength Sut (psi)", "elm-sut", { step: "any", min: "0" }); sut.input.value = "105000";
  const surf = makeSelect("Surface finish", "elm-surf", Object.keys(MARIN_SURFACE).map((k) => ({ value: k, label: MARIN_SURFACE[k].label, selected: k === "machined" })));
  const d = makeNumber("Diameter d (in)", "elm-d", { step: "any", min: "0" }); d.input.value = "1";
  const load = makeSelect("Load type", "elm-load", [
    { value: "bending", label: "Rotating bending (kc = 1)", selected: true },
    { value: "axial", label: "Axial (kc = 0.85, kb = 1)" },
    { value: "torsion", label: "Torsion (kc = 0.59)" },
  ]);
  const rel = makeSelect("Reliability", "elm-rel", [
    { value: "50", label: "50% (ke = 1.00)" },
    { value: "90", label: "90% (ke = 0.897)" },
    { value: "95", label: "95% (ke = 0.868)" },
    { value: "99", label: "99% (ke = 0.814)", selected: true },
    { value: "99.9", label: "99.9% (ke = 0.753)" },
  ]);
  const kd = makeNumber("Temperature factor kd", "elm-kd", { step: "any", min: "0" }); kd.input.value = "1";
  for (const f of [sut, surf, d, load, rel, kd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sut.input.value = "105000"; surf.select.value = "machined"; d.input.value = "1"; load.select.value = "bending"; rel.select.value = "99"; kd.input.value = "1"; update(); });
  const oSe = makeOutputLine(outputRegion, "Corrected endurance limit Se", "elm-out-se");
  const oFac = makeOutputLine(outputRegion, "Marin factors", "elm-out-fac");
  const oNote = makeOutputLine(outputRegion, "Note", "elm-out-note");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeEnduranceLimitMarin({ ultimate_strength_psi: readNum(sut.input), surface_finish: surf.select.value, diameter_in: readNum(d.input), load_type: load.select.value, reliability_pct: rel.select.value, temperature_factor_kd: readNum(kd.input) });
    if (r.error) { oSe.textContent = r.error; oFac.textContent = "-"; oNote.textContent = ""; return; }
    oSe.textContent = fmt(r.endurance_limit_psi, 0) + " psi (from Se' = " + fmt(r.uncorrected_se_psi, 0) + " psi)";
    oFac.textContent = "ka = " + fmt(r.ka, 3) + ", kb = " + fmt(r.kb, 3) + ", kc = " + fmt(r.kc, 2) + ", kd = " + fmt(r.kd, 2) + ", ke = " + fmt(r.ke, 3);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [sut, d, kd]) f.input.addEventListener("input", update);
  for (const f of [surf, load, rel]) f.select.addEventListener("change", update);
}
MACHINING_RENDERERS["endurance-limit-marin"] = renderEnduranceLimitMarin;

// ===================== spec-v1288: power-screw torque, efficiency, and self-locking (Shigley Ch. 8) =====================
// acme-thread-depth / stub-acme-thread-depth give lead-screw GEOMETRY and name the use ("vises, presses, lead
// screws"), but the mechanics - the torque to raise or lower a load and whether the screw back-drives - was never
// built. Standard Shigley power-screw equations with the thread half-angle correction and the collar term:
//   T_raise = (F dm/2)(l + pi mu dm sec_a)/(pi dm - mu l sec_a) + F muc dc/2
//   T_lower = (F dm/2)(pi mu dm sec_a - l)/(pi dm + mu l sec_a) + F muc dc/2
//   efficiency = F l/(2 pi T_raise); self-locking if pi mu dm sec_a > l.
const SCREW_THREAD_HALF_ANGLE = { square: 0, acme: 14.5, unified: 30 };
// dims: in { axial_load_lbf: M L T^-2, mean_diameter_in: L, lead_in: L, thread_friction: dimensionless, collar_friction: dimensionless, collar_diameter_in: L, thread_form: dimensionless } out: { raise_torque_in_lbf: M L^2 T^-2, lower_torque_in_lbf: M L^2 T^-2, efficiency_pct: dimensionless, lead_angle_deg: dimensionless }
export function computePowerScrewTorque({ axial_load_lbf = 0, mean_diameter_in = 0, lead_in = 0, thread_friction = 0.15, collar_friction = 0.15, collar_diameter_in = 0, thread_form = "acme" } = {}) {
  const _g = _finiteGuard({ axial_load_lbf, mean_diameter_in, lead_in, thread_friction, collar_friction, collar_diameter_in }); if (_g) return _g;
  const F = Number(axial_load_lbf) || 0;
  const dm = Number(mean_diameter_in) || 0;
  const l = Number(lead_in) || 0;
  const mu = Number(thread_friction) || 0;
  const muc = Number(collar_friction) || 0;
  const dc = Number(collar_diameter_in) || 0;
  const halfAngle = SCREW_THREAD_HALF_ANGLE[thread_form];
  if (!(F > 0)) return { error: "Axial load F must be positive (lbf)." };
  if (!(dm > 0)) return { error: "Mean thread diameter dm must be positive (in)." };
  if (!(l > 0)) return { error: "Lead l (pitch x starts) must be positive (in)." };
  if (mu < 0) return { error: "Thread friction coefficient cannot be negative." };
  if (muc < 0) return { error: "Collar friction coefficient cannot be negative." };
  if (dc < 0) return { error: "Collar mean diameter cannot be negative (in)." };
  if (halfAngle === undefined) return { error: "Thread form must be square, acme, or unified." };
  const sec_a = 1 / Math.cos((halfAngle * Math.PI) / 180);
  const raiseDen = Math.PI * dm - mu * l * sec_a;
  if (!(raiseDen > 0)) return { error: "Thread friction is too high for this lead: the raising-torque denominator is non-positive." };
  const collar = (F * muc * dc) / 2;
  const raise_thread = (F * dm / 2) * (l + Math.PI * mu * dm * sec_a) / raiseDen;
  const lower_thread = (F * dm / 2) * (Math.PI * mu * dm * sec_a - l) / (Math.PI * dm + mu * l * sec_a);
  const raise_torque_in_lbf = raise_thread + collar;
  const lower_torque_in_lbf = lower_thread + collar;
  const efficiency_pct = (F * l) / (2 * Math.PI * raise_torque_in_lbf) * 100;
  const lead_angle_deg = Math.atan(l / (Math.PI * dm)) * 180 / Math.PI;
  const self_locking = lower_thread > 0;
  if (![raise_torque_in_lbf, lower_torque_in_lbf, efficiency_pct, lead_angle_deg].every(Number.isFinite) || !(raise_torque_in_lbf > 0)) return { error: "Power-screw math is not a finite value; check the inputs." };
  return {
    raise_torque_in_lbf, lower_torque_in_lbf, efficiency_pct, lead_angle_deg, self_locking, thread_half_angle_deg: halfAngle,
    note: "Power-screw torque to raise and lower an axial load F on a screw of mean diameter dm and lead l (pitch x starts), with thread friction mu and a collar (thrust-face) of mean diameter dc at friction muc. T_raise = (F dm/2)(l + pi mu dm sec_a)/(pi dm - mu l sec_a) + F muc dc/2 and T_lower uses (pi mu dm sec_a - l)/(pi dm + mu l sec_a), where sec_a = 1/cos of the thread half-angle (square 0, Acme 14.5, Unified 30 deg). Efficiency = F l/(2 pi T_raise). The screw is SELF-LOCKING (holds the load with no brake) when the lowering thread torque is positive, i.e. pi mu dm sec_a > l; a steep lead or slick thread back-drives. The collar term is added to both directions and often dominates - use a thrust bearing (dc small) to recover efficiency. Single power screw; column buckling of a long screw, thread bearing/shear stress, and wear life are separate. A design aid; Shigley and the maker govern.",
  };
}
export const powerScrewTorqueExample = { inputs: { axial_load_lbf: 1000, mean_diameter_in: 1.0, lead_in: 0.2, thread_friction: 0.15, collar_friction: 0.15, collar_diameter_in: 1.5, thread_form: "acme" } };
function renderPowerScrewTorque(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: power-screw raising/lowering torque (Shigley, Mechanical Engineering Design, Ch. 8): T_raise = (F dm/2)(l + pi mu dm sec_a)/(pi dm - mu l sec_a) + F muc dc/2, T_lower with (pi mu dm sec_a - l)/(pi dm + mu l sec_a), sec_a = 1/cos of the thread half-angle (square 0, Acme 14.5, Unified 30 deg). Efficiency = F l/(2 pi T_raise); self-locking if pi mu dm sec_a > l. A design aid; Shigley and the maker govern.";
  const F = makeNumber("Axial load F (lbf)", "pst-f", { step: "any", min: "0" }); F.input.value = "1000";
  const dm = makeNumber("Mean thread diameter dm (in)", "pst-dm", { step: "any", min: "0" }); dm.input.value = "1.0";
  const l = makeNumber("Lead l = pitch x starts (in)", "pst-l", { step: "any", min: "0" }); l.input.value = "0.2";
  const mu = makeNumber("Thread friction coefficient", "pst-mu", { step: "any", min: "0" }); mu.input.value = "0.15";
  const muc = makeNumber("Collar friction coefficient", "pst-muc", { step: "any", min: "0" }); muc.input.value = "0.15";
  const dc = makeNumber("Collar mean diameter dc (in, 0 = thrust bearing)", "pst-dc", { step: "any", min: "0" }); dc.input.value = "1.5";
  const form = makeSelect("Thread form", "pst-form", [
    { value: "square", label: "Square (half-angle 0)" },
    { value: "acme", label: "Acme (half-angle 14.5 deg)", selected: true },
    { value: "unified", label: "Unified / 60 deg (half-angle 30 deg)" },
  ]);
  for (const f of [F, dm, l, mu, muc, dc, form]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { F.input.value = "1000"; dm.input.value = "1.0"; l.input.value = "0.2"; mu.input.value = "0.15"; muc.input.value = "0.15"; dc.input.value = "1.5"; form.select.value = "acme"; update(); });
  const oR = makeOutputLine(outputRegion, "Torque to raise the load", "pst-out-r");
  const oL = makeOutputLine(outputRegion, "Torque to lower the load", "pst-out-l");
  const oE = makeOutputLine(outputRegion, "Efficiency", "pst-out-e");
  const oS = makeOutputLine(outputRegion, "Self-locking", "pst-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "pst-out-note");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computePowerScrewTorque({ axial_load_lbf: readNum(F.input), mean_diameter_in: readNum(dm.input), lead_in: readNum(l.input), thread_friction: readNum(mu.input), collar_friction: readNum(muc.input), collar_diameter_in: readNum(dc.input), thread_form: form.select.value });
    if (r.error) { oR.textContent = r.error; oL.textContent = "-"; oE.textContent = "-"; oS.textContent = "-"; oNote.textContent = ""; return; }
    oR.textContent = fmt(r.raise_torque_in_lbf, 1) + " in-lbf";
    oL.textContent = fmt(r.lower_torque_in_lbf, 1) + " in-lbf" + (r.lower_torque_in_lbf < 0 ? " (negative: the load back-drives the screw)" : "");
    oE.textContent = fmt(r.efficiency_pct, 1) + "% (lead angle " + fmt(r.lead_angle_deg, 2) + " deg)";
    oS.textContent = r.self_locking ? "Yes - holds the load with no brake" : "No - the load runs the screw back down";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [F, dm, l, mu, muc, dc]) f.input.addEventListener("input", update);
  form.select.addEventListener("change", update);
}
MACHINING_RENDERERS["power-screw-torque"] = renderPowerScrewTorque;

// ===================== spec-v1289: disk clutch / brake friction torque (Shigley Ch. 16) =====================
// The power-transmission bench has belts, gears, and the power screw but nothing for the friction torque a disk
// clutch or plate brake transmits from its clamping force. Standard Shigley Ch. 16, both models:
//   Uniform wear:     T = F mu N (ro + ri)/2          (p max at inner radius; the conservative design value)
//   Uniform pressure: T = (2/3) F mu N (ro^3 - ri^3)/(ro^2 - ri^2)
//   Max contact pressure (uniform wear): p_max = F/(2 pi ri (ro - ri))
// dims: in { clamp_force_lbf: M L T^-2, friction_coefficient: dimensionless, outer_radius_in: L, inner_radius_in: L, friction_surfaces: dimensionless } out: { uniform_wear_torque_in_lbf: M L^2 T^-2, uniform_pressure_torque_in_lbf: M L^2 T^-2, max_pressure_psi: M L^-1 T^-2 }
export function computeDiskClutchTorque({ clamp_force_lbf = 0, friction_coefficient = 0.3, outer_radius_in = 0, inner_radius_in = 0, friction_surfaces = 1 } = {}) {
  const _g = _finiteGuard({ clamp_force_lbf, friction_coefficient, outer_radius_in, inner_radius_in, friction_surfaces }); if (_g) return _g;
  const F = Number(clamp_force_lbf) || 0;
  const mu = Number(friction_coefficient) || 0;
  const ro = Number(outer_radius_in) || 0;
  const ri = Number(inner_radius_in) || 0;
  const N = Number(friction_surfaces) || 0;
  if (!(F > 0)) return { error: "Clamp force F must be positive (lbf)." };
  if (!(mu > 0)) return { error: "Friction coefficient must be positive." };
  if (!(ro > 0)) return { error: "Outer radius ro must be positive (in)." };
  if (!(ri > 0)) return { error: "Inner radius ri must be positive (in)." };
  if (!(ri < ro)) return { error: "Inner radius must be less than the outer radius (in)." };
  if (!(N >= 1)) return { error: "Number of friction surfaces must be at least 1." };
  const uniform_wear_torque_in_lbf = F * mu * N * (ro + ri) / 2;
  const uniform_pressure_torque_in_lbf = (2 / 3) * F * mu * N * (Math.pow(ro, 3) - Math.pow(ri, 3)) / (Math.pow(ro, 2) - Math.pow(ri, 2));
  const max_pressure_psi = F / (2 * Math.PI * ri * (ro - ri));
  if (![uniform_wear_torque_in_lbf, uniform_pressure_torque_in_lbf, max_pressure_psi].every(Number.isFinite) || !(uniform_wear_torque_in_lbf > 0)) return { error: "Clutch-torque math is not a finite value; check the inputs." };
  return {
    uniform_wear_torque_in_lbf, uniform_pressure_torque_in_lbf, max_pressure_psi, friction_surfaces: N,
    note: "The friction torque a disk clutch or plate (disk) brake can transmit before slipping, from the axial clamp force F, facing friction mu, outer/inner friction radii ro/ri, and the number of friction interfaces N (a single-plate clutch clamps both faces, N = 2). Uniform WEAR T = F mu N (ro + ri)/2 is the design standard: a facing wears fastest where pressure x velocity is highest, so p x r drives to a constant and the pressure peaks at the inner radius, p_max = F/(2 pi ri (ro - ri)); this gives the lower, conservative torque. Uniform PRESSURE T = (2/3) F mu N (ro^3 - ri^3)/(ro^2 - ri^2) applies to a fresh, rigid facing and runs a little higher. The two converge as the friction ring narrows. The actuating force F is an input (spring or hydraulic cylinder); heat and energy of engagement, facing wear life, cone and band brakes, and self-energizing effects are separate. A design aid; Shigley and the facing maker govern.",
  };
}
export const diskClutchTorqueExample = { inputs: { clamp_force_lbf: 1000, friction_coefficient: 0.3, outer_radius_in: 3, inner_radius_in: 2, friction_surfaces: 1 } };
function renderDiskClutchTorque(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: disk-clutch friction torque (Shigley, Mechanical Engineering Design, Ch. 16): uniform wear T = F mu N (ro + ri)/2 (p max at the inner radius, the design value), uniform pressure T = (2/3) F mu N (ro^3 - ri^3)/(ro^2 - ri^2), and max contact pressure p_max = F/(2 pi ri (ro - ri)). N is the number of friction interfaces. A design aid; Shigley and the facing maker govern.";
  const F = makeNumber("Axial clamp force F (lbf)", "dct-f", { step: "any", min: "0" }); F.input.value = "1000";
  const mu = makeNumber("Friction coefficient", "dct-mu", { step: "any", min: "0" }); mu.input.value = "0.3";
  const ro = makeNumber("Outer friction radius ro (in)", "dct-ro", { step: "any", min: "0" }); ro.input.value = "3";
  const ri = makeNumber("Inner friction radius ri (in)", "dct-ri", { step: "any", min: "0" }); ri.input.value = "2";
  const N = makeNumber("Friction surfaces N (single plate = 2)", "dct-n", { step: "1", min: "1" }); N.input.value = "1";
  for (const f of [F, mu, ro, ri, N]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { F.input.value = "1000"; mu.input.value = "0.3"; ro.input.value = "3"; ri.input.value = "2"; N.input.value = "1"; update(); });
  const oW = makeOutputLine(outputRegion, "Torque (uniform wear, design)", "dct-out-w");
  const oP = makeOutputLine(outputRegion, "Torque (uniform pressure)", "dct-out-p");
  const oPr = makeOutputLine(outputRegion, "Max contact pressure", "dct-out-pr");
  const oNote = makeOutputLine(outputRegion, "Note", "dct-out-note");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeDiskClutchTorque({ clamp_force_lbf: readNum(F.input), friction_coefficient: readNum(mu.input), outer_radius_in: readNum(ro.input), inner_radius_in: readNum(ri.input), friction_surfaces: readNum(N.input) });
    if (r.error) { oW.textContent = r.error; oP.textContent = "-"; oPr.textContent = "-"; oNote.textContent = ""; return; }
    oW.textContent = fmt(r.uniform_wear_torque_in_lbf, 1) + " in-lbf (" + fmt(r.uniform_wear_torque_in_lbf / 12, 1) + " ft-lbf)";
    oP.textContent = fmt(r.uniform_pressure_torque_in_lbf, 1) + " in-lbf";
    oPr.textContent = fmt(r.max_pressure_psi, 1) + " psi (at the inner radius)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [F, mu, ro, ri, N]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["disk-clutch-torque"] = renderDiskClutchTorque;

// ===================== spec-v1290: Euler-Johnson column critical buckling load (Shigley Ch. 4) =====================
// The catalog buckles wood (NDS), concrete (ACI), and AISC steel columns, but has no general Euler-Johnson check for
// a machine member (lead screw, push rod, link, strut); power-screw-torque names "column buckling of a long screw"
// as separate. Euler for long columns, the J.B. Johnson parabola for intermediate, split at the transition
// slenderness SR_D = pi sqrt(2 E/Sy): the parabola caps the short-column load at the squash load A Sy where the
// Euler hyperbola would wrongly run to infinity.
const COLUMN_END_K = {
  "pinned-pinned": { k: 1.0, label: "Pinned-pinned (K = 1.0)" },
  "fixed-free": { k: 2.0, label: "Fixed-free / cantilever (K = 2.0)" },
  "fixed-fixed": { k: 0.5, label: "Fixed-fixed (K = 0.5)" },
  "fixed-pinned": { k: 0.7, label: "Fixed-pinned (K = 0.7)" },
};
// dims: in { modulus_psi: M L^-1 T^-2, yield_strength_psi: M L^-1 T^-2, moment_of_inertia_in4: L^4, area_in2: L^2, length_in: L, end_condition: dimensionless } out: { critical_load_lbf: M L T^-2, critical_stress_psi: M L^-1 T^-2, slenderness_ratio: dimensionless, transition_slenderness: dimensionless, radius_of_gyration_in: L }
export function computeEulerJohnsonColumn({ modulus_psi = 30000000, yield_strength_psi = 0, moment_of_inertia_in4 = 0, area_in2 = 0, length_in = 0, end_condition = "pinned-pinned" } = {}) {
  const _g = _finiteGuard({ modulus_psi, yield_strength_psi, moment_of_inertia_in4, area_in2, length_in }); if (_g) return _g;
  const E = Number(modulus_psi) || 0;
  const Sy = Number(yield_strength_psi) || 0;
  const I = Number(moment_of_inertia_in4) || 0;
  const A = Number(area_in2) || 0;
  const L = Number(length_in) || 0;
  const end = COLUMN_END_K[end_condition];
  if (!(E > 0)) return { error: "Modulus of elasticity E must be positive (psi)." };
  if (!(Sy > 0)) return { error: "Yield strength Sy must be positive (psi)." };
  if (!(I > 0)) return { error: "Moment of inertia I must be positive (in^4)." };
  if (!(A > 0)) return { error: "Cross-section area A must be positive (in^2)." };
  if (!(L > 0)) return { error: "Length L must be positive (in)." };
  if (!end) return { error: "End condition must be pinned-pinned, fixed-free, fixed-fixed, or fixed-pinned." };
  const K = end.k;
  const radius_of_gyration_in = Math.sqrt(I / A);
  const slenderness_ratio = (K * L) / radius_of_gyration_in;
  const transition_slenderness = Math.PI * Math.sqrt((2 * E) / Sy);
  let critical_load_lbf, mode;
  if (slenderness_ratio >= transition_slenderness) {
    critical_load_lbf = (Math.PI * Math.PI * E * I) / Math.pow(K * L, 2); // Euler
    mode = "Euler (long column, elastic buckling)";
  } else {
    critical_load_lbf = A * (Sy - Math.pow((Sy * slenderness_ratio) / (2 * Math.PI), 2) / E); // J.B. Johnson
    mode = "Johnson (intermediate column)";
  }
  const critical_stress_psi = critical_load_lbf / A;
  if (![critical_load_lbf, critical_stress_psi, slenderness_ratio, transition_slenderness].every(Number.isFinite) || !(critical_load_lbf > 0)) return { error: "Column-buckling math is not a finite value; check the inputs." };
  return {
    critical_load_lbf, critical_stress_psi, slenderness_ratio, transition_slenderness, radius_of_gyration_in, effective_length_factor: K, mode,
    note: "Concentric critical buckling load of a straight, prismatic column by the Euler and J.B. Johnson formulas (Shigley Ch. 4). The radius of gyration r = sqrt(I/A) and the effective slenderness SR = K L/r set the behavior against the transition SR_D = pi sqrt(2 E/Sy). A long column (SR >= SR_D) buckles elastically, Pcr = pi^2 E I/(K L)^2 (Euler), and the load drops with the square of the length. An intermediate column (SR < SR_D) follows the Johnson parabola Pcr = A[Sy - (Sy SR/(2 pi))^2/E], which is tangent to the Euler curve at SR_D and to the squash load A Sy at SR = 0, so it correctly caps the short-column load where the Euler hyperbola would run to infinity. K is the end-condition factor (pinned-pinned 1.0, fixed-free 2.0, fixed-fixed 0.5, fixed-pinned 0.7, theoretical). Concentric load only; the secant formula (eccentric load), local/flange buckling, and code-specific steel/wood/concrete provisions are separate. Apply a safety factor to Pcr. A design aid; Shigley and the engineer of record govern.",
  };
}
export const eulerJohnsonColumnExample = { inputs: { modulus_psi: 30000000, yield_strength_psi: 40000, moment_of_inertia_in4: 0.05, area_in2: 1.0, length_in: 20, end_condition: "pinned-pinned" } };
function renderEulerJohnsonColumn(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Euler-Johnson column buckling (Shigley, Mechanical Engineering Design, Ch. 4): SR = K L/sqrt(I/A), transition SR_D = pi sqrt(2 E/Sy); Euler Pcr = pi^2 E I/(K L)^2 for SR >= SR_D, J.B. Johnson Pcr = A[Sy - (Sy SR/(2 pi))^2/E] below it. K by end condition. Concentric load; apply a safety factor. A design aid; Shigley and the engineer of record govern.";
  const E = makeNumber("Modulus E (psi)", "ejc-e", { step: "any", min: "0" }); E.input.value = "30000000";
  const Sy = makeNumber("Yield strength Sy (psi)", "ejc-sy", { step: "any", min: "0" }); Sy.input.value = "40000";
  const I = makeNumber("Moment of inertia I (in⁴)", "ejc-i", { step: "any", min: "0" }); I.input.value = "0.05";
  const A = makeNumber("Cross-section area A (in²)", "ejc-a", { step: "any", min: "0" }); A.input.value = "1.0";
  const L = makeNumber("Unbraced length L (in)", "ejc-l", { step: "any", min: "0" }); L.input.value = "20";
  const end = makeSelect("End condition", "ejc-end", Object.keys(COLUMN_END_K).map((k) => ({ value: k, label: COLUMN_END_K[k].label, selected: k === "pinned-pinned" })));
  for (const f of [E, Sy, I, A, L, end]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { E.input.value = "30000000"; Sy.input.value = "40000"; I.input.value = "0.05"; A.input.value = "1.0"; L.input.value = "20"; end.select.value = "pinned-pinned"; update(); });
  const oP = makeOutputLine(outputRegion, "Critical buckling load Pcr", "ejc-out-p");
  const oS = makeOutputLine(outputRegion, "Critical stress", "ejc-out-s");
  const oSR = makeOutputLine(outputRegion, "Slenderness / transition", "ejc-out-sr");
  const oNote = makeOutputLine(outputRegion, "Note", "ejc-out-note");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeEulerJohnsonColumn({ modulus_psi: readNum(E.input), yield_strength_psi: readNum(Sy.input), moment_of_inertia_in4: readNum(I.input), area_in2: readNum(A.input), length_in: readNum(L.input), end_condition: end.select.value });
    if (r.error) { oP.textContent = r.error; oS.textContent = "-"; oSR.textContent = "-"; oNote.textContent = ""; return; }
    oP.textContent = fmt(r.critical_load_lbf, 0) + " lbf (" + r.mode + ")";
    oS.textContent = fmt(r.critical_stress_psi, 0) + " psi";
    oSR.textContent = "SR = " + fmt(r.slenderness_ratio, 1) + " vs transition " + fmt(r.transition_slenderness, 1) + " (r = " + fmt(r.radius_of_gyration_in, 3) + " in, K = " + fmt(r.effective_length_factor, 2) + ")";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [E, Sy, I, A, L]) f.input.addEventListener("input", update);
  end.select.addEventListener("change", update);
}
MACHINING_RENDERERS["euler-johnson-column"] = renderEulerJohnsonColumn;

// ===================== spec-v1297: thick-wall cylinder stress (Lame) =====================
// hoop-stress-thin-wall gives P D/(2t) "valid for D/t >= 20"; below that (a hydraulic-cylinder tube, thick pipe,
// gun barrel) the wall is thick, the stress varies through it, and the peak sits at the BORE. Lame equations for
// internal pressure: sigma_hoop(bore) = P(ro^2+ri^2)/(ro^2-ri^2), sigma_hoop(outer) = 2P ri^2/(ro^2-ri^2),
// sigma_radial(bore) = -P, sigma_long(closed) = P ri^2/(ro^2-ri^2). The thin-wall estimate is shown for comparison.
// dims: in { pressure_psi: M L^-1 T^-2, inner_radius_in: L, wall_thickness_in: L } out: { hoop_bore_psi: M L^-1 T^-2, hoop_outer_psi: M L^-1 T^-2, radial_bore_psi: M L^-1 T^-2, longitudinal_psi: M L^-1 T^-2, thin_wall_estimate_psi: M L^-1 T^-2 }
export function computeThickWallCylinderStress({ pressure_psi = 0, inner_radius_in = 0, wall_thickness_in = 0 } = {}) {
  const _g = _finiteGuard({ pressure_psi, inner_radius_in, wall_thickness_in }); if (_g) return _g;
  const P = Number(pressure_psi) || 0;
  const ri = Number(inner_radius_in) || 0;
  const t = Number(wall_thickness_in) || 0;
  if (!(P > 0)) return { error: "Internal pressure must be positive (psi)." };
  if (!(ri > 0)) return { error: "Inner radius must be positive (in)." };
  if (!(t > 0)) return { error: "Wall thickness must be positive (in)." };
  const ro = ri + t;
  const denom = ro * ro - ri * ri;
  const hoop_bore_psi = (P * (ro * ro + ri * ri)) / denom;
  const hoop_outer_psi = (2 * P * ri * ri) / denom;
  const radial_bore_psi = -P;
  const longitudinal_psi = (P * ri * ri) / denom;
  const d_over_t = (2 * ri) / t;
  const thin_wall_estimate_psi = (P * (2 * ri)) / (2 * t); // P D/(2t) with D = ID
  if (![hoop_bore_psi, hoop_outer_psi, longitudinal_psi, thin_wall_estimate_psi].every(Number.isFinite) || !(hoop_bore_psi > 0)) return { error: "Thick-wall math is not a finite value; check the inputs." };
  return {
    hoop_bore_psi, hoop_outer_psi, radial_bore_psi, longitudinal_psi, thin_wall_estimate_psi, d_over_t, outer_radius_in: ro,
    note: "Lame thick-wall cylinder stresses under internal pressure P, for inner radius ri and outer radius ro = ri + t. The tangential (hoop) stress is largest at the BORE, sigma_hoop(bore) = P(ro^2 + ri^2)/(ro^2 - ri^2), and falls to 2P ri^2/(ro^2 - ri^2) at the outer wall, so a thick cylinder yields from the inside out. The radial stress at the bore equals the pressure in compression (-P), and the longitudinal stress for capped ends is P ri^2/(ro^2 - ri^2). The thin-wall estimate P D/(2t) (using the inner diameter) is shown for comparison; for D/t below 20 it runs low - about 14% low at D/t = 8 - which is why a high-pressure tube must use Lame rather than the thin-wall formula. Single-material cylinder, internal pressure only; external pressure, interference (press) fit, compound or autofrettaged tubes, end-cap details, and buckling are separate. Apply a safety factor against the material yield with a suitable failure theory. A design aid; Shigley / Roark and the engineer of record govern.",
  };
}
export const thickWallCylinderStressExample = { inputs: { pressure_psi: 3000, inner_radius_in: 2, wall_thickness_in: 0.5 } };
function renderThickWallCylinderStress(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Lame thick-wall cylinder stress for internal pressure (Shigley, Mechanical Engineering Design; Roark's Formulas for Stress and Strain): sigma_hoop(bore) = P(ro^2+ri^2)/(ro^2-ri^2), sigma_hoop(outer) = 2P ri^2/(ro^2-ri^2), sigma_radial(bore) = -P, sigma_long(closed) = P ri^2/(ro^2-ri^2). The thin-wall P D/(2t) is shown for comparison. A design aid; the engineer of record governs.";
  const P = makeNumber("Internal pressure P (psi)", "twc-p", { step: "any", min: "0" }); P.input.value = "3000";
  const ri = makeNumber("Inner radius ri (in)", "twc-ri", { step: "any", min: "0" }); ri.input.value = "2";
  const t = makeNumber("Wall thickness t (in)", "twc-t", { step: "any", min: "0" }); t.input.value = "0.5";
  for (const f of [P, ri, t]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { P.input.value = "3000"; ri.input.value = "2"; t.input.value = "0.5"; update(); });
  const oH = makeOutputLine(outputRegion, "Hoop stress (bore / outer)", "twc-out-h");
  const oL = makeOutputLine(outputRegion, "Longitudinal / radial (bore)", "twc-out-l");
  const oT = makeOutputLine(outputRegion, "Thin-wall estimate (for comparison)", "twc-out-t");
  const oNote = makeOutputLine(outputRegion, "Note", "twc-out-note");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeThickWallCylinderStress({ pressure_psi: readNum(P.input), inner_radius_in: readNum(ri.input), wall_thickness_in: readNum(t.input) });
    if (r.error) { oH.textContent = r.error; oL.textContent = "-"; oT.textContent = "-"; oNote.textContent = ""; return; }
    oH.textContent = fmt(r.hoop_bore_psi, 0) + " / " + fmt(r.hoop_outer_psi, 0) + " psi (max at the bore)";
    oL.textContent = fmt(r.longitudinal_psi, 0) + " psi longitudinal, " + fmt(r.radial_bore_psi, 0) + " psi radial";
    oT.textContent = fmt(r.thin_wall_estimate_psi, 0) + " psi (D/t = " + fmt(r.d_over_t, 1) + (r.d_over_t < 20 ? ", thick-wall: thin-wall runs low" : ", thin-wall OK") + ")";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [P, ri, t]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["thick-wall-cylinder-stress"] = renderThickWallCylinderStress;

// ===================== spec-v1298: rack and pinion travel, speed, and force =====================
// The gear family has spur/worm/planetary geometry but not the rack and pinion (rotary to linear: CNC gantry,
// sliding gate, steering rack, linear actuator). PD = N/Pd; travel per rev = pi PD; travel per tooth = pi/Pd;
// linear speed = pi PD rpm; rack force F = 2T/PD. A bigger pinion moves faster but pushes softer at the same torque.
// dims: in { pinion_teeth: dimensionless, diametral_pitch_1_in: L^-1, pinion_torque_in_lb: M L^2 T^-2, pinion_rpm: T^-1 } out: { pitch_diameter_in: L, travel_per_rev_in: L, travel_per_tooth_in: L, linear_speed_in_min: L T^-1, rack_force_lbf: M L T^-2 }
export function computeRackAndPinion({ pinion_teeth = 0, diametral_pitch_1_in = 0, pinion_torque_in_lb = 0, pinion_rpm = 0 } = {}) {
  const _g = _finiteGuard({ pinion_teeth, diametral_pitch_1_in, pinion_torque_in_lb, pinion_rpm }); if (_g) return _g;
  const N = Number(pinion_teeth) || 0;
  const Pd = Number(diametral_pitch_1_in) || 0;
  const T = Number(pinion_torque_in_lb) || 0;
  const rpm = Number(pinion_rpm) || 0;
  if (!(N >= 6)) return { error: "Pinion teeth must be at least 6." };
  if (!(Pd > 0)) return { error: "Diametral pitch must be positive (teeth per inch)." };
  if (!(T > 0)) return { error: "Pinion torque must be positive (in-lbf)." };
  if (!(rpm > 0)) return { error: "Pinion speed must be positive (rpm)." };
  const pitch_diameter_in = N / Pd;
  const travel_per_rev_in = Math.PI * pitch_diameter_in;
  const travel_per_tooth_in = Math.PI / Pd;
  const linear_speed_in_min = travel_per_rev_in * rpm;
  const linear_speed_ft_min = linear_speed_in_min / 12;
  const rack_force_lbf = (2 * T) / pitch_diameter_in;
  if (![pitch_diameter_in, travel_per_rev_in, linear_speed_in_min, rack_force_lbf].every(Number.isFinite) || !(rack_force_lbf > 0)) return { error: "Rack-and-pinion math is not a finite value; check the inputs." };
  return {
    pitch_diameter_in, travel_per_rev_in, travel_per_tooth_in, linear_speed_in_min, linear_speed_ft_min, rack_force_lbf,
    note: "Rack and pinion kinematics and force. The pinion pitch diameter is PD = N/Pd (teeth N, diametral pitch Pd); the rack advances one pitch circumference per pinion turn, so travel per revolution = pi PD and travel per tooth = the circular pitch pi/Pd. The linear speed is pi PD x rpm (in/min, divide by 12 for ft/min), and the tangential push force is F = 2 T/PD, the torque divided by the pitch radius. A bigger pinion moves the rack faster but pushes softer for the same torque - the speed-for-force trade in picking a pinion. Ideal kinematics and static force only; tooth bending/contact stress (the gear-stress tiles), mesh efficiency, backlash, acceleration (inertia), and the rack support are separate. A design aid; Machinery's Handbook and the drive maker govern.",
  };
}
export const rackAndPinionExample = { inputs: { pinion_teeth: 20, diametral_pitch_1_in: 10, pinion_torque_in_lb: 100, pinion_rpm: 500 } };
function renderRackAndPinion(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: rack-and-pinion kinematics and force (Machinery's Handbook): pitch diameter PD = N/Pd, travel per revolution = pi PD, travel per tooth = pi/Pd, linear speed = pi PD x rpm, rack force F = 2 T/PD. Ideal kinematics and static force; tooth stress, backlash, and inertia are separate. A design aid; the drive maker governs.";
  const N = makeNumber("Pinion teeth N", "rap-n", { step: "1", min: "0" }); N.input.value = "20";
  const Pd = makeNumber("Diametral pitch Pd (teeth per in)", "rap-pd", { step: "any", min: "0" }); Pd.input.value = "10";
  const T = makeNumber("Pinion torque T (in-lbf)", "rap-t", { step: "any", min: "0" }); T.input.value = "100";
  const rpm = makeNumber("Pinion speed (rpm)", "rap-rpm", { step: "any", min: "0" }); rpm.input.value = "500";
  for (const f of [N, Pd, T, rpm]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { N.input.value = "20"; Pd.input.value = "10"; T.input.value = "100"; rpm.input.value = "500"; update(); });
  const oPD = makeOutputLine(outputRegion, "Pinion pitch diameter", "rap-out-pd");
  const oTr = makeOutputLine(outputRegion, "Travel (per rev / per tooth)", "rap-out-tr");
  const oV = makeOutputLine(outputRegion, "Linear speed", "rap-out-v");
  const oF = makeOutputLine(outputRegion, "Rack push force", "rap-out-f");
  const oNote = makeOutputLine(outputRegion, "Note", "rap-out-note");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeRackAndPinion({ pinion_teeth: readNum(N.input), diametral_pitch_1_in: readNum(Pd.input), pinion_torque_in_lb: readNum(T.input), pinion_rpm: readNum(rpm.input) });
    if (r.error) { oPD.textContent = r.error; oTr.textContent = "-"; oV.textContent = "-"; oF.textContent = "-"; oNote.textContent = ""; return; }
    oPD.textContent = fmt(r.pitch_diameter_in, 3) + " in";
    oTr.textContent = fmt(r.travel_per_rev_in, 3) + " in/rev, " + fmt(r.travel_per_tooth_in, 4) + " in/tooth";
    oV.textContent = fmt(r.linear_speed_in_min, 0) + " in/min (" + fmt(r.linear_speed_ft_min, 1) + " ft/min)";
    oF.textContent = fmt(r.rack_force_lbf, 1) + " lbf";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [N, Pd, T, rpm]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["rack-and-pinion"] = renderRackAndPinion;

// ===================== spec-v1301: plain (sleeve) bearing pressure and PV =====================
// The catalog sizes ROLLING bearings by rating life but has nothing for a plain (sleeve/journal) bearing or bronze
// bushing, which is sized on projected pressure P = W/(L D) and the PV factor P*V (V = pi D N/12 ft/min) - the
// product that governs frictional heat and wear against the material's PV limit (~50,000 for oil-impregnated bronze).
// dims: in { radial_load_lbf: M L T^-2, journal_diameter_in: L, bearing_length_in: L, speed_rpm: T^-1 } out: { projected_pressure_psi: M L^-1 T^-2, surface_velocity_fpm: L T^-1, pv_factor: M T^-3 }
export function computePlainBearingPressurePv({ radial_load_lbf = 0, journal_diameter_in = 0, bearing_length_in = 0, speed_rpm = 0 } = {}) {
  const _g = _finiteGuard({ radial_load_lbf, journal_diameter_in, bearing_length_in, speed_rpm }); if (_g) return _g;
  const W = Number(radial_load_lbf) || 0;
  const D = Number(journal_diameter_in) || 0;
  const L = Number(bearing_length_in) || 0;
  const N = Number(speed_rpm) || 0;
  if (!(W > 0)) return { error: "Radial load must be positive (lbf)." };
  if (!(D > 0)) return { error: "Journal diameter must be positive (in)." };
  if (!(L > 0)) return { error: "Bearing length must be positive (in)." };
  if (!(N > 0)) return { error: "Shaft speed must be positive (rpm)." };
  const projected_pressure_psi = W / (L * D);
  const surface_velocity_fpm = (Math.PI * D * N) / 12;
  const pv_factor = projected_pressure_psi * surface_velocity_fpm;
  if (![projected_pressure_psi, surface_velocity_fpm, pv_factor].every(Number.isFinite) || !(pv_factor > 0)) return { error: "Plain-bearing math is not a finite value; check the inputs." };
  const pv_flag = pv_factor > 50000
    ? "PV above ~50,000 psi-ft/min: past the oil-impregnated sintered-bronze limit; use a pressure-lubricated bronze/babbitt or lengthen the bearing."
    : "PV within the ~50,000 psi-ft/min oil-impregnated-bronze guidepost (confirm against the bushing's rated PV).";
  return {
    projected_pressure_psi, surface_velocity_fpm, pv_factor, pv_flag,
    note: "Plain (sleeve/journal) bearing sizing on projected pressure and PV, not rating life. The projected pressure P = W/(L D) uses the projected area L x D (journal diameter D, bearing length L), not the wrapped area; the journal surface velocity is V = pi D N/12 ft/min; and the PV factor is their product, the value that governs the frictional heat and wear. PV must stay under the bearing material's rated limit - roughly 50,000 psi-ft/min for oil-impregnated sintered bronze, higher for pressure-lubricated bronze/babbitt, much lower for dry plastics. Keep the pressure under the material's crush limit and the velocity under its speed limit as well. The hydrodynamic film (Sommerfeld number), the actual temperature rise, minimum film thickness, and the specific material limits are the bushing maker's. Rolling bearings use rating life (bearing-l10-life). A design aid; Machinery's Handbook and the bearing maker govern.",
  };
}
export const plainBearingPressurePvExample = { inputs: { radial_load_lbf: 800, journal_diameter_in: 1.0, bearing_length_in: 1.5, speed_rpm: 300 } };
function renderPlainBearingPressurePv(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: plain-bearing projected pressure P = W/(L D), surface velocity V = pi D N/12 ft/min, and the PV factor P*V vs the material limit (~50,000 psi-ft/min oil-impregnated bronze) (Machinery's Handbook). Sizing basis for a sleeve/journal bearing or bronze bushing; the bushing maker's rated PV governs.";
  const W = makeNumber("Radial load W (lbf)", "pbp-w", { step: "any", min: "0" }); W.input.value = "800";
  const D = makeNumber("Journal diameter D (in)", "pbp-d", { step: "any", min: "0" }); D.input.value = "1.0";
  const L = makeNumber("Bearing length L (in)", "pbp-l", { step: "any", min: "0" }); L.input.value = "1.5";
  const N = makeNumber("Shaft speed (rpm)", "pbp-n", { step: "any", min: "0" }); N.input.value = "300";
  for (const f of [W, D, L, N]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { W.input.value = "800"; D.input.value = "1.0"; L.input.value = "1.5"; N.input.value = "300"; update(); });
  const oP = makeOutputLine(outputRegion, "Projected pressure P", "pbp-out-p");
  const oV = makeOutputLine(outputRegion, "Surface velocity V", "pbp-out-v");
  const oPV = makeOutputLine(outputRegion, "PV factor", "pbp-out-pv");
  const oNote = makeOutputLine(outputRegion, "Note", "pbp-out-note");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computePlainBearingPressurePv({ radial_load_lbf: readNum(W.input), journal_diameter_in: readNum(D.input), bearing_length_in: readNum(L.input), speed_rpm: readNum(N.input) });
    if (r.error) { oP.textContent = r.error; oV.textContent = "-"; oPV.textContent = "-"; oNote.textContent = ""; return; }
    oP.textContent = fmt(r.projected_pressure_psi, 1) + " psi";
    oV.textContent = fmt(r.surface_velocity_fpm, 1) + " ft/min";
    oPV.textContent = fmt(r.pv_factor, 0) + " psi-ft/min - " + r.pv_flag;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [W, D, L, N]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["plain-bearing-pressure-pv"] = renderPlainBearingPressurePv;

// ===================== spec-v1303: rigid flange coupling torque capacity =====================
// flange-bolt-torque is the wrench torque to tighten a bolt; this is the TORQUE a rigid flange coupling transmits
// through its bolt circle. The bolts act in single shear at the bolt-circle radius: T = n (pi/4 d^2 tau) (BCD/2).
// dims: in { bolt_count: dimensionless, bolt_diameter_in: L, allowable_shear_psi: M L^-1 T^-2, bolt_circle_diameter_in: L } out: { torque_capacity_in_lb: M L^2 T^-2, torque_capacity_ft_lb: M L^2 T^-2, shear_per_bolt_lbf: M L T^-2, shear_area_per_bolt_in2: L^2 }
export function computeFlangeCouplingTorque({ bolt_count = 0, bolt_diameter_in = 0, allowable_shear_psi = 0, bolt_circle_diameter_in = 0 } = {}) {
  const _g = _finiteGuard({ bolt_count, bolt_diameter_in, allowable_shear_psi, bolt_circle_diameter_in }); if (_g) return _g;
  const n = Number(bolt_count) || 0;
  const d = Number(bolt_diameter_in) || 0;
  const tau = Number(allowable_shear_psi) || 0;
  const bcd = Number(bolt_circle_diameter_in) || 0;
  if (!(n >= 2)) return { error: "Number of bolts must be at least 2." };
  if (!(d > 0)) return { error: "Bolt diameter must be positive (in)." };
  if (!(tau > 0)) return { error: "Allowable bolt shear stress must be positive (psi)." };
  if (!(bcd > 0)) return { error: "Bolt-circle diameter must be positive (in)." };
  const shear_area_per_bolt_in2 = (Math.PI / 4) * d * d;
  const shear_per_bolt_lbf = shear_area_per_bolt_in2 * tau;
  const R = bcd / 2;
  const torque_capacity_in_lb = n * shear_per_bolt_lbf * R;
  const torque_capacity_ft_lb = torque_capacity_in_lb / 12;
  if (![torque_capacity_in_lb, shear_per_bolt_lbf, shear_area_per_bolt_in2].every(Number.isFinite) || !(torque_capacity_in_lb > 0)) return { error: "Coupling-torque math is not a finite value; check the inputs." };
  return {
    torque_capacity_in_lb, torque_capacity_ft_lb, shear_per_bolt_lbf, shear_area_per_bolt_in2, bolt_circle_radius_in: R,
    note: "Torque a rigid flange coupling can transmit through its bolt circle, the bolts sharing the load equally in single shear at the bolt-circle radius: T = n (pi/4 d^2 tau) (BCD/2), with n the bolt count, d the bolt (or fitted-bolt body) diameter, tau the allowable bolt shear stress, and BCD the bolt-circle diameter. The capacity scales with the number of bolts, the bolt area, and the radius, so adding bolts, growing the circle, or using bigger bolts all raise it. Fitted (body-bound) bolts carry the torque directly in shear; friction-only (clearance) bolts rely on clamp force and are less certain - this is the shear basis. Also check the per-bolt shear against the flange bearing, the shaft key, and the hub, since the weakest link governs. The flange bearing stress, the shaft key, hub burst, friction-drive capacity, and misalignment (a flexible coupling) are separate. Use the allowable shear for the bolt grade with a safety factor. A design aid; Machinery's Handbook / Shigley and the coupling maker govern.",
  };
}
export const flangeCouplingTorqueExample = { inputs: { bolt_count: 6, bolt_diameter_in: 0.5, allowable_shear_psi: 10000, bolt_circle_diameter_in: 5 } };
function renderFlangeCouplingTorque(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: rigid flange coupling torque capacity, bolts in single shear at the bolt-circle radius: T = n (pi/4 d^2 tau) (BCD/2) (Machinery's Handbook; Shigley, Mechanical Engineering Design). Fitted bolts carry torque in shear; also check flange bearing, key, and hub. A design aid; the coupling maker governs.";
  const n = makeNumber("Number of bolts n", "fct-n", { step: "1", min: "0" }); n.input.value = "6";
  const d = makeNumber("Bolt diameter d (in)", "fct-d", { step: "any", min: "0" }); d.input.value = "0.5";
  const tau = makeNumber("Allowable bolt shear stress (psi)", "fct-tau", { step: "any", min: "0" }); tau.input.value = "10000";
  const bcd = makeNumber("Bolt-circle diameter BCD (in)", "fct-bcd", { step: "any", min: "0" }); bcd.input.value = "5";
  for (const f of [n, d, tau, bcd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { n.input.value = "6"; d.input.value = "0.5"; tau.input.value = "10000"; bcd.input.value = "5"; update(); });
  const oT = makeOutputLine(outputRegion, "Torque capacity", "fct-out-t");
  const oB = makeOutputLine(outputRegion, "Shear per bolt", "fct-out-b");
  const oNote = makeOutputLine(outputRegion, "Note", "fct-out-note");
  function readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeFlangeCouplingTorque({ bolt_count: readNum(n.input), bolt_diameter_in: readNum(d.input), allowable_shear_psi: readNum(tau.input), bolt_circle_diameter_in: readNum(bcd.input) });
    if (r.error) { oT.textContent = r.error; oB.textContent = "-"; oNote.textContent = ""; return; }
    oT.textContent = fmt(r.torque_capacity_in_lb, 0) + " in-lbf (" + fmt(r.torque_capacity_ft_lb, 0) + " ft-lbf)";
    oB.textContent = fmt(r.shear_per_bolt_lbf, 1) + " lbf (bolt shear area " + fmt(r.shear_area_per_bolt_in2, 4) + " in^2)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [n, d, tau, bcd]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["flange-coupling-torque"] = renderFlangeCouplingTorque;

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

// ===================== spec-v917: reaming prebore (drill) allowance =====================
// dims: in { reamer_diameter_in: L, allowance_override_in: L } out: { allowance_used_in: L, drill_diameter_in: L }
export function computeReamingDrillAllowance({ reamer_diameter_in = 0.5, allowance_override_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(reamer_diameter_in > 0)) return { error: "Reamer diameter must be positive (in)." };
  if (allowance_override_in < 0) return { error: "Allowance override cannot be negative (in)." };
  // Machinery's Handbook machine-reaming stock allowances by finished diameter band (on the diameter).
  const banded = reamer_diameter_in < 0.25 ? 0.010
    : reamer_diameter_in <= 0.5 ? 0.015
    : reamer_diameter_in <= 1.0 ? 0.020
    : reamer_diameter_in <= 1.5 ? 0.025
    : 0.030;
  const allowance_used_in = allowance_override_in > 0 ? allowance_override_in : banded;
  const drill_diameter_in = reamer_diameter_in - allowance_used_in;
  if (!(drill_diameter_in > 0)) return { error: "Allowance exceeds the reamer diameter: the prebore would be non-positive." };
  return {
    allowance_used_in,
    drill_diameter_in,
    note: "The prebore (drill) diameter to leave the right stock for a machine reamer to clean up: drill = reamer diameter - allowance. Machinery's Handbook stock allowances on the diameter run about 0.010 in under 1/4 in, 0.015 in from 1/4 to 1/2, 0.020 in from 1/2 to 1, 0.025 in from 1 to 1-1/2, and 0.030 in from 1-1/2 to 2; too little stock burnishes and dulls the reamer, too much leaves an oversize, torn, or bell-mouthed hole. Select the nearest available drill at or just below this size. Hand reamers, thin-wall parts, and interrupted holes take less; the reamer maker's guidance and the material govern.",
  };
}

export const reamingDrillAllowanceExample = { inputs: { reamer_diameter_in: 0.5, allowance_override_in: 0 } };

function _v917renderReamingDrillAllowance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: machine-reaming stock allowance by name. drill = reamer diameter - allowance; Machinery's Handbook diameter-band allowances (~0.010 under 1/4, 0.015 to 1/2, 0.020 to 1, 0.025 to 1-1/2, 0.030 to 2 in). The reamer maker's guidance and the material govern.";
  const rd = makeNumber("Finished reamer diameter (in)", "rda-rd", { step: "any", min: "0", value: "0.5" });
  rd.input.value = "0.5";
  const ov = makeNumber("Allowance override (in, 0 = auto band)", "rda-ov", { step: "any", min: "0", value: "0" });
  ov.input.value = "0";
  for (const f of [rd, ov]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rd.input.value = "0.5"; ov.input.value = "0"; update(); });
  const oDrill = makeOutputLine(outputRegion, "Prebore drill diameter", "rda-out-d");
  const oAllow = makeOutputLine(outputRegion, "Allowance used", "rda-out-a");
  const update = debounce(() => {
    const r = computeReamingDrillAllowance({
      reamer_diameter_in: rd.input.value === "" ? 0.5 : Number(rd.input.value), allowance_override_in: ov.input.value === "" ? 0 : Number(ov.input.value),
    });
    if (r.error) { oDrill.textContent = r.error; oAllow.textContent = "-"; return; }
    oDrill.textContent = fmt(r.drill_diameter_in, 4) + " in";
    oAllow.textContent = fmt(r.allowance_used_in, 4) + " in on the diameter";
  }, DEBOUNCE_MS);
  for (const f of [rd, ov]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["reaming-drill-allowance"] = _v917renderReamingDrillAllowance;

// ===================== spec-v952: Taylor tool-life / cutting-speed trade-off =====================
// dims: in { args: dimensionless } out: { tool_life_min: dimensionless, speed_for_target_life_sfm: dimensionless }
export function computeTaylorToolLife({ taylor_c = 300, taylor_n = 0.2, cutting_speed_sfm = 200, target_life_min = 15 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(taylor_c > 0)) return { error: "Taylor constant C must be positive (sfm at 1-minute life)." };
  if (!(taylor_n > 0)) return { error: "Taylor exponent n must be positive." };
  if (!(cutting_speed_sfm > 0)) return { error: "Cutting speed must be positive (sfm)." };
  if (!(target_life_min > 0)) return { error: "Target tool life must be positive (min)." };
  // Taylor tool-life V x T^n = C, so life T = (C/V)^(1/n) and the speed for a target life V = C / T^n.
  const tool_life_min = Math.pow(taylor_c / cutting_speed_sfm, 1 / taylor_n);
  const speed_for_target_life_sfm = taylor_c / Math.pow(target_life_min, taylor_n);
  if (![tool_life_min, speed_for_target_life_sfm].every(Number.isFinite)) return { error: "Taylor tool-life math is not a finite value." };
  return {
    tool_life_min,
    speed_for_target_life_sfm,
    note: "The Taylor tool-life relation V x T^n = C, the trade-off between cutting speed and how long the tool edge lasts: at a cutting speed V (surface feet per minute) the tool life is T = (C/V)^(1/n) minutes, and the speed that yields a chosen target life is V = C / T^n. C is the cutting speed that gives a 1-minute life (a large number) and n is the tool-material exponent -- about 0.1-0.15 for HSS, 0.2-0.4 for carbide, higher for ceramics -- both from the insert maker's data or a machining handbook for the specific tool/work pair. Because n is small, life is VERY sensitive to speed: with C = 300, n = 0.2, cutting at 200 sfm gives (300/200)^5 = 7.6 min, but easing to 174 sfm stretches it to 15 min -- a 13% speed cut roughly doubles the life. Run the numbers to balance cycle time against insert cost and downtime. The base form ignores feed and depth of cut (the extended Taylor equation adds those); the insert manufacturer's data, the machine, and the actual tool/work/coolant combination govern.",
  };
}

export const taylorToolLifeExample = { inputs: { taylor_c: 300, taylor_n: 0.2, cutting_speed_sfm: 200, target_life_min: 15 } };

function _v952renderTaylorToolLife(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Taylor tool-life equation V x T^n = C (F.W. Taylor), by name. Tool life T = (C/V)^(1/n); speed for a target life V = C / T^n. C = cutting speed (sfm) for 1-minute life, n = tool-material exponent (~0.1-0.15 HSS, 0.2-0.4 carbide). Base form (no feed/depth term); the insert maker's data and the tool/work/coolant combination govern.";
  const cc = makeNumber("Taylor C (sfm at 1-min life)", "ttl-cc", { step: "any", min: "0", value: "300" });
  cc.input.value = "300";
  const nn = makeNumber("Taylor exponent n (~0.125 HSS, ~0.25 carbide)", "ttl-nn", { step: "any", min: "0", value: "0.2" });
  nn.input.value = "0.2";
  const vv = makeNumber("Cutting speed (sfm)", "ttl-vv", { step: "any", min: "0", value: "200" });
  vv.input.value = "200";
  const tl = makeNumber("Target tool life (min)", "ttl-tl", { step: "any", min: "0", value: "15" });
  tl.input.value = "15";
  for (const f of [cc, nn, vv, tl]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cc.input.value = "300"; nn.input.value = "0.2"; vv.input.value = "200"; tl.input.value = "15"; update(); });
  const oLife = makeOutputLine(outputRegion, "Tool life at this speed", "ttl-out-l");
  const oSpeed = makeOutputLine(outputRegion, "Speed for the target life", "ttl-out-s");
  const update = debounce(() => {
    const r = computeTaylorToolLife({
      taylor_c: cc.input.value === "" ? 300 : Number(cc.input.value), taylor_n: nn.input.value === "" ? 0.2 : Number(nn.input.value),
      cutting_speed_sfm: vv.input.value === "" ? 200 : Number(vv.input.value), target_life_min: tl.input.value === "" ? 15 : Number(tl.input.value),
    });
    if (r.error) { oLife.textContent = r.error; oSpeed.textContent = "-"; return; }
    oLife.textContent = fmt(r.tool_life_min, 2) + " min at " + fmt(Number(vv.input.value) || 200, 0) + " sfm";
    oSpeed.textContent = fmt(r.speed_for_target_life_sfm, 1) + " sfm for " + fmt(Number(tl.input.value) || 15, 0) + " min";
  }, DEBOUNCE_MS);
  for (const f of [cc, nn, vv, tl]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["taylor-tool-life"] = _v952renderTaylorToolLife;

// ===================== spec-v1006: single-point thread cutting depth (60-degree UN external) =====================
// dims: in { args: dimensionless } out: { pitch_in: dimensionless, single_depth_in: dimensionless, compound_infeed_in: dimensionless }
export function computeThreadSingleDepth({ tpi = 13 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(tpi > 0)) return { error: "Threads per inch must be positive." };
  // 60-degree UN external thread: pitch = 1/TPI; external thread height = 0.6134 P; compound infeed at 29.5 deg = depth / cos(29.5).
  const pitch_in = 1 / tpi;
  const single_depth_in = 0.6134 * pitch_in;
  const compound_infeed_in = single_depth_in / Math.cos(29.5 * Math.PI / 180);
  if (![pitch_in, single_depth_in, compound_infeed_in].every(Number.isFinite)) return { error: "Thread-depth math is not a finite value." };
  return {
    pitch_in,
    single_depth_in,
    compound_infeed_in,
    note: "The cut depth for single-point threading a 60-degree external (Unified / UN) thread on a lathe, the number a machinist dials in when cutting a thread with a form tool. The pitch is one over the threads per inch, and the full-form external thread height -- crest to root -- is 0.6134 times the pitch (the standard UN external thread truncation, five-eighths of the sharp-V height of 0.866 P less the root truncation). For a 1/2-13 thread the pitch is 0.0769 in and the single (radial) depth is 0.6134 x 0.0769 = 0.0472 in; a 3/4-10 is 0.0613 in deep. Because most machinists feed the tool with the COMPOUND rest set to 29.5 degrees (just under the 30-degree half-angle, so the tool cuts mainly on the leading flank and clears the trailing one), the compound travels farther than the radial depth: the compound infeed is the radial depth divided by the cosine of 29.5 degrees, so the 1/2-13 needs 0.0472 / cos(29.5) = 0.0542 in of compound travel. Feed in over several passes, taking lighter cuts near the end, and check the finished thread with a gauge or the three-wire method rather than trusting the depth alone -- tool wear, deflection, and the exact root/crest form shift the fit. A setup aid; the thread standard (UN vs UNJ vs metric), the tool geometry, and a thread gauge govern the finished part.",
  };
}

export const threadSingleDepthExample = { inputs: { tpi: 13 } };

function _v1006renderThreadSingleDepth(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: single-point thread cutting depth (60-degree UN external), by name. pitch = 1/TPI; external thread height = 0.6134 x pitch; compound infeed at 29.5 deg = depth / cos(29.5). Feed over several passes and verify with a gauge or the three-wire method. The thread standard, the tool geometry, and a thread gauge govern the finished part.";
  const tp = makeNumber("Threads per inch (TPI)", "tsd-tp", { step: "any", min: "0", value: "13" });
  tp.input.value = "13";
  inputRegion.appendChild(tp.wrap);
  attachExampleButton(inputRegion, () => { tp.input.value = "13"; update(); });
  const oD = makeOutputLine(outputRegion, "Radial (single) depth", "tsd-out-d");
  const oC = makeOutputLine(outputRegion, "Compound infeed (29.5 deg)", "tsd-out-c");
  const update = debounce(() => {
    const r = computeThreadSingleDepth({ tpi: tp.input.value === "" ? 13 : Number(tp.input.value) });
    if (r.error) { oD.textContent = r.error; oC.textContent = "-"; return; }
    oD.textContent = fmt(r.single_depth_in, 4) + " in (pitch " + fmt(r.pitch_in, 4) + " in)";
    oC.textContent = fmt(r.compound_infeed_in, 4) + " in";
  }, DEBOUNCE_MS);
  tp.input.addEventListener("input", update);
}
MACHINING_RENDERERS["thread-single-depth"] = _v1006renderThreadSingleDepth;

// ===================== spec-v1220: general-purpose Acme (29-degree) thread depth =====================
// The thread-single-depth tile is 60-degree UN only; the 29-degree Acme lead-screw form has no tile.
// General-purpose Acme (Machinery's Handbook / ASME B1.5): pitch P = 1/TPI; external thread depth
// h = P/2 + 0.010 in; basic pitch dia = D - P/2; external minor (root) = D - 2h = D - P - 0.020;
// width of flat at the crest = 0.3707 P; included thread angle 29 degrees.
// dims: in { major_dia_in: L, tpi: dimensionless } out: { pitch_in: L, thread_depth_in: L, pitch_dia_in: L, minor_dia_in: L, crest_flat_in: L }
export function computeAcmeThreadDepth({ major_dia_in = 0, tpi = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D = Number(major_dia_in) || 0;
  const n = Number(tpi) || 0;
  if (!(D > 0)) return { error: "Major (nominal) diameter must be positive (in)." };
  if (!(n > 0)) return { error: "Threads per inch must be positive." };
  const pitch_in = 1 / n;
  const thread_depth_in = pitch_in / 2 + 0.010;
  const pitch_dia_in = D - pitch_in / 2;
  const minor_dia_in = D - 2 * thread_depth_in;
  const crest_flat_in = 0.3707 * pitch_in;
  if (!(minor_dia_in > 0)) return { error: "The pitch is too coarse for this diameter (the computed minor diameter is not positive); check the TPI and major diameter." };
  if (![pitch_in, thread_depth_in, pitch_dia_in, minor_dia_in, crest_flat_in].every(Number.isFinite)) return { error: "Acme-thread math is not a finite value." };
  return {
    pitch_in, thread_depth_in, pitch_dia_in, minor_dia_in, crest_flat_in,
    note: "General-purpose Acme (29-degree) thread dimensions, the lead-screw / power-transmission form the 60-degree UN thread-single-depth tile does not cover. The pitch P = 1/TPI; the external thread depth (crest to root) h = P/2 + 0.010 in (half the pitch plus the 0.010 in general-purpose clearance); the basic pitch diameter = D - P/2; the external minor (root) diameter = D - 2h = D - P - 0.020; and the width of the flat at the crest = 0.3707 P (from the 29-degree flank geometry). A 1 in, 5-TPI Acme (\"1-5 Acme\") has a 0.200 in pitch, a 0.110 in thread depth, a 0.900 in pitch diameter, a 0.780 in minor diameter, and a 0.0741 in crest flat. Acme threads carry axial load with less friction and less wedging than a V-thread, which is why they run vises, presses, and machine lead screws; the 29-degree flank also clears chips and tolerates wear. Cut with a 29-degree Acme tool ground to the crest-flat width, and check the pitch diameter over wires (the three-wire method) rather than trusting the depth alone. General-purpose class; the Stub Acme (0.3 P depth) and the centralizing (C) classes differ, and ASME B1.5 and the thread gauge govern the finished fit.",
  };
}
export const acmeThreadDepthExample = { inputs: { major_dia_in: 1.0, tpi: 5 } };
function renderAcmeThreadDepth(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: general-purpose Acme (29-degree) thread dimensions (Machinery's Handbook / ASME B1.5): pitch = 1/TPI, external thread depth = P/2 + 0.010 in, pitch dia = D - P/2, external minor = D - P - 0.020, crest flat = 0.3707 P. Cut with a 29-degree tool and verify over wires. General-purpose class; Stub Acme and centralizing classes differ; ASME B1.5 and a thread gauge govern.";
  const D = makeNumber("Major (nominal) diameter (in)", "acme-d", { step: "any", min: "0", value: "1" }); D.input.value = "1";
  const tp = makeNumber("Threads per inch (TPI)", "acme-tpi", { step: "any", min: "0", value: "5" }); tp.input.value = "5";
  for (const f of [D, tp]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { D.input.value = "1"; tp.input.value = "5"; update(); });
  const oDepth = makeOutputLine(outputRegion, "Thread depth / pitch", "acme-out-depth");
  const oDia = makeOutputLine(outputRegion, "Pitch / minor diameter", "acme-out-dia");
  const oFlat = makeOutputLine(outputRegion, "Crest flat width", "acme-out-flat");
  const oNote = makeOutputLine(outputRegion, "Note", "acme-out-n");
  const update = debounce(() => {
    const r = computeAcmeThreadDepth({ major_dia_in: Number(D.input.value) || 0, tpi: Number(tp.input.value) || 0 });
    if (r.error) { oDepth.textContent = r.error; oDia.textContent = "-"; oFlat.textContent = "-"; oNote.textContent = ""; return; }
    oDepth.textContent = fmt(r.thread_depth_in, 4) + " in (pitch " + fmt(r.pitch_in, 4) + " in)";
    oDia.textContent = fmt(r.pitch_dia_in, 4) + " in / " + fmt(r.minor_dia_in, 4) + " in";
    oFlat.textContent = fmt(r.crest_flat_in, 4) + " in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [D, tp]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["acme-thread-depth"] = renderAcmeThreadDepth;

// Stub Acme (ASME B1.8): the shallower 29-degree form the general-purpose acme-thread-depth tile
// names as different ("the Stub Acme (0.3 P depth) ... differ"). Pitch P = 1/TPI; basic thread
// height h = 0.3 P (vs P/2 for general Acme); basic pitch dia = D - 0.3 P; minor = D - 0.6 P;
// crest flat = P/2 - h tan(14.5 deg) = 0.4224 P (same 29-degree geometry, wider flat than the
// deeper general form's 0.3707 P).
// dims: in { major_dia_in: L, tpi: dimensionless } out: { pitch_in: L, thread_depth_in: L, pitch_dia_in: L, minor_dia_in: L, crest_flat_in: L }
export function computeStubAcmeThreadDepth({ major_dia_in = 0, tpi = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D = Number(major_dia_in) || 0;
  const n = Number(tpi) || 0;
  if (!(D > 0)) return { error: "Major (nominal) diameter must be positive (in)." };
  if (!(n > 0)) return { error: "Threads per inch must be positive." };
  const pitch_in = 1 / n;
  const thread_depth_in = 0.3 * pitch_in;
  const pitch_dia_in = D - thread_depth_in;
  const minor_dia_in = D - 2 * thread_depth_in;
  const crest_flat_in = pitch_in / 2 - thread_depth_in * Math.tan(14.5 * Math.PI / 180);
  if (!(minor_dia_in > 0)) return { error: "The pitch is too coarse for this diameter (the computed minor diameter is not positive); check the TPI and major diameter." };
  if (![pitch_in, thread_depth_in, pitch_dia_in, minor_dia_in, crest_flat_in].every(Number.isFinite)) return { error: "Stub-Acme-thread math is not a finite value." };
  return {
    pitch_in, thread_depth_in, pitch_dia_in, minor_dia_in, crest_flat_in,
    note: "Stub Acme (29-degree) thread dimensions, the shallower form the general-purpose acme-thread-depth tile names as different. It keeps the 29-degree flank of general Acme but cuts the thread height to h = 0.3 P (against P/2), giving a stronger root and a shallower engagement where axial space or thread strength matters more than travel. The pitch P = 1/TPI; the basic thread depth h = 0.3 P; the basic pitch diameter = D - 0.3 P; the external minor (root) diameter = D - 2h = D - 0.6 P; and the crest flat = P/2 - h tan(14.5 deg) = 0.4224 P (wider than the general form's 0.3707 P because the shorter flanks leave more crest). A 1 in, 5-TPI Stub Acme (\"1-5 Stub Acme\") has a 0.200 in pitch, a 0.060 in thread depth, a 0.940 in pitch diameter, a 0.880 in minor diameter, and a 0.0845 in crest flat. Use the stub form for hardened or heavily loaded lead screws, valve stems, and thin-wall parts where a full-depth Acme would over-weaken the root. Cut with a 29-degree tool ground to the crest-flat width and check the pitch diameter over wires. ASME B1.8 and the thread gauge govern the finished fit.",
  };
}
export const stubAcmeThreadDepthExample = { inputs: { major_dia_in: 1.0, tpi: 5 } };
function renderStubAcmeThreadDepth(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Stub Acme (29-degree) thread dimensions (Machinery's Handbook / ASME B1.8): pitch = 1/TPI, basic thread depth = 0.3 P, pitch dia = D - 0.3 P, external minor = D - 0.6 P, crest flat = P/2 - 0.3P tan(14.5 deg) = 0.4224 P. The shallower companion to general-purpose Acme (P/2 depth). Cut with a 29-degree tool and verify over wires. ASME B1.8 and a thread gauge govern.";
  const D = makeNumber("Major (nominal) diameter (in)", "stacme-d", { step: "any", min: "0", value: "1" }); D.input.value = "1";
  const tp = makeNumber("Threads per inch (TPI)", "stacme-tpi", { step: "any", min: "0", value: "5" }); tp.input.value = "5";
  for (const f of [D, tp]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { D.input.value = "1"; tp.input.value = "5"; update(); });
  const oDepth = makeOutputLine(outputRegion, "Thread depth / pitch", "stacme-out-depth");
  const oDia = makeOutputLine(outputRegion, "Pitch / minor diameter", "stacme-out-dia");
  const oFlat = makeOutputLine(outputRegion, "Crest flat width", "stacme-out-flat");
  const oNote = makeOutputLine(outputRegion, "Note", "stacme-out-n");
  const update = debounce(() => {
    const r = computeStubAcmeThreadDepth({ major_dia_in: Number(D.input.value) || 0, tpi: Number(tp.input.value) || 0 });
    if (r.error) { oDepth.textContent = r.error; oDia.textContent = "-"; oFlat.textContent = "-"; oNote.textContent = ""; return; }
    oDepth.textContent = fmt(r.thread_depth_in, 4) + " in (pitch " + fmt(r.pitch_in, 4) + " in)";
    oDia.textContent = fmt(r.pitch_dia_in, 4) + " in / " + fmt(r.minor_dia_in, 4) + " in";
    oFlat.textContent = fmt(r.crest_flat_in, 4) + " in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [D, tp]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["stub-acme-thread-depth"] = renderStubAcmeThreadDepth;

// --- spec-v1108 K: Gear undercut minimum tooth count and backlash ---
// spur-gear-geometry's citation says it "returns the geometry only; it does not check tooth
// strength, backlash, or undercutting." Both missing checks are closed-form geometry:
//   Nmin = 2k / sin^2(phi)   -- the tooth count below which the cutter undercuts the root.
//     Reproduces the classic published values exactly: 32 at 14.5 deg, 18 at 20, 12 at 25.
//   B = 2 dC tan(phi)        -- backlash produced by opening the center distance by dC.
// dims: in { pressure_angle_deg: dimensionless, teeth: dimensionless, addendum_coefficient: dimensionless, center_distance_change_in: L, diametral_pitch: L^-1 } out: { min_teeth: dimensionless, backlash_in: L, center_distance_for_backlash_in: L }
export function computeGearUndercutBacklash({ pressure_angle_deg = 20, teeth = 0, addendum_coefficient = 1.0, center_distance_change_in = 0, diametral_pitch = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const phi = Number(pressure_angle_deg) || 0;
  const n = Number(teeth) || 0;
  const k = Number(addendum_coefficient) || 0;
  const dC = Number(center_distance_change_in);
  const pd = Number(diametral_pitch) || 0;
  if (!(phi > 0 && phi < 90)) return { error: "Pressure angle must be between 0 and 90 degrees (14.5, 20, and 25 are the standard ones)." };
  if (!(n > 0) || !Number.isInteger(n)) return { error: "Tooth count must be a whole number of at least 1." };
  if (!(k > 0)) return { error: "Addendum coefficient must be positive (1.0 full depth, 0.8 stub)." };
  if (!Number.isFinite(dC) || dC < 0) return { error: "Center-distance change cannot be negative (in); enter 0 to skip the backlash calculation." };
  if (pd < 0) return { error: "Diametral pitch cannot be negative (teeth/in); enter 0 to skip the tooth-thickness output." };
  const phi_rad = phi * Math.PI / 180;
  const sin_phi = Math.sin(phi_rad);
  const min_teeth_exact = 2 * k / (sin_phi * sin_phi);
  const min_teeth = Math.ceil(min_teeth_exact);
  const undercut = n < min_teeth;
  const shortfall = undercut ? min_teeth - n : 0;
  const backlash_in = 2 * dC * Math.tan(phi_rad);
  const circular_pitch_in = pd > 0 ? Math.PI / pd : null;
  const backlash_pct_of_pitch = circular_pitch_in ? backlash_in / circular_pitch_in * 100 : null;
  if (![min_teeth_exact, min_teeth, backlash_in].every(Number.isFinite)) return { error: "Gear-geometry math did not produce a finite value." };
  return {
    min_teeth_exact, min_teeth, undercut, shortfall, backlash_in,
    circular_pitch_in, backlash_pct_of_pitch,
    note: (undercut
      ? "UNDERCUT: " + n + " teeth is below the " + min_teeth + "-tooth minimum for a " + phi + "-degree pressure angle, so the cutter sweeps material out of the root as it generates the flank. The tooth is weakened right where the bending stress peaks and part of the involute is destroyed, which costs contact ratio and adds noise. The fixes, in order of preference: raise the pressure angle (25 degrees drops the minimum to 12 teeth), use profile shift (a long-addendum pinion with a matching short-addendum gear), or use a stub tooth. Simply cutting " + shortfall + " more teeth also works if the ratio allows. "
      : n + " teeth clears the " + min_teeth + "-tooth undercut minimum for a " + phi + "-degree pressure angle. ")
      + "The minimum comes straight from the geometry as 2k/sin^2(phi) and reproduces the familiar published values exactly - 32 teeth at 14.5 degrees, 18 at 20, 12 at 25 - which is why the industry moved to higher pressure angles for small pinions. "
      + (dC > 0 ? "Opening the center distance by " + dC + " in produces " + backlash_in.toFixed(5) + " in of backlash: the flanks separate along the line of action, so the effect is 2 tan(phi) per unit of center-distance change, not one-for-one. " : "Enter a center-distance change to see the backlash it produces. ")
      + "Backlash is not a defect - a mesh needs it for lubricant film and thermal growth - but too much makes lost motion and impact on reversal, and too little binds. Standard geometry, no profile shift assumed. A shop aid; the gear drawing and the AGMA standard govern.",
  };
}
export const gearUndercutBacklashExample = { inputs: { pressure_angle_deg: 20, teeth: 14, addendum_coefficient: 1.0, center_distance_change_in: 0.010, diametral_pitch: 10 } };
function renderGearUndercutBacklash(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: involute gear geometry. The undercut limit is Nmin = 2k / sin^2(pressure angle), where k is the addendum coefficient (1.0 full depth, 0.8 stub) - it reproduces the standard published minimums of 32 teeth at 14.5 degrees, 18 at 20 degrees, and 12 at 25 degrees. Backlash from opening the center distance is B = 2 x (center-distance change) x tan(pressure angle), because the flanks separate along the line of action. Standard proportions with no profile shift assumed; profile shift (long-addendum pinion) is the usual fix for an undercut pinion and changes both results. A shop aid; the gear drawing and the AGMA standard govern.";
  const pa = makeNumber("Pressure angle (deg)", "gub-pa", { step: "any", min: "0" }); pa.input.value = "20";
  const n = makeNumber("Number of teeth N", "gub-n", { step: "1", min: "1" }); n.input.value = "14";
  const k = makeNumber("Addendum coefficient (1.0 full, 0.8 stub)", "gub-k", { step: "any", min: "0" }); k.input.value = "1.0";
  const dc = makeNumber("Center-distance increase (in, 0 = skip)", "gub-dc", { step: "any", min: "0" }); dc.input.value = "0.010";
  const pd = makeNumber("Diametral pitch (teeth/in, 0 = skip)", "gub-pd", { step: "any", min: "0" }); pd.input.value = "10";
  for (const f of [pa, n, k, dc, pd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { pa.input.value = "20"; n.input.value = "14"; k.input.value = "1.0"; dc.input.value = "0.010"; pd.input.value = "10"; update(); });
  const oM = makeOutputLine(outputRegion, "Undercut minimum", "gub-out-m");
  const oV = makeOutputLine(outputRegion, "This gear", "gub-out-v");
  const oB = makeOutputLine(outputRegion, "Backlash from the center-distance change", "gub-out-b");
  const oN = makeOutputLine(outputRegion, "Note", "gub-out-n");
  const update = debounce(() => {
    const r = computeGearUndercutBacklash({
      pressure_angle_deg: Number(pa.input.value), teeth: Number(n.input.value), addendum_coefficient: Number(k.input.value),
      center_distance_change_in: Number(dc.input.value), diametral_pitch: Number(pd.input.value),
    });
    if (r.error) { oM.textContent = r.error; oV.textContent = "-"; oB.textContent = "-"; oN.textContent = "-"; return; }
    oM.textContent = r.min_teeth + " teeth (exact " + fmt(r.min_teeth_exact, 3) + ")";
    oV.textContent = r.undercut ? "UNDERCUT - short by " + r.shortfall + " teeth" : "clears the minimum";
    oB.textContent = r.backlash_in > 0
      ? fmt(r.backlash_in, 5) + " in" + (r.backlash_pct_of_pitch !== null ? " (" + fmt(r.backlash_pct_of_pitch, 2) + "% of the " + fmt(r.circular_pitch_in, 4) + " in circular pitch)" : "")
      : "not calculated";
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [pa, n, k, dc, pd]) f.input.addEventListener("input", update);
  update();
}
MACHINING_RENDERERS["gear-undercut-backlash"] = renderGearUndercutBacklash;

// --- spec-v1128: ballnose feed-direction cusp and the governing finish ---
// ballnose-scallop-height computes the cusp ACROSS the passes and says in its own note that
// "the cusp along the feed direction" is separate. It is the same geometry rotated ninety
// degrees: between two successive tooth marks the ball leaves a ridge
//     h = R - sqrt(R^2 - (fz/2)^2)
// with fz the feed per tooth in place of the stepover. The point of putting both in one
// tile is that the finish you actually get is the LARGER of the two, and a machinist who
// halves the stepover while leaving a coarse feed has spent time on the cusp that was not
// governing. The stepover cusp is delegated to the landed tile so the two cannot drift.
// dims: in { r_in: L, stepover_in: L, feed_per_tooth_in: L, rpm: T^-1, flutes: dimensionless } out: { feed_cusp_in: L, stepover_cusp_in: L, governing_cusp_in: L, feedrate_ipm: L T^-1, balanced_feed_in: L, balanced_stepover_in: L }
export function computeBallnoseFeedCusp({ r_in = 0.25, stepover_in = 0.03, feed_per_tooth_in = 0.004, rpm = 0, flutes = 2 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const R = Number(r_in) || 0;
  const s = Number(stepover_in) || 0;
  const fz = Number(feed_per_tooth_in) || 0;
  const N = Number(rpm) || 0;
  const z = Number(flutes) || 0;
  if (!(R > 0)) return { error: "Ballnose radius must be positive (in)." };
  if (!(s > 0)) return { error: "Stepover must be positive (in)." };
  if (!(fz > 0)) return { error: "Feed per tooth must be positive (in)." };
  if (s > 2 * R) return { error: "The stepover exceeds the cutter diameter (s > 2R) - adjacent passes do not overlap." };
  if (fz > 2 * R) return { error: "Feed per tooth exceeds the cutter diameter - not a physical cut." };
  if (N < 0) return { error: "Spindle speed cannot be negative (rpm)." };
  if (!Number.isInteger(z) || z < 1) return { error: "Flute count must be a whole number of 1 or more." };

  const cusp = (w) => R - Math.sqrt(R * R - (w / 2) * (w / 2));
  const feed_cusp_in = cusp(fz);
  // Delegated: the across-passes cusp must be exactly what the landed tile returns.
  const across = computeBallnoseScallopHeight({ r_in: R, mode: "scallop-from-stepover", s_in: s });
  if (across.error) return { error: across.error };
  const stepover_cusp_in = across.out_in;

  const feed_governs = feed_cusp_in > stepover_cusp_in;
  const governing_cusp_in = Math.max(feed_cusp_in, stepover_cusp_in);
  const governed_by = feed_governs ? "the FEED direction" : "the STEPOVER direction";
  const ratio = stepover_cusp_in > 0 ? feed_cusp_in / stepover_cusp_in : null;
  // The setting that would make the two cusps equal - past it, tightening further buys nothing.
  const balanced_feed_in = s;
  const balanced_stepover_in = fz;
  const feedrate_ipm = N > 0 ? fz * z * N : null;
  // Both cusps go as the square of their spacing near the bottom, so a 2x change is 4x.
  const approx_feed_cusp_in = fz * fz / (8 * R);
  const approx_stepover_cusp_in = s * s / (8 * R);

  const note = "A " + (2 * R).toFixed(4) + " in ballnose stepping " + s + " in and feeding " + fz + " in per tooth leaves two cusps, not one: "
    + stepover_cusp_in.toFixed(6) + " in ACROSS the passes and " + feed_cusp_in.toFixed(6) + " in ALONG the feed. "
    + "The surface you get is the larger of the two, so " + governed_by + " governs here at " + governing_cusp_in.toFixed(6) + " in"
    + (ratio !== null ? " (the feed cusp is " + ratio.toFixed(2) + " times the stepover cusp)" : "") + ". "
    + (feed_governs
      ? "Tightening the STEPOVER any further buys nothing until the feed comes down - a common way to spend cycle time on the cusp that was not governing. Drop the feed per tooth to " + balanced_stepover_in + " in to match the stepover cusp. "
      : Math.abs(feed_cusp_in - stepover_cusp_in) < 1e-12
        ? "The two are balanced, which is the efficient point: neither setting is wasting time on a cusp the other already dominates. "
        : "The stepover governs, so the feed has geometric headroom: the cusp would not care until " + balanced_feed_in + " in per tooth. Geometric headroom is not permission - chip load, tool strength, deflection, and the machine's ability to hold the path at speed are what actually cap the feed, and they usually bind first. What this tells you is only that the FINISH is not the reason to keep the feed low. ")
    + "Both cusps follow the same geometry, h = R - sqrt(R^2 - (w/2)^2) with w the stepover or the feed per tooth, and near the bottom both reduce to w^2/(8R) - so they scale with the SQUARE of the spacing and halving either one cuts its cusp by four. "
    + (feedrate_ipm !== null ? "At " + N + " rpm on " + z + " flutes that feed is " + feedrate_ipm.toFixed(1) + " in/min. " : "")
    + "Theoretical geometric cusps on a FLAT surface cut at the tool tip. A sloped surface changes the effective stepover and the effective cutting radius (a ballnose at the tip is cutting at zero surface speed, which is its own finish problem); tool deflection, runout, and the machine's servo behavior at direction changes all add to the real finish. Neither cusp converts to Ra - Ra is an averaged roughness and these are peak-to-valley geometry. A shop aid; the actual finish depends on the tool, the deflection, and the surface slope.";

  return { feed_cusp_in, stepover_cusp_in, governing_cusp_in, feed_governs, governed_by, ratio, balanced_feed_in, balanced_stepover_in, feedrate_ipm, approx_feed_cusp_in, approx_stepover_cusp_in, note };
}
export const ballnoseFeedCuspExample = { inputs: { r_in: 0.25, stepover_in: 0.030, feed_per_tooth_in: 0.006, rpm: 8000, flutes: 2 } };

function _v1128renderBallnoseFeedCusp(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: the ballnose cusp geometry h = R - sqrt(R^2 - (w/2)^2) applied twice - once with w = the stepover, giving the cusp across the passes (delegated to the landed ballnose-scallop-height tile so the two cannot disagree), and once with w = the feed per tooth, giving the cusp along the feed direction that the stepover tile names as separate. Near the bottom both reduce to w^2/(8R), so each scales with the square of its spacing. The finish is the LARGER of the two cusps; the two are balanced when the feed per tooth equals the stepover. Theoretical geometric cusps on a flat surface cut at the tool tip: a sloped surface changes the effective stepover and cutting radius, and tool deflection, runout, and servo behavior at direction changes add to the real finish. Neither converts to Ra, which is an averaged roughness rather than peak-to-valley geometry. A shop aid; the tool, the deflection, and the surface slope govern.";
  const r = makeNumber("Ballnose radius R (in = cutter dia / 2)", "bfc-r", { step: "any", min: "0" }); r.input.value = "0.25";
  const s = makeNumber("Stepover (in)", "bfc-s", { step: "any", min: "0" }); s.input.value = "0.030";
  const fz = makeNumber("Feed per tooth (in)", "bfc-fz", { step: "any", min: "0" }); fz.input.value = "0.006";
  const n = makeNumber("Spindle speed (rpm; 0 to skip the feedrate)", "bfc-n", { step: "any", min: "0" }); n.input.value = "8000";
  const z = makeNumber("Flutes", "bfc-z", { step: "1", min: "1" }); z.input.value = "2";
  for (const f of [r, s, fz, n, z]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { r.input.value = "0.25"; s.input.value = "0.030"; fz.input.value = "0.006"; n.input.value = "8000"; z.input.value = "2"; update(); });
  const oAcross = makeOutputLine(outputRegion, "Cusp across the passes (stepover)", "bfc-out-across");
  const oAlong = makeOutputLine(outputRegion, "Cusp along the feed", "bfc-out-along");
  const oGov = makeOutputLine(outputRegion, "What you actually get", "bfc-out-gov");
  const oBal = makeOutputLine(outputRegion, "To balance the two", "bfc-out-bal");
  const oFeed = makeOutputLine(outputRegion, "Feedrate", "bfc-out-feed");
  const oNote = makeOutputLine(outputRegion, "Note", "bfc-out-note");
  const update = debounce(() => {
    const res = computeBallnoseFeedCusp({ r_in: Number(r.input.value) || 0, stepover_in: Number(s.input.value) || 0, feed_per_tooth_in: Number(fz.input.value) || 0, rpm: Number(n.input.value) || 0, flutes: Number(z.input.value) || 0 });
    if (res.error) { oAcross.textContent = res.error; oAlong.textContent = "-"; oGov.textContent = "-"; oBal.textContent = "-"; oFeed.textContent = "-"; oNote.textContent = "-"; return; }
    oAcross.textContent = fmt(res.stepover_cusp_in, 6) + " in";
    oAlong.textContent = fmt(res.feed_cusp_in, 6) + " in";
    oGov.textContent = fmt(res.governing_cusp_in, 6) + " in - " + res.governed_by + " governs";
    oBal.textContent = res.feed_governs ? "drop the feed to " + fmt(res.balanced_stepover_in, 4) + " in/tooth" : "the feed could open to " + fmt(res.balanced_feed_in, 4) + " in/tooth for free";
    oFeed.textContent = res.feedrate_ipm === null ? "- (enter an rpm)" : fmt(res.feedrate_ipm, 1) + " in/min";
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [r, s, fz, n, z]) f.input.addEventListener("input", update);
}
MACHINING_RENDERERS["ballnose-feed-cusp"] = _v1128renderBallnoseFeedCusp;
