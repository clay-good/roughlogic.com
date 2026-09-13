// Group A: fiber-optic outside-plant bench.
// spec-v1837..v1844 (scope-trade-expansion-3) cover OTDR distance, chromatic
// dispersion, restoration slack, PON loss, strand-count planning, optical
// return loss, cable jetting, and fusion-splice mismatch. These belong in a
// dedicated lazy module rather than calc-lowvoltage.js: they are outside-plant
// transmission and construction calculations, not inside-plant cabling.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeText,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

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

function _simpleRenderer(spec) {
  const render = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    const fields = {};
    for (const f of spec.fields) {
      const field = f.kind === "text"
        ? makeText(f.label, f.id || f.key, f.attrs || {})
        : makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) field.input.value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function update() {
      const params = {};
      for (const f of spec.fields) {
        params[f.key] = f.kind === "text"
          ? fields[f.key].input.value
          : Number(fields[f.key].input.value) || 0;
      }
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
      options: null, default: f.default ?? null, attrs: f.attrs ?? null,
    })),
    outputs: spec.outputs.map((o) => ({
      key: o.key, label: o.label, unit: o.unit ?? null, format: o.value,
    })),
    citation: spec.citation,
    scope: spec.scope ?? null,
  };
  return render;
}

export const TELECOM_RENDERERS = {};

const SPEED_OF_LIGHT_M_S = 299792458;
const FT_PER_M = 3.280839895013123;

// ===================== spec-v1837: OTDR event distance =====================

// dims: in { round_trip_time_us: T, entered_group_index: dimensionless, true_group_index: dimensionless, excess_fiber_pct: dimensionless, slack_per_splice_ft: L, splice_points: dimensionless, comparison_span_km: L } out: { entered_distance_m: L, corrected_distance_m: L, index_error_m: L, cable_distance_m: L, route_distance_m: L }
export function computeOtdrEventDistance({ round_trip_time_us = 0, entered_group_index = 0, true_group_index = 0, excess_fiber_pct = 0, slack_per_splice_ft = 0, splice_points = 0, comparison_span_km = 40 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(round_trip_time_us > 0)) return { error: "Round-trip time must be positive (microseconds)." };
  if (!(entered_group_index > 1) || !(true_group_index > 1)) return { error: "Both group indices must be greater than 1." };
  if (!(excess_fiber_pct >= 0 && excess_fiber_pct < 100)) return { error: "Excess fiber length must be from 0 up to 100 percent." };
  if (!(slack_per_splice_ft >= 0) || !(splice_points >= 0) || !(comparison_span_km > 0)) return { error: "Slack and splice count cannot be negative, and comparison span must be positive." };
  const entered_distance_m = SPEED_OF_LIGHT_M_S * round_trip_time_us * 1e-6 / (2 * entered_group_index);
  const corrected_distance_m = SPEED_OF_LIGHT_M_S * round_trip_time_us * 1e-6 / (2 * true_group_index);
  const index_error_m = entered_distance_m - corrected_distance_m;
  const index_error_pct = 100 * index_error_m / entered_distance_m;
  const comparison_error_m = comparison_span_km * 1000 * (1 - entered_group_index / true_group_index);
  const cable_distance_m = corrected_distance_m / (1 + excess_fiber_pct / 100);
  const stored_slack_m = splice_points * slack_per_splice_ft / FT_PER_M;
  const route_distance_m = cable_distance_m - stored_slack_m;
  if (!(route_distance_m >= 0)) return { error: "Stored slack cannot exceed the corrected cable distance." };
  return {
    entered_distance_m, corrected_distance_m, entered_distance_ft: entered_distance_m * FT_PER_M,
    corrected_distance_ft: corrected_distance_m * FT_PER_M, index_error_m,
    index_error_ft: index_error_m * FT_PER_M, index_error_pct,
    comparison_error_m, comparison_error_ft: comparison_error_m * FT_PER_M,
    cable_distance_m, route_distance_m, route_distance_ft: route_distance_m * FT_PER_M,
    fiber_to_route_delta_m: corrected_distance_m - route_distance_m,
    note: "An OTDR reports fiber length, not ground distance. Correct the group index first, then remove the cable's excess fiber and every recorded storage loop. The cable manufacturer's group-index and excess-length data, the route as-built, and the applicable test standard govern.",
  };
}

const otdrExample = { round_trip_time_us: 50, entered_group_index: 1.4682, true_group_index: 1.47, excess_fiber_pct: 1, slack_per_splice_ft: 49.87, splice_points: 5, comparison_span_km: 40 };
TELECOM_RENDERERS["otdr-event-distance"] = _simpleRenderer({
  citation: "Citation: OTDR time of flight d = c t / (2 n), using the fiber's group index at the test wavelength. Loose-tube excess fiber and stored slack are entered from the cable datasheet and route as-built; those records and the applicable test standard govern.",
  example: otdrExample,
  fields: [
    { key: "round_trip_time_us", label: "Pulse round-trip time (microseconds)" },
    { key: "entered_group_index", label: "Group index entered in the OTDR" },
    { key: "true_group_index", label: "Cable's true group index" },
    { key: "excess_fiber_pct", label: "Excess fiber length (%)", default: 1 },
    { key: "slack_per_splice_ft", label: "Stored slack per splice point (ft)", default: 50 },
    { key: "splice_points", label: "Splice points", attrs: { step: "1", min: "0" } },
    { key: "comparison_span_km", label: "Long-span comparison (km)", default: 40 },
  ],
  outputs: [
    { key: "entered_distance_m", id: "otdr-entered", label: "Distance at entered index", unit: "m", value: (r) => fmt(r.entered_distance_m, 1) + " m (" + fmt(r.entered_distance_ft, 0) + " ft)" },
    { key: "corrected_distance_m", id: "otdr-corrected", label: "Distance at true index", unit: "m", value: (r) => fmt(r.corrected_distance_m, 1) + " m (" + fmt(r.corrected_distance_ft, 0) + " ft)" },
    { key: "index_error_m", id: "otdr-error", label: "Index-setting displacement", unit: "m", value: (r) => fmt(r.index_error_m, 1) + " m (" + fmt(r.index_error_ft, 0) + " ft, " + fmt(r.index_error_pct, 3) + " %)" },
    { key: "comparison_error_m", id: "otdr-long", label: "Displacement on comparison span", unit: "m", value: (r) => fmt(r.comparison_error_m, 1) + " m (" + fmt(r.comparison_error_ft, 0) + " ft)" },
    { key: "cable_distance_m", id: "otdr-cable", label: "Cable length after excess fiber", unit: "m", value: (r) => fmt(r.cable_distance_m, 1) + " m" },
    { key: "route_distance_m", id: "otdr-route", label: "Estimated ground-route distance", unit: "m", value: (r) => fmt(r.route_distance_m, 1) + " m (" + fmt(r.route_distance_ft, 0) + " ft)" },
    { key: "note", id: "otdr-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeOtdrEventDistance,
});

// ===================== spec-v1838: chromatic dispersion =====================

// dims: in { dispersion_ps_nm_km: T L^-2, span_km: L, bit_rate_gbps: T^-1, spectral_width_nm: L, lower_bit_rate_gbps: T^-1, higher_bit_rate_gbps: T^-1 } out: { accumulated_dispersion_ps_nm: T L^-1, pulse_spread_ps: T, bit_period_ps: T, reach_km: L }
export function computeChromaticDispersionReach({ dispersion_ps_nm_km = 0, span_km = 0, bit_rate_gbps = 0, spectral_width_nm = 0, lower_bit_rate_gbps = 2.5, higher_bit_rate_gbps = 40 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(dispersion_ps_nm_km > 0) || !(span_km > 0) || !(bit_rate_gbps > 0)) return { error: "Dispersion, span, and bit rate must be positive." };
  if (!(spectral_width_nm >= 0) || !(lower_bit_rate_gbps > 0) || !(higher_bit_rate_gbps > 0)) return { error: "Spectral width cannot be negative, and comparison rates must be positive." };
  const reachAt = (rate) => 100000 / (dispersion_ps_nm_km * rate * rate);
  const accumulated_dispersion_ps_nm = dispersion_ps_nm_km * span_km;
  const pulse_spread_ps = accumulated_dispersion_ps_nm * spectral_width_nm;
  const bit_period_ps = 1000 / bit_rate_gbps;
  const reach_km = reachAt(bit_rate_gbps);
  const lower_rate_reach_km = reachAt(lower_bit_rate_gbps);
  const higher_rate_reach_km = reachAt(higher_bit_rate_gbps);
  const within_limit = span_km <= reach_km;
  return {
    accumulated_dispersion_ps_nm, pulse_spread_ps, bit_period_ps, reach_km,
    lower_rate_reach_km, higher_rate_reach_km, within_limit,
    over_limit_pct: within_limit ? 0 : 100 * (span_km - reach_km) / reach_km,
    note: "Dispersion and attenuation are separate limits. This NRZ reach relation is a planning rule, not a transceiver guarantee; the equipment's dispersion tolerance and the cable data at the operating wavelength govern.",
  };
}

const dispersionExample = { dispersion_ps_nm_km: 17, span_km: 80, bit_rate_gbps: 10, spectral_width_nm: 0.1, lower_bit_rate_gbps: 2.5, higher_bit_rate_gbps: 40 };
TELECOM_RENDERERS["chromatic-dispersion-reach"] = _simpleRenderer({
  citation: "Citation: accumulated chromatic dispersion D x L, pulse spread D x L x spectral width, and the externally modulated NRZ planning rule Lmax approximately 100,000 / (D x B^2), with D in ps/nm/km and B in Gb/s. Equipment and cable manufacturer data govern.",
  example: dispersionExample,
  fields: [
    { key: "dispersion_ps_nm_km", label: "Dispersion coefficient (ps/nm/km)" },
    { key: "span_km", label: "Fiber span (km)" },
    { key: "bit_rate_gbps", label: "Bit rate (Gb/s)" },
    { key: "spectral_width_nm", label: "Source spectral width (nm)", default: 0.1 },
    { key: "lower_bit_rate_gbps", label: "Lower comparison rate (Gb/s)", default: 2.5 },
    { key: "higher_bit_rate_gbps", label: "Higher comparison rate (Gb/s)", default: 40 },
  ],
  outputs: [
    { key: "accumulated_dispersion_ps_nm", id: "cdr-acc", label: "Accumulated dispersion", unit: "ps/nm", value: (r) => fmt(r.accumulated_dispersion_ps_nm, 1) + " ps/nm" },
    { key: "pulse_spread_ps", id: "cdr-spread", label: "Pulse spread", unit: "ps", value: (r) => fmt(r.pulse_spread_ps, 1) + " ps" },
    { key: "bit_period_ps", id: "cdr-period", label: "Bit period", unit: "ps", value: (r) => fmt(r.bit_period_ps, 1) + " ps" },
    { key: "reach_km", id: "cdr-reach", label: "Dispersion-limited reach", unit: "km", value: (r) => fmt(r.reach_km, 1) + " km" },
    { key: "lower_rate_reach_km", id: "cdr-low", label: "Reach at lower rate", unit: "km", value: (r) => fmt(r.lower_rate_reach_km, 1) + " km" },
    { key: "higher_rate_reach_km", id: "cdr-high", label: "Reach at higher rate", unit: "km", value: (r) => fmt(r.higher_rate_reach_km, 1) + " km" },
    { key: "within_limit", id: "cdr-status", label: "Span status", value: (r) => r.within_limit ? "WITHIN the planning limit" : "OVER the planning limit by " + fmt(r.over_limit_pct, 1) + " %" },
    { key: "note", id: "cdr-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeChromaticDispersionReach,
});

// ===================== spec-v1839: outside-plant slack =====================

// dims: in { route_length_ft: L, usable_reel_length_ft: L, slack_per_splice_ft: L, terminal_slack_ft: L, waste_pct: dimensionless, restoration_slack_each_side_ft: L } out: { splice_points: dimensionless, total_slack_ft: L, cable_to_order_ft: L }
export function computeFiberSlackStorage({ route_length_ft = 0, usable_reel_length_ft = 0, slack_per_splice_ft = 0, terminal_slack_ft = 0, waste_pct = 0, restoration_slack_each_side_ft = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(route_length_ft > 0) || !(usable_reel_length_ft > 0) || usable_reel_length_ft > route_length_ft) return { error: "Route and reel lengths must be positive, and usable reel length cannot exceed the route." };
  if (!(slack_per_splice_ft > 0) || !(terminal_slack_ft > 0) || !(restoration_slack_each_side_ft > 0)) return { error: "Splice, terminal, and restoration slack allowances must be positive." };
  if (!(waste_pct >= 0 && waste_pct < 100)) return { error: "Waste and routing allowance must be from 0 up to 100 percent." };
  const splice_points = Math.max(0, Math.ceil(route_length_ft / usable_reel_length_ft) - 1);
  const splice_slack_ft = splice_points * slack_per_splice_ft;
  const terminal_slack_total_ft = 2 * terminal_slack_ft;
  const total_slack_ft = splice_slack_ft + terminal_slack_total_ft;
  const cable_before_allowance_ft = route_length_ft + total_slack_ft;
  const cable_to_order_ft = cable_before_allowance_ft * (1 + waste_pct / 100);
  const required_at_cut_ft = 2 * restoration_slack_each_side_ft;
  const shortfall_per_splice_ft = Math.max(0, required_at_cut_ft - slack_per_splice_ft);
  const additional_restoration_slack_ft = splice_points * shortfall_per_splice_ft;
  return {
    splice_points, splice_slack_ft, terminal_slack_total_ft, total_slack_ft,
    slack_pct_of_route: 100 * total_slack_ft / route_length_ft,
    cable_before_allowance_ft, cable_to_order_ft, required_at_cut_ft,
    shortfall_per_splice_ft, additional_restoration_slack_ft,
    restoration_ready: shortfall_per_splice_ft === 0,
    note: "Stored slack is a restoration asset. A route without enough cable on both sides of a cut turns one splice into two enclosures and a replacement section. Owner construction standards, storage space, handling limits, and the route as-built govern.",
  };
}

const slackExample = { route_length_ft: 52800, usable_reel_length_ft: 12000, slack_per_splice_ft: 100, terminal_slack_ft: 100, waste_pct: 5, restoration_slack_each_side_ft: 60 };
TELECOM_RENDERERS["fiber-slack-storage"] = _simpleRenderer({
  citation: "Citation: outside-plant quantity takeoff: reel changes establish splice points; route length plus splice and terminal storage loops, then the entered routing allowance, establishes cable to order. The owner's construction standard, cable handling limits, and route as-built govern.",
  example: slackExample,
  fields: [
    { key: "route_length_ft", label: "Route length (ft)" },
    { key: "usable_reel_length_ft", label: "Usable reel length (ft)" },
    { key: "slack_per_splice_ft", label: "Total slack per splice point (ft)" },
    { key: "terminal_slack_ft", label: "Slack at each terminal (ft)" },
    { key: "waste_pct", label: "Waste and routing allowance (%)", default: 5 },
    { key: "restoration_slack_each_side_ft", label: "Restoration slack needed on each side (ft)", default: 60 },
  ],
  outputs: [
    { key: "splice_points", id: "fss-splices", label: "Reel-change splice points", value: (r) => String(r.splice_points) },
    { key: "total_slack_ft", id: "fss-slack", label: "Total stored slack", unit: "ft", value: (r) => fmt(r.total_slack_ft, 0) + " ft (" + fmt(r.slack_pct_of_route, 2) + " % of route)" },
    { key: "cable_to_order_ft", id: "fss-order", label: "Cable to order", unit: "ft", value: (r) => fmt(r.cable_to_order_ft, 0) + " ft" },
    { key: "required_at_cut_ft", id: "fss-cut", label: "Slack required at a cut", unit: "ft", value: (r) => fmt(r.required_at_cut_ft, 0) + " ft" },
    { key: "shortfall_per_splice_ft", id: "fss-short", label: "Per-splice restoration margin", unit: "ft", value: (r) => r.restoration_ready ? "READY" : fmt(r.shortfall_per_splice_ft, 0) + " ft short" },
    { key: "additional_restoration_slack_ft", id: "fss-add", label: "Additional route slack for restoration", unit: "ft", value: (r) => fmt(r.additional_restoration_slack_ft, 0) + " ft" },
    { key: "note", id: "fss-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeFiberSlackStorage,
});

// ===================== spec-v1840: PON split loss =====================

// dims: in { class_budget_db: dimensionless, split_ratio: dimensionless, splitter_excess_db: dimensionless, connector_count: dimensionless, connector_loss_db: dimensionless, splice_count: dimensionless, splice_loss_db: dimensionless, attenuation_db_km: dimensionless, design_margin_db: dimensionless, alternative_split_ratio: dimensionless } out: { splitter_loss_db: dimensionless, remaining_fiber_budget_db: dimensionless, reach_km: L }
export function computePonSplitLossBudget({ class_budget_db = 0, split_ratio = 0, splitter_excess_db = 0, connector_count = 0, connector_loss_db = 0, splice_count = 0, splice_loss_db = 0, attenuation_db_km = 0, design_margin_db = 0, alternative_split_ratio = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(class_budget_db > 0) || !(split_ratio > 0) || !(attenuation_db_km > 0)) return { error: "Class budget, split ratio, and fiber attenuation must be positive." };
  if (![splitter_excess_db, connector_count, connector_loss_db, splice_count, splice_loss_db, design_margin_db].every((v) => v >= 0)) return { error: "Component counts and losses cannot be negative." };
  const solve = (ratio) => {
    const ideal_splitter_loss_db = 10 * Math.log10(ratio);
    const splitter_loss_db = ideal_splitter_loss_db + splitter_excess_db;
    const connector_total_db = connector_count * connector_loss_db;
    const splice_total_db = splice_count * splice_loss_db;
    const remaining_fiber_budget_db = class_budget_db - splitter_loss_db - connector_total_db - splice_total_db - design_margin_db;
    return { ideal_splitter_loss_db, splitter_loss_db, connector_total_db, splice_total_db, remaining_fiber_budget_db, reach_km: remaining_fiber_budget_db / attenuation_db_km };
  };
  const base = solve(split_ratio);
  if (!(base.remaining_fiber_budget_db > 0)) return { error: "Splitter, components, and margin consume the class budget before any fiber is run." };
  const alt = alternative_split_ratio > 0 ? solve(alternative_split_ratio) : null;
  return {
    ideal_splitter_loss_db: base.ideal_splitter_loss_db,
    splitter_loss_db: base.splitter_loss_db,
    connector_total_db: base.connector_total_db,
    splice_total_db: base.splice_total_db,
    remaining_fiber_budget_db: base.remaining_fiber_budget_db,
    reach_km: base.reach_km,
    splitter_share_pct: 100 * base.splitter_loss_db / class_budget_db,
    alternative_splitter_loss_db: alt?.splitter_loss_db ?? null,
    alternative_remaining_fiber_budget_db: alt?.remaining_fiber_budget_db ?? null,
    alternative_reach_km: alt?.remaining_fiber_budget_db > 0 ? alt.reach_km : null,
    split_loss_delta_db: alt ? alt.splitter_loss_db - base.splitter_loss_db : null,
    note: "Every doubling of split ratio costs 3.01 dB before fiber or connectors are counted. Close the budget at the worse operating wavelength and reserve design margin before calculating reach; the PON standard and component datasheets govern.",
  };
}

const ponExample = { class_budget_db: 28, split_ratio: 32, splitter_excess_db: 2.5, connector_count: 4, connector_loss_db: 0.5, splice_count: 6, splice_loss_db: 0.1, attenuation_db_km: 0.35, design_margin_db: 0, alternative_split_ratio: 64 };
TELECOM_RENDERERS["pon-split-loss-budget"] = _simpleRenderer({
  citation: "Citation: ideal N-way splitter loss = 10 log10(N) dB; component losses and design margin subtract from the entered optical class budget, and remaining budget divided by worst-wavelength attenuation gives reach. The applicable PON standard and transceiver and splitter datasheets govern.",
  example: ponExample,
  fields: [
    { key: "class_budget_db", label: "Optical class budget (dB)" },
    { key: "split_ratio", label: "Split ratio (N for 1:N)" },
    { key: "splitter_excess_db", label: "Splitter excess loss (dB)", default: 2.5 },
    { key: "connector_count", label: "Mated connector pairs", attrs: { step: "1", min: "0" } },
    { key: "connector_loss_db", label: "Loss per connector pair (dB)", default: 0.5 },
    { key: "splice_count", label: "Fusion splices", attrs: { step: "1", min: "0" } },
    { key: "splice_loss_db", label: "Loss per splice (dB)", default: 0.1 },
    { key: "attenuation_db_km", label: "Worst-wavelength attenuation (dB/km)" },
    { key: "design_margin_db", label: "Reserved design margin (dB)", default: 0 },
    { key: "alternative_split_ratio", label: "Alternative split ratio (0 to skip)", default: 64 },
  ],
  outputs: [
    { key: "splitter_loss_db", id: "pon-split", label: "Splitter loss", unit: "dB", value: (r) => fmt(r.splitter_loss_db, 2) + " dB (" + fmt(r.ideal_splitter_loss_db, 2) + " ideal + excess)" },
    { key: "connector_total_db", id: "pon-connect", label: "Connector loss", unit: "dB", value: (r) => fmt(r.connector_total_db, 2) + " dB" },
    { key: "splice_total_db", id: "pon-splice", label: "Splice loss", unit: "dB", value: (r) => fmt(r.splice_total_db, 2) + " dB" },
    { key: "remaining_fiber_budget_db", id: "pon-left", label: "Budget left for fiber", unit: "dB", value: (r) => fmt(r.remaining_fiber_budget_db, 2) + " dB" },
    { key: "reach_km", id: "pon-reach", label: "Maximum reach", unit: "km", value: (r) => fmt(r.reach_km, 1) + " km" },
    { key: "splitter_share_pct", id: "pon-share", label: "Splitter share of class budget", unit: "%", value: (r) => fmt(r.splitter_share_pct, 1) + " %" },
    { key: "alternative_reach_km", id: "pon-alt", label: "Alternative split", unit: "km", value: (r) => r.alternative_reach_km === null ? "does not close or not entered" : fmt(r.alternative_splitter_loss_db, 2) + " dB splitter, " + fmt(r.alternative_reach_km, 1) + " km reach" },
    { key: "note", id: "pon-note", label: "Use", value: (r) => r.note },
  ],
  compute: computePonSplitLossBudget,
});

// ===================== spec-v1841: strand-count planning =====================

function _parseStandardCounts(value) {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(/[\s,;]+/);
  const values = raw.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(values)].sort((a, b) => a - b);
}

// dims: in { living_units: dimensionless, split_ratio: dimensionless, terminal_ports: dimensionless, spare_pct: dimensionless, route_length_ft: L, lower_material_cost_per_ft: dimensionless, selected_material_cost_per_ft: dimensionless, placement_cost_per_ft: dimensionless } out: { feeder_fibers_required: dimensionless, selected_standard_count: dimensionless, selected_installed_cost: dimensionless }
export function computeFiberStrandCountPlanning({ living_units = 0, split_ratio = 0, terminal_ports = 0, spare_pct = 0, standard_counts = "12,24,48,72,96,144,216,288,432", route_length_ft = 0, lower_material_cost_per_ft = 0, selected_material_cost_per_ft = 0, placement_cost_per_ft = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(living_units > 0) || !(split_ratio > 0) || !(terminal_ports > 0)) return { error: "Living units, split ratio, and terminal port count must be positive." };
  if (!(spare_pct >= 0) || !(route_length_ft > 0)) return { error: "Spare percentage cannot be negative, and route length must be positive." };
  if (![lower_material_cost_per_ft, selected_material_cost_per_ft, placement_cost_per_ft].every((v) => v >= 0)) return { error: "Entered costs cannot be negative." };
  const standards = _parseStandardCounts(standard_counts);
  if (standards.length === 0) return { error: "Enter at least one positive standard cable count." };
  const roundUp = (required) => standards.find((count) => count >= required) ?? null;
  const feeder_fibers_required = Math.ceil(living_units / split_ratio);
  const feeder_with_spare = Math.ceil(feeder_fibers_required * (1 + spare_pct / 100));
  const standard_without_spare = roundUp(feeder_fibers_required);
  const selected_standard_count = roundUp(feeder_with_spare);
  if (standard_without_spare === null || selected_standard_count === null) return { error: "The available standard cable counts do not reach the required fiber count." };
  const drop_terminals = Math.ceil(living_units / terminal_ports);
  const distribution_fibers_required = drop_terminals;
  const distribution_with_spare = Math.ceil(distribution_fibers_required * (1 + spare_pct / 100));
  const lower_installed_cost = route_length_ft * (lower_material_cost_per_ft + placement_cost_per_ft);
  const selected_installed_cost = route_length_ft * (selected_material_cost_per_ft + placement_cost_per_ft);
  const installed_cost_delta = selected_installed_cost - lower_installed_cost;
  return {
    feeder_fibers_required, feeder_with_spare, standard_without_spare,
    selected_standard_count, free_rounding_spares: standard_without_spare - feeder_fibers_required,
    drop_terminals, distribution_fibers_required, distribution_with_spare,
    lower_installed_cost, selected_installed_cost, installed_cost_delta,
    installed_cost_delta_pct: lower_installed_cost > 0 ? 100 * installed_cost_delta / lower_installed_cost : 0,
    placement_share_pct: lower_installed_cost > 0 ? 100 * route_length_ft * placement_cost_per_ft / lower_installed_cost : 0,
    note: "Size permanent cable for every premise passed, not the initial take rate. Subscriber take rate defers splitters and electronics; it does not make a second cable placement cheap. The route survey and operator construction standard govern.",
  };
}

const strandExample = { living_units: 2000, split_ratio: 32, terminal_ports: 8, spare_pct: 25, standard_counts: "12,24,48,72,96,144,216,288,432", route_length_ft: 52800, lower_material_cost_per_ft: 1.5, selected_material_cost_per_ft: 1.8, placement_cost_per_ft: 8 };
TELECOM_RENDERERS["fiber-strand-count-planning"] = _simpleRenderer({
  citation: "Citation: outside-plant fiber takeoff: feeder fibers = ceil(premises passed / split ratio), distribution fibers = ceil(premises passed / terminal ports), then the entered spare factor is rounded up to an available standard cable count. The route survey and operator construction standards govern.",
  example: strandExample,
  fields: [
    { key: "living_units", label: "Living units or businesses passed", attrs: { step: "1", min: "1" } },
    { key: "split_ratio", label: "PON split ratio (N for 1:N)" },
    { key: "terminal_ports", label: "Drop terminal ports", attrs: { step: "1", min: "1" } },
    { key: "spare_pct", label: "Design spare (%)", default: 25 },
    { key: "standard_counts", label: "Available standard fiber counts (comma separated)", kind: "text", default: "12,24,48,72,96,144,216,288,432" },
    { key: "route_length_ft", label: "Route length (ft)" },
    { key: "lower_material_cost_per_ft", label: "Lower-count cable cost ($/ft)" },
    { key: "selected_material_cost_per_ft", label: "Selected-count cable cost ($/ft)" },
    { key: "placement_cost_per_ft", label: "Placement cost ($/ft)" },
  ],
  outputs: [
    { key: "feeder_fibers_required", id: "fcp-feed", label: "Feeder fibers required", value: (r) => r.feeder_fibers_required + " raw; " + r.feeder_with_spare + " with spare" },
    { key: "selected_standard_count", id: "fcp-select", label: "Selected standard cable", value: (r) => r.selected_standard_count + " fibers" },
    { key: "standard_without_spare", id: "fcp-base", label: "Without design spare", value: (r) => r.standard_without_spare + " fibers (" + r.free_rounding_spares + " rounding spares)" },
    { key: "drop_terminals", id: "fcp-drop", label: "Distribution side", value: (r) => r.drop_terminals + " terminals; " + r.distribution_fibers_required + " fibers raw; " + r.distribution_with_spare + " with spare" },
    { key: "lower_installed_cost", id: "fcp-low", label: "Lower-count installed cost", unit: "$", value: (r) => "$" + fmt(r.lower_installed_cost, 0) },
    { key: "selected_installed_cost", id: "fcp-high", label: "Selected-count installed cost", unit: "$", value: (r) => "$" + fmt(r.selected_installed_cost, 0) },
    { key: "installed_cost_delta", id: "fcp-delta", label: "Increment for selected count", unit: "$", value: (r) => "$" + fmt(r.installed_cost_delta, 0) + " (" + fmt(r.installed_cost_delta_pct, 1) + " %)" },
    { key: "note", id: "fcp-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeFiberStrandCountPlanning,
});

// ===================== spec-v1842: optical return loss =====================

// dims: in { connector_count: dimensionless, connector_reflectance_db: dimensionless, unmated_end_count: dimensionless, fiber_index: dimensionless, required_orl_db: dimensionless, apc_reflectance_db: dimensionless } out: { fresnel_reflectance_pct: dimensionless, connector_only_orl_db: dimensionless, with_unmated_orl_db: dimensionless, apc_orl_db: dimensionless }
export function computeOpticalReturnLoss({ connector_count = 0, connector_reflectance_db = 0, unmated_end_count = 1, fiber_index = 0, required_orl_db = 0, apc_reflectance_db = -60 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(connector_count > 0) || !(connector_reflectance_db < 0) || !(apc_reflectance_db < 0)) return { error: "Connector count must be positive and reflectance values must be negative dB." };
  if (!(unmated_end_count >= 0) || !(fiber_index > 1) || !(required_orl_db > 0)) return { error: "Unmated-end count cannot be negative, fiber index must exceed 1, and required return loss must be positive." };
  const fresnel_linear = Math.pow((fiber_index - 1) / (fiber_index + 1), 2);
  const fresnel_reflectance_db = 10 * Math.log10(fresnel_linear);
  const connector_linear_total = connector_count * Math.pow(10, connector_reflectance_db / 10);
  const connector_only_orl_db = -10 * Math.log10(connector_linear_total);
  const with_unmated_linear = connector_linear_total + unmated_end_count * fresnel_linear;
  const with_unmated_orl_db = -10 * Math.log10(with_unmated_linear);
  const apc_orl_db = -10 * Math.log10(connector_count * Math.pow(10, apc_reflectance_db / 10));
  return {
    fresnel_reflectance_pct: 100 * fresnel_linear, fresnel_reflectance_db,
    connector_only_orl_db, with_unmated_orl_db, apc_orl_db,
    connector_margin_db: connector_only_orl_db - required_orl_db,
    unmated_margin_db: with_unmated_orl_db - required_orl_db,
    good_connector_share_with_unmated_pct: 100 * connector_linear_total / with_unmated_linear,
    connector_pass: connector_only_orl_db >= required_orl_db,
    unmated_pass: with_unmated_orl_db >= required_orl_db,
    note: "Reflected powers add in linear units, so the worst reflector dominates. An open glass end is a fault, not a slightly worse connector; transmitter requirements and measured event reflectance govern.",
  };
}

const orlExample = { connector_count: 4, connector_reflectance_db: -50, unmated_end_count: 1, fiber_index: 1.468, required_orl_db: 32, apc_reflectance_db: -60 };
TELECOM_RENDERERS["optical-return-loss"] = _simpleRenderer({
  citation: "Citation: Fresnel reflection R = ((n1 - n2)/(n1 + n2))^2 at a flat glass-air interface; event reflectances are converted from dB, summed in linear power, and returned as ORL = -10 log10(sum R). Transceiver and connector specifications and applicable test standards govern.",
  example: orlExample,
  fields: [
    { key: "connector_count", label: "Mated connector pairs", attrs: { step: "1", min: "1" } },
    { key: "connector_reflectance_db", label: "Reflectance per connector (negative dB)", attrs: { step: "any", max: "-0.0001" } },
    { key: "unmated_end_count", label: "Unmated flat ends", default: 1, attrs: { step: "1", min: "0" } },
    { key: "fiber_index", label: "Fiber index of refraction" },
    { key: "required_orl_db", label: "Required link ORL (dB)" },
    { key: "apc_reflectance_db", label: "APC reflectance per connector (negative dB)", default: -60, attrs: { step: "any", max: "-0.0001" } },
  ],
  outputs: [
    { key: "fresnel_reflectance_pct", id: "orl-fresnel", label: "Bare-end Fresnel reflection", unit: "%", value: (r) => fmt(r.fresnel_reflectance_pct, 2) + " % (" + fmt(r.fresnel_reflectance_db, 1) + " dB reflectance)" },
    { key: "connector_only_orl_db", id: "orl-good", label: "Connector-only link ORL", unit: "dB", value: (r) => fmt(r.connector_only_orl_db, 1) + " dB -- " + (r.connector_pass ? "PASS" : "FAIL") },
    { key: "with_unmated_orl_db", id: "orl-open", label: "ORL with unmated end(s)", unit: "dB", value: (r) => fmt(r.with_unmated_orl_db, 1) + " dB -- " + (r.unmated_pass ? "PASS" : "FAIL") },
    { key: "good_connector_share_with_unmated_pct", id: "orl-share", label: "Good connectors' reflected-power share", unit: "%", value: (r) => fmt(r.good_connector_share_with_unmated_pct, 3) + " %" },
    { key: "apc_orl_db", id: "orl-apc", label: "All-APC link ORL", unit: "dB", value: (r) => fmt(r.apc_orl_db, 1) + " dB" },
    { key: "note", id: "orl-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeOpticalReturnLoss,
});

// ===================== spec-v1843: microduct cable jetting =====================

// dims: in { duct_id_mm: L, cable_od_mm: L, fill_min_pct: dimensionless, fill_max_pct: dimensionless, optimal_fill_pct: dimensionless, air_velocity_m_s: L T^-1, pressure_bar_absolute: M L^-1 T^-2 } out: { fill_ratio_pct: dimensionless, annulus_area_mm2: L^2, free_air_l_min: L^3 T^-1 }
export function computeCableJettingDistance({ duct_id_mm = 0, cable_od_mm = 0, fill_min_pct = 40, fill_max_pct = 60, optimal_fill_pct = 50, air_velocity_m_s = 0, pressure_bar_absolute = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(duct_id_mm > 0) || !(cable_od_mm > 0) || cable_od_mm >= duct_id_mm) return { error: "Duct and cable diameters must be positive, and cable OD must be below duct ID." };
  if (!(fill_min_pct > 0 && fill_min_pct < fill_max_pct && fill_max_pct < 100) || !(optimal_fill_pct >= fill_min_pct && optimal_fill_pct <= fill_max_pct)) return { error: "Enter an ordered fill window below 100 percent and an optimum inside it." };
  if (!(air_velocity_m_s > 0) || !(pressure_bar_absolute > 0)) return { error: "Air velocity and absolute operating pressure must be positive." };
  const solve = (od) => {
    const fill_ratio_pct = 100 * Math.pow(od / duct_id_mm, 2);
    const annulus_area_mm2 = Math.PI / 4 * (duct_id_mm * duct_id_mm - od * od);
    const duct_air_l_min = annulus_area_mm2 * air_velocity_m_s * 0.06;
    return { fill_ratio_pct, annulus_area_mm2, duct_air_l_min, free_air_l_min: duct_air_l_min * pressure_bar_absolute };
  };
  const base = solve(cable_od_mm);
  const optimal_cable_od_mm = duct_id_mm * Math.sqrt(optimal_fill_pct / 100);
  const optimal = solve(optimal_cable_od_mm);
  const fill_status = base.fill_ratio_pct < fill_min_pct ? "BELOW WINDOW" : base.fill_ratio_pct > fill_max_pct ? "ABOVE WINDOW" : "IN WINDOW";
  return {
    fill_ratio_pct: base.fill_ratio_pct,
    annulus_area_mm2: base.annulus_area_mm2,
    duct_air_l_min: base.duct_air_l_min,
    free_air_l_min: base.free_air_l_min,
    fill_status, optimal_cable_od_mm,
    optimal_annulus_area_mm2: optimal.annulus_area_mm2,
    optimal_duct_air_l_min: optimal.duct_air_l_min,
    optimal_free_air_l_min: optimal.free_air_l_min,
    free_air_delta_l_min: optimal.free_air_l_min - base.free_air_l_min,
    free_air_change_pct: 100 * (optimal.free_air_l_min - base.free_air_l_min) / base.free_air_l_min,
    note: "This sizes the annulus and nominal air demand; it does not predict jetting distance. Distance comes from the cable, duct, and jetting-equipment manufacturers' data for the exact pair, derated for the actual bends and verified by trial.",
  };
}

const jettingExample = { duct_id_mm: 10, cable_od_mm: 8.5, fill_min_pct: 40, fill_max_pct: 60, optimal_fill_pct: 50, air_velocity_m_s: 25, pressure_bar_absolute: 10 };
TELECOM_RENDERERS["cable-jetting-distance"] = _simpleRenderer({
  citation: "Citation: area fill = (cable OD / duct ID)^2; annulus area = pi/4 x (ID^2 - OD^2); nominal flow = annulus area x air velocity and free-air flow scales by absolute pressure ratio. Manufacturer jetting data and a trial shot govern distance.",
  example: jettingExample,
  fields: [
    { key: "duct_id_mm", label: "Microduct inside diameter (mm)" },
    { key: "cable_od_mm", label: "Cable outside diameter (mm)" },
    { key: "fill_min_pct", label: "Recommended minimum area fill (%)", default: 40 },
    { key: "fill_max_pct", label: "Recommended maximum area fill (%)", default: 60 },
    { key: "optimal_fill_pct", label: "Target area fill (%)", default: 50 },
    { key: "air_velocity_m_s", label: "Nominal annulus air velocity (m/s)" },
    { key: "pressure_bar_absolute", label: "Duct pressure (bar absolute)" },
  ],
  outputs: [
    { key: "fill_ratio_pct", id: "cjd-fill", label: "Cable area fill", unit: "%", value: (r) => fmt(r.fill_ratio_pct, 1) + " % -- " + r.fill_status },
    { key: "optimal_cable_od_mm", id: "cjd-opt", label: "Cable OD at target fill", unit: "mm", value: (r) => fmt(r.optimal_cable_od_mm, 2) + " mm" },
    { key: "annulus_area_mm2", id: "cjd-area", label: "Entered-pair annulus", unit: "mm^2", value: (r) => fmt(r.annulus_area_mm2, 1) + " sq mm" },
    { key: "duct_air_l_min", id: "cjd-flow", label: "Air at duct pressure", unit: "L/min", value: (r) => fmt(r.duct_air_l_min, 0) + " L/min" },
    { key: "free_air_l_min", id: "cjd-free", label: "Compressor free-air delivery", unit: "L/min", value: (r) => fmt(r.free_air_l_min, 0) + " L/min" },
    { key: "optimal_free_air_l_min", id: "cjd-optflow", label: "Free air at target fill", unit: "L/min", value: (r) => fmt(r.optimal_free_air_l_min, 0) + " L/min (" + fmt(r.free_air_change_pct, 0) + " % change)" },
    { key: "note", id: "cjd-note", label: "Distance limit", value: (r) => r.note },
  ],
  compute: computeCableJettingDistance,
});

// ===================== spec-v1844: fusion splice mismatch =====================

// dims: in { mfd_1_um: L, mfd_2_um: L, lateral_offset_um: L, cleave_angle_deg: dimensionless, wavelength_nm: L, fiber_index: dimensionless } out: { mfd_mismatch_loss_db: dimensionless, lateral_offset_loss_db: dimensionless, angular_loss_db: dimensionless, total_loss_db: dimensionless }
export function computeSpliceLossMismatch({ mfd_1_um = 0, mfd_2_um = 0, lateral_offset_um = 0, cleave_angle_deg = 0, wavelength_nm = 0, fiber_index = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(mfd_1_um > 0) || !(mfd_2_um > 0) || !(wavelength_nm > 0) || !(fiber_index > 1)) return { error: "Mode-field diameters and wavelength must be positive, and fiber index must exceed 1." };
  if (!(lateral_offset_um >= 0) || !(cleave_angle_deg >= 0 && cleave_angle_deg < 90)) return { error: "Offset cannot be negative and cleave angle must be from 0 up to 90 degrees." };
  const mismatch = (a, b) => -20 * Math.log10(2 * a * b / (a * a + b * b));
  const radius_um = mfd_1_um / 2;
  const lateral = (offset) => 4.343 * Math.pow(offset / radius_um, 2);
  const angular = (degrees) => {
    const theta = degrees * Math.PI / 180;
    const wavelength_um = wavelength_nm / 1000;
    return 4.343 * Math.pow(Math.PI * fiber_index * radius_um * theta / wavelength_um, 2);
  };
  const mfd_mismatch_loss_db = mismatch(mfd_1_um, mfd_2_um);
  const lateral_offset_loss_db = lateral(lateral_offset_um);
  const angular_loss_db = angular(cleave_angle_deg);
  return {
    mfd_mismatch_loss_db, larger_mismatch_loss_db: mismatch(10.4, 8.6),
    lateral_offset_loss_db, lateral_1um_loss_db: lateral(1), lateral_2um_loss_db: lateral(2),
    angular_loss_db, angular_0_5deg_loss_db: angular(0.5), angular_1deg_loss_db: angular(1), angular_2deg_loss_db: angular(2),
    total_loss_db: mfd_mismatch_loss_db + lateral_offset_loss_db + angular_loss_db,
    note: "These Gaussian approximations isolate 3 mechanisms. A core-alignment splicer can drive out lateral offset but cannot repair a bad cleave; bidirectional OTDR averaging is required for dissimilar fibers. Manufacturer and acceptance-test requirements govern.",
  };
}

const spliceExample = { mfd_1_um: 9.2, mfd_2_um: 8.6, lateral_offset_um: 1, cleave_angle_deg: 1, wavelength_nm: 1550, fiber_index: 1.468 };
TELECOM_RENDERERS["splice-loss-mismatch"] = _simpleRenderer({
  citation: "Citation: Gaussian single-mode approximations: MFD mismatch = -20 log10(2 w1 w2/(w1^2+w2^2)); lateral offset = 4.343(d/w)^2; angular loss = 4.343(pi n w theta/lambda)^2, with w the mode-field radius. Splicer and fiber data and acceptance standards govern.",
  example: spliceExample,
  fields: [
    { key: "mfd_1_um", label: "Fiber 1 mode-field diameter (microns)" },
    { key: "mfd_2_um", label: "Fiber 2 mode-field diameter (microns)" },
    { key: "lateral_offset_um", label: "Lateral offset (microns)" },
    { key: "cleave_angle_deg", label: "Angular misalignment / cleave angle (deg)" },
    { key: "wavelength_nm", label: "Operating wavelength (nm)" },
    { key: "fiber_index", label: "Fiber index of refraction" },
  ],
  outputs: [
    { key: "mfd_mismatch_loss_db", id: "slm-mfd", label: "Mode-field mismatch loss", unit: "dB", value: (r) => fmt(r.mfd_mismatch_loss_db, 3) + " dB" },
    { key: "larger_mismatch_loss_db", id: "slm-large", label: "10.4 vs 8.6 micron mismatch", unit: "dB", value: (r) => fmt(r.larger_mismatch_loss_db, 3) + " dB" },
    { key: "lateral_offset_loss_db", id: "slm-offset", label: "Entered lateral-offset loss", unit: "dB", value: (r) => fmt(r.lateral_offset_loss_db, 3) + " dB" },
    { key: "lateral_2um_loss_db", id: "slm-offsets", label: "One / two micron offsets", unit: "dB", value: (r) => fmt(r.lateral_1um_loss_db, 3) + " / " + fmt(r.lateral_2um_loss_db, 3) + " dB" },
    { key: "angular_loss_db", id: "slm-angle", label: "Entered angular loss", unit: "dB", value: (r) => fmt(r.angular_loss_db, 3) + " dB" },
    { key: "angular_2deg_loss_db", id: "slm-angles", label: "0.5 / 1 / 2 degree loss", unit: "dB", value: (r) => fmt(r.angular_0_5deg_loss_db, 3) + " / " + fmt(r.angular_1deg_loss_db, 3) + " / " + fmt(r.angular_2deg_loss_db, 3) + " dB" },
    { key: "total_loss_db", id: "slm-total", label: "Approximate entered total", unit: "dB", value: (r) => fmt(r.total_loss_db, 3) + " dB" },
    { key: "note", id: "slm-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeSpliceLossMismatch,
});
