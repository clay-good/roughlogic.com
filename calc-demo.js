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
  DEBOUNCE_MS, debounce, makeNumber, makeCheckbox, makeSelect,
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

// Compact renderer factory, copied verbatim from calc-masonry.js (same
// ui-fields imports) per the new-module convention; only the inner render
// function's name differs, so the schema-coverage gates read it unchanged.
function _simpleRenderer(spec) {
  const _dmRender = function (inputRegion, outputRegion, citationEl) {
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

  _dmRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _dmRender;
}

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
  // The DELTA is legitimately negative -- affected drier than the reference is
  // the outcome the job is chasing, and "at dry standard" is right for it. A
  // negative READING is not: no moisture meter reads below zero, on %MC or on
  // a relative scale. Without this, `affected_reading = -35` against a
  // reference of 12 makes the delta -47, which clears `delta <= allow`, and the
  // tile declares soaked material "at dry standard". Measured 2026-09-10.
  if (ref < 0 || aff < 0) return { error: "Meter readings cannot be negative." };
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
  const ref = makeNumber("Unaffected reference reading (dry standard)", "mdg-ref", { step: "any", min: "0" });
  const aff = makeNumber("Affected material reading", "mdg-aff", { step: "any", min: "0" });
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

// ===========================================================================
// spec-v1691..v1693: the 2026-09-08 trade-expansion abatement band. Three
// tiles, all group D.
//
// TWO OF THE BAND'S FIVE SPECS WERE CUT as duplicates:
//   spec-v1690 negative-air-ach -> `nam-sizing` in calc-restoration.js, which
//     already computes CFM = volume x ACH / 60 and the machine count. It
//     gained the negative pressure target and the HEPA-loading derate.
//   spec-v1694 demolition-debris-tonnage -> `demo-debris` (volume to tons by
//     structure type) and `dumpster-count` (containers, weight against
//     volume) in calc-construction.js, which together answer it. demo-debris
//     gained the container count so the chain completes in one tile.

// ============ spec-v1691: abatement waste volume and container count ============

// dims: in { area_ft2: L^2, thickness_in: L, bulking_factor: dimensionless, bag_volume_ft3: L^3, bag_fill_fraction: dimensionless, material_density_pcf: M L^-3, container_volume_yd3: L^3 } out: { in_place_volume_ft3: L^3, bulked_volume_ft3: L^3, bag_count: dimensionless, waste_weight_lb: M L T^-2, container_count: dimensionless, bulked_volume_yd3: L^3 }
export function computeAbatementWasteContainers({ area_ft2 = 0, thickness_in = 0, bulking_factor = 2, bag_volume_ft3 = 3, bag_fill_fraction = 0.7, material_density_pcf = 30, container_volume_yd3 = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(area_ft2 > 0)) return { error: "The area of material must be positive (sq ft)." };
  if (!(thickness_in > 0)) return { error: "Material thickness must be positive (in)." };
  if (!(bulking_factor >= 1)) return { error: "The bulking factor cannot be below one -- removed material never repacks to its in-place density, and double bagging adds more." };
  if (!(bag_volume_ft3 > 0)) return { error: "Bag volume must be positive (cu ft)." };
  if (!(bag_fill_fraction > 0 && bag_fill_fraction <= 1)) return { error: "The bag fill fraction must be greater than zero and no more than one -- a bag has to be gooseneck-sealed and carried out, so it is not filled to capacity." };
  if (!(material_density_pcf > 0)) return { error: "Material density must be positive (pcf)." };
  if (container_volume_yd3 < 0) return { error: "Container volume cannot be negative (cubic yards)." };
  const IN_PER_FT_DM = 12;
  const CF_PER_CY = 27;
  const in_place_volume_ft3 = area_ft2 * (thickness_in / IN_PER_FT_DM);
  const in_place_volume_yd3 = in_place_volume_ft3 / CF_PER_CY;
  const bulked_volume_ft3 = in_place_volume_ft3 * bulking_factor;
  const bulked_volume_yd3 = bulked_volume_ft3 / CF_PER_CY;
  const usable_bag_volume_ft3 = bag_volume_ft3 * bag_fill_fraction;
  const bag_count = Math.ceil(bulked_volume_ft3 / usable_bag_volume_ft3);
  // Weight follows the IN-PLACE volume: bulking is air, and air weighs
  // nothing. Estimating weight on the bulked volume overstates it badly.
  const waste_weight_lb = in_place_volume_ft3 * material_density_pcf;
  const waste_weight_tons = waste_weight_lb / 2000;
  const container_count = container_volume_yd3 > 0 ? Math.ceil(bulked_volume_yd3 / container_volume_yd3) : null;
  const naive_bag_count = Math.ceil(in_place_volume_ft3 / bag_volume_ft3);
  const bag_multiple = naive_bag_count > 0 ? bag_count / naive_bag_count : null;
  const outs = [in_place_volume_ft3, bulked_volume_ft3, bag_count, waste_weight_lb];
  if (!outs.every(Number.isFinite)) return { error: "Abatement waste math is not a finite value." };
  return {
    area_ft2, thickness_in, in_place_volume_ft3, in_place_volume_yd3, bulking_factor,
    bulked_volume_ft3, bulked_volume_yd3, bag_volume_ft3, bag_fill_fraction,
    usable_bag_volume_ft3, bag_count, naive_bag_count, bag_multiple,
    material_density_pcf, waste_weight_lb, waste_weight_tons,
    container_volume_yd3, container_count,
    note: "THE BULKING FACTOR IS THE TERM ESTIMATES MISS, and it misses in the direction that runs a job out of containers. Material removed from a wall, a ceiling or a pipe does not repack to the density it had in place -- it comes off in pieces with air between them -- and the double bagging the regulations require adds more air around every bag. So the volume leaving the site is well above the volume that was on the building, and a container count built on in-place volume comes up short on the last day with regulated waste on the floor and nowhere to put it. BAGS ARE NOT FILLED TO THEIR NOMINAL CAPACITY either, and that compounds it. A bag has to be gooseneck-sealed, wiped down, passed through a decontamination unit and carried out by hand, and a bag filled to its rated volume can be neither sealed properly nor safely handled. The usable volume is a fraction of the printed one, and the two effects together commonly put the real bag count at several times what a naive in-place calculation gives -- which is the comparison reported here. WEIGHT FOLLOWS THE IN-PLACE VOLUME AND NOT THE BULKED VOLUME, because bulking is air. Estimating weight from the bulked figure overstates it badly, and weight is what matters for the floor loading of a staging area, for the hoist or elevator that moves the waste out, and for the disposal facility's scale ticket. Wet material and any encapsulant applied before removal both add substantial weight that this does not know about. The container is usually governed by VOLUME rather than by its weight rating, because bagged abatement waste is bulky and light, and the container is lined regardless. AND THE WASTE IS REGULATED FROM THE MOMENT IT IS BAGGED. It is manifested, it goes to a permitted facility that accepts that waste stream, and the paperwork follows it there -- so the container count is a logistics number with a compliance obligation attached to every one of them. A quantity estimate. It does not classify the waste, determine whether the material is regulated, or select the disposal facility; those follow from the survey and the applicable federal, state and local rules, which differ. It does not address the containment, the decontamination unit, the negative air system, the work practices, the worker protection, or the air monitoring and clearance that surround the removal, and it does not size the staging area or evaluate the floor loading it needs. The applicable EPA, OSHA and state regulations, the project design and specifications, and the licensed abatement contractor govern.",
  };
}
const abatementWasteContainersExample = { inputs: { area_ft2: 2000, thickness_in: 1, bulking_factor: 2, bag_volume_ft3: 3, bag_fill_fraction: 0.7, material_density_pcf: 30, container_volume_yd3: 20 } };
DEMO_RENDERERS["abatement-waste-containers"] = _simpleRenderer({
  citation: "Citation: the abatement waste quantity relations by name -- in-place volume = area x thickness; bulked volume = that times a bulking factor of about 1.5 to 2.5, because removed material does not repack and double bagging adds air; bag count = bulked volume / (bag volume x the fill fraction), since a bag must be gooseneck-sealed and hand-carried; and WEIGHT follows the IN-PLACE volume, because bulking is air. Containers are usually governed by volume rather than by their weight rating. It does not classify the waste or select a facility. The applicable EPA, OSHA and state regulations, the project design and specifications, and the licensed abatement contractor govern.",
  example: abatementWasteContainersExample.inputs,
  fields: [
    { key: "area_ft2", label: "Area of material (sq ft)", kind: "number", default: 2000 },
    { key: "thickness_in", label: "Material thickness (in)", kind: "number", default: 1 },
    { key: "bulking_factor", label: "Bulking factor", kind: "number", default: 2 },
    { key: "bag_volume_ft3", label: "Bag nominal volume (cu ft)", kind: "number", default: 3 },
    { key: "bag_fill_fraction", label: "Bag fill fraction", kind: "number", default: 0.7 },
    { key: "material_density_pcf", label: "In-place material density (pcf)", kind: "number", default: 30 },
    { key: "container_volume_yd3", label: "Container volume (cubic yards, 0 to skip)", kind: "number", default: 20 },
  ],
  outputs: [
    { key: "v", id: "awc-out-v", label: "Volume", value: (r) => fmt(r.in_place_volume_ft3, 1) + " cu ft in place becomes " + fmt(r.bulked_volume_ft3, 1) + " cu ft (" + fmt(r.bulked_volume_yd3, 2) + " cy) bagged, at a bulking factor of " + fmt(r.bulking_factor, 2) },
    { key: "b", id: "awc-out-b", label: "Bags", value: (r) => fmt(r.bag_count, 0) + " at " + fmt(r.usable_bag_volume_ft3, 2) + " cu ft usable each -- against " + fmt(r.naive_bag_count, 0) + " if the in-place volume and the full bag were used, which is " + fmt(r.bag_multiple, 2) + "x out" },
    { key: "w", id: "awc-out-w", label: "Weight", value: (r) => fmt(r.waste_weight_lb, 0) + " lb (" + fmt(r.waste_weight_tons, 2) + " tons) -- from the IN-PLACE volume, because bulking is air. Wet material and encapsulant add more" },
    { key: "c", id: "awc-out-c", label: "Containers", value: (r) => r.container_count === null ? "(no container volume entered)" : fmt(r.container_count, 0) + " lined container" + (r.container_count === 1 ? "" : "s") + " at " + fmt(r.container_volume_yd3, 0) + " cy, governed by volume rather than by the weight rating -- each one manifested to a permitted facility" },
    { key: "n", id: "awc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAbatementWasteContainers,
});

// ============ spec-v1692: lead dust clearance loading and wipe count ============

// dims: in { lab_result_ug: M, wipe_area_ft2: L^2, clearance_limit_ug_ft2: M L^-2, rooms: dimensionless, surfaces_per_room: dimensionless, blanks_per_job: dimensionless } out: { dust_loading_ug_ft2: M L^-2, limit_margin_ug_ft2: M L^-2, loading_ratio: dimensionless, max_lab_result_ug: M, wipe_count: dimensionless, total_samples: dimensionless }
export function computeLeadDustClearance({ lab_result_ug = 0, wipe_area_ft2 = 1, clearance_limit_ug_ft2 = 0, rooms = 0, surfaces_per_room = 3, blanks_per_job = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(lab_result_ug >= 0)) return { error: "The laboratory result cannot be negative (micrograms)." };
  if (!(wipe_area_ft2 > 0)) return { error: "The wiped area must be positive (sq ft) -- it is measured with a template, commonly one square foot." };
  if (!(clearance_limit_ug_ft2 > 0)) return { error: "The clearance limit must be positive (micrograms per sq ft) -- floors, sills and troughs each have their own, and the limits have been tightened over time." };
  if (rooms < 0) return { error: "The room count cannot be negative." };
  if (!(surfaces_per_room >= 1)) return { error: "There is at least one surface type sampled per room." };
  if (blanks_per_job < 0) return { error: "The field blank count cannot be negative." };
  const dust_loading_ug_ft2 = lab_result_ug / wipe_area_ft2;
  const limit_margin_ug_ft2 = clearance_limit_ug_ft2 - dust_loading_ug_ft2;
  const loading_ratio = dust_loading_ug_ft2 / clearance_limit_ug_ft2;
  const passes = dust_loading_ug_ft2 <= clearance_limit_ug_ft2;
  // The laboratory result the wiped area can carry and still pass, which is
  // the number that tells a supervisor how little dust the limit represents.
  const max_lab_result_ug = clearance_limit_ug_ft2 * wipe_area_ft2;
  const wipe_count = rooms > 0 ? Math.round(rooms) * Math.round(surfaces_per_room) : null;
  const total_samples = wipe_count === null ? null : wipe_count + Math.round(blanks_per_job);
  const outs = [dust_loading_ug_ft2, limit_margin_ug_ft2, loading_ratio, max_lab_result_ug];
  if (!outs.every(Number.isFinite)) return { error: "Dust clearance math is not a finite value." };
  const verdict = passes
    ? "PASSES at " + fmt(dust_loading_ug_ft2, 1) + " micrograms per sq ft against a limit of " + fmt(clearance_limit_ug_ft2, 1) + ", with " + fmt(limit_margin_ug_ft2, 1) + " to spare -- " + fmt(loading_ratio * 100, 0) + "% of the limit"
    : "FAILS at " + fmt(dust_loading_ug_ft2, 1) + " micrograms per sq ft against a limit of " + fmt(clearance_limit_ug_ft2, 1) + ", " + fmt(-limit_margin_ug_ft2, 1) + " over -- " + fmt(loading_ratio * 100, 0) + "% of the limit. The affected area is re-cleaned and re-tested, and the cost of that is why the cleaning is done properly the first time";
  return {
    lab_result_ug, wipe_area_ft2, dust_loading_ug_ft2, clearance_limit_ug_ft2,
    limit_margin_ug_ft2, loading_ratio, passes, max_lab_result_ug, rooms,
    surfaces_per_room, wipe_count, blanks_per_job, total_samples, verdict,
    note: "Lead dust clearance is a MASS PER AREA, and the arithmetic is one division -- the laboratory reports micrograms recovered from the wipe, and the wiped area turns that into a loading. The reason the calculation matters is the size of the numbers: THE LIMITS ARE SMALL ENOUGH THAT SURFACES WHICH LOOK AND FEEL CLEAN ROUTINELY FAIL. Lead dust is fine, it is invisible at these loadings, and a floor that a supervisor would sign off by eye can be several times over. The laboratory result a wipe can carry and still pass is reported here for that reason: it converts an abstract limit into the amount of dust that is actually allowed on a square foot, and it is startlingly little. THE WIPED AREA HAS TO BE MEASURED, not estimated, because it is the denominator. A template is used for exactly that reason, and a wipe taken over a guessed area produces a loading that is wrong by whatever the guess was wrong by -- in either direction. A larger area wiped with the same effort also collects more dust, so the area and the technique are both part of the result. Floors, interior window sills, and window troughs each carry their OWN limit, and the limits have been tightened over time -- a project clearing against a superseded number is clearing against nothing. The sample count follows the applicable protocol by room and by surface type, and some protocols permit compositing several surfaces into one sample while others require single-surface samples; a composite that fails does not say which surface failed, which is a trade between cost and information. Field blanks are part of the sample set and not an optional extra: a blank that shows lead invalidates the batch, which is the point of it. AND FIELD SCREENING IS NOT CLEARANCE. Analysis is by an accredited laboratory, a portable instrument reading is not a clearance result, and clearance is performed by someone independent of the party that did the work. A failed clearance means re-cleaning and re-testing the affected area, which is why the specialised cleaning -- HEPA vacuum, wet wipe, HEPA vacuum -- is done thoroughly the first time. It does not determine the applicable limit, the sampling protocol, the number or location of samples for a given job, or who may perform the clearance, all of which come from the governing rule and differ between programmes and jurisdictions. It does not address the work practices, containment, or occupant protection that precede clearance. The applicable EPA and HUD rules as adopted, the accredited laboratory, and the certified risk assessor or inspector govern.",
  };
}
const leadDustClearanceExample = { inputs: { lab_result_ug: 12, wipe_area_ft2: 1, clearance_limit_ug_ft2: 10, rooms: 4, surfaces_per_room: 3, blanks_per_job: 1 } };
DEMO_RENDERERS["lead-dust-clearance"] = _simpleRenderer({
  citation: "Citation: the lead dust clearance identity by name -- dust loading = the laboratory's recovered micrograms / the measured wiped area, compared against the limit for that surface type. Floors, interior window sills and window troughs each carry their OWN limit and the limits have been tightened over time, so the limit is ENTERED from the rule as adopted. Analysis is by an accredited laboratory; field screening is not clearance. It does not set the sampling protocol, the sample count or locations, or who may perform clearance. The applicable EPA and HUD rules as adopted, the accredited laboratory, and the certified risk assessor or inspector govern.",
  example: leadDustClearanceExample.inputs,
  fields: [
    { key: "lab_result_ug", label: "Laboratory result (micrograms on the wipe)", kind: "number", default: 12 },
    { key: "wipe_area_ft2", label: "Measured wiped area (sq ft)", kind: "number", default: 1 },
    { key: "clearance_limit_ug_ft2", label: "Clearance limit for this surface (micrograms per sq ft)", kind: "number", default: 10 },
    { key: "rooms", label: "Rooms to sample (0 to skip the count)", kind: "number", default: 4 },
    { key: "surfaces_per_room", label: "Surface types sampled per room", kind: "number", default: 3 },
    { key: "blanks_per_job", label: "Field blanks", kind: "number", default: 1 },
  ],
  outputs: [
    { key: "l", id: "ldc-out-l", label: "Dust loading", value: (r) => fmt(r.dust_loading_ug_ft2, 2) + " micrograms per sq ft -- " + fmt(r.lab_result_ug, 1) + " micrograms over " + fmt(r.wipe_area_ft2, 2) + " sq ft" },
    { key: "v", id: "ldc-out-v", label: "Against the limit", value: (r) => r.verdict },
    { key: "m", id: "ldc-out-m", label: "What the limit actually allows", value: (r) => fmt(r.max_lab_result_ug, 1) + " micrograms on this wipe -- which is why surfaces that look and feel clean routinely fail" },
    { key: "c", id: "ldc-out-c", label: "Samples", value: (r) => r.wipe_count === null ? "(no room count entered)" : fmt(r.wipe_count, 0) + " wipes across " + fmt(r.rooms, 0) + " rooms at " + fmt(r.surfaces_per_room, 0) + " surface types, plus " + fmt(r.blanks_per_job, 0) + " field blank" + (r.blanks_per_job === 1 ? "" : "s") + " -- " + fmt(r.total_samples, 0) + " to the laboratory" },
    { key: "n", id: "ldc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLeadDustClearance,
});

// ============ spec-v1693: respirable silica exposure and ventilation screen ============

// dims: in { measured_concentration_ug_m3: M L^-3, sample_minutes: T, shift_minutes: T, pel_ug_m3: M L^-3, action_level_ug_m3: M L^-3, control_efficiency_pct: dimensionless } out: { twa_ug_m3: M L^-3, pel_ratio: dimensionless, over_pel_by_ug_m3: M L^-3, controlled_twa_ug_m3: M L^-3, required_efficiency_pct: dimensionless, max_task_minutes: T }
export function computeSilicaVentilationScreen({ measured_concentration_ug_m3 = 0, sample_minutes = 0, shift_minutes = 480, pel_ug_m3 = 50, action_level_ug_m3 = 25, control_efficiency_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(measured_concentration_ug_m3 >= 0)) return { error: "The measured concentration cannot be negative (micrograms per cubic metre)." };
  if (!(sample_minutes > 0)) return { error: "The sampled time must be positive (min)." };
  if (!(shift_minutes > 0)) return { error: "The shift length must be positive (min) -- the PEL is an 8-hour time-weighted average, so 480 min is the reference." };
  if (!(sample_minutes <= shift_minutes)) return { error: "The sampled time cannot exceed the shift; the unsampled remainder is what the average is taken over." };
  if (!(pel_ug_m3 > 0)) return { error: "The permissible exposure limit must be positive (micrograms per cubic metre)." };
  if (!(action_level_ug_m3 > 0)) return { error: "The action level must be positive (micrograms per cubic metre)." };
  if (!(control_efficiency_pct >= 0 && control_efficiency_pct < 100)) return { error: "The control efficiency must be at least zero and below 100 percent." };
  const REFERENCE_MINUTES = 480;
  // The 8-hour TWA averages the sampled exposure over the full reference
  // period, treating the unsampled remainder of the shift as zero exposure.
  const twa_ug_m3 = measured_concentration_ug_m3 * sample_minutes / REFERENCE_MINUTES;
  const pel_ratio = twa_ug_m3 / pel_ug_m3;
  const over_pel = twa_ug_m3 > pel_ug_m3;
  const over_action_level = twa_ug_m3 > action_level_ug_m3;
  const over_pel_by_ug_m3 = twa_ug_m3 - pel_ug_m3;
  const controlled_twa_ug_m3 = twa_ug_m3 * (1 - control_efficiency_pct / 100);
  const controlled_over_pel = controlled_twa_ug_m3 > pel_ug_m3;
  // The control efficiency that would bring this exposure to the PEL, and the
  // task time that would, which are the two levers an employer has.
  const required_efficiency_pct = twa_ug_m3 > pel_ug_m3 ? (1 - pel_ug_m3 / twa_ug_m3) * 100 : 0;
  const max_task_minutes = measured_concentration_ug_m3 > 0
    ? pel_ug_m3 * REFERENCE_MINUTES / measured_concentration_ug_m3
    : null;
  const max_task_minutes_controlled = (measured_concentration_ug_m3 > 0 && control_efficiency_pct > 0)
    ? pel_ug_m3 * REFERENCE_MINUTES / (measured_concentration_ug_m3 * (1 - control_efficiency_pct / 100))
    : null;
  const outs = [twa_ug_m3, pel_ratio, over_pel_by_ug_m3, controlled_twa_ug_m3];
  if (!outs.every(Number.isFinite)) return { error: "Silica exposure math is not a finite value." };
  const verdict = over_pel
    ? "OVER THE PEL: " + fmt(twa_ug_m3, 1) + " micrograms per cubic metre as an 8-hour TWA against " + fmt(pel_ug_m3, 0) + ", " + fmt(pel_ratio, 2) + "x it. Controls to " + fmt(required_efficiency_pct, 0) + "% efficiency, or " + (max_task_minutes === null ? "less task time" : fmt(max_task_minutes, 0) + " min of the task instead of " + fmt(sample_minutes, 0)) + ", brings it to the limit"
    : over_action_level
      ? "OVER THE ACTION LEVEL, UNDER THE PEL: " + fmt(twa_ug_m3, 1) + " against an action level of " + fmt(action_level_ug_m3, 0) + " and a PEL of " + fmt(pel_ug_m3, 0) + ". The action level triggers monitoring obligations of its own -- it is not a safe-and-done line"
      : "UNDER THE ACTION LEVEL at " + fmt(twa_ug_m3, 1) + " against " + fmt(action_level_ug_m3, 0) + ", and under the " + fmt(pel_ug_m3, 0) + " PEL";
  const control_verdict = control_efficiency_pct === 0
    ? "No control efficiency entered. Water suppression and local exhaust ventilation at the airflow the table specifies are the engineering controls, and they come before respirators."
    : controlled_over_pel
      ? "STILL OVER at " + fmt(controlled_twa_ug_m3, 1) + " with a " + fmt(control_efficiency_pct, 0) + "% control -- " + fmt(required_efficiency_pct, 0) + "% is what this exposure needs"
      : "CONTROLLED to " + fmt(controlled_twa_ug_m3, 1) + " with a " + fmt(control_efficiency_pct, 0) + "% control, under the " + fmt(pel_ug_m3, 0) + " PEL"
        + (max_task_minutes_controlled === null ? "" : ", and the task could run " + fmt(max_task_minutes_controlled, 0) + " min at that control");
  return {
    measured_concentration_ug_m3, sample_minutes, shift_minutes, twa_ug_m3,
    pel_ug_m3, action_level_ug_m3, pel_ratio, over_pel, over_action_level,
    over_pel_by_ug_m3, control_efficiency_pct, controlled_twa_ug_m3,
    controlled_over_pel, required_efficiency_pct, max_task_minutes,
    max_task_minutes_controlled, verdict, control_verdict,
    note: "Respirable crystalline silica is regulated as an 8-hour time-weighted average, and the averaging is what people get wrong in both directions. A high concentration over a short task averages down across the shift, so a brief cut at a very high level can still land under the limit -- and a moderate concentration sustained all day does not. THE TASK TIME IS THEREFORE A CONTROL, and the task time that would bring an exposure to the limit is reported here beside the control efficiency that would, because those are the two levers an employer actually has. Treating the unsampled part of the shift as zero exposure is the standard convention and it is only true if the worker really was away from the dust. THE ACTION LEVEL IS NOT A SAFE LINE, it is a trigger. Crossing it starts monitoring obligations that continue until two consecutive results fall below it, and an employer who treats it as the number to stay under has misread which of the two limits does what. The PEL is the exposure ceiling; the action level is where the paperwork begins. TABLE 1 IS THE OTHER PATH AND IT IS OFTEN THE CHEAPER ONE. OSHA lists common construction tasks with specified engineering controls -- water suppression, or local exhaust at a stated airflow for the tool -- and an employer who implements the listed controls FULLY, including the respiratory protection the table specifies for the duration worked, is exempt from assessing exposure at all. Fully is the operative word: a partial implementation gets neither the exemption nor the control. Outside Table 1, exposure must be assessed by sampling or by objective data, and controlled to the PEL. Engineering controls come before respirators in the hierarchy and that ordering is a requirement rather than a preference. Water suppression on a saw and a shroud with local exhaust on a grinder are the two that do most of the work, and both fail quietly: a saw run with the water off, or a vacuum with a loaded filter and no airflow, looks exactly like a controlled operation and is not. SILICOSIS IS IRREVERSIBLE AND THE EXPOSURES THAT CAUSE IT ARE INVISIBLE. Respirable particles are far below the size the eye can see, so a visibly dusty operation is badly out of control and an operation that looks clean can still be over the limit. A screen from a measurement the reader supplies. It does not perform exposure monitoring, which requires calibrated sampling equipment, a compliant sampling strategy, and an accredited laboratory; a single sample is not an exposure assessment. It does not select respiratory protection, determine the assigned protection factor required, or address fit testing, medical surveillance, the written exposure control plan, housekeeping, or the competent person the standard requires. Control efficiencies are entered and are not a property of a tool: they depend on the shroud, the airflow, the filter condition and the operator. OSHA 29 CFR 1926.1153 and its Table 1, the employer's exposure control plan, and a qualified industrial hygienist govern.",
  };
}
const silicaVentilationScreenExample = { inputs: { measured_concentration_ug_m3: 180, sample_minutes: 240, shift_minutes: 480, pel_ug_m3: 50, action_level_ug_m3: 25, control_efficiency_pct: 80 } };
DEMO_RENDERERS["silica-ventilation-screen"] = _simpleRenderer({
  citation: "Citation: the OSHA 29 CFR 1926.1153 respirable crystalline silica limits by name -- a PEL of 50 micrograms per cubic metre as an 8-hour time-weighted average and an action level of 25 that triggers monitoring obligations -- with the TWA as the measured concentration x sampled minutes / 480. Table 1 lists tasks with specified engineering controls, and implementing them FULLY exempts the employer from exposure assessment. Control efficiencies are ENTERED and are not a property of a tool. A single sample is not an exposure assessment. OSHA 29 CFR 1926.1153 and its Table 1, the employer's exposure control plan, and a qualified industrial hygienist govern.",
  example: silicaVentilationScreenExample.inputs,
  fields: [
    { key: "measured_concentration_ug_m3", label: "Measured concentration (micrograms per cu m)", kind: "number", default: 180 },
    { key: "sample_minutes", label: "Minutes at that concentration", kind: "number", default: 240 },
    { key: "shift_minutes", label: "Shift length (min)", kind: "number", default: 480 },
    { key: "pel_ug_m3", label: "Permissible exposure limit (micrograms per cu m)", kind: "number", default: 50 },
    { key: "action_level_ug_m3", label: "Action level (micrograms per cu m)", kind: "number", default: 25 },
    { key: "control_efficiency_pct", label: "Engineering control efficiency (%, 0 for none)", kind: "number", default: 80 },
  ],
  outputs: [
    { key: "t", id: "svs-out-t", label: "8-hour TWA", value: (r) => fmt(r.twa_ug_m3, 1) + " micrograms per cu m -- " + fmt(r.measured_concentration_ug_m3, 0) + " over " + fmt(r.sample_minutes, 0) + " min, averaged across the 480 min reference" },
    { key: "v", id: "svs-out-v", label: "Against the limits", value: (r) => r.verdict },
    { key: "c", id: "svs-out-c", label: "With controls", value: (r) => r.control_verdict },
    { key: "m", id: "svs-out-m", label: "Task time as a control", value: (r) => r.max_task_minutes === null ? "(no concentration entered)" : fmt(r.max_task_minutes, 0) + " min of this task uncontrolled reaches the PEL. Time and control efficiency are the two levers, and engineering controls come before respirators" },
    { key: "n", id: "svs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSilicaVentilationScreen,
});
