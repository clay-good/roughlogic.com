// Group K: Machining - spindle speed / feed and drill-point geometry.
// spec-v76 cap-relief split: the cohesive machining bench (cutting-speed-rpm,
// drill-point-depth) relocated verbatim out of calc-mechanic.js (which had
// reached 95.6% of cap -- the tightest remaining calc module). Both tiles keep
// group: "K" (group letter independent of module, the v42/v70..v75 precedent).
// See spec-v31 K.4 and spec-v34 K.5.

import {
  DEBOUNCE_MS, debounce, makeNumber,
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
