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
  const rated = makeNumber("Blower rated ESP (in. w.c.)", "ds-rated", { step: "any", min: "0", value: "0.50" });
  rated.input.value = "0.50";
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
// dims: in { suction_psig: dimensionless, discharge_psig: dimensionless, atmospheric_psia: dimensionless } out: { suction_psia: dimensionless, discharge_psia: dimensionless, compression_ratio: dimensionless }
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
  const lg = makeNumber("Large end dimension (in)", "dtl-lg", { step: "any", min: "0", value: "20" });
  lg.input.value = "20";
  const sm = makeNumber("Small end dimension (in)", "dtl-sm", { step: "any", min: "0", value: "12" });
  sm.input.value = "12";
  const sl = makeNumber("Transition slope (deg per side)", "dtl-sl", { step: "any", min: "0", value: "15" });
  sl.input.value = "15";
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
