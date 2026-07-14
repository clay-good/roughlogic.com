// Group C: building-systems HVAC engineering bench (spec-v16 first-principles batch).
//
// spec-v81 cap-relief split: the cohesive spec-v16 "Group C expansion" batch --
// seven first-principles HVAC engineering tiles (chiller-tons, hx-lmtd-ntu,
// air-changes-hour, boiler-pipe-sizing, compressor-short-cycle,
// humidifier-capacity, filter-pressure-drop) -- was extracted verbatim from
// calc-hvac.js (which sat at 94.9% of its size cap, the tightest remaining
// calculator module) into this module. The seven share a theme distinct from
// the residential split-system core that stays in calc-hvac.js (Manual J loads,
// duct sizing, refrigerant charging and superheat/subcool service): they are
// engineered building-systems calcs -- central-plant chiller tonnage and
// heat-exchanger LMTD/effectiveness-NTU, hydronic boiler-distribution pipe
// sizing, compressor short-cycle protection, humidifier capacity, filter
// pressure-drop / fan-energy penalty, and air changes per hour. Each KEEPS
// group "C" -- a tile's group letter is independent of the module that holds it
// (the v28/v30/v36/v39/v42/v70..v80 precedent). Their ids, citations, worked
// examples, dimensional annotations, and behavior are byte-for-byte unchanged.
// The seven compute functions use the per-module _finiteGuard, copied verbatim
// below (non-exported, so it adds no v14 derivation-corpus row), exactly as the
// v72/v73/v76/v77/v78/v80 benches did. The block carries its own module-local
// helpers (_v16h_readNum, _v16h_HX_FLUIDS, _v16h_pipeVelocityFps,
// _v16h_humidityRatioFromRH), which travel with it unchanged. Lazy-loaded on
// first open of one of its tiles, so it is not in the home-view first-paint
// payload.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";
import { hazenWilliamsFrictionLoss } from "./pure-math.js";

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

// spec-v9 psychrometric helpers shared by the humidifier-capacity tile. Copied
// verbatim from calc-hvac.js (which still uses them for its v9 outdoor-air /
// wet-bulb tiles), so the split leaves no cross-module import. Non-exported, so
// they add no v14 derivation-corpus row.
function _v9_satPressure_kPa(T_C) {
  // Magnus form: e_s = 0.61094 * exp(17.625 * T / (T + 243.04)).
  return 0.61094 * Math.exp((17.625 * T_C) / (T_C + 243.04));
}
function _v9_pressureAtAltitude_kPa(z_ft) {
  const z_m = z_ft * 0.3048;
  return 101.325 * Math.pow(1 - 2.25577e-5 * z_m, 5.2559);
}

export const HVACSYSTEMS_RENDERERS = {};

// =====================================================================
// spec-v16 Group C expansion (HVAC). The first-principles batch lands
// here per spec-v16 §3 / §Z.2: C.3 chiller tonnage from delta-T and GPM,
// C.5 heat-exchanger LMTD and effectiveness-NTU, and C.9 air changes per
// hour. C.4 (cooling-tower range/approach) is substantially covered by
// the existing `cooling-tower` tile and C.1 (duct fitting equivalent
// length) by the existing `equivalent-length` tile -- see the spec-v16
// status header for the audit findings. Render functions are module-
// local; only the pure compute functions enter the v14 corpus.
// =====================================================================

const _v16h_readNum = (input) => {
  if (!input || input.value === "") return null;
  const n = Number(input.value);
  return Number.isFinite(n) ? n : null;
};

// --- C.3 Chiller tonnage from delta-T and GPM ------------------------

// Fluid energy-balance factor: Q (BTU/hr) = gpm * factor * delta_T,
// where factor = 60 min/hr * density (lb/gal) * specific heat
// (BTU/lb-F). Water is the textbook 500. Propylene-glycol factors are
// property-derived at a typical 40-50 F chilled-water mean per ASHRAE
// Fundamentals 2021 Chapter 31 (secondary coolants); the manufacturer's
// fluid table governs final selection.
export const CHILLER_FLUID_FACTORS = {
  water: 500,
  glycol_30: 475, // 30% propylene glycol: ~8.6 lb/gal * 0.92 cp * 60
  glycol_50: 449, // 50% propylene glycol: ~8.8 lb/gal * 0.85 cp * 60
};

// dims: in { args: dimensionless } out: { delta_T_F: T, q_btu_hr: dimensionless, tons: dimensionless, required_gpm: L^3 T^-1 }
export function computeChillerTons({
  gpm = 0,
  ewt_F = 54,
  lwt_F = 44,
  fluid = "water",
  nameplate_tons = null,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const flow = Number(gpm) || 0;
  const Te = Number(ewt_F);
  const Tl = Number(lwt_F);
  const factor = CHILLER_FLUID_FACTORS[fluid] ?? CHILLER_FLUID_FACTORS.water;
  if (!(flow > 0)) return { error: "Enter a positive chilled-water flow (GPM)." };
  if (!Number.isFinite(Te) || !Number.isFinite(Tl)) return { error: "Enter entering and leaving water temperatures." };
  const delta_T_F = Te - Tl;
  if (!(delta_T_F > 0)) return { error: "Entering water temperature must exceed leaving water temperature." };

  const q_btu_hr = flow * factor * delta_T_F;
  const tons = q_btu_hr / 12000;
  const kw = q_btu_hr / 3412;

  // Required flow to carry the chiller's nameplate tons at this delta-T.
  const np = nameplate_tons != null && Number.isFinite(Number(nameplate_tons)) ? Number(nameplate_tons) : null;
  const required_gpm = np != null && np > 0 ? (np * 12000) / (factor * delta_T_F) : null;

  const warnings = [];
  if (delta_T_F < 5 || delta_T_F > 20) warnings.push("Delta-T outside the typical 10-14 F chiller range; confirm the entering and leaving temperatures.");
  if (fluid !== "water") warnings.push("Glycol factor is property-derived at a typical chilled-water mean; the manufacturer's fluid correction table governs.");

  return {
    delta_T_F,
    factor,
    q_btu_hr,
    tons,
    kw,
    fluid,
    nameplate_tons: np,
    required_gpm,
    warnings,
  };
}

export const chillerTonsExample = {
  // 240 GPM water, 54 F EWT -> 44 F LWT (10 F delta-T):
  // Q = 240 * 500 * 10 = 1,200,000 BTU/hr = 100 tons exactly.
  inputs: { gpm: 240, ewt_F: 54, lwt_F: 44, fluid: "water" },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16h_renderChillerTons(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Q (BTU/hr) = GPM x factor x delta-T; tons = Q / 12000. The water factor 500 = 60 min/hr x 8.33 lb/gal x 1 BTU/lb-F (first-principles fluid energy balance). Glycol factors per ASHRAE Fundamentals 2021 Ch. 31 (secondary coolants). Free at ashrae.org for the TOC.";
  const gpm = makeNumber("Chilled-water flow (GPM)", "ct3-gpm", { step: "any", min: "0", value: "240" });
  const ewt = makeNumber("Entering water temp (F)", "ct3-ewt", { step: "any", value: "54" });
  const lwt = makeNumber("Leaving water temp (F)", "ct3-lwt", { step: "any", value: "44" });
  const fluid = makeSelect("Fluid", "ct3-fluid", [
    { value: "water", label: "Water (500)", selected: true },
    { value: "glycol_30", label: "30% propylene glycol" },
    { value: "glycol_50", label: "50% propylene glycol" },
  ]);
  const np = makeNumber("Nameplate tons (optional)", "ct3-np", { step: "any", min: "0" });
  for (const f of [gpm, ewt, lwt, fluid, np]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    gpm.input.value = "240"; ewt.input.value = "54"; lwt.input.value = "44";
    fluid.select.value = "water"; np.input.value = ""; update();
  });

  const oDt = makeOutputLine(outputRegion, "Delta-T", "ct3-out-dt");
  const oTons = makeOutputLine(outputRegion, "Cooling capacity", "ct3-out-tons");
  const oReq = makeOutputLine(outputRegion, "Required flow at nameplate", "ct3-out-req");
  const oNote = makeOutputLine(outputRegion, "Notes", "ct3-out-note");

  const update = debounce(() => {
    const r = computeChillerTons({
      gpm: _v16h_readNum(gpm.input),
      ewt_F: _v16h_readNum(ewt.input),
      lwt_F: _v16h_readNum(lwt.input),
      fluid: fluid.select.value,
      nameplate_tons: _v16h_readNum(np.input),
    });
    if (r.error) { oDt.textContent = r.error; oTons.textContent = "-"; oReq.textContent = "-"; oNote.textContent = ""; return; }
    oDt.textContent = fmt(r.delta_T_F, 1) + " F (factor " + r.factor + ")";
    oTons.textContent = fmt(r.tons, 1) + " tons (" + fmt(r.q_btu_hr, 0) + " BTU/hr, " + fmt(r.kw, 1) + " kW)";
    oReq.textContent = r.required_gpm != null ? fmt(r.required_gpm, 1) + " GPM for " + fmt(r.nameplate_tons, 1) + " tons" : "-";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Within the typical chiller delta-T range.";
  }, DEBOUNCE_MS);
  for (const el of [gpm.input, ewt.input, lwt.input, np.input]) el.addEventListener("input", update);
  fluid.select.addEventListener("change", update);
}
HVACSYSTEMS_RENDERERS["chiller-tons"] = _v16h_renderChillerTons;

// --- C.5 Heat exchanger LMTD and effectiveness-NTU -------------------

// Capacity-rate factor per fluid (BTU/hr-F per GPM) = same fluid energy
// balance as the chiller tile. C = GPM * factor.
export const HX_FLUID_FACTORS = CHILLER_FLUID_FACTORS;

// dims: in { args: dimensionless } out: { lmtd_F: T, q_btu_hr: dimensionless, ua_btu_hr_F: dimensionless, effectiveness: dimensionless, ntu: dimensionless }
export function computeHxLmtdNtu({
  config = "counterflow",
  th_in_F = 0,
  th_out_F = 0,
  tc_in_F = 0,
  tc_out_F = 0,
  hot_gpm = 0,
  cold_gpm = 0,
  hot_fluid = "water",
  cold_fluid = "water",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Thi = Number(th_in_F), Tho = Number(th_out_F);
  const Tci = Number(tc_in_F), Tco = Number(tc_out_F);
  const gh = Number(hot_gpm) || 0, gc = Number(cold_gpm) || 0;
  if ([Thi, Tho, Tci, Tco].some((v) => !Number.isFinite(v))) return { error: "Enter all four inlet/outlet temperatures." };
  if (!(Thi > Tho)) return { error: "Hot fluid must cool down (hot inlet above hot outlet)." };
  if (!(Tco > Tci)) return { error: "Cold fluid must warm up (cold outlet above cold inlet)." };
  if (Tco > Thi) return { error: "Cold outlet cannot exceed hot inlet (thermodynamic limit)." };

  let dT1, dT2;
  if (config === "parallel") {
    dT1 = Thi - Tci;
    dT2 = Tho - Tco;
    if (!(dT2 > 0)) return { error: "Parallel-flow outlets cross (hot outlet below cold outlet is impossible)." };
  } else {
    // counter-flow (and a reasonable approximation entry for cross-flow)
    dT1 = Thi - Tco;
    dT2 = Tho - Tci;
    if (!(dT1 > 0) || !(dT2 > 0)) return { error: "Temperature difference at an end is non-positive; check the temperatures." };
  }
  // LMTD; the limit as dT1 -> dT2 is the common difference.
  const lmtd_F = Math.abs(dT1 - dT2) < 1e-9 ? dT1 : (dT1 - dT2) / Math.log(dT1 / dT2);

  const fh = HX_FLUID_FACTORS[hot_fluid] ?? 500;
  const fc = HX_FLUID_FACTORS[cold_fluid] ?? 500;
  const Ch = gh > 0 ? gh * fh : null; // BTU/hr-F
  const Cc = gc > 0 ? gc * fc : null;

  // Heat duty from the hot side if its flow is known, else the cold side.
  let q_btu_hr = null;
  if (Ch != null) q_btu_hr = Ch * (Thi - Tho);
  else if (Cc != null) q_btu_hr = Cc * (Tco - Tci);

  const ua_btu_hr_F = q_btu_hr != null && lmtd_F > 0 ? q_btu_hr / lmtd_F : null;

  let effectiveness = null, ntu = null, cr = null, c_min = null;
  if (Ch != null && Cc != null) {
    c_min = Math.min(Ch, Cc);
    const c_max = Math.max(Ch, Cc);
    cr = c_min / c_max;
    const q_max = c_min * (Thi - Tci);
    effectiveness = q_max > 0 ? q_btu_hr / q_max : null;
    ntu = ua_btu_hr_F != null ? ua_btu_hr_F / c_min : null;
  }

  const warnings = [];
  if (config === "parallel" && effectiveness != null && effectiveness > 0.75) warnings.push("Parallel-flow effectiveness above ~0.75 is unusual; a counter-flow arrangement reaches higher effectiveness for the same area.");
  if (Ch == null && Cc == null) warnings.push("Enter at least one side's flow (GPM) to compute heat duty, UA, effectiveness, and NTU.");

  return {
    config,
    dT1,
    dT2,
    lmtd_F,
    c_hot: Ch,
    c_cold: Cc,
    c_ratio: cr,
    q_btu_hr,
    ua_btu_hr_F,
    effectiveness,
    ntu,
    warnings,
  };
}

export const hxLmtdNtuExample = {
  // Counter-flow water/water: hot 200->100 F at 50 GPM (C_h = 25,000),
  // cold 60->140 F at 62.5 GPM (C_c = 31,250). LMTD = (60-40)/ln(60/40)
  // = 49.33 F; Q = 2,500,000 BTU/hr; UA = 50,683; C_min = 25,000;
  // effectiveness = 2.5e6/3.5e6 = 0.7143; NTU = 2.027.
  inputs: {
    config: "counterflow",
    th_in_F: 200, th_out_F: 100, tc_in_F: 60, tc_out_F: 140,
    hot_gpm: 50, cold_gpm: 62.5,
  },
};

const _v16h_HX_FLUIDS = [
  { value: "water", label: "Water" },
  { value: "glycol_30", label: "30% propylene glycol" },
  { value: "glycol_50", label: "50% propylene glycol" },
];

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16h_renderHxLmtdNtu(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: LMTD = (dT1 - dT2) / ln(dT1/dT2); Q = C x delta-T with C = GPM x fluid factor; UA = Q / LMTD; effectiveness = Q / (C_min x (Th_in - Tc_in)); NTU = UA / C_min. Per the TEMA standards and standard heat-transfer texts (Incropera, Cengel). Free at tema.org for the standards TOC.";
  const config = makeSelect("Flow configuration", "hx-config", [
    { value: "counterflow", label: "Counter-flow", selected: true },
    { value: "parallel", label: "Parallel-flow" },
  ]);
  const thi = makeNumber("Hot inlet (F)", "hx-thi", { step: "any", value: "200" });
  const tho = makeNumber("Hot outlet (F)", "hx-tho", { step: "any", value: "100" });
  const tci = makeNumber("Cold inlet (F)", "hx-tci", { step: "any", value: "60" });
  const tco = makeNumber("Cold outlet (F)", "hx-tco", { step: "any", value: "140" });
  const hg = makeNumber("Hot flow (GPM)", "hx-hg", { step: "any", min: "0", value: "50" });
  const cg = makeNumber("Cold flow (GPM)", "hx-cg", { step: "any", min: "0", value: "62.5" });
  const hf = makeSelect("Hot fluid", "hx-hf", _v16h_HX_FLUIDS.map((o) => ({ ...o })));
  const cf = makeSelect("Cold fluid", "hx-cf", _v16h_HX_FLUIDS.map((o) => ({ ...o })));
  for (const f of [config, thi, tho, tci, tco, hg, cg, hf, cf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    config.select.value = "counterflow";
    thi.input.value = "200"; tho.input.value = "100"; tci.input.value = "60"; tco.input.value = "140";
    hg.input.value = "50"; cg.input.value = "62.5"; hf.select.value = "water"; cf.select.value = "water"; update();
  });

  const oLmtd = makeOutputLine(outputRegion, "LMTD", "hx-out-lmtd");
  const oQ = makeOutputLine(outputRegion, "Heat duty", "hx-out-q");
  const oUa = makeOutputLine(outputRegion, "Required UA", "hx-out-ua");
  const oEff = makeOutputLine(outputRegion, "Effectiveness / NTU", "hx-out-eff");
  const oNote = makeOutputLine(outputRegion, "Notes", "hx-out-note");

  const update = debounce(() => {
    const r = computeHxLmtdNtu({
      config: config.select.value,
      th_in_F: _v16h_readNum(thi.input), th_out_F: _v16h_readNum(tho.input),
      tc_in_F: _v16h_readNum(tci.input), tc_out_F: _v16h_readNum(tco.input),
      hot_gpm: _v16h_readNum(hg.input), cold_gpm: _v16h_readNum(cg.input),
      hot_fluid: hf.select.value, cold_fluid: cf.select.value,
    });
    if (r.error) { oLmtd.textContent = r.error; oQ.textContent = "-"; oUa.textContent = "-"; oEff.textContent = "-"; oNote.textContent = ""; return; }
    oLmtd.textContent = fmt(r.lmtd_F, 2) + " F";
    oQ.textContent = r.q_btu_hr != null ? fmt(r.q_btu_hr, 0) + " BTU/hr" : "enter a flow";
    oUa.textContent = r.ua_btu_hr_F != null ? fmt(r.ua_btu_hr_F, 0) + " BTU/hr-F" : "-";
    oEff.textContent = r.effectiveness != null ? fmt(r.effectiveness, 3) + " / NTU " + fmt(r.ntu, 2) + " (Cr " + fmt(r.c_ratio, 2) + ")" : "enter both flows";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Sized from the four temperatures and the entered flows.";
  }, DEBOUNCE_MS);
  for (const el of [thi.input, tho.input, tci.input, tco.input, hg.input, cg.input]) el.addEventListener("input", update);
  for (const s of [config.select, hf.select, cf.select]) s.addEventListener("change", update);
}
HVACSYSTEMS_RENDERERS["hx-lmtd-ntu"] = _v16h_renderHxLmtdNtu;

// --- C.9 Air changes per hour from CFM and room volume ---------------

// Typical ACH design targets by occupancy (ASHRAE 62.1-2022 ventilation
// and ASHRAE 170-2021 healthcare). These are comparison bands, not the
// code minimum for a specific project; the AHJ and the governing
// standard's full procedure govern.
export const ACH_TARGET_BANDS = {
  residential: { lo: 0.35, hi: 1, label: "Residential whole-house ventilation (ASHRAE 62.2)" },
  office: { lo: 4, hi: 10, label: "Office / commercial" },
  classroom: { lo: 4, hi: 6, label: "Classroom (ASHRAE 62.1)" },
  lab: { lo: 6, hi: 12, label: "Laboratory" },
  patient_room: { lo: 6, hi: 6, label: "Hospital patient room (ASHRAE 170)" },
  operating_room: { lo: 20, hi: 25, label: "Operating room (ASHRAE 170)" },
};

// dims: in { args: dimensionless } out: { ach: T^-1, net_ach: T^-1, pressurization_cfm: L^3 T^-1 }
export function computeAirChangesPerHour({
  volume_ft3 = 0,
  supply_cfm = 0,
  return_cfm = null,
  occupancy = "classroom",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const vol = Number(volume_ft3) || 0;
  const supply = Number(supply_cfm) || 0;
  const ret = return_cfm != null && Number.isFinite(Number(return_cfm)) ? Number(return_cfm) : supply;
  if (!(vol > 0)) return { error: "Enter a positive room volume (ft^3)." };
  if (!(supply > 0)) return { error: "Enter a positive supply CFM." };

  const ach = (supply * 60) / vol;
  // Net delivered air change is governed by the smaller of supply and
  // return; the difference is the pressurization (exfiltration) airflow.
  const net_cfm = Math.min(supply, ret);
  const net_ach = (net_cfm * 60) / vol;
  const pressurization_cfm = supply - ret;

  const band = ACH_TARGET_BANDS[occupancy] ?? ACH_TARGET_BANDS.classroom;
  let comparison;
  if (ach < band.lo) comparison = "below the " + band.lo + "-" + band.hi + " ACH target (" + band.label + ")";
  else if (ach > band.hi) comparison = "above the " + band.lo + "-" + band.hi + " ACH target (" + band.label + ")";
  else comparison = "within the " + band.lo + "-" + band.hi + " ACH target (" + band.label + ")";

  let pressure_state;
  if (pressurization_cfm > 1e-9) pressure_state = "positively pressurized (" + fmt(pressurization_cfm, 0) + " CFM exfiltration)";
  else if (pressurization_cfm < -1e-9) pressure_state = "negatively pressurized (" + fmt(-pressurization_cfm, 0) + " CFM infiltration)";
  else pressure_state = "balanced (supply = return)";

  const warnings = [];
  if (vol < 100) warnings.push("Room volume below 100 ft^3 is outside the typical range; confirm the dimensions.");
  if (ach > 50) warnings.push("ACH above 50 is outside the typical HVAC range; confirm the CFM and volume.");

  return {
    volume_ft3: vol,
    supply_cfm: supply,
    return_cfm: ret,
    ach,
    net_ach,
    pressurization_cfm,
    pressure_state,
    band: band.label,
    comparison,
    warnings,
  };
}

export const airChangesPerHourExample = {
  // 10,000 ft^3 classroom, 1,000 CFM supply, balanced return:
  // ACH = 1000 * 60 / 10000 = 6.0, within the 4-6 classroom target.
  inputs: { volume_ft3: 10000, supply_cfm: 1000, occupancy: "classroom" },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16h_renderAirChangesPerHour(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ACH = supply CFM x 60 / room volume (ft^3). Net delivered ACH uses the smaller of supply and return; their difference is the pressurization airflow. Target bands per ASHRAE 62.1-2022 (ventilation) and ASHRAE 170-2021 (healthcare). AHJ and the governing standard's full procedure govern. Free at ashrae.org for the TOCs.";
  const vol = makeNumber("Room volume (ft^3)", "ach-vol", { step: "any", min: "0", value: "10000" });
  const supply = makeNumber("Supply CFM", "ach-supply", { step: "any", min: "0", value: "1000" });
  const ret = makeNumber("Return CFM (blank = supply)", "ach-return", { step: "any", min: "0" });
  const occ = makeSelect("Occupancy (comparison band)", "ach-occ", [
    { value: "residential", label: "Residential (0.35-1)" },
    { value: "office", label: "Office (4-10)" },
    { value: "classroom", label: "Classroom (4-6)", selected: true },
    { value: "lab", label: "Laboratory (6-12)" },
    { value: "patient_room", label: "Patient room (6)" },
    { value: "operating_room", label: "Operating room (20-25)" },
  ]);
  for (const f of [vol, supply, ret, occ]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    vol.input.value = "10000"; supply.input.value = "1000"; ret.input.value = "";
    occ.select.value = "classroom"; update();
  });

  const oAch = makeOutputLine(outputRegion, "Air changes per hour", "ach-out-ach");
  const oNet = makeOutputLine(outputRegion, "Net / pressurization", "ach-out-net");
  const oBand = makeOutputLine(outputRegion, "Comparison", "ach-out-band");
  const oNote = makeOutputLine(outputRegion, "Notes", "ach-out-note");

  const update = debounce(() => {
    const r = computeAirChangesPerHour({
      volume_ft3: _v16h_readNum(vol.input),
      supply_cfm: _v16h_readNum(supply.input),
      return_cfm: _v16h_readNum(ret.input),
      occupancy: occ.select.value,
    });
    if (r.error) { oAch.textContent = r.error; oNet.textContent = "-"; oBand.textContent = "-"; oNote.textContent = ""; return; }
    oAch.textContent = fmt(r.ach, 2) + " ACH";
    oNet.textContent = fmt(r.net_ach, 2) + " net ACH; " + r.pressure_state;
    oBand.textContent = r.comparison;
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "ACH compared against the selected occupancy target.";
  }, DEBOUNCE_MS);
  for (const el of [vol.input, supply.input, ret.input]) el.addEventListener("input", update);
  occ.select.addEventListener("change", update);
}
HVACSYSTEMS_RENDERERS["air-changes-hour"] = _v16h_renderAirChangesPerHour;

// --- C.6 Hot water boiler distribution pipe sizing -------------------

// Standard inner diameters (in) by material and nominal trade size.
// Copper Type L (ASTM B88) and Steel Schedule 40 (ASTM A53) are
// published dimensional standards; PEX is ASTM F876 SDR-9 nominal. The
// Hazen-Williams roughness coefficient C is the water-flow value for
// each material (copper/PEX smooth ~150; black steel ~130).
export const BOILER_PIPE_TABLE = {
  copper: {
    label: "Copper Type L",
    c: 150,
    sizes: [
      { size: "1/2", id_in: 0.545 }, { size: "3/4", id_in: 0.785 },
      { size: "1", id_in: 1.025 }, { size: "1-1/4", id_in: 1.265 },
      { size: "1-1/2", id_in: 1.505 }, { size: "2", id_in: 1.985 },
      { size: "2-1/2", id_in: 2.465 }, { size: "3", id_in: 2.945 },
    ],
  },
  steel: {
    label: "Steel Schedule 40",
    c: 130,
    sizes: [
      { size: "1/2", id_in: 0.622 }, { size: "3/4", id_in: 0.824 },
      { size: "1", id_in: 1.049 }, { size: "1-1/4", id_in: 1.380 },
      { size: "1-1/2", id_in: 1.610 }, { size: "2", id_in: 2.067 },
      { size: "2-1/2", id_in: 2.469 }, { size: "3", id_in: 3.068 },
    ],
  },
  pex: {
    label: "PEX (SDR-9)",
    c: 150,
    sizes: [
      { size: "1/2", id_in: 0.475 }, { size: "3/4", id_in: 0.671 },
      { size: "1", id_in: 0.863 }, { size: "1-1/4", id_in: 1.053 },
      { size: "1-1/2", id_in: 1.243 }, { size: "2", id_in: 1.629 },
    ],
  },
};

// Default quiet-operation velocity ceiling (ft/sec) by material.
export const BOILER_PIPE_VMAX = { copper: 4, steel: 6, pex: 3 };

// Velocity (ft/sec) of `gpm` through a pipe of inner diameter `id_in`.
// v = gpm / (2.44778 * d^2): A(ft^2) * 448.831 gal/(ft^3·min) inverted.
function _v16h_pipeVelocityFps(gpm, id_in) {
  return id_in > 0 ? gpm / (2.44778 * id_in * id_in) : Infinity;
}

// dims: in { args: dimensionless } out: { gpm: L^3 T^-1, velocity_fps: L T^-1, friction_ft_per_100ft: dimensionless, head_ft: L }
export function computeBoilerPipeSizing({
  boiler_btu_hr = 0,
  delta_T_F = 20,
  material = "copper",
  max_velocity_fps = null,
  length_ft = 100,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Q = Number(boiler_btu_hr) || 0;
  const dT = Number(delta_T_F) || 0;
  const tbl = BOILER_PIPE_TABLE[material] ?? BOILER_PIPE_TABLE.copper;
  const vmax = max_velocity_fps != null && Number.isFinite(Number(max_velocity_fps)) && Number(max_velocity_fps) > 0
    ? Number(max_velocity_fps)
    : (BOILER_PIPE_VMAX[material] ?? 4);
  const len = Number(length_ft);
  if (!(Q > 0)) return { error: "Enter a positive boiler output (BTU/hr)." };
  if (!(dT > 0)) return { error: "Enter a positive supply-return delta-T (F)." };

  // Hydronic energy balance: GPM = Q / (500 * delta-T) for water.
  const gpm = Q / (500 * dT);

  // Smallest table size whose velocity is at or below the ceiling.
  let pick = null;
  for (const s of tbl.sizes) {
    if (_v16h_pipeVelocityFps(gpm, s.id_in) <= vmax) { pick = s; break; }
  }
  const oversize = pick == null;
  if (oversize) pick = tbl.sizes[tbl.sizes.length - 1];

  const velocity_fps = _v16h_pipeVelocityFps(gpm, pick.id_in);
  // Hazen-Williams head loss (ft) per 100 ft at the recommended size.
  const friction_ft_per_100ft = hazenWilliamsFrictionLoss({
    flow_gpm: gpm, internal_diameter_in: pick.id_in, length_ft: 100, C: tbl.c,
  });
  const runLen = Number.isFinite(len) && len > 0 ? len : 0;
  const head_ft = friction_ft_per_100ft * (runLen / 100);

  const warnings = [];
  if (dT < 10 || dT > 40) warnings.push("Delta-T outside the typical 10-40 F hydronic range; high-delta-T commercial systems exist but are non-default.");
  if (oversize) warnings.push("Flow exceeds the largest tabulated size (3 in) at the velocity ceiling; parallel mains or a larger main are required.");

  return {
    gpm,
    material,
    material_label: tbl.label,
    max_velocity_fps: vmax,
    recommended_size: pick.size,
    recommended_id_in: pick.id_in,
    velocity_fps,
    friction_ft_per_100ft,
    length_ft: runLen,
    head_ft,
    oversize,
    warnings,
  };
}

export const boilerPipeSizingExample = {
  // 200,000 BTU/hr boiler, 20 F delta-T -> 20 GPM. Copper Type L at a
  // 4 ft/s quiet-operation ceiling: 1-1/4 in (ID 1.265) runs 5.11 ft/s
  // (over), so the tile steps up to 1-1/2 in (ID 1.505) at 3.61 ft/s.
  // Hazen-Williams (C=150): 1.48 ft head per 100 ft; 100 ft run -> 1.48 ft.
  inputs: { boiler_btu_hr: 200000, delta_T_F: 20, material: "copper", max_velocity_fps: 4, length_ft: 100 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16h_renderBoilerPipeSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: GPM = Q / (500 x delta-T) (hydronic water energy balance); velocity = GPM / (2.448 x d^2); the smallest standard size at or below the velocity ceiling is recommended; head loss per Hazen-Williams (public domain, 1905). Per ASHRAE Systems and Equipment 2020 Ch. 13 (hydronic heating) with Bell & Gossett / Taco velocity limits. Free at ashrae.org for the TOC.";
  const q = makeNumber("Boiler output (BTU/hr)", "bp6-q", { step: "any", min: "0", value: "200000" });
  const dt = makeNumber("Supply-return delta-T (F)", "bp6-dt", { step: "any", min: "0", value: "20" });
  const mat = makeSelect("Pipe material", "bp6-mat", [
    { value: "copper", label: "Copper Type L (4 ft/s)", selected: true },
    { value: "steel", label: "Steel Schedule 40 (6 ft/s)" },
    { value: "pex", label: "PEX SDR-9 (3 ft/s)" },
  ]);
  const vmax = makeNumber("Max velocity (ft/s, blank = material default)", "bp6-vmax", { step: "any", min: "0" });
  const len = makeNumber("Run length one-way (ft)", "bp6-len", { step: "any", min: "0", value: "100" });
  for (const f of [q, dt, mat, vmax, len]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    q.input.value = "200000"; dt.input.value = "20"; mat.select.value = "copper";
    vmax.input.value = "4"; len.input.value = "100"; update();
  });

  const oGpm = makeOutputLine(outputRegion, "Required flow", "bp6-out-gpm");
  const oSize = makeOutputLine(outputRegion, "Recommended size", "bp6-out-size");
  const oVel = makeOutputLine(outputRegion, "Velocity", "bp6-out-vel");
  const oFric = makeOutputLine(outputRegion, "Friction / pump head", "bp6-out-fric");
  const oNote = makeOutputLine(outputRegion, "Notes", "bp6-out-note");

  const update = debounce(() => {
    const r = computeBoilerPipeSizing({
      boiler_btu_hr: _v16h_readNum(q.input),
      delta_T_F: _v16h_readNum(dt.input),
      material: mat.select.value,
      max_velocity_fps: _v16h_readNum(vmax.input),
      length_ft: _v16h_readNum(len.input),
    });
    if (r.error) { oGpm.textContent = r.error; oSize.textContent = "-"; oVel.textContent = "-"; oFric.textContent = "-"; oNote.textContent = ""; return; }
    oGpm.textContent = fmt(r.gpm, 1) + " GPM";
    oSize.textContent = r.recommended_size + " in " + r.material_label + " (ID " + fmt(r.recommended_id_in, 3) + " in)";
    oVel.textContent = fmt(r.velocity_fps, 2) + " ft/s (ceiling " + fmt(r.max_velocity_fps, 0) + " ft/s)";
    oFric.textContent = fmt(r.friction_ft_per_100ft, 2) + " ft/100 ft; pump head " + fmt(r.head_ft, 2) + " ft at " + fmt(r.length_ft, 0) + " ft";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Sized at or below the velocity ceiling; add fitting equivalent length for the final pump head.";
  }, DEBOUNCE_MS);
  for (const el of [q.input, dt.input, vmax.input, len.input]) el.addEventListener("input", update);
  mat.select.addEventListener("change", update);
}
HVACSYSTEMS_RENDERERS["boiler-pipe-sizing"] = _v16h_renderBoilerPipeSizing;

// --- C.8 Compressor short-cycle protection minimum runtime -----------

// Protection thresholds by system type. min_on (oil return / latent
// removal), min_off (high/low pressure equalization), and the
// maximum cycles per hour the cycling-rate parabola peaks at. Inverter
// systems modulate capacity and do not cycle the compressor the same
// way; their limits are per-manufacturer. Copeland Application
// Engineering Bulletin 17-1226 and ASHRAE Fundamentals 2021.
export const COMPRESSOR_CYCLE_LIMITS = {
  single: { label: "Single-stage", min_on_min: 10, min_off_min: 5, max_cph: 6 },
  two_stage: { label: "Two-stage", min_on_min: 8, min_off_min: 5, max_cph: 8 },
  inverter: { label: "VRF / inverter", min_on_min: 4, min_off_min: 3, max_cph: null },
};

// dims: in { args: dimensionless } out: { cph_estimated: T^-1, on_time_min: T, off_time_min: T }
export function computeCompressorShortCycle({
  system_type = "single",
  load_fraction_pct = 50,
  observed_cph = null,
} = {}) {
  const lim = COMPRESSOR_CYCLE_LIMITS[system_type] ?? COMPRESSOR_CYCLE_LIMITS.single;
  const lf = Number(load_fraction_pct);
  if (!Number.isFinite(lf) || lf <= 0 || lf >= 100) return { error: "Enter a load fraction between 0 and 100 percent (the part-load operating point)." };
  const x = lf / 100;

  // Cycling-rate parabola (ASHRAE/AHRI part-load model): the cycle rate
  // peaks at the 50% runtime fraction and falls to zero at 0% and 100%.
  // N(x) = N_max * 4 * x * (1 - x). Inverter systems modulate instead of
  // cycling, so the parabola does not apply.
  let cph_estimated = null, on_time_min = null, off_time_min = null;
  if (lim.max_cph != null) {
    cph_estimated = lim.max_cph * 4 * x * (1 - x);
    if (cph_estimated > 1e-9) {
      on_time_min = (x * 60) / cph_estimated;
      off_time_min = ((1 - x) * 60) / cph_estimated;
    }
  }

  const obs = observed_cph != null && Number.isFinite(Number(observed_cph)) && Number(observed_cph) > 0 ? Number(observed_cph) : null;

  const flags = [];
  let short_cycling = false;
  if (lim.max_cph == null) {
    flags.push("Inverter / VRF systems modulate capacity rather than cycle; minimum on-time " + lim.min_on_min + " min per the manufacturer, no fixed cycles-per-hour ceiling.");
  } else {
    if (on_time_min != null && on_time_min < lim.min_on_min) {
      short_cycling = true;
      flags.push("Estimated on-time " + on_time_min.toFixed(1) + " min is below the " + lim.min_on_min + "-min oil-return / dehumidification runtime; the unit is oversized for this load and will short-cycle.");
    }
    if (off_time_min != null && off_time_min < lim.min_off_min) {
      flags.push("Estimated off-time below the " + lim.min_off_min + "-min pressure-equalization delay; a hard-start anti-short-cycle timer is indicated.");
    }
    if (obs != null && obs > lim.max_cph) {
      short_cycling = true;
      flags.push("Observed " + obs + " cycles/hr exceeds the " + lim.max_cph + " cph ceiling; check the thermostat differential and refrigerant charge.");
    }
  }

  return {
    system_type,
    system_label: lim.label,
    load_fraction_pct: lf,
    min_runtime_min: lim.min_on_min,
    min_off_min: lim.min_off_min,
    max_cph: lim.max_cph,
    cph_estimated,
    on_time_min,
    off_time_min,
    observed_cph: obs,
    short_cycling,
    flags,
  };
}

export const compressorShortCycleExample = {
  // Single-stage at 50% load: the cycling parabola peaks at the 6 cph
  // ceiling, on-time = 0.5 * 60 / 6 = 5 min, below the 10-min oil-return
  // runtime -> short-cycling flagged (the classic oversized-unit case).
  inputs: { system_type: "single", load_fraction_pct: 50 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16h_renderCompressorShortCycle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: cycle rate N = N_max x 4 x X x (1 - X) where X is the runtime (load) fraction (the ASHRAE/AHRI part-load cycling model, peaking at 50% load); on-time = X x 60 / N. Minimum runtime and pressure-equalization delays per the Copeland Application Engineering Bulletin 17-1226 and ASHRAE Fundamentals 2021. Per-manufacturer guidance governs inverter systems. Free at copeland.com/literature.";
  const sys = makeSelect("System type", "cc8-sys", [
    { value: "single", label: "Single-stage", selected: true },
    { value: "two_stage", label: "Two-stage" },
    { value: "inverter", label: "VRF / inverter" },
  ]);
  const lf = makeNumber("Load fraction (% of design)", "cc8-lf", { step: "any", min: "0", max: "100", value: "50" });
  const obs = makeNumber("Observed cycles/hr (optional)", "cc8-obs", { step: "any", min: "0" });
  for (const f of [sys, lf, obs]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    sys.select.value = "single"; lf.input.value = "50"; obs.input.value = ""; update();
  });

  const oCph = makeOutputLine(outputRegion, "Estimated cycles/hr", "cc8-out-cph");
  const oOn = makeOutputLine(outputRegion, "On / off time", "cc8-out-on");
  const oMin = makeOutputLine(outputRegion, "Minimum runtime", "cc8-out-min");
  const oNote = makeOutputLine(outputRegion, "Notes", "cc8-out-note");

  const update = debounce(() => {
    const r = computeCompressorShortCycle({
      system_type: sys.select.value,
      load_fraction_pct: _v16h_readNum(lf.input),
      observed_cph: _v16h_readNum(obs.input),
    });
    if (r.error) { oCph.textContent = r.error; oOn.textContent = "-"; oMin.textContent = "-"; oNote.textContent = ""; return; }
    oCph.textContent = r.cph_estimated != null ? fmt(r.cph_estimated, 2) + " cph (ceiling " + r.max_cph + ")" : "modulates (no fixed ceiling)";
    oOn.textContent = r.on_time_min != null ? fmt(r.on_time_min, 1) + " min on / " + fmt(r.off_time_min, 1) + " min off" : "-";
    oMin.textContent = fmt(r.min_runtime_min, 0) + " min on (oil return), " + fmt(r.min_off_min, 0) + " min off (equalization)";
    oNote.textContent = r.flags.length ? r.flags.join(" ") : "On-time meets the minimum runtime at this load fraction.";
  }, DEBOUNCE_MS);
  for (const el of [lf.input, obs.input]) el.addEventListener("input", update);
  sys.select.addEventListener("change", update);
}
HVACSYSTEMS_RENDERERS["compressor-short-cycle"] = _v16h_renderCompressorShortCycle;

// --- C.10 Humidifier capacity (lb/hr from RH target) -----------------

// Humidity ratio (lb water / lb dry air) from dry-bulb (F) and relative
// humidity (%) at total pressure P (kPa). W = 0.621945 * Pw / (P - Pw),
// Pw = RH * Pws(T). ASHRAE Fundamentals 2021 Ch. 1.
function _v16h_humidityRatioFromRH({ T_db_F, rh_pct, P_kPa }) {
  const T_C = (T_db_F - 32) * 5 / 9;
  const Pws = _v9_satPressure_kPa(T_C);
  const Pw = (rh_pct / 100) * Pws;
  if (Pw >= P_kPa) return null;
  return 0.621945 * Pw / (P_kPa - Pw);
}

// Latent heat of vaporization of water near room temperature (BTU/lb).
const _V16H_HFG_BTU_LB = 1061;

// dims: in { args: dimensionless } out: { addition_lb_hr: M T^-1, gpd: L^3 T^-1, latent_btu_hr: M L^2 T^-3 }
export function computeHumidifierCapacity({
  cfm = 0,
  supply_db_F = 70,
  entering_rh_pct = 20,
  target_rh_pct = 40,
  altitude_ft = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const CFM = Number(cfm) || 0;
  const Tdb = Number(supply_db_F);
  const rhIn = Number(entering_rh_pct);
  const rhTgt = Number(target_rh_pct);
  const z = Number(altitude_ft) || 0;
  if (!(CFM > 0)) return { error: "Enter a positive supply airflow (CFM)." };
  if (!Number.isFinite(Tdb)) return { error: "Enter the supply-air dry-bulb temperature (F)." };
  if (!Number.isFinite(rhIn) || !Number.isFinite(rhTgt) || rhIn < 0 || rhTgt <= 0) return { error: "Enter entering and target relative humidity (percent)." };
  if (rhTgt <= rhIn) return { error: "Target RH must exceed entering RH (a humidifier adds moisture)." };

  const P_kPa = _v9_pressureAtAltitude_kPa(z);
  const W_in = _v16h_humidityRatioFromRH({ T_db_F: Tdb, rh_pct: rhIn, P_kPa });
  const W_tgt = _v16h_humidityRatioFromRH({ T_db_F: Tdb, rh_pct: rhTgt, P_kPa });
  if (W_in == null || W_tgt == null) return { error: "Saturation reached at this temperature and pressure; check the inputs." };
  const dW = W_tgt - W_in;

  // Dry-air density (lb/ft^3) at the altitude pressure and dry-bulb temp.
  const T_K = (Tdb - 32) * 5 / 9 + 273.15;
  const rho_kg_m3 = (P_kPa * 1000) / (287.055 * T_K);
  const rho_lb_ft3 = rho_kg_m3 * 0.0624280;

  const m_dot_air_lb_hr = 60 * CFM * rho_lb_ft3;
  const addition_lb_hr = m_dot_air_lb_hr * dW;
  const gpd = (addition_lb_hr * 24) / 8.34;
  const latent_btu_hr = addition_lb_hr * _V16H_HFG_BTU_LB;

  const warnings = [];
  if (rhTgt > 60) warnings.push("Target RH above 60% risks condensation on cold surfaces and windows; confirm the building envelope.");
  if (z < 0 || z > 12000) warnings.push("Altitude " + z + " ft is outside the standard-atmosphere correction's typical range (0-12,000 ft).");

  return {
    cfm: CFM,
    supply_db_F: Tdb,
    altitude_ft: z,
    pressure_kPa: P_kPa,
    W_entering: W_in,
    W_target: W_tgt,
    delta_W: dW,
    air_density_lb_ft3: rho_lb_ft3,
    addition_lb_hr,
    gpd,
    latent_btu_hr,
    warnings,
  };
}

export const humidifierCapacityExample = {
  // 1,000 CFM, 70 F supply, 20% -> 40% RH at sea level. W rises from
  // ~0.00308 to ~0.00620 lb/lb; dry-air density ~0.0749 lb/ft^3;
  // m_dot = 60*1000*0.0749 = 4,493 lb/hr; addition ~13.99 lb/hr ~ 40 gpd;
  // latent ~14,850 BTU/hr.
  inputs: { cfm: 1000, supply_db_F: 70, entering_rh_pct: 20, target_rh_pct: 40, altitude_ft: 0 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16h_renderHumidifierCapacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: addition (lb/hr) = 60 x CFM x rho x (W_target - W_entering), with W from dry-bulb and RH at the altitude-corrected pressure; latent load = addition x 1061 BTU/lb. Per ASHRAE Fundamentals 2021 Ch. 1 (psychrometrics). AHJ and the manufacturer's published humidifier capacity govern actual delivery. Free at ashrae.org for the TOC.";
  const cfm = makeNumber("Supply airflow (CFM)", "hc10-cfm", { step: "any", min: "0", value: "1000" });
  const db = makeNumber("Supply dry-bulb (F)", "hc10-db", { step: "any", value: "70" });
  const rin = makeNumber("Entering RH (%)", "hc10-rin", { step: "any", min: "0", max: "100", value: "20" });
  const rtg = makeNumber("Target RH (%)", "hc10-rtg", { step: "any", min: "0", max: "100", value: "40" });
  const alt = makeNumber("Altitude (ft)", "hc10-alt", { step: "any", value: "0" });
  for (const f of [cfm, db, rin, rtg, alt]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    cfm.input.value = "1000"; db.input.value = "70"; rin.input.value = "20"; rtg.input.value = "40"; alt.input.value = "0"; update();
  });

  const oAdd = makeOutputLine(outputRegion, "Moisture addition", "hc10-out-add");
  const oGpd = makeOutputLine(outputRegion, "Daily water", "hc10-out-gpd");
  const oLat = makeOutputLine(outputRegion, "Latent load added", "hc10-out-lat");
  const oNote = makeOutputLine(outputRegion, "Notes", "hc10-out-note");

  const update = debounce(() => {
    const r = computeHumidifierCapacity({
      cfm: _v16h_readNum(cfm.input),
      supply_db_F: _v16h_readNum(db.input),
      entering_rh_pct: _v16h_readNum(rin.input),
      target_rh_pct: _v16h_readNum(rtg.input),
      altitude_ft: _v16h_readNum(alt.input),
    });
    if (r.error) { oAdd.textContent = r.error; oGpd.textContent = "-"; oLat.textContent = "-"; oNote.textContent = ""; return; }
    oAdd.textContent = fmt(r.addition_lb_hr, 1) + " lb/hr (delta-W " + fmt(r.delta_W * 7000, 1) + " gr/lb)";
    oGpd.textContent = fmt(r.gpd, 1) + " gal/day";
    oLat.textContent = fmt(r.latent_btu_hr, 0) + " BTU/hr";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Required steam or evaporative output; the manufacturer's capacity governs delivery.";
  }, DEBOUNCE_MS);
  for (const el of [cfm.input, db.input, rin.input, rtg.input, alt.input]) el.addEventListener("input", update);
}
HVACSYSTEMS_RENDERERS["humidifier-capacity"] = _v16h_renderHumidifierCapacity;

// --- C.7 Filter pressure-drop schedule and fan-energy penalty --------

// Representative clean and change-out (final) pressure drops (in. WC) by
// filter class at a 300 fpm reference face velocity, from typical
// manufacturer cut sheets for 2-4 in pleated media (the MERV rating
// itself is defined by ASHRAE 52.2; the cut sheet, not the test method,
// publishes the pressure drop). These are user-overridable defaults, not
// a fixed reference table; the actual filter's cut sheet governs.
export const FILTER_DP_TABLE = {
  merv8: { label: "MERV 8", clean_dp: 0.20, final_dp: 0.50 },
  merv11: { label: "MERV 11", clean_dp: 0.28, final_dp: 0.60 },
  merv13: { label: "MERV 13", clean_dp: 0.35, final_dp: 0.70 },
  merv16: { label: "MERV 16", clean_dp: 0.55, final_dp: 1.00 },
  hepa: { label: "HEPA", clean_dp: 1.00, final_dp: 2.00 },
};

// Reference face velocity (fpm) the bundled clean/final drops are quoted
// at. Pressure drop through fibrous media scales ~linearly with face
// velocity in the operating range (Darcy regime), so dp(V) = dp_ref *
// V / V_ref is the first-order correction the tile applies.
const _V16H_FILTER_REF_FPM = 300;
// Air horsepower constant: AHP = CFM * dp(in. WC) / 6356.
const _V16H_AHP_CONST = 6356;

// dims: in { args: dimensionless } out: { airflow_cfm: L^3 T^-1, clean_dp_in_wc: dimensionless, final_dp_in_wc: dimensionless, clean_fan_kw: M L^2 T^-3 }
export function computeFilterPressureDrop({
  filter_type = "merv13",
  face_area_ft2 = 0,
  face_velocity_fpm = 300,
  clean_dp_override = null,
  final_dp_override = null,
  fan_total_efficiency = 0.6,
  runtime_hr_per_year = 4000,
  energy_cost_per_kwh = null,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const t = FILTER_DP_TABLE[filter_type] ?? FILTER_DP_TABLE.merv13;
  const area = Number(face_area_ft2) || 0;
  const vel = Number(face_velocity_fpm) || 0;
  const eta = Number(fan_total_efficiency) || 0;
  const runtime = Number(runtime_hr_per_year);
  if (!(area > 0)) return { error: "Enter a positive filter face area (ft^2)." };
  if (!(vel > 0)) return { error: "Enter a positive face velocity (fpm)." };
  if (!(eta > 0 && eta <= 1)) return { error: "Fan total efficiency must be between 0 and 1." };

  const airflow_cfm = area * vel;
  // Velocity-scaled clean / final drops (unless the user overrides with a
  // cut-sheet value, which is taken at the actual operating point as-is).
  const velScale = vel / _V16H_FILTER_REF_FPM;
  const clean_dp_in_wc = clean_dp_override != null && Number.isFinite(Number(clean_dp_override)) && Number(clean_dp_override) > 0
    ? Number(clean_dp_override)
    : t.clean_dp * velScale;
  const final_dp_in_wc = final_dp_override != null && Number.isFinite(Number(final_dp_override)) && Number(final_dp_override) > 0
    ? Number(final_dp_override)
    : t.final_dp * velScale;
  // Average drop across a roughly linear loading cycle.
  const avg_dp_in_wc = (clean_dp_in_wc + final_dp_in_wc) / 2;

  // Fan power (kW) attributable to the filter at a given pressure drop:
  // brake HP = (CFM * dp / 6356) / efficiency; kW = HP * 0.7457.
  const fanKw = (dp) => ((airflow_cfm * dp) / _V16H_AHP_CONST / eta) * 0.7457;
  const clean_fan_kw = fanKw(clean_dp_in_wc);
  const final_fan_kw = fanKw(final_dp_in_wc);
  const avg_fan_kw = fanKw(avg_dp_in_wc);

  // Annual fan energy attributable to the filter (averaged over the
  // loading cycle) and the penalty over a clean filter.
  const rt = Number.isFinite(runtime) && runtime > 0 ? runtime : 0;
  const annual_fan_kwh = avg_fan_kw * rt;
  const annual_penalty_kwh = (avg_fan_kw - clean_fan_kw) * rt;
  const cost = energy_cost_per_kwh != null && Number.isFinite(Number(energy_cost_per_kwh)) && Number(energy_cost_per_kwh) >= 0 ? Number(energy_cost_per_kwh) : null;
  const annual_fan_cost = cost != null ? annual_fan_kwh * cost : null;

  const warnings = [];
  if (vel > 500) warnings.push("Face velocity above 500 fpm is outside the typical commercial range; pressure drop and filter loading rise steeply and HEPA stages may need a pre-filter.");
  if (final_dp_in_wc <= clean_dp_in_wc) warnings.push("Change-out pressure drop is at or below the clean drop; enter a higher final (loaded) value.");

  return {
    filter_type,
    filter_label: t.label,
    airflow_cfm,
    face_velocity_fpm: vel,
    clean_dp_in_wc,
    final_dp_in_wc,
    avg_dp_in_wc,
    clean_fan_kw,
    final_fan_kw,
    avg_fan_kw,
    runtime_hr_per_year: rt,
    annual_fan_kwh,
    annual_penalty_kwh,
    annual_fan_cost,
    warnings,
  };
}

export const filterPressureDropExample = {
  // MERV 13, 4 ft^2 face at the 300 fpm reference velocity -> 1,200 CFM.
  // Clean 0.35 in WC, change-out 0.70 in WC. Clean fan power =
  // (1200 * 0.35 / 6356) / 0.6 * 0.7457 = 0.0821 kW.
  inputs: { filter_type: "merv13", face_area_ft2: 4, face_velocity_fpm: 300, fan_total_efficiency: 0.6, runtime_hr_per_year: 4000 },
};

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function _v16h_renderFilterPressureDrop(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: face velocity = CFM / face area; pressure drop scales ~linearly with face velocity (Darcy regime), dp(V) = dp_ref x V / 300 fpm; fan power (kW) = (CFM x dp_in_wc / 6356) / fan efficiency x 0.7457. Clean / change-out drops are representative cut-sheet values; the MERV rating is per ASHRAE 52.2-2017 and the actual filter's cut sheet governs the drop. Free at ashrae.org for the ASHRAE 52.2 TOC.";
  const type = makeSelect("Filter class", "fp7-type", [
    { value: "merv8", label: "MERV 8" },
    { value: "merv11", label: "MERV 11" },
    { value: "merv13", label: "MERV 13", selected: true },
    { value: "merv16", label: "MERV 16" },
    { value: "hepa", label: "HEPA" },
  ]);
  const area = makeNumber("Face area (ft^2)", "fp7-area", { step: "any", min: "0", value: "4" });
  const vel = makeNumber("Face velocity (fpm)", "fp7-vel", { step: "any", min: "0", value: "300" });
  const cleanO = makeNumber("Clean drop override (in WC, optional)", "fp7-clean", { step: "any", min: "0" });
  const finalO = makeNumber("Change-out drop override (in WC, optional)", "fp7-final", { step: "any", min: "0" });
  const eff = makeNumber("Fan total efficiency (0-1)", "fp7-eff", { step: "any", min: "0", max: "1", value: "0.6" });
  const rt = makeNumber("Runtime (hr/yr)", "fp7-rt", { step: "any", min: "0", value: "4000" });
  const cost = makeNumber("Energy cost ($/kWh, optional)", "fp7-cost", { step: "any", min: "0" });
  for (const f of [type, area, vel, cleanO, finalO, eff, rt, cost]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    type.select.value = "merv13"; area.input.value = "4"; vel.input.value = "300";
    cleanO.input.value = ""; finalO.input.value = ""; eff.input.value = "0.6"; rt.input.value = "4000"; cost.input.value = ""; update();
  });

  const oFlow = makeOutputLine(outputRegion, "Airflow", "fp7-out-flow");
  const oDp = makeOutputLine(outputRegion, "Pressure drop (clean -> change-out)", "fp7-out-dp");
  const oFan = makeOutputLine(outputRegion, "Fan power (clean -> change-out)", "fp7-out-fan");
  const oEnergy = makeOutputLine(outputRegion, "Annual fan energy / penalty", "fp7-out-energy");
  const oNote = makeOutputLine(outputRegion, "Notes", "fp7-out-note");

  const update = debounce(() => {
    const r = computeFilterPressureDrop({
      filter_type: type.select.value,
      face_area_ft2: _v16h_readNum(area.input),
      face_velocity_fpm: _v16h_readNum(vel.input),
      clean_dp_override: _v16h_readNum(cleanO.input),
      final_dp_override: _v16h_readNum(finalO.input),
      fan_total_efficiency: _v16h_readNum(eff.input),
      runtime_hr_per_year: _v16h_readNum(rt.input),
      energy_cost_per_kwh: _v16h_readNum(cost.input),
    });
    if (r.error) { oFlow.textContent = r.error; oDp.textContent = "-"; oFan.textContent = "-"; oEnergy.textContent = "-"; oNote.textContent = ""; return; }
    oFlow.textContent = fmt(r.airflow_cfm, 0) + " CFM at " + fmt(r.face_velocity_fpm, 0) + " fpm";
    oDp.textContent = fmt(r.clean_dp_in_wc, 2) + " -> " + fmt(r.final_dp_in_wc, 2) + " in WC (avg " + fmt(r.avg_dp_in_wc, 2) + ")";
    oFan.textContent = fmt(r.clean_fan_kw, 3) + " -> " + fmt(r.final_fan_kw, 3) + " kW";
    oEnergy.textContent = r.runtime_hr_per_year > 0
      ? fmt(r.annual_fan_kwh, 0) + " kWh/yr (loading penalty " + fmt(r.annual_penalty_kwh, 0) + " kWh" + (r.annual_fan_cost != null ? ", " + "$" + fmt(r.annual_fan_cost, 0) : "") + ")"
      : "enter a runtime";
    oNote.textContent = r.warnings.length ? r.warnings.join(" ") : "Change the filter when it reaches the change-out drop; the average drop drives the fan-energy cost.";
  }, DEBOUNCE_MS);
  for (const el of [area.input, vel.input, cleanO.input, finalO.input, eff.input, rt.input, cost.input]) el.addEventListener("input", update);
  type.select.addEventListener("change", update);
}
HVACSYSTEMS_RENDERERS["filter-pressure-drop"] = _v16h_renderFilterPressureDrop;

// ===================== spec-v227: window solar heat gain + conduction cooling load =====================

// dims: in { area_ft2: L^2, shgc: dimensionless, psf: M T^-3, u_factor: M T^-4, cltd_f: T } out: { q_solar: M L^2 T^-3, q_cond: M L^2 T^-3, q_total: M L^2 T^-3 }
export function computeWindowSolarHeatGain({ area_ft2 = 0, shgc = 0, psf = 0, u_factor = 0, cltd_f = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(area_ft2 > 0)) return { error: "Glazing area must be positive (ft^2)." };
  if (shgc < 0 || shgc > 1) return { error: "SHGC must be 0 to 1." };
  if (psf < 0) return { error: "Peak solar factor cannot be negative." };
  if (u_factor < 0) return { error: "U-factor cannot be negative." };
  const q_solar = area_ft2 * shgc * psf;
  const q_cond = area_ft2 * u_factor * cltd_f;
  const q_total = q_solar + q_cond;
  return {
    q_solar, q_cond, q_total,
    note: "ASHRAE / ACCA Manual J fenestration cooling load: solar Q = A x SHGC x PSF and conduction Q = A x U x CLTD. The peak solar factor (PSF / SHGF) is read from the ASHRAE/ACCA table for the window's orientation and the site latitude (a west or east wall in summer runs far higher than a north wall; entered, not a bundled chart). The SHGC and U come from the NFRC label; the glass CLTD is the design temperature difference adjusted for the daily cycle. Interior shades and overhangs reduce the solar term by a separate shade factor. One cooling-load component, not a Manual J.",
  };
}
function _v16h_renderWindowSolarHeatGain(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASHRAE / ACCA Manual J fenestration cooling load Q_solar = A x SHGC x PSF and Q_cond = A x U x CLTD (by name). The peak solar factor is from the ASHRAE/ACCA table for the orientation and latitude; SHGC and U come from the NFRC label; interior shades reduce the solar term by a separate shade factor. One cooling-load component, not a Manual J.";
  const area = makeNumber("Glazing area (ft^2)", "wsh-area", { step: "any", min: "0", value: "40" });
  const shgc = makeNumber("SHGC (NFRC label, 0-1)", "wsh-shgc", { step: "any", min: "0", value: "0.30" });
  const psf = makeNumber("Peak solar factor (Btu/h/ft^2)", "wsh-psf", { step: "any", min: "0", value: "200" });
  const u = makeNumber("U-factor (Btu/h/ft^2/F)", "wsh-u", { step: "any", min: "0", value: "0.30" });
  const cltd = makeNumber("Glass CLTD (F)", "wsh-cltd", { step: "any", value: "14" });
  for (const f of [area, shgc, psf, u, cltd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "40"; shgc.input.value = "0.30"; psf.input.value = "200"; u.input.value = "0.30"; cltd.input.value = "14"; update(); });
  const oSolar = makeOutputLine(outputRegion, "Solar gain", "wsh-out-solar");
  const oCond = makeOutputLine(outputRegion, "Conduction", "wsh-out-cond");
  const oTotal = makeOutputLine(outputRegion, "Total cooling load", "wsh-out-total");
  const oNote = makeOutputLine(outputRegion, "Note", "wsh-out-note");
  const update = debounce(() => {
    const r = computeWindowSolarHeatGain({ area_ft2: Number(area.input.value) || 0, shgc: Number(shgc.input.value) || 0, psf: Number(psf.input.value) || 0, u_factor: Number(u.input.value) || 0, cltd_f: Number(cltd.input.value) || 0 });
    if (r.error) { oSolar.textContent = r.error; oCond.textContent = "-"; oTotal.textContent = "-"; oNote.textContent = ""; return; }
    oSolar.textContent = fmt(r.q_solar, 0) + " Btu/h";
    oCond.textContent = fmt(r.q_cond, 0) + " Btu/h";
    oTotal.textContent = fmt(r.q_total, 0) + " Btu/h";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [area.input, shgc.input, psf.input, u.input, cltd.input]) el.addEventListener("input", update);
}
HVACSYSTEMS_RENDERERS["window-solar-heat-gain"] = _v16h_renderWindowSolarHeatGain;

// ===================== spec-v228: internal heat gains (people, lighting, equipment) =====================

// dims: in { occupants: dimensionless, sens_per_person: M L^2 T^-3, lat_per_person: M L^2 T^-3, lighting_w: M L^2 T^-3, equipment_w: M L^2 T^-3, use_factor: dimensionless } out: { q_sensible: M L^2 T^-3, q_latent: M L^2 T^-3, q_total: M L^2 T^-3 }
export function computeInternalHeatGains({ occupants = 0, sens_per_person = 245, lat_per_person = 200, lighting_w = 0, equipment_w = 0, use_factor = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (occupants < 0) return { error: "Occupant count cannot be negative." };
  if (sens_per_person < 0 || lat_per_person < 0) return { error: "Per-person gain cannot be negative (Btu/h)." };
  if (lighting_w < 0 || equipment_w < 0) return { error: "Lighting / equipment power cannot be negative (W)." };
  if (!(use_factor >= 0 && use_factor <= 1)) return { error: "Use factor must be 0 to 1." };
  const q_people_sensible = occupants * sens_per_person;
  const q_people_latent = occupants * lat_per_person;
  const q_lighting = lighting_w * 3.412 * use_factor;
  const q_equipment = equipment_w * 3.412 * use_factor;
  const q_sensible = q_people_sensible + q_lighting + q_equipment;
  const q_latent = q_people_latent;
  const q_total = q_sensible + q_latent;
  return {
    q_people_sensible, q_people_latent, q_lighting, q_equipment, q_sensible, q_latent, q_total,
    note: "ASHRAE / ACCA Manual J internal-gain method: occupant sensible and latent from the activity table (a seated office occupant is roughly 245 Btu/h sensible and 200 latent; heavier activity is far higher), and lighting and equipment at 3.412 Btu/h per watt. The use factor accounts for the fraction actually on (and a ballast factor for the fixture type). Recessed lighting vented to a return plenum delivers part of its heat to the plenum rather than the room. The latent term is moisture a sensible-only 'more airflow' fix never removes. One cooling-load component, not a Manual J.",
  };
}
function _v16h_renderInternalHeatGains(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASHRAE / ACCA Manual J internal-gain method (by name): occupant sensible and latent from the activity table, lighting and equipment at 3.412 Btu/h per watt, scaled by the use factor. Recessed lighting on a return plenum delivers part of its heat to the plenum. One cooling-load component, not a Manual J.";
  const occ = makeNumber("Occupants", "ihg-occ", { step: "any", min: "0", value: "6" });
  const sens = makeNumber("Sensible per person (Btu/h)", "ihg-sens", { step: "any", min: "0", value: "245" });
  const lat = makeNumber("Latent per person (Btu/h)", "ihg-lat", { step: "any", min: "0", value: "200" });
  const light = makeNumber("Lighting power (W)", "ihg-light", { step: "any", min: "0", value: "800" });
  const equip = makeNumber("Equipment power (W)", "ihg-equip", { step: "any", min: "0", value: "1200" });
  const use = makeNumber("Use factor (0-1)", "ihg-use", { step: "any", min: "0", value: "1.0" });
  for (const f of [occ, sens, lat, light, equip, use]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { occ.input.value = "6"; sens.input.value = "245"; lat.input.value = "200"; light.input.value = "800"; equip.input.value = "1200"; use.input.value = "1.0"; update(); });
  const oSensible = makeOutputLine(outputRegion, "Sensible load", "ihg-out-sensible");
  const oLatent = makeOutputLine(outputRegion, "Latent load", "ihg-out-latent");
  const oTotal = makeOutputLine(outputRegion, "Total cooling load", "ihg-out-total");
  const oBreak = makeOutputLine(outputRegion, "People / lighting / equipment", "ihg-out-break");
  const oNote = makeOutputLine(outputRegion, "Note", "ihg-out-note");
  const update = debounce(() => {
    const r = computeInternalHeatGains({ occupants: Number(occ.input.value) || 0, sens_per_person: Number(sens.input.value) || 0, lat_per_person: Number(lat.input.value) || 0, lighting_w: Number(light.input.value) || 0, equipment_w: Number(equip.input.value) || 0, use_factor: Number(use.input.value) || 0 });
    if (r.error) { oSensible.textContent = r.error; oLatent.textContent = "-"; oTotal.textContent = "-"; oBreak.textContent = "-"; oNote.textContent = ""; return; }
    oSensible.textContent = fmt(r.q_sensible, 0) + " Btu/h";
    oLatent.textContent = fmt(r.q_latent, 0) + " Btu/h";
    oTotal.textContent = fmt(r.q_total, 0) + " Btu/h";
    oBreak.textContent = fmt(r.q_people_sensible + r.q_people_latent, 0) + " / " + fmt(r.q_lighting, 0) + " / " + fmt(r.q_equipment, 0) + " Btu/h";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [occ.input, sens.input, lat.input, light.input, equip.input, use.input]) el.addEventListener("input", update);
}
HVACSYSTEMS_RENDERERS["internal-heat-gains"] = _v16h_renderInternalHeatGains;

// ===================== spec-v229: opaque-envelope conduction cooling load (sol-air CLTD) =====================

// dims: in { area_ft2: L^2, u_factor: M T^-4, cltd_f: T } out: { q_cond: M L^2 T^-3 }
export function computeEnvelopeConductionLoad({ area_ft2 = 0, u_factor = 0, cltd_f = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(area_ft2 > 0)) return { error: "Surface area must be positive (ft^2)." };
  if (!(u_factor > 0)) return { error: "U-factor must be positive (Btu/h/ft^2/F)." };
  const q_cond = u_factor * area_ft2 * cltd_f;
  return {
    q_cond,
    note: "ASHRAE / ACCA Manual J opaque-envelope cooling load: Q = U x A x CLTD, where the CLTD is the sol-air cooling-load temperature difference for the surface. The CLTD comes from the ASHRAE/ACCA table for the surface type, color, orientation, and design day (a dark, sunlit roof runs far above the air temperature difference because of solar absorptance and mass lag; a light or shaded surface runs near it; entered, not a bundled chart). The U-factor is the whole-assembly value from assembly-r-value or the construction. One cooling-load component, not a Manual J.",
  };
}
function _v16h_renderEnvelopeConductionLoad(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASHRAE / ACCA Manual J opaque-envelope cooling load Q = U x A x CLTD, the CLTD being the sol-air cooling-load temperature difference (by name). The sol-air CLTD comes from the ASHRAE/ACCA table for the surface type, color, orientation, and design day; the U-factor is the whole-assembly value. One cooling-load component, not a Manual J.";
  const area = makeNumber("Opaque surface area (ft^2)", "ecl-area", { step: "any", min: "0", value: "1000" });
  const u = makeNumber("Assembly U-factor (Btu/h/ft^2/F)", "ecl-u", { step: "any", min: "0", value: "0.05" });
  const cltd = makeNumber("Sol-air CLTD (F)", "ecl-cltd", { step: "any", value: "70" });
  for (const f of [area, u, cltd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { area.input.value = "1000"; u.input.value = "0.05"; cltd.input.value = "70"; update(); });
  const oCond = makeOutputLine(outputRegion, "Conduction cooling load", "ecl-out-cond");
  const oNote = makeOutputLine(outputRegion, "Note", "ecl-out-note");
  const update = debounce(() => {
    const r = computeEnvelopeConductionLoad({ area_ft2: Number(area.input.value) || 0, u_factor: Number(u.input.value) || 0, cltd_f: Number(cltd.input.value) || 0 });
    if (r.error) { oCond.textContent = r.error; oNote.textContent = ""; return; }
    oCond.textContent = fmt(r.q_cond, 0) + " Btu/h";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [area.input, u.input, cltd.input]) el.addEventListener("input", update);
}
HVACSYSTEMS_RENDERERS["envelope-conduction-load"] = _v16h_renderEnvelopeConductionLoad;

// ===================== spec-v409..v410: HVAC duct-design trio (Group C) =====================

// dims: in { cfm: L^3 T^-1, face_width_in: L, face_height_in: L, threshold_fpm: L T^-1 } out: { face_area_ft2: L^2, face_velocity_fpm: L T^-1 }
export function computeCoilFaceVelocity({ cfm = 0, face_width_in = 0, face_height_in = 0, threshold_fpm = 500 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const q = Number(cfm) || 0;
  const w = Number(face_width_in) || 0;
  const h = Number(face_height_in) || 0;
  const thr = Number(threshold_fpm) > 0 ? Number(threshold_fpm) : 500;
  if (!(q > 0)) return { error: "Airflow must be positive (cfm)." };
  if (!(w > 0)) return { error: "Coil face width must be positive (in)." };
  if (!(h > 0)) return { error: "Coil face height must be positive (in)." };
  const face_area_ft2 = (w * h) / 144;
  const face_velocity_fpm = q / face_area_ft2;
  return {
    face_area_ft2, face_velocity_fpm, threshold_fpm: thr,
    carryover: face_velocity_fpm > thr,
    note: "Cooling-coil face velocity = airflow / coil face area, the number that governs condensate carryover: above about 500 fpm (the editable threshold) a wet cooling coil blows droplets off the fins past the drain pan, wetting the downstream duct. Keep a wet coil at or below ~500 fpm (dry heating coils tolerate more). Lower velocity means a larger coil face for the same airflow. A selection aid; the coil manufacturer's rated face velocity and moisture-carryover limit govern.",
  };
}
function _v409renderCoilFaceVelocity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Cooling-coil face velocity = CFM / coil face area, with the ~500 fpm moisture-carryover limit for a wet coil (ASHRAE / coil-selection practice). Above the threshold a wet coil blows condensate past the drain pan. A selection aid; the coil manufacturer's rated face velocity governs.";
  const cfm = makeNumber("Airflow (cfm)", "cfv-cfm", { step: "any", min: "0", value: "2000" });
  const w = makeNumber("Coil face width (in)", "cfv-w", { step: "any", min: "0", value: "24" });
  const h = makeNumber("Coil face height (in)", "cfv-h", { step: "any", min: "0", value: "18" });
  const thr = makeNumber("Carryover threshold (fpm, default 500)", "cfv-thr", { step: "any", min: "0", value: "500" });
  for (const f of [cfm, w, h, thr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cfm.input.value = "2000"; w.input.value = "24"; h.input.value = "18"; thr.input.value = "500"; update(); });
  const oV = makeOutputLine(outputRegion, "Face velocity", "cfv-out-v");
  const oA = makeOutputLine(outputRegion, "Face area", "cfv-out-a");
  const oNote = makeOutputLine(outputRegion, "Note", "cfv-out-note");
  const update = debounce(() => {
    const r = computeCoilFaceVelocity({ cfm: Number(cfm.input.value) || 0, face_width_in: Number(w.input.value) || 0, face_height_in: Number(h.input.value) || 0, threshold_fpm: Number(thr.input.value) || 0 });
    if (r.error) { oV.textContent = r.error; oA.textContent = ""; oNote.textContent = ""; return; }
    oV.textContent = fmt(r.face_velocity_fpm, 0) + " fpm" + (r.carryover ? " (OVER " + fmt(r.threshold_fpm, 0) + " -- carryover risk)" : " (below threshold)");
    oA.textContent = fmt(r.face_area_ft2, 2) + " ft^2";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [cfm.input, w.input, h.input, thr.input]) el.addEventListener("input", update);
}
HVACSYSTEMS_RENDERERS["coil-face-velocity"] = _v409renderCoilFaceVelocity;

// coil-face-area: inverse of coil-face-velocity. The forward tile gives
// velocity = CFM / face_area; sizing a coil to stay under the wet-coil
// carryover limit is the inverse: required face_area = CFM / target_velocity.
// dims: in { cfm: L^3 T^-1, target_fpm: L T^-1 } out: { face_area_ft2: L^2, face_area_in2: L^2, square_side_in: L }
export function computeCoilFaceArea({ cfm = 0, target_fpm = 500 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const q = Number(cfm) || 0;
  const v = Number(target_fpm) > 0 ? Number(target_fpm) : 500;
  if (!(q > 0)) return { error: "Airflow must be positive (cfm)." };
  if (!(v > 0)) return { error: "Target face velocity must be positive (fpm)." };
  const face_area_ft2 = q / v;
  const face_area_in2 = face_area_ft2 * 144;
  const square_side_in = Math.sqrt(face_area_in2);
  return {
    face_area_ft2, face_area_in2, square_side_in, target_fpm: v,
    note: "Required cooling-coil face area = airflow / the target face velocity, the inverse of the face-velocity check. Sizing to about 500 fpm keeps a wet coil below the moisture-carryover point where droplets blow off the fins past the drain pan; a lower target buys margin at the cost of a larger, more expensive coil. A selection aid; the coil manufacturer's rated face velocity and moisture-carryover limit govern.",
  };
}
export const coilFaceAreaExample = { inputs: { cfm: 2000, target_fpm: 500 } };
function _v701renderCoilFaceArea(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Required coil face area = CFM / target face velocity (the inverse of face velocity = CFM / area), sized to the ~500 fpm wet-coil moisture-carryover limit (ASHRAE / coil-selection practice). A selection aid; the coil manufacturer's rated face velocity governs.";
  const cfm = makeNumber("Airflow (cfm)", "cfa-cfm", { step: "any", min: "0", value: "2000" });
  const v = makeNumber("Target face velocity (fpm, default 500)", "cfa-v", { step: "any", min: "0", value: "500" });
  for (const f of [cfm, v]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cfm.input.value = "2000"; v.input.value = "500"; update(); });
  const oA = makeOutputLine(outputRegion, "Required face area", "cfa-out-a");
  const oS = makeOutputLine(outputRegion, "Square face (approx)", "cfa-out-s");
  const oNote = makeOutputLine(outputRegion, "Note", "cfa-out-note");
  const update = debounce(() => {
    const r = computeCoilFaceArea({ cfm: Number(cfm.input.value) || 0, target_fpm: Number(v.input.value) || 0 });
    if (r.error) { oA.textContent = r.error; oS.textContent = ""; oNote.textContent = ""; return; }
    oA.textContent = fmt(r.face_area_ft2, 2) + " ft^2 (" + fmt(r.face_area_in2, 0) + " in^2)";
    oS.textContent = "~" + fmt(r.square_side_in, 1) + " in x " + fmt(r.square_side_in, 1) + " in at " + fmt(r.target_fpm, 0) + " fpm";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [cfm.input, v.input]) el.addEventListener("input", update);
}
HVACSYSTEMS_RENDERERS["coil-face-area"] = _v701renderCoilFaceArea;

// dims: in { zone_sensible_btuh: M L^2 T^-3, supply_dt_f: T, ventilation_cfm: L^3 T^-1, turndown: dimensionless } out: { cfm_max: L^3 T^-1, cfm_min: L^3 T^-1 }
export function computeVavBoxAirflow({ zone_sensible_btuh = 0, supply_dt_f = 0, ventilation_cfm = 0, turndown = 0.30 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const load = Number(zone_sensible_btuh) || 0;
  const dt = Number(supply_dt_f) || 0;
  const vent = Number(ventilation_cfm) || 0;
  const td = Number(turndown) || 0;
  if (!(load > 0)) return { error: "Zone sensible load must be positive (Btu/hr)." };
  if (!(dt > 0)) return { error: "Supply-to-room temperature difference must be positive (F)." };
  if (vent < 0) return { error: "Ventilation minimum must be non-negative (cfm)." };
  if (!(td > 0 && td <= 1)) return { error: "Turndown fraction must be between 0 and 1." };
  const cfm_max = load / (1.08 * dt);
  const turndown_cfm = td * cfm_max;
  const cfm_min = Math.max(vent, turndown_cfm);
  return {
    cfm_max, cfm_min, turndown_cfm,
    min_governed_by: vent >= turndown_cfm ? "ventilation" : "turndown",
    note: "VAV box airflow limits: the maximum = zone sensible load / (1.08 x supply deltaT), the airflow needed at design cooling, and the minimum = the larger of the ASHRAE 62.1 ventilation minimum and the box's turndown fraction (commonly 0.30) of the maximum. A dense-occupancy zone is driven to a higher minimum by fresh-air needs (ventilation governs); a lightly occupied zone rides the mechanical turndown. Feeds the box schedule and the reheat check. A design aid; the box manufacturer's range and the ventilation calc govern.",
  };
}
function _v410renderVavBoxAirflow(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: VAV box airflow limits: maximum = zone sensible / (1.08 x supply deltaT), minimum = max(ASHRAE 62.1 ventilation minimum, turndown x maximum). The 1.08 is the sensible-heat constant for standard air. A design aid; the box manufacturer's range and the ventilation calculation govern.";
  const load = makeNumber("Zone sensible load (Btu/hr)", "vav-load", { step: "any", min: "0", value: "12000" });
  const dt = makeNumber("Supply-to-room deltaT (F)", "vav-dt", { step: "any", min: "0", value: "20" });
  const vent = makeNumber("Ventilation minimum (cfm, ASHRAE 62.1)", "vav-vent", { step: "any", min: "0", value: "100" });
  const td = makeNumber("Turndown fraction (default 0.30)", "vav-td", { step: "any", min: "0", max: "1", value: "0.30" });
  for (const f of [load, dt, vent, td]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { load.input.value = "12000"; dt.input.value = "20"; vent.input.value = "100"; td.input.value = "0.30"; update(); });
  const oMax = makeOutputLine(outputRegion, "Maximum airflow", "vav-out-max");
  const oMin = makeOutputLine(outputRegion, "Minimum airflow", "vav-out-min");
  const oNote = makeOutputLine(outputRegion, "Note", "vav-out-note");
  const update = debounce(() => {
    const r = computeVavBoxAirflow({ zone_sensible_btuh: Number(load.input.value) || 0, supply_dt_f: Number(dt.input.value) || 0, ventilation_cfm: Number(vent.input.value) || 0, turndown: Number(td.input.value) || 0 });
    if (r.error) { oMax.textContent = r.error; oMin.textContent = ""; oNote.textContent = ""; return; }
    oMax.textContent = fmt(r.cfm_max, 0) + " cfm";
    oMin.textContent = fmt(r.cfm_min, 0) + " cfm (" + r.min_governed_by + " governs)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [load.input, dt.input, vent.input, td.input]) el.addEventListener("input", update);
}
HVACSYSTEMS_RENDERERS["vav-box-airflow"] = _v410renderVavBoxAirflow;

// ===================== spec-v587 C: hydronic buffer tank sizing (anti-short-cycle) =====================
// V = on_time * (source_min - zone_load) / (500 * delta_T). Worst case at zero load.
// dims: in { min_on_time_min: T, source_min_btu: M L^2 T^-3, zone_min_load_btu: M L^2 T^-3, delta_t_f: T } out: { buffer_volume_gal: L^3 }
export function computeHydronicBufferTank({ min_on_time_min = 0, source_min_btu = 0, zone_min_load_btu = 0, delta_t_f = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const t = Number(min_on_time_min) || 0;
  const qMin = Number(source_min_btu) || 0;
  const qLoad = Number(zone_min_load_btu) || 0;
  const dt = Number(delta_t_f) || 0;
  if (!(t > 0)) return { error: "Minimum on-time must be positive (min)." };
  if (!(qMin > 0)) return { error: "Source minimum output must be positive (Btu/hr)." };
  if (!(dt > 0)) return { error: "Temperature swing must be positive (degF)." };
  if (qLoad < 0) return { error: "Zone load cannot be negative (Btu/hr)." };
  if (qLoad >= qMin) return { buffer_volume_gal: 0, no_buffer: true, note: "The minimum zone load meets or exceeds the source minimum output, so the source runs its minimum on-time without short-cycling and no buffer tank is required. The equipment minimum-cycle data and the manufacturer govern." };
  const buffer_volume_gal = t * (qMin - qLoad) / (500 * dt);
  return {
    buffer_volume_gal, no_buffer: false,
    note: "The driver is the source minimum output minus the load, worst case at about zero load - so sizing at the design load undersizes the tank badly. The same formula sizes a chiller buffer. The 500 factor is for water (adjust for glycol). The existing distribution-piping water may already supply part of the volume. The equipment minimum-cycle data and the manufacturer govern - a sizing aid, not the manufacturer's data.",
  };
}
export const hydronicBufferTankExample = { inputs: { min_on_time_min: 10, source_min_btu: 60000, zone_min_load_btu: 0, delta_t_f: 20 } };
function _v587renderHydronicBufferTank(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A sizing aid, not the manufacturer's data; the equipment minimum-cycle data and the manufacturer govern. Citation: ASHRAE / Idronics (Caleffi) anti-short-cycle buffer-tank practice, by name. V = on_time x (source_min - zone_load) / (500 x delta_T). The worst case is at about zero load, when the full minimum output has nowhere to go but the tank; sizing at the design load undersizes it badly. The 500 factor is for water (adjust for glycol); existing distribution-piping water may already supply part of the volume.";
  const t = makeNumber("Minimum on-time (min)", "hbt-t", { step: "any", min: "0", value: "10" }); t.input.value = "10";
  const qMin = makeNumber("Source minimum output (Btu/hr)", "hbt-qmin", { step: "any", min: "0", value: "60000" }); qMin.input.value = "60000";
  const qLoad = makeNumber("Minimum simultaneous zone load (Btu/hr, 0 = worst case)", "hbt-qload", { step: "any", min: "0", value: "0" }); qLoad.input.value = "0";
  const dt = makeNumber("Allowable temperature swing (degF)", "hbt-dt", { step: "any", min: "0", value: "20" }); dt.input.value = "20";
  for (const f of [t, qMin, qLoad, dt]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { t.input.value = "10"; qMin.input.value = "60000"; qLoad.input.value = "0"; dt.input.value = "20"; update(); });
  const oV = makeOutputLine(outputRegion, "Required buffer volume", "hbt-out-v");
  const oNote = makeOutputLine(outputRegion, "Note", "hbt-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeHydronicBufferTank({ min_on_time_min: readNum(t.input), source_min_btu: readNum(qMin.input), zone_min_load_btu: readNum(qLoad.input), delta_t_f: readNum(dt.input) });
    if (r.error) { oV.textContent = r.error; oNote.textContent = ""; return; }
    oV.textContent = r.no_buffer ? "0 gal - no buffer required" : fmt(r.buffer_volume_gal, 1) + " gal";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [t, qMin, qLoad, dt]) f.input.addEventListener("input", update);
}
HVACSYSTEMS_RENDERERS["hydronic-buffer-tank"] = _v587renderHydronicBufferTank;

// ===================== spec-v623 C: buffer tank with distribution-loop credit =====================
// V_gross = on_time*(source_min-zone_load)/(500*dt); loop = 0.0408*d^2*L gal; V_net = max(0, V_gross-loop).
// dims: in { min_on_time_min: T, source_min_btu: M L^2 T^-3, zone_min_load_btu: M L^2 T^-3, delta_t_f: T, pipe_id_in: L, loop_length_ft: L } out: { gross_buffer_gal: L^3, loop_volume_gal: L^3, net_tank_gal: L^3 }
export function computeBufferTankLoopCredit({ min_on_time_min = 0, source_min_btu = 0, zone_min_load_btu = 0, delta_t_f = 0, pipe_id_in = 0, loop_length_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const t = Number(min_on_time_min) || 0;
  const qMin = Number(source_min_btu) || 0;
  const qLoad = Number(zone_min_load_btu) || 0;
  const dt = Number(delta_t_f) || 0;
  const d = Number(pipe_id_in) || 0;
  const L = Number(loop_length_ft) || 0;
  if (!(t > 0)) return { error: "Minimum on-time must be positive (min)." };
  if (!(qMin > 0)) return { error: "Source minimum output must be positive (Btu/hr)." };
  if (!(dt > 0)) return { error: "Temperature swing must be positive (degF)." };
  if (qLoad < 0) return { error: "Zone load cannot be negative (Btu/hr)." };
  if (d < 0) return { error: "Pipe internal diameter cannot be negative (in)." };
  if (L < 0) return { error: "Loop length cannot be negative (ft)." };
  const loop_volume_gal = 0.0408 * d * d * L; // 0.0408 gal per ft per in^2 of diameter (pi/4 x 7.48 gal/ft^3)
  if (qLoad >= qMin) return { gross_buffer_gal: 0, loop_volume_gal, net_tank_gal: 0, no_buffer: true, note: "The minimum zone load meets or exceeds the source minimum output, so the source runs its minimum on-time without short-cycling and no buffer tank is required. The equipment minimum-cycle data and the manufacturer govern." };
  const gross_buffer_gal = t * (qMin - qLoad) / (500 * dt);
  const net_tank_gal = Math.max(0, gross_buffer_gal - loop_volume_gal);
  return {
    gross_buffer_gal, loop_volume_gal, net_tank_gal, no_buffer: false, loop_covers: net_tank_gal === 0,
    note: "The gross buffer is sized worst-case at about zero load; the loop water already circulating in a common primary loop is credited against it (0.0408 x d^2 x L gal/ft). The credit is valid only for water fully coupled to the buffer, not a decoupled secondary. The 500 factor is for water (adjust for glycol). The equipment minimum-cycle data and the manufacturer govern - a sizing aid, not the manufacturer's data.",
  };
}
export const bufferTankLoopCreditExample = { inputs: { min_on_time_min: 10, source_min_btu: 60000, zone_min_load_btu: 0, delta_t_f: 20, pipe_id_in: 1.5, loop_length_ft: 200 } };
function _v623renderBufferTankLoopCredit(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A sizing aid, not the manufacturer's data; the equipment minimum-cycle data and the manufacturer govern. Citation: ASHRAE / Idronics (Caleffi) anti-short-cycle buffer-tank practice, by name. V_gross = on_time x (source_min - zone_load) / (500 x delta_T); loop_gal = 0.0408 x d^2 x L; V_net = max(0, V_gross - loop_gal). The loop credit is valid only for water fully coupled to the buffer (a common primary loop); the 500 factor is for water (adjust for glycol); existing distribution-piping water may cover part or all of the requirement.";
  const t = makeNumber("Minimum on-time (min)", "btlc-t", { step: "any", min: "0", value: "10" }); t.input.value = "10";
  const qMin = makeNumber("Source minimum output (Btu/hr)", "btlc-qmin", { step: "any", min: "0", value: "60000" }); qMin.input.value = "60000";
  const qLoad = makeNumber("Minimum simultaneous zone load (Btu/hr, 0 = worst case)", "btlc-qload", { step: "any", min: "0", value: "0" }); qLoad.input.value = "0";
  const dt = makeNumber("Allowable temperature swing (degF)", "btlc-dt", { step: "any", min: "0", value: "20" }); dt.input.value = "20";
  const d = makeNumber("Loop internal diameter (in)", "btlc-d", { step: "any", min: "0", value: "1.5" }); d.input.value = "1.5";
  const L = makeNumber("Loop developed length (ft)", "btlc-l", { step: "any", min: "0", value: "200" }); L.input.value = "200";
  for (const f of [t, qMin, qLoad, dt, d, L]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { t.input.value = "10"; qMin.input.value = "60000"; qLoad.input.value = "0"; dt.input.value = "20"; d.input.value = "1.5"; L.input.value = "200"; update(); });
  const oGross = makeOutputLine(outputRegion, "Gross buffer required", "btlc-out-gross");
  const oLoop = makeOutputLine(outputRegion, "Loop water credit", "btlc-out-loop");
  const oNet = makeOutputLine(outputRegion, "Net tank to add", "btlc-out-net");
  const oNote = makeOutputLine(outputRegion, "Note", "btlc-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeBufferTankLoopCredit({ min_on_time_min: readNum(t.input), source_min_btu: readNum(qMin.input), zone_min_load_btu: readNum(qLoad.input), delta_t_f: readNum(dt.input), pipe_id_in: readNum(d.input), loop_length_ft: readNum(L.input) });
    if (r.error) { oGross.textContent = r.error; oLoop.textContent = ""; oNet.textContent = ""; oNote.textContent = ""; return; }
    oGross.textContent = r.no_buffer ? "0 gal - no buffer required" : fmt(r.gross_buffer_gal, 1) + " gal";
    oLoop.textContent = fmt(r.loop_volume_gal, 1) + " gal";
    oNet.textContent = r.no_buffer ? "0 gal" : (fmt(r.net_tank_gal, 1) + " gal" + (r.loop_covers ? " - loop water covers it (no tank)" : ""));
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [t, qMin, qLoad, dt, d, L]) f.input.addEventListener("input", update);
}
HVACSYSTEMS_RENDERERS["buffer-tank-loop-credit"] = _v623renderBufferTankLoopCredit;
