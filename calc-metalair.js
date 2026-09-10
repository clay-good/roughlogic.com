// =====================================================================
// calc-metalair.js - spec-v30 metal / air / refrigerant trades bench.
//
// Three first-principles, hand-verifiable tiles off the spec-v28 §7
// roadmap (v30 = §7.4-7.6, "the metal/air/refrigerant benches"):
//   - groove-weld-strength (Group E)        AWS D1.1 / AISC 360 §J2 (§7.4)
//   - duct-static-pressure-total (Group C)   ACCA Manual D ESP roll-up (§7.5)
//   - compression-ratio-refrig (Group C)     ASHRAE absolute pressure ratio (§7.6)
//
// Group letters are independent of the module (the spec-v28/v29 precedent).
// These land in a dedicated module because calc-construction.js (93.9%) and
// calc-hvac.js (95.9%) - the natural homes for the weld and HVAC tiles - are
// both at their size caps and flagged "plan a split". Pure exported compute
// functions (no DOM in the compute layer) plus their renderers and the
// METALAIR_RENDERERS map, mirroring every other calc-*.js module.
//
// Scoped, like v29, to math that is hand-verifiable to the last digit: the
// groove-weld shear case (the unambiguous AISC Table J2.5 0.60*FEXX line, same
// resistance factors the v27 fillet tile uses), a pressure-drop SUM, and a
// gauge-to-absolute pressure ratio. No code-table transcription.
// =====================================================================

import {
  DEBOUNCE_MS, debounce, makeNumber, makeTextarea, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

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

// Compact renderer factory, copied verbatim from calc-masonry.js (same
// ui-fields imports) per the new-module convention; only the inner render
// function's name differs, so the schema-coverage gates read it unchanged.
function _simpleRenderer(spec) {
  const _maRender = function (inputRegion, outputRegion, citationEl) {
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

  _maRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _maRender;
}

export const METALAIR_RENDERERS = {};

// Electrode classification minimum tensile strength FEXX (ksi).
const _FEXX = { E60: 60, E70: 70, E80: 80, E90: 90, E100: 100, E110: 110 };

// ---------------------------------------------------------------------
// 30.1 Groove weld strength (groove-weld-strength) - AWS D1.1 / AISC 360 §J2
// ---------------------------------------------------------------------
// dims: in { weld_type: dimensionless, effective_throat_in: L, base_thickness_in: L, length_in: L, applied_load_lb: dimensionless, electrode: dimensionless } out: { throat_in: L, capacity_lb: dimensionless, utilization: dimensionless }
export function computeGrooveWeldStrength({ weld_type = "PJP", effective_throat_in = 0, base_thickness_in = 0, length_in = 0, electrode = "E70", method = "ASD", applied_load_lb = 0 } = {}) {
  const _g = _finiteGuard({ effective_throat_in, base_thickness_in, length_in, applied_load_lb }); if (_g) return _g;
  const Fexx = _FEXX[electrode] || 70;
  const L = Number(length_in);
  const M = String(method) === "LRFD" ? "LRFD" : "ASD";
  const type = String(weld_type).toUpperCase() === "CJP" ? "CJP" : "PJP";
  if (!(L > 0)) return { error: "Weld length must be positive (in)." };
  // Effective throat: CJP develops the thinner connected part; PJP uses the
  // user-supplied effective throat read off the qualified WPS (AWS D1.1 Table).
  let throat_in;
  if (type === "CJP") {
    throat_in = Number(base_thickness_in);
    if (!(throat_in > 0)) return { error: "For a CJP weld, enter the thinner part thickness (in)." };
  } else {
    throat_in = Number(effective_throat_in);
    if (!(throat_in > 0)) return { error: "For a PJP weld, enter the effective throat (in)." };
  }
  // AISC 360 Table J2.5, weld-metal shear: nominal Fnw = 0.60*FEXX.
  // ASD allowable 0.60*FEXX/2.00 = 0.30*FEXX; LRFD design 0.75*0.60*FEXX.
  const stress_ksi = M === "LRFD" ? 0.75 * 0.60 * Fexx : 0.30 * Fexx;
  const strength_per_in_lb = stress_ksi * 1000 * throat_in;
  const capacity_lb = strength_per_in_lb * L;
  let utilization = null;
  const load = Number(applied_load_lb) || 0;
  if (load > 0) utilization = load / capacity_lb;
  const notes = [];
  notes.push(M + " basis: weld-metal shear at " + fmt(stress_ksi, 2) + " ksi on the " + fmt(throat_in, 3) + " in effective throat (" + electrode + ").");
  if (type === "CJP") notes.push("A CJP groove weld with matching filler develops the full strength of the base metal in tension and compression normal to the weld axis; the shear capacity shown governs only the shear case (AISC J2.4).");
  else notes.push("Read the PJP effective throat off the qualified WPS (it is the groove depth less the AWS D1.1 Table 3.1 reduction, not the joint thickness).");
  notes.push("The qualified WPS, the weld inspector, and the engineer of record govern.");
  return { weld_type: type, method: M, electrode, F_Exx_ksi: Fexx, throat_in, stress_ksi, strength_per_in_lb, capacity_lb, length_in: L, utilization, notes };
}
export const grooveWeldStrengthExample = { inputs: { weld_type: "PJP", effective_throat_in: 0.25, length_in: 6, electrode: "E70", method: "LRFD" } };

function _renderGrooveWeldStrength(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Groove weld (CJP / PJP) shear capacity - the AISC 360 Table J2.5 weld-metal shear strength 0.60*FEXX on the effective throat (ASD allowable 0.30*FEXX, LRFD design 0.75*0.60*FEXX) - per AWS D1.1 Structural Welding Code and AISC 360 §J2, by name; first-principles. A CJP weld with matching filler develops the base metal in tension/compression; the PJP effective throat is read off the qualified WPS. The WPS, inspector, and engineer of record govern. Complements the fillet-weld-strength tile.";
  const type = makeSelect("Weld type", "gw-type", [
    { value: "PJP", label: "PJP (partial penetration)", selected: true }, { value: "CJP", label: "CJP (complete penetration)" },
  ]);
  const throat = makeNumber("Effective throat (in, PJP)", "gw-throat", { step: "any", min: "0" });
  const base = makeNumber("Thinner part thickness (in, CJP)", "gw-base", { step: "any", min: "0" });
  const len = makeNumber("Weld length (in)", "gw-len", { step: "any", min: "0" });
  const elec = makeSelect("Electrode (FEXX)", "gw-elec", [
    { value: "E60", label: "E60" }, { value: "E70", label: "E70", selected: true },
    { value: "E80", label: "E80" }, { value: "E90", label: "E90" }, { value: "E100", label: "E100" }, { value: "E110", label: "E110" },
  ]);
  const method = makeSelect("Method", "gw-method", [
    { value: "ASD", label: "ASD (allowable)", selected: true }, { value: "LRFD", label: "LRFD (design)" },
  ]);
  const load = makeNumber("Applied load (lb, optional)", "gw-load", { step: "any", min: "0" });
  for (const f of [type, throat, base, len, elec, method, load]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { type.select.value = "PJP"; throat.input.value = "0.25"; base.input.value = ""; len.input.value = "6"; elec.select.value = "E70"; method.select.value = "LRFD"; load.input.value = ""; update(); });
  const oCap = makeOutputLine(outputRegion, "Shear capacity", "gw-out-cap");
  const oThroat = makeOutputLine(outputRegion, "Effective throat / unit strength", "gw-out-throat");
  const oUtil = makeOutputLine(outputRegion, "Utilization", "gw-out-util");
  const oNote = makeOutputLine(outputRegion, "Notes", "gw-out-note");
  const update = debounce(() => {
    const r = computeGrooveWeldStrength({ weld_type: type.select.value, effective_throat_in: Number(throat.input.value) || 0, base_thickness_in: Number(base.input.value) || 0, length_in: Number(len.input.value) || 0, electrode: elec.select.value, method: method.select.value, applied_load_lb: Number(load.input.value) || 0 });
    if (r.error) { oCap.textContent = r.error; oThroat.textContent = "-"; oUtil.textContent = "-"; oNote.textContent = ""; return; }
    oCap.textContent = fmt(r.capacity_lb, 0) + " lb (" + r.method + ", " + r.electrode + ")";
    oThroat.textContent = fmt(r.throat_in, 3) + " in throat; " + fmt(r.strength_per_in_lb, 0) + " lb per in";
    oUtil.textContent = r.utilization === null ? "(enter an applied load)" : (fmt(r.utilization * 100, 1) + "% - " + (r.utilization <= 1 ? "OK" : "OVERSTRESSED"));
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [throat.input, base.input, len.input, load.input]) f.addEventListener("input", update);
  for (const s of [type.select, elec.select, method.select]) s.addEventListener("change", update);
}
METALAIR_RENDERERS["groove-weld-strength"] = _renderGrooveWeldStrength;

// groove-weld-length-for-load: inverse of groove-weld-strength. The forward tile gives the shear capacity from the weld
// length; the inverse recovers the weld length an applied load needs at a given effective throat, so a detailer sizes the
// weld run. From capacity = stress_ksi x 1000 x throat x L (stress_ksi = 0.30 FEXX ASD or 0.75 x 0.60 FEXX LRFD),
// L = load / (stress_ksi x 1000 x throat). CJP uses the thinner-part thickness as the throat; PJP uses the WPS effective throat.
// dims: in { applied_load_lb: dimensionless, weld_type: dimensionless, effective_throat_in: L, base_thickness_in: L, electrode: dimensionless, method: dimensionless } out: { required_length_in: L, stress_ksi: dimensionless, throat_in: L }
export function computeGrooveWeldLengthForLoad({ applied_load_lb = 0, weld_type = "PJP", effective_throat_in = 0, base_thickness_in = 0, electrode = "E70", method = "ASD" } = {}) {
  const _g = _finiteGuard({ applied_load_lb, effective_throat_in, base_thickness_in }); if (_g) return _g;
  const Fexx = _FEXX[electrode] || 70;
  const M = String(method) === "LRFD" ? "LRFD" : "ASD";
  const type = String(weld_type).toUpperCase() === "CJP" ? "CJP" : "PJP";
  const load = Number(applied_load_lb) || 0;
  if (!(load > 0)) return { error: "Applied load must be positive (lb)." };
  let throat_in;
  if (type === "CJP") {
    throat_in = Number(base_thickness_in);
    if (!(throat_in > 0)) return { error: "For a CJP weld, enter the thinner part thickness (in)." };
  } else {
    throat_in = Number(effective_throat_in);
    if (!(throat_in > 0)) return { error: "For a PJP weld, enter the effective throat (in)." };
  }
  const stress_ksi = M === "LRFD" ? 0.75 * 0.60 * Fexx : 0.30 * Fexx;
  const strength_per_in_lb = stress_ksi * 1000 * throat_in;
  const required_length_in = load / strength_per_in_lb;
  if (![required_length_in, stress_ksi, throat_in].every(Number.isFinite)) return { error: "Weld-length math is not a finite value." };
  const notes = [];
  notes.push(M + " basis: weld-metal shear at " + fmt(stress_ksi, 2) + " ksi on the " + fmt(throat_in, 3) + " in effective throat (" + electrode + "), " + fmt(strength_per_in_lb, 0) + " lb per in.");
  notes.push("Round UP and split the length between the two sides of the joint where the detail allows; add for weld returns and any minimum-length or minimum-size rule (AWS D1.1). ");
  if (type === "CJP") notes.push("A CJP groove weld with matching filler develops the base metal in tension/compression; this shear length governs only the shear case (AISC J2.4).");
  else notes.push("Read the PJP effective throat off the qualified WPS (the groove depth less the AWS D1.1 Table 3.1 reduction, not the joint thickness).");
  notes.push("The qualified WPS, the weld inspector, and the engineer of record govern.");
  return { required_length_in, stress_ksi, throat_in, strength_per_in_lb, weld_type: type, method: M, electrode, F_Exx_ksi: Fexx, notes };
}
export const grooveWeldLengthForLoadExample = { inputs: { applied_load_lb: 100000, weld_type: "PJP", effective_throat_in: 0.25, electrode: "E70", method: "LRFD" } };

function _renderGrooveWeldLengthForLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Groove weld (CJP / PJP) shear capacity (AISC 360 Table J2.5 weld-metal shear 0.60*FEXX on the effective throat; ASD 0.30*FEXX, LRFD 0.75*0.60*FEXX) solved for the length: L = load / (stress_ksi x 1000 x throat), per AWS D1.1 and AISC 360 §J2, by name. The WPS, inspector, and engineer of record govern.";
  const type = makeSelect("Weld type", "gwl-type", [
    { value: "PJP", label: "PJP (partial penetration)", selected: true }, { value: "CJP", label: "CJP (complete penetration)" },
  ]);
  const load = makeNumber("Applied load (lb)", "gwl-load", { step: "any", min: "0" });
  const throat = makeNumber("Effective throat (in, PJP)", "gwl-throat", { step: "any", min: "0" });
  const base = makeNumber("Thinner part thickness (in, CJP)", "gwl-base", { step: "any", min: "0" });
  const elec = makeSelect("Electrode (FEXX)", "gwl-elec", [
    { value: "E60", label: "E60" }, { value: "E70", label: "E70", selected: true },
    { value: "E80", label: "E80" }, { value: "E90", label: "E90" }, { value: "E100", label: "E100" }, { value: "E110", label: "E110" },
  ]);
  const method = makeSelect("Method", "gwl-method", [
    { value: "ASD", label: "ASD (allowable)", selected: true }, { value: "LRFD", label: "LRFD (design)" },
  ]);
  for (const f of [type, load, throat, base, elec, method]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { type.select.value = "PJP"; load.input.value = "100000"; throat.input.value = "0.25"; base.input.value = ""; elec.select.value = "E70"; method.select.value = "LRFD"; update(); });
  const oL = makeOutputLine(outputRegion, "Required weld length", "gwl-out-l");
  const oU = makeOutputLine(outputRegion, "Effective throat / unit strength", "gwl-out-u");
  const oNote = makeOutputLine(outputRegion, "Notes", "gwl-out-note");
  const update = debounce(() => {
    const r = computeGrooveWeldLengthForLoad({ weld_type: type.select.value, applied_load_lb: Number(load.input.value) || 0, effective_throat_in: Number(throat.input.value) || 0, base_thickness_in: Number(base.input.value) || 0, electrode: elec.select.value, method: method.select.value });
    if (r.error) { oL.textContent = r.error; oU.textContent = "-"; oNote.textContent = ""; return; }
    oL.textContent = fmt(r.required_length_in, 2) + " in (" + r.method + ", " + r.electrode + ")";
    oU.textContent = fmt(r.throat_in, 3) + " in throat; " + fmt(r.strength_per_in_lb, 0) + " lb per in";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [load.input, throat.input, base.input]) f.addEventListener("input", update);
  for (const s of [type.select, elec.select, method.select]) s.addEventListener("change", update);
}
METALAIR_RENDERERS["groove-weld-length-for-load"] = _renderGrooveWeldLengthForLoad;

// ---------------------------------------------------------------------
// 30.2 Total external static pressure (duct-static-pressure-total) - Manual D
// ---------------------------------------------------------------------
// dims: in { components: dimensionless, rated_esp_in_wc: dimensionless } out: { total_esp_in_wc: dimensionless, remaining_in_wc: dimensionless }
export function computeDuctStaticTotal({ components = [], rated_esp_in_wc = 0 } = {}) {
  const _g = _finiteGuard({ rated_esp_in_wc }); if (_g) return _g;
  if (!Array.isArray(components) || components.length === 0) return { error: "Enter at least one component pressure drop (in. w.c.)." };
  let total_esp_in_wc = 0;
  const breakdown = [];
  for (const c of components) {
    const drop = Number(c && c.drop_in_wc);
    if (!Number.isFinite(drop) || drop < 0) return { error: "Each component drop must be a non-negative number (in. w.c.)." };
    total_esp_in_wc += drop;
    breakdown.push({ label: String((c && c.label) || "component"), drop_in_wc: drop });
  }
  const rated = Number(rated_esp_in_wc) || 0;
  let remaining_in_wc = null, within_rating = null;
  if (rated > 0) { remaining_in_wc = rated - total_esp_in_wc; within_rating = total_esp_in_wc <= rated; }
  const notes = [];
  if (within_rating === false) notes.push("Total external static " + fmt(total_esp_in_wc, 3) + " in. w.c. exceeds the blower rating (" + fmt(rated, 3) + " in. w.c.): airflow will fall below the rated CFM. Reduce restriction or select a higher-static blower tap.");
  notes.push("Total external static pressure is the sum of every external resistance the blower drives (registers, grilles, filter, wet coil, dampers, and the duct-run friction). Component drops are user-supplied from the manufacturer's tables or a manometer reading; the blower fan table governs the delivered CFM at this static.");
  return { total_esp_in_wc, rated_esp_in_wc: rated || null, remaining_in_wc, within_rating, breakdown, notes };
}
export const ductStaticTotalExample = { inputs: { components: [{ label: "filter", drop_in_wc: 0.10 }, { label: "supply registers", drop_in_wc: 0.03 }, { label: "return grille", drop_in_wc: 0.03 }, { label: "wet coil", drop_in_wc: 0.30 }, { label: "supply duct", drop_in_wc: 0.10 }, { label: "return duct", drop_in_wc: 0.08 }], rated_esp_in_wc: 0.50 } };

function _renderDuctStaticTotal(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Total external static pressure (TESP) roll-up - the sum of every external resistance the blower must overcome, checked against the blower fan table's rated static - per ACCA Manual D and the ASHRAE / SMACNA duct-design practice, by name; first-principles pressure accounting. Component drops are user-supplied from the manufacturer tables or a manometer; the blower fan table governs the delivered CFM.";
  const DEFAULT = "filter,0.10\nsupply registers,0.03\nreturn grille,0.03\nwet coil,0.30\nsupply duct,0.10\nreturn duct,0.08";
  const list = makeTextarea("Components: label,drop(in. w.c.) per line", "ds-list", { rows: "6" });
  list.input.value = DEFAULT;
  const rated = makeNumber("Blower rated ESP (in. w.c.)", "ds-rated", { step: "any", min: "0" });
  inputRegion.appendChild(list.wrap);
  inputRegion.appendChild(rated.wrap);
  attachExampleButton(inputRegion, () => { list.input.value = DEFAULT; rated.input.value = "0.50"; update(); });
  const oTotal = makeOutputLine(outputRegion, "Total external static", "ds-out-total");
  const oRem = makeOutputLine(outputRegion, "Remaining / verdict", "ds-out-rem");
  const oNote = makeOutputLine(outputRegion, "Notes", "ds-out-note");
  function parse(text) {
    const out = [];
    for (const raw of String(text).split("\n")) {
      const line = raw.trim(); if (!line) continue;
      const i = line.lastIndexOf(",");
      if (i < 0) return null;
      const label = line.slice(0, i).trim();
      const drop = Number(line.slice(i + 1).trim());
      if (!Number.isFinite(drop)) return null;
      out.push({ label, drop_in_wc: drop });
    }
    return out;
  }
  const update = debounce(() => {
    const components = parse(list.input.value);
    if (components === null) { oTotal.textContent = "Each line must be label,drop (a number)."; oRem.textContent = "-"; oNote.textContent = ""; return; }
    const r = computeDuctStaticTotal({ components, rated_esp_in_wc: Number(rated.input.value) || 0 });
    if (r.error) { oTotal.textContent = r.error; oRem.textContent = "-"; oNote.textContent = ""; return; }
    oTotal.textContent = fmt(r.total_esp_in_wc, 3) + " in. w.c. across " + r.breakdown.length + " components";
    oRem.textContent = r.remaining_in_wc === null ? "(enter the blower rating)" : (fmt(r.remaining_in_wc, 3) + " in. w.c. remaining - " + (r.within_rating ? "within rating" : "OVER rating"));
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [list.input, rated.input]) f.addEventListener("input", update);
}
METALAIR_RENDERERS["duct-static-pressure-total"] = _renderDuctStaticTotal;

// ---------------------------------------------------------------------
// 30.3 Compression ratio (compression-ratio-refrig) - ASHRAE Refrigeration
// ---------------------------------------------------------------------
// dims: in { suction_psig: M L^-1 T^-2, discharge_psig: M L^-1 T^-2, atmospheric_psia: M L^-1 T^-2 } out: { suction_psia: M L^-1 T^-2, discharge_psia: M L^-1 T^-2, compression_ratio: dimensionless }
export function computeCompressionRatio({ suction_psig = 0, discharge_psig = 0, atmospheric_psia = 14.696 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const atm = Number(atmospheric_psia);
  if (!(atm > 0)) return { error: "Atmospheric pressure must be positive (psia)." };
  const suction_psia = Number(suction_psig) + atm;
  const discharge_psia = Number(discharge_psig) + atm;
  if (!(suction_psia > 0)) return { error: "Suction absolute pressure must be positive (gauge above a full vacuum)." };
  if (!(discharge_psia >= suction_psia)) return { error: "Discharge pressure must be at or above suction pressure." };
  const compression_ratio = discharge_psia / suction_psia;
  const high_ratio = compression_ratio > 10;
  const notes = [];
  if (high_ratio) notes.push("Compression ratio " + fmt(compression_ratio, 2) + " exceeds about 10:1 - the single-stage limit where discharge temperature and volumetric-efficiency loss become a concern; consider two-stage or check for a restriction / low charge.");
  notes.push("Ratio is absolute discharge over absolute suction (gauge + atmospheric). Use the site atmospheric pressure at altitude, not 14.7, for an accurate ratio. The compressor manufacturer's envelope governs.");
  return { suction_psia, discharge_psia, compression_ratio, high_ratio, atmospheric_psia: atm, notes };
}
export const compressionRatioExample = { inputs: { suction_psig: 70, discharge_psig: 260, atmospheric_psia: 14.696 } };

function _renderCompressionRatio(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Refrigeration compression ratio = absolute discharge pressure / absolute suction pressure (gauge + atmospheric) - per the ASHRAE Handbook Refrigeration compressor-performance fundamentals, by name; first-principles. Use the site atmospheric pressure at altitude for accuracy; about 10:1 is the single-stage concern threshold. The compressor manufacturer's operating envelope governs.";
  const suc = makeNumber("Suction pressure (psig)", "cr-suc", { step: "any" });
  const dis = makeNumber("Discharge pressure (psig)", "cr-dis", { step: "any" });
  const atm = makeNumber("Atmospheric pressure (psia)", "cr-atm", { step: "any", min: "0", value: "14.696" });
  atm.input.value = "14.696";
  for (const f of [suc, dis, atm]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { suc.input.value = "70"; dis.input.value = "260"; atm.input.value = "14.696"; update(); });
  const oRatio = makeOutputLine(outputRegion, "Compression ratio", "cr-out-ratio");
  const oAbs = makeOutputLine(outputRegion, "Absolute pressures", "cr-out-abs");
  const oNote = makeOutputLine(outputRegion, "Notes", "cr-out-note");
  const update = debounce(() => {
    const r = computeCompressionRatio({ suction_psig: Number(suc.input.value) || 0, discharge_psig: Number(dis.input.value) || 0, atmospheric_psia: Number(atm.input.value) || 0 });
    if (r.error) { oRatio.textContent = r.error; oAbs.textContent = "-"; oNote.textContent = ""; return; }
    oRatio.textContent = fmt(r.compression_ratio, 2) + " : 1" + (r.high_ratio ? " (HIGH)" : "");
    oAbs.textContent = "suction " + fmt(r.suction_psia, 1) + " psia, discharge " + fmt(r.discharge_psia, 1) + " psia";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [suc.input, dis.input, atm.input]) f.addEventListener("input", update);
}
METALAIR_RENDERERS["compression-ratio-refrig"] = _renderCompressionRatio;

// ===================== spec-v916: duct transition (reducer) length from slope =====================
// dims: in { large_dim_in: L, small_dim_in: L, slope_deg: dimensionless } out: { length_concentric_in: L, length_eccentric_in: L, slope_ratio: dimensionless }
export function computeDuctTransitionLength({ large_dim_in = 20, small_dim_in = 12, slope_deg = 15 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(large_dim_in > 0)) return { error: "Large dimension must be positive (in)." };
  if (!(small_dim_in > 0)) return { error: "Small dimension must be positive (in)." };
  if (!(large_dim_in > small_dim_in)) return { error: "Large dimension must exceed the small dimension." };
  if (!(slope_deg > 0 && slope_deg < 90)) return { error: "Slope must be between 0 and 90 degrees (per side)." };
  const tan = Math.tan(slope_deg * Math.PI / 180);
  // Concentric splits the size change to both sides (offset per side = (large - small)/2);
  // eccentric (one flat side) takes the full change on one side, so twice the length for the same slope.
  const length_concentric_in = ((large_dim_in - small_dim_in) / 2) / tan;
  const length_eccentric_in = (large_dim_in - small_dim_in) / tan;
  const slope_ratio = 1 / tan;
  if (![length_concentric_in, length_eccentric_in, slope_ratio].every(Number.isFinite)) return { error: "Transition-length math is not a finite value." };
  return {
    length_concentric_in,
    length_eccentric_in,
    slope_ratio,
    note: "The length a duct size change needs to hold a target transition slope. SMACNA keeps the slope shallow -- about 15 degrees per side (roughly a 4:1 run-to-offset ratio) -- to limit turbulence and pressure loss; a steeper transition is shorter but noisier and higher-drop. A concentric transition splits the change to both sides (offset per side = (large - small)/2); an eccentric (one flat side) takes the full change on one side and needs twice the length for the same slope. On a rectangular duct the larger of the width and height changes sets the piece length. The SMACNA duct-construction standards and the system pressure loss govern.",
  };
}

export const ductTransitionLengthExample = { inputs: { large_dim_in: 20, small_dim_in: 12, slope_deg: 15 } };

function _renderDuctTransitionLength(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: duct transition length by name. concentric length = ((large - small)/2) / tan(slope); eccentric length = (large - small) / tan(slope). SMACNA keeps the slope near 15 degrees per side (~4:1) to limit turbulence; the SMACNA standards and the pressure loss govern.";
  const lg = makeNumber("Large end dimension (in)", "dtl-lg", { step: "any", min: "0" });
  const sm = makeNumber("Small end dimension (in)", "dtl-sm", { step: "any", min: "0" });
  const sl = makeNumber("Transition slope (deg per side)", "dtl-sl", { step: "any", min: "0" });
  for (const f of [lg, sm, sl]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { lg.input.value = "20"; sm.input.value = "12"; sl.input.value = "15"; update(); });
  const oConc = makeOutputLine(outputRegion, "Concentric length", "dtl-out-c");
  const oEcc = makeOutputLine(outputRegion, "Eccentric (one flat side) length", "dtl-out-e");
  const oRatio = makeOutputLine(outputRegion, "Run-to-offset ratio", "dtl-out-r");
  const update = debounce(() => {
    const r = computeDuctTransitionLength({
      large_dim_in: lg.input.value === "" ? 20 : Number(lg.input.value), small_dim_in: sm.input.value === "" ? 12 : Number(sm.input.value),
      slope_deg: sl.input.value === "" ? 15 : Number(sl.input.value),
    });
    if (r.error) { oConc.textContent = r.error; oEcc.textContent = "-"; oRatio.textContent = "-"; return; }
    oConc.textContent = fmt(r.length_concentric_in, 2) + " in";
    oEcc.textContent = fmt(r.length_eccentric_in, 2) + " in";
    oRatio.textContent = fmt(r.slope_ratio, 2) + " : 1 (run : offset per side)";
  }, DEBOUNCE_MS);
  for (const f of [lg, sm, sl]) f.input.addEventListener("input", update);
}
METALAIR_RENDERERS["duct-transition-length"] = _renderDuctTransitionLength;

// ===================== spec-v960: duct static regain at a velocity decrease =====================
// dims: in { args: dimensionless } out: { vp_upstream_inwc: dimensionless, vp_downstream_inwc: dimensionless, static_regain_inwc: dimensionless }
export function computeDuctStaticRegain({ upstream_velocity_fpm = 2000, downstream_velocity_fpm = 1500, recovery_factor = 0.75 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(upstream_velocity_fpm > 0)) return { error: "Upstream velocity must be positive (fpm)." };
  if (!(downstream_velocity_fpm > 0)) return { error: "Downstream velocity must be positive (fpm)." };
  if (!(recovery_factor >= 0 && recovery_factor <= 1)) return { error: "Recovery factor must be between 0 and 1." };
  // Velocity pressure VP = (V/4005)^2 (standard air); static regain = R x (VP_upstream - VP_downstream).
  const vp_upstream_inwc = Math.pow(upstream_velocity_fpm / 4005, 2);
  const vp_downstream_inwc = Math.pow(downstream_velocity_fpm / 4005, 2);
  const static_regain_inwc = recovery_factor * (vp_upstream_inwc - vp_downstream_inwc);
  if (![vp_upstream_inwc, vp_downstream_inwc, static_regain_inwc].every(Number.isFinite)) return { error: "Static-regain math is not a finite value." };
  return {
    vp_upstream_inwc,
    vp_downstream_inwc,
    static_regain_inwc,
    is_loss: static_regain_inwc < 0,
    note: "The static pressure a duct RECOVERS when the air slows down at a size increase -- the basis of the static-regain duct-design method. Velocity pressure is VP = (V/4005)^2 in inches of water for standard air (the 4005 is the sea-level, 0.075 lb/ft^3 velocity-pressure constant), and when a larger downstream duct drops the velocity, part of that lost velocity pressure converts back to STATIC pressure: static regain = R x (VP_upstream - VP_downstream), with a recovery factor R commonly 0.75 (about 0.5 to 0.9 depending on the fitting quality and the transition angle). Dropping from 2,000 to 1,500 fpm (VP 0.249 to 0.140 in) at R = 0.75 regains about 0.082 in w.c. -- pressure the next run does not need the fan to provide. The static-regain method sizes each downstream section so its regain offsets its friction loss, holding static pressure nearly constant along the trunk. If the velocity INCREASES (a smaller downstream duct), the result is negative -- a static LOSS, not a regain (flagged). The 4005 constant assumes standard air, so altitude and temperature shift it; the recovery factor depends on the actual fitting, and SMACNA / ASHRAE and the engineer of record govern the design.",
  };
}

export const ductStaticRegainExample = { inputs: { upstream_velocity_fpm: 2000, downstream_velocity_fpm: 1500, recovery_factor: 0.75 } };

function _v960renderDuctStaticRegain(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: duct static-regain method, by name (SMACNA / ASHRAE Fundamentals). VP = (V/4005)^2 in w.c. (standard air); static regain = R x (VP_upstream - VP_downstream), recovery factor R ~ 0.75 (0.5-0.9). The 4005 constant assumes standard air (altitude/temperature shift it); the fitting quality sets R, and SMACNA/ASHRAE and the engineer govern.";
  const uv = makeNumber("Upstream velocity (fpm)", "dsr-uv", { step: "any", min: "0" });
  const dv = makeNumber("Downstream velocity (fpm)", "dsr-dv", { step: "any", min: "0" });
  const rf = makeNumber("Recovery factor (0-1, ~0.75)", "dsr-rf", { step: "any", min: "0" });
  for (const f of [uv, dv, rf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { uv.input.value = "2000"; dv.input.value = "1500"; rf.input.value = "0.75"; update(); });
  const oR = makeOutputLine(outputRegion, "Static regain", "dsr-out-r");
  const oV = makeOutputLine(outputRegion, "Velocity pressure up / down", "dsr-out-v");
  const update = debounce(() => {
    const r = computeDuctStaticRegain({
      upstream_velocity_fpm: uv.input.value === "" ? 2000 : Number(uv.input.value), downstream_velocity_fpm: dv.input.value === "" ? 1500 : Number(dv.input.value),
      recovery_factor: rf.input.value === "" ? 0.75 : Number(rf.input.value),
    });
    if (r.error) { oR.textContent = r.error; oV.textContent = "-"; return; }
    oR.textContent = fmt(r.static_regain_inwc, 4) + " in w.c." + (r.is_loss ? " (a static LOSS -- velocity increased)" : " recovered");
    oV.textContent = fmt(r.vp_upstream_inwc, 4) + " / " + fmt(r.vp_downstream_inwc, 4) + " in w.c.";
  }, DEBOUNCE_MS);
  for (const f of [uv, dv, rf]) f.input.addEventListener("input", update);
}
METALAIR_RENDERERS["duct-static-regain"] = _v960renderDuctStaticRegain;

// ===========================================================================
// spec-v1679, v1681, v1682: the 2026-09-08 trade-expansion sheet metal and
// architectural metal band. Three tiles, all group E.
//
// spec-v1680 gored-elbow-angles WAS CUT: `pipe-miter-cut` in calc-fab.js
// already computes the identical miter geometry -- turn per joint = total /
// (pieces - 1), cut angle half of that from square, cutback = OD x tan -- and
// its note already carries the end-half-gore rule that spec-v1680 calls "the
// whole trick". What that tile lacked is the THROAT and HEEL lengths and the
// developed material, so those landed there instead.

// ============ spec-v1679: square-to-round transition development ============

// dims: in { square_side_in: L, round_diameter_in: L, height_in: L, offset_in: L, elements_per_quadrant: dimensionless, seam_allowance_in: L } out: { corner_true_length_in: L, midpoint_true_length_in: L, plan_corner_distance_in: L, circumference_in: L, developed_arc_in: L, sheet_width_in: L }
export function computeSquareToRoundDevelopment({ square_side_in = 0, round_diameter_in = 0, height_in = 0, offset_in = 0, elements_per_quadrant = 8, seam_allowance_in = 0.5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(square_side_in > 0)) return { error: "The square side must be positive (in)." };
  if (!(round_diameter_in > 0)) return { error: "The round diameter must be positive (in)." };
  if (!(height_in > 0)) return { error: "The transition height must be positive (in)." };
  if (offset_in < 0) return { error: "The offset between centres cannot be negative (in)." };
  if (!(elements_per_quadrant >= 2)) return { error: "Use at least two elements per quadrant; a curve cannot be triangulated with fewer." };
  if (seam_allowance_in < 0) return { error: "The seam allowance cannot be negative (in)." };
  const half_side = square_side_in / 2;
  const radius = round_diameter_in / 2;
  const n = Math.round(elements_per_quadrant);
  // Triangulation: every element line is sloped, so its plan view understates
  // it. The true length is the hypotenuse of the plan distance and the height.
  const trueLength = (planDistance) => Math.sqrt(planDistance * planDistance + height_in * height_in);
  // The corner element: from a square corner to the nearest point on the
  // circle, which sits on the 45 degree diagonal.
  const corner_x = half_side + offset_in;
  const corner_y = half_side;
  const diagonal = Math.sqrt(corner_x * corner_x + corner_y * corner_y);
  const circle_on_diagonal_x = radius * (corner_x / diagonal);
  const circle_on_diagonal_y = radius * (corner_y / diagonal);
  const plan_corner_distance_in = Math.hypot(corner_x - circle_on_diagonal_x, corner_y - circle_on_diagonal_y);
  const corner_true_length_in = trueLength(plan_corner_distance_in);
  // The midpoint element: from the middle of a square side straight to the
  // circle, which is the shortest element on a concentric transition.
  const plan_midpoint_distance_in = Math.abs(half_side - radius);
  const midpoint_true_length_in = trueLength(plan_midpoint_distance_in);
  // The longest element on the piece, which sets the sheet.
  const longest_true_length_in = Math.max(corner_true_length_in, midpoint_true_length_in);
  const understatement_pct = plan_corner_distance_in > 0 ? (corner_true_length_in / plan_corner_distance_in - 1) * 100 : null;
  // The check that costs a sheet rather than a fitting: the developed curved
  // edge is the sum of the chords across each element, and it must come back
  // to the circle's circumference. Too few elements and it lands short.
  const circumference_in = Math.PI * round_diameter_in;
  const total_elements = 4 * n;
  const chord_in = 2 * radius * Math.sin(Math.PI / total_elements);
  const developed_arc_in = chord_in * total_elements;
  const arc_shortfall_in = circumference_in - developed_arc_in;
  const arc_shortfall_pct = circumference_in > 0 ? arc_shortfall_in / circumference_in * 100 : 0;
  const sheet_width_in = square_side_in + 2 * seam_allowance_in;
  const sheet_length_in = 2 * longest_true_length_in + circumference_in / 2 + 2 * seam_allowance_in;
  const outs = [corner_true_length_in, midpoint_true_length_in, circumference_in, developed_arc_in, sheet_width_in];
  if (!outs.every(Number.isFinite)) return { error: "Transition development math is not a finite value." };
  return {
    square_side_in, round_diameter_in, height_in, offset_in, elements_per_quadrant: n,
    total_elements, plan_corner_distance_in, corner_true_length_in,
    plan_midpoint_distance_in, midpoint_true_length_in, longest_true_length_in,
    understatement_pct, circumference_in, chord_in, developed_arc_in,
    arc_shortfall_in, arc_shortfall_pct, seam_allowance_in, sheet_width_in, sheet_length_in,
    note: "Triangulation is the method and TRUE LENGTH is the only idea in it. Any line on a square-to-round that is neither vertical nor horizontal appears shorter in every orthogonal view than it really is, so laying out from plan dimensions produces a pattern too small and a fitting that will not close. The true length is the hypotenuse of the plan distance and the height, and on an ordinary transition it is far longer than the plan view suggests: a corner element measuring nine inches on the plan can be well over eighteen once the height is in it, which is the error the whole method exists to prevent. The pattern is then built by laying those triangles down in sequence, and the corner elements and the elements to the middle of each side are the two extremes that set everything between them. THE CIRCLE IS DIVIDED INTO ELEMENTS BECAUSE A CURVE CANNOT BE TRIANGULATED DIRECTLY, and the division is where accuracy is won or lost. Each element is developed as a straight chord, so the developed curved edge is a polygon inscribed in the circle and it is always SHORT of the true circumference. More elements close that gap and cost layout time; eight to sixteen per quadrant is common practice, and the shortfall at the entered count is reported here so the choice is made with a number rather than a habit. THE CHECK AT THE END IS WORTH DOING EVERY TIME. The developed pattern's curved edge, measured along its length, should come back to the circumference of the round end. If it does not, an element true length is wrong or the division was uneven -- and finding that on the bench costs a sheet, where finding it at the fitting costs the fitting and the crew. Everything after the development is allowances: seams, laps, and the metal thickness itself on a formed edge, which are added to the developed shape rather than being part of it. This gives the governing true lengths, the element chord, the circumference check, and the sheet the pattern needs. It does not draw the pattern or emit its coordinates, and it does not lay out an eccentric transition's unequal elements individually -- an offset makes every element different and the full development needs all of them. It does not compute bend allowance for the metal thickness and forming method, address stiffening, reinforcing, or the gauge required for the duct pressure class, or select a seam type. SMACNA's duct construction standards, the shop's own layout practice, and a test piece govern.",
  };
}
const squareToRoundDevelopmentExample = { inputs: { square_side_in: 20, round_diameter_in: 14, height_in: 16, offset_in: 0, elements_per_quadrant: 8, seam_allowance_in: 0.5 } };
METALAIR_RENDERERS["square-to-round-development"] = _simpleRenderer({
  citation: "Citation: triangulation development of a square-to-round transition by name -- the true length of an element line is sqrt(plan distance squared + height squared), and the developed curved edge is the sum of the chords across the elements, which must come back to pi x diameter. The chord across one of N elements is 2 R sin(pi / N), so a coarse division leaves the developed edge short of the circumference by a computed amount. Seam and lap allowances are added to the developed shape, not part of it. SMACNA's duct construction standards, the shop's layout practice, and a test piece govern.",
  example: squareToRoundDevelopmentExample.inputs,
  fields: [
    { key: "square_side_in", label: "Square side (in)", kind: "number", default: 20 },
    { key: "round_diameter_in", label: "Round diameter (in)", kind: "number", default: 14 },
    { key: "height_in", label: "Transition height (in)", kind: "number", default: 16 },
    { key: "offset_in", label: "Offset between centres (in, 0 for concentric)", kind: "number", default: 0 },
    { key: "elements_per_quadrant", label: "Elements per quadrant", kind: "number", default: 8 },
    { key: "seam_allowance_in", label: "Seam and lap allowance (in)", kind: "number", default: 0.5 },
  ],
  outputs: [
    { key: "c", id: "strd-out-c", label: "Corner element", value: (r) => fmt(r.plan_corner_distance_in, 2) + " in on the plan is " + fmt(r.corner_true_length_in, 2) + " in true -- " + fmt(r.understatement_pct, 0) + "% longer than the plan view shows" },
    { key: "m", id: "strd-out-m", label: "Side midpoint element", value: (r) => fmt(r.plan_midpoint_distance_in, 2) + " in on the plan is " + fmt(r.midpoint_true_length_in, 2) + " in true" },
    { key: "e", id: "strd-out-e", label: "Element chord", value: (r) => fmt(r.chord_in, 3) + " in across each of " + fmt(r.total_elements, 0) + " elements" },
    { key: "k", id: "strd-out-k", label: "Circumference check", value: (r) => "the development gives " + fmt(r.developed_arc_in, 2) + " in against a true circumference of " + fmt(r.circumference_in, 2) + " in -- short by " + fmt(r.arc_shortfall_in, 3) + " in, " + fmt(r.arc_shortfall_pct, 2) + "%. More elements close it" },
    { key: "s", id: "strd-out-s", label: "Sheet the pattern needs", value: (r) => fmt(r.sheet_width_in, 1) + " in by " + fmt(r.sheet_length_in, 1) + " in, seams included" },
    { key: "n", id: "strd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSquareToRoundDevelopment,
});

// ============ spec-v1681: standing seam panel and clip takeoff ============

// dims: in { building_width_ft: L, run_length_ft: L, coverage_width_in: L, sheet_width_in: L, field_clip_spacing_in: L, perimeter_clip_spacing_in: L, perimeter_panels: dimensionless, fasteners_per_clip: dimensionless, eave_ridge_allowance_in: L, waste_pct: dimensionless } out: { panel_count: dimensionless, panel_length_ft: L, total_panel_ft: L, field_clip_count: dimensionless, perimeter_clip_count: dimensionless, fastener_count: dimensionless }
export function computeStandingSeamTakeoff({ building_width_ft = 0, run_length_ft = 0, coverage_width_in = 0, sheet_width_in = 0, field_clip_spacing_in = 0, perimeter_clip_spacing_in = 0, perimeter_panels = 0, fasteners_per_clip = 2, eave_ridge_allowance_in = 0, waste_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(building_width_ft > 0)) return { error: "Building width must be positive (ft)." };
  if (!(run_length_ft > 0)) return { error: "Run length must be positive (ft)." };
  if (!(coverage_width_in > 0)) return { error: "Panel coverage width must be positive (in) -- the net width each panel adds, not the flat sheet." };
  if (sheet_width_in < 0) return { error: "Flat sheet width cannot be negative (in)." };
  if (sheet_width_in > 0 && !(sheet_width_in >= coverage_width_in)) return { error: "The flat sheet cannot be narrower than the coverage; the difference goes into the seam." };
  if (!(field_clip_spacing_in > 0)) return { error: "Field clip spacing must be positive (in) -- it comes from the tested assembly's uplift rating, not from convenience." };
  if (perimeter_clip_spacing_in < 0) return { error: "Perimeter clip spacing cannot be negative (in)." };
  if (perimeter_panels < 0) return { error: "The perimeter panel count cannot be negative." };
  if (!(fasteners_per_clip >= 1)) return { error: "There is at least one fastener per clip." };
  if (eave_ridge_allowance_in < 0) return { error: "The eave and ridge allowance cannot be negative (in)." };
  if (waste_pct < 0) return { error: "Waste cannot be negative (%)." };
  const IN_PER_FT_MA = 12;
  const width_in = building_width_ft * IN_PER_FT_MA;
  const panel_count = Math.ceil(width_in / coverage_width_in);
  // The mistake the note names: ordering on the flat sheet width instead of
  // the coverage width, which comes up SHORT on every roof.
  const panels_if_ordered_on_sheet = sheet_width_in > 0 ? Math.ceil(width_in / sheet_width_in) : null;
  const panels_short = panels_if_ordered_on_sheet === null ? null : panel_count - panels_if_ordered_on_sheet;
  const panel_length_ft = run_length_ft + eave_ridge_allowance_in / IN_PER_FT_MA;
  const total_panel_ft = panel_count * panel_length_ft;
  const total_panel_with_waste_ft = total_panel_ft * (1 + waste_pct / 100);
  const clipsPerPanel = (spacing_in) => Math.floor(panel_length_ft * IN_PER_FT_MA / spacing_in) + 1;
  const field_panels = Math.max(0, panel_count - Math.round(perimeter_panels));
  const clips_per_field_panel = clipsPerPanel(field_clip_spacing_in);
  const clips_per_perimeter_panel = perimeter_clip_spacing_in > 0 ? clipsPerPanel(perimeter_clip_spacing_in) : clips_per_field_panel;
  const field_clip_count = field_panels * clips_per_field_panel;
  const perimeter_clip_count = Math.round(perimeter_panels) * clips_per_perimeter_panel;
  const clip_count = field_clip_count + perimeter_clip_count;
  const fastener_count = clip_count * Math.round(fasteners_per_clip);
  // Every panel edge is a seam, and the two rakes are not.
  const seam_count = Math.max(0, panel_count - 1);
  const seam_length_ft = seam_count * panel_length_ft;
  const outs = [panel_count, panel_length_ft, total_panel_ft, field_clip_count, clip_count, fastener_count];
  if (!outs.every(Number.isFinite)) return { error: "Panel takeoff math is not a finite value." };
  const coverage_verdict = panels_if_ordered_on_sheet === null
    ? "Enter the flat sheet width to see what ordering on it would cost."
    : panels_short > 0
      ? "ORDERING ON THE SHEET WIDTH COMES UP " + fmt(panels_short, 0) + " PANEL" + (panels_short === 1 ? "" : "S") + " SHORT: " + fmt(panel_count, 0) + " panels of " + fmt(coverage_width_in, 2) + " in coverage against " + fmt(panels_if_ordered_on_sheet, 0) + " if the " + fmt(sheet_width_in, 2) + " in sheet is used, and the last panel lands well before the rake"
      : "Coverage and sheet width give the same count here, which is the case where the seam takes nothing -- check the panel profile";
  return {
    building_width_ft, run_length_ft, coverage_width_in, sheet_width_in, panel_count,
    panels_if_ordered_on_sheet, panels_short, panel_length_ft, eave_ridge_allowance_in,
    total_panel_ft, waste_pct, total_panel_with_waste_ft, field_panels,
    perimeter_panels: Math.round(perimeter_panels), field_clip_spacing_in,
    perimeter_clip_spacing_in, clips_per_field_panel, clips_per_perimeter_panel,
    field_clip_count, perimeter_clip_count, clip_count, fasteners_per_clip: Math.round(fasteners_per_clip),
    fastener_count, seam_count, seam_length_ft, coverage_verdict,
    note: "COVERAGE WIDTH IS THE NUMBER THAT MATTERS AND IT IS NOT THE PANEL WIDTH. A sixteen inch coverage panel is roll-formed from a wider sheet and the difference goes into the seam, so a building takes its width over the COVERAGE regardless of what the flat sheet measures. Ordering on the sheet width is the mistake, and on a wide building it is several panels short with the last one landing well before the rake -- which is discovered on the roof, on the last day, with the crew standing on it. CLIP SPACING IS A STRUCTURAL OUTPUT RATHER THAN AN INSTALLER'S CHOICE. The clips are what hold the roof down against wind uplift, and their spacing comes from the tested assembly's rated resistance against the design pressure for the roof zone -- with corners and edges requiring much closer spacing than the field, because that is where uplift is worst. A roof clipped at a uniform field spacing throughout is under-attached exactly where the wind is strongest, and that is the pattern seen after wind events: the field intact and the perimeter gone. The zone counts are kept separate here for that reason. The panel length allowance is where a takeoff goes wrong in the other direction. Standing seam panels expand and contract along their length, and the eave and ridge details have to accommodate that movement, so panel length carries allowances a bare run measurement does not -- and a panel cut to the run is a panel with nowhere to go. A material takeoff on a simple rectangular roof plane. IT IS NOT A WIND UPLIFT DESIGN and it does not determine the clip spacing: the spacings entered here have to come from the tested assembly's rating against the design pressure for each zone, and the zone boundaries themselves come from the wind standard rather than from the roof's appearance. It does not lay out hips, valleys, or transitions, or take off the flashing, closures, trim, sealant, and clips at those conditions, which on a complicated roof are a large share of the material and nearly all of the labour. It does not address substrate, deck attachment, thermal movement at the details, or the panel gauge and profile the span and load require. The panel manufacturer's tested assembly and installation instructions, the wind design for the building, and the roofing contractor govern.",
  };
}
const standingSeamTakeoffExample = { inputs: { building_width_ft: 42, run_length_ft: 30, coverage_width_in: 16, sheet_width_in: 18, field_clip_spacing_in: 24, perimeter_clip_spacing_in: 12, perimeter_panels: 4, fasteners_per_clip: 2, eave_ridge_allowance_in: 6, waste_pct: 5 } };
METALAIR_RENDERERS["standing-seam-takeoff"] = _simpleRenderer({
  citation: "Citation: the standing seam takeoff identities by name -- panel count = building width / COVERAGE width rounded up (not the flat sheet width, whose difference goes into the seam); clips per panel = panel length / clip spacing + 1; fasteners = clips x the tested assembly's fasteners per clip. CLIP SPACING IS NOT DETERMINED HERE: it comes from the tested assembly's rated uplift resistance against the design pressure for each roof zone, with corners and edges much closer than the field. A takeoff on a simple rectangular plane; hips, valleys, flashing and trim are not counted. The panel manufacturer's tested assembly and installation instructions, the wind design for the building, and the roofing contractor govern.",
  example: standingSeamTakeoffExample.inputs,
  fields: [
    { key: "building_width_ft", label: "Building width (ft)", kind: "number", default: 42 },
    { key: "run_length_ft", label: "Eave-to-ridge run (ft)", kind: "number", default: 30 },
    { key: "coverage_width_in", label: "Panel COVERAGE width (in)", kind: "number", default: 16 },
    { key: "sheet_width_in", label: "Flat sheet width (in, 0 to skip the comparison)", kind: "number", default: 18 },
    { key: "field_clip_spacing_in", label: "Field clip spacing (in)", kind: "number", default: 24 },
    { key: "perimeter_clip_spacing_in", label: "Edge and corner clip spacing (in, 0 to use the field spacing)", kind: "number", default: 12 },
    { key: "perimeter_panels", label: "Panels in the edge and corner zones", kind: "number", default: 4 },
    { key: "fasteners_per_clip", label: "Fasteners per clip", kind: "number", default: 2 },
    { key: "eave_ridge_allowance_in", label: "Eave and ridge allowance (in)", kind: "number", default: 6 },
    { key: "waste_pct", label: "Waste allowance (%)", kind: "number", default: 5 },
  ],
  outputs: [
    { key: "p", id: "sst-out-p", label: "Panels", value: (r) => fmt(r.panel_count, 0) + " at " + fmt(r.panel_length_ft, 2) + " ft each -- " + fmt(r.total_panel_ft, 0) + " linear ft, " + fmt(r.total_panel_with_waste_ft, 0) + " with " + fmt(r.waste_pct, 0) + "% waste" },
    { key: "w", id: "sst-out-w", label: "Coverage against sheet width", value: (r) => r.coverage_verdict },
    { key: "c", id: "sst-out-c", label: "Clips", value: (r) => fmt(r.clip_count, 0) + " total -- " + fmt(r.field_clip_count, 0) + " on " + fmt(r.field_panels, 0) + " field panels at " + fmt(r.clips_per_field_panel, 0) + " each, " + fmt(r.perimeter_clip_count, 0) + " on " + fmt(r.perimeter_panels, 0) + " edge and corner panels at " + fmt(r.clips_per_perimeter_panel, 0) + " each" },
    { key: "f", id: "sst-out-f", label: "Fasteners", value: (r) => fmt(r.fastener_count, 0) + " at " + fmt(r.fasteners_per_clip, 0) + " per clip" },
    { key: "s", id: "sst-out-s", label: "Seam length", value: (r) => fmt(r.seam_length_ft, 0) + " ft across " + fmt(r.seam_count, 0) + " seams" },
    { key: "n", id: "sst-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeStandingSeamTakeoff,
});

// ============ spec-v1682: metal roof thermal movement ============

// dims: in { panel_length_ft: L, alpha_per_f: T^-1, temp_swing_f: T, fixed_point_fraction: dimensionless, clip_travel_in: L } out: { total_movement_in: L, movement_up_slope_in: L, movement_down_slope_in: L, governing_movement_in: L, travel_margin_in: L, max_panel_length_ft: L }
export function computeMetalRoofThermalMovement({ panel_length_ft = 0, alpha_per_f = 0.0000128, temp_swing_f = 0, fixed_point_fraction = 0, clip_travel_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(panel_length_ft > 0)) return { error: "Panel length must be positive (ft)." };
  if (!(alpha_per_f > 0)) return { error: "The coefficient of thermal expansion must be positive (per degF)." };
  if (!(temp_swing_f > 0)) return { error: "The PANEL temperature swing must be positive (degF) -- it is much wider than the air temperature range." };
  if (!(fixed_point_fraction >= 0 && fixed_point_fraction <= 1)) return { error: "The fixed point must be between 0 (eave) and 1 (ridge) of the panel length." };
  if (clip_travel_in < 0) return { error: "Clip rated travel cannot be negative (in)." };
  const IN_PER_FT_TM = 12;
  const length_in = panel_length_ft * IN_PER_FT_TM;
  const total_movement_in = alpha_per_f * length_in * temp_swing_f;
  // Each panel is anchored at one point and moves AWAY from it, so the
  // movement at each end is that end's share of the length.
  const movement_up_slope_in = total_movement_in * (1 - fixed_point_fraction);
  const movement_down_slope_in = total_movement_in * fixed_point_fraction;
  const governing_movement_in = Math.max(movement_up_slope_in, movement_down_slope_in);
  const travel_margin_in = clip_travel_in > 0 ? clip_travel_in - governing_movement_in : null;
  const travel_adequate = clip_travel_in > 0 ? clip_travel_in >= governing_movement_in : null;
  // The longest panel this clip supports, at this fixed point. A panel fixed
  // at the middle carries twice the length for the same clip travel.
  const governing_fraction = Math.max(1 - fixed_point_fraction, fixed_point_fraction);
  const max_panel_length_ft = (clip_travel_in > 0 && governing_fraction > 0)
    ? clip_travel_in / (alpha_per_f * temp_swing_f * governing_fraction * IN_PER_FT_TM)
    : null;
  const centre_fixed_movement_in = total_movement_in / 2;
  const centre_fixed_saving_in = governing_movement_in - centre_fixed_movement_in;
  const outs = [total_movement_in, movement_up_slope_in, movement_down_slope_in, governing_movement_in];
  if (!outs.every(Number.isFinite)) return { error: "Thermal movement math is not a finite value." };
  const verdict = travel_adequate === null
    ? "Enter the clip's rated travel to check it."
    : travel_adequate
      ? "WITHIN TRAVEL: " + fmt(governing_movement_in, 3) + " in of movement against " + fmt(clip_travel_in, 3) + " in rated, " + fmt(travel_margin_in, 3) + " in to spare"
      : "BEYOND TRAVEL by " + fmt(-travel_margin_in, 3) + " in: " + fmt(governing_movement_in, 3) + " in of movement against " + fmt(clip_travel_in, 3) + " in rated. The clips bind, then the movement goes into the clip, then into the fastener holes, and the roof loses its attachment years after installation";
  return {
    panel_length_ft, alpha_per_f, temp_swing_f, total_movement_in,
    fixed_point_fraction, movement_up_slope_in, movement_down_slope_in,
    governing_movement_in, clip_travel_in, travel_margin_in, travel_adequate,
    max_panel_length_ft, centre_fixed_movement_in, centre_fixed_saving_in, verdict,
    note: "Metal expands, and on a standing seam roof the panel is long enough that it matters. THE PANEL TEMPERATURE RANGE IS MUCH WIDER THAN THE AIR TEMPERATURE RANGE, and that is what makes the movement large. A dark panel in summer sun reaches well above ambient, and on a clear winter night it radiates to the sky and goes below it, so a design based on the local air temperature range understates the movement substantially -- a swing of 140 to 180 degrees Fahrenheit on the panel itself is ordinary across most of the country. Aluminium moves about twice as far as steel for the same swing, which is why the material belongs in the calculation rather than in a rule of thumb. THE FIXED POINT DETERMINES WHERE THE MOVEMENT GOES. Each panel is anchored at one location -- eave, ridge, or a point between -- and expands away from it, so the movement at the far end is the full expansion of the whole panel length. A panel fixed at its middle halves the movement at each end, which on very long panels is the only way to keep the clip travel within range, and the saving from moving the fixed point is reported here because it is often the cheapest fix available. THE FAILURE IS PROGRESSIVE RATHER THAN SUDDEN, which is why it gets blamed on workmanship. Clips at the ends of long panels reach the limit of their travel; then the movement goes into the clip itself, then into the fastener holes, which elongate; and the roof gradually loses its attachment and begins to oil-can and leak at the details. It looks like poor installation years after the fact, and it is a movement allowance that was never there. A single straight panel run, uniform temperature, free to move. It does not address the eave and ridge details themselves, the flashing and closures that have to accommodate the same movement, or the sealant joints that carry it at penetrations and transitions -- all of which fail the same way. It does not evaluate the clip's structural capacity, only its travel, and a clip adequate in travel can still be inadequate in uplift. It does not address panels restrained at both ends, which is a common detailing error that turns movement into stress, or the noise a moving roof makes. Panel temperature ranges vary by colour, slope, orientation, insulation, and climate. The panel manufacturer's expansion and clip data, SMACNA and the metal building manufacturers' guidance, and the roofing contractor govern.",
  };
}
const metalRoofThermalMovementExample = { inputs: { panel_length_ft: 120, alpha_per_f: 0.0000128, temp_swing_f: 140, fixed_point_fraction: 0, clip_travel_in: 1.5 } };
METALAIR_RENDERERS["metal-roof-thermal-movement"] = _simpleRenderer({
  citation: "Citation: the thermal expansion relation by name -- movement = coefficient of expansion x length x temperature swing, taken on the PANEL temperature range rather than the air range, with steel about 6.5e-06 per degF, aluminium about 1.28e-05 and copper about 9.8e-06. Each panel is fixed at one point and moves away from it, so the movement at an end is that end's share of the length. It checks travel, not clip capacity. The panel manufacturer's expansion and clip data, SMACNA and the metal building manufacturers' guidance, and the roofing contractor govern.",
  example: metalRoofThermalMovementExample.inputs,
  fields: [
    { key: "panel_length_ft", label: "Panel length (ft)", kind: "number", default: 120 },
    { key: "alpha_per_f", label: "Coefficient of thermal expansion (per degF)", kind: "number", default: 0.0000128 },
    { key: "temp_swing_f", label: "PANEL temperature swing (F)", kind: "number", default: 140 },
    { key: "fixed_point_fraction", label: "Fixed point along the panel (0 = eave, 1 = ridge)", kind: "number", default: 0, attrs: { step: "any", min: "0", max: "1" } },
    { key: "clip_travel_in", label: "Clip rated travel (in, 0 to skip)", kind: "number", default: 1.5 },
  ],
  outputs: [
    { key: "t", id: "mrtm-out-t", label: "Total movement", value: (r) => fmt(r.total_movement_in, 3) + " in over " + fmt(r.panel_length_ft, 0) + " ft at a " + fmt(r.temp_swing_f, 0) + " F panel swing" },
    { key: "e", id: "mrtm-out-e", label: "Movement at each end", value: (r) => fmt(r.movement_down_slope_in, 3) + " in toward the eave and " + fmt(r.movement_up_slope_in, 3) + " in toward the ridge, from a fixed point at " + fmt(r.fixed_point_fraction * 100, 0) + "% of the length" },
    { key: "v", id: "mrtm-out-v", label: "Against the clip travel", value: (r) => r.verdict },
    { key: "c", id: "mrtm-out-c", label: "Fixing it at the middle instead", value: (r) => fmt(r.centre_fixed_movement_in, 3) + " in at each end -- " + fmt(r.centre_fixed_saving_in, 3) + " in less than the governing end has now, which on a long panel is often the cheapest fix there is" },
    { key: "m", id: "mrtm-out-m", label: "Longest panel this clip supports", value: (r) => r.max_panel_length_ft === null ? "(no clip travel entered)" : fmt(r.max_panel_length_ft, 1) + " ft at this fixed point and temperature swing" },
    { key: "n", id: "mrtm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMetalRoofThermalMovement,
});
