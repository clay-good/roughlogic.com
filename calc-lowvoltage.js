// =====================================================================
// calc-lowvoltage.js - spec-v28 Low-Voltage, Data, and Security Cabling.
//
// Six first-principles / named-code tiles for the structured-cabling trade:
// fiber loss budget, cable-tray fill (NEC 392), CCTV/NVR storage, 70 V
// distributed audio, fire-alarm standby battery (NFPA 72), and coax
// attenuation. Pure exported compute functions (no DOM in the compute
// layer) plus their renderers and the LOWVOLTAGE_RENDERERS map, mirroring
// every other calc-*.js module.
//
// Group decision (spec-v28 §1.1): opening a dedicated "Group Z" is gated on
// maintainer signoff. Pending that signoff, these tiles land in **Group A
// (Electrical)** as a low-voltage sub-cluster per the spec's documented
// fallback (the tile bodies are group-agnostic; moving them to a future
// Group Z is a one-line change per tile). See docs/audit-trail.md.
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

export const LOWVOLTAGE_RENDERERS = {};

// ---------------------------------------------------------------------
// Z.1 Fiber optic loss budget (fiber-loss-budget)
// ---------------------------------------------------------------------
// dims: in { length_m: L, attenuation_db_km: dimensionless, connector_count: dimensionless, splice_count: dimensionless, max_channel_loss_db: dimensionless } out: { total_loss_db: dimensionless, margin_db: dimensionless }
export function computeFiberLossBudget({ length_m = 0, attenuation_db_km = 0, connector_count = 0, loss_per_connector_db = 0.75, splice_count = 0, loss_per_splice_db = 0.3, max_channel_loss_db = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const len = Number(length_m);
  const att = Number(attenuation_db_km);
  if (!(len > 0)) return { error: "Link length must be positive (m)." };
  if (!(att >= 0)) return { error: "Attenuation coefficient must be non-negative (dB/km)." };
  const nc = Math.max(0, Number(connector_count) || 0);
  const ns = Math.max(0, Number(splice_count) || 0);
  const lpc = Number(loss_per_connector_db) || 0;
  const lps = Number(loss_per_splice_db) || 0;
  const fiber_loss_db = (len / 1000) * att;
  const connector_loss_db = nc * lpc;
  const splice_loss_db = ns * lps;
  const total_loss_db = fiber_loss_db + connector_loss_db + splice_loss_db;
  const maxch = Number(max_channel_loss_db) || 0;
  let margin_db = null, pass = null;
  if (maxch > 0) { margin_db = maxch - total_loss_db; pass = margin_db >= 0; }
  const notes = [];
  if (pass === false) notes.push("Total loss " + fmt(total_loss_db, 2) + " dB exceeds the channel maximum (" + fmt(maxch, 2) + " dB): the link fails the budget.");
  notes.push("Attenuation coefficients and component losses are component-specific and user-supplied; the OTDR/power-meter field test governs the certified link.");
  return { fiber_loss_db, connector_loss_db, splice_loss_db, total_loss_db, max_channel_loss_db: maxch || null, margin_db, pass, notes };
}
export const fiberLossBudgetExample = { inputs: { length_m: 300, attenuation_db_km: 3.0, connector_count: 2, loss_per_connector_db: 0.75, splice_count: 0, max_channel_loss_db: 2.6 } };

const _FIBER_DEFAULT_ATT = {
  "om3-850": 3.5, "om4-850": 3.0, "om5-850": 3.0, "om4-1300": 1.5,
  "smf-1310": 0.4, "smf-1550": 0.3,
};
function _renderFiberLossBudget(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Optical link loss budget - fiber attenuation plus connector and splice losses against the application's maximum channel loss - per the TIA-568 / TIA-526 fiber-test methods and the IEEE 802.3 channel-loss limits, by name; first-principles. Attenuation coefficients and component losses are user-supplied; the OTDR/power-meter field test governs the certified link.";
  const fiber = makeSelect("Fiber / wavelength (sets default dB/km)", "flb-fiber", [
    { value: "om4-850", label: "OM4 @ 850 nm", selected: true }, { value: "om3-850", label: "OM3 @ 850 nm" },
    { value: "om5-850", label: "OM5 @ 850 nm" }, { value: "om4-1300", label: "OM4 @ 1300 nm" },
    { value: "smf-1310", label: "Single-mode @ 1310 nm" }, { value: "smf-1550", label: "Single-mode @ 1550 nm" },
  ]);
  const len = makeNumber("Link length (m)", "flb-len", { step: "any", min: "0" });
  const att = makeNumber("Attenuation (dB/km)", "flb-att", { step: "any", min: "0" });
  const nc = makeNumber("Connector pairs", "flb-nc", { step: "1", min: "0" });
  const lpc = makeNumber("Loss per connector (dB)", "flb-lpc", { step: "any", min: "0", value: "0.75" });
  const ns = makeNumber("Splices", "flb-ns", { step: "1", min: "0" });
  const lps = makeNumber("Loss per splice (dB)", "flb-lps", { step: "any", min: "0", value: "0.3" });
  const maxch = makeNumber("Max channel loss (dB)", "flb-max", { step: "any", min: "0" });
  lpc.input.value = "0.75"; lps.input.value = "0.3";
  for (const f of [fiber, len, att, nc, lpc, ns, lps, maxch]) inputRegion.appendChild(f.wrap);
  function fillAtt() { const d = _FIBER_DEFAULT_ATT[fiber.select.value]; if (d) att.input.value = String(d); }
  fillAtt();
  attachExampleButton(inputRegion, () => { fiber.select.value = "om4-850"; fillAtt(); len.input.value = "300"; nc.input.value = "2"; lpc.input.value = "0.75"; ns.input.value = "0"; lps.input.value = "0.3"; maxch.input.value = "2.6"; update(); });
  const oTotal = makeOutputLine(outputRegion, "Total link loss (dB)", "flb-out-total");
  const oMargin = makeOutputLine(outputRegion, "Margin / verdict", "flb-out-margin");
  const oBreak = makeOutputLine(outputRegion, "Breakdown", "flb-out-break");
  const oNote = makeOutputLine(outputRegion, "Notes", "flb-out-note");
  const update = debounce(() => {
    const r = computeFiberLossBudget({ length_m: Number(len.input.value) || 0, attenuation_db_km: Number(att.input.value) || 0, connector_count: Number(nc.input.value) || 0, loss_per_connector_db: Number(lpc.input.value) || 0, splice_count: Number(ns.input.value) || 0, loss_per_splice_db: Number(lps.input.value) || 0, max_channel_loss_db: Number(maxch.input.value) || 0 });
    if (r.error) { oTotal.textContent = r.error; oMargin.textContent = "-"; oBreak.textContent = "-"; oNote.textContent = ""; return; }
    oTotal.textContent = fmt(r.total_loss_db, 2) + " dB";
    oMargin.textContent = r.margin_db === null ? "(enter max channel loss)" : (fmt(r.margin_db, 2) + " dB - " + (r.pass ? "PASS" : "FAIL"));
    oBreak.textContent = "fiber " + fmt(r.fiber_loss_db, 2) + " + connectors " + fmt(r.connector_loss_db, 2) + " + splices " + fmt(r.splice_loss_db, 2) + " dB";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [len.input, att.input, nc.input, lpc.input, ns.input, lps.input, maxch.input]) f.addEventListener("input", update);
  fiber.select.addEventListener("change", () => { fillAtt(); update(); });
}
LOWVOLTAGE_RENDERERS["fiber-loss-budget"] = _renderFiberLossBudget;

// dims: in { max_channel_loss_db: dimensionless, attenuation_db_km: dimensionless, connector_count: dimensionless, splice_count: dimensionless } out: { max_length_m: L, max_length_ft: L }
export function computeFiberMaxLength({ max_channel_loss_db = 0, attenuation_db_km = 0, connector_count = 0, loss_per_connector_db = 0.75, splice_count = 0, loss_per_splice_db = 0.3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const maxch = Number(max_channel_loss_db);
  const att = Number(attenuation_db_km);
  if (!(maxch > 0)) return { error: "Max channel loss must be positive (dB)." };
  if (!(att > 0)) return { error: "Attenuation coefficient must be positive (dB/km)." };
  const nc = Math.max(0, Number(connector_count) || 0);
  const ns = Math.max(0, Number(splice_count) || 0);
  const lpc = Number(loss_per_connector_db) || 0;
  const lps = Number(loss_per_splice_db) || 0;
  const fixed_loss_db = nc * lpc + ns * lps;
  const fiber_budget_db = maxch - fixed_loss_db;
  if (!(fiber_budget_db > 0)) return { error: "The connector and splice losses alone (" + fmt(fixed_loss_db, 2) + " dB) meet or exceed the channel budget; no fiber length is available (reduce connectors/splices or raise the budget)." };
  // Inverse of total_loss = (len/1000) x att + connectors + splices, at total_loss = max_channel_loss:
  // len_max = 1000 x (max_channel_loss - fixed_loss) / att.
  const max_length_m = 1000 * fiber_budget_db / att;
  if (!Number.isFinite(max_length_m) || !(max_length_m > 0)) return { error: "Length math is not a finite positive value." };
  return {
    max_length_m, max_length_ft: max_length_m * 3.280839895013123, fixed_loss_db, fiber_budget_db,
    note: "The longest fiber run that still passes the channel loss budget, the inverse of the fiber-loss-budget tile: the connector and splice losses are subtracted from the budget first, and the remainder divided by the attenuation gives the fiber length: len_max = 1000 x (max_channel_loss - connector_loss - splice_loss) / attenuation. Every connector or splice you add eats budget that would otherwise buy distance, which is why a link with many patch points reaches less far than the raw fiber attenuation suggests. Use the application's channel-loss limit (TIA-568 / IEEE 802.3) and the component-specific loss values; a real link is certified by an OTDR/power-meter field test, not this budget. A planning estimate; the field test governs."
  };
}
export const fiberMaxLengthExample = { inputs: { max_channel_loss_db: 2.6, attenuation_db_km: 3.0, connector_count: 2, loss_per_connector_db: 0.75, splice_count: 0, loss_per_splice_db: 0.3 } };

function _renderFiberMaxLength(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: optical link loss budget solved for length: len_max = 1000 x (max_channel_loss - connector_loss - splice_loss) / attenuation, per TIA-568 / TIA-526 fiber-test methods and IEEE 802.3 channel-loss limits, by name. Component losses user-supplied; the OTDR/power-meter field test governs the certified link.";
  const fiber = makeSelect("Fiber / wavelength (sets default dB/km)", "fml-fiber", [
    { value: "om4-850", label: "OM4 @ 850 nm", selected: true }, { value: "om3-850", label: "OM3 @ 850 nm" },
    { value: "om5-850", label: "OM5 @ 850 nm" }, { value: "om4-1300", label: "OM4 @ 1300 nm" },
    { value: "smf-1310", label: "Single-mode @ 1310 nm" }, { value: "smf-1550", label: "Single-mode @ 1550 nm" },
  ]);
  const maxch = makeNumber("Max channel loss (dB)", "fml-max", { step: "any", min: "0" });
  const att = makeNumber("Attenuation (dB/km)", "fml-att", { step: "any", min: "0" });
  const nc = makeNumber("Connector pairs", "fml-nc", { step: "1", min: "0" });
  const lpc = makeNumber("Loss per connector (dB)", "fml-lpc", { step: "any", min: "0", value: "0.75" });
  const ns = makeNumber("Splices", "fml-ns", { step: "1", min: "0" });
  const lps = makeNumber("Loss per splice (dB)", "fml-lps", { step: "any", min: "0", value: "0.3" });
  lpc.input.value = "0.75"; lps.input.value = "0.3";
  for (const f of [fiber, maxch, att, nc, lpc, ns, lps]) inputRegion.appendChild(f.wrap);
  function fillAtt() { const d = _FIBER_DEFAULT_ATT[fiber.select.value]; if (d) att.input.value = String(d); }
  fillAtt();
  attachExampleButton(inputRegion, () => { fiber.select.value = "om4-850"; fillAtt(); maxch.input.value = "2.6"; nc.input.value = "2"; lpc.input.value = "0.75"; ns.input.value = "0"; lps.input.value = "0.3"; update(); });
  const oLen = makeOutputLine(outputRegion, "Max fiber length", "fml-out-len");
  const oNote = makeOutputLine(outputRegion, "Note", "fml-out-note");
  const update = debounce(() => {
    const r = computeFiberMaxLength({ max_channel_loss_db: Number(maxch.input.value) || 0, attenuation_db_km: Number(att.input.value) || 0, connector_count: Number(nc.input.value) || 0, loss_per_connector_db: Number(lpc.input.value) || 0, splice_count: Number(ns.input.value) || 0, loss_per_splice_db: Number(lps.input.value) || 0 });
    if (r.error) { oLen.textContent = r.error; oNote.textContent = ""; return; }
    oLen.textContent = fmt(r.max_length_m, 0) + " m (" + fmt(r.max_length_ft, 0) + " ft)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [maxch.input, att.input, nc.input, lpc.input, ns.input, lps.input]) f.addEventListener("input", update);
  fiber.select.addEventListener("change", () => { fillAtt(); update(); });
}
LOWVOLTAGE_RENDERERS["fiber-max-length"] = _renderFiberMaxLength;

// ---------------------------------------------------------------------
// Z.2 Cable tray fill (cable-tray-fill) - NEC 392.22(A)
// ---------------------------------------------------------------------
// Column-2 allowable cable-fill area is linear in tray width: ladder /
// ventilated trough ~ 1.167 * width; solid bottom ~ 0.917 * width (NEC
// Table 392.22(A)(1)/(2), reproduced as the linear relation they encode).
function _trayColumn2Area(trayType, width) {
  const factor = trayType === "solid-bottom" ? 0.917 : 1.167;
  return factor * width;
}
// dims: in { tray_width_in: L, cables: dimensionless } out: { fill_value: L, allowable: L, fill_percent: dimensionless }
export function computeCableTrayFill({ tray_type = "ladder", tray_width_in = 0, cables = [] } = {}) {
  const _g = _finiteGuard({ tray_width_in }); if (_g) return _g;
  const width = Number(tray_width_in);
  if (!(width > 0)) return { error: "Tray inside width must be positive (in)." };
  if (!Array.isArray(cables) || cables.length === 0) return { error: "Enter at least one cable group (count x diameter)." };
  let diameter_sum = 0, area_sum = 0, hasLarge = false, hasSmall = false;
  for (const c of cables) {
    const count = Math.max(0, Number(c && c.count) || 0);
    const dia = Number(c && c.diameter_in);
    if (!Number.isFinite(dia) || !(dia > 0)) return { error: "Each cable group needs a positive outside diameter (in)." };
    const isLarge = !!(c && c.large); // 4/0 AWG and larger
    if (count <= 0) continue;
    if (isLarge) { hasLarge = true; diameter_sum += count * dia; }
    else { hasSmall = true; area_sum += count * Math.PI / 4 * dia * dia; }
  }
  const notes = [];
  let fill_value, allowable, fill_percent, pass, basis;
  if (hasLarge && !hasSmall) {
    // 392.22(A)(1)(a): sum of diameters <= tray inside width.
    basis = "sum-of-diameters (cables 4/0 and larger)";
    fill_value = diameter_sum; allowable = width; pass = diameter_sum <= width;
    fill_percent = (diameter_sum / width) * 100;
  } else if (hasSmall && !hasLarge) {
    // 392.22(A)(1)(b): sum of areas <= column-2 allowable.
    basis = "sum-of-areas (cables smaller than 4/0)";
    allowable = _trayColumn2Area(tray_type, width);
    fill_value = area_sum; pass = area_sum <= allowable;
    fill_percent = (area_sum / allowable) * 100;
  } else {
    // Mixed (392.22(A)(1)(c)): the smaller-cable Column-1 area is reduced by the
    // 4/0-and-larger cables laid in a single layer. NEC gives (Column-1 area) - 1.2*Sd
    // for ladder/ventilated (base 1.167*width - so 12 in tray, Sd 5.25 -> 14 - 6.3 = 7.7 in^2).
    // The 1.2 single-layer allowance is distinct from the 1.167 Column-1 depth; applying the
    // base factor to Sd (the old code) under-reduced the allowance and over-stated the fill.
    basis = "mixed: 4/0-and-larger diameters reduce the smaller-cable area allowance";
    const sdFactor = tray_type === "solid-bottom" ? 0.917 : 1.2;
    const reduced_allowable = Math.max(0, _trayColumn2Area(tray_type, width) - sdFactor * diameter_sum);
    allowable = reduced_allowable; fill_value = area_sum;
    pass = diameter_sum <= width && area_sum <= reduced_allowable;
    fill_percent = reduced_allowable > 0 ? (area_sum / reduced_allowable) * 100 : Infinity;
    notes.push("Mixed 4/0-and-larger and smaller cables: verify against NEC 392.22(A)(1)(c). Large-cable diameter sum " + fmt(diameter_sum, 2) + " in of " + fmt(width, 1) + " in width.");
    if (!Number.isFinite(fill_percent)) { fill_percent = null; pass = false; notes.push("Large cables consume the whole tray width; no room for smaller cables."); }
  }
  if (pass === false && basis.startsWith("sum-of-diameters")) notes.push("Cable diameters sum to " + fmt(diameter_sum, 2) + " in, over the " + fmt(width, 1) + " in tray width.");
  notes.push("Ampacity derating for tray fill (NEC 392.80) is a separate check. The AHJ-adopted NEC edition governs.");
  return { tray_type, tray_width_in: width, basis, fill_value, allowable, fill_percent, pass, diameter_sum_in: diameter_sum, area_sum_in2: area_sum, notes };
}
export const cableTrayFillExample = { inputs: { tray_type: "ladder", tray_width_in: 12, cables: [{ count: 6, diameter_in: 1.5, large: true }] } };

function _renderCableTrayFill(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Cable-tray fill per NEC Article 392.22 (the sum-of-diameters rule for cables 4/0 and larger and the cross-sectional-area allowance for smaller cables), by name. The AHJ-adopted NEC edition governs; ampacity derating for tray fill (392.80) is a separate check.";
  const type = makeSelect("Tray type", "ctf-type", [
    { value: "ladder", label: "Ladder / ventilated trough", selected: true }, { value: "solid-bottom", label: "Solid bottom" },
  ]);
  const width = makeNumber("Tray inside width (in)", "ctf-width", { step: "any", min: "0" });
  const DEFAULT = "6,1.5,large";
  const list = makeTextarea("Cables: count,diameter(in),large|small per line", "ctf-list", { rows: "4" });
  list.input.value = DEFAULT;
  for (const f of [type, width]) inputRegion.appendChild(f.wrap);
  inputRegion.appendChild(list.wrap);
  attachExampleButton(inputRegion, () => { type.select.value = "ladder"; width.input.value = "12"; list.input.value = DEFAULT; update(); });
  const oFill = makeOutputLine(outputRegion, "Fill / allowable", "ctf-out-fill");
  const oPct = makeOutputLine(outputRegion, "Fill percent / verdict", "ctf-out-pct");
  const oNote = makeOutputLine(outputRegion, "Notes", "ctf-out-note");
  function parseCables(text) {
    const out = [];
    for (const raw of String(text).split("\n")) {
      const line = raw.trim(); if (!line) continue;
      const p = line.split(",").map((s) => s.trim());
      const count = Number(p[0]), dia = Number(p[1]);
      if (!Number.isFinite(count) || !Number.isFinite(dia)) return null;
      out.push({ count, diameter_in: dia, large: (p[2] || "").toLowerCase().startsWith("l") });
    }
    return out;
  }
  const update = debounce(() => {
    const cables = parseCables(list.input.value);
    if (cables === null) { oFill.textContent = "Each line must be count,diameter,large|small."; oPct.textContent = "-"; oNote.textContent = ""; return; }
    const r = computeCableTrayFill({ tray_type: type.select.value, tray_width_in: Number(width.input.value) || 0, cables });
    if (r.error) { oFill.textContent = r.error; oPct.textContent = "-"; oNote.textContent = ""; return; }
    const unit = r.basis.startsWith("sum-of-diameters") ? " in" : " in2";
    oFill.textContent = fmt(r.fill_value, 2) + unit + " of " + fmt(r.allowable, 2) + unit + " (" + r.basis + ")";
    oPct.textContent = (r.fill_percent === null ? "-" : fmt(r.fill_percent, 1) + "%") + " - " + (r.pass ? "PASS" : "OVER-FILL");
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [width.input, list.input]) f.addEventListener("input", update);
  type.select.addEventListener("change", update);
}
LOWVOLTAGE_RENDERERS["cable-tray-fill"] = _renderCableTrayFill;

// ---------------------------------------------------------------------
// Z.3 IP camera / NVR storage and bandwidth (cctv-storage)
// ---------------------------------------------------------------------
// 1 Mbps continuous = 0.45 GB/hour = 10.8 GB/day.
// dims: in { camera_count: dimensionless, bitrate_mbps: dimensionless, motion_duty_percent: dimensionless, retention_days: dimensionless } out: { total_storage_gb: dimensionless, aggregate_bandwidth_mbps: dimensionless }
export function computeCctvStorage({ camera_count = 1, bitrate_mbps = 0, recording_mode = "continuous", motion_duty_percent = 100, retention_days = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const n = Math.max(0, Number(camera_count) || 0);
  const br = Number(bitrate_mbps);
  const days = Number(retention_days);
  if (!(n >= 1)) return { error: "Camera count must be at least 1." };
  if (!(br > 0)) return { error: "Bitrate must be positive (Mbps)." };
  if (!(days >= 0)) return { error: "Retention days must be non-negative." };
  let hours;
  if (recording_mode === "motion") {
    const duty = Number(motion_duty_percent);
    if (!(duty > 0 && duty <= 100)) return { error: "Motion duty-cycle must be in (0, 100] percent." };
    hours = 24 * (duty / 100);
  } else {
    hours = 24;
  }
  const per_camera_day_gb = br * 0.45 * hours;
  const total_storage_gb = n * per_camera_day_gb * days;
  const aggregate_bandwidth_mbps = n * br;
  const notes = [];
  if (days === 0) notes.push("Retention of 0 days yields 0 storage.");
  notes.push("H.264/H.265 bitrate estimates are scene- and vendor-specific and user-supplied; the VMS calculator and the installed cameras govern.");
  return { camera_count: n, per_camera_day_gb, total_storage_gb, total_storage_tb: total_storage_gb / 1000, aggregate_bandwidth_mbps, recording_hours_per_day: hours, notes };
}
export const cctvStorageExample = { inputs: { camera_count: 1, bitrate_mbps: 4, recording_mode: "continuous", retention_days: 30 } };

function _renderCctvStorage(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IP-video storage and bandwidth from bitrate, recording hours, and retention (1 Mbps for 24 h is about 10.8 GB/day), per the standard NVR/VMS sizing practice (first-principles bitrate accounting); the H.264/H.265 bitrate estimates are scene- and vendor-specific and user-supplied. The VMS calculator and the installed cameras govern.";
  const n = makeNumber("Camera count", "cs-n", { step: "1", min: "1" });
  const br = makeNumber("Per-camera bitrate (Mbps)", "cs-br", { step: "any", min: "0" });
  const mode = makeSelect("Recording mode", "cs-mode", [
    { value: "continuous", label: "Continuous 24 h", selected: true }, { value: "motion", label: "Motion duty-cycle" },
  ]);
  const duty = makeNumber("Motion duty-cycle (%)", "cs-duty", { step: "any", min: "0", max: "100", value: "50" });
  const days = makeNumber("Retention (days)", "cs-days", { step: "any", min: "0" });
  for (const f of [n, br, mode, duty, days]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { n.input.value = "1"; br.input.value = "4"; mode.select.value = "continuous"; duty.input.value = "50"; days.input.value = "30"; update(); });
  const oTot = makeOutputLine(outputRegion, "Total storage", "cs-out-tot");
  const oBw = makeOutputLine(outputRegion, "Aggregate bandwidth", "cs-out-bw");
  const oPer = makeOutputLine(outputRegion, "Per-camera per day", "cs-out-per");
  const oNote = makeOutputLine(outputRegion, "Notes", "cs-out-note");
  const update = debounce(() => {
    const r = computeCctvStorage({ camera_count: Number(n.input.value) || 0, bitrate_mbps: Number(br.input.value) || 0, recording_mode: mode.select.value, motion_duty_percent: Number(duty.input.value) || 0, retention_days: Number(days.input.value) || 0 });
    if (r.error) { oTot.textContent = r.error; oBw.textContent = "-"; oPer.textContent = "-"; oNote.textContent = ""; return; }
    oTot.textContent = fmt(r.total_storage_gb, 0) + " GB (" + fmt(r.total_storage_tb, 2) + " TB)";
    oBw.textContent = fmt(r.aggregate_bandwidth_mbps, 1) + " Mbps";
    oPer.textContent = fmt(r.per_camera_day_gb, 2) + " GB/day (" + fmt(r.recording_hours_per_day, 1) + " h)";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [n.input, br.input, duty.input, days.input]) f.addEventListener("input", update);
  mode.select.addEventListener("change", update);
}
LOWVOLTAGE_RENDERERS["cctv-storage"] = _renderCctvStorage;

// ---------------------------------------------------------------------
// Z.3b CCTV retention days from available disk (cctv-retention-days)
// ---------------------------------------------------------------------
// Inverse of cctv-storage: total_storage_gb = n * (br * 0.45 * hours) * days,
// so days = disk_capacity_gb / (n * br * 0.45 * hours). Reuses computeCctvStorage
// at retention_days = 1 to get the daily total, keeping the daily-rate geometry
// in one place.
// dims: in { disk_capacity_gb: dimensionless, camera_count: dimensionless, bitrate_mbps: dimensionless, motion_duty_percent: dimensionless } out: { retention_days: dimensionless, per_camera_day_gb: dimensionless }
export function computeCctvRetentionDays({ disk_capacity_gb = 0, camera_count = 1, bitrate_mbps = 0, recording_mode = "continuous", motion_duty_percent = 100 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cap = Number(disk_capacity_gb);
  if (!(cap > 0)) return { error: "Available disk capacity must be positive (GB)." };
  const base = computeCctvStorage({ camera_count, bitrate_mbps, recording_mode, motion_duty_percent, retention_days: 1 });
  if (base.error) return { error: base.error };
  const daily_total_gb = base.total_storage_gb;
  const retention_days = cap / daily_total_gb;
  const notes = [];
  if (retention_days < 1) notes.push("Under one day of retention -- add disk, lower the bitrate, or switch to motion recording.");
  notes.push("H.264/H.265 bitrate estimates are scene- and vendor-specific and user-supplied; the VMS calculator and the installed cameras govern.");
  return { retention_days, retention_weeks: retention_days / 7, daily_total_gb, per_camera_day_gb: base.per_camera_day_gb, aggregate_bandwidth_mbps: base.aggregate_bandwidth_mbps, recording_hours_per_day: base.recording_hours_per_day, notes };
}
export const cctvRetentionDaysExample = { inputs: { disk_capacity_gb: 16000, camera_count: 8, bitrate_mbps: 4, recording_mode: "continuous" } };

function _renderCctvRetentionDays(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IP-video retention from available disk, camera count, bitrate, and recording hours (days = disk_GB / (cameras x bitrate x 0.45 x hours); 1 Mbps for 24 h is about 10.8 GB/day), per the standard NVR/VMS sizing practice (first-principles bitrate accounting); the H.264/H.265 bitrate estimates are scene- and vendor-specific and user-supplied. The VMS calculator and the installed cameras govern.";
  const cap = makeNumber("Usable disk capacity (GB)", "cr-cap", { step: "any", min: "0" });
  const n = makeNumber("Camera count", "cr-n", { step: "1", min: "1" });
  const br = makeNumber("Per-camera bitrate (Mbps)", "cr-br", { step: "any", min: "0" });
  const mode = makeSelect("Recording mode", "cr-mode", [
    { value: "continuous", label: "Continuous 24 h", selected: true }, { value: "motion", label: "Motion duty-cycle" },
  ]);
  const duty = makeNumber("Motion duty-cycle (%)", "cr-duty", { step: "any", min: "0", max: "100", value: "50" });
  for (const f of [cap, n, br, mode, duty]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cap.input.value = "16000"; n.input.value = "8"; br.input.value = "4"; mode.select.value = "continuous"; duty.input.value = "50"; update(); });
  const oDays = makeOutputLine(outputRegion, "Retention", "cr-out-days");
  const oDaily = makeOutputLine(outputRegion, "Daily total", "cr-out-daily");
  const oBw = makeOutputLine(outputRegion, "Aggregate bandwidth", "cr-out-bw");
  const oNote = makeOutputLine(outputRegion, "Notes", "cr-out-note");
  const update = debounce(() => {
    const r = computeCctvRetentionDays({ disk_capacity_gb: Number(cap.input.value) || 0, camera_count: Number(n.input.value) || 0, bitrate_mbps: Number(br.input.value) || 0, recording_mode: mode.select.value, motion_duty_percent: Number(duty.input.value) || 0 });
    if (r.error) { oDays.textContent = r.error; oDaily.textContent = "-"; oBw.textContent = "-"; oNote.textContent = ""; return; }
    oDays.textContent = fmt(r.retention_days, 1) + " days (" + fmt(r.retention_weeks, 1) + " weeks)";
    oDaily.textContent = fmt(r.daily_total_gb, 1) + " GB/day (" + fmt(r.per_camera_day_gb, 2) + " GB/day/camera, " + fmt(r.recording_hours_per_day, 1) + " h)";
    oBw.textContent = fmt(r.aggregate_bandwidth_mbps, 1) + " Mbps";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [cap.input, n.input, br.input, duty.input]) f.addEventListener("input", update);
  mode.select.addEventListener("change", update);
}
LOWVOLTAGE_RENDERERS["cctv-retention-days"] = _renderCctvRetentionDays;

// ---------------------------------------------------------------------
// Z.4 70-volt distributed speaker line (speaker-70v-line)
// ---------------------------------------------------------------------
// dims: in { amp_rated_w: M L^2 T^-3, headroom_percent: dimensionless, tap_watts: M L^2 T^-3, tap_count: dimensionless, line_voltage_v: dimensionless } out: { total_tap_w: M L^2 T^-3, reflected_impedance_ohm: dimensionless }
export function computeSpeaker70vLine({ amp_rated_w = 0, headroom_percent = 20, tap_watts = 0, tap_count = 0, line_voltage_v = 70.7, run_length_ft = 0, wire_ohms_per_1000ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const rating = Number(amp_rated_w);
  const V = Number(line_voltage_v);
  if (!(rating > 0)) return { error: "Amplifier rated power must be positive (W)." };
  if (!(V > 0)) return { error: "Line voltage must be positive (V)." };
  const tw = Math.max(0, Number(tap_watts) || 0);
  const tc = Math.max(0, Number(tap_count) || 0);
  const total_tap_w = tw * tc;
  const headroom = Number(headroom_percent) || 0;
  const budget_limit_w = rating * (1 - headroom / 100);
  const within_budget = total_tap_w <= budget_limit_w;
  const notes = [];
  let reflected_impedance_ohm = null;
  if (total_tap_w > 0) reflected_impedance_ohm = (V * V) / total_tap_w;
  else notes.push("No tap load entered: line impedance is suppressed (open line).");
  const remaining_w = budget_limit_w - total_tap_w;
  const max_additional_taps = (tw > 0 && remaining_w > 0) ? Math.floor(remaining_w / tw) : 0;
  if (!within_budget) notes.push("Tap load " + fmt(total_tap_w, 1) + " W exceeds the amplifier budget (" + fmt(budget_limit_w, 1) + " W at " + headroom + "% headroom).");
  // Line loss over the run (optional).
  let line_loss_db = null;
  const len = Number(run_length_ft) || 0;
  const ohms_per_kft = Number(wire_ohms_per_1000ft) || 0;
  if (len > 0 && ohms_per_kft > 0 && total_tap_w > 0) {
    const I = total_tap_w / V;
    const R = 2 * (len / 1000) * ohms_per_kft;
    const p_loss = I * I * R;
    const delivered = Math.max(total_tap_w - p_loss, 1e-9);
    line_loss_db = 10 * Math.log10(total_tap_w / delivered);
  }
  notes.push("Constant-voltage line; the amplifier spec governs. Distinct from the low-impedance speaker-impedance tile (Group N).");
  return { total_tap_w, budget_limit_w, within_budget, reflected_impedance_ohm, max_additional_taps, line_voltage_v: V, line_loss_db, notes };
}
export const speaker70vLineExample = { inputs: { amp_rated_w: 200, headroom_percent: 20, tap_watts: 8, tap_count: 16, line_voltage_v: 70.7 } };

function _renderSpeaker70vLine(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Constant-voltage (70 V / 100 V) distributed-audio line design - tap-wattage budget, reflected line impedance Z = V^2/P, and run line-loss - per the standard 70 V distributed-system practice and NEC Article 640 / 725 (Class 2/3 audio) wiring, by name; first-principles Ohm's law. Distinct from the low-impedance speaker-impedance (Group N) tile. The amplifier spec governs.";
  const amp = makeNumber("Amplifier rated power (W)", "s70-amp", { step: "any", min: "0" });
  const head = makeNumber("Headroom (%)", "s70-head", { step: "any", min: "0", value: "20" });
  const tw = makeNumber("Watts per tap (W)", "s70-tw", { step: "any", min: "0" });
  const tc = makeNumber("Number of taps", "s70-tc", { step: "1", min: "0" });
  const volt = makeSelect("Line voltage", "s70-v", [
    { value: "70.7", label: "70.7 V", selected: true }, { value: "100", label: "100 V" },
  ]);
  const len = makeNumber("Run length (ft, optional)", "s70-len", { step: "any", min: "0" });
  const ohms = makeNumber("Wire ohms / 1000 ft (optional)", "s70-ohms", { step: "any", min: "0" });
  head.input.value = "20";
  for (const f of [amp, head, tw, tc, volt, len, ohms]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { amp.input.value = "200"; head.input.value = "20"; tw.input.value = "8"; tc.input.value = "16"; volt.select.value = "70.7"; len.input.value = ""; ohms.input.value = ""; update(); });
  const oLoad = makeOutputLine(outputRegion, "Tap load / budget", "s70-out-load");
  const oZ = makeOutputLine(outputRegion, "Reflected impedance", "s70-out-z");
  const oTaps = makeOutputLine(outputRegion, "Taps remaining / line loss", "s70-out-taps");
  const oNote = makeOutputLine(outputRegion, "Notes", "s70-out-note");
  const update = debounce(() => {
    const r = computeSpeaker70vLine({ amp_rated_w: Number(amp.input.value) || 0, headroom_percent: Number(head.input.value) || 0, tap_watts: Number(tw.input.value) || 0, tap_count: Number(tc.input.value) || 0, line_voltage_v: Number(volt.select.value), run_length_ft: Number(len.input.value) || 0, wire_ohms_per_1000ft: Number(ohms.input.value) || 0 });
    if (r.error) { oLoad.textContent = r.error; oZ.textContent = "-"; oTaps.textContent = "-"; oNote.textContent = ""; return; }
    oLoad.textContent = fmt(r.total_tap_w, 1) + " W of " + fmt(r.budget_limit_w, 1) + " W - " + (r.within_budget ? "within budget" : "OVER budget");
    oZ.textContent = r.reflected_impedance_ohm === null ? "(open line)" : fmt(r.reflected_impedance_ohm, 1) + " ohm";
    oTaps.textContent = r.max_additional_taps + " more taps" + (r.line_loss_db !== null ? "; line loss " + fmt(r.line_loss_db, 2) + " dB" : "");
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [amp.input, head.input, tw.input, tc.input, len.input, ohms.input]) f.addEventListener("input", update);
  volt.select.addEventListener("change", update);
}
LOWVOLTAGE_RENDERERS["speaker-70v-line"] = _renderSpeaker70vLine;

// ---------------------------------------------------------------------
// Z.5 Fire-alarm / security standby battery sizing (standby-battery-sizing)
// ---------------------------------------------------------------------
const _BATTERY_STANDARD_AH = [4, 7, 8, 12, 18, 26, 33, 40, 55, 75, 100];
// dims: in { standby_current_a: I, standby_hours: T, alarm_current_a: I, alarm_minutes: T, derate: dimensionless } out: { required_ah: dimensionless, next_standard_ah: dimensionless }
export function computeStandbyBatterySizing({ standby_current_a = 0, standby_hours = 0, alarm_current_a = 0, alarm_minutes = 0, derate = 1.2 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Is = Number(standby_current_a), Hs = Number(standby_hours);
  const Ia = Number(alarm_current_a), Ma = Number(alarm_minutes);
  const d = Number(derate);
  if (!(Is >= 0) || !(Hs >= 0) || !(Ia >= 0) || !(Ma >= 0)) return { error: "Currents and periods must be non-negative." };
  if (!(d > 0)) return { error: "Derate factor must be positive." };
  const standby_ah = Is * Hs;
  const alarm_ah = Ia * (Ma / 60);
  const required_ah = (standby_ah + alarm_ah) * d;
  let next_standard_ah = null;
  for (const s of _BATTERY_STANDARD_AH) { if (s >= required_ah) { next_standard_ah = s; break; } }
  const notes = [];
  if (d < 1) notes.push("Derate factor below 1 credits the battery rather than de-rating it (NFPA 72 expects an aging/derate >= 1.0; commonly 1.2).");
  if (next_standard_ah === null) notes.push("Required capacity exceeds the bundled standard-size list; enter a larger battery size.");
  notes.push("Per NFPA 72 §10.6 (secondary power) and the panel manufacturer's worksheet. The AHJ-adopted NFPA 72 edition, the listed panel, and the battery manufacturer's derating govern.");
  return { standby_ah, alarm_ah, required_ah, next_standard_ah, derate: d, notes };
}
export const standbyBatterySizingExample = { inputs: { standby_current_a: 0.5, standby_hours: 24, alarm_current_a: 2.0, alarm_minutes: 5, derate: 1.2 } };

function _renderStandbyBatterySizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Secondary (standby) battery sizing for a fire-alarm or security control unit - standby amp-hours plus alarm amp-hours times the aging/derate factor - per NFPA 72 National Fire Alarm and Signaling Code §10.6 (secondary power supply) and the panel manufacturer's battery-calculation worksheet, by name. The AHJ-adopted NFPA 72 edition, the listed panel, and the battery manufacturer's derating govern.";
  const is = makeNumber("Standby (supervisory) current (A)", "sb-is", { step: "any", min: "0" });
  const hs = makeNumber("Standby period (h)", "sb-hs", { step: "any", min: "0", value: "24" });
  const ia = makeNumber("Alarm current (A)", "sb-ia", { step: "any", min: "0" });
  const ma = makeNumber("Alarm period (min)", "sb-ma", { step: "any", min: "0", value: "5" });
  const d = makeNumber("Derate / aging factor", "sb-d", { step: "any", min: "0", value: "1.2" });
  hs.input.value = "24"; ma.input.value = "5"; d.input.value = "1.2";
  for (const f of [is, hs, ia, ma, d]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { is.input.value = "0.5"; hs.input.value = "24"; ia.input.value = "2.0"; ma.input.value = "5"; d.input.value = "1.2"; update(); });
  const oReq = makeOutputLine(outputRegion, "Required capacity (Ah)", "sb-out-req");
  const oParts = makeOutputLine(outputRegion, "Standby / alarm contributions", "sb-out-parts");
  const oStd = makeOutputLine(outputRegion, "Next standard battery", "sb-out-std");
  const oNote = makeOutputLine(outputRegion, "Notes", "sb-out-note");
  const update = debounce(() => {
    const r = computeStandbyBatterySizing({ standby_current_a: Number(is.input.value) || 0, standby_hours: Number(hs.input.value) || 0, alarm_current_a: Number(ia.input.value) || 0, alarm_minutes: Number(ma.input.value) || 0, derate: Number(d.input.value) || 0 });
    if (r.error) { oReq.textContent = r.error; oParts.textContent = "-"; oStd.textContent = "-"; oNote.textContent = ""; return; }
    oReq.textContent = fmt(r.required_ah, 2) + " Ah";
    oParts.textContent = "standby " + fmt(r.standby_ah, 2) + " Ah + alarm " + fmt(r.alarm_ah, 3) + " Ah, x " + fmt(r.derate, 2) + " derate";
    oStd.textContent = r.next_standard_ah === null ? "(over the bundled list)" : r.next_standard_ah + " Ah";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [is.input, hs.input, ia.input, ma.input, d.input]) f.addEventListener("input", update);
}
LOWVOLTAGE_RENDERERS["standby-battery-sizing"] = _renderStandbyBatterySizing;

// dims: in { battery_ah: dimensionless, standby_current_a: I, alarm_current_a: I, alarm_minutes: T, derate: dimensionless } out: { standby_hours: T }
export function computeStandbyBatteryRuntime({ battery_ah = 0, standby_current_a = 0, alarm_current_a = 0, alarm_minutes = 0, derate = 1.2 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Ah = Number(battery_ah), Is = Number(standby_current_a);
  const Ia = Number(alarm_current_a), Ma = Number(alarm_minutes);
  const d = Number(derate);
  if (!(Ah > 0)) return { error: "Battery capacity must be positive (Ah)." };
  if (!(Is > 0)) return { error: "Standby current must be positive (A)." };
  if (!(Ia >= 0) || !(Ma >= 0)) return { error: "Alarm current and period must be non-negative." };
  if (!(d > 0)) return { error: "Derate factor must be positive." };
  const alarm_ah = Ia * (Ma / 60);
  const usable_ah = Ah / d;
  // Inverse of required_ah = (Is x Hs + Ia x Ma/60) x derate: Hs = (Ah/derate - alarm_ah) / Is.
  const standby_hours = (usable_ah - alarm_ah) / Is;
  if (!Number.isFinite(standby_hours)) return { error: "Runtime math is not a finite value." };
  if (!(standby_hours > 0)) return { error: "Battery is too small to cover even the alarm load after derating; no standby time remains." };
  return {
    standby_hours, alarm_ah, usable_ah, derate: d,
    note: "The standby (supervisory) time an installed battery supports before the alarm load, the inverse of the standby-battery-sizing tile: from required_Ah = (Is x Hs + Ia x Ma/60) x derate, Hs = (battery_Ah/derate - alarm_Ah) / Is. The derate (aging) factor is applied to the battery capacity, not credited, so the usable Ah is the nameplate divided by the derate (NFPA 72 expects >= 1.0, commonly 1.2). The alarm reserve (alarm current x alarm minutes) is subtracted first, then the remainder divides by the standby current. This is a design check against an NFPA 72 required standby period (commonly 24 h with 5 or 15 min of alarm); the AHJ-adopted edition, the listed panel, and the battery manufacturer's derating govern."
  };
}
export const standbyBatteryRuntimeExample = { inputs: { battery_ah: 14.6, standby_current_a: 0.5, alarm_current_a: 2.0, alarm_minutes: 5, derate: 1.2 } };

function _renderStandbyBatteryRuntime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: secondary (standby) battery runtime for a fire-alarm or security control unit, the inverse of the sizing worksheet: Hs = (battery_Ah/derate - alarm_Ah) / standby_current, per NFPA 72 §10.6 (secondary power supply), by name. The AHJ-adopted NFPA 72 edition, the listed panel, and the battery manufacturer's derating govern.";
  const ah = makeNumber("Installed battery capacity (Ah)", "sbr-ah", { step: "any", min: "0" });
  const is = makeNumber("Standby (supervisory) current (A)", "sbr-is", { step: "any", min: "0" });
  const ia = makeNumber("Alarm current (A)", "sbr-ia", { step: "any", min: "0" });
  const ma = makeNumber("Alarm period (min)", "sbr-ma", { step: "any", min: "0", value: "5" });
  const d = makeNumber("Derate / aging factor", "sbr-d", { step: "any", min: "0", value: "1.2" });
  ma.input.value = "5"; d.input.value = "1.2";
  for (const f of [ah, is, ia, ma, d]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ah.input.value = "14.6"; is.input.value = "0.5"; ia.input.value = "2.0"; ma.input.value = "5"; d.input.value = "1.2"; update(); });
  const oHrs = makeOutputLine(outputRegion, "Standby time supported", "sbr-out-hrs");
  const oNote = makeOutputLine(outputRegion, "Note", "sbr-out-note");
  const update = debounce(() => {
    const r = computeStandbyBatteryRuntime({ battery_ah: Number(ah.input.value) || 0, standby_current_a: Number(is.input.value) || 0, alarm_current_a: Number(ia.input.value) || 0, alarm_minutes: Number(ma.input.value) || 0, derate: Number(d.input.value) || 0 });
    if (r.error) { oHrs.textContent = r.error; oNote.textContent = ""; return; }
    oHrs.textContent = fmt(r.standby_hours, 1) + " h";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ah.input, is.input, ia.input, ma.input, d.input]) f.addEventListener("input", update);
}
LOWVOLTAGE_RENDERERS["standby-battery-runtime"] = _renderStandbyBatteryRuntime;

// ---------------------------------------------------------------------
// Z.6 Coaxial cable attenuation (coax-rg-loss)
// ---------------------------------------------------------------------
// dims: in { loss_per_100ft_db: dimensionless, length_ft: L, source_level: dimensionless, target_level: dimensionless } out: { total_loss_db: dimensionless, end_level: dimensionless, max_run_ft: L }
export function computeCoaxRgLoss({ mode = "loss", loss_per_100ft_db = 0, length_ft = 0, source_level = null, target_level = null } = {}) {
  const _g = _finiteGuard({ loss_per_100ft_db, length_ft }); if (_g) return _g;
  const lp = Number(loss_per_100ft_db);
  if (!(lp > 0)) return { error: "Per-100-ft loss must be positive (dB)." };

  if (mode === "max-run") {
    const src = Number(source_level), tgt = Number(target_level);
    if (!Number.isFinite(src) || !Number.isFinite(tgt)) return { error: "Enter source and target levels for max-run." };
    if (!(src > tgt)) return { error: "Source level must exceed the target level." };
    const max_run_ft = 100 * (src - tgt) / lp;
    return { mode, loss_per_100ft_db: lp, max_run_ft, source_level: src, target_level: tgt, notes: ["The per-100-ft loss is type- and frequency-specific and user-supplied; the manufacturer's datasheet governs."] };
  }

  const len = Number(length_ft);
  if (!(len > 0)) return { error: "Run length must be positive (ft)." };
  const total_loss_db = lp * len / 100;
  let end_level = null;
  const srcRaw = (source_level !== null && source_level !== undefined && source_level !== "") ? Number(source_level) : null;
  const src = (srcRaw !== null && Number.isFinite(srcRaw)) ? srcRaw : null;
  if (src !== null) end_level = src - total_loss_db;
  return { mode, loss_per_100ft_db: lp, length_ft: len, total_loss_db, source_level: src, end_level, notes: ["The per-100-ft loss is type- and frequency-specific and user-supplied; the manufacturer's datasheet governs."] };
}
export const coaxRgLossExample = { inputs: { mode: "loss", loss_per_100ft_db: 6, length_ft: 100, source_level: 0 } };

const _COAX_DEFAULT_LOSS = { RG6: 6.0, RG59: 11.0, RG11: 3.5 };
function _renderCoaxRgLoss(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Coaxial-cable attenuation from the per-100-ft loss at frequency (loss = per-100-ft x length/100), per the cable manufacturer's published loss curves (Belden / CommScope) and the standard CATV/CCTV/SDI practice, by name; first-principles. The per-100-ft loss is type- and frequency-specific and user-supplied or a flagged default; the manufacturer's datasheet governs.";
  const mode = makeSelect("Mode", "coax-mode", [
    { value: "loss", label: "Loss over a run", selected: true }, { value: "max-run", label: "Max run for a target level" },
  ]);
  const type = makeSelect("Coax type (default loss at ~1 GHz)", "coax-type", [
    { value: "RG6", label: "RG6", selected: true }, { value: "RG59", label: "RG59" }, { value: "RG11", label: "RG11" },
  ]);
  const lp = makeNumber("Loss per 100 ft (dB)", "coax-lp", { step: "any", min: "0", value: "6" });
  const len = makeNumber("Run length (ft)", "coax-len", { step: "any", min: "0" });
  const src = makeNumber("Source level (dBmV/dBm, optional)", "coax-src", { step: "any" });
  const tgt = makeNumber("Target level (max-run mode)", "coax-tgt", { step: "any" });
  for (const f of [mode, type, lp, len, src, tgt]) inputRegion.appendChild(f.wrap);
  function fillLoss() { const d = _COAX_DEFAULT_LOSS[type.select.value]; if (d) lp.input.value = String(d); }
  fillLoss();
  attachExampleButton(inputRegion, () => { mode.select.value = "loss"; type.select.value = "RG6"; fillLoss(); len.input.value = "100"; src.input.value = "0"; tgt.input.value = ""; update(); });
  const oLoss = makeOutputLine(outputRegion, "Total attenuation / max run", "coax-out-loss");
  const oEnd = makeOutputLine(outputRegion, "End-of-run level", "coax-out-end");
  const oNote = makeOutputLine(outputRegion, "Notes", "coax-out-note");
  const update = debounce(() => {
    const r = computeCoaxRgLoss({ mode: mode.select.value, loss_per_100ft_db: Number(lp.input.value) || 0, length_ft: Number(len.input.value) || 0, source_level: src.input.value === "" ? null : Number(src.input.value), target_level: tgt.input.value === "" ? null : Number(tgt.input.value) });
    if (r.error) { oLoss.textContent = r.error; oEnd.textContent = "-"; oNote.textContent = ""; return; }
    if (r.mode === "max-run") { oLoss.textContent = fmt(r.max_run_ft, 1) + " ft max run"; oEnd.textContent = "to reach " + fmt(r.target_level, 1) + " from " + fmt(r.source_level, 1); }
    else { oLoss.textContent = fmt(r.total_loss_db, 2) + " dB"; oEnd.textContent = r.end_level === null ? "(enter source level)" : fmt(r.end_level, 2); }
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [lp.input, len.input, src.input, tgt.input]) f.addEventListener("input", update);
  mode.select.addEventListener("change", update);
  type.select.addEventListener("change", () => { fillLoss(); update(); });
}
LOWVOLTAGE_RENDERERS["coax-rg-loss"] = _renderCoaxRgLoss;

// ===================== spec-v456: camera lens field of view and pixel density (DORI) =====================
// dims: in { sensor_width_mm: L, focal_length_mm: L, distance_ft: L, h_pixels: dimensionless } out: { fov_deg: dimensionless, scene_ft: L, ppf: dimensionless }
export function computeCameraLensFov({ sensor_width_mm = 0, focal_length_mm = 0, distance_ft = 0, h_pixels = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const sensor = Number(sensor_width_mm) || 0;
  const focal = Number(focal_length_mm) || 0;
  const dist = Number(distance_ft) || 0;
  const px = Number(h_pixels) || 0;
  if (!(sensor > 0)) return { error: "Sensor width must be positive (mm)." };
  if (!(focal > 0)) return { error: "Focal length must be positive (mm)." };
  if (!(dist > 0)) return { error: "Target distance must be positive (ft)." };
  if (!(px > 0)) return { error: "Horizontal resolution must be positive (pixels)." };
  const fov_deg = 2 * Math.atan(sensor / (2 * focal)) * 180 / Math.PI;
  const scene_ft = dist * sensor / focal;
  const ppf = px / scene_ft;
  const dori = ppf >= 76 ? "Identify (>= 76 ppf)" : ppf >= 38 ? "Recognize (>= 38 ppf)" : ppf >= 19 ? "Observe (>= 19 ppf)" : ppf >= 8 ? "Detect (>= 8 ppf)" : "below Detect (< 8 ppf)";
  return {
    fov_deg, scene_ft, ppf, dori,
    note: "Camera lens field of view and pixel density (IEC 62676-4 DORI): the horizontal field of view is 2 x atan(sensor width / (2 x focal length)); the scene width at the target = distance x sensor / focal; the pixel density in pixels per foot (ppf) = horizontal resolution / scene width. The DORI bands set the density needed for a task: Detect 8 ppf, Observe 19, Recognize 38, Identify 76 (per meter these are 25/63/125/250 ppm). A longer lens narrows the FOV and raises the density at that distance. A design aid; verify against the manufacturer's lens chart and a live view.",
  };
}
export const cameraLensFovExample = { inputs: { sensor_width_mm: 5.37, focal_length_mm: 4, distance_ft: 30, h_pixels: 1920 } };
function _renderCameraLensFov(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Camera FOV and pixel density (IEC 62676-4 DORI): FOV = 2 atan(sensor/(2 focal)); scene = distance x sensor/focal; ppf = pixels/scene. DORI bands Detect 8 / Observe 19 / Recognize 38 / Identify 76 ppf. A design aid; verify against the lens chart and a live view.";
  const sw = makeNumber("Sensor width (mm, e.g. 1/2.7in = 5.37)", "clf-sw", { step: "any", min: "0" }); sw.input.value = "5.37";
  const fl = makeNumber("Focal length (mm)", "clf-fl", { step: "any", min: "0" }); fl.input.value = "4";
  const di = makeNumber("Target distance (ft)", "clf-di", { step: "any", min: "0" }); di.input.value = "30";
  const px = makeNumber("Horizontal resolution (pixels)", "clf-px", { step: "1", min: "0" }); px.input.value = "1920";
  for (const f of [sw, fl, di, px]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sw.input.value = "5.37"; fl.input.value = "4"; di.input.value = "30"; px.input.value = "1920"; update(); });
  const oFov = makeOutputLine(outputRegion, "Horizontal FOV / scene width", "clf-out-fov");
  const oPpf = makeOutputLine(outputRegion, "Pixel density / DORI", "clf-out-ppf");
  const oNote = makeOutputLine(outputRegion, "Note", "clf-out-n");
  const update = debounce(() => {
    const r = computeCameraLensFov({ sensor_width_mm: Number(sw.input.value) || 0, focal_length_mm: Number(fl.input.value) || 0, distance_ft: Number(di.input.value) || 0, h_pixels: Number(px.input.value) || 0 });
    if (r.error) { oFov.textContent = r.error; oPpf.textContent = "-"; oNote.textContent = ""; return; }
    oFov.textContent = fmt(r.fov_deg, 1) + " deg over " + fmt(r.scene_ft, 1) + " ft";
    oPpf.textContent = fmt(r.ppf, 1) + " ppf -- " + r.dori;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [sw, fl, di, px]) f.input.addEventListener("input", update);
}
LOWVOLTAGE_RENDERERS["camera-lens-fov"] = _renderCameraLensFov;

// camera-max-distance-for-ppf: inverse of camera-lens-fov. The forward tile gives the pixel density at a distance; the
// inverse recovers the farthest distance at which a camera still meets a target pixel density (a DORI task), so a
// designer places the camera to still Identify / Recognize at the target. From ppf = px x focal / (distance x sensor),
// distance_max = px x focal / (target_ppf x sensor). It also reports the scene width and the constant horizontal FOV.
// dims: in { sensor_width_mm: L, focal_length_mm: L, h_pixels: dimensionless, target_ppf: L^-1 } out: { max_distance_ft: L, scene_ft: L, fov_deg: dimensionless }
export function computeCameraMaxDistanceForPpf({ sensor_width_mm = 0, focal_length_mm = 0, h_pixels = 0, target_ppf = 76 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const sensor = Number(sensor_width_mm) || 0;
  const focal = Number(focal_length_mm) || 0;
  const px = Number(h_pixels) || 0;
  const ppf = Number(target_ppf) || 0;
  if (!(sensor > 0)) return { error: "Sensor width must be positive (mm)." };
  if (!(focal > 0)) return { error: "Focal length must be positive (mm)." };
  if (!(px > 0)) return { error: "Horizontal resolution must be positive (pixels)." };
  if (!(ppf > 0)) return { error: "Target pixel density must be positive (ppf)." };
  const max_distance_ft = (px * focal) / (ppf * sensor);
  const scene_ft = max_distance_ft * sensor / focal;
  const fov_deg = 2 * Math.atan(sensor / (2 * focal)) * 180 / Math.PI;
  if (![max_distance_ft, scene_ft, fov_deg].every(Number.isFinite)) return { error: "Max-distance math is not a finite value." };
  const band = ppf >= 76 ? "Identify (>= 76 ppf)" : ppf >= 38 ? "Recognize (>= 38 ppf)" : ppf >= 19 ? "Observe (>= 19 ppf)" : ppf >= 8 ? "Detect (>= 8 ppf)" : "below Detect (< 8 ppf)";
  return {
    max_distance_ft, scene_ft, fov_deg, band,
    note: "Max distance for a pixel density = horizontal resolution x focal length / (target ppf x sensor width), the inverse of ppf = px x focal / (distance x sensor). Beyond this distance the density falls below the target and the DORI task (Detect 8, Observe 19, Recognize 38, Identify 76 ppf) is not met. The horizontal FOV = 2 x atan(sensor / (2 x focal)) is fixed by the lens and does not change with distance - a longer lens reaches farther for the same density but narrows the view. A design aid; verify against the manufacturer's lens chart, the low-light performance, and a live view.",
  };
}
export const cameraMaxDistanceForPpfExample = { inputs: { sensor_width_mm: 5.37, focal_length_mm: 4, h_pixels: 1920, target_ppf: 76 } };
function _renderCameraMaxDistanceForPpf(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Camera pixel density (IEC 62676-4 DORI): ppf = px x focal / (distance x sensor), solved for the distance: distance_max = px x focal / (target ppf x sensor). DORI bands Detect 8 / Observe 19 / Recognize 38 / Identify 76 ppf. A design aid; verify against the lens chart and a live view.";
  const sw = makeNumber("Sensor width (mm, e.g. 1/2.7in = 5.37)", "cmd-sw", { step: "any", min: "0" }); sw.input.value = "5.37";
  const fl = makeNumber("Focal length (mm)", "cmd-fl", { step: "any", min: "0" }); fl.input.value = "4";
  const px = makeNumber("Horizontal resolution (pixels)", "cmd-px", { step: "1", min: "0" }); px.input.value = "1920";
  const tp = makeNumber("Target pixel density (ppf, 76 = Identify)", "cmd-tp", { step: "any", min: "0" }); tp.input.value = "76";
  for (const f of [sw, fl, px, tp]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sw.input.value = "5.37"; fl.input.value = "4"; px.input.value = "1920"; tp.input.value = "76"; update(); });
  const oDist = makeOutputLine(outputRegion, "Max distance for that density", "cmd-out-dist");
  const oScene = makeOutputLine(outputRegion, "Scene width / FOV at that distance", "cmd-out-scene");
  const oNote = makeOutputLine(outputRegion, "Note", "cmd-out-n");
  const update = debounce(() => {
    const r = computeCameraMaxDistanceForPpf({ sensor_width_mm: Number(sw.input.value) || 0, focal_length_mm: Number(fl.input.value) || 0, h_pixels: Number(px.input.value) || 0, target_ppf: Number(tp.input.value) || 0 });
    if (r.error) { oDist.textContent = r.error; oScene.textContent = "-"; oNote.textContent = ""; return; }
    oDist.textContent = fmt(r.max_distance_ft, 1) + " ft (" + r.band + ")";
    oScene.textContent = fmt(r.scene_ft, 1) + " ft wide, " + fmt(r.fov_deg, 1) + " deg FOV";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [sw, fl, px, tp]) f.input.addEventListener("input", update);
}
LOWVOLTAGE_RENDERERS["camera-max-distance-for-ppf"] = _renderCameraMaxDistanceForPpf;

// ===================== spec-v457: ceiling speaker coverage and spacing =====================
// dims: in { ceiling_ft: L, ear_ft: L, coverage_deg: dimensionless, room_area_ft2: L^2, layout: dimensionless } out: { diameter_ft: L, spacing_ft: L, count: dimensionless }
export function computeCeilingSpeakerCoverage({ ceiling_ft = 0, ear_ft = 0, coverage_deg = 90, room_area_ft2 = 0, layout = "edge_to_edge" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ceiling = Number(ceiling_ft) || 0;
  const ear = Number(ear_ft) || 0;
  const cov = Number(coverage_deg) || 0;
  const area = Number(room_area_ft2) || 0;
  if (!(ceiling > 0)) return { error: "Ceiling height must be positive (ft)." };
  if (!(ear >= 0)) return { error: "Ear height must be non-negative (ft)." };
  if (!(ceiling > ear)) return { error: "Ceiling must be above the listener ear height." };
  if (!(cov > 0 && cov < 180)) return { error: "Coverage angle must be between 0 and 180 deg." };
  if (!(area > 0)) return { error: "Room area must be positive (ft^2)." };
  const diameter_ft = 2 * (ceiling - ear) * Math.tan((cov / 2) * Math.PI / 180);
  const spacing_ft = layout === "minimum_overlap" ? 0.7 * diameter_ft : diameter_ft;
  const count = Math.ceil(area / (spacing_ft * spacing_ft));
  return {
    diameter_ft, spacing_ft, count, overlap: layout === "minimum_overlap",
    note: "Ceiling speaker coverage and spacing: a ceiling speaker covers a cone whose diameter at the listener plane = 2 x (ceiling - ear height) x tan(coverage angle / 2). Spacing edge-to-edge (speakers just touching, spacing = diameter) gives minimum count but the level dips between speakers; minimum-overlap spacing = 0.7 x diameter (each covers where its neighbor is at -6 dB) gives even coverage for more speakers. Count = ceil(room area / spacing^2). A layout aid; verify with the speaker's coverage-angle spec at the design frequency (angle narrows at high frequency) and the target SPL.",
  };
}
export const ceilingSpeakerCoverageExample = { inputs: { ceiling_ft: 10, ear_ft: 4, coverage_deg: 90, room_area_ft2: 1200, layout: "edge_to_edge" } };
function _renderCeilingSpeakerCoverage(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Ceiling speaker coverage: diameter = 2 x (ceiling - ear) x tan(angle/2); spacing = diameter (edge-to-edge) or 0.7 x diameter (minimum overlap, -6 dB); count = ceil(area / spacing^2). A layout aid; verify with the speaker's coverage angle at the design frequency and the target SPL.";
  const ch = makeNumber("Ceiling height (ft)", "csc-ch", { step: "any", min: "0" }); ch.input.value = "10";
  const ea = makeNumber("Listener ear height (ft, seated ~4)", "csc-ea", { step: "any", min: "0" }); ea.input.value = "4";
  const co = makeNumber("Speaker coverage angle (deg, ~90)", "csc-co", { step: "any", min: "0" }); co.input.value = "90";
  const ar = makeNumber("Room area (ft^2)", "csc-ar", { step: "any", min: "0" }); ar.input.value = "1200";
  const ly = makeSelect("Layout", "csc-ly", [
    { value: "edge_to_edge", label: "Edge-to-edge (minimum count)", selected: true }, { value: "minimum_overlap", label: "Minimum overlap (even coverage)" },
  ]);
  for (const f of [ch, ea, co, ar, ly]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ch.input.value = "10"; ea.input.value = "4"; co.input.value = "90"; ar.input.value = "1200"; ly.select.value = "edge_to_edge"; update(); });
  const oDia = makeOutputLine(outputRegion, "Coverage diameter / spacing", "csc-out-dia");
  const oCount = makeOutputLine(outputRegion, "Speaker count", "csc-out-count");
  const oNote = makeOutputLine(outputRegion, "Note", "csc-out-n");
  const update = debounce(() => {
    const r = computeCeilingSpeakerCoverage({ ceiling_ft: Number(ch.input.value) || 0, ear_ft: Number(ea.input.value) || 0, coverage_deg: Number(co.input.value) || 0, room_area_ft2: Number(ar.input.value) || 0, layout: ly.select.value });
    if (r.error) { oDia.textContent = r.error; oCount.textContent = "-"; oNote.textContent = ""; return; }
    oDia.textContent = fmt(r.diameter_ft, 1) + " ft dia, " + fmt(r.spacing_ft, 1) + " ft spacing (" + (r.overlap ? "minimum overlap" : "edge-to-edge") + ")";
    oCount.textContent = r.count + " speaker(s)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ch, ea, co, ar]) f.input.addEventListener("input", update);
  ly.select.addEventListener("change", update);
}
LOWVOLTAGE_RENDERERS["ceiling-speaker-coverage"] = _renderCeilingSpeakerCoverage;

// ===================== spec-v740: ceiling speaker coverage angle for a target diameter (inverse of ceiling-speaker-coverage) =====================
// The forward tile gives the coverage diameter from the speaker's coverage angle; the inverse recovers the coverage
// angle a target coverage diameter (or on-center spacing) needs at a mounting drop, so a designer specs a speaker whose
// coverage angle hits the layout. From diameter = 2 x (ceiling - ear) x tan(angle/2),
// angle = 2 x atan( diameter / (2 x (ceiling - ear)) ).
// dims: in { ceiling_ft: L, ear_ft: L, target_diameter_ft: L } out: { coverage_deg: dimensionless, drop_ft: L }
export function computeCeilingSpeakerCoverageAngle({ ceiling_ft = 0, ear_ft = 0, target_diameter_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ceiling = Number(ceiling_ft) || 0;
  const ear = Number(ear_ft) || 0;
  const dia = Number(target_diameter_ft) || 0;
  if (!(ceiling > 0)) return { error: "Ceiling height must be positive (ft)." };
  if (!(ear >= 0)) return { error: "Ear height must be non-negative (ft)." };
  if (!(ceiling > ear)) return { error: "Ceiling must be above the listener ear height." };
  if (!(dia > 0)) return { error: "Target coverage diameter must be positive (ft)." };
  const drop_ft = ceiling - ear;
  const coverage_deg = 2 * Math.atan(dia / (2 * drop_ft)) * 180 / Math.PI;
  if (![coverage_deg, drop_ft].every(Number.isFinite)) return { error: "Coverage-angle math is not a finite value." };
  return {
    coverage_deg, drop_ft,
    note: "Required coverage angle = 2 x atan( target diameter / (2 x (ceiling - ear)) ), the inverse of diameter = 2 x (ceiling - ear) x tan(angle/2). Spec a speaker whose rated coverage angle at the design frequency is at least this wide; the coverage angle narrows at high frequency, so a speaker rated exactly here dims the highs at the edge of the pattern. For edge-to-edge layout set the target diameter to the on-center spacing; for even (minimum-overlap) coverage set it to spacing / 0.7. A layout aid; verify with the speaker's coverage-angle spec and the target SPL.",
  };
}
export const ceilingSpeakerCoverageAngleExample = { inputs: { ceiling_ft: 10, ear_ft: 4, target_diameter_ft: 8 } };
function _renderCeilingSpeakerCoverageAngle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Ceiling speaker coverage: diameter = 2 x (ceiling - ear) x tan(angle/2), solved for the angle: coverage angle = 2 x atan( diameter / (2 x (ceiling - ear)) ). A layout aid; verify with the speaker's coverage angle at the design frequency and the target SPL.";
  const ch = makeNumber("Ceiling height (ft)", "csa-ch", { step: "any", min: "0" }); ch.input.value = "10";
  const ea = makeNumber("Listener ear height (ft, seated ~4)", "csa-ea", { step: "any", min: "0" }); ea.input.value = "4";
  const dia = makeNumber("Target coverage diameter / spacing (ft)", "csa-dia", { step: "any", min: "0" }); dia.input.value = "8";
  for (const f of [ch, ea, dia]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ch.input.value = "10"; ea.input.value = "4"; dia.input.value = "8"; update(); });
  const oAngle = makeOutputLine(outputRegion, "Required coverage angle", "csa-out-angle");
  const oNote = makeOutputLine(outputRegion, "Note", "csa-out-n");
  const update = debounce(() => {
    const r = computeCeilingSpeakerCoverageAngle({ ceiling_ft: Number(ch.input.value) || 0, ear_ft: Number(ea.input.value) || 0, target_diameter_ft: Number(dia.input.value) || 0 });
    if (r.error) { oAngle.textContent = r.error; oNote.textContent = ""; return; }
    oAngle.textContent = fmt(r.coverage_deg, 1) + " deg (drop " + fmt(r.drop_ft, 1) + " ft)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ch, ea, dia]) f.input.addEventListener("input", update);
}
LOWVOLTAGE_RENDERERS["ceiling-speaker-coverage-angle"] = _renderCeilingSpeakerCoverageAngle;

// ===================== spec-v458: structured cabling channel length (TIA-568) =====================
// dims: in { permanent_link_m: L, cords_m: L, temp_c: dimensionless, derate_per_c: dimensionless } out: { max_pl_m: L, channel_m: L }
export function computeStructuredCablingChannel({ permanent_link_m = 0, cords_m = 0, temp_c = 20, derate_per_c = 0.004 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const pl = Number(permanent_link_m) || 0;
  const cords = Number(cords_m) || 0;
  const temp = Number(temp_c) || 0;
  const derate = Number(derate_per_c) || 0;
  if (!(pl > 0)) return { error: "Permanent-link length must be positive (m)." };
  if (cords < 0) return { error: "Cord length must be non-negative (m)." };
  if (derate < 0) return { error: "De-rate factor must be non-negative." };
  const max_pl_m = 90 * (1 - Math.max(temp - 20, 0) * derate);
  const channel_m = pl + cords;
  const pl_ok = pl <= max_pl_m;
  const chan_ok = channel_m <= 100;
  return {
    max_pl_m, channel_m, pl_ok, chan_ok, ok: pl_ok && chan_ok,
    note: "Structured cabling channel length (TIA-568): a horizontal channel is limited to 100 m total = a 90 m permanent link (the fixed horizontal cable) plus up to 10 m of patch and equipment cords. Above 20 deg C the maximum permanent-link length de-rates (about 0.4% per deg C for UTP, more for screened cable) because warmer copper has higher resistance and insertion loss, so a hot ceiling or plenum shortens the allowed run. The channel passes only if the permanent link is within its de-rated maximum AND the total channel is within 100 m. A design aid; the specific cable's published de-rating and the TIA-568 edition adopted govern.",
  };
}
export const structuredCablingChannelExample = { inputs: { permanent_link_m: 85, cords_m: 8, temp_c: 20, derate_per_c: 0.004 } };
function _renderStructuredCablingChannel(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Structured cabling channel (TIA-568): 100 m total = 90 m permanent link + up to 10 m cords; above 20 deg C the max permanent link de-rates ~0.4%/deg C (UTP). Passes if the link is within its de-rated max and the channel is within 100 m. A design aid; the cable's published de-rating and the adopted TIA-568 edition govern.";
  const pl = makeNumber("Permanent-link length (m)", "scc-pl", { step: "any", min: "0" }); pl.input.value = "85";
  const cd = makeNumber("Total patch + equipment cords (m)", "scc-cd", { step: "any", min: "0" }); cd.input.value = "8";
  const tc = makeNumber("Installed cable temperature (deg C)", "scc-tc", { step: "any" }); tc.input.value = "20";
  const dr = makeNumber("De-rate per deg C above 20 (0.004 UTP)", "scc-dr", { step: "any", min: "0" }); dr.input.value = "0.004";
  for (const f of [pl, cd, tc, dr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { pl.input.value = "85"; cd.input.value = "8"; tc.input.value = "20"; dr.input.value = "0.004"; update(); });
  const oPl = makeOutputLine(outputRegion, "Permanent link vs de-rated max", "scc-out-pl");
  const oCh = makeOutputLine(outputRegion, "Channel vs 100 m", "scc-out-ch");
  const oNote = makeOutputLine(outputRegion, "Note", "scc-out-n");
  const update = debounce(() => {
    const r = computeStructuredCablingChannel({ permanent_link_m: Number(pl.input.value) || 0, cords_m: Number(cd.input.value) || 0, temp_c: Number(tc.input.value) || 0, derate_per_c: Number(dr.input.value) || 0 });
    if (r.error) { oPl.textContent = r.error; oCh.textContent = "-"; oNote.textContent = ""; return; }
    oPl.textContent = fmt(r.max_pl_m, 1) + " m max -- link " + (r.pl_ok ? "OK" : "TOO LONG");
    oCh.textContent = fmt(r.channel_m, 1) + " m -- channel " + (r.chan_ok ? "OK" : "OVER 100 m");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [pl, cd, tc, dr]) f.input.addEventListener("input", update);
}
LOWVOLTAGE_RENDERERS["structured-cabling-channel"] = _renderStructuredCablingChannel;

// ===================== spec-v855: low-voltage cable footage and box count =====================
// dims: in { drops: dimensionless, avg_run_ft: L, slack_ft: L, box_ft: L } out: { total_ft: L, boxes: dimensionless }
export function computeLvCablePullFootage({ drops = 48, avg_run_ft = 120, slack_ft = 15, box_ft = 1000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(drops > 0)) return { error: "Drop count must be positive." };
  if (!(avg_run_ft > 0)) return { error: "Average run must be positive (ft)." };
  if (!(box_ft > 0)) return { error: "Box length must be positive (ft)." };
  if (slack_ft < 0) return { error: "Slack cannot be negative (ft)." };
  const total_ft = drops * (avg_run_ft + slack_ft);
  const boxes = Math.ceil(total_ft / box_ft);
  if (![total_ft, boxes].every(Number.isFinite)) return { error: "Footage math is not a finite value." };
  return {
    total_ft,
    boxes,
    note: "The slack covers service loops at both ends plus rack dressing. Each run's length is limited separately by structured-cabling-channel (the 100 m channel). Cable is bought by the box, so this is the box count to order.",
  };
}

export const lvCablePullFootageExample = { inputs: { drops: 48, avg_run_ft: 120, slack_ft: 15, box_ft: 1000 } };

function _v855renderLvCablePullFootage(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: footage takeoff identity by name. total = drops x (average run + slack); boxes = ceil(total / box length). The slack covers service loops and rack dressing; each run is length-limited by structured-cabling-channel.";
  const d = makeNumber("Number of cable drops", "lvf-d", { step: "any", min: "0", value: "48" });
  d.input.value = "48";
  const ar = makeNumber("Average run length (ft)", "lvf-ar", { step: "any", min: "0", value: "120" });
  ar.input.value = "120";
  const sl = makeNumber("Service-loop / dressing slack per drop (ft)", "lvf-sl", { step: "any", min: "0", value: "15" });
  sl.input.value = "15";
  const bx = makeNumber("Cable box / spool length (ft)", "lvf-bx", { step: "any", min: "0", value: "1000" });
  bx.input.value = "1000";
  for (const f of [d, ar, sl, bx]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { d.input.value = "48"; ar.input.value = "120"; sl.input.value = "15"; bx.input.value = "1000"; update(); });
  const oTotal = makeOutputLine(outputRegion, "Total cable footage", "lvf-out-total");
  const oBoxes = makeOutputLine(outputRegion, "Cable boxes to order", "lvf-out-boxes");
  const update = debounce(() => {
    const r = computeLvCablePullFootage({
      drops: d.input.value === "" ? 48 : Number(d.input.value), avg_run_ft: ar.input.value === "" ? 120 : Number(ar.input.value),
      slack_ft: sl.input.value === "" ? 0 : Number(sl.input.value), box_ft: bx.input.value === "" ? 1000 : Number(bx.input.value),
    });
    if (r.error) { oTotal.textContent = r.error; oBoxes.textContent = "-"; return; }
    oTotal.textContent = fmt(r.total_ft, 0) + " ft";
    oBoxes.textContent = fmt(r.boxes, 0) + " boxes";
  }, DEBOUNCE_MS);
  for (const f of [d, ar, sl, bx]) f.input.addEventListener("input", update);
}
LOWVOLTAGE_RENDERERS["lv-cable-pull-footage"] = _v855renderLvCablePullFootage;

// ===================== spec-v890: J-hook / bridle-ring count and bundle weight =====================
// dims: in { run_ft: L, spacing_ft: L, num_cables: dimensionless, cable_lb_per_ft: M T^-2, hook_wll_lb: M L T^-2 } out: { hooks: dimensionless, load_per_hook_lb: M L T^-2, utilization: dimensionless }
export function computeCableSupportJhook({ run_ft = 400, spacing_ft = 4, num_cables = 50, cable_lb_per_ft = 0.035, hook_wll_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(run_ft > 0)) return { error: "Pathway length must be positive (ft)." };
  if (!(spacing_ft > 0)) return { error: "Hook spacing must be positive (ft)." };
  if (!(num_cables > 0)) return { error: "Cable count must be positive." };
  if (!(cable_lb_per_ft > 0)) return { error: "Cable weight must be positive (lb/ft)." };
  if (hook_wll_lb < 0) return { error: "Hook working load cannot be negative (lb)." };
  const hooks = Math.ceil(run_ft / spacing_ft);
  const load_per_hook_lb = num_cables * cable_lb_per_ft * spacing_ft;
  const utilization = hook_wll_lb > 0 ? load_per_hook_lb / hook_wll_lb : null;
  if (![hooks, load_per_hook_lb].every(Number.isFinite)) return { error: "J-hook math is not a finite value." };
  return {
    hooks,
    load_per_hook_lb,
    utilization,
    note: "TIA-569 non-continuous support runs about 4 to 5 ft on center. The bundle load is the cables times the weight per foot over one span. The bundle fill is also limited so the lower cables are not crushed (roughly 40 to 50 cables per hook). Distinct from the NEC power-raceway support-spacing.",
  };
}

export const cableSupportJhookExample = { inputs: { run_ft: 400, spacing_ft: 4, num_cables: 50, cable_lb_per_ft: 0.035, hook_wll_lb: 0 } };

function _v890renderCableSupportJhook(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: support identity by name. hooks = ceil(run / spacing); load per hook = cables x weight per foot x spacing. TIA-569 non-continuous support runs about 4 to 5 ft on center.";
  const rn = makeNumber("Pathway length (ft)", "jhk-rn", { step: "any", min: "0", value: "400" });
  rn.input.value = "400";
  const sp = makeNumber("Hook spacing (ft)", "jhk-sp", { step: "any", min: "0", value: "4" });
  sp.input.value = "4";
  const nc = makeNumber("Cables in the bundle", "jhk-nc", { step: "any", min: "0", value: "50" });
  nc.input.value = "50";
  const cw = makeNumber("Weight per cable (lb/ft)", "jhk-cw", { step: "any", min: "0", value: "0.035" });
  cw.input.value = "0.035";
  const hw = makeNumber("Hook safe working load (lb, 0 = skip)", "jhk-hw", { step: "any", min: "0", value: "0" });
  hw.input.value = "0";
  for (const f of [rn, sp, nc, cw, hw]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rn.input.value = "400"; sp.input.value = "4"; nc.input.value = "50"; cw.input.value = "0.035"; hw.input.value = "0"; update(); });
  const oHooks = makeOutputLine(outputRegion, "J-hooks / bridle rings", "jhk-out-hooks");
  const oLoad = makeOutputLine(outputRegion, "Bundle load per hook", "jhk-out-load");
  const oUtil = makeOutputLine(outputRegion, "Hook utilization", "jhk-out-util");
  const update = debounce(() => {
    const r = computeCableSupportJhook({
      run_ft: rn.input.value === "" ? 400 : Number(rn.input.value), spacing_ft: sp.input.value === "" ? 4 : Number(sp.input.value),
      num_cables: nc.input.value === "" ? 50 : Number(nc.input.value), cable_lb_per_ft: cw.input.value === "" ? 0.035 : Number(cw.input.value),
      hook_wll_lb: hw.input.value === "" ? 0 : Number(hw.input.value),
    });
    if (r.error) { oHooks.textContent = r.error; oLoad.textContent = "-"; oUtil.textContent = "-"; return; }
    oHooks.textContent = fmt(r.hooks, 0) + " hooks";
    oLoad.textContent = fmt(r.load_per_hook_lb, 1) + " lb/hook";
    oUtil.textContent = r.utilization === null ? "-- (enter a hook WLL to check)" : (fmt(r.utilization * 100, 0) + "% of the hook WLL" + (r.utilization > 1 ? " (OVER -- split the bundle or upsize)" : ""));
  }, DEBOUNCE_MS);
  for (const f of [rn, sp, nc, cw, hw]) f.input.addEventListener("input", update);
}
LOWVOLTAGE_RENDERERS["cable-support-jhook"] = _v890renderCableSupportJhook;

// ===================== spec-v929: access-control power supply and standby battery =====================
// dims: in { lock_count: dimensionless, lock_current_a: I, reader_count: dimensionless, reader_current_a: I, other_load_a: I, standby_hours: T } out: { total_load_a: I, psu_min_a: I, battery_ah: I*T }
export function computeAccessControlPowerSupply({ lock_count = 4, lock_current_a = 0.5, reader_count = 2, reader_current_a = 0.15, other_load_a = 0.225, standby_hours = 4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (lock_count < 0 || reader_count < 0) return { error: "Device counts cannot be negative." };
  if (lock_current_a < 0 || reader_current_a < 0 || other_load_a < 0) return { error: "Device currents cannot be negative (A)." };
  if (standby_hours < 0) return { error: "Standby hours cannot be negative." };
  const total_load_a = Math.round(lock_count) * lock_current_a + Math.round(reader_count) * reader_current_a + other_load_a;
  if (!(total_load_a > 0)) return { error: "Total load must be positive: enter at least one device or load." };
  // NFPA 72 / UL 294: size the supply with 25% headroom, and the standby battery to the load for the required
  // standby time with a 25% aging derate.
  const psu_min_a = 1.25 * total_load_a;
  const battery_ah = total_load_a * standby_hours * 1.25;
  if (![total_load_a, psu_min_a, battery_ah].every(Number.isFinite)) return { error: "Access-control power math is not a finite value." };
  return {
    total_load_a,
    psu_min_a,
    battery_ah,
    note: "Access-control power supply and standby battery: total load = locks x hold current + readers + request-to-exit + controller; the supply is sized about 25% over the load (NFPA 72 / UL 294 continuous-load headroom); the standby battery = load x standby hours x 1.25 for aging. FAIL-SAFE maglocks draw continuously (and drop on power loss -- egress), while FAIL-SECURE strikes draw only on unlock and hold on power loss, so a fail-secure system draws far less standby. NFPA 72 sets the standby time (often 4 to 24 hr) for a system tied to the fire alarm or required for egress. A sizing estimate; the listed panel, the door hardware datasheets, the AHJ, and the fire/life-safety interface govern.",
  };
}

export const accessControlPowerSupplyExample = { inputs: { lock_count: 4, lock_current_a: 0.5, reader_count: 2, reader_current_a: 0.15, other_load_a: 0.225, standby_hours: 4 } };

function _v929renderAccessControlPowerSupply(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: access-control power / standby-battery sizing by name (NFPA 72 / UL 294). total load = locks x hold + readers + REX + controller; supply >= 1.25 x load; battery Ah = load x standby hours x 1.25 (aging). Fail-safe maglocks draw continuously; the listed panel, the AHJ, and the door hardware govern.";
  const lc = makeNumber("Maglock count", "acp-lc", { step: "1", min: "0", value: "4" });
  lc.input.value = "4";
  const li = makeNumber("Per-lock hold current (A)", "acp-li", { step: "any", min: "0", value: "0.5" });
  li.input.value = "0.5";
  const rc = makeNumber("Reader count", "acp-rc", { step: "1", min: "0", value: "2" });
  rc.input.value = "2";
  const ri = makeNumber("Per-reader current (A)", "acp-ri", { step: "any", min: "0", value: "0.15" });
  ri.input.value = "0.15";
  const ol = makeNumber("Other load: REX + controller (A)", "acp-ol", { step: "any", min: "0", value: "0.225" });
  ol.input.value = "0.225";
  const sh = makeNumber("Standby time (hr)", "acp-sh", { step: "any", min: "0", value: "4" });
  sh.input.value = "4";
  for (const f of [lc, li, rc, ri, ol, sh]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { lc.input.value = "4"; li.input.value = "0.5"; rc.input.value = "2"; ri.input.value = "0.15"; ol.input.value = "0.225"; sh.input.value = "4"; update(); });
  const oLoad = makeOutputLine(outputRegion, "Total load", "acp-out-load");
  const oPsu = makeOutputLine(outputRegion, "Minimum power supply", "acp-out-psu");
  const oBat = makeOutputLine(outputRegion, "Standby battery", "acp-out-bat");
  const update = debounce(() => {
    const r = computeAccessControlPowerSupply({
      lock_count: lc.input.value === "" ? 4 : Number(lc.input.value), lock_current_a: li.input.value === "" ? 0.5 : Number(li.input.value),
      reader_count: rc.input.value === "" ? 2 : Number(rc.input.value), reader_current_a: ri.input.value === "" ? 0.15 : Number(ri.input.value),
      other_load_a: ol.input.value === "" ? 0.225 : Number(ol.input.value), standby_hours: sh.input.value === "" ? 4 : Number(sh.input.value),
    });
    if (r.error) { oLoad.textContent = r.error; oPsu.textContent = "-"; oBat.textContent = "-"; return; }
    oLoad.textContent = fmt(r.total_load_a, 2) + " A";
    oPsu.textContent = fmt(r.psu_min_a, 2) + " A (1.25x load)";
    oBat.textContent = fmt(r.battery_ah, 1) + " Ah for " + fmt(Number(sh.input.value) || 4, 0) + " hr standby";
  }, DEBOUNCE_MS);
  for (const f of [lc, li, rc, ri, ol, sh]) f.input.addEventListener("input", update);
}
LOWVOLTAGE_RENDERERS["access-control-power-supply"] = _v929renderAccessControlPowerSupply;

// ===================== spec-v937: fire-alarm NAC circuit voltage drop (end-of-line) =====================
// dims: in { nominal_voltage_v: M L^2 T^-3 I^-1, total_current_a: I, run_length_ft: L, resistance_per_1000ft: M L T^-3 I^-2, device_min_v: M L^2 T^-3 I^-1 } out: { available_voltage_v: M L^2 T^-3 I^-1, voltage_drop_v: M L^2 T^-3 I^-1, eol_voltage_v: M L^2 T^-3 I^-1, margin_v: M L^2 T^-3 I^-1 }
export function computeFireAlarmNacVoltageDrop({ nominal_voltage_v = 24, total_current_a = 0.8, run_length_ft = 250, resistance_per_1000ft = 2.525, device_min_v = 16 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(nominal_voltage_v > 0)) return { error: "Nominal panel voltage must be positive (V)." };
  if (!(total_current_a > 0)) return { error: "Total appliance current must be positive (A)." };
  if (!(run_length_ft > 0)) return { error: "Run length must be positive (ft)." };
  if (!(resistance_per_1000ft > 0)) return { error: "Conductor resistance must be positive (ohm/1000 ft)." };
  if (!(device_min_v > 0)) return { error: "Device minimum voltage must be positive (V)." };
  // The panel's regulated minimum output (CUSTV) is 85% of nominal per NFPA 72; Class B is out-and-back, so 2x length.
  const available_voltage_v = 0.85 * nominal_voltage_v;
  const loop_resistance = 2 * run_length_ft * (resistance_per_1000ft / 1000);
  const voltage_drop_v = total_current_a * loop_resistance;
  const eol_voltage_v = available_voltage_v - voltage_drop_v;
  const margin_v = eol_voltage_v - device_min_v;
  const within_spec = eol_voltage_v >= device_min_v;
  if (![available_voltage_v, voltage_drop_v, eol_voltage_v, margin_v].every(Number.isFinite)) return { error: "NAC voltage-drop math is not a finite value." };
  return {
    available_voltage_v,
    voltage_drop_v,
    eol_voltage_v,
    margin_v,
    within_spec,
    verdict: within_spec ? "PASS" : "FAIL",
    note: "Fire-alarm notification-appliance-circuit (NAC) end-of-line voltage check. The panel's usable output is its regulated minimum (CUSTV), about 85% of nominal per NFPA 72 -- 20.4 V on a 24 V panel, not 24 V. On a Class B circuit the current runs out and back, so the loop resistance is 2 x length x the conductor ohms/1000 ft (from NEC Chapter 9 Table 8). Lumping the total appliance current at the end of the line is the worst case: V_EOL = CUSTV - I x loop_R, and every horn/strobe must still see at least its listed minimum (about 16 V for a 24 V device) with margin. If it fails, use heavier wire, shorten the run, split the circuit, or add a power booster / NAC extender. The panel's actual regulated voltage, the appliance current draws and listed minimums, and the wire table govern; a signed fire-alarm design and the AHJ approve the final circuit.",
  };
}

export const fireAlarmNacVoltageDropExample = { inputs: { nominal_voltage_v: 24, total_current_a: 0.8, run_length_ft: 250, resistance_per_1000ft: 2.525, device_min_v: 16 } };

function _v937renderFireAlarmNacVoltageDrop(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: fire-alarm NAC end-of-line voltage drop by name (NFPA 72). CUSTV = 0.85 x nominal; loop R = 2 x length x (ohm/1000 ft)/1000 (Class B out-and-back, NEC Ch 9 Table 8); V_EOL = CUSTV - I x loop R, must be >= the device's listed minimum. The panel voltage, appliance draws, and the wire table govern.";
  const nv = makeNumber("Panel nominal voltage (V)", "nac-nv", { step: "any", min: "0", value: "24" });
  nv.input.value = "24";
  const ic = makeNumber("Total appliance current at EOL (A)", "nac-ic", { step: "any", min: "0", value: "0.8" });
  ic.input.value = "0.8";
  const rl = makeNumber("Run length (ft, one way)", "nac-rl", { step: "any", min: "0", value: "250" });
  rl.input.value = "250";
  const rr = makeNumber("Conductor resistance (ohm/1000 ft)", "nac-rr", { step: "any", min: "0", value: "2.525" });
  rr.input.value = "2.525";
  const dm = makeNumber("Device minimum voltage (V)", "nac-dm", { step: "any", min: "0", value: "16" });
  dm.input.value = "16";
  for (const f of [nv, ic, rl, rr, dm]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { nv.input.value = "24"; ic.input.value = "0.8"; rl.input.value = "250"; rr.input.value = "2.525"; dm.input.value = "16"; update(); });
  const oV = makeOutputLine(outputRegion, "Verdict", "nac-out-v");
  const oEol = makeOutputLine(outputRegion, "End-of-line voltage", "nac-out-eol");
  const oDrop = makeOutputLine(outputRegion, "Voltage drop (from CUSTV)", "nac-out-drop");
  const update = debounce(() => {
    const r = computeFireAlarmNacVoltageDrop({
      nominal_voltage_v: nv.input.value === "" ? 24 : Number(nv.input.value), total_current_a: ic.input.value === "" ? 0.8 : Number(ic.input.value),
      run_length_ft: rl.input.value === "" ? 250 : Number(rl.input.value), resistance_per_1000ft: rr.input.value === "" ? 2.525 : Number(rr.input.value),
      device_min_v: dm.input.value === "" ? 16 : Number(dm.input.value),
    });
    if (r.error) { oV.textContent = r.error; oEol.textContent = "-"; oDrop.textContent = "-"; return; }
    oV.textContent = r.verdict + " (" + (r.margin_v >= 0 ? "+" : "") + fmt(r.margin_v, 2) + " V margin)";
    oEol.textContent = fmt(r.eol_voltage_v, 2) + " V (need " + fmt(Number(dm.input.value) || 16, 1) + " V)";
    oDrop.textContent = fmt(r.voltage_drop_v, 2) + " V of " + fmt(r.available_voltage_v, 1) + " V available";
  }, DEBOUNCE_MS);
  for (const f of [nv, ic, rl, rr, dm]) f.input.addEventListener("input", update);
}
LOWVOLTAGE_RENDERERS["fire-alarm-nac-voltage-drop"] = _v937renderFireAlarmNacVoltageDrop;

// ===================== spec-v946: 4-20 mA current-loop signal scaling =====================
// dims: in { args: dimensionless } out: { percent_of_span: dimensionless, engineering_value: dimensionless, status: dimensionless }
export function computeLoopSignalScaling({ signal_ma = 12, range_low = 0, range_high = 100 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (range_high === range_low) return { error: "Range high and low must differ (the span cannot be zero)." };
  // Linear live-zero scaling: 4 mA = range_low (0% of span), 20 mA = range_high (100% of span).
  const percent_of_span = (signal_ma - 4) / 16 * 100;
  const engineering_value = range_low + (percent_of_span / 100) * (range_high - range_low);
  // NAMUR NE43 valid measuring range is ~3.8 to 20.5 mA; <=3.6 or >=21 mA signals a sensor/loop fault.
  let status;
  if (signal_ma <= 3.6) status = "fault-low (<=3.6 mA: sensor/loop fault or open circuit, NAMUR NE43)";
  else if (signal_ma < 3.8) status = "underrange (3.6-3.8 mA)";
  else if (signal_ma < 4) status = "underrange (below 4 mA live zero)";
  else if (signal_ma >= 21) status = "fault-high (>=21 mA: sensor/loop fault, NAMUR NE43)";
  else if (signal_ma > 20.5) status = "overrange (above 20.5 mA)";
  else if (signal_ma > 20) status = "overrange (above 20 mA full scale)";
  else status = "in range (4-20 mA)";
  if (![percent_of_span, engineering_value].every(Number.isFinite)) return { error: "Loop-scaling math is not a finite value." };
  return {
    percent_of_span,
    engineering_value,
    status,
    note: "The engineering value a 4-20 mA current-loop signal represents, the number an instrumentation tech reads off a loop meter: the loop is a linear LIVE ZERO where 4 mA = the low end of the range (0% of span) and 20 mA = the high end (100%), so percent of span = (mA - 4) / 16 x 100 and the value = range_low + percent/100 x (range_high - range_low). A transmitter ranged 0-100 psi reads 50 psi at 12 mA and 75 psi at 16 mA. The live zero (4 mA, not 0) is what lets the loop tell a real zero reading apart from a dead wire: per NAMUR NE43, 3.8-20.5 mA is the valid measuring band, while <=3.6 mA or >=21 mA is driven deliberately to flag a sensor or loop fault (an open circuit reads 0 mA). Below 4 or above 20 mA is under/overrange. This is the linear scaling only; a square-root-extracted flow transmitter (differential-pressure flow) needs the sqrt of the fraction, and the transmitter's actual range, damping, and calibration govern.",
  };
}

export const loopSignalScalingExample = { inputs: { signal_ma: 12, range_low: 0, range_high: 100 } };

function _v946renderLoopSignalScaling(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: 4-20 mA current-loop (live-zero) signal scaling, by name; ANSI/ISA-50.00.01 analog signal ranges and NAMUR NE43 fault levels. percent = (mA - 4)/16 x 100; value = range_low + percent/100 x (range_high - range_low). Linear scaling only (a DP-flow transmitter is square-root); the transmitter's range and calibration govern.";
  const ma = makeNumber("Loop signal (mA)", "lss-ma", { step: "any", value: "12" });
  ma.input.value = "12";
  const lo = makeNumber("Range low (value at 4 mA)", "lss-lo", { step: "any", value: "0" });
  lo.input.value = "0";
  const hi = makeNumber("Range high (value at 20 mA)", "lss-hi", { step: "any", value: "100" });
  hi.input.value = "100";
  for (const f of [ma, lo, hi]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ma.input.value = "12"; lo.input.value = "0"; hi.input.value = "100"; update(); });
  const oVal = makeOutputLine(outputRegion, "Engineering value", "lss-out-v");
  const oPct = makeOutputLine(outputRegion, "Percent of span", "lss-out-p");
  const oStatus = makeOutputLine(outputRegion, "Signal status", "lss-out-s");
  const update = debounce(() => {
    const r = computeLoopSignalScaling({
      signal_ma: ma.input.value === "" ? 12 : Number(ma.input.value),
      range_low: lo.input.value === "" ? 0 : Number(lo.input.value), range_high: hi.input.value === "" ? 100 : Number(hi.input.value),
    });
    if (r.error) { oVal.textContent = r.error; oPct.textContent = "-"; oStatus.textContent = "-"; return; }
    oVal.textContent = fmt(r.engineering_value, 3);
    oPct.textContent = fmt(r.percent_of_span, 2) + "%";
    oStatus.textContent = r.status;
  }, DEBOUNCE_MS);
  for (const f of [ma, lo, hi]) f.input.addEventListener("input", update);
}
LOWVOLTAGE_RENDERERS["loop-signal-scaling"] = _v946renderLoopSignalScaling;

// ===================== spec-v947: RTD (Pt100 / Pt1000) resistance to temperature =====================
// dims: in { args: dimensionless } out: { temperature_c: dimensionless, temperature_f: dimensionless }
export function computeRtdResistanceToTemp({ resistance_ohms = 119.397, r0_ohms = 100 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(resistance_ohms > 0)) return { error: "Measured resistance must be positive (ohms)." };
  if (!(r0_ohms > 0)) return { error: "R0 (ice-point resistance) must be positive (100 for Pt100, 1000 for Pt1000)." };
  // Callendar-Van Dusen inverse (IEC 60751 standard coefficients). Exact for T >= 0 C (R >= R0) via the quadratic
  // R = R0(1 + A T + B T^2); below 0 C the C(T-100)T^3 term is dropped, a close approximation (< ~0.02 C to -40 C).
  const A = 3.9083e-3, B = -5.775e-7;
  const ratio = resistance_ohms / r0_ohms;
  const disc = A * A - 4 * B * (1 - ratio);
  if (!(disc >= 0)) return { error: "Resistance is outside the platinum RTD range (no real temperature solution)." };
  const temperature_c = (-A + Math.sqrt(disc)) / (2 * B);
  const temperature_f = temperature_c * 9 / 5 + 32;
  if (![temperature_c, temperature_f].every(Number.isFinite)) return { error: "RTD temperature math is not a finite value." };
  return {
    temperature_c,
    temperature_f,
    note: "The temperature a platinum RTD's measured resistance corresponds to, by the IEC 60751 Callendar-Van Dusen relation R = R0 (1 + A T + B T^2) with the standard coefficients A = 3.9083e-3 and B = -5.775e-7 per C, solved for T. R0 is the ice-point (0 C) resistance -- 100 ohms for a Pt100, 1000 ohms for a Pt1000. A Pt100 reading 119.40 ohms is at 50 C, 138.51 ohms is 100 C, and exactly 100.00 ohms is 0 C; a Pt1000 uses the same curve scaled x10. The inverse is exact for T at or above 0 C (R >= R0); below 0 C the standard adds a C (T - 100) T^3 term that this screen drops, which stays within about 0.02 C down to -40 C and grows slowly colder than that. This assumes a 3- or 4-wire measurement (or a lead-resistance-compensated 2-wire) so the reading is the RTD element alone -- uncompensated 2-wire lead resistance ADDS to R and reads high (hotter). The sensor's calibration, tolerance class (A/B), and self-heating govern the field accuracy.",
  };
}

export const rtdResistanceToTempExample = { inputs: { resistance_ohms: 119.397, r0_ohms: 100 } };

function _v947renderRtdResistanceToTemp(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IEC 60751 platinum RTD (Callendar-Van Dusen) resistance-temperature relation, by name; standard coefficients A = 3.9083e-3, B = -5.775e-7 per C. R = R0(1 + A T + B T^2), solved for T (exact T >= 0 C; below 0 C drops the C-term, a close approximation). Assumes a lead-compensated (3/4-wire) reading; the sensor calibration and class govern.";
  const rm = makeNumber("Measured resistance (ohms)", "rtd-rm", { step: "any", min: "0", value: "119.397" });
  rm.input.value = "119.397";
  const r0 = makeNumber("R0 at 0 C (100 = Pt100, 1000 = Pt1000)", "rtd-r0", { step: "any", min: "0", value: "100" });
  r0.input.value = "100";
  for (const f of [rm, r0]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rm.input.value = "119.397"; r0.input.value = "100"; update(); });
  const oC = makeOutputLine(outputRegion, "Temperature (C)", "rtd-out-c");
  const oF = makeOutputLine(outputRegion, "Temperature (F)", "rtd-out-f");
  const update = debounce(() => {
    const r = computeRtdResistanceToTemp({
      resistance_ohms: rm.input.value === "" ? 119.397 : Number(rm.input.value), r0_ohms: r0.input.value === "" ? 100 : Number(r0.input.value),
    });
    if (r.error) { oC.textContent = r.error; oF.textContent = "-"; return; }
    oC.textContent = fmt(r.temperature_c, 2) + " C";
    oF.textContent = fmt(r.temperature_f, 2) + " F";
  }, DEBOUNCE_MS);
  for (const f of [rm, r0]) f.input.addEventListener("input", update);
}
LOWVOLTAGE_RENDERERS["rtd-resistance-to-temp"] = _v947renderRtdResistanceToTemp;

// ===================== spec-v948: pulse (turbine/paddlewheel) flowmeter K-factor scaling =====================
// dims: in { args: dimensionless } out: { flow_gpm: dimensionless, flow_gph: dimensionless }
export function computePulseFlowmeterRate({ frequency_hz = 100, k_factor_pulses_per_gal = 200 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(frequency_hz >= 0)) return { error: "Pulse frequency cannot be negative (Hz)." };
  if (!(k_factor_pulses_per_gal > 0)) return { error: "K-factor must be positive (pulses per gallon)." };
  // A turbine/paddlewheel/PD meter emits K pulses per gallon; rate = pulses/sec x 60 sec/min / (pulses/gal).
  const flow_gpm = frequency_hz * 60 / k_factor_pulses_per_gal;
  const flow_gph = flow_gpm * 60;
  if (![flow_gpm, flow_gph].every(Number.isFinite)) return { error: "Flowmeter rate math is not a finite value." };
  return {
    flow_gpm,
    flow_gph,
    note: "The flow rate a pulse-output flowmeter (turbine, paddlewheel, or positive-displacement) reports from its output frequency: the meter emits a fixed number of pulses per gallon -- its K-factor, stamped on the meter or its calibration certificate -- so rate = frequency (Hz = pulses/sec) x 60 / K-factor, and the totalized volume is simply the pulse count divided by the K-factor. A 200 pulse/gal meter reading 100 Hz is 30 gpm; a coarser 100 pulse/gal meter at the same 100 Hz is 60 gpm, because each pulse is worth twice the volume. The K-factor is not truly constant: it drifts with fluid viscosity and shifts at the low end of the meter's range (below its linear turndown), so a viscous fluid or a near-zero flow reads off. Some meters are rated in pulses per liter or per cubic foot -- convert first. This is the linear frequency-to-rate scaling; the meter's calibration certificate, its linear flow range, and the fluid govern the field accuracy.",
  };
}

export const pulseFlowmeterRateExample = { inputs: { frequency_hz: 100, k_factor_pulses_per_gal: 200 } };

function _v948renderPulseFlowmeterRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: pulse-output flowmeter (turbine/paddlewheel/PD) K-factor scaling, by name. rate = frequency_Hz x 60 / K-factor (pulses per gallon); totalized volume = pulse count / K-factor. The K-factor is stamped on the meter or its calibration certificate; it drifts with viscosity and at low flow. The calibration cert, linear range, and fluid govern.";
  const fr = makeNumber("Output frequency (Hz = pulses/sec)", "pfm-fr", { step: "any", min: "0", value: "100" });
  fr.input.value = "100";
  const kf = makeNumber("K-factor (pulses per gallon)", "pfm-kf", { step: "any", min: "0", value: "200" });
  kf.input.value = "200";
  for (const f of [fr, kf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { fr.input.value = "100"; kf.input.value = "200"; update(); });
  const oGpm = makeOutputLine(outputRegion, "Flow rate", "pfm-out-gpm");
  const oGph = makeOutputLine(outputRegion, "Flow rate (gph)", "pfm-out-gph");
  const update = debounce(() => {
    const r = computePulseFlowmeterRate({
      frequency_hz: fr.input.value === "" ? 100 : Number(fr.input.value), k_factor_pulses_per_gal: kf.input.value === "" ? 200 : Number(kf.input.value),
    });
    if (r.error) { oGpm.textContent = r.error; oGph.textContent = "-"; return; }
    oGpm.textContent = fmt(r.flow_gpm, 2) + " gpm";
    oGph.textContent = fmt(r.flow_gph, 1) + " gph";
  }, DEBOUNCE_MS);
  for (const f of [fr, kf]) f.input.addEventListener("input", update);
}
LOWVOLTAGE_RENDERERS["pulse-flowmeter-k-factor"] = _v948renderPulseFlowmeterRate;

// ===================== spec-v949: loop-powered 2-wire 4-20 mA transmitter voltage budget =====================
// dims: in { args: dimensionless } out: { max_loop_resistance_ohms: dimensionless, voltage_at_transmitter_v: dimensionless, margin_v: dimensionless, within_spec: dimensionless }
export function computeLoopVoltageBudget({ supply_v = 24, transmitter_min_v = 10.5, load_resistance_ohms = 250, wire_resistance_ohms = 50 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(supply_v > 0)) return { error: "Loop supply voltage must be positive (Vdc)." };
  if (!(transmitter_min_v >= 0)) return { error: "Transmitter minimum (compliance) voltage cannot be negative." };
  if (!(transmitter_min_v < supply_v)) return { error: "Supply voltage must exceed the transmitter minimum for the loop to operate." };
  if (!(load_resistance_ohms >= 0)) return { error: "Load (sense) resistance cannot be negative." };
  if (!(wire_resistance_ohms >= 0)) return { error: "Wire resistance cannot be negative." };
  // At the 20 mA worst case the loop supply drives all series resistance; the transmitter needs its minimum left over.
  const I_MAX = 0.020;
  const max_loop_resistance_ohms = (supply_v - transmitter_min_v) / I_MAX;
  const total_series_ohms = load_resistance_ohms + wire_resistance_ohms;
  const voltage_at_transmitter_v = supply_v - I_MAX * total_series_ohms;
  const margin_v = voltage_at_transmitter_v - transmitter_min_v;
  const headroom_ohms = max_loop_resistance_ohms - total_series_ohms;
  const within_spec = margin_v >= 0;
  if (![max_loop_resistance_ohms, voltage_at_transmitter_v, margin_v].every(Number.isFinite)) return { error: "Loop-budget math is not a finite value." };
  return {
    max_loop_resistance_ohms,
    voltage_at_transmitter_v,
    margin_v,
    headroom_ohms,
    within_spec,
    verdict: within_spec ? "OK -- the loop drives 20 mA with margin" : "FAIL -- the transmitter starves at 20 mA",
    note: "Whether a loop-powered (2-wire) 4-20 mA transmitter has enough voltage to operate. The transmitter needs a minimum terminal (compliance / lift-off) voltage to work -- commonly 8-12 Vdc -- and at the 20 mA top of range the loop supply must push that current through ALL the series resistance (the sense/load resistor at the receiver, the round-trip wire resistance, plus any barriers or isolators) and still leave the transmitter its minimum. So the maximum total loop resistance = (supply - transmitter minimum) / 0.020 A, and the voltage left at the transmitter = supply - 0.020 x total series resistance. A 24 Vdc loop into a 250 ohm sense resistor with 50 ohm of wire (300 ohm total) leaves 18 V at the transmitter -- well above a 10.5 V minimum -- and could carry up to 675 ohm; push the run to 600 ohm of wire (850 ohm total) and the transmitter starves at 7 V, below its minimum, so the loop pins or reads wrong. The 250 ohm sense resistor (for a 1-5 V input) is the usual big consumer. This is the DC worst case at 20 mA; the transmitter datasheet's actual compliance voltage, the barrier/isolator burden, and the real wire resistance govern.",
  };
}

export const loopVoltageBudgetExample = { inputs: { supply_v: 24, transmitter_min_v: 10.5, load_resistance_ohms: 250, wire_resistance_ohms: 50 } };

function _v949renderLoopVoltageBudget(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: loop-powered (2-wire) 4-20 mA transmitter voltage budget, by name. Max total loop resistance = (supply - transmitter minimum) / 0.020 A; voltage at the transmitter = supply - 0.020 x (load + wire + barrier resistance), which must exceed the transmitter's compliance (lift-off) voltage at the 20 mA worst case. The transmitter datasheet's compliance voltage and the barrier burden govern.";
  const sv = makeNumber("Loop supply (Vdc)", "lvb-sv", { step: "any", min: "0", value: "24" });
  sv.input.value = "24";
  const tv = makeNumber("Transmitter minimum voltage (V)", "lvb-tv", { step: "any", min: "0", value: "10.5" });
  tv.input.value = "10.5";
  const lr = makeNumber("Load / sense resistor (ohms)", "lvb-lr", { step: "any", min: "0", value: "250" });
  lr.input.value = "250";
  const wr = makeNumber("Wire + barrier resistance (ohms)", "lvb-wr", { step: "any", min: "0", value: "50" });
  wr.input.value = "50";
  for (const f of [sv, tv, lr, wr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sv.input.value = "24"; tv.input.value = "10.5"; lr.input.value = "250"; wr.input.value = "50"; update(); });
  const oV = makeOutputLine(outputRegion, "Verdict", "lvb-out-v");
  const oVat = makeOutputLine(outputRegion, "Voltage at transmitter (20 mA)", "lvb-out-vat");
  const oMax = makeOutputLine(outputRegion, "Max total loop resistance", "lvb-out-max");
  const update = debounce(() => {
    const r = computeLoopVoltageBudget({
      supply_v: sv.input.value === "" ? 24 : Number(sv.input.value), transmitter_min_v: tv.input.value === "" ? 10.5 : Number(tv.input.value),
      load_resistance_ohms: lr.input.value === "" ? 250 : Number(lr.input.value), wire_resistance_ohms: wr.input.value === "" ? 50 : Number(wr.input.value),
    });
    if (r.error) { oV.textContent = r.error; oVat.textContent = "-"; oMax.textContent = "-"; return; }
    oV.textContent = r.verdict + " (" + (r.margin_v >= 0 ? "+" : "") + fmt(r.margin_v, 2) + " V margin)";
    oVat.textContent = fmt(r.voltage_at_transmitter_v, 2) + " V (need " + fmt(Number(tv.input.value) || 10.5, 1) + " V)";
    oMax.textContent = fmt(r.max_loop_resistance_ohms, 0) + " ohm ceiling (" + (r.headroom_ohms >= 0 ? "+" : "") + fmt(r.headroom_ohms, 0) + " ohm headroom)";
  }, DEBOUNCE_MS);
  for (const f of [sv, tv, lr, wr]) f.input.addEventListener("input", update);
}
LOWVOLTAGE_RENDERERS["loop-voltage-budget"] = _v949renderLoopVoltageBudget;

// ===================== spec-v950: NTC thermistor resistance to temperature (beta equation) =====================
// dims: in { args: dimensionless } out: { temperature_c: dimensionless, temperature_f: dimensionless }
export function computeThermistorBetaTemp({ resistance_ohms = 10000, r0_ohms = 10000, beta_k = 3950, ref_temp_c = 25 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(resistance_ohms > 0)) return { error: "Measured resistance must be positive (ohms)." };
  if (!(r0_ohms > 0)) return { error: "R0 (nominal resistance at the reference temperature) must be positive." };
  if (!(beta_k > 0)) return { error: "Beta coefficient must be positive (K)." };
  if (!(ref_temp_c > -273.15)) return { error: "Reference temperature must be above absolute zero (C)." };
  // NTC thermistor beta (B-parameter) equation: 1/T = 1/T0 + (1/B) ln(R/R0), temperatures in kelvin.
  const t0_k = ref_temp_c + 273.15;
  const inv_t = 1 / t0_k + (1 / beta_k) * Math.log(resistance_ohms / r0_ohms);
  if (!(inv_t > 0)) return { error: "Resistance is outside the thermistor's valid range (no positive temperature solution)." };
  const t_k = 1 / inv_t;
  const temperature_c = t_k - 273.15;
  const temperature_f = temperature_c * 9 / 5 + 32;
  if (![temperature_c, temperature_f].every(Number.isFinite)) return { error: "Thermistor temperature math is not a finite value." };
  return {
    temperature_c,
    temperature_f,
    note: "The temperature an NTC (negative-temperature-coefficient) thermistor's measured resistance corresponds to, by the beta (B-parameter) equation 1/T = 1/T0 + (1/B) ln(R/R0) with temperatures in kelvin. R0 is the nominal resistance at the reference temperature T0 (almost always 10 kohm at 25 C for the HVAC-standard sensor), and B (commonly 3435-3950 K) is the thermistor's material constant -- both come from the sensor datasheet. Because it is NEGATIVE-coefficient, resistance FALLS as temperature RISES: a 10 kohm/3950 K sensor reads 25 C at 10 kohm, 41.5 C at 5 kohm, and 10.2 C at 20 kohm. The beta equation is a two-point fit and is accurate to about +/-0.2 to 1 C over a moderate span around T0; a wider or tighter job uses the 3-constant Steinhart-Hart equation instead. This is distinct from a platinum RTD, which is POSITIVE-coefficient and follows the Callendar-Van Dusen curve. Assumes a lead-compensated reading; the sensor's datasheet R-T curve, tolerance, and self-heating govern the field accuracy.",
  };
}

export const thermistorBetaTempExample = { inputs: { resistance_ohms: 20000, r0_ohms: 10000, beta_k: 3950, ref_temp_c: 25 } };

function _v950renderThermistorBetaTemp(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NTC thermistor beta (B-parameter) equation, by name. 1/T = 1/T0 + (1/B) ln(R/R0), temperatures in kelvin; R0 and B (e.g. 10 kohm at 25 C, B ~ 3950 K) come from the sensor datasheet. A two-point fit (accurate ~+/-0.2-1 C near T0); a wider span uses Steinhart-Hart. Distinct from a positive-coefficient platinum RTD. The datasheet R-T curve and tolerance govern.";
  const rm = makeNumber("Measured resistance (ohms)", "th-rm", { step: "any", min: "0", value: "20000" });
  rm.input.value = "20000";
  const r0 = makeNumber("R0 at reference temp (ohms, e.g. 10000)", "th-r0", { step: "any", min: "0", value: "10000" });
  r0.input.value = "10000";
  const bk = makeNumber("Beta B (K, e.g. 3950)", "th-bk", { step: "any", min: "0", value: "3950" });
  bk.input.value = "3950";
  const rt = makeNumber("Reference temp T0 in C (usually 25)", "th-rt", { step: "any", value: "25" });
  rt.input.value = "25";
  for (const f of [rm, r0, bk, rt]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rm.input.value = "20000"; r0.input.value = "10000"; bk.input.value = "3950"; rt.input.value = "25"; update(); });
  const oC = makeOutputLine(outputRegion, "Temperature (C)", "th-out-c");
  const oF = makeOutputLine(outputRegion, "Temperature (F)", "th-out-f");
  const update = debounce(() => {
    const r = computeThermistorBetaTemp({
      resistance_ohms: rm.input.value === "" ? 20000 : Number(rm.input.value), r0_ohms: r0.input.value === "" ? 10000 : Number(r0.input.value),
      beta_k: bk.input.value === "" ? 3950 : Number(bk.input.value), ref_temp_c: rt.input.value === "" ? 25 : Number(rt.input.value),
    });
    if (r.error) { oC.textContent = r.error; oF.textContent = "-"; return; }
    oC.textContent = fmt(r.temperature_c, 2) + " C";
    oF.textContent = fmt(r.temperature_f, 2) + " F";
  }, DEBOUNCE_MS);
  for (const f of [rm, r0, bk, rt]) f.input.addEventListener("input", update);
}
LOWVOLTAGE_RENDERERS["thermistor-beta-temp"] = _v950renderThermistorBetaTemp;
