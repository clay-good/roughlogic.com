// Group D: water-loss documentation and structural-removal take-off.
// spec-v77 cap-relief split: the cohesive demolition / abatement bench
// (moisture-dry-goal, flood-cut-quantity, abatement-containment) relocated
// verbatim out of calc-restoration.js (which had reached 95.2% of cap -- tied
// for the tightest remaining calc module). All three are structural-removal
// phase decisions on a water-loss job: the dry standard that gates when
// removal/drying stops, the flood-cut demolition take-off, and the asbestos /
// lead abatement containment take-off. Each keeps group: "D" (group letter
// independent of module, the v42/v70..v76 precedent). See spec-v60 and
// spec-v69.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeCheckbox,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input. A renderer
// coerces an empty number field to 0 (Number("") === 0), so a NaN or
// Infinity reaching a solver is genuinely unusable (a pasted 1e999, a
// degenerate computed slot); per the spec-v18 §2 output contract the
// solver returns {error} rather than leaking a non-finite output field.
// Generic over the input object, so it needs no per-tile slot list, and
// it inspects only own numeric values (strings/arrays/null pass through).
// Non-exported, so it adds no v14 derivation-corpus row.
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

export const DEMO_RENDERERS = {};

// =====================================================================
// spec-v60: Water-loss documentation (Group D).
// =====================================================================

// --- moisture-dry-goal: Dry Standard vs Affected Reading ---
//
// delta = affected - reference (the unaffected dry standard);
// at_dry_standard = delta <= acceptable_delta; points_to_go =
// max(0, delta - acceptable_delta).
// dims: in { reference_reading: dimensionless, affected_reading: dimensionless, acceptable_delta: dimensionless }
//        out: { delta: dimensionless, points_to_go: dimensionless, at_dry_standard: dimensionless }
// (Moisture-meter readings are a dimensionless scale (relative or % MC); the
//  delta and the verdict are dimensionless.)
export function computeMoistureDryGoal({ reference_reading, affected_reading, acceptable_delta = 4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ref = Number(reference_reading);
  const aff = Number(affected_reading);
  const allow = Number(acceptable_delta);
  if (!Number.isFinite(ref) || !Number.isFinite(aff)) return { error: "Readings must be finite numbers." };
  if (!(allow > 0)) return { error: "Acceptable delta must be positive." };
  const delta = aff - ref;
  const atDry = delta <= allow;
  const pointsToGo = Math.max(0, delta - allow);
  return {
    delta,
    points_to_go: pointsToGo,
    at_dry_standard: atDry,
    verdict: atDry ? "at dry standard" : "continue drying",
    note: "The reference must be the same material, meter, mode, and scale as the affected reading (a pin meter reads relative on non-wood; a wood scale is only valid on wood). The dry standard is the unaffected reading, not a fixed number. The protocol and a calibrated meter govern acceptance (IICRC S500).",
  };
}

export const moistureDryGoalExample = {
  inputs: { reference_reading: 12, affected_reading: 35, acceptable_delta: 4 },
  expected: { delta: 23, points_to_go: 19, at_dry_standard: false },
};

function renderMoistureDryGoal(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IICRC S500-2021 dry-standard concept by name (not reproduced): a material is dry when its moisture content matches similar unaffected material in the same structure. The protocol and a calibrated meter govern.";
  const ref = makeNumber("Unaffected reference reading (dry standard)", "mdg-ref", { step: "any" });
  const aff = makeNumber("Affected material reading", "mdg-aff", { step: "any" });
  const allow = makeNumber("Acceptable delta above standard", "mdg-allow", { step: "any", min: "0", value: "4" });
  allow.input.value = "4";
  for (const f of [ref, aff, allow]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ref.input.value = "12"; aff.input.value = "35"; allow.input.value = "4"; update(); });
  const oDelta = makeOutputLine(outputRegion, "Delta above standard", "mdg-out-delta");
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "mdg-out-verdict");
  const oGo = makeOutputLine(outputRegion, "Points still to remove", "mdg-out-go");
  function readNum(i) { if (i.value === "") return NaN; const n = Number(i.value); return Number.isFinite(n) ? n : NaN; }
  const update = debounce(() => {
    const r = computeMoistureDryGoal({ reference_reading: readNum(ref.input), affected_reading: readNum(aff.input), acceptable_delta: allow.input.value === "" ? 4 : Number(allow.input.value) });
    if (r.error) { oDelta.textContent = r.error; oVerdict.textContent = "-"; oGo.textContent = "-"; return; }
    oDelta.textContent = fmt(r.delta, 1);
    oVerdict.textContent = r.verdict;
    oGo.textContent = fmt(r.points_to_go, 1);
  }, DEBOUNCE_MS);
  for (const el of [ref.input, aff.input, allow.input]) el.addEventListener("input", update);
}
DEMO_RENDERERS["moisture-dry-goal"] = renderMoistureDryGoal;

// --- flood-cut-quantity: Flood-Cut Demolition Take-Off ---
//
// drywall_ft2 = run * (cut_height/12) * faces; sheets = ceil(drywall/32);
// baseboard_lf = run; insulation_ft2 = insulated ? run * (cut_height/12) : 0.
// dims: in { wall_run_lf: L, cut_height_in: L, two_sided: dimensionless, insulated: dimensionless }
//        out: { drywall_ft2: L^2, baseboard_lf: L, insulation_ft2: L^2, sheets_4x8: dimensionless }
// (Wall run L times cut height L = removed area L^2; the 32 ft^2-per-sheet
//  constant makes the sheet count dimensionless; baseboard is a length L.)
export function computeFloodCutQuantity({ wall_run_lf, cut_height_in = 24, two_sided = false, insulated = false } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const run = Number(wall_run_lf) || 0;
  const cut = Number(cut_height_in) || 0;
  if (!(run > 0)) return { error: "Wall run must be positive (linear ft)." };
  if (!(cut > 0)) return { error: "Cut height must be positive (in)." };
  const faces = two_sided ? 2 : 1;
  const drywallFt2 = run * (cut / 12) * faces;
  const sheets = Math.ceil(drywallFt2 / 32);
  const baseboardLf = run;
  const insulationFt2 = insulated ? run * (cut / 12) : 0;
  return {
    drywall_ft2: drywallFt2,
    baseboard_lf: baseboardLf,
    insulation_ft2: insulationFt2,
    sheets_4x8: sheets,
    note: "The cut height is a field decision driven by the highest moisture reading (the wick line measured with a meter), not a fixed 2 ft rule. Category 3 losses typically require removing all wet porous material, which can exceed the cut. Pre-1980 structures require lead / asbestos assessment before any demolition.",
  };
}

export const floodCutQuantityExample = {
  inputs: { wall_run_lf: 60, cut_height_in: 24, two_sided: false, insulated: true },
  expected: { drywall_ft2: 120, sheets_4x8: 4, baseboard_lf: 60, insulation_ft2: 120 },
};

function renderFloodCutQuantity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IICRC S500-2021 structural-removal principle by name (not reproduced). 4x8 drywall sheet = 32 ft^2. The cut height is a field decision driven by the highest moisture reading; Category 3 may require removing all wet porous material.";
  const run = makeNumber("Affected wall run (linear ft)", "fcq-run", { step: "any", min: "0" });
  const cut = makeNumber("Cut height (in)", "fcq-cut", { step: "any", min: "0", value: "24" });
  cut.input.value = "24";
  const two = makeCheckbox("Cavity wet on both wall faces", "fcq-two");
  const ins = makeCheckbox("Cavity holds batt insulation to remove", "fcq-ins");
  for (const f of [run, cut, two, ins]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { run.input.value = "60"; cut.input.value = "24"; two.input.checked = false; ins.input.checked = true; update(); });
  const oDry = makeOutputLine(outputRegion, "Drywall removed", "fcq-out-dry");
  const oSheets = makeOutputLine(outputRegion, "4x8 sheets to replace", "fcq-out-sheets");
  const oBase = makeOutputLine(outputRegion, "Baseboard", "fcq-out-base");
  const oIns = makeOutputLine(outputRegion, "Batt insulation", "fcq-out-ins");
  const update = debounce(() => {
    const r = computeFloodCutQuantity({
      wall_run_lf: Number(run.input.value) || 0,
      cut_height_in: cut.input.value === "" ? 24 : Number(cut.input.value),
      two_sided: two.input.checked, insulated: ins.input.checked,
    });
    if (r.error) { oDry.textContent = r.error; for (const o of [oSheets, oBase, oIns]) o.textContent = "-"; return; }
    oDry.textContent = fmt(r.drywall_ft2, 0) + " ft^2";
    oSheets.textContent = String(r.sheets_4x8);
    oBase.textContent = fmt(r.baseboard_lf, 0) + " LF";
    oIns.textContent = fmt(r.insulation_ft2, 0) + " ft^2";
  }, DEBOUNCE_MS);
  for (const el of [run.input, cut.input, two.input, ins.input]) el.addEventListener("input", update);
}
DEMO_RENDERERS["flood-cut-quantity"] = renderFloodCutQuantity;

// =====================================================================
// spec-v69: Asbestos / lead abatement containment take-off (Group D).
// =====================================================================

// --- abatement-containment: Containment Poly, Negative Air, and Waste ---
//
// poly = (floor_sf x floor_layers + wall_sf x wall_layers) x 1.10;
// req_cfm = volume x ach / 60; nam_count = ceil(req_cfm / nam_cfm);
// waste_bags = ceil(debris_cy x 27 / 4.4).
// dims: in { room_len_ft: L, room_wid_ft: L, room_ht_ft: L, ach_target: dimensionless, nam_cfm: L^3 T^-1, debris_cy: L^3, floor_layers: dimensionless, wall_layers: dimensionless } out: { poly_sf: L^2, req_cfm: L^3 T^-1, nam_count: dimensionless, waste_bags: dimensionless }
// (Room dimensions are lengths L; the poly area is L^2; the required exhaust and
//  machine airflow are volume-rates L^3 T^-1; the machine and bag counts are
//  dimensionless.)
export function computeAbatementContainment({ room_len_ft, room_wid_ft, room_ht_ft, ach_target = 4, nam_cfm = 1500, debris_cy = 0, floor_layers = 2, wall_layers = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const len = Number(room_len_ft);
  const wid = Number(room_wid_ft);
  const ht = Number(room_ht_ft);
  const ach = Number(ach_target);
  const nam = Number(nam_cfm);
  const debris = Number(debris_cy);
  const floorLayers = Number(floor_layers);
  const wallLayers = Number(wall_layers);
  if (!Number.isFinite(len) || len <= 0) return { error: "Length must be a positive finite number (ft)." };
  if (!Number.isFinite(wid) || wid <= 0) return { error: "Width must be a positive finite number (ft)." };
  if (!Number.isFinite(ht) || ht <= 0) return { error: "Height must be a positive finite number (ft)." };
  if (!Number.isFinite(ach) || ach <= 0) return { error: "Air changes per hour must be a positive finite number." };
  if (!Number.isFinite(nam) || nam <= 0) return { error: "Negative-air machine airflow must be a positive finite number (cfm)." };
  if (!Number.isFinite(debris) || debris < 0) return { error: "Debris volume must be a non-negative finite number (cy)." };
  if (!Number.isFinite(floorLayers) || floorLayers < 0) return { error: "Floor layers must be a non-negative finite number." };
  if (!Number.isFinite(wallLayers) || wallLayers < 0) return { error: "Wall layers must be a non-negative finite number." };
  const volumeCf = len * wid * ht;
  const floorSf = len * wid;
  const wallSf = 2 * (len + wid) * ht;
  const polySf = (floorSf * floorLayers + wallSf * wallLayers) * 1.10;
  const reqCfm = volumeCf * ach / 60;
  const namCount = Math.ceil(reqCfm / nam);
  const wasteBags = Math.ceil(debris * 27 / 4.4);
  if (![polySf, reqCfm, namCount, wasteBags].every(Number.isFinite)) return { error: "Containment math is not a finite value." };
  return {
    poly_sf: polySf,
    req_cfm: reqCfm,
    nam_count: namCount,
    waste_bags: wasteBags,
    volume_cf: volumeCf,
    note: "4 air changes per hour and the negative-pressure containment are industry practice for asbestos, and the actual negative pressure is verified continuously with a manometer, not assumed. This is a take-off, not an abatement plan - a licensed asbestos / certified lead (RRP) contractor governs the design, the decon, and the air clearance. Asbestos waste is RACM and lead debris is regulated: double-bagged, labeled, and manifested to a permitted facility. OSHA 1926.1101 / 1926.62 and EPA NESHAP / RRP requirements are not optional.",
  };
}

function _v69renderAbatementContainment(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: EPA NESHAP 40 CFR 61 Subpart M (asbestos), EPA RRP 40 CFR 745 (lead), and OSHA 1926.1101 / 1926.62 by name. poly = (floor x layers + wall x layers) x 1.10; req cfm = volume x ACH / 60; bags from debris volume. A licensed / certified contractor governs.";
  const len = makeNumber("Containment length (ft)", "ac-len", { step: "any", min: "0" });
  const wid = makeNumber("Containment width (ft)", "ac-wid", { step: "any", min: "0" });
  const ht = makeNumber("Containment height (ft)", "ac-ht", { step: "any", min: "0" });
  const ach = makeNumber("Air changes per hour", "ac-ach", { step: "any", min: "0", value: "4" });
  ach.input.value = "4";
  const nam = makeNumber("One negative-air machine airflow (cfm)", "ac-nam", { step: "any", min: "0", value: "1500" });
  nam.input.value = "1500";
  const debris = makeNumber("Regulated debris to bag (cy)", "ac-debris", { step: "any", min: "0", value: "0" });
  debris.input.value = "0";
  for (const f of [len, wid, ht, ach, nam, debris]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { len.input.value = "20"; wid.input.value = "15"; ht.input.value = "9"; ach.input.value = "4"; nam.input.value = "1500"; debris.input.value = "3"; update(); });
  const oPoly = makeOutputLine(outputRegion, "Poly sheeting (incl. 10% laps)", "ac-out-poly");
  const oCfm = makeOutputLine(outputRegion, "Required exhaust airflow", "ac-out-cfm");
  const oNam = makeOutputLine(outputRegion, "Negative-air machines", "ac-out-nam");
  const oBags = makeOutputLine(outputRegion, "Regulated-waste bags", "ac-out-bags");
  const update = debounce(() => {
    const r = computeAbatementContainment({ room_len_ft: Number(len.input.value) || 0, room_wid_ft: Number(wid.input.value) || 0, room_ht_ft: Number(ht.input.value) || 0, ach_target: ach.input.value === "" ? 4 : Number(ach.input.value), nam_cfm: nam.input.value === "" ? 1500 : Number(nam.input.value), debris_cy: debris.input.value === "" ? 0 : Number(debris.input.value) });
    if (r.error) { oPoly.textContent = r.error; for (const o of [oCfm, oNam, oBags]) o.textContent = "-"; return; }
    oPoly.textContent = fmt(r.poly_sf, 0) + " ft^2";
    oCfm.textContent = fmt(r.req_cfm, 0) + " cfm";
    oNam.textContent = r.nam_count + " machine" + (r.nam_count === 1 ? "" : "s");
    oBags.textContent = r.waste_bags + " bags";
  }, DEBOUNCE_MS);
  for (const f of [len, wid, ht, ach, nam, debris]) f.input.addEventListener("input", update);
}
DEMO_RENDERERS["abatement-containment"] = _v69renderAbatementContainment;
