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
  const _rlRender = function (inputRegion, outputRegion, citationEl) {
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

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
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
  hose_gpm = Number(hose_gpm);
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
    { key: "density", label: "Design density (gpm/ft²)", kind: "number" },
    { key: "design_area", label: "Hydraulic design area (ft²)", kind: "number" },
    { key: "hose_gpm", label: "Hose-stream allowance (gpm)", kind: "number" },
    { key: "duration_min", label: "Required supply duration (min)", kind: "number" },
  ],
  outputs: [
    { key: "sg", id: "ssd-out-sg", label: "Sprinkler demand", value: (r) => fmt(r.sprinkler_gpm, 0) + " gpm" },
    { key: "tg", id: "ssd-out-tg", label: "Total demand (with hose)", value: (r) => fmt(r.total_gpm, 0) + " gpm" },
    { key: "vg", id: "ssd-out-vg", label: "Stored supply for duration", value: (r) => fmt(r.volume_gal, 0) + " gal" },
  ],
  compute: computeSprinklerSystemDemand,
});

// sprinkler-protection-area-for-supply: inverse of sprinkler-system-demand. The
// forward tile gives the demand from a design area; given the water supply on
// hand, the largest design area it can protect at a density is the inverse. From
// total = density x area + hose, the sprinkler flow is supply - hose, so
// max_area = (supply - hose) / density.
// dims: in { available_supply_gpm: L^3 T^-1, density: L T^-1, hose_gpm: L^3 T^-1 } out: { max_design_area_ft2: L^2, sprinkler_gpm: L^3 T^-1 }
export function computeSprinklerProtectionAreaForSupply({ available_supply_gpm = 0, density = 0.20, hose_gpm = 250 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const supply = Number(available_supply_gpm) || 0;
  const dens = Number(density) || 0;
  const hose = Number(hose_gpm);
  if (!(supply > 0)) return { error: "Available water supply must be positive (gpm)." };
  if (!(dens > 0)) return { error: "Design density must be positive (gpm/ft^2)." };
  if (!(hose >= 0)) return { error: "Hose allowance cannot be negative (gpm)." };
  const sprinkler_gpm = supply - hose;
  if (!(sprinkler_gpm > 0)) return { error: "The hose allowance (" + hose.toFixed(0) + " gpm) meets or exceeds the supply; no flow is left for sprinklers." };
  const max_design_area_ft2 = sprinkler_gpm / dens;
  return {
    max_design_area_ft2, sprinkler_gpm,
    note: "NFPA 13 area/density demand solved for the area: with the hose-stream allowance taken off the top, the remaining supply divided by the design density is the largest hydraulic design area the water supply can serve. A lower density (a lighter hazard) or a smaller hose allowance lets the same supply cover more area. This is the area/density (pipe-schedule-style) screen -- a full hydraulic calculation to the most-remote area including friction and elevation, at the flowing pressure the supply can deliver, is the governing analysis and is separate. A design aid, not a stamped hydraulic submittal; a qualified fire-protection engineer and the AHJ govern.",
  };
}
export const sprinklerProtectionAreaForSupplyExample = { inputs: { available_supply_gpm: 550, density: 0.20, hose_gpm: 250 } };
FIRESPRINKLER_RENDERERS["sprinkler-protection-area-for-supply"] = _simpleRenderer({
  citation: "Citation: NFPA 13 (2022) area/density demand solved for the area: sprinkler flow = supply - hose allowance, max design area = sprinkler flow / density. The area/density (pipe-schedule-style) screen; a full hydraulic calculation to the most-remote area at the supply's flowing pressure governs and is separate. A design aid; a fire-protection engineer and the AHJ govern.",
  example: sprinklerProtectionAreaForSupplyExample.inputs,
  fields: [
    { key: "available_supply_gpm", label: "Available water supply (gpm)", kind: "number" },
    { key: "density", label: "Design density (gpm/ft²)", kind: "number" },
    { key: "hose_gpm", label: "Hose-stream allowance (gpm)", kind: "number" },
  ],
  outputs: [
    { key: "area", id: "spa-out-area", label: "Max hydraulic design area", value: (r) => fmt(r.max_design_area_ft2, 0) + " ft^2" },
    { key: "sg", id: "spa-out-sg", label: "Sprinkler flow available", value: (r) => fmt(r.sprinkler_gpm, 0) + " gpm" },
    { key: "n", id: "spa-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSprinklerProtectionAreaForSupply,
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
    { key: "area_per_head", label: "Max protection area per head (ft²)", kind: "number" },
    { key: "max_spacing", label: "Max spacing between heads (ft)", kind: "number" },
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
    { key: "q_head_gpm", label: "Flow at most remote head (gpm)", kind: "number" },
    { key: "k_factor", label: "Sprinkler K-factor (gpm/psi^0.5)", kind: "number" },
    { key: "q_total_gpm", label: "Total flow through governing run (gpm)", kind: "number" },
    { key: "pipe_id_in", label: "Pipe internal diameter (in)", kind: "number" },
    { key: "c_factor", label: "Hazen-Williams C (120 steel / 150 CPVC / 100 old CI)", kind: "number" },
    { key: "equiv_length_ft", label: "Equivalent length: pipe + fittings (ft)", kind: "number" },
    { key: "elevation_ft", label: "Elevation of remote head above base of riser (ft)", kind: "number" },
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

// smoke-detector-spacing-count (spec-v908): spot smoke / heat detector count on a smooth ceiling (NFPA 72).
// dims: in { room_length_ft: L, room_width_ft: L, listed_spacing_ft: L } out: { rows: dimensionless, cols: dimensionless, detectors: dimensionless, wall_max_ft: L }
export function computeSmokeDetectorSpacingCount({ room_length_ft = 60, room_width_ft = 40, listed_spacing_ft = 30 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(room_length_ft > 0)) return { error: "Room length must be positive (ft)." };
  if (!(room_width_ft > 0)) return { error: "Room width must be positive (ft)." };
  if (!(listed_spacing_ft > 0)) return { error: "Listed spacing must be positive (ft)." };
  const rows = Math.ceil(room_length_ft / listed_spacing_ft);
  const cols = Math.ceil(room_width_ft / listed_spacing_ft);
  const detectors = rows * cols;
  const wall_max_ft = listed_spacing_ft / 2;
  if (![rows, cols, detectors, wall_max_ft].every(Number.isFinite)) return { error: "Detector-count math is not a finite value." };
  return {
    rows,
    cols,
    detectors,
    wall_max_ft,
    note: "The listed spacing (about 30 ft for spot smoke on a smooth ceiling) comes from the device listing. The 0.7-times-spacing rule confirms no point is farther than that from a detector; the first detector sits within half the spacing of each wall. Beams, high ceilings, and HVAC reduce the spacing per NFPA 72. Like sprinkler-head-layout, this is an install estimate the stamped fire-alarm plan and the AHJ plan-review govern.",
  };
}

export const smokeDetectorSpacingCountExample = { inputs: { room_length_ft: 60, room_width_ft: 40, listed_spacing_ft: 30 } };
FIRESPRINKLER_RENDERERS["smoke-detector-spacing-count"] = _simpleRenderer({
  citation: "Citation: NFPA 72 spot-detector grid by name. rows = ceil(length / spacing); columns = ceil(width / spacing); detectors = rows x columns; wall maximum = spacing / 2. The 0.7-times-spacing rule confirms every point is covered.",
  example: smokeDetectorSpacingCountExample.inputs,
  fields: [
    { key: "room_length_ft", label: "Room length (ft)", kind: "number" },
    { key: "room_width_ft", label: "Room width (ft)", kind: "number" },
    { key: "listed_spacing_ft", label: "Device listed spacing (ft)", kind: "number" },
  ],
  outputs: [
    { key: "d", id: "sds-out-d", label: "Detectors", value: (r) => fmt(r.detectors, 0) + " detectors (" + fmt(r.rows, 0) + " x " + fmt(r.cols, 0) + " grid)" },
    { key: "w", id: "sds-out-w", label: "Max off each wall", value: (r) => fmt(r.wall_max_ft, 1) + " ft" },
    { key: "note", id: "sds-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeSmokeDetectorSpacingCount,
});

// ===================== spec-v934: dry-pipe / preaction air compressor CFM =====================
// dims: in { dry_volume_gal: L^3, normal_pressure_psig: dimensionless, restore_minutes: T } out: { system_ft3: L^3, free_air_cfm: L^3 T^-1 }
export function computeDrypipeAirCompressor({ dry_volume_gal = 400, normal_pressure_psig = 40, restore_minutes = 30 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(dry_volume_gal > 0)) return { error: "Dry system volume must be positive (gal)." };
  if (!(normal_pressure_psig > 0)) return { error: "Normal air pressure must be positive (psig)." };
  if (!(restore_minutes > 0)) return { error: "Restore time must be positive (min)." };
  const system_ft3 = dry_volume_gal / 7.48;
  // Free air to pressurize the system volume to the normal gauge pressure = V x (P_gauge / atmospheric);
  // spread over the NFPA 13 restore time gives the compressor free-air CFM.
  const free_air_cfm = system_ft3 * (normal_pressure_psig / 14.7) / restore_minutes;
  if (![system_ft3, free_air_cfm].every(Number.isFinite)) return { error: "Compressor-sizing math is not a finite value." };
  return {
    system_ft3,
    free_air_cfm,
    note: "Dry-pipe (or double-interlock preaction) air-compressor free-air CFM to restore the system's normal air pressure within the NFPA 13 time limit: 30 minutes for a standard system (60 minutes is allowed for some). Free air = system volume x (normal gauge pressure / 14.7 atmospheric), spread over the restore time. A 400-gal dry system to 40 psi in 30 min needs about 4.85 CFM of free air -- spec the NEXT larger compressor. A dedicated air maintenance device (not a shop compressor) with a listed automatic control is required, and an air/nitrogen source that avoids corrosion is preferred. The system volume (from the pipe schedule), the required pressure (set to keep the clapper closed with margin), and the NFPA 13 / AHJ restore time govern. A sizing estimate; the compressor manufacturer's rating at the pressure governs the pick.",
  };
}

export const drypipeAirCompressorExample = { inputs: { dry_volume_gal: 400, normal_pressure_psig: 40, restore_minutes: 30 } };

FIRESPRINKLER_RENDERERS["drypipe-air-compressor"] = _simpleRenderer({
  citation: "Citation: dry-pipe air compressor free-air CFM by name (NFPA 13 restore-time rule). free air = (system gal / 7.48) x (normal psig / 14.7) / restore minutes; restore within 30 min (60 for some systems). A listed air-maintenance device is required; the compressor rating at pressure and the AHJ govern.",
  example: drypipeAirCompressorExample.inputs,
  fields: [
    { key: "dry_volume_gal", label: "Dry system volume (gal, from pipe schedule)", kind: "number" },
    { key: "normal_pressure_psig", label: "Normal air pressure (psig)", kind: "number" },
    { key: "restore_minutes", label: "Restore time (min, NFPA 13 <= 30)", kind: "number" },
  ],
  outputs: [
    { key: "v", id: "dac-out-v", label: "System volume", value: (r) => fmt(r.system_ft3, 1) + " ft3" },
    { key: "c", id: "dac-out-c", label: "Compressor free-air CFM (spec next size up)", value: (r) => fmt(r.free_air_cfm, 2) + " CFM" },
    { key: "n", id: "dac-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDrypipeAirCompressor,
});

// ===================== spec-v939: jockey (pressure-maintenance) pump sizing =====================
// dims: in { fire_pump_gpm: L^3 T^-1, churn_psi: dimensionless, min_static_psi: dimensionless } out: { jockey_gpm: L^3 T^-1, jockey_stop_psi: dimensionless, jockey_start_psi: dimensionless, fire_pump_start_psi: dimensionless }
export function computeJockeyPumpSizing({ fire_pump_gpm = 750, churn_psi = 120, min_static_psi = 50 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fire_pump_gpm > 0)) return { error: "Fire pump rated flow must be positive (gpm)." };
  if (!(churn_psi > 0)) return { error: "Churn (shutoff) pressure must be positive (psi)." };
  if (min_static_psi < 0) return { error: "Minimum static pressure cannot be negative (psi)." };
  // Jockey flow makes up allowable leakage; NFPA 20 practice sizes it near 1% of the fire pump, minimum 1 gpm.
  const jockey_gpm = Math.max(0.01 * fire_pump_gpm, 1);
  // Pressure settings so the jockey holds the system max and the fire pump starts only if the jockey cannot keep up.
  const jockey_stop_psi = churn_psi + min_static_psi;
  const jockey_start_psi = jockey_stop_psi - 10;
  const fire_pump_start_psi = jockey_start_psi - 5;
  if (![jockey_gpm, jockey_stop_psi, jockey_start_psi, fire_pump_start_psi].every(Number.isFinite)) return { error: "Jockey-pump math is not a finite value." };
  return {
    jockey_gpm,
    jockey_stop_psi,
    jockey_start_psi,
    fire_pump_start_psi,
    note: "Jockey (pressure-maintenance) pump sizing per NFPA 20 practice. The jockey makes up small allowable leakage so the fire pump does not start on every minor drop, so its flow is small -- about 1% of the fire pump's rated flow, at least 1 gpm; a 750 gpm fire pump takes about a 7.5 gpm jockey. Its head must exceed the system's maximum pressure. The pressure switches are STAGGERED so the jockey acts first: jockey stop = fire-pump churn (shutoff) pressure + the minimum static supply pressure (the highest the system sees); jockey start = jockey stop - about 10 psi; fire-pump start = jockey start - about 5 psi, so the fire pump only starts if the jockey cannot restore pressure. A too-large jockey masks a real flow and fails to start the fire pump on a fire. A settings guide; the NFPA 20 requirements, the pressure-switch settings, and the AHJ / stamped fire-pump design govern." ,
  };
}

export const jockeyPumpSizingExample = { inputs: { fire_pump_gpm: 750, churn_psi: 120, min_static_psi: 50 } };

FIRESPRINKLER_RENDERERS["jockey-pump-sizing"] = _simpleRenderer({
  citation: "Citation: jockey (pressure-maintenance) pump sizing by name (NFPA 20). jockey flow ~1% of the fire pump (>= 1 gpm); jockey stop = churn + min static; jockey start = stop - 10; fire-pump start = jockey start - 5 (staggered). A settings guide; NFPA 20 and the AHJ govern.",
  example: jockeyPumpSizingExample.inputs,
  fields: [
    { key: "fire_pump_gpm", label: "Fire pump rated flow (gpm)", kind: "number" },
    { key: "churn_psi", label: "Fire pump churn / shutoff pressure (psi)", kind: "number" },
    { key: "min_static_psi", label: "Minimum static supply pressure (psi)", kind: "number" },
  ],
  outputs: [
    { key: "q", id: "jps-out-q", label: "Jockey pump flow", value: (r) => fmt(r.jockey_gpm, 1) + " gpm" },
    { key: "s", id: "jps-out-s", label: "Pressure settings (stop / start / fire-pump start)", value: (r) => fmt(r.jockey_stop_psi, 0) + " / " + fmt(r.jockey_start_psi, 0) + " / " + fmt(r.fire_pump_start_psi, 0) + " psi" },
    { key: "n", id: "jps-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeJockeyPumpSizing,
});

// ===========================================================================
// spec-v1386, v1387, v1390, v1393: the fire-protection half of the 2026-08-26
// trade-expansion Group F band. See specs/scope-trade-expansion.md.
// (The fire-ground half -- PPV, hose lay, FDC supply, radiant exposure --
// lives in calc-fire.js.)
// ===========================================================================

// ===================== spec-v1386: stairwell pressurization =====================
// dims: in { args: dimensionless } out: { airflow_cfm: L^3 T^-1, door_force_lbf: M L T^-2, max_pressure_inwg: M L^-1 T^-2 }
export function computeStairwellPressurization({ leakage_area_sqft = 0, pressure_inwg = 0.15, door_width_ft = 3, door_height_ft = 7, knob_setback_in = 3, closer_force_lbf = 10, force_limit_lbf = 30 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(leakage_area_sqft > 0)) return { error: "Total effective leakage area must be positive." };
  if (!(pressure_inwg > 0)) return { error: "Design pressure difference must be positive." };
  if (!(door_width_ft > 0 && door_height_ft > 0)) return { error: "Door width and height must be positive." };
  if (!(knob_setback_in > 0)) return { error: "Knob setback must be positive." };
  if (!(knob_setback_in / 12 < door_width_ft)) return { error: "Knob setback must be less than the door width." };
  if (!(closer_force_lbf >= 0)) return { error: "Door closer force cannot be negative." };
  if (!(force_limit_lbf > closer_force_lbf)) return { error: "The opening-force limit must exceed the closer force alone." };
  // Orifice flow: note the SQUARE ROOT -- doubling the design pressure multiplies the fan
  // by 1.41, not by 2. The door, not the fan, is what caps the design pressure.
  const airflow_cfm = 2610 * leakage_area_sqft * Math.sqrt(pressure_inwg);
  const door_area_sqft = door_width_ft * door_height_ft;
  const setback_ft = knob_setback_in / 12;
  const lever = 2 * (door_width_ft - setback_ft);
  const pressure_force_lbf = 5.2 * door_width_ft * door_area_sqft * pressure_inwg / lever;
  const door_force_lbf = closer_force_lbf + pressure_force_lbf;
  const margin_lbf = force_limit_lbf - door_force_lbf;
  const max_pressure_inwg = (force_limit_lbf - closer_force_lbf) * lever / (5.2 * door_width_ft * door_area_sqft);
  const verdict = door_force_lbf <= force_limit_lbf
    ? "PASSES the opening-force limit with " + fmt(margin_lbf, 1) + " lbf of margin"
    : "FAILS the opening-force limit by " + fmt(-margin_lbf, 1) + " lbf -- a person cannot reliably open this door";
  if (![airflow_cfm, door_force_lbf, margin_lbf, max_pressure_inwg].every(Number.isFinite)) return { error: "Stairwell-pressurization math is not a finite value." };
  return {
    airflow_cfm,
    door_force_lbf,
    pressure_force_lbf,
    margin_lbf,
    max_pressure_inwg,
    verdict,
    note: "The air a pressurized stairwell takes and the force it puts on the door, which are the two halves of the same design and pull against each other. A pressurized stairwell holds a positive pressure difference against the floors so smoke cannot enter, and the air it takes is an orifice problem: every gap in the enclosure -- door undercuts and edge gaps, construction leakage, penetrations -- passes flow proportional to the SQUARE ROOT of the pressure difference, with 2610 the flow coefficient in customary units. That square root matters, because doubling the design pressure does not double the fan, it multiplies it by 1.41. The second equation is the constraint that actually decides the design. Pressure across a closed door acts on the whole leaf, and the moment it produces has to be overcome at the knob, which is a short lever arm from the hinges. The code caps total opening force at 30 lbf and the door closer alone already eats 10 to 15 of it, so on a 3 by 7 door there is only so much pressure left, and the usable window between holding smoke back and letting a person out is narrow -- typically 0.10 to 0.25 in. w.g. A stairwell with 2.5 sq ft of leakage at 0.15 in. w.g. takes 2,527 cfm and opens at 18.9 lbf with a 10 lbf closer; push it to 0.25 for more smoke margin and the fan grows only 29% while the door force reaches 24.9 lbf, and with a 15 lbf closer it would be at the limit. The door, not the fan, caps the design pressure. A screen, never a stamp: the smoke-control design, its commissioning test, and a qualified engineer govern.",
  };
}

export const stairwellPressurizationExample = { inputs: { leakage_area_sqft: 2.5, pressure_inwg: 0.15, door_width_ft: 3, door_height_ft: 7, knob_setback_in: 3, closer_force_lbf: 10, force_limit_lbf: 30 } };

FIRESPRINKLER_RENDERERS["stairwell-pressurization"] = _simpleRenderer({
  citation: "Citation: stairwell pressurization airflow from the orifice relation Q = 2610 x A x sqrt(dP) in customary units (cfm, sq ft, in. w.g.), and door opening force from the pressure moment about the hinges at the knob's lever arm, by name. The 30 lbf total opening-force cap is the International Building Code / NFPA 92 limit, cited by name and not reproduced. A screen, never a stamp; the smoke-control design, its commissioning test, and a qualified engineer govern.",
  example: stairwellPressurizationExample.inputs,
  fields: [
    { key: "leakage_area_sqft", label: "Total effective leakage area (sq ft)", kind: "number" },
    { key: "pressure_inwg", label: "Design pressure difference (in. w.g.)", kind: "number" },
    { key: "door_width_ft", label: "Door width (ft)", kind: "number" },
    { key: "door_height_ft", label: "Door height (ft)", kind: "number" },
    { key: "knob_setback_in", label: "Knob setback from the latch edge (in)", kind: "number" },
    { key: "closer_force_lbf", label: "Door closer force (lbf)", kind: "number" },
    { key: "force_limit_lbf", label: "Opening-force limit (lbf)", kind: "number" },
  ],
  outputs: [
    { key: "q", id: "stpr-out-q", label: "Required pressurization airflow", value: (r) => fmt(r.airflow_cfm, 0) + " cfm" },
    { key: "f", id: "stpr-out-f", label: "Door opening force", value: (r) => fmt(r.door_force_lbf, 1) + " lbf (" + fmt(r.pressure_force_lbf, 1) + " lbf of it from the pressure)" },
    { key: "v", id: "stpr-out-v", label: "Against the opening-force limit", value: (r) => r.verdict },
    { key: "p", id: "stpr-out-p", label: "Maximum pressure this door tolerates", value: (r) => fmt(r.max_pressure_inwg, 3) + " in. w.g." },
    { key: "n", id: "stpr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeStairwellPressurization,
});

// ===================== spec-v1387: fire-protection water tank sizing =====================
// dims: in { args: dimensionless } out: { total_demand_gpm: L^3 T^-1, net_volume_gal: L^3, gross_volume_gal: L^3, refill_hours: T }
export function computeFireTankSizing({ sprinkler_demand_gpm = 0, hose_allowance_gpm = 0, duration_min = 60, unusable_fraction = 0.08, refill_gpm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(sprinkler_demand_gpm > 0)) return { error: "Sprinkler system demand must be positive." };
  if (!(hose_allowance_gpm >= 0)) return { error: "Hose stream allowance cannot be negative." };
  if (!(duration_min > 0)) return { error: "Required duration must be positive." };
  if (!(unusable_fraction >= 0 && unusable_fraction < 1)) return { error: "Unusable fraction must be at least 0 and below 1." };
  if (!(refill_gpm > 0)) return { error: "Refill rate must be positive." };
  // The tank has to hold the sprinkler demand AND the hose allowance, and the code counts
  // NET USABLE capacity: water below the outlet does not count.
  const total_demand_gpm = sprinkler_demand_gpm + hose_allowance_gpm;
  const net_volume_gal = total_demand_gpm * duration_min;
  const gross_volume_gal = net_volume_gal / (1 - unusable_fraction);
  const refill_hours = gross_volume_gal / refill_gpm / 60;
  const volume_without_hose_gal = sprinkler_demand_gpm * duration_min;
  const hose_share_pct = net_volume_gal > 0 ? (net_volume_gal - volume_without_hose_gal) / net_volume_gal * 100 : 0;
  if (![total_demand_gpm, net_volume_gal, gross_volume_gal, refill_hours, hose_share_pct].every(Number.isFinite)) return { error: "Tank-sizing math is not a finite value." };
  return {
    total_demand_gpm,
    net_volume_gal,
    gross_volume_gal,
    refill_hours,
    volume_without_hose_gal,
    hose_share_pct,
    note: "The stored water a fire-protection tank has to hold, and how long it takes to put back. The tank has to carry the sprinkler demand AND the hose stream allowance for the full required duration. The hose allowance is added to the sprinkler demand at the point of connection, and it is frequently left out of a tank calculation because it does not appear in the hydraulic calculation of the sprinkler system itself -- on a light-hazard system it can be a quarter of the total, and leaving it out undersizes the tank by that much. The gross-versus-net distinction is the second thing that gets missed: the requirement is on NET USABLE capacity, so water below the outlet, the vortex-plate allowance, and any dead volume at the bottom do not count toward it, and a tank ordered at the net figure is short by whatever that fraction is. The refill line is the operational answer, because after a fire the tank has to be restored within a maximum time, so a tank fed by a small well can be the right volume and still be unacceptable. An ordinary-hazard system demanding 750 gpm at the riser with a 250 gpm hose allowance over 60 minutes needs 60,000 gal net, which at 8% unusable is 65,217 gal gross -- a 70,000 gal tank -- and refills at 60 gpm in 18.1 hours. Without the hose allowance the net would have been 45,000 gal and a 50,000 gal tank would have looked adequate. A sizing screen, never a stamp; NFPA 22 and NFPA 13 in full, the stamped hydraulic calculation, and the AHJ govern.",
  };
}

export const fireTankSizingExample = { inputs: { sprinkler_demand_gpm: 750, hose_allowance_gpm: 250, duration_min: 60, unusable_fraction: 0.08, refill_gpm: 60 } };

FIRESPRINKLER_RENDERERS["fire-tank-sizing"] = _simpleRenderer({
  citation: "Citation: fire-protection water tank sizing per NFPA 22 (net usable capacity, and a maximum restoration time after use) with the hose stream allowance added to the sprinkler demand at the point of connection per NFPA 13, both cited by name and not reproduced. A sizing screen, never a stamp; the stamped hydraulic calculation and the AHJ govern.",
  example: fireTankSizingExample.inputs,
  fields: [
    { key: "sprinkler_demand_gpm", label: "Sprinkler demand at the point of connection (gpm)", kind: "number" },
    { key: "hose_allowance_gpm", label: "Hose stream allowance (gpm)", kind: "number" },
    { key: "duration_min", label: "Required duration (min)", kind: "number" },
    { key: "unusable_fraction", label: "Unusable fraction of tank volume (0-1)", kind: "number" },
    { key: "refill_gpm", label: "Refill rate (gpm)", kind: "number" },
  ],
  outputs: [
    { key: "d", id: "ftnk-out-d", label: "Total demand", value: (r) => fmt(r.total_demand_gpm, 0) + " gpm" },
    { key: "n", id: "ftnk-out-n", label: "Net required volume", value: (r) => fmt(r.net_volume_gal, 0) + " gal (the hose allowance is " + fmt(r.hose_share_pct, 0) + "% of it)" },
    { key: "g", id: "ftnk-out-g", label: "Gross tank volume", value: (r) => fmt(r.gross_volume_gal, 0) + " gal" },
    { key: "r", id: "ftnk-out-r", label: "Refill time", value: (r) => fmt(r.refill_hours, 1) + " hr" },
    { key: "z", id: "ftnk-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeFireTankSizing,
});

// ===================== spec-v1390: sprinkler obstruction clearance =====================
// dims: in { args: dimensionless } out: { required_separation_in: L, deficiency_in: L }
export function computeSprinklerObstruction({ obstruction_width_in = 0, horizontal_separation_in = 0, obstruction_depth_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(obstruction_width_in > 0)) return { error: "Obstruction width must be positive." };
  if (!(horizontal_separation_in >= 0)) return { error: "Horizontal separation cannot be negative." };
  if (!(obstruction_depth_in >= 0)) return { error: "Obstruction depth below the deflector cannot be negative." };
  // Three times the width, CAPPED at 24 in: past two feet of width the rule stops
  // growing and a different provision takes over.
  const three_times_in = 3 * obstruction_width_in;
  const required_separation_in = Math.min(three_times_in, 24);
  const capped = three_times_in > 24;
  const deficiency_in = Math.max(0, required_separation_in - horizontal_separation_in);
  const passes = horizontal_separation_in >= required_separation_in;
  // The second remedy is a vertical one: dropping the deflector to the obstruction's
  // bottom takes the obstruction out of the pattern instead of moving the head sideways.
  const deflector_rise_in = obstruction_depth_in;
  const remedy = passes
    ? (deficiency_in === 0 && horizontal_separation_in === required_separation_in
      ? "meets the requirement exactly, with nothing to spare"
      : "clears the requirement by " + fmt(horizontal_separation_in - required_separation_in, 1) + " in")
    : "deficient by " + fmt(deficiency_in, 1) + " in: move the sprinkler at least that far horizontally, drop the deflector the "
      + fmt(deflector_rise_in, 1) + " in to sit at or below the obstruction's bottom, or add a sprinkler below the obstruction -- which is a design and hydraulic change, not a field adjustment";
  if (![required_separation_in, deficiency_in].every(Number.isFinite)) return { error: "Obstruction-clearance math is not a finite value." };
  return {
    required_separation_in,
    three_times_in,
    capped,
    deficiency_in,
    passes,
    deflector_rise_in,
    remedy,
    note: "Whether a sprinkler sits far enough from an obstruction, by the three-times rule. A standard spray sprinkler throws its water outward and downward from the deflector, and anything hanging in that pattern casts a dry shadow behind it. The general rule for an obstruction against a wall or in the pattern is to keep the sprinkler horizontally away by at least three times the obstruction's width, capped at 24 inches -- past two feet of width the three-times rule stops growing and a different provision takes over, which is counterintuitive and is precisely why the cap exists. The rule is a screen with three outcomes and reporting all three is the point: either the sprinkler is far enough away, or it can be moved, or the deflector drops to sit at or below the obstruction's bottom so the obstruction is no longer in the pattern, or -- when none of those is possible, which is the common case with a wide duct or a continuous obstruction -- the answer is a sprinkler underneath, which is a design change and a hydraulic change rather than a field adjustment. A 12 in wide duct with the nearest sprinkler 24 in away needs min(36, 24) = 24 in and meets it exactly with nothing to spare; widen the duct to 18 in and the requirement stays at 24 in because of the cap, so the same sprinkler still passes; narrow the separation to 18 in and the head is deficient by 6 in and either moves or gains a sprinkler below it. Finding that out at rough-in is a great deal cheaper than finding it out at inspection. A screen, never a stamp; NFPA 13's obstruction provisions in full, the sprinkler manufacturer's listing, and the AHJ govern.",
  };
}

export const sprinklerObstructionExample = { inputs: { obstruction_width_in: 12, horizontal_separation_in: 24, obstruction_depth_in: 8 } };

FIRESPRINKLER_RENDERERS["sprinkler-obstruction"] = _simpleRenderer({
  citation: "Citation: NFPA 13's three-times rule for an obstruction in a standard spray sprinkler's pattern -- horizontal separation of at least three times the obstruction width, capped at 24 in -- cited by name and not reproduced, with the listed remedies (move the sprinkler, drop the deflector to at or below the obstruction's bottom, or add a sprinkler below). A screen, never a stamp; NFPA 13 in full, the sprinkler's listing, and the AHJ govern.",
  example: sprinklerObstructionExample.inputs,
  fields: [
    { key: "obstruction_width_in", label: "Obstruction width (in)", kind: "number" },
    { key: "horizontal_separation_in", label: "Sprinkler to near edge, horizontally (in)", kind: "number" },
    { key: "obstruction_depth_in", label: "Obstruction depth below the deflector (in)", kind: "number" },
  ],
  outputs: [
    { key: "r", id: "sprob-out-r", label: "Required separation", value: (r) => fmt(r.required_separation_in, 1) + " in" + (r.capped ? " (three times the width would be " + fmt(r.three_times_in, 1) + " in, capped at 24)" : "") },
    { key: "d", id: "sprob-out-d", label: "Deficiency", value: (r) => (r.deficiency_in > 0 ? fmt(r.deficiency_in, 1) + " in short" : "none") },
    { key: "e", id: "sprob-out-e", label: "Deflector drop that clears the obstruction instead", value: (r) => fmt(r.deflector_rise_in, 1) + " in, to sit at or below the obstruction's bottom" },
    { key: "v", id: "sprob-out-v", label: "Against the rule", value: (r) => (r.passes ? "PASSES: " : "FAILS: ") + r.remedy },
    { key: "n", id: "sprob-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSprinklerObstruction,
});

// ===================== spec-v1393: hydrant count and spacing =====================
// dims: in { args: dimensionless } out: { hydrants_by_flow: dimensionless, hydrants_by_frontage: dimensionless, actual_spacing_ft: L, max_distance_ft: L }
export function computeHydrantSpacingCount({ required_flow_gpm = 0, credited_flow_per_hydrant_gpm = 0, frontage_ft = 0, average_spacing_ft = 0, max_distance_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(required_flow_gpm > 0)) return { error: "Required fire flow must be positive." };
  if (!(credited_flow_per_hydrant_gpm > 0)) return { error: "Credited flow per hydrant must be positive." };
  if (!(frontage_ft > 0)) return { error: "Frontage length must be positive." };
  if (!(average_spacing_ft > 0)) return { error: "Average spacing requirement must be positive." };
  if (!(max_distance_ft > 0)) return { error: "Maximum distance to a hydrant must be positive." };
  // Two INDEPENDENT requirements: a site can have all the water it needs and still be
  // short a hydrant on geometry.
  const hydrants_by_flow = Math.ceil(required_flow_gpm / credited_flow_per_hydrant_gpm);
  const hydrants_by_frontage = Math.ceil(frontage_ft / average_spacing_ft) + 1;
  const governing_count = Math.max(hydrants_by_flow, hydrants_by_frontage);
  const actual_spacing_ft = governing_count > 1 ? frontage_ft / (governing_count - 1) : frontage_ft;
  const worst_distance_ft = actual_spacing_ft / 2;
  const passes = worst_distance_ft <= max_distance_ft;
  const governing = hydrants_by_frontage > hydrants_by_flow
    ? "the spacing rule (geometry)"
    : hydrants_by_flow > hydrants_by_frontage
      ? "the flow rule (water)"
      : "neither: both rules ask for the same count, with no margin on either";
  const verdict = passes
    ? "PASSES: no point on the frontage sits more than " + fmt(worst_distance_ft, 0) + " ft from a hydrant, inside the " + fmt(max_distance_ft, 0) + " ft limit"
    : "FAILS the maximum-distance limit by " + fmt(worst_distance_ft - max_distance_ft, 0) + " ft -- add a hydrant";
  if (![hydrants_by_flow, hydrants_by_frontage, actual_spacing_ft, worst_distance_ft].every(Number.isFinite)) return { error: "Hydrant-spacing math is not a finite value." };
  return {
    hydrants_by_flow,
    hydrants_by_frontage,
    governing_count,
    actual_spacing_ft,
    worst_distance_ft,
    passes,
    governing,
    verdict,
    note: "How many hydrants a site needs, from two independent requirements that both have to be satisfied. The FLOW requirement is that enough hydrants be reachable to deliver the required fire flow at once, at whatever each hydrant can actually be credited for -- which is set by the main rather than by the hydrant, and is the number a flow test produces. The SPACING requirement is geometric: no point along the frontage may sit farther than a specified distance from a hydrant, which caps how far apart they can be regardless of how much water each one makes. The code assigns both the average spacing and the maximum distance as a function of the required fire flow, in a table; those values are entered here rather than reproduced, and the geometry is the part a fire marshal actually checks against the site plan. A site requiring 3,000 gpm with hydrants credited at 1,000 gpm each needs 3 by flow, but 1,200 ft of frontage at a 400 ft average spacing needs ceil(1200/400) + 1 = 4, so the spacing rule governs -- a site can have all the water it needs and still be short a hydrant. Four hydrants across 1,200 ft sit 400 ft apart, which puts the worst point 200 ft from a hydrant, inside a 225 ft limit. Credit each hydrant at only 750 gpm, as a weaker main would, and the flow requirement rises to 4 as well, so the two tie with no margin on either -- the case where a fifth hydrant or a looped main is the real answer. A screen; the International Fire Code appendix tables, the flow test, and the fire marshal govern.",
  };
}

export const hydrantSpacingCountExample = { inputs: { required_flow_gpm: 3000, credited_flow_per_hydrant_gpm: 1000, frontage_ft: 1200, average_spacing_ft: 400, max_distance_ft: 225 } };

FIRESPRINKLER_RENDERERS["hydrant-spacing-count"] = _simpleRenderer({
  citation: "Citation: hydrant count from the two independent requirements -- enough hydrants to deliver the required fire flow at the credited flow per hydrant, and an average spacing with a maximum distance from any point on the frontage. The International Fire Code appendix assigns both spacing values as a function of required fire flow in a table; those values are entered rather than reproduced, and the section is cited by name. The flow test and the fire marshal govern.",
  example: hydrantSpacingCountExample.inputs,
  fields: [
    { key: "required_flow_gpm", label: "Required fire flow (gpm)", kind: "number" },
    { key: "credited_flow_per_hydrant_gpm", label: "Credited flow per hydrant (gpm)", kind: "number" },
    { key: "frontage_ft", label: "Frontage or road length served (ft)", kind: "number" },
    { key: "average_spacing_ft", label: "Required average spacing (ft)", kind: "number" },
    { key: "max_distance_ft", label: "Maximum distance from any point to a hydrant (ft)", kind: "number" },
  ],
  outputs: [
    { key: "f", id: "hysp-out-f", label: "Hydrants by the flow rule", value: (r) => String(r.hydrants_by_flow) },
    { key: "s", id: "hysp-out-s", label: "Hydrants by the spacing rule", value: (r) => String(r.hydrants_by_frontage) },
    { key: "c", id: "hysp-out-c", label: "Governing count", value: (r) => String(r.governing_count) + " hydrants -- " + r.governing + " governs" },
    { key: "a", id: "hysp-out-a", label: "Resulting spacing", value: (r) => fmt(r.actual_spacing_ft, 0) + " ft apart, worst point " + fmt(r.worst_distance_ft, 0) + " ft from a hydrant" },
    { key: "v", id: "hysp-out-v", label: "Against the distance limit", value: (r) => r.verdict },
    { key: "n", id: "hysp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHydrantSpacingCount,
});
