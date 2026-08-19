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
export const thinsetCoverageExample = { inputs: { area_sqft: 200, trowel: "quarter_three_eighths", coverage_per_bag: 0, bag_weight_lb: 50, waste_pct: 10 } };
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
    { key: "bag_weight_lb", label: "Bag weight (lb)", kind: "number" },
    { key: "waste_pct", label: "Waste (%)", kind: "number" },
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
export const flooringTakeoffExample = { inputs: { room_length_ft: 15, room_width_ft: 12, box_coverage_sqft: 20, pattern: "straight", waste_pct: 0, plank_width_in: 7.5 } };
FINISH_RENDERERS["flooring-takeoff"] = _simpleRenderer({
  citation: "Citation: Published flooring waste rules of thumb (10% straight / 15% diagonal / 17% herringbone) and the standard last-row balancing rule (rip the first row when the last would be under a third of a plank).",
  example: flooringTakeoffExample.inputs,
  fields: [
    { key: "room_length_ft", label: "Room length (ft)", kind: "number" },
    { key: "room_width_ft", label: "Room width (ft)", kind: "number" },
    { key: "box_coverage_sqft", label: "Coverage per box (sq ft)", kind: "number" },
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
export const paverPatioExample = { inputs: { area_sqft: 200, paver_length_in: 8, paver_width_in: 4, base_depth_in: 6, sand_depth_in: 1, waste_pct: 5 } };
FINISH_RENDERERS["paver-patio"] = _simpleRenderer({
  citation: "Citation: ICPI interlocking-paver base and bedding guidance (by name). Pavers/sq ft = 144 / face area; cu yd = area x depth(in) / 324.",
  example: paverPatioExample.inputs,
  fields: [
    { key: "area_sqft", label: "Patio area (sq ft)", kind: "number" },
    { key: "paver_length_in", label: "Paver length (in)", kind: "number" },
    { key: "paver_width_in", label: "Paver width (in)", kind: "number" },
    { key: "base_depth_in", label: "Base depth (in)", kind: "number" },
    { key: "sand_depth_in", label: "Bedding sand (in)", kind: "number" },
    { key: "waste_pct", label: "Cut allowance (%)", kind: "number" },
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
export const retainingWallBlockExample = { inputs: { wall_length_ft: 30, exposed_height_ft: 3, block_length_in: 18, block_height_in: 8 } };
FINISH_RENDERERS["retaining-wall-block"] = _simpleRenderer({
  citation: "Citation: Segmental retaining-wall maker guidance (Allan Block / Versa-Lok, by name). Bury ~1 in per ft of height; 2 ft x 6 in base pad; 12 in drainage zone. Over 4 ft needs an engineered design.",
  example: retainingWallBlockExample.inputs,
  fields: [
    { key: "wall_length_ft", label: "Wall run (ft)", kind: "number" },
    { key: "exposed_height_ft", label: "Exposed height (ft)", kind: "number" },
    { key: "block_length_in", label: "Block face length (in)", kind: "number" },
    { key: "block_height_in", label: "Block face height (in)", kind: "number" },
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
export const atticVentilationExample = { inputs: { attic_floor_area_sqft: 1500, ratio: "150", intake_vent_nfa_sqin: 9, ridge_nfa_per_lf_sqin: 18 } };
FINISH_RENDERERS["attic-ventilation"] = _simpleRenderer({
  citation: "Citation: IRC R806 attic-ventilation rule (1/150, reducible to 1/300 with a balanced split + vapor retarder, by name). 144 sq in per sq ft; vents rated in net free area.",
  example: atticVentilationExample.inputs,
  fields: [
    { key: "attic_floor_area_sqft", label: "Attic floor area (sq ft)", kind: "number" },
    { key: "ratio", label: "Code ratio", kind: "select", options: [
      { value: "150", label: "1/150 (standard)" },
      { value: "300", label: "1/300 (balanced + vapor retarder)" },
    ] },
    { key: "intake_vent_nfa_sqin", label: "Soffit vent NFA (sq in)", kind: "number" },
    { key: "ridge_nfa_per_lf_sqin", label: "Ridge vent NFA (sq in/ft)", kind: "number" },
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
export const gutterDownspoutExample = { inputs: { roof_area_sqft: 1200, pitch_factor: "1.10", rainfall_in_hr: 5, downspout_sqin: 12 } };
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
    { key: "rainfall_in_hr", label: "Rainfall (in/hr)", kind: "number" },
    { key: "downspout_sqin", label: "Downspout (sq in)", kind: "number" },
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
export const deckBoardTakeoffExample = { inputs: { deck_width_ft: 12, deck_length_ft: 16, board_face_width_in: 5.5, gap_in: 0.25, joist_spacing_in: 16, waste_pct: 10 } };
FINISH_RENDERERS["deck-board-takeoff"] = _simpleRenderer({
  citation: "Citation: deck board and fastener takeoff (first-principles carpentry takeoff): boards = ceil((width_in + gap) / (face + gap)); lineal_ft = boards x length x (1 + waste); joists = ceil(length x 12 / spacing) + 1; screws = boards x joists x 2. The gap falls between boards, not after the last; butt joints land on a joist and are staggered. Sizes the surface only, not the joists / beam / posts / footings. A takeoff estimate; the deck plan governs.",
  example: deckBoardTakeoffExample.inputs,
  fields: [
    { key: "deck_width_ft", label: "Deck width across the boards (ft)", kind: "number" },
    { key: "deck_length_ft", label: "Board run length (ft)", kind: "number" },
    { key: "board_face_width_in", label: "Board face width (in, 5.5 for 5/4x6 or 2x6)", kind: "number" },
    { key: "gap_in", label: "Gap between boards (in)", kind: "number" },
    { key: "joist_spacing_in", label: "Joist spacing on center (in)", kind: "number" },
    { key: "waste_pct", label: "Waste (%)", kind: "number" },
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
    { key: "width_in", label: "Width (in)", kind: "number" },
    { key: "height_in", label: "Height (in)", kind: "number" },
    { key: "thickness_in", label: "Thickness (in, e.g. 0.25 for 1/4\")", kind: "number" },
    { key: "panes", label: "Identical panes (1 lite; 2 for an equal IGU)", kind: "number" },
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

export const gutterDownspoutTakeoffExample = { inputs: { eave_length_ft: 140, roof_area_sf: 2400, max_area_per_downspout_sf: 800, wall_height_ft: 10, hanger_spacing_ft: 2 } };
FINISH_RENDERERS["gutter-downspout-takeoff"] = _simpleRenderer({
  citation: "Citation: takeoff identity by name. gutter = eave; downspouts = ceil(roof area / max area per downspout); pipe = downspouts x wall height; hangers = ceil(eave / spacing). The area per downspout comes from gutter-downspout.",
  example: gutterDownspoutTakeoffExample.inputs,
  fields: [
    { key: "eave_length_ft", label: "Total eave / gutter length (ft)", kind: "number" },
    { key: "roof_area_sf", label: "Tributary roof area (ft²)", kind: "number" },
    { key: "max_area_per_downspout_sf", label: "Max area per downspout (ft²)", kind: "number" },
    { key: "wall_height_ft", label: "Downspout drop height (ft)", kind: "number" },
    { key: "hanger_spacing_ft", label: "Gutter hanger spacing (ft)", kind: "number" },
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

export const soffitRidgeVentCountExample = { inputs: { attic_area_sf: 1500, vent_ratio: 300, soffit_vent_nfa_in2: 26, ridge_nfa_per_ft_in2: 18 } };
FINISH_RENDERERS["soffit-ridge-vent-count"] = _simpleRenderer({
  citation: "Citation: vent-count identity by name. total NFA = attic area / ratio x 144; intake = exhaust = total / 2; soffit vents = ceil(intake / per-vent NFA); ridge = ceil(exhaust / ridge NFA per ft). The ratio comes from the IRC; the product NFA from the manufacturer.",
  example: soffitRidgeVentCountExample.inputs,
  fields: [
    { key: "attic_area_sf", label: "Attic floor area (ft²)", kind: "number" },
    { key: "vent_ratio", label: "NFA ratio denominator (1/N)", kind: "number" },
    { key: "soffit_vent_nfa_in2", label: "NFA per soffit vent (in²)", kind: "number" },
    { key: "ridge_nfa_per_ft_in2", label: "NFA per foot of ridge vent (in²/ft)", kind: "number" },
  ],
  outputs: [
    { key: "n", id: "srv-out-n", label: "Total net free area", value: (r) => fmt(r.total_nfa_in2, 0) + " in^2 (" + fmt(r.intake_nfa_in2, 0) + " each way)" },
    { key: "s", id: "srv-out-s", label: "Soffit (intake) vents", value: (r) => fmt(r.soffit_vents, 0) + " vents" },
    { key: "r", id: "srv-out-r", label: "Ridge (exhaust) vent", value: (r) => fmt(r.ridge_lf, 0) + " LF" },
    { key: "note", id: "srv-out-note", label: "Note", value: (r) => r.note },
  ],
  compute: computeSoffitRidgeVentCount,
});

// ===================== spec-v920: cement board (tile backer) takeoff =====================
// dims: in { area_sf: L^2, sheet_area_sf: L^2, waste_pct: dimensionless, screws_per_sheet: dimensionless } out: { sheets: dimensionless, screws: dimensionless }
export function computeCementBoardTakeoff({ area_sf = 120, sheet_area_sf = 15, waste_pct = 10, screws_per_sheet = 35 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(area_sf > 0)) return { error: "Area must be positive (sf)." };
  if (!(sheet_area_sf > 0)) return { error: "Sheet area must be positive (sf)." };
  if (waste_pct < 0) return { error: "Waste cannot be negative (percent)." };
  if (!(screws_per_sheet > 0)) return { error: "Screws per sheet must be positive." };
  const sheets = Math.ceil(area_sf * (100 + waste_pct) / 100 / sheet_area_sf);
  const screws = sheets * Math.round(screws_per_sheet);
  if (![sheets, screws].every(Number.isFinite)) return { error: "Takeoff math is not a finite value." };
  return {
    sheets,
    screws,
    note: "Cement-board (tile backer) sheet and screw takeoff for a tub surround, wall, or floor: sheets = ceil(area x (1 + waste) / sheet area); a 3x5 ft board is 15 sf, a 3x4 is 12 sf. Fasteners run about every 8 in on the field and edges -- roughly 30 to 40 corrosion-resistant backer screws (or roofing nails) per 3x5 sheet. Add alkali-resistant mesh tape and thin-set at the joints (not counted here), and set the board over a moisture barrier per the wet-area detail. A material-ordering estimate; ANSI A108 / the TCNA Handbook and the board manufacturer govern the fastener schedule and the wet-area assembly.",
  };
}
export const cementBoardTakeoffExample = { inputs: { area_sf: 120, sheet_area_sf: 15, waste_pct: 10, screws_per_sheet: 35 } };

FINISH_RENDERERS["cement-board-takeoff"] = _simpleRenderer({
  citation: "Citation: cement-board takeoff by name. sheets = ceil(area x (1 + waste) / sheet area); screws = sheets x per-sheet (~30-40 at 8 in o.c.). Plus mesh tape and thin-set at joints (not counted). ANSI A108 / TCNA Handbook and the board maker govern the fastener schedule and wet-area assembly.",
  example: cementBoardTakeoffExample.inputs,
  fields: [
    { key: "area_sf", label: "Backer area (sf)", kind: "number" },
    { key: "sheet_area_sf", label: "Sheet area (sf, 3x5 = 15)", kind: "number" },
    { key: "waste_pct", label: "Waste / cuts (%)", kind: "number" },
    { key: "screws_per_sheet", label: "Screws per sheet (~30-40)", kind: "number" },
  ],
  outputs: [
    { key: "s", id: "cbt-out-s", label: "Cement board sheets", value: (r) => fmt(r.sheets, 0) + " sheets" },
    { key: "sc", id: "cbt-out-sc", label: "Backer screws", value: (r) => fmt(r.screws, 0) + " screws" },
    { key: "n", id: "cbt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCementBoardTakeoff,
});

// ===================== spec-v966: roof step-flashing piece count =====================
// dims: in { args: dimensionless } out: { step_flashing_pieces: dimensionless, order_pieces: dimensionless }
export function computeStepFlashingCount({ wall_run_ft = 20, shingle_exposure_in = 5, waste_pct = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(wall_run_ft > 0)) return { error: "Sloped wall/chimney run must be positive (ft)." };
  if (!(shingle_exposure_in > 0)) return { error: "Shingle exposure must be positive (in)." };
  if (!(waste_pct >= 0)) return { error: "Waste percent cannot be negative." };
  // One step-flashing piece per shingle course along a roof-to-wall intersection, plus one to start.
  const step_flashing_pieces = Math.ceil(wall_run_ft * 12 / shingle_exposure_in) + 1;
  const order_pieces = Math.ceil(step_flashing_pieces * (1 + waste_pct / 100));
  if (![step_flashing_pieces, order_pieces].every(Number.isFinite)) return { error: "Step-flashing count math is not a finite value." };
  return {
    step_flashing_pieces,
    order_pieces,
    note: "The number of step-flashing pieces for a roof-to-wall or chimney sidewall intersection: one piece is woven into EACH shingle course as the roof rises along the wall, plus one to start, so pieces = ceil(sloped wall run x 12 / shingle exposure) + 1. A 20 ft sloped run against a wall with a 5 in exposure (standard 3-tab / architectural) takes ceil(240/5) + 1 = 49 pieces; a longer exposure means fewer, larger courses and fewer pieces. Order a few extra for waste and bad bends (a 5% adder here). Each L-shaped piece laps the one below by the exposure and tucks under the siding/counterflashing above the roof plane -- step flashing is woven course-by-course, NOT run as a single continuous piece (that is a different, leak-prone detail). A takeoff estimate; the shingle exposure, the flashing size, and the roofing manufacturer's and code (IRC R905.2.8.3) flashing details govern the install.",
  };
}

export const stepFlashingCountExample = { inputs: { wall_run_ft: 20, shingle_exposure_in: 5, waste_pct: 5 } };

FINISH_RENDERERS["step-flashing-count"] = _simpleRenderer({
  citation: "Citation: roof step-flashing piece count, by name. One piece per shingle course plus one: pieces = ceil(wall run x 12 / shingle exposure) + 1. Woven course-by-course (not a continuous piece); IRC R905.2.8.3 and the shingle/flashing manufacturer's details govern the install.",
  example: stepFlashingCountExample.inputs,
  fields: [
    { key: "wall_run_ft", label: "Sloped wall / chimney sidewall run (ft)", kind: "number" },
    { key: "shingle_exposure_in", label: "Shingle exposure (in, ~5)", kind: "number" },
    { key: "waste_pct", label: "Waste (percent)", kind: "number" },
  ],
  outputs: [
    { key: "p", id: "sfc-out-p", label: "Step-flashing pieces (one per course + 1)", value: (r) => String(r.step_flashing_pieces) + " pieces" },
    { key: "o", id: "sfc-out-o", label: "Order with waste", value: (r) => String(r.order_pieces) + " pieces" },
    { key: "n", id: "sfc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeStepFlashingCount,
});

// --- spec-v1025 E: Window / prehung-door rough opening (framing conventions) ---
// Window: RO = frame + 1/2 in each way (1/4-in shim per side). Prehung door: RO = SLAB + 2 in wide,
// + 2.5 in tall (jambs ~3/4 in each + shim; head jamb + floor clearance). Header rough length adds
// two 1.5-in jack studs. Conventions are the widely published defaults; the MANUFACTURER'S stated
// RO always governs when it differs - the tile says so and exposes the adders as inputs.
// dims: in { opening_type: dimensionless, unit_width_in: L, unit_height_in: L, width_adder_in: L, height_adder_in: L } out: { ro_width_in: L, ro_height_in: L, header_length_in: L }
export function computeRoughOpeningSize({ opening_type = "window", unit_width_in = 0, unit_height_in = 0, width_adder_in = -1, height_adder_in = -1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(unit_width_in) || 0;
  const h = Number(unit_height_in) || 0;
  let wa = Number(width_adder_in);
  let ha = Number(height_adder_in);
  if (!(w > 0)) return { error: "Unit width must be positive (in)." };
  if (!(h > 0)) return { error: "Unit height must be positive (in)." };
  if (opening_type !== "window" && opening_type !== "prehung-door") return { error: "Opening type must be window or prehung-door." };
  const isWindow = opening_type === "window";
  if (wa < 0) wa = isWindow ? 0.5 : 2.0;
  if (ha < 0) ha = isWindow ? 0.5 : 2.5;
  const ro_width_in = w + wa;
  const ro_height_in = h + ha;
  const header_length_in = ro_width_in + 3;
  if (![ro_width_in, ro_height_in, header_length_in].every(Number.isFinite)) return { error: "Rough-opening math did not produce a finite value." };
  return {
    ro_width_in, ro_height_in, header_length_in, wa_used: wa, ha_used: ha,
    note: (isWindow
      ? "Window convention: the RO runs 1/2 in over the FRAME outside dimension each way - a 1/4-in shim space per side for plumb, level, and square, plus room for backer rod or low-expansion foam. "
      : "Prehung-door convention: the RO runs 2 in over the SLAB width and 2.5 in over the slab height - that absorbs the two ~3/4-in jambs plus shim space, the head jamb, and floor clearance. Measure from the SLAB size (a 36 x 80 door wants a 38 x 82.5 RO), not the outside of the jambs. ")
      + "The header's rough length adds 3 in for two 1.5-in jack studs. THE MANUFACTURER'S STATED RO GOVERNS whenever it differs from the convention - check the spec sheet before framing, and override the adders here to match it. Out-of-plumb or out-of-level framing eats the shim space fast; frame square.",
  };
}
export const roughOpeningSizeExample = { inputs: { opening_type: "prehung-door", unit_width_in: 36, unit_height_in: 80, width_adder_in: -1, height_adder_in: -1 } };
FINISH_RENDERERS["rough-opening-size"] = _simpleRenderer({
  citation: "Citation: standard US framing conventions for rough openings - a window RO runs 1/2 in over the frame outside dimension each way (1/4-in shim space per side); a prehung door RO runs 2 in over the SLAB width and 2.5 in over the slab height (jambs + shim + floor clearance); the header rough length adds two 1.5-in jack studs. These are the widely published rules of thumb the trade frames to, and they are DEFAULTS only: the window or door manufacturer's stated rough opening governs whenever it differs, and the adders here are editable to match the spec sheet.",
  example: roughOpeningSizeExample.inputs,
  fields: [
    { key: "opening_type", label: "Opening type", kind: "select", options: [{ value: "prehung-door", label: "Prehung door (enter SLAB size)", selected: true }, { value: "window", label: "Window (enter FRAME outside dims)" }] },
    { key: "unit_width_in", label: "Unit width (in)", kind: "number" },
    { key: "unit_height_in", label: "Unit height (in)", kind: "number" },
    { key: "width_adder_in", label: "Width adder override (in, -1 = convention)", kind: "number" },
    { key: "height_adder_in", label: "Height adder override (in, -1 = convention)", kind: "number" },
  ],
  outputs: [
    { key: "row", id: "ros-out-w", label: "Rough opening width", value: (r) => fmt(r.ro_width_in, 2) + " in (+" + fmt(r.wa_used, 2) + ")" },
    { key: "roh", id: "ros-out-h", label: "Rough opening height", value: (r) => fmt(r.ro_height_in, 2) + " in (+" + fmt(r.ha_used, 2) + ")" },
    { key: "hdr", id: "ros-out-hdr", label: "Header rough length (RO + two jacks)", value: (r) => fmt(r.header_length_in, 2) + " in" },
    { key: "n", id: "ros-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRoughOpeningSize,
});

// --- spec-v1028 E: Closet rod and shelf takeoff ---
// Rod LF: single-hang walls take one rod, double-hang walls take two. Shelf LF: one shelf over
// every hang run plus linen stacks. Supports land at each end and every bracket_spacing_in between:
// count per run = ceil(run/spacing) + 1; double-hang runs carry two tiers, linen stacks one per
// shelf. Sticks/boards divide total LF by stock, with any single run longer than stock flagged
// (a rod or shelf spanning past stock needs a splice AT a support, which changes the buy).
// dims: in { single_hang_ft: L, double_hang_ft: L, linen_wall_ft: L, linen_shelf_count: dimensionless, bracket_spacing_in: L, stock_length_ft: L } out: { rod_lf: L, shelf_lf: L, rod_sticks: dimensionless, shelf_boards: dimensionless, brackets: dimensionless }
export function computeClosetShelfTakeoff({ single_hang_ft = 0, double_hang_ft = 0, linen_wall_ft = 0, linen_shelf_count = 4, bracket_spacing_in = 32, stock_length_ft = 8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const s = Number(single_hang_ft) || 0;
  const d = Number(double_hang_ft) || 0;
  const lw = Number(linen_wall_ft) || 0;
  const lc = Number(linen_shelf_count) || 0;
  const spacing = Number(bracket_spacing_in) || 0;
  const stock = Number(stock_length_ft) || 0;
  if (s < 0 || d < 0 || lw < 0) return { error: "Wall lengths cannot be negative (ft)." };
  if (s === 0 && d === 0 && lw === 0) return { error: "Enter at least one hang or linen wall length." };
  if (lw > 0 && !(lc >= 1 && Number.isInteger(lc))) return { error: "Linen shelf count must be a whole number of at least 1." };
  if (!(spacing > 0)) return { error: "Bracket spacing must be positive (in)." };
  if (!(stock > 0)) return { error: "Stock length must be positive (ft)." };
  const rod_lf = s + 2 * d;
  const shelf_lf = s + d + lw * (lw > 0 ? lc : 0);
  const perRun = (ft) => (ft > 0 ? Math.ceil((ft * 12) / spacing) + 1 : 0);
  const brackets = perRun(s) + 2 * perRun(d) + (lw > 0 ? lc * perRun(lw) : 0);
  const rod_sticks = Math.ceil(rod_lf / stock);
  const shelf_boards = Math.ceil(shelf_lf / stock);
  const longest_run_ft = Math.max(s, d, lw);
  const splice_needed = longest_run_ft > stock;
  if (![rod_lf, shelf_lf, rod_sticks, shelf_boards, brackets].every(Number.isFinite)) return { error: "Closet-takeoff math did not produce a finite value." };
  return {
    rod_lf, shelf_lf, rod_sticks, shelf_boards, brackets, splice_needed,
    note: (splice_needed ? "A run is LONGER than the stock length - the splice must land AT a support (never mid-span), which can add a stick beyond the straight division below. " : "")
      + "Single-hang walls take one rod and one shelf; double-hang walls take two rods (two bracket tiers) and one shelf; a linen wall takes its shelf count with supports under every shelf. Supports land at each end and every " + spacing + " in between - the middle bracket is what keeps a loaded 6-ft rod from smiling. Standard hang heights (66-in single; 40/80-in double; linen starting near 76 in and stacking down) are practice, not code. Wire shelving counts by the same wall lengths but its own bracket system; the manufacturer's span and support instructions govern.",
  };
}
export const closetShelfTakeoffExample = { inputs: { single_hang_ft: 6, double_hang_ft: 4, linen_wall_ft: 3, linen_shelf_count: 4, bracket_spacing_in: 32, stock_length_ft: 8 } };
FINISH_RENDERERS["closet-shelf-takeoff"] = _simpleRenderer({
  citation: "Citation: closet takeoff arithmetic - rod LF = single-hang + 2 x double-hang; shelf LF = one shelf per hang run + linen shelves; supports at each end and every entered spacing between (count per run = ceil(run/spacing) + 1), with double-hang runs carrying two tiers and linen stacks one per shelf; sticks and boards divide the totals by stock length, and a run longer than stock is flagged because the splice must land at a support. A counting aid; the shelving manufacturer's span and support instructions govern.",
  example: closetShelfTakeoffExample.inputs,
  fields: [
    { key: "single_hang_ft", label: "Single-hang wall length (ft)", kind: "number" },
    { key: "double_hang_ft", label: "Double-hang wall length (ft)", kind: "number", default: 0 },
    { key: "linen_wall_ft", label: "Linen wall length (ft)", kind: "number", default: 0 },
    { key: "linen_shelf_count", label: "Linen shelves (count)", kind: "number" },
    { key: "bracket_spacing_in", label: "Support spacing (in)", kind: "number" },
    { key: "stock_length_ft", label: "Stock length (ft)", kind: "number" },
  ],
  outputs: [
    { key: "rod", id: "cst-out-rod", label: "Rod", value: (r) => fmt(r.rod_lf, 0) + " ft (" + fmt(r.rod_sticks, 0) + " sticks)" + (r.splice_needed ? " - splice at a support" : "") },
    { key: "shf", id: "cst-out-shf", label: "Shelf", value: (r) => fmt(r.shelf_lf, 0) + " ft (" + fmt(r.shelf_boards, 0) + " boards)" },
    { key: "brk", id: "cst-out-brk", label: "Supports / brackets", value: (r) => fmt(r.brackets, 0) },
    { key: "n", id: "cst-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeClosetShelfTakeoff,
});

// --- spec-v1029 E: Stone countertop overhang support check ---
// Unsupported cantilever limit is the LESSER of the thickness rule (2 cm -> 6 in, 3 cm -> 10 in,
// the figures the stone-industry guidance publishes) and the one-third-of-total-depth rule that
// every source states alongside it. Past the limit the overhang needs corbels or steel: brackets
// at the entered spacing (24 in default), each extending about 2/3 of the overhang under the stone.
// Slab weight comes from an ENTERED density (170 pcf granite default), never a recalled table.
// dims: in { overhang_in: L, total_depth_in: L, thickness_cm: L, run_length_ft: L, bracket_spacing_in: L, density_pcf: M L^-3, unsupported_limit_override_in: L } out: { governing_limit_in: L, overhang_weight_plf: M T^-2, brackets: dimensionless, bracket_depth_in: L }
export function computeCountertopOverhangSupport({ overhang_in = 0, total_depth_in = 25.5, thickness_cm = 3, run_length_ft = 0, bracket_spacing_in = 24, density_pcf = 170, unsupported_limit_override_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const oh = Number(overhang_in) || 0;
  const depth = Number(total_depth_in) || 0;
  const th = Number(thickness_cm) || 0;
  const run = Number(run_length_ft) || 0;
  const spacing = Number(bracket_spacing_in) || 0;
  const dens = Number(density_pcf) || 0;
  const override = Number(unsupported_limit_override_in) || 0;
  if (!(oh > 0)) return { error: "Overhang must be positive (in)." };
  if (!(depth > 0)) return { error: "Total countertop depth must be positive (in)." };
  if (!(depth > oh)) return { error: "The overhang cannot equal or exceed the total depth - the top would have no bearing." };
  if (th !== 2 && th !== 3) return { error: "Thickness must be 2 or 3 (cm); enter an override limit for other materials." };
  if (!(run > 0)) return { error: "Overhang run length must be positive (ft)." };
  if (!(spacing > 0)) return { error: "Bracket spacing must be positive (in)." };
  if (!(dens > 0)) return { error: "Stone density must be positive (pcf)." };
  if (override < 0) return { error: "Limit override cannot be negative (in); use 0 to take the thickness rule." };
  const thickness_limit_in = override > 0 ? override : (th === 3 ? 10 : 6);
  const one_third_limit_in = depth / 3;
  const governing_limit_in = Math.min(thickness_limit_in, one_third_limit_in);
  const governing_rule = one_third_limit_in < thickness_limit_in ? "the one-third-of-depth rule" : "the thickness rule";
  const supported = oh <= governing_limit_in;
  const thickness_in = th * 0.393701;
  const psf = dens * thickness_in / 12;
  const overhang_weight_plf = psf * oh / 12;
  const overhang_weight_lb = overhang_weight_plf * run;
  const brackets = supported ? 0 : Math.ceil((run * 12) / spacing) + 1;
  const bracket_depth_in = supported ? 0 : (2 / 3) * oh;
  if (![governing_limit_in, overhang_weight_plf, overhang_weight_lb, brackets].every(Number.isFinite)) return { error: "Overhang-support math did not produce a finite value." };
  return {
    thickness_limit_in, one_third_limit_in, governing_limit_in, governing_rule, supported,
    psf, overhang_weight_plf, overhang_weight_lb, brackets, bracket_depth_in,
    note: (supported
      ? "This overhang is within the unsupported limit (" + governing_limit_in.toFixed(1) + " in, set by " + governing_rule + ") - no corbels required by the cantilever rule alone. "
      : "SUPPORT REQUIRED: the overhang exceeds the " + governing_limit_in.toFixed(1) + "-in unsupported limit set by " + governing_rule + ". Corbels or flush steel plates, fastened to studs or a load-bearing frame - not to cabinet boxes alone - and each running about " + bracket_depth_in.toFixed(1) + " in (two-thirds of the overhang) under the stone so the bracket carries the load rather than pivoting on its tip. ")
      + "The two rules are checked TOGETHER: the thickness limit and the one-third-of-depth limit, whichever is smaller. Weight comes from the density you enter (170 pcf is a common granite figure; quartz and marble differ, and dense stones run heavier), not a lookup. A seated person on a bar overhang is a point load this cantilever check does not cover, and a seam inside the overhang changes the problem entirely. The fabricator's own written support guideline and the slab manufacturer govern - published figures vary between them.",
  };
}
export const countertopOverhangSupportExample = { inputs: { overhang_in: 12, total_depth_in: 36, thickness_cm: 3, run_length_ft: 8, bracket_spacing_in: 24, density_pcf: 170, unsupported_limit_override_in: 0 } };
FINISH_RENDERERS["countertop-overhang-support"] = _simpleRenderer({
  citation: "Citation: stone-industry countertop support guidance - the unsupported cantilever is limited to the LESSER of the thickness rule (about 6 in for 2 cm, 10 in for 3 cm) and one-third of the total countertop depth; past that the overhang takes corbels or flush steel supports fastened to studs or a load-bearing frame, spaced at the entered interval (24 in default; published fabricator guidelines range roughly 18-36 in) and extending about two-thirds of the overhang under the stone. Slab weight is computed from the density you enter, not a recalled table. Published limits VARY between fabricators and stone types - the fabricator's own written guideline and the slab manufacturer govern.",
  example: countertopOverhangSupportExample.inputs,
  fields: [
    { key: "overhang_in", label: "Overhang beyond the cabinet (in)", kind: "number" },
    { key: "total_depth_in", label: "Total countertop depth (in)", kind: "number", default: 25.5 },
    { key: "thickness_cm", label: "Slab thickness", kind: "select", options: [{ value: "3", label: "3 cm (limit 10 in)", selected: true }, { value: "2", label: "2 cm (limit 6 in)" }] },
    { key: "run_length_ft", label: "Length of the overhang run (ft)", kind: "number" },
    { key: "bracket_spacing_in", label: "Bracket spacing (in)", kind: "number" },
    { key: "density_pcf", label: "Stone density (pcf)", kind: "number" },
    { key: "unsupported_limit_override_in", label: "Limit override (in, 0 = thickness rule)", kind: "number" },
  ],
  outputs: [
    { key: "lim", id: "cos-out-lim", label: "Unsupported limit (governing)", value: (r) => fmt(r.governing_limit_in, 1) + " in by " + r.governing_rule + " (thickness " + fmt(r.thickness_limit_in, 1) + ", depth/3 " + fmt(r.one_third_limit_in, 1) + ")" },
    { key: "res", id: "cos-out-res", label: "Result", value: (r) => (r.supported ? "OK unsupported" : "SUPPORT REQUIRED") },
    { key: "wt", id: "cos-out-wt", label: "Cantilevered weight", value: (r) => fmt(r.overhang_weight_plf, 1) + " lb per ft of run (" + fmt(r.overhang_weight_lb, 0) + " lb total; slab " + fmt(r.psf, 1) + " psf)" },
    { key: "brk", id: "cos-out-brk", label: "Brackets", value: (r) => (r.supported ? "none required by the cantilever rule" : fmt(r.brackets, 0) + " at " + fmt(r.bracket_depth_in, 1) + " in deep under the stone") },
    { key: "n", id: "cos-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCountertopOverhangSupport,
});

// --- spec-v1106 E: Kitchen cabinet linear-foot takeoff ---
// Cabinets are quoted by LINEAR FOOT of run, but the run a shop bills is not the wall length:
// corners consume depth from one leg, appliance openings come OUT, and fillers go IN. Base, wall,
// and tall runs are priced separately because their per-foot cost differs. Counts are reported in
// both linear feet and standard-width cabinet equivalents.
// dims: in { base_wall_ft: L, wall_cab_ft: L, tall_ft: L, appliance_openings_ft: L, corners: dimensionless, cabinet_depth_in: L, filler_per_corner_in: L, standard_width_in: L, toe_kick_height_in: L } out: { base_lf: L, wall_lf: L, tall_lf: L, total_lf: L, base_cabinets: dimensionless }
export function computeCabinetLinearFeet({ base_wall_ft = 0, wall_cab_ft = 0, tall_ft = 0, appliance_openings_ft = 0, corners = 0, cabinet_depth_in = 24, filler_per_corner_in = 3, standard_width_in = 24, toe_kick_height_in = 4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const baseRun = Number(base_wall_ft) || 0;
  const wallRun = Number(wall_cab_ft) || 0;
  const tallRun = Number(tall_ft) || 0;
  const appl = Number(appliance_openings_ft) || 0;
  const nCorner = Number(corners) || 0;
  const depth = Number(cabinet_depth_in) || 0;
  const filler = Number(filler_per_corner_in);
  const stdW = Number(standard_width_in) || 0;
  const toe = Number(toe_kick_height_in);
  if (baseRun < 0 || wallRun < 0 || tallRun < 0 || appl < 0) return { error: "Run lengths cannot be negative (ft)." };
  if (baseRun === 0 && wallRun === 0 && tallRun === 0) return { error: "Enter at least one run length (base, wall, or tall)." };
  if (!Number.isInteger(nCorner) || nCorner < 0) return { error: "Corner count must be a whole number (0 or more)." };
  if (!(depth > 0)) return { error: "Cabinet depth must be positive (in)." };
  if (!Number.isFinite(filler) || filler < 0) return { error: "Filler per corner cannot be negative (in)." };
  if (!(stdW > 0)) return { error: "Standard cabinet width must be positive (in)." };
  if (!Number.isFinite(toe) || toe < 0) return { error: "Toe-kick height cannot be negative (in)." };
  const corner_loss_ft = nCorner * depth / 12;
  const filler_ft = nCorner * filler / 12;
  const base_lf = Math.max(0, baseRun - appl - corner_loss_ft);
  if (base_lf === 0 && baseRun > 0) return { error: "Appliance openings and corner returns consume the entire base run - check the inputs." };
  const wall_lf = wallRun;
  const tall_lf = tallRun;
  const total_lf = base_lf + wall_lf + tall_lf;
  const base_cabinets = Math.ceil(base_lf * 12 / stdW);
  const wall_cabinets = Math.ceil(wall_lf * 12 / stdW);
  const tall_cabinets = Math.ceil(tall_lf * 12 / stdW);
  const countertop_lf = base_lf + corner_loss_ft;
  const toe_kick_lf = base_lf + tall_lf;
  const toe_kick_sf = toe_kick_lf * toe / 12;
  if (![base_lf, total_lf, base_cabinets, countertop_lf].every(Number.isFinite)) return { error: "Cabinet-takeoff math did not produce a finite value." };
  return {
    base_lf, wall_lf, tall_lf, total_lf, corner_loss_ft, filler_ft,
    base_cabinets, wall_cabinets, tall_cabinets, countertop_lf, toe_kick_lf, toe_kick_sf,
    note: "Cabinets are quoted by the linear foot of RUN, and the run a shop bills is not the wall length. Each inside corner eats one cabinet DEPTH off one of its two legs - " + corner_loss_ft.toFixed(2) + " ft here - because the two runs cannot both occupy the corner; that is why an L-kitchen measured wall-to-wall always over-counts. Appliance openings come OUT of the base run and fillers go IN, and fillers are the piece that saves a job: " + filler_ft.toFixed(2) + " ft of filler absorbs out-of-square walls and gives door and drawer clearance at corners and end walls, so order it even when the arithmetic closes. Base, wall, and tall are kept separate because they price differently per foot. Cabinet counts assume every box is the standard width entered; a real elevation mixes widths, so treat the count as a check on the linear feet, not as an order. Countertop runs the full corner (unlike the cabinets), so it is reported with the corner length added back. The shop drawing and the manufacturer's nominal sizes govern.",
  };
}
export const cabinetLinearFeetExample = { inputs: { base_wall_ft: 22, wall_cab_ft: 16, tall_ft: 3, appliance_openings_ft: 5, corners: 2, cabinet_depth_in: 24, filler_per_corner_in: 3, standard_width_in: 24, toe_kick_height_in: 4 } };
FINISH_RENDERERS["cabinet-linear-feet"] = _simpleRenderer({
  citation: "Citation: cabinet takeoff arithmetic. Cabinets are quoted per linear foot of run: base LF = wall run minus appliance openings minus one cabinet DEPTH per inside corner (the two legs cannot both occupy the corner), with filler added at corners and end walls. Wall and tall runs are kept separate because they price differently per foot. Cabinet counts divide by the standard width entered and are a check on the linear feet, not an order - a real elevation mixes widths. Countertop runs the full corner and is reported with the corner length added back. No manufacturer's size table is reproduced. The shop drawing and the manufacturer's nominal sizes govern.",
  example: cabinetLinearFeetExample.inputs,
  fields: [
    { key: "base_wall_ft", label: "Base cabinet wall run (ft)", kind: "number" },
    { key: "wall_cab_ft", label: "Upper / wall cabinet run (ft)", kind: "number", default: 0 },
    { key: "tall_ft", label: "Tall / pantry run (ft)", kind: "number", default: 0 },
    { key: "appliance_openings_ft", label: "Appliance openings in the base run (ft)", kind: "number", default: 0 },
    { key: "corners", label: "Inside corners (count)", kind: "number", default: 0 },
    { key: "cabinet_depth_in", label: "Base cabinet depth (in)", kind: "number" },
    { key: "filler_per_corner_in", label: "Filler per corner (in)", kind: "number" },
    { key: "standard_width_in", label: "Standard cabinet width (in)", kind: "number" },
    { key: "toe_kick_height_in", label: "Toe-kick height (in)", kind: "number" },
  ],
  outputs: [
    { key: "b", id: "clf-out-b", label: "Base LF (after openings and corners)", value: (r) => fmt(r.base_lf, 2) + " ft -- " + fmt(r.base_cabinets, 0) + " standard boxes" },
    { key: "w", id: "clf-out-w", label: "Wall / tall LF", value: (r) => fmt(r.wall_lf, 2) + " ft (" + fmt(r.wall_cabinets, 0) + ") / " + fmt(r.tall_lf, 2) + " ft (" + fmt(r.tall_cabinets, 0) + ")" },
    { key: "t", id: "clf-out-t", label: "Total quoted LF", value: (r) => fmt(r.total_lf, 2) + " ft" },
    { key: "c", id: "clf-out-c", label: "Corner loss / filler needed", value: (r) => fmt(r.corner_loss_ft, 2) + " ft lost to corners; " + fmt(r.filler_ft, 2) + " ft of filler" },
    { key: "x", id: "clf-out-x", label: "Countertop / toe kick", value: (r) => fmt(r.countertop_lf, 2) + " ft of top; " + fmt(r.toe_kick_lf, 2) + " ft of kick (" + fmt(r.toe_kick_sf, 1) + " sf)" },
    { key: "n", id: "clf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCabinetLinearFeet,
});

// --- spec-v1116 E: Roof drip edge rake/eave split and piece count ---
// roofing-squares returns drip_edge_lf as a bare passthrough of the entered perimeter, which hides
// the one thing that matters: RAKES run up the slope and eaves do not. A rake measured off the
// plan under-orders by the slope factor sqrt(1 + (rise/12)^2) - 12% on a 6:12, 20% on a 8:12. The
// two also take different profiles, so they are counted separately, and pieces account for the lap.
// dims: in { eave_length_ft: L, rake_run_ft: L, rake_count: dimensionless, pitch_rise_per_12: dimensionless, stock_length_ft: L, lap_in: L, waste_pct: dimensionless } out: { slope_factor: dimensionless, eave_lf: L, rake_lf: L, total_lf: L, pieces: dimensionless }
export function computeDripEdgeTakeoff({ eave_length_ft = 0, rake_run_ft = 0, rake_count = 0, pitch_rise_per_12 = 0, stock_length_ft = 10, lap_in = 2, waste_pct = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const eave = Number(eave_length_ft) || 0;
  const run = Number(rake_run_ft) || 0;
  const nRake = Number(rake_count) || 0;
  const rise = Number(pitch_rise_per_12);
  const stock = Number(stock_length_ft) || 0;
  const lap = Number(lap_in);
  const waste = Number(waste_pct);
  if (eave < 0 || run < 0) return { error: "Lengths cannot be negative (ft)." };
  if (!(eave > 0 || (run > 0 && nRake > 0))) return { error: "Enter an eave length, or a rake run with a rake count." };
  if (!Number.isInteger(nRake) || nRake < 0) return { error: "Rake count must be a whole number (0 or more)." };
  if (!Number.isFinite(rise) || rise < 0) return { error: "Pitch cannot be negative (rise per 12); use 0 for a flat run." };
  if (!(stock > 0)) return { error: "Stock length must be positive (ft)." };
  if (!Number.isFinite(lap) || lap < 0) return { error: "Lap cannot be negative (in)." };
  if (!(lap / 12 < stock)) return { error: "The lap is as long as a stick - check the lap and stock length." };
  if (!(waste >= 0 && waste <= 50)) return { error: "Waste must be 0-50 percent." };
  const slope_factor = Math.sqrt(1 + Math.pow(rise / 12, 2));
  const eave_lf = eave;
  const rake_plan_lf = nRake * run;
  const rake_lf = rake_plan_lf * slope_factor;
  const rake_slope_gain_lf = rake_lf - rake_plan_lf;
  const total_lf = eave_lf + rake_lf;
  const total_with_waste_lf = total_lf * (1 + waste / 100);
  const effective_piece_ft = stock - lap / 12;
  const pieces = Math.ceil(total_with_waste_lf / effective_piece_ft);
  const eave_pieces = eave_lf > 0 ? Math.ceil(eave_lf * (1 + waste / 100) / effective_piece_ft) : 0;
  const rake_pieces = rake_lf > 0 ? Math.ceil(rake_lf * (1 + waste / 100) / effective_piece_ft) : 0;
  if (![slope_factor, rake_lf, total_lf, pieces].every(Number.isFinite)) return { error: "Drip-edge math did not produce a finite value." };
  return {
    slope_factor, eave_lf, rake_plan_lf, rake_lf, rake_slope_gain_lf, total_lf,
    total_with_waste_lf, effective_piece_ft, pieces, eave_pieces, rake_pieces,
    note: "RAKES RUN UP THE SLOPE AND EAVES DO NOT, which is the whole reason to split them. Measuring a rake off the plan under-orders it by the slope factor - " + slope_factor.toFixed(4) + " at this pitch, so these rakes are " + rake_lf.toFixed(1) + " ft of metal against " + rake_plan_lf.toFixed(1) + " ft of plan dimension, " + rake_slope_gain_lf.toFixed(1) + " ft that a perimeter number silently loses. "
      + "Count them separately for a second reason: the profiles differ. Eave drip goes UNDER the underlayment so water leaving the shingles is carried past the fascia, while rake drip goes OVER it - installing either one the other way is a leak, and the two are different extrusions on most orders. "
      + "Pieces are figured on an effective length of " + effective_piece_ft.toFixed(2) + " ft after the " + lap + "-in lap, because every joint eats that lap. Valley metal, step flashing at walls, and the starter course are separate items - this counts only the drip edge at eaves and rakes. Hips and ridges carry no drip edge at all. The roofing plan and the manufacturer's installation instructions govern.",
  };
}
export const dripEdgeTakeoffExample = { inputs: { eave_length_ft: 80, rake_run_ft: 14, rake_count: 4, pitch_rise_per_12: 6, stock_length_ft: 10, lap_in: 2, waste_pct: 10 } };
FINISH_RENDERERS["drip-edge-takeoff"] = _simpleRenderer({
  citation: "Citation: roof drip-edge takeoff geometry. Eaves are horizontal so they take their plan length; RAKES run up the slope and take the slope factor sqrt(1 + (rise/12)^2), which a perimeter measurement misses. Pieces are figured on an effective stick length of the stock length minus the lap, since every joint consumes that lap. Eave and rake drip are different profiles and install opposite ways relative to the underlayment (eave under, rake over), which is why they are counted separately. Valley metal, step flashing, and starter course are separate items; hips and ridges take no drip edge. The roofing plan and the manufacturer's installation instructions govern.",
  example: dripEdgeTakeoffExample.inputs,
  fields: [
    { key: "eave_length_ft", label: "Total eave length (ft, plan)", kind: "number" },
    { key: "rake_run_ft", label: "Horizontal run of ONE rake (ft, plan)", kind: "number", default: 0 },
    { key: "rake_count", label: "Number of rakes", kind: "number", default: 0 },
    { key: "pitch_rise_per_12", label: "Roof pitch (rise per 12)", kind: "number" },
    { key: "stock_length_ft", label: "Stock length (ft)", kind: "number" },
    { key: "lap_in", label: "Lap at each joint (in)", kind: "number" },
    { key: "waste_pct", label: "Waste (%)", kind: "number" },
  ],
  outputs: [
    { key: "e", id: "det-out-e", label: "Eave drip edge", value: (r) => fmt(r.eave_lf, 1) + " ft (" + fmt(r.eave_pieces, 0) + " sticks)" },
    { key: "r", id: "det-out-r", label: "Rake drip edge", value: (r) => fmt(r.rake_lf, 1) + " ft (" + fmt(r.rake_pieces, 0) + " sticks) -- " + fmt(r.rake_slope_gain_lf, 1) + " ft more than the plan dimension" },
    { key: "s", id: "det-out-s", label: "Slope factor", value: (r) => fmt(r.slope_factor, 4) },
    { key: "t", id: "det-out-t", label: "Total", value: (r) => fmt(r.total_lf, 1) + " ft, " + fmt(r.total_with_waste_lf, 1) + " ft with waste, " + fmt(r.pieces, 0) + " sticks at " + fmt(r.effective_piece_ft, 2) + " ft effective" },
    { key: "n", id: "det-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDripEdgeTakeoff,
});

// --- spec-v1117 E: Valley flashing takeoff ---
// step-flashing-count is roof-to-WALL sidewall flashing; ice-barrier-coverage does eaves and says
// valley coverage is a separate manual add; hip-valley-rafter gives the framing length but no metal.
// The valley run multiplier is the same 17-inch-rule geometry, sqrt(pitch^2 + 288)/12 - computed
// inline rather than imported so no cross-module runtime dependency is created, with the bounds
// fuzzer pinning that it agrees with computeHipValleyRafter exactly.
// dims: in { valley_run_ft: L, valley_count: dimensionless, pitch_rise_per_12: dimensionless, metal_width_in: L, stock_length_ft: L, lap_in: L, waste_pct: dimensionless } out: { valley_multiplier: dimensionless, valley_length_ft: L, total_valley_lf: L, pieces: dimensionless, metal_area_sf: L^2 }
export function computeValleyFlashingTakeoff({ valley_run_ft = 0, valley_count = 1, pitch_rise_per_12 = 6, metal_width_in = 24, stock_length_ft = 10, lap_in = 6, waste_pct = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const run = Number(valley_run_ft) || 0;
  const n = Number(valley_count) || 0;
  const pitch = Number(pitch_rise_per_12);
  const width = Number(metal_width_in) || 0;
  const stock = Number(stock_length_ft) || 0;
  const lap = Number(lap_in);
  const waste = Number(waste_pct);
  if (!(run > 0)) return { error: "Valley run must be positive (ft) - the horizontal plan run of one valley." };
  if (!(n >= 1) || !Number.isInteger(n)) return { error: "Valley count must be a whole number of at least 1." };
  if (!Number.isFinite(pitch) || pitch <= 0) return { error: "Pitch must be positive (rise per 12) - a flat roof has no valley." };
  if (!(width > 0)) return { error: "Valley metal width must be positive (in)." };
  if (!(stock > 0)) return { error: "Stock length must be positive (ft)." };
  if (!Number.isFinite(lap) || lap < 0) return { error: "Lap cannot be negative (in)." };
  if (!(lap / 12 < stock)) return { error: "The lap is as long as a stick - check the lap and stock length." };
  if (!(waste >= 0 && waste <= 50)) return { error: "Waste must be 0-50 percent." };
  // The 17-inch rule: a valley runs diagonally in plan AND rises, so its multiplier carries 288
  // (two 12s squared) where a common rafter carries 144.
  const valley_multiplier = Math.sqrt(pitch * pitch + 288) / 12;
  const common_multiplier = Math.sqrt(pitch * pitch + 144) / 12;
  const valley_length_ft = run * valley_multiplier;
  const total_valley_lf = n * valley_length_ft;
  const total_with_waste_lf = total_valley_lf * (1 + waste / 100);
  const effective_piece_ft = stock - lap / 12;
  const pieces = Math.ceil(total_with_waste_lf / effective_piece_ft);
  const metal_area_sf = total_valley_lf * width / 12;
  const ice_barrier_sf = metal_area_sf;
  if (![valley_multiplier, valley_length_ft, pieces, metal_area_sf].every(Number.isFinite)) return { error: "Valley-flashing math did not produce a finite value." };
  return {
    valley_multiplier, common_multiplier, valley_length_ft, total_valley_lf,
    total_with_waste_lf, effective_piece_ft, pieces, metal_area_sf, ice_barrier_sf,
    note: "A valley is the longest run on the roof for its plan dimension, because it goes diagonally AND uphill at once: its multiplier carries 288 under the radical where a common rafter carries 144, so at this pitch a " + run + " ft plan run is " + valley_length_ft.toFixed(2) + " ft of valley against " + (run * common_multiplier).toFixed(2) + " ft of common rafter. Ordering valley metal off the plan dimension comes up badly short. "
      + "The lap on valley metal is generous on purpose - " + lap + " in here - because a valley concentrates the water from two planes into one channel and a short lap there is the leak that finds it. Run the metal from the eave UP, so each piece laps over the one below. "
      + "Ice barrier belongs in valleys in cold climates and the eave ice-barrier tile does not cover it: budget about " + ice_barrier_sf.toFixed(0) + " sq ft here at the same width as the metal, more if your code calls for wider valley coverage. Open valley (exposed metal) is assumed; a closed-cut or woven valley uses shingles instead of metal and this tile does not apply. Hips take no valley metal. The roofing plan and the manufacturer's instructions govern.",
  };
}
export const valleyFlashingTakeoffExample = { inputs: { valley_run_ft: 12, valley_count: 2, pitch_rise_per_12: 6, metal_width_in: 24, stock_length_ft: 10, lap_in: 6, waste_pct: 10 } };
FINISH_RENDERERS["valley-flashing-takeoff"] = _simpleRenderer({
  citation: "Citation: valley geometry by the framing-square 17-inch rule - a valley runs diagonally in plan and rises at the same time, so its length multiplier is sqrt(pitch^2 + 288)/12 where a common rafter's is sqrt(pitch^2 + 144)/12. Valley length = plan run x that multiplier; pieces are figured on the stock length minus the lap, since every joint consumes it; metal area = length x width. Open (exposed-metal) valley assumed - closed-cut and woven valleys use shingles and this does not apply. Ice barrier in valleys is called out because the eave ice-barrier tile does not cover it. The roofing plan and the manufacturer's installation instructions govern.",
  example: valleyFlashingTakeoffExample.inputs,
  fields: [
    { key: "valley_run_ft", label: "Plan run of ONE valley (ft)", kind: "number" },
    { key: "valley_count", label: "Number of valleys", kind: "number", default: 1 },
    { key: "pitch_rise_per_12", label: "Roof pitch (rise per 12)", kind: "number" },
    { key: "metal_width_in", label: "Valley metal width (in)", kind: "number" },
    { key: "stock_length_ft", label: "Stock length (ft)", kind: "number" },
    { key: "lap_in", label: "Lap at each joint (in)", kind: "number" },
    { key: "waste_pct", label: "Waste (%)", kind: "number" },
  ],
  outputs: [
    { key: "m", id: "vft-out-m", label: "Valley multiplier (vs common rafter)", value: (r) => fmt(r.valley_multiplier, 4) + " vs " + fmt(r.common_multiplier, 4) },
    { key: "l", id: "vft-out-l", label: "Valley length", value: (r) => fmt(r.valley_length_ft, 2) + " ft each, " + fmt(r.total_valley_lf, 2) + " ft total" },
    { key: "p", id: "vft-out-p", label: "Pieces", value: (r) => fmt(r.pieces, 0) + " at " + fmt(r.effective_piece_ft, 2) + " ft effective (" + fmt(r.total_with_waste_lf, 1) + " ft with waste)" },
    { key: "a", id: "vft-out-a", label: "Metal area / valley ice barrier", value: (r) => fmt(r.metal_area_sf, 1) + " sq ft of metal; budget the same for valley ice barrier" },
    { key: "n", id: "vft-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeValleyFlashingTakeoff,
});


// --- spec-v1120: SRW geogrid layer spacing and layout ---
// retaining-wall-block's own description ends with "over 4 ft needs an engineered design
// with geogrid" and then stops. This is the layout half of that sentence: how many
// reinforcement levels, at which courses, how long, and how much material - plus the
// constructability check that three separate standards impose the same way and that gets
// missed on site, because the spacing limit is set by the BLOCK, not by the soil.
//   NCMA Design Manual 3rd ed. 7.2.2: 24 in suggested maximum, never more than 32 in, and
//     for modular blocks 10 in deep or less no more than twice the unit depth.
//   AASHTO LRFD 11.10.2.3.1: twice the unit width Wu or 2.7 ft, whichever is less.
//   FHWA NHI-10-024 4.4.7.d: twice the block depth or 32 in, whichever is less.
// The three agree on 2 x depth; they differ only in the absolute ceiling, so the tile takes
// the most restrictive and says which rule produced it.
// dims: in { wall_height_ft: L, block_depth_in: L, block_height_in: L, base_course_buried_in: L, ncma_suggested_max_in: L, grid_length_basis: dimensionless } out: { spacing_limit_in: L, actual_spacing_in: L, courses_per_layer: dimensionless, layer_count: dimensionless, first_layer_height_in: L, top_layer_height_in: L, unreinforced_crest_in: L, grid_length_ft: L, grid_sf_per_lf: L, compaction_lifts: dimensionless }
export function computeSrwGeogridSpacing({ wall_height_ft = 0, block_depth_in = 12, block_height_in = 8, base_course_buried_in = 0, ncma_suggested_max_in = 24, grid_length_basis = 0.6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const H_ft = Number(wall_height_ft) || 0;
  const Wu = Number(block_depth_in) || 0;
  const hb = Number(block_height_in) || 0;
  const buried = Number(base_course_buried_in) || 0;
  const suggested = Number(ncma_suggested_max_in) || 0;
  const basis = Number(grid_length_basis) || 0;
  if (!(H_ft > 0)) return { error: "Wall height must be positive (ft)." };
  if (!(Wu > 0)) return { error: "Block depth (front face to back face) must be positive (in)." };
  if (!(hb > 0)) return { error: "Block height must be positive (in)." };
  if (buried < 0) return { error: "Buried base-course depth cannot be negative (in)." };
  if (!(suggested > 0) || suggested > 32) return { error: "The suggested maximum spacing must be between 0 and 32 in." };
  if (!(basis >= 0.4) || basis > 1.2) return { error: "Grid length basis must be between 0.4 and 1.2 times the wall height." };

  const H_in = H_ft * 12;
  const twice_depth_in = 2 * Wu;
  const aashto_ceiling_in = 2.7 * 12;
  const absolute_ceiling_in = 32;
  const spacing_limit_in = Math.min(twice_depth_in, absolute_ceiling_in, aashto_ceiling_in, suggested);
  const governing_rule = spacing_limit_in === twice_depth_in ? "twice the block depth (all three standards)"
    : spacing_limit_in === suggested ? "the NCMA suggested maximum of " + suggested + " in"
    : "the 32 in absolute ceiling (NCMA/FHWA; AASHTO's 2.7 ft is 32.4 in)";

  // Grid lands on a course JOINT, so the usable spacing is a whole number of courses.
  const courses_per_layer = Math.floor(spacing_limit_in / hb);
  if (courses_per_layer < 1) return { error: "The block is taller than the spacing limit - a single course already exceeds " + spacing_limit_in.toFixed(1) + " in, so this unit cannot be reinforced to these rules." };
  const actual_spacing_in = courses_per_layer * hb;

  // Levels are counted upward from the joint above the base course. The crest above the top
  // layer is left unreinforced and is the height AASHTO asks the designer to evaluate.
  const total_courses = Math.floor(H_in / hb);
  const first_layer_height_in = hb;
  const layer_count = total_courses >= 1 ? Math.floor((total_courses - 1) / courses_per_layer) + 1 : 0;
  const top_layer_height_in = layer_count > 0 ? first_layer_height_in + (layer_count - 1) * actual_spacing_in : 0;
  const unreinforced_crest_in = H_in - top_layer_height_in;

  const grid_length_ft = Math.max(basis * H_ft, 4);
  const length_governed_by_minimum = basis * H_ft < 4;
  const grid_sf_per_lf = layer_count * grid_length_ft;
  const compaction_lifts = Math.ceil(actual_spacing_in / 8);
  const exposed_ft = Math.max(0, H_ft - buried / 12);

  const note = "Spacing limit " + spacing_limit_in.toFixed(1) + " in, set by " + governing_rule
    + ". A " + hb + " in block divides that into " + courses_per_layer + " whole course" + (courses_per_layer === 1 ? "" : "s") + ", so the working spacing is " + actual_spacing_in + " in - grid lands on a joint, never mid-block. "
    + "That gives " + layer_count + " reinforcement level" + (layer_count === 1 ? "" : "s") + " on a " + H_ft + " ft wall, the first at " + first_layer_height_in + " in above the base and the top at " + top_layer_height_in + " in, leaving " + unreinforced_crest_in.toFixed(1) + " in of unreinforced facing above it"
    + (unreinforced_crest_in > actual_spacing_in ? " - which EXCEEDS the layer spacing and is the facing height AASHTO 11.10.2.3.1 asks the designer to check for bulging; consider adding a level near the top. " : ". ")
    + "Grid length " + grid_length_ft.toFixed(1) + " ft" + (length_governed_by_minimum ? " (the 4 ft practical minimum governs, not " + basis + "H)" : " at " + basis + " times the wall height, the NCMA minimum for global stability in good soil") + ", so about " + grid_sf_per_lf.toFixed(1) + " sq ft of grid per linear foot of wall. "
    + "Each " + actual_spacing_in + " in of fill takes at least " + compaction_lifts + " compaction lift" + (compaction_lifts === 1 ? "" : "s") + ": NCMA caps a lift at 8 in loose thickness regardless of grid spacing, and that is the rule most often broken on a fast job. "
    + (Wu <= 10 ? "This unit is 10 in deep or less, so NCMA's twice-the-depth rule applies to it explicitly rather than as general practice. " : "")
    + (exposed_ft > 0 && buried > 0 ? "Exposed height is " + exposed_ft.toFixed(2) + " ft with " + buried + " in of base course buried; the spacing rules use the FULL wall height including the buried portion. " : "")
    + "SCOPE: this is spacing, layout, and quantity only. It does NOT size the grid. The required long-term design strength, the pullout length beyond the failure plane, the block-to-grid connection strength, and global and compound stability all take a project-specific analysis with the soil report, the grid manufacturer's reduction factors, and the specific block. A wall over 4 ft, or any wall with a surcharge, slope above, or water, needs an engineered design. A layout and takeoff aid; the wall designer of record and the AHJ govern.";

  return { spacing_limit_in, twice_depth_in, actual_spacing_in, courses_per_layer, total_courses, layer_count, first_layer_height_in, top_layer_height_in, unreinforced_crest_in, crest_exceeds_spacing: unreinforced_crest_in > actual_spacing_in, grid_length_ft, length_governed_by_minimum, grid_sf_per_lf, compaction_lifts, exposed_ft, governing_rule, note };
}

export const srwGeogridSpacingExample = { inputs: { wall_height_ft: 8, block_depth_in: 9, block_height_in: 8, base_course_buried_in: 0, ncma_suggested_max_in: 24, grid_length_basis: 0.6 } };

FINISH_RENDERERS["srw-geogrid-spacing"] = _simpleRenderer({
  citation: "Citation: geogrid vertical spacing limits as they appear in three independent documents that agree on the controlling rule - NCMA Design Manual for Segmental Retaining Walls, 3rd ed. Section 7.2.2 (24 in suggested maximum, never more than 32 in, and for modular blocks 10 in deep or less no more than twice the unit depth, with compaction lifts never exceeding 8 in), AASHTO LRFD Bridge Design Specifications 2016 Section 11.10.2.3.1 (twice the unit width Wu or 2.7 ft, whichever is less, plus an evaluation of the facing height above the uppermost reinforcement layer), and FHWA NHI-10-024 Section 4.4.7.d (twice the block depth or 32 in, whichever is less). Minimum grid length 0.6H per NCMA, which is the length that satisfies global stability for basic loading in good soil, with a 4 ft practical floor. The tile applies the most restrictive limit and names the rule that produced it; no proprietary table is reproduced. LAYOUT AND QUANTITY ONLY - it does not size the grid, check pullout, connection strength, or global stability. A wall over 4 ft needs an engineered design; the designer of record and the AHJ govern.",
  example: srwGeogridSpacingExample.inputs,
  fields: [
    { key: "wall_height_ft", label: "Total wall height, including buried course (ft)", kind: "number" },
    { key: "block_depth_in", label: "Block depth, front face to back face (in)", kind: "number", default: 12 },
    { key: "block_height_in", label: "Block height (in)", kind: "number" },
    { key: "base_course_buried_in", label: "Base course buried (in)", kind: "number", default: 6 },
    { key: "ncma_suggested_max_in", label: "Suggested maximum spacing (in)", kind: "number" },
    { key: "grid_length_basis", label: "Grid length as a fraction of wall height", kind: "number" },
  ],
  outputs: [
    { key: "l", id: "srwg-out-l", label: "Governing spacing limit", value: (r) => fmt(r.spacing_limit_in, 1) + " in - " + r.governing_rule },
    { key: "s", id: "srwg-out-s", label: "Working spacing (whole courses)", value: (r) => r.actual_spacing_in + " in (" + r.courses_per_layer + " course" + (r.courses_per_layer === 1 ? "" : "s") + ")" },
    { key: "c", id: "srwg-out-c", label: "Reinforcement levels", value: (r) => r.layer_count + " (first at " + r.first_layer_height_in + " in, top at " + r.top_layer_height_in + " in)" },
    { key: "u", id: "srwg-out-u", label: "Unreinforced facing above the top layer", value: (r) => fmt(r.unreinforced_crest_in, 1) + " in" + (r.crest_exceeds_spacing ? " - exceeds the layer spacing, check facing stability" : "") },
    { key: "g", id: "srwg-out-g", label: "Grid length and quantity", value: (r) => fmt(r.grid_length_ft, 1) + " ft deep" + (r.length_governed_by_minimum ? " (4 ft minimum governs)" : "") + ", " + fmt(r.grid_sf_per_lf, 1) + " sq ft per LF of wall" },
    { key: "p", id: "srwg-out-p", label: "Compaction lifts between layers", value: (r) => r.compaction_lifts + " at the 8 in maximum" },
    { key: "n", id: "srwg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSrwGeogridSpacing,
});


// --- spec-v1129: crawl space (under-floor) ventilation ---
// attic-ventilation does the roof; nothing does the floor. IRC R408.1 is the same idea with
// different numbers and one much bigger lever: the base ratio is 1 sq ft of net free area
// per 150 sq ft of under-floor area, but covering the ground with an approved Class I vapor
// retarder and arranging the openings for cross ventilation drops it to 1/1500 - a TEN-fold
// reduction, because the ground is where nearly all the moisture comes from.
// The base ratio is an INPUT: jurisdictions amend it (Washington's WAC 51-51-0408 adopts
// 1/300 rather than 1/150), so shipping one number as if it were universal would be wrong.
// Net free area per vent is also an input - it is product data off the vent, and it is much
// less than the rough opening once the mesh or louver is counted.
// dims: in { floor_area_sf: L^2, base_ratio_denominator: dimensionless, vapor_retarder: dimensionless, vent_net_free_sqin: L^2, corner_count: dimensionless } out: { required_sf: L^2, required_sqin: L^2, ratio_used: dimensionless, vents_by_area: dimensionless, vents_required: dimensionless, provided_sqin: L^2, surplus_sqin: L^2 }
export function computeCrawlSpaceVentilation({ floor_area_sf = 0, base_ratio_denominator = 150, vapor_retarder = "no", vent_net_free_sqin = 50, corner_count = 4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(floor_area_sf) || 0;
  const den = Number(base_ratio_denominator) || 0;
  const per = Number(vent_net_free_sqin) || 0;
  const corners = Number(corner_count) || 0;
  const retarder = vapor_retarder === "yes";
  if (!(area > 0)) return { error: "Under-floor area must be positive (sq ft)." };
  if (!(den > 0)) return { error: "The base ventilation ratio denominator must be positive (150 in the base IRC; some states amend it)." };
  if (!(per > 0)) return { error: "Net free area per vent must be positive (sq in) - read it off the vent, not the rough opening." };
  if (!Number.isInteger(corners) || corners < 0) return { error: "Corner count must be a whole number of 0 or more." };

  const ratio_used = retarder ? 1500 : den;
  const required_sf = area / ratio_used;
  const required_sqin = required_sf * 144;
  const vents_by_area = Math.ceil(required_sqin / per);
  // R408.1 also wants an opening within 3 ft of each corner, so the corner count is a floor
  // on the vent count no matter how little area the ratio asks for.
  const vents_required = Math.max(vents_by_area, corners);
  const corner_governs = corners > vents_by_area;
  const provided_sqin = vents_required * per;
  const surplus_sqin = provided_sqin - required_sqin;
  // What the same crawl space would need the other way, so the trade is visible.
  const alt_ratio = retarder ? den : 1500;
  const alt_required_sqin = (area / alt_ratio) * 144;
  const alt_vents = Math.ceil(alt_required_sqin / per);

  const note = "A " + area.toFixed(0) + " sq ft under-floor area at 1/" + ratio_used + " needs " + required_sf.toFixed(2) + " sq ft = " + required_sqin.toFixed(0) + " sq in of NET FREE ventilation area. "
    + "At " + per + " sq in per vent that is " + vents_by_area + " vent" + (vents_by_area === 1 ? "" : "s") + " by area"
    + (corner_governs ? ", but the code also wants an opening within 3 ft of EACH corner, so " + corners + " governs - a small crawl space is set by its corners, not its square footage. " : ", and with " + corners + " corners to cover that is still the controlling number. ")
    + "Order " + vents_required + ", giving " + provided_sqin.toFixed(0) + " sq in against the " + required_sqin.toFixed(0) + " required (" + surplus_sqin.toFixed(0) + " sq in spare). "
    + (retarder
      ? "The 1/1500 reduction is taken, which requires an APPROVED CLASS I VAPOR RETARDER over the ground AND the openings arranged for cross ventilation - both conditions, not just the plastic. Without it this same crawl space would need " + alt_required_sqin.toFixed(0) + " sq in and " + alt_vents + " vents. Covering the ground is the cheapest ventilation you can buy, because the ground is where nearly all the moisture comes from. "
      : "Covering the ground with an approved Class I vapor retarder and arranging the openings for cross ventilation drops the requirement to 1/1500 - " + alt_required_sqin.toFixed(0) + " sq in and " + alt_vents + " vent" + (alt_vents === 1 ? "" : "s") + " instead, a ten-fold cut. That is almost always the cheaper move, because the ground is where nearly all the moisture comes from. ")
    + "NET FREE AREA, not rough opening: a vent's mesh, louver, and frame eat a large share of the hole, and the net free area printed on the product is the number the code counts. Screening has minimum sizes of its own (hardware cloth of 0.035 in wire or heavier, corrosion-resistant wire mesh no finer than 1/8 in, and the perforated and expanded metal thicknesses the code lists) - finer mesh clogs and stops ventilating. "
    + "The base ratio is an INPUT because jurisdictions amend it: the base IRC is 1/150 and Washington's adopted code uses 1/300, so check what your AHJ has actually adopted rather than trusting a remembered number. An UNVENTED, conditioned crawl space built to R408.3 is a different and often better assembly - continuous sealed Class I vapor retarder lapped 6 in and run up the stem wall, with conditioned air or a dehumidifier - and this tile does not size that. A screen; the adopted code and the AHJ govern.";

  return { ratio_used, required_sf, required_sqin, vents_by_area, vents_required, corner_governs, provided_sqin, surplus_sqin, alt_ratio, alt_required_sqin, alt_vents, retarder, note };
}

export const crawlSpaceVentilationExample = { inputs: { floor_area_sf: 1500, base_ratio_denominator: 150, vapor_retarder: "no", vent_net_free_sqin: 50, corner_count: 4 } };

FINISH_RENDERERS["crawl-space-ventilation"] = _simpleRenderer({
  citation: "Citation: IRC R408.1 / R408.2 under-floor ventilation - a minimum net area of ventilation openings of 1 sq ft for each 150 sq ft of under-floor area, with one opening within 3 ft of each corner of the building, reduced to 1/1500 of the under-floor area where the ground is covered with an approved Class I vapor retarder AND the openings are placed to provide cross ventilation. The base ratio is an editable INPUT because jurisdictions amend it: Washington's WAC 51-51-0408 adopts 1/300 in place of 1/150. Areas are NET FREE area, which is product data off the vent and much less than the rough opening; the code's permitted coverings carry their own minimum sizes (hardware cloth of 0.035 in wire or heavier, corrosion-resistant wire mesh no finer than 1/8 in, and the listed perforated and expanded metal thicknesses). The R408.3 unvented conditioned crawl space is a different assembly and is not sized here. A screen; the adopted code and the AHJ govern.",
  example: crawlSpaceVentilationExample.inputs,
  fields: [
    { key: "floor_area_sf", label: "Under-floor (crawl space) area (sq ft)", kind: "number" },
    { key: "base_ratio_denominator", label: "Base ratio 1 per N sq ft (IRC 150; WA 300)", kind: "number" },
    { key: "vapor_retarder", label: "Class I vapor retarder over the ground, cross ventilated", kind: "select", options: [{ value: "no", label: "No - use the base ratio", selected: true }, { value: "yes", label: "Yes - the 1/1500 reduction applies" }] },
    { key: "vent_net_free_sqin", label: "Net free area per vent (sq in, off the product)", kind: "number" },
    { key: "corner_count", label: "Building corners needing an opening within 3 ft", kind: "number" },
  ],
  outputs: [
    { key: "q", id: "csv-out-q", label: "Required net free area", value: (r) => fmt(r.required_sqin, 0) + " sq in (" + fmt(r.required_sf, 2) + " sq ft) at 1/" + r.ratio_used },
    { key: "v", id: "csv-out-v", label: "Vents required", value: (r) => r.vents_required + (r.corner_governs ? " - the corner rule governs, not the area" : " (by area)") },
    { key: "p", id: "csv-out-p", label: "Provided", value: (r) => fmt(r.provided_sqin, 0) + " sq in, " + fmt(r.surplus_sqin, 0) + " sq in over the requirement" },
    { key: "a", id: "csv-out-a", label: "The other way", value: (r) => r.retarder ? "without the retarder: " + fmt(r.alt_required_sqin, 0) + " sq in, " + r.alt_vents + " vents" : "with a Class I retarder: " + fmt(r.alt_required_sqin, 0) + " sq in, " + r.alt_vents + " vents" },
    { key: "n", id: "csv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCrawlSpaceVentilation,
});
