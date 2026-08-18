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
    { key: "as_in2", label: "Steel area As over the strip (in²)", kind: "number" },
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
    { key: "av_in2", label: "Horizontal bar area Av (in², 0 = none)", kind: "number", default: 0 },
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
    { key: "an_in2", label: "Net area An (in²)", kind: "number" },
    { key: "ast_in2", label: "Vertical steel Ast, tied (in², 0 = untied)", kind: "number", default: 0 },
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
export const masonryWallWeightExample = { inputs: { hollow_psf: 55, grout_adder: 29, cell_spacing: 8, grout_spacing: 48, height_ft: 10, area_ft2: 0 } };
MASONRY_RENDERERS["masonry-wall-weight"] = _simpleRenderer({
  citation: "Citation: masonry wall dead load from NCMA weight tables: wall psf = hollow weight + grout adder x (cell spacing / grout spacing, capped at full); line load = psf x height. The NCMA TEK weight tables and the engineer of record govern.",
  example: masonryWallWeightExample.inputs,
  fields: [
    { key: "hollow_psf", label: "Hollow wall weight (psf, NCMA)", kind: "number" },
    { key: "grout_adder", label: "Full-grout weight adder (psf, NCMA)", kind: "number" },
    { key: "cell_spacing", label: "Grouted-cell spacing at full grout (in; 8 CMU)", kind: "number", default: 8 },
    { key: "grout_spacing", label: "Grout/rebar spacing (in; 0 = ungrouted)", kind: "number", default: 0 },
    { key: "height_ft", label: "Wall height (ft, for line load)", kind: "number" },
    { key: "area_ft2", label: "Wall area (ft², optional, for total)", kind: "number" },
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
  // Each anchor must satisfy BOTH the area-per-anchor limit AND the maximum
  // horizontal x vertical spacing grid, so the effective coverage is the
  // tighter (smaller) of the two -- otherwise the spacing caps the note and
  // citation say govern would never actually reduce the count.
  const max_grid_ft2 = (mh * mv) / 144;
  const eff_per = Math.min(per, max_grid_ft2);
  const anchors = Math.ceil(area / eff_per);
  const grid_ft2 = area / anchors;
  const spacing_governs = max_grid_ft2 < per;
  return {
    anchors, grid_ft2, max_horiz_in: mh, max_vert_in: mv, max_grid_ft2, spacing_governs,
    note: "Brick-veneer anchor count per TMS 402 / IBC 1405: one anchor per no more than the entered wall area (2.67 ft^2 typical, 2.0 ft^2 for high wind/seismic demand), with maximum spacing of 32 in horizontal and 24 in vertical. The count = ceil(area / area-per-anchor). A tighter demand limit adds anchors on a denser grid. If the max horizontal x vertical grid (here " + ((mh * mv) / 144).toFixed(2) + " ft^2) is smaller than the area limit, the spacing caps govern the count. A detailing aid; TMS 402 / IBC and the engineer of record govern.",
  };
}
export const brickVeneerAnchorSpacingExample = { inputs: { area_ft2: 200, area_per: 2.67, max_horiz_in: 32, max_vert_in: 24 } };
MASONRY_RENDERERS["brick-veneer-anchor-spacing"] = _simpleRenderer({
  citation: "Citation: brick-veneer anchor spacing per TMS 402 / IBC 1405: one anchor per <= 2.67 ft^2 (2.0 ft^2 high-demand), max 32 in horizontal / 24 in vertical. Count = ceil(area / area-per-anchor). TMS 402 / IBC and the engineer of record govern.",
  example: brickVeneerAnchorSpacingExample.inputs,
  fields: [
    { key: "area_ft2", label: "Veneer wall area (ft²)", kind: "number" },
    { key: "area_per", label: "Max area per anchor (ft²; 2.67, 2.0 high-demand)", kind: "number", default: 2.67 },
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
export const masonryLintelLoadingExample = { inputs: { span_ft: 6, wall_psf: 60, wall_h_above: 5 } };
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
    { key: "ab_in2", label: "Bolt tensile area Ab (in², 3/4in = 0.442)", kind: "number", default: 0.442 },
    { key: "fy_psi", label: "Bolt yield fy (psi, A307 = 36000)", kind: "number", default: 36000 },
  ],
  outputs: [
    { key: "ba", id: "mab-out-ba", label: "Allowable tension Ba", value: (r) => fmt(r.ba_lb, 0) + " lb (" + (r.masonry_governs ? "masonry breakout governs" : "steel governs") + ")" },
    { key: "bab", id: "mab-out-bab", label: "Masonry breakout Bab", value: (r) => fmt(r.bab_lb, 0) + " lb" },
    { key: "bas", id: "mab-out-bas", label: "Steel Bas", value: (r) => fmt(r.bas_lb, 0) + " lb" },
    { key: "apt", id: "mab-out-apt", label: "Projected area Apt = pi lbe²", value: (r) => fmt(r.apt_in2, 1) + " in^2" },
    { key: "n", id: "mab-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMasonryAnchorBolt,
});

// ===================== spec-v705: masonry anchor embedment for a tension (inverse) =====================
// The inverse of masonry-anchor-bolt: given a required tension, solve the TMS 402
// masonry-breakout branch for the embedment. Bab = 1.25 x (pi lbe^2) x sqrt(f'm),
// so lbe = sqrt( T / (1.25 pi sqrt(f'm)) ). The steel branch Bas = 0.6 Ab fy is
// checked separately: if it is below the target no embedment can reach it.
// dims: in { required_tension_lb: M L T^-2, fm_psi: M L^-1 T^-2, ab_in2: L^2, fy_psi: M L^-1 T^-2 } out: { lbe_in: L, apt_in2: L^2, bas_lb: M L T^-2, steel_adequate: dimensionless }
export function computeMasonryAnchorEmbedment({ required_tension_lb = 0, fm_psi = 1500, ab_in2 = 0.442, fy_psi = 36000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const T = Number(required_tension_lb) || 0;
  const fm = Number(fm_psi) || 0;
  const ab = Number(ab_in2) || 0;
  const fy = Number(fy_psi) || 0;
  if (!(T > 0)) return { error: "Required tension must be positive (lb)." };
  if (!(fm > 0)) return { error: "Masonry strength f'm must be positive (psi)." };
  if (!(ab > 0)) return { error: "Bolt area Ab must be positive (in^2)." };
  if (!(fy > 0)) return { error: "Bolt yield fy must be positive (psi)." };
  const lbe_in = Math.sqrt(T / (1.25 * Math.PI * Math.sqrt(fm)));
  const apt_in2 = Math.PI * lbe_in * lbe_in;
  const bas_lb = 0.6 * ab * fy;
  const steel_adequate = bas_lb >= T;
  return {
    lbe_in, apt_in2, bas_lb, steel_adequate,
    note: "The effective embedment lbe that makes the TMS 402 masonry-breakout capacity Bab = 1.25 x (pi lbe^2) x sqrt(f'm) equal the required tension, the inverse of masonry-anchor-bolt. Deeper embedment pulls a larger 45-degree cone and carries more load. The steel branch Bas = 0.6 x Ab x fy is a separate ceiling: if it is below the required tension the bolt yields no matter how deep it is set, so a larger-diameter or higher-grade bolt is needed. Edge distance or overlapping cones reduce the projected area Apt (this full-cone value is an upper bound, so the real required embedment is deeper); anchor shear (pryout) is a separate check. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  };
}
export const masonryAnchorEmbedmentExample = { inputs: { required_tension_lb: 5000, fm_psi: 1500, ab_in2: 0.442, fy_psi: 36000 } };
MASONRY_RENDERERS["masonry-anchor-embedment"] = _simpleRenderer({
  citation: "Citation: TMS 402 ASD headed anchor bolt tension solved for the embedment: lbe = sqrt(T / (1.25 pi sqrt(f'm))) from the masonry breakout branch Bab = 1.25 x Apt x sqrt(f'm) (Apt = pi lbe^2). The steel branch Bas = 0.6 Ab fy is a separate ceiling. Edge distance reduces Apt; shear is a separate check. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: masonryAnchorEmbedmentExample.inputs,
  fields: [
    { key: "required_tension_lb", label: "Required tension T (lb)", kind: "number", default: 5000 },
    { key: "fm_psi", label: "Masonry strength f'm (psi)", kind: "number", default: 1500 },
    { key: "ab_in2", label: "Bolt tensile area Ab (in², 3/4in = 0.442)", kind: "number", default: 0.442 },
    { key: "fy_psi", label: "Bolt yield fy (psi, A307 = 36000)", kind: "number", default: 36000 },
  ],
  outputs: [
    { key: "lbe", id: "mae-out-lbe", label: "Required embedment lbe", value: (r) => fmt(r.lbe_in, 2) + " in" },
    { key: "apt", id: "mae-out-apt", label: "Projected area Apt = pi lbe²", value: (r) => fmt(r.apt_in2, 1) + " in^2" },
    { key: "bas", id: "mae-out-bas", label: "Steel ceiling Bas = 0.6 Ab fy", value: (r) => fmt(r.bas_lb, 0) + " lb (" + (r.steel_adequate ? "adequate for T" : "BELOW T -- use a larger/stronger bolt") + ")" },
    { key: "n", id: "mae-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMasonryAnchorEmbedment,
});

// ===================== spec-v1232: masonry anchor bolt in SHEAR (Group E) =====================
// The shear companion the masonry-anchor-bolt / -embedment tension pair names as "a separate
// check." TMS 402-16 ASD (Section 8.1.5.2): the allowable shear is the LEAST of four modes --
// masonry breakout Bvb = 1.25 x Apv x sqrt(f'm) with Apv = pi x lbe^2 / 2 (the half-cone toward
// the free edge, lbe = edge distance); masonry crushing Bvc = 350 x (f'm x Ab)^(1/4); anchor
// pryout Bvpry = 2.0 x Bab where Bab = 1.25 x Apt x sqrt(f'm) is the tension breakout on the
// embedment (Apt = pi x lb^2); and steel Bvs = 0.36 x Ab x fy. The crushing 350 coefficient is
// verified directly from NCMA TEK 12-03A (stable across editions); the 0.36 shear-steel
// coefficient is the edition-stable 0.6 x the tension-steel 0.6 (TEK 12-03A had 0.12 = 0.6 x 0.2).
// dims: in { fm_psi: M L^-1 T^-2, lb_in: L, lbe_in: L, ab_in2: L^2, fy_psi: M L^-1 T^-2 } out: { apv_in2: L^2, bvb_lb: M L T^-2, bvc_lb: M L T^-2, bvpry_lb: M L T^-2, bvs_lb: M L T^-2, bv_lb: M L T^-2 }
export function computeMasonryAnchorShear({ fm_psi = 1500, lb_in = 5, lbe_in = 4, ab_in2 = 0.442, fy_psi = 36000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const fm = Number(fm_psi) || 0;
  const lb = Number(lb_in) || 0;
  const lbe = Number(lbe_in) || 0;
  const ab = Number(ab_in2) || 0;
  const fy = Number(fy_psi) || 0;
  if (!(fm > 0)) return { error: "Masonry strength f'm must be positive (psi)." };
  if (!(lb > 0)) return { error: "Effective embedment lb must be positive (in)." };
  if (!(lbe > 0)) return { error: "Edge distance lbe must be positive (in)." };
  if (!(ab > 0)) return { error: "Bolt area Ab must be positive (in^2)." };
  if (!(fy > 0)) return { error: "Bolt yield fy must be positive (psi)." };
  const apv_in2 = Math.PI * lbe * lbe / 2;
  const apt_in2 = Math.PI * lb * lb;
  const bvb_lb = 1.25 * apv_in2 * Math.sqrt(fm);
  const bvc_lb = 350 * Math.pow(fm * ab, 0.25);
  const bab_lb = 1.25 * apt_in2 * Math.sqrt(fm);
  const bvpry_lb = 2.0 * bab_lb;
  const bvs_lb = 0.36 * ab * fy;
  const bv_lb = Math.min(bvb_lb, bvc_lb, bvpry_lb, bvs_lb);
  const modes = [["masonry breakout", bvb_lb], ["masonry crushing", bvc_lb], ["anchor pryout", bvpry_lb], ["bolt steel", bvs_lb]];
  const governing_mode = modes.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
  if (![apv_in2, bvb_lb, bvc_lb, bvpry_lb, bvs_lb, bv_lb].every(Number.isFinite)) return { error: "Shear capacity is not a finite value." };
  return {
    apv_in2, bvb_lb, bvc_lb, bvpry_lb, bvs_lb, bv_lb, governing_mode,
    note: "TMS 402-16 allowable-stress design of a headed anchor bolt in shear in grouted masonry: the allowable is the LEAST of four modes. Masonry breakout Bvb = 1.25 x Apv x sqrt(f'm), with Apv = pi x lbe^2 / 2 the projected half-cone toward the free edge (lbe = edge distance), governs only when the bolt is near an edge. Masonry crushing Bvc = 350 x (f'm x Ab)^(1/4), localized bearing of the shank on the block, usually governs away from edges. Anchor pryout Bvpry = 2.0 x Bab (Bab = the tension breakout on the embedment) governs only at very shallow embedment. Bolt steel Bvs = 0.36 x Ab x fy governs for a stout, well-embedded, interior bolt. Overlapping cones or an open cell reduce Apv (the full-half-cone value is an upper bound), and when lbe is below 12 bolt diameters TMS 402 further reduces the breakout branch toward zero at lbe = 1 in -- not applied here, so verify the edge branch separately for a shallow edge distance. Combined tension and shear use the unity check ba/Ba + bv/Bv <= 1 (a separate step). A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  };
}
export const masonryAnchorShearExample = { inputs: { fm_psi: 1500, lb_in: 5, lbe_in: 4, ab_in2: 0.442, fy_psi: 36000 } };
MASONRY_RENDERERS["masonry-anchor-shear"] = _simpleRenderer({
  citation: "Citation: TMS 402-16 ASD headed anchor bolt shear (Section 8.1.5.2): allowable = least of masonry breakout Bvb = 1.25 x Apv x sqrt(f'm) (Apv = pi lbe^2 / 2, lbe = edge distance), masonry crushing Bvc = 350 x (f'm Ab)^(1/4), anchor pryout Bvpry = 2.0 x Bab (Bab = 1.25 x pi lb^2 x sqrt(f'm)), and bolt steel Bvs = 0.36 x Ab x fy. Crushing coefficient verified vs NCMA TEK 12-03A. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: masonryAnchorShearExample.inputs,
  fields: [
    { key: "fm_psi", label: "Masonry strength f'm (psi)", kind: "number", default: 1500 },
    { key: "lb_in", label: "Effective embedment lb (in)", kind: "number", default: 5 },
    { key: "lbe_in", label: "Edge distance lbe (in)", kind: "number", default: 4 },
    { key: "ab_in2", label: "Bolt tensile area Ab (in², 3/4in = 0.442)", kind: "number", default: 0.442 },
    { key: "fy_psi", label: "Bolt yield fy (psi, A307 = 36000)", kind: "number", default: 36000 },
  ],
  outputs: [
    { key: "bv", id: "mas-out-bv", label: "Allowable shear Bv", value: (r) => fmt(r.bv_lb, 0) + " lb (" + r.governing_mode + " governs)" },
    { key: "bvb", id: "mas-out-bvb", label: "Masonry breakout Bvb", value: (r) => fmt(r.bvb_lb, 0) + " lb (Apv = " + fmt(r.apv_in2, 1) + " in^2)" },
    { key: "bvc", id: "mas-out-bvc", label: "Masonry crushing Bvc", value: (r) => fmt(r.bvc_lb, 0) + " lb" },
    { key: "bvpry", id: "mas-out-bvpry", label: "Anchor pryout Bvpry", value: (r) => fmt(r.bvpry_lb, 0) + " lb" },
    { key: "bvs", id: "mas-out-bvs", label: "Bolt steel Bvs", value: (r) => fmt(r.bvs_lb, 0) + " lb" },
    { key: "n", id: "mas-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMasonryAnchorShear,
});

// ===================== spec-v551: masonry unit-strength f'm (Group E) =====================
// The upstream f'm the whole CMU wall bench (cmu-wall-axial / -flexure / -shear-wall /
// masonry-anchor-bolt) consumes but none derives. TMS 602-16 Table 2 unit-strength
// method: from the net-area unit compressive strength and the mortar type, read the
// net-area masonry compressive strength f'm without a prism test. f'm is NOT the unit
// strength -- Type N mortar yields a lower f'm than Type M or S for the same unit, and
// at higher unit strengths f'm is only a fraction of the block strength.
//
// TMS 602-16 Table 2 (concrete masonry), stored as (net-area unit strength psi -> f'm psi):
//   Type M or S:  2000->2000, 2600->2250, 3250->2500, 3900->2750, 4500->3000
//   Type N:       2000->1750, 2650->2000, 3400->2250, 4350->2500
// Linear interpolation between rows is permitted. 2,000 psi is the ASTM C90 net-area
// minimum (a weaker unit does not qualify for the method), and the table caps design
// f'm (a higher f'm needs a prism test / record of tests).
const _PRISM_FM_TABLE = {
  ms: [[2000, 2000], [2600, 2250], [3250, 2500], [3900, 2750], [4500, 3000]],
  n: [[2000, 1750], [2650, 2000], [3400, 2250], [4350, 2500]],
};

// dims: in { unit_strength_psi: M L^-1 T^-2, unit_type: dimensionless, mortar_type: dimensionless } out: { f_m_psi: M L^-1 T^-2 }
export function computeMasonryPrismFm({ unit_type = "concrete", unit_strength_psi = 2000, mortar_type = "ms" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const u = Number(unit_strength_psi) || 0;
  if (!(u > 0)) return { error: "Net-area unit compressive strength must be positive (psi)." };
  if (unit_type !== "concrete" && unit_type !== "clay") return { error: "Unit type must be concrete (CMU) or clay." };
  if (unit_type === "clay") return { error: "This tile covers concrete (CMU) units; the clay-masonry Table 2 branch is a future addition." };
  if (mortar_type !== "ms" && mortar_type !== "n") return { error: "Mortar type must be M or S, or N." };
  const rows = _PRISM_FM_TABLE[mortar_type];
  const uMin = rows[0][0], uMax = rows[rows.length - 1][0], fMax = rows[rows.length - 1][1];
  let f_m_psi = 0, below_range = false, above_range = false;
  if (u <= uMin) {
    // At the C90 minimum, take the bottom row exactly; below it, extrapolate the bottom
    // segment (a lower, conservative f'm) and flag that the unit does not qualify.
    if (u === uMin) { f_m_psi = rows[0][1]; }
    else {
      below_range = true;
      const [u0, f0] = rows[0], [u1, f1] = rows[1];
      f_m_psi = f0 + (f1 - f0) * (u - u0) / (u1 - u0);
    }
  } else if (u >= uMax) {
    // The unit-strength method caps f'm at the tabulated maximum; a higher f'm needs a
    // prism test. Clamp and flag.
    above_range = u > uMax;
    f_m_psi = fMax;
  } else {
    for (let i = 0; i < rows.length - 1; i++) {
      const [u0, f0] = rows[i], [u1, f1] = rows[i + 1];
      if (u >= u0 && u <= u1) { f_m_psi = f0 + (f1 - f0) * (u - u0) / (u1 - u0); break; }
    }
  }
  const mortarLabel = mortar_type === "ms" ? "Type M or S" : "Type N";
  return {
    f_m_psi, below_range, above_range,
    note: "TMS 602-16 Table 2 unit-strength method (assumed f'm without a prism test): from the net-area unit strength and the mortar type, " + mortarLabel + " mortar gives f'm " + fmt(f_m_psi, 0) + " psi" + (below_range ? " (below the 2,000 psi ASTM C90 minimum -- the unit does not qualify; value extrapolated)" : "") + (above_range ? " (above the table -- capped; a higher f'm needs a prism test)" : "") + ". f'm is not the unit strength: a 2,000 psi concrete unit gives f'm 2,000 in Type M/S but only 1,750 in Type N, and a 3,250 psi unit in Type M/S gives 2,500 (77% of the block). Grouting and inspection requirements apply. A specification aid -- TMS 602 and the engineer of record (or a prism test) govern.",
  };
}
export const masonryPrismFmExample = { inputs: { unit_type: "concrete", unit_strength_psi: 2000, mortar_type: "ms" } };
MASONRY_RENDERERS["masonry-prism-fm"] = _simpleRenderer({
  citation: "Citation: TMS 602-16 Table 2 unit-strength method for concrete masonry -- the assumed net-area masonry compressive strength f'm from the net-area unit compressive strength and the mortar type, without a prism test. A 2,000 psi (net) concrete unit gives f'm 2,000 psi in Type M or S mortar but only 1,750 psi in Type N; a 3,250 psi unit in Type M/S gives 2,500 psi. Linear interpolation between the Table 2 rows; 2,000 psi is the ASTM C90 net-area minimum and the table caps design f'm (a higher value needs a prism test). A specification aid, not a substitute for TMS 602 and the engineer of record.",
  example: masonryPrismFmExample.inputs,
  fields: [
    { key: "unit_type", label: "Unit type", kind: "select", default: "concrete", options: [{ value: "concrete", label: "Concrete (CMU)" }, { value: "clay", label: "Clay (not yet supported)" }] },
    { key: "unit_strength_psi", label: "Net-area unit strength (psi)", kind: "number", default: 2000 },
    { key: "mortar_type", label: "Mortar type", kind: "select", default: "ms", options: [{ value: "ms", label: "Type M or S" }, { value: "n", label: "Type N" }] },
  ],
  outputs: [
    { key: "fm", id: "mpf-out-fm", label: "Assumed f'm", value: (r) => fmt(r.f_m_psi, 0) + " psi" + (r.below_range ? " (below C90 minimum)" : r.above_range ? " (capped -- prism test for more)" : "") },
    { key: "n", id: "mpf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMasonryPrismFm,
});

// ===================== spec-v919: brick veneer weep-hole count =====================
// dims: in { wall_length_ft: L, max_spacing_in: L, flashing_lines: dimensionless } out: { weeps_per_line: dimensionless, total_weeps: dimensionless }
export function computeBrickVeneerWeepCount({ wall_length_ft = 30, max_spacing_in = 33, flashing_lines = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(wall_length_ft > 0)) return { error: "Wall length must be positive (ft)." };
  if (!(max_spacing_in > 0)) return { error: "Maximum spacing must be positive (in)." };
  if (!(flashing_lines > 0)) return { error: "Flashing lines must be positive." };
  const length_in = wall_length_ft * 12;
  // Weeps at the ends plus one every max_spacing: count = ceil(length / spacing) + 1.
  const weeps_per_line = Math.ceil(length_in / max_spacing_in) + 1;
  const total_weeps = weeps_per_line * Math.round(flashing_lines);
  if (![weeps_per_line, total_weeps].every(Number.isFinite)) return { error: "Weep-count math is not a finite value." };
  return {
    weeps_per_line,
    total_weeps,
    note: "Weep holes drain the veneer air space at every through-wall flashing line. IRC R703.8.6 and TMS 402 cap them at 33 in on center (a common tighter spec is 24 in), at least 3/16 in diameter, immediately above the flashing. The count is ceil(length / spacing) + 1 so both ends get a weep, per flashing line -- the base course plus every shelf angle, lintel, and other through-wall flashing above openings each need their own line. A 30 ft wall at 33 in is 12 weeps per line. The weeps must sit directly on the flashing with a clear, un-mortar-clogged air space behind; the AHJ-adopted code and the wall detail govern.",
  };
}
export const brickVeneerWeepCountExample = { inputs: { wall_length_ft: 30, max_spacing_in: 33, flashing_lines: 1 } };

MASONRY_RENDERERS["brick-veneer-weep-count"] = _simpleRenderer({
  citation: "Citation: brick veneer weep spacing by name (IRC R703.8.6 / TMS 402). weeps per line = ceil(wall length in / max spacing) + 1; weeps <= 33 in o.c., >= 3/16 in dia, directly above each through-wall flashing line. The AHJ-adopted code and the wall detail govern.",
  example: brickVeneerWeepCountExample.inputs,
  fields: [
    { key: "wall_length_ft", label: "Wall / flashing length (ft)", kind: "number", default: 30 },
    { key: "max_spacing_in", label: "Max weep spacing (in, code cap 33)", kind: "number", default: 33 },
    { key: "flashing_lines", label: "Flashing lines (base + lintels)", kind: "number", default: 1 },
  ],
  outputs: [
    { key: "wpl", id: "bvw-out-wpl", label: "Weeps per flashing line", value: (r) => fmt(r.weeps_per_line, 0) },
    { key: "tot", id: "bvw-out-tot", label: "Total weep holes", value: (r) => fmt(r.total_weeps, 0) },
    { key: "n", id: "bvw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBrickVeneerWeepCount,
});

// ===================== spec-v922: masonry horizontal joint-reinforcement takeoff =====================
// dims: in { wall_length_ft: L, wall_height_ft: L, vertical_spacing_in: L, piece_length_ft: L } out: { reinforced_courses: dimensionless, pieces_per_course: dimensionless, total_pieces: dimensionless }
export function computeMasonryJointReinforcement({ wall_length_ft = 40, wall_height_ft = 12, vertical_spacing_in = 16, piece_length_ft = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(wall_length_ft > 0)) return { error: "Wall length must be positive (ft)." };
  if (!(wall_height_ft > 0)) return { error: "Wall height must be positive (ft)." };
  if (!(vertical_spacing_in > 0)) return { error: "Vertical spacing must be positive (in)." };
  if (!(piece_length_ft > 0)) return { error: "Piece length must be positive (ft)." };
  const reinforced_courses = Math.ceil(wall_height_ft * 12 / vertical_spacing_in);
  const pieces_per_course = Math.ceil(wall_length_ft / piece_length_ft);
  const total_pieces = reinforced_courses * pieces_per_course;
  if (![reinforced_courses, pieces_per_course, total_pieces].every(Number.isFinite)) return { error: "Joint-reinforcement math is not a finite value." };
  return {
    reinforced_courses,
    pieces_per_course,
    total_pieces,
    note: "Horizontal joint reinforcement (ladder or truss wire) laid in the bed joints of a masonry wall: reinforced courses = ceil(height / vertical spacing), pieces per course = ceil(length / piece length), total = courses x pieces. IRC R606.12.2 / TMS 402 set the maximum vertical spacing at 16 in (every other 8 in course); some specs tighten it to 8 in or add wire at bond beams, lintels, and above and below openings. Wire comes in ~10 ft lengths lapped at least 6 in (the lap is not added here). A 40 x 12 ft CMU wall at 16 in is 9 courses x 4 pieces = 36. A material count; the spacing, the lap, and the extra wire at openings come from the structural spec and the adopted code.",
  };
}
export const masonryJointReinforcementExample = { inputs: { wall_length_ft: 40, wall_height_ft: 12, vertical_spacing_in: 16, piece_length_ft: 10 } };

MASONRY_RENDERERS["masonry-joint-reinforcement"] = _simpleRenderer({
  citation: "Citation: masonry joint-reinforcement takeoff by name. reinforced courses = ceil(height in / vertical spacing); pieces per course = ceil(length / piece length); total = courses x pieces. IRC R606.12.2 / TMS 402 cap the vertical spacing at 16 in; wire laps >= 6 in. The structural spec and the adopted code govern.",
  example: masonryJointReinforcementExample.inputs,
  fields: [
    { key: "wall_length_ft", label: "Wall length (ft)", kind: "number", default: 40 },
    { key: "wall_height_ft", label: "Wall height (ft)", kind: "number", default: 12 },
    { key: "vertical_spacing_in", label: "Vertical spacing (in, code cap 16)", kind: "number", default: 16 },
    { key: "piece_length_ft", label: "Wire piece length (ft)", kind: "number", default: 10 },
  ],
  outputs: [
    { key: "c", id: "mjr-out-c", label: "Reinforced courses", value: (r) => fmt(r.reinforced_courses, 0) },
    { key: "p", id: "mjr-out-p", label: "Pieces per course", value: (r) => fmt(r.pieces_per_course, 0) },
    { key: "t", id: "mjr-out-t", label: "Total wire pieces", value: (r) => fmt(r.total_pieces, 0) + " pieces" },
    { key: "n", id: "mjr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMasonryJointReinforcement,
});

// ===================== spec-v1032: masonry lintel bearing length (TMS 402) =====================
// The companion masonry-lintel-loading returns the LOAD only; this takes the reaction to the
// support. Effective span = clear span + depth, capped at the distance between support centers
// (TMS/MSJC 2.3.3.4.1); end bearing not less than 4 in (2.3.3.4.3). The allowable bearing stress
// is an INPUT, not a recalled coefficient - published secondary sources disagree on it (one-fourth
// vs one-third of f'm), so the tile takes the designer's value from the governing code edition and
// says so, rather than shipping a number it cannot verify.
// dims: in { clear_span_ft: L, lintel_depth_in: L, support_center_ft: L, udl_plf: M T^-2, bearing_width_in: L, allowable_bearing_psi: M L^-1 T^-2 } out: { eff_span_ft: L, reaction_lb: M L T^-2, required_bearing_in: L, governing_bearing_in: L }
export function computeMasonryLintelBearing({ clear_span_ft = 0, lintel_depth_in = 8, support_center_ft = 0, udl_plf = 0, bearing_width_in = 7.625, allowable_bearing_psi = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const clear = Number(clear_span_ft) || 0;
  const depth = Number(lintel_depth_in) || 0;
  const centers = Number(support_center_ft) || 0;
  const w = Number(udl_plf) || 0;
  const bw = Number(bearing_width_in) || 0;
  const Fbr = Number(allowable_bearing_psi) || 0;
  if (!(clear > 0)) return { error: "Clear span must be positive (ft)." };
  if (!(depth > 0)) return { error: "Lintel depth must be positive (in)." };
  if (centers < 0) return { error: "Support-center distance cannot be negative (ft); enter 0 to use clear span + depth." };
  if (centers > 0 && centers < clear) return { error: "Support centers cannot be closer than the clear span." };
  if (!(w > 0)) return { error: "Uniform load must be positive (lb/ft) - chain it from masonry-lintel-loading." };
  if (!(bw > 0)) return { error: "Bearing width must be positive (in) - the wall thickness carrying the lintel end." };
  if (!(Fbr > 0)) return { error: "Allowable bearing stress must be positive (psi) - from your f'm and the governing code edition." };
  const span_by_depth_ft = clear + depth / 12;
  const eff_span_ft = centers > 0 ? Math.min(span_by_depth_ft, centers) : span_by_depth_ft;
  const span_capped = centers > 0 && centers < span_by_depth_ft;
  const reaction_lb = w * eff_span_ft / 2;
  const required_area_in2 = reaction_lb / Fbr;
  const required_bearing_in = required_area_in2 / bw;
  const CODE_MIN_BEARING_IN = 4;
  const governing_bearing_in = Math.max(required_bearing_in, CODE_MIN_BEARING_IN);
  const code_min_governs = required_bearing_in <= CODE_MIN_BEARING_IN;
  if (![eff_span_ft, reaction_lb, required_bearing_in, governing_bearing_in].every(Number.isFinite)) return { error: "Lintel-bearing math did not produce a finite value." };
  return {
    span_by_depth_ft, eff_span_ft, span_capped, reaction_lb, required_area_in2,
    required_bearing_in, code_min_in: CODE_MIN_BEARING_IN, governing_bearing_in, code_min_governs,
    note: (code_min_governs
      ? "The 4-in CODE MINIMUM governs here, not the stress check - which is the usual outcome for ordinary lintels and the reason a stress calculation alone can mislead: it would have permitted " + required_bearing_in.toFixed(2) + " in. "
      : "The stress check governs here: " + required_bearing_in.toFixed(2) + " in exceeds the 4-in code minimum, so bearing is a real constraint on this lintel - lengthen the bearing, widen it, or raise f'm. ")
      + "Effective span is the clear span plus the lintel depth, capped at the distance between support centers. The allowable bearing stress is YOUR input from the governing code edition and f'm - published secondary sources disagree on the coefficient (one-fourth versus one-third of f'm), so this tile does not pick one. Uniform load only; chain it from masonry-lintel-loading for the arching dead load and add the floor, roof, and superimposed loads. Bearing is one check: lintel flexure, shear, and deflection are separate, and so is the bearing capacity of the masonry BELOW the lintel end. TMS 402 and the engineer of record govern.",
  };
}
export const masonryLintelBearingExample = { inputs: { clear_span_ft: 6, lintel_depth_in: 8, support_center_ft: 0, udl_plf: 500, bearing_width_in: 7.625, allowable_bearing_psi: 500 } };
MASONRY_RENDERERS["masonry-lintel-bearing"] = _simpleRenderer({
  citation: "Citation: TMS 402 (MSJC) lintel bearing - effective span is the clear span plus the member depth but not more than the distance between support centers (2.3.3.4.1), and the end bearing shall not be less than 4 in (2.3.3.4.3). Required bearing length = end reaction / (allowable bearing stress x bearing width), and the governing length is the greater of that and the 4-in minimum. The allowable bearing stress is entered by the user from the governing code edition and f'm - this tile deliberately ships no coefficient, because published secondary sources disagree (one-fourth versus one-third of f'm). Bearing only: lintel flexure, shear, deflection, and the capacity of the masonry below the bearing are separate checks. TMS 402 and the engineer of record govern.",
  example: masonryLintelBearingExample.inputs,
  fields: [
    { key: "clear_span_ft", label: "Clear span of opening (ft)", kind: "number" },
    { key: "lintel_depth_in", label: "Lintel depth (in)", kind: "number", default: 8 },
    { key: "support_center_ft", label: "Distance between support centers (ft, 0 = use span + depth)", kind: "number", default: 0 },
    { key: "udl_plf", label: "Uniform load on lintel (lb/ft)", kind: "number" },
    { key: "bearing_width_in", label: "Bearing width (in, wall thickness at the end)", kind: "number", default: 7.625 },
    { key: "allowable_bearing_psi", label: "Allowable bearing stress (psi, from your code edition)", kind: "number" },
  ],
  outputs: [
    { key: "sp", id: "mlb-out-sp", label: "Effective span", value: (r) => fmt(r.eff_span_ft, 3) + " ft" + (r.span_capped ? " (capped at the support centers)" : " (clear span + depth)") },
    { key: "rx", id: "mlb-out-rx", label: "End reaction", value: (r) => fmt(r.reaction_lb, 0) + " lb" },
    { key: "req", id: "mlb-out-req", label: "Bearing length by stress", value: (r) => fmt(r.required_bearing_in, 2) + " in (area " + fmt(r.required_area_in2, 2) + " in^2)" },
    { key: "gov", id: "mlb-out-gov", label: "Governing bearing length", value: (r) => fmt(r.governing_bearing_in, 2) + " in - " + (r.code_min_governs ? "the 4 in code minimum governs" : "the stress check governs") },
    { key: "n", id: "mlb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMasonryLintelBearing,
});


// ===================== spec-v1119: masonry fireplace flue area (IRC R1003.15.1) =====================

// The code's Option 1 ratio test. The flue must be big enough for the opening it serves, and
// the required fraction depends on the flue's SHAPE, not just its area: a round flue moves
// smoke most efficiently and is allowed the smallest fraction (1/12), a square or nearly
// square flue needs 1/10, and a skinny rectangle 2:1 or worse needs 1/8 because the corners
// and the boundary layer waste part of its cross section. All three ratios are conditioned on
// a chimney at least 15 ft tall, measured from the firebox floor to the top of the flue.
// Clay liner NOMINAL sizes are not their net areas, so this tile takes the ACTUAL inside
// dimensions - the liner tables are code-document tables and are not reproduced here.
// dims: in { opening_width_in: L, opening_height_in: L, flue_shape: dimensionless, flue_inside_dia_in: L, flue_inside_a_in: L, flue_inside_b_in: L, chimney_height_ft: L } out: { opening_area_sqin: L^2, required_area_sqin: L^2, actual_area_sqin: L^2, min_round_dia_in: L, min_square_side_in: L, aspect_ratio: dimensionless, surplus_sqin: L^2 }
export function computeFireplaceFlueArea({ opening_width_in = 0, opening_height_in = 0, flue_shape = "rectangular", flue_inside_dia_in = 0, flue_inside_a_in = 0, flue_inside_b_in = 0, chimney_height_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(opening_width_in) || 0;
  const h = Number(opening_height_in) || 0;
  const dia = Number(flue_inside_dia_in) || 0;
  const a = Number(flue_inside_a_in) || 0;
  const b = Number(flue_inside_b_in) || 0;
  const H = Number(chimney_height_ft) || 0;
  const round = flue_shape === "round";
  if (!(w > 0) || !(h > 0)) return { error: "Fireplace opening width and height must be positive (in)." };
  if (!(H > 0)) return { error: "Chimney height must be positive (ft), measured from the firebox floor to the top of the flue." };
  if (round) {
    if (!(dia > 0)) return { error: "Flue inside diameter must be positive (in)." };
  } else if (!(a > 0) || !(b > 0)) {
    return { error: "Both flue inside dimensions must be positive (in)." };
  }

  const opening_area_sqin = w * h;
  const aspect_ratio = round ? null : Math.max(a, b) / Math.min(a, b);
  // R1003.15.1: round 1/12; square and rectangles under 2:1 get 1/10; 2:1 or worse gets 1/8.
  const divisor = round ? 12 : aspect_ratio >= 2 ? 8 : 10;
  const required_area_sqin = opening_area_sqin / divisor;
  const actual_area_sqin = round ? Math.PI * dia * dia / 4 : a * b;
  const surplus_sqin = actual_area_sqin - required_area_sqin;
  const adequate = surplus_sqin >= 0;
  const ratio_actual = actual_area_sqin > 0 ? opening_area_sqin / actual_area_sqin : null;
  // The smallest liner of each shape that would satisfy this opening, so an undersized flue
  // comes with the size to order rather than just a failure.
  const min_round_dia_in = Math.sqrt(4 * (opening_area_sqin / 12) / Math.PI);
  const min_square_side_in = Math.sqrt(opening_area_sqin / 10);
  const height_ok = H >= 15;

  const shapeWord = round ? "round" : aspect_ratio >= 2 ? "rectangular at " + aspect_ratio.toFixed(2) + ":1 (2:1 or worse)" : aspect_ratio > 1.001 ? "rectangular at " + aspect_ratio.toFixed(2) + ":1 (under 2:1)" : "square";
  const note = "Opening " + w + " x " + h + " = " + opening_area_sqin.toFixed(0) + " sq in. A " + shapeWord
    + " flue must be at least 1/" + (divisor === 8 ? "8" : divisor === 12 ? "12" : "10") + " of that, or " + required_area_sqin.toFixed(1) + " sq in net. "
    + "This flue's net area is " + actual_area_sqin.toFixed(1) + " sq in"
    + (ratio_actual ? " (the opening is " + ratio_actual.toFixed(1) + " times the flue)" : "") + " - "
    + (adequate ? "ADEQUATE, with " + surplus_sqin.toFixed(1) + " sq in to spare. " : "UNDERSIZED by " + Math.abs(surplus_sqin).toFixed(1) + " sq in. ")
    + "For this opening the smallest compliant flue is about " + min_round_dia_in.toFixed(1) + " in inside diameter round, or " + min_square_side_in.toFixed(1) + " in square. "
    + (height_ok
      ? "Chimney height " + H + " ft clears the 15-ft minimum these ratios require. "
      : "WARNING: the chimney is only " + H + " ft. The 1/12, 1/10, and 1/8 ratios are conditioned on a chimney at least 15 ft tall measured from the firebox FLOOR to the top of the flue; a shorter chimney has to be sized by the code's height-versus-opening figure (Option 2) instead, and it will want a larger flue. ")
    + "Shape matters because a round flue moves smoke with the least loss and gets the smallest allowance, while a narrow rectangle wastes cross section in its corners and boundary layer. Enter the liner's ACTUAL inside dimensions: a clay liner's nominal size is its outside size and its net area is smaller, so sizing off the nominal number silently overstates the flue. This checks flue AREA only - it is not a draft calculation, and a flue that passes here can still smoke from a short chimney, a bad termination, a missing combustion-air path, or a throat and smoke chamber built wrong. A screen against IRC R1003.15.1 / IBC 2113.16.1 Option 1; the adopted code, the liner manufacturer, and the AHJ govern.";

  return { opening_area_sqin, required_area_sqin, actual_area_sqin, surplus_sqin, adequate, ratio_actual, aspect_ratio, divisor, min_round_dia_in, min_square_side_in, height_ok, note };
}

export const fireplaceFlueAreaExample = { inputs: { opening_width_in: 36, opening_height_in: 29, flue_shape: "rectangular", flue_inside_dia_in: 0, flue_inside_a_in: 11.5, flue_inside_b_in: 11.5, chimney_height_ft: 20 } };

MASONRY_RENDERERS["fireplace-flue-area"] = _simpleRenderer({
  citation: "Citation: IRC R1003.15.1 (Option 1) and the identical IBC 2113.16.1 - round chimney flues need a net cross-sectional area of at least 1/12 of the fireplace opening, square flues at least 1/10, rectangular flues with an aspect ratio under 2:1 at least 1/10, and rectangular flues 2:1 or greater at least 1/8. All are conditioned on a chimney at least 15 ft high measured from the firebox floor to the top of the chimney flue; below that height the code's Option 2 figure (R1003.15.2) governs and is not reproduced here. Clay flue liner net areas come from the code's liner tables, which are also not reproduced - enter the liner's ACTUAL inside dimensions. Flue AREA only; this is not a draft, throat, smoke-chamber, or termination check. A screen; the adopted code and the AHJ govern.",
  example: fireplaceFlueAreaExample.inputs,
  fields: [
    { key: "opening_width_in", label: "Fireplace opening width (in)", kind: "number", default: 36 },
    { key: "opening_height_in", label: "Fireplace opening height (in)", kind: "number", default: 29 },
    { key: "flue_shape", label: "Flue shape", kind: "select", options: [{ value: "rectangular", label: "Square or rectangular liner", selected: true }, { value: "round", label: "Round liner or pipe" }] },
    { key: "flue_inside_a_in", label: "Liner INSIDE dimension A (in)", kind: "number", default: 11.5 },
    { key: "flue_inside_b_in", label: "Liner INSIDE dimension B (in)", kind: "number", default: 11.5 },
    { key: "flue_inside_dia_in", label: "Round liner INSIDE diameter (in)", kind: "number", default: 0 },
    { key: "chimney_height_ft", label: "Chimney height, firebox floor to flue top (ft)", kind: "number", default: 20 },
  ],
  outputs: [
    { key: "o", id: "ffa-out-o", label: "Fireplace opening area", value: (r) => fmt(r.opening_area_sqin, 0) + " sq in" },
    { key: "q", id: "ffa-out-q", label: "Required net flue area", value: (r) => fmt(r.required_area_sqin, 1) + " sq in (1/" + (r.divisor === 8 ? "8" : r.divisor === 12 ? "12" : "10") + " of the opening)" },
    { key: "a", id: "ffa-out-a", label: "This flue's net area", value: (r) => fmt(r.actual_area_sqin, 1) + " sq in" + (r.ratio_actual ? " - opening is " + fmt(r.ratio_actual, 1) + "x the flue" : "") },
    { key: "v", id: "ffa-out-v", label: "Verdict", value: (r) => (r.adequate ? "ADEQUATE, " + fmt(r.surplus_sqin, 1) + " sq in to spare" : "UNDERSIZED by " + fmt(Math.abs(r.surplus_sqin), 1) + " sq in") + (r.height_ok ? "" : " - and the chimney is under 15 ft, so Option 1 does not apply") },
    { key: "m", id: "ffa-out-m", label: "Smallest compliant flue for this opening", value: (r) => fmt(r.min_round_dia_in, 1) + " in dia round, or " + fmt(r.min_square_side_in, 1) + " in square" },
    { key: "n", id: "ffa-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFireplaceFlueArea,
});

// ===================== spec-v1158: masonry limited access zone (OSHA 1926.706) =====================

// The zone people set up as "a few feet of tape" is a computed dimension: equal to the
// HEIGHT OF THE WALL TO BE CONSTRUCTED PLUS FOUR FEET, running the ENTIRE LENGTH of the
// wall, on the side that will be UNSCAFFOLDED. Three things follow that get missed.
// It scales with the FINISHED height, not with how high the wall is today - so the zone for
// a 12 ft wall is 16 ft wide from the first course, before there is anything to fall on you.
// It goes on the unscaffolded side specifically, because the scaffolded side has people who
// are supposed to be there; the zone is about everyone else.
// And it must be established BEFORE the wall starts, not once the wall gets tall.
// Separately, a wall over 8 ft must be braced until the permanent supporting elements are in
// place - which is usually long after the masons have finished and left.
// dims: in { wall_height_ft: L, wall_length_ft: L, zone_width_provided_ft: L, zone_runs_full_length: dimensionless, zone_on_unscaffolded_side: dimensionless, established_before_start: dimensionless, bracing_in_place: dimensionless } out: { required_zone_width_ft: L, zone_width_shortfall_ft: L, zone_area_sf: L^2, bracing_required: dimensionless }
export function computeMasonryLimitedAccessZone({ wall_height_ft = 0, wall_length_ft = 0, zone_width_provided_ft = 0, zone_runs_full_length = "yes", zone_on_unscaffolded_side = "yes", established_before_start = "yes", bracing_in_place = "no" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const h = Number(wall_height_ft) || 0;
  const L = Number(wall_length_ft) || 0;
  const provided = Number(zone_width_provided_ft) || 0;
  const fullLength = zone_runs_full_length === "yes";
  const unscaffolded = zone_on_unscaffolded_side === "yes";
  const beforeStart = established_before_start === "yes";
  const braced = bracing_in_place === "yes";
  if (!(h > 0)) return { error: "Wall height to be constructed must be positive (ft)." };
  if (!(L > 0)) return { error: "Wall length must be positive (ft)." };
  if (provided < 0) return { error: "Zone width provided cannot be negative (ft)." };

  const ADDER = 4, BRACE_TRIGGER = 8;
  const required_zone_width_ft = h + ADDER;
  const width_ok = provided >= required_zone_width_ft;
  const zone_width_shortfall_ft = Math.max(0, required_zone_width_ft - provided);
  const zone_area_sf = required_zone_width_ft * L;
  const provided_area_sf = provided * (fullLength ? L : 0);

  const bracing_required = h > BRACE_TRIGGER;
  const bracing_ok = bracing_required ? braced : null;

  const zone_ok = width_ok && fullLength && unscaffolded && beforeStart;
  const passes = zone_ok && (bracing_ok !== false);

  const note = "THE ZONE IS A COMPUTED DIMENSION, not a courtesy margin: equal to the height of the wall TO BE CONSTRUCTED plus " + ADDER + " ft, running the ENTIRE length of the wall, on the side that will be UNSCAFFOLDED, and established BEFORE the wall starts. "
    + "For a " + h + " ft wall that is " + required_zone_width_ft + " ft wide by " + L + " ft long - " + zone_area_sf.toFixed(0) + " sq ft of ground nobody but the wall crew may enter. "
    + "IT SCALES WITH THE FINISHED HEIGHT, not with how high the wall is today. The zone for a " + h + " ft wall is " + required_zone_width_ft + " ft wide from the first course, when there is nothing there yet to fall on anyone - which is exactly why it gets set narrow and grown later, and exactly why that is wrong. "
    + "Width provided " + provided + " ft: " + (width_ok ? "OK. " : "SHORT by " + zone_width_shortfall_ft.toFixed(1) + " ft. ")
    + (fullLength ? "" : "The zone does NOT run the entire length of the wall, which the standard requires without qualification - a wall does not fall only in the middle. ")
    + (unscaffolded ? "" : "The zone is NOT on the unscaffolded side. That side is the point: the scaffolded side has people who are supposed to be there and who are watching the wall, and the zone exists for everyone else. ")
    + (beforeStart ? "" : "The zone was NOT established before the start of construction. Establishing it once the wall gets tall inverts the rule - the period before anyone is worried is when the habit has to be set. ")
    + "BRACING: a wall over " + BRACE_TRIGGER + " ft must be adequately braced to prevent overturning and collapse, unless it is adequately supported so it will not, and the bracing stays until the PERMANENT supporting elements of the structure are in place. This wall is " + h + " ft, so bracing is " + (bracing_required ? "REQUIRED - " + (braced ? "stated as in place. " : "and none is stated. ") : "not triggered by height. ")
    + (bracing_required ? "The duration is the part that surprises people: not until the mortar cures, not until the crew leaves, but until the permanent supporting elements are in place - which on most jobs is long after the masons have finished and moved on, and is when the brace gets removed by someone with no idea what it was holding. " : "")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: the design of the bracing itself, which is an engineering question and not a rule of thumb; the adequacy of alternative support; wall stability during construction and the wind that governs it; the separate limited access zone rules that apply while the wall is being constructed versus after; protruding reinforcing steel and impalement protection, which is a different section; scaffold design on the working side; grout and mortar strength gain; and whether the wall is a structural element requiring an engineer's involvement. A screen, not a bracing design; 29 CFR 1926 Subpart Q and the engineer of record govern.";

  return { required_zone_width_ft, width_ok, zone_width_shortfall_ft, zone_area_sf, provided_area_sf, full_length: fullLength, unscaffolded, before_start: beforeStart, zone_ok, bracing_required, bracing_ok, passes, note };
}

export const masonryLimitedAccessZoneExample = { inputs: { wall_height_ft: 12, wall_length_ft: 60, zone_width_provided_ft: 8, zone_runs_full_length: "yes", zone_on_unscaffolded_side: "yes", established_before_start: "yes", bracing_in_place: "no" } };

MASONRY_RENDERERS["masonry-limited-access-zone"] = _simpleRenderer({
  citation: "Citation: OSHA 29 CFR 1926.706, Subpart Q - Concrete and Masonry Construction. A US federal regulation in the public domain. A limited access zone shall be established prior to the start of construction of the wall; it shall be equal to the height of the wall to be constructed plus four feet and shall run the entire length of the wall; it shall be established on the side of the wall which will be unscaffolded; it shall be restricted to entry by employees actively engaged in constructing the wall and no other employees shall be permitted to enter the zone; and it shall remain in place until the wall is adequately supported to prevent overturning and collapse, unless the height of the wall is over eight feet, in which case it shall remain until the bracing requirement is met. Masonry walls over eight feet in height shall be adequately braced to prevent overturning and to prevent collapse unless the wall is adequately supported so that it will not overturn or collapse, and the bracing shall remain in place until permanent supporting elements of the structure are in place. Not checked: the design of the bracing or of any alternative support, wind during construction, impalement protection, scaffold design on the working side, mortar and grout strength gain, or whether an engineer's involvement is required. A screen, not a bracing design; Subpart Q and the engineer of record govern.",
  example: masonryLimitedAccessZoneExample.inputs,
  fields: [
    { key: "wall_height_ft", label: "Height of the wall TO BE CONSTRUCTED (ft)", kind: "number", default: 12 },
    { key: "wall_length_ft", label: "Wall length (ft)", kind: "number", default: 60 },
    { key: "zone_width_provided_ft", label: "Zone width provided (ft)", kind: "number", default: 8 },
    { key: "zone_runs_full_length", label: "Zone runs the entire length of the wall?", kind: "select", options: [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }] },
    { key: "zone_on_unscaffolded_side", label: "Zone on the unscaffolded side?", kind: "select", options: [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }] },
    { key: "established_before_start", label: "Established before the wall started?", kind: "select", options: [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }] },
    { key: "bracing_in_place", label: "Bracing in place (walls over 8 ft)?", kind: "select", options: [{ value: "no", label: "No", selected: true }, { value: "yes", label: "Yes" }] },
  ],
  outputs: [
    { key: "w", id: "mlz-out-w", label: "Required zone width", value: (r) => r.required_zone_width_ft + " ft (wall height + 4), " + (r.width_ok ? "provided" : "SHORT by " + fmt(r.zone_width_shortfall_ft, 1) + " ft") },
    { key: "a", id: "mlz-out-a", label: "Ground the zone occupies", value: (r) => fmt(r.zone_area_sf, 0) + " sq ft, entire length, unscaffolded side" },
    { key: "c", id: "mlz-out-c", label: "Zone conditions", value: (r) => [r.full_length ? null : "not full length", r.unscaffolded ? null : "wrong side", r.before_start ? null : "established late"].filter(Boolean).join(", ") || "all satisfied" },
    { key: "b", id: "mlz-out-b", label: "Bracing (over 8 ft)", value: (r) => !r.bracing_required ? "not triggered at this height" : r.bracing_ok ? "required and in place" : "REQUIRED and not stated" },
    { key: "v", id: "mlz-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES the items entered" : "DOES NOT PASS" },
    { key: "n", id: "mlz-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMasonryLimitedAccessZone,
});
