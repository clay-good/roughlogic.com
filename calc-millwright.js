// calc-millwright.js -- the millwright alignment, vibration, and balance bench.
//
// specs/scope-trade-expansion-2.md probed thirty US trades against the live
// registry and millwright shaft alignment and vibration analysis came back at
// ZERO. The catalog had `rotor-balance-grade` -- the ISO 1940 permissible
// residual unbalance, which is a TOLERANCE -- and bearing L10 life, load, and
// regrease tiles. Nothing turned two dial indicator readings into a shim, put
// an overall velocity reading in a zone, named the line in a spectrum, or told
// a crew where to put the correction weight.
//
// Tiles (all group "K", the existing Mechanic category):
//   v1469 shaft-alignment-rim-face      v1474 vibration-severity-zone
//   v1470 shaft-alignment-reverse-dial  v1475 vibration-forcing-frequencies
//   v1471 alignment-thermal-growth      v1476 bearing-defect-frequencies
//   v1472 soft-foot-correction          v1477 single-plane-field-balance
//   v1473 coupling-alignment-tolerance
//
// TWO OF THE NINE SPECS MUDDLE THEIR OWN SIGN CONVENTION, and both do it in
// the prose rather than the arithmetic. spec-v1469 computes a front-foot move
// of -0.0020 in and a rear-foot move of +0.0100 in and then says "both feet
// come UP". spec-v1470 computes +0.0038 in and +0.0362 in -- both positive,
// both the same direction -- and calls them "opposite directions, which is the
// signature of an angular error large relative to the offset". They are not
// opposite. Every move here carries an explicit convention: POSITIVE raises
// the foot (add shim), NEGATIVE lowers it (remove shim), and each output says
// which in words rather than leaving a sign to be read.
//
// NO TOLERANCE OR ZONE TABLE IS SHIPPED. Coupling alignment tolerances and the
// ISO 20816 zone boundaries are entered, for the same reason the line-clearance
// calculator takes its NESC requirement as an input: a table copied into a
// calculator is a table that goes stale silently.

import {
  DEBOUNCE_MS, debounce, makeNumber,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input (copied verbatim
// from the sibling calc-* modules; non-exported, no corpus row).
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

// Every non-exported helper lives ABOVE the first export: check-render-output-
// keys slices its analysis region from a function name to the NEXT
// `export function`, so a helper between two exports has its returns
// attributed to the earlier one and makes it unresolvable.
const _DEG = 180 / Math.PI;
const _MILS_PER_IN = 1000;

// A signed foot move stated in words, so a sign convention never has to be
// inferred from a minus sign the way spec-v1469 and spec-v1470 both did.
function _moveWords(move_in) {
  if (Math.abs(move_in) < 5e-6) return "no move (already on the line)";
  return move_in > 0
    ? "RAISE " + fmt(move_in * _MILS_PER_IN, 1) + " mils -- add shim"
    : "LOWER " + fmt(-move_in * _MILS_PER_IN, 1) + " mils -- remove shim";
}

// Compact renderer factory (number inputs only here; same shape as the
// calc-lineworker.js / calc-steamplant.js / calc-diving.js _simpleRenderer).
function _simpleRenderer(spec) {
  const _mwRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) field.input.value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) params[f.key] = Number(fields[f.key].input.value) || 0;
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) fields[f.key].input.addEventListener("input", update);
  };

  _mwRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _mwRender;
}

export const MILLWRIGHT_RENDERERS = {};

// ============ spec-v1469: rim-and-face shaft alignment ============

// dims: in { rim_tir_in: L, face_tir_in: L, face_diameter_in: L, front_foot_distance_in: L, rear_foot_distance_in: L } out: { offset_in: L, angularity_in_per_in: dimensionless, front_move_in: L, rear_move_in: L, foot_move_difference_in: L }
export function computeShaftAlignmentRimFace({ rim_tir_in = 0, face_tir_in = 0, face_diameter_in = 0, front_foot_distance_in = 0, rear_foot_distance_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(face_diameter_in > 0)) return { error: "The diameter the face indicator swept must be positive (in)." };
  if (!(front_foot_distance_in > 0)) return { error: "Distance from the coupling face to the front foot must be positive (in)." };
  if (!(rear_foot_distance_in > 0)) return { error: "Distance from the coupling face to the rear foot must be positive (in)." };
  if (!(rear_foot_distance_in > front_foot_distance_in)) return { error: "The rear foot must be further from the coupling than the front foot." };
  // The rim reading sees pure offset and reads TWICE it, because the indicator
  // crosses the misalignment on both sides of the sweep.
  const offset_in = rim_tir_in / 2;
  const angularity_in_per_in = face_tir_in / face_diameter_in;
  const angularity_mils_per_in = angularity_in_per_in * _MILS_PER_IN;
  const front_move_in = offset_in + angularity_in_per_in * front_foot_distance_in;
  const rear_move_in = offset_in + angularity_in_per_in * rear_foot_distance_in;
  const foot_move_difference_in = rear_move_in - front_move_in;
  // The angle contributes the DIFFERENCE between the feet; the offset is
  // common to both. Shimming both feet to the offset leaves the whole angle in.
  const front_angular_part_in = angularity_in_per_in * front_foot_distance_in;
  const rear_angular_part_in = angularity_in_per_in * rear_foot_distance_in;
  const outs = [offset_in, angularity_in_per_in, front_move_in, rear_move_in, foot_move_difference_in];
  if (!outs.every(Number.isFinite)) return { error: "Rim-and-face math is not a finite value." };
  const same_direction = front_move_in * rear_move_in > 0;
  return {
    offset_in, offset_mils: offset_in * _MILS_PER_IN,
    angularity_in_per_in, angularity_mils_per_in,
    front_move_in, rear_move_in, foot_move_difference_in,
    front_angular_part_in, rear_angular_part_in, offset_part_in: offset_in,
    front_move_words: _moveWords(front_move_in), rear_move_words: _moveWords(rear_move_in),
    same_direction,
    direction_note: same_direction
      ? "both feet move the SAME way, so the offset dominates the angle over this foot spacing"
      : "the feet move in OPPOSITE directions, which is the signature of an angle large relative to the offset",
    note: "Shaft misalignment is the largest single cause of premature coupling, seal, and bearing failure on rotating equipment, and rim-and-face is how most of it still gets corrected in the field. The rim reading sees pure offset and reads TWICE it, because the indicator crosses the misalignment on both sides of the sweep -- forgetting the divide-by-two is the classic doubling error. The face reading sees pure angularity, which becomes a slope once divided by the diameter the indicator actually swept. Both then project out to the feet, and that projection is why a small angle is worse than a large offset: angularity multiplies by the distance, so a 0.001 in/in slope becomes 0.020 in of shim at a foot 20 in away. EVERY MOVE HERE CARRIES AN EXPLICIT CONVENTION, stated in words rather than left to a sign: positive raises the foot and adds shim, negative lowers it and removes shim. A rim TIR of -0.020 in with a face TIR of +0.006 in on a 6 in sweep gives a -0.0100 in offset and a 1.00 mils/in slope, which projects to LOWERING the front foot 2.0 mils and RAISING the rear foot 10.0 mils -- feet moving in opposite directions, 12.0 mils apart, and that difference IS the angle. A crew that shimmed both feet equally to the offset would leave the entire angular error in place, which is the error this arithmetic exists to prevent. Correct the angle first and the offset second, because moving to fix an angle changes the offset and not the reverse. This is the vertical solve on readings the user takes. It assumes the readings were taken with the shafts rotated together at the same angular positions, without which the numbers describe a bent shaft or a runout rather than a misalignment; it does not correct for indicator bracket sag, which on a long bracket is easily larger than the misalignment being measured and must be measured and subtracted first; and it does not do the horizontal solve, which is the same arithmetic on the side readings and is corrected by jacking rather than shimming. It does not check the result against a tolerance, apply a thermal growth target, or verify soft foot -- and every alignment number is meaningless until soft foot is zero, because a machine that rocks changes shape when the bolts come down. The machine manufacturer's alignment specification, the coupling manufacturer's data, and the plant's own precision maintenance procedure govern.",
  };
}
const shaftAlignmentRimFaceExample = { inputs: { rim_tir_in: -0.020, face_tir_in: 0.006, face_diameter_in: 6, front_foot_distance_in: 8, rear_foot_distance_in: 20 } };
MILLWRIGHT_RENDERERS["shaft-alignment-rim-face"] = _simpleRenderer({
  citation: "Citation: the rim-and-face alignment relations by name -- offset = rim TIR / 2 (the rim reads twice the offset), angularity = face TIR / the diameter the face indicator swept, and the move at a foot = offset + angularity x the distance from the coupling face to that foot. Sign convention stated explicitly: positive raises the foot and adds shim. Bracket sag must be measured and subtracted before the readings are used. The machine manufacturer's alignment specification and the plant's precision maintenance procedure govern.",
  example: shaftAlignmentRimFaceExample.inputs,
  fields: [
    { key: "rim_tir_in", label: "Rim total indicator reading (in, signed)", kind: "number", default: -0.020 },
    { key: "face_tir_in", label: "Face total indicator reading (in, signed)", kind: "number", default: 0.006 },
    { key: "face_diameter_in", label: "Diameter the face indicator swept (in)", kind: "number", default: 6 },
    { key: "front_foot_distance_in", label: "Coupling face to front foot (in)", kind: "number", default: 8 },
    { key: "rear_foot_distance_in", label: "Coupling face to rear foot (in)", kind: "number", default: 20 },
  ],
  outputs: [
    { key: "o", id: "sarf-out-o", label: "Offset at the coupling", value: (r) => fmt(r.offset_mils, 1) + " mils -- half the rim TIR, because the rim reads it twice" },
    { key: "a", id: "sarf-out-a", label: "Angularity", value: (r) => fmt(r.angularity_mils_per_in, 2) + " mils per inch" },
    { key: "f", id: "sarf-out-f", label: "Front foot", value: (r) => r.front_move_words },
    { key: "e", id: "sarf-out-e", label: "Rear foot", value: (r) => r.rear_move_words },
    { key: "d", id: "sarf-out-d", label: "Difference between the feet", value: (r) => fmt(Math.abs(r.foot_move_difference_in) * 1000, 1) + " mils -- that difference IS the angle, and " + r.direction_note },
    { key: "n", id: "sarf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeShaftAlignmentRimFace,
});

// ============ spec-v1470: reverse-dial shaft alignment ============

// dims: in { tir_a_in: L, tir_b_in: L, plane_spacing_in: L, front_foot_distance_in: L, rear_foot_distance_in: L, coupling_center_distance_in: L } out: { offset_a_in: L, offset_b_in: L, slope_in_per_in: dimensionless, front_move_in: L, rear_move_in: L, coupling_center_offset_in: L }
export function computeShaftAlignmentReverseDial({ tir_a_in = 0, tir_b_in = 0, plane_spacing_in = 0, front_foot_distance_in = 0, rear_foot_distance_in = 0, coupling_center_distance_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(plane_spacing_in > 0)) return { error: "The distance between the two indicator planes must be positive (in)." };
  if (!(rear_foot_distance_in > front_foot_distance_in)) return { error: "The rear foot distance must exceed the front foot distance (both measured from plane A toward plane B)." };
  if (coupling_center_distance_in < 0) return { error: "The coupling centre distance cannot be negative (measure it from plane A toward plane B)." };
  // Two rim readings, two points, one line. No face measurement at all, which
  // is why it tolerates axial float on long and spacer couplings.
  const offset_a_in = tir_a_in / 2;
  const offset_b_in = tir_b_in / 2;
  const slope_in_per_in = (offset_b_in - offset_a_in) / plane_spacing_in;
  const slope_mils_per_in = slope_in_per_in * _MILS_PER_IN;
  const at = (L) => offset_a_in + slope_in_per_in * L;
  const front_move_in = at(front_foot_distance_in);
  const rear_move_in = at(rear_foot_distance_in);
  const coupling_center_offset_in = coupling_center_distance_in > 0 ? at(coupling_center_distance_in) : offset_a_in;
  const foot_move_difference_in = rear_move_in - front_move_in;
  const outs = [offset_a_in, offset_b_in, slope_in_per_in, front_move_in, rear_move_in, coupling_center_offset_in];
  if (!outs.every(Number.isFinite)) return { error: "Reverse-dial math is not a finite value." };
  const same_direction = front_move_in * rear_move_in > 0;
  return {
    offset_a_in, offset_b_in, slope_in_per_in, slope_mils_per_in,
    front_move_in, rear_move_in, foot_move_difference_in, coupling_center_offset_in,
    front_move_words: _moveWords(front_move_in), rear_move_words: _moveWords(rear_move_in),
    same_direction,
    direction_note: same_direction
      ? "both feet move the SAME way here -- the offset carries further than the angle over this foot spacing"
      : "the feet move in OPPOSITE directions, the signature of an angle large relative to the offset",
    note: "Reverse-dial beats rim-and-face on anything with axial float or a long span, because BOTH readings are rim readings and neither depends on a face being square. Two indicators sweep each shaft from the other, giving the relative position of the two shaft centerlines at two planes a known distance apart -- and two points define a line, so the misalignment is fully described without any face measurement at all. That is exactly why it is the method of choice on long couplings and spacer couplings. Everything after that is one straight line extrapolated to the feet. The single largest source of error is the direction convention: the distance to a foot must be measured in the SAME sense as the plane spacing, from plane A toward plane B, and a foot on the far side of plane A carries a negative distance. Readings of -0.014 in at A and +0.022 in at B ten inches apart give centerline offsets of -7.0 and +11.0 mils and a slope of 1.80 mils per inch, which projects to RAISING the front foot 3.8 mils and RAISING the rear foot 36.2 mils -- both the same direction, because over this foot spacing the line has already crossed zero before the front foot. That is worth stating plainly, because the moves being opposite is a real and different signature, and reading two positive numbers as opposite is how a crew makes an alignment worse instead of better. The projected centerline position at the coupling centre is reported so the result can be checked against a tolerance rather than trusted. This is the vertical solve on readings the user takes. It assumes both indicators swept with the shafts rotated together and that bracket sag has already been measured and subtracted -- on the long brackets reverse-dial invites, sag is easily larger than the misalignment being measured. It does not do the horizontal solve, which is the same arithmetic on the side readings and is corrected by jacking rather than shimming; it does not check the result against a tolerance, apply a thermal growth target, or verify soft foot, and every alignment number is meaningless until soft foot is zero. The machine manufacturer's alignment specification, the coupling manufacturer's data, and the plant's own precision maintenance procedure govern.",
  };
}
const shaftAlignmentReverseDialExample = { inputs: { tir_a_in: -0.014, tir_b_in: 0.022, plane_spacing_in: 10, front_foot_distance_in: 6, rear_foot_distance_in: 24, coupling_center_distance_in: 5 } };
MILLWRIGHT_RENDERERS["shaft-alignment-reverse-dial"] = _simpleRenderer({
  citation: "Citation: the reverse-dial alignment relations by name -- centerline offset at each plane = that plane's TIR / 2, slope = (offset B - offset A) / the plane spacing, and the move at a foot = offset A + slope x the distance from plane A to that foot, measured in the same sense as the plane spacing. Sign convention stated explicitly: positive raises the foot and adds shim. Bracket sag must be measured and subtracted before the readings are used. The machine manufacturer's alignment specification and the plant's precision maintenance procedure govern.",
  example: shaftAlignmentReverseDialExample.inputs,
  fields: [
    { key: "tir_a_in", label: "Total indicator reading at plane A (in, signed)", kind: "number", default: -0.014 },
    { key: "tir_b_in", label: "Total indicator reading at plane B (in, signed)", kind: "number", default: 0.022 },
    { key: "plane_spacing_in", label: "Distance between the planes (in)", kind: "number", default: 10 },
    { key: "front_foot_distance_in", label: "Plane A to front foot, toward B (in)", kind: "number", default: 6 },
    { key: "rear_foot_distance_in", label: "Plane A to rear foot, toward B (in)", kind: "number", default: 24 },
    { key: "coupling_center_distance_in", label: "Plane A to the coupling centre (in, 0 to skip)", kind: "number", default: 5 },
  ],
  outputs: [
    { key: "a", id: "sard-out-a", label: "Centerline offset at the two planes", value: (r) => fmt(r.offset_a_in * 1000, 1) + " mils at A, " + fmt(r.offset_b_in * 1000, 1) + " mils at B" },
    { key: "s", id: "sard-out-s", label: "Slope between them", value: (r) => fmt(r.slope_mils_per_in, 2) + " mils per inch" },
    { key: "f", id: "sard-out-f", label: "Front foot", value: (r) => r.front_move_words },
    { key: "e", id: "sard-out-e", label: "Rear foot", value: (r) => r.rear_move_words },
    { key: "d", id: "sard-out-d", label: "Direction check", value: (r) => r.direction_note },
    { key: "c", id: "sard-out-c", label: "Offset at the coupling centre", value: (r) => fmt(r.coupling_center_offset_in * 1000, 1) + " mils -- check this against the tolerance for the speed" },
    { key: "n", id: "sard-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeShaftAlignmentReverseDial,
});

// ============ spec-v1471: machine thermal growth offset ============

// dims: in { stationary_support_height_in: L, stationary_alpha_per_f: dimensionless, stationary_operating_temp_f: T, movable_support_height_in: L, movable_alpha_per_f: dimensionless, movable_operating_temp_f: T, ambient_temp_f: T, tolerance_offset_mils: L } out: { stationary_growth_in: L, movable_growth_in: L, relative_growth_in: L, cold_target_offset_in: L, tolerance_multiple: dimensionless }
export function computeAlignmentThermalGrowth({ stationary_support_height_in = 0, stationary_alpha_per_f = 0.0000065, stationary_operating_temp_f = 70, movable_support_height_in = 0, movable_alpha_per_f = 0.0000065, movable_operating_temp_f = 70, ambient_temp_f = 70, tolerance_offset_mils = 2 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(stationary_support_height_in > 0)) return { error: "The stationary machine's support height must be positive (in)." };
  if (!(movable_support_height_in > 0)) return { error: "The movable machine's support height must be positive (in)." };
  if (!(stationary_alpha_per_f > 0) || !(movable_alpha_per_f > 0)) return { error: "Each coefficient of thermal expansion must be positive (per degF)." };
  if (!(tolerance_offset_mils > 0)) return { error: "The offset tolerance must be positive (mils)." };
  // Ordinary thermal expansion of the pedestal between the mounting plane and
  // the shaft centerline. It depends on that HEIGHT, the material and the rise
  // -- not on the machine's power or size.
  const stationary_growth_in = stationary_alpha_per_f * stationary_support_height_in * (stationary_operating_temp_f - ambient_temp_f);
  const movable_growth_in = movable_alpha_per_f * movable_support_height_in * (movable_operating_temp_f - ambient_temp_f);
  // What matters is the DIFFERENCE: two machines that grow equally stay aligned.
  const relative_growth_in = movable_growth_in - stationary_growth_in;
  const cold_target_offset_in = -relative_growth_in;
  const uncorrected_hot_offset_mils = relative_growth_in * _MILS_PER_IN;
  const tolerance_multiple = Math.abs(uncorrected_hot_offset_mils) / tolerance_offset_mils;
  const outs = [stationary_growth_in, movable_growth_in, relative_growth_in, cold_target_offset_in, tolerance_multiple];
  if (!outs.every(Number.isFinite)) return { error: "Thermal growth math is not a finite value." };
  const within = tolerance_multiple <= 1;
  return {
    stationary_growth_in, movable_growth_in, relative_growth_in, cold_target_offset_in,
    uncorrected_hot_offset_mils, tolerance_multiple, tolerance_offset_mils, within,
    cold_target_words: Math.abs(cold_target_offset_in) < 5e-6
      ? "no cold target: the two machines grow together, so align them dead on"
      : cold_target_offset_in < 0
        ? "set the movable machine LOW by " + fmt(-cold_target_offset_in * _MILS_PER_IN, 1) + " mils cold"
        : "set the movable machine HIGH by " + fmt(cold_target_offset_in * _MILS_PER_IN, 1) + " mils cold",
    skip_verdict: within
      ? "skipping the correction leaves " + fmt(Math.abs(uncorrected_hot_offset_mils), 1) + " mils hot, inside the " + fmt(tolerance_offset_mils, 1) + " mil tolerance -- this one can be aligned dead on"
      : "skipping the correction leaves " + fmt(Math.abs(uncorrected_hot_offset_mils), 1) + " mils hot, " + fmt(tolerance_multiple, 1) + " times the " + fmt(tolerance_offset_mils, 1) + " mil tolerance",
    note: "A pump aligned cold and running hot is a pump out of alignment, because the hot machine's centerline rises as its supports grow. Support growth is ordinary thermal expansion of the pedestal between the mounting plane and the shaft centerline, so it depends on that HEIGHT, the material, and the temperature rise -- not on the machine's power or its size, which is the intuition it defeats. What matters is the DIFFERENCE between the two machines. A motor and pump that grow equally stay aligned however hot they get, and a hot pump on a short pedestal beside a cool motor on a tall one can grow the wrong way entirely, so the correction has a sign and the sign is not guessable. The correction is applied as a cold TARGET: the machine is deliberately out of alignment cold and comes INTO alignment at operating temperature. A pump on an 18 in cast steel pedestal at 6.5e-06 per degF running 90 degF above ambient rises 10.5 mils, so it is set 10.5 mils low cold; skip that and the running offset is 10.5 mils against an acceptable figure near 2 mils for a 3,600 rpm machine, which is roughly five times the tolerance from a correction that takes one line of arithmetic. The target is reported as a signed offset to be entered directly into the rim-and-face or reverse-dial move, which is the form a millwright can use without a second conversion. This is uniform expansion of a support of one material and one height. It does not model transient states -- a machine passing through startup is momentarily aligned for neither condition, and on a large machine the transient can be the worst case; it does not handle piping strain, which moves a pump centerline in ways temperature does not explain and which is a far more common cause of a machine that will not stay aligned; and it does not address the horizontal growth that a long, hot casing produces, or bearing-to-bearing differential growth within one machine. Measured growth from laser targets or optical readings taken hot beats any calculated value, and where a manufacturer publishes a growth target that target governs. The machine manufacturer's data, the plant's precision maintenance procedure, and hot alignment verification govern.",
  };
}
const alignmentThermalGrowthExample = { inputs: { stationary_support_height_in: 14, stationary_alpha_per_f: 0.0000065, stationary_operating_temp_f: 75, movable_support_height_in: 18, movable_alpha_per_f: 0.0000065, movable_operating_temp_f: 160, ambient_temp_f: 70, tolerance_offset_mils: 2 } };
MILLWRIGHT_RENDERERS["alignment-thermal-growth"] = _simpleRenderer({
  citation: "Citation: the support thermal-growth relation by name -- growth = coefficient of thermal expansion x support height from the mounting plane to the shaft centerline x temperature rise -- with the cold target taken as the NEGATIVE of the relative growth between the two machines. Measured hot growth from laser or optical targets beats any calculated value, and a manufacturer's published growth target governs where one exists. The machine manufacturer's data and hot alignment verification govern.",
  example: alignmentThermalGrowthExample.inputs,
  fields: [
    { key: "stationary_support_height_in", label: "Stationary machine support height (in)", kind: "number", default: 14 },
    { key: "stationary_alpha_per_f", label: "Stationary support expansion coefficient (per F)", kind: "number", default: 0.0000065 },
    { key: "stationary_operating_temp_f", label: "Stationary machine operating temperature (F)", kind: "number", default: 75 },
    { key: "movable_support_height_in", label: "Movable machine support height (in)", kind: "number", default: 18 },
    { key: "movable_alpha_per_f", label: "Movable support expansion coefficient (per F)", kind: "number", default: 0.0000065 },
    { key: "movable_operating_temp_f", label: "Movable machine operating temperature (F)", kind: "number", default: 160 },
    { key: "ambient_temp_f", label: "Ambient temperature (F)", kind: "number", default: 70 },
    { key: "tolerance_offset_mils", label: "Offset tolerance at operating speed (mils)", kind: "number", default: 2 },
  ],
  outputs: [
    { key: "s", id: "atg-out-s", label: "Growth of each machine", value: (r) => fmt(r.stationary_growth_in * 1000, 1) + " mils stationary, " + fmt(r.movable_growth_in * 1000, 1) + " mils movable" },
    { key: "r", id: "atg-out-r", label: "Relative growth", value: (r) => fmt(r.relative_growth_in * 1000, 1) + " mils -- the DIFFERENCE is what matters; machines that grow together stay aligned" },
    { key: "t", id: "atg-out-t", label: "Cold target", value: (r) => r.cold_target_words },
    { key: "k", id: "atg-out-k", label: "If you skip it", value: (r) => r.skip_verdict },
    { key: "n", id: "atg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAlignmentThermalGrowth,
});

// ============ spec-v1472: soft foot measurement and correction ============

// dims: in { foot_lf_in: L, foot_rf_in: L, foot_lr_in: L, foot_rr_in: L, threshold_in: L } out: { worst_foot_rise_in: L, diagonal_lf_rr_in: L, diagonal_rf_lr_in: L, diagonal_difference_in: L, failing_feet: dimensionless }
export function computeSoftFootCorrection({ foot_lf_in = 0, foot_rf_in = 0, foot_lr_in = 0, foot_rr_in = 0, threshold_in = 0.002 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const feet = [["LF", foot_lf_in], ["RF", foot_rf_in], ["LR", foot_lr_in], ["RR", foot_rr_in]];
  if (feet.some(([, v]) => v < 0)) return { error: "A soft-foot rise cannot be negative: the indicator reads the rise when that foot is loosened." };
  if (!(threshold_in > 0)) return { error: "The acceptance threshold must be positive (in)." };
  const failing = feet.filter(([, v]) => v > threshold_in);
  const worst = feet.reduce((a, f) => (f[1] > a[1] ? f : a), feet[0]);
  const worst_foot_rise_in = worst[1];
  const worst_foot_name = worst[0];
  // A twisted base shows as two matched diagonals with a large difference
  // between them; one bad foot shows as one diagonal carrying the whole rise.
  const diagonal_lf_rr_in = foot_lf_in + foot_rr_in;
  const diagonal_rf_lr_in = foot_rf_in + foot_lr_in;
  const diagonal_difference_in = Math.abs(diagonal_lf_rr_in - diagonal_rf_lr_in);
  const total_rise_in = feet.reduce((a, f) => a + f[1], 0);
  const outs = [worst_foot_rise_in, diagonal_lf_rr_in, diagonal_rf_lr_in, diagonal_difference_in];
  if (!outs.every(Number.isFinite)) return { error: "Soft-foot math is not a finite value." };
  // One dominant foot points at that foot; a diagonal difference spread across
  // two feet on the same diagonal points at a twisted base.
  const single_foot_dominates = failing.length === 1 && worst_foot_rise_in >= 0.6 * total_rise_in;
  return {
    feet: feet.map(([name, v]) => name + " " + fmt(v * _MILS_PER_IN, 1) + " mils" + (v > threshold_in ? " FAIL" : " pass")).join(", "),
    worst_foot_name, worst_foot_rise_in, failing_feet: failing.length, total_rise_in,
    diagonal_lf_rr_in, diagonal_rf_lr_in, diagonal_difference_in, threshold_in,
    passes: failing.length === 0,
    shim_words: failing.length === 0
      ? "every foot is inside the threshold -- shim nothing and go align it"
      : "shim " + failing.map(([n, v]) => n + " by " + fmt(v * _MILS_PER_IN, 1) + " mils").join(", ") + ", then sweep ALL FOUR again, because relieving one foot redistributes the others",
    pattern_verdict: single_foot_dominates
      ? "one foot carries the rise and the diagonals disagree by " + fmt(diagonal_difference_in * _MILS_PER_IN, 1) + " mils, which points at " + worst_foot_name + " rather than at a twisted base"
      : failing.length === 0
        ? "no pattern to read: nothing is failing"
        : "the rise is spread across more than one foot, which is the signature of a twisted or unflat base rather than a single bad foot -- check the base before chasing shims",
    note: "Every alignment number is a lie until soft foot is zero, because a machine that rocks changes shape when the bolts come down. Loosen one foot with an indicator on it and watch what moves: if the foot springs up, the bolt was pulling the machine down onto a gap and distorting the frame, and the shim to add is exactly the rise measured. Working ONE foot at a time with the other three tight is what isolates each one, and repeating the whole sweep matters because correcting one foot redistributes the others. Two kinds hide behind the same reading. Parallel soft foot is a plain gap and takes a flat shim. Angular soft foot is a foot that is not parallel to the base and takes a stepped or machined shim -- a flat shim under an angular foot only moves the contact point and can make the reading worse. The diagonal check is what separates a bad foot from a bad base: four feet reading 1, 7, 2 and 1 mils give diagonals of 2 and 9, disagreeing by 7, and the whole disagreement sits on the one foot reading 7. A twisted base instead shows the rise spread across a diagonal pair. Shim the bad foot and sweep all four again. Aligning a machine before that shim goes in produces a beautiful set of cold readings that change the moment the bolts are torqued, which is why this comes first and not last. This reads the indicator numbers the user takes. It does not distinguish parallel from angular soft foot by measurement -- that needs a feeler gauge under the foot at several points, or a step check, and the pattern reported here is an indication and not a determination. It does not evaluate the base, grout, or anchor bolts, a cracked or voided grout being a common root cause that shimming will not fix; it does not address bolt torque or the bolt-bound condition where a machine cannot be moved horizontally without drilling; and it does not check pipe strain, which produces the same symptom and is not cured by shims. The machine manufacturer's mounting requirements and the plant's precision maintenance procedure govern.",
  };
}
const softFootCorrectionExample = { inputs: { foot_lf_in: 0.001, foot_rf_in: 0.007, foot_lr_in: 0.002, foot_rr_in: 0.001, threshold_in: 0.002 } };
MILLWRIGHT_RENDERERS["soft-foot-correction"] = _simpleRenderer({
  citation: "Citation: the soft-foot sweep by name -- the rise measured at a foot when that foot alone is loosened is the shim that foot needs, with the other three tight; the diagonal sums are compared to separate a single bad foot from a twisted base. The 0.002 in (0.05 mm) acceptance figure is common precision-maintenance practice and is entered, not fixed. The machine manufacturer's mounting requirements and the plant's precision maintenance procedure govern.",
  example: softFootCorrectionExample.inputs,
  fields: [
    { key: "foot_lf_in", label: "Left front rise when loosened (in)", kind: "number", default: 0.001 },
    { key: "foot_rf_in", label: "Right front rise when loosened (in)", kind: "number", default: 0.007 },
    { key: "foot_lr_in", label: "Left rear rise when loosened (in)", kind: "number", default: 0.002 },
    { key: "foot_rr_in", label: "Right rear rise when loosened (in)", kind: "number", default: 0.001 },
    { key: "threshold_in", label: "Acceptance threshold (in)", kind: "number", default: 0.002 },
  ],
  outputs: [
    { key: "f", id: "sfc-out-f", label: "The four feet", value: (r) => r.feet },
    { key: "w", id: "sfc-out-w", label: "Worst foot", value: (r) => r.worst_foot_name + " at " + fmt(r.worst_foot_rise_in * 1000, 1) + " mils, against a " + fmt(r.threshold_in * 1000, 1) + " mil threshold" },
    { key: "s", id: "sfc-out-s", label: "Shim", value: (r) => r.shim_words },
    { key: "d", id: "sfc-out-d", label: "Diagonal check", value: (r) => "LF+RR = " + fmt(r.diagonal_lf_rr_in * 1000, 1) + " mils, RF+LR = " + fmt(r.diagonal_rf_lr_in * 1000, 1) + " mils -- " + r.pattern_verdict },
    { key: "n", id: "sfc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSoftFootCorrection,
});

// ============ spec-v1473: coupling alignment tolerance by speed ============

// dims: in { rpm: dimensionless, measured_offset_in: L, measured_angularity_mils_per_in: dimensionless, offset_excellent_in: L, offset_acceptable_in: L, angularity_excellent_mils_per_in: dimensionless, angularity_acceptable_mils_per_in: dimensionless, spacer_length_in: L, spacer_end_offset_in: L } out: { offset_pct_of_acceptable: dimensionless, angularity_pct_of_acceptable: dimensionless, offset_over_by_in: L, spacer_slope_mils_per_in: dimensionless }
export function computeCouplingAlignmentTolerance({ rpm = 0, measured_offset_in = 0, measured_angularity_mils_per_in = 0, offset_excellent_in = 0, offset_acceptable_in = 0, angularity_excellent_mils_per_in = 0, angularity_acceptable_mils_per_in = 0, spacer_length_in = 0, spacer_end_offset_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rpm > 0)) return { error: "Operating speed must be positive (rpm)." };
  if (measured_offset_in < 0 || measured_angularity_mils_per_in < 0) return { error: "Measured offset and angularity are magnitudes and cannot be negative." };
  if (!(offset_acceptable_in > 0)) return { error: "Enter the acceptable offset tolerance for this speed (in). No tolerance table is shipped." };
  if (!(angularity_acceptable_mils_per_in > 0)) return { error: "Enter the acceptable angularity tolerance for this speed (mils per inch)." };
  if (offset_excellent_in < 0 || angularity_excellent_mils_per_in < 0) return { error: "The excellent-column tolerances cannot be negative." };
  if (spacer_length_in < 0 || spacer_end_offset_in < 0) return { error: "Spacer length and end offset cannot be negative." };
  const offset_pct_of_acceptable = measured_offset_in / offset_acceptable_in * 100;
  const angularity_pct_of_acceptable = measured_angularity_mils_per_in / angularity_acceptable_mils_per_in * 100;
  const offset_pct_of_excellent = offset_excellent_in > 0 ? measured_offset_in / offset_excellent_in * 100 : null;
  const angularity_pct_of_excellent = angularity_excellent_mils_per_in > 0 ? measured_angularity_mils_per_in / angularity_excellent_mils_per_in * 100 : null;
  const offset_passes = measured_offset_in <= offset_acceptable_in;
  const angularity_passes = measured_angularity_mils_per_in <= angularity_acceptable_mils_per_in;
  const offset_over_by_in = measured_offset_in - offset_acceptable_in;
  const angularity_over_by = measured_angularity_mils_per_in - angularity_acceptable_mils_per_in;
  // For a spacer coupling the meaningful quantity is the SLOPE across the
  // spacer, not an offset at a plane: a long spacer legitimately allows a
  // large end-to-end offset while the slope stays tight.
  const spacer_slope_mils_per_in = spacer_length_in > 0 ? spacer_end_offset_in * _MILS_PER_IN / spacer_length_in : null;
  const spacer_passes = spacer_slope_mils_per_in === null ? null : spacer_slope_mils_per_in <= angularity_acceptable_mils_per_in;
  const outs = [offset_pct_of_acceptable, angularity_pct_of_acceptable, offset_over_by_in];
  if (!outs.every(Number.isFinite)) return { error: "Alignment tolerance math is not a finite value." };
  return {
    rpm, offset_pct_of_acceptable, angularity_pct_of_acceptable,
    offset_pct_of_excellent, angularity_pct_of_excellent,
    offset_passes, angularity_passes, offset_over_by_in, angularity_over_by,
    spacer_slope_mils_per_in, spacer_passes, spacer_length_in,
    passes: offset_passes && angularity_passes,
    offset_verdict: offset_passes
      ? fmt(offset_pct_of_acceptable, 0) + "% of the acceptable tolerance -- pass"
      : "FAIL at " + fmt(offset_pct_of_acceptable, 0) + "% of tolerance, over by " + fmt(offset_over_by_in * _MILS_PER_IN, 1) + " mils",
    angularity_verdict: angularity_passes
      ? fmt(angularity_pct_of_acceptable, 0) + "% of the acceptable tolerance -- pass"
      : "FAIL at " + fmt(angularity_pct_of_acceptable, 0) + "% of tolerance, over by " + fmt(angularity_over_by, 2) + " mils per inch",
    spacer_verdict: spacer_slope_mils_per_in === null
      ? "(no spacer entered -- for a short coupling, offset and angularity are checked separately, which is what is done above)"
      : fmt(spacer_slope_mils_per_in, 2) + " mils per inch across a " + fmt(spacer_length_in, 1) + " in spacer -- " + (spacer_passes ? "inside the angularity tolerance, and the end-to-end offset is not the number to judge it by" : "OVER the angularity tolerance"),
    note: "Rim-and-face and reverse-dial produce numbers; whether those numbers are good enough depends almost entirely on SPEED, and the tolerance tightens far faster with rpm than intuition suggests. Alignment tolerance is a statement about the cyclic bending the coupling and the shaft ends see once per revolution: double the speed and the same misalignment produces the same deflection twice as often, so the allowable misalignment falls roughly in proportion. A 0.005 in offset that is fine at 900 rpm is a failure at 3,600. The widely used field tables reflect that, with an acceptable offset near 0.009 in below 1,000 rpm tightening to about 0.003 in at 3,000 and below 0.0025 in above it, and an excellent column roughly half of each -- but NO TABLE IS SHIPPED HERE, because the values differ between references and between plant standards and a table copied into a calculator is a table that goes stale silently. Two things this catches. A coupling manufacturer's published capability is NOT a tolerance: couplings can accommodate far more misalignment than the bearings and seals behind them will tolerate, and the machine sets the limit, not the coupling. And for a spacer coupling the meaningful quantity is the SLOPE across the spacer rather than an offset at a plane, so a long spacer legitimately allows a large end-to-end offset while the slope stays tight -- judging a spacer coupling by its end-to-end offset condemns alignments that are fine. The value of running the check rather than eyeballing the readings is that at 3,600 rpm half a thousandth is the difference between inside and outside tolerance, and the same reading at 1,200 rpm would sit comfortably in the excellent column. This compares magnitudes against tolerances the user enters. It does not select the tolerance, which depends on the reference, the plant standard, and the machine; it does not evaluate the coupling type's own limits, the bearings, or the seals; and it says nothing about whether a passing alignment will stay passing, which is thermal growth, pipe strain, and soft foot rather than arithmetic. The machine manufacturer's alignment specification, the plant's precision maintenance standard, and the coupling manufacturer's data govern.",
  };
}
const couplingAlignmentToleranceExample = { inputs: { rpm: 3600, measured_offset_in: 0.0035, measured_angularity_mils_per_in: 0.8, offset_excellent_in: 0.0015, offset_acceptable_in: 0.003, angularity_excellent_mils_per_in: 0.5, angularity_acceptable_mils_per_in: 1.0, spacer_length_in: 0, spacer_end_offset_in: 0 } };
MILLWRIGHT_RENDERERS["coupling-alignment-tolerance"] = _simpleRenderer({
  citation: "Citation: the speed-dependent coupling alignment tolerance comparison, with the tolerance values ENTERED rather than shipped -- offset and angularity as a percent of the acceptable and excellent columns for the operating speed, and a spacer coupling judged on the SLOPE across the spacer rather than on an end-to-end offset. Tolerance tightens roughly in inverse proportion to speed because the misalignment is cycled once per revolution. A coupling manufacturer's published capability is not a tolerance. The machine manufacturer's alignment specification and the plant's precision maintenance standard govern.",
  example: couplingAlignmentToleranceExample.inputs,
  fields: [
    { key: "rpm", label: "Operating speed (rpm)", kind: "number", default: 3600 },
    { key: "measured_offset_in", label: "Measured offset (in)", kind: "number", default: 0.0035 },
    { key: "measured_angularity_mils_per_in", label: "Measured angularity (mils per inch)", kind: "number", default: 0.8 },
    { key: "offset_excellent_in", label: "Excellent offset tolerance (in)", kind: "number", default: 0.0015 },
    { key: "offset_acceptable_in", label: "Acceptable offset tolerance (in)", kind: "number", default: 0.003 },
    { key: "angularity_excellent_mils_per_in", label: "Excellent angularity tolerance (mils per inch)", kind: "number", default: 0.5 },
    { key: "angularity_acceptable_mils_per_in", label: "Acceptable angularity tolerance (mils per inch)", kind: "number", default: 1.0 },
    { key: "spacer_length_in", label: "Spacer length (in, 0 for a short coupling)", kind: "number", default: 0 },
    { key: "spacer_end_offset_in", label: "End-to-end offset across the spacer (in)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "o", id: "cat-out-o", label: "Offset against tolerance", value: (r) => r.offset_verdict + (r.offset_pct_of_excellent === null ? "" : "; " + fmt(r.offset_pct_of_excellent, 0) + "% of the excellent column") },
    { key: "a", id: "cat-out-a", label: "Angularity against tolerance", value: (r) => r.angularity_verdict + (r.angularity_pct_of_excellent === null ? "" : "; " + fmt(r.angularity_pct_of_excellent, 0) + "% of the excellent column") },
    { key: "v", id: "cat-out-v", label: "Verdict at speed", value: (r) => r.passes ? "inside the acceptable tolerance at " + fmt(r.rpm, 0) + " rpm on both counts" : "OUTSIDE the acceptable tolerance at " + fmt(r.rpm, 0) + " rpm -- and at half this speed the same readings would likely pass" },
    { key: "s", id: "cat-out-s", label: "Spacer coupling", value: (r) => r.spacer_verdict },
    { key: "n", id: "cat-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCouplingAlignmentTolerance,
});

// ============ spec-v1474: vibration severity zone ============

// dims: in { reading: L / T, reading_is_mm_s: dimensionless, boundary_ab: L / T, boundary_bc: L / T, boundary_cd: L / T, previous_reading: L / T, interval_months: T } out: { reading_in_s: L / T, reading_mm_s: L / T, margin_to_next_zone_in_s: L / T, change_pct: dimensionless, change_per_month_in_s: L / T }
export function computeVibrationSeverityZone({ reading = 0, reading_is_mm_s = 0, boundary_ab = 0.044, boundary_bc = 0.110, boundary_cd = 0.280, previous_reading = 0, interval_months = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(reading > 0)) return { error: "The overall velocity reading must be positive." };
  if (!(boundary_ab > 0) || !(boundary_bc > boundary_ab) || !(boundary_cd > boundary_bc)) return { error: "The three zone boundaries must be positive and increasing (A/B < B/C < C/D), in in/s. ISO 20816 sets them by machine class; no table is shipped." };
  if (previous_reading < 0) return { error: "A previous reading cannot be negative." };
  if (interval_months < 0) return { error: "The interval cannot be negative (months)." };
  const MM_S_PER_IN_S = 25.4;
  const toIns = (v) => (reading_is_mm_s > 0 ? v / MM_S_PER_IN_S : v);
  const reading_in_s = toIns(reading);
  const reading_mm_s = reading_in_s * MM_S_PER_IN_S;
  let zone, next_boundary;
  if (reading_in_s <= boundary_ab) { zone = "A"; next_boundary = boundary_ab; }
  else if (reading_in_s <= boundary_bc) { zone = "B"; next_boundary = boundary_bc; }
  else if (reading_in_s <= boundary_cd) { zone = "C"; next_boundary = boundary_cd; }
  else { zone = "D"; next_boundary = boundary_cd; }
  const margin_to_next_zone_in_s = zone === "D" ? reading_in_s - boundary_cd : next_boundary - reading_in_s;
  const previous_in_s = previous_reading > 0 ? toIns(previous_reading) : null;
  const change_pct = previous_in_s === null ? null : (reading_in_s - previous_in_s) / previous_in_s * 100;
  const change_per_month_in_s = previous_in_s === null || !(interval_months > 0) ? null : (reading_in_s - previous_in_s) / interval_months;
  const crossed = previous_in_s === null ? null : (previous_in_s <= boundary_ab ? "A" : previous_in_s <= boundary_bc ? "B" : previous_in_s <= boundary_cd ? "C" : "D") !== zone;
  const outs = [reading_in_s, reading_mm_s, margin_to_next_zone_in_s];
  if (!outs.every(Number.isFinite)) return { error: "Vibration zone math is not a finite value." };
  const meaning = { A: "new machine condition", B: "acceptable for unrestricted long-term operation", C: "unsatisfactory for long-term operation: plan corrective action, do not necessarily shut down", D: "severe -- damage may be occurring" }[zone];
  return {
    reading_in_s, reading_mm_s, zone, zone_meaning: meaning,
    boundary_ab, boundary_bc, boundary_cd, margin_to_next_zone_in_s,
    previous_in_s, change_pct, change_per_month_in_s, crossed_a_boundary: crossed,
    zone_verdict: "zone " + zone + " -- " + meaning,
    margin_verdict: zone === "D"
      ? fmt(margin_to_next_zone_in_s, 3) + " in/s ABOVE the C/D boundary"
      : fmt(margin_to_next_zone_in_s, 3) + " in/s below the " + (zone === "A" ? "A/B" : zone === "B" ? "B/C" : "C/D") + " boundary",
    trend_verdict: change_pct === null
      ? "(no previous reading entered -- and the CHANGE often matters more than the zone)"
      : (change_pct >= 0 ? "up " : "down ") + fmt(Math.abs(change_pct), 0) + "%" + (change_per_month_in_s === null ? "" : ", " + fmt(Math.abs(change_per_month_in_s), 4) + " in/s per month") + (crossed ? " AND it crossed a zone boundary in one interval" : " without crossing a zone boundary -- which a doubling inside zone B still makes actionable"),
    note: "An overall vibration reading in inches per second means nothing without a class, because the same absolute velocity means different things on a 10 hp pump and a 2,000 hp compressor on a soft foundation. ISO 20816 splits machines into classes by power and mounting, and within a class the three zone boundaries are fixed velocities -- so the reading and the class together give the answer with no judgment required, which is exactly what makes it useful to a technician who is not a vibration analyst. Zone A is new-machine condition, B is acceptable for unrestricted long-term operation, C is unsatisfactory for the long term and means plan the work rather than necessarily shut down, and D is severe with damage possibly occurring. A 60 hp pump on the Class II boundaries reading 0.135 in/s sits in zone C: above the 0.110 B/C boundary and below the 0.280 C/D. THE ZONE IS A SCREEN, NOT A DIAGNOSIS. A reading in zone C says something is wrong and says nothing whatever about what; the forcing-frequency and bearing-defect calculations are what turn an overall level into a cause. Equally important is the CHANGE, which is the part a single reading cannot show: a machine that has gone from 0.062 to 0.135 in/s in six months has grown 118% and crossed a boundary in one interval, and a machine that has merely doubled from 0.06 to 0.12 is telling a clear story even though both readings sit inside zone B. The standard's own guidance treats a significant change as actionable regardless of zone, and that rate is what turns a scheduled inspection into a planned outage before it becomes an unplanned one. NO CLASS TABLE IS SHIPPED: the boundaries are entered, because they depend on the class, on the edition, and on whether the plant has adopted its own limits. This is an overall broadband velocity screen. It does not diagnose, identify a fault, or evaluate displacement or acceleration, and an overall velocity in the standard's band is insensitive to exactly the high-frequency energy that early bearing damage produces -- a bearing can be failing with the overall reading firmly in zone B. It does not address measurement quality: transducer mounting, location, direction, and the band the instrument actually integrated all change the number, and readings taken differently are not comparable, which matters most for the trend. ISO 20816, the machine manufacturer's limits, and the plant's condition monitoring programme govern.",
  };
}
const vibrationSeverityZoneExample = { inputs: { reading: 0.135, reading_is_mm_s: 0, boundary_ab: 0.044, boundary_bc: 0.110, boundary_cd: 0.280, previous_reading: 0.062, interval_months: 6 } };
MILLWRIGHT_RENDERERS["vibration-severity-zone"] = _simpleRenderer({
  citation: "Citation: the ISO 20816 vibration severity zones A/B/C/D, CITED NOT MIRRORED -- the class boundaries are entered by the user because they depend on the machine class, the edition, and the plant's own adopted limits. Zone A is new-machine condition, B acceptable for unrestricted long-term operation, C unsatisfactory long-term, D severe. Conversion 1 mm/s = 0.03937 in/s. The standard's guidance treats a significant CHANGE as actionable regardless of zone. ISO 20816, the machine manufacturer's limits, and the plant's condition monitoring programme govern.",
  example: vibrationSeverityZoneExample.inputs,
  fields: [
    { key: "reading", label: "Overall velocity reading (rms)", kind: "number", default: 0.135 },
    { key: "reading_is_mm_s", label: "Reading is in mm/s (1 for mm/s, 0 for in/s)", kind: "number", default: 0 },
    { key: "boundary_ab", label: "A/B boundary for this class (in/s)", kind: "number", default: 0.044 },
    { key: "boundary_bc", label: "B/C boundary for this class (in/s)", kind: "number", default: 0.110 },
    { key: "boundary_cd", label: "C/D boundary for this class (in/s)", kind: "number", default: 0.280 },
    { key: "previous_reading", label: "Previous reading, same units (0 to skip)", kind: "number", default: 0.062 },
    { key: "interval_months", label: "Months since that reading", kind: "number", default: 6 },
  ],
  outputs: [
    { key: "r", id: "vsz-out-r", label: "Reading", value: (r) => fmt(r.reading_in_s, 3) + " in/s rms, " + fmt(r.reading_mm_s, 2) + " mm/s" },
    { key: "z", id: "vsz-out-z", label: "Severity zone", value: (r) => r.zone_verdict },
    { key: "m", id: "vsz-out-m", label: "Margin", value: (r) => r.margin_verdict + ", on boundaries of " + fmt(r.boundary_ab, 3) + " / " + fmt(r.boundary_bc, 3) + " / " + fmt(r.boundary_cd, 3) + " in/s" },
    { key: "t", id: "vsz-out-t", label: "Trend", value: (r) => r.trend_verdict },
    { key: "d", id: "vsz-out-d", label: "What it does not say", value: () => "the zone is a screen, not a diagnosis -- it says something is wrong and nothing about what, and an overall velocity reading is insensitive to the high-frequency energy early bearing damage produces" },
    { key: "n", id: "vsz-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeVibrationSeverityZone,
});

// ============ spec-v1475: vibration forcing frequencies ============

// dims: in { rpm: dimensionless, blade_count: dimensionless, gear_tooth_count: dimensionless, belt_length_in: L, sheave_diameter_in: L, line_frequency_hz: dimensionless, rotor_bar_count: dimensionless } out: { one_x_hz: dimensionless, blade_pass_hz: dimensionless, gear_mesh_hz: dimensionless, belt_frequency_hz: dimensionless, twice_line_hz: dimensionless, rotor_bar_pass_hz: dimensionless }
export function computeVibrationForcingFrequencies({ rpm = 0, blade_count = 0, gear_tooth_count = 0, belt_length_in = 0, sheave_diameter_in = 0, line_frequency_hz = 60, rotor_bar_count = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rpm > 0)) return { error: "Shaft speed must be positive (rpm)." };
  if (blade_count < 0 || gear_tooth_count < 0 || rotor_bar_count < 0) return { error: "Blade, tooth, and rotor bar counts cannot be negative." };
  if (belt_length_in < 0 || sheave_diameter_in < 0) return { error: "Belt length and sheave diameter cannot be negative." };
  if (!(line_frequency_hz > 0)) return { error: "Line frequency must be positive (Hz)." };
  const one_x_hz = rpm / 60;
  const harmonics_hz = [1, 2, 3, 4].map((n) => n * one_x_hz);
  const blade_pass_hz = blade_count > 0 ? one_x_hz * blade_count : null;
  const gear_mesh_hz = gear_tooth_count > 0 ? one_x_hz * gear_tooth_count : null;
  // Gear mesh sidebands are spaced at shaft speed: their PRESENCE is the
  // finding, because a healthy mesh shows the line without them.
  const gear_sideband_low_hz = gear_mesh_hz === null ? null : gear_mesh_hz - one_x_hz;
  const gear_sideband_high_hz = gear_mesh_hz === null ? null : gear_mesh_hz + one_x_hz;
  const belt_frequency_hz = belt_length_in > 0 && sheave_diameter_in > 0
    ? one_x_hz * Math.PI * sheave_diameter_in / belt_length_in : null;
  const twice_line_hz = 2 * line_frequency_hz;
  const rotor_bar_pass_hz = rotor_bar_count > 0 ? one_x_hz * rotor_bar_count : null;
  // The trap: on a two-pole motor 2x running speed lands almost on top of
  // twice line frequency, and a spectrum alone cannot separate them.
  const two_x_hz = harmonics_hz[1];
  const two_x_to_line_gap_hz = Math.abs(two_x_hz - twice_line_hz);
  const outs = [one_x_hz, twice_line_hz, two_x_to_line_gap_hz];
  if (!outs.every(Number.isFinite)) return { error: "Forcing frequency math is not a finite value." };
  return {
    one_x_hz, one_x_cpm: rpm, harmonics_hz,
    two_x_hz, three_x_hz: harmonics_hz[2], four_x_hz: harmonics_hz[3],
    blade_pass_hz, blade_pass_order: blade_count > 0 ? blade_count : null,
    gear_mesh_hz, gear_sideband_low_hz, gear_sideband_high_hz,
    belt_frequency_hz, twice_line_hz, rotor_bar_pass_hz, two_x_to_line_gap_hz,
    line_trap: two_x_to_line_gap_hz < 5,
    line_trap_verdict: two_x_to_line_gap_hz < 5
      ? "2x running is " + fmt(two_x_hz, 2) + " Hz and twice line is " + fmt(twice_line_hz, 2) + " Hz, only " + fmt(two_x_to_line_gap_hz, 2) + " Hz apart -- a spectrum ALONE cannot separate them. Cut power and watch whether the peak vanishes instantly: that is the only reliable test"
      : "2x running (" + fmt(two_x_hz, 2) + " Hz) and twice line (" + fmt(twice_line_hz, 2) + " Hz) are " + fmt(two_x_to_line_gap_hz, 1) + " Hz apart, comfortably separable",
    note: "An overall vibration number says something is wrong; the spectrum says WHAT, but only if you know which line belongs to which part -- and those lines are simple multiples of shaft speed that a technician should not have to look up on a phone in a plant aisle. Every rotating part announces itself at a frequency tied to shaft speed: a pump impeller with seven vanes puts energy at seven times running speed, a gear with thirty-one teeth at thirty-one times, a rotor with N bars at N times. Identify the peak's frequency, divide by running speed, and the integer that comes out names the component. The classic confusions are worth naming, because they are what a technician actually gets wrong. UNBALANCE is 1x and dominantly radial. MISALIGNMENT is usually 2x with significant AXIAL energy, and it is that axial content rather than the frequency that separates it from unbalance in the field. LOOSENESS throws a picket fence of harmonics rather than one line. And a peak at twice line frequency is ELECTRICAL, not mechanical, no matter how much it looks like a shaft harmonic -- which becomes a genuine trap on a two-pole motor near 3,540 rpm, where 2x running speed is about 118 Hz and sits almost on top of the 120 Hz of a 60 Hz supply. There, a spectrum alone cannot separate them and the only reliable test is to cut power and watch whether the peak vanishes instantly, because an electrical line disappears with the field while a mechanical one coasts down. A 1,780 rpm pump with a 7-vane impeller runs at 29.67 Hz, puts blade pass at 207.67 Hz, and a peak there at high amplitude means a tight impeller-to-cutwater clearance or a starved suction rather than a bearing. Gear mesh sidebands spaced at shaft speed are reported because their PRESENCE is the finding: a healthy mesh shows the mesh line without them. This computes where to LOOK. It does not analyse a spectrum, identify a fault, or evaluate amplitude, and amplitude is what separates a normal forcing frequency from a problem -- every one of these lines is present on a healthy machine. It does not address resonance, which amplifies whatever excites it and can make a small forcing function dominate, or natural frequencies, critical speeds, and the phase measurements that distinguish several of these faults from one another. The machine and component manufacturers' data and a qualified vibration analyst govern any diagnosis.",
  };
}
const vibrationForcingFrequenciesExample = { inputs: { rpm: 1780, blade_count: 7, gear_tooth_count: 31, belt_length_in: 0, sheave_diameter_in: 0, line_frequency_hz: 60, rotor_bar_count: 0 } };
MILLWRIGHT_RENDERERS["vibration-forcing-frequencies"] = _simpleRenderer({
  citation: "Citation: the standard rotating-machinery forcing frequencies by name -- running speed 1x = rpm / 60 Hz, blade or vane pass = 1x x the blade count, gear mesh = 1x x the tooth count with sidebands spaced at 1x, belt frequency = 1x x pi x sheave diameter / belt length, twice line frequency for electrical faults, and rotor bar pass = 1x x the bar count. Where to look, not a diagnosis: amplitude, phase, axial content, and resonance decide what a peak means. The machine and component manufacturers' data and a qualified vibration analyst govern.",
  example: vibrationForcingFrequenciesExample.inputs,
  fields: [
    { key: "rpm", label: "Shaft speed (rpm)", kind: "number", default: 1780 },
    { key: "blade_count", label: "Impeller vanes or fan blades (0 if none)", kind: "number", default: 7 },
    { key: "gear_tooth_count", label: "Gear teeth on this shaft (0 if none)", kind: "number", default: 31 },
    { key: "belt_length_in", label: "Belt length (in, 0 if no belt)", kind: "number", default: 0 },
    { key: "sheave_diameter_in", label: "Sheave pitch diameter (in)", kind: "number", default: 0 },
    { key: "line_frequency_hz", label: "Line frequency (Hz)", kind: "number", default: 60 },
    { key: "rotor_bar_count", label: "Rotor bars (0 if not an induction motor)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "r", id: "vff-out-r", label: "Running speed", value: (r) => fmt(r.one_x_hz, 2) + " Hz (" + fmt(r.one_x_cpm, 0) + " CPM) -- 1x is unbalance and dominantly radial" },
    { key: "h", id: "vff-out-h", label: "Harmonics", value: (r) => "2x " + fmt(r.two_x_hz, 2) + " Hz, 3x " + fmt(r.three_x_hz, 2) + ", 4x " + fmt(r.four_x_hz, 2) + " -- 2x with strong AXIAL content is misalignment; a picket fence of them is looseness" },
    { key: "b", id: "vff-out-b", label: "Blade or vane pass", value: (r) => r.blade_pass_hz === null ? "(no blade count entered)" : fmt(r.blade_pass_hz, 2) + " Hz at " + fmt(r.blade_pass_order, 0) + "x -- high amplitude here is cutwater clearance or a starved suction, not a bearing" },
    { key: "g", id: "vff-out-g", label: "Gear mesh", value: (r) => r.gear_mesh_hz === null ? "(no tooth count entered)" : fmt(r.gear_mesh_hz, 2) + " Hz, sidebands at " + fmt(r.gear_sideband_low_hz, 2) + " and " + fmt(r.gear_sideband_high_hz, 2) + " Hz -- the sidebands are the finding, not the mesh line" },
    { key: "e", id: "vff-out-e", label: "Electrical", value: (r) => "twice line frequency is " + fmt(r.twice_line_hz, 2) + " Hz" + (r.rotor_bar_pass_hz === null ? "" : ", rotor bar pass " + fmt(r.rotor_bar_pass_hz, 1) + " Hz") + " -- " + r.line_trap_verdict },
    { key: "l", id: "vff-out-l", label: "Belt frequency", value: (r) => r.belt_frequency_hz === null ? "(no belt entered)" : fmt(r.belt_frequency_hz, 2) + " Hz, and belt faults show at its harmonics rather than at the fundamental" },
    { key: "n", id: "vff-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeVibrationForcingFrequencies,
});

// ============ spec-v1476: rolling-element bearing defect frequencies ============

// dims: in { rpm: dimensionless, ball_count: dimensionless, ball_diameter_in: L, pitch_diameter_in: L, contact_angle_deg: dimensionless } out: { shaft_hz: dimensionless, ftf_hz: dimensionless, bpfo_hz: dimensionless, bpfi_hz: dimensionless, bsf_hz: dimensionless }
export function computeBearingDefectFrequencies({ rpm = 0, ball_count = 0, ball_diameter_in = 0, pitch_diameter_in = 0, contact_angle_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rpm > 0)) return { error: "Shaft speed must be positive (rpm)." };
  if (!(ball_count >= 1)) return { error: "The rolling element count must be at least 1." };
  if (!(ball_diameter_in > 0)) return { error: "Ball or roller diameter must be positive (in)." };
  if (!(pitch_diameter_in > ball_diameter_in)) return { error: "The pitch diameter must exceed the ball diameter." };
  if (!(contact_angle_deg >= 0 && contact_angle_deg < 90)) return { error: "Contact angle must be at least 0 and under 90 degrees (0 for a deep-groove ball bearing)." };
  const shaft_hz = rpm / 60;
  const ratio = (ball_diameter_in / pitch_diameter_in) * Math.cos(contact_angle_deg / _DEG);
  const n = ball_count;
  // A rolling element passing a defect once per encounter. The INNER race is
  // struck at a higher rate because it moves toward the balls, which is why
  // BPFI is above BPFO and why the ratio identifies WHICH race failed.
  const ftf_hz = (shaft_hz / 2) * (1 - ratio);
  const bpfo_hz = (n / 2) * (1 - ratio) * shaft_hz;
  const bpfi_hz = (n / 2) * (1 + ratio) * shaft_hz;
  const bsf_hz = (pitch_diameter_in / (2 * ball_diameter_in)) * (1 - ratio * ratio) * shaft_hz;
  const outs = [shaft_hz, ftf_hz, bpfo_hz, bpfi_hz, bsf_hz];
  if (!outs.every(Number.isFinite)) return { error: "Bearing defect frequency math is not a finite value." };
  const ord = (f) => f / shaft_hz;
  // When the geometry is unknown: BPFO is roughly 0.4n and BPFI roughly 0.6n.
  const bpfo_approx_order = 0.4 * n;
  const bpfi_approx_order = 0.6 * n;
  return {
    shaft_hz, diameter_ratio: ratio,
    ftf_hz, bpfo_hz, bpfi_hz, bsf_hz,
    ftf_order: ord(ftf_hz), bpfo_order: ord(bpfo_hz), bpfi_order: ord(bpfi_hz), bsf_order: ord(bsf_hz),
    sideband_spacing_hz: shaft_hz, ball_count: n,
    bpfo_approx_order, bpfi_approx_order,
    bpfo_approx_error_pct: (bpfo_approx_order - ord(bpfo_hz)) / ord(bpfo_hz) * 100,
    bpfi_approx_error_pct: (bpfi_approx_order - ord(bpfi_hz)) / ord(bpfi_hz) * 100,
    cage_identity_hz: ftf_hz * n,
    note: "A spalled bearing rings at frequencies that are NOT integer multiples of shaft speed, which is exactly why they are hard to spot and exactly why they identify the damaged part precisely. The physical picture is a rolling element passing a defect once per encounter: a crack in the stationary outer race is struck by each ball as it rolls past, and a crack in the rotating inner race is struck at a HIGHER rate because the race is moving toward the balls. That is the whole reason the inner-race frequency sits above the outer-race one, and why the ratio of a measured peak to shaft speed says WHICH race has failed -- information no overall reading carries at all. Two field facts make these numbers more useful than they look. The non-integer ratio is diagnostic in itself: a peak at 3.56 times running speed cannot be anything mechanical except a bearing, because nothing else in the machine has a non-integer order -- blades, teeth, and rotor bars are all whole numbers. And inner-race defects produce SIDEBANDS spaced at running speed, because the defect moves in and out of the load zone once per revolution, so a set of evenly spaced peaks around a non-integer centre is close to a positive identification. A 6311 deep-groove ball bearing with 9 balls on a 1,780 rpm shaft gives an outer race at 105.68 Hz and 3.56x, an inner race at 161.32 Hz and 5.44x, a ball spin at 68.10 Hz, and a cage at 11.74 Hz. When the bearing number is unknown, the rough approximations of 0.4 times the ball count for the outer race and 0.6 for the inner get close enough to search a spectrum -- 3.6 against 3.56 and 5.4 against 5.44 here. The cage frequency times the ball count equals the outer race frequency exactly, which is a useful arithmetic check on an entered geometry. This computes frequencies from geometry the user supplies. It does not detect a defect, and the frequencies are present in the spectrum of a healthy bearing at low amplitude -- amplitude, trend, and the high-frequency envelope or demodulated spectrum are what find early damage, and a defect frequency at a normal level is not a finding. The formulas assume pure rolling with no slip, and real bearings slip: actual defect frequencies run one to two percent below the calculated values, so a peak that is close but not exact is still the bearing. Contact angle changes with axial load on an angular-contact bearing, which shifts every one of these. It does not evaluate lubrication, clearance, mounting, or the load zone, and it does not compute bearing life. The bearing manufacturer's published defect frequencies for the specific part number, and a qualified vibration analyst, govern.",
  };
}
const bearingDefectFrequenciesExample = { inputs: { rpm: 1780, ball_count: 9, ball_diameter_in: 0.5906, pitch_diameter_in: 2.8346, contact_angle_deg: 0 } };
MILLWRIGHT_RENDERERS["bearing-defect-frequencies"] = _simpleRenderer({
  citation: "Citation: the standard rolling-element bearing defect frequency relations by name -- cage FTF = (fr/2)(1 - (d/D) cos a), outer race BPFO = (n/2)(1 - (d/D) cos a) fr, inner race BPFI = (n/2)(1 + (d/D) cos a) fr, and ball spin BSF = (D/2d)(1 - ((d/D) cos a)^2) fr, for n rolling elements of diameter d on pitch diameter D at contact angle a. Pure rolling assumed; real bearings slip, so actual frequencies run one to two percent low. The bearing manufacturer's published defect frequencies for the specific part number, and a qualified vibration analyst, govern.",
  example: bearingDefectFrequenciesExample.inputs,
  fields: [
    { key: "rpm", label: "Shaft speed (rpm)", kind: "number", default: 1780 },
    { key: "ball_count", label: "Rolling elements", kind: "number", default: 9 },
    { key: "ball_diameter_in", label: "Ball or roller diameter (in)", kind: "number", default: 0.5906 },
    { key: "pitch_diameter_in", label: "Bearing pitch diameter (in)", kind: "number", default: 2.8346 },
    { key: "contact_angle_deg", label: "Contact angle (degrees, 0 for deep-groove)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "o", id: "bdf-out-o", label: "Outer race (BPFO)", value: (r) => fmt(r.bpfo_hz, 2) + " Hz at " + fmt(r.bpfo_order, 2) + "x -- a non-integer order nothing else in the machine can produce" },
    { key: "i", id: "bdf-out-i", label: "Inner race (BPFI)", value: (r) => fmt(r.bpfi_hz, 2) + " Hz at " + fmt(r.bpfi_order, 2) + "x, with SIDEBANDS every " + fmt(r.sideband_spacing_hz, 2) + " Hz -- the sideband spacing equal to shaft speed is the confirmation" },
    { key: "b", id: "bdf-out-b", label: "Ball spin (BSF)", value: (r) => fmt(r.bsf_hz, 2) + " Hz at " + fmt(r.bsf_order, 2) + "x" },
    { key: "c", id: "bdf-out-c", label: "Cage (FTF)", value: (r) => fmt(r.ftf_hz, 2) + " Hz at " + fmt(r.ftf_order, 3) + "x -- and cage times the " + fmt(r.ball_count, 0) + " elements is " + fmt(r.cage_identity_hz, 2) + " Hz, which is the outer race exactly" },
    { key: "a", id: "bdf-out-a", label: "If you do not know the bearing", value: (r) => "0.4n = " + fmt(r.bpfo_approx_order, 2) + "x outer and 0.6n = " + fmt(r.bpfi_approx_order, 2) + "x inner, against the exact " + fmt(r.bpfo_order, 2) + "x and " + fmt(r.bpfi_order, 2) + "x -- close enough to search a spectrum" },
    { key: "s", id: "bdf-out-s", label: "Expect them low", value: () => "real bearings slip, so measured defect frequencies run one to two percent BELOW these -- a peak that is close but not exact is still the bearing" },
    { key: "n", id: "bdf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBearingDefectFrequencies,
});

// ============ spec-v1477: single-plane field balance ============

// dims: in { original_amplitude: L, original_phase_deg: dimensionless, trial_weight_g: M, trial_weight_angle_deg: dimensionless, trial_amplitude: L, trial_phase_deg: dimensionless } out: { effect_magnitude: L, effect_angle_deg: dimensionless, correction_weight_g: M, correction_angle_deg: dimensionless, influence_coefficient: dimensionless }
export function computeSinglePlaneFieldBalance({ original_amplitude = 0, original_phase_deg = 0, trial_weight_g = 0, trial_weight_angle_deg = 0, trial_amplitude = 0, trial_phase_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(original_amplitude > 0)) return { error: "The original amplitude must be positive." };
  if (!(trial_amplitude > 0)) return { error: "The amplitude with the trial weight installed must be positive." };
  if (!(trial_weight_g > 0)) return { error: "The trial weight must be positive (g)." };
  const ox = original_amplitude * Math.cos(original_phase_deg / _DEG);
  const oy = original_amplitude * Math.sin(original_phase_deg / _DEG);
  const tx = trial_amplitude * Math.cos(trial_phase_deg / _DEG);
  const ty = trial_amplitude * Math.sin(trial_phase_deg / _DEG);
  // The trial weight is a PROBE, not a guess at the correction: E is how the
  // rotor responds to a known weight at a known place.
  const ex = tx - ox;
  const ey = ty - oy;
  const effect_magnitude = Math.sqrt(ex * ex + ey * ey);
  if (!(effect_magnitude > 0)) return { error: "The trial weight changed nothing measurable: the effect vector is zero, so no correction can be computed. Use a larger trial weight." };
  let effect_angle_deg = Math.atan2(ey, ex) * _DEG;
  if (effect_angle_deg < 0) effect_angle_deg += 360;
  // Scale by the ratio of the original vibration to the response, and rotate
  // so the effect points opposite the original.
  const correction_weight_g = trial_weight_g * original_amplitude / effect_magnitude;
  let opposite_original_deg = (original_phase_deg + 180) % 360;
  if (opposite_original_deg < 0) opposite_original_deg += 360;
  let rotation_deg = opposite_original_deg - effect_angle_deg;
  while (rotation_deg > 180) rotation_deg -= 360;
  while (rotation_deg < -180) rotation_deg += 360;
  let correction_angle_deg = (trial_weight_angle_deg + rotation_deg) % 360;
  if (correction_angle_deg < 0) correction_angle_deg += 360;
  const influence_coefficient = effect_magnitude / trial_weight_g;
  const amplitude_change_pct = (trial_amplitude - original_amplitude) / original_amplitude * 100;
  let phase_swing_deg = trial_phase_deg - original_phase_deg;
  while (phase_swing_deg > 180) phase_swing_deg -= 360;
  while (phase_swing_deg < -180) phase_swing_deg += 360;
  const outs = [effect_magnitude, effect_angle_deg, correction_weight_g, correction_angle_deg, influence_coefficient];
  if (!outs.every(Number.isFinite)) return { error: "Field balance math is not a finite value." };
  // A trial that barely moved the needle makes E small and the ratio large.
  const strong_response = Math.abs(amplitude_change_pct) >= 30 || Math.abs(phase_swing_deg) >= 30;
  return {
    effect_magnitude, effect_angle_deg, correction_weight_g, correction_angle_deg,
    rotation_deg, influence_coefficient, amplitude_change_pct, phase_swing_deg,
    trial_weight_g, trial_weight_angle_deg, strong_response,
    weight_ratio: correction_weight_g / trial_weight_g,
    response_verdict: strong_response
      ? "the trial changed the reading by " + fmt(Math.abs(amplitude_change_pct), 0) + "% in amplitude and " + fmt(Math.abs(phase_swing_deg), 0) + " degrees of phase, which is the strong response that makes the arithmetic trustworthy"
      : "the trial barely moved the needle (" + fmt(Math.abs(amplitude_change_pct), 0) + "% amplitude, " + fmt(Math.abs(phase_swing_deg), 0) + " degrees phase), so the effect vector is small, the ratio large, and THIS ANSWER IS UNRELIABLE -- use a bigger trial weight",
    note: "Field balancing a fan or a rotor without a balancing machine is a vector problem: one baseline reading, one trial-weight reading, and the difference says how much weight to add and where. THE TRIAL WEIGHT IS NOT A GUESS AT THE CORRECTION, it is a probe -- it tells you how the rotor responds to a known weight at a known place. The effect vector is that response, obtained by subtracting the original reading from the trial reading as VECTORS rather than as magnitudes, and once you have it the correction is pure proportion: scale the trial weight by the ratio of the original vibration to the response, and rotate it so its effect points opposite the original. A fan reading 6.2 mils at 45 degrees, with a 10 g trial weight at 0 degrees taking it to 3.8 mils at 160 degrees, gives an effect of 8.53 at 201 degrees, a 7.27 g correction, and a 24 degree move from where the trial weight sat. Two rules keep it out of trouble. Size the trial weight to change the reading NOTICEABLY -- roughly 30% in amplitude or 30 degrees in phase; too small and the effect vector is buried in measurement noise and the answer is worthless, too large and the machine may be unsafe to run. And THE TRIAL WEIGHT COMES OFF when the correction goes on, unless the correction is deliberately computed as an adjustment to it: leaving both on is the most common way a first balance attempt makes things worse. The influence coefficient is reported because it is reusable -- on the same machine at the same speed it turns every future balance into a single reading with no trial run at all. This is the single-plane vector solve on readings the user takes. It assumes the rotor responds linearly to added weight, which holds for a rigid rotor below its first critical speed and fails near a resonance, where amplitude and phase move sharply with small speed changes and a balance done there will not hold. It does not handle two-plane or couple unbalance, which a long rotor needs and which single-plane balancing can make worse; it does not verify that the problem IS unbalance -- misalignment, looseness, a bent shaft, and a cracked rotor all show at 1x and none of them is cured by weight; and it does not address weight attachment, the safe placement radius, or whether the machine may be run in its present condition. The machine manufacturer's balancing instructions, the applicable balance quality grade, and a qualified balancing technician govern.",
  };
}
const singlePlaneFieldBalanceExample = { inputs: { original_amplitude: 6.2, original_phase_deg: 45, trial_weight_g: 10, trial_weight_angle_deg: 0, trial_amplitude: 3.8, trial_phase_deg: 160 } };
MILLWRIGHT_RENDERERS["single-plane-field-balance"] = _simpleRenderer({
  citation: "Citation: the single-plane trial-weight (influence coefficient) balance method by name -- the effect vector E = T - O by vector subtraction, the correction weight = trial weight x |O| / |E|, and the correction placed by rotating the trial weight through the angle from E to the direction opposite O. Linear response assumed, which holds for a rigid rotor below its first critical and fails near a resonance. The machine manufacturer's balancing instructions, the applicable balance quality grade, and a qualified balancing technician govern.",
  example: singlePlaneFieldBalanceExample.inputs,
  fields: [
    { key: "original_amplitude", label: "Original amplitude (mils or in/s)", kind: "number", default: 6.2 },
    { key: "original_phase_deg", label: "Original phase (degrees)", kind: "number", default: 45 },
    { key: "trial_weight_g", label: "Trial weight (g)", kind: "number", default: 10 },
    { key: "trial_weight_angle_deg", label: "Trial weight angular position (degrees)", kind: "number", default: 0 },
    { key: "trial_amplitude", label: "Amplitude with the trial weight (same units)", kind: "number", default: 3.8 },
    { key: "trial_phase_deg", label: "Phase with the trial weight (degrees)", kind: "number", default: 160 },
  ],
  outputs: [
    { key: "e", id: "spb-out-e", label: "Effect vector", value: (r) => fmt(r.effect_magnitude, 2) + " at " + fmt(r.effect_angle_deg, 1) + " degrees -- how the rotor answered a known weight at a known place" },
    { key: "w", id: "spb-out-w", label: "Correction weight", value: (r) => fmt(r.correction_weight_g, 2) + " g, which is " + fmt(r.weight_ratio, 2) + " times the trial weight" },
    { key: "a", id: "spb-out-a", label: "Where to put it", value: (r) => fmt(r.correction_angle_deg, 1) + " degrees -- the trial weight moved " + fmt(r.rotation_deg, 1) + " degrees from where it sat" },
    { key: "t", id: "spb-out-t", label: "Take the trial weight OFF", value: (r) => "the " + fmt(r.trial_weight_g, 1) + " g trial comes off when the correction goes on -- leaving both is the commonest way a first attempt makes things worse" },
    { key: "r", id: "spb-out-r", label: "Was the trial big enough", value: (r) => r.response_verdict },
    { key: "i", id: "spb-out-i", label: "Influence coefficient", value: (r) => fmt(r.influence_coefficient, 4) + " per gram -- keep it, and the next balance on this machine at this speed needs no trial run at all" },
    { key: "n", id: "spb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSinglePlaneFieldBalance,
});
