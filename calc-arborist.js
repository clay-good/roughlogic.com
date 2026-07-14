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
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeTextarea,
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

// --- spec-v619 L: Thinning target TPA from a target SDI ---
// SDI_target = SDI_max x pct/100; TPA_target = SDI_target / (QMD/10)^1.605; cut = max(0, current - target); BA = TPA x 0.005454 x QMD^2.
// dims: in { sdi_max: dimensionless, target_pct: dimensionless, qmd_in: L, current_tpa: dimensionless } out: { sdi_target: dimensionless, tpa_target: dimensionless, ba_target: dimensionless }
export function computeThinningTargetTpa({ sdi_max = 0, target_pct = 0, qmd_in = 0, current_tpa = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const smax = Number(sdi_max);
  const pct = Number(target_pct);
  const qmd = Number(qmd_in);
  const cur = Number(current_tpa) || 0;
  if (!Number.isFinite(smax) || smax <= 0) return { error: "Maximum SDI must be a positive finite number (species-specific)." };
  if (!Number.isFinite(pct) || !(pct > 0 && pct <= 100)) return { error: "Target percent of maximum SDI must be in (0, 100]." };
  if (!Number.isFinite(qmd) || qmd <= 0) return { error: "Quadratic mean diameter must be a positive finite number (in)." };
  if (cur < 0) return { error: "Current trees per acre cannot be negative (0 to skip the cut count)." };
  const sdi_target = smax * pct / 100;
  const tpa_target = sdi_target / Math.pow(qmd / 10, 1.605);
  const cut_tpa = cur > 0 ? Math.max(0, cur - tpa_target) : null;
  const ba_target = tpa_target * 0.005454 * qmd * qmd;
  return {
    sdi_target, tpa_target, cut_tpa, ba_target,
    note: "The inverse of reineke-sdi: the residual stand that puts the density at the target percent of the species maximum. The common management band runs ~35% (onset of competition) to ~55-60% (lower limit of the self-thinning zone). Thinning from below raises the QMD, so the residual lands conservatively below the target density. A management aid; a qualified silvicultural prescription governs.",
  };
}
export const thinningTargetTpaExample = { inputs: { sdi_max: 450, target_pct: 35, qmd_in: 10, current_tpa: 300 } };

function _v619renderThinningTargetTpa(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Reineke Stand Density Index (Reineke 1933; USDA FS stocking-guide practice), by name. SDI_target = SDI_max x target% / 100; TPA_target = SDI_target / (QMD/10)^1.605; cut = max(0, current - target); BA_target = TPA_target x 0.005454 x QMD^2. The maximum SDI is species-specific; the management band runs ~35% to ~55-60% of it. Thinning from below raises the QMD, so the residual lands conservatively below the target. A management aid; a qualified silvicultural prescription governs.";
  const smax = makeNumber("Species maximum SDI", "ttt-max", { step: "any", min: "0", value: "450" }); smax.input.value = "450";
  const pct = makeNumber("Target percent of maximum (%)", "ttt-pct", { step: "any", min: "0", max: "100", value: "35" }); pct.input.value = "35";
  const qmd = makeNumber("Quadratic mean diameter (in)", "ttt-qmd", { step: "any", min: "0" });
  const cur = makeNumber("Current trees per acre (0 to skip)", "ttt-cur", { step: "any", min: "0", value: "0" }); cur.input.value = "0";
  for (const f of [smax, pct, qmd, cur]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { smax.input.value = "450"; pct.input.value = "35"; qmd.input.value = "10"; cur.input.value = "300"; update(); });
  const oT = makeOutputLine(outputRegion, "Residual target", "ttt-out-t");
  const oC = makeOutputLine(outputRegion, "Trees to cut", "ttt-out-c");
  const oN = makeOutputLine(outputRegion, "Note", "ttt-out-n");
  const update = debounce(() => {
    const r = computeThinningTargetTpa({ sdi_max: Number(smax.input.value) || 0, target_pct: Number(pct.input.value) || 0, qmd_in: Number(qmd.input.value) || 0, current_tpa: Number(cur.input.value) || 0 });
    if (r.error) { oT.textContent = r.error; oC.textContent = "-"; oN.textContent = ""; return; }
    oT.textContent = fmt(r.tpa_target, 1) + " TPA at SDI " + fmt(r.sdi_target, 0) + " (" + fmt(r.ba_target, 1) + " ft2/acre basal area)";
    oC.textContent = r.cut_tpa == null ? "(enter the current TPA)" : fmt(r.cut_tpa, 1) + " TPA to cut";
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [smax, pct, qmd, cur]) f.input.addEventListener("input", update);
}
ARBORIST_RENDERERS["thinning-target-tpa"] = _v619renderThinningTargetTpa;

// --- spec-v598 L: Quadratic mean diameter from a DBH tally ---
// QMD = sqrt(sum(count*d^2)/sum(count)); amean = sum(count*d)/sum(count); BA = 0.005454*sum(count*d^2).
// dims: in { tally: dimensionless } out: { qmd_in: L, arithmetic_mean_in: L, tree_count: dimensionless, basal_area_ft2: dimensionless }
export function computeQuadraticMeanDiameter({ tally = "" } = {}) {
  const tokens = String(tally).split(/[\n,]+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return { error: "Enter a diameter tally: one token per tree (\"12\") or per class (\"12:40\")." };
  let n = 0, sum_sq = 0, sum_d = 0;
  for (const tok of tokens) {
    const m = tok.match(/^([0-9]*\.?[0-9]+)\s*(?:[x:*]\s*([0-9]+))?$/i);
    if (!m) return { error: "Bad tally token \"" + tok + "\" - use a diameter, or diameter:count (e.g. 12:40)." };
    const d = parseFloat(m[1]);
    const c = m[2] ? parseInt(m[2], 10) : 1;
    if (!(d > 0) || !Number.isFinite(d)) return { error: "Each diameter must be a positive number (in)." };
    if (!(c > 0)) return { error: "Each class count must be a positive whole number." };
    n += c; sum_sq += c * d * d; sum_d += c * d;
  }
  if (!(n > 0)) return { error: "The tally has no trees." };
  const qmd_in = Math.sqrt(sum_sq / n);
  const arithmetic_mean_in = sum_d / n;
  const basal_area_ft2 = 0.005454 * sum_sq;
  return {
    qmd_in, arithmetic_mean_in, tree_count: n, basal_area_ft2,
    note: "QMD is the diameter of the tree of average basal area, always at or above the arithmetic mean - feed it to reineke-sdi, not the plain average, or the density is understated and the stand thins too late. The total basal area (0.005454 x sum(count x diameter^2)) is for the tallied trees, not a per-acre expansion; a fixed- or variable-radius plot factor gives per-acre. The forester and the cruise design govern - a mensuration helper, not a cruise compilation.",
  };
}
export const quadraticMeanDiameterExample = { inputs: { tally: "8, 10, 10, 12, 14" } };
function _v598renderQuadraticMeanDiameter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: USDA Forest Service forest-mensuration practice (quadratic mean diameter), by name. QMD = sqrt( sum(count x diameter^2) / sum(count) ); tally token is a diameter (\"12\") or a class (\"12:40\" or \"12 x 40\"), separated by commas or new lines. QMD is the diameter of the tree of average basal area, always at or above the arithmetic mean - it is the number reineke-sdi requires. The total basal area is 0.005454 x sum(count x diameter^2) ft^2 for the tallied trees, not a per-acre expansion.";
  const tally = makeTextarea("DBH tally (one token per tree \"12\" or per class \"12:40\"; commas or new lines)", "qmd-tally", { rows: "4" });
  tally.input.placeholder = "8, 10, 10, 12, 14";
  tally.input.value = "8, 10, 10, 12, 14";
  inputRegion.appendChild(tally.wrap);
  attachExampleButton(inputRegion, () => { tally.input.value = "8, 10, 10, 12, 14"; update(); });
  const oQmd = makeOutputLine(outputRegion, "Quadratic mean diameter", "qmd-out-qmd");
  const oMean = makeOutputLine(outputRegion, "Arithmetic mean (for contrast)", "qmd-out-mean");
  const oN = makeOutputLine(outputRegion, "Trees tallied", "qmd-out-n");
  const oBa = makeOutputLine(outputRegion, "Total basal area (tallied trees)", "qmd-out-ba");
  const oNote = makeOutputLine(outputRegion, "Note", "qmd-out-note");
  const update = debounce(() => {
    const r = computeQuadraticMeanDiameter({ tally: tally.input.value });
    if (r.error) { oQmd.textContent = r.error; oMean.textContent = "-"; oN.textContent = "-"; oBa.textContent = "-"; oNote.textContent = ""; return; }
    oQmd.textContent = fmt(r.qmd_in, 2) + " in";
    oMean.textContent = fmt(r.arithmetic_mean_in, 2) + " in";
    oN.textContent = String(r.tree_count);
    oBa.textContent = fmt(r.basal_area_ft2, 2) + " ft^2";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  tally.input.addEventListener("input", update);
}
ARBORIST_RENDERERS["quadratic-mean-diameter"] = _v598renderQuadraticMeanDiameter;

// --- spec-v565 L: Hollow / decayed trunk strength loss (Wagener / Mattheck t/R) ---
// hollow_d = D - 2t. loss% = (hollow_d^3 / D^3) x 100. t/R = t / (D/2). concern when t/R < 0.30.
// dims: in { diameter_in: L, shell_thick_in: L } out: { hollow_d_in: L, loss_pct: dimensionless, t_over_r: dimensionless }
export function computeTrunkDecayStrength({ diameter_in = 0, shell_thick_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D = Number(diameter_in);
  const t = Number(shell_thick_in);
  if (!Number.isFinite(D) || D <= 0) return { error: "Trunk diameter must be a positive finite number (in)." };
  if (!Number.isFinite(t) || t <= 0) return { error: "Sound-shell thickness must be a positive finite number (in)." };
  if (t >= D / 2) return { error: "Sound shell is at least half the diameter - no hollow to assess." };
  const hollow_d_in = D - 2 * t;
  const loss_pct = (Math.pow(hollow_d_in, 3) / Math.pow(D, 3)) * 100;
  const t_over_r = t / (D / 2);
  const concern = t_over_r < 0.30;
  if (![hollow_d_in, loss_pct, t_over_r].every(Number.isFinite)) return { error: "Strength-loss math is not a finite value." };
  return {
    hollow_d_in, loss_pct, t_over_r, concern,
    note: "Strength loss goes as the CUBE of the hollow-to-diameter ratio, so a trunk can be about two-thirds hollow and keep most of its strength - the loss is small until the hollow is large, then rises sharply. The Mattheck t/R < 0.30 (sound shell below 30% of the radius) is the common concern trigger. An OPEN cavity (a slot, not a closed pipe) is far weaker than this closed-hollow estimate. A screen, not a load rating; a qualified arborist and an ISA TRAQ assessment govern.",
  };
}
export const trunkDecayStrengthExample = { inputs: { diameter_in: 24, shell_thick_in: 4 } };

function _v565renderTrunkDecayStrength(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: hollow-trunk strength-loss screen (Wagener 1963; Smiley & Fraedrich 1992; Mattheck & Breloer t/R; ISA TRAQ), by name. hollow_d = D - 2t; loss% = (hollow_d^3 / D^3) x 100; t/R = t / (D/2), with the Mattheck concern trigger at t/R < 0.30. Strength loss goes as the cube of the hollow ratio (small until the hollow is large); an open cavity is far weaker. A screen, not a load rating; a qualified arborist and a TRAQ assessment govern.";
  const D = makeNumber("Trunk diameter outside bark (in)", "tds-d", { step: "any", min: "0", value: "24" }); D.input.value = "24";
  const t = makeNumber("Sound-wood shell thickness (in, radial)", "tds-t", { step: "any", min: "0", value: "4" }); t.input.value = "4";
  for (const f of [D, t]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { D.input.value = "24"; t.input.value = "4"; update(); });
  const oLoss = makeOutputLine(outputRegion, "Strength loss (section modulus)", "tds-out-loss");
  const oTr = makeOutputLine(outputRegion, "t/R ratio", "tds-out-tr");
  const oConcern = makeOutputLine(outputRegion, "Mattheck concern?", "tds-out-concern");
  const oNote = makeOutputLine(outputRegion, "Note", "tds-out-note");
  const update = debounce(() => {
    const r = computeTrunkDecayStrength({ diameter_in: Number(D.input.value) || 0, shell_thick_in: Number(t.input.value) || 0 });
    if (r.error) { oLoss.textContent = r.error; oTr.textContent = "-"; oConcern.textContent = "-"; oNote.textContent = ""; return; }
    oLoss.textContent = fmt(r.loss_pct, 1) + "% (hollow " + fmt(r.hollow_d_in, 1) + " in)";
    oTr.textContent = fmt(r.t_over_r, 3);
    oConcern.textContent = r.concern ? "YES - t/R below 0.30, escalate to a full TRAQ assessment" : "no - t/R at or above 0.30 (still a screen only)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [D, t]) f.input.addEventListener("input", update);
}
ARBORIST_RENDERERS["trunk-decay-strength"] = _v565renderTrunkDecayStrength;

// --- spec-v730 L: Minimum sound-shell thickness for an allowable strength loss (inverse of trunk-decay-strength) ---
// The forward tile gives the strength loss from the shell thickness; the inverse recovers the minimum radial
// sound-wood shell thickness for a maximum acceptable loss. From loss% = ((D - 2t)/D)^3 x 100,
// (D - 2t)/D = (loss/100)^(1/3), so t = (D/2) x (1 - (loss/100)^(1/3)). The strength loss goes as the CUBE of the
// hollow ratio, so a small shell still holds a lot: about a third of the radius keeps most of the strength.
// dims: in { diameter_in: L, allow_loss_pct: dimensionless } out: { min_shell_in: L, min_t_over_r: dimensionless, hollow_d_in: L }
export function computeTrunkMinShellThickness({ diameter_in = 0, allow_loss_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D = Number(diameter_in);
  const loss = Number(allow_loss_pct);
  if (!Number.isFinite(D) || D <= 0) return { error: "Trunk diameter must be a positive finite number (in)." };
  if (!Number.isFinite(loss) || loss <= 0) return { error: "Allowable strength loss must be a positive finite percent." };
  if (loss >= 100) return { error: "Allowable strength loss must be below 100% (a 100% loss means no sound wood)." };
  const ratio = Math.pow(loss / 100, 1 / 3);
  const min_shell_in = (D / 2) * (1 - ratio);
  const hollow_d_in = D - 2 * min_shell_in;
  const min_t_over_r = min_shell_in / (D / 2);
  if (![min_shell_in, hollow_d_in, min_t_over_r].every(Number.isFinite)) return { error: "Shell-thickness math is not a finite value." };
  const below_mattheck = min_t_over_r < 0.30;
  const notes = [];
  notes.push("Minimum radial sound-wood shell for the allowable loss: t = (D/2) x (1 - (loss/100)^(1/3)), the inverse of loss% = ((D - 2t)/D)^3 x 100. Because strength loss goes as the CUBE of the hollow ratio, a thin shell still holds most of the strength - so the minimum shell for a given loss is small, and a modest measured shell often passes.");
  if (below_mattheck) notes.push("This minimum shell is below the Mattheck t/R = 0.30 concern trigger, so accepting this much loss also means accepting a t/R the common screen would flag - escalate to a full TRAQ assessment.");
  else notes.push("This minimum shell is at or above the Mattheck t/R = 0.30 trigger, so the allowable loss keeps the shell within the common screen.");
  notes.push("An OPEN cavity (a slot, not a closed pipe) is far weaker than this closed-hollow estimate. A screen, not a load rating; a qualified arborist and an ISA TRAQ assessment govern.");
  return { min_shell_in, min_t_over_r, hollow_d_in, below_mattheck, notes };
}
export const trunkMinShellThicknessExample = { inputs: { diameter_in: 24, allow_loss_pct: 29.6 } };

function _v730renderTrunkMinShellThickness(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: hollow-trunk strength-loss screen (Wagener 1963; Smiley & Fraedrich 1992; Mattheck & Breloer t/R; ISA TRAQ), by name, solved for the shell: t = (D/2) x (1 - (loss/100)^(1/3)), the inverse of loss% = ((D - 2t)/D)^3 x 100, with the Mattheck concern trigger at t/R < 0.30. Strength loss goes as the cube of the hollow ratio; an open cavity is far weaker. A screen, not a load rating; a qualified arborist and a TRAQ assessment govern.";
  const D = makeNumber("Trunk diameter outside bark (in)", "tms-d", { step: "any", min: "0", value: "24" }); D.input.value = "24";
  const loss = makeNumber("Allowable strength loss (%)", "tms-loss", { step: "any", min: "0", value: "29.6" }); loss.input.value = "29.6";
  for (const f of [D, loss]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { D.input.value = "24"; loss.input.value = "29.6"; update(); });
  const oShell = makeOutputLine(outputRegion, "Minimum sound-shell thickness", "tms-out-shell");
  const oTr = makeOutputLine(outputRegion, "t/R at that shell", "tms-out-tr");
  const oNote = makeOutputLine(outputRegion, "Note", "tms-out-note");
  const update = debounce(() => {
    const r = computeTrunkMinShellThickness({ diameter_in: Number(D.input.value) || 0, allow_loss_pct: Number(loss.input.value) || 0 });
    if (r.error) { oShell.textContent = r.error; oTr.textContent = "-"; oNote.textContent = ""; return; }
    oShell.textContent = fmt(r.min_shell_in, 2) + " in (hollow " + fmt(r.hollow_d_in, 1) + " in)";
    oTr.textContent = fmt(r.min_t_over_r, 3) + (r.below_mattheck ? " (below Mattheck 0.30)" : " (at/above Mattheck 0.30)");
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [D, loss]) f.input.addEventListener("input", update);
}
ARBORIST_RENDERERS["trunk-min-shell-thickness"] = _v730renderTrunkMinShellThickness;

// --- spec-v607 L: Open-cavity trunk strength loss (Smiley & Fraedrich 1992) ---
// hollow_d = D - 2t. R = min(1, opening/(pi*D)). open_loss = (hollow_d^3 + R*(D^3 - hollow_d^3))/D^3 * 100. Collapses to Wagener at R=0.
// dims: in { diameter_in: L, shell_thick_in: L, opening_width_in: L } out: { hollow_d_in: L, opening_ratio: dimensionless, closed_loss_pct: dimensionless, open_loss_pct: dimensionless, opening_penalty_pct: dimensionless }
export function computeTreeOpenCavity({ diameter_in = 0, shell_thick_in = 0, opening_width_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D = Number(diameter_in);
  const t = Number(shell_thick_in);
  const opening = Number(opening_width_in);
  if (!Number.isFinite(D) || D <= 0) return { error: "Trunk diameter must be a positive finite number (in)." };
  if (!Number.isFinite(t) || t <= 0) return { error: "Sound-shell thickness must be a positive finite number (in)." };
  if (t >= D / 2) return { error: "Sound shell is at least half the diameter - no hollow to assess." };
  if (!Number.isFinite(opening) || opening < 0) return { error: "Cavity opening width cannot be negative (in)." };
  const hollow_d_in = D - 2 * t;
  const circumference_in = Math.PI * D;
  const opening_ratio = Math.min(1, opening / circumference_in);
  const closed_loss_pct = (Math.pow(hollow_d_in, 3) / Math.pow(D, 3)) * 100;
  const open_loss_pct = ((Math.pow(hollow_d_in, 3) + opening_ratio * (Math.pow(D, 3) - Math.pow(hollow_d_in, 3))) / Math.pow(D, 3)) * 100;
  const opening_penalty_pct = open_loss_pct - closed_loss_pct;
  const over_concern = open_loss_pct >= 33;
  if (![hollow_d_in, opening_ratio, closed_loss_pct, open_loss_pct].every(Number.isFinite)) return { error: "Open-cavity math is not a finite value." };
  return {
    hollow_d_in, circumference_in, opening_ratio, closed_loss_pct, open_loss_pct, opening_penalty_pct, over_concern,
    note: "R is the cavity opening's arc as a fraction of the circumference - an open face makes the ring a broken tube, far weaker than a closed hollow. The formula collapses to Wagener's cube law when the opening closes. It can underestimate a large cavity with a deep wedge and a thick sound wall, so use it with caution there. The ISA 33% strength-loss guide is a common concern trigger, not a failure prediction. A qualified arborist and an ISA TRAQ assessment govern - a screen, not a load rating.",
  };
}
export const treeOpenCavityExample = { inputs: { diameter_in: 24, shell_thick_in: 3, opening_width_in: 8 } };
function _v607renderTreeOpenCavity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Smiley & Fraedrich (1992) open-cavity strength-loss formula, by name. hollow_d = diameter - 2 x shell_thick; R = min(1, opening_width / (pi x diameter)); closed_loss = (hollow_d^3 / diameter^3) x 100 (Wagener closed hollow); open_loss = (hollow_d^3 + R x (diameter^3 - hollow_d^3)) / diameter^3 x 100. An open face makes the ring a broken tube, far weaker than a closed hollow; the formula collapses to Wagener at R = 0. The ISA 33% guide is a concern trigger, not a failure prediction.";
  const D = makeNumber("Trunk diameter (in, inside bark)", "toc-d", { step: "any", min: "0", value: "24" }); D.input.value = "24";
  const t = makeNumber("Sound-shell (wall) thickness (in)", "toc-t", { step: "any", min: "0", value: "3" }); t.input.value = "3";
  const opening = makeNumber("Open cavity face width (in, 0 = closed hollow)", "toc-o", { step: "any", min: "0", value: "8" }); opening.input.value = "8";
  for (const f of [D, t, opening]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { D.input.value = "24"; t.input.value = "3"; opening.input.value = "8"; update(); });
  const oOpen = makeOutputLine(outputRegion, "Open-cavity strength loss", "toc-out-open");
  const oClosed = makeOutputLine(outputRegion, "Closed-hollow loss (Wagener)", "toc-out-closed");
  const oPenalty = makeOutputLine(outputRegion, "Penalty for the opening", "toc-out-penalty");
  const oNote = makeOutputLine(outputRegion, "Note", "toc-out-note");
  const update = debounce(() => {
    const r = computeTreeOpenCavity({ diameter_in: Number(D.input.value) || 0, shell_thick_in: Number(t.input.value) || 0, opening_width_in: Number(opening.input.value) || 0 });
    if (r.error) { oOpen.textContent = r.error; oClosed.textContent = "-"; oPenalty.textContent = "-"; oNote.textContent = ""; return; }
    oOpen.textContent = fmt(r.open_loss_pct, 1) + "%" + (r.over_concern ? " - at or past the ISA 33% concern line" : "");
    oClosed.textContent = fmt(r.closed_loss_pct, 1) + "% (R = " + fmt(r.opening_ratio, 3) + ")";
    oPenalty.textContent = "+" + fmt(r.opening_penalty_pct, 1) + " points from the opening";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [D, t, opening]) f.input.addEventListener("input", update);
}
ARBORIST_RENDERERS["tree-open-cavity"] = _v607renderTreeOpenCavity;

// --- spec-v566 L: Tree protection zone / critical root zone (ANSI A300 Part 5) ---
// radius = radius_factor x DBH. area = pi x radius^2.
// dims: in { dbh_in: L, radius_factor: dimensionless } out: { radius_ft: L, area_ft2: L^2 }
export function computeTreeProtectionZone({ dbh_in = 0, radius_factor = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const dbh = Number(dbh_in);
  const factor = Number(radius_factor);
  if (!Number.isFinite(dbh) || dbh <= 0) return { error: "DBH must be a positive finite number (in)." };
  if (!Number.isFinite(factor) || factor <= 0) return { error: "Radius factor must be a positive finite number (ft/in)." };
  const radius_ft = factor * dbh;
  const area_ft2 = Math.PI * radius_ft * radius_ft;
  if (![radius_ft, area_ft2].every(Number.isFinite)) return { error: "Protection-zone math is not a finite value." };
  return {
    radius_ft, area_ft2,
    note: "The zone is set by trunk diameter, not the canopy dripline - a narrow-crowned tree still needs the full radius, so sizing the fence to the visible canopy under-protects the roots. The standard is 1.0 ft of radius per inch of DBH, with a conservative 1.5 ft/in for mature or sensitive trees. Protection is cumulative over the whole circle: fencing plus no grade change, no compaction, and no trenching, to the protected soil depth. A qualified arborist and the local ordinance govern.",
  };
}
export const treeProtectionZoneExample = { inputs: { dbh_in: 20, radius_factor: 1.0 } };

function _v566renderTreeProtectionZone(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: tree protection zone / critical root zone (ANSI A300 Part 5; ISA critical root zone), by name. radius = radius_factor x DBH; area = pi x radius^2. Factors: 1.0 ft per in of DBH (standard), 1.5 ft per in (conservative / mature). The zone is set by the trunk, not the canopy dripline; protection is cumulative (fence plus no grade change, compaction, or trenching). A qualified arborist and the local ordinance govern.";
  const dbh = makeNumber("DBH (in)", "tpz-dbh", { step: "any", min: "0", value: "20" }); dbh.input.value = "20";
  const factor = makeSelect("Radius factor", "tpz-factor", [
    { value: "1.0", label: "1.0 ft/in (standard)", selected: true },
    { value: "1.5", label: "1.5 ft/in (conservative / mature)" },
  ]);
  for (const f of [dbh, factor]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dbh.input.value = "20"; factor.select.value = "1.0"; update(); });
  const oRad = makeOutputLine(outputRegion, "Protection radius", "tpz-out-rad");
  const oArea = makeOutputLine(outputRegion, "Fenced area", "tpz-out-area");
  const oNote = makeOutputLine(outputRegion, "Note", "tpz-out-note");
  const update = debounce(() => {
    const r = computeTreeProtectionZone({ dbh_in: Number(dbh.input.value) || 0, radius_factor: Number(factor.select.value) || 0 });
    if (r.error) { oRad.textContent = r.error; oArea.textContent = "-"; oNote.textContent = ""; return; }
    oRad.textContent = fmt(r.radius_ft, 1) + " ft (from the trunk)";
    oArea.textContent = fmt(r.area_ft2, 0) + " ft^2";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  dbh.input.addEventListener("input", update);
  factor.select.addEventListener("change", update);
}
ARBORIST_RENDERERS["tree-protection-zone"] = _v566renderTreeProtectionZone;

// --- spec-v608 L: Critical root zone encroachment percent (ANSI A300 Part 5) ---
// radius = factor*dbh. segment = R^2*acos(d/R) - d*sqrt(R^2-d^2). encroach = segment/(pi*R^2)*100. thresholds tolerant 40 / intermediate 30 / sensitive 20.
const _V608_TOLERANCE = { tolerant: 40, intermediate: 30, sensitive: 20 };
// dims: in { dbh_in: L, radius_factor: dimensionless, limit_distance_ft: L, species_tolerance: dimensionless } out: { radius_ft: L, encroach_pct: dimensionless, threshold_pct: dimensionless }
export function computeTreeCrzEncroachment({ dbh_in = 0, radius_factor = 1.0, limit_distance_ft = 0, species_tolerance = "intermediate" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const dbh = Number(dbh_in);
  const factor = Number(radius_factor);
  const d = Number(limit_distance_ft);
  if (!Number.isFinite(dbh) || dbh <= 0) return { error: "DBH must be a positive finite number (in)." };
  if (!Number.isFinite(factor) || factor <= 0) return { error: "Radius factor must be a positive finite number (ft/in)." };
  if (!Number.isFinite(d) || d < 0) return { error: "Limit-line distance cannot be negative (ft)." };
  const threshold_pct = _V608_TOLERANCE[species_tolerance];
  if (threshold_pct === undefined) return { error: "Species tolerance must be tolerant, intermediate, or sensitive." };
  const radius_ft = factor * dbh;
  const area_ft2 = Math.PI * radius_ft * radius_ft;
  let segment_ft2 = 0;
  let encroach_pct = 0;
  if (d < radius_ft) {
    segment_ft2 = radius_ft * radius_ft * Math.acos(d / radius_ft) - d * Math.sqrt(radius_ft * radius_ft - d * d);
    encroach_pct = segment_ft2 / area_ft2 * 100;
  }
  const over_tolerance = encroach_pct > threshold_pct;
  if (![radius_ft, encroach_pct].every(Number.isFinite)) return { error: "Encroachment math is not a finite value." };
  return {
    radius_ft, area_ft2, segment_ft2, encroach_pct, threshold_pct, over_tolerance,
    note: "The encroachment is the CRZ area beyond a single straight construction limit line - a real footprint may cut more than one side and the impacts are cumulative. The CRZ radius is set by trunk diameter, not the canopy. The species threshold (tolerant ~40%, intermediate ~30%, sensitive ~20%, Matheny & Clark tolerance ratings) is a guide, not a guarantee. A qualified arborist and the local ordinance govern - a planning screen, not a tree-preservation permit.",
  };
}
export const treeCrzEncroachmentExample = { inputs: { dbh_in: 20, radius_factor: 1.0, limit_distance_ft: 5, species_tolerance: "intermediate" } };
function _v608renderTreeCrzEncroachment(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: critical root zone encroachment (ANSI A300 Part 5 tree protection; arboriculture practice), by name. radius = radius_factor x DBH; the construction limit line at distance d cuts a segment R^2 x acos(d/R) - d x sqrt(R^2 - d^2); encroach = segment / (pi x R^2) x 100. Species thresholds (Matheny & Clark tolerance): tolerant ~40%, intermediate ~30%, sensitive ~20%. The encroachment is for a single straight limit line; a real footprint may cut more than one side and the impacts are cumulative. The CRZ is set by the trunk, not the canopy.";
  const dbh = makeNumber("DBH (in)", "tce-dbh", { step: "any", min: "0", value: "20" }); dbh.input.value = "20";
  const factor = makeSelect("Radius factor", "tce-factor", [
    { value: "1.0", label: "1.0 ft/in (standard)", selected: true },
    { value: "1.5", label: "1.5 ft/in (conservative / mature)" },
  ]);
  const dist = makeNumber("Construction limit-line distance from trunk (ft)", "tce-dist", { step: "any", min: "0", value: "5" }); dist.input.value = "5";
  const species = makeSelect("Species tolerance", "tce-species", [
    { value: "tolerant", label: "Tolerant (~40%)" },
    { value: "intermediate", label: "Intermediate (~30%)", selected: true },
    { value: "sensitive", label: "Sensitive (~20%)" },
  ]);
  inputRegion.appendChild(dbh.wrap);
  inputRegion.appendChild(factor.wrap);
  inputRegion.appendChild(dist.wrap);
  inputRegion.appendChild(species.wrap);
  attachExampleButton(inputRegion, () => { dbh.input.value = "20"; factor.select.value = "1.0"; dist.input.value = "5"; species.select.value = "intermediate"; update(); });
  const oEnc = makeOutputLine(outputRegion, "CRZ encroachment", "tce-out-enc");
  const oRad = makeOutputLine(outputRegion, "Protection radius", "tce-out-rad");
  const oVerdict = makeOutputLine(outputRegion, "Against species tolerance", "tce-out-verdict");
  const oNote = makeOutputLine(outputRegion, "Note", "tce-out-note");
  const update = debounce(() => {
    const r = computeTreeCrzEncroachment({ dbh_in: Number(dbh.input.value) || 0, radius_factor: Number(factor.select.value) || 0, limit_distance_ft: Number(dist.input.value) || 0, species_tolerance: species.select.value });
    if (r.error) { oEnc.textContent = r.error; oRad.textContent = "-"; oVerdict.textContent = "-"; oNote.textContent = ""; return; }
    oEnc.textContent = fmt(r.encroach_pct, 1) + "%";
    oRad.textContent = fmt(r.radius_ft, 1) + " ft (from the trunk)";
    oVerdict.textContent = r.over_tolerance ? "OVER the " + fmt(r.threshold_pct, 0) + "% threshold - decline / removal risk" : "within the " + fmt(r.threshold_pct, 0) + "% threshold";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [dbh.input, dist.input]) el.addEventListener("input", update);
  for (const s of [factor.select, species.select]) s.addEventListener("change", update);
}
ARBORIST_RENDERERS["tree-crz-encroachment"] = _v608renderTreeCrzEncroachment;

// --- spec-v567 L: Live crown removal limit / pruning dose (ANSI A300 Part 1) ---
// removal_pct = removed / live x 100. cap: mature 25, young 15, over-mature 10, stressed 0.
const _CROWN_CAP_PCT = { young: 15, mature: 25, "over-mature": 10, stressed: 0 };
// dims: in { live_foliage: dimensionless, removed_foliage: dimensionless, maturity_class: dimensionless } out: { removal_pct: dimensionless, cap_pct: dimensionless }
export function computeCrownPruningDose({ live_foliage = 0, removed_foliage = 0, maturity_class = "mature" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const live = Number(live_foliage);
  const removed = Number(removed_foliage);
  if (!Number.isFinite(live) || live <= 0) return { error: "Live foliage must be a positive finite number." };
  if (!Number.isFinite(removed) || removed < 0) return { error: "Removed foliage must be a non-negative finite number." };
  if (!(maturity_class in _CROWN_CAP_PCT)) return { error: "Maturity class must be young, mature, over-mature, or stressed." };
  const removal_pct = removed / live * 100;
  const cap_pct = _CROWN_CAP_PCT[maturity_class];
  const within = removal_pct <= cap_pct;
  if (!Number.isFinite(removal_pct)) return { error: "Pruning-dose math is not a finite value." };
  return {
    removal_pct, cap_pct, within, maturity_class,
    note: "The 25% ceiling is the mature-tree maximum in a single season, NOT a target, and it drops for young (~15%), over-mature (~10%), or stressed (0%) trees - a stressed tree should not have live foliage removed until it recovers. Lion's-tailing (stripping interior foliage and leaving tufts at the branch ends) violates ANSI A300 even when the total removed is under the percent cap. Removing too much live foliage starves the tree. A planning aid; a qualified arborist governs.",
  };
}
export const crownPruningDoseExample = { inputs: { live_foliage: 100, removed_foliage: 15, maturity_class: "mature" } };

function _v567renderCrownPruningDose(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ANSI A300 Part 1 live-crown removal limit (ISA Best Management Practices), by name. removal_pct = removed / live x 100, compared to the class cap: mature <= 25% in a single season, young ~15%, over-mature ~10%, stressed 0%. The 25% is the mature maximum, not a target; lion's-tailing violates A300 even under the percent cap. A planning aid; a qualified arborist governs.";
  const live = makeNumber("Live crown / foliage before pruning (ft^2 or %)", "cpd-live", { step: "any", min: "0", value: "100" }); live.input.value = "100";
  const removed = makeNumber("Foliage proposed for removal (same units)", "cpd-removed", { step: "any", min: "0", value: "15" }); removed.input.value = "15";
  const cls = makeSelect("Maturity class", "cpd-cls", [
    { value: "young", label: "Young (~15% cap)" },
    { value: "mature", label: "Mature (25% cap)", selected: true },
    { value: "over-mature", label: "Over-mature (~10% cap)" },
    { value: "stressed", label: "Stressed (0% cap)" },
  ]);
  for (const f of [live, removed, cls]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { live.input.value = "100"; removed.input.value = "15"; cls.select.value = "mature"; update(); });
  const oPct = makeOutputLine(outputRegion, "Removal percent", "cpd-out-pct");
  const oCap = makeOutputLine(outputRegion, "Class cap / within standard?", "cpd-out-cap");
  const oNote = makeOutputLine(outputRegion, "Note", "cpd-out-note");
  const update = debounce(() => {
    const r = computeCrownPruningDose({ live_foliage: Number(live.input.value) || 0, removed_foliage: Number(removed.input.value) || 0, maturity_class: cls.select.value });
    if (r.error) { oPct.textContent = r.error; oCap.textContent = "-"; oNote.textContent = ""; return; }
    oPct.textContent = fmt(r.removal_pct, 1) + "%";
    oCap.textContent = "cap " + fmt(r.cap_pct, 0) + "% -- " + (r.within ? "WITHIN the standard" : "OVER the limit; reduce the removal or defer");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [live, removed]) f.input.addEventListener("input", update);
  cls.select.addEventListener("change", update);
}
ARBORIST_RENDERERS["crown-pruning-dose"] = _v567renderCrownPruningDose;

// --- v772: Clinometer / percent-slope tree height (`tree-height-clinometer`) ---
// From a horizontal distance D and two SIGNED percent-slope readings (+ above
// eye level, - below), tree height H = D x (top% - base%)/100. The base reading
// is negative when the tree base is below the observer's eye (add its height).
// dims: in { horizontal_distance_ft: L, top_reading_pct: dimensionless, base_reading_pct: dimensionless } out: { tree_height_ft: L, above_eye_ft: L, below_eye_ft: L }
export function computeTreeHeightClinometer({ horizontal_distance_ft = 0, top_reading_pct = 0, base_reading_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D = Number(horizontal_distance_ft) || 0;
  if (!(D > 0)) return { error: "Horizontal distance to the tree must be positive (ft)." };
  const top = Number(top_reading_pct);
  const base = Number(base_reading_pct);
  if (!Number.isFinite(top) || !Number.isFinite(base)) return { error: "Readings must be numbers (percent slope; + above eye, - below)." };
  if (!(top > base)) return { error: "The top reading must be greater than the base reading (the top of the tree is higher than its base)." };
  const above_eye_ft = (D * top) / 100;
  const below_eye_ft = (D * base) / 100;
  const tree_height_ft = above_eye_ft - below_eye_ft;
  return {
    tree_height_ft, above_eye_ft, below_eye_ft,
    note: "Tree height from a clinometer's percent scale: standing a measured HORIZONTAL distance D from the trunk, read the percent slope to the top and to the base, both signed (+ above eye level, - below). Height = D x (top% - base%)/100. When the base is below your eye (looking down the trunk) the base reading is negative and its height adds; when the base is uphill above your eye the reading is positive and subtracts. Percent = 100 x tan(angle), so a degree-scale reading of a deg converts to 100 tan(a). Assumes the top sighted is directly above the base and D is the true horizontal distance (on a slope, use the horizontal component). A field estimate; lean, a hidden top, and off-vertical stems add error.",
  };
}
export const treeHeightClinometerExample = { inputs: { horizontal_distance_ft: 100, top_reading_pct: 58, base_reading_pct: -4 } };

function renderTreeHeightClinometer(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: clinometer / percent-slope tree height H = D x (top% - base%)/100, both readings signed (+ above eye level, - below), standard USDA Forest Service mensuration / hypsometry, by name. Percent = 100 x tan(angle) for a degree-scale instrument. Assumes the top is above the base and D is the true horizontal distance. A field estimate; lean and a hidden top add error.";
  const d = makeNumber("Horizontal distance to trunk (ft)", "thc-d", { step: "any", min: "0", value: "100" });
  d.input.value = "100";
  const top = makeNumber("Top reading (% slope, + above eye)", "thc-top", { step: "any", value: "58" });
  top.input.value = "58";
  const base = makeNumber("Base reading (% slope, - below eye)", "thc-base", { step: "any", value: "-4" });
  base.input.value = "-4";
  for (const f of [d, top, base]) inputRegion.appendChild(f.wrap);
  const oH = makeOutputLine(outputRegion, "Tree height", "thc-out-h");
  const oA = makeOutputLine(outputRegion, "Height above eye level", "thc-out-a");
  const oB = makeOutputLine(outputRegion, "Base offset from eye level", "thc-out-b");
  const oNote = makeOutputLine(outputRegion, "Note", "thc-out-note");
  const update = debounce(() => {
    const r = computeTreeHeightClinometer({ horizontal_distance_ft: Number(d.input.value) || 0, top_reading_pct: Number(top.input.value) || 0, base_reading_pct: Number(base.input.value) || 0 });
    if (r.error) { oH.textContent = r.error; oA.textContent = "-"; oB.textContent = "-"; oNote.textContent = ""; return; }
    oH.textContent = fmt(r.tree_height_ft, 1) + " ft";
    oA.textContent = fmt(r.above_eye_ft, 1) + " ft";
    oB.textContent = fmt(r.below_eye_ft, 1) + " ft" + (r.below_eye_ft < 0 ? " (base below eye)" : r.below_eye_ft > 0 ? " (base above eye)" : "");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { d.input.value = "100"; top.input.value = "58"; base.input.value = "-4"; update(); });
  for (const f of [d, top, base]) f.input.addEventListener("input", update);
}
ARBORIST_RENDERERS["tree-height-clinometer"] = renderTreeHeightClinometer;
