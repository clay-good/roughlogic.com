// calc-electricalanalysis.js -- electrical engineering analysis and equipment-sizing
// calculators split out of calc-electrical.js to relieve its gzip cap (the module
// sat at 97% of its 102 KB cap and its own ledger names a per-bench split as the
// preferred eventual fix; calc-electricalfield.js at spec-v1860 was the previous
// such split). These are second-pass analysis tiles -- transformer regulation,
// inrush, turns-ratio and loading efficiency; asymmetrical fault current; capacitor
// discharge; battery-room hydrogen ventilation; generator fuel runtime; economic
// conductor and premium-motor sizing; AWG conductor geometry; conduit jam ratio;
// termination-temperature ampacity; and EGC sizing across parallel raceways -- moved
// intact, keeping their tile ids, computes, worked examples and renderers unchanged.
// Lazy-loaded via tool-modules.js, so not in the home-view first-paint payload.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt, stepsFor,
} from "./ui-fields.js";
import {
  awgAreaCmils, awgAreaM2, awgDiameterInches, awgToNumber,
} from "./pure-math.js";
// egc-parallel-raceways (spec-v1111) sizes the EGC per raceway with the single-run
// sizer that stays in calc-electrical.js (NEC 250.122 Table), so import it by name.
import { computeEGCSize } from "./calc-electrical.js";

// Copied from calc-electrical.js: the shared finite-input guard every compute runs.
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

// Copied from calc-electrical.js: the AWG select options used by awg-wire-geometry.
function awgOptions() {
  return ["18","16","14","12","10","8","6","4","2","1","1/0","2/0","3/0","4/0"].map((v) => ({ value: v, label: v }));
}

export const ELECTRICALANALYSIS_RENDERERS = {};
// ===================== spec-v374: conduit jam ratio (Group A) =====================
// The conduit-fill tile checks cross-sectional area, but three same-size
// conductors can jam in a bend when the conduit ID / conductor OD ratio lands
// in a narrow band around 3.0 (they triangulate and wedge). The 100th tile of
// the v275-v374 campaign.

// dims: in { conduit_id_in: L, conductor_od_in: L, n_conductors: dimensionless } out: { ratio: dimensionless, jam_prone: dimensionless, n: dimensionless, ratio_straight: dimensionless }
export function computeConduitJamRatio({ conduit_id_in = 0, conductor_od_in = 0, n_conductors = 3 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const id = Number(conduit_id_in) || 0;
  const od = Number(conductor_od_in) || 0;
  const n = Number(n_conductors) || 0;
  if (!(id > 0)) return { error: "Conduit inside diameter must be positive (in)." };
  if (!(od > 0)) return { error: "Conductor outside diameter must be positive (in)." };
  if (!(od < id)) return { error: "Conductor OD must be smaller than the conduit ID." };
  if (!(n >= 1 && Number.isInteger(n))) return { error: "Number of conductors must be a whole number, at least 1." };
  // Southwire / IEEE 1185 jam ratio = 1.05 x ID / OD: a bend ovals the conduit about 5%, and that is where jams happen.
  // Until 2026-09-26 the straight ID/OD was used, flagging EC&M's 1.05 x 5.07/1.60 = 3.33 "no jam" pull as 3.17, jam-prone.
  // The conductors have to fit before they can jam: n equal circles in a circle.
  const fit_min = n === 1 ? 1 : n === 2 ? 2 : n === 3 ? 1 + 2 / Math.sqrt(3) : n === 4 ? 1 + Math.SQRT2 : null;
  if (fit_min !== null && id / od < fit_min - 1e-9) return { error: n + " conductors of this diameter do not fit in this conduit at all (ID / OD must be at least " + fit_min.toFixed(2) + ")." };
  const ratio = 1.05 * id / od;
  const in_band = ratio >= 2.8 && ratio <= 3.2;
  const jam_prone = n === 3 && in_band;
  return {
    ratio, ratio_straight: id / od, in_band, jam_prone, n,
    note: "Conduit jamming: three same-size conductors can wedge (triangulate) in a bend when the jam ratio 1.05 x conduit ID / conductor OD (the 1.05 allows for the conduit ovaling in the bend; Southwire, IEEE 1185) falls in the narrow band from about 2.8 to 3.2 - the geometry where they lock rather than slide past each other. It applies at EXACTLY three conductors; two or four+ do not triangulate the same way, so the count matters as much as the ratio. Use the NEC Chapter 9 Table 4 conduit ID and Table 5 conductor OD. A jam-prone ratio is a caution to plan the pull (lube, feed order) or upsize the conduit, not a code violation. A design aid; the NEC and the AHJ govern.",
  };
}
export const conduitJamRatioExample = { inputs: { conduit_id_in: 2.067, conductor_od_in: 0.65, n_conductors: 3 } };
function _v374renderConduitJamRatio(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: conduit jam ratio = 1.05 x conduit ID / conductor OD (the 1.05 for bend ovality, Southwire / IEEE 1185; EC&M, Simple Calculations for Cable Pulling); jamming risk for exactly three same-size conductors when the ratio is ~2.8-3.2, a widely-referenced NEC Chapter 9 pulling guideline (Table 4 conduit ID, Table 5 conductor OD). A caution, not a code limit; the NEC and the AHJ govern.";
  const id = makeNumber("Conduit inside diameter (in, NEC Ch.9 Table 4)", "cjr-id", { step: "any", min: "0" });
  const od = makeNumber("Conductor outside diameter (in, Table 5)", "cjr-od", { step: "any", min: "0" });
  const n = makeNumber("Number of conductors", "cjr-n", { step: "1", min: "1" });
  for (const f of [id, od, n]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { id.input.value = "2.067"; od.input.value = "0.65"; n.input.value = "3"; update(); });
  const oRatio = makeOutputLine(outputRegion, "Jam ratio (1.05 x ID / OD)", "cjr-out-ratio");
  const oVerdict = makeOutputLine(outputRegion, "Jam risk", "cjr-out-verdict");
  const oNote = makeOutputLine(outputRegion, "Note", "cjr-out-note");
  const update = debounce(() => {
    const r = computeConduitJamRatio({ conduit_id_in: Number(id.input.value) || 0, conductor_od_in: Number(od.input.value) || 0, n_conductors: Number(n.input.value) || 0 }); stepsFor(outputRegion, inputRegion, ["conduit_id_in", "conductor_od_in", "n_conductors"], r);
    if (r.error) { oRatio.textContent = r.error; oVerdict.textContent = "-"; oNote.textContent = ""; return; }
    oRatio.textContent = fmt(r.ratio, 2) + (r.in_band ? " (in the 2.8-3.2 jam band)" : " (outside the 2.8-3.2 band)");
    oVerdict.textContent = r.jam_prone
      ? "JAM-PRONE -- three conductors at a jam-band ratio; plan the pull or upsize the conduit"
      : (r.n === 3 ? "Not jam-prone (ratio outside the band)" : "Not jam-prone (jamming needs exactly 3 conductors; this is " + r.n + ")");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [id, od, n]) f.input.addEventListener("input", update);
}
ELECTRICALANALYSIS_RENDERERS["conduit-jam-ratio"] = _v374renderConduitJamRatio;

// ===================== spec-v471: premium motor upgrade energy savings =====================
// dims: in { hp: M L^2 T^-3, load: dimensionless, eff_standard: dimensionless, eff_premium: dimensionless, hours: T, rate_kwh: dimensionless } out: { kw_standard: M L^2 T^-3, kw_premium: M L^2 T^-3, annual_saving: dimensionless, kw_saved: M L^2 T^-3, annual_kwh_saved: M L^2 T^-2 }
export function computeMotorEfficiencyUpgradeSavings({ hp = 0, load = 0, eff_standard = 0, eff_premium = 0, hours = 0, rate_kwh = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const h = Number(hp) || 0;
  const ld = Number(load) || 0;
  const es = Number(eff_standard) || 0;
  const ep = Number(eff_premium) || 0;
  const hr = Number(hours) || 0;
  const rate = Number(rate_kwh) || 0;
  if (!(h > 0)) return { error: "Horsepower must be positive." };
  if (!(ld > 0 && ld <= 1)) return { error: "Load fraction must be between 0 and 1." };
  if (!(es > 0 && es <= 1)) return { error: "Standard efficiency must be a fraction in (0, 1]." };
  if (!(ep > 0 && ep <= 1)) return { error: "Premium efficiency must be a fraction in (0, 1]." };
  if (!(hr > 0)) return { error: "Annual run hours must be positive." };
  if (rate < 0) return { error: "Electricity rate must be non-negative." };
  if (hr > 8760) return { error: "A year has 8,760 hours." };
  if (rate > 2) return { error: "Enter the electricity rate in dollars per kWh (0.12, not 12)." };
  if (!(ep > es)) return { error: "The premium motor's efficiency must be higher than the standard motor's." };
  const kw_standard = h * 0.746 * ld / es;
  const kw_premium = h * 0.746 * ld / ep;
  const kw_saved = kw_standard - kw_premium;
  const annual_kwh_saved = kw_saved * hr;
  const annual_saving = annual_kwh_saved * rate;
  return {
    kw_standard, kw_premium, kw_saved, annual_kwh_saved, annual_saving,
    note: "Premium-motor upgrade energy saving: a motor's input power = HP x 0.746 x load / efficiency, so a more efficient motor draws less input for the same shaft work. The saving = (input at the old efficiency - input at the new) x annual run hours x the energy rate. Because the efficiency gap acts on the input power, the saving grows with load, run hours, and rate: a lightly loaded or seldom-run motor may never pay back the premium, while a fully loaded, always-on motor pays quickly. This is the energy charge only; the utility tariff (demand, time-of-use, power factor) and any utility rebate change the payback. A screening estimate, not a metered M&V.",
  };
}
export const motorEfficiencyUpgradeSavingsExample = { inputs: { hp: 50, load: 0.75, eff_standard: 0.90, eff_premium: 0.945, hours: 4000, rate_kwh: 0.12 } };
function _v471renderMotorEfficiencyUpgradeSavings(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Premium-motor upgrade saving (first-principles): input kW = HP x 0.746 x load / efficiency; annual saving = (kW at old eff - kW at new eff) x run hours x rate. The saving scales with load, hours, and rate. Energy charge only; the utility tariff and rebates change the payback. A screening estimate, not a metered M&V.";
  const hp = makeNumber("Motor horsepower", "meu-hp", { step: "any", min: "0" });
  const ld = makeNumber("Load fraction (0-1)", "meu-ld", { step: "any", min: "0", max: "1" });
  const es = makeNumber("Existing motor efficiency (0-1)", "meu-es", { step: "any", min: "0", max: "1" });
  const ep = makeNumber("Premium motor efficiency (0-1)", "meu-ep", { step: "any", min: "0", max: "1" });
  const hr = makeNumber("Annual run hours", "meu-hr", { step: "any", min: "0" });
  const rate = makeNumber("Electricity rate ($/kWh)", "meu-rate", { step: "any", min: "0" });
  for (const f of [hp, ld, es, ep, hr, rate]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { hp.input.value = "50"; ld.input.value = "0.75"; es.input.value = "0.90"; ep.input.value = "0.945"; hr.input.value = "4000"; rate.input.value = "0.12"; update(); });
  const oKw = makeOutputLine(outputRegion, "Input kW standard / premium", "meu-out-kw");
  const oSave = makeOutputLine(outputRegion, "Annual saving", "meu-out-save");
  const oNote = makeOutputLine(outputRegion, "Note", "meu-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeMotorEfficiencyUpgradeSavings({ hp: readNum(hp.input), load: readNum(ld.input), eff_standard: readNum(es.input), eff_premium: readNum(ep.input), hours: readNum(hr.input), rate_kwh: readNum(rate.input) }); stepsFor(outputRegion, inputRegion, ["hp", "load", "eff_standard", "eff_premium", "hours", "rate_kwh"], r);
    if (r.error) { oKw.textContent = r.error; oSave.textContent = "-"; oNote.textContent = ""; return; }
    oKw.textContent = fmt(r.kw_standard, 2) + " -> " + fmt(r.kw_premium, 2) + " kW (" + fmt(r.kw_saved, 2) + " kW saved)";
    oSave.textContent = "$" + fmt(r.annual_saving, 0) + "/yr (" + fmt(r.annual_kwh_saved, 0) + " kWh)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [hp, ld, es, ep, hr, rate]) f.input.addEventListener("input", update);
}
ELECTRICALANALYSIS_RENDERERS["motor-efficiency-upgrade-savings"] = _v471renderMotorEfficiencyUpgradeSavings;

// ===================== spec-v472: transformer loading efficiency and losses =====================
// dims: in { kva_rating: dimensionless, noload_w: M L^2 T^-3, loadloss_w: M L^2 T^-3, load: dimensionless, pf: dimensionless } out: { output_kw: M L^2 T^-3, losses_kw: M L^2 T^-3, efficiency: dimensionless, max_eff_load: dimensionless }
export function computeTransformerLoadingEfficiency({ kva_rating = 0, noload_w = 0, loadloss_w = 0, load = 0, pf = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const kva = Number(kva_rating) || 0;
  const nl = Number(noload_w) || 0;
  const ll = Number(loadloss_w) || 0;
  const ld = Number(load) || 0;
  const pfac = Number(pf) || 0;
  if (!(kva > 0)) return { error: "kVA rating must be positive." };
  if (!(nl > 0)) return { error: "No-load (core) loss must be positive (W)." };
  if (!(ll > 0)) return { error: "Full-load (copper) loss must be positive (W)." };
  if (!(ld > 0 && ld <= 1)) return { error: "Load fraction must be between 0 and 1." };
  if (!(pfac > 0 && pfac <= 1)) return { error: "Power factor must be between 0 and 1." };
  const output_kw = kva * ld * pfac;
  const losses_kw = (nl + ld * ld * ll) / 1000;
  const efficiency = output_kw / (output_kw + losses_kw) * 100;
  const max_eff_load = Math.sqrt(nl / ll);
  return {
    output_kw, losses_kw, efficiency, max_eff_load,
    note: "Transformer loading efficiency and losses: a transformer has a fixed no-load (core / iron) loss that runs whenever it is energized, plus a load (copper / I^2R) loss that grows with the square of the load fraction. Output kW = kVA x load x power factor; total loss kW = (no-load + load^2 x full-load loss) / 1000; efficiency = output / (output + loss). Peak efficiency occurs where the copper loss equals the core loss, at a load fraction = sqrt(no-load / full-load loss) -- typically 40-60% for a distribution transformer, which is why an oversized transformer with a large core loss has a poor all-day efficiency. A design/screening aid; the manufacturer's test report governs.",
  };
}
export const transformerLoadingEfficiencyExample = { inputs: { kva_rating: 75, noload_w: 200, loadloss_w: 1200, load: 0.75, pf: 1.0 } };
function _v472renderTransformerLoadingEfficiency(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Transformer loading efficiency (first-principles): output = kVA x load x PF; loss = (no-load + load^2 x full-load loss); efficiency = output / (output + loss); peak efficiency at load = sqrt(no-load / full-load loss). A design/screening aid; the manufacturer's test report governs.";
  const kva = makeNumber("Transformer rating (kVA)", "tle-kva", { step: "any", min: "0" });
  const nl = makeNumber("No-load (core) loss (W)", "tle-nl", { step: "any", min: "0" });
  const ll = makeNumber("Full-load (copper) loss (W)", "tle-ll", { step: "any", min: "0" });
  const ld = makeNumber("Load fraction (0-1)", "tle-ld", { step: "any", min: "0", max: "1" });
  const pf = makeNumber("Power factor (0-1)", "tle-pf", { step: "any", min: "0", max: "1" });
  for (const f of [kva, nl, ll, ld, pf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { kva.input.value = "75"; nl.input.value = "200"; ll.input.value = "1200"; ld.input.value = "0.75"; pf.input.value = "1.0"; update(); });
  const oEff = makeOutputLine(outputRegion, "Efficiency", "tle-out-eff");
  const oLoss = makeOutputLine(outputRegion, "Output / losses", "tle-out-loss");
  const oPeak = makeOutputLine(outputRegion, "Peak-efficiency load", "tle-out-peak");
  const oNote = makeOutputLine(outputRegion, "Note", "tle-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeTransformerLoadingEfficiency({ kva_rating: readNum(kva.input), noload_w: readNum(nl.input), loadloss_w: readNum(ll.input), load: readNum(ld.input), pf: readNum(pf.input) }); stepsFor(outputRegion, inputRegion, ["kva_rating", "noload_w", "loadloss_w", "load", "pf"], r);
    if (r.error) { oEff.textContent = r.error; oLoss.textContent = "-"; oPeak.textContent = "-"; oNote.textContent = ""; return; }
    oEff.textContent = fmt(r.efficiency, 2) + "%";
    oLoss.textContent = fmt(r.output_kw, 2) + " kW out, " + fmt(r.losses_kw * 1000, 0) + " W loss";
    oPeak.textContent = fmt(r.max_eff_load * 100, 0) + "% load";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [kva, nl, ll, ld, pf]) f.input.addEventListener("input", update);
}
ELECTRICALANALYSIS_RENDERERS["transformer-loading-efficiency"] = _v472renderTransformerLoadingEfficiency;

// ===================== spec-v473: economic conductor sizing (I2R payback) =====================
// dims: in { current_a: I, r_small_ohm: M L^2 T^-3 I^-2, r_big_ohm: M L^2 T^-3 I^-2, hours: T, rate_kwh: dimensionless, upsize_cost: dimensionless } out: { loss_small_kw: M L^2 T^-3, loss_big_kw: M L^2 T^-3, annual_saving: dimensionless, payback_yr: dimensionless }
export function computeEconomicConductorSizing({ current_a = 0, r_small_ohm = 0, r_big_ohm = 0, hours = 0, rate_kwh = 0, upsize_cost = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const I = Number(current_a) || 0;
  const rs = Number(r_small_ohm) || 0;
  const rb = Number(r_big_ohm) || 0;
  const hr = Number(hours) || 0;
  const rate = Number(rate_kwh) || 0;
  const cost = Number(upsize_cost) || 0;
  if (!(I > 0)) return { error: "Load current must be positive (A)." };
  if (!(rs > 0)) return { error: "Smaller-conductor resistance must be positive (ohm)." };
  if (!(rb > 0)) return { error: "Larger-conductor resistance must be positive (ohm)." };
  if (!(rb < rs)) return { error: "The larger conductor must have less resistance than the smaller one." };
  if (!(hr > 0)) return { error: "Annual run hours must be positive." };
  if (hr > 8760) return { error: "Annual run hours cannot exceed 8,760." };
  if (rate > 2) return { error: "Enter the energy rate in dollars per kWh (0.12), not cents." };
  if (rate < 0) return { error: "Electricity rate must be non-negative." };
  if (cost < 0) return { error: "Upsize cost must be non-negative." };
  const loss_small_kw = 3 * I * I * rs / 1000;
  const loss_big_kw = 3 * I * I * rb / 1000;
  const annual_saving = (loss_small_kw - loss_big_kw) * hr * rate;
  const payback_yr = annual_saving > 1e-9 ? cost / annual_saving : null;
  return {
    loss_small_kw, loss_big_kw, annual_saving, payback_yr,
    note: "Economic conductor sizing (I^2R payback): a feeder sized to the code minimum still wastes energy as heat in the conductor. Upsizing lowers the per-phase resistance, so the three-phase loss = 3 x I^2 x R drops and the annual energy saving = (loss at the small size - loss at the large) x run hours x rate. Divide the added material cost by that saving for a simple payback. Because the loss scales with the square of the current, upsizing only pays on heavily loaded, long-hour feeders; a lightly loaded or intermittent run may never earn back the copper. A screening estimate; installed cost, conduit fill, and the code minimum still govern the actual conductor.",
  };
}
export const economicConductorSizingExample = { inputs: { current_a: 100, r_small_ohm: 0.20, r_big_ohm: 0.125, hours: 4000, rate_kwh: 0.12, upsize_cost: 800 } };
function _v473renderEconomicConductorSizing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Economic conductor sizing (first-principles I^2R): three-phase loss = 3 x I^2 x R; annual saving = (loss small - loss big) x hours x rate; payback = upsize cost / saving. Pays only on heavily loaded, long-hour feeders. A screening estimate; installed cost and the code minimum still govern.";
  const I = makeNumber("Per-phase load current (A)", "ecs-i", { step: "any", min: "0" });
  const rs = makeNumber("Smaller conductor resistance (ohm, run)", "ecs-rs", { step: "any", min: "0" });
  const rb = makeNumber("Larger conductor resistance (ohm, run)", "ecs-rb", { step: "any", min: "0" });
  const hr = makeNumber("Annual run hours", "ecs-hr", { step: "any", min: "0" });
  const rate = makeNumber("Electricity rate ($/kWh)", "ecs-rate", { step: "any", min: "0" });
  const cost = makeNumber("Added upsize cost ($)", "ecs-cost", { step: "any", min: "0" });
  for (const f of [I, rs, rb, hr, rate, cost]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { I.input.value = "100"; rs.input.value = "0.20"; rb.input.value = "0.125"; hr.input.value = "4000"; rate.input.value = "0.12"; cost.input.value = "800"; update(); });
  const oLoss = makeOutputLine(outputRegion, "Loss small / big", "ecs-out-loss");
  const oSave = makeOutputLine(outputRegion, "Annual saving / payback", "ecs-out-save");
  const oNote = makeOutputLine(outputRegion, "Note", "ecs-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeEconomicConductorSizing({ current_a: readNum(I.input), r_small_ohm: readNum(rs.input), r_big_ohm: readNum(rb.input), hours: readNum(hr.input), rate_kwh: readNum(rate.input), upsize_cost: readNum(cost.input) }); stepsFor(outputRegion, inputRegion, ["current_a", "r_small_ohm", "r_big_ohm", "hours", "rate_kwh", "upsize_cost"], r);
    if (r.error) { oLoss.textContent = r.error; oSave.textContent = "-"; oNote.textContent = ""; return; }
    oLoss.textContent = fmt(r.loss_small_kw, 2) + " kW -> " + fmt(r.loss_big_kw, 2) + " kW";
    oSave.textContent = "$" + fmt(r.annual_saving, 0) + "/yr, payback " + (r.payback_yr === null ? "n/a" : fmt(r.payback_yr, 1) + " yr");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [I, rs, rb, hr, rate, cost]) f.input.addEventListener("input", update);
}
ELECTRICALANALYSIS_RENDERERS["economic-conductor-sizing"] = _v473renderEconomicConductorSizing;

// spec-v487: generator fuel runtime and backup duration. The fuel analog of
// battery-runtime for a standby genset: runtime = usable fuel / consumption,
// and the fuel/tank a target backup duration needs.
// dims: in { tank_capacity_gal: L^3, consumption_gph: L^3 T^-1, usable_pct: dimensionless, target_runtime_hr: T } out: { usable_gallons: L^3, runtime_hr: T, runtime_days: T, fuel_for_target_gal: L^3, tank_for_target_gal: L^3 }
export function computeGeneratorFuelRuntime({ tank_capacity_gal = 0, consumption_gph = 0, usable_pct = 90, target_runtime_hr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const tank = Number(tank_capacity_gal) || 0;
  const gph = Number(consumption_gph) || 0;
  const usable = Number(usable_pct) || 0;
  const target = Number(target_runtime_hr) || 0;
  if (!(tank > 0)) return { error: "Tank capacity must be positive (gal)." };
  if (!(gph > 0)) return { error: "Fuel consumption must be positive (gph)." };
  if (!(usable > 0 && usable <= 100)) return { error: "Usable fraction must be between 0 and 100 percent." };
  if (!(target >= 0)) return { error: "Target runtime must be zero or positive (hr)." };
  const usable_gallons = tank * usable / 100;
  const runtime_hr = usable_gallons / gph;
  const runtime_days = runtime_hr / 24;
  let fuel_for_target_gal = null, tank_for_target_gal = null, meets_target = null;
  if (target > 0) {
    fuel_for_target_gal = gph * target;
    tank_for_target_gal = fuel_for_target_gal / (usable / 100);
    meets_target = runtime_hr >= target * (1 - 1e-9); // 110 gal / 1.1 gph is 99.99999999999999 h
  }
  if (![usable_gallons, runtime_hr, runtime_days].every(Number.isFinite)) return { error: "Runtime math is not a finite value." };
  return {
    usable_gallons, runtime_hr, runtime_days, fuel_for_target_gal, tank_for_target_gal, meets_target,
    note: "Standby-generator fuel runtime = usable fuel / consumption, the fuel-supply companion to the battery-runtime tile. Enter the consumption at the operating load from the genset data plate (a diesel set burns roughly 0.05-0.08 gal/hr per kW at load, but read the actual spec - it climbs with load and differs by fuel). The usable fraction defaults to 90% because a tank is not drawn to the bottom (reserve, pickup height, and sediment). For a target backup duration (a 72-hour outage is a common design basis), the tile also returns the fuel and the tank size that duration needs, and whether the current tank meets it. Natural-gas and propane sets meter fuel differently (a utility gas feed has no tank limit); this is the liquid-fuel-tank case. A planning aid; the genset's published fuel curve, the fuel quality, and the AHJ's on-site fuel-storage rules govern.",
  };
}
export const generatorFuelRuntimeExample = { inputs: { tank_capacity_gal: 100, consumption_gph: 3.0, usable_pct: 90, target_runtime_hr: 72 } };
function _v487renderGeneratorFuelRuntime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: generator fuel runtime (first-principles): runtime = usable fuel / consumption; usable = tank x usable%. For a target duration, fuel = consumption x hours and the tank = fuel / usable%. Enter consumption from the genset data plate. A planning aid; the published fuel curve and the AHJ's fuel-storage rules govern.";
  const tank = makeNumber("Fuel tank capacity (gal)", "gfr-tank", { step: "any", min: "0" });
  const gph = makeNumber("Fuel consumption at load (gph)", "gfr-gph", { step: "any", min: "0" });
  const usable = makeNumber("Usable tank fraction (%)", "gfr-usable", { step: "any", min: "0", max: "100" });
  const target = makeNumber("Target backup duration (hr, 0 to skip)", "gfr-target", { step: "any", min: "0" });
  for (const f of [tank, gph, usable, target]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { tank.input.value = "100"; gph.input.value = "3.0"; usable.input.value = "90"; target.input.value = "72"; update(); });
  const oRun = makeOutputLine(outputRegion, "Runtime on a full tank", "gfr-out-run");
  const oUsable = makeOutputLine(outputRegion, "Usable fuel", "gfr-out-usable");
  const oTarget = makeOutputLine(outputRegion, "For the target duration", "gfr-out-target");
  const oNote = makeOutputLine(outputRegion, "Note", "gfr-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeGeneratorFuelRuntime({ tank_capacity_gal: readNum(tank.input), consumption_gph: readNum(gph.input), usable_pct: usable.input.value === "" ? 90 : readNum(usable.input), target_runtime_hr: readNum(target.input) }); stepsFor(outputRegion, inputRegion, ["tank_capacity_gal", "consumption_gph", "usable_pct", "target_runtime_hr"], r);
    if (r.error) { oRun.textContent = r.error; oUsable.textContent = "-"; oTarget.textContent = "-"; oNote.textContent = ""; return; }
    oRun.textContent = fmt(r.runtime_hr, 1) + " hr (" + fmt(r.runtime_days, 2) + " days)";
    oUsable.textContent = fmt(r.usable_gallons, 1) + " gal";
    oTarget.textContent = r.fuel_for_target_gal === null ? "-" : fmt(r.fuel_for_target_gal, 0) + " gal, needs a " + fmt(r.tank_for_target_gal, 0) + " gal tank (" + (r.meets_target ? "current tank MEETS it" : "current tank does NOT meet it") + ")";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [tank, gph, usable, target]) f.input.addEventListener("input", update);
}
ELECTRICALANALYSIS_RENDERERS["generator-fuel-runtime"] = _v487renderGeneratorFuelRuntime;

// ===================== spec-v494: transformer voltage regulation from %R and %X =====================
// dims: in { percent_r: dimensionless, percent_x: dimensionless, power_factor: dimensionless, leading: dimensionless, load_fraction: dimensionless } out: { cos: dimensionless, sin: dimensionless, main_term: dimensionless, quad_term: dimensionless, vr_percent: dimensionless }
export function computeTransformerVoltageRegulation({ percent_r = 0, percent_x = 0, power_factor = 0.85, leading = false, load_fraction = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const pr = Number(percent_r) || 0;
  const px = Number(percent_x) || 0;
  const pf = Number(power_factor) || 0;
  const ld = Number(load_fraction) || 0;
  if (pr < 0) return { error: "%R cannot be negative." };
  if (px < 0) return { error: "%X cannot be negative." };
  if (!(pf > 0 && pf <= 1)) return { error: "Power factor must be over 0 and at most 1." };
  if (ld < 0) return { error: "Per-unit loading cannot be negative." };
  if (ld > 3) return { error: "Enter the load as a per-unit fraction of the rating (1.0 = full load), not a percent." };
  const cos = pf;
  const sin = Math.sqrt(Math.max(0, 1 - pf * pf)) * (leading === true || leading === "true" || leading === "leading" ? -1 : 1);
  const main_term = ld * (pr * cos + px * sin);
  const quad_term = ld * ld * Math.pow(px * cos - pr * sin, 2) / 200;
  const vr_percent = main_term + quad_term;
  if (![cos, sin, main_term, quad_term, vr_percent].every(Number.isFinite)) return { error: "Voltage-regulation math is not a finite value." };
  return {
    cos, sin, main_term, quad_term, vr_percent,
    note: "Transformer voltage regulation is the drop from no-load to full-load at the transformer terminals: VR% = load x (%R cos + %X sin) + load^2 x (%X cos - %R sin)^2 / 200, with sin taking the load's sign (negative for a leading power factor). The nameplate %Z alone does not give it -- the drop depends on how %Z splits between %R and %X and on the load power factor. A lagging load (motors) sags the voltage; a leading load (an over-corrected plant or a PV inverter exporting reactive power) can raise the secondary above nominal, tripping over-voltage relays. The quadrature term is a small correction that grows with the square of loading. This is the terminal regulation, not the full feeder drop -- conductor voltage drop adds to it. A design aid, not the utility's voltage study.",
  };
}
export const transformerVoltageRegulationExample = { inputs: { percent_r: 1.2, percent_x: 5.0, power_factor: 0.85, leading: false, load_fraction: 1.0 } };
function _v494renderTransformerVoltageRegulation(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Transformer voltage-regulation approximation (from %R, %X, and load power factor): VR% = load x (%R cos + %X sin) + load^2 x (%X cos - %R sin)^2 / 200, sin negative for a leading power factor. An IEEE C57 test-report quantity; %Z alone does not give it because it depends on the %R / %X split and the power factor. Terminal regulation, not the feeder drop. A design aid; the utility's voltage study governs.";
  const pr = makeNumber("Transformer %R (from test report)", "tvr-r", { step: "any", min: "0" });
  const px = makeNumber("Transformer %X (from test report)", "tvr-x", { step: "any", min: "0" });
  const pf = makeNumber("Load power factor (0-1)", "tvr-pf", { step: "any", min: "0", max: "1" });
  const lead = makeSelect("Power-factor type", "tvr-lead", [
    { value: "lagging", label: "Lagging (motors) - voltage sags", selected: true },
    { value: "leading", label: "Leading (over-corrected / exporting) - voltage rises" },
  ]);
  const ld = makeNumber("Per-unit loading (1.0 = full load)", "tvr-ld", { step: "any", min: "0" });
  for (const f of [pr, px, pf]) inputRegion.appendChild(f.wrap);
  inputRegion.appendChild(lead.wrap);
  inputRegion.appendChild(ld.wrap);
  attachExampleButton(inputRegion, () => { pr.input.value = "1.2"; px.input.value = "5.0"; pf.input.value = "0.85"; lead.select.value = "lagging"; ld.input.value = "1.0"; update(); });
  const oVr = makeOutputLine(outputRegion, "Voltage regulation", "tvr-out-vr");
  const oMain = makeOutputLine(outputRegion, "Main term / quadrature term", "tvr-out-terms");
  const oNote = makeOutputLine(outputRegion, "Note", "tvr-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeTransformerVoltageRegulation({ percent_r: readNum(pr.input), percent_x: readNum(px.input), power_factor: pf.input.value === "" ? 0.85 : readNum(pf.input), leading: lead.select.value === "leading", load_fraction: ld.input.value === "" ? 1.0 : readNum(ld.input) }); stepsFor(outputRegion, inputRegion, ["percent_r", "percent_x", "power_factor", "leading", "load_fraction"], r);
    if (r.error) { oVr.textContent = r.error; oMain.textContent = "-"; oNote.textContent = ""; return; }
    oVr.textContent = (r.vr_percent >= 0 ? "+" : "") + fmt(r.vr_percent, Math.abs(r.vr_percent - 0) < 0.005 && r.vr_percent !== 0 ? 4 : 2) + "%" + (r.vr_percent < 0 ? " (voltage RISES above nominal)" : " (voltage sags)");
    oMain.textContent = fmt(r.main_term, 3) + "% + " + fmt(r.quad_term, 3) + "%";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [pr, px, pf, ld]) f.input.addEventListener("input", update);
  lead.select.addEventListener("change", update);
}
ELECTRICALANALYSIS_RENDERERS["transformer-voltage-regulation"] = _v494renderTransformerVoltageRegulation;
// spec-v1184 hand-authored field schema (bespoke renderer; keys match
// computeTransformerVoltageRegulation's parameters; `leading` is the boolean the
// select resolves to, shown here as a checkbox so the agent sees a boolean input).
_v494renderTransformerVoltageRegulation.schema = {
  inputs: [
    { key: "percent_r", label: "Transformer %R (from test report)", kind: "number", options: null, default: null, attrs: { step: "any", min: "0" } },
    { key: "percent_x", label: "Transformer %X (from test report)", kind: "number", options: null, default: null, attrs: { step: "any", min: "0" } },
    { key: "power_factor", label: "Load power factor (0-1)", kind: "number", options: null, default: "0.85", attrs: { step: "any", min: "0", max: "1" } },
    { key: "leading", label: "Leading power factor (over-corrected / exporting)", kind: "checkbox", options: null, default: null, attrs: null },
    { key: "load_fraction", label: "Per-unit loading (1.0 = full load)", kind: "number", options: null, default: "1.0", attrs: { step: "any", min: "0" } },
  ],
  outputs: [
    { key: "vr_percent", label: "Voltage regulation", unit: "%", format: (r) => (r.vr_percent == null ? "-" : fmt(r.vr_percent, 2) + " %") },
    { key: "main_term", label: "Main term", unit: "%", format: (r) => (r.main_term == null ? "-" : fmt(r.main_term, 2) + " %") },
    { key: "quad_term", label: "Quadrature term", unit: "%", format: (r) => (r.quad_term == null ? "-" : fmt(r.quad_term, 3) + " %") },
    { key: "note", label: "Note", unit: null, format: (r) => String(r.note) },
  ],
  citation: "Citation: Transformer voltage-regulation approximation VR% = load x (%R cos + %X sin) + load^2 x (%X cos - %R sin)^2 / 200, sin negative for a leading power factor. Terminal regulation, not the feeder drop.",
  scope: null,
};

// ===================== spec-v495: capacitor discharge time and bleed resistor (NEC 460.6) =====================
// dims: in { capacitance_uf: M^-1 L^-2 T^4 I^2, initial_voltage: M L^2 T^-3 I^-1, safe_voltage: M L^2 T^-3 I^-1, time_limit_s: T, resistor_ohm: M L^2 T^-3 I^-2 } out: { ln_ratio: dimensionless, r_max_ohm: M L^2 T^-3 I^-2, r_used_ohm: M L^2 T^-3 I^-2, t_discharge_s: T, p_continuous_w: M L^2 T^-3, limit_s: T, meets_code: dimensionless }
export function computeCapacitorDischargeTime({ capacitance_uf = 0, initial_voltage = 0, safe_voltage = 50, time_limit_s = 0, resistor_ohm = 0, rated_voltage_v = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const cuf = Number(capacitance_uf) || 0;
  const v0 = Number(initial_voltage) || 0;
  const vsafe = Number(safe_voltage) || 0;
  const rin = Number(resistor_ohm) || 0;
  if (!(cuf > 0)) return { error: "Capacitance must be positive (uF)." };
  if (!(v0 > 0)) return { error: "Initial voltage must be positive (V)." };
  if (!(vsafe > 0 && vsafe < v0)) return { error: "Safe voltage must be positive and below the initial voltage." };
  if (rin < 0) return { error: "Supplied resistance must be positive (ohm; 0 = solve for the largest compliant resistor)." };
  if (Number(time_limit_s) < 0 || Number(rated_voltage_v) < 0) return { error: "Time limit and rated voltage cannot be negative." };
  // NEC 460.6 / 460.28 key on the NOMINAL (rms) rating, not the peak V0; until 2026-09-26 a 750 V rms bank entered as its
  // 1,061 V peak got the 5-minute allowance. Rated voltage defaults to V0 (a dc bank).
  const rated = Number(rated_voltage_v) > 0 ? Number(rated_voltage_v) : v0;
  const limit_s = Number(time_limit_s) > 0 ? Number(time_limit_s) : (rated <= 1000 ? 60 : 300); // NEC 2023: 460.6 (1,000 V or less, 1 min) / 460.28 (over 1,000 V, 5 min); 600 V was the pre-2020 threshold
  const C = cuf * 1e-6;
  const ln_ratio = Math.log(v0 / vsafe);
  const r_max_ohm = limit_s / (C * ln_ratio);
  const r_used_ohm = rin > 0 ? rin : r_max_ohm;
  const t_discharge_s = r_used_ohm * C * ln_ratio;
  const p_continuous_w = v0 * v0 / r_used_ohm;
  const meets_code = t_discharge_s <= limit_s + 1e-9;
  if (![ln_ratio, r_max_ohm, r_used_ohm, t_discharge_s, p_continuous_w].every(Number.isFinite)) return { error: "Discharge math is not a finite value." };
  return {
    ln_ratio, r_max_ohm, r_used_ohm, t_discharge_s, p_continuous_w, limit_s, meets_code,
    note: "NEC 460.6: a capacitor holds a lethal charge after disconnect, so a discharge means must bring the residual voltage to 50 V or less within 1 minute for capacitors of 1,000 V nominal or less (460.6), and within 5 minutes above 1,000 V (460.28). V(t) = V0 e^(-t/RC), so t = R C ln(V0/V_safe) and the largest compliant resistor is R_max = t_limit / (C ln(V0/V_safe)). On an ac bank V0 is the PEAK, 1.414 x rms (679 V at 480 V); the rms value returns a resistor too large (Lifasa TS 03-010I sizes on the peak), and the burn is then about half the V0^2/R shown. The discharge means must be PERMANENTLY connected to the capacitor terminals or connect automatically on loss of line voltage -- a manually switched bleed does not comply. Sizing is a trade-off: a smaller resistor discharges faster but dissipates V0^2/R continuously while the bank is energized, so rate it for that power with margin. A listed capacitor's internal discharge resistors may already satisfy this. AND ALL OF THIS ASSUMES THE BLEED PATH WORKS -- spec-v1734's material, landed here. A bleed resistor fails OPEN silently: nothing indicates it, no symptom appears, and a bank whose discharge path has failed holds its charge indefinitely while this calculation keeps returning a comfortable number. That is exactly why the requirement is to VERIFY THE ABSENCE OF VOLTAGE BY TEST, with the tester proven on a known live source immediately before and immediately after the reading. This says what to expect; the meter says what is true, and only one of them is a safety control. STORED ENERGY IS ALSO NOT ONLY CAPACITIVE. A variable frequency drive's DC bus holds a lethal charge after its input disconnect opens and takes minutes to fall, which is why the wait time is printed on the cover -- an electrician who locks the disconnect and immediately opens the drive has locked out the source and walked into the stored energy. A lockout procedure has to address the non-electrical forms explicitly as well: springs under compression, suspended loads, hydraulic and pneumatic accumulators, thermal energy, and material that can flow or fall. A design aid, not a substitute for the equipment listing; 29 CFR 1910.147 and NFPA 70E govern the verification and the lockout.",
  };
}
export const capacitorDischargeTimeExample = { inputs: { capacitance_uf: 100, initial_voltage: 600, safe_voltage: 50, time_limit_s: 0, resistor_ohm: 0 } };
function _v495renderCapacitorDischargeTime(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 460.6 discharge of stored energy: residual voltage to 50 V within 1 minute at 1,000 V nominal or less (460.28: 5 minutes above 1,000 V). V(t) = V0 e^(-t/RC), V0 the peak (1.414 x rms) on an ac bank; t = R C ln(V0/V_safe); R_max = t_limit / (C ln(V0/V_safe)); continuous burn = V0^2/R. The discharge means must be permanently or automatically connected. A design aid; the equipment listing and the AHJ govern.";
  const cap = makeNumber("Total capacitance (uF)", "cdt-cap", { step: "any", min: "0" });
  const v0 = makeNumber("Initial voltage at disconnect (V; ac bank: the PEAK, 1.414 x rms, e.g. 679 V at 480 V)", "cdt-v0", { step: "any", min: "0" });
  const vs = makeNumber("Safe voltage target (V, 460.6 = 50)", "cdt-vs", { step: "any", min: "0" });
  const rv = makeNumber("Rated (nominal rms) voltage (V; sets 60 s / 300 s; 0 = use V0)", "cdt-rv", { step: "any", min: "0" });
  const tl = makeNumber("Code time limit (s, 0 = auto 60/300)", "cdt-tl", { step: "any", min: "0" });
  const r = makeNumber("Bleed resistor (ohm, 0 = solve for largest)", "cdt-r", { step: "any", min: "0" });
  for (const f of [cap, v0, rv, vs, tl, r]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { cap.input.value = "100"; v0.input.value = "600"; vs.input.value = "50"; tl.input.value = "0"; r.input.value = "0"; update(); });
  const oR = makeOutputLine(outputRegion, "Resistor (max compliant or chosen)", "cdt-out-r");
  const oT = makeOutputLine(outputRegion, "Discharge time to safe voltage", "cdt-out-t");
  const oP = makeOutputLine(outputRegion, "Continuous power while energized", "cdt-out-p");
  const oM = makeOutputLine(outputRegion, "Meets the code time?", "cdt-out-m");
  const oNote = makeOutputLine(outputRegion, "Note", "cdt-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const res = computeCapacitorDischargeTime({ capacitance_uf: readNum(cap.input), initial_voltage: readNum(v0.input), safe_voltage: vs.input.value === "" ? 50 : readNum(vs.input), time_limit_s: readNum(tl.input), resistor_ohm: readNum(r.input), rated_voltage_v: readNum(rv.input) }); stepsFor(outputRegion, inputRegion, ["capacitance_uf", "initial_voltage", "safe_voltage", "time_limit_s", "resistor_ohm", "rated_voltage_v"], res);
    if (res.error) { oR.textContent = res.error; oT.textContent = "-"; oP.textContent = "-"; oM.textContent = "-"; oNote.textContent = ""; return; }
    const rk = res.r_used_ohm >= 1e6 ? fmt(res.r_used_ohm / 1e6, 2) + " Mohm" : res.r_used_ohm >= 1000 ? fmt(res.r_used_ohm / 1000, 1) + " kohm" : fmt(res.r_used_ohm, 0) + " ohm";
    oR.textContent = rk + (readNum(r.input) > 0 ? " (chosen)" : " (R_max for the " + fmt(res.limit_s, 0) + " s limit)");
    oT.textContent = fmt(res.t_discharge_s, 1) + " s (limit " + fmt(res.limit_s, 0) + " s)";
    oP.textContent = fmt(res.p_continuous_w, 2) + " W";
    oM.textContent = res.meets_code ? "yes" : "NO -- reduce the resistor";
    oNote.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [cap, v0, rv, vs, tl, r]) f.input.addEventListener("input", update);
}
ELECTRICALANALYSIS_RENDERERS["capacitor-discharge-time"] = _v495renderCapacitorDischargeTime;

// ===================== spec-v496: asymmetrical and peak fault current from X/R =====================
// dims: in { isym_ka: I, x_over_r: dimensionless } out: { i_peak_ka: I, mf_rms: dimensionless, i_asym_ka: I, peak_factor: dimensionless }
export function computeAsymmetricalFaultXr({ isym_ka = 0, x_over_r = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const isym = Number(isym_ka) || 0;
  const xr = Number(x_over_r) || 0;
  if (!(isym > 0)) return { error: "Symmetrical fault current must be positive (kA)." };
  if (!(xr > 0)) return { error: "X/R ratio must be positive." };
  // The peak falls slightly before the half cycle, at (phi + pi/2) with phi = atan(X/R): the
  // ANSI C37 / NEMA AB-1 form, which reproduces the Bussmann / NEMA Mp table (2.309 at X/R 6.59,
  // 2.554 at 14.25). Until 2026-09-25 this took e^(-pi/(X/R)), the value AT the half cycle,
  // which reads 0.2-0.7% low -- the unconservative side for a peak-withstand rating.
  const phi = Math.atan(xr);
  const i_peak_ka = Math.SQRT2 * isym * (1 + Math.exp(-(phi + Math.PI / 2) / xr));
  const mf_rms = Math.sqrt(1 + 2 * Math.exp(-2 * Math.PI / xr));
  const i_asym_ka = isym * mf_rms;
  const peak_factor = i_peak_ka / isym;
  if (![i_peak_ka, mf_rms, i_asym_ka, peak_factor].every(Number.isFinite)) return { error: "Fault-asymmetry math is not a finite value." };
  return {
    i_peak_ka, mf_rms, i_asym_ka, peak_factor,
    note: "First-cycle fault asymmetry from the DC offset: the first half-cycle of a real fault rides a DC offset on the AC wave, sized by the circuit X/R ratio. I_peak = sqrt(2) x I_sym x (1 + e^(-(phi + pi/2)/(X/R))), phi = atan(X/R), and the asymmetrical RMS multiplier MF = sqrt(1 + 2 e^(-2 pi/(X/R))). Both grow as X/R rises -- highest near large transformers and generators, about 2.6x peak and 1.6x RMS at X/R 20-25, approaching 2.83x (2 sqrt 2) and 1.73x (sqrt 3) only as X/R grows without bound. A device's peak-withstand and a bus bracing rating must survive the ASYMMETRICAL first-cycle current, not the symmetrical RMS, so comparing gear against the symmetrical value under-rates it on a stiff, high-X/R service. The factors assume the worst-case fully offset phase. A design aid; the interrupting-duty rating and a coordination study govern.",
  };
}
export const asymmetricalFaultXrExample = { inputs: { isym_ka: 20, x_over_r: 15 } };
function _v496renderAsymmetricalFaultXr(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: First-cycle fault asymmetry from X/R (IEEE C37 / NEMA AB-4 model): I_peak = sqrt(2) x I_sym x (1 + e^(-(phi + pi/2)/(X/R))), phi = atan(X/R); asymmetrical RMS multiplier MF = sqrt(1 + 2 e^(-2 pi/(X/R))); I_asym = I_sym x MF. The asymmetrical first-cycle current, not the symmetrical RMS, is what a peak-withstand and bus bracing rating must survive. A design aid; the interrupting-duty rating and coordination study govern.";
  const isym = makeNumber("Symmetrical RMS fault current (kA)", "afx-isym", { step: "any", min: "0" });
  const xr = makeNumber("Circuit X/R ratio", "afx-xr", { step: "any", min: "0" });
  for (const f of [isym, xr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { isym.input.value = "20"; xr.input.value = "15"; update(); });
  const oPeak = makeOutputLine(outputRegion, "First peak current", "afx-out-peak");
  const oAsym = makeOutputLine(outputRegion, "First-cycle asymmetrical RMS", "afx-out-asym");
  const oNote = makeOutputLine(outputRegion, "Note", "afx-out-n");
  function readNum(i) { if (i.value === "") return 0; const n = Number(i.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeAsymmetricalFaultXr({ isym_ka: readNum(isym.input), x_over_r: readNum(xr.input) }); stepsFor(outputRegion, inputRegion, ["isym_ka", "x_over_r"], r);
    if (r.error) { oPeak.textContent = r.error; oAsym.textContent = "-"; oNote.textContent = ""; return; }
    oPeak.textContent = fmt(r.i_peak_ka, 1) + " kA (" + fmt(r.peak_factor, 2) + "x symmetrical)";
    oAsym.textContent = fmt(r.i_asym_ka, 1) + " kA (" + fmt(r.mf_rms, 3) + "x symmetrical)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [isym, xr]) f.input.addEventListener("input", update);
}
ELECTRICALANALYSIS_RENDERERS["asymmetrical-fault-xr"] = _v496renderAsymmetricalFaultXr;

// ===================== spec-v518: battery room hydrogen ventilation (IEEE 1635) =====================
// IEEE 1635 Annex A: 1.27e-7 m^3/s (0.000269 cfm) of H2 per ampere per cell. Until 2026-09-26: 0.054 I N, called 1%, held 0.5%.
const _H2_CFM_PER_AMP_CELL = 0.000269;
// dims: in { cell_count: dimensionless, charge_current_a: I, room_volume_ft3: L^3, h2_limit_pct: dimensionless } out: { q_cfm: L^3 T^-1, ach: T^-1, h2_limit_pct: dimensionless }
export function computeBatteryHydrogenVent({ cell_count = 0, charge_current_a = 0, room_volume_ft3 = 0, h2_limit_pct = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const n = Number(cell_count) || 0;
  const i = Number(charge_current_a) || 0;
  const vol = Number(room_volume_ft3) || 0;
  if (!(n >= 1)) return { error: "Cell count must be at least 1 (individual 2 V cells, not jars)." };
  if (!(i > 0)) return { error: "Charge current must be positive (A)." };
  if (!(vol > 0)) return { error: "Room volume must be positive (ft^3)." };
  const lim = Number(h2_limit_pct);
  if (!(lim > 0 && lim < 4)) return { error: "Hydrogen limit must be above 0 and below the 4% LEL (IFC / NFPA 1: 1%; IEEE 1635 examples: 2%)." };
  const q_cfm = _H2_CFM_PER_AMP_CELL * i * n / (lim / 100);
  const ach = q_cfm * 60 / vol;
  if (![q_cfm, ach].every(Number.isFinite)) return { error: "Battery-vent math is not a finite value." };
  return {
    q_cfm, ach, h2_limit_pct: lim,
    note: "IEEE 1635 battery-room hydrogen ventilation: each ampere through each cell evolves 0.000269 cfm of hydrogen, so holding the room average at L% takes Q = 0.000269 x I x N / (L/100) cfm -- 0.0269 x I x N at the 1% limit of the IFC and NFPA 1 (a 75% margin under the 4% lower explosive limit); IEEE's examples design to 2%. I is the current per cell (charger current / parallel strings), and N is the number of individual 2 V CELLS in the room -- not jars or modules. A 12 V AGM/flooded jar contains six 2 V cells, so a room of twenty-four 12 V jars is 144 cells, not 24, and confusing the two undersizes the exhaust six-fold. Local spots near cells can exceed the room average, so diffusion and inlet placement matter; sealed VRLA in normal float produces far less gas than this bounding case. A design aid, not the fire and building code; the applicable code and the room design govern.",
  };
}
export const batteryHydrogenVentExample = { inputs: { cell_count: 24, charge_current_a: 20, room_volume_ft3: 800 } };
function _v518renderBatteryHydrogenVent(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IEEE 1635-2018 / ASHRAE Guideline 21 Annex A battery-room hydrogen ventilation (4% LEL): Q = 0.0269 x I x N cfm at the IFC / NFPA 1 1% limit (x 1/limit%; I per cell; N = 2 V CELLS, not jars), ACH = Q x 60 / room volume. A design aid; the applicable code and room design govern.";
  const n = makeNumber("Cell count (individual 2 V cells, NOT jars)", "bhv-n", { step: "1", min: "1" });
  const i = makeNumber("Charge current through each cell (A; charger current / parallel strings)", "bhv-i", { step: "any", min: "0" });
  const vol = makeNumber("Room volume (ft³)", "bhv-v", { step: "any", min: "0" });
  const lim = makeNumber("Hydrogen limit (% by volume; IFC / NFPA 1 = 1)", "bhv-lim", { step: "any", min: "0" }); lim.input.value = "1";
  for (const f of [n, i, vol, lim]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { n.input.value = "24"; i.input.value = "20"; vol.input.value = "800"; update(); });
  const oQ = makeOutputLine(outputRegion, "Required exhaust airflow", "bhv-out-q");
  const oACH = makeOutputLine(outputRegion, "Air changes per hour", "bhv-out-ach");
  const oNote = makeOutputLine(outputRegion, "Note", "bhv-out-n");
  function readNum(x) { if (x.value === "") return 0; const v = Number(x.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeBatteryHydrogenVent({ cell_count: readNum(n.input), charge_current_a: readNum(i.input), room_volume_ft3: readNum(vol.input), h2_limit_pct: lim.input.value === "" ? 1 : readNum(lim.input) }); stepsFor(outputRegion, inputRegion, ["cell_count", "charge_current_a", "room_volume_ft3", "h2_limit_pct"], r);
    if (r.error) { oQ.textContent = r.error; oACH.textContent = "-"; oNote.textContent = ""; return; }
    oQ.textContent = fmt(r.q_cfm, 1) + " cfm";
    oACH.textContent = fmt(r.ach, 1) + " ACH";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [n, i, vol, lim]) f.input.addEventListener("input", update);
}
ELECTRICALANALYSIS_RENDERERS["battery-hydrogen-vent"] = _v518renderBatteryHydrogenVent;

// dims: in { available_cfm: L^3 T^-1, cell_count: dimensionless, h2_limit_pct: dimensionless } out: { max_charge_current_a: I }
export function computeBatteryVentMaxCurrent({ available_cfm = 0, cell_count = 0, h2_limit_pct = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const q = Number(available_cfm) || 0;
  const n = Number(cell_count) || 0;
  if (!(q > 0)) return { error: "Available exhaust airflow must be positive (cfm)." };
  if (!(n >= 1)) return { error: "Cell count must be at least 1 (individual 2 V cells, not jars)." };
  const lim = Number(h2_limit_pct);
  if (!(lim > 0 && lim < 4)) return { error: "Hydrogen limit must be above 0 and below the 4% LEL (IFC / NFPA 1: 1%)." };
  // IEEE 1635 Q = 0.000269 x I x N / (limit/100) solved for the current the airflow can safely support.
  const max_charge_current_a = q * (lim / 100) / (_H2_CFM_PER_AMP_CELL * n);
  if (!Number.isFinite(max_charge_current_a)) return { error: "Battery-vent math is not a finite value." };
  return {
    max_charge_current_a,
    note: "The highest maximum charge current a room's exhaust can safely support, the inverse of the battery-hydrogen-vent tile: from IEEE 1635 Q = 0.000269 x I x N / (limit/100), I_max = Q / (0.0269 x N) at the 1% limit, per cell (x parallel strings for the charger), where N is the number of individual 2 V CELLS -- not jars or modules. A 12 V AGM/flooded jar contains six 2 V cells, so twenty-four 12 V jars is 144 cells, not 24; counting jars overstates the safe current six-fold. Holding to I_max keeps the room-average hydrogen at the limit entered (1% by default, a 75% margin under the 4% lower explosive limit); local spots near cells can still exceed the average, so diffusion and inlet placement matter. A design aid, not the fire and building code; the applicable code and the room design govern.",
  };
}
export const batteryVentMaxCurrentExample = { inputs: { available_cfm: 100, cell_count: 24 } };
// dims: in { dom: dimensionless } out: { dom_side_effect: dimensionless }
function renderBatteryVentMaxCurrent(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IEEE 1635 / IEEE-ASHRAE Guide 21 battery-room hydrogen ventilation (NFPA 855 4% LEL), solved for the current: I_max = Q / (0.0269 x N) at 1%, per cell; N = individual 2 V CELLS (not jars). A design aid; the applicable code and room design govern.";
  const q = makeNumber("Available exhaust airflow (cfm)", "bvmc-q", { step: "any", min: "0" });
  const n = makeNumber("Cell count (individual 2 V cells, NOT jars)", "bvmc-n", { step: "1", min: "1" });
  for (const f of [q, n]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { q.input.value = "100"; n.input.value = "24"; update(); });
  const oI = makeOutputLine(outputRegion, "Max charge current per cell (x parallel strings = charger total)", "bvmc-out-i");
  const oNote = makeOutputLine(outputRegion, "Note", "bvmc-out-n");
  function readNum(x) { if (x.value === "") return 0; const v = Number(x.value); return Number.isFinite(v) ? v : 0; }
  const update = debounce(() => {
    const r = computeBatteryVentMaxCurrent({ available_cfm: readNum(q.input), cell_count: readNum(n.input) }); stepsFor(outputRegion, inputRegion, ["available_cfm", "cell_count"], r);
    if (r.error) { oI.textContent = r.error; oNote.textContent = ""; return; }
    oI.textContent = fmt(r.max_charge_current_a, 1) + " A";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [q, n]) f.input.addEventListener("input", update);
}
ELECTRICALANALYSIS_RENDERERS["battery-vent-max-current"] = renderBatteryVentMaxCurrent;

// ===================== spec-v520: transformer inrush coordination point =====================
// dims: in { kva: M L^2 T^-3, primary_voltage_v: M L^2 T^-3 I^-1, phase: dimensionless, inrush_multiple: dimensionless, duration_s: T } out: { fla_a: I, inrush_point_a: I, duration_s: T }
export function computeTransformerInrushPoint({ kva = 0, primary_voltage_v = 0, phase = 3, inrush_multiple = 12, duration_s = 0.1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const k = Number(kva) || 0;
  const v = Number(primary_voltage_v) || 0;
  const ph = Number(phase) === 1 ? 1 : (Number(phase) === 3 ? 3 : 0);
  const mult = Number(inrush_multiple) || 0;
  const dur = Number(duration_s) || 0;
  if (!(k > 0)) return { error: "Transformer kVA must be positive." };
  if (!(v > 0)) return { error: "Primary voltage must be positive (V)." };
  if (ph !== 1 && ph !== 3) return { error: "Phase must be 1 or 3." };
  if (!(mult > 0)) return { error: "Inrush multiple must be positive." };
  if (!(dur > 0)) return { error: "Inrush duration must be positive (s)." };
  const fla_a = ph === 3 ? k * 1000 / (Math.sqrt(3) * v) : k * 1000 / v;
  const inrush_point_a = mult * fla_a;
  if (![fla_a, inrush_point_a].every(Number.isFinite)) return { error: "Inrush-point math is not a finite value." };
  return {
    fla_a, inrush_point_a, duration_s: dur,
    note: "Transformer energization-inrush coordination point: FLA = kVA x 1000 / (sqrt(3) x V) three-phase, and the inrush point = multiple x FLA at the stated duration. The instant a transformer is energized at an unfavorable point on the voltage wave, the core saturates and draws a magnetizing inrush many times full load -- commonly 8 to 12x, up to about 25x in the first sub-cycle, decaying over a few cycles. A primary device meeting the NEC 450.3 percentage limits can still NUISANCE-TRIP on this inrush: its time-current curve must pass to the RIGHT of the inrush point (higher current at that short time) while staying LEFT of the transformer damage curve. The actual inrush depends on the point-on-wave, residual flux, and transformer design. A design aid, not the engineer of record; the manufacturer's inrush data and a coordination study govern.",
  };
}
export const transformerInrushPointExample = { inputs: { kva: 75, primary_voltage_v: 480, phase: 3, inrush_multiple: 12, duration_s: 0.1 } };
function _v520renderTransformerInrushPoint(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: transformer energization-inrush coordination (IEEE C57.109; NEC 450.3 context): FLA = kVA x 1000 / (sqrt(3) x V) three-phase; inrush point = multiple x FLA at the stated duration (~12x at 0.1 s, up to 25x at 0.01 s). The primary device curve must sit right of the inrush point and left of the damage curve. A design aid; the manufacturer's inrush data and a coordination study govern.";
  const kva = makeNumber("Transformer rating (kVA)", "tip-kva", { step: "any", min: "0" });
  const v = makeNumber("Primary line voltage (V)", "tip-v", { step: "any", min: "0" });
  const ph = makeSelect("Phase", "tip-ph", [
    { value: "3", label: "Three-phase", selected: true },
    { value: "1", label: "Single-phase" },
  ]);
  const mult = makeNumber("Inrush multiple (x FLA)", "tip-mult", { step: "any", min: "0" });
  const dur = makeNumber("Duration (s)", "tip-dur", { step: "any", min: "0" });
  for (const f of [kva, v, ph, mult, dur]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { kva.input.value = "75"; v.input.value = "480"; ph.select.value = "3"; mult.input.value = "12"; dur.input.value = "0.1"; update(); });
  const oFla = makeOutputLine(outputRegion, "Full-load current (FLA)", "tip-out-fla");
  const oIn = makeOutputLine(outputRegion, "Inrush coordination point", "tip-out-in");
  const oNote = makeOutputLine(outputRegion, "Note", "tip-out-n");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeTransformerInrushPoint({ kva: readNum(kva.input), primary_voltage_v: readNum(v.input), phase: Number(ph.select.value), inrush_multiple: mult.input.value === "" ? 12 : readNum(mult.input), duration_s: dur.input.value === "" ? 0.1 : readNum(dur.input) }); stepsFor(outputRegion, inputRegion, ["kva", "primary_voltage_v", "phase", "inrush_multiple", "duration_s"], r);
    if (r.error) { oFla.textContent = r.error; oIn.textContent = "-"; oNote.textContent = ""; return; }
    oFla.textContent = fmt(r.fla_a, 1) + " A";
    oIn.textContent = fmt(r.inrush_point_a, 0) + " A at " + fmt(r.duration_s, 3) + " s";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [kva, v, mult, dur]) f.input.addEventListener("input", update);
  ph.select.addEventListener("change", update);
}
ELECTRICALANALYSIS_RENDERERS["transformer-inrush-point"] = _v520renderTransformerInrushPoint;

// ===================== spec-v562: termination temperature ampacity limit (NEC 110.14(C)) =====================
// dims: in { amp_90c: I, amp_75c: I, amp_60c: I, termination_rating: dimensionless, over_100a: dimensionless, derate_factor: dimensionless } out: { termination_ampacity_a: I, derated_90c_a: I, governing_a: I, nec_default_column_c: T }
export function computeTerminationTempAmpacity({ amp_90c = 0, amp_75c = 0, amp_60c = 0, termination_rating = 75, over_100a = false, derate_factor = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const a90 = Number(amp_90c) || 0;
  const a75 = Number(amp_75c) || 0;
  const a60 = Number(amp_60c) || 0;
  const tr = Number(termination_rating) || 0;
  const over = over_100a === true || over_100a === "yes";
  const d = Number(derate_factor) || 0;
  if (!(a90 > 0)) return { error: "90 C ampacity must be positive (A)." };
  if (!(a75 > 0)) return { error: "75 C ampacity must be positive (A)." };
  if (!(a60 > 0)) return { error: "60 C ampacity must be positive (A)." };
  if (tr !== 60 && tr !== 75) return { error: "Termination rating must be 60 or 75 (C)." };
  if (!(d > 0 && d <= 1)) return { error: "Derating factor must be over 0 and at most 1." };
  // NEC 110.14(C) coordinates to the LOWEST-rated termination in the circuit.
  // The input field is literally "Lowest termination rating", and both the note
  // and the citation say the ampacity is capped at it -- but this used the 75 C
  // column whenever over_100a was set, silently DISCARDING a user's explicit
  // 60 C selection (18% non-conservative: 230 A vs 195 A on the example
  // section, on the one calculation whose whole purpose is protecting a
  // termination). Honor the declared rating; over_100a now reports which
  // 110.14(C) default column applies and flags the uncommon but real case of
  // 60 C-marked equipment on a circuit above 100 A.
  const termination_ampacity_a = tr === 75 ? a75 : a60;
  const nec_default_column_c = over ? 75 : 60;
  const below_nec_default = tr < nec_default_column_c;
  const derated_90c_a = a90 * d;
  const governing_a = Math.min(termination_ampacity_a, derated_90c_a);
  const governed_by = governing_a === termination_ampacity_a && termination_ampacity_a <= derated_90c_a ? "termination" : "derating";
  return {
    termination_ampacity_a, derated_90c_a, governing_a, governed_by,
    nec_default_column_c, below_nec_default,
    note: "The 90 C column may be used only for the ambient and fill derating math, not for the final termination current. The usable ampacity is capped at the lowest-rated termination you declare (60 or 75 C) - a 60 C-marked termination governs even above 100 A, where the 75 C column would otherwise be the default. Circuits at or below 100 A default to the 60 C column unless all terminations and conductors are listed for 75 C; circuits above 100 A use the 75 C column. NEC 110.14(C) and the equipment listing govern.",
  };
}
export const terminationTempAmpacityExample = { inputs: { amp_90c: 260, amp_75c: 230, amp_60c: 195, termination_rating: 75, over_100a: true, derate_factor: 0.8 } };

function _v562renderTerminationTempAmpacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 110.14(C) temperature limitations with Table 310.16: the usable ampacity is capped at the lowest-rated termination you declare (60 or 75 C); the NEC default column is 60 C at or below 100 A unless listed 75 C, and 75 C above 100 A, but a 60 C-marked termination governs even above 100 A; the 90 C column is used ONLY for the ambient/fill derating math (derated 90 C = amp_90c x derate), not the final termination current; governing = min(termination column, derated 90 C). The NEC and the equipment listing govern.";
  const a90 = makeNumber("90 C ampacity (Table 310.16)", "tta-90", { step: "any", min: "0" });
  const a75 = makeNumber("75 C ampacity", "tta-75", { step: "any", min: "0" });
  const a60 = makeNumber("60 C ampacity", "tta-60", { step: "any", min: "0" });
  const tr = makeSelect("Lowest termination rating", "tta-tr", [
    { value: "75", label: "75 C", selected: true },
    { value: "60", label: "60 C" },
  ]);
  const over = makeSelect("Circuit over 100 A?", "tta-over", [
    { value: "yes", label: "Yes (75 C default column)", selected: true },
    { value: "no", label: "No (<= 100 A)" },
  ]);
  const d = makeNumber("Combined ambient/fill derate (1.0 = none)", "tta-d", { step: "any", min: "0", max: "1" });
  for (const f of [a90, a75, a60, tr, over, d]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { a90.input.value = "260"; a75.input.value = "230"; a60.input.value = "195"; tr.select.value = "75"; over.select.value = "yes"; d.input.value = "0.8"; update(); });
  const oTerm = makeOutputLine(outputRegion, "Termination-column ampacity", "tta-out-term");
  const oDer = makeOutputLine(outputRegion, "Derated 90 C value", "tta-out-der");
  const oGov = makeOutputLine(outputRegion, "Governing ampacity", "tta-out-gov");
  const oNote = makeOutputLine(outputRegion, "Note", "tta-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeTerminationTempAmpacity({ amp_90c: readNum(a90.input), amp_75c: readNum(a75.input), amp_60c: readNum(a60.input), termination_rating: Number(tr.select.value), over_100a: over.select.value === "yes", derate_factor: d.input.value === "" ? 1.0 : readNum(d.input) }); stepsFor(outputRegion, inputRegion, ["amp_90c", "amp_75c", "amp_60c", "termination_rating", "over_100a", "derate_factor"], r);
    if (r.error) { oTerm.textContent = r.error; oDer.textContent = "-"; oGov.textContent = "-"; oNote.textContent = ""; return; }
    oTerm.textContent = fmt(r.termination_ampacity_a, 0) + " A" + (r.below_nec_default ? " (60 C-marked termination governs even above 100 A, where 75 C would otherwise be the default)" : "");
    oDer.textContent = fmt(r.derated_90c_a, 0) + " A";
    oGov.textContent = fmt(r.governing_a, 0) + " A (" + r.governed_by + " governs)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [a90, a75, a60, d]) f.input.addEventListener("input", update);
  for (const s of [tr, over]) s.select.addEventListener("change", update);
}
ELECTRICALANALYSIS_RENDERERS["termination-temp-ampacity"] = _v562renderTerminationTempAmpacity;
// spec-v1184 hand-authored field schema (bespoke renderer; keys match
// computeTerminationTempAmpacity's parameters; `over_100a` is the boolean the
// "circuit over 100 A?" select resolves to).
_v562renderTerminationTempAmpacity.schema = {
  inputs: [
    { key: "amp_90c", label: "90 C ampacity (Table 310.16)", kind: "number", options: null, default: null, attrs: { step: "any", min: "0" } },
    { key: "amp_75c", label: "75 C ampacity", kind: "number", options: null, default: null, attrs: { step: "any", min: "0" } },
    { key: "amp_60c", label: "60 C ampacity", kind: "number", options: null, default: null, attrs: { step: "any", min: "0" } },
    { key: "termination_rating", label: "Lowest termination rating", kind: "select", options: [{ value: "75", label: "75 C" }, { value: "60", label: "60 C" }], default: null, attrs: null },
    { key: "over_100a", label: "Circuit over 100 A (75 C default column)", kind: "checkbox", options: null, default: null, attrs: null },
    { key: "derate_factor", label: "Combined ambient/fill derate (1.0 = none)", kind: "number", options: null, default: null, attrs: { step: "any", min: "0", max: "1" } },
  ],
  outputs: [
    { key: "termination_ampacity_a", label: "Termination-column ampacity", unit: "A", format: (r) => (r.termination_ampacity_a == null ? "-" : fmt(r.termination_ampacity_a, 0) + " A") },
    { key: "derated_90c_a", label: "Derated 90 C value", unit: "A", format: (r) => (r.derated_90c_a == null ? "-" : fmt(r.derated_90c_a, 1) + " A") },
    { key: "governing_a", label: "Governing ampacity", unit: "A", format: (r) => (r.governing_a == null ? "-" : fmt(r.governing_a, 1) + " A (" + String(r.governed_by) + ")") },
    { key: "note", label: "Note", unit: null, format: (r) => String(r.note) },
  ],
  citation: "Citation: NEC 2023 110.14(C) with Table 310.16: usable ampacity is capped at the lowest-rated termination (60 or 75 C); the 90 C column is used only for derating; governing = min(termination column, derated 90 C).",
  scope: null,
};

// ===================== spec-v804: AWG conductor geometry (diameter, circular mils, mm^2) =====================
// dims: in { awg: dimensionless } out: { diameter_in: L, diameter_mm: L, area_cmils: L^2, area_mm2: L^2 }
export function computeAwgWireGeometry({ awg = "12" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  let n;
  try { n = awgToNumber(awg); } catch { return { error: "Choose a valid AWG size (e.g. 12, or 4/0)." }; }
  if (!Number.isFinite(n)) return { error: "Choose a valid AWG size (e.g. 12, or 4/0)." };
  const diameter_in = awgDiameterInches(awg);
  const diameter_mm = diameter_in * 25.4;
  const area_cmils = awgAreaCmils(awg);
  const area_mm2 = awgAreaM2(awg) * 1e6;
  if (![diameter_in, diameter_mm, area_cmils, area_mm2].every(Number.isFinite)) return { error: "AWG geometry is not a finite value." };
  return {
    diameter_in, diameter_mm, area_cmils, area_mm2,
    note: "AWG (American Wire Gauge) bare-conductor geometry from the defining ratio: each 6-gauge step changes the diameter by very close to a factor of 2 (exactly 92^(6/39) ~= 2.005), so d = 0.005 x 92^((36 - n)/39) inches, with n the gauge number and the aught sizes 1/0, 2/0, 3/0, 4/0 counting as n = 0, -1, -2, -3. The circular-mil area is (d in mils)^2 -- a diameter-squared area unit that folds the pi/4 into the unit itself, which is why NEC ampacity and conductor tables are stated in cmils rather than in^2. The metric area is the true cross-section pi (d/2)^2. This is the bare copper/aluminum conductor size, not the over-insulation diameter (that depends on the insulation type -- see conduit-fill), and a solid-conductor equivalent, not the slightly larger overall diameter of a stranded build. A reference; the manufacturer's conductor dimensions govern the built wire.",
  };
}
export const awgWireGeometryExample = { inputs: { awg: "12" } };
function _v804renderAwgWireGeometry(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: AWG geometric definition d = 0.005 x 92^((36 - n)/39) inches; circular mils = (d in mils)^2; metric area = pi (d/2)^2. Bare-conductor, solid-equivalent geometry. A reference; the manufacturer's conductor dimensions govern the built wire.";
  const awg = makeSelect("AWG size", "awgg-awg", awgOptions());
  awg.select.value = "12";
  inputRegion.appendChild(awg.wrap);
  attachExampleButton(inputRegion, () => { awg.select.value = "12"; update(); });
  const oDin = makeOutputLine(outputRegion, "Diameter", "awgg-out-din");
  const oCm = makeOutputLine(outputRegion, "Area (circular mils)", "awgg-out-cm");
  const oMm2 = makeOutputLine(outputRegion, "Area (mm²)", "awgg-out-mm2");
  const oNote = makeOutputLine(outputRegion, "Note", "awgg-out-n");
  const update = debounce(() => {
    const r = computeAwgWireGeometry({ awg: awg.select.value }); stepsFor(outputRegion, inputRegion, ["awg"], r);
    if (r.error) { oDin.textContent = r.error; oCm.textContent = "-"; oMm2.textContent = "-"; oNote.textContent = ""; return; }
    oDin.textContent = fmt(r.diameter_in, 4) + " in (" + fmt(r.diameter_mm, 3) + " mm)";
    oCm.textContent = fmt(r.area_cmils, 0) + " cmil";
    oMm2.textContent = fmt(r.area_mm2, 3) + " mm^2";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  awg.select.addEventListener("input", update);
  update();
}
ELECTRICALANALYSIS_RENDERERS["awg-wire-geometry"] = _v804renderAwgWireGeometry;

// ===================== spec-v806: ideal transformer turns / voltage / current / impedance ratio =====================
// dims: in { primary_voltage_v: M L^2 T^-3 I^-1, secondary_voltage_v: M L^2 T^-3 I^-1, secondary_current_a: I, load_impedance_ohm: M L^2 T^-3 I^-2 } out: { turns_ratio: dimensionless, primary_current_a: I, reflected_impedance_ohm: M L^2 T^-3 I^-2 }
export function computeTransformerTurnsRatio({ primary_voltage_v = 0, secondary_voltage_v = 0, secondary_current_a = 0, load_impedance_ohm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const Vp = Number(primary_voltage_v) || 0;
  const Vs = Number(secondary_voltage_v) || 0;
  const Is = Number(secondary_current_a) || 0;
  const Zs = Number(load_impedance_ohm) || 0;
  if (!(Vp > 0)) return { error: "Primary voltage must be positive (V)." };
  if (!(Vs > 0)) return { error: "Secondary voltage must be positive (V)." };
  if (Is < 0) return { error: "Secondary current cannot be negative (A)." };
  if (Zs < 0) return { error: "Load impedance cannot be negative (ohm)." };
  const turns_ratio = Vp / Vs;
  if (!Number.isFinite(turns_ratio)) return { error: "Turns-ratio math is not a finite value." };
  const primary_current_a = Is > 0 ? Is / turns_ratio : null;
  const reflected_impedance_ohm = Zs > 0 ? turns_ratio * turns_ratio * Zs : null;
  return {
    turns_ratio, primary_current_a, reflected_impedance_ohm, step: turns_ratio > 1 ? "step-down" : turns_ratio < 1 ? "step-up" : "isolation (1:1)",
    note: "Ideal (lossless, unity-coupling) transformer ratios: the turns ratio a = Np/Ns equals the voltage ratio Vp/Vs, the INVERSE current ratio Is/Ip, and the SQUARE ROOT of the impedance ratio -- so a load Zs on the secondary looks like a^2 x Zs from the primary. A 480-to-120 V transformer is a = 4 (a 4:1 step-down); 50 A drawn on the secondary reflects to 50/4 = 12.5 A on the primary, and an 8 ohm secondary load looks like 4^2 x 8 = 128 ohm to the source. The a^2 impedance transformation is why a 70 V constant-voltage speaker line or an audio output stage uses a matching transformer to hit a target load. This is the nameplate ratio assuming no losses; the winding resistance and leakage reactance that drop real secondary voltage under load are the separate transformer-voltage-regulation tile. A design aid; the nameplate and the manufacturer's data govern.",
  };
}
export const transformerTurnsRatioExample = { inputs: { primary_voltage_v: 480, secondary_voltage_v: 120, secondary_current_a: 50, load_impedance_ohm: 8 } };
function _v806renderTransformerTurnsRatio(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ideal transformer identities a = Np/Ns = Vp/Vs = Is/Ip, impedance ratio Zp/Zs = a^2, by name; the lossless nameplate ratio (winding resistance and leakage reactance are the separate voltage-regulation tile). A design aid; the nameplate governs.";
  const vp = makeNumber("Primary voltage Vp (V)", "ttr-vp", { step: "any", min: "0" });
  const vs = makeNumber("Secondary voltage Vs (V)", "ttr-vs", { step: "any", min: "0" });
  const is = makeNumber("Secondary current Is (A, optional)", "ttr-is", { step: "any", min: "0" });
  const zs = makeNumber("Secondary / load impedance (ohm, optional)", "ttr-zs", { step: "any", min: "0" });
  for (const f of [vp, vs, is, zs]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { vp.input.value = "480"; vs.input.value = "120"; is.input.value = "50"; zs.input.value = "8"; update(); });
  const oA = makeOutputLine(outputRegion, "Turns ratio", "ttr-out-a");
  const oIp = makeOutputLine(outputRegion, "Primary current Ip", "ttr-out-ip");
  const oZp = makeOutputLine(outputRegion, "Reflected primary impedance", "ttr-out-zp");
  const oNote = makeOutputLine(outputRegion, "Note", "ttr-out-note");
  const update = debounce(() => {
    const r = computeTransformerTurnsRatio({ primary_voltage_v: Number(vp.input.value) || 0, secondary_voltage_v: Number(vs.input.value) || 0, secondary_current_a: Number(is.input.value) || 0, load_impedance_ohm: Number(zs.input.value) || 0 }); stepsFor(outputRegion, inputRegion, ["primary_voltage_v", "secondary_voltage_v", "secondary_current_a", "load_impedance_ohm"], r);
    if (r.error) { oA.textContent = r.error; oIp.textContent = "-"; oZp.textContent = "-"; oNote.textContent = ""; return; }
    oA.textContent = fmt(r.turns_ratio, 4) + " : 1 (" + r.step + ")";
    oIp.textContent = r.primary_current_a === null ? "(enter secondary current)" : fmt(r.primary_current_a, 3) + " A";
    oZp.textContent = r.reflected_impedance_ohm === null ? "(enter load impedance)" : fmt(r.reflected_impedance_ohm, 2) + " ohm";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [vp, vs, is, zs]) f.input.addEventListener("input", update);
}
ELECTRICALANALYSIS_RENDERERS["transformer-turns-ratio"] = _v806renderTransformerTurnsRatio;

// spec-v1860: field-installation and branch-circuit calculators moved to calc-electricalfield.js.

// --- spec-v1111 A: EGC for conductors in parallel raceways (NEC 250.122(F)) ---
// egc-upsize-proportional implements 250.122(B); nothing implemented (F). The rule people get
// wrong: with a feeder paralleled across several raceways, EACH raceway needs a FULL-SIZE EGC
// sized to the whole circuit's OCPD - the EGC is NOT divided among the sets the way the ungrounded
// conductors are. The table lookup is delegated to the landed computeEGCSize so no NEC table is
// duplicated here; this tile adds the parallel rule and shows the wrong answer for contrast.
// dims: in { ocpd_A: I, raceway_count: dimensionless, material: dimensionless } out: { egc_per_raceway_awg: dimensionless, total_egc_count: dimensionless, divided_ocpd_A: I, ocpd_A: I }
export function computeEgcParallelRaceways({ ocpd_A = 0, raceway_count = 2, material = "copper" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const ocpd = Number(ocpd_A) || 0;
  const n = Number(raceway_count) || 0;
  if (!(ocpd > 0)) return { error: "Overcurrent device rating must be positive (A)." };
  if (!(n >= 2) || !Number.isInteger(n)) return { error: "Raceway count must be a whole number of at least 2 (a single raceway is the ordinary 250.122 case - use egc-sizing)." };
  if (material !== "copper" && material !== "aluminum") return { error: "Material must be copper or aluminum." };
  const correct = computeEGCSize({ ocpd_A: ocpd, material });
  if (correct.error) return { error: correct.error };
  const divided_ocpd_A = ocpd / n;
  const wrong = computeEGCSize({ ocpd_A: divided_ocpd_A, material });
  const egc_per_raceway_awg = correct.egc_awg;
  const undersized_awg = wrong.error ? null : wrong.egc_awg;
  const same_either_way = undersized_awg === egc_per_raceway_awg;
  const total_egc_count = n;
  if (!egc_per_raceway_awg) return { error: "EGC size did not resolve for this overcurrent rating." };
  return {
    egc_per_raceway_awg, total_egc_count, divided_ocpd_A, undersized_awg, same_either_way, ocpd_A: ocpd,
    note: "Each of the " + n + " raceways gets its OWN full-size EGC sized to the WHOLE circuit's " + ocpd + " A overcurrent device: " + n + " runs of " + egc_per_raceway_awg + " AWG " + material + ". The EGC is NOT divided among the parallel sets the way the ungrounded conductors are"
      + (same_either_way ? " - though at this rating the table happens to give the same size either way, so the error would not show up here. " : ", and the common mistake is to size it from " + ocpd + "/" + n + " = " + divided_ocpd_A.toFixed(0) + " A, which would give " + undersized_awg + " AWG and be UNDERSIZED. ")
      + "The reason is fault current: a ground fault in one raceway returns through THAT raceway's EGC, not through all of them sharing the job, so each one has to carry the full available fault current long enough for the device to open. NOTE THE EDITION: this is the 2023-and-earlier rule. The 2026 NEC revises 250.122(F) so the EGC in each raceway need not be larger than the largest ungrounded conductor in that raceway - check which edition your jurisdiction has adopted before applying either. If the ungrounded conductors were upsized for voltage drop, 250.122(B) requires the EGC be upsized proportionally too (that is the egc-upsize-proportional tile), and 250.122(A) still says the EGC never needs to exceed the circuit conductors. The NEC as adopted and the AHJ govern.",
  };
}
export const egcParallelRacewaysExample = { inputs: { ocpd_A: 400, raceway_count: 2, material: "copper" } };

function _v1111renderEgcParallelRaceways(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 250.122(F), equipment grounding conductors for conductors in parallel, by section number. Where circuit conductors are paralleled in separate raceways, a full-size EGC sized from Table 250.122 to the rating of the circuit's overcurrent device is required in EACH raceway - the EGC is not divided among the parallel sets. The table lookup is delegated to this catalog's existing egc-sizing model rather than duplicated. EDITION NOTE: this is the 2023-and-earlier rule; the 2026 NEC revises 250.122(F) so the EGC in each raceway need not exceed the largest ungrounded conductor in that raceway. 250.122(B) proportional upsizing and the 250.122(A) never-larger-than-the-circuit-conductors limit still apply. The NEC as adopted and the AHJ govern.";
  const oc = makeNumber("Overcurrent device rating (A)", "egcp-oc", { step: "any", min: "0"});
  const rc = makeNumber("Number of parallel raceways", "egcp-rc", { step: "1", min: "2", value: "2" });
  rc.input.value = "2";
  const mt = makeSelect("Conductor material", "egcp-mt", [
    { value: "copper", label: "Copper" }, { value: "aluminum", label: "Aluminum" },
  ]);
  mt.select.value = "copper";
  for (const f of [oc, rc, mt]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { oc.input.value = "400"; rc.input.value = "2"; mt.select.value = "copper"; update(); });
  const oE = makeOutputLine(outputRegion, "EGC in EACH raceway", "egcp-out-e");
  const oW = makeOutputLine(outputRegion, "The common mistake", "egcp-out-w");
  const oN = makeOutputLine(outputRegion, "Note", "egcp-out-n");
  const update = debounce(() => {
    const r = computeEgcParallelRaceways({ ocpd_A: Number(oc.input.value), raceway_count: Number(rc.input.value), material: mt.select.value }); stepsFor(outputRegion, inputRegion, ["ocpd_A", "raceway_count", "material"], r);
    if (r.error) { oE.textContent = r.error; oW.textContent = "-"; oN.textContent = "-"; return; }
    oE.textContent = r.total_egc_count + " runs of " + r.egc_per_raceway_awg + " AWG " + mt.select.value + " (one per raceway, sized to the full " + r.ocpd_A + " A)";
    oW.textContent = r.same_either_way
      ? "sizing from the divided " + fmt(r.divided_ocpd_A, 0) + " A gives the same size at this rating"
      : "sizing from the divided " + fmt(r.divided_ocpd_A, 0) + " A would give " + r.undersized_awg + " AWG - UNDERSIZED";
    oN.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [oc, rc]) f.input.addEventListener("input", update);
  mt.select.addEventListener("change", update);
  update();
}
ELECTRICALANALYSIS_RENDERERS["egc-parallel-raceways"] = _v1111renderEgcParallelRaceways;
