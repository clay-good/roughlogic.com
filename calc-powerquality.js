// Group A: advanced AC power-system analysis bench (spec-v20 §A).
//
// spec-v79 cap-relief split: the cohesive spec-v20 §A electrical trio
// (parallel-conductor-derate, neutral-current-3ph, motor-vd-starting) was
// extracted verbatim from calc-electrical.js (which sat at 95.1% of its size
// cap, the tightest remaining calculator module) into this module. The three
// share a theme distinct from the basic Group A core: how a real three-phase
// feeder behaves under demanding conditions -- paralleled-set ampacity with the
// more-than-three current-carrying-conductor adjustment, the harmonic neutral
// that can exceed the phase current, and the motor-starting voltage dip. Each
// KEEPS group "A" -- a tile's group letter is independent of the module that
// holds it (the v28/v30/v36/v39/v70..v78 precedent). Their ids, citations,
// worked examples, dimensional annotations, and behavior are byte-for-byte
// unchanged. The moved compute functions carry their own inline finite guards,
// so no _finiteGuard copy is needed. Lazy-loaded on first open of one of its
// tiles, so it is not in the home-view first-paint payload.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

export const POWERQUALITY_RENDERERS = {};

// --- v20 A.1: Parallel conductor ampacity (`parallel-conductor-derate`) ---
// I_total = I_single * N * F_ccc * F_ambient; per-set current I_set = I_load/N.
// NEC permits paralleling only at 1/0 AWG and larger. The >3 current-carrying-
// conductor adjustment factor F_ccc is the NEC 310.15(C)(1) table.
const PARALLEL_PERMITTED = new Set([
  "1/0", "2/0", "3/0", "4/0", "250", "300", "350", "400", "500",
  "600", "700", "750", "800", "900", "1000",
]);
const PARALLEL_NOT_PERMITTED = new Set(["14", "12", "10", "8", "6", "4", "3", "2", "1"]);
function cccAdjustmentFactor(n) {
  if (n <= 3) return 1.0;
  if (n <= 6) return 0.8;
  if (n <= 9) return 0.7;
  if (n <= 20) return 0.5;
  if (n <= 30) return 0.45;
  if (n <= 40) return 0.4;
  return 0.35;
}
// dims: in { i_single_A: I, n_sets: dimensionless, total_ccc: dimensionless, ambient_factor: dimensionless, i_load_A: I, conductor_size: dimensionless }
//        out: { i_total_A: I, i_set_A: I, adjustment_factor: dimensionless }
export function computeParallelConductorDerate({ i_single_A = 0, n_sets = 1, total_ccc = 0, ambient_factor = 1, i_load_A = 0, conductor_size = "" } = {}) {
  const Is = Number(i_single_A) || 0;
  const N = Math.round(Number(n_sets) || 0);
  const amb = Number(ambient_factor);
  const ccc = Math.round(Number(total_ccc) || 0);
  const size = String(conductor_size || "").trim();
  if (!(Is > 0 && Number.isFinite(Is))) return { error: "Single-conductor ampacity must be positive (A)." };
  if (!(N >= 1)) return { error: "Number of parallel sets must be at least 1." };
  if (!(amb > 0 && amb <= 1)) return { error: "Ambient-correction factor must be in (0, 1]." };
  if (size && PARALLEL_NOT_PERMITTED.has(size)) {
    return { error: "Paralleled conductors must be 1/0 AWG or larger (NEC 310.10). " + size + " AWG is not permitted in parallel." };
  }
  const fCcc = ccc > 3 ? cccAdjustmentFactor(ccc) : 1.0;
  const adjustment = fCcc * amb;
  const perSetAmpacity = Is * adjustment;
  const iTotal = perSetAmpacity * N;
  const load = Number(i_load_A) || 0;
  const iSet = load > 0 ? load / N : null;
  let adequacy = null;
  if (iSet != null) adequacy = perSetAmpacity >= iSet ? "Each set carries " + iSet.toFixed(1) + " A; per-set ampacity " + perSetAmpacity.toFixed(0) + " A is adequate." : "Per-set ampacity " + perSetAmpacity.toFixed(0) + " A is below the " + iSet.toFixed(1) + " A per-set load - increase conductor size or add a set.";
  return {
    i_total_A: Number.isFinite(iTotal) ? iTotal : null,
    per_set_ampacity_A: Number.isFinite(perSetAmpacity) ? perSetAmpacity : null,
    i_set_A: iSet != null && Number.isFinite(iSet) ? iSet : null,
    adjustment_factor: Number.isFinite(adjustment) ? adjustment : null,
    ccc_factor: fCcc,
    adequacy,
    permitted: !(size && PARALLEL_NOT_PERMITTED.has(size)),
  };
}
export const parallelConductorDerateExample = { inputs: { i_single_A: 200, n_sets: 3, total_ccc: 0, ambient_factor: 1, i_load_A: 0, conductor_size: "3/0" } };

function renderParallelConductorDerate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per NEC (NFPA 70) - paralleled conductors (Article 310, parallel-conductor provisions, 1/0 AWG and larger) and the more-than-three current-carrying-conductor adjustment factor (310.15(C)(1)). All parallel sets must be identical length, material, and termination. Conductor ampacities user-supplied from the adopted NEC ampacity table; the AHJ-adopted edition governs. Free read-only at nfpa.org/freeaccess.";
  const sizes = ["1/0", "2/0", "3/0", "4/0", "250", "300", "350", "400", "500", "600", "750"];
  const size = makeSelect("Conductor size (AWG / kcmil, 1/0+)", "pcd-size", sizes.map((s, i) => ({ value: s, label: s, selected: i === 2 })));
  const isingle = makeNumber("Single-conductor ampacity (A)", "pcd-is", { step: "any", min: "0", value: "200" });
  isingle.input.value = "200";
  const nsets = makeNumber("Number of parallel sets", "pcd-n", { step: "1", min: "1", value: "3" });
  nsets.input.value = "3";
  const ccc = makeNumber("Total current-carrying conductors in raceway (>3 for derate)", "pcd-ccc", { step: "1", min: "0" });
  const amb = makeNumber("Ambient-correction factor (0-1)", "pcd-amb", { step: "any", min: "0", max: "1", value: "1" });
  amb.input.value = "1";
  const load = makeNumber("Total load current (A, optional)", "pcd-load", { step: "any", min: "0" });
  for (const f of [size, isingle, nsets, ccc, amb, load]) inputRegion.appendChild(f.wrap);

  attachExampleButton(inputRegion, () => {
    size.select.value = "3/0"; isingle.input.value = "200"; nsets.input.value = "3";
    ccc.input.value = ""; amb.input.value = "1"; load.input.value = ""; update();
  });

  const oTotal = makeOutputLine(outputRegion, "Total parallel ampacity", "pcd-out-total");
  const oFactor = makeOutputLine(outputRegion, "Adjustment factor applied", "pcd-out-factor");
  const oSet = makeOutputLine(outputRegion, "Per-set current", "pcd-out-set");
  const oNote = makeOutputLine(outputRegion, "Adequacy", "pcd-out-note");
  function readNum(input) { if (input.value === "") return 0; const n = Number(input.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeParallelConductorDerate({
      i_single_A: readNum(isingle.input), n_sets: readNum(nsets.input),
      total_ccc: readNum(ccc.input), ambient_factor: amb.input.value === "" ? 1 : readNum(amb.input),
      i_load_A: readNum(load.input), conductor_size: size.select.value,
    });
    if (r.error) { oTotal.textContent = r.error; oFactor.textContent = ""; oSet.textContent = ""; oNote.textContent = ""; return; }
    oTotal.textContent = fmt(r.i_total_A, 0) + " A (" + fmt(r.per_set_ampacity_A, 0) + " A per set)";
    oFactor.textContent = fmt(r.adjustment_factor, 3) + " (CCC " + fmt(r.ccc_factor, 2) + " x ambient)";
    oSet.textContent = r.i_set_A != null ? fmt(r.i_set_A, 1) + " A per set" : "Enter a load to size each set.";
    oNote.textContent = r.adequacy || "All sets must be identical length / material / termination.";
  }, DEBOUNCE_MS);
  for (const f of [size.select, isingle.input, nsets.input, ccc.input, amb.input, load.input]) f.addEventListener("input", update);
}
POWERQUALITY_RENDERERS["parallel-conductor-derate"] = renderParallelConductorDerate;

// --- v20 A.2: Three-phase neutral current (`neutral-current-3ph`) ---
// I_N = sqrt(Ia^2 + Ib^2 + Ic^2 - Ia*Ib - Ib*Ic - Ic*Ia), the phasor sum of
// three 120-degree-displaced currents. With dominant triplens the neutral
// approaches 3 * I_triplen_per_phase (triplens add arithmetically).
// dims: in { ia_A: I, ib_A: I, ic_A: I, triplen_pct: dimensionless }
//        out: { neutral_A: I, harmonic_neutral_A: I }
export function computeNeutralCurrent3ph({ ia_A = 0, ib_A = 0, ic_A = 0, triplen_pct = 0 } = {}) {
  const a = Number(ia_A) || 0, b = Number(ib_A) || 0, c = Number(ic_A) || 0;
  const trip = Number(triplen_pct) || 0;
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c) || !Number.isFinite(trip)) return { error: "Phase currents and triplen content must be finite numbers." };
  if (a < 0 || b < 0 || c < 0) return { error: "Phase currents must be non-negative (A)." };
  if (!(a > 0 || b > 0 || c > 0)) return { error: "Enter at least one phase current (A)." };
  const inside = a * a + b * b + c * c - a * b - b * c - c * a;
  const In = Math.sqrt(Math.max(0, inside));
  const maxPhase = Math.max(a, b, c);
  const avgPhase = (a + b + c) / 3;
  const harmonicNeutral = trip > 0 ? 3 * (avgPhase * trip / 100) : null;
  const dominant = harmonicNeutral != null && harmonicNeutral > maxPhase;
  return {
    neutral_A: Number.isFinite(In) ? In : null,
    harmonic_neutral_A: harmonicNeutral != null && Number.isFinite(harmonicNeutral) ? harmonicNeutral : null,
    max_phase_A: maxPhase,
    neutral_is_ccc: dominant,
    note: dominant
      ? "Triplen-dominated: the neutral may exceed the phase current and counts as a current-carrying conductor (NEC 310.15(E), IEEE 519)."
      : (a === b && b === c ? "Balanced linear load - fundamental neutral current is zero." : "Unbalanced fundamental neutral current (RMS magnitude, not direction)."),
  };
}
export const neutralCurrent3phExample = { inputs: { ia_A: 100, ib_A: 80, ic_A: 60, triplen_pct: 0 } };

function renderNeutralCurrent3ph(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Phasor sum of three 120-degree-displaced currents (first principles). Neutral-as-current-carrying-conductor and harmonic guidance per NEC Article 310 and IEEE Std 519, by name; the AHJ-adopted edition governs. Result is RMS magnitude, not direction. Free read-only at nfpa.org/freeaccess.";
  const ia = makeNumber("Phase A current (A)", "nc-ia", { step: "any", min: "0", value: "100" });
  ia.input.value = "100";
  const ib = makeNumber("Phase B current (A)", "nc-ib", { step: "any", min: "0", value: "80" });
  ib.input.value = "80";
  const ic = makeNumber("Phase C current (A)", "nc-ic", { step: "any", min: "0", value: "60" });
  ic.input.value = "60";
  const trip = makeNumber("Per-phase triplen (3rd-harmonic) content (%, optional)", "nc-trip", { step: "any", min: "0", max: "100" });
  for (const f of [ia, ib, ic, trip]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ia.input.value = "100"; ib.input.value = "80"; ic.input.value = "60"; trip.input.value = ""; update(); });
  const oN = makeOutputLine(outputRegion, "Neutral current", "nc-out-n");
  const oH = makeOutputLine(outputRegion, "Harmonic-dominated estimate", "nc-out-h");
  const oNote = makeOutputLine(outputRegion, "Note", "nc-out-note");
  function readNum(input) { if (input.value === "") return 0; const n = Number(input.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeNeutralCurrent3ph({ ia_A: readNum(ia.input), ib_A: readNum(ib.input), ic_A: readNum(ic.input), triplen_pct: readNum(trip.input) });
    if (r.error) { oN.textContent = r.error; oH.textContent = ""; oNote.textContent = ""; return; }
    oN.textContent = fmt(r.neutral_A, 2) + " A";
    oH.textContent = r.harmonic_neutral_A != null ? fmt(r.harmonic_neutral_A, 1) + " A (~3 x triplen/phase)" : "Enter triplen % to estimate the harmonic neutral.";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ia.input, ib.input, ic.input, trip.input]) f.addEventListener("input", update);
}
POWERQUALITY_RENDERERS["neutral-current-3ph"] = renderNeutralCurrent3ph;

// --- v20 A.3: Motor starting voltage dip (`motor-vd-starting`) ---
// V_drop = (2 for 1-phase, sqrt(3) for 3-phase) * K * LRC * L / cmils;
// V_terminal = V_source - V_drop; %dip = V_drop / V_source * 100.
// dims: in { source_voltage_V: M*L^2*T^-3*I^-1, length_ft: L, cmils: L^2, lrc_A: I, phase: dimensionless, k_const: dimensionless, dip_limit_pct: dimensionless }
//        out: { v_drop_V: M*L^2*T^-3*I^-1, v_terminal_V: M*L^2*T^-3*I^-1, dip_pct: dimensionless }
export function computeMotorVdStarting({ source_voltage_V = 0, length_ft = 0, cmils = 0, lrc_A = 0, phase = "three", k_const = 12.9, dip_limit_pct = 15, lrc_estimated = false } = {}) {
  const V = Number(source_voltage_V) || 0;
  const L = Number(length_ft) || 0;
  const cm = Number(cmils) || 0;
  const lrc = Number(lrc_A) || 0;
  const K = Number(k_const) || 0;
  const limit = Number(dip_limit_pct);
  if (!(V > 0 && Number.isFinite(V))) return { error: "Source voltage must be positive (V)." };
  if (!(L > 0 && Number.isFinite(L))) return { error: "Conductor length must be positive (ft)." };
  if (!(cm > 0 && Number.isFinite(cm))) return { error: "Conductor circular mils must be positive." };
  if (!(lrc > 0 && Number.isFinite(lrc))) return { error: "Locked-rotor current must be positive (A)." };
  if (!(K > 0)) return { error: "Conductor constant K must be positive (Cu ~12.9, Al ~21.2)." };
  const factor = phase === "single" ? 2 : Math.sqrt(3);
  const vDrop = factor * K * lrc * L / cm;
  const vTerminal = V - vDrop;
  const dipPct = vDrop / V * 100;
  const lim = Number.isFinite(limit) && limit > 0 ? limit : 15;
  return {
    v_drop_V: Number.isFinite(vDrop) ? vDrop : null,
    v_terminal_V: Number.isFinite(vTerminal) ? vTerminal : null,
    dip_pct: Number.isFinite(dipPct) ? dipPct : null,
    pass: dipPct <= lim,
    dip_limit_pct: lim,
    note: (lrc_estimated ? "LRC estimated as 6x FLA (no code letter entered - confirm against the nameplate). " : "")
      + (dipPct > lim ? "Starting dip exceeds " + lim + "% - likely contactor dropout / failed start." : "Within the " + lim + "% starting-dip limit.")
      + " This is the starting dip, distinct from the steady-state voltage-drop tile.",
  };
}
export const motorVdStartingExample = { inputs: { source_voltage_V: 480, length_ft: 250, cmils: 250000, lrc_A: 180, phase: "three", k_const: 12.9, dip_limit_pct: 15 } };

function renderMotorVdStarting(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Ohm's-law voltage-drop method (first principles); motor locked-rotor current per NEC Article 430 code-letter tables (user-supplied, or 6x FLA estimate); contactor pickup/dropout commonly ~85% nominal per NEMA ICS 2, by name. The AHJ governs. Distinct from the steady-state voltage-drop tile. Free read-only at nfpa.org/freeaccess.";
  const v = makeNumber("Source voltage (V)", "mvds-v", { step: "any", min: "0", value: "480" });
  v.input.value = "480";
  const phase = makeSelect("Phase", "mvds-phase", [{ value: "three", label: "3-phase", selected: true }, { value: "single", label: "1-phase" }]);
  const len = makeNumber("One-way conductor length (ft)", "mvds-len", { step: "any", min: "0", value: "250" });
  len.input.value = "250";
  const cm = makeNumber("Conductor circular mils (cmils)", "mvds-cm", { step: "any", min: "0", value: "250000" });
  cm.input.value = "250000";
  const lrc = makeNumber("Locked-rotor current (A)", "mvds-lrc", { step: "any", min: "0", value: "180" });
  lrc.input.value = "180";
  const k = makeSelect("Conductor material (K)", "mvds-k", [{ value: "12.9", label: "Copper (K=12.9)", selected: true }, { value: "21.2", label: "Aluminum (K=21.2)" }]);
  const limit = makeNumber("Dip limit (%)", "mvds-lim", { step: "any", min: "0", value: "15" });
  limit.input.value = "15";
  for (const f of [v, phase, len, cm, lrc, k, limit]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    v.input.value = "480"; phase.select.value = "three"; len.input.value = "250";
    cm.input.value = "250000"; lrc.input.value = "180"; k.select.value = "12.9"; limit.input.value = "15"; update();
  });
  const oDrop = makeOutputLine(outputRegion, "Voltage drop during start", "mvds-out-drop");
  const oTerm = makeOutputLine(outputRegion, "Terminal voltage during start", "mvds-out-term");
  const oDip = makeOutputLine(outputRegion, "% dip / verdict", "mvds-out-dip");
  const oNote = makeOutputLine(outputRegion, "Note", "mvds-out-note");
  function readNum(input) { if (input.value === "") return 0; const n = Number(input.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeMotorVdStarting({
      source_voltage_V: readNum(v.input), length_ft: readNum(len.input), cmils: readNum(cm.input),
      lrc_A: readNum(lrc.input), phase: phase.select.value, k_const: Number(k.select.value), dip_limit_pct: readNum(limit.input),
    });
    if (r.error) { oDrop.textContent = r.error; oTerm.textContent = ""; oDip.textContent = ""; oNote.textContent = ""; return; }
    oDrop.textContent = fmt(r.v_drop_V, 1) + " V";
    oTerm.textContent = fmt(r.v_terminal_V, 1) + " V";
    oDip.textContent = fmt(r.dip_pct, 2) + "% - " + (r.pass ? "PASS" : "FAIL");
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [v.input, phase.select, len.input, cm.input, lrc.input, k.select, limit.input]) f.addEventListener("input", update);
}
POWERQUALITY_RENDERERS["motor-vd-starting"] = renderMotorVdStarting;

// =====================================================================
// spec-v172 - Group A: motor derating for voltage unbalance (NEMA MG-1).
// =====================================================================

// NEMA MG-1 derating curve: [unbalance %, derating factor], linearly
// interpolated between the published points. Above 5% the motor should
// not be operated.
const _MG1_DERATE = [[0, 1.00], [1, 0.98], [2, 0.95], [3, 0.88], [4, 0.82], [5, 0.75]];
function _mg1Derate(pct) {
  if (pct <= 0) return 1.0;
  if (pct >= 5) return 0.75;
  for (let i = 1; i < _MG1_DERATE.length; i++) {
    const [x0, y0] = _MG1_DERATE[i - 1];
    const [x1, y1] = _MG1_DERATE[i];
    if (pct <= x1) return y0 + (pct - x0) * (y1 - y0) / (x1 - x0);
  }
  return 0.75;
}

// dims: in { v_ab: M L^2 T^-3 I^-1, v_bc: M L^2 T^-3 I^-1, v_ca: M L^2 T^-3 I^-1 } out: { unbalance_pct: dimensionless, derate_factor: dimensionless }
export function computeMotorUnbalanceDerate({ v_ab = 0, v_bc = 0, v_ca = 0 } = {}) {
  const ab = Number(v_ab) || 0, bc = Number(v_bc) || 0, ca = Number(v_ca) || 0;
  if (!Number.isFinite(ab) || !Number.isFinite(bc) || !Number.isFinite(ca)) return { error: "Line voltages must be finite numbers." };
  if (!(ab > 0) || !(bc > 0) || !(ca > 0)) return { error: "All three line-to-line voltages must be positive (V)." };

  const v_avg = (ab + bc + ca) / 3;
  const max_dev = Math.max(Math.abs(ab - v_avg), Math.abs(bc - v_avg), Math.abs(ca - v_avg));
  const unbalance_pct = v_avg > 0 ? max_dev / v_avg * 100 : null;
  const derate_factor = _mg1Derate(unbalance_pct);
  const do_not_operate = unbalance_pct > 5;
  return {
    v_avg,
    max_dev,
    unbalance_pct: Number.isFinite(unbalance_pct) ? unbalance_pct : null,
    derate_factor: Number.isFinite(derate_factor) ? derate_factor : null,
    allowable_pct: Number.isFinite(derate_factor) ? derate_factor * 100 : null,
    do_not_operate,
    note: do_not_operate
      ? "Over 5% voltage unbalance: NEMA MG-1 says the motor SHOULD NOT BE OPERATED. Correct the unbalance source (loading, connections, the supply) before running."
      : "NEMA MG-1: unbalance = max deviation from the average / the average. The derating factor is read off the MG-1 curve (interpolated). Correct the unbalance source first; the manufacturer and MG-1 govern the final figure.",
  };
}
export const motorUnbalanceDerateExample = { inputs: { v_ab: 460, v_bc: 455, v_ca: 450 } };

function _v172renderMotorUnbalanceDerate(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEMA MG-1 motor derating for voltage unbalance, by name - unbalance = max deviation from the average voltage divided by the average; the derate factor is read off the MG-1 curve (1% -> ~0.98, 5% -> ~0.75). Above 5% the motor should not be operated. The manufacturer and MG-1 govern.";
  const ab = makeNumber("Line voltage A-B (V)", "mu-ab", { step: "any", min: "0", value: "460" });
  ab.input.value = "460";
  const bc = makeNumber("Line voltage B-C (V)", "mu-bc", { step: "any", min: "0", value: "455" });
  bc.input.value = "455";
  const ca = makeNumber("Line voltage C-A (V)", "mu-ca", { step: "any", min: "0", value: "450" });
  ca.input.value = "450";
  for (const f of [ab, bc, ca]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ab.input.value = "460"; bc.input.value = "455"; ca.input.value = "450"; update(); });

  const oUb = makeOutputLine(outputRegion, "Voltage unbalance", "mu-out-ub");
  const oDerate = makeOutputLine(outputRegion, "MG-1 derating factor", "mu-out-derate");
  const oFlag = makeOutputLine(outputRegion, "Status", "mu-out-flag");
  const oNote = makeOutputLine(outputRegion, "Note", "mu-out-note");
  const update = debounce(() => {
    const r = computeMotorUnbalanceDerate({ v_ab: Number(ab.input.value) || 0, v_bc: Number(bc.input.value) || 0, v_ca: Number(ca.input.value) || 0 });
    if (r.error) { oUb.textContent = r.error; oDerate.textContent = "-"; oFlag.textContent = "-"; oNote.textContent = ""; return; }
    oUb.textContent = fmt(r.unbalance_pct, 2) + "% (avg " + fmt(r.v_avg, 1) + " V, max dev " + fmt(r.max_dev, 1) + " V)";
    oDerate.textContent = fmt(r.derate_factor, 3) + " (load to ~" + fmt(r.allowable_pct, 0) + "% of nameplate)";
    oFlag.textContent = r.do_not_operate ? "DO NOT OPERATE (over 5% unbalance)" : "Derate and run; correct the unbalance source";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [ab.input, bc.input, ca.input]) f.addEventListener("input", update);
}
POWERQUALITY_RENDERERS["motor-unbalance-derate"] = _v172renderMotorUnbalanceDerate;

// =====================================================================
// spec-v183 - Group A: Electrical (1 tile)
// Transformer K-factor from a harmonic current spectrum (UL 1561 /
// IEEE C57.110), with the standard K-rating round-up.
// =====================================================================

// Standard UL 1561 K-ratings. K-1 is a general-purpose (linear-load)
// transformer; K-4 and up are the K-rated units.
const _K_RATINGS = [1, 4, 9, 13, 20, 30, 40];

// dims: in { i1: dimensionless, i3: dimensionless, i5: dimensionless, i7: dimensionless, i9: dimensionless, i11: dimensionless, i13: dimensionless } out: { k_factor: dimensionless, recommended_k_rating: dimensionless }
export function computeTransformerKFactor({ i1 = 1, i3 = 0, i5 = 0, i7 = 0, i9 = 0, i11 = 0, i13 = 0 } = {}) {
  const harmonics = [[1, i1], [3, i3], [5, i5], [7, i7], [9, i9], [11, i11], [13, i13]];
  for (const [, v] of harmonics) {
    if (!Number.isFinite(Number(v))) return { error: "Harmonic currents must be finite (per-unit of fundamental)." };
    if (Number(v) < 0) return { error: "Harmonic currents must be non-negative (per-unit)." };
  }
  if (!((Number(i1) || 0) > 0)) return { error: "Fundamental current (I1) must be positive (per-unit)." };
  let num = 0, den = 0;
  for (const [h, v] of harmonics) {
    const ih = Number(v) || 0;
    num += ih * ih * h * h;
    den += ih * ih;
  }
  const k_factor = num / den;
  const recommended_k_rating = _K_RATINGS.find((r) => r >= k_factor) ?? _K_RATINGS[_K_RATINGS.length - 1];
  return {
    k_factor,
    recommended_k_rating,
    note: "UL 1561 / IEEE C57.110: K-factor = sum(Ih^2 x h^2) / sum(Ih^2), with the harmonic currents entered as per-unit of the fundamental. Round up to the next standard K-rating (K-1 standard, then K-4 / K-9 / K-13 / K-20 / K-30 / K-40). A near-linear load (K close to 1) needs no K-rated transformer. The measured spectrum and the manufacturer govern the final selection.",
  };
}
export const transformerKFactorExample = { inputs: { i1: 1.0, i3: 0.33, i5: 0.20, i7: 0.14, i9: 0.09, i11: 0.06, i13: 0.05 } };

function _v183renderTransformerKFactor(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: UL 1561 / IEEE C57.110 K-factor = sum(Ih^2 x h^2) / sum(Ih^2), harmonics in per-unit of the fundamental; round up to the next standard K-rating (K-1/K-4/K-9/K-13/K-20/K-30/K-40). The measured spectrum and the manufacturer govern.";
  const defs = { i1: "1.0", i3: "0.33", i5: "0.20", i7: "0.14", i9: "0.09", i11: "0.06", i13: "0.05" };
  const fields = {};
  for (const h of ["i1", "i3", "i5", "i7", "i9", "i11", "i13"]) {
    const f = makeNumber("Harmonic " + h.slice(1) + " (per-unit of fundamental)", "tkf-" + h, { step: "any", min: "0", value: defs[h] });
    f.input.value = defs[h];
    fields[h] = f;
    inputRegion.appendChild(f.wrap);
  }
  attachExampleButton(inputRegion, () => { for (const h in defs) fields[h].input.value = defs[h]; update(); });

  const oK = makeOutputLine(outputRegion, "K-factor", "tkf-out-k");
  const oRating = makeOutputLine(outputRegion, "Recommended K-rating", "tkf-out-rating");
  const oNote = makeOutputLine(outputRegion, "Note", "tkf-out-note");

  const update = debounce(() => {
    const r = computeTransformerKFactor({
      i1: Number(fields.i1.input.value) || 0, i3: Number(fields.i3.input.value) || 0,
      i5: Number(fields.i5.input.value) || 0, i7: Number(fields.i7.input.value) || 0,
      i9: Number(fields.i9.input.value) || 0, i11: Number(fields.i11.input.value) || 0,
      i13: Number(fields.i13.input.value) || 0,
    });
    if (r.error) { oK.textContent = r.error; oRating.textContent = "-"; oNote.textContent = ""; return; }
    oK.textContent = fmt(r.k_factor, 2);
    oRating.textContent = r.recommended_k_rating === 1 ? "K-1 (standard transformer)" : "K-" + r.recommended_k_rating;
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const h in fields) fields[h].input.addEventListener("input", update);
}
POWERQUALITY_RENDERERS["transformer-k-factor"] = _v183renderTransformerKFactor;

// =====================================================================
// spec-v184 - Group A: Electrical (1 tile)
// Maximum capacitor kVAR at motor terminals before self-excitation
// (NEMA MG-1 / IEEE 18 magnetizing-kVAR limit).
// =====================================================================

// dims: in { v_ll: dimensionless, i_noload_a: I, safety_factor: dimensionless } out: { magnetizing_kvar: dimensionless, max_capacitor_kvar: dimensionless }
export function computeMotorCapacitorMax({ v_ll = 0, i_noload_a = 0, safety_factor = 0.90 } = {}) {
  const v = Number(v_ll) || 0, i = Number(i_noload_a) || 0, sf = Number(safety_factor);
  if (!Number.isFinite(v) || !Number.isFinite(i) || !Number.isFinite(sf)) return { error: "Voltage, current, and safety factor must be finite numbers." };
  if (!(v > 0)) return { error: "Motor line-to-line voltage must be positive (V)." };
  if (i < 0) return { error: "No-load current must be non-negative (A)." };
  if (!(sf > 0)) return { error: "Safety factor must be positive." };
  const magnetizing_kvar = Math.sqrt(3) * v * i / 1000;
  const max_capacitor_kvar = sf * magnetizing_kvar;
  return {
    magnetizing_kvar,
    max_capacitor_kvar,
    note: "NEMA MG-1 / IEEE 18: a capacitor switched with a motor must not exceed the motor's magnetizing (no-load) kVAR, or the motor can self-excite into a damaging overvoltage when it coasts down. magnetizing_kvar = sqrt(3) x V x I_no-load / 1000; the maximum terminal capacitor is the safety factor (default 0.90) times that. The manufacturer's maximum-kVAR table by HP and speed governs the final selection; pair with pf-correction for the target-PF size and keep the smaller value.",
  };
}
export const motorCapacitorMaxExample = { inputs: { v_ll: 480, i_noload_a: 8, safety_factor: 0.90 } };

function _v184renderMotorCapacitorMax(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEMA MG-1 / IEEE 18 - a motor-terminal capacitor must stay below the magnetizing (no-load) kVAR = sqrt(3) x V x I_no-load / 1000, with a safety margin (default 0.90), to avoid self-excitation overvoltage. The manufacturer's max-kVAR table governs.";
  const v = makeNumber("Motor line-to-line voltage (V)", "mcm-v", { step: "any", min: "0", value: "480" });
  v.input.value = "480";
  const i = makeNumber("No-load (magnetizing) current (A)", "mcm-i", { step: "any", min: "0", value: "8" });
  i.input.value = "8";
  const sf = makeNumber("Safety factor (default 0.90)", "mcm-sf", { step: "any", min: "0", value: "0.90" });
  sf.input.value = "0.90";
  for (const f of [v, i, sf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { v.input.value = "480"; i.input.value = "8"; sf.input.value = "0.90"; update(); });

  const oMag = makeOutputLine(outputRegion, "Magnetizing kVAR", "mcm-out-mag");
  const oMax = makeOutputLine(outputRegion, "Max terminal capacitor kVAR", "mcm-out-max");
  const oNote = makeOutputLine(outputRegion, "Note", "mcm-out-note");

  const update = debounce(() => {
    const r = computeMotorCapacitorMax({ v_ll: Number(v.input.value) || 0, i_noload_a: Number(i.input.value) || 0, safety_factor: Number(sf.input.value) });
    if (r.error) { oMag.textContent = r.error; oMax.textContent = "-"; oNote.textContent = ""; return; }
    oMag.textContent = fmt(r.magnetizing_kvar, 2) + " kVAR";
    oMax.textContent = fmt(r.max_capacitor_kvar, 2) + " kVAR";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [v, i, sf]) f.input.addEventListener("input", update);
}
POWERQUALITY_RENDERERS["motor-capacitor-max"] = _v184renderMotorCapacitorMax;
