// Group A (cont.): electrician design/layout bench.
// spec-v101 establishes this new lazy-loaded renderer module for the
// design and layout numbers an electrician sizes off the print before the
// rough-in, relieving the standing calc-electrical.js cap watch instead of
// bumping that module again. Every tile keeps group: "A" (a tile's group
// letter is independent of the module that holds it -- the v28/v70..v100
// split precedent). Tiles:
//   v101 pull-box-sizing, lumen-method
// Both GOVERNANCE.general design arithmetic (the code and the design
// standard govern, and the AHJ is the law). See spec-v101.md.

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

// Compact renderer factory (same shape as the calc-finish.js _simpleRenderer)
// supporting number and select inputs.
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

export const ELECDESIGN_RENDERERS = {};

// ===================== spec-v101: NEC 314.28 pull/junction box sizing =====================

// dims: in { pull_type: dimensionless, largest_raceway_in: L, other_raceways_in: L } out: { straight_min: L, angle_min: L, between: L, governing: L }
export function computePullBoxSizing({ pull_type = "straight", largest_raceway_in = 0, other_raceways_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (other_raceways_in < 0) return { error: "The same-row other-raceways sum must be non-negative." };
  if (!(largest_raceway_in > 0)) return { error: "Largest raceway trade size must be positive." };
  const straight_min = 8 * largest_raceway_in;
  const angle_min = 6 * largest_raceway_in + other_raceways_in;
  const between = 6 * largest_raceway_in;
  const governing = pull_type === "angle" ? angle_min : straight_min;
  return {
    pull_type, straight_min, angle_min, between, governing,
    note: "NEC 314.28(A)(1) sets a straight-pull length of at least 8x the largest raceway. 314.28(A)(2) sets the distance from each raceway entry to the opposite wall on an angle or U pull at 6x the largest raceway plus the sum of the other raceways in that same row. The distance between raceway entries enclosing the same conductor must be at least 6x the larger raceway. These are minimums - the box's listed dimensions, conductor bending space, and the AHJ govern.",
  };
}
const pullBoxSizingExample = { inputs: { pull_type: "straight", largest_raceway_in: 3, other_raceways_in: 0 } };
ELECDESIGN_RENDERERS["pull-box-sizing"] = _simpleRenderer({
  citation: "Citation: NEC (NFPA 70) 314.28(A)(1) straight-pull (8x) and 314.28(A)(2) angle/U-pull (6x + same-row others) minimums, plus the 6x between-entries rule for the same conductor (by name). Minimums only; the listed box and the AHJ govern.",
  example: pullBoxSizingExample.inputs,
  fields: [
    { key: "pull_type", label: "Pull type", kind: "select", options: [
      { value: "straight", label: "Straight pull (8x)" },
      { value: "angle", label: "Angle / U pull (6x + others)" },
    ] },
    { key: "largest_raceway_in", label: "Largest raceway (trade size, in)", kind: "number" },
    { key: "other_raceways_in", label: "Other raceways in row (sum, in)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "g", id: "pbs-out-g", label: "Minimum box dimension", value: (r) => fmt(r.governing, 1) + " in (" + (r.pull_type === "angle" ? "angle/U" : "straight") + " pull)" },
    { key: "s", id: "pbs-out-s", label: "Straight-pull minimum (8x)", value: (r) => fmt(r.straight_min, 1) + " in" },
    { key: "a", id: "pbs-out-a", label: "Angle/U-pull minimum (6x + others)", value: (r) => fmt(r.angle_min, 1) + " in" },
    { key: "b", id: "pbs-out-b", label: "Between same-conductor entries (6x)", value: (r) => fmt(r.between, 1) + " in" },
    { key: "n", id: "pbs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePullBoxSizing,
});

// ===================== spec-v101: IES lumen-method luminaire count =====================

// dims: in { target_fc: dimensionless, area_sqft: L^2, lumens_per_lum: dimensionless, cu: dimensionless, llf: dimensionless } out: { count_raw: dimensionless, count: dimensionless, achieved_fc: dimensionless, total_lumens: dimensionless }
export function computeLumenMethod({ target_fc = 0, area_sqft = 0, lumens_per_lum = 0, cu = 0.7, llf = 0.8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(target_fc > 0)) return { error: "Target footcandle level must be positive." };
  if (!(area_sqft > 0)) return { error: "Room area must be positive." };
  if (!(lumens_per_lum > 0)) return { error: "Lumens per luminaire must be positive." };
  if (!(cu > 0 && cu <= 1.5)) return { error: "Coefficient of utilization must be in (0, 1.5]." };
  if (!(llf > 0 && llf <= 1)) return { error: "Light-loss factor must be in (0, 1]." };
  const count_raw = (target_fc * area_sqft) / (lumens_per_lum * cu * llf);
  const count = Math.ceil(count_raw);
  const achieved_fc = count * lumens_per_lum * cu * llf / area_sqft;
  const total_lumens = count * lumens_per_lum;
  return {
    count_raw, count, achieved_fc, total_lumens,
    note: "The lumen method sizes the AVERAGE maintained level over the work plane, not a point value or uniformity. The coefficient of utilization comes from the fixture's photometric report at the room's cavity ratio and surface reflectances; the light-loss factor is the product of lamp-lumen depreciation and luminaire-dirt depreciation for the maintenance interval. Round up so the design meets the target at end of life. A photometric layout governs spacing and uniformity.",
  };
}
const lumenMethodExample = { inputs: { target_fc: 50, area_sqft: 1200, lumens_per_lum: 5000, cu: 0.7, llf: 0.8 } };
ELECDESIGN_RENDERERS["lumen-method"] = _simpleRenderer({
  citation: "Citation: IES lumen method (by name) - number of luminaires = target footcandles x area / (lumens x CU x LLF), rounded up; CU from the photometric report, LLF = lamp-lumen x dirt depreciation. Sizes the average maintained level; a photometric layout governs spacing.",
  example: lumenMethodExample.inputs,
  fields: [
    { key: "target_fc", label: "Target maintained (footcandles)", kind: "number" },
    { key: "area_sqft", label: "Room area (sq ft)", kind: "number" },
    { key: "lumens_per_lum", label: "Lumens per luminaire", kind: "number" },
    { key: "cu", label: "Coefficient of utilization (CU)", kind: "number", default: 0.7 },
    { key: "llf", label: "Light-loss factor (LLF)", kind: "number", default: 0.8 },
  ],
  outputs: [
    { key: "c", id: "lm-out-c", label: "Luminaires (rounded up)", value: (r) => String(r.count) },
    { key: "r", id: "lm-out-r", label: "Exact count", value: (r) => fmt(r.count_raw, 2) },
    { key: "a", id: "lm-out-a", label: "Achieved maintained", value: (r) => fmt(r.achieved_fc, 1) + " fc" },
    { key: "t", id: "lm-out-t", label: "Total installed lumens", value: (r) => fmt(r.total_lumens, 0) + " lm" },
    { key: "n", id: "lm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLumenMethod,
});

// ===================== spec-v175: point-method horizontal illuminance =====================

// dims: in { intensity_cd: J, mount_height_ft: L, angle_deg: dimensionless } out: { distance_ft: L, e_fc: L^-2, e_lux: L^-2 }
export function computePointIlluminance({ intensity_cd = 0, mount_height_ft = 0, angle_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cd = Number(intensity_cd) || 0;
  const h = Number(mount_height_ft) || 0;
  const ang = Number(angle_deg) || 0;
  if (!(cd > 0)) return { error: "Luminous intensity must be positive (candela)." };
  if (!(h > 0)) return { error: "Mounting height must be positive (ft)." };
  if (ang < 0 || ang >= 90) return { error: "Angle from nadir must be in [0, 90) degrees." };

  const cosA = Math.cos(ang * Math.PI / 180);
  const distance_ft = h / cosA;                        // slant distance source-to-point
  const e_fc = cd * cosA / (distance_ft * distance_ft); // = cd * cos^3 / h^2
  const e_lux = e_fc * 10.764;
  return {
    distance_ft: Number.isFinite(distance_ft) ? distance_ft : null,
    e_fc: Number.isFinite(e_fc) ? e_fc : null,
    e_lux: Number.isFinite(e_lux) ? e_lux : null,
    note: "IES point method (inverse-square + cosine law): E = I x cos(angle) / d^2, with d = mounting height / cos(angle), so E = I x cos^3(angle) / h^2. This is the DIRECT horizontal illuminance from one source, ignoring interreflection; lux = fc x 10.764. A design relies on the manufacturer's photometric file and the IES target level.",
  };
}
const pointIlluminanceExample = { inputs: { intensity_cd: 1000, mount_height_ft: 10, angle_deg: 0 } };
ELECDESIGN_RENDERERS["point-illuminance"] = _simpleRenderer({
  citation: "Citation: IES point method (by name) - horizontal illuminance at a point from a source of known candlepower by the inverse-square and cosine laws: E_fc = I x cos^3(angle) / height^2. Direct illuminance from one source, ignoring interreflection; lux = fc x 10.764. The photometric file and the IES target govern.",
  example: pointIlluminanceExample.inputs,
  fields: [
    { key: "intensity_cd", label: "Luminous intensity toward point (candela)", kind: "number" },
    { key: "mount_height_ft", label: "Mounting height above work plane (ft)", kind: "number" },
    { key: "angle_deg", label: "Angle from straight-down / nadir (deg)", kind: "number", attrs: { step: "any", min: "0", max: "89.9" }, default: 0 },
  ],
  outputs: [
    { key: "e", id: "pi-out-e", label: "Horizontal illuminance", value: (r) => fmt(r.e_fc, 2) + " fc (" + fmt(r.e_lux, 1) + " lux)" },
    { key: "d", id: "pi-out-d", label: "Slant distance to point", value: (r) => fmt(r.distance_ft, 2) + " ft" },
    { key: "n", id: "pi-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePointIlluminance,
});
