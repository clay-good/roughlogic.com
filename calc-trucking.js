// Group J: Trucking and Logistics (utilities 188 through 194).
// See spec-v4.md section 2.1.
//
// Carriers and tariff text are cited by name only; published divisor
// values, density-class brackets, FMCSA HOS rules, and the federal bridge
// formula are public-domain references applied directly. Manufacturer
// reefer fuel-burn benchmarks are cited per manufacturer technical
// bulletin.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt, makeRowField,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input. A renderer
// coerces an empty number field to 0 (Number("") === 0), so a NaN or
// Infinity reaching a solver is genuinely unusable (a pasted 1e999, a
// degenerate computed slot); per the spec-v18 §2 output contract the
// solver returns {error} rather than leaking a non-finite output field.
// Generic over the input object, so it needs no per-tile slot list, and
// it inspects only own numeric values (strings/arrays/null pass through).
// Non-exported, so it adds no v14 derivation-corpus row.
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


// --- Utility 188: Dimensional Weight (DIM) ---
//
// DIM = (L * W * H) / divisor (inches; lb output).
// Divisors are the carrier's published values (cited by carrier name).

export const DIM_DIVISORS = {
  UPS_Daily:    { divisor: 139, attribution: "UPS published daily-rate divisor (cited by carrier name only)" },
  UPS_Retail:   { divisor: 139, attribution: "UPS published retail-rate divisor" },
  FedEx_Ground: { divisor: 139, attribution: "FedEx Ground published divisor" },
  FedEx_Express:{ divisor: 139, attribution: "FedEx Express published divisor" },
  USPS:         { divisor: 166, attribution: "USPS published divisor (Priority Mail)" },
  DHL_Express:  { divisor: 139, attribution: "DHL Express published divisor" },
  freight:      { divisor: 250, attribution: "Freight (LTL) published density divisor" },
};

// dims: in { length_in: L, width_in: L, height_in: L, actual_weight_lb: M, carrier: dimensionless }
//        out: { dim_lb: M, billable_lb: M, divisor: L^3 M^-1, attribution: dimensionless, breakeven_in3: L^3, current_in3: L^3, billing_basis: dimensionless }
// (Box dimensions are lengths `L`; actual weight is mass `M`. The
//  carrier-published DIM divisor has units `L^3 M^-1` (in^3/lb), so
//  L*W*H / divisor = M (lb) is dimensionally consistent. Carrier
//  token and billing basis are categorical (dimensionless). The
//  break-even cube and current cube are volumes `L^3`.)
export function computeDIM({ length_in = 0, width_in = 0, height_in = 0, actual_weight_lb = 0, carrier = "UPS_Daily" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const c = DIM_DIVISORS[carrier];
  if (!c) return { error: "Unknown carrier." };
  if (!(length_in > 0 && width_in > 0 && height_in > 0)) return { error: "Dimensions must be positive." };
  if (!(actual_weight_lb >= 0)) return { error: "Actual weight must be non-negative." };
  const dim_lb = (length_in * width_in * height_in) / c.divisor;
  const billable_lb = Math.max(dim_lb, actual_weight_lb);
  // v8 §C.5: break-even volume - the cubic-inch volume at which DIM weight
  // equals actual weight. Above this volume the carrier bills DIM (cube-out);
  // below, actual weight (weigh-out). breakeven_in3 = actual_weight × divisor.
  const breakeven_in3 = actual_weight_lb > 0 ? actual_weight_lb * c.divisor : null;
  const current_in3 = length_in * width_in * height_in;
  const billing_basis = dim_lb >= actual_weight_lb ? "DIM (cube-out)" : "actual (weigh-out)";
  return {
    dim_lb, billable_lb, divisor: c.divisor, attribution: c.attribution,
    breakeven_in3, current_in3, billing_basis,
  };
}

export const dimExample = { inputs: { length_in: 12, width_in: 12, height_in: 12, actual_weight_lb: 5, carrier: "UPS_Daily" } };

// --- Utility 189: Freight Density and NMFC Class ---
//
// Density (lb/ft^3) -> public NMFTA density-class bracket. Class names
// are cited by name only; the bracket is a math aid.

export const NMFC_DENSITY_BRACKETS = [
  { min_pcf: 50, class: 50 },
  { min_pcf: 35, class: 55 },
  { min_pcf: 30, class: 60 },
  { min_pcf: 22.5, class: 65 },
  { min_pcf: 15, class: 70 },
  { min_pcf: 13.5, class: 77.5 },
  { min_pcf: 12, class: 85 },
  { min_pcf: 10.5, class: 92.5 },
  { min_pcf: 9, class: 100 },
  { min_pcf: 8, class: 110 },
  { min_pcf: 7, class: 125 },
  { min_pcf: 6, class: 150 },
  { min_pcf: 5, class: 175 },
  { min_pcf: 4, class: 200 },
  { min_pcf: 3, class: 250 },
  { min_pcf: 2, class: 300 },
  { min_pcf: 1, class: 400 },
  { min_pcf: 0, class: 500 },
];

// dims: in { length_in: L, width_in: L, height_in: L, weight_lb: M }
//        out: { density_pcf: M L^-3, cubic_ft: L^3, density_class: dimensionless }
// (Carton dimensions are lengths `L`; weight is `M`. Density in
//  lb/ft^3 is mass-per-volume `M L^-3`. The 1728 in^3/ft^3 divisor
//  absorbs the in -> ft cube conversion. NMFTA density class is a
//  categorical bracket lookup (dimensionless).)
export function computeFreightDensity({ length_in = 0, width_in = 0, height_in = 0, weight_lb = 0 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(length_in > 0 && width_in > 0 && height_in > 0)) return { error: "Dimensions must be positive." };
  if (!(weight_lb > 0)) return { error: "Weight must be positive." };
  const cubic_ft = (length_in * width_in * height_in) / 1728;
  const density_pcf = weight_lb / cubic_ft;
  let bracket = NMFC_DENSITY_BRACKETS[NMFC_DENSITY_BRACKETS.length - 1];
  for (const b of NMFC_DENSITY_BRACKETS) {
    if (density_pcf >= b.min_pcf) { bracket = b; break; }
  }
  return { density_pcf, cubic_ft, density_class: bracket.class };
}

export const freightDensityExample = { inputs: { length_in: 48, width_in: 40, height_in: 48, weight_lb: 350 } };

// --- Utility 190: Pallet Cube and Trailer Loadout ---

export const TRAILER_DIMENSIONS_IN = {
  dry_van_53: { L: 636, W: 100, H: 110, weight_max_lb: 45000 },
  dry_van_48: { L: 576, W: 100, H: 110, weight_max_lb: 44000 },
  pup_28:     { L: 336, W: 100, H: 110, weight_max_lb: 22500 },
  reefer_40:  { L: 480, W: 96,  H: 102, weight_max_lb: 43500 },
  ocean_20:   { L: 232, W: 92,  H: 94,  weight_max_lb: 47500 },
  ocean_40:   { L: 472, W: 92,  H: 94,  weight_max_lb: 59500 },
};

// dims: in { case_length_in: L, case_width_in: L, case_height_in: L, case_weight_lb: M, cases_per_pallet: dimensionless, pallet_length_in: L, pallet_width_in: L, pallet_height_in: L, trailer: dimensionless, pinwheel: dimensionless }
//        out: { pallets_by_floor: dimensionless, pallets_by_weight: dimensionless, pallets_total: dimensionless, cube_fill_percent: dimensionless, total_weight_lb: M, flag: dimensionless, binding_margin_pallets: dimensionless, slack_utilization_pct: dimensionless, trailer_cube_ft3: L^3, pallet_cube_ft3: L^3, case_cube_ft3: L^3, cases_cube_ft3: L^3, cases_fit_pallet_cube: dimensionless, pallet_cube_utilization_pct: dimensionless }
// (Case and pallet dimensions are lengths `L`; case weight is mass
//  `M`. Trailer / pinwheel toggles and case-count are dimensionless.
//  Floor- and weight-bound pallet counts are integer counts
//  (dimensionless); cube fill and slack utilization are percent
//  ratios (dimensionless). Trailer and pallet cubic-foot volumes
//  surface as `L^3`; status flag is a categorical token.)
export function computePalletLoadout({
  case_length_in = 0, case_width_in = 0, case_height_in = 0, case_weight_lb = 0,
  cases_per_pallet = 1,
  pallet_length_in = 48, pallet_width_in = 40, pallet_height_in = 48,
  trailer = "dry_van_53", pinwheel = false,
}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const tr = TRAILER_DIMENSIONS_IN[trailer];
  if (!tr) return { error: "Unknown trailer." };
  if (!(case_length_in > 0 && case_width_in > 0 && case_height_in > 0)) return { error: "Case dimensions must be positive." };
  if (!(cases_per_pallet >= 1)) return { error: "Cases per pallet must be at least 1." };
  // Pallet dimensions are denominators (Math.floor(tr.L / pallet_length_in),
  // tr.W / pallet_width_in); a cleared/zero pallet length or width drove
  // pallets_by_floor to Infinity, which the "By floor" field painted as
  // "Infinity" (a degenerate-input render leak invisible to the numeric-field
  // contract sweep because the field is String()-formatted).
  if (!(pallet_length_in > 0 && pallet_width_in > 0 && pallet_height_in > 0)) return { error: "Pallet dimensions must be positive." };

  // Floor-area pallets: lay 48x40 the long way, then pinwheel the second
  // row 40x48 if allowed.
  const palletsByLength = Math.floor(tr.L / pallet_length_in);
  const palletsByWidth = Math.floor(tr.W / pallet_width_in);
  const aligned = palletsByLength * palletsByWidth;
  let pinwheelTotal = aligned;
  if (pinwheel) {
    // Approximate pinwheel layout: alternate orientations every row.
    const rows = Math.floor(tr.W / 48);
    const altPalletsByWidth = Math.floor(tr.W / pallet_length_in);
    pinwheelTotal = palletsByLength * Math.max(palletsByWidth, altPalletsByWidth);
    pinwheelTotal = Math.min(pinwheelTotal, Math.floor((tr.L * tr.W) / (pallet_length_in * pallet_width_in)));
  }
  const pallets_by_floor = pinwheel ? pinwheelTotal : aligned;

  const total_pallet_weight_lb = case_weight_lb * cases_per_pallet;
  const pallets_by_weight = total_pallet_weight_lb > 0 ? Math.floor(tr.weight_max_lb / total_pallet_weight_lb) : Infinity;

  const pallets_total = Math.min(pallets_by_floor, pallets_by_weight);
  const pallet_cube_ft3 = (pallet_length_in * pallet_width_in * pallet_height_in) / 1728;
  const trailer_cube_ft3 = (tr.L * tr.W * tr.H) / 1728;
  const cube_fill_percent = (pallets_total * pallet_cube_ft3 / trailer_cube_ft3) * 100;

  // Physical cube feasibility of the stacked cases on one pallet: the total
  // case volume must fit within the pallet cube. This is a necessary (volume)
  // condition, independent of case orientation -- if the cases don't fit by
  // volume the entered cases_per_pallet is impossible regardless of layout.
  const case_cube_ft3 = (case_length_in * case_width_in * case_height_in) / 1728;
  const cases_cube_ft3 = case_cube_ft3 * cases_per_pallet;
  const cases_fit_pallet_cube = cases_cube_ft3 <= pallet_cube_ft3;
  const pallet_cube_utilization_pct = pallet_cube_ft3 > 0 ? (cases_cube_ft3 / pallet_cube_ft3) * 100 : null;

  const total_weight_lb = pallets_total * total_pallet_weight_lb;
  const flag = pallets_by_weight < pallets_by_floor ? "weigh-out" : (pallets_total > 0 ? "cube-out" : "empty");
  // v8 §C.5: how much the binding limit beats the slack limit by.
  const binding_margin_pallets = Number.isFinite(pallets_by_weight)
    ? Math.abs(pallets_by_floor - pallets_by_weight) : null;
  let slack_utilization_pct = null;
  if (flag === "cube-out" && Number.isFinite(pallets_by_weight) && pallets_by_weight > 0) {
    slack_utilization_pct = (pallets_total / pallets_by_weight) * 100;
  } else if (flag === "weigh-out" && pallets_by_floor > 0) {
    slack_utilization_pct = (pallets_total / pallets_by_floor) * 100;
  }
  return {
    pallets_by_floor, pallets_by_weight: Number.isFinite(pallets_by_weight) ? pallets_by_weight : null, pallets_total,
    cube_fill_percent, total_weight_lb, flag,
    binding_margin_pallets, slack_utilization_pct,
    trailer_cube_ft3, pallet_cube_ft3,
    case_cube_ft3, cases_cube_ft3, cases_fit_pallet_cube, pallet_cube_utilization_pct,
  };
}

export const palletLoadoutExample = {
  inputs: { case_length_in: 12, case_width_in: 10, case_height_in: 8, case_weight_lb: 25, cases_per_pallet: 48, pallet_length_in: 48, pallet_width_in: 40, pallet_height_in: 48, trailer: "dry_van_53", pinwheel: false },
};

// --- Utility 191: Hours of Service Math (FMCSA 49 CFR 395) ---
//
// Tracks driving / on-duty / sleeper / off-duty intervals and reports
// remaining time before each FMCSA limit.

export const HOS_PROFILES = {
  "property_70_8": { drive_max: 11, on_duty_window: 14, weekly_max: 70, weekly_window_days: 8 },
  "property_60_7": { drive_max: 11, on_duty_window: 14, weekly_max: 60, weekly_window_days: 7 },
  // Passenger-carrying drivers: 10 hr driving / 15 hr on-duty window, weekly
  // 60 hr / 7 days (FMCSA 49 CFR 395.5). The key name is a legacy identifier
  // kept for shared-URL back-compat; the rule it encodes is 60/7, not 70/7.
  "passenger_70_7": { drive_max: 10, on_duty_window: 15, weekly_max: 60, weekly_window_days: 7 },
};

// dims: in { profile: dimensionless, events: dimensionless, weekly_on_duty_used_hr: T, current_time_iso: dimensionless }
//        out: { drive_used: T, drive_remaining: T, on_duty_used: T, on_duty_remaining: T, weekly_remaining: T, needs_break: dimensionless, break_taken: dimensionless, next_drive_start_iso: dimensionless, next_drive_reason: dimensionless }
// (FMCSA HOS profile and event-kind tokens are categorical
//  (dimensionless); event-list aggregation reduces to scalar time
//  totals. Drive, on-duty, and weekly hour totals carry the §7.1
//  base-token `T` (time leg of the shortcut). ISO timestamps are
//  formatted strings (dimensionless), as are the break-required
//  / break-taken flags and the next-step reason text.)
export function computeHOS({ profile = "property_70_8", events = [], weekly_on_duty_used_hr = 0, current_time_iso = null }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const p = HOS_PROFILES[profile];
  if (!p) return { error: "Unknown HOS profile." };
  if (!Array.isArray(events)) return { error: "Events must be a list." };
  let drive_used = 0;
  let on_duty_used = 0;
  let last_break_at = 0;
  let cumulative_drive_since_break = 0;
  let break_taken = false;
  for (const e of events) {
    const hours = Number(e.hours) || 0;
    if (hours < 0) return { error: "Event hours must be non-negative." };
    const kind = e.kind;
    if (!["drive", "on_duty", "sleeper", "off_duty"].includes(kind)) return { error: "Unknown event kind: " + kind };
    if (kind === "drive") { drive_used += hours; on_duty_used += hours; cumulative_drive_since_break += hours; }
    else if (kind === "on_duty") { on_duty_used += hours; }
    else if (kind === "sleeper" || kind === "off_duty") {
      if (hours >= 0.5) { break_taken = true; cumulative_drive_since_break = 0; }
    }
  }
  const drive_remaining = Math.max(0, p.drive_max - drive_used);
  const on_duty_remaining = Math.max(0, p.on_duty_window - on_duty_used);
  const weekly_remaining = Math.max(0, p.weekly_max - (weekly_on_duty_used_hr + on_duty_used));
  const needs_break_at_8_hours = cumulative_drive_since_break >= 8 && !break_taken;
  // v8 §C.5: when current_time_iso is supplied, derive the next legal
  // drive-start timestamp. Driver may resume after a 30-minute break (if
  // mid-shift break required), or after a 10-hour reset (if on-duty
  // window or drive-cap hit). Otherwise drive may resume now.
  let next_drive_start_iso = null;
  let next_drive_reason = null;
  if (current_time_iso) {
    const t = new Date(current_time_iso);
    if (Number.isNaN(t.getTime())) return { error: "current_time_iso must be a valid ISO date string." };
    if (drive_remaining <= 0 || on_duty_remaining <= 0) {
      // 10-hour reset.
      const next = new Date(t.getTime() + 10 * 3600 * 1000);
      next_drive_start_iso = next.toISOString();
      next_drive_reason = "10-hour reset (drive or on-duty window exhausted)";
    } else if (needs_break_at_8_hours) {
      // 30-minute break.
      const next = new Date(t.getTime() + 30 * 60 * 1000);
      next_drive_start_iso = next.toISOString();
      next_drive_reason = "30-minute break (cumulative 8 hr drive without break)";
    } else {
      next_drive_start_iso = t.toISOString();
      next_drive_reason = "may drive now";
    }
  }
  return {
    drive_used, drive_remaining,
    on_duty_used, on_duty_remaining,
    weekly_remaining, needs_break: needs_break_at_8_hours,
    break_taken,
    next_drive_start_iso, next_drive_reason,
  };
}

export const hosExample = {
  inputs: {
    profile: "property_70_8",
    events: [
      { kind: "on_duty", hours: 0.5 },
      { kind: "drive", hours: 5 },
      { kind: "off_duty", hours: 0.5 },
      { kind: "drive", hours: 4 },
    ],
    weekly_on_duty_used_hr: 30,
  },
};

// --- Utility 192: Federal Bridge Formula ---
//
// W = 500 * (L*N/(N-1) + 12N + 36) for any consecutive group of N >= 2 axles
// over distance L (ft, outermost spacing). Per axle: 20,000 lb single,
// 34,000 lb tandem. Total cap 80,000 lb interstate.

// dims: in { axle_weights_lb: M, axle_spacings_ft: L }
//        out: { total_weight_lb: M, interstate_cap_lb: M, over_interstate: dimensionless, axle_violations: dimensionless, bridge_violations: dimensionless }
// (Per-axle weights are mass `M`; axle spacings are lengths `L`.
//  Both inputs are caller-typed equal-units arrays whose elements
//  carry the row dimension. The 23 CFR 658.17 bridge formula
//  W = 500*(LN/(N-1) + 12N + 36) embeds 500 lb/ft as a published
//  constant absorbing the mass-per-length unit conversion at the
//  source level. Violation messages are categorical (dimensionless).)
export function computeBridgeFormula({ axle_weights_lb = [], axle_spacings_ft = [] }) {
  if (!Array.isArray(axle_weights_lb) || axle_weights_lb.length < 1) return { error: "Provide at least one axle." };
  if (!Array.isArray(axle_spacings_ft)) return { error: "Spacings must be a list." };
  if (axle_spacings_ft.length !== axle_weights_lb.length - 1) {
    return { error: "Spacings list length must equal axle count minus 1." };
  }
  // DR-26 (D-2/C-1): coerce the weight and spacing arrays once at entry. The
  // per-axle and tandem checks previously read raw elements, so a
  // numeric-string element made group_weight NaN and Math.round(group_weight)
  // emitted NaN into the bridge_violations string. Use the coerced copies.
  const weights = axle_weights_lb.map((w) => Number(w) || 0);
  const spacings = axle_spacings_ft.map((s) => Number(s) || 0);
  const total = weights.reduce((a, b) => a + b, 0);
  // Per-axle flags
  const single_max = 20000;
  const tandem_max = 34000;
  const violations = [];
  weights.forEach((w, i) => {
    if (w > single_max) violations.push("axle " + (i + 1) + " exceeds 20,000 lb single limit");
  });
  // Tandem groups (consecutive axles within ~8 ft)
  for (let i = 0; i < weights.length - 1; i++) {
    const spacing = spacings[i];
    if (spacing <= 8 && (weights[i] + weights[i + 1]) > tandem_max) {
      violations.push("axles " + (i + 1) + "-" + (i + 2) + " exceed 34,000 lb tandem limit");
    }
  }
  // Bridge formula across every group of consecutive axles N >= 2:
  let bridge_violations = [];
  for (let i = 0; i < weights.length; i++) {
    let group_weight = weights[i];
    let group_length = 0;
    for (let j = i + 1; j < weights.length; j++) {
      group_length += spacings[j - 1];
      group_weight += weights[j];
      const N = j - i + 1;
      const W = 500 * ((group_length * N) / (N - 1) + 12 * N + 36);
      if (group_weight > W) {
        bridge_violations.push("axles " + (i + 1) + "-" + (j + 1) + ": " + Math.round(group_weight) + " lb > " + Math.round(W) + " lb formula max");
      }
    }
  }
  return {
    total_weight_lb: total,
    interstate_cap_lb: 80000,
    over_interstate: total > 80000,
    axle_violations: violations,
    bridge_violations,
  };
}

export const bridgeFormulaExample = {
  inputs: { axle_weights_lb: [12000, 17000, 17000, 17000, 17000], axle_spacings_ft: [12, 4, 30, 4] },
};

// --- spec-v656: bridge-formula minimum axle spread (inverse of the max-weight formula) ---
// dims: in { target_weight_lb: M L T^-2, num_axles: dimensionless } out: { min_spacing_ft: L, avg_axle_lb: M L T^-2 }
export function computeBridgeFormulaMinSpacing({ target_weight_lb = 0, num_axles = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(target_weight_lb) || 0;
  const n = Math.round(Number(num_axles) || 0);
  if (!(w > 0)) return { error: "Target group weight must be positive (lb)." };
  if (!(n >= 2)) return { error: "The bridge formula needs a group of at least 2 axles." };
  const raw = ((w / 500) - 12 * n - 36) * (n - 1) / n;
  const min_spacing_ft = Math.max(0, raw);
  const fits_at_zero = raw <= 0;
  const over_interstate_cap = w > 80000;
  const avg_axle_lb = w / n;
  return {
    min_spacing_ft, fits_at_zero, over_interstate_cap, avg_axle_lb,
    note: "Federal Bridge Formula B solved for the minimum outer-to-outer axle spread: from W = 500 (L N/(N-1) + 12 N + 36), the spread that just carries a target group weight W across N axles is L = ((W/500) - 12 N - 36)(N-1)/N. A 5-axle group at 80,000 lb needs at least 51.2 ft outer-to-outer. If the result is zero the axles already satisfy the formula bunched together (the group weight is below the N-axle minimum). This is the spread the bridge formula alone requires; the 20,000 lb single-axle and 34,000 lb tandem caps and the 80,000 lb interstate gross limit apply independently, and a load above 80,000 lb needs an overweight permit. The enforcing state DOT and the permit govern.",
  };
}
export const bridgeFormulaMinSpacingExample = { inputs: { target_weight_lb: 80000, num_axles: 5 } };
const renderBridgeFormulaMinSpacing = _simpleRenderer({
  citation: "Citation: Federal Bridge Formula B (23 CFR 658.17) solved for the minimum axle spread - L = ((W/500) - 12 N - 36)(N-1)/N from W = 500 (L N/(N-1) + 12 N + 36), by name. The 20,000 lb single / 34,000 lb tandem / 80,000 lb interstate caps apply independently; the enforcing state DOT and the permit govern.",
  example: bridgeFormulaMinSpacingExample.inputs,
  fields: [
    { key: "target_weight_lb", label: "Target group weight (lb)", kind: "number" },
    { key: "num_axles", label: "Number of axles in the group", kind: "number" },
  ],
  outputs: [
    { key: "l", id: "bfms-out-l", label: "Minimum outer-to-outer spread", value: (r) => r.fits_at_zero ? "0 ft (the axles already satisfy the formula bunched together)" : fmt(r.min_spacing_ft, 1) + " ft" },
    { key: "a", id: "bfms-out-a", label: "Average per axle", value: (r) => fmt(r.avg_axle_lb, 0) + " lb" + (r.over_interstate_cap ? " - the group exceeds the 80,000 lb interstate cap; an overweight permit is required" : "") },
    { key: "n", id: "bfms-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBridgeFormulaMinSpacing,
});

// --- Utility 193: Reefer Fuel Burn ---

export const REEFER_BURN_GPH = {
  thermo_king_continuous: { gph: 0.65, attribution: "Thermo King published technical bulletin (typical SB-series continuous)" },
  thermo_king_cycle:      { gph: 0.40, attribution: "Thermo King published technical bulletin (typical cycle-sentry mode)" },
  carrier_continuous:     { gph: 0.70, attribution: "Carrier Transicold published technical bulletin (typical Vector continuous)" },
  carrier_cycle:          { gph: 0.45, attribution: "Carrier Transicold published technical bulletin (typical start-stop mode)" },
};

// dims: in { unit: dimensionless, tank_gal: L^3, haul_hr: T, ambient_band: dimensionless, haul_miles: L, average_mph: L T^-1 }
//        out: { gph: L^3 T^-1, fuel_burned: L^3, run_time_hr: T, refuel_required: dimensionless, haul_hr_effective: T, fuel_burned_effective: L^3, reserve_gal: L^3, attribution: dimensionless }
// (Reefer unit / mode and ambient band are categorical tokens
//  (dimensionless). Tank capacity in gallons is volume `L^3`, haul
//  hours is `T`; distance is `L` and average speed is `L T^-1`.
//  Fuel burn rate gph is volume-per-time `L^3 T^-1`; burned and
//  reserve fuel are volumes `L^3`. Manufacturer attribution is a
//  categorical token.)
export function computeReeferBurn({ unit = "thermo_king_continuous", tank_gal = 50, haul_hr = 24, ambient_band = "moderate", haul_miles = 0, average_mph = 55 }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const u = REEFER_BURN_GPH[unit];
  if (!u) return { error: "Unknown reefer unit." };
  if (!(tank_gal > 0)) return { error: "Tank must be positive." };
  if (!(haul_hr > 0)) return { error: "Haul hours must be positive." };
  const ambient_factor = ambient_band === "hot" ? 1.20 : (ambient_band === "cold" ? 0.85 : 1.00);
  const gph = u.gph * ambient_factor;
  const fuel_burned = gph * haul_hr;
  const run_time_hr = tank_gal / gph;
  // v8 §C.5: optional haul-distance input. Compute fuel reserve at end of haul.
  // If haul_miles supplied, override haul_hr with the implied driving time.
  let haul_hr_effective = haul_hr;
  let fuel_burned_effective = fuel_burned;
  let reserve_gal = null;
  if (haul_miles > 0 && average_mph > 0) {
    haul_hr_effective = haul_miles / average_mph;
    fuel_burned_effective = gph * haul_hr_effective;
    reserve_gal = tank_gal - fuel_burned_effective;
  } else {
    reserve_gal = tank_gal - fuel_burned;
  }
  return {
    gph, fuel_burned, run_time_hr,
    refuel_required: fuel_burned_effective > tank_gal,
    haul_hr_effective, fuel_burned_effective, reserve_gal,
    attribution: u.attribution,
  };
}

export const reeferBurnExample = { inputs: { unit: "thermo_king_continuous", tank_gal: 50, haul_hr: 24, ambient_band: "moderate", haul_miles: 1200, average_mph: 55 } };

// --- Utility 194: Incoterms 2020 Decoder ---

export const INCOTERMS_2020 = {
  EXW: { name: "Ex Works",            freight: "buyer",  risk_transfer: "at seller's premises",        export_clearance: "buyer",  import_clearance: "buyer" },
  FCA: { name: "Free Carrier",        freight: "buyer",  risk_transfer: "when goods handed to carrier", export_clearance: "seller", import_clearance: "buyer" },
  CPT: { name: "Carriage Paid To",    freight: "seller", risk_transfer: "when goods handed to carrier", export_clearance: "seller", import_clearance: "buyer" },
  CIP: { name: "Carriage Insurance Paid", freight: "seller", risk_transfer: "when goods handed to carrier", export_clearance: "seller", import_clearance: "buyer" },
  DAP: { name: "Delivered At Place",  freight: "seller", risk_transfer: "at the named destination",     export_clearance: "seller", import_clearance: "buyer" },
  DPU: { name: "Delivered at Place Unloaded", freight: "seller", risk_transfer: "at the named destination after unloading", export_clearance: "seller", import_clearance: "buyer" },
  DDP: { name: "Delivered Duty Paid", freight: "seller", risk_transfer: "at the named destination",     export_clearance: "seller", import_clearance: "seller" },
  FAS: { name: "Free Alongside Ship", freight: "buyer",  risk_transfer: "alongside the vessel at port", export_clearance: "seller", import_clearance: "buyer" },
  FOB: { name: "Free On Board",       freight: "buyer",  risk_transfer: "when goods loaded on the vessel", export_clearance: "seller", import_clearance: "buyer" },
  CFR: { name: "Cost and Freight",    freight: "seller", risk_transfer: "when goods loaded on the vessel", export_clearance: "seller", import_clearance: "buyer" },
  CIF: { name: "Cost, Insurance, and Freight", freight: "seller", risk_transfer: "when goods loaded on the vessel", export_clearance: "seller", import_clearance: "buyer" },
};

// dims: in { term: dimensionless }
//        out: { name: dimensionless, freight: dimensionless, risk_transfer: dimensionless, export_clearance: dimensionless, import_clearance: dimensionless, term: dimensionless, citation: dimensionless }
// (Incoterm three-letter code, plain-English name, and the four
//  per-term responsibility tokens are all categorical strings
//  (dimensionless) - no measured quantities surface from this
//  decoder.)
export function computeIncoterm({ term = "FOB" }) {
  const t = INCOTERMS_2020[term];
  if (!t) return { error: "Unknown Incoterm." };
  return { ...t, term, citation: "ICC Incoterms 2020 (cited by name only; rules text not reproduced)." };
}

export const incotermExample = { inputs: { term: "FOB" } };

// --- Renderers ---

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

const renderDIM = _simpleRenderer({
  citation: "Citation: Carrier-published divisor (cited by carrier name only; tariff text not reproduced). Billable weight = max(DIM, actual).",
  example: dimExample.inputs,
  fields: [
    { key: "length_in", label: "Length (in)", kind: "number" },
    { key: "width_in",  label: "Width (in)",  kind: "number" },
    { key: "height_in", label: "Height (in)", kind: "number" },
    { key: "actual_weight_lb", label: "Actual weight (lb)", kind: "number" },
    { key: "carrier", label: "Carrier", kind: "select", options: Object.keys(DIM_DIVISORS).map((k) => ({ value: k, label: k.replace(/_/g, " ") })) },
  ],
  outputs: [
    { key: "d", id: "dim-out-d", label: "Dimensional weight", value: (r) => fmt(r.dim_lb, 1) + " lb" },
    { key: "b", id: "dim-out-b", label: "Billable weight",    value: (r) => fmt(r.billable_lb, 1) + " lb" },
    // v8 §C.5: surface billing basis + cube-out / weigh-out break-even.
    { key: "ba", id: "dim-out-ba", label: "Billing basis",    value: (r) => r.billing_basis || "-" },
    { key: "be", id: "dim-out-be", label: "Break-even cube",  value: (r) => r.breakeven_in3 === null ? "-" : fmt(r.breakeven_in3, 0) + " in³ (" + fmt(r.breakeven_in3 / 1728, 2) + " ft³)" },
    { key: "a", id: "dim-out-a", label: "Source",             value: (r) => r.attribution },
  ],
  compute: computeDIM,
});

const renderFreightDensity = _simpleRenderer({
  citation: "Citation: NMFTA published density-class scale (cited by name only). Math aid; the actual NMFC class can be set by commodity, stowability, handling, or liability.",
  example: freightDensityExample.inputs,
  fields: [
    { key: "length_in", label: "Length (in)", kind: "number" },
    { key: "width_in",  label: "Width (in)",  kind: "number" },
    { key: "height_in", label: "Height (in)", kind: "number" },
    { key: "weight_lb", label: "Weight (lb)", kind: "number" },
  ],
  outputs: [
    { key: "p", id: "fd-out-p", label: "Density",       value: (r) => fmt(r.density_pcf, 2) + " lb/ft^3" },
    { key: "v", id: "fd-out-v", label: "Cube",          value: (r) => fmt(r.cubic_ft, 2) + " ft^3" },
    { key: "c", id: "fd-out-c", label: "Density class", value: (r) => "Class " + r.density_class },
  ],
  compute: computeFreightDensity,
});

const renderPalletLoadout = _simpleRenderer({
  citation: "Citation: Geometric loadout from trailer interior dimensions and pallet footprint, capped by the trailer's weight rating. Public engineering practice.",
  example: palletLoadoutExample.inputs,
  fields: [
    { key: "case_length_in",   label: "Case length (in)",  kind: "number" },
    { key: "case_width_in",    label: "Case width (in)",   kind: "number" },
    { key: "case_height_in",   label: "Case height (in)",  kind: "number" },
    { key: "case_weight_lb",   label: "Case weight (lb)",  kind: "number" },
    { key: "cases_per_pallet", label: "Cases per pallet",  kind: "number", default: 36 },
    { key: "pallet_length_in", label: "Pallet length (in)",kind: "number" },
    { key: "pallet_width_in",  label: "Pallet width (in)", kind: "number" },
    { key: "pallet_height_in", label: "Pallet height (in)",kind: "number" },
    { key: "trailer", label: "Trailer", kind: "select", options: Object.keys(TRAILER_DIMENSIONS_IN).map((k) => ({ value: k, label: k.replace(/_/g, " ") })) },
    { key: "pinwheel", label: "Pinwheel allowed", kind: "checkbox" },
  ],
  outputs: [
    { key: "n", id: "pl-out-n", label: "Pallets total",      value: (r) => String(r.pallets_total) },
    { key: "f", id: "pl-out-f", label: "By floor",           value: (r) => String(r.pallets_by_floor) },
    { key: "w", id: "pl-out-w", label: "By weight",          value: (r) => Number.isFinite(r.pallets_by_weight) ? String(r.pallets_by_weight) : "no limit" },
    { key: "c", id: "pl-out-c", label: "Cube fill",          value: (r) => fmt(r.cube_fill_percent, 1) + " %" },
    { key: "t", id: "pl-out-t", label: "Total weight",       value: (r) => fmt(r.total_weight_lb, 0) + " lb" },
    { key: "g", id: "pl-out-g", label: "Status",             value: (r) => r.flag },
    { key: "bm", id: "pl-out-bm", label: "Binding margin",   value: (r) => r.binding_margin_pallets === null ? "-" : String(r.binding_margin_pallets) + " pallet(s) headroom over the slack limit" },
    { key: "su", id: "pl-out-su", label: "Slack utilization", value: (r) => r.slack_utilization_pct === null ? "-" : fmt(r.slack_utilization_pct, 1) + " % of slack limit used" },
    { key: "cc", id: "pl-out-cc", label: "Case cube on pallet", value: (r) => fmt(r.cases_cube_ft3, 1) + " ft^3 (" + fmt(r.pallet_cube_utilization_pct, 0) + " % of pallet cube)" },
    { key: "cf", id: "pl-out-cf", label: "Cases fit pallet cube", value: (r) => r.cases_fit_pallet_cube ? "yes" : "NO - cases_per_pallet exceeds the pallet cube; reduce the count or the case size" },
  ],
  compute: computePalletLoadout,
});

function renderHOS(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: Math aid for personal verification. The ELD on the truck is the legal record. Citation: per FMCSA 49 CFR 395 (Hours of Service). Free at ecfr.gov.";
  attachExampleButton(inputRegion, () => fillExample(hosExample.inputs));
  const profile = makeSelect("Profile", "hos-p", [
    { value: "property_70_8", label: "Property 70/8" },
    { value: "property_60_7", label: "Property 60/7" },
    { value: "passenger_70_7", label: "Passenger 60/7" },
  ]);
  const weekly = makeNumber("Weekly on-duty already used (hr)", "hos-w", { step: "any", min: "0" });
  // v8 §C.5: optional current-time-ISO so the renderer can show the next
  // legal drive-start as an actual timestamp.
  const ct = (() => {
    const wrap = document.createElement("div"); wrap.className = "field";
    const lab = document.createElement("label"); lab.htmlFor = "hos-ct"; lab.textContent = "Current time (ISO, optional)";
    const input = document.createElement("input"); input.type = "text"; input.id = "hos-ct"; input.placeholder = "2026-05-07T14:30:00Z";
    wrap.appendChild(lab); wrap.appendChild(input);
    return { wrap, input };
  })();
  inputRegion.appendChild(profile.wrap);
  inputRegion.appendChild(weekly.wrap);
  inputRegion.appendChild(ct.wrap);
  ct.input.addEventListener("input", update);

  const eventsList = document.createElement("div");
  inputRegion.appendChild(eventsList);
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const k = document.createElement("select");
    k.setAttribute("aria-label", "Duty status for segment " + (i + 1));
    for (const v of ["drive", "on_duty", "sleeper", "off_duty"]) {
      const o = document.createElement("option"); o.value = v; o.textContent = v.replace("_", " "); k.appendChild(o);
    }
    const hF = makeRowField("Segment " + (i + 1) + " hours", "hos-s" + i + "-h", { step: "any", min: "0" });
    const h = hF.input;
    wrap.appendChild(k); wrap.appendChild(hF.wrap); eventsList.appendChild(wrap);
    k.addEventListener("input", update); h.addEventListener("input", update);
    rows.push({ k, h });
  }

  const oD = makeOutputLine(outputRegion, "Drive used / remaining", "hos-out-d");
  const oW = makeOutputLine(outputRegion, "On-duty remaining (14 hr window)", "hos-out-w");
  const oWk = makeOutputLine(outputRegion, "Weekly remaining", "hos-out-wk");
  const oB = makeOutputLine(outputRegion, "30-min break", "hos-out-b");
  const oNT = makeOutputLine(outputRegion, "Next legal drive start (if current time supplied)", "hos-out-nt");

  function fillExample(v) {
    profile.select.value = v.profile;
    weekly.input.value = v.weekly_on_duty_used_hr;
    for (let i = 0; i < rows.length; i++) {
      if (v.events[i]) { rows[i].k.value = v.events[i].kind; rows[i].h.value = v.events[i].hours; }
    }
    update();
  }
  function update() {
    const events = rows.map((r) => ({ kind: r.k.value, hours: Number(r.h.value) || 0 })).filter((e) => e.hours > 0);
    const r = computeHOS({
      profile: profile.select.value,
      events,
      weekly_on_duty_used_hr: Number(weekly.input.value) || 0,
      current_time_iso: ct.input.value.trim() || null,
    });
    if (r.error) { oD.textContent = r.error; oW.textContent = "-"; oWk.textContent = "-"; oB.textContent = "-"; oNT.textContent = "-"; return; }
    oD.textContent = fmt(r.drive_used, 2) + " / " + fmt(r.drive_remaining, 2) + " hr";
    oW.textContent = fmt(r.on_duty_remaining, 2) + " hr";
    oWk.textContent = fmt(r.weekly_remaining, 2) + " hr";
    oB.textContent = r.needs_break ? "REQUIRED (8+ hr drive without 30-min)" : "ok";
    oNT.textContent = r.next_drive_start_iso === null ? "-" : (r.next_drive_start_iso + " - " + r.next_drive_reason);
  }
}

function renderBridgeFormula(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per 23 CFR 658.17 (Federal Bridge Formula). W = 500 (LN/(N-1) + 12N + 36) for any consecutive axle group N >= 2. State limits may be lower than federal. Free at ecfr.gov.";
  attachExampleButton(inputRegion, () => fillExample(bridgeFormulaExample.inputs));
  const list = document.createElement("div"); inputRegion.appendChild(list);
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const awF = makeRowField("Axle " + (i + 1) + " weight (lb)", "br-a" + i + "-w", { step: "any", min: "0" });
    const agF = makeRowField("Axle " + (i + 1) + " spacing to next (ft)", "br-a" + i + "-s", { step: "any", min: "0" });
    const aw = awF.input, ag = agF.input;
    wrap.appendChild(awF.wrap); wrap.appendChild(agF.wrap); list.appendChild(wrap);
    aw.addEventListener("input", update); ag.addEventListener("input", update);
    rows.push({ aw, ag });
  }
  const oT = makeOutputLine(outputRegion, "Total weight", "br-out-t");
  const oV = makeOutputLine(outputRegion, "Per-axle / tandem violations", "br-out-v");
  const oB = makeOutputLine(outputRegion, "Bridge formula violations", "br-out-b");

  function fillExample(v) {
    const w = v.axle_weights_lb;
    const s = v.axle_spacings_ft;
    for (let i = 0; i < rows.length; i++) {
      rows[i].aw.value = w[i] !== undefined ? w[i] : "";
      rows[i].ag.value = s[i] !== undefined ? s[i] : "";
    }
    update();
  }
  function update() {
    const weights = rows.map((r) => Number(r.aw.value) || 0).filter((w) => w > 0);
    const spacings = rows.map((r) => Number(r.ag.value) || 0).slice(0, Math.max(0, weights.length - 1));
    if (weights.length === 0) { oT.textContent = "-"; oV.textContent = "-"; oB.textContent = "-"; return; }
    const r = computeBridgeFormula({ axle_weights_lb: weights, axle_spacings_ft: spacings });
    if (r.error) { oT.textContent = r.error; oV.textContent = "-"; oB.textContent = "-"; return; }
    oT.textContent = fmt(r.total_weight_lb, 0) + " lb" + (r.over_interstate ? " (OVER 80,000)" : "");
    oV.textContent = r.axle_violations.length === 0 ? "ok" : r.axle_violations.join("; ");
    oB.textContent = r.bridge_violations.length === 0 ? "ok" : r.bridge_violations.join("; ");
  }
}

const renderReeferBurn = _simpleRenderer({
  citation: "Citation: Manufacturer technical bulletins (Thermo King, Carrier Transicold). Each result attributes the publishing manufacturer.",
  example: reeferBurnExample.inputs,
  fields: [
    { key: "unit", label: "Reefer unit / mode", kind: "select", options: Object.keys(REEFER_BURN_GPH).map((k) => ({ value: k, label: k.replace(/_/g, " ") })) },
    { key: "tank_gal", label: "Tank capacity (gal)", kind: "number" },
    { key: "haul_hr", label: "Haul duration (hr)", kind: "number" },
    { key: "ambient_band", label: "Ambient band", kind: "select", options: [{ value: "cold", label: "Cold" }, { value: "moderate", label: "Moderate", selected: true }, { value: "hot", label: "Hot" }] },
    { key: "haul_miles", label: "Haul distance (mi, optional)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "average_mph", label: "Average speed (mph)", kind: "number", default: 55, attrs: { step: "any", min: "0" } },
  ],
  outputs: [
    { key: "g", id: "rf-out-g", label: "GPH (corrected)", value: (r) => fmt(r.gph, 2) },
    { key: "f", id: "rf-out-f", label: "Fuel burned",     value: (r) => fmt(r.fuel_burned, 1) + " gal" },
    { key: "t", id: "rf-out-t", label: "Run time on tank",value: (r) => fmt(r.run_time_hr, 1) + " hr" },
    { key: "r", id: "rf-out-r", label: "Refuel required", value: (r) => r.refuel_required ? "YES" : "no" },
    { key: "rs", id: "rf-out-rs", label: "Fuel reserve at end of haul", value: (r) => r.reserve_gal === null ? "-" : (r.reserve_gal >= 0 ? fmt(r.reserve_gal, 1) + " gal remaining" : fmt(-r.reserve_gal, 1) + " gal short - refuel mid-haul") },
    { key: "a", id: "rf-out-a", label: "Source",          value: (r) => r.attribution },
  ],
  compute: computeReeferBurn,
});

const renderIncoterm = _simpleRenderer({
  citation: "Citation: ICC Incoterms 2020 by name only. No reproduction of the rules text. Original plain-English summary by the project author.",
  example: incotermExample.inputs,
  fields: [
    { key: "term", label: "Term", kind: "select", options: Object.keys(INCOTERMS_2020).map((k) => ({ value: k, label: k + " - " + INCOTERMS_2020[k].name })) },
  ],
  outputs: [
    { key: "n",  id: "ic-out-n",  label: "Term name",         value: (r) => r.name },
    { key: "f",  id: "ic-out-f",  label: "Freight paid by",   value: (r) => r.freight },
    { key: "rt", id: "ic-out-rt", label: "Risk transfers",    value: (r) => r.risk_transfer },
    { key: "ec", id: "ic-out-ec", label: "Export clearance",  value: (r) => r.export_clearance },
    { key: "ic", id: "ic-out-ic", label: "Import clearance",  value: (r) => r.import_clearance },
  ],
  compute: computeIncoterm,
});

// =====================================================================
// v9 §D.2: Stopping sight distance (AASHTO Green Book)
// =====================================================================
//
// Public AASHTO algebra. Standard formulas from the AASHTO Green Book
// (7th ed.) Chapter 3:
//
//   d_pr = 1.47 * v * t_pr            (perception-reaction distance, ft)
//   d_br = v^2 / (30 * (f + g))       (braking distance, ft)
//   d    = d_pr + d_br                (total SSD)
//
// Where v is speed in mph, t_pr is perception-reaction time in seconds
// (default 2.5 per the Green Book), f is the longitudinal-friction
// coefficient, and g is the grade as a decimal (positive uphill).
//
// AASHTO publishes design-SSD tables that round these numbers; the
// calculator outputs the underlying physics so a contractor can
// compare directly against the table for a given design speed.

// Common friction-coefficient defaults (cited by name; the calculator
// surfaces the user's choice and lets them override).
export const SSD_FRICTION_DEFAULTS = {
  dry: { f: 0.35, label: "Dry pavement (AASHTO design default)" },
  wet: { f: 0.20, label: "Wet pavement (AASHTO conservative)" },
  ice: { f: 0.10, label: "Ice / packed snow" },
  custom: { f: null, label: "Custom (enter f directly)" },
};

// dims: in { speed_mph: L T^-1, reaction_time_s: T, friction: dimensionless, grade: dimensionless }
//        out: { perception_reaction_ft: L, braking_distance_ft: L, total_ssd_ft: L, speed_mph: L T^-1, reaction_time_s: T, friction: dimensionless, grade: dimensionless, warnings: dimensionless }
// (AASHTO Green Book Chapter 3: speed `L T^-1` * reaction time `T`
//  = perception-reaction distance `L`; braking distance v^2/(30*(f+g))
//  collapses to `L` because the 30 ft-per-mph^2 constant absorbs
//  the unit conversion. Friction coefficient and decimal grade are
//  dimensionless ratios.)
export function computeStoppingSightDistance({
  speed_mph = 0,
  reaction_time_s = 2.5,
  friction = 0.35,
  grade = 0.0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  grade = Number(grade);
  const v = Number(speed_mph) || 0;
  const t = Number(reaction_time_s);
  const f = Number(friction);
  const g = Number(grade) || 0;
  if (!(v > 0)) return { error: "Speed must be positive (mph)." };
  if (!Number.isFinite(t) || !(t > 0)) return { error: "Perception-reaction time must be positive (s)." };
  if (!Number.isFinite(f) || !(f > -1)) return { error: "Friction coefficient must be a number > -1." };
  if (f + g <= 0) return { error: "Effective deceleration (f + g) must be positive; the vehicle cannot stop under these conditions." };

  const d_pr_ft = 1.47 * v * t;
  const d_br_ft = (v * v) / (30 * (f + g));
  const d_total_ft = d_pr_ft + d_br_ft;

  const warnings = [];
  if (v < 5) warnings.push("Speed below 5 mph is below the AASHTO design range; the formula is not calibrated for very low speeds.");
  if (f < 0.05) warnings.push("Friction coefficient below 0.05 indicates essentially uncontrolled conditions; do not drive in these conditions.");
  if (Math.abs(g) > 0.10) warnings.push("Grade magnitude above 10% is at the extreme of the AASHTO design range; consult the state-DOT specifics.");

  return {
    perception_reaction_ft: d_pr_ft,
    braking_distance_ft: d_br_ft,
    total_ssd_ft: d_total_ft,
    speed_mph: v,
    reaction_time_s: t,
    friction,
    grade,
    warnings,
  };
}

export const stoppingSightDistanceExample = {
  // 55 mph design speed on dry, level pavement (AASHTO default
  // t_pr = 2.5 s, f = 0.35) -> 202 + 288 = 490 ft.
  inputs: { speed_mph: 55, reaction_time_s: 2.5, friction: 0.35, grade: 0 },
};

// dims: in { sight_distance_ft: L, reaction_time_s: T, friction: dimensionless, grade: dimensionless } out: { design_speed_mph: L T^-1 }
export function computeSsdDesignSpeed({ sight_distance_ft = 0, reaction_time_s = 2.5, friction = 0.35, grade = 0.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D = Number(sight_distance_ft) || 0;
  const t = Number(reaction_time_s);
  const f = Number(friction);
  const g = Number(grade) || 0;
  if (!(D > 0)) return { error: "Available sight distance must be positive (ft)." };
  if (!Number.isFinite(t) || !(t > 0)) return { error: "Perception-reaction time must be positive (s)." };
  if (!Number.isFinite(f) || !(f > -1)) return { error: "Friction coefficient must be a number > -1." };
  if (f + g <= 0) return { error: "Effective deceleration (f + g) must be positive; the vehicle cannot stop under these conditions." };
  // Inverse of D = 1.47 t v + v^2 / (30 (f+g)): solve a v^2 + b v - D = 0 for the positive root.
  const a = 1 / (30 * (f + g));
  const b = 1.47 * t;
  const design_speed_mph = (-b + Math.sqrt(b * b + 4 * a * D)) / (2 * a);
  if (!Number.isFinite(design_speed_mph) || !(design_speed_mph > 0)) return { error: "Speed math is not a finite positive value." };
  const warnings = [];
  if (design_speed_mph < 5) warnings.push("The resulting speed is below 5 mph, under the AASHTO design range; the formula is not calibrated for very low speeds.");
  if (Math.abs(g) > 0.10) warnings.push("Grade magnitude above 10% is at the extreme of the AASHTO design range; consult the state-DOT specifics.");
  return {
    design_speed_mph, reaction_time_s: t, friction: f, grade: g, warnings,
    note: "The fastest design speed a stretch of road can safely allow given the available stopping sight distance, the inverse of the stopping-sight-distance tile: from SSD = 1.47 x t x v + v^2 / (30 (f + g)), the speed is the positive root of a v^2 + b v - SSD = 0 with a = 1/(30(f+g)) and b = 1.47 x t. Use it to set a curve/crest advisory speed or to check whether a design speed is safe for the sight line to an intersection or over a hill. Braking distance grows with the square of speed while reaction distance grows linearly, so a modest sight-distance shortfall forces a larger speed cut than it seems. A downhill grade (negative) lengthens the stop and lowers the safe speed; wet or icy friction lowers it further. A design aid, not a posted-speed determination; the AASHTO Green Book and the state DOT govern."
  };
}
export const ssdDesignSpeedExample = { inputs: { sight_distance_ft: 490, reaction_time_s: 2.5, friction: 0.35, grade: 0 } };

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mounting renderer: the three arguments are HTMLElement
//  references, all categorical from the dimensional-analysis
//  perspective (dimensionless). The function returns void; the
//  sentinel `dom_side_effect` records that the export carries no
//  measured output. Per the v14 §7.1 contract, renderers are
//  annotated so the lint can hard-gate every export uniformly,
//  even when the export is a UI shell.)
export function renderStoppingSightDistance(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per AASHTO Green Book (Policy on Geometric Design of Highways and Streets, 7th ed.) Chapter 3 stopping sight distance. AASHTO publishes design SSD tables; this calculator outputs the underlying physics. AHJ (state DOT) governs roadway design. Free at transportation.org for TOC.";

  const v = makeNumber("Speed (mph)", "ssd-v", { step: "any", min: "0" });
  const tpr = makeNumber("Perception-reaction time (s; default 2.5)", "ssd-tpr", { step: "any", min: "0", value: "2.5" });
  tpr.input.value = "2.5";
  const cond = makeSelect("Pavement condition", "ssd-cond",
    Object.keys(SSD_FRICTION_DEFAULTS).map((k) => ({ value: k, label: SSD_FRICTION_DEFAULTS[k].label, selected: k === "dry" })),
  );
  const f = makeNumber("Friction coefficient f (set from condition or enter directly)", "ssd-f", { step: "any", value: "0.35" });
  f.input.value = "0.35";
  const g = makeNumber("Grade (decimal; + uphill, - downhill)", "ssd-g", { step: "any", value: "0" });
  g.input.value = "0";
  for (const fld of [v, tpr, cond, f, g]) inputRegion.appendChild(fld.wrap);

  cond.select.addEventListener("change", () => {
    const p = SSD_FRICTION_DEFAULTS[cond.select.value];
    if (p && p.f !== null) {
      f.input.value = String(p.f);
      update();
    }
  });

  attachExampleButton(inputRegion, () => {
    v.input.value = "55"; tpr.input.value = "2.5"; cond.select.value = "dry"; f.input.value = "0.35"; g.input.value = "0"; update();
  });

  const oPR = makeOutputLine(outputRegion, "Perception-reaction distance (ft)", "ssd-out-pr");
  const oBR = makeOutputLine(outputRegion, "Braking distance (ft)", "ssd-out-br");
  const oT = makeOutputLine(outputRegion, "Total SSD (ft)", "ssd-out-t");
  const oW = makeOutputLine(outputRegion, "Notes", "ssd-out-w");

  function readNum(input) {
    if (input.value === "") return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }
  const update = debounce(() => {
    const r = computeStoppingSightDistance({
      speed_mph: readNum(v.input),
      reaction_time_s: readNum(tpr.input),
      friction: readNum(f.input),
      grade: readNum(g.input),
    });
    if (r.error) {
      oPR.textContent = r.error; oBR.textContent = ""; oT.textContent = ""; oW.textContent = "";
      return;
    }
    oPR.textContent = fmt(r.perception_reaction_ft, 1) + " ft";
    oBR.textContent = fmt(r.braking_distance_ft, 1) + " ft";
    oT.textContent = fmt(r.total_ssd_ft, 1) + " ft";
    oW.textContent = r.warnings.length > 0 ? r.warnings.join(" ") : "AASHTO physics formula; state DOT design SSD tables round these numbers.";
  }, DEBOUNCE_MS);
  for (const fld of [v.input, tpr.input, f.input, g.input]) fld.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderSsdDesignSpeed(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AASHTO Green Book stopping sight distance solved for speed: v is the positive root of v^2/(30(f+g)) + 1.47 t v - SSD = 0. A design aid; the AASHTO Green Book and the state DOT govern posted and design speeds. Free at transportation.org for TOC.";
  const d = makeNumber("Available sight distance (ft)", "sds-d", { step: "any", min: "0" });
  const tpr = makeNumber("Perception-reaction time (s; default 2.5)", "sds-tpr", { step: "any", min: "0", value: "2.5" });
  tpr.input.value = "2.5";
  const cond = makeSelect("Pavement condition", "sds-cond",
    Object.keys(SSD_FRICTION_DEFAULTS).map((k) => ({ value: k, label: SSD_FRICTION_DEFAULTS[k].label, selected: k === "dry" })),
  );
  const f = makeNumber("Friction coefficient f (set from condition or enter directly)", "sds-f", { step: "any", value: "0.35" });
  f.input.value = "0.35";
  const g = makeNumber("Grade (decimal; + uphill, - downhill)", "sds-g", { step: "any", value: "0" });
  g.input.value = "0";
  for (const fld of [d, tpr, cond, f, g]) inputRegion.appendChild(fld.wrap);
  cond.select.addEventListener("change", () => { const p = SSD_FRICTION_DEFAULTS[cond.select.value]; if (p && p.f !== null) { f.input.value = String(p.f); update(); } });
  attachExampleButton(inputRegion, () => { d.input.value = "490"; tpr.input.value = "2.5"; cond.select.value = "dry"; f.input.value = "0.35"; g.input.value = "0"; update(); });
  const oSpeed = makeOutputLine(outputRegion, "Max safe design speed", "sds-out-speed");
  const oNote = makeOutputLine(outputRegion, "Note", "sds-out-note");
  function readNum(input) { if (input.value === "") return null; const n = Number(input.value); return Number.isFinite(n) ? n : null; }
  const update = debounce(() => {
    const r = computeSsdDesignSpeed({ sight_distance_ft: readNum(d.input), reaction_time_s: readNum(tpr.input), friction: readNum(f.input), grade: readNum(g.input) });
    if (r.error) { oSpeed.textContent = r.error; oNote.textContent = ""; return; }
    oSpeed.textContent = fmt(r.design_speed_mph, 1) + " mph";
    oNote.textContent = (r.warnings.length ? r.warnings.join(" ") + " " : "") + r.note;
  }, DEBOUNCE_MS);
  for (const fld of [d.input, tpr.input, f.input, g.input]) fld.addEventListener("input", update);
}

// --- v774: Low-speed off-tracking (`truck-off-tracking`) ---
// The rear axle of a turning vehicle tracks inside the front axle's path by
// OT = R - sqrt(R^2 - sum(L_i^2)), R the turn radius and L_i each unit's
// wheelbase (tractor wheelbase + trailer kingpin to axle for a combination).
// dims: in { turn_radius_ft: L, wheelbase1_ft: L, wheelbase2_ft: L } out: { off_tracking_ft: L, effective_wheelbase_ft: L, sum_wb_sq_ft2: L^2 }
export function computeTruckOffTracking({ turn_radius_ft = 0, wheelbase1_ft = 0, wheelbase2_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const R = Number(turn_radius_ft) || 0;
  const L1 = Number(wheelbase1_ft) || 0;
  const L2 = Number(wheelbase2_ft) || 0;
  if (!(R > 0)) return { error: "Turn radius must be positive (ft)." };
  if (!(L1 > 0)) return { error: "The first (tractor) wheelbase must be positive (ft)." };
  if (L2 < 0) return { error: "The second wheelbase cannot be negative (ft)." };
  const sum_wb_sq_ft2 = L1 * L1 + L2 * L2;
  const effective_wheelbase_ft = Math.sqrt(sum_wb_sq_ft2);
  if (!(R > effective_wheelbase_ft)) return { error: "Turn radius must exceed the effective wheelbase (sqrt of the sum of squared wheelbases); the vehicle cannot hold this turn." };
  const off_tracking_ft = R - Math.sqrt(R * R - sum_wb_sq_ft2);
  return {
    off_tracking_ft, effective_wheelbase_ft, sum_wb_sq_ft2,
    note: "Low-speed (geometric) off-tracking: the rearmost axle tracks OT = R - sqrt(R^2 - sum(L_i^2)) inside the front axle's turn radius R, where each L_i is a unit's wheelbase - for a tractor-trailer, the tractor wheelbase and the trailer's kingpin-to-rear-axle distance, summed in quadrature. Enter the turn radius your path reference uses (centerline or outer wheelpath) consistently. This is the steady-state low-speed value used to check whether a truck stays in its lane on a turn or intersection; high-speed off-tracking (which swings the rear OUTward) and the trailer swept-path width (add the vehicle width) are separate. Per the AASHTO Green Book low-speed off-tracking relation; the design vehicle and the agency govern.",
  };
}
export const truckOffTrackingExample = { inputs: { turn_radius_ft: 50, wheelbase1_ft: 20, wheelbase2_ft: 0 } };

function renderTruckOffTracking(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AASHTO Green Book low-speed off-tracking OT = R - sqrt(R^2 - sum(L_i^2)), R the turn radius and L_i each unit's wheelbase (tractor wheelbase + trailer kingpin to axle for a combination), summed in quadrature. Steady-state low-speed value; high-speed off-tracking and swept-path width are separate. The design vehicle and the agency govern.";
  const R = makeNumber("Turn radius R (ft)", "tot-r", { step: "any", min: "0" });
  const l1 = makeNumber("Tractor / unit wheelbase (ft)", "tot-l1", { step: "any", min: "0" });
  const l2 = makeNumber("Trailer kingpin-to-axle (ft; 0 if single unit)", "tot-l2", { step: "any", min: "0" });
  for (const f of [R, l1, l2]) inputRegion.appendChild(f.wrap);
  const oOT = makeOutputLine(outputRegion, "Off-tracking (rear inside front)", "tot-out-ot");
  const oWB = makeOutputLine(outputRegion, "Effective wheelbase", "tot-out-wb");
  const oNote = makeOutputLine(outputRegion, "Note", "tot-out-note");
  const update = debounce(() => {
    const r = computeTruckOffTracking({ turn_radius_ft: Number(R.input.value) || 0, wheelbase1_ft: Number(l1.input.value) || 0, wheelbase2_ft: Number(l2.input.value) || 0 });
    if (r.error) { oOT.textContent = r.error; oWB.textContent = "-"; oNote.textContent = ""; return; }
    oOT.textContent = fmt(r.off_tracking_ft, 2) + " ft";
    oWB.textContent = fmt(r.effective_wheelbase_ft, 2) + " ft";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { R.input.value = "50"; l1.input.value = "20"; l2.input.value = ""; update(); });
  for (const f of [R.input, l1.input, l2.input]) f.addEventListener("input", update);
}

// --- spec-v1218: swept-path width (`truck-swept-path-width`) ---
// The truck-off-tracking tile names this gap ("the trailer swept-path width (add
// the vehicle width) are separate"). The swept path is the total roadway width a
// turning vehicle covers: SPW = vehicle width + off-tracking (+ the outer front
// corner's swing-out). OT = R - sqrt(R^2 - sum(L_i^2)) as in the sibling.
// dims: in { turn_radius_ft: L, wheelbase1_ft: L, wheelbase2_ft: L, vehicle_width_ft: L, front_swingout_ft: L } out: { off_tracking_ft: L, swept_path_width_ft: L, effective_wheelbase_ft: L }
export function computeTruckSweptPathWidth({ turn_radius_ft = 0, wheelbase1_ft = 0, wheelbase2_ft = 0, vehicle_width_ft = 8.5, front_swingout_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const R = Number(turn_radius_ft) || 0;
  const L1 = Number(wheelbase1_ft) || 0;
  const L2 = Number(wheelbase2_ft) || 0;
  const W = Number(vehicle_width_ft) || 0;
  const FS = Number(front_swingout_ft) || 0;
  if (!(R > 0)) return { error: "Turn radius must be positive (ft)." };
  if (!(L1 > 0)) return { error: "The first (tractor) wheelbase must be positive (ft)." };
  if (L2 < 0) return { error: "The second wheelbase cannot be negative (ft)." };
  if (!(W > 0)) return { error: "Vehicle width must be positive (ft)." };
  if (FS < 0) return { error: "Front swing-out cannot be negative (ft)." };
  const sum_wb_sq = L1 * L1 + L2 * L2;
  const effective_wheelbase_ft = Math.sqrt(sum_wb_sq);
  if (!(R > effective_wheelbase_ft)) return { error: "Turn radius must exceed the effective wheelbase (sqrt of the sum of squared wheelbases); the vehicle cannot hold this turn." };
  const off_tracking_ft = R - Math.sqrt(R * R - sum_wb_sq);
  const swept_path_width_ft = W + off_tracking_ft + FS;
  if (![off_tracking_ft, swept_path_width_ft, effective_wheelbase_ft].every(Number.isFinite)) return { error: "Swept-path math is not a finite value." };
  return {
    off_tracking_ft, swept_path_width_ft, effective_wheelbase_ft, vehicle_width_ft: W, front_swingout_ft: FS,
    note: "The swept-path width, the total roadway width a turning vehicle covers, the number a turn lane or intersection is sized on: SPW = vehicle width + low-speed off-tracking (+ the outer front corner's swing-out). The off-tracking OT = R - sqrt(R^2 - sum(L_i^2)) is how far the rearmost axle tracks INSIDE the front axle's turn radius R (each L_i a unit's wheelbase, summed in quadrature -- tractor wheelbase plus the trailer kingpin-to-axle for a combination), exactly the truck-off-tracking tile's value. Adding the body width W gives the band of pavement the vehicle occupies. A single unit (20 ft wheelbase, 8.5 ft wide) on a 50 ft turn sweeps 12.7 ft; a tractor-trailer (20 ft + 40 ft) on the same turn sweeps 36.1 ft -- why a long combination needs a wide turn lane or a larger curb radius. The front swing-out (the outer front corner reaching outboard of the front wheel path) is added if entered, from the design vehicle's turning template; it defaults to zero. This is the steady-state low-speed value; high-speed off-tracking (the rear swinging OUTward at speed) is separate. Per the AASHTO Green Book; the design vehicle and the agency govern.",
  };
}
export const truckSweptPathWidthExample = { inputs: { turn_radius_ft: 50, wheelbase1_ft: 20, wheelbase2_ft: 40, vehicle_width_ft: 8.5, front_swingout_ft: 0 } };
function renderTruckSweptPathWidth(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AASHTO Green Book swept-path width SPW = vehicle width + off-tracking (+ front swing-out), with OT = R - sqrt(R^2 - sum(L_i^2)) the low-speed off-tracking (R the turn radius, L_i each unit's wheelbase in quadrature). The roadway width a turning truck covers; high-speed off-tracking is separate. The design vehicle and the agency govern.";
  const R = makeNumber("Turn radius R (ft)", "tsp-r", { step: "any", min: "0" });
  const l1 = makeNumber("Tractor / unit wheelbase (ft)", "tsp-l1", { step: "any", min: "0" });
  const l2 = makeNumber("Trailer kingpin-to-axle (ft; 0 if single unit)", "tsp-l2", { step: "any", min: "0" });
  const w = makeNumber("Vehicle width (ft; ~8.5 legal max)", "tsp-w", { step: "any", min: "0" });
  const fs = makeNumber("Front swing-out (ft; 0, or from the turning template)", "tsp-fs", { step: "any", min: "0" });
  for (const f of [R, l1, l2, w, fs]) inputRegion.appendChild(f.wrap);
  const oSPW = makeOutputLine(outputRegion, "Swept-path width", "tsp-out-spw");
  const oOT = makeOutputLine(outputRegion, "Off-tracking (rear inside front)", "tsp-out-ot");
  const oNote = makeOutputLine(outputRegion, "Note", "tsp-out-note");
  const update = debounce(() => {
    const r = computeTruckSweptPathWidth({ turn_radius_ft: Number(R.input.value) || 0, wheelbase1_ft: Number(l1.input.value) || 0, wheelbase2_ft: Number(l2.input.value) || 0, vehicle_width_ft: Number(w.input.value) || 0, front_swingout_ft: Number(fs.input.value) || 0 });
    if (r.error) { oSPW.textContent = r.error; oOT.textContent = "-"; oNote.textContent = ""; return; }
    oSPW.textContent = fmt(r.swept_path_width_ft, 2) + " ft";
    oOT.textContent = fmt(r.off_tracking_ft, 2) + " ft";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { R.input.value = "50"; l1.input.value = "20"; l2.input.value = "40"; w.input.value = "8.5"; fs.input.value = "0"; update(); });
  for (const f of [R.input, l1.input, l2.input, w.input, fs.input]) f.addEventListener("input", update);
}

export const TRUCKING_RENDERERS = {
  "truck-off-tracking": renderTruckOffTracking,
  "truck-swept-path-width": renderTruckSweptPathWidth,
  "ssd-design-speed": renderSsdDesignSpeed,
  "dim-weight":      renderDIM,
  "freight-density": renderFreightDensity,
  "pallet-loadout":  renderPalletLoadout,
  "hos-math":        renderHOS,
  "bridge-formula":  renderBridgeFormula,
  "bridge-formula-min-spacing": renderBridgeFormulaMinSpacing,
  "reefer-burn":     renderReeferBurn,
  "incoterm-decoder": renderIncoterm,
  // v9
  "stopping-sight-distance": renderStoppingSightDistance,
};

// =====================================================================
// v23 J.1: Cargo securement working-load-limit check (FMCSA 49 CFR 393)
// =====================================================================
// The aggregate working load limit of the tiedowns must be at least half
// the cargo weight, and the count rule requires a minimum number of
// tiedowns for the article length. WLLs are user-supplied from the marked
// hardware (the lowest-rated component governs each tiedown).
//
// dims: in { cargo_weight_lb: M, tiedown_count: dimensionless, wll_each_lb: M, cargo_length_ft: L } out: { aggregate_wll_lb: M, required_wll_lb: M, min_tiedowns: dimensionless, pass: dimensionless }
export function computeCargoSecurementWLL({ cargo_weight_lb = 0, tiedown_count = 0, wll_each_lb = 0, cargo_length_ft = 0 } = {}) {
  const W = Number(cargo_weight_lb) || 0;
  const n = Math.floor(Number(tiedown_count) || 0);
  const wll = Number(wll_each_lb) || 0;
  const len = Number(cargo_length_ft) || 0;
  if (!(W > 0 && Number.isFinite(W))) return { error: "Cargo weight must be positive (lb)." };
  if (!(n > 0 && Number.isFinite(n))) return { error: "Tiedown count must be a positive whole number." };
  if (!(wll > 0 && Number.isFinite(wll))) return { error: "Per-tiedown WLL must be positive (lb)." };
  if (!(len > 0 && Number.isFinite(len))) return { error: "Cargo length must be positive (ft)." };
  const aggregate_wll_lb = n * wll;
  const required_wll_lb = 0.5 * W;
  // 49 CFR 393.110(b) count rule: <=5 ft -> 1 tiedown (2 if >1100 lb);
  // >5 ft to 10 ft -> 2 tiedowns; >10 ft -> 2 for the first 10 ft plus 1 for
  // each additional 10 ft or fraction thereof.
  const min_tiedowns = len <= 5 ? (W > 1100 ? 2 : 1) : len <= 10 ? 2 : 2 + Math.ceil((len - 10) / 10);
  const pass = aggregate_wll_lb >= required_wll_lb && n >= min_tiedowns;
  return { aggregate_wll_lb, required_wll_lb, min_tiedowns, tiedown_count: n, pass };
}

export const cargoSecurementWllExample = { inputs: { cargo_weight_lb: 8000, tiedown_count: 4, wll_each_lb: 1500, cargo_length_ft: 16 } };

const renderCargoSecurementWLL = _simpleRenderer({
  citation: "Citation: Per FMCSA 49 CFR 393.100-393.136 cargo securement (the aggregate-WLL >= half-cargo-weight rule and the tiedown-count rule). WLLs are user-supplied from the marked hardware (the marked rating, not breaking strength; the lowest-rated component governs). Commodity-specific rules (logs, vehicles, coils, etc.) are out of scope. FMCSA enforces. Free at ecfr.gov.",
  example: cargoSecurementWllExample.inputs,
  fields: [
    { key: "cargo_weight_lb", label: "Cargo weight (lb)", kind: "number" },
    { key: "cargo_length_ft", label: "Article length (ft)", kind: "number" },
    { key: "tiedown_count", label: "Number of tiedowns", kind: "number" },
    { key: "wll_each_lb", label: "WLL per tiedown (lb, marked)", kind: "number" },
  ],
  outputs: [
    { key: "agg", id: "csw-out-agg", label: "Aggregate WLL", value: (r) => fmt(r.aggregate_wll_lb, 0) + " lb" },
    { key: "req", id: "csw-out-req", label: "Required (1/2 cargo weight)", value: (r) => fmt(r.required_wll_lb, 0) + " lb" },
    { key: "min", id: "csw-out-min", label: "Minimum tiedowns", value: (r) => String(r.min_tiedowns) + " (have " + r.tiedown_count + ")" },
    { key: "pass", id: "csw-out-pass", label: "Verdict", value: (r) => r.pass ? "PASS - meets aggregate WLL and count" : "FAIL - add WLL or tiedowns" },
  ],
  compute: computeCargoSecurementWLL,
});
TRUCKING_RENDERERS["cargo-securement-wll"] = renderCargoSecurementWLL;

// =====================================================================
// v23 J.2: IFTA per-jurisdiction fuel tax (IFTA Articles of Agreement)
// =====================================================================
// Per-jurisdiction net tax for an IFTA quarterly return: taxable gallons
// (miles / fleet MPG) priced at the jurisdiction rate, less tax already
// paid at the pump on gallons purchased there. Run once per jurisdiction
// and sum the net column for the return; a negative net is a credit.
//
// dims: in { miles: L, fleet_mpg: dimensionless, tax_rate_per_gal: dimensionless, gallons_purchased: dimensionless } out: { taxable_gallons: dimensionless, tax_on_consumption: dimensionless, tax_paid_at_pump: dimensionless, net_tax: dimensionless }
export function computeFuelTaxIFTA({ miles = 0, fleet_mpg = 0, tax_rate_per_gal = 0, gallons_purchased = 0 } = {}) {
  const mi = Number(miles) || 0;
  const mpg = Number(fleet_mpg) || 0;
  const rate = Number(tax_rate_per_gal) || 0;
  const purchased = Number(gallons_purchased) || 0;
  if (!(mpg > 0 && Number.isFinite(mpg))) return { error: "Fleet MPG must be positive." };
  if (!(mi >= 0 && Number.isFinite(mi))) return { error: "Miles must be zero or positive." };
  if (!(rate >= 0 && Number.isFinite(rate))) return { error: "Tax rate must be zero or positive ($/gal)." };
  if (!(purchased >= 0 && Number.isFinite(purchased))) return { error: "Gallons purchased must be zero or positive." };
  const taxable_gallons = mi / mpg;
  const tax_on_consumption = taxable_gallons * rate;
  const tax_paid_at_pump = purchased * rate;
  const net_tax = tax_on_consumption - tax_paid_at_pump;
  return { taxable_gallons, tax_on_consumption, tax_paid_at_pump, net_tax, is_credit: net_tax < 0 };
}

export const fuelTaxIftaExample = { inputs: { miles: 1200, fleet_mpg: 6, tax_rate_per_gal: 0.30, gallons_purchased: 150 } };

const renderFuelTaxIFTA = _simpleRenderer({
  citation: "Citation: Per the IFTA Articles of Agreement quarterly-return method (taxable gallons = miles / fleet MPG, net = consumption tax - tax paid at the pump). Per-jurisdiction rates change quarterly and are user-supplied. Run once per jurisdiction and sum the net column; a negative net is a credit. The base jurisdiction's return governs. Free at iftach.org.",
  example: fuelTaxIftaExample.inputs,
  fields: [
    { key: "miles", label: "Miles in jurisdiction", kind: "number" },
    { key: "fleet_mpg", label: "Fleet average MPG", kind: "number" },
    { key: "tax_rate_per_gal", label: "Tax rate ($/gal, this jurisdiction)", kind: "number" },
    { key: "gallons_purchased", label: "Gallons purchased in jurisdiction", kind: "number" },
  ],
  outputs: [
    { key: "tg", id: "ifta-out-tg", label: "Taxable gallons", value: (r) => fmt(r.taxable_gallons, 2) + " gal" },
    { key: "net", id: "ifta-out-net", label: "Net tax", value: (r) => (r.is_credit ? "credit " : "due ") + "$" + fmt(Math.abs(r.net_tax), 2) },
    { key: "detail", id: "ifta-out-detail", label: "Consumption vs. paid", value: (r) => "$" + fmt(r.tax_on_consumption, 2) + " consumed - $" + fmt(r.tax_paid_at_pump, 2) + " at pump" },
  ],
  compute: computeFuelTaxIFTA,
});
TRUCKING_RENDERERS["fuel-tax-ifta"] = renderFuelTaxIFTA;

// ===========================================================================
// spec-v20 Phase J - three new trucking tiles (v18/v21 tile contract).
// ===========================================================================

// --- v20 J.1: Operating cost per mile (`cost-per-mile`) ---
// fixed_cpm = fixed_monthly/miles; fuel_cpm = price/mpg; total = sum; break-even = total.
// dims: in { fixed_monthly: dimensionless, miles_month: L, fuel_price: dimensionless, mpg: dimensionless, maint_cpm: dimensionless, driver_cpm: dimensionless } out: { total_cpm: dimensionless, fuel_cpm: dimensionless }
export function computeCostPerMile({ fixed_monthly = 0, miles_month = 0, fuel_price = 0, mpg = 0, maint_cpm = 0, driver_cpm = 0 } = {}) {
  const fixed = Number(fixed_monthly) || 0;
  const miles = Number(miles_month) || 0;
  const price = Number(fuel_price) || 0;
  const mpgN = Number(mpg) || 0;
  const maint = Number(maint_cpm) || 0;
  const driver = Number(driver_cpm) || 0;
  if (!(miles > 0 && Number.isFinite(miles))) return { error: "Miles per month must be positive." };
  if (!(mpgN > 0 && Number.isFinite(mpgN))) return { error: "Fuel economy (mpg) must be positive." };
  if (!Number.isFinite(fixed) || !Number.isFinite(price) || !Number.isFinite(maint) || !Number.isFinite(driver)) return { error: "Costs must be finite numbers." };
  if (fixed < 0 || price < 0 || maint < 0 || driver < 0) return { error: "Costs must be non-negative." };
  const fixedCpm = fixed / miles;
  const fuelCpm = price / mpgN;
  const total = fixedCpm + fuelCpm + maint + driver;
  return {
    fixed_cpm: Number.isFinite(fixedCpm) ? fixedCpm : null,
    fuel_cpm: Number.isFinite(fuelCpm) ? fuelCpm : null,
    maint_cpm: maint, driver_cpm: driver,
    total_cpm: Number.isFinite(total) ? total : null,
    breakeven_rate: Number.isFinite(total) ? total : null,
    note: "ATRI cost-bucket methodology. Deadhead miles should be in the mileage base or fixed costs are understated per mile. Break-even rate equals the total cost per mile.",
  };
}
export const costPerMileExample = { inputs: { fixed_monthly: 6000, miles_month: 10000, fuel_price: 4.0, mpg: 6.5, maint_cpm: 0.18, driver_cpm: 0.65 } };

function renderCostPerMile(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Cost-per-mile bucket methodology per ATRI (American Transportation Research Institute), 'An Analysis of the Operational Costs of Trucking', by name; arithmetic is public and all figures are user-supplied. Deadhead miles should be in the mileage base. Report free at truckingresearch.org.";
  const fixed = makeNumber("Fixed monthly costs ($)", "cpm-fixed", { step: "any", min: "0" });
  const miles = makeNumber("Miles per month", "cpm-miles", { step: "any", min: "0" });
  const price = makeNumber("Fuel price ($/gal)", "cpm-price", { step: "any", min: "0" });
  const mpg = makeNumber("Fuel economy (mpg)", "cpm-mpg", { step: "any", min: "0" });
  const maint = makeNumber("Maintenance ($/mi)", "cpm-maint", { step: "any", min: "0" });
  const driver = makeNumber("Driver pay ($/mi)", "cpm-driver", { step: "any", min: "0" });
  for (const f of [fixed, miles, price, mpg, maint, driver]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { fixed.input.value = "6000"; miles.input.value = "10000"; price.input.value = "4.0"; mpg.input.value = "6.5"; maint.input.value = "0.18"; driver.input.value = "0.65"; update(); });
  const oTotal = makeOutputLine(outputRegion, "Total cost per mile", "cpm-out-total");
  const oBreak = makeOutputLine(outputRegion, "Cost buckets (fixed / fuel)", "cpm-out-break");
  const oNote = makeOutputLine(outputRegion, "Note", "cpm-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeCostPerMile({ fixed_monthly: readNum(fixed.input), miles_month: readNum(miles.input), fuel_price: readNum(price.input), mpg: readNum(mpg.input), maint_cpm: readNum(maint.input), driver_cpm: readNum(driver.input) });
    if (r.error) { oTotal.textContent = r.error; oBreak.textContent = ""; oNote.textContent = ""; return; }
    oTotal.textContent = "$" + fmt(r.total_cpm, 3) + "/mi (break-even)";
    oBreak.textContent = "$" + fmt(r.fixed_cpm, 3) + " fixed + $" + fmt(r.fuel_cpm, 3) + " fuel + $" + fmt(r.maint_cpm, 3) + " maint + $" + fmt(r.driver_cpm, 3) + " driver";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [fixed.input, miles.input, price.input, mpg.input, maint.input, driver.input]) f.addEventListener("input", update);
}
TRUCKING_RENDERERS["cost-per-mile"] = renderCostPerMile;

// --- v20 J.2: Deadhead percentage and effective rate (`deadhead-percent`) ---
// dims: in { loaded_mi: L, deadhead_mi: L, revenue: dimensionless, surcharge: dimensionless } out: { deadhead_pct: dimensionless, rate_loaded: dimensionless }
export function computeDeadheadPercent({ loaded_mi = 0, deadhead_mi = 0, revenue = 0, surcharge = 0 } = {}) {
  const loaded = Number(loaded_mi) || 0;
  const dead = Number(deadhead_mi) || 0;
  const rev = Number(revenue) || 0;
  const sur = Number(surcharge) || 0;
  if (!(loaded > 0 && Number.isFinite(loaded))) return { error: "Loaded miles must be positive." };
  if (dead < 0 || !Number.isFinite(dead)) return { error: "Deadhead miles must be non-negative." };
  if (rev < 0 || !Number.isFinite(rev)) return { error: "Revenue must be non-negative." };
  const total = loaded + dead;
  const pct = dead / total * 100;
  const totalRev = rev + sur;
  const rateLoaded = totalRev / loaded;
  const rateTotal = totalRev / total;
  return {
    total_miles: total,
    deadhead_pct: Number.isFinite(pct) ? pct : null,
    rate_loaded: Number.isFinite(rateLoaded) ? rateLoaded : null,
    rate_total: Number.isFinite(rateTotal) ? rateTotal : null,
    high_deadhead: pct > 25,
    note: (pct > 25 ? "Deadhead above ~25% - profitability warning (advisory). " : "")
      + "Rate per total mile is the effective loaded rate after absorbing empty miles. Fuel surcharge is added once, not double-counted against the empty leg.",
  };
}
export const deadheadPercentExample = { inputs: { loaded_mi: 800, deadhead_mi: 120, revenue: 1840, surcharge: 0 } };

function renderDeadheadPercent(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Freight-economics arithmetic; FMCSA/DOT terminology ('deadhead' = unladen movement), by name. Public definitions, no proprietary table. Rate per total mile is the effective loaded rate after absorbing empty miles.";
  const loaded = makeNumber("Loaded miles", "dh-loaded", { step: "any", min: "0" });
  const dead = makeNumber("Deadhead miles", "dh-dead", { step: "any", min: "0" });
  const rev = makeNumber("Linehaul revenue ($)", "dh-rev", { step: "any", min: "0" });
  const sur = makeNumber("Fuel surcharge ($, optional)", "dh-sur", { step: "any", min: "0" });
  for (const f of [loaded, dead, rev, sur]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { loaded.input.value = "800"; dead.input.value = "120"; rev.input.value = "1840"; sur.input.value = ""; update(); });
  const oPct = makeOutputLine(outputRegion, "Deadhead %", "dh-out-pct");
  const oRate = makeOutputLine(outputRegion, "Rate per loaded / total mile", "dh-out-rate");
  const oNote = makeOutputLine(outputRegion, "Note", "dh-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeDeadheadPercent({ loaded_mi: readNum(loaded.input), deadhead_mi: readNum(dead.input), revenue: readNum(rev.input), surcharge: readNum(sur.input) });
    if (r.error) { oPct.textContent = r.error; oRate.textContent = ""; oNote.textContent = ""; return; }
    oPct.textContent = fmt(r.deadhead_pct, 1) + "% (" + fmt(r.total_miles, 0) + " total mi)";
    oRate.textContent = "$" + fmt(r.rate_loaded, 2) + "/loaded mi, $" + fmt(r.rate_total, 2) + "/total mi";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [loaded.input, dead.input, rev.input, sur.input]) f.addEventListener("input", update);
}
TRUCKING_RENDERERS["deadhead-percent"] = renderDeadheadPercent;

// --- v20 J.3: Axle-load tandem slide (`axle-load-distribution`) ---
// Lever-arm: moving the tandem d inches changes the trailer reaction by
// dW = load * d / L. Holes = target_shift / shift_per_hole, rounded up.
// dims: in { drive_lb: M*L*T^-2, trailer_lb: M*L*T^-2, kingpin_to_tandem_in: L, hole_spacing_in: L, tandem_cap: M*L*T^-2 } out: { shift_per_hole_lb: M*L*T^-2, holes: dimensionless }
export function computeAxleLoadDistribution({ drive_lb = 0, trailer_lb = 0, kingpin_to_tandem_in = 0, hole_spacing_in = 6, tandem_cap = 34000 } = {}) {
  const drive = Number(drive_lb) || 0;
  const trailer = Number(trailer_lb) || 0;
  const L = Number(kingpin_to_tandem_in) || 0;
  const spacing = Number(hole_spacing_in) || 0;
  const cap = Number(tandem_cap) || 0;
  if (!(drive > 0 && Number.isFinite(drive))) return { error: "Drive-tandem weight must be positive (lb)." };
  if (!(trailer > 0 && Number.isFinite(trailer))) return { error: "Trailer-tandem weight must be positive (lb)." };
  if (!(L > 0 && Number.isFinite(L))) return { error: "Kingpin-to-tandem distance must be positive (in)." };
  if (!(spacing > 0 && Number.isFinite(spacing))) return { error: "Hole spacing must be positive (in)." };
  if (!(cap > 0 && Number.isFinite(cap))) return { error: "Legal tandem cap must be positive (lb)." };
  const shiftPerHole = trailer * spacing / L;
  const driveOver = drive - cap;
  const trailerOver = trailer - cap;
  let holes = 0, direction = "none", driveNew = drive, trailerNew = trailer, target = 0;
  if (driveOver > 0) {
    target = driveOver;
    holes = Math.ceil(target / shiftPerHole);
    direction = "forward"; // slide tandems forward to move weight from drives to trailer tandems
    driveNew = drive - holes * shiftPerHole;
    trailerNew = trailer + holes * shiftPerHole;
  } else if (trailerOver > 0) {
    target = trailerOver;
    holes = Math.ceil(target / shiftPerHole);
    direction = "back"; // slide tandems back to move weight from trailer to drives
    trailerNew = trailer - holes * shiftPerHole;
    driveNew = drive + holes * shiftPerHole;
  }
  const grossOver = (drive + trailer) > 2 * cap;
  return {
    shift_per_hole_lb: Number.isFinite(shiftPerHole) ? shiftPerHole : null,
    drive_over_lb: driveOver, trailer_over_lb: trailerOver,
    holes, direction,
    projected_drive_lb: Number.isFinite(driveNew) ? driveNew : null,
    projected_trailer_lb: Number.isFinite(trailerNew) ? trailerNew : null,
    fixes_both: Number.isFinite(driveNew) && Number.isFinite(trailerNew) && driveNew <= cap && trailerNew <= cap,
    note: (grossOver ? "Both groups average over cap - sliding cannot fix an over-gross load. " : "")
      + "Sliding redistributes between drive and trailer groups only. The steer limit is set by the fifth-wheel position, not the tandem slide. Bridge-formula spacing may bind before the cap.",
  };
}
export const axleLoadDistributionExample = { inputs: { drive_lb: 35200, trailer_lb: 32000, kingpin_to_tandem_in: 400, hole_spacing_in: 6, tandem_cap: 34000 } };

function renderAxleLoadDistribution(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per the federal axle/gross weight limits - 23 CFR 658.17 (12,000 lb steer, 34,000 lb tandem, 80,000 lb gross) and the federal Bridge Formula, by name; lever-arm statics is public. Cross-references the bridge-formula tile. FMCSA enforces. Free at ecfr.gov.";
  const drive = makeNumber("Drive-tandem weight (lb)", "ald-drive", { step: "any", min: "0" });
  const trailer = makeNumber("Trailer-tandem weight (lb)", "ald-trailer", { step: "any", min: "0" });
  const L = makeNumber("Kingpin-to-tandem distance (in)", "ald-l", { step: "any", min: "0" });
  const spacing = makeNumber("Hole spacing (in)", "ald-sp", { step: "any", min: "0" });
  const cap = makeNumber("Legal tandem cap (lb)", "ald-cap", { step: "any", min: "0" });
  for (const f of [drive, trailer, L, spacing, cap]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { drive.input.value = "35200"; trailer.input.value = "32000"; L.input.value = "400"; spacing.input.value = "6"; cap.input.value = "34000"; update(); });
  const oShift = makeOutputLine(outputRegion, "Weight shift per hole", "ald-out-shift");
  const oHoles = makeOutputLine(outputRegion, "Holes to slide / direction", "ald-out-holes");
  const oProj = makeOutputLine(outputRegion, "Projected drive / trailer", "ald-out-proj");
  const oNote = makeOutputLine(outputRegion, "Note", "ald-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeAxleLoadDistribution({ drive_lb: readNum(drive.input), trailer_lb: readNum(trailer.input), kingpin_to_tandem_in: readNum(L.input), hole_spacing_in: readNum(spacing.input), tandem_cap: readNum(cap.input) });
    if (r.error) { oShift.textContent = r.error; oHoles.textContent = ""; oProj.textContent = ""; oNote.textContent = ""; return; }
    oShift.textContent = fmt(r.shift_per_hole_lb, 0) + " lb/hole";
    oHoles.textContent = r.holes + " hole(s) " + (r.direction === "none" ? "(within limits)" : r.direction);
    oProj.textContent = fmt(r.projected_drive_lb, 0) + " lb drive / " + fmt(r.projected_trailer_lb, 0) + " lb trailer";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [drive.input, trailer.input, L.input, spacing.input, cap.input]) f.addEventListener("input", update);
}
TRUCKING_RENDERERS["axle-load-distribution"] = renderAxleLoadDistribution;

// =====================================================================
// spec-v91 J - owner-operator load economics: load-profitability,
// fuel-surcharge, maintenance-reserve. The per-load go/no-go, the
// pegged fuel-surcharge math, and the maintenance reserve per mile that
// keep an owner-operator solvent. GOVERNANCE.trucking. Consumes the same
// cost structure cost-per-mile builds; DOE/EIA diesel index for the FSC.
// =====================================================================

// dims: in { linehaul_revenue: dimensionless, loaded_miles: L, deadhead_miles: L, fuel_price: dimensionless, mpg: dimensionless, variable_cpm: dimensionless, fixed_per_day: dimensionless, days: dimensionless, tolls: dimensionless, other_costs: dimensionless } out: { net_profit: dimensionless, profit_per_loaded_mile: dimensionless }
export function computeLoadProfitability({ linehaul_revenue = 0, loaded_miles = 0, deadhead_miles = 0, fuel_price = 0, mpg = 0, variable_cpm = 0, fixed_per_day = 0, days = 0, tolls = 0, other_costs = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  deadhead_miles = Number(deadhead_miles); tolls = Number(tolls); other_costs = Number(other_costs);
  if (linehaul_revenue < 0 || deadhead_miles < 0 || variable_cpm < 0 || fixed_per_day < 0 || tolls < 0 || other_costs < 0) return { error: "Revenue, mileage, and cost inputs must be non-negative." };
  if (!(loaded_miles > 0)) return { error: "Loaded miles must be positive." };
  if (!(mpg > 0)) return { error: "Fuel economy (MPG) must be positive." };
  if (!(fuel_price > 0)) return { error: "Fuel price must be positive." };
  if (!(days > 0)) return { error: "Days must be positive." };
  const total_miles = loaded_miles + deadhead_miles;
  const fuel_cost = total_miles / mpg * fuel_price;
  const variable_cost = total_miles * variable_cpm;
  const fixed_cost = fixed_per_day * days;
  const total_cost = fuel_cost + variable_cost + fixed_cost + tolls + other_costs;
  const net_profit = linehaul_revenue - total_cost;
  return {
    total_miles, fuel_cost, total_cost, net_profit,
    profit_per_loaded_mile: net_profit / loaded_miles,
    rate_per_total_mile: linehaul_revenue / total_miles,
    all_in_cpm: total_cost / total_miles,
    note: "Deadhead miles burn fuel and hours but earn nothing, so judge a load on total miles, not the loaded miles the rate is quoted on. The all-in cost per mile is your break-even and consumes the same fixed and variable structure cost-per-mile builds. A load that pays well per loaded mile can still lose money after a long deadhead. Count the days the load ties up the truck against the loads you turn down to take it.",
  };
}
export const loadProfitabilityExample = { inputs: { linehaul_revenue: 2200, loaded_miles: 900, deadhead_miles: 150, fuel_price: 4.0, mpg: 6.5, variable_cpm: 0.20, fixed_per_day: 250, days: 2, tolls: 40, other_costs: 0 } };
const renderLoadProfitability = _simpleRenderer({
  citation: "Citation: First-principles owner-operator load economics. Net = revenue - (fuel + variable + fixed + tolls + accessorials); profit per loaded mile decides the load.",
  example: loadProfitabilityExample.inputs,
  fields: [
    { key: "linehaul_revenue", label: "Linehaul revenue ($, incl. FSC)", kind: "number" },
    { key: "loaded_miles", label: "Loaded miles", kind: "number" },
    { key: "deadhead_miles", label: "Deadhead miles", kind: "number" },
    { key: "fuel_price", label: "Diesel ($/gal)", kind: "number" },
    { key: "mpg", label: "Fuel economy (MPG)", kind: "number" },
    { key: "variable_cpm", label: "Variable cost ($/mi)", kind: "number" },
    { key: "fixed_per_day", label: "Fixed cost ($/day)", kind: "number" },
    { key: "days", label: "Days tied up", kind: "number" },
    { key: "tolls", label: "Tolls ($, optional)", kind: "number" },
    { key: "other_costs", label: "Lumpers / accessorials ($, optional)", kind: "number" },
  ],
  outputs: [
    { key: "m", id: "lp-out-m", label: "Total miles", value: (r) => fmt(r.total_miles, 0) + " mi" },
    { key: "f", id: "lp-out-f", label: "Fuel cost", value: (r) => "$" + fmt(r.fuel_cost, 2) },
    { key: "t", id: "lp-out-t", label: "Total cost", value: (r) => "$" + fmt(r.total_cost, 2) },
    { key: "n", id: "lp-out-n", label: "Net profit", value: (r) => "$" + fmt(r.net_profit, 2) },
    { key: "p", id: "lp-out-p", label: "Profit / loaded mi", value: (r) => "$" + fmt(r.profit_per_loaded_mile, 2) },
    { key: "r", id: "lp-out-r", label: "Revenue / total mi", value: (r) => "$" + fmt(r.rate_per_total_mile, 2) },
    { key: "c", id: "lp-out-c", label: "All-in break-even", value: (r) => "$" + fmt(r.all_in_cpm, 2) + "/mi" },
    { key: "z", id: "lp-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeLoadProfitability,
});
TRUCKING_RENDERERS["load-profitability"] = renderLoadProfitability;

// dims: in { current_fuel_price: dimensionless, base_fuel_price: dimensionless, mpg_peg: dimensionless, loaded_miles: L } out: { fsc_per_mile: dimensionless, fsc_total: dimensionless }
export function computeFuelSurcharge({ current_fuel_price = 0, base_fuel_price = 0, mpg_peg = 0, loaded_miles = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (loaded_miles < 0) return { error: "Loaded miles must be non-negative." };
  if (!(current_fuel_price > 0)) return { error: "Current fuel price must be positive." };
  if (!(base_fuel_price > 0)) return { error: "Base fuel price must be positive." };
  if (!(mpg_peg > 0)) return { error: "MPG peg must be positive." };
  const fsc_per_mile = current_fuel_price > base_fuel_price ? (current_fuel_price - base_fuel_price) / mpg_peg : 0;
  const fsc_total = loaded_miles > 0 ? fsc_per_mile * loaded_miles : null;
  return {
    fsc_per_mile,
    fsc_total: fsc_total != null && Number.isFinite(fsc_total) ? fsc_total : null,
    note: "The standard surcharge pegs a base price and pays the difference above it divided by an assumed MPG, so a lower MPG peg pays a higher surcharge (it assumes a thirstier truck). The DOE/EIA national average diesel price, updated weekly, is the common index, but the contract names the index that governs. Below the pegged base the surcharge is zero. A surcharge only protects you if the contract has one - negotiate it before you sign.",
  };
}
export const fuelSurchargeExample = { inputs: { current_fuel_price: 4.25, base_fuel_price: 3.0, mpg_peg: 6.0, loaded_miles: 900 } };
const renderFuelSurcharge = _simpleRenderer({
  citation: "Citation: Standard pegged fuel-surcharge identity (DOE/EIA weekly national average diesel index, by name). FSC/mi = (current - base) / MPG peg.",
  example: fuelSurchargeExample.inputs,
  fields: [
    { key: "current_fuel_price", label: "Current diesel ($/gal)", kind: "number" },
    { key: "base_fuel_price", label: "Pegged base ($/gal)", kind: "number" },
    { key: "mpg_peg", label: "MPG peg", kind: "number" },
    { key: "loaded_miles", label: "Loaded miles (optional)", kind: "number" },
  ],
  outputs: [
    { key: "p", id: "fsc-out-p", label: "Surcharge / mile", value: (r) => "$" + fmt(r.fsc_per_mile, 4) },
    { key: "t", id: "fsc-out-t", label: "Surcharge total", value: (r) => r.fsc_total === null ? "-" : "$" + fmt(r.fsc_total, 2) },
    { key: "n", id: "fsc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFuelSurcharge,
});
TRUCKING_RENDERERS["fuel-surcharge"] = renderFuelSurcharge;

// dims: in { tire_set_cost: dimensionless, tire_life_mi: L, pm_cost: dimensionless, pm_interval_mi: L, major_reserve_cpm: dimensionless, monthly_miles: L } out: { total_cpm: dimensionless, monthly_reserve: dimensionless }
export function computeMaintenanceReserve({ tire_set_cost = 0, tire_life_mi = 0, pm_cost = 0, pm_interval_mi = 0, major_reserve_cpm = 0, monthly_miles = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  major_reserve_cpm = Number(major_reserve_cpm);
  if (major_reserve_cpm < 0 || monthly_miles < 0) return { error: "Reserve and mileage inputs must be non-negative." };
  if (!(tire_set_cost > 0)) return { error: "Tire set cost must be positive." };
  if (!(tire_life_mi > 0)) return { error: "Tire life must be positive." };
  if (!(pm_cost > 0)) return { error: "PM service cost must be positive." };
  if (!(pm_interval_mi > 0)) return { error: "PM interval must be positive." };
  const tire_cpm = tire_set_cost / tire_life_mi;
  const pm_cpm = pm_cost / pm_interval_mi;
  const total_cpm = tire_cpm + pm_cpm + major_reserve_cpm;
  const monthly_reserve = monthly_miles > 0 ? total_cpm * monthly_miles : null;
  return {
    tire_cpm, pm_cpm, total_cpm,
    monthly_reserve: monthly_reserve != null && Number.isFinite(monthly_reserve) ? monthly_reserve : null,
    note: "Maintenance is not free miles, so set the cents aside now. Tires and routine PM are predictable and divide cleanly into a per-mile cost; the major-component reserve covers the big failures (clutch, turbo, injectors, in-frame) that average to a few cents a mile over the truck's life. This reserve per mile is part of the variable cost cost-per-mile and load-profitability consume. Keep the reserve in a separate account so it is there when the bill is.",
  };
}
export const maintenanceReserveExample = { inputs: { tire_set_cost: 4000, tire_life_mi: 80000, pm_cost: 350, pm_interval_mi: 25000, major_reserve_cpm: 0.10, monthly_miles: 10000 } };
const renderMaintenanceReserve = _simpleRenderer({
  citation: "Citation: First-principles owner-operator reserve discipline. CPM = tire set / tire life + PM cost / PM interval + major-component reserve.",
  example: maintenanceReserveExample.inputs,
  fields: [
    { key: "tire_set_cost", label: "Tire set cost ($)", kind: "number" },
    { key: "tire_life_mi", label: "Tire life (mi)", kind: "number" },
    { key: "pm_cost", label: "PM service cost ($)", kind: "number" },
    { key: "pm_interval_mi", label: "PM interval (mi)", kind: "number" },
    { key: "major_reserve_cpm", label: "Major reserve ($/mi, optional)", kind: "number" },
    { key: "monthly_miles", label: "Monthly miles (optional)", kind: "number" },
  ],
  outputs: [
    { key: "t", id: "mr-out-t", label: "Tire cost", value: (r) => "$" + fmt(r.tire_cpm, 4) + "/mi" },
    { key: "p", id: "mr-out-p", label: "PM cost", value: (r) => "$" + fmt(r.pm_cpm, 4) + "/mi" },
    { key: "c", id: "mr-out-c", label: "Total reserve", value: (r) => "$" + fmt(r.total_cpm, 4) + "/mi" },
    { key: "m", id: "mr-out-m", label: "Monthly set-aside", value: (r) => r.monthly_reserve === null ? "-" : "$" + fmt(r.monthly_reserve, 2) },
    { key: "n", id: "mr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMaintenanceReserve,
});
TRUCKING_RENDERERS["maintenance-reserve"] = renderMaintenanceReserve;

// =====================================================================
// spec-v115: gcwr-check + tire-load-check (Group J) - weight compliance.
// gcwr-check compares the combined power-unit + trailer weight to the rated
// GCWR and the federal gross cap; tire-load-check compares an axle's scale
// weight to its tire load rating. 49 CFR 393.75 / 658.17; a permit or the
// AHJ governs an over-limit move.
// =====================================================================

// dims: in { gcwr_lb: M, tractor_weight_lb: M, trailer_weight_lb: M, federal_max_lb: M } out: { combined_lb: M, margin_gcwr: M, margin_fed: M }
export function computeGcwrCheck({ gcwr_lb = 0, tractor_weight_lb = 0, trailer_weight_lb = 0, federal_max_lb = 80000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(gcwr_lb > 0)) return { error: "Rated GCWR must be positive (lb)." };
  if (!(tractor_weight_lb > 0)) return { error: "Power-unit weight must be positive (lb)." };
  if (!(trailer_weight_lb > 0)) return { error: "Trailer weight must be positive (lb)." };
  if (!(federal_max_lb > 0)) return { error: "Federal gross cap must be positive (lb)." };
  const combined_lb = tractor_weight_lb + trailer_weight_lb;
  const margin_gcwr = gcwr_lb - combined_lb;
  const margin_fed = federal_max_lb - combined_lb;
  const binding = Math.min(gcwr_lb, federal_max_lb);
  const over_by = combined_lb - binding;
  const ok = combined_lb <= binding;
  const verdict = ok
    ? "ok - within both the GCWR and the federal cap"
    : "OVER by " + fmt(over_by, 0) + " lb against the " + (gcwr_lb <= federal_max_lb ? "GCWR" : "federal cap") + " - a permit or the AHJ governs the move";
  return {
    combined_lb, margin_gcwr, margin_fed, ok, over_by, verdict,
    note: "The combined power-unit plus trailer weight must stay at or below both the manufacturer's rated gross combination weight (GCWR, the structural / drivetrain limit) and the federal 80,000 lb gross cap (49 CFR 658.17, editable for a state or permit limit). The binding limit is the smaller of the two. Axle and bridge-formula limits are separate checks; a permit or the AHJ governs any over-limit move.",
  };
}
export const gcwrCheckExample = { inputs: { gcwr_lb: 80000, tractor_weight_lb: 18000, trailer_weight_lb: 60000, federal_max_lb: 80000 } };
const renderGcwrCheck = _simpleRenderer({
  citation: "Citation: 49 CFR 393.75 (tires) / 658.17 (80,000 lb federal gross) and the manufacturer's GCWR rating plate (by section, not reproduced). The binding limit is the smaller of the GCWR and the federal cap. A permit or the AHJ governs an over-limit move. Free at ecfr.gov.",
  example: gcwrCheckExample.inputs,
  fields: [
    { key: "gcwr_lb", label: "Rated GCWR (lb)", kind: "number" },
    { key: "tractor_weight_lb", label: "Power-unit weight, loaded (lb)", kind: "number" },
    { key: "trailer_weight_lb", label: "Trailer weight, loaded (lb)", kind: "number" },
    { key: "federal_max_lb", label: "Federal gross cap (lb)", kind: "number" },
  ],
  outputs: [
    { key: "c", id: "gcwr-out-c", label: "Combined weight", value: (r) => fmt(r.combined_lb, 0) + " lb" },
    { key: "mg", id: "gcwr-out-mg", label: "GCWR margin", value: (r) => fmt(r.margin_gcwr, 0) + " lb" },
    { key: "mf", id: "gcwr-out-mf", label: "Federal margin", value: (r) => fmt(r.margin_fed, 0) + " lb" },
    { key: "v", id: "gcwr-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "n", id: "gcwr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGcwrCheck,
});
TRUCKING_RENDERERS["gcwr-check"] = renderGcwrCheck;

// dims: in { axle_weight_lb: M, tires_on_axle: dimensionless, tire_max_load_lb: M } out: { axle_capacity_lb: M, utilization_pct: dimensionless }
export function computeTireLoadCheck({ axle_weight_lb = 0, tires_on_axle = 2, tire_max_load_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(axle_weight_lb > 0)) return { error: "Axle scale weight must be positive (lb)." };
  if (!(tires_on_axle > 0)) return { error: "Tires on the axle must be positive." };
  if (!(tire_max_load_lb > 0)) return { error: "Marked max load per tire must be positive (lb)." };
  const axle_capacity_lb = tires_on_axle * tire_max_load_lb;
  const utilization_pct = 100 * axle_weight_lb / axle_capacity_lb;
  const over_by = axle_weight_lb - axle_capacity_lb;
  const ok = axle_weight_lb <= axle_capacity_lb;
  const verdict = ok
    ? "ok - " + fmt(utilization_pct, 1) + "% of tire capacity"
    : "OVERLOADED by " + fmt(over_by, 0) + " lb (" + fmt(utilization_pct, 1) + "% of tire capacity)";
  return {
    axle_capacity_lb, utilization_pct, over_by, ok, verdict,
    note: "Axle tire capacity is the marked max load per tire times the tires on the axle. Use the sidewall's single rating in a steer (single) position and the dual rating in a dual position - they differ. The tire marking, the inflation pressure at which it is rated, and the AHJ govern; this is a load check, not a substitute for the axle's own gross axle weight rating (GAWR).",
  };
}
export const tireLoadCheckExample = { inputs: { axle_weight_lb: 12000, tires_on_axle: 2, tire_max_load_lb: 6175 } };
const renderTireLoadCheck = _simpleRenderer({
  citation: "Citation: 49 CFR 393.75 (tire load) and the DOT sidewall max-load marking (by section, not reproduced). Capacity = tires x marked max load per tire; use the single vs dual rating to match the position. The marking and the AHJ govern. Free at ecfr.gov.",
  example: tireLoadCheckExample.inputs,
  fields: [
    { key: "axle_weight_lb", label: "Axle scale weight (lb)", kind: "number" },
    { key: "tires_on_axle", label: "Tires on axle (2 single / 4 dual)", kind: "select", options: [{ value: "2", label: "2 (single)" }, { value: "4", label: "4 (dual)" }] },
    { key: "tire_max_load_lb", label: "Marked max load per tire (lb)", kind: "number" },
  ],
  outputs: [
    { key: "cap", id: "tlc-out-cap", label: "Axle tire capacity", value: (r) => fmt(r.axle_capacity_lb, 0) + " lb" },
    { key: "u", id: "tlc-out-u", label: "Utilization", value: (r) => fmt(r.utilization_pct, 1) + "%" },
    { key: "v", id: "tlc-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "n", id: "tlc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTireLoadCheck,
});
TRUCKING_RENDERERS["tire-load-check"] = renderTireLoadCheck;

// ===================== spec-v423..v425: trucking-business trio (Group J) =====================

// dims: in { free_hours: dimensionless, actual_hours: dimensionless, rate_usd_hr: dimensionless, truck_rev_usd_hr: dimensionless } out: { detention_hours: dimensionless, billable_usd: dimensionless, opportunity_usd: dimensionless }
export function computeDetentionDemurrageBilling({ free_hours = 0, actual_hours = 0, rate_usd_hr = 0, truck_rev_usd_hr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const free = Number(free_hours) || 0;
  const actual = Number(actual_hours) || 0;
  const rate = Number(rate_usd_hr) || 0;
  const rev = Number(truck_rev_usd_hr) || 0;
  if (free < 0 || actual < 0) return { error: "Hours must be non-negative." };
  if (rate < 0 || rev < 0) return { error: "Rates must be non-negative (USD/hr)." };
  const detention_hours = Math.max(0, actual - free);
  const billable_usd = detention_hours * rate;
  const opportunity_usd = detention_hours * rev;
  return {
    detention_hours, billable_usd, opportunity_usd,
    shortfall_usd: opportunity_usd > 0 ? opportunity_usd - billable_usd : null,
    note: "Detention (or demurrage) billing: the chargeable hours = the time at the facility beyond the free time (max of zero), the detention charge = those hours x the detention rate, and the opportunity cost = those hours x what the truck earns per hour on the road. The detention rate rarely covers the lost revenue (a truck sitting is not driving the next load), so a large gap is the case for a higher rate or a stricter free-time clause. This bills the entered numbers; the carrier's tariff and the signed rate confirmation govern the actual charge.",
  };
}
export const detentionDemurrageBillingExample = { inputs: { free_hours: 2, actual_hours: 5, rate_usd_hr: 50, truck_rev_usd_hr: 80 } };
const renderDetentionDemurrageBilling = _simpleRenderer({
  citation: "Citation: Detention/demurrage billing (carrier tariff / rate-confirmation practice): chargeable hours = max(0, actual - free), charge = hours x detention rate, opportunity cost = hours x on-road revenue per hour. A billing aid; the carrier's tariff and the signed rate confirmation govern the actual charge.",
  example: detentionDemurrageBillingExample.inputs,
  fields: [
    { key: "free_hours", label: "Free time (hr)", kind: "number" },
    { key: "actual_hours", label: "Actual time at facility (hr)", kind: "number" },
    { key: "rate_usd_hr", label: "Detention rate ($/hr)", kind: "number" },
    { key: "truck_rev_usd_hr", label: "Truck revenue on road ($/hr, optional)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "dh", id: "ddb-out-dh", label: "Detention hours", value: (r) => fmt(r.detention_hours, 1) + " hr" },
    { key: "b", id: "ddb-out-b", label: "Billable detention", value: (r) => "$" + fmt(r.billable_usd, 2) },
    { key: "o", id: "ddb-out-o", label: "Opportunity cost / shortfall", value: (r) => r.shortfall_usd == null ? "(enter on-road revenue)" : "$" + fmt(r.opportunity_usd, 2) + " ($" + fmt(r.shortfall_usd, 2) + " uncovered)" },
    { key: "n", id: "ddb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDetentionDemurrageBilling,
});
TRUCKING_RENDERERS["detention-demurrage-billing"] = renderDetentionDemurrageBilling;

// dims: in { cpm_usd: dimensionless, pct: dimensionless, miles: dimensionless, linehaul_usd: dimensionless } out: { cpm_pay_usd: dimensionless, pct_pay_usd: dimensionless, breakeven_rate_usd_mi: dimensionless }
export function computeDriverPayCpmVsPercentage({ cpm_usd = 0, pct = 0, miles = 0, linehaul_usd = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cpm = Number(cpm_usd) || 0;
  const p = Number(pct) || 0;
  const mi = Number(miles) || 0;
  const lh = Number(linehaul_usd) || 0;
  if (!(cpm > 0)) return { error: "Cents-per-mile rate must be positive (USD/mi)." };
  if (!(p > 0)) return { error: "Percentage rate must be positive (%)." };
  if (!(mi > 0)) return { error: "Miles must be positive." };
  if (!(lh > 0)) return { error: "Linehaul revenue must be positive (USD)." };
  const cpm_pay_usd = cpm * mi;
  const pct_pay_usd = (p / 100) * lh;
  const breakeven_rate_usd_mi = cpm / (p / 100);
  const load_rate_usd_mi = lh / mi;
  const winner = pct_pay_usd >= cpm_pay_usd ? "percentage" : "cents-per-mile";
  return {
    cpm_pay_usd, pct_pay_usd, breakeven_rate_usd_mi, load_rate_usd_mi, winner,
    note: "Driver pay, cents-per-mile vs percentage-of-linehaul: CPM pay = rate x miles, percentage pay = (percent) x linehaul revenue, and the two are equal at a break-even load rate = CPM / (percent as a decimal), in dollars per mile of linehaul. Above the break-even rate the percentage deal pays more (the driver shares the upside of a high-paying load); below it, cents-per-mile pays more (it protects the driver on cheap freight). This compares one load or one settlement period; the actual pay plan, accessorials, and empty-mile pay govern.",
  };
}
export const driverPayCpmVsPercentageExample = { inputs: { cpm_usd: 0.60, pct: 25, miles: 1000, linehaul_usd: 2500 } };
const renderDriverPayCpmVsPercentage = _simpleRenderer({
  citation: "Citation: Driver pay comparison (carrier settlement practice): CPM pay = rate x miles, percentage pay = percent x linehaul, break-even load rate = CPM / (percent decimal) per mile. Above break-even the percentage pays more; below it, cents-per-mile does. A comparison aid; the pay plan and accessorials govern.",
  example: driverPayCpmVsPercentageExample.inputs,
  fields: [
    { key: "cpm_usd", label: "Cents-per-mile rate ($/mi)", kind: "number" },
    { key: "pct", label: "Percentage-of-linehaul rate (%)", kind: "number" },
    { key: "miles", label: "Loaded miles", kind: "number" },
    { key: "linehaul_usd", label: "Load linehaul revenue ($)", kind: "number" },
  ],
  outputs: [
    { key: "cpm", id: "dpc-out-cpm", label: "Cents-per-mile pay", value: (r) => "$" + fmt(r.cpm_pay_usd, 2) },
    { key: "pct", id: "dpc-out-pct", label: "Percentage pay", value: (r) => "$" + fmt(r.pct_pay_usd, 2) + " (" + r.winner + " pays more)" },
    { key: "be", id: "dpc-out-be", label: "Break-even load rate", value: (r) => "$" + fmt(r.breakeven_rate_usd_mi, 2) + "/mi (this load $" + fmt(r.load_rate_usd_mi, 2) + "/mi)" },
    { key: "n", id: "dpc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDriverPayCpmVsPercentage,
});
TRUCKING_RENDERERS["driver-pay-cpm-vs-percentage"] = renderDriverPayCpmVsPercentage;

// dims: in { invoice_usd: dimensionless, advance_pct: dimensionless, fee_pct: dimensionless, days_to_pay: dimensionless } out: { advance_usd: dimensionless, fee_usd: dimensionless, reserve_usd: dimensionless, apr_percent: dimensionless }
export function computeInvoiceFactoringCost({ invoice_usd = 0, advance_pct = 90, fee_pct = 3, days_to_pay = 30 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const inv = Number(invoice_usd) || 0;
  const adv = Number(advance_pct) || 0;
  const fee = Number(fee_pct) || 0;
  const days = Number(days_to_pay) || 0;
  if (!(inv > 0)) return { error: "Invoice amount must be positive (USD)." };
  if (!(adv > 0 && adv <= 100)) return { error: "Advance rate must be between 0 and 100%." };
  if (fee < 0) return { error: "Factoring fee must be non-negative (%)." };
  if (!(days > 0)) return { error: "Days to pay must be positive." };
  const advance_usd = inv * adv / 100;
  const fee_usd = inv * fee / 100;
  const reserve_usd = inv - advance_usd - fee_usd;
  const apr_percent = (fee / adv) * (365 / days) * 100;
  return {
    advance_usd, fee_usd, reserve_usd, apr_percent,
    note: "Invoice factoring cost and effective APR: the factor advances a percentage of the freight bill now (typically 90-97%), keeps a fee (typically 1-5%), and pays the reserve (invoice - advance - fee) when the customer pays. The effective annual rate = (fee% / advance%) x (365 / days the cash is out) x 100, because a flat fee on money out for only a few weeks annualizes to a high rate. The faster the customer pays, the more expensive the same fee. This estimates the cost from the entered terms; the factoring agreement (recourse vs non-recourse, minimums, and reserve release) governs.",
  };
}
export const invoiceFactoringCostExample = { inputs: { invoice_usd: 2000, advance_pct: 90, fee_pct: 3, days_to_pay: 30 } };
const renderInvoiceFactoringCost = _simpleRenderer({
  citation: "Citation: Invoice factoring cost (freight-factoring practice): advance = invoice x advance%, fee = invoice x fee%, reserve = invoice - advance - fee, effective APR = (fee%/advance%) x (365/days) x 100. A cost aid; the factoring agreement (recourse, minimums, reserve release) governs.",
  example: invoiceFactoringCostExample.inputs,
  fields: [
    { key: "invoice_usd", label: "Invoice amount ($)", kind: "number" },
    { key: "advance_pct", label: "Advance rate (%)", kind: "number" },
    { key: "fee_pct", label: "Factoring fee (%)", kind: "number" },
    { key: "days_to_pay", label: "Days until customer pays", kind: "number" },
  ],
  outputs: [
    { key: "adv", id: "ifc-out-adv", label: "Advance now / fee", value: (r) => "$" + fmt(r.advance_usd, 2) + " advanced, $" + fmt(r.fee_usd, 2) + " fee" },
    { key: "res", id: "ifc-out-res", label: "Reserve released later", value: (r) => "$" + fmt(r.reserve_usd, 2) },
    { key: "apr", id: "ifc-out-apr", label: "Effective APR", value: (r) => fmt(r.apr_percent, 1) + "%" },
    { key: "n", id: "ifc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeInvoiceFactoringCost,
});
TRUCKING_RENDERERS["invoice-factoring-cost"] = renderInvoiceFactoringCost;

// spec-v486: trailer tongue weight and sway check. Tongue% = tongue / gross x
// 100, against the 10-15% conventional / 15-25% gooseneck target bands. Too
// little tongue weight causes trailer sway; too much overloads the hitch and
// unloads the tow vehicle's steer axle.
// dims: in { trailer_gross_weight_lb: M, tongue_weight_lb: M, hitch_type: dimensionless, hitch_rating_lb: M } out: { tongue_pct: dimensionless, target_low_lb: M, target_high_lb: M }
export function computeTrailerTongueWeight({ trailer_gross_weight_lb = 0, tongue_weight_lb = 0, hitch_type = "conventional", hitch_rating_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const gross = Number(trailer_gross_weight_lb) || 0;
  const tongue = Number(tongue_weight_lb) || 0;
  const rating = Number(hitch_rating_lb) || 0;
  if (!(gross > 0)) return { error: "Trailer gross weight must be positive (lb)." };
  if (!(tongue > 0)) return { error: "Tongue weight must be positive (lb)." };
  if (!(tongue < gross)) return { error: "Tongue weight must be less than the trailer gross weight (the tongue carries a fraction of the load)." };
  if (!(rating >= 0)) return { error: "Hitch rating must be zero or positive (lb)." };
  const band = hitch_type === "gooseneck" ? { low: 15, high: 25, label: "gooseneck / fifth wheel" } : { low: 10, high: 15, label: "conventional (bumper-pull)" };
  const tongue_pct = tongue / gross * 100;
  const target_low_lb = gross * band.low / 100;
  const target_high_lb = gross * band.high / 100;
  const in_band = tongue_pct >= band.low && tongue_pct <= band.high;
  const over_rating = rating > 0 && tongue > rating;
  const verdict = tongue_pct < band.low
    ? "TOO LIGHT (" + fmt(tongue_pct, 1) + "% < " + band.low + "%) - trailer-sway risk; move cargo forward of the trailer axle to add tongue weight"
    : tongue_pct > band.high
      ? "TOO HEAVY (" + fmt(tongue_pct, 1) + "% > " + band.high + "%) - overloads the hitch and the tow vehicle's rear axle and unloads the steer axle; move cargo rearward"
      : "in band (" + band.low + "-" + band.high + "% for a " + band.label + " hitch)";
  return {
    tongue_pct, target_low_lb, target_high_lb, in_band, over_rating, band_label: band.label, verdict,
    note: "Tongue weight is the down-force the loaded trailer puts on the hitch ball, and its share of the trailer's gross weight is what keeps the rig tracking straight: the industry bands are 10-15% for a conventional (bumper-pull) hitch and 15-25% for a gooseneck or fifth wheel. Below the band the load sits too far behind the axle and the trailer sways (fishtails), the classic single-vehicle trailer wreck; above it the hitch and the tow vehicle's rear axle are overloaded while the steer axle lightens, robbing steering and braking. Adjust by moving cargo forward (more tongue) or rearward (less). The bands are rules of thumb; the specific vehicle, hitch, and trailer manufacturer ratings and the tow vehicle's payload and rear-axle GAWR govern. Weigh the tongue with the trailer level and loaded as it will tow; a scale reading, not a guess.",
  };
}
export const trailerTongueWeightExample = { inputs: { trailer_gross_weight_lb: 7000, tongue_weight_lb: 700, hitch_type: "conventional", hitch_rating_lb: 0 } };
const renderTrailerTongueWeight = _simpleRenderer({
  citation: "Citation: standard towing tongue-weight guidance (NHTSA / SAE J2807 and the hitch/vehicle manufacturer ratings): tongue% = tongue / gross x 100, target 10-15% conventional and 15-25% gooseneck/fifth wheel. Too little causes sway; too much overloads the hitch and unloads the steer axle. A setup screen; the manufacturer ratings and a scale govern.",
  example: trailerTongueWeightExample.inputs,
  fields: [
    { key: "trailer_gross_weight_lb", label: "Trailer gross weight, loaded (lb)", kind: "number" },
    { key: "tongue_weight_lb", label: "Measured tongue (coupler) weight (lb)", kind: "number" },
    { key: "hitch_type", label: "Hitch type", kind: "select", options: [
      { value: "conventional", label: "Conventional / bumper-pull (10-15%)" },
      { value: "gooseneck", label: "Gooseneck / fifth wheel (15-25%)" },
    ], default: "conventional" },
    { key: "hitch_rating_lb", label: "Hitch tongue-weight rating (lb, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "p", id: "ttw-out-p", label: "Tongue weight", value: (r) => fmt(r.tongue_pct, 1) + "%" },
    { key: "t", id: "ttw-out-t", label: "Target window", value: (r) => fmt(r.target_low_lb, 0) + " - " + fmt(r.target_high_lb, 0) + " lb (" + r.band_label + ")" },
    { key: "v", id: "ttw-out-v", label: "Verdict", value: (r) => (r.in_band ? "OK: " : "") + r.verdict + (r.over_rating ? " -- ALSO over the hitch tongue-weight rating" : "") },
    { key: "n", id: "ttw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTrailerTongueWeight,
});
TRUCKING_RENDERERS["trailer-tongue-weight"] = renderTrailerTongueWeight;

// ===================== spec-v508: diesel exhaust fluid (DEF) consumption and range =====================
// dims: in { diesel_gal: L^3, trip_miles: L, mpg: L^-2, dose_pct: dimensionless, def_tank_gal: L^3 } out: { diesel_gal_used: L^3, def_used_gal: L^3, diesel_per_def_gal: L^3, range_mi: L }
export function computeDefConsumption({ diesel_gal = 0, trip_miles = 0, mpg = 0, dose_pct = 2.5, def_tank_gal = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const dsl = Number(diesel_gal) || 0;
  const miles = Number(trip_miles) || 0;
  const mpgv = Number(mpg) || 0;
  const dose = Number(dose_pct) || 0;
  const tank = Number(def_tank_gal) || 0;
  if (!(dose > 0)) return { error: "DEF dose rate must be positive (percent)." };
  if (!(tank > 0)) return { error: "DEF tank size must be positive (gal)." };
  let diesel_gal_used;
  if (dsl > 0) {
    diesel_gal_used = dsl;
  } else {
    if (!(miles > 0)) return { error: "Provide diesel gallons, or positive trip miles to derive it." };
    if (!(mpgv > 0)) return { error: "Fuel economy must be positive (mpg) to derive diesel from miles." };
    diesel_gal_used = miles / mpgv;
  }
  const def_used_gal = diesel_gal_used * dose / 100;
  const diesel_per_def_gal = tank / (dose / 100);
  const range_mi = mpgv > 0 ? diesel_per_def_gal * mpgv : null;
  if (![diesel_gal_used, def_used_gal, diesel_per_def_gal].every(Number.isFinite)) return { error: "DEF-consumption math is not a finite value." };
  return {
    diesel_gal_used, def_used_gal, diesel_per_def_gal, range_mi,
    note: "DEF consumption and range: diesel exhaust fluid is metered into the SCR aftertreatment at only about 2 to 3% of the diesel consumed, so a DEF tank spans SEVERAL diesel fills -- def_used = diesel x dose/100, and a full DEF tank covers diesel = def_tank / (dose/100), which at the truck's mpg is the range on one DEF fill. Plan DEF per fuel stop and you either haul jugs you do not need or run it dry -- and running DEF empty forces an ECU derate to roughly a 5 mph limp-home, non-negotiable, until refilled. DEF freezes at about 12 F (the SCR system thaws it in service). The actual dose rate varies with engine, load, and duty cycle; a hard-pulling truck doses higher and pulls the refill forward. A planning estimate, not the truck's metered rate; the OEM and DEF quality govern.",
  };
}
export const defConsumptionExample = { inputs: { diesel_gal: 200, trip_miles: 0, mpg: 6.5, dose_pct: 2.5, def_tank_gal: 13 } };

TRUCKING_RENDERERS["def-consumption"] = _simpleRenderer({
  citation: "Citation: DEF consumption and range model (SCR aftertreatment; ISO 22241 DEF spec): def_used = diesel x dose/100; diesel per DEF tank = def_tank / (dose/100); range = diesel_per_def x mpg. DEF runs at about 2 to 3% of diesel, so a DEF tank spans several fuel fills; running it empty forces an ECU derate to ~5 mph. DEF freezes at ~12 F. A planning estimate; the OEM and DEF quality govern.",
  example: defConsumptionExample.inputs,
  fields: [
    { key: "diesel_gal", label: "Diesel consumed (gal, 0 = derive from miles/mpg)", kind: "number" },
    { key: "trip_miles", label: "Trip distance (mi, used if diesel is 0)", kind: "number" },
    { key: "mpg", label: "Fuel economy (mpg, for range)", kind: "number" },
    { key: "dose_pct", label: "DEF dose (% of diesel, ~2-3)", kind: "number" },
    { key: "def_tank_gal", label: "DEF tank size (gal)", kind: "number" },
  ],
  outputs: [
    { key: "du", id: "def-out-du", label: "DEF used this leg", value: (r) => fmt(r.def_used_gal, 1) + " gal (from " + fmt(r.diesel_gal_used, 0) + " gal diesel)" },
    { key: "dp", id: "def-out-dp", label: "Diesel per full DEF tank", value: (r) => fmt(r.diesel_per_def_gal, 0) + " gal" },
    { key: "rg", id: "def-out-rg", label: "Range on one DEF fill", value: (r) => r.range_mi === null ? "- (enter mpg)" : fmt(r.range_mi, 0) + " mi" },
    { key: "n", id: "def-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDefConsumption,
});

// ===================== spec-v913: static rollover threshold =====================
// dims: in { track_width_in: L, cg_height_in: L, curve_radius_ft: L } out: { srt_g: dimensionless, rollover_speed_mph: L*T^-1 }
export function computeStaticRolloverThreshold({ track_width_in = 72, cg_height_in = 80, curve_radius_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(track_width_in > 0)) return { error: "Track width must be positive (in)." };
  if (!(cg_height_in > 0)) return { error: "Center-of-gravity height must be positive (in)." };
  if (curve_radius_ft < 0) return { error: "Curve radius cannot be negative (ft)." };
  // Static Stability Factor: the lateral acceleration (in g) that lifts the inside wheels,
  // SRT = (track width / 2) / CG height. Rollover on a steady curve when v^2/R = SRT x g.
  const srt_g = (track_width_in / 2) / cg_height_in;
  const rollover_speed_mph = curve_radius_ft > 0 ? Math.sqrt(srt_g * 32.174 * curve_radius_ft) * 0.6818182 : null;
  if (!Number.isFinite(srt_g)) return { error: "Rollover-threshold math is not a finite value." };
  return {
    srt_g,
    rollover_speed_mph,
    note: "The static rollover threshold (static stability factor) is the steady lateral acceleration, in g, that lifts the inside wheels: SRT = half-track / CG-height. A loaded van runs about 0.35 to 0.45 g; a low flatbed is higher, a tanker or high-cube lower. On a steady curve, rollover impends when v^2/R reaches SRT x g, so a tighter radius or a higher CG drops the safe speed fast. This is a STATIC screen -- suspension roll, tire slip, load shift, and the dynamics of a fast steer or a ramp lower the real threshold, so slow well below this on ramps and curves. The loaded CG height and the truck govern; a wrong number is a re-check, not a substitute for driving to conditions.",
  };
}
export const staticRolloverThresholdExample = { inputs: { track_width_in: 72, cg_height_in: 80, curve_radius_ft: 200 } };

TRUCKING_RENDERERS["static-rollover-threshold"] = _simpleRenderer({
  citation: "Citation: static stability factor by name. SRT = (track width / 2) / CG height (the lateral g that lifts the inside wheels); steady-curve rollover speed = sqrt(SRT x g x R), g = 32.174 ft/s^2. A static screen; suspension roll, tire slip, and load shift lower the real threshold. The loaded CG and the truck govern.",
  example: staticRolloverThresholdExample.inputs,
  fields: [
    { key: "track_width_in", label: "Track width (in, wheel centerline to centerline)", kind: "number" },
    { key: "cg_height_in", label: "Loaded CG height (in above ground)", kind: "number" },
    { key: "curve_radius_ft", label: "Curve radius (ft, 0 = skip rollover speed)", kind: "number" },
  ],
  outputs: [
    { key: "srt", id: "srt-out-g", label: "Static rollover threshold", value: (r) => fmt(r.srt_g, 2) + " g" },
    { key: "spd", id: "srt-out-spd", label: "Steady-curve rollover speed", value: (r) => r.rollover_speed_mph === null ? "- (enter curve radius)" : fmt(r.rollover_speed_mph, 0) + " mph" },
    { key: "n", id: "srt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeStaticRolloverThreshold,
});

// =====================================================================
// spec-v1253 J: traction-limited startable grade (truck-startability)
// =====================================================================
// The steepest grade a truck can START on is limited by drive-axle traction, not power:
// available tractive effort mu x W_drive must overcome grade + rolling resistance
// W_gross x (sin theta + f cos theta). Small-angle field form: max grade (%) = 100 (mu (W_drive/W_gross) - f).
// First-principles Newtonian statics (SAE J2188 defines gradeability; the physics is public).
// dims: in { gross_weight_lb: M, drive_axle_weight_lb: M, friction_coeff: dimensionless, rolling_resistance_coeff: dimensionless } out: { max_grade_pct: dimensionless, tractive_effort_lb: M, drive_fraction_pct: dimensionless }
export function computeTruckStartability({ gross_weight_lb = 0, drive_axle_weight_lb = 0, friction_coeff = 0.6, rolling_resistance_coeff = 0.012 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const wg = Number(gross_weight_lb) || 0;
  const wd = Number(drive_axle_weight_lb) || 0;
  const mu = Number(friction_coeff);
  const f = Number(rolling_resistance_coeff);
  if (!(wg > 0)) return { error: "Gross combination weight must be positive (lb)." };
  if (!(wd > 0)) return { error: "Drive-axle weight must be positive (lb)." };
  if (!(wd <= wg)) return { error: "Drive-axle weight cannot exceed the gross combination weight." };
  if (!(mu > 0 && mu <= 1)) return { error: "Tire-road friction coefficient must be over 0 and up to 1.0 (about 0.6 dry, 0.3 wet, 0.15 ice)." };
  if (!Number.isFinite(f) || f < 0) return { error: "Rolling resistance coefficient must be zero or positive (about 0.012 on pavement)." };
  const k = wd / wg;
  const max_grade_pct = 100 * (mu * k - f);
  const tractive_effort_lb = mu * wd;
  const drive_fraction_pct = 100 * k;
  if (![max_grade_pct, tractive_effort_lb, drive_fraction_pct].every(Number.isFinite)) return { error: "Startability math is not a finite value." };
  return {
    max_grade_pct, tractive_effort_lb, drive_fraction_pct,
    note: "The steepest grade a truck can START on, limited by DRIVE-AXLE TRACTION, not engine power. The drive tires can only push with the friction they have on the weight over them: available tractive effort = mu x W_drive, where mu is the tire-road friction coefficient (about 0.6 dry, 0.3 wet, 0.15 on ice/snow) and W_drive is the weight carried by the driven axles. To start moving up a grade that force must beat the grade resistance plus rolling resistance, W_gross x (grade + f), so the maximum startable grade is (%) = 100 (mu x (W_drive/W_gross) - f), with f the rolling-resistance coefficient (~0.012 on pavement). A 80,000 lb combination with 34,000 lb on the drives (a 42.5% drive fraction) can start on about a 24% grade when dry, but only about 5% on ice - which is why loaded rigs get stuck on icy grades that look mild. More weight on the drive axles (a heavier tractor, sliding the trailer tandems forward) and better traction raise the limit; this is a STARTING (traction) limit, not a sustained-speed (power) limit - a truck may start a grade it cannot climb at road speed, or the reverse. The small-angle field form is used; wheel slip, weight transfer to the rear on the grade, and differential/traction-control behavior shift the real number. A planning estimate; the driver, the surface, and the truck govern.",
  };
}
export const truckStartabilityExample = { inputs: { gross_weight_lb: 80000, drive_axle_weight_lb: 34000, friction_coeff: 0.6, rolling_resistance_coeff: 0.012 } };
TRUCKING_RENDERERS["truck-startability"] = _simpleRenderer({
  citation: "Citation: traction-limited startable grade (first-principles statics; SAE J2188 defines gradeability): max grade (%) = 100 (mu (W_drive/W_gross) - f), where mu is the tire-road friction (~0.6 dry, 0.3 wet, 0.15 ice) and f the rolling-resistance coefficient (~0.012 on pavement); available tractive effort = mu x W_drive. Small-angle field form; a STARTING (traction) limit, not a sustained-climb (power) limit. Wheel slip and weight transfer shift the real number. The driver, the surface, and the truck govern.",
  example: truckStartabilityExample.inputs,
  fields: [
    { key: "gross_weight_lb", label: "Gross combination weight (lb)", kind: "number" },
    { key: "drive_axle_weight_lb", label: "Weight on drive axles (lb)", kind: "number" },
    { key: "friction_coeff", label: "Tire-road friction (0.6 dry, 0.3 wet, 0.15 ice)", kind: "number" },
    { key: "rolling_resistance_coeff", label: "Rolling resistance coefficient (~0.012 pavement)", kind: "number" },
  ],
  outputs: [
    { key: "grade", id: "tsg-out-grade", label: "Max startable grade", value: (r) => fmt(r.max_grade_pct, 1) + "%" + (r.max_grade_pct <= 0 ? " (cannot start on any upgrade)" : "") },
    { key: "te", id: "tsg-out-te", label: "Available tractive effort", value: (r) => fmt(r.tractive_effort_lb, 0) + " lb (drive fraction " + fmt(r.drive_fraction_pct, 1) + "%)" },
    { key: "n", id: "tsg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTruckStartability,
});

// =====================================================================
// spec-v1266 J: dynamic hydroplaning speed (hydroplaning-speed)
// =====================================================================
// The speed at which a tire rides up on a water film and loses road contact. NASA TN D-2056
// (Horne & Dreher) / FAA AC 91-6A: dynamic hydroplaning speed depends only on tire inflation
// pressure -- spin-down (a rolling wheel that loses traction) Vp = 9 sqrt(P) knots = 10.35 sqrt(P) mph;
// spin-up (a stationary/locked wheel starting to roll through standing water) onset Vp = 7.7 sqrt(P) knots,
// the more conservative figure. P in psi. First-principles-scaled public-domain constant (no table).
// dims: in { tire_pressure_psi: M L^-1 T^-2 } out: { hydroplaning_speed_mph: L T^-1, hydroplaning_speed_knots: L T^-1, spinup_onset_mph: L T^-1, spinup_onset_knots: L T^-1 }
export function computeHydroplaningSpeed({ tire_pressure_psi = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const P = Number(tire_pressure_psi);
  if (!(P > 0)) return { error: "Tire inflation pressure must be positive (psi)." };
  const KNOTS_TO_MPH = 1.1507794;
  const hydroplaning_speed_knots = 9 * Math.sqrt(P);
  const hydroplaning_speed_mph = hydroplaning_speed_knots * KNOTS_TO_MPH;
  const spinup_onset_knots = 7.7 * Math.sqrt(P);
  const spinup_onset_mph = spinup_onset_knots * KNOTS_TO_MPH;
  if (![hydroplaning_speed_mph, hydroplaning_speed_knots, spinup_onset_mph, spinup_onset_knots].every(Number.isFinite)) {
    return { error: "Hydroplaning-speed math is not a finite value." };
  }
  return {
    hydroplaning_speed_mph, hydroplaning_speed_knots, spinup_onset_mph, spinup_onset_knots,
    note: "Dynamic hydroplaning speed from the NASA/FAA relation that depends only on tire inflation pressure: a rolling wheel loses contact at about Vp = 10.35 sqrt(P) mph (9 sqrt(P) knots), the spin-down value usually quoted as the hydroplaning speed; a stationary or locked wheel begins to hydroplane earlier, near 7.7 sqrt(P) knots, so hard braking into standing water is the worse case. A truck tire at 100 psi hydroplanes near 104 mph, a car tire at 32 psi near 59 mph, an underinflated 24 psi tire near 51 mph -- which is why low pressure is dangerous in rain. This is a screening figure: it assumes standing water at least about 0.1 in deep and smooth or worn tread; deeper water, bald tires, or a smooth pavement lower it, while good tread channels water and raises it. Slow well below this and keep tread and pressure up. A safety screen; road conditions and the driver govern.",
  };
}
export const hydroplaningSpeedExample = { inputs: { tire_pressure_psi: 100 } };

TRUCKING_RENDERERS["hydroplaning-speed"] = _simpleRenderer({
  citation: "Citation: dynamic hydroplaning speed per NASA TN D-2056 (Horne & Dreher) and FAA AC 91-6A, by name: spin-down Vp = 9 sqrt(P) knots (10.35 sqrt(P) mph), spin-up onset 7.7 sqrt(P) knots, P = tire inflation pressure (psi). Assumes standing water ~0.1 in and smooth/worn tread. Public domain. Road conditions and the driver govern.",
  example: hydroplaningSpeedExample.inputs,
  fields: [
    { key: "tire_pressure_psi", label: "Tire inflation pressure (psi)", kind: "number" },
  ],
  outputs: [
    { key: "s", id: "hyd-out-s", label: "Hydroplaning speed (spin-down)", value: (r) => fmt(r.hydroplaning_speed_mph, 0) + " mph (" + fmt(r.hydroplaning_speed_knots, 0) + " kn)" },
    { key: "o", id: "hyd-out-o", label: "Spin-up onset (locked wheel)", value: (r) => fmt(r.spinup_onset_mph, 0) + " mph (" + fmt(r.spinup_onset_knots, 0) + " kn)" },
    { key: "n", id: "hyd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHydroplaningSpeed,
});

// ===========================================================================
// spec-v1377..v1385: the 2026-08-26 trade-expansion Group J band.
// See specs/scope-trade-expansion.md. Nine tiles, no new dependency.
// ===========================================================================

// ===================== spec-v1377: minimum tiedown count =====================
// dims: in { args: dimensionless } out: { min_tiedowns: dimensionless, required_wll_lb: M, provided_wll_lb: M }
export function computeTiedownCount({ length_ft = 0, weight_lb = 0, tiedowns = 0, wll_per_tiedown_lb = 0, secured_both_ends = true } = {}) {
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
  else min_tiedowns = 2 + Math.ceil((length_ft - 10) / 10);
  const required_wll_lb = 0.5 * weight_lb;
  // A tiedown secured at both ends counts its full working load limit; one anchored
  // at a single end counts half.
  const effective_wll_each = secured_both_ends ? wll_per_tiedown_lb : wll_per_tiedown_lb / 2;
  const provided_wll_lb = tiedowns * effective_wll_each;
  const count_ok = tiedowns >= min_tiedowns;
  const wll_ok = provided_wll_lb >= required_wll_lb;
  const count_margin = tiedowns - min_tiedowns;
  const wll_margin_lb = provided_wll_lb - required_wll_lb;
  // Which rule GOVERNS is a property of the cargo and the hardware, not of the plan:
  // it is whichever rule demands more tiedowns of this rating.
  const tiedowns_by_wll = Math.ceil(required_wll_lb / effective_wll_each);
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
    required_wll_lb,
    provided_wll_lb,
    count_margin,
    wll_margin_lb,
    tiedowns_by_wll,
    governing,
    verdict,
    note: "The minimum number of tiedowns a piece of cargo needs and the aggregate working load limit it needs, which are two independent rules that both have to be satisfied. The count rule is about the article's LENGTH: an article of 5 ft or less weighing 1,100 lb or less takes one tiedown and a heavier short article takes two; anything over 5 ft and up to 10 ft takes two regardless of weight; and past 10 ft the requirement is two plus one more for each additional 10 ft or fraction. Long cargo needs more attachment points so it cannot rotate or shift within the securement, and the count keeps climbing every ten feet no matter how light the piece is. The aggregate working load limit rule is about WEIGHT: the sum of the tiedowns' working load limits must be at least half the cargo weight, on the reasoning that a tiedown restrains in more than one direction. A tiedown that passes over the load and is secured at both ends counts its full working load limit, while one anchored at only one end counts half. The two rules govern in different situations, which is why both are reported and the controlling one named. A 24 ft, 12,000 lb steel beam needs 2 + ceil(14/10) = 4 tiedowns by count while needing only 6,000 lb of aggregate working load limit, so the count governs and four chains is exactly the minimum. Reverse it -- a 4 ft, 14,000 lb block -- and the count rule asks for two while the working load limit rule asks for 7,000 lb, so the chain rating decides. A crew that has internalized only one of the two rules will be wrong about half the time. A screen; 49 CFR 393 in full, the working load limits marked on the actual hardware, and the driver's own inspection govern.",
  };
}

export const tiedownCountExample = { inputs: { length_ft: 24, weight_lb: 12000, tiedowns: 4, wll_per_tiedown_lb: 5400, secured_both_ends: true } };

TRUCKING_RENDERERS["tiedown-count"] = _simpleRenderer({
  citation: "Citation: 49 CFR 393.110 minimum tiedown count by article length, and 49 CFR 393.106 aggregate working load limit at half the cargo weight, cited by section and not reproduced. Both rules apply; the tile names the controlling one. 49 CFR 393 in full, the working load limits marked on the actual hardware, and the driver's inspection govern.",
  example: tiedownCountExample.inputs,
  fields: [
    { key: "length_ft", label: "Article length (ft)", kind: "number" },
    { key: "weight_lb", label: "Article weight (lb)", kind: "number" },
    { key: "tiedowns", label: "Tiedowns planned", kind: "number" },
    { key: "wll_per_tiedown_lb", label: "Working load limit per tiedown (lb)", kind: "number" },
    { key: "secured_both_ends", label: "Each tiedown attached and secured at both ends", kind: "checkbox" },
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
// dims: in { args: dimensionless } out: { excess_ft: L, holes_needed: dimensionless, resulting_kpra_ft: L }
export function computeKingpinToAxle({ kpra_ft = 0, state_limit_ft = 40, hole_spacing_in = 6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(kpra_ft > 0)) return { error: "Measured kingpin-to-rear-axle distance must be positive." };
  if (!(state_limit_ft > 0)) return { error: "State limit must be positive." };
  if (!(hole_spacing_in > 0)) return { error: "Tandem hole spacing must be positive." };
  // Sliding the tandems FORWARD to fix KPRA moves weight onto the drives: run the
  // axle-weight check before pulling the pin, not after crossing the scale.
  const excess_ft = kpra_ft - state_limit_ft;
  const holes_needed = excess_ft > 0 ? Math.ceil(excess_ft * 12 / hole_spacing_in) : 0;
  const resulting_kpra_ft = kpra_ft - holes_needed * hole_spacing_in / 12;
  const slide_in = holes_needed * hole_spacing_in;
  const compliant = resulting_kpra_ft <= state_limit_ft;
  const verdict = excess_ft <= 0
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

TRUCKING_RENDERERS["kingpin-to-axle"] = _simpleRenderer({
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
// dims: in { args: dimensionless } out: { descent_power_hp: dimensionless, balance_speed_mph: L T^-1, service_brake_hp: dimensionless }
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
    note: "The speed at which an engine brake alone holds a loaded truck on a grade, and how much heat the service brakes are absorbing above it. Going downhill, gravity does work on the truck at a rate proportional to weight times speed times grade, and that power has to be dissipated continuously or the truck accelerates. An engine brake absorbs a fixed amount of it -- a few hundred horsepower on a modern truck, much less on an older one or at low engine speed -- and whatever is left goes into the service brakes as heat. Service brakes have no steady-state capacity at all: they absorb heat, they do not reject it, so any sustained shortfall ends in fade. The balance speed is the useful output, because below it the truck is under control with the service brakes held in reserve for emergencies, and above it the service brakes are carrying the difference continuously. An 80,000 lb combination on a 6% grade with a 400 hp engine brake needs 320 hp at 25 mph, which the retarder covers with 80 hp to spare, and balances at 31.2 mph; at 45 mph the demand is 576 hp and 176 hp is going into the service brakes with nowhere to put it, and on a six-mile grade they will be gone before the bottom. Note how sharply the balance speed falls with weight: the same truck at 105,000 lb on a permit load balances at only 23.8 mph. This is the arithmetic behind the old rule about descending in a lower gear than you climbed in, and it makes the rule quantitative. A screen; the posted grade speed, the truck's own brake condition, and the driver govern.",
  };
}

export const safeDescentSpeedExample = { inputs: { gcw_lb: 80000, grade_pct: 6, descent_speed_mph: 45, engine_brake_hp: 400 } };

TRUCKING_RENDERERS["safe-descent-speed"] = _simpleRenderer({
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
// dims: in { args: dimensionless } out: { margin_in: L, defective_fraction_pct: dimensionless }
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
  const brakes_to_oos = Math.max(0, Math.ceil(0.2 * total_brakes) - defective_brakes);
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

TRUCKING_RENDERERS["air-brake-pushrod-stroke"] = _simpleRenderer({
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
// dims: in { args: dimensionless } out: { width_excess_ft: L, height_excess_ft: L, length_excess_ft: L, weight_excess_lb: M }
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
    note: "Four comparisons against the limits for a specific route, reported as the excess on each rather than as a bare pass or fail. Width is the one federal number that holds almost everywhere at 8 ft 6 in on the National Network and most state systems. Height is entirely state law and runs from 13 ft 6 in to 14 ft 6 in depending on where you are. Length is regulated by trailer rather than by combination on the National Network with no federal overall limit, and states impose their own off-network. Gross weight is 80,000 lb federally on the Interstate system, subject to the axle and bridge-formula limits computed separately. Reporting the excess is the point, because permit fee schedules, escort requirements, travel-time restrictions, and route surveys all key off how far over you are in bands: a load two inches over width is a different conversation from one four feet over. A load 12 ft 0 in wide, 14 ft 6 in high, 75 ft long and 90,000 lb gross, screened against an 8 ft 6 in / 14 ft 0 in / 75 ft / 80,000 lb route, is 3.5 ft over on width, half a foot over on height, exactly at the limit on length, and 10,000 lb over on weight -- three permits, and at 3.5 ft over width most states will require escorts and restrict travel to daylight hours on weekdays. The half foot of height is the sleeper: small enough to overlook and the dimension that hits a bridge. A screen; the permitting state's own limits, its fee and escort schedule, and an actual route survey govern.",
  };
}

export const oversizePermitScreenExample = { inputs: { width_ft: 12.0, height_ft: 14.5, length_ft: 75, weight_lb: 90000, width_limit_ft: 8.5, height_limit_ft: 14.0, length_limit_ft: 75, weight_limit_lb: 80000 } };

TRUCKING_RENDERERS["oversize-permit-screen"] = _simpleRenderer({
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
// dims: in { args: dimensionless } out: { table2_aggregate_lb: M, threshold_met: dimensionless }
export function computeHazmatPlacardThreshold({ materials = [], table1_present = false } = {}) {
  if (!Array.isArray(materials) || materials.length === 0) return { error: "List at least one hazardous material with its gross weight." };
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
  if (!(table2_aggregate_lb > 0) && !any_table1) return { error: "Enter a gross weight for at least one material." };
  const threshold_met = table2_aggregate_lb >= 1001;
  const placard_required = threshold_met || any_table1;
  const margin_lb = 1001 - table2_aggregate_lb;
  const class_list = [...classes].sort().join(", ");
  const verdict = any_table1
    ? "PLACARD REQUIRED: a Table 1 material is aboard, which is placarded at any quantity with no threshold"
    : threshold_met
      ? "PLACARD REQUIRED: the Table 2 aggregate is at or above 1,001 lb"
      : "not placarded on the Table 2 threshold, " + fmt(margin_lb, 0) + " lb short of 1,001 lb -- a PLACARDING exemption only, not a hazmat exemption";
  if (!Number.isFinite(table2_aggregate_lb)) return { error: "Placarding math is not a finite value." };
  return {
    table2_aggregate_lb,
    threshold_met,
    any_table1,
    placard_required,
    margin_lb,
    class_list,
    class_count: classes.size,
    verdict,
    note: "Whether a load has to be placarded, from the two thresholds that govern it. Hazardous materials split into two tables. Table 1 materials -- among them explosives of divisions 1.1, 1.2 and 1.3, poison-inhalation-hazard materials, and certain radioactives -- must be placarded at ANY quantity, with no threshold at all. Table 2 covers everything else, and a vehicle carrying Table 2 materials must be placarded when the aggregate gross weight of all of them reaches 1,001 pounds. Two details cause most of the errors. First, the aggregate is across ALL Table 2 hazard classes on the vehicle rather than per class: 600 lb of flammable liquid and 500 lb of corrosive is 1,100 lb aggregate and the vehicle gets placarded for both. Second, it is GROSS weight, package and contents together, not net product weight, and drums and totes weigh a great deal empty. A load of 400 lb gross of one Class 3 flammable liquid and 700 lb gross of a second aggregates to 1,100 lb and is placarded; drop the second to 550 lb and the aggregate is 950 lb and it is not. Everything else still applies at any weight -- shipping papers, package marking and labeling, segregation, emergency response information, and driver training have no 1,001 lb threshold. Under 1,001 lb is a PLACARDING exemption, not a hazmat exemption, and treating it as one is how carriers end up cited. A screen; 49 CFR 172.504 and its tables in full, the shipper's papers, and the carrier's hazmat program govern.",
  };
}

export const hazmatPlacardThresholdExample = {
  inputs: {
    materials: [
      { name: "flammable liquid, drum", hazard_class: "3", gross_lb: 400, table1: false },
      { name: "flammable liquid, tote", hazard_class: "3", gross_lb: 700, table1: false },
    ],
    table1_present: false,
  },
};

function renderHazmatPlacardThreshold(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: 49 CFR 172.504 placarding thresholds -- Table 1 materials placarded at any quantity, Table 2 materials at a 1,001 lb aggregate GROSS weight across all Table 2 classes on the vehicle -- cited by section and not reproduced. Under 1,001 lb is a placarding exemption only: papers, marking, labeling, segregation, emergency response information, and driver training have no threshold. 49 CFR 172 in full, the shipper's papers, and the carrier's hazmat program govern.";
  attachExampleButton(inputRegion, () => fillExample(hazmatPlacardThresholdExample.inputs));
  const list = document.createElement("div"); inputRegion.appendChild(list);
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const tag = "Material " + (i + 1) + " ";
    const nF = makeRowField(tag + "name", "hzp-i" + i + "-n", { type: "text", inputmode: "text" });
    const cF = makeRowField(tag + "hazard class or division", "hzp-i" + i + "-c", { type: "text", inputmode: "text" });
    const gF = makeRowField(tag + "gross weight (lb)", "hzp-i" + i + "-g", { step: "any", min: "0" });
    for (const f of [nF, cF, gF]) wrap.appendChild(f.wrap);
    list.appendChild(wrap);
    [nF.input, cF.input, gF.input].forEach((el) => el.addEventListener("input", update));
    rows.push({ n: nF.input, c: cF.input, g: gF.input });
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
      if (m) { rows[i].n.value = m.name; rows[i].c.value = m.hazard_class; rows[i].g.value = m.gross_lb; }
    }
    t1.input.checked = !!v.table1_present;
    update();
  }
  function update() {
    const materials = rows
      .map((r) => ({ name: r.n.value, hazard_class: r.c.value, gross_lb: Number(r.g.value) || 0, table1: false }))
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
TRUCKING_RENDERERS["hazmat-placard-threshold"] = renderHazmatPlacardThreshold;

// ===================== spec-v1383: idle fuel burn, cost, and engine-hour equivalent =====================
// dims: in { args: dimensionless } out: { annual_idle_hours: T, annual_gallons: L^3, annual_cost: dimensionless, equivalent_miles: L }
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

TRUCKING_RENDERERS["idle-fuel-cost"] = _simpleRenderer({
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
// dims: in { args: dimensionless } out: { width_needed_ft: L, tarps_needed: dimensionless, covered_length_ft: L, total_weight_lb: M }
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
  const width_ok = tarp_width_ft >= width_needed_ft;
  const width_spare_ft = tarp_width_ft - width_needed_ft;
  const tarps_needed = Math.max(1, Math.ceil((load_length_ft - overlap_ft) / (tarp_length_ft - overlap_ft)));
  const covered_length_ft = tarps_needed * tarp_length_ft - (tarps_needed - 1) * overlap_ft;
  const total_weight_lb = tarps_needed * tarp_weight_lb;
  const length_ok = covered_length_ft >= load_length_ft;
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

TRUCKING_RENDERERS["flatbed-tarp-size"] = _simpleRenderer({
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
// dims: in { args: dimensionless } out: { bearing_pressure_psf: M L^-1 T^-2, linear_load_plf: M L^-1, utilization_pct: dimensionless, required_length_ft: L }
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
    note: "Whether a concentrated load spread on dunnage stays inside a trailer deck's rating, and how many feet of bearing it takes if it does not. Trailer decks are rated in pounds per LINEAR FOOT, because that is how the crossmembers under them are designed: a 48 ft deck rated for 55,000 lb is carrying roughly 1,150 lb on every foot of its length, and it assumes the load is spread that way. A machine standing on four small feet puts its whole weight into a square foot of deck between two crossmembers, which is not what the deck was designed to do -- four 6 by 6 in feet under a 12,000 lb machine is one square foot of total bearing and 12,000 psf into the deck plate, an order of magnitude past what any deck plate carries, and the feet go through. Dunnage exists to convert that point load back into a linear one: timbers run across the deck, perpendicular to the crossmembers, spread the load along the trailer's length, and it is the LENGTH of that bearing along the trailer -- not its width, and not the timber's cross-section -- that divides the load. The most useful output is the last one. A 12,000 lb machine on a deck rated 1,200 plf planned on two 8 ft timbers puts 1,500 plf into the deck at 125% of the rating; ten feet of bearing lands exactly at the rating and twelve feet gives a comfortable 83%. A screen, never a stamp: the trailer manufacturer's published deck rating and concentrated-load rating, and a qualified person, govern.",
  };
}

export const deckPointLoadDunnageExample = { inputs: { load_lb: 12000, feet_count: 4, foot_area_sqin: 36, dunnage_bearing_ft: 8, deck_rating_plf: 1200 } };

TRUCKING_RENDERERS["deck-point-load-dunnage"] = _simpleRenderer({
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
