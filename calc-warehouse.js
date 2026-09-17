// Groups E and J: warehouse racking and material handling.
// spec-v1809..v1817 (scope-trade-expansion-3) cover the rack structure (beam
// load and deflection, upright unbraced length, base plate anchorage, flue
// space) and the operation around it (stacking aisle width, cube utilisation,
// dock leveler grade, dock door count, order pick labour standard).
//
// One module rather than two because the tiles reference each other across
// the split: aisle width sets the module pitch that cube utilisation counts,
// and flue space sets the beam length that beam capacity spans. The Group E
// tiles are the rack as a structure; the Group J tiles are the building and
// the operation it serves.

import {
  DEBOUNCE_MS, debounce, makeNumber,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// Young's modulus for structural steel, the value the rack industry's
// deflection tables are built on.
const E_STEEL_PSI = 29000000;
// The allowable stress design factor of safety on yield for bending.
const ASD_BENDING_FACTOR = 1.67;
const IN_PER_FT = 12;
const CU_IN_PER_CU_FT = 1728;

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

export const WAREHOUSE_RENDERERS = {};

// ============ spec-v1809: pallet rack beam load and deflection ============

// A rack beam pair carries the pallets on one level; each beam takes half of
// each pallet as a point load near a quarter point. Two equal loads at the
// quarter points give M = P L / 4 and a centre deflection of
// P a (3 L^2 - 4 a^2) / (24 E I) with a = L/4. Moment grows linearly with
// span and deflection with its cube, which is why the L/180 acceptance limit
// governs an ordinary beam that passes its stress check comfortably.

// dims: in { span_in: L, pallet_weight_lb: M L T^-2, pallets_per_level: dimensionless, moment_of_inertia_in4: L^4, section_modulus_in3: L^3, yield_strength_psi: M L^-1 T^-2, deflection_limit_ratio: dimensionless } out: { load_per_beam_lb: M L T^-2, moment_in_lb: M L^2 T^-2, bending_stress_psi: M L^-1 T^-2, allowable_stress_psi: M L^-1 T^-2, stress_ratio: dimensionless, deflection_in: L, deflection_limit_in: L, required_moment_of_inertia_in4: L^4 }
export function computePalletRackBeamCapacity({ span_in = 0, pallet_weight_lb = 0, pallets_per_level = 0, moment_of_inertia_in4 = 0, section_modulus_in3 = 0, yield_strength_psi = 0, deflection_limit_ratio = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(span_in > 0) || !(pallet_weight_lb > 0)) return { error: "Beam span and pallet weight must be positive." };
  if (!(moment_of_inertia_in4 > 0) || !(section_modulus_in3 > 0) || !(yield_strength_psi > 0)) {
    return { error: "Moment of inertia, section modulus, and yield strength must be positive." };
  }
  if (!(deflection_limit_ratio > 0)) return { error: "Deflection limit ratio must be positive (L/180 is entered as 180)." };
  // The two-point-load relations below are the two-pallet case exactly. A
  // level carrying a different pallet count is a different load pattern, not
  // a scaled one, so the tile declines it rather than returning a number that
  // looks right and is not.
  if (pallets_per_level !== 2) return { error: "This screen models the two-pallet level: enter 2 pallets per level." };
  const load_per_beam_lb = pallet_weight_lb / 2;
  const level_load_lb = pallet_weight_lb * pallets_per_level;
  const moment_in_lb = load_per_beam_lb * span_in / 4;
  const bending_stress_psi = moment_in_lb / section_modulus_in3;
  const allowable_stress_psi = yield_strength_psi / ASD_BENDING_FACTOR;
  const stress_ratio = bending_stress_psi / allowable_stress_psi;
  const a_in = span_in / 4;
  const deflection_in = load_per_beam_lb * a_in * (3 * span_in * span_in - 4 * a_in * a_in) / (24 * E_STEEL_PSI * moment_of_inertia_in4);
  const deflection_limit_in = span_in / deflection_limit_ratio;
  const deflection_ratio = deflection_in / deflection_limit_in;
  const required_moment_of_inertia_in4 = moment_of_inertia_in4 * deflection_ratio;
  return {
    load_per_beam_lb, level_load_lb, moment_in_lb,
    bending_stress_psi, allowable_stress_psi, stress_ratio,
    stress_pass: stress_ratio <= 1,
    stress_margin_pct: 100 * (1 - stress_ratio),
    deflection_in, deflection_limit_in, deflection_ratio,
    deflection_pass: deflection_ratio <= 1,
    deflection_margin_pct: 100 * (1 - deflection_ratio),
    governs: deflection_ratio >= stress_ratio ? "deflection" : "stress",
    required_moment_of_inertia_in4,
    added_moment_of_inertia_pct: 100 * (deflection_ratio - 1),
    note: "Deflection governs an ordinary rack beam because it grows as the CUBE of span while moment grows linearly, so a bay widened in the field has a capacity nobody recalculated and a load plaque that is now wrong. This does not evaluate the beam end connector, whose capacity comes from testing and which frequently limits the beam first. ANSI MH16.1, the applicable building code, the manufacturer's published capacity AT the installed span, and the rack design engineer govern.",
  };
}

const beamCapacityExample = { span_in: 108, pallet_weight_lb: 2500, pallets_per_level: 2, moment_of_inertia_in4: 2.5, section_modulus_in3: 1.111, yield_strength_psi: 55000, deflection_limit_ratio: 180 };
WAREHOUSE_RENDERERS["pallet-rack-beam-capacity"] = _simpleRenderer({
  citation: "Citation: two equal point loads at the quarter points, M = P L / 4 and d = P a (3 L^2 - 4 a^2) / (24 E I) with a = L/4, E = 29,000,000 psi, against the rack industry's L/180 deflection acceptance limit. ANSI MH16.1, the applicable building code, and the rack manufacturer's published capacity at the installed span govern.",
  example: beamCapacityExample,
  fields: [
    { key: "span_in", label: "Beam clear span (in)" },
    { key: "pallet_weight_lb", label: "Weight of one pallet (lb)" },
    { key: "pallets_per_level", label: "Pallets per bay level", attrs: { step: "1", min: "2", max: "2" } },
    { key: "moment_of_inertia_in4", label: "Beam moment of inertia (in^4)" },
    { key: "section_modulus_in3", label: "Beam section modulus (in^3)" },
    { key: "yield_strength_psi", label: "Steel yield strength (psi)" },
    { key: "deflection_limit_ratio", label: "Deflection limit denominator (180 = span over 180)", attrs: { step: "1", min: "1" } },
  ],
  outputs: [
    { key: "load_per_beam_lb", id: "prb-load", label: "Load on one beam per pallet", unit: "lb", value: (r) => fmt(r.load_per_beam_lb, 0) + " lb (level total " + fmt(r.level_load_lb, 0) + " lb)" },
    { key: "moment_in_lb", id: "prb-mom", label: "Maximum moment", unit: "in-lb", value: (r) => fmt(r.moment_in_lb, 0) + " in-lb" },
    { key: "bending_stress_psi", id: "prb-str", label: "Bending stress", unit: "psi", value: (r) => fmt(r.bending_stress_psi, 0) + " psi against " + fmt(r.allowable_stress_psi, 0) + " psi allowable" },
    { key: "stress_ratio", id: "prb-sr", label: "Stress ratio", value: (r) => fmt(r.stress_ratio, 2) + " -- " + (r.stress_pass ? "PASS, " + fmt(r.stress_margin_pct, 0) + "% to spare" : "FAIL, over by " + fmt(-r.stress_margin_pct, 0) + "%") },
    { key: "deflection_in", id: "prb-def", label: "Deflection", unit: "in", value: (r) => fmt(r.deflection_in, 4) + " in against a " + fmt(r.deflection_limit_in, 4) + " in limit" },
    { key: "deflection_ratio", id: "prb-dr", label: "Deflection ratio", value: (r) => fmt(r.deflection_ratio, 2) + " -- " + (r.deflection_pass ? "PASS, " + fmt(r.deflection_margin_pct, 0) + "% to spare" : "FAIL, over by " + fmt(-r.deflection_margin_pct, 0) + "%") },
    { key: "governs", id: "prb-gov", label: "Which check governs", value: (r) => r.governs.toUpperCase() + " governs this beam" },
    { key: "required_moment_of_inertia_in4", id: "prb-req", label: "Moment of inertia the limit needs", unit: "in^4", value: (r) => fmt(r.required_moment_of_inertia_in4, 2) + " in^4 (" + fmt(r.added_moment_of_inertia_pct, 0) + "% more; depth, not weight, buys stiffness)" },
    { key: "note", id: "prb-note", label: "Use", value: (r) => r.note },
  ],
  compute: computePalletRackBeamCapacity,
});

// ========= spec-v1810: rack upright capacity and unbraced length =========

// The beams are structure: each level ties the two columns of a frame together
// and shortens the length over which a column can buckle. P_cr = pi^2 E I /
// (K L)^2, so pulling a beam level to fit an oversized load doubles the
// unbraced length and quarters the buckling capacity with nothing visible
// changing and the load plaque still reading the old number.

// dims: in { beam_spacing_in: L, column_moment_of_inertia_in4: L^4, effective_length_factor: dimensionless, loaded_levels: dimensionless, load_per_level_lb: M L T^-2, rated_frame_capacity_lb: M L T^-2 } out: { load_per_column_lb: M L T^-2, load_per_frame_lb: M L T^-2, utilization_pct: dimensionless, euler_capacity_lb: M L T^-2, euler_capacity_level_removed_lb: M L T^-2 }
export function computeRackUprightCapacityDerate({ beam_spacing_in = 0, column_moment_of_inertia_in4 = 0, effective_length_factor = 0, loaded_levels = 0, load_per_level_lb = 0, rated_frame_capacity_lb = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(beam_spacing_in > 0) || !(column_moment_of_inertia_in4 > 0)) return { error: "Beam spacing and column moment of inertia must be positive." };
  if (!(effective_length_factor > 0)) return { error: "Effective length factor must be positive." };
  if (!(loaded_levels > 0) || !(load_per_level_lb > 0) || !(rated_frame_capacity_lb > 0)) {
    return { error: "Loaded levels, load per level, and the rated frame capacity must be positive." };
  }
  const load_per_frame_lb = loaded_levels * load_per_level_lb;
  const load_per_column_lb = load_per_frame_lb / 2;
  const utilization_pct = 100 * load_per_frame_lb / rated_frame_capacity_lb;
  const eulerAt = (length_in) => Math.PI * Math.PI * E_STEEL_PSI * column_moment_of_inertia_in4 / Math.pow(effective_length_factor * length_in, 2);
  const euler_capacity_lb = eulerAt(beam_spacing_in);
  const unbraced_level_removed_in = beam_spacing_in * 2;
  const euler_capacity_level_removed_lb = eulerAt(unbraced_level_removed_in);
  return {
    load_per_column_lb, load_per_frame_lb, utilization_pct,
    remaining_capacity_lb: rated_frame_capacity_lb - load_per_frame_lb,
    euler_capacity_lb, unbraced_level_removed_in, euler_capacity_level_removed_lb,
    removed_capacity_ratio: euler_capacity_level_removed_lb / euler_capacity_lb,
    removed_capacity_loss_pct: 100 * (1 - euler_capacity_level_removed_lb / euler_capacity_lb),
    note: "The Euler load overstates a perforated cold-formed rack column considerably, which fails by local and distortional buckling well below it; the figures are shown for the SQUARE-LAW trend on unbraced length, and ANSI MH16.1 requires TESTED capacities. A manufacturer's frame rating is stated AT a beam spacing and is not a property of the frame alone. Damage is NOT a derate: ANSI MH16.1 requires a dented, bowed, or torn column be unloaded and repaired or replaced, not downrated.",
  };
}

const uprightExample = { beam_spacing_in: 48, column_moment_of_inertia_in4: 0.6, effective_length_factor: 1, loaded_levels: 3, load_per_level_lb: 5000, rated_frame_capacity_lb: 24000 };
WAREHOUSE_RENDERERS["rack-upright-capacity-derate"] = _simpleRenderer({
  citation: "Citation: Euler column buckling P_cr = pi^2 E I / (K L)^2 with E = 29,000,000 psi, over the unbraced length set by the beam spacing. ANSI MH16.1 requires tested capacities for perforated cold-formed rack columns and requires damaged members be unloaded and repaired or replaced rather than derated; the manufacturer's rating at the installed beam spacing governs.",
  example: uprightExample,
  fields: [
    { key: "beam_spacing_in", label: "Beam spacing / unbraced length (in)" },
    { key: "column_moment_of_inertia_in4", label: "Column moment of inertia (in^4)" },
    { key: "effective_length_factor", label: "Effective length factor K" },
    { key: "loaded_levels", label: "Loaded beam levels", attrs: { step: "1", min: "1" } },
    { key: "load_per_level_lb", label: "Load per level (lb)" },
    { key: "rated_frame_capacity_lb", label: "Rated frame capacity at that spacing (lb)" },
  ],
  outputs: [
    { key: "load_per_column_lb", id: "ruc-col", label: "Load per column", unit: "lb", value: (r) => fmt(r.load_per_column_lb, 0) + " lb (frame " + fmt(r.load_per_frame_lb, 0) + " lb)" },
    { key: "utilization_pct", id: "ruc-util", label: "Against the rated capacity", value: (r) => fmt(r.utilization_pct, 0) + "% used, " + fmt(r.remaining_capacity_lb, 0) + " lb remaining" },
    { key: "euler_capacity_lb", id: "ruc-eul", label: "Euler load at the entered spacing", unit: "lb", value: (r) => fmt(r.euler_capacity_lb, 0) + " lb" },
    { key: "euler_capacity_level_removed_lb", id: "ruc-rem", label: "Euler load with one level removed", unit: "lb", value: (r) => fmt(r.euler_capacity_level_removed_lb, 0) + " lb at " + fmt(r.unbraced_level_removed_in, 0) + " in unbraced" },
    { key: "removed_capacity_ratio", id: "ruc-rat", label: "What removing a level costs", value: (r) => fmt(100 * r.removed_capacity_ratio, 0) + "% of the braced capacity remains -- a " + fmt(r.removed_capacity_loss_pct, 0) + "% loss" },
    { key: "note", id: "ruc-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeRackUprightCapacityDerate,
});

// ======== spec-v1811: rack base plate anchorage and overturning ========

// A frame is shallow and tall, so a lateral force high up is resisted by a very
// short lever arm at the base and the difference lands on the anchors as
// tension. The slab is usually the governing element and the least known one.

// dims: in { frame_weight_lb: M L T^-2, frame_depth_in: L, top_beam_height_ft: L, lateral_force_coefficient: dimensionless, effective_height_fraction: dimensionless, allowable_anchor_tension_lb: M L T^-2, base_plate_holes: dimensionless, improved_anchor_tension_lb: M L T^-2 } out: { lateral_force_lb: M L T^-2, overturning_moment_ftlb: M L^2 T^-2, resisting_moment_ftlb: M L^2 T^-2, net_uplift_lb: M L T^-2, anchors_required: dimensionless, anchors_required_improved: dimensionless }
export function computeRackBasePlateAnchorage({ frame_weight_lb = 0, frame_depth_in = 0, top_beam_height_ft = 0, lateral_force_coefficient = 0, effective_height_fraction = 0, allowable_anchor_tension_lb = 0, base_plate_holes = 0, improved_anchor_tension_lb = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(frame_weight_lb > 0) || !(frame_depth_in > 0) || !(top_beam_height_ft > 0)) {
    return { error: "Frame weight, frame depth, and top beam height must be positive." };
  }
  if (!(lateral_force_coefficient > 0)) return { error: "Lateral force coefficient must be positive." };
  if (!(effective_height_fraction > 0 && effective_height_fraction <= 1)) return { error: "The effective height fraction must be above 0 and at most 1 (two thirds of the frame height is the ordinary assumption)." };
  if (!(allowable_anchor_tension_lb > 0) || !(improved_anchor_tension_lb > 0)) return { error: "Allowable anchor tensions must be positive." };
  if (!(base_plate_holes >= 1)) return { error: "A base plate has at least one anchor hole." };
  const frame_depth_ft = frame_depth_in / IN_PER_FT;
  // The lever arm is tied to the frame's own height rather than entered
  // separately, so the two can never disagree.
  const effective_height_ft = top_beam_height_ft * effective_height_fraction;
  const lateral_force_lb = lateral_force_coefficient * frame_weight_lb;
  const overturning_moment_ftlb = lateral_force_lb * effective_height_ft;
  const resisting_moment_ftlb = frame_weight_lb * frame_depth_ft / 2;
  const net_moment_ftlb = overturning_moment_ftlb - resisting_moment_ftlb;
  const net_uplift_lb = Math.max(0, net_moment_ftlb / frame_depth_ft);
  const anchors_required = Math.ceil(net_uplift_lb / allowable_anchor_tension_lb);
  const anchors_required_improved = Math.ceil(net_uplift_lb / improved_anchor_tension_lb);
  return {
    frame_depth_ft, effective_height_ft, lateral_force_lb, overturning_moment_ftlb, resisting_moment_ftlb,
    resisting_share_pct: 100 * resisting_moment_ftlb / overturning_moment_ftlb,
    weight_alone_resists: net_moment_ftlb <= 0,
    net_uplift_lb, anchors_required,
    base_plate_sufficient: anchors_required <= base_plate_holes,
    anchors_short: Math.max(0, anchors_required - base_plate_holes),
    anchors_required_improved,
    improved_plate_sufficient: anchors_required_improved <= base_plate_holes,
    resisting_arm_ft: frame_depth_ft / 2,
    arm_ratio: effective_height_ft / (frame_depth_ft / 2),
    note: "The anchorage calculation is really a question about the floor. Anchor capacity tables assume a concrete strength, a slab thickness, and an edge distance, and a warehouse slab is routinely thinner, weaker, more cracked, and closer to a joint than the rack drawings assumed. When the count exceeds the plate's holes the remedies -- a larger plate, a thicker or reinforced slab, a shallower frame, or bracing to the building structure -- are engineering decisions, not field ones. ANSI MH16.1, the applicable building code and its seismic provisions, the anchor's evaluation report, and the rack design engineer govern.",
  };
}

const anchorageExample = { frame_weight_lb: 15000, frame_depth_in: 42, top_beam_height_ft: 20, lateral_force_coefficient: 0.2, effective_height_fraction: 0.666667, allowable_anchor_tension_lb: 1800, base_plate_holes: 2, improved_anchor_tension_lb: 2800 };
WAREHOUSE_RENDERERS["rack-base-plate-anchorage"] = _simpleRenderer({
  citation: "Citation: statics -- overturning moment = lateral force x its effective height, resisting moment = frame weight x half the frame depth, and net uplift = (overturning - resisting) / frame depth taken by the anchors on the uplift side. The lever arm is taken as a fraction of the frame height, two thirds being the ordinary assumption for a uniformly loaded frame. Anchor allowable tension comes from the manufacturer's evaluation report at the slab thickness, concrete strength, and edge distance actually present. ANSI MH16.1, the applicable building code, and the rack design engineer govern.",
  example: anchorageExample,
  fields: [
    { key: "frame_weight_lb", label: "Frame weight including product (lb)" },
    { key: "frame_depth_in", label: "Frame depth (in)" },
    { key: "top_beam_height_ft", label: "Top beam elevation (ft)" },
    { key: "lateral_force_coefficient", label: "Lateral force coefficient" },
    { key: "effective_height_fraction", label: "Effective height as a fraction of the frame", attrs: { step: "any", min: "0", max: "1" } },
    { key: "allowable_anchor_tension_lb", label: "Allowable tension per anchor (lb)" },
    { key: "base_plate_holes", label: "Anchor holes in the base plate", attrs: { step: "1", min: "1" } },
    { key: "improved_anchor_tension_lb", label: "Allowable tension in a better slab (lb)" },
  ],
  outputs: [
    { key: "lateral_force_lb", id: "rba-force", label: "Lateral force", unit: "lb", value: (r) => fmt(r.lateral_force_lb, 0) + " lb at " + fmt(r.arm_ratio, 1) + " to 1 against a " + fmt(r.resisting_arm_ft, 2) + " ft resisting arm" },
    { key: "overturning_moment_ftlb", id: "rba-over", label: "Overturning moment", unit: "ft-lb", value: (r) => fmt(r.overturning_moment_ftlb, 0) + " ft-lb" },
    { key: "resisting_moment_ftlb", id: "rba-res", label: "Resisting moment from weight", unit: "ft-lb", value: (r) => fmt(r.resisting_moment_ftlb, 0) + " ft-lb (" + fmt(r.resisting_share_pct, 0) + "% of the overturning)" },
    { key: "net_uplift_lb", id: "rba-up", label: "Net uplift per column", unit: "lb", value: (r) => (r.weight_alone_resists ? "None -- the frame's weight alone resists the overturning" : fmt(r.net_uplift_lb, 0) + " lb of anchor tension") },
    { key: "anchors_required", id: "rba-anc", label: "Anchors required", value: (r) => fmt(r.anchors_required, 0) + " against " + (r.base_plate_sufficient ? "the holes available -- the plate carries it" : "the holes available -- SHORT by " + fmt(r.anchors_short, 0)) },
    { key: "anchors_required_improved", id: "rba-imp", label: "Anchors in the better slab", value: (r) => fmt(r.anchors_required_improved, 0) + " -- " + (r.improved_plate_sufficient ? "the standard plate carries it" : "still short of the plate's holes") },
    { key: "note", id: "rba-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeRackBasePlateAnchorage,
});

// ============= spec-v1812: right-angle stacking aisle width =============

// The aisle repeats, so a foot saved on it is a foot saved on every module
// across the whole floor plate. The three truck types differ only in where the
// load sits relative to the turning centre, and that is the whole explanation.

// dims: in { load_length_in: L, operating_clearance_in: L, counterbalanced_turning_radius_in: L, counterbalanced_load_center_in: L, reach_turning_radius_in: L, reach_load_center_in: L, turret_clearance_in: L, rack_row_depth_in: L, building_width_ft: L } out: { counterbalanced_aisle_in: L, reach_aisle_in: L, turret_aisle_in: L, counterbalanced_modules: dimensionless, reach_modules: dimensionless, turret_modules: dimensionless }
export function computeStackingAisleWidth({ load_length_in = 0, operating_clearance_in = 0, counterbalanced_turning_radius_in = 0, counterbalanced_load_center_in = 0, reach_turning_radius_in = 0, reach_load_center_in = 0, turret_clearance_in = 0, rack_row_depth_in = 0, building_width_ft = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(load_length_in > 0) || !(operating_clearance_in > 0)) return { error: "Load length and operating clearance must be positive." };
  if (!(counterbalanced_turning_radius_in > 0) || !(reach_turning_radius_in > 0) || !(turret_clearance_in > 0)) {
    return { error: "Truck turning radii and the turret clearance must be positive." };
  }
  if (!(counterbalanced_load_center_in > 0) || !(reach_load_center_in > 0)) return { error: "Load face to turning centre distances must be positive." };
  if (!(rack_row_depth_in > 0) || !(building_width_ft > 0)) return { error: "Rack row depth and building width must be positive." };
  const counterbalanced_aisle_in = counterbalanced_turning_radius_in + load_length_in + counterbalanced_load_center_in + operating_clearance_in;
  const reach_aisle_in = reach_turning_radius_in + load_length_in + reach_load_center_in + operating_clearance_in;
  const turret_aisle_in = load_length_in + turret_clearance_in;
  const building_width_in = building_width_ft * IN_PER_FT;
  const moduleOf = (aisle_in) => 2 * rack_row_depth_in + aisle_in;
  const counterbalanced_module_in = moduleOf(counterbalanced_aisle_in);
  const reach_module_in = moduleOf(reach_aisle_in);
  const turret_module_in = moduleOf(turret_aisle_in);
  const counterbalanced_modules = Math.floor(building_width_in / counterbalanced_module_in);
  const reach_modules = Math.floor(building_width_in / reach_module_in);
  const turret_modules = Math.floor(building_width_in / turret_module_in);
  const turret_gain = turret_modules - counterbalanced_modules;
  const reach_gain = reach_modules - counterbalanced_modules;
  return {
    counterbalanced_aisle_in, counterbalanced_aisle_ft: counterbalanced_aisle_in / IN_PER_FT,
    reach_aisle_in, reach_aisle_ft: reach_aisle_in / IN_PER_FT,
    turret_aisle_in, turret_aisle_ft: turret_aisle_in / IN_PER_FT,
    counterbalanced_module_in, reach_module_in, turret_module_in,
    counterbalanced_modules, reach_modules, turret_modules,
    counterbalanced_rack_rows: counterbalanced_modules * 2,
    reach_rack_rows: reach_modules * 2,
    turret_rack_rows: turret_modules * 2,
    turret_additional_rows: turret_gain * 2,
    reach_additional_rows: reach_gain * 2,
    // Two different quantities that are easy to conflate. The reach truck's
    // own gain over the counterbalanced layout is 13% in the worked case; the
    // share of the turret truck's gain that it captures is 20%.
    turret_gain_pct: 100 * turret_gain / counterbalanced_modules,
    reach_gain_pct: 100 * reach_gain / counterbalanced_modules,
    reach_share_of_turret_gain_pct: turret_gain > 0 ? 100 * reach_gain / turret_gain : 0,
    note: "A narrow aisle is bought with constraints that compound: wire or rail guidance, a superflat floor tolerance an ordinary slab will not meet, tighter rack alignment, slower aisle entry and exit, and one truck per aisle -- so the aisle count caps how many trucks can work at once. A layout that maximises storage can be short of throughput, and the order profile decides which matters. Truck manufacturer right-angle stack data at the actual load and mast, the fire code's aisle requirements, and the equipment supplier govern.",
  };
}

const aisleExample = { load_length_in: 48, operating_clearance_in: 6, counterbalanced_turning_radius_in: 78, counterbalanced_load_center_in: 14, reach_turning_radius_in: 55, reach_load_center_in: 8, turret_clearance_in: 12, rack_row_depth_in: 42, building_width_ft: 300 };
WAREHOUSE_RENDERERS["stacking-aisle-width"] = _simpleRenderer({
  citation: "Citation: right-angle stacking aisle = outside turning radius + load length along the forks + load face to turning centre + operating clearance, with the turret / very-narrow-aisle case reduced to load length + clearance because the head rotates rather than the truck. Truck manufacturer right-angle stack data at the actual load and mast, and the fire code's aisle requirements, govern.",
  example: aisleExample,
  fields: [
    { key: "load_length_in", label: "Load length along the forks (in)" },
    { key: "operating_clearance_in", label: "Operating clearance (in)" },
    { key: "counterbalanced_turning_radius_in", label: "Counterbalanced outside turning radius (in)" },
    { key: "counterbalanced_load_center_in", label: "Counterbalanced load face to centre (in)" },
    { key: "reach_turning_radius_in", label: "Reach truck outside turning radius (in)" },
    { key: "reach_load_center_in", label: "Reach truck load face to centre (in)" },
    { key: "turret_clearance_in", label: "Turret / VNA clearance past the load (in)" },
    { key: "rack_row_depth_in", label: "Rack row depth (in)" },
    { key: "building_width_ft", label: "Building width available (ft)" },
  ],
  outputs: [
    { key: "counterbalanced_aisle_in", id: "saw-cb", label: "Counterbalanced aisle", unit: "in", value: (r) => fmt(r.counterbalanced_aisle_in, 0) + " in (" + fmt(r.counterbalanced_aisle_ft, 1) + " ft)" },
    { key: "reach_aisle_in", id: "saw-rt", label: "Reach truck aisle", unit: "in", value: (r) => fmt(r.reach_aisle_in, 0) + " in (" + fmt(r.reach_aisle_ft, 1) + " ft)" },
    { key: "turret_aisle_in", id: "saw-vna", label: "Turret / VNA aisle", unit: "in", value: (r) => fmt(r.turret_aisle_in, 0) + " in (" + fmt(r.turret_aisle_ft, 1) + " ft)" },
    { key: "counterbalanced_modules", id: "saw-mod", label: "Modules across the building", value: (r) => fmt(r.counterbalanced_modules, 0) + " counterbalanced, " + fmt(r.reach_modules, 0) + " reach, " + fmt(r.turret_modules, 0) + " turret" },
    { key: "turret_additional_rows", id: "saw-rows", label: "Rack rows the turret adds", value: (r) => fmt(r.turret_additional_rows, 0) + " more rows, " + fmt(r.turret_gain_pct, 0) + "% more than counterbalanced" },
    { key: "reach_gain_pct", id: "saw-reach", label: "What the reach truck buys", value: (r) => fmt(r.reach_gain_pct, 0) + "% more modules than counterbalanced -- " + fmt(r.reach_share_of_turret_gain_pct, 0) + "% of the turret's gain, at a fraction of its constraint" },
    { key: "note", id: "saw-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeStackingAisleWidth,
});

// ========= spec-v1813: storage position count and cube utilisation =========

// The metric that exposes how much of a warehouse is circulation rather than
// storage. The aisle occupies more floor than the two rack rows it serves, so
// before a single pallet is counted more than half the floor is committed to
// getting to it.

// dims: in { building_width_ft: L, building_depth_ft: L, clear_height_ft: L, module_pitch_in: L, rack_row_depth_in: L, rack_run_length_ft: L, bays_per_row: dimensionless, levels_per_bay: dimensionless, pallets_per_bay_level: dimensionless, pallet_width_in: L, pallet_depth_in: L, pallet_loaded_height_in: L, beam_pitch_in: L } out: { building_cube_ft3: L^3, pallet_positions: dimensionless, occupied_cube_ft3: L^3, cube_utilization_pct: dimensionless, aisle_floor_ft2: L^2, rack_floor_ft2: L^2 }
export function computeWarehouseCubeUtilization({ building_width_ft = 0, building_depth_ft = 0, clear_height_ft = 0, module_pitch_in = 0, rack_row_depth_in = 0, rack_run_length_ft = 0, bays_per_row = 0, levels_per_bay = 0, pallets_per_bay_level = 0, pallet_width_in = 0, pallet_depth_in = 0, pallet_loaded_height_in = 0, beam_pitch_in = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(building_width_ft > 0) || !(building_depth_ft > 0) || !(clear_height_ft > 0)) return { error: "Building width, depth, and clear height must be positive." };
  if (!(module_pitch_in > 0) || !(rack_row_depth_in > 0) || !(rack_run_length_ft > 0)) return { error: "Module pitch, rack row depth, and rack run length must be positive." };
  if (!(module_pitch_in > 2 * rack_row_depth_in)) return { error: "The module pitch must exceed two rack rows; the remainder is the aisle." };
  if (!(bays_per_row > 0) || !(levels_per_bay > 0) || !(pallets_per_bay_level > 0)) return { error: "Bays, levels, and pallets per bay level must be positive." };
  if (!(pallet_width_in > 0) || !(pallet_depth_in > 0) || !(pallet_loaded_height_in > 0)) return { error: "Pallet width, depth, and loaded height must be positive." };
  if (!(beam_pitch_in > 0)) return { error: "Beam pitch must be positive." };
  if (rack_run_length_ft > building_depth_ft) return { error: "The rack run cannot be longer than the building is deep." };
  const building_floor_ft2 = building_width_ft * building_depth_ft;
  const building_cube_ft3 = building_floor_ft2 * clear_height_ft;
  const aisle_width_in = module_pitch_in - 2 * rack_row_depth_in;
  const modules = Math.floor(building_width_ft * IN_PER_FT / module_pitch_in);
  const rack_rows = modules * 2;
  const aisle_floor_ft2 = modules * (aisle_width_in / IN_PER_FT) * rack_run_length_ft;
  const rack_floor_ft2 = rack_rows * (rack_row_depth_in / IN_PER_FT) * rack_run_length_ft;
  const pallet_positions = rack_rows * bays_per_row * levels_per_bay * pallets_per_bay_level;
  const pallet_cube_ft3 = pallet_width_in * pallet_depth_in * pallet_loaded_height_in / CU_IN_PER_CU_FT;
  const occupied_cube_ft3 = pallet_positions * pallet_cube_ft3;
  const level_clearance_in = beam_pitch_in - pallet_loaded_height_in;
  return {
    building_floor_ft2, building_cube_ft3, aisle_width_in,
    aisle_width_ft: aisle_width_in / IN_PER_FT,
    modules, rack_rows, aisle_floor_ft2, rack_floor_ft2,
    aisle_floor_share_pct: 100 * aisle_floor_ft2 / building_floor_ft2,
    rack_floor_share_pct: 100 * rack_floor_ft2 / building_floor_ft2,
    other_floor_share_pct: 100 * (building_floor_ft2 - aisle_floor_ft2 - rack_floor_ft2) / building_floor_ft2,
    pallet_positions, pallet_cube_ft3, occupied_cube_ft3,
    cube_utilization_pct: 100 * occupied_cube_ft3 / building_cube_ft3,
    positions_per_ft2: pallet_positions / building_floor_ft2,
    level_clearance_in,
    level_clearance_share_pct: 100 * level_clearance_in / beam_pitch_in,
    note: "Fifteen to thirty per cent is the ordinary range and it is a normal figure, not a failing one -- worth knowing before anyone proposes a target, because a warehouse optimised purely for cube is slow. Aisle floor is the largest single consumer, then the gap between a load's top and the next beam, then the space above the top load, then honeycombing: a lane assigned to one item is full only when that item is at full stock, and dedicated slotting is fast and honeycombs while random slotting fills the cube and costs travel. The racking sets the ceiling; the slotting policy decides how close a running warehouse gets to it.",
  };
}

const cubeExample = { building_width_ft: 300, building_depth_ft: 400, clear_height_ft: 32, module_pitch_in: 201, rack_row_depth_in: 42, rack_run_length_ft: 360, bays_per_row: 40, levels_per_bay: 6, pallets_per_bay_level: 2, pallet_width_in: 48, pallet_depth_in: 40, pallet_loaded_height_in: 50, beam_pitch_in: 58 };
WAREHOUSE_RENDERERS["warehouse-cube-utilization"] = _simpleRenderer({
  citation: "Citation: geometry -- building cube = footprint x clear height; positions = rack rows x bays x levels x pallets per bay level; cube utilisation = positions x pallet cube / building cube. The module of two rack rows plus one aisle is the repeating unit whose pitch divides into the building width. Layout drawings, the fire code's aisle and storage requirements, and the facility's slotting policy govern.",
  example: cubeExample,
  fields: [
    { key: "building_width_ft", label: "Building width (ft)" },
    { key: "building_depth_ft", label: "Building depth (ft)" },
    { key: "clear_height_ft", label: "Clear height (ft)" },
    { key: "module_pitch_in", label: "Module pitch, two rows plus aisle (in)" },
    { key: "rack_row_depth_in", label: "Rack row depth (in)" },
    { key: "rack_run_length_ft", label: "Rack run length (ft)" },
    { key: "bays_per_row", label: "Bays per row", attrs: { step: "1", min: "1" } },
    { key: "levels_per_bay", label: "Levels per bay", attrs: { step: "1", min: "1" } },
    { key: "pallets_per_bay_level", label: "Pallets per bay level", attrs: { step: "1", min: "1" } },
    { key: "pallet_width_in", label: "Pallet width (in)" },
    { key: "pallet_depth_in", label: "Pallet depth (in)" },
    { key: "pallet_loaded_height_in", label: "Loaded pallet height (in)" },
    { key: "beam_pitch_in", label: "Vertical beam pitch (in)" },
  ],
  outputs: [
    { key: "building_cube_ft3", id: "wcu-cube", label: "Building cube", unit: "cu ft", value: (r) => fmt(r.building_cube_ft3, 0) + " cu ft over " + fmt(r.building_floor_ft2, 0) + " sq ft" },
    { key: "modules", id: "wcu-mod", label: "Modules and rack rows", value: (r) => fmt(r.modules, 0) + " modules, " + fmt(r.rack_rows, 0) + " rack rows, " + fmt(r.aisle_width_ft, 2) + " ft aisles" },
    { key: "aisle_floor_ft2", id: "wcu-floor", label: "Where the floor goes", value: (r) => fmt(r.aisle_floor_share_pct, 0) + "% aisle, " + fmt(r.rack_floor_share_pct, 0) + "% rack, " + fmt(r.other_floor_share_pct, 0) + "% everything else" },
    { key: "pallet_positions", id: "wcu-pos", label: "Pallet positions", value: (r) => fmt(r.pallet_positions, 0) + " positions at " + fmt(r.pallet_cube_ft3, 2) + " cu ft each" },
    { key: "cube_utilization_pct", id: "wcu-util", label: "Cube utilisation", value: (r) => fmt(r.cube_utilization_pct, 1) + "% -- " + fmt(r.occupied_cube_ft3, 0) + " cu ft of product" },
    { key: "positions_per_ft2", id: "wcu-dens", label: "Floor density", value: (r) => fmt(r.positions_per_ft2, 3) + " positions per sq ft" },
    { key: "level_clearance_in", id: "wcu-clear", label: "Clearance above each load", unit: "in", value: (r) => fmt(r.level_clearance_in, 1) + " in, " + fmt(r.level_clearance_share_pct, 0) + "% of the vertical pitch" },
    { key: "note", id: "wcu-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeWarehouseCubeUtilization,
});

// ========= spec-v1814: dock leveler ramp slope and bed range =========

// The dock height is a single number and the fleet is not. Service range says
// whether the leveler can REACH a bed height; grade says whether equipment can
// work across it once it does. Those are different questions.

// dims: in { dock_height_in: L, low_bed_height_in: L, high_bed_height_in: L, leveler_length_ft: L, service_range_in: L, grade_guideline_pct: dimensionless, longer_leveler_length_ft: L, outlier_bed_height_in: L } out: { low_differential_in: L, high_differential_in: L, low_grade_pct: dimensionless, high_grade_pct: dimensionless, longer_leveler_grade_pct: dimensionless, outlier_grade_pct: dimensionless }
export function computeDockLevelerSlope({ dock_height_in = 0, low_bed_height_in = 0, high_bed_height_in = 0, leveler_length_ft = 0, service_range_in = 0, grade_guideline_pct = 0, longer_leveler_length_ft = 0, outlier_bed_height_in = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(dock_height_in > 0) || !(low_bed_height_in > 0) || !(high_bed_height_in > 0) || !(outlier_bed_height_in > 0)) {
    return { error: "Dock height and every trailer bed height must be positive." };
  }
  if (!(high_bed_height_in >= low_bed_height_in)) return { error: "The high bed height cannot be below the low bed height." };
  if (!(leveler_length_ft > 0) || !(longer_leveler_length_ft > 0)) return { error: "Leveler lengths must be positive." };
  if (!(service_range_in > 0) || !(grade_guideline_pct > 0)) return { error: "Service range and grade guideline must be positive." };
  const leveler_length_in = leveler_length_ft * IN_PER_FT;
  const longer_leveler_length_in = longer_leveler_length_ft * IN_PER_FT;
  // Differential is signed: positive when the trailer sits BELOW the dock and
  // the ramp runs downhill into it. Grade is the magnitude over the length.
  const low_differential_in = dock_height_in - low_bed_height_in;
  const high_differential_in = dock_height_in - high_bed_height_in;
  const outlier_differential_in = dock_height_in - outlier_bed_height_in;
  const gradeOf = (diff_in, length_in) => 100 * Math.abs(diff_in) / length_in;
  const low_grade_pct = gradeOf(low_differential_in, leveler_length_in);
  const high_grade_pct = gradeOf(high_differential_in, leveler_length_in);
  const outlier_grade_pct = gradeOf(outlier_differential_in, leveler_length_in);
  const longer_leveler_grade_pct = gradeOf(low_differential_in, longer_leveler_length_in);
  const outlier_longer_grade_pct = gradeOf(outlier_differential_in, longer_leveler_length_in);
  return {
    low_differential_in, high_differential_in, outlier_differential_in,
    low_within_service_range: Math.abs(low_differential_in) <= service_range_in,
    high_within_service_range: Math.abs(high_differential_in) <= service_range_in,
    outlier_within_service_range: Math.abs(outlier_differential_in) <= service_range_in,
    low_grade_pct, high_grade_pct, outlier_grade_pct,
    low_grade_pass: low_grade_pct <= grade_guideline_pct,
    high_grade_pass: high_grade_pct <= grade_guideline_pct,
    outlier_grade_pass: outlier_grade_pct <= grade_guideline_pct,
    governing_grade_pct: Math.max(low_grade_pct, high_grade_pct, outlier_grade_pct),
    longer_leveler_grade_pct, outlier_longer_grade_pct,
    longer_leveler_grade_pass: longer_leveler_grade_pct <= grade_guideline_pct,
    outlier_longer_grade_pass: outlier_longer_grade_pct <= grade_guideline_pct,
    note: "Length is the whole remedy: a longer leveler is the only intervention that reduces grade without moving the dock, and the dock elevation is the one dimension that cannot be changed afterwards -- which is why bed heights are surveyed across the ACTUAL fleet before a dock is poured. One trailer type at the edge of the fleet sets the requirement for the whole dock. The differential also moves while the work happens: a trailer settles on its suspension as it loads and rises as it empties, and it can creep away from the dock under the push of a lift truck, which is what restraints and chocks are for and is a life-safety matter rather than a grade one. The leveler manufacturer's rated service range and the employer's powered-industrial-truck program govern.",
  };
}

const levelerExample = { dock_height_in: 48, low_bed_height_in: 40, high_bed_height_in: 56, leveler_length_ft: 6, service_range_in: 12, grade_guideline_pct: 10, longer_leveler_length_ft: 10, outlier_bed_height_in: 36 };
WAREHOUSE_RENDERERS["dock-leveler-slope"] = _simpleRenderer({
  citation: "Citation: geometry -- differential = dock height minus trailer bed height, and ramp grade = differential / leveler length. A leveler is rated to work a stated distance above and below the dock, commonly about 12 in each way; roughly 10% is a common practical maximum for powered equipment and 7% or less is preferred, with manual pallet trucks struggling well before a forklift does. The leveler manufacturer's rated service range and the employer's powered-industrial-truck program govern.",
  example: levelerExample,
  fields: [
    { key: "dock_height_in", label: "Dock height (in)" },
    { key: "low_bed_height_in", label: "Lowest trailer bed height (in)" },
    { key: "high_bed_height_in", label: "Highest trailer bed height (in)" },
    { key: "leveler_length_ft", label: "Leveler length (ft)" },
    { key: "service_range_in", label: "Rated service range above and below (in)" },
    { key: "grade_guideline_pct", label: "Practical grade guideline (%)" },
    { key: "longer_leveler_length_ft", label: "Longer leveler considered (ft)" },
    { key: "outlier_bed_height_in", label: "Outlier trailer bed height (in)" },
  ],
  outputs: [
    { key: "low_differential_in", id: "dls-low", label: "Lowest trailer", value: (r) => fmt(Math.abs(r.low_differential_in), 1) + " in " + (r.low_differential_in >= 0 ? "below" : "above") + " the dock -- " + (r.low_within_service_range ? "within" : "OUTSIDE") + " service range" },
    { key: "high_differential_in", id: "dls-high", label: "Highest trailer", value: (r) => fmt(Math.abs(r.high_differential_in), 1) + " in " + (r.high_differential_in >= 0 ? "below" : "above") + " the dock -- " + (r.high_within_service_range ? "within" : "OUTSIDE") + " service range" },
    { key: "low_grade_pct", id: "dls-g1", label: "Grade at the low trailer", value: (r) => fmt(r.low_grade_pct, 1) + "% -- " + (r.low_grade_pass ? "within the guideline" : "OVER the guideline") },
    { key: "high_grade_pct", id: "dls-g2", label: "Grade at the high trailer", value: (r) => fmt(r.high_grade_pct, 1) + "% -- " + (r.high_grade_pass ? "within the guideline" : "OVER the guideline") },
    { key: "outlier_grade_pct", id: "dls-out", label: "Outlier trailer", value: (r) => fmt(Math.abs(r.outlier_differential_in), 1) + " in differential, " + fmt(r.outlier_grade_pct, 1) + "% -- " + (r.outlier_within_service_range ? "within" : "OUTSIDE") + " service range, " + (r.outlier_grade_pass ? "within" : "OVER") + " the grade guideline" },
    { key: "longer_leveler_grade_pct", id: "dls-long", label: "On the longer leveler", value: (r) => fmt(r.longer_leveler_grade_pct, 1) + "% at the low trailer, " + fmt(r.outlier_longer_grade_pct, 1) + "% at the outlier" },
    { key: "governing_grade_pct", id: "dls-gov", label: "Governing grade", value: (r) => fmt(r.governing_grade_pct, 1) + "% -- the steepest the fleet presents on the entered leveler" },
    { key: "note", id: "dls-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeDockLevelerSlope,
});

// ========== spec-v1815: rack flue space and in-rack sprinkler trigger ==========

// Flues are fire protection hardware that happens to look like empty space.
// A bay is not sized by adding pallet widths; it is sized by adding pallet
// widths AND the flues between them, so the flue sets the beam, not the pallet.

// dims: in { pallet_width_in: L, pallet_depth_in: L, pallets_per_bay: dimensionless, transverse_gaps: dimensionless, nominal_flue_in: L, beam_length_in: L, frame_depth_in: L, back_to_back_spacing_in: L, deeper_load_depth_in: L } out: { transverse_gap_each_in: L, required_beam_length_in: L, pallet_overhang_in: L, longitudinal_flue_in: L, deeper_load_longitudinal_flue_in: L }
export function computeRackFlueSpace({ pallet_width_in = 0, pallet_depth_in = 0, pallets_per_bay = 0, transverse_gaps = 0, nominal_flue_in = 0, beam_length_in = 0, frame_depth_in = 0, back_to_back_spacing_in = 0, deeper_load_depth_in = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(pallet_width_in > 0) || !(pallet_depth_in > 0) || !(deeper_load_depth_in > 0)) return { error: "Pallet width, depth, and the deeper load depth must be positive." };
  if (!(pallets_per_bay > 0) || !(transverse_gaps > 0)) return { error: "Pallets per bay and the transverse gap count must be positive." };
  if (!(nominal_flue_in > 0) || !(beam_length_in > 0)) return { error: "Nominal flue width and beam length must be positive." };
  if (!(frame_depth_in > 0) || !(back_to_back_spacing_in > 0)) return { error: "Frame depth and back-to-back row spacing must be positive." };
  const pallet_run_in = pallets_per_bay * pallet_width_in;
  const transverse_gap_total_in = beam_length_in - pallet_run_in;
  const transverse_gap_each_in = transverse_gap_total_in / transverse_gaps;
  const required_beam_length_in = pallet_run_in + transverse_gaps * nominal_flue_in;
  const overhangOf = (depth_in) => (depth_in - frame_depth_in) / 2;
  const pallet_overhang_in = overhangOf(pallet_depth_in);
  const deeper_load_overhang_in = overhangOf(deeper_load_depth_in);
  const longitudinal_flue_in = back_to_back_spacing_in - 2 * pallet_overhang_in;
  const deeper_load_longitudinal_flue_in = back_to_back_spacing_in - 2 * deeper_load_overhang_in;
  return {
    pallet_run_in, transverse_gaps, transverse_gap_total_in, transverse_gap_each_in,
    transverse_flue_pass: transverse_gap_each_in >= nominal_flue_in,
    transverse_flue_share_pct: 100 * transverse_gap_each_in / nominal_flue_in,
    required_beam_length_in,
    beam_shortfall_in: required_beam_length_in - beam_length_in,
    flue_run_in: transverse_gaps * nominal_flue_in,
    pallet_overhang_in, longitudinal_flue_in,
    longitudinal_flue_pass: longitudinal_flue_in >= nominal_flue_in,
    longitudinal_flue_share_pct: 100 * longitudinal_flue_in / nominal_flue_in,
    deeper_load_overhang_in, deeper_load_longitudinal_flue_in,
    deeper_load_flue_pass: deeper_load_longitudinal_flue_in >= nominal_flue_in,
    deeper_load_flue_share_pct: 100 * deeper_load_longitudinal_flue_in / nominal_flue_in,
    note: "A bay laid out to fit the pallets exactly produces gaps too small to be flues, and the remedy found at inspection is fewer pallets per bay -- a permanent capacity loss. The longitudinal flue is closed by overhang rather than by layout, so a change to a deeper pallet closes a flue that was compliant on the day of installation, by a purchasing decision nobody connected to fire protection. Solid decking blocks the flue entirely and changes the protection requirement; open wire or bar decking does not. When ceiling protection cannot be shown adequate for the commodity, storage height, and arrangement, in-rack sprinklers are required. NFPA 13 as adopted, the commodity classification, and the fire protection engineer and authority having jurisdiction govern.",
  };
}

const flueExample = { pallet_width_in: 48, pallet_depth_in: 48, pallets_per_bay: 2, transverse_gaps: 3, nominal_flue_in: 6, beam_length_in: 108, frame_depth_in: 42, back_to_back_spacing_in: 12, deeper_load_depth_in: 52 };
WAREHOUSE_RENDERERS["rack-flue-space"] = _simpleRenderer({
  citation: "Citation: geometry against the nominal 6 in transverse and longitudinal flue for rack storage -- required beam length = pallets x pallet width + gaps x nominal flue, and longitudinal flue = back-to-back spacing minus the overhang at each face. NFPA 13 as adopted, the commodity classification, the storage arrangement, and the fire protection engineer and authority having jurisdiction govern whether ceiling protection suffices or in-rack sprinklers are required.",
  example: flueExample,
  fields: [
    { key: "pallet_width_in", label: "Pallet width across the bay (in)" },
    { key: "pallet_depth_in", label: "Load depth into the rack (in)" },
    { key: "pallets_per_bay", label: "Pallets per bay", attrs: { step: "1", min: "1" } },
    { key: "transverse_gaps", label: "Transverse gaps in the bay", attrs: { step: "1", min: "1" } },
    { key: "nominal_flue_in", label: "Nominal flue width (in)" },
    { key: "beam_length_in", label: "Beam length as built (in)" },
    { key: "frame_depth_in", label: "Rack frame depth (in)" },
    { key: "back_to_back_spacing_in", label: "Back-to-back frame spacing (in)" },
    { key: "deeper_load_depth_in", label: "Deeper load being considered (in)" },
  ],
  outputs: [
    { key: "transverse_gap_each_in", id: "rfs-tg", label: "Transverse gap each bay provides", unit: "in", value: (r) => fmt(r.transverse_gap_each_in, 1) + " in across " + fmt(r.transverse_gaps, 0) + " gaps -- " + (r.transverse_flue_pass ? "meets nominal" : fmt(r.transverse_flue_share_pct, 0) + "% of nominal") },
    { key: "required_beam_length_in", id: "rfs-beam", label: "Beam length the flue requires", unit: "in", value: (r) => fmt(r.required_beam_length_in, 0) + " in, " + fmt(Math.abs(r.beam_shortfall_in), 0) + " in " + (r.beam_shortfall_in > 0 ? "longer than built" : "within what is built") },
    { key: "flue_run_in", id: "rfs-run", label: "Beam length that is flue", unit: "in", value: (r) => fmt(r.flue_run_in, 0) + " in of every bay holds nothing at all -- which is what a flue is" },
    { key: "pallet_overhang_in", id: "rfs-over", label: "Overhang at each face", unit: "in", value: (r) => fmt(r.pallet_overhang_in, 1) + " in" },
    { key: "longitudinal_flue_in", id: "rfs-long", label: "Longitudinal flue", unit: "in", value: (r) => fmt(r.longitudinal_flue_in, 1) + " in -- " + (r.longitudinal_flue_pass ? "meets nominal" : fmt(r.longitudinal_flue_share_pct, 0) + "% of nominal") },
    { key: "deeper_load_longitudinal_flue_in", id: "rfs-deep", label: "With the deeper load", unit: "in", value: (r) => fmt(r.deeper_load_longitudinal_flue_in, 1) + " in at " + fmt(r.deeper_load_overhang_in, 1) + " in overhang -- " + (r.deeper_load_flue_pass ? "still meets nominal" : fmt(r.deeper_load_flue_share_pct, 0) + "% of nominal") },
    { key: "note", id: "rfs-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeRackFlueSpace,
});

// ====== spec-v1816: dock door count from arrivals and turn time ======

// A dock is a queueing system and the daily average is the least useful
// statistic it has. The peak is what the doors have to serve, and turn time is
// the whole time a trailer occupies the door, not the handling alone.

// dims: in { trucks_per_day: dimensionless, operating_hours: T, turn_time_min: T, utilization_pct: dimensionless, peak_arrival_share_pct: dimensionless, peak_window_hours: T, improved_turn_time_min: T } out: { door_hours: T, doors_at_full_utilization: dimensionless, doors_required: dimensionless, peak_door_hours: T, peak_doors_required: dimensionless, improved_peak_doors_required: dimensionless }
export function computeDockDoorCountThroughput({ trucks_per_day = 0, operating_hours = 0, turn_time_min = 0, utilization_pct = 0, peak_arrival_share_pct = 0, peak_window_hours = 0, improved_turn_time_min = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(trucks_per_day > 0) || !(operating_hours > 0)) return { error: "Trucks per day and the operating window must be positive." };
  if (!(turn_time_min > 0) || !(improved_turn_time_min > 0)) return { error: "Turn times must be positive." };
  if (!(utilization_pct > 0 && utilization_pct <= 100)) return { error: "Practical utilisation must be above 0 and at most 100%." };
  if (!(peak_arrival_share_pct > 0 && peak_arrival_share_pct <= 100)) return { error: "The peak arrival share must be above 0 and at most 100%." };
  if (!(peak_window_hours > 0)) return { error: "The peak window must be positive." };
  if (peak_window_hours > operating_hours) return { error: "The peak window cannot be longer than the operating window." };
  const utilization = utilization_pct / 100;
  const door_hours = trucks_per_day * turn_time_min / 60;
  const doors_at_full_utilization = door_hours / operating_hours;
  const doors_required = Math.ceil(doors_at_full_utilization / utilization);
  const peak_trucks = trucks_per_day * peak_arrival_share_pct / 100;
  const peak_door_hours = peak_trucks * turn_time_min / 60;
  const peak_doors_at_full_utilization = peak_door_hours / peak_window_hours;
  const peak_doors_required = Math.ceil(peak_doors_at_full_utilization / utilization);
  const improved_peak_door_hours = peak_trucks * improved_turn_time_min / 60;
  const improved_peak_doors_required = Math.ceil(improved_peak_door_hours / peak_window_hours / utilization);
  return {
    door_hours, doors_at_full_utilization, doors_required,
    peak_trucks, peak_door_hours, peak_doors_at_full_utilization, peak_doors_required,
    peak_shortfall_doors: peak_doors_required - doors_required,
    improved_peak_door_hours, improved_peak_doors_required,
    doors_saved_by_turn_time: peak_doors_required - improved_peak_doors_required,
    turn_time_saved_min: turn_time_min - improved_turn_time_min,
    note: "Turn time is the whole time a trailer occupies the door -- spotting, securing, the handling, counting and paperwork, and release -- and a dock measuring handling time and calling it turn time will be short of doors by the difference. Utilisation below 100% is not slack; it is what makes the dock work at all, and planning to full utilisation assumes a perfectly scheduled dock. A dock built to the daily average is short for the whole peak every day, and the shortfall appears as trailers in the yard, detention charges, and work pushed into a second shift rather than as a slow dock. The dock's capacity is as much a process property as a building one.",
  };
}

const dockDoorExample = { trucks_per_day: 60, operating_hours: 10, turn_time_min: 55, utilization_pct: 65, peak_arrival_share_pct: 40, peak_window_hours: 3, improved_turn_time_min: 40 };
WAREHOUSE_RENDERERS["dock-door-count-throughput"] = _simpleRenderer({
  citation: "Citation: queueing arithmetic -- door-hours = trucks x turn time, doors at full utilisation = door-hours / operating hours, and doors required = that count divided by a practical utilisation (60 to 70% is the ordinary planning range), rounded up. The peak is computed the same way over the peak window. The facility's own arrival data and yard and detention practice govern.",
  example: dockDoorExample,
  fields: [
    { key: "trucks_per_day", label: "Trucks per day", attrs: { step: "1", min: "1" } },
    { key: "operating_hours", label: "Operating window (hours)" },
    { key: "turn_time_min", label: "Average turn time (min)" },
    { key: "utilization_pct", label: "Practical utilisation (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "peak_arrival_share_pct", label: "Share of arrivals in the peak (%)", attrs: { step: "any", min: "0", max: "100" } },
    { key: "peak_window_hours", label: "Peak window (hours)" },
    { key: "improved_turn_time_min", label: "Turn time after improvement (min)" },
  ],
  outputs: [
    { key: "door_hours", id: "ddc-dh", label: "Door-hours required", value: (r) => fmt(r.door_hours, 1) + " door-hours a day" },
    { key: "doors_at_full_utilization", id: "ddc-full", label: "Doors at full utilisation", value: (r) => fmt(r.doors_at_full_utilization, 2) + " doors -- a figure no dock achieves" },
    { key: "doors_required", id: "ddc-req", label: "Doors on the daily average", value: (r) => fmt(r.doors_required, 0) + " doors" },
    { key: "peak_trucks", id: "ddc-peak", label: "The peak window", value: (r) => fmt(r.peak_trucks, 0) + " trucks, " + fmt(r.peak_door_hours, 1) + " door-hours" },
    { key: "peak_doors_required", id: "ddc-pdr", label: "Doors the peak requires", value: (r) => fmt(r.peak_doors_required, 0) + " doors -- " + fmt(r.peak_shortfall_doors, 0) + " more than the daily average asks for" },
    { key: "improved_peak_doors_required", id: "ddc-imp", label: "At the improved turn time", value: (r) => fmt(r.improved_peak_doors_required, 0) + " doors -- " + fmt(r.doors_saved_by_turn_time, 0) + " saved by " + fmt(r.turn_time_saved_min, 0) + " minutes of turn time" },
    { key: "note", id: "ddc-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeDockDoorCountThroughput,
});

// ========= spec-v1817: order pick rate and labour standard =========

// A labour standard is an engineered time, not an observed average. Building it
// from elements makes it explainable and survives a change in the order mix.
// Travel dominates and it is the element with no output.

// dims: in { lines_per_order: dimensionless, units_per_line: dimensionless, travel_time_s: T, pick_time_s: T, additional_unit_time_s: T, setup_time_min: T, pfd_allowance_pct: dimensionless, batch_size: dimensionless, batch_travel_time_s: T } out: { time_per_line_s: T, pick_time_total_s: T, allowed_order_time_min: T, lines_per_hour: T^-1, units_per_hour: T^-1, travel_share_pct: dimensionless, batch_lines_per_hour: T^-1 }
export function computeOrderPickLaborStandard({ lines_per_order = 0, units_per_line = 0, travel_time_s = 0, pick_time_s = 0, additional_unit_time_s = 0, setup_time_min = 0, pfd_allowance_pct = 0, batch_size = 0, batch_travel_time_s = 0 } = {}) {
  const guard = _finiteGuard(arguments[0]); if (guard) return { error: guard.error };
  if (!(lines_per_order > 0)) return { error: "Lines per order must be positive." };
  if (!(units_per_line >= 1)) return { error: "Units per line must be at least 1." };
  if (!(travel_time_s > 0) || !(pick_time_s > 0)) return { error: "Travel and pick times must be positive." };
  if (!(additional_unit_time_s >= 0) || !(setup_time_min >= 0)) return { error: "Additional-unit time and setup allowance cannot be negative." };
  if (!(pfd_allowance_pct >= 0)) return { error: "The personal, fatigue, and delay allowance cannot be negative." };
  if (!(batch_size >= 1)) return { error: "Batch size must be at least 1." };
  if (!(batch_travel_time_s > 0)) return { error: "Batched travel time must be positive." };
  if (batch_travel_time_s > travel_time_s) return { error: "Batched travel cannot exceed the discrete-order travel it replaces." };
  const pfd_factor = 1 + pfd_allowance_pct / 100;
  const additional_units = units_per_line - 1;
  const handling_time_s = pick_time_s + additional_units * additional_unit_time_s;
  const standardFor = (travel_s) => {
    const time_per_line_s = travel_s + handling_time_s;
    const pick_time_total_s = lines_per_order * time_per_line_s;
    const allowed_order_time_min = (pick_time_total_s / 60 + setup_time_min) * pfd_factor;
    return {
      time_per_line_s, pick_time_total_s,
      pick_time_total_min: pick_time_total_s / 60,
      allowed_order_time_min,
      lines_per_hour: lines_per_order / allowed_order_time_min * 60,
      units_per_hour: lines_per_order * units_per_line / allowed_order_time_min * 60,
      travel_share_pct: 100 * travel_s / time_per_line_s,
    };
  };
  const discrete = standardFor(travel_time_s);
  const batch = standardFor(batch_travel_time_s);
  return {
    handling_time_s,
    time_per_line_s: discrete.time_per_line_s,
    pick_time_total_s: discrete.pick_time_total_s,
    pick_time_total_min: discrete.pick_time_total_min,
    allowed_order_time_min: discrete.allowed_order_time_min,
    lines_per_hour: discrete.lines_per_hour,
    units_per_hour: discrete.units_per_hour,
    travel_share_pct: discrete.travel_share_pct,
    batch_time_per_line_s: batch.time_per_line_s,
    batch_allowed_order_time_min: batch.allowed_order_time_min,
    batch_lines_per_hour: batch.lines_per_hour,
    batch_units_per_hour: batch.units_per_hour,
    batch_travel_share_pct: batch.travel_share_pct,
    batch_improvement_pct: 100 * (batch.lines_per_hour - discrete.lines_per_hour) / discrete.lines_per_hour,
    // Batched travel is entered rather than derived: picking several orders in
    // one pass does NOT divide travel by the batch size, because the picker
    // still walks between every location the combined order needs.
    batch_travel_reduction_pct: 100 * (travel_time_s - batch_travel_time_s) / travel_time_s,
    note: "Travel is the element with no output and it routinely exceeds the time spent picking; slotting, zoning, pick-path sequencing, and batching are all attacks on the same element, and none of them make the pick itself faster. Batched travel is entered rather than divided by the batch size, because the picker still walks between every location the combined order needs. What batching costs is the sort: orders picked together have to be separated afterwards, which is work the discrete method never needed and which carries a mis-sort risk it never had. Many small orders batch overwhelmingly well; an order already this long has amortised its travel already. The facility's own time study or predetermined motion time system, and any applicable collective bargaining agreement, govern a standard used to staff or to pay.",
  };
}

const pickStandardExample = { lines_per_order: 120, units_per_line: 2.5, travel_time_s: 18, pick_time_s: 12, additional_unit_time_s: 3, setup_time_min: 8, pfd_allowance_pct: 15, batch_size: 4, batch_travel_time_s: 7 };
WAREHOUSE_RENDERERS["order-pick-labor-standard"] = _simpleRenderer({
  citation: "Citation: element build-up -- time per line = travel + pick + an increment for each unit beyond the first; allowed order time = (line time + setup and close) x (1 + the personal, fatigue, and delay allowance), with 10 to 20% the usual PF and D range. Element times come from time study or a predetermined motion time system. The facility's own study and any applicable collective bargaining agreement govern a standard used to staff or to pay.",
  example: pickStandardExample,
  fields: [
    { key: "lines_per_order", label: "Lines per order", attrs: { step: "1", min: "1" } },
    { key: "units_per_line", label: "Units per line", attrs: { step: "any", min: "1" } },
    { key: "travel_time_s", label: "Travel time per line (s)" },
    { key: "pick_time_s", label: "Pick time per line (s)" },
    { key: "additional_unit_time_s", label: "Time per additional unit (s)" },
    { key: "setup_time_min", label: "Setup and close per order (min)" },
    { key: "pfd_allowance_pct", label: "Personal, fatigue, and delay allowance (%)" },
    { key: "batch_size", label: "Orders per batch", attrs: { step: "1", min: "1" } },
    { key: "batch_travel_time_s", label: "Travel per line when batched (s)" },
  ],
  outputs: [
    { key: "time_per_line_s", id: "opl-tpl", label: "Time per line", unit: "s", value: (r) => fmt(r.time_per_line_s, 1) + " s" },
    { key: "pick_time_total_min", id: "opl-pick", label: "Picking time", value: (r) => fmt(r.pick_time_total_min, 1) + " min before allowances" },
    { key: "allowed_order_time_min", id: "opl-allow", label: "Allowed order time", unit: "min", value: (r) => fmt(r.allowed_order_time_min, 1) + " min" },
    { key: "lines_per_hour", id: "opl-rate", label: "Standard rate", value: (r) => fmt(r.lines_per_hour, 0) + " lines/h, " + fmt(r.units_per_hour, 0) + " units/h" },
    { key: "travel_share_pct", id: "opl-trav", label: "Share of the time spent travelling", value: (r) => fmt(r.travel_share_pct, 0) + "% -- none of it touches a carton" },
    { key: "batch_lines_per_hour", id: "opl-batch", label: "Batched rate", value: (r) => fmt(r.batch_lines_per_hour, 0) + " lines/h at " + fmt(r.batch_time_per_line_s, 1) + " s per line" },
    { key: "batch_improvement_pct", id: "opl-gain", label: "What batching buys", value: (r) => fmt(r.batch_improvement_pct, 0) + "% more lines an hour, from a " + fmt(r.batch_travel_reduction_pct, 0) + "% cut in travel -- and it costs a sort" },
    { key: "note", id: "opl-note", label: "Use", value: (r) => r.note },
  ],
  compute: computeOrderPickLaborStandard,
});
