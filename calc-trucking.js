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

export function computeDIM({ length_in = 0, width_in = 0, height_in = 0, actual_weight_lb = 0, carrier = "UPS_Daily" }) {
  const c = DIM_DIVISORS[carrier];
  if (!c) return { error: "Unknown carrier." };
  if (!(length_in > 0 && width_in > 0 && height_in > 0)) return { error: "Dimensions must be positive." };
  if (!(actual_weight_lb >= 0)) return { error: "Actual weight must be non-negative." };
  const dim_lb = (length_in * width_in * height_in) / c.divisor;
  const billable_lb = Math.max(dim_lb, actual_weight_lb);
  return { dim_lb, billable_lb, divisor: c.divisor, attribution: c.attribution };
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

export function computeFreightDensity({ length_in = 0, width_in = 0, height_in = 0, weight_lb = 0 }) {
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

export function computePalletLoadout({
  case_length_in = 0, case_width_in = 0, case_height_in = 0, case_weight_lb = 0,
  cases_per_pallet = 1,
  pallet_length_in = 48, pallet_width_in = 40, pallet_height_in = 48,
  trailer = "dry_van_53", pinwheel = false,
}) {
  const tr = TRAILER_DIMENSIONS_IN[trailer];
  if (!tr) return { error: "Unknown trailer." };
  if (!(case_length_in > 0 && case_width_in > 0 && case_height_in > 0)) return { error: "Case dimensions must be positive." };
  if (!(cases_per_pallet >= 1)) return { error: "Cases per pallet must be at least 1." };

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

  return {
    pallets_by_floor, pallets_by_weight, pallets_total,
    cube_fill_percent, total_weight_lb, flag,
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
  "passenger_70_7": { drive_max: 10, on_duty_window: 15, weekly_max: 60, weekly_window_days: 7 },
};

export function computeHOS({ profile = "property_70_8", events = [], weekly_on_duty_used_hr = 0 }) {
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
  return {
    drive_used, drive_remaining,
    on_duty_used, on_duty_remaining,
    weekly_remaining, needs_break: needs_break_at_8_hours,
    break_taken,
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

export function computeBridgeFormula({ axle_weights_lb = [], axle_spacings_ft = [] }) {
  if (!Array.isArray(axle_weights_lb) || axle_weights_lb.length < 1) return { error: "Provide at least one axle." };
  if (!Array.isArray(axle_spacings_ft)) return { error: "Spacings must be a list." };
  if (axle_spacings_ft.length !== axle_weights_lb.length - 1) {
    return { error: "Spacings list length must equal axle count minus 1." };
  }
  const total = axle_weights_lb.reduce((a, b) => a + (Number(b) || 0), 0);
  // Per-axle flags
  const single_max = 20000;
  const tandem_max = 34000;
  const violations = [];
  axle_weights_lb.forEach((w, i) => {
    if (w > single_max) violations.push("axle " + (i + 1) + " exceeds 20,000 lb single limit");
  });
  // Tandem groups (consecutive axles within ~8 ft)
  for (let i = 0; i < axle_weights_lb.length - 1; i++) {
    const spacing = Number(axle_spacings_ft[i]) || 0;
    if (spacing <= 8 && (axle_weights_lb[i] + axle_weights_lb[i + 1]) > tandem_max) {
      violations.push("axles " + (i + 1) + "-" + (i + 2) + " exceed 34,000 lb tandem limit");
    }
  }
  // Bridge formula across every group of consecutive axles N >= 2:
  let bridge_violations = [];
  for (let i = 0; i < axle_weights_lb.length; i++) {
    let group_weight = axle_weights_lb[i];
    let group_length = 0;
    for (let j = i + 1; j < axle_weights_lb.length; j++) {
      group_length += Number(axle_spacings_ft[j - 1]) || 0;
      group_weight += axle_weights_lb[j];
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

export function computeReeferBurn({ unit = "thermo_king_continuous", tank_gal = 50, haul_hr = 24, ambient_band = "moderate" }) {
  const u = REEFER_BURN_GPH[unit];
  if (!u) return { error: "Unknown reefer unit." };
  if (!(tank_gal > 0)) return { error: "Tank must be positive." };
  if (!(haul_hr > 0)) return { error: "Haul hours must be positive." };
  const ambient_factor = ambient_band === "hot" ? 1.20 : (ambient_band === "cold" ? 0.85 : 1.00);
  const gph = u.gph * ambient_factor;
  const fuel_burned = gph * haul_hr;
  const run_time_hr = tank_gal / gph;
  return {
    gph, fuel_burned, run_time_hr,
    refuel_required: fuel_burned > tank_gal,
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
  ],
  compute: computePalletLoadout,
});

function renderHOS(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: Math aid for personal verification. The ELD on the truck is the legal record. Citation: FMCSA 49 CFR 395 by section number only.";
  attachExampleButton(inputRegion, () => fillExample(hosExample.inputs));
  const profile = makeSelect("Profile", "hos-p", [
    { value: "property_70_8", label: "Property 70/8" },
    { value: "property_60_7", label: "Property 60/7" },
    { value: "passenger_70_7", label: "Passenger 70/7" },
  ]);
  const weekly = makeNumber("Weekly on-duty already used (hr)", "hos-w", { step: "any", min: "0" });
  inputRegion.appendChild(profile.wrap);
  inputRegion.appendChild(weekly.wrap);

  const eventsList = document.createElement("div");
  inputRegion.appendChild(eventsList);
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const k = document.createElement("select");
    for (const v of ["drive", "on_duty", "sleeper", "off_duty"]) {
      const o = document.createElement("option"); o.value = v; o.textContent = v.replace("_", " "); k.appendChild(o);
    }
    const h = document.createElement("input"); h.type = "number"; h.step = "any"; h.min = "0"; h.placeholder = "Hours";
    wrap.appendChild(k); wrap.appendChild(h); eventsList.appendChild(wrap);
    k.addEventListener("input", update); h.addEventListener("input", update);
    rows.push({ k, h });
  }

  const oD = makeOutputLine(outputRegion, "Drive used / remaining", "hos-out-d");
  const oW = makeOutputLine(outputRegion, "On-duty remaining (14 hr window)", "hos-out-w");
  const oWk = makeOutputLine(outputRegion, "Weekly remaining", "hos-out-wk");
  const oB = makeOutputLine(outputRegion, "30-min break", "hos-out-b");

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
    const r = computeHOS({ profile: profile.select.value, events, weekly_on_duty_used_hr: Number(weekly.input.value) || 0 });
    if (r.error) { oD.textContent = r.error; oW.textContent = "-"; oWk.textContent = "-"; oB.textContent = "-"; return; }
    oD.textContent = fmt(r.drive_used, 2) + " / " + fmt(r.drive_remaining, 2) + " hr";
    oW.textContent = fmt(r.on_duty_remaining, 2) + " hr";
    oWk.textContent = fmt(r.weekly_remaining, 2) + " hr";
    oB.textContent = r.needs_break ? "REQUIRED (8+ hr drive without 30-min)" : "ok";
  }
}

function renderBridgeFormula(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: 23 CFR 658 / FHWA Bridge Formula by section number only. W = 500 * (LN/(N-1) + 12N + 36) for any consecutive axle group N >= 2.";
  attachExampleButton(inputRegion, () => fillExample(bridgeFormulaExample.inputs));
  const list = document.createElement("div"); inputRegion.appendChild(list);
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const wrap = document.createElement("div"); wrap.className = "field";
    const aw = document.createElement("input"); aw.type = "number"; aw.step = "any"; aw.min = "0"; aw.placeholder = "Axle " + (i + 1) + " weight (lb)";
    const ag = document.createElement("input"); ag.type = "number"; ag.step = "any"; ag.min = "0"; ag.placeholder = "Spacing to next (ft)";
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
  ],
  outputs: [
    { key: "g", id: "rf-out-g", label: "GPH (corrected)", value: (r) => fmt(r.gph, 2) },
    { key: "f", id: "rf-out-f", label: "Fuel burned",     value: (r) => fmt(r.fuel_burned, 1) + " gal" },
    { key: "t", id: "rf-out-t", label: "Run time on tank",value: (r) => fmt(r.run_time_hr, 1) + " hr" },
    { key: "r", id: "rf-out-r", label: "Refuel required", value: (r) => r.refuel_required ? "YES" : "no" },
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

export const TRUCKING_RENDERERS = {
  "dim-weight":      renderDIM,
  "freight-density": renderFreightDensity,
  "pallet-loadout":  renderPalletLoadout,
  "hos-math":        renderHOS,
  "bridge-formula":  renderBridgeFormula,
  "reefer-burn":     renderReeferBurn,
  "incoterm-decoder": renderIncoterm,
};
