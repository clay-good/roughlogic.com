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
