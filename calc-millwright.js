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

// dims: in { rpm: T^-1, measured_offset_in: L, measured_angularity_mils_per_in: dimensionless, offset_excellent_in: L, offset_acceptable_in: L, angularity_excellent_mils_per_in: dimensionless, angularity_acceptable_mils_per_in: dimensionless, spacer_length_in: L, spacer_end_offset_in: L } out: { offset_pct_of_acceptable: dimensionless, angularity_pct_of_acceptable: dimensionless, offset_over_by_in: L, spacer_slope_mils_per_in: dimensionless }
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

// dims: in { rpm: T^-1, blade_count: dimensionless, gear_tooth_count: dimensionless, belt_length_in: L, sheave_diameter_in: L, line_frequency_hz: T^-1, rotor_bar_count: dimensionless } out: { one_x_hz: T^-1, blade_pass_hz: T^-1, gear_mesh_hz: T^-1, belt_frequency_hz: T^-1, twice_line_hz: T^-1, rotor_bar_pass_hz: T^-1 }
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

// dims: in { rpm: T^-1, ball_count: dimensionless, ball_diameter_in: L, pitch_diameter_in: L, contact_angle_deg: dimensionless } out: { shaft_hz: T^-1, ftf_hz: T^-1, bpfo_hz: T^-1, bpfi_hz: T^-1, bsf_hz: T^-1 }
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

// ============ spec-v1478: roller chain wear elongation ============

// dims: in { chain_pitch_in: L, pitches_measured: dimensionless, measured_length_in: L, elongation_limit_pct: dimensionless, sprocket_teeth: dimensionless } out: { nominal_length_in: L, elongation_pct: dimensionless, elongation_in: L, allowable_length_in: L, remaining_allowance_in: L }
export function computeRollerChainWearElongation({ chain_pitch_in = 0, pitches_measured = 0, measured_length_in = 0, elongation_limit_pct = 1.5, sprocket_teeth = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(chain_pitch_in > 0)) return { error: "Chain pitch must be positive (in)." };
  if (!(pitches_measured >= 1)) return { error: "Measure across at least one pitch -- and twelve or more is what makes the reading resolvable." };
  if (!(measured_length_in > 0)) return { error: "The measured length must be positive (in)." };
  if (!(elongation_limit_pct > 0)) return { error: "The elongation limit must be positive (percent)." };
  if (sprocket_teeth < 0) return { error: "Sprocket tooth count cannot be negative." };
  const nominal_length_in = chain_pitch_in * pitches_measured;
  if (!(measured_length_in >= nominal_length_in * 0.9)) return { error: "The measured length is far below nominal: check the pitch, the pitch count, and that the measurement runs pin centre to pin centre." };
  const elongation_in = measured_length_in - nominal_length_in;
  const elongation_pct = elongation_in / nominal_length_in * 100;
  const allowable_length_in = nominal_length_in * (1 + elongation_limit_pct / 100);
  const remaining_allowance_in = allowable_length_in - measured_length_in;
  // Measuring one pitch instead of twelve is why the span matters: the wear
  // per joint is below what a tape in a plant can resolve.
  const per_pitch_wear_in = elongation_in / pitches_measured;
  const outs = [nominal_length_in, elongation_pct, elongation_in, allowable_length_in, remaining_allowance_in];
  if (!outs.every(Number.isFinite)) return { error: "Chain elongation math is not a finite value." };
  const replace = elongation_pct > elongation_limit_pct;
  return {
    nominal_length_in, measured_length_in, elongation_in, elongation_pct,
    allowable_length_in, remaining_allowance_in, per_pitch_wear_in,
    elongation_limit_pct, sprocket_teeth, pitches_measured, chain_pitch_in, replace,
    verdict: replace
      ? "REPLACE: " + fmt(elongation_pct, 2) + "% against a " + fmt(elongation_limit_pct, 2) + "% limit, " + fmt(-remaining_allowance_in, 3) + " in past the allowable length -- and inspect the sprockets, because a chain this far gone has probably hooked the teeth"
      : "keep: " + fmt(elongation_pct, 2) + "% against a " + fmt(elongation_limit_pct, 2) + "% limit, with " + fmt(remaining_allowance_in, 3) + " in of allowance left",
    span_verdict: "measuring ONE pitch would read " + fmt(per_pitch_wear_in * 1000, 1) + " thousandths of wear, which no tape in a plant resolves -- the " + fmt(pitches_measured, 0) + " pitch span is what makes it readable",
    note: "Roller chain does not stretch, it WEARS: the pin and bushing clearances grow and the chain gets longer, so the replacement decision is a tape measure over a known number of pitches and one percentage. Measure across the run with the chain pulled taut, pin centre to pin centre, and compare against pitch times the count. MEASURING OVER TWELVE OR MORE PITCHES RATHER THAN ONE IS THE WHOLE ACCURACY TRICK -- the wear per joint is tiny and only accumulates into something a tape can read over a span. A #50 chain at 0.625 in pitch reading 7.66 in over twelve pitches is 2.13% elongated; the same chain measured over ONE pitch would show 13.3 thousandths of difference, which nothing in a plant will resolve reliably. The 1.5% figure is not arbitrary. A chain riding a sprocket is a polygon, and as the pitch grows the chain contacts fewer teeth and rides higher up the flanks; past roughly 1.5% on a normal tooth count it begins to jump, and the sprocket teeth wear into a hooked profile. Once that happens the sprocket is scrap too, and a new chain on a hooked sprocket wears out in a fraction of its life -- which is why chain and sprockets are replaced as a SET and why a replace verdict here is also an instruction to inspect the teeth. The threshold rises for sprockets with many teeth, where the chain has more engagement to lose before it climbs, and 3.0% is accepted on large, slow, low-tooth-count drives; the limit is entered rather than fixed for that reason. This is one measurement against one limit. It does not inspect the sprockets, which is the other half of the decision and which no length reading reveals; it does not evaluate lubrication, which is what actually determines the wear rate and whose failure is the usual root cause; and it does not address elongation from a single overload event, chain fatigue, or plate cracking, none of which shows as elongation and any of which can fail a chain that measures fine. It does not size a chain or select a replacement. The chain and sprocket manufacturers' data and the drive designer govern.",
  };
}
const rollerChainWearElongationExample = { inputs: { chain_pitch_in: 0.625, pitches_measured: 12, measured_length_in: 7.66, elongation_limit_pct: 1.5, sprocket_teeth: 19 } };
MILLWRIGHT_RENDERERS["roller-chain-wear-elongation"] = _simpleRenderer({
  citation: "Citation: the roller chain wear-elongation check by name -- nominal length = pitch x the number of pitches measured, elongation = (measured - nominal) / nominal, and the allowable length = nominal x (1 + the limit). The 1.5% replacement figure for a normal hardened-tooth sprocket and the 3.0% accepted on large, slow, low-tooth-count drives are standard practice and are ENTERED, not fixed. Chain and sprockets are replaced as a set. The chain and sprocket manufacturers' data and the drive designer govern.",
  example: rollerChainWearElongationExample.inputs,
  fields: [
    { key: "chain_pitch_in", label: "Chain pitch (in)", kind: "number", default: 0.625 },
    { key: "pitches_measured", label: "Pitches measured across", kind: "number", default: 12 },
    { key: "measured_length_in", label: "Measured length pin centre to pin centre (in)", kind: "number", default: 7.66 },
    { key: "elongation_limit_pct", label: "Elongation limit (percent)", kind: "number", default: 1.5 },
    { key: "sprocket_teeth", label: "Sprocket teeth (0 to skip)", kind: "number", default: 19 },
  ],
  outputs: [
    { key: "n", id: "rcw-out-n", label: "Nominal length", value: (r) => fmt(r.nominal_length_in, 4) + " in across " + fmt(r.pitches_measured, 0) + " pitches" },
    { key: "e", id: "rcw-out-e", label: "Elongation", value: (r) => fmt(r.elongation_pct, 2) + "%, which is " + fmt(r.elongation_in, 3) + " in over the span" },
    { key: "a", id: "rcw-out-a", label: "Allowable length", value: (r) => fmt(r.allowable_length_in, 4) + " in at the " + fmt(r.elongation_limit_pct, 2) + "% limit" },
    { key: "v", id: "rcw-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "s", id: "rcw-out-s", label: "Why the span matters", value: (r) => r.span_verdict },
    { key: "z", id: "rcw-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeRollerChainWearElongation,
});

// ============ spec-v1479: gear reducer service factor ============

// dims: in { transmitted_hp: M L^2 T^-3, service_factor: dimensionless, catalog_mechanical_hp: M L^2 T^-3, catalog_thermal_hp: M L^2 T^-3, nameplate_selection_hp: M L^2 T^-3 } out: { required_hp: M L^2 T^-3, mechanical_margin: dimensionless, governing_rating_hp: M L^2 T^-3, shortfall_hp: M L^2 T^-3, max_transmitted_hp: M L^2 T^-3 }
export function computeGearReducerServiceFactor({ transmitted_hp = 0, service_factor = 1, catalog_mechanical_hp = 0, catalog_thermal_hp = 0, nameplate_selection_hp = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(transmitted_hp > 0)) return { error: "Transmitted power must be positive (hp)." };
  if (!(service_factor >= 1)) return { error: "The service factor must be at least 1.0 -- it converts an average transmitted power into the peak the teeth and bearings actually see." };
  if (!(catalog_mechanical_hp > 0)) return { error: "The catalog mechanical rating must be positive (hp)." };
  if (catalog_thermal_hp < 0) return { error: "The catalog thermal rating cannot be negative (hp)." };
  if (nameplate_selection_hp < 0) return { error: "The nameplate-only selection cannot be negative (hp)." };
  const required_hp = transmitted_hp * service_factor;
  const mechanical_margin = catalog_mechanical_hp / required_hp;
  const mechanical_passes = catalog_mechanical_hp >= required_hp;
  // A gearbox has TWO independent ratings, and on a continuously running unit
  // the thermal one is frequently the lower.
  const has_thermal = catalog_thermal_hp > 0;
  const governing_rating_hp = has_thermal ? Math.min(catalog_mechanical_hp, catalog_thermal_hp) : catalog_mechanical_hp;
  const thermal_governs = has_thermal && catalog_thermal_hp < catalog_mechanical_hp;
  const governing_margin = governing_rating_hp / required_hp;
  const passes = governing_rating_hp >= required_hp;
  const shortfall_hp = passes ? 0 : required_hp - governing_rating_hp;
  const max_transmitted_hp = governing_rating_hp / service_factor;
  const nameplate_shortfall_pct = nameplate_selection_hp > 0
    ? (required_hp - nameplate_selection_hp) / required_hp * 100 : null;
  const outs = [required_hp, mechanical_margin, governing_rating_hp, max_transmitted_hp];
  if (!outs.every(Number.isFinite)) return { error: "Service factor math is not a finite value." };
  return {
    required_hp, service_factor, transmitted_hp,
    mechanical_margin, mechanical_passes, governing_rating_hp, governing_margin,
    thermal_governs, has_thermal, passes, shortfall_hp, max_transmitted_hp,
    catalog_mechanical_hp, catalog_thermal_hp, nameplate_shortfall_pct,
    verdict: passes
      ? "PASSES with a margin of " + fmt(governing_margin, 2) + " on the governing " + (thermal_governs ? "THERMAL" : "mechanical") + " rating"
      : "FAILS by " + fmt(shortfall_hp, 1) + " hp on the governing " + (thermal_governs ? "THERMAL" : "mechanical") + " rating",
    thermal_verdict: !has_thermal
      ? "(no thermal rating entered -- and on a continuously running unit it is frequently the LOWER of the two, so it is worth finding)"
      : thermal_governs
        ? "the THERMAL rating of " + fmt(catalog_thermal_hp, 1) + " hp governs, below the " + fmt(catalog_mechanical_hp, 1) + " hp mechanical -- the fix is a cooling fan, an oil cooler, or a larger case, NOT a bigger gearset"
        : "the mechanical rating governs; the " + fmt(catalog_thermal_hp, 1) + " hp thermal rating has room",
    nameplate_verdict: nameplate_shortfall_pct === null
      ? "(no nameplate-only selection entered)"
      : nameplate_shortfall_pct > 0
        ? "selecting on the motor nameplate would have bought " + fmt(nameplate_selection_hp, 1) + " hp, which is " + fmt(nameplate_shortfall_pct, 0) + "% under the " + fmt(required_hp, 1) + " hp actually required"
        : "the nameplate-only selection happens to cover the requirement here, which the service factor is what proves",
    note: "A 25 hp motor does not need a 25 hp gearbox. It needs a gearbox whose catalog rating covers the transmitted power multiplied by a service factor, and choosing on motor nameplate alone is the standard way a reducer fails in eighteen months. The service factor is an empirical multiplier that converts an average transmitted power into the PEAK the gear teeth and bearings actually see, and it has three inputs: the character of the prime mover, since an electric motor is smooth and a single-cylinder engine is not; the shock character of the driven machine, since a centrifugal pump is uniform and a jaw crusher is heavy shock; and the duty hours, because a reducer running continuously has no time to shed heat or recover. Factors near 1.0 apply to a uniform load on short duty and climb past 2.0 for heavy shock around the clock. A 25 hp motor driving a reciprocating compressor 24 hours a day at a service factor of 2.00 needs a 50 hp catalog rating, and a 60 hp box passes with a margin of 1.20. THE TRAP IS THE THERMAL RATING. A gearbox has two INDEPENDENT ratings -- mechanical, set by the teeth and bearings, and thermal, set by how much heat the case can shed at ambient -- and on continuously running units the thermal rating is frequently the lower of the two. That same 60 hp box carrying a 42 hp thermal rating at 104 degF ambient is 8 hp short, and the fix is a cooling fan, an oil cooler, or a larger case rather than a bigger gearset, because the gears were never the problem. No service factor catches that: it is a separate check against a separate number, which is why both are entered here and the lower governs. The service factor itself is ENTERED and not derived, because published tables differ between manufacturers and between standards, and the classification of a driven machine is a judgment the manufacturer's table makes rather than a formula. This does not select a reducer, compute a ratio, or evaluate the gearing, bearings, seals, or shaft loads -- an overhung load from a chain or belt drive is a common cause of reducer failure that no power rating addresses. It does not check the thermal rating against a specific ambient, which needs the manufacturer's own derating curve, and it does not address lubrication, which is what determines whether either rating is achieved. The gear reducer manufacturer's catalog ratings, service factor tables, and thermal derating data govern.",
  };
}
const gearReducerServiceFactorExample = { inputs: { transmitted_hp: 25, service_factor: 2.0, catalog_mechanical_hp: 60, catalog_thermal_hp: 42, nameplate_selection_hp: 30 } };
MILLWRIGHT_RENDERERS["gear-reducer-service-factor"] = _simpleRenderer({
  citation: "Citation: the gear reducer service-factor selection by name -- required rating = transmitted power x the service factor for the driver character, driven-machine shock class, and duty hours -- with the catalog MECHANICAL and THERMAL ratings compared separately and the LOWER governing. The service factor is entered because published tables differ between manufacturers and standards. The gear reducer manufacturer's catalog ratings, service factor tables, and thermal derating data govern.",
  example: gearReducerServiceFactorExample.inputs,
  fields: [
    { key: "transmitted_hp", label: "Transmitted power (hp)", kind: "number", default: 25 },
    { key: "service_factor", label: "Service factor from the manufacturer's table", kind: "number", default: 2.0 },
    { key: "catalog_mechanical_hp", label: "Catalog mechanical rating (hp)", kind: "number", default: 60 },
    { key: "catalog_thermal_hp", label: "Catalog thermal rating at ambient (hp, 0 to skip)", kind: "number", default: 42 },
    { key: "nameplate_selection_hp", label: "What a nameplate-only choice would buy (hp, 0 to skip)", kind: "number", default: 30 },
  ],
  outputs: [
    { key: "r", id: "grs-out-r", label: "Required catalog rating", value: (r) => fmt(r.required_hp, 1) + " hp -- " + fmt(r.transmitted_hp, 1) + " hp transmitted times a service factor of " + fmt(r.service_factor, 2) },
    { key: "m", id: "grs-out-m", label: "Against the mechanical rating", value: (r) => fmt(r.catalog_mechanical_hp, 1) + " hp, a margin of " + fmt(r.mechanical_margin, 2) + " -- " + (r.mechanical_passes ? "passes" : "FAILS") },
    { key: "t", id: "grs-out-t", label: "The thermal trap", value: (r) => r.thermal_verdict },
    { key: "v", id: "grs-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "x", id: "grs-out-x", label: "Most this unit will carry", value: (r) => fmt(r.max_transmitted_hp, 1) + " hp of transmitted power at this service factor" },
    { key: "p", id: "grs-out-p", label: "Choosing on the nameplate", value: (r) => r.nameplate_verdict },
    { key: "n", id: "grs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGearReducerServiceFactor,
});

// ============ spec-v1480: air compressor CFM and duty sizing ============

// dims: in { tool1_qty: dimensionless, tool1_cfm: L^3 / T, tool1_duty: dimensionless, tool2_qty: dimensionless, tool2_cfm: L^3 / T, tool2_duty: dimensionless, tool3_qty: dimensionless, tool3_cfm: L^3 / T, tool3_duty: dimensionless, tool4_qty: dimensionless, tool4_cfm: L^3 / T, tool4_duty: dimensionless, leak_allowance_pct: dimensionless, growth_allowance_pct: dimensionless, cfm_per_hp: M^-1 L T^2 } out: { connected_cfm: L^3 / T, average_cfm: L^3 / T, with_leaks_cfm: L^3 / T, design_cfm: L^3 / T, motor_hp: M L^2 T^-3 }
export function computeAirCompressorCfmSizing({ tool1_qty = 0, tool1_cfm = 0, tool1_duty = 0, tool2_qty = 0, tool2_cfm = 0, tool2_duty = 0, tool3_qty = 0, tool3_cfm = 0, tool3_duty = 0, tool4_qty = 0, tool4_cfm = 0, tool4_duty = 0, leak_allowance_pct = 15, growth_allowance_pct = 20, cfm_per_hp = 4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const tools = [[tool1_qty, tool1_cfm, tool1_duty], [tool2_qty, tool2_cfm, tool2_duty], [tool3_qty, tool3_cfm, tool3_duty], [tool4_qty, tool4_cfm, tool4_duty]];
  if (tools.some(([q, c, d]) => q < 0 || c < 0 || d < 0)) return { error: "Tool quantity, CFM, and duty cycle cannot be negative." };
  if (tools.some(([, , d]) => d > 1)) return { error: "Duty cycle is a fraction between 0 and 1 -- a blow gun is about 0.10, an assembly-line impact wrench about 0.50." };
  const active = tools.filter(([q, c]) => q > 0 && c > 0);
  if (active.length === 0) return { error: "Enter at least one tool with a quantity and a rated CFM." };
  if (leak_allowance_pct < 0 || growth_allowance_pct < 0) return { error: "Leak and growth allowances cannot be negative (percent)." };
  if (!(cfm_per_hp > 0)) return { error: "The CFM per horsepower figure must be positive (about 4 for a two-stage unit at 100 psig)." };
  // A tool's rated CFM is its consumption while the trigger is DOWN, and
  // almost nothing runs at 100% duty. The same duty-weighted sum the air
  // receiver calculator uses, so the two cannot disagree about demand.
  const connected_cfm = active.reduce((a, [q, c]) => a + q * c, 0);
  const average_cfm = active.reduce((a, [q, c, d]) => a + q * c * d, 0);
  const with_leaks_cfm = average_cfm * (1 + leak_allowance_pct / 100);
  const design_cfm = with_leaks_cfm * (1 + growth_allowance_pct / 100);
  const motor_hp = design_cfm / cfm_per_hp;
  const peak_to_average = average_cfm > 0 ? connected_cfm / average_cfm : 0;
  const connected_hp = connected_cfm / cfm_per_hp;
  const largest_tool_cfm = active.reduce((a, [, c]) => (c > a ? c : a), active[0][1]);
  const largest_tool_hp = largest_tool_cfm / cfm_per_hp;
  const oversize_ratio = design_cfm > 0 ? connected_cfm / design_cfm : 0;
  const outs = [connected_cfm, average_cfm, with_leaks_cfm, design_cfm, motor_hp, peak_to_average];
  if (!outs.every(Number.isFinite)) return { error: "Compressor sizing math is not a finite value." };
  return {
    connected_cfm, average_cfm, with_leaks_cfm, design_cfm, motor_hp,
    peak_to_average, connected_hp, largest_tool_cfm, largest_tool_hp,
    oversize_ratio, leak_allowance_pct, growth_allowance_pct, cfm_per_hp, tool_count: active.length,
    leak_cfm: with_leaks_cfm - average_cfm, growth_cfm: design_cfm - with_leaks_cfm,
    oversize_verdict: "sizing to the connected load buys " + fmt(connected_hp, 1) + " hp, " + fmt(oversize_ratio, 2) + " times what the shop needs -- and an oversized compressor short-cycles and wears itself out",
    undersize_verdict: "sizing to the single largest tool buys " + fmt(largest_tool_hp, 1) + " hp, which starves the moment two things run at once",
    note: "Compressor sizing from the sum of tool nameplate ratings buys a machine two or three times too big, and sizing from the largest tool buys one that cannot keep up. A tool's rated CFM is its consumption WHILE THE TRIGGER IS DOWN, and almost nothing runs at 100% duty: an impact wrench on an assembly line might see 50%, a blow gun sees 10%. Weighting each tool by its realistic duty and summing is what produces a compressor that neither short-cycles nor starves, and the receiver is what absorbs the difference between average demand and instantaneous peaks. A shop with two impact wrenches at 5 cfm and 50% duty, a sander at 12 cfm and 70%, and a blow gun at 3 cfm and 10% averages 13.70 cfm -- against a connected load of 25 cfm, which would buy 6.3 hp for a shop that needs about 4.7. THE LEAK ALLOWANCE IS THE HONEST PART. A typical industrial system leaks 10 to 20% of its output and a neglected one leaks 30% or more, so a compressor sized with no leak budget is undersized on the day it is installed. It is carried explicitly here rather than buried, because a leak allowance you can see is a leak allowance you might fix -- and fixing it is far cheaper than the horsepower it buys. The duty-weighted demand relation is the same one the air receiver calculator uses, so the two cannot disagree about what a set of tools actually draws. This sizes on tool demand the user supplies, and every input is an estimate: duty cycles in particular are guesses until somebody logs them, and a metered week beats any table. It does not correct rated CFM to the actual working pressure, which matters because a tool rated at 90 psig draws more at 100; it does not correct for altitude, which reduces the mass a compressor delivers at the same volumetric rating; and it does not address the distribution piping, whose pressure drop can starve a tool the compressor is perfectly capable of feeding. It does not size the receiver, the dryer, or the aftercooler, select between reciprocating, rotary screw and centrifugal, or evaluate duty rating -- a machine that can make the CFM but is not rated for continuous duty will not last. The compressor and tool manufacturers' data govern.",
  };
}
const airCompressorCfmSizingExample = { inputs: { tool1_qty: 2, tool1_cfm: 5, tool1_duty: 0.5, tool2_qty: 1, tool2_cfm: 12, tool2_duty: 0.7, tool3_qty: 1, tool3_cfm: 3, tool3_duty: 0.1, tool4_qty: 0, tool4_cfm: 0, tool4_duty: 0, leak_allowance_pct: 15, growth_allowance_pct: 20, cfm_per_hp: 4 } };
MILLWRIGHT_RENDERERS["air-compressor-cfm-sizing"] = _simpleRenderer({
  citation: "Citation: the duty-weighted compressed-air demand build-up by name -- average demand = the sum over tools of quantity x rated CFM x duty cycle (the same relation the air receiver calculator uses), then multiplied by a leak allowance and a future-growth allowance, with motor power approximated at about 4 CFM per horsepower for a two-stage unit at 100 psig. Rated CFM is consumption with the trigger down. The compressor and tool manufacturers' data govern.",
  example: airCompressorCfmSizingExample.inputs,
  fields: [
    { key: "tool1_qty", label: "Tool 1 quantity", kind: "number", default: 2 },
    { key: "tool1_cfm", label: "Tool 1 rated CFM at working pressure", kind: "number", default: 5 },
    { key: "tool1_duty", label: "Tool 1 duty cycle (0-1)", kind: "number", default: 0.5 },
    { key: "tool2_qty", label: "Tool 2 quantity (0 if unused)", kind: "number", default: 1 },
    { key: "tool2_cfm", label: "Tool 2 rated CFM", kind: "number", default: 12 },
    { key: "tool2_duty", label: "Tool 2 duty cycle (0-1)", kind: "number", default: 0.7 },
    { key: "tool3_qty", label: "Tool 3 quantity (0 if unused)", kind: "number", default: 1 },
    { key: "tool3_cfm", label: "Tool 3 rated CFM", kind: "number", default: 3 },
    { key: "tool3_duty", label: "Tool 3 duty cycle (0-1)", kind: "number", default: 0.1 },
    { key: "tool4_qty", label: "Tool 4 quantity (0 if unused)", kind: "number", default: 0 },
    { key: "tool4_cfm", label: "Tool 4 rated CFM", kind: "number", default: 0 },
    { key: "tool4_duty", label: "Tool 4 duty cycle (0-1)", kind: "number", default: 0 },
    { key: "leak_allowance_pct", label: "Leak allowance (percent)", kind: "number", default: 15 },
    { key: "growth_allowance_pct", label: "Future growth allowance (percent)", kind: "number", default: 20 },
    { key: "cfm_per_hp", label: "CFM per horsepower at system pressure", kind: "number", default: 4 },
  ],
  outputs: [
    { key: "a", id: "acs-out-a", label: "Duty-weighted average demand", value: (r) => fmt(r.average_cfm, 2) + " cfm across " + fmt(r.tool_count, 0) + " tool types -- against a connected load of " + fmt(r.connected_cfm, 1) + " cfm" },
    { key: "l", id: "acs-out-l", label: "With leaks", value: (r) => fmt(r.with_leaks_cfm, 2) + " cfm -- the " + fmt(r.leak_allowance_pct, 0) + "% allowance is " + fmt(r.leak_cfm, 2) + " cfm you could fix instead of buy" },
    { key: "d", id: "acs-out-d", label: "Design CFM", value: (r) => fmt(r.design_cfm, 2) + " cfm after " + fmt(r.growth_allowance_pct, 0) + "% growth" },
    { key: "m", id: "acs-out-m", label: "Motor", value: (r) => fmt(r.motor_hp, 1) + " hp at " + fmt(r.cfm_per_hp, 1) + " cfm per hp" },
    { key: "o", id: "acs-out-o", label: "If you sized on the connected load", value: (r) => r.oversize_verdict },
    { key: "u", id: "acs-out-u", label: "If you sized on the biggest tool", value: (r) => r.undersize_verdict },
    { key: "n", id: "acs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAirCompressorCfmSizing,
});

// ============ spec-v1482: air receiver pump-up and draw-down time ============

// dims: in { receiver_volume_ft3: L^3, fill_start_psig: M L^-1 T^-2, fill_end_psig: M L^-1 T^-2, compressor_scfm: L^3 / T, cut_out_psig: M L^-1 T^-2, cut_in_psig: M L^-1 T^-2, net_demand_scfm: L^3 / T, required_cover_minutes: T } out: { pump_up_minutes: T, draw_down_minutes: T, usable_free_air_ft3: L^3, receiver_required_ft3: L^3, band_psi: M L^-1 T^-2 }
export function computeReceiverPumpUpTime({ receiver_volume_ft3 = 0, fill_start_psig = 0, fill_end_psig = 0, compressor_scfm = 0, cut_out_psig = 0, cut_in_psig = 0, net_demand_scfm = 0, required_cover_minutes = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ATM = 14.7;
  if (!(receiver_volume_ft3 > 0)) return { error: "Receiver volume must be positive (cu ft)." };
  if (fill_start_psig < 0 || fill_end_psig < 0 || cut_out_psig < 0 || cut_in_psig < 0) return { error: "Pressures cannot be negative (psig)." };
  if (compressor_scfm < 0 || net_demand_scfm < 0 || required_cover_minutes < 0) return { error: "Flows and the required cover cannot be negative." };
  const has_fill = fill_end_psig > fill_start_psig && compressor_scfm > 0;
  const pump_up_minutes = has_fill
    ? receiver_volume_ft3 * (fill_end_psig - fill_start_psig) / (ATM * compressor_scfm) : null;
  // The useful air is the pressure BAND, not the tank: widening the band from
  // 20 to 40 psi doubles the usable storage out of the same vessel.
  const band_psi = cut_out_psig - cut_in_psig;
  const has_band = band_psi > 0;
  const usable_free_air_ft3 = has_band ? receiver_volume_ft3 * band_psi / ATM : null;
  const draw_down_minutes = has_band && net_demand_scfm > 0
    ? receiver_volume_ft3 * band_psi / (ATM * net_demand_scfm) : null;
  // Same relation the air receiver sizing calculator uses, rearranged: a
  // receiver for a stated demand over a stated duration.
  const receiver_required_ft3 = has_band && net_demand_scfm > 0 && required_cover_minutes > 0
    ? required_cover_minutes * ATM * net_demand_scfm / band_psi : null;
  const outs = [receiver_volume_ft3];
  if (!outs.every(Number.isFinite)) return { error: "Receiver time math is not a finite value." };
  if (pump_up_minutes === null && draw_down_minutes === null) return { error: "Enter a fill (a rising pressure pair and a compressor flow) or a draw-down (a cut-out above a cut-in, and a net demand)." };
  const covers = draw_down_minutes !== null && required_cover_minutes > 0 ? draw_down_minutes >= required_cover_minutes : null;
  return {
    pump_up_minutes, draw_down_minutes, usable_free_air_ft3, receiver_required_ft3,
    band_psi, receiver_volume_ft3, net_demand_scfm, required_cover_minutes,
    draw_down_seconds: draw_down_minutes === null ? null : draw_down_minutes * 60,
    covers,
    cover_verdict: draw_down_minutes === null
      ? "(no draw-down entered)"
      : required_cover_minutes <= 0
        ? fmt(draw_down_minutes, 2) + " minutes of cover, and no required duration entered to judge it against"
        : covers
          ? fmt(draw_down_minutes, 2) + " minutes of cover against the " + fmt(required_cover_minutes, 2) + " minutes required -- AMPLE, and " + fmt(receiver_required_ft3, 1) + " cu ft would have done it against the " + fmt(receiver_volume_ft3, 1) + " cu ft fitted"
          : "SHORT: " + fmt(draw_down_minutes, 2) + " minutes of cover against the " + fmt(required_cover_minutes, 2) + " minutes required -- and the fix is " + fmt(receiver_required_ft3, 1) + " cu ft of tank, not a bigger compressor",
    band_verdict: !has_band
      ? "(no pressure band entered)"
      : "the usable air is the BAND, not the tank: " + fmt(usable_free_air_ft3, 1) + " cu ft of free air out of a " + fmt(receiver_volume_ft3, 1) + " cu ft vessel over " + fmt(band_psi, 1) + " psi. Double the band and you double the storage, free",
    note: "A receiver is a buffer, and the two numbers that describe it are how long the compressor takes to fill it and how long the plant can draw from it before pressure falls to the cut-in. Both come from one relation, which is just the ideal gas law in shop units: the free air stored is the volume times the pressure band in atmospheres, and 14.7 converts psig to atmospheres. THE CONSEQUENCE PEOPLE MISS IS THAT A RECEIVER'S USEFULNESS DEPENDS ON THE BAND YOU ARE WILLING TO GIVE UP, NOT ON THE TANK. Widening the cut-in to cut-out band from 20 to 40 psi doubles the usable storage out of the same vessel -- free capacity, paid for in slightly lower minimum pressure. That is what makes the draw-down form the useful one. A shop with a sandblaster or a large intermittent tool does not need a compressor that covers the peak; it needs a receiver big enough to cover the peak's DURATION while the compressor catches up between uses, and sizing that way is far cheaper than sizing the compressor to the peak. A 120 cu ft receiver on a 35 psi band supplying a tool that draws 30 scfm more than the compressor makes gives 9.52 minutes of cover -- so a tool that runs two minutes at a time is amply covered, and only about 25 cu ft of tank would have been needed for it. The receiver-sizing form is the same relation the air receiver calculator uses, rearranged, so the two cannot disagree. This is ideal-gas arithmetic at constant temperature. Real filling heats the air, so a receiver that reads its cut-out pressure hot will fall back as it cools and the compressor will restart -- pump-up times run slightly optimistic for that reason. It does not size the compressor, evaluate the piping between compressor and receiver, or address the drain, relief valve, and pressure vessel code requirements that a receiver carries; an air receiver is a pressure vessel with inspection obligations in most jurisdictions. It does not account for the storage in the distribution piping itself, which on a large system is real and sometimes substantial. The compressor and receiver manufacturers' data and the applicable pressure vessel code govern.",
  };
}
const receiverPumpUpTimeExample = { inputs: { receiver_volume_ft3: 120, fill_start_psig: 0, fill_end_psig: 175, compressor_scfm: 42, cut_out_psig: 175, cut_in_psig: 140, net_demand_scfm: 30, required_cover_minutes: 2 } };
MILLWRIGHT_RENDERERS["receiver-pump-up-time"] = _simpleRenderer({
  citation: "Citation: the receiver storage relation by name, the ideal gas law in shop units -- pump-up time = V (p2 - p1) / (14.7 x compressor scfm), draw-down time = V (cut-out - cut-in) / (14.7 x net demand), and the receiver required = duration x 14.7 x net demand / the pressure band, which is the same relation the air receiver calculator uses. Constant temperature assumed. The compressor and receiver manufacturers' data and the applicable pressure vessel code govern.",
  example: receiverPumpUpTimeExample.inputs,
  fields: [
    { key: "receiver_volume_ft3", label: "Receiver volume (cu ft)", kind: "number", default: 120 },
    { key: "fill_start_psig", label: "Fill start pressure (psig)", kind: "number", default: 0 },
    { key: "fill_end_psig", label: "Fill end pressure (psig)", kind: "number", default: 175 },
    { key: "compressor_scfm", label: "Compressor delivered flow (scfm)", kind: "number", default: 42 },
    { key: "cut_out_psig", label: "Cut-out pressure (psig)", kind: "number", default: 175 },
    { key: "cut_in_psig", label: "Cut-in pressure (psig)", kind: "number", default: 140 },
    { key: "net_demand_scfm", label: "Net demand above what the compressor makes (scfm)", kind: "number", default: 30 },
    { key: "required_cover_minutes", label: "Duration the peak must be covered (min, 0 to skip)", kind: "number", default: 2 },
  ],
  outputs: [
    { key: "p", id: "rpu-out-p", label: "Pump-up time", value: (r) => r.pump_up_minutes === null ? "(no fill entered)" : fmt(r.pump_up_minutes, 2) + " minutes" },
    { key: "d", id: "rpu-out-d", label: "Draw-down time", value: (r) => r.draw_down_minutes === null ? "(no draw-down entered)" : fmt(r.draw_down_minutes, 2) + " minutes (" + fmt(r.draw_down_seconds, 0) + " s) of cover" },
    { key: "u", id: "rpu-out-u", label: "Usable stored air", value: (r) => r.band_verdict },
    { key: "c", id: "rpu-out-c", label: "Against the peak you must cover", value: (r) => r.cover_verdict },
    { key: "n", id: "rpu-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeReceiverPumpUpTime,
});

// ============ spec-v1481: refrigerated and desiccant air dryer sizing ============

// dims: in { actual_scfm: L^3 / T, temp_correction: dimensionless, pressure_correction: dimensionless, ambient_correction: dimensionless, candidate_rated_scfm: L^3 / T, purge_fraction: dimensionless } out: { combined_factor: dimensionless, required_rated_scfm: L^3 / T, candidate_delivers_scfm: L^3 / T, purge_scfm: L^3 / T, compressor_load_scfm: L^3 / T }
export function computeAirDryerSizing({ actual_scfm = 0, temp_correction = 1, pressure_correction = 1, ambient_correction = 1, candidate_rated_scfm = 0, purge_fraction = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(actual_scfm > 0)) return { error: "Actual air flow must be positive (scfm)." };
  for (const [n, v] of [["inlet temperature", temp_correction], ["pressure", pressure_correction], ["ambient", ambient_correction]]) {
    if (!(v > 0)) return { error: "The " + n + " correction factor must be positive -- take it from the dryer manufacturer's table." };
  }
  if (candidate_rated_scfm < 0) return { error: "A candidate dryer's rated capacity cannot be negative (scfm)." };
  if (!(purge_fraction >= 0 && purge_fraction < 1)) return { error: "Purge must be at least 0 and below 1 (a heatless regenerative dryer runs about 0.15)." };
  // The corrections MULTIPLY, so three individually modest factors compound.
  const combined_factor = temp_correction * pressure_correction * ambient_correction;
  const required_rated_scfm = actual_scfm / combined_factor;
  const candidate_delivers_scfm = candidate_rated_scfm > 0 ? candidate_rated_scfm * combined_factor : null;
  const candidate_shortfall_scfm = candidate_delivers_scfm === null ? null : actual_scfm - candidate_delivers_scfm;
  const candidate_ok = candidate_delivers_scfm === null ? null : candidate_delivers_scfm >= actual_scfm;
  // The purge is real compressor capacity that must be ADDED to the compressor
  // sizing, not subtracted from the dryer's.
  const compressor_load_scfm = purge_fraction > 0 ? actual_scfm / (1 - purge_fraction) : actual_scfm;
  const purge_scfm = compressor_load_scfm - actual_scfm;
  const outs = [combined_factor, required_rated_scfm, compressor_load_scfm, purge_scfm];
  if (!outs.every(Number.isFinite)) return { error: "Dryer sizing math is not a finite value." };
  return {
    combined_factor, required_rated_scfm, candidate_rated_scfm, candidate_delivers_scfm,
    candidate_shortfall_scfm, candidate_ok, purge_fraction, purge_scfm, compressor_load_scfm,
    actual_scfm, derate_pct: (1 - combined_factor) * 100,
    candidate_verdict: candidate_delivers_scfm === null
      ? "(no candidate dryer entered)"
      : candidate_ok
        ? "a " + fmt(candidate_rated_scfm, 0) + " scfm nameplate delivers " + fmt(candidate_delivers_scfm, 1) + " scfm here, which covers the " + fmt(actual_scfm, 0) + " scfm required"
        : "a " + fmt(candidate_rated_scfm, 0) + " scfm nameplate delivers only " + fmt(candidate_delivers_scfm, 1) + " scfm here and passes wet air downstream -- " + fmt(candidate_shortfall_scfm, 1) + " scfm short. Select above " + fmt(required_rated_scfm, 0) + " scfm",
    purge_verdict: purge_fraction <= 0
      ? "(no purge entered -- a refrigerated dryer has none; a heatless regenerative desiccant unit runs about 15%)"
      : "at " + fmt(purge_fraction * 100, 0) + "% purge the compressor must supply " + fmt(compressor_load_scfm, 1) + " scfm to deliver " + fmt(actual_scfm, 0) + " to the plant -- " + fmt(purge_scfm, 1) + " scfm of compressor capacity that exists only to dry air, and it is ADDED to the compressor sizing, not subtracted from the dryer's",
    note: "A refrigerated dryer's catalog number is stated at one set of conditions -- typically 100 psig inlet, 100 degF inlet air, 100 degF ambient -- and a plant almost never sits at all three. Every correction runs the same way: hotter inlet air carries far more water and derates the dryer, lower pressure means more actual volume per unit mass and derates it, and a hotter ambient hurts the condenser and derates it again. BECAUSE THEY MULTIPLY, three individually modest factors compound: 0.80 times 1.10 times 0.95 is 0.836, so a 200 scfm nameplate delivers only 167 scfm and the honest requirement is 239. A dryer selected on its badge number is the reason water comes out of the drops. The choice between refrigerated and desiccant is a DEW POINT decision, not a capacity one. A refrigerated dryer holds roughly a 35 to 40 degF pressure dew point and cannot go below freezing without icing, so anything running outdoors, feeding an unheated line, or supplying instrument or breathing air needs desiccant. The cost of desiccant is the purge: a heatless regenerative dryer diverts around 15% of its own throughput to regenerate the offline tower, and that purge is real compressor capacity which must be ADDED to the compressor sizing rather than subtracted from the dryer's -- delivering 200 scfm to the plant through a 15% purge means the compressor supplies 235. This applies correction factors the user takes from the manufacturer's own tables; it does not supply them, because they differ by model and by dryer technology and a generic table is the thing that goes stale. It does not select a dryer, determine the required pressure dew point for the application, or evaluate whether a refrigerated unit will ice; it does not size the pre-filters and after-filters that a desiccant bed requires and without which the bed is destroyed by oil carryover; and it does not address drain traps, which are where most compressed-air moisture problems actually originate. It does not compute the moisture load itself. The dryer manufacturer's correction tables and dew point ratings, and the requirements of the air application, govern.",
  };
}
const airDryerSizingExample = { inputs: { actual_scfm: 200, temp_correction: 0.8, pressure_correction: 1.1, ambient_correction: 0.95, candidate_rated_scfm: 200, purge_fraction: 0.15 } };
MILLWRIGHT_RENDERERS["air-dryer-sizing"] = _simpleRenderer({
  citation: "Citation: the compressed-air dryer correction-factor method by name -- the inlet temperature, operating pressure and ambient corrections MULTIPLY, so corrected capacity = rated x the product and required rating = actual flow / the product. The factors are taken from the dryer manufacturer's own tables, which differ by model and technology. A heatless regenerative desiccant dryer's purge is added to the compressor load, not subtracted from the dryer's. The dryer manufacturer's correction tables and dew point ratings govern.",
  example: airDryerSizingExample.inputs,
  fields: [
    { key: "actual_scfm", label: "Actual air flow to be dried (scfm)", kind: "number", default: 200 },
    { key: "temp_correction", label: "Inlet temperature correction factor", kind: "number", default: 0.8 },
    { key: "pressure_correction", label: "Operating pressure correction factor", kind: "number", default: 1.1 },
    { key: "ambient_correction", label: "Ambient temperature correction factor", kind: "number", default: 0.95 },
    { key: "candidate_rated_scfm", label: "Candidate dryer nameplate (scfm, 0 to skip)", kind: "number", default: 200 },
    { key: "purge_fraction", label: "Desiccant purge fraction (0 for refrigerated)", kind: "number", default: 0.15 },
  ],
  outputs: [
    { key: "c", id: "ads-out-c", label: "Combined correction", value: (r) => fmt(r.combined_factor, 4) + " -- the three factors MULTIPLY, so this is a " + fmt(r.derate_pct, 1) + "% derate from three individually modest numbers" },
    { key: "r", id: "ads-out-r", label: "Required nameplate rating", value: (r) => fmt(r.required_rated_scfm, 1) + " scfm to deliver " + fmt(r.actual_scfm, 0) + " scfm at these conditions" },
    { key: "d", id: "ads-out-d", label: "The candidate dryer", value: (r) => r.candidate_verdict },
    { key: "p", id: "ads-out-p", label: "Desiccant purge", value: (r) => r.purge_verdict },
    { key: "n", id: "ads-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAirDryerSizing,
});

// ============ spec-v1483: vacuum pump evacuation time ============

// dims: in { chamber_volume_ft3: L^3, pump_speed_cfm: L^3 / T, start_pressure_torr: M L^-1 T^-2, target_pressure_torr: M L^-1 T^-2, leak_rate_torr_cfm: dimensionless, conductance_efficiency: dimensionless } out: { evacuation_minutes: T, minutes_per_decade: T, decades: dimensionless, ultimate_pressure_torr: M L^-1 T^-2, effective_speed_cfm: L^3 / T }
export function computeVacuumEvacuationTime({ chamber_volume_ft3 = 0, pump_speed_cfm = 0, start_pressure_torr = 760, target_pressure_torr = 0, leak_rate_torr_cfm = 0, conductance_efficiency = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(chamber_volume_ft3 > 0)) return { error: "Chamber volume must be positive (cu ft)." };
  if (!(pump_speed_cfm > 0)) return { error: "Pump speed must be positive (cfm)." };
  if (!(start_pressure_torr > 0)) return { error: "Starting pressure must be positive (torr)." };
  if (!(target_pressure_torr > 0)) return { error: "Target pressure must be positive (torr)." };
  if (!(target_pressure_torr < start_pressure_torr)) return { error: "The target pressure must be below the starting pressure." };
  if (leak_rate_torr_cfm < 0) return { error: "Leak rate cannot be negative (torr-cfm)." };
  if (!(conductance_efficiency > 0 && conductance_efficiency <= 1)) return { error: "Conductance efficiency must be over 0 and at most 1 -- the line and its fittings never deliver the pump's full rated speed at the chamber." };
  const effective_speed_cfm = pump_speed_cfm * conductance_efficiency;
  // Pump-down is LOGARITHMIC: each decade costs the same time as the last.
  const evacuation_minutes = (chamber_volume_ft3 / effective_speed_cfm) * Math.log(start_pressure_torr / target_pressure_torr);
  const minutes_per_decade = (chamber_volume_ft3 / effective_speed_cfm) * Math.LN10;
  const decades = Math.log10(start_pressure_torr / target_pressure_torr);
  // A pump-down that flattens out short of target is reporting a leak, and the
  // flattening pressure says how big it is.
  const ultimate_pressure_torr = leak_rate_torr_cfm > 0 ? leak_rate_torr_cfm / effective_speed_cfm : 0;
  const reaches_target = ultimate_pressure_torr < target_pressure_torr;
  const outs = [evacuation_minutes, minutes_per_decade, decades, effective_speed_cfm];
  if (!outs.every(Number.isFinite)) return { error: "Evacuation time math is not a finite value." };
  // The leak rate that would exactly block the target.
  const blocking_leak_torr_cfm = target_pressure_torr * effective_speed_cfm;
  return {
    evacuation_minutes, minutes_per_decade, decades, effective_speed_cfm,
    ultimate_pressure_torr, reaches_target, blocking_leak_torr_cfm,
    target_pressure_torr, start_pressure_torr, leak_rate_torr_cfm,
    next_decade_minutes: minutes_per_decade,
    leak_verdict: leak_rate_torr_cfm <= 0
      ? "(no leak entered -- and a pump-down that flattens out short of target IS a leak measurement: the flattening pressure says how big it is)"
      : reaches_target
        ? "a " + fmt(leak_rate_torr_cfm, 2) + " torr-cfm leak puts the ultimate at " + fmt(ultimate_pressure_torr, 3) + " torr, which is BELOW the " + fmt(target_pressure_torr, 3) + " torr target -- the target is reachable, and the leak only costs time near the end. It would take " + fmt(blocking_leak_torr_cfm, 1) + " torr-cfm to block it"
        : "a " + fmt(leak_rate_torr_cfm, 2) + " torr-cfm leak puts the ultimate at " + fmt(ultimate_pressure_torr, 3) + " torr, ABOVE the " + fmt(target_pressure_torr, 3) + " torr target -- NO amount of additional pumping time reaches it. Find the leak",
    note: "Pump-down time is LOGARITHMIC, not linear, and that single fact governs every vacuum job. Each decade of pressure costs the same time as the last, so getting from 760 torr to 76 takes as long as getting from 76 to 7.6 -- which is why a system that seemed fast in the first minute takes an hour to reach its setpoint, and why the instinct built on the first thirty seconds is always wrong. A 15 cu ft chamber on a 25 cfm pump reaches 1 torr from atmosphere in about 4 minutes, spread evenly across 2.88 decades at 1.38 minutes each, and going one decade further to 0.1 torr costs another 1.38 -- the same as the first decade, which took the pressure from 760 down to 76. The pump's rated speed is not the speed at the chamber. The connecting line and its fittings have a finite conductance, and on a long or narrow line the effective speed can be a fraction of the rating, so the conductance efficiency is entered here rather than assumed at one. LEAKAGE SETS AN ULTIMATE PRESSURE that no amount of pumping time will beat: the leak rate divided by the effective speed. If that ultimate sits BELOW the target the target is reachable and the leak only costs time near the end; if it sits ABOVE the target, the system will never get there and more time is wasted time. A pump-down curve that flattens out short of the target is therefore a leak MEASUREMENT, and the flattening pressure times the pumping speed is the leak rate. This is the ideal isothermal volume relation. It assumes the pump holds its rated speed across the whole pressure range, which no real pump does -- speed falls off near the ultimate, so real pump-downs run longer than this at the low end. It does not model outgassing from chamber walls and elastomer seals, which dominates below roughly 1e-3 torr and which no volume calculation captures; it does not handle water vapour load, which is the usual reason a chamber that pumped down fine yesterday is slow today; and it does not size a pump, select a pump type for a pressure range, or evaluate a trap or foreline. The pump manufacturer's speed curve and the system designer govern.",
  };
}
const vacuumEvacuationTimeExample = { inputs: { chamber_volume_ft3: 15, pump_speed_cfm: 25, start_pressure_torr: 760, target_pressure_torr: 1, leak_rate_torr_cfm: 5, conductance_efficiency: 1 } };
MILLWRIGHT_RENDERERS["vacuum-evacuation-time"] = _simpleRenderer({
  citation: "Citation: the isothermal volume pump-down relation by name -- t = (V / S) ln(p1 / p2), so each decade costs t = 2.303 V / S and the time is spread evenly across the decades -- with the leak-limited ultimate pressure = leak rate / effective pumping speed. Rated speed is corrected by an entered conductance efficiency because the connecting line never delivers it in full. Real pumps lose speed near the ultimate, so this runs optimistic at the low end. The pump manufacturer's speed curve and the system designer govern.",
  example: vacuumEvacuationTimeExample.inputs,
  fields: [
    { key: "chamber_volume_ft3", label: "Chamber volume (cu ft)", kind: "number", default: 15 },
    { key: "pump_speed_cfm", label: "Pump rated speed (cfm)", kind: "number", default: 25 },
    { key: "start_pressure_torr", label: "Starting pressure (torr, 760 is atmosphere)", kind: "number", default: 760 },
    { key: "target_pressure_torr", label: "Target pressure (torr)", kind: "number", default: 1 },
    { key: "leak_rate_torr_cfm", label: "Leak rate (torr-cfm, 0 to skip)", kind: "number", default: 5 },
    { key: "conductance_efficiency", label: "Line conductance efficiency (0-1)", kind: "number", default: 1 },
  ],
  outputs: [
    { key: "t", id: "vet-out-t", label: "Evacuation time", value: (r) => fmt(r.evacuation_minutes, 2) + " minutes from " + fmt(r.start_pressure_torr, 0) + " to " + fmt(r.target_pressure_torr, 3) + " torr" },
    { key: "d", id: "vet-out-d", label: "Per decade", value: (r) => fmt(r.minutes_per_decade, 2) + " minutes each, across " + fmt(r.decades, 2) + " decades -- and the NEXT decade costs the same again, which is the fact that governs every vacuum job" },
    { key: "s", id: "vet-out-s", label: "Effective pumping speed", value: (r) => fmt(r.effective_speed_cfm, 2) + " cfm at the chamber -- the line's conductance is why this is not the pump's rating" },
    { key: "l", id: "vet-out-l", label: "Leak-limited ultimate", value: (r) => r.leak_verdict },
    { key: "n", id: "vet-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeVacuumEvacuationTime,
});
