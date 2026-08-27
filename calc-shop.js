// =====================================================================
// calc-shop.js - Machine Shop & Fabrication bench (spec-v40).
//
// A new module standing up the everyday math a working machinist,
// fabricator, and welder runs at the bench: cut time and material
// removal, theoretical surface finish, taper geometry, dividing-head
// indexing, three-wire thread measurement, press-brake air-bend
// tonnage, punch/shear force, welder duty cycle, and steel carbon
// equivalent / preheat screen.
//
// Ten tiles, each keeping its natural group letter (K, G, or E) while
// living here behind SHOP_RENDERERS - a tile's group letter is
// independent of its module (the spec-v28 / v36 / v38 / v39 precedent).
// Eight tiles are first-principles geometry / algebra (public domain);
// two carry a published empirical / material constant the user can
// override (press-brake-tonnage, carbon-equivalent), and one is
// first-principles shear with a user-supplied material strength
// (punch-force). No table transcription: the user supplies the
// strength, the feed, the dimensions; the tile does the algebra.
//
// Pure exported compute functions plus their renderers and the
// SHOP_RENDERERS map, mirroring calc-fab.js / calc-mechanic.js.
// =====================================================================

import {
  DEBOUNCE_MS, debounce, makeNumber, makeText, makeSelect, makeTextarea,
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

function _readNum(i) { if (i.value === "") return 0; const v = Number(i.value); return Number.isFinite(v) ? v : 0; }

const IN3_TO_CM3 = 16.387064; // 1 cubic inch = 16.387064 cm^3
const IN_TO_UM = 25400;       // 1 inch = 25.4 mm = 25400 micrometres

export const SHOP_RENDERERS = {};

// =====================================================================
// spec-v40 2.1 - machining-time (Cut Time per Pass) - Group K
// First-principles distance / feed rate. Feed rate = RPM x IPR when not
// entered directly; cut time t = L / feed_IPM; total = t x passes.
// =====================================================================

// dims: in { cut_length_in: L, rpm: T^-1, feed_ipr_in: L, feed_ipm_in: L, passes: dimensionless } out: { feed_ipm: L T^-1, time_min: T, time_s: T, total_min: T }
export function computeMachiningTime({ feed_mode = "rpm-ipr", cut_length_in = 0, rpm = 0, feed_ipr_in = 0, feed_ipm_in = 0, passes = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L = Number(cut_length_in) || 0;
  if (!(L > 0)) return { error: "Cut length must be positive (in)." };
  const n = Math.round(Number(passes));
  if (!(n >= 1)) return { error: "Number of passes must be 1 or more." };
  let feed_ipm;
  if (String(feed_mode) === "direct") {
    feed_ipm = Number(feed_ipm_in) || 0;
    if (!(feed_ipm > 0)) return { error: "Feed rate must be positive (IPM)." };
  } else {
    const r = Number(rpm) || 0, ipr = Number(feed_ipr_in) || 0;
    if (!(r > 0)) return { error: "Spindle speed must be positive (RPM)." };
    if (!(ipr > 0)) return { error: "Feed per revolution must be positive (IPR)." };
    feed_ipm = r * ipr;
  }
  const time_min = L / feed_ipm;
  const total_min = time_min * n;
  const notes = [];
  notes.push("Cut time t = L / feed_IPM, with feed_IPM = RPM x IPR when not entered directly. First-principles: cut distance over feed rate.");
  notes.push("L should include tool approach and overtravel; add that lead-in and run-out to the part length so the time covers the full tool path.");
  return { feed_ipm, time_min, time_s: time_min * 60, passes: n, total_min, total_s: total_min * 60, notes };
}
export const machiningTimeExample = { inputs: { feed_mode: "rpm-ipr", cut_length_in: 6, rpm: 500, feed_ipr_in: 0.01, feed_ipm_in: 0, passes: 4 } };

function _v40renderMachiningTime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Cutting time as cut distance / feed rate, with feed rate = RPM x IPR - first-principles arithmetic as in Machinery's Handbook (Industrial Press), by name; public domain. Include tool approach and overtravel in the cut length.";
  const mode = makeSelect("Feed entry", "mt-mode", [
    { value: "rpm-ipr", label: "Spindle speed (RPM) x feed/rev (IPR)" },
    { value: "direct", label: "Feed rate directly (IPM)" },
  ]);
  const len = makeNumber("Cut length (in, incl. approach/overtravel)", "mt-len", { step: "any", min: "0" });
  const rpm = makeNumber("Spindle speed (RPM)", "mt-rpm", { step: "any", min: "0" });
  const ipr = makeNumber("Feed per revolution (IPR)", "mt-ipr", { step: "any", min: "0" });
  const ipm = makeNumber("Feed rate (IPM)", "mt-ipm", { step: "any", min: "0" });
  const passes = makeNumber("Number of passes", "mt-passes", { step: "1", min: "1", value: "1" }); passes.input.value = "1";
  for (const f of [mode, len, rpm, ipr, ipm, passes]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mode.select.value = "rpm-ipr"; len.input.value = "6"; rpm.input.value = "500"; ipr.input.value = "0.01"; ipm.input.value = ""; passes.input.value = "4"; update(); });
  const oFeed = makeOutputLine(outputRegion, "Feed rate", "mt-out-feed");
  const oTime = makeOutputLine(outputRegion, "Time per pass", "mt-out-time");
  const oTotal = makeOutputLine(outputRegion, "Total time", "mt-out-total");
  const oNote = makeOutputLine(outputRegion, "Notes", "mt-out-note");
  const update = debounce(() => {
    const r = computeMachiningTime({ feed_mode: mode.select.value, cut_length_in: _readNum(len.input), rpm: _readNum(rpm.input), feed_ipr_in: _readNum(ipr.input), feed_ipm_in: _readNum(ipm.input), passes: _readNum(passes.input) });
    if (r.error) { oFeed.textContent = r.error; oTime.textContent = "-"; oTotal.textContent = "-"; oNote.textContent = ""; return; }
    oFeed.textContent = fmt(r.feed_ipm, 4) + " IPM";
    oTime.textContent = fmt(r.time_min, 4) + " min (" + fmt(r.time_s, 2) + " s)";
    oTotal.textContent = fmt(r.total_min, 4) + " min for " + r.passes + " pass" + (r.passes === 1 ? "" : "es") + " (" + fmt(r.total_s, 2) + " s)";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [len.input, rpm.input, ipr.input, ipm.input, passes.input]) f.addEventListener("input", update);
  mode.select.addEventListener("change", update);
}
SHOP_RENDERERS["machining-time"] = _v40renderMachiningTime;

// =====================================================================
// spec-v40 2.2 - material-removal-rate (MRR) - Group K
// Swept volume per unit time. Milling MRR = WOC x DOC x feed_IPM;
// turning MRR = 12 x SFM x DOC x feed_IPR (the pi*D cancels);
// drilling MRR = (pi*D^2/4) x feed_IPM. First-principles geometry.
// =====================================================================

// dims: in { mode: dimensionless, woc_in: L, doc_in: L, feed_ipm_in: L, sfm: L, feed_ipr_in: L, drill_dia_in: L } out: { mrr_in3: L^3, mrr_cm3: L^3 }
export function computeMaterialRemovalRate({ mode = "milling", woc_in = 0, doc_in = 0, feed_ipm_in = 0, sfm = 0, feed_ipr_in = 0, drill_dia_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const m = String(mode);
  let mrr_in3, formula;
  if (m === "turning") {
    const SFM = Number(sfm) || 0, DOC = Number(doc_in) || 0, ipr = Number(feed_ipr_in) || 0;
    if (!(SFM > 0)) return { error: "Cutting speed must be positive (SFM)." };
    if (!(DOC > 0)) return { error: "Depth of cut must be positive (in)." };
    if (!(ipr > 0)) return { error: "Feed per revolution must be positive (IPR)." };
    mrr_in3 = 12 * SFM * DOC * ipr;
    formula = "turning: MRR = 12 x SFM x DOC x feed_IPR (diameter-independent)";
  } else if (m === "drilling") {
    const D = Number(drill_dia_in) || 0, ipm = Number(feed_ipm_in) || 0;
    if (!(D > 0)) return { error: "Drill diameter must be positive (in)." };
    if (!(ipm > 0)) return { error: "Feed rate must be positive (IPM)." };
    mrr_in3 = (Math.PI * D * D / 4) * ipm;
    formula = "drilling: MRR = (pi x D^2 / 4) x feed_IPM";
  } else {
    const WOC = Number(woc_in) || 0, DOC = Number(doc_in) || 0, ipm = Number(feed_ipm_in) || 0;
    if (!(WOC > 0)) return { error: "Width of cut must be positive (in)." };
    if (!(DOC > 0)) return { error: "Depth of cut must be positive (in)." };
    if (!(ipm > 0)) return { error: "Feed rate must be positive (IPM)." };
    mrr_in3 = WOC * DOC * ipm;
    formula = "milling: MRR = WOC x DOC x feed_IPM";
  }
  const notes = [];
  notes.push("Material removal rate is the swept volume per unit time (" + formula + "). First-principles geometry.");
  notes.push("MRR sets the load on the tool, spindle, and chip evacuation; the machine's rigidity, power, and the tool's chip-load limit cap how high you can push it.");
  return { mode: m, mrr_in3, mrr_cm3: mrr_in3 * IN3_TO_CM3, notes };
}
export const materialRemovalRateExample = { inputs: { mode: "milling", woc_in: 0.5, doc_in: 0.1, feed_ipm_in: 10, sfm: 0, feed_ipr_in: 0, drill_dia_in: 0 } };

function _v40renderMaterialRemovalRate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Material removal rate as the swept volume per unit time (milling WOC x DOC x feed; turning 12 x SFM x DOC x feed/rev; drilling (pi x D^2 / 4) x feed) - first-principles geometry as in Machinery's Handbook (Industrial Press), by name; public domain.";
  const mode = makeSelect("Operation", "mrr-mode", [
    { value: "milling", label: "Milling (WOC, DOC, feed IPM)" },
    { value: "turning", label: "Turning (SFM, DOC, feed IPR)" },
    { value: "drilling", label: "Drilling (drill dia, feed IPM)" },
  ]);
  const woc = makeNumber("Width of cut WOC (in, milling)", "mrr-woc", { step: "any", min: "0" });
  const doc = makeNumber("Depth of cut DOC (in, milling/turning)", "mrr-doc", { step: "any", min: "0" });
  const ipm = makeNumber("Feed rate (IPM, milling/drilling)", "mrr-ipm", { step: "any", min: "0" });
  const sfm = makeNumber("Cutting speed SFM (turning)", "mrr-sfm", { step: "any", min: "0" });
  const ipr = makeNumber("Feed per rev IPR (turning)", "mrr-ipr", { step: "any", min: "0" });
  const dia = makeNumber("Drill diameter (in, drilling)", "mrr-dia", { step: "any", min: "0" });
  for (const f of [mode, woc, doc, ipm, sfm, ipr, dia]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { mode.select.value = "milling"; woc.input.value = "0.5"; doc.input.value = "0.1"; ipm.input.value = "10"; sfm.input.value = ""; ipr.input.value = ""; dia.input.value = ""; update(); });
  const oMrr = makeOutputLine(outputRegion, "Material removal rate", "mrr-out-mrr");
  const oNote = makeOutputLine(outputRegion, "Notes", "mrr-out-note");
  const update = debounce(() => {
    const r = computeMaterialRemovalRate({ mode: mode.select.value, woc_in: _readNum(woc.input), doc_in: _readNum(doc.input), feed_ipm_in: _readNum(ipm.input), sfm: _readNum(sfm.input), feed_ipr_in: _readNum(ipr.input), drill_dia_in: _readNum(dia.input) });
    if (r.error) { oMrr.textContent = r.error; oNote.textContent = ""; return; }
    oMrr.textContent = fmt(r.mrr_in3, 4) + " in3/min (" + fmt(r.mrr_cm3, 3) + " cm3/min)";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [woc.input, doc.input, ipm.input, sfm.input, ipr.input, dia.input]) f.addEventListener("input", update);
  mode.select.addEventListener("change", update);
}
SHOP_RENDERERS["material-removal-rate"] = _v40renderMaterialRemovalRate;

// =====================================================================
// spec-v40 2.3 - turning-surface-finish (Theoretical Surface Finish) - Group K
// Round-nose scallop geometry: Rt = f^2 / (8 r); Ra ~= Rt / 4.
// =====================================================================

// dims: in { feed_ipr_in: L, nose_radius_in: L } out: { rt_in: L, ra_in: L }
export function computeTurningSurfaceFinish({ feed_ipr_in = 0, nose_radius_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const f = Number(feed_ipr_in) || 0, r = Number(nose_radius_in) || 0;
  if (!(f > 0)) return { error: "Feed per revolution must be positive (IPR)." };
  if (!(r > 0)) return { error: "Tool nose radius must be positive (in)." };
  const rt_in = (f * f) / (8 * r);
  const ra_in = rt_in / 4;
  const notes = [];
  notes.push("Theoretical peak-to-valley roughness from feed and nose radius only: Rt = f^2 / (8 x r); a common estimate for the arithmetic average is Ra ~= Rt / 4 (= 0.032 x f^2 / r). First-principles scallop geometry.");
  notes.push("This is the theoretical finish from feed and nose radius; built-up edge, tool wear, deflection, and vibration make the measured finish rougher. Lower the feed or use a larger nose radius to improve it.");
  return {
    rt_in, ra_in,
    rt_uin: rt_in * 1e6, ra_uin: ra_in * 1e6,
    rt_um: rt_in * IN_TO_UM, ra_um: ra_in * IN_TO_UM,
    notes,
  };
}
export const turningSurfaceFinishExample = { inputs: { feed_ipr_in: 0.005, nose_radius_in: 0.03125 } };

function _v40renderTurningSurfaceFinish(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Theoretical surface roughness from feed and nose radius - Rt = f^2 / (8 x r), Ra ~= Rt / 4 - first-principles scallop geometry as in Machinery's Handbook (Industrial Press), by name; public domain. The measured finish is rougher than this theoretical value.";
  const feed = makeNumber("Feed per revolution f (IPR)", "tsf-feed", { step: "any", min: "0" });
  const rad = makeNumber("Tool nose radius r (in)", "tsf-rad", { step: "any", min: "0" });
  for (const f of [feed, rad]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { feed.input.value = "0.005"; rad.input.value = "0.03125"; update(); });
  const oRt = makeOutputLine(outputRegion, "Theoretical Rt", "tsf-out-rt");
  const oRa = makeOutputLine(outputRegion, "Estimated Ra", "tsf-out-ra");
  const oNote = makeOutputLine(outputRegion, "Notes", "tsf-out-note");
  const update = debounce(() => {
    const r = computeTurningSurfaceFinish({ feed_ipr_in: _readNum(feed.input), nose_radius_in: _readNum(rad.input) });
    if (r.error) { oRt.textContent = r.error; oRa.textContent = "-"; oNote.textContent = ""; return; }
    oRt.textContent = fmt(r.rt_uin, 1) + " uin (" + fmt(r.rt_um, 3) + " um)";
    oRa.textContent = fmt(r.ra_uin, 1) + " uin (" + fmt(r.ra_um, 3) + " um)";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [feed.input, rad.input]) f.addEventListener("input", update);
}
SHOP_RENDERERS["turning-surface-finish"] = _v40renderTurningSurfaceFinish;

// spec-v680 - feed-for-surface-finish (inverse of turning-surface-finish) - Group K
// Rt = f^2 / (8 r); solved for feed: f = sqrt(8 r Rt), with Rt = 4 Ra if the target is an Ra.
// dims: in { target_finish_uin: L, finish_basis: dimensionless, nose_radius_in: L } out: { max_feed_ipr: L, rt_in: L }
export function computeFeedForSurfaceFinish({ target_finish_uin = 0, finish_basis = "ra", nose_radius_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const target = Number(target_finish_uin) || 0;
  const r = Number(nose_radius_in) || 0;
  const basis = String(finish_basis);
  if (!(target > 0)) return { error: "Target surface finish must be positive (microinches)." };
  if (!(r > 0)) return { error: "Tool nose radius must be positive (in)." };
  if (basis !== "ra" && basis !== "rt") return { error: "Finish basis must be Ra or Rt." };
  // Convert the target to Rt in inches. Ra ~= Rt/4, so Rt = 4 Ra.
  const rt_in = (basis === "ra" ? 4 * target : target) * 1e-6;
  // Inverse of Rt = f^2 / (8 r): f = sqrt(8 r Rt).
  const max_feed_ipr = Math.sqrt(8 * r * rt_in);
  if (!Number.isFinite(max_feed_ipr) || !(max_feed_ipr > 0)) return { error: "Feed math is not a finite positive value." };
  return {
    max_feed_ipr, rt_in, rt_uin: rt_in * 1e6, ra_uin: rt_in * 1e6 / 4,
    note: "The fastest feed per revolution that still holds a target theoretical surface finish, the inverse of the turning-surface-finish tile: from Rt = f^2 / (8 x nose_radius), f = sqrt(8 x nose_radius x Rt). A finish spec'd as Ra is converted with Rt = 4 x Ra (the tile's Ra ~= Rt/4 estimate). A larger nose radius lets you feed faster for the same finish (the finish improves as the square of the feed), which is why a wiper insert holds a fine finish at production feed rates. This is the theoretical scallop feed; built-up edge, tool wear, deflection, and vibration make the measured finish rougher, so leave margin. A shop aid; the print, the insert, and a measured finish govern."
  };
}
export const feedForSurfaceFinishExample = { inputs: { target_finish_uin: 25, finish_basis: "ra", nose_radius_in: 0.03125 } };

function renderFeedForSurfaceFinish(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: theoretical surface roughness solved for feed: f = sqrt(8 x nose_radius x Rt), from Rt = f^2 / (8 x r), Ra ~= Rt / 4 - first-principles scallop geometry as in Machinery's Handbook (Industrial Press), by name; public domain. The measured finish is rougher than this theoretical value, so leave margin.";
  const target = makeNumber("Target finish (microinches)", "ffsf-t", { step: "any", min: "0", value: "25" });
  const basis = makeSelect("Finish basis", "ffsf-basis", [
    { value: "ra", label: "Ra (arithmetic average)", selected: true },
    { value: "rt", label: "Rt (peak-to-valley)" },
  ]);
  const rad = makeNumber("Tool nose radius r (in)", "ffsf-rad", { step: "any", min: "0" });
  for (const f of [target, basis, rad]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { target.input.value = "25"; basis.select.value = "ra"; rad.input.value = "0.03125"; update(); });
  const oFeed = makeOutputLine(outputRegion, "Max feed per rev", "ffsf-out-feed");
  const oNote = makeOutputLine(outputRegion, "Note", "ffsf-out-note");
  const update = debounce(() => {
    const r = computeFeedForSurfaceFinish({ target_finish_uin: _readNum(target.input), finish_basis: basis.select.value, nose_radius_in: _readNum(rad.input) });
    if (r.error) { oFeed.textContent = r.error; oNote.textContent = ""; return; }
    oFeed.textContent = fmt(r.max_feed_ipr, 4) + " IPR";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [target.input, rad.input]) f.addEventListener("input", update);
  basis.select.addEventListener("change", update);
}
SHOP_RENDERERS["feed-for-surface-finish"] = renderFeedForSurfaceFinish;

// =====================================================================
// spec-v40 2.4 - taper-calc (Taper per Foot and Angle) - Group K
// TPI = (D - d) / L; TPF = TPI x 12; angle per side = atan((D-d)/(2L)).
// =====================================================================

// dims: in { large_dia_in: L, small_dia_in: L, length_in: L } out: { tpf_in: L, tpi_in: dimensionless, angle_per_side_deg: dimensionless, included_angle_deg: dimensionless }
export function computeTaperCalc({ large_dia_in = 0, small_dia_in = 0, length_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D = Number(large_dia_in) || 0, d = Number(small_dia_in) || 0, L = Number(length_in) || 0;
  if (!(L > 0)) return { error: "Taper length must be positive (in)." };
  if (!(D >= 0) || !(d >= 0)) return { error: "Diameters must be zero or positive (in)." };
  if (D < d) return { error: "Large diameter must be greater than or equal to the small diameter." };
  const tpi = (D - d) / L;
  const tpf = tpi * 12;
  const angle_per_side_deg = (Math.atan((D - d) / (2 * L)) * 180) / Math.PI;
  const included_angle_deg = 2 * angle_per_side_deg;
  const notes = [];
  notes.push("Taper per inch = (D - d) / L; taper per foot = TPI x 12. The angle per side (the compound-slide setting) = atan((D - d) / (2L)); the included angle is twice that. First-principles trigonometry.");
  if (D === d) notes.push("Equal diameters: zero taper (a straight cylinder).");
  return { tpf_in: tpf, tpi_in: tpi, angle_per_side_deg, included_angle_deg, notes };
}
export const taperCalcExample = { inputs: { large_dia_in: 1, small_dia_in: 0.75, length_in: 3 } };

function _v40renderTaperCalc(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Taper definitions and the taper-per-foot / angle relations - TPF = 12 x (D - d) / L, angle per side = atan((D - d) / 2L) - first-principles trigonometry as in Machinery's Handbook (Industrial Press), by name; public domain.";
  const big = makeNumber("Large diameter D (in)", "tc-big", { step: "any", min: "0" });
  const small = makeNumber("Small diameter d (in)", "tc-small", { step: "any", min: "0" });
  const len = makeNumber("Length over taper L (in)", "tc-len", { step: "any", min: "0" });
  for (const f of [big, small, len]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { big.input.value = "1"; small.input.value = "0.75"; len.input.value = "3"; update(); });
  const oTpf = makeOutputLine(outputRegion, "Taper per foot", "tc-out-tpf");
  const oAngle = makeOutputLine(outputRegion, "Angle per side (compound set)", "tc-out-angle");
  const oIncl = makeOutputLine(outputRegion, "Included angle", "tc-out-incl");
  const oNote = makeOutputLine(outputRegion, "Notes", "tc-out-note");
  const update = debounce(() => {
    const r = computeTaperCalc({ large_dia_in: _readNum(big.input), small_dia_in: _readNum(small.input), length_in: _readNum(len.input) });
    if (r.error) { oTpf.textContent = r.error; oAngle.textContent = "-"; oIncl.textContent = "-"; oNote.textContent = ""; return; }
    oTpf.textContent = fmt(r.tpf_in, 4) + " in/ft (" + fmt(r.tpi_in, 6) + " in/in)";
    oAngle.textContent = fmt(r.angle_per_side_deg, 5) + " deg";
    oIncl.textContent = fmt(r.included_angle_deg, 5) + " deg";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [big.input, small.input, len.input]) f.addEventListener("input", update);
}
SHOP_RENDERERS["taper-calc"] = _v40renderTaperCalc;

// =====================================================================
// spec-v650 taper-diameter - the missing end diameter from a taper spec.
// The inverse of taper-calc: given the taper per foot, one known diameter,
// and the length, solve the other diameter (the lathe-setup direction).
// =====================================================================

// dims: in { known_dia_in: L, known_end: dimensionless, taper_per_foot: dimensionless, length_in: L } out: { large_dia_in: L, small_dia_in: L, change_in: L, angle_per_side_deg: dimensionless, included_angle_deg: dimensionless }
export function computeTaperDiameter({ known_dia_in = 0, known_end = "large", taper_per_foot = 0, length_in = 0 } = {}) {
  const _g = _finiteGuard({ known_dia_in, taper_per_foot, length_in }); if (_g) return _g;
  const known = Number(known_dia_in) || 0;
  const tpf = Number(taper_per_foot) || 0;
  const L = Number(length_in) || 0;
  const end = String(known_end);
  if (!(known > 0)) return { error: "Known diameter must be positive (in)." };
  if (!(tpf > 0)) return { error: "Taper per foot must be positive (in/ft)." };
  if (!(L > 0)) return { error: "Length over taper must be positive (in)." };
  const change_in = (tpf / 12) * L;
  let large_dia_in, small_dia_in;
  if (end === "small") { small_dia_in = known; large_dia_in = known + change_in; }
  else { large_dia_in = known; small_dia_in = known - change_in; }
  if (!(small_dia_in > 0)) return { error: "The taper removes more than the whole diameter over this length (small end <= 0) - check the taper spec or length." };
  const angle_per_side_deg = Math.atan(tpf / 24) * 180 / Math.PI;
  const included_angle_deg = 2 * angle_per_side_deg;
  const missing_dia_in = end === "small" ? large_dia_in : small_dia_in;
  return {
    large_dia_in, small_dia_in, missing_dia_in, change_in, angle_per_side_deg, included_angle_deg,
    note: "The lathe-setup inverse of the taper tile: given the taper per foot (TPF), one known end diameter, and the length over the taper, the missing end diameter is known -/+ (TPF/12) x L (subtract for the small end, add for the large end). The compound-slide angle per side = atan(TPF/24) depends only on the TPF, not the length or diameter - the same setting cuts the taper at any length. TPF = 12 x (D - d)/L, so a 0.600 in/ft taper drops 0.050 in of diameter per inch of length. First-principles trigonometry; the tool nose radius and setup govern the finished part. A shop aid.",
  };
}
export const taperDiameterExample = { inputs: { known_dia_in: 1.0, known_end: "large", taper_per_foot: 0.6, length_in: 3 } };
function _v650renderTaperDiameter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Taper setup inverse - the missing end diameter = known -/+ (TPF/12) x L, and the compound angle per side = atan(TPF/24) - first-principles trigonometry as in Machinery's Handbook (Industrial Press), by name; public domain.";
  const kd = makeNumber("Known diameter (in)", "tdia-kd", { step: "any", min: "0" });
  const end = makeSelect("Which end is known", "tdia-end", [{ value: "large", label: "Large end" }, { value: "small", label: "Small end" }]);
  const tpf = makeNumber("Taper per foot (in/ft)", "tdia-tpf", { step: "any", min: "0" });
  const len = makeNumber("Length over taper L (in)", "tdia-len", { step: "any", min: "0" });
  for (const f of [kd, end, tpf, len]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { kd.input.value = "1"; end.select.value = "large"; tpf.input.value = "0.6"; len.input.value = "3"; update(); });
  const oMiss = makeOutputLine(outputRegion, "Missing end diameter", "tdia-out-miss");
  const oEnds = makeOutputLine(outputRegion, "Large / small diameter", "tdia-out-ends");
  const oAngle = makeOutputLine(outputRegion, "Angle per side (compound set)", "tdia-out-angle");
  const oNote = makeOutputLine(outputRegion, "Note", "tdia-out-note");
  const update = debounce(() => {
    const r = computeTaperDiameter({ known_dia_in: _readNum(kd.input), known_end: end.select.value, taper_per_foot: _readNum(tpf.input), length_in: _readNum(len.input) });
    if (r.error) { oMiss.textContent = r.error; oEnds.textContent = "-"; oAngle.textContent = "-"; oNote.textContent = ""; return; }
    oMiss.textContent = fmt(r.missing_dia_in, 4) + " in";
    oEnds.textContent = fmt(r.large_dia_in, 4) + " / " + fmt(r.small_dia_in, 4) + " in (drop " + fmt(r.change_in, 4) + " in)";
    oAngle.textContent = fmt(r.angle_per_side_deg, 5) + " deg (included " + fmt(r.included_angle_deg, 5) + " deg)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  end.select.addEventListener("input", update);
  for (const f of [kd.input, tpf.input, len.input]) f.addEventListener("input", update);
}
SHOP_RENDERERS["taper-diameter"] = _v650renderTaperDiameter;

// spec-v1247: dovetail slide measurement over two rods. The shop metrology set has thread measurement
// over wires (thread-measure-wire) and the gear-tooth caliper, but no dovetail check. Two rods of
// diameter D seated in the acute corners: offset k = D(1 + cot(alpha/2)); male over-pins = flat + k,
// female over-pins = flat - k. Pure trig (Machinery's Handbook, "Checking a Dovetail"). alpha is the
// included dovetail angle (commonly 60 deg).
// dims: in { dovetail_type: dimensionless, known: dimensionless, dimension_in: L, pin_dia_in: L, angle_deg: dimensionless } out: { offset_in: L, over_pins_in: L, flat_in: L }
export function computeDovetailOverPins({ dovetail_type = "male", known = "flat", dimension_in = 0, pin_dia_in = 0, angle_deg = 60 } = {}) {
  const _g = _finiteGuard({ dimension_in, pin_dia_in, angle_deg }); if (_g) return _g;
  const dim = Number(dimension_in) || 0;
  const D = Number(pin_dia_in) || 0;
  const a = Number(angle_deg) || 0;
  const type = String(dovetail_type);
  const solveFor = String(known);
  if (type !== "male" && type !== "female") return { error: "Dovetail type must be male or female." };
  if (solveFor !== "flat" && solveFor !== "over_pins") return { error: "Known dimension must be flat or over_pins." };
  if (!(dim > 0)) return { error: "The known dimension must be positive (in)." };
  if (!(D > 0)) return { error: "Pin/rod diameter must be positive (in)." };
  if (!(a > 0 && a < 180)) return { error: "Dovetail included angle must be between 0 and 180 degrees (commonly 60)." };
  const cot = 1 / Math.tan((a / 2) * Math.PI / 180);
  const offset_in = D * (1 + cot);
  let over_pins_in, flat_in;
  if (solveFor === "flat") {
    flat_in = dim;
    over_pins_in = type === "male" ? dim + offset_in : dim - offset_in;
  } else {
    over_pins_in = dim;
    flat_in = type === "male" ? dim - offset_in : dim + offset_in;
  }
  if (!(over_pins_in > 0) || !(flat_in > 0)) return { error: "The computed dimension is not positive - check the pin diameter, angle, and which dimension is known." };
  if (![offset_in, over_pins_in, flat_in].every(Number.isFinite)) return { error: "Dovetail math is not a finite value." };
  return {
    offset_in, over_pins_in, flat_in, cot_half: cot,
    note: "The dovetail-slide check over two rods, the metrology companion to thread measurement over wires. Two gauge rods of diameter D are seated against the flanks in the acute corners of the dovetail and measured across; the offset from the reference flat to that over-rods measurement is k = D(1 + cot(alpha/2)), where alpha is the included dovetail angle (commonly 60 degrees, so cot(30) = 1.732 and k = 2.732 D). For a MALE (external) dovetail the rods sit outside the flat, so the over-rods measurement = flat width + k; for a FEMALE (internal) dovetail they sit inside the opening, so over-rods = opening width - k. A 60-degree male dovetail with a 2.000 in base and 0.500 in rods measures 3.366 in over the rods. Solve either way: enter the drawing flat to get the mic reading to inspect to, or enter the measured over-rods value to back out the actual flat. Use a rod small enough that it contacts the flank below the corner, not on the edge. First-principles trigonometry (Machinery's Handbook); the print tolerance and a verified gauge govern.",
  };
}
export const dovetailOverPinsExample = { inputs: { dovetail_type: "male", known: "flat", dimension_in: 2.0, pin_dia_in: 0.5, angle_deg: 60 } };
function renderDovetailOverPins(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: dovetail measurement over two rods - offset k = D(1 + cot(alpha/2)); male over-rods = flat + k, female over-rods = flat - k, alpha the included angle (commonly 60 deg). First-principles trigonometry as in Machinery's Handbook (Industrial Press), 'Checking a Dovetail Slide', by name; public domain. Use a rod that contacts the flank below the corner; the print tolerance and a verified gauge govern.";
  const type = makeSelect("Dovetail type", "dvt-type", [{ value: "male", label: "Male (external)" }, { value: "female", label: "Female (internal)" }]);
  const known = makeSelect("Known dimension", "dvt-known", [{ value: "flat", label: "Flat width -> find over-rods" }, { value: "over_pins", label: "Measured over-rods -> find flat" }]);
  const dim = makeNumber("Known dimension (in)", "dvt-dim", { step: "any", min: "0" });
  const pin = makeNumber("Rod / pin diameter (in)", "dvt-pin", { step: "any", min: "0" });
  const ang = makeNumber("Included dovetail angle (deg, commonly 60)", "dvt-ang", { step: "any", min: "0" });
  for (const f of [type, known, dim, pin, ang]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { type.select.value = "male"; known.select.value = "flat"; dim.input.value = "2.0"; pin.input.value = "0.5"; ang.input.value = "60"; update(); });
  const oResult = makeOutputLine(outputRegion, "Over-rods / flat", "dvt-out-res");
  const oOffset = makeOutputLine(outputRegion, "Offset k = D(1 + cot(a/2))", "dvt-out-k");
  const oNote = makeOutputLine(outputRegion, "Note", "dvt-out-note");
  const update = debounce(() => {
    const r = computeDovetailOverPins({ dovetail_type: type.select.value, known: known.select.value, dimension_in: _readNum(dim.input), pin_dia_in: _readNum(pin.input), angle_deg: _readNum(ang.input) });
    if (r.error) { oResult.textContent = r.error; oOffset.textContent = "-"; oNote.textContent = ""; return; }
    oResult.textContent = "over-rods " + fmt(r.over_pins_in, 4) + " in / flat " + fmt(r.flat_in, 4) + " in";
    oOffset.textContent = fmt(r.offset_in, 4) + " in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  type.select.addEventListener("input", update);
  known.select.addEventListener("input", update);
  for (const f of [dim.input, pin.input, ang.input]) f.addEventListener("input", update);
}
SHOP_RENDERERS["dovetail-over-pins"] = renderDovetailOverPins;

// =====================================================================
// spec-v805 tailstock-setover - lathe tailstock offset for taper turning.
// S = OAL x (D - d) / (2 L): the whole part swings about the headstock
// center, so the offset scales with the OVERALL length, not the taper length.
// =====================================================================
// dims: in { overall_length_in: L, large_dia_in: L, small_dia_in: L, taper_length_in: L } out: { setover_in: L, per_inch_setover_in: dimensionless }
export function computeTailstockSetover({ overall_length_in = 0, large_dia_in = 0, small_dia_in = 0, taper_length_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const OAL = Number(overall_length_in) || 0;
  const D = Number(large_dia_in) || 0;
  const d = Number(small_dia_in) || 0;
  const L = Number(taper_length_in) || 0;
  if (!(OAL > 0)) return { error: "Overall length between centers must be positive (in)." };
  if (!(L > 0)) return { error: "Taper length must be positive (in)." };
  if (!(D >= 0) || !(d >= 0)) return { error: "Diameters must be zero or positive (in)." };
  if (D < d) return { error: "Large diameter must be greater than or equal to the small diameter." };
  if (L > OAL + 1e-9) return { error: "Taper length cannot exceed the overall length between centers." };
  const per_inch_setover_in = (D - d) / (2 * L);
  const setover_in = OAL * per_inch_setover_in;
  if (![setover_in, per_inch_setover_in].every(Number.isFinite)) return { error: "Setover math is not a finite value." };
  return {
    setover_in, per_inch_setover_in,
    note: "Tailstock setover for taper turning between centers: S = OAL x (D - d) / (2 L), where OAL is the overall length between centers, D and d the large and small taper diameters, and L the axial length over which the taper runs. The tell people get wrong: the offset scales with the OVERALL part length, not the taper length -- the whole workpiece pivots about the headstock center, so a taper cut over part of a long bar needs a proportionally larger setover. When the taper runs the full length (L = OAL) it reduces to S = (D - d) / 2. Offset the tailstock this far AWAY from the tool to make the tailstock end the small diameter. The method suits shallow tapers only: it swings the center holes off the true axis, so the angle is slightly off and center-hole/contact wear grows with steeper offsets -- use a taper attachment or the compound for steep or precise tapers. A machine-setup aid; check the first part and dial in.",
  };
}
export const tailstockSetoverExample = { inputs: { overall_length_in: 12, large_dia_in: 1.5, small_dia_in: 1.0, taper_length_in: 8 } };
function _v805renderTailstockSetover(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Lathe tailstock setover for taper turning S = OAL x (D - d) / (2 L), for overall length between centers OAL, taper diameters D and d, and taper length L; first-principles as in Machinery's Handbook (Industrial Press), by name. Suits shallow tapers; a taper attachment or the compound governs steep or precise work.";
  const oal = makeNumber("Overall length between centers OAL (in)", "tso-oal", { step: "any", min: "0" });
  const big = makeNumber("Large diameter D (in)", "tso-big", { step: "any", min: "0" });
  const small = makeNumber("Small diameter d (in)", "tso-small", { step: "any", min: "0" });
  const len = makeNumber("Length over taper L (in)", "tso-len", { step: "any", min: "0" });
  for (const f of [oal, big, small, len]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { oal.input.value = "12"; big.input.value = "1.5"; small.input.value = "1.0"; len.input.value = "8"; update(); });
  const oS = makeOutputLine(outputRegion, "Tailstock setover", "tso-out-s");
  const oRate = makeOutputLine(outputRegion, "Setover per inch of length", "tso-out-rate");
  const oNote = makeOutputLine(outputRegion, "Note", "tso-out-note");
  const update = debounce(() => {
    const r = computeTailstockSetover({ overall_length_in: _readNum(oal.input), large_dia_in: _readNum(big.input), small_dia_in: _readNum(small.input), taper_length_in: _readNum(len.input) });
    if (r.error) { oS.textContent = r.error; oRate.textContent = "-"; oNote.textContent = ""; return; }
    oS.textContent = fmt(r.setover_in, 4) + " in";
    oRate.textContent = fmt(r.per_inch_setover_in, 6) + " in/in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [oal.input, big.input, small.input, len.input]) f.addEventListener("input", update);
}
SHOP_RENDERERS["tailstock-setover"] = _v805renderTailstockSetover;

// =====================================================================
// spec-v40 2.5 - dividing-head (Simple Indexing) - Group K
// Turns per division = ratio / N (40/N for the standard head). The
// fractional part times a hole-circle count gives the hole move when
// that product is a whole number. First-principles ratio arithmetic.
// =====================================================================

// dims: in { divisions: dimensionless, worm_ratio: dimensionless, circles: dimensionless } out: { full_turns: dimensionless }
export function computeDividingHead({ divisions = 0, worm_ratio = 40, circles = "" } = {}) {
  const _g = _finiteGuard({ divisions, worm_ratio }); if (_g) return _g;
  const N = Math.round(Number(divisions) || 0);
  const ratio = Number(worm_ratio) || 0;
  if (!(N >= 1)) return { error: "Number of divisions must be 1 or more." };
  if (!(ratio > 0)) return { error: "Worm ratio must be positive." };
  const turns = ratio / N;
  const full_turns = Math.floor(turns);
  const fraction = turns - full_turns; // 0..1
  // Parse the hole-circle list.
  const list = String(circles).split(",").map((s) => s.trim()).filter((s) => s !== "");
  if (list.length === 0) return { error: "Enter at least one index-plate hole circle (a comma list, e.g. 15,16,17,18,19,20)." };
  const holeCircles = [];
  for (const s of list) {
    const h = Number(s);
    if (!Number.isFinite(h) || !Number.isInteger(h) || h < 1) {
      return { error: "Each hole circle must be a whole number of holes (got '" + s + "')." };
    }
    holeCircles.push(h);
  }
  // For each circle H, the move is fraction x H holes, reported only when
  // that product is a whole number. Use exact integer arithmetic on the
  // remainder numerator/denominator to avoid float drift.
  const remNumExact = ratio - full_turns * N; // = ratio mod N when both integer
  const settings = [];
  for (const H of holeCircles) {
    // holes = fraction * H = remNum * H / N. Integer iff (remNum*H) % N == 0.
    const prod = remNumExact * H;
    const holesFloat = prod / N;
    const holesRounded = Math.round(holesFloat);
    const isWhole = Math.abs(holesFloat - holesRounded) < 1e-9 && holesRounded >= 0;
    settings.push({ circle: H, holes: isWhole ? holesRounded : null, whole: isWhole });
  }
  const usable = settings.filter((s) => s.whole);
  const notes = [];
  notes.push("Crank turns per division = ratio / N (" + ratio + "/" + N + " on this head). The fractional part times a hole-circle count gives the hole move when that product is a whole number. First-principles ratio arithmetic.");
  if (fraction === 0) {
    notes.push("The division comes out to whole crank turns; no index plate is needed.");
  } else if (usable.length === 0) {
    notes.push("None of the supplied hole circles divides evenly for this division - it needs a different plate or differential indexing (out of scope here).");
  }
  return { divisions: N, worm_ratio: ratio, turns, full_turns, fraction, settings, notes };
}
export const dividingHeadExample = { inputs: { divisions: 9, worm_ratio: 40, circles: "27,54" } };

function _v40renderDividingHead(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Simple (plain) indexing on a 40:1 dividing head - turns per division = ratio / N, hole move = fraction x hole-circle count - first-principles arithmetic as in Machinery's Handbook (Industrial Press), by name; public domain. Differential and angular indexing are out of scope.";
  const div = makeNumber("Divisions wanted N", "dh-div", { step: "1", min: "1" });
  const ratio = makeNumber("Worm ratio (turns per rev)", "dh-ratio", { step: "any", min: "0", value: "40" }); ratio.input.value = "40";
  const circles = makeText("Index-plate hole circles (comma list)", "dh-circles", { placeholder: "15,16,17,18,19,20" });
  for (const f of [div, ratio, circles]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { div.input.value = "9"; ratio.input.value = "40"; circles.input.value = "27,54"; update(); });
  const oTurns = makeOutputLine(outputRegion, "Crank turns per division", "dh-out-turns");
  const oPlate = makeOutputLine(outputRegion, "Plate settings", "dh-out-plate");
  const oNote = makeOutputLine(outputRegion, "Notes", "dh-out-note");
  const update = debounce(() => {
    const r = computeDividingHead({ divisions: _readNum(div.input), worm_ratio: _readNum(ratio.input), circles: circles.input.value });
    if (r.error) { oTurns.textContent = r.error; oPlate.textContent = "-"; oNote.textContent = ""; return; }
    oTurns.textContent = r.full_turns + " full turn" + (r.full_turns === 1 ? "" : "s") + (r.fraction > 0 ? " + " + fmt(r.fraction, 6) + " of a turn" : "");
    const usable = r.settings.filter((s) => s.whole);
    oPlate.textContent = usable.length ? usable.map((s) => r.full_turns + " turns + " + s.holes + " holes on the " + s.circle + "-hole circle").join("; ") : "no supplied circle divides evenly";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [div.input, ratio.input]) f.addEventListener("input", update);
  circles.input.addEventListener("input", update);
}
SHOP_RENDERERS["dividing-head"] = _v40renderDividingHead;

// =====================================================================
// spec-v40 2.6 - thread-measure-wire (Three-Wire Thread Measurement) - Group G
// 60-degree form. Best wire W = P / (2 cos30) = 0.57735 P; measurement
// over three wires M = E + 3W - 0.86603 P. First-principles geometry.
// =====================================================================

const _V40_BESTWIRE = 1 / (2 * Math.cos(Math.PI / 6)); // 0.5773502691896258
const _V40_MOW_K = Math.cos(Math.PI / 6); // 0.8660254 = (1/2)cot(30deg) = sqrt(3)/2, the 60-degree measurement-over-wires constant (M = E + 3W - K*P)

// dims: in { thread_standard: dimensionless, tpi: T^-1, pitch_mm: L, pitch_diameter_in: L, wire_dia_in: L } out: { best_wire_in: L, measurement_over_wires_in: L }
export function computeThreadMeasureWire({ thread_standard = "inch", tpi = 0, pitch_mm = 0, pitch_diameter_in = 0, wire_dia_in = 0 } = {}) {
  const _g = _finiteGuard({ tpi, pitch_mm, pitch_diameter_in, wire_dia_in }); if (_g) return _g;
  const isMetric = String(thread_standard) === "metric";
  let P_in;
  if (isMetric) {
    const pmm = Number(pitch_mm) || 0;
    if (!(pmm > 0)) return { error: "Metric thread pitch must be positive (mm)." };
    P_in = pmm / 25.4;
  } else {
    const t = Number(tpi) || 0;
    if (!(t > 0)) return { error: "Threads per inch (TPI) must be positive." };
    P_in = 1 / t;
  }
  const E = Number(pitch_diameter_in) || 0;
  if (!(E > 0)) return { error: "Pitch diameter E must be positive (in)." };
  const best_wire_in = _V40_BESTWIRE * P_in;
  const wire_min_in = 0.560 * P_in, wire_max_in = 0.650 * P_in;
  let W = Number(wire_dia_in) || 0;
  let used_best = false;
  if (!(W > 0)) { W = best_wire_in; used_best = true; }
  const wire_out_of_range = W < wire_min_in || W > wire_max_in;
  const M = E + 3 * W - _V40_MOW_K * P_in;
  const notes = [];
  notes.push("For a 60-degree thread, best wire W = P / (2 cos30) = 0.57735 x P (acceptable range 0.560P to 0.650P); the measurement over three wires M = E + 3W - 0.86603 x P. First-principles thread geometry; the pitch diameter E is user-supplied (no thread-class table here).");
  if (used_best) notes.push("Using the best-wire size " + fmt(best_wire_in, 6) + " in.");
  if (wire_out_of_range) notes.push("The entered wire " + fmt(W, 6) + " in is outside the acceptable range " + fmt(wire_min_in, 6) + " to " + fmt(wire_max_in, 6) + " in - the contact point moves off the pitch line and M is less reliable.");
  return {
    pitch_in: P_in, best_wire_in, wire_min_in, wire_max_in,
    wire_dia_in: W, wire_out_of_range,
    measurement_over_wires_in: M, measurement_over_wires_mm: M * 25.4, notes,
  };
}
export const threadMeasureWireExample = { inputs: { thread_standard: "inch", tpi: 13, pitch_mm: 0, pitch_diameter_in: 0.45, wire_dia_in: 0 } };

function _v40renderThreadMeasureWire(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: The three-wire measurement-over-wires method for 60-degree threads - best wire W = 0.57735 x P, M = E + 3W - 0.86603 x P - first-principles geometry as in Machinery's Handbook (Industrial Press), by name; public domain. The pitch diameter E is user-supplied (no thread-class table lookup).";
  const std = makeSelect("Thread standard", "tmw-std", [
    { value: "inch", label: "Inch (enter TPI)" },
    { value: "metric", label: "Metric (enter pitch in mm)" },
  ]);
  const tpi = makeNumber("Threads per inch (TPI)", "tmw-tpi", { step: "any", min: "0" });
  const pmm = makeNumber("Metric pitch (mm)", "tmw-pmm", { step: "any", min: "0" });
  const e = makeNumber("Pitch diameter E (in)", "tmw-e", { step: "any", min: "0" });
  const wire = makeNumber("Wire diameter (in, blank = best wire)", "tmw-wire", { step: "any", min: "0" });
  for (const f of [std, tpi, pmm, e, wire]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { std.select.value = "inch"; tpi.input.value = "13"; pmm.input.value = ""; e.input.value = "0.45"; wire.input.value = ""; update(); });
  const oBest = makeOutputLine(outputRegion, "Best wire", "tmw-out-best");
  const oM = makeOutputLine(outputRegion, "Measurement over 3 wires", "tmw-out-m");
  const oNote = makeOutputLine(outputRegion, "Notes", "tmw-out-note");
  const update = debounce(() => {
    const r = computeThreadMeasureWire({ thread_standard: std.select.value, tpi: _readNum(tpi.input), pitch_mm: _readNum(pmm.input), pitch_diameter_in: _readNum(e.input), wire_dia_in: _readNum(wire.input) });
    if (r.error) { oBest.textContent = r.error; oM.textContent = "-"; oNote.textContent = ""; return; }
    oBest.textContent = fmt(r.best_wire_in, 6) + " in (range " + fmt(r.wire_min_in, 6) + " to " + fmt(r.wire_max_in, 6) + " in)";
    oM.textContent = fmt(r.measurement_over_wires_in, 6) + " in (" + fmt(r.measurement_over_wires_mm, 4) + " mm)" + (r.wire_out_of_range ? " - wire out of range" : "");
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [tpi.input, pmm.input, e.input, wire.input]) f.addEventListener("input", update);
  std.select.addEventListener("change", update);
}
SHOP_RENDERERS["thread-measure-wire"] = _v40renderThreadMeasureWire;

// thread-pitch-dia-from-wires: inverse of thread-measure-wire. The forward tile
// gives the measurement over wires M from a pitch diameter E; the machinist
// actually measures M on the mic and wants E, so E = M - 3W + 0.86603 P is the
// working direction. Same 60-degree geometry, best-wire default, and range check.
// dims: in { thread_standard: dimensionless, tpi: T^-1, pitch_mm: L, measurement_over_wires_in: L, wire_dia_in: L } out: { pitch_diameter_in: L, best_wire_in: L, pitch_in: L }
export function computeThreadPitchDiaFromWires({ thread_standard = "inch", tpi = 0, pitch_mm = 0, measurement_over_wires_in = 0, wire_dia_in = 0 } = {}) {
  const _g = _finiteGuard({ tpi, pitch_mm, measurement_over_wires_in, wire_dia_in }); if (_g) return _g;
  const isMetric = String(thread_standard) === "metric";
  let P_in;
  if (isMetric) {
    const pmm = Number(pitch_mm) || 0;
    if (!(pmm > 0)) return { error: "Metric thread pitch must be positive (mm)." };
    P_in = pmm / 25.4;
  } else {
    const t = Number(tpi) || 0;
    if (!(t > 0)) return { error: "Threads per inch (TPI) must be positive." };
    P_in = 1 / t;
  }
  const M = Number(measurement_over_wires_in) || 0;
  if (!(M > 0)) return { error: "Measurement over wires M must be positive (in)." };
  const best_wire_in = _V40_BESTWIRE * P_in;
  const wire_min_in = 0.560 * P_in, wire_max_in = 0.650 * P_in;
  let W = Number(wire_dia_in) || 0;
  let used_best = false;
  if (!(W > 0)) { W = best_wire_in; used_best = true; }
  const wire_out_of_range = W < wire_min_in || W > wire_max_in;
  const E = M - 3 * W + _V40_MOW_K * P_in;
  if (!(E > 0)) return { error: "Computed pitch diameter is not positive; check the measurement, the wire size, and the thread pitch." };
  const notes = [];
  notes.push("For a 60-degree thread, best wire W = 0.57735 x P (acceptable range 0.560P to 0.650P); the pitch diameter from a measurement over three wires is E = M - 3W + 0.86603 x P. First-principles thread geometry; compare E to the thread-class pitch-diameter limits for the fit.");
  if (used_best) notes.push("Using the best-wire size " + fmt(best_wire_in, 6) + " in.");
  if (wire_out_of_range) notes.push("The entered wire " + fmt(W, 6) + " in is outside the acceptable range " + fmt(wire_min_in, 6) + " to " + fmt(wire_max_in, 6) + " in - the contact point moves off the pitch line and E is less reliable.");
  return {
    pitch_in: P_in, best_wire_in, wire_min_in, wire_max_in,
    wire_dia_in: W, wire_out_of_range, used_best,
    pitch_diameter_in: E, notes,
  };
}
export const threadPitchDiaFromWiresExample = { inputs: { thread_standard: "inch", tpi: 13, pitch_mm: 0, measurement_over_wires_in: 0.49, wire_dia_in: 0 } };
function _v721renderThreadPitchDiaFromWires(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: The three-wire method for 60-degree threads solved for the pitch diameter - E = M - 3W + 0.86603 x P, best wire W = 0.57735 x P - first-principles geometry as in Machinery's Handbook (Industrial Press), by name; public domain. Compare E to the thread-class limits.";
  const std = makeSelect("Thread standard", "tpd-std", [
    { value: "inch", label: "Inch (enter TPI)" },
    { value: "metric", label: "Metric (enter pitch in mm)" },
  ]);
  const tpi = makeNumber("Threads per inch (TPI)", "tpd-tpi", { step: "any", min: "0" });
  const pmm = makeNumber("Metric pitch (mm)", "tpd-pmm", { step: "any", min: "0" });
  const m = makeNumber("Measurement over 3 wires M (in)", "tpd-m", { step: "any", min: "0" });
  const wire = makeNumber("Wire diameter (in, blank = best wire)", "tpd-wire", { step: "any", min: "0" });
  for (const f of [std, tpi, pmm, m, wire]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { std.select.value = "inch"; tpi.input.value = "13"; pmm.input.value = ""; m.input.value = "0.49"; wire.input.value = ""; update(); });
  const oBest = makeOutputLine(outputRegion, "Best wire", "tpd-out-best");
  const oE = makeOutputLine(outputRegion, "Pitch diameter E", "tpd-out-e");
  const oNote = makeOutputLine(outputRegion, "Notes", "tpd-out-note");
  const update = debounce(() => {
    const r = computeThreadPitchDiaFromWires({ thread_standard: std.select.value, tpi: _readNum(tpi.input), pitch_mm: _readNum(pmm.input), measurement_over_wires_in: _readNum(m.input), wire_dia_in: _readNum(wire.input) });
    if (r.error) { oBest.textContent = r.error; oE.textContent = "-"; oNote.textContent = ""; return; }
    oBest.textContent = fmt(r.best_wire_in, 6) + " in (range " + fmt(r.wire_min_in, 6) + " to " + fmt(r.wire_max_in, 6) + " in)";
    oE.textContent = fmt(r.pitch_diameter_in, 6) + " in (" + fmt(r.pitch_diameter_in * 25.4, 4) + " mm)" + (r.wire_out_of_range ? " - wire out of range" : "");
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [tpi.input, pmm.input, m.input, wire.input]) f.addEventListener("input", update);
  std.select.addEventListener("change", update);
}
SHOP_RENDERERS["thread-pitch-dia-from-wires"] = _v721renderThreadPitchDiaFromWires;

// =====================================================================
// spec-v40 2.7 - press-brake-tonnage (Air-Bend Tonnage) - Group E
// Industry air-bend rule tons/ft = 575 x (UTS/60) x T^2 / V (the 575
// constant is the published mild-steel value); total = tons/ft x L.
// =====================================================================

// dims: in { thickness_in: L, bend_length_ft: L, die_opening_in: L, uts_ksi: dimensionless } out: { tons_per_ft: dimensionless, total_tons: dimensionless }
export function computePressBrakeTonnage({ thickness_in = 0, bend_length_ft = 0, die_opening_in = 0, uts_ksi = 60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const T = Number(thickness_in) || 0, L = Number(bend_length_ft) || 0;
  const V = Number(die_opening_in) || 0, UTS = Number(uts_ksi) || 0;
  if (!(T > 0)) return { error: "Material thickness must be positive (in)." };
  if (!(L > 0)) return { error: "Bend length must be positive (ft)." };
  if (!(V > 0)) return { error: "V-die opening must be positive (in)." };
  if (!(UTS > 0)) return { error: "Ultimate tensile strength must be positive (ksi)." };
  const tons_per_ft = (575 * (UTS / 60) * T * T) / V;
  const total_tons = tons_per_ft * L;
  const recommended_die_in = 8 * T;
  const min_flange_in = V * 0.7;
  const notes = [];
  notes.push("Air-bend tonnage tons/ft = 575 x (UTS/60) x T^2 / V; the 575 constant is the published mild-steel (60 ksi) value, scaled linearly by strength. Total = tons/ft x bend length.");
  notes.push("This estimates air bending; bottoming and coining run substantially higher (several times). The die maker's tonnage chart governs the final setup, and a die opening near 8 x T (recommended " + fmt(recommended_die_in, 3) + " in) with a minimum flange around " + fmt(min_flange_in, 3) + " in keeps the part on the die shoulders.");
  return { tons_per_ft, total_tons, recommended_die_in, min_flange_in, notes };
}
export const pressBrakeTonnageExample = { inputs: { thickness_in: 0.125, bend_length_ft: 4, die_opening_in: 1, uts_ksi: 60 } };

function _v40renderPressBrakeTonnage(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Press-brake air-bend tonnage formula (the 575 mild-steel constant) as published in press-brake tonnage charts / Machinery's Handbook, by name; empirical method. The user supplies the geometry and may override the strength; bottoming and coining run higher, and the die maker's chart governs the final setup.";
  const t = makeNumber("Material thickness T (in)", "pbt-t", { step: "any", min: "0" });
  const len = makeNumber("Bend length (ft)", "pbt-len", { step: "any", min: "0" });
  const v = makeNumber("V-die opening (in, ~8 x T)", "pbt-v", { step: "any", min: "0" });
  const uts = makeNumber("Ultimate tensile strength (ksi)", "pbt-uts", { step: "any", min: "0", value: "60" }); uts.input.value = "60";
  for (const f of [t, len, v, uts]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { t.input.value = "0.125"; len.input.value = "4"; v.input.value = "1"; uts.input.value = "60"; update(); });
  const oPerFt = makeOutputLine(outputRegion, "Tonnage per foot", "pbt-out-perft");
  const oTotal = makeOutputLine(outputRegion, "Total tonnage", "pbt-out-total");
  const oDie = makeOutputLine(outputRegion, "Die advisories", "pbt-out-die");
  const oNote = makeOutputLine(outputRegion, "Notes", "pbt-out-note");
  const update = debounce(() => {
    const r = computePressBrakeTonnage({ thickness_in: _readNum(t.input), bend_length_ft: _readNum(len.input), die_opening_in: _readNum(v.input), uts_ksi: _readNum(uts.input) });
    if (r.error) { oPerFt.textContent = r.error; oTotal.textContent = "-"; oDie.textContent = "-"; oNote.textContent = ""; return; }
    oPerFt.textContent = fmt(r.tons_per_ft, 4) + " tons/ft";
    oTotal.textContent = fmt(r.total_tons, 3) + " tons";
    oDie.textContent = "recommended die ~" + fmt(r.recommended_die_in, 3) + " in, min flange ~" + fmt(r.min_flange_in, 3) + " in";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [t.input, len.input, v.input, uts.input]) f.addEventListener("input", update);
}
SHOP_RENDERERS["press-brake-tonnage"] = _v40renderPressBrakeTonnage;

// press-brake-max-thickness: inverse of press-brake-tonnage. The forward tile
// gives the tonnage a bend needs; the everyday shop question is the reverse --
// the thickest material a given press can air-bend. From
// total_tons = 575 x (UTS/60) x T^2 / V x L, solving for T:
// T = sqrt( total_tons x V / (575 x (UTS/60) x L) ).
// dims: in { available_tonnage_tons: dimensionless, die_opening_in: L, bend_length_ft: L, uts_ksi: dimensionless } out: { max_thickness_in: L, recommended_die_in: L }
export function computePressBrakeMaxThickness({ available_tonnage_tons = 0, die_opening_in = 0, bend_length_ft = 0, uts_ksi = 60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const tons = Number(available_tonnage_tons) || 0;
  const V = Number(die_opening_in) || 0;
  const L = Number(bend_length_ft) || 0;
  const UTS = Number(uts_ksi) || 0;
  if (!(tons > 0)) return { error: "Available press tonnage must be positive (tons)." };
  if (!(V > 0)) return { error: "V-die opening must be positive (in)." };
  if (!(L > 0)) return { error: "Bend length must be positive (ft)." };
  if (!(UTS > 0)) return { error: "Ultimate tensile strength must be positive (ksi)." };
  const max_thickness_in = Math.sqrt(tons * V / (575 * (UTS / 60) * L));
  const recommended_die_in = 8 * max_thickness_in;
  const notes = [];
  notes.push("Air-bend tonnage tons/ft = 575 x (UTS/60) x T^2 / V solved for the thickness: the thickest material the press can air-bend over the full bend length is T = sqrt(tons x V / (575 x (UTS/60) x L)); the 575 constant is the published mild-steel (60 ksi) value, scaled by strength.");
  notes.push("Air bending only - bottoming and coining need several times the tonnage, so back off for those. A die opening near 8 x T (recommended " + fmt(recommended_die_in, 3) + " in for this thickness) keeps the part on the die shoulders; a wider die lowers the tonnage but opens the bend radius. The die maker's tonnage chart governs the final setup.");
  return { max_thickness_in, recommended_die_in, notes };
}
export const pressBrakeMaxThicknessExample = { inputs: { available_tonnage_tons: 100, die_opening_in: 0.5, bend_length_ft: 4, uts_ksi: 60 } };
function _v724renderPressBrakeMaxThickness(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Press-brake air-bend tonnage formula (the 575 mild-steel constant) solved for the thickness: T = sqrt(tons x V / (575 x (UTS/60) x L)), as published in press-brake tonnage charts / Machinery's Handbook, by name; empirical method. Air bending only; bottoming and coining run higher and the die maker's chart governs.";
  const tons = makeNumber("Available press tonnage (tons)", "pbm-t", { step: "any", min: "0" });
  const v = makeNumber("V-die opening (in, ~8 x T)", "pbm-v", { step: "any", min: "0" });
  const len = makeNumber("Bend length (ft)", "pbm-len", { step: "any", min: "0" });
  const uts = makeNumber("Ultimate tensile strength (ksi)", "pbm-uts", { step: "any", min: "0", value: "60" }); uts.input.value = "60";
  for (const f of [tons, v, len, uts]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { tons.input.value = "100"; v.input.value = "0.5"; len.input.value = "4"; uts.input.value = "60"; update(); });
  const oT = makeOutputLine(outputRegion, "Max material thickness", "pbm-out-t");
  const oDie = makeOutputLine(outputRegion, "Recommended die (8 x T)", "pbm-out-die");
  const oNote = makeOutputLine(outputRegion, "Notes", "pbm-out-note");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computePressBrakeMaxThickness({ available_tonnage_tons: readNum(tons.input), die_opening_in: readNum(v.input), bend_length_ft: readNum(len.input), uts_ksi: uts.input.value === "" ? 60 : readNum(uts.input) });
    if (r.error) { oT.textContent = r.error; oDie.textContent = "-"; oNote.textContent = ""; return; }
    oT.textContent = fmt(r.max_thickness_in, 4) + " in (" + fmt(r.max_thickness_in * 25.4, 2) + " mm)";
    oDie.textContent = fmt(r.recommended_die_in, 3) + " in";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [tons.input, v.input, len.input, uts.input]) f.addEventListener("input", update);
}
SHOP_RENDERERS["press-brake-max-thickness"] = _v724renderPressBrakeMaxThickness;

// =====================================================================
// spec-v40 2.8 - punch-force (Punch / Shear Force) - Group G
// First-principles shear: F = perimeter x T x shear strength.
// =====================================================================

// dims: in { shape: dimensionless, diameter_in: L, side_a_in: L, side_b_in: L, perimeter_in: L, thickness_in: L, shear_strength_psi: dimensionless } out: { perimeter_in: L, force_lb: dimensionless, force_tons: dimensionless }
export function computePunchForce({ shape = "round", diameter_in = 0, side_a_in = 0, side_b_in = 0, perimeter_in = 0, thickness_in = 0, shear_strength_psi = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const sh = String(shape);
  const T = Number(thickness_in) || 0, tau = Number(shear_strength_psi) || 0;
  if (!(T > 0)) return { error: "Material thickness must be positive (in)." };
  if (!(tau > 0)) return { error: "Shear strength must be positive (psi)." };
  let perimeter;
  if (sh === "rectangular") {
    const a = Number(side_a_in) || 0, b = Number(side_b_in) || 0;
    if (!(a > 0) || !(b > 0)) return { error: "Both side lengths must be positive (in)." };
    perimeter = 2 * (a + b);
  } else if (sh === "perimeter") {
    perimeter = Number(perimeter_in) || 0;
    if (!(perimeter > 0)) return { error: "Cut perimeter must be positive (in)." };
  } else {
    const D = Number(diameter_in) || 0;
    if (!(D > 0)) return { error: "Hole diameter must be positive (in)." };
    perimeter = Math.PI * D;
  }
  const force_lb = perimeter * T * tau;
  const force_tons = force_lb / 2000;
  const stripping_lb = 0.035 * force_lb;
  const notes = [];
  notes.push("Punching force F = cut perimeter x thickness x shear strength (first-principles shear: sheared area x shear strength). Tons = F / 2000.");
  notes.push("Stripping force is an advisory ~3.5% of the punch force here. Shear strength is user-supplied (~0.8 x UTS for mild steel); the press capacity must exceed the punch force with margin.");
  return { perimeter_in: perimeter, force_lb, force_tons, stripping_lb, notes };
}
export const punchForceExample = { inputs: { shape: "round", diameter_in: 0.5, side_a_in: 0, side_b_in: 0, perimeter_in: 0, thickness_in: 0.25, shear_strength_psi: 50000 } };

function _v40renderPunchForce(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Punching force as sheared area times shear strength - F = perimeter x thickness x shear strength - first-principles as in Machinery's Handbook (Industrial Press), by name; public domain. The shear strength (~0.8 x UTS for mild steel) is user-supplied.";
  const shape = makeSelect("Hole shape", "pf-shape", [
    { value: "round", label: "Round (enter diameter)" },
    { value: "rectangular", label: "Rectangular (enter two sides)" },
    { value: "perimeter", label: "Enter cut perimeter directly" },
  ]);
  const dia = makeNumber("Hole diameter (in, round)", "pf-dia", { step: "any", min: "0" });
  const a = makeNumber("Side a (in, rectangular)", "pf-a", { step: "any", min: "0" });
  const b = makeNumber("Side b (in, rectangular)", "pf-b", { step: "any", min: "0" });
  const perim = makeNumber("Cut perimeter (in, direct)", "pf-perim", { step: "any", min: "0" });
  const t = makeNumber("Material thickness T (in)", "pf-t", { step: "any", min: "0" });
  const tau = makeNumber("Shear strength (psi)", "pf-tau", { step: "any", min: "0" });
  for (const f of [shape, dia, a, b, perim, t, tau]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { shape.select.value = "round"; dia.input.value = "0.5"; a.input.value = ""; b.input.value = ""; perim.input.value = ""; t.input.value = "0.25"; tau.input.value = "50000"; update(); });
  const oPerim = makeOutputLine(outputRegion, "Cut perimeter", "pf-out-perim");
  const oForce = makeOutputLine(outputRegion, "Punching force", "pf-out-force");
  const oStrip = makeOutputLine(outputRegion, "Stripping force (est.)", "pf-out-strip");
  const oNote = makeOutputLine(outputRegion, "Notes", "pf-out-note");
  const update = debounce(() => {
    const r = computePunchForce({ shape: shape.select.value, diameter_in: _readNum(dia.input), side_a_in: _readNum(a.input), side_b_in: _readNum(b.input), perimeter_in: _readNum(perim.input), thickness_in: _readNum(t.input), shear_strength_psi: _readNum(tau.input) });
    if (r.error) { oPerim.textContent = r.error; oForce.textContent = "-"; oStrip.textContent = "-"; oNote.textContent = ""; return; }
    oPerim.textContent = fmt(r.perimeter_in, 5) + " in";
    oForce.textContent = fmt(r.force_lb, 1) + " lb (" + fmt(r.force_tons, 4) + " US tons)";
    oStrip.textContent = fmt(r.stripping_lb, 1) + " lb";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [dia.input, a.input, b.input, perim.input, t.input, tau.input]) f.addEventListener("input", update);
  shape.select.addEventListener("change", update);
}
SHOP_RENDERERS["punch-force"] = _v40renderPunchForce;

// spec-v683 - punch-capacity (inverse of punch-force) - Group G
// F = perimeter x T x tau; solved for the max round-hole diameter or the max thickness a press can punch.
// dims: in { capacity_tons: dimensionless, shear_strength_psi: dimensionless, solve_for: dimensionless, diameter_in: L, thickness_in: L } out: { max_thickness_in: L, max_diameter_in: L, force_lb: dimensionless }
export function computePunchCapacity({ capacity_tons = 0, shear_strength_psi = 0, solve_for = "thickness", diameter_in = 0, thickness_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cap = Number(capacity_tons) || 0;
  const tau = Number(shear_strength_psi) || 0;
  const mode = String(solve_for);
  if (!(cap > 0)) return { error: "Press capacity must be positive (tons)." };
  if (!(tau > 0)) return { error: "Shear strength must be positive (psi)." };
  if (mode !== "thickness" && mode !== "diameter") return { error: "Solve for must be thickness or diameter." };
  const force_lb = cap * 2000;
  if (mode === "thickness") {
    const D = Number(diameter_in) || 0;
    if (!(D > 0)) return { error: "Hole diameter must be positive (in)." };
    // Inverse of F = (pi D) x T x tau: T_max = F / (pi D tau).
    const max_thickness_in = force_lb / (Math.PI * D * tau);
    if (!(max_thickness_in > 0) || !Number.isFinite(max_thickness_in)) return { error: "Thickness math is not a finite positive value." };
    return { solve_for: mode, max_thickness_in, force_lb, note: _PUNCH_CAP_NOTE };
  }
  const T = Number(thickness_in) || 0;
  if (!(T > 0)) return { error: "Material thickness must be positive (in)." };
  // Inverse of F = (pi D) x T x tau: D_max = F / (pi T tau).
  const max_diameter_in = force_lb / (Math.PI * T * tau);
  if (!(max_diameter_in > 0) || !Number.isFinite(max_diameter_in)) return { error: "Diameter math is not a finite positive value." };
  return { solve_for: mode, max_diameter_in, force_lb, note: _PUNCH_CAP_NOTE };
}
const _PUNCH_CAP_NOTE = "The largest round hole (or the thickest material) a press of a given tonnage can punch, the inverse of the punch-force tile: from F = perimeter x thickness x shear strength with a round perimeter pi x D, the max thickness is F / (pi x D x shear) and the max diameter is F / (pi x T x shear), where F is the press capacity in pounds (tons x 2000). Use the shear strength (~0.8 x UTS for mild steel), and keep margin: the press should exceed the punch force, the punch and die need adequate strength, and a shear-ground or stepped punch lowers the peak force. First-principles shear for a round hole; a rectangular or shaped hole uses its own perimeter. A shop aid; the press, tooling, and material govern.";
export const punchCapacityExample = { inputs: { capacity_tons: 9.82, shear_strength_psi: 50000, solve_for: "thickness", diameter_in: 0.5, thickness_in: 0.25 } };

function renderPunchCapacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: punching force solved for capacity: max thickness = F / (pi x D x shear), max diameter = F / (pi x T x shear), from F = perimeter x thickness x shear strength (F = capacity_tons x 2000 lb) - first-principles as in Machinery's Handbook (Industrial Press), by name; public domain. The shear strength (~0.8 x UTS for mild steel) is user-supplied; keep press margin.";
  const cap = makeNumber("Press capacity (tons)", "pc-cap", { step: "any", min: "0" });
  const tau = makeNumber("Shear strength (psi, ~0.8 x UTS)", "pc-tau", { step: "any", min: "0" });
  const mode = makeSelect("Solve for", "pc-mode", [
    { value: "thickness", label: "Max thickness (given a hole diameter)", selected: true },
    { value: "diameter", label: "Max round-hole diameter (given a thickness)" },
  ]);
  const dia = makeNumber("Hole diameter (in)", "pc-dia", { step: "any", min: "0" });
  const t = makeNumber("Material thickness (in)", "pc-t", { step: "any", min: "0" });
  for (const f of [cap, tau, mode, dia, t]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cap.input.value = "9.82"; tau.input.value = "50000"; mode.select.value = "thickness"; dia.input.value = "0.5"; t.input.value = "0.25"; update(); });
  const oMax = makeOutputLine(outputRegion, "Max the press can punch", "pc-out-max");
  const oNote = makeOutputLine(outputRegion, "Note", "pc-out-note");
  const update = debounce(() => {
    const r = computePunchCapacity({ capacity_tons: _readNum(cap.input), shear_strength_psi: _readNum(tau.input), solve_for: mode.select.value, diameter_in: _readNum(dia.input), thickness_in: _readNum(t.input) });
    if (r.error) { oMax.textContent = r.error; oNote.textContent = ""; return; }
    oMax.textContent = r.solve_for === "thickness" ? (fmt(r.max_thickness_in, 4) + " in thick") : (fmt(r.max_diameter_in, 4) + " in diameter");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [cap.input, tau.input, dia.input, t.input]) f.addEventListener("input", update);
  mode.select.addEventListener("change", update);
}
SHOP_RENDERERS["punch-capacity"] = renderPunchCapacity;

// =====================================================================
// spec-v40 2.9 - weld-duty-cycle (Welder Duty Cycle) - Group E
// I^2-heating: DC2 = DC1 x (A1/A2)^2 (capped 100%); A100 = A1 x sqrt(DC1/100).
// =====================================================================

// dims: in { rated_amps: I, rated_duty_pct: dimensionless, target_amps: I } out: { duty_at_target_pct: dimensionless, minutes_on: T, max_continuous_amps: I }
export function computeWeldDutyCycle({ rated_amps = 0, rated_duty_pct = 0, target_amps = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const A1 = Number(rated_amps) || 0, DC1 = Number(rated_duty_pct) || 0, A2 = Number(target_amps) || 0;
  if (!(A1 > 0)) return { error: "Rated amperage must be positive (A)." };
  if (!(A2 > 0)) return { error: "Target amperage must be positive (A)." };
  if (!(DC1 > 0) || DC1 > 100) return { error: "Rated duty cycle must be between 0 and 100 percent." };
  let duty = DC1 * (A1 / A2) * (A1 / A2);
  const capped = duty > 100;
  if (capped) duty = 100;
  const minutes_on = (duty / 100) * 10;
  const max_continuous_amps = A1 * Math.sqrt(DC1 / 100);
  const notes = [];
  notes.push("Resistive (I^2) heating: the allowable duty cycle scales inverse-square with current, DC2 = DC1 x (A1/A2)^2, capped at 100%. Minutes-on per 10-minute window = DC2 x 10. Maximum continuous (100%) amperage A100 = A1 x sqrt(DC1/100). NEMA EW-1 convention.");
  if (capped) notes.push("At this amperage the machine can run continuously (100% duty); the target is at or below the maximum continuous amperage.");
  return { duty_at_target_pct: duty, capped, minutes_on, max_continuous_amps, notes };
}
export const weldDutyCycleExample = { inputs: { rated_amps: 250, rated_duty_pct: 60, target_amps: 300 } };

function _v40renderWeldDutyCycle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: The inverse-square duty-cycle relation (NEMA EW-1 arc-welding power-source convention), by name; first-principles I^2-heating, public domain. Duty cycle is measured over a 10-minute window; exceeding it trips the thermal overload.";
  const a1 = makeNumber("Rated amperage A1 (A)", "wdc-a1", { step: "any", min: "0" });
  const dc1 = makeNumber("Rated duty cycle (%)", "wdc-dc1", { step: "any", min: "0", max: "100" });
  const a2 = makeNumber("Target amperage A2 (A)", "wdc-a2", { step: "any", min: "0" });
  for (const f of [a1, dc1, a2]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a1.input.value = "250"; dc1.input.value = "60"; a2.input.value = "300"; update(); });
  const oDuty = makeOutputLine(outputRegion, "Allowable duty at target", "wdc-out-duty");
  const oMax = makeOutputLine(outputRegion, "Max continuous (100%) amperage", "wdc-out-max");
  const oNote = makeOutputLine(outputRegion, "Notes", "wdc-out-note");
  const update = debounce(() => {
    const r = computeWeldDutyCycle({ rated_amps: _readNum(a1.input), rated_duty_pct: _readNum(dc1.input), target_amps: _readNum(a2.input) });
    if (r.error) { oDuty.textContent = r.error; oMax.textContent = "-"; oNote.textContent = ""; return; }
    oDuty.textContent = fmt(r.duty_at_target_pct, 2) + "%" + (r.capped ? " (continuous)" : "") + " = " + fmt(r.minutes_on, 3) + " min per 10 min";
    oMax.textContent = fmt(r.max_continuous_amps, 1) + " A";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [a1.input, dc1.input, a2.input]) f.addEventListener("input", update);
}
SHOP_RENDERERS["weld-duty-cycle"] = _v40renderWeldDutyCycle;

// =====================================================================
// spec-v40 2.10 - carbon-equivalent (Carbon Equivalent and Preheat Screen) - Group E
// IIW / AWS D1.1: CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15.
// =====================================================================

// dims: in { c: dimensionless, mn: dimensionless, cr: dimensionless, mo: dimensionless, v: dimensionless, ni: dimensionless, cu: dimensionless } out: { carbon_equivalent: dimensionless }
export function computeCarbonEquivalent({ c = 0, mn = 0, cr = 0, mo = 0, v = 0, ni = 0, cu = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const vals = { c, mn, cr, mo, v, ni, cu };
  for (const [k, val] of Object.entries(vals)) {
    const n = Number(val) || 0;
    if (n < 0) return { error: "Element weight percent cannot be negative (" + k.toUpperCase() + ")." };
    vals[k] = n;
  }
  const ce = vals.c + vals.mn / 6 + (vals.cr + vals.mo + vals.v) / 5 + (vals.ni + vals.cu) / 15;
  const total = vals.c + vals.mn + vals.cr + vals.mo + vals.v + vals.ni + vals.cu;
  let band, band_label;
  if (total === 0) { band = "none"; band_label = "Enter a steel composition (all elements are zero)."; }
  else if (ce < 0.35) { band = "low"; band_label = "Readily weldable: low preheat risk."; }
  else if (ce <= 0.55) { band = "medium"; band_label = "Preheat generally advised."; }
  else { band = "high"; band_label = "High hardenability / hydrogen-cracking risk: preheat and a low-hydrogen process required."; }
  const notes = [];
  notes.push("IIW carbon equivalent CE = C + Mn/6 + (Cr + Mo + V)/5 + (Ni + Cu)/15 (the formula adopted in AWS D1.1). Bands: < 0.35 readily weldable; 0.35-0.55 preheat generally advised; > 0.55 high hardenability, preheat and low-hydrogen process required.");
  notes.push("This is a screen, not a welding procedure; the WPS, hydrogen level, restraint, and thickness govern the actual preheat (AWS D1.1 Annex).");
  return { carbon_equivalent: ce, band, band_label, notes };
}
export const carbonEquivalentExample = { inputs: { c: 0.25, mn: 0.8, cr: 0, mo: 0, v: 0, ni: 0, cu: 0 } };

function _v40renderCarbonEquivalent(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: The IIW carbon-equivalent formula CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15 as adopted in AWS D1.1 Structural Welding Code, by name; published formula. The output is a screening band, not a qualified welding procedure.";
  const c = makeNumber("Carbon C (wt %)", "ce-c", { step: "any", min: "0" });
  const mn = makeNumber("Manganese Mn (wt %)", "ce-mn", { step: "any", min: "0" });
  const cr = makeNumber("Chromium Cr (wt %)", "ce-cr", { step: "any", min: "0" });
  const mo = makeNumber("Molybdenum Mo (wt %)", "ce-mo", { step: "any", min: "0" });
  const v = makeNumber("Vanadium V (wt %)", "ce-v", { step: "any", min: "0" });
  const ni = makeNumber("Nickel Ni (wt %)", "ce-ni", { step: "any", min: "0" });
  const cu = makeNumber("Copper Cu (wt %)", "ce-cu", { step: "any", min: "0" });
  for (const f of [c, mn, cr, mo, v, ni, cu]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { c.input.value = "0.25"; mn.input.value = "0.8"; cr.input.value = ""; mo.input.value = ""; v.input.value = ""; ni.input.value = ""; cu.input.value = ""; update(); });
  const oCe = makeOutputLine(outputRegion, "Carbon equivalent (IIW)", "ce-out-ce");
  const oBand = makeOutputLine(outputRegion, "Weldability / preheat screen", "ce-out-band");
  const oNote = makeOutputLine(outputRegion, "Notes", "ce-out-note");
  const update = debounce(() => {
    const r = computeCarbonEquivalent({ c: _readNum(c.input), mn: _readNum(mn.input), cr: _readNum(cr.input), mo: _readNum(mo.input), v: _readNum(v.input), ni: _readNum(ni.input), cu: _readNum(cu.input) });
    if (r.error) { oCe.textContent = r.error; oBand.textContent = "-"; oNote.textContent = ""; return; }
    oCe.textContent = fmt(r.carbon_equivalent, 5);
    oBand.textContent = r.band_label;
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [c.input, mn.input, cr.input, mo.input, v.input, ni.input, cu.input]) f.addEventListener("input", update);
}
SHOP_RENDERERS["carbon-equivalent"] = _v40renderCarbonEquivalent;

// =====================================================================
// spec-v41 2.1 - tap-drill-size (Tap Drill for Percent Thread) - Group K
// 60-degree thread: % of full thread = 76.98 x (D_major - D_drill) x TPI,
// so the tap drill D_drill = D_major - % / (76.98 x TPI). Reports the
// theoretical drill diameter and the nearest 1/64 in fraction; the named
// letter / number drill is a chart lookup, given only as that fraction.
// =====================================================================

const _V41_TAP_K = 76.98; // 60-degree percent-of-thread constant (1 / 0.012990)

// dims: in { thread_standard: dimensionless, major_dia_in: L, tpi: T^-1, pitch_mm: L, thread_percent: dimensionless } out: { drill_dia_in: L, drill_dia_mm: L, nearest_64th_in: L, nearest_64th_percent: dimensionless }
export function computeTapDrillSize({ thread_standard = "inch", major_dia_in = 0, tpi = 0, pitch_mm = 0, thread_percent = 75 } = {}) {
  const _g = _finiteGuard({ major_dia_in, tpi, pitch_mm, thread_percent }); if (_g) return _g;
  const pct = Number(thread_percent) || 0;
  if (!(pct > 0) || pct > 100) return { error: "Target thread engagement must be between 0 and 100 percent." };
  const isMetric = String(thread_standard) === "metric";
  let D_major_in, P_in, n_tpi;
  if (isMetric) {
    const Dmm = Number(major_dia_in) || 0; // metric: the major-diameter field carries mm
    const pmm = Number(pitch_mm) || 0;
    if (!(Dmm > 0)) return { error: "Major diameter must be positive (mm)." };
    if (!(pmm > 0)) return { error: "Thread pitch must be positive (mm)." };
    D_major_in = Dmm / 25.4;
    P_in = pmm / 25.4;
    n_tpi = 1 / P_in;
  } else {
    D_major_in = Number(major_dia_in) || 0;
    const t = Number(tpi) || 0;
    if (!(D_major_in > 0)) return { error: "Major diameter must be positive (in)." };
    if (!(t > 0)) return { error: "Threads per inch (TPI) must be positive." };
    n_tpi = t;
    P_in = 1 / t;
  }
  const delta_in = pct / (_V41_TAP_K * n_tpi);
  const drill_dia_in = D_major_in - delta_in;
  if (!(drill_dia_in > 0)) return { error: "Computed drill diameter is not positive - lower the target thread percent or check the inputs." };
  // Nearest 1/64 in fraction (the named letter / number / fraction drill is a chart lookup).
  const nearest_64th_in = Math.round(drill_dia_in * 64) / 64;
  const nearest_64th_percent = _V41_TAP_K * (D_major_in - nearest_64th_in) * n_tpi;
  const notes = [];
  notes.push("For a 60-degree thread the percent of full thread = 76.98 x (D_major - D_drill) x TPI, so the tap drill D_drill = D_major - % / (76.98 x TPI). First-principles thread geometry (the 76.98 constant is 1 / 0.012990).");
  notes.push("The theoretical diameter is exact; the named letter / number / fraction drill is a chart lookup, so this gives only the nearest 1/64 in fraction and its resulting percent. Pick the closest drill you have at or just above the theoretical size - a larger drill lowers the thread percent and the tapping torque.");
  if (pct > 83) notes.push("Above ~83% thread the tapping torque climbs steeply and taps break for very little added strength; 65-75% is the usual target.");
  else if (pct < 50) notes.push("Below ~50% thread the joint loses significant holding strength.");
  return {
    thread_standard: isMetric ? "metric" : "inch",
    tpi_effective: n_tpi, pitch_in: P_in,
    major_dia_in: D_major_in, thread_percent: pct,
    drill_dia_in, drill_dia_mm: drill_dia_in * 25.4,
    nearest_64th_in, nearest_64th_mm: nearest_64th_in * 25.4, nearest_64th_percent,
    notes,
  };
}
export const tapDrillSizeExample = { inputs: { thread_standard: "inch", major_dia_in: 0.25, tpi: 20, pitch_mm: 0, thread_percent: 75 } };

function _v41renderTapDrillSize(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Tap drill for a target percent of full thread - % = 76.98 x (D_major - D_drill) x TPI for 60-degree threads, so D_drill = D_major - % / (76.98 x TPI) - first-principles thread geometry as in Machinery's Handbook (Industrial Press), by name; public domain. The named letter / number drill is a chart lookup; this reports the nearest 1/64 in fraction.";
  const std = makeSelect("Thread standard", "tds-std", [
    { value: "inch", label: "Inch (enter TPI; diameter in inches)" },
    { value: "metric", label: "Metric (enter pitch in mm; diameter in mm)" },
  ]);
  const dia = makeNumber("Major (nominal) diameter (in for inch, mm for metric)", "tds-dia", { step: "any", min: "0" });
  const tpi = makeNumber("Threads per inch (TPI, inch)", "tds-tpi", { step: "any", min: "0" });
  const pmm = makeNumber("Thread pitch (mm, metric)", "tds-pmm", { step: "any", min: "0" });
  const pct = makeNumber("Target thread engagement (%)", "tds-pct", { step: "any", min: "0", max: "100", value: "75" }); pct.input.value = "75";
  for (const f of [std, dia, tpi, pmm, pct]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { std.select.value = "inch"; dia.input.value = "0.25"; tpi.input.value = "20"; pmm.input.value = ""; pct.input.value = "75"; update(); });
  const oDrill = makeOutputLine(outputRegion, "Theoretical tap drill", "tds-out-drill");
  const oNear = makeOutputLine(outputRegion, "Nearest 1/64 in drill", "tds-out-near");
  const oNote = makeOutputLine(outputRegion, "Notes", "tds-out-note");
  const update = debounce(() => {
    const r = computeTapDrillSize({ thread_standard: std.select.value, major_dia_in: _readNum(dia.input), tpi: _readNum(tpi.input), pitch_mm: _readNum(pmm.input), thread_percent: _readNum(pct.input) });
    if (r.error) { oDrill.textContent = r.error; oNear.textContent = "-"; oNote.textContent = ""; return; }
    oDrill.textContent = fmt(r.drill_dia_in, 4) + " in (" + fmt(r.drill_dia_mm, 3) + " mm) for " + fmt(r.thread_percent, 1) + "% thread";
    oNear.textContent = fmt(r.nearest_64th_in, 4) + " in (" + fmt(r.nearest_64th_mm, 3) + " mm) = " + fmt(r.nearest_64th_percent, 1) + "% thread";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [dia.input, tpi.input, pmm.input, pct.input]) f.addEventListener("input", update);
  std.select.addEventListener("change", update);
}
SHOP_RENDERERS["tap-drill-size"] = _v41renderTapDrillSize;

// =====================================================================
// spec-v41 2.2 - rolled-blank (Rolled Plate Blank Length) - Group G
// Developed flat length to roll plate into a cylinder / ring, measured
// at the neutral axis: L = pi x D_neutral. With the neutral axis k x T
// from the inside face, D_neutral = OD - 2T(1-k) = ID + 2kT; the default
// k = 0.5 (mid-thickness) gives L = pi x (OD - T) = pi x (ID + T).
// =====================================================================

// dims: in { reference: dimensionless, diameter_in: L, thickness_in: L, k_factor: dimensionless } out: { neutral_dia_in: L, blank_length_in: L }
export function computeRolledBlank({ reference = "od", diameter_in = 0, thickness_in = 0, k_factor = 0.5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Dv = Number(diameter_in) || 0, T = Number(thickness_in) || 0;
  const k = Number(k_factor);
  if (!(Dv > 0)) return { error: "Diameter must be positive (in)." };
  if (!(T > 0)) return { error: "Plate thickness must be positive (in)." };
  if (!(k >= 0) || !(k <= 1)) return { error: "k-factor must be between 0 and 1." };
  const ref = String(reference);
  const neutral_dia_in = ref === "id" ? Dv + 2 * k * T : Dv - 2 * T * (1 - k);
  if (!(neutral_dia_in > 0)) return { error: "Neutral-axis diameter is not positive - check the diameter against the thickness." };
  const blank_length_in = Math.PI * neutral_dia_in;
  const notes = [];
  notes.push("Developed flat length to roll plate into a cylinder = pi x neutral-axis diameter. With the neutral axis k x T from the inside face, D_neutral = OD - 2T(1-k) = ID + 2kT; at the default k = 0.5 (mid-thickness) this is pi x (OD - T). First-principles arc-length geometry.");
  notes.push("k shifts the neutral axis: 0.5 is the mid-thickness default for gentle rolls; tighter rolls or heavier plate move it inward (k ~ 0.33-0.45). Add edge trim and any seam-weld gap allowance separately.");
  return { reference: ref, neutral_dia_in, k_factor: k, blank_length_in, blank_length_mm: blank_length_in * 25.4, notes };
}
export const rolledBlankExample = { inputs: { reference: "od", diameter_in: 12, thickness_in: 0.25, k_factor: 0.5 } };

function _v41renderRolledBlank(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Developed blank length to roll plate into a cylinder - L = pi x neutral-axis diameter, neutral axis at k x thickness from the inside (default k = 0.5 mid-thickness) - first-principles arc-length geometry as in Machinery's Handbook (Industrial Press), by name; public domain.";
  const ref = makeSelect("Diameter reference", "rb-ref", [
    { value: "od", label: "Outside diameter (OD)" },
    { value: "id", label: "Inside diameter (ID)" },
  ]);
  const dia = makeNumber("Diameter (in)", "rb-dia", { step: "any", min: "0" });
  const t = makeNumber("Plate thickness T (in)", "rb-t", { step: "any", min: "0" });
  const k = makeNumber("Neutral-axis k-factor (0-1)", "rb-k", { step: "any", min: "0", max: "1", value: "0.5" }); k.input.value = "0.5";
  for (const f of [ref, dia, t, k]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ref.select.value = "od"; dia.input.value = "12"; t.input.value = "0.25"; k.input.value = "0.5"; update(); });
  const oLen = makeOutputLine(outputRegion, "Developed blank length", "rb-out-len");
  const oDia = makeOutputLine(outputRegion, "Neutral-axis diameter", "rb-out-dia");
  const oNote = makeOutputLine(outputRegion, "Notes", "rb-out-note");
  const update = debounce(() => {
    const r = computeRolledBlank({ reference: ref.select.value, diameter_in: _readNum(dia.input), thickness_in: _readNum(t.input), k_factor: _readNum(k.input) });
    if (r.error) { oLen.textContent = r.error; oDia.textContent = "-"; oNote.textContent = ""; return; }
    oLen.textContent = fmt(r.blank_length_in, 4) + " in (" + fmt(r.blank_length_mm, 2) + " mm)";
    oDia.textContent = fmt(r.neutral_dia_in, 4) + " in (k = " + fmt(r.k_factor, 3) + ")";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [dia.input, t.input, k.input]) f.addEventListener("input", update);
  ref.select.addEventListener("change", update);
}
SHOP_RENDERERS["rolled-blank"] = _v41renderRolledBlank;

// =====================================================================
// spec-v54 - compound-miter (Compound Miter / Crown Molding) - Group E
// Crown molding cut flat on the saw needs two saw settings, not one.
// First-principles trigonometry of a profile sprung at angle S meeting a
// wall corner of angle C: miter (table) = atan(tan(C/2) x sin(S)) and
// bevel (blade tilt) = asin(cos(S) x cos(C/2)). Reproduces the standard
// published compound-miter chart to the digit (38 deg spring / 90 deg
// corner = 31.62 / 33.86; 45 / 90 = 35.26 / 30.00).
// =====================================================================

// dims: in { spring_angle_deg: dimensionless, corner_angle_deg: dimensionless } out: { miter_angle_deg: dimensionless, bevel_angle_deg: dimensionless, half_corner_deg: dimensionless }
export function computeCompoundMiter({ spring_angle_deg = 38, corner_angle_deg = 90 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const S = Number(spring_angle_deg) || 0;
  const C = Number(corner_angle_deg) || 0;
  if (!(S > 0 && S < 90)) return { error: "Spring angle must be between 0 and 90 degrees (38 and 45 are the two common crown profiles)." };
  if (!(C > 0 && C < 180)) return { error: "Wall corner angle must be between 0 and 180 degrees (90 for a square corner)." };
  const Srad = (S * Math.PI) / 180, halfCrad = ((C / 2) * Math.PI) / 180;
  const miter_angle_deg = (Math.atan(Math.tan(halfCrad) * Math.sin(Srad)) * 180) / Math.PI;
  const bevel_angle_deg = (Math.asin(Math.cos(Srad) * Math.cos(halfCrad)) * 180) / Math.PI;
  const notes = [];
  notes.push("Set the saw to a " + fmt(miter_angle_deg, 2) + " degree miter (table swing) and a " + fmt(bevel_angle_deg, 2) + " degree bevel (blade tilt) to cut crown lying flat on the table. Spring angle " + fmt(S, 0) + " deg, wall corner " + fmt(C, 0) + " deg.");
  notes.push("These settings cut crown FLAT on the saw (the common shop method, not held to the fence). The two angle magnitudes are identical for an inside and an outside corner; only the workpiece orientation and which side is the keeper change. Cut a scrap test corner before the real stock.");
  return { miter_angle_deg, bevel_angle_deg, half_corner_deg: C / 2, notes };
}
export const compoundMiterExample = { inputs: { spring_angle_deg: 38, corner_angle_deg: 90 } };

function _renderCompoundMiter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Compound-miter geometry for crown molding cut flat on the saw - miter (table) = atan(tan(corner/2) x sin(spring)) and bevel (blade tilt) = asin(cos(spring) x cos(corner/2)) - first-principles trigonometry, public domain. Reproduces the standard published compound-miter chart (38 deg spring / 90 deg corner = 31.62 miter / 33.86 bevel; 45 / 90 = 35.26 / 30.00). Cut a scrap test corner first.";
  const spring = makeNumber("Spring angle (deg, 38 or 45)", "cm-spring", { step: "any", min: "0" });
  const corner = makeNumber("Wall corner angle (deg, 90 square)", "cm-corner", { step: "any", min: "0" });
  for (const f of [spring, corner]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { spring.input.value = "38"; corner.input.value = "90"; update(); });
  const oMiter = makeOutputLine(outputRegion, "Miter angle (saw table)", "cm-out-miter");
  const oBevel = makeOutputLine(outputRegion, "Bevel angle (blade tilt)", "cm-out-bevel");
  const oNote = makeOutputLine(outputRegion, "Notes", "cm-out-note");
  const update = debounce(() => {
    const r = computeCompoundMiter({ spring_angle_deg: _readNum(spring.input), corner_angle_deg: _readNum(corner.input) });
    if (r.error) { oMiter.textContent = r.error; oBevel.textContent = "-"; oNote.textContent = ""; return; }
    oMiter.textContent = fmt(r.miter_angle_deg, 2) + " deg";
    oBevel.textContent = fmt(r.bevel_angle_deg, 2) + " deg";
    oNote.textContent = r.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [spring.input, corner.input]) f.addEventListener("input", update);
}
SHOP_RENDERERS["compound-miter"] = _renderCompoundMiter;

// ===================== spec-v399..v400: fabrication shop-math (Group G) =====================

// dims: in { nominal_gap_in: L, tolerances: dimensionless } out: { tol_wc: L, tol_rss: L, n: dimensionless }
export function computeToleranceStackRss({ nominal_gap_in = 0, tolerances = "" } = {}) {
  const gap = Number(nominal_gap_in);
  if (!Number.isFinite(gap)) return { error: "Enter a valid nominal gap (in)." };
  let vals;
  if (Array.isArray(tolerances)) vals = tolerances.map(Number);
  else if (typeof tolerances === "string") vals = tolerances.split(/[\s,]+/).map((x) => x.trim()).filter((x) => x !== "").map(Number);
  else return { error: "Enter the tolerance half-widths." };
  if (!vals.length) return { error: "Enter at least one tolerance half-width." };
  for (const v of vals) {
    if (!Number.isFinite(v)) return { error: "All tolerances must be finite numbers." };
    if (v < 0) return { error: "Tolerances must be non-negative half-widths." };
  }
  const tol_wc = vals.reduce((a, b) => a + Math.abs(b), 0);
  const tol_rss = Math.sqrt(vals.reduce((a, b) => a + b * b, 0));
  return {
    tol_wc, tol_rss, n: vals.length,
    gap_wc_lo: gap - tol_wc, gap_wc_hi: gap + tol_wc,
    gap_rss_lo: gap - tol_rss, gap_rss_hi: gap + tol_rss,
    note: "Tolerance stack-up on a dimension chain: the worst-case tolerance is the arithmetic sum of the half-widths (every part at its extreme, a fit that is always met but often overbuilt), while the statistical RSS tolerance is the square root of the sum of squares (the realistic spread when the dimensions vary independently and are centered). RSS is always tighter than worst-case and the gap widens as the chain grows, which is why it is used for a multi-part assembly with capable processes. Assumes centered, independent, normally distributed dimensions. A design aid; the drawing tolerances and the assembly's criticality govern.",
  };
}
export const toleranceStackRssExample = { inputs: { nominal_gap_in: 0.020, tolerances: "0.005, 0.005, 0.005" } };
function _v399renderToleranceStackRss(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Tolerance stack-up (mechanical design / GD&T practice): worst-case tolerance = sum of the half-widths, RSS (statistical) tolerance = sqrt(sum of squares). RSS assumes centered, independent, normally distributed dimensions. A design aid; the drawing tolerances and the assembly's criticality govern.";
  const gap = makeNumber("Nominal (mean) gap (in)", "tsr-gap", { step: "any" });
  const tols = makeTextarea("Tolerance half-widths (in, comma or space separated)", "tsr-tols", { rows: "3" });
  tols.input.value = "0.005, 0.005, 0.005";
  for (const f of [gap, tols]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { gap.input.value = "0.020"; tols.input.value = "0.005, 0.005, 0.005"; update(); });
  const oWc = makeOutputLine(outputRegion, "Worst-case tolerance / fit", "tsr-out-wc");
  const oRss = makeOutputLine(outputRegion, "RSS tolerance / fit", "tsr-out-rss");
  const oNote = makeOutputLine(outputRegion, "Note", "tsr-out-n");
  const update = debounce(() => {
    const r = computeToleranceStackRss({ nominal_gap_in: Number(gap.input.value), tolerances: tols.input.value });
    if (r.error) { oWc.textContent = r.error; oRss.textContent = "-"; oNote.textContent = ""; return; }
    oWc.textContent = "+/-" + fmt(r.tol_wc, 4) + " in (" + fmt(r.gap_wc_lo, 4) + " to " + fmt(r.gap_wc_hi, 4) + " in, " + r.n + " dims)";
    oRss.textContent = "+/-" + fmt(r.tol_rss, 4) + " in (" + fmt(r.gap_rss_lo, 4) + " to " + fmt(r.gap_rss_hi, 4) + " in)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [gap, tols]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["tolerance-stack-rss"] = _v399renderToleranceStackRss;

// dims: in { base_radius_in: L, height_in: L } out: { slant_L_in: L, pattern_radius_in: L, sweep_deg: dimensionless }
export function computeConeFlatPattern({ base_radius_in = 0, height_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const r = Number(base_radius_in) || 0;
  const h = Number(height_in) || 0;
  if (!(r > 0)) return { error: "Base radius must be positive (in)." };
  if (!(h > 0)) return { error: "Height must be positive (in)." };
  const slant_L_in = Math.sqrt(r * r + h * h);
  const sweep_deg = 360 * r / slant_L_in;
  return {
    slant_L_in, pattern_radius_in: slant_L_in, sweep_deg,
    note: "Radial-line development of a right cone: the flat pattern is a pie sector of radius equal to the slant height L = sqrt(base_radius^2 + height^2) swept through an angle = 360 x base_radius / L. Lay out the sector, roll it to the slant, and the arc becomes the base circumference. A sharper (taller) cone has a longer slant and opens to a narrower sector. Add material for the seam/lap and bend allowance; this is the neutral-line pattern. A layout aid; verify against a test piece.",
  };
}
export const coneFlatPatternExample = { inputs: { base_radius_in: 6, height_in: 8 } };
function _v400renderConeFlatPattern(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Radial-line cone development (sheet-metal layout): slant height L = sqrt(r^2 + h^2), flat-pattern sector radius = L, sweep angle = 360 x r / L. Add seam/lap and bend allowance. A layout aid; verify against a test piece.";
  const r = makeNumber("Base radius (in)", "cfp-r", { step: "any", min: "0" });
  const h = makeNumber("Vertical height (in)", "cfp-h", { step: "any", min: "0" });
  for (const f of [r, h]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { r.input.value = "6"; h.input.value = "8"; update(); });
  const oL = makeOutputLine(outputRegion, "Slant height / pattern radius", "cfp-out-l");
  const oS = makeOutputLine(outputRegion, "Sector sweep angle", "cfp-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "cfp-out-n");
  const update = debounce(() => {
    const res = computeConeFlatPattern({ base_radius_in: Number(r.input.value) || 0, height_in: Number(h.input.value) || 0 });
    if (res.error) { oL.textContent = res.error; oS.textContent = "-"; oNote.textContent = ""; return; }
    oL.textContent = fmt(res.slant_L_in, 3) + " in";
    oS.textContent = fmt(res.sweep_deg, 1) + " deg";
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [r, h]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["cone-flat-pattern"] = _v400renderConeFlatPattern;

// spec-v1312: frustum (truncated cone) volume and surface. cone-flat-pattern develops the pattern but not the
// VOLUME of a hopper/bucket/tapered footing/transition. V = (pi h/12)(D^2 + D d + d^2); slant L = sqrt(h^2 +
// (R-r)^2); lateral area = pi(R+r)L. d = 0 gives a full cone; d = D a cylinder. Reported in ft^3, gal, yd^3.
// dims: in { large_diameter_ft: L, small_diameter_ft: L, height_ft: L } out: { volume_ft3: L^3, volume_gal: L^3, volume_yd3: L^3, slant_height_ft: L, lateral_area_ft2: L^2 }
export function computeFrustumVolume({ large_diameter_ft = 0, small_diameter_ft = 0, height_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D = Number(large_diameter_ft) || 0;
  const d = Number(small_diameter_ft) || 0;
  const h = Number(height_ft) || 0;
  if (!(D > 0)) return { error: "Large diameter must be positive (ft)." };
  if (d < 0) return { error: "Small diameter cannot be negative (ft)." };
  if (!(d <= D)) return { error: "Small diameter cannot exceed the large diameter (ft)." };
  if (!(h > 0)) return { error: "Height must be positive (ft)." };
  const volume_ft3 = (Math.PI * h * (D * D + D * d + d * d)) / 12;
  const volume_gal = volume_ft3 * 7.480519;
  const volume_yd3 = volume_ft3 / 27;
  const R = D / 2, r = d / 2;
  const slant_height_ft = Math.sqrt(h * h + (R - r) * (R - r));
  const lateral_area_ft2 = Math.PI * (R + r) * slant_height_ft;
  if (![volume_ft3, slant_height_ft, lateral_area_ft2].every(Number.isFinite) || !(volume_ft3 > 0)) return { error: "Frustum math is not a finite value; check the inputs." };
  return {
    volume_ft3, volume_gal, volume_yd3, slant_height_ft, lateral_area_ft2,
    note: "Volume, slant height, and lateral (side-only) surface of a right conical frustum - a truncated cone, the shape of a hopper, a bucket, a tapered footing or pier, a flat-topped stockpile, or a round-to-round transition. The volume is V = (pi h/12)(D^2 + D d + d^2) with the large and small diameters D and d and the height h; setting d = 0 gives a full cone (V = pi D^2 h/12) and d = D a cylinder. It is reported in cubic feet, US gallons, and cubic yards so it serves a liquid fill, a concrete pour, or a material takeoff. Note it is more than the average-diameter guess: the frustum formula, not the mean diameter, is the right one. The slant height is L = sqrt(h^2 + (R-r)^2) and the lateral area is pi(R+r)L (the sloped wall, no ends). The end-disk areas, wall thickness, an eccentric (offset) cone, and a pyramidal (flat-sided) hopper are separate. A takeoff aid; verify against the drawing.",
  };
}
export const frustumVolumeExample = { inputs: { large_diameter_ft: 6, small_diameter_ft: 2, height_ft: 4 } };
function _v1312renderFrustumVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: conical frustum volume V = (pi h/12)(D^2 + D d + d^2) with slant height sqrt(h^2 + (R-r)^2) and lateral surface pi(R+r)L (standard solid geometry; Machinery's Handbook). d = 0 gives a full cone. A takeoff aid; verify against the drawing.";
  const D = makeNumber("Large diameter D (ft)", "frv-d", { step: "any", min: "0" });
  const d = makeNumber("Small diameter d (ft, 0 = full cone)", "frv-sd", { step: "any", min: "0" });
  const h = makeNumber("Height h (ft)", "frv-h", { step: "any", min: "0" });
  for (const f of [D, d, h]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { D.input.value = "6"; d.input.value = "2"; h.input.value = "4"; update(); });
  const oV = makeOutputLine(outputRegion, "Volume", "frv-out-v");
  const oS = makeOutputLine(outputRegion, "Slant height / lateral area", "frv-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "frv-out-n");
  const update = debounce(() => {
    const res = computeFrustumVolume({ large_diameter_ft: Number(D.input.value) || 0, small_diameter_ft: Number(d.input.value) || 0, height_ft: Number(h.input.value) || 0 });
    if (res.error) { oV.textContent = res.error; oS.textContent = "-"; oNote.textContent = ""; return; }
    oV.textContent = fmt(res.volume_ft3, 2) + " ft^3 (" + fmt(res.volume_gal, 1) + " gal, " + fmt(res.volume_yd3, 3) + " yd^3)";
    oS.textContent = fmt(res.slant_height_ft, 3) + " ft slant, " + fmt(res.lateral_area_ft2, 2) + " ft^2 side";
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [D, d, h]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["frustum-volume"] = _v1312renderFrustumVolume;

// spec-v1313: regular polygon geometry. polygon-miter gives the cut angle and bolt-circle places holes, but not
// the apothem / across-flats / across-corners / area. apothem = s/(2 tan(pi/n)); circumradius = s/(2 sin(pi/n));
// area = n s^2/(4 tan(pi/n)); interior angle = (n-2)180/n. across-flats = 2 apothem, across-corners = 2 circumradius.
// dims: in { num_sides: dimensionless, side_length: L } out: { interior_angle_deg: dimensionless, apothem: L, circumradius: L, across_flats: L, across_corners: L, perimeter: L, area: L^2 }
export function computeRegularPolygon({ num_sides = 0, side_length = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const n = Number(num_sides) || 0;
  const s = Number(side_length) || 0;
  if (!(n >= 3)) return { error: "Number of sides must be at least 3." };
  if (!Number.isInteger(n)) return { error: "Number of sides must be a whole number." };
  if (!(s > 0)) return { error: "Side length must be positive." };
  const interior_angle_deg = ((n - 2) * 180) / n;
  const apothem = s / (2 * Math.tan(Math.PI / n));
  const circumradius = s / (2 * Math.sin(Math.PI / n));
  const across_flats = 2 * apothem;
  const across_corners = 2 * circumradius;
  const perimeter = n * s;
  const area = (n * s * s) / (4 * Math.tan(Math.PI / n));
  if (![interior_angle_deg, apothem, circumradius, area].every(Number.isFinite) || !(area > 0)) return { error: "Polygon math is not a finite value; check the inputs." };
  return {
    interior_angle_deg, apothem, circumradius, across_flats, across_corners, perimeter, area,
    note: "Geometry of a regular (equal-sided, equal-angled) convex polygon of n sides and side length s. The interior angle is (n-2)180/n; the apothem (center to the middle of a side, the inradius of the circle that just touches each side) is a = s/(2 tan(pi/n)); the circumradius (center to a corner) is R = s/(2 sin(pi/n)); the across-flats is 2a (the wrench size of a nut or the width of hex stock) and the across-corners is 2R (the diagonal); the perimeter is n s and the area is n s^2/(4 tan(pi/n)) = (1/2)(perimeter)(apothem). Use it to cut hex or octagon stock, lay out a polygonal frame or tank footprint, or check a wrench opening. Irregular polygons, the miter/bevel to cut it (polygon-miter), and a bolt pattern on it (bolt-circle) are separate. Plane figures only. A shop and layout aid; verify critical dimensions on the work.",
  };
}
export const regularPolygonExample = { inputs: { num_sides: 6, side_length: 2 } };
function _v1313renderRegularPolygon(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: regular-polygon geometry (standard plane geometry; Machinery's Handbook): apothem s/(2 tan(pi/n)), circumradius s/(2 sin(pi/n)), area n s^2/(4 tan(pi/n)), interior angle (n-2)180/n; across-flats = 2 apothem, across-corners = 2 circumradius. A shop and layout aid; verify critical dimensions on the work.";
  const n = makeNumber("Number of sides n", "rpg-n", { step: "1", min: "3" });
  const s = makeNumber("Side length s", "rpg-s", { step: "any", min: "0" });
  for (const f of [n, s]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { n.input.value = "6"; s.input.value = "2"; update(); });
  const oA = makeOutputLine(outputRegion, "Across flats / corners", "rpg-out-a");
  const oR = makeOutputLine(outputRegion, "Apothem / circumradius", "rpg-out-r");
  const oI = makeOutputLine(outputRegion, "Interior angle / area", "rpg-out-i");
  const oNote = makeOutputLine(outputRegion, "Note", "rpg-out-n");
  const update = debounce(() => {
    const res = computeRegularPolygon({ num_sides: Number(n.input.value) || 0, side_length: Number(s.input.value) || 0 });
    if (res.error) { oA.textContent = res.error; oR.textContent = "-"; oI.textContent = "-"; oNote.textContent = ""; return; }
    oA.textContent = fmt(res.across_flats, 4) + " across flats / " + fmt(res.across_corners, 4) + " across corners";
    oR.textContent = fmt(res.apothem, 4) + " apothem / " + fmt(res.circumradius, 4) + " circumradius (perimeter " + fmt(res.perimeter, 3) + ")";
    oI.textContent = fmt(res.interior_angle_deg, 2) + " deg interior, area " + fmt(res.area, 4) + " (square units)";
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [n, s]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["regular-polygon"] = _v1313renderRegularPolygon;

// spec-v1314: ellipse area and perimeter. No ellipse geometry in the catalog. area = pi a b (exact); the perimeter
// has no elementary closed form, so use Ramanujan's approximation pi[3(a+b) - sqrt((3a+b)(a+3b))]. a=major/2,
// b=minor/2. Equal axes collapse to a circle (pi r^2, 2 pi r).
// dims: in { major_axis: L, minor_axis: L } out: { area: L^2, perimeter: L, semi_major: L, semi_minor: L, eccentricity: dimensionless }
export function computeEllipseAreaPerimeter({ major_axis = 0, minor_axis = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const major = Number(major_axis) || 0;
  const minor = Number(minor_axis) || 0;
  if (!(major > 0)) return { error: "Major axis must be positive." };
  if (!(minor > 0)) return { error: "Minor axis must be positive." };
  const a = major / 2, b = minor / 2;
  const area = Math.PI * a * b;
  const perimeter = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  const semiMax = Math.max(a, b), semiMin = Math.min(a, b);
  const eccentricity = Math.sqrt(1 - (semiMin * semiMin) / (semiMax * semiMax));
  if (![area, perimeter, eccentricity].every(Number.isFinite) || !(area > 0)) return { error: "Ellipse math is not a finite value; check the inputs." };
  return {
    area, perimeter, semi_major: a, semi_minor: b, eccentricity,
    note: "Area and perimeter of an ellipse from the full major (long) and minor (short) axis lengths, with the semi-axes a = major/2 and b = minor/2. The area is exact, pi a b; the perimeter has no elementary closed form, so this uses Ramanujan's approximation pi[3(a+b) - sqrt((3a+b)(a+3b))], which is within a few parts per million for any ordinary oval. The eccentricity sqrt(1 - (b/a)^2) (with a the larger semi-axis) measures how far from round it is. When the two axes are equal the ellipse is a circle: the area becomes pi r^2 and the perimeter 2 pi r. Use it for an elliptical bed or border, a running-track lane, an oval tabletop or arch, or an elliptical head footprint. A partial (segment) area, an elliptical tank's partial-fill volume, and a true elliptic-integral perimeter are separate. Plane figure only. A shop and layout aid; verify critical dimensions on the work.",
  };
}
export const ellipseAreaPerimeterExample = { inputs: { major_axis: 10, minor_axis: 6 } };
function _v1314renderEllipseAreaPerimeter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ellipse area pi a b (exact) and Ramanujan's perimeter approximation pi[3(a+b) - sqrt((3a+b)(a+3b))] (standard geometry; Ramanujan 1914), a=major/2, b=minor/2. Equal axes give a circle. A shop and layout aid; verify critical dimensions on the work.";
  const M = makeNumber("Major axis (long width)", "elp-m", { step: "any", min: "0" });
  const m = makeNumber("Minor axis (short width)", "elp-n", { step: "any", min: "0" });
  for (const f of [M, m]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { M.input.value = "10"; m.input.value = "6"; update(); });
  const oA = makeOutputLine(outputRegion, "Area", "elp-out-a");
  const oP = makeOutputLine(outputRegion, "Perimeter (Ramanujan)", "elp-out-p");
  const oE = makeOutputLine(outputRegion, "Semi-axes / eccentricity", "elp-out-e");
  const oNote = makeOutputLine(outputRegion, "Note", "elp-out-n");
  const update = debounce(() => {
    const res = computeEllipseAreaPerimeter({ major_axis: Number(M.input.value) || 0, minor_axis: Number(m.input.value) || 0 });
    if (res.error) { oA.textContent = res.error; oP.textContent = "-"; oE.textContent = "-"; oNote.textContent = ""; return; }
    oA.textContent = fmt(res.area, 4) + " (square units)";
    oP.textContent = fmt(res.perimeter, 4);
    oE.textContent = "a = " + fmt(res.semi_major, 3) + ", b = " + fmt(res.semi_minor, 3) + ", e = " + fmt(res.eccentricity, 4) + (res.eccentricity < 1e-9 ? " (a circle)" : "");
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [M, m]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["ellipse-area-perimeter"] = _v1314renderEllipseAreaPerimeter;

// spec-v1315: spherical cap / dome / partial-fill volume. Catalog has cylinder/cone/frustum but no sphere.
// V_cap = (pi h^2/3)(3R - h) for a fill depth h up from the bottom; V_full = (4/3) pi R^3. h=R is a hemisphere,
// h=D the full sphere. Reported in ft^3 and gallons for a dipstick/takeoff of a spherical or dished tank/dome.
// dims: in { sphere_diameter_ft: L, fill_depth_ft: L } out: { cap_volume_ft3: L^3, cap_volume_gal: L^3, full_sphere_ft3: L^3, percent_full: dimensionless }
export function computeSphericalCapVolume({ sphere_diameter_ft = 0, fill_depth_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D = Number(sphere_diameter_ft) || 0;
  const h = Number(fill_depth_ft) || 0;
  if (!(D > 0)) return { error: "Sphere diameter must be positive (ft)." };
  if (!(h > 0)) return { error: "Fill depth must be positive (ft)." };
  if (!(h <= D)) return { error: "Fill depth cannot exceed the sphere diameter (ft)." };
  const R = D / 2;
  const cap_volume_ft3 = (Math.PI * h * h * (3 * R - h)) / 3;
  const cap_volume_gal = cap_volume_ft3 * 7.480519;
  const full_sphere_ft3 = (4 / 3) * Math.PI * R * R * R;
  const percent_full = (cap_volume_ft3 / full_sphere_ft3) * 100;
  if (![cap_volume_ft3, full_sphere_ft3, percent_full].every(Number.isFinite) || !(cap_volume_ft3 > 0)) return { error: "Spherical-cap math is not a finite value; check the inputs." };
  const is_hemisphere = Math.abs(h - R) < 1e-9;
  return {
    cap_volume_ft3, cap_volume_gal, full_sphere_ft3, percent_full, is_hemisphere,
    note: "Volume of a spherical cap - the partial fill of a spherical tank, the volume of a dome or a dished tank bottom, or a hemispherical vessel: V = (pi h^2/3)(3R - h) for a fill depth h measured from the bottom of the sphere up to the liquid line (or the height of a dome), with R = D/2. The full sphere is (4/3) pi R^3. At h = R the cap is a hemisphere (exactly half the sphere); at h = D it is the full sphere. A sphere is narrow near the bottom, so a shallow fill holds far less than a straight-sided estimate - 3 ft in a 10 ft sphere is 21.6% full, not 30% - which is why a spherical or dished-bottom tank needs this formula. Reported in cubic feet and US gallons for a dipstick or a takeoff. A spherical zone between two levels, an ellipsoidal (2:1) tank head, and the surface area are separate. A takeoff / dipstick aid; verify against the tank chart or drawing.",
  };
}
export const sphericalCapVolumeExample = { inputs: { sphere_diameter_ft: 10, fill_depth_ft: 3 } };
function _v1315renderSphericalCapVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: spherical cap volume V = (pi h^2/3)(3R - h) with the full sphere (4/3) pi R^3 (standard solid geometry; Machinery's Handbook). h = R is a hemisphere. A takeoff / dipstick aid; verify against the tank chart or drawing.";
  const D = makeNumber("Sphere diameter D (ft)", "scv-d", { step: "any", min: "0" });
  const h = makeNumber("Fill depth / cap height h (ft)", "scv-h", { step: "any", min: "0" });
  for (const f of [D, h]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { D.input.value = "10"; h.input.value = "3"; update(); });
  const oV = makeOutputLine(outputRegion, "Cap / fill volume", "scv-out-v");
  const oF = makeOutputLine(outputRegion, "Full sphere / percent full", "scv-out-f");
  const oNote = makeOutputLine(outputRegion, "Note", "scv-out-n");
  const update = debounce(() => {
    const res = computeSphericalCapVolume({ sphere_diameter_ft: Number(D.input.value) || 0, fill_depth_ft: Number(h.input.value) || 0 });
    if (res.error) { oV.textContent = res.error; oF.textContent = "-"; oNote.textContent = ""; return; }
    oV.textContent = fmt(res.cap_volume_ft3, 3) + " ft^3 (" + fmt(res.cap_volume_gal, 1) + " gal)" + (res.is_hemisphere ? " - a hemisphere" : "");
    oF.textContent = fmt(res.full_sphere_ft3, 3) + " ft^3 full, " + fmt(res.percent_full, 1) + "% full";
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [D, h]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["spherical-cap-volume"] = _v1315renderSphericalCapVolume;

// spec-v1316: parabolic segment area and arc length. circular-segment-area covers a circular arc; this is the
// PARABOLIC segment (arch, road crown, cable sag, reflector). area = (2/3) b h (Archimedes, 2/3 of the b*h box);
// exact arc = (1/2)sqrt(b^2+16h^2) + (b^2/(8h)) ln((4h+sqrt(b^2+16h^2))/b). Rise->0 gives the chord.
// dims: in { base_span: L, rise_height: L } out: { area: L^2, arc_length: L, chord: L }
export function computeParabolicSegment({ base_span = 0, rise_height = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const b = Number(base_span) || 0;
  const h = Number(rise_height) || 0;
  if (!(b > 0)) return { error: "Base (span) must be positive." };
  if (!(h > 0)) return { error: "Height (rise) must be positive." };
  const area = (2 / 3) * b * h;
  const root = Math.sqrt(b * b + 16 * h * h);
  const arc_length = 0.5 * root + (b * b / (8 * h)) * Math.log((4 * h + root) / b);
  if (![area, arc_length].every(Number.isFinite) || !(area > 0) || !(arc_length >= b - 1e-9)) return { error: "Parabolic-segment math is not a finite value; check the inputs." };
  return {
    area, arc_length, chord: b,
    note: "Area and arc length of a parabolic segment - a symmetric parabola of span (chord) b and rise h at midspan, the shape of a parabolic arch, a road or deck crown, the sag of a uniformly loaded cable, or a reflector cross-section. The area is exactly (2/3) b h, two-thirds of the b x h rectangle that boxes the segment (Archimedes' result), so it always beats the triangle (1/2) and loses to the rectangle. The arc length of the curved edge is (1/2) sqrt(b^2 + 16 h^2) + (b^2/(8h)) ln((4h + sqrt(b^2 + 16 h^2))/b); as the rise goes to zero it approaches the chord b. Use it to lay out the form, take off the sheathing, or cut the rib. A circular segment is the circular-segment-area tile; a true catenary (a hanging chain, slightly different from a parabola) and the volume of a parabolic dish are separate. Plane figure only. A shop and layout aid; verify critical dimensions on the work.",
  };
}
export const parabolicSegmentExample = { inputs: { base_span: 20, rise_height: 5 } };
function _v1316renderParabolicSegment(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: parabolic segment area (2/3) b h (Archimedes) and exact arc length (1/2)sqrt(b^2+16h^2) + (b^2/(8h)) ln((4h+sqrt(b^2+16h^2))/b) (standard geometry; Machinery's Handbook). A shop and layout aid; verify critical dimensions on the work.";
  const b = makeNumber("Base / span b", "pbs-b", { step: "any", min: "0" });
  const h = makeNumber("Rise / height h (at midspan)", "pbs-h", { step: "any", min: "0" });
  for (const f of [b, h]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { b.input.value = "20"; h.input.value = "5"; update(); });
  const oA = makeOutputLine(outputRegion, "Segment area", "pbs-out-a");
  const oL = makeOutputLine(outputRegion, "Curved arc length", "pbs-out-l");
  const oNote = makeOutputLine(outputRegion, "Note", "pbs-out-n");
  const update = debounce(() => {
    const res = computeParabolicSegment({ base_span: Number(b.input.value) || 0, rise_height: Number(h.input.value) || 0 });
    if (res.error) { oA.textContent = res.error; oL.textContent = "-"; oNote.textContent = ""; return; }
    oA.textContent = fmt(res.area, 4) + " (square units, = 2/3 of the b x h box)";
    oL.textContent = fmt(res.arc_length, 4) + " over a " + fmt(res.chord, 3) + " chord";
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [b, h]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["parabolic-segment"] = _v1316renderParabolicSegment;

// spec-v1317: truncated pyramid (rectangular frustum) volume. frustum-volume is the round cone; this is the
// rectangular case - a tapered concrete pier/footing pedestal or a rectangular hopper. Prismatoid formula
// V = (h/3)(A1 + A2 + sqrt(A1 A2)). Top 0x0 = full pyramid; equal top/bottom = a prism.
// dims: in { bottom_length_ft: L, bottom_width_ft: L, top_length_ft: L, top_width_ft: L, height_ft: L } out: { volume_ft3: L^3, volume_yd3: L^3, volume_gal: L^3 }
export function computePyramidFrustumVolume({ bottom_length_ft = 0, bottom_width_ft = 0, top_length_ft = 0, top_width_ft = 0, height_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Lb = Number(bottom_length_ft) || 0;
  const Wb = Number(bottom_width_ft) || 0;
  const Lt = Number(top_length_ft) || 0;
  const Wt = Number(top_width_ft) || 0;
  const h = Number(height_ft) || 0;
  if (!(Lb > 0)) return { error: "Bottom length must be positive (ft)." };
  if (!(Wb > 0)) return { error: "Bottom width must be positive (ft)." };
  if (Lt < 0) return { error: "Top length cannot be negative (ft)." };
  if (Wt < 0) return { error: "Top width cannot be negative (ft)." };
  if (!(Lt <= Lb)) return { error: "Top length cannot exceed the bottom length (ft)." };
  if (!(Wt <= Wb)) return { error: "Top width cannot exceed the bottom width (ft)." };
  if (!(h > 0)) return { error: "Height must be positive (ft)." };
  const A1 = Lb * Wb;
  const A2 = Lt * Wt;
  const volume_ft3 = (h / 3) * (A1 + A2 + Math.sqrt(A1 * A2));
  const volume_yd3 = volume_ft3 / 27;
  const volume_gal = volume_ft3 * 7.480519;
  if (![volume_ft3, volume_yd3].every(Number.isFinite) || !(volume_ft3 > 0)) return { error: "Truncated-pyramid math is not a finite value; check the inputs." };
  return {
    volume_ft3, volume_yd3, volume_gal, bottom_area_ft2: A1, top_area_ft2: A2,
    note: "Volume of a right truncated rectangular pyramid (a rectangular frustum) - the shape of a tapered concrete pier or spread-footing pedestal, a rectangular hopper or bin, or a round-to-rectangular transition's rectangular part - by the prismatoid formula V = (h/3)(A1 + A2 + sqrt(A1 A2)), with A1 the bottom area (Lb x Wb) and A2 the top area (Lt x Wt). The sqrt(A1 A2) middle term is what makes it exact: averaging the two areas or footprints understates the volume. A top of 0 x 0 gives a full pyramid (V = A1 h/3); equal top and bottom give a rectangular prism (A1 h). Reported in cubic feet, cubic yards, and gallons for a concrete pour or a material takeoff. The round (conical) frustum is the frustum-volume tile; an offset (oblique) pyramid, wall thickness, and surface area are separate. A takeoff aid; verify against the drawing.",
  };
}
export const pyramidFrustumVolumeExample = { inputs: { bottom_length_ft: 6, bottom_width_ft: 6, top_length_ft: 2, top_width_ft: 2, height_ft: 4 } };
function _v1317renderPyramidFrustumVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: truncated-pyramid (rectangular frustum) volume V = (h/3)(A1 + A2 + sqrt(A1 A2)) - the prismatoid formula (standard solid geometry; Machinery's Handbook). Top 0x0 gives a full pyramid. A takeoff aid; verify against the drawing.";
  const Lb = makeNumber("Bottom length (ft)", "pfv-lb", { step: "any", min: "0" });
  const Wb = makeNumber("Bottom width (ft)", "pfv-wb", { step: "any", min: "0" });
  const Lt = makeNumber("Top length (ft)", "pfv-lt", { step: "any", min: "0" });
  const Wt = makeNumber("Top width (ft)", "pfv-wt", { step: "any", min: "0" });
  const h = makeNumber("Height (ft)", "pfv-h", { step: "any", min: "0" });
  for (const f of [Lb, Wb, Lt, Wt, h]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { Lb.input.value = "6"; Wb.input.value = "6"; Lt.input.value = "2"; Wt.input.value = "2"; h.input.value = "4"; update(); });
  const oV = makeOutputLine(outputRegion, "Volume", "pfv-out-v");
  const oA = makeOutputLine(outputRegion, "Bottom / top area", "pfv-out-a");
  const oNote = makeOutputLine(outputRegion, "Note", "pfv-out-n");
  const update = debounce(() => {
    const res = computePyramidFrustumVolume({ bottom_length_ft: Number(Lb.input.value) || 0, bottom_width_ft: Number(Wb.input.value) || 0, top_length_ft: Number(Lt.input.value) || 0, top_width_ft: Number(Wt.input.value) || 0, height_ft: Number(h.input.value) || 0 });
    if (res.error) { oV.textContent = res.error; oA.textContent = "-"; oNote.textContent = ""; return; }
    oV.textContent = fmt(res.volume_ft3, 3) + " ft^3 (" + fmt(res.volume_yd3, 3) + " yd^3, " + fmt(res.volume_gal, 1) + " gal)";
    oA.textContent = fmt(res.bottom_area_ft2, 2) + " ft^2 bottom / " + fmt(res.top_area_ft2, 2) + " ft^2 top";
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [Lb, Wb, Lt, Wt, h]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["pyramid-frustum-volume"] = _v1317renderPyramidFrustumVolume;

// spec-v1318: torus (doughnut) volume and surface area. Catalog has cylinder/cone/frustum/pyramid/sphere but no
// torus - an O-ring, inner tube/float, doughnut tank, or coil of tubing. Pappus: V = 2 pi^2 R r^2, SA = 4 pi^2 R r,
// R = Dc/2 (ring centerline radius), r = dt/2 (tube radius). Tube must be no fatter than the ring (dt <= Dc).
// dims: in { center_diameter_in: L, tube_diameter_in: L } out: { volume_in3: L^3, volume_ft3: L^3, volume_gal: L^3, surface_area_in2: L^2 }
export function computeTorusVolume({ center_diameter_in = 0, tube_diameter_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Dc = Number(center_diameter_in) || 0;
  const dt = Number(tube_diameter_in) || 0;
  if (!(Dc > 0)) return { error: "Ring centerline diameter must be positive (in)." };
  if (!(dt > 0)) return { error: "Tube diameter must be positive (in)." };
  if (!(dt <= Dc)) return { error: "Tube diameter cannot exceed the ring centerline diameter (the doughnut would close its hole)." };
  const R = Dc / 2, r = dt / 2;
  const volume_in3 = 2 * Math.PI * Math.PI * R * r * r;
  const volume_ft3 = volume_in3 / 1728;
  const volume_gal = volume_in3 / 231;
  const surface_area_in2 = 4 * Math.PI * Math.PI * R * r;
  if (![volume_in3, surface_area_in2].every(Number.isFinite) || !(volume_in3 > 0)) return { error: "Torus math is not a finite value; check the inputs." };
  return {
    volume_in3, volume_ft3, volume_gal, surface_area_in2,
    note: "Volume and surface area of a ring (doughnut) torus of circular cross-section - an O-ring, an inner tube or toroidal float, a doughnut-shaped tank, or a coil of tubing - by Pappus's theorem: V = 2 pi^2 R r^2 and surface area = 4 pi^2 R r, with the ring centerline radius R = Dc/2 (through the middle of the tube all the way around) and the tube radius r = dt/2. The volume is the tube cross-section pi r^2 swept around the ring path of circumference 2 pi R; the surface is the tube circumference 2 pi r swept the same way. The tube must be no fatter than the ring (dt <= Dc) or the doughnut closes its hole (a horn or spindle torus). Volume is reported in cubic inches, cubic feet, and US gallons. A partial fill of a toroidal tank, an elliptical or square tube cross-section, and wall thickness are separate. A takeoff aid; verify against the drawing.",
  };
}
export const torusVolumeExample = { inputs: { center_diameter_in: 12, tube_diameter_in: 2 } };
function _v1318renderTorusVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: torus volume V = 2 pi^2 R r^2 and surface area 4 pi^2 R r (Pappus's theorem; standard solid geometry; Machinery's Handbook), R = Dc/2 (ring centerline radius), r = dt/2 (tube radius). A takeoff aid; verify against the drawing.";
  const Dc = makeNumber("Ring centerline diameter Dc (in)", "trv-dc", { step: "any", min: "0" });
  const dt = makeNumber("Tube diameter dt (in)", "trv-dt", { step: "any", min: "0" });
  for (const f of [Dc, dt]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { Dc.input.value = "12"; dt.input.value = "2"; update(); });
  const oV = makeOutputLine(outputRegion, "Volume", "trv-out-v");
  const oS = makeOutputLine(outputRegion, "Surface area", "trv-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "trv-out-n");
  const update = debounce(() => {
    const res = computeTorusVolume({ center_diameter_in: Number(Dc.input.value) || 0, tube_diameter_in: Number(dt.input.value) || 0 });
    if (res.error) { oV.textContent = res.error; oS.textContent = "-"; oNote.textContent = ""; return; }
    oV.textContent = fmt(res.volume_in3, 3) + " in^3 (" + fmt(res.volume_ft3, 4) + " ft^3, " + fmt(res.volume_gal, 3) + " gal)";
    oS.textContent = fmt(res.surface_area_in2, 2) + " in^2";
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [Dc, dt]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["torus-volume"] = _v1318renderTorusVolume;

// spec-v1319: ellipsoid volume. Catalog has a sphere but no general ellipsoid - an oval/oblong tank, a stretched
// dome, an ellipsoidal float. V = (4/3) pi a b c = pi L W H/6 (a,b,c the semi-axes). Half-ellipsoid = a dished
// head/dome. Equal axes collapse to a sphere.
// dims: in { length_ft: L, width_ft: L, height_ft: L } out: { volume_ft3: L^3, volume_gal: L^3, half_volume_ft3: L^3 }
export function computeEllipsoidVolume({ length_ft = 0, width_ft = 0, height_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L = Number(length_ft) || 0;
  const W = Number(width_ft) || 0;
  const H = Number(height_ft) || 0;
  if (!(L > 0)) return { error: "Length must be positive (ft)." };
  if (!(W > 0)) return { error: "Width must be positive (ft)." };
  if (!(H > 0)) return { error: "Height must be positive (ft)." };
  const volume_ft3 = (Math.PI * L * W * H) / 6;
  const volume_gal = volume_ft3 * 7.480519;
  const half_volume_ft3 = volume_ft3 / 2;
  if (![volume_ft3, half_volume_ft3].every(Number.isFinite) || !(volume_ft3 > 0)) return { error: "Ellipsoid math is not a finite value; check the inputs." };
  const is_sphere = Math.abs(L - W) < 1e-9 && Math.abs(W - H) < 1e-9;
  return {
    volume_ft3, volume_gal, half_volume_ft3, is_sphere,
    note: "Volume of an ellipsoid - the oblong, egg-like solid of an oval or elliptical tank, a stretched dome, or an ellipsoidal float - V = (4/3) pi a b c = pi L W H/6, with the three semi-axes a = L/2, b = W/2, c = H/2 from the full axis lengths L (long), W (wide), and H (tall). When the three axes are equal it becomes a sphere, (4/3) pi r^3. The half-ellipsoid, V/2, is the shape of a 2:1 dished tank head or an oval dome, so the tile reports it too. Volume is reported in cubic feet and US gallons for a takeoff or a fill. A partial fill to a depth, the surface area (no elementary closed form), and an offset or truncated ellipsoid are separate. A takeoff aid; verify against the drawing.",
  };
}
export const ellipsoidVolumeExample = { inputs: { length_ft: 10, width_ft: 6, height_ft: 4 } };
function _v1319renderEllipsoidVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ellipsoid volume V = (4/3) pi a b c = pi L W H/6 (standard solid geometry; Machinery's Handbook), a,b,c the semi-axes. Equal axes give a sphere; half is a dished head/dome. A takeoff aid; verify against the drawing.";
  const L = makeNumber("Length L (ft)", "elv-l", { step: "any", min: "0" });
  const W = makeNumber("Width W (ft)", "elv-w", { step: "any", min: "0" });
  const H = makeNumber("Height H (ft)", "elv-h", { step: "any", min: "0" });
  for (const f of [L, W, H]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { L.input.value = "10"; W.input.value = "6"; H.input.value = "4"; update(); });
  const oV = makeOutputLine(outputRegion, "Ellipsoid volume", "elv-out-v");
  const oH = makeOutputLine(outputRegion, "Half-ellipsoid (dome / head)", "elv-out-h");
  const oNote = makeOutputLine(outputRegion, "Note", "elv-out-n");
  const update = debounce(() => {
    const res = computeEllipsoidVolume({ length_ft: Number(L.input.value) || 0, width_ft: Number(W.input.value) || 0, height_ft: Number(H.input.value) || 0 });
    if (res.error) { oV.textContent = res.error; oH.textContent = "-"; oNote.textContent = ""; return; }
    oV.textContent = fmt(res.volume_ft3, 3) + " ft^3 (" + fmt(res.volume_gal, 1) + " gal)" + (res.is_sphere ? " - a sphere" : "");
    oH.textContent = fmt(res.half_volume_ft3, 3) + " ft^3";
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [L, W, H]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["ellipsoid-volume"] = _v1319renderEllipsoidVolume;

// spec-v1320: annulus (ring) area. Catalog has full-circle/ellipse/polygon area but no annulus - the metal
// cross-section of a pipe/tube, a washer/gasket/ring-flange face, or a circular border. ring = (pi/4)(D^2 - d^2).
// d = 0 gives a full circle. Also outer/bore areas and wall thickness.
// dims: in { outer_diameter: L, inner_diameter: L } out: { ring_area: L^2, outer_area: L^2, bore_area: L^2, wall_thickness: L }
export function computeAnnulusArea({ outer_diameter = 0, inner_diameter = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D = Number(outer_diameter) || 0;
  const d = Number(inner_diameter) || 0;
  if (!(D > 0)) return { error: "Outer diameter must be positive." };
  if (d < 0) return { error: "Inner diameter cannot be negative." };
  if (!(d < D)) return { error: "Inner diameter must be smaller than the outer diameter." };
  const outer_area = (Math.PI / 4) * D * D;
  const bore_area = (Math.PI / 4) * d * d;
  const ring_area = outer_area - bore_area;
  const wall_thickness = (D - d) / 2;
  if (![ring_area, outer_area, bore_area].every(Number.isFinite) || !(ring_area > 0)) return { error: "Annulus math is not a finite value; check the inputs." };
  return {
    ring_area, outer_area, bore_area, wall_thickness,
    note: "Area of a flat annulus (the ring between two concentric circles): ring = (pi/4)(D^2 - d^2) = pi(R^2 - r^2), the outer circle minus the hole. It is the metal cross-section of a pipe or tube (the number you multiply by the material density for weight per length, or by the allowable stress for tension capacity), the face area of a washer, gasket, or ring flange, and the area of a circular border or track. The bore area (pi/4) d^2 is the flow area, and the wall thickness is (D - d)/2. When d = 0 it is a full circle. An eccentric ring, a partial (sector) ring, and the volume of a tube (ring area x length) are separate. Plane figure only. A shop and layout aid; verify critical dimensions on the work.",
  };
}
export const annulusAreaExample = { inputs: { outer_diameter: 6.625, inner_diameter: 6.065 } };
function _v1320renderAnnulusArea(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: annulus (ring) area (pi/4)(D^2 - d^2) = pi(R^2 - r^2) (standard plane geometry; Machinery's Handbook). The ring is the metal in a tube wall, a washer, or a flange face; d = 0 gives a full circle. A shop and layout aid; verify critical dimensions on the work.";
  const D = makeNumber("Outer diameter D", "ana-d", { step: "any", min: "0" });
  const d = makeNumber("Inner (bore) diameter d", "ana-id", { step: "any", min: "0" });
  for (const f of [D, d]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { D.input.value = "6.625"; d.input.value = "6.065"; update(); });
  const oR = makeOutputLine(outputRegion, "Ring (annulus) area", "ana-out-r");
  const oB = makeOutputLine(outputRegion, "Outer / bore area", "ana-out-b");
  const oW = makeOutputLine(outputRegion, "Wall thickness", "ana-out-w");
  const oNote = makeOutputLine(outputRegion, "Note", "ana-out-n");
  const update = debounce(() => {
    const res = computeAnnulusArea({ outer_diameter: Number(D.input.value) || 0, inner_diameter: Number(d.input.value) || 0 });
    if (res.error) { oR.textContent = res.error; oB.textContent = "-"; oW.textContent = "-"; oNote.textContent = ""; return; }
    oR.textContent = fmt(res.ring_area, 4) + " (square units)";
    oB.textContent = fmt(res.outer_area, 4) + " outer / " + fmt(res.bore_area, 4) + " bore (flow area)";
    oW.textContent = fmt(res.wall_thickness, 4);
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [D, d]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["annulus-area"] = _v1320renderAnnulusArea;

// spec-v1321: circular sector (pie slice) area and arc. circular-segment-area is the chord-and-arc region; this is
// the two-radii-and-arc sector. area = (1/2) r^2 theta = (angle/360) pi r^2; arc = r theta; chord = 2 r sin(theta/2).
// dims: in { radius: L, angle_deg: dimensionless } out: { area: L^2, arc_length: L, chord: L, perimeter: L }
export function computeCircularSector({ radius = 0, angle_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const r = Number(radius) || 0;
  const ang = Number(angle_deg);
  if (!(r > 0)) return { error: "Radius must be positive." };
  if (!(ang > 0 && ang <= 360)) return { error: "Central angle must be between 0 and 360 degrees." };
  const rad = (ang * Math.PI) / 180;
  const area = 0.5 * r * r * rad;
  const arc_length = r * rad;
  const chord = 2 * r * Math.sin(rad / 2);
  const perimeter = arc_length + 2 * r;
  if (![area, arc_length, chord, perimeter].every(Number.isFinite) || !(area > 0)) return { error: "Sector math is not a finite value; check the inputs." };
  return {
    area, arc_length, chord, perimeter,
    note: "Circular sector - the pie slice bounded by two radii and the arc, set by a radius r and a central angle. The area is (1/2) r^2 theta = (angle/360) pi r^2 and the arc length is r theta (theta in radians), so both scale straight with the fraction angle/360 of the whole circle; a full 360 degrees gives the circle (pi r^2, 2 pi r). The chord 2 r sin(theta/2) is the straight distance across the open mouth, and the perimeter is the arc plus the two radii. Use it for a curved patio or bed, a sprinkler coverage wedge, a gear or cam sector, or a fan of pavers. The segment (bounded by a chord and the arc) is the circular-segment-area tile; the volume of a cylindrical wedge is separate. Plane figure only. A shop and layout aid; verify critical dimensions on the work.",
  };
}
export const circularSectorExample = { inputs: { radius: 5, angle_deg: 60 } };
function _v1321renderCircularSector(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: circular sector area (1/2) r^2 theta = (angle/360) pi r^2 and arc length r theta, chord 2 r sin(theta/2) (standard plane geometry; Machinery's Handbook). The segment is a separate tile. A shop and layout aid; verify critical dimensions on the work.";
  const r = makeNumber("Radius r", "csec-r", { step: "any", min: "0" });
  const a = makeNumber("Central angle (deg)", "csec-a", { step: "any", min: "0" });
  for (const f of [r, a]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { r.input.value = "5"; a.input.value = "60"; update(); });
  const oA = makeOutputLine(outputRegion, "Sector area", "csec-out-a");
  const oL = makeOutputLine(outputRegion, "Arc length / chord", "csec-out-l");
  const oP = makeOutputLine(outputRegion, "Perimeter (arc + 2 radii)", "csec-out-p");
  const oNote = makeOutputLine(outputRegion, "Note", "csec-out-n");
  const update = debounce(() => {
    const res = computeCircularSector({ radius: Number(r.input.value) || 0, angle_deg: Number(a.input.value) || 0 });
    if (res.error) { oA.textContent = res.error; oL.textContent = "-"; oP.textContent = "-"; oNote.textContent = ""; return; }
    oA.textContent = fmt(res.area, 4) + " (square units)";
    oL.textContent = fmt(res.arc_length, 4) + " arc, " + fmt(res.chord, 4) + " chord";
    oP.textContent = fmt(res.perimeter, 4);
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [r, a]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["circular-sector"] = _v1321renderCircularSector;

// spec-v1322: partial volume of a HORIZONTAL cylindrical tank with DISHED heads - the head-type correction the
// flat-end tank-volume tile names but leaves out. The straight shell is the circular-segment prism (same as
// tank-volume); each dished head adds volume that back-to-back forms an ellipsoid of revolution, so its partial
// fill is an affine-scaled spherical cap: V_heads = (b/R)(pi h^2/3)(3R - h), where b is the head depth (R/2 for a
// 2:1 elliptical head, R for a hemispherical head). Full heads give (b/R)(4/3) pi R^3. Flat heads add nothing.
// dims: in { diameter_ft: L, shell_length_ft: L, fill_depth_ft: L } out: { volume_ft3: L^3, volume_gal: L^3, shell_volume_ft3: L^3, heads_volume_ft3: L^3, full_ft3: L^3, full_gal: L^3, percent_full: dimensionless }
export function computeTankVolumeDishedHeads({ diameter_ft = 0, shell_length_ft = 0, fill_depth_ft = 0, head_type = "elliptical" } = {}) {
  const _g = _finiteGuard({ diameter_ft, shell_length_ft, fill_depth_ft }); if (_g) return _g;
  const D = Number(diameter_ft) || 0;
  const L = Number(shell_length_ft) || 0;
  let h = Number(fill_depth_ft) || 0;
  if (!(D > 0)) return { error: "Tank diameter must be positive (ft)." };
  if (!(L > 0)) return { error: "Straight-shell length must be positive (ft)." };
  if (h < 0) return { error: "Liquid depth cannot be negative (ft)." };
  const ht = String(head_type) === "hemispherical" ? "hemispherical" : "elliptical";
  const k = ht === "hemispherical" ? 1 : 0.5; // head-depth ratio b/R: hemispherical b=R, 2:1 elliptical b=R/2
  const R = D / 2;
  let clamped = false;
  if (h > D) { h = D; clamped = true; }
  // Straight shell: circular-segment cross-section swept along the length (same as the flat-end tank-volume tile).
  const seg = R * R * Math.acos((R - h) / R) - (R - h) * Math.sqrt(Math.max(0, 2 * R * h - h * h));
  const shell_volume_ft3 = seg * L;
  // Two dished heads = one ellipsoid of revolution; its partial fill is the spherical cap scaled by b/R.
  const heads_volume_ft3 = k * (Math.PI * h * h * (3 * R - h)) / 3;
  const volume_ft3 = shell_volume_ft3 + heads_volume_ft3;
  const full_ft3 = Math.PI * R * R * L + k * (4 / 3) * Math.PI * R * R * R;
  const GAL_PER_FT3 = 7.480519;
  const volume_gal = volume_ft3 * GAL_PER_FT3;
  const full_gal = full_ft3 * GAL_PER_FT3;
  const percent_full = full_ft3 > 0 ? (volume_ft3 / full_ft3) * 100 : 0;
  if (![volume_ft3, full_ft3, percent_full].every(Number.isFinite) || !(full_ft3 > 0)) return { error: "Tank math is not a finite value; check the inputs." };
  const notes = [];
  notes.push("Partial volume of a HORIZONTAL cylindrical tank with dished (curved) heads from a liquid depth (dipstick) reading - the head-type correction the flat-end tank-volume tile leaves out. The straight shell is the circular-segment prism, area = R^2 acos((R-h)/R) - (R-h) sqrt(2Rh-h^2) times the shell length L (the flat-end result). The two curved heads together form an ellipsoid of revolution, so their partial fill is the spherical cap scaled by the head depth: V_heads = (b/R)(pi h^2/3)(3R - h), with b = R/2 for a 2:1 elliptical (ASME F&D-like) head and b = R for a hemispherical head. Enter the STRAIGHT-shell length (seam to seam), not the overall length - the heads are added on. Reported in cubic feet and US gallons with the percent full.");
  notes.push(ht === "hemispherical"
    ? "Hemispherical heads (b = R): the two heads add a full sphere of volume, the most a pair of heads can hold."
    : "2:1 semi-elliptical heads (b = R/2): the two heads add half of a sphere's volume, the common ASME dished head.");
  if (clamped) notes.push("Depth exceeded the tank diameter; reporting the full tank.");
  notes.push("Flat heads add nothing (use the tank-volume tile). Use the actual inside dimensions; a torispherical (ASME F&D) head is slightly shallower than a true 2:1 ellipse, so this is a close estimate - the tank's strapping chart governs custody transfer. US gallons.");
  return {
    volume_ft3, volume_gal, shell_volume_ft3, heads_volume_ft3, full_ft3, full_gal, percent_full,
    head_type: ht, notes,
  };
}
export const tankVolumeDishedHeadsExample = { inputs: { diameter_ft: 8, shell_length_ft: 20, fill_depth_ft: 4, head_type: "elliptical" } };
function _v1322renderTankVolumeDishedHeads(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: horizontal-tank partial volume with dished heads - the straight shell is the circular-segment prism A = R^2 acos((R-h)/R) - (R-h) sqrt(2Rh-h^2) times length; the two heads form an ellipsoid, so their partial fill is the spherical cap (pi h^2/3)(3R-h) scaled by the head depth b/R (R/2 for a 2:1 elliptical head, R for a hemispherical). Standard tank-gauging geometry (Machinery's Handbook; API 2551 strapping practice), by name; public domain. A close estimate; the tank's strapping chart governs.";
  const head = makeSelect("Head type", "tvdh-head", [
    { value: "elliptical", label: "2:1 semi-elliptical (ASME dished)" },
    { value: "hemispherical", label: "Hemispherical" },
  ]);
  const D = makeNumber("Tank diameter D (ft)", "tvdh-d", { step: "any", min: "0" });
  const L = makeNumber("Straight-shell length L, seam to seam (ft)", "tvdh-l", { step: "any", min: "0" });
  const h = makeNumber("Liquid depth (dipstick, ft)", "tvdh-h", { step: "any", min: "0" });
  for (const f of [head, D, L, h]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { head.select.value = "elliptical"; D.input.value = "8"; L.input.value = "20"; h.input.value = "4"; update(); });
  const oV = makeOutputLine(outputRegion, "Liquid volume", "tvdh-out-v");
  const oP = makeOutputLine(outputRegion, "Percent full", "tvdh-out-p");
  const oS = makeOutputLine(outputRegion, "Shell / heads split", "tvdh-out-s");
  const oF = makeOutputLine(outputRegion, "Full tank", "tvdh-out-f");
  const oNote = makeOutputLine(outputRegion, "Notes", "tvdh-out-n");
  const update = debounce(() => {
    const res = computeTankVolumeDishedHeads({ diameter_ft: Number(D.input.value) || 0, shell_length_ft: Number(L.input.value) || 0, fill_depth_ft: Number(h.input.value) || 0, head_type: head.select.value });
    if (res.error) { oV.textContent = res.error; oP.textContent = "-"; oS.textContent = "-"; oF.textContent = "-"; oNote.textContent = ""; return; }
    oV.textContent = fmt(res.volume_gal, 1) + " gal (" + fmt(res.volume_ft3, 2) + " ft^3)";
    oP.textContent = fmt(res.percent_full, 1) + "%";
    oS.textContent = fmt(res.shell_volume_ft3, 2) + " ft^3 shell + " + fmt(res.heads_volume_ft3, 2) + " ft^3 heads";
    oF.textContent = fmt(res.full_gal, 1) + " gal (" + fmt(res.full_ft3, 2) + " ft^3)";
    oNote.textContent = res.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [D, L, h]) f.input.addEventListener("input", update);
  head.select.addEventListener("change", update);
}
SHOP_RENDERERS["tank-volume-dished-heads"] = _v1322renderTankVolumeDishedHeads;

// spec-v1323: spherical zone (segment of two bases) volume - the slice of a sphere between two parallel planes, the
// gap the spherical-cap note flags ("a spherical zone between two levels ... are separate"). By the prismatoid rule
// V = (pi h/6)(3 r1^2 + 3 r2^2 + h^2), with r1, r2 the two circular face radii and h the perpendicular distance
// between them - needs no sphere radius. When the top base r2 = 0 it is the spherical cap.
// dims: in { base_radius_1_ft: L, base_radius_2_ft: L, zone_height_ft: L } out: { volume_ft3: L^3, volume_gal: L^3 }
export function computeSphericalZoneVolume({ base_radius_1_ft = 0, base_radius_2_ft = 0, zone_height_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const r1 = Number(base_radius_1_ft) || 0;
  const r2 = Number(base_radius_2_ft) || 0;
  const h = Number(zone_height_ft) || 0;
  if (r1 < 0 || r2 < 0) return { error: "Base radii cannot be negative (ft)." };
  if (!(h > 0)) return { error: "Zone height must be positive (ft)." };
  if (!(r1 > 0 || r2 > 0)) return { error: "At least one base radius must be positive (ft)." };
  const volume_ft3 = (Math.PI * h / 6) * (3 * r1 * r1 + 3 * r2 * r2 + h * h);
  const volume_gal = volume_ft3 * 7.480519;
  if (![volume_ft3, volume_gal].every(Number.isFinite) || !(volume_ft3 > 0)) return { error: "Spherical-zone math is not a finite value; check the inputs." };
  const is_cap = r1 === 0 || r2 === 0;
  return {
    volume_ft3, volume_gal, is_cap,
    note: "Volume of a spherical zone - the slice of a sphere between two parallel planes (a spherical segment of two bases), the band a spherical-cap alone cannot give: V = (pi h/6)(3 r1^2 + 3 r2^2 + h^2), with r1 and r2 the radii of the two flat circular faces and h the perpendicular distance between them. It is the prismatoid rule, so it needs only the two face radii and the height - not the parent sphere's radius. Use it for the liquid between two levels in a spherical tank (the incremental volume from one dipstick reading to the next), a barrel-shaped spherical band, or a dome zone. When one base is zero it collapses to the spherical cap (the spherical-cap-volume tile); a full sphere is the two-base zone with both faces at the equator taken as caps. Reported in cubic feet and US gallons. The lateral (zone) surface 2 pi R h needs the sphere radius and is separate, as is an ellipsoidal or off-axis zone. A takeoff aid; verify against the tank chart or drawing.",
  };
}
export const sphericalZoneVolumeExample = { inputs: { base_radius_1_ft: 4, base_radius_2_ft: 3, zone_height_ft: 2 } };
function _v1323renderSphericalZoneVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: spherical zone (segment of two bases) volume V = (pi h/6)(3 r1^2 + 3 r2^2 + h^2) by the prismatoid rule (standard solid geometry; Machinery's Handbook), r1/r2 the face radii and h the height between the planes; needs no sphere radius. One base zero gives the spherical cap. A takeoff aid; verify against the tank chart or drawing.";
  const r1 = makeNumber("Lower base radius r1 (ft)", "spz-r1", { step: "any", min: "0" });
  const r2 = makeNumber("Upper base radius r2 (ft)", "spz-r2", { step: "any", min: "0" });
  const h = makeNumber("Zone height h, between the planes (ft)", "spz-h", { step: "any", min: "0" });
  for (const f of [r1, r2, h]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { r1.input.value = "4"; r2.input.value = "3"; h.input.value = "2"; update(); });
  const oV = makeOutputLine(outputRegion, "Zone volume", "spz-out-v");
  const oNote = makeOutputLine(outputRegion, "Note", "spz-out-n");
  const update = debounce(() => {
    const res = computeSphericalZoneVolume({ base_radius_1_ft: Number(r1.input.value) || 0, base_radius_2_ft: Number(r2.input.value) || 0, zone_height_ft: Number(h.input.value) || 0 });
    if (res.error) { oV.textContent = res.error; oNote.textContent = ""; return; }
    oV.textContent = fmt(res.volume_ft3, 3) + " ft^3 (" + fmt(res.volume_gal, 1) + " gal)" + (res.is_cap ? " - a spherical cap (one base is zero)" : "");
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [r1, r2, h]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["spherical-zone-volume"] = _v1323renderSphericalZoneVolume;

// spec-v1324: oval (obround / stadium) tank partial volume from a dipstick depth - the iconic 275-gallon residential
// heating-oil tank, whose cross-section is a rectangle capped top and bottom by semicircles (r = W/2, straight run
// s = H - W). tank-volume does the round tank; nothing did the oval. Fill area is piecewise: a bottom circular
// segment up to r, then the semicircle plus a rectangle, then the full area minus the empty top segment. x length.
// dims: in { width_in: L, height_in: L, length_in: L, depth_in: L } out: { volume_gal: L^3, volume_in3: L^3, volume_ft3: L^3, full_gal: L^3, percent_full: dimensionless }
export function computeOvalTankVolume({ width_in = 0, height_in = 0, length_in = 0, depth_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const W = Number(width_in) || 0;
  const H = Number(height_in) || 0;
  const L = Number(length_in) || 0;
  let h = Number(depth_in) || 0;
  if (!(W > 0)) return { error: "Tank width (across the flats) must be positive (in)." };
  if (!(H > 0)) return { error: "Tank height must be positive (in)." };
  if (!(L > 0)) return { error: "Tank length must be positive (in)." };
  if (h < 0) return { error: "Liquid depth cannot be negative (in)." };
  if (H < W) return { error: "Height must be at least the width (the rounded ends are the top and bottom); for a wider-than-tall tank rotate the dimensions, and for a round tank use the tank-volume tile." };
  const r = W / 2;      // semicircle radius (rounded top and bottom)
  const s = H - W;      // straight middle run (H = 2r + s = W + s)
  let clamped = false;
  if (h > H) { h = H; clamped = true; }
  const seg = (t) => r * r * Math.acos((r - t) / r) - (r - t) * Math.sqrt(Math.max(0, 2 * r * t - t * t));
  const full_area = Math.PI * r * r + W * s;
  let area;
  if (h <= 0) area = 0;
  else if (h <= r) area = seg(h);                          // bottom rounded end: circular segment
  else if (h <= r + s) area = Math.PI * r * r / 2 + W * (h - r); // half-round + rectangle
  else area = full_area - seg(H - h);                       // full minus the empty top segment
  const volume_in3 = area * L;
  const full_in3 = full_area * L;
  const IN3_PER_GAL = 231, IN3_PER_FT3 = 1728;
  const percent_full = full_in3 > 0 ? (volume_in3 / full_in3) * 100 : 0;
  if (![volume_in3, full_in3, percent_full].every(Number.isFinite) || !(full_in3 > 0)) return { error: "Oval-tank math is not a finite value; check the inputs." };
  const notes = [];
  notes.push("Partial volume of a horizontal OVAL (obround) tank from a dipstick depth - the residential heating-oil tank whose ends are rounded top and bottom, the shape the round tank-volume tile does not cover. The cross-section is a rectangle of width W and straight height s = H - W capped by two semicircles of radius r = W/2, so the full area is pi r^2 + W s. Filling from the bottom the wetted area is a circular segment through the bottom rounded end (up to r), then the half-round plus a growing rectangle, then the full area minus the empty top segment; times the tank length gives the volume. A 27 in wide, 44 in tall, 60 in long tank holds 268 gallons full (the nominal '275'), and by symmetry the half-height mark is exactly half. Reported in gallons, cubic feet, and cubic inches with the percent full.");
  notes.push("Enter the inside width across the flats, the inside height (rounded top to bottom), the inside length, and the dipstick depth, all in inches. A vertical oval (rounded top and bottom); a round tank is the tank-volume tile. Flat heads assumed; the tank's own chart governs. US gallons (231 in^3).");
  if (clamped) notes.push("Depth exceeded the tank height; reporting the full tank.");
  return {
    volume_gal: volume_in3 / IN3_PER_GAL, volume_in3, volume_ft3: volume_in3 / IN3_PER_FT3,
    full_gal: full_in3 / IN3_PER_GAL, percent_full, notes,
  };
}
export const ovalTankVolumeExample = { inputs: { width_in: 27, height_in: 44, length_in: 60, depth_in: 22 } };
function _v1324renderOvalTankVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: horizontal oval (obround / stadium) tank partial volume - cross-section a rectangle capped by two semicircles (r = W/2, straight run s = H - W); the wetted area is a circular segment through the bottom end, then the half-round plus a rectangle, then the full area minus the empty top segment, times the length. First-principles plane/solid geometry (the circular-segment relation as in Machinery's Handbook), by name; public domain. A close estimate with flat ends; the tank's own chart governs.";
  const W = makeNumber("Width across the flats W (in)", "ovt-w", { step: "any", min: "0" });
  const H = makeNumber("Height, rounded top to bottom H (in)", "ovt-h", { step: "any", min: "0" });
  const L = makeNumber("Tank length L (in)", "ovt-l", { step: "any", min: "0" });
  const d = makeNumber("Liquid depth (dipstick, in)", "ovt-d", { step: "any", min: "0" });
  for (const f of [W, H, L, d]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { W.input.value = "27"; H.input.value = "44"; L.input.value = "60"; d.input.value = "22"; update(); });
  const oV = makeOutputLine(outputRegion, "Liquid volume", "ovt-out-v");
  const oP = makeOutputLine(outputRegion, "Percent full", "ovt-out-p");
  const oF = makeOutputLine(outputRegion, "Full tank", "ovt-out-f");
  const oNote = makeOutputLine(outputRegion, "Notes", "ovt-out-n");
  const update = debounce(() => {
    const res = computeOvalTankVolume({ width_in: Number(W.input.value) || 0, height_in: Number(H.input.value) || 0, length_in: Number(L.input.value) || 0, depth_in: Number(d.input.value) || 0 });
    if (res.error) { oV.textContent = res.error; oP.textContent = "-"; oF.textContent = "-"; oNote.textContent = ""; return; }
    oV.textContent = fmt(res.volume_gal, 1) + " gal (" + fmt(res.volume_ft3, 2) + " ft^3)";
    oP.textContent = fmt(res.percent_full, 1) + "%";
    oF.textContent = fmt(res.full_gal, 1) + " gal";
    oNote.textContent = res.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [W, H, L, d]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["oval-tank-volume"] = _v1324renderOvalTankVolume;

// spec-v1325: cone-bottom (conical-bottom) VERTICAL tank partial volume from the apex up - the poly/process/hopper
// tank tank-volume (flat-bottom cylinder) does not cover. Two regions from the bottom apex: a cone whose radius
// grows linearly r(h) = R h/Hc so V = (pi R^2/(3 Hc^2)) h^3 up to the cone height Hc, then the full cone plus a
// straight cylinder pi R^2 (h - Hc). The cone empties fast near the tip (h^3), the trap a straight-side guess misses.
// dims: in { diameter_ft: L, cone_height_ft: L, cylinder_height_ft: L, depth_ft: L } out: { volume_gal: L^3, volume_ft3: L^3, full_gal: L^3, full_ft3: L^3, percent_full: dimensionless }
export function computeConeBottomTankVolume({ diameter_ft = 0, cone_height_ft = 0, cylinder_height_ft = 0, depth_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D = Number(diameter_ft) || 0;
  const Hc = Number(cone_height_ft) || 0;
  const Hcyl = Number(cylinder_height_ft) || 0;
  let h = Number(depth_ft) || 0;
  if (!(D > 0)) return { error: "Tank diameter must be positive (ft)." };
  if (!(Hc > 0)) return { error: "Cone (bottom) height must be positive (ft)." };
  if (!(Hcyl > 0)) return { error: "Cylinder (straight side) height must be positive (ft)." };
  if (h < 0) return { error: "Liquid depth cannot be negative (ft)." };
  const R = D / 2;
  const total_height = Hc + Hcyl;
  let clamped = false;
  if (h > total_height) { h = total_height; clamped = true; }
  const cone_full = Math.PI * R * R * Hc / 3;
  let volume_ft3;
  if (h <= 0) volume_ft3 = 0;
  else if (h <= Hc) volume_ft3 = (Math.PI * R * R / (3 * Hc * Hc)) * h * h * h; // cone from the apex, r(h) = R h/Hc
  else volume_ft3 = cone_full + Math.PI * R * R * (h - Hc);                     // full cone + straight cylinder
  const full_ft3 = cone_full + Math.PI * R * R * Hcyl;
  const GAL_PER_FT3 = 7.480519;
  const percent_full = full_ft3 > 0 ? (volume_ft3 / full_ft3) * 100 : 0;
  if (![volume_ft3, full_ft3, percent_full].every(Number.isFinite) || !(full_ft3 > 0)) return { error: "Cone-bottom-tank math is not a finite value; check the inputs." };
  const in_cone = h > 0 && h <= Hc;
  const notes = [];
  notes.push("Partial volume of a VERTICAL cone-bottom (conical / hopper bottom) tank from a dipstick depth measured up from the bottom apex - the poly, process, or feed tank the flat-bottom tank-volume tile does not cover. Below the cone height Hc the liquid fills a cone whose radius grows with height, r(h) = R h/Hc, so the volume is (pi R^2/(3 Hc^2)) h^3 - it climbs slowly near the tip and fast near the top of the cone; above Hc it is the full cone (1/3) pi R^2 Hc plus a straight cylinder pi R^2 (h - Hc). Because the cone empties as the cube of the depth, a dipstick low in the cone reads far less than a straight-side guess. Reported in cubic feet and US gallons with the percent full.");
  notes.push(in_cone
    ? "The liquid level is within the conical bottom - the volume grows as h^3, so small stick changes near the tip are tiny volumes."
    : "The liquid level is up in the straight cylinder - each inch is a full pi R^2 slice.");
  notes.push("Enter the inside diameter, the cone (bottom) height, the straight-side (cylinder) height, and the depth from the apex, all in feet. A right cone concentric with the cylinder, apex down; a flat-bottom tank is the tank-volume tile. US gallons; the tank's own chart governs.");
  if (clamped) notes.push("Depth exceeded the tank height; reporting the full tank.");
  return {
    volume_gal: volume_ft3 * GAL_PER_FT3, volume_ft3,
    full_gal: full_ft3 * GAL_PER_FT3, full_ft3, percent_full, notes,
  };
}
export const coneBottomTankVolumeExample = { inputs: { diameter_ft: 6, cone_height_ft: 3, cylinder_height_ft: 8, depth_ft: 6 } };
function _v1325renderConeBottomTankVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: cone-bottom vertical tank partial volume - a cone from the apex, V = (pi R^2/(3 Hc^2)) h^3 up to the cone height, then the full cone (1/3) pi R^2 Hc plus a straight cylinder pi R^2 (h - Hc). First-principles solid geometry (cone + cylinder; Machinery's Handbook), by name; public domain. A dipstick / takeoff aid; the tank's own chart governs.";
  const D = makeNumber("Tank diameter D (ft)", "cbt-d", { step: "any", min: "0" });
  const Hc = makeNumber("Cone (bottom) height (ft)", "cbt-hc", { step: "any", min: "0" });
  const Hcyl = makeNumber("Cylinder (straight side) height (ft)", "cbt-hy", { step: "any", min: "0" });
  const d = makeNumber("Liquid depth from the apex (ft)", "cbt-dep", { step: "any", min: "0" });
  for (const f of [D, Hc, Hcyl, d]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { D.input.value = "6"; Hc.input.value = "3"; Hcyl.input.value = "8"; d.input.value = "6"; update(); });
  const oV = makeOutputLine(outputRegion, "Liquid volume", "cbt-out-v");
  const oP = makeOutputLine(outputRegion, "Percent full", "cbt-out-p");
  const oF = makeOutputLine(outputRegion, "Full tank", "cbt-out-f");
  const oNote = makeOutputLine(outputRegion, "Notes", "cbt-out-n");
  const update = debounce(() => {
    const res = computeConeBottomTankVolume({ diameter_ft: Number(D.input.value) || 0, cone_height_ft: Number(Hc.input.value) || 0, cylinder_height_ft: Number(Hcyl.input.value) || 0, depth_ft: Number(d.input.value) || 0 });
    if (res.error) { oV.textContent = res.error; oP.textContent = "-"; oF.textContent = "-"; oNote.textContent = ""; return; }
    oV.textContent = fmt(res.volume_gal, 1) + " gal (" + fmt(res.volume_ft3, 2) + " ft^3)";
    oP.textContent = fmt(res.percent_full, 1) + "%";
    oF.textContent = fmt(res.full_gal, 1) + " gal";
    oNote.textContent = res.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [D, Hc, Hcyl, d]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["cone-bottom-tank-volume"] = _v1325renderConeBottomTankVolume;

// spec-v1326: tapered (frustum) tank / bin partial volume from a level - a straight-tapered silo, hopper, or process
// tank whose diameter changes top to bottom, which frustum-volume gives only FULL. Radius grows linearly with
// height r(h) = R1 + (R2 - R1) h/H, and the liquid up to h is itself a frustum: V = (pi h/3)(R1^2 + R1 r(h) + r(h)^2).
// Handles a widening bin (R2>R1) or a narrowing hopper (R2<R1); equal diameters collapse to a cylinder.
// dims: in { bottom_diameter_ft: L, top_diameter_ft: L, height_ft: L, depth_ft: L } out: { volume_gal: L^3, volume_ft3: L^3, full_gal: L^3, full_ft3: L^3, percent_full: dimensionless }
export function computeTaperedTankVolume({ bottom_diameter_ft = 0, top_diameter_ft = 0, height_ft = 0, depth_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const D1 = Number(bottom_diameter_ft) || 0;
  const D2 = Number(top_diameter_ft) || 0;
  const H = Number(height_ft) || 0;
  let h = Number(depth_ft) || 0;
  if (!(D1 > 0)) return { error: "Bottom diameter must be positive (ft)." };
  if (!(D2 > 0)) return { error: "Top diameter must be positive (ft)." };
  if (!(H > 0)) return { error: "Tank height must be positive (ft)." };
  if (h < 0) return { error: "Liquid depth cannot be negative (ft)." };
  const R1 = D1 / 2, R2 = D2 / 2;
  let clamped = false;
  if (h > H) { h = H; clamped = true; }
  const rAt = (z) => R1 + (R2 - R1) * (z / H);
  const frustum = (z) => { const r = rAt(z); return Math.PI * z / 3 * (R1 * R1 + R1 * r + r * r); };
  const volume_ft3 = h <= 0 ? 0 : frustum(h);
  const full_ft3 = Math.PI * H / 3 * (R1 * R1 + R1 * R2 + R2 * R2);
  const GAL_PER_FT3 = 7.480519;
  const percent_full = full_ft3 > 0 ? (volume_ft3 / full_ft3) * 100 : 0;
  if (![volume_ft3, full_ft3, percent_full].every(Number.isFinite) || !(full_ft3 > 0)) return { error: "Tapered-tank math is not a finite value; check the inputs." };
  const r_at_level = rAt(Math.max(0, Math.min(h, H)));
  const widening = R2 > R1;
  const notes = [];
  notes.push("Partial volume of a straight-TAPERED (frustum) tank or bin from a dipstick depth - a tapered silo, a hopper, or a process tank whose diameter changes from bottom to top, the shape frustum-volume gives only when full. The radius grows linearly with height, r(h) = R1 + (R2 - R1) h/H, so the liquid up to depth h is itself a frustum, V = (pi h/3)(R1^2 + R1 r(h) + r(h)^2), with R1 = bottom radius and R2 = top radius. It handles a widening bin or a narrowing hopper; when the two diameters are equal it collapses to a straight cylinder. Reported in cubic feet and US gallons with the percent full.");
  notes.push(widening
    ? "Widening upward (R2 > R1): each higher inch adds more volume than the one below, so the gauge is non-linear - the top of the tank fills fastest."
    : (R2 < R1
      ? "Narrowing upward (R2 < R1, a hopper): each higher inch adds less than the one below, so the bottom fills fastest."
      : "Straight sides (equal diameters): a plain cylinder, each inch the same volume."));
  notes.push("Enter the inside bottom diameter, top diameter, height, and the depth from the bottom, all in feet. A right (concentric) frustum with flat top and bottom; a bottom cone under a cylinder is the cone-bottom-tank-volume tile. US gallons; the tank's own chart governs.");
  if (clamped) notes.push("Depth exceeded the tank height; reporting the full tank.");
  return {
    volume_gal: volume_ft3 * GAL_PER_FT3, volume_ft3,
    full_gal: full_ft3 * GAL_PER_FT3, full_ft3, percent_full, radius_at_level: r_at_level, notes,
  };
}
export const taperedTankVolumeExample = { inputs: { bottom_diameter_ft: 4, top_diameter_ft: 10, height_ft: 12, depth_ft: 6 } };
function _v1326renderTaperedTankVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: tapered (frustum) tank partial volume - the liquid up to depth h is a frustum, V = (pi h/3)(R1^2 + R1 r(h) + r(h)^2) with r(h) = R1 + (R2 - R1) h/H. First-principles solid geometry (frustum of a cone; Machinery's Handbook), by name; public domain. A dipstick / takeoff aid; the tank's own chart governs.";
  const D1 = makeNumber("Bottom diameter (ft)", "ttk-d1", { step: "any", min: "0" });
  const D2 = makeNumber("Top diameter (ft)", "ttk-d2", { step: "any", min: "0" });
  const H = makeNumber("Tank height (ft)", "ttk-h", { step: "any", min: "0" });
  const d = makeNumber("Liquid depth from the bottom (ft)", "ttk-dep", { step: "any", min: "0" });
  for (const f of [D1, D2, H, d]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { D1.input.value = "4"; D2.input.value = "10"; H.input.value = "12"; d.input.value = "6"; update(); });
  const oV = makeOutputLine(outputRegion, "Liquid volume", "ttk-out-v");
  const oP = makeOutputLine(outputRegion, "Percent full", "ttk-out-p");
  const oF = makeOutputLine(outputRegion, "Full tank", "ttk-out-f");
  const oNote = makeOutputLine(outputRegion, "Notes", "ttk-out-n");
  const update = debounce(() => {
    const res = computeTaperedTankVolume({ bottom_diameter_ft: Number(D1.input.value) || 0, top_diameter_ft: Number(D2.input.value) || 0, height_ft: Number(H.input.value) || 0, depth_ft: Number(d.input.value) || 0 });
    if (res.error) { oV.textContent = res.error; oP.textContent = "-"; oF.textContent = "-"; oNote.textContent = ""; return; }
    oV.textContent = fmt(res.volume_gal, 1) + " gal (" + fmt(res.volume_ft3, 2) + " ft^3)";
    oP.textContent = fmt(res.percent_full, 1) + "%";
    oF.textContent = fmt(res.full_gal, 1) + " gal";
    oNote.textContent = res.notes.join(" ");
  }, DEBOUNCE_MS);
  for (const f of [D1, D2, H, d]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["tapered-tank-volume"] = _v1326renderTaperedTankVolume;

// spec-v1329: paraboloid of revolution volume. The parabolic-segment tile is the PLANE figure and names "the volume
// of a parabolic dish" as separate; this is that solid of revolution - a spun-cast dish, a parabolic reflector blank,
// a dished/parabolic vessel bottom, or the free surface of a spinning liquid. Full V = (1/2) pi R^2 H, exactly half
// the enclosing cylinder. A parabola has z proportional to r^2, so filling apex-up the wetted radius grows as
// r(y) = R sqrt(y/H) and the volume as V(y) = pi R^2 y^2/(2H): it fills as the SQUARE of the depth (percent = (y/H)^2).
// dims: in { base_diameter_ft: L, height_ft: L, fill_depth_ft: L } out: { full_ft3: L^3, fill_ft3: L^3, percent_full: dimensionless }
export function computeParaboloidVolume({ base_diameter_ft = 0, height_ft = 0, fill_depth_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const GAL_PER_FT3 = 7.480519;
  const D = Number(base_diameter_ft) || 0;
  const H = Number(height_ft) || 0;
  let y = Number(fill_depth_ft) || 0;
  if (!(D > 0)) return { error: "Base diameter must be positive." };
  if (!(H > 0)) return { error: "Height (rim to apex) must be positive." };
  if (y < 0) return { error: "Fill depth cannot be negative." };
  const R = D / 2;
  const full_ft3 = 0.5 * Math.PI * R * R * H;
  const capped = Math.min(y, H);
  const fill_ft3 = Math.PI * R * R * capped * capped / (2 * H);
  const radius_at_level = R * Math.sqrt(capped / H);
  const percent_full = full_ft3 > 0 ? (fill_ft3 / full_ft3) * 100 : 0;
  if (![full_ft3, fill_ft3, radius_at_level].every(Number.isFinite) || !(full_ft3 > 0)) return { error: "Paraboloid math is not a finite value; check the inputs." };
  return {
    full_ft3, full_gal: full_ft3 * GAL_PER_FT3,
    fill_ft3, fill_gal: fill_ft3 * GAL_PER_FT3,
    radius_at_level, percent_full,
    note: "Volume of a paraboloid of revolution - the solid the parabolic-segment tile (a plane area) names as separate: a spun-cast dish or parabolic reflector blank, a dished or parabolic vessel bottom, or the paraboloid the free surface of a spinning liquid takes. The full volume is V = (1/2) pi R^2 H, EXACTLY half the cylinder of the same base and height that boxes it (halfway between the cone's 1/3 and the cylinder's 1). Because a parabola runs z proportional to r^2, filling from the apex the wetted radius grows as r(y) = R sqrt(y/H) and the liquid volume as V(y) = pi R^2 y^2/(2H) - it fills as the SQUARE of the depth, so a stick reading half the height holds only a quarter of the volume (percent full = (y/H)^2). A base diameter D = 4 ft, height H = 3 ft dish holds 18.85 ft^3 (141.0 gal) full, and 4.71 ft^3 (35.3 gal) at a 1.5 ft apex depth (25%). A circular dish (spherical cap) is the spherical-cap-volume tile; a cone is frustum-volume with a zero top; a torispherical (ASME F&D) head is vessel-head-volume. Solid of revolution about the axis; an off-axis or tilted paraboloid is separate. A shop and takeoff aid; verify critical dimensions on the work.",
  };
}
export const paraboloidVolumeExample = { inputs: { base_diameter_ft: 4, height_ft: 3, fill_depth_ft: 1.5 } };
function _v1329renderParaboloidVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: paraboloid of revolution volume V = (1/2) pi R^2 H (half the enclosing cylinder) and the apex-up partial fill V(y) = pi R^2 y^2/(2H) with r(y) = R sqrt(y/H). First-principles solid geometry (Pappus / integration; Machinery's Handbook), by name; public domain. A shop and takeoff aid; verify critical dimensions on the work.";
  const D = makeNumber("Base (rim) diameter (ft)", "pbv-d", { step: "any", min: "0" });
  const H = makeNumber("Height, rim to apex (ft)", "pbv-h", { step: "any", min: "0" });
  const y = makeNumber("Fill depth from the apex (ft, optional)", "pbv-y", { step: "any", min: "0" });
  for (const f of [D, H, y]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { D.input.value = "4"; H.input.value = "3"; y.input.value = "1.5"; update(); });
  const oV = makeOutputLine(outputRegion, "Full volume", "pbv-out-v");
  const oFill = makeOutputLine(outputRegion, "Fill volume / percent full", "pbv-out-fill");
  const oR = makeOutputLine(outputRegion, "Liquid-surface radius at that depth", "pbv-out-r");
  const oNote = makeOutputLine(outputRegion, "Note", "pbv-out-n");
  const update = debounce(() => {
    const res = computeParaboloidVolume({ base_diameter_ft: Number(D.input.value) || 0, height_ft: Number(H.input.value) || 0, fill_depth_ft: Number(y.input.value) || 0 });
    if (res.error) { oV.textContent = res.error; oFill.textContent = "-"; oR.textContent = "-"; oNote.textContent = ""; return; }
    oV.textContent = fmt(res.full_ft3, 3) + " ft^3 (" + fmt(res.full_gal, 1) + " gal)";
    oFill.textContent = fmt(res.fill_ft3, 3) + " ft^3 (" + fmt(res.fill_gal, 1) + " gal), " + fmt(res.percent_full, 1) + "% full";
    oR.textContent = fmt(res.radius_at_level, 3) + " ft";
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [D, H, y]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["paraboloid-volume"] = _v1329renderParaboloidVolume;

// spec-v1330: cylindrical wedge (ungula) volume. The circular-sector tile names "a cylindrical-wedge volume is
// separate"; this is that solid - a right circular cylinder sliced by a plane through a DIAMETER of the base, rising
// to a height H at the far side (base is a semicircle). By integrating the sloping top z = (H/R) y over the
// semicircle, V = (H/R) * (first moment 2R^3/3) = (2/3) R^2 H = D^2 H / 6. Uses: a mitered round pipe/duct end cut,
// the wedge of liquid in a tilted horizontal cylinder just touching the bottom at one end, a cam or bar-stock wedge.
// dims: in { base_diameter_ft: L, height_ft: L } out: { volume_ft3: L^3, volume_gal: L^3, base_area_ft2: L^2 }
export function computeCylindricalWedgeVolume({ base_diameter_ft = 0, height_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const GAL_PER_FT3 = 7.480519;
  const D = Number(base_diameter_ft) || 0;
  const H = Number(height_ft) || 0;
  if (!(D > 0)) return { error: "Base diameter must be positive." };
  if (!(H > 0)) return { error: "Height (rise at the far side) must be positive." };
  const R = D / 2;
  const volume_ft3 = (2 / 3) * R * R * H; // = D^2 H / 6
  const base_area_ft2 = 0.5 * Math.PI * R * R; // the semicircular base
  const cylinder_ft3 = Math.PI * R * R * H; // the full enclosing cylinder, for the fraction
  const percent_of_cylinder = cylinder_ft3 > 0 ? (volume_ft3 / cylinder_ft3) * 100 : 0;
  if (![volume_ft3, base_area_ft2].every(Number.isFinite) || !(volume_ft3 > 0)) return { error: "Cylindrical-wedge math is not a finite value; check the inputs." };
  return {
    volume_ft3, volume_gal: volume_ft3 * GAL_PER_FT3,
    base_area_ft2, percent_of_cylinder,
    note: "Volume of a cylindrical wedge (an ungula) - the solid the circular-sector tile names as separate: a right circular cylinder of diameter D sliced by a plane through a DIAMETER of the base, rising to a height H at the far side, so the base is a semicircle. The volume is a clean V = (2/3) R^2 H = D^2 H/6, with NO pi in it (the pi from the circular base cancels against the integral of the sloping top). A D = 4 ft, H = 3 ft wedge holds (2/3)(2^2)(3) = 8.00 ft^3 (59.8 gal), which is 2/(3 pi) = 21.2% of the 37.70 ft^3 cylinder that boxes it. Use it for a mitered round pipe or duct end cut, the wedge of liquid in a horizontal cylindrical tank tilted just until the liquid reaches the bottom at one end, a cam, or a bar-stock wedge. This is the through-the-diameter wedge; an oblique cut on a chord off-center, or one that clears the far wall (a full slanted cylinder), is separate. A shop and takeoff aid; verify critical dimensions on the work.",
  };
}
export const cylindricalWedgeVolumeExample = { inputs: { base_diameter_ft: 4, height_ft: 3 } };
function _v1330renderCylindricalWedgeVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: cylindrical wedge (ungula) volume V = (2/3) R^2 H = D^2 H/6 for a cylinder cut by a plane through a base diameter (base a semicircle, rise H at the far side). First-principles solid geometry (integration of the sloping top over the semicircle; Machinery's Handbook), by name; public domain. A shop and takeoff aid; verify critical dimensions on the work.";
  const D = makeNumber("Base (cylinder) diameter (ft)", "cwv-d", { step: "any", min: "0" });
  const H = makeNumber("Wedge height at the far side (ft)", "cwv-h", { step: "any", min: "0" });
  for (const f of [D, H]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { D.input.value = "4"; H.input.value = "3"; update(); });
  const oV = makeOutputLine(outputRegion, "Wedge volume", "cwv-out-v");
  const oB = makeOutputLine(outputRegion, "Semicircular base area / percent of the full cylinder", "cwv-out-b");
  const oNote = makeOutputLine(outputRegion, "Note", "cwv-out-n");
  const update = debounce(() => {
    const res = computeCylindricalWedgeVolume({ base_diameter_ft: Number(D.input.value) || 0, height_ft: Number(H.input.value) || 0 });
    if (res.error) { oV.textContent = res.error; oB.textContent = "-"; oNote.textContent = ""; return; }
    oV.textContent = fmt(res.volume_ft3, 3) + " ft^3 (" + fmt(res.volume_gal, 1) + " gal)";
    oB.textContent = fmt(res.base_area_ft2, 3) + " ft^2, " + fmt(res.percent_of_cylinder, 1) + "% of the enclosing cylinder";
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [D, H]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["cylindrical-wedge-volume"] = _v1330renderCylindricalWedgeVolume;

// spec-v1331: barrel / cask volume (bulged sides). The tank-volume family assumes STRAIGHT cylinder walls; a barrel,
// cask, bulged steel drum, or rain barrel swells to a larger middle (bung) diameter than its ends (heads). Two
// standard closed forms from the bung diameter D, head diameter d, and length L: parabolic staves (EXACT for a
// parabolic profile) V = (pi L/15)(2 D^2 + D d + (3/4) d^2), and circular-arc staves (Kepler's approximation)
// V = (pi L/12)(2 D^2 + d^2). Both collapse to the straight cylinder when D = d. Real barrels sit between the two,
// within ~0.5%. Inches in; gallons + ft^3 out.
// dims: in { bung_diameter_in: L, head_diameter_in: L, length_in: L } out: { parabolic_gal: L^3, circular_gal: L^3, parabolic_in3: L^3 }
export function computeBarrelVolume({ bung_diameter_in = 0, head_diameter_in = 0, length_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const IN3_PER_GAL = 231;
  const IN3_PER_FT3 = 1728;
  const D = Number(bung_diameter_in) || 0;
  const d = Number(head_diameter_in) || 0;
  const L = Number(length_in) || 0;
  if (!(D > 0)) return { error: "Bung (middle) diameter must be positive." };
  if (!(d > 0)) return { error: "Head (end) diameter must be positive." };
  if (!(L > 0)) return { error: "Length must be positive." };
  if (d > D) return { error: "Head diameter cannot exceed the bung (middle) diameter; a barrel bulges outward. Swap the values or use tapered-tank-volume for a frustum." };
  const parabolic_in3 = (Math.PI * L / 15) * (2 * D * D + D * d + 0.75 * d * d);
  const circular_in3 = (Math.PI * L / 12) * (2 * D * D + d * d);
  if (![parabolic_in3, circular_in3].every(Number.isFinite) || !(parabolic_in3 > 0)) return { error: "Barrel math is not a finite value; check the inputs." };
  return {
    parabolic_in3, parabolic_gal: parabolic_in3 / IN3_PER_GAL, parabolic_ft3: parabolic_in3 / IN3_PER_FT3,
    circular_gal: circular_in3 / IN3_PER_GAL,
    note: "Volume of a barrel or cask - the bulged-side shape the straight-wall tank-volume tile cannot do: a barrel, cask, bulged steel drum, or rain barrel that swells to a larger middle (bung) diameter D than its ends (head diameter d) over a length L. Two standard closed forms: parabolic staves (EXACT if the profile is a parabola) V = (pi L/15)(2 D^2 + D d + 3/4 d^2), and circular-arc staves (Kepler's classic approximation) V = (pi L/12)(2 D^2 + d^2). A real barrel's staves sit between the two, so the pair brackets the true volume - here they differ by well under 1%. Both collapse exactly to the straight cylinder pi(D/2)^2 L when D = d, so a nearly straight drum reads like a cylinder. A D = 27 in bung, d = 24 in head, L = 36 in barrel holds 82.8 gal (parabolic) to 83.0 gal (circular). Enter inside dimensions in inches. The staved geometry is idealized; a strapping chart or a water fill governs custody. US gallons (231 in^3).",
  };
}
export const barrelVolumeExample = { inputs: { bung_diameter_in: 27, head_diameter_in: 24, length_in: 36 } };
function _v1331renderBarrelVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: barrel / cask volume - parabolic staves V = (pi L/15)(2D^2 + Dd + 3/4 d^2) and circular-arc staves (Kepler) V = (pi L/12)(2D^2 + d^2), from the bung (middle) diameter D, head (end) diameter d, and length L. Standard solid geometry (Machinery's Handbook; Kepler's barrel rule), by name; public domain. A takeoff aid; a strapping chart or water fill governs custody.";
  const D = makeNumber("Bung (middle) diameter (in)", "brl-d", { step: "any", min: "0" });
  const d = makeNumber("Head (end) diameter (in)", "brl-hd", { step: "any", min: "0" });
  const L = makeNumber("Length (in)", "brl-l", { step: "any", min: "0" });
  for (const f of [D, d, L]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { D.input.value = "27"; d.input.value = "24"; L.input.value = "36"; update(); });
  const oV = makeOutputLine(outputRegion, "Volume (parabolic staves, exact)", "brl-out-v");
  const oC = makeOutputLine(outputRegion, "Volume (circular-arc estimate)", "brl-out-c");
  const oNote = makeOutputLine(outputRegion, "Note", "brl-out-n");
  const update = debounce(() => {
    const res = computeBarrelVolume({ bung_diameter_in: Number(D.input.value) || 0, head_diameter_in: Number(d.input.value) || 0, length_in: Number(L.input.value) || 0 });
    if (res.error) { oV.textContent = res.error; oC.textContent = "-"; oNote.textContent = ""; return; }
    oV.textContent = fmt(res.parabolic_gal, 2) + " gal (" + fmt(res.parabolic_ft3, 3) + " ft^3, " + fmt(res.parabolic_in3, 0) + " in^3)";
    oC.textContent = fmt(res.circular_gal, 2) + " gal";
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [D, d, L]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["barrel-volume"] = _v1331renderBarrelVolume;

// ===================== spec-v511: interference press-fit pressure and holding force (Lame) =====================
// dims: in { shaft_dia_in: L, interference_in: L, hub_od_in: L, modulus_psi: M L^-1 T^-2, friction_coeff: dimensionless, engagement_in: L } out: { p_psi: M L^-1 T^-2, holding_lb: M L T^-2, hub_stress_psi: M L^-1 T^-2 }
export function computePressFitPressure({ shaft_dia_in = 0, interference_in = 0, hub_od_in = 0, modulus_psi = 30e6, friction_coeff = 0.12, engagement_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const d = Number(shaft_dia_in) || 0;
  const i = Number(interference_in) || 0;
  const dout = Number(hub_od_in) || 0;
  const e = Number(modulus_psi) || 0;
  const mu = Number(friction_coeff) || 0;
  const len = Number(engagement_in) || 0;
  if (!(d > 0)) return { error: "Shaft diameter must be positive (in)." };
  if (!(i > 0)) return { error: "Interference must be positive (in)." };
  if (!(e > 0)) return { error: "Elastic modulus must be positive (psi)." };
  if (!(len > 0)) return { error: "Engagement length must be positive (in)." };
  if (!(dout > d)) return { error: "Hub outer diameter must exceed the shaft diameter (in)." };
  if (mu < 0) return { error: "Friction coefficient cannot be negative." };
  const p_psi = (e * i / d) * (dout * dout - d * d) / (2 * dout * dout);
  const holding_lb = p_psi * Math.PI * d * len * mu;
  const hub_stress_psi = p_psi * (dout * dout + d * d) / (dout * dout - d * d);
  if (![p_psi, holding_lb, hub_stress_psi].every(Number.isFinite)) return { error: "Press-fit math is not a finite value." };
  return {
    p_psi, holding_lb, hub_stress_psi,
    note: "Lame interference-fit model (same-material solid shaft): the diametral interference produces a contact pressure p = (E x interference / D) x (Do^2 - D^2) / (2 Do^2), an axial holding force = p x pi x D x length x friction, and a tangential (hoop) stress at the hub bore = p x (Do^2 + D^2) / (Do^2 - D^2). A THIN hub (Do close to D) develops far less pressure for the same interference, so the holding force collapses as the hub thins. The same interference that holds the shaft also stresses the hub bore, and too much interference yields or bursts the hub -- the failure that turns a press job into scrap, so keep the bore stress below yield. The model assumes elastic same-material parts and a solid shaft; a hollow shaft or dissimilar metals change the coefficients. A design aid, not the engineer of record; the actual materials, surface finish, and assembly method govern.",
  };
}
export const pressFitPressureExample = { inputs: { shaft_dia_in: 2, interference_in: 0.002, hub_od_in: 4, modulus_psi: 30e6, friction_coeff: 0.12, engagement_in: 3 } };
function _v511renderPressFitPressure(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Lame interference-fit relations (Machinery's Handbook 'Forces and Fits'; Lame thick-cylinder equations, same-material solid shaft): p = (E x interference / D) x (Do^2 - D^2)/(2 Do^2); holding force = p x pi x D x length x friction; hub bore stress = p x (Do^2 + D^2)/(Do^2 - D^2). A design aid; the materials, surface finish, and assembly method govern.";
  const d = makeNumber("Interface diameter D (in)", "pfp-d", { step: "any", min: "0" });
  const i = makeNumber("Diametral interference (in)", "pfp-i", { step: "any", min: "0" });
  const dout = makeNumber("Hub outer diameter Do (in)", "pfp-do", { step: "any", min: "0" });
  const e = makeNumber("Elastic modulus E (psi, steel ~30e6)", "pfp-e", { step: "any", min: "0" });
  const mu = makeNumber("Friction coefficient (~0.12 dry steel)", "pfp-mu", { step: "any", min: "0" });
  const len = makeNumber("Engagement length L (in)", "pfp-l", { step: "any", min: "0" });
  for (const f of [d, i, dout, e, mu, len]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { d.input.value = "2"; i.input.value = "0.002"; dout.input.value = "4"; e.input.value = "30000000"; mu.input.value = "0.12"; len.input.value = "3"; update(); });
  const oP = makeOutputLine(outputRegion, "Contact pressure", "pfp-out-p");
  const oH = makeOutputLine(outputRegion, "Axial holding force", "pfp-out-h");
  const oS = makeOutputLine(outputRegion, "Hub bore (hoop) stress", "pfp-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "pfp-out-n");
  const update = debounce(() => {
    const r = computePressFitPressure({ shaft_dia_in: _readNum(d.input), interference_in: _readNum(i.input), hub_od_in: _readNum(dout.input), modulus_psi: _readNum(e.input), friction_coeff: _readNum(mu.input), engagement_in: _readNum(len.input) });
    if (r.error) { oP.textContent = r.error; oH.textContent = "-"; oS.textContent = "-"; oNote.textContent = ""; return; }
    oP.textContent = fmt(r.p_psi, 0) + " psi";
    oH.textContent = fmt(r.holding_lb, 0) + " lb";
    oS.textContent = fmt(r.hub_stress_psi, 0) + " psi (keep below hub yield)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [d, i, dout, e, mu, len]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["press-fit-pressure"] = _v511renderPressFitPressure;

// press-fit-interference-for-force: inverse of press-fit-pressure. The forward
// tile gives the holding force from an interference; the shop question is the
// inverse -- what interference produces a target holding force. The holding
// force = i x E x (Do^2 - D^2)/(2 Do^2) x pi x L x mu is linear in i (the
// interface diameter D cancels out of the ratio), so
// i = holding x 2 x Do^2 / (E x (Do^2 - D^2) x pi x L x mu). The resulting
// contact pressure and hub bore stress are reported so the burst risk is visible.
// dims: in { target_holding_lb: M L T^-2, shaft_dia_in: L, hub_od_in: L, modulus_psi: M L^-1 T^-2, friction_coeff: dimensionless, engagement_in: L, hub_yield_psi: M L^-1 T^-2 } out: { interference_in: L, p_psi: M L^-1 T^-2, hub_stress_psi: M L^-1 T^-2 }
export function computePressFitInterferenceForForce({ target_holding_lb = 0, shaft_dia_in = 0, hub_od_in = 0, modulus_psi = 30e6, friction_coeff = 0.12, engagement_in = 0, hub_yield_psi = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const hold = Number(target_holding_lb) || 0;
  const d = Number(shaft_dia_in) || 0;
  const dout = Number(hub_od_in) || 0;
  const e = Number(modulus_psi) || 0;
  const mu = Number(friction_coeff) || 0;
  const len = Number(engagement_in) || 0;
  const yld = Number(hub_yield_psi) || 0;
  if (!(hold > 0)) return { error: "Target holding force must be positive (lb)." };
  if (!(d > 0)) return { error: "Shaft diameter must be positive (in)." };
  if (!(e > 0)) return { error: "Elastic modulus must be positive (psi)." };
  if (!(len > 0)) return { error: "Engagement length must be positive (in)." };
  if (!(dout > d)) return { error: "Hub outer diameter must exceed the shaft diameter (in)." };
  if (!(mu > 0)) return { error: "Friction coefficient must be positive (a zero-friction fit holds nothing)." };
  const interference_in = hold * 2 * dout * dout / (e * (dout * dout - d * d) * Math.PI * len * mu);
  const p_psi = (e * interference_in / d) * (dout * dout - d * d) / (2 * dout * dout);
  const hub_stress_psi = p_psi * (dout * dout + d * d) / (dout * dout - d * d);
  if (![interference_in, p_psi, hub_stress_psi].every(Number.isFinite)) return { error: "Press-fit math is not a finite value." };
  const yield_flag = yld > 0 ? (hub_stress_psi > yld ? "EXCEEDS hub yield -- risk of bursting the hub" : "within hub yield") : null;
  return {
    interference_in, p_psi, hub_stress_psi, yield_flag,
    note: "Inverse Lame interference-fit model (same-material solid shaft): the target axial holding force is linear in the diametral interference, so i = holding x 2 Do^2 / (E x (Do^2 - D^2) x pi x L x mu) -- the interface diameter D cancels from the pressure/force ratio and appears only through (Do^2 - D^2) and Do. The contact pressure and hub bore (hoop) stress at that interference are reported: the same interference that reaches the holding force also stresses the hub bore, and too much interference yields or bursts the hub, so enter the hub yield to flag it and keep the bore stress below yield. A THIN hub (Do close to D) needs far more interference for the same force, which drives the bore stress up fast. The model assumes elastic same-material parts and a solid shaft; a hollow shaft or dissimilar metals change the coefficients. A design aid, not the engineer of record; the actual materials, surface finish, and assembly method govern.",
  };
}
export const pressFitInterferenceForForceExample = { inputs: { target_holding_lb: 25447, shaft_dia_in: 2, hub_od_in: 4, modulus_psi: 30e6, friction_coeff: 0.12, engagement_in: 3, hub_yield_psi: 0 } };
function _v728renderPressFitInterferenceForForce(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Lame interference-fit relations (Machinery's Handbook 'Forces and Fits'; Lame thick-cylinder equations, same-material solid shaft) solved for the interference: i = holding x 2 Do^2 / (E x (Do^2 - D^2) x pi x L x mu); contact pressure and hub bore stress reported at that interference. A design aid; the materials, surface finish, and assembly method govern.";
  const hold = makeNumber("Target holding force (lb)", "pfi-h", { step: "any", min: "0" });
  const d = makeNumber("Interface diameter D (in)", "pfi-d", { step: "any", min: "0" });
  const dout = makeNumber("Hub outer diameter Do (in)", "pfi-do", { step: "any", min: "0" });
  const e = makeNumber("Elastic modulus E (psi, steel ~30e6)", "pfi-e", { step: "any", min: "0" });
  const mu = makeNumber("Friction coefficient (~0.12 dry steel)", "pfi-mu", { step: "any", min: "0" });
  const len = makeNumber("Engagement length L (in)", "pfi-l", { step: "any", min: "0" });
  const yld = makeNumber("Hub yield strength (psi, optional flag)", "pfi-y", { step: "any", min: "0" });
  for (const f of [hold, d, dout, e, mu, len, yld]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { hold.input.value = "25447"; d.input.value = "2"; dout.input.value = "4"; e.input.value = "30000000"; mu.input.value = "0.12"; len.input.value = "3"; yld.input.value = ""; update(); });
  const oI = makeOutputLine(outputRegion, "Required interference", "pfi-out-i");
  const oP = makeOutputLine(outputRegion, "Resulting contact pressure", "pfi-out-p");
  const oS = makeOutputLine(outputRegion, "Resulting hub bore (hoop) stress", "pfi-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "pfi-out-n");
  const update = debounce(() => {
    const r = computePressFitInterferenceForForce({ target_holding_lb: _readNum(hold.input), shaft_dia_in: _readNum(d.input), hub_od_in: _readNum(dout.input), modulus_psi: _readNum(e.input), friction_coeff: _readNum(mu.input), engagement_in: _readNum(len.input), hub_yield_psi: _readNum(yld.input) });
    if (r.error) { oI.textContent = r.error; oP.textContent = "-"; oS.textContent = "-"; oNote.textContent = ""; return; }
    oI.textContent = fmt(r.interference_in, 4) + " in";
    oP.textContent = fmt(r.p_psi, 0) + " psi";
    oS.textContent = fmt(r.hub_stress_psi, 0) + " psi" + (r.yield_flag ? " (" + r.yield_flag + ")" : " (keep below hub yield)");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [hold, d, dout, e, mu, len, yld]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["press-fit-interference-for-force"] = _v728renderPressFitInterferenceForForce;

// ===================== spec-v512: roller chain length in pitches (ANSI B29.1) =====================
// dims: in { small_teeth_n1: dimensionless, large_teeth_n2: dimensionless, center_distance_in: L, pitch_in: L } out: { length_pitches: dimensionless, length_even: dimensionless, center_corrected_in: L }
export function computeRollerChainLength({ small_teeth_n1 = 0, large_teeth_n2 = 0, center_distance_in = 0, pitch_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const n1 = Number(small_teeth_n1) || 0;
  const n2 = Number(large_teeth_n2) || 0;
  const c = Number(center_distance_in) || 0;
  const p = Number(pitch_in) || 0;
  if (!(n1 >= 1)) return { error: "Small sprocket tooth count must be at least 1." };
  if (!(n2 >= 1)) return { error: "Large sprocket tooth count must be at least 1." };
  if (!(c > 0)) return { error: "Center distance must be positive (in)." };
  if (!(p > 0)) return { error: "Chain pitch must be positive (in)." };
  const cp = c / p;
  const k = Math.pow((n2 - n1) / (2 * Math.PI), 2);
  const length_pitches = 2 * cp + (n1 + n2) / 2 + k / cp;
  let length_even = Math.ceil(length_pitches);
  if (length_even % 2 !== 0) length_even += 1;
  const a = length_even - (n1 + n2) / 2;
  const center_corrected_in = (p / 4) * (a + Math.sqrt(Math.max(0, a * a - 8 * k)));
  if (![length_pitches, length_even, center_corrected_in].every(Number.isFinite)) return { error: "Chain-length math is not a finite value." };
  return {
    length_pitches, length_even, center_corrected_in,
    note: "ANSI B29.1 chain-length relation: L = 2(C/p) + (N1 + N2)/2 + ((N2 - N1)/(2 pi))^2 / (C/p), in pitches. The pitch count must come out EVEN, because an odd count forces a weaker offset (half) link -- so the length is rounded UP to the next even number. Because that round-up changed the length, the center distance must be RECOMPUTED so the assembled chain has correct sag: C = (p/4)[A + sqrt(A^2 - 8((N2 - N1)/(2 pi))^2)] with A = L_even - (N1 + N2)/2. That round-up-then-back-solve is the step people skip, ending with a chain too tight or too loose. The center distance should be at least about 30 pitches for good wrap. A design aid; the sprocket selection and take-up govern.",
  };
}
export const rollerChainLengthExample = { inputs: { small_teeth_n1: 17, large_teeth_n2: 51, center_distance_in: 30, pitch_in: 0.5 } };
function _v512renderRollerChainLength(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ANSI B29.1 roller-chain length: L = 2(C/p) + (N1+N2)/2 + ((N2-N1)/(2 pi))^2/(C/p) pitches, rounded UP to an even count (an odd count needs a weaker offset link), then the center distance recomputed C = (p/4)[A + sqrt(A^2 - 8((N2-N1)/(2 pi))^2)]. A design aid; the sprocket selection and take-up govern.";
  const n1 = makeNumber("Small sprocket teeth N1", "rcl-n1", { step: "1", min: "1" });
  const n2 = makeNumber("Large sprocket teeth N2", "rcl-n2", { step: "1", min: "1" });
  const c = makeNumber("Nominal center distance C (in)", "rcl-c", { step: "any", min: "0" });
  const p = makeNumber("Chain pitch p (in, #40 = 0.5)", "rcl-p", { step: "any", min: "0" });
  for (const f of [n1, n2, c, p]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { n1.input.value = "17"; n2.input.value = "51"; c.input.value = "30"; p.input.value = "0.5"; update(); });
  const oL = makeOutputLine(outputRegion, "Exact chain length", "rcl-out-l");
  const oLe = makeOutputLine(outputRegion, "Even count to order", "rcl-out-le");
  const oC = makeOutputLine(outputRegion, "Corrected center distance", "rcl-out-c");
  const oNote = makeOutputLine(outputRegion, "Note", "rcl-out-n");
  const update = debounce(() => {
    const r = computeRollerChainLength({ small_teeth_n1: _readNum(n1.input), large_teeth_n2: _readNum(n2.input), center_distance_in: _readNum(c.input), pitch_in: _readNum(p.input) });
    if (r.error) { oL.textContent = r.error; oLe.textContent = "-"; oC.textContent = "-"; oNote.textContent = ""; return; }
    oL.textContent = fmt(r.length_pitches, 2) + " pitches";
    oLe.textContent = r.length_even + " pitches (even)";
    oC.textContent = fmt(r.center_corrected_in, 2) + " in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [n1, n2, c, p]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["roller-chain-length"] = _v512renderRollerChainLength;

// ===================== spec-v801: sprocket pitch diameter (ANSI B29.1) =====================
// dims: in { chain_pitch_in: L, tooth_count_n: dimensionless } out: { pitch_diameter_in: L, outside_diameter_in: L }
export function computeSprocketPitchDiameter({ chain_pitch_in = 0, tooth_count_n = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const p = Number(chain_pitch_in) || 0;
  const n = Number(tooth_count_n) || 0;
  if (!(p > 0)) return { error: "Chain pitch must be positive (in)." };
  if (!Number.isInteger(n) || !(n >= 3)) return { error: "Tooth count must be a whole number of at least 3." };
  const half = Math.PI / n;
  const pitch_diameter_in = p / Math.sin(half);
  const outside_diameter_in = p * (0.6 + 1 / Math.tan(half));
  if (![pitch_diameter_in, outside_diameter_in].every(Number.isFinite)) return { error: "Sprocket geometry is not a finite value." };
  return {
    pitch_diameter_in, outside_diameter_in,
    note: "ANSI B29.1 sprocket geometry. The pitch diameter -- the diameter of the circle through the chain-pin centers when the chain wraps the sprocket -- is PD = p / sin(180 deg / N), for chain pitch p and tooth count N. The maximum outside (tip) diameter used to turn the blank is OD = p (0.6 + cot(180 deg / N)). Both grow with pitch and tooth count. It is the pitch diameter, not the OD, that sets the drive's speed ratio and center distance. A design aid; the manufacturer's tooth form and hub dimensions govern the sprocket you actually cut.",
  };
}
export const sprocketPitchDiameterExample = { inputs: { chain_pitch_in: 0.5, tooth_count_n: 17 } };
function _v801renderSprocketPitchDiameter(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ANSI B29.1 sprocket pitch diameter PD = p / sin(180 deg / N) and maximum outside diameter OD = p (0.6 + cot(180 deg / N)), for chain pitch p and tooth count N. A design aid; the manufacturer's tooth form and hub govern.";
  const p = makeNumber("Chain pitch p (in, #40 = 0.5)", "spd-p", { step: "any", min: "0" });
  const n = makeNumber("Sprocket teeth N", "spd-n", { step: "1", min: "3" });
  for (const f of [p, n]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { p.input.value = "0.5"; n.input.value = "17"; update(); });
  const oPd = makeOutputLine(outputRegion, "Pitch diameter", "spd-out-pd");
  const oOd = makeOutputLine(outputRegion, "Max outside (tip) diameter", "spd-out-od");
  const oNote = makeOutputLine(outputRegion, "Note", "spd-out-n");
  const update = debounce(() => {
    const r = computeSprocketPitchDiameter({ chain_pitch_in: _readNum(p.input), tooth_count_n: _readNum(n.input) });
    if (r.error) { oPd.textContent = r.error; oOd.textContent = "-"; oNote.textContent = ""; return; }
    oPd.textContent = fmt(r.pitch_diameter_in, 4) + " in";
    oOd.textContent = fmt(r.outside_diameter_in, 4) + " in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [p, n]) f.input.addEventListener("input", update);
}
SHOP_RENDERERS["sprocket-pitch-diameter"] = _v801renderSprocketPitchDiameter;

// --- spec-v1155: compressed gas cylinder storage separation (OSHA 1926.350) ---
// The rule everyone half-remembers as "20 feet" is actually an OR, and the alternative is
// usually the cheaper one: oxygen cylinders in storage separated from fuel-gas cylinders or
// combustible materials by a minimum of 20 ft OR by a noncombustible barrier at least 5 ft
// high with a fire-resistance rating of at least one-half hour. On a tight site 20 ft of
// clear floor is expensive and a 5 ft barrier is not, so knowing the alternative exists is
// worth more than knowing the distance.
// The barrier has THREE conditions - noncombustible, at least 5 ft high, and at least a
// half-hour rating - and a plywood sheet satisfies none of them while looking like a
// barrier. Two of the three are silent failures: nobody measures the rating.
// Note the separation applies to combustible MATERIALS too, especially oil or grease, not
// only to fuel-gas cylinders - so oxygen stored 20 ft from the acetylene but next to the
// parts washer has not solved anything.
// dims: in { separation_ft: L, barrier_present: dimensionless, barrier_height_ft: L, barrier_noncombustible: dimensionless, barrier_rating_hr: T, cylinders_upright: dimensionless, valve_caps_secured: dimensionless } out: { required_separation_ft: L, separation_shortfall_ft: L, required_barrier_height_ft: L, required_rating_hr: T }
export function computeCylinderStorageSeparation({ separation_ft = 0, barrier_present = "no", barrier_height_ft = 0, barrier_noncombustible = "no", barrier_rating_hr = 0, cylinders_upright = "yes", valve_caps_secured = "yes" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const sep = Number(separation_ft) || 0;
  const bh = Number(barrier_height_ft) || 0;
  const br = Number(barrier_rating_hr) || 0;
  const hasBarrier = barrier_present === "yes";
  const nonComb = barrier_noncombustible === "yes";
  const upright = cylinders_upright === "yes";
  const caps = valve_caps_secured === "yes";
  if (sep < 0) return { error: "Separation distance cannot be negative (ft)." };
  if (bh < 0 || br < 0) return { error: "Barrier height and rating cannot be negative." };
  if (hasBarrier && !(bh > 0)) return { error: "Enter the barrier height (ft) to test it against the 5 ft minimum." };

  const REQ_SEP = 20, REQ_H = 5, REQ_RATING = 0.5;
  const distance_ok = sep >= REQ_SEP;
  const separation_shortfall_ft = Math.max(0, REQ_SEP - sep);

  // The barrier route has THREE conditions and they all have to hold.
  const barrier_height_ok = hasBarrier ? bh >= REQ_H : null;
  const barrier_noncomb_ok = hasBarrier ? nonComb : null;
  const barrier_rating_ok = hasBarrier ? br >= REQ_RATING : null;
  const barrier_ok = hasBarrier ? (barrier_height_ok && barrier_noncomb_ok && barrier_rating_ok) : false;
  const barrier_failures = hasBarrier
    ? [barrier_noncomb_ok ? null : "not stated noncombustible", barrier_height_ok ? null : "under 5 ft", barrier_rating_ok ? null : "under a half-hour rating"].filter(Boolean)
    : [];

  const separation_satisfied = distance_ok || barrier_ok;
  const route = distance_ok && barrier_ok ? "both the 20 ft distance and a compliant barrier" : distance_ok ? "the 20 ft distance" : barrier_ok ? "a compliant barrier" : "neither";
  const passes = separation_satisfied && upright && caps;

  const note = "THE RULE IS AN OR, NOT A DISTANCE. Oxygen cylinders in storage shall be separated from fuel-gas cylinders OR COMBUSTIBLE MATERIALS - especially oil or grease - by a minimum of " + REQ_SEP + " ft, OR by a noncombustible barrier at least " + REQ_H + " ft high having a fire-resistance rating of at least one-half hour. On a tight site " + REQ_SEP + " ft of clear floor is expensive and a " + REQ_H + " ft barrier is not, so the alternative is usually the cheaper compliance path and is worth more than knowing the distance. "
    + "Distance here is " + sep + " ft: " + (distance_ok ? "satisfies the rule on its own. " : separation_shortfall_ft.toFixed(1) + " ft short of " + REQ_SEP + ". ")
    + (hasBarrier
      ? "The barrier route has THREE conditions and all must hold: noncombustible, at least " + REQ_H + " ft high, and at least a " + REQ_RATING + " hour fire-resistance rating. "
        + (barrier_ok ? "All three are satisfied, so the barrier carries it regardless of the distance. " : "This barrier fails on " + barrier_failures.join(" and ") + ". Two of the three are SILENT failures - a sheet of plywood is the right shape, stands the right height, and satisfies neither the noncombustible nor the rating condition, and nobody measures a rating on site. A barrier that looks like a barrier is not the test. ")
      : "No barrier entered, so the distance is the only route available here. ")
    + (separation_satisfied ? "Separation is satisfied by " + route + ". " : "SEPARATION IS NOT SATISFIED by either route. ")
    + "SCOPE OF THE SEPARATION, which is wider than people apply it: it runs to combustible MATERIALS, not only to fuel-gas cylinders. Oxygen stored " + REQ_SEP + " ft from the acetylene and hard against the parts washer, the oil drums, or a greasy rag bin has not solved the problem the rule exists for - oxygen enrichment makes ordinary combustibles behave in ways nobody is expecting. "
    + "HANDLING, checked here because they travel with the storage question: cylinders shall be secured in an UPRIGHT position at all times except, if necessary, for short periods while actually being hoisted or carried - " + (upright ? "stated as satisfied. " : "NOT satisfied, and a cylinder lying loose is the one that gets rolled into and has its valve struck. ")
    + "Valve protection caps shall be in place and secured - " + (caps ? "stated as satisfied. " : "NOT satisfied, and the cap is what stands between a knocked-over cylinder and a sheared valve. ")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: whether cylinders are in use rather than in storage, which changes what applies; the separate rules for acetylene cylinders stored valve-end up and for the waiting period after a cylinder has been on its side; regulator, hose, and torch condition; flashback arrestors and check valves; hoisting cylinders by their caps or with magnets and slings, which is prohibited; transport in enclosed vehicles; storage inside buildings and the quantity limits that come with it; and NFPA 55 or state rules, which are often stricter. A screen, not a gas-storage plan; 29 CFR 1926.350, the gas supplier, and the AHJ govern.";

  return { required_separation_ft: REQ_SEP, distance_ok, separation_shortfall_ft, has_barrier: hasBarrier, required_barrier_height_ft: REQ_H, required_rating_hr: REQ_RATING, barrier_height_ok, barrier_noncomb_ok, barrier_rating_ok, barrier_ok, barrier_failures, separation_satisfied, route, upright, caps, passes, note };
}

export const cylinderStorageSeparationExample = { inputs: { separation_ft: 8, barrier_present: "yes", barrier_height_ft: 4, barrier_noncombustible: "yes", barrier_rating_hr: 1, cylinders_upright: "yes", valve_caps_secured: "yes" } };

function _v1155renderCylinderStorageSeparation(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: OSHA 29 CFR 1926.350, a US federal regulation in the public domain. 'Oxygen cylinders in storage shall be separated from fuel-gas cylinders or combustible materials (especially oil or grease), a minimum distance of 20 feet (6.1 m) or by a noncombustible barrier at least 5 feet (1.5 m) high having a fire-resistance rating of at least one-half hour.' 'Compressed gas cylinders shall be secured in an upright position at all times except, if necessary, for short periods of time while cylinders are actually being hoisted or carried.' 'Valve protection caps shall be in place and secured.' Not checked: cylinders in use rather than in storage; acetylene-specific storage and the waiting period after a cylinder has been on its side; regulator, hose, and torch condition; flashback arrestors; prohibited hoisting methods; transport in enclosed vehicles; indoor storage quantity limits; or NFPA 55 and state rules, which are often stricter. A screen, not a gas-storage plan; 1926.350, the gas supplier, and the AHJ govern.";
  const sp = makeNumber("Distance between oxygen and fuel gas or combustibles (ft)", "css-sp", { step: "any", min: "0" });
  const bp = makeSelect("Barrier between them?", "css-bp", [{ value: "no", label: "No" }, { value: "yes", label: "Yes", selected: true }]);
  const bh = makeNumber("Barrier height (ft)", "css-bh", { step: "any", min: "0" });
  const bn = makeSelect("Barrier is noncombustible?", "css-bn", [{ value: "no", label: "No" }, { value: "yes", label: "Yes", selected: true }]);
  const br = makeNumber("Barrier fire-resistance rating (hours)", "css-br", { step: "any", min: "0" });
  const up = makeSelect("Cylinders secured upright?", "css-up", [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }]);
  const vc = makeSelect("Valve protection caps in place and secured?", "css-vc", [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }]);
  inputRegion.appendChild(sp.wrap); inputRegion.appendChild(bp.wrap); inputRegion.appendChild(bh.wrap);
  inputRegion.appendChild(bn.wrap); inputRegion.appendChild(br.wrap); inputRegion.appendChild(up.wrap); inputRegion.appendChild(vc.wrap);
  attachExampleButton(inputRegion, () => { sp.input.value = "8"; bp.select.value = "yes"; bh.input.value = "4"; bn.select.value = "yes"; br.input.value = "1"; up.select.value = "yes"; vc.select.value = "yes"; update(); });
  const oD = makeOutputLine(outputRegion, "Distance route (20 ft)", "css-out-d");
  const oB = makeOutputLine(outputRegion, "Barrier route (noncombustible, 5 ft, half-hour)", "css-out-b");
  const oS = makeOutputLine(outputRegion, "Separation satisfied?", "css-out-s");
  const oH = makeOutputLine(outputRegion, "Handling", "css-out-h");
  const oV = makeOutputLine(outputRegion, "Verdict", "css-out-v");
  const oN = makeOutputLine(outputRegion, "Note", "css-out-n");
  const update = debounce(() => {
    const r = computeCylinderStorageSeparation({ separation_ft: Number(sp.input.value) || 0, barrier_present: bp.select.value, barrier_height_ft: Number(bh.input.value) || 0, barrier_noncombustible: bn.select.value, barrier_rating_hr: Number(br.input.value) || 0, cylinders_upright: up.select.value, valve_caps_secured: vc.select.value });
    if (r.error) { oD.textContent = r.error; oB.textContent = "-"; oS.textContent = "-"; oH.textContent = "-"; oV.textContent = "-"; oN.textContent = "-"; return; }
    oD.textContent = r.distance_ok ? "satisfied" : "short by " + fmt(r.separation_shortfall_ft, 1) + " ft";
    oB.textContent = !r.has_barrier ? "no barrier entered" : r.barrier_ok ? "all three conditions satisfied" : "FAILS: " + r.barrier_failures.join(", ");
    oS.textContent = r.separation_satisfied ? "yes, by " + r.route : "NO - neither route is met";
    oH.textContent = (r.upright ? "upright OK" : "NOT secured upright") + ", " + (r.caps ? "caps OK" : "caps NOT secured");
    oV.textContent = r.passes ? "PASSES the items entered" : "DOES NOT PASS";
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const x of [sp, bh, br]) x.input.addEventListener("input", update);
  for (const x of [bp, bn, up, vc]) x.select.addEventListener("change", update);
}
SHOP_RENDERERS["cylinder-storage-separation"] = _v1155renderCylinderStorageSeparation;

// ===========================================================================
// spec-v1406..v1409: the rotating-equipment and hydraulics band of the
// 2026-08-26 trade expansion. See specs/scope-trade-expansion.md.
// (The curtain wall mullion tile, v1411, lives in calc-construction.js.)
// ===========================================================================

// Compact renderer factory, copied from the sibling calc-firesprinkler.js
// factory (number and select inputs; same schema shape). Non-exported, so it
// adds no v14 derivation-corpus row.
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

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

// ===================== spec-v1406: permissible residual unbalance =====================
// dims: in { args: dimensionless } out: { omega_rad_s: T^-1, e_permissible: dimensionless, u_permissible: dimensionless, correction_mass_g: M }
export function computeRotorBalanceGrade({ balance_grade = 6.3, rpm = 0, rotor_mass_kg = 0, planes = 2, correction_radius_mm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(balance_grade > 0)) return { error: "Balance grade must be positive." };
  if (!(rpm > 0)) return { error: "Operating speed must be positive." };
  if (!(rotor_mass_kg > 0)) return { error: "Rotor mass must be positive." };
  if (!(planes >= 1)) return { error: "Correction planes must be at least 1." };
  if (!(correction_radius_mm > 0)) return { error: "Correction radius must be positive." };
  // Permissible eccentricity is INVERSELY proportional to speed: doubling the rotor speed
  // halves the allowable unbalance, which is why a speed change forces a rebalance.
  const omega_rad_s = 2 * Math.PI * rpm / 60;
  const e_permissible = balance_grade * 1000 / omega_rad_s;
  const u_permissible = e_permissible * rotor_mass_kg;
  const per_plane = u_permissible / planes;
  const correction_mass_g = per_plane / correction_radius_mm;
  if (![omega_rad_s, e_permissible, u_permissible, per_plane, correction_mass_g].every(Number.isFinite)) return { error: "Balance-grade math is not a finite value." };
  return {
    omega_rad_s,
    e_permissible,
    u_permissible,
    per_plane,
    correction_mass_g,
    note: "The residual unbalance a rotor is allowed at its operating speed, and what that works out to in grams on the balancing machine. A balance grade is defined as the permissible eccentricity multiplied by the angular velocity, expressed in millimetres per second, so a grade of 6.3 means the center of mass may sit off the axis by however much gives 6.3 mm/s of rim velocity at operating speed. The grades are a published ladder: G6.3 for general machinery, pumps, and fans; G2.5 for machine tool drives, turbines, and better electric motors; G1 and G0.4 for grinding spindles and precision equipment. The important consequence is in the division. Permissible eccentricity is inversely proportional to speed, so DOUBLING the rotor speed HALVES the allowable unbalance -- a fan balanced to G6.3 at 1,800 rpm and then run at 3,600 rpm is not at G6.3 any more, it is at G12.6, one full grade coarser, and it will vibrate accordingly. That is why rebalancing is required after a speed change and why a two-speed machine is balanced to its high speed. The last lines translate the tolerance into something an operator can act on: a 50 kg rotor at 3,600 rpm to G6.3, corrected in two planes at a 150 mm radius, allows 836 g-mm total, 418 per plane, which is 2.79 g at that radius -- about the mass of a small washer, and a good sense of how little material puts a rotor out of tolerance. A tolerance calculation; ISO 1940 in full, the machine's own vibration criteria, and the balancing machine's readout govern.",
  };
}

export const rotorBalanceGradeExample = { inputs: { balance_grade: 6.3, rpm: 3600, rotor_mass_kg: 50, planes: 2, correction_radius_mm: 150 } };

SHOP_RENDERERS["rotor-balance-grade"] = _simpleRenderer({
  citation: "Citation: ISO 1940-1 permissible residual unbalance -- the balance grade G is the permissible eccentricity times the angular velocity in mm/s, so e = G x 1000 / omega in g-mm per kg -- cited by name and not reproduced. The grade ladder (G6.3 general machinery, G2.5 machine tools and turbines, G1 and finer for precision spindles) is named, and the grade is entered rather than looked up here. ISO 1940 in full, the machine's vibration criteria, and the balancing machine's readout govern.",
  example: rotorBalanceGradeExample.inputs,
  fields: [
    { key: "balance_grade", label: "Balance grade G (6.3 general, 2.5 machine tool)", kind: "number" },
    { key: "rpm", label: "Operating speed (rpm)", kind: "number" },
    { key: "rotor_mass_kg", label: "Rotor mass (kg)", kind: "number" },
    { key: "planes", label: "Correction planes", kind: "number" },
    { key: "correction_radius_mm", label: "Correction radius (mm)", kind: "number" },
  ],
  outputs: [
    { key: "w", id: "rbg-out-w", label: "Angular velocity", value: (r) => fmt(r.omega_rad_s, 1) + " rad/s" },
    { key: "e", id: "rbg-out-e", label: "Permissible eccentricity", value: (r) => fmt(r.e_permissible, 2) + " g-mm per kg" },
    { key: "u", id: "rbg-out-u", label: "Permissible residual unbalance", value: (r) => fmt(r.u_permissible, 0) + " g-mm total, " + fmt(r.per_plane, 0) + " g-mm per plane" },
    { key: "m", id: "rbg-out-m", label: "Correction mass at that radius", value: (r) => fmt(r.correction_mass_g, 2) + " g per plane" },
    { key: "n", id: "rbg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRotorBalanceGrade,
});

// ===================== spec-v1407: bearing regrease quantity and interval =====================
// dims: in { args: dimensionless } out: { grease_grams: M, base_interval_hr: T, corrected_interval_hr: T }
export function computeBearingRegrease({ od_mm = 0, width_mm = 0, bore_mm = 0, rpm = 0, correction_factor = 1.0, duty_hours_per_day = 24 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(od_mm > 0)) return { error: "Bearing outside diameter must be positive." };
  if (!(width_mm > 0)) return { error: "Bearing width must be positive." };
  if (!(bore_mm > 0)) return { error: "Bearing bore must be positive." };
  if (!(bore_mm < od_mm)) return { error: "The bore must be smaller than the outside diameter." };
  if (!(rpm > 0)) return { error: "Operating speed must be positive." };
  if (!(correction_factor > 0 && correction_factor <= 1)) return { error: "Correction factor must be above 0 and at most 1 -- it only ever shortens the base interval." };
  if (!(duty_hours_per_day > 0 && duty_hours_per_day <= 24)) return { error: "Duty hours per day must be above 0 and at most 24." };
  // Over-greasing is NOT conservative: excess grease is churned, it heats, and it either
  // bleeds out or cooks into a varnish that starves the bearing.
  const grease_grams = 0.005 * od_mm * width_mm;
  const base_interval_hr = 14000000 / (rpm * Math.sqrt(bore_mm)) - 4 * bore_mm;
  if (!(base_interval_hr > 0)) {
    return { error: "At this speed and bore the relation gives no relubrication interval -- the bearing is past the grease-lubrication range and wants oil or a continuous system." };
  }
  const corrected_interval_hr = base_interval_hr * correction_factor;
  const interval_days = corrected_interval_hr / duty_hours_per_day;
  if (![grease_grams, base_interval_hr, corrected_interval_hr, interval_days].every(Number.isFinite)) return { error: "Regrease math is not a finite value." };
  return {
    grease_grams,
    base_interval_hr,
    corrected_interval_hr,
    interval_days,
    note: "How much grease a bearing takes and how often, which are two numbers commonly wrong in the field in opposite directions. The quantity is proportional to the bearing's outside diameter times its width -- essentially to the free volume inside it -- and it comes out much smaller than people expect: a 110 mm by 27 mm bearing takes about 15 grams, not a cartridge. Over-greasing is not the conservative choice it feels like, because excess grease is churned by the rolling elements, it heats, and it either bleeds out or cooks into a varnish that starves the bearing. A great many lubrication failures are over-lubrication. The interval falls with both speed and bore, and the base relation applies to a horizontal, moderately loaded bearing at normal temperature; the correction factor cuts it hard from there. Roughly halve it for every fifteen degrees Celsius above about 70 C, halve it again for a vertical shaft, and cut it substantially for heavy load, contamination, or vibration -- so two identical bearings in different service can have intervals a factor of ten apart. A 6310 at 1,800 rpm horizontal takes 14.9 g every 900 hours, about five weeks of continuous running; put the same bearing on a vertical shaft in a hot room and it is roughly 225 hours, and a schedule built on the base number would be four times too slow. A planning figure; the bearing manufacturer's own relubrication chart, the grease's specification, and a condition-monitoring program govern.",
  };
}

export const bearingRegreaseExample = { inputs: { od_mm: 110, width_mm: 27, bore_mm: 50, rpm: 1800, correction_factor: 1.0, duty_hours_per_day: 24 } };

SHOP_RENDERERS["bearing-regrease"] = _simpleRenderer({
  citation: "Citation: grease quantity from the bearing's free volume, G = 0.005 x OD x width in grams from millimetres, and the standard relubrication-interval relation 14,000,000 / (rpm x sqrt(bore)) - 4 x bore for a horizontal, moderately loaded bearing at normal temperature, by name -- published bearing-maintenance practice, cited not reproduced. The correction factor for temperature, orientation, load, and contamination is entered. The bearing manufacturer's own relubrication chart and a condition-monitoring program govern.",
  example: bearingRegreaseExample.inputs,
  fields: [
    { key: "od_mm", label: "Bearing outside diameter (mm)", kind: "number" },
    { key: "width_mm", label: "Bearing width (mm)", kind: "number" },
    { key: "bore_mm", label: "Bearing bore (mm)", kind: "number" },
    { key: "rpm", label: "Operating speed (rpm)", kind: "number" },
    { key: "correction_factor", label: "Correction factor (1.0 base; 0.5 vertical or hot, 0.25 both)", kind: "number" },
    { key: "duty_hours_per_day", label: "Operating hours per day", kind: "number" },
  ],
  outputs: [
    { key: "g", id: "brgr-out-g", label: "Grease quantity", value: (r) => fmt(r.grease_grams, 1) + " g" },
    { key: "b", id: "brgr-out-b", label: "Base interval", value: (r) => fmt(r.base_interval_hr, 0) + " hours" },
    { key: "c", id: "brgr-out-c", label: "Corrected interval", value: (r) => fmt(r.corrected_interval_hr, 0) + " hours" },
    { key: "d", id: "brgr-out-d", label: "At the stated duty", value: (r) => "every " + fmt(r.interval_days, 1) + " operating days" },
    { key: "n", id: "brgr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBearingRegrease,
});

// ===================== spec-v1408: plasma cut time, consumable life, cost per part =====================
// dims: in { args: dimensionless } out: { cut_time_min: T, arc_hours_per_part: T, parts_per_set: dimensionless, cost_per_part: dimensionless }
export function computePlasmaCutSpeed({ cut_length_in = 0, cut_speed_ipm = 0, pierces_per_part = 0, set_cost = 0, rated_pierces = 0, rated_arc_hours = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(cut_length_in > 0)) return { error: "Cut length per part must be positive." };
  if (!(cut_speed_ipm > 0)) return { error: "Cut speed must be positive." };
  if (!(pierces_per_part > 0)) return { error: "Pierces per part must be positive." };
  if (!(set_cost > 0)) return { error: "Consumable set cost must be positive." };
  if (!(rated_pierces > 0)) return { error: "Rated pierces per set must be positive." };
  if (!(rated_arc_hours > 0)) return { error: "Rated arc hours per set must be positive." };
  // Consumables wear TWO ways and are rated two ways. A sheet full of small holes burns
  // pierces; a long straight rip burns hours. Which arrives first depends on the part.
  const cut_time_min = cut_length_in / cut_speed_ipm;
  const arc_hours_per_part = cut_time_min / 60;
  const parts_by_pierces = Math.floor(rated_pierces / pierces_per_part);
  const parts_by_arc_hours = Math.floor(rated_arc_hours / arc_hours_per_part);
  const parts_per_set = Math.min(parts_by_pierces, parts_by_arc_hours);
  if (!(parts_per_set >= 1)) return { error: "A single part exhausts a consumable set at these ratings -- check the cut length, the pierce count, and the set's rating." };
  const governing = parts_by_arc_hours < parts_by_pierces
    ? "arc hours govern"
    : parts_by_pierces < parts_by_arc_hours
      ? "pierces govern"
      : "both limits arrive together";
  const cost_per_part = set_cost / parts_per_set;
  const cost_per_foot = cost_per_part / (cut_length_in / 12);
  if (![cut_time_min, arc_hours_per_part, cost_per_part, cost_per_foot].every(Number.isFinite)) return { error: "Plasma consumable math is not a finite value." };
  return {
    cut_time_min,
    arc_hours_per_part,
    parts_by_pierces,
    parts_by_arc_hours,
    parts_per_set,
    governing,
    cost_per_part,
    cost_per_foot,
    note: "What plasma consumables actually cost per part, from the two ways they wear. The electrode and nozzle wear two ways and are rated two ways: each pierce blasts the electrode's hafnium insert, so a set carries a rated number of pierces, and steady cutting erodes it more slowly, so a set also carries a rated number of arc-on hours. Which limit arrives first depends entirely on the part -- a sheet full of small holes burns pierces, and a long straight rip burns hours -- so reporting both and naming the one that governs is what makes the calculation useful for quoting. A shop that costs consumables per pierce will underprice long cuts, and a shop that costs them per hour will underprice hole-intensive ones, and on a production run the difference is real money. A part with 240 in of cut at 40 in/min and 4 pierces takes 6 minutes of arc, which is a tenth of an hour, so a $35 set rated 500 pierces or 3 arc hours gives 125 parts on pierces but only 30 on hours: arc hours govern by a factor of four and the consumable cost is $1.17 a part, not the $0.28 a pierce-based estimate would have said. Reverse the part into a nest of 60 small holes with 30 in of cut and pierces govern instead, at 8 parts per set and $4.38 apiece -- same machine, same material, an order of magnitude apart. A costing estimate; the torch manufacturer's published consumable ratings and cut charts, and the shop's own consumable logs, govern.",
  };
}

export const plasmaCutSpeedExample = { inputs: { cut_length_in: 240, cut_speed_ipm: 40, pierces_per_part: 4, set_cost: 35, rated_pierces: 500, rated_arc_hours: 3 } };

SHOP_RENDERERS["plasma-cut-speed"] = _simpleRenderer({
  citation: "Citation: plasma consumable life from the two ratings a set carries -- pierces and arc-on hours -- with the smaller of the two governing, by name; the ratings and the cut speed for the amperage and thickness come from the torch manufacturer's published cut charts, entered rather than bundled. The manufacturer's ratings and the shop's own consumable logs govern.",
  example: plasmaCutSpeedExample.inputs,
  fields: [
    { key: "cut_length_in", label: "Cut length per part (in)", kind: "number" },
    { key: "cut_speed_ipm", label: "Cut speed (in/min) for the amperage and thickness", kind: "number" },
    { key: "pierces_per_part", label: "Pierces per part", kind: "number" },
    { key: "set_cost", label: "Consumable set cost ($)", kind: "number" },
    { key: "rated_pierces", label: "Rated pierces per set", kind: "number" },
    { key: "rated_arc_hours", label: "Rated arc hours per set", kind: "number" },
  ],
  outputs: [
    { key: "t", id: "plcs-out-t", label: "Cut time per part", value: (r) => fmt(r.cut_time_min, 2) + " min (" + fmt(r.arc_hours_per_part, 4) + " arc hours)" },
    { key: "p", id: "plcs-out-p", label: "Parts per set by pierces", value: (r) => String(r.parts_by_pierces) },
    { key: "a", id: "plcs-out-a", label: "Parts per set by arc hours", value: (r) => String(r.parts_by_arc_hours) },
    { key: "g", id: "plcs-out-g", label: "Governing limit", value: (r) => r.governing + " at " + String(r.parts_per_set) + " parts per set" },
    { key: "c", id: "plcs-out-c", label: "Consumable cost", value: (r) => "$" + fmt(r.cost_per_part, 2) + " per part ($" + fmt(r.cost_per_foot, 3) + " per foot of cut)" },
    { key: "n", id: "plcs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePlasmaCutSpeed,
});

// ===================== spec-v1409: hydraulic reservoir size and cooler duty =====================
// dims: in { args: dimensionless } out: { hydraulic_hp: dimensionless, heat_btu_hr: dimensionless, reservoir_gal: L^3, cooler_duty_btu_hr: dimensionless }
export function computeHydraulicReservoirCooler({ pump_gpm = 0, pressure_psi = 0, pump_efficiency = 0.85, heat_fraction = 0.25, reservoir_multiplier = 3, reservoir_dissipation_btu_hr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pump_gpm > 0)) return { error: "Pump flow must be positive." };
  if (!(pressure_psi > 0)) return { error: "System pressure must be positive." };
  if (!(pump_efficiency > 0 && pump_efficiency <= 1)) return { error: "Pump efficiency must be between 0 and 1." };
  if (!(heat_fraction > 0 && heat_fraction <= 1)) return { error: "Heat fraction must be between 0 and 1." };
  if (!(reservoir_multiplier > 0)) return { error: "Reservoir multiplier must be positive." };
  if (!(reservoir_dissipation_btu_hr >= 0)) return { error: "Reservoir dissipation cannot be negative." };
  // Everything the system does that is NOT useful work becomes heat in the oil.
  const hydraulic_hp = pump_gpm * pressure_psi / 1714;
  const input_hp = hydraulic_hp / pump_efficiency;
  const heat_hp = input_hp * heat_fraction;
  const heat_btu_hr = heat_hp * 2545;
  const reservoir_gal = pump_gpm * reservoir_multiplier;
  const cooler_duty_btu_hr = Math.max(0, heat_btu_hr - reservoir_dissipation_btu_hr);
  const verdict = cooler_duty_btu_hr > 0
    ? "a cooler must reject " + fmt(cooler_duty_btu_hr, 0) + " BTU/hr; if neither the tank nor a cooler takes it, the oil temperature climbs until viscosity falls far enough that leakage losses balance the input -- a stable and destructive equilibrium"
    : "the reservoir sheds the whole heat load at the design oil temperature; no cooler is indicated";
  if (![hydraulic_hp, input_hp, heat_hp, heat_btu_hr, reservoir_gal, cooler_duty_btu_hr].every(Number.isFinite)) return { error: "Hydraulic heat math is not a finite value." };
  return {
    hydraulic_hp,
    input_hp,
    heat_hp,
    heat_btu_hr,
    reservoir_gal,
    cooler_duty_btu_hr,
    verdict,
    note: "How much heat a hydraulic system makes, how big its reservoir should be, and what is left for a cooler. Everything the system does that is not useful work becomes heat in the oil: pressure drop across valves and lines, relief-valve flow, and pump and motor inefficiency. A quarter of input power is a common figure for a system with ordinary metering losses, and on a system that spends much of its cycle over relief it is far more. The reservoir does three jobs -- de-aerate, settle contamination, and shed heat -- and the classic industrial rule of three times the pump's per-minute flow is really a DWELL TIME rule: it gives the oil about three minutes in the tank to release entrained air before it goes around again. Mobile equipment cannot carry that much oil and runs one to two times instead, which is exactly why mobile systems need coolers and industrial power units often do not. A 20 gpm pump at 2,000 psi is 23.3 hydraulic horsepower and 27.5 at the input at 85% pump efficiency; a quarter of that to heat is 6.9 hp, which is 17,469 BTU/hr, and a 60 gal tank shedding 4,000 leaves 13,469 for a cooler -- a real heat exchanger and a real fan, not an afterthought. Note what the heat fraction does: a system designed so only 15% of input becomes heat needs barely half that rejection. Circuit design, not cooler selection, is where hydraulic heat is actually controlled. A sizing estimate; the component manufacturers' published efficiencies, the duty cycle, and a measured oil temperature govern.",
  };
}

export const hydraulicReservoirCoolerExample = { inputs: { pump_gpm: 20, pressure_psi: 2000, pump_efficiency: 0.85, heat_fraction: 0.25, reservoir_multiplier: 3, reservoir_dissipation_btu_hr: 4000 } };

SHOP_RENDERERS["hydraulic-reservoir-cooler"] = _simpleRenderer({
  citation: "Citation: hydraulic power from gpm x psi / 1,714, the heat fraction of input power converted at 2,545 BTU/hr per horsepower, and the classic reservoir dwell-time rule of three times pump flow for industrial units (one to two for mobile), by name -- public fluid-power practice. The efficiencies, heat fraction, and tank dissipation are entered. The component manufacturers' published efficiencies, the duty cycle, and a measured oil temperature govern.",
  example: hydraulicReservoirCoolerExample.inputs,
  fields: [
    { key: "pump_gpm", label: "Pump flow (gpm)", kind: "number" },
    { key: "pressure_psi", label: "System pressure (psi)", kind: "number" },
    { key: "pump_efficiency", label: "Pump and drive efficiency (0-1)", kind: "number" },
    { key: "heat_fraction", label: "Fraction of input that becomes heat (0.25 typical)", kind: "number" },
    { key: "reservoir_multiplier", label: "Reservoir multiplier (3 industrial, 1-2 mobile)", kind: "number" },
    { key: "reservoir_dissipation_btu_hr", label: "Reservoir dissipation at design oil temp (BTU/hr)", kind: "number" },
  ],
  outputs: [
    { key: "h", id: "hyrc-out-h", label: "Power", value: (r) => fmt(r.hydraulic_hp, 1) + " hydraulic hp, " + fmt(r.input_hp, 1) + " hp at the input" },
    { key: "q", id: "hyrc-out-q", label: "Heat generated", value: (r) => fmt(r.heat_hp, 2) + " hp (" + fmt(r.heat_btu_hr, 0) + " BTU/hr)" },
    { key: "r", id: "hyrc-out-r", label: "Reservoir volume", value: (r) => fmt(r.reservoir_gal, 0) + " gal" },
    { key: "c", id: "hyrc-out-c", label: "Required cooler duty", value: (r) => fmt(r.cooler_duty_btu_hr, 0) + " BTU/hr" },
    { key: "v", id: "hyrc-out-v", label: "What that means", value: (r) => r.verdict },
    { key: "n", id: "hyrc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHydraulicReservoirCooler,
});


// ===========================================================================
// spec-v1432: the dust-collection tile of the specialty-trades band of the
// 2026-08-26 trade expansion. See specs/scope-trade-expansion.md.
// ===========================================================================

// ===================== spec-v1432: dust collection duct velocity =====================
// Standard spiral / snap-lock round duct sizes, in inches. The rule is to pick
// the LARGEST standard size that still holds the minimum conveying velocity,
// which means rounding DOWN from the required diameter, not up.
export const DUST_DUCT_SIZES_IN = [3, 4, 5, 6, 7, 8, 10, 12, 14, 16];

const _dustPick = (required_in) => {
  let pick = DUST_DUCT_SIZES_IN[0];
  for (const s of DUST_DUCT_SIZES_IN) if (s <= required_in) pick = s;
  return pick;
};
const _dustArea = (dia_in) => Math.PI * (dia_in / 12) * (dia_in / 12) / 4;

// dims: in { args: dimensionless } out: { branch_area_sqft: L^2, branch_diameter_in: L, branch_velocity_actual_fpm: L T^-1 }
export function computeDustCollectionDuct({ cfm_per_machine = 0, branch_velocity_fpm = 4000, main_velocity_fpm = 3500, machines = 1, simultaneous = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(cfm_per_machine > 0)) return { error: "Airflow per machine must be positive." };
  if (!(branch_velocity_fpm > 0)) return { error: "Minimum branch conveying velocity must be positive." };
  if (!(main_velocity_fpm > 0)) return { error: "Minimum main conveying velocity must be positive." };
  if (!(machines >= 1)) return { error: "There must be at least one machine." };
  if (!(simultaneous >= 1)) return { error: "At least one gate must be open at once." };
  if (!(simultaneous <= machines)) return { error: "More gates cannot be open than there are machines." };
  const branch_area_sqft = cfm_per_machine / branch_velocity_fpm;
  const branch_diameter_in = Math.sqrt(4 * branch_area_sqft / Math.PI) * 12;
  const branch_size_in = _dustPick(branch_diameter_in);
  const branch_velocity_actual_fpm = cfm_per_machine / _dustArea(branch_size_in);
  const main_cfm = simultaneous * cfm_per_machine;
  const main_area_sqft = main_cfm / main_velocity_fpm;
  const main_diameter_in = Math.sqrt(4 * main_area_sqft / Math.PI) * 12;
  const main_size_in = _dustPick(main_diameter_in);
  const main_velocity_actual_fpm = main_cfm / _dustArea(main_size_in);
  // The instinct to round UP is exactly wrong here: the next size up settles out.
  const branch_up_in = DUST_DUCT_SIZES_IN.find((s) => s > branch_size_in) ?? branch_size_in;
  const branch_up_velocity_fpm = cfm_per_machine / _dustArea(branch_up_in);
  const all_open_cfm = machines * cfm_per_machine;
  const branch_ok = branch_velocity_actual_fpm >= branch_velocity_fpm;
  const main_ok = main_velocity_actual_fpm >= main_velocity_fpm;
  if (![branch_area_sqft, branch_diameter_in, branch_velocity_actual_fpm, main_diameter_in, main_velocity_actual_fpm].every(Number.isFinite)) return { error: "Dust-collection duct math is not a finite value." };
  return {
    branch_area_sqft, branch_diameter_in, branch_size_in, branch_velocity_actual_fpm,
    main_cfm, main_area_sqft, main_diameter_in, main_size_in, main_velocity_actual_fpm,
    branch_up_in, branch_up_velocity_fpm, all_open_cfm, branch_ok, main_ok,
    verdict: branch_ok && main_ok
      ? "both runs hold their minimum conveying velocity"
      : (branch_ok ? "" : "the branch is BELOW its minimum conveying velocity") + (branch_ok || main_ok ? "" : " and ") + (main_ok ? "" : "the main is BELOW its minimum conveying velocity") + " -- it will fill with chips",
    note: "Dust collection duct is sized backward from every other duct system in a building, and this is the calculation that gets it right. Everywhere else, duct is sized for pressure loss and bigger is better. Here the requirement is VELOCITY and bigger is worse: below roughly 3,500 fpm, wood dust and chips settle out of the airstream and accumulate until the duct plugs, and the plug is both a production stoppage and, in the wrong dust, an ignition and explosion concern. So the rule is to choose the SMALLEST standard duct that still carries the required flow, and to check the resulting velocity rather than assume it. A machine needing 400 CFM at a 4,000 fpm minimum wants 4.28 in of duct, which means 4 in pipe running at 4,584 fpm -- correct. Round UP to 5 in instead and the same 400 CFM runs at only 2,934 fpm, well below the conveying minimum, and that branch will fill with chips. Rounding up feels safe and is exactly the wrong instinct. The main is the second half and the simultaneous-use assumption is the single most consequential input in the whole design. Sizing the main for every machine running at once is how a home shop ends up with an 8 in trunk it cannot pull air through; sizing it for the number of gates actually open, often one and sometimes two, gives a smaller main, a higher velocity, and a collector that works. Two gates at 400 CFM is 800 CFM, 6.06 in required, 6 in pipe at 4,074 fpm -- still conveying, where an 8 in main at the same flow would run at 2,292 fpm and become a settling chamber. VELOCITY AND GEOMETRY ONLY. This does not compute system pressure loss, which is what actually determines whether the collector can move the design airflow through the run, and a system that is velocity-correct but static-pressure-starved delivers neither. It does not size the collector or its filtration and does not address blast gates, flexible hose (which costs several times the loss of smooth pipe), or fitting losses; required airflow per machine is a manufacturer and hood-design figure, not a computation. IT TAKES NO POSITION ON COMBUSTIBLE DUST HAZARD MANAGEMENT, which is a serious matter governed by NFPA 652, NFPA 664 for wood, and NFPA 68 and 69 for explosion protection, covering grounding and bonding, duct construction, collector location, and explosion venting. NFPA, OSHA, and the collector manufacturer govern.",
  };
}

export const dustCollectionDuctExample = { inputs: { cfm_per_machine: 400, branch_velocity_fpm: 4000, main_velocity_fpm: 4000, machines: 3, simultaneous: 2 } };

SHOP_RENDERERS["dust-collection-duct"] = _simpleRenderer({
  citation: "Citation: the minimum conveying-velocity practice for wood and metal dust -- roughly 3,500 to 4,500 fpm in branches, with mains at the low end of that range -- and the simultaneous-use convention for sizing the main, by name. Duct size from the continuity relation, area = airflow / velocity, rounded DOWN to a standard size so the velocity stays above the minimum. Velocity and geometry only: no system pressure loss, no collector sizing, and no position on combustible dust hazard management, which NFPA 652, 664, 68, and 69, OSHA, and the collector manufacturer govern.",
  example: dustCollectionDuctExample.inputs,
  fields: [
    { key: "cfm_per_machine", label: "Required airflow per machine (CFM)", kind: "number" },
    { key: "branch_velocity_fpm", label: "Minimum branch conveying velocity (fpm)", kind: "number" },
    { key: "main_velocity_fpm", label: "Minimum main conveying velocity (fpm)", kind: "number" },
    { key: "machines", label: "Machines on the system", kind: "number" },
    { key: "simultaneous", label: "Gates expected open at once", kind: "number" },
  ],
  outputs: [
    { key: "b", id: "dcd-out-b", label: "Branch", value: (r) => fmt(r.branch_diameter_in, 2) + " in required -- use " + fmt(r.branch_size_in, 0) + " in at " + fmt(r.branch_velocity_actual_fpm, 0) + " fpm" },
    { key: "r", id: "dcd-out-r", label: "Why not the next size up", value: (r) => fmt(r.branch_up_in, 0) + " in would run at only " + fmt(r.branch_up_velocity_fpm, 0) + " fpm and settle out" },
    { key: "m", id: "dcd-out-m", label: "Main", value: (r) => fmt(r.main_cfm, 0) + " CFM, " + fmt(r.main_diameter_in, 2) + " in required -- use " + fmt(r.main_size_in, 0) + " in at " + fmt(r.main_velocity_actual_fpm, 0) + " fpm" },
    { key: "a", id: "dcd-out-a", label: "If every gate were open", value: (r) => fmt(r.all_open_cfm, 0) + " CFM, which is the assumption that oversizes a main" },
    { key: "v", id: "dcd-out-v", label: "Against the conveying minimum", value: (r) => r.verdict },
    { key: "n", id: "dcd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDustCollectionDuct,
});


// ===========================================================================
// spec-v1435 .. v1444: the industrial and finishing band of the 2026-08-26
// trade expansion. See specs/scope-trade-expansion.md. Ten tiles, Group G.
// ===========================================================================

// ===================== spec-v1435: pneumatic cylinder air consumption =====================
// dims: in { args: dimensionless } out: { volume_per_cycle_ft3: L^3, scfm_total: L^3 T^-1, compressor_hp: M L^2 T^-3 }
export function computePneumaticCylinderScfm({ bore_in = 0, rod_in = 0, stroke_in = 0, cycles_per_min = 0, pressure_psig = 0, cylinders = 1, cfm_per_hp = 4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(bore_in > 0)) return { error: "Bore diameter must be positive." };
  if (!(rod_in >= 0)) return { error: "Rod diameter cannot be negative." };
  if (!(rod_in < bore_in)) return { error: "Rod diameter must be less than the bore." };
  if (!(stroke_in > 0)) return { error: "Stroke must be positive." };
  if (!(cycles_per_min > 0)) return { error: "Cycles per minute must be positive." };
  if (!(pressure_psig > 0)) return { error: "Operating gauge pressure must be positive." };
  if (!(cylinders >= 1)) return { error: "There must be at least one cylinder." };
  if (!(cfm_per_hp > 0)) return { error: "Compressor specific output must be positive." };
  const bore_area = Math.PI * bore_in * bore_in / 4;
  const rod_area = Math.PI * rod_in * rod_in / 4;
  const extend_in3 = bore_area * stroke_in;
  // The rod occupies part of the bore on the way back, so retract is smaller.
  const retract_in3 = (bore_area - rod_area) * stroke_in;
  const per_cycle_in3 = extend_in3 + retract_in3;
  const volume_per_cycle_ft3 = per_cycle_in3 / 1728;
  // Compressed air is billed in STANDARD cubic feet -- free air -- and the
  // cylinder is filled with compressed air. That ratio is the whole story.
  const compression_ratio = (pressure_psig + 14.7) / 14.7;
  const scfm_per_cylinder = volume_per_cycle_ft3 * cycles_per_min * compression_ratio;
  const scfm_total = scfm_per_cylinder * cylinders;
  const compressor_hp = scfm_total / cfm_per_hp;
  if (![volume_per_cycle_ft3, compression_ratio, scfm_per_cylinder, scfm_total, compressor_hp].every(Number.isFinite)) return { error: "Pneumatic consumption math is not a finite value." };
  return {
    extend_in3, retract_in3, per_cycle_in3, volume_per_cycle_ft3,
    compression_ratio, scfm_per_cylinder, scfm_total, compressor_hp,
    note: "What a pneumatic cylinder actually costs to run, which is not its swept volume. Compressed air is billed in STANDARD cubic feet -- free air at atmospheric pressure -- and a cylinder is filled with COMPRESSED air, so every cubic foot of cylinder volume at 90 psig took just over seven cubic feet of free air to fill, and every cycle throws all of it away through the exhaust port. That factor of seven is the whole reason pneumatics are expensive to run and the reason a shop's compressor is always smaller than its air demand. The rod side matters and is easy to skip: on the retract stroke the rod occupies part of the bore, so the retract volume is smaller than the extend volume, and on a large-rod cylinder that difference is substantial -- counting both strokes at full bore over-estimates, counting only the extend stroke under-estimates by nearly half. A 2.5 in bore with a 1 in rod on a 12 in stroke cycling 20 times a minute at 90 psig moves 108 cubic inches per cycle and consumes 8.9 SCFM, roughly two horsepower of compressor running continuously for one small actuator; ten of them is a 20 hp compressor doing nothing but cycling cylinders. The pressure lever is real and underused: dropping the supply from 90 psig to 70 psig cuts the compression ratio from 7.12 to 5.76 and the consumption by 19%, which is free money if the application still makes its force at the lower pressure. Demand only. This does not size a compressor, a receiver, or the distribution piping, and it takes no account of the leakage that in most shops exceeds the productive demand, of valve and fitting losses, of the air a cylinder's cushions and pilot lines consume, or of the dryer and filtration load the flow implies. Duty cycle is assumed steady at the entered rate. The compressor manufacturer's rating at the actual discharge pressure, and an air audit of the real system, govern.",
  };
}

export const pneumaticCylinderScfmExample = { inputs: { bore_in: 2.5, rod_in: 1, stroke_in: 12, cycles_per_min: 20, pressure_psig: 90, cylinders: 1, cfm_per_hp: 4 } };

SHOP_RENDERERS["pneumatic-cylinder-scfm"] = _simpleRenderer({
  citation: "Citation: cylinder swept volume from bore, rod, and stroke, and the compression ratio (gauge pressure + 14.7) / 14.7 that converts compressed volume to FREE air, by name; SCFM = volume per cycle x cycles per minute x compression ratio. The 4 CFM per horsepower figure is the conventional shop rule for a reciprocating compressor and is entered rather than assumed. Demand only -- no compressor, receiver, piping, or leakage. The compressor manufacturer's rating at the actual discharge pressure governs.",
  example: pneumaticCylinderScfmExample.inputs,
  fields: [
    { key: "bore_in", label: "Bore diameter (in)", kind: "number" },
    { key: "rod_in", label: "Rod diameter (in)", kind: "number" },
    { key: "stroke_in", label: "Stroke (in)", kind: "number" },
    { key: "cycles_per_min", label: "Cycles per minute", kind: "number" },
    { key: "pressure_psig", label: "Operating pressure (psig)", kind: "number" },
    { key: "cylinders", label: "Number of cylinders", kind: "number" },
    { key: "cfm_per_hp", label: "Compressor output (CFM per hp)", kind: "number" },
  ],
  outputs: [
    { key: "v", id: "pcs-out-v", label: "Volume per cycle", value: (r) => fmt(r.per_cycle_in3, 2) + " cubic in (" + fmt(r.extend_in3, 2) + " extend + " + fmt(r.retract_in3, 2) + " retract) = " + fmt(r.volume_per_cycle_ft3, 4) + " cubic ft" },
    { key: "c", id: "pcs-out-c", label: "Compression ratio", value: (r) => fmt(r.compression_ratio, 2) + " cubic ft of free air per cubic ft of cylinder" },
    { key: "s", id: "pcs-out-s", label: "Air consumption", value: (r) => fmt(r.scfm_per_cylinder, 2) + " SCFM per cylinder, " + fmt(r.scfm_total, 2) + " SCFM total" },
    { key: "h", id: "pcs-out-h", label: "Compressor implied", value: (r) => fmt(r.compressor_hp, 2) + " hp running continuously" },
    { key: "n", id: "pcs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePneumaticCylinderScfm,
});

// ===================== spec-v1436: bucket elevator capacity and power =====================
// dims: in { args: dimensionless } out: { capacity_ft3_hr: L^3 T^-1, lifting_hp: M L^2 T^-3, motor_hp: M L^2 T^-3 }
export function computeBucketElevatorCapacity({ bucket_volume_ft3 = 0, spacing_in = 0, speed_fpm = 0, fill_factor = 0.75, bulk_density_pcf = 0, lift_ft = 0, drive_efficiency = 0.75, friction_allowance = 1.2 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(bucket_volume_ft3 > 0)) return { error: "Bucket volume must be positive." };
  if (!(spacing_in > 0)) return { error: "Bucket spacing must be positive." };
  if (!(speed_fpm > 0)) return { error: "Belt or chain speed must be positive." };
  if (!(fill_factor > 0 && fill_factor <= 1)) return { error: "Fill factor must be between 0 and 1." };
  if (!(bulk_density_pcf > 0)) return { error: "Material bulk density must be positive." };
  if (!(lift_ft > 0)) return { error: "Lift height must be positive." };
  if (!(drive_efficiency > 0 && drive_efficiency <= 1)) return { error: "Drive efficiency must be between 0 and 1." };
  if (!(friction_allowance >= 1)) return { error: "Scoop and friction allowance cannot be below 1.0." };
  const buckets_per_ft = 12 / spacing_in;
  const capacity_ft3_hr = bucket_volume_ft3 * buckets_per_ft * speed_fpm * 60 * fill_factor;
  const mass_lb_hr = capacity_ft3_hr * bulk_density_pcf;
  const tons_per_hr = mass_lb_hr / 2000;
  const bushels_per_hr = capacity_ft3_hr / 1.2445; // 1 bushel = 1.2445 cubic ft
  // Power is dominated by LIFT -- the opposite of a horizontal conveyor.
  const lifting_hp = (mass_lb_hr / 60) * lift_ft / 33000;
  const motor_hp = lifting_hp / drive_efficiency * friction_allowance;
  if (![buckets_per_ft, capacity_ft3_hr, mass_lb_hr, lifting_hp, motor_hp].every(Number.isFinite)) return { error: "Bucket-elevator math is not a finite value." };
  return {
    buckets_per_ft, capacity_ft3_hr, mass_lb_hr, tons_per_hr, bushels_per_hr,
    lifting_hp, motor_hp, lift_share_pct: lifting_hp / motor_hp * 100,
    note: "What a bucket elevator moves and what it takes to drive it, and the fill factor is where the honesty lives. A bucket elevator does not fill its buckets: at the boot the buckets scoop or are fed, and how much they pick up depends on the material's flowability, the boot design, and the speed. Seventy-five percent is a working figure for free-flowing grain and considerably less for a sluggish material, and rating an elevator at 100% fill is how a system bought for 20 tons an hour delivers 15. The fill factor's leverage is worth seeing directly: the same machine at 60% fill rather than 75% delivers 16.2 tons per hour instead of 20.3, and no amount of extra motor recovers it -- the fix is at the boot, not at the drive. Power is dominated by LIFT, which is the opposite of a horizontal conveyor. Friction, scoop resistance, and drive losses are the smaller corrections, so elevator power scales almost linearly with height and with tonnage and is quite insensitive to everything else. Buckets of 0.05 cubic ft on 8 in centers at 250 fpm and 75% fill move 844 cubic ft an hour, which is 20.3 tons of 48 lb grain, and lifting it 60 ft takes 1.23 horsepower before losses and about 2 hp at the motor. Two horsepower to lift twenty tons an hour sixty feet is why bucket elevators are the cheapest vertical conveying there is. Capacity and power only. This does not select buckets, belt, or chain, does not size the head and boot pulleys or the shaft and bearings, does not check belt tension or the take-up, and does not address the discharge -- centrifugal, continuous, or positive -- which sets the speed a given bucket can actually run at. Legs handling grain and other combustible dusts are governed by NFPA 61 and NFPA 68 for explosion venting, and none of that is addressed here. The elevator manufacturer, the material's own test data, and NFPA govern.",
  };
}

export const bucketElevatorCapacityExample = { inputs: { bucket_volume_ft3: 0.05, spacing_in: 8, speed_fpm: 250, fill_factor: 0.75, bulk_density_pcf: 48, lift_ft: 60, drive_efficiency: 0.75, friction_allowance: 1.2 } };

SHOP_RENDERERS["bucket-elevator-capacity"] = _simpleRenderer({
  citation: "Citation: bucket elevator volumetric capacity = bucket volume x buckets per foot x speed x 60 x fill factor, mass rate from the material's bulk density, and lifting horsepower = mass rate per minute x lift / 33,000, by name; the fill factor and the scoop-and-friction allowance are entered rather than assumed, and 1.2445 cubic ft per bushel is the US bushel. Capacity and power only -- no bucket, belt, chain, pulley, or shaft selection, and NO position on combustible grain dust, which NFPA 61 and NFPA 68 govern. The elevator manufacturer and the material's own test data govern.",
  example: bucketElevatorCapacityExample.inputs,
  fields: [
    { key: "bucket_volume_ft3", label: "Bucket volume (cubic ft)", kind: "number" },
    { key: "spacing_in", label: "Bucket spacing (in)", kind: "number" },
    { key: "speed_fpm", label: "Belt or chain speed (fpm)", kind: "number" },
    { key: "fill_factor", label: "Fill factor (0 to 1)", kind: "number" },
    { key: "bulk_density_pcf", label: "Material bulk density (lb/cubic ft)", kind: "number" },
    { key: "lift_ft", label: "Lift height (ft)", kind: "number" },
    { key: "drive_efficiency", label: "Drive efficiency (0 to 1)", kind: "number" },
    { key: "friction_allowance", label: "Scoop and friction allowance (1.2 = +20%)", kind: "number" },
  ],
  outputs: [
    { key: "c", id: "bec-out-c", label: "Capacity", value: (r) => fmt(r.capacity_ft3_hr, 0) + " cubic ft/hr at " + fmt(r.buckets_per_ft, 2) + " buckets per foot" },
    { key: "m", id: "bec-out-m", label: "Mass rate", value: (r) => fmt(r.mass_lb_hr, 0) + " lb/hr = " + fmt(r.tons_per_hr, 2) + " tons/hr = " + fmt(r.bushels_per_hr, 0) + " bu/hr" },
    { key: "l", id: "bec-out-l", label: "Lifting power", value: (r) => fmt(r.lifting_hp, 2) + " hp, which is " + fmt(r.lift_share_pct, 0) + "% of the motor -- lift dominates" },
    { key: "h", id: "bec-out-h", label: "Motor power", value: (r) => fmt(r.motor_hp, 2) + " hp after drive losses and the scoop allowance" },
    { key: "n", id: "bec-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBucketElevatorCapacity,
});

// ===================== spec-v1437: cyclone separator cut size and pressure drop =====================
// dims: in { args: dimensionless } out: { d50_ft: L, d50_micron: L, pressure_drop_psf: M L^-1 T^-2 }
export function computeCycloneSeparatorSizing({ inlet_width_ft = 0, inlet_velocity_fps = 0, turns = 5, gas_viscosity_lb_ft_s = 1.24e-5, gas_density_pcf = 0.075, particle_density_pcf = 0, k_velocity_heads = 8, airflow_cfm = 0, second_velocity_fps = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(inlet_width_ft > 0)) return { error: "Inlet width must be positive." };
  if (!(inlet_velocity_fps > 0)) return { error: "Inlet velocity must be positive." };
  if (!(turns > 0)) return { error: "Effective number of turns must be positive." };
  if (!(gas_viscosity_lb_ft_s > 0)) return { error: "Gas viscosity must be positive." };
  if (!(gas_density_pcf > 0)) return { error: "Gas density must be positive." };
  if (!(particle_density_pcf > gas_density_pcf)) return { error: "Particle density must exceed the gas density." };
  if (!(k_velocity_heads > 0)) return { error: "The pressure-drop coefficient must be positive." };
  if (!(airflow_cfm > 0)) return { error: "Airflow must be positive." };
  if (!(second_velocity_fps > 0)) return { error: "The comparison velocity must be positive." };
  const GC = 32.174;
  // Lapple cut size: the diameter caught with 50% efficiency. Everything in the
  // numerator hurts, everything in the denominator helps.
  const cut = (v) => Math.sqrt(9 * gas_viscosity_lb_ft_s * inlet_width_ft / (2 * Math.PI * turns * v * (particle_density_pcf - gas_density_pcf)));
  const drop = (v) => k_velocity_heads * gas_density_pcf * v * v / (2 * GC);
  const d50_ft = cut(inlet_velocity_fps);
  const d50_micron = d50_ft * 304800;
  const pressure_drop_psf = drop(inlet_velocity_fps);
  const pressure_drop_inwg = pressure_drop_psf / 5.202;
  const fan_hp = pressure_drop_psf * airflow_cfm / 33000;
  const alt_d50_micron = cut(second_velocity_fps) * 304800;
  const alt_drop_inwg = drop(second_velocity_fps) / 5.202;
  if (![d50_ft, d50_micron, pressure_drop_psf, pressure_drop_inwg, fan_hp, alt_d50_micron].every(Number.isFinite)) return { error: "Cyclone math is not a finite value." };
  return {
    d50_ft, d50_micron, pressure_drop_psf, pressure_drop_inwg, fan_hp,
    alt_d50_micron, alt_drop_inwg,
    cut_gain_pct: (1 - alt_d50_micron / d50_micron) * 100,
    drop_rise_pct: (alt_drop_inwg / pressure_drop_inwg - 1) * 100,
    note: "What a cyclone will and will not catch, and what catching it costs. The Lapple cut size d50 is the particle diameter the cyclone captures with 50% efficiency; larger particles are caught more efficiently, smaller ones less, and the efficiency curve is smooth -- a cyclone does not have a sharp cutoff and never will. Every term in the numerator hurts and every term in the denominator helps, and reading them tells you how cyclones are designed. A NARROWER inlet improves the cut because particles have less distance to migrate to the wall; HIGHER velocity improves it, and so do MORE turns, which is why cyclones are tall and slender rather than squat; denser particles are easier. And that is the whole trade, because everything that improves the cut also raises the pressure drop, which goes as velocity SQUARED. A standard-proportion cyclone with a 0.25 ft inlet, 5 turns, and 50 ft/s on 90 lb/cubic ft wood dust cuts at 4.28 microns and costs 4.48 in w.g. Push the velocity to 70 ft/s chasing a finer cut and the cut size improves only to 3.62 microns, a 15% gain, while the pressure drop nearly doubles to 8.78 in w.g. That asymmetry is why cyclones are almost always followed by a filter rather than pushed harder: the last few microns cost more in fan power than a baghouse does. Cut size and pressure drop only. This is the classical Lapple relation with an assumed effective number of turns, and real collection efficiency depends on the full cyclone geometry, the inlet loading, particle shape and agglomeration, re-entrainment from the wall and the dust hopper, and the vortex finder -- none of which is a formula. It does not size the cyclone body, the hopper, or the airlock, and it takes NO position on combustible dust hazard management, which NFPA 652, NFPA 664 for wood, and NFPA 68 and 69 govern. Manufacturer test data and NFPA govern.",
  };
}

export const cycloneSeparatorSizingExample = { inputs: { inlet_width_ft: 0.25, inlet_velocity_fps: 50, turns: 5, gas_viscosity_lb_ft_s: 1.24e-5, gas_density_pcf: 0.075, particle_density_pcf: 90, k_velocity_heads: 8, airflow_cfm: 1200, second_velocity_fps: 70 } };

SHOP_RENDERERS["cyclone-separator-sizing"] = _simpleRenderer({
  citation: "Citation: the classical Lapple cut-size relation d50 = sqrt(9 mu W / (2 pi N V (rho_p - rho_g))), by name, and cyclone pressure drop counted in inlet velocity heads, dP = K rho_g V^2 / (2 gc), with K commonly 8. Cut size and pressure drop only -- collection efficiency also depends on full geometry, inlet loading, particle shape, re-entrainment, and the vortex finder. NO position on combustible dust hazard management, which NFPA 652, 664, 68, and 69 govern. Manufacturer test data and NFPA govern.",
  example: cycloneSeparatorSizingExample.inputs,
  fields: [
    { key: "inlet_width_ft", label: "Inlet width (ft)", kind: "number" },
    { key: "inlet_velocity_fps", label: "Inlet velocity (ft/s)", kind: "number" },
    { key: "turns", label: "Effective number of turns", kind: "number" },
    { key: "gas_viscosity_lb_ft_s", label: "Gas viscosity (lb/ft-s)", kind: "number" },
    { key: "gas_density_pcf", label: "Gas density (lb/cubic ft)", kind: "number" },
    { key: "particle_density_pcf", label: "Particle density (lb/cubic ft)", kind: "number" },
    { key: "k_velocity_heads", label: "Pressure-drop coefficient K (velocity heads)", kind: "number" },
    { key: "airflow_cfm", label: "Airflow (CFM)", kind: "number" },
    { key: "second_velocity_fps", label: "Comparison inlet velocity (ft/s)", kind: "number" },
  ],
  outputs: [
    { key: "d", id: "css-out-d", label: "Cut size d50", value: (r) => fmt(r.d50_micron, 2) + " microns (" + fmt(r.d50_ft, 7) + " ft) at 50% capture" },
    { key: "p", id: "css-out-p", label: "Pressure drop", value: (r) => fmt(r.pressure_drop_inwg, 2) + " in w.g. (" + fmt(r.pressure_drop_psf, 1) + " psf), " + fmt(r.fan_hp, 2) + " fan hp at this airflow" },
    { key: "t", id: "css-out-t", label: "The trade at the comparison velocity", value: (r) => fmt(r.alt_d50_micron, 2) + " microns for " + fmt(r.alt_drop_inwg, 2) + " in w.g. -- " + fmt(r.cut_gain_pct, 0) + "% finer cut costs " + fmt(r.drop_rise_pct, 0) + "% more pressure" },
    { key: "n", id: "css-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCycloneSeparatorSizing,
});

// ===================== spec-v1438: gas spring force and mounting geometry =====================
// dims: in { args: dimensionless } out: { lid_moment_in_lb: M L^2 T^-2, force_per_strut_lb: M L T^-2 }
export function computeGasStrutForce({ lid_weight_lb = 0, cg_distance_in = 0, opening_angle_deg = 0, moment_arm_in = 0, struts = 2, second_angle_deg = 0, second_moment_arm_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(lid_weight_lb > 0)) return { error: "Lid weight must be positive." };
  if (!(cg_distance_in > 0)) return { error: "Hinge-to-center-of-gravity distance must be positive." };
  if (!(opening_angle_deg >= 0 && opening_angle_deg < 90)) return { error: "Opening angle must be at least 0 and below 90 degrees." };
  if (!(moment_arm_in > 0)) return { error: "Strut moment arm must be positive." };
  if (!(struts >= 1)) return { error: "There must be at least one strut." };
  if (!(second_angle_deg >= 0 && second_angle_deg < 90)) return { error: "The comparison angle must be at least 0 and below 90 degrees." };
  if (!(second_moment_arm_in > 0)) return { error: "The comparison moment arm must be positive." };
  // Everything is a moment about the hinge. The lid's horizontal reach shortens
  // toward zero as it opens; the strut's arm typically grows and then shrinks.
  const horizontal_cg_in = cg_distance_in * Math.cos(opening_angle_deg * Math.PI / 180);
  const lid_moment_in_lb = lid_weight_lb * horizontal_cg_in;
  const force_per_strut_lb = lid_moment_in_lb / (struts * moment_arm_in);
  const total_force_lb = force_per_strut_lb * struts;
  const second_horizontal_in = cg_distance_in * Math.cos(second_angle_deg * Math.PI / 180);
  const second_moment_in_lb = lid_weight_lb * second_horizontal_in;
  const second_force_per_strut_lb = second_moment_in_lb / (struts * second_moment_arm_in);
  if (![lid_moment_in_lb, force_per_strut_lb, total_force_lb, second_force_per_strut_lb].every(Number.isFinite)) return { error: "Gas-strut math is not a finite value." };
  return {
    horizontal_cg_in, lid_moment_in_lb, force_per_strut_lb, total_force_lb,
    second_horizontal_in, second_moment_in_lb, second_force_per_strut_lb,
    rises_through_swing: second_force_per_strut_lb > force_per_strut_lb,
    note: "The force rating a gas strut needs, from the moment balance nobody writes down. Everything is a moment about the hinge: the lid's weight acts at its center of gravity, which for a uniform panel is halfway along it, and the strut pushes along its own line at whatever perpendicular distance the mounting points give it. That perpendicular distance is the MOMENT ARM, and it is almost always much shorter than the lid's, which is why struts are rated in the tens or hundreds of pounds for lids that weigh far less. The moment arm is also the design variable and the cheapest one to change. A 40 lb hatch with its center of gravity 18 in from the hinge makes a 720 in-lb moment, and two struts on a 4 in arm each need 90 lb. Move the body-side mount out to a 6 in arm and the requirement falls to 60 lb each -- a third less force for a change in one mounting hole location. Move it in to 2.5 in and each strut needs 144 lb, and the hatch becomes genuinely hard to pull closed against them. Two struts halve the requirement, which is why almost everything uses a pair. The catch a first-time designer meets is that both moments change through the swing and they do not change at the same rate. The lid's moment FALLS as it opens, because the horizontal distance to the center of gravity shortens toward zero at vertical; the strut's arm typically grows and then shrinks. A strut sized only at the closed position may hold the lid there and then fling it open, or hold it open and refuse to close, which is why the required force is worth checking at more than one position. Static moment balance at the positions entered. It does not model the gas spring's own force curve, which rises as the rod compresses and falls with cold weather -- a strut is noticeably weaker on a winter morning -- and it does not account for damping, the end-of-stroke behavior, the strut's free length and stroke against the geometry it has to fit, friction at the ball ends, or the fatigue life of the mounting brackets and the panel they bolt to. The strut manufacturer's force curve, stroke, and mounting recommendations govern.",
  };
}

export const gasStrutForceExample = { inputs: { lid_weight_lb: 40, cg_distance_in: 18, opening_angle_deg: 0, moment_arm_in: 4, struts: 2, second_angle_deg: 45, second_moment_arm_in: 5 } };

SHOP_RENDERERS["gas-strut-force"] = _simpleRenderer({
  citation: "Citation: static moment balance about the hinge -- lid moment = weight x horizontal distance to the center of gravity, strut moment = force x perpendicular moment arm, so required force per strut = lid moment / (struts x arm) -- by name. Checked at the positions entered; it does not model the gas spring's own force curve, its rise as the rod compresses, or its loss of force in cold weather. The strut manufacturer's force curve, stroke, and mounting recommendations govern.",
  example: gasStrutForceExample.inputs,
  fields: [
    { key: "lid_weight_lb", label: "Lid or hatch weight (lb)", kind: "number" },
    { key: "cg_distance_in", label: "Hinge to center of gravity, along the lid (in)", kind: "number" },
    { key: "opening_angle_deg", label: "Opening angle being checked (deg, 0 = closed)", kind: "number" },
    { key: "moment_arm_in", label: "Strut perpendicular moment arm at that angle (in)", kind: "number" },
    { key: "struts", label: "Number of struts", kind: "number" },
    { key: "second_angle_deg", label: "Comparison opening angle (deg)", kind: "number" },
    { key: "second_moment_arm_in", label: "Strut moment arm at the comparison angle (in)", kind: "number" },
  ],
  outputs: [
    { key: "m", id: "gsf-out-m", label: "Lid moment about the hinge", value: (r) => fmt(r.lid_moment_in_lb, 0) + " in-lb (" + fmt(r.horizontal_cg_in, 2) + " in of horizontal reach)" },
    { key: "f", id: "gsf-out-f", label: "Required force", value: (r) => fmt(r.force_per_strut_lb, 1) + " lb per strut, " + fmt(r.total_force_lb, 1) + " lb total" },
    { key: "s", id: "gsf-out-s", label: "At the comparison angle", value: (r) => fmt(r.second_force_per_strut_lb, 1) + " lb per strut -- the requirement " + (r.rises_through_swing ? "RISES through the swing, so a strut sized closed may not hold it open" : "falls through the swing, so a strut sized closed can fling it open") },
    { key: "n", id: "gsf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGasStrutForce,
});

// ===================== spec-v1439: spray booth airflow and makeup air load =====================
// dims: in { args: dimensionless } out: { exhaust_cfm: L^3 T^-1, heating_btu_hr: M L^2 T^-3, gas_input_btu_hr: M L^2 T^-3 }
export function computeSprayBoothAirflow({ opening_width_ft = 0, opening_height_ft = 0, face_velocity_fpm = 100, indoor_temp_f = 70, outdoor_temp_f = 0, burner_efficiency = 0.8, hours_per_year = 0, price_per_therm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(opening_width_ft > 0 && opening_height_ft > 0)) return { error: "Booth opening width and height must be positive." };
  if (!(face_velocity_fpm > 0)) return { error: "Design face velocity must be positive." };
  if (!(indoor_temp_f > outdoor_temp_f)) return { error: "Indoor target must be above the outdoor design temperature." };
  if (!(burner_efficiency > 0 && burner_efficiency <= 1)) return { error: "Burner efficiency must be between 0 and 1." };
  if (!(hours_per_year >= 0)) return { error: "Hours of operation cannot be negative." };
  if (!(price_per_therm >= 0)) return { error: "Fuel price cannot be negative." };
  const opening_sqft = opening_width_ft * opening_height_ft;
  // Face velocity is a life-safety requirement, not a design choice, and the
  // airflow follows from the opening whether the booth is spraying or not.
  const exhaust_cfm = opening_sqft * face_velocity_fpm;
  const delta_t = indoor_temp_f - outdoor_temp_f;
  const heating_btu_hr = 1.08 * exhaust_cfm * delta_t;
  const gas_input_btu_hr = heating_btu_hr / burner_efficiency;
  const therms_per_hour = gas_input_btu_hr / 100000;
  const cost_per_hour = therms_per_hour * price_per_therm;
  const annual_cost = cost_per_hour * hours_per_year;
  if (![exhaust_cfm, heating_btu_hr, gas_input_btu_hr, cost_per_hour].every(Number.isFinite)) return { error: "Spray-booth math is not a finite value." };
  return {
    opening_sqft, exhaust_cfm, makeup_cfm: exhaust_cfm, delta_t,
    heating_btu_hr, heating_mbh: heating_btu_hr / 1000, gas_input_btu_hr,
    therms_per_hour, cost_per_hour, annual_cost,
    note: "The airflow a spray booth takes and what it costs to replace it. Booth ventilation is not sized for comfort or even for the paint -- it is sized to keep the vapor concentration far below the lower flammable limit and to keep overspray moving away from the operator. NFPA 33 and OSHA 1910.107 set that as a FACE VELOCITY across the booth opening, commonly 100 fpm for an open-face booth, and the airflow follows from the opening area whether the booth is spraying or not. That air leaves the building and it has to be replaced, and replacing it in January is the expensive part. The sensible load is 1.08 x cfm x delta-T, and at booth airflows the delta-T does not have to be large before the number is enormous: a 14 by 9 ft opening at 100 fpm is 12,600 cfm, and tempering it from 20 F to 70 F is 680,400 BTU/hr -- more than most residential furnaces put out in a day, running whenever the booth runs, and at $1.20 a therm and 80% burner efficiency about $10 an hour in gas alone. That is why booth discipline, spraying in batches and not leaving the fan running, is worth real money. Note what the face velocity does and does not allow: nothing about it is negotiable downward, because it is a life-safety requirement, but a smaller opening is a smaller airflow, and a 10 ft wide booth at the same 100 fpm needs 9,000 cfm and costs 29% less to temper. Airflow and the sensible makeup-air load only. It does not size the fan, the ductwork, or the makeup air unit, does not compute the negative pressure the booth must hold relative to the shop, and does not address filter selection, filter loading and its effect on airflow, the interlocks between the spray equipment and the fan, the electrical classification of the booth and the area around it, or the exhaust stack height and discharge location. Air-solvent concentration, recirculation, and heat recovery are all separate questions with their own code limits. NFPA 33, OSHA 1910.107, the adopted mechanical code, the equipment manufacturer, and the AHJ govern.",
  };
}

export const sprayBoothAirflowExample = { inputs: { opening_width_ft: 14, opening_height_ft: 9, face_velocity_fpm: 100, indoor_temp_f: 70, outdoor_temp_f: 20, burner_efficiency: 0.8, hours_per_year: 1000, price_per_therm: 1.2 } };

SHOP_RENDERERS["spray-booth-airflow"] = _simpleRenderer({
  citation: "Citation: spray booth exhaust airflow from the design FACE VELOCITY across the booth opening, the requirement NFPA 33 and OSHA 1910.107 set (commonly 100 fpm open-face), cited by name and not reproduced; makeup-air sensible load from the standard-air relation 1.08 x cfm x delta-T. Airflow and the sensible load only -- it sizes no fan, duct, or makeup air unit and addresses no filter, interlock, electrical classification, or stack requirement. NFPA 33, OSHA 1910.107, the adopted mechanical code, and the AHJ govern.",
  example: sprayBoothAirflowExample.inputs,
  fields: [
    { key: "opening_width_ft", label: "Booth opening width (ft)", kind: "number" },
    { key: "opening_height_ft", label: "Booth opening height (ft)", kind: "number" },
    { key: "face_velocity_fpm", label: "Design face velocity (fpm)", kind: "number" },
    { key: "indoor_temp_f", label: "Indoor target temperature (F)", kind: "number" },
    { key: "outdoor_temp_f", label: "Outdoor design temperature (F)", kind: "number", attrs: { step: "any" } },
    { key: "burner_efficiency", label: "Makeup air unit efficiency (0 to 1)", kind: "number" },
    { key: "hours_per_year", label: "Booth hours per year", kind: "number" },
    { key: "price_per_therm", label: "Gas price ($/therm)", kind: "number" },
  ],
  outputs: [
    { key: "a", id: "sba-out-a", label: "Exhaust and makeup airflow", value: (r) => fmt(r.exhaust_cfm, 0) + " cfm across " + fmt(r.opening_sqft, 0) + " sq ft of opening" },
    { key: "l", id: "sba-out-l", label: "Makeup air heating load", value: (r) => fmt(r.heating_btu_hr, 0) + " BTU/hr (" + fmt(r.heating_mbh, 0) + " MBH) over a " + fmt(r.delta_t, 0) + " F rise" },
    { key: "g", id: "sba-out-g", label: "Gas input required", value: (r) => fmt(r.gas_input_btu_hr, 0) + " BTU/hr = " + fmt(r.therms_per_hour, 2) + " therms per hour" },
    { key: "c", id: "sba-out-c", label: "Operating cost", value: (r) => "$" + fmt(r.cost_per_hour, 2) + " per hour, $" + fmt(r.annual_cost, 0) + " over the hours entered" },
    { key: "n", id: "sba-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSprayBoothAirflow,
});

// ===================== spec-v1440: powder coating coverage and reclaim =====================
// dims: in { args: dimensionless } out: { theoretical_coverage_sqft_lb: L^2 M^-1, powder_required_lb: M }
export function computePowderCoatingCoverage({ specific_gravity = 0, film_thickness_mils = 0, part_area_sqft = 0, transfer_efficiency = 0.6, reclaim_efficiency = 0, price_per_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(specific_gravity > 0)) return { error: "Powder specific gravity must be positive." };
  if (!(film_thickness_mils > 0)) return { error: "Film thickness must be positive." };
  if (!(part_area_sqft > 0)) return { error: "Part surface area must be positive." };
  if (!(transfer_efficiency > 0 && transfer_efficiency <= 1)) return { error: "Transfer efficiency must be between 0 and 1." };
  if (!(reclaim_efficiency >= 0 && reclaim_efficiency <= 1)) return { error: "Reclaim efficiency must be between 0 and 1." };
  if (!(price_per_lb >= 0)) return { error: "Powder price cannot be negative." };
  // 192.7 is the standard powder-coating constant: sq ft per lb at 1 mil and SG 1.0.
  const theoretical_coverage_sqft_lb = 192.7 / (specific_gravity * film_thickness_mils);
  const waste_coverage = theoretical_coverage_sqft_lb * transfer_efficiency;
  const waste_powder_lb = part_area_sqft / waste_coverage;
  // Reclaim recovers the overspray, so the utilisation is the first pass plus
  // the recovered share of what missed.
  const utilization = transfer_efficiency + (1 - transfer_efficiency) * reclaim_efficiency;
  const reclaim_coverage = theoretical_coverage_sqft_lb * utilization;
  const reclaim_powder_lb = part_area_sqft / reclaim_coverage;
  const saving_pct = (1 - reclaim_powder_lb / waste_powder_lb) * 100;
  const waste_cost = waste_powder_lb * price_per_lb;
  const reclaim_cost = reclaim_powder_lb * price_per_lb;
  if (![theoretical_coverage_sqft_lb, waste_coverage, waste_powder_lb, utilization, reclaim_powder_lb].every(Number.isFinite)) return { error: "Powder coating math is not a finite value." };
  return {
    theoretical_coverage_sqft_lb, waste_coverage, waste_powder_lb,
    utilization, reclaim_coverage, reclaim_powder_lb, saving_pct,
    waste_cost, reclaim_cost, cost_saving: waste_cost - reclaim_cost,
    note: "How much powder a job takes, and the two factors that move the answer by a factor of two. Theoretical coverage is fixed by physics -- specific gravity and film thickness -- and no shop achieves it, because what leaves the gun is not all what lands on the part. TRANSFER EFFICIENCY is the first-pass share, typically 60% or so on manual equipment, and what misses becomes overspray. RECLAIM is the second factor and it is the one that decides the booth: a reclaim booth recovers the overspray and returns it to the hopper, so the utilisation is the first pass plus the recovered share of what missed, which pushes a 60% transfer efficiency to 98%. A powder of specific gravity 1.5 at 2.0 mils covers 64.2 sq ft per pound theoretically. Sprayed to waste at 60% transfer that is 38.5 sq ft per pound and a 500 sq ft job takes 13.0 lb; with 95% reclaim the effective coverage rises to 62.9 and the same job takes 7.9 lb. Thirteen pounds against eight is a 39% cut in material on one job, and at four to eight dollars a pound across a production year that difference is the reclaim booth's payback. Then check the thickness discipline, because it outweighs the transfer efficiency: running the same job at 3.0 mils instead of 2.0 pushes the no-reclaim requirement from 13.0 lb to 19.5 lb. Material only. Part surface area is the input this is most sensitive to and it is genuinely hard to estimate on a complex part, where the Faraday cage effect in inside corners and recesses both lowers transfer efficiency and leaves those areas thin. It does not address cure schedule, film build uniformity, pretreatment, color change losses in a reclaim system -- which are substantial and are why some shops spray to waste deliberately -- powder shelf life, or the contamination that ends a reclaim batch. The powder manufacturer's technical data sheet, the coating specification's film thickness range, and the booth manufacturer govern.",
  };
}

export const powderCoatingCoverageExample = { inputs: { specific_gravity: 1.5, film_thickness_mils: 2, part_area_sqft: 500, transfer_efficiency: 0.6, reclaim_efficiency: 0.95, price_per_lb: 6 } };

SHOP_RENDERERS["powder-coating-coverage"] = _simpleRenderer({
  citation: "Citation: theoretical powder coverage = 192.7 / (specific gravity x film thickness in mils), the standard powder-coating constant (sq ft per lb at 1 mil and SG 1.0), by name; effective coverage from transfer efficiency, and reclaim utilisation = transfer + (1 - transfer) x reclaim efficiency. Material only -- no cure schedule, film uniformity, pretreatment, Faraday-cage effect, or reclaim color-change loss. The powder manufacturer's technical data sheet and the coating specification govern.",
  example: powderCoatingCoverageExample.inputs,
  fields: [
    { key: "specific_gravity", label: "Powder specific gravity", kind: "number" },
    { key: "film_thickness_mils", label: "Target film thickness (mils)", kind: "number" },
    { key: "part_area_sqft", label: "Part surface area (sq ft)", kind: "number" },
    { key: "transfer_efficiency", label: "Transfer efficiency (0 to 1)", kind: "number" },
    { key: "reclaim_efficiency", label: "Reclaim efficiency (0 to 1, 0 = spray to waste)", kind: "number" },
    { key: "price_per_lb", label: "Powder price ($/lb)", kind: "number" },
  ],
  outputs: [
    { key: "t", id: "pcc-out-t", label: "Theoretical coverage", value: (r) => fmt(r.theoretical_coverage_sqft_lb, 1) + " sq ft per lb at this SG and film build" },
    { key: "w", id: "pcc-out-w", label: "Sprayed to waste", value: (r) => fmt(r.waste_coverage, 1) + " sq ft/lb effective, " + fmt(r.waste_powder_lb, 1) + " lb for the job ($" + fmt(r.waste_cost, 0) + ")" },
    { key: "r", id: "pcc-out-r", label: "With reclaim", value: (r) => fmt(r.utilization * 100, 0) + "% utilisation, " + fmt(r.reclaim_coverage, 1) + " sq ft/lb, " + fmt(r.reclaim_powder_lb, 1) + " lb ($" + fmt(r.reclaim_cost, 0) + ")" },
    { key: "s", id: "pcc-out-s", label: "What reclaim buys", value: (r) => fmt(r.saving_pct, 0) + "% less powder, $" + fmt(r.cost_saving, 0) + " on this job" },
    { key: "n", id: "pcc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePowderCoatingCoverage,
});

// ===================== spec-v1441: plating tank current and time (Faraday) =====================
// dims: in { args: dimensionless } out: { total_current_a: I, plating_time_s: T, thickness_rate_in_hr: L T^-1 }
export function computePlatingTankCurrent({ current_density_asf = 0, part_area_sqft = 0, atomic_weight = 0, valence = 0, metal_density_gcc = 0, current_efficiency = 0.95, target_thickness_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(current_density_asf > 0)) return { error: "Current density must be positive." };
  if (!(part_area_sqft > 0)) return { error: "Part surface area must be positive." };
  if (!(atomic_weight > 0)) return { error: "Atomic weight must be positive." };
  if (!(valence > 0)) return { error: "Valence must be positive." };
  if (!(metal_density_gcc > 0)) return { error: "Metal density must be positive." };
  if (!(current_efficiency > 0 && current_efficiency <= 1)) return { error: "Current efficiency must be between 0 and 1." };
  if (!(target_thickness_in > 0)) return { error: "Target thickness must be positive." };
  const FARADAY = 96485; // C/mol
  const total_current_a = current_density_asf * part_area_sqft;
  // Faraday's law: mass is EXACTLY proportional to charge passed. What the bath
  // chemistry changes is the current efficiency, not the constant.
  const mass_rate_g_s = total_current_a * atomic_weight / (valence * FARADAY) * current_efficiency;
  const volume_rate_cm3_s = mass_rate_g_s / metal_density_gcc;
  const area_cm2 = part_area_sqft * 929.0304;
  const thickness_rate_cm_s = volume_rate_cm3_s / area_cm2;
  const target_cm = target_thickness_in * 2.54;
  const plating_time_s = target_cm / thickness_rate_cm_s;
  const plating_time_min = plating_time_s / 60;
  const thickness_rate_in_hr = thickness_rate_cm_s / 2.54 * 3600;
  const deposit_mass_g = mass_rate_g_s * plating_time_s;
  if (![total_current_a, mass_rate_g_s, thickness_rate_cm_s, plating_time_s, thickness_rate_in_hr].every(Number.isFinite)) return { error: "Plating math is not a finite value." };
  return {
    total_current_a, mass_rate_g_s, volume_rate_cm3_s, area_cm2,
    thickness_rate_cm_s, thickness_rate_in_hr, plating_time_s, plating_time_min, deposit_mass_g,
    note: "Plating and anodizing are the one shop process governed by an exact physical law, and this is that law. Faraday's law of electrolysis says the mass deposited is exactly proportional to the charge passed, with the constant of proportionality being the metal's equivalent weight over the Faraday constant. Nothing about the bath chemistry, the additives, or the operator changes that -- what they change is CURRENT EFFICIENCY, the fraction of the current that deposits metal rather than evolving hydrogen. Nickel baths run near 95%; decorative chromium baths run in the teens, which is why chrome plating is so slow and so power-hungry, and running the same geometry in a 15% bath drops the deposition rate by more than six times before any other difference is counted. The useful reading is that CURRENT DENSITY, not total current, sets the rate: a part twice as large needs twice the current to plate in the same time, and a rectifier that cannot deliver it simply plates slower -- doubling the rack area without doubling the rectifier halves the current density and doubles the time. Current density also has upper and lower limits set by the bath, too low and coverage is poor, too high and the deposit burns, so the practical rate is bounded by chemistry rather than by the power supply. Nickel at 40 A per sq ft over 20 sq ft of part at 95% efficiency draws 800 A and lays a mil down in about 30 minutes, which matches shop experience closely, because Faraday's law is not an approximation. The sacrificial-anode life calculation here runs the same law in the other direction, on metal being consumed rather than deposited. AVERAGE thickness only, which is the number Faraday's law gives and not the number an inspector measures. Real deposits are not uniform: current concentrates at edges and points and starves in recesses, so a rack that averages a mil may be well over on a corner and well under in a bore, and throwing power, anode placement, robbers, and shields are the whole craft of fixing that. It does not address bath composition, temperature, agitation, filtration, pretreatment and cleaning -- which decide adhesion -- hydrogen embrittlement and the bake that relieves it, rectifier ripple, or waste treatment. Plating baths are hazardous chemistry with serious ventilation, PPE, and disposal requirements. The bath supplier's data, the plating specification, and the applicable environmental and safety regulations govern.",
  };
}

export const platingTankCurrentExample = { inputs: { current_density_asf: 40, part_area_sqft: 20, atomic_weight: 58.69, valence: 2, metal_density_gcc: 8.9, current_efficiency: 0.95, target_thickness_in: 0.001 } };

SHOP_RENDERERS["plating-tank-current"] = _simpleRenderer({
  citation: "Citation: Faraday's law of electrolysis, mass rate = current x atomic weight / (valence x 96,485 C/mol) x current efficiency, by name, with the deposit thickness rate following from the metal's density and the part's surface area. AVERAGE thickness only -- real deposits concentrate at edges and starve in recesses, which throwing power, anode placement, robbers, and shields address. The bath supplier's data, the plating specification, and the applicable environmental and safety regulations govern.",
  example: platingTankCurrentExample.inputs,
  fields: [
    { key: "current_density_asf", label: "Current density (A per sq ft)", kind: "number" },
    { key: "part_area_sqft", label: "Part surface area (sq ft)", kind: "number" },
    { key: "atomic_weight", label: "Metal atomic weight (g/mol)", kind: "number" },
    { key: "valence", label: "Valence (electrons per ion)", kind: "number" },
    { key: "metal_density_gcc", label: "Metal density (g/cm3)", kind: "number" },
    { key: "current_efficiency", label: "Cathode current efficiency (0 to 1)", kind: "number" },
    { key: "target_thickness_in", label: "Target thickness (in)", kind: "number" },
  ],
  outputs: [
    { key: "i", id: "ptc-out-i", label: "Total current", value: (r) => fmt(r.total_current_a, 0) + " A into " + fmt(r.area_cm2, 0) + " cm2 of part" },
    { key: "m", id: "ptc-out-m", label: "Deposition rate", value: (r) => fmt(r.mass_rate_g_s, 4) + " g/s = " + fmt(r.thickness_rate_in_hr * 1000, 3) + " mils per hour" },
    { key: "t", id: "ptc-out-t", label: "Time to the target thickness", value: (r) => fmt(r.plating_time_s, 0) + " s = " + fmt(r.plating_time_min, 1) + " minutes" },
    { key: "d", id: "ptc-out-d", label: "Metal deposited", value: (r) => fmt(r.deposit_mass_g, 1) + " g over the run (average thickness -- edges run heavy, recesses thin)" },
    { key: "n", id: "ptc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePlatingTankCurrent,
});

// ===================== spec-v1442: heat-treat soak time and furnace load =====================
// dims: in { args: dimensionless } out: { total_at_temp_hr: T, charge_heat_btu: M L^2 T^-2, furnace_input_btu_hr: M L^2 T^-3 }
export function computeHeatTreatSoakTime({ charge_weight_lb = 0, section_thickness_in = 0, soak_temp_f = 0, start_temp_f = 70, through_heat_rate_hr_per_in = 1, soak_rate_hr_per_in = 1, specific_heat = 0.12, furnace_efficiency = 0.6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(charge_weight_lb > 0)) return { error: "Charge weight must be positive." };
  if (!(section_thickness_in > 0)) return { error: "Maximum section thickness must be positive." };
  if (!(soak_temp_f > start_temp_f)) return { error: "Soak temperature must be above the starting temperature." };
  if (!(through_heat_rate_hr_per_in > 0)) return { error: "Through-heat rate must be positive." };
  if (!(soak_rate_hr_per_in > 0)) return { error: "Soak rate must be positive." };
  if (!(specific_heat > 0)) return { error: "Specific heat must be positive." };
  if (!(furnace_efficiency > 0 && furnace_efficiency <= 1)) return { error: "Furnace efficiency must be between 0 and 1." };
  // Soak is governed by SECTION THICKNESS, not by weight.
  const through_heat_hr = through_heat_rate_hr_per_in * section_thickness_in;
  const soak_hr = soak_rate_hr_per_in * section_thickness_in;
  const total_at_temp_hr = through_heat_hr + soak_hr;
  const delta_t = soak_temp_f - start_temp_f;
  const charge_heat_btu = charge_weight_lb * specific_heat * delta_t;
  const furnace_input_btu_hr = charge_heat_btu / (through_heat_hr * furnace_efficiency);
  const furnace_input_kw = furnace_input_btu_hr / 3412.14;
  if (![through_heat_hr, soak_hr, total_at_temp_hr, charge_heat_btu, furnace_input_btu_hr].every(Number.isFinite)) return { error: "Heat-treat math is not a finite value." };
  return {
    through_heat_hr, soak_hr, total_at_temp_hr, delta_t,
    charge_heat_btu, furnace_input_btu_hr, furnace_input_kw,
    note: "The two numbers a shop needs before loading a furnace: how long the charge has to sit at temperature, and how much energy it takes to get there. Soak time is governed by SECTION THICKNESS, not by weight. A hundred pounds of half-inch bar and a hundred pounds of two-inch bar are entirely different soaks, because what has to happen is that the CENTER of the thickest section reaches temperature and then stays there long enough for the transformation to complete. The common rule -- roughly an hour per inch of section at temperature, after the part is through-heated -- is a convention with a lot of process-specific variation behind it, and it is separate from the time it takes to get the part hot in the first place, which is why both terms are printed. The thickness leverage is the whole lesson: a 4 in section doubles both the through-heat and the soak, for a charge that may weigh exactly the same. In heat treating, geometry beats weight every time. The energy side sizes the furnace, and the surprise is usually how much of the furnace's input never reaches the work: wall losses, opening losses, atmosphere, and fixturing all consume a large share, and 50% to 70% overall efficiency is common on a batch furnace. A 500 lb charge of alloy steel taken to 1,550 F from room temperature absorbs 88,800 BTU, and delivering it during a two-hour ramp at 60% efficiency needs about 74,000 BTU/hr, or 21.7 kW -- which is the number that says whether the shop's furnace and its circuit can run this charge on schedule. Time and energy only, and the soak rule is a convention rather than a metallurgical prediction. THIS DOES NOT SPECIFY A HEAT TREATMENT. The austenitizing temperature, the soak time, the quench medium, the temper, and the resulting properties come from the steel's own specification and the applicable process standard (AMS 2759, ASTM A991, or the customer's own), and they depend on the alloy, the prior condition, the required hardness and toughness, and the section size. It does not address atmosphere and decarburization, fixturing and distortion, ramp rates and thermal shock on thick or complex sections, pyrometry and thermocouple placement, or the survey and calibration requirements a certified shop works under. The steel's specification, the process standard, and the metallurgist govern.",
  };
}

export const heatTreatSoakTimeExample = { inputs: { charge_weight_lb: 500, section_thickness_in: 2, soak_temp_f: 1550, start_temp_f: 70, through_heat_rate_hr_per_in: 1, soak_rate_hr_per_in: 1, specific_heat: 0.12, furnace_efficiency: 0.6 } };

SHOP_RENDERERS["heat-treat-soak-time"] = _simpleRenderer({
  citation: "Citation: the section-thickness soak convention used in heat-treating practice -- through-heat and soak each proportional to the maximum section thickness, commonly about one hour per inch at temperature -- by name, and charge heat from the sensible-heat relation weight x specific heat x temperature rise, divided by the furnace's overall efficiency for the input. Time and energy only. THIS SPECIFIES NO HEAT TREATMENT: temperature, soak, quench, temper, and properties come from the steel's specification and the applicable process standard. The metallurgist governs.",
  example: heatTreatSoakTimeExample.inputs,
  fields: [
    { key: "charge_weight_lb", label: "Charge weight (lb)", kind: "number" },
    { key: "section_thickness_in", label: "Maximum section thickness (in)", kind: "number" },
    { key: "soak_temp_f", label: "Soak temperature (F)", kind: "number" },
    { key: "start_temp_f", label: "Starting temperature (F)", kind: "number", attrs: { step: "any" } },
    { key: "through_heat_rate_hr_per_in", label: "Through-heat rate (hr per in)", kind: "number" },
    { key: "soak_rate_hr_per_in", label: "Soak rate (hr per in)", kind: "number" },
    { key: "specific_heat", label: "Specific heat (BTU/lb-F)", kind: "number" },
    { key: "furnace_efficiency", label: "Furnace overall efficiency (0 to 1)", kind: "number" },
  ],
  outputs: [
    { key: "t", id: "htst-out-t", label: "Time at temperature", value: (r) => fmt(r.total_at_temp_hr, 2) + " hr = " + fmt(r.through_heat_hr, 2) + " through-heat + " + fmt(r.soak_hr, 2) + " soak" },
    { key: "q", id: "htst-out-q", label: "Charge heat", value: (r) => fmt(r.charge_heat_btu, 0) + " BTU over a " + fmt(r.delta_t, 0) + " F rise" },
    { key: "i", id: "htst-out-i", label: "Furnace input during the ramp", value: (r) => fmt(r.furnace_input_btu_hr, 0) + " BTU/hr = " + fmt(r.furnace_input_kw, 1) + " kW delivered" },
    { key: "n", id: "htst-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHeatTreatSoakTime,
});

// ===================== spec-v1443: quench severity and the Biot screen =====================
// dims: in { args: dimensionless } out: { biot: dimensionless, second_biot: dimensionless }
export function computeQuenchSeverity({ grossmann_h = 0, section_diameter_in = 0, second_grossmann_h = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(grossmann_h > 0)) return { error: "Grossmann H-value must be positive." };
  if (!(section_diameter_in > 0)) return { error: "Section diameter must be positive." };
  if (!(second_grossmann_h > 0)) return { error: "The comparison H-value must be positive." };
  const radius_in = section_diameter_in / 2;
  // Bi = h r / k = 2 H r. Below 0.5 the SURFACE is the bottleneck; above 2 the
  // section is, and a more severe quench buys almost nothing at the center.
  const regime = (bi) => bi < 0.5 ? "surface-limited -- quenchant and agitation dominate" : bi > 2 ? "conduction-limited -- the section governs and agitation buys little" : "transitional -- agitation helps, but less than the H ratio suggests";
  const biot = 2 * grossmann_h * radius_in;
  const second_biot = 2 * second_grossmann_h * radius_in;
  const h_ratio = second_grossmann_h / grossmann_h;
  const worth_it = biot < 0.5 && second_biot < 0.5;
  if (![radius_in, biot, second_biot, h_ratio].every(Number.isFinite)) return { error: "Quench-severity math is not a finite value." };
  return {
    radius_in, biot, second_biot, h_ratio,
    regime: regime(biot), second_regime: regime(second_biot), worth_it,
    verdict: worth_it
      ? "Both conditions are surface-limited, so stepping up to H = " + fmt(second_grossmann_h, 2) + " raises the cooling rate by roughly the H ratio of " + fmt(h_ratio, 2) + "x"
      : biot > 2
        ? "Already conduction-limited at H = " + fmt(grossmann_h, 2) + ": a more severe quench changes the surface and does essentially nothing at the core, while adding distortion and cracking risk"
        : "Partly conduction-limited: the step up buys real but sub-proportional improvement at the core",
    note: "Whether agitating the quench is worth doing, which depends entirely on which regime the part is in. Everyone reaches for more agitation when a quench comes out soft, and on a thick section it does almost nothing -- because the heat is not surface-limited, it is conduction-limited. Grossmann's H-value is the standard ranking of quench severity, and the usual table runs from still oil near 0.25, through agitated oil near 0.4, still water near 1.0, agitated water near 1.5, up to agitated brine above 2.0. What that table does not say is when moving up it helps. The Biot number answers that. It is the ratio of the internal conduction resistance to the surface transfer resistance. When it is SMALL the surface is the bottleneck -- heat cannot get OFF the part fast enough, and anything that improves the surface condition, a more severe quenchant, more agitation, better fixturing so the vapor blanket breaks, directly improves the cooling rate. When it is LARGE the surface is already removing heat faster than the interior can supply it, the center cools at a rate set by the steel's own conductivity, and a more severe quench changes the surface and does essentially nothing at the core while adding distortion and cracking risk. On a 1 in bar, still oil gives a Biot of 0.25 and agitated oil 0.40 -- both surface-limited, so the move from still to agitated raises the cooling rate by roughly the H ratio of 1.6 times, and the quenchant is the whole story. On a 6 in bar, still water gives 6.0 and agitated brine 12.0 -- both conduction-limited, so doubling the severity barely moves the center cooling rate and mostly doubles the gradient. Those two sentences are the reason large sections are made from deep-hardening alloys and small ones are not. A REGIME SCREEN, not a hardness prediction. It says whether agitation is worth doing; it does not say what hardness results, which needs the steel's hardenability (its Jominy curve or its ideal diameter), its chemistry, the prior microstructure, and a CCT diagram. Grossmann H-values are themselves approximate rankings from a bar-quench correlation, not physical properties, and real quenching passes through vapor-blanket, boiling, and convection stages with wildly different heat-transfer coefficients rather than the single value the number implies. It does not address distortion, quench cracking, residual stress, part orientation and racking, quenchant temperature and contamination, or the temper that must follow. The steel's specification, its hardenability data, and the metallurgist govern.",
  };
}

export const quenchSeverityExample = { inputs: { grossmann_h: 0.25, section_diameter_in: 1, second_grossmann_h: 0.4 } };

SHOP_RENDERERS["quench-severity"] = _simpleRenderer({
  citation: "Citation: Grossmann's quench severity H-value as the standard ranking (still oil about 0.25, agitated oil about 0.4, still water about 1.0, agitated water about 1.5, agitated brine above 2.0), cited by name and entered rather than looked up, with the Biot number Bi = h r / k = 2 H r and the conventional surface-limited (Bi below 0.5) and conduction-limited (Bi above 2) regimes. A REGIME SCREEN, not a hardness prediction: hardness needs the steel's hardenability, chemistry, and a CCT diagram. The metallurgist governs.",
  example: quenchSeverityExample.inputs,
  fields: [
    { key: "grossmann_h", label: "Grossmann H-value of the quench", kind: "number" },
    { key: "section_diameter_in", label: "Section diameter (in)", kind: "number" },
    { key: "second_grossmann_h", label: "H-value of the quench being considered", kind: "number" },
  ],
  outputs: [
    { key: "b", id: "qs-out-b", label: "Biot number as quenched", value: (r) => fmt(r.biot, 2) + " at a " + fmt(r.radius_in, 2) + " in radius -- " + r.regime },
    { key: "s", id: "qs-out-s", label: "Biot number at the stronger quench", value: (r) => fmt(r.second_biot, 2) + " -- " + r.second_regime },
    { key: "v", id: "qs-out-v", label: "Is stepping up worth it", value: (r) => r.verdict },
    { key: "n", id: "qs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeQuenchSeverity,
});

// ===================== spec-v1444: belt conveyor tension and drive power =====================
// dims: in { args: dimensionless } out: { effective_tension_lb: M L T^-2, belt_hp: M L^2 T^-3, motor_hp: M L^2 T^-3 }
export function computeBeltConveyorTensionPower({ tons_per_hour = 0, belt_speed_fpm = 0, length_ft = 0, lift_ft = 0, belt_weight_plf = 0, idler_weight_plf = 0, friction_factor = 0.022, drive_efficiency = 0.85 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(tons_per_hour > 0)) return { error: "Capacity in tons per hour must be positive." };
  if (!(belt_speed_fpm > 0)) return { error: "Belt speed must be positive." };
  if (!(length_ft > 0)) return { error: "Conveyor length must be positive." };
  if (!(lift_ft >= 0)) return { error: "Lift cannot be negative." };
  if (!(belt_weight_plf > 0)) return { error: "Belt weight per foot must be positive." };
  if (!(idler_weight_plf >= 0)) return { error: "Idler rotating weight per foot cannot be negative." };
  if (!(friction_factor > 0)) return { error: "Friction factor must be positive." };
  if (!(drive_efficiency > 0 && drive_efficiency <= 1)) return { error: "Drive efficiency must be between 0 and 1." };
  const material_load_plf = tons_per_hour * 2000 / (belt_speed_fpm * 60);
  // The belt counts TWICE -- carrying side and return side.
  const friction_term_lb = friction_factor * length_ft * (2 * belt_weight_plf + material_load_plf + idler_weight_plf);
  const lift_term_lb = lift_ft * material_load_plf;
  const effective_tension_lb = friction_term_lb + lift_term_lb;
  const belt_hp = effective_tension_lb * belt_speed_fpm / 33000;
  const motor_hp = belt_hp / drive_efficiency;
  const lift_share_pct = effective_tension_lb > 0 ? lift_term_lb / effective_tension_lb * 100 : 0;
  if (![material_load_plf, friction_term_lb, lift_term_lb, effective_tension_lb, belt_hp, motor_hp].every(Number.isFinite)) return { error: "Belt-conveyor math is not a finite value." };
  return {
    material_load_plf, friction_term_lb, lift_term_lb, effective_tension_lb,
    belt_hp, motor_hp, lift_share_pct,
    dominant: lift_term_lb > friction_term_lb ? "lift" : "friction",
    lever: lift_term_lb > friction_term_lb
      ? "the profile, not the maintenance -- perfect idlers would save a fraction of a horsepower and no amount of maintenance touches the rise"
      : "idler condition, alignment, and belt tension, because friction is nearly everything on this run",
    note: "What a belt conveyor's drive has to deliver, split into the two physically different things it is made of. EFFECTIVE TENSION is the force the drive pulley must produce. The FRICTION term is everything that resists motion along the run -- the belt itself counted on BOTH the carrying and the return sides, the material, and the rotating mass of the idlers -- multiplied by a friction factor around 0.022 for a well-maintained conveyor and by the length. The LIFT term is the potential energy being added, and it is the material weight per foot times the rise. Nothing else. Which term dominates decides what to fix, and that is the whole point of printing them separately. A 100 ft conveyor lifting 20 ft with 200 tons an hour at 300 fpm carries 22.2 lb of material per foot, and its lift term of 444 lb is five times its friction term of 88 lb: perfect idlers would save under a horsepower and cutting the rise in half would save two and a half, so if the motor is marginal the answer is the profile, not the maintenance. Reverse the geometry to 500 ft of flat run at the same tonnage and the friction term becomes 442 lb with no lift term at all, and now idler condition and alignment are the entire conversation. On a long flat conveyor friction is nearly everything; on a short steep one lift is nearly everything and the only ways down are less material or less rise. Effective tension and drive power only, on the simplified CEMA form. It does not compute the tension distribution around the loop, the slack-side tension needed to prevent drive-pulley slip or to keep the belt from sagging between idlers, or the take-up travel that maintains it, and it does not size the belt itself -- carcass rating, ply, cover, or splice. Acceleration, braking, and the runaway condition on a declining conveyor are separate and important problems, as is the belt tension the starting method produces. Skirtboard, plow, and tripper losses, material acceleration at the loading point, and the effect of temperature and belt condition on the friction factor are all outside it. CEMA's Belt Conveyors for Bulk Materials, the belt and idler manufacturers, and the engineer of record govern.",
  };
}

export const beltConveyorTensionPowerExample = { inputs: { tons_per_hour: 200, belt_speed_fpm: 300, length_ft: 100, lift_ft: 20, belt_weight_plf: 5, idler_weight_plf: 8, friction_factor: 0.022, drive_efficiency: 0.85 } };

SHOP_RENDERERS["belt-conveyor-tension-power"] = _simpleRenderer({
  citation: "Citation: the simplified CEMA effective-tension form -- Te = f x L x (2 Wb + Wm + Wrot) + H x Wm, with the belt counted on both the carrying and return sides -- and belt horsepower = Te x speed / 33,000, by name; the friction factor (about 0.022 for a well-maintained conveyor) and the idler rotating weight are entered rather than tabulated. Effective tension and drive power only -- no tension distribution, slack-side tension, take-up, belt carcass selection, or acceleration and braking. CEMA's Belt Conveyors for Bulk Materials, the belt and idler manufacturers, and the engineer of record govern.",
  example: beltConveyorTensionPowerExample.inputs,
  fields: [
    { key: "tons_per_hour", label: "Capacity (tons per hour)", kind: "number" },
    { key: "belt_speed_fpm", label: "Belt speed (fpm)", kind: "number" },
    { key: "length_ft", label: "Conveyor length (ft)", kind: "number" },
    { key: "lift_ft", label: "Lift (ft)", kind: "number" },
    { key: "belt_weight_plf", label: "Belt weight (lb per ft)", kind: "number" },
    { key: "idler_weight_plf", label: "Idler rotating weight (lb per ft)", kind: "number" },
    { key: "friction_factor", label: "Friction factor", kind: "number" },
    { key: "drive_efficiency", label: "Drive efficiency (0 to 1)", kind: "number" },
  ],
  outputs: [
    { key: "w", id: "bctp-out-w", label: "Material load on the belt", value: (r) => fmt(r.material_load_plf, 1) + " lb per ft of belt" },
    { key: "t", id: "bctp-out-t", label: "Effective tension", value: (r) => fmt(r.effective_tension_lb, 1) + " lb = " + fmt(r.friction_term_lb, 1) + " friction + " + fmt(r.lift_term_lb, 1) + " lift" },
    { key: "d", id: "bctp-out-d", label: "Which term dominates", value: (r) => "the " + r.dominant + " term at " + fmt(r.lift_share_pct, 0) + "% lift -- the lever is " + r.lever },
    { key: "p", id: "bctp-out-p", label: "Power", value: (r) => fmt(r.belt_hp, 2) + " belt hp, " + fmt(r.motor_hp, 2) + " hp at the motor" },
    { key: "n", id: "bctp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBeltConveyorTensionPower,
});
