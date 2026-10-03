// Group J: trucking field-operations calculators.
//
// Split intact from calc-trucking.js by spec-v1874. Calculator IDs, formulas,
// fields, outputs, citations, examples, and Group J assignments are unchanged.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt, makeRowField,
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
  const _rlRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id || f.key, f.options);
      else if (f.kind === "checkbox") field = makeCheckbox(f.label, f.id || f.key);
      else field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) {
        if (f.kind === "select") field.select.value = f.default;
        else if (f.kind === "checkbox") field.input.checked = !!f.default;
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
        else if (f.kind === "checkbox") fields[f.key].input.checked = !!v[f.key];
        else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) {
        if (f.kind === "select") params[f.key] = fields[f.key].select.value;
        else if (f.kind === "checkbox") params[f.key] = fields[f.key].input.checked;
        else params[f.key] = Number(fields[f.key].input.value) || 0;
      }
      const r = spec.compute(params);
      if (r.error) {
        for (const k of Object.keys(outs)) outs[k].textContent = "-";
        outs[spec.outputs[0].key].textContent = r.error;
        return;
      }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener(f.kind === "checkbox" ? "change" : "input", update);
    }
  };

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

export const TRUCKINGFIELD_RENDERERS = {};

// ===========================================================================
// spec-v1377..v1385: the 2026-08-26 trade-expansion Group J band.
// See specs/scope-trade-expansion.md. Nine tiles, no new dependency.
// ===========================================================================

// ===================== spec-v1377: minimum tiedown count =====================
// dims: in { length_ft: L, weight_lb: M, tiedowns: dimensionless, wll_per_tiedown_lb: M, tiedown_path: dimensionless } out: { min_tiedowns: dimensionless, tiedown_path: dimensionless, required_wll_lb: M, provided_wll_lb: M }
export function computeTiedownCount({ length_ft = 0, weight_lb = 0, tiedowns = 0, wll_per_tiedown_lb = 0, tiedown_path = "over_other_side" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(length_ft > 0)) return { error: "Article length must be positive." };
  if (!(weight_lb > 0)) return { error: "Article weight must be positive." };
  if (!(tiedowns >= 1)) return { error: "Plan at least one tiedown." };
  if (!(wll_per_tiedown_lb > 0)) return { error: "Working load limit per tiedown must be positive." };
  // Two INDEPENDENT rules. The count rule is about LENGTH; the aggregate working
  // load limit rule is about WEIGHT. The securement has to satisfy both.
  let min_tiedowns;
  if (length_ft <= 5) min_tiedowns = weight_lb <= 1100 ? 1 : 2;
  else if (length_ft <= 10) min_tiedowns = 2;
  else min_tiedowns = 2 + Math.ceil((length_ft - 10) / 10 - 1e-9);
  const required_wll_lb = 0.5 * weight_lb;
  // 49 CFR 393.106(d) credits by PATH: full WLL only for a tiedown that goes over or around
  // the cargo to an anchor on the OTHER side of the vehicle; half for one that runs direct
  // from the vehicle to the cargo, or over the cargo back to the SAME side. (Until 2026-09-24
  // this asked whether the tiedown was secured at both ends, which credited a direct tiedown
  // -- anchored at both ends -- at twice what the rule allows.)
  const TIEDOWN_CREDIT = { over_other_side: 1, direct: 0.5, same_side: 0.5 };
  if (!(tiedown_path in TIEDOWN_CREDIT)) return { error: "Tiedown path must be over_other_side, direct, or same_side." };
  const effective_wll_each = wll_per_tiedown_lb * TIEDOWN_CREDIT[tiedown_path];
  const provided_wll_lb = tiedowns * effective_wll_each;
  const count_ok = tiedowns >= min_tiedowns - 1e-9 * Math.abs(min_tiedowns);
  const wll_ok = provided_wll_lb >= required_wll_lb - 1e-9 * Math.abs(required_wll_lb);
  const count_margin = tiedowns - min_tiedowns;
  const wll_margin_lb = provided_wll_lb - required_wll_lb;
  // Which rule GOVERNS is a property of the cargo and the hardware, not of the plan:
  // it is whichever rule demands more tiedowns of this rating.
  const tiedowns_by_wll = Math.ceil(required_wll_lb / effective_wll_each - 1e-9);
  const governing = min_tiedowns > tiedowns_by_wll
    ? "the count rule (length)"
    : tiedowns_by_wll > min_tiedowns
      ? "the aggregate working load limit rule (weight)"
      : "neither: both rules ask for the same number of tiedowns of this rating";
  const verdict = (count_ok && wll_ok)
    ? "PASSES both rules"
    : !count_ok && !wll_ok
      ? "FAILS both rules: short on tiedown count and on aggregate working load limit"
      : !count_ok
        ? "FAILS the count rule: enough working load limit, not enough tiedowns"
        : "FAILS the working load limit rule: enough tiedowns, not enough aggregate working load limit";
  if (![min_tiedowns, required_wll_lb, provided_wll_lb].every(Number.isFinite)) return { error: "Tiedown math is not a finite value." };
  return {
    min_tiedowns,
    tiedown_path,
    required_wll_lb,
    provided_wll_lb,
    count_margin,
    wll_margin_lb,
    tiedowns_by_wll,
    governing,
    verdict,
    note: "The minimum number of tiedowns a piece of cargo needs and the aggregate working load limit it needs, which are two independent rules that both have to be satisfied. The count rule is about the article's LENGTH: an article of 5 ft or less weighing 1,100 lb or less takes one tiedown and a heavier short article takes two; anything over 5 ft and up to 10 ft takes two regardless of weight; and past 10 ft the requirement is two plus one more for each additional 10 ft or fraction. Long cargo needs more attachment points so it cannot rotate or shift within the securement, and the count keeps climbing every ten feet no matter how light the piece is. The aggregate working load limit rule is about WEIGHT: the sum of the tiedowns' working load limits must be at least half the cargo weight, on the reasoning that a tiedown restrains in more than one direction. Under 393.106(d) a tiedown that passes over or around the load to an anchor on the other side of the vehicle counts its full working load limit; one that runs direct from the vehicle to the cargo, or over the cargo and back to the same side, counts half. The two rules govern in different situations, which is why both are reported and the controlling one named. A 24 ft, 12,000 lb steel beam needs 2 + ceil(14/10) = 4 tiedowns by count while needing only 6,000 lb of aggregate working load limit, so the count governs and four chains is exactly the minimum. Reverse it -- a 4 ft, 14,000 lb block -- and the count rule asks for two while the working load limit rule asks for 7,000 lb, so the chain rating decides. A crew that has internalized only one of the two rules will be wrong about half the time. A screen; 49 CFR 393 in full, the working load limits marked on the actual hardware, and the driver's own inspection govern.",
  };
}

export const tiedownCountExample = { inputs: { length_ft: 24, weight_lb: 12000, tiedowns: 4, wll_per_tiedown_lb: 5400, tiedown_path: "over_other_side" } };

TRUCKINGFIELD_RENDERERS["tiedown-count"] = _simpleRenderer({
  citation: "Citation: 49 CFR 393.110 minimum tiedown count by article length, and 49 CFR 393.106 aggregate working load limit at half the cargo weight (a direct or same-side tiedown counts half its WLL, 393.106(d)), cited by section and not reproduced. Both rules apply; the tile names the controlling one. 49 CFR 393 in full, the working load limits marked on the actual hardware, and the driver's inspection govern.",
  example: tiedownCountExample.inputs,
  fields: [
    { key: "length_ft", label: "Article length (ft)", kind: "number" },
    { key: "weight_lb", label: "Article weight (lb)", kind: "number" },
    { key: "tiedowns", label: "Tiedowns planned", kind: "number" },
    { key: "wll_per_tiedown_lb", label: "Working load limit per tiedown (lb)", kind: "number" },
    { key: "tiedown_path", label: "Tiedown path (49 CFR 393.106(d))", kind: "select", options: [
      { value: "over_other_side", label: "Over the cargo to the other side (full WLL)" },
      { value: "direct", label: "Direct, vehicle to cargo (half WLL)" },
      { value: "same_side", label: "Over the cargo, back to the same side (half WLL)" },
    ] },
  ],
  outputs: [
    { key: "c", id: "tdcn-out-c", label: "Minimum tiedowns by the length rule", value: (r) => String(r.min_tiedowns) + " (planned margin " + (r.count_margin >= 0 ? "+" : "") + String(r.count_margin) + ")" },
    { key: "r", id: "tdcn-out-r", label: "Required aggregate working load limit", value: (r) => fmt(r.required_wll_lb, 0) + " lb (" + String(r.tiedowns_by_wll) + " tiedown(s) of this rating)" },
    { key: "p", id: "tdcn-out-p", label: "Provided aggregate working load limit", value: (r) => fmt(r.provided_wll_lb, 0) + " lb (margin " + (r.wll_margin_lb >= 0 ? "+" : "") + fmt(r.wll_margin_lb, 0) + " lb)" },
    { key: "g", id: "tdcn-out-g", label: "Governing rule", value: (r) => r.governing },
    { key: "v", id: "tdcn-out-v", label: "Against both rules", value: (r) => r.verdict },
    { key: "n", id: "tdcn-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTiedownCount,
});

// ===================== spec-v1378: kingpin-to-rear-axle compliance =====================
// dims: in { kpra_ft: L, state_limit_ft: L, hole_spacing_in: L } out: { excess_ft: L, holes_needed: dimensionless, resulting_kpra_ft: L }
export function computeKingpinToAxle({ kpra_ft = 0, state_limit_ft = 40, hole_spacing_in = 6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(kpra_ft > 0)) return { error: "Measured kingpin-to-rear-axle distance must be positive." };
  if (!(state_limit_ft > 0)) return { error: "State limit must be positive." };
  if (!(hole_spacing_in > 0)) return { error: "Tandem hole spacing must be positive." };
  // Sliding the tandems FORWARD to fix KPRA moves weight onto the drives: run the
  // axle-weight check before pulling the pin, not after crossing the scale.
  const excess_ft = kpra_ft - state_limit_ft;
  const holes_needed = excess_ft > 1e-9 ? Math.ceil(excess_ft * 12 / hole_spacing_in - 1e-9) : 0;
  const resulting_kpra_ft = kpra_ft - holes_needed * hole_spacing_in / 12;
  const slide_in = holes_needed * hole_spacing_in;
  const compliant = resulting_kpra_ft <= state_limit_ft + 1e-9 * Math.abs(state_limit_ft);
  const verdict = excess_ft <= 1e-9
    ? "COMPLIANT as measured, with " + fmt(-excess_ft, 2) + " ft to spare"
    : compliant
      ? "OVER as measured: slide the tandems forward " + String(holes_needed) + " hole(s) to comply"
      : "OVER, and the hole spacing cannot reach the limit from this position";
  if (![excess_ft, holes_needed, resulting_kpra_ft, slide_in].every(Number.isFinite)) return { error: "Kingpin-to-axle math is not a finite value." };
  return {
    excess_ft,
    holes_needed,
    resulting_kpra_ft,
    slide_in,
    verdict,
    note: "Whether a trailer's kingpin-to-rear-axle measurement complies with the governing state limit, and how many tandem holes forward it takes to get there. The measurement runs from the kingpin to the CENTER of the rear axle group -- the midpoint between the tandem axles, not the front axle and not the trailer's end -- and states that regulate it do so to control off-tracking through intersections. The limits differ: 40 ft is the well-known California figure, others sit at 41 ft or use a different measurement entirely, and many states do not regulate it at all, so the limit is an input rather than a constant. The catch is what the fix costs elsewhere. Sliding the tandems forward to reduce the measurement moves weight onto the drive axles and off the trailer axles, so a driver who slides four holes forward to get legal in one state can put the drives over their own limit, which is a different violation at the same scale. A trailer measuring 42 ft against a 40 ft limit on 6 in hole spacing is 24 in over and needs ceil(24/6) = 4 holes forward, landing at exactly 40.0 ft. Four holes is a substantial slide -- each hole typically moves several hundred pounds from the trailer tandems to the drives depending on load distribution -- so run the axle-weight check before pulling the pin, not after crossing the scale. A compliance screen; the governing state's own statute and measurement method, and the scale ticket, govern.",
  };
}

export const kingpinToAxleExample = { inputs: { kpra_ft: 42, state_limit_ft: 40, hole_spacing_in: 6 } };

TRUCKINGFIELD_RENDERERS["kingpin-to-axle"] = _simpleRenderer({
  citation: "Citation: kingpin-to-rear-axle-center compliance against the governing state's own limit (40 ft is the California figure; other states differ or do not regulate it), cited by name with the limit entered rather than bundled, and the tandem slide converted to whole holes at the trailer's hole spacing. The governing state's statute and measurement method, and the scale ticket, govern. Run the axle-weight check before sliding.",
  example: kingpinToAxleExample.inputs,
  fields: [
    { key: "kpra_ft", label: "Measured kingpin to rear-axle center (ft)", kind: "number" },
    { key: "state_limit_ft", label: "Governing state limit (ft)", kind: "number" },
    { key: "hole_spacing_in", label: "Tandem hole spacing (in)", kind: "number" },
  ],
  outputs: [
    { key: "e", id: "kpra-out-e", label: "Over the limit by", value: (r) => (r.excess_ft > 0 ? fmt(r.excess_ft, 2) + " ft (" + fmt(r.excess_ft * 12, 1) + " in)" : "not over") },
    { key: "h", id: "kpra-out-h", label: "Forward slide required", value: (r) => String(r.holes_needed) + " hole(s), " + fmt(r.slide_in, 1) + " in" },
    { key: "k", id: "kpra-out-k", label: "Resulting measurement", value: (r) => fmt(r.resulting_kpra_ft, 2) + " ft" },
    { key: "v", id: "kpra-out-v", label: "Against the limit", value: (r) => r.verdict },
    { key: "n", id: "kpra-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeKingpinToAxle,
});

// ===================== spec-v1379: safe downgrade descent speed =====================
// dims: in { gcw_lb: M L T^-2, grade_pct: dimensionless, descent_speed_mph: L T^-1, engine_brake_hp: M L^2 T^-3 } out: { descent_power_hp: M L^2 T^-3, balance_speed_mph: L T^-1, service_brake_hp: M L^2 T^-3 }
export function computeSafeDescentSpeed({ gcw_lb = 0, grade_pct = 0, descent_speed_mph = 0, engine_brake_hp = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(gcw_lb > 0)) return { error: "Gross combination weight must be positive." };
  if (!(grade_pct > 0)) return { error: "Grade must be positive (this is a descent)." };
  if (!(descent_speed_mph > 0)) return { error: "Descent speed must be positive." };
  if (!(engine_brake_hp > 0)) return { error: "Engine brake rating must be positive." };
  // Service brakes have NO steady-state capacity: they absorb heat, they do not reject it,
  // so any sustained shortfall ends in fade.
  const grade = grade_pct / 100;
  const speed_fps = descent_speed_mph * 5280 / 3600;
  const descent_power_hp = gcw_lb * speed_fps * grade / 550;
  const balance_speed_fps = engine_brake_hp * 550 / (gcw_lb * grade);
  const balance_speed_mph = balance_speed_fps * 3600 / 5280;
  const service_brake_hp = Math.max(0, descent_power_hp - engine_brake_hp);
  const reserve_hp = Math.max(0, engine_brake_hp - descent_power_hp);
  const verdict = descent_power_hp <= engine_brake_hp
    ? "engine-brake controlled: the retarder holds the truck with " + fmt(reserve_hp, 0) + " hp in reserve and the service brakes free for emergencies"
    : "NOT engine-brake controlled: the service brakes are absorbing " + fmt(service_brake_hp, 0) + " hp continuously, with nowhere to put it, and the countdown to fade has started";
  if (![descent_power_hp, balance_speed_mph, service_brake_hp].every(Number.isFinite)) return { error: "Descent-power math is not a finite value." };
  return {
    descent_power_hp,
    balance_speed_mph,
    service_brake_hp,
    reserve_hp,
    verdict,
    note: "The speed at which an engine brake alone holds a loaded truck on a grade, and how much heat the service brakes are absorbing above it. Going downhill, gravity does work on the truck at a rate proportional to weight times speed times grade, and that power has to be dissipated continuously or the truck accelerates. An engine brake absorbs a fixed amount of it -- a few hundred horsepower on a modern truck, much less on an older one or at low engine speed -- and whatever is left goes into the service brakes as heat. Service brakes have no steady-state capacity at all: they absorb heat, they do not reject it, so any sustained shortfall ends in fade. The balance speed is the useful output, because below it the truck is under control with the service brakes held in reserve for emergencies, and above it the service brakes are carrying the difference continuously. An 80,000 lb combination on a 6% grade with a 400 hp engine brake needs 320 hp at 25 mph, which the retarder covers with 80 hp to spare, and balances at 31.2 mph; at 45 mph the demand is 576 hp and 176 hp is going into the service brakes with nowhere to put it, and on a six-mile grade they will be gone before the bottom. Note how sharply the balance speed falls with weight: the same truck at 105,000 lb on a permit load balances at only 23.8 mph. This is the arithmetic behind the old rule about descending in a lower gear than you climbed in, and it makes the rule quantitative. The balance counts only the grade's pull against the retarder: rolling resistance, drivetrain drag, and air resistance also hold the truck back, so the real safe speed is somewhat higher than this -- the omission errs toward slow. A screen; the posted grade speed, the truck's own brake condition, and the driver govern.",
  };
}

export const safeDescentSpeedExample = { inputs: { gcw_lb: 80000, grade_pct: 6, descent_speed_mph: 45, engine_brake_hp: 400 } };

TRUCKINGFIELD_RENDERERS["safe-descent-speed"] = _simpleRenderer({
  citation: "Citation: descent power from the rate of gravitational work, P = W x v x grade / 550 (lb, ft/s, hp), and the balance speed at which a retarder's rating exactly matches it, by name. Public mechanics. Service brakes absorb heat rather than rejecting it, so a sustained shortfall ends in fade. A screen; the posted grade speed, the truck's own brake condition, and the driver govern.",
  example: safeDescentSpeedExample.inputs,
  fields: [
    { key: "gcw_lb", label: "Gross combination weight (lb)", kind: "number" },
    { key: "grade_pct", label: "Grade (%)", kind: "number" },
    { key: "descent_speed_mph", label: "Descent speed (mph)", kind: "number" },
    { key: "engine_brake_hp", label: "Engine brake / retarder rating (hp)", kind: "number" },
  ],
  outputs: [
    { key: "p", id: "sdsp-out-p", label: "Descent power to dissipate", value: (r) => fmt(r.descent_power_hp, 0) + " hp" },
    { key: "b", id: "sdsp-out-b", label: "Balance speed on the engine brake alone", value: (r) => fmt(r.balance_speed_mph, 1) + " mph" },
    { key: "s", id: "sdsp-out-s", label: "Into the service brakes", value: (r) => fmt(r.service_brake_hp, 0) + " hp continuously" },
    { key: "v", id: "sdsp-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "n", id: "sdsp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSafeDescentSpeed,
});

// ===================== spec-v1380: air brake pushrod stroke screen =====================
// dims: in { readjustment_limit_in: L, measured_stroke_in: L, defective_brakes: dimensionless, total_brakes: dimensionless } out: { margin_in: L, defective_fraction_pct: dimensionless }
export function computeAirBrakePushrodStroke({ readjustment_limit_in = 2.0, measured_stroke_in = 0, defective_brakes = 0, total_brakes = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(readjustment_limit_in > 0)) return { error: "Readjustment limit must be positive." };
  if (!(measured_stroke_in >= 0)) return { error: "Measured stroke cannot be negative." };
  if (!(total_brakes >= 1)) return { error: "Total brake count must be at least 1." };
  if (!(defective_brakes >= 0)) return { error: "Defective brake count cannot be negative." };
  if (defective_brakes > total_brakes) return { error: "Defective brakes cannot exceed the total brake count." };
  // Being AT the limit counts as defective, not just being over it.
  const margin_in = readjustment_limit_in - measured_stroke_in;
  const this_brake_defective = measured_stroke_in >= readjustment_limit_in;
  const defective_fraction_pct = defective_brakes / total_brakes * 100;
  const out_of_service = defective_fraction_pct >= 20;
  const brakes_to_oos = Math.max(0, Math.ceil(0.2 * total_brakes - 1e-9) - defective_brakes);
  const verdict = out_of_service
    ? "OUT OF SERVICE: " + fmt(defective_fraction_pct, 1) + "% of the brakes are defective, at or past the 20% threshold"
    : "not out of service at " + fmt(defective_fraction_pct, 1) + "%, but " + String(brakes_to_oos) + " more defective brake(s) reaches the threshold";
  if (![margin_in, defective_fraction_pct].every(Number.isFinite)) return { error: "Pushrod-stroke math is not a finite value." };
  return {
    margin_in,
    this_brake_defective,
    defective_fraction_pct,
    out_of_service,
    brakes_to_oos,
    verdict,
    note: "Whether a measured pushrod stroke is inside its chamber's readjustment limit, and whether the combination has enough defective brakes to be placed out of service. Each brake chamber has a published readjustment limit -- the stroke at which the brake is considered out of adjustment -- and it depends on the chamber type and size rather than on the vehicle: a standard type 30 clamp chamber sits at 2 inches and a long-stroke type 30 at 2.5 inches, so the limit is entered rather than assumed. Being AT the limit counts as defective, not merely being over it, which is the detail that turns a marginal brake into a violation. The vehicle-level rule is the one that decides whether the truck moves: when 20% or more of the combination's brakes are defective, the whole vehicle is out of service. On a five-axle combination with ten brakes, two defective brakes is exactly 20%, so a driver who finds one out of adjustment is one brake away from being parked, and three defective is 30% and the truck does not move until they are adjusted. Only at one defective brake, 10%, is the combination legal to operate, and it is a violation on the inspection report either way. That is the number worth knowing before the inspection rather than during it. A screen; the chamber manufacturer's published readjustment limit, the CVSA out-of-service criteria in full, and the inspector govern.",
  };
}

export const airBrakePushrodStrokeExample = { inputs: { readjustment_limit_in: 2.0, measured_stroke_in: 1.75, defective_brakes: 3, total_brakes: 10 } };

TRUCKINGFIELD_RENDERERS["air-brake-pushrod-stroke"] = _simpleRenderer({
  citation: "Citation: pushrod stroke against the chamber's published readjustment limit (entered, not bundled: a standard type 30 clamp chamber is 2 in and a long-stroke type 30 is 2.5 in), and the 20%-of-brakes-defective out-of-service threshold of the CVSA out-of-service criteria, cited by name and not reproduced. At the limit counts as defective. The chamber manufacturer's limit, the criteria in full, and the inspector govern.",
  example: airBrakePushrodStrokeExample.inputs,
  fields: [
    { key: "readjustment_limit_in", label: "Chamber readjustment limit (in)", kind: "number" },
    { key: "measured_stroke_in", label: "Measured stroke on this brake (in)", kind: "number" },
    { key: "defective_brakes", label: "Brakes at or past their limit", kind: "number" },
    { key: "total_brakes", label: "Total brakes on the combination", kind: "number" },
  ],
  outputs: [
    { key: "m", id: "abps-out-m", label: "Margin on this brake", value: (r) => fmt(r.margin_in, 3) + " in " + (r.this_brake_defective ? "-- AT OR PAST the limit, defective" : "under the limit") },
    { key: "f", id: "abps-out-f", label: "Defective fraction", value: (r) => fmt(r.defective_fraction_pct, 1) + " % of the combination's brakes" },
    { key: "o", id: "abps-out-o", label: "Out-of-service determination", value: (r) => r.verdict },
    { key: "n", id: "abps-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAirBrakePushrodStroke,
});

// ===================== spec-v1381: oversize / overweight permit threshold screen =====================
// dims: in { width_ft: L, height_ft: L, length_ft: L, weight_lb: M L T^-2, width_limit_ft: L, height_limit_ft: L, length_limit_ft: L, weight_limit_lb: M L T^-2 } out: { width_excess_ft: L, height_excess_ft: L, length_excess_ft: L, weight_excess_lb: M L T^-2 }
export function computeOversizePermitScreen({
  width_ft = 0, height_ft = 0, length_ft = 0, weight_lb = 0,
  width_limit_ft = 8.5, height_limit_ft = 13.5, length_limit_ft = 75, weight_limit_lb = 80000,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(width_ft > 0 && height_ft > 0 && length_ft > 0 && weight_lb > 0)) return { error: "Load width, height, length, and gross weight must all be positive." };
  if (!(width_limit_ft > 0 && height_limit_ft > 0 && length_limit_ft > 0 && weight_limit_lb > 0)) return { error: "All four route thresholds must be positive." };
  // Reporting the EXCESS rather than pass/fail is the point: fee schedules, escort
  // requirements, and travel-time restrictions all key off how far over you are.
  const width_excess_ft = width_ft - width_limit_ft;
  const height_excess_ft = height_ft - height_limit_ft;
  const length_excess_ft = length_ft - length_limit_ft;
  const weight_excess_lb = weight_lb - weight_limit_lb;
  const over = [];
  if (width_excess_ft > 0) over.push("width");
  if (height_excess_ft > 0) over.push("height");
  if (length_excess_ft > 0) over.push("length");
  if (weight_excess_lb > 0) over.push("weight");
  const permit_required = over.length > 0;
  const verdict = permit_required
    ? "PERMIT REQUIRED on " + over.join(", ") + " -- " + String(over.length) + " separate permit question(s), potentially " + String(over.length) + " fee bases"
    : "legal on all four against these thresholds; no oversize or overweight permit indicated";
  if (![width_excess_ft, height_excess_ft, length_excess_ft, weight_excess_lb].every(Number.isFinite)) return { error: "Permit-screen math is not a finite value." };
  return {
    width_excess_ft,
    height_excess_ft,
    length_excess_ft,
    weight_excess_lb,
    over_count: over.length,
    permit_required,
    verdict,
    note: "Four comparisons against the limits for a specific route, reported as the excess on each rather than as a bare pass or fail. Width is the one federal number that holds almost everywhere at 8 ft 6 in on the National Network and most state systems. Height is entirely state law and runs from 13 ft 6 in to 14 ft 6 in in the lower 48, and Alaska allows 15 ft (17 AAC 25.012(b); 17 ft on the Dalton and Elliott highways). Length is regulated by trailer rather than by combination on the National Network with no federal overall limit, and states impose their own off-network. Gross weight is 80,000 lb federally on the Interstate system, subject to the axle and bridge-formula limits computed separately. Reporting the excess is the point, because permit fee schedules, escort requirements, travel-time restrictions, and route surveys all key off how far over you are in bands: a load two inches over width is a different conversation from one four feet over. A load 12 ft 0 in wide, 14 ft 6 in high, 75 ft long and 90,000 lb gross, screened against an 8 ft 6 in / 14 ft 0 in / 75 ft / 80,000 lb route, is 3.5 ft over on width, half a foot over on height, exactly at the limit on length, and 10,000 lb over on weight -- three permits, and at 3.5 ft over width most states will require escorts and restrict travel to daylight hours on weekdays. The half foot of height is the sleeper: small enough to overlook and the dimension that hits a bridge. A screen; the permitting state's own limits, its fee and escort schedule, and an actual route survey govern.",
  };
}

export const oversizePermitScreenExample = { inputs: { width_ft: 12.0, height_ft: 14.5, length_ft: 75, weight_lb: 90000, width_limit_ft: 8.5, height_limit_ft: 14.0, length_limit_ft: 75, weight_limit_lb: 80000 } };

TRUCKINGFIELD_RENDERERS["oversize-permit-screen"] = _simpleRenderer({
  citation: "Citation: oversize and overweight screening against the route's own four thresholds, entered rather than bundled because only width (8 ft 6 in on the National Network) and Interstate gross weight (80,000 lb) are federal; height and off-network length are state law. Cited by name, not reproduced. The permitting state's limits, its fee and escort schedule, and an actual route survey govern.",
  example: oversizePermitScreenExample.inputs,
  fields: [
    { key: "width_ft", label: "Load width (ft)", kind: "number" },
    { key: "height_ft", label: "Load height (ft)", kind: "number" },
    { key: "length_ft", label: "Overall length (ft)", kind: "number" },
    { key: "weight_lb", label: "Gross weight (lb)", kind: "number" },
    { key: "width_limit_ft", label: "Route width limit (ft)", kind: "number" },
    { key: "height_limit_ft", label: "Route height limit (ft)", kind: "number" },
    { key: "length_limit_ft", label: "Route length limit (ft)", kind: "number" },
    { key: "weight_limit_lb", label: "Route weight limit (lb)", kind: "number" },
  ],
  outputs: [
    { key: "w", id: "ospm-out-w", label: "Width", value: (r) => (r.width_excess_ft > 0 ? "+" + fmt(r.width_excess_ft, 2) + " ft OVER" : fmt(-r.width_excess_ft, 2) + " ft under") },
    { key: "h", id: "ospm-out-h", label: "Height", value: (r) => (r.height_excess_ft > 0 ? "+" + fmt(r.height_excess_ft, 2) + " ft OVER" : fmt(-r.height_excess_ft, 2) + " ft under") },
    { key: "l", id: "ospm-out-l", label: "Length", value: (r) => (r.length_excess_ft > 0 ? "+" + fmt(r.length_excess_ft, 2) + " ft OVER" : fmt(-r.length_excess_ft, 2) + " ft under") },
    { key: "g", id: "ospm-out-g", label: "Weight", value: (r) => (r.weight_excess_lb > 0 ? "+" + fmt(r.weight_excess_lb, 0) + " lb OVER" : fmt(-r.weight_excess_lb, 0) + " lb under") },
    { key: "v", id: "ospm-out-v", label: "Permit screen", value: (r) => r.verdict },
    { key: "n", id: "ospm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeOversizePermitScreen,
});

// ===================== spec-v1382: hazmat placarding threshold screen =====================
// dims: in { materials: dimensionless, table1_present: dimensionless } out: { table2_aggregate_lb: M, threshold_met: dimensionless }
export function computeHazmatPlacardThreshold({ materials = [], table1_present = false } = {}) {
  if (!Array.isArray(materials) || materials.length === 0) return { error: "List at least one hazardous material with its gross weight." };
  // 172.504(c) opens "Except for bulk packagings": the 1,001 lb exception never
  // covers a bulk packaging (171.8: over 119 gal for a liquid, over 882 lb and
  // 119 gal for a solid), so a single 275 gal tote is placarded at any weight.
  // Until 2026-09-25 there was no bulk input and the note's own "tote" example
  // read as unplacarded below 1,001 lb.
  let table2_aggregate_lb = 0;
  const classes = new Set();
  for (const m of materials) {
    const gross = Number(m.gross_lb) || 0;
    if (gross < 0) return { error: "Gross weight cannot be negative." };
    // The aggregate is across ALL Table 2 hazard classes on the vehicle, not per class.
    if (m.table1) continue;
    table2_aggregate_lb += gross;
    if (gross > 0 && m.hazard_class) classes.add(String(m.hazard_class).trim());
  }
  const any_table1 = !!table1_present || materials.some((m) => m.table1 && (Number(m.gross_lb) || 0) > 0);
  const any_bulk = materials.some((m) => m.bulk && (Number(m.gross_lb) || 0) > 0);
  if (!(table2_aggregate_lb > 0) && !any_table1) return { error: "Enter a gross weight for at least one material." };
  const threshold_met = table2_aggregate_lb >= 1001;
  const placard_required = threshold_met || any_table1 || any_bulk;
  const margin_lb = 1001 - table2_aggregate_lb;
  const class_list = [...classes].sort().join(", ");
  const verdict = any_table1
    ? "PLACARD REQUIRED: a Table 1 material is aboard, which is placarded at any quantity with no threshold"
    : threshold_met
      ? "PLACARD REQUIRED: the Table 2 aggregate is at or above 1,001 lb"
      : any_bulk
        ? "PLACARD REQUIRED: a bulk packaging is aboard, and the 1,001 lb exception does not apply to bulk packagings"
        : "not placarded on the Table 2 threshold, " + fmt(margin_lb, 0) + " lb short of 1,001 lb -- a PLACARDING exemption only, not a hazmat exemption";
  if (!Number.isFinite(table2_aggregate_lb)) return { error: "Placarding math is not a finite value." };
  return {
    table2_aggregate_lb,
    threshold_met,
    any_table1,
    any_bulk,
    placard_required,
    margin_lb,
    class_list,
    class_count: classes.size,
    verdict,
    note: "Whether a load has to be placarded, from the two thresholds that govern it. Hazardous materials split into two tables. Table 1 materials -- among them explosives of divisions 1.1, 1.2 and 1.3, poison-inhalation-hazard materials, and certain radioactives -- must be placarded at ANY quantity, with no threshold at all. Table 2 covers everything else, and a vehicle carrying Table 2 materials must be placarded when the aggregate gross weight of all of them reaches 1,001 pounds. Three details cause most of the errors. First, the aggregate is across ALL Table 2 hazard classes on the vehicle rather than per class: 600 lb of flammable liquid and 500 lb of corrosive is 1,100 lb aggregate and the vehicle gets placarded for both. Second, it is GROSS weight, package and contents together, not net product weight, and drums weigh a great deal empty. A load of 400 lb gross of one Class 3 flammable liquid in drums and 700 lb gross of a second in cases aggregates to 1,100 lb and is placarded; drop the second to 550 lb and the aggregate is 950 lb and it is not. Third, the 1,001 lb exception does not apply to a BULK packaging -- for a liquid, any container over 119 gallons, which takes in the common 275 and 330 gal tote -- so a vehicle with even a partly filled tote aboard is placarded at any weight. (Empty IBCs moved under 173.29(d) are excepted by 172.504(d)(2).) Everything else still applies at any weight -- shipping papers, package marking and labeling, segregation, emergency response information, and driver training have no 1,001 lb threshold. Under 1,001 lb is a PLACARDING exemption, not a hazmat exemption, and treating it as one is how carriers end up cited. A screen; 49 CFR 172.504 and its tables in full, the shipper's papers, and the carrier's hazmat program govern.",
  };
}

export const hazmatPlacardThresholdExample = {
  inputs: {
    materials: [
      { name: "flammable liquid, drum", hazard_class: "3", gross_lb: 400, table1: false, bulk: false },
      { name: "flammable liquid, cases", hazard_class: "3", gross_lb: 700, table1: false, bulk: false },
    ],
    table1_present: false,
  },
};

function renderHazmatPlacardThreshold(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: 49 CFR 172.504 placarding thresholds -- Table 1 materials placarded at any quantity, Table 2 materials at a 1,001 lb aggregate GROSS weight across all Table 2 classes on the vehicle, with no 1,001 lb exception for a bulk packaging (172.504(c); bulk per 171.8, over 119 gal for a liquid) -- cited by section and not reproduced. Under 1,001 lb is a placarding exemption only: papers, marking, labeling, segregation, emergency response information, and driver training have no threshold. 49 CFR 172 in full, the shipper's papers, and the carrier's hazmat program govern.";
  attachExampleButton(inputRegion, () => fillExample(hazmatPlacardThresholdExample.inputs));
  const list = document.createElement("div"); inputRegion.appendChild(list);
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const tag = "Material " + (i + 1) + " ";
    const nF = makeRowField(tag + "name", "hzp-i" + i + "-n", { type: "text", inputmode: "text" });
    const cF = makeRowField(tag + "hazard class or division", "hzp-i" + i + "-c", { type: "text", inputmode: "text" });
    const gF = makeRowField(tag + "gross weight (lb)", "hzp-i" + i + "-g", { step: "any", min: "0" });
    const bF = makeCheckbox(tag + "is a bulk packaging (liquid over 119 gal, e.g. a tote)", "hzp-i" + i + "-b");
    for (const f of [nF, cF, gF, bF]) wrap.appendChild(f.wrap);
    list.appendChild(wrap);
    [nF.input, cF.input, gF.input].forEach((el) => el.addEventListener("input", update));
    bF.input.addEventListener("change", update);
    rows.push({ n: nF.input, c: cF.input, g: gF.input, b: bF.input });
  }
  const t1 = makeCheckbox("A Table 1 material is aboard (placarded at any quantity)", "hzp-t1");
  inputRegion.appendChild(t1.wrap);
  t1.input.addEventListener("change", update);
  const oA = makeOutputLine(outputRegion, "Table 2 aggregate gross weight", "hzp-out-a");
  const oT = makeOutputLine(outputRegion, "Against the 1,001 lb threshold", "hzp-out-t");
  const oC = makeOutputLine(outputRegion, "Table 2 classes aboard", "hzp-out-c");
  const oV = makeOutputLine(outputRegion, "Placarding determination", "hzp-out-v");
  const oN = makeOutputLine(outputRegion, "Note", "hzp-out-n");
  function fillExample(v) {
    for (let i = 0; i < rows.length; i++) {
      const m = v.materials[i];
      if (m) { rows[i].n.value = m.name; rows[i].c.value = m.hazard_class; rows[i].g.value = m.gross_lb; rows[i].b.checked = !!m.bulk; }
    }
    t1.input.checked = !!v.table1_present;
    update();
  }
  function update() {
    const materials = rows
      .map((r) => ({ name: r.n.value, hazard_class: r.c.value, gross_lb: Number(r.g.value) || 0, table1: false, bulk: r.b.checked }))
      .filter((m) => m.gross_lb > 0);
    const outs = [oA, oT, oC, oV, oN];
    if (materials.length === 0 && !t1.input.checked) { for (const o of outs) o.textContent = "-"; return; }
    const r = computeHazmatPlacardThreshold({ materials: materials.length ? materials : [{ name: "", hazard_class: "", gross_lb: 0, table1: false }], table1_present: t1.input.checked });
    if (r.error) { oA.textContent = r.error; for (const o of [oT, oC, oV, oN]) o.textContent = "-"; return; }
    oA.textContent = fmt(r.table2_aggregate_lb, 0) + " lb";
    oT.textContent = r.threshold_met ? "at or above 1,001 lb" : fmt(r.margin_lb, 0) + " lb short of 1,001 lb";
    oC.textContent = r.class_count === 0 ? "none entered" : String(r.class_count) + " class(es): " + r.class_list;
    oV.textContent = r.verdict;
    oN.textContent = r.note;
  }
}
TRUCKINGFIELD_RENDERERS["hazmat-placard-threshold"] = renderHazmatPlacardThreshold;

// ===================== spec-v1383: idle fuel burn, cost, and engine-hour equivalent =====================
// dims: in { idle_hours_per_day: T, operating_days: T, idle_gph: L^3 T^-1, fuel_price: dimensionless, trucks: dimensionless, miles_per_engine_hour: L T^-1, fleet_annual_miles: L } out: { annual_idle_hours: T, annual_gallons: L^3, annual_cost: dimensionless, equivalent_miles: L }
export function computeIdleFuelCost({ idle_hours_per_day = 0, operating_days = 0, idle_gph = 0.8, fuel_price = 0, trucks = 1, miles_per_engine_hour = 7, fleet_annual_miles = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(idle_hours_per_day > 0)) return { error: "Idle hours per day must be positive." };
  if (!(operating_days > 0)) return { error: "Operating days per year must be positive." };
  if (!(idle_gph > 0)) return { error: "Idle fuel rate must be positive." };
  if (!(fuel_price > 0)) return { error: "Fuel price must be positive." };
  if (!(trucks >= 1)) return { error: "Truck count must be at least 1." };
  if (!(miles_per_engine_hour >= 0)) return { error: "Miles per engine hour cannot be negative." };
  if (!(fleet_annual_miles >= 0)) return { error: "Fleet annual miles cannot be negative." };
  // Idling produces NO miles, so it is entirely absent from a cost per mile model built
  // from fuel divided by odometer -- it silently inflates the per-mile fuel number instead.
  const annual_idle_hours = idle_hours_per_day * operating_days;
  const annual_gallons = annual_idle_hours * idle_gph;
  const annual_cost = annual_gallons * fuel_price;
  const fleet_cost = annual_cost * trucks;
  const equivalent_miles = annual_idle_hours * miles_per_engine_hour;
  const cost_per_mile_cents = fleet_annual_miles > 0 ? fleet_cost / fleet_annual_miles * 100 : null;
  if (![annual_idle_hours, annual_gallons, annual_cost, fleet_cost, equivalent_miles].every(Number.isFinite)) return { error: "Idle-cost math is not a finite value." };
  if (cost_per_mile_cents !== null && !Number.isFinite(cost_per_mile_cents)) return { error: "Idle-cost math is not a finite value." };
  return {
    annual_idle_hours,
    annual_gallons,
    annual_cost,
    fleet_cost,
    equivalent_miles,
    cost_per_mile_cents,
    note: "What idling costs a truck and a fleet in fuel, and what it costs again in engine wear. A heavy-duty diesel at idle burns something near 0.8 gallons an hour, more with the HVAC loaded and more again on an older engine. That is a small number per hour and a very large one per year, and because idling produces no miles it is entirely absent from a cost per mile model built from fuel divided by odometer -- it silently inflates the per-mile fuel number instead of appearing as its own line. The engine-hour line is the second cost and the one fleets underestimate. Maintenance intervals are driven by engine hours as much as by miles, and an idling hour is conventionally counted as somewhere around seven road miles of wear, so a truck idling six hours a day accrues the maintenance equivalent of a substantial extra route every year and reaches its overhaul far earlier than the odometer suggests. A truck idling 6 hours a day over 250 operating days at 0.8 gal/hr burns 1,200 gallons, which at $4.10 is $4,920 a year per truck and $98,400 across a twenty-truck fleet, plus the wear equivalent of 10,500 extra miles on each one. Against 2,200,000 fleet miles the idle fuel alone adds about 4.5 cents to every mile the fleet runs, which is roughly what an auxiliary power unit or a bunk heater costs to amortize -- and that comparison is the whole point. An operating estimate; the trucks' own telematics idle data and fuel records govern.",
  };
}

export const idleFuelCostExample = { inputs: { idle_hours_per_day: 6, operating_days: 250, idle_gph: 0.8, fuel_price: 4.10, trucks: 20, miles_per_engine_hour: 7, fleet_annual_miles: 2200000 } };

TRUCKINGFIELD_RENDERERS["idle-fuel-cost"] = _simpleRenderer({
  citation: "Citation: idle fuel burn at the engine's idle consumption rate (near 0.8 gal/hr for a heavy-duty diesel, entered rather than bundled), and the conventional engine-hour-to-road-mile wear equivalence used in fleet maintenance planning, by name. Idling produces no miles, so it never appears in a fuel-divided-by-odometer cost model. The trucks' own telematics idle data and fuel records govern.",
  example: idleFuelCostExample.inputs,
  fields: [
    { key: "idle_hours_per_day", label: "Idle hours per day", kind: "number" },
    { key: "operating_days", label: "Operating days per year", kind: "number" },
    { key: "idle_gph", label: "Idle fuel rate (gal/hr)", kind: "number" },
    { key: "fuel_price", label: "Fuel price ($/gal)", kind: "number" },
    { key: "trucks", label: "Trucks in the fleet", kind: "number" },
    { key: "miles_per_engine_hour", label: "Road miles of wear per idle hour", kind: "number" },
    { key: "fleet_annual_miles", label: "Fleet annual miles (0 to skip the per-mile line)", kind: "number" },
  ],
  outputs: [
    { key: "h", id: "idfc-out-h", label: "Annual idle hours per truck", value: (r) => fmt(r.annual_idle_hours, 0) + " hr" },
    { key: "g", id: "idfc-out-g", label: "Annual idle fuel per truck", value: (r) => fmt(r.annual_gallons, 0) + " gal" },
    { key: "c", id: "idfc-out-c", label: "Annual idle cost", value: (r) => "$" + fmt(r.annual_cost, 2) + " per truck ($" + fmt(r.fleet_cost, 2) + " fleet)" },
    { key: "m", id: "idfc-out-m", label: "Engine wear equivalent", value: (r) => fmt(r.equivalent_miles, 0) + " road miles per truck per year" },
    { key: "p", id: "idfc-out-p", label: "Added to every fleet mile", value: (r) => r.cost_per_mile_cents === null ? "-" : fmt(r.cost_per_mile_cents, 2) + " cents per mile" },
    { key: "n", id: "idfc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeIdleFuelCost,
});

// ===================== spec-v1384: flatbed tarp coverage, count, and weight =====================
// dims: in { load_length_ft: L, load_width_ft: L, load_height_ft: L, tarp_length_ft: L, tarp_width_ft: L, overlap_ft: L, tuck_ft: L, tarp_weight_lb: M } out: { width_needed_ft: L, tarps_needed: dimensionless, covered_length_ft: L, total_weight_lb: M }
export function computeFlatbedTarpSize({ load_length_ft = 0, load_width_ft = 0, load_height_ft = 0, tarp_length_ft = 0, tarp_width_ft = 0, overlap_ft = 0, tuck_ft = 1, tarp_weight_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(load_length_ft > 0 && load_width_ft > 0)) return { error: "Load length and width must be positive." };
  if (!(load_height_ft >= 0)) return { error: "Load height above the deck cannot be negative." };
  if (!(tarp_length_ft > 0 && tarp_width_ft > 0)) return { error: "Tarp length and width must be positive." };
  if (!(overlap_ft >= 0)) return { error: "Overlap cannot be negative." };
  if (!(tuck_ft >= 0)) return { error: "Tuck allowance cannot be negative." };
  if (!(tarp_weight_lb >= 0)) return { error: "Tarp weight cannot be negative." };
  if (!(tarp_length_ft > overlap_ft)) return { error: "The overlap must be shorter than the tarp." };
  // A tarp has to come down BOTH sides: a tarp sized to the deck width is a lid.
  const width_needed_ft = load_width_ft + 2 * load_height_ft + 2 * tuck_ft;
  const width_ok = tarp_width_ft >= width_needed_ft - 1e-9 * Math.abs(width_needed_ft);
  const width_spare_ft = tarp_width_ft - width_needed_ft;
  const tarps_needed = Math.max(1, Math.ceil((load_length_ft - overlap_ft) / (tarp_length_ft - overlap_ft) - 1e-9));
  const covered_length_ft = tarps_needed * tarp_length_ft - (tarps_needed - 1) * overlap_ft;
  const total_weight_lb = tarps_needed * tarp_weight_lb;
  const length_ok = covered_length_ft >= load_length_ft - 1e-9 * Math.abs(load_length_ft);
  const verdict = width_ok
    ? "the tarps on hand are wide enough, with " + fmt(width_spare_ft, 1) + " ft to spare"
    : "the tarps on hand are " + fmt(-width_spare_ft, 1) + " ft too narrow -- they will not reach down both sides, and the answer is a different tarp, not a tighter bungee";
  if (![width_needed_ft, tarps_needed, covered_length_ft, total_weight_lb].every(Number.isFinite)) return { error: "Tarp-sizing math is not a finite value." };
  return {
    width_needed_ft,
    width_ok,
    width_spare_ft,
    tarps_needed,
    covered_length_ft,
    length_ok,
    total_weight_lb,
    verdict,
    note: "How wide a tarp a flatbed load needs, how many tarps cover its length, and what they weigh. The width requirement is the one people get wrong, because a tarp has to come down BOTH sides: a load eight feet wide and six feet tall needs twenty feet of tarp across before any allowance for tucking under the edge of the load and getting a bungee on it, so the width needed is the load width plus twice the height plus twice the tuck. A tarp sized to the deck width is not a tarp, it is a lid. The length side is a shingling problem. Tarps overlap toward the rear so road wind cannot get under a leading edge, and each overlap costs its length from the run, so three twenty-foot tarps with four-foot laps do not cover sixty feet, they cover fifty-two. The weight line is not a footnote: a steel tarp runs 60 to 100 pounds, so a three-tarp load is a couple hundred pounds of payload and, more to the point, a couple hundred pounds a driver has to get onto a load by hand, which is where tarping injuries come from. A 40 ft load 8 ft wide and 6 ft above the deck needs 8 + 12 + 2 = 22 ft of width, which a 27 ft tarp clears, and ceil((40-4)/(20-4)) = 3 tarps covering 52 ft at 195 lb. Raise the load three feet and the width requirement passes what a steel tarp can do, and the answer is lumber tarps. A planning estimate; the actual tarps on the truck and the driver's own judgment govern.",
  };
}

export const flatbedTarpSizeExample = { inputs: { load_length_ft: 40, load_width_ft: 8, load_height_ft: 6, tarp_length_ft: 20, tarp_width_ft: 27, overlap_ft: 4, tuck_ft: 1, tarp_weight_lb: 65 } };

TRUCKINGFIELD_RENDERERS["flatbed-tarp-size"] = _simpleRenderer({
  citation: "Citation: flatbed tarp coverage from the wrap geometry -- width = load width + 2 x height + 2 x tuck, because the tarp comes down both sides -- and the shingled-overlap length relation, by name. Standard flatbed practice, public geometry. The actual tarps on the truck and the driver's judgment govern.",
  example: flatbedTarpSizeExample.inputs,
  fields: [
    { key: "load_length_ft", label: "Load length (ft)", kind: "number" },
    { key: "load_width_ft", label: "Load width (ft)", kind: "number" },
    { key: "load_height_ft", label: "Load height above the deck (ft)", kind: "number" },
    { key: "tarp_length_ft", label: "Tarp length (ft)", kind: "number" },
    { key: "tarp_width_ft", label: "Tarp width (ft)", kind: "number" },
    { key: "overlap_ft", label: "Overlap between tarps (ft)", kind: "number" },
    { key: "tuck_ft", label: "Tuck allowance per side (ft)", kind: "number" },
    { key: "tarp_weight_lb", label: "Weight per tarp (lb)", kind: "number" },
  ],
  outputs: [
    { key: "w", id: "ftsz-out-w", label: "Tarp width required", value: (r) => fmt(r.width_needed_ft, 1) + " ft across" },
    { key: "f", id: "ftsz-out-f", label: "Against the tarps on hand", value: (r) => r.verdict },
    { key: "t", id: "ftsz-out-t", label: "Tarps needed", value: (r) => String(r.tarps_needed) + " tarp(s)" },
    { key: "c", id: "ftsz-out-c", label: "Covered length", value: (r) => fmt(r.covered_length_ft, 1) + " ft" + (r.length_ok ? "" : " -- SHORT of the load") },
    { key: "g", id: "ftsz-out-g", label: "Total tarp weight", value: (r) => fmt(r.total_weight_lb, 0) + " lb of payload, and of lifting" },
    { key: "n", id: "ftsz-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFlatbedTarpSize,
});

// ===================== spec-v1385: trailer deck point load and dunnage spread =====================
// dims: in { load_lb: M L T^-2, feet_count: dimensionless, foot_area_sqin: L^2, dunnage_bearing_ft: L, deck_rating_plf: M T^-2 } out: { bearing_pressure_psf: M L^-1 T^-2, linear_load_plf: M T^-2, utilization_pct: dimensionless, required_length_ft: L }
export function computeDeckPointLoadDunnage({ load_lb = 0, feet_count = 4, foot_area_sqin = 0, dunnage_bearing_ft = 0, deck_rating_plf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(load_lb > 0)) return { error: "Concentrated load must be positive." };
  if (!(feet_count >= 1)) return { error: "Bearing-foot count must be at least 1." };
  if (!(foot_area_sqin >= 0)) return { error: "Bearing-foot area cannot be negative." };
  if (!(dunnage_bearing_ft > 0)) return { error: "Dunnage bearing length must be positive." };
  if (!(deck_rating_plf > 0)) return { error: "Deck rating must be positive." };
  // Dunnage converts a point load back into a linear one. The LENGTH of the bearing along
  // the trailer -- not its width, and not the timber's cross-section -- is what divides the load.
  const total_bearing_sqft = feet_count * foot_area_sqin / 144;
  const bearing_pressure_psf = total_bearing_sqft > 0 ? load_lb / total_bearing_sqft : null;
  const linear_load_plf = load_lb / dunnage_bearing_ft;
  const utilization_pct = linear_load_plf / deck_rating_plf * 100;
  const required_length_ft = load_lb / deck_rating_plf;
  const shortfall_ft = Math.max(0, required_length_ft - dunnage_bearing_ft);
  const verdict = utilization_pct > 100
    ? "OVER the deck rating: add " + fmt(shortfall_ft, 2) + " ft of dunnage bearing to reach 100%"
    : utilization_pct > 85
      ? "inside the deck rating but with little margin"
      : "inside the deck rating with real margin";
  if (![linear_load_plf, utilization_pct, required_length_ft].every(Number.isFinite)) return { error: "Deck point-load math is not a finite value." };
  if (bearing_pressure_psf !== null && !Number.isFinite(bearing_pressure_psf)) return { error: "Deck point-load math is not a finite value." };
  return {
    bearing_pressure_psf,
    total_bearing_sqft,
    linear_load_plf,
    utilization_pct,
    required_length_ft,
    shortfall_ft,
    verdict,
    note: "Whether a concentrated load spread on dunnage stays inside a trailer deck's rating, and how many feet of bearing it takes if it does not. Trailer decks are rated in pounds per LINEAR FOOT, because that is how the crossmembers under them are designed: a 48 ft deck rated for 55,000 lb is carrying roughly 1,150 lb on every foot of its length, and it assumes the load is spread that way. Many manufacturers also publish a concentrated rating -- so many pounds within so many feet -- and where one is published it governs; it does not scale down linearly to a shorter bearing length. A machine standing on four small feet puts its whole weight into a square foot of deck between two crossmembers, which is not what the deck was designed to do -- four 6 by 6 in feet under a 12,000 lb machine is one square foot of total bearing and 12,000 psf into the deck plate, an order of magnitude past what any deck plate carries, and the feet go through. Dunnage exists to convert that point load back into a linear one: timbers run across the deck, perpendicular to the crossmembers, spread the load along the trailer's length, and it is the LENGTH of that bearing along the trailer -- not its width, and not the timber's cross-section -- that divides the load. The most useful output is the last one. A 12,000 lb machine on a deck rated 1,200 plf planned on two 8 ft timbers puts 1,500 plf into the deck at 125% of the rating; ten feet of bearing lands exactly at the rating and twelve feet gives a comfortable 83%. A screen, never a stamp: the trailer manufacturer's published deck rating and concentrated-load rating, and a qualified person, govern.",
  };
}

export const deckPointLoadDunnageExample = { inputs: { load_lb: 12000, feet_count: 4, foot_area_sqin: 36, dunnage_bearing_ft: 8, deck_rating_plf: 1200 } };

TRUCKINGFIELD_RENDERERS["deck-point-load-dunnage"] = _simpleRenderer({
  citation: "Citation: trailer deck capacity rated in pounds per linear foot, with dunnage converting a concentrated load into a linear one over its bearing LENGTH along the trailer, by name. The deck rating is the trailer manufacturer's published figure, entered rather than bundled. A screen, never a stamp; the manufacturer's deck and concentrated-load ratings and a qualified person govern.",
  example: deckPointLoadDunnageExample.inputs,
  fields: [
    { key: "load_lb", label: "Concentrated load (lb)", kind: "number" },
    { key: "feet_count", label: "Number of bearing feet", kind: "number" },
    { key: "foot_area_sqin", label: "Area of each bearing foot (sq in, 0 to skip)", kind: "number" },
    { key: "dunnage_bearing_ft", label: "Dunnage bearing length along the trailer (ft)", kind: "number" },
    { key: "deck_rating_plf", label: "Deck rating (lb per linear ft)", kind: "number" },
  ],
  outputs: [
    { key: "b", id: "dpld-out-b", label: "Bare bearing pressure, no dunnage", value: (r) => r.bearing_pressure_psf === null ? "-" : fmt(r.bearing_pressure_psf, 0) + " psf on " + fmt(r.total_bearing_sqft, 2) + " sq ft" },
    { key: "l", id: "dpld-out-l", label: "Linear load with the dunnage as planned", value: (r) => fmt(r.linear_load_plf, 0) + " lb per linear ft" },
    { key: "u", id: "dpld-out-u", label: "Utilization against the deck rating", value: (r) => fmt(r.utilization_pct, 1) + " % -- " + r.verdict },
    { key: "r", id: "dpld-out-r", label: "Dunnage bearing required at the rating", value: (r) => fmt(r.required_length_ft, 2) + " ft" },
    { key: "n", id: "dpld-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDeckPointLoadDunnage,
});
