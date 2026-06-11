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
  DEBOUNCE_MS, debounce, makeNumber, makeText, makeSelect,
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
