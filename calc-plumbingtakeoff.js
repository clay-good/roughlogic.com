// Group B (cont.): the plumbing TAKEOFF and materials bench, split out of
// calc-plumbing.js for cap relief (spec-v1030). calc-plumbing.js had reached
// 99.4% of its 76,000 B gzip cap, so the next plumbing tile would have failed
// check-module-sizes; the repo's stated preference is a per-tile split over
// another cap raise.
//
// These seven tiles are the materials/quantity half of the plumbing bench --
// what you BUY and install, rather than what the hydraulics require. They were
// chosen because they form a contiguous, fully self-contained block: each
// tile's compute and renderer are co-located, and none of them reads a shared
// constant from the hydraulics half (the Manning roughness table and the
// partial-flow theta constants stay behind with their tiles). Tiles:
//   v856 solder-joint-quantity   (solder and flux per sweat joint)
//   v857 pipe-insulation-takeoff (insulation and jacket material)
//   v858 heat-trace-sizing       (freeze-protection cable and circuit)
//   v894 pipe-purge-volume       (inert purge volume and time)
//   v903 hydronic-system-volume  (system water and glycol volume)
//   v906 pex-homerun-takeoff     (manifold port and tubing takeoff)
//   v987 solar-thermal-collector (flat-plate collector output)
// Every tile keeps group: "B" (a tile's group letter is independent of the
// module that holds it -- the spec-v70..v98 split precedent). Lazy-loaded, so
// it is not in the home-view first-paint payload.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

export const PLUMBINGTAKEOFF_RENDERERS = {};

// v18 §7 contract guard: reject a non-finite numeric input (copied verbatim
// from the sibling calc-* modules; non-exported, so it adds no corpus row).
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

// ===================== spec-v856: solder and flux per sweat-joint takeoff =====================
// dims: in { joints: dimensionless, wire_in_per_joint: L, wire_dia_in: L, solder_density_lb_in3: M L^-3, spool_lb: M } out: { w_per_in: M L^-1, solder_lb: M, spools: dimensionless }
export function computeSolderJointQuantity({ joints = 200, wire_in_per_joint = 0.75, wire_dia_in = 0.125, solder_density_lb_in3 = 0.30, spool_lb = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(joints > 0)) return { error: "Joint count must be positive." };
  if (!(wire_in_per_joint > 0)) return { error: "Wire per joint must be positive (in)." };
  if (!(wire_dia_in > 0)) return { error: "Wire diameter must be positive (in)." };
  if (!(solder_density_lb_in3 > 0)) return { error: "Solder density must be positive (lb/in^3)." };
  if (!(spool_lb > 0)) return { error: "Spool weight must be positive (lb)." };
  const w_per_in = (Math.PI / 4) * wire_dia_in * wire_dia_in * solder_density_lb_in3;
  const solder_lb = joints * wire_in_per_joint * w_per_in;
  const spools = Math.ceil(solder_lb / spool_lb);
  if (![w_per_in, solder_lb, spools].every(Number.isFinite)) return { error: "Solder math is not a finite value." };
  return {
    w_per_in,
    solder_lb,
    spools,
    note: "The wire length per joint is a field rule of thumb (roughly the pipe diameter in inches of 1/8 in solid wire) that varies with cup depth and technique. Lead-free solder runs about 0.30 lb/in^3. The crew buys spools with a spare. Flux is a separate small line, roughly one 4 oz jar per 100-150 joints.",
  };
}

export const solderJointQuantityExample = { inputs: { joints: 200, wire_in_per_joint: 0.75, wire_dia_in: 0.125, solder_density_lb_in3: 0.30, spool_lb: 1 } };

function _v856renderSolderJointQuantity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: solder-weight identity by name. weight per inch = pi/4 x diameter^2 x density; solder = joints x wire per joint x weight per inch. The wire per joint is a field rule (~the pipe diameter in inches of 1/8 in wire); lead-free solder is ~0.30 lb/in^3.";
  const j = makeNumber("Joints to sweat", "sjq-j", { step: "any", min: "0" });
  const wj = makeNumber("Solder wire per joint (in)", "sjq-wj", { step: "any", min: "0" });
  const wd = makeNumber("Solder wire diameter (in)", "sjq-wd", { step: "any", min: "0" });
  const dn = makeNumber("Solder density (lb/in³)", "sjq-dn", { step: "any", min: "0" });
  const sp = makeNumber("Spool weight (lb)", "sjq-sp", { step: "any", min: "0" });
  for (const f of [j, wj, wd, dn, sp]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { j.input.value = "200"; wj.input.value = "0.75"; wd.input.value = "0.125"; dn.input.value = "0.30"; sp.input.value = "1"; update(); });
  const oSolder = makeOutputLine(outputRegion, "Solder to order", "sjq-out-solder");
  const oSpools = makeOutputLine(outputRegion, "Spools", "sjq-out-spools");
  const update = debounce(() => {
    const r = computeSolderJointQuantity({
      joints: j.input.value === "" ? 200 : Number(j.input.value), wire_in_per_joint: wj.input.value === "" ? 0.75 : Number(wj.input.value),
      wire_dia_in: wd.input.value === "" ? 0.125 : Number(wd.input.value), solder_density_lb_in3: dn.input.value === "" ? 0.30 : Number(dn.input.value),
      spool_lb: sp.input.value === "" ? 1 : Number(sp.input.value),
    });
    if (r.error) { oSolder.textContent = r.error; oSpools.textContent = "-"; return; }
    oSolder.textContent = fmt(r.solder_lb, 2) + " lb";
    oSpools.textContent = fmt(r.spools, 0) + " spools";
  }, DEBOUNCE_MS);
  for (const f of [j, wj, wd, dn, sp]) f.input.addEventListener("input", update);
}
PLUMBINGTAKEOFF_RENDERERS["solder-joint-quantity"] = _v856renderSolderJointQuantity;

// ===================== spec-v857: pipe insulation and jacket material takeoff =====================
// dims: in { pipe_ft: L, waste_pct: dimensionless, num_fittings: dimensionless, fitting_allow_ft: L, section_len_ft: L, insul_od_in: L } out: { cut_ft: L, sections: dimensionless, jacket_sf: L^2 }
export function computePipeInsulationTakeoff({ pipe_ft = 250, waste_pct = 5, num_fittings = 12, fitting_allow_ft = 1, section_len_ft = 3, insul_od_in = 4.5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pipe_ft > 0)) return { error: "Pipe length must be positive (ft)." };
  if (!(fitting_allow_ft > 0)) return { error: "Fitting allowance must be positive (ft)." };
  if (!(section_len_ft > 0)) return { error: "Section length must be positive (ft)." };
  if (!(insul_od_in > 0)) return { error: "Insulation OD must be positive (in)." };
  if (waste_pct < 0) return { error: "Waste cannot be negative (percent)." };
  if (num_fittings < 0) return { error: "Fitting count cannot be negative." };
  const cut_ft = pipe_ft * (1 + waste_pct / 100) + num_fittings * fitting_allow_ft;
  const sections = Math.ceil(cut_ft / section_len_ft);
  const jacket_sf = Math.PI * (insul_od_in / 12) * cut_ft;
  if (![cut_ft, sections, jacket_sf].every(Number.isFinite)) return { error: "Insulation-takeoff math is not a finite value." };
  return {
    cut_ft,
    sections,
    jacket_sf,
    note: "The fitting allowance covers ells, tees, and valves (a valve is several feet of equivalent length). The jacket area uses the insulation outside diameter (not the pipe). This is a material takeoff distinct from the thermal insulation-thickness; the spec sets the thickness and jacket type.",
  };
}

export const pipeInsulationTakeoffExample = { inputs: { pipe_ft: 250, waste_pct: 5, num_fittings: 12, fitting_allow_ft: 1, section_len_ft: 3, insul_od_in: 4.5 } };

function _v857renderPipeInsulationTakeoff(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: insulation-takeoff identity by name. cut = pipe x (1 + waste) + fittings x allowance; sections = ceil(cut / section length); jacket = pi x insulation OD x cut. The jacket area uses the insulation OD, not the pipe.";
  const p = makeNumber("Pipe run length (ft)", "pit-p", { step: "any", min: "0" });
  const w = makeNumber("Waste allowance (percent)", "pit-w", { step: "any", min: "0" });
  const nf = makeNumber("Ells / tees / valves (count)", "pit-nf", { step: "any", min: "0" });
  const fa = makeNumber("Insulation allowance per fitting (ft)", "pit-fa", { step: "any", min: "0" });
  const sl = makeNumber("Insulation section length (ft)", "pit-sl", { step: "any", min: "0" });
  const od = makeNumber("Insulation outside diameter (in)", "pit-od", { step: "any", min: "0" });
  for (const f of [p, w, nf, fa, sl, od]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { p.input.value = "250"; w.input.value = "5"; nf.input.value = "12"; fa.input.value = "1"; sl.input.value = "3"; od.input.value = "4.5"; update(); });
  const oSections = makeOutputLine(outputRegion, "Insulation sections", "pit-out-sections");
  const oJacket = makeOutputLine(outputRegion, "Jacket area", "pit-out-jacket");
  const update = debounce(() => {
    const r = computePipeInsulationTakeoff({
      pipe_ft: p.input.value === "" ? 250 : Number(p.input.value), waste_pct: w.input.value === "" ? 0 : Number(w.input.value),
      num_fittings: nf.input.value === "" ? 0 : Number(nf.input.value), fitting_allow_ft: fa.input.value === "" ? 1 : Number(fa.input.value),
      section_len_ft: sl.input.value === "" ? 3 : Number(sl.input.value), insul_od_in: od.input.value === "" ? 4.5 : Number(od.input.value),
    });
    if (r.error) { oSections.textContent = r.error; oJacket.textContent = "-"; return; }
    oSections.textContent = fmt(r.sections, 0) + " sections (" + fmt(r.cut_ft, 1) + " ft cut)";
    oJacket.textContent = fmt(r.jacket_sf, 0) + " sf";
  }, DEBOUNCE_MS);
  for (const f of [p, w, nf, fa, sl, od]) f.input.addEventListener("input", update);
}
PLUMBINGTAKEOFF_RENDERERS["pipe-insulation-takeoff"] = _v857renderPipeInsulationTakeoff;

// ===================== spec-v858: freeze-protection heat-trace cable and circuit =====================
// dims: in { pipe_ft: L, allowance_pct: dimensionless, num_valves: dimensionless, valve_allow_ft: L, rated_w_per_ft: dimensionless, voltage: dimensionless, breaker_a: dimensionless } out: { cable_ft: L, watts: dimensionless, amps: dimensionless }
export function computeHeatTraceSizing({ pipe_ft = 150, allowance_pct = 10, num_valves = 1, valve_allow_ft = 3, rated_w_per_ft = 5, voltage = 120, breaker_a = 20 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pipe_ft > 0)) return { error: "Pipe length must be positive (ft)." };
  if (!(rated_w_per_ft > 0)) return { error: "Rated wattage must be positive (W/ft)." };
  if (!(voltage > 0)) return { error: "Voltage must be positive (V)." };
  if (!(breaker_a > 0)) return { error: "Breaker rating must be positive (A)." };
  if (allowance_pct < 0) return { error: "Allowance cannot be negative (percent)." };
  if (num_valves < 0) return { error: "Valve count cannot be negative." };
  if (valve_allow_ft < 0) return { error: "Valve allowance cannot be negative (ft)." };
  const cable_ft = pipe_ft * (1 + allowance_pct / 100) + num_valves * valve_allow_ft;
  const watts = rated_w_per_ft * cable_ft;
  const amps = watts / voltage;
  const breaker_ok = amps <= 0.8 * breaker_a;
  if (![cable_ft, watts, amps].every(Number.isFinite)) return { error: "Heat-trace math is not a finite value." };
  return {
    cable_ft,
    watts,
    amps,
    breaker_ok,
    note: "The required W/ft (the pipe heat loss) comes from insulation-heat-loss or the manufacturer; the picked cable must be rated at or above it. Valves, flanges, and supports are heat sinks that add cable. A cold start can draw two to three times the steady current on self-regulating cable. The manufacturer's design tables and maximum circuit length govern.",
  };
}

export const heatTraceSizingExample = { inputs: { pipe_ft: 150, allowance_pct: 10, num_valves: 1, valve_allow_ft: 3, rated_w_per_ft: 5, voltage: 120, breaker_a: 20 } };

function _v858renderHeatTraceSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: heat-trace identity by name. cable = pipe x (1 + allowance) + valves x allowance; watts = rated W/ft x cable; amps = watts / voltage. Continuous load must stay under 80% of the breaker. The manufacturer's tables and max circuit length govern.";
  const p = makeNumber("Pipe run length (ft)", "hts-p", { step: "any", min: "0" });
  const al = makeNumber("Support / spiral allowance (percent)", "hts-al", { step: "any", min: "0" });
  const nv = makeNumber("Valves and flanges (count)", "hts-nv", { step: "any", min: "0" });
  const va = makeNumber("Cable allowance per valve (ft)", "hts-va", { step: "any", min: "0" });
  const wf = makeNumber("Cable rated wattage (W/ft)", "hts-wf", { step: "any", min: "0" });
  const v = makeNumber("Supply voltage (V)", "hts-v", { step: "any", min: "0" });
  const br = makeNumber("Circuit breaker rating (A)", "hts-br", { step: "any", min: "0" });
  for (const f of [p, al, nv, va, wf, v, br]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { p.input.value = "150"; al.input.value = "10"; nv.input.value = "1"; va.input.value = "3"; wf.input.value = "5"; v.input.value = "120"; br.input.value = "20"; update(); });
  const oCable = makeOutputLine(outputRegion, "Heat-trace cable", "hts-out-cable");
  const oCircuit = makeOutputLine(outputRegion, "Circuit load", "hts-out-circuit");
  const update = debounce(() => {
    const r = computeHeatTraceSizing({
      pipe_ft: p.input.value === "" ? 150 : Number(p.input.value), allowance_pct: al.input.value === "" ? 0 : Number(al.input.value),
      num_valves: nv.input.value === "" ? 0 : Number(nv.input.value), valve_allow_ft: va.input.value === "" ? 3 : Number(va.input.value),
      rated_w_per_ft: wf.input.value === "" ? 5 : Number(wf.input.value), voltage: v.input.value === "" ? 120 : Number(v.input.value),
      breaker_a: br.input.value === "" ? 20 : Number(br.input.value),
    });
    if (r.error) { oCable.textContent = r.error; oCircuit.textContent = "-"; return; }
    oCable.textContent = fmt(r.cable_ft, 0) + " ft (" + fmt(r.watts, 0) + " W)";
    oCircuit.textContent = fmt(r.amps, 1) + " A - " + (r.breaker_ok ? "OK on one circuit" : "OVER 80% - split the run");
  }, DEBOUNCE_MS);
  for (const f of [p, al, nv, va, wf, v, br]) f.input.addEventListener("input", update);
}
PLUMBINGTAKEOFF_RENDERERS["heat-trace-sizing"] = _v858renderHeatTraceSizing;

// ===================== spec-v894: pipe inert purge volume and time =====================
// dims: in { pipe_id_in: L, length_ft: L, air_changes: dimensionless, flow_scfh: L^3 T^-1 } out: { pipe_volume_ft3: L^3, purge_volume_ft3: L^3, purge_min: T }
export function computePipePurgeVolume({ pipe_id_in = 2.067, length_ft = 100, air_changes = 5, flow_scfh = 60 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pipe_id_in > 0)) return { error: "Pipe inside diameter must be positive (in)." };
  if (!(length_ft > 0)) return { error: "Run length must be positive (ft)." };
  if (!(air_changes > 0)) return { error: "Air changes must be positive." };
  if (!(flow_scfh > 0)) return { error: "Purge flow must be positive (scfh)." };
  const pipe_volume_ft3 = (Math.PI / 4) * Math.pow(pipe_id_in / 12, 2) * length_ft;
  const purge_volume_ft3 = pipe_volume_ft3 * air_changes;
  const purge_min = purge_volume_ft3 / flow_scfh * 60;
  if (![pipe_volume_ft3, purge_volume_ft3, purge_min].every(Number.isFinite)) return { error: "Purge math is not a finite value." };
  return {
    pipe_volume_ft3,
    purge_volume_ft3,
    purge_min,
    note: "A nitrogen purge while brazing keeps scale and oxidation out of the line. The number of volume changes (about five to seven to reach a low oxygen level) and the acceptable oxygen or dew point come from the spec or manufacturer. A flow or oxygen meter confirms the endpoint; this estimates the time. Distinct from the room confined-space-purge.",
  };
}

export const pipePurgeVolumeExample = { inputs: { pipe_id_in: 2.067, length_ft: 100, air_changes: 5, flow_scfh: 60 } };

function _v894renderPipePurgeVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: purge identity by name. pipe volume = pi/4 x ID^2 x length; purge volume = pipe volume x air changes; time = purge volume / flow. A nitrogen purge while brazing keeps scale and oxidation out of the line.";
  const id = makeNumber("Pipe inside diameter (in)", "ppv-id", { step: "any", min: "0" });
  const ln = makeNumber("Run length (ft)", "ppv-ln", { step: "any", min: "0" });
  const ac = makeNumber("Volume changes to sweep", "ppv-ac", { step: "any", min: "0" });
  const fl = makeNumber("Purge gas flow (scfh)", "ppv-fl", { step: "any", min: "0" });
  for (const f of [id, ln, ac, fl]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { id.input.value = "2.067"; ln.input.value = "100"; ac.input.value = "5"; fl.input.value = "60"; update(); });
  const oPipe = makeOutputLine(outputRegion, "Pipe volume", "ppv-out-pipe");
  const oPurge = makeOutputLine(outputRegion, "Purge volume", "ppv-out-purge");
  const oTime = makeOutputLine(outputRegion, "Purge time", "ppv-out-time");
  const update = debounce(() => {
    const r = computePipePurgeVolume({
      pipe_id_in: id.input.value === "" ? 2.067 : Number(id.input.value), length_ft: ln.input.value === "" ? 100 : Number(ln.input.value),
      air_changes: ac.input.value === "" ? 5 : Number(ac.input.value), flow_scfh: fl.input.value === "" ? 60 : Number(fl.input.value),
    });
    if (r.error) { oPipe.textContent = r.error; oPurge.textContent = "-"; oTime.textContent = "-"; return; }
    oPipe.textContent = fmt(r.pipe_volume_ft3, 2) + " ft^3";
    oPurge.textContent = fmt(r.purge_volume_ft3, 2) + " ft^3";
    oTime.textContent = fmt(r.purge_min, 1) + " min";
  }, DEBOUNCE_MS);
  for (const f of [id, ln, ac, fl]) f.input.addEventListener("input", update);
}
PLUMBINGTAKEOFF_RENDERERS["pipe-purge-volume"] = _v894renderPipePurgeVolume;

// ===================== spec-v903: hydronic system water and glycol volume =====================
// dims: in { pipe_length_ft: L, gal_per_ft: L^2, terminal_gal: L^3, boiler_tank_gal: L^3, glycol_fraction: dimensionless } out: { pipe_gal: L^3, system_gal: L^3, glycol_gal: L^3, water_gal: L^3 }
export function computeHydronicSystemVolume({ pipe_length_ft = 500, gal_per_ft = 0.023, terminal_gal = 0, boiler_tank_gal = 0, glycol_fraction = 0.30 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(pipe_length_ft > 0)) return { error: "Pipe length must be positive (ft)." };
  if (!(gal_per_ft > 0)) return { error: "Gallons per foot must be positive." };
  if (terminal_gal < 0) return { error: "Terminal volume cannot be negative (gal)." };
  if (boiler_tank_gal < 0) return { error: "Boiler / tank volume cannot be negative (gal)." };
  if (glycol_fraction < 0 || glycol_fraction > 1) return { error: "Glycol fraction must be 0 to 1." };
  const pipe_gal = pipe_length_ft * gal_per_ft;
  const system_gal = pipe_gal + terminal_gal + boiler_tank_gal;
  const glycol_gal = system_gal * glycol_fraction;
  const water_gal = system_gal - glycol_gal;
  if (![pipe_gal, system_gal, glycol_gal, water_gal].every(Number.isFinite)) return { error: "System-volume math is not a finite value." };
  return {
    pipe_gal,
    system_gal,
    glycol_gal,
    water_gal,
    note: "The gallons per foot comes from the pipe size (3/4 in is about 0.023 gal/ft). The terminal and boiler or buffer volumes come from the equipment. The glycol fraction comes from the freeze-protection target (glycol-mix gives the ratio). This fill volume sizes the expansion tank (expansion-tank) and the glycol order. Distinct from the loop-length radiant-loop-sizing.",
  };
}

export const hydronicSystemVolumeExample = { inputs: { pipe_length_ft: 500, gal_per_ft: 0.023, terminal_gal: 8, boiler_tank_gal: 5, glycol_fraction: 0.30 } };

function _v903renderHydronicSystemVolume(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: volume identity by name. system = pipe length x gallons per foot + terminals + boiler; glycol = system x fraction; water = system - glycol. The gallons per foot comes from the pipe size (3/4 in ~0.023 gal/ft).";
  const pl = makeNumber("Total pipe length (ft)", "hsv-pl", { step: "any", min: "0" });
  const gf = makeNumber("Gallons per foot (gal/ft)", "hsv-gf", { step: "any", min: "0" });
  const tg = makeNumber("Terminal / emitter volume (gal)", "hsv-tg", { step: "any", min: "0" });
  const bg = makeNumber("Boiler + buffer tank volume (gal)", "hsv-bg", { step: "any", min: "0" });
  const gc = makeNumber("Glycol fraction (0-1)", "hsv-gc", { step: "any", min: "0" });
  for (const f of [pl, gf, tg, bg, gc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { pl.input.value = "500"; gf.input.value = "0.023"; tg.input.value = "8"; bg.input.value = "5"; gc.input.value = "0.30"; update(); });
  const oSystem = makeOutputLine(outputRegion, "System volume", "hsv-out-system");
  const oGlycol = makeOutputLine(outputRegion, "Glycol charge", "hsv-out-glycol");
  const oWater = makeOutputLine(outputRegion, "Water", "hsv-out-water");
  const update = debounce(() => {
    const r = computeHydronicSystemVolume({
      pipe_length_ft: pl.input.value === "" ? 500 : Number(pl.input.value), gal_per_ft: gf.input.value === "" ? 0.023 : Number(gf.input.value),
      terminal_gal: tg.input.value === "" ? 0 : Number(tg.input.value), boiler_tank_gal: bg.input.value === "" ? 0 : Number(bg.input.value),
      glycol_fraction: gc.input.value === "" ? 0.30 : Number(gc.input.value),
    });
    if (r.error) { oSystem.textContent = r.error; oGlycol.textContent = "-"; oWater.textContent = "-"; return; }
    oSystem.textContent = fmt(r.system_gal, 1) + " gal (" + fmt(r.pipe_gal, 1) + " gal in the pipe)";
    oGlycol.textContent = fmt(r.glycol_gal, 1) + " gal";
    oWater.textContent = fmt(r.water_gal, 1) + " gal";
  }, DEBOUNCE_MS);
  for (const f of [pl, gf, tg, bg, gc]) f.input.addEventListener("input", update);
}
PLUMBINGTAKEOFF_RENDERERS["hydronic-system-volume"] = _v903renderHydronicSystemVolume;

// ===================== spec-v906: PEX home-run manifold port and tubing takeoff =====================
// dims: in { fixtures: dimensionless, hot_fixtures: dimensionless, avg_run_ft: L, waste_pct: dimensionless } out: { cold_ports: dimensionless, hot_ports: dimensionless, total_ports: dimensionless, tubing_lf: L }
export function computePexHomerunTakeoff({ fixtures = 8, hot_fixtures = 6, avg_run_ft = 35, waste_pct = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(fixtures > 0)) return { error: "Fixture count must be positive." };
  if (!(avg_run_ft > 0)) return { error: "Average run must be positive (ft)." };
  if (hot_fixtures < 0) return { error: "Hot-fixture count cannot be negative." };
  if (waste_pct < 0) return { error: "Waste cannot be negative (percent)." };
  if (hot_fixtures > fixtures) return { error: "Hot fixtures cannot exceed total fixtures." };
  const cold_ports = fixtures;
  const hot_ports = hot_fixtures;
  const total_ports = cold_ports + hot_ports;
  // (100 + waste)/100 rather than (1 + waste/100): the latter's 1.1 is not exactly
  // representable, so 770 * 1.1 = 847.0000000000001 and ceils to 848 not 847.
  const tubing_lf = Math.ceil(total_ports * avg_run_ft * (100 + waste_pct) / 100);
  if (![cold_ports, hot_ports, total_ports, tubing_lf].every(Number.isFinite)) return { error: "Home-run math is not a finite value." };
  return {
    cold_ports,
    hot_ports,
    total_ports,
    tubing_lf,
    note: "Home-run (manifold) plumbing runs one line per fixture from a central manifold. The manifold is sized to the total ports plus spares. The tubing footage uses the average home-run length. A port count and footage distinct from the flow-sizing pipe-sizing.",
  };
}

export const pexHomerunTakeoffExample = { inputs: { fixtures: 8, hot_fixtures: 6, avg_run_ft: 35, waste_pct: 10 } };

function _v906renderPexHomerunTakeoff(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: takeoff identity by name. cold ports = fixtures; hot ports = hot fixtures; tubing = (cold + hot) x average run x (1 + waste). Home-run plumbing runs one line per fixture from a central manifold.";
  const fx = makeNumber("Total fixtures", "phr-fx", { step: "1", min: "0" });
  const hf = makeNumber("Fixtures needing hot", "phr-hf", { step: "1", min: "0" });
  const ar = makeNumber("Average home-run length (ft)", "phr-ar", { step: "any", min: "0" });
  const ws = makeNumber("Waste allowance (%)", "phr-ws", { step: "any", min: "0" });
  for (const f of [fx, hf, ar, ws]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { fx.input.value = "8"; hf.input.value = "6"; ar.input.value = "35"; ws.input.value = "10"; update(); });
  const oPorts = makeOutputLine(outputRegion, "Manifold ports", "phr-out-ports");
  const oTubing = makeOutputLine(outputRegion, "PEX tubing", "phr-out-tubing");
  const update = debounce(() => {
    const r = computePexHomerunTakeoff({
      fixtures: fx.input.value === "" ? 8 : Number(fx.input.value), hot_fixtures: hf.input.value === "" ? 6 : Number(hf.input.value),
      avg_run_ft: ar.input.value === "" ? 35 : Number(ar.input.value), waste_pct: ws.input.value === "" ? 10 : Number(ws.input.value),
    });
    if (r.error) { oPorts.textContent = r.error; oTubing.textContent = "-"; return; }
    oPorts.textContent = fmt(r.total_ports, 0) + " ports (" + fmt(r.cold_ports, 0) + " cold, " + fmt(r.hot_ports, 0) + " hot)";
    oTubing.textContent = fmt(r.tubing_lf, 0) + " LF";
  }, DEBOUNCE_MS);
  for (const f of [fx, hf, ar, ws]) f.input.addEventListener("input", update);
}
PLUMBINGTAKEOFF_RENDERERS["pex-homerun-takeoff"] = _v906renderPexHomerunTakeoff;

// ===================== spec-v987: solar thermal flat-plate collector output =====================
// dims: in { args: dimensionless } out: { efficiency: dimensionless, useful_btu_per_sqft: dimensionless, useful_btu_hr: dimensionless }
export function computeSolarThermalCollector({ optical_efficiency = 0.70, loss_coeff = 0.85, inlet_temp_f = 120, ambient_temp_f = 70, irradiance_btu = 300, area_sqft = 40 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(optical_efficiency > 0 && optical_efficiency <= 1)) return { error: "Optical efficiency (y-intercept) must be between 0 and 1." };
  if (!(loss_coeff >= 0)) return { error: "Loss coefficient must be non-negative (Btu/hr-ft^2-F)." };
  if (!(irradiance_btu > 0)) return { error: "Solar irradiance must be positive (Btu/hr-ft^2)." };
  if (!(area_sqft > 0)) return { error: "Collector area must be positive (sq ft)." };
  // ASHRAE 93 / Hottel-Whillier-Bliss: eta = FR(ta) - FR*UL*(Ti - Ta)/G, useful heat = G*eta*area (clamped at 0).
  const efficiency = optical_efficiency - loss_coeff * (inlet_temp_f - ambient_temp_f) / irradiance_btu;
  const eff_clamped = Math.max(0, efficiency);
  const useful_btu_per_sqft = irradiance_btu * eff_clamped;
  const useful_btu_hr = useful_btu_per_sqft * area_sqft;
  if (![efficiency, useful_btu_per_sqft, useful_btu_hr].every(Number.isFinite)) return { error: "Collector math is not a finite value." };
  const verdict = efficiency > 0
    ? "The collector delivers useful heat at this operating point."
    : "AT OR BELOW STAGNATION: the collector loses as much as it captures -- no useful heat until the irradiance rises or the inlet temperature drops.";
  return {
    efficiency,
    useful_btu_per_sqft,
    useful_btu_hr,
    verdict,
    note: "The useful heat a flat-plate solar thermal collector delivers at a given operating point, by the ASHRAE 93 / Hottel-Whillier-Bliss efficiency line the SRCC prints on every collector rating: efficiency = optical efficiency (the y-intercept, FR times tau-alpha) minus the loss coefficient (FR times UL, the slope) times (inlet temp minus ambient) divided by the solar irradiance. The optical efficiency (~0.68-0.75 for a good glazed flat plate) is the ceiling when the fluid runs at ambient; the loss term eats into it as the collector runs hotter than the air. With an optical efficiency of 0.70, a loss coefficient of 0.85 Btu/hr-ft^2-F, a 120 F inlet, 70 F ambient, and 300 Btu/hr-ft^2 of sun, efficiency = 0.70 - 0.85 x 50/300 = 0.56, so the collector makes 300 x 0.56 = 168 Btu/hr per sq ft, or 6,700 Btu/hr over 40 sq ft. On a colder, dimmer day (140 F inlet, 40 F ambient, 250 Btu/hr-ft^2) efficiency falls to 0.36 and output to 3,600 Btu/hr -- the collector is least efficient exactly when the heat is needed most. Past the stagnation point (efficiency <= 0) it delivers nothing. An unglazed pool collector has a near-1.0 optical efficiency but a very high loss slope, which is why it works only near ambient. A performance estimate; the actual SRCC-rated intercept and slope, the incidence angle, the flow rate, and the glazing condition govern the real output.",
  };
}

export const solarThermalCollectorExample = { inputs: { optical_efficiency: 0.70, loss_coeff: 0.85, inlet_temp_f: 120, ambient_temp_f: 70, irradiance_btu: 300, area_sqft: 40 } };

function _v987renderSolarThermalCollector(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: solar thermal flat-plate collector output (ASHRAE 93 / Hottel-Whillier-Bliss efficiency line), by name. eta = optical efficiency - loss coeff x (inlet - ambient)/irradiance; useful heat = irradiance x eta x area. The SRCC-rated intercept and slope, the incidence angle, flow rate, and glazing govern.";
  const oe = makeNumber("Optical efficiency (y-intercept, ~0.70)", "stc-oe", { step: "any", min: "0", max: "1" });
  const lc = makeNumber("Loss coefficient (Btu/hr-ft²-F, slope)", "stc-lc", { step: "any", min: "0" });
  const it = makeNumber("Fluid inlet temp (°F)", "stc-it", { step: "any" });
  const at = makeNumber("Ambient air temp (°F)", "stc-at", { step: "any" });
  const ir = makeNumber("Solar irradiance (Btu/hr-ft²)", "stc-ir", { step: "any", min: "0" });
  const ar = makeNumber("Collector area (sq ft)", "stc-ar", { step: "any", min: "0" });
  for (const f of [oe, lc, it, at, ir, ar]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { oe.input.value = "0.70"; lc.input.value = "0.85"; it.input.value = "120"; at.input.value = "70"; ir.input.value = "300"; ar.input.value = "40"; update(); });
  const oE = makeOutputLine(outputRegion, "Collector efficiency", "stc-out-e");
  const oQ = makeOutputLine(outputRegion, "Useful heat output", "stc-out-q");
  const update = debounce(() => {
    const r = computeSolarThermalCollector({
      optical_efficiency: oe.input.value === "" ? 0.70 : Number(oe.input.value), loss_coeff: lc.input.value === "" ? 0.85 : Number(lc.input.value),
      inlet_temp_f: it.input.value === "" ? 120 : Number(it.input.value), ambient_temp_f: at.input.value === "" ? 70 : Number(at.input.value),
      irradiance_btu: ir.input.value === "" ? 300 : Number(ir.input.value), area_sqft: ar.input.value === "" ? 40 : Number(ar.input.value),
    });
    if (r.error) { oE.textContent = r.error; oQ.textContent = "-"; return; }
    oE.textContent = fmt(r.efficiency * 100, 1) + "%";
    oQ.textContent = fmt(r.useful_btu_hr, 0) + " Btu/hr (" + fmt(r.useful_btu_per_sqft, 1) + " per sq ft)";
  }, DEBOUNCE_MS);
  for (const f of [oe, lc, it, at, ir, ar]) f.input.addEventListener("input", update);
}
PLUMBINGTAKEOFF_RENDERERS["solar-thermal-collector"] = _v987renderSolarThermalCollector;
