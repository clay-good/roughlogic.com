// Group E (cont.): soil characterization, laboratory testing, and aggregate grading.
// spec-v1858 moves these existing calculators out of calc-earthwork.js so the
// earthwork module stays below its gzip cap. Calculator behavior, IDs,
// citations, examples, and Group E assignments are unchanged.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeOutputLine, attachExampleButton, fmt,
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

export const SOILPROPERTIES_RENDERERS = {};

// ===================== spec-v326..v328: soil characterization / QC batch =====================
// The earthwork and soil-testing numbers the volume-conversion tile never
// covers: the relative compaction of a placed lift, the three-phase relations
// (void ratio, porosity, saturation), and the Atterberg plasticity indices with
// the A-line USCS classification.
const _GAMMA_W = 62.4; // pcf, fresh water

// dims: in { wet_pcf: M L^-2 T^-2, w_pct: dimensionless, max_pcf: M L^-2 T^-2, spec_pct: dimensionless } out: { gd_field: M L^-2 T^-2, rc_pct: dimensionless }
export function computeRelativeCompaction({ wet_pcf = 0, w_pct = 0, max_pcf = 0, spec_pct = 95 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(wet_pcf > 0)) return { error: "Field wet density must be positive (pcf)." };
  if (w_pct < 0) return { error: "Moisture content cannot be negative (%)." };
  if (!(max_pcf > 0)) return { error: "Proctor maximum dry density must be positive (pcf)." };
  if (!(spec_pct > 0)) return { error: "The required relative compaction must be positive (%)." };
  const gd_field = wet_pcf / (1 + w_pct / 100);
  const rc_pct = (gd_field / max_pcf) * 100;
  const pass = rc_pct >= spec_pct;
  return {
    gd_field, rc_pct, pass,
    note: "Relative compaction RC = (gamma_d,field / gamma_d,max) x 100, with the field dry density backed out of the measured wet density and moisture, gamma_d,field = gamma_wet / (1 + w). The Proctor maximum is from ASTM D698 (standard) or D1557 (modified), and typical specs run 90-95% (structural fill often 95%, pavement subgrade higher). The moisture reading is as important as the density - the same wet density fails when the extra water is not soil, which is why over-wet fill is rejected. Enter the Proctor maximum (it depends on the standard vs modified test and the soil); it does not compute the optimum-moisture window, the one-point Proctor, or the cohesionless relative density Dr. A QC aid; the project geotechnical specification and the testing agency govern.",
  };
}
export const relativeCompactionExample = { inputs: { wet_pcf: 128, w_pct: 12, max_pcf: 120, spec_pct: 95 } };

function _v326renderRelativeCompaction(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: relative compaction RC = (gamma_d,field / gamma_d,max) x 100, field dry density gamma_d,field = gamma_wet / (1 + w), Proctor maximum from ASTM D698 / D1557, typical 90-95% specs, by name. Enter the Proctor maximum. A QC aid; the geotechnical spec governs.";
  const wet = makeNumber("Field wet density (pcf)", "rc-wet", { step: "any", min: "0" });
  const w = makeNumber("Field moisture content (%)", "rc-w", { step: "any", min: "0" });
  const max = makeNumber("Proctor maximum dry density (pcf)", "rc-max", { step: "any", min: "0" });
  const spec = makeNumber("Required relative compaction (%)", "rc-spec", { step: "any", min: "0" }); spec.input.value = "95";
  for (const f of [wet, w, max, spec]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { wet.input.value = "128"; w.input.value = "12"; max.input.value = "120"; spec.input.value = "95"; update(); });
  const oGd = makeOutputLine(outputRegion, "Field dry density", "rc-out-gd");
  const oRc = makeOutputLine(outputRegion, "Relative compaction", "rc-out-rc");
  const oNote = makeOutputLine(outputRegion, "Note", "rc-out-note");
  const update = debounce(() => {
    const r = computeRelativeCompaction({ wet_pcf: Number(wet.input.value) || 0, w_pct: Number(w.input.value) || 0, max_pcf: Number(max.input.value) || 0, spec_pct: Number(spec.input.value) || 0 });
    if (r.error) { oGd.textContent = r.error; oRc.textContent = "-"; oNote.textContent = "-"; return; }
    oGd.textContent = fmt(r.gd_field, 1) + " pcf";
    oRc.textContent = fmt(r.rc_pct, 1) + "% - " + (r.pass ? "PASS" : "FAIL") + " (spec " + fmt(Number(spec.input.value) || 0, 0) + "%)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [wet, w, max, spec]) f.input.addEventListener("input", update);
}
SOILPROPERTIES_RENDERERS["relative-compaction"] = _v326renderRelativeCompaction;

// dims: in { field_wet_pcf: M L^-2 T^-2, w_pct: dimensionless, gamma_dmin_pcf: M L^-2 T^-2, gamma_dmax_pcf: M L^-2 T^-2 } out: { gd_field_pcf: M L^-2 T^-2, dr_pct: dimensionless }
export function computeSoilRelativeDensity({ field_wet_pcf = 0, w_pct = 0, gamma_dmin_pcf = 0, gamma_dmax_pcf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(field_wet_pcf > 0)) return { error: "Field density must be positive (pcf)." };
  if (w_pct < 0) return { error: "Moisture content cannot be negative (%)." };
  if (!(gamma_dmin_pcf > 0)) return { error: "Minimum index dry density must be positive (pcf)." };
  if (!(gamma_dmax_pcf > gamma_dmin_pcf)) return { error: "Maximum index dry density must exceed the minimum (pcf)." };
  // Same conversion the relative-compaction sibling uses: back the dry density
  // out of the measured wet density and moisture (w = 0 means it is already dry).
  const gd_field_pcf = field_wet_pcf / (1 + w_pct / 100);
  // Dr = (e_max - e)/(e_max - e_min). Substituting e = Gs gamma_w/gamma_d - 1
  // cancels Gs and gamma_w entirely, leaving the dry-density form below, so this
  // needs no specific gravity and no unit weight of water.
  const dr_pct = 100 * gamma_dmax_pcf * (gd_field_pcf - gamma_dmin_pcf) / (gd_field_pcf * (gamma_dmax_pcf - gamma_dmin_pcf));
  const below_min = gd_field_pcf < gamma_dmin_pcf;
  const above_max = gd_field_pcf > gamma_dmax_pcf;
  const out_of_range = below_min || above_max;
  // Descriptive terms in common use for cohesionless soils. These are
  // conventional labels, NOT a code requirement; the project spec governs.
  const state = dr_pct < 15 ? "very loose" : dr_pct < 35 ? "loose" : dr_pct < 65 ? "medium dense" : dr_pct < 85 ? "dense" : "very dense";
  return {
    gd_field_pcf, dr_pct, state, out_of_range, below_min, above_max,
    note: "Relative density (density index) Dr, the correct compaction measure for a CLEAN SAND or gravel, where a Proctor curve is poorly defined and relative compaction is the wrong spec. Defined on void ratios as Dr = (e_max - e)/(e_max - e_min); substituting the phase relation e = Gs gamma_w/gamma_d - 1 cancels the specific gravity and the unit weight of water completely, leaving the dry-density form used here, Dr = gamma_d,max (gamma_d - gamma_d,min) / (gamma_d (gamma_d,max - gamma_d,min)). That cancellation is why no Gs is asked for. The field dry density is backed out of the measured wet density and moisture, gamma_d = gamma_wet/(1 + w); enter a moisture of 0 if the density is already dry. Dr is measured against the LOOSEST and DENSEST index densities of that same soil, not against a Proctor maximum, so the two scales are not interchangeable and a sand at 95% relative compaction can still be loose. A result below 0% or above 100% means the field density falls outside the index-test range: re-check the index tests or the field measurement rather than reporting it. The descriptive bands (very loose / loose / medium dense / dense / very dense) are terms in common use, not a code requirement. A QC aid; the project geotechnical specification, the index-density test results, and the testing agency govern.",
  };
}
export const soilRelativeDensityExample = { inputs: { field_wet_pcf: 117.6, w_pct: 12, gamma_dmin_pcf: 90, gamma_dmax_pcf: 115 } };

function _v1014renderSoilRelativeDensity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: relative density (density index) Dr = (e_max - e)/(e_max - e_min), reduced to its dry-density form Dr = gamma_d,max (gamma_d - gamma_d,min)/(gamma_d (gamma_d,max - gamma_d,min)) by substituting e = Gs gamma_w/gamma_d - 1, which cancels the specific gravity and the unit weight of water; the field dry density from gamma_d = gamma_wet/(1 + w). The minimum and maximum index dry densities come from the laboratory index-density tests for that soil and are entered, not bundled. The descriptive bands are terms in common use, not a code requirement. A QC aid; the project geotechnical specification and the testing agency govern.";
  attachExampleButton(inputRegion, () => { wet.input.value = "117.6"; w.input.value = "12"; dmin.input.value = "90"; dmax.input.value = "115"; update(); });
  const wet = makeNumber("Field density (pcf)", "srd-wet", { step: "any", min: "0" });
  const w = makeNumber("Moisture content w (%, 0 = already dry)", "srd-w", { step: "any", min: "0" });
  const dmin = makeNumber("Minimum index dry density, loosest (pcf)", "srd-dmin", { step: "any", min: "0" });
  const dmax = makeNumber("Maximum index dry density, densest (pcf)", "srd-dmax", { step: "any", min: "0" });
  for (const f of [wet, w, dmin, dmax]) inputRegion.appendChild(f.wrap);
  const oGd = makeOutputLine(outputRegion, "Field dry density", "srd-out-gd");
  const oDr = makeOutputLine(outputRegion, "Relative density Dr", "srd-out-dr");
  const oSt = makeOutputLine(outputRegion, "Descriptive state", "srd-out-st");
  const oNote = makeOutputLine(outputRegion, "Note", "srd-out-n");
  const update = debounce(() => {
    const r = computeSoilRelativeDensity({
      field_wet_pcf: Number(wet.input.value) || 0,
      w_pct: Number(w.input.value) || 0,
      gamma_dmin_pcf: Number(dmin.input.value) || 0,
      gamma_dmax_pcf: Number(dmax.input.value) || 0,
    });
    if (r.error) {
      oGd.textContent = r.error;
      for (const o of [oDr, oSt, oNote]) o.textContent = "-";
      return;
    }
    oGd.textContent = fmt(r.gd_field_pcf, 1) + " pcf";
    oDr.textContent = fmt(r.dr_pct, 1) + "%"
      + (r.below_min ? " - BELOW the loosest index density; re-check the tests" : "")
      + (r.above_max ? " - ABOVE the densest index density; re-check the tests" : "");
    oSt.textContent = r.out_of_range ? "- (outside the index-test range)" : r.state + " (terms in common use, not a code requirement)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [wet, w, dmin, dmax]) f.input.addEventListener("input", update);
}
SOILPROPERTIES_RENDERERS["soil-relative-density"] = _v1014renderSoilRelativeDensity;

// dims: in { gamma_pcf: M L^-2 T^-2, w_pct: dimensionless, gs: dimensionless } out: { gamma_d_pcf: M L^-2 T^-2, e_ratio: dimensionless, n_porosity: dimensionless, s_pct: dimensionless }
export function computeSoilPhaseRelations({ gamma_pcf = 0, w_pct = 0, gs = 2.70 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(gamma_pcf > 0)) return { error: "Total unit weight must be positive (pcf)." };
  if (w_pct < 0) return { error: "Water content cannot be negative (%)." };
  if (!(gs > 0)) return { error: "Specific gravity of solids must be positive (~2.65-2.72)." };
  const gamma_d_pcf = gamma_pcf / (1 + w_pct / 100);
  const e_ratio = (gs * _GAMMA_W) / gamma_d_pcf - 1;
  if (!(e_ratio > 0)) return { error: "The inputs give a non-positive void ratio - check the unit weight and Gs (an impossibly dense soil)." };
  const n_porosity = e_ratio / (1 + e_ratio);
  const s_pct = ((w_pct / 100) * gs) / e_ratio * 100;
  return {
    gamma_d_pcf, e_ratio, n_porosity, s_pct,
    note: "Soil three-phase relations from the total unit weight, water content, and specific gravity of solids: dry unit weight gamma_d = gamma/(1 + w), void ratio e = Gs gamma_w/gamma_d - 1, porosity n = e/(1 + e), degree of saturation S = w Gs/e, with gamma_w = 62.4 pcf (fresh water) and Gs ~ 2.65-2.72 for common soils. The void ratio feeds a consolidation settlement, the porosity a seepage calc, and the saturation says how much air is left to squeeze out. Enter Gs (measure or estimate by soil type); it does not compute the permeability, the effective stress, or the compaction relative density. An engineering aid; the soil test data govern.",
  };
}
export const soilPhaseRelationsExample = { inputs: { gamma_pcf: 120, w_pct: 15, gs: 2.70 } };

function _v327renderSoilPhaseRelations(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: soil phase relations gamma_d = gamma/(1 + w), e = Gs gamma_w/gamma_d - 1, n = e/(1 + e), S = w Gs/e, with gamma_w = 62.4 pcf and Gs ~ 2.65-2.72, per Das / NAVFAC, by name. Enter Gs; fresh water. An engineering aid; the soil test data govern.";
  const g = makeNumber("Total (moist) unit weight (pcf)", "spr-g", { step: "any", min: "0" });
  const w = makeNumber("Water content (%)", "spr-w", { step: "any", min: "0" });
  const gs = makeNumber("Specific gravity of solids Gs", "spr-gs", { step: "any", min: "0" }); gs.input.value = "2.70";
  for (const f of [g, w, gs]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { g.input.value = "120"; w.input.value = "15"; gs.input.value = "2.70"; update(); });
  const oGd = makeOutputLine(outputRegion, "Dry unit weight", "spr-out-gd");
  const oEn = makeOutputLine(outputRegion, "Void ratio / porosity", "spr-out-en");
  const oS = makeOutputLine(outputRegion, "Degree of saturation", "spr-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "spr-out-note");
  const update = debounce(() => {
    const r = computeSoilPhaseRelations({ gamma_pcf: Number(g.input.value) || 0, w_pct: Number(w.input.value) || 0, gs: Number(gs.input.value) || 0 });
    if (r.error) { oGd.textContent = r.error; oEn.textContent = "-"; oS.textContent = "-"; oNote.textContent = "-"; return; }
    oGd.textContent = fmt(r.gamma_d_pcf, 1) + " pcf";
    oEn.textContent = "e = " + fmt(r.e_ratio, 3) + " / n = " + fmt(r.n_porosity, 3);
    oS.textContent = fmt(r.s_pct, 1) + "%";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [g, w, gs]) f.input.addEventListener("input", update);
}
SOILPROPERTIES_RENDERERS["soil-phase-relations"] = _v327renderSoilPhaseRelations;

// --- spec-v1260: soil hydraulic conductivity (permeability) from a permeameter test ---
// The soil-phase-relations note names its own gap: "it does not compute the permeability, the effective
// stress, or the compaction relative density." This builds the permeability. Both standard lab permeameter
// tests are Darcy's law rearranged: the constant-head test (ASTM D2434, coarse soils) collects a volume Q
// over a time t under a fixed head h, so k = Q L / (A h t); the falling-head test (ASTM D5084, fine soils)
// times the head dropping from h1 to h2 in a standpipe of area a, so k = (a L)/(A t) ln(h1/h2). L is the
// sample length, A the sample cross-section. k comes out in cm/s; 1 cm/s = 2834.6456 ft/day.
const _K_CM_S_TO_FT_DAY = 2834.6456; // (1 cm/s)(86400 s/day)/(30.48 cm/ft)
function _permeabilityDrainageClass(k) {
  if (k >= 1e-1) return "high -- clean gravel, free-draining";
  if (k >= 1e-3) return "medium -- sand and sand-gravel mixtures";
  if (k >= 1e-5) return "low -- fine sand, silty sand";
  if (k >= 1e-7) return "very low -- silt, clayey silt";
  return "practically impervious -- clay";
}
// dims: in { method: dimensionless, q_cm3: L^3, head_cm: L, t_s: T, l_cm: L, a_sample_cm2: L^2, a_pipe_cm2: L^2, h1_cm: L, h2_cm: L } out: { k_cm_s: L T^-1, k_ft_day: L T^-1 }
export function computeSoilPermeability({ method = "constant-head", q_cm3 = 0, head_cm = 0, t_s = 0, l_cm = 0, a_sample_cm2 = 0, a_pipe_cm2 = 0, h1_cm = 0, h2_cm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (method !== "constant-head" && method !== "falling-head") return { error: "Method must be constant-head or falling-head." };
  const L = Number(l_cm) || 0;
  const A = Number(a_sample_cm2) || 0;
  const t = Number(t_s) || 0;
  if (!(L > 0)) return { error: "Sample length L must be positive (cm)." };
  if (!(A > 0)) return { error: "Sample cross-section area A must be positive (cm2)." };
  if (!(t > 0)) return { error: "Elapsed time t must be positive (s)." };
  let k;
  if (method === "constant-head") {
    const Q = Number(q_cm3) || 0;
    const h = Number(head_cm) || 0;
    if (!(Q > 0)) return { error: "Collected volume Q must be positive (cm3)." };
    if (!(h > 0)) return { error: "Constant head h must be positive (cm)." };
    k = (Q * L) / (A * h * t);
  } else {
    const a = Number(a_pipe_cm2) || 0;
    const h1 = Number(h1_cm) || 0;
    const h2 = Number(h2_cm) || 0;
    if (!(a > 0)) return { error: "Standpipe area a must be positive (cm2)." };
    if (!(h1 > 0) || !(h2 > 0)) return { error: "Both heads h1 and h2 must be positive (cm)." };
    if (!(h1 > h2)) return { error: "The starting head h1 must be greater than the ending head h2 (the head falls)." };
    k = (a * L) / (A * t) * Math.log(h1 / h2);
  }
  if (!(k > 0) || !Number.isFinite(k)) return { error: "Permeability math is not a finite positive value." };
  const k_ft_day = k * _K_CM_S_TO_FT_DAY;
  return {
    k_cm_s: k, k_ft_day,
    drainage_class: _permeabilityDrainageClass(k),
    note: "Soil hydraulic conductivity (permeability) k from a laboratory permeameter test, the value the soil-phase-relations tile leaves out. Both tests are Darcy's law v = k i rearranged for k. The constant-head test (ASTM D2434), used for coarse, free-draining soils, holds the head h fixed and collects a volume Q through a sample of length L and area A over a time t: k = Q L / (A h t). The falling-head test (ASTM D5084), used for finer soils where flow is too slow to collect a volume, times the water dropping from head h1 to h2 in a standpipe of area a: k = (a L)/(A t) ln(h1/h2). k here is in cm/s (1 cm/s = 2834.6 ft/day). The drainage class follows the standard Terzaghi/Das ranges: above 1e-1 cm/s clean gravel, 1e-3 to 1e-1 sand, 1e-5 to 1e-3 fine/silty sand, 1e-7 to 1e-5 silt, below 1e-7 practically impervious clay. Report k at the test temperature and correct to 20 C for a standard value; a single lab specimen can miss field fabric, layering, and fractures, so field values often run higher. An engineering aid; the soil test data and the geotechnical engineer govern.",
  };
}
export const soilPermeabilityExample = { inputs: { method: "constant-head", q_cm3: 250, head_cm: 30, t_s: 60, l_cm: 12, a_sample_cm2: 78.5, a_pipe_cm2: 0, h1_cm: 0, h2_cm: 0 } };
function _v1260renderSoilPermeability(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Darcy's-law permeameter tests -- constant-head k = QL/(Aht) (ASTM D2434), falling-head k = (aL/At) ln(h1/h2) (ASTM D5084), by name; k in cm/s (1 cm/s = 2834.6 ft/day). Drainage ranges per Terzaghi/Das. Correct k to 20 C; a lab specimen can miss field fabric. The geotechnical engineer governs.";
  const method = makeSelect("Test method", "sp-m", [
    { value: "constant-head", label: "Constant head (ASTM D2434, coarse soils)", selected: true },
    { value: "falling-head", label: "Falling head (ASTM D5084, fine soils)" },
  ]);
  const l = makeNumber("Sample length L (cm)", "sp-l", { step: "any", min: "0" });
  const a = makeNumber("Sample area A (cm2)", "sp-a", { step: "any", min: "0" });
  const t = makeNumber("Elapsed time t (s)", "sp-t", { step: "any", min: "0" });
  const q = makeNumber("[Constant head] Volume collected Q (cm3)", "sp-q", { step: "any", min: "0" });
  const h = makeNumber("[Constant head] Constant head h (cm)", "sp-h", { step: "any", min: "0" });
  const ap = makeNumber("[Falling head] Standpipe area a (cm2)", "sp-ap", { step: "any", min: "0" });
  const h1 = makeNumber("[Falling head] Head start h1 (cm)", "sp-h1", { step: "any", min: "0" });
  const h2 = makeNumber("[Falling head] Head end h2 (cm)", "sp-h2", { step: "any", min: "0" });
  for (const f of [method, l, a, t, q, h, ap, h1, h2]) inputRegion.appendChild(f.wrap);
  const oK = makeOutputLine(outputRegion, "Hydraulic conductivity k", "sp-out-k");
  const oKf = makeOutputLine(outputRegion, "k (ft/day)", "sp-out-kf");
  const oC = makeOutputLine(outputRegion, "Drainage class", "sp-out-c");
  const oNote = makeOutputLine(outputRegion, "Note", "sp-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeSoilPermeability({
      method: method.select.value, q_cm3: readNum(q.input), head_cm: readNum(h.input), t_s: readNum(t.input),
      l_cm: readNum(l.input), a_sample_cm2: readNum(a.input), a_pipe_cm2: readNum(ap.input), h1_cm: readNum(h1.input), h2_cm: readNum(h2.input),
    });
    if (r.error) { oK.textContent = r.error; oKf.textContent = "-"; oC.textContent = "-"; oNote.textContent = ""; return; }
    oK.textContent = r.k_cm_s.toExponential(3) + " cm/s";
    oKf.textContent = fmt(r.k_ft_day, 3) + " ft/day";
    oC.textContent = r.drainage_class;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  attachExampleButton(inputRegion, () => { method.select.value = "constant-head"; l.input.value = "12"; a.input.value = "78.5"; t.input.value = "60"; q.input.value = "250"; h.input.value = "30"; ap.input.value = "1.0"; h1.input.value = "100"; h2.input.value = "90"; update(); });
  for (const f of [l, a, t, q, h, ap, h1, h2]) f.input.addEventListener("input", update);
  method.select.addEventListener("change", update);
}
SOILPROPERTIES_RENDERERS["soil-permeability"] = _v1260renderSoilPermeability;

// dims: in { ll: dimensionless, pl: dimensionless, w_pct: dimensionless } out: { pi: dimensionless, aline: dimensionless, li: dimensionless }
export function computeAtterbergIndices({ ll = 0, pl = 0, w_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(ll > 0)) return { error: "Liquid limit must be positive (%)." };
  if (!(pl > 0)) return { error: "Plastic limit must be positive (%)." };
  if (!(ll > pl)) return { error: "The liquid limit must exceed the plastic limit (a soil with PL >= LL is nonplastic)." };
  const pi = ll - pl;
  const aline = 0.73 * (ll - 20);
  // ASTM D2487 fine-grained groups: "on or above" the A-line counts as clay. With LL < 50, PI > 7 is CL,
  // PI 4-7 is the dual CL-ML, and PI < 4 is ML even above the line. Until 2026-09-26 any point strictly
  // above the line read CL, so a PI 5 silty clay (LL 23, PL 18) was labeled lean clay.
  const above_a = pi >= aline;
  const group = ll >= 50
    ? (above_a ? "CH (fat clay)" : "MH (elastic silt)")
    : (above_a && pi > 7 ? "CL (lean clay)" : above_a && pi >= 4 ? "CL-ML (silty clay)" : "ML (silt)");
  const li = w_pct > 0 ? (w_pct - pl) / pi : null;
  return {
    pi, aline, above_a, group, li,
    note: "Atterberg limits: the plasticity index PI = LL - PL (liquid minus plastic limit), the liquidity index LI = (w - PL)/PI (where the in-situ water content sits between the limits), and the USCS A-line PI = 0.73(LL - 20). A soil plotting on or above the A-line is a clay (CL/CH), below it a silt (ML/MH), with the LL = 50 line splitting low from high plasticity; below LL 50 a PI of 4-7 on or above the line is the dual CL-ML, and a PI under 4 is ML (ASTM D2487). Classification by the A-line/LL=50 chart (the full USCS also needs the fines content and gradation for a coarse or dual classification), limits from ASTM D4318; it does not compute the shrink-swell potential, the activity, or the coarse-fraction sieve classification. An engineering aid; the soil test data and the geotechnical engineer govern.",
  };
}
export const atterbergIndicesExample = { inputs: { ll: 45, pl: 22, w_pct: 30 } };

function _v328renderAtterbergIndices(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Atterberg plasticity index PI = LL - PL, liquidity index LI = (w - PL)/PI, and the USCS A-line PI = 0.73(LL - 20) with the LL = 50 low/high split, ASTM D4318, by name. Fine-grained chart classification only. An engineering aid; the soil test data govern.";
  const ll = makeNumber("Liquid limit LL (%)", "att-ll", { step: "any", min: "0" });
  const pl = makeNumber("Plastic limit PL (%)", "att-pl", { step: "any", min: "0" });
  const w = makeNumber("In-situ water content (%, optional for LI)", "att-w", { step: "any", min: "0" });
  for (const f of [ll, pl, w]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ll.input.value = "45"; pl.input.value = "22"; w.input.value = "30"; update(); });
  const oPi = makeOutputLine(outputRegion, "Plasticity index (A-line PI)", "att-out-pi");
  const oGroup = makeOutputLine(outputRegion, "USCS group", "att-out-group");
  const oLi = makeOutputLine(outputRegion, "Liquidity index", "att-out-li");
  const oNote = makeOutputLine(outputRegion, "Note", "att-out-note");
  const update = debounce(() => {
    const r = computeAtterbergIndices({ ll: Number(ll.input.value) || 0, pl: Number(pl.input.value) || 0, w_pct: Number(w.input.value) || 0 });
    if (r.error) { oPi.textContent = r.error; oGroup.textContent = "-"; oLi.textContent = "-"; oNote.textContent = "-"; return; }
    oPi.textContent = fmt(r.pi, 1) + " (A-line " + fmt(r.aline, 1) + ", " + (r.above_a ? "above" : "below") + ")";
    oGroup.textContent = r.group;
    oLi.textContent = r.li === null ? "- (enter water content)" : fmt(r.li, 2);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ll, pl, w]) f.input.addEventListener("input", update);
}
SOILPROPERTIES_RENDERERS["atterberg-indices"] = _v328renderAtterbergIndices;

// ===================== spec-v1196: soil activity (Skempton 1953) =====================
// The mineralogy / swell index that atterberg-indices names as its own gap: "it does
// not compute the shrink-swell potential, the activity, or the coarse-fraction sieve
// classification." Skempton's activity A = PI / (percent clay finer than 2 um)
// collapses plasticity and clay content into one number that tracks the clay mineral,
// and therefore its swell: the SAME PI on LESS clay means a more active mineral.
// dims: in { ll: dimensionless, pl: dimensionless, clay_fraction_pct: dimensionless } out: { pi: dimensionless, activity: dimensionless }
export function computeSoilActivity({ ll = 0, pl = 0, clay_fraction_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(ll > 0)) return { error: "Liquid limit must be positive (%)." };
  if (!(pl > 0)) return { error: "Plastic limit must be positive (%)." };
  if (!(ll > pl)) return { error: "The liquid limit must exceed the plastic limit (a soil with PL >= LL is nonplastic)." };
  if (!(clay_fraction_pct > 0)) return { error: "Clay fraction (percent finer than 2 microns) must be positive." };
  if (clay_fraction_pct > 100) return { error: "Clay fraction cannot exceed 100%." };
  const pi = ll - pl;
  const activity = pi / clay_fraction_pct;
  let activity_class, mineral;
  if (activity < 0.75) { activity_class = "inactive"; mineral = "kaolinite-like -- low swell"; }
  else if (activity <= 1.25) { activity_class = "normal"; mineral = "illite-like -- moderate swell"; }
  else { activity_class = "active"; mineral = "montmorillonite / smectite-like -- high swell, potentially expansive"; }
  return {
    pi, activity, activity_class, mineral,
    note: "Skempton (1953) activity A = PI / (percent clay finer than 2 microns) reduces a fine-grained soil's plasticity and clay content to one number that tracks its clay MINERALOGY, and therefore its swell. PI " + pi.toFixed(0) + " over " + clay_fraction_pct + "% clay gives A = " + activity.toFixed(2) + " -- " + activity_class + " (" + mineral + "). The bands: A < 0.75 inactive (kaolinite ~0.4), 0.75-1.25 normal (illite ~0.9), A > 1.25 active (Na-montmorillonite runs several times higher). The point the plasticity index alone hides: the SAME PI on LESS clay means a more active mineral, so a soil that reads a modest PI can still be strongly expansive if its clay fraction is small. Activity is a mineralogy and swell SCREEN, not a swell-pressure or heave calculation; the clay fraction is the hydrometer's percent finer than 2 microns (ASTM D7928 / D422). An engineering aid; the soil test data and the geotechnical engineer govern.",
  };
}
export const soilActivityExample = { inputs: { ll: 52, pl: 22, clay_fraction_pct: 25 } };

function _v1196renderSoilActivity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Skempton (1953) soil activity A = PI / (percent clay finer than 2 microns), by name; classification A < 0.75 inactive, 0.75-1.25 normal, A > 1.25 active. PI = LL - PL (ASTM D4318); clay fraction from the hydrometer (ASTM D7928 / D422). A mineralogy / swell screen, not a heave calculation; the soil test data and the geotechnical engineer govern.";
  const ll = makeNumber("Liquid limit LL (%)", "act-ll", { step: "any", min: "0" });
  const pl = makeNumber("Plastic limit PL (%)", "act-pl", { step: "any", min: "0" });
  const cf = makeNumber("Clay fraction (% finer than 2 microns)", "act-cf", { step: "any", min: "0", max: "100" });
  for (const f of [ll, pl, cf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ll.input.value = "52"; pl.input.value = "22"; cf.input.value = "25"; update(); });
  const oAct = makeOutputLine(outputRegion, "Activity A = PI / % clay", "act-out-a");
  const oClass = makeOutputLine(outputRegion, "Classification", "act-out-class");
  const oPi = makeOutputLine(outputRegion, "Plasticity index PI", "act-out-pi");
  const oNote = makeOutputLine(outputRegion, "Note", "act-out-note");
  const update = debounce(() => {
    const r = computeSoilActivity({ ll: Number(ll.input.value) || 0, pl: Number(pl.input.value) || 0, clay_fraction_pct: Number(cf.input.value) || 0 });
    if (r.error) { oAct.textContent = r.error; oClass.textContent = "-"; oPi.textContent = "-"; oNote.textContent = "-"; return; }
    oAct.textContent = fmt(r.activity, 2);
    oClass.textContent = r.activity_class + " (" + r.mineral + ")";
    oPi.textContent = fmt(r.pi, 1);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ll, pl, cf]) f.input.addEventListener("input", update);
}
SOILPROPERTIES_RENDERERS["soil-activity"] = _v1196renderSoilActivity;

// ===================== spec-v799: aggregate fineness modulus (ASTM C136/C125) =====================
// FM = sum of the cumulative percent retained on the standard sieves / 100. For fine aggregate the
// contributing sieves are #4, #8, #16, #30, #50, #100 (coarser sieves retain ~0% of a sand).
// dims: in { r4: dimensionless, r8: dimensionless, r16: dimensionless, r30: dimensionless, r50: dimensionless, r100: dimensionless } out: { fm: dimensionless }
export function computeFinenessModulus({ r4 = 0, r8 = 0, r16 = 0, r30 = 0, r50 = 0, r100 = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const vals = [Number(r4), Number(r8), Number(r16), Number(r30), Number(r50), Number(r100)];
  if (!vals.every(Number.isFinite)) return { error: "Enter valid cumulative percent-retained values." };
  if (!vals.every((v) => v >= 0 && v <= 100)) return { error: "Each cumulative percent retained must be between 0 and 100." };
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] < vals[i - 1]) return { error: "Cumulative percent retained must not decrease from the coarse (#4) to the fine (#100) sieve." };
  }
  const fm = vals.reduce((a, b) => a + b, 0) / 100;
  if (!Number.isFinite(fm)) return { error: "Fineness-modulus math is not a finite value." };
  let band;
  if (fm < 2.3) band = "fine sand (below the ASTM C33 2.3-3.1 concrete-sand band -- more paste/water demand)";
  else if (fm <= 3.1) band = "within the ASTM C33 concrete-sand band (2.3-3.1)";
  else band = "coarse sand (above the ASTM C33 2.3-3.1 band -- harsh, less workable mix)";
  return {
    fm, band,
    note: "Fineness modulus (ASTM C136 / C125) = the sum of the cumulative percent retained on the standard sieves, divided by 100 -- a single number that captures how coarse or fine a sand is (a higher FM is coarser). For fine aggregate the contributing sieves are #4, #8, #16, #30, #50, and #100; coarser sieves retain essentially none of a sand, so they add 0. ASTM C33 holds concrete sand to an FM of 2.3-3.1, and the sand a mix was designed for should not drift more than 0.20 from batch to batch without a mix adjustment, because a coarser sand (higher FM) needs less paste and a finer one needs more water for the same slump. It is a gradation SUMMARY, not the full sieve analysis -- it does not check whether each sieve meets its C33 grading band, and two very different gradations can share an FM. A QC / mix-proportioning aid; the sieve analysis and the mix design govern.",
  };
}
export const finenessModulusExample = { inputs: { r4: 2, r8: 12, r16: 32, r30: 57, r50: 82, r100: 95 } };

function _v799renderFinenessModulus(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: aggregate fineness modulus (ASTM C136 sieve analysis / C125 definition): FM = sum of the cumulative percent retained on the #4, #8, #16, #30, #50, #100 sieves / 100. ASTM C33 holds concrete sand to FM 2.3-3.1, and it should not drift more than 0.20 without a mix adjustment. A gradation summary, not the full sieve check. A QC aid; the sieve analysis and mix design govern.";
  const defs = [["r4", "Cumulative % retained, #4"], ["r8", "#8"], ["r16", "#16"], ["r30", "#30"], ["r50", "#50"], ["r100", "#100"]];
  const fields = {};
  for (const [key, label] of defs) { fields[key] = makeNumber(label, "fm-" + key, { step: "any", min: "0", max: "100" }); inputRegion.appendChild(fields[key].wrap); }
  attachExampleButton(inputRegion, () => { fields.r4.input.value = "2"; fields.r8.input.value = "12"; fields.r16.input.value = "32"; fields.r30.input.value = "57"; fields.r50.input.value = "82"; fields.r100.input.value = "95"; update(); });
  const oFm = makeOutputLine(outputRegion, "Fineness modulus", "fm-out-fm");
  const oBand = makeOutputLine(outputRegion, "Against ASTM C33", "fm-out-band");
  const oNote = makeOutputLine(outputRegion, "Note", "fm-out-note");
  const update = debounce(() => {
    const args = {}; for (const [key] of defs) args[key] = Number(fields[key].input.value) || 0;
    const r = computeFinenessModulus(args);
    if (r.error) { oFm.textContent = r.error; oBand.textContent = "-"; oNote.textContent = "-"; return; }
    oFm.textContent = fmt(r.fm, 2);
    oBand.textContent = r.band;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const [key] of defs) fields[key].input.addEventListener("input", update);
}
SOILPROPERTIES_RENDERERS["fineness-modulus"] = _v799renderFinenessModulus;

// ===================== spec-v1195: fine-aggregate grading check (ASTM C33 §6) =====================
// The full sieve-band acceptance that fineness-modulus names as its own gap: "it
// does not check whether each sieve meets its C33 grading band, and two very
// different gradations can share an FM." ASTM C33 §6 accepts a concrete sand only
// if THREE things hold, all read off the same percent-passing curve:
//   §6.1  each of the 7 standard sieves passes within its band, AND
//   §6.2  no more than 45% is retained between any two consecutive sieves, AND
//   §6.2  the fineness modulus is 2.3-3.1.
// The FM leg is delegated to computeFinenessModulus so the summary tile and this
// acceptance tile can never drift on the FM definition or its band.
// dims: in { p38: dimensionless, p4: dimensionless, p8: dimensionless, p16: dimensionless, p30: dimensionless, p50: dimensionless, p100: dimensionless } out: { fm: dimensionless, max_retained_pct: dimensionless }
export function computeFineAggregateGrading({ p38 = 100, p4 = 100, p8 = 90, p16 = 68, p30 = 45, p50 = 18, p100 = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // ASTM C33 §6.1 fine-aggregate grading limits (percent passing).
  const sieves = [
    { key: "3/8 in", p: Number(p38), lo: 100, hi: 100 },
    { key: "#4", p: Number(p4), lo: 95, hi: 100 },
    { key: "#8", p: Number(p8), lo: 80, hi: 100 },
    { key: "#16", p: Number(p16), lo: 50, hi: 85 },
    { key: "#30", p: Number(p30), lo: 25, hi: 60 },
    { key: "#50", p: Number(p50), lo: 5, hi: 30 },
    { key: "#100", p: Number(p100), lo: 0, hi: 10 },
  ];
  if (!sieves.every((s) => Number.isFinite(s.p))) return { error: "Enter a valid percent passing for every sieve." };
  if (!sieves.every((s) => s.p >= 0 && s.p <= 100)) return { error: "Each percent passing must be between 0 and 100." };
  // A finer sieve cannot pass more than a coarser one -- percent passing must not increase down the stack.
  for (let i = 1; i < sieves.length; i++) {
    if (sieves[i].p > sieves[i - 1].p) return { error: `Percent passing must not increase from a coarser to a finer sieve (${sieves[i].key} passes more than ${sieves[i - 1].key}).` };
  }
  // §6.1: each sieve within its band.
  const out_of_band = sieves.filter((s) => s.p < s.lo || s.p > s.hi);
  const band_ok = out_of_band.length === 0;
  const band_detail = band_ok
    ? "all 7 sieves within band"
    : out_of_band.map((s) => `${s.key} ${s.p}% (band ${s.lo === s.hi ? s.lo : s.lo + "-" + s.hi})`).join("; ");
  // §6.2: not more than 45% passing any sieve and retained on the next consecutive sieve.
  let max_retained_pct = 0, max_retained_gap = "";
  for (let i = 1; i < sieves.length; i++) {
    const retained = sieves[i - 1].p - sieves[i].p;
    if (retained > max_retained_pct) { max_retained_pct = retained; max_retained_gap = `${sieves[i - 1].key} to ${sieves[i].key}`; }
  }
  const consecutive_ok = max_retained_pct <= 45;
  // §6.2: fineness modulus 2.3-3.1, delegated so the two tiles cannot drift.
  const fmRes = computeFinenessModulus({ r4: 100 - sieves[1].p, r8: 100 - sieves[2].p, r16: 100 - sieves[3].p, r30: 100 - sieves[4].p, r50: 100 - sieves[5].p, r100: 100 - sieves[6].p });
  if (fmRes.error) return { error: fmRes.error };
  const fm = fmRes.fm;
  const fm_ok = fm >= 2.3 && fm <= 3.1;
  const conforms = band_ok && consecutive_ok && fm_ok;
  const failures = [];
  if (!band_ok) failures.push(`grading band (${band_detail})`);
  if (!consecutive_ok) failures.push(`the 45% consecutive-sieve limit (${max_retained_pct.toFixed(0)}% retained ${max_retained_gap})`);
  if (!fm_ok) failures.push(`fineness modulus ${fm.toFixed(2)} outside 2.3-3.1`);
  const verdict = conforms
    ? "CONFORMS to ASTM C33 §6 fine-aggregate grading"
    : "DOES NOT conform -- fails " + failures.join("; ");
  return {
    conforms, band_ok, consecutive_ok, fm_ok, fm, max_retained_pct, max_retained_gap, band_detail, verdict,
    note: "ASTM C33 §6 accepts a concrete sand only if THREE things hold on the same sieve analysis, which is why the fineness modulus alone is not enough -- two very different gradations can share an FM. (1) §6.1: each of the 7 standard sieves passes within its band -- 3/8 in 100, #4 95-100, #8 80-100, #16 50-85, #30 25-60, #50 5-30, #100 0-10. Entered gradation: " + band_detail + ". (2) §6.2: no more than 45% of the sample may pass one sieve and be retained on the next; the widest gap here is " + max_retained_pct.toFixed(0) + "% (" + (max_retained_gap || "n/a") + "), " + (consecutive_ok ? "within the 45% limit" : "OVER the 45% limit -- a gap that starves the mix of one size") + ". (3) §6.2: the fineness modulus must be 2.3-3.1; this sand is " + fm.toFixed(2) + " (" + (fm_ok ? "in band" : "out of band") + "). Sand failing §6.1 may still be accepted under §6.3 with supplementary cementitious material and a demonstrated record, and the No. 50 / No. 100 minimums can govern workability, bleeding, and pumping. Percent passing must not increase down the stack. A QC / acceptance screen on your own C136 sieve analysis; the sieve report, the mix design, and the specifier govern.",
  };
}
export const fineAggregateGradingExample = { inputs: { p38: 100, p4: 98, p8: 85, p16: 68, p30: 45, p50: 18, p100: 5 } };

function _v1195renderFineAggregateGrading(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASTM C33/C33M §6 fine-aggregate grading, by name. §6.1 limits (percent passing): 3/8 in 100, No.4 95-100, No.8 80-100, No.16 50-85, No.30 25-60, No.50 5-30, No.100 0-10. §6.2: not more than 45% passing any sieve and retained on the next consecutive sieve, and fineness modulus 2.3-3.1. The FM is delegated to the fineness-modulus tile so the two cannot drift. An acceptance screen on your own C136 sieve analysis; the sieve report and the mix design govern.";
  const defs = [["p38", "% passing, 3/8 in"], ["p4", "#4"], ["p8", "#8"], ["p16", "#16"], ["p30", "#30"], ["p50", "#50"], ["p100", "#100"]];
  const fields = {};
  for (const [key, label] of defs) { fields[key] = makeNumber(label, "fag-" + key, { step: "any", min: "0", max: "100" }); inputRegion.appendChild(fields[key].wrap); }
  attachExampleButton(inputRegion, () => { const ex = fineAggregateGradingExample.inputs; for (const [key] of defs) fields[key].input.value = String(ex[key]); update(); });
  const oVerdict = makeOutputLine(outputRegion, "Against ASTM C33 §6", "fag-out-verdict");
  const oBand = makeOutputLine(outputRegion, "Grading band (§6.1)", "fag-out-band");
  const oGap = makeOutputLine(outputRegion, "Widest consecutive gap (§6.2, 45% max)", "fag-out-gap");
  const oFm = makeOutputLine(outputRegion, "Fineness modulus (2.3-3.1)", "fag-out-fm");
  const oNote = makeOutputLine(outputRegion, "Note", "fag-out-note");
  const update = debounce(() => {
    const args = {}; for (const [key] of defs) args[key] = Number(fields[key].input.value) || 0;
    const r = computeFineAggregateGrading(args);
    if (r.error) { oVerdict.textContent = r.error; oBand.textContent = "-"; oGap.textContent = "-"; oFm.textContent = "-"; oNote.textContent = "-"; return; }
    oVerdict.textContent = r.verdict;
    oBand.textContent = r.band_ok ? "all 7 sieves within band" : r.band_detail;
    oGap.textContent = fmt(r.max_retained_pct, 0) + "% " + (r.max_retained_gap ? "(" + r.max_retained_gap + ") " : "") + (r.consecutive_ok ? "- OK" : "- OVER 45%");
    oFm.textContent = fmt(r.fm, 2) + (r.fm_ok ? " - in band" : " - out of band");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const [key] of defs) fields[key].input.addEventListener("input", update);
}
SOILPROPERTIES_RENDERERS["fine-aggregate-grading"] = _v1195renderFineAggregateGrading;

// ===================== spec-v1018: soil gradation coefficients Cu / Cc (ASTM D2487) =====================
// The coarse-fraction half of USCS that atterberg-indices names as its own gap
// ("the full USCS also needs the fines content and gradation for a coarse or
// dual classification ... it does not compute the coarse-fraction sieve
// classification"), and the gradation SHAPE that fineness-modulus says its
// single number cannot see ("two very different gradations can share an FM").
// Cu is the spread of the curve, Cc its smoothness; together they separate a
// well-graded soil (packs and compacts) from a uniform one (does not).

// dims: in { d10_mm: L, d30_mm: L, d60_mm: L, pct_coarse_passing_no4: dimensionless, pct_fines: dimensionless } out: { cu: dimensionless, cc: dimensionless, hazen_k_cm_s: L T^-1 }
export function computeSoilGradationCoefficients({ d10_mm = 0, d30_mm = 0, d60_mm = 0, pct_coarse_passing_no4 = 60, pct_fines = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // An efficiency is a percent; 0 < value < 1 is a fraction typed into a percent field (added 2026-09-26).
  if (["pct_coarse_passing_no4", "pct_fines"].some((k) => { const v = Number(arguments[0]?.[k]); return v > 0 && v < 1; })) return { error: "Enter efficiencies as a percent (85 for 85%), not a fraction." };
  if (!(d10_mm > 0)) return { error: "D10 (effective size) must be positive (mm)." };
  if (!(d30_mm > 0)) return { error: "D30 must be positive (mm)." };
  if (!(d60_mm > 0)) return { error: "D60 must be positive (mm)." };
  if (!(d30_mm >= d10_mm)) return { error: "D30 must be at least D10 (the sizes come off one grain-size curve and must increase)." };
  if (!(d60_mm >= d30_mm)) return { error: "D60 must be at least D30 (the sizes come off one grain-size curve and must increase)." };
  if (pct_coarse_passing_no4 < 0 || pct_coarse_passing_no4 > 100) return { error: "Percent of the coarse fraction passing the #4 sieve must be between 0 and 100." };
  if (pct_fines < 0 || pct_fines > 100) return { error: "Percent fines (passing #200) must be between 0 and 100." };
  const cu = d60_mm / d10_mm;
  const cc = (d30_mm * d30_mm) / (d10_mm * d60_mm);
  // USCS coarse fraction: more than half of it retained on the #4 is a gravel.
  const is_gravel = pct_coarse_passing_no4 <= 50;
  const coarse_type = is_gravel ? "gravel" : "sand";
  // ASTM D2487 well-graded criteria: Cu >= 4 (gravel) or >= 6 (sand), AND Cc
  // between 1 and 3 inclusive. Both must hold; failing either is poorly graded.
  const cu_threshold = is_gravel ? 4 : 6;
  const cu_ok = cu >= cu_threshold;
  const cc_ok = cc >= 1 && cc <= 3;
  const well_graded = cu_ok && cc_ok;
  // The fines content decides whether the gradation criteria control at all.
  let fines_class, uscs_symbol;
  if (pct_fines < 5) {
    fines_class = "clean (< 5% fines): the gradation criteria control";
    uscs_symbol = (is_gravel ? "G" : "S") + (well_graded ? "W" : "P");
  } else if (pct_fines <= 12) {
    fines_class = "borderline (5-12% fines): a DUAL symbol is required";
    uscs_symbol = (is_gravel ? "G" : "S") + (well_graded ? "W" : "P") + "-" + (is_gravel ? "G" : "S") + "M or " + (is_gravel ? "G" : "S") + "C (the Atterberg limits on the fines decide M vs C)";
  } else {
    fines_class = "> 12% fines: the FINES govern, not the gradation";
    uscs_symbol = (is_gravel ? "G" : "S") + "M or " + (is_gravel ? "G" : "S") + "C (run atterberg-indices on the fines)";
  }
  // Hazen (1892) permeability estimate, k (cm/s) = C x D10^2 with D10 in mm and
  // C ~ 1.0. Valid only for a fairly uniform clean sand: Cu < 5 and D10 between
  // 0.1 and 3 mm. Reported with the range check, never silently.
  const hazen_k_cm_s = d10_mm * d10_mm;
  const hazen_valid = cu < 5 && d10_mm >= 0.1 && d10_mm <= 3 && pct_fines < 5;
  return {
    cu, cc, coarse_type, cu_threshold, cu_ok, cc_ok, well_graded, fines_class, uscs_symbol,
    hazen_k_cm_s, hazen_valid,
    note: "Gradation coefficients from three points on the grain-size curve (ASTM D2487 / D6913): the uniformity coefficient Cu = D60/D10 measures how wide a range of sizes is present, and the coefficient of curvature Cc = D30^2 / (D10 x D60) measures whether the curve is smooth or has a gap in the middle. A well-graded soil needs BOTH -- Cu >= 4 for a gravel or >= 6 for a sand, and Cc between 1 and 3 -- because a wide range with a gap in it packs no better than a uniform sand. Well-graded material compacts to a higher density at lower effort and makes better fill, base, and concrete aggregate; a uniform (poorly-graded) sand drains well but will not densify. The fines content decides whether any of this controls: under 5% the gradation symbol governs, 5-12% takes a dual symbol, and over 12% the fines govern instead and the Atterberg limits (atterberg-indices) decide M versus C. The Hazen k = D10^2 cm/s permeability estimate is shown only with its validity flag -- it holds for a fairly uniform clean sand (Cu < 5, D10 0.1-3 mm, under 5% fines) and is an order-of-magnitude figure even then. Three curve points, not the full sieve analysis; the laboratory gradation report and the geotechnical engineer govern.",
  };
}

export const soilGradationCoefficientsExample = { inputs: { d10_mm: 0.15, d30_mm: 0.55, d60_mm: 1.2, pct_coarse_passing_no4: 60, pct_fines: 3 } };

function _v1018renderSoilGradationCoefficients(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASTM D2487 (Unified Soil Classification System) gradation criteria and ASTM D6913 sieve analysis, by name: Cu = D60/D10, Cc = D30^2/(D10 x D60); well graded requires Cu >= 4 (gravel) or >= 6 (sand) AND 1 <= Cc <= 3. Fines under 5% let the gradation symbol govern, 5-12% takes a dual symbol, over 12% the fines govern (see atterberg-indices). The Hazen (1892) k = D10^2 cm/s estimate is shown with its validity range (Cu < 5, D10 0.1-3 mm, clean). Three curve points, not the full sieve analysis; the laboratory gradation report and the geotechnical engineer govern.";
  const d10 = makeNumber("D10, effective size (mm)", "sgc-d10", { step: "any", min: "0" });
  const d30 = makeNumber("D30 (mm)", "sgc-d30", { step: "any", min: "0" });
  const d60 = makeNumber("D60 (mm)", "sgc-d60", { step: "any", min: "0" });
  const p4 = makeNumber("Coarse fraction passing the #4 sieve (%, <= 50 = gravel)", "sgc-p4", { step: "any", min: "0", max: "100", value: "60" });
  const pf = makeNumber("Fines passing the #200 sieve (%)", "sgc-pf", { step: "any", min: "0", max: "100", value: "0" });
  p4.input.value = "60"; pf.input.value = "0";
  for (const f of [d10, d30, d60, p4, pf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { d10.input.value = "0.15"; d30.input.value = "0.55"; d60.input.value = "1.2"; p4.input.value = "60"; pf.input.value = "3"; update(); });
  const oCu = makeOutputLine(outputRegion, "Uniformity coefficient Cu = D60/D10", "sgc-out-cu");
  const oCc = makeOutputLine(outputRegion, "Coefficient of curvature Cc", "sgc-out-cc");
  const oGrade = makeOutputLine(outputRegion, "Gradation", "sgc-out-grade");
  const oSym = makeOutputLine(outputRegion, "USCS symbol", "sgc-out-sym");
  const oK = makeOutputLine(outputRegion, "Hazen permeability estimate", "sgc-out-k");
  const oNote = makeOutputLine(outputRegion, "Note", "sgc-out-note");
  const update = debounce(() => {
    const r = computeSoilGradationCoefficients({
      d10_mm: Number(d10.input.value) || 0,
      d30_mm: Number(d30.input.value) || 0,
      d60_mm: Number(d60.input.value) || 0,
      pct_coarse_passing_no4: Number(p4.input.value) || 0,
      pct_fines: Number(pf.input.value) || 0,
    });
    if (r.error) { for (const o of [oCu, oCc, oGrade, oSym, oK, oNote]) o.textContent = "-"; oCu.textContent = r.error; return; }
    oCu.textContent = fmt(r.cu, 2) + " (well-graded " + r.coarse_type + " needs >= " + r.cu_threshold + ")" + (r.cu_ok ? " OK" : " FAILS");
    oCc.textContent = fmt(r.cc, 2) + " (needs 1 to 3)" + (r.cc_ok ? " OK" : " FAILS");
    oGrade.textContent = (r.well_graded ? "WELL graded " : "POORLY graded ") + r.coarse_type + " -- " + r.fines_class;
    oSym.textContent = r.uscs_symbol;
    oK.textContent = r.hazen_valid ? fmt(r.hazen_k_cm_s, 4) + " cm/s (Hazen, within its validity range)" : fmt(r.hazen_k_cm_s, 4) + " cm/s (OUT of Hazen's range -- needs Cu < 5, D10 0.1-3 mm, under 5% fines; do not use)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [d10, d30, d60, p4, pf]) f.input.addEventListener("input", update);
}
SOILPROPERTIES_RENDERERS["soil-gradation-coefficients"] = _v1018renderSoilGradationCoefficients;
