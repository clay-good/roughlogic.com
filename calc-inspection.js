// Group E: nondestructive examination and heat treatment.
//
// spec-v1664..v1674 (scope-trade-expansion-2, the inspection band): the six
// NDT methods a weld inspector actually runs -- visual, ultrasonic thickness,
// radiography and its exposure boundary, magnetic particle, and liquid
// penetrant -- and the five heat-treatment calculations that decide whether
// the steel underneath them is what the certificate says.
//
// The thread through the NDT half is that every one of these methods can be
// performed correctly, documented correctly, and find nothing, while the
// discontinuity is still there. A gauge calibrated for the wrong material, a
// penetrant dwell taken from the wrong row, a magnetic particle shot in the
// wrong orientation: each produces a clean report on a defective part, and
// none of them looks like a failure at the time. That is why the tiles report
// the trap alongside the number.
//
// The heat-treatment half turns on the same distinction twice: hardness is
// not hardenability (carbon versus alloy), and a surface reading is not a
// section property. Both are confusions that produce a part passing its test
// and failing in service.
//
// Two near-neighbours were screened by formula and both are genuinely
// different questions. `quench-severity` in calc-shop.js asks whether
// AGITATION helps, through the Biot number; spec-v1672 asks how DEEP the
// hardness reaches, through the equivalent Jominy distance. And
// `heat-treat-soak-time` says in its own note that it "does not address ...
// ramp rates", which is exactly what spec-v1674 supplies.
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

// Compact renderer factory, copied verbatim from calc-process.js (same
// ui-fields imports) per the new-module convention; only the inner render
// function's name differs, so the schema-coverage gates read it unchanged.
function _simpleRenderer(spec) {
  const _inRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id || f.key, f.options);
      else field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) {
        if (f.kind === "select") field.select.value = f.default;
        else field.input.value = String(f.default);
      }
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        if (f.kind === "select") fields[f.key].select.value = v[f.key];
        else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) {
        if (f.kind === "select") params[f.key] = fields[f.key].select.value;
        else params[f.key] = Number(fields[f.key].input.value) || 0;
      }
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener(f.kind === "select" ? "change" : "input", update);
    }
  };

  _inRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _inRender;
}


export const INSPECTION_RENDERERS = {};

// =====================================================================
// spec-v1664: weld visual acceptance limits.
// =====================================================================
// dims: in { nominal_leg_in: L, measured_leg_in: L, undersize_length_in: L, weld_length_in: L, allowed_undersize_in: L, allowed_undersize_fraction: dimensionless, measured_undercut_in: L, allowed_undercut_in: L, crack_present: dimensionless } out: { undersize_in: L, undersize_length_fraction: dimensionless, allowed_undersize_length_in: L, undercut_margin_in: L }
export function computeWeldVisualAcceptance({
  nominal_leg_in = 0, measured_leg_in = 0, undersize_length_in = 0, weld_length_in = 0,
  allowed_undersize_in = 0, allowed_undersize_fraction = 0.10,
  measured_undercut_in = 0, allowed_undercut_in = 0, crack_present = "no",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(nominal_leg_in > 0)) return { error: "Nominal weld leg must be positive (in)." };
  if (!(measured_leg_in > 0)) return { error: "Measured weld leg must be positive (in)." };
  if (!(weld_length_in > 0)) return { error: "Weld length must be positive (in)." };
  if (undersize_length_in < 0 || undersize_length_in > weld_length_in) return { error: "The undersize length must be between 0 and the weld length." };
  if (allowed_undersize_in < 0 || measured_undercut_in < 0 || allowed_undercut_in < 0) return { error: "Allowances and measured undercut cannot be negative." };
  if (allowed_undersize_fraction < 0 || allowed_undersize_fraction > 1) return { error: "The permitted undersize length fraction must be between 0 and 1." };
  // A CRACK IS REJECTABLE WITHOUT DIMENSION. It is reported first, before any
  // measurement, because no tolerance applies to it.
  const has_crack = crack_present === "yes";
  const crack_verdict = has_crack
    ? "REJECT. A CRACK IS PRESENT, and that rejects the weld regardless of every dimension below. No size applies: any crack is rejectable, and a crater crack at a stop is the one most likely to be dismissed as cosmetic"
    : "no crack reported. Any crack is rejectable without regard to size -- and the crater crack at a stop is the one most often called cosmetic and left";
  const undersize_in = nominal_leg_in - measured_leg_in;
  const is_undersize = undersize_in > 0;
  const undersize_length_fraction = undersize_length_in / weld_length_in;
  const allowed_undersize_length_in = weld_length_in * allowed_undersize_fraction;
  const has_size_allowance = allowed_undersize_in > 0;
  const size_within = has_size_allowance && undersize_in <= allowed_undersize_in;
  const length_within = undersize_length_in <= allowed_undersize_length_in;
  const undersize_ok = !is_undersize || (size_within && length_within);
  const size_verdict = !is_undersize
    ? "the weld measures " + fmt(measured_leg_in, 4) + " in against a " + fmt(nominal_leg_in, 4) + " in nominal leg, at or over size"
    : "the weld is " + fmt(undersize_in, 4) + " in undersize (" + fmt(measured_leg_in, 4) + " against " + fmt(nominal_leg_in, 4) + " in) over " + fmt(undersize_length_in, 1) + " in of a " + fmt(weld_length_in, 1) + " in weld -- " + fmt(undersize_length_fraction * 100, 0) + "% of its length";
  const undersize_verdict = !is_undersize
    ? "(the weld is not undersize)"
    : !has_size_allowance
      ? "(no permitted undersize entered -- BOTH the amount and the length have to be satisfied, and the code gives each separately)"
      : undersize_ok
        ? "that is within tolerance: " + fmt(undersize_in, 4) + " in is inside the " + fmt(allowed_undersize_in, 4) + " in allowance AND " + fmt(undersize_length_in, 1) + " in is inside the " + fmt(allowed_undersize_length_in, 1) + " in permitted length. THE SAME SHORTFALL OVER THE FULL LENGTH WOULD NOT BE -- both parts have to be satisfied, and a limited undersize over a limited length is a different thing from a uniformly small weld"
        : !size_within
          ? "REJECT on amount: " + fmt(undersize_in, 4) + " in undersize exceeds the " + fmt(allowed_undersize_in, 4) + " in allowance, so the length does not matter"
          : "REJECT on length: " + fmt(undersize_length_in, 1) + " in exceeds the " + fmt(allowed_undersize_length_in, 1) + " in permitted (" + fmt(allowed_undersize_fraction * 100, 0) + "% of the weld), even though " + fmt(undersize_in, 4) + " in is within the amount allowed";
  const has_undercut = measured_undercut_in > 0 && allowed_undercut_in > 0;
  const undercut_margin_in = has_undercut ? allowed_undercut_in - measured_undercut_in : 0;
  const undercut_ok = has_undercut && undercut_margin_in >= 0;
  const undercut_verdict = !has_undercut
    ? "(no measured undercut and limit entered)"
    : undercut_ok
      ? fmt(measured_undercut_in, 4) + " in of undercut is within the " + fmt(allowed_undercut_in, 4) + " in limit entered, with " + fmt(undercut_margin_in, 4) + " in to spare"
      : fmt(measured_undercut_in, 4) + " in of undercut EXCEEDS the " + fmt(allowed_undercut_in, 4) + " in limit by " + fmt(-undercut_margin_in, 4) + " in";
  const loading_verdict = "AND THE LIMITS DEPEND ON THE LOADING, WHICH IS WHY THEY ARE ENTERED. The undercut allowance tightens and the porosity criteria change between a statically and a cyclically loaded connection, so THE SAME WELD CAN PASS AS STATIC AND FAIL AS CYCLIC. The inspector has to know which the connection is before opening a table -- and on a structure carrying both, the criteria change between members";
  const accept = !has_crack && undersize_ok && (!has_undercut || undercut_ok);
  const overall_verdict = has_crack
    ? "REJECT -- a crack is present, and nothing else is reached"
    : accept
      ? "on the items entered, ACCEPT"
      : "REJECT on the items entered";
  if (![undersize_in, undersize_length_fraction, allowed_undersize_length_in, undercut_margin_in].every(Number.isFinite)) return { error: "Weld visual acceptance math is not a finite value." };
  return {
    has_crack, crack_verdict, undersize_in, is_undersize, undersize_length_fraction,
    allowed_undersize_length_in, size_within, length_within, undersize_ok,
    size_verdict, undersize_verdict,
    has_undercut, undercut_margin_in, undercut_ok, undercut_verdict,
    loading_verdict, accept, overall_verdict,
    note: "A weld visual examination against limits the inspector enters from the applicable code. The three things that decide it are kept separate, because they fail differently. A CRACK IS REJECTABLE WITHOUT DIMENSION and is reported first. No size, length or location tolerance applies to a crack, and the one that gets argued about is the crater crack at a stop, which is small, looks cosmetic, and is a crack. Nothing else in the examination is reached once one is found. UNDERSIZE IS TWO TESTS, NOT ONE. The code permits a limited amount of undersize over a limited length, and both have to be satisfied -- so a weld a sixteenth light over three inches of a twenty-inch run can be acceptable while the same sixteenth light over the whole twenty inches is not. Checking the amount and forgetting the length, or the reverse, accepts welds the code rejects. A uniformly small weld is a different defect from a local low spot and the code treats it that way. THE LIMITS THEMSELVES DEPEND ON THE LOADING. Undercut allowances tighten and porosity criteria change between statically and cyclically loaded connections, so the same weld can pass as static and fail as cyclic. An inspector has to know which a connection is before opening a table, and on a structure carrying both kinds of member the criteria change from member to member -- which is why the limits are entered here rather than built in. Reproducing a code's acceptance table would also go stale between editions and would be wrong for every code but the one chosen. This screens entered measurements against entered limits. It does not reproduce any code's acceptance table, determine which criteria apply to a connection, cover the full range of visual acceptance items (reinforcement, convexity, overlap, weld profile, arc strikes, spatter, fusion at the toes, or the fit-up and root conditions that decide many of them), address weld size measurement technique or gauge selection, evaluate porosity or slag distribution, qualify a welder or a procedure, or replace the examination itself. AWS D1.1, AWS D1.5, ASME Section IX or the applicable code and the contract documents, and the certified welding inspector, govern.",
  };
}
export const weldVisualAcceptanceExample = { inputs: { nominal_leg_in: 0.375, measured_leg_in: 0.3125, undersize_length_in: 3, weld_length_in: 20, allowed_undersize_in: 0.0625, allowed_undersize_fraction: 0.10, measured_undercut_in: 0.030, allowed_undercut_in: 0.03125, crack_present: "yes" } };
INSPECTION_RENDERERS["weld-visual-acceptance"] = _simpleRenderer({
  citation: "Citation: weld visual acceptance as AWS D1.1 and equivalent codes structure it -- a crack is rejectable WITHOUT regard to size; undersize is two separate tests, the amount and the length over which it occurs, both of which must be satisfied; and undercut is compared against a limit that differs between statically and cyclically loaded connections. Every limit is ENTERED from the applicable code and edition, because reproducing an acceptance table would go stale between editions and be wrong for every code but one. It does not determine which criteria apply, cover reinforcement, convexity, overlap, profile or arc strikes, evaluate porosity, or qualify a welder or procedure. AWS D1.1 / D1.5, ASME Section IX or the applicable code and the certified welding inspector govern.",
  example: weldVisualAcceptanceExample.inputs,
  fields: [
    { key: "crack_present", label: "Any crack present?", kind: "select", default: "no", options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes (rejectable without dimension)" }] },
    { key: "nominal_leg_in", label: "Nominal weld leg (in)", kind: "number", attrs: { step: "any" } },
    { key: "measured_leg_in", label: "Measured weld leg (in)", kind: "number", attrs: { step: "any" } },
    { key: "undersize_length_in", label: "Length that is undersize (in)", kind: "number", attrs: { step: "any" } },
    { key: "weld_length_in", label: "Total weld length (in)", kind: "number", attrs: { step: "any" } },
    { key: "allowed_undersize_in", label: "Permitted undersize amount (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "allowed_undersize_fraction", label: "Permitted undersize length (fraction of weld)", kind: "number", default: 0.10, attrs: { step: "any" } },
    { key: "measured_undercut_in", label: "Measured undercut (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "allowed_undercut_in", label: "Permitted undercut for this loading (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "v", id: "wva-out-v", label: "Verdict", value: (r) => r.overall_verdict },
    { key: "k", id: "wva-out-k", label: "Cracks", value: (r) => r.crack_verdict },
    { key: "s", id: "wva-out-s", label: "Weld size", value: (r) => r.size_verdict },
    { key: "u", id: "wva-out-u", label: "Undersize: amount and length", value: (r) => r.undersize_verdict },
    { key: "c", id: "wva-out-c", label: "Undercut", value: (r) => r.undercut_verdict },
    { key: "l", id: "wva-out-l", label: "Static or cyclic", value: (r) => r.loading_verdict },
    { key: "n", id: "wva-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWeldVisualAcceptance,
});

// =====================================================================
// spec-v1665: ultrasonic thickness, velocity, and the calibration trap.
// =====================================================================
//
// The spec computes its 6.83% velocity error correctly and then says that on
// a 0.500 in nominal wall it is "382 thousandths". It is 34. The 382 is the
// ABSOLUTE error at the 5.6 in reading two paragraphs earlier, carried onto a
// different base thickness -- an eleven-fold overstatement. The point stands
// (34 thou is a whole corrosion allowance on a half-inch wall) and the
// arithmetic here is done at whatever thickness the user enters.
// =====================================================================
// dims: in { transit_time_us: T, gauge_velocity_in_us: L T^-1, actual_velocity_in_us: L T^-1, nominal_wall_in: L, retirement_limit_in: L, coating_thickness_in: L } out: { gauge_reading_in: L, true_thickness_in: L, error_pct: dimensionless, error_on_nominal_in: L, reading_at_limit_in: L, coating_overread_in: L }
export function computeUtThicknessVelocity({
  transit_time_us = 0, gauge_velocity_in_us = 0, actual_velocity_in_us = 0,
  nominal_wall_in = 0, retirement_limit_in = 0, coating_thickness_in = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(transit_time_us > 0)) return { error: "Round-trip transit time must be positive (microseconds)." };
  if (!(gauge_velocity_in_us > 0)) return { error: "The gauge's calibrated velocity must be positive (in/us)." };
  if (actual_velocity_in_us < 0) return { error: "The material's actual velocity cannot be negative." };
  if (nominal_wall_in < 0 || retirement_limit_in < 0 || coating_thickness_in < 0) return { error: "Nominal wall, retirement limit and coating thickness cannot be negative." };
  const gauge_reading_in = gauge_velocity_in_us * transit_time_us / 2;
  const has_actual = actual_velocity_in_us > 0;
  const true_thickness_in = has_actual ? actual_velocity_in_us * transit_time_us / 2 : 0;
  const error_pct = has_actual ? (gauge_reading_in - true_thickness_in) / true_thickness_in * 100 : 0;
  const reading_verdict = "the gauge reads " + fmt(gauge_reading_in, 4) + " in at " + fmt(gauge_velocity_in_us, 4) + " in/us and " + fmt(transit_time_us, 1) + " us round trip";
  const mismatch_verdict = !has_actual
    ? "(no actual material velocity entered -- and the mismatch between the two is the whole question)"
    : Math.abs(error_pct) < 1e-9
      ? "the gauge is calibrated for this material, so the reading is the thickness"
      : "the material's velocity is " + fmt(actual_velocity_in_us, 4) + " in/us, so the true thickness is " + fmt(true_thickness_in, 4) + " in and the gauge reads " + fmt(Math.abs(error_pct), 2) + "% " + (error_pct < 0 ? "LOW" : "HIGH") + ". A gauge is a TIMER, not a thickness meter: it multiplies a measured transit time by whatever velocity it was told";
  // The error that matters is the one at the wall being inspected, not at
  // whatever thickness happened to be in the calibration example.
  const has_nominal = nominal_wall_in > 0 && has_actual;
  const error_on_nominal_in = has_nominal ? nominal_wall_in * error_pct / 100 : 0;
  const nominal_verdict = !has_nominal
    ? "(no nominal wall entered)"
    : "on a " + fmt(nominal_wall_in, 3) + " in nominal wall that percentage is " + fmt(Math.abs(error_on_nominal_in) * 1000, 1) + " thousandths -- which is the width of a whole corrosion allowance on most equipment. The error is a PERCENTAGE, so it scales with the wall: it must be evaluated at the thickness actually being inspected rather than carried across from another one";
  const has_limit = retirement_limit_in > 0 && has_actual;
  // The dangerous direction: a wall already below its limit that READS above it.
  const reading_at_limit_in = has_limit ? retirement_limit_in * gauge_velocity_in_us / actual_velocity_in_us : 0;
  const thinnest_passing_in = has_limit ? retirement_limit_in * actual_velocity_in_us / gauge_velocity_in_us : 0;
  const limit_verdict = !has_limit
    ? "(no retirement limit entered)"
    : error_pct > 0
      ? "AND THIS IS THE DANGEROUS DIRECTION. Against a " + fmt(retirement_limit_in, 4) + " in retirement limit, a wall as thin as " + fmt(thinnest_passing_in, 4) + " in still READS at or above the limit on this gauge -- so the equipment stays in service " + fmt((retirement_limit_in - thinnest_passing_in) * 1000, 1) + " thousandths past where it should have been retired"
      : "against a " + fmt(retirement_limit_in, 4) + " in retirement limit this error runs conservative: a wall at the limit reads " + fmt(reading_at_limit_in, 4) + " in, below it, so the equipment is retired early rather than late. The opposite calibration error is the dangerous one";
  const has_coating = coating_thickness_in > 0;
  const coating_overread_in = has_coating ? coating_thickness_in * gauge_velocity_in_us / 0.0866 : 0;
  const coating_verdict = !has_coating
    ? "(no coating thickness entered)"
    : "a " + fmt(coating_thickness_in, 4) + " in coating measured in single-echo mode adds roughly " + fmt(coating_overread_in, 4) + " in to the reading, because sound crosses the paint at about a third of steel's velocity and the gauge counts that time as metal. A coated tank reads THICK, which is the wrong direction. ECHO-TO-ECHO mode removes it by timing between two back-wall echoes, and on any coated corrosion survey it is the mode to use";
  if (![gauge_reading_in, true_thickness_in, error_pct, error_on_nominal_in, reading_at_limit_in, coating_overread_in].every(Number.isFinite)) return { error: "Ultrasonic thickness math is not a finite value." };
  return {
    gauge_reading_in, has_actual, true_thickness_in, error_pct, reading_verdict, mismatch_verdict,
    has_nominal, error_on_nominal_in, nominal_verdict,
    has_limit, reading_at_limit_in, thinnest_passing_in, limit_verdict,
    has_coating, coating_overread_in, coating_verdict,
    note: "What an ultrasonic thickness gauge really does: time a round trip, and multiply by the velocity it was told. Thickness is velocity times transit time over two, and the gauge has no way of knowing what material it is sitting on -- so a gauge calibrated on a steel block and used on aluminium reports a number that is precise, repeatable, documented, and wrong by about 7 percent. THE ERROR IS A PERCENTAGE, AND IT SCALES WITH THE WALL. That is worth stating plainly because it is easy to carry an absolute figure across from one thickness to another: 7 percent of a 5 inch section is nearly four hundred thousandths and 7 percent of a half-inch wall is thirty-four, and both are serious for different reasons. The figure that matters is the one computed at the wall actually being inspected. THE TWO DIRECTIONS ARE NOT EQUALLY DANGEROUS. A gauge reading LOW retires equipment early, which costs money. A gauge reading HIGH leaves a wall in service that is already below its retirement limit, and the report says it passed. Against a stated limit this reports the thinnest wall that still reads acceptable, because that gap is the exposure the calibration error creates and it is invisible in the reading itself. Coating is the other silent overread. Sound crosses paint at roughly a third of steel's velocity, so in single-echo mode a coated wall reads thick by considerably more than the coating's own thickness -- again in the unsafe direction. Echo-to-echo mode times between two back-wall echoes and ignores everything in front of them, which is why it is the mode for any coated corrosion survey, and why a survey done in the wrong mode on a painted tank is not conservative. The rule that follows from all of it: CALIBRATE ON A KNOWN THICKNESS OF THE ACTUAL MATERIAL, and re-calibrate when the material changes. A velocity table is a starting point, not a calibration, because velocity varies with alloy, temperature and grain structure. This is the velocity relation and its consequences. It does not select a transducer, frequency or couplant, address surface preparation, curvature, or high-temperature measurement (velocity falls with temperature, and a hot survey needs its own correction), interpret A-scans, distinguish general wall loss from pitting (a gauge finds the thickness under the probe and a pit between readings is missed entirely), evaluate laminations or inclusions, or determine a retirement limit. API 570, API 653 or the applicable inspection code, the equipment's fitness-for-service assessment, and the certified inspector govern.",
  };
}
export const utThicknessVelocityExample = { inputs: { transit_time_us: 45, gauge_velocity_in_us: 0.232, actual_velocity_in_us: 0.2490, nominal_wall_in: 0.500, retirement_limit_in: 0.190, coating_thickness_in: 0.012 } };
INSPECTION_RENDERERS["ut-thickness-velocity"] = _simpleRenderer({
  citation: "Citation: thickness = velocity × round-trip transit time / 2, the ultrasonic pulse-echo relation. Velocities are ENTERED (steel about 0.232 in/µs, aluminium about 0.2490) because they vary with alloy, temperature and grain structure -- a table is a starting point and not a calibration. The error is a PERCENTAGE and must be evaluated at the wall actually being inspected. Single-echo readings on a coated surface read THICK, in the unsafe direction; echo-to-echo mode removes it. It does not select a transducer or couplant, address curvature or high-temperature measurement, distinguish general loss from pitting, or set a retirement limit. API 570 / API 653 or the applicable code and the certified inspector govern.",
  example: utThicknessVelocityExample.inputs,
  fields: [
    { key: "transit_time_us", label: "Round-trip transit time (µs)", kind: "number", attrs: { step: "any" } },
    { key: "gauge_velocity_in_us", label: "Gauge calibrated velocity (in/µs)", kind: "number", attrs: { step: "any" } },
    { key: "actual_velocity_in_us", label: "Material actual velocity (in/µs, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "nominal_wall_in", label: "Nominal wall being inspected (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "retirement_limit_in", label: "Retirement limit (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "coating_thickness_in", label: "Coating thickness (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "r", id: "utv-out-r", label: "What the gauge reads", value: (r) => r.reading_verdict },
    { key: "m", id: "utv-out-m", label: "Against the real material", value: (r) => r.mismatch_verdict },
    { key: "w", id: "utv-out-w", label: "On the wall inspected", value: (r) => r.nominal_verdict },
    { key: "l", id: "utv-out-l", label: "Against the retirement limit", value: (r) => r.limit_verdict },
    { key: "c", id: "utv-out-c", label: "Coating", value: (r) => r.coating_verdict },
    { key: "n", id: "utv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeUtThicknessVelocity,
});

// =====================================================================
// spec-v1666: radiographic exposure time, distance, unsharpness, and decay.
// =====================================================================
const _RT_IR192_HALF_LIFE_DAYS = 73.83;
const _RT_CO60_HALF_LIFE_DAYS = 1925.3;
// dims: in { base_exposure_s: T, base_distance_in: L, new_distance_in: L, source_size_in: L, material_thickness_in: L, days_elapsed: T, half_life_days: T, unsharpness_limit_in: L } out: { new_exposure_s: T, ug_base_in: L, ug_new_in: L, decay_factor: dimensionless, decayed_exposure_s: T, activity_pct: dimensionless }
export function computeRtExposureTime({
  base_exposure_s = 0, base_distance_in = 0, new_distance_in = 0,
  source_size_in = 0, material_thickness_in = 0,
  days_elapsed = 0, half_life_days = _RT_IR192_HALF_LIFE_DAYS, unsharpness_limit_in = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(base_exposure_s > 0)) return { error: "Base exposure time must be positive (s)." };
  if (!(base_distance_in > 0)) return { error: "Base source-to-film distance must be positive (in)." };
  if (new_distance_in < 0 || source_size_in < 0 || material_thickness_in < 0) return { error: "Distance, source size and material thickness cannot be negative." };
  if (days_elapsed < 0) return { error: "Days elapsed cannot be negative." };
  if (!(half_life_days > 0)) return { error: "Half-life must be positive (days)." };
  if (unsharpness_limit_in < 0) return { error: "The unsharpness limit cannot be negative." };
  const has_new = new_distance_in > 0;
  const distance_ratio = has_new ? new_distance_in / base_distance_in : 1;
  const new_exposure_s = has_new ? base_exposure_s * distance_ratio * distance_ratio : base_exposure_s;
  const distance_verdict = !has_new
    ? "(no new distance entered)"
    : "moving from " + fmt(base_distance_in, 1) + " to " + fmt(new_distance_in, 1) + " in takes the exposure from " + fmt(base_exposure_s, 0) + " to " + fmt(new_exposure_s, 0) + " seconds -- " + fmt(distance_ratio * distance_ratio, 2) + " times, for a " + fmt((distance_ratio - 1) * 100, 0) + "% distance increase. The INVERSE SQUARE is why distance is expensive: intensity falls with the square, so exposure rises with it";
  const has_geometry = source_size_in > 0 && material_thickness_in > 0;
  const ug_base_in = has_geometry ? source_size_in * material_thickness_in / base_distance_in : 0;
  const ug_new_in = has_geometry && has_new ? source_size_in * material_thickness_in / new_distance_in : 0;
  const geometry_verdict = !has_geometry
    ? "(no source size and material thickness entered)"
    : "geometric unsharpness is " + fmt(ug_base_in, 5) + " in at " + fmt(base_distance_in, 1) + " in"
      + (has_new ? " and " + fmt(ug_new_in, 5) + " in at " + fmt(new_distance_in, 1) + " -- a " + fmt((1 - ug_new_in / ug_base_in) * 100, 0) + "% reduction bought with " + fmt(distance_ratio * distance_ratio, 2) + "x the exposure" : "");
  const has_limit = unsharpness_limit_in > 0 && has_geometry;
  const base_passes = has_limit && ug_base_in <= unsharpness_limit_in;
  // The distance the limit actually requires -- the number that decides the shot.
  const distance_for_limit_in = has_limit ? source_size_in * material_thickness_in / unsharpness_limit_in : 0;
  const limit_verdict = !has_limit
    ? "(no unsharpness limit entered -- and whether the extra distance is worth buying depends entirely on it)"
    : base_passes
      ? "the " + fmt(base_distance_in, 1) + " in distance ALREADY meets the " + fmt(unsharpness_limit_in, 5) + " in limit, so it is the right choice and the longer shot buys nothing the code asks for"
      : "the " + fmt(base_distance_in, 1) + " in distance FAILS the " + fmt(unsharpness_limit_in, 5) + " in limit; the minimum distance that meets it is " + fmt(distance_for_limit_in, 1) + " in, which costs " + fmt(Math.pow(distance_for_limit_in / base_distance_in, 2), 2) + "x the exposure";
  const has_decay = days_elapsed > 0;
  const decay_factor = has_decay ? Math.pow(0.5, days_elapsed / half_life_days) : 1;
  const activity_pct = decay_factor * 100;
  const decayed_exposure_s = (has_new ? new_exposure_s : base_exposure_s) / decay_factor;
  const decay_verdict = !has_decay
    ? "(no elapsed time entered -- and a technique sheet used without the decay correction UNDEREXPOSES)"
    : "after " + fmt(days_elapsed, 0) + " days the source is at " + fmt(activity_pct, 1) + "% of its activity (half-life " + fmt(half_life_days, 1) + " days), so the same technique needs " + fmt(decayed_exposure_s, 0) + " seconds instead of " + fmt(has_new ? new_exposure_s : base_exposure_s, 0) + " -- " + fmt(decayed_exposure_s - (has_new ? new_exposure_s : base_exposure_s), 0) + " seconds longer, from nothing but the calendar";
  if (![new_exposure_s, ug_base_in, ug_new_in, decay_factor, decayed_exposure_s, activity_pct].every(Number.isFinite)) return { error: "Radiographic exposure math is not a finite value." };
  return {
    distance_ratio, new_exposure_s, distance_verdict,
    has_geometry, ug_base_in, ug_new_in, geometry_verdict,
    has_limit, base_passes, distance_for_limit_in, limit_verdict,
    has_decay, decay_factor, activity_pct, decayed_exposure_s, decay_verdict,
    note: "Two things that change a radiographic technique when the distance does, and one that changes it when nothing does. Exposure follows the INVERSE SQUARE of source-to-film distance, so a 50 percent increase in distance costs 2.25 times the shot. Geometric unsharpness -- source size times material thickness over distance -- falls only in direct proportion, so the trade is always the same shape: unsharpness improves linearly and exposure worsens quadratically. WHETHER THE LONGER SHOT IS WORTH BUYING DEPENDS ENTIRELY ON THE CODE'S UNSHARPNESS LIMIT FOR THE THICKNESS, and that is the comparison worth making before the shot rather than after. If the short distance already passes, the extra distance buys nothing the code asks for and costs real time on a production radiograph; if it fails, the minimum distance that meets the limit is the number wanted, not an arbitrary increase. SOURCE DECAY IS THE ERROR THAT NEEDS NOTHING TO GO WRONG. An Ir-192 source loses half its activity in about 74 days, so a technique sheet written two months ago and used unchanged underexposes by nearly half -- and the failure mode is a light radiograph that may still be interpreted rather than rejected, which puts a technique fault into an accepted film. Cobalt-60 at about 5.3 years is far more forgiving, and the half-life is entered here so both are covered. This computes time, distance and unsharpness on entered figures. It does not select a source, an energy or a film class, supply an exposure chart or a density requirement, determine the required image quality indicator or its placement, evaluate film density, penetrameter sensitivity or artifacts, address the technique for the geometry (single-wall, double-wall, elliptical), or interpret a radiograph. It is not a radiation safety calculation -- the restricted-area boundary is a separate question. The applicable code section, the written radiographic procedure, and the certified radiographer and interpreter govern.",
  };
}
export const rtExposureTimeExample = { inputs: { base_exposure_s: 60, base_distance_in: 24, new_distance_in: 36, source_size_in: 0.120, material_thickness_in: 0.75, days_elapsed: 60, half_life_days: 73.83, unsharpness_limit_in: 0.0208 } };
INSPECTION_RENDERERS["rt-exposure-time"] = _simpleRenderer({
  citation: "Citation: exposure scales with the INVERSE SQUARE of source-to-film distance (t₂ = t₁ × (d₂/d₁)²), geometric unsharpness Ug = source size × material thickness / distance falls only in direct proportion, and source decay follows 0.5^(days / half-life) -- Ir-192 at 73.83 days, Co-60 at 1,925.3 days, both entered. The unsharpness LIMIT comes from the applicable code section for the thickness and is entered. It does not select a source, energy or film class, supply an exposure chart, determine the image quality indicator or its placement, evaluate density or sensitivity, or interpret a radiograph, and it is NOT a radiation safety calculation. The written procedure and the certified radiographer govern.",
  example: rtExposureTimeExample.inputs,
  fields: [
    { key: "base_exposure_s", label: "Base exposure time (s)", kind: "number", attrs: { step: "any" } },
    { key: "base_distance_in", label: "Base source-to-film distance (in)", kind: "number", attrs: { step: "any" } },
    { key: "new_distance_in", label: "New source-to-film distance (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "source_size_in", label: "Source physical size (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "material_thickness_in", label: "Material thickness (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "unsharpness_limit_in", label: "Code unsharpness limit (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "days_elapsed", label: "Days since the technique was written (0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "half_life_days", label: "Source half-life (days; Ir-192 73.83, Co-60 1925.3)", kind: "number", default: 73.83, attrs: { step: "any" } },
  ],
  outputs: [
    { key: "d", id: "rte-out-d", label: "Moving the distance", value: (r) => r.distance_verdict },
    { key: "u", id: "rte-out-u", label: "Geometric unsharpness", value: (r) => r.geometry_verdict },
    { key: "l", id: "rte-out-l", label: "Against the code limit", value: (r) => r.limit_verdict },
    { key: "s", id: "rte-out-s", label: "Source decay", value: (r) => r.decay_verdict },
    { key: "n", id: "rte-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRtExposureTime,
});

// =====================================================================
// spec-v1667: radiography restricted-area boundary distance.
// =====================================================================
// dims: in { source_activity_ci: dimensionless, gamma_constant_r_h_ci_ft: dimensionless, boundary_limit_mr_h: dimensionless, collimator_attenuation_factor: dimensionless, public_limit_mr_h: dimensionless, shielding_factor: dimensionless } out: { dose_rate_1ft_r_h: dimensionless, boundary_distance_ft: L, collimated_distance_ft: L, public_distance_ft: L, dose_at_boundary_mr_h: dimensionless }
export function computeRtRestrictedArea({
  source_activity_ci = 0, gamma_constant_r_h_ci_ft = 0, boundary_limit_mr_h = 2,
  collimator_attenuation_factor = 0, public_limit_mr_h = 0, shielding_factor = 1,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(source_activity_ci > 0)) return { error: "Source activity must be positive (curies)." };
  if (!(gamma_constant_r_h_ci_ft > 0)) return { error: "The gamma constant must be positive (R/h per curie at 1 ft)." };
  if (!(boundary_limit_mr_h > 0)) return { error: "The boundary dose-rate limit must be positive (mR/h)." };
  if (collimator_attenuation_factor < 0) return { error: "The collimator attenuation factor cannot be negative." };
  if (public_limit_mr_h < 0) return { error: "The public-area limit cannot be negative." };
  if (!(shielding_factor > 0) || shielding_factor > 1) return { error: "The shielding transmission factor must be above 0 and no more than 1." };
  const dose_rate_1ft_r_h = source_activity_ci * gamma_constant_r_h_ci_ft * shielding_factor;
  const _distanceFor = (limit_mr_h, factor) => Math.sqrt(dose_rate_1ft_r_h * factor / (limit_mr_h / 1000));
  const boundary_distance_ft = _distanceFor(boundary_limit_mr_h, 1);
  const source_verdict = "a " + fmt(source_activity_ci, 0) + " Ci source at " + fmt(gamma_constant_r_h_ci_ft, 3) + " R/h per curie at 1 ft gives " + fmt(dose_rate_1ft_r_h, 2) + " R/h at one foot"
    + (shielding_factor < 1 ? " after the " + fmt(shielding_factor, 3) + " shielding transmission factor" : "");
  const boundary_verdict = "the " + fmt(boundary_limit_mr_h, 1) + " mR/h boundary sits at " + fmt(boundary_distance_ft, 0) + " ft in every unshielded direction, which on most job sites is a large area to control";
  const has_collimator = collimator_attenuation_factor > 0 && collimator_attenuation_factor < 1;
  const collimated_distance_ft = has_collimator ? _distanceFor(boundary_limit_mr_h, collimator_attenuation_factor) : 0;
  const collimator_verdict = !has_collimator
    ? "(no collimator attenuation factor entered)"
    : "outside the beam a collimator transmitting " + fmt(collimator_attenuation_factor, 4) + " brings the boundary to " + fmt(collimated_distance_ft, 0) + " ft, " + fmt(boundary_distance_ft / collimated_distance_ft, 1) + " times closer. THE SQUARE ROOT IS WHY COLLIMATION IS WORTH SO MUCH: halving a boundary distance requires cutting the effective activity by a FACTOR OF FOUR, which no practical change to the source will do and a collimator does in every direction outside the beam";
  const has_public = public_limit_mr_h > 0;
  const public_distance_ft = has_public ? _distanceFor(public_limit_mr_h, 1) : 0;
  const public_verdict = !has_public
    ? "(no public-area limit entered)"
    : "at the boundary of an area accessible to the PUBLIC the permitted rate is " + fmt(public_limit_mr_h, 3) + " mR/h and the distance is " + fmt(public_distance_ft, 0) + " ft, " + fmt(public_distance_ft / boundary_distance_ft, 1) + " times the restricted-area figure. A site with an occupied building or a public road near the work is governed by THAT number, not by the restricted-area one";
  const dose_at_boundary_mr_h = boundary_limit_mr_h;
  const survey_verdict = "AND THE CALCULATION IS A STARTING POINT, NOT THE BOUNDARY. The boundary is established with a calibrated survey meter before and during every exposure, because scatter from surrounding structures and the actual shielding geometry make the real field different from a point source in free air -- usually larger in some directions and smaller in others. A rope placed on this number and never surveyed is not a controlled area";
  if (![dose_rate_1ft_r_h, boundary_distance_ft, collimated_distance_ft, public_distance_ft, dose_at_boundary_mr_h].every(Number.isFinite)) return { error: "Boundary distance math is not a finite value." };
  return {
    dose_rate_1ft_r_h, boundary_distance_ft, source_verdict, boundary_verdict,
    has_collimator, collimated_distance_ft, collimator_verdict,
    has_public, public_distance_ft, public_verdict,
    dose_at_boundary_mr_h, survey_verdict,
    note: "How far the restricted-area boundary sits from a radiography source, by the inverse square law. Activity times the gamma constant gives the dose rate at one foot, and the distance at which that falls to a permitted rate is the square root of the ratio -- which is a large number on a job site and the reason radiography shuts work down around it. THE SQUARE ROOT IS THE FACT WORTH CARRYING, because it governs what is worth doing about the boundary. Distance buys protection slowly: halving a boundary requires cutting the effective activity by a factor of four. No practical change to the source does that, and a smaller source means a longer exposure, which is not obviously safer. A COLLIMATOR does it, in every direction outside the beam, which is why collimated shots have a long boundary in one direction and a short one everywhere else and why collimation is the single largest control available. There are two limits and the stricter one governs the site. The restricted-area boundary applies where access is controlled; at the boundary of an area accessible to the PUBLIC the permitted rate is substantially lower and the distance correspondingly further. A job next to an occupied building, a public road, or an adjacent tenant is governed by the public figure, and running the restricted-area number on such a site understates the boundary considerably. Both limits are entered here because they are jurisdictional. AND THE CALCULATION IS A STARTING POINT RATHER THAN THE BOUNDARY ITSELF. The real field is not a point source in free air: scatter from surrounding steel, concrete and the ground makes it larger in some directions, and structures make it smaller in others. The boundary is established and maintained with a calibrated survey meter before and during every exposure, and a rope placed on a calculated number and never surveyed is not a controlled area. This is a point-source inverse-square estimate on entered figures. It does not perform a radiation safety analysis, determine any regulatory limit, size shielding or compute its attenuation, account for scatter, skyshine, or ground reflection, address personnel dosimetry, ALARA planning, exposure duration and total dose, source handling, or the emergency procedures a radiographer works under, or substitute for a survey. 10 CFR Part 34 or the agreement-state equivalent, the licensee's radiation safety officer, and the certified radiographer govern.",
  };
}
export const rtRestrictedAreaExample = { inputs: { source_activity_ci: 60, gamma_constant_r_h_ci_ft: 0.48, boundary_limit_mr_h: 2, collimator_attenuation_factor: 0.05, public_limit_mr_h: 0.5, shielding_factor: 1 } };
INSPECTION_RENDERERS["rt-restricted-area"] = _simpleRenderer({
  citation: "Citation: point-source inverse square -- dose rate at 1 ft = activity × gamma constant, and the boundary distance is √(dose rate at 1 ft / permitted rate). The gamma constant, both dose-rate limits and any collimator or shielding transmission factor are ENTERED because they are source-specific and jurisdictional. This is an ESTIMATE, not the boundary: scatter and real shielding geometry make the actual field differ from a point source in free air, and the boundary is established with a calibrated survey meter before and during every exposure. It does not perform a radiation safety analysis, set any regulatory limit, size shielding, or address dosimetry or emergency procedures. 10 CFR Part 34 or the agreement-state equivalent and the licensee's radiation safety officer govern.",
  example: rtRestrictedAreaExample.inputs,
  fields: [
    { key: "source_activity_ci", label: "Source activity (Ci)", kind: "number", attrs: { step: "any" } },
    { key: "gamma_constant_r_h_ci_ft", label: "Gamma constant (R/h per Ci at 1 ft)", kind: "number", attrs: { step: "any" } },
    { key: "boundary_limit_mr_h", label: "Restricted-area boundary limit (mR/h)", kind: "number", default: 2, attrs: { step: "any" } },
    { key: "public_limit_mr_h", label: "Public-area limit (mR/h, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "collimator_attenuation_factor", label: "Collimator transmission outside the beam (0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "shielding_factor", label: "Shielding transmission factor (1 for none)", kind: "number", default: 1, attrs: { step: "any" } },
  ],
  outputs: [
    { key: "s", id: "rra-out-s", label: "Dose rate at one foot", value: (r) => r.source_verdict },
    { key: "b", id: "rra-out-b", label: "Restricted-area boundary", value: (r) => r.boundary_verdict },
    { key: "c", id: "rra-out-c", label: "With a collimator", value: (r) => r.collimator_verdict },
    { key: "p", id: "rra-out-p", label: "Public-area boundary", value: (r) => r.public_verdict },
    { key: "v", id: "rra-out-v", label: "Survey, not calculate", value: (r) => r.survey_verdict },
    { key: "n", id: "rra-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRtRestrictedArea,
});

// =====================================================================
// spec-v1668: magnetic particle yoke and coil amperage.
// =====================================================================
const _MT_COIL_LOW_FILL_CONSTANT = 45000;
const _MT_COIL_HIGH_FILL_CONSTANT = 35000;
// dims: in { part_diameter_in: L, amps_per_inch: I L^-1, part_length_in: L, coil_turns: dimensionless, yoke_pole_spacing_in: L } out: { circular_amps: I, ld_ratio: dimensionless, coil_amp_turns: I, coil_amps: I, yoke_lift_required_lb: M L T^-2, ld_used: dimensionless }
export function computeMtYokeCoilAmperage({
  part_diameter_in = 0, amps_per_inch = 800, part_length_in = 0, coil_turns = 0,
  fill_factor = "high", yoke_pole_spacing_in = 0, yoke_current = "ac",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(part_diameter_in > 0)) return { error: "Part diameter must be positive (in)." };
  if (!(amps_per_inch > 0)) return { error: "Amperes per inch must be positive." };
  if (part_length_in < 0 || coil_turns < 0 || yoke_pole_spacing_in < 0) return { error: "Part length, coil turns and pole spacing cannot be negative." };
  // Circular field: a central conductor or head shot, at amps per inch of diameter.
  const circular_amps = part_diameter_in * amps_per_inch;
  const circular_verdict = "a central conductor or head shot on a " + fmt(part_diameter_in, 2) + " in diameter at " + fmt(amps_per_inch, 0) + " A per inch is " + fmt(circular_amps, 0) + " A. That produces a CIRCULAR field, which finds LONGITUDINAL discontinuities -- cracks running along the part's axis";
  const has_coil = part_length_in > 0 && coil_turns > 0;
  // L/D is capped at 15 and floored at 2 by the standard formulae.
  const ld_raw = has_coil ? part_length_in / part_diameter_in : 0;
  const ld_used = has_coil ? Math.min(15, Math.max(2, ld_raw)) : 0;
  const ld_clamped = has_coil && Math.abs(ld_used - ld_raw) > 1e-12;
  const is_high_fill = fill_factor === "high";
  const fill_constant = is_high_fill ? _MT_COIL_HIGH_FILL_CONSTANT : _MT_COIL_LOW_FILL_CONSTANT;
  const coil_amp_turns = has_coil ? fill_constant / (ld_used + 2) : 0;
  const coil_amps = has_coil ? coil_amp_turns / coil_turns : 0;
  const coil_verdict = !has_coil
    ? "(no part length and coil turns entered)"
    : "a coil shot at an L/D of " + fmt(ld_used, 2) + (ld_clamped ? " (clamped from " + fmt(ld_raw, 2) + "; the formulae hold between 2 and 15)" : "") + " and a " + (is_high_fill ? "high" : "low") + " fill factor needs " + fmt(coil_amp_turns, 0) + " amp-turns, which at " + fmt(coil_turns, 0) + " turns is " + fmt(coil_amps, 0) + " A";
  // The trap that makes an inspection an inspection for ONE orientation.
  const orientation_verdict = !has_coil
    ? "A circular field finds LONGITUDINAL cracks and is blind to transverse ones. An inspection performed with one shot has inspected for ONE crack orientation, and reporting it as an inspection of the part is wrong -- finding the other requires a second, separate shot in the other field direction"
    : "THE ORIENTATION TRAP. The coil shot produces a LONGITUDINAL field, which finds TRANSVERSE discontinuities -- cracks running around the part. A longitudinal crack running along the axis produces no leakage field in that shot and will not indicate, no matter how strong the field or how good the particles. Finding it requires the CIRCULAR field above, and that is a second, separate inspection. One shot inspects for one crack orientation, and reporting it as an inspection of the part is wrong";
  const has_yoke = yoke_pole_spacing_in > 0;
  const is_dc = yoke_current === "dc";
  const yoke_lift_required_lb = has_yoke ? (is_dc ? 40 : 10) : 0;
  const yoke_verdict = !has_yoke
    ? "(no yoke pole spacing entered)"
    : "a yoke at its maximum " + fmt(yoke_pole_spacing_in, 1) + " in pole spacing must lift " + fmt(yoke_lift_required_lb, 0) + " lb on " + (is_dc ? "DC" : "AC") + ". A yoke that will not is producing an inadequate field, and the check takes ten seconds at the start of the shift. The yoke also produces a LONGITUDINAL field between its poles, so it too finds only the discontinuities transverse to that line -- which is why a yoke inspection is run in two directions roughly at right angles";
  const adequacy_verdict = "AND FIELD ADEQUACY IS VERIFIED WITH A GAUSS METER OR A QUANTITATIVE QUALITY INDICATOR, NOT BY THE AMPERAGE SETTING. The amperage here is a starting point that gets a field of roughly the right magnitude into a part of roughly this shape; the actual field depends on geometry, permeability and the current path, and the artifact shim or field indicator is what says whether it arrived where the inspection needs it";
  if (![circular_amps, ld_used, coil_amp_turns, coil_amps, yoke_lift_required_lb].every(Number.isFinite)) return { error: "Magnetic particle amperage math is not a finite value." };
  return {
    circular_amps, circular_verdict, is_high_fill, is_dc,
    has_coil, ld_raw, ld_used, ld_clamped, coil_amp_turns, coil_amps, coil_verdict,
    orientation_verdict, has_yoke, yoke_lift_required_lb, yoke_verdict, adequacy_verdict,
    note: "The starting amperage for a magnetic particle examination, and the reason the number is the least important part of it. A circular field from a central conductor or head shot runs at amperes per inch of diameter; a coil shot runs on amp-turns from the part's length-to-diameter ratio and the fill factor, and dividing by the turns gives the current. Both are conventions that get a field of roughly the right magnitude into a part of roughly the right shape. THE ORIENTATION TRAP IS WHAT MAKES THIS WORTH A CALCULATION AT ALL. A magnetic particle indication appears where a discontinuity interrupts the field, so a crack lying PARALLEL to the field lines produces no leakage and does not indicate -- at any amperage, with any particles, under any light. A circular field finds longitudinal cracks; a longitudinal field, from a coil or between the poles of a yoke, finds transverse ones. An examination performed with a single shot has examined the part for a single crack orientation, and a report describing it as an examination of the part is wrong. Two shots roughly at right angles are what an examination is, and that is a procedure requirement rather than a refinement. The L/D ratio is bounded in the standard formulae between 2 and 15 and is clamped here, because outside that range the coil relations do not apply and a part shorter than twice its diameter needs a different technique or an extension. Fill factor changes the constant substantially, so a part loosely centred in a large coil and one nearly filling it are different shots. The yoke lift check is the field tool most people actually use and the fastest verification in NDT: at maximum pole spacing a yoke must lift 10 lb on AC or 40 lb on DC, and one that will not is producing an inadequate field regardless of what its label says. FIELD ADEQUACY IS VERIFIED WITH A GAUSS METER OR A QUANTITATIVE QUALITY INDICATOR RATHER THAN BY THE AMPERAGE SETTING, because the actual field depends on the geometry, the permeability and the current path in ways no formula captures. This computes starting currents from entered figures. It does not write a technique or a procedure, select particles, wet or dry method, contrast or fluorescent, address lighting, viewing conditions, or demagnetisation, evaluate or classify indications, determine acceptance criteria, handle multidirectional or induced-current techniques, or address the arc-strike and part-damage risks of prod or head-shot contact. ASTM E1444, ASTM E709 or the applicable code and procedure, and the certified Level II or III examiner, govern.",
  };
}
export const mtYokeCoilAmperageExample = { inputs: { part_diameter_in: 6, amps_per_inch: 800, part_length_in: 36, coil_turns: 5, fill_factor: "high", yoke_pole_spacing_in: 6, yoke_current: "ac" } };
INSPECTION_RENDERERS["mt-yoke-coil-amperage"] = _simpleRenderer({
  citation: "Citation: circular field current = part diameter × amperes per inch (commonly 300 to 800 A/in, entered); coil shot amp-turns = 35,000 / (L/D + 2) at high fill factor or 45,000 / (L/D + 2) at low, with L/D bounded between 2 and 15 as the standard formulae require; and the yoke lift check of 10 lb on AC or 40 lb on DC at maximum pole spacing. A circular field finds LONGITUDINAL discontinuities and a longitudinal field finds TRANSVERSE ones, so one shot examines one orientation. Field adequacy is verified with a gauss meter or quantitative quality indicator, not by the amperage. It does not write a technique, select particles or lighting, evaluate indications, or set acceptance criteria. ASTM E1444 / E709 and the certified examiner govern.",
  example: mtYokeCoilAmperageExample.inputs,
  fields: [
    { key: "part_diameter_in", label: "Part diameter (in)", kind: "number", attrs: { step: "any" } },
    { key: "amps_per_inch", label: "Amperes per inch of diameter", kind: "number", default: 800, attrs: { step: "any" } },
    { key: "part_length_in", label: "Part length for a coil shot (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "coil_turns", label: "Coil turns (0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "fill_factor", label: "Fill factor", kind: "select", default: "high", options: [{ value: "high", label: "High (part nearly fills the coil)" }, { value: "low", label: "Low (part loose in the coil)" }] },
    { key: "yoke_pole_spacing_in", label: "Yoke maximum pole spacing (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "yoke_current", label: "Yoke current", kind: "select", default: "ac", options: [{ value: "ac", label: "AC (lift 10 lb)" }, { value: "dc", label: "DC or permanent (lift 40 lb)" }] },
  ],
  outputs: [
    { key: "c", id: "myc-out-c", label: "Circular field shot", value: (r) => r.circular_verdict },
    { key: "l", id: "myc-out-l", label: "Coil shot", value: (r) => r.coil_verdict },
    { key: "o", id: "myc-out-o", label: "The orientation trap", value: (r) => r.orientation_verdict },
    { key: "y", id: "myc-out-y", label: "Yoke lift check", value: (r) => r.yoke_verdict },
    { key: "a", id: "myc-out-a", label: "How adequacy is verified", value: (r) => r.adequacy_verdict },
    { key: "n", id: "myc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMtYokeCoilAmperage,
});

// =====================================================================
// spec-v1669: liquid penetrant dwell and development time.
// =====================================================================
// dims: in { penetration_dwell_min: T, development_dwell_min: T, evaluation_window_start_min: T, evaluation_window_end_min: T, evaluation_at_min: T, part_temp_f: T, min_procedure_temp_f: T, max_procedure_temp_f: T } out: { total_process_min: T, dwell_margin_min: T, evaluation_margin_min: T }
export function computePtDwellDevelopment({
  penetration_dwell_min = 0, development_dwell_min = 0,
  evaluation_window_start_min = 10, evaluation_window_end_min = 60, evaluation_at_min = 0,
  part_temp_f = 70, min_procedure_temp_f = 40, max_procedure_temp_f = 125,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(penetration_dwell_min > 0)) return { error: "Penetration dwell must be positive (minutes)." };
  if (!(development_dwell_min > 0)) return { error: "Development dwell must be positive (minutes)." };
  if (!(evaluation_window_end_min > evaluation_window_start_min)) return { error: "The evaluation window must end after it starts." };
  if (evaluation_window_start_min < 0 || evaluation_at_min < 0) return { error: "Evaluation times cannot be negative." };
  if (!(max_procedure_temp_f > min_procedure_temp_f)) return { error: "The procedure's temperature range must have a maximum above its minimum." };
  const total_process_min = penetration_dwell_min + development_dwell_min;
  const dwell_verdict = "penetration dwell " + fmt(penetration_dwell_min, 0) + " min plus development " + fmt(development_dwell_min, 0) + " min is " + fmt(total_process_min, 0) + " minutes of process time before anything can be read";
  // The dwell is chosen for the DISCONTINUITY, not for the part.
  const dwell_class_verdict = penetration_dwell_min < 10
    ? "A dwell under 10 minutes is a CASTING or forging row figure -- for wide, open discontinuities. Applied to a tight service-induced crack it does not let the penetrant enter, and the part shows clean: the examination is performed, documented, and finds nothing, and the crack is still there. THE DWELL IS CHOSEN FOR THE DISCONTINUITY TYPE, NOT FOR THE PART"
    : penetration_dwell_min < 20
      ? "A dwell of " + fmt(penetration_dwell_min, 0) + " minutes is mid-range. Tight service-induced cracks want the LONG end of the procedure's range, commonly 20 to 30 minutes, because the penetrant has to enter a crack that may be closed at the surface. The dwell is chosen for the DISCONTINUITY TYPE, not for the part"
      : "A dwell of " + fmt(penetration_dwell_min, 0) + " minutes is at the long end, which is what tight service-induced cracks need -- and the failure mode this avoids is silent: a short dwell taken from a casting row lets the part show clean while the crack is still there";
  const has_evaluation = evaluation_at_min > 0;
  const in_window = has_evaluation && evaluation_at_min >= evaluation_window_start_min && evaluation_at_min <= evaluation_window_end_min;
  const evaluation_margin_min = has_evaluation
    ? (evaluation_at_min < evaluation_window_start_min ? evaluation_at_min - evaluation_window_start_min : evaluation_window_end_min - evaluation_at_min)
    : 0;
  const evaluation_verdict = !has_evaluation
    ? "(no evaluation time entered -- the window, commonly " + fmt(evaluation_window_start_min, 0) + " to " + fmt(evaluation_window_end_min, 0) + " minutes after developer, is WHEN the examination is valid)"
    : in_window
      ? "evaluating at " + fmt(evaluation_at_min, 0) + " minutes is inside the " + fmt(evaluation_window_start_min, 0) + " to " + fmt(evaluation_window_end_min, 0) + " minute window, with " + fmt(Math.abs(evaluation_margin_min), 0) + " minutes before it closes"
      : evaluation_at_min < evaluation_window_start_min
        ? "evaluating at " + fmt(evaluation_at_min, 0) + " minutes is TOO EARLY by " + fmt(evaluation_window_start_min - evaluation_at_min, 0) + " minutes: indications are still forming and small ones have not appeared yet"
        : "evaluating at " + fmt(evaluation_at_min, 0) + " minutes is TOO LATE by " + fmt(evaluation_at_min - evaluation_window_end_min, 0) + " minutes: the bleed-out has blurred and its size no longer relates to the discontinuity that produced it";
  const in_temp_range = part_temp_f >= min_procedure_temp_f && part_temp_f <= max_procedure_temp_f;
  const temp_verdict = in_temp_range
    ? "at " + fmt(part_temp_f, 0) + " degF the part is inside the procedure's " + fmt(min_procedure_temp_f, 0) + " to " + fmt(max_procedure_temp_f, 0) + " degF range"
    : "at " + fmt(part_temp_f, 0) + " degF the part is OUTSIDE the procedure's " + fmt(min_procedure_temp_f, 0) + " to " + fmt(max_procedure_temp_f, 0) + " degF range. The method must be QUALIFIED at that temperature -- a comparator block demonstration against a known cracked specimen -- before any result from it means anything. Running it anyway produces a clean report of unknown value";
  const drying_verdict = "AND THE DRYING FAILURE IS EQUALLY SILENT. If the part sits in sun or wind and the penetrant dries during a " + fmt(penetration_dwell_min, 0) + " minute dwell, no amount of correct developing will bring it back out of the discontinuity. Keeping the surface wet -- reapplying penetrant during a long dwell where the procedure allows it -- is what prevents it, and a long dwell in the open air is exactly where it happens";
  const dwell_margin_min = penetration_dwell_min - 10;
  if (![total_process_min, dwell_margin_min, evaluation_margin_min].every(Number.isFinite)) return { error: "Penetrant dwell math is not a finite value." };
  return {
    total_process_min, dwell_verdict, dwell_class_verdict,
    has_evaluation, in_window, evaluation_margin_min, evaluation_verdict,
    in_temp_range, temp_verdict, drying_verdict, dwell_margin_min,
    note: "The three times a liquid penetrant examination turns on. Getting any of them wrong produces a clean report, not an obvious failure. That is what makes penetrant worth a checklist: every error here is silent. THE PENETRATION DWELL IS CHOSEN FOR THE DISCONTINUITY TYPE, NOT FOR THE PART. A tight service-induced fatigue crack may be nearly closed at the surface and wants the long end of the procedure's range; a casting's gas porosity is wide open and needs far less. A five-minute dwell taken from a casting row and applied to a fatigue crack does not let the penetrant enter, and the part shows clean -- examined, documented, and found sound, with the crack still in it. THE EVALUATION WINDOW IS WHEN THE EXAMINATION IS VALID, not merely when it is convenient. Indications grow after developer is applied, so looking too early misses ones still forming, and looking too late finds bleed-out that has spread until its size no longer relates to the discontinuity that produced it. Both ends matter, and a part read outside the window has not been examined to the procedure. Two failures do not appear in any of the times. The first is DRYING: a part left in sun or wind during a long dwell can have its penetrant dry in place, and once it has, no amount of correct developing brings it back out. Keeping the surface wet through the dwell is what prevents it, and a long dwell outdoors is precisely where it happens. The second is TEMPERATURE: outside the procedure's stated range the method has to be qualified at the temperature with a comparator block against a known cracked specimen, because penetrant viscosity and capillary action change enough that the standard times no longer mean what they say. This tracks times against an entered procedure. It does not select a penetrant type, sensitivity level, or removal method, address surface preparation and pre-cleaning (which is where most penetrant examinations are actually lost -- a blasted or machined surface can close the very discontinuities being looked for), specify emulsification or rinse, evaluate or classify indications, distinguish relevant from non-relevant, or set acceptance criteria. ASTM E1417, ASME Section V Article 6 or the applicable code and the written procedure, and the certified Level II examiner, govern.",
  };
}
export const ptDwellDevelopmentExample = { inputs: { penetration_dwell_min: 25, development_dwell_min: 10, evaluation_window_start_min: 10, evaluation_window_end_min: 60, evaluation_at_min: 20, part_temp_f: 70, min_procedure_temp_f: 40, max_procedure_temp_f: 125 } };
INSPECTION_RENDERERS["pt-dwell-development"] = _simpleRenderer({
  citation: "Citation: penetration dwell, development dwell and the evaluation window as ASTM E1417 and ASME Section V Article 6 practice state them -- all ENTERED from the written procedure, because the dwell is selected for the DISCONTINUITY TYPE (tight service cracks want the long end, commonly 20 to 30 minutes; open casting porosity needs far less) and the window (commonly 10 to 60 minutes after developer) is when the examination is valid. Outside the procedure's temperature range the method must be qualified at temperature with a comparator block. It does not select a penetrant or removal method, address pre-cleaning, evaluate indications, or set acceptance criteria. The written procedure and the certified examiner govern.",
  example: ptDwellDevelopmentExample.inputs,
  fields: [
    { key: "penetration_dwell_min", label: "Penetration dwell (min)", kind: "number", attrs: { step: "any" } },
    { key: "development_dwell_min", label: "Development dwell before reading (min)", kind: "number", attrs: { step: "any" } },
    { key: "evaluation_window_start_min", label: "Evaluation window opens (min after developer)", kind: "number", default: 10, attrs: { step: "any" } },
    { key: "evaluation_window_end_min", label: "Evaluation window closes (min)", kind: "number", default: 60, attrs: { step: "any" } },
    { key: "evaluation_at_min", label: "Actually evaluated at (min, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "part_temp_f", label: "Part temperature (°F)", kind: "number", default: 70, attrs: { step: "any" } },
    { key: "min_procedure_temp_f", label: "Procedure minimum temperature (°F)", kind: "number", default: 40, attrs: { step: "any" } },
    { key: "max_procedure_temp_f", label: "Procedure maximum temperature (°F)", kind: "number", default: 125, attrs: { step: "any" } },
  ],
  outputs: [
    { key: "d", id: "ptd-out-d", label: "Process time", value: (r) => r.dwell_verdict },
    { key: "c", id: "ptd-out-c", label: "Is the dwell right for the crack", value: (r) => r.dwell_class_verdict },
    { key: "e", id: "ptd-out-e", label: "Evaluation window", value: (r) => r.evaluation_verdict },
    { key: "t", id: "ptd-out-t", label: "Temperature", value: (r) => r.temp_verdict },
    { key: "y", id: "ptd-out-y", label: "The drying failure", value: (r) => r.drying_verdict },
    { key: "n", id: "ptd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePtDwellDevelopment,
});

// =====================================================================
// spec-v1670: hardness conversion and estimated tensile strength.
// =====================================================================
// dims: in { brinell_hb: dimensionless, tensile_coefficient_ksi_per_hb: dimensionless, actual_uts_ksi: M L^-1 T^-2, case_hardness_hb: dimensionless, core_hardness_hb: dimensionless } out: { estimated_uts_ksi: M L^-1 T^-2, case_estimated_uts_ksi: M L^-1 T^-2, core_estimated_uts_ksi: M L^-1 T^-2, overstatement_pct: dimensionless, estimate_error_pct: dimensionless }
export function computeHardnessTensileConversion({
  brinell_hb = 0, tensile_coefficient_ksi_per_hb = 0.50, actual_uts_ksi = 0,
  case_hardness_hb = 0, core_hardness_hb = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(brinell_hb > 0)) return { error: "Brinell hardness must be positive (HB)." };
  if (!(tensile_coefficient_ksi_per_hb > 0)) return { error: "The tensile coefficient must be positive (ksi per HB)." };
  if (actual_uts_ksi < 0 || case_hardness_hb < 0 || core_hardness_hb < 0) return { error: "Actual strength and case or core hardness cannot be negative." };
  const estimated_uts_ksi = brinell_hb * tensile_coefficient_ksi_per_hb;
  const estimate_verdict = fmt(brinell_hb, 0) + " HB at " + fmt(tensile_coefficient_ksi_per_hb, 3) + " ksi per HB estimates " + fmt(estimated_uts_ksi, 0) + " ksi. The correlation is a STEEL relationship and it tracks well across the range from mild structural steel to quenched and tempered grades, which is why it is used as a confirmation that material is what the certificate says";
  const has_actual = actual_uts_ksi > 0;
  const estimate_error_pct = has_actual ? (estimated_uts_ksi - actual_uts_ksi) / actual_uts_ksi * 100 : 0;
  const actual_verdict = !has_actual
    ? "(no measured tensile strength entered)"
    : "against a measured " + fmt(actual_uts_ksi, 0) + " ksi the estimate is " + fmt(Math.abs(estimate_error_pct), 1) + "% " + (estimate_error_pct > 0 ? "high" : "low");
  const outside_steel_verdict = "OUTSIDE STEEL THE COEFFICIENT IS DIFFERENT AND SOMETIMES THERE IS NO CORRELATION AT ALL. Aluminium alloys need their own coefficient and it varies between them; austenitic stainless work-hardens at the indentation and reads high; grey cast iron's graphite structure makes the relationship unreliable in a way that has no fixed direction. Applying the steel rule outside steel gives numbers that are sometimes close and sometimes badly wrong, with nothing in the reading to say which";
  // The surface trap: a case reading used as a section property.
  const has_case = case_hardness_hb > 0 && core_hardness_hb > 0;
  const case_estimated_uts_ksi = has_case ? case_hardness_hb * tensile_coefficient_ksi_per_hb : 0;
  const core_estimated_uts_ksi = has_case ? core_hardness_hb * tensile_coefficient_ksi_per_hb : 0;
  const overstatement_pct = has_case && core_estimated_uts_ksi > 0
    ? (case_estimated_uts_ksi / core_estimated_uts_ksi - 1) * 100 : 0;
  const surface_verdict = !has_case
    ? "(no case and core hardness entered -- and the surface trap is the error that matters most on a hardened part)"
    : "THE SURFACE TRAP. A case reading of " + fmt(case_hardness_hb, 0) + " HB converts to " + fmt(case_estimated_uts_ksi, 0) + " ksi and a core of " + fmt(core_hardness_hb, 0) + " HB to " + fmt(core_estimated_uts_ksi, 0) + " ksi -- using the surface figure as the part's strength overstates it by " + fmt(overstatement_pct, 0) + "%. The case is thin and the CORE carries the load, so a carburised or induction-hardened part must be read on a prepared section or on an unhardened area, and a surface reading converted to strength is not a section property";
  const method_verdict = "AND CONVERSION BETWEEN HARDNESS SCALES IS ITSELF APPROXIMATE. The published tables are empirical, material-dependent, and diverge at the extremes of each scale, so a Rockwell reading converted to Brinell and then to tensile carries two approximations before the third. Where the strength matters, a tensile test is the measurement and this is the screen";
  if (![estimated_uts_ksi, case_estimated_uts_ksi, core_estimated_uts_ksi, overstatement_pct, estimate_error_pct].every(Number.isFinite)) return { error: "Hardness conversion math is not a finite value." };
  return {
    estimated_uts_ksi, estimate_verdict, has_actual, estimate_error_pct, actual_verdict,
    outside_steel_verdict, has_case, case_estimated_uts_ksi, core_estimated_uts_ksi,
    overstatement_pct, surface_verdict, method_verdict,
    note: "The tensile strength a hardness reading implies. For steel it is a constant times the Brinell number; for anything else it is a different question. The relationship tracks well across steels from mild structural grades to quenched and tempered ones, and its real use is confirmation rather than design: it says whether the material in front of you is plausibly what the certificate claims, on a test that takes a minute and does not consume the part. THE CORRELATION IS A STEEL RELATIONSHIP. Aluminium alloys need their own coefficient, and it differs between them; austenitic stainless work-hardens under the indenter and reads high; grey cast iron's graphite structure makes the correlation unreliable with no consistent direction. Applying the steel coefficient outside steel produces numbers that are sometimes nearly right and sometimes badly wrong, and nothing in the reading distinguishes the two cases -- which is why the coefficient is entered here rather than assumed. THE SURFACE TRAP IS THE ERROR THAT MATTERS MOST. A carburised, nitrided or induction-hardened part has a hard, thin case over a much softer core, and a hardness reading taken on the surface describes the case only. Converting it to a tensile strength and using that as the part's strength overstates the load-carrying capacity substantially, because the case is thin and the core carries the load. Reading a prepared section, or reading an unhardened area, is what gives a number that means something about the part. A hardness reading is a SURFACE property and a tensile strength is a SECTION property, and the conversion does not cross that gap. Conversion between hardness scales is itself approximate. The published tables are empirical, depend on the material, and diverge at the ends of each scale, so a Rockwell reading converted to Brinell and then to tensile has accumulated two approximations before the third is applied. This is a screening estimate on an entered coefficient. It does not perform a scale conversion, supply a coefficient for any material, estimate yield strength (which does not follow hardness the way tensile does and varies far more with processing), address ductility, toughness, or fatigue strength -- none of which hardness predicts, and the last of which a hard surface can reduce -- identify an alloy, evaluate case depth, or substitute for a tensile test or a material certificate. ASTM E140 for conversions, ASTM A370 for the steel relationship, the material specification, and a laboratory tensile test govern.",
  };
}
export const hardnessTensileConversionExample = { inputs: { brinell_hb: 200, tensile_coefficient_ksi_per_hb: 0.50, actual_uts_ksi: 0, case_hardness_hb: 650, core_hardness_hb: 285 } };
INSPECTION_RENDERERS["hardness-tensile-conversion"] = _simpleRenderer({
  citation: "Citation: the ASTM A370 approximate relationship between Brinell hardness and tensile strength for STEEL, with the coefficient ENTERED (about 0.50 ksi per HB for steel) because it differs outside steel -- aluminium alloys need their own, austenitic stainless work-hardens at the indentation and reads high, and grey cast iron's graphite structure makes the correlation unreliable. A hardness reading is a SURFACE property and a tensile strength is a SECTION property; on a case-hardened part the surface figure overstates the load-carrying capacity substantially. It does not convert between hardness scales, estimate yield strength, address ductility, toughness or fatigue, or substitute for a tensile test. ASTM E140, ASTM A370 and the material specification govern.",
  example: hardnessTensileConversionExample.inputs,
  fields: [
    { key: "brinell_hb", label: "Brinell hardness (HB)", kind: "number", attrs: { step: "any" } },
    { key: "tensile_coefficient_ksi_per_hb", label: "Coefficient (ksi per HB; steel ≈ 0.50)", kind: "number", default: 0.50, attrs: { step: "any" } },
    { key: "actual_uts_ksi", label: "Measured tensile strength (ksi, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "case_hardness_hb", label: "Case surface hardness (HB, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "core_hardness_hb", label: "Core hardness (HB, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "e", id: "htc-out-e", label: "Estimated tensile", value: (r) => r.estimate_verdict },
    { key: "a", id: "htc-out-a", label: "Against a measured value", value: (r) => r.actual_verdict },
    { key: "s", id: "htc-out-s", label: "The surface trap", value: (r) => r.surface_verdict },
    { key: "o", id: "htc-out-o", label: "Outside steel", value: (r) => r.outside_steel_verdict },
    { key: "m", id: "htc-out-m", label: "The conversion itself", value: (r) => r.method_verdict },
    { key: "n", id: "htc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHardnessTensileConversion,
});

// =====================================================================
// spec-v1671: carburizing case depth and time at temperature.
// =====================================================================
// The rate constant k has dimensions of length over the square root of time,
// which the dimensional lint's integer-exponent grammar cannot express -- and
// "inches per root hour" is not a figure any heat treater quotes anyway. So k
// is DERIVED from a reference case a shop actually has: a known depth reached
// in a known time on its own cycle. Both are ordinary lengths and times.
// dims: in { reference_case_in: L, reference_time_hr: T, time_hr: T, target_case_in: L, hotter_reference_case_in: L } out: { case_depth_in: L, time_for_target_hr: T, time_ratio: dimensionless, depth_ratio: dimensionless, hotter_time_hr: T }
export function computeCarburizingCaseDepth({
  reference_case_in = 0, reference_time_hr = 0, time_hr = 0, target_case_in = 0,
  hotter_reference_case_in = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(reference_case_in > 0)) return { error: "The reference case depth must be positive (in)." };
  if (!(reference_time_hr > 0)) return { error: "The reference time must be positive (hours)." };
  if (!(time_hr > 0)) return { error: "Time at temperature must be positive (hours)." };
  if (target_case_in < 0 || hotter_reference_case_in < 0) return { error: "Target case and the hotter-cycle reference case cannot be negative." };
  // Diffusion is PARABOLIC: case depth goes with the square root of time, so
  // one reference point fixes the whole curve.
  const _k = reference_case_in / Math.sqrt(reference_time_hr);
  const case_depth_in = _k * Math.sqrt(time_hr);
  const depth_verdict = "from a reference of " + fmt(reference_case_in, 4) + " in in " + fmt(reference_time_hr, 1) + " hours, " + fmt(time_hr, 1) + " hours gives a case of " + fmt(case_depth_in, 4) + " in -- " + fmt(case_depth_in * 1000, 0) + " thousandths";
  const has_target = target_case_in > 0;
  const time_for_target_hr = has_target ? Math.pow(target_case_in / _k, 2) : 0;
  const depth_ratio = has_target ? target_case_in / case_depth_in : 0;
  const time_ratio = has_target ? time_for_target_hr / time_hr : 0;
  const target_verdict = !has_target
    ? "(no target case depth entered -- and the square root is what makes a deeper case expensive)"
    : "reaching " + fmt(target_case_in, 4) + " in takes " + fmt(time_for_target_hr, 1) + " hours, " + fmt(time_ratio, 2) + " times the " + fmt(time_hr, 1) + " hour cycle for " + fmt(depth_ratio, 2) + " times the case. DIFFUSION IS PARABOLIC: depth goes with the SQUARE ROOT of time, so doubling a case quadruples the cycle -- and on a batch furnace that is the difference between two loads a day and one load every day and a half";
  const has_hotter = hotter_reference_case_in > 0;
  const _kHot = has_hotter ? hotter_reference_case_in / Math.sqrt(reference_time_hr) : 0;
  const hotter_time_hr = has_hotter && has_target ? Math.pow(target_case_in / _kHot, 2) : 0;
  const temperature_verdict = !(has_hotter && has_target)
    ? "(no hotter-cycle reference case and target entered -- the temperature lever works by moving the whole curve)"
    : "at a higher carburising temperature, where the same " + fmt(reference_time_hr, 1) + " hour reference reaches " + fmt(hotter_reference_case_in, 4) + " in instead of " + fmt(reference_case_in, 4) + ", the " + fmt(target_case_in, 4) + " in case takes " + fmt(hotter_time_hr, 1) + " hours instead of " + fmt(time_for_target_hr, 1) + " -- " + fmt((1 - hotter_time_hr / time_for_target_hr) * 100, 0) + "% less. THE COSTS ARE GRAIN COARSENING, more distortion to correct in grinding, and shorter fixture and furnace life, so it is a trade a heat treater makes deliberately rather than a free saving";
  const specification_verdict = "AND THE SPECIFICATION TRAP. 'Case depth 0.030 in' is ambiguous: EFFECTIVE case depth, measured to a stated hardness such as 50 HRC, and TOTAL case depth, measured to where the case is metallurgically indistinguishable from the core, are different numbers on the same part, and the total is always the larger. A supplier quoting to one and a customer inspecting to the other disagree about a part that is exactly as specified, and the drawing has to say which -- along with the hardness the effective depth is measured to, because that changes the number as well";
  if (![case_depth_in, time_for_target_hr, time_ratio, depth_ratio, hotter_time_hr].every(Number.isFinite)) return { error: "Case depth math is not a finite value." };
  return {
    case_depth_in, depth_verdict, has_target, time_for_target_hr, depth_ratio, time_ratio, target_verdict,
    has_hotter, hotter_time_hr, temperature_verdict, specification_verdict,
    note: "How deep a carburised case gets in a given time, and why a deeper case costs so much more than it looks. Carbon diffuses into steel parabolically -- depth goes with the SQUARE ROOT of time -- so one reference point fixes the whole curve, and the inversion squares. Doubling a case QUADRUPLES the cycle. On a batch furnace that is the difference between two loads a day and one load every day and a half, and it is the reason a drawing calling for a deep case is a scheduling decision as much as a metallurgical one. The curve is set here by a REFERENCE CASE a shop already has -- a known depth reached in a known time on its own cycle -- rather than by a published rate constant, because the constant depends strongly on temperature, on the carbon potential of the atmosphere and on the steel, and a figure for one combination does not transfer to another. A shop's own last run is better data than any table. THE TEMPERATURE LEVER IS REAL AND IT IS NOT FREE. Raising the carburising temperature moves the whole curve up, so the same case is reached in far less time -- at the cost of grain coarsening, more distortion to correct in grinding afterwards, and shorter fixture and furnace life. It is a trade a heat treater makes deliberately, and a shop that reaches for it to recover a schedule pays for it in the grinding department. THE SPECIFICATION TRAP IS WHERE SUPPLIER AND CUSTOMER DISAGREE ABOUT A CORRECT PART. 'Case depth 0.030 in' does not say whether it is EFFECTIVE case depth, measured to a stated hardness, or TOTAL case depth, measured to where the case is indistinguishable from the core. They are different numbers on the same part and the total is always larger, so a supplier quoting to one and a customer inspecting to the other will disagree about a part that meets the intent exactly. The drawing has to state which, and for an effective depth it has to state the hardness as well, because that changes the number too. This is the parabolic diffusion relation fitted to an entered reference. It does not supply that reference for any temperature, atmosphere or steel, model carbon potential, boost-and-diffuse cycles, or the surface carbon concentration, predict the hardness profile or the resulting hardness at any depth (which depends on the quench as much as on the carburising), address distortion, grinding stock, or the retained austenite a high surface carbon produces, or cover nitriding or carbonitriding, which follow different kinetics. The heat treater's own process data, the applicable process standard, and the metallurgist govern.",
  };
}
export const carburizingCaseDepthExample = { inputs: { reference_case_in: 0.0707, reference_time_hr: 8, time_hr: 8, target_case_in: 0.1414, hotter_reference_case_in: 0.0990 } };
INSPECTION_RENDERERS["carburizing-case-depth"] = _simpleRenderer({
  citation: "Citation: the parabolic diffusion relation case depth = k × √(time), inverted as time = (depth / k)², with k fitted from a REFERENCE case a shop already has -- a known depth reached in a known time on its own cycle. The reference is entered rather than a published rate constant because k depends strongly on carburising temperature, on the atmosphere's carbon potential and on the steel, and a figure for one combination does not transfer to another. Depth goes with the SQUARE ROOT of time, so doubling a case quadruples the cycle. It does not supply that reference, model carbon potential or boost-and-diffuse cycles, predict the hardness profile (which depends on the quench), address distortion or retained austenite, or cover nitriding or carbonitriding. The heat treater's process data and the metallurgist govern.",
  example: carburizingCaseDepthExample.inputs,
  fields: [
    { key: "reference_case_in", label: "Reference case depth achieved (in)", kind: "number", attrs: { step: "any" } },
    { key: "reference_time_hr", label: "…in this many hours", kind: "number", attrs: { step: "any" } },
    { key: "time_hr", label: "Time at temperature to evaluate (h)", kind: "number", attrs: { step: "any" } },
    { key: "target_case_in", label: "Target case depth (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "hotter_reference_case_in", label: "Case the same reference time gives when hotter (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "d", id: "ccd-out-d", label: "Case depth", value: (r) => r.depth_verdict },
    { key: "t", id: "ccd-out-t", label: "Time for the target", value: (r) => r.target_verdict },
    { key: "k", id: "ccd-out-k", label: "The temperature lever", value: (r) => r.temperature_verdict },
    { key: "s", id: "ccd-out-s", label: "Effective vs total case", value: (r) => r.specification_verdict },
    { key: "n", id: "ccd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCarburizingCaseDepth,
});

// =====================================================================
// spec-v1672: quench severity and the equivalent Jominy distance.
// =====================================================================
//
// spec-v1672's worked example ASSERTS its result rather than computing it --
// "a long equivalent Jominy distance" and "a much shorter distance" with no
// number for either. The Lamont equivalence is a chart lookup rather than a
// closed form, so the equivalent Jominy distance is ENTERED here from the
// applicable chart, and what is computed is everything the entered value
// implies: the hardness at that distance, whether it makes the requirement,
// and the comparison between two quench severities on the same bar. The
// alternative would be inventing a correlation the spec never stated.
//
// NOT a duplicate of `quench-severity` in calc-shop.js, which asks a
// different question -- whether AGITATION helps, through the Biot number and
// the surface-versus-conduction-limited distinction. This asks how DEEP the
// hardness reaches. Screened by formula before building.
// =====================================================================
// dims: in { jominy_distance_sixteenths: L, hardness_at_distance_hrc: dimensionless, required_core_hardness_hrc: dimensionless, alt_jominy_distance_sixteenths: L, alt_hardness_hrc: dimensionless, surface_hardness_hrc: dimensionless } out: { jominy_distance_in: L, hardness_margin_hrc: dimensionless, alt_jominy_distance_in: L, alt_margin_hrc: dimensionless, core_to_surface_drop_hrc: dimensionless }
export function computeJominyQuenchSeverity({
  jominy_distance_sixteenths = 0, hardness_at_distance_hrc = 0, required_core_hardness_hrc = 0,
  alt_jominy_distance_sixteenths = 0, alt_hardness_hrc = 0, surface_hardness_hrc = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(jominy_distance_sixteenths > 0)) return { error: "The equivalent Jominy distance must be positive (sixteenths of an inch)." };
  if (!(hardness_at_distance_hrc > 0)) return { error: "The hardness at that Jominy distance must be positive (HRC)." };
  if (required_core_hardness_hrc < 0 || alt_jominy_distance_sixteenths < 0 || alt_hardness_hrc < 0 || surface_hardness_hrc < 0) return { error: "Required hardness, the alternative quench figures and surface hardness cannot be negative." };
  const jominy_distance_in = jominy_distance_sixteenths / 16;
  const position_verdict = "an equivalent Jominy distance of " + fmt(jominy_distance_sixteenths, 1) + " sixteenths (" + fmt(jominy_distance_in, 4) + " in from the quenched end) reads " + fmt(hardness_at_distance_hrc, 1) + " HRC off this steel's Jominy curve";
  const has_requirement = required_core_hardness_hrc > 0;
  const hardness_margin_hrc = has_requirement ? hardness_at_distance_hrc - required_core_hardness_hrc : 0;
  const meets = has_requirement && hardness_margin_hrc >= 0;
  const requirement_verdict = !has_requirement
    ? "(no required core hardness entered)"
    : meets
      ? "that MEETS the " + fmt(required_core_hardness_hrc, 1) + " HRC requirement with " + fmt(hardness_margin_hrc, 1) + " HRC to spare"
      : "that FAILS the " + fmt(required_core_hardness_hrc, 1) + " HRC requirement by " + fmt(-hardness_margin_hrc, 1) + " HRC";
  const has_alt = alt_jominy_distance_sixteenths > 0 && alt_hardness_hrc > 0;
  const alt_jominy_distance_in = has_alt ? alt_jominy_distance_sixteenths / 16 : 0;
  const alt_margin_hrc = has_alt && has_requirement ? alt_hardness_hrc - required_core_hardness_hrc : 0;
  const alt_meets = has_alt && has_requirement && alt_margin_hrc >= 0;
  const severity_verdict = !has_alt
    ? "(no alternative quench entered -- and comparing two severities on the SAME bar is what this is for)"
    : "the more severe quench puts the same location at " + fmt(alt_jominy_distance_sixteenths, 1) + " sixteenths and " + fmt(alt_hardness_hrc, 1) + " HRC"
      + (has_requirement ? (alt_meets ? ", which DOES make the requirement" : ", which still does not make the requirement") : "")
      + ". A severer quench moves the equivalent position CLOSER to the quenched end, because the section cools faster and behaves like material nearer the end of the Jominy bar";
  const cost_verdict = !has_alt
    ? "(no alternative quench entered)"
    : "AND THE SEVERITY LEVER HAS A COST. Moving from oil to water roughly triples the distortion and the quench-cracking risk on a part with section changes or sharp corners, and on many parts that is not an acceptable trade -- the answer is then a more hardenable steel rather than a harder quench";
  // The distinction the whole tile exists for.
  const has_surface = surface_hardness_hrc > 0;
  const core_to_surface_drop_hrc = has_surface ? surface_hardness_hrc - hardness_at_distance_hrc : 0;
  const hardenability_verdict = !has_surface
    ? "HARDENABILITY IS NOT HARDNESS, and confusing them is the classic error. Maximum hardness is set almost entirely by CARBON -- a 0.40% carbon steel will not exceed a certain hardness however it is quenched. Hardenability is set by the ALLOYING and determines how DEEP that hardness extends. Two steels of the same carbon reach nearly the same surface hardness and behave completely differently at the core of a thick section"
    : "HARDENABILITY IS NOT HARDNESS. This part reads " + fmt(surface_hardness_hrc, 1) + " HRC at the surface and " + fmt(hardness_at_distance_hrc, 1) + " at the position evaluated, a drop of " + fmt(core_to_surface_drop_hrc, 1) + " HRC. Surface hardness is set almost entirely by CARBON and the depth it reaches is set by the ALLOYING, so a plain-carbon steel substituted for an alloy steel 'because the carbon is the same' tests correctly at the surface and is soft where the load is";
  if (![jominy_distance_in, hardness_margin_hrc, alt_jominy_distance_in, alt_margin_hrc, core_to_surface_drop_hrc].every(Number.isFinite)) return { error: "Jominy hardenability math is not a finite value." };
  return {
    jominy_distance_in, position_verdict, has_requirement, hardness_margin_hrc, meets, requirement_verdict,
    has_alt, alt_jominy_distance_in, alt_margin_hrc, alt_meets, severity_verdict, cost_verdict,
    has_surface, core_to_surface_drop_hrc, hardenability_verdict,
    note: "Whether a steel actually hardens where the load is, which is a different question from how hard it can get. Maximum hardness is set almost entirely by CARBON CONTENT: a 0.40 percent carbon steel will not exceed a certain hardness however it is quenched. HARDENABILITY is set by the alloying elements and determines how far below the surface that hardness extends. Two steels of identical carbon content reach nearly the same surface hardness and behave completely differently at the core of a thick section, and a shop substituting one for the other because 'the carbon is the same' produces a part that tests correctly at the surface and is soft where it is loaded. The Jominy end-quench curve is how hardenability is expressed: hardness against distance from a quenched end. A real bar of a given diameter, quenched at a given severity, cools at its centre like a particular position along that bar, and that EQUIVALENT JOMINY DISTANCE is the bridge between a quench and a hardness. Higher severity and smaller diameter both move the equivalent position closer to the quenched end, where the hardness is higher. The equivalence is a chart lookup rather than a formula, so it is entered here along with the hardness the steel's own curve gives at that distance -- both come from the steel's data and the applicable severity chart, and inventing a correlation for them would be worse than asking for them. THE SEVERITY LEVER HAS A COST THAT IS EASY TO IGNORE. Moving from oil to water may make the core hardness on a marginal steel, and it roughly triples the distortion and the quench-cracking risk on any part with section changes, sharp corners or holes. On many parts that is not an acceptable trade, and the answer is a more hardenable steel rather than a more severe quench -- which is a purchasing decision made before the part is cut rather than a process decision made at the tank. This evaluates entered hardenability data. It does not supply a Jominy curve for any steel, compute the equivalent Jominy distance from a diameter and a severity (that is the Lamont chart lookup this asks for), predict distortion or cracking risk, address tempering, which follows and reduces the hardness, model the hardness at any other location in the section, or select a steel or a quench. The steel supplier's Jominy data, the applicable hardenability charts, and the metallurgist govern.",
  };
}
export const jominyQuenchSeverityExample = { inputs: { jominy_distance_sixteenths: 12, hardness_at_distance_hrc: 34, required_core_hardness_hrc: 38, alt_jominy_distance_sixteenths: 5, alt_hardness_hrc: 48, surface_hardness_hrc: 55 } };
INSPECTION_RENDERERS["jominy-quench-severity"] = _simpleRenderer({
  citation: "Citation: the Jominy end-quench hardenability curve (ASTM A255) read at an equivalent Jominy distance. The equivalence between a bar diameter at a quench severity and a position on the Jominy bar is a CHART lookup (the Lamont charts) rather than a closed form, so the distance and the hardness the steel's own curve gives there are both ENTERED. Hardness is set by CARBON and hardenability by ALLOYING -- they are different properties. It does not supply a Jominy curve, compute the equivalent distance from a diameter and severity, predict distortion or cracking risk, address tempering, or select a steel or quench. This is a different question from `quench-severity`, which asks whether agitation helps. The steel supplier's Jominy data and the metallurgist govern.",
  example: jominyQuenchSeverityExample.inputs,
  fields: [
    { key: "jominy_distance_sixteenths", label: "Equivalent Jominy distance (sixteenths of an inch)", kind: "number", attrs: { step: "any" } },
    { key: "hardness_at_distance_hrc", label: "Hardness there, from the steel's curve (HRC)", kind: "number", attrs: { step: "any" } },
    { key: "required_core_hardness_hrc", label: "Required core hardness (HRC, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "alt_jominy_distance_sixteenths", label: "Severer quench: equivalent distance (0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "alt_hardness_hrc", label: "Severer quench: hardness there (HRC, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "surface_hardness_hrc", label: "Surface hardness (HRC, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "p", id: "jqs-out-p", label: "Where the section sits", value: (r) => r.position_verdict },
    { key: "r", id: "jqs-out-r", label: "Against the requirement", value: (r) => r.requirement_verdict },
    { key: "s", id: "jqs-out-s", label: "A severer quench", value: (r) => r.severity_verdict },
    { key: "c", id: "jqs-out-c", label: "What severity costs", value: (r) => r.cost_verdict },
    { key: "h", id: "jqs-out-h", label: "Hardenability is not hardness", value: (r) => r.hardenability_verdict },
    { key: "n", id: "jqs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeJominyQuenchSeverity,
});

// =====================================================================
// spec-v1673: tempering temperature for a target hardness.
// =====================================================================
// dims: in { target_hardness_hrc: dimensionless, curve_temp_f: T, section_thickness_in: L, soak_rate_hr_per_in: T L^-1, minimum_soak_hr: T, embrittlement_low_f: T, embrittlement_high_f: T, secondary_hardening: dimensionless } out: { soak_time_hr: T, embrittlement_span_f: T }
export function computeTemperingTemperature({
  target_hardness_hrc = 0, curve_temp_f = 0, section_thickness_in = 0,
  soak_rate_hr_per_in = 1, minimum_soak_hr = 1,
  embrittlement_low_f = 700, embrittlement_high_f = 1050, secondary_hardening = "no",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(target_hardness_hrc > 0)) return { error: "Target hardness must be positive (HRC)." };
  if (!(curve_temp_f > 0)) return { error: "The tempering temperature from the steel's curve must be positive (degF)." };
  if (!(section_thickness_in > 0)) return { error: "Section thickness must be positive (in)." };
  if (!(soak_rate_hr_per_in > 0)) return { error: "The soak rate must be positive (hours per inch)." };
  if (minimum_soak_hr < 0) return { error: "The minimum soak cannot be negative." };
  if (!(embrittlement_high_f > embrittlement_low_f)) return { error: "The embrittlement range must have a maximum above its minimum." };
  const computed_soak_hr = soak_rate_hr_per_in * section_thickness_in;
  const soak_time_hr = Math.max(computed_soak_hr, minimum_soak_hr);
  const minimum_governs = minimum_soak_hr > computed_soak_hr;
  const temp_verdict = "for " + fmt(target_hardness_hrc, 0) + " HRC this steel's tempering curve gives " + fmt(curve_temp_f, 0) + " degF. THE TEMPERATURE IS THE CONTROL: the same part tempered a few hundred degrees either side of that lands at a substantially different hardness, and the curve is a property of the specific grade rather than a general relationship";
  const soak_verdict = "soak " + fmt(soak_time_hr, 2) + " hours" + (minimum_governs
    ? " -- the " + fmt(minimum_soak_hr, 1) + " hour minimum governs, since " + fmt(section_thickness_in, 2) + " in at " + fmt(soak_rate_hr_per_in, 2) + " h/in is only " + fmt(computed_soak_hr, 2)
    : " (" + fmt(section_thickness_in, 2) + " in at " + fmt(soak_rate_hr_per_in, 2) + " h/in, above the " + fmt(minimum_soak_hr, 1) + " hour minimum)");
  const in_embrittlement = curve_temp_f >= embrittlement_low_f && curve_temp_f <= embrittlement_high_f;
  const embrittlement_span_f = embrittlement_high_f - embrittlement_low_f;
  const embrittlement_verdict = !in_embrittlement
    ? fmt(curve_temp_f, 0) + " degF is outside the " + fmt(embrittlement_low_f, 0) + " to " + fmt(embrittlement_high_f, 0) + " degF temper embrittlement range entered. Where a grade is susceptible, that range is what the specification requires rapid cooling through"
    : "TEMPER EMBRITTLEMENT CHECK: " + fmt(curve_temp_f, 0) + " degF is INSIDE the " + fmt(embrittlement_low_f, 0) + " to " + fmt(embrittlement_high_f, 0) + " degF susceptible range. A susceptible grade tempered here and FURNACE-COOLED can come out at exactly the specified hardness with substantially reduced impact toughness -- and a hardness test will not find it. Where the grade is susceptible the specification will require cooling rapidly through the range, and that is a process requirement rather than an optional refinement";
  const is_secondary = secondary_hardening === "yes";
  const secondary_verdict = is_secondary
    ? "SECONDARY HARDENING: this grade gets HARDER with tempering temperature over part of its range, because alloy carbides precipitate. The intuition from a 4140 -- hotter temper, softer part -- gets the direction wrong here, so the curve must be read rather than reasoned from. Secondary-hardening tool steels are also commonly double or triple tempered, because each temper transforms retained austenite that the next one then tempers, and a single temper leaves untempered martensite in the part"
    : "this grade softens with tempering temperature in the ordinary way. For contrast, a secondary-hardening tool steel such as H13 is HARDER tempered at 1,000 degF than at 700, because alloy carbides precipitate -- so the 4140 intuition gets the direction wrong on those grades, and they are also double or triple tempered to deal with retained austenite";
  const hardness_only_verdict = "AND HARDNESS IS THE ONLY THING THIS CONFIRMS. A part can be at exactly the specified hardness and be wrong in ways a hardness test cannot see: embrittled by the cooling rate through a susceptible range, or carrying untempered martensite from a single temper where the grade needs two";
  if (![soak_time_hr, embrittlement_span_f].every(Number.isFinite)) return { error: "Tempering math is not a finite value." };
  return {
    computed_soak_hr, soak_time_hr, minimum_governs, temp_verdict, soak_verdict,
    in_embrittlement, embrittlement_span_f, embrittlement_verdict,
    is_secondary, secondary_verdict, hardness_only_verdict,
    note: "The tempering temperature for a target hardness, and two things that go wrong at exactly the right hardness. The temperature comes from the steel's own tempering curve and is entered rather than derived, because the curve is a property of the specific grade: the same temperature produces quite different hardnesses in different steels, and no general relationship replaces the grade's own data. Soak time follows the section, with a stated minimum that governs on thin parts. TEMPER EMBRITTLEMENT IS THE FAILURE A HARDNESS TEST CANNOT FIND. Some alloy steels are susceptible in a range around the middle of the tempering scale, particularly on SLOW COOLING through it, and a part tempered there and furnace-cooled can come out at precisely the specified hardness with substantially reduced impact toughness. Nothing in the hardness reading says so. Where the grade is susceptible the specification requires cooling rapidly through the range, and that is a process requirement rather than a refinement to be dropped when the furnace is busy. SECONDARY HARDENING RUNS THE OTHER WAY AND CATCHES PEOPLE WHO REASON FROM STRUCTURAL STEEL. A tool steel such as H13 is harder tempered at the high end of its range than at the low, because alloy carbides precipitate there, so the intuition that a hotter temper means a softer part is exactly wrong for those grades. They are also commonly double or triple tempered, because each temper transforms some retained austenite which the next one then tempers -- and a single temper on such a steel leaves untempered martensite in the finished part, which is brittle and dimensionally unstable. Both of those are reasons the curve is read rather than reasoned from. This computes a soak time and screens an entered temperature against an entered susceptible range. It does not supply a tempering curve, an embrittlement range, or a soak rule for any grade, predict hardness from temperature, address the austenitising and quenching that precede tempering, model retained austenite or specify a multiple-temper cycle, evaluate toughness, or address stress relief, which is a different operation at different temperatures. The steel supplier's tempering data, the applicable process standard, and the metallurgist govern.",
  };
}
export const temperingTemperatureExample = { inputs: { target_hardness_hrc: 32, curve_temp_f: 1025, section_thickness_in: 2, soak_rate_hr_per_in: 1, minimum_soak_hr: 1, embrittlement_low_f: 700, embrittlement_high_f: 1050, secondary_hardening: "no" } };
INSPECTION_RENDERERS["tempering-temperature"] = _simpleRenderer({
  citation: "Citation: soak time from section thickness at an entered rate (commonly about 1 hour per inch) against a stated minimum, with the tempering TEMPERATURE read from the steel's own tempering curve and entered -- the curve is a property of the specific grade and no general relationship replaces it. The temper embrittlement range (commonly around 700 to 1,050 °F for susceptible alloy steels, on SLOW cooling) is entered because susceptibility is grade-specific. It does not supply a curve, an embrittlement range or a soak rule, predict hardness from temperature, address austenitising and quenching, specify a multiple-temper cycle, or evaluate toughness. The steel supplier's data and the metallurgist govern.",
  example: temperingTemperatureExample.inputs,
  fields: [
    { key: "target_hardness_hrc", label: "Target hardness (HRC)", kind: "number", attrs: { step: "any" } },
    { key: "curve_temp_f", label: "Temperature from the steel's curve (°F)", kind: "number", attrs: { step: "any" } },
    { key: "section_thickness_in", label: "Section thickness (in)", kind: "number", attrs: { step: "any" } },
    { key: "soak_rate_hr_per_in", label: "Soak rate (h per in)", kind: "number", default: 1, attrs: { step: "any" } },
    { key: "minimum_soak_hr", label: "Minimum soak (h)", kind: "number", default: 1, attrs: { step: "any" } },
    { key: "embrittlement_low_f", label: "Embrittlement range low (°F)", kind: "number", default: 700, attrs: { step: "any" } },
    { key: "embrittlement_high_f", label: "Embrittlement range high (°F)", kind: "number", default: 1050, attrs: { step: "any" } },
    { key: "secondary_hardening", label: "Secondary-hardening grade?", kind: "select", default: "no", options: [{ value: "no", label: "No (softens with temperature)" }, { value: "yes", label: "Yes (tool steel, e.g. H13)" }] },
  ],
  outputs: [
    { key: "t", id: "tmp-out-t", label: "Temperature", value: (r) => r.temp_verdict },
    { key: "s", id: "tmp-out-s", label: "Soak time", value: (r) => r.soak_verdict },
    { key: "e", id: "tmp-out-e", label: "Temper embrittlement", value: (r) => r.embrittlement_verdict },
    { key: "c", id: "tmp-out-c", label: "Which direction the curve runs", value: (r) => r.secondary_verdict },
    { key: "h", id: "tmp-out-h", label: "What hardness cannot confirm", value: (r) => r.hardness_only_verdict },
    { key: "n", id: "tmp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTemperingTemperature,
});

// =====================================================================
// spec-v1674: post-weld heat treatment holding time and ramp rates.
// =====================================================================
//
// `heat-treat-soak-time` in calc-shop.js says in its own note that it "does
// not address ... ramp rates and thermal shock on thick or complex sections".
// That is exactly this. Screened by formula before building.
// =====================================================================
// dims: in { governing_thickness_in: L, hold_rate_hr_per_in: T L^-1, minimum_hold_hr: T, holding_temp_f: T, rate_threshold_temp_f: T, heating_rate_constant_f_hr_in: T, cooling_rate_constant_f_hr_in: T, rate_ceiling_f_hr: T, actual_heating_rate_f_hr: T, alt_thickness_in: L } out: { holding_time_hr: T, max_heating_rate_f_hr: T, max_cooling_rate_f_hr: T, heating_hours: T, cooling_hours: T, total_cycle_hr: T, alt_total_cycle_hr: T }
export function computePwhtHoldingTime({
  governing_thickness_in = 0, hold_rate_hr_per_in = 1, minimum_hold_hr = 0.25,
  holding_temp_f = 0, rate_threshold_temp_f = 800,
  heating_rate_constant_f_hr_in = 400, cooling_rate_constant_f_hr_in = 500, rate_ceiling_f_hr = 400,
  actual_heating_rate_f_hr = 0, alt_thickness_in = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(governing_thickness_in > 0)) return { error: "Governing thickness must be positive (in)." };
  if (!(hold_rate_hr_per_in > 0)) return { error: "The holding time rate must be positive (hours per inch)." };
  if (minimum_hold_hr < 0) return { error: "The minimum hold cannot be negative." };
  if (!(holding_temp_f > rate_threshold_temp_f)) return { error: "The holding temperature must be above the rate threshold temperature." };
  if (!(heating_rate_constant_f_hr_in > 0) || !(cooling_rate_constant_f_hr_in > 0)) return { error: "The heating and cooling rate constants must be positive." };
  if (!(rate_ceiling_f_hr > 0)) return { error: "The rate ceiling must be positive (degF per hour)." };
  if (actual_heating_rate_f_hr < 0 || alt_thickness_in < 0) return { error: "The actual heating rate and alternative thickness cannot be negative." };
  const _cycleFor = (t) => {
    const hold = Math.max(hold_rate_hr_per_in * t, minimum_hold_hr);
    const heatRate = Math.min(heating_rate_constant_f_hr_in / t, rate_ceiling_f_hr);
    const coolRate = Math.min(cooling_rate_constant_f_hr_in / t, rate_ceiling_f_hr);
    const span = holding_temp_f - rate_threshold_temp_f;
    return { hold, heatRate, coolRate, heatHr: span / heatRate, coolHr: span / coolRate,
             total: hold + span / heatRate + span / coolRate };
  };
  const c = _cycleFor(governing_thickness_in);
  const holding_time_hr = c.hold;
  const max_heating_rate_f_hr = c.heatRate;
  const max_cooling_rate_f_hr = c.coolRate;
  const heating_hours = c.heatHr;
  const cooling_hours = c.coolHr;
  const total_cycle_hr = c.total;
  const hold_verdict = "holding time is " + fmt(holding_time_hr, 2) + " hours at " + fmt(holding_temp_f, 0) + " degF (" + fmt(governing_thickness_in, 2) + " in at " + fmt(hold_rate_hr_per_in, 2) + " h/in"
    + (minimum_hold_hr > hold_rate_hr_per_in * governing_thickness_in ? ", but the " + fmt(minimum_hold_hr, 2) + " hour minimum governs" : "") + ")";
  const rate_verdict = "above " + fmt(rate_threshold_temp_f, 0) + " degF the maximum heating rate is " + fmt(max_heating_rate_f_hr, 0) + " degF/h and the maximum cooling rate " + fmt(max_cooling_rate_f_hr, 0) + " degF/h. THE PERMITTED RATE IS INVERSELY PROPORTIONAL TO THICKNESS, because a thin part can be brought up quickly and a thick one cannot -- heating or cooling too fast puts thermal gradients into exactly the section the treatment exists to relieve, which is stress ADDED rather than removed";
  const cycle_verdict = "the full cycle is " + fmt(total_cycle_hr, 1) + " hours -- " + fmt(heating_hours, 2) + " up from " + fmt(rate_threshold_temp_f, 0) + " degF, " + fmt(holding_time_hr, 2) + " at temperature, and " + fmt(cooling_hours, 2) + " back down under control. That, not the hold, is what a schedule has to allow, and the hold is only " + fmt(holding_time_hr / total_cycle_hr * 100, 0) + "% of it";
  const has_alt = alt_thickness_in > 0;
  const alt = has_alt ? _cycleFor(alt_thickness_in) : null;
  const alt_total_cycle_hr = has_alt ? alt.total : 0;
  const alt_verdict = !has_alt
    ? "(no alternative thickness entered)"
    : "a " + fmt(alt_thickness_in, 2) + " in section runs " + fmt(alt_total_cycle_hr, 1) + " hours, " + fmt(alt_total_cycle_hr / total_cycle_hr, 2) + " times this cycle for " + fmt(alt_thickness_in / governing_thickness_in, 2) + " times the thickness -- the hold scales with thickness and BOTH ramps scale with it too, because the permitted rate falls as the thickness rises";
  const has_actual = actual_heating_rate_f_hr > 0;
  const rate_exceeded = has_actual && actual_heating_rate_f_hr > max_heating_rate_f_hr;
  const actual_verdict = !has_actual
    ? "(no actual heating rate entered)"
    : rate_exceeded
      ? "THE ENTERED HEATING RATE OF " + fmt(actual_heating_rate_f_hr, 0) + " degF/h EXCEEDS the " + fmt(max_heating_rate_f_hr, 0) + " degF/h limit by " + fmt(actual_heating_rate_f_hr - max_heating_rate_f_hr, 0) + ". The rates are the part most often violated, because they cost schedule and nothing visible happens when they are broken"
      : "the entered " + fmt(actual_heating_rate_f_hr, 0) + " degF/h heating rate is within the " + fmt(max_heating_rate_f_hr, 0) + " degF/h limit";
  const thickness_verdict = "AND THE GOVERNING THICKNESS IS DEFINED BY THE CODE, NOT BY INSPECTION. For a joint between unequal thicknesses it is not simply the thicker part, and getting it wrong changes the hold and both rate limits at once. The whole heated band also has to sit within a temperature tolerance, which is a thermocouple placement question rather than an arithmetic one";
  if (![holding_time_hr, max_heating_rate_f_hr, max_cooling_rate_f_hr, heating_hours, cooling_hours, total_cycle_hr, alt_total_cycle_hr].every(Number.isFinite)) return { error: "PWHT cycle math is not a finite value." };
  return {
    holding_time_hr, max_heating_rate_f_hr, max_cooling_rate_f_hr, heating_hours, cooling_hours,
    total_cycle_hr, hold_verdict, rate_verdict, cycle_verdict,
    has_alt, alt_total_cycle_hr, alt_verdict,
    has_actual, rate_exceeded, actual_verdict, thickness_verdict,
    note: "The full post-weld heat treatment cycle, which is considerably longer than the hold everyone quotes. Holding time comes from the governing thickness at a code rate, commonly an hour an inch with a stated minimum -- and then the controlled heating and cooling either side of it frequently exceed the hold itself, so a schedule written on the hold alone is wrong by a factor of two or more. THE RATES MATTER AS MUCH AS THE HOLD AND THEY ARE THE PART MOST OFTEN VIOLATED. Above a threshold temperature the permitted heating and cooling rates are inversely proportional to the thickness: a thin part can be brought up quickly, a thick one cannot. The reason is not caution but mechanism -- heating or cooling a heavy section too fast puts a thermal gradient through exactly the material the treatment exists to relieve, which ADDS residual stress rather than removing it. Breaking the rate produces nothing visible at the time, costs no scrap, and saves real schedule, which is precisely why it is the requirement that goes. Thickness therefore compounds three times over. Doubling the governing thickness doubles the hold, halves the permitted heating rate, and halves the permitted cooling rate, so the cycle grows roughly with the thickness in every one of its three parts. That is the number a fabricator needs before committing a furnace or a bank of pads to a schedule. THE GOVERNING THICKNESS IS DEFINED BY THE CODE RATHER THAN BY MEASUREMENT. For a joint between unequal thicknesses it is not simply the thicker member, and the definition differs between codes and between joint configurations -- so getting it wrong moves the hold and both rate limits at once, in the same direction, and a cycle run on the wrong thickness is wrong throughout. This computes a cycle from entered code parameters. It does not supply the holding temperature, the rate constants, the threshold temperature, or the governing-thickness definition for any code, determine whether PWHT is required or exempt (which is a code question turning on material, thickness and service), address the heated band width, gradient control band, or insulation, specify thermocouple number and placement or the temperature tolerance across the band, evaluate the effect on material properties -- PWHT softens some materials and can embrittle others -- or address local versus furnace treatment. ASME Section VIII, ASME B31.1 or B31.3, AWS D1.1 or the applicable code, the written procedure, and the responsible engineer govern.",
  };
}
export const pwhtHoldingTimeExample = { inputs: { governing_thickness_in: 2.0, hold_rate_hr_per_in: 1, minimum_hold_hr: 0.25, holding_temp_f: 1150, rate_threshold_temp_f: 800, heating_rate_constant_f_hr_in: 400, cooling_rate_constant_f_hr_in: 500, rate_ceiling_f_hr: 400, actual_heating_rate_f_hr: 250, alt_thickness_in: 4.0 } };
INSPECTION_RENDERERS["pwht-holding-time"] = _simpleRenderer({
  citation: "Citation: post-weld heat treatment holding time = governing thickness × a code rate (commonly 1 hour per inch) against a stated minimum, with heating and cooling rates above a threshold temperature limited to a constant divided by the thickness (commonly 400 and 500 °F·in/h) under a ceiling. Every one of those parameters, and the code's definition of GOVERNING THICKNESS -- which for a joint between unequal thicknesses is not simply the thicker member -- is ENTERED from the applicable code. It does not determine whether PWHT is required or exempt, address heated band width or insulation, specify thermocouple placement or band tolerance, evaluate the effect on material properties, or distinguish local from furnace treatment. ASME Section VIII, B31.1/B31.3, AWS D1.1 or the applicable code and the responsible engineer govern.",
  example: pwhtHoldingTimeExample.inputs,
  fields: [
    { key: "governing_thickness_in", label: "Governing thickness per the code (in)", kind: "number", attrs: { step: "any" } },
    { key: "hold_rate_hr_per_in", label: "Holding time rate (h per in)", kind: "number", default: 1, attrs: { step: "any" } },
    { key: "minimum_hold_hr", label: "Code minimum hold (h)", kind: "number", default: 0.25, attrs: { step: "any" } },
    { key: "holding_temp_f", label: "Holding temperature (°F)", kind: "number", attrs: { step: "any" } },
    { key: "rate_threshold_temp_f", label: "Rate control threshold (°F)", kind: "number", default: 800, attrs: { step: "any" } },
    { key: "heating_rate_constant_f_hr_in", label: "Heating rate constant (°F·in/h)", kind: "number", default: 400, attrs: { step: "any" } },
    { key: "cooling_rate_constant_f_hr_in", label: "Cooling rate constant (°F·in/h)", kind: "number", default: 500, attrs: { step: "any" } },
    { key: "rate_ceiling_f_hr", label: "Rate ceiling (°F/h)", kind: "number", default: 400, attrs: { step: "any" } },
    { key: "actual_heating_rate_f_hr", label: "Actual heating rate (°F/h, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "alt_thickness_in", label: "Alternative thickness (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "h", id: "pwt-out-h", label: "Holding time", value: (r) => r.hold_verdict },
    { key: "r", id: "pwt-out-r", label: "Rate limits", value: (r) => r.rate_verdict },
    { key: "c", id: "pwt-out-c", label: "The full cycle", value: (r) => r.cycle_verdict },
    { key: "a", id: "pwt-out-a", label: "At another thickness", value: (r) => r.alt_verdict },
    { key: "x", id: "pwt-out-x", label: "Against the actual rate", value: (r) => r.actual_verdict },
    { key: "g", id: "pwt-out-g", label: "Which thickness governs", value: (r) => r.thickness_verdict },
    { key: "n", id: "pwt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePwhtHoldingTime,
});
