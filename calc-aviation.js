// spec-v12 Group W: Pilots / Aviation starter. Three tiles:
//
//   W.1 Density altitude (from pressure altitude + OAT)
//   W.3 Crosswind / headwind component (runway heading + wind)
//   W.9 ETA / ETE (distance + groundspeed [+ departure time])
//
// Pure deterministic geometry and lookup. Every tile carries
// GOVERNANCE.aviation in citations.js ("Pilot-in-command and the
// airplane flight manual govern; verify against the AFM loading
// graph or table"). No data shards.
//
// The aviation governance variant is intentionally strong: a pilot
// who relies on a website calculator instead of the airplane flight
// manual has missed the point. These tiles are math aids for
// cross-checking the POH chart, never substitutes for it.

import { DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeOutputLine, attachExampleButton, fmt } from "./ui-fields.js";

// ====================================================================
// W.1 Density altitude
// ====================================================================
//
// Density altitude is the pressure altitude corrected for non-ISA
// temperature. The FAA simplified formula used in the Pilot's Handbook
// of Aeronautical Knowledge (FAA-H-8083-25C) Chapter 4:
//
//   DA = PA + 120 * (OAT_C - ISA_temp_C)
//   ISA_temp_C = 15 - 1.98 * (PA_ft / 1000)
//
// The "120 feet per degree C" factor is the engineering approximation
// the FAA bakes into the density-altitude koch chart. A more precise
// barometric / virtual-temperature formula exists for high-altitude
// turbine work; the simplified form is what GA POH charts use and is
// what pilots cross-check with on a kneeboard.

export function computeDensityAltitude({ pressure_altitude_ft, oat_c }) {
  const PA = Number(pressure_altitude_ft);
  const OAT = Number(oat_c);
  if (!Number.isFinite(PA)) return { error: "Enter pressure altitude in feet." };
  if (!Number.isFinite(OAT)) return { error: "Enter outside air temperature in degrees C." };
  if (PA < -2000 || PA > 60000) return { error: "Pressure altitude must be between -2000 and 60000 ft." };
  if (OAT < -60 || OAT > 60) return { error: "OAT must be between -60 and 60 degrees C." };
  const isa_c = 15 - 1.98 * (PA / 1000);
  const isa_dev = OAT - isa_c;
  const da = PA + 120 * isa_dev;
  // Performance band relative to sea-level standard day. The
  // multipliers are FAA Koch-chart approximations: GA takeoff distance
  // roughly doubles by 5,000 ft DA and triples by 8,000 ft DA on a
  // standard-density-aspirated piston single.
  let band, takeoff_factor;
  if (da < 0) { band = "below sea level (cold and high pressure)"; takeoff_factor = 0.9; }
  else if (da < 2000) { band = "near sea level"; takeoff_factor = 1.0; }
  else if (da < 4000) { band = "low altitude (typical GA airport)"; takeoff_factor = 1.2; }
  else if (da < 6000) { band = "moderate altitude"; takeoff_factor = 1.5; }
  else if (da < 8000) { band = "high altitude (engine power noticeably reduced)"; takeoff_factor = 2.0; }
  else if (da < 10000) { band = "high altitude (mountain operations)"; takeoff_factor = 2.5; }
  else { band = "very high altitude (verify aircraft service ceiling)"; takeoff_factor = 3.0; }
  return {
    density_altitude_ft: da,
    isa_temp_c: isa_c,
    isa_deviation_c: isa_dev,
    band,
    takeoff_distance_factor_vs_sl: takeoff_factor,
  };
}

export const densityAltitudeExample = {
  inputs: { pressure_altitude_ft: 5000, oat_c: 25 },
  // ISA at 5000 ft = 15 - 1.98*5 = 5.1 C. Deviation = 25 - 5.1 = 19.9.
  // DA = 5000 + 120*19.9 = 5000 + 2388 = 7388.
  expected: { density_altitude_ft_approx: 7388 },
};

export function renderDensityAltitude(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Density altitude per the FAA Pilot's Handbook of Aeronautical Knowledge (FAA-H-8083-25C) Chapter 4. DA = PA + 120 * (OAT_C - ISA_C); ISA_C = 15 - 1.98 * (PA / 1000). Performance multipliers approximate the FAA Koch chart for a normally-aspirated piston single. PIC and POH govern final go / no-go and takeoff-distance numbers; this is a cross-check, not a substitute.";
  const PA = makeNumber("Pressure altitude (ft)", "da-pa", { step: "any" });
  const OAT = makeNumber("Outside air temperature (C)", "da-oat", { step: "any" });
  for (const f of [PA, OAT]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    PA.input.value = String(densityAltitudeExample.inputs.pressure_altitude_ft);
    OAT.input.value = String(densityAltitudeExample.inputs.oat_c);
    update();
  });
  const oDA = makeOutputLine(outputRegion, "Density altitude (ft)", "da-out-da");
  const oISA = makeOutputLine(outputRegion, "ISA temp at PA (C)", "da-out-isa");
  const oDev = makeOutputLine(outputRegion, "ISA deviation (C; positive = hotter than standard)", "da-out-dev");
  const oBand = makeOutputLine(outputRegion, "Band", "da-out-band");
  const oFactor = makeOutputLine(outputRegion, "Takeoff distance factor vs sea-level standard", "da-out-tof");
  const update = debounce(() => {
    const r = computeDensityAltitude({ pressure_altitude_ft: PA.input.value, oat_c: OAT.input.value });
    if (r.error) {
      oDA.textContent = r.error;
      for (const o of [oISA, oDev, oBand, oFactor]) o.textContent = "-";
      return;
    }
    oDA.textContent = fmt(r.density_altitude_ft, 0);
    oISA.textContent = fmt(r.isa_temp_c, 1);
    oDev.textContent = (r.isa_deviation_c >= 0 ? "+" : "") + fmt(r.isa_deviation_c, 1);
    oBand.textContent = r.band;
    oFactor.textContent = fmt(r.takeoff_distance_factor_vs_sl, 2) + "x";
  }, DEBOUNCE_MS);
  for (const el of [PA.input, OAT.input]) el.addEventListener("input", update);
}

// ====================================================================
// W.3 Crosswind / headwind component
// ====================================================================
//
// Pure geometry. Given the runway heading and the wind direction +
// speed, decompose the wind into headwind (along the runway axis) and
// crosswind (perpendicular) components.
//
//   wind_angle = wind_direction - runway_heading (normalized to [-180, 180])
//   HW = ws * cos(wind_angle)            (positive = headwind, negative = tailwind)
//   CW = ws * sin(wind_angle)            (positive = wind from the right)

function normalizeAngleDeg(a) {
  // Map to (-180, 180].
  let x = ((a % 360) + 360) % 360;
  if (x > 180) x -= 360;
  return x;
}

export function computeCrosswind({ runway_heading_deg, wind_direction_deg, wind_speed_kt, demonstrated_crosswind_kt }) {
  const rwy = Number(runway_heading_deg);
  const wd = Number(wind_direction_deg);
  const ws = Number(wind_speed_kt);
  const demo = Number(demonstrated_crosswind_kt);
  if (!Number.isFinite(rwy) || !Number.isFinite(wd) || !Number.isFinite(ws)) {
    return { error: "Enter runway heading, wind direction, and wind speed." };
  }
  if (rwy < 0 || rwy > 360) return { error: "Runway heading must be 0 to 360 deg (runway 36 = 360 alias for 0)." };
  if (wd < 0 || wd > 360) return { error: "Wind direction must be 0 to 360 deg (360 alias for 0)." };
  if (ws < 0 || ws > 200) return { error: "Wind speed must be between 0 and 200 kt." };
  const wind_angle = normalizeAngleDeg(wd - rwy);
  const rad = (wind_angle * Math.PI) / 180;
  const hw = ws * Math.cos(rad);
  const cw = ws * Math.sin(rad);
  // Side: "from the right" if positive, "from the left" if negative, "headwind/tailwind only" if zero.
  let crosswind_side;
  if (Math.abs(cw) < 1e-6) crosswind_side = "no crosswind component";
  else crosswind_side = cw > 0 ? "from the right" : "from the left";
  // Head-vs-tail.
  let head_or_tail;
  if (Math.abs(hw) < 1e-6) head_or_tail = "pure crosswind";
  else head_or_tail = hw > 0 ? "headwind" : "tailwind";
  // Demonstrated crosswind comparison if supplied.
  let demo_status = null;
  if (Number.isFinite(demo) && demo > 0) {
    demo_status = Math.abs(cw) <= demo
      ? "within demonstrated (" + fmt(demo, 1) + " kt)"
      : "exceeds demonstrated (" + fmt(demo, 1) + " kt); use the runway with lower crosswind or wait for the wind to drop";
  }
  return {
    wind_angle_off_runway_deg: wind_angle,
    headwind_kt: hw,
    crosswind_kt: cw,
    crosswind_side,
    head_or_tail,
    demo_status,
  };
}

export const crosswindExample = {
  inputs: { runway_heading_deg: 90, wind_direction_deg: 130, wind_speed_kt: 20, demonstrated_crosswind_kt: 15 },
  // 40 deg off the runway, 20 kt -> HW = 20*cos(40) ~15.32, CW = 20*sin(40) ~12.86.
  expected: { headwind_kt_approx: 15.32, crosswind_kt_approx: 12.86 },
};

export function renderCrosswind(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Pure geometry. HW = wind_speed * cos(wind_angle_off_runway); CW = wind_speed * sin(wind_angle_off_runway). Demonstrated crosswind in the POH is not a regulatory limit but the manufacturer's tested value; PIC governs the operating decision.";
  const RWY = makeNumber("Runway heading (deg, 0-359)", "cw-rwy", { step: "any", min: "0", max: "359" });
  const WD = makeNumber("Wind direction (deg from, 0-359)", "cw-wd", { step: "any", min: "0", max: "359" });
  const WS = makeNumber("Wind speed (kt)", "cw-ws", { step: "any", min: "0", max: "200" });
  const DEMO = makeNumber("Demonstrated crosswind from POH (kt, optional)", "cw-demo", { step: "any", min: "0", value: "0" });
  for (const f of [RWY, WD, WS, DEMO]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    RWY.input.value = String(crosswindExample.inputs.runway_heading_deg);
    WD.input.value = String(crosswindExample.inputs.wind_direction_deg);
    WS.input.value = String(crosswindExample.inputs.wind_speed_kt);
    DEMO.input.value = String(crosswindExample.inputs.demonstrated_crosswind_kt);
    update();
  });
  const oAngle = makeOutputLine(outputRegion, "Wind angle off runway (deg)", "cw-out-angle");
  const oHW = makeOutputLine(outputRegion, "Headwind / tailwind component (kt)", "cw-out-hw");
  const oCW = makeOutputLine(outputRegion, "Crosswind component (kt)", "cw-out-cw");
  const oSide = makeOutputLine(outputRegion, "Crosswind side", "cw-out-side");
  const oHT = makeOutputLine(outputRegion, "Head or tail", "cw-out-ht");
  const oDemo = makeOutputLine(outputRegion, "Demonstrated-crosswind comparison", "cw-out-demo");
  const update = debounce(() => {
    const r = computeCrosswind({
      runway_heading_deg: RWY.input.value,
      wind_direction_deg: WD.input.value,
      wind_speed_kt: WS.input.value,
      demonstrated_crosswind_kt: DEMO.input.value,
    });
    if (r.error) {
      oAngle.textContent = r.error;
      for (const o of [oHW, oCW, oSide, oHT, oDemo]) o.textContent = "-";
      return;
    }
    oAngle.textContent = fmt(r.wind_angle_off_runway_deg, 1);
    oHW.textContent = (r.headwind_kt >= 0 ? "+" : "") + fmt(r.headwind_kt, 1);
    oCW.textContent = (r.crosswind_kt >= 0 ? "+" : "") + fmt(r.crosswind_kt, 1);
    oSide.textContent = r.crosswind_side;
    oHT.textContent = r.head_or_tail;
    oDemo.textContent = r.demo_status || "-";
  }, DEBOUNCE_MS);
  for (const el of [RWY.input, WD.input, WS.input, DEMO.input]) el.addEventListener("input", update);
}

// ====================================================================
// W.9 ETA / ETE
// ====================================================================
//
// Time-in-flight = distance / groundspeed, in hours. Output is formatted
// hh:mm and (when a departure time is provided) the local arrival time.

export function computeETE({ distance_nm, groundspeed_kt, departure_time_local }) {
  const D = Number(distance_nm);
  const GS = Number(groundspeed_kt);
  if (!Number.isFinite(D) || D <= 0) return { error: "Enter a positive distance in nm." };
  if (!Number.isFinite(GS) || GS <= 0) return { error: "Enter a positive groundspeed in kt." };
  if (GS < 30) {
    // Allowed but flagged; balloon / glider operations or a stiff
    // headwind on a slow piston. The user sees the band so they know
    // the math is unusual.
  }
  const ete_hr = D / GS;
  const ete_minutes_total = ete_hr * 60;
  const hours = Math.floor(ete_minutes_total / 60);
  const minutes = Math.round(ete_minutes_total - hours * 60);
  const ete_hhmm = String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");
  let eta_hhmm = null;
  if (typeof departure_time_local === "string" && /^\d{1,2}:\d{2}$/.test(departure_time_local)) {
    const [dh, dm] = departure_time_local.split(":").map((s) => Number(s));
    if (dh >= 0 && dh <= 23 && dm >= 0 && dm <= 59) {
      let total = dh * 60 + dm + Math.round(ete_minutes_total);
      total = ((total % 1440) + 1440) % 1440;
      const eh = Math.floor(total / 60);
      const em = total - eh * 60;
      eta_hhmm = String(eh).padStart(2, "0") + ":" + String(em).padStart(2, "0");
    }
  }
  return {
    ete_hours: ete_hr,
    ete_minutes: ete_minutes_total,
    ete_hhmm,
    eta_local_hhmm: eta_hhmm,
    groundspeed_band: GS < 30 ? "below 30 kt (verify; balloon / glider / strong headwind)" : "normal",
  };
}

export const eteExample = {
  inputs: { distance_nm: 250, groundspeed_kt: 120, departure_time_local: "08:30" },
  // 250 / 120 = 2.0833 hr = 2h05m. Departure 08:30 + 2:05 = 10:35.
  expected: { ete_hhmm: "02:05", eta_local_hhmm: "10:35" },
};

export function renderETE(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: First-principles arithmetic. time_hours = distance_nm / groundspeed_kt. Groundspeed reflects the actual track over the ground; it is not airspeed. PIC governs flight planning and is responsible for verifying the planned-vs-actual track every cruise checkpoint.";
  const D = makeNumber("Distance (nm)", "ete-d", { step: "any", min: "0" });
  const GS = makeNumber("Groundspeed (kt)", "ete-gs", { step: "any", min: "0" });
  // departure_time input as a "text" field with a regex-validated placeholder; using makeNumber would constrain it.
  // For simplicity we use makeSelect with a few common departure-time presets plus a "manual" sentinel. Future
  // work can promote this to a proper time input.
  const departureSelect = makeSelect("Departure local time (optional)", "ete-dt", [
    { value: "", label: "(no departure time, ETE only)" },
    { value: "06:00", label: "06:00" }, { value: "07:00", label: "07:00" },
    { value: "08:00", label: "08:00" }, { value: "08:30", label: "08:30" },
    { value: "09:00", label: "09:00" }, { value: "10:00", label: "10:00" },
    { value: "12:00", label: "12:00" }, { value: "14:00", label: "14:00" },
    { value: "16:00", label: "16:00" }, { value: "18:00", label: "18:00" },
  ]);
  for (const f of [D, GS, departureSelect]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    D.input.value = String(eteExample.inputs.distance_nm);
    GS.input.value = String(eteExample.inputs.groundspeed_kt);
    departureSelect.select.value = eteExample.inputs.departure_time_local;
    update();
  });
  const oETE = makeOutputLine(outputRegion, "ETE (hours:minutes)", "ete-out-ete");
  const oETEDec = makeOutputLine(outputRegion, "ETE (decimal hours)", "ete-out-dec");
  const oETA = makeOutputLine(outputRegion, "ETA (local, hh:mm)", "ete-out-eta");
  const oBand = makeOutputLine(outputRegion, "Groundspeed band", "ete-out-band");
  const update = debounce(() => {
    const r = computeETE({
      distance_nm: D.input.value,
      groundspeed_kt: GS.input.value,
      departure_time_local: departureSelect.select.value,
    });
    if (r.error) {
      oETE.textContent = r.error;
      for (const o of [oETEDec, oETA, oBand]) o.textContent = "-";
      return;
    }
    oETE.textContent = r.ete_hhmm;
    oETEDec.textContent = fmt(r.ete_hours, 3);
    oETA.textContent = r.eta_local_hhmm || "-";
    oBand.textContent = r.groundspeed_band;
  }, DEBOUNCE_MS);
  for (const el of [D.input, GS.input]) el.addEventListener("input", update);
  departureSelect.select.addEventListener("change", update);
}

// --- Renderer registry ---

export const AVIATION_RENDERERS = {
  "density-altitude": renderDensityAltitude,
  "crosswind-component": renderCrosswind,
  "ete-eta": renderETE,
};
