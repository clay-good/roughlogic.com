// Group B: storm-drainage and sump/ejector sizing (spec-v62).
//
// spec-v73 cap-relief split: the two spec-v62 plumbing tiles
// (roof-drain-sizing, sump-basin-sizing) were extracted verbatim from
// calc-plumbing.js (which sat at 96.2% of its size cap -- the tightest
// remaining calc module) into this module. Both tiles KEEP group "B" -- a
// tile's group letter is independent of the module that holds it (the
// v28/v30/v36/v39/v42/v70/v71/v72 precedent). Their ids, citations, worked
// examples, dimensional annotations, and behavior are byte-for-byte
// unchanged. Lazy-loaded on first open of one of its tiles, so it is not in
// the home-view first-paint payload.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard (copied per-module; non-exported, no derivation-corpus row).
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

export const DRAINAGE_RENDERERS = {};

// =====================================================================
// spec-v62: Roof drainage and sump/ejector sizing (Group B).
// =====================================================================

// --- roof-drain-sizing: Roof Area to Storm GPM and Leader Size ---
//
// Storm flow gpm = roof_area * rainfall_rate * 0.0104 (GPM per ft^2 per
// in/hr -- 1 in/hr over 1 ft^2 = 0.623 gal/min ... = 0.0104 GPM per the IPC
// basis). The vertical leader and the sloped horizontal storm drain are then
// sized to the smallest pipe whose capacity >= gpm against editable
// breakpoint tables. The bundled tables are conservative approximations of
// IPC 2021 Tables 1106.2 (vertical conductors), 1106.3 (horizontal storm
// drains by slope), and 1106.6 (roof drains); tune them to the published
// edition for the locale. Helpers sit ABOVE the dims block so the v14
// dimensions lint associates the annotation with the export below it.
const ROOF_LEADER_TABLE = [[2, 30], [3, 90], [4, 180], [6, 290], [8, 540], [10, 970]];
// columns: [size_in, gpm @ 1/8 in/ft, gpm @ 1/4 in/ft, gpm @ 1/2 in/ft]
const ROOF_HORIZ_TABLE = [
  [3, 30, 42, 60], [4, 68, 96, 138], [5, 110, 150, 215], [6, 150, 200, 290],
  [8, 230, 290, 415], [10, 400, 510, 730], [12, 640, 820, 1170], [15, 1140, 1460, 2080],
];
const ROOF_SLOPE_COL = { "1/8": 1, "1/4": 2, "1/2": 3 };
const _roofMonotonic = (table, col) => {
  for (let i = 1; i < table.length; i++) {
    if (!(Number(table[i][0]) > Number(table[i - 1][0]))) return false;
    if (!(Number(table[i][col]) > Number(table[i - 1][col]))) return false;
  }
  return true;
};
const _roofSmallestPipe = (table, col, gpm) => {
  for (let i = 0; i < table.length; i++) {
    if (Number(table[i][col]) >= gpm) return { size: table[i][0], over: false };
  }
  return { size: table[table.length - 1][0], over: true };
};

// dims: in { roof_area: L^2, rainfall_rate: L T^-1, drain_slope: dimensionless } out: { gpm: L^3 T^-1, leader_in: L, horiz_in: L }
// (Roof area L^2 times rainfall L T^-1 times the 0.0104 GPM-per-(ft^2 x in/hr)
//  unit constant gives a volumetric flow L^3 T^-1; the leader and horizontal
//  storm-drain sizes are lengths L read from the capacity tables.)
export function computeRoofDrainSizing({ roof_area, rainfall_rate, drain_slope = "1/4", leader_table = null, horiz_table = null } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(roof_area);
  const rain = Number(rainfall_rate);
  if (!Number.isFinite(area) || area <= 0) return { error: "Roof area must be a positive finite number (ft^2)." };
  if (!Number.isFinite(rain) || rain <= 0) return { error: "Rainfall rate must be a positive finite number (in/hr)." };
  const col = ROOF_SLOPE_COL[drain_slope];
  if (col == null) return { error: "Drain slope must be 1/8, 1/4, or 1/2 in per ft." };
  const lead = Array.isArray(leader_table) ? leader_table : ROOF_LEADER_TABLE;
  const horiz = Array.isArray(horiz_table) ? horiz_table : ROOF_HORIZ_TABLE;
  if (lead.length < 2 || horiz.length < 2) return { error: "Capacity tables must have at least two breakpoints." };
  if (!_roofMonotonic(lead, 1)) return { error: "Vertical-leader capacity table must be strictly increasing." };
  if (!_roofMonotonic(horiz, col)) return { error: "Horizontal storm-drain capacity table must be strictly increasing." };
  const gpm = area * rain * 0.0104;
  if (!Number.isFinite(gpm)) return { error: "Storm flow is not a finite value." };
  const leader = _roofSmallestPipe(lead, 1, gpm);
  const horizontal = _roofSmallestPipe(horiz, col, gpm);
  return {
    gpm,
    leader_in: leader.size,
    horiz_in: horizontal.size,
    leader_over: leader.over,
    horiz_over: horizontal.over,
    drain_slope,
    note: "Rainfall rate is the locale-specific 100-year / 1-hour value from IPC Figure 1106.1 (not a national default). Sloped, vertical, and parapet walls add their contributing area per IPC 1106.4. Overflow drains and scuppers (IPC 1107) are a separate required path this tile does not size. The capacity tables are editable conservative approximations of IPC Tables 1106.2 / 1106.3 / 1106.6 - tune them to the published edition.",
  };
}

export const roofDrainSizingExample = {
  inputs: { roof_area: 5000, rainfall_rate: 4, drain_slope: "1/4" },
  expectedRange: { gpm: { min: 207.9, max: 208.1 } },
};

function renderRoofDrainSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IPC 2021 Section 1106 (Tables 1106.2 vertical conductors, 1106.3 horizontal storm drains, 1106.6 roof drains) by name; the capacity tables ship as editable conservative breakpoints, not a transcribed table. Storm flow gpm = area x rainfall x 0.0104.";
  const area = makeNumber("Roof area served (ft^2, horizontally projected)", "rd-area", { step: "any", min: "0" });
  const rain = makeNumber("Design rainfall, 100-yr / 1-hr (in/hr)", "rd-rain", { step: "any", min: "0" });
  const slope = makeSelect("Horizontal storm-drain slope", "rd-slope", [
    { value: "1/8", label: "1/8 in per ft" }, { value: "1/4", label: "1/4 in per ft", selected: true }, { value: "1/2", label: "1/2 in per ft" },
  ]);
  for (const f of [area, rain, slope]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "5000"; rain.input.value = "4"; slope.select.value = "1/4"; update(); });
  const oGpm = makeOutputLine(outputRegion, "Storm flow", "rd-out-gpm");
  const oLeader = makeOutputLine(outputRegion, "Vertical leader", "rd-out-leader");
  const oHoriz = makeOutputLine(outputRegion, "Horizontal storm drain", "rd-out-horiz");
  const update = debounce(() => {
    const r = computeRoofDrainSizing({ roof_area: Number(area.input.value) || 0, rainfall_rate: Number(rain.input.value) || 0, drain_slope: slope.select.value });
    if (r.error) { oGpm.textContent = r.error; oLeader.textContent = "-"; oHoriz.textContent = "-"; return; }
    oGpm.textContent = fmt(r.gpm, 1) + " GPM";
    oLeader.textContent = r.leader_in + " in" + (r.leader_over ? " (over table - increase pipe / split drains)" : "");
    oHoriz.textContent = r.horiz_in + " in at " + r.drain_slope + " in/ft" + (r.horiz_over ? " (over table - increase pipe / split drains)" : "");
  }, DEBOUNCE_MS);
  for (const el of [area.input, rain.input]) el.addEventListener("input", update);
  slope.select.addEventListener("change", update);
}
DRAINAGE_RENDERERS["roof-drain-sizing"] = renderRoofDrainSizing;

// --- sump-basin-sizing: Basin Drawdown and Pump-Cycle Check ---
//
// area_ft2 = PI/4 x (basin_dia/12)^2; drawdown_gal = area_ft2 x
// (drawdown_in/12) x 7.48; run_time_s = drawdown_gal / (pump_gpm - inflow_gpm)
// x 60; fill_time_s = drawdown_gal / inflow_gpm x 60; cycles_per_hr = 3600 /
// (run + fill); ok = run_time_s >= min_run_s. The pump must out-pace the
// inflow or the basin never empties (errors).
// dims: in { basin_dia: L, drawdown_in: L, inflow_gpm: L^3 T^-1, pump_gpm: L^3 T^-1, min_run_s: T } out: { drawdown_gal: L^3, run_time_s: T, fill_time_s: T, cycles_per_hr: T^-1 }
// (Basin diameter and float spread are lengths L; the 7.48 gal/ft^3 constant
//  turns the L^3 band into a volume; inflow and pump rates are L^3 T^-1, so
//  volume over rate gives the run and fill times T and cycles per hour T^-1.)
export function computeSumpBasinSizing({ basin_dia, drawdown_in, inflow_gpm, pump_gpm, min_run_s = 60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const dia = Number(basin_dia);
  const band = Number(drawdown_in);
  const inflow = Number(inflow_gpm);
  const pump = Number(pump_gpm);
  const minRun = Number(min_run_s);
  if (!Number.isFinite(dia) || dia <= 0) return { error: "Basin diameter must be a positive finite number (in)." };
  if (!Number.isFinite(band) || band <= 0) return { error: "Drawdown band must be a positive finite number (in)." };
  if (!Number.isFinite(pump) || pump <= 0) return { error: "Pump rate must be a positive finite number (GPM)." };
  if (!Number.isFinite(inflow) || inflow <= 0) return { error: "Inflow must be a positive finite number (GPM)." };
  if (inflow >= pump) return { error: "Inflow must be less than the pump rate, or the pump never empties the basin." };
  if (!Number.isFinite(minRun) || minRun < 0) return { error: "Minimum run time must be a non-negative finite number (s)." };
  const areaFt2 = Math.PI / 4 * Math.pow(dia / 12, 2);
  const drawdownGal = areaFt2 * (band / 12) * 7.48;
  const runTimeS = drawdownGal / (pump - inflow) * 60;
  const fillTimeS = drawdownGal / inflow * 60;
  const cyclesPerHr = 3600 / (runTimeS + fillTimeS);
  if (![drawdownGal, runTimeS, fillTimeS, cyclesPerHr].every(Number.isFinite)) return { error: "Cycle math is not a finite value." };
  return {
    drawdown_gal: drawdownGal,
    run_time_s: runTimeS,
    fill_time_s: fillTimeS,
    cycles_per_hr: cyclesPerHr,
    adequate: runTimeS >= minRun,
    verdict: runTimeS >= minRun ? "adequate" : "short-cycling",
    note: "The pump must out-pace the inflow (this tile errors if it does not - an undersized pump or an overwhelmed basin). A longer run time per cycle is gentler on the motor; raise the float spread or the basin size to lengthen it. A sewage ejector must pass 2 in solids and carries a vent, neither of which this tile sizes (IPC 712.3-712.4).",
  };
}

export const sumpBasinSizingExample = {
  inputs: { basin_dia: 24, drawdown_in: 12, inflow_gpm: 10, pump_gpm: 30, min_run_s: 60 },
  expectedRange: { drawdown_gal: { min: 23.45, max: 23.55 }, run_time_s: { min: 70.4, max: 70.6 } },
};

function renderSumpBasinSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IPC 2021 Section 712 (Sumps and Ejectors) and the Hydraulic Institute pump-cycling guidance by name. drawdown_gal = (PI/4)(dia/12)^2 x (band/12) x 7.48 gal/ft^3; run and fill times are volume over rate.";
  const dia = makeNumber("Basin inside diameter (in)", "sb-dia", { step: "any", min: "0" });
  const band = makeNumber("Drawdown band, pump-off to pump-on (in)", "sb-band", { step: "any", min: "0" });
  const inflow = makeNumber("Design inflow (GPM)", "sb-inflow", { step: "any", min: "0" });
  const pump = makeNumber("Pump discharge at system head (GPM)", "sb-pump", { step: "any", min: "0" });
  const minRun = makeNumber("Minimum acceptable run time (s)", "sb-minrun", { step: "any", min: "0", value: "60" });
  minRun.input.value = "60";
  for (const f of [dia, band, inflow, pump, minRun]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dia.input.value = "24"; band.input.value = "12"; inflow.input.value = "10"; pump.input.value = "30"; minRun.input.value = "60"; update(); });
  const oVol = makeOutputLine(outputRegion, "Drawdown volume per cycle", "sb-out-vol");
  const oRun = makeOutputLine(outputRegion, "Run time per cycle", "sb-out-run");
  const oFill = makeOutputLine(outputRegion, "Fill time per cycle", "sb-out-fill");
  const oCycles = makeOutputLine(outputRegion, "Cycles per hour", "sb-out-cycles");
  const oVerdict = makeOutputLine(outputRegion, "Verdict", "sb-out-verdict");
  const update = debounce(() => {
    const r = computeSumpBasinSizing({
      basin_dia: Number(dia.input.value) || 0,
      drawdown_in: Number(band.input.value) || 0,
      inflow_gpm: Number(inflow.input.value) || 0,
      pump_gpm: Number(pump.input.value) || 0,
      min_run_s: minRun.input.value === "" ? 60 : Number(minRun.input.value),
    });
    if (r.error) { oVol.textContent = r.error; for (const o of [oRun, oFill, oCycles, oVerdict]) o.textContent = "-"; return; }
    oVol.textContent = fmt(r.drawdown_gal, 1) + " gal";
    oRun.textContent = fmt(r.run_time_s, 1) + " s";
    oFill.textContent = fmt(r.fill_time_s, 1) + " s";
    oCycles.textContent = fmt(r.cycles_per_hr, 1);
    oVerdict.textContent = r.verdict;
  }, DEBOUNCE_MS);
  for (const el of [dia.input, band.input, inflow.input, pump.input, minRun.input]) el.addEventListener("input", update);
}
DRAINAGE_RENDERERS["sump-basin-sizing"] = renderSumpBasinSizing;

// ===================== spec-v426..v427: drainage trio (Group B) =====================

// dims: in { length_in: L, head_in: L } out: { q_cfs: L^3 T^-1, q_cfs_contracted: L^3 T^-1, q_gpm: L^3 T^-1 }
export function computeOverflowScupperSizing({ length_in = 0, head_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const len = Number(length_in) || 0;
  const head = Number(head_in) || 0;
  if (!(len > 0)) return { error: "Scupper length must be positive (in)." };
  if (!(head > 0)) return { error: "Head must be positive (in)." };
  const L = len / 12;
  const H = head / 12;
  const q_cfs = 3.33 * L * Math.pow(H, 1.5);
  const effL = Math.max(0, L - 0.2 * H);
  const q_cfs_contracted = 3.33 * effL * Math.pow(H, 1.5);
  return {
    q_cfs, q_cfs_contracted, q_gpm: q_cfs * 448.8, q_gpm_contracted: q_cfs_contracted * 448.8,
    note: "Overflow scupper capacity as a rectangular (Francis) weir: Q = 3.33 L H^1.5 (cfs, L and H in feet), or the contracted form 3.33 (L - 0.2 H) H^1.5 for a scupper narrower than the wall. The head H is measured above the scupper invert at the design (blocked-primary) condition, and the overflow scuppers or drains must pass the design rainfall with the primary system assumed plugged (IPC 1108 / FM Global). Round the width up and keep the parapet high enough for the head. A design aid; the plumbing code and the structural roof-loading check govern.",
  };
}
export const overflowScupperSizingExample = { inputs: { length_in: 6, head_in: 3.5 } };
function renderOverflowScupperSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Overflow scupper as a rectangular weir Q = 3.33 L H^1.5 (cfs, feet), contracted 3.33 (L - 0.2 H) H^1.5 (IPC 1108 secondary drainage / FM Global). Head at the blocked-primary condition. A design aid; the plumbing code and roof-loading check govern.";
  const len = makeNumber("Scupper opening width (in)", "oss-len", { step: "any", min: "0" }); len.input.value = "6";
  const head = makeNumber("Head above scupper invert (in)", "oss-head", { step: "any", min: "0" }); head.input.value = "3.5";
  for (const f of [len, head]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { len.input.value = "6"; head.input.value = "3.5"; update(); });
  const oQ = makeOutputLine(outputRegion, "Capacity (suppressed)", "oss-out-q");
  const oC = makeOutputLine(outputRegion, "Capacity (contracted)", "oss-out-c");
  const oNote = makeOutputLine(outputRegion, "Note", "oss-out-n");
  const update = debounce(() => {
    const r = computeOverflowScupperSizing({ length_in: Number(len.input.value) || 0, head_in: Number(head.input.value) || 0 });
    if (r.error) { oQ.textContent = r.error; oC.textContent = "-"; oNote.textContent = ""; return; }
    oQ.textContent = fmt(r.q_gpm, 0) + " gpm (" + fmt(r.q_cfs, 3) + " cfs)";
    oC.textContent = fmt(r.q_gpm_contracted, 0) + " gpm";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [len.input, head.input]) f.addEventListener("input", update);
}
DRAINAGE_RENDERERS["overflow-scupper-sizing"] = renderOverflowScupperSizing;

// scupper-width-for-flow: inverse of overflow-scupper-sizing. The forward tile gives the overflow capacity from the
// width and head; the inverse recovers the scupper width for a required overflow flow at a design head. From the
// rectangular (Francis) weir Q = 3.33 L H^1.5 (cfs, feet), L = Q / (3.33 H^1.5) (suppressed), and from the contracted
// form Q = 3.33 (L - 0.2 H) H^1.5, L = Q / (3.33 H^1.5) + 0.2 H -- a scupper narrower than the wall needs the wider
// contracted opening for the same flow. The head is the blocked-primary design condition.
// dims: in { required_gpm: L^3 T^-1, head_in: L } out: { width_suppressed_in: L, width_contracted_in: L, q_cfs: L^3 T^-1 }
export function computeScupperWidthForFlow({ required_gpm = 0, head_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const gpm = Number(required_gpm) || 0;
  const head = Number(head_in) || 0;
  if (!(gpm > 0)) return { error: "Required overflow flow must be positive (gpm)." };
  if (!(head > 0)) return { error: "Head must be positive (in)." };
  const q_cfs = gpm / 448.8;
  const H = head / 12;
  const base_ft = q_cfs / (3.33 * Math.pow(H, 1.5));
  const width_suppressed_in = base_ft * 12;
  const width_contracted_in = (base_ft + 0.2 * H) * 12;
  if (![q_cfs, width_suppressed_in, width_contracted_in].every(Number.isFinite)) return { error: "Scupper-width math is not a finite value." };
  return {
    q_cfs, width_suppressed_in, width_contracted_in,
    note: "Scupper width for a required overflow flow as a rectangular (Francis) weir: L = Q / (3.33 H^1.5) for the suppressed (full-wall-width) case, or L = Q / (3.33 H^1.5) + 0.2 H for the contracted case (a scupper narrower than the wall, which needs the wider opening for the same flow). The head H is measured above the scupper invert at the design (blocked-primary) condition, and the overflow scuppers must pass the design rainfall with the primary system assumed plugged (IPC 1108 / FM Global). Round the width UP and keep the parapet high enough for the head; use the contracted width to be safe. A design aid; the plumbing code and the structural roof-loading check govern.",
  };
}
export const scupperWidthForFlowExample = { inputs: { required_gpm: 118, head_in: 3.5 } };
function renderScupperWidthForFlow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Overflow scupper as a rectangular weir Q = 3.33 L H^1.5 (cfs, feet) solved for the width: L = Q / (3.33 H^1.5) suppressed, L = Q / (3.33 H^1.5) + 0.2 H contracted (IPC 1108 secondary drainage / FM Global). Head at the blocked-primary condition. A design aid; the plumbing code and roof-loading check govern.";
  const gpm = makeNumber("Required overflow flow (gpm)", "swf-gpm", { step: "any", min: "0" }); gpm.input.value = "118";
  const head = makeNumber("Head above scupper invert (in)", "swf-head", { step: "any", min: "0" }); head.input.value = "3.5";
  for (const f of [gpm, head]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { gpm.input.value = "118"; head.input.value = "3.5"; update(); });
  const oS = makeOutputLine(outputRegion, "Width (suppressed / full wall)", "swf-out-s");
  const oC = makeOutputLine(outputRegion, "Width (contracted / narrow scupper)", "swf-out-c");
  const oNote = makeOutputLine(outputRegion, "Note", "swf-out-n");
  const update = debounce(() => {
    const r = computeScupperWidthForFlow({ required_gpm: Number(gpm.input.value) || 0, head_in: Number(head.input.value) || 0 });
    if (r.error) { oS.textContent = r.error; oC.textContent = "-"; oNote.textContent = ""; return; }
    oS.textContent = fmt(r.width_suppressed_in, 1) + " in (" + fmt(r.q_cfs, 3) + " cfs)";
    oC.textContent = fmt(r.width_contracted_in, 1) + " in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [gpm.input, head.input]) f.addEventListener("input", update);
}
DRAINAGE_RENDERERS["scupper-width-for-flow"] = renderScupperWidthForFlow;

// dims: in { gpm: L^3 T^-1, id_in: L } out: { velocity_fps: L T^-1, d_max_scour_in: L }
export function computeSewageForceMainVelocity({ gpm = 0, id_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const q = Number(gpm) || 0;
  const id = Number(id_in) || 0;
  if (!(q > 0)) return { error: "Pump flow must be positive (gpm)." };
  if (!(id > 0)) return { error: "Force-main inside diameter must be positive (in)." };
  const velocity_fps = 0.4085 * q / (id * id);
  const d_max_scour_in = Math.sqrt(0.4085 * q / 2);
  return {
    velocity_fps, d_max_scour_in, scours: velocity_fps >= 2.0,
    note: "Sewage force-main scour velocity: V = 0.4085 Q / d^2 (ft/s, Q in gpm, d in inches). A minimum of about 2 ft/s at the design flow is needed to scour the pipe and keep solids in suspension (Ten States Standards); below it grit and grease settle and the main fouls. The largest inside diameter that still holds 2 ft/s at this flow = sqrt(0.4085 Q / 2). An upper limit near 8 ft/s avoids excessive headloss and water hammer. A design aid; the state design criteria and the pump curve govern.",
  };
}
export const sewageForceMainVelocityExample = { inputs: { gpm: 50, id_in: 2 } };
function renderSewageForceMainVelocity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Sewage force-main velocity V = 0.4085 Q / d^2 (ft/s, gpm, in), with the ~2 ft/s minimum scour velocity to keep solids suspended (Ten States Standards). A design aid; the state design criteria and the pump curve govern.";
  const q = makeNumber("Pump flow (gpm)", "sfm-q", { step: "any", min: "0" }); q.input.value = "50";
  const id = makeNumber("Force-main inside diameter (in)", "sfm-id", { step: "any", min: "0" }); id.input.value = "2";
  for (const f of [q, id]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { q.input.value = "50"; id.input.value = "2"; update(); });
  const oV = makeOutputLine(outputRegion, "Velocity", "sfm-out-v");
  const oD = makeOutputLine(outputRegion, "Largest ID holding 2 ft/s", "sfm-out-d");
  const oNote = makeOutputLine(outputRegion, "Note", "sfm-out-n");
  const update = debounce(() => {
    const r = computeSewageForceMainVelocity({ gpm: Number(q.input.value) || 0, id_in: Number(id.input.value) || 0 });
    if (r.error) { oV.textContent = r.error; oD.textContent = "-"; oNote.textContent = ""; return; }
    oV.textContent = fmt(r.velocity_fps, 2) + " ft/s" + (r.scours ? " (scours -- OK)" : " (below 2 ft/s -- solids settle)");
    oD.textContent = fmt(r.d_max_scour_in, 2) + " in";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [q.input, id.input]) f.addEventListener("input", update);
}
DRAINAGE_RENDERERS["sewage-force-main-velocity"] = renderSewageForceMainVelocity;

// ===================== spec-v976: dry well / infiltration trench sizing =====================
// dims: in { args: dimensionless } out: { excavation_volume_ft3: dimensionless, footprint_sf: dimensionless, draindown_time_hr: dimensionless }
export function computeDrywellInfiltration({ runoff_volume_ft3 = 200, void_ratio = 0.35, trench_depth_ft = 4, infiltration_rate_in_hr = 0.5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(runoff_volume_ft3 > 0)) return { error: "Runoff (storage) volume must be positive (ft^3)." };
  if (!(void_ratio > 0 && void_ratio <= 1)) return { error: "Void ratio must be between 0 and 1 (clean stone ~0.30-0.40)." };
  if (!(trench_depth_ft > 0)) return { error: "Trench/pit depth must be positive (ft)." };
  if (!(infiltration_rate_in_hr > 0)) return { error: "Soil infiltration rate must be positive (in/hr)." };
  // Aggregate stores water only in its voids, so the excavation is larger than the runoff by 1/void_ratio.
  const excavation_volume_ft3 = runoff_volume_ft3 / void_ratio;
  const footprint_sf = excavation_volume_ft3 / trench_depth_ft;
  // Draindown: the void-water column (depth x void) infiltrates through the bottom at the soil rate.
  const draindown_time_hr = 12 * trench_depth_ft * void_ratio / infiltration_rate_in_hr;
  if (![excavation_volume_ft3, footprint_sf, draindown_time_hr].every(Number.isFinite)) return { error: "Dry-well math is not a finite value." };
  return {
    excavation_volume_ft3,
    footprint_sf,
    draindown_time_hr,
    note: "The size of a stone-filled dry well or infiltration trench (soakaway) that stores a runoff volume and lets it soak into the ground. Because clean crushed stone holds water only in its VOIDS (about 30-40% of the aggregate volume), the excavation must be larger than the water it stores by 1 / void ratio: storing 200 ft^3 of runoff in 0.35-void stone needs a 571 ft^3 pit, which at a 4 ft depth is a 143 sf footprint. The pit then empties by infiltration through the bottom (and sides) into the soil; a rough draindown estimate is the void-water column (depth x void ratio) divided by the soil infiltration rate, so a 4 ft deep, 0.35-void pit over a 0.5 in/hr soil drains in about 34 hours -- a well-designed system fully empties between storms (commonly within 24-72 hr) so it is ready for the next. The runoff volume itself comes from the design storm and the contributing area (a rational-method or detention calc), the void ratio from the actual aggregate (open-graded stone ~0.35, a chambered/modular unit is higher), and the infiltration rate from a field PERCOLATION or infiltration test -- NOT a default. An overflow/bypass path is required for storms that exceed the design. A sizing screen; the field perc test, the local stormwater code, and the AHJ / geotech govern the design.",
  };
}

export const drywellInfiltrationExample = { inputs: { runoff_volume_ft3: 200, void_ratio: 0.35, trench_depth_ft: 4, infiltration_rate_in_hr: 0.5 } };

function _v976renderDrywellInfiltration(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: dry well / infiltration trench (soakaway) sizing, by name. excavation = runoff / void ratio; footprint = excavation / depth; draindown ~ 12 x depth x void / infiltration rate. Void from the aggregate (~0.35 open stone), infiltration from a field perc test (not a default), runoff from the design storm. An overflow path is required; the perc test, the stormwater code, and the AHJ / geotech govern.";
  const rv = makeNumber("Runoff (storage) volume (ft^3)", "dwi-rv", { step: "any", min: "0", value: "200" });
  rv.input.value = "200";
  const vr = makeNumber("Aggregate void ratio (~0.35)", "dwi-vr", { step: "any", min: "0", value: "0.35" });
  vr.input.value = "0.35";
  const td = makeNumber("Trench/pit depth (ft)", "dwi-td", { step: "any", min: "0", value: "4" });
  td.input.value = "4";
  const ir = makeNumber("Soil infiltration rate (in/hr, perc test)", "dwi-ir", { step: "any", min: "0", value: "0.5" });
  ir.input.value = "0.5";
  for (const f of [rv, vr, td, ir]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { rv.input.value = "200"; vr.input.value = "0.35"; td.input.value = "4"; ir.input.value = "0.5"; update(); });
  const oE = makeOutputLine(outputRegion, "Excavation volume", "dwi-out-e");
  const oF = makeOutputLine(outputRegion, "Footprint (at this depth)", "dwi-out-f");
  const oD = makeOutputLine(outputRegion, "Draindown time", "dwi-out-d");
  const update = debounce(() => {
    const r = computeDrywellInfiltration({
      runoff_volume_ft3: rv.input.value === "" ? 200 : Number(rv.input.value), void_ratio: vr.input.value === "" ? 0.35 : Number(vr.input.value),
      trench_depth_ft: td.input.value === "" ? 4 : Number(td.input.value), infiltration_rate_in_hr: ir.input.value === "" ? 0.5 : Number(ir.input.value),
    });
    if (r.error) { oE.textContent = r.error; oF.textContent = "-"; oD.textContent = "-"; return; }
    oE.textContent = fmt(r.excavation_volume_ft3, 0) + " ft^3 of stone-filled pit";
    oF.textContent = fmt(r.footprint_sf, 0) + " sf";
    oD.textContent = fmt(r.draindown_time_hr, 1) + " hr (want < ~24-72 hr)";
  }, DEBOUNCE_MS);
  for (const f of [rv, vr, td, ir]) f.input.addEventListener("input", update);
}
DRAINAGE_RENDERERS["drywell-infiltration"] = _v976renderDrywellInfiltration;

// ===================== spec-v1036: Manning gravity-flow family relocated from calc-plumbing.js =====================
// Cap-relief move, same pattern as the spec-v73 split that created this module.
// These three tiles share the MANNING_ROUGHNESS table, so they had to move as a
// unit or not at all -- that shared constant was exactly what blocked the wider
// site-water split scoped in spec-v1030 §2. They land here rather than in a new
// module because Manning's equation IS gravity drainage: roof-drain-sizing and
// sewage-force-main-velocity already live beside them. Tiles:
//   manning-slope             (required slope for a target gravity flow)
//   manning-pipe-capacity     (full-bore capacity at a given slope)
//   pipe-partial-flow-depth   (spec-v1011 partial-flow depth, non-monotonic)
// All keep group "B"; ids, citations, worked examples, dimensional
// annotations, and behavior are byte-for-byte unchanged.
// --- Utility 133: Manning's Equation Drainage Slope ---
//
// Manning: V = (1.486 / n) * R^(2/3) * S^(1/2) (English units, ft, ft/s).
// For circular pipes flowing half-full, hydraulic radius R = D/4 (D in ft).
// Solve for slope: S = ( V * n / (1.486 * R^(2/3)) )^2.

export const MANNING_ROUGHNESS = {
  pvc: 0.009,
  copper: 0.011,
  cast_iron: 0.013,
  concrete: 0.013,
  galvanized_steel: 0.016,
  corrugated_metal: 0.024,
};

// dims: in { pipe_diameter_in: L, target_flow_gpm: L^3 T^-1, material: dimensionless } out: { slope_in_per_ft: dimensionless, slope_percent: dimensionless }
export function computeManningSlope({ pipe_diameter_in = 0, target_flow_gpm = 0, material = "pvc" }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pipe_diameter_in > 0)) return { error: "Pipe diameter must be positive." };
  if (!(target_flow_gpm >= 0)) return { error: "Target flow must be non-negative." };
  const n = MANNING_ROUGHNESS[material];
  if (!Number.isFinite(n)) return { error: "Unknown pipe material." };
  const D_ft = pipe_diameter_in / 12;
  // Half-full hydraulic radius and area:
  const R_ft = D_ft / 4;
  const A_half_ft2 = Math.PI * D_ft * D_ft / 8;
  // Self-cleansing velocity 2 ft/s; slope to achieve V_target:
  const slopeForVelocity = (V) => Math.pow((V * n) / (1.486 * Math.pow(R_ft, 2 / 3)), 2);
  const slope_self_cleansing = slopeForVelocity(2);
  // Slope to carry the target flow at half-full:
  // Q (cfs) = V * A_half. 1 gpm = 0.002228 cfs.
  const Q_cfs = target_flow_gpm * 0.002228;
  let slope_for_flow = null;
  if (Q_cfs > 0) {
    const V_required = Q_cfs / A_half_ft2;
    slope_for_flow = slopeForVelocity(V_required);
  }
  return {
    slope_self_cleansing,
    slope_self_cleansing_in_per_ft: slope_self_cleansing * 12,
    slope_for_flow,
    slope_for_flow_in_per_ft: slope_for_flow !== null ? slope_for_flow * 12 : null,
    n, D_ft, R_ft, A_half_ft2,
  };
}

export const manningSlopeExample = {
  inputs: { pipe_diameter_in: 4, target_flow_gpm: 50, material: "pvc" },
};


// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderManningSlope(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manning's equation V = (1.486/n) * R^(2/3) * S^(1/2). Public engineering. Pipe roughness values from public engineering tables.";
  attachExampleButton(inputRegion, () => fillExample(manningSlopeExample.inputs));
  const d = makeNumber("Pipe diameter (in)", "mn-d", { step: "any", min: "0" });
  const f = makeNumber("Target flow (gpm)", "mn-f", { step: "any", min: "0" });
  const m = makeSelect("Pipe material", "mn-m", Object.keys(MANNING_ROUGHNESS).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  for (const x of [d, f, m]) inputRegion.appendChild(x.wrap);
  const oSC = makeOutputLine(outputRegion, "Self-cleansing slope", "mn-out-sc");
  const oFL = makeOutputLine(outputRegion, "Slope for flow (half-full)", "mn-out-fl");
  function fillExample(v) { d.input.value = v.pipe_diameter_in; f.input.value = v.target_flow_gpm; m.select.value = v.material; update(); }
  const update = debounce(() => {
    const r = computeManningSlope({ pipe_diameter_in: Number(d.input.value) || 0, target_flow_gpm: Number(f.input.value) || 0, material: m.select.value });
    if (r.error) { oSC.textContent = r.error; oFL.textContent = "-"; return; }
    oSC.textContent = fmt(r.slope_self_cleansing_in_per_ft, 4) + " in/ft";
    oFL.textContent = r.slope_for_flow_in_per_ft !== null ? fmt(r.slope_for_flow_in_per_ft, 4) + " in/ft" : "-";
  }, DEBOUNCE_MS);
  for (const el of [d.input, f.input, m.select]) el.addEventListener("input", update);
}

// dims: in { d_in: L, slope: dimensionless, material: dimensionless } out: { v_fps: L T^-1, q_cfs: L^3 T^-1, q_gpm: L^3 T^-1 }
export function computeManningPipeCapacity({ d_in = 0, slope = 0, material = "pvc" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(d_in > 0)) return { error: "Pipe diameter must be positive (in)." };
  if (!(slope > 0)) return { error: "Pipe slope must be positive (ft/ft)." };
  const n = MANNING_ROUGHNESS[material];
  if (!Number.isFinite(n)) return { error: "Unknown pipe material." };
  const D_ft = d_in / 12;
  const r_ft = D_ft / 4;
  const a_ft2 = Math.PI * D_ft * D_ft / 4;
  const v_fps = (1.486 / n) * Math.pow(r_ft, 2 / 3) * Math.sqrt(slope);
  const q_cfs = v_fps * a_ft2;
  const q_gpm = q_cfs * 448.831;
  return {
    n, a_ft2, r_ft, v_fps, q_cfs, q_gpm,
    note: "Manning full-bore gravity-flow capacity: V = (1.486/n) R^(2/3) sqrt(S) with the hydraulic radius R = D/4 for a circular pipe flowing full and Q = V (pi/4) D^2 - the discharge side of the same Manning equation the manning-slope tile inverts. The roughness n is taken from the standard tables (PVC 0.009, cast iron / concrete 0.013, corrugated metal 0.024). Because Q scales with sqrt(S), doubling the slope raises the capacity only about 1.41x. A steady, uniform (normal-depth) full flow in a circular pipe; it does not compute the partial-flow depth, and a circular pipe actually carries a few percent more than full-bore at about 0.94 depth (the partial-flow curves are separate). A design aid; the engineer of record and the local plumbing/sewer code govern.",
  };
}
export const manningPipeCapacityExample = { inputs: { d_in: 8, slope: 0.01, material: "concrete" } };

function renderManningPipeCapacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manning full-bore capacity V = (1.486/n) R^(2/3) S^(1/2), R = D/4, Q = V (pi/4) D^2, by name. Circular pipe flowing full; the roughness n is from the standard tables. The partial-flow depth is separate. A design aid; the engineer of record governs.";
  attachExampleButton(inputRegion, () => fillExample(manningPipeCapacityExample.inputs));
  const d = makeNumber("Pipe diameter (in)", "mpc-d", { step: "any", min: "0" });
  const s = makeNumber("Pipe slope S (ft/ft)", "mpc-s", { step: "any", min: "0" });
  const m = makeSelect("Pipe material", "mpc-m", Object.keys(MANNING_ROUGHNESS).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  for (const x of [d, s, m]) inputRegion.appendChild(x.wrap);
  const oQ = makeOutputLine(outputRegion, "Full-flow capacity", "mpc-out-q");
  const oV = makeOutputLine(outputRegion, "Full-flow velocity", "mpc-out-v");
  const oNote = makeOutputLine(outputRegion, "Note", "mpc-out-n");
  function fillExample(v) { d.input.value = v.d_in; s.input.value = v.slope; m.select.value = v.material; update(); }
  const update = debounce(() => {
    const r = computeManningPipeCapacity({ d_in: Number(d.input.value) || 0, slope: Number(s.input.value) || 0, material: m.select.value });
    if (r.error) { oQ.textContent = r.error; oV.textContent = "-"; oNote.textContent = "-"; return; }
    oQ.textContent = fmt(r.q_cfs, 2) + " cfs (" + fmt(r.q_gpm, 0) + " gpm)";
    oV.textContent = fmt(r.v_fps, 2) + " ft/s";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [d.input, s.input, m.select]) el.addEventListener("input", update);
}

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }


// spec-v1011: circular-pipe partial-flow depth. The two turning points below are
// DERIVED, not tabulated. With A = (D^2/8)(th - sin th) and P = D th/2:
//   max discharge (maximize A R^(2/3) = A^(5/3) P^(-2/3)): 5 A' P = 2 A P'
//     -> 3 th - 5 th cos th + 2 sin th = 0  -> th = 5.27811, d/D = 0.9382
//   max velocity (maximize R = A/P):        A' P = A P'  -> tan th = th
//     -> th = 4.49341, d/D = 0.8128
// Discharge is NOT monotonic in depth, so the solver must bisect only on the
// rising branch (0, THETA_MAX_Q]; the smaller root is the physical normal depth.
function _v1011root(f, a, b) {
  for (let i = 0; i < 200; i++) { const m = (a + b) / 2; if (f(a) * f(m) <= 0) b = m; else a = m; }
  return (a + b) / 2;
}
const THETA_MAX_Q = _v1011root((t) => 3 * t - 5 * t * Math.cos(t) + 2 * Math.sin(t), 4.0, 6.0);
const THETA_MAX_V = _v1011root((t) => Math.tan(t) - t, Math.PI + 1e-9, 3 * Math.PI / 2 - 1e-9);

// dims: in { d_in: L, slope: dimensionless, flow_gpm: L^3 T^-1, material: dimensionless } out: { depth_in: L, d_over_d: dimensionless, v_fps: L T^-1, a_ft2: L^2, r_ft: L, q_full_gpm: L^3 T^-1, q_max_gpm: L^3 T^-1, shear_psf: M L^-1 T^-2 }
export function computePipePartialFlowDepth({ d_in = 0, slope = 0, flow_gpm = 0, material = "pvc" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(d_in > 0)) return { error: "Pipe diameter must be positive (in)." };
  if (!(slope > 0)) return { error: "Pipe slope must be positive (ft/ft)." };
  if (!(flow_gpm > 0)) return { error: "Flow must be positive (gpm)." };
  const n = MANNING_ROUGHNESS[material];
  if (!Number.isFinite(n)) return { error: "Unknown pipe material." };
  const d_ft = d_in / 12;
  const q_cfs = flow_gpm / 448.831;
  const areaOf = (th) => (d_ft * d_ft / 8) * (th - Math.sin(th));
  const perimOf = (th) => (d_ft * th) / 2;
  const qOf = (th) => {
    const A = areaOf(th), P = perimOf(th);
    return (1.486 / n) * A * Math.pow(A / P, 2 / 3) * Math.sqrt(slope);
  };
  const q_full_cfs = qOf(2 * Math.PI);
  const q_max_cfs = qOf(THETA_MAX_Q);
  if (q_cfs > q_max_cfs) {
    return { error: "Flow exceeds the pipe's maximum gravity capacity of " + (q_max_cfs * 448.831).toFixed(0) + " gpm (reached at d/D = 0.94). Use a larger pipe or a steeper slope." };
  }
  // Bisect on the rising branch only: qOf is monotonic on (0, THETA_MAX_Q].
  let lo = 1e-9, hi = THETA_MAX_Q;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (qOf(mid) < q_cfs) lo = mid; else hi = mid; }
  const theta = (lo + hi) / 2;
  const a_ft2 = areaOf(theta);
  const r_ft = a_ft2 / perimOf(theta);
  const depth_ft = (d_ft / 2) * (1 - Math.cos(theta / 2));
  const depth_in = depth_ft * 12;
  const d_over_d = depth_ft / d_ft;
  const v_fps = q_cfs / a_ft2;
  const self_cleansing = v_fps >= 2;
  // Tractive (boundary) shear stress: tau = gamma R S, gamma = 62.4 lb/ft^3.
  const shear_psf = 62.4 * r_ft * slope;
  return {
    n, d_ft, theta, depth_in, d_over_d, a_ft2, r_ft, v_fps, self_cleansing, shear_psf,
    q_full_gpm: q_full_cfs * 448.831,
    q_max_gpm: q_max_cfs * 448.831,
    d_over_d_at_max_q: (1 - Math.cos(THETA_MAX_Q / 2)) / 2,
    d_over_d_at_max_v: (1 - Math.cos(THETA_MAX_V / 2)) / 2,
    pct_full: (q_cfs / q_full_cfs) * 100,
    note: "The partial-flow (normal) depth a circular gravity pipe runs at, which the full-bore capacity tile leaves out. Manning Q = (1.486/n) A R^(2/3) sqrt(S) is applied to the circular segment A = (D^2/8)(theta - sin theta), P = D theta/2, y = (D/2)(1 - cos(theta/2)), and solved for theta by bisection. The key subtlety: discharge is NOT monotonic with depth. It peaks about 7.6% ABOVE full-bore at d/D = 0.938 and falls back to the full value at the crown, and velocity peaks at d/D = 0.813 - both derived from the geometry here, not read off a chart. So a pipe has two depths for most flows, and the SMALLER (the physical normal depth) is the one reported. Hydraulic radius is D/4 at both half-full and full, which is why a half-full pipe runs the same velocity as a full one at the same slope. The 2 ft/s self-cleansing check and the boundary shear tau = 62.4 R S (roughly 0.02 to 0.03 lb/ft^2 is the usual grit-moving target) tell you whether solids stay suspended at this depth. Steady uniform flow, constant n with depth; Camp's variable-n curves raise n at shallow depths, so a low d/D result here is slightly optimistic. A design aid; the engineer of record and the local sewer code govern.",
  };
}
export const pipePartialFlowDepthExample = { inputs: { d_in: 8, slope: 0.01, flow_gpm: 200, material: "concrete" } };

function _v1011renderPipePartialFlowDepth(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Manning's equation applied to the circular-segment geometry (A = (D^2/8)(theta - sin theta), P = D theta/2, y = (D/2)(1 - cos(theta/2))) and solved for the partial-flow normal depth by bisection, the standard gravity-sewer partial-flow relation as compiled in ASCE/WEF MOP FD-5 and Chow, by name. The maximum-discharge depth d/D = 0.938 and maximum-velocity depth d/D = 0.813 are derived from these equations, not tabulated. Roughness n from the standard tables; self-cleansing taken as 2 ft/s. Constant n with depth (Camp's variable-n curves are separate). A design aid; the engineer of record and the local sewer code govern.";
  attachExampleButton(inputRegion, () => { d.input.value = "8"; s.input.value = "0.01"; q.input.value = "200"; m.select.value = "concrete"; update(); });
  const d = makeNumber("Pipe diameter (in)", "ppfd-d", { step: "any", min: "0" });
  const s = makeNumber("Pipe slope S (ft/ft)", "ppfd-s", { step: "any", min: "0" });
  const q = makeNumber("Flow Q (gpm)", "ppfd-q", { step: "any", min: "0" });
  const m = makeSelect("Pipe material", "ppfd-m", Object.keys(MANNING_ROUGHNESS).map((k) => ({ value: k, label: k.replace(/_/g, " ") })));
  for (const f of [d, s, q]) inputRegion.appendChild(f.wrap);
  inputRegion.appendChild(m.wrap);
  const oY = makeOutputLine(outputRegion, "Flow depth", "ppfd-out-y");
  const oDD = makeOutputLine(outputRegion, "Depth ratio d/D", "ppfd-out-dd");
  const oV = makeOutputLine(outputRegion, "Velocity at that depth", "ppfd-out-v");
  const oSC = makeOutputLine(outputRegion, "Self-cleansing (2 ft/s)", "ppfd-out-sc");
  const oSH = makeOutputLine(outputRegion, "Boundary shear", "ppfd-out-sh");
  const oCap = makeOutputLine(outputRegion, "Capacity full / maximum", "ppfd-out-cap");
  const oNote = makeOutputLine(outputRegion, "Note", "ppfd-out-n");
  const update = debounce(() => {
    const r = computePipePartialFlowDepth({
      d_in: Number(d.input.value) || 0,
      slope: Number(s.input.value) || 0,
      flow_gpm: Number(q.input.value) || 0,
      material: m.select.value,
    });
    if (r.error) {
      oY.textContent = r.error;
      for (const o of [oDD, oV, oSC, oSH, oCap, oNote]) o.textContent = "-";
      return;
    }
    oY.textContent = fmt(r.depth_in, 2) + " in of " + fmt(r.d_ft * 12, 2) + " in";
    oDD.textContent = fmt(r.d_over_d, 3) + " (" + fmt(r.pct_full, 0) + "% of full-bore flow)";
    oV.textContent = fmt(r.v_fps, 2) + " ft/s";
    oSC.textContent = r.self_cleansing ? "YES (at or above 2 ft/s)" : "NO - below 2 ft/s, solids may settle";
    oSH.textContent = fmt(r.shear_psf, 4) + " lb/ft^2";
    oCap.textContent = fmt(r.q_full_gpm, 0) + " gpm full, " + fmt(r.q_max_gpm, 0) + " gpm max at d/D " + fmt(r.d_over_d_at_max_q, 3);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [d, s, q]) f.input.addEventListener("input", update);
  m.select.addEventListener("change", update);
}
DRAINAGE_RENDERERS["pipe-partial-flow-depth"] = _v1011renderPipePartialFlowDepth;
DRAINAGE_RENDERERS["manning-slope"] = renderManningSlope;
DRAINAGE_RENDERERS["manning-pipe-capacity"] = renderManningPipeCapacity;

// ===================== spec-v1200: TR-55 three-segment time of concentration =====================
// The time-of-concentration tile computes only the Kirpich single-channel estimate
// and its own note names the gap: it is "not the TR-55 three-segment (sheet +
// shallow concentrated + channel) travel-time sum." This adds that method -- the
// NRCS TR-55 velocity method that modern US stormwater design actually uses.
// Constants verified against the TR-55 (1986) Chapter 3 worked example.
// dims: in { sheet_n: dimensionless, sheet_length_ft: L, p2_in: L, sheet_slope: dimensionless, shallow_surface: dimensionless, shallow_length_ft: L, shallow_slope: dimensionless, channel_n: dimensionless, channel_hyd_radius_ft: L, channel_length_ft: L, channel_slope: dimensionless } out: { tt_sheet_min: T, tt_shallow_min: T, tt_channel_min: T, tc_min: T, tc_hr: T, v_shallow_fps: L T^-1, v_channel_fps: L T^-1 }
export function computeTr55TimeOfConcentration({
  sheet_n = 0, sheet_length_ft = 0, p2_in = 0, sheet_slope = 0,
  shallow_surface = "unpaved", shallow_length_ft = 0, shallow_slope = 0,
  channel_n = 0, channel_hyd_radius_ft = 0, channel_length_ft = 0, channel_slope = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const num = (x) => Number(x) || 0;
  const sL = num(sheet_length_ft), shL = num(shallow_length_ft), chL = num(channel_length_ft);
  if (sL < 0 || shL < 0 || chL < 0) return { error: "Segment lengths cannot be negative (ft)." };
  if (!(sL > 0 || shL > 0 || chL > 0)) return { error: "Enter a length for at least one flow segment (sheet, shallow concentrated, or channel)." };

  // Sheet flow (TR-55 Eq 3-3): Tt = 0.007 (n L)^0.8 / (P2^0.5 s^0.4), hr.
  let tt_sheet_hr = 0, sheet_over_100 = false;
  if (sL > 0) {
    if (!(num(sheet_n) > 0)) return { error: "Sheet-flow Manning roughness must be positive." };
    if (!(num(p2_in) > 0)) return { error: "The 2-year, 24-hour rainfall P2 must be positive (in)." };
    if (!(num(sheet_slope) > 0)) return { error: "Sheet-flow slope must be positive (ft/ft)." };
    tt_sheet_hr = 0.007 * Math.pow(num(sheet_n) * sL, 0.8) / (Math.sqrt(num(p2_in)) * Math.pow(num(sheet_slope), 0.4));
    sheet_over_100 = sL > 100;
  }

  // Shallow concentrated flow: V = k sqrt(s), k = 16.1345 unpaved / 20.3282 paved; Tt = L/(3600 V), hr.
  let tt_shallow_hr = 0, v_shallow_fps = null;
  if (shL > 0) {
    if (!(num(shallow_slope) > 0)) return { error: "Shallow-concentrated slope must be positive (ft/ft)." };
    const paved = String(shallow_surface).toLowerCase() === "paved";
    v_shallow_fps = (paved ? 20.3282 : 16.1345) * Math.sqrt(num(shallow_slope));
    tt_shallow_hr = shL / (3600 * v_shallow_fps);
  }

  // Channel flow: Manning V = (1.49/n) R^(2/3) sqrt(s); Tt = L/(3600 V), hr.
  let tt_channel_hr = 0, v_channel_fps = null;
  if (chL > 0) {
    if (!(num(channel_n) > 0)) return { error: "Channel Manning roughness must be positive." };
    if (!(num(channel_hyd_radius_ft) > 0)) return { error: "Channel hydraulic radius must be positive (ft)." };
    if (!(num(channel_slope) > 0)) return { error: "Channel slope must be positive (ft/ft)." };
    v_channel_fps = (1.49 / num(channel_n)) * Math.pow(num(channel_hyd_radius_ft), 2 / 3) * Math.sqrt(num(channel_slope));
    tt_channel_hr = chL / (3600 * v_channel_fps);
  }

  const tc_hr = tt_sheet_hr + tt_shallow_hr + tt_channel_hr;
  if (!Number.isFinite(tc_hr)) return { error: "Time-of-concentration math is not a finite value." };
  return {
    tt_sheet_min: tt_sheet_hr * 60,
    tt_shallow_min: tt_shallow_hr * 60,
    tt_channel_min: tt_channel_hr * 60,
    tc_min: tc_hr * 60,
    tc_hr,
    v_shallow_fps,
    v_channel_fps,
    sheet_over_100,
    note: "The NRCS TR-55 travel-time (velocity) method sums the time through up to three flow regimes to the time of concentration: SHEET flow over the plane at the head of the watershed (Tt = 0.007 (n L)^0.8 / (P2^0.5 s^0.4), with n the overland roughness -- about 0.011 smooth paved, 0.15 short grass, 0.24 dense grass, 0.40 light woods -- and P2 the local 2-year 24-hour rainfall), SHALLOW CONCENTRATED flow in rills and swales (V = 16.13 sqrt(s) unpaved or 20.33 sqrt(s) paved), and open CHANNEL flow by Manning. Enter a length of 0 to skip a segment. TR-55 caps sheet flow at 100 ft (the 2010 revision); beyond that the flow has concentrated, so a length over 100 ft is flagged. This is the method Kirpich (the time-of-concentration tile) approximates in one channel equation. A design aid; the local drainage manual and the engineer of record govern.",
  };
}
export const tr55TimeOfConcentrationExample = { inputs: { sheet_n: 0.24, sheet_length_ft: 100, p2_in: 3.6, sheet_slope: 0.01, shallow_surface: "unpaved", shallow_length_ft: 1400, shallow_slope: 0.01, channel_n: 0.05, channel_hyd_radius_ft: 0.75, channel_length_ft: 3000, channel_slope: 0.005 } };

function renderTr55TimeOfConcentration(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NRCS TR-55 (Urban Hydrology for Small Watersheds, 1986) Chapter 3 velocity method: sheet-flow Tt = 0.007 (n L)^0.8 / (P2^0.5 s^0.4), shallow-concentrated V = 16.1345 sqrt(s) (unpaved) / 20.3282 sqrt(s) (paved), channel V = (1.49/n) R^(2/3) sqrt(s), Tt = L/(3600 V); Tc = sum. A public USDA/NRCS document. Sheet flow capped at 100 ft. The overland roughness and the 2-year 24-hour rainfall are user-supplied. A design aid; the local drainage manual and the engineer of record govern.";
  const mk = (label, id, val) => { const f = makeNumber(label, id, { step: "any", min: "0" }); if (val !== undefined) f.input.value = String(val); return f; };
  const sN = mk("Sheet: Manning n (overland)", "tr-sn", 0.24);
  const sL = mk("Sheet: length (ft, <= 100)", "tr-sl", 100);
  const p2 = mk("Sheet: 2-yr 24-hr rainfall P2 (in)", "tr-p2", 3.6);
  const sS = mk("Sheet: slope (ft/ft)", "tr-ss", 0.01);
  const shSurf = makeSelect("Shallow concentrated: surface", "tr-shsurf", [
    { value: "unpaved", label: "Unpaved (V = 16.13 sqrt s)", selected: true },
    { value: "paved", label: "Paved (V = 20.33 sqrt s)" },
  ]);
  const shL = mk("Shallow: length (ft, 0 to skip)", "tr-shl", 1400);
  const shS = mk("Shallow: slope (ft/ft)", "tr-shs", 0.01);
  const cN = mk("Channel: Manning n", "tr-cn", 0.05);
  const cR = mk("Channel: hydraulic radius R (ft)", "tr-cr", 0.75);
  const cL = mk("Channel: length (ft, 0 to skip)", "tr-cl", 3000);
  const cS = mk("Channel: slope (ft/ft)", "tr-cs", 0.005);
  for (const f of [sN, sL, p2, sS]) inputRegion.appendChild(f.wrap);
  inputRegion.appendChild(shSurf.wrap);
  for (const f of [shL, shS, cN, cR, cL, cS]) inputRegion.appendChild(f.wrap);
  const oTc = makeOutputLine(outputRegion, "Time of concentration", "tr-out-tc");
  const oSeg = makeOutputLine(outputRegion, "By segment (sheet / shallow / channel)", "tr-out-seg");
  const oVel = makeOutputLine(outputRegion, "Velocities (shallow / channel)", "tr-out-vel");
  const oNote = makeOutputLine(outputRegion, "Note", "tr-out-note");
  attachExampleButton(inputRegion, () => {
    sN.input.value = "0.24"; sL.input.value = "100"; p2.input.value = "3.6"; sS.input.value = "0.01";
    shSurf.select.value = "unpaved"; shL.input.value = "1400"; shS.input.value = "0.01";
    cN.input.value = "0.05"; cR.input.value = "0.75"; cL.input.value = "3000"; cS.input.value = "0.005"; update();
  });
  const rd = (i) => (i.value === "" ? 0 : Number(i.value) || 0);
  const update = debounce(() => {
    const r = computeTr55TimeOfConcentration({
      sheet_n: rd(sN.input), sheet_length_ft: rd(sL.input), p2_in: rd(p2.input), sheet_slope: rd(sS.input),
      shallow_surface: shSurf.select.value, shallow_length_ft: rd(shL.input), shallow_slope: rd(shS.input),
      channel_n: rd(cN.input), channel_hyd_radius_ft: rd(cR.input), channel_length_ft: rd(cL.input), channel_slope: rd(cS.input),
    });
    if (r.error) { oTc.textContent = r.error; oSeg.textContent = "-"; oVel.textContent = "-"; oNote.textContent = ""; return; }
    oTc.textContent = fmt(r.tc_min, 1) + " min (" + fmt(r.tc_hr, 3) + " hr)" + (r.sheet_over_100 ? " -- sheet length over 100 ft, TR-55 caps it" : "");
    oSeg.textContent = fmt(r.tt_sheet_min, 1) + " / " + fmt(r.tt_shallow_min, 1) + " / " + fmt(r.tt_channel_min, 1) + " min";
    oVel.textContent = (r.v_shallow_fps === null ? "-" : fmt(r.v_shallow_fps, 2) + " ft/s") + " / " + (r.v_channel_fps === null ? "-" : fmt(r.v_channel_fps, 2) + " ft/s");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [sN, sL, p2, sS, shL, shS, cN, cR, cL, cS]) f.input.addEventListener("input", update);
  shSurf.select.addEventListener("change", update);
  update();
}
DRAINAGE_RENDERERS["tr55-time-of-concentration"] = renderTr55TimeOfConcentration;

// ===================== spec-v1201: SCS/NRCS Curve Number runoff depth =====================
// The stormwater-rational tile gives the peak flow rate (Q = C i A) and tr55-time-of-concentration
// the timing, but neither gives the runoff DEPTH/volume a detention basin is sized on. The
// NRCS Curve Number method (TR-55 Chapter 2) is the standard for that: from a rainfall depth and
// a curve number it returns the runoff depth, and with a drainage area the runoff volume.
// Verified against the TR-55 runoff figure (P=5 in, CN=80 -> Q=2.89 in).
// dims: in { rainfall_in: L, curve_number: dimensionless, area_acres: dimensionless } out: { retention_s_in: L, initial_abstraction_in: L, runoff_in: L, runoff_coefficient: dimensionless, runoff_volume_acreft: L^3, runoff_volume_ft3: L^3, runoff_gal: L^3 }
export function computeCurveNumberRunoff({ rainfall_in = 0, curve_number = 0, area_acres = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const P = Number(rainfall_in) || 0;
  const CN = Number(curve_number) || 0;
  const area = Number(area_acres) || 0;
  if (!(P > 0)) return { error: "Rainfall depth must be positive (in)." };
  if (!(CN > 0 && CN <= 100)) return { error: "Curve number must be between 0 and 100 (typical 30 to 98)." };
  if (area < 0) return { error: "Drainage area cannot be negative (acres)." };
  const S = 1000 / CN - 10;                                  // potential maximum retention (in)
  const Ia = 0.2 * S;                                        // initial abstraction (in)
  const runoff_in = P <= Ia ? 0 : Math.pow(P - Ia, 2) / (P - Ia + S); // runoff depth (in)
  const runoff_coefficient = runoff_in / P;
  let runoff_volume_acreft = null, runoff_volume_ft3 = null, runoff_gal = null;
  if (area > 0) {
    runoff_volume_acreft = (runoff_in / 12) * area;          // in x acres / 12 = acre-ft
    runoff_volume_ft3 = runoff_volume_acreft * 43560;
    runoff_gal = runoff_volume_ft3 * 7.48052;
  }
  if (![S, Ia, runoff_in, runoff_coefficient].every(Number.isFinite)) return { error: "Curve-number math is not a finite value." };
  return {
    retention_s_in: S, initial_abstraction_in: Ia, runoff_in, runoff_coefficient,
    runoff_volume_acreft, runoff_volume_ft3, runoff_gal,
    note: "The NRCS Curve Number method (TR-55 Chapter 2) for the runoff DEPTH from a storm, which the rational method (a peak flow rate) and the time-of-concentration tiles do not give: the potential maximum retention S = 1000/CN - 10 (in), the initial abstraction Ia = 0.2 S (the rain that soaks in, wets surfaces, and ponds before any runoff), and the runoff Q = (P - Ia)^2 / (P - Ia + S) for P above Ia, else zero. The curve number (30 to 98) comes from the land cover and the hydrologic soil group (NRCS TR-55 Table 2-2, user-supplied) - a paved lot is near 98, woods on sandy soil near 30. A higher CN means less retention and more runoff; because of the Ia threshold, a small storm on a low CN produces no runoff at all. With a drainage area the runoff depth becomes a volume for sizing a detention basin. The standard Ia = 0.2 S is used here (some agencies now use 0.05 S, which raises runoff on small storms); a single design storm, not a continuous simulation or a routed hydrograph. A design aid; the local drainage manual and the engineer of record govern.",
  };
}
export const curveNumberRunoffExample = { inputs: { rainfall_in: 5, curve_number: 80, area_acres: 10 } };
function renderCurveNumberRunoff(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NRCS Curve Number runoff method (TR-55 Urban Hydrology for Small Watersheds, Chapter 2): S = 1000/CN - 10, Ia = 0.2 S, Q = (P - Ia)^2 / (P - Ia + S) for P > Ia (runoff depth, in). A public USDA/NRCS document. The curve number (from land cover and hydrologic soil group, TR-55 Table 2-2) and the rainfall depth are user-supplied; Ia = 0.2 S is the standard assumption. A design aid; the local drainage manual and the engineer of record govern.";
  const p = makeNumber("Storm rainfall depth P (in)", "cnr-p", { step: "any", min: "0", value: "5" }); p.input.value = "5";
  const cn = makeNumber("Curve number CN (30 to 98)", "cnr-cn", { step: "any", min: "0", max: "100", value: "80" }); cn.input.value = "80";
  const ac = makeNumber("Drainage area (acres, optional)", "cnr-ac", { step: "any", min: "0", value: "10" }); ac.input.value = "10";
  for (const f of [p, cn, ac]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { p.input.value = "5"; cn.input.value = "80"; ac.input.value = "10"; update(); });
  const oQ = makeOutputLine(outputRegion, "Runoff depth Q", "cnr-out-q");
  const oSIa = makeOutputLine(outputRegion, "Retention S / initial abstraction Ia", "cnr-out-sia");
  const oVol = makeOutputLine(outputRegion, "Runoff volume (at this area)", "cnr-out-vol");
  const oNote = makeOutputLine(outputRegion, "Note", "cnr-out-note");
  const rd = (i) => (i.value === "" ? 0 : Number(i.value) || 0);
  const update = debounce(() => {
    const r = computeCurveNumberRunoff({ rainfall_in: rd(p.input), curve_number: rd(cn.input), area_acres: rd(ac.input) });
    if (r.error) { oQ.textContent = r.error; oSIa.textContent = "-"; oVol.textContent = "-"; oNote.textContent = ""; return; }
    oQ.textContent = fmt(r.runoff_in, 3) + " in (" + fmt(r.runoff_coefficient * 100, 0) + "% of the " + fmt(rd(p.input), 2) + " in storm)";
    oSIa.textContent = fmt(r.retention_s_in, 3) + " in / " + fmt(r.initial_abstraction_in, 3) + " in";
    oVol.textContent = r.runoff_volume_acreft === null ? "- (enter a drainage area)" : fmt(r.runoff_volume_acreft, 3) + " acre-ft (" + fmt(r.runoff_volume_ft3, 0) + " ft^3, " + fmt(r.runoff_gal, 0) + " gal)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [p, cn, ac]) f.input.addEventListener("input", update);
  update();
}
DRAINAGE_RENDERERS["curve-number-runoff"] = renderCurveNumberRunoff;

// ===================== TR-55 Chapter 4: graphical peak discharge =====================
// Table F-1 (TR-55 Appendix F, public-domain USDA/NRCS, 1986): coefficients for the unit
// peak discharge log10(qu) = C0 + C1 log10(Tc) + C2 (log10 Tc)^2, keyed by rainfall type;
// each row is [Ia/P, C0, C1, C2]. Verified against TR-55 example 4-1.
const TR55_QU_COEFFS = {
  I: [[0.10, 2.30550, -0.51429, -0.11750], [0.20, 2.23537, -0.50387, -0.08929], [0.25, 2.18219, -0.48488, -0.06589], [0.30, 2.10624, -0.45695, -0.02835], [0.35, 2.00303, -0.40769, 0.01983], [0.40, 1.87733, -0.32274, 0.05754], [0.45, 1.76312, -0.15644, 0.00453], [0.50, 1.67889, -0.06930, 0.0]],
  IA: [[0.10, 2.03250, -0.31583, -0.13748], [0.20, 1.91978, -0.28215, -0.07020], [0.25, 1.83842, -0.25543, -0.02597], [0.30, 1.72657, -0.19826, 0.02633], [0.50, 1.63417, -0.09100, 0.0]],
  II: [[0.10, 2.55323, -0.61512, -0.16403], [0.30, 2.46532, -0.62257, -0.11657], [0.35, 2.41896, -0.61594, -0.08820], [0.40, 2.36409, -0.59857, -0.05621], [0.45, 2.29238, -0.57005, -0.02281], [0.50, 2.20282, -0.51599, -0.01259]],
  III: [[0.10, 2.47317, -0.51848, -0.17083], [0.30, 2.39628, -0.51202, -0.13245], [0.35, 2.35477, -0.49735, -0.11985], [0.40, 2.30726, -0.46541, -0.11094], [0.45, 2.24876, -0.41314, -0.11508], [0.50, 2.17772, -0.36803, -0.09525]],
};
// Table 4-2: pond/swamp adjustment factor Fp, [percent of Am, Fp].
const TR55_FP_TABLE = [[0, 1.00], [0.2, 0.97], [1.0, 0.87], [3.0, 0.75], [5.0, 0.72]];
function _tr55InterpTable(table, x, yLo, yHi) {
  if (x <= table[0][0]) return table[0][yLo === undefined ? 1 : yLo];
  const last = table[table.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 0; i < table.length - 1; i++) {
    if (x >= table[i][0] && x <= table[i + 1][0]) {
      const t = (x - table[i][0]) / (table[i + 1][0] - table[i][0]);
      return table[i][1] + t * (table[i + 1][1] - table[i][1]);
    }
  }
  return last[1];
}
// dims: in { tc_hr: T, curve_number: dimensionless, rainfall_in: L, area_mi2: L^2, pond_pct: dimensionless }
//       out: { qp_cfs: L^3 T^-1, runoff_in: L, retention_s_in: L, initial_abstraction_in: L }
// (qu is the empirical unit peak discharge in csm/in and Ia/P, Fp are dimensionless ratios;
//  the peak discharge qp = qu*Am*Q*Fp resolves to a volumetric flow L^3 T^-1.)
export function computeTr55GraphicalPeakDischarge({ tc_hr = 0, curve_number = 0, rainfall_in = 0, area_mi2 = 0, rainfall_type = "II", pond_pct = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Tc = Number(tc_hr) || 0;
  const CN = Number(curve_number) || 0;
  const P = Number(rainfall_in) || 0;
  const Am = Number(area_mi2) || 0;
  const pond = Number(pond_pct) || 0;
  const coeffs = TR55_QU_COEFFS[rainfall_type];
  if (!coeffs) return { error: "Rainfall type must be I, IA, II, or III." };
  if (!(Tc > 0)) return { error: "Time of concentration must be positive (hr)." };
  if (!(CN > 40 && CN <= 100)) return { error: "Curve number must be above 40 and at most 100 (the graphical method requires CN > 40)." };
  if (!(P > 0)) return { error: "Design rainfall depth must be positive (in)." };
  if (!(Am > 0)) return { error: "Drainage area must be positive (mi^2)." };
  if (pond < 0) return { error: "Pond/swamp percentage cannot be negative." };
  const S = 1000 / CN - 10;
  const Ia = 0.2 * S;
  const Q = P <= Ia ? 0 : Math.pow(P - Ia, 2) / (P - Ia + S);
  // TR-55 bounds Tc to 0.1-10 hr and Ia/P to the exhibit range; hold at the limit and flag.
  let tcUsed = Tc, tcClamped = false;
  if (Tc < 0.1) { tcUsed = 0.1; tcClamped = true; } else if (Tc > 10) { tcUsed = 10; tcClamped = true; }
  const iaPraw = Ia / P;
  const lo = coeffs[0][0], hi = coeffs[coeffs.length - 1][0];
  let iaP = iaPraw, iaPClamped = false;
  if (iaPraw < lo) { iaP = lo; iaPClamped = true; } else if (iaPraw > hi) { iaP = hi; iaPClamped = true; }
  const logTc = Math.log10(tcUsed);
  const quAt = (row) => Math.pow(10, row[1] + row[2] * logTc + row[3] * logTc * logTc);
  let qu;
  if (iaP <= coeffs[0][0]) qu = quAt(coeffs[0]);
  else if (iaP >= coeffs[coeffs.length - 1][0]) qu = quAt(coeffs[coeffs.length - 1]);
  else {
    for (let i = 0; i < coeffs.length - 1; i++) {
      if (iaP >= coeffs[i][0] && iaP <= coeffs[i + 1][0]) {
        const t = (iaP - coeffs[i][0]) / (coeffs[i + 1][0] - coeffs[i][0]);
        qu = quAt(coeffs[i]) + t * (quAt(coeffs[i + 1]) - quAt(coeffs[i]));
        break;
      }
    }
  }
  const fp = _tr55InterpTable(TR55_FP_TABLE, pond);
  const qp = qu * Am * Q * fp;
  if (![S, Ia, Q, qu, fp, qp].every(Number.isFinite)) return { error: "Peak-discharge math is not a finite value." };
  return {
    qp_cfs: qp, qu_csm_in: qu, runoff_in: Q, ia_over_p: iaPraw, ia_over_p_used: iaP, fp,
    retention_s_in: S, initial_abstraction_in: Ia, tc_used_hr: tcUsed, ia_p_clamped: iaPClamped, tc_clamped: tcClamped,
    note: "The NRCS TR-55 Graphical Peak Discharge method (Chapter 4) for the PEAK flow rate qp, which the runoff-depth tile (a volume) and the rational method (a different empirical peak) do not give from a curve-number watershed: qp = qu Am Q Fp. The unit peak discharge qu (csm/in) comes from the time of concentration Tc and the ratio Ia/P through the Appendix F regression log10(qu) = C0 + C1 log10(Tc) + C2 (log10 Tc)^2 for the chosen rainfall type (I, IA, II, III); Am is the drainage area (mi^2), Q is the runoff depth (in) from the curve number, and Fp is the pond/swamp adjustment (Table 4-2, 1.0 at zero percent). Tc is held to 0.1-10 hr and Ia/P to the exhibit range (about 0.1 to 0.5); values outside are pinned to the limit and flagged. TR-55 example 4-1 (0.39 mi^2, CN 75, a 6 in type-II storm, Tc 1.53 hr) gives Ia/P 0.11, qu 269 csm/in, Q 3.28 in, and qp 344 cfs. One homogeneous watershed with a single CN and main channel; no reservoir routing and no hydrograph (use the tabular hydrograph method or TR-20 for those). A design aid; the local drainage manual and the engineer of record govern.",
  };
}
export const tr55GraphicalPeakDischargeExample = { inputs: { tc_hr: 1.53, curve_number: 75, rainfall_in: 6.0, area_mi2: 0.39, rainfall_type: "II", pond_pct: 0 } };
function renderTr55GraphicalPeakDischarge(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NRCS TR-55 Graphical Peak Discharge method (Urban Hydrology for Small Watersheds, Chapter 4 with Appendix F Table F-1 and Table 4-2): qp = qu Am Q Fp, with the unit peak discharge log10(qu) = C0 + C1 log10(Tc) + C2 (log10 Tc)^2 by rainfall type and Ia/P. A public USDA/NRCS document; Tc from Chapter 3, Q from the curve number (Chapter 2), Fp from Table 4-2. Valid for Tc 0.1 to 10 hr, Ia/P 0.1 to 0.5, and CN above 40. A design aid; the local drainage manual and the engineer of record govern.";
  const tc = makeNumber("Time of concentration Tc (hr, 0.1 to 10)", "tpd-tc", { step: "any", min: "0", value: "1.53" }); tc.input.value = "1.53";
  const cn = makeNumber("Curve number CN (above 40)", "tpd-cn", { step: "any", min: "0", max: "100", value: "75" }); cn.input.value = "75";
  const p = makeNumber("Design rainfall P, 24-hr (in)", "tpd-p", { step: "any", min: "0", value: "6" }); p.input.value = "6";
  const area = makeNumber("Drainage area (mi^2)", "tpd-area", { step: "any", min: "0", value: "0.39" }); area.input.value = "0.39";
  const type = makeSelect("Rainfall distribution", "tpd-type", [
    { value: "I", label: "Type I" }, { value: "IA", label: "Type IA" }, { value: "II", label: "Type II", selected: true }, { value: "III", label: "Type III" },
  ]);
  const pond = makeNumber("Pond/swamp area (% of watershed)", "tpd-pond", { step: "any", min: "0", value: "0" }); pond.input.value = "0";
  for (const f of [tc, cn, p, area, type, pond]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { tc.input.value = "1.53"; cn.input.value = "75"; p.input.value = "6"; area.input.value = "0.39"; type.select.value = "II"; pond.input.value = "0"; update(); });
  const oQp = makeOutputLine(outputRegion, "Peak discharge qp", "tpd-out-qp");
  const oQu = makeOutputLine(outputRegion, "Unit peak discharge qu / runoff Q", "tpd-out-qu");
  const oIaP = makeOutputLine(outputRegion, "Ia/P / pond factor Fp", "tpd-out-iap");
  const oNote = makeOutputLine(outputRegion, "Note", "tpd-out-note");
  const rd = (i) => (i.value === "" ? 0 : Number(i.value) || 0);
  const update = debounce(() => {
    const r = computeTr55GraphicalPeakDischarge({ tc_hr: rd(tc.input), curve_number: rd(cn.input), rainfall_in: rd(p.input), area_mi2: rd(area.input), rainfall_type: type.select.value, pond_pct: rd(pond.input) });
    if (r.error) { oQp.textContent = r.error; oQu.textContent = "-"; oIaP.textContent = "-"; oNote.textContent = ""; return; }
    oQp.textContent = fmt(r.qp_cfs, 0) + " cfs" + (r.runoff_in === 0 ? " (no runoff: storm below Ia)" : "");
    oQu.textContent = fmt(r.qu_csm_in, 0) + " csm/in / " + fmt(r.runoff_in, 2) + " in" + (r.tc_clamped ? " (Tc held at the 0.1-10 hr limit)" : "");
    oIaP.textContent = fmt(r.ia_over_p, 3) + (r.ia_p_clamped ? " -> held at " + fmt(r.ia_over_p_used, 2) + " (exhibit limit)" : "") + " / Fp " + fmt(r.fp, 2);
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [tc, cn, p, area, pond]) f.input.addEventListener("input", update);
  type.select.addEventListener("change", update);
  update();
}
DRAINAGE_RENDERERS["tr55-graphical-peak-discharge"] = renderTr55GraphicalPeakDischarge;
