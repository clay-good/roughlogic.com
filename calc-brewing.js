// Group O: commercial brewing and distilling.
// spec-v1776..v1788 (scope-trade-expansion-3) follow a brew day from the mash
// (strike water, sparge volume, brewhouse efficiency, tun bed depth) through
// the kettle (hop bitterness, color, boil-off) and the cellar (yeast pitch,
// glycol load, carbonation) to packaging and the still (proof gallons, package
// yield, dry-hop loss). The catalog had four consumer beverage tiles and
// nothing for a production brewery or distillery.

import {
  DEBOUNCE_MS, debounce, makeNumber,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

const QT_PER_GAL = 4;
const LB_PER_GAL_WATER = 8.345;
const GAL_PER_FT3 = 1728 / 231;       // exactly: 231 cubic inches per gallon
const IN_PER_FT = 12;
const ML_PER_GAL = 3785.411784;       // exactly 231 cubic inches
const L_PER_GAL = 3.785411784;
const G_PER_LB = 453.59237;           // exactly
const ATM_PSI = 14.695;
const BTU_PER_REFRIG_TON_HR = 12000;
const HOURS_PER_DAY = 24;

const _finiteGuard = (o) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const value of Object.values(o)) {
      if (typeof value === "number" && !Number.isFinite(value)) {
        return { error: "All numeric inputs must be finite numbers." };
      }
    }
  }
  return null;
};

// Gravity points (1.055 -> 55) from a specific gravity.
const _points = (sg) => 1000 * (sg - 1);

function _simpleRenderer(spec) {
  const render = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    const fields = {};
    for (const f of spec.fields) {
      const field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) field.input.value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function update() {
      const params = {};
      for (const f of spec.fields) params[f.key] = Number(fields[f.key].input.value) || 0;
      const result = spec.compute(params);
      if (result.error) {
        for (const out of Object.values(outs)) out.textContent = "-";
        outs[spec.outputs[0].key].textContent = result.error;
        return;
      }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(result);
    }
    const debounced = debounce(update, DEBOUNCE_MS);
    for (const f of spec.fields) fields[f.key].input.addEventListener("input", debounced);
    attachExampleButton(inputRegion, () => {
      for (const f of spec.fields) {
        if (spec.example[f.key] !== undefined) fields[f.key].input.value = String(spec.example[f.key]);
      }
      update();
    });
  };
  render.schema = {
    inputs: spec.fields.map((f) => ({
      key: f.key, label: f.label, kind: f.kind || "number",
      options: f.options || null, default: f.default ?? null, attrs: f.attrs ?? null,
    })),
    outputs: spec.outputs.map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation,
    scope: spec.scope ?? null,
  };
  return render;
}

export const BREWING_RENDERERS = {};

// ============== spec-v1776: mash strike water temperature ==============

// A two-body energy balance with a specific-heat ratio in it -- not the baker's
// dough-water N-factor average. The tun correction is the part the formula
// leaves out, and the thermal-mass RATIO is what makes it matter on a small
// batch and vanish on a large one.

// dims: in { grain_weight_lb: M, mash_thickness_qt_per_lb: L^3 M^-1, grain_temp_f: T, target_mash_temp_f: T, grain_specific_heat: L^2 T^-2, tun_weight_lb: M, tun_specific_heat: L^2 T^-2, tun_temp_f: T } out: { mash_water_gal: L^3, mash_weight_lb: M, strike_temp_f: T, convention_strike_temp_f: T, tun_drop_f: T }
export function computeMashStrikeWater({ grain_weight_lb = 0, mash_thickness_qt_per_lb = 0, grain_temp_f = 0, target_mash_temp_f = 0, grain_specific_heat = 0, tun_weight_lb = 0, tun_specific_heat = 0, tun_temp_f = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(grain_weight_lb > 0)) return { error: "Grain weight must be positive." };
  if (!(mash_thickness_qt_per_lb > 0)) return { error: "Mash thickness must be positive." };
  if (!(target_mash_temp_f > grain_temp_f)) return { error: "The target mash temperature must be above the grain temperature." };
  if (!(grain_specific_heat > 0 && grain_specific_heat < 1)) return { error: "Grain specific heat must be between 0 and 1 Btu/lb-degF (about 0.4 for malt)." };
  if (!(tun_weight_lb >= 0) || !(tun_specific_heat >= 0)) return { error: "Tun weight and specific heat cannot be negative (enter 0 to leave the tun out)." };
  if (!(tun_temp_f >= -20) || !(grain_temp_f >= -20)) return { error: "Grain and tun temperatures below -20 deg F are outside a brewhouse; check the units (deg F)." };
  if (!(tun_temp_f <= target_mash_temp_f)) return { error: "The tun temperature should be at or below the mash temperature; a hotter tun is a preheated one." };
  const mash_water_gal = grain_weight_lb * mash_thickness_qt_per_lb / QT_PER_GAL;
  const water_lb = mash_water_gal * LB_PER_GAL_WATER;
  const lb_water_per_qt = LB_PER_GAL_WATER / QT_PER_GAL;
  // T_strike = T_mash + (c_grain / (lb water per qt x R)) x (T_mash - T_grain).
  const strike_ratio = grain_specific_heat / lb_water_per_qt;
  const strike_temp_f = target_mash_temp_f + strike_ratio * (target_mash_temp_f - grain_temp_f) / mash_thickness_qt_per_lb;
  const convention_strike_temp_f = target_mash_temp_f + 0.2 * (target_mash_temp_f - grain_temp_f) / mash_thickness_qt_per_lb;
  // The tun then takes heat from the WHOLE mash -- water AND grain -- to a
  // common equilibrium. spec-v1776 divides the tun's demand by the water's heat
  // capacity alone, which is inconsistent with its own strike formula (which
  // counts the grain) and overstates the drop.
  const mash_heat_capacity = water_lb + grain_weight_lb * grain_specific_heat;
  const tun_heat_capacity = tun_weight_lb * tun_specific_heat;
  const tun_drop_f = tun_heat_capacity * (target_mash_temp_f - tun_temp_f) / (mash_heat_capacity + tun_heat_capacity);
  return {
    grain_weight_lb, target_mash_temp_f, tun_weight_lb,
    mash_water_gal, water_lb, strike_ratio,
    mash_weight_lb: water_lb + grain_weight_lb,
    strike_temp_f, convention_strike_temp_f,
    convention_difference_f: convention_strike_temp_f - strike_temp_f,
    mash_heat_capacity, tun_heat_capacity,
    tun_drop_f,
    mash_temp_after_tun_f: target_mash_temp_f - tun_drop_f,
    tun_share_of_capacity_pct: 100 * tun_heat_capacity / (mash_heat_capacity + tun_heat_capacity),
    note: "This is a two-body energy balance with a specific-heat ratio in it, and it shares no arithmetic with the baker's dough-water N-factor calculation even though the two look alike on a page. The rounded 0.2 convention is safe at ordinary thicknesses and worth knowing about at unusual ones. The tun correction is the term the strike formula leaves out: the vessel takes heat from the whole mash -- water and grain together -- and what matters is the tun's share of the combined heat capacity. On a commercial mash it is small and a preheated tun removes it; on a small batch the same vessel is a large fraction of the thermal mass and can move the mash out of its enzyme band. A small mash must preheat its vessel, and a large one need not.",
  };
}

const strikeExample = { grain_weight_lb: 542, mash_thickness_qt_per_lb: 1.25, grain_temp_f: 68, target_mash_temp_f: 152, grain_specific_heat: 0.4, tun_weight_lb: 180, tun_specific_heat: 0.12, tun_temp_f: 68 };
BREWING_RENDERERS["mash-strike-water"] = _simpleRenderer({
  citation: "Citation: energy balance -- strike temperature = mash target + (grain specific heat / water weight per quart) x (mash target - grain temperature) / mash thickness, with about 0.4 Btu/lb-degF for malt and 2.086 lb of water per quart. The tun correction divides the vessel's heat demand by the combined heat capacity of water, grain, and vessel. The brewery's own measured mash temperatures govern.",
  example: strikeExample,
  fields: [
    { key: "grain_weight_lb", label: "Grain weight (lb)" },
    { key: "mash_thickness_qt_per_lb", label: "Mash thickness (qt per lb)" },
    { key: "grain_temp_f", label: "Grain temperature (deg F)", attrs: { step: "any" } },
    { key: "target_mash_temp_f", label: "Target mash temperature (deg F)", attrs: { step: "any" } },
    { key: "grain_specific_heat", label: "Grain specific heat (Btu/lb-deg F)", attrs: { step: "any", min: "0", max: "1" } },
    { key: "tun_weight_lb", label: "Mash tun weight (lb, 0 to omit)" },
    { key: "tun_specific_heat", label: "Tun specific heat (Btu/lb-deg F)" },
    { key: "tun_temp_f", label: "Tun starting temperature (deg F)", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "mash_water_gal", id: "msw-water", label: "Mash water", unit: "gal", value: (r) => fmt(r.mash_water_gal, 1) + " gal (" + fmt(r.water_lb, 0) + " lb), " + fmt(r.mash_weight_lb, 0) + " lb of mash in the tun" },
    { key: "strike_temp_f", id: "msw-strike", label: "Strike water temperature", unit: "deg F", value: (r) => fmt(r.strike_temp_f, 1) + " deg F for a " + fmt(r.target_mash_temp_f, 0) + " deg F mash" },
    { key: "convention_strike_temp_f", id: "msw-conv", label: "The rounded 0.2 convention", unit: "deg F", value: (r) => fmt(r.convention_strike_temp_f, 1) + " deg F -- " + fmt(r.convention_difference_f, 1) + " deg F apart" },
    { key: "tun_drop_f", id: "msw-tun", label: "What an unheated tun costs", unit: "deg F", value: (r) => fmt(r.tun_drop_f, 2) + " deg F, the tun being " + fmt(r.tun_share_of_capacity_pct, 1) + "% of the combined heat capacity" },
    { key: "mash_temp_after_tun_f", id: "msw-after", label: "Mash after the tun equilibrates", unit: "deg F", value: (r) => fmt(r.mash_temp_after_tun_f, 1) + " deg F -- preheat the tun to recover it" },
    { key: "note", id: "msw-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeMashStrikeWater,
});

// ============ spec-v1777: sparge water and pre-boil volume ============

// The grain keeps what it absorbs, and it is the single largest loss in the
// brewhouse. On a high-gravity brew the SPARGE shrinks as the mash grows, which
// is why efficiency falls as gravity rises.

// dims: in { grain_weight_lb: M, mash_thickness_qt_per_lb: L^3 M^-1, absorption_gal_per_lb: L^3 M^-1, preboil_volume_gal: L^3, deadspace_gal: L^3, alternative_grain_weight_lb: M } out: { mash_water_gal: L^3, absorbed_gal: L^3, first_runnings_gal: L^3, sparge_gal: L^3, total_water_gal: L^3 }
export function computeSpargeWaterVolume({ grain_weight_lb = 0, mash_thickness_qt_per_lb = 0, absorption_gal_per_lb = 0, preboil_volume_gal = 0, deadspace_gal = 0, alternative_grain_weight_lb = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(grain_weight_lb > 0) || !(alternative_grain_weight_lb > 0)) return { error: "Grain weights must be positive." };
  if (!(mash_thickness_qt_per_lb > 0)) return { error: "Mash thickness must be positive." };
  if (!(absorption_gal_per_lb >= 0)) return { error: "Grain absorption cannot be negative." };
  if (!(preboil_volume_gal > 0)) return { error: "The pre-boil volume target must be positive." };
  if (!(deadspace_gal >= 0)) return { error: "Vessel deadspace cannot be negative." };
  const volumesFor = (grain_lb) => {
    const mash_water_gal = grain_lb * mash_thickness_qt_per_lb / QT_PER_GAL;
    const absorbed_gal = grain_lb * absorption_gal_per_lb;
    const first_runnings_gal = mash_water_gal - absorbed_gal;
    const sparge_gal = preboil_volume_gal - first_runnings_gal + deadspace_gal;
    return { mash_water_gal, absorbed_gal, first_runnings_gal, sparge_gal, total_water_gal: mash_water_gal + sparge_gal };
  };
  const base = volumesFor(grain_weight_lb);
  if (!(base.first_runnings_gal > 0)) return { error: "The grain absorbs all of the mash water; there are no first runnings at this thickness." };
  if (!(base.sparge_gal >= 0)) return { error: "The first runnings already exceed the pre-boil target; no sparge is needed and the mash is too thin for this volume." };
  const alt = volumesFor(alternative_grain_weight_lb);
  return {
    grain_weight_lb, alternative_grain_weight_lb, preboil_volume_gal,
    mash_water_gal: base.mash_water_gal,
    absorbed_gal: base.absorbed_gal,
    first_runnings_gal: base.first_runnings_gal,
    sparge_gal: base.sparge_gal,
    total_water_gal: base.total_water_gal,
    absorbed_share_pct: 100 * base.absorbed_gal / base.total_water_gal,
    sparge_share_pct: 100 * base.sparge_gal / (base.sparge_gal + base.first_runnings_gal),
    alternative_mash_water_gal: alt.mash_water_gal,
    alternative_absorbed_gal: alt.absorbed_gal,
    alternative_first_runnings_gal: alt.first_runnings_gal,
    alternative_sparge_gal: alt.sparge_gal,
    grain_change_pct: 100 * (alternative_grain_weight_lb - grain_weight_lb) / grain_weight_lb,
    sparge_change_pct: 100 * (alt.sparge_gal - base.sparge_gal) / base.sparge_gal,
    extra_absorbed_gal: alt.absorbed_gal - base.absorbed_gal,
    note: "The water the grain keeps is bought, treated, brought to strike temperature, and then wheeled out to a farmer -- the single largest loss in the brewhouse. The sparge does most of the work, delivering most of the pre-boil volume after the mash is drained, which is why lauter performance decides efficiency far more than the mash does. On a high-gravity brew the squeeze runs the other way: the bigger mash carries more of the pre-boil volume itself, the sparge SHRINKS, and the extract a generous sparge would have rinsed out of the bed is left behind -- exactly why brewhouse efficiency falls as gravity rises. Absorption varies with the malt and the mill gap; the brewery's own measured runoff governs.",
  };
}

const spargeExample = { grain_weight_lb: 542, mash_thickness_qt_per_lb: 1.25, absorption_gal_per_lb: 0.125, preboil_volume_gal: 350, deadspace_gal: 5, alternative_grain_weight_lb: 850 };
BREWING_RENDERERS["sparge-water-volume"] = _simpleRenderer({
  citation: "Citation: volume bookkeeping -- mash water = grain x thickness / 4; first runnings = mash water minus grain absorption (commonly about 0.125 gal per lb); sparge = pre-boil target minus first runnings plus vessel deadspace. The brewery's own measured runoff and absorption govern.",
  example: spargeExample,
  fields: [
    { key: "grain_weight_lb", label: "Grain weight (lb)" },
    { key: "mash_thickness_qt_per_lb", label: "Mash thickness (qt per lb)" },
    { key: "absorption_gal_per_lb", label: "Grain absorption (gal per lb)" },
    { key: "preboil_volume_gal", label: "Pre-boil volume target (gal)" },
    { key: "deadspace_gal", label: "Vessel deadspace (gal)" },
    { key: "alternative_grain_weight_lb", label: "Stronger grain bill to compare (lb)" },
  ],
  outputs: [
    { key: "mash_water_gal", id: "swv-mash", label: "Mash water", unit: "gal", value: (r) => fmt(r.mash_water_gal, 1) + " gal" },
    { key: "absorbed_gal", id: "swv-abs", label: "Kept by the grain", unit: "gal", value: (r) => fmt(r.absorbed_gal, 1) + " gal -- " + fmt(r.absorbed_share_pct, 0) + "% of every gallon heated" },
    { key: "first_runnings_gal", id: "swv-first", label: "First runnings (before the tun deadspace)", unit: "gal", value: (r) => fmt(r.first_runnings_gal, 1) + " gal" },
    { key: "sparge_gal", id: "swv-sparge", label: "Sparge water", unit: "gal", value: (r) => fmt(r.sparge_gal, 1) + " gal -- " + fmt(r.sparge_share_pct, 0) + "% of the runoff arrives after the mash drains" },
    { key: "total_water_gal", id: "swv-total", label: "Total water", unit: "gal", value: (r) => fmt(r.total_water_gal, 1) + " gal" },
    { key: "alternative_sparge_gal", id: "swv-alt", label: "At the stronger grain bill", value: (r) => "grain up " + fmt(r.grain_change_pct, 0) + "%, sparge " + (r.sparge_change_pct < 0 ? "DOWN " : "up ") + fmt(Math.abs(r.sparge_change_pct), 0) + "% to " + fmt(r.alternative_sparge_gal, 1) + " gal, and " + fmt(r.extra_absorbed_gal, 1) + " gal more lost to the grain" },
    { key: "note", id: "swv-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeSpargeWaterVolume,
});

// ================= spec-v1778: brewhouse efficiency =================

// Kettle and fermenter efficiency are both correct and they differ -- a brewery
// that publishes one and scales with the other is short of extract every time.
// And at high gravity the lost extract is the largest single cost of the day.

// dims: in { grain_weight_lb: M, extract_potential_ppg: L^3 M^-1, volume_gal: L^3, original_gravity: dimensionless, transfer_loss_gal: L^3, strong_grain_weight_lb: M, assumed_efficiency_pct: dimensionless, achieved_efficiency_pct: dimensionless } out: { kettle_efficiency_pct: dimensionless, fermenter_efficiency_pct: dimensionless, assumed_og_points: dimensionless, achieved_og_points: dimensionless, shortfall_point_gallons: L^3, shortfall_malt_equivalent_lb: M, malt_to_recover_lb: M }
export function computeBrewhouseEfficiency({ grain_weight_lb = 0, extract_potential_ppg = 0, volume_gal = 0, original_gravity = 0, transfer_loss_gal = 0, strong_grain_weight_lb = 0, assumed_efficiency_pct = 0, achieved_efficiency_pct = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  // An efficiency is a percent; 0 < value < 1 is a fraction typed into a percent field (added 2026-09-26).
  if (["achieved_efficiency_pct", "assumed_efficiency_pct"].some((k) => { const v = Number(arguments[0]?.[k]); return v > 0 && v < 1; })) return { error: "Enter efficiencies as a percent (85 for 85%), not a fraction." };
  if (!(grain_weight_lb > 0) || !(strong_grain_weight_lb > 0)) return { error: "Grain weights must be positive." };
  if (!(extract_potential_ppg > 0)) return { error: "The extract potential must be positive (about 37 points per pound per gallon for base malt)." };
  if (!(volume_gal > 0)) return { error: "The volume must be positive." };
  if (!(original_gravity > 1 && original_gravity < 1.2)) return { error: "Enter the original gravity as a specific gravity between 1.000 and 1.200 (1.038), not in points." };
  if (!(transfer_loss_gal >= 0 && transfer_loss_gal < volume_gal)) return { error: "Kettle and whirlpool losses must be at least 0 and below the volume." };
  if (!(assumed_efficiency_pct > 0 && assumed_efficiency_pct <= 100) || !(achieved_efficiency_pct > 0 && achieved_efficiency_pct <= 100)) {
    return { error: "Efficiencies must be above 0 and at most 100%." };
  }
  const available_point_gallons = grain_weight_lb * extract_potential_ppg;
  const og_points = _points(original_gravity);
  const kettle_point_gallons = og_points * volume_gal;
  const fermenter_volume_gal = volume_gal - transfer_loss_gal;
  const fermenter_point_gallons = og_points * fermenter_volume_gal;
  const kettle_efficiency_pct = 100 * kettle_point_gallons / available_point_gallons;
  const fermenter_efficiency_pct = 100 * fermenter_point_gallons / available_point_gallons;
  // More extract in the kettle than the grain holds is an input error (a ppg typed as a gravity, or the wrong volume), not a result.
  if (kettle_efficiency_pct > 100) return { error: "That gravity and volume hold more extract than the grain can give (over 100% efficiency); check the extract potential (about 37 ppg) and the volume." };
  const strong_available = strong_grain_weight_lb * extract_potential_ppg;
  const assumed_og_points = strong_available * assumed_efficiency_pct / 100 / volume_gal;
  const achieved_og_points = strong_available * achieved_efficiency_pct / 100 / volume_gal;
  // Three different quantities spec-v1778 folds into one sentence. The
  // SHORTFALL against the assumed efficiency is not the total extract left in
  // the tun, and its malt equivalent at full extract is not the malt it would
  // take to recover it at the efficiency actually achieved.
  const shortfall_point_gallons = strong_available * (assumed_efficiency_pct - achieved_efficiency_pct) / 100;
  const total_left_point_gallons = strong_available * (1 - achieved_efficiency_pct / 100);
  return {
    grain_weight_lb, volume_gal, transfer_loss_gal, strong_grain_weight_lb,
    assumed_efficiency_pct, achieved_efficiency_pct,
    available_point_gallons, kettle_point_gallons, fermenter_volume_gal,
    kettle_efficiency_pct, fermenter_efficiency_pct,
    efficiency_gap_points: kettle_efficiency_pct - fermenter_efficiency_pct,
    fermenter_shortfall_pct: 100 * (kettle_efficiency_pct - fermenter_efficiency_pct) / kettle_efficiency_pct,
    assumed_og_points, achieved_og_points,
    assumed_og: 1 + assumed_og_points / 1000,
    achieved_og: 1 + achieved_og_points / 1000,
    gravity_gap_points: assumed_og_points - achieved_og_points,
    shortfall_point_gallons,
    total_left_point_gallons,
    shortfall_malt_equivalent_lb: shortfall_point_gallons / extract_potential_ppg,
    malt_to_recover_lb: shortfall_point_gallons / (extract_potential_ppg * achieved_efficiency_pct / 100),
    note: "Kettle and fermenter efficiency are both correct from the same brew day, and they differ by the transfer losses -- a brewery that publishes the kettle figure and scales its recipes with it is short of extract in the fermenter every time, invisibly, because both numbers come out of the same log sheet. At high gravity efficiency falls, and the gap between the assumed and achieved figures is a different beer in a different style with a different excise calculation. The lost extract is reported three ways because they answer different questions: the shortfall against the assumption, the TOTAL left in the tun, and the malt it would take to make the shortfall up at the efficiency actually achieved. The brewery's own measured gravities and volumes govern.",
  };
}

const efficiencyExample = { grain_weight_lb: 542, extract_potential_ppg: 37, volume_gal: 310, original_gravity: 1.055, transfer_loss_gal: 15, strong_grain_weight_lb: 850, assumed_efficiency_pct: 85.02, achieved_efficiency_pct: 75 };
BREWING_RENDERERS["brewhouse-efficiency"] = _simpleRenderer({
  citation: "Citation: extract bookkeeping in point-gallons -- efficiency = (gravity points x volume) / (grain weight x extract potential), with base malt near 37 points per pound per gallon; original gravity = grain x potential x efficiency / volume. The volume's measurement point (kettle or fermenter) must be stated with the figure. The brewery's own measured gravities govern.",
  example: efficiencyExample,
  fields: [
    { key: "grain_weight_lb", label: "Grain weight (lb)" },
    { key: "extract_potential_ppg", label: "Extract potential (points per lb per gal)" },
    { key: "volume_gal", label: "Kettle volume (gal)" },
    { key: "original_gravity", label: "Measured original gravity", attrs: { step: "any", min: "1" } },
    { key: "transfer_loss_gal", label: "Kettle and whirlpool losses (gal)" },
    { key: "strong_grain_weight_lb", label: "Stronger grain bill to compare (lb)" },
    { key: "assumed_efficiency_pct", label: "Efficiency the recipe assumes (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "achieved_efficiency_pct", label: "Efficiency actually achieved (%)", attrs: { step: "any", min: "0", max: "100" } },
  ],
  outputs: [
    { key: "kettle_efficiency_pct", id: "bhe-kettle", label: "Efficiency at the kettle", value: (r) => fmt(r.kettle_efficiency_pct, 1) + "% of " + fmt(r.available_point_gallons, 0) + " point-gallons available" },
    { key: "fermenter_efficiency_pct", id: "bhe-ferm", label: "Efficiency at the fermenter", value: (r) => fmt(r.fermenter_efficiency_pct, 1) + "% -- " + fmt(r.fermenter_shortfall_pct, 0) + "% short of the kettle figure, from the same brew day" },
    { key: "assumed_og_points", id: "bhe-assumed", label: "Strong beer at the assumed efficiency", value: (r) => "OG " + fmt(r.assumed_og, 3) },
    { key: "achieved_og_points", id: "bhe-achieved", label: "Strong beer at the achieved efficiency", value: (r) => "OG " + fmt(r.achieved_og, 3) + " -- " + fmt(r.gravity_gap_points, 1) + " points short" },
    { key: "shortfall_point_gallons", id: "bhe-short", label: "Extract short of the assumption", value: (r) => fmt(r.shortfall_point_gallons, 0) + " point-gallons -- the full extract of " + fmt(r.shortfall_malt_equivalent_lb, 0) + " lb of malt" },
    { key: "total_left_point_gallons", id: "bhe-left", label: "Total extract left in the tun", value: (r) => fmt(r.total_left_point_gallons, 0) + " point-gallons at the achieved efficiency" },
    { key: "malt_to_recover_lb", id: "bhe-recover", label: "Malt to add to make up the shortfall", unit: "lb", value: (r) => fmt(r.malt_to_recover_lb, 0) + " lb at the achieved efficiency -- a different figure from the malt whose extract was lost" },
    { key: "note", id: "bhe-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeBrewhouseEfficiency,
});

// ================ spec-v1779: IBU by Tinseth ================

// Utilization rises fastest early, so a quarter of the boil gives half the
// bitterness; and wort gravity suppresses it, so a strong beer needs a bigger
// hop bill to taste the same.

// dims: in { batch_volume_gal: L^3, hop_weight_lb: M, alpha_acid_pct: dimensionless, boil_minutes: T, boil_gravity: dimensionless, short_boil_minutes: T, strong_boil_gravity: dimensionless } out: { alpha_acid_mg_per_l: M L^-3, utilization: dimensionless, ibu: dimensionless, short_boil_ibu: dimensionless, strong_gravity_ibu: dimensionless, hops_to_match_lb: M }
export function computeIbuTinseth({ batch_volume_gal = 0, hop_weight_lb = 0, alpha_acid_pct = 0, boil_minutes = 0, boil_gravity = 0, short_boil_minutes = 0, strong_boil_gravity = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  // Unit / range guard added 2026-09-26 after printed-example probing.
  if ([arguments[0]?.alpha_acid_pct].some((v) => Number(v) > 0 && Number(v) < 1)) return { error: "Enter the alpha acid as a percent (6.4 for 6.4%), not a fraction." }; if ([arguments[0]?.boil_gravity, arguments[0]?.strong_boil_gravity].some((v) => Number(v) > 1.2)) return { error: "Enter the boil gravity as a specific gravity (1.050), not in points or degrees Plato." };
  if (!(batch_volume_gal > 0)) return { error: "The batch volume must be positive." };
  if (!(hop_weight_lb > 0)) return { error: "The hop weight must be positive." };
  if (!(alpha_acid_pct > 0 && alpha_acid_pct <= 30)) return { error: "Alpha acid must be above 0 and at most 30%." };
  if (!(boil_minutes > 0) || !(short_boil_minutes > 0)) return { error: "Boil times must be positive." };
  if (!(boil_gravity >= 1) || !(strong_boil_gravity >= 1)) return { error: "Boil gravities must be at least 1.000." };
  const volume_l = batch_volume_gal * L_PER_GAL;
  const hop_g = hop_weight_lb * G_PER_LB;
  const alpha_acid_mg_per_l = hop_g * (alpha_acid_pct / 100) * 1000 / volume_l;
  const bigness = (sg) => 1.65 * Math.pow(0.000125, sg - 1);
  const timeFactor = (min) => (1 - Math.exp(-0.04 * min)) / 4.15;
  const ibuAt = (sg, min) => alpha_acid_mg_per_l * bigness(sg) * timeFactor(min);
  const utilization = bigness(boil_gravity) * timeFactor(boil_minutes);
  const ibu = ibuAt(boil_gravity, boil_minutes);
  const short_boil_ibu = ibuAt(boil_gravity, short_boil_minutes);
  const strong_gravity_ibu = ibuAt(strong_boil_gravity, boil_minutes);
  return {
    batch_volume_gal, boil_minutes, short_boil_minutes,
    alpha_acid_mg_per_l,
    bigness_factor: bigness(boil_gravity),
    time_factor: timeFactor(boil_minutes),
    utilization, utilization_pct: 100 * utilization,
    ibu,
    short_boil_ibu,
    short_boil_share_pct: 100 * short_boil_ibu / ibu,
    short_time_share_pct: 100 * short_boil_minutes / boil_minutes,
    strong_gravity_ibu,
    strong_gravity_loss_pct: 100 * (ibu - strong_gravity_ibu) / ibu,
    hops_to_match_lb: hop_weight_lb * ibu / strong_gravity_ibu,
    note: "Only a fraction of the alpha acids ever becomes bitterness -- the rest goes out with the trub, which is why hop bills look extravagant beside the bitterness they buy. Utilization rises fastest early, so the first minutes of the boil are worth far more than the last, and extending a boil to chase bitterness is nearly worthless. Wort gravity suppresses utilization, so a strong beer does not merely tolerate a bigger hop bill; it REQUIRES one to taste the same, and a recipe scaled up by grain alone comes out less bitter. Tinseth's relation is an empirical fit; the brewery's own measured IBU on its own system governs.",
  };
}

const ibuExample = { batch_volume_gal: 310, hop_weight_lb: 5, alpha_acid_pct: 12, boil_minutes: 60, boil_gravity: 1.05, short_boil_minutes: 15, strong_boil_gravity: 1.08 };
BREWING_RENDERERS["ibu-tinseth"] = _simpleRenderer({
  citation: "Citation: Tinseth's hop utilization -- IBU = alpha acids (mg/L) x bigness factor x boil-time factor, with bigness = 1.65 x 0.000125^(boil gravity - 1) and boil-time factor = (1 - e^(-0.04 t)) / 4.15. An empirical fit; the brewery's own measured IBU on its own system governs.",
  example: ibuExample,
  fields: [
    { key: "batch_volume_gal", label: "Batch volume (gal)" },
    { key: "hop_weight_lb", label: "Hop addition (lb)" },
    { key: "alpha_acid_pct", label: "Alpha acid (%)", attrs: { step: "any", min: "0", max: "30" } },
    { key: "boil_minutes", label: "Boil time (min)" },
    { key: "boil_gravity", label: "Wort gravity during the boil", attrs: { step: "any", min: "1" } },
    { key: "short_boil_minutes", label: "Shorter boil to compare (min)" },
    { key: "strong_boil_gravity", label: "Stronger wort to compare", attrs: { step: "any", min: "1" } },
  ],
  outputs: [
    { key: "alpha_acid_mg_per_l", id: "ibu-aa", label: "Alpha acids in the wort", value: (r) => fmt(r.alpha_acid_mg_per_l, 1) + " mg/L" },
    { key: "ibu", id: "ibu-ibu", label: "Bitterness", value: (r) => fmt(r.ibu, 1) + " IBU at " + fmt(r.utilization_pct, 1) + "% utilization" },
    { key: "short_boil_ibu", id: "ibu-short", label: "At the shorter boil", value: (r) => fmt(r.short_boil_ibu, 1) + " IBU -- " + fmt(r.short_time_share_pct, 0) + "% of the boil gives " + fmt(r.short_boil_share_pct, 0) + "% of the bitterness" },
    { key: "strong_gravity_ibu", id: "ibu-strong", label: "In the stronger wort", value: (r) => fmt(r.strong_gravity_ibu, 1) + " IBU -- " + fmt(r.strong_gravity_loss_pct, 0) + "% lost to gravity alone" },
    { key: "hops_to_match_lb", id: "ibu-match", label: "Hops to hold the bitterness", unit: "lb", value: (r) => fmt(r.hops_to_match_lb, 2) + " lb in the stronger wort" },
    { key: "note", id: "ibu-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeIbuTinseth,
});

// ================ spec-v1780: beer color by Morey ================

// The power law bends the answer: malt color units read linearly overstate the
// color, and a small weight of dark malt carries most of it -- so a two-pound
// error on the roast moves the color more than a fifty-pound error on the base.

// dims: in { base_malt_lb: M, base_lovibond: dimensionless, crystal_malt_lb: M, crystal_lovibond: dimensionless, roast_malt_lb: M, roast_lovibond: dimensionless, batch_volume_gal: L^3 } out: { mcu: dimensionless, srm: dimensionless, srm_without_roast: dimensionless }
export function computeBeerColorSrm({ base_malt_lb = 0, base_lovibond = 0, crystal_malt_lb = 0, crystal_lovibond = 0, roast_malt_lb = 0, roast_lovibond = 0, batch_volume_gal = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(batch_volume_gal > 0)) return { error: "The batch volume must be positive." };
  if (![base_malt_lb, crystal_malt_lb, roast_malt_lb].every((w) => w >= 0)) return { error: "Malt weights cannot be negative." };
  if (![base_lovibond, crystal_lovibond, roast_lovibond].every((l) => l >= 0)) return { error: "Malt colors cannot be negative." };
  const color_units = base_malt_lb * base_lovibond + crystal_malt_lb * crystal_lovibond + roast_malt_lb * roast_lovibond;
  if (!(color_units > 0)) return { error: "Enter at least one malt with a weight and a color." };
  const morey = (mcu) => 1.4922 * Math.pow(mcu, 0.6859);
  const mcu = color_units / batch_volume_gal;
  const srm = morey(mcu);
  const roast_units = roast_malt_lb * roast_lovibond;
  const mcu_without_roast = (color_units - roast_units) / batch_volume_gal;
  const grain_lb = base_malt_lb + crystal_malt_lb + roast_malt_lb;
  // The additive share of malt color units is the only way to attribute the
  // color of a power-law result; it is NOT the share of the final SRM.
  const roast_weight_share_pct = grain_lb > 0 ? 100 * roast_malt_lb / grain_lb : 0;
  const roast_mcu_share_pct = 100 * roast_units / color_units;
  const srm_without_roast = mcu_without_roast > 0 ? morey(mcu_without_roast) : 0;
  const roast_error_mcu = 2 * roast_lovibond / batch_volume_gal;
  const base_error_mcu = 50 * base_lovibond / batch_volume_gal;
  return {
    batch_volume_gal, roast_malt_lb,
    color_units, mcu, srm,
    linear_overstatement_ratio: mcu / srm,
    roast_weight_share_pct, roast_mcu_share_pct,
    mcu_without_roast, srm_without_roast,
    roast_error_mcu, base_error_mcu,
    roast_error_dominates: roast_error_mcu > base_error_mcu,
    note: "The power law bends the answer: malt color units read linearly would predict a beer considerably darker than it is. A small weight of dark malt carries most of the color, so removing it makes a different style from a few pounds out of hundreds -- and a two-pound scaling error on the roast malt moves the color more than a fifty-pound error on the base, which is why dark malts are weighed on a different scale in every brewhouse that cares about consistency. The roast's share is given in malt color units, the only additive decomposition a power law allows. Morey's equation is a fit to measured beers; a spectrophotometer reading of the finished beer governs.",
  };
}

const colorExample = { base_malt_lb: 500, base_lovibond: 2, crystal_malt_lb: 30, crystal_lovibond: 60, roast_malt_lb: 12, roast_lovibond: 500, batch_volume_gal: 310 };
BREWING_RENDERERS["beer-color-srm"] = _simpleRenderer({
  citation: "Citation: Morey's color equation SRM = 1.4922 x MCU^0.6859, with malt color units MCU = sum of (malt weight in lb x color in degrees Lovibond) / batch volume in gallons. A fit to measured beers; a spectrophotometer reading of the finished beer (ASBC Beer-10) governs.",
  example: colorExample,
  fields: [
    { key: "base_malt_lb", label: "Base malt (lb)" },
    { key: "base_lovibond", label: "Base malt color (deg L)" },
    { key: "crystal_malt_lb", label: "Crystal malt (lb)" },
    { key: "crystal_lovibond", label: "Crystal malt color (deg L)" },
    { key: "roast_malt_lb", label: "Roasted malt or barley (lb)" },
    { key: "roast_lovibond", label: "Roasted color (deg L)" },
    { key: "batch_volume_gal", label: "Batch volume (gal)" },
  ],
  outputs: [
    { key: "mcu", id: "bcs-mcu", label: "Malt color units", value: (r) => fmt(r.mcu, 2) + " MCU" },
    { key: "srm", id: "bcs-srm", label: "Beer color", value: (r) => fmt(r.srm, 1) + " SRM -- a linear reading would say " + fmt(r.linear_overstatement_ratio, 1) + " times darker" },
    { key: "roast_mcu_share_pct", id: "bcs-share", label: "Where the color came from", value: (r) => "the roast is " + fmt(r.roast_weight_share_pct, 1) + "% of the grain by weight and " + fmt(r.roast_mcu_share_pct, 0) + "% of the malt color units" },
    { key: "srm_without_roast", id: "bcs-noroast", label: "Without the roast", value: (r) => fmt(r.srm_without_roast, 1) + " SRM -- a different style" },
    { key: "roast_error_mcu", id: "bcs-err", label: "What a weighing error costs", value: (r) => "2 lb of roast moves " + fmt(r.roast_error_mcu, 2) + " MCU against " + fmt(r.base_error_mcu, 2) + " for 50 lb of base" },
    { key: "note", id: "bcs-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeBeerColorSrm,
});

// ================= spec-v1781: yeast pitch rate =================

// The counts only become tractable as a slurry volume, and the slurry volume
// hides viability: pitching by a mark on the bucket underpitches the moment the
// yeast ages, with nothing in the bucket looking different.

// dims: in { batch_volume_gal: L^3, original_gravity: dimensionless, pitch_rate_million_per_ml_plato: dimensionless, slurry_cells_per_ml: L^-3, viability_pct: dimensionless, aged_viability_pct: dimensionless, strong_original_gravity: dimensionless } out: { plato: dimensionless, cells_required: dimensionless, slurry_ml: L^3, slurry_gal: L^3, aged_slurry_gal: L^3, strong_cells_required: dimensionless }
export function computeYeastPitchRate({ batch_volume_gal = 0, original_gravity = 0, pitch_rate_million_per_ml_plato = 0, slurry_cells_per_ml = 0, viability_pct = 0, aged_viability_pct = 0, strong_original_gravity = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  // Unit / range guard added 2026-09-26 after printed-example probing.
  if ([arguments[0]?.viability_pct, arguments[0]?.aged_viability_pct].some((v) => Number(v) > 0 && Number(v) < 1)) return { error: "Enter viability as a percent (94 for 94%), not a fraction." }; if (Number(arguments[0]?.slurry_cells_per_ml) > 0 && Number(arguments[0]?.slurry_cells_per_ml) < 1e6) return { error: "Enter the slurry count in cells per mL (2,200,000,000), not in billions." };
  if (!(batch_volume_gal > 0)) return { error: "The batch volume must be positive." };
  if (!(original_gravity > 1) || !(strong_original_gravity > 1)) return { error: "Original gravities must be above 1.000." };
  if (!(pitch_rate_million_per_ml_plato > 0)) return { error: "The pitch rate must be positive (0.75 ale, 1.5 lager, in million cells per mL per degP)." };
  if (!(slurry_cells_per_ml > 0)) return { error: "The slurry concentration must be positive." };
  if (!(viability_pct > 0 && viability_pct <= 100) || !(aged_viability_pct > 0 && aged_viability_pct <= 100)) return { error: "Viability must be above 0 and at most 100%." };
  const volume_ml = batch_volume_gal * ML_PER_GAL;
  const platoOf = (sg) => 259 - 259 / sg;
  const cellsFor = (sg) => pitch_rate_million_per_ml_plato * 1e6 * volume_ml * platoOf(sg);
  const plato = platoOf(original_gravity);
  const cells_required = cellsFor(original_gravity);
  const slurryFor = (viab) => cells_required / (slurry_cells_per_ml * viab / 100);
  const slurry_ml = slurryFor(viability_pct);
  const aged_slurry_ml = slurryFor(aged_viability_pct);
  const strong_cells_required = cellsFor(strong_original_gravity);
  return {
    batch_volume_gal, viability_pct, aged_viability_pct,
    volume_ml, plato,
    cells_required,
    cells_required_trillions: cells_required / 1e12,
    slurry_ml, slurry_l: slurry_ml / 1000, slurry_gal: slurry_ml / ML_PER_GAL,
    aged_slurry_ml, aged_slurry_gal: aged_slurry_ml / ML_PER_GAL,
    aged_slurry_increase_pct: 100 * (aged_slurry_ml - slurry_ml) / slurry_ml,
    underpitch_by_volume_pct: 100 * (1 - slurry_ml / aged_slurry_ml),
    strong_plato: platoOf(strong_original_gravity),
    strong_cells_required,
    strong_cells_trillions: strong_cells_required / 1e12,
    strong_increase_pct: 100 * (strong_cells_required - cells_required) / cells_required,
    note: "The counts only become tractable as a slurry volume, and that volume depends entirely on the concentration and viability behind it. The yeast looks identical in the bucket as viability falls, so a cellar pitching by volume from a mark on the side underpitches the moment the yeast ages, and the first evidence is a fermentation that lags. The gravity multiplier compounds it: a strong beer pitched at a standard beer's slurry volume is underpitched twice over, once on gravity and once on whatever viability has done since the last brew. A methylene-blue or flow-cytometry viability count on the day governs.",
  };
}

const pitchExample = { batch_volume_gal: 310, original_gravity: 1.055, pitch_rate_million_per_ml_plato: 0.75, slurry_cells_per_ml: 1.2e9, viability_pct: 90, aged_viability_pct: 60, strong_original_gravity: 1.08 };
BREWING_RENDERERS["yeast-pitch-rate"] = _simpleRenderer({
  citation: "Citation: cells required = pitch rate (million cells per mL per degree Plato) x wort volume in mL x degrees Plato, with Plato = 259 - 259 / SG; slurry volume = cells / (slurry concentration x viability). Customary rates are 0.75 for ales and 1.5 for lagers. A viability count on the day of pitching governs.",
  example: pitchExample,
  fields: [
    { key: "batch_volume_gal", label: "Batch volume (gal)" },
    { key: "original_gravity", label: "Original gravity", attrs: { step: "any", min: "1" } },
    { key: "pitch_rate_million_per_ml_plato", label: "Pitch rate (million/mL/deg P)" },
    { key: "slurry_cells_per_ml", label: "Slurry concentration (cells/mL)" },
    { key: "viability_pct", label: "Viability (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "aged_viability_pct", label: "Viability after ageing (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "strong_original_gravity", label: "Stronger beer to compare", attrs: { step: "any", min: "1" } },
  ],
  outputs: [
    { key: "plato", id: "ypr-plato", label: "Degrees Plato", value: (r) => fmt(r.plato, 2) + " deg P" },
    { key: "cells_required", id: "ypr-cells", label: "Cells required", value: (r) => fmt(r.cells_required_trillions, 2) + " trillion" },
    { key: "slurry_gal", id: "ypr-slurry", label: "Slurry to pitch", unit: "gal", value: (r) => fmt(r.slurry_gal, 2) + " gal (" + fmt(r.slurry_l, 1) + " L)" },
    { key: "aged_slurry_gal", id: "ypr-aged", label: "At the aged viability", unit: "gal", value: (r) => fmt(r.aged_slurry_gal, 2) + " gal -- " + fmt(r.aged_slurry_increase_pct, 0) + "% more for the same pitch" },
    { key: "underpitch_by_volume_pct", id: "ypr-under", label: "Pitching the old volume by the mark", value: (r) => "underpitches by " + fmt(r.underpitch_by_volume_pct, 0) + "%, and nothing in the bucket looks different" },
    { key: "strong_cells_required", id: "ypr-strong", label: "For the stronger beer", value: (r) => fmt(r.strong_cells_trillions, 2) + " trillion at " + fmt(r.strong_plato, 1) + " deg P -- " + fmt(r.strong_increase_pct, 0) + "% more yeast" },
    { key: "note", id: "ypr-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeYeastPitchRate,
});

// ================= spec-v1782: kettle boil-off =================

// Extract is conserved through the boil, which is the check that catches an
// arithmetic error anywhere in the brew day. A harder boil gives a stronger,
// smaller beer, and topping up to volume cancels the two errors rather than
// fixing either.

// dims: in { preboil_volume_gal: L^3, preboil_gravity: dimensionless, boiloff_pct_per_hour: dimensionless, boil_hours: T, shrinkage_pct: dimensionless, hard_boiloff_pct_per_hour: dimensionless } out: { evaporated_gal: L^3, hot_volume_gal: L^3, cooled_volume_gal: L^3, cooled_og_points: dimensionless, hard_cooled_volume_gal: L^3, hard_og_points: dimensionless }
export function computeKettleBoilOff({ preboil_volume_gal = 0, preboil_gravity = 0, boiloff_pct_per_hour = 0, boil_hours = 0, shrinkage_pct = 0, hard_boiloff_pct_per_hour = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  // Unit / range guard added 2026-09-26 after printed-example probing.
  if ([arguments[0]?.boiloff_pct_per_hour, arguments[0]?.hard_boiloff_pct_per_hour].some((v) => Number(v) > 0 && Number(v) < 1)) return { error: "Enter the boil-off rate as a percent per hour (10 for 10%), not a fraction." };
  if (!(preboil_volume_gal > 0)) return { error: "The pre-boil volume must be positive." };
  if (!(preboil_gravity > 1)) return { error: "The pre-boil gravity must be above 1.000." };
  if (!(boiloff_pct_per_hour >= 0) || !(hard_boiloff_pct_per_hour >= 0)) return { error: "Boil-off rates cannot be negative." };
  if (!(boil_hours > 0)) return { error: "The boil duration must be positive." };
  if (!(shrinkage_pct >= 0 && shrinkage_pct < 100)) return { error: "Cooling shrinkage must be at least 0 and below 100%." };
  if (boiloff_pct_per_hour * boil_hours >= 100 || hard_boiloff_pct_per_hour * boil_hours >= 100) return { error: "That boil would evaporate the whole kettle." };
  const extract_point_gallons = _points(preboil_gravity) * preboil_volume_gal;
  const boilFor = (rate) => {
    const evaporated_gal = preboil_volume_gal * rate / 100 * boil_hours;
    const hot_volume_gal = preboil_volume_gal - evaporated_gal;
    const cooled_volume_gal = hot_volume_gal * (1 - shrinkage_pct / 100);
    return {
      evaporated_gal, hot_volume_gal, cooled_volume_gal,
      hot_og_points: extract_point_gallons / hot_volume_gal,
      cooled_og_points: extract_point_gallons / cooled_volume_gal,
    };
  };
  const base = boilFor(boiloff_pct_per_hour);
  const hard = boilFor(hard_boiloff_pct_per_hour);
  return {
    preboil_volume_gal, boil_hours,
    extract_point_gallons,
    evaporated_gal: base.evaporated_gal,
    hot_volume_gal: base.hot_volume_gal,
    hot_og_points: base.hot_og_points,
    cooled_volume_gal: base.cooled_volume_gal,
    cooled_og_points: base.cooled_og_points,
    cooled_og: 1 + base.cooled_og_points / 1000,
    points_added: base.cooled_og_points - _points(preboil_gravity),
    volume_removed_gal: preboil_volume_gal - base.cooled_volume_gal,
    shrinkage_gal: base.hot_volume_gal - base.cooled_volume_gal,
    shrinkage_points: base.cooled_og_points - base.hot_og_points,
    hard_cooled_volume_gal: hard.cooled_volume_gal,
    hard_og_points: hard.cooled_og_points,
    hard_og: 1 + hard.cooled_og_points / 1000,
    hard_volume_short_gal: base.cooled_volume_gal - hard.cooled_volume_gal,
    hard_points_stronger: hard.cooled_og_points - base.cooled_og_points,
    hard_volume_short_pct: 100 * (base.cooled_volume_gal - hard.cooled_volume_gal) / base.cooled_volume_gal,
    note: "Extract is conserved through the boil -- the same point-gallons at every step -- which is the check that catches an arithmetic error anywhere in the brew day. Shrinkage on cooling is not a loss to hunt for: a brewery reading its kettle hot and its fermenter cold is comparing two volumes of the same wort. A harder boil gives a stronger and smaller beer, and the two errors HIDE EACH OTHER: the high gravity reads as good efficiency while the short volume reads as a transfer loss, and topping up to volume at knockout lands on target by cancelling two mistakes rather than fixing either. Measure the boil-off rate on the kettle and the puzzle disappears.",
  };
}

const boilExample = { preboil_volume_gal: 350, preboil_gravity: 1.049, boiloff_pct_per_hour: 8, boil_hours: 1, shrinkage_pct: 4, hard_boiloff_pct_per_hour: 12 };
BREWING_RENDERERS["kettle-boil-off"] = _simpleRenderer({
  citation: "Citation: conservation of extract -- point-gallons = gravity points x volume is constant through the boil, so gravity after the boil = pre-boil point-gallons / the volume remaining after evaporation and cooling shrinkage (commonly about 4%). The kettle's own measured boil-off rate governs.",
  example: boilExample,
  fields: [
    { key: "preboil_volume_gal", label: "Pre-boil volume (gal)" },
    { key: "preboil_gravity", label: "Pre-boil gravity", attrs: { step: "any", min: "1" } },
    { key: "boiloff_pct_per_hour", label: "Boil-off rate (% per hour)" },
    { key: "boil_hours", label: "Boil duration (hours)" },
    { key: "shrinkage_pct", label: "Cooling shrinkage (%)" },
    { key: "hard_boiloff_pct_per_hour", label: "Harder boil to compare (% per hour)" },
  ],
  outputs: [
    { key: "extract_point_gallons", id: "kbo-extract", label: "Extract, constant throughout", value: (r) => fmt(r.extract_point_gallons, 0) + " point-gallons" },
    { key: "hot_volume_gal", id: "kbo-hot", label: "Hot, after the boil", value: (r) => fmt(r.hot_volume_gal, 1) + " gal at " + fmt(r.hot_og_points, 1) + " points, after " + fmt(r.evaporated_gal, 1) + " gal evaporated" },
    { key: "cooled_volume_gal", id: "kbo-cool", label: "Into the fermenter", value: (r) => fmt(r.cooled_volume_gal, 1) + " gal at OG " + fmt(r.cooled_og, 3) + " -- " + fmt(r.points_added, 1) + " points added, " + fmt(r.volume_removed_gal, 1) + " gal removed" },
    { key: "shrinkage_gal", id: "kbo-shrink", label: "What cooling shrinkage is worth", value: (r) => fmt(r.shrinkage_gal, 1) + " gal and " + fmt(r.shrinkage_points, 1) + " points -- not a loss" },
    { key: "hard_og_points", id: "kbo-hard", label: "At the harder boil", value: (r) => "OG " + fmt(r.hard_og, 3) + ", " + fmt(r.hard_points_stronger, 1) + " points stronger and " + fmt(r.hard_volume_short_gal, 1) + " gal (" + fmt(r.hard_volume_short_pct, 0) + "%) short" },
    { key: "note", id: "kbo-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeKettleBoilOff,
});

// ============ spec-v1783: carbonation volumes and pressure ============

// The temperature term does all of it: a cooler drifting a few degrees warm
// flattens the beer with the gauge unmoved, and chasing it with pressure
// over-carbonates the beer once the cooler is fixed.

// dims: in { beer_temp_f: T, gauge_psig: M L^-1 T^-2, target_volumes: dimensionless, warm_temp_f: T } out: { co2_volumes: dimensionless, pressure_for_target_psig: M L^-1 T^-2, warm_co2_volumes: dimensionless, warm_pressure_for_target_psig: M L^-1 T^-2, overcarbonation_volumes: dimensionless }
export function computeCarbonationVolumesPressure({ beer_temp_f = 0, gauge_psig = 0, target_volumes = 0, warm_temp_f = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(beer_temp_f >= 28 && beer_temp_f <= 80) || !(warm_temp_f >= 28 && warm_temp_f <= 80)) return { error: "Beer temperatures must be between 28 and 80 deg F, the range the fit covers." };
  if (!(gauge_psig >= 0)) return { error: "Gauge pressure cannot be negative." };
  if (!(target_volumes > 0)) return { error: "The target carbonation must be positive." };
  // A standard fit of the CO2 solubility tables: volumes = (psig + atm) x k(T)
  // - 0.003342, with k falling exponentially as the beer warms.
  const k = (tf) => 0.01821 + 0.09011 * Math.exp(-(tf - 32) / 43.11);
  const volumesAt = (psig, tf) => (psig + ATM_PSI) * k(tf) - 0.003342;
  const pressureFor = (vols, tf) => (vols + 0.003342) / k(tf) - ATM_PSI;
  const co2_volumes = volumesAt(gauge_psig, beer_temp_f);
  const pressure_for_target_psig = pressureFor(target_volumes, beer_temp_f);
  const warm_co2_volumes = volumesAt(gauge_psig, warm_temp_f);
  const warm_pressure_for_target_psig = pressureFor(target_volumes, warm_temp_f);
  // A target the beer holds with the vent open has no gauge setting; the fit would report a vacuum.
  if (pressure_for_target_psig < 0 || warm_pressure_for_target_psig < 0) return { error: "The beer holds that many volumes at atmospheric pressure at this temperature; no positive gauge pressure is needed. Check the target volumes (2.2 to 2.8 for most beer)." };
  return {
    beer_temp_f, warm_temp_f, gauge_psig, target_volumes,
    solubility_factor: k(beer_temp_f),
    co2_volumes, pressure_for_target_psig,
    warm_co2_volumes,
    warm_loss_pct: 100 * (co2_volumes - warm_co2_volumes) / co2_volumes,
    warm_pressure_for_target_psig,
    warm_pressure_increase_pct: 100 * (warm_pressure_for_target_psig - pressure_for_target_psig) / pressure_for_target_psig,
    overcarbonation_volumes: volumesAt(warm_pressure_for_target_psig, beer_temp_f),
    note: "The temperature term does all of it: let the cooler drift a few degrees warm with nothing else touched and the beer loses real carbonation while the gauge has not moved and nothing is leaking. Restoring the target at the warm temperature takes substantially more pressure, and that pressure is the trap -- fix the cooler afterwards without dropping the gas and the beer over-carbonates as it equilibrates cold. CHASE THE TEMPERATURE, NOT THE GAUGE. This is a fit to the published CO2 solubility tables at sea level; altitude lowers atmospheric pressure, and the brewery's own dissolved-CO2 measurement governs.",
  };
}

const carbonationExample = { beer_temp_f: 38, gauge_psig: 12, target_volumes: 2.6, warm_temp_f: 45 };
BREWING_RENDERERS["carbonation-volumes-pressure"] = _simpleRenderer({
  citation: "Citation: a fit to the published CO2 solubility tables -- volumes of CO2 = (gauge psig + 14.695) x k(T) - 0.003342, with k(T) = 0.01821 + 0.09011 e^(-(T - 32) / 43.11) for T in degrees Fahrenheit, solved both ways. Sea-level atmospheric pressure is assumed; the brewery's own dissolved-CO2 measurement governs.",
  example: carbonationExample,
  fields: [
    { key: "beer_temp_f", label: "Beer temperature (deg F)", attrs: { step: "any", min: "28", max: "80" } },
    { key: "gauge_psig", label: "Head pressure (psig)" },
    { key: "target_volumes", label: "Target carbonation (volumes)" },
    { key: "warm_temp_f", label: "Warmer temperature to compare (deg F)", attrs: { step: "any", min: "28", max: "80" } },
  ],
  outputs: [
    { key: "co2_volumes", id: "cvp-vol", label: "Carbonation at the gauge", value: (r) => fmt(r.co2_volumes, 3) + " volumes at " + fmt(r.gauge_psig, 1) + " psig" },
    { key: "pressure_for_target_psig", id: "cvp-target", label: "Pressure for the target", unit: "psig", value: (r) => fmt(r.pressure_for_target_psig, 2) + " psig for " + fmt(r.target_volumes, 2) + " volumes" },
    { key: "warm_co2_volumes", id: "cvp-warm", label: "Same gauge, warmer beer", value: (r) => fmt(r.warm_co2_volumes, 3) + " volumes -- " + fmt(r.warm_loss_pct, 0) + "% flatter with nothing touched" },
    { key: "warm_pressure_for_target_psig", id: "cvp-warmp", label: "Pressure to hold the target warm", unit: "psig", value: (r) => fmt(r.warm_pressure_for_target_psig, 2) + " psig -- " + fmt(r.warm_pressure_increase_pct, 0) + "% more" },
    { key: "overcarbonation_volumes", id: "cvp-over", label: "Then fix the cooler, not the gas", value: (r) => fmt(r.overcarbonation_volumes, 2) + " volumes -- over-carbonated" },
    { key: "note", id: "cvp-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeCarbonationVolumesPressure,
});

// ============= spec-v1784: fermenter glycol load =============

// The crash schedule, not the brew schedule, sizes the chiller. A plant sized
// on the heat of fermentation is short on the day a tank comes down, and the
// shortfall shows up as a crash that takes three days instead of one.

// dims: in { batch_volume_gal: L^3, original_gravity: dimensionless, final_gravity: dimensionless, heat_of_fermentation_btu_per_lb: L^2 T^-2, peak_day_share_pct: dimensionless, crash_start_temp_f: T, crash_target_temp_f: T, crash_hours: T, tank_surface_sqft: L^2, tank_u_factor: M T^-4, cellar_temp_f: T, glycol_delta_t_f: T } out: { fermentation_heat_btu: M L^2 T^-2, adiabatic_rise_f: T, fermentation_load_btuh: M L^2 T^-3, crash_load_btuh: M L^2 T^-3, glycol_gpm: L^3 T^-1 }
export function computeFermenterGlycolLoad({ batch_volume_gal = 0, original_gravity = 0, final_gravity = 0, heat_of_fermentation_btu_per_lb = 0, peak_day_share_pct = 0, crash_start_temp_f = 0, crash_target_temp_f = 0, crash_hours = 0, tank_surface_sqft = 0, tank_u_factor = 0, cellar_temp_f = 0, glycol_delta_t_f = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  // Unit / range guard added 2026-09-26 after printed-example probing.
  if ([arguments[0]?.peak_day_share_pct].some((v) => Number(v) > 0 && Number(v) < 1)) return { error: "Enter the peak-day share as a percent (40 for 40%), not a fraction." };
  if (!(batch_volume_gal > 0)) return { error: "The batch volume must be positive." };
  if (!(original_gravity > final_gravity) || !(final_gravity >= 1)) return { error: "The original gravity must exceed the final gravity, and both be at least 1.000." };
  if (!(heat_of_fermentation_btu_per_lb > 0)) return { error: "The heat of fermentation must be positive (about 280 Btu per lb of extract)." };
  if (!(peak_day_share_pct > 0 && peak_day_share_pct <= 100)) return { error: "The peak-day share must be above 0 and at most 100%." };
  if (!(crash_start_temp_f > crash_target_temp_f)) return { error: "The crash must start above its target temperature." };
  if (!(crash_hours > 0)) return { error: "The crash duration must be positive." };
  if (!(tank_surface_sqft >= 0) || !(tank_u_factor >= 0)) return { error: "Tank surface and U-factor cannot be negative." };
  if (!(glycol_delta_t_f > 0)) return { error: "The glycol temperature rise must be positive." };
  // About 46 points of gravity per pound of extract per gallon for sucrose-
  // equivalent sugar; the extract consumed is what the yeast turned to heat.
  const extract_consumed_lb = (_points(original_gravity) - _points(final_gravity)) * batch_volume_gal / 46;
  const fermentation_heat_btu = extract_consumed_lb * heat_of_fermentation_btu_per_lb;
  const beer_lb = batch_volume_gal * 8.4;
  const beer_specific_heat = 0.9;
  const beer_heat_capacity = beer_lb * beer_specific_heat;
  // Shell gain is area x U x (room - beer), and the beer is at a different
  // temperature in each period. spec-v1784 states that formula, then charges the
  // fermenting tank the gain of a CRASHED one (70 - 34 degF) while its beer is
  // at the crash start, overstating the fermentation load by more than half and
  // understating how far the crash outruns it.
  const shell_ua = tank_surface_sqft * tank_u_factor;
  const fermentation_ambient_btuh = shell_ua * (cellar_temp_f - crash_start_temp_f);
  const ambient_btuh = shell_ua * (cellar_temp_f - crash_target_temp_f);
  const fermentation_load_btuh = fermentation_heat_btu * (peak_day_share_pct / 100) / HOURS_PER_DAY + fermentation_ambient_btuh;
  const crash_heat_btu = beer_heat_capacity * (crash_start_temp_f - crash_target_temp_f);
  const crashFor = (hours) => crash_heat_btu / hours + ambient_btuh;
  const crash_load_btuh = crashFor(crash_hours);
  if (!(fermentation_load_btuh > 0) || !(crash_load_btuh > 0)) return { error: "The cellar is cold enough to carry this tank on its own; there is no glycol load to size at these temperatures." };
  const fast_crash_load_btuh = crashFor(crash_hours / 2);
  const glycol_gpm = crash_load_btuh / (60 * 8.6 * 0.9 * glycol_delta_t_f);
  return {
    batch_volume_gal, crash_hours,
    extract_consumed_lb, fermentation_heat_btu, beer_lb,
    adiabatic_rise_f: fermentation_heat_btu / beer_heat_capacity,
    ambient_btuh, fermentation_ambient_btuh,
    fermentation_load_btuh,
    fermentation_load_tr: fermentation_load_btuh / BTU_PER_REFRIG_TON_HR,
    crash_heat_btu,
    crash_load_btuh,
    crash_load_tr: crash_load_btuh / BTU_PER_REFRIG_TON_HR,
    crash_to_fermentation_ratio: crash_load_btuh / fermentation_load_btuh,
    fermentation_sizing_shortfall_pct: 100 * (1 - fermentation_load_btuh / crash_load_btuh),
    fast_crash_load_btuh,
    fast_crash_load_tr: fast_crash_load_btuh / BTU_PER_REFRIG_TON_HR,
    glycol_gpm,
    note: "The adiabatic rise is the check that the heat of fermentation figure is right -- it should land in the 20 to 40 degF range breweries observe with the glycol off. The peak fermentation load is small; the CRASH is what sizes the chiller, because cold-crashing a full tank to its target in a day asks for far more than fermentation ever does, and halving the crash time roughly doubles it again. A plant sized on the heat of fermentation is short on the day a tank comes down, and the shortfall shows up as a crash that takes three days instead of one. The pump, the header, and the jacket circuit must deliver the glycol flow to however many tanks the cellar crashes together. The chiller manufacturer's capacity at the actual glycol temperature governs.",
  };
}

const glycolExample = { batch_volume_gal: 310, original_gravity: 1.055, final_gravity: 1.012, heat_of_fermentation_btu_per_lb: 280, peak_day_share_pct: 40, crash_start_temp_f: 68, crash_target_temp_f: 34, crash_hours: 24, tank_surface_sqft: 143, tank_u_factor: 0.15, cellar_temp_f: 70, glycol_delta_t_f: 8 };
BREWING_RENDERERS["fermenter-glycol-load"] = _simpleRenderer({
  citation: "Citation: heat of fermentation about 280 Btu per lb of extract consumed, with extract = (OG - FG points) x volume / 46; the crash load = beer mass x 0.9 Btu/lb-degF x the temperature drop / the hours allowed; each load adds ambient gain through the tank shell, area x U x (cellar - beer), at the beer's temperature in that period (spec-v1784 took the fermentation-period gain at the crash target); glycol flow = load / (60 x 8.6 lb/gal x 0.9 x the glycol temperature rise). The chiller manufacturer's capacity at the actual glycol temperature governs.",
  example: glycolExample,
  fields: [
    { key: "batch_volume_gal", label: "Batch volume (gal)" },
    { key: "original_gravity", label: "Original gravity", attrs: { step: "any", min: "1" } },
    { key: "final_gravity", label: "Final gravity", attrs: { step: "any", min: "1" } },
    { key: "heat_of_fermentation_btu_per_lb", label: "Heat of fermentation (Btu per lb extract)" },
    { key: "peak_day_share_pct", label: "Share released on the peak day (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "crash_start_temp_f", label: "Crash start temperature (deg F)", attrs: { step: "any" } },
    { key: "crash_target_temp_f", label: "Crash target temperature (deg F)", attrs: { step: "any" } },
    { key: "crash_hours", label: "Hours allowed for the crash" },
    { key: "tank_surface_sqft", label: "Tank surface area (sq ft)" },
    { key: "tank_u_factor", label: "Tank shell U-factor (Btu/h-sq ft-deg F)" },
    { key: "cellar_temp_f", label: "Cellar temperature (deg F)", attrs: { step: "any" } },
    { key: "glycol_delta_t_f", label: "Glycol temperature rise (deg F)" },
  ],
  outputs: [
    { key: "fermentation_heat_btu", id: "fgl-heat", label: "Heat of fermentation, whole batch", value: (r) => fmt(r.fermentation_heat_btu, 0) + " Btu from " + fmt(r.extract_consumed_lb, 0) + " lb of extract" },
    { key: "adiabatic_rise_f", id: "fgl-rise", label: "Rise with the glycol off", unit: "deg F", value: (r) => fmt(r.adiabatic_rise_f, 1) + " deg F -- the check on the heat figure" },
    { key: "fermentation_load_btuh", id: "fgl-ferm", label: "Peak fermentation load", value: (r) => fmt(r.fermentation_load_btuh, 0) + " Btu/h (" + fmt(r.fermentation_load_tr, 2) + " tons), " + fmt(r.fermentation_ambient_btuh, 0) + " of it through the shell" },
    { key: "crash_load_btuh", id: "fgl-crash", label: "Crash load", value: (r) => fmt(r.crash_load_btuh, 0) + " Btu/h (" + fmt(r.crash_load_tr, 2) + " tons) -- " + fmt(r.crash_to_fermentation_ratio, 1) + " times the fermentation load" },
    { key: "fermentation_sizing_shortfall_pct", id: "fgl-short", label: "Sizing on fermentation alone", value: (r) => "leaves the plant " + fmt(r.fermentation_sizing_shortfall_pct, 0) + "% short on a crash day" },
    { key: "fast_crash_load_btuh", id: "fgl-fast", label: "Crashing in half the time", value: (r) => fmt(r.fast_crash_load_btuh, 0) + " Btu/h (" + fmt(r.fast_crash_load_tr, 2) + " tons) from one fermenter" },
    { key: "glycol_gpm", id: "fgl-gpm", label: "Glycol flow at the crash", unit: "gpm", value: (r) => fmt(r.glycol_gpm, 2) + " gpm to this tank" },
    { key: "note", id: "fgl-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeFermenterGlycolLoad,
});

// ============ spec-v1785: proof gallon yield and excise ============

// Proof gallons always equal twice the absolute alcohol -- the identity that
// catches an arithmetic error anywhere in a gauging record. The tax follows the
// alcohol, not the bottle.

// dims: in { wash_volume_gal: L^3, wash_abv_pct: dimensionless, recovery_pct: dimensionless, collection_proof: dimensionless, alternative_proof: dimensionless, hearts_share_pct: dimensionless, excise_rate_per_pg: dimensionless } out: { absolute_alcohol_gal: L^3, recovered_alcohol_gal: L^3, wine_gallons: L^3, proof_gallons: L^3, hearts_proof_gallons: L^3, excise: dimensionless }
export function computeProofGallonYield({ wash_volume_gal = 0, wash_abv_pct = 0, recovery_pct = 0, collection_proof = 0, alternative_proof = 0, hearts_share_pct = 0, excise_rate_per_pg = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  // Unit / range guard added 2026-09-26 after printed-example probing.
  if ([arguments[0]?.wash_abv_pct, arguments[0]?.recovery_pct, arguments[0]?.hearts_share_pct].some((v) => Number(v) > 0 && Number(v) < 1)) return { error: "Enter ABV, recovery and hearts share as percents (40 for 40%), not fractions." };
  if (!(wash_volume_gal > 0)) return { error: "The wash volume must be positive." };
  if (!(wash_abv_pct > 0 && wash_abv_pct < 100)) return { error: "Wash alcohol by volume must be above 0 and below 100%." };
  if (!(recovery_pct > 0 && recovery_pct <= 100)) return { error: "Still recovery must be above 0 and at most 100%." };
  if (!(collection_proof > 0 && collection_proof <= 200) || !(alternative_proof > 0 && alternative_proof <= 200)) return { error: "Proof must be above 0 and at most 200." };
  if (!(hearts_share_pct > 0 && hearts_share_pct <= 100)) return { error: "The hearts share must be above 0 and at most 100%." };
  if (!(excise_rate_per_pg >= 0)) return { error: "The excise rate cannot be negative." };
  const absolute_alcohol_gal = wash_volume_gal * wash_abv_pct / 100;
  const recovered_alcohol_gal = absolute_alcohol_gal * recovery_pct / 100;
  const gaugeAt = (proof) => {
    const wine_gallons = recovered_alcohol_gal / (proof / 200);
    return { wine_gallons, proof_gallons: wine_gallons * proof / 100 };
  };
  const collected = gaugeAt(collection_proof);
  const cut = gaugeAt(alternative_proof);
  const hearts_alcohol_gal = recovered_alcohol_gal * hearts_share_pct / 100;
  const hearts_proof_gallons = hearts_alcohol_gal * 2;
  return {
    wash_volume_gal, collection_proof, alternative_proof, hearts_share_pct,
    absolute_alcohol_gal, recovered_alcohol_gal,
    wine_gallons: collected.wine_gallons,
    proof_gallons: collected.proof_gallons,
    alternative_wine_gallons: cut.wine_gallons,
    alternative_proof_gallons: cut.proof_gallons,
    proof_gallon_identity: 2 * recovered_alcohol_gal,
    excise: collected.proof_gallons * excise_rate_per_pg,
    hearts_alcohol_gal, hearts_proof_gallons,
    hearts_excise: hearts_proof_gallons * excise_rate_per_pg,
    heads_tails_proof_gallons: collected.proof_gallons - hearts_proof_gallons,
    note: "Proof gallons always equal twice the absolute alcohol, whatever proof the spirit is collected or cut to -- the identity that catches an arithmetic error anywhere in a gauging record: if they do not match, the proof or the volume is wrong. The volume can nearly double on cutting while the taxable quantity does not move, because the tax follows the alcohol, not the bottle. The heads and tails are not waste; they go back into the next charge and are recovered again. The recovery loss and the cut are different numbers with different remedies, and a distillery reporting one combined yield figure cannot tell a still problem from a cut decision. Proof here is by volume at 60 degF; the TTB gauging tables and the distillery's own records govern.",
  };
}

const proofExample = { wash_volume_gal: 500, wash_abv_pct: 8, recovery_pct: 85, collection_proof: 140, alternative_proof: 80, hearts_share_pct: 75, excise_rate_per_pg: 2.70 };
BREWING_RENDERERS["proof-gallon-yield"] = _simpleRenderer({
  citation: "Citation: 27 CFR Part 19 gauging -- a proof gallon is one wine gallon at 100 proof, so proof gallons = wine gallons x proof / 100 = twice the absolute alcohol; absolute alcohol = volume x ABV, recovered at the still's efficiency. Federal excise is assessed per proof gallon. The TTB gauging tables and the current excise rate govern.",
  example: proofExample,
  fields: [
    { key: "wash_volume_gal", label: "Wash charge (gal)" },
    { key: "wash_abv_pct", label: "Wash alcohol by volume (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "recovery_pct", label: "Still alcohol recovery (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "collection_proof", label: "Collection proof", attrs: { step: "any", min: "0", max: "200" } },
    { key: "alternative_proof", label: "Proof after cutting", attrs: { step: "any", min: "0", max: "200" } },
    { key: "hearts_share_pct", label: "Hearts share of recovered alcohol (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "excise_rate_per_pg", label: "Excise rate ($ per proof gallon)" },
  ],
  outputs: [
    { key: "recovered_alcohol_gal", id: "pgy-alc", label: "Absolute alcohol recovered", unit: "gal", value: (r) => fmt(r.recovered_alcohol_gal, 2) + " gal of " + fmt(r.absolute_alcohol_gal, 2) + " in the charge" },
    { key: "proof_gallons", id: "pgy-pg", label: "At the collection proof", value: (r) => fmt(r.wine_gallons, 2) + " wine gallons = " + fmt(r.proof_gallons, 2) + " proof gallons" },
    { key: "alternative_proof_gallons", id: "pgy-cut", label: "Cut to the lower proof", value: (r) => fmt(r.alternative_wine_gallons, 2) + " wine gallons = " + fmt(r.alternative_proof_gallons, 2) + " proof gallons -- the same" },
    { key: "proof_gallon_identity", id: "pgy-check", label: "The gauging check", value: (r) => "twice the absolute alcohol is " + fmt(r.proof_gallon_identity, 2) + " proof gallons, always" },
    { key: "excise", id: "pgy-tax", label: "Excise on the run", value: (r) => "$" + fmt(r.excise, 2) },
    { key: "hearts_proof_gallons", id: "pgy-hearts", label: "Hearts, the saleable spirit", value: (r) => fmt(r.hearts_proof_gallons, 2) + " proof gallons, $" + fmt(r.hearts_excise, 2) + " of excise; " + fmt(r.heads_tails_proof_gallons, 2) + " PG of heads and tails go back to the next charge" },
    { key: "note", id: "pgy-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeProofGallonYield,
});

// ============ spec-v1786: packaging yield and remainder ============

// The percentage losses measure the process; the remainder is arithmetic, and it
// does not scale or average -- which is why yield is tracked in whole packages
// rather than in percentages.

// dims: in { brite_volume_gal: L^3, transfer_loss_pct: dimensionless, fill_loss_pct: dimensionless, package_gal: L^3, smallest_package_gal: L^3, revenue_per_package: dimensionless } out: { packaged_volume_gal: L^3, whole_packages: dimensionless, remainder_gal: L^3, saleable_gal: L^3, total_loss_gal: L^3 }
export function computePackagingYieldLoss({ brite_volume_gal = 0, transfer_loss_pct = 0, fill_loss_pct = 0, package_gal = 0, smallest_package_gal = 0, revenue_per_package = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(brite_volume_gal > 0)) return { error: "The brite tank volume must be positive." };
  if (!(transfer_loss_pct >= 0 && transfer_loss_pct < 100) || !(fill_loss_pct >= 0 && fill_loss_pct < 100)) return { error: "Loss percentages must be at least 0 and below 100%." };
  if (!(package_gal > 0)) return { error: "The package size must be positive." };
  if (!(smallest_package_gal > 0 && smallest_package_gal <= package_gal)) return { error: "The smallest package must be positive and no larger than the main package." };
  if (!(revenue_per_package >= 0)) return { error: "Revenue per package cannot be negative." };
  const after_transfer_gal = brite_volume_gal * (1 - transfer_loss_pct / 100);
  const packaged_volume_gal = after_transfer_gal * (1 - fill_loss_pct / 100);
  const whole_packages = Math.floor(packaged_volume_gal / package_gal);
  const saleable_gal = whole_packages * package_gal;
  const remainder_gal = packaged_volume_gal - saleable_gal;
  const process_loss_gal = brite_volume_gal - packaged_volume_gal;
  const total_loss_gal = brite_volume_gal - saleable_gal;
  const small_packages_from_remainder = Math.floor(remainder_gal / smallest_package_gal);
  return {
    brite_volume_gal, package_gal, smallest_package_gal,
    after_transfer_gal, packaged_volume_gal,
    whole_packages, saleable_gal, remainder_gal,
    process_loss_gal, total_loss_gal,
    total_loss_pct: 100 * total_loss_gal / brite_volume_gal,
    remainder_share_of_loss_pct: total_loss_gal > 0 ? 100 * remainder_gal / total_loss_gal : 0,
    remainder_package_fraction: remainder_gal / package_gal,
    small_packages_from_remainder,
    remainder_short_of_smallest_gal: Math.max(0, smallest_package_gal - remainder_gal),
    batch_revenue: whole_packages * revenue_per_package,
    process_loss_value: process_loss_gal / package_gal * revenue_per_package,
    remainder_value: remainder_gal / package_gal * revenue_per_package,
    note: "The percentage losses are process and the remainder is arithmetic: finished, taxed, saleable beer poured down a drain because packages come in fixed sizes. A mixed fleet usually recovers most of a remainder, but the loss depends entirely on where the volume happens to fall against the sizes available -- remainders do not scale and they do not average, so a brewery tracking remainder as a percentage across batches learns nothing. The process losses need shorter lines or a better filler; the remainder needs only a batch size that divides better into the packages the brewery owns. That is why yield is tracked in whole packages rather than percentages: the percentage measures the process, and the package count measures what was sold.",
  };
}

const packagingExample = { brite_volume_gal: 310, transfer_loss_pct: 2, fill_loss_pct: 1.5, package_gal: 15.5, smallest_package_gal: 5.16, revenue_per_package: 175 };
BREWING_RENDERERS["packaging-yield-loss"] = _simpleRenderer({
  citation: "Citation: yield bookkeeping -- the volume after transfer and fill losses, divided into whole packages (a half barrel is 15.5 gal and a sixth barrel 5.16 gal), with the remainder the volume left after the last whole package. The brewery's own packaging records govern.",
  example: packagingExample,
  fields: [
    { key: "brite_volume_gal", label: "Brite tank volume (gal)" },
    { key: "transfer_loss_pct", label: "Transfer loss (%)" },
    { key: "fill_loss_pct", label: "Fill loss (%)" },
    { key: "package_gal", label: "Main package size (gal)" },
    { key: "smallest_package_gal", label: "Smallest package owned (gal)" },
    { key: "revenue_per_package", label: "Revenue per main package ($)" },
  ],
  outputs: [
    { key: "whole_packages", id: "pyl-count", label: "Whole packages", value: (r) => fmt(r.whole_packages, 0) + " at " + fmt(r.package_gal, 1) + " gal, " + fmt(r.saleable_gal, 1) + " gal saleable" },
    { key: "total_loss_gal", id: "pyl-loss", label: "Total loss", unit: "gal", value: (r) => fmt(r.total_loss_gal, 2) + " gal, " + fmt(r.total_loss_pct, 1) + "% of the batch" },
    { key: "remainder_gal", id: "pyl-rem", label: "The remainder nobody logs", unit: "gal", value: (r) => fmt(r.remainder_gal, 2) + " gal -- " + fmt(r.remainder_share_of_loss_pct, 0) + "% of the loss, " + fmt(r.remainder_package_fraction, 2) + " of a package" },
    { key: "small_packages_from_remainder", id: "pyl-small", label: "Into the smallest package", value: (r) => (r.small_packages_from_remainder > 0 ? fmt(r.small_packages_from_remainder, 0) + " recovered" : "none -- " + fmt(r.remainder_short_of_smallest_gal, 2) + " gal short of the smallest package") },
    { key: "batch_revenue", id: "pyl-rev", label: "Batch value", value: (r) => "$" + fmt(r.batch_revenue, 0) + "; process losses cost $" + fmt(r.process_loss_value, 0) + " and the remainder $" + fmt(r.remainder_value, 0) },
    { key: "note", id: "pyl-note", label: "Use", value: (r) => r.note },
  ],
  compute: computePackagingYieldLoss,
});

// =========== spec-v1787: mash tun grain bed depth and capacity ===========

// The depth limit caps the brewhouse, and it is a vessel decision made when the
// tun was bought. Diameter is the lever and it is quadratic.

// dims: in { tun_diameter_ft: L, grain_weight_lb: M, mash_thickness_qt_per_lb: L^3 M^-1, grain_displacement_gal_per_lb: L^3 M^-1, max_bed_depth_in: L, batch_volume_gal: L^3, efficiency_pct: dimensionless, extract_potential_ppg: L^3 M^-1, alternative_diameter_ft: L } out: { bed_area_sqft: L^2, mash_volume_gal: L^3, bed_depth_in: L, max_grain_lb: M, max_og_points: dimensionless, alternative_bed_depth_in: L, alternative_max_grain_lb: M }
export function computeMashTunGrainBed({ tun_diameter_ft = 0, grain_weight_lb = 0, mash_thickness_qt_per_lb = 0, grain_displacement_gal_per_lb = 0, max_bed_depth_in = 0, batch_volume_gal = 0, efficiency_pct = 0, extract_potential_ppg = 0, alternative_diameter_ft = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  // An efficiency is a percent; 0 < value < 1 is a fraction typed into a percent field (added 2026-09-26).
  if (["efficiency_pct"].some((k) => { const v = Number(arguments[0]?.[k]); return v > 0 && v < 1; })) return { error: "Enter efficiencies as a percent (85 for 85%), not a fraction." };
  if (!(tun_diameter_ft > 0) || !(alternative_diameter_ft > 0)) return { error: "Tun diameters must be positive." };
  if (tun_diameter_ft > 30 || alternative_diameter_ft > 30) return { error: "Enter the tun diameter in feet (a 10 bbl tun is about 5 ft), not inches." };
  if (!(grain_weight_lb > 0)) return { error: "Grain weight must be positive." };
  if (!(mash_thickness_qt_per_lb > 0)) return { error: "Mash thickness must be positive." };
  if (!(grain_displacement_gal_per_lb >= 0)) return { error: "Grain displacement cannot be negative." };
  if (!(max_bed_depth_in > 0)) return { error: "The maximum working bed depth must be positive." };
  if (!(batch_volume_gal > 0)) return { error: "The batch volume must be positive." };
  if (!(efficiency_pct > 0 && efficiency_pct <= 100)) return { error: "Efficiency must be above 0 and at most 100%." };
  if (!(extract_potential_ppg > 0)) return { error: "The extract potential must be positive." };
  const mash_gal_per_lb = mash_thickness_qt_per_lb / QT_PER_GAL + grain_displacement_gal_per_lb;
  const areaFor = (d) => Math.PI * d * d / 4;
  const depthIn = (area_sqft) => grain_weight_lb * mash_gal_per_lb / GAL_PER_FT3 / area_sqft * IN_PER_FT;
  const maxGrainFor = (area_sqft) => area_sqft * (max_bed_depth_in / IN_PER_FT) * GAL_PER_FT3 / mash_gal_per_lb;
  const bed_area_sqft = areaFor(tun_diameter_ft);
  const mash_volume_gal = grain_weight_lb * mash_gal_per_lb;
  const bed_depth_in = depthIn(bed_area_sqft);
  const max_grain_lb = maxGrainFor(bed_area_sqft);
  const max_og_points = max_grain_lb * extract_potential_ppg * (efficiency_pct / 100) / batch_volume_gal;
  const alternative_area_sqft = areaFor(alternative_diameter_ft);
  const alternative_max_grain_lb = maxGrainFor(alternative_area_sqft);
  return {
    tun_diameter_ft, alternative_diameter_ft, max_bed_depth_in,
    bed_area_sqft, mash_volume_gal,
    mash_volume_ft3: mash_volume_gal / GAL_PER_FT3,
    bed_depth_in,
    max_grain_lb, max_og_points,
    max_og: 1 + max_og_points / 1000,
    alternative_area_sqft,
    alternative_bed_depth_in: depthIn(alternative_area_sqft),
    alternative_max_grain_lb,
    diameter_increase_pct: 100 * (alternative_diameter_ft - tun_diameter_ft) / tun_diameter_ft,
    capacity_increase_pct: 100 * (alternative_max_grain_lb - max_grain_lb) / max_grain_lb,
    note: "The bed-depth limit is what caps the brewhouse, and the strongest single-mash beer is not a recipe decision or an efficiency decision -- it is a vessel decision made when the tun was bought; the ways past it are a partigyle, a second mash into the same kettle, or kettle sugar. Too shallow a bed channels and too deep a bed sticks. Diameter is the lever and it is QUADRATIC: area goes as the square of diameter, so a modestly wider tun takes a much larger grain bill at the same depth -- and it is the one dimension that cannot be changed afterwards. The lauter tun manufacturer's rated bed depth governs.",
  };
}

const tunExample = { tun_diameter_ft: 6, grain_weight_lb: 542, mash_thickness_qt_per_lb: 1.25, grain_displacement_gal_per_lb: 0.08, max_bed_depth_in: 18, batch_volume_gal: 310, efficiency_pct: 78, extract_potential_ppg: 37, alternative_diameter_ft: 8 };
BREWING_RENDERERS["mash-tun-grain-bed"] = _simpleRenderer({
  citation: "Citation: geometry -- mash volume = grain x (thickness / 4 + grain displacement, about 0.08 gal per lb); bed depth = mash volume / tun cross-section; the maximum grain bill fills the tun to its working depth limit, commonly 12 to 18 in. The lauter tun manufacturer's rated bed depth governs.",
  example: tunExample,
  fields: [
    { key: "tun_diameter_ft", label: "Tun diameter (ft)" },
    { key: "grain_weight_lb", label: "Grain weight (lb)" },
    { key: "mash_thickness_qt_per_lb", label: "Mash thickness (qt per lb)" },
    { key: "grain_displacement_gal_per_lb", label: "Grain displacement (gal per lb)" },
    { key: "max_bed_depth_in", label: "Maximum working bed depth (in)" },
    { key: "batch_volume_gal", label: "Batch volume (gal)" },
    { key: "efficiency_pct", label: "Brewhouse efficiency (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "extract_potential_ppg", label: "Extract potential (points per lb per gal)" },
    { key: "alternative_diameter_ft", label: "Wider tun to compare (ft)" },
  ],
  outputs: [
    { key: "bed_depth_in", id: "mtg-depth", label: "Grain bed depth", unit: "in", value: (r) => fmt(r.bed_depth_in, 1) + " in over " + fmt(r.bed_area_sqft, 2) + " sq ft" },
    { key: "mash_volume_gal", id: "mtg-vol", label: "Mash volume", unit: "gal", value: (r) => fmt(r.mash_volume_gal, 1) + " gal (" + fmt(r.mash_volume_ft3, 2) + " cu ft)" },
    { key: "max_grain_lb", id: "mtg-max", label: "Most grain the tun will lauter", unit: "lb", value: (r) => fmt(r.max_grain_lb, 0) + " lb at " + fmt(r.max_bed_depth_in, 0) + " in" },
    { key: "max_og_points", id: "mtg-og", label: "Strongest beer in one mash", value: (r) => "OG " + fmt(r.max_og, 3) + " -- a vessel decision, not a recipe one" },
    { key: "alternative_bed_depth_in", id: "mtg-alt", label: "In the wider tun", value: (r) => fmt(r.alternative_bed_depth_in, 1) + " in deep, and it takes " + fmt(r.alternative_max_grain_lb, 0) + " lb -- " + fmt(r.capacity_increase_pct, 0) + "% more from a " + fmt(r.diameter_increase_pct, 0) + "% wider tun" },
    { key: "note", id: "mtg-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeMashTunGrainBed,
});

// ================= spec-v1788: dry-hop beer loss =================

// Absorption is linear in hop weight, so doubling the rate doubles the loss
// exactly -- and the beer lost is the most expensive in the brewery, carrying
// the whole brew day and lost in the last operation before packaging.

// dims: in { batch_volume_gal: L^3, dry_hop_lb_per_bbl: M L^-3, absorption_gal_per_lb: L^3 M^-1, package_gal: L^3, revenue_per_package: dimensionless, heavy_dry_hop_lb_per_bbl: M L^-3 } out: { hop_weight_lb: M, absorbed_gal: L^3, loss_pct: dimensionless, heavy_absorbed_gal: L^3, heavy_packages_lost: dimensionless }
export function computeDryHopBeerLoss({ batch_volume_gal = 0, dry_hop_lb_per_bbl = 0, absorption_gal_per_lb = 0, package_gal = 0, revenue_per_package = 0, heavy_dry_hop_lb_per_bbl = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(batch_volume_gal > 0)) return { error: "The batch volume must be positive." };
  if (!(dry_hop_lb_per_bbl >= 0) || !(heavy_dry_hop_lb_per_bbl >= 0)) return { error: "Dry-hop rates cannot be negative." };
  if (!(absorption_gal_per_lb >= 0)) return { error: "Hop absorption cannot be negative." };
  if (!(package_gal > 0)) return { error: "The package size must be positive." };
  if (!(revenue_per_package >= 0)) return { error: "Revenue per package cannot be negative." };
  const barrels = batch_volume_gal / 31;
  const lossFor = (rate) => {
    const hop_weight_lb = rate * barrels;
    const absorbed_gal = hop_weight_lb * absorption_gal_per_lb;
    return { hop_weight_lb, absorbed_gal, packages_lost: absorbed_gal / package_gal };
  };
  const base = lossFor(dry_hop_lb_per_bbl);
  const heavy = lossFor(heavy_dry_hop_lb_per_bbl);
  if (!(heavy.absorbed_gal < batch_volume_gal) || !(base.absorbed_gal < batch_volume_gal)) return { error: "The hops would absorb the whole batch at that rate." };
  return {
    batch_volume_gal, barrels, dry_hop_lb_per_bbl, heavy_dry_hop_lb_per_bbl,
    hop_weight_lb: base.hop_weight_lb,
    absorbed_gal: base.absorbed_gal,
    loss_pct: 100 * base.absorbed_gal / batch_volume_gal,
    packages_lost: base.packages_lost,
    heavy_hop_weight_lb: heavy.hop_weight_lb,
    heavy_absorbed_gal: heavy.absorbed_gal,
    heavy_loss_pct: 100 * heavy.absorbed_gal / batch_volume_gal,
    heavy_packages_lost: heavy.packages_lost,
    heavy_value_lost: heavy.packages_lost * revenue_per_package,
    loss_gap_points: 100 * (heavy.absorbed_gal - base.absorbed_gal) / batch_volume_gal,
    note: "Absorption is linear in hop weight, so doubling the rate doubles the loss exactly. The beer lost is the most expensive in the brewery: it carried the whole grain bill, the brew day, the fermentation, and the tank time, and it was lost in the last operation before packaging -- so a brewery quoting one yield figure across its portfolio understates the cost of its most heavily hopped beer. The same addition brings hop creep: enzymes restart fermentation on dextrins the yeast could not reach, so a beer at a stable gravity keeps attenuating, raising alcohol and carbonation, and in package a container can exceed its rating. The remedy is time and temperature in tank with gravity confirmed stable before packaging, not a calculation. The brewery's own measured absorption governs.",
  };
}

const dryHopExample = { batch_volume_gal: 310, dry_hop_lb_per_bbl: 2, absorption_gal_per_lb: 1.0, package_gal: 15.5, revenue_per_package: 175, heavy_dry_hop_lb_per_bbl: 4 };
BREWING_RENDERERS["dry-hop-beer-loss"] = _simpleRenderer({
  citation: "Citation: absorption bookkeeping -- hop weight = dry-hop rate x barrels (31 gal each), beer absorbed = hop weight x absorption per pound (commonly about 1 gal per lb for pellets), expressed as packages lost. The brewery's own measured absorption governs, and hop creep is controlled by time and temperature with gravity confirmed stable before packaging.",
  example: dryHopExample,
  fields: [
    { key: "batch_volume_gal", label: "Batch volume (gal)" },
    { key: "dry_hop_lb_per_bbl", label: "Dry-hop rate (lb per barrel)" },
    { key: "absorption_gal_per_lb", label: "Hop absorption (gal per lb)" },
    { key: "package_gal", label: "Package size (gal)" },
    { key: "revenue_per_package", label: "Revenue per package ($)" },
    { key: "heavy_dry_hop_lb_per_bbl", label: "Heavier rate to compare (lb per barrel)" },
  ],
  outputs: [
    { key: "absorbed_gal", id: "dhb-abs", label: "Beer absorbed", unit: "gal", value: (r) => fmt(r.absorbed_gal, 1) + " gal from " + fmt(r.hop_weight_lb, 1) + " lb of hops -- " + fmt(r.loss_pct, 1) + "% of the batch" },
    { key: "packages_lost", id: "dhb-pkg", label: "In packages", value: (r) => fmt(r.packages_lost, 2) + " packages" },
    { key: "heavy_absorbed_gal", id: "dhb-heavy", label: "At the heavier rate", unit: "gal", value: (r) => fmt(r.heavy_absorbed_gal, 1) + " gal, " + fmt(r.heavy_loss_pct, 1) + "% of the batch -- exactly proportional" },
    { key: "heavy_value_lost", id: "dhb-value", label: "What it costs", value: (r) => fmt(r.heavy_packages_lost, 2) + " packages, $" + fmt(r.heavy_value_lost, 0) + " -- before the cost of the hops" },
    { key: "loss_gap_points", id: "dhb-gap", label: "A single yield figure understates it by", value: (r) => fmt(r.loss_gap_points, 1) + " percentage points" },
    { key: "note", id: "dhb-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeDryHopBeerLoss,
});
