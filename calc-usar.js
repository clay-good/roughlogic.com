// calc-usar.js -- Groups E, Z, and G: collapse shoring and rescue support.
//
// Band 3 of the disaster response and recovery program
// (specs/scope-disaster-response.md), specs v1897 through v1903:
//   v1897 collapse-floor-load            (E)  v1901 picket-anchor-soil          (Z)
//   v1898 usr-vertical-shore-capacity    (E)  v1902 osha-timber-trench-shoring  (E)
//   v1899 usr-crib-capacity              (E)  v1903 relief-storage-floor-load   (G)
//   v1900 usr-raker-shore                (E)
//
// A module is independent of the group letter (the v28/v70..v103 split
// precedent): five tiles take group "E" (Carpentry and Construction), the
// picket anchor takes "Z" (Rigging and Heavy Lift), and the relief storage
// floor screen takes "G" (Cross-Trade Utilities).
//
// US sources only. The US&R methods are the USACE US&R Shoring Operations
// Guide (Ed. 5.0, October 2021), the USACE US&R Structures Specialist Field
// Operations Guide (2006), and the DHS/FEMA field guides, cited by figure.
// OSHA 29 CFR 1926 Subpart P Appendix C is federal regulation in the public
// domain; its six timber tables are transcribed below and were checked cell by
// cell against the official GovInfo CFR scan and the osha.gov HTML copy. The
// ASCE 7 / IBC live-load tables are copyrighted and are USER INPUTS, cited by
// number only.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
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
      const field = f.kind === "select"
        ? makeSelect(f.label, f.id || f.key, f.options)
        : makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) field[f.kind === "select" ? "select" : "input"].value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function update() {
      const params = {};
      for (const f of spec.fields) {
        const el = fields[f.key][f.kind === "select" ? "select" : "input"];
        params[f.key] = f.kind === "select" ? el.value : Number(el.value) || 0;
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
    for (const f of spec.fields) {
      fields[f.key][f.kind === "select" ? "select" : "input"].addEventListener("input", debounced);
    }
    attachExampleButton(inputRegion, () => {
      for (const f of spec.fields) {
        if (spec.example[f.key] !== undefined) fields[f.key][f.kind === "select" ? "select" : "input"].value = String(spec.example[f.key]);
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

export const USAR_RENDERERS = {};

// Species and grade factors on a whole shore or crib (US&R SOG 2021): No. 1
// Douglas Fir is the basis; Southern Yellow Pine, Hem-Fir, and
// Spruce-Pine-Fir take 85%; Eastern softwoods, Western cedar, and Western
// woods take 75%.
const _SPECIES_FACTOR = { df: 1, syp_hf_spf: 0.85, eastern_western: 0.75 };
const _SPECIES_OPTIONS = [
  { value: "df", label: "No. 1 Douglas Fir or better (1.00)" },
  { value: "syp_hf_spf", label: "Southern Yellow Pine, Hem-Fir, Spruce-Pine-Fir (0.85)" },
  { value: "eastern_western", label: "Eastern softwoods, Western cedar, Western woods (0.75)" },
];
const _AFTERSHOCK_OPTIONS = [
  { value: "yes", label: "Yes -- aftershocks possible" },
  { value: "no", label: "No" },
];
const _SQIN_PER_SQFT = 144;

// ===================== spec-v1897: collapsed or damaged floor load for shoring =====================

// Floor self-weights from the SOG "Design Dead Loads for Building Materials":
// normal-weight concrete 150 pcf = 12.5 psf per inch; wood floors 10 psf bare
// and 25 psf with 1.5 in concrete fill; steel deck with concrete fill 50 to
// 70 psf (the upper value is used); 8 in precast hollow plank 60 psf.
const _FLOOR_PSF = { wood_bare: 10, wood_topped: 25, steel_deck: 70, precast_plank: 60 };
const _CONCRETE_PSF_PER_IN = 150 / 12;
const _RUBBLE_PSF_PER_IN = 10;

// dims: in { floor_type: dimensionless, slab_thickness_in: L, floor_self_weight_psf: M L^-1 T^-2, rubble_depth_in: L, contents_psf: M L^-1 T^-2, partitions_psf: M L^-1 T^-2, rescuer_psf: M L^-1 T^-2, floors_bearing: dimensionless, shore_spacing_ft: L, tributary_width_ft: L, posts_per_shore: dimensionless } out: { floor_psf: M L^-1 T^-2, rubble_psf: M L^-1 T^-2, total_psf: M L^-1 T^-2, tributary_area_sqft: L^2, load_per_shore_lb: M L T^-2, load_per_post_lb: M L T^-2, rubble_share_pct: dimensionless }
export function computeCollapseFloorLoad({ floor_type = "concrete", slab_thickness_in = 6, floor_self_weight_psf = 0, rubble_depth_in = 0, contents_psf = 0, partitions_psf = 0, rescuer_psf = 15, floors_bearing = 1, shore_spacing_ft = 8, tributary_width_ft = 4, posts_per_shore = 3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!["concrete", "wood_bare", "wood_topped", "steel_deck", "precast_plank", "entered"].includes(floor_type)) return { error: "Floor construction must be concrete slab, wood (bare or topped), steel deck, precast plank, or an entered self-weight." };
  if (!(slab_thickness_in >= 0)) return { error: "Slab thickness cannot be negative." };
  if (!(floor_self_weight_psf >= 0)) return { error: "Entered floor self-weight cannot be negative." };
  if (!(rubble_depth_in >= 0)) return { error: "Rubble depth cannot be negative." };
  if (!(contents_psf >= 0) || !(partitions_psf >= 0) || !(rescuer_psf >= 0)) return { error: "Contents, partition, and rescuer allowances cannot be negative." };
  if (!(Number.isInteger(floors_bearing) && floors_bearing >= 1)) return { error: "Floors bearing on the shore must be a whole number of at least 1." };
  if (!(shore_spacing_ft > 0) || !(tributary_width_ft > 0)) return { error: "Shore spacing and tributary width must be positive." };
  if (!(Number.isInteger(posts_per_shore) && posts_per_shore >= 1)) return { error: "Posts per shore must be a whole number of at least 1." };
  const self_weight_psf = floor_type === "concrete" ? slab_thickness_in * _CONCRETE_PSF_PER_IN
    : floor_type === "entered" ? floor_self_weight_psf : _FLOOR_PSF[floor_type];
  // Each collapsed floor above brings its own slab, contents, and partitions;
  // the rubble depth is the total measured pile and the rescuers stand once.
  const per_floor_psf = self_weight_psf + contents_psf + partitions_psf;
  const floor_psf = per_floor_psf * floors_bearing;
  const rubble_psf = rubble_depth_in * _RUBBLE_PSF_PER_IN;
  const total_psf = floor_psf + rubble_psf + rescuer_psf;
  if (!(total_psf > 0)) return { error: "The total load is zero -- enter a floor, rubble, or rescuer load." };
  const tributary_area_sqft = shore_spacing_ft * tributary_width_ft;
  const load_per_shore_lb = total_psf * tributary_area_sqft;
  const load_per_post_lb = load_per_shore_lb / posts_per_shore;
  const rubble_share_pct = 100 * rubble_psf / total_psf;
  return {
    self_weight_psf, per_floor_psf, floor_psf, rubble_psf, contents_psf, partitions_psf, rescuer_psf,
    total_psf, tributary_area_sqft, load_per_shore_lb, load_per_post_lb, rubble_share_pct, floors_bearing, posts_per_shore,
    largest_component: rubble_psf >= floor_psf && rubble_psf >= rescuer_psf ? "rubble" : floor_psf >= rescuer_psf ? "the floor itself" : "the rescuer allowance",
    note: "A shore holds up whatever is above it, and after a collapse that is more than the floor. The US&R guides publish the weights a structures specialist adds up in the field: the floor's own weight by construction type (normal concrete at 150 pcf is 12.5 psf per inch), concrete and masonry rubble at 10 psf for every inch of depth, furniture and partitions, and 10 to 15 psf for the rescuers who will work in the space. Rubble is the component that grows fastest and the one most often underestimated, because it is judged by eye. Multiplying by the tributary area -- half the span to each neighbor in each direction -- gives the load per shore, and dividing by the posts gives the load per post, which usr-vertical-shore-capacity checks against a post at its height. Where several collapsed floors bear on the shore, each floor's weight, contents, and partitions are added. This is a field load estimate from typical unit weights; wet materials, storage occupancies, and heavy equipment can be much heavier, and a measured weight governs. It does not assess the damaged floor's remaining capacity, punching shear, the load path below the shore, or dynamic effects from aftershocks and falling debris. The US&R Structures Specialist and the incident's structural engineer govern.",
  };
}
export const collapseFloorLoadExample = { inputs: { floor_type: "concrete", slab_thickness_in: 6, floor_self_weight_psf: 0, rubble_depth_in: 18, contents_psf: 0, partitions_psf: 0, rescuer_psf: 15, floors_bearing: 1, shore_spacing_ft: 8, tributary_width_ft: 4, posts_per_shore: 3 } };
USAR_RENDERERS["collapse-floor-load"] = _simpleRenderer({
  citation: "Citation: USACE US&R Shoring Operations Guide, Ed. 5.0 (October 2021), Disaster Site Reference Data: Design Dead Loads for Building Materials (concrete 150 pcf; concrete masonry rubble 10 psf per inch; furniture 10 psf; interior walls 10 to 15 psf per floor; wood, steel-deck, and precast floor weights) and Rescue Live Loads (10 to 15 psf); the USACE US&R Structures Specialist Field Operations Guide (2006) weight tables. The method is the guides'; the US&R Structures Specialist governs.",
  example: collapseFloorLoadExample.inputs,
  fields: [
    { key: "floor_type", label: "Floor construction", kind: "select", options: [
      { value: "concrete", label: "Concrete slab (12.5 psf per inch)" },
      { value: "wood_bare", label: "Wood floor, bare (10 psf)" },
      { value: "wood_topped", label: "Wood floor with 1.5 in concrete fill (25 psf)" },
      { value: "steel_deck", label: "Steel deck with concrete fill (70 psf, upper value)" },
      { value: "precast_plank", label: "8 in precast hollow plank (60 psf)" },
      { value: "entered", label: "Entered self-weight" },
    ], default: "concrete" },
    { key: "slab_thickness_in", label: "Concrete slab thickness (in)", default: 6 },
    { key: "floor_self_weight_psf", label: "Entered floor self-weight (psf, if chosen)", default: 0 },
    { key: "rubble_depth_in", label: "Rubble depth on the floor (in)", default: 18 },
    { key: "contents_psf", label: "Contents allowance (psf; 10 for home or office furniture)", default: 0 },
    { key: "partitions_psf", label: "Partition allowance (psf; 10 to 15 per floor)", default: 0 },
    { key: "rescuer_psf", label: "Rescuer live load (psf; 10 to 15)", default: 15 },
    { key: "floors_bearing", label: "Collapsed floors bearing on the shore", default: 1, attrs: { step: "1", min: "1" } },
    { key: "shore_spacing_ft", label: "Shore spacing along the shore line (ft)", default: 8 },
    { key: "tributary_width_ft", label: "Tributary width across the shore (ft)", default: 4 },
    { key: "posts_per_shore", label: "Posts per shore", default: 3, attrs: { step: "1", min: "1" } },
  ],
  outputs: [
    { key: "total", id: "cfl-out-total", label: "Total load on the floor", value: (r) => fmt(r.total_psf, 1) + " psf (floor " + fmt(r.floor_psf, 1) + " + rubble " + fmt(r.rubble_psf, 1) + " + rescuers " + fmt(r.rescuer_psf, 1) + ")" },
    { key: "share", id: "cfl-out-share", label: "Rubble share of the load", value: (r) => fmt(r.rubble_share_pct, 1) + "% -- largest component: " + r.largest_component },
    { key: "shore", id: "cfl-out-shore", label: "Load per shore", value: (r) => fmt(r.load_per_shore_lb, 0) + " lb on " + fmt(r.tributary_area_sqft, 1) + " sq ft" },
    { key: "post", id: "cfl-out-post", label: "Load per post", value: (r) => fmt(r.load_per_post_lb, 0) + " lb (" + fmt(r.posts_per_shore, 0) + " posts)" },
    { key: "n", id: "cfl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCollapseFloorLoad,
});

// ===================== spec-v1898: US&R vertical shore post capacity =====================

// US&R simplified column method: Fa = 480,000 psi / (L/D)^2, capped at the
// compression parallel to grain Fc = 1,100 psi, with L the shore height and D
// the post's least actual width. The cap governs below L/D = sqrt(480,000 /
// 1,100) = 20.89.
const _FA_NUMERATOR_PSI = 480000;
const _FC_CAP_PSI = 1100;
const _POST_ACTUAL_IN = { "4x4": [3.5, 3.5], "6x6": [5.5, 5.5] };

// dims: in { shore_height_ft: L, post_size: dimensionless, post_width_in: L, post_depth_in: L, posts: dimensionless, species: dimensionless, load_per_shore_lb: M L T^-2, aftershock_expected: dimensionless } out: { slenderness_ld: dimensionless, fa_psi: M L^-1 T^-2, post_area_sqin: L^2, load_per_post_lb: M L T^-2, shore_capacity_lb: M L T^-2, load_ratio: dimensionless, bracing_min_lb: M L T^-2, bracing_aftershock_lb: M L T^-2, bracing_required_lb: M L T^-2 }
export function computeUsrVerticalShoreCapacity({ shore_height_ft = 10, post_size = "4x4", post_width_in = 3.5, post_depth_in = 3.5, posts = 3, species = "df", load_per_shore_lb = 12000, aftershock_expected = "yes" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(shore_height_ft > 0)) return { error: "Shore height must be positive." };
  if (!["4x4", "6x6", "custom"].includes(post_size)) return { error: "Post size must be 4x4, 6x6, or custom actual dimensions." };
  if (post_size === "custom" && (!(post_width_in > 0) || !(post_depth_in > 0))) return { error: "Custom post width and depth must be positive." };
  if (!(Number.isInteger(posts) && posts >= 1)) return { error: "Number of posts must be a whole number of at least 1." };
  if (!(species in _SPECIES_FACTOR)) return { error: "Species group must be one of the three published groups." };
  if (!(load_per_shore_lb > 0)) return { error: "Load per shore must be positive." };
  if (!["yes", "no"].includes(aftershock_expected)) return { error: "Aftershock expectation must be yes or no." };
  const [w, d] = post_size === "custom" ? [post_width_in, post_depth_in] : _POST_ACTUAL_IN[post_size];
  const least_in = Math.min(w, d);
  const slenderness_ld = shore_height_ft * 12 / least_in;
  if (slenderness_ld > 50) return { error: "L/D of " + slenderness_ld.toFixed(1) + " exceeds 50 -- the US&R guides do not permit this post at this height." };
  const euler_psi = _FA_NUMERATOR_PSI / (slenderness_ld * slenderness_ld);
  const fa_psi = Math.min(_FC_CAP_PSI, euler_psi);
  const cap_governs = euler_psi >= _FC_CAP_PSI;
  const post_area_sqin = w * d;
  const load_per_post_lb = fa_psi * post_area_sqin;
  const species_factor = _SPECIES_FACTOR[species];
  const shore_capacity_lb = posts * load_per_post_lb * species_factor;
  const load_ratio = load_per_shore_lb / shore_capacity_lb;
  const passes = load_ratio <= 1;
  const ld_over_25 = slenderness_ld > 25;
  // Lateral bracing: at least 2% of the vertical capacity; 10% where
  // aftershocks are expected (DHS BIPS 08 / FEMA US&R).
  const bracing_min_lb = 0.02 * shore_capacity_lb;
  const bracing_aftershock_lb = 0.10 * shore_capacity_lb;
  const bracing_required_lb = aftershock_expected === "yes" ? bracing_aftershock_lb : bracing_min_lb;
  return {
    slenderness_ld, euler_psi, fa_psi, cap_governs, post_area_sqin, load_per_post_lb, species_factor,
    shore_capacity_lb, load_per_shore_lb, load_ratio, passes, ld_over_25,
    bracing_min_lb, bracing_aftershock_lb, bracing_required_lb,
    verdict: passes ? "the shore capacity covers the load" : "OVERLOADED -- add posts, shorten the shore, or use larger posts",
    ld_flag: ld_over_25 ? "L/D above 25: this post can buckle before its ends visibly crush -- no audible warning" : "L/D 25 or less: an overloaded post crushes at its ends and creaks before it fails",
    note: "The US&R method is a field-reduced column design a structures specialist can do on a clipboard. The allowable stress falls with the square of slenderness (the Euler shape), 480,000 psi divided by (L/D) squared, and is capped at 1,100 psi, the compression strength parallel to grain, for short posts; the cap governs below L/D of about 20.9. The slenderness is taken on the shore height rather than the post's cut length, so the header and sole are counted. The L/D of 25 is a warning limit, not a strength limit: below it an overloaded post crushes at its ends and creaks, giving the crew time to leave; above it the post can buckle suddenly. Beyond L/D 50 the post is not used at all. Species and grade apply as a factor on the whole shore, and the lateral bracing is designed for at least 2% of the vertical capacity, 10% where aftershocks are expected. This checks solid-sawn posts under axial load only; it does not design headers, check header or sole bearing across the grain, cover laced posts, pneumatic or proprietary struts (which follow their manufacturers' ratings), eccentric loads, or the floor or ground under the sole. The US&R guides, the US&R Structures Specialist, and the incident's structural engineer govern.",
  };
}
export const usrVerticalShoreCapacityExample = { inputs: { shore_height_ft: 10, post_size: "4x4", post_width_in: 3.5, post_depth_in: 3.5, posts: 3, species: "df", load_per_shore_lb: 12000, aftershock_expected: "yes" } };
USAR_RENDERERS["usr-vertical-shore-capacity"] = _simpleRenderer({
  citation: "Citation: USACE US&R Structures Specialist Field Operations Guide (2006), Structural Calculations -- Material Properties: Fa = 480,000 psi / (L/D)^2 capped at Fc = 1,100 psi, L/D 25 warning limit and 50 maximum; USACE US&R Shoring Operations Guide, Ed. 5.0 (2021), vertical shore design loads and species factors (85% and 75%); DHS BIPS 08 (2011) lateral bracing at 2% of vertical load, 10% where aftershocks are expected. The US&R Structures Specialist governs.",
  example: usrVerticalShoreCapacityExample.inputs,
  fields: [
    { key: "shore_height_ft", label: "Shore height, sole to top of header (ft)", default: 10 },
    { key: "post_size", label: "Post size", kind: "select", options: [
      { value: "4x4", label: "4x4 (3.5 x 3.5 in actual)" },
      { value: "6x6", label: "6x6 (5.5 x 5.5 in actual)" },
      { value: "custom", label: "Custom actual dimensions" },
    ], default: "4x4" },
    { key: "post_width_in", label: "Custom post actual width (in)", default: 3.5 },
    { key: "post_depth_in", label: "Custom post actual depth (in)", default: 3.5 },
    { key: "posts", label: "Posts in the shore", default: 3, attrs: { step: "1", min: "1" } },
    { key: "species", label: "Species group", kind: "select", options: _SPECIES_OPTIONS, default: "df" },
    { key: "load_per_shore_lb", label: "Load per shore (lb, from collapse-floor-load)", default: 12000 },
    { key: "aftershock_expected", label: "Aftershocks expected", kind: "select", options: _AFTERSHOCK_OPTIONS, default: "yes" },
  ],
  outputs: [
    { key: "ld", id: "vsc-out-ld", label: "Slenderness L/D", value: (r) => fmt(r.slenderness_ld, 2) + " -- " + r.ld_flag },
    { key: "fa", id: "vsc-out-fa", label: "Allowable stress", value: (r) => fmt(r.fa_psi, 1) + " psi" + (r.cap_governs ? " (1,100 psi cap governs)" : " (Euler-type term governs)") },
    { key: "post", id: "vsc-out-post", label: "Capacity per post (Douglas Fir basis)", value: (r) => fmt(r.load_per_post_lb, 0) + " lb on " + fmt(r.post_area_sqin, 2) + " sq in" },
    { key: "shore", id: "vsc-out-shore", label: "Shore capacity with species factor", value: (r) => fmt(r.shore_capacity_lb, 0) + " lb (factor " + fmt(r.species_factor, 2) + ")" },
    { key: "ratio", id: "vsc-out-ratio", label: "Load to capacity", value: (r) => fmt(r.load_ratio, 2) + " -- " + r.verdict },
    { key: "brace", id: "vsc-out-brace", label: "Lateral bracing design force", value: (r) => fmt(r.bracing_required_lb, 0) + " lb (2% = " + fmt(r.bracing_min_lb, 0) + " lb; 10% with aftershocks = " + fmt(r.bracing_aftershock_lb, 0) + " lb)" },
    { key: "n", id: "vsc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeUsrVerticalShoreCapacity,
});

// ===================== spec-v1899: US&R box crib capacity and height limit =====================

// Cribbing design load L = A x N x P (SOG 2021, Additional Information --
// Cribbing): A the area of one crossing (actual member width squared), N the
// crossings per layer (4 for a 2x2 layup, 9 for 3x3), P the allowable
// cross-grain bearing (500 psi for No. 1 and better Douglas Fir). Height to
// width ratios and the practical ceilings are the SOG reference-data values.
const _CRIB_MEMBER_IN = { "4x4": 3.5, "6x6": 5.5 };
const _CRIB_PRACTICAL_FT = { "4x4": 4, "6x6": 6 };
const _CRIB_POINTS = { "2x2": 4, "3x3": 9 };
const _CRIB_RATIO = { all: 3, lifting: 2, two_corners: 1.5, one_corner: 1 };

// dims: in { timber_size: dimensionless, layup: dimensionless, species: dimensionless, bearing_stress_psi: M L^-1 T^-2, crib_width_ft: L, bearing_condition: dimensionless, crib_load_lb: M L T^-2 } out: { contact_area_sqin: L^2, contact_points: dimensionless, base_capacity_lb: M L T^-2, crib_capacity_lb: M L T^-2, ratio_height_ft: L, practical_height_ft: L, max_height_ft: L, load_ratio: dimensionless }
export function computeUsrCribCapacity({ timber_size = "6x6", layup = "3x3", species = "syp_hf_spf", bearing_stress_psi = 500, crib_width_ft = 4, bearing_condition = "all", crib_load_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(timber_size in _CRIB_MEMBER_IN)) return { error: "Timber size must be 4x4 or 6x6." };
  if (!(layup in _CRIB_POINTS)) return { error: "Layup must be 2x2 or 3x3." };
  if (!(species in _SPECIES_FACTOR)) return { error: "Species group must be one of the three published groups." };
  if (!(bearing_stress_psi > 0)) return { error: "Allowable bearing stress must be positive." };
  if (!(crib_width_ft > 0)) return { error: "Crib width must be positive." };
  if (!(bearing_condition in _CRIB_RATIO)) return { error: "Bearing condition must be all points, lifting, two of four corners, or one of four corners." };
  if (!(crib_load_lb >= 0)) return { error: "Crib load cannot be negative (enter 0 when not checking a load)." };
  const member_in = _CRIB_MEMBER_IN[timber_size];
  const contact_area_sqin = member_in * member_in;
  const contact_points = _CRIB_POINTS[layup];
  const base_capacity_lb = contact_area_sqin * contact_points * bearing_stress_psi;
  const species_factor = _SPECIES_FACTOR[species];
  const crib_capacity_lb = base_capacity_lb * species_factor;
  const height_ratio = _CRIB_RATIO[bearing_condition];
  const ratio_height_ft = height_ratio * crib_width_ft;
  const practical_height_ft = _CRIB_PRACTICAL_FT[timber_size];
  const max_height_ft = Math.min(ratio_height_ft, practical_height_ft);
  const governing_limit = ratio_height_ft < practical_height_ft ? "the height-to-width ratio"
    : ratio_height_ft > practical_height_ft ? "the practical ceiling for " + timber_size + " cribbing"
      : "both (the ratio equals the practical ceiling)";
  const load_entered = crib_load_lb > 0;
  const load_ratio = crib_load_lb / crib_capacity_lb;
  return {
    member_in, contact_area_sqin, contact_points, base_capacity_lb, species_factor, crib_capacity_lb,
    height_ratio, ratio_height_ft, practical_height_ft, max_height_ft, governing_limit, load_ratio, load_entered,
    load_verdict: !load_entered ? "no load entered" : load_ratio <= 1 ? "within the crib capacity" : "OVER the crib capacity -- add crossings (3x3), larger timber, or more cribs",
    note: "A crib fails by crushing the wood across the grain where the layers cross, so its capacity is the number of crossing points times the area of each times the allowable bearing stress, L = A x N x P. That is why a 3x3 layup carries more than twice a 2x2 of the same timber: nine contact points instead of four. The crushing failure is slow and audible, which is why cribbing is trusted in collapse work. Height is a stability limit that tightens as the crib loses contact: three times the narrowest width with every point bearing, two for lift-and-crib work, one and a half on two of four corners, one on a single corner, and a practical ceiling of about 4 ft for 4x4 and 6 ft for 6x6 cribbing; the lower limit governs, and a crib that must be taller is widened rather than stacked higher. Keep the crib within about 15 degrees of level. The 2021 Shoring Operations Guide uses 500 psi for No. 1 and better Douglas Fir; the 2006 Field Operations Guide lists 625 psi perpendicular to grain, so the stress is an input and the SOG value is the default. The surface under the crib must carry the same load over the crib's footprint. This does not check that surface, the load path above, wedges and shims, lateral or aftershock stability, or plastic cribbing, which follows its manufacturer's ratings. The US&R guides, the US&R Structures Specialist, and the incident's structural engineer govern.",
  };
}
export const usrCribCapacityExample = { inputs: { timber_size: "6x6", layup: "3x3", species: "syp_hf_spf", bearing_stress_psi: 500, crib_width_ft: 4, bearing_condition: "all", crib_load_lb: 0 } };
USAR_RENDERERS["usr-crib-capacity"] = _simpleRenderer({
  citation: "Citation: USACE US&R Shoring Operations Guide, Ed. 5.0 (2021), Additional Information -- Cribbing: design load L = A x N x P with P = 500 psi for No. 1 and better Douglas Fir, species factors 85% and 75%, maximum height 3 x shortest width with recommended maxima of 4 ft (4x4) and 6 ft (6x6); Rescue Specialist Reference Data: height-to-width ratios 3:1 all bearing, 2:1 lifting, 1.5:1 two of four corners, 1:1 one of four, 15 degree maximum slope. The US&R Structures Specialist governs.",
  example: usrCribCapacityExample.inputs,
  fields: [
    { key: "timber_size", label: "Crib timber", kind: "select", options: [
      { value: "4x4", label: "4x4 (3.5 in actual)" },
      { value: "6x6", label: "6x6 (5.5 in actual)" },
    ], default: "6x6" },
    { key: "layup", label: "Layup", kind: "select", options: [
      { value: "2x2", label: "2x2 (4 contact points per layer)" },
      { value: "3x3", label: "3x3 (9 contact points per layer)" },
    ], default: "3x3" },
    { key: "species", label: "Species group", kind: "select", options: _SPECIES_OPTIONS, default: "syp_hf_spf" },
    { key: "bearing_stress_psi", label: "Allowable cross-grain bearing (psi; SOG 500)", default: 500 },
    { key: "crib_width_ft", label: "Shortest crib width (ft)", default: 4 },
    { key: "bearing_condition", label: "Bearing condition", kind: "select", options: [
      { value: "all", label: "All contact points bearing (3:1)" },
      { value: "lifting", label: "Lift-and-crib operation (2:1)" },
      { value: "two_corners", label: "Two of four corners bearing (1.5:1)" },
      { value: "one_corner", label: "One of four corners bearing (1:1)" },
    ], default: "all" },
    { key: "crib_load_lb", label: "Load on the crib (lb, 0 to skip)", default: 0 },
  ],
  outputs: [
    { key: "pts", id: "ucc-out-pts", label: "Contact points", value: (r) => fmt(r.contact_points, 0) + " at " + fmt(r.contact_area_sqin, 2) + " sq in each" },
    { key: "cap", id: "ucc-out-cap", label: "Crib capacity with species factor", value: (r) => fmt(r.crib_capacity_lb, 0) + " lb (" + fmt(r.base_capacity_lb, 0) + " lb x " + fmt(r.species_factor, 2) + ")" },
    { key: "h", id: "ucc-out-h", label: "Maximum crib height", value: (r) => fmt(r.max_height_ft, 2) + " ft -- governed by " + r.governing_limit + " (ratio " + fmt(r.ratio_height_ft, 2) + " ft, practical " + fmt(r.practical_height_ft, 0) + " ft)" },
    { key: "load", id: "ucc-out-load", label: "Load check", value: (r) => r.load_entered ? fmt(r.load_ratio, 2) + " of capacity -- " + r.load_verdict : r.load_verdict },
    { key: "n", id: "ucc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeUsrCribCapacity,
});

// ===================== spec-v1900: US&R raker shore geometry and wall force =====================

// Published raker ratings: SOG 2021 FAQ R-1, 4,000 lb horizontal per solid- or
// split-sole raker of No. 1 Douglas Fir (8,000 lb for a braced pair, "Shoring
// Numbers to Remember"); FOG 2006, 2,500 lb per 4x raker.
const _RAKER_SOG_SINGLE_LB = 4000;
const _RAKER_SOG_PAIR_LB = 8000;
const _RAKER_FOG_LB = 2500;

// dims: in { wall_psf: M L^-1 T^-2, wall_height_ft: L, raker_spacing_ft: L, roof_depth_ft: L, roof_psf: M L^-1 T^-2, insertion_height_ft: L, raker_angle_deg: dimensionless, aftershock_expected: dimensionless } out: { wall_weight_lb: M L T^-2, roof_weight_lb: M L T^-2, tributary_weight_lb: M L T^-2, design_force_lb: M L T^-2, raker_length_in: L, rule_length_in: L, base_distance_in: L, axial_force_lb: M L T^-2, vertical_kick_lb: M L T^-2, collapse_zone_min_ft: L, collapse_zone_max_ft: L }
export function computeUsrRakerShore({ wall_psf = 125, wall_height_ft = 14, raker_spacing_ft = 8, roof_depth_ft = 10, roof_psf = 15, insertion_height_ft = 12, raker_angle_deg = 45, aftershock_expected = "yes" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(wall_psf > 0)) return { error: "Wall unit weight must be positive." };
  if (!(wall_height_ft > 0)) return { error: "Wall height must be positive." };
  if (!(raker_spacing_ft > 0)) return { error: "Raker spacing must be positive." };
  if (!(roof_depth_ft >= 0) || !(roof_psf >= 0)) return { error: "Roof tributary depth and roof unit weight cannot be negative." };
  if (!(insertion_height_ft > 0)) return { error: "Insertion height must be positive." };
  if (insertion_height_ft > wall_height_ft) return { error: "Insertion height cannot be above the top of the wall." };
  if (!(raker_angle_deg >= 30 && raker_angle_deg <= 75)) return { error: "Raker angle must be between 30 and 75 degrees." };
  if (!["yes", "no"].includes(aftershock_expected)) return { error: "Aftershock expectation must be yes or no." };
  const wall_weight_lb = wall_psf * wall_height_ft * raker_spacing_ft;
  const roof_weight_lb = roof_psf * roof_depth_ft * raker_spacing_ft;
  const tributary_weight_lb = wall_weight_lb + roof_weight_lb;
  const design_fraction = aftershock_expected === "yes" ? 0.10 : 0.02;
  const design_force_lb = design_fraction * tributary_weight_lb;
  const theta = raker_angle_deg * Math.PI / 180;
  const insertion_in = insertion_height_ft * 12;
  const raker_length_in = insertion_in / Math.sin(theta);
  const base_distance_in = insertion_in / Math.tan(theta);
  // The guides' field rule is 17 in per ft of insertion height at 45 degrees
  // and 14 in per ft at 60; at any other angle the exact trigonometry is the
  // only rule, so the rule length falls back to it.
  const rule_in_per_ft = raker_angle_deg === 45 ? 17 : raker_angle_deg === 60 ? 14 : 12 / Math.sin(theta);
  const rule_length_in = rule_in_per_ft * insertion_height_ft;
  const axial_force_lb = design_force_lb / Math.cos(theta);
  const vertical_kick_lb = design_force_lb * Math.tan(theta);
  const collapse_zone_min_ft = 1.25 * wall_height_ft;
  const collapse_zone_max_ft = 1.5 * wall_height_ft;
  const base_in_zone = base_distance_in / 12 < collapse_zone_max_ft;
  return {
    wall_weight_lb, roof_weight_lb, tributary_weight_lb, design_fraction, design_force_lb,
    raker_length_in, rule_in_per_ft, rule_length_in, base_distance_in, axial_force_lb, vertical_kick_lb,
    collapse_zone_min_ft, collapse_zone_max_ft, base_in_zone,
    sog_single_ok: design_force_lb <= _RAKER_SOG_SINGLE_LB,
    sog_pair_ok: 2 * design_force_lb <= _RAKER_SOG_PAIR_LB,
    fog_ok: design_force_lb <= _RAKER_FOG_LB,
    sog_verdict: design_force_lb <= _RAKER_SOG_SINGLE_LB ? "within the SOG 2021 rating of 4,000 lb per raker" : "OVER the SOG 2021 rating of 4,000 lb per raker -- close the spacing",
    fog_verdict: design_force_lb <= _RAKER_FOG_LB ? "within the FOG 2006 rating of 2,500 lb per raker" : "OVER the FOG 2006 rating of 2,500 lb per raker",
    zone_verdict: base_in_zone ? "the raker base is INSIDE the wall's collapse zone -- the crew building it works in the zone" : "the raker base is outside the collapse zone",
    note: "A raker stops a damaged wall from falling outward by pushing back at a point partway up, and the force it supplies is a fraction of the wall's weight rather than a wind load. The guides design for 10% of the weight of the wall and roof in each raker's tributary width because an aftershock can shake the wall further out, with 2% as the floor where none is expected. The geometry is a right triangle and the angle is the main choice: a 45 degree raker has the smaller axial force but the longer base, a 60 degree raker fits a narrow street but carries more axial force and a larger vertical kick. That kick, the design force times the tangent of the angle, pushes the wall plate UP, and a plate that is only nailed can be driven up the wall. The field rules of 17 in per ft of insertion height at 45 degrees and 14 in at 60 reproduce the trigonometry to within an inch or two. The two guide editions rate rakers differently and both are shown: the 2021 Shoring Operations Guide rates a single raker at 4,000 lb of horizontal force (8,000 lb for a braced pair), the 2006 Field Operations Guide at 2,500 lb. The collapse zone, 1.25 to 1.5 times the wall height, is the ground the wall would cover if it fell. This does not design the wall plate, sole, cleats, or bottom restraint, the bracing between rakers, the wall itself between rakers, or the ground at the sole (see picket-anchor-soil). The US&R guides, the US&R Structures Specialist, and the incident's structural engineer govern.",
  };
}
export const usrRakerShoreExample = { inputs: { wall_psf: 125, wall_height_ft: 14, raker_spacing_ft: 8, roof_depth_ft: 10, roof_psf: 15, insertion_height_ft: 12, raker_angle_deg: 45, aftershock_expected: "yes" } };
USAR_RENDERERS["usr-raker-shore"] = _simpleRenderer({
  citation: "Citation: FEMA Structural Collapse Technician Module 2a (rakers designed for about 10% of the wall and roof weight in their tributary width, 2% minimum); USACE US&R Shoring Operations Guide, Ed. 5.0 (2021), raker length rules (17 in per ft of insertion height at 45 degrees, 14 in at 60), FAQ R-1 rating of 4,000 lb horizontal per raker, and the collapse zone of 1.25 to 1.5 times the wall height; USACE US&R Structures Specialist FOG (2006) rating of 2,500 lb per raker. The US&R Structures Specialist governs.",
  example: usrRakerShoreExample.inputs,
  fields: [
    { key: "wall_psf", label: "Wall unit weight (psf; 12 in URM about 125)", default: 125 },
    { key: "wall_height_ft", label: "Wall height (ft)", default: 14 },
    { key: "raker_spacing_ft", label: "Raker spacing (ft)", default: 8 },
    { key: "roof_depth_ft", label: "Roof tributary depth bearing on the wall (ft)", default: 10 },
    { key: "roof_psf", label: "Roof unit weight (psf)", default: 15 },
    { key: "insertion_height_ft", label: "Insertion height above the sole (ft)", default: 12 },
    { key: "raker_angle_deg", label: "Raker angle from horizontal (degrees, 30 to 75)", default: 45, attrs: { step: "any", min: "30", max: "75" } },
    { key: "aftershock_expected", label: "Aftershocks expected (10% design force; else 2%)", kind: "select", options: _AFTERSHOCK_OPTIONS, default: "yes" },
  ],
  outputs: [
    { key: "w", id: "urs-out-w", label: "Tributary wall and roof weight", value: (r) => fmt(r.tributary_weight_lb, 0) + " lb (wall " + fmt(r.wall_weight_lb, 0) + " + roof " + fmt(r.roof_weight_lb, 0) + ")" },
    { key: "h", id: "urs-out-h", label: "Design horizontal force per raker", value: (r) => fmt(r.design_force_lb, 0) + " lb (" + fmt(100 * r.design_fraction, 0) + "% of the weight)" },
    { key: "len", id: "urs-out-len", label: "Raker length and base distance", value: (r) => fmt(r.raker_length_in, 1) + " in tip to tip (field rule " + fmt(r.rule_length_in, 0) + " in); base " + fmt(r.base_distance_in, 1) + " in from the wall" },
    { key: "f", id: "urs-out-f", label: "Axial force and vertical kick", value: (r) => fmt(r.axial_force_lb, 0) + " lb along the raker; " + fmt(r.vertical_kick_lb, 0) + " lb pushing the wall plate up" },
    { key: "rate", id: "urs-out-rate", label: "Against the published ratings", value: (r) => r.sog_verdict + "; " + r.fog_verdict },
    { key: "zone", id: "urs-out-zone", label: "Collapse zone", value: (r) => fmt(r.collapse_zone_min_ft, 1) + " to " + fmt(r.collapse_zone_max_ft, 1) + " ft from the wall -- " + r.zone_verdict },
    { key: "n", id: "urs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeUsrRakerShore,
});

// ===================== spec-v1901: steel picket anchor lateral capacity and count =====================

// USACE US&R Structures Specialist FOG (2006), "Approximate Design Load of
// Pickets (Pins) in Soils", from FHWA-IP-84-11 at about 50% of capacity, for a
// 48 in picket driven 36 in (lb per picket).
const _PICKET_LB = {
  "1": { cohesive_poor: 500, cohesive_average: 750, cohesive_good: 1000, cohesionless_loose: 50, cohesionless_medium: 55, cohesionless_dense: 63 },
  "3": { cohesive_poor: 1000, cohesive_average: 1500, cohesive_good: 2000, cohesionless_loose: 150, cohesionless_medium: 180, cohesionless_dense: 190 },
};
const _PICKET_TABLE_EMBED_IN = 36;
const _STANDARD_PATTERN_PICKETS = 4;

// dims: in { required_force_lb: M L T^-2, picket_dia: dimensionless, soil: dimensionless, embedment_in: L } out: { design_load_per_picket_lb: M L T^-2, pickets_required: dimensionless, group_capacity_lb: M L T^-2, standard_pattern_capacity_lb: M L T^-2 }
export function computePicketAnchorSoil({ required_force_lb = 1520, picket_dia = "1", soil = "cohesive_average", embedment_in = 36 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(required_force_lb > 0)) return { error: "Required lateral force must be positive." };
  if (!(picket_dia in _PICKET_LB)) return { error: "Picket diameter must be 1 in or 3 in, the sizes the table publishes." };
  if (!(soil in _PICKET_LB[picket_dia])) return { error: "Soil class must be poor, average, or good cohesive, or loose, medium, or dense cohesionless." };
  if (!(embedment_in > 0)) return { error: "Embedment depth must be positive." };
  const design_load_per_picket_lb = _PICKET_LB[picket_dia][soil];
  const pickets_required = Math.ceil(required_force_lb / design_load_per_picket_lb);
  const group_capacity_lb = pickets_required * design_load_per_picket_lb;
  const standard_pattern_capacity_lb = _STANDARD_PATTERN_PICKETS * design_load_per_picket_lb;
  const shallow = embedment_in < _PICKET_TABLE_EMBED_IN;
  const cohesionless = soil.startsWith("cohesionless");
  return {
    design_load_per_picket_lb, pickets_required, group_capacity_lb, standard_pattern_capacity_lb,
    embedment_in, shallow, cohesionless, beyond_standard_pattern: pickets_required > _STANDARD_PATTERN_PICKETS,
    embedment_flag: shallow ? "embedment BELOW the table's 36 in basis -- the tabulated load is NOT earned; capacity is lower than shown" : "embedment meets the table's 36 in basis",
    soil_flag: cohesionless ? "cohesionless soil -- pickets hold little here; use a deadman, buried timber, or a connection to paving or structure" : "cohesive soil -- the soil pickets are suited to",
    note: "A driven picket resists a sideways pull by bearing on the soil in front of it, so the soil sets the load. The published design loads, from the Federal Highway Administration's lateral-load handbook (FHWA-IP-84-11) at about half the ultimate capacity, span a factor of twenty: a 1 in picket holds 1,000 lb in good cohesive soil and 50 lb in loose sand. Pickets are a clay-and-firm-ground method; in granular soil a raker sole or rope anchor needs a different restraint -- a deadman, a larger pin, or a connection to paving or structure. The table assumes a 48 in picket driven 36 in. The 2021 Shoring Operations Guide's minimum picket is 1 in x 36 in driven 24 in, which serves its prescribed standard patterns (4 per raker sole in the 2011 DHS field guide, 6 per raker in cohesive soil in the 2021 guide) but does not earn the tabulated load, and the tile flags a shorter embedment rather than scaling the value. Pickets in a group are assumed spaced so that they do not share a soil wedge. This does not model tandem or tied-back groups beyond simple addition, uplift or combined loading, frozen, saturated, or disturbed ground, rock, or pickets in paving, and it does not design deadmen or earth anchors (guy-anchor-holding-capacity). The US&R guides, the US&R Structures Specialist, and the rigging competent person govern.",
  };
}
export const picketAnchorSoilExample = { inputs: { required_force_lb: 1520, picket_dia: "1", soil: "cohesive_average", embedment_in: 36 } };
USAR_RENDERERS["picket-anchor-soil"] = _simpleRenderer({
  citation: "Citation: USACE US&R Structures Specialist Field Operations Guide (2006), Approximate Design Load of Pickets (Pins) in Soils, based on FHWA-IP-84-11, Handbook on Design of Piles and Drilled Shafts Under Lateral Load (1984), design load about 50% of capacity for a 48 in picket driven 36 in; USACE US&R Shoring Operations Guide, Ed. 5.0 (2021), picket minimum 1 in x 36 in driven 24 in. The US&R Structures Specialist or the rigging competent person governs.",
  example: picketAnchorSoilExample.inputs,
  fields: [
    { key: "required_force_lb", label: "Required lateral force (lb)", default: 1520 },
    { key: "picket_dia", label: "Picket", kind: "select", options: [
      { value: "1", label: "1 in x 48 in pin" },
      { value: "3", label: "3 in x 48 in pin" },
    ], default: "1" },
    { key: "soil", label: "Soil type and class", kind: "select", options: [
      { value: "cohesive_poor", label: "Cohesive, poor" },
      { value: "cohesive_average", label: "Cohesive, average" },
      { value: "cohesive_good", label: "Cohesive, good" },
      { value: "cohesionless_loose", label: "Cohesionless, loose" },
      { value: "cohesionless_medium", label: "Cohesionless, medium" },
      { value: "cohesionless_dense", label: "Cohesionless, dense" },
    ], default: "cohesive_average" },
    { key: "embedment_in", label: "Embedment depth (in; table basis 36)", default: 36 },
  ],
  outputs: [
    { key: "per", id: "pas-out-per", label: "Design load per picket", value: (r) => fmt(r.design_load_per_picket_lb, 0) + " lb" },
    { key: "count", id: "pas-out-count", label: "Pickets required", value: (r) => fmt(r.pickets_required, 0) + " (group " + fmt(r.group_capacity_lb, 0) + " lb)" + (r.beyond_standard_pattern ? " -- more than the standard 4-picket pattern" : "") },
    { key: "std", id: "pas-out-std", label: "Standard 4-picket pattern", value: (r) => fmt(r.standard_pattern_capacity_lb, 0) + " lb" },
    { key: "emb", id: "pas-out-emb", label: "Embedment", value: (r) => r.embedment_flag },
    { key: "soilf", id: "pas-out-soil", label: "Soil", value: (r) => r.soil_flag },
    { key: "n", id: "pas-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePicketAnchorSoil,
});

// ===================== spec-v1902: OSHA Appendix C timber trench shoring lookup =====================

// 29 CFR 1926 Subpart P, Appendix C, Tables C-1.1 to C-1.3 (actual-size mixed
// oak, bending strength not less than 850 psi) and C-2.1 to C-2.3 (S4S
// Douglas fir, not less than 1,500 psi). Federal regulation, public domain,
// transcribed 2026-09-30 from the GovInfo CFR (2024 edition scan) and checked
// cell by cell against the osha.gov HTML copy. Each row:
//   [max crossbrace horizontal spacing ft, crossbrace sizes for trench widths
//    up to 4/6/9/12/15 ft, crossbrace vertical spacing ft, wale size ("" =
//    not required), wale vertical spacing ft (0 = none), uprights as
//    [size, max horizontal spacing ft or "close"] options].
// Rows the tables mark "See Note 1" are absent: those spacings need a design
// under 1926.652(c). Table C-1.1, 10-15 ft, up to 10 ft spacing, width up to 6
// ft PRINTS "6x5"; OSHA's own Example 1 (#B3) reads that cell as 6x6, and
// the tile uses 6x6 and flags the printed value. Table C-1.2, 10-15 ft, up to
// 10 ft spacing, width up to 12 ft reads 8x8 in the CFR; the osha.gov HTML
// copy shows 6x8, a transcription slip there.
const _APPC = {
  oak: {
    A: {
      "5-10": [
        [6, ["4x4", "4x4", "4x6", "6x6", "6x6"], 4, "", 0, [["2x6", 6]]],
        [8, ["4x4", "4x4", "4x6", "6x6", "6x6"], 4, "", 0, [["2x8", 8]]],
        [10, ["4x6", "4x6", "4x6", "6x6", "6x6"], 4, "8x8", 4, [["2x6", 5]]],
        [12, ["4x6", "4x6", "6x6", "6x6", "6x6"], 4, "8x8", 4, [["2x6", 6]]],
      ],
      "10-15": [
        [6, ["4x4", "4x4", "4x6", "6x6", "6x6"], 4, "", 0, [["3x8", 6]]],
        [8, ["4x6", "4x6", "6x6", "6x6", "6x6"], 4, "8x8", 4, [["2x6", 4]]],
        [10, ["6x6", "6x6", "6x6", "6x8", "6x8"], 4, "8x10", 4, [["2x6", 5]]],
        [12, ["6x6", "6x6", "6x6", "6x8", "6x8"], 4, "10x10", 4, [["3x8", 6]]],
      ],
      "15-20": [
        [6, ["6x6", "6x6", "6x6", "6x8", "6x8"], 4, "6x8", 4, [["3x6", "close"]]],
        [8, ["6x6", "6x6", "6x6", "6x8", "6x8"], 4, "8x8", 4, [["3x6", "close"]]],
        [10, ["8x8", "8x8", "8x8", "8x8", "8x10"], 4, "8x10", 4, [["3x6", "close"]]],
        [12, ["8x8", "8x8", "8x8", "8x8", "8x10"], 4, "10x10", 4, [["3x6", "close"]]],
      ],
    },
    B: {
      "5-10": [
        [6, ["4x6", "4x6", "6x6", "6x6", "6x6"], 5, "6x8", 5, [["2x6", 3]]],
        [8, ["6x6", "6x6", "6x6", "6x8", "6x8"], 5, "8x10", 5, [["2x6", 3]]],
        [10, ["6x6", "6x6", "6x6", "6x8", "6x8"], 5, "10x10", 5, [["2x6", 3]]],
      ],
      "10-15": [
        [6, ["6x6", "6x6", "6x6", "6x8", "6x8"], 5, "8x8", 5, [["2x6", 2]]],
        [8, ["6x8", "6x8", "6x8", "8x8", "8x8"], 5, "10x10", 5, [["2x6", 2]]],
        [10, ["8x8", "8x8", "8x8", "8x8", "8x10"], 5, "10x12", 5, [["2x6", 2]]],
      ],
      "15-20": [
        [6, ["6x8", "6x8", "6x8", "8x8", "8x8"], 5, "8x10", 5, [["3x6", "close"]]],
        [8, ["8x8", "8x8", "8x8", "8x8", "8x10"], 5, "10x12", 5, [["3x6", "close"]]],
        [10, ["8x10", "8x10", "8x10", "8x10", "10x10"], 5, "12x12", 5, [["3x6", "close"]]],
      ],
    },
    C: {
      "5-10": [
        [6, ["6x8", "6x8", "6x8", "8x8", "8x8"], 5, "8x10", 5, [["2x6", "close"]]],
        [8, ["8x8", "8x8", "8x8", "8x8", "8x10"], 5, "10x12", 5, [["2x6", "close"]]],
        [10, ["8x10", "8x10", "8x10", "8x10", "10x10"], 5, "12x12", 5, [["2x6", "close"]]],
      ],
      "10-15": [
        [6, ["8x8", "8x8", "8x8", "8x8", "8x10"], 5, "10x12", 5, [["2x6", "close"]]],
        [8, ["8x10", "8x10", "8x10", "8x10", "10x10"], 5, "12x12", 5, [["2x6", "close"]]],
      ],
      "15-20": [
        [6, ["8x10", "8x10", "8x10", "8x10", "10x10"], 5, "12x12", 5, [["3x6", "close"]]],
      ],
    },
  },
  fir: {
    A: {
      "5-10": [
        [6, ["4x4", "4x4", "4x4", "4x4", "4x6"], 4, "", 0, [["4x6", 6]]],
        [8, ["4x4", "4x4", "4x4", "4x6", "4x6"], 4, "", 0, [["4x8", 8]]],
        [10, ["4x6", "4x6", "4x6", "6x6", "6x6"], 4, "8x8", 4, [["4x6", 5]]],
        [12, ["4x6", "4x6", "4x6", "6x6", "6x6"], 4, "8x8", 4, [["4x6", 6]]],
      ],
      "10-15": [
        [6, ["4x4", "4x4", "4x4", "6x6", "6x6"], 4, "", 0, [["4x10", 6]]],
        [8, ["4x6", "4x6", "4x6", "6x6", "6x6"], 4, "6x8", 4, [["4x6", 4]]],
        [10, ["6x6", "6x6", "6x6", "6x6", "6x6"], 4, "8x8", 4, [["4x8", 5]]],
        [12, ["6x6", "6x6", "6x6", "6x6", "6x6"], 4, "8x10", 4, [["4x6", 4], ["4x10", 6]]],
      ],
      "15-20": [
        [6, ["6x6", "6x6", "6x6", "6x6", "6x6"], 4, "6x8", 4, [["3x6", "close"]]],
        [8, ["6x6", "6x6", "6x6", "6x6", "6x6"], 4, "8x8", 4, [["3x6", "close"], ["4x12", 4]]],
        [10, ["6x6", "6x6", "6x6", "6x6", "6x8"], 4, "8x10", 4, [["3x6", "close"]]],
        [12, ["6x6", "6x6", "6x6", "6x8", "6x8"], 4, "8x12", 4, [["3x6", "close"], ["4x12", 4]]],
      ],
    },
    B: {
      "5-10": [
        [6, ["4x6", "4x6", "4x6", "6x6", "6x6"], 5, "6x8", 5, [["3x12", 3], ["4x8", 3], ["4x12", 6]]],
        [8, ["4x6", "4x6", "6x6", "6x6", "6x6"], 5, "8x8", 5, [["3x8", 2], ["4x8", 4]]],
        [10, ["4x6", "4x6", "6x6", "6x6", "6x8"], 5, "8x10", 5, [["4x8", 3]]],
      ],
      "10-15": [
        [6, ["6x6", "6x6", "6x6", "6x8", "6x8"], 5, "8x8", 5, [["3x6", "close"], ["4x10", 2]]],
        [8, ["6x8", "6x8", "6x8", "8x8", "8x8"], 5, "10x10", 5, [["3x6", "close"], ["4x10", 2]]],
        [10, ["6x8", "6x8", "8x8", "8x8", "8x8"], 5, "10x12", 5, [["3x6", "close"], ["4x10", 2]]],
      ],
      "15-20": [
        [6, ["6x8", "6x8", "6x8", "6x8", "8x8"], 5, "8x10", 5, [["4x6", "close"]]],
        [8, ["6x8", "6x8", "6x8", "8x8", "8x8"], 5, "10x12", 5, [["4x6", "close"]]],
        [10, ["8x8", "8x8", "8x8", "8x8", "8x8"], 5, "12x12", 5, [["4x6", "close"]]],
      ],
    },
    C: {
      "5-10": [
        [6, ["6x6", "6x6", "6x6", "6x6", "8x8"], 5, "8x8", 5, [["3x6", "close"]]],
        [8, ["6x6", "6x6", "6x6", "8x8", "8x8"], 5, "10x10", 5, [["3x6", "close"]]],
        [10, ["6x6", "6x6", "8x8", "8x8", "8x8"], 5, "10x12", 5, [["3x6", "close"]]],
      ],
      "10-15": [
        [6, ["6x8", "6x8", "6x8", "8x8", "8x8"], 5, "10x10", 5, [["4x6", "close"]]],
        [8, ["8x8", "8x8", "8x8", "8x8", "8x8"], 5, "12x12", 5, [["4x6", "close"]]],
      ],
      "15-20": [
        [6, ["8x8", "8x8", "8x8", "8x10", "8x10"], 5, "10x12", 5, [["4x6", "close"]]],
      ],
    },
  },
};
const _APPC_WIDTHS_FT = [4, 6, 9, 12, 15];
const _APPC_PRESSURE_K = { A: 25, B: 45, C: 80 };
const _APPC_TABLE_NAME = { oak: { A: "C-1.1", B: "C-1.2", C: "C-1.3" }, fir: { A: "C-2.1", B: "C-2.2", C: "C-2.3" } };

// dims: in { soil_type: dimensionless, depth_ft: L, width_ft: L, table_set: dimensionless, crossbrace_spacing: dimensionless, limitation_present: dimensionless } out: { design_pressure_psf: M L^-1 T^-2, arrangement_count: dimensionless, first_crossbrace_load_lb: M L T^-2, max_crossbrace_load_lb: M L T^-2 }
export function computeOshaTimberTrenchShoring({ soil_type = "A", depth_ft = 13, width_ft = 5, table_set = "oak", crossbrace_spacing = "all", limitation_present = "no" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!["A", "B", "C"].includes(soil_type)) return { error: "Soil type must be A, B, or C (classified by the competent person under Appendix A). Stable rock needs no shoring." };
  if (!["oak", "fir"].includes(table_set)) return { error: "Table set must be actual-size mixed oak (C-1) or nominal Douglas fir (C-2)." };
  if (!["all", "6", "8", "10", "12"].includes(crossbrace_spacing)) return { error: "Crossbrace horizontal spacing must be 6, 8, 10, or 12 ft, or show all." };
  if (!["no", "yes"].includes(limitation_present)) return { error: "Limitation present must be yes or no." };
  if (!(depth_ft > 0)) return { error: "Trench depth must be positive." };
  if (depth_ft > 20) return { error: "Appendix C does not apply to trenches deeper than 20 ft -- a registered professional engineer must design the protective system (1926.652(b)(4) and (c)(4))." };
  if (!(width_ft > 0)) return { error: "Trench width must be positive." };
  if (width_ft > 15) return { error: "Appendix C tables stop at 15 ft of trench width -- the system must be designed under 1926.652(c)." };
  const k = _APPC_PRESSURE_K[soil_type];
  const design_pressure_psf = k * depth_ft + 72;
  const table_name = _APPC_TABLE_NAME[table_set][soil_type];
  if (depth_ft < 5) {
    return {
      design_pressure_psf, table_name, soil_type, depth_ft, width_ft, routed: true, arrangement_count: 0, first_crossbrace_load_lb: 0, max_crossbrace_load_lb: 0,
      depth_band: "under 5 ft", width_column_ft: 0, arrangements: [], arrangements_text: "none -- see excavation-protection-trigger",
      verdict: "UNDER 5 ft: protection is not required by 1926.652(a)(1) unless the competent person finds signs of a potential cave-in -- see excavation-protection-trigger",
      limitation_flag: "not evaluated", misprint_flag: "",
      note: "Trenches under 5 ft deep are routed to excavation-protection-trigger; Appendix C sizes timber shoring for trenches 5 to 20 ft deep. 29 CFR 1926 Subpart P and the competent person on site govern.",
    };
  }
  const depth_band = depth_ft <= 10 ? "5-10" : depth_ft <= 15 ? "10-15" : "15-20";
  const col = _APPC_WIDTHS_FT.findIndex((w) => width_ft <= w);
  const width_column_ft = _APPC_WIDTHS_FT[col];
  const rows = _APPC[table_set][soil_type][depth_band]
    .filter((row) => crossbrace_spacing === "all" || row[0] === Number(crossbrace_spacing));
  const limited = limitation_present === "yes";
  const misprint = table_set === "oak" && soil_type === "A" && depth_band === "10-15" && col === 1 && rows.some((row) => row[0] === 10);
  const arrangements = limited ? [] : rows.map((row, i) => {
    const [h_ft, sizes, v_ft, wale, wale_v_ft, uprights] = row;
    const crossbrace_load_lb = design_pressure_psf * h_ft * v_ft;
    const upr = uprights.map(([size, sp]) => size + (sp === "close" ? " close sheeting" : " at " + sp + " ft max")).join(" or ");
    return {
      label: "#B" + (i + 1), crossbrace: sizes[col], crossbrace_h_ft: h_ft, crossbrace_v_ft: v_ft,
      wale: wale || "not required", wale_v_ft, uprights: upr, crossbrace_load_lb,
      text: "#B" + (i + 1) + ": " + sizes[col] + " crossbraces at " + h_ft + " ft horizontal x " + v_ft + " ft vertical; "
        + (wale ? wale + " wales at " + wale_v_ft + " ft vertical" : "wales not required") + "; uprights " + upr
        + " (crossbrace load " + Math.round(crossbrace_load_lb).toLocaleString("en-US") + " lb)",
    };
  });
  const loads = arrangements.map((a) => a.crossbrace_load_lb);
  const arrangement_count = arrangements.length;
  const first_crossbrace_load_lb = arrangement_count ? loads[0] : 0;
  const max_crossbrace_load_lb = arrangement_count ? Math.max(...loads) : 0;
  const arrangements_text = limited ? "none -- the tables are not adequate when a (d)(2)(ii) condition is present"
    : arrangement_count ? arrangements.map((a) => a.text).join(" | ")
      : "none tabulated at this spacing (the table says See Note 1) -- choose another spacing or have the system designed under 1926.652(c)";
  return {
    design_pressure_psf, table_name, soil_type, depth_ft, width_ft, routed: false, depth_band, width_column_ft, arrangements, arrangement_count, arrangements_text,
    first_crossbrace_load_lb, max_crossbrace_load_lb,
    close_sheeting: soil_type === "C",
    verdict: limited ? "NOT ADEQUATE: with a (d)(2)(ii) condition present the Appendix C members do not apply -- an alternate timber system or another protective system must be designed under 1926.652"
      : arrangement_count ? "Table " + table_name + ", " + depth_band + " ft band, width column up to " + width_column_ft + " ft: " + arrangement_count + " acceptable arrangement" + (arrangement_count === 1 ? "" : "s")
        : "no tabulated arrangement at the chosen spacing",
    limitation_flag: limited ? "a (d)(2)(ii) limitation is present -- engineered design required" : "no (d)(2)(ii) limitation entered: adjacent loads no heavier than a 2 ft soil surcharge within a distance equal to the depth, no more than 240 lb on a crossbrace, no equipment over 20,000 lb, no partly sloped trench steeper than 3H:1V",
    misprint_flag: misprint && !limited ? "Table C-1.1 prints this crossbrace as 6x5; OSHA's Example 1 (#B3) reads it as 6x6, which is used here" : "",
    note: "Appendix C is a lookup: soil type, depth band (5 to 10, 10 to 15, 15 to 20 ft), trench width column (up to 4, 6, 9, 12, 15 ft), and the crossbrace horizontal spacing the crew chooses give the crossbrace size and vertical spacing, the wale size and vertical spacing (or not required), and the upright size and maximum horizontal spacing. Where the table offers several arrangements for the same trench the tile lists them all, as OSHA's own examples do, because the choice depends on the timber on hand. The pressure formula printed on each table, Pa = 25 H + 72 psf (Type A), 45 H + 72 (Type B), or 80 H + 72 (Type C), includes a 2 ft surcharge, and the load each crossbrace carries is that pressure times its horizontal and vertical spacing. The C-1 tables are actual-size mixed oak (850 psi bending); the C-2 tables are nominal S4S Douglas fir (1,500 psi) and are a separate set. The limitations in (d)(2)(ii) must not be skipped: in a disaster setting an excavator beside the trench, collapsed debris, or piled spoil often exceeds them, and then the tables do not apply. When conditions are saturated or submerged use tight sheeting (Note 2). This is not soil classification (Appendix A), hydraulic or pneumatic shoring, trench boxes, sloping or benching (trench-slope, excavation-bench-plan), or installation and removal sequence (1926.652(e)). 29 CFR 1926 Subpart P and the competent person on site govern.",
  };
}
export const oshaTimberTrenchShoringExample = { inputs: { soil_type: "A", depth_ft: 13, width_ft: 5, table_set: "oak", crossbrace_spacing: "all", limitation_present: "no" } };
USAR_RENDERERS["osha-timber-trench-shoring"] = _simpleRenderer({
  citation: "Citation: 29 CFR 1926 Subpart P, Appendix C (Timber Shoring for Trenches), Tables C-1.1, C-1.2, and C-1.3 (actual-size mixed oak, bending strength not less than 850 psi) and C-2.1, C-2.2, and C-2.3 (nominal S4S Douglas fir, not less than 1,500 psi), with paragraph (d)(2) limitations and paragraph (f) examples. Federal regulation, public domain, transcribed. The competent person on site governs.",
  example: oshaTimberTrenchShoringExample.inputs,
  fields: [
    { key: "soil_type", label: "Soil type (Appendix A)", kind: "select", options: [
      { value: "A", label: "Type A" }, { value: "B", label: "Type B" }, { value: "C", label: "Type C" },
    ], default: "A" },
    { key: "depth_ft", label: "Trench depth (ft, 5 to 20)", default: 13 },
    { key: "width_ft", label: "Trench width (ft, up to 15)", default: 5 },
    { key: "table_set", label: "Timber table set", kind: "select", options: [
      { value: "oak", label: "Actual-size mixed oak (Tables C-1)" },
      { value: "fir", label: "Nominal S4S Douglas fir (Tables C-2)" },
    ], default: "oak" },
    { key: "crossbrace_spacing", label: "Crossbrace horizontal spacing", kind: "select", options: [
      { value: "all", label: "Show all arrangements" },
      { value: "6", label: "Up to 6 ft" }, { value: "8", label: "Up to 8 ft" },
      { value: "10", label: "Up to 10 ft" }, { value: "12", label: "Up to 12 ft" },
    ], default: "all" },
    { key: "limitation_present", label: "Any (d)(2)(ii) limitation present (heavy surcharge, equipment over 20,000 lb, load on crossbraces, partly sloped trench)", kind: "select", options: [
      { value: "no", label: "No" }, { value: "yes", label: "Yes" },
    ], default: "no" },
  ],
  outputs: [
    { key: "v", id: "otts-out-v", label: "Lookup", value: (r) => r.verdict },
    { key: "p", id: "otts-out-p", label: "Design pressure (table basis)", value: (r) => fmt(r.design_pressure_psf, 0) + " psf at " + fmt(r.depth_ft, 1) + " ft" },
    { key: "a", id: "otts-out-a", label: "Acceptable arrangements", value: (r) => r.arrangements_text },
    { key: "load", id: "otts-out-load", label: "Crossbrace load", value: (r) => r.arrangement_count ? fmt(r.first_crossbrace_load_lb, 0) + " lb for the first arrangement; up to " + fmt(r.max_crossbrace_load_lb, 0) + " lb" : "-" },
    { key: "lim", id: "otts-out-lim", label: "Limitations", value: (r) => r.limitation_flag + (r.misprint_flag ? ". " + r.misprint_flag : "") },
    { key: "n", id: "otts-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeOshaTimberTrenchShoring,
});

// ===================== spec-v1903: relief supply pallet floor load =====================

// dims: in { pallet_weight_lb: M L T^-2, footprint_length_in: L, footprint_width_in: L, tiers: dimensionless, coverage_fraction: dimensionless, floor_area_sqft: L^2, design_live_load_psf: M L^-1 T^-2 } out: { footprint_area_sqft: L^2, footprint_psf: M L^-1 T^-2, average_psf: M L^-1 T^-2, footprint_ratio: dimensionless, average_ratio: dimensionless, pallets_allowed: dimensionless, stack_positions: dimensionless }
export function computeReliefStorageFloorLoad({ pallet_weight_lb = 2300, footprint_length_in = 48, footprint_width_in = 40, tiers = 2, coverage_fraction = 0.6, floor_area_sqft = 4800, design_live_load_psf = 100 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pallet_weight_lb > 0)) return { error: "Pallet gross weight must be positive." };
  if (!(footprint_length_in > 0) || !(footprint_width_in > 0)) return { error: "Pallet footprint dimensions must be positive." };
  if (!(Number.isInteger(tiers) && tiers >= 1)) return { error: "Tiers stacked must be a whole number of at least 1." };
  if (!(coverage_fraction >= 0 && coverage_fraction <= 1)) return { error: "Coverage fraction must be between 0 and 1." };
  if (!(floor_area_sqft > 0)) return { error: "Floor area must be positive." };
  if (!(design_live_load_psf > 0)) return { error: "Design live load must be positive (from the drawings, or the occupancy's ASCE 7 Table 4.3-1 / IBC Table 1607.1 value)." };
  const footprint_area_sqft = footprint_length_in * footprint_width_in / _SQIN_PER_SQFT;
  const stack_weight_lb = pallet_weight_lb * tiers;
  const footprint_psf = stack_weight_lb / footprint_area_sqft;
  const average_psf = footprint_psf * coverage_fraction;
  const footprint_ratio = footprint_psf / design_live_load_psf;
  const average_ratio = average_psf / design_live_load_psf;
  const pallets_allowed = Math.floor(floor_area_sqft * design_live_load_psf / pallet_weight_lb);
  const stacks_allowed = Math.floor(floor_area_sqft * design_live_load_psf / stack_weight_lb);
  const stack_positions = Math.floor(floor_area_sqft * coverage_fraction / footprint_area_sqft);
  return {
    footprint_area_sqft, stack_weight_lb, footprint_psf, average_psf, footprint_ratio, average_ratio,
    pallets_allowed, stacks_allowed, stack_positions, tiers,
    average_verdict: average_ratio <= 1 ? "within the design live load on average" : "OVER the design live load on average -- reduce tiers, widen aisles, or move the storage",
    footprint_verdict: footprint_ratio <= 1 ? "the pressure under a stack is within the design live load" : "the pressure under each stack is " + footprint_ratio.toFixed(1) + " times the design live load -- a local concentration a thin slab or wood floor feels",
    note: "A floor's design live load is a uniform pressure over the whole bay, and stacked pallets are neither uniform nor spread. The tile reports the area average, which is the number comparable to the design load, and the pressure directly under a stack, which a thin slab or a wood floor feels locally. Bottled water is usually the heaviest thing a relief operation stores, about a ton a pallet, and double-stacking doubles the local pressure without changing the footprint. The design live load is the building's: a gym, an office, a church hall, and a school corridor were designed for different loads, and the governing number is on the structural drawings; where they are unavailable the occupancy's uniform live load in ASCE 7 Table 4.3-1 or IBC Table 1607.1 is the starting point, entered here and not reproduced. Aisles lower the average and are not optional, so coverage is an input. The allowed-pallet count is an upper bound before aisles and concentration. Storage in a space not designed for it is a change of use a structural engineer should review. This does not determine the floor's actual capacity, forklift or pallet-jack wheel loads, rack posts, punching shear, slab-on-grade subgrade capacity, or disaster damage, and it does not size racks (rack-upright-capacity-derate). A structural engineer and the building official govern.",
  };
}
export const reliefStorageFloorLoadExample = { inputs: { pallet_weight_lb: 2300, footprint_length_in: 48, footprint_width_in: 40, tiers: 2, coverage_fraction: 0.6, floor_area_sqft: 4800, design_live_load_psf: 100 } };
USAR_RENDERERS["relief-storage-floor-load"] = _simpleRenderer({
  citation: "Citation: statics (stack weight over footprint area; area average by coverage fraction) against the floor's design live load, entered from the building's structural drawings or, where unknown, the occupancy's uniform live load in ASCE 7 Table 4.3-1 / IBC Table 1607.1, cited by number and not reproduced. A structural engineer and the building official govern.",
  example: reliefStorageFloorLoadExample.inputs,
  fields: [
    { key: "pallet_weight_lb", label: "Pallet gross weight (lb)", default: 2300 },
    { key: "footprint_length_in", label: "Pallet length (in)", default: 48 },
    { key: "footprint_width_in", label: "Pallet width (in)", default: 40 },
    { key: "tiers", label: "Tiers stacked", default: 2, attrs: { step: "1", min: "1" } },
    { key: "coverage_fraction", label: "Coverage fraction (pallet area / floor area, aisles included)", default: 0.6, attrs: { step: "any", min: "0", max: "1" } },
    { key: "floor_area_sqft", label: "Floor area (sq ft)", default: 4800 },
    { key: "design_live_load_psf", label: "Floor design live load (psf, from the drawings)", default: 100 },
  ],
  outputs: [
    { key: "fp", id: "rsf-out-fp", label: "Pressure under a stack", value: (r) => fmt(r.footprint_psf, 1) + " psf (" + fmt(r.footprint_ratio, 2) + " x design) -- " + r.footprint_verdict },
    { key: "avg", id: "rsf-out-avg", label: "Area-average pressure", value: (r) => fmt(r.average_psf, 1) + " psf (" + fmt(r.average_ratio, 2) + " x design) -- " + r.average_verdict },
    { key: "cnt", id: "rsf-out-cnt", label: "Upper-bound pallet count", value: (r) => fmt(r.pallets_allowed, 0) + " pallets (" + fmt(r.stacks_allowed, 0) + " stacks of " + fmt(r.tiers, 0) + "); " + fmt(r.stack_positions, 0) + " stack positions at the entered coverage" },
    { key: "n", id: "rsf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeReliefStorageFloorLoad,
});
