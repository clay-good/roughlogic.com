// Group F (cont.): NFPA 13 / NFPA 20 fire-sprinkler system-design bench.
// spec-v248..v250 establish this new lazy-loaded renderer module -- a sibling
// split off from calc-fire.js exactly as calc-rescue.js was (the fire module
// already sits near its size cap). The catalog carried deep fire-service
// hydraulics (pdp, hydrant-flow, standpipe-pdp, iso-nff) and the sprinkler
// discharge side (sprinkler-density, sprinkler-k-factor); this bench adds the
// three numbers a fire-protection designer sets before a single head goes up:
// the pump that feeds the system, the water demand and stored supply that pump
// must sustain, and the head layout that puts the density on the floor.
// Every tile keeps group: "F" (a tile's group letter is independent of the
// module that holds it -- the spec-v70..v98 split precedent). Tiles:
//   v248 fire-pump-curve            (NFPA 20 churn / rated / 150% overload envelope)
//   v249 sprinkler-system-demand    (NFPA 13 density x area + hose, duration, volume)
//   v250 sprinkler-head-layout      (NFPA 13 protection-area / spacing caps, head count)
//   v479 sprinkler-pressure-demand  (NFPA 13 base-of-riser demand: K-factor + Hazen-Williams + elevation)
// All GOVERNANCE.general design aids; the hazard-class densities, areas, hose
// allowances, and spacing caps are editable defaults from the NFPA 13 tables.
// See spec-v248.md..v250.md.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input (copied verbatim
// from the sibling calc-* modules; non-exported, so it adds no corpus row).
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

// Compact renderer factory (same shape as the calc-steel / calc-construction
// _simpleRenderer factories) supporting number and select inputs.
function _simpleRenderer(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id, f.options);
      else field = makeNumber(f.label, f.id, f.attrs || { step: "any", min: "0" });
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
}

export const FIRESPRINKLER_RENDERERS = {};

// ===================== spec-v248: fire pump rated / churn / overload curve check =====================

// dims: in { rated_gpm: L^3 T^-1, rated_psi: M L^-1 T^-2, churn_psi: M L^-1 T^-2, overload_psi: M L^-1 T^-2 } out: { churn_limit_psi: M L^-1 T^-2, overload_flow_gpm: L^3 T^-1, overload_min_psi: M L^-1 T^-2, churn_margin_pct: dimensionless, overload_margin_pct: dimensionless }
export function computeFirePumpCurve({ rated_gpm = 0, rated_psi = 0, churn_psi = 0, overload_psi = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rated_gpm > 0)) return { error: "Rated flow must be positive (gpm)." };
  if (!(rated_psi > 0)) return { error: "Rated pressure must be positive (psi)." };
  if (churn_psi < 0) return { error: "Churn pressure cannot be negative (psi)." };
  if (overload_psi < 0) return { error: "Overload pressure cannot be negative (psi)." };
  const churn_limit_psi = 1.40 * rated_psi;
  const overload_flow_gpm = 1.50 * rated_gpm;
  const overload_min_psi = 0.65 * rated_psi;
  const churn_ok = churn_psi > 0 ? churn_psi <= churn_limit_psi : null;
  const overload_ok = overload_psi > 0 ? overload_psi >= overload_min_psi : null;
  const churn_margin_pct = churn_psi > 0 ? (churn_limit_psi - churn_psi) / rated_psi * 100 : null;
  const overload_margin_pct = overload_psi > 0 ? (overload_psi - overload_min_psi) / rated_psi * 100 : null;
  return { churn_limit_psi, overload_flow_gpm, overload_min_psi, churn_ok, overload_ok, churn_margin_pct, overload_margin_pct };
}

export const firePumpCurveExample = { inputs: { rated_gpm: 500, rated_psi: 100, churn_psi: 128, overload_psi: 72 } };

FIRESPRINKLER_RENDERERS["fire-pump-curve"] = _simpleRenderer({
  citation: "Citation: NFPA 20 (Standard for the Installation of Stationary Pumps for Fire Protection), 2022: a listed centrifugal fire pump must not shut off (churn) at more than 140% of its rated total pressure (churn ceiling = 1.40 x rated psi), and it must deliver at least 65% of rated pressure at 150% of rated flow (overload flow = 1.50 x rated gpm, overload floor = 0.65 x rated psi). The churn and 150%-flow points come from the field acceptance test with a calibrated flow-measuring device. A churn pressure that would push the system above its component rating requires a listed pressure-relief valve (NFPA 20 does not by itself waive that requirement), and the rated point and net pressure must still meet the system demand computed separately (see the sprinkler system demand tile). A design and acceptance-check aid, not a stamped fire-pump submittal -- a qualified fire-protection engineer and the AHJ govern.",
  example: firePumpCurveExample.inputs,
  fields: [
    { key: "rated_gpm", label: "Pump rated flow (gpm)", kind: "number" },
    { key: "rated_psi", label: "Pump rated net pressure (psi)", kind: "number" },
    { key: "churn_psi", label: "Measured churn / shutoff pressure (psi, 0 = not entered)", kind: "number", default: 0 },
    { key: "overload_psi", label: "Measured pressure at 150% flow (psi, 0 = not entered)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "cl", id: "fpc-out-cl", label: "Churn limit (140% of rated)", value: (r) => fmt(r.churn_limit_psi, 1) + " psi" },
    { key: "op", id: "fpc-out-op", label: "Overload point (150% flow)", value: (r) => fmt(r.overload_flow_gpm, 0) + " gpm at >= " + fmt(r.overload_min_psi, 1) + " psi" },
    { key: "cc", id: "fpc-out-cc", label: "Churn check", value: (r) => r.churn_ok === null ? "- (not entered)" : (r.churn_ok ? "PASS" : "FAIL") + " (margin " + fmt(r.churn_margin_pct, 1) + "% of rated)" },
    { key: "oc", id: "fpc-out-oc", label: "Overload check", value: (r) => r.overload_ok === null ? "- (not entered)" : (r.overload_ok ? "PASS" : "FAIL") + " (margin " + fmt(r.overload_margin_pct, 1) + "% of rated)" },
  ],
  compute: computeFirePumpCurve,
});

// ===================== spec-v249: sprinkler system demand and water supply =====================

// dims: in { density: L T^-1, design_area: L^2, hose_gpm: L^3 T^-1, duration_min: T } out: { sprinkler_gpm: L^3 T^-1, total_gpm: L^3 T^-1, volume_gal: L^3 }
export function computeSprinklerSystemDemand({ density = 0.20, design_area = 1500, hose_gpm = 250, duration_min = 90 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(density > 0)) return { error: "Design density must be positive (gpm/ft^2)." };
  if (!(design_area > 0)) return { error: "Design area must be positive (ft^2)." };
  if (hose_gpm < 0) return { error: "Hose allowance cannot be negative (gpm)." };
  if (!(duration_min > 0)) return { error: "Supply duration must be positive (min)." };
  const sprinkler_gpm = density * design_area;
  const total_gpm = sprinkler_gpm + hose_gpm;
  const volume_gal = total_gpm * duration_min;
  return { sprinkler_gpm, total_gpm, volume_gal };
}

export const sprinklerSystemDemandExample = { inputs: { density: 0.20, design_area: 1500, hose_gpm: 250, duration_min: 90 } };

FIRESPRINKLER_RENDERERS["sprinkler-system-demand"] = _simpleRenderer({
  citation: "Citation: NFPA 13 (Standard for the Installation of Sprinkler Systems), 2022: sprinkler demand = density x design area, total demand = sprinkler demand + inside/outside hose-stream allowance, stored volume = total demand x duration. Hazard-class defaults are editable: Light 0.10 gpm/ft^2 over 1,500 ft^2 with 100 gpm hose for 30 min; Ordinary Group 1 0.15 / 1,500 / 250 / 60-90; Ordinary Group 2 0.20 / 1,500 / 250 / 60-90. This is the area/density (pipe-schedule-style) screening demand -- a full hydraulic calculation to the most-remote area including friction and elevation yields the governing demand and is a separate analysis. The density / area / duration come from the applicable NFPA 13 density-area curve for the actual commodity and storage arrangement; storage and special occupancies (ESFR, high-piled, in-rack) use their own criteria. A design aid, not a stamped hydraulic submittal -- a qualified fire-protection engineer and the AHJ govern.",
  example: sprinklerSystemDemandExample.inputs,
  fields: [
    { key: "density", label: "Design density (gpm/ft^2)", kind: "number", default: 0.20 },
    { key: "design_area", label: "Hydraulic design area (ft^2)", kind: "number", default: 1500 },
    { key: "hose_gpm", label: "Hose-stream allowance (gpm)", kind: "number", default: 250 },
    { key: "duration_min", label: "Required supply duration (min)", kind: "number", default: 90 },
  ],
  outputs: [
    { key: "sg", id: "ssd-out-sg", label: "Sprinkler demand", value: (r) => fmt(r.sprinkler_gpm, 0) + " gpm" },
    { key: "tg", id: "ssd-out-tg", label: "Total demand (with hose)", value: (r) => fmt(r.total_gpm, 0) + " gpm" },
    { key: "vg", id: "ssd-out-vg", label: "Stored supply for duration", value: (r) => fmt(r.volume_gal, 0) + " gal" },
  ],
  compute: computeSprinklerSystemDemand,
});

// ===================== spec-v250: sprinkler head count and spacing =====================

// dims: in { room_length: L, room_width: L, area_per_head: L^2, max_spacing: L } out: { spacing: L, heads_per_line: dimensionless, num_lines: dimensionless, total_heads: dimensionless, room_area: L^2, achieved_area_per_head: L^2, max_wall_distance: L }
export function computeSprinklerHeadLayout({ room_length = 0, room_width = 0, area_per_head = 130, max_spacing = 15 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(room_length > 0)) return { error: "Room length must be positive (ft)." };
  if (!(room_width > 0)) return { error: "Room width must be positive (ft)." };
  if (!(area_per_head > 0)) return { error: "Protection area per head must be positive (ft^2)." };
  if (!(max_spacing > 0)) return { error: "Maximum spacing must be positive (ft)." };
  const spacing = Math.min(max_spacing, Math.sqrt(area_per_head));
  const heads_per_line = Math.ceil(room_length / spacing);
  const num_lines = Math.ceil(room_width / spacing);
  const total_heads = heads_per_line * num_lines;
  const room_area = room_length * room_width;
  const achieved_area_per_head = room_area / total_heads;
  const max_wall_distance = spacing / 2;
  const coverage_ok = achieved_area_per_head <= area_per_head;
  return { spacing, heads_per_line, num_lines, total_heads, room_area, achieved_area_per_head, max_wall_distance, coverage_ok };
}

export const sprinklerHeadLayoutExample = { inputs: { room_length: 40, room_width: 30, area_per_head: 130, max_spacing: 15 } };

FIRESPRINKLER_RENDERERS["sprinkler-head-layout"] = _simpleRenderer({
  citation: "Citation: NFPA 13 (Standard for the Installation of Sprinkler Systems), 2022 protection-area and spacing caps for standard-spray upright / pendent heads: governing spacing = min(max spacing, sqrt(area per head)), heads per line = ceil(length / spacing), lines = ceil(width / spacing), total = heads per line x lines, achieved area per head = room area / total, max wall distance = spacing / 2. Hazard-class caps are editable: Light 225 ft^2 / 15 ft, Ordinary 130 ft^2 / 15 ft, Extra 100 ft^2 / 12 ft (hydraulically calculated). A rectangular-bay estimate -- obstructions, beams and the beam rule, sloped or high ceilings, small rooms, extended-coverage and residential heads, and ESFR / storage layouts each have their own spacing and clearance rules, and the minimum spacing between heads (typically 6 ft, to prevent cold-soldering) is a separate check. A takeoff aid, not a stamped sprinkler layout -- a qualified fire-protection designer and the AHJ govern.",
  example: sprinklerHeadLayoutExample.inputs,
  fields: [
    { key: "room_length", label: "Room length (ft)", kind: "number" },
    { key: "room_width", label: "Room width (ft)", kind: "number" },
    { key: "area_per_head", label: "Max protection area per head (ft^2)", kind: "number", default: 130 },
    { key: "max_spacing", label: "Max spacing between heads (ft)", kind: "number", default: 15 },
  ],
  outputs: [
    { key: "sp", id: "shl-out-sp", label: "Governing spacing", value: (r) => fmt(r.spacing, 2) + " ft" },
    { key: "gr", id: "shl-out-gr", label: "Heads per line x lines", value: (r) => r.heads_per_line + " x " + r.num_lines },
    { key: "th", id: "shl-out-th", label: "Total heads", value: (r) => String(r.total_heads) },
    { key: "aa", id: "shl-out-aa", label: "Achieved area per head", value: (r) => fmt(r.achieved_area_per_head, 1) + " ft^2" + (r.coverage_ok ? " (OK)" : " (OVER)") },
    { key: "wd", id: "shl-out-wd", label: "Max distance to walls", value: (r) => fmt(r.max_wall_distance, 2) + " ft" },
  ],
  compute: computeSprinklerHeadLayout,
});

// ===================== spec-v479: sprinkler pressure demand at the base of riser =====================

// dims: in { q_head_gpm: L^3 T^-1, k_factor: dimensionless, q_total_gpm: L^3 T^-1, pipe_id_in: L, c_factor: dimensionless, equiv_length_ft: L, elevation_ft: L } out: { start_pressure_psi: M L^-1 T^-2, friction_per_ft_psi: M L^-1 T^-2, friction_psi: M L^-1 T^-2, elevation_psi: M L^-1 T^-2, demand_psi: M L^-1 T^-2 }
export function computeSprinklerPressureDemand({ q_head_gpm = 0, k_factor = 5.6, q_total_gpm = 0, pipe_id_in = 0, c_factor = 120, equiv_length_ft = 0, elevation_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(q_head_gpm > 0)) return { error: "Remote-head flow must be positive (gpm)." };
  if (!(k_factor > 0)) return { error: "K-factor must be positive (gpm/psi^0.5)." };
  if (!(q_total_gpm > 0)) return { error: "Total flow must be positive (gpm)." };
  if (!(pipe_id_in > 0)) return { error: "Pipe internal diameter must be positive (in)." };
  if (!(c_factor > 0)) return { error: "Hazen-Williams C must be positive." };
  if (equiv_length_ft < 0) return { error: "Equivalent length cannot be negative (ft)." };
  const start_pressure_psi = Math.pow(q_head_gpm / k_factor, 2);
  const friction_per_ft_psi = 4.52 * Math.pow(q_total_gpm, 1.85) / (Math.pow(c_factor, 1.85) * Math.pow(pipe_id_in, 4.87));
  const friction_psi = friction_per_ft_psi * equiv_length_ft;
  const elevation_psi = 0.433 * elevation_ft;
  const demand_psi = start_pressure_psi + friction_psi + elevation_psi;
  const below_min = start_pressure_psi < 7;
  return { start_pressure_psi, friction_per_ft_psi, friction_psi, elevation_psi, demand_psi, below_min };
}

export const sprinklerPressureDemandExample = { inputs: { q_head_gpm: 26, k_factor: 5.6, q_total_gpm: 260, pipe_id_in: 3.068, c_factor: 120, equiv_length_ft: 150, elevation_ft: 15 } };

FIRESPRINKLER_RENDERERS["sprinkler-pressure-demand"] = _simpleRenderer({
  citation: "Citation: NFPA 13 (Standard for the Installation of Sprinkler Systems), 2022 hydraulic method: the pressure demand at the base of the riser is the start pressure at the hydraulically most remote sprinkler P1 = (Q_head / K)^2 (the K-factor discharge relation Q = K sqrt(P)), plus the Hazen-Williams friction loss p = 4.52 Q^1.85 / (C^1.85 d^4.87) psi per foot carried over the governing run's equivalent length, plus the elevation head 0.433 psi per foot to lift the water to the head. The Hazen-Williams C defaults are the NFPA 13 pipe-type values (120 black/galvanized steel, 150 copper or listed CPVC, 100 old unlined cast iron), the equivalent length is the actual pipe plus the fitting/valve equivalents from the NFPA 13 fitting table, and the 7 psi minimum operating pressure at the end sprinkler is the standard-spray floor (flagged, not enforced). This assembles one representative flowing path; a full stamped design balances every node, branch, and grid loop in the remote area. A design aid, not a stamped hydraulic submittal - a qualified fire-protection engineer and the AHJ govern.",
  example: sprinklerPressureDemandExample.inputs,
  fields: [
    { key: "q_head_gpm", label: "Flow at most remote head (gpm)", kind: "number", default: 26 },
    { key: "k_factor", label: "Sprinkler K-factor (gpm/psi^0.5)", kind: "number", default: 5.6 },
    { key: "q_total_gpm", label: "Total flow through governing run (gpm)", kind: "number", default: 260 },
    { key: "pipe_id_in", label: "Pipe internal diameter (in)", kind: "number", default: 3.068 },
    { key: "c_factor", label: "Hazen-Williams C (120 steel / 150 CPVC / 100 old CI)", kind: "number", default: 120 },
    { key: "equiv_length_ft", label: "Equivalent length: pipe + fittings (ft)", kind: "number", default: 150 },
    { key: "elevation_ft", label: "Elevation of remote head above base of riser (ft)", kind: "number", default: 15 },
  ],
  outputs: [
    { key: "sp", id: "spd-out-sp", label: "Start pressure at remote head", value: (r) => fmt(r.start_pressure_psi, 1) + " psi" + (r.below_min ? " (below 7 psi minimum)" : "") },
    { key: "pf", id: "spd-out-pf", label: "Friction loss rate", value: (r) => fmt(r.friction_per_ft_psi, 4) + " psi/ft" },
    { key: "fr", id: "spd-out-fr", label: "Friction loss over run", value: (r) => fmt(r.friction_psi, 1) + " psi" },
    { key: "el", id: "spd-out-el", label: "Elevation head", value: (r) => fmt(r.elevation_psi, 1) + " psi" },
    { key: "dm", id: "spd-out-dm", label: "Demand at base of riser", value: (r) => fmt(r.demand_psi, 1) + " psi" },
  ],
  compute: computeSprinklerPressureDemand,
});
