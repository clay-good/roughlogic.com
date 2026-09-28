// =====================================================================
// calc-steampressure.js - spec-v1864 steam pressure and vessel bench.
//
// Extracted from calc-pipefit.js to keep both lazy-loaded modules within
// their gzip budgets. Calculator behavior is unchanged.
// =====================================================================

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect,
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

export const STEAMPRESSURE_RENDERERS = {};

// ===================== spec-v588 B: steam orifice / PRV capacity (Napier) =====================
// choked = P2 < 0.58*P1. W = 51.5*Cd*A*P1 (saturated, choked). 51.5 is the API 520 / ASME steam
// constant the citation names; Napier's own AP/70 lb/s is 51.43 lb/hr, which this used until 2026-09-25.
// dims: in { orifice_area_in2: L^2, upstream_p_psia: M L^-1 T^-2, downstream_p_psia: M L^-1 T^-2, discharge_coeff: dimensionless } out: { steam_capacity_lb_hr: M T^-1 }
export function computeSteamPrvNapier({ orifice_area_in2 = 0, upstream_p_psia = 0, downstream_p_psia = 0, discharge_coeff = 0.9 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const A = Number(orifice_area_in2) || 0;
  const P1 = Number(upstream_p_psia) || 0;
  const P2 = Number(downstream_p_psia) || 0;
  const Cd = Number(discharge_coeff) || 0;
  if (!(A > 0)) return { error: "Orifice area must be positive (in^2)." };
  if (!(P1 > 0)) return { error: "Upstream pressure must be positive (psia)." };
  if (P2 < 0) return { error: "Downstream pressure cannot be negative (psia)." };
  if (P2 > P1) return { error: "Downstream pressure cannot exceed the upstream pressure." };
  if (!(Cd > 0 && Cd <= 1)) return { error: "Discharge coefficient must be over 0 and at most 1." };
  const choke_threshold_psia = 0.58 * P1;
  const choked = P2 < choke_threshold_psia;
  const steam_capacity_lb_hr = 51.5 * Cd * A * P1;
  return {
    steam_capacity_lb_hr, choked, choke_threshold_psia,
    note: "Flow chokes when the downstream absolute pressure is below 58% of the upstream, and the capacity then depends only on the upstream pressure - dropping the downstream further does not increase it. Napier is for saturated steam (superheat needs a Ksh factor). A liquid Cv (which scales with the square root of pressure drop) is wrong for choked steam, which is linear in the upstream pressure. The discharge coefficient (about 0.6 for a sharp-edged orifice, near 1 for a nozzle) must be applied. ASME/API and the valve manufacturer govern - a sizing aid, not a relief-valve certification.",
  };
}
export const steamPrvNapierExample = { inputs: { orifice_area_in2: 0.5, upstream_p_psia: 100, downstream_p_psia: 30, discharge_coeff: 0.9 } };
function _renderSteamPrvNapier(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A sizing aid, not a relief-valve certification; ASME/API and the valve manufacturer govern. Citation: Napier's formula / ASME/API 520 / Grashof steam orifice / PRV capacity, by name. Choked when P2 < 0.58 x P1; capacity W = 51.5 x Cd x A x P1 (saturated, choked). When choked the capacity depends only on the upstream pressure. Napier is for saturated steam (superheat needs a Ksh factor); a liquid Cv (square-root in pressure drop) is wrong for choked steam, which is linear in P1. Apply the discharge coefficient (~0.6 sharp orifice, ~1 nozzle).";
  const A = makeNumber("Orifice / seat area (in²)", "spn-a", { step: "any", min: "0" });
  const P1 = makeNumber("Upstream absolute pressure (psia)", "spn-p1", { step: "any", min: "0" });
  const P2 = makeNumber("Downstream absolute pressure (psia)", "spn-p2", { step: "any", min: "0" });
  const Cd = makeNumber("Discharge coefficient Cd (~0.6 orifice, ~1 nozzle)", "spn-cd", { step: "any", min: "0", max: "1" });
  for (const f of [A, P1, P2, Cd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { A.input.value = "0.5"; P1.input.value = "100"; P2.input.value = "30"; Cd.input.value = "0.9"; update(); });
  const oChoke = makeOutputLine(outputRegion, "Flow regime", "spn-out-choke");
  const oCap = makeOutputLine(outputRegion, "Steam capacity", "spn-out-cap");
  const oNote = makeOutputLine(outputRegion, "Note", "spn-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeSteamPrvNapier({ orifice_area_in2: readNum(A.input), upstream_p_psia: readNum(P1.input), downstream_p_psia: readNum(P2.input), discharge_coeff: Cd.input.value === "" ? 0.9 : readNum(Cd.input) });
    if (r.error) { oChoke.textContent = r.error; oCap.textContent = "-"; oNote.textContent = ""; return; }
    oChoke.textContent = r.choked ? "Choked (P2 < " + fmt(r.choke_threshold_psia, 1) + " psia) - capacity set by upstream only" : "Subcritical (P2 >= " + fmt(r.choke_threshold_psia, 1) + " psia) - apply a subcritical correction";
    oCap.textContent = fmt(r.steam_capacity_lb_hr, 0) + " lb/hr (saturated)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [A, P1, P2, Cd]) f.input.addEventListener("input", update);
}
STEAMPRESSURE_RENDERERS["steam-prv-napier"] = _renderSteamPrvNapier;

// steam-prv-area-for-capacity: inverse of steam-prv-napier. The forward tile gives the relief capacity from the orifice
// area; the inverse recovers the orifice / seat area a required relief capacity needs, so a sizer picks an API orifice
// letter. From the choked Napier capacity W = 51.5 Cd A P1, A = W / (51.5 Cd P1). Assumes choked flow (the standard
// relief condition, P2 < 0.58 P1); the choke threshold is reported for the check.
// dims: in { required_capacity_lb_hr: M T^-1, upstream_p_psia: M L^-1 T^-2, discharge_coeff: dimensionless } out: { required_area_in2: L^2, choke_threshold_psia: M L^-1 T^-2 }
export function computeSteamPrvAreaForCapacity({ required_capacity_lb_hr = 0, upstream_p_psia = 0, discharge_coeff = 0.9 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const W = Number(required_capacity_lb_hr) || 0;
  const P1 = Number(upstream_p_psia) || 0;
  const Cd = Number(discharge_coeff) || 0;
  if (!(W > 0)) return { error: "Required relief capacity must be positive (lb/hr)." };
  if (!(P1 > 0)) return { error: "Upstream pressure must be positive (psia)." };
  if (!(Cd > 0 && Cd <= 1)) return { error: "Discharge coefficient must be over 0 and at most 1." };
  const required_area_in2 = W / (51.5 * Cd * P1);
  const choke_threshold_psia = 0.58 * P1;
  if (![required_area_in2, choke_threshold_psia].every(Number.isFinite)) return { error: "Orifice-area math is not a finite value." };
  return {
    required_area_in2, choke_threshold_psia,
    note: "Orifice / seat area for a required steam relief capacity: from the choked Napier capacity W = 51.5 Cd A P1, A = W / (51.5 Cd P1). Round UP to a standard API 526 orifice letter (D, E, F, ... which are areas of 0.110, 0.196, 0.307 in^2 and up). This assumes CHOKED flow - the standard relief condition where the downstream absolute pressure is below 58% of the upstream (threshold shown); the capacity then depends only on the upstream pressure, and a liquid Cv (which scales with the square root of the pressure drop) is wrong. Napier is for saturated steam; superheat needs a Ksh correction. The discharge coefficient (~0.6 sharp orifice, ~1 nozzle) must match the device. A sizing aid, not a relief-valve certification; ASME/API and the valve manufacturer govern.",
  };
}
export const steamPrvAreaForCapacityExample = { inputs: { required_capacity_lb_hr: 5000, upstream_p_psia: 100, discharge_coeff: 0.9 } };
function _renderSteamPrvAreaForCapacity(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Notice: A sizing aid, not a relief-valve certification; ASME/API and the valve manufacturer govern. Citation: Napier's formula / ASME/API 520 choked steam capacity W = 51.5 x Cd x A x P1 solved for the area: A = W / (51.5 x Cd x P1). Assumes choked flow (P2 < 0.58 x P1); round up to a standard API 526 orifice letter. Saturated steam (superheat needs Ksh); apply the discharge coefficient (~0.6 orifice, ~1 nozzle).";
  const W = makeNumber("Required relief capacity (lb/hr)", "spa-w", { step: "any", min: "0" });
  const P1 = makeNumber("Upstream absolute pressure (psia)", "spa-p1", { step: "any", min: "0" });
  const Cd = makeNumber("Discharge coefficient Cd (~0.6 orifice, ~1 nozzle)", "spa-cd", { step: "any", min: "0", max: "1" });
  for (const f of [W, P1, Cd]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { W.input.value = "5000"; P1.input.value = "100"; Cd.input.value = "0.9"; update(); });
  const oA = makeOutputLine(outputRegion, "Required orifice / seat area", "spa-out-a");
  const oT = makeOutputLine(outputRegion, "Choke threshold (0.58 x P1)", "spa-out-t");
  const oNote = makeOutputLine(outputRegion, "Note", "spa-out-note");
  function readNum(x) { if (x.value === "") return 0; const n = Number(x.value); return Number.isFinite(n) ? n : 0; }
  const update = debounce(() => {
    const r = computeSteamPrvAreaForCapacity({ required_capacity_lb_hr: readNum(W.input), upstream_p_psia: readNum(P1.input), discharge_coeff: Cd.input.value === "" ? 0.9 : readNum(Cd.input) });
    if (r.error) { oA.textContent = r.error; oT.textContent = "-"; oNote.textContent = ""; return; }
    oA.textContent = fmt(r.required_area_in2, 3) + " in^2";
    oT.textContent = fmt(r.choke_threshold_psia, 1) + " psia (choked below this downstream)";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  for (const f of [W.input, P1.input, Cd.input]) f.addEventListener("input", update);
}
STEAMPRESSURE_RENDERERS["steam-prv-area-for-capacity"] = _renderSteamPrvAreaForCapacity;

// ===================== spec-v954: steam boiler surface blowdown (cycles of concentration) =====================
// dims: in { steam_rate_lb_hr: M T^-1, feedwater_tds_ppm: dimensionless, max_boiler_tds_ppm: dimensionless } out: { cycles_of_concentration: dimensionless, blowdown_rate_lb_hr: M T^-1, blowdown_pct_of_feedwater: dimensionless }
export function computeSteamBoilerBlowdown({ steam_rate_lb_hr = 10000, feedwater_tds_ppm = 100, max_boiler_tds_ppm = 3500 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(steam_rate_lb_hr > 0)) return { error: "Steam rate must be positive (lb/hr)." };
  if (!(feedwater_tds_ppm > 0)) return { error: "Feedwater TDS must be positive (ppm)." };
  if (!(max_boiler_tds_ppm > feedwater_tds_ppm)) return { error: "Max boiler-water TDS must exceed the feedwater TDS (blowdown concentrates the dissolved solids)." };
  // TDS mass balance: steam leaves TDS-free, so feedwater TDS in = blowdown TDS out.
  // Blowdown as a fraction of STEAM = FW_TDS / (BW_TDS - FW_TDS); of FEEDWATER = FW_TDS / BW_TDS = 1/CoC.
  const cycles_of_concentration = max_boiler_tds_ppm / feedwater_tds_ppm;
  const blowdown_rate_lb_hr = steam_rate_lb_hr * feedwater_tds_ppm / (max_boiler_tds_ppm - feedwater_tds_ppm);
  const blowdown_pct_of_feedwater = 100 * feedwater_tds_ppm / max_boiler_tds_ppm;
  if (![cycles_of_concentration, blowdown_rate_lb_hr, blowdown_pct_of_feedwater].every(Number.isFinite)) return { error: "Blowdown math is not a finite value." };
  return {
    cycles_of_concentration,
    blowdown_rate_lb_hr,
    blowdown_pct_of_feedwater,
    note: "The continuous surface blowdown a steam boiler needs to hold its dissolved solids below the limit, by a TDS mass balance: the steam leaves essentially TDS-free, so all the dissolved solids the feedwater carries in must leave in the blowdown at the maximum allowed boiler-water concentration. The cycles of concentration is CoC = boiler-water TDS limit / feedwater TDS -- how many times the solids are concentrated before blowdown. The blowdown rate is steam rate x feedwater TDS / (boiler-water limit - feedwater TDS), and expressed as a share of feedwater it is simply 1/CoC. A 10,000 lb/hr boiler on 100 ppm feedwater held to a 3,500 ppm limit runs at 35 cycles and blows down about 294 lb/hr (2.9% of feedwater); cleaner makeup (fewer ppm) raises the cycles and cuts the blowdown and its heat loss. Blowdown carries away hot, treated water, so every pound blown down is a fuel and chemical cost -- a flash-recovery vessel and a blowdown heat exchanger claw some of it back. This is a steady-state SURFACE (continuous TDS) blowdown estimate; intermittent bottom (mud) blowdown, the boiler-water treatment program, the ASME / manufacturer TDS and alkalinity limits, and a licensed boiler operator govern the actual schedule.",
  };
}

export const steamBoilerBlowdownExample = { inputs: { steam_rate_lb_hr: 10000, feedwater_tds_ppm: 100, max_boiler_tds_ppm: 3500 } };

function _v954renderSteamBoilerBlowdown(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: steam boiler surface blowdown by TDS mass balance (cycles of concentration), by name. CoC = boiler-water TDS limit / feedwater TDS; blowdown rate = steam rate x FW_TDS / (BW_limit - FW_TDS); blowdown % of feedwater = 1/CoC. Steam assumed TDS-free. The ASME / manufacturer TDS limits and the water-treatment program and a licensed operator govern.";
  const sr = makeNumber("Steam rate (lb/hr)", "sbb-sr", { step: "any", min: "0" });
  const fw = makeNumber("Feedwater TDS (ppm)", "sbb-fw", { step: "any", min: "0" });
  const bw = makeNumber("Max boiler-water TDS (ppm)", "sbb-bw", { step: "any", min: "0" });
  for (const f of [sr, fw, bw]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { sr.input.value = "10000"; fw.input.value = "100"; bw.input.value = "3500"; update(); });
  const oC = makeOutputLine(outputRegion, "Cycles of concentration", "sbb-out-c");
  const oR = makeOutputLine(outputRegion, "Blowdown rate", "sbb-out-r");
  const oP = makeOutputLine(outputRegion, "Blowdown (% of feedwater)", "sbb-out-p");
  const update = debounce(() => {
    const r = computeSteamBoilerBlowdown({
      steam_rate_lb_hr: sr.input.value === "" ? 10000 : Number(sr.input.value), feedwater_tds_ppm: fw.input.value === "" ? 100 : Number(fw.input.value),
      max_boiler_tds_ppm: bw.input.value === "" ? 3500 : Number(bw.input.value),
    });
    if (r.error) { oC.textContent = r.error; oR.textContent = "-"; oP.textContent = "-"; return; }
    oC.textContent = fmt(r.cycles_of_concentration, 1) + " cycles";
    oR.textContent = fmt(r.blowdown_rate_lb_hr, 0) + " lb/hr";
    oP.textContent = fmt(r.blowdown_pct_of_feedwater, 2) + "%";
  }, DEBOUNCE_MS);
  for (const f of [sr, fw, bw]) f.input.addEventListener("input", update);
}
STEAMPRESSURE_RENDERERS["steam-boiler-blowdown"] = _v954renderSteamBoilerBlowdown;

// ===================== spec-v990: radiator EDR to heat output =====================
// dims: in { edr_sqft: L^2, system_k: M T^-3, pickup_factor: dimensionless } out: { heat_output_btu_hr: M L^2 T^-3, gross_boiler_btu_hr: M L^2 T^-3 }
export function computeRadiatorEdrOutput({ edr_sqft = 320, system_k = 240, pickup_factor = 0.33 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(edr_sqft > 0)) return { error: "EDR must be positive (sq ft)." };
  if (!(system_k > 0)) return { error: "EDR heat constant must be positive (240 steam, 150 hot water)." };
  if (!(pickup_factor >= 0)) return { error: "Pickup factor cannot be negative." };
  // Q = EDR x k; k = 240 (steam, 215 F in a 70 F room) or 150 (hot water, 170 F avg). Boiler gross = net x (1 + pickup).
  const heat_output_btu_hr = edr_sqft * system_k;
  const gross_boiler_btu_hr = heat_output_btu_hr * (1 + pickup_factor);
  if (![heat_output_btu_hr, gross_boiler_btu_hr].every(Number.isFinite)) return { error: "EDR math is not a finite value." };
  return {
    heat_output_btu_hr,
    gross_boiler_btu_hr,
    note: "The heat a cast-iron radiator or convector delivers from its EDR rating, and the gross boiler size that feeds it. EDR -- Equivalent Direct Radiation, in square feet -- is the standard way old steam and hot-water heating is rated, and the conversion to BTU per hour is a fixed constant per system: 1 sq ft EDR = 240 BTU/hr on STEAM (the Hydronics Institute / I=B=R basis, one square foot emitting 240 BTU/hr with 215 F steam in a 70 F room) and 150 BTU/hr on HOT WATER (170 F average water in a 70 F room). Six radiators totaling 320 sq ft EDR on steam put out 320 x 240 = 76,800 BTU/hr; the same 320 sq ft on a hot-water system would put out 320 x 150 = 48,000. Sizing the boiler adds a PICKUP allowance -- extra capacity to warm the cold piping and iron on a morning start -- so the gross boiler output is the connected load times (1 + pickup): the I=B=R pickup is about 0.33 (33%) for steam and about 0.15 for hot water, so the 76,800 steam load wants a boiler with a gross output near 102,000 BTU/hr, selected by its NET steam rating (>= 320 sq ft / 76,800 BTU/hr). A sizing aid; the actual radiator EDR from the maker or a measurement, the real piping and pickup, and the boiler's I=B=R net rating govern.",
  };
}

export const radiatorEdrOutputExample = { inputs: { edr_sqft: 320, system_k: 240, pickup_factor: 0.33 } };

function _v990renderRadiatorEdrOutput(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: radiator EDR to heat output, Hydronics Institute / I=B=R basis, by name. Q = EDR x k; k = 240 BTU/hr per sq ft (steam, 215 F / 70 F room), 150 (hot water, 170 F avg). Gross boiler = net x (1 + pickup); I=B=R pickup ~0.33 steam, ~0.15 hot water; select by NET rating. The radiator EDR, the real piping/pickup, and the boiler's I=B=R rating govern.";
  const ed = makeNumber("Connected EDR (sq ft)", "red-ed", { step: "any", min: "0" });
  const sk = makeNumber("EDR constant (240 steam, 150 hot water)", "red-sk", { step: "any", min: "0" });
  const pf = makeNumber("Boiler pickup factor (0.33 steam, 0.15 HW)", "red-pf", { step: "any", min: "0" });
  for (const f of [ed, sk, pf]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { ed.input.value = "320"; sk.input.value = "240"; pf.input.value = "0.33"; update(); });
  const oH = makeOutputLine(outputRegion, "Radiator heat output", "red-out-h");
  const oG = makeOutputLine(outputRegion, "Gross boiler size", "red-out-g");
  const update = debounce(() => {
    const r = computeRadiatorEdrOutput({
      edr_sqft: ed.input.value === "" ? 320 : Number(ed.input.value), system_k: sk.input.value === "" ? 240 : Number(sk.input.value),
      pickup_factor: pf.input.value === "" ? 0.33 : Number(pf.input.value),
    });
    if (r.error) { oH.textContent = r.error; oG.textContent = "-"; return; }
    oH.textContent = fmt(r.heat_output_btu_hr, 0) + " BTU/hr";
    oG.textContent = fmt(r.gross_boiler_btu_hr, 0) + " BTU/hr (with pickup)";
  }, DEBOUNCE_MS);
  for (const f of [ed, sk, pf]) f.input.addEventListener("input", update);
}
STEAMPRESSURE_RENDERERS["radiator-edr-output"] = _v990renderRadiatorEdrOutput;

// --- spec-v1113 B: ASME UG-27 shell thickness with joint efficiency and corrosion allowance ---
// hoop-stress-mawp is the plain mechanics-of-materials P = 2tS/D with no joint efficiency and no
// corrosion allowance, and its own note says a pressure-vessel code governs. This is the code form:
//   cylinder (circumferential stress on the LONGITUDINAL seam):  t = P R / (S E - 0.6 P)
//   sphere:                                                      t = P R / (2 S E - 0.2 P)
// R is the INSIDE radius, E the joint efficiency, and the corrosion allowance is added AFTER.
// Validity: cylinder t <= R/2 and P <= 0.385 S E; sphere t <= 0.356 R and P <= 0.665 S E. Both formulas and both limits were
// confirmed against two independent published sources before shipping.
// dims: in { design_pressure_psi: M L^-1 T^-2, inside_radius_in: L, allowable_stress_psi: M L^-1 T^-2, joint_efficiency: dimensionless, corrosion_allowance_in: L, geometry: dimensionless } out: { t_required_in: L, t_with_allowance_in: L, mawp_psi: M L^-1 T^-2 }
export function computeAsmeShellThickness({ design_pressure_psi = 0, inside_radius_in = 0, allowable_stress_psi = 0, joint_efficiency = 0.85, corrosion_allowance_in = 0.0625, geometry = "cylindrical" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const P = Number(design_pressure_psi) || 0;
  const R = Number(inside_radius_in) || 0;
  const S = Number(allowable_stress_psi) || 0;
  const E = Number(joint_efficiency) || 0;
  const CA = Number(corrosion_allowance_in);
  if (geometry !== "cylindrical" && geometry !== "spherical") return { error: "Geometry must be cylindrical or spherical." };
  if (!(P > 0)) return { error: "Design pressure must be positive (psi, gauge)." };
  if (!(R > 0)) return { error: "Inside radius must be positive (in) - the INSIDE radius in the corroded condition, not the outside diameter." };
  if (!(S > 0)) return { error: "Allowable stress must be positive (psi) at the DESIGN temperature, from the code's material tables." };
  if (!(E > 0 && E <= 1)) return { error: "Joint efficiency must be over 0 and up to 1.0." };
  if (!Number.isFinite(CA) || CA < 0) return { error: "Corrosion allowance cannot be negative (in)." };
  const cylindrical = geometry === "cylindrical";
  const se = S * E;
  const denom = cylindrical ? se - 0.6 * P : 2 * se - 0.2 * P;
  if (!(denom > 0)) return { error: "The design pressure is too high for this material and joint efficiency - the formula's denominator has gone to zero or negative. The section is outside the UG-27 thin-shell range entirely." };
  const t_required_in = P * R / denom;
  const t_with_allowance_in = t_required_in + CA;
  // UG-27(c)(1) cylinder: t <= R/2 and P <= 0.385 S E. UG-27(d) sphere: t <= 0.356 R and
  // P <= 0.665 S E -- the sphere's own pair, not the cylinder's R/2.
  const pressure_limit_psi = (cylindrical ? 0.385 : 0.665) * se;
  const thickness_limit_in = (cylindrical ? 0.5 : 0.356) * R;
  const over_pressure_limit = P > pressure_limit_psi;
  const over_thickness_limit = t_required_in > thickness_limit_in;
  const outside_ug27 = over_pressure_limit || over_thickness_limit;
  // MAWP for the required thickness, inverting the same relation.
  const mawp_psi = cylindrical
    ? se * t_required_in / (R + 0.6 * t_required_in)
    : 2 * se * t_required_in / (R + 0.2 * t_required_in);
  if (![t_required_in, t_with_allowance_in, mawp_psi].every(Number.isFinite)) return { error: "Shell-thickness math did not produce a finite value." };
  return {
    t_required_in, t_with_allowance_in, mawp_psi, se, pressure_limit_psi, thickness_limit_in,
    over_pressure_limit, over_thickness_limit, outside_ug27, cylindrical,
    note: "The code form of a calculation the plain hoop-stress tile does without: joint efficiency and corrosion allowance both belong in it, and they move the answer a long way. "
      + "E is the weld joint efficiency - roughly 1.00 for a fully radiographed Type 1 butt joint, 0.85 for spot radiography, and 0.70 for no radiography - so choosing no radiography over full costs about 43% more wall. The corrosion allowance is ADDED after the strength calculation (" + CA.toFixed(4) + " in here) and the radius entered should be the inside radius in the CORRODED condition, which is the step most often skipped. "
      + (outside_ug27
        ? "OUTSIDE THE UG-27 RANGE: " + (over_thickness_limit ? "the required thickness exceeds " + (cylindrical ? "half the inside radius" : "0.356 of the inside radius") : "") + (over_thickness_limit && over_pressure_limit ? " and " : "") + (over_pressure_limit ? "the pressure exceeds " + (cylindrical ? "0.385" : "0.665") + " S E" : "") + " - the thin-shell equations do not apply and the thick-wall rules (Appendix 1) govern. "
        : "Inside the UG-27 thin-shell range: the thickness is under " + (cylindrical ? "half the inside radius and the pressure is under 0.385 S E" : "0.356 of the inside radius and the pressure is under 0.665 S E") + ". ")
      + "SCOPE: this is the CIRCUMFERENTIAL-stress case, the hoop force on the LONGITUDINAL seam, which governs a cylinder and is the check people actually run - the longitudinal-stress case on the circumferential seam is a separate and rarely governing equation, and it is deliberately not included here because it could not be confirmed against two independent sources. Nozzle reinforcement, heads, external pressure and buckling, discontinuity stresses, and the allowable-stress table itself are all outside this tile. The allowable stress must come from the code's table at the design TEMPERATURE, not room temperature. ASME BPVC Section VIII and the vessel engineer govern - this is a check, not a stamped design.",
  };
}
export const asmeShellThicknessExample = { inputs: { design_pressure_psi: 150, inside_radius_in: 24, allowable_stress_psi: 17500, joint_efficiency: 0.85, corrosion_allowance_in: 0.0625, geometry: "cylindrical" } };

function _v1113renderAsmeShellThickness(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASME BPVC Section VIII Division 1, UG-27 shell thickness under internal pressure, by section number. Cylindrical shell, circumferential stress on the longitudinal joint: t = P R / (S E - 0.6 P). Spherical shell: t = P R / (2 S E - 0.2 P). R is the INSIDE radius in the corroded condition, S the allowable stress at the design temperature, and E the joint efficiency; the corrosion allowance is added after the strength calculation. Validity: thickness not more than half the inside radius, and for the cylinder pressure not more than 0.385 S E - beyond either, the thick-wall rules of Appendix 1 govern. Both formulas and both limits were confirmed against two independent published sources. The longitudinal-stress case on the circumferential joint is a separate, rarely governing equation and is deliberately not included. No allowable-stress or joint-efficiency table is reproduced - both are entered. ASME BPVC Section VIII and the vessel engineer govern.";
  const p = makeNumber("Design pressure (psig)", "ast-p", { step: "any", min: "0" });
  const r = makeNumber("Inside radius, corroded (in)", "ast-r", { step: "any", min: "0" });
  const s = makeNumber("Allowable stress at design temp (psi)", "ast-s", { step: "any", min: "0", value: "17500" }); s.input.value = "17500";
  const e = makeNumber("Joint efficiency E (1.00 full RT, 0.85 spot, 0.70 none)", "ast-e", { step: "any", min: "0", max: "1", value: "0.85" }); e.input.value = "0.85";
  const c = makeNumber("Corrosion allowance (in)", "ast-c", { step: "any", min: "0", value: "0.0625" }); c.input.value = "0.0625";
  const g = makeSelect("Geometry", "ast-g", [{ value: "cylindrical", label: "Cylindrical shell" }, { value: "spherical", label: "Spherical shell" }]);
  g.select.value = "cylindrical";
  for (const f of [p, r, s, e, c, g]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { p.input.value = "150"; r.input.value = "24"; s.input.value = "17500"; e.input.value = "0.85"; c.input.value = "0.0625"; g.select.value = "cylindrical"; update(); });
  const oT = makeOutputLine(outputRegion, "Required thickness", "ast-out-t");
  const oV = makeOutputLine(outputRegion, "UG-27 validity", "ast-out-v");
  const oM = makeOutputLine(outputRegion, "MAWP at the required thickness", "ast-out-m");
  const oN = makeOutputLine(outputRegion, "Note", "ast-out-n");
  const update = debounce(() => {
    const res = computeAsmeShellThickness({
      design_pressure_psi: Number(p.input.value), inside_radius_in: Number(r.input.value),
      allowable_stress_psi: Number(s.input.value), joint_efficiency: Number(e.input.value),
      corrosion_allowance_in: Number(c.input.value), geometry: g.select.value,
    });
    if (res.error) { oT.textContent = res.error; oV.textContent = "-"; oM.textContent = "-"; oN.textContent = "-"; return; }
    oT.textContent = fmt(res.t_required_in, 4) + " in by strength, " + fmt(res.t_with_allowance_in, 4) + " in with the corrosion allowance";
    oV.textContent = res.outside_ug27
      ? "OUTSIDE the thin-shell range - Appendix 1 governs"
      : "inside the range (t limit " + fmt(res.thickness_limit_in, 2) + " in, P limit " + fmt(res.pressure_limit_psi, 0) + " psi)";
    oM.textContent = fmt(res.mawp_psi, 1) + " psi (S x E = " + fmt(res.se, 0) + " psi)";
    oN.textContent = res.note;
  }, DEBOUNCE_MS);
  for (const f of [p, r, s, e, c]) f.input.addEventListener("input", update);
  g.select.addEventListener("change", update);
  update();
}
STEAMPRESSURE_RENDERERS["asme-shell-thickness"] = _v1113renderAsmeShellThickness;

// ===================== spec-v1233: ASME UG-32 formed-head thickness =====================
// The head thickness the asme-shell-thickness tile names as out of scope ("heads ... are all
// outside this tile"). ASME BPVC Section VIII Div 1, UG-32, internal-pressure heads:
//   2:1 ellipsoidal (UG-32(d)):     t = P D / (2 S E - 0.2 P)     D = inside diameter
//   hemispherical  (UG-32(f)):      t = P R / (2 S E - 0.2 P)     R = inside radius = D/2
//   torispherical standard F&D (UG-32(e), L = D, r = 0.06 L):  t = 0.885 P L / (S E - 0.1 P)
// D is the INSIDE diameter, E the joint efficiency, corrosion allowance added AFTER. All three
// forms and the standard-F&D 0.885 coefficient were confirmed against two independent sources
// (CASTI Guidebook to ASME Section VIII Div 1, Eq 8.1 and worked Example 8.1; ASME UG-32).
// dims: in { design_pressure_psi: M L^-1 T^-2, inside_diameter_in: L, allowable_stress_psi: M L^-1 T^-2, joint_efficiency: dimensionless, corrosion_allowance_in: L, head_type: dimensionless } out: { t_required_in: L, t_with_allowance_in: L, mawp_psi: M L^-1 T^-2 }
export function computeAsmeHeadThickness({ design_pressure_psi = 0, inside_diameter_in = 0, allowable_stress_psi = 0, joint_efficiency = 0.85, corrosion_allowance_in = 0.0625, head_type = "ellipsoidal" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const P = Number(design_pressure_psi) || 0;
  const D = Number(inside_diameter_in) || 0;
  const S = Number(allowable_stress_psi) || 0;
  const E = Number(joint_efficiency) || 0;
  const CA = Number(corrosion_allowance_in);
  if (head_type !== "ellipsoidal" && head_type !== "hemispherical" && head_type !== "torispherical") return { error: "Head type must be ellipsoidal, hemispherical, or torispherical." };
  if (!(P > 0)) return { error: "Design pressure must be positive (psi, gauge)." };
  if (!(D > 0)) return { error: "Inside diameter must be positive (in) - the INSIDE diameter in the corroded condition." };
  if (!(S > 0)) return { error: "Allowable stress must be positive (psi) at the DESIGN temperature, from the code's material tables." };
  if (!(E > 0 && E <= 1)) return { error: "Joint efficiency must be over 0 and up to 1.0." };
  if (!Number.isFinite(CA) || CA < 0) return { error: "Corrosion allowance cannot be negative (in)." };
  const se = S * E;
  // denominator per head type
  const denom = head_type === "torispherical" ? se - 0.1 * P : 2 * se - 0.2 * P;
  if (!(denom > 0)) return { error: "The design pressure is too high for this material and joint efficiency - the formula's denominator has gone to zero or negative, outside the UG-32 thin-head range." };
  let t_required_in, mawp_psi;
  if (head_type === "ellipsoidal") {
    t_required_in = P * D / denom;
    mawp_psi = 2 * se * t_required_in / (D + 0.2 * t_required_in);
  } else if (head_type === "hemispherical") {
    const R = D / 2;
    t_required_in = P * R / denom;
    mawp_psi = 2 * se * t_required_in / (R + 0.2 * t_required_in);
  } else {
    const L = D; // standard flanged-and-dished: crown radius = inside diameter
    t_required_in = 0.885 * P * L / denom;
    mawp_psi = se * t_required_in / (0.885 * L + 0.1 * t_required_in);
  }
  const t_with_allowance_in = t_required_in + CA;
  if (![t_required_in, t_with_allowance_in, mawp_psi].every(Number.isFinite)) return { error: "Head-thickness math did not produce a finite value." };
  // UG-32(f): the hemispherical formula holds only while t <= 0.356 L and P <= 0.665 S E (L = D/2),
  // the same limits UG-27(d) sets for a sphere; beyond them Appendix 1 governs.
  const outside_ug32 = head_type === "hemispherical" && (t_required_in > 0.356 * D / 2 || P > 0.665 * se);
  return {
    t_required_in, t_with_allowance_in, mawp_psi, se, head_type, outside_ug32,
    note: "ASME BPVC Section VIII Division 1, UG-32 minimum thickness for a formed head under internal pressure: a 2:1 ellipsoidal head t = P D / (2 S E - 0.2 P), a hemispherical head t = P R / (2 S E - 0.2 P) with R = D/2, and a standard flanged-and-dished (torispherical) head t = 0.885 P L / (S E - 0.1 P) with the crown radius L equal to the inside diameter and a 6% knuckle. For the same vessel the hemispherical head is thinnest (the strongest shape), the 2:1 ellipsoidal about twice that, and the torispherical the thickest - which is why a cheap dished head trades material for a shallower profile. D is the INSIDE diameter in the corroded condition and E the joint efficiency; the corrosion allowance (" + (Number.isFinite(CA) ? CA.toFixed(4) : "0") + " in here) is ADDED after the strength calculation. The 0.885 torispherical coefficient is for the standard L = D, r = 0.06 L head; other L/r ratios use the M factor of Appendix 1-4, and ellipsoidal ratios other than 2:1 use the K factor - both outside this tile. Knuckle thinning during forming, the minimum-thickness-after-forming rule, staying-and-stiffening, and external pressure are separate. The allowable stress must come from the code's table at the design TEMPERATURE. ASME BPVC Section VIII and the vessel engineer govern - this is a check, not a stamped design.",
  };
}
export const asmeHeadThicknessExample = { inputs: { design_pressure_psi: 150, inside_diameter_in: 48, allowable_stress_psi: 17500, joint_efficiency: 0.85, corrosion_allowance_in: 0.0625, head_type: "ellipsoidal" } };

function _renderAsmeHeadThickness(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: ASME BPVC Section VIII Division 1, UG-32 formed-head thickness under internal pressure, by section number. 2:1 ellipsoidal (UG-32(d)): t = P D / (2 S E - 0.2 P). Hemispherical (UG-32(f)): t = P R / (2 S E - 0.2 P), R = D/2. Standard flanged-and-dished torispherical (UG-32(e), crown radius L = D, 6% knuckle): t = 0.885 P L / (S E - 0.1 P). D is the INSIDE diameter in the corroded condition, S the allowable stress at the design temperature, E the joint efficiency; the corrosion allowance is added after. All three forms and the 0.885 coefficient were confirmed against two independent sources (CASTI Guidebook Eq 8.1 and worked Example 8.1; ASME UG-32). Non-2:1 ellipsoidal (K factor) and non-standard torispherical (M factor) are outside this tile. No allowable-stress or joint-efficiency table is reproduced. ASME BPVC Section VIII and the vessel engineer govern.";
  const p = makeNumber("Design pressure (psig)", "aht-p", { step: "any", min: "0" });
  const d = makeNumber("Inside diameter, corroded (in)", "aht-d", { step: "any", min: "0" });
  const s = makeNumber("Allowable stress at design temp (psi)", "aht-s", { step: "any", min: "0", value: "17500" }); s.input.value = "17500";
  const e = makeNumber("Joint efficiency E (1.00 full RT, 0.85 spot, 0.70 none)", "aht-e", { step: "any", min: "0", max: "1", value: "0.85" }); e.input.value = "0.85";
  const c = makeNumber("Corrosion allowance (in)", "aht-c", { step: "any", min: "0", value: "0.0625" }); c.input.value = "0.0625";
  const g = makeSelect("Head type", "aht-g", [{ value: "ellipsoidal", label: "2:1 ellipsoidal" }, { value: "hemispherical", label: "Hemispherical" }, { value: "torispherical", label: "Torispherical (standard F&D)" }]);
  g.select.value = "ellipsoidal";
  for (const f of [p, d, s, e, c, g]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { p.input.value = "150"; d.input.value = "48"; s.input.value = "17500"; e.input.value = "0.85"; c.input.value = "0.0625"; g.select.value = "ellipsoidal"; update(); });
  const oT = makeOutputLine(outputRegion, "Required thickness", "aht-out-t");
  const oM = makeOutputLine(outputRegion, "MAWP at the required thickness", "aht-out-m");
  const oN = makeOutputLine(outputRegion, "Note", "aht-out-n");
  const update = debounce(() => {
    const res = computeAsmeHeadThickness({
      design_pressure_psi: Number(p.input.value), inside_diameter_in: Number(d.input.value),
      allowable_stress_psi: Number(s.input.value), joint_efficiency: Number(e.input.value),
      corrosion_allowance_in: Number(c.input.value), head_type: g.select.value,
    });
    if (res.error) { oT.textContent = res.error; oM.textContent = "-"; oN.textContent = "-"; return; }
    oT.textContent = fmt(res.t_required_in, 4) + " in by strength, " + fmt(res.t_with_allowance_in, 4) + " in with the corrosion allowance";
    oM.textContent = fmt(res.mawp_psi, 1) + " psi (S x E = " + fmt(res.se, 0) + " psi)";
    oN.textContent = (res.outside_ug32 ? "OUTSIDE THE UG-32(f) RANGE: the thickness exceeds 0.356 of the inside radius or the pressure exceeds 0.665 S E, so the thin-head formula does not apply and Appendix 1 governs. " : "") + res.note;
  }, DEBOUNCE_MS);
  for (const f of [p, d, s, e, c]) f.input.addEventListener("input", update);
  g.select.addEventListener("change", update);
  update();
}
STEAMPRESSURE_RENDERERS["asme-head-thickness"] = _renderAsmeHeadThickness;
