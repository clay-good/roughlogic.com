// calc-diving.js -- Group G (cont.): the commercial and scientific diving bench.
//
// specs/scope-trade-expansion-2.md found diving unserved entirely. The catalog
// had one breathing-gas calculator -- `scba-cylinder-time` -- and it is a
// firefighting tool with no notion of ambient pressure at all, which is the
// one thing every diving gas calculation turns on. Nothing computed a
// no-decompression bookkeeping, a surface air consumption, a nitrox maximum
// operating depth or equivalent air depth, a surface-supplied air rate, or a
// chamber's gas requirement.
//
// Tiles (all group "G", the existing Safety and Compliance category):
//   v1557 no-decompression-limit   v1560 nitrox-ead
//   v1558 surface-air-consumption  v1561 umbilical-air-supply
//   v1559 nitrox-mod               v1562 chamber-gas-volume
//
// THREE OF THE SIX SPECS WERE INTERNALLY WRONG and two of those were wrong
// about OXYGEN LIMITS, which is a life-safety matter rather than a rounding
// one. See spec-v1557.md through spec-v1562.md and the band's commit message.
//
// NOTHING HERE PLANS A DIVE. No formula produces a no-decompression limit;
// tables and algorithms are validated as complete systems and this arithmetic
// sits around whichever one an operation uses.

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
// calc-wind.js / calc-sawmill.js / calc-trenchless.js _simpleRenderer).
function _simpleRenderer(spec) {
  const _dvRender = function (inputRegion, outputRegion, citationEl) {
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

  _dvRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _dvRender;
}

export const DIVING_RENDERERS = {};

// 33 ft of seawater per atmosphere (34 ft fresh), the 0.79 nitrogen fraction
// of air, 14.7 psi at sea level, and 60 minutes per hour.
const _FSW_PER_ATM = 33;
const _N2_IN_AIR = 0.79;
const _PSI_ATM = 14.7;

// ============ spec-v1557: no-decompression bookkeeping ============

// dims: in { planned_depth_ft: L, table_ndl_min: T, residual_nitrogen_time_min: T, planned_bottom_time_min: T, alt_residual_time_min: T, oxygen_fraction: dimensionless, feet_per_atm: L } out: { adjusted_ndl_min: T, credited_bottom_time_min: T, remaining_min: T, equivalent_air_depth_ft: L, alt_adjusted_ndl_min: T }
export function computeNoDecompressionLimit({ planned_depth_ft = 0, table_ndl_min = 0, residual_nitrogen_time_min = 0, planned_bottom_time_min = 0, alt_residual_time_min = 0, oxygen_fraction = 0.21, feet_per_atm = _FSW_PER_ATM } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(planned_depth_ft > 0)) return { error: "Planned depth must be positive." };
  if (!(table_ndl_min > 0)) return { error: "Enter the no-decompression limit your table gives for this depth. No formula produces one." };
  if (!(residual_nitrogen_time_min >= 0)) return { error: "Residual nitrogen time cannot be negative." };
  if (!(residual_nitrogen_time_min < table_ndl_min)) return { error: "Residual nitrogen time is at or beyond the table's limit for this depth: this profile has no no-decompression time at all." };
  if (!(planned_bottom_time_min > 0)) return { error: "Planned bottom time must be positive." };
  if (!(alt_residual_time_min >= 0)) return { error: "The compared residual nitrogen time cannot be negative." };
  if (!(oxygen_fraction > 0 && oxygen_fraction < 1)) return { error: "Oxygen fraction must be between 0 and 1." };
  if (!(feet_per_atm > 0)) return { error: "Feet per atmosphere must be positive (33 seawater, 34 fresh)." };
  // The table's limit is not the diver's limit on a repetitive dive: residual
  // nitrogen counts against it as minutes already spent at that depth.
  const adjusted_ndl_min = table_ndl_min - residual_nitrogen_time_min;
  const credited_bottom_time_min = residual_nitrogen_time_min + planned_bottom_time_min;
  const remaining_min = adjusted_ndl_min - planned_bottom_time_min;
  const exceeds = credited_bottom_time_min > table_ndl_min;
  const residual_share_pct = residual_nitrogen_time_min / table_ndl_min * 100;
  const alt_adjusted_ndl_min = table_ndl_min - alt_residual_time_min;
  const surface_interval_gain_min = alt_adjusted_ndl_min - adjusted_ndl_min;
  // A nitrox mix is planned by entering the AIR table at the equivalent air
  // depth, which is where the extra bottom time comes from.
  const nitrogen_fraction = 1 - oxygen_fraction;
  const equivalent_air_depth_ft = (nitrogen_fraction / _N2_IN_AIR) * (planned_depth_ft + feet_per_atm) - feet_per_atm;
  return {
    adjusted_ndl_min, credited_bottom_time_min, remaining_min, exceeds,
    residual_share_pct, alt_adjusted_ndl_min, surface_interval_gain_min,
    nitrogen_fraction, equivalent_air_depth_ft,
    table_ndl_min, planned_depth_ft,
    verdict: exceeds
      ? "OVER the table's limit once residual nitrogen is credited -- this is a decompression dive, not a no-decompression one"
      : "inside the table's limit with " + fmt(remaining_min, 0) + " min of the adjusted limit unused",
    note: "The limit falls very steeply with depth, so the difference between a moderate depth and a deeper one is not a proportional loss of bottom time but a large one. That shape is why depth discipline matters more than time discipline on a working dive, and why a few feet deeper than planned can consume the whole margin. REPETITIVE DIVING IS WHERE THE ARITHMETIC LIVES. A diver surfacing carries residual nitrogen that off-gasses over the surface interval, and the table converts what is left into minutes that count against the next dive as though they had already been spent at that depth. The adjusted limit is the table's figure minus that residual, and on a short surface interval it can be a small fraction of the headline number -- which is the number a diver planning without the residual would be working to. The trade of surface interval against bottom time is the whole structure of a repetitive dive plan, and it is reported here so both halves are visible at once. NO FORMULA PRODUCES A NO-DECOMPRESSION LIMIT, and this does not attempt one. Different tables and algorithms give materially different answers for the same profile, they are validated as complete systems, and mixing a limit from one with a residual nitrogen figure from another is not valid. This performs the bookkeeping around whichever table the operation uses; the table supplies the limit and the residual, and the entered figures must come from the same one. It does not model tissue compartments, decompression obligation, omitted decompression, or repetitive group letters, and it does not correct for altitude -- sea-level tables do not apply at altitude and a separate procedure governs. The applicable dive tables or computer algorithm, the diving supervisor, and the operation's diving safety manual govern.",
  };
}
const noDecompressionLimitExample = { inputs: { planned_depth_ft: 60, table_ndl_min: 55, residual_nitrogen_time_min: 21, planned_bottom_time_min: 30, alt_residual_time_min: 9, oxygen_fraction: 0.32, feet_per_atm: 33 } };
DIVING_RENDERERS["no-decompression-limit"] = _simpleRenderer({
  citation: "Citation: the repetitive-dive bookkeeping by name -- the adjusted no-decompression limit is the table's limit for the depth less the residual nitrogen time the table gives for the repetitive group and surface interval, and a nitrox mix is planned by entering the air table at the equivalent air depth ((1 - FO2) / 0.79) x (depth + 33) - 33. No formula produces a no-decompression limit. The applicable dive tables or computer algorithm, the diving supervisor, and the operation's diving safety manual govern.",
  example: noDecompressionLimitExample.inputs,
  fields: [
    { key: "planned_depth_ft", label: "Planned depth (ft)", kind: "number", default: 60 },
    { key: "table_ndl_min", label: "No-decompression limit from YOUR table (min)", kind: "number", default: 55 },
    { key: "residual_nitrogen_time_min", label: "Residual nitrogen time from your table (min)", kind: "number", default: 21 },
    { key: "planned_bottom_time_min", label: "Planned bottom time (min)", kind: "number", default: 30 },
    { key: "alt_residual_time_min", label: "Residual after a longer surface interval (min)", kind: "number", default: 9 },
    { key: "oxygen_fraction", label: "Oxygen fraction of the mix (0.21 air)", kind: "number", default: 0.32 },
    { key: "feet_per_atm", label: "Feet per atmosphere (33 seawater, 34 fresh)", kind: "number", default: 33 },
  ],
  outputs: [
    { key: "a", id: "ndl-out-a", label: "Adjusted no-decompression limit", value: (r) => fmt(r.adjusted_ndl_min, 0) + " min, not the table's " + fmt(r.table_ndl_min, 0) + " -- residual nitrogen has taken " + fmt(r.residual_share_pct, 0) + "% of it" },
    { key: "c", id: "ndl-out-c", label: "Bottom time credited against the table", value: (r) => fmt(r.credited_bottom_time_min, 0) + " min -- " + r.verdict },
    { key: "s", id: "ndl-out-s", label: "After the longer surface interval", value: (r) => fmt(r.alt_adjusted_ndl_min, 0) + " min, " + fmt(r.surface_interval_gain_min, 0) + " min more bottom time bought on the surface" },
    { key: "e", id: "ndl-out-e", label: "Equivalent air depth for this mix", value: (r) => fmt(r.equivalent_air_depth_ft, 0) + " ft -- enter the air table THERE, which is where the extra time comes from" },
    { key: "n", id: "ndl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeNoDecompressionLimit,
});

// ============ spec-v1558: surface air consumption and rock bottom ============

// dims: in { sac_cuft_per_min: L^3 T^-1, planned_depth_ft: L, planned_bottom_time_min: T, cylinder_volume_cuft: L^3, team_size: dimensionless, ascent_rate_fpm: L T^-1, stop_depth_ft: L, stop_time_min: T, stress_sac_cuft_per_min: L^3 T^-1, feet_per_atm: L } out: { depth_ata: dimensionless, rate_at_depth_cuft_min: L^3 T^-1, bottom_gas_cuft: L^3, rock_bottom_cuft: L^3, usable_gas_cuft: L^3, max_bottom_time_min: T }
export function computeSurfaceAirConsumption({ sac_cuft_per_min = 0, planned_depth_ft = 0, planned_bottom_time_min = 0, cylinder_volume_cuft = 0, team_size = 2, ascent_rate_fpm = 30, stop_depth_ft = 15, stop_time_min = 3, stress_sac_cuft_per_min = 1.0, feet_per_atm = _FSW_PER_ATM } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(sac_cuft_per_min > 0)) return { error: "Surface air consumption must be positive (cu ft/min)." };
  if (!(planned_depth_ft > 0)) return { error: "Planned depth must be positive." };
  if (!(planned_bottom_time_min > 0)) return { error: "Planned bottom time must be positive." };
  if (!(cylinder_volume_cuft > 0)) return { error: "Cylinder volume must be positive (cu ft)." };
  if (!(team_size >= 1)) return { error: "Team size must be at least 1." };
  if (!(ascent_rate_fpm > 0)) return { error: "Ascent rate must be positive (ft/min)." };
  if (!(stop_depth_ft > 0 && stop_depth_ft < planned_depth_ft)) return { error: "The stop depth must be above the bottom and below the surface." };
  if (!(stop_time_min > 0)) return { error: "Stop time must be positive." };
  if (!(stress_sac_cuft_per_min > 0)) return { error: "The elevated (stress) consumption rate must be positive." };
  if (!(feet_per_atm > 0)) return { error: "Feet per atmosphere must be positive (33 seawater, 34 fresh)." };
  // Consumption at depth is the surface rate times the ABSOLUTE pressure,
  // because each breath contains proportionally more gas.
  const depth_ata = 1 + planned_depth_ft / feet_per_atm;
  const rate_at_depth_cuft_min = sac_cuft_per_min * depth_ata;
  const bottom_gas_cuft = rate_at_depth_cuft_min * planned_bottom_time_min;
  // Rock bottom: the whole team from the deepest point, at the ascent rate,
  // through the stop, sharing gas, at an elevated rate. Computed FIRST.
  const ascent_time_min = (planned_depth_ft - stop_depth_ft) / ascent_rate_fpm;
  const ascent_avg_ata = 1 + ((planned_depth_ft + stop_depth_ft) / 2) / feet_per_atm;
  const ascent_gas_cuft = team_size * stress_sac_cuft_per_min * ascent_time_min * ascent_avg_ata;
  const stop_ata = 1 + stop_depth_ft / feet_per_atm;
  const stop_gas_cuft = team_size * stress_sac_cuft_per_min * stop_time_min * stop_ata;
  const rock_bottom_cuft = ascent_gas_cuft + stop_gas_cuft;
  const usable_gas_cuft = cylinder_volume_cuft - rock_bottom_cuft;
  if (!(usable_gas_cuft > 0)) return { error: "The reserve this team needs to reach the surface from this depth is the whole cylinder: there is no usable gas for a dive at all." };
  const max_bottom_time_min = usable_gas_cuft / rate_at_depth_cuft_min;
  const naive_bottom_time_min = cylinder_volume_cuft / rate_at_depth_cuft_min;
  const reserve_share_pct = rock_bottom_cuft / cylinder_volume_cuft * 100;
  return {
    depth_ata, rate_at_depth_cuft_min, bottom_gas_cuft,
    ascent_time_min, ascent_avg_ata, ascent_gas_cuft, stop_ata, stop_gas_cuft,
    rock_bottom_cuft, usable_gas_cuft, max_bottom_time_min, naive_bottom_time_min,
    reserve_share_pct, planned_bottom_time_min,
    plan_verdict: bottom_gas_cuft <= usable_gas_cuft
      ? "the planned bottom time fits inside the usable gas"
      : "the planned bottom time does NOT fit: it needs " + fmt(bottom_gas_cuft - usable_gas_cuft, 1) + " cu ft more than the reserve leaves",
    note: "A diver's consumption at depth is their surface rate times the absolute pressure, because each breath contains proportionally more gas. That multiplier is why bottom time falls so much faster with depth than people expect: the same diver on the same cylinder gets a fraction of the time at depth that they would get shallow. THE NUMBER WORTH BUILDING A PLAN AROUND IS NOT GAS NEEDED BUT GAS RESERVED. Rock bottom is the volume required for the whole team to reach the surface from the deepest point, at a controlled ascent rate, with a stop, sharing gas -- and it is computed FIRST and subtracted, so the usable gas is what remains. Planning to a fraction like turn-at-a-third is a shortcut that happens to approximate this on some dives and badly underestimates it on others, particularly deep ones where the ascent itself consumes a great deal, and the difference between the usable bottom time and what the cylinder's raw capacity suggests is reported here for exactly that reason. SAC IS PERSONAL AND IT IS NOT CONSTANT. It rises with work rate, cold, stress, and poor trim, and a rate measured on a calm dive underestimates what a hard working dive will use -- which is why the reserve is computed at an ELEVATED rate rather than at the measured one. Measuring it on the actual kind of work is what makes it trustworthy. A gas volume calculation on figures the user supplies. It does not plan a decompression profile, evaluate a no-decompression limit, or account for gas needed for decompression stops beyond the single stop entered. It assumes an average pressure over the ascent, which is a linear approximation to a real ascent, and it does not model cylinder pressure against temperature, gas density and work of breathing at depth, or the failure the reserve exists for. The operation's diving safety manual, the supervisor, and the applicable regulations govern.",
  };
}
const surfaceAirConsumptionExample = { inputs: { sac_cuft_per_min: 0.65, planned_depth_ft: 80, planned_bottom_time_min: 25, cylinder_volume_cuft: 80, team_size: 2, ascent_rate_fpm: 30, stop_depth_ft: 15, stop_time_min: 3, stress_sac_cuft_per_min: 1.0, feet_per_atm: 33 } };
DIVING_RENDERERS["surface-air-consumption"] = _simpleRenderer({
  citation: "Citation: the standard gas-planning relations by name -- consumption at depth = surface air consumption x the absolute pressure (1 + depth / 33 seawater), and the rock-bottom reserve = the team's elevated rate x the ascent time at the average ascent pressure, plus the stop time at the stop pressure. The operation's diving safety manual, the diving supervisor, and the applicable regulations govern.",
  example: surfaceAirConsumptionExample.inputs,
  fields: [
    { key: "sac_cuft_per_min", label: "Measured surface air consumption (cu ft/min)", kind: "number", default: 0.65 },
    { key: "planned_depth_ft", label: "Planned depth (ft)", kind: "number", default: 80 },
    { key: "planned_bottom_time_min", label: "Planned bottom time (min)", kind: "number", default: 25 },
    { key: "cylinder_volume_cuft", label: "Cylinder volume (cu ft)", kind: "number", default: 80 },
    { key: "team_size", label: "Divers sharing on the ascent", kind: "number", default: 2 },
    { key: "ascent_rate_fpm", label: "Ascent rate (ft/min)", kind: "number", default: 30 },
    { key: "stop_depth_ft", label: "Stop depth (ft)", kind: "number", default: 15 },
    { key: "stop_time_min", label: "Stop time (min)", kind: "number", default: 3 },
    { key: "stress_sac_cuft_per_min", label: "Elevated consumption for the reserve (cu ft/min)", kind: "number", default: 1.0 },
    { key: "feet_per_atm", label: "Feet per atmosphere (33 seawater, 34 fresh)", kind: "number", default: 33 },
  ],
  outputs: [
    { key: "d", id: "sac-out-d", label: "Consumption at depth", value: (r) => fmt(r.rate_at_depth_cuft_min, 2) + " cu ft/min at " + fmt(r.depth_ata, 2) + " ata" },
    { key: "b", id: "sac-out-b", label: "Gas for the planned bottom time", value: (r) => fmt(r.bottom_gas_cuft, 1) + " cu ft -- " + r.plan_verdict },
    { key: "r", id: "sac-out-r", label: "Rock bottom reserve, computed first", value: (r) => fmt(r.rock_bottom_cuft, 1) + " cu ft (" + fmt(r.ascent_gas_cuft, 1) + " ascending, " + fmt(r.stop_gas_cuft, 1) + " on the stop) -- " + fmt(r.reserve_share_pct, 0) + "% of the cylinder is not available for the dive" },
    { key: "u", id: "sac-out-u", label: "Usable gas", value: (r) => fmt(r.usable_gas_cuft, 1) + " cu ft" },
    { key: "t", id: "sac-out-t", label: "Bottom time the usable gas supports", value: (r) => fmt(r.max_bottom_time_min, 0) + " min -- not the " + fmt(r.naive_bottom_time_min, 0) + " min the cylinder's raw capacity suggests" },
    { key: "n", id: "sac-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSurfaceAirConsumption,
});

// ============ spec-v1559: nitrox maximum operating depth ============

// dims: in { oxygen_fraction: dimensionless, ppo2_limit: dimensionless, contingency_ppo2_limit: dimensionless, planned_depth_ft: L, feet_per_atm: L } out: { depth_ata: dimensionless, ppo2_at_depth: dimensionless, mod_working_ft: L, mod_contingency_ft: L, best_mix_fraction: dimensionless, air_mod_ft: L }
export function computeNitroxMod({ oxygen_fraction = 0.32, ppo2_limit = 1.4, contingency_ppo2_limit = 1.6, planned_depth_ft = 0, feet_per_atm = _FSW_PER_ATM } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(oxygen_fraction > 0 && oxygen_fraction <= 1)) return { error: "Oxygen fraction must be between 0 and 1." };
  if (!(ppo2_limit > 0)) return { error: "The oxygen partial pressure limit must be positive (ata)." };
  if (!(contingency_ppo2_limit >= ppo2_limit)) return { error: "The contingency limit must be at or above the working limit." };
  if (!(planned_depth_ft > 0)) return { error: "Planned depth must be positive." };
  if (!(feet_per_atm > 0)) return { error: "Feet per atmosphere must be positive (33 seawater, 34 fresh)." };
  const depth_ata = 1 + planned_depth_ft / feet_per_atm;
  const ppo2_at_depth = oxygen_fraction * depth_ata;
  const mod_working_ft = feet_per_atm * (ppo2_limit / oxygen_fraction - 1);
  const mod_contingency_ft = feet_per_atm * (contingency_ppo2_limit / oxygen_fraction - 1);
  // What a supervisor actually uses when blending: the richest mix the
  // planned depth allows at the working limit.
  const best_mix_fraction = ppo2_limit / depth_ata;
  // ROUNDING A BLEND FIGURE UP PUTS THE DIVER PAST THE LIMIT. The exact
  // fraction is almost never a whole percent, so the analysable blend is the
  // floor of it, and the ppO2 that blend actually produces is reported with
  // it. spec-v1559 rounded 0.4088 to "EAN41", which at this depth is 1.404
  // ata -- over the very limit it was solving for.
  const best_mix_pct_floor = Math.floor(best_mix_fraction * 100);
  const best_mix_ppo2 = best_mix_pct_floor / 100 * depth_ata;
  const air_mod_ft = feet_per_atm * (ppo2_limit / 0.21 - 1);
  const within_working = ppo2_at_depth <= ppo2_limit;
  const within_contingency = ppo2_at_depth <= contingency_ppo2_limit;
  const margin_ft = mod_working_ft - planned_depth_ft;
  return {
    depth_ata, ppo2_at_depth, mod_working_ft, mod_contingency_ft,
    best_mix_fraction, best_mix_pct_floor, best_mix_ppo2, air_mod_ft, within_working, within_contingency,
    margin_ft, ppo2_limit, contingency_ppo2_limit,
    depth_verdict: within_working
      ? "INSIDE the working limit, with " + fmt(margin_ft, 0) + " ft of depth margin before it is reached"
      : within_contingency
        ? "PAST the working limit and inside the contingency limit -- a contingency and decompression figure used at rest, not a working one"
        : "PAST the contingency limit: this mix does not belong at this depth at all",
    note: "Partial pressure is the fraction times the absolute pressure, so a richer mix hits any given oxygen limit SHALLOWER. That is the trade nitrox makes: more oxygen buys less inert gas and longer no-decompression time, and it buys a hard depth ceiling in exchange. THE TWO LIMITS ARE NOT INTERCHANGEABLE. The working limit is for the active portion of a dive and is chosen with margin because exertion, cold, and carbon dioxide retention all raise susceptibility, and because oxygen toxicity at depth presents as a seizure with no reliable prodrome. The higher figure is a contingency and decompression value used at rest, and treating it as a working limit removes the margin that exists precisely because the failure mode underwater is drowning. Both are reported, and which one applies is a decision about what the diver is doing rather than about what the arithmetic allows. THE REVERSE FORM IS WHAT A SUPERVISOR USES WHEN BLENDING: the richest mix the planned depth permits at the working limit, which is given directly. Whatever it returns, THE MIX MUST BE ANALYSED BEFORE USE -- the number written on the cylinder is a label and the analyser is the fact, and a mix used on the strength of its label is an unanalysed mix however carefully the depth was computed. A partial-pressure calculation, not an oxygen exposure plan. It does not track cumulative oxygen exposure over a dive or a series of dives, which is a separate limit with its own tables and its own units, and it does not address the pulmonary toxicity that long exposures at lower partial pressures produce. It does not evaluate a decompression obligation, gas blending procedure, or oxygen service cleanliness. The operation's diving safety manual, the applicable training agency or regulatory limits, a gas analysis before every dive, and the diving supervisor govern.",
  };
}
const nitroxModExample = { inputs: { oxygen_fraction: 0.32, ppo2_limit: 1.4, contingency_ppo2_limit: 1.6, planned_depth_ft: 80, feet_per_atm: 33 } };
DIVING_RENDERERS["nitrox-mod"] = _simpleRenderer({
  citation: "Citation: the oxygen partial-pressure relations by name -- ppO2 = the oxygen fraction x the absolute pressure (1 + depth / 33 seawater), the maximum operating depth = 33 x (the ppO2 limit / the oxygen fraction - 1), and the best mix for a depth = the ppO2 limit / the absolute pressure -- with 1.4 ata as the customary working limit and 1.6 ata as a contingency and decompression figure. The operation's diving safety manual, the applicable limits, a gas analysis before every dive, and the diving supervisor govern.",
  example: nitroxModExample.inputs,
  fields: [
    { key: "oxygen_fraction", label: "Oxygen fraction of the mix (0.32 = EAN32)", kind: "number", default: 0.32 },
    { key: "ppo2_limit", label: "Working ppO2 limit (ata)", kind: "number", default: 1.4 },
    { key: "contingency_ppo2_limit", label: "Contingency ppO2 limit (ata)", kind: "number", default: 1.6 },
    { key: "planned_depth_ft", label: "Planned depth (ft)", kind: "number", default: 80 },
    { key: "feet_per_atm", label: "Feet per atmosphere (33 seawater, 34 fresh)", kind: "number", default: 33 },
  ],
  outputs: [
    { key: "p", id: "nmo-out-p", label: "Oxygen partial pressure at this depth", value: (r) => fmt(r.ppo2_at_depth, 3) + " ata at " + fmt(r.depth_ata, 3) + " ata ambient -- " + r.depth_verdict },
    { key: "m", id: "nmo-out-m", label: "Maximum operating depth", value: (r) => fmt(r.mod_working_ft, 0) + " ft at the working limit, " + fmt(r.mod_contingency_ft, 0) + " ft at the contingency limit" },
    { key: "b", id: "nmo-out-b", label: "Best mix for the planned depth", value: (r) => "exactly " + fmt(r.best_mix_fraction * 100, 1) + "% oxygen, so blend EAN" + fmt(r.best_mix_pct_floor, 0) + " -- round a blend figure DOWN, because EAN" + fmt(r.best_mix_pct_floor + 1, 0) + " here is " + fmt((r.best_mix_pct_floor + 1) / 100 * r.depth_ata, 3) + " ata, past the limit it was solving for" },
    { key: "a", id: "nmo-out-a", label: "Where air itself reaches the limit", value: (r) => fmt(r.air_mod_ft, 0) + " ft -- past that, air diving is a decompression and oxygen-exposure problem rather than a casual one" },
    { key: "n", id: "nmo-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeNitroxMod,
});

// ============ spec-v1560: nitrox equivalent air depth ============

// dims: in { oxygen_fraction: dimensionless, depth_ft: L, target_ead_ft: L, ppo2_limit: dimensionless, feet_per_atm: L } out: { nitrogen_fraction: dimensionless, equivalent_air_depth_ft: L, depth_reduction_ft: L, pn2_at_depth: dimensionless, mix_for_target_ead: dimensionless, deepest_usable_mix: dimensionless }
export function computeNitroxEad({ oxygen_fraction = 0.36, depth_ft = 0, target_ead_ft = 0, ppo2_limit = 1.4, feet_per_atm = _FSW_PER_ATM } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(oxygen_fraction > 0 && oxygen_fraction < 1)) return { error: "Oxygen fraction must be between 0 and 1." };
  if (!(depth_ft > 0)) return { error: "Depth must be positive." };
  if (!(target_ead_ft > 0 && target_ead_ft < depth_ft)) return { error: "The target equivalent air depth must be shallower than the actual depth and greater than zero." };
  if (!(ppo2_limit > 0)) return { error: "The oxygen partial pressure limit must be positive (ata)." };
  if (!(feet_per_atm > 0)) return { error: "Feet per atmosphere must be positive (33 seawater, 34 fresh)." };
  const nitrogen_fraction = 1 - oxygen_fraction;
  const depth_ata = 1 + depth_ft / feet_per_atm;
  // Hold the nitrogen partial pressure constant: the mix loads a diver the
  // way a shallower AIR dive would, and that shallower depth is the EAD.
  const equivalent_air_depth_ft = (nitrogen_fraction / _N2_IN_AIR) * (depth_ft + feet_per_atm) - feet_per_atm;
  const depth_reduction_ft = depth_ft - equivalent_air_depth_ft;
  const pn2_at_depth = nitrogen_fraction * depth_ata;
  // The mix that produces a stated EAD at this depth.
  const mix_for_target_ead = 1 - _N2_IN_AIR * (target_ead_ft + feet_per_atm) / (depth_ft + feet_per_atm);
  // THE OXYGEN CHECK, which is the half a plan built on EAD alone is missing.
  const ppo2_at_depth = oxygen_fraction * depth_ata;
  const oxygen_ok = ppo2_at_depth <= ppo2_limit;
  const deepest_usable_mix = ppo2_limit / depth_ata;
  // Floored to a blendable whole percent for the same reason as `nitrox-mod`:
  // rounding a mix UP puts the diver past the limit. spec-v1560 called EAN35
  // "a mix that works at 100 ft"; it is 1.411 ata, over the 1.4 it cites.
  const deepest_usable_pct_floor = Math.floor(deepest_usable_mix * 100);
  const deepest_usable_ppo2 = deepest_usable_pct_floor / 100 * depth_ata;
  const deepest_usable_ead_ft = ((1 - deepest_usable_pct_floor / 100) / _N2_IN_AIR) * (depth_ft + feet_per_atm) - feet_per_atm;
  return {
    nitrogen_fraction, depth_ata, equivalent_air_depth_ft, depth_reduction_ft,
    pn2_at_depth, mix_for_target_ead, ppo2_at_depth, oxygen_ok,
    deepest_usable_mix, deepest_usable_pct_floor, deepest_usable_ppo2, deepest_usable_ead_ft, ppo2_limit, depth_ft,
    oxygen_verdict: oxygen_ok
      ? "and the oxygen check passes at this depth, so the mix is usable"
      : "BUT THE OXYGEN CHECK FAILS: " + fmt(ppo2_at_depth, 3) + " ata is past the " + fmt(ppo2_limit, 2) + " limit, so this mix is not usable here however attractive its equivalent air depth looks",
    note: "The whole idea is to hold the nitrogen partial pressure constant. A nitrox mix has less nitrogen than air, so at a given depth it loads a diver the way a shallower air dive would, and the equivalent air depth is that shallower depth -- after which an air table or an air algorithm applies without modification. That is why the equivalent air depth came first historically and why it is still the clearest way to see what nitrox actually buys. WHAT IT BUYS IS REAL AND BOUNDED. A common mix converts to an equivalent air depth twenty to thirty feet shallower at moderate depths, which is a substantial extension of no-decompression time. It buys nothing at all on the oxygen side: the same mix that extends the nitrogen clock brings the oxygen ceiling UP to meet you, and the two limits close on each other as the mix gets richer. A DIVE PLANNED ON EQUIVALENT AIR DEPTH ALONE HAS SOLVED HALF THE PROBLEM, which is why the oxygen check is run here on the same inputs and reported beside the answer rather than left to a second calculation someone may not make -- and why, when it fails, the richest mix the depth actually permits is given along with the smaller extension it buys. FOR TRIMIX THE RELATION DOES NOT APPLY as written, because helium is present and has its own kinetics; equivalent narcotic depth is a different calculation for a different purpose and is not this. A two-gas nitrox relation. It does not produce a no-decompression limit, model tissue compartments, or evaluate a decompression obligation, and it does not track cumulative oxygen exposure, which is a separate limit. It does not address gas blending, oxygen service cleanliness, or the analysis that must confirm the mix before every dive. The operation's diving safety manual, the applicable tables, a gas analysis before every dive, and the diving supervisor govern.",
  };
}
const nitroxEadExample = { inputs: { oxygen_fraction: 0.36, depth_ft: 100, target_ead_ft: 80, ppo2_limit: 1.4, feet_per_atm: 33 } };
DIVING_RENDERERS["nitrox-ead"] = _simpleRenderer({
  citation: "Citation: the equivalent air depth relation by name -- EAD = ((1 - FO2) / 0.79) x (depth + 33) - 33 in seawater feet, which holds the nitrogen partial pressure equal to that of air at the equivalent depth -- with the oxygen partial-pressure check ppO2 = FO2 x (1 + depth / 33) run on the same inputs. The relation is for two-gas nitrox; trimix needs a different treatment. The operation's diving safety manual, the applicable tables, a gas analysis before every dive, and the diving supervisor govern.",
  example: nitroxEadExample.inputs,
  fields: [
    { key: "oxygen_fraction", label: "Oxygen fraction of the mix (0.36 = EAN36)", kind: "number", default: 0.36 },
    { key: "depth_ft", label: "Actual depth (ft)", kind: "number", default: 100 },
    { key: "target_ead_ft", label: "Target equivalent air depth (ft)", kind: "number", default: 80 },
    { key: "ppo2_limit", label: "Working ppO2 limit (ata)", kind: "number", default: 1.4 },
    { key: "feet_per_atm", label: "Feet per atmosphere (33 seawater, 34 fresh)", kind: "number", default: 33 },
  ],
  outputs: [
    { key: "e", id: "ead-out-e", label: "Equivalent air depth", value: (r) => fmt(r.equivalent_air_depth_ft, 1) + " ft -- this dive loads nitrogen like an air dive " + fmt(r.depth_reduction_ft, 0) + " ft shallower" },
    { key: "o", id: "ead-out-o", label: "The oxygen check on the same mix", value: (r) => fmt(r.ppo2_at_depth, 3) + " ata " + r.oxygen_verdict },
    { key: "u", id: "ead-out-u", label: "The richest mix this depth permits", value: (r) => "EAN" + fmt(r.deepest_usable_pct_floor, 0) + " at " + fmt(r.deepest_usable_ppo2, 3) + " ata (the exact figure is " + fmt(r.deepest_usable_mix * 100, 1) + "%, and a blend rounds DOWN), whose equivalent air depth is " + fmt(r.deepest_usable_ead_ft, 1) + " ft -- less extension, but usable" },
    { key: "p", id: "ead-out-p", label: "Nitrogen partial pressure at depth", value: (r) => fmt(r.pn2_at_depth, 3) + " ata, from a nitrogen fraction of " + fmt(r.nitrogen_fraction, 3) },
    { key: "t", id: "ead-out-t", label: "Mix that would give the target equivalent air depth", value: (r) => fmt(r.mix_for_target_ead * 100, 1) + "% oxygen" },
    { key: "n", id: "ead-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeNitroxEad,
});

// ============ spec-v1561: surface-supplied air supply rate ============

// dims: in { diver_count: dimensionless, depth_ft: L, rate_per_diver_acfm: L^3 T^-1, compressor_scfm: L^3 T^-1, alt_depth_ft: L, reserve_minutes: T, volume_tank_cuft: L^3, tank_pressure_psi: M L^-1 T^-2, feet_per_atm: L } out: { depth_ata: dimensionless, required_acfm: L^3 T^-1, max_depth_ft: L, reserve_required_cuft: L^3, tank_free_gas_cuft: L^3 }
export function computeUmbilicalAirSupply({ diver_count = 3, depth_ft = 0, rate_per_diver_acfm = 1.4, compressor_scfm = 0, alt_depth_ft = 0, reserve_minutes = 10, volume_tank_cuft = 0, tank_pressure_psi = 0, feet_per_atm = _FSW_PER_ATM } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(diver_count >= 1)) return { error: "Diver count must be at least 1, and the standby diver counts." };
  if (!(depth_ft > 0)) return { error: "Working depth must be positive." };
  if (!(rate_per_diver_acfm > 0)) return { error: "The required rate per diver must be positive (acfm)." };
  if (!(compressor_scfm > 0)) return { error: "Compressor capacity must be positive (scfm)." };
  if (!(alt_depth_ft > 0)) return { error: "The compared depth must be positive." };
  if (!(reserve_minutes > 0)) return { error: "Reserve duration must be positive (min)." };
  if (!(volume_tank_cuft > 0)) return { error: "Volume tank capacity must be positive (cu ft)." };
  if (!(tank_pressure_psi > 0)) return { error: "Volume tank pressure must be positive (psi)." };
  if (!(feet_per_atm > 0)) return { error: "Feet per atmosphere must be positive (33 seawater, 34 fresh)." };
  // The requirement scales with absolute pressure exactly as a scuba diver's
  // does, and the diver count multiplies it directly.
  const depth_ata = 1 + depth_ft / feet_per_atm;
  const per_diver_acfm = rate_per_diver_acfm * depth_ata;
  const required_acfm = per_diver_acfm * diver_count;
  const compressor_margin_acfm = compressor_scfm - required_acfm;
  const alt_depth_ata = 1 + alt_depth_ft / feet_per_atm;
  const alt_required_acfm = rate_per_diver_acfm * alt_depth_ata * diver_count;
  // The number a supervisor wants: where this spread stops complying.
  const max_depth_ft = feet_per_atm * (compressor_scfm / (rate_per_diver_acfm * diver_count) - 1);
  // The reserve is a separate, regulatory calculation, not the flow one.
  const reserve_required_cuft = rate_per_diver_acfm * depth_ata * reserve_minutes;
  const tank_free_gas_cuft = volume_tank_cuft * tank_pressure_psi / _PSI_ATM;
  const reserve_margin_cuft = tank_free_gas_cuft - reserve_required_cuft;
  return {
    depth_ata, per_diver_acfm, required_acfm, compressor_margin_acfm,
    alt_depth_ata, alt_required_acfm, max_depth_ft,
    reserve_required_cuft, tank_free_gas_cuft, reserve_margin_cuft,
    compressor_scfm, alt_depth_ft, diver_count,
    flow_verdict: compressor_margin_acfm >= 0
      ? "the compressor has " + fmt(compressor_margin_acfm, 1) + " acfm of margin here"
      : "the compressor is SHORT by " + fmt(-compressor_margin_acfm, 1) + " acfm and does not meet the requirement at this depth",
    reserve_verdict: reserve_margin_cuft >= 0
      ? "the volume tank covers it with " + fmt(reserve_margin_cuft, 0) + " cu ft to spare"
      : "the volume tank is SHORT by " + fmt(-reserve_margin_cuft, 0) + " cu ft: meeting the flow requirement is not meeting the reserve requirement",
    note: "The requirement scales with absolute pressure exactly as a scuba diver's does -- gas delivered to a diver deep is several atmospheres of gas -- so a compressor sized for shallow work falls short in deeper water with no change in the number of divers and no warning that anything has changed. The diver count multiplies it directly, AND THE STANDBY DIVER COUNTS: a spread sized for the divers in the water is undersized. THE RESERVE IS REGULATORY RATHER THAN ENGINEERING, and it is a separate calculation from the flow. Surface-supplied diving requires an independent reserve breathing supply, sized to bring the diver to the surface from the maximum depth including any required decompression, and available without the diver having to do anything to switch to it. A volume tank that meets the flow requirement but not the reserve requirement does not comply, which is why both margins are reported here and why passing one of them is not passing. THE USEFUL OUTPUT FOR A SUPERVISOR is the depth at which a given compressor stops meeting the requirement, because that is the operational limit that otherwise gets discovered at the dive station with divers dressed in. A flow and volume calculation on figures the user supplies. The rate per diver is entered because it is set by the applicable regulation and the operation's procedures rather than by arithmetic, and the figure that applies depends on the jurisdiction, the mode of diving, and the depth. It does not size an umbilical, evaluate pressure drop along its length, or address the supply pressure the helmet or mask requires at depth, which is a separate and governing check. It does not evaluate air purity, which is its own testing regime, or compressor intake placement, filtration, and carbon monoxide risk. The applicable commercial diving regulations, the operation's diving safety manual, and the diving supervisor govern.",
  };
}
const umbilicalAirSupplyExample = { inputs: { diver_count: 3, depth_ft: 100, rate_per_diver_acfm: 1.4, compressor_scfm: 20, alt_depth_ft: 190, reserve_minutes: 10, volume_tank_cuft: 8, tank_pressure_psi: 200, feet_per_atm: 33 } };
DIVING_RENDERERS["umbilical-air-supply"] = _simpleRenderer({
  citation: "Citation: the surface-supplied flow relation by name -- required flow = the rate per diver x the absolute pressure (1 + depth / 33 seawater) x the number of divers including the standby -- with the reserve breathing supply as a separate requirement, and the volume tank's free gas taken as its capacity x its pressure / 14.7 psi. The rate per diver is set by the applicable regulation, not by arithmetic. The applicable commercial diving regulations, the operation's diving safety manual, and the diving supervisor govern.",
  example: umbilicalAirSupplyExample.inputs,
  fields: [
    { key: "diver_count", label: "Divers supplied, standby included", kind: "number", default: 3 },
    { key: "depth_ft", label: "Working depth (ft)", kind: "number", default: 100 },
    { key: "rate_per_diver_acfm", label: "Required rate per diver (acfm)", kind: "number", default: 1.4 },
    { key: "compressor_scfm", label: "Compressor capacity (scfm)", kind: "number", default: 20 },
    { key: "alt_depth_ft", label: "Deeper job to check (ft)", kind: "number", default: 190 },
    { key: "reserve_minutes", label: "Reserve duration required (min)", kind: "number", default: 10 },
    { key: "volume_tank_cuft", label: "Volume tank capacity (cu ft)", kind: "number", default: 8 },
    { key: "tank_pressure_psi", label: "Volume tank pressure (psi)", kind: "number", default: 200 },
    { key: "feet_per_atm", label: "Feet per atmosphere (33 seawater, 34 fresh)", kind: "number", default: 33 },
  ],
  outputs: [
    { key: "r", id: "uas-out-r", label: "Flow required at depth", value: (r) => fmt(r.required_acfm, 1) + " acfm for " + fmt(r.diver_count, 0) + " divers (" + fmt(r.per_diver_acfm, 2) + " each at " + fmt(r.depth_ata, 2) + " ata) -- " + r.flow_verdict },
    { key: "a", id: "uas-out-a", label: "The same spread on the deeper job", value: (r) => fmt(r.alt_required_acfm, 1) + " acfm at " + fmt(r.alt_depth_ft, 0) + " ft, with nothing changed but depth" },
    { key: "d", id: "uas-out-d", label: "Deepest this compressor meets the requirement", value: (r) => fmt(r.max_depth_ft, 0) + " ft -- the operational limit of the spread, worth knowing before the job" },
    { key: "v", id: "uas-out-v", label: "Reserve supply, a separate requirement", value: (r) => fmt(r.reserve_required_cuft, 0) + " cu ft needed against " + fmt(r.tank_free_gas_cuft, 0) + " cu ft of free gas in the tank -- " + r.reserve_verdict },
    { key: "n", id: "uas-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeUmbilicalAirSupply,
});

// ============ spec-v1562: recompression chamber gas volume ============

// dims: in { chamber_volume_cuft: L^3, treatment_pressure_psig: M L^-1 T^-2, ventilation_acfm_per_occupant: L^3 T^-1, occupant_count: dimensionless, treatment_minutes: T, air_inventory_cuft: L^3, oxygen_acfm_per_occupant: L^3 T^-1, oxygen_minutes: T } out: { treatment_ata: dimensionless, pressurize_cuft: L^3, ventilation_cuft: L^3, total_air_cuft: L^3, oxygen_required_cuft: L^3, longest_treatment_min: T }
export function computeChamberGasVolume({ chamber_volume_cuft = 0, treatment_pressure_psig = 0, ventilation_acfm_per_occupant = 2, occupant_count = 2, treatment_minutes = 0, air_inventory_cuft = 0, oxygen_acfm_per_occupant = 1.0, oxygen_minutes = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(chamber_volume_cuft > 0)) return { error: "Chamber internal volume must be positive (cu ft)." };
  if (!(treatment_pressure_psig > 0)) return { error: "Treatment pressure must be positive (psig)." };
  if (!(ventilation_acfm_per_occupant > 0)) return { error: "Ventilation rate per occupant must be positive (acfm)." };
  if (!(occupant_count >= 1)) return { error: "Occupant count must be at least 1; an inside attendant counts." };
  if (!(treatment_minutes > 0)) return { error: "Treatment duration must be positive (min)." };
  if (!(air_inventory_cuft > 0)) return { error: "Available air inventory must be positive (cu ft)." };
  if (!(oxygen_acfm_per_occupant > 0)) return { error: "Oxygen delivery rate must be positive (acfm)." };
  if (!(oxygen_minutes > 0)) return { error: "Oxygen duration must be positive (min)." };
  const treatment_ata = (treatment_pressure_psig + _PSI_ATM) / _PSI_ATM;
  // One chamber volume of free gas per atmosphere absolute.
  const pressurize_cuft = chamber_volume_cuft * treatment_ata;
  // Ventilation is the term that dominates, and it is itself multiplied by
  // the absolute pressure.
  const ventilation_cfm_free = ventilation_acfm_per_occupant * occupant_count * treatment_ata;
  const ventilation_cuft = ventilation_cfm_free * treatment_minutes;
  const total_air_cuft = pressurize_cuft + ventilation_cuft;
  const ventilation_share_pct = ventilation_cuft / total_air_cuft * 100;
  const pressurize_share_pct = pressurize_cuft / total_air_cuft * 100;
  const oxygen_required_cuft = oxygen_acfm_per_occupant * treatment_ata * oxygen_minutes;
  const air_margin_cuft = air_inventory_cuft - total_air_cuft;
  // The longest table this inventory supports, which is the question the
  // installation calculation is actually asking.
  const longest_treatment_min = (air_inventory_cuft - pressurize_cuft) / ventilation_cfm_free;
  return {
    treatment_ata, pressurize_cuft, ventilation_cfm_free, ventilation_cuft,
    total_air_cuft, ventilation_share_pct, pressurize_share_pct,
    oxygen_required_cuft, air_margin_cuft, longest_treatment_min,
    treatment_minutes, air_inventory_cuft,
    inventory_verdict: air_margin_cuft >= 0
      ? "the entered inventory covers this treatment with " + fmt(air_margin_cuft, 0) + " cu ft to spare"
      : "the entered inventory is SHORT by " + fmt(-air_margin_cuft, 0) + " cu ft for this treatment",
    note: "The pressurization term is straightforward and larger than people expect -- one chamber volume of free gas per atmosphere absolute -- but IT IS USUALLY THE SMALLER HALF. Ventilation is what dominates, because carbon dioxide from the occupants has to be flushed continuously and the required ventilation rate is itself multiplied by the absolute pressure, so the two effects compound over a long treatment. The split between the two is reported here because a supply sized on pressurization alone covers only a fraction of the requirement, and the fraction is not intuitive. THAT IS WHY A TREATMENT TABLE CONSUMES GAS OUT OF ALL PROPORTION TO THE CHAMBER'S SIZE, and why the supply calculation has to cover the LONGEST table the operation might run plus its extensions rather than the shortest. A chamber with gas for a short table and a patient who needs a long one with extensions is a serious problem, and it is discovered under the worst possible circumstances -- which is why the longest treatment the entered inventory actually supports is computed directly. OXYGEN IS A SEPARATE INVENTORY. Treatment runs the occupant on oxygen by mask with overboard dump, so oxygen consumption is its own number and its own cylinder bank, and running out of it ends the treatment as surely as running out of air. A volume calculation on figures the user supplies. It does not select or validate a treatment table, which is a medical decision made by a diving medical officer, and it does not model carbon dioxide scrubbing, chamber temperature and humidity control, or the oxygen fire risk that makes chamber oxygen handling its own discipline. The ventilation rate entered is set by the applicable standard and the occupant load rather than by this arithmetic. It does not address chamber certification, pressure testing, or the operator qualifications required to run one. The applicable treatment tables, a diving medical officer, the chamber manufacturer, the operation's diving safety manual, and the applicable regulations govern.",
  };
}
const chamberGasVolumeExample = { inputs: { chamber_volume_cuft: 250, treatment_pressure_psig: 60, ventilation_acfm_per_occupant: 2, occupant_count: 2, treatment_minutes: 240, air_inventory_cuft: 8000, oxygen_acfm_per_occupant: 1.0, oxygen_minutes: 120 } };
DIVING_RENDERERS["chamber-gas-volume"] = _simpleRenderer({
  citation: "Citation: the chamber gas relations by name -- the free air to pressurize = the chamber's internal volume x the absolute pressure (gauge psi + 14.7) / 14.7, and the ventilation air = the rate per occupant x the occupants x that same absolute pressure x the treatment duration. The applicable treatment tables, a diving medical officer, the chamber manufacturer, and the applicable regulations govern.",
  example: chamberGasVolumeExample.inputs,
  fields: [
    { key: "chamber_volume_cuft", label: "Chamber internal volume (cu ft)", kind: "number", default: 250 },
    { key: "treatment_pressure_psig", label: "Treatment pressure (psig)", kind: "number", default: 60 },
    { key: "ventilation_acfm_per_occupant", label: "Ventilation rate per occupant (acfm)", kind: "number", default: 2 },
    { key: "occupant_count", label: "Occupants, inside attendant included", kind: "number", default: 2 },
    { key: "treatment_minutes", label: "Treatment duration (min)", kind: "number", default: 240 },
    { key: "air_inventory_cuft", label: "Available air inventory (cu ft)", kind: "number", default: 8000 },
    { key: "oxygen_acfm_per_occupant", label: "Oxygen delivery rate at the mask (acfm)", kind: "number", default: 1.0 },
    { key: "oxygen_minutes", label: "Oxygen duration in the table (min)", kind: "number", default: 120 },
  ],
  outputs: [
    { key: "p", id: "cgv-out-p", label: "Free air to pressurize", value: (r) => fmt(r.pressurize_cuft, 0) + " cu ft at " + fmt(r.treatment_ata, 2) + " ata -- only " + fmt(r.pressurize_share_pct, 0) + "% of the requirement" },
    { key: "v", id: "cgv-out-v", label: "Ventilation air over the treatment", value: (r) => fmt(r.ventilation_cuft, 0) + " cu ft at " + fmt(r.ventilation_cfm_free, 1) + " cu ft/min of free air -- " + fmt(r.ventilation_share_pct, 0) + "% of it, and the term that dominates" },
    { key: "t", id: "cgv-out-t", label: "Total air for this treatment", value: (r) => fmt(r.total_air_cuft, 0) + " cu ft -- " + r.inventory_verdict },
    { key: "l", id: "cgv-out-l", label: "Longest treatment the inventory supports", value: (r) => fmt(r.longest_treatment_min, 0) + " min, against the " + fmt(r.treatment_minutes, 0) + " min entered -- size against the LONGEST table plus its extensions" },
    { key: "o", id: "cgv-out-o", label: "Oxygen, a separate inventory", value: (r) => fmt(r.oxygen_required_cuft, 0) + " cu ft -- its own cylinder bank, and running out of it ends the treatment" },
    { key: "n", id: "cgv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeChamberGasVolume,
});
