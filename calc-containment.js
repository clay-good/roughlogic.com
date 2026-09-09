// Groups B and C: containment systems -- keeping something on the right side
// of a building boundary.
//
// spec-v1745..v1749 (scope-trade-expansion-2, the containment band): radon
// mitigation (keeping soil gas out), acid waste neutralization (keeping
// aggressive effluent out of the sewer), and laboratory ventilation (keeping
// contaminants inside a hood and inside a room).
//
// Split into its own module rather than added to calc-cross.js, which sits at
// 94.6% of its size cap; the size gate's own guidance is that a module
// brushing its cap should be split rather than have its budget raised.
// Group B for the radon and waste tiles, Group C for the laboratory ones --
// read off each spec's own header rather than inferred from the subject.
//
// Two of these deliberately compute LESS than a reader might expect, because
// the honest answer is diagnostic. A radon system's resistance is the soil,
// not the pipe, so upsizing pipe on a struggling system changes nothing and
// the useful reading is the vacuum-versus-flow signature. And a suction
// field's reach is a measurement rather than a calculation: the
// communication test is the deliverable, and it is worth running before
// anything is installed rather than after a single-point system underperforms.

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
// Compact renderer factory, copied verbatim from calc-pool.js (same
// ui-fields imports) per the new-module convention; only the inner render
// function's name differs, so the schema-coverage gates read it unchanged.
function _simpleRenderer(spec) {
  const _ctRender = function (inputRegion, outputRegion, citationEl) {
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

  _ctRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _ctRender;
}

export const CONTAINMENT_RENDERERS = {};

// =====================================================================
// spec-v1745: radon fan static pressure, pipe velocity, and the diagnostic.
// =====================================================================
//
// The spec ASSERTS a magnitude it never computes: the friction in 30 ft of
// 4 in pipe at 80 cfm is "on the order of a few hundredths of an inch of
// water column", making the pipe "a percent or two" of the system. Two
// independent methods disagree -- Darcy-Weisbach for smooth PVC gives
// 0.111 in wc and the equal-friction duct form gives 0.128, so against a
// 1.2 in wc fan the pipe is 9 to 11%, not one or two. The spec understates
// it three- to fourfold.
//
// Its CONCLUSION survives -- the soil is still around 90% of the resistance
// -- but "upsizing the pipe changes almost nothing" is overstated with it: a
// 4 to 6 inch upsize recovers most of that 9%, which on a fan already at its
// limit is not nothing. So this computes the share rather than asserting it,
// and lets the number carry the argument.
// =====================================================================
const _RADON_IN_PER_FT = 12;
const _RADON_AIR_DENSITY_LB_FT3 = 0.075;
const _RADON_KINEMATIC_VISC_FT2_S = 1.57e-4; // air at about 70 degF
const _RADON_LB_FT2_PER_IN_WC = 5.192;
// dims: in { flow_cfm: L^3 T^-1, pipe_diameter_in: L, pipe_length_ft: L, fan_static_in_wc: M L^-1 T^-2, measured_vacuum_in_wc: M L^-1 T^-2, alt_pipe_diameter_in: L } out: { area_ft2: L^2, velocity_fpm: L T^-1, pipe_loss_in_wc: M L^-1 T^-2, pipe_share_pct: dimensionless, alt_velocity_fpm: L T^-1, alt_pipe_loss_in_wc: M L^-1 T^-2 }
export function computeRadonFanStatic({
  flow_cfm = 0, pipe_diameter_in = 4, pipe_length_ft = 0, fan_static_in_wc = 0,
  measured_vacuum_in_wc = 0, alt_pipe_diameter_in = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(flow_cfm > 0)) return { error: "Flow must be positive (cfm)." };
  if (!(pipe_diameter_in > 0)) return { error: "Pipe diameter must be positive (in)." };
  if (pipe_length_ft < 0 || fan_static_in_wc < 0 || measured_vacuum_in_wc < 0 || alt_pipe_diameter_in < 0) return { error: "Length, static pressure, measured vacuum and alternative diameter cannot be negative." };
  const _areaFor = (d) => Math.PI / 4 * Math.pow(d / _RADON_IN_PER_FT, 2);
  const area_ft2 = _areaFor(pipe_diameter_in);
  const velocity_fpm = flow_cfm / area_ft2;
  // Darcy-Weisbach with the Blasius smooth-pipe friction factor, which is the
  // right regime for PVC. The equal-friction duct form assumes galvanized
  // roughness and runs about 15% higher.
  const _lossFor = (d_in, v_fpm) => {
    if (!(pipe_length_ft > 0)) return 0;
    const d_ft = d_in / _RADON_IN_PER_FT;
    const v_fps = v_fpm / 60;
    const re = v_fps * d_ft / _RADON_KINEMATIC_VISC_FT2_S;
    if (!(re > 0)) return 0;
    const f = 0.316 / Math.pow(re, 0.25);
    const head_ft_air = f * (pipe_length_ft / d_ft) * (v_fps * v_fps / 64.4);
    return head_ft_air * _RADON_AIR_DENSITY_LB_FT3 / _RADON_LB_FT2_PER_IN_WC;
  };
  const pipe_loss_in_wc = _lossFor(pipe_diameter_in, velocity_fpm);
  const velocity_verdict = fmt(pipe_diameter_in, 0) + " in pipe is " + fmt(area_ft2, 4) + " sq ft, so " + fmt(flow_cfm, 0) + " cfm runs at " + fmt(velocity_fpm, 0) + " fpm"
    + (pipe_length_ft > 0 ? ", and " + fmt(pipe_length_ft, 0) + " ft of it costs about " + fmt(pipe_loss_in_wc, 3) + " in wc of friction" : "");
  const has_fan = fan_static_in_wc > 0 && pipe_length_ft > 0;
  const pipe_share_pct = has_fan ? pipe_loss_in_wc / fan_static_in_wc * 100 : 0;
  const share_verdict = !has_fan
    ? "(no fan static pressure and pipe length entered -- and the SHARE is the whole point)"
    : "against a fan developing " + fmt(fan_static_in_wc, 2) + " in wc, the pipe is " + fmt(pipe_share_pct, 1) + "% of the system resistance. THE SOIL AND THE SUB-SLAB MATERIAL ARE THE REST, and on a normal system they are the large majority of it. That is why upsizing the pipe is rarely the fix for a struggling system -- but read the share rather than assuming it, because a long or undersized run on a fan already at its limit is a different case from a short 4 in stack";
  const has_alt = alt_pipe_diameter_in > 0;
  const alt_velocity_fpm = has_alt ? flow_cfm / _areaFor(alt_pipe_diameter_in) : 0;
  const alt_pipe_loss_in_wc = has_alt ? _lossFor(alt_pipe_diameter_in, alt_velocity_fpm) : 0;
  const alt_verdict = !has_alt
    ? "(no alternative pipe size entered)"
    : "going to " + fmt(alt_pipe_diameter_in, 0) + " in takes the velocity to " + fmt(alt_velocity_fpm, 0) + " fpm and the friction to " + fmt(alt_pipe_loss_in_wc, 3) + " in wc"
      + (has_fan ? " -- a saving of " + fmt(pipe_loss_in_wc - alt_pipe_loss_in_wc, 3) + " in wc, or " + fmt((pipe_loss_in_wc - alt_pipe_loss_in_wc) / fan_static_in_wc * 100, 1) + "% of what the fan develops. That is the whole benefit of the upsize, and it is why it does not fix a system that is not extending its suction field" : "");
  // The diagnostic that actually helps.
  const has_diagnostic = measured_vacuum_in_wc > 0 && fan_static_in_wc > 0;
  const vacuum_ratio = has_diagnostic ? measured_vacuum_in_wc / fan_static_in_wc : 0;
  const diagnostic_verdict = !has_diagnostic
    ? "THE DIAGNOSTIC IS VACUUM AGAINST FLOW, measured at the fan. HIGH VACUUM AT LOW FLOW means a tight sub-slab and a suction field that is not extending -- the fix is MORE SUCTION POINTS, not a bigger fan. LOW VACUUM AT HIGH FLOW means short-circuiting to outside air through a crack, an open sump, or an untrapped floor drain -- the fix is sealing, not more fan. Enter the measured vacuum to read this"
    : vacuum_ratio > 0.7
      ? "the fan is pulling " + fmt(measured_vacuum_in_wc, 2) + " in wc against its " + fmt(fan_static_in_wc, 2) + " in wc capability at " + fmt(flow_cfm, 0) + " cfm -- HIGH VACUUM AT LOW FLOW, which is a TIGHT SUB-SLAB. The suction field is not extending, and the fix is MORE SUCTION POINTS rather than a bigger fan. A bigger fan on a tight slab pulls harder on the same small area"
      : "the fan is pulling only " + fmt(measured_vacuum_in_wc, 2) + " in wc at " + fmt(flow_cfm, 0) + " cfm -- LOW VACUUM AT HIGH FLOW, which is SHORT-CIRCUITING. Air is coming from outside through a crack, an open sump, or an untrapped floor drain rather than from under the slab, and the fix is SEALING those paths. More fan simply moves more outdoor air";
  const curve_verdict = "AND A RADON FAN IS CHOSEN FROM ITS CURVE, NOT ITS RATING. The operating point is where the fan curve meets the system curve, and because the system curve is set by the soil it is not known until the system is running. A fan rated at a flow it will never see at a static it will never develop tells you nothing -- which is why the post-installation measurement matters more than the selection did",
    system_verdict = "THE MEASUREMENT THAT DECIDES WHETHER THE SYSTEM WORKS is the suction field under the slab, read at test holes, not the flow or the vacuum at the fan. A system can move plenty of air, develop good vacuum at the fan, and still leave part of the slab with no measurable pressure difference -- and radon enters through exactly that part";
  if (![area_ft2, velocity_fpm, pipe_loss_in_wc, pipe_share_pct, alt_velocity_fpm, alt_pipe_loss_in_wc].every(Number.isFinite)) return { error: "Radon fan math is not a finite value." };
  return {
    area_ft2, velocity_fpm, pipe_loss_in_wc, velocity_verdict,
    has_fan, pipe_share_pct, share_verdict,
    has_alt, alt_velocity_fpm, alt_pipe_loss_in_wc, alt_verdict,
    has_diagnostic, vacuum_ratio, diagnostic_verdict, curve_verdict, system_verdict,
    note: "What a radon mitigation fan is actually working against, which is almost entirely the soil and not the pipe. Pipe velocity and friction are computed here, by Darcy-Weisbach with a smooth-pipe friction factor appropriate to PVC, so the comparison can be made explicitly rather than assumed. On a short 4 in residential stack the pipe is on the order of a tenth of the resistance the fan develops -- small, and not the negligible fraction it is often described as. THAT COMPARISON IS THE POINT, because the intuitive fix for a struggling system is to upsize the pipe, and it changes almost nothing. The resistance lives under the slab, in the aggregate or the fines or the disturbed soil the suction has to travel through, and no amount of duct improves it. THE DIAGNOSTIC THAT DOES HELP IS VACUUM AGAINST FLOW, read at the fan, and it separates the two failure modes cleanly. HIGH VACUUM AT LOW FLOW means the sub-slab is tight and the suction field is not extending: the fan is doing all it can against a small communicating area, and the fix is MORE SUCTION POINTS rather than a bigger fan, which would only pull harder on the same patch. LOW VACUUM AT HIGH FLOW means the opposite -- the fan is finding an easy path to outdoor air through a crack, an open sump pit, or an untrapped floor drain, and is moving air that never passed under the slab. The fix there is sealing, and a bigger fan makes it worse by moving more outdoor air and, on a tight house, by depressurising the building enough to interfere with combustion appliances. A RADON FAN IS SELECTED FROM ITS CURVE RATHER THAN ITS RATING, because the operating point is where the fan curve crosses a system curve that the soil defines and nobody knows until the system runs. That is why the post-installation measurement matters more than the selection did, and why a fan chosen on a nameplate flow is chosen on a number it will never see. And the measurement that decides whether the system WORKS is neither of these: it is the suction field under the slab, read at test holes across the floor area. A system can move plenty of air and develop good vacuum at the fan while leaving part of the slab at no measurable pressure difference, and radon enters through exactly that part. This computes pipe velocity, friction and their share of an entered fan static. It does not select a fan or read a fan curve, predict the sub-slab resistance or the flow a given fan will achieve (which depends on the aggregate, the fines, the slab's cracks and the soil, and is not calculable in advance), size or locate suction points, measure or predict the suction field, evaluate radon concentration or a test result, address the electrical, condensate, discharge location and freeze protection a system needs, or determine what any standard requires. ANSI/AARST RMS-LB and SGM-SF, a post-mitigation radon measurement, and the certified mitigation professional govern.",
  };
}
export const radonFanStaticExample = { inputs: { flow_cfm: 80, pipe_diameter_in: 4, pipe_length_ft: 30, fan_static_in_wc: 1.2, measured_vacuum_in_wc: 1.0, alt_pipe_diameter_in: 6 } };
CONTAINMENT_RENDERERS["radon-fan-static"] = _simpleRenderer({
  citation: "Citation: pipe velocity = flow / area, and friction by Darcy–Weisbach with the Blasius smooth-pipe friction factor, which is the right regime for PVC (the equal-friction duct form assumes galvanized roughness and runs about 15% higher). The share of the fan's static that the pipe represents is COMPUTED rather than assumed. The diagnostic is vacuum against flow at the fan: high vacuum at low flow is a tight sub-slab needing more suction points, low vacuum at high flow is short-circuiting to outside air needing sealing. It does not select a fan or read a fan curve, predict sub-slab resistance, size or locate suction points, measure the suction field, or evaluate a radon result. ANSI/AARST RMS-LB and SGM-SF and the certified mitigator govern.",
  example: radonFanStaticExample.inputs,
  fields: [
    { key: "flow_cfm", label: "System flow (cfm)", kind: "number", attrs: { step: "any" } },
    { key: "pipe_diameter_in", label: "Pipe diameter (in)", kind: "number", default: 4, attrs: { step: "any" } },
    { key: "pipe_length_ft", label: "Equivalent pipe length (ft, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "fan_static_in_wc", label: "Fan static pressure (in wc, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "measured_vacuum_in_wc", label: "Measured vacuum at the fan (in wc, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "alt_pipe_diameter_in", label: "Alternative pipe diameter (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "v", id: "rfs-out-v", label: "Velocity and friction", value: (r) => r.velocity_verdict },
    { key: "s", id: "rfs-out-s", label: "The pipe's share", value: (r) => r.share_verdict },
    { key: "a", id: "rfs-out-a", label: "Upsizing the pipe", value: (r) => r.alt_verdict },
    { key: "d", id: "rfs-out-d", label: "The diagnostic", value: (r) => r.diagnostic_verdict },
    { key: "c", id: "rfs-out-c", label: "Fan curve, not rating", value: (r) => r.curve_verdict },
    { key: "y", id: "rfs-out-y", label: "What decides success", value: (r) => r.system_verdict },
    { key: "n", id: "rfs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRadonFanStatic,
});

// =====================================================================
// spec-v1746: radon sub-slab suction pit and field extension.
// =====================================================================
//
// The deliverable here is a MEASUREMENT, not a calculation. Field extension
// depends on the aggregate, the fines, the slab's cracks and the soil, and
// none of that is knowable in advance -- so the communication test is the
// design, and this turns its readings into a point count and an area.
// =====================================================================
// dims: in { slab_area_ft2: L^2, reaches_ft: L, fails_ft: L, slab_length_ft: L, slab_width_ft: L, existing_points: dimensionless } out: { effective_radius_ft: L, area_per_point_ft2: L^2, points_required: dimensionless, coverage_ratio: dimensionless, longest_dimension_ft: L }
export function computeSubSlabSuctionField({
  slab_area_ft2 = 0, reaches_ft = 0, fails_ft = 0,
  slab_length_ft = 0, slab_width_ft = 0, existing_points = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(slab_area_ft2 > 0)) return { error: "Slab area must be positive (ft^2)." };
  if (!(reaches_ft > 0)) return { error: "Enter the furthest test hole that showed measurable vacuum (ft)." };
  if (fails_ft < 0) return { error: "The failing test hole distance cannot be negative." };
  if (fails_ft > 0 && fails_ft <= reaches_ft) return { error: "The failing test hole must be further out than the one that reached." };
  if (slab_length_ft < 0 || slab_width_ft < 0 || existing_points < 0) return { error: "Slab dimensions and existing point count cannot be negative." };
  // The field is bracketed by the test: it reaches the near hole and not the far one.
  const effective_radius_ft = reaches_ft;
  const upper_bound_ft = fails_ft > 0 ? fails_ft : 0;
  const bracket_verdict = fails_ft > 0
    ? "the communication test brackets the field between " + fmt(reaches_ft, 0) + " and " + fmt(fails_ft, 0) + " ft: vacuum was measurable at " + fmt(reaches_ft, 0) + " ft and not at " + fmt(fails_ft, 0) + ". Designing on the CONFIRMED radius of " + fmt(effective_radius_ft, 0) + " ft is the conservative reading, and the difference between the two is how much more testing would buy"
    : "vacuum was measurable at " + fmt(reaches_ft, 0) + " ft, with no failing hole entered -- so the field reaches AT LEAST that far and the true radius is unknown. A hole that fails is worth more than another that succeeds, because it is the one that bounds the design";
  const area_per_point_ft2 = Math.PI * effective_radius_ft * effective_radius_ft;
  const points_required = Math.max(1, Math.ceil(slab_area_ft2 / area_per_point_ft2));
  const coverage_ratio = slab_area_ft2 / area_per_point_ft2;
  const area_verdict = "a confirmed radius of " + fmt(effective_radius_ft, 0) + " ft covers " + fmt(area_per_point_ft2, 0) + " sq ft per point, so a " + fmt(slab_area_ft2, 0) + " sq ft slab needs " + fmt(points_required, 0) + " suction point" + (points_required > 1 ? "s" : "") + " on area alone (" + fmt(coverage_ratio, 2) + " slab areas per point)";
  // Area alone is not enough: a long narrow slab needs more than a compact one.
  const has_shape = slab_length_ft > 0 && slab_width_ft > 0;
  const longest_dimension_ft = has_shape ? Math.max(slab_length_ft, slab_width_ft) : 0;
  const points_by_length = has_shape ? Math.max(1, Math.ceil(longest_dimension_ft / (2 * effective_radius_ft))) : 0;
  const shape_governs = has_shape && points_by_length > points_required;
  const shape_verdict = !has_shape
    ? "(no slab dimensions entered -- and SHAPE matters as much as area: the same square footage laid out long and narrow needs more points than a compact rectangle)"
    : shape_governs
      ? "BUT THE SHAPE GOVERNS. A " + fmt(slab_length_ft, 0) + " by " + fmt(slab_width_ft, 0) + " ft slab is " + fmt(longest_dimension_ft, 0) + " ft along its longest run, and points spaced two radii apart cover " + fmt(2 * effective_radius_ft, 0) + " ft each -- so it needs " + fmt(points_by_length, 0) + " points, not the " + fmt(points_required, 0) + " that area alone suggests. The same square footage laid out compactly would take fewer"
      : "the " + fmt(slab_length_ft, 0) + " by " + fmt(slab_width_ft, 0) + " ft layout needs " + fmt(points_by_length, 0) + " point" + (points_by_length > 1 ? "s" : "") + " along its longest run, so area governs here at " + fmt(points_required, 0);
  const governing_points = has_shape ? Math.max(points_required, points_by_length) : points_required;
  const has_existing = existing_points > 0;
  const existing_verdict = !has_existing
    ? "(no existing point count entered)"
    : existing_points >= governing_points
      ? "the " + fmt(existing_points, 0) + " existing point" + (existing_points > 1 ? "s" : "") + " meets the " + fmt(governing_points, 0) + " this test implies"
      : "the " + fmt(existing_points, 0) + " existing point" + (existing_points > 1 ? "s" : "") + " is short of the " + fmt(governing_points, 0) + " this test implies -- which is the usual finding on a system that was installed without a communication test and does not reduce radon enough";
  const fines_verdict = "THE SUB-SLAB MATERIAL DECIDES EVERYTHING, and it varies more than any other input. Clean gravel can carry a field twenty-five or thirty feet from a single point; a slab poured over compacted fines or native soil can give a field of a few feet, and that building needs several points REGARDLESS OF FAN SIZE. A bigger fan on a tight sub-slab pulls harder on the same small area, which is why fan upsizing is the wrong response to poor communication";
  const timing_verdict = "AND THAT IS THE FINDING THE COMMUNICATION TEST EXISTS TO PRODUCE -- BEFORE ANYTHING IS INSTALLED. Drilling a test hole, applying vacuum, and reading a micromanometer at candidate locations costs an hour and settles the point count. Discovering the same thing after a single-point system fails its post-mitigation test costs a second mobilisation, a second penetration, and the homeowner's confidence";
  if (![effective_radius_ft, area_per_point_ft2, points_required, coverage_ratio, longest_dimension_ft].every(Number.isFinite)) return { error: "Suction field math is not a finite value." };
  return {
    effective_radius_ft, upper_bound_ft, bracket_verdict,
    area_per_point_ft2, points_required, coverage_ratio, area_verdict,
    has_shape, longest_dimension_ft, points_by_length, shape_governs, shape_verdict, governing_points,
    has_existing, existing_verdict, fines_verdict, timing_verdict,
    note: "How many sub-slab suction points a radon system needs, from a communication test rather than from a rule. A test hole is drilled, vacuum is applied at a candidate location, and a micromanometer is read at holes at increasing distances: the field reaches the ones that show a measurable pressure difference and does not reach the ones that do not. That bracket is the design input, and this converts it into a covered area and a point count. THE MEASUREMENT IS THE DELIVERABLE, because nothing about the field is calculable in advance. It depends on the aggregate under the slab, on how much fine material has migrated into it, on the slab's own cracks and penetrations, and on the soil below -- and those vary between houses on the same street and between ends of the same house. Clean gravel can carry a field twenty-five or thirty feet from one point; a slab poured directly on compacted fines can give a field of a few feet. A BIGGER FAN DOES NOT FIX POOR COMMUNICATION. On a tight sub-slab the fan simply pulls harder on the same small area, and the far corner of the slab stays at no measurable pressure difference regardless. More suction points is the answer, and the number of them is what the test determines. SHAPE MATTERS AS MUCH AS AREA, which a coverage figure alone hides. Points cover a circle, so a long narrow slab needs points spaced along its length even where the total square footage would suggest fewer, and both checks are reported here with the larger governing. A compact rectangle and a corridor of the same area are different jobs. AND THE TIMING IS THE PRACTICAL POINT. The test costs about an hour before installation and settles the point count; the same finding after a single-point system fails its post-mitigation measurement costs a second mobilisation, another roof or rim penetration, and the homeowner's confidence in the diagnosis. This converts entered test readings into a point count. It does not predict field extension, design the pit itself (its size and the material excavated under the slab affect communication substantially), locate points against the building's layout, foundation walls, or finished areas, size the fan or the piping, address sealing of cracks, sumps, and floor drains -- which is part of the same system and often the larger effect -- evaluate a radon measurement, or determine what any standard requires. ANSI/AARST RMS-LB and SGM-SF, a diagnostic communication test, and the certified mitigation professional govern.",
  };
}
export const subSlabSuctionFieldExample = { inputs: { slab_area_ft2: 1600, reaches_ft: 25, fails_ft: 40, slab_length_ft: 80, slab_width_ft: 20, existing_points: 1 } };
CONTAINMENT_RENDERERS["sub-slab-suction-field"] = _simpleRenderer({
  citation: "Citation: a communication test brackets the suction field -- vacuum measurable at one test hole and not at a further one -- and the confirmed radius gives a covered area of πr² per point. Both AREA and SHAPE are checked, since points cover circles and a long narrow slab needs points spaced along its length; the larger count governs. Field extension is a MEASUREMENT, not a calculation: it depends on the aggregate, migrated fines, slab cracks and the soil, and a bigger fan does not fix poor communication. It does not predict field extension, design the pit, locate points against the building layout, size the fan or piping, or address sealing. ANSI/AARST RMS-LB and SGM-SF and the certified mitigator govern.",
  example: subSlabSuctionFieldExample.inputs,
  fields: [
    { key: "slab_area_ft2", label: "Slab area (ft²)", kind: "number", attrs: { step: "any" } },
    { key: "reaches_ft", label: "Furthest test hole WITH vacuum (ft)", kind: "number", attrs: { step: "any" } },
    { key: "fails_ft", label: "Nearest test hole WITHOUT vacuum (ft, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "slab_length_ft", label: "Slab length (ft, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "slab_width_ft", label: "Slab width (ft, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "existing_points", label: "Existing suction points (0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "b", id: "sss-out-b", label: "What the test brackets", value: (r) => r.bracket_verdict },
    { key: "a", id: "sss-out-a", label: "Points on area", value: (r) => r.area_verdict },
    { key: "s", id: "sss-out-s", label: "Points on shape", value: (r) => r.shape_verdict },
    { key: "e", id: "sss-out-e", label: "Against what is installed", value: (r) => r.existing_verdict },
    { key: "f", id: "sss-out-f", label: "The sub-slab material", value: (r) => r.fines_verdict },
    { key: "t", id: "sss-out-t", label: "Test before installing", value: (r) => r.timing_verdict },
    { key: "n", id: "sss-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSubSlabSuctionField,
});

// =====================================================================
// spec-v1747: acid waste neutralization tank sizing.
// =====================================================================
// dims: in { peak_flow_gpm: L^3 T^-1, retention_minutes: T, slug_volume_gal: L^3, tank_volume_gal: L^3, discharge_ph_min: dimensionless, discharge_ph_max: dimensionless, measured_ph: dimensionless } out: { required_volume_gal: L^3, turnover_minutes: T, slug_contact_minutes: T, slug_fraction_pct: dimensionless }
export function computeAcidWasteNeutralization({
  peak_flow_gpm = 0, retention_minutes = 30, slug_volume_gal = 0, tank_volume_gal = 0,
  discharge_ph_min = 5.5, discharge_ph_max = 10, measured_ph = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(peak_flow_gpm > 0)) return { error: "Peak drainage flow must be positive (gpm)." };
  if (!(retention_minutes > 0)) return { error: "Required retention time must be positive (minutes)." };
  if (slug_volume_gal < 0 || tank_volume_gal < 0 || measured_ph < 0) return { error: "Slug volume, tank volume and measured pH cannot be negative." };
  if (!(discharge_ph_max > discharge_ph_min)) return { error: "The discharge pH window must have a maximum above its minimum." };
  if (measured_ph > 14) return { error: "pH cannot exceed 14." };
  const required_volume_gal = peak_flow_gpm * retention_minutes;
  const sizing_verdict = "a " + fmt(peak_flow_gpm, 1) + " gpm peak flow at " + fmt(retention_minutes, 0) + " minutes of retention needs " + fmt(required_volume_gal, 0) + " gallons of tank";
  const has_tank = tank_volume_gal > 0;
  const actual_tank_gal = has_tank ? tank_volume_gal : required_volume_gal;
  const turnover_minutes = actual_tank_gal / peak_flow_gpm;
  const undersized = has_tank && tank_volume_gal < required_volume_gal;
  const turnover_verdict = "a " + fmt(actual_tank_gal, 0) + " gallon tank at " + fmt(peak_flow_gpm, 1) + " gpm turns over every " + fmt(turnover_minutes, 1) + " minutes, so anything entering at the start of that window has " + fmt(turnover_minutes, 1) + " minutes of contact"
    + (undersized ? " -- SHORT of the " + fmt(retention_minutes, 0) + " minutes required, so part of a slug leaves unreacted" : "");
  // The slug case is what actually sizes it.
  const has_slug = slug_volume_gal > 0;
  const slug_fraction_pct = has_slug ? slug_volume_gal / actual_tank_gal * 100 : 0;
  const slug_contact_minutes = turnover_minutes;
  const slug_verdict = !has_slug
    ? "(no slug volume entered -- and THE SLUG CASE IS WHAT ACTUALLY SIZES THE TANK, not the average flow)"
    : "a " + fmt(slug_volume_gal, 1) + " gallon slug of concentrated acid is " + fmt(slug_fraction_pct, 2) + "% of the tank's contents. THE QUESTION IS NOT WHETHER THE TANK HOLDS IT -- it obviously does -- but whether the contents can neutralise it and whether it STAYS LONG ENOUGH TO REACT. At this turnover it has " + fmt(slug_contact_minutes, 1) + " minutes. Halve the tank and it has " + fmt(slug_contact_minutes / 2, 1) + ", and part of it leaves unreacted";
  const failure_verdict = "AND THAT IS THE FAILURE MODE: it is discovered at the sewer authority's monitoring point rather than at the building. A tank sized on average flow passes almost all the time and fails on the one event that matters -- which is why the credible worst-case slug, not the daily load, is the sizing case";
  const has_ph = measured_ph > 0;
  const in_window = has_ph && measured_ph >= discharge_ph_min && measured_ph <= discharge_ph_max;
  const ph_verdict = !has_ph
    ? "(no measured discharge pH entered -- the permitted window is commonly " + fmt(discharge_ph_min, 1) + " to " + fmt(discharge_ph_max, 1) + ", and it is a LOCAL limit)"
    : in_window
      ? "a discharge pH of " + fmt(measured_ph, 2) + " is inside the " + fmt(discharge_ph_min, 1) + " to " + fmt(discharge_ph_max, 1) + " window entered"
      : measured_ph < discharge_ph_min
        ? "a discharge pH of " + fmt(measured_ph, 2) + " is BELOW the " + fmt(discharge_ph_min, 1) + " minimum -- acid is reaching the sewer, which attacks the pipe and the treatment plant's biology alike"
        : "a discharge pH of " + fmt(measured_ph, 2) + " is ABOVE the " + fmt(discharge_ph_max, 1) + " maximum -- over-neutralised, which is also a violation and usually means an active system is overdosing";
  const passive_verdict = "THE PASSIVE LIMITS ARE WHERE LIMESTONE TANKS DISAPPOINT. A chip tank neutralises dilute acid by dissolution, so the chips are consumed and must be replenished on a schedule that nobody owns after the first year; a strong acid overwhelms the available surface faster than it can dissolve; and the reaction produces carbon dioxide, which is why a tank that has stopped bubbling has usually stopped working. A passive tank suits dilute, intermittent, predictable waste -- and an active system with pH monitoring and reagent dosing is what a laboratory with real acid loads needs";
  const ph_log_verdict = "AND pH IS LOGARITHMIC, which makes the arithmetic here deceptive. Getting from pH 2 to pH 5.5 is removing more than 99.9% of the hydrogen ion, and the last part of that is the slow part -- a tank that brings strong acid most of the way in its first minutes can still spend the rest of its retention on the final stretch. Neutralisation capacity is a chemistry question this does not compute";
  if (![required_volume_gal, turnover_minutes, slug_contact_minutes, slug_fraction_pct].every(Number.isFinite)) return { error: "Neutralization tank math is not a finite value." };
  return {
    required_volume_gal, sizing_verdict,
    has_tank, actual_tank_gal, turnover_minutes, undersized, turnover_verdict,
    has_slug, slug_volume_gal, slug_fraction_pct, slug_contact_minutes, slug_verdict, failure_verdict,
    has_ph, in_window, ph_verdict, passive_verdict, ph_log_verdict,
    note: "How large an acid waste neutralization tank has to be: peak drainage flow times a required retention time. Then a harder question follows, about whether a slug of concentrated acid actually reacts before it leaves. THE SLUG CASE IS WHAT SIZES THE TANK, not the average load. A few gallons of concentrated acid emptied into a sink at once is a trivial fraction of a tank's volume, so whether the tank HOLDS it was never the question. Whether the tank's contents can neutralise it, and whether it stays long enough to react, is. A tank turns over at its volume divided by the flow, so halving the tank halves the contact time, and the part of a slug that has not reacted by then leaves. THE FAILURE IS DISCOVERED AT THE SEWER AUTHORITY'S MONITORING POINT rather than at the building, which is what makes it worth sizing for. A tank set on average flow passes almost every day and fails on the one event that mattered, and the record of that failure arrives as a notice of violation rather than as an alarm. pH IS LOGARITHMIC, AND THAT MAKES THIS DECEPTIVE. Going from pH 2 to the bottom of a typical discharge window removes more than 99.9 percent of the hydrogen ion, and the last stretch is the slow one -- a tank that brings strong acid most of the way in its first minutes can spend the rest of its retention finishing. The neutralisation capacity itself is a chemistry question this does not compute; retention time only says how long there is to do it in. THE PASSIVE LIMITS ARE WHERE LIMESTONE TANKS DISAPPOINT. A chip tank works by dissolution, so the chips are consumed and need replenishing on a schedule that nobody owns after the first year, a strong acid overwhelms the available surface faster than it can dissolve, and the reaction gives off carbon dioxide -- a tank that has stopped bubbling has usually stopped working, which is the one field check available. Passive tanks suit dilute, intermittent and predictable waste; a laboratory with real acid loads needs an active system with pH monitoring and reagent dosing, and the two are not interchangeable at any size. This sizes on entered flow and retention. It does not compute neutralisation capacity, reagent demand, or the reaction rate, determine the required retention time or the permitted discharge pH -- both are LOCAL limits set by the sewer authority and they differ between jurisdictions -- size a passive tank's chip volume or its replenishment interval, address venting, materials compatibility, or the separate handling that hydrofluoric acid, heavy metals, solvents and other regulated constituents require, or evaluate a discharge permit. The local sewer authority's limits, the plumbing code, and the design engineer govern.",
  };
}
export const acidWasteNeutralizationExample = { inputs: { peak_flow_gpm: 25, retention_minutes: 30, slug_volume_gal: 5, tank_volume_gal: 750, discharge_ph_min: 5.5, discharge_ph_max: 10, measured_ph: 7.2 } };
CONTAINMENT_RENDERERS["acid-waste-neutralization"] = _simpleRenderer({
  citation: "Citation: tank volume = peak drainage flow × required retention, with the turnover time (volume / flow) giving the contact a slug entering the tank actually gets. The required retention and the permitted discharge pH window are LOCAL limits set by the sewer authority and are ENTERED; 5.5 to 10 is common but jurisdictional. pH is logarithmic, so most of the neutralisation happens early and the last stretch is the slow one. It does not compute neutralisation capacity, reagent demand or reaction rate, size a limestone chip volume or its replenishment, address venting or materials compatibility, or cover the separate handling that hydrofluoric acid, heavy metals and solvents require. The sewer authority's limits and the design engineer govern.",
  example: acidWasteNeutralizationExample.inputs,
  fields: [
    { key: "peak_flow_gpm", label: "Peak drainage flow (gpm)", kind: "number", attrs: { step: "any" } },
    { key: "retention_minutes", label: "Required retention (min)", kind: "number", default: 30, attrs: { step: "any" } },
    { key: "tank_volume_gal", label: "Actual tank volume (gal, 0 to size it)", kind: "number", attrs: { step: "any" } },
    { key: "slug_volume_gal", label: "Credible worst-case slug (gal, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "discharge_ph_min", label: "Permitted discharge pH, minimum", kind: "number", default: 5.5, attrs: { step: "any" } },
    { key: "discharge_ph_max", label: "Permitted discharge pH, maximum", kind: "number", default: 10, attrs: { step: "any" } },
    { key: "measured_ph", label: "Measured discharge pH (0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "s", id: "awn-out-s", label: "Tank size", value: (r) => r.sizing_verdict },
    { key: "t", id: "awn-out-t", label: "Turnover and contact", value: (r) => r.turnover_verdict },
    { key: "g", id: "awn-out-g", label: "The slug case", value: (r) => r.slug_verdict },
    { key: "f", id: "awn-out-f", label: "Where it fails", value: (r) => r.failure_verdict },
    { key: "p", id: "awn-out-p", label: "Discharge pH", value: (r) => r.ph_verdict },
    { key: "l", id: "awn-out-l", label: "Passive tank limits", value: (r) => r.passive_verdict },
    { key: "o", id: "awn-out-o", label: "Why pH is deceptive", value: (r) => r.ph_log_verdict },
    { key: "n", id: "awn-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAcidWasteNeutralization,
});

// =====================================================================
// spec-v1748: fume hood face velocity and exhaust CFM.
// =====================================================================
const _HOOD_SENSIBLE_COEFF = 1.08;
// dims: in { sash_width_ft: L, sash_height_in: L, face_velocity_fpm: L T^-1, alt_sash_height_in: L, heating_rise_f: T, hours_per_year: T, energy_cost_per_mmbtu: dimensionless, too_fast_fpm: L T^-1 } out: { open_area_ft2: L^2, exhaust_cfm: L^3 T^-1, alt_open_area_ft2: L^2, alt_exhaust_cfm: L^3 T^-1, extra_cfm: L^3 T^-1, heating_btuh: L^2 M T^-3, annual_cost: dimensionless }
export function computeFumeHoodFaceVelocity({
  sash_width_ft = 0, sash_height_in = 0, face_velocity_fpm = 100,
  alt_sash_height_in = 0, heating_rise_f = 0, hours_per_year = 0,
  energy_cost_per_mmbtu = 0, too_fast_fpm = 125,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(sash_width_ft > 0)) return { error: "Sash width must be positive (ft)." };
  if (!(sash_height_in > 0)) return { error: "Sash height must be positive (in)." };
  if (!(face_velocity_fpm > 0)) return { error: "Face velocity must be positive (fpm)." };
  if (alt_sash_height_in < 0 || heating_rise_f < 0 || hours_per_year < 0 || energy_cost_per_mmbtu < 0) return { error: "Alternative sash, heating rise, hours and cost cannot be negative." };
  if (!(too_fast_fpm > 0)) return { error: "The turbulence threshold must be positive (fpm)." };
  const open_area_ft2 = sash_width_ft * sash_height_in / 12;
  const exhaust_cfm = open_area_ft2 * face_velocity_fpm;
  const flow_verdict = "a " + fmt(sash_width_ft, 1) + " ft hood at a " + fmt(sash_height_in, 0) + " in sash is " + fmt(open_area_ft2, 2) + " sq ft of opening, so " + fmt(face_velocity_fpm, 0) + " fpm takes " + fmt(exhaust_cfm, 0) + " cfm";
  const too_fast = face_velocity_fpm > too_fast_fpm;
  const velocity_verdict = too_fast
    ? "AND " + fmt(face_velocity_fpm, 0) + " FPM IS ABOVE THE " + fmt(too_fast_fpm, 0) + " FPM THRESHOLD ENTERED, which is the part people get backwards. Too fast is not safer: above roughly this figure, turbulence at the face and in the wake of anyone standing at the hood can pull contaminants OUT rather than in. Face velocity has an optimum, not a floor"
    : fmt(face_velocity_fpm, 0) + " fpm is within the " + fmt(too_fast_fpm, 0) + " fpm threshold entered. Too fast is not safer -- above that figure, turbulence at the face and in the wake of a person standing at the hood can pull contaminants OUT rather than in";
  const has_alt = alt_sash_height_in > 0;
  const alt_open_area_ft2 = has_alt ? sash_width_ft * alt_sash_height_in / 12 : 0;
  const alt_exhaust_cfm = has_alt ? alt_open_area_ft2 * face_velocity_fpm : 0;
  const extra_cfm = has_alt ? alt_exhaust_cfm - exhaust_cfm : 0;
  const sash_verdict = !has_alt
    ? "(no alternative sash height entered -- and the sash position is the single largest variable here)"
    : "at a " + fmt(alt_sash_height_in, 0) + " in sash the same hood takes " + fmt(alt_exhaust_cfm, 0) + " cfm -- " + fmt(Math.abs(extra_cfm), 0) + " cfm " + (extra_cfm > 0 ? "MORE" : "less") + ", continuously, for a sash left at that height. That air is conditioned and thrown away, and the sash is the one control the user actually touches";
  const has_energy = heating_rise_f > 0 && has_alt && extra_cfm > 0;
  const heating_btuh = has_energy ? _HOOD_SENSIBLE_COEFF * extra_cfm * heating_rise_f : 0;
  const has_cost = has_energy && hours_per_year > 0 && energy_cost_per_mmbtu > 0;
  const annual_cost = has_cost ? heating_btuh * hours_per_year / 1e6 * energy_cost_per_mmbtu : 0;
  const energy_verdict = !has_energy
    ? "(no heating rise and alternative sash entered)"
    : "heating that extra " + fmt(extra_cfm, 0) + " cfm through a " + fmt(heating_rise_f, 0) + " degF rise is " + fmt(heating_btuh / 1000, 1) + " kBTU/h"
      + (has_cost ? ", or " + fmt(annual_cost, 0) + " a year over " + fmt(hours_per_year, 0) + " hours at " + fmt(energy_cost_per_mmbtu, 2) + " per MMBTU -- for one hood, from a sash nobody closed" : " -- and that is one hood, continuously, from a sash nobody closed");
  const containment_verdict = "AND FACE VELOCITY IS A SURROGATE, NOT THE MEASUREMENT. It is easy to read with an anemometer and it correlates loosely with containment, which is why it became the field check -- but what actually matters is whether the hood keeps contaminants inside it, and that is what ASHRAE 110 tracer gas testing determines. A hood can pass a face velocity survey and fail containment because of cross-drafts from a door or a diffuser, a person walking past, clutter blocking the rear baffle, or equipment set too close to the face";
  const practice_verdict = "THE SASH IS THE CONTROL THAT MATTERS and it is behavioural rather than mechanical. Working at the lowest practical sash height improves containment AND cuts the exhaust on a variable-air-volume hood, so the two goals point the same way -- which is unusual enough to be worth saying to users, because the instinct is that more open is safer";
  if (![open_area_ft2, exhaust_cfm, alt_open_area_ft2, alt_exhaust_cfm, extra_cfm, heating_btuh, annual_cost].every(Number.isFinite)) return { error: "Fume hood math is not a finite value." };
  return {
    open_area_ft2, exhaust_cfm, flow_verdict, too_fast, velocity_verdict,
    has_alt, alt_open_area_ft2, alt_exhaust_cfm, extra_cfm, sash_verdict,
    has_energy, heating_btuh, has_cost, annual_cost, energy_verdict,
    containment_verdict, practice_verdict,
    note: "The air a fume hood exhausts: its open face area times the face velocity. Two things make that simple product worth stating. THE SASH POSITION IS THE LARGEST VARIABLE AND THE ONLY ONE A USER TOUCHES. A hood at full sash open needs far more air than the same hood at a working height, and on a variable-air-volume hood that difference is continuous: a sash left up overnight exhausts conditioned air all night for no benefit. The energy in that air is real and it belongs to the building, not the laboratory, which is why it is often nobody's problem until someone adds it up. TOO FAST IS NOT SAFER, WHICH IS THE PART PEOPLE GET BACKWARDS. Face velocity has an optimum rather than a floor. Above roughly 125 feet per minute, turbulence at the face and in the wake of a person standing at the hood can pull contaminants OUT of it, so a hood running well above its design velocity may contain worse than one at specification. Raising the setpoint is not a safety improvement, and a hood that fails a containment test does not usually need more air. AND FACE VELOCITY IS A SURROGATE FOR THE THING THAT MATTERS. It became the field check because an anemometer is cheap and quick and the reading correlates loosely with containment. What actually matters is whether the hood keeps material inside it, and that is what tracer gas testing to ASHRAE 110 determines. A hood can pass a face velocity survey and fail containment outright because of a cross-draft from a door or a ceiling diffuser, someone walking past, clutter blocking the rear baffle, or a large piece of equipment set too near the face -- none of which a face velocity reading sees. THE USEFUL PRACTICE MESSAGE IS THAT THE TWO GOALS AGREE. Working at the lowest practical sash height improves containment and cuts the exhaust at the same time, which is unusual enough to be worth telling users directly, because the instinct is that a more open hood is a safer one. This computes airflow from an entered geometry and velocity. It does not evaluate containment or substitute for tracer gas testing, determine the required face velocity (which the applicable standard and the institution set, and which varies with the material handled), address hood type -- constant volume, variable volume, auxiliary air and ductless hoods behave differently -- size ductwork, an exhaust fan or a stack, evaluate the discharge height and re-entrainment, or address the room-level airflow and pressure the hood depends on. ASHRAE 110, ANSI/AIHA Z9.5, the institution's chemical hygiene plan, and the industrial hygienist govern.",
  };
}
export const fumeHoodFaceVelocityExample = { inputs: { sash_width_ft: 6, sash_height_in: 18, face_velocity_fpm: 100, alt_sash_height_in: 30, heating_rise_f: 60, hours_per_year: 8760, energy_cost_per_mmbtu: 12, too_fast_fpm: 125 } };
CONTAINMENT_RENDERERS["fume-hood-face-velocity"] = _simpleRenderer({
  citation: "Citation: exhaust CFM = sash open area × face velocity, with the sensible heating load on the extra air = 1.08 × cfm × °F rise. The required face velocity is ENTERED because the applicable standard and the institution set it, and it varies with the material handled. TOO FAST IS NOT SAFER: above roughly 125 fpm, turbulence at the face and in a worker's wake can pull contaminants OUT. Face velocity is a SURROGATE -- containment is what matters, and ASHRAE 110 tracer gas testing is what determines it. It does not evaluate containment, determine the required velocity, address hood type, size ductwork, a fan or a stack, or evaluate discharge height and re-entrainment. ASHRAE 110, ANSI/AIHA Z9.5 and the industrial hygienist govern.",
  example: fumeHoodFaceVelocityExample.inputs,
  fields: [
    { key: "sash_width_ft", label: "Hood width (ft)", kind: "number", attrs: { step: "any" } },
    { key: "sash_height_in", label: "Sash working height (in)", kind: "number", attrs: { step: "any" } },
    { key: "face_velocity_fpm", label: "Face velocity (fpm)", kind: "number", default: 100, attrs: { step: "any" } },
    { key: "alt_sash_height_in", label: "Alternative sash height (in, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "heating_rise_f", label: "Heating temperature rise (°F, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "hours_per_year", label: "Hours per year at that sash (0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "energy_cost_per_mmbtu", label: "Energy cost per MMBTU (0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "too_fast_fpm", label: "Turbulence threshold (fpm)", kind: "number", default: 125, attrs: { step: "any" } },
  ],
  outputs: [
    { key: "f", id: "fhv-out-f", label: "Exhaust airflow", value: (r) => r.flow_verdict },
    { key: "v", id: "fhv-out-v", label: "Is it too fast", value: (r) => r.velocity_verdict },
    { key: "s", id: "fhv-out-s", label: "At another sash height", value: (r) => r.sash_verdict },
    { key: "e", id: "fhv-out-e", label: "The energy in that air", value: (r) => r.energy_verdict },
    { key: "c", id: "fhv-out-c", label: "Velocity is a surrogate", value: (r) => r.containment_verdict },
    { key: "p", id: "fhv-out-p", label: "The sash is the control", value: (r) => r.practice_verdict },
    { key: "n", id: "fhv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFumeHoodFaceVelocity,
});

// =====================================================================
// spec-v1749: laboratory air change rate and containment pressure.
// =====================================================================
//
// Defers on two shared quantities rather than restating them. The ACH from a
// volume is `air-changes-hour`, which also compares against the ASHRAE
// occupancy bands; the door undercut free area for a transfer flow is
// `door-undercut-transfer-air`, which carries the 300 fpm noise ceiling that
// actually limits it. What is computed here is the OFFSET and whether the
// relationship survives a VAV hood swing, which is the question a lab
// designer is actually asking.
// =====================================================================
// dims: in { room_volume_ft3: L^3, required_ach: T^-1, hood_exhaust_cfm: L^3 T^-1, general_exhaust_cfm: L^3 T^-1, supply_cfm: L^3 T^-1, hood_sash_closed_cfm: L^3 T^-1, supply_drift_pct: dimensionless } out: { ach_airflow_cfm: L^3 T^-1, total_exhaust_cfm: L^3 T^-1, offset_cfm: L^3 T^-1, offset_pct: dimensionless, governing_cfm: L^3 T^-1, sash_swing_cfm: L^3 T^-1, drift_cfm: L^3 T^-1 }
export function computeLabContainmentPressure({
  room_volume_ft3 = 0, required_ach = 0, hood_exhaust_cfm = 0, general_exhaust_cfm = 0,
  supply_cfm = 0, hood_sash_closed_cfm = 0, supply_drift_pct = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(room_volume_ft3 > 0)) return { error: "Room volume must be positive (ft^3)." };
  if (!(required_ach > 0)) return { error: "The required air change rate must be positive." };
  if (hood_exhaust_cfm < 0 || general_exhaust_cfm < 0 || supply_cfm < 0) return { error: "Airflows cannot be negative." };
  if (hood_sash_closed_cfm < 0 || hood_sash_closed_cfm > hood_exhaust_cfm) return { error: "The sash-closed hood flow must be between 0 and the open-sash flow." };
  if (supply_drift_pct < 0 || supply_drift_pct > 100) return { error: "Supply drift must be between 0 and 100 percent." };
  const ach_airflow_cfm = room_volume_ft3 * required_ach / 60;
  const total_exhaust_cfm = hood_exhaust_cfm + general_exhaust_cfm;
  const governing_cfm = Math.max(ach_airflow_cfm, total_exhaust_cfm);
  const hoods_govern = total_exhaust_cfm >= ach_airflow_cfm;
  const rate_verdict = fmt(required_ach, 1) + " air changes an hour in " + fmt(room_volume_ft3, 0) + " cu ft is " + fmt(ach_airflow_cfm, 0) + " cfm, and the hoods plus general exhaust come to " + fmt(total_exhaust_cfm, 0) + " -- so "
    + (hoods_govern
      ? "THE HOODS GOVERN the ventilation rate at " + fmt(governing_cfm, 0) + " cfm, and the air change requirement is satisfied as a by-product"
      : "THE AIR CHANGE REQUIREMENT GOVERNS at " + fmt(governing_cfm, 0) + " cfm, so general exhaust has to make up the difference");
  const has_supply = supply_cfm > 0;
  const offset_cfm = has_supply ? total_exhaust_cfm - supply_cfm : 0;
  const offset_pct = has_supply && total_exhaust_cfm > 0 ? offset_cfm / total_exhaust_cfm * 100 : 0;
  const negative = has_supply && offset_cfm > 0;
  const offset_verdict = !has_supply
    ? "(no supply airflow entered -- and the OFFSET is what holds the pressure relationship)"
    : negative
      ? "supply at " + fmt(supply_cfm, 0) + " cfm against " + fmt(total_exhaust_cfm, 0) + " of exhaust is an offset of " + fmt(offset_cfm, 0) + " cfm, about " + fmt(offset_pct, 1) + "% -- the room runs NEGATIVE to the corridor, which is the intended direction for a chemical laboratory"
      : "supply at " + fmt(supply_cfm, 0) + " cfm EXCEEDS the " + fmt(total_exhaust_cfm, 0) + " of exhaust by " + fmt(-offset_cfm, 0) + " cfm -- the room runs POSITIVE, which pushes laboratory air into the corridor. That is the intended direction for a cleanroom or some pharmacy areas and the wrong one for a chemical laboratory, and getting it backwards is not an error of degree";
  // The fragility: a small offset inside a large exhaust.
  const has_drift = supply_drift_pct > 0 && has_supply;
  const drift_cfm = has_drift ? supply_cfm * supply_drift_pct / 100 : 0;
  const drift_swamps = has_drift && drift_cfm > Math.abs(offset_cfm);
  const drift_verdict = !has_drift
    ? "(no supply drift entered -- and the fragility of a small offset inside a large exhaust is the practical finding)"
    : drift_swamps
      ? "AND THAT OFFSET IS FRAGILE. A " + fmt(supply_drift_pct, 0) + "% drift in the supply -- a filter loading, a damper creeping, a balance falling out -- is " + fmt(drift_cfm, 0) + " cfm, which is MORE than the entire " + fmt(Math.abs(offset_cfm), 0) + " cfm offset. The room reverses with nothing visibly wrong, and nothing in the space announces it"
      : "a " + fmt(supply_drift_pct, 0) + "% supply drift is " + fmt(drift_cfm, 0) + " cfm against a " + fmt(Math.abs(offset_cfm), 0) + " cfm offset, so the relationship survives it with " + fmt(Math.abs(offset_cfm) - drift_cfm, 0) + " cfm in hand";
  // The VAV sash swing, which is larger still.
  const has_sash = hood_sash_closed_cfm > 0 && hood_exhaust_cfm > 0;
  const sash_swing_cfm = has_sash ? hood_exhaust_cfm - hood_sash_closed_cfm : 0;
  const positive_on_close = has_sash && has_supply && (supply_cfm - (hood_sash_closed_cfm + general_exhaust_cfm)) > 0;
  const sash_verdict = !has_sash
    ? "(no sash-closed hood flow entered -- and on a VAV hood the swing is larger than any drift)"
    : "THE VAV HOOD SWING IS LARGER STILL. A sash closing takes the hood from " + fmt(hood_exhaust_cfm, 0) + " to " + fmt(hood_sash_closed_cfm, 0) + " cfm -- a " + fmt(sash_swing_cfm, 0) + " cfm change"
      + (has_supply
        ? (positive_on_close
          ? ". If the supply does not track it, the room goes " + fmt(supply_cfm - (hood_sash_closed_cfm + general_exhaust_cfm), 0) + " cfm POSITIVE and contaminants flow out to the corridor. THE CONTROL SYSTEM, NOT THE BALANCE, IS WHAT HOLDS THE RELATIONSHIP, and a VAV laboratory whose supply does not track its hoods is positive whenever a sash closes"
          : ". Even with the sash closed the room stays negative here, because the general exhaust alone still exceeds the supply -- which is the arrangement that survives a control failure")
        : ". Without a supply figure the direction cannot be checked");
  const defer_verdict = "TWO QUANTITIES ARE DELIBERATELY NOT RECOMPUTED HERE. The air change rate against occupancy targets belongs to the air changes per hour calculation, and the door undercut free area a transfer flow needs belongs to the door undercut transfer air calculation -- which carries the noise ceiling that actually limits it, since a gap will pass almost any airflow if you push hard enough and the occupants hear it. A tightly weatherstripped door starves the offset and the differential reads deep without the flow following, which looks like a good pressure reading and a room that is not being swept";
  if (![ach_airflow_cfm, total_exhaust_cfm, offset_cfm, offset_pct, governing_cfm, sash_swing_cfm, drift_cfm].every(Number.isFinite)) return { error: "Laboratory containment math is not a finite value." };
  return {
    ach_airflow_cfm, total_exhaust_cfm, governing_cfm, hoods_govern, rate_verdict,
    has_supply, offset_cfm, offset_pct, negative, offset_verdict,
    has_drift, drift_cfm, drift_swamps, drift_verdict,
    has_sash, sash_swing_cfm, positive_on_close, sash_verdict, defer_verdict,
    note: "Whether a laboratory holds its pressure relationship. It is a question about the OFFSET between exhaust and supply, not either one. The air change rate sets a floor on ventilation, the hoods usually exceed it, and the larger of the two governs -- so on most chemical laboratories the hoods set the ventilation rate and the air change requirement is satisfied as a by-product. THE OFFSET IS SMALL AND THE FLOWS AROUND IT ARE LARGE, WHICH IS THE FRAGILITY. Holding a room negative takes a modest excess of exhaust over supply -- commonly a few percent or a fixed figure -- sitting inside total flows an order of magnitude bigger. A supply filter loading by ten percent moves more air than the entire offset, and the room reverses with nothing visibly wrong: no alarm, no noise, no change a person in the space would notice. That is why a pressure relationship is monitored rather than balanced once. THE VAV HOOD SWING IS LARGER THAN ANY DRIFT. A sash closing can take a hood's exhaust down by hundreds of cfm in seconds, and if the supply does not track it the room goes positive and pushes laboratory air into the corridor. The control system, not the balance, is what holds the relationship on a variable-volume laboratory -- and an arrangement where the general exhaust alone still exceeds the supply is the one that survives a control failure, which is worth knowing when choosing between them. AND THE DIRECTION IS A HAZARD DECISION RATHER THAN A PREFERENCE. Most chemical laboratories are negative to the corridor so that anything released stays in. Cleanrooms, some biological areas and pharmacy compounding spaces are positive so that nothing gets in. Getting it backwards is not an error of degree, and a space that is both -- a compounding pharmacy handling hazardous drugs -- needs an anteroom to reconcile the two. This computes the offset and screens it. It does not model the room's pressure differential in inches of water column, which depends on the leakage paths and is measured rather than calculated, size or evaluate the door undercut and transfer path -- that calculation carries a noise ceiling that limits it, and a tightly weatherstripped door starves the offset while the differential reads deep -- compare the air change rate against occupancy targets, which the air changes per hour calculation does, determine the required rate, offset or differential for any occupancy, size supply or exhaust equipment, or address the control sequence, monitoring and alarms a containment space needs. ANSI/AIHA Z9.5, ASHRAE 170 where it applies, the institution's chemical hygiene plan, and the design engineer govern.",
  };
}
export const labContainmentPressureExample = { inputs: { room_volume_ft3: 9600, required_ach: 8, hood_exhaust_cfm: 1200, general_exhaust_cfm: 80, supply_cfm: 1180, hood_sash_closed_cfm: 400, supply_drift_pct: 10 } };
CONTAINMENT_RENDERERS["lab-containment-pressure"] = _simpleRenderer({
  citation: "Citation: the air change airflow = volume × ACH / 60, the total exhaust is the hoods plus general, and the LARGER governs the ventilation rate; the offset is exhaust less supply, and its sign is the pressure direction. Deliberately DEFERS on two shared quantities: the ACH-versus-occupancy comparison belongs to `air-changes-hour`, and the door undercut free area to `door-undercut-transfer-air`, which carries the ~300 fpm noise ceiling that actually limits a transfer path. It does not model the pressure differential in inches of water column (that depends on leakage paths and is measured), determine the required rate, offset or differential, size equipment, or address the control sequence and alarms. ANSI/AIHA Z9.5, ASHRAE 170 where it applies, and the design engineer govern.",
  example: labContainmentPressureExample.inputs,
  fields: [
    { key: "room_volume_ft3", label: "Room volume (ft³)", kind: "number", attrs: { step: "any" } },
    { key: "required_ach", label: "Required air changes per hour", kind: "number", attrs: { step: "any" } },
    { key: "hood_exhaust_cfm", label: "Hood exhaust, sash open (cfm)", kind: "number", attrs: { step: "any" } },
    { key: "general_exhaust_cfm", label: "General exhaust (cfm)", kind: "number", attrs: { step: "any" } },
    { key: "supply_cfm", label: "Supply airflow (cfm, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "hood_sash_closed_cfm", label: "Hood exhaust, sash closed (cfm, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "supply_drift_pct", label: "Supply drift to test (%, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "r", id: "lcp-out-r", label: "What sets the rate", value: (r) => r.rate_verdict },
    { key: "o", id: "lcp-out-o", label: "The offset", value: (r) => r.offset_verdict },
    { key: "d", id: "lcp-out-d", label: "How fragile it is", value: (r) => r.drift_verdict },
    { key: "s", id: "lcp-out-s", label: "The VAV sash swing", value: (r) => r.sash_verdict },
    { key: "f", id: "lcp-out-f", label: "What is computed elsewhere", value: (r) => r.defer_verdict },
    { key: "n", id: "lcp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLabContainmentPressure,
});
