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
  makeStepsPanel,
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
    const _steps = makeStepsPanel(outputRegion);
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
        // A field marked `required` passes null when blank, so the compute can
        // ask for it instead of reading a cleared field as a real 0.
        else params[f.key] = f.required && fields[f.key].input.value === "" ? null : Number(fields[f.key].input.value) || 0;
      }
      const r = spec.compute(params); _steps.update(spec.fields, params, r);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener(f.kind === "select" ? "change" : "input", update);
    }
  };

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind ?? "number", options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? (f.kind && f.kind !== "number" ? null : { step: "any", min: "0" }) })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

export const MASONRY_RENDERERS = {};

// ===================== spec-v269: reinforced CMU wall out-of-plane flexure =====================

// dims: in { fm_psi: M L^-1 T^-2, as_in2: L^2, d_in: L, b_in: L, fs_psi: M L^-1 T^-2 } out: { n_ratio: dimensionless, rho: dimensionless, k: dimensionless, j: dimensionless, ms_ftlb: M L^2 T^-2, mm_ftlb: M L^2 T^-2, ma_ftlb: M L^2 T^-2, fb: M L^-1 T^-2 }
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
  citation: "Citation: TMS 402-16 (Building Code Requirements for Masonry Structures) allowable-stress-design cracked transformed-section flexure: n = Es/Em with Es = 29,000,000 psi and Em = 900 f'm for concrete masonry, rho = As/(b d), k = sqrt(2 rho n + (rho n)^2) - rho n, j = 1 - k/3, the steel-governed allowable moment Ms = As Fs j d and the masonry-governed Mm = 0.5 Fb k j b d^2, with Fs = 32,000 psi for Grade 60 reinforcement and Fb = 0.45 f'm, as compiled in the Masonry Designers' Guide and CMHA TEK 14-07C (Allowable Stress Design of Concrete Masonry). Returns the allowable service-level bending moment of a singly reinforced, fully grouted section by the working-stress method: the section is assumed cracked, the reinforcement developed and in tension, the axial compression negligible (near-pure flexure), and one steel layer at the reported depth. The axial term and the one-third stress increase are not applied, and this is not the strength-design (LRFD) moment. Take f'm, the bar size, and the spacing from the structural drawings. A design aid, not a substitute for the engineer of record's stamped design.",
  example: cmuWallFlexureExample.inputs,
  fields: [
    { key: "fm_psi", label: "Masonry strength f'm (psi)", kind: "number" },
    { key: "as_in2", label: "Steel area As over the strip (in²)", kind: "number" },
    { key: "d_in", label: "Effective depth d (in)", kind: "number" },
    { key: "b_in", label: "Strip width b (in)", kind: "number" },
    { key: "fs_psi", label: "Allowable steel stress Fs (psi)", kind: "number" },
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

// TMS 402-16 8.3.5.1: Fv = (Fvm + Fvs) gamma_g, the 3-to-2 sqrt(f'm) caps also
// times gamma_g (0.75 partially grouted, 1.0 fully grouted), and Fvm takes 1/4
// in place of 1/2 for a special reinforced masonry shear wall (8.3.5.1.2).
// Until 2026-09-25 the tile had neither: a special wall read 1/2, up to about
// 77% high on the masonry term, and a partially grouted wall had no input.
// dims: in { fm_psi: M L^-1 T^-2, b_in: L, dv_in: L, p_lb: M L T^-2, mvd: dimensionless, av_in2: L^2, s_in: L, fs_psi: M L^-1 T^-2, grouting: dimensionless, special: dimensionless } out: { an_in2: L^2, fvm: M L^-1 T^-2, fvs: M L^-1 T^-2, fv: M L^-1 T^-2, fv_max: M L^-1 T^-2, va_kip: M L T^-2, fv_gov: M L^-1 T^-2, gamma_g: dimensionless }
export function computeCmuShearWall({ fm_psi = 1500, b_in = 0, dv_in = 0, p_lb = 0, mvd = 0.5, av_in2 = 0, s_in = 48, fs_psi = 32000, grouting = "full", special = "no" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fm_psi > 0)) return { error: "Masonry strength f'm must be positive (psi)." };
  if (!(b_in > 0)) return { error: "Net wall thickness must be positive (in)." };
  if (!(dv_in > 0)) return { error: "Shear depth dv must be positive (in)." };
  if (!(s_in > 0)) return { error: "Horizontal bar spacing must be positive (in)." };
  if (!(fs_psi > 0)) return { error: "Allowable steel stress Fs must be positive (psi)." };
  // A cleared M/(V dv) field used to compute as 0, the most generous value the term can take.
  if (mvd === null || mvd === "") return { error: "Enter the shear-span ratio M/(V dv); 1.0 is the conservative value when it is not known." };
  p_lb = Number(p_lb); av_in2 = Number(av_in2); mvd = Number(mvd);
  if (!(p_lb >= 0)) return { error: "Axial load P must be a number, zero or more (lb)." };
  if (!(av_in2 >= 0)) return { error: "Shear-reinforcement area Av must be a number, zero or more (in^2)." };
  if (!(mvd >= 0)) return { error: "Shear-span ratio M/(V dv) must be a number, zero or more." };
  const gamma_g = { full: 1.0, partial: 0.75 }[grouting];
  if (gamma_g === undefined) return { error: "Grouting must be full or partial." };
  if (special !== "yes" && special !== "no") return { error: "Special reinforced shear wall must be yes or no." };
  const an_in2 = b_in * dv_in;
  const root = Math.sqrt(fm_psi);
  const mvd_c = Math.min(mvd, 1.0);
  const fvm = (special === "yes" ? 0.25 : 0.5) * ((4.0 - 1.75 * mvd_c) * root) + 0.25 * (p_lb / an_in2);
  const fvs = av_in2 > 0 ? 0.5 * (av_in2 * fs_psi * dv_in) / (an_in2 * s_in) : 0;
  const fv = (fvm + fvs) * gamma_g;
  const fv_max = (mvd <= 0.25 ? 3 * root : mvd >= 1.0 ? 2 * root : (3 - (mvd - 0.25) / 0.75) * root) * gamma_g;
  const fv_gov = Math.min(fv, fv_max);
  const va_kip = fv_gov * an_in2 / 1000;
  const capped = fv > fv_max;
  return { an_in2, fvm, fvs, fv, fv_max, fv_gov, va_kip, capped, gamma_g };
}

export const cmuShearWallExample = { inputs: { fm_psi: 1500, b_in: 7.625, dv_in: 96, p_lb: 20000, mvd: 0.5, av_in2: 0.20, s_in: 48, fs_psi: 32000 } };

MASONRY_RENDERERS["cmu-shear-wall"] = _simpleRenderer({
  citation: "Citation: TMS 402-16 allowable-stress in-plane shear: Fvm = c x ((4.0 - 1.75 x M/(V dv)) x sqrt(f'm)) + 0.25 x (P/An), c = 1/2 (1/4 for a special reinforced shear wall), with the shear-span ratio taken positive and not greater than 1.0 inside the masonry term, Fvs = 0.5 x (Av Fs dv) / (An s), the combined Fv = (Fvm + Fvs) gamma_g, and the maximum-Fv cap of 3 sqrt(f'm) at M/(V dv) <= 0.25 grading linearly to 2 sqrt(f'm) at M/(V dv) >= 1.0, also x gamma_g (1.0 fully, 0.75 partially grouted), as compiled in the Masonry Designers' Guide and CMHA TEK 14-07C. Returns the allowable service-level in-plane shear of a reinforced masonry shear wall (fully grouted by default). P is the sustained gravity compression (a larger P raises the masonry term, so use the load combination that actually acts with the shear); M/(V dv) is the shear-span ratio the designer supplies from the wall's height and length; the special-reinforced detailing and minimum-reinforcement rules of TMS 402 are the engineer's to satisfy separately. A design aid, not a substitute for the engineer of record's stamped lateral design.",
  example: cmuShearWallExample.inputs,
  fields: [
    { key: "fm_psi", label: "Masonry strength f'm (psi)", kind: "number" },
    { key: "b_in", label: "Net wall thickness (in)", kind: "number" },
    { key: "dv_in", label: "Shear depth dv, wall length (in)", kind: "number" },
    { key: "p_lb", label: "Sustained axial load P (lb)", kind: "number", default: 0 },
    { key: "mvd", label: "Shear-span ratio M/(V dv)", kind: "number", default: 0.5, required: true },
    { key: "av_in2", label: "Horizontal bar area Av (in², 0 = none)", kind: "number", default: 0 },
    { key: "s_in", label: "Horizontal bar spacing s (in)", kind: "number" },
    { key: "fs_psi", label: "Allowable steel stress Fs (psi)", kind: "number" },
    { key: "grouting", label: "Grouting", kind: "select", options: [{ value: "full", label: "Fully grouted (gamma_g 1.0)", selected: true }, { value: "partial", label: "Partially grouted (gamma_g 0.75)" }] },
    { key: "special", label: "Special reinforced masonry shear wall?", kind: "select", options: [{ value: "no", label: "No (Fvm uses 1/2)", selected: true }, { value: "yes", label: "Yes (Fvm uses 1/4)" }] },
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
  citation: "Citation: TMS 402-16 allowable-stress axial compression for reinforced masonry: Pa = (0.25 f'm An + 0.65 Ast Fs) x (1 - (h/(140 r))^2) for a slenderness ratio h/r <= 99, and Pa = (0.25 f'm An + 0.65 Ast Fs) x (70 r / h)^2 for h/r > 99 (the two branches meet at h/r = 99), with Fs the allowable compressive stress in the reinforcement, as compiled in the Masonry Designers' Guide and CMHA TEK 14-07C. Returns the allowable service-level concentric axial compression of a reinforced, fully grouted masonry wall or column. The 0.65 Ast Fs reinforcement term applies where the vertical bars are laterally tied per the code's column provisions -- for an untied wall the conservative practice is to drop that term (enter Ast = 0) and take only 0.25 f'm An x R. Pure axial only: the moment interaction is separate (combine with the CMU wall flexure tile through the unity check). The radius of gyration r and effective height h come from the section and the wall's actual bracing. A design aid, not a substitute for the engineer of record's stamped design.",
  example: cmuWallAxialExample.inputs,
  fields: [
    { key: "fm_psi", label: "Masonry strength f'm (psi)", kind: "number" },
    { key: "an_in2", label: "Net area An (in²)", kind: "number" },
    { key: "ast_in2", label: "Vertical steel Ast, tied (in², 0 = untied)", kind: "number", default: 0 },
    { key: "h_in", label: "Effective height h (in)", kind: "number" },
    { key: "r_in", label: "Radius of gyration r (in)", kind: "number" },
    { key: "fs_psi", label: "Allowable steel stress Fs (psi)", kind: "number" },
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

// dims: in { hollow_psf: M L^-1 T^-2, grout_adder: M L^-1 T^-2, cell_spacing: L, grout_spacing: L, height_ft: L, area_ft2: L^2 } out: { wall_psf: M L^-1 T^-2, line_load_plf: M T^-2, total_lb: M L T^-2, grout_term: M L^-1 T^-2 }
export function computeMasonryWallWeight({ hollow_psf = 0, grout_adder = 0, cell_spacing = 8, grout_spacing = 0, height_ft = 0, area_ft2 = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const hollow = Number(hollow_psf) || 0;
  const adder = Number(grout_adder) || 0;
  const cell = Number(cell_spacing) || 0;
  const gs = Number(grout_spacing) || 0;
  const h = Number(height_ft) || 0;
  if (!(hollow > 0)) return { error: "Hollow wall weight must be positive (psf)." };
  if (!(cell > 0)) return { error: "Grouted-cell spacing must be positive (in)." };
  if (adder < 0) return { error: "Grout adder cannot be negative (psf)." };
  if (gs < 0) return { error: "Grout spacing cannot be negative (in)." };
  if (h < 0) return { error: "Wall height cannot be negative (ft)." };
  // Ungrouted when grout spacing is 0/blank; capped at full grout (spacing <= cell).
  let grout_term = 0;
  if (gs > 0) grout_term = adder * Math.min(cell / gs, 1);
  const wall_psf = hollow + grout_term;
  const line_load_plf = h > 0 ? wall_psf * h : null;
  const area = Number(area_ft2) || 0;
  const total_lb = area > 0 ? wall_psf * area : null;
  return {
    grout_term, wall_psf, line_load_plf, total_lb,
    note: "Masonry wall dead load: the hollow (ungrouted) wall weight (NCMA table, by thickness and unit density) plus a grout adder prorated by the grout spacing - fully grouted at cell spacing, none if ungrouted, and in between for partial grout (grout_term = adder x cell/spacing, capped at the full adder). Fully grouting more than doubles an 8 in hollow wall (NCMA TEK 14-13B Table 4, 135 pcf units, 140 pcf grout: 39 psf hollow, 47 at 48 in o.c., 63 at 16 in, 86 solid) and its load on the footing. Enter the HOLLOW (face-shell) weight, not a partly grouted table value, or the grout is counted twice and its load on the footing, the trade between reinforcement/strength and dead load. Line load = wall psf x height; total = wall psf x area. A design aid; the NCMA weight tables and the engineer of record govern." ,
  };
}
export const masonryWallWeightExample = { inputs: { hollow_psf: 39, grout_adder: 47, cell_spacing: 8, grout_spacing: 48, height_ft: 10, area_ft2: 0 } };
MASONRY_RENDERERS["masonry-wall-weight"] = _simpleRenderer({
  citation: "Citation: masonry wall dead load from NCMA weight tables: wall psf = hollow weight + grout adder x (cell spacing / grout spacing, capped at full); line load = psf x height. The NCMA TEK weight tables and the engineer of record govern.",
  example: masonryWallWeightExample.inputs,
  fields: [
    { key: "hollow_psf", label: "Hollow wall weight (psf, NCMA)", kind: "number" },
    { key: "grout_adder", label: "Full-grout weight adder (psf, NCMA)", kind: "number" },
    { key: "cell_spacing", label: "Grouted-cell spacing at full grout (in; 8 CMU)", kind: "number" },
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

// dims: in { area_ft2: L^2, area_per: L^2, max_horiz_in: L, max_vert_in: L } out: { anchors: dimensionless, grid_ft2: L^2, max_grid_ft2: L^2, max_horiz_in: L, max_vert_in: L }
export function computeBrickVeneerAnchorSpacing({ area_ft2 = 0, area_per = 2.67, max_horiz_in = 32, max_vert_in = 25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(area_ft2) || 0;
  const per = Number(area_per) || 0;
  const mh = Number(max_horiz_in) > 0 ? Number(max_horiz_in) : 32;
  if (Number(max_horiz_in) < 0 || Number(max_vert_in) < 0) return { error: "Maximum spacings cannot be negative (in)." };
  const mv = Number(max_vert_in) > 0 ? Number(max_vert_in) : 25;
  if (!(area > 0)) return { error: "Veneer wall area must be positive (ft^2)." };
  if (!(per > 0)) return { error: "Maximum area per anchor must be positive (ft^2)." };
  // Each anchor must satisfy BOTH the area-per-anchor limit AND the maximum
  // horizontal x vertical spacing grid, so the effective coverage is the
  // tighter (smaller) of the two -- otherwise the spacing caps the note and
  // citation say govern would never actually reduce the count.
  const max_grid_ft2 = (mh * mv) / 144;
  const eff_per = Math.min(per, max_grid_ft2);
  const anchors = Math.ceil(area / eff_per - 1e-9);
  const grid_ft2 = area / anchors;
  const spacing_governs = max_grid_ft2 < per;
  return {
    anchors, grid_ft2, max_horiz_in: mh, max_vert_in: mv, max_grid_ft2, spacing_governs,
    note: "Brick-veneer anchor count per TMS 402 / IBC 1405: one anchor per no more than the entered wall area (2.67 ft^2 typical), with maximum spacing of 32 in horizontal and 25 in vertical (TMS 402 / IBC; the IRC uses 24 in). BIA Technical Note 28 (2012): under the IBC reduce the area per anchor by 30% in high wind (about 1.87 ft^2, spaced 18 x 18 in) and by 25% (2.0 ft^2) at SDC D; the IRC high-demand value is 2.0 ft^2. Extra anchors within 12 in of openings are not counted here. The count = ceil(area / area-per-anchor). A tighter demand limit adds anchors on a denser grid. If the max horizontal x vertical grid (here " + ((mh * mv) / 144).toFixed(2) + " ft^2) is smaller than the area limit, the spacing caps govern the count. A detailing aid; TMS 402 / IBC and the engineer of record govern.",
  };
}
export const brickVeneerAnchorSpacingExample = { inputs: { area_ft2: 200, area_per: 2.67, max_horiz_in: 32, max_vert_in: 25 } };
MASONRY_RENDERERS["brick-veneer-anchor-spacing"] = _simpleRenderer({
  citation: "Citation: brick-veneer anchor spacing per TMS 402 / IBC 1405 (BIA Technical Note 28): one anchor per <= 2.67 ft^2 (IBC high wind -30%, ~1.87 ft^2; SDC D -25%, 2.0 ft^2), max 32 in horizontal / 25 in vertical (IRC: 24 in). Count = ceil(area / area-per-anchor). TMS 402 / IBC and the engineer of record govern.",
  example: brickVeneerAnchorSpacingExample.inputs,
  fields: [
    { key: "area_ft2", label: "Veneer wall area (ft²)", kind: "number" },
    { key: "area_per", label: "Max area per anchor (ft²; 2.67, 2.0 high-demand)", kind: "number" },
    { key: "max_horiz_in", label: "Max horizontal spacing (in)", kind: "number" },
    { key: "max_vert_in", label: "Max vertical spacing (in)", kind: "number" },
  ],
  outputs: [
    { key: "a", id: "bva-out-a", label: "Anchors required", value: (r) => String(r.anchors) },
    { key: "g", id: "bva-out-g", label: "Achieved area per anchor", value: (r) => fmt(r.grid_ft2, 2) + " ft^2/anchor" },
    { key: "s", id: "bva-out-s", label: "Spacing cap check", value: (r) => "max grid " + fmt(r.max_grid_ft2, 2) + " ft^2 (" + r.max_horiz_in + " x " + r.max_vert_in + " in)" + (r.spacing_governs ? " -- spacing governs" : "") },
    { key: "n", id: "bva-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBrickVeneerAnchorSpacing,
});

// dims: in { span_ft: L, wall_psf: M L^-1 T^-2, wall_h_above: L } out: { tri_h_ft: L, W_lb: M L T^-2, w_udl_plf: M T^-2, arch_h_ft: L }
export function computeMasonryLintelLoading({ span_ft = 0, wall_psf = 0, wall_h_above = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const span = Number(span_ft) || 0;
  const psf = Number(wall_psf) || 0;
  const hAbove = Number(wall_h_above) || 0;
  if (!(span > 0)) return { error: "Opening span must be positive (ft)." };
  if (!(psf > 0)) return { error: "Wall weight must be positive (psf)." };
  if (!(hAbove > 0)) return { error: "Height of wall above the opening must be positive (ft)." };
  const tri_h_ft = span / 2;
  // NCMA TEK 17-1: arching needs the 45-degree triangle PLUS at least 8 in of wall above its apex; the
  // load triangle itself is still span/2 tall. Until 2026-09-26 arching was assumed once the wall reached
  // span/2, so a wall 0-8 in short of the rule got the triangle load instead of its full weight.
  const arch_h_ft = tri_h_ft + 8 / 12;
  const arching = hAbove >= arch_h_ft;
  const W_lb = arching ? 0.5 * span * tri_h_ft * psf : span * hAbove * psf;
  // Moment-equivalent UDL. The arched triangle (total W, peak at midspan)
  // gives M = W L / 6; a UDL gives w L^2 / 8, so w = 4 W / (3 L). Until
  // 2026-09-19 this was W / L, which matches the end shear but understates the
  // moment by 25%. The full rectangle is already uniform: w = W / L.
  const w_udl_plf = arching ? 4 * W_lb / (3 * span) : W_lb / span;
  return {
    tri_h_ft, arch_h_ft, arching, W_lb, w_udl_plf,
    note: "Masonry lintel arching load: for masonry above an opening, the lintel carries only the triangular dead load within a 45-degree triangle (height = span/2) IF enough wall is above (wall above >= span/2 + 8 in, NCMA TEK 17-1: the triangle plus 8 in above its apex). W = 0.5 x span x (span/2) x wall psf; the UDL giving the same midspan moment (W L/6) is 4W/(3 x span), while the end shear is W/2. If the wall above is shorter than the triangle plus 8 in (a lintel near the top of the wall or under a beam bearing), arching is not developed and the lintel carries the full rectangle span x height x psf - MORE load than the arched case, which is why the arching reduction is not always available. Dead load only; add the floor/roof/superimposed loads separately. A design aid; the engineer of record governs.",
  };
}
export const masonryLintelLoadingExample = { inputs: { span_ft: 6, wall_psf: 60, wall_h_above: 5 } };
MASONRY_RENDERERS["masonry-lintel-loading"] = _simpleRenderer({
  citation: "Citation: masonry lintel arching load (NCMA TEK 17-1): the triangular dead load in a 45-degree triangle (height span/2) when the wall above >= span/2 + 8 in, else the full rectangle. W = 0.5 x span x (span/2) x wall psf. Dead load only; the engineer of record governs.",
  example: masonryLintelLoadingExample.inputs,
  fields: [
    { key: "span_ft", label: "Opening (clear) span (ft)", kind: "number" },
    { key: "wall_psf", label: "Wall weight above (psf)", kind: "number" },
    { key: "wall_h_above", label: "Height of wall above opening (ft)", kind: "number" },
  ],
  outputs: [
    { key: "w", id: "mll-out-w", label: "Lintel dead load", value: (r) => fmt(r.W_lb, 0) + " lb (" + (r.arching ? "arching, triangular" : "full rectangle -- arching not developed") + ")" },
    { key: "u", id: "mll-out-u", label: "Equivalent UDL (for moment)", value: (r) => fmt(r.w_udl_plf, 0) + " lb/ft" },
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
    note: "TMS 402 allowable-stress design of a headed anchor bolt in tension in grouted masonry: the allowable is the LESSER of masonry breakout Bab = 1.25 x Apt x sqrt(f'm), with Apt = pi x lbe^2 the projected area of the 45-degree tension breakout cone, and steel Bas = 0.6 x Ab x fy. A shallow anchor pulls a cone of block out (masonry governs); a deep enough anchor makes the steel yield first (steel governs). Edge distance or overlapping cones reduce Apt (the full-cone value is an upper bound); anchor shear is the masonry anchor bolt shear calculator. The strength-design coefficient is 4 x Apt x sqrt(f'm). A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  };
}
export const masonryAnchorBoltExample = { inputs: { fm_psi: 1500, lbe_in: 4, ab_in2: 0.334, fy_psi: 36000 } };
MASONRY_RENDERERS["masonry-anchor-bolt"] = _simpleRenderer({
  citation: "Citation: TMS 402 ASD headed anchor bolt tension: allowable = lesser of masonry breakout Bab = 1.25 x Apt x sqrt(f'm) (Apt = pi x lbe^2, the projected cone) and steel Bas = 0.6 x Ab x fy. Edge distance reduces Apt; shear is the masonry anchor bolt shear calculator. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: masonryAnchorBoltExample.inputs,
  fields: [
    { key: "fm_psi", label: "Masonry strength f'm (psi)", kind: "number" },
    { key: "lbe_in", label: "Effective embedment lb (in)", kind: "number" },
    { key: "ab_in2", label: "Bolt effective tensile area Ab (in², net: 1/2 in 0.142, 3/4 in 0.334)", kind: "number" },
    { key: "fy_psi", label: "Bolt yield fy (psi, A307 = 36000)", kind: "number" },
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
export function computeMasonryAnchorEmbedment({ required_tension_lb = 0, fm_psi = 1500, ab_in2 = 0.334, fy_psi = 36000 } = {}) {
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
  const steel_adequate = bas_lb >= T - 1e-9 * Math.abs(T);
  // TMS 402 sets a floor the strength solution knows nothing about: the effective embedment is
  // at least 4 bolt diameters and never under 2 in. A light load solves to well under that.
  const below_min_embedment = lbe_in < 2;
  return {
    lbe_in, apt_in2, bas_lb, steel_adequate, below_min_embedment,
    note: "The effective embedment lbe that makes the TMS 402 masonry-breakout capacity Bab = 1.25 x (pi lbe^2) x sqrt(f'm) equal the required tension, the inverse of masonry-anchor-bolt. Deeper embedment pulls a larger 45-degree cone and carries more load. The steel branch Bas = 0.6 x Ab x fy is a separate ceiling: if it is below the required tension the bolt yields no matter how deep it is set, so a larger-diameter or higher-grade bolt is needed. Edge distance or overlapping cones reduce the projected area Apt (this full-cone value is an upper bound, so the real required embedment is deeper); anchor shear is the masonry anchor bolt shear calculator. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  };
}
export const masonryAnchorEmbedmentExample = { inputs: { required_tension_lb: 5000, fm_psi: 1500, ab_in2: 0.334, fy_psi: 36000 } };
MASONRY_RENDERERS["masonry-anchor-embedment"] = _simpleRenderer({
  citation: "Citation: TMS 402 ASD headed anchor bolt tension solved for the embedment: lbe = sqrt(T / (1.25 pi sqrt(f'm))) from the masonry breakout branch Bab = 1.25 x Apt x sqrt(f'm) (Apt = pi lbe^2). The steel branch Bas = 0.6 Ab fy is a separate ceiling. Edge distance reduces Apt; shear is the masonry anchor bolt shear calculator. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: masonryAnchorEmbedmentExample.inputs,
  fields: [
    { key: "required_tension_lb", label: "Required tension T (lb)", kind: "number" },
    { key: "fm_psi", label: "Masonry strength f'm (psi)", kind: "number" },
    { key: "ab_in2", label: "Bolt effective tensile area Ab (in², net: 1/2 in 0.142, 3/4 in 0.334)", kind: "number" },
    { key: "fy_psi", label: "Bolt yield fy (psi, A307 = 36000)", kind: "number" },
  ],
  outputs: [
    { key: "lbe", id: "mae-out-lbe", label: "Required embedment lbe", value: (r) => fmt(r.lbe_in, 2) + " in for strength" + (r.below_min_embedment ? " -- BELOW the TMS 402 minimum; set the bolt at 4 bolt diameters and not less than 2 in" : " (and not less than 4 bolt diameters or 2 in)") },
    { key: "apt", id: "mae-out-apt", label: "Projected area Apt = pi lbe²", value: (r) => fmt(r.apt_in2, 1) + " in^2" },
    { key: "bas", id: "mae-out-bas", label: "Steel ceiling Bas = 0.6 Ab fy", value: (r) => fmt(r.bas_lb, 0) + " lb (" + (r.steel_adequate ? "adequate for T" : "BELOW T -- use a larger/stronger bolt") + ")" },
    { key: "n", id: "mae-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMasonryAnchorEmbedment,
});

// ===================== spec-v1232: masonry anchor bolt in SHEAR (Group E) =====================
// The shear companion the masonry-anchor-bolt / -embedment tension pair names as "a separate
// check." TMS 402-13 ASD (as NCMA TEK 12-03C prints it): the allowable shear is the LEAST of four modes --
// masonry breakout Bvb = 1.25 x Apv x sqrt(f'm) with Apv = pi x lbe^2 / 2 (the half-cone toward
// the free edge, lbe = edge distance); masonry crushing Bvc = 350 x (f'm x Ab)^(1/4); anchor
// pryout Bvpry = 2.0 x Bab where Bab = 1.25 x Apt x sqrt(f'm) is the tension breakout on the
// embedment (Apt = pi x lb^2); and steel Bvs = 0.36 x Ab x fy. The crushing 350 coefficient is
// verified against NCMA TEK 12-03A and 12-03C (402-13); TMS 402-16 raised crushing, so it is NOT edition-stable
// (until 2026-09-26 this tile was labeled 402-16). The 0.36 shear-steel
// coefficient is the edition-stable 0.6 x the tension-steel 0.6 (TEK 12-03A had 0.12 = 0.6 x 0.2).
// dims: in { fm_psi: M L^-1 T^-2, lb_in: L, lbe_in: L, ab_in2: L^2, fy_psi: M L^-1 T^-2 } out: { apv_in2: L^2, bvb_lb: M L T^-2, bvc_lb: M L T^-2, bvpry_lb: M L T^-2, bvs_lb: M L T^-2, bv_lb: M L T^-2 }
export function computeMasonryAnchorShear({ fm_psi = 1500, lb_in = 5, lbe_in = 4, ab_in2 = 0.334, fy_psi = 36000 } = {}) {
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
    note: "TMS 402-13 allowable-stress design (as NCMA TEK 12-03C prints it) of a headed anchor bolt in shear in grouted masonry: the allowable is the LEAST of four modes. Masonry breakout Bvb = 1.25 x Apv x sqrt(f'm), with Apv = pi x lbe^2 / 2 the projected half-cone toward the free edge (lbe = edge distance), governs only when the bolt is near an edge. Masonry crushing Bvc = 350 x (f'm x Ab)^(1/4), localized bearing of the shank on the block, usually governs away from edges. Anchor pryout Bvpry = 2.0 x Bab (Bab = the tension breakout on the embedment) governs only at very shallow embedment. Bolt steel Bvs = 0.36 x Ab x fy governs for a stout, well-embedded, interior bolt. Overlapping cones or an open cell reduce Apv (the full-half-cone value is an upper bound). Combined tension and shear use the 402-13 unity check ba/Ba + bv/Bv <= 1 (a separate step). These are the TMS 402-13 coefficients NCMA TEK 12-03C prints; TMS 402-16 raised the masonry crushing capacity (about 67% at strength level, with a similar ASD increase; Bennett, STRUCTURE 2018) and replaced the linear interaction with (ba/Ba)^(5/3) + (bv/Bv)^(5/3) <= 1, so this is conservative on crushing under -16. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  };
}
export const masonryAnchorShearExample = { inputs: { fm_psi: 1500, lb_in: 5, lbe_in: 4, ab_in2: 0.334, fy_psi: 36000 } };
MASONRY_RENDERERS["masonry-anchor-shear"] = _simpleRenderer({
  citation: "Citation: TMS 402-13 ASD headed anchor bolt shear as NCMA TEK 12-03C prints it (402-16 raised crushing and uses a 5/3-power interaction): allowable = least of masonry breakout Bvb = 1.25 x Apv x sqrt(f'm) (Apv = pi lbe^2 / 2, lbe = edge distance), masonry crushing Bvc = 350 x (f'm Ab)^(1/4), anchor pryout Bvpry = 2.0 x Bab (Bab = 1.25 x pi lb^2 x sqrt(f'm)), and bolt steel Bvs = 0.36 x Ab x fy. TEK 12-03C example (f'm 2,000, 1/2 in, Ab 0.142) reproduces Bvc 1,437 lb and Bvs 3,067 lb. A design aid, not a substitute for a licensed engineer's design -- the engineer of record's stamped design governs.",
  example: masonryAnchorShearExample.inputs,
  fields: [
    { key: "fm_psi", label: "Masonry strength f'm (psi)", kind: "number" },
    { key: "lb_in", label: "Effective embedment lb (in)", kind: "number" },
    { key: "lbe_in", label: "Edge distance lbe (in)", kind: "number" },
    { key: "ab_in2", label: "Bolt effective tensile area Ab (in², net: 1/2 in 0.142, 3/4 in 0.334)", kind: "number" },
    { key: "fy_psi", label: "Bolt yield fy (psi, A307 = 36000)", kind: "number" },
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
    // At the C90 minimum, take the bottom row exactly. Below it there is no table value. Until
    // 2026-10-10 the bottom segment was extended downward, and since f'm falls only 0.42 psi per
    // psi of unit there, a 1,000 psi unit read f'm 1,583 -- above the unit itself.
    if (u === uMin) { f_m_psi = rows[0][1]; }
    else return { error: "A unit under " + uMin.toLocaleString("en-US") + " psi net-area strength is below the bottom row of TMS 602 Table 2 (and the ASTM C90 minimum). The unit-strength method gives no f'm for it; test prisms." };
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
    note: "TMS 602-16 Table 2 unit-strength method (assumed f'm without a prism test; for units less than 4 in nominal height the table's footnote takes 85% of these values): from the net-area unit strength and the mortar type, " + mortarLabel + " mortar gives f'm " + fmt(f_m_psi, 0) + " psi" + (below_range ? " (below the 2,000 psi ASTM C90 minimum -- the unit does not qualify; value extrapolated)" : "") + (above_range ? " (above the table -- capped; a higher f'm needs a prism test)" : "") + ". f'm is not the unit strength: a 2,000 psi concrete unit gives f'm 2,000 in Type M/S but only 1,750 in Type N, and a 3,250 psi unit in Type M/S gives 2,500 (77% of the block). Grouting and inspection requirements apply. A specification aid -- TMS 602 and the engineer of record (or a prism test) govern.",
  };
}
export const masonryPrismFmExample = { inputs: { unit_type: "concrete", unit_strength_psi: 2000, mortar_type: "ms" } };
MASONRY_RENDERERS["masonry-prism-fm"] = _simpleRenderer({
  citation: "Citation: TMS 602-16 Table 2 unit-strength method for concrete masonry -- the assumed net-area masonry compressive strength f'm from the net-area unit compressive strength and the mortar type, without a prism test. A 2,000 psi (net) concrete unit gives f'm 2,000 psi in Type M or S mortar but only 1,750 psi in Type N; a 3,250 psi unit in Type M/S gives 2,500 psi. Linear interpolation between the Table 2 rows; 2,000 psi is the ASTM C90 net-area minimum and the table caps design f'm (a higher value needs a prism test). A specification aid, not a substitute for TMS 602 and the engineer of record.",
  example: masonryPrismFmExample.inputs,
  fields: [
    { key: "unit_type", label: "Unit type", kind: "select", default: "concrete", options: [{ value: "concrete", label: "Concrete (CMU)" }, { value: "clay", label: "Clay (not yet supported)" }] },
    { key: "unit_strength_psi", label: "Net-area unit strength (psi)", kind: "number" },
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
  if (!(flashing_lines >= 1) || !Number.isInteger(flashing_lines)) return { error: "Flashing lines is a whole number, 1 or more." };
  const length_in = wall_length_ft * 12;
  // Weeps at the ends plus one every max_spacing: count = ceil(length / spacing) + 1.
  const weeps_per_line = Math.ceil(length_in / max_spacing_in - 1e-9) + 1;
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
    { key: "wall_length_ft", label: "Wall / flashing length (ft)", kind: "number" },
    { key: "max_spacing_in", label: "Max weep spacing (in, code cap 33)", kind: "number" },
    { key: "flashing_lines", label: "Flashing lines (base + lintels)", kind: "number" },
  ],
  outputs: [
    { key: "wpl", id: "bvw-out-wpl", label: "Weeps per flashing line", value: (r) => fmt(r.weeps_per_line, 0) },
    { key: "tot", id: "bvw-out-tot", label: "Total weep holes", value: (r) => fmt(r.total_weeps, 0) },
    { key: "n", id: "bvw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBrickVeneerWeepCount,
});

// ===================== spec-v922: masonry horizontal joint-reinforcement takeoff =====================
// dims: in { wall_length_ft: L, wall_height_ft: L, vertical_spacing_in: L, piece_length_ft: L, lap_in: L } out: { reinforced_courses: dimensionless, pieces_per_course: dimensionless, total_pieces: dimensionless }
export function computeMasonryJointReinforcement({ wall_length_ft = 40, wall_height_ft = 12, vertical_spacing_in = 16, piece_length_ft = 10, lap_in = 6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(wall_length_ft > 0)) return { error: "Wall length must be positive (ft)." };
  if (!(wall_height_ft > 0)) return { error: "Wall height must be positive (ft)." };
  if (!(vertical_spacing_in > 0)) return { error: "Vertical spacing must be positive (in)." };
  if (!(piece_length_ft > 0)) return { error: "Piece length must be positive (ft)." };
  const reinforced_courses = Math.ceil(wall_height_ft * 12 / vertical_spacing_in - 1e-9);
  // Each added piece laps the last by at least 6 in (9 in for 3/16 in wire), so it adds only piece - lap.
  // Until 2026-09-25 the lap was ignored: a 40 ft wall took 4 ten-foot pieces instead of 5.
  if (lap_in === null || lap_in === "") return { error: "Enter the lap between pieces (in): 6 minimum, 9 for 3/16 in wire." };
  const lap_ft = (Number(lap_in) || 0) / 12;
  if (!(lap_ft >= 0 && lap_ft < piece_length_ft)) return { error: "Lap must be at least 0 and shorter than a piece (in)." };
  const pieces_per_course = wall_length_ft <= piece_length_ft ? 1 : 1 + Math.ceil((wall_length_ft - piece_length_ft) / (piece_length_ft - lap_ft) - 1e-9);
  const total_pieces = reinforced_courses * pieces_per_course;
  if (![reinforced_courses, pieces_per_course, total_pieces].every(Number.isFinite)) return { error: "Joint-reinforcement math is not a finite value." };
  return {
    reinforced_courses,
    pieces_per_course,
    total_pieces,
    note: "Horizontal joint reinforcement (ladder or truss wire) laid in the bed joints of a masonry wall: reinforced courses = ceil(height / vertical spacing), pieces per course = 1 + ceil((length - piece) / (piece - lap)) because each added piece laps the last by at least 6 in (9 in for 3/16 in wire), total = courses x pieces. IRC R606.12.2 / TMS 402 set the maximum vertical spacing at 16 in (every other 8 in course); some specs tighten it to 8 in or add wire at bond beams, lintels, and above and below openings. Wire comes in ~10 ft lengths lapped at least 6 in, and the lap is counted. A 40 x 12 ft CMU wall at 16 in is 9 courses x 5 pieces = 45. A material count; the spacing, the lap, and the extra wire at openings come from the structural spec and the adopted code.",
  };
}
export const masonryJointReinforcementExample = { inputs: { wall_length_ft: 40, wall_height_ft: 12, vertical_spacing_in: 16, piece_length_ft: 10, lap_in: 6 } };

MASONRY_RENDERERS["masonry-joint-reinforcement"] = _simpleRenderer({
  citation: "Citation: masonry joint-reinforcement takeoff by name. reinforced courses = ceil(height in / vertical spacing); pieces per course = 1 + ceil((length - piece) / (piece - lap)); total = courses x pieces. IRC R606.12.2 / TMS 402 cap the vertical spacing at 16 in; wire laps >= 6 in. The structural spec and the adopted code govern.",
  example: masonryJointReinforcementExample.inputs,
  fields: [
    { key: "wall_length_ft", label: "Wall length (ft)", kind: "number" },
    { key: "wall_height_ft", label: "Wall height (ft)", kind: "number" },
    { key: "vertical_spacing_in", label: "Vertical spacing (in, code cap 16)", kind: "number" },
    { key: "piece_length_ft", label: "Wire piece length (ft)", kind: "number" },
    { key: "lap_in", label: "Lap between pieces (in, 6 min; 9 for 3/16 in wire)", kind: "number", default: 6, required: true },
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
// dims: in { clear_span_ft: L, lintel_depth_in: L, support_center_ft: L, udl_plf: M T^-2, bearing_width_in: L, allowable_bearing_psi: M L^-1 T^-2 } out: { eff_span_ft: L, reaction_lb: M L T^-2, required_bearing_in: L, governing_bearing_in: L, required_area_in2: L^2, span_by_depth_ft: L, code_min_in: L }
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
    { key: "lintel_depth_in", label: "Lintel depth (in)", kind: "number" },
    { key: "support_center_ft", label: "Distance between support centers (ft, 0 = use span + depth)", kind: "number" },
    { key: "udl_plf", label: "Uniform load on lintel (lb/ft)", kind: "number" },
    { key: "bearing_width_in", label: "Bearing width (in, wall thickness at the end)", kind: "number" },
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
// and the boundary layer waste part of its cross section. IRC 2021 R1003.15.1 (Option 1) states
// NO height condition; the 15 ft check below is an advisory drawn from Option 2's height-based
// figure (until 2026-09-25 it was presented as an Option 1 requirement).
// Clay liner NOMINAL sizes are not their net areas, so this tile takes the ACTUAL inside
// dimensions - the liner tables are code-document tables and are not reproduced here.
// dims: in { opening_width_in: L, opening_height_in: L, flue_shape: dimensionless, flue_inside_dia_in: L, flue_inside_a_in: L, flue_inside_b_in: L, chimney_height_ft: L } out: { opening_area_sqin: L^2, required_area_sqin: L^2, actual_area_sqin: L^2, min_round_dia_in: L, min_square_side_in: L, aspect_ratio: dimensionless, surplus_sqin: L^2, ratio_actual: dimensionless }
export function computeFireplaceFlueArea({ opening_width_in = 0, opening_height_in = 0, flue_shape = "rectangular", flue_inside_dia_in = 0, flue_inside_a_in = 0, flue_inside_b_in = 0, chimney_height_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(opening_width_in) || 0;
  const h = Number(opening_height_in) || 0;
  const dia = Number(flue_inside_dia_in) || 0;
  const a = Number(flue_inside_a_in) || 0;
  const b = Number(flue_inside_b_in) || 0;
  const H = Number(chimney_height_ft) || 0;
  if (flue_shape !== "round" && flue_shape !== "rectangular") return { error: "Flue shape must be round or rectangular." };
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
  const adequate = surplus_sqin >= -1e-9 * Math.abs(required_area_sqin);
  const ratio_actual = actual_area_sqin > 0 ? opening_area_sqin / actual_area_sqin : null;
  // The smallest liner of each shape that would satisfy this opening, so an undersized flue
  // comes with the size to order rather than just a failure.
  const min_round_dia_in = Math.sqrt(4 * (opening_area_sqin / 12) / Math.PI);
  const min_square_side_in = Math.sqrt(opening_area_sqin / 10);
  const height_ok = H >= 15 - 1e-9 * Math.abs(15);

  const shapeWord = round ? "round" : aspect_ratio >= 2 ? "rectangular at " + aspect_ratio.toFixed(2) + ":1 (2:1 or worse)" : aspect_ratio > 1.001 ? "rectangular at " + aspect_ratio.toFixed(2) + ":1 (under 2:1)" : "square";
  const note = "Opening " + w + " x " + h + " = " + opening_area_sqin.toFixed(0) + " sq in. A " + shapeWord
    + " flue must be at least 1/" + (divisor === 8 ? "8" : divisor === 12 ? "12" : "10") + " of that, or " + required_area_sqin.toFixed(1) + " sq in net. "
    + "This flue's net area is " + actual_area_sqin.toFixed(1) + " sq in"
    + (ratio_actual ? " (the opening is " + ratio_actual.toFixed(1) + " times the flue)" : "") + " - "
    + (adequate ? "ADEQUATE, with " + surplus_sqin.toFixed(1) + " sq in to spare. " : "UNDERSIZED by " + Math.abs(surplus_sqin).toFixed(1) + " sq in. ")
    + "For this opening the smallest compliant flue is about " + min_round_dia_in.toFixed(1) + " in inside diameter round, or " + min_square_side_in.toFixed(1) + " in square. "
    + (height_ok
      ? "Chimney height " + H + " ft is at least 15 ft, where these ratios are generally adequate. "
      : "ADVISORY: the chimney is only " + H + " ft. Option 1's ratios state no height condition, but a chimney under 15 ft tall (firebox floor to flue top) drafts weakly; Option 2 (R1003.15.2) sizes the flue from height and opening and will want a larger flue for a short chimney, so check it. ")
    + "Shape matters because a round flue moves smoke with the least loss and gets the smallest allowance, while a narrow rectangle wastes cross section in its corners and boundary layer. Enter the liner's ACTUAL inside dimensions: a clay liner's nominal size is its outside size and its net area is smaller, so sizing off the nominal number silently overstates the flue. This checks flue AREA only - it is not a draft calculation, and a flue that passes here can still smoke from a short chimney, a bad termination, a missing combustion-air path, or a throat and smoke chamber built wrong. A screen against IRC R1003.15.1 / IBC 2113.16.1 Option 1; the adopted code, the liner manufacturer, and the AHJ govern.";

  return { opening_area_sqin, required_area_sqin, actual_area_sqin, surplus_sqin, adequate, ratio_actual, aspect_ratio, divisor, min_round_dia_in, min_square_side_in, height_ok, note };
}

export const fireplaceFlueAreaExample = { inputs: { opening_width_in: 36, opening_height_in: 29, flue_shape: "rectangular", flue_inside_dia_in: 0, flue_inside_a_in: 11.5, flue_inside_b_in: 11.5, chimney_height_ft: 20 } };

MASONRY_RENDERERS["fireplace-flue-area"] = _simpleRenderer({
  citation: "Citation: IRC R1003.15.1 (Option 1) and the identical IBC 2113.16.1 - round chimney flues need a net cross-sectional area of at least 1/12 of the fireplace opening, square flues at least 1/10, rectangular flues with an aspect ratio under 2:1 at least 1/10, and rectangular flues 2:1 or greater at least 1/8. Option 1 states no height condition; for a chimney under 15 ft (firebox floor to flue top) this tile advises checking the code's Option 2 figure (R1003.15.2), which sizes by height and is not reproduced here. Clay flue liner net areas come from the code's liner tables, which are also not reproduced - enter the liner's ACTUAL inside dimensions. Flue AREA only; this is not a draft, throat, smoke-chamber, or termination check. A screen; the adopted code and the AHJ govern.",
  example: fireplaceFlueAreaExample.inputs,
  fields: [
    { key: "opening_width_in", label: "Fireplace opening width (in)", kind: "number" },
    { key: "opening_height_in", label: "Fireplace opening height (in)", kind: "number" },
    { key: "flue_shape", label: "Flue shape", kind: "select", options: [{ value: "rectangular", label: "Square or rectangular liner", selected: true }, { value: "round", label: "Round liner or pipe" }] },
    { key: "flue_inside_a_in", label: "Liner INSIDE dimension A (in)", kind: "number" },
    { key: "flue_inside_b_in", label: "Liner INSIDE dimension B (in)", kind: "number" },
    { key: "flue_inside_dia_in", label: "Round liner INSIDE diameter (in)", kind: "number" },
    { key: "chimney_height_ft", label: "Chimney height, firebox floor to flue top (ft)", kind: "number" },
  ],
  outputs: [
    { key: "o", id: "ffa-out-o", label: "Fireplace opening area", value: (r) => fmt(r.opening_area_sqin, 0) + " sq in" },
    { key: "q", id: "ffa-out-q", label: "Required net flue area", value: (r) => fmt(r.required_area_sqin, 1) + " sq in (1/" + (r.divisor === 8 ? "8" : r.divisor === 12 ? "12" : "10") + " of the opening)" },
    { key: "a", id: "ffa-out-a", label: "This flue's net area", value: (r) => fmt(r.actual_area_sqin, 1) + " sq in" + (r.ratio_actual ? " - opening is " + fmt(r.ratio_actual, 1) + "x the flue" : "") },
    { key: "v", id: "ffa-out-v", label: "Verdict", value: (r) => (r.adequate ? "ADEQUATE, " + fmt(r.surplus_sqin, 1) + " sq in to spare" : "UNDERSIZED by " + fmt(Math.abs(r.surplus_sqin), 1) + " sq in") + (r.height_ok ? "" : " - and the chimney is under 15 ft: advisory, check Option 2 (R1003.15.2)") },
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
// dims: in { wall_height_ft: L, wall_length_ft: L, zone_width_provided_ft: L, zone_runs_full_length: dimensionless, zone_on_unscaffolded_side: dimensionless, established_before_start: dimensionless, bracing_in_place: dimensionless } out: { required_zone_width_ft: L, zone_width_shortfall_ft: L, zone_area_sf: L^2, bracing_required: dimensionless, provided_area_sf: L^2 }
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
  const width_ok = provided >= required_zone_width_ft - 1e-9 * Math.abs(required_zone_width_ft);
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
    { key: "wall_height_ft", label: "Height of the wall TO BE CONSTRUCTED (ft)", kind: "number" },
    { key: "wall_length_ft", label: "Wall length (ft)", kind: "number" },
    { key: "zone_width_provided_ft", label: "Zone width provided (ft)", kind: "number" },
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

// ===========================================================================
// spec-v1683..v1685: the 2026-09-08 trade-expansion masonry band. Three tiles,
// all group E. `mortar-mix` in calc-construction.js counts BAGS from a unit
// count and a joint size and says nothing about proportions, so v1683 is the
// batch side of the same trade rather than a duplicate of it.

// Water weighs 62.4 lb per cubic foot; a bag of portland cement is one cubic
// foot loose and 94 lb; a bag of hydrated lime is 50 lb and about 1.25 cu ft
// loose. A #2 shovel of damp sand runs about 0.2 cu ft: the National Lime
// Association prints 30-36 shovels for 6-7 cu ft. Until 2026-10-01 this was
// 0.5, which counted a Type S batch at 9 shovels instead of about 22.
const _CUFT_PER_CEMENT_BAG = 1.0;
const _LB_PER_CEMENT_BAG = 94;
const _CUFT_PER_LIME_BAG = 1.25;
const _LB_PER_LIME_BAG = 50;
const _CUFT_PER_SHOVEL = 0.2;
const _GAL_PER_CUFT = 1728 / 231;

// ============ spec-v1683: ASTM C270 mortar batch proportions ============

// dims: in { cement_volumes: dimensionless, lime_volumes: dimensionless, sand_ratio: dimensionless, cement_bags: dimensionless, unit_strength_psi: M L^-1 T^-2, mortar_strength_psi: M L^-1 T^-2 } out: { cementitious_cuft: L^3, sand_cuft: L^3, sand_min_cuft: L^3, sand_max_cuft: L^3, lime_bags: dimensionless, sand_shovels: dimensionless, mortar_strength_psi: M L^-1 T^-2, unit_strength_psi: M L^-1 T^-2, strength_ratio: dimensionless, cement_bags: dimensionless, sand_ratio: dimensionless, batch_yield_cuft: L^3, cement_cuft: L^3, cement_weight_lb: M, lime_cuft: L^3, cement_volumes: dimensionless, lime_volumes: dimensionless, lime_weight_lb: M }
export function computeMortarBatchC270({ cement_volumes = 1, lime_volumes = 0.5, sand_ratio = 2.5, cement_bags = 1, unit_strength_psi = 0, mortar_strength_psi = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(cement_volumes > 0)) return { error: "The cement proportion must be positive (volumes)." };
  if (lime_volumes < 0) return { error: "The lime proportion cannot be negative (volumes)." };
  if (!(sand_ratio > 0)) return { error: "The sand proportion must be positive (times the cementitious total)." };
  if (!(cement_bags > 0)) return { error: "The batch size must be positive (bags of cement; a fraction of a bag is fine)." };
  if (unit_strength_psi < 0 || mortar_strength_psi < 0) return { error: "A strength cannot be negative (psi)." };
  const SAND_MIN_RATIO = 2.25;
  const SAND_MAX_RATIO = 3.0;
  // C270 proportions are BY VOLUME, and the batch scales with the cement.
  const scale = cement_bags * _CUFT_PER_CEMENT_BAG / cement_volumes;
  const cement_cuft = cement_volumes * scale;
  const lime_cuft = lime_volumes * scale;
  const cementitious_cuft = cement_cuft + lime_cuft;
  const sand_cuft = sand_ratio * cementitious_cuft;
  const sand_min_cuft = SAND_MIN_RATIO * cementitious_cuft;
  const sand_max_cuft = SAND_MAX_RATIO * cementitious_cuft;
  const sand_in_range = sand_ratio >= SAND_MIN_RATIO && sand_ratio <= SAND_MAX_RATIO;
  const lime_bags = lime_cuft / _CUFT_PER_LIME_BAG;
  const sand_shovels = sand_cuft / _CUFT_PER_SHOVEL;
  const batch_yield_cuft = cementitious_cuft + sand_cuft;
  const cement_weight_lb = cement_bags * _LB_PER_CEMENT_BAG;
  const lime_weight_lb = lime_bags * _LB_PER_LIME_BAG;
  // The rule that runs against instinct: a mortar harder than the unit cracks
  // the unit rather than the joint, and the unit is not repointable.
  const compatible = (unit_strength_psi > 0 && mortar_strength_psi > 0) ? mortar_strength_psi < unit_strength_psi : null;
  const equal_strength = compatible === false && mortar_strength_psi === unit_strength_psi;
  const strength_ratio = (unit_strength_psi > 0 && mortar_strength_psi > 0) ? mortar_strength_psi / unit_strength_psi : null;
  const outs = [cement_cuft, lime_cuft, cementitious_cuft, sand_cuft, sand_min_cuft, sand_max_cuft, lime_bags, sand_shovels];
  if (!outs.every(Number.isFinite)) return { error: "Mortar batch math is not a finite value." };
  const sand_verdict = sand_in_range
    ? "IN RANGE: " + fmt(sand_ratio, 2) + " is inside the 2.25 to 3.0 the proportion specification allows, which is " + fmt(sand_min_cuft, 2) + " to " + fmt(sand_max_cuft, 2) + " cu ft for this batch"
    : (sand_ratio > SAND_MAX_RATIO
      ? "OVER-SANDED at " + fmt(sand_ratio, 2) + ", past the 3.0 limit. Harsh and unworkable, which masons correct with water -- and that changes everything the specification was for"
      : "UNDER-SANDED at " + fmt(sand_ratio, 2) + ", below the 2.25 minimum. Rich mortar shrinks more and costs more, and it is stronger than the specification intends");
  const compat_verdict = compatible === null
    ? "Enter the unit and mortar compressive strengths to check compatibility."
    : compatible
      ? "COMPATIBLE: the mortar at " + fmt(mortar_strength_psi, 0) + " psi is weaker than the unit at " + fmt(unit_strength_psi, 0) + " psi, so movement cracks the JOINT, which is repointable"
      : (equal_strength ? "MORTAR AS HARD AS THE UNIT: " : "MORTAR HARDER THAN THE UNIT: ") + fmt(mortar_strength_psi, 0) + " psi against a " + fmt(unit_strength_psi, 0) + " psi unit. Stress transfers into the unit and the unit spalls, which is not repointable -- this is how soft historic brick gets destroyed by a repointing";
  return {
    cement_volumes, lime_volumes, sand_ratio, cement_bags, cement_cuft, lime_cuft,
    cementitious_cuft, sand_cuft, sand_min_cuft, sand_max_cuft, sand_in_range,
    lime_bags, sand_shovels, batch_yield_cuft, cement_weight_lb, lime_weight_lb,
    unit_strength_psi, mortar_strength_psi, compatible, strength_ratio,
    sand_verdict, compat_verdict,
    note: "ASTM C270 gives mortar as VOLUME PROPORTIONS of cementitious material and sand, and the batch scales from the cement: one bag of portland is one cubic foot, so a Type S at one part cement to half a part lime is a bag of cement and half a cubic foot of lime (0.4 of a 50 lb bag), with sand between 2.25 and 3 times the sum of the two. THE COUNTERINTUITIVE RULE IS THE IMPORTANT ONE: a stronger mortar is often a worse mortar. Mortar is meant to be the sacrificial element, so that movement and stress crack the joint -- which is repointable -- rather than the masonry unit, which is not. Repointing soft historic brick with a hard Type S or M mortar is a well documented way to destroy the brick, because the hard mortar transfers stress into the unit and the unit spalls. Type O, or a lime mortar, exists for exactly that case, and the strength comparison here is the check that catches it before the wall does. THE PROPORTION VERSUS PROPERTY DISTINCTION MATTERS AT THE MIXER. C270 allows a mortar to be specified either by proportion or by laboratory-tested properties, and the two are not interchangeable: a proportion-specified mortar is batched to the volumes and is not tested for strength at all. Field-tested mortar is tested to a different standard with different acceptance than laboratory mortar, and field results routinely come in below the laboratory values for the same mortar -- treating that as a failure is a common and expensive misunderstanding. SAND VOLUME IS THE TERM MOST OFTEN ABUSED, because it is measured by shovel rather than by box. The allowable range is broad, and running at the high end produces a harsh, unworkable mortar that masons then correct with water, which changes the water-cement ratio, the strength, the shrinkage and the bond all at once. The shovel count here is a working figure at about a fifth of a cubic foot per shovel of damp sand (five shovels to the cubic foot) and is no substitute for a measured batch box. Proportions the reader supplies for the type in question. NO TYPE TABLE IS SHIPPED: the cement and lime volumes for M, S, N and O come from C270 itself, they differ between the portland-lime and the masonry-cement and mortar-cement systems, and a project specification can require something else entirely. It does not compute water, which is added to workability rather than to a ratio and is the mason's judgment; it does not address air content, retempering, board life, colour or admixtures; and it does not evaluate bond strength, water penetration, or freeze-thaw durability, which are properties of the assembly rather than of the batch. ASTM C270, the project specification, and the mason of record govern.",
  };
}
const mortarBatchC270Example = { inputs: { cement_volumes: 1, lime_volumes: 0.5, sand_ratio: 2.5, cement_bags: 1, unit_strength_psi: 3000, mortar_strength_psi: 1800 } };
MASONRY_RENDERERS["mortar-batch-c270"] = _simpleRenderer({
  citation: "Citation: the ASTM C270 proportion specification by name -- mortar is batched by VOLUME, with sand between 2.25 and 3.0 times the sum of the cementitious volumes -- scaled here from bags of portland at one cubic foot and 94 lb per bag, hydrated lime at about 1.25 cu ft and 50 lb per bag, and a working fifth of a cubic foot per shovel of damp sand. NO TYPE TABLE IS SHIPPED: the cement and lime volumes for Types M, S, N and O come from C270 and differ between the portland-lime, masonry-cement and mortar-cement systems. Proportion-specified and property-specified mortars are not interchangeable, and field-tested mortar is tested to different acceptance than laboratory mortar. ASTM C270, the project specification, and the mason of record govern.",
  example: mortarBatchC270Example.inputs,
  fields: [
    { key: "cement_volumes", label: "Portland cement (volumes)", kind: "number", default: 1 },
    { key: "lime_volumes", label: "Hydrated lime (volumes)", kind: "number", default: 0.5 },
    { key: "sand_ratio", label: "Sand, times the cementitious total", kind: "number", default: 2.5 },
    { key: "cement_bags", label: "Batch size (bags of cement)", kind: "number", default: 1 },
    { key: "unit_strength_psi", label: "Masonry unit compressive strength (psi, 0 to skip)", kind: "number" },
    { key: "mortar_strength_psi", label: "Mortar compressive strength (psi, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "c", id: "mbc-out-c", label: "Cementitious", value: (r) => fmt(r.cement_cuft, 2) + " cu ft of cement (" + fmt(r.cement_bags, 0) + " bag" + (r.cement_bags === 1 ? "" : "s") + ", " + fmt(r.cement_weight_lb, 0) + " lb) and " + fmt(r.lime_cuft, 2) + " cu ft of lime (" + fmt(r.lime_bags, 2) + " bag equivalent, " + fmt(r.lime_weight_lb, 0) + " lb)" },
    { key: "s", id: "mbc-out-s", label: "Sand", value: (r) => fmt(r.sand_cuft, 2) + " cu ft, about " + fmt(r.sand_shovels, 0) + " shovels of damp sand" },
    { key: "r", id: "mbc-out-r", label: "Sand against the allowable range", value: (r) => r.sand_verdict },
    { key: "y", id: "mbc-out-y", label: "Batch yield", value: (r) => fmt(r.batch_yield_cuft, 2) + " cu ft before water" },
    { key: "k", id: "mbc-out-k", label: "Mortar against the unit", value: (r) => r.compat_verdict },
    { key: "n", id: "mbc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMortarBatchC270,
});

// ============ spec-v1684: CMU grout lift and pour height ============

// dims: in { pour_height_ft: L, lift_height_ft: L, max_pour_height_ft: L, max_lift_height_ft: L, grout_unit_weight_pcf: M L^-3, cleanout_threshold_ft: L } out: { lifts_in_pour: dimensionless, base_pressure_psi: M L^-1 T^-2, base_pressure_psf: M L^-1 T^-2, pour_margin_ft: L, lift_margin_ft: L, pressure_at_limit_psi: M L^-1 T^-2, actual_lift_ft: L, cleanout_threshold_ft: L, lift_height_ft: L, max_lift_height_ft: L, max_pour_height_ft: L, pour_height_ft: L, grout_unit_weight_pcf: M L^-3 }
export function computeGroutLiftPourHeight({ pour_height_ft = 0, lift_height_ft = 0, max_pour_height_ft = 0, max_lift_height_ft = 0, grout_unit_weight_pcf = 140, cleanout_threshold_ft = 5.333 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pour_height_ft > 0)) return { error: "The proposed pour height must be positive (ft)." };
  if (!(lift_height_ft > 0)) return { error: "The proposed lift height must be positive (ft)." };
  if (!(lift_height_ft <= pour_height_ft)) return { error: "A lift cannot be taller than the pour it is part of; a pour is made up of one or more lifts." };
  if (!(max_pour_height_ft > 0)) return { error: "Enter the code's maximum pour height for this grout space, grout type, and unit (ft)." };
  if (!(max_lift_height_ft > 0)) return { error: "Enter the code's maximum lift height for this configuration (ft)." };
  if (!(grout_unit_weight_pcf > 0)) return { error: "Grout unit weight must be positive (pcf); fluid grout runs about 140." };
  if (cleanout_threshold_ft < 0) return { error: "The cleanout threshold height cannot be negative (ft)." };
  const SQIN_PER_SQFT_MAS = 144;
  const lifts_in_pour = Math.ceil(pour_height_ft / lift_height_ft - 1e-9);
  const actual_lift_ft = pour_height_ft / lifts_in_pour;
  // The wall is holding back a column of liquid while its joints are hours old.
  const base_pressure_psf = grout_unit_weight_pcf * pour_height_ft;
  const base_pressure_psi = base_pressure_psf / SQIN_PER_SQFT_MAS;
  const pressure_at_limit_psi = grout_unit_weight_pcf * max_pour_height_ft / SQIN_PER_SQFT_MAS;
  const pour_margin_ft = max_pour_height_ft - pour_height_ft;
  const lift_margin_ft = max_lift_height_ft - lift_height_ft;
  // TMS 602's limits are in feet and inches (5 ft 4 in = 5.333... ft), so a
  // limit typed as 5.33 or 5.333 must not fail a pour of exactly 5 ft 4 in; the
  // comparison carries 0.005 ft (1/16 in). Until 2026-10-01 it was exact.
  const LIMIT_TOL_FT = 0.005;
  const pour_ok = pour_height_ft <= (max_pour_height_ft + LIMIT_TOL_FT) + 1e-9 * Math.abs(max_pour_height_ft + LIMIT_TOL_FT);
  const lift_ok = lift_height_ft <= (max_lift_height_ft + LIMIT_TOL_FT) + 1e-9 * Math.abs(max_lift_height_ft + LIMIT_TOL_FT);
  const cleanouts_required = pour_height_ft > cleanout_threshold_ft + LIMIT_TOL_FT;
  const outs = [lifts_in_pour, base_pressure_psi, base_pressure_psf, pour_margin_ft, lift_margin_ft];
  if (!outs.every(Number.isFinite)) return { error: "Grout lift math is not a finite value." };
  const pour_verdict = pour_ok
    ? "POUR ALLOWED: " + fmt(pour_height_ft, 2) + " ft against a limit of " + fmt(max_pour_height_ft, 2) + " ft, " + fmt(pour_margin_ft, 2) + " ft to spare"
    : "POUR OVER THE LIMIT by " + fmt(-pour_margin_ft, 2) + " ft: " + fmt(pour_height_ft, 2) + " ft against " + fmt(max_pour_height_ft, 2) + " ft. This is the blowout case -- fluid grout at " + fmt(base_pressure_psi, 2) + " psi against joints that are hours old";
  const lift_verdict = lift_ok
    ? "LIFT ALLOWED: " + fmt(lift_height_ft, 2) + " ft against a limit of " + fmt(max_lift_height_ft, 2) + " ft, so " + fmt(lifts_in_pour, 0) + " lift" + (lifts_in_pour === 1 ? " of " : "s of ") + fmt(actual_lift_ft, 2) + " ft " + (lifts_in_pour === 1 ? "makes" : "make") + " this pour"
    : "LIFT OVER THE LIMIT by " + fmt(-lift_margin_ft, 2) + " ft: grout deeper than it can be consolidated leaves voids, and a void in a grouted cell means the reinforcement is not embedded and the wall does not have the strength the drawings assume";
  const cleanout_verdict = cleanouts_required
    ? "CLEANOUTS REQUIRED at " + fmt(pour_height_ft, 2) + " ft, above the " + fmt(cleanout_threshold_ft, 2) + " ft threshold -- openings at the base of EVERY grouted cell, closed only after inspection. A wall laid without them has to be opened at the base"
    : "No cleanouts required at " + fmt(pour_height_ft, 2) + " ft, below the " + fmt(cleanout_threshold_ft, 2) + " ft threshold. Check the pour height BEFORE laying, not at inspection";
  return {
    pour_height_ft, lift_height_ft, max_pour_height_ft, max_lift_height_ft,
    lifts_in_pour, actual_lift_ft, grout_unit_weight_pcf, base_pressure_psf,
    base_pressure_psi, pressure_at_limit_psi, pour_margin_ft, lift_margin_ft,
    pour_ok, lift_ok, cleanout_threshold_ft, cleanouts_required,
    pour_verdict, lift_verdict, cleanout_verdict,
    note: "Two limits control two different failures and they are constantly confused. THE LIFT LIMIT IS ABOUT CONSOLIDATION: grout placed deeper than it can be properly vibrated leaves voids, and a void in a grouted cell means the reinforcement is not embedded and the wall does not have the strength the drawings assume. THE POUR LIMIT IS ABOUT THE WALL'S OWN STRENGTH WHILE THE GROUT IS FLUID: freshly grouted masonry is holding back a column of liquid at roughly 140 pounds per cubic foot, and a pour higher than the wall can resist blows it out. A pour is made up of one or more lifts, so the two limits are checked separately and the lift count falls out of them. The pressure arithmetic is worth carrying because it is the whole reason for the pour limit: a five foot pour puts about five pounds per square inch on the inside of joints that are hours old, and doubling the pour doubles it. Blowouts are exactly what happens when a crew decides to grout a full storey in one go because the pump is already there, and the wall gives no warning before it goes. CLEANOUTS ARE THE PROVISION THAT GETS OMITTED AND THEN REQUIRED. Above a threshold pour height the code requires openings at the base of every grouted cell so mortar droppings can be removed and the space inspected before grouting, and they are closed only after that inspection. A wall built without them and discovered at inspection has to be opened at the base -- cutting units out of completed work -- which is far more expensive than building them in, and entirely avoidable by checking the pour height before laying. CONSOLIDATION IS A TWO-STEP REQUIREMENT rather than one. Grout is vibrated when placed and again after initial water loss, because it settles as the masonry absorbs water, and reconsolidation closes the void that leaves at the top of the lift -- which in many walls sits directly over a reinforcement lap. THE CODE LIMITS ARE ENTERED AND NO TABLE IS SHIPPED. Maximum lift and pour heights depend on the grout space least dimension, the unit type, whether the grout is fine or coarse, and whether cleanouts are provided, and the table that governs is the one in the adopted edition. This does not compute grout volume (cmu-grout-volume does), design the wall, evaluate whether a specific wall can resist a specific pour pressure -- which depends on the units, the mortar, the joints' age and the bracing -- or address grout demand, aggregate, slump, admixtures, or self-consolidating grout, whose placement rules differ. TMS 602 as adopted, the project specification, and the inspector govern.",
  };
}
const groutLiftPourHeightExample = { inputs: { pour_height_ft: 5, lift_height_ft: 5, max_pour_height_ft: 5.333, max_lift_height_ft: 5.333, grout_unit_weight_pcf: 140, cleanout_threshold_ft: 5.333 } };
MASONRY_RENDERERS["grout-lift-pour-height"] = _simpleRenderer({
  citation: "Citation: the TMS 602 grout placement limits by name -- the LIFT limit governs consolidation and the POUR limit governs the wall's resistance to fluid grout pressure, with a pour made up of one or more lifts and cleanouts required at the base of every grouted cell above a threshold pour height. The fluid pressure at the base is unit weight x pour height, about 140 pcf for grout. NO LIMIT TABLE IS SHIPPED: the maximum lift and pour heights depend on the grout space least dimension, the unit type, fine or coarse grout, and whether cleanouts are provided, and come from the adopted edition. TMS 602 as adopted, the project specification, and the inspector govern.",
  example: groutLiftPourHeightExample.inputs,
  fields: [
    { key: "pour_height_ft", label: "Proposed pour height (ft)", kind: "number" },
    { key: "lift_height_ft", label: "Proposed lift height (ft)", kind: "number" },
    { key: "max_pour_height_ft", label: "Code maximum pour height (ft)", kind: "number", default: 5.333 },
    { key: "max_lift_height_ft", label: "Code maximum lift height (ft)", kind: "number", default: 5.333 },
    { key: "grout_unit_weight_pcf", label: "Fluid grout unit weight (pcf)", kind: "number", default: 140 },
    { key: "cleanout_threshold_ft", label: "Cleanout threshold pour height (ft)", kind: "number", default: 5.333 },
  ],
  outputs: [
    { key: "p", id: "glp-out-p", label: "Pour", value: (r) => r.pour_verdict },
    { key: "l", id: "glp-out-l", label: "Lift", value: (r) => r.lift_verdict },
    { key: "b", id: "glp-out-b", label: "Pressure at the base", value: (r) => fmt(r.base_pressure_psi, 2) + " psi (" + fmt(r.base_pressure_psf, 0) + " psf) of fluid grout, against " + fmt(r.pressure_at_limit_psi, 2) + " psi at the code's pour limit" },
    { key: "c", id: "glp-out-c", label: "Cleanouts", value: (r) => r.cleanout_verdict },
    { key: "n", id: "glp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGroutLiftPourHeight,
});

// ============ spec-v1685: masonry cleaning dilution and coverage ============

// dims: in { area_ft2: L^2, dilution_parts_water: dimensionless, coverage_ft2_per_gal: L^-1, prewet_gal_per_100ft2: L^3, rinse_gal_per_100ft2: L^3, acid_safe_unit: dimensionless } out: { diluted_gal: L^3, concentrate_gal: L^3, water_gal: L^3, prewet_gal: L^3, rinse_gal: L^3, total_water_gal: L^3, area_ft2: L^2, concentrate_pct: dimensionless, coverage_ft2_per_gal: L^-1, total_parts: dimensionless, acid_safe_unit: dimensionless, dilution_parts_water: dimensionless, prewet_gal_per_100ft2: L^3, rinse_gal_per_100ft2: L^3 }
export function computeMasonryCleaningDilution({ area_ft2 = 0, dilution_parts_water = 0, coverage_ft2_per_gal = 0, prewet_gal_per_100ft2 = 0, rinse_gal_per_100ft2 = 0, acid_safe_unit = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(area_ft2 > 0)) return { error: "The area to be cleaned must be positive (sq ft)." };
  if (!(dilution_parts_water > 0)) return { error: "The dilution must be positive (parts water to one part concentrate)." };
  if (!(coverage_ft2_per_gal > 0)) return { error: "Coverage must be positive (sq ft per gallon of DILUTED solution)." };
  if (prewet_gal_per_100ft2 < 0 || rinse_gal_per_100ft2 < 0) return { error: "A water rate cannot be negative (gal per 100 sq ft)." };
  const diluted_gal = area_ft2 / coverage_ft2_per_gal;
  // One part concentrate to N parts water is one part in N+1 of the mix.
  const total_parts = dilution_parts_water + 1;
  const concentrate_gal = diluted_gal / total_parts;
  const water_gal = diluted_gal - concentrate_gal;
  const concentrate_pct = 100 / total_parts;
  const hundreds = area_ft2 / 100;
  const prewet_gal = prewet_gal_per_100ft2 * hundreds;
  const rinse_gal = rinse_gal_per_100ft2 * hundreds;
  const total_water_gal = water_gal + prewet_gal + rinse_gal;
  const acid_ok = acid_safe_unit >= 0.5 - 1e-9 * Math.abs(0.5);
  const outs = [diluted_gal, concentrate_gal, water_gal, prewet_gal, rinse_gal, total_water_gal];
  if (!outs.every(Number.isFinite)) return { error: "Cleaning dilution math is not a finite value." };
  const compat_verdict = acid_ok
    ? "The unit is marked acid-tolerant, which still means a TEST PANEL rather than a decision -- the correct dilution is the weakest that removes the soiling, established on the panel"
    : "DO NOT ACID CLEAN: polished stone, limestone, marble, many coloured and glazed units, and anything with a metallic finish are attacked by acid, and the damage looks like efflorescence or a colour change and is permanent. Aluminium windows below the work are etched by the rinse water alone";
  return {
    area_ft2, dilution_parts_water, total_parts, concentrate_pct, coverage_ft2_per_gal,
    diluted_gal, concentrate_gal, water_gal, prewet_gal_per_100ft2, prewet_gal,
    rinse_gal_per_100ft2, rinse_gal, total_water_gal, acid_safe_unit, acid_ok, compat_verdict,
    note: "THE CONCENTRATION IS A PROPERTY OF THE MASONRY RATHER THAN OF THE SOILING, and that inversion is the whole discipline. Acid-based cleaners attack the cement paste in the mortar and the surface of many units, so the correct dilution is the WEAKEST that removes the soiling, established on a test panel -- and strengthening it because the wall is dirty is the standard way to burn a facade. The damage looks like efflorescence or a colour change, it appears after the scaffold is down, and it is permanent. One part concentrate to N parts water is one part in N plus one of the mix, which is the arithmetic people get wrong in the direction of too strong. PREWETTING IS WHAT KEEPS THE CLEANER ON THE SURFACE. Dry masonry draws the solution into itself, where it attacks the mortar from within and leaves salts that migrate back out for years afterward. Saturating the wall first means the cleaner works on the face and rinses away, and skipping it is the difference between a cleaned wall and a damaged one -- so the prewet water is counted here as part of the job rather than as an optional step. RINSING IS A QUANTITY AS WELL AS AN ACTION. Residual cleaner keeps working after the crew moves on, so the rinse volume and pressure are specified, and an inadequate rinse produces damage that appears days later on a wall that looked finished. The total water is what the site has to supply and what the runoff control has to handle. THE UNITS THAT MUST NEVER SEE ACID ARE A SHORT LIST WORTH CARRYING: polished stone, limestone, marble, many coloured and glazed units, and anything with a metallic finish or with metal below that the runoff will reach. Aluminium windows under an acid-cleaned brick facade get etched by the rinse water alone, which is why masking and runoff control are part of the job rather than housekeeping. Dwell time belongs on that list too: a stated dwell is a maximum as much as a minimum, because a cleaner allowed to dry in place has to be removed mechanically. Quantities from a dilution and a coverage rate the reader takes from the manufacturer for the specific unit. It does not select a cleaner or a dilution, evaluate the soiling, or replace a test panel, which is required rather than advisable. It does not address containment, runoff collection and disposal, which are regulated; personal protective equipment and the hazards of the concentrate; pressure and equipment; or the temperature and weather limits on application. Efflorescence, mortar smears, and construction staining have different treatments, and some of them are not acid. The cleaner manufacturer's instructions for the specific unit, the project specification, a test panel, and the applicable environmental rules govern.",
  };
}
const masonryCleaningDilutionExample = { inputs: { area_ft2: 2400, dilution_parts_water: 5, coverage_ft2_per_gal: 150, prewet_gal_per_100ft2: 5, rinse_gal_per_100ft2: 12, acid_safe_unit: 1 } };
MASONRY_RENDERERS["masonry-cleaning-dilution"] = _simpleRenderer({
  citation: "Citation: the dilution and coverage identities by name -- diluted solution = area / coverage; one part concentrate to N parts water is one part in N+1, so concentrate = diluted / (N+1) -- with the prewet and rinse water counted at their own rates per 100 sq ft. NO CLEANER, DILUTION OR COVERAGE IS SHIPPED: all three come from the manufacturer for the specific unit, and a test panel is required rather than advisable. The prefilled dilution and coverage are the worked example's, not a recommendation. Acid attacks polished stone, limestone, marble, many coloured and glazed units, and metal the runoff reaches. The cleaner manufacturer's instructions, the project specification, a test panel, and the applicable environmental rules govern.",
  example: masonryCleaningDilutionExample.inputs,
  fields: [
    { key: "area_ft2", label: "Area to clean (sq ft)", kind: "number" },
    { key: "dilution_parts_water", label: "Parts water to 1 part concentrate", kind: "number" },
    { key: "coverage_ft2_per_gal", label: "Coverage (sq ft per gal of diluted solution)", kind: "number" },
    { key: "prewet_gal_per_100ft2", label: "Prewet water (gal per 100 sq ft)", kind: "number" },
    { key: "rinse_gal_per_100ft2", label: "Rinse water (gal per 100 sq ft)", kind: "number" },
    { key: "acid_safe_unit", label: "Unit tolerates acid (1 yes, 0 no)", kind: "number", default: 1, attrs: { step: "1", min: "0", max: "1" } },
  ],
  outputs: [
    { key: "d", id: "mcd-out-d", label: "Diluted solution", value: (r) => fmt(r.diluted_gal, 1) + " gal at " + fmt(r.coverage_ft2_per_gal, 0) + " sq ft per gallon" },
    { key: "c", id: "mcd-out-c", label: "Concentrate and water", value: (r) => fmt(r.concentrate_gal, 2) + " gal of concentrate and " + fmt(r.water_gal, 2) + " gal of water -- 1 part in " + fmt(r.total_parts, 0) + ", " + fmt(r.concentrate_pct, 1) + "% concentrate" },
    { key: "p", id: "mcd-out-p", label: "Prewet and rinse", value: (r) => fmt(r.prewet_gal, 0) + " gal to saturate the wall first and " + fmt(r.rinse_gal, 0) + " gal to rinse -- residual cleaner keeps working" },
    { key: "t", id: "mcd-out-t", label: "Total water on site", value: (r) => fmt(r.total_water_gal, 0) + " gal, all of which becomes runoff to be contained" },
    { key: "k", id: "mcd-out-k", label: "The unit", value: (r) => r.compat_verdict },
    { key: "n", id: "mcd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMasonryCleaningDilution,
});

// ===================== spec-v1983: hearth extension size and thickness =====================
// IRC 2024 R1001.10 and R1001.9.2 (same numbers in IRC 2021; both read 2026-10-19).
// The extension in front of a masonry fireplace is sized by the opening it faces:
// under 6 sq ft, 16 in in front and 8 in past each side; 6 sq ft or more, 20 and 12.
// It is 2 in thick unless the firebox bottom sits 8 in or more above it (3/8 in).
const _hecIn = (x) => String(Number(x.toFixed(4)));
// Blank (or whitespace) is "not measured"; only a number or a numeric string counts.
const _hecOpt = (v, what) => {
  const blank = v === null || v === undefined || (typeof v === "string" && v.trim() === "");
  const ok = typeof v === "number" || (typeof v === "string" && /^\s*[+-]?(\d+\.?\d*|\.\d+)\s*$/.test(v));
  return blank ? { v: null } : !ok || !Number.isFinite(Number(v)) ? { error: what + " must be a number (in)." }
    : Number(v) < 0 ? { error: what + " cannot be negative (in)." } : { v: Number(v) };
};

// dims: in { opening_width_in: L, opening_height_in: L, front_in: L, side_in: L, thickness_in: L, firebox_raise_in: L } out: { opening_area_sqft: L^2, req_front_in: L, req_side_in: L, footprint_width_in: L, req_thickness_in: L, footprint_depth_in: L }
export function computeHearthExtensionCheck({
  opening_width_in = 0, opening_height_in = 0, front_in = null, side_in = null, thickness_in = null, firebox_raise_in = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Wp = _hecOpt(opening_width_in, "The opening width"), Hp = _hecOpt(opening_height_in, "The opening height");
  if (Wp.error) return { error: Wp.error }; if (Hp.error) return { error: Hp.error };
  const W = Wp.v, H = Hp.v;
  if (!(W > 0) || !(H > 0)) return { error: "Fireplace opening width and height must be positive (in)." };
  if (W > 240 || H > 120) return { error: "An opening wider than 240 in or taller than 120 in is outside a residential masonry fireplace." };
  const F = _hecOpt(front_in, "The measured extension in front"); if (F.error) return { error: F.error };
  const S = _hecOpt(side_in, "The measured extension beyond each side"); if (S.error) return { error: S.error };
  const T = _hecOpt(thickness_in, "The measured thickness"); if (T.error) return { error: T.error };
  const R = _hecOpt(firebox_raise_in, "The firebox bottom height"); if (R.error) return { error: R.error };
  const raise = R.v === null ? 0 : R.v;
  const opening_area_sqft = W * H / 144;
  const large = opening_area_sqft >= 6 - 1e-9;
  const req_front_in = large ? 20 : 16;
  const req_side_in = large ? 12 : 8;
  const footprint_width_in = W + 2 * req_side_in;
  const raised = raise >= 8 - 1e-9;
  const req_thickness_in = raised ? 0.375 : 2;
  const front_ok = F.v === null ? null : F.v >= req_front_in - 1e-9;
  const side_ok = S.v === null ? null : S.v >= req_side_in - 1e-9;
  const thickness_ok = T.v === null ? null : T.v >= req_thickness_in - 1e-9;
  const checks = [
    ["front", front_ok, F.v, req_front_in], ["each side", side_ok, S.v, req_side_in], ["thickness", thickness_ok, T.v, req_thickness_in],
  ].filter((c) => c[1] !== null);
  const fails = checks.filter((c) => !c[1]);
  const rule_text = " (opening " + fmt(opening_area_sqft, 2) + " sq ft, " + (large ? "6 sq ft or more" : "under 6 sq ft") + "; firebox " + (raised ? "raised 8 in or more" : "not raised 8 in") + ")";
  const verdict = !checks.length
    ? "(no measured extension entered: build it at least " + req_front_in + " in in front, " + req_side_in + " in past each side and " + (raised ? "3/8" : "2") + " in thick)"
    : fails.length
      ? "FAILS: " + fails.map((c) => c[0] + " " + _hecIn(c[2]) + " in, " + (Number((c[3] - c[2]).toFixed(4)) > 0 ? _hecIn(c[3] - c[2]) + " in short of " : "under ") + _hecIn(c[3]) + " in").join("; ") + rule_text
      : "PASSES " + checks.map((c) => c[0]).join(", ") + (checks.length < 3 ? " (the dimensions not entered are not checked)" : "");
  if (![opening_area_sqft, footprint_width_in].every(Number.isFinite)) return { error: "Hearth math is not a finite value." };
  return {
    opening_area_sqft, large, req_front_in, req_side_in, footprint_width_in, footprint_depth_in: req_front_in, req_thickness_in, raised,
    front_ok, side_ok, thickness_ok, verdict,
    note: "IRC 2024 R1001.10: a hearth extension reaches not less than 16 in in front of and 8 in beyond each side of the fireplace opening, and 20 in and 12 in where the opening is 6 sq ft or larger. R1001.9.2: it is at least 2 in thick, except that where the bottom of the firebox opening is raised not less than 8 in above the top of the extension, 3/8 in of brick, concrete, stone, tile or other approved noncombustible material is permitted. The opening area is width x height; for an arched opening keep the true width and enter the height that gives its actual area (area in sq in / width). The same numbers stand in IRC 2021. The hearth under the firebox (4 in, R1001.9.1), the extension's support, clearance to combustibles and factory-built fireplaces (their listing, R1004) are separate checks.",
  };
}
export const hearthExtensionCheckExample = { inputs: { opening_width_in: 36, opening_height_in: 30, front_in: 18, side_in: 12, thickness_in: 2, firebox_raise_in: 0 } };

MASONRY_RENDERERS["hearth-extension-check"] = _simpleRenderer({
  citation: "Citation: IRC 2024 R1001.10 and R1001.9.2 (the same sections and numbers in IRC 2021), by name; free at codes.iccsafe.org, read 2026-10-19. Opening under 6 sq ft: 16 in in front and 8 in past each side; 6 sq ft or more: 20 in and 12 in. Extension at least 2 in thick, or 3/8 in where the firebox bottom is raised 8 in or more above it. The adopted code and the AHJ govern.",
  example: hearthExtensionCheckExample.inputs,
  fields: [
    { key: "opening_width_in", label: "Fireplace opening width (in)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "opening_height_in", label: "Fireplace opening height (in)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "front_in", label: "Measured extension in front of the opening (in, blank to skip)", kind: "number", required: true, attrs: { step: "any", min: "0" } },
    { key: "side_in", label: "Measured extension beyond each side (in, the smaller side; blank to skip)", kind: "number", required: true, attrs: { step: "any", min: "0" } },
    { key: "thickness_in", label: "Measured extension thickness (in, blank to skip)", kind: "number", required: true, attrs: { step: "any", min: "0" } },
    { key: "firebox_raise_in", label: "Firebox opening bottom above the extension (in)", kind: "number", attrs: { step: "any", min: "0" } },
  ],
  outputs: [
    { key: "a", id: "hec-out-a", label: "Opening area", value: (r) => fmt(r.opening_area_sqft, 2) + " sq ft (" + (r.large ? "6 sq ft or more" : "under 6 sq ft") + ")" },
    { key: "q", id: "hec-out-q", label: "Required extension", value: (r) => r.req_front_in + " in in front, " + r.req_side_in + " in past each side: at least " + fmt(r.footprint_width_in, 1) + " by " + r.footprint_depth_in + " in" },
    { key: "t", id: "hec-out-t", label: "Required thickness", value: (r) => (r.raised ? "3/8 in (firebox bottom raised 8 in or more)" : "2 in") },
    { key: "v", id: "hec-out-v", label: "Check", value: (r) => r.verdict },
    { key: "n", id: "hec-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHearthExtensionCheck,
});

// ===================== spec-v1984: chimney termination height (the 3-2-10 rule) =====================
// IRC 2024 R1003.9 (the same in IRC 2021; both read 2026-10-19): a chimney extends
// at least 2 ft higher than any portion of a building within 10 ft, and at least
// 3 ft above the highest point where it passes through the roof. On a pitched roof
// the roof itself, rising upslope, is usually the "portion within 10 ft".
const _ctNum = (v, what, opt) => {
  const blank = v === null || v === undefined || (typeof v === "string" && v.trim() === "");
  if (blank) return opt ? { v: null } : { error: "Enter the " + what + "." };
  const ok = typeof v === "number" || (typeof v === "string" && /^\s*[+-]?(\d+\.?\d*|\.\d+)\s*$/.test(v));
  if (!ok || !Number.isFinite(Number(v))) return { error: "The " + what + " must be a number." };
  if (Number(v) < 0) return { error: "The " + what + " cannot be negative." };
  return { v: Number(v) };
};

// dims: in { pitch_in12: dimensionless, ridge_distance_ft: L, other_height_ft: L, chimney_width_in: L, measured_ft: L } out: { roof_rise_ft: L, rule1_ft: L, rule2_roof_ft: L, rule2_other_ft: L, required_ft: L, low_side_ft: L }
export function computeChimneyTerminationHeight({ pitch_in12, ridge_distance_ft, other_height_ft = 0, chimney_width_in, measured_ft = null } = {}) {
  const P = _ctNum(pitch_in12, "roof pitch (in per 12)"); if (P.error) return { error: P.error };
  const D = _ctNum(ridge_distance_ft, "distance to the ridge (ft)"); if (D.error) return { error: D.error };
  const O = _ctNum(other_height_ft, "height of other building portions within 10 ft (ft)", true); if (O.error) return { error: O.error };
  const Wd = _ctNum(chimney_width_in, "chimney width along the slope (in)"); if (Wd.error) return { error: Wd.error };
  const M = _ctNum(measured_ft, "measured chimney height (ft)", true); if (M.error) return { error: M.error };
  const p = P.v, other = O.v === null ? 0 : O.v;
  if (p > 24) return { error: "Roof pitch above 24 in 12 is outside this check." };
  if (!(Wd.v > 0)) return { error: "Chimney width along the slope must be positive (in)." };
  if (D.v > 1000 || other > 200 || Wd.v > 240) return { error: "Distances above 1,000 ft, portions above 200 ft or chimneys over 240 in wide are outside this check." };
  // The roof is highest within 10 ft at the ridge or 10 ft upslope, whichever is nearer.
  const reach_ft = Math.min(10, D.v);
  const roof_rise_ft = p * reach_ft / 12;
  const rule1_ft = 3;
  const rule2_roof_ft = 2 + roof_rise_ft;
  const rule2_other_ft = other > 0 ? 2 + other : null;
  const required_ft = Math.max(rule1_ft, rule2_roof_ft, rule2_other_ft || 0);
  const governs = rule1_ft >= rule2_roof_ft && rule1_ft >= (rule2_other_ft || 0) ? "3 ft above the roof penetration"
    : (rule2_other_ft || 0) > rule2_roof_ft ? "2 ft above the other building portion within 10 ft"
      : "2 ft above the roof within 10 ft upslope";
  const low_side_ft = required_ft + p * (Wd.v / 12) / 12;
  const has_check = M.v !== null;
  const passes = has_check ? M.v >= required_ft - 1e-9 : null;
  const verdict = !has_check
    ? "(no measured height entered: build to at least " + fmt(required_ft, 2) + " ft above the high side, " + fmt(low_side_ft, 2) + " ft on the low side)"
    : passes ? "PASSES: " + fmt(M.v, 2) + " ft above the high side meets the " + fmt(required_ft, 2) + " ft required"
      : "FAILS: " + fmt(M.v, 2) + " ft above the high side, " + fmt(required_ft - M.v, 2) + " ft short of the " + fmt(required_ft, 2) + " ft required (" + governs + ")";
  if (![roof_rise_ft, required_ft, low_side_ft].every(Number.isFinite)) return { error: "Chimney height math is not a finite value." };
  return {
    roof_rise_ft, rule1_ft, rule2_roof_ft, rule2_other_ft, required_ft, governs, low_side_ft, has_check, passes, verdict,
    note: "IRC 2024 R1003.9: chimneys extend not less than 2 ft higher than any portion of a building within 10 ft, and not less than 3 ft above the highest point where the chimney passes through the roof. On a pitched roof the roof surface rises p x d / 12 over d ft upslope, so the highest roof within 10 ft is at the ridge or 10 ft upslope, whichever is nearer, and the chimney must top it by 2 ft; 3 ft governs only where the pitch times min(10, distance to the ridge) is 12 or less: a flat or very low-slope roof, or a chimney close to the ridge. Heights are above the HIGH (upslope) side of the penetration; the chimney's own width adds p x width / 12 on the low side, which is what a tape on the downslope face reads. Enter a dormer, parapet, taller wall or neighbouring roof within 10 ft as its height above the penetration's high side. A factory-built chimney follows its listing, and an appliance whose manufacturer lists another termination follows that; draft, spark arrestors and caps are separate.",
  };
}
export const chimneyTerminationHeightExample = { inputs: { pitch_in12: 6, ridge_distance_ft: 14, other_height_ft: 0, chimney_width_in: 32, measured_ft: 6 } };

MASONRY_RENDERERS["chimney-termination-height"] = _simpleRenderer({
  citation: "Citation: IRC 2024 R1003.9 (the same in IRC 2021), by name; free at codes.iccsafe.org, read 2026-10-19. A chimney extends at least 2 ft higher than any portion of a building within 10 ft and at least 3 ft above the highest point where it passes through the roof (the 3-2-10 rule); on a pitch of p in 12 the roof within 10 ft rises p x min(10, distance to ridge) / 12. The adopted code, the appliance or chimney listing and the AHJ govern.",
  example: chimneyTerminationHeightExample.inputs,
  fields: [
    { key: "pitch_in12", label: "Roof pitch (in of rise per 12 in; 0 for flat)", kind: "number", required: true, attrs: { step: "any", min: "0", max: "24" } },
    { key: "ridge_distance_ft", label: "Horizontal distance from the chimney's upslope face to the ridge (ft)", kind: "number", required: true, attrs: { step: "any", min: "0" } },
    { key: "other_height_ft", label: "Height of any other building portion within 10 ft, above the penetration (ft, 0 if none)", kind: "number", attrs: { step: "any", min: "0" } },
    { key: "chimney_width_in", label: "Chimney width along the slope (in)", kind: "number", required: true, attrs: { step: "any", min: "0" } },
    { key: "measured_ft", label: "Measured height above the high side of the penetration (ft, blank to skip)", kind: "number", required: true, attrs: { step: "any", min: "0" } },
  ],
  outputs: [
    { key: "r", id: "cth-out-r", label: "Required height above the high side", value: (r) => fmt(r.required_ft, 2) + " ft (" + r.governs + ")" },
    { key: "s", id: "cth-out-s", label: "Each rule", value: (r) => "3 ft above the roof: 3.00 ft; 2 ft above the roof within 10 ft (it rises " + fmt(r.roof_rise_ft, 2) + " ft): " + fmt(r.rule2_roof_ft, 2) + " ft" + (r.rule2_other_ft === null ? "" : "; 2 ft above the other portion: " + fmt(r.rule2_other_ft, 2) + " ft") },
    { key: "l", id: "cth-out-l", label: "Same height measured on the low side", value: (r) => fmt(r.low_side_ft, 2) + " ft" },
    { key: "v", id: "cth-out-v", label: "Check", value: (r) => r.verdict },
    { key: "n", id: "cth-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeChimneyTerminationHeight,
});

// ===================== spec-v1992: fireplace clearance to combustibles and mantel projection =====================
// IRC 2024 R1001.11 and its Exceptions 3 and 4 (the same in IRC 2021; both read
// 2026-10-19). Framing stays 2 in off the front faces and sides and 4 in off the
// back. Combustible sheathing edges and trim may abut the sidewalls and hearth
// extension only 8 in or more from the inside of the firebox lining (12 in for an
// opening of 6 sq ft or more). Mantels and trim on the fireplace front stay 6 in
// from the opening, and within 12 in project no more than 1/8 in per inch of distance.
const _fccNum = (v, what) => {
  const blank = v === null || v === undefined || (typeof v === "string" && v.trim() === "");
  if (blank) return { v: null };
  const ok = typeof v === "number" || (typeof v === "string" && /^\s*[+-]?(\d+\.?\d*|\.\d+)\s*$/.test(v));
  if (!ok || !Number.isFinite(Number(v))) return { error: "The " + what + " must be a number (in)." };
  if (Number(v) < 0) return { error: "The " + what + " cannot be negative (in)." };
  return { v: Number(v) };
};

// dims: in { code_edition: dimensionless, framing_front_in: L, framing_back_in: L, opening_area_class: dimensionless, sheathing_from_lining_in: L, mantel_distance_in: L, mantel_projection_in: L } out: { allowed_projection_in: L, distance_needed_in: L, sheathing_required_in: L, checks_failed: dimensionless, checks_run: dimensionless }
export function computeFireplaceClearanceCheck({
  code_edition = "2024", framing_front_in = null, framing_back_in = null, opening_area_class = "under_6", sheathing_from_lining_in = null, mantel_distance_in = null, mantel_projection_in = null,
} = {}) {
  const cls = String(opening_area_class ?? "under_6");
  if (cls !== "under_6" && cls !== "6_or_more") return { error: "Opening area class must be under_6 or 6_or_more." };
  const ed = String(code_edition ?? "2024");
  if (ed !== "2024" && ed !== "2021") return { error: "IRC edition must be 2024 or 2021." };
  const vals = {};
  for (const [k, v, w] of [["ff", framing_front_in, "framing clearance at the front and sides"], ["fb", framing_back_in, "framing clearance at the back"], ["sh", sheathing_from_lining_in, "sheathing distance from the firebox lining"], ["md", mantel_distance_in, "mantel or trim distance from the opening"], ["mp", mantel_projection_in, "mantel or trim projection"]]) {
    const r = _fccNum(v, w); if (r.error) return { error: r.error }; vals[k] = r.v;
  }
  if (Object.values(vals).some((x) => x !== null && x > 600)) return { error: "Distances above 600 in are outside this check." };
  if ((vals.md === null) !== (vals.mp === null)) return { error: "Enter both the mantel or trim distance from the opening and its projection, or neither." };
  // IRC 2021 Exception 3 is 12 in for every opening; IRC 2024 added 8 in for one under 6 sq ft (both read 2026-10-20).
  const sheathing_required_in = ed === "2021" || cls === "6_or_more" ? 12 : 8;
  // Exception 4: none within 6 in; within 12 in (inclusive) project at most d / 8.
  const allowed_projection_in = vals.md === null ? null : vals.md < 6 - 1e-9 ? 0 : vals.md <= 12 + 1e-9 ? vals.md / 8 : null;
  const distance_needed_in = vals.mp === null ? null : vals.mp <= 0.75 + 1e-9 ? 6 : vals.mp <= 1.5 + 1e-9 ? 8 * vals.mp : null;
  const checks = [];
  if (vals.ff !== null) checks.push({ label: "framing at the front and sides " + fmt(vals.ff, 2) + " in (2 in minimum)", ok: vals.ff >= 2 - 1e-9 });
  if (vals.fb !== null) checks.push({ label: "framing at the back " + fmt(vals.fb, 2) + " in (4 in minimum)", ok: vals.fb >= 4 - 1e-9 });
  if (vals.sh !== null) checks.push({ label: "sheathing or trim abutting the sidewall " + fmt(vals.sh, 2) + " in from the firebox lining (" + sheathing_required_in + " in minimum)", ok: vals.sh >= sheathing_required_in - 1e-9 });
  if (vals.md !== null) {
    const ok = vals.md >= 6 - 1e-9 && (vals.md > 12 + 1e-9 || vals.mp <= vals.md / 8 + 1e-9);
    const why = vals.md < 6 - 1e-9 ? "inside the 6 in no-combustible band" : vals.md > 12 + 1e-9 ? "more than 12 in out, so the projection rule does not apply" : "allowed " + fmt(vals.md / 8, 3) + " in";
    checks.push({ label: "mantel or trim " + fmt(vals.md, 2) + " in from the opening projecting " + fmt(vals.mp, 3) + " in (" + why + ")", ok });
  }
  const failed = checks.filter((c) => !c.ok);
  const verdict = !checks.length ? "(nothing measured entered: framing 2 in front and sides, 4 in back; sheathing " + sheathing_required_in + " in from the firebox lining; mantels 6 in from the opening and 1/8 in of projection per inch within 12 in)"
    : failed.length ? "FAILS: " + failed.map((c) => c.label).join("; ") : "PASSES: " + checks.map((c) => c.label).join("; ");
  return {
    allowed_projection_in, distance_needed_in, sheathing_required_in, checks, mantel_entered: vals.md !== null, checks_failed: failed.length, checks_run: checks.length, verdict,
    note: "IRC 2024 R1001.11: wood beams, joists, studs and other combustibles keep not less than 2 in from the front faces and sides and 4 in from the back faces of a masonry fireplace, and the air space is not filled except with noncombustible material or fireblocking (IRC 2021: fireblocking only). Exception 3: exposed combustible trim and the edges of sheathing such as siding, flooring and gypsum board may abut the fireplace sidewalls and hearth extension when they are not less than 8 in from the inside surface of the nearest firebox lining, or 12 in where the opening is 6 sq ft or larger (IRC 2021: 12 in for every opening, so pick the edition your jurisdiction adopted). Exception 4: combustible mantels and trim on the fireplace front stay out of the 6 in around the opening, and within 12 in of it project no more than 1/8 in for each inch of distance, so 1 in proud at 8 in, 1.5 in at 12 in, and anything thicker more than 12 in away. A UL 127 listed masonry fireplace may have combustibles in contact (Exception 1), and a fireplace that is part of a masonry or concrete wall keeps combustibles off the wall within 12 in of the firebox lining (Exception 2); factory-built fireplaces and stoves follow their listings.",
  };
}
export const fireplaceClearanceCheckExample = { inputs: { code_edition: "2024", framing_front_in: 2, framing_back_in: 4, opening_area_class: "under_6", sheathing_from_lining_in: 8, mantel_distance_in: 9, mantel_projection_in: 1.5 } };

MASONRY_RENDERERS["fireplace-clearance-check"] = _simpleRenderer({
  citation: "Citation: IRC 2024 R1001.11 and its Exceptions 1 to 4, by name; free at codes.iccsafe.org, read 2026-10-19; IRC 2021 R1001.11 read 2026-10-20 (its Exception 3 is 12 in for every opening). Combustible framing 2 in from the front faces and sides and 4 in from the back of a masonry fireplace; sheathing edges and trim may abut the sidewalls and hearth extension 8 in or more from the firebox lining (12 in for an opening of 6 sq ft or more, and for every opening under IRC 2021); mantels and trim on the front not within 6 in of the opening, and within 12 in projecting no more than 1/8 in per inch of distance. The adopted code and the AHJ govern.",
  example: fireplaceClearanceCheckExample.inputs,
  fields: [
    { key: "code_edition", label: "IRC edition adopted", kind: "select", default: "2024", options: [{ value: "2024", label: "IRC 2024" }, { value: "2021", label: "IRC 2021" }] },
    { key: "framing_front_in", label: "Framing clearance at the front faces and sides (in, blank to skip)", kind: "number", required: true, attrs: { step: "any", min: "0" } },
    { key: "framing_back_in", label: "Framing clearance at the back face (in, blank to skip)", kind: "number", required: true, attrs: { step: "any", min: "0" } },
    { key: "opening_area_class", label: "Fireplace opening area", kind: "select", default: "under_6", options: [{ value: "under_6", label: "Under 6 sq ft" }, { value: "6_or_more", label: "6 sq ft or more" }] },
    { key: "sheathing_from_lining_in", label: "Sheathing or trim abutting the sidewall: distance from the firebox lining (in, blank to skip)", kind: "number", required: true, attrs: { step: "any", min: "0" } },
    { key: "mantel_distance_in", label: "Mantel or front trim: distance from the opening (in, blank to skip)", kind: "number", required: true, attrs: { step: "any", min: "0" } },
    { key: "mantel_projection_in", label: "Mantel or front trim: projection from the masonry face (in)", kind: "number", required: true, attrs: { step: "any", min: "0" } },
  ],
  outputs: [
    { key: "v", id: "fcc-out-v", label: "Check", value: (r) => r.verdict },
    { key: "p", id: "fcc-out-p", label: "Mantel projection allowed at its distance", value: (r) => (!r.mantel_entered ? "- (no mantel entered)" : r.allowed_projection_in === null ? "- (more than 12 in from the opening: no projection limit)" : r.allowed_projection_in === 0 ? "none: within 6 in of the opening" : fmt(r.allowed_projection_in, 3) + " in") },
    { key: "d", id: "fcc-out-d", label: "Distance its projection needs", value: (r) => (!r.mantel_entered ? "-" : r.distance_needed_in === null ? "more than 12 in (projection over 1.5 in)" : fmt(r.distance_needed_in, 2) + " in from the opening") },
    { key: "s", id: "fcc-out-s", label: "Sheathing edge from the firebox lining", value: (r) => "at least " + r.sheathing_required_in + " in" },
    { key: "n", id: "fcc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFireplaceClearanceCheck,
});
