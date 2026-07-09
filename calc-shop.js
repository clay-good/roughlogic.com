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
// over three wires M = E + 3W - 1.51553 P. First-principles geometry.
// =====================================================================

const _V40_BESTWIRE = 1 / (2 * Math.cos(Math.PI / 6)); // 0.5773502691896258
const _V40_MOW_K = 1.51553; // 60-degree measurement-over-wires constant

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
  notes.push("For a 60-degree thread, best wire W = P / (2 cos30) = 0.57735 x P (acceptable range 0.560P to 0.650P); the measurement over three wires M = E + 3W - 1.51553 x P. First-principles thread geometry; the pitch diameter E is user-supplied (no thread-class table here).");
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
  citationEl.textContent = "Citation: The three-wire measurement-over-wires method for 60-degree threads - best wire W = 0.57735 x P, M = E + 3W - 1.51553 x P - first-principles geometry as in Machinery's Handbook (Industrial Press), by name; public domain. The pitch diameter E is user-supplied (no thread-class table lookup).";
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
  const spring = makeNumber("Spring angle (deg, 38 or 45)", "cm-spring", { step: "any", min: "0", value: "38" }); spring.input.value = "38";
  const corner = makeNumber("Wall corner angle (deg, 90 square)", "cm-corner", { step: "any", min: "0", value: "90" }); corner.input.value = "90";
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
  const gap = makeNumber("Nominal (mean) gap (in)", "tsr-gap", { step: "any" }); gap.input.value = "0.020";
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
  const r = makeNumber("Base radius (in)", "cfp-r", { step: "any", min: "0" }); r.input.value = "6";
  const h = makeNumber("Vertical height (in)", "cfp-h", { step: "any", min: "0" }); h.input.value = "8";
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
  const d = makeNumber("Interface diameter D (in)", "pfp-d", { step: "any", min: "0" }); d.input.value = "2";
  const i = makeNumber("Diametral interference (in)", "pfp-i", { step: "any", min: "0" }); i.input.value = "0.002";
  const dout = makeNumber("Hub outer diameter Do (in)", "pfp-do", { step: "any", min: "0" }); dout.input.value = "4";
  const e = makeNumber("Elastic modulus E (psi, steel ~30e6)", "pfp-e", { step: "any", min: "0" }); e.input.value = "30000000";
  const mu = makeNumber("Friction coefficient (~0.12 dry steel)", "pfp-mu", { step: "any", min: "0" }); mu.input.value = "0.12";
  const len = makeNumber("Engagement length L (in)", "pfp-l", { step: "any", min: "0" }); len.input.value = "3";
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
  const n1 = makeNumber("Small sprocket teeth N1", "rcl-n1", { step: "1", min: "1" }); n1.input.value = "17";
  const n2 = makeNumber("Large sprocket teeth N2", "rcl-n2", { step: "1", min: "1" }); n2.input.value = "51";
  const c = makeNumber("Nominal center distance C (in)", "rcl-c", { step: "any", min: "0" }); c.input.value = "30";
  const p = makeNumber("Chain pitch p (in, #40 = 0.5)", "rcl-p", { step: "any", min: "0" }); p.input.value = "0.5";
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
