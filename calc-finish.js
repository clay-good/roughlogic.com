// Group E (cont.): finish-and-site-carpentry take-off bench.
// spec-v95 establishes this new lazy-loaded renderer module (the natural
// home the spec-v94 module note named) for interior-finish and site-work
// take-offs, relieving the standing calc-construction.js cap watch instead
// of bumping that module again. Every tile keeps group: "E" (a tile's
// group letter is independent of the module that holds it -- the
// spec-v70..v89 split precedent). Tiles:
//   v95 thinset-coverage, flooring-takeoff   (interior finish)
//   v97 paver-patio, retaining-wall-block     (hardscape / site)
//   v98 attic-ventilation, gutter-downspout   (roofing trim-out)
// All GOVERNANCE.general material take-offs; the retaining-wall tile
// carries an engineered-design advisory above 4 ft. See spec-v95.md..v98.md.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input (copied
// verbatim from the sibling calc-* modules; non-exported, no corpus row).
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

// Compact renderer factory (same shape as the kitchen/stage _r and the
// trucking/construction _simpleRenderer factories) supporting number and
// select inputs.
function _simpleRenderer(spec) {
  return function (inputRegion, outputRegion, citationEl) {
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
}

export const FINISH_RENDERERS = {};

// ===================== spec-v95: tile + flooring take-off =====================

const _THINSET_COVERAGE = { quarter: 95, quarter_three_eighths: 63, half: 45 }; // sq ft per 50-lb bag by square-notch trowel
// dims: in { area_sqft: L^2, trowel: dimensionless, coverage_per_bag: L^2, bag_weight_lb: M, waste_pct: dimensionless } out: { cov_per_bag: L^2, order_area: L^2, bags: dimensionless }
export function computeThinsetCoverage({ area_sqft = 0, trowel = "quarter_three_eighths", coverage_per_bag = 0, bag_weight_lb = 50, waste_pct = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (waste_pct < 0) return { error: "Waste must be non-negative." };
  if (!(area_sqft > 0)) return { error: "Area must be positive." };
  if (!(bag_weight_lb > 0)) return { error: "Bag weight must be positive." };
  // The trowel-notch coverage table is per 50-lb bag; a different bag weight
  // carries proportionally more/less mortar, so scale the table value by
  // bag_weight/50. A user-entered coverage override is taken as the coverage
  // for their actual bag and is not re-scaled.
  const cov_per_bag = coverage_per_bag > 0
    ? coverage_per_bag
    : _THINSET_COVERAGE[trowel] * (bag_weight_lb / 50);
  if (!(cov_per_bag > 0)) return { error: "Choose a trowel size or enter a per-bag coverage." };
  const order_area = area_sqft * (1 + waste_pct / 100);
  return {
    cov_per_bag, order_area, bags: Math.ceil(order_area / cov_per_bag),
    note: "Thin-set coverage is set by the trowel notch, not the tile - a 1/4 in square notch spreads about 95 sq ft per 50-lb bag, a 1/4 x 3/8 in notch about 63, and a 1/2 in notch about 45. Large or uneven tile wants a deeper notch and back-buttering, which cuts coverage further. The code wants about 80% mortar contact in dry areas and 95% in wet or exterior, so do not stretch a bag. This is the setting mortar - tile-count gives the tile and grout, mortar-mix is masonry mortar.",
  };
}
const thinsetCoverageExample = { inputs: { area_sqft: 200, trowel: "quarter_three_eighths", coverage_per_bag: 0, bag_weight_lb: 50, waste_pct: 10 } };
FINISH_RENDERERS["thinset-coverage"] = _simpleRenderer({
  citation: "Citation: Manufacturer thin-set coverage charts (Custom Building Products / Mapei / Laticrete, by name); ANSI A108 mortar-contact minimum. Coverage is per 50-lb bag by square-notch trowel.",
  example: thinsetCoverageExample.inputs,
  fields: [
    { key: "area_sqft", label: "Area to tile (sq ft)", kind: "number" },
    { key: "trowel", label: "Square-notch trowel", kind: "select", options: [
      { value: "quarter", label: "1/4 in (~95 sq ft/bag)" },
      { value: "quarter_three_eighths", label: "1/4 x 3/8 in (~63 sq ft/bag)" },
      { value: "half", label: "1/2 in (~45 sq ft/bag)" },
    ] },
    { key: "coverage_per_bag", label: "Coverage override (sq ft/bag, optional)", kind: "number" },
    { key: "bag_weight_lb", label: "Bag weight (lb)", kind: "number", default: 50 },
    { key: "waste_pct", label: "Waste (%)", kind: "number", default: 10 },
  ],
  outputs: [
    { key: "c", id: "tsc-out-c", label: "Coverage per bag", value: (r) => fmt(r.cov_per_bag, 0) + " sq ft" },
    { key: "o", id: "tsc-out-o", label: "Order area (w/ waste)", value: (r) => fmt(r.order_area, 0) + " sq ft" },
    { key: "b", id: "tsc-out-b", label: "Bags", value: (r) => String(r.bags) },
    { key: "n", id: "tsc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeThinsetCoverage,
});

const _FLOORING_WASTE = { straight: 10, diagonal: 15, herringbone: 17 }; // percent by install pattern
// dims: in { room_length_ft: L, room_width_ft: L, box_coverage_sqft: L^2, pattern: dimensionless, waste_pct: dimensionless, plank_width_in: L } out: { order_area: L^2, boxes: dimensionless, full_rows: dimensionless, remainder: L }
export function computeFlooringTakeoff({ room_length_ft = 0, room_width_ft = 0, box_coverage_sqft = 20, pattern = "straight", waste_pct = 0, plank_width_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (waste_pct < 0) return { error: "Waste must be non-negative." };
  if (!(room_length_ft > 0) || !(room_width_ft > 0)) return { error: "Room dimensions must be positive." };
  if (!(box_coverage_sqft > 0)) return { error: "Box coverage must be positive." };
  const field_area = room_length_ft * room_width_ft;
  const waste = waste_pct > 0 ? waste_pct : _FLOORING_WASTE[pattern];
  if (!(waste > 0)) return { error: "Choose an install pattern or enter a waste percent." };
  const order_area = field_area * (1 + waste / 100);
  const boxes = Math.ceil(order_area / box_coverage_sqft);
  let full_rows = null, remainder = null, rip_needed = null, start_width = null;
  if (plank_width_in > 0) {
    const width_in = room_width_ft * 12;
    full_rows = Math.floor(width_in / plank_width_in);
    remainder = width_in - full_rows * plank_width_in;
    rip_needed = remainder > 0 && remainder < plank_width_in / 3;
    start_width = rip_needed ? (remainder + plank_width_in) / 2 : plank_width_in;
  }
  return {
    field_area, waste, order_area, boxes, full_rows, remainder, rip_needed, start_width,
    note: "Order the field area plus a waste allowance set by the pattern - about 10% straight, 15% on a 45-degree diagonal, 17% for herringbone, because every angled plank gets a miter cut and the drop-offs do not reuse. Add a few points more for many doorways and obstacles. Floating floors need a 1/4 to 3/8 in expansion gap at the perimeter. If the last row would come out narrower than about a third of a plank, rip the first row so the room starts and ends on matching widths.",
  };
}
const flooringTakeoffExample = { inputs: { room_length_ft: 15, room_width_ft: 12, box_coverage_sqft: 20, pattern: "straight", waste_pct: 0, plank_width_in: 7.5 } };
FINISH_RENDERERS["flooring-takeoff"] = _simpleRenderer({
  citation: "Citation: Published flooring waste rules of thumb (10% straight / 15% diagonal / 17% herringbone) and the standard last-row balancing rule (rip the first row when the last would be under a third of a plank).",
  example: flooringTakeoffExample.inputs,
  fields: [
    { key: "room_length_ft", label: "Room length (ft)", kind: "number" },
    { key: "room_width_ft", label: "Room width (ft)", kind: "number" },
    { key: "box_coverage_sqft", label: "Coverage per box (sq ft)", kind: "number", default: 20 },
    { key: "pattern", label: "Install pattern", kind: "select", options: [
      { value: "straight", label: "Straight (10%)" },
      { value: "diagonal", label: "45-degree diagonal (15%)" },
      { value: "herringbone", label: "Herringbone (17%)" },
    ] },
    { key: "waste_pct", label: "Waste override (%, optional)", kind: "number" },
    { key: "plank_width_in", label: "Plank width (in, optional)", kind: "number" },
  ],
  outputs: [
    { key: "f", id: "flt-out-f", label: "Field area", value: (r) => fmt(r.field_area, 0) + " sq ft" },
    { key: "o", id: "flt-out-o", label: "Order area", value: (r) => fmt(r.order_area, 0) + " sq ft (" + fmt(r.waste, 0) + "% waste)" },
    { key: "b", id: "flt-out-b", label: "Boxes", value: (r) => String(r.boxes) },
    { key: "r", id: "flt-out-r", label: "Last row", value: (r) => r.full_rows === null ? "-" : r.full_rows + " full rows, " + fmt(r.remainder, 2) + " in left" + (r.rip_needed ? " - rip first row to " + fmt(r.start_width, 2) + " in" : " (no rip needed)") },
    { key: "n", id: "flt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFlooringTakeoff,
});

// ===================== spec-v97: hardscape take-off =====================

// dims: in { area_sqft: L^2, paver_length_in: L, paver_width_in: L, base_depth_in: L, sand_depth_in: L, waste_pct: dimensionless } out: { pavers_per_sqft: dimensionless, pavers: dimensionless, base_cuyd: L^3, sand_cuyd: L^3 }
export function computePaverPatio({ area_sqft = 0, paver_length_in = 0, paver_width_in = 0, base_depth_in = 6, sand_depth_in = 1, waste_pct = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (base_depth_in < 0 || sand_depth_in < 0 || waste_pct < 0) return { error: "Depth and waste inputs must be non-negative." };
  if (!(area_sqft > 0)) return { error: "Patio area must be positive." };
  if (!(paver_length_in > 0) || !(paver_width_in > 0)) return { error: "Paver dimensions must be positive." };
  const pavers_per_sqft = 144 / (paver_length_in * paver_width_in);
  const pavers = Math.ceil(area_sqft * pavers_per_sqft * (1 + waste_pct / 100));
  return {
    pavers_per_sqft, pavers,
    base_cuyd: area_sqft * base_depth_in / 324,
    sand_cuyd: area_sqft * sand_depth_in / 324,
    note: "Pavers per square foot are 144 over the face area in square inches (a 4 x 8 in paver is 4.5 per sq ft). Add about 5% for cuts on a straight pattern and nearer 10% for herringbone, diagonals, and curves. The base carries the load - about 4-6 in compacted for a walkway or patio and 8-12 in for a driveway, over about 1 in of bedding sand. Cubic yards are the area times the depth in inches over 324. Aggregate is ordered loose, so add roughly 10-15% over these in-place volumes for compaction.",
  };
}
const paverPatioExample = { inputs: { area_sqft: 200, paver_length_in: 8, paver_width_in: 4, base_depth_in: 6, sand_depth_in: 1, waste_pct: 5 } };
FINISH_RENDERERS["paver-patio"] = _simpleRenderer({
  citation: "Citation: ICPI interlocking-paver base and bedding guidance (by name). Pavers/sq ft = 144 / face area; cu yd = area x depth(in) / 324.",
  example: paverPatioExample.inputs,
  fields: [
    { key: "area_sqft", label: "Patio area (sq ft)", kind: "number" },
    { key: "paver_length_in", label: "Paver length (in)", kind: "number" },
    { key: "paver_width_in", label: "Paver width (in)", kind: "number" },
    { key: "base_depth_in", label: "Base depth (in)", kind: "number", default: 6 },
    { key: "sand_depth_in", label: "Bedding sand (in)", kind: "number", default: 1 },
    { key: "waste_pct", label: "Cut allowance (%)", kind: "number", default: 5 },
  ],
  outputs: [
    { key: "p", id: "pp-out-p", label: "Pavers per sq ft", value: (r) => fmt(r.pavers_per_sqft, 2) },
    { key: "c", id: "pp-out-c", label: "Pavers (w/ waste)", value: (r) => String(r.pavers) },
    { key: "b", id: "pp-out-b", label: "Base aggregate", value: (r) => fmt(r.base_cuyd, 2) + " cu yd" },
    { key: "s", id: "pp-out-s", label: "Bedding sand", value: (r) => fmt(r.sand_cuyd, 2) + " cu yd" },
    { key: "n", id: "pp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePaverPatio,
});

// dims: in { wall_length_ft: L, exposed_height_ft: L, block_length_in: L, block_height_in: L } out: { courses: dimensionless, total_blocks: dimensionless, base_cuyd: L^3, drain_cuyd: L^3 }
export function computeRetainingWallBlock({ wall_length_ft = 0, exposed_height_ft = 0, block_length_in = 18, block_height_in = 8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(wall_length_ft > 0)) return { error: "Wall run must be positive." };
  if (!(exposed_height_ft > 0)) return { error: "Exposed height must be positive." };
  if (!(block_length_in > 0) || !(block_height_in > 0)) return { error: "Block dimensions must be positive." };
  const buried_in = Math.max(exposed_height_ft * 1.0, block_height_in); // 1 in per ft, >= one course
  const total_height_in = exposed_height_ft * 12 + buried_in;
  const courses = Math.ceil(total_height_in / block_height_in);
  const blocks_per_row = Math.ceil(wall_length_ft * 12 / block_length_in);
  return {
    blocks_per_row, courses,
    total_blocks: courses * blocks_per_row,
    cap_blocks: blocks_per_row,
    base_cuyd: wall_length_ft * 2.0 * 0.5 / 27,
    drain_cuyd: wall_length_ft * 1.0 * (total_height_in / 12) / 27,
    over_4ft: exposed_height_ft > 4,
    note: "Bury the first course about 1 in for every 1 ft of wall height (at least one full course) so the wall has a footing in the ground. Lay a compacted leveling pad about 2 ft wide and 6 in deep of crushed stone. Backfill a drainage zone of clean gravel about 12 in wide behind the block for the full height, with a perforated drain at the toe vented to daylight. Cap the top course with adhesive. A wall over about 4 ft, or any wall with a slope or load above it, needs an engineered design with geogrid - this tile counts material, it does not design the wall.",
  };
}
const retainingWallBlockExample = { inputs: { wall_length_ft: 30, exposed_height_ft: 3, block_length_in: 18, block_height_in: 8 } };
FINISH_RENDERERS["retaining-wall-block"] = _simpleRenderer({
  citation: "Citation: Segmental retaining-wall maker guidance (Allan Block / Versa-Lok, by name). Bury ~1 in per ft of height; 2 ft x 6 in base pad; 12 in drainage zone. Over 4 ft needs an engineered design.",
  example: retainingWallBlockExample.inputs,
  fields: [
    { key: "wall_length_ft", label: "Wall run (ft)", kind: "number" },
    { key: "exposed_height_ft", label: "Exposed height (ft)", kind: "number" },
    { key: "block_length_in", label: "Block face length (in)", kind: "number", default: 18 },
    { key: "block_height_in", label: "Block face height (in)", kind: "number", default: 8 },
  ],
  outputs: [
    { key: "r", id: "rwb-out-r", label: "Blocks per course", value: (r) => String(r.blocks_per_row) },
    { key: "c", id: "rwb-out-c", label: "Courses", value: (r) => String(r.courses) },
    { key: "t", id: "rwb-out-t", label: "Total blocks", value: (r) => r.total_blocks + " (+ " + r.cap_blocks + " caps)" },
    { key: "g", id: "rwb-out-g", label: "Gravel", value: (r) => fmt(r.base_cuyd, 2) + " cu yd base, " + fmt(r.drain_cuyd, 2) + " cu yd drainage" },
    { key: "a", id: "rwb-out-a", label: "Advisory", value: (r) => r.over_4ft ? "Over 4 ft - engineered design + geogrid required" : "Under 4 ft - no engineered design flagged" },
    { key: "n", id: "rwb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRetainingWallBlock,
});

// ===================== spec-v98: roofing trim-out =====================

const _ATTIC_DIVISOR = { "150": 150, "300": 300 };
// dims: in { attic_floor_area_sqft: L^2, ratio: dimensionless, intake_vent_nfa_sqin: L^2, ridge_nfa_per_lf_sqin: L^2 } out: { nfa_sqin: L^2, intake_vents: dimensionless, ridge_lf: L }
export function computeAtticVentilation({ attic_floor_area_sqft = 0, ratio = "150", intake_vent_nfa_sqin = 9, ridge_nfa_per_lf_sqin = 18 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (intake_vent_nfa_sqin < 0 || ridge_nfa_per_lf_sqin < 0) return { error: "Vent net free areas must be non-negative." };
  if (!(attic_floor_area_sqft > 0)) return { error: "Attic floor area must be positive." };
  const divisor = _ATTIC_DIVISOR[ratio];
  if (!(divisor > 0)) return { error: "Choose the 1/150 or 1/300 ratio." };
  const nfa_sqft = attic_floor_area_sqft / divisor;
  const nfa_sqin = nfa_sqft * 144;
  const intake_sqin = nfa_sqin / 2;
  const exhaust_sqin = nfa_sqin / 2;
  return {
    nfa_sqft, nfa_sqin, intake_sqin, exhaust_sqin,
    intake_vents: intake_vent_nfa_sqin > 0 ? Math.ceil(intake_sqin / intake_vent_nfa_sqin) : null,
    ridge_lf: ridge_nfa_per_lf_sqin > 0 ? exhaust_sqin / ridge_nfa_per_lf_sqin : null,
    note: "The IRC wants a net free vent area of 1/150 of the attic floor, dropping to 1/300 only when intake and exhaust are balanced (about half and half, with 40-50% of the area as upper vents near the ridge) and a vapor retarder is present. Split the area evenly between low intake (soffit) and high exhaust (ridge), and never let exhaust exceed intake or it will pull air from the house. Vents are rated in net free area (sq in) on the label, far less than the gross opening. 144 sq in per sq ft.",
  };
}
const atticVentilationExample = { inputs: { attic_floor_area_sqft: 1500, ratio: "150", intake_vent_nfa_sqin: 9, ridge_nfa_per_lf_sqin: 18 } };
FINISH_RENDERERS["attic-ventilation"] = _simpleRenderer({
  citation: "Citation: IRC R806 attic-ventilation rule (1/150, reducible to 1/300 with a balanced split + vapor retarder, by name). 144 sq in per sq ft; vents rated in net free area.",
  example: atticVentilationExample.inputs,
  fields: [
    { key: "attic_floor_area_sqft", label: "Attic floor area (sq ft)", kind: "number" },
    { key: "ratio", label: "Code ratio", kind: "select", options: [
      { value: "150", label: "1/150 (standard)" },
      { value: "300", label: "1/300 (balanced + vapor retarder)" },
    ] },
    { key: "intake_vent_nfa_sqin", label: "Soffit vent NFA (sq in)", kind: "number", default: 9 },
    { key: "ridge_nfa_per_lf_sqin", label: "Ridge vent NFA (sq in/ft)", kind: "number", default: 18 },
  ],
  outputs: [
    { key: "a", id: "av-out-a", label: "Required net free area", value: (r) => fmt(r.nfa_sqft, 2) + " sq ft (" + fmt(r.nfa_sqin, 0) + " sq in)" },
    { key: "i", id: "av-out-i", label: "Intake / exhaust", value: (r) => fmt(r.intake_sqin, 0) + " / " + fmt(r.exhaust_sqin, 0) + " sq in" },
    { key: "v", id: "av-out-v", label: "Soffit vents", value: (r) => r.intake_vents === null ? "-" : String(r.intake_vents) },
    { key: "r", id: "av-out-r", label: "Ridge vent", value: (r) => r.ridge_lf === null ? "-" : fmt(r.ridge_lf, 1) + " ft" },
    { key: "n", id: "av-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAtticVentilation,
});

const _GUTTER_PITCH = { "1.00": 1.0, "1.05": 1.05, "1.10": 1.1, "1.20": 1.2, "1.30": 1.3 };
// dims: in { roof_area_sqft: L^2, pitch_factor: dimensionless, rainfall_in_hr: L, downspout_sqin: L^2 } out: { adjusted_area: L^2, downspout_total_sqin: L^2, downspouts: dimensionless }
export function computeGutterDownspout({ roof_area_sqft = 0, pitch_factor = "1.00", rainfall_in_hr = 5, downspout_sqin = 12 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(roof_area_sqft > 0)) return { error: "Roof area must be positive." };
  const pf = typeof pitch_factor === "string" ? (_GUTTER_PITCH[pitch_factor] !== undefined ? _GUTTER_PITCH[pitch_factor] : Number(pitch_factor)) : pitch_factor;
  if (!(pf > 0)) return { error: "Choose a roof-pitch factor." };
  if (!(rainfall_in_hr > 0)) return { error: "Rainfall intensity must be positive." };
  if (!(downspout_sqin > 0)) return { error: "Downspout cross-section must be positive." };
  const adjusted_area = roof_area_sqft * pf * (rainfall_in_hr / 5);
  const downspout_total_sqin = adjusted_area / 100;
  return {
    adjusted_area, downspout_total_sqin,
    downspouts: Math.ceil(downspout_total_sqin / downspout_sqin),
    gutter_size: adjusted_area <= 5520 ? "5 in K-style" : "6 in K-style",
    note: "Scale the plan roof area by the pitch (a steeper roof catches more wind-driven rain - about 1.05 at 4/12 up to 1.30 at 12/12) and by the local rainfall intensity against a 5 in/hr reference. A 5 in K-style gutter handles roughly 5,500 sq ft of adjusted area and a 6 in handles more. Size one square inch of downspout per about 100 sq ft of roof (a 2x3 is 6 sq in, a 3x4 is 12). Put at least two outlets on any run longer than about 60 ft.",
  };
}
const gutterDownspoutExample = { inputs: { roof_area_sqft: 1200, pitch_factor: "1.10", rainfall_in_hr: 5, downspout_sqin: 12 } };
FINISH_RENDERERS["gutter-downspout"] = _simpleRenderer({
  citation: "Citation: SMACNA / standard residential gutter method (by name). Adjusted area = plan area x pitch factor x (rainfall / 5 in/hr); 1 sq in of downspout per ~100 sq ft of roof.",
  example: gutterDownspoutExample.inputs,
  fields: [
    { key: "roof_area_sqft", label: "Plan roof area (sq ft)", kind: "number" },
    { key: "pitch_factor", label: "Roof-pitch factor", kind: "select", options: [
      { value: "1.00", label: "<=3/12 (1.00)" },
      { value: "1.05", label: "4-5/12 (1.05)" },
      { value: "1.10", label: "6-8/12 (1.10)" },
      { value: "1.20", label: "9-11/12 (1.20)" },
      { value: "1.30", label: "12/12+ (1.30)" },
    ] },
    { key: "rainfall_in_hr", label: "Rainfall (in/hr)", kind: "number", default: 5 },
    { key: "downspout_sqin", label: "Downspout (sq in)", kind: "number", default: 12 },
  ],
  outputs: [
    { key: "a", id: "gd-out-a", label: "Adjusted roof area", value: (r) => fmt(r.adjusted_area, 0) + " sq ft" },
    { key: "g", id: "gd-out-g", label: "Recommended gutter", value: (r) => r.gutter_size },
    { key: "t", id: "gd-out-t", label: "Downspout cross-section", value: (r) => fmt(r.downspout_total_sqin, 2) + " sq in total" },
    { key: "d", id: "gd-out-d", label: "Downspouts", value: (r) => String(r.downspouts) },
    { key: "n", id: "gd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGutterDownspout,
});

// ===================== spec-v789: deck board and fastener takeoff =====================
// Boards run the length; their count is set by the width they cover (allowing the gap
// between boards, none after the last): N = ceil((width_in + gap) / (face + gap)).
// dims: in { deck_width_ft: L, deck_length_ft: L, board_face_width_in: L, gap_in: L, joist_spacing_in: L, waste_pct: dimensionless } out: { boards: dimensionless, lineal_ft: L, joists: dimensionless, screws: dimensionless }
export function computeDeckBoardTakeoff({ deck_width_ft = 0, deck_length_ft = 0, board_face_width_in = 5.5, gap_in = 0.25, joist_spacing_in = 16, waste_pct = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const W = Number(deck_width_ft) || 0;
  const L = Number(deck_length_ft) || 0;
  const face = Number(board_face_width_in) || 0;
  const gap = Number(gap_in) || 0;
  const spacing = Number(joist_spacing_in) || 0;
  const waste = Number(waste_pct) || 0;
  if (!(W > 0)) return { error: "Deck width must be positive (ft)." };
  if (!(L > 0)) return { error: "Deck length must be positive (ft)." };
  if (!(face > 0)) return { error: "Board face width must be positive (in)." };
  if (gap < 0) return { error: "Board gap cannot be negative (in)." };
  if (!(spacing > 0)) return { error: "Joist spacing must be positive (in)." };
  if (waste < 0) return { error: "Waste percent cannot be negative." };
  const width_in = W * 12;
  const boards = Math.ceil((width_in + gap) / (face + gap));
  const lineal_ft = boards * L * (1 + waste / 100);
  const joists = Math.ceil(L * 12 / spacing) + 1;
  const screws = boards * joists * 2;
  if (![boards, lineal_ft, joists, screws].every(Number.isFinite)) return { error: "Deck-takeoff math is not a finite value." };
  return {
    boards, lineal_ft, joists, screws, waste_pct: waste,
    note: "Deck surface takeoff: the boards run the length, so the count across the width is ceil((width + gap) / (board face + gap)) -- the gap falls between boards, not after the last. Lineal feet = boards x length x (1 + waste); order full-length boards for a clean look (butt joints must land on a joist and are staggered), and the waste covers cutoffs, culls, and the crook you set aside. Joists carrying the deck run across the width at the given spacing, so their count along the length is ceil(length x 12 / spacing) + 1, and two deck screws (or hidden clips) per board at every joist gives boards x joists x 2 fasteners. This is the surface only -- it does not size the joists, beam, posts, or footings, which come from the span tables and the load. A takeoff estimate; the deck plan and the lumber on the rack govern.",
  };
}
const deckBoardTakeoffExample = { inputs: { deck_width_ft: 12, deck_length_ft: 16, board_face_width_in: 5.5, gap_in: 0.25, joist_spacing_in: 16, waste_pct: 10 } };
FINISH_RENDERERS["deck-board-takeoff"] = _simpleRenderer({
  citation: "Citation: deck board and fastener takeoff (first-principles carpentry takeoff): boards = ceil((width_in + gap) / (face + gap)); lineal_ft = boards x length x (1 + waste); joists = ceil(length x 12 / spacing) + 1; screws = boards x joists x 2. The gap falls between boards, not after the last; butt joints land on a joist and are staggered. Sizes the surface only, not the joists / beam / posts / footings. A takeoff estimate; the deck plan governs.",
  example: deckBoardTakeoffExample.inputs,
  fields: [
    { key: "deck_width_ft", label: "Deck width across the boards (ft)", kind: "number" },
    { key: "deck_length_ft", label: "Board run length (ft)", kind: "number" },
    { key: "board_face_width_in", label: "Board face width (in, 5.5 for 5/4x6 or 2x6)", kind: "number", default: 5.5 },
    { key: "gap_in", label: "Gap between boards (in)", kind: "number", default: 0.25 },
    { key: "joist_spacing_in", label: "Joist spacing on center (in)", kind: "number", default: 16 },
    { key: "waste_pct", label: "Waste (%)", kind: "number", default: 10 },
  ],
  outputs: [
    { key: "b", id: "deck-out-b", label: "Deck boards", value: (r) => String(r.boards) + " boards across" },
    { key: "l", id: "deck-out-l", label: "Lineal feet (with waste)", value: (r) => fmt(r.lineal_ft, 0) + " lf" },
    { key: "j", id: "deck-out-j", label: "Joists carrying the deck", value: (r) => String(r.joists) },
    { key: "s", id: "deck-out-s", label: "Deck screws (2 per board per joist)", value: (r) => fmt(r.screws, 0) },
    { key: "n", id: "deck-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDeckBoardTakeoff,
});

// ===================== spec-v798: flat glass lite weight for handling =====================
// Density x volume. Soda-lime float glass is SG 2.50 = 156.1 lb/ft^3, i.e. ~13.0 lb/ft^2 per inch of
// thickness. weight = 156.1 x area(ft^2) x thickness(in)/12 x panes.
// dims: in { width_in: L, height_in: L, thickness_in: L, panes: dimensionless } out: { area_ft2: L^2, weight_lb: M, weight_per_ft2: M L^-2 }
export function computeGlassWeight({ width_in = 0, height_in = 0, thickness_in = 0, panes = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(width_in) || 0;
  const h = Number(height_in) || 0;
  const t = Number(thickness_in) || 0;
  const n = Number(panes) || 0;
  if (!(w > 0)) return { error: "Width must be positive (in)." };
  if (!(h > 0)) return { error: "Height must be positive (in)." };
  if (!(t > 0)) return { error: "Thickness must be positive (in)." };
  if (!(n >= 1)) return { error: "Number of panes must be at least 1." };
  const area_ft2 = (w * h) / 144;
  const weight_per_ft2 = 156.1 * (t / 12);
  const per_pane_lb = area_ft2 * weight_per_ft2;
  const weight_lb = per_pane_lb * n;
  if (![area_ft2, weight_lb].every(Number.isFinite)) return { error: "Glass-weight math is not a finite value." };
  const two_person = weight_lb > 50;
  return {
    area_ft2, weight_lb, per_pane_lb, weight_per_ft2, two_person,
    note: "Flat-glass weight for handling: glass weighs its density times its volume, and soda-lime float glass (the standard window glass) runs about 13.0 lb per square foot per inch of thickness (specific gravity 2.50, 156.1 lb/ft^3), so a lite weighs 13.0 x thickness(in) x area(ft^2). Tempering and heat-strengthening do NOT change the weight (same glass, rearranged stress); an insulating unit (IGU) is the sum of its lites, and a laminated lite adds a thin plastic interlayer that is close enough to ignore for a lift estimate. This sizes the two-person or vacuum-cup lift and checks it against a suction lifter's rating -- OSHA and most shops flag a manual lift above about 50 lb per person. The 13.0 figure carries a ~1% material tolerance (published tables run 13.0-13.1). A handling estimate; the glass type, the lifter's rating, and safe-lifting practice govern.",
  };
}
export const glassWeightExample = { inputs: { width_in: 60, height_in: 40, thickness_in: 0.25, panes: 1 } };
FINISH_RENDERERS["glass-weight"] = _simpleRenderer({
  citation: "Citation: flat glass lite weight (NGA Glazing Manual glass-weight table; ASTM C1036 flat glass): weight = 156.1 lb/ft^3 x area(ft^2) x thickness(in)/12, i.e. ~13.0 lb/ft^2 per inch for soda-lime float (SG 2.50). Tempering does not change the weight; an IGU is the sum of its lites. Sizes the two-person / vacuum-cup lift. A handling estimate; the glass type and the lifter's rating govern.",
  example: glassWeightExample.inputs,
  fields: [
    { key: "width_in", label: "Width (in)", kind: "number", default: 60 },
    { key: "height_in", label: "Height (in)", kind: "number", default: 40 },
    { key: "thickness_in", label: "Thickness (in, e.g. 0.25 for 1/4\")", kind: "number", default: 0.25 },
    { key: "panes", label: "Identical panes (1 lite; 2 for an equal IGU)", kind: "number", default: 1 },
  ],
  outputs: [
    { key: "a", id: "glw-out-a", label: "Area", value: (r) => fmt(r.area_ft2, 2) + " ft^2" },
    { key: "w", id: "glw-out-w", label: "Weight", value: (r) => fmt(r.weight_lb, 1) + " lb" + (r.two_person ? " -- over ~50 lb, use two people or a lifter" : "") },
    { key: "p", id: "glw-out-p", label: "Per square foot", value: (r) => fmt(r.weight_per_ft2, 2) + " lb/ft^2" },
    { key: "n", id: "glw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGlassWeight,
});

// gutter-downspout-takeoff (spec-v900): gutter LF and downspout count takeoff.
// dims: in { eave_length_ft: L, roof_area_sf: L^2, max_area_per_downspout_sf: L^2, wall_height_ft: L, hanger_spacing_ft: L } out: { gutter_lf: L, downspouts: dimensionless, downspout_pipe_lf: L, hangers: dimensionless }
export function computeGutterDownspoutTakeoff({ eave_length_ft = 140, roof_area_sf = 2400, max_area_per_downspout_sf = 800, wall_height_ft = 10, hanger_spacing_ft = 2 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(eave_length_ft > 0)) return { error: "Eave length must be positive (ft)." };
  if (!(roof_area_sf > 0)) return { error: "Roof area must be positive (ft^2)." };
  if (!(max_area_per_downspout_sf > 0)) return { error: "Area per downspout must be positive (ft^2)." };
  if (!(wall_height_ft > 0)) return { error: "Wall height must be positive (ft)." };
  if (!(hanger_spacing_ft > 0)) return { error: "Hanger spacing must be positive (ft)." };
  const gutter_lf = eave_length_ft;
  const downspouts = Math.ceil(roof_area_sf / max_area_per_downspout_sf);
  const downspout_pipe_lf = downspouts * wall_height_ft;
  const hangers = Math.ceil(eave_length_ft / hanger_spacing_ft);
  if (![gutter_lf, downspouts, downspout_pipe_lf, hangers].every(Number.isFinite)) return { error: "Gutter-takeoff math is not a finite value." };
  return {
    gutter_lf,
    downspouts,
    downspout_pipe_lf,
    hangers,
    note: "The maximum drainage area per downspout comes from the gutter and downspout size and the rainfall (from gutter-downspout -- entered here). The gutter runs the eave; hangers go about every 2 ft (tighter in snow country). Distinct from the cross-section sizing in gutter-downspout.",
  };
}

const gutterDownspoutTakeoffExample = { inputs: { eave_length_ft: 140, roof_area_sf: 2400, max_area_per_downspout_sf: 800, wall_height_ft: 10, hanger_spacing_ft: 2 } };
FINISH_RENDERERS["gutter-downspout-takeoff"] = _simpleRenderer({
  citation: "Citation: takeoff identity by name. gutter = eave; downspouts = ceil(roof area / max area per downspout); pipe = downspouts x wall height; hangers = ceil(eave / spacing). The area per downspout comes from gutter-downspout.",
  example: gutterDownspoutTakeoffExample.inputs,
  fields: [
    { key: "eave_length_ft", label: "Total eave / gutter length (ft)", kind: "number", default: 140 },
    { key: "roof_area_sf", label: "Tributary roof area (ft^2)", kind: "number", default: 2400 },
    { key: "max_area_per_downspout_sf", label: "Max area per downspout (ft^2)", kind: "number", default: 800 },
    { key: "wall_height_ft", label: "Downspout drop height (ft)", kind: "number", default: 10 },
    { key: "hanger_spacing_ft", label: "Gutter hanger spacing (ft)", kind: "number", default: 2 },
  ],
  outputs: [
    { key: "g", id: "gdt-out-g", label: "Gutter footage", value: (r) => fmt(r.gutter_lf, 0) + " LF" },
    { key: "d", id: "gdt-out-d", label: "Downspouts", value: (r) => fmt(r.downspouts, 0) + " downspouts (" + fmt(r.downspout_pipe_lf, 0) + " LF pipe)" },
    { key: "h", id: "gdt-out-h", label: "Gutter hangers", value: (r) => fmt(r.hangers, 0) + " hangers" },
    { key: "n", id: "gdt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGutterDownspoutTakeoff,
});

// soffit-ridge-vent-count (spec-v907): soffit vent and ridge-vent count from required NFA.
// dims: in { attic_area_sf: L^2, vent_ratio: dimensionless, soffit_vent_nfa_in2: L^2, ridge_nfa_per_ft_in2: L } out: { total_nfa_in2: L^2, intake_nfa_in2: L^2, exhaust_nfa_in2: L^2, soffit_vents: dimensionless, ridge_lf: L }
export function computeSoffitRidgeVentCount({ attic_area_sf = 1500, vent_ratio = 300, soffit_vent_nfa_in2 = 26, ridge_nfa_per_ft_in2 = 18 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(attic_area_sf > 0)) return { error: "Attic area must be positive (ft^2)." };
  if (!(vent_ratio > 0)) return { error: "Vent ratio must be positive." };
  if (!(soffit_vent_nfa_in2 > 0)) return { error: "Per-vent NFA must be positive (in^2)." };
  if (!(ridge_nfa_per_ft_in2 > 0)) return { error: "Ridge NFA per foot must be positive (in^2/ft)." };
  const total_nfa_in2 = attic_area_sf / vent_ratio * 144;
  const intake_nfa_in2 = total_nfa_in2 / 2;
  const exhaust_nfa_in2 = total_nfa_in2 / 2;
  const soffit_vents = Math.ceil(intake_nfa_in2 / soffit_vent_nfa_in2);
  const ridge_lf = Math.ceil(exhaust_nfa_in2 / ridge_nfa_per_ft_in2);
  if (![total_nfa_in2, intake_nfa_in2, exhaust_nfa_in2, soffit_vents, ridge_lf].every(Number.isFinite)) return { error: "Vent-count math is not a finite value." };
  return {
    total_nfa_in2,
    intake_nfa_in2,
    exhaust_nfa_in2,
    soffit_vents,
    ridge_lf,
    note: "The required NFA and the 1/300 (balanced, with a vapor retarder) or 1/150 ratio come from the IRC (attic-ventilation gives the NFA). The product NFA per vent and per foot of ridge come from the manufacturer (entered here). Intake should meet or exceed exhaust. Distinct from the required-NFA attic-ventilation.",
  };
}

const soffitRidgeVentCountExample = { inputs: { attic_area_sf: 1500, vent_ratio: 300, soffit_vent_nfa_in2: 26, ridge_nfa_per_ft_in2: 18 } };
FINISH_RENDERERS["soffit-ridge-vent-count"] = _simpleRenderer({
  citation: "Citation: vent-count identity by name. total NFA = attic area / ratio x 144; intake = exhaust = total / 2; soffit vents = ceil(intake / per-vent NFA); ridge = ceil(exhaust / ridge NFA per ft). The ratio comes from the IRC; the product NFA from the manufacturer.",
  example: soffitRidgeVentCountExample.inputs,
  fields: [
    { key: "attic_area_sf", label: "Attic floor area (ft^2)", kind: "number", default: 1500 },
    { key: "vent_ratio", label: "NFA ratio denominator (1/N)", kind: "number", default: 300 },
    { key: "soffit_vent_nfa_in2", label: "NFA per soffit vent (in^2)", kind: "number", default: 26 },
    { key: "ridge_nfa_per_ft_in2", label: "NFA per foot of ridge vent (in^2/ft)", kind: "number", default: 18 },
  ],
  outputs: [
    { key: "n", id: "srv-out-n", label: "Total net free area", value: (r) => fmt(r.total_nfa_in2, 0) + " in^2 (" + fmt(r.intake_nfa_in2, 0) + " each way)" },
    { key: "s", id: "srv-out-s", label: "Soffit (intake) vents", value: (r) => fmt(r.soffit_vents, 0) + " vents" },
    { key: "r", id: "srv-out-r", label: "Ridge (exhaust) vent", value: (r) => fmt(r.ridge_lf, 0) + " LF" },
    { key: "note", id: "srv-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeSoffitRidgeVentCount,
});
