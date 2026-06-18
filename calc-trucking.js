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
  makeOutputLine, attachExampleButton, fmt,
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

export const dimExample = { inputs: { length_in: 24, width_in: 18, height_in: 12, actual_weight_lb: 20, carrier: "UPS_Daily" } };

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
//        out: { pallets_by_floor: dimensionless, pallets_by_weight: dimensionless, pallets_total: dimensionless, cube_fill_percent: dimensionless, total_weight_lb: M, flag: dimensionless, binding_margin_pallets: dimensionless, slack_utilization_pct: dimensionless, trailer_cube_ft3: L^3, pallet_cube_ft3: L^3 }
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
  };
}

export const palletLoadoutExample = {
  inputs: { case_length_in: 16, case_width_in: 12, case_height_in: 10, case_weight_lb: 8, cases_per_pallet: 36, pallet_length_in: 48, pallet_width_in: 40, pallet_height_in: 48, trailer: "dry_van_53", pinwheel: false },
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

export const reeferBurnExample = { inputs: { unit: "thermo_king_continuous", tank_gal: 50, haul_hr: 36, ambient_band: "moderate" } };

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
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id, f.options);
      else if (f.kind === "checkbox") field = makeCheckbox(f.label, f.id);
      else field = makeNumber(f.label, f.id, f.attrs || { step: "any", min: "0" });
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
    { key: "pallet_length_in", label: "Pallet length (in)",kind: "number", default: 48 },
    { key: "pallet_width_in",  label: "Pallet width (in)", kind: "number", default: 40 },
    { key: "pallet_height_in", label: "Pallet height (in)",kind: "number", default: 48 },
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
    const h = document.createElement("input"); h.type = "number"; h.step = "any"; h.min = "0"; h.inputMode = "decimal"; h.placeholder = "Hours"; h.setAttribute("aria-label", "Hours for segment " + (i + 1));
    wrap.appendChild(k); wrap.appendChild(h); eventsList.appendChild(wrap);
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
    const aw = document.createElement("input"); aw.type = "number"; aw.step = "any"; aw.min = "0"; aw.inputMode = "decimal"; aw.placeholder = "Axle " + (i + 1) + " weight (lb)"; aw.setAttribute("aria-label", "Axle " + (i + 1) + " weight (lb)");
    const ag = document.createElement("input"); ag.type = "number"; ag.step = "any"; ag.min = "0"; ag.inputMode = "decimal"; ag.placeholder = "Spacing to next (ft)"; ag.setAttribute("aria-label", "Axle " + (i + 1) + " spacing to next (ft)");
    wrap.appendChild(aw); wrap.appendChild(ag); list.appendChild(wrap);
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

export const TRUCKING_RENDERERS = {
  "dim-weight":      renderDIM,
  "freight-density": renderFreightDensity,
  "pallet-loadout":  renderPalletLoadout,
  "hos-math":        renderHOS,
  "bridge-formula":  renderBridgeFormula,
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
  // 393.110: at least 1 tiedown per 10 ft (rounded up) and at least 2 for
  // articles longer than 5 ft / heavier than 1100 lb; minimum 1 otherwise.
  const min_for_length = Math.max(1, Math.ceil(len / 10));
  const min_tiedowns = (len > 5 || W > 1100) ? Math.max(2, min_for_length) : min_for_length;
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
  const fixed = makeNumber("Fixed monthly costs ($)", "cpm-fixed", { step: "any", min: "0", value: "6000" }); fixed.input.value = "6000";
  const miles = makeNumber("Miles per month", "cpm-miles", { step: "any", min: "0", value: "10000" }); miles.input.value = "10000";
  const price = makeNumber("Fuel price ($/gal)", "cpm-price", { step: "any", min: "0", value: "4.0" }); price.input.value = "4.0";
  const mpg = makeNumber("Fuel economy (mpg)", "cpm-mpg", { step: "any", min: "0", value: "6.5" }); mpg.input.value = "6.5";
  const maint = makeNumber("Maintenance ($/mi)", "cpm-maint", { step: "any", min: "0", value: "0.18" }); maint.input.value = "0.18";
  const driver = makeNumber("Driver pay ($/mi)", "cpm-driver", { step: "any", min: "0", value: "0.65" }); driver.input.value = "0.65";
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
  const loaded = makeNumber("Loaded miles", "dh-loaded", { step: "any", min: "0", value: "800" }); loaded.input.value = "800";
  const dead = makeNumber("Deadhead miles", "dh-dead", { step: "any", min: "0", value: "120" }); dead.input.value = "120";
  const rev = makeNumber("Linehaul revenue ($)", "dh-rev", { step: "any", min: "0", value: "1840" }); rev.input.value = "1840";
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
  const drive = makeNumber("Drive-tandem weight (lb)", "ald-drive", { step: "any", min: "0", value: "35200" }); drive.input.value = "35200";
  const trailer = makeNumber("Trailer-tandem weight (lb)", "ald-trailer", { step: "any", min: "0", value: "32000" }); trailer.input.value = "32000";
  const L = makeNumber("Kingpin-to-tandem distance (in)", "ald-l", { step: "any", min: "0", value: "400" }); L.input.value = "400";
  const spacing = makeNumber("Hole spacing (in)", "ald-sp", { step: "any", min: "0", value: "6" }); spacing.input.value = "6";
  const cap = makeNumber("Legal tandem cap (lb)", "ald-cap", { step: "any", min: "0", value: "34000" }); cap.input.value = "34000";
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
const loadProfitabilityExample = { inputs: { linehaul_revenue: 2200, loaded_miles: 900, deadhead_miles: 150, fuel_price: 4.0, mpg: 6.5, variable_cpm: 0.20, fixed_per_day: 250, days: 2, tolls: 40, other_costs: 0 } };
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
const fuelSurchargeExample = { inputs: { current_fuel_price: 4.25, base_fuel_price: 3.0, mpg_peg: 6.0, loaded_miles: 900 } };
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
const maintenanceReserveExample = { inputs: { tire_set_cost: 4000, tire_life_mi: 80000, pm_cost: 350, pm_interval_mi: 25000, major_reserve_cpm: 0.10, monthly_miles: 10000 } };
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
