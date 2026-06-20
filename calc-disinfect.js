// Group B (cont.): pipe/well disinfection bench.
// spec-v103 establishes this new lazy-loaded renderer module for the
// chlorination a plumber or well-and-pump contractor does on a new line or
// well, relieving the standing calc-plumbing.js cap watch instead of
// bumping that module again. Every tile keeps group: "B" (a tile's group
// letter is independent of the module that holds it -- the v28/v70..v100
// split precedent). Tiles:
//   v103 main-disinfection-chlorine, well-shock-chlorination
// Both GOVERNANCE.general dosing arithmetic (the standard and the local
// health authority govern, and the AHJ/state well code is the law). See
// spec-v103.md.

import {
  DEBOUNCE_MS, debounce, makeNumber,
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

// Compact renderer factory (number inputs only here; same shape as the
// calc-finish.js _simpleRenderer).
function _simpleRenderer(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = makeNumber(f.label, f.id, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) field.input.value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) params[f.key] = Number(fields[f.key].input.value) || 0;
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) fields[f.key].input.addEventListener("input", update);
  };
}

export const DISINFECT_RENDERERS = {};

// Pipe/well volume: 0.0408 gal per ft per square inch of diameter (the
// 7.48 gal/ft^3 x (pi/4) / 144 geometric constant), 8.34 lb per gallon of
// water, and 1,000,000 gallons per million gallons (MG).
const _GAL_PER_FT_PER_IN2 = 0.0408;
const _WATER_LB_PER_GAL = 8.34;
const _GAL_PER_MG = 1000000;

// ===================== spec-v103: new water main chlorination =====================

// dims: in { diameter_in: L, length_ft: L, dose_mg_l: dimensionless, product_pct: dimensionless } out: { volume_gal: L^3, available_cl_lb: M, product_lb: M }
export function computeMainDisinfectionChlorine({ diameter_in = 0, length_ft = 0, dose_mg_l = 25, product_pct = 65 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(diameter_in > 0)) return { error: "Pipe inside diameter must be positive." };
  if (!(length_ft > 0)) return { error: "Length of main must be positive." };
  if (!(dose_mg_l > 0)) return { error: "Chlorine dose must be positive (mg/L)." };
  if (!(product_pct > 0 && product_pct <= 100)) return { error: "Available-chlorine percent must be in (0, 100]." };
  const volume_gal = _GAL_PER_FT_PER_IN2 * diameter_in * diameter_in * length_ft;
  const available_cl_lb = (volume_gal / _GAL_PER_MG) * dose_mg_l * _WATER_LB_PER_GAL;
  const product_lb = available_cl_lb / (product_pct / 100);
  return {
    volume_gal, available_cl_lb, product_lb,
    note: "AWWA C651 sets the method - a common one is about 25 mg/L held about 24 hours, another about 50 mg/L held about 3 hours. Calcium hypochlorite (HTH-type) is roughly 65 to 70% available chlorine by weight; sodium hypochlorite (liquid) is the trade percent on the label (for a liquid, gallons are about the pounds divided by 8.34 times the product specific gravity). The main must be flushed and pass a bacteriological test, and any chlorinated water must be dechlorinated before discharge. The standard and the AHJ govern.",
  };
}
const mainDisinfectionExample = { inputs: { diameter_in: 8, length_ft: 1000, dose_mg_l: 25, product_pct: 65 } };
DISINFECT_RENDERERS["main-disinfection-chlorine"] = _simpleRenderer({
  citation: "Citation: AWWA C651 Disinfecting Water Mains (by name) - the dose/contact-time methods (about 25 mg/L ~24 hr or about 50 mg/L ~3 hr) and the flush-and-pass-a-bacteriological-test requirement; 0.0408 gal per ft per in^2, 8.34 lb per gallon. Dechlorinate before discharge; the AHJ governs.",
  example: mainDisinfectionExample.inputs,
  fields: [
    { key: "diameter_in", label: "Pipe inside diameter (in)", kind: "number" },
    { key: "length_ft", label: "Length of main (ft)", kind: "number" },
    { key: "dose_mg_l", label: "Chlorine dose (mg/L)", kind: "number", default: 25 },
    { key: "product_pct", label: "Product available chlorine (%)", kind: "number", default: 65 },
  ],
  outputs: [
    { key: "v", id: "mdc-out-v", label: "Pipe volume", value: (r) => fmt(r.volume_gal, 0) + " gal" },
    { key: "c", id: "mdc-out-c", label: "Available (100%) chlorine", value: (r) => fmt(r.available_cl_lb, 3) + " lb" },
    { key: "p", id: "mdc-out-p", label: "Product at strength", value: (r) => fmt(r.product_lb, 3) + " lb" },
    { key: "n", id: "mdc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMainDisinfectionChlorine,
});

// ===================== spec-v103: well shock-chlorination =====================

// dims: in { casing_diameter_in: L, water_column_ft: L, target_ppm: dimensionless, bleach_pct: dimensionless } out: { well_volume_gal: L^3, available_cl_lb: M, bleach_gal: L^3 }
export function computeWellShockChlorination({ casing_diameter_in = 0, water_column_ft = 0, target_ppm = 100, bleach_pct = 6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(casing_diameter_in > 0)) return { error: "Casing inside diameter must be positive." };
  if (!(water_column_ft > 0)) return { error: "Standing water column must be positive." };
  if (!(target_ppm > 0)) return { error: "Target concentration must be positive (ppm)." };
  if (!(bleach_pct > 0 && bleach_pct <= 100)) return { error: "Bleach available-chlorine percent must be in (0, 100]." };
  const well_volume_gal = _GAL_PER_FT_PER_IN2 * casing_diameter_in * casing_diameter_in * water_column_ft;
  const available_cl_lb = (well_volume_gal / _GAL_PER_MG) * target_ppm * _WATER_LB_PER_GAL;
  const bleach_gal = well_volume_gal * target_ppm / (_GAL_PER_MG * (bleach_pct / 100));
  const bleach_qt = bleach_gal * 4;
  const bleach_floz = bleach_gal * 128;
  return {
    well_volume_gal, available_cl_lb, bleach_gal, bleach_qt, bleach_floz,
    note: "A shock target is commonly about 50 to 200 ppm held overnight (often 12 to 24 hours), then pumped to waste until the chlorine clears and the well retested. Circulate the treated water back down the casing and through every fixture so the whole system is dosed. Use plain unscented household bleach (sodium hypochlorite, about 5 to 8.25%) - this simplified count ignores the slight bleach specific gravity, so round up. The local health department and state well code govern the required procedure and the bacteriological clearance.",
  };
}
const wellShockExample = { inputs: { casing_diameter_in: 6, water_column_ft: 100, target_ppm: 100, bleach_pct: 6 } };
DISINFECT_RENDERERS["well-shock-chlorination"] = _simpleRenderer({
  citation: "Citation: AWWA A100 / state private-well shock-chlorination guidance (by name) - target concentrations of roughly 50 to 200 ppm held overnight, then pumped to waste and retested; 0.0408 gal per ft per in^2, 8.34 lb per gallon. Plain unscented household bleach; the local health department governs.",
  example: wellShockExample.inputs,
  fields: [
    { key: "casing_diameter_in", label: "Casing inside diameter (in)", kind: "number" },
    { key: "water_column_ft", label: "Standing water column (ft)", kind: "number" },
    { key: "target_ppm", label: "Target concentration (ppm)", kind: "number", default: 100 },
    { key: "bleach_pct", label: "Bleach available chlorine (%)", kind: "number", default: 6 },
  ],
  outputs: [
    { key: "v", id: "wsc-out-v", label: "Well water volume", value: (r) => fmt(r.well_volume_gal, 0) + " gal" },
    { key: "c", id: "wsc-out-c", label: "Available (100%) chlorine", value: (r) => fmt(r.available_cl_lb, 3) + " lb" },
    { key: "b", id: "wsc-out-b", label: "Bleach to add", value: (r) => r.bleach_gal >= 1 ? fmt(r.bleach_gal, 2) + " gal" : (r.bleach_qt >= 1 ? fmt(r.bleach_qt, 2) + " qt (" + fmt(r.bleach_gal, 3) + " gal)" : fmt(r.bleach_floz, 0) + " fl oz (" + fmt(r.bleach_gal, 3) + " gal)") },
    { key: "n", id: "wsc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWellShockChlorination,
});
