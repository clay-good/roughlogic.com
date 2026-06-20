// Group C (cont.): HVAC field-service bench.
// spec-v102 establishes this new lazy-loaded renderer module for the
// field-service and startup/recovery numbers a tech needs at the unit,
// relieving the standing calc-hvac.js cap watch instead of bumping that
// module again. Every tile keeps group: "C" (a tile's group letter is
// independent of the module that holds it -- the v28/v70..v100 split
// precedent). Tiles:
//   v102 condensate-drain, recovery-cylinder
// Both GOVERNANCE.general field-service arithmetic (the code and the
// equipment data govern). See spec-v102.md.

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

export const HVACSERVICE_RENDERERS = {};

// ===================== spec-v102: condensate rate, drain size, slope =====================

const _PINTS_PER_GAL = 8;
function _condensateDrainSize(tons) {
  if (tons <= 20) return 0.75;
  if (tons <= 40) return 1.0;
  if (tons <= 90) return 1.25;
  if (tons <= 125) return 1.5;
  return 2.0;
}
// dims: in { tons: dimensionless, pints_per_ton_hr: dimensionless, run_ft: L, slope_in_per_ft: dimensionless } out: { rate_pints_hr: dimensionless, rate_gph: dimensionless, min_size_in: L, fall_in: L }
export function computeCondensateDrain({ tons = 0, pints_per_ton_hr = 3, run_ft = 0, slope_in_per_ft = 0.125 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (run_ft < 0 || slope_in_per_ft < 0) return { error: "Run and slope must be non-negative." };
  if (!(tons > 0)) return { error: "Cooling capacity must be positive (tons)." };
  if (!(pints_per_ton_hr > 0)) return { error: "Condensate rate must be positive (pints per ton-hour)." };
  const rate_pints_hr = tons * pints_per_ton_hr;
  const rate_gph = rate_pints_hr / _PINTS_PER_GAL;
  const min_size_in = _condensateDrainSize(tons);
  const fall_in = run_ft * slope_in_per_ft;
  return {
    rate_pints_hr, rate_gph, min_size_in, fall_in,
    note: "Condensate production tracks the LATENT load and indoor humidity - the per-ton rate here is a field estimate (about 2 to 4 pints per ton-hour is common in humid cooling), not a code value. The drain-size steps come from IMC 307.2.2 by equipment capacity; the line slopes not less than 1/8 in per foot toward the discharge (IMC 307.2.5). A draw-through coil needs a proper trap to break the negative pressure. The AHJ and the equipment manual govern.",
  };
}
const condensateDrainExample = { inputs: { tons: 3, pints_per_ton_hr: 3, run_ft: 20, slope_in_per_ft: 0.125 } };
HVACSERVICE_RENDERERS["condensate-drain"] = _simpleRenderer({
  citation: "Citation: IMC 307.2.2 condensate drain-size-by-capacity steps and the 307.2.5 not-less-than-1/8-in-per-foot slope (by name); 8 pints per gallon. The per-ton condensate rate is an editable field estimate, not a code value.",
  example: condensateDrainExample.inputs,
  fields: [
    { key: "tons", label: "Cooling capacity (tons)", kind: "number" },
    { key: "pints_per_ton_hr", label: "Condensate rate (pints/ton-hr)", kind: "number", default: 3 },
    { key: "run_ft", label: "Horizontal run (ft)", kind: "number", default: 0 },
    { key: "slope_in_per_ft", label: "Slope (in/ft)", kind: "number", default: 0.125 },
  ],
  outputs: [
    { key: "p", id: "cd-out-p", label: "Condensate rate", value: (r) => fmt(r.rate_pints_hr, 1) + " pints/hr" },
    { key: "g", id: "cd-out-g", label: "Condensate rate", value: (r) => fmt(r.rate_gph, 3) + " gph" },
    { key: "s", id: "cd-out-s", label: "Minimum drain size", value: (r) => fmt(r.min_size_in, 2) + " in" },
    { key: "f", id: "cd-out-f", label: "Fall over run", value: (r) => fmt(r.fall_in, 2) + " in" },
    { key: "n", id: "cd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCondensateDrain,
});

// ===================== spec-v102: recovery-cylinder 80% fill =====================

const _WATER_LB_PER_GAL = 8.34;
// dims: in { water_capacity_lb: M, refrig_density_lb_gal: dimensionless, current_net_lb: M, fill_fraction: dimensionless } out: { specific_gravity: dimensionless, max_net_lb: M, remaining_lb: M, pct_full: dimensionless }
export function computeRecoveryCylinder({ water_capacity_lb = 0, refrig_density_lb_gal = 0, current_net_lb = 0, fill_fraction = 0.8 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (current_net_lb < 0) return { error: "Current charge must be non-negative." };
  if (!(water_capacity_lb > 0)) return { error: "Cylinder water capacity (WC) must be positive (lb)." };
  if (!(refrig_density_lb_gal > 0)) return { error: "Refrigerant liquid density must be positive (lb/gal)." };
  if (!(fill_fraction > 0 && fill_fraction <= 1)) return { error: "Fill fraction must be in (0, 1]." };
  const specific_gravity = refrig_density_lb_gal / _WATER_LB_PER_GAL;
  const max_net_lb = fill_fraction * water_capacity_lb * specific_gravity;
  const remaining_lb = Math.max(0, max_net_lb - current_net_lb);
  const pct_full = current_net_lb / max_net_lb * 100;
  const action = current_net_lb >= max_net_lb ? "do not fill" : "ok to fill";
  return {
    specific_gravity, max_net_lb, remaining_lb, pct_full, action,
    note: "The 80% rule leaves room for liquid expansion with temperature - never fill past it. Water capacity (WC) and tare are stamped on the cylinder, and the NET refrigerant is the gross on the scale minus the tare. Liquid density varies with refrigerant and temperature, so read it from the property sheet. Never mix refrigerants in a recovery cylinder, and use only a cylinder rated and in-date for recovery. EPA Section 608 governs handling.",
  };
}
const recoveryCylinderExample = { inputs: { water_capacity_lb: 50, refrig_density_lb_gal: 9.0, current_net_lb: 30, fill_fraction: 0.8 } };
HVACSERVICE_RENDERERS["recovery-cylinder"] = _simpleRenderer({
  citation: "Citation: DOT / AHRI 700 / EPA Section 608 recovery-cylinder practice (by name) - the 80% maximum fill, the stamped water-capacity (WC) and tare basis, and the never-mix-refrigerants rule; 8.34 lb per gallon water basis for specific gravity.",
  example: recoveryCylinderExample.inputs,
  fields: [
    { key: "water_capacity_lb", label: "Cylinder water capacity WC (lb)", kind: "number" },
    { key: "refrig_density_lb_gal", label: "Refrigerant liquid density (lb/gal)", kind: "number" },
    { key: "current_net_lb", label: "Refrigerant already in (net lb)", kind: "number", default: 0 },
    { key: "fill_fraction", label: "Max fill fraction", kind: "number", default: 0.8 },
  ],
  outputs: [
    { key: "m", id: "rc-out-m", label: "Max net at fill limit", value: (r) => fmt(r.max_net_lb, 1) + " lb" },
    { key: "r", id: "rc-out-r", label: "Remaining capacity", value: (r) => fmt(r.remaining_lb, 1) + " lb" },
    { key: "p", id: "rc-out-p", label: "Percent full", value: (r) => fmt(r.pct_full, 1) + "%" },
    { key: "a", id: "rc-out-a", label: "Action", value: (r) => r.action },
    { key: "n", id: "rc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRecoveryCylinder,
});
