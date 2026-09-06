// calc-sawmill.js -- Group L (cont.): the sawmill and forest-products bench.
//
// specs/scope-trade-expansion-2.md found the forest-products vocabulary
// served only up to the stump. The catalog cruises timber, weighs a log,
// chips brush and stacks a cord -- and then stops. Nothing follows the log
// into the mill: no overrun, no lumber recovery factor, no kiln schedule
// arithmetic, no bite per tooth, no residue split, and no answer to the
// question a loader operator asks every load, which is how much of THIS
// wood is a legal truck.
//
// Tiles (all group "L", the existing Agriculture and Forestry category):
//   v1582 lumber-recovery-overrun   v1585 bandmill-speed-bite
//   v1583 kiln-drying-time          v1586 sawmill-residue-yield
//   v1584 kiln-charge-water         v1587 log-truck-payload
//
// See spec-v1582.md through spec-v1587.md.

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

// Compact renderer factory (number inputs only here; same shape as the
// calc-trenchless.js / calc-rail.js / calc-mining.js _simpleRenderer).
function _simpleRenderer(spec) {
  const _smRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
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

  _smRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _smRender;
}

export const SAWMILL_RENDERERS = {};

// 8.3454 lb per US gallon of water at 60 degF, and 24 hours in a day.
const _LB_PER_GAL_WATER = 8.3454;
const _HOURS_PER_DAY = 24;

// ============ spec-v1582: lumber recovery and overrun ============

// dims: in { scaled_bf: dimensionless, actual_bf: dimensionless, log_volume_cuft: L^3, benchmark_recovery_bf_per_cuft: L^-3, avg_log_diameter_in: L, log_length_ft: L, kerf_in: L, target_kerf_in: L, board_thickness_in: L } out: { overrun_pct: dimensionless, recovery_bf_per_cuft: L^-3, scale_bias_overrun_pct: dimensionless, kerf_gain_bf: dimensionless, sawdust_share_pct: dimensionless }
export function computeLumberRecoveryOverrun({ scaled_bf = 0, actual_bf = 0, log_volume_cuft = 0, benchmark_lrf = 7, avg_log_diameter_in = 0, log_length_ft = 16, kerf_in = 0, target_kerf_in = 0, board_thickness_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(scaled_bf > 0)) return { error: "Scaled board feet must be positive." };
  if (!(actual_bf > 0)) return { error: "Tallied (actual) board feet must be positive." };
  if (!(log_volume_cuft > 0)) return { error: "Log cubic volume must be positive." };
  if (!(benchmark_lrf > 0)) return { error: "Benchmark lumber recovery factor must be positive." };
  if (!(avg_log_diameter_in > 4)) return { error: "Average small-end log diameter must exceed 4 in (the Doyle slab allowance)." };
  if (!(log_length_ft > 0)) return { error: "Log length must be positive." };
  if (!(kerf_in > 0)) return { error: "Saw kerf must be positive." };
  if (!(target_kerf_in > 0)) return { error: "Target saw kerf must be positive." };
  if (!(board_thickness_in > 0)) return { error: "Board thickness must be positive." };
  const overrun_pct = (actual_bf - scaled_bf) / scaled_bf * 100;
  const recovery_bf_per_cuft = actual_bf / log_volume_cuft;
  const lrf_vs_benchmark_pct = (recovery_bf_per_cuft / benchmark_lrf - 1) * 100;
  // The overrun a mill would show on this log size from the SCALE RULE
  // alone: Doyle's fixed 4 in slab allowance against International 1/4,
  // which is the least biased of the three published rules. Both are the
  // same relations `timber-cruise` scales a single log with; the useful
  // number here is their DIFFERENCE, which nothing else reports.
  const doyle_bf = Math.pow(avg_log_diameter_in - 4, 2) * (log_length_ft / 16);
  const international_bf = Math.max(0, 0.22 * avg_log_diameter_in * avg_log_diameter_in - 0.71 * avg_log_diameter_in) * (log_length_ft / 4);
  const scale_bias_overrun_pct = (international_bf - doyle_bf) / doyle_bf * 100;
  const performance_overrun_pts = overrun_pct - scale_bias_overrun_pct;
  // Kerf: each cut consumes kerf + board thickness of log, so the boards
  // recovered from the same wood go as (kerf + t) / (target kerf + t).
  const kerf_gain_pct = ((kerf_in + board_thickness_in) / (target_kerf_in + board_thickness_in) - 1) * 100;
  const kerf_gain_bf = actual_bf * kerf_gain_pct / 100;
  const sawdust_share_pct = kerf_in / (kerf_in + board_thickness_in) * 100;
  const target_sawdust_share_pct = target_kerf_in / (target_kerf_in + board_thickness_in) * 100;
  return {
    overrun_pct, recovery_bf_per_cuft, lrf_vs_benchmark_pct,
    doyle_bf, international_bf, scale_bias_overrun_pct, performance_overrun_pts,
    kerf_gain_pct, kerf_gain_bf, sawdust_share_pct, target_sawdust_share_pct,
    bias_verdict: overrun_pct >= scale_bias_overrun_pct
      ? "the tally beats what Doyle's bias alone would give on this log size, so the surplus is sawing"
      : "Doyle's bias alone would give more than the tally shows on this log size, so the overrun is the scale rule and the sawing is behind it",
    note: "Overrun is a property of the SCALE, not only of the mill. Doyle subtracts a fixed slab allowance that is far too large on small logs, so a small log scales at a fraction of what it actually cuts and a mill running small wood on Doyle can show overrun of 50% or more; the same mill running 20 in logs shows very little. A mill comparing its overrun month to month without tracking log diameter is measuring its log mix, not its performance -- which is why the overrun Doyle's bias alone would produce at the entered diameter is reported beside the measured one. LUMBER RECOVERY FACTOR IS THE HONEST MEASURE because it compares output to actual wood volume rather than to a scaling convention. It responds to the things a mill can control: saw kerf, sawing accuracy, target sizes and how much oversize is being cut for shrinkage, edging and trimming practice, and how the sawyer breaks down each log. The commercial point follows. Overrun on a conservative scale is not free money, because everyone knows the scale is conservative and the log price already reflects it. Improving recovery is real; improving overrun by buying smaller logs is not. A ratio calculation from volumes the user supplies. Overrun is not comparable between mills, between scale rules, or across a changing log mix. It does not compute log scale itself, and it does not address scaling deductions for defect, which materially change the scaled volume and are a matter of the scaler's judgment and the applicable scaling handbook. It does not evaluate GRADE recovery, which is where hardwood value actually sits -- a mill can raise volume recovery and lose money by degrading grade -- or value recovery per log, and it does not address green versus dry tally or the shrinkage allowance in target sizes. The applicable scaling rule and handbook, the grading rules of the applicable agency, and the mill's own scaling and tally records govern.",
  };
}
const lumberRecoveryOverrunExample = { inputs: { scaled_bf: 1000, actual_bf: 1240, log_volume_cuft: 210, benchmark_recovery_bf_per_cuft: 7, avg_log_diameter_in: 10, log_length_ft: 16, kerf_in: 0.180, target_kerf_in: 0.125, board_thickness_in: 1 } };
SAWMILL_RENDERERS["lumber-recovery-overrun"] = _simpleRenderer({
  citation: "Citation: the standard mill definitions by name -- overrun = (tallied board feet - scaled board feet) / scaled x 100, and lumber recovery factor = board feet produced / cubic feet of log input. The scale-bias comparison uses the published Doyle rule (D - 4) squared x length / 16 against the International 1/4 rule (0.22 D squared - 0.71 D) per 4 ft section, both public domain. The applicable scaling rule and handbook, the grading agency, and the mill's own scale and tally records govern.",
  example: lumberRecoveryOverrunExample.inputs,
  fields: [
    { key: "scaled_bf", label: "Scaled volume of the logs (board feet)", kind: "number", default: 1000 },
    { key: "actual_bf", label: "Lumber tallied out (board feet)", kind: "number", default: 1240 },
    { key: "log_volume_cuft", label: "Log input volume (cu ft)", kind: "number", default: 210 },
    { key: "benchmark_lrf", label: "Benchmark recovery (board feet per cu ft)", kind: "number", default: 7 },
    { key: "avg_log_diameter_in", label: "Average small-end log diameter (in)", kind: "number", default: 10 },
    { key: "log_length_ft", label: "Average log length (ft)", kind: "number", default: 16 },
    { key: "kerf_in", label: "Saw kerf now (in)", kind: "number", default: 0.180 },
    { key: "target_kerf_in", label: "Saw kerf after a change (in)", kind: "number", default: 0.125 },
    { key: "board_thickness_in", label: "Average board thickness cut (in)", kind: "number", default: 1 },
  ],
  outputs: [
    { key: "o", id: "lro-out-o", label: "Overrun", value: (r) => fmt(r.overrun_pct, 1) + "%" },
    { key: "l", id: "lro-out-l", label: "Lumber recovery factor", value: (r) => fmt(r.recovery_bf_per_cuft, 2) + " board feet per cu ft, " + fmt(Math.abs(r.lrf_vs_benchmark_pct), 1) + "% " + (r.lrf_vs_benchmark_pct < 0 ? "below" : "above") + " the entered benchmark" },
    { key: "b", id: "lro-out-b", label: "Overrun from the scale rule alone at this diameter", value: (r) => fmt(r.scale_bias_overrun_pct, 1) + "% (Doyle " + fmt(r.doyle_bf, 0) + " board feet against International 1/4 " + fmt(r.international_bf, 0) + ") -- " + r.bias_verdict },
    { key: "k", id: "lro-out-k", label: "Changing the kerf", value: (r) => fmt(r.kerf_gain_pct, 1) + "% more lumber from the same logs, " + fmt(r.kerf_gain_bf, 0) + " board feet on this tally" },
    { key: "s", id: "lro-out-s", label: "Sawdust share of the wood cut", value: (r) => fmt(r.sawdust_share_pct, 1) + "% now, " + fmt(r.target_sawdust_share_pct, 1) + "% at the changed kerf" },
    { key: "n", id: "lro-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLumberRecoveryOverrun,
});

// ============ spec-v1583: kiln drying time ============

// dims: in { mc_initial_pct: dimensionless, mc_final_pct: dimensionless, fsp_mc_pct: dimensionless, rate_above_fsp_ppd: T^-1, rate_below_fsp_ppd: T^-1, equalize_condition_days: T, thickness_in: L, alt_thickness_in: L, thickness_exponent: dimensionless } out: { days_above_fsp: T, days_below_fsp: T, drying_days: T, cycle_days: T, alt_drying_days: T }
export function computeKilnDryingTime({ mc_initial_pct = 0, mc_final_pct = 0, fsp_mc_pct = 30, rate_above_fsp_ppd = 0, rate_below_fsp_ppd = 0, equalize_condition_days = 0, thickness_in = 0, alt_thickness_in = 0, thickness_exponent = 1.8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(mc_initial_pct > 0)) return { error: "Initial moisture content must be positive." };
  if (!(mc_final_pct >= 0)) return { error: "Final moisture content cannot be negative." };
  if (!(mc_initial_pct > mc_final_pct)) return { error: "Initial moisture content must exceed the final (you cannot dry up)." };
  if (!(fsp_mc_pct > 0)) return { error: "Fibre saturation point must be positive." };
  if (!(rate_above_fsp_ppd > 0)) return { error: "The rate above fibre saturation must be positive (points per day)." };
  if (!(rate_below_fsp_ppd > 0)) return { error: "The rate below fibre saturation must be positive (points per day)." };
  if (!(equalize_condition_days >= 0)) return { error: "Equalizing and conditioning time cannot be negative." };
  if (!(thickness_in > 0)) return { error: "Thickness must be positive." };
  if (!(alt_thickness_in > 0)) return { error: "The alternative thickness must be positive." };
  if (!(thickness_exponent > 0)) return { error: "The thickness exponent must be positive." };
  // The schedule has two regimes and only the part of the run that falls in
  // each one counts. Above fibre saturation free water moves easily; below
  // it, bound water moves by diffusion and the rate collapses.
  const top = Math.min(mc_initial_pct, Math.max(mc_final_pct, fsp_mc_pct));
  const days_above_fsp = (mc_initial_pct - top) / rate_above_fsp_ppd;
  const days_below_fsp = (top - mc_final_pct) / rate_below_fsp_ppd;
  const drying_days = days_above_fsp + days_below_fsp;
  const cycle_days = drying_days + equalize_condition_days;
  const points_removed = mc_initial_pct - mc_final_pct;
  const linear_rate_ppd = points_removed / drying_days;
  const below_share_pct = days_below_fsp / drying_days * 100;
  const thickness_scale = Math.pow(alt_thickness_in / thickness_in, thickness_exponent);
  const alt_drying_days = drying_days * thickness_scale;
  const alt_cycle_days = alt_drying_days + equalize_condition_days;
  const proportional_days = drying_days * (alt_thickness_in / thickness_in);
  const underquote_factor = thickness_scale / (alt_thickness_in / thickness_in);
  return {
    days_above_fsp, days_below_fsp, drying_days, cycle_days,
    points_removed, linear_rate_ppd, below_share_pct, rate_below_fsp_ppd,
    thickness_scale, alt_drying_days, alt_cycle_days,
    proportional_days, underquote_factor,
    note: "The thickness law is the fact worth carrying, and it is not proportional. Moisture has to diffuse to the surface, and doubling the path more than doubles the time, so a mill quoting 8/4 on twice the 4/4 schedule has underquoted by most of a factor of two. It is also why 4/4 and 8/4 should not share a charge: the schedule that is safe for the thick stock is wasteful for the thin, and the schedule that suits the thin stock will degrade the thick. THE RATE IS NOT CONSTANT EITHER. Above the fibre saturation point water moves freely and drying is fast; below it, bound water moves by diffusion and the rate collapses, which is why the last twenty points can take as long as the first fifty and why an average rate applied linearly badly understates the tail of a schedule. Both regimes are computed separately here for that reason, and the misleading linear average is reported beside them so the difference is visible. EQUALIZING AND CONDITIONING ARE SEPARATE AND NOT OPTIONAL on stock that will be machined. Equalizing brings the whole charge to a uniform moisture content; conditioning relieves the drying stresses that otherwise cause boards to cup, pinch the saw, or move after machining. A schedule quoted without them is not a complete schedule, and the kiln is occupied for the whole of it. A time estimate from schedule rates the user supplies. It does not produce a drying schedule and must not be used as one: schedules are species, thickness, and grade specific, are published by the Forest Products Laboratory and by kiln manufacturers, and specify dry-bulb and wet-bulb temperatures step by step rather than a rate. Running faster than the schedule causes surface checking, honeycomb, collapse, and casehardening, and none of that is visible until the wood is machined. The thickness exponent is an approximation and varies by species and by whether drying is diffusion or flow limited. It does not address air drying, pre-drying, sticker and airflow requirements, kiln sample practice, or the moisture meter corrections needed for species and temperature. The applicable drying schedule, the kiln manufacturer, and the mill's own kiln samples govern.",
  };
}
const kilnDryingTimeExample = { inputs: { mc_initial_pct: 85, mc_final_pct: 8, fsp_mc_pct: 30, rate_above_fsp_ppd: 3.5, rate_below_fsp_ppd: 1.6, equalize_condition_days: 4, thickness_in: 1, alt_thickness_in: 2, thickness_exponent: 1.8 } };
SAWMILL_RENDERERS["kiln-drying-time"] = _simpleRenderer({
  citation: "Citation: the schedule-rate time relation by name -- days = moisture-content points to remove / the schedule's rate in points per day, split at the fibre saturation point because the rate collapses below it -- with drying time scaling as thickness to an entered exponent (commonly 1.5 to 2). The Forest Products Laboratory dry-kiln schedules, the kiln manufacturer, and the mill's own kiln samples govern the schedule itself.",
  example: kilnDryingTimeExample.inputs,
  fields: [
    { key: "mc_initial_pct", label: "Initial moisture content (%)", kind: "number", default: 85 },
    { key: "mc_final_pct", label: "Target final moisture content (%)", kind: "number", default: 8 },
    { key: "fsp_mc_pct", label: "Fibre saturation point (%)", kind: "number", default: 30 },
    { key: "rate_above_fsp_ppd", label: "Schedule rate above fibre saturation (points per day)", kind: "number", default: 3.5 },
    { key: "rate_below_fsp_ppd", label: "Schedule rate below fibre saturation (points per day)", kind: "number", default: 1.6 },
    { key: "equalize_condition_days", label: "Equalizing and conditioning (days)", kind: "number", default: 4 },
    { key: "thickness_in", label: "Stock thickness (in)", kind: "number", default: 1 },
    { key: "alt_thickness_in", label: "Thickness to compare (in)", kind: "number", default: 2 },
    { key: "thickness_exponent", label: "Thickness exponent (1.5 to 2)", kind: "number", default: 1.8 },
  ],
  outputs: [
    { key: "a", id: "kdt-out-a", label: "Above fibre saturation", value: (r) => fmt(r.days_above_fsp, 1) + " days" },
    { key: "b", id: "kdt-out-b", label: "Below fibre saturation", value: (r) => fmt(r.days_below_fsp, 1) + " days -- " + fmt(r.below_share_pct, 0) + "% of the drying time" },
    { key: "t", id: "kdt-out-t", label: "Drying, then the whole charge cycle", value: (r) => fmt(r.drying_days, 1) + " days drying, " + fmt(r.cycle_days, 1) + " days including equalizing and conditioning" },
    { key: "l", id: "kdt-out-l", label: "What a single average rate would hide", value: (r) => fmt(r.linear_rate_ppd, 2) + " points per day averaged over the run, against " + fmt(r.rate_below_fsp_ppd || 0, 2) + " actually available below fibre saturation" },
    { key: "s", id: "kdt-out-s", label: "At the compared thickness", value: (r) => fmt(r.alt_drying_days, 0) + " days drying (" + fmt(r.alt_cycle_days, 0) + " days of kiln), " + fmt(r.thickness_scale, 2) + " times the entered stock -- quoting it proportionally at " + fmt(r.proportional_days, 0) + " days underquotes by " + fmt(r.underquote_factor, 2) + " times" },
    { key: "n", id: "kdt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeKilnDryingTime,
});

// ============ spec-v1584: kiln charge water and vent load ============

// dims: in { green_weight_lb: M, mc_initial_pct: dimensionless, mc_final_pct: dimensionless, btu_per_lb_water: L^2 T^-2, schedule_days: T, intermediate_mc_pct: dimensionless } out: { oven_dry_lb: M, water_lb: M, water_gal: L^3, energy_btu: M L^2 T^-2, vent_lb_per_hr: M T^-1 }
export function computeKilnChargeWater({ green_weight_lb = 0, mc_initial_pct = 0, mc_final_pct = 0, btu_per_lb_water = 2000, schedule_days = 0, intermediate_mc_pct = 30 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(green_weight_lb > 0)) return { error: "Charge green weight must be positive." };
  if (!(mc_initial_pct > 0)) return { error: "Initial moisture content must be positive." };
  if (!(mc_final_pct >= 0)) return { error: "Final moisture content cannot be negative." };
  if (!(mc_initial_pct > mc_final_pct)) return { error: "Initial moisture content must exceed the final (you cannot dry up)." };
  if (!(btu_per_lb_water > 0)) return { error: "Energy per pound of water must be positive." };
  if (!(schedule_days > 0)) return { error: "Schedule duration must be positive." };
  if (!(intermediate_mc_pct > mc_final_pct && intermediate_mc_pct < mc_initial_pct)) return { error: "The intermediate moisture content must fall between the final and the initial." };
  // Wood moisture content is on an OVEN-DRY basis: water weight over the
  // oven-dry wood weight, so green weight = oven-dry x (1 + MC/100).
  const oven_dry_lb = green_weight_lb / (1 + mc_initial_pct / 100);
  const green_water_lb = green_weight_lb - oven_dry_lb;
  const water_lb = oven_dry_lb * (mc_initial_pct - mc_final_pct) / 100;
  const water_gal = water_lb / _LB_PER_GAL_WATER;
  const energy_btu = water_lb * btu_per_lb_water;
  // The error this exists to prevent: applying an oven-dry-basis percentage
  // to a GREEN weight. The overstatement is exactly the initial moisture
  // content, because green / oven-dry = 1 + MC/100.
  const wrong_way_lb = green_weight_lb * (mc_initial_pct - mc_final_pct) / 100;
  const wrong_way_excess_lb = wrong_way_lb - water_lb;
  const wrong_way_excess_pct = (wrong_way_lb / water_lb - 1) * 100;
  const avg_rate_ppd = (mc_initial_pct - mc_final_pct) / schedule_days;
  const vent_lb_per_hr = water_lb / (schedule_days * _HOURS_PER_DAY);
  const vent_gal_per_hr = vent_lb_per_hr / _LB_PER_GAL_WATER;
  const water_removed_to_intermediate_lb = oven_dry_lb * (mc_initial_pct - intermediate_mc_pct) / 100;
  const water_remaining_at_intermediate_lb = oven_dry_lb * (intermediate_mc_pct - mc_final_pct) / 100;
  const pct_water_out_by_intermediate = water_removed_to_intermediate_lb / water_lb * 100;
  return {
    oven_dry_lb, green_water_lb, water_lb, water_gal, energy_btu,
    energy_mmbtu: energy_btu / 1e6,
    wrong_way_lb, wrong_way_excess_lb, wrong_way_excess_pct,
    avg_rate_ppd, vent_lb_per_hr, vent_gal_per_hr,
    water_removed_to_intermediate_lb, water_remaining_at_intermediate_lb,
    pct_water_out_by_intermediate,
    green_water_share_pct: green_water_lb / green_weight_lb * 100,
    note: "THE OVEN-DRY BASIS IS THE TRAP. Wood moisture content is water weight divided by OVEN-DRY wood weight, not by total weight, so 100% moisture content means the water weighs as much as the wood, and green hardwood above 100% is entirely ordinary. Computing the water from green weight times the moisture percentage is wrong and gives a number substantially too high -- too high by exactly the initial moisture content, because green weight is oven-dry weight times one plus that fraction. Both figures are reported here so the size of that error is visible rather than argued. ONCE THE WATER TONNAGE IS KNOWN EVERYTHING ELSE FOLLOWS. The energy is that mass times a heat requirement well above the latent heat of water, because a conventional kiln also heats the wood, heats the kiln, and loses heat out the vents along with the moisture. The vent load is what sizes the venting and, in a dehumidification kiln, what sizes the compressor -- and it is reported per hour because that is the rate the equipment has to carry, not the total. THE OTHER REASON TO HAVE THE NUMBER IS SCHEDULE SANITY. A charge with twice the water takes far longer than twice as long at the same drying rate, because the safe rate falls as the wood dries and the schedule's later steps are the slow ones. Most of the water leaves before fibre saturation and most of the TIME is spent after it, which is why the water still in the wood at an intermediate moisture content is reported: a mill that knows both knows whether a schedule is plausible before starting it. A mass and energy calculation. It does not produce or validate a drying schedule: schedules are species, thickness, and grade specific, they are published by the Forest Products Laboratory and by kiln manufacturers, and running wood faster than its schedule allows causes checking, honeycomb, collapse, and casehardening that no energy calculation predicts. The energy-per-pound figure is a broad range that depends on kiln type, insulation, venting practice, and whether heat recovery is fitted; a dehumidification kiln's energy is electrical and follows entirely different arithmetic. It does not address air drying before the kiln, sticker spacing and airflow, equalizing and conditioning steps, or stress relief, and it does not address the moisture content measurement itself, which is done with kiln samples and a moisture meter rather than by calculation. The applicable drying schedule, the kiln manufacturer, and the mill's own kiln samples govern.",
  };
}
const kilnChargeWaterExample = { inputs: { green_weight_lb: 40000, mc_initial_pct: 85, mc_final_pct: 8, btu_per_lb_water: 2000, schedule_days: 28, intermediate_mc_pct: 30 } };
SAWMILL_RENDERERS["kiln-charge-water"] = _simpleRenderer({
  citation: "Citation: the oven-dry-basis moisture relation by name -- oven-dry weight = green weight / (1 + moisture content / 100), and water to remove = oven-dry weight x the moisture-content points removed / 100 -- at 8.3454 lb per US gallon of water, with an entered energy per pound of water (roughly 1,500 to 2,500 BTU for a conventional kiln). The Forest Products Laboratory dry-kiln schedules, the kiln manufacturer, and the mill's own kiln samples govern.",
  example: kilnChargeWaterExample.inputs,
  fields: [
    { key: "green_weight_lb", label: "Charge green weight (lb)", kind: "number", default: 40000 },
    { key: "mc_initial_pct", label: "Initial moisture content, oven-dry basis (%)", kind: "number", default: 85 },
    { key: "mc_final_pct", label: "Target final moisture content (%)", kind: "number", default: 8 },
    { key: "btu_per_lb_water", label: "Kiln energy per pound of water (BTU)", kind: "number", default: 2000 },
    { key: "schedule_days", label: "Schedule duration (days)", kind: "number", default: 28 },
    { key: "intermediate_mc_pct", label: "Intermediate moisture content to check (%)", kind: "number", default: 30 },
  ],
  outputs: [
    { key: "d", id: "kcw-out-d", label: "Oven-dry weight of the charge", value: (r) => fmt(r.oven_dry_lb, 0) + " lb, so " + fmt(r.green_water_share_pct, 0) + "% of what came in the door is water" },
    { key: "w", id: "kcw-out-w", label: "Water to remove", value: (r) => fmt(r.water_lb, 0) + " lb, " + fmt(r.water_gal, 0) + " gallons" },
    { key: "x", id: "kcw-out-x", label: "The wrong way, on green weight", value: (r) => fmt(r.wrong_way_lb, 0) + " lb -- " + fmt(r.wrong_way_excess_lb, 0) + " lb too high, an overstatement of " + fmt(r.wrong_way_excess_pct, 0) + "%" },
    { key: "e", id: "kcw-out-e", label: "Energy for the charge", value: (r) => fmt(r.energy_mmbtu, 1) + " million BTU" },
    { key: "v", id: "kcw-out-v", label: "Vent load and schedule check", value: (r) => fmt(r.vent_lb_per_hr, 1) + " lb of water per hour, at an average " + fmt(r.avg_rate_ppd, 2) + " moisture points per day" },
    { key: "i", id: "kcw-out-i", label: "At the intermediate moisture content", value: (r) => fmt(r.pct_water_out_by_intermediate, 0) + "% of the water is already out, and " + fmt(r.water_remaining_at_intermediate_lb, 0) + " lb is still in the wood" },
    { key: "n", id: "kcw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeKilnChargeWater,
});

// ============ spec-v1585: bandmill blade speed, feed, and bite ============

// dims: in { wheel_diameter_in: L, wheel_rpm: T^-1, tooth_spacing_in: L, feed_rate_fpm: L T^-1, target_bite_in: L, kerf_in: L, depth_of_face_in: L, gullet_capacity_cuin: L^3 } out: { blade_speed_sfpm: L T^-1, teeth_per_min: T^-1, bite_in: L, feed_for_target_fpm: L T^-1, max_face_in: L }
export function computeBandmillSpeedBite({ wheel_diameter_in = 0, wheel_rpm = 0, tooth_spacing_in = 0, feed_rate_fpm = 0, target_bite_in = 0, kerf_in = 0, depth_of_face_in = 0, gullet_capacity_cuin = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(wheel_diameter_in > 0)) return { error: "Wheel diameter must be positive." };
  if (!(wheel_rpm > 0)) return { error: "Wheel speed must be positive (rpm)." };
  if (!(tooth_spacing_in > 0)) return { error: "Tooth spacing must be positive." };
  if (!(feed_rate_fpm > 0)) return { error: "Feed speed must be positive." };
  if (!(target_bite_in > 0)) return { error: "Target bite per tooth must be positive." };
  if (!(kerf_in > 0)) return { error: "Kerf must be positive." };
  if (!(depth_of_face_in > 0)) return { error: "Depth of face must be positive." };
  if (!(gullet_capacity_cuin > 0)) return { error: "Gullet capacity must be positive." };
  // The band's surface speed is the wheel's rim speed: pi x diameter (in) /
  // 12 x rpm. Teeth pass a point at that speed divided by tooth spacing.
  const blade_speed_sfpm = Math.PI * wheel_diameter_in / 12 * wheel_rpm;
  const teeth_per_min = blade_speed_sfpm * 12 / tooth_spacing_in;
  // Bite per tooth is the wood advanced between successive teeth.
  const bite_in = feed_rate_fpm * 12 / teeth_per_min;
  const feed_for_target_fpm = target_bite_in * teeth_per_min / 12;
  const in_typical_band = bite_in >= 0.020 && bite_in <= 0.045;
  // Each gullet carries the sawdust from one bite across the whole face.
  const gullet_load_cuin = bite_in * kerf_in * depth_of_face_in;
  const gullet_use_pct = gullet_load_cuin / gullet_capacity_cuin * 100;
  const max_face_in = gullet_capacity_cuin / (bite_in * kerf_in);
  const max_feed_at_face_fpm = gullet_capacity_cuin / (kerf_in * depth_of_face_in) * teeth_per_min / 12;
  return {
    blade_speed_sfpm, teeth_per_min, bite_in, feed_for_target_fpm,
    in_typical_band, gullet_load_cuin, gullet_use_pct, max_face_in,
    max_feed_at_face_fpm,
    bite_verdict: bite_in < 0.020
      ? "BELOW the 0.020 to 0.045 in band -- the teeth are rubbing rather than cutting, which is what makes heat, dulling, and washboard"
      : bite_in > 0.045
        ? "ABOVE the 0.020 to 0.045 in band -- a gullet that fills before it leaves the cut packs, and a packed gullet is what makes a saw dive"
        : "inside the 0.020 to 0.045 in band that suits softwood; dense hardwood wants the lower half of it",
    face_verdict: max_face_in >= depth_of_face_in
      ? "the gullet carries this bite through the entered face with room left"
      : "the gullet is over capacity in the entered face -- slow the feed to " + fmt(max_feed_at_face_fpm, 0) + " ft/min or take a shallower face",
    note: "Bite per tooth is what each tooth actually takes, and a band's behaviour follows from it. Too small a bite means the tooth is rubbing rather than cutting, which generates heat, work-hardens the tip, and produces the washboard finish that gets blamed on tension. Too large a bite overloads the gullet, and a gullet that fills before it exits the cut packs, which is what makes a saw dive. THE GULLET IS THE REAL CONSTRAINT and it is why bite and depth of face cannot be considered separately. A bite that is fine in a 12 in cant is too much in a 30 in one, because the gullet has to carry the sawdust across a face two and a half times as deep. That is the arithmetic behind slowing the feed as the cants get bigger, and it is why a mill running mixed sizes at a fixed feed speed has a saw problem on the big logs only -- so the deepest face the gullet supports at the current bite is reported beside the bite itself. FOR A FILER THE USEFUL INVERSION is what feed speed a target bite implies at the current blade speed and tooth spacing, because that is a setting the sawyer can act on directly, where blade speed and tooth spacing are not. A kinematic relation between feed, blade speed, and tooth spacing. It does not evaluate gullet capacity from first principles, which requires the gullet area, the sawdust bulking factor for the species and moisture, and the depth of face; the capacity is entered and the interaction is flagged, but the filer's judgment and the saw manufacturer's guidance govern. It does not address saw tension, wheel alignment and tracking, tooth geometry, hook and clearance angles, set or swage, blade width and gauge, or strain -- all of which affect cutting behaviour at least as much as bite does and none of which is arithmetic. It does not address sawing accuracy, target sizes, or the oversize allowances that determine recovery. Band saws operating at these speeds are a serious hazard: the saw and mill manufacturers' specifications, a qualified filer, and OSHA govern.",
  };
}
const bandmillSpeedBiteExample = { inputs: { wheel_diameter_in: 54, wheel_rpm: 580, tooth_spacing_in: 1.75, feed_rate_fpm: 120, target_bite_in: 0.030, kerf_in: 0.100, depth_of_face_in: 12, gullet_capacity_cuin: 0.060 } };
SAWMILL_RENDERERS["bandmill-speed-bite"] = _simpleRenderer({
  citation: "Citation: standard sawfiling kinematics by name -- blade speed in surface feet per minute = pi x wheel diameter (in) / 12 x rpm, teeth passing per minute = that speed x 12 / tooth spacing, and bite per tooth = feed speed x 12 / teeth per minute -- with the 0.020 to 0.045 in softwood band as sawfiling practice. The saw and mill manufacturers, a qualified filer, and OSHA govern.",
  example: bandmillSpeedBiteExample.inputs,
  fields: [
    { key: "wheel_diameter_in", label: "Band wheel diameter (in)", kind: "number", default: 54 },
    { key: "wheel_rpm", label: "Wheel speed (rpm)", kind: "number", default: 580 },
    { key: "tooth_spacing_in", label: "Tooth spacing (in)", kind: "number", default: 1.75 },
    { key: "feed_rate_fpm", label: "Feed speed (ft/min)", kind: "number", default: 120 },
    { key: "target_bite_in", label: "Target bite per tooth (in)", kind: "number", default: 0.030 },
    { key: "kerf_in", label: "Kerf (in)", kind: "number", default: 0.100 },
    { key: "depth_of_face_in", label: "Depth of face being cut (in)", kind: "number", default: 12 },
    { key: "gullet_capacity_cuin", label: "Gullet capacity (cu in of sawdust)", kind: "number", default: 0.060 },
  ],
  outputs: [
    { key: "s", id: "bsb-out-s", label: "Blade speed", value: (r) => fmt(r.blade_speed_sfpm, 0) + " surface ft/min, " + fmt(r.teeth_per_min, 0) + " teeth past the cut each minute" },
    { key: "b", id: "bsb-out-b", label: "Bite per tooth", value: (r) => fmt(r.bite_in, 4) + " in -- " + r.bite_verdict },
    { key: "f", id: "bsb-out-f", label: "Feed speed for the target bite", value: (r) => fmt(r.feed_for_target_fpm, 0) + " ft/min" },
    { key: "g", id: "bsb-out-g", label: "Gullet load in this face", value: (r) => fmt(r.gullet_load_cuin, 4) + " cu in per gullet, " + fmt(r.gullet_use_pct, 0) + "% of capacity" },
    { key: "d", id: "bsb-out-d", label: "Deepest face this bite supports", value: (r) => fmt(r.max_face_in, 1) + " in -- " + r.face_verdict },
    { key: "n", id: "bsb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBandmillSpeedBite,
});

// ============ spec-v1586: sawmill residue and sawdust yield ============

// dims: in { lumber_recovery_pct: dimensionless, kerf_in: L, target_kerf_in: L, board_thickness_in: L, alt_board_thickness_in: L, bark_fraction_pct: dimensionless, annual_lumber_mbf: dimensionless } out: { sawdust_share_pct: dimensionless, residue_pct: dimensionless, chips_of_log_pct: dimensionless, gain_pts: dimensionless, annual_gain_bf: dimensionless }
export function computeSawmillResidueYield({ lumber_recovery_pct = 0, kerf_in = 0, target_kerf_in = 0, board_thickness_in = 0, alt_board_thickness_in = 0, bark_fraction_pct = 0, annual_lumber_mbf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(lumber_recovery_pct > 0 && lumber_recovery_pct < 100)) return { error: "Lumber recovery must be between 0 and 100 percent of log volume." };
  if (!(kerf_in > 0)) return { error: "Kerf must be positive." };
  if (!(target_kerf_in > 0)) return { error: "The compared kerf must be positive." };
  if (!(board_thickness_in > 0)) return { error: "Board thickness must be positive." };
  if (!(alt_board_thickness_in > 0)) return { error: "The compared board thickness must be positive." };
  if (!(bark_fraction_pct >= 0 && bark_fraction_pct < 100)) return { error: "Bark fraction must be between 0 and 100 percent." };
  if (!(annual_lumber_mbf > 0)) return { error: "Annual lumber production must be positive (MBF)." };
  // Every cut turns a kerf-width slice into sawdust, so the sawdust share of
  // the wood cut is kerf over kerf plus board thickness.
  const sawdust_share_pct = kerf_in / (kerf_in + board_thickness_in) * 100;
  const target_sawdust_share_pct = target_kerf_in / (target_kerf_in + board_thickness_in) * 100;
  const gain_pts = sawdust_share_pct - target_sawdust_share_pct;
  const alt_share_pct = kerf_in / (kerf_in + alt_board_thickness_in) * 100;
  const alt_target_share_pct = target_kerf_in / (target_kerf_in + alt_board_thickness_in) * 100;
  const alt_gain_pts = alt_share_pct - alt_target_share_pct;
  const gain_ratio = alt_gain_pts / gain_pts;
  const residue_pct = 100 - lumber_recovery_pct;
  // Bark comes off before the saw, so the kerf share applies to the wood
  // inside the bark rather than to the whole log.
  const sawdust_of_log_pct = sawdust_share_pct * (100 - bark_fraction_pct) / 100;
  const chips_of_log_pct = residue_pct - bark_fraction_pct - sawdust_of_log_pct;
  if (!(chips_of_log_pct >= 0)) return { error: "The entered bark and kerf shares already exceed the residue fraction -- check the recovery figure." };
  const annual_gain_bf = annual_lumber_mbf * 1000 * gain_pts / 100;
  return {
    sawdust_share_pct, target_sawdust_share_pct, gain_pts,
    alt_share_pct, alt_target_share_pct, alt_gain_pts, gain_ratio,
    residue_pct, sawdust_of_log_pct, chips_of_log_pct,
    bark_fraction_pct, annual_gain_bf,
    note: "The kerf share is directly computable and it is the one a mill can change. Every cut turns a kerf-width slice of log into sawdust, so the sawdust fraction of any cut is kerf over kerf-plus-board-thickness -- which means thin stock makes proportionally far more sawdust than thick, and a wide kerf on thin stock is where wood disappears. THE THIN-KERF CASE IS WORTH LESS ON THICK STOCK, and that is the part that gets missed before a capital request: the same kerf change on 2 in stock is worth roughly half what it is worth on 1 in boards, because the denominator is twice as large. A mill cutting mostly timbers has much less to gain from a thin-kerf conversion than a mill cutting boards, and both are reported here for that reason. CHIPS ARE THE LARGER STREAM and the more valuable one where a pulp or panel market exists. That market's requirements -- size distribution, bark content, and moisture -- determine whether slabs are worth chipping or whether they are fuel, and the difference in revenue per ton is large. Bark is nearly always a cost or a low-value product, and it is the reason debarking exists, because bark in the chip stream downgrades the whole load. A mill with no chip market treats all of it as hog fuel, which has value only if there is a boiler or a buyer within a short haul. A volume split from recovery and kerf figures the user supplies. Residue proportions vary widely with log size and quality, product mix, and equipment, and the bark fraction is species dependent. Bulk densities for sawdust, chips, and bark differ substantially and change with moisture content, so any volume-to-tonnage conversion must use the mill's own measured figures rather than table values if the result is going to a scale ticket. It does not evaluate chip quality against a mill specification -- size distribution, fines, overs, and bark content determine whether chips are saleable at all -- or address the moisture content that pulp and fuel buyers pay on. It does not address dust collection or combustible dust hazards, or the fire and housekeeping requirements that residue handling carries. The residue buyers' specifications, the mill's own scale records, and NFPA 664 for wood processing dust hazards govern.",
  };
}
const sawmillResidueYieldExample = { inputs: { lumber_recovery_pct: 55, kerf_in: 0.180, target_kerf_in: 0.125, board_thickness_in: 1, alt_board_thickness_in: 2, bark_fraction_pct: 12, annual_lumber_mbf: 10000 } };
SAWMILL_RENDERERS["sawmill-residue-yield"] = _simpleRenderer({
  citation: "Citation: the kerf sawdust relation by name -- the sawdust share of the wood cut = kerf / (kerf + board thickness) -- with the residue fraction taken as one less the entered lumber recovery and the bark fraction entered by species. NFPA 664 for wood processing dust hazards, the residue buyers' specifications, and the mill's own scale records govern.",
  example: sawmillResidueYieldExample.inputs,
  fields: [
    { key: "lumber_recovery_pct", label: "Lumber recovered (% of log volume)", kind: "number", default: 55 },
    { key: "kerf_in", label: "Kerf now (in)", kind: "number", default: 0.180 },
    { key: "target_kerf_in", label: "Kerf after a change (in)", kind: "number", default: 0.125 },
    { key: "board_thickness_in", label: "Board thickness (in)", kind: "number", default: 1 },
    { key: "alt_board_thickness_in", label: "Thicker stock to compare (in)", kind: "number", default: 2 },
    { key: "bark_fraction_pct", label: "Bark (% of log volume)", kind: "number", default: 12 },
    { key: "annual_lumber_mbf", label: "Annual lumber production (MBF)", kind: "number", default: 10000 },
  ],
  outputs: [
    { key: "s", id: "sry-out-s", label: "Sawdust share of the wood cut", value: (r) => fmt(r.sawdust_share_pct, 1) + "% now, " + fmt(r.target_sawdust_share_pct, 1) + "% at the changed kerf -- " + fmt(r.gain_pts, 1) + " points move from sawdust to lumber" },
    { key: "t", id: "sry-out-t", label: "The same kerf change on the thicker stock", value: (r) => fmt(r.alt_gain_pts, 1) + " points, " + fmt(r.gain_ratio, 2) + " times the gain on the thinner boards" },
    { key: "a", id: "sry-out-a", label: "Worth of the kerf change over a year", value: (r) => fmt(r.annual_gain_bf, 0) + " board feet of additional lumber from the same logs" },
    { key: "r", id: "sry-out-r", label: "Residue split of the log", value: (r) => fmt(r.residue_pct, 0) + "% residue: " + fmt(r.bark_fraction_pct, 0) + " points bark, " + fmt(r.sawdust_of_log_pct, 1) + " points sawdust, " + fmt(r.chips_of_log_pct, 1) + " points chips" },
    { key: "c", id: "sry-out-c", label: "The stream with a market", value: (r) => "chips, at " + fmt(r.chips_of_log_pct, 1) + "% of the log -- " + fmt(r.chips_of_log_pct / r.residue_pct * 100, 0) + "% of everything that is not lumber" },
    { key: "n", id: "sry-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSawmillResidueYield,
});

// ============ spec-v1587: log truck payload and scaled weight ============

// dims: in { legal_gross_lb: M, tare_lb: M, weight_per_mbf_lb: M, alt_weight_per_mbf_lb: M, seasoned_weight_per_mbf_lb: M, load_volume_mbf: dimensionless } out: { payload_lb: M, legal_load_mbf: dimensionless, alt_legal_load_mbf: dimensionless, entered_load_lb: M, margin_lb: M }
export function computeLogTruckPayload({ legal_gross_lb = 0, tare_lb = 0, weight_per_mbf_lb = 0, alt_weight_per_mbf_lb = 0, seasoned_weight_per_mbf_lb = 0, load_volume_mbf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(legal_gross_lb > 0)) return { error: "Legal gross weight must be positive." };
  if (!(tare_lb > 0)) return { error: "Truck and trailer tare must be positive." };
  if (!(tare_lb < legal_gross_lb)) return { error: "Tare weight must be below the legal gross." };
  if (!(weight_per_mbf_lb > 0)) return { error: "Green weight per thousand board feet must be positive." };
  if (!(alt_weight_per_mbf_lb > 0)) return { error: "The compared species weight per thousand board feet must be positive." };
  if (!(seasoned_weight_per_mbf_lb > 0)) return { error: "The seasoned weight per thousand board feet must be positive." };
  if (!(load_volume_mbf > 0)) return { error: "The load volume to check must be positive." };
  const payload_lb = legal_gross_lb - tare_lb;
  const legal_load_mbf = payload_lb / weight_per_mbf_lb;
  const alt_legal_load_mbf = payload_lb / alt_weight_per_mbf_lb;
  const seasoned_legal_load_mbf = payload_lb / seasoned_weight_per_mbf_lb;
  const mbf_difference = legal_load_mbf - alt_legal_load_mbf;
  // The habit error: loading the compared species to the stake height that
  // was legal for the first one.
  const overload_if_habit_lb = legal_load_mbf * alt_weight_per_mbf_lb - payload_lb;
  const entered_load_lb = load_volume_mbf * weight_per_mbf_lb;
  const margin_lb = payload_lb - entered_load_lb;
  const gross_with_load_lb = tare_lb + entered_load_lb;
  return {
    payload_lb, legal_load_mbf, alt_legal_load_mbf, seasoned_legal_load_mbf,
    mbf_difference, overload_if_habit_lb, entered_load_lb, margin_lb,
    gross_with_load_lb,
    margin_pct: margin_lb / payload_lb * 100,
    load_verdict: margin_lb >= 0
      ? "under the gross limit with " + fmt(margin_lb, 0) + " lb of payload left"
      : "OVER the gross limit by " + fmt(-margin_lb, 0) + " lb -- that is a citation and an off-load at the roadside",
    note: "The gross weight limit is the one everyone quotes and the AXLE limits are the ones that actually catch trucks. A load within the legal gross can still be over on a tandem or a bridge-formula group if it is placed wrong, and weight distribution on a log load is set by where the butt ends sit, which is a loader decision made in seconds. THE VARIABLE THAT MAKES THIS A CALCULATION rather than a lookup is green weight per thousand board feet. It moves with species, with the season, and with how long the logs have been decked: freshly felled winter hardwood can be half again the weight of the same volume of summer-decked softwood. A trucker loading by habit on a mixed-species job is guessing, and the penalty for guessing high is a citation and an off-load at the roadside -- so the overload that a habitual stake height produces on the heavier wood is reported directly rather than left to be discovered on the scale. SEASONING CUTS THE OTHER WAY, and a mill scaling loads that vary this much without tracking species and deck time is not going to reconcile its wood against its tally. The useful field form is the inversion: given the tare and the legal gross, how much of THIS wood is a legal load, which is a number the loader operator can work to directly. A payload subtraction. It does not address axle group limits or the federal bridge formula, which frequently govern below the gross limit and which depend on axle spacing and load placement rather than total weight; a load legal on gross can be illegal on a group. It does not address state and local variations in legal gross, permit loads, seasonal frost-law reductions, or the reduced limits that apply on many forest and county roads. Green weight per thousand board feet is highly variable and published figures are broad ranges -- a mill's or a region's own measured conversion is far better. It does not address load securement, which is a separate regulated matter with its own requirements for logs specifically. The applicable state and federal weight limits, the bridge formula, FMCSA securement requirements for logs, and the scaling rule in use govern.",
  };
}
const logTruckPayloadExample = { inputs: { legal_gross_lb: 80000, tare_lb: 32000, weight_per_mbf_lb: 10500, alt_weight_per_mbf_lb: 13000, seasoned_weight_per_mbf_lb: 11000, load_volume_mbf: 5 } };
SAWMILL_RENDERERS["log-truck-payload"] = _simpleRenderer({
  citation: "Citation: the payload relation by name -- available payload = legal gross weight less tare, and the legal load in thousand board feet = payload / the green weight per thousand board feet for the species and condition. Axle group limits and the federal bridge formula frequently govern below the gross and are not evaluated here. The applicable state and federal weight limits, the bridge formula, FMCSA securement requirements for logs, and the scaling rule in use govern.",
  example: logTruckPayloadExample.inputs,
  fields: [
    { key: "legal_gross_lb", label: "Legal gross weight (lb)", kind: "number", default: 80000 },
    { key: "tare_lb", label: "Truck and trailer tare (lb)", kind: "number", default: 32000 },
    { key: "weight_per_mbf_lb", label: "Green weight of this wood (lb per MBF)", kind: "number", default: 10500 },
    { key: "alt_weight_per_mbf_lb", label: "Heavier species to compare (lb per MBF)", kind: "number", default: 13000 },
    { key: "seasoned_weight_per_mbf_lb", label: "Same wood after decking (lb per MBF)", kind: "number", default: 11000 },
    { key: "load_volume_mbf", label: "Volume being loaded (MBF)", kind: "number", default: 5 },
  ],
  outputs: [
    { key: "p", id: "ltp-out-p", label: "Available payload", value: (r) => fmt(r.payload_lb, 0) + " lb" },
    { key: "l", id: "ltp-out-l", label: "Legal load of this wood", value: (r) => fmt(r.legal_load_mbf, 2) + " MBF" },
    { key: "a", id: "ltp-out-a", label: "Legal load of the heavier species", value: (r) => fmt(r.alt_legal_load_mbf, 2) + " MBF -- " + fmt(r.mbf_difference, 2) + " MBF less on the same truck and the same road" },
    { key: "h", id: "ltp-out-h", label: "Loading it to the same stake height", value: (r) => fmt(r.overload_if_habit_lb, 0) + " lb over the payload" },
    { key: "s", id: "ltp-out-s", label: "After decking through a dry season", value: (r) => fmt(r.seasoned_legal_load_mbf, 2) + " MBF of the same wood becomes legal" },
    { key: "m", id: "ltp-out-m", label: "The load entered", value: (r) => fmt(r.entered_load_lb, 0) + " lb of wood, " + fmt(r.gross_with_load_lb, 0) + " lb gross -- " + r.load_verdict },
    { key: "n", id: "ltp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLogTruckPayload,
});
