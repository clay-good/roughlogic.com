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
