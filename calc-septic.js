// Group B: Onsite-wastewater / septic calculators.
//
// spec-v86 cap-relief split: the cohesive onsite-wastewater bench --
// static-tank sizing, soil-absorption (drainfield) area, timed-dose tank
// working volume, pump-out interval from sludge accumulation, and
// low-pressure-pipe orifice flow -- relocated out of calc-plumbing.js (which
// had reached 98.9% of its gzip cap, the tightest remaining calc module after
// the v83 septic-pressure-distribution bench landed there). These five tiles
// model the septic side of a building's plumbing, distinct from the supply,
// DWV, drainage, and hydronic tiles that stay in calc-plumbing.js. All five
// KEEP group: "B" (a tile's group letter is independent of the module that
// holds it, the spec-v42 / spec-v70..v82 precedent); their ids, citations,
// worked examples, dimensional annotations, and behavior are byte-for-byte
// unchanged.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeOutputLine, attachExampleButton, fmt,
  DEBOUNCE_MS as _V7P_DEB, debounce as _v7p_debounce, fmt as _v7p_fmt,
  makeNumber as _v7p_makeNumber, attachExampleButton as _v7p_attachEx,
  makeOutputLine as _v7p_makeOut,
} from "./ui-fields.js";
import { renderLimitationBanner, getLimitationCopy } from "./limitation-banner.js";

// v18 §7 contract guard: reject a non-finite numeric input. A renderer
// coerces an empty number field to 0 (Number("") === 0), so a NaN or
// Infinity reaching a solver is genuinely unusable (a pasted 1e999, a
// degenerate computed slot); per the spec-v18 §2 output contract the
// solver returns {error} rather than leaking a non-finite output field.
// Generic over the input object, so it needs no per-tile slot list, and
// it inspects only own numeric values (strings/arrays/null pass through).
// Non-exported, so it adds no v14 derivation-corpus row. (Copied verbatim
// from calc-plumbing.js, which still uses it for its remaining tiles, so the
// split leaves no cross-module import.)
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

// --- Utility 74: Septic Tank Sizing ---

// dims: in { bedrooms: dimensionless, gallons_per_day: L^3 T^-1 } out: { tank_gal: L^3 }
export function computeSepticTank({ bedrooms, gallons_per_day }) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const gpd = Number(gallons_per_day) > 0 ? Number(gallons_per_day) : (Number(bedrooms) || 0) * 150;
  if (gpd <= 0) return { error: "Provide bedrooms or daily flow gpd." };
  // Standard rule: tank gallons >= 2 * daily flow, with 1000 gal floor.
  const recommended = Math.max(1000, 2 * gpd);
  return {
    daily_flow_gpd: gpd,
    minimum_tank_gallons: recommended,
    floor_gallons: 1000,
  };
}

export const septicTankExample = {
  inputs: { bedrooms: 3 },
  expected: { daily_flow_gpd: 450, minimum_tank_gallons: 1000 },
};

// --- 240: Septic Drainfield Trench Length ---
//
// Required absorption area = daily_flow_gpd / application_rate_gpd_per_ft2.
// Trench linear feet = required_area / trench_width_ft.

// dims: in { args: dimensionless } out: { area_ft2: L^2, length_ft: L }
export function computeSepticDrainfield({
  design_flow_gpd = 0,
  application_rate_gpd_per_ft2 = 0,
  trench_width_ft = 3,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(design_flow_gpd > 0)) return { error: "Design daily flow must be positive." };
  if (!(application_rate_gpd_per_ft2 > 0)) return { error: "Application rate must be positive." };
  if (!(trench_width_ft > 0)) return { error: "Trench width must be positive." };
  const required_area_ft2 = design_flow_gpd / application_rate_gpd_per_ft2;
  const trench_feet = required_area_ft2 / trench_width_ft;
  return { required_area_ft2, trench_feet, design_flow_gpd, application_rate_gpd_per_ft2 };
}

export const septicDrainfieldExample = {
  inputs: { design_flow_gpd: 600, application_rate_gpd_per_ft2: 0.6, trench_width_ft: 3 },
};

// septic-drainfield-capacity: inverse of septic-drainfield. The forward tile
// sizes the absorption area from a design flow; given the trench a lot can fit,
// this returns the design flow the field supports and the bedroom count it
// permits. design_flow = trench_length x trench_width x application_rate;
// bedrooms = floor(design_flow / gpd_per_bedroom), EPA 150 gpd/bedroom default.
// dims: in { args: dimensionless } out: { design_flow_gpd: dimensionless, absorption_area_ft2: L^2, bedrooms: dimensionless }
export function computeSepticDrainfieldCapacity({
  available_trench_ft = 0,
  application_rate_gpd_per_ft2 = 0,
  trench_width_ft = 3,
  gpd_per_bedroom = 150,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const len = Number(available_trench_ft);
  const rate = Number(application_rate_gpd_per_ft2);
  const w = Number(trench_width_ft);
  const perBed = Number(gpd_per_bedroom) || 150;
  if (!(len > 0)) return { error: "Available trench length must be positive (ft)." };
  if (!(rate > 0)) return { error: "Application rate must be positive." };
  if (!(w > 0)) return { error: "Trench width must be positive." };
  if (!(perBed > 0)) return { error: "Design flow per bedroom must be positive (gpd)." };
  const absorption_area_ft2 = len * w;
  const design_flow_gpd = absorption_area_ft2 * rate;
  const bedrooms = Math.floor(design_flow_gpd / perBed);
  return { design_flow_gpd, absorption_area_ft2, bedrooms, gpd_per_bedroom: perBed };
}

export const septicDrainfieldCapacityExample = {
  inputs: { available_trench_ft: 300, application_rate_gpd_per_ft2: 0.6, trench_width_ft: 3, gpd_per_bedroom: 150 },
};

// --- spec-v83 onsite-septic pressure-distribution bench (3 tiles, Group B) ---
// septic-tank sizes a static tank, septic-drainfield a soil absorption area;
// these three equip the pressurized / pump-to-mound field a gravity bed cannot
// model: the timed dose volume, the pump-out interval from accumulation, and
// the low-pressure-pipe orifice flow. Sources named, not reproduced: USEPA
// Onsite Wastewater Treatment Systems Manual (EPA/625/R-00/008), university
// onsite-wastewater extension guidance, and the orifice-discharge equation.

// dims: in { daily_flow_gpd: L^3, doses_per_day: dimensionless, drainback_gal: L^3 } out: { net_dose_gal: L^3, pumped_per_dose: L^3, pumped_per_day: L^3, doses_per_day: dimensionless, void_ratio: dimensionless }
export function computeSepticDoseTank({ daily_flow_gpd, doses_per_day = 4, drainback_gal = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const flow = Number(daily_flow_gpd);
  const doses = Number(doses_per_day);
  const drainback = Number(drainback_gal);
  if (!(flow > 0)) return { error: "Daily flow must be positive (gpd)." };
  if (!(doses > 0)) return { error: "Doses per day must be positive." };
  if (!(drainback >= 0)) return { error: "Drainback cannot be negative (gal)." };
  const netDose = flow / doses;
  const pumpedPerDose = netDose + drainback;
  const pumpedPerDay = pumpedPerDose * doses;
  const voidRatio = drainback > 0 ? netDose / drainback : null;
  return {
    net_dose_gal: netDose,
    pumped_per_dose: pumpedPerDose,
    pumped_per_day: pumpedPerDay,
    doses_per_day: doses,
    void_ratio: voidRatio,
    void_ratio_ok: voidRatio === null ? true : voidRatio >= 5,
    note: "The dose should be at least about five times the volume of the laterals and manifold that drains back, so the field pressurizes fully before the dose is spent; more, smaller doses spread the load and rest the soil better than one big dose; the drainback returns to the tank and is re-pumped, so it is pumping energy, not lost flow; and the dose count, dose volume, and float settings on the permit drawing govern.",
  };
}

// dims: in { tank_gal: L^3, people: dimensionless, accum_gal_pp_yr: dimensionless, fill_fraction: dimensionless } out: { years: dimensionless, allowed_gal: L^3, annual_accum_gal: dimensionless }
export function computeSepticPumpoutInterval({ tank_gal, people, accum_gal_pp_yr = 30, fill_fraction = 0.33 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const tank = Number(tank_gal);
  const ppl = Number(people);
  const accum = Number(accum_gal_pp_yr);
  const fill = Number(fill_fraction);
  if (!(tank > 0)) return { error: "Tank volume must be positive (gal)." };
  if (!(ppl > 0)) return { error: "Household occupants must be positive." };
  if (!(accum > 0)) return { error: "Accumulation rate must be positive (gal/person/yr)." };
  if (!(fill > 0 && fill < 1)) return { error: "Fill fraction must be between 0 and 1." };
  const allowed = tank * fill;
  const annualAccum = ppl * accum;
  const years = allowed / annualAccum;
  return {
    years,
    allowed_gal: allowed,
    annual_accum_gal: annualAccum,
    note: "Accumulation varies widely with diet, water use, and whether a garbage disposal is used (a disposal roughly doubles the rate), so this is a planning estimate -- a sludge-judge or core measurement of the actual sludge and scum depth governs the call; never let the sludge reach the outlet baffle or solids wash into the field; and many states set a mandatory inspection or pumping interval that overrides any estimate.",
  };
}

// septic-tank-for-interval: inverse of septic-pumpout-interval. The forward
// tile gives years = (tank x fill) / (people x accum); sizing a tank to a
// target pumping interval is the inverse: tank = target_years x people x accum / fill.
// dims: in { target_years: dimensionless, people: dimensionless, accum_gal_pp_yr: dimensionless, fill_fraction: dimensionless } out: { tank_gal: L^3, working_gal: L^3, annual_accum_gal: dimensionless }
export function computeSepticTankForInterval({ target_years = 0, people = 0, accum_gal_pp_yr = 30, fill_fraction = 0.33 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const yrs = Number(target_years);
  const ppl = Number(people);
  const accum = Number(accum_gal_pp_yr);
  const fill = Number(fill_fraction);
  if (!(yrs > 0)) return { error: "Target interval must be positive (years)." };
  if (!(ppl > 0)) return { error: "Household occupants must be positive." };
  if (!(accum > 0)) return { error: "Accumulation rate must be positive (gal/person/yr)." };
  if (!(fill > 0 && fill < 1)) return { error: "Fill fraction must be between 0 and 1." };
  const annual_accum_gal = ppl * accum;
  const working_gal = yrs * annual_accum_gal;
  const tank_gal = working_gal / fill;
  return {
    tank_gal, working_gal, annual_accum_gal,
    note: "The tank working volume so a target number of years passes before the sludge and scum reach the pumping fill fraction: tank = years x people x accumulation / fill. Accumulation varies widely with diet, water use, and a garbage disposal (which roughly doubles the rate), so this is a planning estimate; state codes set a minimum tank size by bedroom count that usually governs the actual tank, and a sludge-judge measurement, not a calendar, governs the pumping call.",
  };
}
export const septicTankForIntervalExample = { inputs: { target_years: 5, people: 4, accum_gal_pp_yr: 30, fill_fraction: 0.33 } };

// dims: in { orifice_dia_in: L, squirt_ft: L, cd: dimensionless, orifices_per_lateral: dimensionless, num_laterals: dimensionless } out: { per_orifice_gpm: L^3 T^-1, total_orifices: dimensionless, system_gpm: L^3 T^-1, squirt_psi: M L^-1 T^-2 }
export function computeSepticLppOrifice({ orifice_dia_in, squirt_ft, cd = 0.6, orifices_per_lateral, num_laterals } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const dia = Number(orifice_dia_in);
  const squirt = Number(squirt_ft);
  const c = Number(cd);
  const perLateral = Number(orifices_per_lateral);
  const laterals = Number(num_laterals);
  if (!(dia > 0)) return { error: "Orifice diameter must be positive (in)." };
  if (!(squirt > 0)) return { error: "Squirt height must be positive (ft)." };
  if (!(c > 0)) return { error: "Discharge coefficient must be positive." };
  if (!(perLateral > 0)) return { error: "Orifices per lateral must be positive." };
  if (!(laterals > 0)) return { error: "Number of laterals must be positive." };
  // Orifice discharge: Q(gpm) = 19.63 * Cd * d_in^2 * sqrt(h_ft); Cd = 0.6 gives the familiar 11.79 coefficient.
  const perOrifice = 19.63 * c * dia * dia * Math.sqrt(squirt);
  const totalOrifices = perLateral * laterals;
  const systemGpm = perOrifice * totalOrifices;
  return {
    per_orifice_gpm: perOrifice,
    total_orifices: totalOrifices,
    system_gpm: systemGpm,
    squirt_psi: squirt * 0.433,
    note: "A uniform squirt end to end requires the manifold and laterals to be sized so the distal-to-proximal flow varies by less than about ten percent (the LPP ten-percent rule); the squirt height target is roughly 2.5 to 5 ft (about 1 to 2 psi) for LPP and higher for mound or drip systems; this system flow plus the drainback sets the dose tank and pump (pair with septic-dose-tank and pump-tdh); and orifice size, spacing, and lateral layout come from the permitted onsite design.",
  };
}

// --- Renderers ---

// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
export function renderSepticTank(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: EPA Onsite Wastewater Treatment Manual (EPA/625/R-00/008). 150 gpd per bedroom rule of thumb; tank floor 1000 gal; tank gallons >= 2 * daily flow. State primacy agency governs final design. Free at epa.gov/septic.";
  const beds = makeNumber("Bedrooms", "st-b", { step: "1", min: "0" });
  const gpd = makeNumber("Daily flow gpd (overrides bedrooms if > 0)", "st-g", { step: "any", min: "0", value: "0" });
  gpd.input.value = "0";
  for (const f of [beds, gpd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { beds.input.value = "3"; gpd.input.value = "0"; update(); });
  const oG = makeOutputLine(outputRegion, "Daily flow", "st-out-g");
  const oT = makeOutputLine(outputRegion, "Minimum tank gallons", "st-out-t");
  const update = debounce(() => {
    const r = computeSepticTank({
      bedrooms: Number(beds.input.value) || 0,
      gallons_per_day: Number(gpd.input.value) || 0,
    });
    if (r.error) { oG.textContent = r.error; oT.textContent = "-"; return; }
    oG.textContent = fmt(r.daily_flow_gpd, 0) + " gpd";
    oT.textContent = fmt(r.minimum_tank_gallons, 0) + " gal";
  }, DEBOUNCE_MS);
  for (const el of [beds.input, gpd.input]) el.addEventListener("input", update);
}

function _v7p_renderSepticDrainfield(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Required absorption area = design flow / application rate. State and county codes set the application rate. Enter the value from your local code; the tool does not bundle a per-state shard. AHJ governs.";
  // v10 §B.3 wiring: simplified-screening banner (state primacy / licensed-pro).
  renderLimitationBanner(inputRegion, getLimitationCopy("septic-drainfield"));
  _v7p_attachEx(inputRegion, () => fillExample(septicDrainfieldExample.inputs));
  const flow = _v7p_makeNumber("Design daily flow (gpd)", "sd-flow", { step: "any", min: "0" });
  const rate = _v7p_makeNumber("Application rate (gpd / ft²)", "sd-rate", { step: "any", min: "0" });
  const wid = _v7p_makeNumber("Trench width (ft)", "sd-w", { step: "any", min: "0" });
  wid.input.value = "3";
  for (const f of [flow, rate, wid]) inputRegion.appendChild(f.wrap);
  const oA = _v7p_makeOut(outputRegion, "Required absorption area", "sd-out-a");
  const oT = _v7p_makeOut(outputRegion, "Trench linear feet", "sd-out-t");
  function fillExample(x) { flow.input.value = x.design_flow_gpd; rate.input.value = x.application_rate_gpd_per_ft2; wid.input.value = x.trench_width_ft; update(); }
  const update = _v7p_debounce(() => {
    const r = computeSepticDrainfield({
      design_flow_gpd: Number(flow.input.value) || 0,
      application_rate_gpd_per_ft2: Number(rate.input.value) || 0,
      trench_width_ft: Number(wid.input.value) || 0,
    });
    if (r.error) { oA.textContent = r.error; oT.textContent = "-"; return; }
    oA.textContent = _v7p_fmt(r.required_area_ft2, 0) + " ft²";
    oT.textContent = _v7p_fmt(r.trench_feet, 1) + " ft";
  }, _V7P_DEB);
  for (const f of [flow.input, rate.input, wid.input]) f.addEventListener("input", update);
}

function _v7p_renderSepticDrainfieldCapacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Design flow a field supports = trench length x trench width x application rate (the inverse of the required-area sizing); bedrooms = flow / the code's per-bedroom design flow (EPA baseline 150 gpd/bedroom). State and county codes set the application rate and the per-bedroom flow. AHJ governs.";
  renderLimitationBanner(inputRegion, getLimitationCopy("septic-drainfield"));
  _v7p_attachEx(inputRegion, () => fillExample(septicDrainfieldCapacityExample.inputs));
  const len = _v7p_makeNumber("Available trench length (ft)", "sdc-len", { step: "any", min: "0" });
  const rate = _v7p_makeNumber("Application rate (gpd / ft²)", "sdc-rate", { step: "any", min: "0" });
  const wid = _v7p_makeNumber("Trench width (ft)", "sdc-w", { step: "any", min: "0" });
  wid.input.value = "3";
  const perBed = _v7p_makeNumber("Design flow per bedroom (gpd)", "sdc-pb", { step: "any", min: "0" });
  perBed.input.value = "150";
  for (const f of [len, rate, wid, perBed]) inputRegion.appendChild(f.wrap);
  const oF = _v7p_makeOut(outputRegion, "Design flow supported", "sdc-out-f");
  const oA = _v7p_makeOut(outputRegion, "Absorption area", "sdc-out-a");
  const oB = _v7p_makeOut(outputRegion, "Bedrooms permitted", "sdc-out-b");
  function fillExample(x) { len.input.value = x.available_trench_ft; rate.input.value = x.application_rate_gpd_per_ft2; wid.input.value = x.trench_width_ft; perBed.input.value = x.gpd_per_bedroom; update(); }
  const update = _v7p_debounce(() => {
    const r = computeSepticDrainfieldCapacity({
      available_trench_ft: Number(len.input.value) || 0,
      application_rate_gpd_per_ft2: Number(rate.input.value) || 0,
      trench_width_ft: Number(wid.input.value) || 0,
      gpd_per_bedroom: perBed.input.value === "" ? 150 : Number(perBed.input.value),
    });
    if (r.error) { oF.textContent = r.error; oA.textContent = "-"; oB.textContent = "-"; return; }
    oF.textContent = _v7p_fmt(r.design_flow_gpd, 0) + " gpd";
    oA.textContent = _v7p_fmt(r.absorption_area_ft2, 0) + " ft²";
    oB.textContent = String(r.bedrooms) + " bedroom" + (r.bedrooms === 1 ? "" : "s") + " (at " + _v7p_fmt(r.gpd_per_bedroom, 0) + " gpd each)";
  }, _V7P_DEB);
  for (const f of [len.input, rate.input, wid.input, perBed.input]) f.addEventListener("input", update);
}

function renderSepticDoseTank(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: USEPA Onsite Wastewater Treatment Systems Manual (EPA/625/R-00/008) and university onsite-wastewater extension low-pressure-pipe design guidance, by name. Net dose = daily flow / doses; the pump moves the net dose plus the drainback each cycle. Dose count, dose volume, and float settings on the permit drawing govern. Free at epa.gov/septic.";
  const flow = makeNumber("Design daily flow (gpd)", "sdt-flow", { step: "any", min: "0" });
  const doses = makeNumber("Doses per day", "sdt-doses", { step: "1", min: "0", value: "4" });
  doses.input.value = "4";
  const drainback = makeNumber("Drainback (gal)", "sdt-db", { step: "any", min: "0", value: "0" });
  drainback.input.value = "0";
  for (const f of [flow, doses, drainback]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { flow.input.value = "600"; doses.input.value = "4"; drainback.input.value = "5"; update(); });
  const oNet = makeOutputLine(outputRegion, "Net dose per cycle", "sdt-out-net");
  const oPer = makeOutputLine(outputRegion, "Pumped per cycle", "sdt-out-per");
  const oDay = makeOutputLine(outputRegion, "Pumped per day", "sdt-out-day");
  const oRatio = makeOutputLine(outputRegion, "Dose-to-void ratio", "sdt-out-ratio");
  const update = debounce(() => {
    const r = computeSepticDoseTank({
      daily_flow_gpd: Number(flow.input.value) || 0,
      doses_per_day: doses.input.value === "" ? 4 : Number(doses.input.value),
      drainback_gal: drainback.input.value === "" ? 0 : Number(drainback.input.value),
    });
    if (r.error) { oNet.textContent = r.error; for (const o of [oPer, oDay, oRatio]) o.textContent = "-"; return; }
    oNet.textContent = fmt(r.net_dose_gal, 1) + " gal";
    oPer.textContent = fmt(r.pumped_per_dose, 1) + " gal";
    oDay.textContent = fmt(r.pumped_per_day, 1) + " gal";
    oRatio.textContent = r.void_ratio === null ? "n/a (no drainback)" : fmt(r.void_ratio, 1) + (r.void_ratio_ok ? " (OK, >= 5)" : " (low -- raise the dose or cut the drainback)");
  }, DEBOUNCE_MS);
  for (const el of [flow.input, doses.input, drainback.input]) el.addEventListener("input", update);
}

function renderSepticPumpoutInterval(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: USEPA Onsite Wastewater Treatment Systems Manual (EPA/625/R-00/008) and university onsite-wastewater extension pumping-frequency guidance, by name. Years = (tank x fill fraction) / (people x accumulation per person per year). A sludge-judge measurement, not a calendar, governs. Free at epa.gov/septic.";
  const tank = makeNumber("Tank working volume (gal)", "spi-tank", { step: "any", min: "0" });
  const people = makeNumber("Household occupants", "spi-ppl", { step: "1", min: "0" });
  const accum = makeNumber("Accumulation (gal/person/yr)", "spi-accum", { step: "any", min: "0", value: "30" });
  accum.input.value = "30";
  const fill = makeNumber("Fill fraction before pumping", "spi-fill", { step: "any", min: "0", value: "0.33" });
  fill.input.value = "0.33";
  for (const f of [tank, people, accum, fill]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { tank.input.value = "1000"; people.input.value = "4"; accum.input.value = "30"; fill.input.value = "0.33"; update(); });
  const oYears = makeOutputLine(outputRegion, "Years between pump-outs", "spi-out-years");
  const oAllowed = makeOutputLine(outputRegion, "Allowed accumulation", "spi-out-allowed");
  const oAnnual = makeOutputLine(outputRegion, "Annual accumulation", "spi-out-annual");
  const update = debounce(() => {
    const r = computeSepticPumpoutInterval({
      tank_gal: Number(tank.input.value) || 0,
      people: Number(people.input.value) || 0,
      accum_gal_pp_yr: accum.input.value === "" ? 30 : Number(accum.input.value),
      fill_fraction: fill.input.value === "" ? 0.33 : Number(fill.input.value),
    });
    if (r.error) { oYears.textContent = r.error; for (const o of [oAllowed, oAnnual]) o.textContent = "-"; return; }
    oYears.textContent = fmt(r.years, 1) + " yr";
    oAllowed.textContent = fmt(r.allowed_gal, 0) + " gal";
    oAnnual.textContent = fmt(r.annual_accum_gal, 0) + " gal/yr";
  }, DEBOUNCE_MS);
  for (const el of [tank.input, people.input, accum.input, fill.input]) el.addEventListener("input", update);
}

function renderSepticTankForInterval(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: USEPA Onsite Wastewater Treatment Systems Manual (EPA/625/R-00/008) and university onsite-wastewater extension pumping-frequency guidance, by name (years = tank x fill / (people x accumulation), solved for the tank). State minimum tank sizes by bedroom count usually govern the actual tank. Free at epa.gov/septic.";
  const yrs = makeNumber("Target years between pump-outs", "sti-yrs", { step: "any", min: "0", value: "5" });
  yrs.input.value = "5";
  const people = makeNumber("Household occupants", "sti-ppl", { step: "1", min: "0" });
  const accum = makeNumber("Accumulation (gal/person/yr)", "sti-accum", { step: "any", min: "0", value: "30" });
  accum.input.value = "30";
  const fill = makeNumber("Fill fraction before pumping", "sti-fill", { step: "any", min: "0", value: "0.33" });
  fill.input.value = "0.33";
  for (const f of [yrs, people, accum, fill]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { yrs.input.value = "5"; people.input.value = "4"; accum.input.value = "30"; fill.input.value = "0.33"; update(); });
  const oTank = makeOutputLine(outputRegion, "Required tank working volume", "sti-out-tank");
  const oWork = makeOutputLine(outputRegion, "Accumulation at interval", "sti-out-work");
  const oAnnual = makeOutputLine(outputRegion, "Annual accumulation", "sti-out-annual");
  const oNote = makeOutputLine(outputRegion, "Note", "sti-out-note");
  const update = debounce(() => {
    const r = computeSepticTankForInterval({
      target_years: Number(yrs.input.value) || 0,
      people: Number(people.input.value) || 0,
      accum_gal_pp_yr: accum.input.value === "" ? 30 : Number(accum.input.value),
      fill_fraction: fill.input.value === "" ? 0.33 : Number(fill.input.value),
    });
    if (r.error) { oTank.textContent = r.error; for (const o of [oWork, oAnnual, oNote]) o.textContent = "-"; return; }
    oTank.textContent = fmt(r.tank_gal, 0) + " gal";
    oWork.textContent = fmt(r.working_gal, 0) + " gal";
    oAnnual.textContent = fmt(r.annual_accum_gal, 0) + " gal/yr";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [yrs.input, people.input, accum.input, fill.input]) el.addEventListener("input", update);
}

function renderSepticLppOrifice(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: orifice-discharge equation Q = 19.63 x Cd x d^2 x sqrt(h) (gpm, inches, feet) and university onsite-wastewater extension low-pressure-pipe design guidance, by name. Cd 0.6 gives the familiar 11.79 coefficient. Orifice size, spacing, and lateral layout come from the permitted onsite design.";
  const dia = makeNumber("Orifice diameter (in)", "slo-dia", { step: "any", min: "0", value: "0.25" });
  dia.input.value = "0.25";
  const squirt = makeNumber("Squirt height (ft)", "slo-sq", { step: "any", min: "0", value: "5" });
  squirt.input.value = "5";
  const cd = makeNumber("Discharge coefficient Cd", "slo-cd", { step: "any", min: "0", value: "0.6" });
  cd.input.value = "0.6";
  const perLat = makeNumber("Orifices per lateral", "slo-opl", { step: "1", min: "0" });
  const laterals = makeNumber("Number of laterals", "slo-nl", { step: "1", min: "0" });
  for (const f of [dia, squirt, cd, perLat, laterals]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { dia.input.value = "0.25"; squirt.input.value = "5"; cd.input.value = "0.6"; perLat.input.value = "10"; laterals.input.value = "4"; update(); });
  const oPer = makeOutputLine(outputRegion, "Flow per orifice", "slo-out-per");
  const oTot = makeOutputLine(outputRegion, "Total orifices", "slo-out-tot");
  const oSys = makeOutputLine(outputRegion, "System flow", "slo-out-sys");
  const oPsi = makeOutputLine(outputRegion, "Squirt head", "slo-out-psi");
  const update = debounce(() => {
    const r = computeSepticLppOrifice({
      orifice_dia_in: Number(dia.input.value) || 0,
      squirt_ft: Number(squirt.input.value) || 0,
      cd: cd.input.value === "" ? 0.6 : Number(cd.input.value),
      orifices_per_lateral: Number(perLat.input.value) || 0,
      num_laterals: Number(laterals.input.value) || 0,
    });
    if (r.error) { oPer.textContent = r.error; for (const o of [oTot, oSys, oPsi]) o.textContent = "-"; return; }
    oPer.textContent = fmt(r.per_orifice_gpm, 2) + " gpm";
    oTot.textContent = fmt(r.total_orifices, 0);
    oSys.textContent = fmt(r.system_gpm, 1) + " gpm";
    oPsi.textContent = fmt(r.squirt_psi, 1) + " psi";
  }, DEBOUNCE_MS);
  for (const el of [dia.input, squirt.input, cd.input, perLat.input, laterals.input]) el.addEventListener("input", update);
}

// septic-lpp-squirt-head: inverse of septic-lpp-orifice. The forward tile gives the per-orifice discharge from the squirt
// head; the inverse recovers the squirt head (residual pressure) that produces a target per-orifice discharge for a given
// orifice size, so a designer checks that the head lands in the LPP 2.5-5 ft range. From
// Q = 19.63 Cd d^2 sqrt(h), h = ( Q / (19.63 Cd d^2) )^2. Squirt pressure = h x 0.433 psi/ft.
// dims: in { per_orifice_gpm: L^3 T^-1, orifice_dia_in: L, cd: dimensionless } out: { squirt_ft: L, squirt_psi: M L^-1 T^-2 }
export function computeSepticLppSquirtHead({ per_orifice_gpm, orifice_dia_in, cd = 0.6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const q = Number(per_orifice_gpm);
  const dia = Number(orifice_dia_in);
  const c = Number(cd);
  if (!(q > 0)) return { error: "Per-orifice discharge must be positive (gpm)." };
  if (!(dia > 0)) return { error: "Orifice diameter must be positive (in)." };
  if (!(c > 0)) return { error: "Discharge coefficient must be positive." };
  const root = q / (19.63 * c * dia * dia);
  const squirt_ft = root * root;
  const squirt_psi = squirt_ft * 0.433;
  if (![squirt_ft, squirt_psi].every(Number.isFinite)) return { error: "Squirt-head math is not a finite value." };
  const in_lpp_band = squirt_ft >= 2.5 && squirt_ft <= 5;
  return {
    squirt_ft, squirt_psi, in_lpp_band,
    note: "Required squirt head for a target per-orifice discharge: from the orifice equation Q = 19.63 Cd d^2 sqrt(h), h = ( Q / (19.63 Cd d^2) )^2 (Cd 0.6 gives the familiar 11.79 coefficient), and squirt pressure = h x 0.433 psi/ft. For a low-pressure-pipe (LPP) field the squirt-head target is roughly 2.5 to 5 ft (about 1 to 2 psi), which the ten-percent distal-to-proximal rule keeps uniform end to end; a mound or drip system runs higher. This head is the RESIDUAL at the orifice, so the pump total dynamic head must add the manifold and lateral friction, the elevation lift, and the transport loss (pair with pump-tdh and septic-dose-tank). Orifice size, spacing, and lateral layout come from the permitted onsite design; the state primacy agency governs.",
  };
}
export const septicLppSquirtHeadExample = { inputs: { per_orifice_gpm: 1.275, orifice_dia_in: 0.25, cd: 0.6 } };
function renderSepticLppSquirtHead(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: LPP orifice discharge Q = 19.63 Cd d^2 sqrt(h) (Cd 0.6 gives the 11.79 coefficient) solved for the head: h = ( Q / (19.63 Cd d^2) )^2; squirt pressure = h x 0.433 psi/ft. Target squirt 2.5-5 ft (LPP). The permitted onsite design and the state primacy agency govern.";
  const q = makeNumber("Target per-orifice discharge (gpm)", "lsh-q", { step: "any", min: "0" });
  const dia = makeNumber("Orifice diameter (in)", "lsh-d", { step: "any", min: "0" });
  const cd = makeNumber("Discharge coefficient", "lsh-c", { step: "any", min: "0", value: "0.6" }); cd.input.value = "0.6";
  for (const f of [q, dia, cd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { q.input.value = "1.275"; dia.input.value = "0.25"; cd.input.value = "0.6"; update(); });
  const oH = makeOutputLine(outputRegion, "Required squirt head", "lsh-out-h");
  const oP = makeOutputLine(outputRegion, "Squirt pressure", "lsh-out-p");
  const oN = makeOutputLine(outputRegion, "Note", "lsh-out-n");
  const update = debounce(() => {
    const r = computeSepticLppSquirtHead({ per_orifice_gpm: Number(q.input.value) || 0, orifice_dia_in: Number(dia.input.value) || 0, cd: Number(cd.input.value) || 0 });
    if (r.error) { oH.textContent = r.error; oP.textContent = "-"; oN.textContent = ""; return; }
    oH.textContent = fmt(r.squirt_ft, 2) + " ft" + (r.in_lpp_band ? " (within the LPP 2.5-5 ft band)" : " (outside the LPP 2.5-5 ft band)");
    oP.textContent = fmt(r.squirt_psi, 2) + " psi";
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const el of [q.input, dia.input, cd.input]) el.addEventListener("input", update);
}

export const SEPTIC_RENDERERS = {
  "septic-tank": renderSepticTank,
  "septic-lpp-squirt-head": renderSepticLppSquirtHead,
  "septic-drainfield": _v7p_renderSepticDrainfield,
  "septic-drainfield-capacity": _v7p_renderSepticDrainfieldCapacity,
  "septic-dose-tank": renderSepticDoseTank,
  "septic-pumpout-interval": renderSepticPumpoutInterval,
  "septic-tank-for-interval": renderSepticTankForInterval,
  "septic-lpp-orifice": renderSepticLppOrifice,
  "leach-field-aggregate": renderLeachFieldAggregate,
};

// leach-field-aggregate (spec-v902): leach-field / trench drainrock volume.
// dims: in { num_trenches: dimensionless, trench_length_ft: L, trench_width_in: L, stone_depth_in: L, waste_pct: dimensionless } out: { stone_cf: L^3, stone_cy: L^3, stone_tons: M }
export function computeLeachFieldAggregate({ num_trenches = 3, trench_length_ft = 60, trench_width_in = 24, stone_depth_in = 12, waste_pct = 10 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(num_trenches > 0)) return { error: "Trench count must be positive." };
  if (!(trench_length_ft > 0)) return { error: "Trench length must be positive (ft)." };
  if (!(trench_width_in > 0)) return { error: "Trench width must be positive (in)." };
  if (!(stone_depth_in > 0)) return { error: "Stone depth must be positive (in)." };
  if (waste_pct < 0) return { error: "Waste cannot be negative (percent)." };
  const stone_cf = num_trenches * trench_length_ft * (trench_width_in / 12) * (stone_depth_in / 12);
  const stone_cy = stone_cf / 27 * (1 + waste_pct / 100);
  const stone_tons = stone_cy * 1.4;
  if (![stone_cf, stone_cy, stone_tons].every(Number.isFinite)) return { error: "Drainrock math is not a finite value." };
  return {
    stone_cf,
    stone_cy,
    stone_tons,
    note: "The trench count, width, and stone depth come from the AHJ-approved septic design and perc (the required length is septic-drainfield). The stone is washed drainrock (about 3/4 to 2.5 in). The geotextile over the stone is taken off separately. Distinct from the required-length septic-drainfield.",
  };
}

export const leachFieldAggregateExample = { inputs: { num_trenches: 3, trench_length_ft: 60, trench_width_in: 24, stone_depth_in: 12, waste_pct: 10 } };

function renderLeachFieldAggregate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: drainrock identity by name. stone = trenches x length x width x depth / 27; tons = stone x drainrock unit weight (~1.4 ton/cy). The trench dimensions come from the AHJ-approved septic design; the required length is septic-drainfield.";
  const nt = makeNumber("Number of trenches", "lfa-nt", { step: "1", min: "0", value: "3" });
  nt.input.value = "3";
  const tl = makeNumber("Trench length (ft)", "lfa-tl", { step: "any", min: "0", value: "60" });
  tl.input.value = "60";
  const tw = makeNumber("Trench width (in)", "lfa-tw", { step: "any", min: "0", value: "24" });
  tw.input.value = "24";
  const sd = makeNumber("Stone depth (in)", "lfa-sd", { step: "any", min: "0", value: "12" });
  sd.input.value = "12";
  const ws = makeNumber("Waste allowance (%)", "lfa-ws", { step: "any", min: "0", value: "10" });
  ws.input.value = "10";
  for (const f of [nt, tl, tw, sd, ws]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { nt.input.value = "3"; tl.input.value = "60"; tw.input.value = "24"; sd.input.value = "12"; ws.input.value = "10"; update(); });
  const oCy = makeOutputLine(outputRegion, "Drainrock volume", "lfa-out-cy");
  const oTons = makeOutputLine(outputRegion, "Drainrock tonnage", "lfa-out-tons");
  const update = debounce(() => {
    const r = computeLeachFieldAggregate({
      num_trenches: nt.input.value === "" ? 3 : Number(nt.input.value), trench_length_ft: tl.input.value === "" ? 60 : Number(tl.input.value),
      trench_width_in: tw.input.value === "" ? 24 : Number(tw.input.value), stone_depth_in: sd.input.value === "" ? 12 : Number(sd.input.value),
      waste_pct: ws.input.value === "" ? 10 : Number(ws.input.value),
    });
    if (r.error) { oCy.textContent = r.error; oTons.textContent = "-"; return; }
    oCy.textContent = fmt(r.stone_cy, 1) + " cy (" + fmt(r.stone_cf, 0) + " ft^3)";
    oTons.textContent = fmt(r.stone_tons, 1) + " tons";
  }, DEBOUNCE_MS);
  for (const f of [nt, tl, tw, sd, ws]) f.input.addEventListener("input", update);
}
