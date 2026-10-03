// Group A (cont.): electrical field installation and branch-circuit calculations.
// spec-v1860 moves these existing calculators out of calc-electrical.js so the
// electrical module stays below its gzip cap. Calculator behavior, IDs,
// citations, examples, and Group A assignments are unchanged.

import { conductorResistancePerKft } from "./pure-math.js";
import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeOutputLine, attachExampleButton, fmt,
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

const _STD_OCPD_240_6 = [
  15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200,
  225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000,
  2500, 3000, 4000, 5000, 6000,
];

export const ELECTRICALFIELD_RENDERERS = {};

// ===================== spec-v849: cable reel capacity / length on reel =====================
// dims: in { flange_dia_in: L, drum_dia_in: L, traverse_width_in: L, cable_od_in: L, fill_factor: dimensionless } out: { length_ft: L }
export function computeCableReelCapacity({ flange_dia_in = 30, drum_dia_in = 12, traverse_width_in = 18, cable_od_in = 1, fill_factor = 0.9 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(flange_dia_in > 0)) return { error: "Flange diameter must be positive (in)." };
  if (!(traverse_width_in > 0)) return { error: "Traverse width must be positive (in)." };
  if (!(cable_od_in > 0)) return { error: "Cable OD must be positive (in)." };
  if (!(fill_factor > 0)) return { error: "Fill factor must be positive." };
  if (!(flange_dia_in > drum_dia_in)) return { error: "Flange diameter must exceed the drum diameter (no winding annulus)." };
  const length_ft = (fill_factor * Math.PI * (flange_dia_in * flange_dia_in - drum_dia_in * drum_dia_in) * traverse_width_in) / (48 * cable_od_in * cable_od_in);
  if (!Number.isFinite(length_ft)) return { error: "Reel-capacity math is not a finite value." };
  return {
    length_ft,
    note: "The fill factor accounts for imperfect winding (about 0.85-0.9). The same relation works backward: read the length left on a partial reel from the measured buildup by entering the buildup diameter as the flange. The reel dimensions come from the reel and the cable OD from the cable.",
  };
}

export const cableReelCapacityExample = { inputs: { flange_dia_in: 30, drum_dia_in: 12, traverse_width_in: 18, cable_od_in: 1, fill_factor: 0.9 } };

function _v849renderCableReelCapacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: reel-capacity identity by name. length (ft) = fill x pi x (flange^2 - drum^2) x traverse / (48 x cable_OD^2), lengths in inches. The fill factor (~0.85-0.9) accounts for imperfect winding.";
  const fl = makeNumber("Reel flange diameter (in)", "crc-fl", { step: "any", min: "0" });
  const dr = makeNumber("Drum / hub diameter (in)", "crc-dr", { step: "any", min: "0" });
  const tw = makeNumber("Inside width between flanges (in)", "crc-tw", { step: "any", min: "0" });
  const od = makeNumber("Cable outside diameter (in)", "crc-od", { step: "any", min: "0" });
  const ff = makeNumber("Winding fill factor", "crc-ff", { step: "any", min: "0" });
  for (const f of [fl, dr, tw, od, ff]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { fl.input.value = "30"; dr.input.value = "12"; tw.input.value = "18"; od.input.value = "1"; ff.input.value = "0.9"; update(); });
  const oLen = makeOutputLine(outputRegion, "Cable that fits on the reel", "crc-out-len");
  const update = debounce(() => {
    const r = computeCableReelCapacity({
      flange_dia_in: fl.input.value === "" ? 30 : Number(fl.input.value), drum_dia_in: dr.input.value === "" ? 12 : Number(dr.input.value),
      traverse_width_in: tw.input.value === "" ? 18 : Number(tw.input.value), cable_od_in: od.input.value === "" ? 1 : Number(od.input.value),
      fill_factor: ff.input.value === "" ? 0.9 : Number(ff.input.value),
    });
    if (r.error) { oLen.textContent = r.error; return; }
    oLen.textContent = fmt(r.length_ft, 0) + " ft";
  }, DEBOUNCE_MS);
  for (const f of [fl, dr, tw, od, ff]) f.input.addEventListener("input", update);
}
ELECTRICALFIELD_RENDERERS["cable-reel-capacity"] = _v849renderCableReelCapacity;

// ===================== spec-v852: cable-pulling lubricant quantity =====================
// dims: in { length_ft: L, conduit_id_in: L, k_factor: dimensionless, bend_factor: dimensionless } out: { gallons: L^3 }
export function computeWirePullingLubricant({ length_ft = 400, conduit_id_in = 3, k_factor = 0.0015, bend_factor = 1.0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(length_ft > 0)) return { error: "Run length must be positive (ft)." };
  if (!(conduit_id_in > 0)) return { error: "Conduit inside diameter must be positive (in)." };
  if (!(k_factor > 0)) return { error: "K factor must be positive." };
  if (!(bend_factor > 0)) return { error: "Bend factor must be positive." };
  // Polywater: Q = K x L x D, linear in the ID because the film coats the
  // wall area (pi D L). Until 2026-09-18 this squared D, 3x high at 3 in.
  const gallons = k_factor * length_ft * conduit_id_in * bend_factor;
  if (!Number.isFinite(gallons)) return { error: "Lubricant math is not a finite value." };
  return {
    gallons,
    note: "K is a film-coating rule from the lubricant manufacturer (about 0.0015 for the common Polywater rule). More bends and higher conduit fill raise the demand through the bend factor. Under-lubing risks a stuck pull, so round up and keep a spare pail.",
  };
}

export const wirePullingLubricantExample = { inputs: { length_ft: 400, conduit_id_in: 3, k_factor: 0.0015, bend_factor: 1.0 } };

function _v852renderWirePullingLubricant(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: film-coating estimate by name. gallons = K x length x conduit ID x bend factor (Polywater Q = 0.0015 x L(ft) x D(in)). K is a film-coating rule from the lubricant manufacturer (~0.0015 for the common Polywater rule); more bends and fill raise the bend factor.";
  const l = makeNumber("Conduit run length (ft)", "wpl-l", { step: "any", min: "0" });
  const id = makeNumber("Conduit inside diameter (in)", "wpl-id", { step: "any", min: "0" });
  const k = makeNumber("Film-coating K factor", "wpl-k", { step: "any", min: "0" });
  const bf = makeNumber("Bend / fill multiplier", "wpl-bf", { step: "any", min: "0" });
  for (const f of [l, id, k, bf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { l.input.value = "400"; id.input.value = "3"; k.input.value = "0.0015"; bf.input.value = "1.0"; update(); });
  const oGal = makeOutputLine(outputRegion, "Lubricant to bring", "wpl-out-gal");
  const update = debounce(() => {
    const r = computeWirePullingLubricant({
      length_ft: l.input.value === "" ? 400 : Number(l.input.value), conduit_id_in: id.input.value === "" ? 3 : Number(id.input.value),
      k_factor: k.input.value === "" ? 0.0015 : Number(k.input.value), bend_factor: bf.input.value === "" ? 1.0 : Number(bf.input.value),
    });
    if (r.error) { oGal.textContent = r.error; return; }
    oGal.textContent = fmt(r.gallons, 1) + " gal";
  }, DEBOUNCE_MS);
  for (const f of [l, id, k, bf]) f.input.addEventListener("input", update);
}
ELECTRICALFIELD_RENDERERS["wire-pulling-lubricant"] = _v852renderWirePullingLubricant;

// ===================== spec-v854: branch-circuit conductor footage takeoff =====================
// dims: in { circuits: dimensionless, avg_homerun_ft: L, makeup_ft: L, conductors_per_circuit: dimensionless, roll_ft: L } out: { total_ft: L, rolls: dimensionless }
export function computeBranchCircuitWireFootage({ circuits = 20, avg_homerun_ft = 45, makeup_ft = 15, conductors_per_circuit = 3, roll_ft = 1000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(circuits > 0)) return { error: "Circuit count must be positive." };
  if (!(avg_homerun_ft > 0)) return { error: "Home-run length must be positive (ft)." };
  if (!(conductors_per_circuit > 0)) return { error: "Conductors per circuit must be positive." };
  if (!(roll_ft > 0)) return { error: "Roll length must be positive (ft)." };
  if (makeup_ft < 0) return { error: "Makeup cannot be negative (ft)." };
  const total_ft = circuits * (avg_homerun_ft + makeup_ft) * conductors_per_circuit;
  const rolls = Math.ceil(total_ft / roll_ft - 1e-9);
  if (![total_ft, rolls].every(Number.isFinite)) return { error: "Footage math is not a finite value." };
  return {
    total_ft,
    rolls,
    note: "For individual conductors in conduit, each conductor is counted (set conductors-per-circuit). For cable (NM / romex), set conductors-per-circuit to 1 to tally the cable itself. The home run is panel-to-first-device; the makeup is the per-box slack summed. Wire is bought per color, so this is the per-color roll count.",
  };
}

export const branchCircuitWireFootageExample = { inputs: { circuits: 20, avg_homerun_ft: 45, makeup_ft: 15, conductors_per_circuit: 3, roll_ft: 1000 } };

function _v854renderBranchCircuitWireFootage(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: footage takeoff identity by name. total = circuits x (home run + makeup) x conductors; rolls = ceil(total / roll length). Each conductor is counted in conduit; set conductors to 1 for cable (NM / romex). Wire is bought per color.";
  const c = makeNumber("Number of branch circuits", "bcw-c", { step: "any", min: "0" });
  const hr = makeNumber("Average home-run length (ft)", "bcw-hr", { step: "any", min: "0" });
  const mu = makeNumber("Box makeup / slack per circuit (ft)", "bcw-mu", { step: "any", min: "0" });
  const cp = makeNumber("Conductors per circuit (1 for cable)", "bcw-cp", { step: "any", min: "0" });
  const rf = makeNumber("Roll / spool length (ft)", "bcw-rf", { step: "any", min: "0" });
  for (const f of [c, hr, mu, cp, rf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { c.input.value = "20"; hr.input.value = "45"; mu.input.value = "15"; cp.input.value = "3"; rf.input.value = "1000"; update(); });
  const oTotal = makeOutputLine(outputRegion, "Total conductor footage", "bcw-out-total");
  const oRolls = makeOutputLine(outputRegion, "Rolls per color", "bcw-out-rolls");
  const update = debounce(() => {
    const r = computeBranchCircuitWireFootage({
      circuits: c.input.value === "" ? 20 : Number(c.input.value), avg_homerun_ft: hr.input.value === "" ? 45 : Number(hr.input.value),
      makeup_ft: mu.input.value === "" ? 15 : Number(mu.input.value), conductors_per_circuit: cp.input.value === "" ? 3 : Number(cp.input.value),
      roll_ft: rf.input.value === "" ? 1000 : Number(rf.input.value),
    });
    if (r.error) { oTotal.textContent = r.error; oRolls.textContent = "-"; return; }
    oTotal.textContent = fmt(r.total_ft, 0) + " ft";
    oRolls.textContent = fmt(r.rolls, 0) + " rolls";
  }, DEBOUNCE_MS);
  for (const f of [c, hr, mu, cp, rf]) f.input.addEventListener("input", update);
}
ELECTRICALFIELD_RENDERERS["branch-circuit-wire-footage"] = _v854renderBranchCircuitWireFootage;

// ===================== spec-v924: max microinverters per AC branch circuit =====================
// dims: in { branch_ocpd_a: I, unit_max_current_a: I } out: { max_microinverters: dimensionless, branch_load_a: I, continuous_limit_a: I }
export function computeMicroinverterBranchCount({ branch_ocpd_a = 20, unit_max_current_a = 1.21 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(branch_ocpd_a > 0)) return { error: "Branch OCPD must be positive (A)." };
  if (!(unit_max_current_a > 0)) return { error: "Microinverter max current must be positive (A)." };
  // NEC 705.60 / 690.8(B) / 240.4: continuous inverter output is limited to 80% of the branch OCPD.
  const continuous_limit_a = branch_ocpd_a * 0.80;
  const max_microinverters = Math.floor(continuous_limit_a / unit_max_current_a + 1e-9);
  const branch_load_a = max_microinverters * unit_max_current_a;
  if (![max_microinverters, branch_load_a, continuous_limit_a].every(Number.isFinite)) return { error: "Branch-count math is not a finite value." };
  return {
    max_microinverters,
    branch_load_a,
    continuous_limit_a,
    note: "The most microinverters (or AC modules) on one AC branch circuit: their combined continuous output current, as a continuous load, may not exceed 80% of the branch overcurrent device (NEC 705.60 / 690.8(B) / 240.4), so N = floor(OCPD x 0.80 / unit max current). On a 20 A branch an Enphase IQ7+ at 1.21 A allows 13 units; a higher-output unit allows fewer. Use the unit's MAXIMUM continuous AC output current from its datasheet (not the panel wattage divided by voltage), and keep the branch conductors and the point-of-connection sized to the same 125% continuous rule. The microinverter datasheet, the AHJ, and the adopted NEC edition govern the final layout." ,
  };
}

export const microinverterBranchCountExample = { inputs: { branch_ocpd_a: 20, unit_max_current_a: 1.21 } };

function _v924renderMicroinverterBranchCount(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: max microinverters per AC branch by name (NEC 705.60 / 690.8(B) / 240.4). N = floor(branch OCPD x 0.80 / unit max continuous AC current) -- the combined continuous output cannot exceed 80% of the branch OCPD. The datasheet and the adopted NEC edition govern.";
  const oc = makeNumber("Branch OCPD (A)", "mbc-oc", { step: "any", min: "0" });
  const iu = makeNumber("Microinverter max AC current (A)", "mbc-iu", { step: "any", min: "0" });
  for (const f of [oc, iu]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { oc.input.value = "20"; iu.input.value = "1.21"; update(); });
  const oN = makeOutputLine(outputRegion, "Max microinverters per branch", "mbc-out-n");
  const oLoad = makeOutputLine(outputRegion, "Branch continuous load", "mbc-out-l");
  const update = debounce(() => {
    const r = computeMicroinverterBranchCount({
      branch_ocpd_a: oc.input.value === "" ? 20 : Number(oc.input.value), unit_max_current_a: iu.input.value === "" ? 1.21 : Number(iu.input.value),
    });
    if (r.error) { oN.textContent = r.error; oLoad.textContent = "-"; return; }
    oN.textContent = fmt(r.max_microinverters, 0) + " units";
    oLoad.textContent = fmt(r.branch_load_a, 2) + " A of " + fmt(r.continuous_limit_a, 1) + " A allowed (80% of " + fmt(Number(oc.input.value) || 20, 0) + " A)";
  }, DEBOUNCE_MS);
  for (const f of [oc, iu]) f.input.addEventListener("input", update);
}
ELECTRICALFIELD_RENDERERS["microinverter-branch-count"] = _v924renderMicroinverterBranchCount;

// ===================== spec-v932: arc-welder branch-circuit conductor and OCPD =====================
// dims: in { primary_current_a: I, duty_pct: dimensionless } out: { duty_multiplier: dimensionless, effective_current_a: I, ocpd_max_a: I }
export function computeWelderArcCircuitConductor({ primary_current_a = 40, duty_pct = 50 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(primary_current_a > 0)) return { error: "Nameplate primary current must be positive (A)." };
  if (!(duty_pct > 0 && duty_pct <= 100)) return { error: "Duty cycle must be between 0 and 100 percent." };
  // NEC 630.11(A) / Table 630.11(A), nonmotor-generator column: the rows from 30 to 100% duty track
  // sqrt(duty), but the table's last row is "20 or less 0.45". Until 2026-09-25 sqrt ran all the way
  // down (0.32 at 10% duty), undersizing the conductor by up to half.
  const duty_multiplier = duty_pct <= 20 ? 0.45 : Math.sqrt(duty_pct / 100);
  const effective_current_a = primary_current_a * duty_multiplier;
  // NEC 630.12(A): the overcurrent device for an arc welder may not exceed 200% of the rated primary current.
  const ocpd_max_a = 2.0 * primary_current_a;
  // 630.12(A) is a hard 200% ceiling (no round-up exception, unlike motors), so
  // the actual device is the largest standard rating AT OR BELOW it. The note
  // previously claimed this rounding but the code never performed it.
  const ocpd_std_a = _STD_OCPD_240_6.filter((sz) => sz <= ocpd_max_a).pop() ?? null;
  if (![duty_multiplier, effective_current_a, ocpd_max_a].every(Number.isFinite)) return { error: "Welder-circuit math is not a finite value." };
  return {
    duty_multiplier,
    effective_current_a,
    ocpd_max_a,
    ocpd_std_a,
    note: "Arc-welder branch circuit per NEC 630.11 and 630.12, for an AC/DC TRANSFORMER or DC-RECTIFIER welder. The conductor is sized on an EFFECTIVE current, not the nameplate primary: I_eff = I_primary x the Table 630.11(A) duty-cycle multiplier. This tile uses the transformer/rectifier column, which is the square root of the duty cycle, held at 0.45 at 20% duty or less (verified against the table's published values: 0.71 at 50%, 0.55 at 30%, 0.45 at 20%). A MOTOR-GENERATOR welder uses a DIFFERENT, HIGHER column of Table 630.11(A) that is not modeled here -- size those from the table, or the conductor will be undersized. Pick a conductor whose ampacity is at least I_eff. The overcurrent device may not exceed 200% of the rated primary current (630.12(A)); the largest standard 240.6 size at or below that ceiling is reported. A 40 A primary, 50%-duty transformer welder needs conductors rated for 28.3 A (a #10 Cu at 60 C) and an OCPD no larger than 80 A. Use the nameplate rated primary current and duty; the AHJ, the welder nameplate, and the adopted NEC edition govern.",
  };
}

export const welderArcCircuitConductorExample = { inputs: { primary_current_a: 40, duty_pct: 50 } };

function _v932renderWelderArcCircuitConductor(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: arc-welder branch-circuit conductor and OCPD by name (NEC 630.11 / 630.12) for a TRANSFORMER or DC-RECTIFIER welder. I_eff = I_primary x sqrt(duty) above 20% duty, x 0.45 at 20% or less, the transformer/rectifier column of Table 630.11(A); a MOTOR-GENERATOR welder uses a different, higher column not modeled here. Conductor ampacity >= I_eff; OCPD <= 200% of the rated primary. The welder nameplate and the adopted NEC edition govern.";
  const ip = makeNumber("Nameplate primary current (A)", "wac-ip", { step: "any", min: "0" });
  const dc = makeNumber("Duty cycle (%)", "wac-dc", { step: "any", min: "0" });
  for (const f of [ip, dc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ip.input.value = "40"; dc.input.value = "50"; update(); });
  const oEff = makeOutputLine(outputRegion, "Effective current (size conductor to)", "wac-out-eff");
  const oOcpd = makeOutputLine(outputRegion, "Max overcurrent device", "wac-out-ocpd");
  const update = debounce(() => {
    const r = computeWelderArcCircuitConductor({
      primary_current_a: ip.input.value === "" ? 40 : Number(ip.input.value), duty_pct: dc.input.value === "" ? 50 : Number(dc.input.value),
    });
    if (r.error) { oEff.textContent = r.error; oOcpd.textContent = "-"; return; }
    oEff.textContent = fmt(r.effective_current_a, 1) + " A (" + fmt(r.duty_multiplier, 2) + "x nameplate)";
    oOcpd.textContent = fmt(r.ocpd_max_a, 0) + " A max (200% of " + fmt(Number(ip.input.value) || 40, 0) + " A)" + (r.ocpd_std_a ? "; largest standard size <= that: " + fmt(r.ocpd_std_a, 0) + " A" : "");
  }, DEBOUNCE_MS);
  for (const f of [ip, dc]) f.input.addEventListener("input", update);
}
ELECTRICALFIELD_RENDERERS["welder-arc-circuit-conductor"] = _v932renderWelderArcCircuitConductor;

// ===================== spec-v933: resistance-welder branch-circuit conductor and OCPD =====================
// dims: in { primary_current_a: I, duty_pct: dimensionless } out: { duty_multiplier: dimensionless, conductor_current_a: I, ocpd_max_a: I }
export function computeWelderResistanceCircuitConductor({ primary_current_a = 100, duty_pct = 50 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(primary_current_a > 0)) return { error: "Nameplate primary current must be positive (A)." };
  if (!(duty_pct > 0 && duty_pct <= 100)) return { error: "Duty cycle must be between 0 and 100 percent." };
  // NEC 630.31(A)(2): a specific nonrepetitive resistance welder sizes its conductor at the primary current times
  // the square root of the duty cycle (a spot welder fires briefly, so the conductor heats far less than the peak).
  // Table 630.31(A)(2) stops at "5 or less 0.22"; below 5% the multiplier holds at 0.22 (it was
  // sqrt all the way down until 2026-09-25, 0.14 at 2% duty).
  // At the duty cycles the table lists, the code's multiplier is the printed two-place value (0.71 at 50%,
  // not sqrt(0.5) = 0.7071); between rows the square root the table rounds is used. Until 2026-09-25 the
  // square root was used at the listed rows too, 0.4% under the code at 50%.
  const WELDER_630_31_A2 = { 50: 0.71, 40: 0.63, 30: 0.55, 25: 0.50, 20: 0.45, 15: 0.39, 10: 0.32, 7.5: 0.27 };
  const duty_multiplier = duty_pct <= 5 ? 0.22 : (WELDER_630_31_A2[duty_pct] ?? Math.sqrt(duty_pct / 100));
  const conductor_current_a = primary_current_a * duty_multiplier;
  // NEC 630.32(A): the overcurrent device for a resistance welder may not exceed 300% of the rated primary current.
  const ocpd_max_a = 3.0 * primary_current_a;
  if (![duty_multiplier, conductor_current_a, ocpd_max_a].every(Number.isFinite)) return { error: "Welder-circuit math is not a finite value." };
  return {
    duty_multiplier,
    conductor_current_a,
    ocpd_max_a,
    note: "Resistance (spot / seam / projection) welder branch circuit per NEC 630.31 and 630.32. A resistance welder fires in brief high-current pulses, so the conductor is sized on the primary current times the Table 630.31(A)(2) multiplier (0.71 at 50%; sqrt between rows; 0.22 at 5% or less) (NEC 630.31(A)(2) for a specific nonrepetitive welder), the same duty-derating as an arc welder. But the overcurrent device is allowed up to 300% of the rated primary current (630.32(A)) -- higher than the 200% for arc welders -- because the pulses would nuisance-trip a tighter device. A 100 A primary, 50%-duty spot welder needs conductors rated 71 A (a #4 Cu at 75 C) on up to a 300 A device. Use the nameplate rated primary current and duty; the AHJ, the welder nameplate, and the adopted NEC edition govern. Arc welders use the separate 630.11/630.12 (200%) method.",
  };
}

export const welderResistanceCircuitConductorExample = { inputs: { primary_current_a: 100, duty_pct: 50 } };

function _v933renderWelderResistanceCircuitConductor(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: resistance-welder branch-circuit conductor and OCPD by name (NEC 630.31 / 630.32). conductor = primary x the Table 630.31(A)(2) multiplier (sqrt(duty) between listed rows; 0.22 at 5% or less) (630.31(A)(2)); OCPD <= 300% of the rated primary (630.32(A)). The welder nameplate and the adopted NEC edition govern.";
  const ip = makeNumber("Nameplate primary current (A)", "wrc-ip", { step: "any", min: "0" });
  const dc = makeNumber("Duty cycle (%)", "wrc-dc", { step: "any", min: "0" });
  for (const f of [ip, dc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ip.input.value = "100"; dc.input.value = "50"; update(); });
  const oCond = makeOutputLine(outputRegion, "Conductor current (size to)", "wrc-out-cond");
  const oOcpd = makeOutputLine(outputRegion, "Max overcurrent device", "wrc-out-ocpd");
  const update = debounce(() => {
    const r = computeWelderResistanceCircuitConductor({
      primary_current_a: ip.input.value === "" ? 100 : Number(ip.input.value), duty_pct: dc.input.value === "" ? 50 : Number(dc.input.value),
    });
    if (r.error) { oCond.textContent = r.error; oOcpd.textContent = "-"; return; }
    oCond.textContent = fmt(r.conductor_current_a, 1) + " A (" + fmt(r.duty_multiplier, 2) + "x nameplate)";
    oOcpd.textContent = fmt(r.ocpd_max_a, 0) + " A (300% of " + fmt(Number(ip.input.value) || 100, 0) + " A)";
  }, DEBOUNCE_MS);
  for (const f of [ip, dc]) f.input.addEventListener("input", update);
}
ELECTRICALFIELD_RENDERERS["welder-resistance-circuit-conductor"] = _v933renderWelderResistanceCircuitConductor;

// ===================== spec-v941: battery-to-inverter DC conductor and OCPD (NEC 690.9 / 706) =====================
const _V941_STD_OCPD = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200];
// dims: in { inverter_power_w: M L^2 T^-3, battery_voltage_v: M L^2 T^-3 I^-1, efficiency_pct: dimensionless } out: { dc_current_a: I, min_conductor_ampacity_a: I, ocpd_a: I }
export function computeBatteryInverterDcConductor({ inverter_power_w = 4000, battery_voltage_v = 48, efficiency_pct = 90 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // An efficiency is a percent; 0 < value < 1 is a fraction typed into a percent field (added 2026-09-26).
  if (["efficiency_pct"].some((k) => { const v = Number(arguments[0]?.[k]); return v > 0 && v < 1; })) return { error: "Enter efficiencies as a percent (85 for 85%), not a fraction." };
  if (!(inverter_power_w > 0)) return { error: "Inverter power must be positive (W)." };
  if (!(battery_voltage_v > 0)) return { error: "Battery bank voltage must be positive (V)." };
  if (!(efficiency_pct > 0 && efficiency_pct <= 100)) return { error: "Efficiency must be between 0 and 100 percent." };
  // DC input current the inverter pulls at full output: P_ac / (V_dc x efficiency).
  const dc_current_a = inverter_power_w / (battery_voltage_v * (efficiency_pct / 100));
  // NEC 690.8(B)/706/240.4: conductor and OCPD at 125% of the continuous current.
  const min_conductor_ampacity_a = 1.25 * dc_current_a;
  const ocpd_a = _V941_STD_OCPD.find((s) => s >= min_conductor_ampacity_a) || Math.ceil(min_conductor_ampacity_a - 1e-9);
  if (![dc_current_a, min_conductor_ampacity_a, ocpd_a].every(Number.isFinite)) return { error: "Battery-conductor math is not a finite value." };
  return {
    dc_current_a,
    min_conductor_ampacity_a,
    ocpd_a,
    note: "Battery-to-inverter DC conductor and overcurrent device for an off-grid or ESS system. The inverter's full-output DC input current is its AC power divided by the battery voltage and the inverter efficiency (a lower bank voltage pulls MUCH more current). NEC 690.8(B) / 706 / 240.4 size both the conductor and the OCPD at 125% of that continuous current, and the OCPD rounds UP to the next standard size (240.6). A 4 kW inverter on a 48 V bank at 90% efficiency draws about 92.6 A, so the conductor is rated at least 115.7 A (a #1 Cu at 75 C, 130 A) on a 125 A DC fuse. Use a listed DC-rated (often Class T for a battery's high available fault current) fuse and switch, keep the run short and heavy for voltage drop, and terminate at the battery's rated torque. A sizing estimate; the inverter and battery datasheets, the fault-current rating, the AHJ, and the adopted NEC edition govern.",
  };
}

export const batteryInverterDcConductorExample = { inputs: { inverter_power_w: 4000, battery_voltage_v: 48, efficiency_pct: 90 } };

function _v941renderBatteryInverterDcConductor(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: battery-to-inverter DC conductor and OCPD by name (NEC 690.8(B) / 706 / 240.4). I_dc = P_ac / (V_dc x efficiency); conductor ampacity and OCPD at 125% of I_dc, OCPD to the next standard size (240.6). Use a listed DC-rated (Class T) fuse; the datasheets and NEC govern.";
  const pw = makeNumber("Inverter continuous power (W)", "bid-pw", { step: "any", min: "0" });
  const bv = makeNumber("Battery bank voltage (V)", "bid-bv", { step: "any", min: "0" });
  const ef = makeNumber("Inverter efficiency (%)", "bid-ef", { step: "any", min: "0" });
  for (const f of [pw, bv, ef]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { pw.input.value = "4000"; bv.input.value = "48"; ef.input.value = "90"; update(); });
  const oI = makeOutputLine(outputRegion, "DC input current", "bid-out-i");
  const oC = makeOutputLine(outputRegion, "Min conductor ampacity (125%)", "bid-out-c");
  const oO = makeOutputLine(outputRegion, "DC overcurrent device", "bid-out-o");
  const update = debounce(() => {
    const r = computeBatteryInverterDcConductor({
      inverter_power_w: pw.input.value === "" ? 4000 : Number(pw.input.value), battery_voltage_v: bv.input.value === "" ? 48 : Number(bv.input.value),
      efficiency_pct: ef.input.value === "" ? 90 : Number(ef.input.value),
    });
    if (r.error) { oI.textContent = r.error; oC.textContent = "-"; oO.textContent = "-"; return; }
    oI.textContent = fmt(r.dc_current_a, 1) + " A";
    oC.textContent = fmt(r.min_conductor_ampacity_a, 1) + " A";
    oO.textContent = fmt(r.ocpd_a, 0) + " A (next standard size)";
  }, DEBOUNCE_MS);
  for (const f of [pw, bv, ef]) f.input.addEventListener("input", update);
}
ELECTRICALFIELD_RENDERERS["battery-inverter-dc-conductor"] = _v941renderBatteryInverterDcConductor;

// ===================== spec-v942: inverter AC output-circuit conductor and OCPD (NEC 690.8(B) / 705.60) =====================
// dims: in { ac_power_w: M L^2 T^-3, ac_voltage_v: M L^2 T^-3 I^-1, phases: dimensionless } out: { continuous_current_a: I, min_conductor_ampacity_a: I, ocpd_a: I }
export function computePvAcOutputCircuit({ ac_power_w = 9600, ac_voltage_v = 240, phases = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(ac_power_w > 0)) return { error: "Inverter AC power must be positive (W)." };
  if (!(ac_voltage_v > 0)) return { error: "AC voltage must be positive (V)." };
  const ph = Math.round(phases);
  if (ph !== 1 && ph !== 3) return { error: "Phases must be 1 (single-phase) or 3 (three-phase)." };
  // I_cont = P / (V x line-to-line factor): 1 for single-phase, sqrt(3) for three-phase.
  const phase_factor = ph === 3 ? Math.sqrt(3) : 1;
  const continuous_current_a = ac_power_w / (ac_voltage_v * phase_factor);
  // NEC 690.8(B) / 705.60 / 240.4: conductor and OCPD at 125% of the continuous inverter output current.
  const min_conductor_ampacity_a = 1.25 * continuous_current_a;
  const ocpd_a = _V941_STD_OCPD.find((s) => s >= min_conductor_ampacity_a) || Math.ceil(min_conductor_ampacity_a - 1e-9);
  if (![continuous_current_a, min_conductor_ampacity_a, ocpd_a].every(Number.isFinite)) return { error: "AC-output math is not a finite value." };
  return {
    continuous_current_a,
    min_conductor_ampacity_a,
    ocpd_a,
    note: "The inverter AC output circuit -- the conductors and overcurrent device from the inverter to the point of connection. The inverter's rated continuous output current is its AC power divided by the output voltage (times sqrt(3) for a three-phase inverter). Because it is a continuous source, NEC 690.8(B) / 705.60 / 240.4 size both the conductor and the overcurrent device at 125% of that current, and the OCPD rounds up to the next standard size (240.6). A 9.6 kW inverter at 240 V single-phase puts out 40 A, so the conductor is rated at least 50 A (a #6 Cu at 75 C) on a 50 A breaker; the same inverter at 208 V three-phase is only 26.6 A. Use the inverter's RATED continuous AC output current from its datasheet if given (it can differ slightly from power/voltage), and check the 705.12 busbar / point-of-connection limit separately. A sizing estimate; the inverter datasheet, the AHJ, and the adopted NEC edition govern.",
  };
}

export const pvAcOutputCircuitExample = { inputs: { ac_power_w: 9600, ac_voltage_v: 240, phases: 1 } };

function _v942renderPvAcOutputCircuit(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: inverter AC output-circuit conductor and OCPD by name (NEC 690.8(B) / 705.60 / 240.4). I_cont = P / (V x [1 or sqrt(3)]); conductor and OCPD at 125% of I_cont, OCPD to the next standard size (240.6). Check the 705.12 busbar limit separately; the datasheet and NEC govern.";
  const pw = makeNumber("Inverter AC power (W)", "pao-pw", { step: "any", min: "0" });
  const vv = makeNumber("AC voltage (V, line-to-line)", "pao-vv", { step: "any", min: "0" });
  const ph = makeNumber("Phases (1 or 3)", "pao-ph", { step: "1", min: "1" });
  for (const f of [pw, vv, ph]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { pw.input.value = "9600"; vv.input.value = "240"; ph.input.value = "1"; update(); });
  const oI = makeOutputLine(outputRegion, "Continuous output current", "pao-out-i");
  const oC = makeOutputLine(outputRegion, "Min conductor ampacity (125%)", "pao-out-c");
  const oO = makeOutputLine(outputRegion, "Overcurrent device", "pao-out-o");
  const update = debounce(() => {
    const r = computePvAcOutputCircuit({
      ac_power_w: pw.input.value === "" ? 9600 : Number(pw.input.value), ac_voltage_v: vv.input.value === "" ? 240 : Number(vv.input.value),
      phases: ph.input.value === "" ? 1 : Number(ph.input.value),
    });
    if (r.error) { oI.textContent = r.error; oC.textContent = "-"; oO.textContent = "-"; return; }
    oI.textContent = fmt(r.continuous_current_a, 1) + " A";
    oC.textContent = fmt(r.min_conductor_ampacity_a, 1) + " A";
    oO.textContent = fmt(r.ocpd_a, 0) + " A (next standard size)";
  }, DEBOUNCE_MS);
  for (const f of [pw, vv, ph]) f.input.addEventListener("input", update);
}
ELECTRICALFIELD_RENDERERS["pv-ac-output-circuit"] = _v942renderPvAcOutputCircuit;

// ===================== spec-v951: Wenner 4-pin soil resistivity =====================
// dims: in { probe_spacing_ft: L, meter_resistance_ohm: M L^2 T^-3 I^-2 } out: { resistivity_ohm_m: dimensionless, resistivity_ohm_cm: dimensionless }
export function computeSoilResistivityWenner({ probe_spacing_ft = 10, meter_resistance_ohm = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(probe_spacing_ft > 0)) return { error: "Probe spacing must be positive (ft)." };
  if (!(meter_resistance_ohm > 0)) return { error: "Meter resistance reading must be positive (ohms)." };
  // Wenner equal-spacing 4-pin array: rho = 2*pi*a*R with a in the same length unit; report ohm-m and ohm-cm.
  const a_m = probe_spacing_ft * 0.3048;
  const resistivity_ohm_m = 2 * Math.PI * a_m * meter_resistance_ohm;
  const resistivity_ohm_cm = resistivity_ohm_m * 100;
  if (![resistivity_ohm_m, resistivity_ohm_cm].every(Number.isFinite)) return { error: "Soil-resistivity math is not a finite value." };
  return {
    resistivity_ohm_m,
    resistivity_ohm_cm,
    note: "Apparent soil resistivity from a Wenner 4-pin (four-electrode, equal-spacing) test, the field measurement behind every ground-grid and driven-rod design: rho = 2 x pi x a x R, where a is the equal probe spacing and R is the earth-tester reading. With a in meters the result is ohm-meters (x100 for ohm-cm, the unit the grounding-electrode / Dwight tile wants). A 10 ft (3.048 m) spacing reading 5 ohms is 2 x pi x 3.048 x 5 = 95.8 ohm-m (9,575 ohm-cm); a wider 20 ft spacing probes deeper soil. The spacing a is the effective depth explored, so a set of readings at increasing spacings maps resistivity versus depth (a sounding) and reveals layering. This assumes the electrode depth is small compared with the spacing (the standard Wenner assumption) and that the 4 pins are equally spaced in a straight line. Soil resistivity swings widely with moisture, temperature, and season; the wettest-to-driest range and the AWWA/IEEE 81 test method and the engineer of record govern the design value.",
  };
}

export const soilResistivityWennerExample = { inputs: { probe_spacing_ft: 10, meter_resistance_ohm: 5 } };

function _v951renderSoilResistivityWenner(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Wenner 4-pin (four-electrode, equal-spacing) soil resistivity test, by name (IEEE 81 / ASTM G57). rho = 2 x pi x a x R with a the equal probe spacing (converted to meters) and R the earth-tester reading; result in ohm-m and ohm-cm. Assumes electrode depth small vs spacing. Resistivity varies with moisture/temperature/season; the IEEE 81 method and the engineer govern.";
  const sp = makeNumber("Probe spacing a (ft)", "srw-sp", { step: "any", min: "0" });
  const rr = makeNumber("Earth-tester reading R (ohms)", "srw-rr", { step: "any", min: "0" });
  for (const f of [sp, rr]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sp.input.value = "10"; rr.input.value = "5"; update(); });
  const oM = makeOutputLine(outputRegion, "Soil resistivity", "srw-out-m");
  const oCm = makeOutputLine(outputRegion, "Soil resistivity (ohm-cm)", "srw-out-cm");
  const update = debounce(() => {
    const r = computeSoilResistivityWenner({
      probe_spacing_ft: sp.input.value === "" ? 10 : Number(sp.input.value), meter_resistance_ohm: rr.input.value === "" ? 5 : Number(rr.input.value),
    });
    if (r.error) { oM.textContent = r.error; oCm.textContent = "-"; return; }
    oM.textContent = fmt(r.resistivity_ohm_m, 1) + " ohm-m";
    oCm.textContent = fmt(r.resistivity_ohm_cm, 0) + " ohm-cm (feeds grounding-electrode)";
  }, DEBOUNCE_MS);
  for (const f of [sp, rr]) f.input.addEventListener("input", update);
}
ELECTRICALFIELD_RENDERERS["soil-resistivity-wenner"] = _v951renderSoilResistivityWenner;

// ===================== spec-v981: maximum one-way circuit length for a voltage-drop target =====================
// dims: in { source_voltage_v: M L^2 T^-3 I^-1, target_vd_pct: dimensionless, current_a: I, conductor_cmil: L^2, k_constant: M L^3 T^-3 I^-2, phases: dimensionless } out: { vd_target_volts: M L^2 T^-3 I^-1, max_length_ft: L }
export function computeMaxCircuitLengthForVd({ source_voltage_v = 120, target_vd_pct = 3, current_a = 20, conductor_cmil = 6530, k_constant = 12.9, phases = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(source_voltage_v > 0)) return { error: "Source voltage must be positive (V)." };
  if (!(target_vd_pct > 0)) return { error: "Target voltage drop must be positive (percent)." };
  if (!(current_a > 0)) return { error: "Load current must be positive (A)." };
  if (!(conductor_cmil > 0)) return { error: "Conductor size must be positive (circular mils)." };
  if (!(k_constant > 0)) return { error: "Resistivity constant K must be positive (12.9 Cu, 21.2 Al)." };
  if (phases !== 1 && phases !== 3) return { error: "Phases must be 1 (single-phase) or 3 (three-phase)." };
  // VD = (2 or sqrt3) x K x I x L / cmil, solved for the one-way length L at the target drop.
  const vd_target_volts = (target_vd_pct / 100) * source_voltage_v;
  const factor = phases === 3 ? Math.sqrt(3) : 2;
  const max_length_ft = vd_target_volts * conductor_cmil / (factor * k_constant * current_a);
  if (![vd_target_volts, max_length_ft].every(Number.isFinite)) return { error: "Max-length math is not a finite value." };
  return {
    vd_target_volts,
    max_length_ft,
    note: "The longest one-way circuit run that still meets a voltage-drop target, the inverse of the voltage-drop tile (which gives the drop for a known length) and the min-conductor tile (which gives the wire for a known length). The drop is VD = (2 for single-phase, sqrt(3) for three-phase) x K x I x L / circular mils, so the maximum length is L = VD_target x cmil / (factor x K x I), where VD_target = target percent x source voltage, K is the conductor resistivity constant (12.9 ohm-cmil/ft for copper, 21.2 for aluminum), I the load current, and cmil the conductor's circular-mil area (see awg-wire-geometry). A #12 copper (6,530 cmil) at 20 A on a 120 V single-phase branch reaches about 45 ft before it drops 3%; the same wire on a 208 V three-phase circuit reaches about 91 ft, because three-phase uses the sqrt(3) factor (smaller than 2) and the higher voltage raises the allowable volts. Doubling the current halves the length; going up a wire size (more cmil) or to a higher voltage lengthens it. This is the DC-resistance drop only (a lagging power factor and AC reactance add to it on larger conductors -- see voltage-drop-reactance), and the 3% branch / 5% total figures are informational NEC 210.19/215.2 recommendations, not hard limits. The conductor must still pass the NEC 310.16 ampacity and termination-temperature checks independently. A design aid; the AHJ and the adopted NEC edition govern.",
  };
}

export const maxCircuitLengthForVdExample = { inputs: { source_voltage_v: 120, target_vd_pct: 3, current_a: 20, conductor_cmil: 6530, k_constant: 12.9, phases: 1 } };

function _v981renderMaxCircuitLengthForVd(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: maximum one-way circuit length for a voltage-drop target, by name. L = VD_target x cmil / (factor x K x I); factor = 2 single-phase / sqrt(3) three-phase; K = 12.9 Cu / 21.2 Al ohm-cmil/ft; VD_target = target% x source V. DC-resistance drop only (reactance adds on larger conductors); the 3%/5% figures are NEC recommendations. The conductor must still pass the 310.16 ampacity check; the AHJ governs.";
  const sv = makeNumber("Source voltage (V)", "mcl-sv", { step: "any", min: "0" });
  const tp = makeNumber("Target voltage drop (%)", "mcl-tp", { step: "any", min: "0" });
  const cu = makeNumber("Load current (A)", "mcl-cu", { step: "any", min: "0" });
  const cm = makeNumber("Conductor size (circular mils)", "mcl-cm", { step: "any", min: "0" });
  const kk = makeNumber("K (12.9 Cu, 21.2 Al)", "mcl-kk", { step: "any", min: "0" });
  const ph = makeNumber("Phases (1 or 3)", "mcl-ph", { step: "1", min: "1" });
  for (const f of [sv, tp, cu, cm, kk, ph]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sv.input.value = "120"; tp.input.value = "3"; cu.input.value = "20"; cm.input.value = "6530"; kk.input.value = "12.9"; ph.input.value = "1"; update(); });
  const oV = makeOutputLine(outputRegion, "Allowable drop", "mcl-out-v");
  const oL = makeOutputLine(outputRegion, "Max one-way length", "mcl-out-l");
  const update = debounce(() => {
    const r = computeMaxCircuitLengthForVd({
      source_voltage_v: sv.input.value === "" ? 120 : Number(sv.input.value), target_vd_pct: tp.input.value === "" ? 3 : Number(tp.input.value),
      current_a: cu.input.value === "" ? 20 : Number(cu.input.value), conductor_cmil: cm.input.value === "" ? 6530 : Number(cm.input.value),
      k_constant: kk.input.value === "" ? 12.9 : Number(kk.input.value), phases: ph.input.value === "" ? 1 : Number(ph.input.value),
    });
    if (r.error) { oV.textContent = r.error; oL.textContent = "-"; return; }
    oV.textContent = fmt(r.vd_target_volts, 2) + " V (" + fmt(Number(tp.input.value) || 3, 1) + "%)";
    oL.textContent = fmt(r.max_length_ft, 1) + " ft one-way";
  }, DEBOUNCE_MS);
  for (const f of [sv, tp, cu, cm, kk, ph]) f.input.addEventListener("input", update);
}
ELECTRICALFIELD_RENDERERS["max-circuit-length-for-vd"] = _v981renderMaxCircuitLengthForVd;

// ===================== spec-v985: open-delta (V-V) transformer bank capacity =====================
// dims: in { transformer_kva_each: M L^2 T^-3, required_load_kva: M L^2 T^-3 } out: { available_3ph_kva: M L^2 T^-3, per_transformer_kva: M L^2 T^-3, utilization_pct: dimensionless }
export function computeOpenDeltaTransformer({ transformer_kva_each = 25, required_load_kva = 40 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(transformer_kva_each > 0)) return { error: "Transformer rating must be positive (kVA)." };
  if (!(required_load_kva >= 0)) return { error: "Required load must be non-negative (kVA)." };
  const s3 = Math.sqrt(3);
  // Two identical single-phase units in open delta serve sqrt(3) x one unit of balanced 3-phase load;
  // each unit then carries load / sqrt(3), so the bank utilization is capped at 86.6% of the two installed.
  const available_3ph_kva = s3 * transformer_kva_each;
  const per_transformer_kva = required_load_kva / s3;
  const utilization_pct = per_transformer_kva / transformer_kva_each * 100;
  if (![available_3ph_kva, per_transformer_kva, utilization_pct].every(Number.isFinite)) return { error: "Open-delta math is not a finite value." };
  const ok = required_load_kva <= available_3ph_kva + 1e-9 * Math.abs(available_3ph_kva);
  const verdict = ok
    ? "OK: the two-transformer open-delta bank carries this balanced three-phase load."
    : "OVERLOADED: this load exceeds the open-delta bank capacity -- use larger units or close the delta with a third transformer.";
  return {
    available_3ph_kva,
    per_transformer_kva,
    utilization_pct,
    verdict,
    note: "The balanced three-phase capacity of an open-delta (V-V) bank -- two single-phase transformers wired to serve three-phase, common where a third unit failed or a light three-phase load does not justify a full bank. Two identical units do NOT deliver twice one unit: the available three-phase capacity is sqrt(3) x one unit's rating (1.732, not 2), because each transformer carries the load divided by sqrt(3) and the phase angle between the two units caps their combined useful output at 86.6% of the two installed. Two 25 kVA units in open delta serve 1.732 x 25 = 43.3 kVA of three-phase load, each carrying 43.3 / sqrt(3) = 25.0 kVA (100% of its 25 kVA rating). Put another way, an open-delta bank delivers only 57.7% of the closed-delta bank of three identical units (43.3 vs 75 kVA), so removing one transformer from a three-unit delta drops it to 57.7%, not 66.7%. For a specific load the tile reports each unit's loading and flags an overload. A sizing screen; the transformer nameplate kVA and impedance, the actual load balance and power factor, and the utility govern the real bank.",
  };
}

export const openDeltaTransformerExample = { inputs: { transformer_kva_each: 25, required_load_kva: 40 } };

function _v985renderOpenDeltaTransformer(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: open-delta (V-V) transformer bank capacity, by name. available 3-phase kVA = sqrt(3) x one unit; each unit carries load / sqrt(3); bank utilization capped at 86.6% of the two installed, and 57.7% of the closed-delta three-unit bank. The nameplate kVA and impedance, the load balance and power factor, and the utility govern.";
  const ke = makeNumber("Transformer rating, each (kVA)", "odt-ke", { step: "any", min: "0" });
  const rl = makeNumber("Required three-phase load (kVA)", "odt-rl", { step: "any", min: "0" });
  for (const f of [ke, rl]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ke.input.value = "25"; rl.input.value = "40"; update(); });
  const oA = makeOutputLine(outputRegion, "Bank capacity (3-phase)", "odt-out-a");
  const oU = makeOutputLine(outputRegion, "Each unit loaded to", "odt-out-u");
  const oV = makeOutputLine(outputRegion, "Verdict", "odt-out-v");
  const update = debounce(() => {
    const r = computeOpenDeltaTransformer({
      transformer_kva_each: ke.input.value === "" ? 25 : Number(ke.input.value), required_load_kva: rl.input.value === "" ? 40 : Number(rl.input.value),
    });
    if (r.error) { oA.textContent = r.error; oU.textContent = "-"; oV.textContent = "-"; return; }
    oA.textContent = fmt(r.available_3ph_kva, 1) + " kVA available";
    oU.textContent = fmt(r.per_transformer_kva, 2) + " kVA (" + fmt(r.utilization_pct, 1) + "% of rating)";
    oV.textContent = r.verdict;
  }, DEBOUNCE_MS);
  for (const f of [ke, rl]) f.input.addEventListener("input", update);
}
ELECTRICALFIELD_RENDERERS["open-delta-transformer"] = _v985renderOpenDeltaTransformer;

// ===================== spec-v989: conduit nipple 60% fill (NEC Chapter 9 Note 4) =====================
// dims: in { conduit_area_sqin: L^2, conductor_area_sqin: L^2, conductor_count: dimensionless } out: { fill_area_sqin: L^2, fill_pct: dimensionless, nipple_max_conductors: dimensionless, normal_max_conductors: dimensionless }
export function computeConduitNipple60Fill({ conduit_area_sqin = 0.864, conductor_area_sqin = 0.0211, conductor_count = 20 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(conduit_area_sqin > 0)) return { error: "Conduit total area must be positive (sq in, NEC Ch. 9 Table 4)." };
  if (!(conductor_area_sqin > 0)) return { error: "Conductor area must be positive (sq in, NEC Ch. 9 Table 5)." };
  if (!(conductor_count > 0)) return { error: "Conductor count must be positive." };
  // NEC Ch. 9 Note 4: a nipple <= 24 in between enclosures may fill to 60% (vs the normal 40% for 3+ conductors).
  const fill_area_sqin = conductor_count * conductor_area_sqin;
  const fill_pct = fill_area_sqin / conduit_area_sqin * 100;
  // NEC Ch. 9 Note 7: for conductors all of the same size, a count whose decimal
  // is 0.8 or larger rounds UP to the next whole number (Annex C's 6 #8 THHN in
  // 3/4 in EMT is 5.82 rounded up). Until 2026-09-25 both counts rounded down.
  const note7 = (x) => { const w = Math.floor(x); return x - w >= 0.8 - 1e-9 ? w + 1 : w; };
  const nipple_max_conductors = note7(0.60 * conduit_area_sqin / conductor_area_sqin);
  const normal_max_conductors = note7(0.40 * conduit_area_sqin / conductor_area_sqin);
  if (![fill_area_sqin, fill_pct, nipple_max_conductors, normal_max_conductors].every(Number.isFinite)) return { error: "Nipple-fill math is not a finite value." };
  const nipple_ok = fill_pct <= 60 + 1e-9 * Math.abs(60);
  // Ch. 9 Table 1: the normal limit is 53% for one conductor, 31% for two, 40% for three or more.
  const normal_limit_pct = conductor_count === 1 ? 53 : conductor_count === 2 ? 31 : 40;
  const passes_normal = fill_pct <= normal_limit_pct + 1e-9 * Math.abs(normal_limit_pct);
  const verdict = !nipple_ok
    ? "OVER 60%: too full even for a nipple -- go up a conduit size."
    : passes_normal
      ? "OK: within the normal " + normal_limit_pct + "%, so this fill is legal in a nipple AND in any normal raceway."
      : "OK for a NIPPLE only (<= 24 in): the 60% allowance passes, but this fill exceeds the normal " + normal_limit_pct + "% -- a longer run would need a bigger conduit.";
  return {
    fill_area_sqin,
    fill_pct,
    nipple_max_conductors,
    normal_max_conductors,
    verdict,
    note: "The conductor fill allowed in a conduit or tubing NIPPLE -- a raceway no longer than 24 in between boxes, cabinets, wireways, or similar enclosures. NEC Chapter 9, Note 4 lets a nipple be filled to 60% of its total cross-sectional area, well above the 40% (three or more conductors), 31% (two), or 53% (one) limits of a normal run, because a short nipple pulls and dissipates heat easily. Fill percent = conductor count x each conductor's area / the conduit's total area (both read from NEC Chapter 9 -- Table 4 for the conduit's total area by type and trade size, Table 5 for the insulated-conductor area). Twenty #10 THHN (0.0211 in^2 each) in a 1 in EMT nipple (0.864 in^2) fill 20 x 0.0211 / 0.864 = 48.8%: legal in a nipple (the 60% cap allows 24 of them) but OVER the normal 40% (which allows only 16), so those 20 conductors could not run in a full-length raceway of the same size. Note 4 ALSO exempts nipples from the 310.15(C)(1) ampacity adjustment (derating) factors, so the conductors keep their full table ampacity through the nipple. A fill check; the exact Table 4/5 areas, the box and pull-can sizing, and the AHJ and adopted NEC edition govern.",
  };
}

export const conduitNipple60FillExample = { inputs: { conduit_area_sqin: 0.864, conductor_area_sqin: 0.0211, conductor_count: 20 } };

function _v989renderConduitNipple60Fill(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: conduit nipple 60% fill, NEC Chapter 9 Note 4, by name. A nipple <= 24 in between enclosures may fill to 60% (vs 40%/31%/53% normal). fill% = count x conductor area / conduit total area (Table 4 conduit area, Table 5 conductor area). Note 4 also exempts nipples from the 310.15(C)(1) ampacity adjustment. The exact table areas and the AHJ govern.";
  const ca = makeNumber("Conduit total area (sq in, Table 4)", "cn6-ca", { step: "any", min: "0" });
  const wa = makeNumber("Each conductor area (sq in, Table 5)", "cn6-wa", { step: "any", min: "0" });
  const nc = makeNumber("Conductor count", "cn6-nc", { step: "1", min: "1" });
  for (const f of [ca, wa, nc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ca.input.value = "0.864"; wa.input.value = "0.0211"; nc.input.value = "20"; update(); });
  const oF = makeOutputLine(outputRegion, "Fill", "cn6-out-f");
  const oM = makeOutputLine(outputRegion, "Max conductors", "cn6-out-m");
  const oV = makeOutputLine(outputRegion, "Verdict", "cn6-out-v");
  const update = debounce(() => {
    const r = computeConduitNipple60Fill({
      conduit_area_sqin: ca.input.value === "" ? 0.864 : Number(ca.input.value), conductor_area_sqin: wa.input.value === "" ? 0.0211 : Number(wa.input.value),
      conductor_count: nc.input.value === "" ? 20 : Number(nc.input.value),
    });
    if (r.error) { oF.textContent = r.error; oM.textContent = "-"; oV.textContent = "-"; return; }
    oF.textContent = fmt(r.fill_area_sqin, 4) + " sq in (" + fmt(r.fill_pct, 1) + "%)";
    oM.textContent = r.nipple_max_conductors + " in a nipple (60%), " + r.normal_max_conductors + " normal (40%)";
    oV.textContent = r.verdict;
  }, DEBOUNCE_MS);
  for (const f of [ca, wa, nc]) f.input.addEventListener("input", update);
}
ELECTRICALFIELD_RENDERERS["conduit-nipple-60-fill"] = _v989renderConduitNipple60Fill;

// --- spec-v1109 A: Multiwire branch circuit (120/240 3-wire) voltage drop ---
// The generic voltage-drop tile takes ONE current and no neutral. On a 3-wire MWBC the two hots
// are out of phase and share a neutral that carries the DIFFERENCE, so the neutral drop shifts the
// load-end neutral and lands on both legs with opposite sign. With equal conductors:
//   VD_A = R(2 I_A - I_B),  VD_B = R(2 I_B - I_A),  R = one-way resistance of one conductor.
// Balanced (I_A = I_B) collapses to R x I -- HALF a two-wire circuit, since the neutral carries
// nothing. Badly unbalanced makes VD_B negative: the lightly loaded leg RISES above nominal.
// Resistance comes from the repo's own conductorResistancePerKft, not a recalled table.
// dims: in { awg: dimensionless, material: dimensionless, one_way_length_ft: L, load_a_amps: I, load_b_amps: I, source_volts: M L^2 T^-3 I^-1, temperature_C: T } out: { neutral_amps: I, vd_a_volts: M L^2 T^-3 I^-1, vd_b_volts: M L^2 T^-3 I^-1 }
export function computeMwbcVoltageDrop({ awg = "12", material = "copper", one_way_length_ft = 0, load_a_amps = 0, load_b_amps = 0, source_volts = 120, temperature_C = 75 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const len = Number(one_way_length_ft) || 0;
  const ia = Number(load_a_amps);
  const ib = Number(load_b_amps);
  const v = Number(source_volts) || 0;
  const tC = Number(temperature_C);
  if (!(len > 0)) return { error: "One-way circuit length must be positive (ft)." };
  if (!Number.isFinite(ia) || ia < 0) return { error: "Leg A current cannot be negative (A)." };
  if (!Number.isFinite(ib) || ib < 0) return { error: "Leg B current cannot be negative (A)." };
  if (!(ia > 0 || ib > 0)) return { error: "Enter a load on at least one leg (A)." };
  if (!(v > 0)) return { error: "Source voltage must be positive (V, line to neutral)." };
  if (!Number.isFinite(tC)) return { error: "Conductor temperature must be a number (C)." };
  let r_per_kft;
  try {
    r_per_kft = conductorResistancePerKft({ material, awg: String(awg), temperature_C: tC });
  } catch (e) {
    return { error: "Unknown conductor size or material - use a standard AWG size with copper or aluminum." };
  }
  if (!(r_per_kft > 0)) return { error: "Conductor resistance did not resolve - check the AWG size and material." };
  const r_ohms = r_per_kft * len / 1000;
  const neutral_amps = Math.abs(ia - ib);
  const vd_a_volts = r_ohms * (2 * ia - ib);
  const vd_b_volts = r_ohms * (2 * ib - ia);
  const volts_a = v - vd_a_volts;
  const volts_b = v - vd_b_volts;
  const pct_a = vd_a_volts / v * 100;
  const pct_b = vd_b_volts / v * 100;
  const heavier = Math.max(ia, ib);
  const two_wire_vd = 2 * r_ohms * heavier;
  const balanced_vd = r_ohms * heavier;
  const b_rises = vd_b_volts < -1e-9;
  const a_rises = vd_a_volts < -1e-9;
  const worst_pct = Math.max(pct_a, pct_b);
  const over_3pct = worst_pct > 3;
  if (![r_ohms, vd_a_volts, vd_b_volts, neutral_amps].every(Number.isFinite)) return { error: "Voltage-drop math did not produce a finite value." };
  return {
    r_per_kft, r_ohms, neutral_amps, vd_a_volts, vd_b_volts, volts_a, volts_b,
    pct_a, pct_b, worst_pct, over_3pct, two_wire_vd, balanced_vd, b_rises, a_rises,
    note: "A multiwire branch circuit shares one neutral between two out-of-phase hots, so the neutral carries the DIFFERENCE of the two legs - " + neutral_amps.toFixed(1) + " A here - and its drop lands on both legs with opposite sign. That is why a BALANCED MWBC is efficient: with the neutral carrying nothing, each leg sees only its own conductor, "
      + balanced_vd.toFixed(2) + " V, exactly HALF the " + two_wire_vd.toFixed(2) + " V the same load would drop on a two-wire circuit. Unbalance spends that advantage: the heavier leg's drop grows toward the two-wire figure while the lighter leg's shrinks"
      + (b_rises || a_rises ? " and, here, goes NEGATIVE - the lightly loaded leg sits ABOVE nominal because the shifted neutral pushes it up. That is real neutral shift, not an arithmetic artifact." : ".")
      + " THE HAZARD THIS CIRCUIT CARRIES: if the shared neutral opens while both legs are loaded, the two loads go in series across 240 V and the lighter one sees a large overvoltage - which destroys electronics and starts fires. Terminate the neutral on a pigtail, never in series through a device yoke, and give the circuit a common disconnect so both legs de-energize together. Resistance is computed from the conductor and temperature you enter, DC resistance only: it ignores AC reactance, which matters on long runs and larger conductors, and it ignores power factor. Steady-state balance only - two legs that are balanced on average can be badly unbalanced at any instant. The NEC as adopted and the AHJ govern.",
  };
}
export const mwbcVoltageDropExample = { inputs: { awg: "12", material: "copper", one_way_length_ft: 100, load_a_amps: 16, load_b_amps: 4, source_volts: 120, temperature_C: 75 } };
function _v1109renderMwbcVoltageDrop(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: circuit analysis of a 120/240 V three-wire multiwire branch circuit. The two hots are out of phase and share a neutral carrying the difference of the leg currents, so with equal conductors of one-way resistance R the drops are VD_A = R(2 I_A - I_B) and VD_B = R(2 I_B - I_A). Balanced loading collapses to R x I - half the drop of a two-wire circuit, because the neutral carries nothing - and heavy unbalance drives the lighter leg's drop negative, a real neutral shift that raises it above nominal. Conductor resistance is computed from the entered size, material, and temperature by this catalog's own resistance model, not a recalled table; DC resistance only, ignoring AC reactance and power factor. NEC 210.4(B) requires a common disconnect, and the neutral must be pigtailed so removing a device cannot open it. The NEC as adopted and the AHJ govern.";
  const aw = makeSelect("Conductor size (AWG)", "mwbc-awg", [
    { value: "14", label: "14 AWG" }, { value: "12", label: "12 AWG" }, { value: "10", label: "10 AWG" },
    { value: "8", label: "8 AWG" }, { value: "6", label: "6 AWG" },
  ]);
  aw.select.value = "12";
  const mt = makeSelect("Conductor material", "mwbc-mat", [
    { value: "copper", label: "Copper" }, { value: "aluminum", label: "Aluminum" },
  ]);
  mt.select.value = "copper";
  const ln = makeNumber("One-way circuit length (ft)", "mwbc-len", { step: "any", min: "0"});
  const la = makeNumber("Leg A load (A)", "mwbc-la", { step: "any", min: "0"});
  const lb = makeNumber("Leg B load (A)", "mwbc-lb", { step: "any", min: "0"});
  const sv = makeNumber("Source volts, line to neutral", "mwbc-sv", { step: "any", min: "0", value: "120" });
  sv.input.value = "120";
  const tc = makeNumber("Conductor temperature (°C)", "mwbc-tc", { step: "any", value: "75" });
  tc.input.value = "75";
  for (const f of [aw, mt, ln, la, lb, sv, tc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { aw.select.value = "12"; mt.select.value = "copper"; ln.input.value = "100"; la.input.value = "16"; lb.input.value = "4"; sv.input.value = "120"; tc.input.value = "75"; update(); });
  const oN = makeOutputLine(outputRegion, "Neutral current (the difference)", "mwbc-out-n");
  const oA = makeOutputLine(outputRegion, "Leg A drop", "mwbc-out-a");
  const oB = makeOutputLine(outputRegion, "Leg B drop", "mwbc-out-b");
  const oC = makeOutputLine(outputRegion, "Balanced vs two-wire comparison", "mwbc-out-c");
  const oZ = makeOutputLine(outputRegion, "Note", "mwbc-out-z");
  const update = debounce(() => {
    const r = computeMwbcVoltageDrop({
      awg: aw.select.value, material: mt.select.value, one_way_length_ft: Number(ln.input.value),
      load_a_amps: Number(la.input.value), load_b_amps: Number(lb.input.value),
      source_volts: Number(sv.input.value), temperature_C: Number(tc.input.value),
    });
    if (r.error) { oN.textContent = r.error; oA.textContent = "-"; oB.textContent = "-"; oC.textContent = "-"; oZ.textContent = "-"; return; }
    oN.textContent = fmt(r.neutral_amps, 1) + " A";
    oA.textContent = fmt(r.vd_a_volts, 2) + " V (" + fmt(r.pct_a, 2) + "%) to " + fmt(r.volts_a, 1) + " V";
    oB.textContent = fmt(r.vd_b_volts, 2) + " V (" + fmt(r.pct_b, 2) + "%) to " + fmt(r.volts_b, 1) + " V" + (r.b_rises ? " - RISES above nominal" : "");
    oC.textContent = "balanced would be " + fmt(r.balanced_vd, 2) + " V; two separate two-wire circuits " + fmt(r.two_wire_vd, 2) + " V" + (r.over_3pct ? " -- worst leg is over 3%" : "");
    oZ.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ln, la, lb, sv, tc]) f.input.addEventListener("input", update);
  for (const f of [aw, mt]) f.select.addEventListener("change", update);
  update();
}
ELECTRICALFIELD_RENDERERS["mwbc-voltage-drop"] = _v1109renderMwbcVoltageDrop;
