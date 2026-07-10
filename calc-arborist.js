// Group L: Tree care and arborist rigging.
//
// spec-v87 cap-relief split: the cohesive spec-v68 arborist bench --
// green log / limb weight, dynamic (shock) rigging load, open-face felling
// notch and hinge geometry, porta-wrap friction-device hold force, and brush
// chip volume / haul loads -- relocated out of calc-agriculture.js (which had
// reached 95.1% of its gzip cap, the tightest remaining calc module after the
// v83-v85 expansion). These five tiles model the tree-removal / rigging side
// of Group L, distinct from the crop, soil, irrigation, livestock, forestry-
// cruise, and sprayer tiles that stay in calc-agriculture.js. All five KEEP
// group: "L" (a tile's group letter is independent of the module that holds
// it, the spec-v42 / spec-v70..v86 precedent); their ids, citations, worked
// examples, dimensional annotations, and behavior are byte-for-byte unchanged.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
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

export const ARBORIST_RENDERERS = {};

// =====================================================================
// spec-v68: Tree care and arborist rigging (Group L).
// =====================================================================

// --- log-limb-weight: Green Log and Limb Weight ---
//
// Frustum volume (cylinder when butt = top) times a bundled green density.
// Helpers above the dims block so the v14 lint associates the annotation.
const GREEN_DENSITY = {
  red_oak: 64, white_oak: 62, sugar_maple: 58, ash: 48, elm: 54, hickory: 63,
  douglas_fir: 44, southern_pine: 52, eastern_white_pine: 36, cottonwood: 49,
  generic_hardwood: 58, generic_softwood: 45,
};
// dims: in { butt_dia_in: L, top_dia_in: L, length_ft: L, species: dimensionless } out: { volume_ft3: L^3, weight_lb: M L T^-2, density: M L^-3 }
// (Diameters and length are lengths L; the frustum volume is L^3; the green
//  density is a mass per volume M L^-3, giving a weight (force) M L T^-2.)
export function computeLogLimbWeight({ butt_dia_in, top_dia_in, length_ft, species = "generic_hardwood", density = null } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const butt = Number(butt_dia_in);
  const top = Number(top_dia_in);
  const length = Number(length_ft);
  if (!Number.isFinite(butt) || butt <= 0) return { error: "Butt diameter must be a positive finite number (in)." };
  if (!Number.isFinite(top) || top <= 0) return { error: "Top diameter must be a positive finite number (in)." };
  if (!Number.isFinite(length) || length <= 0) return { error: "Length must be a positive finite number (ft)." };
  const dens = density != null ? Number(density) : (GREEN_DENSITY[species] || GREEN_DENSITY.generic_hardwood);
  if (!Number.isFinite(dens) || dens <= 0) return { error: "Green density must be a positive finite number (lb/ft^3)." };
  const r1 = butt / 24, r2 = top / 24;
  const volumeFt3 = Math.PI / 3 * length * (r1 * r1 + r1 * r2 + r2 * r2);
  const weightLb = volumeFt3 * dens;
  if (![volumeFt3, weightLb].every(Number.isFinite)) return { error: "Weight math is not a finite value." };
  return {
    volume_ft3: volumeFt3,
    weight_lb: weightLb,
    density: dens,
    note: "Green density varies with species, moisture, and season; the bundled values are representative, not exact - weigh or conservatively over-estimate. A tapered frustum is lighter than a cylinder of the butt diameter, so a cylinder estimate is the safe side. Included water makes fresh wood far heavier than seasoned. This is the static load that tree-rigging-shock multiplies when the piece is dropped.",
  };
}

function _v68renderLogLimbWeight(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: USDA FPL Wood Handbook green density by species by name. Frustum volume = (pi/3) x length x (r1^2 + r1 r2 + r2^2); weight = volume x green density. Weigh or over-estimate when in doubt.";
  const butt = makeNumber("Butt (large end) diameter (in)", "ll-butt", { step: "any", min: "0" });
  const top = makeNumber("Top (small end) diameter (in)", "ll-top", { step: "any", min: "0" });
  const length = makeNumber("Length (ft)", "ll-len", { step: "any", min: "0" });
  const species = makeSelect("Species (green density)", "ll-sp", [
    { value: "red_oak", label: "Red oak (64)", selected: true }, { value: "white_oak", label: "White oak (62)" },
    { value: "sugar_maple", label: "Sugar maple (58)" }, { value: "ash", label: "Ash (48)" }, { value: "elm", label: "Elm (54)" },
    { value: "hickory", label: "Hickory (63)" }, { value: "douglas_fir", label: "Douglas-fir (44)" },
    { value: "southern_pine", label: "Southern pine (52)" }, { value: "eastern_white_pine", label: "Eastern white pine (36)" },
    { value: "cottonwood", label: "Cottonwood (49)" }, { value: "generic_hardwood", label: "Generic hardwood (58)" },
    { value: "generic_softwood", label: "Generic softwood (45)" },
  ]);
  for (const f of [butt, top, length, species]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { butt.input.value = "16"; top.input.value = "16"; length.input.value = "8"; species.select.value = "red_oak"; update(); });
  const oVol = makeOutputLine(outputRegion, "Piece volume", "ll-out-vol");
  const oWt = makeOutputLine(outputRegion, "Green weight (static load)", "ll-out-wt");
  const update = debounce(() => {
    const r = computeLogLimbWeight({ butt_dia_in: Number(butt.input.value) || 0, top_dia_in: Number(top.input.value) || 0, length_ft: Number(length.input.value) || 0, species: species.select.value });
    if (r.error) { oVol.textContent = r.error; oWt.textContent = "-"; return; }
    oVol.textContent = fmt(r.volume_ft3, 2) + " ft^3";
    oWt.textContent = fmt(r.weight_lb, 0) + " lb (" + fmt(r.density, 0) + " lb/ft^3 green)";
  }, DEBOUNCE_MS);
  for (const f of [butt, top, length]) f.input.addEventListener("input", update);
  species.select.addEventListener("change", update);
}
ARBORIST_RENDERERS["log-limb-weight"] = _v68renderLogLimbWeight;

// --- tree-rigging-shock: Shock (Dynamic) Load on a Rigging Point ---
//
// stretch = elong/100 x rope_length; peak = static x (1 + sqrt(1 + 2 drop /
// stretch)); multiplier = peak / static.
// dims: in { static_weight_lb: M L T^-2, drop_ft: L, rope_length_ft: L, elong_pct: dimensionless } out: { stretch_ft: L, peak_load_lb: M L T^-2, multiplier: dimensionless }
// (Static weight and peak load are forces M L T^-2; drop, rope length, and
//  stretch are lengths L; elongation and the multiplier are dimensionless.)
export function computeTreeRiggingShock({ static_weight_lb, drop_ft, rope_length_ft, elong_pct = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const stat = Number(static_weight_lb);
  const drop = Number(drop_ft);
  const rope = Number(rope_length_ft);
  const elong = Number(elong_pct);
  if (!Number.isFinite(stat) || stat <= 0) return { error: "Static weight must be a positive finite number (lb)." };
  if (!Number.isFinite(drop) || drop < 0) return { error: "Drop must be a non-negative finite number (ft)." };
  if (!Number.isFinite(rope) || rope <= 0) return { error: "Rope length must be a positive finite number (ft)." };
  if (!Number.isFinite(elong) || elong <= 0) return { error: "Elongation must be positive - a truly static catch has unbounded peak load." };
  const stretchFt = elong / 100 * rope;
  if (!(stretchFt > 0)) return { error: "Rope stretch is zero - the peak load is unbounded; use a dynamic-rated rope." };
  const peakLoadLb = stat * (1 + Math.sqrt(1 + 2 * drop / stretchFt));
  const multiplier = peakLoadLb / stat;
  if (![stretchFt, peakLoadLb, multiplier].every(Number.isFinite)) return { error: "Shock-load math is not a finite value." };
  return {
    stretch_ft: stretchFt,
    peak_load_lb: peakLoadLb,
    multiplier,
    note: "This energy estimate assumes an elastic catch and UNDERESTIMATES a hard snub on low-stretch rope or a metal-on-metal stop - treat it as a floor, not a ceiling. The fall factor (drop over rope length) is the lever: a short fall on a long, stretchy rope is gentle, a short rope with a long drop is brutal. The rigging point, sling, block, and device must all be rated for the peak, with their own safety factor on top.",
  };
}

function _v68renderTreeRiggingShock(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: arborist rigging dynamic-loading research (Detter / Rust / Donzelli) and ANSI Z133-2017 by name. peak = static x (1 + sqrt(1 + 2 x drop / rope stretch)). A floor estimate - a hard catch is worse.";
  const stat = makeNumber("Static weight of the piece (lb)", "trs-stat", { step: "any", min: "0" });
  const drop = makeNumber("Free-fall before the line tightens (ft)", "trs-drop", { step: "any", min: "0" });
  const rope = makeNumber("Rope in the system (ft)", "trs-rope", { step: "any", min: "0" });
  const elong = makeNumber("Rope elongation at load (%, dynamic ~5-20)", "trs-elong", { step: "any", min: "0", value: "5" });
  elong.input.value = "5";
  for (const f of [stat, drop, rope, elong]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { stat.input.value = "500"; drop.input.value = "3"; rope.input.value = "30"; elong.input.value = "5"; update(); });
  const oPeak = makeOutputLine(outputRegion, "Estimated peak load", "trs-out-peak");
  const oMult = makeOutputLine(outputRegion, "Dynamic multiplier over static", "trs-out-mult");
  const update = debounce(() => {
    const r = computeTreeRiggingShock({ static_weight_lb: Number(stat.input.value) || 0, drop_ft: Number(drop.input.value) || 0, rope_length_ft: Number(rope.input.value) || 0, elong_pct: elong.input.value === "" ? 5 : Number(elong.input.value) });
    if (r.error) { oPeak.textContent = r.error; oMult.textContent = "-"; return; }
    oPeak.textContent = fmt(r.peak_load_lb, 0) + " lb (rope stretch " + fmt(r.stretch_ft, 2) + " ft)";
    oMult.textContent = fmt(r.multiplier, 2) + "x";
  }, DEBOUNCE_MS);
  for (const f of [stat, drop, rope, elong]) f.input.addEventListener("input", update);
}
ARBORIST_RENDERERS["tree-rigging-shock"] = _v68renderTreeRiggingShock;

// --- felling-notch-hinge: Felling Notch and Hinge Geometry ---
//
// notch_depth = dia x notch_pct/100; hinge_thick = dia x 0.10; hinge_width =
// dia x 0.80.
// dims: in { cut_dia_in: L, notch_pct: dimensionless, open_face: dimensionless } out: { notch_depth_in: L, hinge_thick_in: L, hinge_width_in: L, open_face_deg: dimensionless }
// (The cut diameter and the notch / hinge dimensions are lengths L; the notch
//  percent and open-face angle are dimensionless.)
export function computeFellingNotchHinge({ cut_dia_in, notch_pct = 22, open_face = 70 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const dia = Number(cut_dia_in);
  const notchPct = Number(notch_pct);
  const openFace = Number(open_face);
  if (!Number.isFinite(dia) || dia <= 0) return { error: "Cut diameter must be a positive finite number (in)." };
  if (!Number.isFinite(notchPct) || notchPct <= 0 || notchPct >= 100) return { error: "Notch depth must be between 0 and 100 percent of diameter." };
  if (!Number.isFinite(openFace) || openFace <= 0) return { error: "Open-face angle must be a positive finite number (deg)." };
  const notchDepthIn = dia * notchPct / 100;
  const hingeThickIn = dia * 0.10;
  const hingeWidthIn = dia * 0.80;
  if (![notchDepthIn, hingeThickIn, hingeWidthIn].every(Number.isFinite)) return { error: "Notch math is not a finite value." };
  return {
    notch_depth_in: notchDepthIn,
    hinge_thick_in: hingeThickIn,
    hinge_width_in: hingeWidthIn,
    open_face_deg: openFace,
    note: "These are starting dimensions for a sound, straight-grained stem on level ground - lean, side-lean, rot, included bark, spring poles, and a nearby target all change the plan, and many fells are not a candidate for a simple open-face cut at all. The hinge holds and steers; it is never cut through, and a bore cut requires specific training. A defined retreat path and a qualified faller are required by Z133. A tree within striking distance of a structure or line is a rigging or crane removal, not a fell.",
  };
}

function _v68renderFellingNotchHinge(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ANSI Z133-2017 (Arboricultural Operations) open-face felling practice by name. notch depth ~20-25% of diameter, hinge thickness ~10%, hinge width ~80%, open face 70 deg or more. A qualified faller governs.";
  const dia = makeNumber("Diameter at the felling cut (in)", "fn-dia", { step: "any", min: "0" });
  const notchPct = makeNumber("Notch depth (% of diameter)", "fn-notch", { step: "any", min: "0", value: "22" });
  notchPct.input.value = "22";
  const openFace = makeNumber("Open-face angle target (deg)", "fn-of", { step: "any", min: "0", value: "70" });
  openFace.input.value = "70";
  for (const f of [dia, notchPct, openFace]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dia.input.value = "20"; notchPct.input.value = "22"; openFace.input.value = "70"; update(); });
  const oNotch = makeOutputLine(outputRegion, "Notch depth", "fn-out-notch");
  const oThick = makeOutputLine(outputRegion, "Hinge thickness", "fn-out-thick");
  const oWidth = makeOutputLine(outputRegion, "Hinge width", "fn-out-width");
  const oFace = makeOutputLine(outputRegion, "Open-face angle", "fn-out-face");
  const update = debounce(() => {
    const r = computeFellingNotchHinge({ cut_dia_in: Number(dia.input.value) || 0, notch_pct: notchPct.input.value === "" ? 22 : Number(notchPct.input.value), open_face: openFace.input.value === "" ? 70 : Number(openFace.input.value) });
    if (r.error) { oNotch.textContent = r.error; for (const o of [oThick, oWidth, oFace]) o.textContent = "-"; return; }
    oNotch.textContent = fmt(r.notch_depth_in, 2) + " in";
    oThick.textContent = fmt(r.hinge_thick_in, 2) + " in";
    oWidth.textContent = fmt(r.hinge_width_in, 2) + " in";
    oFace.textContent = fmt(r.open_face_deg, 0) + " deg or more";
  }, DEBOUNCE_MS);
  for (const f of [dia, notchPct, openFace]) f.input.addEventListener("input", update);
}
ARBORIST_RENDERERS["felling-notch-hinge"] = _v68renderFellingNotchHinge;

// --- porta-wrap-friction: Friction-Device Hold Force by Wrap Count ---
//
// hold(n) = load x exp(-mu x n x 2pi) (capstan / Euler-Eytelwein) over n = 1..4.
// dims: in { load_lb: M L T^-2, mu: dimensionless, wraps: dimensionless } out: { hold_1_lb: M L T^-2, hold_2_lb: M L T^-2, hold_3_lb: M L T^-2, hold_4_lb: M L T^-2, selected_hold_lb: M L T^-2 }
// (Load-side tension and the per-wrap hold forces are forces M L T^-2; the
//  friction coefficient and wrap count are dimensionless.)
export function computePortaWrapFriction({ load_lb, mu = 0.20, wraps = 3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const load = Number(load_lb);
  const m = Number(mu);
  const w = Number(wraps);
  if (!Number.isFinite(load) || load <= 0) return { error: "Load-side tension must be a positive finite number (lb)." };
  if (!Number.isFinite(m) || m <= 0) return { error: "Friction coefficient must be a positive finite number." };
  if (!Number.isFinite(w) || w <= 0) return { error: "Wrap count must be a positive finite number." };
  const hold = (n) => load * Math.exp(-m * n * 2 * Math.PI);
  const hold1 = hold(1), hold2 = hold(2), hold3 = hold(3), hold4 = hold(4);
  const selectedHold = hold(w);
  if (![hold1, hold2, hold3, hold4, selectedHold].every(Number.isFinite)) return { error: "Friction math is not a finite value." };
  return {
    hold_1_lb: hold1,
    hold_2_lb: hold2,
    hold_3_lb: hold3,
    hold_4_lb: hold4,
    selected_wraps: w,
    selected_hold_lb: selectedHold,
    load_lb: load,
    note: "More wraps means less hand force but a harder, slower release and more heat in the rope and device - too many wraps can lock and shock the system on a moving piece. The load side is the piece's dynamic tension under control, not just its static weight, so pair this with tree-rigging-shock. The friction coefficient depends on the device, rope, glaze, and moisture. A groundie keeps hands clear of the device and never wraps a hand in the tail.",
  };
}

function _v68renderPortaWrapFriction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: capstan / Euler-Eytelwein friction equation and ANSI Z133-2017 by name. hold force = load x exp(-mu x wraps x 2pi). The load side is the dynamic tension under control, not the static weight.";
  const load = makeNumber("Load-side tension (lb)", "pw-load", { step: "any", min: "0" });
  const mu = makeNumber("Rope-on-device friction coefficient", "pw-mu", { step: "any", min: "0", value: "0.20" });
  mu.input.value = "0.20";
  const wraps = makeNumber("Wraps to highlight", "pw-wraps", { step: "1", min: "0", value: "3" });
  wraps.input.value = "3";
  for (const f of [load, mu, wraps]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { load.input.value = "800"; mu.input.value = "0.20"; wraps.input.value = "3"; update(); });
  const o1 = makeOutputLine(outputRegion, "Hand force, 1 wrap", "pw-out-1");
  const o2 = makeOutputLine(outputRegion, "Hand force, 2 wraps", "pw-out-2");
  const o3 = makeOutputLine(outputRegion, "Hand force, 3 wraps", "pw-out-3");
  const o4 = makeOutputLine(outputRegion, "Hand force, 4 wraps", "pw-out-4");
  const oSel = makeOutputLine(outputRegion, "Selected wraps", "pw-out-sel");
  const update = debounce(() => {
    const r = computePortaWrapFriction({ load_lb: Number(load.input.value) || 0, mu: mu.input.value === "" ? 0.20 : Number(mu.input.value), wraps: wraps.input.value === "" ? 3 : Number(wraps.input.value) });
    if (r.error) { o1.textContent = r.error; for (const o of [o2, o3, o4, oSel]) o.textContent = "-"; return; }
    o1.textContent = fmt(r.hold_1_lb, 1) + " lb";
    o2.textContent = fmt(r.hold_2_lb, 1) + " lb";
    o3.textContent = fmt(r.hold_3_lb, 1) + " lb";
    o4.textContent = fmt(r.hold_4_lb, 1) + " lb";
    oSel.textContent = r.selected_wraps + " wraps -> " + fmt(r.selected_hold_lb, 1) + " lb hand force";
  }, DEBOUNCE_MS);
  for (const f of [load, mu, wraps]) f.input.addEventListener("input", update);
}
ARBORIST_RENDERERS["porta-wrap-friction"] = _v68renderPortaWrapFriction;

// --- chipper-debris: Brush Chip Volume and Haul Loads ---
//
// chip_volume = green_weight / chip_density; loads = ceil(chip_volume / box).
// dims: in { green_weight_lb: M L T^-2, chip_density_lcy: dimensionless, box_capacity_cy: L^3 } out: { chip_volume_lcy: L^3, loads: dimensionless }
// (Green weight is a force M L T^-2; the chip density converts it to a loose
//  volume L^3; the load count is dimensionless.)
export function computeChipperDebris({ green_weight_lb, chip_density_lcy = 550, box_capacity_cy } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const weight = Number(green_weight_lb);
  const density = Number(chip_density_lcy);
  const box = Number(box_capacity_cy);
  if (!Number.isFinite(weight) || weight <= 0) return { error: "Green weight must be a positive finite number (lb)." };
  if (!Number.isFinite(density) || density <= 0) return { error: "Chip density must be a positive finite number (lb/lcy)." };
  if (!Number.isFinite(box) || box <= 0) return { error: "Box capacity must be a positive finite number (lcy)." };
  const chipVolumeLcy = weight / density;
  const loads = Math.ceil(chipVolumeLcy / box);
  if (![chipVolumeLcy, loads].every(Number.isFinite)) return { error: "Chip math is not a finite value." };
  return {
    chip_volume_lcy: chipVolumeLcy,
    loads,
    note: "Bulk chip density swings with species, moisture, chip size, and how heaped the box is - 500 to 600 lb per loose cy is a typical green range and the scale ticket governs. Brush that is chipped is much denser than brush piled loose, so chip volume is far smaller than the brush pile it came from. Logs hauled as rounds are weight, not chip volume, and disposal or mulch reuse is a site decision.",
  };
}

function _v68renderChipperDebris(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: first-principles green-weight to loose-chip-volume conversion by name. chip volume = green weight / chip density; loads = ceil(chip volume / box). The scale ticket governs the density.";
  const weight = makeNumber("Green weight to chip (lb)", "cd-weight", { step: "any", min: "0" });
  const density = makeNumber("Chip bulk density (lb/loose cy)", "cd-dens", { step: "any", min: "0", value: "550" });
  density.input.value = "550";
  const box = makeNumber("Chip box / dump capacity (loose cy)", "cd-box", { step: "any", min: "0" });
  for (const f of [weight, density, box]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { weight.input.value = "4400"; density.input.value = "550"; box.input.value = "15"; update(); });
  const oVol = makeOutputLine(outputRegion, "Loose chip volume", "cd-out-vol");
  const oLoads = makeOutputLine(outputRegion, "Loads to haul", "cd-out-loads");
  const update = debounce(() => {
    const r = computeChipperDebris({ green_weight_lb: Number(weight.input.value) || 0, chip_density_lcy: density.input.value === "" ? 550 : Number(density.input.value), box_capacity_cy: Number(box.input.value) || 0 });
    if (r.error) { oVol.textContent = r.error; oLoads.textContent = "-"; return; }
    oVol.textContent = fmt(r.chip_volume_lcy, 1) + " loose cy";
    oLoads.textContent = r.loads + " loads";
  }, DEBOUNCE_MS);
  for (const f of [weight, density, box]) f.input.addEventListener("input", update);
}
ARBORIST_RENDERERS["chipper-debris"] = _v68renderChipperDebris;

// --- spec-v563 L: Basal area per acre, prism (variable-radius) cruise ---
// basal_area_per_acre = BAF x in_tree_count. per_tree_ba = 0.005454 x DBH^2. trees_per_acre = BAF / per_tree_ba.
// dims: in { baf: dimensionless, in_tree_count: dimensionless, dbh_in: L } out: { basal_area_per_acre: dimensionless, per_tree_ba: L^2, trees_per_acre: dimensionless }
export function computeBasalAreaPrism({ baf = 0, in_tree_count = 0, dbh_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const factor = Number(baf);
  const count = Number(in_tree_count);
  const dbh = Number(dbh_in);
  if (!Number.isFinite(factor) || factor <= 0) return { error: "Basal-area factor must be a positive finite number (ft^2/ac)." };
  if (!Number.isFinite(count) || count < 0) return { error: "In-tree count must be a non-negative finite number." };
  if (!Number.isFinite(dbh) || dbh <= 0) return { error: "DBH must be a positive finite number (in)." };
  const basal_area_per_acre = factor * count;
  const per_tree_ba = 0.005454 * dbh * dbh;
  const trees_per_acre = factor / per_tree_ba;
  if (![basal_area_per_acre, per_tree_ba, trees_per_acre].every(Number.isFinite)) return { error: "Basal-area math is not a finite value." };
  return {
    basal_area_per_acre, per_tree_ba, trees_per_acre,
    note: "The prism counts a tree by its angular size, not its distance - a big far tree and a small near tree both count 'in', and the basal area per acre is independent of any plot radius. Borderline trees must be checked with the limiting distance (the plot-radius factor times DBH); only 'in' trees count. A larger BAF counts fewer trees for the same stand, so it is chosen for a workable tally, not the answer. A field estimate; a qualified cruise and the forester govern.",
  };
}
export const basalAreaPrismExample = { inputs: { baf: 10, in_tree_count: 8, dbh_in: 14 } };

function _v563renderBasalAreaPrism(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: prism (variable-radius / angle-gauge) point sampling, per USDA Forest Service mensuration and Bitterlich variable-radius plots, by name. basal_area_per_acre = BAF x in-tree count; per-tree basal area = 0.005454 x DBH^2; trees per acre = BAF / per-tree BA. The prism counts by angular size, not distance; the basal area per acre is independent of plot radius. A field estimate; a qualified cruise and the forester govern.";
  const baf = makeNumber("Basal-area factor (BAF, ft^2/ac)", "bap-baf", { step: "any", min: "0", value: "10" }); baf.input.value = "10";
  const count = makeNumber("Trees counted 'in'", "bap-count", { step: "1", min: "0", value: "8" }); count.input.value = "8";
  const dbh = makeNumber("Tree DBH (in, for the expansion)", "bap-dbh", { step: "any", min: "0", value: "14" }); dbh.input.value = "14";
  for (const f of [baf, count, dbh]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { baf.input.value = "10"; count.input.value = "8"; dbh.input.value = "14"; update(); });
  const oBa = makeOutputLine(outputRegion, "Basal area per acre", "bap-out-ba");
  const oPt = makeOutputLine(outputRegion, "Per-tree basal area", "bap-out-pt");
  const oTpa = makeOutputLine(outputRegion, "Trees per acre (one in-tree)", "bap-out-tpa");
  const oNote = makeOutputLine(outputRegion, "Note", "bap-out-note");
  const update = debounce(() => {
    const r = computeBasalAreaPrism({ baf: Number(baf.input.value) || 0, in_tree_count: Number(count.input.value) || 0, dbh_in: Number(dbh.input.value) || 0 });
    if (r.error) { oBa.textContent = r.error; oPt.textContent = "-"; oTpa.textContent = "-"; oNote.textContent = ""; return; }
    oBa.textContent = fmt(r.basal_area_per_acre, 0) + " ft^2/ac";
    oPt.textContent = fmt(r.per_tree_ba, 3) + " ft^2";
    oTpa.textContent = fmt(r.trees_per_acre, 1) + " trees/ac";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [baf, count, dbh]) f.input.addEventListener("input", update);
}
ARBORIST_RENDERERS["basal-area-prism"] = _v563renderBasalAreaPrism;

// --- spec-v564 L: Reineke Stand Density Index ---
// SDI = TPA x (QMD/10)^1.605. percent_max = SDI / SDI_max x 100.
// dims: in { trees_per_acre: dimensionless, qmd_in: L, sdi_max: dimensionless } out: { sdi: dimensionless, percent_max: dimensionless }
export function computeReinekeSdi({ trees_per_acre = 0, qmd_in = 0, sdi_max = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const tpa = Number(trees_per_acre);
  const qmd = Number(qmd_in);
  const smax = Number(sdi_max) || 0;
  if (!Number.isFinite(tpa) || tpa <= 0) return { error: "Trees per acre must be a positive finite number." };
  if (!Number.isFinite(qmd) || qmd <= 0) return { error: "Quadratic mean diameter must be a positive finite number (in)." };
  const sdi = tpa * Math.pow(qmd / 10, 1.605);
  let percent_max = null;
  if (smax !== 0) {
    if (!(smax > 0)) return { error: "Maximum SDI must be positive when a percent is requested." };
    percent_max = sdi / smax * 100;
  }
  if (!Number.isFinite(sdi)) return { error: "SDI math is not a finite value." };
  const zone = percent_max == null ? null
    : percent_max >= 100 ? "self-thinning (mortality)"
    : percent_max >= 55 ? "upper management zone (thinning candidate)"
    : percent_max >= 35 ? "lower management zone"
    : "below the onset of competition";
  return {
    sdi, percent_max, zone,
    note: "SDI uses the QUADRATIC mean diameter (the diameter of the tree of average basal area, always >= the arithmetic mean), not a plain average, so using the arithmetic mean understates density and can leave a stand thinned too late. The 1.605 exponent is Reineke's empirical self-thinning slope. Zones: ~35% onset of competition, 55-60% lower management zone, ~100% self-thinning. The maximum SDI is species-specific. A management aid; a qualified silvicultural prescription governs.",
  };
}
export const reinekeSdiExample = { inputs: { trees_per_acre: 300, qmd_in: 10, sdi_max: 400 } };

function _v564renderReinekeSdi(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Reineke Stand Density Index (Reineke 1933; USDA FS RMRS), by name. SDI = TPA x (QMD/10)^1.605; percent of max = SDI / SDI_max x 100. SDI uses the quadratic mean diameter (the diameter of the tree of average basal area), not the arithmetic mean; the 1.605 exponent is the empirical self-thinning slope; the maximum SDI is species-specific. A management aid; a qualified silvicultural prescription governs.";
  const tpa = makeNumber("Trees per acre (live stems)", "sdi-tpa", { step: "any", min: "0", value: "300" }); tpa.input.value = "300";
  const qmd = makeNumber("Quadratic mean diameter (in)", "sdi-qmd", { step: "any", min: "0", value: "10" }); qmd.input.value = "10";
  const smax = makeNumber("Species maximum SDI (0 to skip)", "sdi-max", { step: "any", min: "0", value: "400" }); smax.input.value = "400";
  for (const f of [tpa, qmd, smax]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { tpa.input.value = "300"; qmd.input.value = "10"; smax.input.value = "400"; update(); });
  const oSdi = makeOutputLine(outputRegion, "Stand Density Index", "sdi-out-sdi");
  const oPct = makeOutputLine(outputRegion, "Percent of maximum / zone", "sdi-out-pct");
  const oNote = makeOutputLine(outputRegion, "Note", "sdi-out-note");
  const update = debounce(() => {
    const r = computeReinekeSdi({ trees_per_acre: Number(tpa.input.value) || 0, qmd_in: Number(qmd.input.value) || 0, sdi_max: Number(smax.input.value) || 0 });
    if (r.error) { oSdi.textContent = r.error; oPct.textContent = "-"; oNote.textContent = ""; return; }
    oSdi.textContent = fmt(r.sdi, 0);
    oPct.textContent = r.percent_max == null ? "(enter a maximum SDI)" : fmt(r.percent_max, 0) + "% -- " + r.zone;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [tpa, qmd, smax]) f.input.addEventListener("input", update);
}
ARBORIST_RENDERERS["reineke-sdi"] = _v564renderReinekeSdi;
