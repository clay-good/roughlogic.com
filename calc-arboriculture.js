// Group L: Arboriculture expansion calculators split from calc-arborist.js.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeOutputLine,
  attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input. A renderer
// coerces an empty number field to 0 (Number("") === 0), so a NaN or
// Infinity reaching a solver is genuinely unusable (a pasted 1e999, a
// degenerate computed slot); per the spec-v18 §2 output contract the
// solver returns {error} rather than leaking a non-finite output field.
// Generic over the input object, so it needs no per-tile slot list, and
// it inspects only own numeric values (strings/arrays/null pass through).
// Non-exported, so it adds no v14 derivation-corpus row. (Copied verbatim
// from calc-agriculture.js, which still uses it for its remaining tiles, so
// the split leaves no cross-module import.)
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

// Compact renderer factory, copied verbatim from calc-masonry.js (same
// ui-fields imports) per the new-module convention; only the inner render
// function's name differs, so the schema-coverage gates read it unchanged.
function _simpleRenderer(spec) {
  const _abRender = function (inputRegion, outputRegion, citationEl) {
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

  _abRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _abRender;
}

export const ARBORICULTURE_RENDERERS = {};

// ===========================================================================
// spec-v1696..v1700: the 2026-09-08 trade-expansion arboriculture band. Five
// tiles, all group L.
//
// spec-v1695 trunk-strength-loss WAS CUT: `trunk-decay-strength` already
// screens a hollow trunk. The two differ only in convention -- that tile uses
// Wagener's cube, which is the named arborist screen, and the spec uses the
// section-modulus fourth power -- so the fourth-power figure landed there
// beside the cube rather than as a second tile that would disagree with the
// first about the same trunk.

// ============ spec-v1696: crown reduction and leaf area loss ============

// dims: in { crown_radius_ft: L, reduction_ft: L, outer_third_leaf_share: dimensionless, live_crown_cap_pct: dimensionless } out: { original_area_ft2: L^2, reduced_area_ft2: L^2, area_removed_pct: dimensionless, leaf_area_removed_pct: dimensionless, radius_for_cap_ft: L, amplification: dimensionless }
export function computeCrownReductionLeafArea({ crown_radius_ft = 0, reduction_ft = 0, outer_third_leaf_share = 0.75, live_crown_cap_pct = 25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(crown_radius_ft > 0)) return { error: "Crown radius must be positive (ft)." };
  if (!(reduction_ft > 0)) return { error: "The reduction must be positive (ft of crown radius removed)." };
  if (!(reduction_ft < crown_radius_ft)) return { error: "The reduction cannot remove the whole crown." };
  if (!(outer_third_leaf_share > 0 && outer_third_leaf_share <= 1)) return { error: "The outer-third leaf share must be greater than zero and no more than one." };
  if (!(live_crown_cap_pct > 0 && live_crown_cap_pct <= 100)) return { error: "The live crown removal cap must be between 0 and 100 percent." };
  const original_area_ft2 = Math.PI * crown_radius_ft * crown_radius_ft;
  const reduced_radius_ft = crown_radius_ft - reduction_ft;
  const reduced_area_ft2 = Math.PI * reduced_radius_ft * reduced_radius_ft;
  const area_removed_ft2 = original_area_ft2 - reduced_area_ft2;
  const area_removed_pct = area_removed_ft2 / original_area_ft2 * 100;
  const radius_removed_pct = reduction_ft / crown_radius_ft * 100;
  // Leaf area is concentrated in the outer shell, so removing the outer edge
  // takes a disproportionate share of the foliage. Distribute the entered
  // outer-third share across the outer third of the RADIUS and the remainder
  // across the inner two thirds, and integrate what the cut removes.
  const outerThirdInner = crown_radius_ft * 2 / 3;
  const outerShellArea = original_area_ft2 - Math.PI * outerThirdInner * outerThirdInner;
  const innerArea = original_area_ft2 - outerShellArea;
  const outerDensity = outerShellArea > 0 ? outer_third_leaf_share / outerShellArea : 0;
  const innerDensity = innerArea > 0 ? (1 - outer_third_leaf_share) / innerArea : 0;
  const removedOuter = original_area_ft2 - Math.PI * Math.max(reduced_radius_ft, outerThirdInner) ** 2;
  const removedInner = reduced_radius_ft < outerThirdInner
    ? Math.PI * (outerThirdInner * outerThirdInner - reduced_radius_ft * reduced_radius_ft)
    : 0;
  const leaf_area_removed_fraction = removedOuter * outerDensity + removedInner * innerDensity;
  const leaf_area_removed_pct = leaf_area_removed_fraction * 100;
  const amplification = area_removed_pct > 0 ? leaf_area_removed_pct / area_removed_pct : null;
  const within_cap = leaf_area_removed_pct <= live_crown_cap_pct;
  // The reduction that just reaches the cap, bisected on the same relation.
  let radius_for_cap_ft = null;
  {
    let lo = 0, hi = crown_radius_ft * 0.999;
    const leafAt = (cut) => {
      const rr = crown_radius_ft - cut;
      const ro = original_area_ft2 - Math.PI * Math.max(rr, outerThirdInner) ** 2;
      const ri = rr < outerThirdInner ? Math.PI * (outerThirdInner * outerThirdInner - rr * rr) : 0;
      return (ro * outerDensity + ri * innerDensity) * 100;
    };
    if (leafAt(hi) > live_crown_cap_pct) {
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (leafAt(mid) > live_crown_cap_pct) hi = mid; else lo = mid;
      }
      radius_for_cap_ft = (lo + hi) / 2;
    }
  }
  const outs = [original_area_ft2, reduced_area_ft2, area_removed_pct, leaf_area_removed_pct];
  if (!outs.every(Number.isFinite)) return { error: "Crown reduction math is not a finite value." };
  const verdict = within_cap
    ? "WITHIN the " + fmt(live_crown_cap_pct, 0) + "% live crown cap: " + fmt(reduction_ft, 1) + " ft off the radius removes about " + fmt(leaf_area_removed_pct, 0) + "% of the leaf area"
    : "OVER the " + fmt(live_crown_cap_pct, 0) + "% live crown cap: " + fmt(reduction_ft, 1) + " ft off the radius removes about " + fmt(leaf_area_removed_pct, 0) + "% of the leaf area"
      + (radius_for_cap_ft === null ? "" : ". About " + fmt(radius_for_cap_ft, 1) + " ft is what the cap allows");
  return {
    crown_radius_ft, reduction_ft, reduced_radius_ft, original_area_ft2, reduced_area_ft2,
    area_removed_ft2, area_removed_pct, radius_removed_pct, outer_third_leaf_share,
    leaf_area_removed_pct, amplification, live_crown_cap_pct, within_cap, radius_for_cap_ft, verdict,
    note: "The geometry is why a modest-sounding reduction is a large removal, and it compounds twice. First, crown projection goes as the SQUARE of the radius, so taking a fifth off the radius takes over a third of the projected area. Second, LEAVES ARE ON THE OUTSIDE: the outer third of the crown holds the large majority of the foliage, so the shell the cut removes is the densest part of it. The two together mean a reduction described as a few feet off the ends can remove far more leaf area than the number of feet suggests, and the amplification between the two is reported here because that is the figure a client and an arborist argue about. ANSI A300 addresses pruning DOSE and the limits are what the estimate has to land inside. Removing more than about a quarter of the live crown in a season is widely regarded as excessive for a mature tree, and young, over-mature and stressed trees tolerate considerably less -- a stressed tree should have no live foliage removed until it recovers. The reduction that just reaches the entered cap is worked out here for that reason: it turns the limit into a number of feet the crew can work to. HEAVY REDUCTION TRIGGERS EPICORMIC SPROUTING, and that is a cost that arrives later. The tree responds to the loss of foliage with weakly attached shoots along the remaining branches, which then need managing for years and which are structurally worse than what was removed. A reduction planned to a defensible dose avoids that; one planned to a client's sight line does not. And topping is not pruning: it removes leaf area indiscriminately, leaves stubs that cannot compartmentalise, and creates a decay entry at every cut. A geometric estimate of leaf area against a dose limit. The outer-third share is entered rather than known, because it varies by species, by age, by light exposure and by how the crown has been managed before, and a dense conifer and an open-grown oak do not distribute foliage alike. It treats the crown as a circular projection with foliage in radial shells, which no real crown is, and it does not measure leaf area, which needs destructive sampling or an optical method. It does not select cuts, which is the actual craft -- a reduction is made to lateral branches large enough to assume the terminal role, and where those laterals are decides what is possible. It does not assess the tree's condition, its species tolerance, the season, or whether the reduction is the right treatment at all. ANSI A300 Part 1, the ISA Best Management Practices, and a qualified arborist govern.",
  };
}
const crownReductionLeafAreaExample = { inputs: { crown_radius_ft: 20, reduction_ft: 4, outer_third_leaf_share: 0.75, live_crown_cap_pct: 25 } };
ARBORICULTURE_RENDERERS["crown-reduction-leaf-area"] = _simpleRenderer({
  citation: "Citation: the crown projection and leaf-area distribution relations by name -- projected area goes as the SQUARE of the crown radius, and leaf area is concentrated in the outer shell, with the outer third of the radius holding the entered majority share -- checked against the ANSI A300 live crown removal dose. The outer-third share is ENTERED: it varies by species, age, light exposure and prior management. A geometric estimate on a circular crown projection; it does not measure leaf area, select cuts, or assess the tree. ANSI A300 Part 1, the ISA Best Management Practices, and a qualified arborist govern.",
  example: crownReductionLeafAreaExample.inputs,
  fields: [
    { key: "crown_radius_ft", label: "Crown radius (ft)", kind: "number", default: 20 },
    { key: "reduction_ft", label: "Reduction off the radius (ft)", kind: "number", default: 4 },
    { key: "outer_third_leaf_share", label: "Share of leaf area in the outer third (0 to 1)", kind: "number", default: 0.75 },
    { key: "live_crown_cap_pct", label: "Live crown removal cap (%)", kind: "number", default: 25 },
  ],
  outputs: [
    { key: "a", id: "crla-out-a", label: "Crown projection", value: (r) => fmt(r.original_area_ft2, 0) + " sq ft down to " + fmt(r.reduced_area_ft2, 0) + " sq ft -- " + fmt(r.area_removed_pct, 0) + "% of the AREA for " + fmt(r.radius_removed_pct, 0) + "% of the radius" },
    { key: "l", id: "crla-out-l", label: "Leaf area removed", value: (r) => "about " + fmt(r.leaf_area_removed_pct, 0) + "%, which is " + fmt(r.amplification, 2) + "x the area fraction -- because the outer shell holds " + fmt(r.outer_third_leaf_share * 100, 0) + "% of the foliage" },
    { key: "v", id: "crla-out-v", label: "Against the dose limit", value: (r) => r.verdict },
    { key: "c", id: "crla-out-c", label: "Reduction the cap allows", value: (r) => r.radius_for_cap_ft === null ? "the cap is not reached at any reduction of this crown" : fmt(r.radius_for_cap_ft, 1) + " ft off the radius reaches " + fmt(r.live_crown_cap_pct, 0) + "% -- work to that, not to a sight line" },
    { key: "n", id: "crla-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCrownReductionLeafArea,
});

// ============ spec-v1697: root ball diameter and weight ============

// dims: in { caliper_in: L, ball_per_caliper_in: dimensionless, depth_ratio: dimensionless, soil_density_pcf: M L^-3, handling_limit_lb: M L T^-2 } out: { ball_diameter_in: L, ball_diameter_ft: L, ball_depth_ft: L, ball_volume_ft3: L^3, ball_weight_lb: M L T^-2, ball_weight_tons: M }
export function computeRootBallSizeWeight({ caliper_in = 0, ball_per_caliper_in = 10, depth_ratio = 0.6, soil_density_pcf = 105, handling_limit_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(caliper_in > 0)) return { error: "Trunk caliper must be positive (in)." };
  if (!(ball_per_caliper_in > 0)) return { error: "The ball diameter per inch of caliper must be positive -- ANSI Z60.1 runs roughly 10 to 12 in for shade trees." };
  if (!(depth_ratio > 0 && depth_ratio <= 1)) return { error: "The depth ratio must be greater than zero and no more than one -- commonly 0.60 to 0.75 of the ball diameter." };
  if (!(soil_density_pcf > 0)) return { error: "Soil density must be positive (pcf) -- moist loam runs roughly 100 to 110." };
  if (handling_limit_lb < 0) return { error: "The handling limit cannot be negative (lb)." };
  const IN_PER_FT_AB = 12;
  const LB_PER_TON = 2000;
  const ball_diameter_in = caliper_in * ball_per_caliper_in;
  const ball_diameter_ft = ball_diameter_in / IN_PER_FT_AB;
  const ball_depth_ft = ball_diameter_ft * depth_ratio;
  // A ball is dug as a flattened cylinder rather than a sphere, so the
  // cylinder volume at the ball diameter and depth is the working figure.
  const ball_volume_ft3 = Math.PI / 4 * ball_diameter_ft * ball_diameter_ft * ball_depth_ft;
  const ball_weight_lb = ball_volume_ft3 * soil_density_pcf;
  const ball_weight_tons = ball_weight_lb / LB_PER_TON;
  const within_handling = handling_limit_lb > 0 ? ball_weight_lb <= handling_limit_lb : null;
  // Weight goes as the CUBE of caliper at a fixed ratio, so the caliper a
  // given handling limit allows is a cube root.
  const caliper_for_limit_in = handling_limit_lb > 0
    ? Math.cbrt(handling_limit_lb / (Math.PI / 4 * depth_ratio * soil_density_pcf / (IN_PER_FT_AB ** 3)) ) / ball_per_caliper_in
    : null;
  const outs = [ball_diameter_in, ball_diameter_ft, ball_depth_ft, ball_volume_ft3, ball_weight_lb];
  if (!outs.every(Number.isFinite)) return { error: "Root ball math is not a finite value." };
  const verdict = within_handling === null
    ? "Enter a handling limit to see what this ball needs to move it."
    : within_handling
      ? "WITHIN the " + fmt(handling_limit_lb, 0) + " lb handling limit at " + fmt(ball_weight_lb, 0) + " lb"
      : "OVER the " + fmt(handling_limit_lb, 0) + " lb handling limit at " + fmt(ball_weight_lb, 0) + " lb (" + fmt(ball_weight_tons, 2) + " tons). That is machine or crane work, not a crew and a cart"
        + (caliper_for_limit_in === null ? "" : " -- " + fmt(caliper_for_limit_in, 1) + " in of caliper is what this limit carries");
  return {
    caliper_in, ball_per_caliper_in, ball_diameter_in, ball_diameter_ft, depth_ratio,
    ball_depth_ft, ball_volume_ft3, soil_density_pcf, ball_weight_lb, ball_weight_tons,
    handling_limit_lb, within_handling, caliper_for_limit_in, verdict,
    note: "ANSI Z60.1 sizes a root ball from trunk caliper, at roughly ten to twelve inches of ball diameter per inch of caliper for a shade tree, with the depth a fraction of the diameter rather than a sphere -- a ball is dug flat-bottomed and wide, because that is where the roots are. THE WEIGHT IS THE NUMBER PEOPLE GET WRONG, AND BY A WIDE MARGIN. A six inch caliper tree carries a five foot ball three feet deep, and at the density of moist loam that is about three tons of soil before the tree above it (a tapered ball weighs less than this flat-bottomed cylinder; UT Extension prints 2.4 tons for a 60 by 32 in ball). It is a crane or a large tree spade rather than a crew and a cart, and it is a number worth having before the delivery arrives rather than when it is sitting on the truck. WEIGHT GOES AS THE CUBE OF CALIPER at a fixed ratio, because the diameter, the depth and the width all scale with it -- so doubling the caliper is eight times the weight, and the handling method changes long before the tree looks twice as big. The caliper a given handling limit will carry is reported for that reason: it is the specification question, asked in the direction the site can answer. The trade the ratio represents is survival against handling. A larger ball retains more of the root system and transplants better, and every inch of it costs weight, equipment and money -- which is why the standard gives a range rather than a number, and why a specification that cuts the ball to what the equipment can lift has traded survival for a delivery. Soil density is the other lever and it is not a choice: a ball dug wet is far heavier than the same ball dug in normal moisture, and irrigation before digging is a real and often overlooked contributor to a lift that will not go. A volume and a weight from the standard's proportions. It does not select the ball size, which the specification and the standard do by species and by whether the tree is balled-and-burlapped, in a container, or spaded; the proportions differ for conifers, for multi-stem plants and for large-caliper stock. It does not address the rigging, the lifting points, or the fact that a root ball must be lifted by the BALL and never by the trunk, which breaks the root-soil bond and kills trees that arrive looking fine. It does not evaluate planting depth -- the root flare goes at grade and a ball set too deep is a slow failure -- backfill, staking, or aftercare irrigation, which decides survival more than any of this. ANSI Z60.1, the project specification, and a qualified arborist or nursery professional govern.",
  };
}
const rootBallSizeWeightExample = { inputs: { caliper_in: 6, ball_per_caliper_in: 10, depth_ratio: 0.6, soil_density_pcf: 105, handling_limit_lb: 2000 } };
ARBORICULTURE_RENDERERS["root-ball-size-weight"] = _simpleRenderer({
  citation: "Citation: the ANSI Z60.1 root ball proportions by name -- ball diameter from trunk caliper at roughly 10 to 12 in per inch of caliper for shade trees, with the depth a fraction (commonly 0.60 to 0.75) of the diameter -- and the weight as the flat-bottomed cylinder volume x soil density, with moist loam roughly 100 to 110 pcf. The proportions differ for conifers, multi-stem plants and large-caliper stock and are entered. It does not address rigging, lifting by the ball rather than the trunk, planting depth, or aftercare. ANSI Z60.1, the project specification, and a qualified arborist or nursery professional govern.",
  example: rootBallSizeWeightExample.inputs,
  fields: [
    { key: "caliper_in", label: "Trunk caliper (in)", kind: "number", default: 6 },
    { key: "ball_per_caliper_in", label: "Ball diameter per inch of caliper (in)", kind: "number", default: 10 },
    { key: "depth_ratio", label: "Ball depth as a fraction of its diameter (ANSI Z60.1: 0.60 at 20 in and over, 0.65 under)", kind: "number", default: 0.6 },
    { key: "soil_density_pcf", label: "Soil density (pcf)", kind: "number", default: 105 },
    { key: "handling_limit_lb", label: "Handling limit (lb, 0 to skip)", kind: "number", default: 2000 },
  ],
  outputs: [
    { key: "d", id: "rbsw-out-d", label: "Ball", value: (r) => fmt(r.ball_diameter_in, 0) + " in (" + fmt(r.ball_diameter_ft, 2) + " ft) across by " + fmt(r.ball_depth_ft, 2) + " ft deep" },
    { key: "v", id: "rbsw-out-v", label: "Volume", value: (r) => fmt(r.ball_volume_ft3, 1) + " cu ft of soil" },
    { key: "w", id: "rbsw-out-w", label: "Weight", value: (r) => fmt(r.ball_weight_lb, 0) + " lb (" + fmt(r.ball_weight_tons, 2) + " tons) at " + fmt(r.soil_density_pcf, 0) + " pcf -- and a ball dug wet is heavier still" },
    { key: "h", id: "rbsw-out-h", label: "Against the handling limit", value: (r) => r.verdict },
    { key: "c", id: "rbsw-out-c", label: "Weight goes as the CUBE of caliper", value: (r) => "double the caliper is eight times the weight, so the handling method changes long before the tree looks twice as big" },
    { key: "n", id: "rbsw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRootBallSizeWeight,
});

// ============ spec-v1698: tree cabling support system rating ============

// dims: in { defect_to_tips_ft: L, placement_fraction: dimensionless, alternative_placement_ft: L, design_load_lb: M L T^-2, cable_rating_lb: M L T^-2, termination_rating_lb: M L T^-2, anchor_rating_lb: M L T^-2, cable_count: dimensionless } out: { placement_height_ft: L, moment_arm_ratio: dimensionless, force_at_placement_lb: M L T^-2, force_at_alternative_lb: M L T^-2, system_rating_lb: M L T^-2, utilization_pct: dimensionless }
export function computeTreeCablingRating({ defect_to_tips_ft = 0, placement_fraction = 0.6667, alternative_placement_ft = 0, design_load_lb = 0, cable_rating_lb = 0, termination_rating_lb = 0, anchor_rating_lb = 0, cable_count = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(defect_to_tips_ft > 0)) return { error: "The distance from the defect to the branch tips must be positive (ft)." };
  if (!(placement_fraction > 0 && placement_fraction <= 1)) return { error: "The placement fraction must be greater than zero and no more than one -- ANSI A300 practice is about two thirds of the way from the defect to the tips." };
  if (alternative_placement_ft < 0) return { error: "The comparison placement height cannot be negative (ft)." };
  if (!(design_load_lb > 0)) return { error: "A design load must be positive (lb) -- it is entered, because crown area, wind and geometry decide it and this does not." };
  if (cable_rating_lb < 0 || termination_rating_lb < 0 || anchor_rating_lb < 0) return { error: "A component rating cannot be negative (lb)." };
  if (!(cable_count >= 1)) return { error: "There must be at least one cable." };
  const placement_height_ft = defect_to_tips_ft * placement_fraction;
  // A cable restrains a moment, so the force it carries is the design load
  // scaled by the ratio of the reference arm to its own arm. Placing it lower
  // means a shorter arm and a larger force for the same restraint.
  const force_at_placement_lb = design_load_lb * defect_to_tips_ft / placement_height_ft / cable_count;
  const force_at_alternative_lb = alternative_placement_ft > 0
    ? design_load_lb * defect_to_tips_ft / alternative_placement_ft / cable_count
    : null;
  const moment_arm_ratio = alternative_placement_ft > 0 ? placement_height_ft / alternative_placement_ft : null;
  const force_multiple = force_at_alternative_lb === null ? null : force_at_alternative_lb / force_at_placement_lb;
  // THE SYSTEM IS THE WEAKEST OF ITS PARTS. Cable, terminations and anchors
  // each carry a rating and only the smallest of them is the system's.
  const rated = [cable_rating_lb, termination_rating_lb, anchor_rating_lb].filter((x) => x > 0);
  const system_rating_lb = rated.length > 0 ? Math.min(...rated) : null;
  const weakest = system_rating_lb === null ? null
    : (system_rating_lb === anchor_rating_lb ? "the anchors"
      : system_rating_lb === termination_rating_lb ? "the terminations" : "the cable");
  const utilization_pct = system_rating_lb === null ? null : force_at_placement_lb / system_rating_lb * 100;
  const within_rating = system_rating_lb === null ? null : force_at_placement_lb <= system_rating_lb;
  const outs = [placement_height_ft, force_at_placement_lb];
  if (!outs.every(Number.isFinite)) return { error: "Cabling rating math is not a finite value." };
  const verdict = within_rating === null
    ? "Enter the cable, termination and anchor ratings -- the system is the weakest of the three."
    : within_rating
      ? "WITHIN RATING: " + fmt(force_at_placement_lb, 0) + " lb per cable against a system rating of " + fmt(system_rating_lb, 0) + " lb, set by " + weakest + ", " + fmt(utilization_pct, 0) + "%"
      : "OVER RATING: " + fmt(force_at_placement_lb, 0) + " lb per cable against a system rating of " + fmt(system_rating_lb, 0) + " lb, set by " + weakest + ". The system is only as strong as that part";
  const placement_verdict = force_at_alternative_lb === null
    ? "Enter a comparison placement height to see what a lower cable costs."
    : "A cable at " + fmt(alternative_placement_ft, 1) + " ft carries " + fmt(force_at_alternative_lb, 0) + " lb -- " + fmt(force_multiple, 2) + "x the force of one at " + fmt(placement_height_ft, 1) + " ft, for the same restraint. It works at " + fmt(1 / (moment_arm_ratio || 1), 2) + " of the lever, and that is where cable and hardware failures concentrate";
  return {
    defect_to_tips_ft, placement_fraction, placement_height_ft, alternative_placement_ft,
    moment_arm_ratio, design_load_lb, cable_count, force_at_placement_lb,
    force_at_alternative_lb, force_multiple, cable_rating_lb, termination_rating_lb,
    anchor_rating_lb, system_rating_lb, weakest, utilization_pct, within_rating,
    verdict, placement_verdict,
    note: "A support cable restrains a MOMENT, and where it sits on the branch decides the force it carries. ANSI A300 practice puts it about two thirds of the way from the defect to the branch tips, and the reason is mechanical rather than conventional: a cable placed lower works at a shorter lever, so it must carry proportionally more force to restrain the same movement. A cable at a third of the way -- which is easier to reach and a common shortcut -- carries twice the force of one at two thirds, and that is where cable and hardware failures concentrate. It is entirely a placement decision, made once, on the ground, before anyone climbs. THE SYSTEM IS THE WEAKEST OF ITS PARTS, and the part people rate is the cable. A cabling system is the cable, its terminations, and its anchors in the wood, and each has its own rating; the assembly is rated at the smallest of the three, and it is frequently not the cable. Anchor capacity in living wood depends on the species, the wood's condition at that point, the hardware, and the installation, and an anchor in decayed wood beside the defect being braced is the failure nobody inspected for. Static and dynamic systems are different tools rather than grades of the same one. A static steel system restricts movement and takes load continuously; a dynamic synthetic system allows the tree to move and loads only at the extremes, which lets the tree keep adding reaction wood where it needs it. Choosing between them is an arboricultural judgment about what the tree should be allowed to do, not a hardware preference. THE LOAD IS ENTERED AND THIS DOES NOT COMPUTE IT, which is the honest limit of the calculation. The force a cable sees depends on the crown area above the defect, on the wind it catches, on how the two stems move relative to each other, and on the dynamic amplification of a swaying mass -- and none of that is a formula an arborist can carry. Published guidance gives ranges by trunk diameter and crown size, and a design load taken from them is an estimate. Cabling does not fix a defect; it manages a risk, and it creates an obligation: annual inspection and inspection after significant weather, because cables corrode, terminations wear, anchors embed and get overgrown, and a system nobody checks is worse than no system because it was relied on. It does not assess the defect, decide whether cabling is appropriate, size the hardware, or evaluate whether the tree should be removed instead. ANSI A300 Part 3, the ISA Best Management Practices for tree support systems, the hardware manufacturer's ratings, and a qualified arborist govern.",
  };
}
const treeCablingRatingExample = { inputs: { defect_to_tips_ft: 24, placement_fraction: 0.6667, alternative_placement_ft: 8, design_load_lb: 1200, cable_rating_lb: 4000, termination_rating_lb: 3600, anchor_rating_lb: 2800, cable_count: 1 } };
ARBORICULTURE_RENDERERS["tree-cabling-rating"] = _simpleRenderer({
  citation: "Citation: the ANSI A300 Part 3 cabling placement convention by name -- about two thirds of the distance from the defect to the branch tips -- with the force scaling as the inverse of the moment arm, and the SYSTEM rating taken as the minimum of the cable, its terminations and its anchors. THE DESIGN LOAD IS ENTERED and is not computed: it depends on crown area, wind, relative stem movement and dynamic amplification, and published guidance gives ranges by trunk and crown size. Cabling manages a risk rather than fixing a defect, and creates an obligation to inspect annually and after significant weather. ANSI A300 Part 3, the ISA Best Management Practices, the hardware manufacturer's ratings, and a qualified arborist govern.",
  example: treeCablingRatingExample.inputs,
  fields: [
    { key: "defect_to_tips_ft", label: "Defect to branch tips (ft)", kind: "number", default: 24 },
    { key: "placement_fraction", label: "Placement, as a fraction of that distance", kind: "number", default: 0.6667 },
    { key: "alternative_placement_ft", label: "Comparison placement height (ft, 0 to skip)", kind: "number", default: 8 },
    { key: "design_load_lb", label: "Design load at the branch tips (lb)", kind: "number", default: 1200 },
    { key: "cable_rating_lb", label: "Cable working load limit (lb, not breaking strength; 0 to skip)", kind: "number", default: 4000 },
    { key: "termination_rating_lb", label: "Termination working load limit (lb; 0 to skip)", kind: "number", default: 3600 },
    { key: "anchor_rating_lb", label: "Anchor working load in the wood (lb; 0 to skip)", kind: "number", default: 2800 },
    { key: "cable_count", label: "Cables sharing the load", kind: "number", default: 1 },
  ],
  outputs: [
    { key: "p", id: "tcr-out-p", label: "Placement", value: (r) => fmt(r.placement_height_ft, 1) + " ft above the defect, " + fmt(r.placement_fraction * 100, 0) + "% of the " + fmt(r.defect_to_tips_ft, 1) + " ft to the tips" },
    { key: "f", id: "tcr-out-f", label: "Force per cable", value: (r) => fmt(r.force_at_placement_lb, 0) + " lb across " + fmt(r.cable_count, 0) + " cable" + (r.cable_count === 1 ? "" : "s") },
    { key: "l", id: "tcr-out-l", label: "What a lower cable costs", value: (r) => r.placement_verdict },
    { key: "v", id: "tcr-out-v", label: "Against the system rating", value: (r) => r.verdict },
    { key: "n", id: "tcr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTreeCablingRating,
});

// ============ spec-v1699: stump grinding volume and chip yield ============

// dims: in { stump_diameter_in: L, grind_diameter_in: L, grind_depth_in: L, swell_factor: dimensionless, settlement_fraction: dimensionless } out: { in_place_volume_ft3: L^3, stump_only_volume_ft3: L^3, flare_multiple: dimensionless, chip_volume_ft3: L^3, backfill_volume_ft3: L^3, excess_volume_ft3: L^3 }
export function computeStumpGrindingVolume({ stump_diameter_in = 0, grind_diameter_in = 0, grind_depth_in = 0, swell_factor = 1.8, settlement_fraction = 0.3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(stump_diameter_in > 0)) return { error: "Stump diameter must be positive (in)." };
  if (!(grind_diameter_in > 0)) return { error: "The ground diameter must be positive (in) -- it is wider than the visible stump, because the grind has to take the root flare." };
  if (!(grind_diameter_in >= stump_diameter_in)) return { error: "The ground diameter cannot be smaller than the stump; the flare makes it larger." };
  if (!(grind_depth_in > 0)) return { error: "Grind depth must be positive (in) -- 6 to 8 in for turf, deeper for replanting." };
  if (!(swell_factor >= 1)) return { error: "The swell factor cannot be below one; ground material occupies more volume than it did in place." };
  if (!(settlement_fraction >= 0 && settlement_fraction < 1)) return { error: "The settlement fraction must be at least zero and below one." };
  const IN_PER_FT_ST = 12;
  const CF_PER_CY = 27;
  const stump_d_ft = stump_diameter_in / IN_PER_FT_ST;
  const grind_d_ft = grind_diameter_in / IN_PER_FT_ST;
  const depth_ft = grind_depth_in / IN_PER_FT_ST;
  const stump_only_volume_ft3 = Math.PI / 4 * stump_d_ft * stump_d_ft * depth_ft;
  const in_place_volume_ft3 = Math.PI / 4 * grind_d_ft * grind_d_ft * depth_ft;
  const flare_multiple = stump_only_volume_ft3 > 0 ? in_place_volume_ft3 / stump_only_volume_ft3 : null;
  const chip_volume_ft3 = in_place_volume_ft3 * swell_factor;
  const chip_volume_cy = chip_volume_ft3 / CF_PER_CY;
  // The hole holds its own in-place volume; the rest is excess. Chips settle
  // substantially, so the hole needs topping later whatever goes in now.
  const backfill_volume_ft3 = Math.min(chip_volume_ft3, in_place_volume_ft3);
  const excess_volume_ft3 = Math.max(0, chip_volume_ft3 - in_place_volume_ft3);
  const excess_volume_cy = excess_volume_ft3 / CF_PER_CY;
  const settled_volume_ft3 = backfill_volume_ft3 * (1 - settlement_fraction);
  const topping_volume_ft3 = in_place_volume_ft3 - settled_volume_ft3;
  const outs = [stump_only_volume_ft3, in_place_volume_ft3, chip_volume_ft3, backfill_volume_ft3, excess_volume_ft3];
  if (!outs.every(Number.isFinite)) return { error: "Stump grinding math is not a finite value." };
  return {
    stump_diameter_in, grind_diameter_in, grind_depth_in, stump_only_volume_ft3,
    in_place_volume_ft3, flare_multiple, swell_factor, chip_volume_ft3, chip_volume_cy,
    backfill_volume_ft3, excess_volume_ft3, excess_volume_cy, settlement_fraction,
    settled_volume_ft3, topping_volume_ft3,
    note: "THE GRIND IS WIDER THAN THE STUMP, and estimating on the visible diameter is where the job goes wrong before it starts. A stump has a root flare and buttress roots that spread well beyond the trunk, and the grinder has to take them -- so a two foot stump is a three foot grind, and because volume goes as the SQUARE of the diameter that is well over twice the material at the same depth. The multiple is reported here for exactly that reason: it is the number that separates a bid from a loss. DEPTH IS SET BY THE OBJECTIVE rather than by habit. Six to eight inches is enough to put turf over; replanting in the same spot needs considerably more, and a stump ground to turf depth and then planted into is a tree planted in a bed of chips. CHIPS SWELL, and then they settle. Ground material occupies one and a half to two times its in-place volume, so the hole cannot hold what came out of it and the excess is hauled or spread -- and the part that goes back settles substantially as it decomposes, which is why a hole backfilled level is a depression a season later. The topping volume is reported for that reason: it is a second visit that belongs in the price or in the conversation. AND CHIPS ARE NOT SOIL. They are high in carbon, and the microbes decomposing them take nitrogen out of the surrounding soil to do it, so a new tree planted into a chip-filled hole competes for nitrogen with the decomposition of the last one. Replanting in the same location means removing the chips and replacing them with soil, which is a different job from grinding and should be priced as one. A volume estimate from a geometry the reader measures. It does not locate utilities, which is the thing that matters most before a grinder starts and which requires a locate; it does not address the surface protection, the debris containment, or the damage a grinder does to adjacent turf, roots, and hardscape. It does not assess whether the roots beyond the grind will be an issue -- large lateral roots of a removed tree decay and can leave voids and settlement well outside the ground area -- or address stump removal by excavation, which is a different operation with different quantities. The utility locate, the site conditions, and the operator's own judgment govern.",
  };
}
const stumpGrindingVolumeExample = { inputs: { stump_diameter_in: 24, grind_diameter_in: 36, grind_depth_in: 12, swell_factor: 1.8, settlement_fraction: 0.3 } };
ARBORICULTURE_RENDERERS["stump-grinding-volume"] = _simpleRenderer({
  citation: "Citation: the stump grinding volume relations by name -- the ground volume is a cylinder at the GROUND diameter, which includes the root flare and is wider than the visible stump, times the depth; chips swell to 1.5 to 2 times the in-place volume; the hole holds its own in-place volume and the rest is excess; and the backfill settles by an entered fraction, which is what needs topping later. Depth is set by the objective: 6 to 8 in for turf, deeper for replanting. Chips are high in carbon and tie up nitrogen, so replanting means replacing them with soil. It does not locate utilities. The utility locate, the site conditions, and the operator's judgment govern.",
  example: stumpGrindingVolumeExample.inputs,
  fields: [
    { key: "stump_diameter_in", label: "Visible stump diameter (in)", kind: "number", default: 24 },
    { key: "grind_diameter_in", label: "Ground diameter including the flare (in)", kind: "number", default: 36 },
    { key: "grind_depth_in", label: "Grind depth (in)", kind: "number", default: 12 },
    { key: "swell_factor", label: "Chip swell factor", kind: "number", default: 1.8 },
    { key: "settlement_fraction", label: "Backfill settlement (0 to 1)", kind: "number", default: 0.3 },
  ],
  outputs: [
    { key: "f", id: "sgv-out-f", label: "The flare is the job", value: (r) => fmt(r.in_place_volume_ft3, 2) + " cu ft at the " + fmt(r.grind_diameter_in, 0) + " in ground diameter against " + fmt(r.stump_only_volume_ft3, 2) + " at the " + fmt(r.stump_diameter_in, 0) + " in stump -- " + fmt(r.flare_multiple, 2) + "x, and estimating on the visible stump understates it by that" },
    { key: "c", id: "sgv-out-c", label: "Chips produced", value: (r) => fmt(r.chip_volume_ft3, 1) + " cu ft (" + fmt(r.chip_volume_cy, 2) + " cy) at a swell of " + fmt(r.swell_factor, 2) },
    { key: "b", id: "sgv-out-b", label: "Back in the hole", value: (r) => fmt(r.backfill_volume_ft3, 1) + " cu ft fits, leaving " + fmt(r.excess_volume_ft3, 1) + " cu ft (" + fmt(r.excess_volume_cy, 2) + " cy) to haul or spread" },
    { key: "s", id: "sgv-out-s", label: "After it settles", value: (r) => fmt(r.settled_volume_ft3, 1) + " cu ft at " + fmt(r.settlement_fraction * 100, 0) + "% settlement, so about " + fmt(r.topping_volume_ft3, 1) + " cu ft of topping later -- a second visit that belongs in the price" },
    { key: "n", id: "sgv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeStumpGrindingVolume,
});

// ============ spec-v1700: soil volume required for a target canopy ============

// dims: in { canopy_diameter_ft: L, soil_per_canopy_ft3_per_ft2: dimensionless, pit_length_ft: L, pit_width_ft: L, pit_depth_ft: L, usable_fraction: dimensionless } out: { canopy_area_ft2: L^2, soil_required_ft3: L^3, pit_volume_ft3: L^3, usable_pit_volume_ft3: L^3, provision_pct: dimensionless, supported_canopy_ft: L }
export function computeSoilVolumeForCanopy({ canopy_diameter_ft = 0, soil_per_canopy_ft3_per_ft2 = 2, pit_length_ft = 0, pit_width_ft = 0, pit_depth_ft = 0, usable_fraction = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(canopy_diameter_ft > 0)) return { error: "The intended mature canopy diameter must be positive (ft)." };
  if (!(soil_per_canopy_ft3_per_ft2 > 0)) return { error: "The soil volume ratio must be positive (cu ft of soil per sq ft of canopy) -- commonly 1.5 to 2, higher for large species." };
  if (pit_length_ft < 0 || pit_width_ft < 0 || pit_depth_ft < 0) return { error: "A pit dimension cannot be negative (ft)." };
  if (!(usable_fraction > 0 && usable_fraction <= 1)) return { error: "The usable fraction must be greater than zero and no more than one -- soil compacted for paving support is not soil roots can use." };
  const canopy_area_ft2 = Math.PI / 4 * canopy_diameter_ft * canopy_diameter_ft;
  const soil_required_ft3 = canopy_area_ft2 * soil_per_canopy_ft3_per_ft2;
  const soil_required_cy = soil_required_ft3 / 27;
  const pit_volume_ft3 = pit_length_ft * pit_width_ft * pit_depth_ft;
  const usable_pit_volume_ft3 = pit_volume_ft3 * usable_fraction;
  const provision_pct = soil_required_ft3 > 0 && pit_volume_ft3 > 0 ? usable_pit_volume_ft3 / soil_required_ft3 * 100 : null;
  const shortfall_ft3 = pit_volume_ft3 > 0 ? Math.max(0, soil_required_ft3 - usable_pit_volume_ft3) : null;
  const adequate = provision_pct === null ? null : usable_pit_volume_ft3 >= soil_required_ft3;
  // What this pit actually supports, which is the honest reading of it.
  const supported_area_ft2 = usable_pit_volume_ft3 / soil_per_canopy_ft3_per_ft2;
  const supported_canopy_ft = pit_volume_ft3 > 0 ? Math.sqrt(4 * supported_area_ft2 / Math.PI) : null;
  const outs = [canopy_area_ft2, soil_required_ft3];
  if (!outs.every(Number.isFinite)) return { error: "Soil volume math is not a finite value." };
  const verdict = adequate === null
    ? "Enter the tree pit dimensions to compare what is provided against what the canopy needs."
    : adequate
      ? "ADEQUATE: " + fmt(usable_pit_volume_ft3, 0) + " cu ft of usable soil against " + fmt(soil_required_ft3, 0) + " required for a " + fmt(canopy_diameter_ft, 0) + " ft canopy"
      : "THE PIT PROVIDES " + fmt(provision_pct, 0) + "% OF WHAT THE INTENDED CANOPY NEEDS: " + fmt(usable_pit_volume_ft3, 0) + " cu ft of usable soil against " + fmt(soil_required_ft3, 0) + " required, short by " + fmt(shortfall_ft3, 0) + ". What it actually supports is a canopy of about " + fmt(supported_canopy_ft, 0) + " ft, and the tree will stall there whatever the plan says";
  return {
    canopy_diameter_ft, canopy_area_ft2, soil_per_canopy_ft3_per_ft2, soil_required_ft3,
    soil_required_cy, pit_length_ft, pit_width_ft, pit_depth_ft, pit_volume_ft3,
    usable_fraction, usable_pit_volume_ft3, provision_pct, shortfall_ft3, adequate,
    supported_area_ft2, supported_canopy_ft, verdict,
    note: "A tree's mature size is set by the soil it has, not by the species on the plan, and the arithmetic is brutal once it is written down. Guidance commonly puts the requirement at one and a half to two cubic feet of usable soil per square foot of intended canopy projection, and canopy area goes as the SQUARE of the diameter -- so a tree meant to reach twenty five feet across needs the better part of a thousand cubic feet of soil. A five by five foot pit three feet deep is seventy five. THAT IS EIGHT PERCENT OF WHAT THE PLAN ASKS FOR, and the tree does not fail: it grows to what its soil supports and stops, which is read as a species problem or a maintenance problem years later. The supported canopy is reported here beside the requirement, because it is the honest description of what has actually been built. COMPACTED SOIL IS NOT SOIL. Soil compacted to support paving is compacted past the density roots can penetrate, so a large volume of engineered subgrade beneath a sidewalk contributes nothing, and a pit whose walls are compacted is a container rather than an opening. That is what the usable fraction is for, and it is often the difference between a design that reads adequate and one that is. THE SOLUTIONS ARE STRUCTURAL RATHER THAN HORTICULTURAL, which is why this belongs in the site design and not in the planting detail. Connected trenches let several trees share a volume none of them could have alone; structural soil carries load through a stone skeleton with soil in its voids; suspended pavement carries the paving on a structure and leaves uncompacted soil beneath it. All of them cost money at construction and all of them are cheaper than replacing a street tree every fifteen years, which is what the alternative actually costs. A volume comparison against a ratio the reader supplies. The ratio itself varies with species, climate, soil type, rainfall and whether the tree is irrigated, and published guidance spans a wide range -- a number at the low end of it is not a safe default. It does not design the soil, specify its composition, drainage or organic content, or address the rooting depth that is actually available above a water table or a hardpan. It does not evaluate structural soil or suspended pavement systems, which have their own design and their own effective volumes, and it does not address the aeration, irrigation and drainage that decide whether a volume of soil is usable at all. The urban forestry standard in use, the landscape architect, and a qualified arborist govern.",
  };
}
const soilVolumeForCanopyExample = { inputs: { canopy_diameter_ft: 25, soil_per_canopy_ft3_per_ft2: 2, pit_length_ft: 5, pit_width_ft: 5, pit_depth_ft: 3, usable_fraction: 1 } };
ARBORICULTURE_RENDERERS["soil-volume-for-canopy"] = _simpleRenderer({
  citation: "Citation: the urban soil volume guidance by name -- commonly 1.5 to 2 cubic feet of usable soil per square foot of intended mature canopy projection, with canopy area going as the SQUARE of the diameter. The ratio varies with species, climate, soil and irrigation and is ENTERED; published guidance spans a wide range. Soil compacted for paving support is not soil roots can use, which is what the usable fraction is for. It does not design the soil or evaluate structural soil and suspended pavement systems. The urban forestry standard in use, the landscape architect, and a qualified arborist govern.",
  example: soilVolumeForCanopyExample.inputs,
  fields: [
    { key: "canopy_diameter_ft", label: "Intended mature canopy diameter (ft)", kind: "number", default: 25 },
    { key: "soil_per_canopy_ft3_per_ft2", label: "Soil per sq ft of canopy (cu ft)", kind: "number", default: 2 },
    { key: "pit_length_ft", label: "Tree pit length (ft, 0 to skip)", kind: "number", default: 5 },
    { key: "pit_width_ft", label: "Tree pit width (ft)", kind: "number", default: 5 },
    { key: "pit_depth_ft", label: "Tree pit depth (ft)", kind: "number", default: 3 },
    { key: "usable_fraction", label: "Fraction of that soil roots can actually use", kind: "number", default: 1 },
  ],
  outputs: [
    { key: "c", id: "svc-out-c", label: "Canopy projection", value: (r) => fmt(r.canopy_area_ft2, 0) + " sq ft for a " + fmt(r.canopy_diameter_ft, 0) + " ft canopy" },
    { key: "s", id: "svc-out-s", label: "Soil required", value: (r) => fmt(r.soil_required_ft3, 0) + " cu ft (" + fmt(r.soil_required_cy, 1) + " cy) at " + fmt(r.soil_per_canopy_ft3_per_ft2, 2) + " cu ft per sq ft of canopy" },
    { key: "p", id: "svc-out-p", label: "The pit provides", value: (r) => r.pit_volume_ft3 === 0 ? "(no pit entered)" : fmt(r.pit_volume_ft3, 0) + " cu ft, " + fmt(r.usable_pit_volume_ft3, 0) + " of it usable at a " + fmt(r.usable_fraction, 2) + " fraction" },
    { key: "v", id: "svc-out-v", label: "Against the requirement", value: (r) => r.verdict },
    { key: "n", id: "svc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSoilVolumeForCanopy,
});
