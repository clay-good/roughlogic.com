// Group C: HVAC acoustics and rooftop anchorage calculators.
//
// Split intact from calc-hvacsystems.js by spec-v1869. Calculator IDs,
// formulas, fields, outputs, citations, examples, and Group C assignments
// are unchanged.

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

function _simpleRenderer(spec) {
  const _hsRender = function (inputRegion, outputRegion, citationEl) {
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

  _hsRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _hsRender;
}

export const HVACACOUSTICS_RENDERERS = {};

// =====================================================================
// spec-v1632..v1636 (scope-trade-expansion-2, the HVAC acoustics and
// rooftop anchorage band). Four tiles on why a system is audible and one
// on whether the unit making the noise stays on the roof.
//
// THREE DEFECTS IN THE SOURCE SPECS. spec-v1634 ships two unrendered
// python placeholders for its own pressure drop (0.72 and 0.37 in wc) and
// a face velocity of 2,158 fpm that its own dimensions make 2,160.
// spec-v1636 computes a net uplift of -280 lb -- the unit's 1,400 lb
// weight EXCEEDING the 1,120 lb of uplift by 280 -- and then bolds
// "-280 lb still trying to lift it after its own weight is counted",
// which is the sign read backwards. Its downstream arithmetic is right,
// so only the sentence is wrong; that tile reports the direction IN WORDS
// rather than as a signed number, which is the fix that makes the class
// of error impossible to repeat.
// =====================================================================

// Sound power from an air outlet rises roughly with the fifth power of
// velocity, so a decibel change is 10 log10(ratio^5) = 50 log10(ratio).
const _AC_VELOCITY_EXPONENT = 5;

// =====================================================================
// spec-v1632: grille neck velocity and the NC that follows from it.
// =====================================================================
// dims: in { airflow_cfm: L^3 T^-1, neck_free_area_ft2: L^2, rated_nc: dimensionless, next_size_free_area_ft2: L^2, room_nc_target: dimensionless, room_correction_db: dimensionless } out: { neck_velocity_fpm: L T^-1, next_velocity_fpm: L T^-1, effective_nc: dimensionless, next_nc: dimensionless, nc_change_db: dimensionless, cfm_at_target: L^3 T^-1 }
export function computeGrilleNeckNc({
  airflow_cfm = 0, neck_free_area_ft2 = 0, rated_nc = 0,
  next_size_free_area_ft2 = 0, room_nc_target = 0, room_correction_db = 0,
  damper_at_neck = "no",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(airflow_cfm > 0)) return { error: "Airflow must be greater than zero." };
  if (!(neck_free_area_ft2 > 0)) return { error: "Neck free area must be greater than zero." };
  if (!(rated_nc > 0)) return { error: "The manufacturer NC rating at this flow must be greater than zero." };

  const neck_velocity_fpm = airflow_cfm / neck_free_area_ft2;
  const effective_nc = rated_nc + room_correction_db;
  const has_target = room_nc_target > 0;
  const over_target_db = has_target ? effective_nc - room_nc_target : 0;
  const meets_target = has_target && over_target_db <= 1e-12;

  const has_next = next_size_free_area_ft2 > 0;
  const next_velocity_fpm = has_next ? airflow_cfm / next_size_free_area_ft2 : 0;
  const velocity_ratio = has_next ? next_velocity_fpm / neck_velocity_fpm : 1;
  const nc_change_db = has_next ? 10 * Math.log10(Math.pow(velocity_ratio, _AC_VELOCITY_EXPONENT)) : 0;
  const next_nc = has_next ? effective_nc + nc_change_db : effective_nc;
  const next_meets = has_next && has_target && next_nc <= room_nc_target + 1e-12;
  const velocity_drop_pct = has_next ? 100 * (1 - velocity_ratio) : 0;

  // The airflow this size can pass and still meet the target, from the
  // same fifth-power relation run backwards.
  const target_velocity_fpm = has_target
    ? neck_velocity_fpm * Math.pow(10, (room_nc_target - effective_nc) / (10 * _AC_VELOCITY_EXPONENT)) : 0;
  const cfm_at_target = has_target ? target_velocity_fpm * neck_free_area_ft2 : 0;

  const damper_flag = String(damper_at_neck) === "yes";

  const velocityVerdict = "at " + fmt(airflow_cfm, 0) + " cfm through " + fmt(neck_free_area_ft2, 2) + " sq ft of neck free area the neck velocity is " + fmt(neck_velocity_fpm, 0) + " fpm";
  const ncVerdict = !has_target
    ? "the manufacturer rates this outlet NC " + fmt(rated_nc, 0) + " at this flow" + (room_correction_db !== 0 ? ", and the entered room correction of " + fmt(room_correction_db, 1) + " dB puts it at NC " + fmt(effective_nc, 0) : "")
    : meets_target
      ? "NC " + fmt(effective_nc, 0) + " against an NC " + fmt(room_nc_target, 0) + " target -- it meets it, with " + fmt(-over_target_db, 1) + " points to spare"
      : "NC " + fmt(effective_nc, 0) + " against an NC " + fmt(room_nc_target, 0) + " target -- OVER by " + fmt(over_target_db, 1) + " points";
  const sizeVerdict = !has_next
    ? "no next size up was entered. THE FIFTH-POWER RELATION IS WHAT MAKES THIS FIXABLE: sound power rises roughly with the fifth power of velocity, so a modest size increase buys a large NC reduction"
    : "ONE SIZE UP takes the velocity to " + fmt(next_velocity_fpm, 0) + " fpm, a " + fmt(velocity_drop_pct, 0) + "% reduction -- and at a fifth-power relation that is " + fmt(nc_change_db, 1) + " dB, putting it near NC " + fmt(next_nc, 0) + (has_target ? (next_meets ? ", comfortably inside the target" : ", still over the target") : "") + ". VERY FEW HVAC PROBLEMS RESPOND THAT STRONGLY TO SUCH A SMALL CHANGE -- it costs the price difference between two diffusers";
  const capacityVerdict = !has_target
    ? "no room target was entered, so no capacity at a criterion is reported"
    : "this size passes " + fmt(cfm_at_target, 0) + " cfm and still meets NC " + fmt(room_nc_target, 0) + ", against the " + fmt(airflow_cfm, 0) + " asked of it";
  const damperVerdict = damper_flag
    ? "A BALANCING DAMPER AT THE NECK IS PRESENT, AND IT IS PROBABLY THE NOISE. A damper immediately behind a diffuser generates turbulence right at the outlet with nothing between it and the room, and throttling it hard to balance a branch turns the diffuser into a whistle. NO DIFFUSER SELECTION FIXES THAT. Move the balancing to the branch takeoff -- several feet upstream, with a flexible connection and the diffuser's own equalizing grid in between -- and open the neck damper fully. That is the first thing to try on a noise complaint, before anything is replaced"
    : "no neck-mounted balancing damper was reported. That is worth confirming on a complaint, because a damper behind the diffuser generates turbulence with nothing between it and the room, and it commonly makes more noise than the diffuser does";
  const roomVerdict = "AND THE PUBLISHED NC ASSUMES A ROOM -- a fairly absorptive one. A diffuser rated NC 28 in a carpeted office with a lay-in ceiling reads several points higher in a hard-surfaced room with a gypsum ceiling, which is why the same selection is quiet in one space and audible in another. That correction is ENTERED here rather than assumed";

  return {
    neck_velocity_fpm, effective_nc, has_target, over_target_db, meets_target,
    has_next, next_velocity_fpm, velocity_ratio, velocity_drop_pct, nc_change_db, next_nc, next_meets,
    target_velocity_fpm, cfm_at_target, damper_flag,
    velocityVerdict, ncVerdict, sizeVerdict, capacityVerdict, damperVerdict, roomVerdict,
    note: "How loud an air outlet is, and the two changes that fix it. Neck velocity is airflow over the neck's free area, and the NC rating comes from the manufacturer's table at that size and flow -- it is ENTERED, because it depends on the outlet's geometry and no generic relation reproduces a table the maker publishes. THE FIFTH-POWER RELATION IS WHAT MAKES THIS FIXABLE. Sound power rises roughly with the fifth power of velocity, so going one nominal size up -- which might drop neck velocity by 30 percent -- drops the rating by seven or eight points, which is the difference between a complaint and silence. Very few HVAC problems respond that strongly to such a small change, and the change costs the price difference between two diffusers. THE DAMPER LOCATION IS THE OTHER HALF, and it is where most retrofit noise actually comes from. A balancing damper immediately behind a diffuser generates turbulence right at the outlet with nothing between it and the room, and throttling it hard to balance a branch turns the diffuser into a whistle. Moving the balancing to the branch takeoff -- several feet upstream, with a flexible connection and the diffuser's own equalizing grid in between -- removes the noise without changing the airflow, and it is the first thing to try on a complaint, before anything is replaced. AND THE PUBLISHED RATING ASSUMES A ROOM, a fairly absorptive one. The same diffuser reads several points higher in a hard-surfaced room with a gypsum ceiling than in a carpeted office with a lay-in ceiling, which is why one selection is quiet in one space and audible in another. This scales an entered rating by a computed velocity change. It does not read a manufacturer sound table or predict NC from geometry, work in octave bands (NC is a spectrum criterion and a single number hides where the problem is), address duct-borne noise reaching the outlet, breakout through duct walls, or noise from the fan itself, evaluate throw, drop or air distribution, or determine what any standard requires. ASHRAE Applications, the outlet manufacturer's sound data, and the acoustical consultant govern.",
  };
}
export const grilleNeckNcExample = { inputs: { airflow_cfm: 600, neck_free_area_ft2: 1.0, rated_nc: 34, next_size_free_area_ft2: 1.4, room_nc_target: 30, room_correction_db: 0, damper_at_neck: "yes" } };

// =====================================================================
// spec-v1633: duct breakout noise. What is computable here is the
// radiating area, the panel geometry that predicts breakout, the
// equal-area round substitution, and the room level from the standard
// room equation. The transmission loss itself is ENTERED by band.
// =====================================================================
// dims: in { duct_width_in: L, duct_height_in: L, exposed_length_ft: L, sound_power_db: dimensionless, breakout_tl_db: dimensionless, room_absorption_sabins: L^2, room_criterion_db: dimensionless, lagging_improvement_db: dimensionless } out: { exposed_area_ft2: L^2, aspect_ratio: dimensionless, round_diameter_in: L, room_spl_db: dimensionless, lagged_spl_db: dimensionless, over_criterion_db: dimensionless, tl_required_db: dimensionless }
export function computeDuctBreakoutNoise({
  duct_width_in = 0, duct_height_in = 0, exposed_length_ft = 0,
  sound_power_db = 0, breakout_tl_db = 0, room_absorption_sabins = 0,
  room_criterion_db = 0, lagging_improvement_db = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(duct_width_in > 0) || !(duct_height_in > 0)) return { error: "Duct width and height must be greater than zero." };
  if (!(exposed_length_ft > 0)) return { error: "The exposed length must be greater than zero." };
  if (!(sound_power_db > 0)) return { error: "The sound power level in the duct must be greater than zero." };
  if (!(breakout_tl_db > 0)) return { error: "The breakout transmission loss must be greater than zero." };
  if (!(room_absorption_sabins > 0)) return { error: "Room absorption must be greater than zero." };

  const perimeter_ft = 2 * (duct_width_in + duct_height_in) / 12;
  const exposed_area_ft2 = perimeter_ft * exposed_length_ft;
  const aspect_ratio = Math.max(duct_width_in, duct_height_in) / Math.min(duct_width_in, duct_height_in);
  const wide_flat = aspect_ratio >= 3;

  // The equal-area round substitution, which is a design decision and the
  // second cheapest fix after routing.
  const duct_area_in2 = duct_width_in * duct_height_in;
  const round_diameter_in = Math.sqrt(4 * duct_area_in2 / Math.PI);
  const round_perimeter_ft = Math.PI * round_diameter_in / 12;
  const round_area_ft2 = round_perimeter_ft * exposed_length_ft;

  // The standard room equation: Lp = Lw - TL + 10 log10(S / A).
  // ASHRAE HVAC Applications (noise and vibration control): the breakout sound
  // power is Lw_out = Lw_in + 10 log(S / A) - TL_out, with A the duct's OWN
  // cross-section -- the in-duct intensity is the sound power over that area --
  // and it cannot exceed the power in the duct. The room then receives it
  // through the room equation, Lp = Lw + 10 log(4 / R) + 10.5 (R in sabins,
  // reverberant field). spec-v1633 names no equation; this tile had used the
  // partition relation Lp = Lw - TL + 10 log(S / A_room), which takes a
  // source-room PRESSURE level, not a duct's sound power, and read about 10 dB
  // quiet on the worked duct.
  const duct_cross_section_ft2 = duct_area_in2 / 144;
  const area_gain_db = 10 * Math.log10(exposed_area_ft2 / duct_cross_section_ft2);
  const breakout_lw_db = Math.min(sound_power_db, sound_power_db + area_gain_db - breakout_tl_db);
  const room_term_db = 10 * Math.log10(4 / room_absorption_sabins) + 10.5;
  const room_spl_db = breakout_lw_db + room_term_db;
  const lagged_spl_db = room_spl_db - lagging_improvement_db;
  const has_lagging = lagging_improvement_db > 0;

  const has_criterion = room_criterion_db > 0;
  const over_criterion_db = has_criterion ? lagged_spl_db - room_criterion_db : 0;
  const meets_criterion = has_criterion && over_criterion_db <= 1e-12;
  // Solved from the uncapped relation, which is where a TL requirement bites.
  const tl_required_db = has_criterion ? Math.max(0, sound_power_db + area_gain_db + room_term_db - lagging_improvement_db - room_criterion_db) : 0;

  const areaVerdict = "a " + fmt(duct_width_in, 0) + " by " + fmt(duct_height_in, 0) + " in duct running " + fmt(exposed_length_ft, 0) + " ft through the space presents " + fmt(exposed_area_ft2, 0) + " sq ft of radiating surface";
  const shapeVerdict = wide_flat
    ? "AND ITS ASPECT RATIO IS " + fmt(aspect_ratio, 1) + " TO 1, which is close to the worst case. A large flat sheet-metal panel is an efficient radiator at low frequency, and the wider and flatter the panel the worse it is -- which is exactly the shape a tight ceiling forces"
    : "its aspect ratio is " + fmt(aspect_ratio, 1) + " to 1. Flat panels radiate efficiently at low frequency and the wider and flatter they are the worse, so a squarer duct is already better than a wide shallow one of the same area";
  const roundVerdict = "AN EQUAL-AREA ROUND DUCT WOULD BE " + fmt(round_diameter_in, 1) + " in, presenting " + fmt(round_area_ft2, 0) + " sq ft -- and the area is not the point. A cylinder is stiff and has no flat panels to flex, so its breakout transmission loss is dramatically higher, commonly 15 to 25 dB better at low frequency. THAT IS THE SECOND CHEAPEST FIX AND IT IS A DESIGN DECISION, not a field one";
  const levelVerdict = fmt(sound_power_db, 0) + " dB of sound power in the duct, plus " + fmt(area_gain_db, 1) + " dB for " + fmt(exposed_area_ft2, 0) + " sq ft of wall against a " + fmt(duct_cross_section_ft2, 1) + " sq ft duct section, less " + fmt(breakout_tl_db, 0) + " dB of breakout transmission loss, is " + fmt(breakout_lw_db, 1) + " dB of breakout sound power; into " + fmt(room_absorption_sabins, 0) + " sabins that is " + fmt(room_spl_db, 1) + " dB in the room";
  const laggingVerdict = !has_lagging
    ? "no lagging was entered. IT WORKS ONLY IF IT IS DONE CORRECTLY: a limp mass layer DECOUPLED from the duct by a soft layer adds transmission loss, while mass strapped directly to the metal couples to it and does much less. And because the complaint is low-frequency rumble, thin materials do almost nothing -- the required surface mass is substantial"
    : "with " + fmt(lagging_improvement_db, 0) + " dB of lagging the room level is " + fmt(lagged_spl_db, 1) + " dB. Lagging works only when the mass layer is DECOUPLED from the duct by a soft layer; mass strapped straight to the metal couples to it and does much less, and thin materials do almost nothing against low-frequency rumble";
  const criterionVerdict = !has_criterion
    ? "no room criterion was entered"
    : meets_criterion
      ? "that is inside the " + fmt(room_criterion_db, 0) + " dB criterion, with " + fmt(-over_criterion_db, 1) + " dB to spare"
      : "that is " + fmt(over_criterion_db, 1) + " dB OVER the " + fmt(room_criterion_db, 0) + " dB criterion, so the construction needs about " + fmt(tl_required_db, 0) + " dB of breakout transmission loss rather than the " + fmt(breakout_tl_db, 0) + " entered";
  const silencerVerdict = "AND A SILENCER DOES NOTHING ABOUT THIS, which is the point people get wrong. A silencer attenuates sound travelling ALONG the duct to a downstream outlet; breakout is sound leaving SIDEWAYS through the wall wherever the duct runs. A duct carrying high sound power past a quiet room radiates into it regardless of what is fitted downstream, and the noise arrives WITHOUT EVER PASSING THROUGH THE DIFFUSER. That is also how to recognise it in the field: rumble that does not change when the outlets are blanked off";
  const orderVerdict = "THE FIXES IN ORDER OF EFFECTIVENESS PER DOLLAR: route the duct outside the room, which removes the problem entirely; substitute round duct of equal area; lag with a decoupled mass layer; increase gauge or add stiffeners, which is worth a few dB and rarely enough alone. The first two are DESIGN decisions -- by the time a balancer is measuring the complaint the duct is in, and lagging a finished ceiling is expensive, which is the argument for catching it on the drawings";

  return {
    exposed_area_ft2, aspect_ratio, wide_flat, round_diameter_in, round_area_ft2,
    duct_cross_section_ft2, area_gain_db, breakout_lw_db, room_term_db,
    room_spl_db, has_lagging, lagged_spl_db, has_criterion, over_criterion_db,
    meets_criterion, tl_required_db,
    areaVerdict, shapeVerdict, roundVerdict, levelVerdict, laggingVerdict, criterionVerdict, silencerVerdict, orderVerdict,
    note: "Sound leaving a duct SIDEWAYS through its wall, into whatever room the duct passes through. This is the noise a silencer does not touch, and that is geometric rather than a matter of degree: a silencer attenuates sound travelling ALONG the duct to a downstream outlet, while breakout leaves through the wall wherever the duct runs, and arrives in the room without ever passing through a diffuser. Rumble that does not change when the outlets are blanked off is breakout. RECTANGULAR DUCT IS THE PROBLEM. A large flat sheet-metal panel is an efficient radiator at low frequency, and the wider and flatter the panel the worse it is -- so a wide shallow duct is close to the worst case, and it is also the shape a tight ceiling forces. Round duct of the same area is enormously better because a cylinder is stiff and has no flat panels to flex, commonly 15 to 25 dB better in the low bands where fan sound power is concentrated. The equal-area round diameter is computed here for exactly that comparison. LAGGING WORKS ONLY IF IT IS DONE CORRECTLY: a limp mass layer decoupled from the duct by a soft layer adds transmission loss, while mass strapped directly to the metal couples to it and does much less. And because the complaint is low-frequency rumble, thin materials do almost nothing -- the required surface mass is substantial. THE CHEAPEST FIX IS ROUTING AND THE SECOND IS ROUND DUCT, and both are design decisions rather than field ones. By the time a balancer is measuring the complaint the duct is in and the ceiling is closed, which is the argument for identifying breakout on the drawings. This computes radiating area, panel geometry and the room level from an ENTERED transmission loss and sound power. It does not predict breakout transmission loss from the duct construction, work in octave bands (breakout is a low-frequency problem and a single number hides it), estimate fan sound power, model duct-borne noise or the outlets, predict a lagging system's performance, or determine what any standard requires. ASHRAE Applications, the duct and lagging manufacturers' data, and the acoustical consultant govern.",
  };
}
export const ductBreakoutNoiseExample = { inputs: { duct_width_in: 48, duct_height_in: 12, exposed_length_ft: 20, sound_power_db: 85, breakout_tl_db: 22, room_absorption_sabins: 250, room_criterion_db: 40, lagging_improvement_db: 0 } };

// =====================================================================
// spec-v1634: silencer insertion loss, pressure drop and the noise floor.
//
// The spec ships TWO UNRENDERED PYTHON PLACEHOLDERS for its own pressure
// drop -- `{0.35*(2158/1500)**2:.2f}` is 0.72 in wc and the delta is 0.37
// -- and its 2,158 fpm is 2,160 on its own dimensions (9,000 cfm through
// 30 by 20 in is 4.1667 sq ft, not the rounded 4.17). Both are computed
// here. Placeholders now stand at ten across the campaign.
//
// The part worth building is the REGENERATED NOISE FLOOR, which the spec
// describes and does not compute: the silencer makes its own noise AFTER
// the attenuation, so above some velocity more insertion loss buys
// nothing. Energy-summing the two is what shows it.
// =====================================================================
// dims: in { airflow_cfm: L^3 T^-1, face_width_in: L, face_height_in: L, reference_drop_in_wc: M L^-1 T^-2, reference_velocity_fpm: L T^-1, alt_face_width_in: L, alt_face_height_in: L, target_velocity_fpm: L T^-1, upstream_lw_db: dimensionless, insertion_loss_db: dimensionless, regenerated_lw_db: dimensionless, fan_available_static_in_wc: M L^-1 T^-2 } out: { face_area_ft2: L^2, face_velocity_fpm: L T^-1, pressure_drop_in_wc: M L^-1 T^-2, alt_face_velocity_fpm: L T^-1, alt_pressure_drop_in_wc: M L^-1 T^-2, drop_increase_in_wc: M L^-1 T^-2, target_face_area_ft2: L^2, downstream_lw_db: dimensionless, attenuated_lw_db: dimensionless }
export function computeSilencerInsertionLoss({
  airflow_cfm = 0, face_width_in = 0, face_height_in = 0,
  reference_drop_in_wc = 0, reference_velocity_fpm = 0,
  alt_face_width_in = 0, alt_face_height_in = 0, target_velocity_fpm = 0,
  upstream_lw_db = 0, insertion_loss_db = 0, regenerated_lw_db = 0,
  fan_available_static_in_wc = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(airflow_cfm > 0)) return { error: "Airflow must be greater than zero." };
  if (!(face_width_in > 0) || !(face_height_in > 0)) return { error: "Silencer face dimensions must be greater than zero." };
  if (!(reference_drop_in_wc > 0) || !(reference_velocity_fpm > 0)) return { error: "The reference pressure drop and the velocity it was measured at must both be greater than zero." };

  const face_area_ft2 = face_width_in * face_height_in / 144;
  const face_velocity_fpm = airflow_cfm / face_area_ft2;
  // Pressure drop rises with the SQUARE of velocity.
  const pressure_drop_in_wc = reference_drop_in_wc * Math.pow(face_velocity_fpm / reference_velocity_fpm, 2);

  const has_alt = alt_face_width_in > 0 && alt_face_height_in > 0;
  const alt_face_area_ft2 = has_alt ? alt_face_width_in * alt_face_height_in / 144 : 0;
  const alt_face_velocity_fpm = has_alt ? airflow_cfm / alt_face_area_ft2 : 0;
  const alt_pressure_drop_in_wc = has_alt ? reference_drop_in_wc * Math.pow(alt_face_velocity_fpm / reference_velocity_fpm, 2) : 0;
  const drop_increase_in_wc = has_alt ? alt_pressure_drop_in_wc - pressure_drop_in_wc : 0;
  const velocity_increase_pct = has_alt ? 100 * (alt_face_velocity_fpm / face_velocity_fpm - 1) : 0;
  const drop_ratio = has_alt && pressure_drop_in_wc > 0 ? alt_pressure_drop_in_wc / pressure_drop_in_wc : 1;

  const has_target = target_velocity_fpm > 0;
  const target_face_area_ft2 = has_target ? airflow_cfm / target_velocity_fpm : 0;

  // The noise floor: the silencer's own regenerated sound power is created
  // AFTER the attenuation, so it adds on an energy basis and cannot be
  // attenuated away.
  const has_acoustics = upstream_lw_db > 0 && insertion_loss_db > 0;
  const attenuated_lw_db = has_acoustics ? upstream_lw_db - insertion_loss_db : 0;
  const has_regen = has_acoustics && regenerated_lw_db > 0;
  const downstream_lw_db = has_regen
    ? 10 * Math.log10(Math.pow(10, attenuated_lw_db / 10) + Math.pow(10, regenerated_lw_db / 10))
    : attenuated_lw_db;
  const regen_dominates = has_regen && regenerated_lw_db > attenuated_lw_db;
  const regen_penalty_db = has_regen ? downstream_lw_db - attenuated_lw_db : 0;
  // What another 10 dB of insertion loss would actually buy against the floor.
  const more_il_downstream_db = has_regen
    ? 10 * Math.log10(Math.pow(10, (attenuated_lw_db - 10) / 10) + Math.pow(10, regenerated_lw_db / 10))
    : attenuated_lw_db - 10;
  const more_il_gain_db = downstream_lw_db - more_il_downstream_db;

  const has_fan = fan_available_static_in_wc > 0;
  const static_margin_in_wc = has_fan ? fan_available_static_in_wc - pressure_drop_in_wc : 0;
  const static_short = has_fan && static_margin_in_wc < 0;

  const faceVerdict = "a " + fmt(face_width_in, 0) + " by " + fmt(face_height_in, 0) + " in face is " + fmt(face_area_ft2, 2) + " sq ft, so " + fmt(airflow_cfm, 0) + " cfm runs at " + fmt(face_velocity_fpm, 0) + " fpm and costs " + fmt(pressure_drop_in_wc, 2) + " in wc";
  const squeezeVerdict = !has_alt
    ? "no alternative face was entered. PRESSURE DROP RISES WITH THE SQUARE OF VELOCITY, so a silencer squeezed into a duct that is already undersized costs far more static than its catalogue figure suggests"
    : "SQUEEZING IT to " + fmt(alt_face_width_in, 0) + " by " + fmt(alt_face_height_in, 0) + " in takes the velocity to " + fmt(alt_face_velocity_fpm, 0) + " fpm -- a " + fmt(velocity_increase_pct, 0) + "% increase -- and the pressure drop to " + fmt(alt_pressure_drop_in_wc, 2) + " in wc, which is " + fmt(drop_ratio, 2) + " times as much. THE DROP GOES WITH THE SQUARE, so a 44% velocity increase roughly DOUBLES it, and that extra " + fmt(drop_increase_in_wc, 2) + " in wc comes out of the fan's available static";
  const targetVerdict = !has_target
    ? "no target face velocity was entered"
    : "to bring the face velocity to " + fmt(target_velocity_fpm, 0) + " fpm needs " + fmt(target_face_area_ft2, 2) + " sq ft of face -- a transition rather than a bigger duct, keeping the duct velocity wherever it needs to be and slowing the air only THROUGH the silencer";
  const regenVerdict = !has_acoustics
    ? "no sound power and insertion loss were entered"
    : !has_regen
      ? fmt(upstream_lw_db, 0) + " dB less " + fmt(insertion_loss_db, 0) + " dB of insertion loss is " + fmt(attenuated_lw_db, 0) + " dB downstream. NO REGENERATED SOUND POWER WAS ENTERED, and it is the limit people discover last -- the silencer makes its own noise AFTER the attenuation, so it sets a floor"
      : regen_dominates
        ? "THE REGENERATED NOISE IS NOW THE DOMINANT SOURCE. Attenuation takes " + fmt(upstream_lw_db, 0) + " dB down to " + fmt(attenuated_lw_db, 0) + ", but the silencer's own " + fmt(regenerated_lw_db, 0) + " dB is created AFTER the baffles and cannot be attenuated -- the downstream level is " + fmt(downstream_lw_db, 1) + " dB, which is " + fmt(regen_penalty_db, 1) + " dB above what the insertion loss alone predicts. ANOTHER 10 dB OF INSERTION LOSS WOULD BUY " + fmt(more_il_gain_db, 1) + " dB. Adding silencer length makes the system quieter on paper and no quieter in the room"
        : "attenuation takes " + fmt(upstream_lw_db, 0) + " dB down to " + fmt(attenuated_lw_db, 0) + ", and the silencer's own regenerated " + fmt(regenerated_lw_db, 0) + " dB adds " + fmt(regen_penalty_db, 1) + " dB for a downstream level of " + fmt(downstream_lw_db, 1) + " dB. The regenerated noise is not yet the floor, and another 10 dB of insertion loss would still buy " + fmt(more_il_gain_db, 1) + " dB";
  const staticVerdict = !has_fan
    ? "no fan available static was entered"
    : static_short
      ? "AND THE FAN DOES NOT HAVE IT. " + fmt(pressure_drop_in_wc, 2) + " in wc against " + fmt(fan_available_static_in_wc, 2) + " available is short by " + fmt(-static_margin_in_wc, 2) + " in wc"
      : "the fan has " + fmt(fan_available_static_in_wc, 2) + " in wc available, leaving " + fmt(static_margin_in_wc, 2) + " after the silencer";
  const couplingVerdict = "INSERTION LOSS AND PRESSURE DROP ARE NOT INDEPENDENT. The geometry that absorbs sound -- narrow passages, thick baffles -- is the geometry that restricts flow, so more attenuation costs static in the same fitting. Attenuation rises with LENGTH and so does pressure drop, but linearly; regenerated noise rises much faster with VELOCITY. That asymmetry is the whole design rule";
  const sequenceVerdict = "THE PRACTICAL SEQUENCE IS: get the face velocity down by transitioning to a larger cross-section AT the silencer, choose the length for the attenuation needed, then check the pressure drop against the fan's available static and the regenerated noise against the room criterion. Doing it in the other order produces a silencer that fits the duct and solves nothing";

  return {
    face_area_ft2, face_velocity_fpm, pressure_drop_in_wc,
    has_alt, alt_face_area_ft2, alt_face_velocity_fpm, alt_pressure_drop_in_wc,
    drop_increase_in_wc, velocity_increase_pct, drop_ratio,
    has_target, target_face_area_ft2,
    has_acoustics, attenuated_lw_db, has_regen, downstream_lw_db, regen_dominates,
    regen_penalty_db, more_il_downstream_db, more_il_gain_db,
    has_fan, static_margin_in_wc, static_short,
    faceVerdict, squeezeVerdict, targetVerdict, regenVerdict, staticVerdict, couplingVerdict, sequenceVerdict,
    note: "What a duct silencer costs in static pressure and what it actually buys in the room. Face velocity is the airflow through the silencer's own free area, and pressure drop rises with the SQUARE of it -- so a silencer squeezed into a duct that is already undersized costs far more than its catalogue figure suggests, and a 44 percent velocity increase roughly doubles the drop. INSERTION LOSS AND PRESSURE DROP ARE NOT INDEPENDENT: the geometry that absorbs sound, narrow passages and thick baffles, is the geometry that restricts flow. REGENERATED NOISE IS THE LIMIT PEOPLE DISCOVER LAST. At high face velocity the silencer generates turbulent noise of its own downstream of the baffles, and that noise is created AFTER the attenuation, so nothing removes it. Above some velocity, adding silencer length makes the system quieter on paper and no quieter in the room, because the regenerated noise has become the dominant source. Energy-summing the attenuated level and the regenerated level is what shows it, and what another ten decibels of insertion loss would actually buy against that floor is reported here, because that number is what settles the argument. Attenuation rises with LENGTH and so does pressure drop, but linearly; regenerated noise rises much faster with VELOCITY, and that asymmetry is the design rule. THE PRACTICAL SEQUENCE is to get the face velocity down by transitioning to a larger cross-section at the silencer, then choose the length for the attenuation needed, then check the drop against the fan's available static and the regenerated noise against the room criterion. A transition costs a fitting and buys back both the pressure drop and the noise floor. This scales an entered reference drop and energy-sums entered sound power figures. It does not read a manufacturer catalogue or predict insertion loss, pressure drop or regenerated noise from geometry, work in octave bands, distinguish forward from reverse flow rating (a silencer's rating differs with flow direction relative to the sound), model the duct system around it, or address breakout through the silencer's own casing. ASHRAE Applications, the silencer manufacturer's tested data, and the acoustical consultant govern.",
  };
}
export const silencerInsertionLossExample = { inputs: { airflow_cfm: 9000, face_width_in: 36, face_height_in: 24, reference_drop_in_wc: 0.35, reference_velocity_fpm: 1500, alt_face_width_in: 30, alt_face_height_in: 20, target_velocity_fpm: 1500, upstream_lw_db: 95, insertion_loss_db: 25, regenerated_lw_db: 72, fan_available_static_in_wc: 2.5 } };

// =====================================================================
// spec-v1635: mechanical room sound transmission. The subtraction is
// straightforward and every trap is in what it leaves out, so the useful
// output is the FLANKING TEST -- the gap between what the wall should
// deliver and what the room measures.
// =====================================================================
// dims: in { source_spl_db: dimensionless, partition_tl_db: dimensionless, partition_area_ft2: L^2, receiving_absorption_sabins: L^2, criterion_db: dimensionless, measured_spl_db: dimensionless, flanking_threshold_db: dimensionless } out: { received_spl_db: dimensionless, area_term_db: dimensionless, over_criterion_db: dimensionless, tl_required_db: dimensionless, measured_excess_db: dimensionless }
export function computeMechanicalRoomNc({
  source_spl_db = 0, partition_tl_db = 0, partition_area_ft2 = 0,
  receiving_absorption_sabins = 0, criterion_db = 0, measured_spl_db = 0,
  flanking_threshold_db = 5,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(source_spl_db > 0)) return { error: "The sound pressure level in the mechanical room must be greater than zero." };
  if (!(partition_tl_db > 0)) return { error: "The partition transmission loss must be greater than zero." };
  if (!(partition_area_ft2 > 0)) return { error: "The partition area must be greater than zero." };
  if (!(receiving_absorption_sabins > 0)) return { error: "The receiving room absorption must be greater than zero." };
  if (!(flanking_threshold_db > 0)) return { error: "The flanking threshold must be greater than zero." };

  const area_term_db = 10 * Math.log10(partition_area_ft2 / receiving_absorption_sabins);
  const received_spl_db = source_spl_db - partition_tl_db + area_term_db;

  const has_criterion = criterion_db > 0;
  const over_criterion_db = has_criterion ? received_spl_db - criterion_db : 0;
  const meets_criterion = has_criterion && over_criterion_db <= 1e-12;
  const tl_required_db = has_criterion ? partition_tl_db + over_criterion_db : 0;

  const has_measured = measured_spl_db > 0;
  const measured_excess_db = has_measured ? measured_spl_db - received_spl_db : 0;
  const flanking_likely = has_measured && measured_excess_db > flanking_threshold_db;
  const energy_factor = has_measured ? Math.pow(10, measured_excess_db / 10) : 1;

  const levelVerdict = fmt(source_spl_db, 0) + " dB in the mechanical room, less " + fmt(partition_tl_db, 0) + " dB of partition transmission loss, plus " + fmt(area_term_db, 1) + " dB for " + fmt(partition_area_ft2, 0) + " sq ft of partition radiating into " + fmt(receiving_absorption_sabins, 0) + " sabins, is " + fmt(received_spl_db, 1) + " dB in the receiving room";
  const criterionVerdict = !has_criterion
    ? "no room criterion was entered"
    : meets_criterion
      ? "that is inside the " + fmt(criterion_db, 0) + " dB criterion by " + fmt(-over_criterion_db, 1) + " dB"
      : "that is " + fmt(over_criterion_db, 1) + " dB OVER the " + fmt(criterion_db, 0) + " dB criterion, so the partition needs about " + fmt(tl_required_db, 0) + " dB of transmission loss rather than the " + fmt(partition_tl_db, 0) + " entered";
  const flankingVerdict = !has_measured
    ? "NO MEASURED LEVEL WAS ENTERED, AND IT IS THE MOST VALUABLE INPUT HERE. The comparison between what the wall should deliver and what the room actually reads is what separates a wall problem from a flanking problem, and the two have completely different fixes"
    : flanking_likely
      ? "THE MEASUREMENT IS " + fmt(measured_excess_db, 1) + " dB ABOVE THE CALCULATION, WHICH IS A FACTOR OF " + fmt(energy_factor, 0) + " IN ENERGY. NO WALL CONSTRUCTED AS SPECIFIED UNDERPERFORMS ITS RATING BY THAT MUCH -- THE WALL IS NOT THE PATH. Look for a partition that stops at the ceiling grid with a shared plenum over it, a duct penetrating both rooms, a shared floor slab, or an unsealed penetration. UPGRADING THE WALL HERE BUYS ALMOST NOTHING while sealing the flanking path buys all of it, and one costs a fraction of the other"
      : "the measurement is " + fmt(measured_excess_db, 1) + " dB from the calculation, inside the " + fmt(flanking_threshold_db, 1) + " dB flanking threshold -- so the wall is performing about as built, and the choice is between a better wall, a quieter machine, or vibration isolation";
  const stcVerdict = "STC DOES NOT DESCRIBE THIS. It is a single-number rating weighted for SPEECH frequencies, and mechanical equipment noise is concentrated far lower -- so a wall with a high STC can perform poorly against a chiller or a fan, and octave-band transmission loss data rather than an STC number is what this calculation needs. A partition selected on STC alone against a low-frequency source is selected on the wrong number";
  const sealVerdict = "AND A FEW SQUARE INCHES OF OPEN PENETRATION CAN UNDO AN ENTIRE ASSEMBLY, which is why sealing is not a detail. Sound follows the path of least resistance and an unsealed conduit sleeve is a very low resistance path; the wall's rating describes the wall, not the holes through it";
  const comparativeVerdict = "THE VALUE HERE IS COMPARATIVE RATHER THAN ABSOLUTE. Neither the source level nor the transmission loss is known precisely in the field, so the absolute prediction carries real uncertainty -- but the DIFFERENCE between prediction and measurement is robust, and that difference is what identifies flanking. Finding the flanking path is cheaper than any acoustic upgrade";

  return {
    area_term_db, received_spl_db, has_criterion, over_criterion_db, meets_criterion, tl_required_db,
    has_measured, measured_excess_db, flanking_likely, energy_factor,
    levelVerdict, criterionVerdict, flankingVerdict, stcVerdict, sealVerdict, comparativeVerdict,
    note: "How much of a mechanical room's noise reaches the room next door, and -- more usefully -- whether the wall is even the path. The relation is a subtraction: the source level, less the partition's transmission loss, plus a term for the partition area against the receiving room's absorption. Every trap is in what it leaves out. STC DOES NOT DESCRIBE THIS. It is a single-number rating weighted for speech frequencies, and mechanical equipment noise is concentrated far lower, so a wall with a high STC can perform poorly against a chiller or a fan. Octave-band transmission loss data rather than an STC number is what the calculation needs, and a partition selected on STC alone against a low-frequency source is selected on the wrong number. FLANKING IS WHY WALL UPGRADES DISAPPOINT. If the partition stops at the ceiling and the two rooms share a plenum, sound goes over the top and the wall's rating is nearly irrelevant; the same applies to a shared floor slab, to ducts penetrating both rooms, and to any unsealed penetration -- a few square inches of open penetration can undo an entire assembly, which is why sealing is not a detail. THE FLANKING TEST IS THE POINT OF DOING THIS AT ALL. If the calculation says the wall should deliver a given level and the room measures ten decibels higher, that is a factor of ten in energy and no wall constructed as specified underperforms by that much -- so there is a flanking path, and finding it is cheaper than any acoustic upgrade. If calculation and measurement agree, the wall is performing as built and the choice is between a better wall, a quieter machine, or vibration isolation. The absolute prediction carries real uncertainty because neither the source level nor the transmission loss is known precisely in the field; the DIFFERENCE is robust, and the difference is the finding. This is a single-band calculation on entered levels. It does not work in octave bands or compute an NC rating from a spectrum, predict transmission loss from a construction or convert an STC to band data, model flanking paths or estimate their contribution, address structure-borne transmission and vibration isolation, which is a separate and often dominant path, or determine what any standard requires. ASHRAE Applications, tested partition data, and the acoustical consultant govern.",
  };
}
export const mechanicalRoomNcExample = { inputs: { source_spl_db: 85, partition_tl_db: 38, partition_area_ft2: 200, receiving_absorption_sabins: 300, criterion_db: 40, measured_spl_db: 55, flanking_threshold_db: 5 } };

// =====================================================================
// spec-v1636: rooftop equipment wind uplift and anchorage.
//
// THE SPEC READS ITS OWN SIGN BACKWARDS. Its unit sees 1,120 lb of uplift
// and weighs 1,400, so the net is -280 lb -- the weight EXCEEDING the
// uplift by 280 -- and the spec then bolds "-280 lb still trying to lift
// it after its own weight is counted". It is not: direct uplift is fully
// resisted by the weight, and the tension on the windward fasteners comes
// entirely from the OVERTURNING COUPLE. The downstream arithmetic is
// right (its 36 lb per windward fastener checks out), so only the
// sentence is wrong -- which is exactly how this class of error survives
// review. This reports the direction IN WORDS rather than as a signed
// number, the fix carried over from the band-12 sign-convention finding.
// =====================================================================
// dims: in { unit_length_ft: L, unit_width_ft: L, unit_height_ft: L, unit_weight_lb: M L T^-2, uplift_psf: M L^-1 T^-2, lateral_psf: M L^-1 T^-2, fastener_count: dimensionless, windward_fastener_count: dimensionless, fastener_capacity_lb: M L T^-2 } out: { plan_area_ft2: L^2, uplift_lb: M L T^-2, net_uplift_lb: M L T^-2, lateral_lb: M L T^-2, overturning_ftlb: M L^2 T^-2, couple_tension_lb: M L T^-2, per_windward_lb: M L T^-2, demand_ratio: dimensionless, fasteners_required: dimensionless }
export function computeRooftopCurbUplift({
  unit_length_ft = 0, unit_width_ft = 0, unit_height_ft = 0, unit_weight_lb = 0,
  uplift_psf = 0, lateral_psf = 0, fastener_count = 0,
  windward_fastener_count = 0, fastener_capacity_lb = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(unit_length_ft > 0) || !(unit_width_ft > 0)) return { error: "Unit plan dimensions must be greater than zero." };
  if (!(unit_height_ft > 0)) return { error: "Unit height must be greater than zero." };
  if (!(unit_weight_lb > 0)) return { error: "Unit weight must be greater than zero." };
  if (!(uplift_psf > 0)) return { error: "The design uplift pressure must be greater than zero." };
  if (!(fastener_count > 0)) return { error: "The fastener count must be greater than zero." };
  if (windward_fastener_count < 0 || windward_fastener_count > fastener_count) return { error: "The windward fastener count must be between zero and the total fastener count." };
  // Until 2026-09-26 a negative lateral pressure or fastener capacity passed and turned the shares negative.
  if (lateral_psf < 0) return { error: "Enter the lateral wind pressure as a magnitude (psf, zero or more)." };
  if (fastener_capacity_lb < 0) return { error: "Fastener capacity cannot be negative (lb)." };

  const plan_area_ft2 = unit_length_ft * unit_width_ft;
  const uplift_lb = plan_area_ft2 * uplift_psf;
  // Positive means the wind wins; negative means the weight does. The
  // DIRECTION is reported in words below, never as a bare signed number.
  // ASCE 7 ASD combination 0.6 D + 0.6 W: only 0.6 of the unit's weight resists
  // uplift. Until 2026-10-01 the full weight did, and the worked unit read
  // weight-governed where the wind wins by 280 lb.
  const net_uplift_lb = uplift_lb - 0.6 * unit_weight_lb;
  const weight_governs = net_uplift_lb <= 0;
  const weight_reserve_lb = weight_governs ? -net_uplift_lb : 0;
  const uplift_pct_of_weight = 100 * uplift_lb / unit_weight_lb;

  // Lateral wind on the side profile, acting at mid-height above the curb.
  const side_area_ft2 = unit_length_ft * unit_height_ft;
  const lateral_lb = side_area_ft2 * lateral_psf;
  const lever_arm_ft = unit_height_ft / 2;
  const overturning_ftlb = lateral_lb * lever_arm_ft;
  // Resolved across the unit's width as a couple.
  const couple_tension_lb = unit_width_ft > 0 ? overturning_ftlb / unit_width_ft : 0;

  // Each fastener takes its share of the direct net uplift (which may be a
  // hold-down rather than a tension), and the windward ones additionally
  // take their share of the couple.
  const direct_share_lb = net_uplift_lb / fastener_count;
  const has_windward = windward_fastener_count > 0;
  const couple_share_lb = has_windward ? couple_tension_lb / windward_fastener_count : 0;
  const per_windward_lb = direct_share_lb + couple_share_lb;
  const couple_dominates = couple_tension_lb > Math.max(0, net_uplift_lb);

  const has_capacity = fastener_capacity_lb > 0;
  const demand_ratio = has_capacity ? per_windward_lb / fastener_capacity_lb : 0;
  const capacity_ok = has_capacity && per_windward_lb <= fastener_capacity_lb + 1e-9;
  // How many windward fasteners the couple plus the direct share needs.
  const fasteners_required = has_capacity && per_windward_lb > 0 && windward_fastener_count > 0
    ? Math.ceil(windward_fastener_count * demand_ratio) : 0;

  const upliftVerdict = "a " + fmt(unit_length_ft, 1) + " by " + fmt(unit_width_ft, 1) + " ft unit is " + fmt(plan_area_ft2, 0) + " sq ft, so " + fmt(uplift_psf, 0) + " psf of net uplift is " + fmt(uplift_lb, 0) + " lb -- " + fmt(uplift_pct_of_weight, 0) + "% of the unit's " + fmt(unit_weight_lb, 0) + " lb weight";
  const directionVerdict = weight_governs
    ? "THE WEIGHT WINS ON DIRECT UPLIFT, with " + fmt(weight_reserve_lb, 0) + " lb of reserve: the unit's " + fmt(unit_weight_lb, 0) + " lb exceeds the " + fmt(uplift_lb, 0) + " lb of uplift, so the direct wind load is fully resisted before any fastener is counted. THAT DOES NOT MEAN THE ANCHORAGE IS ADEQUATE -- the overturning couple below is a separate demand and it is the one that governs here"
    : "THE WIND WINS ON DIRECT UPLIFT by " + fmt(net_uplift_lb, 0) + " lb: " + fmt(uplift_lb, 0) + " lb of uplift against " + fmt(unit_weight_lb, 0) + " lb of weight, and that net is distributed among the fasteners before the overturning couple is added";
  const lateralVerdict = "lateral wind on the " + fmt(unit_length_ft, 1) + " by " + fmt(unit_height_ft, 1) + " ft side profile is " + fmt(lateral_lb, 0) + " lb, acting " + fmt(lever_arm_ft, 1) + " ft above the curb for an overturning moment of " + fmt(overturning_ftlb, 0) + " ft-lb. Resolved across the " + fmt(unit_width_ft, 1) + " ft width that is a couple of " + fmt(couple_tension_lb, 0) + " lb";
  const coupleVerdict = couple_dominates
    ? "AND THE COUPLE IS THE LARGER DEMAND. It adds " + fmt(couple_tension_lb, 0) + " lb of tension to the windward side, more than the direct uplift does -- which is the part that gets omitted entirely. A TALL NARROW UNIT IS HARDER TO ANCHOR THAN A LOW WIDE ONE OF THE SAME WEIGHT, because the lever arm grows and the resolving width shrinks at the same time"
    : "the couple adds " + fmt(couple_tension_lb, 0) + " lb of tension to the windward side, on top of the direct share. It is the part that gets omitted entirely, and on a tall narrow unit it exceeds the direct uplift -- the lever arm grows and the resolving width shrinks together";
  const fastenerVerdict = "PER WINDWARD FASTENER: " + fmt(direct_share_lb, 0) + " lb of direct share " + (direct_share_lb < 0 ? "(a hold-down, since the weight governs) " : "") + "plus " + fmt(couple_share_lb, 0) + " lb from the couple is " + fmt(per_windward_lb, 0) + " lb of tension" + (has_capacity ? ", against a rated " + fmt(fastener_capacity_lb, 0) + " lb -- a demand ratio of " + fmt(demand_ratio, 2) + (capacity_ok ? ", which passes" : ", which FAILS; about " + fmt(fasteners_required, 0) + " windward fasteners are needed") : ", with no fastener capacity entered");
  const loadPathVerdict = "AND THE LOAD PATH HAS TWO PARTS, THE SECOND INVISIBLE. Fastening the unit to the curb is one connection; fastening the CURB to the roof structure is another, and once the roofing is done nobody can see it. A unit adequately screwed to a curb that is only nailed to a wood deck has a load path that fails at the deck -- and roof inspections after wind events find exactly that. This checks the first connection only";
  const zoneVerdict = "THE ROOF ZONE MATTERS MORE THAN THE PRESSURE LOOKS. Uplift on a roof near an edge or a corner is much higher than in the field of the roof, and rooftop equipment has its own provisions distinct from the roof covering's -- so the pressure entered here has to be the one for the zone the unit actually sits in, at the height it actually sits. IN HIGH SEISMIC AREAS THE LATERAL SEISMIC DEMAND MAY GOVERN OVER WIND, and it is not computed here";

  return {
    plan_area_ft2, uplift_lb, net_uplift_lb, weight_governs, weight_reserve_lb, uplift_pct_of_weight,
    side_area_ft2, lateral_lb, lever_arm_ft, overturning_ftlb, couple_tension_lb, couple_dominates,
    direct_share_lb, couple_share_lb, per_windward_lb,
    has_capacity, demand_ratio, capacity_ok, fasteners_required,
    upliftVerdict, directionVerdict, lateralVerdict, coupleVerdict, fastenerVerdict, loadPathVerdict, zoneVerdict,
    note: "Whether a rooftop unit stays on its curb in a design wind, and which of the two demands actually governs. Direct uplift is the plan area times the net uplift pressure for the roof zone, and 0.6 of the unit's own weight resists it (ASCE 7 ASD) -- often entirely. THE DIRECTION IS REPORTED IN WORDS RATHER THAN AS A SIGNED NUMBER, because a negative net uplift means the WEIGHT wins and it is easy to read the sign the other way. THE OVERTURNING COUPLE IS THE PART THAT GETS OMITTED ENTIRELY, and it is frequently the larger demand. Lateral wind on the unit's side profile acts at its centroid, well above the curb, and produces a moment that resolves across the unit's width as a couple, adding tension to the windward fasteners over and above the direct share. A tall narrow unit is harder to anchor than a low wide one of the same weight, because the lever arm grows and the resolving width shrinks at the same time -- and a unit whose weight fully resists direct uplift can still need real anchorage for the couple alone. THE LOAD PATH HAS TWO PARTS AND THE SECOND IS INVISIBLE. Fastening the unit to the curb is one connection; fastening the curb to the roof structure is another, and once the roofing is done nobody can see it. A unit adequately screwed to a curb that is only nailed to a wood deck has a load path that fails at the deck, and roof inspections after wind events find exactly that. This checks the first connection only. AND THE ROOF ZONE MATTERS MORE THAN THE PRESSURE LOOKS: uplift near an edge or a corner is much higher than in the field of the roof, and rooftop equipment carries its own provisions distinct from the roof covering's. This resolves entered pressures into fastener demands. It does not determine the design wind pressures, the roof zone, or the applicable provisions, check the curb-to-deck attachment or the deck itself, evaluate the curb, the rails, or the unit's own attachment points, address seismic demand, which may govern in high seismic areas, account for fastener group effects, edge distance or substrate capacity, or determine what any standard requires. ASCE 7 as adopted, the equipment and curb manufacturers, and the engineer of record govern.",
  };
}
export const rooftopCurbUpliftExample = { inputs: { unit_length_ft: 8, unit_width_ft: 5, unit_height_ft: 4, unit_weight_lb: 1400, uplift_psf: 28, lateral_psf: 22, fastener_count: 8, windward_fastener_count: 4, fastener_capacity_lb: 400 } };

HVACACOUSTICS_RENDERERS["grille-neck-nc"] = _simpleRenderer({
  compute: computeGrilleNeckNc,
  example: grilleNeckNcExample.inputs,
  citation: "Citation: neck velocity = airflow / neck free area, with the NC rating ENTERED from the manufacturer's table at that size and flow. Sound power rises roughly with the fifth power of velocity, so a size change moves the rating by 10 log10(ratio^5). ASHRAE Applications and the outlet manufacturer's sound data govern.",
  fields: [
    { key: "airflow_cfm", label: "Airflow (cfm)" },
    { key: "neck_free_area_ft2", label: "Neck free area (sq ft)" },
    { key: "rated_nc", label: "Manufacturer NC at this flow" },
    { key: "next_size_free_area_ft2", label: "Next size up, neck free area (sq ft, 0 to skip)" },
    { key: "room_nc_target", label: "Room NC target (0 to skip)" },
    { key: "room_correction_db", label: "Room correction vs the rating basis (dB)", attrs: { step: "any" } },
    { key: "damper_at_neck", label: "Balancing damper at the neck", kind: "select", default: "no", options: [{ value: "no", label: "No -- balancing is at the branch takeoff" }, { value: "yes", label: "Yes -- damper immediately behind the outlet" }] },
  ],
  outputs: [
    { key: "neck_velocity_fpm", label: "Neck velocity", unit: "fpm", value: (r) => fmt(r.neck_velocity_fpm, 0) + " fpm" },
    { key: "effective_nc", label: "NC in this room", value: (r) => "NC " + fmt(r.effective_nc, 0) + (r.has_target ? (r.meets_target ? " -- meets the target" : " -- OVER by " + fmt(r.over_target_db, 1)) : "") },
    { key: "next_velocity_fpm", label: "One size up", unit: "fpm", value: (r) => !r.has_next ? "not entered" : fmt(r.next_velocity_fpm, 0) + " fpm (" + fmt(r.velocity_drop_pct, 0) + "% slower)" },
    { key: "nc_change_db", label: "NC change one size up", unit: "dB", value: (r) => !r.has_next ? "not entered" : fmt(r.nc_change_db, 1) + " dB, to about NC " + fmt(r.next_nc, 0) },
    { key: "cfm_at_target", label: "Airflow this size meets the target at", unit: "cfm", value: (r) => !r.has_target ? "no target entered" : fmt(r.cfm_at_target, 0) + " cfm" },
    { key: "velocityVerdict", label: "Neck velocity", value: (r) => r.velocityVerdict },
    { key: "ncVerdict", label: "Against the target", value: (r) => r.ncVerdict },
    { key: "sizeVerdict", label: "One size up", value: (r) => r.sizeVerdict },
    { key: "capacityVerdict", label: "Capacity at the criterion", value: (r) => r.capacityVerdict },
    { key: "damperVerdict", label: "The damper", value: (r) => r.damperVerdict },
    { key: "roomVerdict", label: "The room", value: (r) => r.roomVerdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});

HVACACOUSTICS_RENDERERS["duct-breakout-noise"] = _simpleRenderer({
  compute: computeDuctBreakoutNoise,
  example: ductBreakoutNoiseExample.inputs,
  citation: "Citation: radiating area from the duct perimeter and exposed length; breakout sound power Lw_out = Lw_in + 10 log10(S / A_duct) - TL (ASHRAE Applications, A_duct the duct cross-section), then the room level Lp = Lw_out + 10 log10(4 / R) + 10.5. The breakout transmission loss is ENTERED, because it depends on the duct construction and gauge. ASHRAE Applications and the acoustical consultant govern.",
  fields: [
    { key: "duct_width_in", label: "Duct width (in)" },
    { key: "duct_height_in", label: "Duct height (in)" },
    { key: "exposed_length_ft", label: "Length exposed to the space (ft)" },
    { key: "sound_power_db", label: "Sound power in the duct (dB)" },
    { key: "breakout_tl_db", label: "Breakout transmission loss (dB)" },
    { key: "room_absorption_sabins", label: "Room absorption (sabins)" },
    { key: "room_criterion_db", label: "Room criterion (dB, 0 to skip)" },
    { key: "lagging_improvement_db", label: "Lagging improvement (dB, 0 to skip)" },
  ],
  outputs: [
    { key: "exposed_area_ft2", label: "Radiating surface", unit: "sq ft", value: (r) => fmt(r.exposed_area_ft2, 0) + " sq ft" },
    { key: "aspect_ratio", label: "Aspect ratio", value: (r) => fmt(r.aspect_ratio, 1) + " to 1" + (r.wide_flat ? " -- a wide flat panel, close to the worst case" : "") },
    { key: "round_diameter_in", label: "Equal-area round duct", unit: "in", value: (r) => fmt(r.round_diameter_in, 1) + " in (typically 15 to 25 dB better at low frequency)" },
    { key: "room_spl_db", label: "Level in the room", unit: "dB", value: (r) => fmt(r.room_spl_db, 1) + " dB" + (r.has_lagging ? ", " + fmt(r.lagged_spl_db, 1) + " with the lagging entered" : "") },
    { key: "over_criterion_db", label: "Against the criterion", unit: "dB", value: (r) => !r.has_criterion ? "not entered" : r.meets_criterion ? "inside it by " + fmt(-r.over_criterion_db, 1) + " dB" : "OVER by " + fmt(r.over_criterion_db, 1) + " dB" },
    { key: "tl_required_db", label: "Transmission loss needed", unit: "dB", value: (r) => !r.has_criterion ? "not entered" : fmt(r.tl_required_db, 0) + " dB" },
    { key: "areaVerdict", label: "Radiating area", value: (r) => r.areaVerdict },
    { key: "shapeVerdict", label: "Shape", value: (r) => r.shapeVerdict },
    { key: "roundVerdict", label: "Round duct", value: (r) => r.roundVerdict },
    { key: "levelVerdict", label: "The room level", value: (r) => r.levelVerdict },
    { key: "laggingVerdict", label: "Lagging", value: (r) => r.laggingVerdict },
    { key: "criterionVerdict", label: "Against the criterion", value: (r) => r.criterionVerdict },
    { key: "silencerVerdict", label: "Why a silencer does not help", value: (r) => r.silencerVerdict },
    { key: "orderVerdict", label: "The fixes in order", value: (r) => r.orderVerdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});

HVACACOUSTICS_RENDERERS["silencer-insertion-loss"] = _simpleRenderer({
  compute: computeSilencerInsertionLoss,
  example: silencerInsertionLossExample.inputs,
  citation: "Citation: face velocity = airflow / face area; pressure drop scales with the SQUARE of face velocity from an entered reference point; the downstream sound power is the energy sum of the attenuated level and the silencer's own regenerated level, which is created after the baffles and cannot be attenuated. ASHRAE Applications and the silencer manufacturer's tested data govern.",
  fields: [
    { key: "airflow_cfm", label: "Airflow (cfm)" },
    { key: "face_width_in", label: "Silencer face width (in)" },
    { key: "face_height_in", label: "Silencer face height (in)" },
    { key: "reference_drop_in_wc", label: "Catalogue pressure drop (in wc)" },
    { key: "reference_velocity_fpm", label: "at this face velocity (fpm)" },
    { key: "alt_face_width_in", label: "Alternative face width (in, 0 to skip)" },
    { key: "alt_face_height_in", label: "Alternative face height (in)" },
    { key: "target_velocity_fpm", label: "Target face velocity (fpm, 0 to skip)" },
    { key: "upstream_lw_db", label: "Sound power upstream (dB, 0 to skip)" },
    { key: "insertion_loss_db", label: "Insertion loss (dB)" },
    { key: "regenerated_lw_db", label: "Regenerated sound power (dB, 0 to skip)" },
    { key: "fan_available_static_in_wc", label: "Fan available static (in wc, 0 to skip)" },
  ],
  outputs: [
    { key: "face_velocity_fpm", label: "Face velocity", unit: "fpm", value: (r) => fmt(r.face_velocity_fpm, 0) + " fpm across " + fmt(r.face_area_ft2, 2) + " sq ft" },
    { key: "pressure_drop_in_wc", label: "Pressure drop", unit: "in wc", value: (r) => fmt(r.pressure_drop_in_wc, 2) + " in wc" },
    { key: "alt_pressure_drop_in_wc", label: "Squeezed into the smaller face", unit: "in wc", value: (r) => !r.has_alt ? "not entered" : fmt(r.alt_pressure_drop_in_wc, 2) + " in wc at " + fmt(r.alt_face_velocity_fpm, 0) + " fpm (" + fmt(r.drop_ratio, 2) + "x)" },
    { key: "target_face_area_ft2", label: "Face area for the target velocity", unit: "sq ft", value: (r) => !r.has_target ? "not entered" : fmt(r.target_face_area_ft2, 2) + " sq ft" },
    { key: "downstream_lw_db", label: "Downstream sound power", unit: "dB", value: (r) => !r.has_acoustics ? "not entered" : fmt(r.downstream_lw_db, 1) + " dB" + (r.has_regen ? " (attenuation alone would give " + fmt(r.attenuated_lw_db, 0) + ")" : "") },
    { key: "more_il_gain_db", label: "What another 10 dB of insertion loss buys", unit: "dB", value: (r) => !r.has_acoustics ? "not entered" : fmt(r.more_il_gain_db, 1) + " dB" + (r.regen_dominates ? " -- the regenerated noise is the floor" : "") },
    { key: "static_margin_in_wc", label: "Against the fan", unit: "in wc", value: (r) => !r.has_fan ? "not entered" : r.static_short ? "SHORT by " + fmt(-r.static_margin_in_wc, 2) : fmt(r.static_margin_in_wc, 2) + " in wc spare" },
    { key: "faceVerdict", label: "Face velocity", value: (r) => r.faceVerdict },
    { key: "squeezeVerdict", label: "Squeezing it", value: (r) => r.squeezeVerdict },
    { key: "targetVerdict", label: "The transition", value: (r) => r.targetVerdict },
    { key: "regenVerdict", label: "Regenerated noise", value: (r) => r.regenVerdict },
    { key: "staticVerdict", label: "The fan", value: (r) => r.staticVerdict },
    { key: "couplingVerdict", label: "Why they trade off", value: (r) => r.couplingVerdict },
    { key: "sequenceVerdict", label: "The sequence", value: (r) => r.sequenceVerdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});

HVACACOUSTICS_RENDERERS["mechanical-room-nc"] = _simpleRenderer({
  compute: computeMechanicalRoomNc,
  example: mechanicalRoomNcExample.inputs,
  citation: "Citation: L_p2 = L_p1 - TL + 10 log10(S / A), with the transmission loss ENTERED by band -- STC is weighted for speech frequencies and mechanical noise is far lower, so an STC number is the wrong input. The flanking test compares the calculated level against a measured one. ASHRAE Applications and tested partition data govern.",
  fields: [
    { key: "source_spl_db", label: "Level in the mechanical room (dB)" },
    { key: "partition_tl_db", label: "Partition transmission loss at this band (dB)" },
    { key: "partition_area_ft2", label: "Partition area (sq ft)" },
    { key: "receiving_absorption_sabins", label: "Receiving room absorption (sabins)" },
    { key: "criterion_db", label: "Room criterion (dB, 0 to skip)" },
    { key: "measured_spl_db", label: "Measured level in the receiving room (dB, 0 to skip)" },
    { key: "flanking_threshold_db", label: "Flanking threshold (dB)" },
  ],
  outputs: [
    { key: "received_spl_db", label: "Calculated level next door", unit: "dB", value: (r) => fmt(r.received_spl_db, 1) + " dB" },
    { key: "area_term_db", label: "Area over absorption term", unit: "dB", value: (r) => fmt(r.area_term_db, 1) + " dB" },
    { key: "over_criterion_db", label: "Against the criterion", unit: "dB", value: (r) => !r.has_criterion ? "not entered" : r.meets_criterion ? "inside it by " + fmt(-r.over_criterion_db, 1) + " dB" : "OVER by " + fmt(r.over_criterion_db, 1) + " dB" },
    { key: "tl_required_db", label: "Transmission loss needed", unit: "dB", value: (r) => !r.has_criterion ? "not entered" : fmt(r.tl_required_db, 0) + " dB" },
    { key: "measured_excess_db", label: "Measured minus calculated", unit: "dB", value: (r) => !r.has_measured ? "not entered" : fmt(r.measured_excess_db, 1) + " dB" + (r.flanking_likely ? " -- FLANKING LIKELY" : "") },
    { key: "energy_factor", label: "That gap in energy", value: (r) => !r.has_measured ? "not entered" : fmt(r.energy_factor, 1) + "x" },
    { key: "levelVerdict", label: "The calculation", value: (r) => r.levelVerdict },
    { key: "criterionVerdict", label: "Against the criterion", value: (r) => r.criterionVerdict },
    { key: "flankingVerdict", label: "The flanking test", value: (r) => r.flankingVerdict },
    { key: "stcVerdict", label: "Why not STC", value: (r) => r.stcVerdict },
    { key: "sealVerdict", label: "Penetrations", value: (r) => r.sealVerdict },
    { key: "comparativeVerdict", label: "What this is good for", value: (r) => r.comparativeVerdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});

HVACACOUSTICS_RENDERERS["rooftop-curb-uplift"] = _simpleRenderer({
  compute: computeRooftopCurbUplift,
  example: rooftopCurbUpliftExample.inputs,
  citation: "Citation: uplift = plan area x the net uplift pressure for the roof zone, resisted by the unit's weight; lateral wind on the side profile acts at mid-height and resolves across the unit's width as a couple that adds tension to the windward fasteners. The design pressures are ENTERED. ASCE 7 as adopted and the engineer of record govern.",
  fields: [
    { key: "unit_length_ft", label: "Unit length (ft)" },
    { key: "unit_width_ft", label: "Unit width (ft)" },
    { key: "unit_height_ft", label: "Unit height (ft)" },
    { key: "unit_weight_lb", label: "Unit weight (lb)" },
    { key: "uplift_psf", label: "Net uplift pressure for the zone (psf)" },
    { key: "lateral_psf", label: "Lateral pressure (psf)" },
    { key: "fastener_count", label: "Total fasteners" },
    { key: "windward_fastener_count", label: "Windward fasteners" },
    { key: "fastener_capacity_lb", label: "Fastener rated tension (lb, 0 to skip)" },
  ],
  outputs: [
    { key: "uplift_lb", label: "Direct uplift", unit: "lb", value: (r) => fmt(r.uplift_lb, 0) + " lb over " + fmt(r.plan_area_ft2, 0) + " sq ft" },
    { key: "net_uplift_lb", label: "Direct uplift vs weight", value: (r) => r.weight_governs ? "the WEIGHT wins, with " + fmt(r.weight_reserve_lb, 0) + " lb of reserve" : "the WIND wins by " + fmt(r.net_uplift_lb, 0) + " lb" },
    { key: "overturning_ftlb", label: "Overturning moment", unit: "ft-lb", value: (r) => fmt(r.overturning_ftlb, 0) + " ft-lb from " + fmt(r.lateral_lb, 0) + " lb of lateral wind" },
    { key: "couple_tension_lb", label: "Couple across the width", unit: "lb", value: (r) => fmt(r.couple_tension_lb, 0) + " lb" + (r.couple_dominates ? " -- larger than the direct uplift" : "") },
    { key: "per_windward_lb", label: "Tension per windward fastener", unit: "lb", value: (r) => fmt(r.per_windward_lb, 0) + " lb" },
    { key: "demand_ratio", label: "Demand over capacity", value: (r) => !r.has_capacity ? "no capacity entered" : fmt(r.demand_ratio, 2) + (r.capacity_ok ? " -- passes" : " -- FAILS, about " + fmt(r.fasteners_required, 0) + " windward fasteners needed") },
    { key: "upliftVerdict", label: "Uplift", value: (r) => r.upliftVerdict },
    { key: "directionVerdict", label: "Which way it goes", value: (r) => r.directionVerdict },
    { key: "lateralVerdict", label: "Overturning", value: (r) => r.lateralVerdict },
    { key: "coupleVerdict", label: "The couple", value: (r) => r.coupleVerdict },
    { key: "fastenerVerdict", label: "Per fastener", value: (r) => r.fastenerVerdict },
    { key: "loadPathVerdict", label: "The second connection", value: (r) => r.loadPathVerdict },
    { key: "zoneVerdict", label: "Roof zone and seismic", value: (r) => r.zoneVerdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});
