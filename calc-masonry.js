// Group E (cont.): TMS 402-16 reinforced-masonry member bench.
// spec-v269..v271 establish this new lazy-loaded renderer module -- the
// masonry counterpart to the steel-member (calc-steel.js, v254..v256) and
// reinforced-concrete (calc-concrete.js, v257..v259) benches. Every masonry
// tile to date was a material takeoff (cmu-grout-volume, masonry-coursing,
// masonry-count); none resolved a structural limit state. This bench traces
// the flexure / shear / axial triad for a reinforced CMU wall by the TMS 402
// allowable-stress method. Every tile keeps group: "E" (a tile's group letter
// is independent of the module that holds it -- the spec-v70..v98 split
// precedent). Tiles:
//   v269 cmu-wall-flexure  (out-of-plane ASD cracked transformed section)
//   v270 cmu-shear-wall    (in-plane Fvm + Fvs with the M/(V dv)-graded cap)
//   v271 cmu-wall-axial    (slenderness-reduced Pa, the h/r = 99 two-branch curve)
// All GOVERNANCE.general design aids; f'm, the bar layout, and the bracing
// come from the structural drawings. See spec-v269.md..v271.md.

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

// Compact renderer factory (same shape as the calc-steel / calc-concrete
// _simpleRenderer factories) supporting number and select inputs.
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

export const MASONRY_RENDERERS = {};

// ===================== spec-v269: reinforced CMU wall out-of-plane flexure =====================

// dims: in { fm_psi: M L^-1 T^-2, as_in2: L^2, d_in: L, b_in: L, fs_psi: M L^-1 T^-2 } out: { n_ratio: dimensionless, rho: dimensionless, k: dimensionless, j: dimensionless, ms_ftlb: M L^2 T^-2, mm_ftlb: M L^2 T^-2, ma_ftlb: M L^2 T^-2 }
export function computeCmuWallFlexure({ fm_psi = 2000, as_in2 = 0, d_in = 0, b_in = 12, fs_psi = 32000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fm_psi > 0)) return { error: "Masonry strength f'm must be positive (psi)." };
  if (!(as_in2 > 0)) return { error: "Reinforcement area As must be positive (in^2)." };
  if (!(d_in > 0)) return { error: "Effective depth d must be positive (in)." };
  if (!(b_in > 0)) return { error: "Strip width b must be positive (in)." };
  if (!(fs_psi > 0)) return { error: "Allowable steel stress Fs must be positive (psi)." };
  const es = 29000000;
  const em = 900 * fm_psi;
  const n_ratio = es / em;
  const rho = as_in2 / (b_in * d_in);
  const rn = rho * n_ratio;
  const k = Math.sqrt(2 * rn + rn * rn) - rn;
  const j = 1 - k / 3;
  const fb = 0.45 * fm_psi;
  const ms_lbin = as_in2 * fs_psi * j * d_in;
  const mm_lbin = 0.5 * fb * k * j * b_in * d_in * d_in;
  const ma_lbin = Math.min(ms_lbin, mm_lbin);
  const ms_ftlb = ms_lbin / 12;
  const mm_ftlb = mm_lbin / 12;
  const ma_ftlb = ma_lbin / 12;
  const steel_governs = ms_lbin <= mm_lbin;
  return { n_ratio, rho, k, j, fb, ms_ftlb, mm_ftlb, ma_ftlb, steel_governs };
}

export const cmuWallFlexureExample = { inputs: { fm_psi: 2000, as_in2: 0.155, d_in: 3.81, b_in: 12, fs_psi: 32000 } };

MASONRY_RENDERERS["cmu-wall-flexure"] = _simpleRenderer({
  citation: "Citation: TMS 402-16 (Building Code Requirements for Masonry Structures, ACI 530 / ASCE 5) allowable-stress-design cracked transformed-section flexure: n = Es/Em with Es = 29,000,000 psi and Em = 900 f'm for concrete masonry, rho = As/(b d), k = sqrt(2 rho n + (rho n)^2) - rho n, j = 1 - k/3, the steel-governed allowable moment Ms = As Fs j d and the masonry-governed Mm = 0.5 Fb k j b d^2, with Fs = 32,000 psi for Grade 60 reinforcement and Fb = 0.45 f'm, as compiled in the Masonry Designers' Guide and CMHA TEK 14-07C (Allowable Stress Design of Concrete Masonry). Returns the allowable service-level bending moment of a singly reinforced, fully grouted section by the working-stress method: the section is assumed cracked, the reinforcement developed and in tension, the axial compression negligible (near-pure flexure), and one steel layer at the reported depth. The axial term and the one-third stress increase are not applied, and this is not the strength-design (LRFD) moment. Take f'm, the bar size, and the spacing from the structural drawings. A design aid, not a substitute for the engineer of record's stamped design.",
  example: cmuWallFlexureExample.inputs,
  fields: [
    { key: "fm_psi", label: "Masonry strength f'm (psi)", kind: "number", default: 2000 },
    { key: "as_in2", label: "Steel area As over the strip (in^2)", kind: "number" },
    { key: "d_in", label: "Effective depth d (in)", kind: "number" },
    { key: "b_in", label: "Strip width b (in)", kind: "number", default: 12 },
    { key: "fs_psi", label: "Allowable steel stress Fs (psi)", kind: "number", default: 32000 },
  ],
  outputs: [
    { key: "nk", id: "cwf-out-nk", label: "n / k / j", value: (r) => fmt(r.n_ratio, 2) + " / " + fmt(r.k, 3) + " / " + fmt(r.j, 3) },
    { key: "ms", id: "cwf-out-ms", label: "Steel-governed Ms", value: (r) => fmt(r.ms_ftlb, 0) + " lb-ft" },
    { key: "mm", id: "cwf-out-mm", label: "Masonry-governed Mm", value: (r) => fmt(r.mm_ftlb, 0) + " lb-ft" },
    { key: "ma", id: "cwf-out-ma", label: "Allowable moment Ma", value: (r) => fmt(r.ma_ftlb, 0) + " lb-ft per strip (" + (r.steel_governs ? "steel governs" : "masonry governs") + ")" },
  ],
  compute: computeCmuWallFlexure,
});

// ===================== spec-v270: reinforced CMU shear wall in-plane allowable shear =====================

// dims: in { fm_psi: M L^-1 T^-2, b_in: L, dv_in: L, p_lb: M L T^-2, mvd: dimensionless, av_in2: L^2, s_in: L, fs_psi: M L^-1 T^-2 } out: { an_in2: L^2, fvm: M L^-1 T^-2, fvs: M L^-1 T^-2, fv: M L^-1 T^-2, fv_max: M L^-1 T^-2, va_kip: M L T^-2 }
export function computeCmuShearWall({ fm_psi = 1500, b_in = 0, dv_in = 0, p_lb = 0, mvd = 0.5, av_in2 = 0, s_in = 48, fs_psi = 32000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fm_psi > 0)) return { error: "Masonry strength f'm must be positive (psi)." };
  if (!(b_in > 0)) return { error: "Net wall thickness must be positive (in)." };
  if (!(dv_in > 0)) return { error: "Shear depth dv must be positive (in)." };
  if (!(s_in > 0)) return { error: "Horizontal bar spacing must be positive (in)." };
  if (!(fs_psi > 0)) return { error: "Allowable steel stress Fs must be positive (psi)." };
  if (p_lb < 0) return { error: "Axial load P cannot be negative (lb)." };
  if (av_in2 < 0) return { error: "Shear-reinforcement area Av cannot be negative (in^2)." };
  if (mvd < 0) return { error: "Shear-span ratio M/(V dv) cannot be negative." };
  const an_in2 = b_in * dv_in;
  const root = Math.sqrt(fm_psi);
  const mvd_c = Math.min(mvd, 1.0);
  const fvm = 0.5 * ((4.0 - 1.75 * mvd_c) * root) + 0.25 * (p_lb / an_in2);
  const fvs = av_in2 > 0 ? 0.5 * (av_in2 * fs_psi * dv_in) / (an_in2 * s_in) : 0;
  const fv = fvm + fvs;
  const fv_max = mvd <= 0.25 ? 3 * root : mvd >= 1.0 ? 2 * root : (3 - (mvd - 0.25) / 0.75) * root;
  const fv_gov = Math.min(fv, fv_max);
  const va_kip = fv_gov * an_in2 / 1000;
  const capped = fv > fv_max;
  return { an_in2, fvm, fvs, fv, fv_max, fv_gov, va_kip, capped };
}

export const cmuShearWallExample = { inputs: { fm_psi: 1500, b_in: 7.625, dv_in: 96, p_lb: 20000, mvd: 0.5, av_in2: 0.20, s_in: 48, fs_psi: 32000 } };

MASONRY_RENDERERS["cmu-shear-wall"] = _simpleRenderer({
  citation: "Citation: TMS 402-16 (ACI 530 / ASCE 5) allowable-stress in-plane shear: Fvm = 0.5 x ((4.0 - 1.75 x M/(V dv)) x sqrt(f'm)) + 0.25 x (P/An) with the shear-span ratio taken positive and not greater than 1.0 inside the masonry term, Fvs = 0.5 x (Av Fs dv) / (An s), the combined Fv = Fvm + Fvs, and the maximum-Fv cap of 3 sqrt(f'm) at M/(V dv) <= 0.25 grading linearly to 2 sqrt(f'm) at M/(V dv) >= 1.0, as compiled in the Masonry Designers' Guide and CMHA TEK 14-07C. Returns the allowable service-level in-plane shear of a reinforced, fully grouted masonry shear wall. P is the sustained gravity compression (a larger P raises the masonry term, so use the load combination that actually acts with the shear); M/(V dv) is the shear-span ratio the designer supplies from the wall's height and length; the special-reinforced detailing and minimum-reinforcement rules of TMS 402 are the engineer's to satisfy separately. A design aid, not a substitute for the engineer of record's stamped lateral design.",
  example: cmuShearWallExample.inputs,
  fields: [
    { key: "fm_psi", label: "Masonry strength f'm (psi)", kind: "number", default: 1500 },
    { key: "b_in", label: "Net wall thickness (in)", kind: "number" },
    { key: "dv_in", label: "Shear depth dv, wall length (in)", kind: "number" },
    { key: "p_lb", label: "Sustained axial load P (lb)", kind: "number", default: 0 },
    { key: "mvd", label: "Shear-span ratio M/(V dv)", kind: "number", default: 0.5 },
    { key: "av_in2", label: "Horizontal bar area Av (in^2, 0 = none)", kind: "number", default: 0 },
    { key: "s_in", label: "Horizontal bar spacing s (in)", kind: "number", default: 48 },
    { key: "fs_psi", label: "Allowable steel stress Fs (psi)", kind: "number", default: 32000 },
  ],
  outputs: [
    { key: "fm", id: "csw-out-fm", label: "Masonry term Fvm", value: (r) => fmt(r.fvm, 1) + " psi" },
    { key: "fs", id: "csw-out-fs", label: "Reinforcement term Fvs", value: (r) => fmt(r.fvs, 1) + " psi" },
    { key: "fv", id: "csw-out-fv", label: "Combined Fv (vs cap)", value: (r) => fmt(r.fv, 1) + " psi (cap " + fmt(r.fv_max, 1) + " psi" + (r.capped ? ", CAP GOVERNS" : "") + ")" },
    { key: "va", id: "csw-out-va", label: "Allowable in-plane shear Va", value: (r) => fmt(r.va_kip, 1) + " kip" },
  ],
  compute: computeCmuShearWall,
});

// ===================== spec-v271: reinforced CMU wall allowable axial compression =====================

// dims: in { fm_psi: M L^-1 T^-2, an_in2: L^2, ast_in2: L^2, h_in: L, r_in: L, fs_psi: M L^-1 T^-2 } out: { hr: dimensionless, p0_lb: M L T^-2, r_factor: dimensionless, pa_kip: M L T^-2 }
export function computeCmuWallAxial({ fm_psi = 2000, an_in2 = 0, ast_in2 = 0, h_in = 0, r_in = 0, fs_psi = 32000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fm_psi > 0)) return { error: "Masonry strength f'm must be positive (psi)." };
  if (!(an_in2 > 0)) return { error: "Net area An must be positive (in^2)." };
  if (!(h_in > 0)) return { error: "Effective height h must be positive (in)." };
  if (!(r_in > 0)) return { error: "Radius of gyration r must be positive (in)." };
  if (ast_in2 < 0) return { error: "Vertical steel area Ast cannot be negative (in^2)." };
  if (!(fs_psi > 0)) return { error: "Allowable steel stress Fs must be positive (psi)." };
  const hr = h_in / r_in;
  const p0_lb = 0.25 * fm_psi * an_in2 + 0.65 * ast_in2 * fs_psi;
  const r_factor = hr <= 99 ? 1 - (h_in / (140 * r_in)) ** 2 : (70 * r_in / h_in) ** 2;
  const pa_kip = p0_lb * r_factor / 1000;
  const slender = hr > 99;
  return { hr, p0_lb, r_factor, pa_kip, slender };
}

export const cmuWallAxialExample = { inputs: { fm_psi: 2000, an_in2: 91.5, ast_in2: 0.155, h_in: 144, r_in: 2.201, fs_psi: 32000 } };

MASONRY_RENDERERS["cmu-wall-axial"] = _simpleRenderer({
  citation: "Citation: TMS 402-16 (ACI 530 / ASCE 5) allowable-stress axial compression for reinforced masonry: Pa = (0.25 f'm An + 0.65 Ast Fs) x (1 - (h/(140 r))^2) for a slenderness ratio h/r <= 99, and Pa = (0.25 f'm An + 0.65 Ast Fs) x (70 r / h)^2 for h/r > 99 (the two branches meet at h/r = 99), with Fs the allowable compressive stress in the reinforcement, as compiled in the Masonry Designers' Guide and CMHA TEK 14-07C. Returns the allowable service-level concentric axial compression of a reinforced, fully grouted masonry wall or column. The 0.65 Ast Fs reinforcement term applies where the vertical bars are laterally tied per the code's column provisions -- for an untied wall the conservative practice is to drop that term (enter Ast = 0) and take only 0.25 f'm An x R. Pure axial only: the moment interaction is separate (combine with the CMU wall flexure tile through the unity check). The radius of gyration r and effective height h come from the section and the wall's actual bracing. A design aid, not a substitute for the engineer of record's stamped design.",
  example: cmuWallAxialExample.inputs,
  fields: [
    { key: "fm_psi", label: "Masonry strength f'm (psi)", kind: "number", default: 2000 },
    { key: "an_in2", label: "Net area An (in^2)", kind: "number" },
    { key: "ast_in2", label: "Vertical steel Ast, tied (in^2, 0 = untied)", kind: "number", default: 0 },
    { key: "h_in", label: "Effective height h (in)", kind: "number" },
    { key: "r_in", label: "Radius of gyration r (in)", kind: "number" },
    { key: "fs_psi", label: "Allowable steel stress Fs (psi)", kind: "number", default: 32000 },
  ],
  outputs: [
    { key: "hr", id: "cwa-out-hr", label: "Slenderness h/r", value: (r) => fmt(r.hr, 1) + (r.slender ? " (slender branch, h/r > 99)" : " (short/intermediate branch)") },
    { key: "p0", id: "cwa-out-p0", label: "Material capacity 0.25 f'm An + 0.65 Ast Fs", value: (r) => fmt(r.p0_lb, 0) + " lb" },
    { key: "rf", id: "cwa-out-rf", label: "Slenderness factor R", value: (r) => fmt(r.r_factor, 4) },
    { key: "pa", id: "cwa-out-pa", label: "Allowable axial Pa", value: (r) => fmt(r.pa_kip, 1) + " kip" },
  ],
  compute: computeCmuWallAxial,
});

// ===================== spec-v368..v370: masonry loads batch (Group E) =====================
// The dead-load and detailing numbers the reinforced-masonry design tiles assume:
// the wall dead load from NCMA weights (v368), the brick-veneer anchor spacing and
// count per TMS 402 / IBC (v369), and the triangular arching load a lintel carries
// over an opening (v370).

// dims: in { hollow_psf: M L^-1 T^-2, grout_adder: M L^-1 T^-2, cell_spacing: L, grout_spacing: L, height_ft: L, area_ft2: L^2 } out: { wall_psf: M L^-1 T^-2, line_load_plf: M T^-2, total_lb: M L T^-2 }
export function computeMasonryWallWeight({ hollow_psf = 0, grout_adder = 0, cell_spacing = 8, grout_spacing = 0, height_ft = 0, area_ft2 = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const hollow = Number(hollow_psf) || 0;
  const adder = Number(grout_adder) || 0;
  const cell = Number(cell_spacing) || 0;
  const gs = Number(grout_spacing) || 0;
  const h = Number(height_ft) || 0;
  if (!(hollow > 0)) return { error: "Hollow wall weight must be positive (psf)." };
  if (!(cell > 0)) return { error: "Grouted-cell spacing must be positive (in)." };
  // Ungrouted when grout spacing is 0/blank; capped at full grout (spacing <= cell).
  let grout_term = 0;
  if (gs > 0) grout_term = adder * Math.min(cell / gs, 1);
  const wall_psf = hollow + grout_term;
  const line_load_plf = h > 0 ? wall_psf * h : null;
  const area = Number(area_ft2) || 0;
  const total_lb = area > 0 ? wall_psf * area : null;
  return {
    grout_term, wall_psf, line_load_plf, total_lb,
    note: "Masonry wall dead load: the hollow (ungrouted) wall weight (NCMA table, by thickness and unit density) plus a grout adder prorated by the grout spacing - fully grouted at cell spacing, none if ungrouted, and in between for partial grout (grout_term = adder x cell/spacing, capped at the full adder). Fully grouting can add ~40% to the wall weight and its load on the footing, the trade between reinforcement/strength and dead load. Line load = wall psf x height; total = wall psf x area. A design aid; the NCMA weight tables and the engineer of record govern." ,
  };
}
const masonryWallWeightExample = { inputs: { hollow_psf: 55, grout_adder: 29, cell_spacing: 8, grout_spacing: 48, height_ft: 10, area_ft2: 0 } };
MASONRY_RENDERERS["masonry-wall-weight"] = _simpleRenderer({
  citation: "Citation: masonry wall dead load from NCMA weight tables: wall psf = hollow weight + grout adder x (cell spacing / grout spacing, capped at full); line load = psf x height. The NCMA TEK weight tables and the engineer of record govern.",
  example: masonryWallWeightExample.inputs,
  fields: [
    { key: "hollow_psf", label: "Hollow wall weight (psf, NCMA)", kind: "number" },
    { key: "grout_adder", label: "Full-grout weight adder (psf, NCMA)", kind: "number" },
    { key: "cell_spacing", label: "Grouted-cell spacing at full grout (in; 8 CMU)", kind: "number", default: 8 },
    { key: "grout_spacing", label: "Grout/rebar spacing (in; 0 = ungrouted)", kind: "number", default: 0 },
    { key: "height_ft", label: "Wall height (ft, for line load)", kind: "number" },
    { key: "area_ft2", label: "Wall area (ft^2, optional, for total)", kind: "number" },
  ],
  outputs: [
    { key: "psf", id: "mww-out-psf", label: "Wall weight", value: (r) => fmt(r.wall_psf, 1) + " psf (grout adds " + fmt(r.grout_term, 1) + ")" },
    { key: "line", id: "mww-out-line", label: "Line load", value: (r) => r.line_load_plf == null ? "(enter height)" : fmt(r.line_load_plf, 0) + " lb/ft" },
    { key: "tot", id: "mww-out-tot", label: "Total dead load", value: (r) => r.total_lb == null ? "(enter area)" : fmt(r.total_lb, 0) + " lb" },
    { key: "n", id: "mww-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMasonryWallWeight,
});

// dims: in { area_ft2: L^2, area_per: L^2, max_horiz_in: L, max_vert_in: L } out: { anchors: dimensionless, grid_ft2: L^2 }
export function computeBrickVeneerAnchorSpacing({ area_ft2 = 0, area_per = 2.67, max_horiz_in = 32, max_vert_in = 24 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(area_ft2) || 0;
  const per = Number(area_per) || 0;
  const mh = Number(max_horiz_in) > 0 ? Number(max_horiz_in) : 32;
  const mv = Number(max_vert_in) > 0 ? Number(max_vert_in) : 24;
  if (!(area > 0)) return { error: "Veneer wall area must be positive (ft^2)." };
  if (!(per > 0)) return { error: "Maximum area per anchor must be positive (ft^2)." };
  const anchors = Math.ceil(area / per);
  const grid_ft2 = area / anchors;
  const max_grid_ft2 = (mh * mv) / 144;
  const spacing_governs = max_grid_ft2 < per;
  return {
    anchors, grid_ft2, max_horiz_in: mh, max_vert_in: mv, max_grid_ft2, spacing_governs,
    note: "Brick-veneer anchor count per TMS 402 / IBC 1405: one anchor per no more than the entered wall area (2.67 ft^2 typical, 2.0 ft^2 for high wind/seismic demand), with maximum spacing of 32 in horizontal and 24 in vertical. The count = ceil(area / area-per-anchor). A tighter demand limit adds anchors on a denser grid. If the max horizontal x vertical grid (here " + ((mh * mv) / 144).toFixed(2) + " ft^2) is smaller than the area limit, the spacing caps govern the count. A detailing aid; TMS 402 / IBC and the engineer of record govern.",
  };
}
const brickVeneerAnchorSpacingExample = { inputs: { area_ft2: 200, area_per: 2.67, max_horiz_in: 32, max_vert_in: 24 } };
MASONRY_RENDERERS["brick-veneer-anchor-spacing"] = _simpleRenderer({
  citation: "Citation: brick-veneer anchor spacing per TMS 402 / IBC 1405: one anchor per <= 2.67 ft^2 (2.0 ft^2 high-demand), max 32 in horizontal / 24 in vertical. Count = ceil(area / area-per-anchor). TMS 402 / IBC and the engineer of record govern.",
  example: brickVeneerAnchorSpacingExample.inputs,
  fields: [
    { key: "area_ft2", label: "Veneer wall area (ft^2)", kind: "number" },
    { key: "area_per", label: "Max area per anchor (ft^2; 2.67, 2.0 high-demand)", kind: "number", default: 2.67 },
    { key: "max_horiz_in", label: "Max horizontal spacing (in)", kind: "number", default: 32 },
    { key: "max_vert_in", label: "Max vertical spacing (in)", kind: "number", default: 24 },
  ],
  outputs: [
    { key: "a", id: "bva-out-a", label: "Anchors required", value: (r) => String(r.anchors) },
    { key: "g", id: "bva-out-g", label: "Achieved area per anchor", value: (r) => fmt(r.grid_ft2, 2) + " ft^2/anchor" },
    { key: "s", id: "bva-out-s", label: "Spacing cap check", value: (r) => "max grid " + fmt(r.max_grid_ft2, 2) + " ft^2 (" + r.max_horiz_in + " x " + r.max_vert_in + " in)" + (r.spacing_governs ? " -- spacing governs" : "") },
    { key: "n", id: "bva-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBrickVeneerAnchorSpacing,
});

// dims: in { span_ft: L, wall_psf: M L^-1 T^-2, wall_h_above: L } out: { tri_h_ft: L, W_lb: M L T^-2, w_udl_plf: M T^-2 }
export function computeMasonryLintelLoading({ span_ft = 0, wall_psf = 0, wall_h_above = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const span = Number(span_ft) || 0;
  const psf = Number(wall_psf) || 0;
  const hAbove = Number(wall_h_above) || 0;
  if (!(span > 0)) return { error: "Opening span must be positive (ft)." };
  if (!(psf > 0)) return { error: "Wall weight must be positive (psf)." };
  if (!(hAbove > 0)) return { error: "Height of wall above the opening must be positive (ft)." };
  const tri_h_ft = span / 2;
  const arching = hAbove >= tri_h_ft;
  const W_lb = arching ? 0.5 * span * tri_h_ft * psf : span * hAbove * psf;
  const w_udl_plf = W_lb / span;
  return {
    tri_h_ft, arching, W_lb, w_udl_plf,
    note: "Masonry lintel arching load: for masonry above an opening, the lintel carries only the triangular dead load within a 45-degree triangle (height = span/2) IF enough wall is above (wall above >= span/2). W = 0.5 x span x (span/2) x wall psf, an equivalent UDL of W/span. If the wall above is shorter than the triangle (a lintel near the top of the wall or under a beam bearing), arching is not developed and the lintel carries the full rectangle span x height x psf - MORE load than the arched case, which is why the arching reduction is not always available. Dead load only; add the floor/roof/superimposed loads separately. A design aid; the engineer of record governs.",
  };
}
const masonryLintelLoadingExample = { inputs: { span_ft: 6, wall_psf: 60, wall_h_above: 5 } };
MASONRY_RENDERERS["masonry-lintel-loading"] = _simpleRenderer({
  citation: "Citation: masonry lintel arching load: the triangular dead load in a 45-degree triangle (height span/2) when the wall above >= span/2, else the full rectangle. W = 0.5 x span x (span/2) x wall psf. Dead load only; the engineer of record governs.",
  example: masonryLintelLoadingExample.inputs,
  fields: [
    { key: "span_ft", label: "Opening (clear) span (ft)", kind: "number" },
    { key: "wall_psf", label: "Wall weight above (psf)", kind: "number" },
    { key: "wall_h_above", label: "Height of wall above opening (ft)", kind: "number" },
  ],
  outputs: [
    { key: "w", id: "mll-out-w", label: "Lintel dead load", value: (r) => fmt(r.W_lb, 0) + " lb (" + (r.arching ? "arching, triangular" : "full rectangle -- arching not developed") + ")" },
    { key: "u", id: "mll-out-u", label: "Equivalent UDL", value: (r) => fmt(r.w_udl_plf, 0) + " lb/ft" },
    { key: "t", id: "mll-out-t", label: "Triangle height (span/2)", value: (r) => fmt(r.tri_h_ft, 2) + " ft" },
    { key: "n", id: "mll-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMasonryLintelLoading,
});

// ===================== spec-v449: masonry headed anchor bolt tension (TMS 402 ASD) =====================
// dims: in { fm_psi: M L^-1 T^-2, lbe_in: L, ab_in2: L^2, fy_psi: M L^-1 T^-2 } out: { apt_in2: L^2, bab_lb: M L T^-2, bas_lb: M L T^-2, ba_lb: M L T^-2 }
export function computeMasonryAnchorBolt({ fm_psi = 1500, lbe_in = 0, ab_in2 = 0, fy_psi = 36000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const fm = Number(fm_psi) || 0;
  const lbe = Number(lbe_in) || 0;
  const ab = Number(ab_in2) || 0;
  const fy = Number(fy_psi) || 0;
  if (!(fm > 0)) return { error: "Masonry strength f'm must be positive (psi)." };
  if (!(lbe > 0)) return { error: "Embedment lbe must be positive (in)." };
  if (!(ab > 0)) return { error: "Bolt area Ab must be positive (in^2)." };
  if (!(fy > 0)) return { error: "Bolt yield fy must be positive (psi)." };
  const apt_in2 = Math.PI * lbe * lbe;
  const bab_lb = 1.25 * apt_in2 * Math.sqrt(fm);
  const bas_lb = 0.6 * ab * fy;
  const ba_lb = Math.min(bab_lb, bas_lb);
  const masonry_governs = bab_lb <= bas_lb;
  return {
    apt_in2, bab_lb, bas_lb, ba_lb, masonry_governs,
    note: "TMS 402 allowable-stress design of a headed anchor bolt in tension in grouted masonry: the allowable is the LESSER of masonry breakout Bab = 1.25 x Apt x sqrt(f'm), with Apt = pi x lbe^2 the projected area of the 45-degree tension breakout cone, and steel Bas = 0.6 x Ab x fy. A shallow anchor pulls a cone of block out (masonry governs); a deep enough anchor makes the steel yield first (steel governs). Edge distance or overlapping cones reduce Apt (the full-cone value is an upper bound); anchor shear (pryout) is a separate check. The strength-design coefficient is 4 x Apt x sqrt(f'm). A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  };
}
export const masonryAnchorBoltExample = { inputs: { fm_psi: 1500, lbe_in: 4, ab_in2: 0.442, fy_psi: 36000 } };
MASONRY_RENDERERS["masonry-anchor-bolt"] = _simpleRenderer({
  citation: "Citation: TMS 402 ASD headed anchor bolt tension: allowable = lesser of masonry breakout Bab = 1.25 x Apt x sqrt(f'm) (Apt = pi x lbe^2, the projected cone) and steel Bas = 0.6 x Ab x fy. Edge distance reduces Apt; shear is a separate check. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: masonryAnchorBoltExample.inputs,
  fields: [
    { key: "fm_psi", label: "Masonry strength f'm (psi)", kind: "number", default: 1500 },
    { key: "lbe_in", label: "Effective embedment lbe (in)", kind: "number", default: 4 },
    { key: "ab_in2", label: "Bolt tensile area Ab (in^2, 3/4in = 0.442)", kind: "number", default: 0.442 },
    { key: "fy_psi", label: "Bolt yield fy (psi, A307 = 36000)", kind: "number", default: 36000 },
  ],
  outputs: [
    { key: "ba", id: "mab-out-ba", label: "Allowable tension Ba", value: (r) => fmt(r.ba_lb, 0) + " lb (" + (r.masonry_governs ? "masonry breakout governs" : "steel governs") + ")" },
    { key: "bab", id: "mab-out-bab", label: "Masonry breakout Bab", value: (r) => fmt(r.bab_lb, 0) + " lb" },
    { key: "bas", id: "mab-out-bas", label: "Steel Bas", value: (r) => fmt(r.bas_lb, 0) + " lb" },
    { key: "apt", id: "mab-out-apt", label: "Projected area Apt = pi lbe^2", value: (r) => fmt(r.apt_in2, 1) + " in^2" },
    { key: "n", id: "mab-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMasonryAnchorBolt,
});
