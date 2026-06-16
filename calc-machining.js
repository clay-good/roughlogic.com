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
