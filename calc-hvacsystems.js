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

// Compact renderer factory, copied verbatim from calc-arborist.js (same
// ui-fields imports) per the new-module convention; only the inner render
// function's name differs, so the schema-coverage gates read it unchanged.
function _simpleRenderer(spec) {
  const _hsRender = function (inputRegion, outputRegion, citationEl) {
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

  _hsRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _hsRender;
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

// dims: in { args: dimensionless } out: { delta_T_F: T, q_btu_hr: dimensionless, tons: M, required_gpm: L^3 T^-1 }
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
  const gpm = makeNumber("Chilled-water flow (GPM)", "ct3-gpm", { step: "any", min: "0" });
  const ewt = makeNumber("Entering water temp (°F)", "ct3-ewt", { step: "any" });
  const lwt = makeNumber("Leaving water temp (°F)", "ct3-lwt", { step: "any" });
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
  const thi = makeNumber("Hot inlet (°F)", "hx-thi", { step: "any" });
  const tho = makeNumber("Hot outlet (°F)", "hx-tho", { step: "any" });
  const tci = makeNumber("Cold inlet (°F)", "hx-tci", { step: "any" });
  const tco = makeNumber("Cold outlet (°F)", "hx-tco", { step: "any" });
  const hg = makeNumber("Hot flow (GPM)", "hx-hg", { step: "any", min: "0" });
  const cg = makeNumber("Cold flow (GPM)", "hx-cg", { step: "any", min: "0" });
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

// dims: in { volume_ft3: L^3, supply_cfm: L^3 T^-1, return_cfm: L^3 T^-1, occupancy: dimensionless } out: { ach: T^-1, net_ach: T^-1, pressurization_cfm: L^3 T^-1 }
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
  const vol = makeNumber("Room volume (ft³)", "ach-vol", { step: "any", min: "0" });
  const supply = makeNumber("Supply CFM", "ach-supply", { step: "any", min: "0" });
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

// dims: in { boiler_btu_hr: M L^2 T^-3, delta_T_F: T, material: dimensionless, max_velocity_fps: L T^-1, length_ft: L } out: { gpm: L^3 T^-1, velocity_fps: L T^-1, friction_ft_per_100ft: dimensionless, head_ft: L }
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
  const dt = makeNumber("Supply-return delta-T (°F)", "bp6-dt", { step: "any", min: "0", value: "20" });
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
  const lf = makeNumber("Load fraction (% of design)", "cc8-lf", { step: "any", min: "0", max: "100" });
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
  const cfm = makeNumber("Supply airflow (CFM)", "hc10-cfm", { step: "any", min: "0" });
  const db = makeNumber("Supply dry-bulb (°F)", "hc10-db", { step: "any" });
  const rin = makeNumber("Entering RH (%)", "hc10-rin", { step: "any", min: "0", max: "100" });
  const rtg = makeNumber("Target RH (%)", "hc10-rtg", { step: "any", min: "0", max: "100" });
  const alt = makeNumber("Altitude (ft)", "hc10-alt", { step: "any" });
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
  const area = makeNumber("Face area (ft²)", "fp7-area", { step: "any", min: "0" });
  const vel = makeNumber("Face velocity (fpm)", "fp7-vel", { step: "any", min: "0" });
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
  const area = makeNumber("Glazing area (ft²)", "wsh-area", { step: "any", min: "0" });
  const shgc = makeNumber("SHGC (NFRC label, 0-1)", "wsh-shgc", { step: "any", min: "0" });
  const psf = makeNumber("Peak solar factor (Btu/h/ft²)", "wsh-psf", { step: "any", min: "0" });
  const u = makeNumber("U-factor (Btu/h/ft²/F)", "wsh-u", { step: "any", min: "0" });
  const cltd = makeNumber("Glass CLTD (°F)", "wsh-cltd", { step: "any" });
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

// dims: in { projection_in: L, gap_in: L, glass_height_in: L, solar_altitude_deg: dimensionless, surface_solar_azimuth_deg: dimensionless } out: { profile_angle_deg: dimensionless, shade_line_in: L, shaded_height_in: L, sunlit_height_in: L, sunlit_fraction: dimensionless }
export function computeWindowOverhangShade({ projection_in = 0, gap_in = 0, glass_height_in = 0, solar_altitude_deg = 0, surface_solar_azimuth_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(projection_in >= 0)) return { error: "Overhang projection cannot be negative (in)." };
  if (!(gap_in >= 0)) return { error: "Gap from the overhang to the glass top cannot be negative (in)." };
  if (!(glass_height_in > 0)) return { error: "Glass height must be positive (in)." };
  if (!(solar_altitude_deg >= -90 && solar_altitude_deg <= 90)) return { error: "Solar altitude must be -90 to 90 degrees." };
  if (!(surface_solar_azimuth_deg >= -180 && surface_solar_azimuth_deg <= 180)) return { error: "Surface-solar azimuth must be -180 to 180 degrees." };
  const DEG = Math.PI / 180;
  // No direct beam when the sun is below the horizon or behind the wall plane.
  const direct_sun = solar_altitude_deg > 0 && Math.abs(surface_solar_azimuth_deg) < 90;
  if (!direct_sun) {
    return {
      direct_sun: false, profile_angle_deg: null, shade_line_in: null,
      shaded_height_in: glass_height_in, sunlit_height_in: 0, sunlit_fraction: 0,
      note: "No direct beam reaches this glazing: the sun is below the horizon or behind the wall plane (surface-solar azimuth at or past 90 degrees). The direct-beam sunlit fraction is 0. Diffuse sky and ground-reflected radiation still strike the glass, so the total solar gain is NOT zero -- see the scope note on the sunlit-fraction output.",
    };
  }
  // Profile (vertical shadow) angle: with the wall normal as x, the sun vector is
  // (cos a cos g, cos a sin g, sin a); projecting onto the vertical plane normal
  // to the wall gives tan(profile) = tan(altitude) / cos(surface-solar azimuth).
  const profile_rad = Math.atan(Math.tan(solar_altitude_deg * DEG) / Math.cos(surface_solar_azimuth_deg * DEG));
  const profile_angle_deg = profile_rad / DEG;
  // The overhang casts its shade line this far down the wall from its underside.
  const shade_line_in = projection_in * Math.tan(profile_rad);
  const shaded_height_in = Math.min(Math.max(shade_line_in - gap_in, 0), glass_height_in);
  const sunlit_height_in = glass_height_in - shaded_height_in;
  const sunlit_fraction = sunlit_height_in / glass_height_in;
  const fully_shaded = shaded_height_in >= glass_height_in;
  const fully_sunlit = shaded_height_in <= 0;
  return {
    direct_sun: true, profile_angle_deg, shade_line_in, shaded_height_in,
    sunlit_height_in, sunlit_fraction, fully_shaded, fully_sunlit,
    note: "Overhang shading of vertical glazing by the profile-angle (shade-line) method. The profile angle is the sun's altitude projected into the vertical plane perpendicular to the wall, tan(profile) = tan(altitude) / cos(surface-solar azimuth), where the surface-solar azimuth is the horizontal angle between the sun and the wall's outward normal (0 means the sun is straight on). The overhang throws its shade line projection x tan(profile) down the wall, and whatever of that falls past the gap onto the glass is shaded. This is the geometry that makes a fixed overhang work seasonally: a 24 in overhang 6 in above a 48 in window fully shades it at a 70 degree summer altitude but leaves 84% of it sunlit at a 30 degree winter altitude, with no moving parts. At normal incidence the profile angle equals the solar altitude. SCOPE: this is the DIRECT-BEAM sunlit fraction. Shaded glazing still receives diffuse sky and ground-reflected radiation, so multiplying a total solar gain by this fraction OVERSTATES the reduction -- apply it to the beam component and keep the diffuse term. Also assumes an overhang wide enough that side (end) effects do not matter, no side fins, and an unobstructed sun; get the altitude and azimuth from the solar-times tile or an ASHRAE table for the date, hour, and latitude.",
  };
}
export const windowOverhangShadeExample = { inputs: { projection_in: 24, gap_in: 6, glass_height_in: 48, solar_altitude_deg: 70, surface_solar_azimuth_deg: 0 } };

function _v1012renderWindowOverhangShade(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASHRAE Handbook-Fundamentals (Fenestration) / ACCA Manual J overhang shading by the profile-angle (shade-line) method: tan(profile angle) = tan(solar altitude) / cos(surface-solar azimuth), shade line = projection x tan(profile angle), by name. The profile-angle geometry is computed from the entered sun position rather than read from a tabulated shade-line-factor chart. Reports the DIRECT-BEAM sunlit fraction; diffuse sky and ground-reflected radiation still reach shaded glass. Overhang assumed wide enough to ignore end effects; no side fins. A design aid, not a Manual J.";
  attachExampleButton(inputRegion, () => { p.input.value = "24"; g.input.value = "6"; h.input.value = "48"; a.input.value = "70"; z.input.value = "0"; update(); });
  const p = makeNumber("Overhang projection (in)", "wos-p", { step: "any", min: "0" });
  const g = makeNumber("Gap, overhang to glass top (in)", "wos-g", { step: "any", min: "0" });
  const h = makeNumber("Glass height (in)", "wos-h", { step: "any", min: "0" });
  const a = makeNumber("Solar altitude (deg)", "wos-a", { step: "any" });
  const z = makeNumber("Surface-solar azimuth (deg, 0 = sun straight on)", "wos-z", { step: "any" });
  for (const f of [p, g, h, a, z]) inputRegion.appendChild(f.wrap);
  const oPa = makeOutputLine(outputRegion, "Profile angle", "wos-out-pa");
  const oSl = makeOutputLine(outputRegion, "Shade line below overhang", "wos-out-sl");
  const oSh = makeOutputLine(outputRegion, "Glass shaded", "wos-out-sh");
  const oFr = makeOutputLine(outputRegion, "Direct-beam sunlit fraction", "wos-out-fr");
  const oNote = makeOutputLine(outputRegion, "Note", "wos-out-n");
  const update = debounce(() => {
    const r = computeWindowOverhangShade({
      projection_in: Number(p.input.value) || 0,
      gap_in: Number(g.input.value) || 0,
      glass_height_in: Number(h.input.value) || 0,
      solar_altitude_deg: Number(a.input.value) || 0,
      surface_solar_azimuth_deg: Number(z.input.value) || 0,
    });
    if (r.error) {
      oPa.textContent = r.error;
      for (const o of [oSl, oSh, oFr, oNote]) o.textContent = "-";
      return;
    }
    oPa.textContent = r.direct_sun ? fmt(r.profile_angle_deg, 2) + " deg" : "- (no direct sun on this wall)";
    oSl.textContent = r.direct_sun ? fmt(r.shade_line_in, 2) + " in" : "-";
    oSh.textContent = fmt(r.shaded_height_in, 2) + " in of " + fmt(r.shaded_height_in + r.sunlit_height_in, 2) + " in"
      + (r.fully_shaded ? " (fully shaded)" : (r.fully_sunlit ? " (fully sunlit)" : ""));
    oFr.textContent = fmt(r.sunlit_fraction * 100, 1) + "% sunlit (beam only; diffuse still reaches the glass)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [p, g, h, a, z]) f.input.addEventListener("input", update);
}
HVACSYSTEMS_RENDERERS["window-overhang-shade"] = _v1012renderWindowOverhangShade;

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
  const occ = makeNumber("Occupants", "ihg-occ", { step: "any", min: "0" });
  const sens = makeNumber("Sensible per person (Btu/h)", "ihg-sens", { step: "any", min: "0" });
  const lat = makeNumber("Latent per person (Btu/h)", "ihg-lat", { step: "any", min: "0" });
  const light = makeNumber("Lighting power (W)", "ihg-light", { step: "any", min: "0" });
  const equip = makeNumber("Equipment power (W)", "ihg-equip", { step: "any", min: "0" });
  const use = makeNumber("Use factor (0-1)", "ihg-use", { step: "any", min: "0" });
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
  const area = makeNumber("Opaque surface area (ft²)", "ecl-area", { step: "any", min: "0" });
  const u = makeNumber("Assembly U-factor (Btu/h/ft²/F)", "ecl-u", { step: "any", min: "0" });
  const cltd = makeNumber("Sol-air CLTD (°F)", "ecl-cltd", { step: "any" });
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
  const cfm = makeNumber("Airflow (cfm)", "cfv-cfm", { step: "any", min: "0" });
  const w = makeNumber("Coil face width (in)", "cfv-w", { step: "any", min: "0" });
  const h = makeNumber("Coil face height (in)", "cfv-h", { step: "any", min: "0" });
  const thr = makeNumber("Carryover threshold (fpm, default 500)", "cfv-thr", { step: "any", min: "0" });
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
  const cfm = makeNumber("Airflow (cfm)", "cfa-cfm", { step: "any", min: "0" });
  const v = makeNumber("Target face velocity (fpm, default 500)", "cfa-v", { step: "any", min: "0" });
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
  const load = makeNumber("Zone sensible load (Btu/hr)", "vav-load", { step: "any", min: "0" });
  const dt = makeNumber("Supply-to-room deltaT (°F)", "vav-dt", { step: "any", min: "0" });
  const vent = makeNumber("Ventilation minimum (cfm, ASHRAE 62.1)", "vav-vent", { step: "any", min: "0" });
  const td = makeNumber("Turndown fraction (default 0.30)", "vav-td", { step: "any", min: "0", max: "1" });
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
  const t = makeNumber("Minimum on-time (min)", "hbt-t", { step: "any", min: "0" });
  const qMin = makeNumber("Source minimum output (Btu/hr)", "hbt-qmin", { step: "any", min: "0" });
  const qLoad = makeNumber("Minimum simultaneous zone load (Btu/hr, 0 = worst case)", "hbt-qload", { step: "any", min: "0" });
  const dt = makeNumber("Allowable temperature swing (°F)", "hbt-dt", { step: "any", min: "0" });
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
  const t = makeNumber("Minimum on-time (min)", "btlc-t", { step: "any", min: "0" });
  const qMin = makeNumber("Source minimum output (Btu/hr)", "btlc-qmin", { step: "any", min: "0" });
  const qLoad = makeNumber("Minimum simultaneous zone load (Btu/hr, 0 = worst case)", "btlc-qload", { step: "any", min: "0" });
  const dt = makeNumber("Allowable temperature swing (°F)", "btlc-dt", { step: "any", min: "0" });
  const d = makeNumber("Loop internal diameter (in)", "btlc-d", { step: "any", min: "0" });
  const L = makeNumber("Loop developed length (ft)", "btlc-l", { step: "any", min: "0" });
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

// ===================== spec-v915: hydronic outdoor reset ratio and supply target =====================
// dims: in { args: dimensionless } out: { reset_ratio: dimensionless, supply_target_f: T, clamped: dimensionless }
export function computeOutdoorResetRatio({ supply_design_f = 180, supply_min_f = 80, oa_design_f = 0, oa_noheat_f = 65, oa_current_f = 30 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(supply_design_f > supply_min_f)) return { error: "Design supply temperature must be above the minimum supply." };
  if (!(oa_noheat_f > oa_design_f)) return { error: "No-heat outdoor temperature must be above the design outdoor temperature." };
  // Reset ratio = supply rise per degree of outdoor drop, over the design span.
  const reset_ratio = (supply_design_f - supply_min_f) / (oa_noheat_f - oa_design_f);
  const raw_target = supply_min_f + reset_ratio * (oa_noheat_f - oa_current_f);
  // Clamp the curve to the min/max supply the boiler runs (flat below design OA, off above no-heat OA).
  const supply_target_f = Math.min(supply_design_f, Math.max(supply_min_f, raw_target));
  const clamped = supply_target_f !== raw_target;
  if (![reset_ratio, supply_target_f].every(Number.isFinite)) return { error: "Reset-curve math is not a finite value." };
  return {
    reset_ratio,
    supply_target_f,
    clamped,
    note: "Outdoor reset lowers the boiler supply temperature as it warms, saving fuel and improving comfort. The reset ratio is the supply rise per degree of outdoor drop, (design supply - min supply) / (no-heat OA - design OA); the target at any outdoor temperature is min supply + ratio x (no-heat OA - current OA), clamped between the min and design supply (flat below the design OA, heat off above the no-heat OA). A steeper ratio suits high-temp fin-tube; radiant floors run a shallow ratio off a low design supply. The boiler must protect its return above the condensing/flue limit. The control manual and the building's heat loss govern the final curve.",
  };
}

export const outdoorResetRatioExample = { inputs: { supply_design_f: 180, supply_min_f: 80, oa_design_f: 0, oa_noheat_f: 65, oa_current_f: 30 } };

function _v915renderOutdoorResetRatio(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: outdoor reset curve by name. reset ratio = (design supply - min supply) / (no-heat OA - design OA); supply target = min supply + ratio x (no-heat OA - current OA), clamped to the min/design supply. The control manual and the building heat loss govern.";
  const sd = makeNumber("Design supply temp (F, at design OA)", "orr-sd", { step: "any" });
  const sm = makeNumber("Minimum supply temp (F, at no-heat OA)", "orr-sm", { step: "any" });
  const od = makeNumber("Design outdoor temp (°F)", "orr-od", { step: "any" });
  const on = makeNumber("No-heat outdoor temp (°F)", "orr-on", { step: "any" });
  const oc = makeNumber("Current outdoor temp (°F)", "orr-oc", { step: "any" });
  for (const f of [sd, sm, od, on, oc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sd.input.value = "180"; sm.input.value = "80"; od.input.value = "0"; on.input.value = "65"; oc.input.value = "30"; update(); });
  const oRatio = makeOutputLine(outputRegion, "Reset ratio", "orr-out-r");
  const oTarget = makeOutputLine(outputRegion, "Supply target at current OA", "orr-out-t");
  const update = debounce(() => {
    const r = computeOutdoorResetRatio({
      supply_design_f: sd.input.value === "" ? 180 : Number(sd.input.value), supply_min_f: sm.input.value === "" ? 80 : Number(sm.input.value),
      oa_design_f: od.input.value === "" ? 0 : Number(od.input.value), oa_noheat_f: on.input.value === "" ? 65 : Number(on.input.value),
      oa_current_f: oc.input.value === "" ? 30 : Number(oc.input.value),
    });
    if (r.error) { oRatio.textContent = r.error; oTarget.textContent = "-"; return; }
    oRatio.textContent = fmt(r.reset_ratio, 2) + " F supply per F outdoor";
    oTarget.textContent = fmt(r.supply_target_f, 1) + " F" + (r.clamped ? " (clamped to the min/design supply)" : "");
  }, DEBOUNCE_MS);
  for (const f of [sd, sm, od, on, oc]) f.input.addEventListener("input", update);
}
HVACSYSTEMS_RENDERERS["outdoor-reset-ratio"] = _v915renderOutdoorResetRatio;

// ===================== spec-v956: hydronic injection-mixing loop flow =====================
// dims: in { args: dimensionless } out: { injection_gpm: L^3 T^-1, injection_pct_of_secondary: dimensionless }
export function computeHydronicInjectionMixing({ secondary_gpm = 10, secondary_supply_f = 110, secondary_return_f = 90, primary_supply_f = 180 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(secondary_gpm > 0)) return { error: "Secondary loop flow must be positive (gpm)." };
  if (!(secondary_supply_f > secondary_return_f)) return { error: "Secondary supply must be warmer than the secondary return (positive loop delta-T for heating)." };
  if (!(primary_supply_f > secondary_return_f)) return { error: "Primary supply must be warmer than the secondary return for injection to add heat." };
  // Energy balance: hot injection water carries the secondary loop's load. inj = sec x (Tss - Tsr)/(Tps - Tsr).
  const injection_gpm = secondary_gpm * (secondary_supply_f - secondary_return_f) / (primary_supply_f - secondary_return_f);
  const injection_pct_of_secondary = 100 * injection_gpm / secondary_gpm;
  const reachable = primary_supply_f >= secondary_supply_f;
  if (![injection_gpm, injection_pct_of_secondary].every(Number.isFinite)) return { error: "Injection-mixing math is not a finite value." };
  return {
    injection_gpm,
    injection_pct_of_secondary,
    reachable,
    note: "The injection flow that feeds a lower-temperature secondary (radiant or reset) loop from a hotter primary, by an energy/mass balance: the hot injection water must carry the secondary loop's load, so injection gpm = secondary gpm x (secondary supply - secondary return) / (primary supply - secondary return). A 10 gpm secondary at 110/90 F off a 180 F primary needs only 2.2 gpm of injection (22% of the secondary flow); the balance is the secondary loop's own recirculated water. A cooler primary needs MORE injection to deliver the same heat -- drop the primary to 140 F and the injection climbs to 4.0 gpm. If the primary supply is not warmer than the required secondary supply, the target is unreachable at any injection rate (flagged). This sizes the injection FLOW (and the injection pump/valve Cv follows from it and the primary loop head); the actual control is a variable-speed injection pump or a modulating two-way valve on a differential-pressure-decoupled primary, and the boiler protection, the room-by-room heat loss, and the control strategy govern the design.",
  };
}

export const hydronicInjectionMixingExample = { inputs: { secondary_gpm: 10, secondary_supply_f: 110, secondary_return_f: 90, primary_supply_f: 180 } };

function _v956renderHydronicInjectionMixing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: hydronic injection-mixing loop flow (primary/secondary energy balance), by name. injection gpm = secondary gpm x (secondary supply - secondary return) / (primary supply - secondary return). Sizes the injection flow; a variable-speed injection pump or modulating valve, boiler protection, and the heat loss govern the design.";
  const sg = makeNumber("Secondary loop flow (gpm)", "him-sg", { step: "any", min: "0" });
  const ss = makeNumber("Secondary supply temp (°F)", "him-ss", { step: "any" });
  const sr = makeNumber("Secondary return temp (°F)", "him-sr", { step: "any" });
  const ps = makeNumber("Primary supply temp (°F)", "him-ps", { step: "any" });
  for (const f of [sg, ss, sr, ps]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sg.input.value = "10"; ss.input.value = "110"; sr.input.value = "90"; ps.input.value = "180"; update(); });
  const oI = makeOutputLine(outputRegion, "Injection flow", "him-out-i");
  const oP = makeOutputLine(outputRegion, "Injection (% of secondary)", "him-out-p");
  const update = debounce(() => {
    const r = computeHydronicInjectionMixing({
      secondary_gpm: sg.input.value === "" ? 10 : Number(sg.input.value), secondary_supply_f: ss.input.value === "" ? 110 : Number(ss.input.value),
      secondary_return_f: sr.input.value === "" ? 90 : Number(sr.input.value), primary_supply_f: ps.input.value === "" ? 180 : Number(ps.input.value),
    });
    if (r.error) { oI.textContent = r.error; oP.textContent = "-"; return; }
    oI.textContent = fmt(r.injection_gpm, 2) + " gpm" + (r.reachable ? "" : " (target unreachable: primary cooler than the required supply)");
    oP.textContent = fmt(r.injection_pct_of_secondary, 1) + "% of secondary flow";
  }, DEBOUNCE_MS);
  for (const f of [sg, ss, sr, ps]) f.input.addEventListener("input", update);
}
HVACSYSTEMS_RENDERERS["hydronic-injection-mixing"] = _v956renderHydronicInjectionMixing;

// ===================== spec-v980: control valve authority =====================
// dims: in { valve_pressure_drop_psi: M L^-1 T^-2, controlled_circuit_drop_psi: M L^-1 T^-2, verdict: dimensionless } out: { valve_authority: dimensionless }
export function computeValveAuthority({ valve_pressure_drop_psi = 5, controlled_circuit_drop_psi = 3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(valve_pressure_drop_psi > 0)) return { error: "Valve pressure drop (fully open) must be positive (psi)." };
  if (!(controlled_circuit_drop_psi >= 0)) return { error: "Controlled-circuit pressure drop cannot be negative (psi)." };
  // Authority = valve open drop / total drop across the variable (controlled) branch (valve + coil/piping it modulates).
  const valve_authority = valve_pressure_drop_psi / (valve_pressure_drop_psi + controlled_circuit_drop_psi);
  const verdict = valve_authority >= 0.5 ? "good (>= 0.5): near-linear installed characteristic" : valve_authority >= 0.25 ? "tolerable (0.25-0.5): some distortion" : "poor (< 0.25): distorted control, hunting -- resize the valve";
  if (!Number.isFinite(valve_authority)) return { error: "Valve-authority math is not a finite value." };
  return {
    valve_authority,
    verdict,
    note: "The authority (beta) of a modulating control valve -- how much control it actually has over the flow in its branch. Authority = the valve's pressure drop when fully OPEN divided by the total pressure drop across the VARIABLE (controlled) branch it modulates (the valve plus the coil and variable piping in series with it). A 5 psi valve drop in series with a 3 psi coil is beta = 5/(5+3) = 0.625. Why it matters: a valve's inherent flow characteristic (equal-percentage, linear) is only realized if the valve keeps most of the branch pressure drop. When the valve has LOW authority -- it is oversized so it drops little pressure while a fixed coil or long piping drops most -- opening the valve barely changes the flow near the open end and changes it too fast near the closed end, distorting the installed characteristic into an on/off-like curve that hunts and overshoots. The design target is beta >= 0.5 (an equal-percentage trim then gives a near-linear installed response), 0.25 to 0.5 is tolerable, and below 0.25 the control is poor -- the fix is a SMALLER (lower-Cv) valve so it takes more of the drop, which is why control valves are deliberately undersized relative to line size (sized on Cv and pressure drop, not pipe size). Authority is about controllability, separate from the Cv flow-capacity sizing (valve-flow-coefficient). A design/commissioning check; the design pressures, the valve trim, and the engineer / balancer govern.",
  };
}

export const valveAuthorityExample = { inputs: { valve_pressure_drop_psi: 5, controlled_circuit_drop_psi: 3 } };

function _v980renderValveAuthority(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: control valve authority (beta), by name. authority = valve open pressure drop / total drop across the variable branch (valve + coil/variable piping). Target beta >= 0.5 for a near-linear installed characteristic; below 0.25 is poor (resize the valve smaller). Separate from Cv flow sizing (valve-flow-coefficient). The design pressures, valve trim, and engineer/balancer govern.";
  const vd = makeNumber("Valve pressure drop, fully open (psi)", "va-vd", { step: "any", min: "0" });
  const cd = makeNumber("Coil + variable piping drop (psi)", "va-cd", { step: "any", min: "0" });
  for (const f of [vd, cd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { vd.input.value = "5"; cd.input.value = "3"; update(); });
  const oA = makeOutputLine(outputRegion, "Valve authority (beta)", "va-out-a");
  const update = debounce(() => {
    const r = computeValveAuthority({
      valve_pressure_drop_psi: vd.input.value === "" ? 5 : Number(vd.input.value), controlled_circuit_drop_psi: cd.input.value === "" ? 3 : Number(cd.input.value),
    });
    if (r.error) { oA.textContent = r.error; return; }
    oA.textContent = fmt(r.valve_authority, 3) + " -- " + r.verdict;
  }, DEBOUNCE_MS);
  for (const f of [vd, cd]) f.input.addEventListener("input", update);
}
HVACSYSTEMS_RENDERERS["valve-authority"] = _v980renderValveAuthority;

// spec-v1622..v1631 constants. Leading-underscore names of their own: several
// are HVAC CONVENTIONS rather than definitions, and pinning them to a shared
// catalog name would make one cited relation disagree with another.
//
// Exact by definition: 1 mechanical hp = 550 ft-lbf/s = 745.6998715822702 W.
const _HS_KW_PER_HP = 0.745699872;
// The sensible-heat constant, 1.08 = 0.075 lb/cu ft x 0.24 BTU/lb-degF x 60
// min/h, at sea level and standard air.
const _HS_SENSIBLE_CONST = 1.08;
// The total-heat (enthalpy) constant, 4.5 = 0.075 lb/cu ft x 60 min/h.
const _HS_TOTAL_HEAT_CONST = 4.5;
// The water-side transport constant, 500 = 8.33 lb/gal x 60 min/h x 1.0
// BTU/lb-degF. The catalog's water DENSITY constants are 8.34 and 8.3454;
// this is the customary 500 the relation is written with.
const _HS_WATER_CONST = 500;
// Feet of head per psi for water at ordinary temperature, as the trade writes
// it: 2.31 ft/psi.
const _HS_FT_PER_PSI = 2.31;

// =====================================================================
// spec-v1622..v1631: the HVAC test-and-balance and hydronic systems band.
// =====================================================================
//
// spec-v1622: flow hood reading correction and diffuser airflow.
//
// The spec's own worked example contradicts its conclusion. With a 0.94 factor
// on 16,000 cfm of readings, the CORRECTED total is 15,040 -- so the balancer
// working UNCORRECTED sees a system at design, and it is the correction that
// reveals the shortfall. The spec says the opposite. Nothing here asserts a
// direction: the correction's effect is computed and named from the factor.
// dims: in { hood_reading_cfm: L^3 T^-1, correction_factor: dimensionless, reference_traverse_cfm: L^3 T^-1, design_cfm: L^3 T^-1, system_reading_total_cfm: L^3 T^-1 } out: { corrected_cfm: L^3 T^-1, derived_factor: dimensionless, pct_of_design: dimensionless, uncorrected_pct_of_design: dimensionless, system_corrected_cfm: L^3 T^-1, system_error_cfm: L^3 T^-1 }
export function computeFlowHoodCorrection({
  hood_reading_cfm = 0, correction_factor = 1, reference_traverse_cfm = 0,
  design_cfm = 0, system_reading_total_cfm = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(hood_reading_cfm > 0)) return { error: "The hood reading must be positive (cfm)." };
  if (!(correction_factor > 0)) return { error: "The correction factor must be positive." };
  if (reference_traverse_cfm < 0) return { error: "A reference traverse reading cannot be negative (cfm)." };
  if (design_cfm < 0) return { error: "Design airflow cannot be negative (cfm)." };
  if (system_reading_total_cfm < 0) return { error: "The system reading total cannot be negative (cfm)." };
  // A factor established on the actual system from a traverse comparison beats
  // one taken from a table, so it is derived here when a reference is entered.
  const has_reference = reference_traverse_cfm > 0;
  const derived_factor = has_reference ? reference_traverse_cfm / hood_reading_cfm : 0;
  const factor_used = has_reference ? derived_factor : correction_factor;
  const corrected_cfm = hood_reading_cfm * factor_used;
  // The direction is COMPUTED, not asserted: a factor above one means the hood
  // was reading low, below one means it was reading high.
  const hood_reads_low = factor_used > 1;
  const correction_pct = (factor_used - 1) * 100;
  const direction_verdict = Math.abs(factor_used - 1) < 1e-12
    ? "the factor is 1.00, so the hood reading stands as measured"
    : hood_reads_low
      ? "the factor is above 1, so the hood was reading LOW by " + fmt(Math.abs(correction_pct), 1) + "% and the correction RAISES the reading -- the back pressure a hood adds in series with the diffuser is the usual cause"
      : "the factor is below 1, so the hood was reading HIGH by " + fmt(Math.abs(correction_pct), 1) + "% and the correction LOWERS the reading";
  const has_design = design_cfm > 0;
  const pct_of_design = has_design ? corrected_cfm / design_cfm * 100 : 0;
  const uncorrected_pct_of_design = has_design ? hood_reading_cfm / design_cfm * 100 : 0;
  const design_verdict = !has_design
    ? "(no design airflow entered)"
    : fmt(pct_of_design, 0) + "% of design corrected, against " + fmt(uncorrected_pct_of_design, 0) + "% uncorrected -- a " + fmt(Math.abs(pct_of_design - uncorrected_pct_of_design), 0) + " point difference on the report for this outlet alone";
  // The systematic case. A factor applied across a whole report does not
  // average out, because the error is in one direction on every reading.
  const has_system = system_reading_total_cfm > 0;
  const system_corrected_cfm = has_system ? system_reading_total_cfm * factor_used : 0;
  const system_error_cfm = system_corrected_cfm - system_reading_total_cfm;
  const system_verdict = !has_system
    ? "(no system reading total entered)"
    : "across the whole report, " + fmt(system_reading_total_cfm, 0) + " cfm of readings correct to " + fmt(system_corrected_cfm, 0) + " cfm, a " + fmt(Math.abs(system_error_cfm), 0) + " cfm " + (system_error_cfm > 0 ? "increase" : "reduction") + " -- the error is systematic and in one direction, so it does not average out";
  if (![corrected_cfm, derived_factor, pct_of_design, uncorrected_pct_of_design, system_corrected_cfm, system_error_cfm].every(Number.isFinite)) return { error: "Flow hood correction math is not a finite value." };
  return {
    corrected_cfm, factor_used, has_reference, derived_factor,
    hood_reads_low, correction_pct, direction_verdict,
    has_design, pct_of_design, uncorrected_pct_of_design, design_verdict,
    has_system, system_corrected_cfm, system_error_cfm, system_verdict,
    note: "The airflow a balancing hood reading actually represents, once its correction factor is applied. A hood is a resistance in series with the diffuser, and adding resistance to a system reduces the flow through it -- so a hood commonly reads LOW, and how much depends on how much authority the diffuser had to begin with. On a stiff system with plenty of pressure available the effect is small; on a soft one, a long flex run, a nearly closed damper, or a fan riding a flat part of its curve, it can be large. The correction factor is therefore not a property of the hood alone, which is why entering a reference traverse reading here DERIVES the factor from the system in front of you rather than taking one from a table. That is the better practice: traverse three or four representative branches, compare against the sum of the hood readings on their outlets, and apply the ratio to the rest. One exercise calibrates the whole report. The direction of the correction is computed rather than assumed, because it can run either way: a factor above one means the hood was reading low and the correction raises the number, below one means the reverse. What matters more than the direction is that the error is SYSTEMATIC -- it is the same sign on every reading -- so it does not average out across a report, and an uncorrected total misstates the whole system by the same proportion it misstates one outlet. The placement failures are simpler and larger than any correction factor: a hood that does not seal to the ceiling leaks and reads low, and one used on a linear slot or a perforated face without the right adapter has an unrepresentative velocity profile across its sensor grid. Both are worth checking before any factor is applied, and neither is captured here. This does not measure anything, select a hood or adapter, or model the back pressure from the hood's own resistance and the diffuser's pressure-flow curve. A duct traverse is the reference measurement, the hood manufacturer's data and AABC or NEBB procedure govern, and the balancer's own judgment decides when a reading is not usable at all.",
  };
}
export const flowHoodCorrectionExample = { inputs: { hood_reading_cfm: 420, correction_factor: 0.94, reference_traverse_cfm: 0, design_cfm: 400, system_reading_total_cfm: 16000 } };
HVACSYSTEMS_RENDERERS["flow-hood-correction"] = _simpleRenderer({
  citation: "Citation: the balancing-hood correction as AABC and NEBB field practice states it -- corrected flow = reading x correction factor, with the factor best established on the actual system by comparing hood readings against a duct traverse rather than taken from a table. A hood is a resistance in series with the diffuser, so it commonly reads low, and the magnitude depends on the diffuser's available pressure. It does not model the back pressure from the hood's own resistance, select a hood or adapter, or capture placement failures (an unsealed hood, or a linear slot without the right adapter). A duct traverse is the reference measurement; the hood manufacturer's data and the balancing procedure in force govern.",
  example: flowHoodCorrectionExample.inputs,
  fields: [
    { key: "hood_reading_cfm", label: "Hood reading (cfm)", kind: "number" },
    { key: "correction_factor", label: "Correction factor", kind: "number", default: 1 },
    { key: "reference_traverse_cfm", label: "Reference traverse on the same outlet (cfm, 0 to use the factor)", kind: "number" },
    { key: "design_cfm", label: "Design airflow (cfm, 0 to skip)", kind: "number" },
    { key: "system_reading_total_cfm", label: "Total of all hood readings on the report (cfm, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "c", id: "fhc-out-c", label: "Corrected airflow", value: (r) => fmt(r.corrected_cfm, 0) + " cfm at a factor of " + fmt(r.factor_used, 3) + (r.has_reference ? ", derived from the reference traverse" : "") },
    { key: "d", id: "fhc-out-d", label: "Which way it corrects", value: (r) => r.direction_verdict },
    { key: "g", id: "fhc-out-g", label: "Against design", value: (r) => r.design_verdict },
    { key: "s", id: "fhc-out-s", label: "Across the report", value: (r) => r.system_verdict },
    { key: "n", id: "fhc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFlowHoodCorrection,
});

// =====================================================================
// spec-v1623: fan system effect and installed performance.
// =====================================================================
//
// A fan's rated curve is measured with ideal inlet and outlet conditions, and
// a real installation rarely provides them. The straight-duct requirement is
// the AMCA effective duct length: about 2.5 equivalent diameters at 2,500 fpm,
// plus one more per additional 1,000 fpm.
// dims: in { flow_cfm: L^3 T^-1, outlet_width_in: L, outlet_height_in: L, straight_duct_ft: L, fan_curve_tp_inwg: M L^-1 T^-2, measured_tp_inwg: M L^-1 T^-2 } out: { outlet_area_ft2: L^2, outlet_velocity_fpm: L T^-1, equivalent_diameter_ft: L, effective_length_ft: L, length_shortfall_ft: L, pressure_shortfall_inwg: M L^-1 T^-2 }
export function computeFanSystemEffect({
  flow_cfm = 0, outlet_width_in = 0, outlet_height_in = 0, straight_duct_ft = 0,
  inlet_condition = "clear", fan_curve_tp_inwg = 0, measured_tp_inwg = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(flow_cfm > 0)) return { error: "Fan airflow must be positive (cfm)." };
  if (!(outlet_width_in > 0)) return { error: "Outlet width must be positive (in)." };
  if (!(outlet_height_in > 0)) return { error: "Outlet height must be positive (in)." };
  if (straight_duct_ft < 0) return { error: "Straight duct length cannot be negative (ft)." };
  if (fan_curve_tp_inwg < 0 || measured_tp_inwg < 0) return { error: "Pressures cannot be negative (in wg)." };
  const outlet_area_ft2 = outlet_width_in * outlet_height_in / 144;
  const outlet_velocity_fpm = flow_cfm / outlet_area_ft2;
  // The equivalent round diameter of the outlet, which is what the effective
  // duct length is counted in.
  const equivalent_diameter_ft = Math.sqrt(4 * outlet_area_ft2 / Math.PI);
  // AMCA's effective duct length: 2.5 diameters at 2,500 fpm and below, plus
  // one diameter for each additional 1,000 fpm.
  const diameters_required = outlet_velocity_fpm <= 2500
    ? 2.5
    : 2.5 + (outlet_velocity_fpm - 2500) / 1000;
  const effective_length_ft = diameters_required * equivalent_diameter_ft;
  const length_shortfall_ft = effective_length_ft - straight_duct_ft;
  const length_adequate = straight_duct_ft >= effective_length_ft;
  const length_fraction = effective_length_ft > 0 ? straight_duct_ft / effective_length_ft : 0;
  const outlet_verdict = length_adequate
    ? "the " + fmt(straight_duct_ft, 1) + " ft of straight duct meets the " + fmt(effective_length_ft, 1) + " ft effective length at this velocity, so no outlet system effect applies"
    : "only " + fmt(straight_duct_ft, 1) + " ft of straight duct against the " + fmt(effective_length_ft, 1) + " ft needed (" + fmt(length_fraction * 100, 0) + "% of it) -- an OUTLET system effect applies, because the blast area has not expanded to the full duct and the static regain does not occur";
  // The inlet case, which is worse and more common. The factor is a named
  // condition rather than a number, because AMCA's tables depend on the
  // geometry in ways a single coefficient cannot carry.
  const inlet_is_swirl = inlet_condition === "elbow_with_swirl";
  const inlet_is_elbow = inlet_condition === "elbow_against_swirl" || inlet_is_swirl;
  const inlet_verdict = inlet_condition === "clear"
    ? "the inlet is clear, so no inlet system effect is claimed here"
    : inlet_is_swirl
      ? "an inlet elbow spinning the air WITH the wheel rotation is the WORST case: the wheel does less work on air already moving with it, and this loss is invisible in any measurement taken downstream of the fan"
      : "an inlet elbow close to the fan delivers air unevenly across the wheel; the penalty depends on the clearance and the elbow geometry, and it is invisible downstream of the fan";
  // The diagnostic: measured static above the curve at design flow is the
  // signature. Speeding the fan up raises the loss with the flow.
  const has_pressures = fan_curve_tp_inwg > 0 && measured_tp_inwg > 0;
  const pressure_shortfall_inwg = has_pressures ? measured_tp_inwg - fan_curve_tp_inwg : 0;
  const measured_exceeds_curve = has_pressures && pressure_shortfall_inwg > 0;
  const diagnostic_verdict = !has_pressures
    ? "(no fan curve and measured pressures entered)"
    : measured_exceeds_curve
      ? "the measured total pressure is " + fmt(pressure_shortfall_inwg, 3) + " in wg ABOVE the curve at this flow, which is the system effect signature -- speeding the fan up raises the flow AND the loss with it, so the fix is a duct modification rather than more rpm"
      : "the measured total pressure is at or below the curve at this flow, so a system effect is not the explanation for a shortfall here";
  if (![outlet_area_ft2, outlet_velocity_fpm, equivalent_diameter_ft, effective_length_ft, length_shortfall_ft, pressure_shortfall_inwg].every(Number.isFinite)) return { error: "Fan system effect math is not a finite value." };
  return {
    outlet_area_ft2, outlet_velocity_fpm, equivalent_diameter_ft,
    diameters_required, effective_length_ft, length_shortfall_ft, length_adequate, length_fraction, outlet_verdict,
    inlet_is_elbow, inlet_is_swirl, inlet_verdict,
    has_pressures, pressure_shortfall_inwg, measured_exceeds_curve, diagnostic_verdict,
    note: "Whether a fan installation gives the fan the inlet and outlet conditions its rated curve assumes, and what it costs when it does not. System effect exists because a catalogue curve is measured with ideal approach and discharge, and a real installation rarely provides them. The outlet case is about recovery: air leaves a centrifugal fan through a small blast area at high velocity and needs straight duct to expand and convert that velocity into static pressure. AMCA's effective duct length is about two and a half equivalent diameters at 2,500 fpm, plus one more diameter per additional 1,000 fpm; cut that short with an elbow or a transition and the recovery does not happen, so the fan delivers less static than its curve says at the same flow. The inlet case is worse and more common. An elbow directly at the inlet delivers air unevenly across the wheel, and an elbow that pre-spins the air in the DIRECTION OF ROTATION reduces the pressure the fan can develop, because the wheel is doing less work on air that is already moving with it. That loss is invisible in any measurement taken downstream of the fan, which is why it goes unfound. The reason this belongs in a balancer's hands rather than only a designer's is diagnostic. A fan running at design speed, drawing design amps, short on flow, and showing MORE static pressure than the design calculated is very often a system effect problem -- and no amount of speeding it up fixes the underlying loss, it just spends more energy on it. Speeding the fan up raises the flow and raises the loss with it. Identifying it points at a duct modification, a turning vane, or a different elbow orientation, which is the actual fix and usually the cheaper one. This computes the effective duct length and reports whether the installation meets it; it does NOT compute the system effect pressure penalty itself, because AMCA's factors depend on the specific geometry, the blast area ratio and the elbow orientation in ways no single coefficient carries. AMCA Publication 201, the fan manufacturer's rated curve, and the balancing agency's own measurements govern.",
  };
}
export const fanSystemEffectExample = { inputs: { flow_cfm: 12000, outlet_width_in: 30, outlet_height_in: 24, straight_duct_ft: 3.0, inlet_condition: "elbow_with_swirl", fan_curve_tp_inwg: 2.5, measured_tp_inwg: 2.9 } };
HVACSYSTEMS_RENDERERS["fan-system-effect"] = _simpleRenderer({
  citation: "Citation: AMCA Publication 201 (Fans and Systems) by name -- the effective duct length of about 2.5 equivalent outlet diameters at 2,500 fpm plus one diameter per additional 1,000 fpm, below which an outlet system effect applies, and the inlet conditions (an elbow close to the inlet, worst when it spins the air WITH the wheel rotation) that reduce the pressure the fan can develop. It reports whether the installation meets the effective length; it does NOT compute the system effect pressure penalty, because AMCA's factors depend on the specific geometry, blast area ratio and elbow orientation. The fan manufacturer's rated curve and the balancing agency's measurements govern.",
  example: fanSystemEffectExample.inputs,
  fields: [
    { key: "flow_cfm", label: "Fan airflow (cfm)", kind: "number" },
    { key: "outlet_width_in", label: "Fan outlet width (in)", kind: "number" },
    { key: "outlet_height_in", label: "Fan outlet height (in)", kind: "number" },
    { key: "straight_duct_ft", label: "Straight duct at the discharge (ft)", kind: "number" },
    { key: "inlet_condition", label: "Inlet condition", kind: "select", default: "clear", options: [{ value: "clear", label: "Clear inlet (no elbow close by)" }, { value: "elbow_against_swirl", label: "Elbow at the inlet, against the rotation" }, { value: "elbow_with_swirl", label: "Elbow at the inlet, spinning WITH the rotation (worst)" }] },
    { key: "fan_curve_tp_inwg", label: "Fan curve total pressure at this flow (in wg, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "measured_tp_inwg", label: "Measured total pressure (in wg)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "v", id: "fse-out-v", label: "Outlet velocity", value: (r) => fmt(r.outlet_velocity_fpm, 0) + " fpm through " + fmt(r.outlet_area_ft2, 2) + " sq ft" },
    { key: "e", id: "fse-out-e", label: "Effective duct length needed", value: (r) => fmt(r.effective_length_ft, 1) + " ft (" + fmt(r.diameters_required, 2) + " x the " + fmt(r.equivalent_diameter_ft, 2) + " ft equivalent diameter)" },
    { key: "o", id: "fse-out-o", label: "At the outlet", value: (r) => r.outlet_verdict },
    { key: "i", id: "fse-out-i", label: "At the inlet", value: (r) => r.inlet_verdict },
    { key: "d", id: "fse-out-d", label: "Diagnostic", value: (r) => r.diagnostic_verdict },
    { key: "n", id: "fse-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFanSystemEffect,
});

// =====================================================================
// spec-v1624: proportional balancing ratio method.
// =====================================================================
//
// Air systems are COUPLED: closing a damper at one outlet raises the pressure
// available to every other outlet on the branch. Proportional balancing
// exploits the coupling instead of fighting it -- equalize ratios first, which
// is a stable target, then set the whole branch with one damper.
//
// The reference is the LOWEST ratio and it is left wide open, because it has
// the least pressure available; throttling to match a HIGH outlet would mean
// opening the low one beyond fully open, which is not available. Helper above
// the exports so the v14 lint reads the annotation, returning an expression
// rather than a bare identifier.
const _hsRatio = (measured, design) => (design > 0 ? measured / design : 0);
// dims: in { design_1_cfm: L^3 T^-1, measured_1_cfm: L^3 T^-1, design_2_cfm: L^3 T^-1, measured_2_cfm: L^3 T^-1, design_3_cfm: L^3 T^-1, measured_3_cfm: L^3 T^-1, design_4_cfm: L^3 T^-1, measured_4_cfm: L^3 T^-1, design_5_cfm: L^3 T^-1, measured_5_cfm: L^3 T^-1, design_6_cfm: L^3 T^-1, measured_6_cfm: L^3 T^-1 } out: { reference_ratio: dimensionless, branch_design_cfm: L^3 T^-1, branch_measured_cfm: L^3 T^-1, branch_after_equalizing_cfm: L^3 T^-1, branch_adjustment_factor: dimensionless }
export function computeProportionalBalanceRatio({
  design_1_cfm = 0, measured_1_cfm = 0, design_2_cfm = 0, measured_2_cfm = 0,
  design_3_cfm = 0, measured_3_cfm = 0, design_4_cfm = 0, measured_4_cfm = 0,
  design_5_cfm = 0, measured_5_cfm = 0, design_6_cfm = 0, measured_6_cfm = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const pairs = [
    ["A", design_1_cfm, measured_1_cfm], ["B", design_2_cfm, measured_2_cfm],
    ["C", design_3_cfm, measured_3_cfm], ["D", design_4_cfm, measured_4_cfm],
    ["E", design_5_cfm, measured_5_cfm], ["F", design_6_cfm, measured_6_cfm],
  ];
  for (const [label, design, measured] of pairs) {
    if (design < 0 || measured < 0) return { error: "Outlet " + label + ": flows cannot be negative (cfm)." };
    if (design === 0 && measured > 0) return { error: "Outlet " + label + " has a measured flow but no design flow, so it has no ratio." };
  }
  const active = pairs.filter(([, design]) => design > 0);
  if (active.length < 2) return { error: "Enter at least two outlets with a design flow -- proportional balancing is about the relationship between terminals." };
  const rows = active.map(([label, design, measured]) => ({ label, design, measured, ratio: _hsRatio(measured, design) }));
  const branch_design_cfm = rows.reduce((s, r) => s + r.design, 0);
  const branch_measured_cfm = rows.reduce((s, r) => s + r.measured, 0);
  // The reference is the LOWEST ratio and it is left alone.
  let reference = rows[0];
  for (const r of rows) if (r.ratio < reference.ratio) reference = r;
  const reference_ratio = reference.ratio;
  const reference_label = reference.label;
  if (!(reference_ratio > 0)) return { error: "Every outlet needs a positive measured flow before ratios can be equalized." };
  // Target each outlet at the reference ratio; the reference itself does not move.
  const targets = rows.map((r) => ({
    label: r.label, ratio: r.ratio, design: r.design, measured: r.measured,
    target: r.design * reference_ratio,
    is_reference: r.label === reference_label,
    throttle_cfm: r.measured - r.design * reference_ratio,
  }));
  const branch_after_equalizing_cfm = branch_design_cfm * reference_ratio;
  const branch_adjustment_factor = reference_ratio > 0 ? 1 / reference_ratio : 0;
  const ratio_spread = Math.max(...rows.map((r) => r.ratio)) - reference_ratio;
  const already_proportional = ratio_spread < 0.01;
  const rows_text = targets.map((t) => t.label + " " + fmt(t.ratio, 2) + (t.is_reference ? " (REFERENCE, leave wide open)" : " -> " + fmt(t.target, 0) + " cfm")).join("; ");
  const method_verdict = already_proportional
    ? "the outlets are already within a hundredth of each other in ratio, so equalizing has nothing to do -- go straight to the branch damper"
    : "throttle every outlet to the " + fmt(reference_ratio, 2) + " ratio that outlet " + reference_label + " sets, leaving " + reference_label + " wide open; then open the branch damper by a factor of " + fmt(branch_adjustment_factor, 3) + " to bring the whole set to design";
  if (![reference_ratio, branch_design_cfm, branch_measured_cfm, branch_after_equalizing_cfm, branch_adjustment_factor].every(Number.isFinite)) return { error: "Proportional balancing math is not a finite value." };
  return {
    outlet_count: rows.length, rows_text, reference_label, reference_ratio,
    branch_design_cfm, branch_measured_cfm, branch_after_equalizing_cfm,
    branch_adjustment_factor, ratio_spread, already_proportional, method_verdict,
    note: "The proportional balancing method for a branch of air terminals, worked as a set rather than one outlet at a time. Air systems are COUPLED: closing a damper at one outlet raises the pressure available to every other outlet on the branch, so an outlet set exactly to design will not be at design once the next one is adjusted. Balancing outlet by outlet chases that coupling around the branch, sometimes for hours, and often never converges. Proportional balancing exploits the coupling instead of fighting it. If every outlet sits at the same FRACTION of its design, then any change in branch flow scales them all by the same factor and the ratios are preserved. So the balancer equalizes ratios first, which is a stable target, and only then opens the branch damper to bring the whole set to 100 percent. One adjustment at the end sets everything. The reference outlet is the LOWEST ratio and it is left wide open, because it is the one with the least pressure available -- throttling everything to match a HIGH outlet would mean opening the low one beyond fully open, which is not available. That single rule is what makes the method converge, and it is the part that gets done backwards by someone balancing from the first outlet on the drawing. The targets reported here are where each outlet should read once equalized, and the branch adjustment factor is what the branch damper then has to deliver. Measured flows are ENTERED and should be corrected hood readings or traverse values rather than raw ones, because a systematic instrument error shifts every ratio together and moves the reference. This does not model the damper positions, the branch pressure, or the interaction between branches on a common trunk; a system with too little pressure at the reference outlet cannot be balanced by this or any other method, and that is a design or fan problem the method will reveal rather than solve. The AABC or NEBB procedure in force and the balancer's own judgment govern.",
  };
}
export const proportionalBalanceRatioExample = { inputs: { design_1_cfm: 250, measured_1_cfm: 310, design_2_cfm: 300, measured_2_cfm: 285, design_3_cfm: 200, measured_3_cfm: 250, design_4_cfm: 400, measured_4_cfm: 365, design_5_cfm: 250, measured_5_cfm: 300, design_6_cfm: 0, measured_6_cfm: 0 } };
HVACSYSTEMS_RENDERERS["proportional-balance-ratio"] = _simpleRenderer({
  citation: "Citation: the proportional balancing method as AABC and NEBB procedure states it -- compute ratio = measured / design at every terminal, take the LOWEST ratio as the reference and leave it wide open, throttle the others to match it, then set the branch with one damper. Once the ratios are equal a change in branch flow scales every outlet by the same factor, which is what makes the target stable. Measured flows are ENTERED and should be corrected readings. It does not model damper positions, branch pressure, or interaction between branches on a common trunk, and a branch with too little pressure at the reference outlet cannot be balanced by any method. The balancing procedure in force and the balancer's judgment govern.",
  example: proportionalBalanceRatioExample.inputs,
  fields: [
    { key: "design_1_cfm", label: "Outlet A design (cfm)", kind: "number" },
    { key: "measured_1_cfm", label: "Outlet A measured (cfm)", kind: "number" },
    { key: "design_2_cfm", label: "Outlet B design (cfm)", kind: "number" },
    { key: "measured_2_cfm", label: "Outlet B measured (cfm)", kind: "number" },
    { key: "design_3_cfm", label: "Outlet C design (cfm, 0 if unused)", kind: "number" },
    { key: "measured_3_cfm", label: "Outlet C measured (cfm)", kind: "number" },
    { key: "design_4_cfm", label: "Outlet D design (cfm, 0 if unused)", kind: "number" },
    { key: "measured_4_cfm", label: "Outlet D measured (cfm)", kind: "number" },
    { key: "design_5_cfm", label: "Outlet E design (cfm, 0 if unused)", kind: "number" },
    { key: "measured_5_cfm", label: "Outlet E measured (cfm)", kind: "number" },
    { key: "design_6_cfm", label: "Outlet F design (cfm, 0 if unused)", kind: "number" },
    { key: "measured_6_cfm", label: "Outlet F measured (cfm)", kind: "number" },
  ],
  outputs: [
    { key: "r", id: "pbr-out-r", label: "Ratios", value: (r) => r.rows_text },
    { key: "f", id: "pbr-out-f", label: "Reference outlet", value: (r) => "outlet " + r.reference_label + " at " + fmt(r.reference_ratio, 3) + ", the lowest -- leave it wide open" },
    { key: "m", id: "pbr-out-m", label: "Method", value: (r) => r.method_verdict },
    { key: "b", id: "pbr-out-b", label: "Branch", value: (r) => fmt(r.branch_measured_cfm, 0) + " cfm measured against " + fmt(r.branch_design_cfm, 0) + " design; once equalized it reads " + fmt(r.branch_after_equalizing_cfm, 0) + " cfm, and the branch damper then opens by " + fmt(r.branch_adjustment_factor, 3) },
    { key: "n", id: "pbr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeProportionalBalanceRatio,
});

// =====================================================================
// spec-v1625: pump impeller trim for a balanced flow.
// =====================================================================
//
// The trim relations are NOT the same as the speed-change affinity laws they
// resemble. Trimming changes the impeller's geometry relative to its casing
// rather than scaling the whole machine, so the correspondence is approximate
// and the manufacturer's trim curves are the authority.
// dims: in { current_diameter_in: L, current_flow_gpm: L^3 T^-1, required_flow_gpm: L^3 T^-1, current_head_ft: L, required_head_ft: L, max_diameter_in: L, min_trim_fraction: dimensionless, motor_hp: M L^2 T^-3, annual_hours: T, energy_rate_per_kwh: dimensionless } out: { required_diameter_in: L, trim_in: L, trim_pct: dimensionless, head_at_trim_ft: L, power_ratio: dimensionless, annual_kwh_saved: M L^2 T^-2, annual_cost_saved: dimensionless }
export function computePumpImpellerTrim({
  current_diameter_in = 0, current_flow_gpm = 0, required_flow_gpm = 0,
  current_head_ft = 0, required_head_ft = 0, max_diameter_in = 0, min_trim_fraction = 0.75,
  motor_hp = 0, annual_hours = 0, energy_rate_per_kwh = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(current_diameter_in > 0)) return { error: "Current impeller diameter must be positive (in)." };
  if (!(current_flow_gpm > 0)) return { error: "Current flow must be positive (gpm)." };
  if (!(required_flow_gpm > 0)) return { error: "Required flow must be positive (gpm)." };
  if (!(required_flow_gpm <= current_flow_gpm)) return { error: "Required flow must be at or below the current flow -- trimming an impeller cannot increase it." };
  if (current_head_ft < 0 || required_head_ft < 0) return { error: "Heads cannot be negative (ft)." };
  if (max_diameter_in < 0) return { error: "Maximum casing diameter cannot be negative (in)." };
  if (!(min_trim_fraction > 0 && min_trim_fraction <= 1)) return { error: "The minimum trim fraction must be above 0 and at most 1." };
  if (motor_hp < 0 || annual_hours < 0 || energy_rate_per_kwh < 0) return { error: "Motor power, hours, and rate cannot be negative." };
  if (annual_hours > 8784) return { error: "Annual hours cannot exceed 8,784." };
  // Trim affinity: flow with diameter directly, head with the square, power
  // with the cube.
  const diameter_ratio = required_flow_gpm / current_flow_gpm;
  const required_diameter_in = current_diameter_in * diameter_ratio;
  const trim_in = current_diameter_in - required_diameter_in;
  const trim_pct = trim_in / current_diameter_in * 100;
  const head_at_trim_ft = current_head_ft * diameter_ratio * diameter_ratio;
  const power_ratio = diameter_ratio * diameter_ratio * diameter_ratio;
  const power_reduction_pct = (1 - power_ratio) * 100;
  // The practical limit. Below roughly three quarters of the casing's maximum
  // diameter the efficiency falls off and the relations degrade.
  const has_max = max_diameter_in > 0;
  const fraction_of_max = has_max ? required_diameter_in / max_diameter_in : 0;
  const below_practical_limit = has_max && fraction_of_max < min_trim_fraction;
  const limit_verdict = !has_max
    ? "(no maximum casing diameter entered, so the practical trim limit is not checked)"
    : below_practical_limit
      ? "the trimmed diameter is " + fmt(fraction_of_max * 100, 1) + "% of the casing maximum, BELOW the " + fmt(min_trim_fraction * 100, 0) + "% practical limit -- efficiency falls off, the trim relations degrade, and the manufacturer will usually recommend a different pump or a smaller casing instead"
      : "the trimmed diameter is " + fmt(fraction_of_max * 100, 1) + "% of the casing maximum, inside the " + fmt(min_trim_fraction * 100, 0) + "% practical limit";
  // The head check, which is the one that decides whether the trim is usable.
  const has_head_check = current_head_ft > 0 && required_head_ft > 0;
  const head_adequate = has_head_check && head_at_trim_ft >= required_head_ft;
  const head_margin_ft = head_at_trim_ft - required_head_ft;
  const head_verdict = !has_head_check
    ? "(no current and required head entered)"
    : head_adequate
      ? "at the trimmed diameter the pump still makes " + fmt(head_at_trim_ft, 1) + " ft against the " + fmt(required_head_ft, 1) + " ft required, with " + fmt(head_margin_ft, 1) + " ft to spare"
      : "at the trimmed diameter the pump makes only " + fmt(head_at_trim_ft, 1) + " ft against the " + fmt(required_head_ft, 1) + " ft required, " + fmt(-head_margin_ft, 1) + " ft SHORT -- the trim delivers the flow and not the head, so it is not usable as computed";
  // The saving, which is continuous and needs no control action.
  const has_cost = motor_hp > 0 && annual_hours > 0;
  const current_kwh = has_cost ? motor_hp * _HS_KW_PER_HP * annual_hours : 0;
  const trimmed_kwh = current_kwh * power_ratio;
  const annual_kwh_saved = current_kwh - trimmed_kwh;
  const annual_cost_saved = annual_kwh_saved * energy_rate_per_kwh;
  const excess_head_ft = has_head_check ? current_head_ft - required_head_ft : 0;
  const cost_verdict = !has_cost
    ? "(no motor power and annual hours entered)"
    : fmt(annual_kwh_saved, 0) + " kWh a year, $" + fmt(annual_cost_saved, 0) + " at the entered rate -- and it persists for the life of the pump with no control action, unlike throttling, which burns the excess head across a valve continuously";
  if (![required_diameter_in, trim_in, trim_pct, head_at_trim_ft, power_ratio, annual_kwh_saved, annual_cost_saved].every(Number.isFinite)) return { error: "Impeller trim math is not a finite value." };
  return {
    diameter_ratio, required_diameter_in, trim_in, trim_pct,
    head_at_trim_ft, power_ratio, power_reduction_pct,
    has_max, fraction_of_max, below_practical_limit, limit_verdict,
    has_head_check, head_adequate, head_margin_ft, excess_head_ft, head_verdict,
    has_cost, current_kwh, trimmed_kwh, annual_kwh_saved, annual_cost_saved, cost_verdict,
    note: "The impeller diameter a pump needs to deliver a lower flow without throttling, and what trimming to it saves. The affinity relations for a TRIM are not quite the ones for a speed change, even though they look the same: flow scales with diameter directly, head with the square and power with the cube, but the correspondence is approximate because trimming changes the impeller's geometry relative to its casing rather than scaling the whole machine. The manufacturer's published trim curves are the authority; these relations give a first estimate accurate enough to decide whether trimming is worth pursuing at all. The saving is real and continuous. A pump throttled to reduce flow is developing head the system does not need and then destroying it across a balance valve, and that head times that flow is power converted directly into water temperature. A trimmed impeller never develops the excess head in the first place, so the saving persists for the life of the pump with no control action and nothing to fall out of adjustment. Because power goes as the CUBE of the diameter ratio, a modest trim is a large power reduction -- which is what makes the machine-shop cost pay back in months rather than years. Two checks decide whether the trim is usable, and both are computed here rather than left as caveats. The first is head: the trimmed pump must still make the required HEAD at the required flow, not merely the flow, and a trim that delivers one without the other is not a solution. The second is the practical limit: below roughly three quarters of the casing's maximum diameter the gap between impeller tip and casing grows, the hydraulic match degrades, efficiency falls off, and the affinity estimate itself becomes unreliable -- at which point the manufacturer will usually recommend a different pump or a smaller casing. This is an estimate against published curves: it does not read a pump curve, compute efficiency at the trimmed condition, check NPSH available against the new requirement, or address the minimum flow the pump needs. The pump manufacturer's trim curves and the mechanical engineer of record govern.",
  };
}
export const pumpImpellerTrimExample = { inputs: { current_diameter_in: 9.5, current_flow_gpm: 520, required_flow_gpm: 430, current_head_ft: 95, required_head_ft: 62, max_diameter_in: 10.5, min_trim_fraction: 0.75, motor_hp: 15, annual_hours: 6000, energy_rate_per_kwh: 0.10 } };
HVACSYSTEMS_RENDERERS["pump-impeller-trim"] = _simpleRenderer({
  citation: "Citation: the impeller-trim affinity relations as pump practice writes them -- Q2/Q1 = D2/D1, H2/H1 = (D2/D1)^2, P2/P1 = (D2/D1)^3 -- noting that a TRIM is not a speed change: it alters the impeller's geometry relative to its casing, so the correspondence is APPROXIMATE and the manufacturer's published trim curves are the authority. The practical limit of roughly 75 to 80 percent of the casing maximum is ENTERED. Horsepower converts at 0.745699872 kW/hp. It does not read a pump curve, compute efficiency at the trimmed condition, check NPSH available, or address the pump's minimum flow. The pump manufacturer's trim curves and the mechanical engineer of record govern.",
  example: pumpImpellerTrimExample.inputs,
  fields: [
    { key: "current_diameter_in", label: "Current impeller diameter (in)", kind: "number" },
    { key: "current_flow_gpm", label: "Current flow (gpm)", kind: "number" },
    { key: "required_flow_gpm", label: "Required flow (gpm)", kind: "number" },
    { key: "current_head_ft", label: "Current head at that flow (ft, 0 to skip the head check)", kind: "number" },
    { key: "required_head_ft", label: "Head the system requires (ft)", kind: "number" },
    { key: "max_diameter_in", label: "Maximum impeller diameter for the casing (in, 0 to skip)", kind: "number" },
    { key: "min_trim_fraction", label: "Minimum practical trim (fraction of maximum)", kind: "number", default: 0.75 },
    { key: "motor_hp", label: "Motor power (hp, 0 to skip the saving)", kind: "number" },
    { key: "annual_hours", label: "Annual operating hours", kind: "number" },
    { key: "energy_rate_per_kwh", label: "Energy rate ($/kWh)", kind: "number" },
  ],
  outputs: [
    { key: "d", id: "pit-out-d", label: "Required diameter", value: (r) => fmt(r.required_diameter_in, 2) + " in, a " + fmt(r.trim_in, 2) + " in trim (" + fmt(r.trim_pct, 1) + "%)" },
    { key: "p", id: "pit-out-p", label: "Power at the trim", value: (r) => fmt(r.power_ratio * 100, 0) + "% of current, a " + fmt(r.power_reduction_pct, 0) + "% reduction from the cube relation" },
    { key: "h", id: "pit-out-h", label: "Head check", value: (r) => r.head_verdict },
    { key: "l", id: "pit-out-l", label: "Practical limit", value: (r) => r.limit_verdict },
    { key: "s", id: "pit-out-s", label: "Annual saving", value: (r) => r.cost_verdict },
    { key: "n", id: "pit-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePumpImpellerTrim,
});

// =====================================================================
// spec-v1626: coil capacity verification from measured air and water.
// =====================================================================
//
// spec-v1626 computes an 18% air-to-water disagreement and calls the coil
// "fine" -- against its OWN stated 5 to 10% criterion. The tolerance is an
// input here and the verdict is a boolean, so the sentence cannot disagree
// with the arithmetic.
// dims: in { airflow_cfm: L^3 T^-1, entering_air_db_f: T, leaving_air_db_f: T, enthalpy_drop_btu_lb: L^2 T^-2, water_gpm: L^3 T^-1, entering_water_f: T, leaving_water_f: T, fluid_factor: dimensionless, design_capacity_btuh: M L^2 T^-3, tolerance_pct: dimensionless } out: { air_sensible_btuh: M L^2 T^-3, air_total_btuh: M L^2 T^-3, water_btuh: M L^2 T^-3, balance_difference_pct: dimensionless, sensible_only_difference_pct: dimensionless }
export function computeCoilCapacityVerification({
  airflow_cfm = 0, entering_air_db_f = 0, leaving_air_db_f = 0, enthalpy_drop_btu_lb = 0,
  water_gpm = 0, entering_water_f = 0, leaving_water_f = 0, fluid_factor = 500,
  design_capacity_btuh = 0, tolerance_pct = 10,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(airflow_cfm > 0)) return { error: "Airflow must be positive (cfm)." };
  if (!(water_gpm > 0)) return { error: "Water flow must be positive (gpm)." };
  if (!(fluid_factor > 0)) return { error: "The fluid factor must be positive (500 for water)." };
  if (enthalpy_drop_btu_lb < 0) return { error: "The enthalpy drop cannot be negative (BTU/lb) -- enter its magnitude." };
  if (design_capacity_btuh < 0) return { error: "Design capacity cannot be negative (BTU/h)." };
  if (!(tolerance_pct > 0)) return { error: "The heat-balance tolerance must be positive (%)." };
  // Both sides as magnitudes, so the tile serves a heating or a cooling coil.
  const air_dt_f = Math.abs(leaving_air_db_f - entering_air_db_f);
  const water_dt_f = Math.abs(leaving_water_f - entering_water_f);
  if (!(air_dt_f > 0)) return { error: "The air temperatures must differ -- there is no capacity to verify." };
  if (!(water_dt_f > 0)) return { error: "The water temperatures must differ -- there is no capacity to verify." };
  const air_sensible_btuh = _HS_SENSIBLE_CONST * airflow_cfm * air_dt_f;
  const water_btuh = fluid_factor * water_gpm * water_dt_f;
  // The enthalpy path, which is the only valid air side on a WET coil.
  const has_enthalpy = enthalpy_drop_btu_lb > 0;
  const air_total_btuh = has_enthalpy ? _HS_TOTAL_HEAT_CONST * airflow_cfm * enthalpy_drop_btu_lb : 0;
  const air_used_btuh = has_enthalpy ? air_total_btuh : air_sensible_btuh;
  const latent_btuh = has_enthalpy ? air_total_btuh - air_sensible_btuh : 0;
  const balance_difference_pct = Math.abs(water_btuh - air_used_btuh) / water_btuh * 100;
  const sensible_only_difference_pct = Math.abs(water_btuh - air_sensible_btuh) / water_btuh * 100;
  // The verdict, against the ENTERED tolerance rather than an assumed one.
  const balances = balance_difference_pct <= tolerance_pct;
  const air_reads_high = air_used_btuh > water_btuh;
  const balance_verdict = balances
    ? "the two sides agree within " + fmt(balance_difference_pct, 1) + "%, inside the " + fmt(tolerance_pct, 1) + "% tolerance -- agreement between two independent measurements is strong evidence that both are right"
    : air_reads_high
      ? "the two sides disagree by " + fmt(balance_difference_pct, 1) + "%, OUTSIDE the " + fmt(tolerance_pct, 1) + "% tolerance, with the AIR side high -- which points at an overstated airflow measurement, or air bypassing the coil so the leaving temperature is not representative"
      : "the two sides disagree by " + fmt(balance_difference_pct, 1) + "%, OUTSIDE the " + fmt(tolerance_pct, 1) + "% tolerance, with the WATER side high -- which usually means the flow measurement is wrong, or the temperature sensors are too close together for the delta being measured";
  const method_verdict = !has_enthalpy
    ? "no enthalpy drop entered, so the air side is SENSIBLE ONLY. On a wet cooling coil that is not comparable with the water side, which carries the latent heat too -- a report comparing sensible air against total water is comparing two different quantities"
    : "the air side is computed from ENTHALPY, which is the only valid basis on a wet coil; the sensible-only figure would have differed from the water side by " + fmt(sensible_only_difference_pct, 1) + "%, and " + fmt(latent_btuh, 0) + " BTU/h of that gap is latent heat the sensible calculation cannot see";
  const has_design = design_capacity_btuh > 0;
  const air_pct_design = has_design ? air_used_btuh / design_capacity_btuh * 100 : 0;
  const water_pct_design = has_design ? water_btuh / design_capacity_btuh * 100 : 0;
  const design_verdict = !has_design
    ? "(no design capacity entered)"
    : "air side " + fmt(air_pct_design, 0) + "% of design, water side " + fmt(water_pct_design, 0) + "%";
  if (![air_sensible_btuh, air_total_btuh, water_btuh, balance_difference_pct, sensible_only_difference_pct].every(Number.isFinite)) return { error: "Coil capacity math is not a finite value." };
  return {
    air_dt_f, water_dt_f, air_sensible_btuh, has_enthalpy, air_total_btuh, air_used_btuh, latent_btuh,
    water_btuh, balance_difference_pct, sensible_only_difference_pct,
    balances, air_reads_high, tolerance_pct, balance_verdict, method_verdict,
    has_design, air_pct_design, water_pct_design, design_verdict,
    note: "A coil's delivered capacity computed twice, from the air and from the water, and what the disagreement between them means. Two independent measurements are the whole value of the exercise: each uses different instruments, different quantities and different assumptions, so agreement is strong evidence that both are right, and disagreement localises the problem rather than merely flagging it. Air side high against water side points at an overstated airflow measurement, or at air bypassing the coil so the leaving temperature is not representative. Water side high usually means the flow measurement is wrong, or the temperature sensors are too close together for the delta being measured. The sensible-versus-total distinction is the trap on a cooling coil, and it is the one that produces false alarms. A wet coil is removing latent heat, and a sensible-only air-side calculation will fall well short of the water-side total for no reason except the method -- so on a wet coil the air side must be computed from ENTHALPY, which needs wet-bulb measurements on both sides. A report comparing sensible air against total water is comparing two different quantities and will condemn a coil that is working. What it does NOT license is calling any disagreement acceptable once the method is corrected: the tolerance is entered here and the verdict is computed against it, because a balance that is still outside tolerance after switching to enthalpy is a real finding, not a rounding difference. The instrument that most often fails is the water temperature difference. A modest delta measured with sensors accurate to a degree each carries a large percentage uncertainty, and on a low-delta system that uncertainty can be most of the disagreement -- which means the water-side measurement is weakest exactly where hydronic systems tend to run. This computes capacities from ENTERED measurements at a sea-level standard-air basis; it does not correct for altitude or non-standard density, derive enthalpy from dry-bulb and wet-bulb readings, assess instrument accuracy, or evaluate the coil's cleanliness, circuiting or approach. The coil manufacturer's rated capacity at the design condition and the balancing agency's own procedure govern.",
  };
}
export const coilCapacityVerificationExample = { inputs: { airflow_cfm: 8000, entering_air_db_f: 80, leaving_air_db_f: 58, enthalpy_drop_btu_lb: 5.5, water_gpm: 40, entering_water_f: 44, leaving_water_f: 56, fluid_factor: 500, design_capacity_btuh: 240000, tolerance_pct: 10 } };
HVACSYSTEMS_RENDERERS["coil-capacity-verification"] = _simpleRenderer({
  citation: "Citation: the coil heat balance as ASHRAE and balancing practice writes it -- air sensible Q = 1.08 x CFM x dT (1.08 = 0.075 lb/cu ft x 0.24 BTU/lb-degF x 60 min/h), air total Q = 4.5 x CFM x dh on a WET coil, and water Q = 500 x GPM x dT (500 = 8.33 lb/gal x 60 min/h x 1.0), with the two sides expected to agree within a stated tolerance. The tolerance and the fluid factor are ENTERED. Sea-level standard air: it does not correct for altitude or non-standard density, derive enthalpy from dry-bulb and wet-bulb readings, assess instrument accuracy, or evaluate coil cleanliness, circuiting or approach. The coil manufacturer's rated capacity and the balancing procedure govern.",
  example: coilCapacityVerificationExample.inputs,
  fields: [
    { key: "airflow_cfm", label: "Airflow (cfm)", kind: "number" },
    { key: "entering_air_db_f", label: "Entering air dry bulb (°F)", kind: "number", attrs: { step: "any" } },
    { key: "leaving_air_db_f", label: "Leaving air dry bulb (°F)", kind: "number", attrs: { step: "any" } },
    { key: "enthalpy_drop_btu_lb", label: "Enthalpy change across the coil (BTU/lb, 0 for sensible only)", kind: "number" },
    { key: "water_gpm", label: "Water flow (gpm)", kind: "number" },
    { key: "entering_water_f", label: "Entering water (°F)", kind: "number", attrs: { step: "any" } },
    { key: "leaving_water_f", label: "Leaving water (°F)", kind: "number", attrs: { step: "any" } },
    { key: "fluid_factor", label: "Fluid factor (500 water, lower for glycol)", kind: "number", default: 500 },
    { key: "design_capacity_btuh", label: "Coil design capacity (BTU/h, 0 to skip)", kind: "number" },
    { key: "tolerance_pct", label: "Heat balance tolerance (%)", kind: "number", default: 10 },
  ],
  outputs: [
    { key: "a", id: "ccv2-out-a", label: "Air side", value: (r) => r.has_enthalpy ? fmt(r.air_total_btuh, 0) + " BTU/h total from enthalpy (" + fmt(r.air_sensible_btuh, 0) + " sensible, " + fmt(r.latent_btuh, 0) + " latent)" : fmt(r.air_sensible_btuh, 0) + " BTU/h sensible only" },
    { key: "w", id: "ccv2-out-w", label: "Water side", value: (r) => fmt(r.water_btuh, 0) + " BTU/h across a " + fmt(r.water_dt_f, 1) + " °F rise" },
    { key: "b", id: "ccv2-out-b", label: "Heat balance", value: (r) => r.balance_verdict },
    { key: "m", id: "ccv2-out-m", label: "Method", value: (r) => r.method_verdict },
    { key: "g", id: "ccv2-out-g", label: "Against design", value: (r) => r.design_verdict },
    { key: "n", id: "ccv2-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCoilCapacityVerification,
});

// =====================================================================
// spec-v1627: valve actuator close-off pressure and torque.
// =====================================================================
//
// The differential a valve must close against is NOT the one it sees at design
// flow. As other valves close, the pump rides up its curve and the pressure
// across the remaining valves rises toward shutoff head -- so the worst case is
// MINIMUM system flow, the condition a designer computing at design never looks
// at, and the condition in which the valve is most likely to be commanded shut.
// dims: in { seat_area_in2: L^2, design_differential_psi: M L^-1 T^-2, minimum_flow_differential_psi: M L^-1 T^-2, actuator_closeoff_psi: M L^-1 T^-2, spring_closeoff_psi: M L^-1 T^-2 } out: { design_seat_force_lb: M L T^-2, worst_case_seat_force_lb: M L T^-2, actuator_force_lb: M L T^-2, force_shortfall_lb: M L T^-2 }
export function computeValveActuatorCloseOff({
  seat_area_in2 = 0, design_differential_psi = 0, minimum_flow_differential_psi = 0,
  actuator_closeoff_psi = 0, spring_closeoff_psi = 0, is_spring_return = "no",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(seat_area_in2 > 0)) return { error: "The effective seat area must be positive (sq in)." };
  if (design_differential_psi < 0 || minimum_flow_differential_psi < 0) return { error: "Differential pressures cannot be negative (psi)." };
  if (actuator_closeoff_psi < 0 || spring_closeoff_psi < 0) return { error: "Actuator ratings cannot be negative (psi)." };
  if (!(minimum_flow_differential_psi > 0)) return { error: "Enter the differential at MINIMUM system flow -- that is the condition close-off is selected against." };
  const design_seat_force_lb = design_differential_psi * seat_area_in2;
  const worst_case_seat_force_lb = minimum_flow_differential_psi * seat_area_in2;
  const differential_rise_psi = minimum_flow_differential_psi - design_differential_psi;
  const has_design = design_differential_psi > 0;
  const rise_ratio = has_design ? minimum_flow_differential_psi / design_differential_psi : 0;
  const design_understates = has_design && minimum_flow_differential_psi > design_differential_psi;
  const trap_verdict = !has_design
    ? "(no design differential entered)"
    : design_understates
      ? "at DESIGN flow the differential is only " + fmt(design_differential_psi, 1) + " psi and the seat force " + fmt(design_seat_force_lb, 0) + " lb, so an actuator selected on that basis looks generous -- it is " + fmt(rise_ratio, 1) + " times short of the minimum-flow condition"
      : "the design differential is at or above the minimum-flow differential entered, which is unusual; check that the minimum-flow value is the pump's near-shutoff condition";
  // The driven rating.
  const has_driven = actuator_closeoff_psi > 0;
  const actuator_force_lb = has_driven ? actuator_closeoff_psi * seat_area_in2 : 0;
  const force_shortfall_lb = worst_case_seat_force_lb - actuator_force_lb;
  const driven_adequate = has_driven && actuator_closeoff_psi >= minimum_flow_differential_psi;
  const driven_verdict = !has_driven
    ? "(no actuator close-off rating entered)"
    : driven_adequate
      ? "the actuator's " + fmt(actuator_closeoff_psi, 1) + " psi rating develops " + fmt(actuator_force_lb, 0) + " lb against the " + fmt(worst_case_seat_force_lb, 0) + " lb required, so it holds"
      : "the actuator's " + fmt(actuator_closeoff_psi, 1) + " psi rating develops only " + fmt(actuator_force_lb, 0) + " lb against the " + fmt(worst_case_seat_force_lb, 0) + " lb required, " + fmt(force_shortfall_lb, 0) + " lb SHORT -- the valve floats off its seat and passes flow with the actuator fully commanded closed, which reads as a control fault rather than a valve fault";
  // The spring direction, which is often much lower and is the failure case.
  const is_spring = is_spring_return === "yes";
  const has_spring_rating = spring_closeoff_psi > 0;
  const spring_force_lb = has_spring_rating ? spring_closeoff_psi * seat_area_in2 : 0;
  const spring_adequate = is_spring && has_spring_rating && spring_closeoff_psi >= minimum_flow_differential_psi;
  const spring_verdict = !is_spring
    ? "(not a spring-return actuator)"
    : !has_spring_rating
      ? "spring return selected but no spring close-off rating entered -- it is a DIFFERENT and usually lower number than the driven rating, and it is the one that governs on a power failure"
      : spring_adequate
        ? "the spring close-off of " + fmt(spring_closeoff_psi, 1) + " psi also holds the " + fmt(minimum_flow_differential_psi, 1) + " psi differential, so the valve closes on a power failure too"
        : "the spring close-off is only " + fmt(spring_closeoff_psi, 1) + " psi against the " + fmt(minimum_flow_differential_psi, 1) + " psi differential: the valve holds ON COMMAND and LEAKS on a power failure or a fire alarm shutdown, which is precisely when a closed valve matters most";
  const overall_adequate = driven_adequate && (!is_spring || spring_adequate);
  if (![design_seat_force_lb, worst_case_seat_force_lb, actuator_force_lb, force_shortfall_lb, spring_force_lb].every(Number.isFinite)) return { error: "Close-off math is not a finite value." };
  return {
    design_seat_force_lb, worst_case_seat_force_lb, differential_rise_psi, rise_ratio,
    has_design, design_understates, trap_verdict,
    has_driven, actuator_force_lb, force_shortfall_lb, driven_adequate, driven_verdict,
    is_spring, has_spring_rating, spring_force_lb, spring_adequate, spring_verdict,
    overall_adequate,
    note: "Whether a control valve's actuator can actually hold the valve shut against the pressure the system puts across it. The differential a valve must close against is not the differential it sees at design flow, and that is the whole trap. As other valves on the system close, the pump rides up its curve and the pressure across the remaining valves rises toward the pump's shutoff head -- so the worst case for close-off is MINIMUM system flow, which is the condition a designer computing at design flow never looks at, and it is also the condition in which a valve is most likely to be commanded closed. On a system with many two-way valves and no differential pressure control, that rise can be large. The consequence of getting it wrong is subtle rather than dramatic, which is why it goes unfound for years. The valve strokes, the actuator reports closed, and a small flow continues past the seat -- so a coil stays warm, a zone overheats in the cooling season, and the problem reads as a control fault. Checking the actuator's close-off rating against the actual differential is what identifies it, and it is a nameplate comparison rather than a diagnosis. Spring-return actuators deserve their own line, which is why the spring rating is a separate input here. Their close-off in the SPRING direction is set by the spring rather than by the motor, and is often much lower than the driven rating -- so a valve can close reliably on command and leak on a power failure or a fire alarm shutdown, which is precisely the moment a closed valve matters. A single pass or fail on the driven rating hides that, so both are reported. Seat force is pressure times the EFFECTIVE seat area, which is entered from the valve manufacturer's data rather than computed from the nominal size; on a rotary valve, close-off is published as a torque and this force basis does not apply. This does not size the valve or its Cv, compute the differential at minimum flow (which needs the pump curve and the system), evaluate valve authority, or address cavitation and flashing. The valve and actuator manufacturer's close-off tables and the controls engineer of record govern.",
  };
}
export const valveActuatorCloseOffExample = { inputs: { seat_area_in2: 12, design_differential_psi: 8, minimum_flow_differential_psi: 45, actuator_closeoff_psi: 20, spring_closeoff_psi: 0, is_spring_return: "no" } };
HVACSYSTEMS_RENDERERS["valve-actuator-close-off"] = _simpleRenderer({
  citation: "Citation: valve close-off as control-valve practice states it -- seat force = differential pressure x effective seat area, selected against the differential at MINIMUM system flow (when other valves have closed and the pump has ridden toward shutoff head), not at design flow. A spring-return actuator's close-off in the spring direction is a separate and usually lower rating than its driven one. The effective seat area and both ratings are ENTERED from the manufacturer's tables; on a rotary valve close-off is published as a TORQUE and this force basis does not apply. It does not size the valve or its Cv, compute the minimum-flow differential (which needs the pump curve and the system), evaluate valve authority, or address cavitation. The manufacturer's close-off tables and the controls engineer govern.",
  example: valveActuatorCloseOffExample.inputs,
  fields: [
    { key: "seat_area_in2", label: "Effective seat area (sq in)", kind: "number" },
    { key: "design_differential_psi", label: "Differential at design flow (psi, 0 to skip)", kind: "number" },
    { key: "minimum_flow_differential_psi", label: "Differential at minimum system flow (psi)", kind: "number" },
    { key: "actuator_closeoff_psi", label: "Actuator close-off rating, driven (psi, 0 to skip)", kind: "number" },
    { key: "is_spring_return", label: "Spring return?", kind: "select", default: "no", options: [{ value: "no", label: "No (driven both ways)" }, { value: "yes", label: "Yes (spring closes it)" }] },
    { key: "spring_closeoff_psi", label: "Spring-direction close-off rating (psi)", kind: "number" },
  ],
  outputs: [
    { key: "f", id: "vac-out-f", label: "Seat force required", value: (r) => fmt(r.worst_case_seat_force_lb, 0) + " lb at minimum system flow" },
    { key: "t", id: "vac-out-t", label: "The design-flow trap", value: (r) => r.trap_verdict },
    { key: "d", id: "vac-out-d", label: "Against the actuator", value: (r) => r.driven_verdict },
    { key: "s", id: "vac-out-s", label: "On a power failure", value: (r) => r.spring_verdict },
    { key: "n", id: "vac-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeValveActuatorCloseOff,
});

// =====================================================================
// spec-v1628: chiller staging point and part-load efficiency.
// =====================================================================
//
// The crossover exists because chiller efficiency is NOT monotonic in load.
// The kW/ton curve is entered at four part-load points and interpolated
// linearly between them; the auxiliaries are what people leave out and they
// frequently move the answer. Helper above the exports, returning an
// expression rather than a bare identifier.
const _hsInterpKwTon = (pct, p30, p50, p75, p100) => (
  pct <= 30 ? p30
    : pct <= 50 ? p30 + (p50 - p30) * (pct - 30) / 20
      : pct <= 75 ? p50 + (p75 - p50) * (pct - 50) / 25
        : p75 + (p100 - p75) * (pct - 75) / 25
);
// dims: in { machine_tons: L^3 T^-1, plant_load_tons: L^3 T^-1, kw_per_ton_100: dimensionless, kw_per_ton_75: dimensionless, kw_per_ton_50: dimensionless, kw_per_ton_30: dimensionless, auxiliary_kw_per_machine: M L^2 T^-3, staging_setpoint_pct: dimensionless } out: { one_machine_kw: M L^2 T^-3, two_machine_kw: M L^2 T^-3, crossover_tons: L^3 T^-1, crossover_pct_of_machine: dimensionless, setpoint_error_tons: L^3 T^-1 }
export function computeChillerStagingPoint({
  machine_tons = 0, plant_load_tons = 0,
  kw_per_ton_100 = 0, kw_per_ton_75 = 0, kw_per_ton_50 = 0, kw_per_ton_30 = 0,
  auxiliary_kw_per_machine = 0, staging_setpoint_pct = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(machine_tons > 0)) return { error: "Machine capacity must be positive (tons)." };
  if (!(plant_load_tons > 0)) return { error: "Plant load must be positive (tons)." };
  if (!(kw_per_ton_100 > 0 && kw_per_ton_75 > 0 && kw_per_ton_50 > 0 && kw_per_ton_30 > 0)) return { error: "Every kW/ton curve point must be positive." };
  if (auxiliary_kw_per_machine < 0) return { error: "Auxiliary power cannot be negative (kW)." };
  if (staging_setpoint_pct < 0 || staging_setpoint_pct > 200) return { error: "The staging setpoint must be between 0 and 200 percent of one machine." };
  if (plant_load_tons > 2 * machine_tons) return { error: "The plant load exceeds what two machines can carry -- this compares one machine against two." };
  const one_pct = plant_load_tons / machine_tons * 100;
  const two_pct = plant_load_tons / (2 * machine_tons) * 100;
  const one_available = plant_load_tons <= machine_tons;
  const one_kw_ton = _hsInterpKwTon(one_pct, kw_per_ton_30, kw_per_ton_50, kw_per_ton_75, kw_per_ton_100);
  const two_kw_ton = _hsInterpKwTon(two_pct, kw_per_ton_30, kw_per_ton_50, kw_per_ton_75, kw_per_ton_100);
  const one_compressor_kw = one_available ? plant_load_tons * one_kw_ton : 0;
  const two_compressor_kw = plant_load_tons * two_kw_ton;
  const one_machine_kw = one_available ? one_compressor_kw + auxiliary_kw_per_machine : 0;
  const two_machine_kw = two_compressor_kw + 2 * auxiliary_kw_per_machine;
  const two_wins = one_available ? two_machine_kw < one_machine_kw : true;
  const saving_kw = one_available ? Math.abs(one_machine_kw - two_machine_kw) : 0;
  const load_verdict = !one_available
    ? "at " + fmt(plant_load_tons, 0) + " tons one machine cannot carry the load at all, so two must run"
    : two_wins
      ? "TWO machines win at " + fmt(plant_load_tons, 0) + " tons: " + fmt(two_machine_kw, 0) + " kW against " + fmt(one_machine_kw, 0) + " kW, saving " + fmt(saving_kw, 0) + " kW"
      : "ONE machine wins at " + fmt(plant_load_tons, 0) + " tons: " + fmt(one_machine_kw, 0) + " kW against " + fmt(two_machine_kw, 0) + " kW, saving " + fmt(saving_kw, 0) + " kW";
  // Search for the crossover: the highest load at which one machine still
  // beats two. Stepping in tons rather than assuming the curve is monotonic,
  // because it is not.
  let crossover_tons = 0;
  const step = machine_tons / 200;
  for (let load = step; load <= machine_tons; load += step) {
    const p1 = load * _hsInterpKwTon(load / machine_tons * 100, kw_per_ton_30, kw_per_ton_50, kw_per_ton_75, kw_per_ton_100) + auxiliary_kw_per_machine;
    const p2 = load * _hsInterpKwTon(load / (2 * machine_tons) * 100, kw_per_ton_30, kw_per_ton_50, kw_per_ton_75, kw_per_ton_100) + 2 * auxiliary_kw_per_machine;
    if (p1 <= p2) crossover_tons = load;
  }
  const crossover_pct_of_machine = crossover_tons / machine_tons * 100;
  const crossover_verdict = crossover_tons <= 0
    ? "two machines beat one at every load in range, which usually means the auxiliary penalty is small against a steeply rising kW/ton curve"
    : crossover_tons >= machine_tons - step
      ? "one machine beats two right up to its full capacity, so the second machine should not start until the load exceeds one machine"
      : "the crossover is at " + fmt(crossover_tons, 0) + " tons, " + fmt(crossover_pct_of_machine, 0) + "% of a single machine -- below it one machine uses less, above it two do";
  // The setpoint check, which is the practical output.
  const has_setpoint = staging_setpoint_pct > 0;
  const setpoint_tons = machine_tons * staging_setpoint_pct / 100;
  const setpoint_error_tons = setpoint_tons - crossover_tons;
  const stages_too_early = has_setpoint && crossover_tons > 0 && setpoint_tons < crossover_tons;
  const setpoint_verdict = !has_setpoint
    ? "(no staging setpoint entered)"
    : crossover_tons <= 0
      ? "no crossover was found in range, so the setpoint cannot be checked against one"
      : stages_too_early
        ? "a setpoint of " + fmt(staging_setpoint_pct, 0) + "% brings the second machine on at " + fmt(setpoint_tons, 0) + " tons, " + fmt(-setpoint_error_tons, 0) + " tons BELOW the crossover -- two machines and two sets of auxiliaries run where one machine and one set would use less, for a large part of the season"
        : "a setpoint of " + fmt(staging_setpoint_pct, 0) + "% brings the second machine on at " + fmt(setpoint_tons, 0) + " tons, at or above the " + fmt(crossover_tons, 0) + " ton crossover";
  if (![one_machine_kw, two_machine_kw, crossover_tons, crossover_pct_of_machine, setpoint_error_tons].every(Number.isFinite)) return { error: "Chiller staging math is not a finite value." };
  return {
    one_pct, two_pct, one_available, one_kw_ton, two_kw_ton,
    one_compressor_kw, two_compressor_kw, auxiliary_kw_per_machine,
    one_machine_kw, two_machine_kw, two_wins, saving_kw, load_verdict,
    crossover_tons, crossover_pct_of_machine, crossover_verdict,
    has_setpoint, setpoint_tons, setpoint_error_tons, stages_too_early, setpoint_verdict,
    note: "The plant load at which running two chillers uses less power than running one, and whether the staging setpoint in the controller matches it. The crossover exists because chiller efficiency is not monotonic in load. Many centrifugal machines are most efficient somewhere between 40 and 70 percent load rather than at 100, because condenser water is colder at part load and the lift is lower -- so two machines at half load can beat one at full. Below their best point efficiency falls off again, and eventually one machine at a moderate load beats two machines running badly. Screw and scroll machines behave differently, which is why the curve is entered at four part-load points here rather than assumed. The auxiliaries are what people leave out and they frequently move the answer. Starting a second chiller starts its chilled water pump, its condenser water pump and often a tower cell, and those add power before the compressor does anything -- so the second machine has to save more than its own auxiliaries before it pays for itself. On a plant with constant-speed pumps that penalty can push the crossover well above where the compressor curves alone would put it, which is exactly the case a curve-only comparison gets wrong. The crossover is found by searching the load range rather than by solving, because the curve is not monotonic and a solver would find the wrong root. The practical output is the comparison against the setpoint actually programmed: a plant staged at a habitual fraction of a machine that crosses over somewhere else is running the wrong number of machines for a large part of the season, and that is a setpoint change rather than a capital project. This compares one machine against two on an ENTERED kW/ton curve interpolated linearly between the given points, plus a flat auxiliary power per machine started. It does not model condenser water temperature, tower staging and fan power, the effect of variable-speed pumping, minimum run times, demand limiting, or thermal storage; it does not use IPLV, which is a weighted single number useful for comparing machines and not for staging them; and it does not address the flow and bypass constraints that staging also has to satisfy. The chiller manufacturer's part-load data at the actual condenser conditions and the plant's controls engineer govern.",
  };
}
export const chillerStagingPointExample = { inputs: { machine_tons: 500, plant_load_tons: 450, kw_per_ton_100: 0.62, kw_per_ton_75: 0.55, kw_per_ton_50: 0.52, kw_per_ton_30: 0.61, auxiliary_kw_per_machine: 45, staging_setpoint_pct: 80 } };
HVACSYSTEMS_RENDERERS["chiller-staging-point"] = _simpleRenderer({
  citation: "Citation: the chiller staging comparison as central-plant practice writes it -- one machine's power = load x kW/ton at its percent load plus one set of auxiliaries, against two machines at half that percent load plus two sets -- with the kW/ton curve ENTERED at four part-load points and interpolated linearly, because efficiency is not monotonic in load and centrifugal, screw and scroll machines differ. The crossover is found by searching the load range rather than solving, since the curve is not monotonic. It does not model condenser water temperature, tower staging and fan power, variable-speed pumping, minimum run times, demand limiting or thermal storage, and it does not use IPLV, which is for comparing machines rather than staging them. The chiller manufacturer's part-load data and the plant's controls engineer govern.",
  example: chillerStagingPointExample.inputs,
  fields: [
    { key: "machine_tons", label: "Capacity of one machine (tons)", kind: "number" },
    { key: "plant_load_tons", label: "Plant load (tons)", kind: "number" },
    { key: "kw_per_ton_100", label: "kW/ton at 100% load", kind: "number", attrs: { step: "any" } },
    { key: "kw_per_ton_75", label: "kW/ton at 75% load", kind: "number", attrs: { step: "any" } },
    { key: "kw_per_ton_50", label: "kW/ton at 50% load", kind: "number", attrs: { step: "any" } },
    { key: "kw_per_ton_30", label: "kW/ton at 30% load", kind: "number", attrs: { step: "any" } },
    { key: "auxiliary_kw_per_machine", label: "Auxiliary kW per machine started (pumps, tower cell)", kind: "number" },
    { key: "staging_setpoint_pct", label: "Staging setpoint (% of one machine, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "l", id: "csp-out-l", label: "At this load", value: (r) => r.load_verdict },
    { key: "o", id: "csp-out-o", label: "One machine", value: (r) => !r.one_available ? "cannot carry the load" : fmt(r.one_machine_kw, 0) + " kW at " + fmt(r.one_pct, 0) + "% load, " + fmt(r.one_kw_ton, 3) + " kW/ton plus " + fmt(r.auxiliary_kw_per_machine, 0) + " kW of auxiliaries" },
    { key: "t", id: "csp-out-t", label: "Two machines", value: (r) => fmt(r.two_machine_kw, 0) + " kW at " + fmt(r.two_pct, 0) + "% load each, " + fmt(r.two_kw_ton, 3) + " kW/ton" },
    { key: "c", id: "csp-out-c", label: "Crossover", value: (r) => r.crossover_verdict },
    { key: "s", id: "csp-out-s", label: "Against the setpoint", value: (r) => r.setpoint_verdict },
    { key: "n", id: "csp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeChillerStagingPoint,
});

// =====================================================================
// spec-v1629: variable primary chilled water minimum flow bypass.
// =====================================================================
//
// The bypass exists to protect the MACHINE, not to control temperature. The
// interaction with staging is the part that catches plants out: two chillers
// running have twice the minimum flow of one.
// dims: in { machine_design_gpm: L^3 T^-1, minimum_flow_fraction: dimensionless, machines_running: dimensionless, system_flow_gpm: L^3 T^-1, bypass_differential_psi: M L^-1 T^-2, design_differential_psi: M L^-1 T^-2 } out: { minimum_per_machine_gpm: L^3 T^-1, combined_minimum_gpm: L^3 T^-1, bypass_gpm: L^3 T^-1, required_cv: dimensionless, cv_at_design_differential: dimensionless }
export function computeVariablePrimaryBypass({
  machine_design_gpm = 0, minimum_flow_fraction = 0.45, machines_running = 1,
  system_flow_gpm = 0, bypass_differential_psi = 0, design_differential_psi = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(machine_design_gpm > 0)) return { error: "Design flow per machine must be positive (gpm)." };
  if (!(minimum_flow_fraction > 0 && minimum_flow_fraction <= 1)) return { error: "The evaporator minimum flow fraction must be above 0 and at most 1." };
  if (!(machines_running >= 1)) return { error: "At least one machine must be running." };
  if (!Number.isInteger(machines_running)) return { error: "The number of machines running must be a whole number." };
  if (system_flow_gpm < 0) return { error: "System flow cannot be negative (gpm)." };
  if (bypass_differential_psi < 0 || design_differential_psi < 0) return { error: "Differential pressures cannot be negative (psi)." };
  const minimum_per_machine_gpm = machine_design_gpm * minimum_flow_fraction;
  const combined_minimum_gpm = minimum_per_machine_gpm * machines_running;
  const bypass_needed = system_flow_gpm < combined_minimum_gpm;
  const bypass_gpm = bypass_needed ? combined_minimum_gpm - system_flow_gpm : 0;
  const pump_flow_gpm = Math.max(system_flow_gpm, combined_minimum_gpm);
  const wasted_fraction = pump_flow_gpm > 0 ? bypass_gpm / pump_flow_gpm : 0;
  const bypass_verdict = !bypass_needed
    ? "no bypass is needed: the system is moving " + fmt(system_flow_gpm, 0) + " gpm against a combined minimum of " + fmt(combined_minimum_gpm, 0) + " gpm"
    : "the bypass must pass " + fmt(bypass_gpm, 0) + " gpm: the system needs only " + fmt(system_flow_gpm, 0) + " gpm and " + fmt(machines_running, 0) + " machine" + (machines_running === 1 ? "" : "s") + " require " + fmt(combined_minimum_gpm, 0) + ", so the pumps move " + fmt(pump_flow_gpm, 0) + " gpm to serve a " + fmt(system_flow_gpm, 0) + " gpm load and " + fmt(wasted_fraction * 100, 0) + "% of the flow does no work";
  // The staging interaction, computed rather than warned about: what the same
  // system flow would need with one fewer machine running.
  const has_fewer = machines_running > 1;
  const fewer_minimum_gpm = has_fewer ? minimum_per_machine_gpm * (machines_running - 1) : 0;
  const fewer_bypass_gpm = has_fewer && system_flow_gpm < fewer_minimum_gpm ? fewer_minimum_gpm - system_flow_gpm : 0;
  const staging_would_fix = has_fewer && bypass_needed && fewer_bypass_gpm < bypass_gpm;
  const staging_verdict = !has_fewer
    ? "(one machine running, so there is no machine to stage off)"
    : staging_would_fix
      ? "staging one machine OFF drops the combined minimum to " + fmt(fewer_minimum_gpm, 0) + " gpm and the bypass to " + fmt(fewer_bypass_gpm, 0) + " gpm -- the staging logic and the bypass logic have to be designed together, because a plant that stages up at low load and does not stage back down promptly burns pumping energy circulating water that does no work"
      : "staging one machine off would not reduce the bypass at this system flow";
  // Valve sizing. The differential at the bypass is near pump shutoff, which
  // is HIGH, so the required Cv is smaller than a design-differential sizing
  // suggests -- and sizing on design differential oversizes the valve.
  const has_bypass_dp = bypass_differential_psi > 0 && bypass_gpm > 0;
  const required_cv = has_bypass_dp ? bypass_gpm / Math.sqrt(bypass_differential_psi) : 0;
  const has_design_dp = design_differential_psi > 0 && bypass_gpm > 0;
  const cv_at_design_differential = has_design_dp ? bypass_gpm / Math.sqrt(design_differential_psi) : 0;
  const oversize_ratio = has_bypass_dp && has_design_dp && required_cv > 0 ? cv_at_design_differential / required_cv : 0;
  const cv_verdict = !has_bypass_dp
    ? "(no bypass flow required, or no differential entered)"
    : "a Cv of " + fmt(required_cv, 0) + " at the " + fmt(bypass_differential_psi, 1) + " psi the pumps develop at this low flow" + (has_design_dp ? "; sizing it at the " + fmt(design_differential_psi, 1) + " psi design differential instead would call for a Cv of " + fmt(cv_at_design_differential, 0) + ", " + fmt(oversize_ratio, 2) + " times larger -- an oversized bypass valve controls badly at the small openings it actually works at" : "");
  if (![minimum_per_machine_gpm, combined_minimum_gpm, bypass_gpm, required_cv, cv_at_design_differential].every(Number.isFinite)) return { error: "Bypass math is not a finite value." };
  return {
    minimum_per_machine_gpm, combined_minimum_gpm, bypass_needed, bypass_gpm,
    pump_flow_gpm, wasted_fraction, bypass_verdict,
    has_fewer, fewer_minimum_gpm, fewer_bypass_gpm, staging_would_fix, staging_verdict,
    has_bypass_dp, required_cv, has_design_dp, cv_at_design_differential, oversize_ratio, cv_verdict,
    note: "The bypass a variable primary plant needs to hold its chillers above minimum flow, and the valve that passes it. The bypass exists to protect the MACHINE, not to control temperature, and that distinction explains everything about how it behaves. Below the evaporator's minimum flow the water in the tubes goes laminar, heat transfer collapses, leaving-temperature control becomes unstable, and the low-temperature safety trips -- and on some machines repeated low-flow operation damages tubes. So the bypass opens whenever system demand falls below what the running chillers require, and the pump moves water in a circle to keep the machines happy. The interaction with STAGING is the part that catches plants out, and it is arithmetic rather than judgment: two chillers running have twice the minimum flow of one. A plant that stages up at low load can find itself with a system flow far below the combined minimum and a bypass valve wide open, burning pumping energy to circulate water that does no work at all. That is an argument for staging down promptly, and it means the staging logic and the bypass logic have to be designed together rather than separately -- so what staging one machine off would do to the bypass is computed here beside the current condition. Sizing the valve is the straightforward part with one counter-intuitive turn. It must pass the largest bypass flow, which occurs at minimum system load with the maximum number of machines that could be running -- and at that condition the pumps are near shutoff, so the differential is HIGH and the required Cv is SMALLER than a sizing at design differential would suggest. Sizing on the design differential oversizes the valve, and an oversized bypass valve controls badly at the small openings it actually spends its life at. Minimum flow fractions are ENTERED from the chiller manufacturer, because they vary by machine and by evaporator design. This does not model the control sequence, the sensor location the bypass modulates from, the check valve and flow measurement a variable primary plant needs, or the transient during a stage change, which is when low-flow trips actually happen. The chiller manufacturer's minimum flow data and the plant's designer govern.",
  };
}
export const variablePrimaryBypassExample = { inputs: { machine_design_gpm: 1000, minimum_flow_fraction: 0.45, machines_running: 2, system_flow_gpm: 600, bypass_differential_psi: 24, design_differential_psi: 12 } };
HVACSYSTEMS_RENDERERS["variable-primary-bypass"] = _simpleRenderer({
  citation: "Citation: the variable primary chilled water minimum-flow bypass as central-plant practice writes it -- minimum per machine = design flow x the evaporator minimum fraction, combined minimum = that times the machines running, bypass = combined minimum minus system flow, and valve Cv = bypass gpm / sqrt(differential psi) at the differential the pumps develop at that LOW flow (near shutoff, so higher than design). The evaporator minimum fraction is ENTERED from the chiller manufacturer. It does not model the control sequence, the sensor location, the check valve and flow measurement a variable primary plant needs, or the transient during a stage change. The chiller manufacturer's minimum flow data and the plant designer govern.",
  example: variablePrimaryBypassExample.inputs,
  fields: [
    { key: "machine_design_gpm", label: "Design evaporator flow per machine (gpm)", kind: "number" },
    { key: "minimum_flow_fraction", label: "Evaporator minimum flow (fraction of design)", kind: "number", default: 0.45 },
    { key: "machines_running", label: "Machines running", kind: "number", default: 1, attrs: { step: "1", min: "1" } },
    { key: "system_flow_gpm", label: "System (load) flow (gpm)", kind: "number" },
    { key: "bypass_differential_psi", label: "Differential across the bypass at this flow (psi, 0 to skip Cv)", kind: "number" },
    { key: "design_differential_psi", label: "Design differential for comparison (psi, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "m", id: "vpb-out-m", label: "Minimum flow", value: (r) => fmt(r.minimum_per_machine_gpm, 0) + " gpm per machine, " + fmt(r.combined_minimum_gpm, 0) + " gpm combined" },
    { key: "b", id: "vpb-out-b", label: "Bypass", value: (r) => r.bypass_verdict },
    { key: "s", id: "vpb-out-s", label: "Staging interaction", value: (r) => r.staging_verdict },
    { key: "c", id: "vpb-out-c", label: "Valve sizing", value: (r) => r.cv_verdict },
    { key: "n", id: "vpb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeVariablePrimaryBypass,
});

// =====================================================================
// spec-v1630: louver free area, velocity, and water penetration.
// =====================================================================
//
// Free area ratio is the number that turns a louver from a hole into a
// component. A conventional stationary louver passes roughly 35 to 50 percent
// of its gross face, so sizing on GROSS area understates the velocity by a
// factor of two or more -- which is how rain gets into a mechanical room that
// was designed correctly on paper.
// dims: in { width_ft: L, height_ft: L, free_area_ratio: dimensionless, airflow_cfm: L^3 T^-1, water_penetration_fpm: L T^-1, allowable_velocity_fpm: L T^-1 } out: { gross_area_ft2: L^2, free_area_ft2: L^2, free_velocity_fpm: L T^-1, gross_velocity_fpm: L T^-1, gross_sized_free_velocity_fpm: L T^-1, gross_area_for_allowable_ft2: L^2 }
export function computeLouverFreeArea({
  width_ft = 0, height_ft = 0, free_area_ratio = 0.45, airflow_cfm = 0,
  water_penetration_fpm = 0, allowable_velocity_fpm = 0, application = "intake",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(width_ft > 0)) return { error: "Louver width must be positive (ft)." };
  if (!(height_ft > 0)) return { error: "Louver height must be positive (ft)." };
  if (!(free_area_ratio > 0 && free_area_ratio <= 1)) return { error: "The free area ratio must be above 0 and at most 1." };
  if (!(airflow_cfm > 0)) return { error: "Airflow must be positive (cfm)." };
  if (water_penetration_fpm < 0 || allowable_velocity_fpm < 0) return { error: "Velocity limits cannot be negative (fpm)." };
  const gross_area_ft2 = width_ft * height_ft;
  const free_area_ft2 = gross_area_ft2 * free_area_ratio;
  const free_velocity_fpm = airflow_cfm / free_area_ft2;
  // The error the tile exists for: the velocity a gross-area sizing implies,
  // and the free-area velocity that sizing actually produces.
  const gross_velocity_fpm = airflow_cfm / gross_area_ft2;
  const is_intake = application === "intake";
  const limit_fpm = is_intake ? water_penetration_fpm : allowable_velocity_fpm;
  const has_limit = limit_fpm > 0;
  const within_limit = has_limit && free_velocity_fpm <= limit_fpm;
  const gross_sized_free_velocity_fpm = has_limit ? limit_fpm / free_area_ratio : 0;
  const limit_verdict = !has_limit
    ? is_intake
      ? "(no beginning-point-of-water-penetration velocity entered -- it is an AMCA 500-L tested property of the specific louver, not a rule of thumb)"
      : "(no allowable velocity entered)"
    : within_limit
      ? fmt(free_velocity_fpm, 0) + " fpm through the free area against a " + fmt(limit_fpm, 0) + " fpm limit, with " + fmt(limit_fpm - free_velocity_fpm, 0) + " fpm of margin"
      : fmt(free_velocity_fpm, 0) + " fpm through the free area, PAST the " + fmt(limit_fpm, 0) + " fpm limit by " + fmt(free_velocity_fpm - limit_fpm, 0) + " fpm" + (is_intake ? " -- rain is carried through" : " -- the pressure drop and the noise both go with the square of this velocity");
  const gross_error_verdict = !has_limit
    ? "(no limit entered to size against)"
    : "sizing to the " + fmt(limit_fpm, 0) + " fpm limit on GROSS area instead would run " + fmt(gross_sized_free_velocity_fpm, 0) + " fpm through the free area -- " + fmt(1 / free_area_ratio, 2) + " times the limit, because the air does not know about the blades";
  // The size a stated limit actually requires.
  const free_area_needed_ft2 = has_limit ? airflow_cfm / limit_fpm : 0;
  const gross_area_for_allowable_ft2 = has_limit ? free_area_needed_ft2 / free_area_ratio : 0;
  const size_verdict = !has_limit
    ? "(no limit entered)"
    : fmt(free_area_needed_ft2, 1) + " sq ft of FREE area is needed at the limit, which at this free area ratio is " + fmt(gross_area_for_allowable_ft2, 1) + " sq ft gross -- against the " + fmt(gross_area_ft2, 1) + " sq ft entered";
  const application_note = is_intake
    ? "an INTAKE is governed by water penetration, a tested AMCA 500-L property; drainable-blade designs carry that point far higher than conventional ones, which is why a drainable louver can be smaller for the same airflow and why substituting a cheaper louver of the same size is a performance change"
    : "a RELIEF or exhaust louver is governed by pressure drop and noise rather than water penetration, because air is leaving -- so a louver sized to an intake velocity limit will be unnecessarily large for this application";
  if (![gross_area_ft2, free_area_ft2, free_velocity_fpm, gross_velocity_fpm, gross_sized_free_velocity_fpm, gross_area_for_allowable_ft2].every(Number.isFinite)) return { error: "Louver math is not a finite value." };
  return {
    gross_area_ft2, free_area_ft2, free_velocity_fpm, gross_velocity_fpm,
    is_intake, has_limit, limit_fpm, within_limit, limit_verdict,
    gross_sized_free_velocity_fpm, gross_error_verdict,
    free_area_needed_ft2, gross_area_for_allowable_ft2, size_verdict, application_note,
    note: "The velocity air actually reaches through a louver, which is not the velocity its gross size suggests. Free area ratio is the number that turns a louver from a hole into a component: a conventional stationary louver passes roughly 35 to 50 percent of its gross face, so sizing on gross area understates the real velocity by a factor of two or more -- and the resulting velocity is double what was intended, which is how rain gets into a mechanical room that was designed correctly on paper. The limit that governs an INTAKE is water penetration, and it is a tested property rather than a rule of thumb. AMCA 500-L establishes the velocity at which a specific louver begins to pass water, and drainable-blade designs carry that point far higher than conventional ones. That is why a drainable louver can be smaller for the same airflow, and why substituting a cheaper louver of the same size late in a job is a performance change rather than a purchasing decision. RELIEF and exhaust louvers are a different problem: water penetration matters less because air is leaving, so they are limited instead by pressure drop and by the noise a high free-area velocity generates -- and a louver sized to an intake's velocity limit will be unnecessarily large for a relief application. Both the free area ratio and the penetration velocity are ENTERED from the specific louver's published AMCA data, because they are properties of its blade design and depth and cannot be assumed from its size. The gross-area error is computed here rather than described: sizing to a velocity limit on gross area runs the free area at that limit divided by the free area ratio, which is the number that puts water in the room. This does not compute the pressure drop, which rises with the square of free-area velocity and needs the louver's own curve; it does not address the sand trap, bird screen or insect screen that further reduce free area, the wind-driven rain performance which is a separate AMCA 550 test, or the drain and gutter provisions a wet climate needs. The louver manufacturer's AMCA-certified data and the mechanical engineer of record govern.",
  };
}
export const louverFreeAreaExample = { inputs: { width_ft: 4, height_ft: 4, free_area_ratio: 0.45, airflow_cfm: 3600, water_penetration_fpm: 700, allowable_velocity_fpm: 0, application: "intake" } };
HVACSYSTEMS_RENDERERS["louver-free-area"] = _simpleRenderer({
  citation: "Citation: louver free area and face velocity as AMCA practice writes it -- free area = gross area x the free area ratio, free-area velocity = cfm / free area -- against the beginning point of water penetration established by AMCA 500-L testing for the SPECIFIC louver. The free area ratio and the penetration velocity are ENTERED from the louver's published certified data, because they are properties of its blade design and depth. It does not compute pressure drop (which rises with the square of free-area velocity and needs the louver's own curve), account for sand traps, bird or insect screens that further reduce free area, address wind-driven rain performance (a separate AMCA 550 test), or size drains and gutters. The louver manufacturer's AMCA-certified data and the mechanical engineer of record govern.",
  example: louverFreeAreaExample.inputs,
  fields: [
    { key: "width_ft", label: "Louver width (ft)", kind: "number" },
    { key: "height_ft", label: "Louver height (ft)", kind: "number" },
    { key: "free_area_ratio", label: "Free area ratio (0-1)", kind: "number", default: 0.45 },
    { key: "airflow_cfm", label: "Airflow (cfm)", kind: "number" },
    { key: "application", label: "Application", kind: "select", default: "intake", options: [{ value: "intake", label: "Intake (governed by water penetration)" }, { value: "relief", label: "Relief or exhaust (governed by pressure drop and noise)" }] },
    { key: "water_penetration_fpm", label: "Beginning point of water penetration (fpm, AMCA 500-L)", kind: "number" },
    { key: "allowable_velocity_fpm", label: "Allowable velocity for a relief louver (fpm)", kind: "number" },
  ],
  outputs: [
    { key: "a", id: "lfa-out-a", label: "Areas", value: (r) => fmt(r.gross_area_ft2, 2) + " sq ft gross, " + fmt(r.free_area_ft2, 2) + " sq ft free" },
    { key: "v", id: "lfa-out-v", label: "Free-area velocity", value: (r) => fmt(r.free_velocity_fpm, 0) + " fpm (the gross-area figure of " + fmt(r.gross_velocity_fpm, 0) + " fpm is fiction)" },
    { key: "l", id: "lfa-out-l", label: "Against the limit", value: (r) => r.limit_verdict },
    { key: "e", id: "lfa-out-e", label: "The gross-area error", value: (r) => r.gross_error_verdict },
    { key: "s", id: "lfa-out-s", label: "Size the limit requires", value: (r) => r.size_verdict },
    { key: "p", id: "lfa-out-p", label: "Application", value: (r) => r.application_note },
    { key: "n", id: "lfa-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLouverFreeArea,
});

// =====================================================================
// spec-v1631: ceiling plenum return path pressure drop.
// =====================================================================
//
// The plenum is a duct whose cross-section is whatever the structure left
// over, and its restriction is concentrated where that cross-section pinches.
// dims: in { return_cfm: L^3 T^-1, pinch_width_ft: L, pinch_clear_in: L, target_velocity_fpm: L T^-1, measured_room_to_plenum_inwg: M L^-1 T^-2, measured_plenum_to_shaft_inwg: M L^-1 T^-2, assumed_return_inwg: M L^-1 T^-2 } out: { pinch_area_ft2: L^2, pinch_velocity_fpm: L T^-1, area_for_target_ft2: L^2, width_for_target_ft: L, measured_total_inwg: M L^-1 T^-2, static_shortfall_inwg: M L^-1 T^-2 }
export function computePlenumReturnDrop({
  return_cfm = 0, pinch_width_ft = 0, pinch_clear_in = 0, target_velocity_fpm = 400,
  measured_room_to_plenum_inwg = 0, measured_plenum_to_shaft_inwg = 0, assumed_return_inwg = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(return_cfm > 0)) return { error: "Return airflow must be positive (cfm)." };
  if (!(pinch_width_ft > 0)) return { error: "The width of the restricted section must be positive (ft)." };
  if (!(pinch_clear_in > 0)) return { error: "The clear height at the restriction must be positive (in)." };
  if (!(target_velocity_fpm > 0)) return { error: "The target plenum velocity must be positive (fpm)." };
  if (measured_room_to_plenum_inwg < 0 || measured_plenum_to_shaft_inwg < 0 || assumed_return_inwg < 0) return { error: "Pressures cannot be negative (in wg)." };
  const pinch_area_ft2 = pinch_width_ft * (pinch_clear_in / 12);
  const pinch_velocity_fpm = return_cfm / pinch_area_ft2;
  const within_target = pinch_velocity_fpm <= target_velocity_fpm;
  const velocity_ratio = pinch_velocity_fpm / target_velocity_fpm;
  const velocity_verdict = within_target
    ? fmt(pinch_velocity_fpm, 0) + " fpm at the restriction, inside the " + fmt(target_velocity_fpm, 0) + " fpm target"
    : fmt(pinch_velocity_fpm, 0) + " fpm at the restriction, " + fmt(velocity_ratio, 1) + " times the " + fmt(target_velocity_fpm, 0) + " fpm target -- that single pinch point IS the return path, and the pressure drop across it will be substantial";
  // What the target actually requires, expressed as the width the air has to
  // come through at the same clear height.
  const area_for_target_ft2 = return_cfm / target_velocity_fpm;
  const width_for_target_ft = area_for_target_ft2 / (pinch_clear_in / 12);
  const bays_needed = pinch_width_ft > 0 ? width_for_target_ft / pinch_width_ft : 0;
  const size_verdict = fmt(area_for_target_ft2, 1) + " sq ft is needed at the target, which at " + fmt(pinch_clear_in, 1) + " in clear means " + fmt(width_for_target_ft, 0) + " ft of width -- " + fmt(bays_needed, 1) + " times the " + fmt(pinch_width_ft, 1) + " ft entered, so the air has to come through that many bays rather than one, and the design question is whether the openings and the routing actually let it";
  // The static consequence, which is what makes this a balancing issue rather
  // than a design curiosity.
  const has_measured = measured_room_to_plenum_inwg > 0 || measured_plenum_to_shaft_inwg > 0;
  const measured_total_inwg = measured_room_to_plenum_inwg + measured_plenum_to_shaft_inwg;
  const static_shortfall_inwg = has_measured ? measured_total_inwg - assumed_return_inwg : 0;
  const understated = has_measured && static_shortfall_inwg > 0;
  const static_verdict = !has_measured
    ? "(no measured pressure differences entered -- measuring room to plenum and plenum to shaft is what localizes the restriction)"
    : understated
      ? "the return path measures " + fmt(measured_total_inwg, 3) + " in wg against the " + fmt(assumed_return_inwg, 3) + " in wg the design assumed, so the fan is carrying " + fmt(static_shortfall_inwg, 3) + " in wg it was not sized for -- it delivers less than design at a higher static than expected, which looks like a supply-side problem and is not"
      : "the measured return path of " + fmt(measured_total_inwg, 3) + " in wg is at or below what the design assumed, so it is not the explanation for a fan shortfall";
  const split_verdict = !has_measured
    ? "(no measured pressures entered)"
    : measured_room_to_plenum_inwg > measured_plenum_to_shaft_inwg
      ? "most of the drop is between the ROOM and the plenum (" + fmt(measured_room_to_plenum_inwg, 3) + " against " + fmt(measured_plenum_to_shaft_inwg, 3) + " in wg), so the grille or ceiling opening is the restriction"
      : "most of the drop is between the PLENUM and the shaft (" + fmt(measured_plenum_to_shaft_inwg, 3) + " against " + fmt(measured_room_to_plenum_inwg, 3) + " in wg), so the travel path and the shaft entry are the restriction";
  if (![pinch_area_ft2, pinch_velocity_fpm, area_for_target_ft2, width_for_target_ft, measured_total_inwg, static_shortfall_inwg].every(Number.isFinite)) return { error: "Plenum return math is not a finite value." };
  return {
    pinch_area_ft2, pinch_velocity_fpm, within_target, velocity_ratio, velocity_verdict,
    area_for_target_ft2, width_for_target_ft, bays_needed, size_verdict,
    has_measured, measured_total_inwg, static_shortfall_inwg, understated, static_verdict, split_verdict,
    note: "The velocity a ceiling return plenum reaches where its cross-section pinches, and what an underestimated return path costs the fan. A plenum is a duct whose cross-section is whatever the structure left over, and its restriction is concentrated at the places where that cross-section narrows: a beam line, a duct crossing the return path, a bundle of conduit, or the opening into the return shaft. Air does not distribute itself evenly through a plenum -- it takes the easiest path -- so a return that measures fine near the shaft can be starved at the far corner of the floor, and the velocity at the pinch is the number that says whether that is happening. The static consequence is what makes this a balancing issue rather than a design curiosity. If the fan's external static was calculated assuming a negligible return path and the plenum actually costs a measurable fraction of an inch, the fan delivers less than design at a HIGHER static than expected -- which looks like a supply-side problem and is not, and which sends people to the supply duct, the filters and the coil while the restriction sits above the ceiling. Measuring the pressure difference between the room and the plenum, and between the plenum and the shaft, is what localizes it, and the split between those two says whether the grille or the travel path is the culprit. The other consequence is pressure relationships. A restricted return path makes the ceiling plenum more negative relative to the space, which pulls air from wherever it can -- adjacent floors, shafts and the exterior -- and can undo the intended pressurization of the space entirely, which matters most in exactly the buildings that were pressurized deliberately. This computes velocity at an ENTERED restriction and what a target velocity would require; it does NOT compute the pressure drop, which depends on the shape of every obstruction, the approach conditions and the path length in ways a plenum's irregular geometry does not reduce to a coefficient. It does not model the distribution of flow across multiple bays, the fire and smoke dampers in the path, or the effect of the plenum on the return air temperature. Measurement is the reliable method here; the mechanical engineer of record and the balancing agency govern.",
  };
}
export const plenumReturnDropExample = { inputs: { return_cfm: 18000, pinch_width_ft: 4, pinch_clear_in: 14, target_velocity_fpm: 400, measured_room_to_plenum_inwg: 0.04, measured_plenum_to_shaft_inwg: 0.11, assumed_return_inwg: 0.02 } };
HVACSYSTEMS_RENDERERS["plenum-return-drop"] = _simpleRenderer({
  citation: "Citation: the ceiling return plenum treated as a low-velocity duct whose restriction is at its pinch point -- velocity = cfm / the clear area there, against the commonly cited 300 to 500 fpm plenum target -- with the static consequence read from measured room-to-plenum and plenum-to-shaft differences. It computes velocity and the area a target requires; it does NOT compute the pressure drop, which depends on the shape of every obstruction, the approach conditions and the path length in ways a plenum's irregular geometry does not reduce to a coefficient. It does not model flow distribution across bays, fire and smoke dampers in the path, or the plenum's effect on return air temperature. Measurement is the reliable method; the mechanical engineer of record and the balancing agency govern.",
  example: plenumReturnDropExample.inputs,
  fields: [
    { key: "return_cfm", label: "Return airflow through the path (cfm)", kind: "number" },
    { key: "pinch_width_ft", label: "Width at the restriction (ft)", kind: "number" },
    { key: "pinch_clear_in", label: "Clear height at the restriction (in)", kind: "number" },
    { key: "target_velocity_fpm", label: "Target plenum velocity (fpm)", kind: "number", default: 400 },
    { key: "measured_room_to_plenum_inwg", label: "Measured room to plenum (in wg, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "measured_plenum_to_shaft_inwg", label: "Measured plenum to shaft (in wg)", kind: "number", attrs: { step: "any" } },
    { key: "assumed_return_inwg", label: "Return path the design assumed (in wg)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "v", id: "prd-out-v", label: "Velocity at the pinch", value: (r) => r.velocity_verdict },
    { key: "s", id: "prd-out-s", label: "For the target velocity", value: (r) => r.size_verdict },
    { key: "t", id: "prd-out-t", label: "Static consequence", value: (r) => r.static_verdict },
    { key: "l", id: "prd-out-l", label: "Where the drop is", value: (r) => r.split_verdict },
    { key: "n", id: "prd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePlenumReturnDrop,
});

// =====================================================================
// spec-v1632..v1636 (scope-trade-expansion-2, the HVAC acoustics and
// rooftop anchorage band). Four tiles on why a system is audible and one
// on whether the unit making the noise stays on the roof.
//
// THREE DEFECTS IN THE SOURCE SPECS. spec-v1634 ships two unrendered
// python placeholders for its own pressure drop (0.72 and 0.37 in wc) and
// a face velocity of 2,158 fpm that its own dimensions make 2,160.
// spec-v1636 computes a net uplift of -280 lb -- the unit's 1,400 lb
// weight EXCEEDING the 1,120 lb of uplift by 280 -- and then bolds
// "-280 lb still trying to lift it after its own weight is counted",
// which is the sign read backwards. Its downstream arithmetic is right,
// so only the sentence is wrong; that tile reports the direction IN WORDS
// rather than as a signed number, which is the fix that makes the class
// of error impossible to repeat.
// =====================================================================

// Sound power from an air outlet rises roughly with the fifth power of
// velocity, so a decibel change is 10 log10(ratio^5) = 50 log10(ratio).
const _AC_VELOCITY_EXPONENT = 5;

// =====================================================================
// spec-v1632: grille neck velocity and the NC that follows from it.
// =====================================================================
// dims: in { airflow_cfm: L^3 T^-1, neck_free_area_ft2: L^2, rated_nc: dimensionless, next_size_free_area_ft2: L^2, room_nc_target: dimensionless, room_correction_db: dimensionless } out: { neck_velocity_fpm: L T^-1, next_velocity_fpm: L T^-1, effective_nc: dimensionless, next_nc: dimensionless, nc_change_db: dimensionless, cfm_at_target: L^3 T^-1 }
export function computeGrilleNeckNc({
  airflow_cfm = 0, neck_free_area_ft2 = 0, rated_nc = 0,
  next_size_free_area_ft2 = 0, room_nc_target = 0, room_correction_db = 0,
  damper_at_neck = "no",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(airflow_cfm > 0)) return { error: "Airflow must be greater than zero." };
  if (!(neck_free_area_ft2 > 0)) return { error: "Neck free area must be greater than zero." };
  if (!(rated_nc > 0)) return { error: "The manufacturer NC rating at this flow must be greater than zero." };

  const neck_velocity_fpm = airflow_cfm / neck_free_area_ft2;
  const effective_nc = rated_nc + room_correction_db;
  const has_target = room_nc_target > 0;
  const over_target_db = has_target ? effective_nc - room_nc_target : 0;
  const meets_target = has_target && over_target_db <= 1e-12;

  const has_next = next_size_free_area_ft2 > 0;
  const next_velocity_fpm = has_next ? airflow_cfm / next_size_free_area_ft2 : 0;
  const velocity_ratio = has_next ? next_velocity_fpm / neck_velocity_fpm : 1;
  const nc_change_db = has_next ? 10 * Math.log10(Math.pow(velocity_ratio, _AC_VELOCITY_EXPONENT)) : 0;
  const next_nc = has_next ? effective_nc + nc_change_db : effective_nc;
  const next_meets = has_next && has_target && next_nc <= room_nc_target + 1e-12;
  const velocity_drop_pct = has_next ? 100 * (1 - velocity_ratio) : 0;

  // The airflow this size can pass and still meet the target, from the
  // same fifth-power relation run backwards.
  const target_velocity_fpm = has_target
    ? neck_velocity_fpm * Math.pow(10, (room_nc_target - effective_nc) / (10 * _AC_VELOCITY_EXPONENT)) : 0;
  const cfm_at_target = has_target ? target_velocity_fpm * neck_free_area_ft2 : 0;

  const damper_flag = String(damper_at_neck) === "yes";

  const velocityVerdict = "at " + fmt(airflow_cfm, 0) + " cfm through " + fmt(neck_free_area_ft2, 2) + " sq ft of neck free area the neck velocity is " + fmt(neck_velocity_fpm, 0) + " fpm";
  const ncVerdict = !has_target
    ? "the manufacturer rates this outlet NC " + fmt(rated_nc, 0) + " at this flow" + (room_correction_db !== 0 ? ", and the entered room correction of " + fmt(room_correction_db, 1) + " dB puts it at NC " + fmt(effective_nc, 0) : "")
    : meets_target
      ? "NC " + fmt(effective_nc, 0) + " against an NC " + fmt(room_nc_target, 0) + " target -- it meets it, with " + fmt(-over_target_db, 1) + " points to spare"
      : "NC " + fmt(effective_nc, 0) + " against an NC " + fmt(room_nc_target, 0) + " target -- OVER by " + fmt(over_target_db, 1) + " points";
  const sizeVerdict = !has_next
    ? "no next size up was entered. THE FIFTH-POWER RELATION IS WHAT MAKES THIS FIXABLE: sound power rises roughly with the fifth power of velocity, so a modest size increase buys a large NC reduction"
    : "ONE SIZE UP takes the velocity to " + fmt(next_velocity_fpm, 0) + " fpm, a " + fmt(velocity_drop_pct, 0) + "% reduction -- and at a fifth-power relation that is " + fmt(nc_change_db, 1) + " dB, putting it near NC " + fmt(next_nc, 0) + (has_target ? (next_meets ? ", comfortably inside the target" : ", still over the target") : "") + ". VERY FEW HVAC PROBLEMS RESPOND THAT STRONGLY TO SUCH A SMALL CHANGE -- it costs the price difference between two diffusers";
  const capacityVerdict = !has_target
    ? "no room target was entered, so no capacity at a criterion is reported"
    : "this size passes " + fmt(cfm_at_target, 0) + " cfm and still meets NC " + fmt(room_nc_target, 0) + ", against the " + fmt(airflow_cfm, 0) + " asked of it";
  const damperVerdict = damper_flag
    ? "A BALANCING DAMPER AT THE NECK IS PRESENT, AND IT IS PROBABLY THE NOISE. A damper immediately behind a diffuser generates turbulence right at the outlet with nothing between it and the room, and throttling it hard to balance a branch turns the diffuser into a whistle. NO DIFFUSER SELECTION FIXES THAT. Move the balancing to the branch takeoff -- several feet upstream, with a flexible connection and the diffuser's own equalizing grid in between -- and open the neck damper fully. That is the first thing to try on a noise complaint, before anything is replaced"
    : "no neck-mounted balancing damper was reported. That is worth confirming on a complaint, because a damper behind the diffuser generates turbulence with nothing between it and the room, and it commonly makes more noise than the diffuser does";
  const roomVerdict = "AND THE PUBLISHED NC ASSUMES A ROOM -- a fairly absorptive one. A diffuser rated NC 28 in a carpeted office with a lay-in ceiling reads several points higher in a hard-surfaced room with a gypsum ceiling, which is why the same selection is quiet in one space and audible in another. That correction is ENTERED here rather than assumed";

  return {
    neck_velocity_fpm, effective_nc, has_target, over_target_db, meets_target,
    has_next, next_velocity_fpm, velocity_ratio, velocity_drop_pct, nc_change_db, next_nc, next_meets,
    target_velocity_fpm, cfm_at_target, damper_flag,
    velocityVerdict, ncVerdict, sizeVerdict, capacityVerdict, damperVerdict, roomVerdict,
    note: "How loud an air outlet is, and the two changes that fix it. Neck velocity is airflow over the neck's free area, and the NC rating comes from the manufacturer's table at that size and flow -- it is ENTERED, because it depends on the outlet's geometry and no generic relation reproduces a table the maker publishes. THE FIFTH-POWER RELATION IS WHAT MAKES THIS FIXABLE. Sound power rises roughly with the fifth power of velocity, so going one nominal size up -- which might drop neck velocity by 30 percent -- drops the rating by seven or eight points, which is the difference between a complaint and silence. Very few HVAC problems respond that strongly to such a small change, and the change costs the price difference between two diffusers. THE DAMPER LOCATION IS THE OTHER HALF, and it is where most retrofit noise actually comes from. A balancing damper immediately behind a diffuser generates turbulence right at the outlet with nothing between it and the room, and throttling it hard to balance a branch turns the diffuser into a whistle. Moving the balancing to the branch takeoff -- several feet upstream, with a flexible connection and the diffuser's own equalizing grid in between -- removes the noise without changing the airflow, and it is the first thing to try on a complaint, before anything is replaced. AND THE PUBLISHED RATING ASSUMES A ROOM, a fairly absorptive one. The same diffuser reads several points higher in a hard-surfaced room with a gypsum ceiling than in a carpeted office with a lay-in ceiling, which is why one selection is quiet in one space and audible in another. This scales an entered rating by a computed velocity change. It does not read a manufacturer sound table or predict NC from geometry, work in octave bands (NC is a spectrum criterion and a single number hides where the problem is), address duct-borne noise reaching the outlet, breakout through duct walls, or noise from the fan itself, evaluate throw, drop or air distribution, or determine what any standard requires. ASHRAE Applications, the outlet manufacturer's sound data, and the acoustical consultant govern.",
  };
}
export const grilleNeckNcExample = { inputs: { airflow_cfm: 600, neck_free_area_ft2: 1.0, rated_nc: 34, next_size_free_area_ft2: 1.4, room_nc_target: 30, room_correction_db: 0, damper_at_neck: "yes" } };

// =====================================================================
// spec-v1633: duct breakout noise. What is computable here is the
// radiating area, the panel geometry that predicts breakout, the
// equal-area round substitution, and the room level from the standard
// room equation. The transmission loss itself is ENTERED by band.
// =====================================================================
// dims: in { duct_width_in: L, duct_height_in: L, exposed_length_ft: L, sound_power_db: dimensionless, breakout_tl_db: dimensionless, room_absorption_sabins: L^2, room_criterion_db: dimensionless, lagging_improvement_db: dimensionless } out: { exposed_area_ft2: L^2, aspect_ratio: dimensionless, round_diameter_in: L, room_spl_db: dimensionless, lagged_spl_db: dimensionless, over_criterion_db: dimensionless, tl_required_db: dimensionless }
export function computeDuctBreakoutNoise({
  duct_width_in = 0, duct_height_in = 0, exposed_length_ft = 0,
  sound_power_db = 0, breakout_tl_db = 0, room_absorption_sabins = 0,
  room_criterion_db = 0, lagging_improvement_db = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(duct_width_in > 0) || !(duct_height_in > 0)) return { error: "Duct width and height must be greater than zero." };
  if (!(exposed_length_ft > 0)) return { error: "The exposed length must be greater than zero." };
  if (!(sound_power_db > 0)) return { error: "The sound power level in the duct must be greater than zero." };
  if (!(breakout_tl_db > 0)) return { error: "The breakout transmission loss must be greater than zero." };
  if (!(room_absorption_sabins > 0)) return { error: "Room absorption must be greater than zero." };

  const perimeter_ft = 2 * (duct_width_in + duct_height_in) / 12;
  const exposed_area_ft2 = perimeter_ft * exposed_length_ft;
  const aspect_ratio = Math.max(duct_width_in, duct_height_in) / Math.min(duct_width_in, duct_height_in);
  const wide_flat = aspect_ratio >= 3;

  // The equal-area round substitution, which is a design decision and the
  // second cheapest fix after routing.
  const duct_area_in2 = duct_width_in * duct_height_in;
  const round_diameter_in = Math.sqrt(4 * duct_area_in2 / Math.PI);
  const round_perimeter_ft = Math.PI * round_diameter_in / 12;
  const round_area_ft2 = round_perimeter_ft * exposed_length_ft;

  // The standard room equation: Lp = Lw - TL + 10 log10(S / A).
  const room_spl_db = sound_power_db - breakout_tl_db + 10 * Math.log10(exposed_area_ft2 / room_absorption_sabins);
  const lagged_spl_db = room_spl_db - lagging_improvement_db;
  const has_lagging = lagging_improvement_db > 0;

  const has_criterion = room_criterion_db > 0;
  const over_criterion_db = has_criterion ? lagged_spl_db - room_criterion_db : 0;
  const meets_criterion = has_criterion && over_criterion_db <= 1e-12;
  const tl_required_db = has_criterion ? breakout_tl_db + over_criterion_db : 0;

  const areaVerdict = "a " + fmt(duct_width_in, 0) + " by " + fmt(duct_height_in, 0) + " in duct running " + fmt(exposed_length_ft, 0) + " ft through the space presents " + fmt(exposed_area_ft2, 0) + " sq ft of radiating surface";
  const shapeVerdict = wide_flat
    ? "AND ITS ASPECT RATIO IS " + fmt(aspect_ratio, 1) + " TO 1, which is close to the worst case. A large flat sheet-metal panel is an efficient radiator at low frequency, and the wider and flatter the panel the worse it is -- which is exactly the shape a tight ceiling forces"
    : "its aspect ratio is " + fmt(aspect_ratio, 1) + " to 1. Flat panels radiate efficiently at low frequency and the wider and flatter they are the worse, so a squarer duct is already better than a wide shallow one of the same area";
  const roundVerdict = "AN EQUAL-AREA ROUND DUCT WOULD BE " + fmt(round_diameter_in, 1) + " in, presenting " + fmt(round_area_ft2, 0) + " sq ft -- and the area is not the point. A cylinder is stiff and has no flat panels to flex, so its breakout transmission loss is dramatically higher, commonly 15 to 25 dB better at low frequency. THAT IS THE SECOND CHEAPEST FIX AND IT IS A DESIGN DECISION, not a field one";
  const levelVerdict = "the room equation gives " + fmt(sound_power_db, 0) + " dB of duct sound power, less " + fmt(breakout_tl_db, 0) + " dB of breakout transmission loss, plus " + fmt(10 * Math.log10(exposed_area_ft2 / room_absorption_sabins), 1) + " dB for " + fmt(exposed_area_ft2, 0) + " sq ft radiating into " + fmt(room_absorption_sabins, 0) + " sabins -- " + fmt(room_spl_db, 1) + " dB in the room";
  const laggingVerdict = !has_lagging
    ? "no lagging was entered. IT WORKS ONLY IF IT IS DONE CORRECTLY: a limp mass layer DECOUPLED from the duct by a soft layer adds transmission loss, while mass strapped directly to the metal couples to it and does much less. And because the complaint is low-frequency rumble, thin materials do almost nothing -- the required surface mass is substantial"
    : "with " + fmt(lagging_improvement_db, 0) + " dB of lagging the room level is " + fmt(lagged_spl_db, 1) + " dB. Lagging works only when the mass layer is DECOUPLED from the duct by a soft layer; mass strapped straight to the metal couples to it and does much less, and thin materials do almost nothing against low-frequency rumble";
  const criterionVerdict = !has_criterion
    ? "no room criterion was entered"
    : meets_criterion
      ? "that is inside the " + fmt(room_criterion_db, 0) + " dB criterion, with " + fmt(-over_criterion_db, 1) + " dB to spare"
      : "that is " + fmt(over_criterion_db, 1) + " dB OVER the " + fmt(room_criterion_db, 0) + " dB criterion, so the construction needs about " + fmt(tl_required_db, 0) + " dB of breakout transmission loss rather than the " + fmt(breakout_tl_db, 0) + " entered";
  const silencerVerdict = "AND A SILENCER DOES NOTHING ABOUT THIS, which is the point people get wrong. A silencer attenuates sound travelling ALONG the duct to a downstream outlet; breakout is sound leaving SIDEWAYS through the wall wherever the duct runs. A duct carrying high sound power past a quiet room radiates into it regardless of what is fitted downstream, and the noise arrives WITHOUT EVER PASSING THROUGH THE DIFFUSER. That is also how to recognise it in the field: rumble that does not change when the outlets are blanked off";
  const orderVerdict = "THE FIXES IN ORDER OF EFFECTIVENESS PER DOLLAR: route the duct outside the room, which removes the problem entirely; substitute round duct of equal area; lag with a decoupled mass layer; increase gauge or add stiffeners, which is worth a few dB and rarely enough alone. The first two are DESIGN decisions -- by the time a balancer is measuring the complaint the duct is in, and lagging a finished ceiling is expensive, which is the argument for catching it on the drawings";

  return {
    exposed_area_ft2, aspect_ratio, wide_flat, round_diameter_in, round_area_ft2,
    room_spl_db, has_lagging, lagged_spl_db, has_criterion, over_criterion_db,
    meets_criterion, tl_required_db,
    areaVerdict, shapeVerdict, roundVerdict, levelVerdict, laggingVerdict, criterionVerdict, silencerVerdict, orderVerdict,
    note: "Sound leaving a duct SIDEWAYS through its wall, into whatever room the duct passes through. This is the noise a silencer does not touch, and that is geometric rather than a matter of degree: a silencer attenuates sound travelling ALONG the duct to a downstream outlet, while breakout leaves through the wall wherever the duct runs, and arrives in the room without ever passing through a diffuser. Rumble that does not change when the outlets are blanked off is breakout. RECTANGULAR DUCT IS THE PROBLEM. A large flat sheet-metal panel is an efficient radiator at low frequency, and the wider and flatter the panel the worse it is -- so a wide shallow duct is close to the worst case, and it is also the shape a tight ceiling forces. Round duct of the same area is enormously better because a cylinder is stiff and has no flat panels to flex, commonly 15 to 25 dB better in the low bands where fan sound power is concentrated. The equal-area round diameter is computed here for exactly that comparison. LAGGING WORKS ONLY IF IT IS DONE CORRECTLY: a limp mass layer decoupled from the duct by a soft layer adds transmission loss, while mass strapped directly to the metal couples to it and does much less. And because the complaint is low-frequency rumble, thin materials do almost nothing -- the required surface mass is substantial. THE CHEAPEST FIX IS ROUTING AND THE SECOND IS ROUND DUCT, and both are design decisions rather than field ones. By the time a balancer is measuring the complaint the duct is in and the ceiling is closed, which is the argument for identifying breakout on the drawings. This computes radiating area, panel geometry and the room level from an ENTERED transmission loss and sound power. It does not predict breakout transmission loss from the duct construction, work in octave bands (breakout is a low-frequency problem and a single number hides it), estimate fan sound power, model duct-borne noise or the outlets, predict a lagging system's performance, or determine what any standard requires. ASHRAE Applications, the duct and lagging manufacturers' data, and the acoustical consultant govern.",
  };
}
export const ductBreakoutNoiseExample = { inputs: { duct_width_in: 48, duct_height_in: 12, exposed_length_ft: 20, sound_power_db: 85, breakout_tl_db: 22, room_absorption_sabins: 250, room_criterion_db: 40, lagging_improvement_db: 0 } };

// =====================================================================
// spec-v1634: silencer insertion loss, pressure drop and the noise floor.
//
// The spec ships TWO UNRENDERED PYTHON PLACEHOLDERS for its own pressure
// drop -- `{0.35*(2158/1500)**2:.2f}` is 0.72 in wc and the delta is 0.37
// -- and its 2,158 fpm is 2,160 on its own dimensions (9,000 cfm through
// 30 by 20 in is 4.1667 sq ft, not the rounded 4.17). Both are computed
// here. Placeholders now stand at ten across the campaign.
//
// The part worth building is the REGENERATED NOISE FLOOR, which the spec
// describes and does not compute: the silencer makes its own noise AFTER
// the attenuation, so above some velocity more insertion loss buys
// nothing. Energy-summing the two is what shows it.
// =====================================================================
// dims: in { airflow_cfm: L^3 T^-1, face_width_in: L, face_height_in: L, reference_drop_in_wc: M L^-1 T^-2, reference_velocity_fpm: L T^-1, alt_face_width_in: L, alt_face_height_in: L, target_velocity_fpm: L T^-1, upstream_lw_db: dimensionless, insertion_loss_db: dimensionless, regenerated_lw_db: dimensionless, fan_available_static_in_wc: M L^-1 T^-2 } out: { face_area_ft2: L^2, face_velocity_fpm: L T^-1, pressure_drop_in_wc: M L^-1 T^-2, alt_face_velocity_fpm: L T^-1, alt_pressure_drop_in_wc: M L^-1 T^-2, drop_increase_in_wc: M L^-1 T^-2, target_face_area_ft2: L^2, downstream_lw_db: dimensionless, attenuated_lw_db: dimensionless }
export function computeSilencerInsertionLoss({
  airflow_cfm = 0, face_width_in = 0, face_height_in = 0,
  reference_drop_in_wc = 0, reference_velocity_fpm = 0,
  alt_face_width_in = 0, alt_face_height_in = 0, target_velocity_fpm = 0,
  upstream_lw_db = 0, insertion_loss_db = 0, regenerated_lw_db = 0,
  fan_available_static_in_wc = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(airflow_cfm > 0)) return { error: "Airflow must be greater than zero." };
  if (!(face_width_in > 0) || !(face_height_in > 0)) return { error: "Silencer face dimensions must be greater than zero." };
  if (!(reference_drop_in_wc > 0) || !(reference_velocity_fpm > 0)) return { error: "The reference pressure drop and the velocity it was measured at must both be greater than zero." };

  const face_area_ft2 = face_width_in * face_height_in / 144;
  const face_velocity_fpm = airflow_cfm / face_area_ft2;
  // Pressure drop rises with the SQUARE of velocity.
  const pressure_drop_in_wc = reference_drop_in_wc * Math.pow(face_velocity_fpm / reference_velocity_fpm, 2);

  const has_alt = alt_face_width_in > 0 && alt_face_height_in > 0;
  const alt_face_area_ft2 = has_alt ? alt_face_width_in * alt_face_height_in / 144 : 0;
  const alt_face_velocity_fpm = has_alt ? airflow_cfm / alt_face_area_ft2 : 0;
  const alt_pressure_drop_in_wc = has_alt ? reference_drop_in_wc * Math.pow(alt_face_velocity_fpm / reference_velocity_fpm, 2) : 0;
  const drop_increase_in_wc = has_alt ? alt_pressure_drop_in_wc - pressure_drop_in_wc : 0;
  const velocity_increase_pct = has_alt ? 100 * (alt_face_velocity_fpm / face_velocity_fpm - 1) : 0;
  const drop_ratio = has_alt && pressure_drop_in_wc > 0 ? alt_pressure_drop_in_wc / pressure_drop_in_wc : 1;

  const has_target = target_velocity_fpm > 0;
  const target_face_area_ft2 = has_target ? airflow_cfm / target_velocity_fpm : 0;

  // The noise floor: the silencer's own regenerated sound power is created
  // AFTER the attenuation, so it adds on an energy basis and cannot be
  // attenuated away.
  const has_acoustics = upstream_lw_db > 0 && insertion_loss_db > 0;
  const attenuated_lw_db = has_acoustics ? upstream_lw_db - insertion_loss_db : 0;
  const has_regen = has_acoustics && regenerated_lw_db > 0;
  const downstream_lw_db = has_regen
    ? 10 * Math.log10(Math.pow(10, attenuated_lw_db / 10) + Math.pow(10, regenerated_lw_db / 10))
    : attenuated_lw_db;
  const regen_dominates = has_regen && regenerated_lw_db > attenuated_lw_db;
  const regen_penalty_db = has_regen ? downstream_lw_db - attenuated_lw_db : 0;
  // What another 10 dB of insertion loss would actually buy against the floor.
  const more_il_downstream_db = has_regen
    ? 10 * Math.log10(Math.pow(10, (attenuated_lw_db - 10) / 10) + Math.pow(10, regenerated_lw_db / 10))
    : attenuated_lw_db - 10;
  const more_il_gain_db = downstream_lw_db - more_il_downstream_db;

  const has_fan = fan_available_static_in_wc > 0;
  const static_margin_in_wc = has_fan ? fan_available_static_in_wc - pressure_drop_in_wc : 0;
  const static_short = has_fan && static_margin_in_wc < 0;

  const faceVerdict = "a " + fmt(face_width_in, 0) + " by " + fmt(face_height_in, 0) + " in face is " + fmt(face_area_ft2, 2) + " sq ft, so " + fmt(airflow_cfm, 0) + " cfm runs at " + fmt(face_velocity_fpm, 0) + " fpm and costs " + fmt(pressure_drop_in_wc, 2) + " in wc";
  const squeezeVerdict = !has_alt
    ? "no alternative face was entered. PRESSURE DROP RISES WITH THE SQUARE OF VELOCITY, so a silencer squeezed into a duct that is already undersized costs far more static than its catalogue figure suggests"
    : "SQUEEZING IT to " + fmt(alt_face_width_in, 0) + " by " + fmt(alt_face_height_in, 0) + " in takes the velocity to " + fmt(alt_face_velocity_fpm, 0) + " fpm -- a " + fmt(velocity_increase_pct, 0) + "% increase -- and the pressure drop to " + fmt(alt_pressure_drop_in_wc, 2) + " in wc, which is " + fmt(drop_ratio, 2) + " times as much. THE DROP GOES WITH THE SQUARE, so a 44% velocity increase roughly DOUBLES it, and that extra " + fmt(drop_increase_in_wc, 2) + " in wc comes out of the fan's available static";
  const targetVerdict = !has_target
    ? "no target face velocity was entered"
    : "to bring the face velocity to " + fmt(target_velocity_fpm, 0) + " fpm needs " + fmt(target_face_area_ft2, 2) + " sq ft of face -- a transition rather than a bigger duct, keeping the duct velocity wherever it needs to be and slowing the air only THROUGH the silencer";
  const regenVerdict = !has_acoustics
    ? "no sound power and insertion loss were entered"
    : !has_regen
      ? fmt(upstream_lw_db, 0) + " dB less " + fmt(insertion_loss_db, 0) + " dB of insertion loss is " + fmt(attenuated_lw_db, 0) + " dB downstream. NO REGENERATED SOUND POWER WAS ENTERED, and it is the limit people discover last -- the silencer makes its own noise AFTER the attenuation, so it sets a floor"
      : regen_dominates
        ? "THE REGENERATED NOISE IS NOW THE DOMINANT SOURCE. Attenuation takes " + fmt(upstream_lw_db, 0) + " dB down to " + fmt(attenuated_lw_db, 0) + ", but the silencer's own " + fmt(regenerated_lw_db, 0) + " dB is created AFTER the baffles and cannot be attenuated -- the downstream level is " + fmt(downstream_lw_db, 1) + " dB, which is " + fmt(regen_penalty_db, 1) + " dB above what the insertion loss alone predicts. ANOTHER 10 dB OF INSERTION LOSS WOULD BUY " + fmt(more_il_gain_db, 1) + " dB. Adding silencer length makes the system quieter on paper and no quieter in the room"
        : "attenuation takes " + fmt(upstream_lw_db, 0) + " dB down to " + fmt(attenuated_lw_db, 0) + ", and the silencer's own regenerated " + fmt(regenerated_lw_db, 0) + " dB adds " + fmt(regen_penalty_db, 1) + " dB for a downstream level of " + fmt(downstream_lw_db, 1) + " dB. The regenerated noise is not yet the floor, and another 10 dB of insertion loss would still buy " + fmt(more_il_gain_db, 1) + " dB";
  const staticVerdict = !has_fan
    ? "no fan available static was entered"
    : static_short
      ? "AND THE FAN DOES NOT HAVE IT. " + fmt(pressure_drop_in_wc, 2) + " in wc against " + fmt(fan_available_static_in_wc, 2) + " available is short by " + fmt(-static_margin_in_wc, 2) + " in wc"
      : "the fan has " + fmt(fan_available_static_in_wc, 2) + " in wc available, leaving " + fmt(static_margin_in_wc, 2) + " after the silencer";
  const couplingVerdict = "INSERTION LOSS AND PRESSURE DROP ARE NOT INDEPENDENT. The geometry that absorbs sound -- narrow passages, thick baffles -- is the geometry that restricts flow, so more attenuation costs static in the same fitting. Attenuation rises with LENGTH and so does pressure drop, but linearly; regenerated noise rises much faster with VELOCITY. That asymmetry is the whole design rule";
  const sequenceVerdict = "THE PRACTICAL SEQUENCE IS: get the face velocity down by transitioning to a larger cross-section AT the silencer, choose the length for the attenuation needed, then check the pressure drop against the fan's available static and the regenerated noise against the room criterion. Doing it in the other order produces a silencer that fits the duct and solves nothing";

  return {
    face_area_ft2, face_velocity_fpm, pressure_drop_in_wc,
    has_alt, alt_face_area_ft2, alt_face_velocity_fpm, alt_pressure_drop_in_wc,
    drop_increase_in_wc, velocity_increase_pct, drop_ratio,
    has_target, target_face_area_ft2,
    has_acoustics, attenuated_lw_db, has_regen, downstream_lw_db, regen_dominates,
    regen_penalty_db, more_il_downstream_db, more_il_gain_db,
    has_fan, static_margin_in_wc, static_short,
    faceVerdict, squeezeVerdict, targetVerdict, regenVerdict, staticVerdict, couplingVerdict, sequenceVerdict,
    note: "What a duct silencer costs in static pressure and what it actually buys in the room. Face velocity is the airflow through the silencer's own free area, and pressure drop rises with the SQUARE of it -- so a silencer squeezed into a duct that is already undersized costs far more than its catalogue figure suggests, and a 44 percent velocity increase roughly doubles the drop. INSERTION LOSS AND PRESSURE DROP ARE NOT INDEPENDENT: the geometry that absorbs sound, narrow passages and thick baffles, is the geometry that restricts flow. REGENERATED NOISE IS THE LIMIT PEOPLE DISCOVER LAST. At high face velocity the silencer generates turbulent noise of its own downstream of the baffles, and that noise is created AFTER the attenuation, so nothing removes it. Above some velocity, adding silencer length makes the system quieter on paper and no quieter in the room, because the regenerated noise has become the dominant source. Energy-summing the attenuated level and the regenerated level is what shows it, and what another ten decibels of insertion loss would actually buy against that floor is reported here, because that number is what settles the argument. Attenuation rises with LENGTH and so does pressure drop, but linearly; regenerated noise rises much faster with VELOCITY, and that asymmetry is the design rule. THE PRACTICAL SEQUENCE is to get the face velocity down by transitioning to a larger cross-section at the silencer, then choose the length for the attenuation needed, then check the drop against the fan's available static and the regenerated noise against the room criterion. A transition costs a fitting and buys back both the pressure drop and the noise floor. This scales an entered reference drop and energy-sums entered sound power figures. It does not read a manufacturer catalogue or predict insertion loss, pressure drop or regenerated noise from geometry, work in octave bands, distinguish forward from reverse flow rating (a silencer's rating differs with flow direction relative to the sound), model the duct system around it, or address breakout through the silencer's own casing. ASHRAE Applications, the silencer manufacturer's tested data, and the acoustical consultant govern.",
  };
}
export const silencerInsertionLossExample = { inputs: { airflow_cfm: 9000, face_width_in: 36, face_height_in: 24, reference_drop_in_wc: 0.35, reference_velocity_fpm: 1500, alt_face_width_in: 30, alt_face_height_in: 20, target_velocity_fpm: 1500, upstream_lw_db: 95, insertion_loss_db: 25, regenerated_lw_db: 72, fan_available_static_in_wc: 2.5 } };

// =====================================================================
// spec-v1635: mechanical room sound transmission. The subtraction is
// straightforward and every trap is in what it leaves out, so the useful
// output is the FLANKING TEST -- the gap between what the wall should
// deliver and what the room measures.
// =====================================================================
// dims: in { source_spl_db: dimensionless, partition_tl_db: dimensionless, partition_area_ft2: L^2, receiving_absorption_sabins: L^2, criterion_db: dimensionless, measured_spl_db: dimensionless, flanking_threshold_db: dimensionless } out: { received_spl_db: dimensionless, area_term_db: dimensionless, over_criterion_db: dimensionless, tl_required_db: dimensionless, measured_excess_db: dimensionless }
export function computeMechanicalRoomNc({
  source_spl_db = 0, partition_tl_db = 0, partition_area_ft2 = 0,
  receiving_absorption_sabins = 0, criterion_db = 0, measured_spl_db = 0,
  flanking_threshold_db = 5,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(source_spl_db > 0)) return { error: "The sound pressure level in the mechanical room must be greater than zero." };
  if (!(partition_tl_db > 0)) return { error: "The partition transmission loss must be greater than zero." };
  if (!(partition_area_ft2 > 0)) return { error: "The partition area must be greater than zero." };
  if (!(receiving_absorption_sabins > 0)) return { error: "The receiving room absorption must be greater than zero." };
  if (!(flanking_threshold_db > 0)) return { error: "The flanking threshold must be greater than zero." };

  const area_term_db = 10 * Math.log10(partition_area_ft2 / receiving_absorption_sabins);
  const received_spl_db = source_spl_db - partition_tl_db + area_term_db;

  const has_criterion = criterion_db > 0;
  const over_criterion_db = has_criterion ? received_spl_db - criterion_db : 0;
  const meets_criterion = has_criterion && over_criterion_db <= 1e-12;
  const tl_required_db = has_criterion ? partition_tl_db + over_criterion_db : 0;

  const has_measured = measured_spl_db > 0;
  const measured_excess_db = has_measured ? measured_spl_db - received_spl_db : 0;
  const flanking_likely = has_measured && measured_excess_db > flanking_threshold_db;
  const energy_factor = has_measured ? Math.pow(10, measured_excess_db / 10) : 1;

  const levelVerdict = fmt(source_spl_db, 0) + " dB in the mechanical room, less " + fmt(partition_tl_db, 0) + " dB of partition transmission loss, plus " + fmt(area_term_db, 1) + " dB for " + fmt(partition_area_ft2, 0) + " sq ft of partition radiating into " + fmt(receiving_absorption_sabins, 0) + " sabins, is " + fmt(received_spl_db, 1) + " dB in the receiving room";
  const criterionVerdict = !has_criterion
    ? "no room criterion was entered"
    : meets_criterion
      ? "that is inside the " + fmt(criterion_db, 0) + " dB criterion by " + fmt(-over_criterion_db, 1) + " dB"
      : "that is " + fmt(over_criterion_db, 1) + " dB OVER the " + fmt(criterion_db, 0) + " dB criterion, so the partition needs about " + fmt(tl_required_db, 0) + " dB of transmission loss rather than the " + fmt(partition_tl_db, 0) + " entered";
  const flankingVerdict = !has_measured
    ? "NO MEASURED LEVEL WAS ENTERED, AND IT IS THE MOST VALUABLE INPUT HERE. The comparison between what the wall should deliver and what the room actually reads is what separates a wall problem from a flanking problem, and the two have completely different fixes"
    : flanking_likely
      ? "THE MEASUREMENT IS " + fmt(measured_excess_db, 1) + " dB ABOVE THE CALCULATION, WHICH IS A FACTOR OF " + fmt(energy_factor, 0) + " IN ENERGY. NO WALL CONSTRUCTED AS SPECIFIED UNDERPERFORMS ITS RATING BY THAT MUCH -- THE WALL IS NOT THE PATH. Look for a partition that stops at the ceiling grid with a shared plenum over it, a duct penetrating both rooms, a shared floor slab, or an unsealed penetration. UPGRADING THE WALL HERE BUYS ALMOST NOTHING while sealing the flanking path buys all of it, and one costs a fraction of the other"
      : "the measurement is " + fmt(measured_excess_db, 1) + " dB from the calculation, inside the " + fmt(flanking_threshold_db, 1) + " dB flanking threshold -- so the wall is performing about as built, and the choice is between a better wall, a quieter machine, or vibration isolation";
  const stcVerdict = "STC DOES NOT DESCRIBE THIS. It is a single-number rating weighted for SPEECH frequencies, and mechanical equipment noise is concentrated far lower -- so a wall with a high STC can perform poorly against a chiller or a fan, and octave-band transmission loss data rather than an STC number is what this calculation needs. A partition selected on STC alone against a low-frequency source is selected on the wrong number";
  const sealVerdict = "AND A FEW SQUARE INCHES OF OPEN PENETRATION CAN UNDO AN ENTIRE ASSEMBLY, which is why sealing is not a detail. Sound follows the path of least resistance and an unsealed conduit sleeve is a very low resistance path; the wall's rating describes the wall, not the holes through it";
  const comparativeVerdict = "THE VALUE HERE IS COMPARATIVE RATHER THAN ABSOLUTE. Neither the source level nor the transmission loss is known precisely in the field, so the absolute prediction carries real uncertainty -- but the DIFFERENCE between prediction and measurement is robust, and that difference is what identifies flanking. Finding the flanking path is cheaper than any acoustic upgrade";

  return {
    area_term_db, received_spl_db, has_criterion, over_criterion_db, meets_criterion, tl_required_db,
    has_measured, measured_excess_db, flanking_likely, energy_factor,
    levelVerdict, criterionVerdict, flankingVerdict, stcVerdict, sealVerdict, comparativeVerdict,
    note: "How much of a mechanical room's noise reaches the room next door, and -- more usefully -- whether the wall is even the path. The relation is a subtraction: the source level, less the partition's transmission loss, plus a term for the partition area against the receiving room's absorption. Every trap is in what it leaves out. STC DOES NOT DESCRIBE THIS. It is a single-number rating weighted for speech frequencies, and mechanical equipment noise is concentrated far lower, so a wall with a high STC can perform poorly against a chiller or a fan. Octave-band transmission loss data rather than an STC number is what the calculation needs, and a partition selected on STC alone against a low-frequency source is selected on the wrong number. FLANKING IS WHY WALL UPGRADES DISAPPOINT. If the partition stops at the ceiling and the two rooms share a plenum, sound goes over the top and the wall's rating is nearly irrelevant; the same applies to a shared floor slab, to ducts penetrating both rooms, and to any unsealed penetration -- a few square inches of open penetration can undo an entire assembly, which is why sealing is not a detail. THE FLANKING TEST IS THE POINT OF DOING THIS AT ALL. If the calculation says the wall should deliver a given level and the room measures ten decibels higher, that is a factor of ten in energy and no wall constructed as specified underperforms by that much -- so there is a flanking path, and finding it is cheaper than any acoustic upgrade. If calculation and measurement agree, the wall is performing as built and the choice is between a better wall, a quieter machine, or vibration isolation. The absolute prediction carries real uncertainty because neither the source level nor the transmission loss is known precisely in the field; the DIFFERENCE is robust, and the difference is the finding. This is a single-band calculation on entered levels. It does not work in octave bands or compute an NC rating from a spectrum, predict transmission loss from a construction or convert an STC to band data, model flanking paths or estimate their contribution, address structure-borne transmission and vibration isolation, which is a separate and often dominant path, or determine what any standard requires. ASHRAE Applications, tested partition data, and the acoustical consultant govern.",
  };
}
export const mechanicalRoomNcExample = { inputs: { source_spl_db: 85, partition_tl_db: 38, partition_area_ft2: 200, receiving_absorption_sabins: 300, criterion_db: 40, measured_spl_db: 55, flanking_threshold_db: 5 } };

// =====================================================================
// spec-v1636: rooftop equipment wind uplift and anchorage.
//
// THE SPEC READS ITS OWN SIGN BACKWARDS. Its unit sees 1,120 lb of uplift
// and weighs 1,400, so the net is -280 lb -- the weight EXCEEDING the
// uplift by 280 -- and the spec then bolds "-280 lb still trying to lift
// it after its own weight is counted". It is not: direct uplift is fully
// resisted by the weight, and the tension on the windward fasteners comes
// entirely from the OVERTURNING COUPLE. The downstream arithmetic is
// right (its 36 lb per windward fastener checks out), so only the
// sentence is wrong -- which is exactly how this class of error survives
// review. This reports the direction IN WORDS rather than as a signed
// number, the fix carried over from the band-12 sign-convention finding.
// =====================================================================
// dims: in { unit_length_ft: L, unit_width_ft: L, unit_height_ft: L, unit_weight_lb: M L T^-2, uplift_psf: M L^-1 T^-2, lateral_psf: M L^-1 T^-2, fastener_count: dimensionless, windward_fastener_count: dimensionless, fastener_capacity_lb: M L T^-2 } out: { plan_area_ft2: L^2, uplift_lb: M L T^-2, net_uplift_lb: M L T^-2, lateral_lb: M L T^-2, overturning_ftlb: M L^2 T^-2, couple_tension_lb: M L T^-2, per_windward_lb: M L T^-2, demand_ratio: dimensionless, fasteners_required: dimensionless }
export function computeRooftopCurbUplift({
  unit_length_ft = 0, unit_width_ft = 0, unit_height_ft = 0, unit_weight_lb = 0,
  uplift_psf = 0, lateral_psf = 0, fastener_count = 0,
  windward_fastener_count = 0, fastener_capacity_lb = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(unit_length_ft > 0) || !(unit_width_ft > 0)) return { error: "Unit plan dimensions must be greater than zero." };
  if (!(unit_height_ft > 0)) return { error: "Unit height must be greater than zero." };
  if (!(unit_weight_lb > 0)) return { error: "Unit weight must be greater than zero." };
  if (!(uplift_psf > 0)) return { error: "The design uplift pressure must be greater than zero." };
  if (!(fastener_count > 0)) return { error: "The fastener count must be greater than zero." };
  if (windward_fastener_count < 0 || windward_fastener_count > fastener_count) return { error: "The windward fastener count must be between zero and the total fastener count." };

  const plan_area_ft2 = unit_length_ft * unit_width_ft;
  const uplift_lb = plan_area_ft2 * uplift_psf;
  // Positive means the wind wins; negative means the weight does. The
  // DIRECTION is reported in words below, never as a bare signed number.
  const net_uplift_lb = uplift_lb - unit_weight_lb;
  const weight_governs = net_uplift_lb <= 0;
  const weight_reserve_lb = weight_governs ? -net_uplift_lb : 0;
  const uplift_pct_of_weight = 100 * uplift_lb / unit_weight_lb;

  // Lateral wind on the side profile, acting at mid-height above the curb.
  const side_area_ft2 = unit_length_ft * unit_height_ft;
  const lateral_lb = side_area_ft2 * lateral_psf;
  const lever_arm_ft = unit_height_ft / 2;
  const overturning_ftlb = lateral_lb * lever_arm_ft;
  // Resolved across the unit's width as a couple.
  const couple_tension_lb = unit_width_ft > 0 ? overturning_ftlb / unit_width_ft : 0;

  // Each fastener takes its share of the direct net uplift (which may be a
  // hold-down rather than a tension), and the windward ones additionally
  // take their share of the couple.
  const direct_share_lb = net_uplift_lb / fastener_count;
  const has_windward = windward_fastener_count > 0;
  const couple_share_lb = has_windward ? couple_tension_lb / windward_fastener_count : 0;
  const per_windward_lb = direct_share_lb + couple_share_lb;
  const couple_dominates = couple_tension_lb > Math.max(0, net_uplift_lb);

  const has_capacity = fastener_capacity_lb > 0;
  const demand_ratio = has_capacity ? per_windward_lb / fastener_capacity_lb : 0;
  const capacity_ok = has_capacity && per_windward_lb <= fastener_capacity_lb + 1e-9;
  // How many windward fasteners the couple plus the direct share needs.
  const fasteners_required = has_capacity && per_windward_lb > 0 && windward_fastener_count > 0
    ? Math.ceil(windward_fastener_count * demand_ratio) : 0;

  const upliftVerdict = "a " + fmt(unit_length_ft, 1) + " by " + fmt(unit_width_ft, 1) + " ft unit is " + fmt(plan_area_ft2, 0) + " sq ft, so " + fmt(uplift_psf, 0) + " psf of net uplift is " + fmt(uplift_lb, 0) + " lb -- " + fmt(uplift_pct_of_weight, 0) + "% of the unit's " + fmt(unit_weight_lb, 0) + " lb weight";
  const directionVerdict = weight_governs
    ? "THE WEIGHT WINS ON DIRECT UPLIFT, with " + fmt(weight_reserve_lb, 0) + " lb of reserve: the unit's " + fmt(unit_weight_lb, 0) + " lb exceeds the " + fmt(uplift_lb, 0) + " lb of uplift, so the direct wind load is fully resisted before any fastener is counted. THAT DOES NOT MEAN THE ANCHORAGE IS ADEQUATE -- the overturning couple below is a separate demand and it is the one that governs here"
    : "THE WIND WINS ON DIRECT UPLIFT by " + fmt(net_uplift_lb, 0) + " lb: " + fmt(uplift_lb, 0) + " lb of uplift against " + fmt(unit_weight_lb, 0) + " lb of weight, and that net is distributed among the fasteners before the overturning couple is added";
  const lateralVerdict = "lateral wind on the " + fmt(unit_length_ft, 1) + " by " + fmt(unit_height_ft, 1) + " ft side profile is " + fmt(lateral_lb, 0) + " lb, acting " + fmt(lever_arm_ft, 1) + " ft above the curb for an overturning moment of " + fmt(overturning_ftlb, 0) + " ft-lb. Resolved across the " + fmt(unit_width_ft, 1) + " ft width that is a couple of " + fmt(couple_tension_lb, 0) + " lb";
  const coupleVerdict = couple_dominates
    ? "AND THE COUPLE IS THE LARGER DEMAND. It adds " + fmt(couple_tension_lb, 0) + " lb of tension to the windward side, more than the direct uplift does -- which is the part that gets omitted entirely. A TALL NARROW UNIT IS HARDER TO ANCHOR THAN A LOW WIDE ONE OF THE SAME WEIGHT, because the lever arm grows and the resolving width shrinks at the same time"
    : "the couple adds " + fmt(couple_tension_lb, 0) + " lb of tension to the windward side, on top of the direct share. It is the part that gets omitted entirely, and on a tall narrow unit it exceeds the direct uplift -- the lever arm grows and the resolving width shrinks together";
  const fastenerVerdict = "PER WINDWARD FASTENER: " + fmt(direct_share_lb, 0) + " lb of direct share " + (direct_share_lb < 0 ? "(a hold-down, since the weight governs) " : "") + "plus " + fmt(couple_share_lb, 0) + " lb from the couple is " + fmt(per_windward_lb, 0) + " lb of tension" + (has_capacity ? ", against a rated " + fmt(fastener_capacity_lb, 0) + " lb -- a demand ratio of " + fmt(demand_ratio, 2) + (capacity_ok ? ", which passes" : ", which FAILS; about " + fmt(fasteners_required, 0) + " windward fasteners are needed") : ", with no fastener capacity entered");
  const loadPathVerdict = "AND THE LOAD PATH HAS TWO PARTS, THE SECOND INVISIBLE. Fastening the unit to the curb is one connection; fastening the CURB to the roof structure is another, and once the roofing is done nobody can see it. A unit adequately screwed to a curb that is only nailed to a wood deck has a load path that fails at the deck -- and roof inspections after wind events find exactly that. This checks the first connection only";
  const zoneVerdict = "THE ROOF ZONE MATTERS MORE THAN THE PRESSURE LOOKS. Uplift on a roof near an edge or a corner is much higher than in the field of the roof, and rooftop equipment has its own provisions distinct from the roof covering's -- so the pressure entered here has to be the one for the zone the unit actually sits in, at the height it actually sits. IN HIGH SEISMIC AREAS THE LATERAL SEISMIC DEMAND MAY GOVERN OVER WIND, and it is not computed here";

  return {
    plan_area_ft2, uplift_lb, net_uplift_lb, weight_governs, weight_reserve_lb, uplift_pct_of_weight,
    side_area_ft2, lateral_lb, lever_arm_ft, overturning_ftlb, couple_tension_lb, couple_dominates,
    direct_share_lb, couple_share_lb, per_windward_lb,
    has_capacity, demand_ratio, capacity_ok, fasteners_required,
    upliftVerdict, directionVerdict, lateralVerdict, coupleVerdict, fastenerVerdict, loadPathVerdict, zoneVerdict,
    note: "Whether a rooftop unit stays on its curb in a design wind, and which of the two demands actually governs. Direct uplift is the plan area times the net uplift pressure for the roof zone, and the unit's own weight resists it -- often entirely. THE DIRECTION IS REPORTED IN WORDS RATHER THAN AS A SIGNED NUMBER, because a negative net uplift means the WEIGHT wins and it is easy to read the sign the other way. THE OVERTURNING COUPLE IS THE PART THAT GETS OMITTED ENTIRELY, and it is frequently the larger demand. Lateral wind on the unit's side profile acts at its centroid, well above the curb, and produces a moment that resolves across the unit's width as a couple, adding tension to the windward fasteners over and above the direct share. A tall narrow unit is harder to anchor than a low wide one of the same weight, because the lever arm grows and the resolving width shrinks at the same time -- and a unit whose weight fully resists direct uplift can still need real anchorage for the couple alone. THE LOAD PATH HAS TWO PARTS AND THE SECOND IS INVISIBLE. Fastening the unit to the curb is one connection; fastening the curb to the roof structure is another, and once the roofing is done nobody can see it. A unit adequately screwed to a curb that is only nailed to a wood deck has a load path that fails at the deck, and roof inspections after wind events find exactly that. This checks the first connection only. AND THE ROOF ZONE MATTERS MORE THAN THE PRESSURE LOOKS: uplift near an edge or a corner is much higher than in the field of the roof, and rooftop equipment carries its own provisions distinct from the roof covering's. This resolves entered pressures into fastener demands. It does not determine the design wind pressures, the roof zone, or the applicable provisions, check the curb-to-deck attachment or the deck itself, evaluate the curb, the rails, or the unit's own attachment points, address seismic demand, which may govern in high seismic areas, account for fastener group effects, edge distance or substrate capacity, or determine what any standard requires. ASCE 7 as adopted, the equipment and curb manufacturers, and the engineer of record govern.",
  };
}
export const rooftopCurbUpliftExample = { inputs: { unit_length_ft: 8, unit_width_ft: 5, unit_height_ft: 4, unit_weight_lb: 1400, uplift_psf: 28, lateral_psf: 22, fastener_count: 8, windward_fastener_count: 4, fastener_capacity_lb: 400 } };

HVACSYSTEMS_RENDERERS["grille-neck-nc"] = _simpleRenderer({
  compute: computeGrilleNeckNc,
  example: grilleNeckNcExample.inputs,
  citation: "Citation: neck velocity = airflow / neck free area, with the NC rating ENTERED from the manufacturer's table at that size and flow. Sound power rises roughly with the fifth power of velocity, so a size change moves the rating by 10 log10(ratio^5). ASHRAE Applications and the outlet manufacturer's sound data govern.",
  fields: [
    { key: "airflow_cfm", label: "Airflow (cfm)" },
    { key: "neck_free_area_ft2", label: "Neck free area (sq ft)" },
    { key: "rated_nc", label: "Manufacturer NC at this flow" },
    { key: "next_size_free_area_ft2", label: "Next size up, neck free area (sq ft, 0 to skip)" },
    { key: "room_nc_target", label: "Room NC target (0 to skip)" },
    { key: "room_correction_db", label: "Room correction vs the rating basis (dB)", attrs: { step: "any" } },
    { key: "damper_at_neck", label: "Balancing damper at the neck", kind: "select", default: "no", options: [{ value: "no", label: "No -- balancing is at the branch takeoff" }, { value: "yes", label: "Yes -- damper immediately behind the outlet" }] },
  ],
  outputs: [
    { key: "neck_velocity_fpm", label: "Neck velocity", unit: "fpm", value: (r) => fmt(r.neck_velocity_fpm, 0) + " fpm" },
    { key: "effective_nc", label: "NC in this room", value: (r) => "NC " + fmt(r.effective_nc, 0) + (r.has_target ? (r.meets_target ? " -- meets the target" : " -- OVER by " + fmt(r.over_target_db, 1)) : "") },
    { key: "next_velocity_fpm", label: "One size up", unit: "fpm", value: (r) => !r.has_next ? "not entered" : fmt(r.next_velocity_fpm, 0) + " fpm (" + fmt(r.velocity_drop_pct, 0) + "% slower)" },
    { key: "nc_change_db", label: "NC change one size up", unit: "dB", value: (r) => !r.has_next ? "not entered" : fmt(r.nc_change_db, 1) + " dB, to about NC " + fmt(r.next_nc, 0) },
    { key: "cfm_at_target", label: "Airflow this size meets the target at", unit: "cfm", value: (r) => !r.has_target ? "no target entered" : fmt(r.cfm_at_target, 0) + " cfm" },
    { key: "velocityVerdict", label: "Neck velocity", value: (r) => r.velocityVerdict },
    { key: "ncVerdict", label: "Against the target", value: (r) => r.ncVerdict },
    { key: "sizeVerdict", label: "One size up", value: (r) => r.sizeVerdict },
    { key: "capacityVerdict", label: "Capacity at the criterion", value: (r) => r.capacityVerdict },
    { key: "damperVerdict", label: "The damper", value: (r) => r.damperVerdict },
    { key: "roomVerdict", label: "The room", value: (r) => r.roomVerdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});

HVACSYSTEMS_RENDERERS["duct-breakout-noise"] = _simpleRenderer({
  compute: computeDuctBreakoutNoise,
  example: ductBreakoutNoiseExample.inputs,
  citation: "Citation: radiating area from the duct perimeter and exposed length; the room level from Lp = Lw - TL + 10 log10(S/A). The breakout transmission loss is ENTERED, because it depends on the duct construction and gauge. ASHRAE Applications and the acoustical consultant govern.",
  fields: [
    { key: "duct_width_in", label: "Duct width (in)" },
    { key: "duct_height_in", label: "Duct height (in)" },
    { key: "exposed_length_ft", label: "Length exposed to the space (ft)" },
    { key: "sound_power_db", label: "Sound power in the duct (dB)" },
    { key: "breakout_tl_db", label: "Breakout transmission loss (dB)" },
    { key: "room_absorption_sabins", label: "Room absorption (sabins)" },
    { key: "room_criterion_db", label: "Room criterion (dB, 0 to skip)" },
    { key: "lagging_improvement_db", label: "Lagging improvement (dB, 0 to skip)" },
  ],
  outputs: [
    { key: "exposed_area_ft2", label: "Radiating surface", unit: "sq ft", value: (r) => fmt(r.exposed_area_ft2, 0) + " sq ft" },
    { key: "aspect_ratio", label: "Aspect ratio", value: (r) => fmt(r.aspect_ratio, 1) + " to 1" + (r.wide_flat ? " -- a wide flat panel, close to the worst case" : "") },
    { key: "round_diameter_in", label: "Equal-area round duct", unit: "in", value: (r) => fmt(r.round_diameter_in, 1) + " in (typically 15 to 25 dB better at low frequency)" },
    { key: "room_spl_db", label: "Level in the room", unit: "dB", value: (r) => fmt(r.room_spl_db, 1) + " dB" + (r.has_lagging ? ", " + fmt(r.lagged_spl_db, 1) + " with the lagging entered" : "") },
    { key: "over_criterion_db", label: "Against the criterion", unit: "dB", value: (r) => !r.has_criterion ? "not entered" : r.meets_criterion ? "inside it by " + fmt(-r.over_criterion_db, 1) + " dB" : "OVER by " + fmt(r.over_criterion_db, 1) + " dB" },
    { key: "tl_required_db", label: "Transmission loss needed", unit: "dB", value: (r) => !r.has_criterion ? "not entered" : fmt(r.tl_required_db, 0) + " dB" },
    { key: "areaVerdict", label: "Radiating area", value: (r) => r.areaVerdict },
    { key: "shapeVerdict", label: "Shape", value: (r) => r.shapeVerdict },
    { key: "roundVerdict", label: "Round duct", value: (r) => r.roundVerdict },
    { key: "levelVerdict", label: "The room level", value: (r) => r.levelVerdict },
    { key: "laggingVerdict", label: "Lagging", value: (r) => r.laggingVerdict },
    { key: "criterionVerdict", label: "Against the criterion", value: (r) => r.criterionVerdict },
    { key: "silencerVerdict", label: "Why a silencer does not help", value: (r) => r.silencerVerdict },
    { key: "orderVerdict", label: "The fixes in order", value: (r) => r.orderVerdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});

HVACSYSTEMS_RENDERERS["silencer-insertion-loss"] = _simpleRenderer({
  compute: computeSilencerInsertionLoss,
  example: silencerInsertionLossExample.inputs,
  citation: "Citation: face velocity = airflow / face area; pressure drop scales with the SQUARE of face velocity from an entered reference point; the downstream sound power is the energy sum of the attenuated level and the silencer's own regenerated level, which is created after the baffles and cannot be attenuated. ASHRAE Applications and the silencer manufacturer's tested data govern.",
  fields: [
    { key: "airflow_cfm", label: "Airflow (cfm)" },
    { key: "face_width_in", label: "Silencer face width (in)" },
    { key: "face_height_in", label: "Silencer face height (in)" },
    { key: "reference_drop_in_wc", label: "Catalogue pressure drop (in wc)" },
    { key: "reference_velocity_fpm", label: "at this face velocity (fpm)" },
    { key: "alt_face_width_in", label: "Alternative face width (in, 0 to skip)" },
    { key: "alt_face_height_in", label: "Alternative face height (in)" },
    { key: "target_velocity_fpm", label: "Target face velocity (fpm, 0 to skip)" },
    { key: "upstream_lw_db", label: "Sound power upstream (dB, 0 to skip)" },
    { key: "insertion_loss_db", label: "Insertion loss (dB)" },
    { key: "regenerated_lw_db", label: "Regenerated sound power (dB, 0 to skip)" },
    { key: "fan_available_static_in_wc", label: "Fan available static (in wc, 0 to skip)" },
  ],
  outputs: [
    { key: "face_velocity_fpm", label: "Face velocity", unit: "fpm", value: (r) => fmt(r.face_velocity_fpm, 0) + " fpm across " + fmt(r.face_area_ft2, 2) + " sq ft" },
    { key: "pressure_drop_in_wc", label: "Pressure drop", unit: "in wc", value: (r) => fmt(r.pressure_drop_in_wc, 2) + " in wc" },
    { key: "alt_pressure_drop_in_wc", label: "Squeezed into the smaller face", unit: "in wc", value: (r) => !r.has_alt ? "not entered" : fmt(r.alt_pressure_drop_in_wc, 2) + " in wc at " + fmt(r.alt_face_velocity_fpm, 0) + " fpm (" + fmt(r.drop_ratio, 2) + "x)" },
    { key: "target_face_area_ft2", label: "Face area for the target velocity", unit: "sq ft", value: (r) => !r.has_target ? "not entered" : fmt(r.target_face_area_ft2, 2) + " sq ft" },
    { key: "downstream_lw_db", label: "Downstream sound power", unit: "dB", value: (r) => !r.has_acoustics ? "not entered" : fmt(r.downstream_lw_db, 1) + " dB" + (r.has_regen ? " (attenuation alone would give " + fmt(r.attenuated_lw_db, 0) + ")" : "") },
    { key: "more_il_gain_db", label: "What another 10 dB of insertion loss buys", unit: "dB", value: (r) => !r.has_acoustics ? "not entered" : fmt(r.more_il_gain_db, 1) + " dB" + (r.regen_dominates ? " -- the regenerated noise is the floor" : "") },
    { key: "static_margin_in_wc", label: "Against the fan", unit: "in wc", value: (r) => !r.has_fan ? "not entered" : r.static_short ? "SHORT by " + fmt(-r.static_margin_in_wc, 2) : fmt(r.static_margin_in_wc, 2) + " in wc spare" },
    { key: "faceVerdict", label: "Face velocity", value: (r) => r.faceVerdict },
    { key: "squeezeVerdict", label: "Squeezing it", value: (r) => r.squeezeVerdict },
    { key: "targetVerdict", label: "The transition", value: (r) => r.targetVerdict },
    { key: "regenVerdict", label: "Regenerated noise", value: (r) => r.regenVerdict },
    { key: "staticVerdict", label: "The fan", value: (r) => r.staticVerdict },
    { key: "couplingVerdict", label: "Why they trade off", value: (r) => r.couplingVerdict },
    { key: "sequenceVerdict", label: "The sequence", value: (r) => r.sequenceVerdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});

HVACSYSTEMS_RENDERERS["mechanical-room-nc"] = _simpleRenderer({
  compute: computeMechanicalRoomNc,
  example: mechanicalRoomNcExample.inputs,
  citation: "Citation: L_p2 = L_p1 - TL + 10 log10(S / A), with the transmission loss ENTERED by band -- STC is weighted for speech frequencies and mechanical noise is far lower, so an STC number is the wrong input. The flanking test compares the calculated level against a measured one. ASHRAE Applications and tested partition data govern.",
  fields: [
    { key: "source_spl_db", label: "Level in the mechanical room (dB)" },
    { key: "partition_tl_db", label: "Partition transmission loss at this band (dB)" },
    { key: "partition_area_ft2", label: "Partition area (sq ft)" },
    { key: "receiving_absorption_sabins", label: "Receiving room absorption (sabins)" },
    { key: "criterion_db", label: "Room criterion (dB, 0 to skip)" },
    { key: "measured_spl_db", label: "Measured level in the receiving room (dB, 0 to skip)" },
    { key: "flanking_threshold_db", label: "Flanking threshold (dB)" },
  ],
  outputs: [
    { key: "received_spl_db", label: "Calculated level next door", unit: "dB", value: (r) => fmt(r.received_spl_db, 1) + " dB" },
    { key: "area_term_db", label: "Area over absorption term", unit: "dB", value: (r) => fmt(r.area_term_db, 1) + " dB" },
    { key: "over_criterion_db", label: "Against the criterion", unit: "dB", value: (r) => !r.has_criterion ? "not entered" : r.meets_criterion ? "inside it by " + fmt(-r.over_criterion_db, 1) + " dB" : "OVER by " + fmt(r.over_criterion_db, 1) + " dB" },
    { key: "tl_required_db", label: "Transmission loss needed", unit: "dB", value: (r) => !r.has_criterion ? "not entered" : fmt(r.tl_required_db, 0) + " dB" },
    { key: "measured_excess_db", label: "Measured minus calculated", unit: "dB", value: (r) => !r.has_measured ? "not entered" : fmt(r.measured_excess_db, 1) + " dB" + (r.flanking_likely ? " -- FLANKING LIKELY" : "") },
    { key: "energy_factor", label: "That gap in energy", value: (r) => !r.has_measured ? "not entered" : fmt(r.energy_factor, 1) + "x" },
    { key: "levelVerdict", label: "The calculation", value: (r) => r.levelVerdict },
    { key: "criterionVerdict", label: "Against the criterion", value: (r) => r.criterionVerdict },
    { key: "flankingVerdict", label: "The flanking test", value: (r) => r.flankingVerdict },
    { key: "stcVerdict", label: "Why not STC", value: (r) => r.stcVerdict },
    { key: "sealVerdict", label: "Penetrations", value: (r) => r.sealVerdict },
    { key: "comparativeVerdict", label: "What this is good for", value: (r) => r.comparativeVerdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});

HVACSYSTEMS_RENDERERS["rooftop-curb-uplift"] = _simpleRenderer({
  compute: computeRooftopCurbUplift,
  example: rooftopCurbUpliftExample.inputs,
  citation: "Citation: uplift = plan area x the net uplift pressure for the roof zone, resisted by the unit's weight; lateral wind on the side profile acts at mid-height and resolves across the unit's width as a couple that adds tension to the windward fasteners. The design pressures are ENTERED. ASCE 7 as adopted and the engineer of record govern.",
  fields: [
    { key: "unit_length_ft", label: "Unit length (ft)" },
    { key: "unit_width_ft", label: "Unit width (ft)" },
    { key: "unit_height_ft", label: "Unit height (ft)" },
    { key: "unit_weight_lb", label: "Unit weight (lb)" },
    { key: "uplift_psf", label: "Net uplift pressure for the zone (psf)" },
    { key: "lateral_psf", label: "Lateral pressure (psf)" },
    { key: "fastener_count", label: "Total fasteners" },
    { key: "windward_fastener_count", label: "Windward fasteners" },
    { key: "fastener_capacity_lb", label: "Fastener rated tension (lb, 0 to skip)" },
  ],
  outputs: [
    { key: "uplift_lb", label: "Direct uplift", unit: "lb", value: (r) => fmt(r.uplift_lb, 0) + " lb over " + fmt(r.plan_area_ft2, 0) + " sq ft" },
    { key: "net_uplift_lb", label: "Direct uplift vs weight", value: (r) => r.weight_governs ? "the WEIGHT wins, with " + fmt(r.weight_reserve_lb, 0) + " lb of reserve" : "the WIND wins by " + fmt(r.net_uplift_lb, 0) + " lb" },
    { key: "overturning_ftlb", label: "Overturning moment", unit: "ft-lb", value: (r) => fmt(r.overturning_ftlb, 0) + " ft-lb from " + fmt(r.lateral_lb, 0) + " lb of lateral wind" },
    { key: "couple_tension_lb", label: "Couple across the width", unit: "lb", value: (r) => fmt(r.couple_tension_lb, 0) + " lb" + (r.couple_dominates ? " -- larger than the direct uplift" : "") },
    { key: "per_windward_lb", label: "Tension per windward fastener", unit: "lb", value: (r) => fmt(r.per_windward_lb, 0) + " lb" },
    { key: "demand_ratio", label: "Demand over capacity", value: (r) => !r.has_capacity ? "no capacity entered" : fmt(r.demand_ratio, 2) + (r.capacity_ok ? " -- passes" : " -- FAILS, about " + fmt(r.fasteners_required, 0) + " windward fasteners needed") },
    { key: "upliftVerdict", label: "Uplift", value: (r) => r.upliftVerdict },
    { key: "directionVerdict", label: "Which way it goes", value: (r) => r.directionVerdict },
    { key: "lateralVerdict", label: "Overturning", value: (r) => r.lateralVerdict },
    { key: "coupleVerdict", label: "The couple", value: (r) => r.coupleVerdict },
    { key: "fastenerVerdict", label: "Per fastener", value: (r) => r.fastenerVerdict },
    { key: "loadPathVerdict", label: "The second connection", value: (r) => r.loadPathVerdict },
    { key: "zoneVerdict", label: "Roof zone and seismic", value: (r) => r.zoneVerdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});

// ===================== spec-v1677: refractory lining heat loss, interface temperatures and shell temperature =====================
// A plane-wall series-resistance solve. Per unit area the layers add as t/k
// and the outer film adds 1/h, so the flux is the total drop over the total
// resistance and every interface temperature is the hot face less the flux
// times the resistance ahead of it.
// dims: in { hot_face_f: T, ambient_f: T, film_coeff_btu_hr_ft2_f: M T^-3, layer1_thickness_in: L, layer1_k: M L T^-3, layer1_limit_f: T, layer2_thickness_in: L, layer2_k: M L T^-3, layer2_limit_f: T, layer3_thickness_in: L, layer3_k: M L T^-3, layer3_limit_f: T, shell_limit_f: T, acid_dew_point_f: T } out: { total_resistance: dimensionless, flux_btu_hr_ft2: M T^-3, interface1_f: T, interface2_f: T, interface3_f: T, shell_temp_f: T }
export function computeRefractoryShellTemperature({
  hot_face_f = 0, ambient_f = 0, film_coeff_btu_hr_ft2_f = 2.0,
  layer1_thickness_in = 0, layer1_k = 0, layer1_limit_f = 0,
  layer2_thickness_in = 0, layer2_k = 0, layer2_limit_f = 0,
  layer3_thickness_in = 0, layer3_k = 0, layer3_limit_f = 0,
  shell_limit_f = 0, acid_dew_point_f = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(hot_face_f > ambient_f)) return { error: "The hot face must be above ambient." };
  if (!(film_coeff_btu_hr_ft2_f > 0)) return { error: "The outer film coefficient must be positive." };
  const layers = [
    { t: layer1_thickness_in, k: layer1_k, limit: layer1_limit_f, n: 1 },
    { t: layer2_thickness_in, k: layer2_k, limit: layer2_limit_f, n: 2 },
    { t: layer3_thickness_in, k: layer3_k, limit: layer3_limit_f, n: 3 },
  ].filter((L) => L.t > 0);
  if (!layers.length) return { error: "Enter at least one layer with a positive thickness." };
  for (const L of layers) {
    if (!(L.k > 0)) return { error: "Layer " + L.n + " needs a positive thermal conductivity." };
    if (!(L.limit >= 0)) return { error: "Layer " + L.n + " service limit cannot be negative (0 to skip)." };
  }
  // k is BTU-in / (hr ft^2 F), so t/k is already hr ft^2 F / BTU.
  const film_resistance = 1 / film_coeff_btu_hr_ft2_f;
  let total_resistance = film_resistance;
  for (const L of layers) total_resistance += L.t / L.k;
  const flux_btu_hr_ft2 = (hot_face_f - ambient_f) / total_resistance;
  // Every interface is the hot face less the flux times the resistance AHEAD of it.
  // A layer's service limit applies at its HOT face -- the interface AHEAD of it,
  // not the cooler one behind it. Checking the trailing interface passes a layer
  // that is actually cooking, which is the failure this tile exists to catch.
  let running = 0;
  const interfaces = [];
  for (const L of layers) {
    const hot_side = hot_face_f - flux_btu_hr_ft2 * running;
    running += L.t / L.k;
    const temp = hot_face_f - flux_btu_hr_ft2 * running;
    const over = L.limit > 0 && hot_side > L.limit;
    interfaces.push({ n: L.n, temp, hot_side, limit: L.limit, over });
  }
  const shell_temp_f = ambient_f + flux_btu_hr_ft2 * film_resistance;
  const layer1_hot_face_f = interfaces[0] ? interfaces[0].hot_side : 0;
  const layer2_hot_face_f = interfaces[1] ? interfaces[1].hot_side : 0;
  const layer3_hot_face_f = interfaces[2] ? interfaces[2].hot_side : 0;
  const interface1_f = interfaces[0] ? interfaces[0].temp : 0;
  const interface2_f = interfaces[1] ? interfaces[1].temp : 0;
  const interface3_f = interfaces[2] ? interfaces[2].temp : 0;
  const flux_verdict = fmt(flux_btu_hr_ft2, 0) + " BTU/hr/sq ft through " + fmt(total_resistance, 3)
    + " hr-sq ft-degF/BTU of total resistance, on a " + fmt(hot_face_f - ambient_f, 0) + " degF drop";
  // The failure this tile exists to catch: a layer BEHIND the hot face sitting
  // above its own service temperature.
  const over_layers = interfaces.filter((i) => i.over);
  const interface_verdict = interfaces
    .map((i) => "layer " + i.n + " sees " + fmt(i.hot_side, 0) + " degF on its hot face and "
      + fmt(i.temp, 0) + " degF behind it"
      + (i.limit > 0 ? (i.over ? " -- its hot face is OVER the " + fmt(i.limit, 0) + " degF service limit" : " (limit " + fmt(i.limit, 0) + ", met)") : ""))
    .join("; ");
  const backup_verdict = !over_layers.length
    ? "every entered layer's HOT FACE is inside its own service limit -- which is the face the limit applies to, not the cooler one behind it"
    : "layer " + over_layers.map((i) => i.n).join(" and ") + " has a HOT FACE above its own service temperature. Adding insulation OUTSIDE a lining pushes every interface behind it HOTTER, because less heat is escaping -- a lining 'improved' by adding an outer layer is the usual way this happens, and it shows up months later as a shell hot spot where the backup has shrunk and opened a path";
  // The shell has TWO limits and they pull in opposite directions.
  const has_shell_limit = shell_limit_f > 0;
  const shell_over = has_shell_limit && shell_temp_f > shell_limit_f;
  const has_dew_point = acid_dew_point_f > 0;
  const shell_below_dew = has_dew_point && shell_temp_f < acid_dew_point_f;
  const shell_verdict = fmt(shell_temp_f, 0) + " degF at the shell"
    + (has_shell_limit ? (shell_over ? " -- ABOVE the " + fmt(shell_limit_f, 0) + " degF limit entered" : " -- within the " + fmt(shell_limit_f, 0) + " degF limit entered") : "")
    + (has_dew_point
      ? (shell_below_dew
        ? "; and BELOW the " + fmt(acid_dew_point_f, 0) + " degF acid dew point, so on flue gas service sulphuric acid condenses on the inside of the casing and corrodes it -- over-insulating that casing to save energy is a corrosion failure, which is the opposite of the usual advice"
        : "; and above the " + fmt(acid_dew_point_f, 0) + " degF acid dew point, which is where a flue gas casing must stay")
      : "");
  if (![total_resistance, flux_btu_hr_ft2, shell_temp_f, interface1_f].every(Number.isFinite)) return { error: "Refractory lining math is not a finite value." };
  return {
    total_resistance, film_resistance, flux_btu_hr_ft2, layer_count: layers.length,
    interface1_f, interface2_f, interface3_f, shell_temp_f,
    layer1_hot_face_f, layer2_hot_face_f, layer3_hot_face_f,
    any_interface_over: over_layers.length > 0, over_layer_count: over_layers.length,
    has_shell_limit, shell_over, has_dew_point, shell_below_dew,
    flux_verdict, interface_verdict, backup_verdict, shell_verdict,
    note: "A furnace or boiler lining is a series of resistances and the whole design lives at the interfaces, not at the shell. Per unit area each layer adds its thickness over its conductivity, the outer film adds one over its coefficient, the flux is the total temperature drop over the total resistance, and every interface temperature is the hot face less the flux times the resistance ahead of it. The trap worth carrying is that INSULATING THE OUTSIDE OF A FURNACE MAKES THE INSIDE HOTTER. Adding a layer of block insulation to cut heat loss raises every interface behind the hot face, because less heat is now escaping, and a lining 'improved' that way can put the insulating firebrick above its service temperature. The failure does not appear at commissioning; it appears months later as a shell hot spot where the backup has shrunk and opened a path. So every layer addition has to be checked at every interface, not just at the shell. The shell itself carries two limits that pull in opposite directions. One is the personnel and structural limit, which wants the shell cool. The other applies on flue gas service: the casing must stay ABOVE the acid dew point, roughly 250 to 300 degF depending on the fuel's sulphur, or sulphuric acid condenses on the inside and corrodes it -- so over-insulating a flue gas casing to save energy is a corrosion failure. Conductivities are ENTERED because they vary strongly with temperature and with the specific product, and a refractory k at 2,000 degF is not its k at room temperature; the manufacturer's k-versus-mean-temperature curve is the real source and using a single value across a 2,000 degF drop is the largest approximation here. This is a one-dimensional steady-state plane wall. It does not address transient heating and the dry-out schedule a new lining requires, thermal expansion and the joints that accommodate it, corners, arches, penetrations, anchors and the thermal bridge every anchor makes, gas-side convection and radiation to the hot face, slag or chemical attack, or spalling. The refractory and insulation manufacturers' data, the furnace or boiler designer, and the applicable code govern.",
  };
}
export const refractoryShellTemperatureExample = { inputs: { hot_face_f: 2100, ambient_f: 90, film_coeff_btu_hr_ft2_f: 2.0, layer1_thickness_in: 4.5, layer1_k: 8.5, layer1_limit_f: 3000, layer2_thickness_in: 2.5, layer2_k: 1.9, layer2_limit_f: 2000, layer3_thickness_in: 2.0, layer3_k: 0.55, layer3_limit_f: 1200, shell_limit_f: 140, acid_dew_point_f: 0 } };
HVACSYSTEMS_RENDERERS["refractory-shell-temperature"] = _simpleRenderer({
  compute: computeRefractoryShellTemperature,
  example: refractoryShellTemperatureExample.inputs,
  citation: "Citation: one-dimensional steady-state plane-wall conduction -- each layer contributes thickness / conductivity and the outer film one / coefficient, the flux is the total drop over the total resistance, and each interface is the hot face less the flux times the resistance ahead of it. Conductivities are ENTERED because refractory k varies strongly with temperature and product; the manufacturer's k-versus-mean-temperature curve governs and a single value across a 2,000 degF drop is the largest approximation here. It does not address dry-out schedules, expansion joints, anchors and their thermal bridges, corners and penetrations, gas-side radiation, slag attack, or spalling. The refractory and insulation manufacturers' data and the furnace or boiler designer govern.",
  fields: [
    { key: "hot_face_f", label: "Hot face temperature (°F)" },
    { key: "ambient_f", label: "Ambient temperature (°F)" },
    { key: "film_coeff_btu_hr_ft2_f", label: "Outer film coefficient (BTU/hr/sq ft/°F)" },
    { key: "layer1_thickness_in", label: "Layer 1 (hot face) thickness (in)" },
    { key: "layer1_k", label: "Layer 1 k (BTU-in/hr/sq ft/°F)" },
    { key: "layer1_limit_f", label: "Layer 1 service limit (°F, 0 to skip)" },
    { key: "layer2_thickness_in", label: "Layer 2 (backup) thickness (in, 0 to skip)" },
    { key: "layer2_k", label: "Layer 2 k (BTU-in/hr/sq ft/°F)" },
    { key: "layer2_limit_f", label: "Layer 2 service limit (°F, 0 to skip)" },
    { key: "layer3_thickness_in", label: "Layer 3 thickness (in, 0 to skip)" },
    { key: "layer3_k", label: "Layer 3 k (BTU-in/hr/sq ft/°F)" },
    { key: "layer3_limit_f", label: "Layer 3 service limit (°F, 0 to skip)" },
    { key: "shell_limit_f", label: "Shell temperature limit (°F, 0 to skip)" },
    { key: "acid_dew_point_f", label: "Acid dew point for flue gas service (°F, 0 to skip)" },
  ],
  outputs: [
    { key: "flux_btu_hr_ft2", label: "Heat flux", unit: "BTU/hr/sq ft", value: (r) => r.flux_verdict },
    { key: "interface1_f", label: "Interface temperatures", unit: "°F", value: (r) => r.interface_verdict },
    { key: "backup", label: "The layer behind", value: (r) => r.backup_verdict },
    { key: "shell_temp_f", label: "Shell", unit: "°F", value: (r) => r.shell_verdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});

// ===================== spec-v1678: cryogenic tank boil-off rate and hold time =====================
// The boil-off is the rated normal evaporation rate applied to the contents.
// The hold time is how long the generated vapour takes to raise the vapour
// space from its current pressure to the relief setting with the vent closed,
// from the ideal gas law at the entered vapour temperature.
const _CRYO_R_PSIA_FT3_PER_LBMOL_R = 10.7316;
const _CRYO_GAL_PER_FT3 = 7.480519;
// dims: in { tank_volume_gal: L^3, ner_pct_per_day: dimensionless, liquid_density_lb_gal: M L^-3, latent_heat_btu_lb: L^2 T^-2, vapour_space_pct: dimensionless, current_pressure_psig: M L^-1 T^-2, relief_pressure_psig: M L^-1 T^-2, molecular_weight: dimensionless, vapour_temp_r: T, alt_vapour_space_pct: dimensionless, withdrawal_gal_day: L^3 } out: { boil_off_gal_day: L^3, boil_off_lb_day: M, heat_leak_btu_hr: M L^2 T^-3, vapour_space_ft3: L^3, hold_time_hr: T, alt_hold_time_hr: T }
export function computeCryogenicBoiloff({
  tank_volume_gal = 0, ner_pct_per_day = 0, liquid_density_lb_gal = 0, latent_heat_btu_lb = 0,
  vapour_space_pct = 0, current_pressure_psig = 0, relief_pressure_psig = 0,
  molecular_weight = 0, vapour_temp_r = 0, alt_vapour_space_pct = 0, withdrawal_gal_day = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(tank_volume_gal > 0)) return { error: "Tank volume must be positive." };
  if (!(ner_pct_per_day > 0)) return { error: "The normal evaporation rate must be positive." };
  if (!(liquid_density_lb_gal > 0)) return { error: "Liquid density must be positive." };
  if (!(latent_heat_btu_lb >= 0)) return { error: "Latent heat cannot be negative (0 to skip the heat leak)." };
  if (!(vapour_space_pct >= 0 && vapour_space_pct <= 100)) return { error: "The vapour space must be between 0 and 100 percent of the tank." };
  if (!(alt_vapour_space_pct >= 0 && alt_vapour_space_pct <= 100)) return { error: "The alternative vapour space must be between 0 and 100 percent." };
  if (!(withdrawal_gal_day >= 0)) return { error: "Withdrawal cannot be negative." };
  if (!(relief_pressure_psig >= 0 && current_pressure_psig >= 0)) return { error: "Pressures cannot be negative." };
  // The boil-off itself: the rated percentage of the contents, every day, used or not.
  const boil_off_gal_day = tank_volume_gal * (ner_pct_per_day / 100);
  const boil_off_lb_day = boil_off_gal_day * liquid_density_lb_gal;
  const boil_off_lb_hr = boil_off_lb_day / 24;
  const heat_leak_btu_hr = boil_off_lb_hr * latent_heat_btu_lb;
  const boil_off_verdict = fmt(boil_off_gal_day, 1) + " gallons a day (" + fmt(boil_off_lb_day, 0)
    + " lb) whether the tank is used or not, or " + fmt(boil_off_gal_day * 30, 0) + " gallons a month"
    + (latent_heat_btu_lb > 0 ? ", which is " + fmt(heat_leak_btu_hr, 0) + " BTU/hr of heat leaking into the tank" : "");
  // Boil-off against actual use, which is the argument for tank sizing.
  const has_withdrawal = withdrawal_gal_day > 0;
  const boil_off_exceeds_use = has_withdrawal && boil_off_gal_day > withdrawal_gal_day;
  const use_verdict = !has_withdrawal
    ? "(no withdrawal rate entered)"
    : boil_off_exceeds_use
      ? "BOIL-OFF EXCEEDS USE: " + fmt(boil_off_gal_day, 1) + " a day lost against " + fmt(withdrawal_gal_day, 1)
        + " a day drawn, so the tank loses more than the process takes -- a smaller tank, or a larger one on a shared site, is the answer, since a larger tank has less surface area per unit volume and a LOWER percentage boil-off"
      : fmt(boil_off_gal_day, 1) + " a day lost against " + fmt(withdrawal_gal_day, 1) + " a day drawn, so boil-off is "
        + fmt(boil_off_gal_day / withdrawal_gal_day * 100, 0) + "% of consumption";
  // Hold time: the vapour the boil-off adds to a CLOSED tank, raising the pressure
  // to the relief setting. Ideal gas at the entered vapour temperature.
  const has_hold = vapour_space_pct > 0 && molecular_weight > 0 && vapour_temp_r > 0 && relief_pressure_psig > current_pressure_psig;
  const vapour_space_ft3 = tank_volume_gal * (vapour_space_pct / 100) / _CRYO_GAL_PER_FT3;
  const holdTime = (spacePct) => {
    const v = tank_volume_gal * (spacePct / 100) / _CRYO_GAL_PER_FT3;
    const dP = relief_pressure_psig - current_pressure_psig;
    const dm = dP * v * molecular_weight / (_CRYO_R_PSIA_FT3_PER_LBMOL_R * vapour_temp_r);
    return dm / boil_off_lb_hr;
  };
  const hold_time_hr = has_hold ? holdTime(vapour_space_pct) : 0;
  const hold_verdict = !has_hold
    ? "(enter a vapour space, molecular weight, vapour temperature, and a relief pressure above the current one)"
    : fmt(hold_time_hr, 1) + " hours to reach " + fmt(relief_pressure_psig, 0) + " psig from " + fmt(current_pressure_psig, 0)
      + " psig with the vent closed, on " + fmt(vapour_space_ft3, 0) + " cu ft of vapour space";
  // The counterintuitive one: a FULLER tank has LESS margin, not more.
  const has_alt = has_hold && alt_vapour_space_pct > 0;
  const alt_hold_time_hr = has_alt ? holdTime(alt_vapour_space_pct) : 0;
  const fuller = has_alt && alt_vapour_space_pct < vapour_space_pct;
  const alt_verdict = !has_alt
    ? "(no alternative fill level entered)"
    : "at a " + fmt(alt_vapour_space_pct, 0) + "% vapour space it holds " + fmt(alt_hold_time_hr, 1) + " hours, "
      + (alt_hold_time_hr > hold_time_hr ? "LONGER" : "SHORTER") + " than the " + fmt(hold_time_hr, 1)
      + " above -- the hold time is proportional to the vapour space, so "
      + (fuller
        ? "the FULLER tank is the one with less margin, which is the opposite of the intuition that a full tank is a safe tank"
        : "the emptier tank holds longer; a full tank is not a tank with more margin, it has less");
  if (![boil_off_gal_day, boil_off_lb_day, heat_leak_btu_hr, hold_time_hr, alt_hold_time_hr].every(Number.isFinite)) return { error: "Cryogenic boil-off math is not a finite value." };
  return {
    boil_off_gal_day, boil_off_lb_day, boil_off_lb_hr, heat_leak_btu_hr, boil_off_verdict,
    has_withdrawal, boil_off_exceeds_use, use_verdict,
    has_hold, vapour_space_ft3, hold_time_hr, hold_verdict,
    has_alt, alt_hold_time_hr, fuller, alt_verdict,
    note: "What a cryogenic tank loses standing still, and how long it holds with the vent closed. The boil-off is the rated normal evaporation rate applied to the contents: an 11,000 gallon liquid nitrogen tank at 0.25% a day loses 27.5 gallons every day, used or not, which is 825 gallons a month. On a site whose consumption is lower than that, boil-off exceeds use and the tank is losing more than the process takes. That is the argument for tank sizing running counter to intuition -- a LARGER tank has less surface area per unit volume, so its percentage boil-off is lower, and two half-size tanks lose more than one full-size tank holding the same total. The hold time is the second half and it is where the intuition is backwards. With the vent closed the boil-off has nowhere to go, so it pressurizes the vapour space, and the time to reach the relief setting is proportional to how much vapour space there is. A tank at 90% full has a small vapour space and lifts its relief quickly; the same tank at 40% full holds for considerably longer. A full tank is not a tank with more margin -- it has less. The hold time here is a SCREENING estimate from the ideal gas law at the entered vapour temperature: it holds that temperature constant and ignores liquid stratification, the saturated coupling between liquid and vapour, and heat going into warming the liquid, all of which matter in a real tank, so the manufacturer's published hold-time data governs. The rated evaporation rate is itself a manufacturer figure measured under defined conditions at a stated fill and pressure, and real boil-off varies with fill level, ambient temperature, and solar exposure. A tank boiling off at many times its rating -- 2% a day where 0.25 is rated -- has lost the vacuum in its annulus, which frost or sweating on the outer jacket confirms; that is a tank problem rather than a fitting leak, and an insulated vessel that is no longer insulated vents continuously. It does not size relief devices, which are a mandatory safety system that must cover the fire case as well as normal boil-off, and it does not address the pressure building coil, the economizer, or the withdrawal behaviour that changes tank pressure during use. It does not address the asphyxiation hazard of cryogenic gases in confined or poorly ventilated spaces, which is the leading cause of cryogenic fatalities, or the cold burn and material embrittlement hazards. The tank manufacturer's data and operating instructions, CGA standards, NFPA 55, and the gas supplier govern.",
  };
}
export const cryogenicBoiloffExample = { inputs: { tank_volume_gal: 11000, ner_pct_per_day: 0.25, liquid_density_lb_gal: 6.75, latent_heat_btu_lb: 85.6, vapour_space_pct: 20, current_pressure_psig: 30, relief_pressure_psig: 75, molecular_weight: 28.01, vapour_temp_r: 200, alt_vapour_space_pct: 60, withdrawal_gal_day: 20 } };
HVACSYSTEMS_RENDERERS["cryogenic-boiloff"] = _simpleRenderer({
  compute: computeCryogenicBoiloff,
  example: cryogenicBoiloffExample.inputs,
  citation: "Citation: boil-off = tank contents x the manufacturer's rated normal evaporation rate, with the heat leak that rate implies through the latent heat of vaporization; hold time from the ideal gas law, as the vapour mass needed to raise the vapour space from its current pressure to the relief setting divided by the boil-off rate. The hold time is a SCREENING estimate -- it holds the vapour temperature constant and ignores liquid stratification and the saturated liquid-vapour coupling, so the manufacturer's published hold-time data governs. It does not size relief devices, which must also cover the fire case, and does not address the asphyxiation, cold burn, or embrittlement hazards. CGA standards, NFPA 55, and the tank manufacturer govern.",
  fields: [
    { key: "tank_volume_gal", label: "Tank volume (gal)" },
    { key: "ner_pct_per_day", label: "Normal evaporation rate (% per day)" },
    { key: "liquid_density_lb_gal", label: "Liquid density (lb/gal)" },
    { key: "latent_heat_btu_lb", label: "Latent heat of vaporization (BTU/lb, 0 to skip)" },
    { key: "vapour_space_pct", label: "Vapour space (% of tank, 0 to skip hold time)" },
    { key: "current_pressure_psig", label: "Current pressure (psig)" },
    { key: "relief_pressure_psig", label: "Relief setting (psig)" },
    { key: "molecular_weight", label: "Gas molecular weight (N₂ 28.01, O₂ 32.00, Ar 39.95)" },
    { key: "vapour_temp_r", label: "Vapour temperature (°R)" },
    { key: "alt_vapour_space_pct", label: "Alternative vapour space (%, 0 to skip)" },
    { key: "withdrawal_gal_day", label: "Withdrawal (gal/day, 0 to skip)" },
  ],
  outputs: [
    { key: "boil_off_gal_day", label: "Boil-off", unit: "gal/day", value: (r) => r.boil_off_verdict },
    { key: "use", label: "Against actual use", value: (r) => r.use_verdict },
    { key: "hold_time_hr", label: "Hold time to relief", unit: "hr", value: (r) => r.hold_verdict },
    { key: "alt_hold_time_hr", label: "At another fill level", unit: "hr", value: (r) => r.alt_verdict },
    { key: "note", label: "Note", value: (r) => r.note },
  ],
});
