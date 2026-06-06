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

import { DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeText, makeOutputLine, attachExampleButton, fmt } from "./ui-fields.js";

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

// dims: in { pressure_altitude_ft: L, oat_c: T }
//        out: { density_altitude_ft: L, isa_temp_c: T, isa_deviation_c: T, takeoff_distance_factor_vs_sl: dimensionless }
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

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
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

// dims: in { runway_heading_deg: dimensionless, wind_direction_deg: dimensionless, wind_speed_kt: L T^-1, demonstrated_crosswind_kt: L T^-1 }
//        out: { wind_angle_off_runway_deg: dimensionless, headwind_kt: L T^-1, crosswind_kt: L T^-1, crosswind_side: dimensionless, head_or_tail: dimensionless, demo_status: dimensionless }
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

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
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

// dims: in { distance_nm: L, groundspeed_kt: L T^-1, departure_time_local: dimensionless }
//        out: { ete_hours: T, ete_minutes: T, ete_hhmm: dimensionless, eta_local_hhmm: dimensionless, groundspeed_band: dimensionless }
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

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
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

// ====================================================================
// W.7 Hypoxia altitude reference (14 CFR 91.211)
// ====================================================================
//
// 14 CFR §91.211 sets supplemental-oxygen requirements by cabin
// pressure altitude:
//
//   < 12,500 ft cabin PA:               no O2 required.
//   12,500 to 14,000 ft cabin PA:       required flight crew O2
//                                       after 30 minutes at altitude.
//   14,000 to 15,000 ft cabin PA:       required flight crew O2 at
//                                       all times.
//   > 15,000 ft cabin PA:               required O2 for ALL occupants.
//
// Pure threshold lookup over the integer cabin altitude.

// dims: in { cabin_altitude_ft: L }
//        out: { cabin_altitude_ft: L, band: dimensionless, regulation: dimensionless, crew_o2_required: dimensionless, all_occupants_o2_required: dimensionless, note: dimensionless }
export function computeHypoxiaAltitude({ cabin_altitude_ft }) {
  const alt = Number(cabin_altitude_ft);
  if (!Number.isFinite(alt)) return { error: "Enter cabin pressure altitude in feet." };
  if (alt < -2000 || alt > 50000) return { error: "Cabin altitude must be between -2000 and 50000 ft." };
  let band, regulation, crew_o2_required, all_occupants_o2_required, note;
  if (alt < 12500) {
    band = "below 12,500 ft";
    regulation = "None required by 14 CFR §91.211.";
    crew_o2_required = false;
    all_occupants_o2_required = false;
    note = "No supplemental O2 required; consider hypoxia awareness above 10,000 ft especially at night.";
  } else if (alt < 14000) {
    band = "12,500 to 14,000 ft";
    regulation = "14 CFR §91.211(a)(1): required flight-crew O2 after 30 minutes at this altitude.";
    crew_o2_required = true;
    all_occupants_o2_required = false;
    note = "Climb to this band briefly is fine; sustained cruise requires O2 for the pilot(s) after 30 min.";
  } else if (alt < 15000) {
    band = "14,000 to 15,000 ft";
    regulation = "14 CFR §91.211(a)(2): required flight-crew O2 at all times in this band.";
    crew_o2_required = true;
    all_occupants_o2_required = false;
    note = "Pilot(s) must use O2 the entire time in this band; passengers not yet required.";
  } else {
    band = "above 15,000 ft";
    regulation = "14 CFR §91.211(a)(3): required O2 for ALL occupants above 15,000 ft.";
    crew_o2_required = true;
    all_occupants_o2_required = true;
    note = "Every soul on board must be on supplemental O2.";
  }
  return { cabin_altitude_ft: alt, band, regulation, crew_o2_required, all_occupants_o2_required, note };
}

export const hypoxiaExample = {
  inputs: { cabin_altitude_ft: 13000 },
  expected: { band: "12,500 to 14,000 ft", crew_o2_required: true, all_occupants_o2_required: false },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderHypoxiaAltitude(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: 14 CFR §91.211. Free at ecfr.gov. The regulatory thresholds are CABIN pressure altitude (not flight level); pressurized aircraft govern by cabin altitude. PIC governs; the AFM may set tighter limits.";
  const A = makeNumber("Cabin pressure altitude (ft)", "hp-a", { step: "any" });
  inputRegion.appendChild(A.wrap);
  attachExampleButton(inputRegion, () => { A.input.value = String(hypoxiaExample.inputs.cabin_altitude_ft); update(); });
  const oBand = makeOutputLine(outputRegion, "Regulatory band", "hp-out-band");
  const oReg = makeOutputLine(outputRegion, "14 CFR §91.211 requirement", "hp-out-reg");
  const oCrew = makeOutputLine(outputRegion, "Flight-crew O2 required?", "hp-out-crew");
  const oAll = makeOutputLine(outputRegion, "All-occupants O2 required?", "hp-out-all");
  const oNote = makeOutputLine(outputRegion, "Note", "hp-out-note");
  const update = debounce(() => {
    const r = computeHypoxiaAltitude({ cabin_altitude_ft: A.input.value });
    if (r.error) {
      oBand.textContent = r.error;
      for (const o of [oReg, oCrew, oAll, oNote]) o.textContent = "-";
      return;
    }
    oBand.textContent = r.band;
    oReg.textContent = r.regulation;
    oCrew.textContent = r.crew_o2_required ? "Yes" : "No";
    oAll.textContent = r.all_occupants_o2_required ? "Yes" : "No";
    oNote.textContent = r.note;
  }, DEBOUNCE_MS);
  A.input.addEventListener("input", update);
}

// ====================================================================
// W.11 Pressure altitude from altimeter setting + field elevation
// ====================================================================
//
// PA = field_elevation_ft + 1000 * (29.92 - altimeter_setting_inHg)
//
// This is the standard FAA E6B / kneeboard pressure-altitude shortcut:
// every 0.01 inHg below 29.92 adds 10 ft to PA; every 0.01 above
// subtracts 10 ft. The same identity in metric form is 27 ft per hPa
// off ISA (1013.25 hPa); the tile uses the US-customary inHg form.

// dims: in { field_elevation_ft: L, altimeter_setting_inHg: M L^-1 T^-2 }
//        out: { field_elevation_ft: L, altimeter_setting_inHg: M L^-1 T^-2, pressure_altitude_ft: L, isa_deviation_inHg: M L^-1 T^-2 }
export function computePressureAltitude({ field_elevation_ft, altimeter_setting_inHg }) {
  const elev = Number(field_elevation_ft);
  const alt = Number(altimeter_setting_inHg);
  if (!Number.isFinite(elev)) return { error: "Enter field elevation in feet." };
  if (!Number.isFinite(alt) || alt < 25 || alt > 35) return { error: "Altimeter setting must be between 25.00 and 35.00 inHg (typical real-world range 28.50-31.00)." };
  if (elev < -2000 || elev > 60000) return { error: "Field elevation must be between -2000 and 60000 ft." };
  const pa = elev + 1000 * (29.92 - alt);
  return {
    field_elevation_ft: elev,
    altimeter_setting_inHg: alt,
    pressure_altitude_ft: pa,
    isa_deviation_inHg: 29.92 - alt,
  };
}

export const pressureAltitudeExample = {
  inputs: { field_elevation_ft: 5430, altimeter_setting_inHg: 30.12 },
  // 29.92 - 30.12 = -0.20 -> PA = 5430 + 1000*(-0.20) = 5230.
  expected: { pressure_altitude_ft: 5230 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderPressureAltitude(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: PA = field_elevation + 1000 * (29.92 - altimeter_setting_inHg). The 29.92 inHg reference is the ISA standard sea-level pressure. Every 0.01 inHg below standard adds 10 ft of pressure altitude; every 0.01 above subtracts 10 ft. PIC governs; the AFM performance chart uses pressure altitude as its altitude input.";
  const E = makeNumber("Field elevation (ft)", "pa-e", { step: "any" });
  const A = makeNumber("Altimeter setting (inHg)", "pa-a", { step: "0.01", min: "25", max: "35", value: "29.92" });
  for (const f of [E, A]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    E.input.value = String(pressureAltitudeExample.inputs.field_elevation_ft);
    A.input.value = String(pressureAltitudeExample.inputs.altimeter_setting_inHg);
    update();
  });
  const oPA = makeOutputLine(outputRegion, "Pressure altitude (ft)", "pa-out-pa");
  const oDev = makeOutputLine(outputRegion, "Altimeter offset from 29.92 (inHg)", "pa-out-dev");
  const update = debounce(() => {
    const r = computePressureAltitude({ field_elevation_ft: E.input.value, altimeter_setting_inHg: A.input.value });
    if (r.error) {
      oPA.textContent = r.error; oDev.textContent = "-";
      return;
    }
    oPA.textContent = fmt(r.pressure_altitude_ft, 0);
    oDev.textContent = (r.isa_deviation_inHg >= 0 ? "+" : "") + fmt(r.isa_deviation_inHg, 2);
  }, DEBOUNCE_MS);
  for (const el of [E.input, A.input]) el.addEventListener("input", update);
}

// ====================================================================
// W.12 ICAO phonetic alphabet reference
// ====================================================================
//
// The 26-letter ICAO / NATO phonetic alphabet. Reference tile; the
// renderer prints the full A-Z table.

const ICAO_PHONETIC = [
  ["A", "Alpha"], ["B", "Bravo"], ["C", "Charlie"], ["D", "Delta"],
  ["E", "Echo"], ["F", "Foxtrot"], ["G", "Golf"], ["H", "Hotel"],
  ["I", "India"], ["J", "Juliett"], ["K", "Kilo"], ["L", "Lima"],
  ["M", "Mike"], ["N", "November"], ["O", "Oscar"], ["P", "Papa"],
  ["Q", "Quebec"], ["R", "Romeo"], ["S", "Sierra"], ["T", "Tango"],
  ["U", "Uniform"], ["V", "Victor"], ["W", "Whiskey"], ["X", "X-ray"],
  ["Y", "Yankee"], ["Z", "Zulu"],
];

// dims: in { text: dimensionless } out: { letters: dimensionless, translation: dimensionless }
// (Reference / translation tile; the codepoint stream and ICAO phonetic mapping are categorical.)
export function computePhoneticAlphabet({ text }) {
  const map = new Map(ICAO_PHONETIC);
  if (typeof text !== "string" || text.length === 0) {
    return { letters: ICAO_PHONETIC.map(([l, w]) => ({ letter: l, word: w })), translation: null };
  }
  const out = [];
  for (const ch of text.toUpperCase()) {
    if (map.has(ch)) out.push(map.get(ch));
    else if (/[0-9]/.test(ch)) out.push(ch);  // digits spoken as-is
    else if (ch === " ") out.push("(space)");
    else if (ch === "-") out.push("dash");
    else out.push(ch);
  }
  return {
    letters: ICAO_PHONETIC.map(([l, w]) => ({ letter: l, word: w })),
    translation: out.join(" "),
  };
}

export const phoneticExample = {
  inputs: { text: "N12345" },
  expected: { translation_contains: "November" },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderPhoneticAlphabet(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: ICAO / NATO phonetic alphabet (ICAO Annex 10 Volume II Chapter 5; also published in the FAA Aeronautical Information Manual §4-2-7). Public reference.";
  const T = makeText("Translate text to phonetic (optional)", "ph-t", { placeholder: "e.g. N12345 or KJFK" });
  inputRegion.appendChild(T.wrap);
  attachExampleButton(inputRegion, () => { T.input.value = phoneticExample.inputs.text; update(); });
  const oTrans = makeOutputLine(outputRegion, "Phonetic translation", "ph-out-trans");
  const oTable = makeOutputLine(outputRegion, "ICAO phonetic alphabet (A-Z)", "ph-out-table");
  const update = debounce(() => {
    const r = computePhoneticAlphabet({ text: T.input.value || "" });
    oTrans.textContent = r.translation || "(enter text above)";
    oTable.textContent = r.letters.map((row) => row.letter + " " + row.word).join("  /  ");
  }, DEBOUNCE_MS);
  T.input.addEventListener("input", update);
  // Prime the table render on first mount.
  update();
}

// ====================================================================
// W.8 Fuel consumption planning
// ====================================================================
//
// Required fuel = (flight_time_hr + reserve_hr) * burn_gph. Reserve
// defaults are the 14 CFR 91.151 / 91.167 minimums for non-commercial
// flights: 30 min day VFR, 45 min night VFR or IFR. The tile compares
// required vs tank capacity to flag a no-go up front; weight of fuel
// is computed at 6.0 lb/gal for avgas (100LL nominal) and 6.7 lb/gal
// for jet-A per the FAA Type Certificate Data Sheet conventions.

const FUEL_TYPE_WEIGHTS_LB_PER_GAL = { avgas: 6.0, jet_a: 6.7 };

// dims: in { flight_time_hr: T, burn_gph: L^3 T^-1, reserve_min: T, fuel_type: dimensionless, tank_capacity_gal: L^3 }
//        out: { trip_fuel_gal: L^3, reserve_fuel_gal: L^3, required_fuel_gal: L^3, required_fuel_lb: M L T^-2, fuel_type: dimensionless, reserve_minutes: T, reserve_band: dimensionless, capacity_status: dimensionless }
export function computeFuelPlanning({ flight_time_hr, burn_gph, reserve_min, fuel_type, tank_capacity_gal }) {
  const flight = Number(flight_time_hr);
  const burn = Number(burn_gph);
  const reserveMin = Number(reserve_min);
  const cap = Number(tank_capacity_gal);
  if (!Number.isFinite(flight) || flight <= 0) return { error: "Enter a positive flight time in hours." };
  if (!Number.isFinite(burn) || burn <= 0) return { error: "Enter a positive fuel burn in gallons per hour." };
  if (!Number.isFinite(reserveMin) || reserveMin < 0) return { error: "Reserve must be 0 or more minutes." };
  if (flight > 24) return { error: "Flight time over 24 hr is outside this tile's scope." };
  if (burn > 1000) return { error: "Fuel burn over 1000 gph is outside this tile's scope." };
  const type = String(fuel_type || "avgas").toLowerCase();
  if (!(type in FUEL_TYPE_WEIGHTS_LB_PER_GAL)) return { error: "Fuel type must be avgas or jet_a." };
  const lb_per_gal = FUEL_TYPE_WEIGHTS_LB_PER_GAL[type];
  const reserve_hr = reserveMin / 60;
  const burn_gal_trip = flight * burn;
  const burn_gal_reserve = reserve_hr * burn;
  const required_gal = burn_gal_trip + burn_gal_reserve;
  const required_lb = required_gal * lb_per_gal;
  // 91.151 minimum bands for non-commercial: 30 min day VFR; 45 min night VFR or IFR (91.167).
  let reg_band;
  if (reserveMin < 30) reg_band = "below 14 CFR 91.151 day VFR minimum (30 min)";
  else if (reserveMin < 45) reg_band = "meets 91.151 day VFR (30 min); below 91.167 night VFR / IFR (45 min)";
  else reg_band = "meets 91.167 night VFR / IFR (>= 45 min reserve)";
  let capacity_status = null;
  if (Number.isFinite(cap) && cap > 0) {
    if (required_gal > cap) {
      capacity_status = "EXCEEDS tank capacity by " + fmt(required_gal - cap, 1) + " gal; refuel stop required";
    } else {
      const headroom = cap - required_gal;
      capacity_status = "Within tank capacity (" + fmt(headroom, 1) + " gal headroom)";
    }
  }
  return {
    trip_fuel_gal: burn_gal_trip,
    reserve_fuel_gal: burn_gal_reserve,
    required_fuel_gal: required_gal,
    required_fuel_lb: required_lb,
    fuel_type: type,
    reserve_minutes: reserveMin,
    reserve_band: reg_band,
    capacity_status,
  };
}

export const fuelPlanningExample = {
  inputs: { flight_time_hr: 3.0, burn_gph: 10.5, reserve_min: 45, fuel_type: "avgas", tank_capacity_gal: 50 },
  // Trip 3*10.5 = 31.5 gal; reserve 0.75*10.5 = 7.875 gal; total 39.375 gal; 39.375 * 6.0 = 236.25 lb.
  expected: { required_fuel_gal: 39.375, required_fuel_lb: 236.25 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderFuelPlanning(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Required fuel = (flight_time_hr + reserve_hr) * burn_gph. Fuel weight at 6.0 lb/gal avgas (100LL nominal) and 6.7 lb/gal jet-A. Reserve minimums per 14 CFR 91.151 (30 min day VFR) and 91.167 (45 min night VFR or IFR), non-commercial. Free at ecfr.gov. PIC governs flight planning and is responsible for verifying actual burn against the AFM and adjusting for taxi, climb, headwind, and alternate.";
  const T = makeNumber("Flight time (hours)", "fp-t", { step: "any", min: "0" });
  const B = makeNumber("Fuel burn (gph)", "fp-b", { step: "any", min: "0" });
  const R = makeNumber("Reserve (minutes)", "fp-r", { step: "any", min: "0", value: "45" });
  const F = makeSelect("Fuel type", "fp-f", [
    { value: "avgas", label: "Avgas 100LL (6.0 lb/gal)" },
    { value: "jet_a", label: "Jet-A (6.7 lb/gal)" },
  ]);
  const C = makeNumber("Tank capacity (gal, optional)", "fp-c", { step: "any", min: "0", value: "0" });
  for (const f of [T, B, R, F, C]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    T.input.value = String(fuelPlanningExample.inputs.flight_time_hr);
    B.input.value = String(fuelPlanningExample.inputs.burn_gph);
    R.input.value = String(fuelPlanningExample.inputs.reserve_min);
    F.select.value = fuelPlanningExample.inputs.fuel_type;
    C.input.value = String(fuelPlanningExample.inputs.tank_capacity_gal);
    update();
  });
  const oTrip = makeOutputLine(outputRegion, "Trip fuel (gal)", "fp-out-trip");
  const oRes = makeOutputLine(outputRegion, "Reserve fuel (gal)", "fp-out-res");
  const oReq = makeOutputLine(outputRegion, "Total required (gal)", "fp-out-req");
  const oLb = makeOutputLine(outputRegion, "Total required (lb)", "fp-out-lb");
  const oBand = makeOutputLine(outputRegion, "Regulatory reserve band", "fp-out-band");
  const oCap = makeOutputLine(outputRegion, "Tank capacity check", "fp-out-cap");
  const update = debounce(() => {
    const r = computeFuelPlanning({
      flight_time_hr: T.input.value,
      burn_gph: B.input.value,
      reserve_min: R.input.value,
      fuel_type: F.select.value,
      tank_capacity_gal: C.input.value,
    });
    if (r.error) {
      oTrip.textContent = r.error;
      for (const o of [oRes, oReq, oLb, oBand, oCap]) o.textContent = "-";
      return;
    }
    oTrip.textContent = fmt(r.trip_fuel_gal, 2);
    oRes.textContent = fmt(r.reserve_fuel_gal, 2);
    oReq.textContent = fmt(r.required_fuel_gal, 2);
    oLb.textContent = fmt(r.required_fuel_lb, 1);
    oBand.textContent = r.reserve_band;
    oCap.textContent = r.capacity_status || "-";
  }, DEBOUNCE_MS);
  for (const el of [T.input, B.input, R.input, C.input]) el.addEventListener("input", update);
  F.select.addEventListener("change", update);
}

// ====================================================================
// W.10 Wind triangle / wind correction angle
// ====================================================================
//
// Solve the cruise wind triangle:
//
//   wind_angle_off_course = wind_dir - true_course (normalized to [-180, 180])
//   crosswind_component   = wind_speed * sin(wind_angle_off_course)
//   headwind_component    = wind_speed * cos(wind_angle_off_course)
//   WCA_deg               = asin( crosswind_component / TAS )       (degrees)
//   true_heading_deg      = true_course + WCA   (normalized to [0, 360))
//   ground_speed_kt       = TAS * cos(WCA*pi/180) - headwind_component
//                                                  (i.e. TAS along course minus headwind)
//
// The "asin" form is the standard E6B / Jeppesen private pilot
// derivation and is exact within the small-angle regime where
// |crosswind| <= TAS; if the crosswind exceeds TAS the wind triangle
// has no solution (the aircraft cannot hold course).

// dims: in { true_course_deg: dimensionless, true_airspeed_kt: L T^-1, wind_direction_deg: dimensionless, wind_speed_kt: L T^-1 }
//        out: { wind_angle_off_course_deg: dimensionless, crosswind_component_kt: L T^-1, headwind_component_kt: L T^-1, wca_deg: dimensionless, true_heading_deg: dimensionless, ground_speed_kt: L T^-1, wca_flag: dimensionless }
export function computeWindTriangle({ true_course_deg, true_airspeed_kt, wind_direction_deg, wind_speed_kt }) {
  const TC = Number(true_course_deg);
  const TAS = Number(true_airspeed_kt);
  const WD = Number(wind_direction_deg);
  const WS = Number(wind_speed_kt);
  if (!Number.isFinite(TC) || TC < 0 || TC >= 360) return { error: "True course must be 0 to 359.9 deg." };
  if (!Number.isFinite(TAS) || TAS <= 0) return { error: "True airspeed must be positive (kt)." };
  if (!Number.isFinite(WD) || WD < 0 || WD >= 360) return { error: "Wind direction must be 0 to 359.9 deg." };
  if (!Number.isFinite(WS) || WS < 0 || WS > 200) return { error: "Wind speed must be 0 to 200 kt." };
  const angle = normalizeAngleDeg(WD - TC);
  const rad = (angle * Math.PI) / 180;
  const crosswind = WS * Math.sin(rad);
  const headwind = WS * Math.cos(rad);
  if (Math.abs(crosswind) >= TAS) {
    return { error: "Crosswind component (" + fmt(Math.abs(crosswind), 1) + " kt) is equal to or exceeds TAS; the wind triangle has no solution. Pick a higher TAS or wait for the wind to drop." };
  }
  const wca_rad = Math.asin(crosswind / TAS);
  const wca_deg = (wca_rad * 180) / Math.PI;
  let true_heading = TC + wca_deg;
  true_heading = ((true_heading % 360) + 360) % 360;
  const gs = TAS * Math.cos(wca_rad) - headwind;
  let wca_flag = null;
  if (Math.abs(wca_deg) > 30) wca_flag = "very large WCA (> 30 deg); verify inputs";
  else if (Math.abs(wca_deg) > 15) wca_flag = "large WCA (> 15 deg)";
  return {
    wind_angle_off_course_deg: angle,
    crosswind_component_kt: crosswind,
    headwind_component_kt: headwind,
    wca_deg,
    true_heading_deg: true_heading,
    ground_speed_kt: gs,
    wca_flag,
  };
}

export const windTriangleExample = {
  // TC 090, TAS 120 kt, wind from 040 at 25 kt.
  // angle = 040 - 090 = -50 deg.
  // crosswind = 25 * sin(-50) = -19.151 (from left).
  // headwind  = 25 * cos(-50) = 16.070.
  // WCA = asin(-19.151 / 120) = asin(-0.1596) = -9.18 deg.
  // TH = 090 + (-9.18) = 080.82.
  // GS = 120 * cos(-9.18 deg) - 16.07 = 118.46 - 16.07 = 102.39.
  inputs: { true_course_deg: 90, true_airspeed_kt: 120, wind_direction_deg: 40, wind_speed_kt: 25 },
  expected: { wca_deg: -9.18, true_heading_deg: 80.82, ground_speed_kt: 102.39 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderWindTriangle(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Wind triangle / wind correction angle per the FAA Pilot's Handbook of Aeronautical Knowledge (FAA-H-8083-25C) Chapter 16 and any E6B reference. crosswind = WS*sin(WD-TC); WCA = asin(crosswind / TAS); ground speed = TAS*cos(WCA) - headwind. PIC governs; wind aloft changes with altitude and time, verify against actual track at every checkpoint.";
  const TC = makeNumber("True course (deg, 0-359)", "wt-tc", { step: "any", min: "0", max: "359" });
  const TAS = makeNumber("True airspeed (kt)", "wt-tas", { step: "any", min: "0" });
  const WD = makeNumber("Wind direction (deg from, 0-359)", "wt-wd", { step: "any", min: "0", max: "359" });
  const WS = makeNumber("Wind speed (kt)", "wt-ws", { step: "any", min: "0", max: "200" });
  for (const f of [TC, TAS, WD, WS]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    TC.input.value = String(windTriangleExample.inputs.true_course_deg);
    TAS.input.value = String(windTriangleExample.inputs.true_airspeed_kt);
    WD.input.value = String(windTriangleExample.inputs.wind_direction_deg);
    WS.input.value = String(windTriangleExample.inputs.wind_speed_kt);
    update();
  });
  const oAngle = makeOutputLine(outputRegion, "Wind angle off course (deg)", "wt-out-angle");
  const oCW = makeOutputLine(outputRegion, "Crosswind component (kt, +right / -left)", "wt-out-cw");
  const oHW = makeOutputLine(outputRegion, "Headwind component (kt, + = headwind)", "wt-out-hw");
  const oWCA = makeOutputLine(outputRegion, "Wind correction angle (deg, + = right of course)", "wt-out-wca");
  const oTH = makeOutputLine(outputRegion, "True heading (deg)", "wt-out-th");
  const oGS = makeOutputLine(outputRegion, "Ground speed (kt)", "wt-out-gs");
  const oFlag = makeOutputLine(outputRegion, "Note", "wt-out-flag");
  const update = debounce(() => {
    const r = computeWindTriangle({
      true_course_deg: TC.input.value,
      true_airspeed_kt: TAS.input.value,
      wind_direction_deg: WD.input.value,
      wind_speed_kt: WS.input.value,
    });
    if (r.error) {
      oAngle.textContent = r.error;
      for (const o of [oCW, oHW, oWCA, oTH, oGS, oFlag]) o.textContent = "-";
      return;
    }
    oAngle.textContent = fmt(r.wind_angle_off_course_deg, 1);
    oCW.textContent = (r.crosswind_component_kt >= 0 ? "+" : "") + fmt(r.crosswind_component_kt, 1);
    oHW.textContent = (r.headwind_component_kt >= 0 ? "+" : "") + fmt(r.headwind_component_kt, 1);
    oWCA.textContent = (r.wca_deg >= 0 ? "+" : "") + fmt(r.wca_deg, 2);
    oTH.textContent = fmt(r.true_heading_deg, 1);
    oGS.textContent = fmt(r.ground_speed_kt, 1);
    oFlag.textContent = r.wca_flag || "-";
  }, DEBOUNCE_MS);
  for (const el of [TC.input, TAS.input, WD.input, WS.input]) el.addEventListener("input", update);
}

// ====================================================================
// W.16 Top-of-descent (3-to-1 rule)
// ====================================================================
//
// The pilot's rule of thumb for a comfortable cabin-pressure-friendly
// descent: 3 nm of horizontal distance per 1000 ft of altitude to lose.
// At a typical GA cruise of 120 kt that gives a 500 ft/min descent;
// at jet cruise of 240 kt the same 3:1 yields 1200 ft/min, which is
// also the standard ATC-friendly descent rate.
//
//   altitude_to_lose_ft  = cruise_alt - target_alt
//   distance_nm          = altitude_to_lose_ft / 1000 * 3
//   descent_rate_fpm     = ground_speed_kt * 1000 / (60 * 3)
//                        = ground_speed_kt * 5.555...
//   time_min             = altitude_to_lose_ft / descent_rate_fpm

// dims: in { cruise_altitude_ft: L, target_altitude_ft: L, ground_speed_kt: L T^-1 }
//        out: { altitude_to_lose_ft: L, distance_to_start_nm: L, descent_rate_fpm: L T^-1, time_to_descend_min: T, rate_band: dimensionless }
export function computeTopOfDescent({ cruise_altitude_ft, target_altitude_ft, ground_speed_kt }) {
  const cruise = Number(cruise_altitude_ft);
  const target = Number(target_altitude_ft);
  const gs = Number(ground_speed_kt);
  if (!Number.isFinite(cruise)) return { error: "Enter cruise altitude in feet." };
  if (!Number.isFinite(target)) return { error: "Enter target altitude in feet." };
  if (!Number.isFinite(gs) || gs <= 0) return { error: "Ground speed must be positive (kt)." };
  if (cruise <= target) return { error: "Cruise altitude must be above the target altitude." };
  if (cruise < -2000 || cruise > 60000 || target < -2000 || target > 60000) {
    return { error: "Altitudes must be between -2000 and 60000 ft." };
  }
  if (gs > 600) return { error: "Ground speed over 600 kt is outside this tile's scope." };
  const alt_to_lose = cruise - target;
  const distance_nm = (alt_to_lose / 1000) * 3;
  const descent_rate_fpm = (gs * 1000) / (60 * 3);
  const time_min = alt_to_lose / descent_rate_fpm;
  let rate_band;
  if (descent_rate_fpm < 500) rate_band = "below 500 fpm (gentle); passengers comfortable";
  else if (descent_rate_fpm < 1000) rate_band = "500 to 1000 fpm (standard GA descent)";
  else if (descent_rate_fpm < 1500) rate_band = "1000 to 1500 fpm (typical jet descent / ATC profile)";
  else rate_band = "above 1500 fpm (steep; expect ear-pop discomfort)";
  return {
    altitude_to_lose_ft: alt_to_lose,
    distance_to_start_nm: distance_nm,
    descent_rate_fpm,
    time_to_descend_min: time_min,
    rate_band,
  };
}

export const topOfDescentExample = {
  // FL350 -> 5000 ft target at 240 kt: lose 30,000 ft -> 90 nm; rate
  // 240*5.5556 = 1333.33 fpm; time 30000/1333.33 = 22.5 min.
  inputs: { cruise_altitude_ft: 35000, target_altitude_ft: 5000, ground_speed_kt: 240 },
  expected: { distance_to_start_nm: 90, descent_rate_fpm: 1333.33, time_to_descend_min: 22.5 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderTopOfDescent(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: 3-to-1 rule of thumb. distance_nm = (altitude_to_lose_ft / 1000) * 3. Descent rate matched to ground speed via 1000 ft / 3 nm; in fpm = GS * 1000 / (60 * 3) = GS * 5.556. Pilot rule of thumb taught in any private-pilot text and the FAA Instrument Flying Handbook (FAA-H-8083-15B). PIC governs; the AFM may dictate a different profile and ATC may require a specific crossing restriction.";
  const CR = makeNumber("Cruise altitude (ft)", "tod-cr", { step: "any" });
  const TG = makeNumber("Target altitude at descent end (ft)", "tod-tg", { step: "any" });
  const GS = makeNumber("Ground speed (kt)", "tod-gs", { step: "any", min: "0" });
  for (const f of [CR, TG, GS]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    CR.input.value = String(topOfDescentExample.inputs.cruise_altitude_ft);
    TG.input.value = String(topOfDescentExample.inputs.target_altitude_ft);
    GS.input.value = String(topOfDescentExample.inputs.ground_speed_kt);
    update();
  });
  const oLose = makeOutputLine(outputRegion, "Altitude to lose (ft)", "tod-out-lose");
  const oDist = makeOutputLine(outputRegion, "Distance to start descent (nm)", "tod-out-dist");
  const oRate = makeOutputLine(outputRegion, "Descent rate (fpm)", "tod-out-rate");
  const oTime = makeOutputLine(outputRegion, "Time to descend (min)", "tod-out-time");
  const oBand = makeOutputLine(outputRegion, "Rate band", "tod-out-band");
  const update = debounce(() => {
    const r = computeTopOfDescent({
      cruise_altitude_ft: CR.input.value,
      target_altitude_ft: TG.input.value,
      ground_speed_kt: GS.input.value,
    });
    if (r.error) {
      oLose.textContent = r.error;
      for (const o of [oDist, oRate, oTime, oBand]) o.textContent = "-";
      return;
    }
    oLose.textContent = fmt(r.altitude_to_lose_ft, 0);
    oDist.textContent = fmt(r.distance_to_start_nm, 1);
    oRate.textContent = fmt(r.descent_rate_fpm, 0);
    oTime.textContent = fmt(r.time_to_descend_min, 1);
    oBand.textContent = r.rate_band;
  }, DEBOUNCE_MS);
  for (const el of [CR.input, TG.input, GS.input]) el.addEventListener("input", update);
}

// ====================================================================
// W.13 Aviation weather phrasing reference (METAR / TAF abbreviations)
// ====================================================================
//
// Reference render: the most common METAR / TAF abbreviations
// (cloud-cover codes, intensity prefixes, descriptor codes,
// weather phenomena) so a pilot or briefer can decode a raw
// observation without a chart. Per the FAA Aviation Weather
// Services Advisory Circular AC 00-45H Change 2 and the NWS METAR
// / TAF format specification (NWS Instruction 10-813).

const WX_CLOUD_COVER = [
  ["SKC", "Sky clear (manual observation; no clouds detected)"],
  ["CLR", "Clear below 12,000 ft (automated observation; AO2)"],
  ["FEW", "Few: 1/8 to 2/8 cloud cover"],
  ["SCT", "Scattered: 3/8 to 4/8 cloud cover"],
  ["BKN", "Broken: 5/8 to 7/8 cloud cover (a ceiling)"],
  ["OVC", "Overcast: 8/8 cloud cover (a ceiling)"],
  ["VV",  "Vertical visibility (sky obscured); height in hundreds of ft"],
];

const WX_INTENSITY = [
  ["-", "Light"],
  ["",  "Moderate (no prefix)"],
  ["+", "Heavy"],
  ["VC", "In the vicinity (5 to 10 sm from the station)"],
];

const WX_DESCRIPTOR = [
  ["MI", "Shallow"],
  ["BC", "Patches"],
  ["PR", "Partial"],
  ["DR", "Low drifting"],
  ["BL", "Blowing"],
  ["SH", "Showers"],
  ["TS", "Thunderstorm"],
  ["FZ", "Freezing"],
];

const WX_PHENOMENA = [
  ["RA", "Rain"], ["SN", "Snow"], ["DZ", "Drizzle"], ["GR", "Hail"],
  ["GS", "Small hail / snow pellets"], ["PL", "Ice pellets"],
  ["IC", "Ice crystals"], ["UP", "Unknown precipitation (automated)"],
  ["BR", "Mist (visibility 5/8 to 6 sm)"], ["FG", "Fog (vis < 5/8 sm)"],
  ["FU", "Smoke"], ["HZ", "Haze"], ["DU", "Widespread dust"],
  ["SA", "Sand"], ["PY", "Spray"],
  ["SQ", "Squalls"], ["FC", "Funnel cloud / tornado / waterspout"],
  ["SS", "Sandstorm"], ["DS", "Duststorm"],
];

const WX_RVR_NOTE = "RVR (Runway Visual Range) reported in hundreds of ft for the named runway. Format: R<runway>/<rvr>FT, with M prefix for 'less than' and P prefix for 'more than' (e.g., R09L/M0600FT = RVR less than 600 ft).";

// dims: in { } out: { cloud_cover: dimensionless, intensity: dimensionless, descriptor: dimensionless, phenomena: dimensionless, rvr_note: dimensionless }
// (Reference table; METAR / TAF abbreviation strings are categorical.)
export function computeWeatherPhrasing() {
  return {
    cloud_cover: WX_CLOUD_COVER.map(([code, meaning]) => ({ code, meaning })),
    intensity: WX_INTENSITY.map(([code, meaning]) => ({ code, meaning })),
    descriptor: WX_DESCRIPTOR.map(([code, meaning]) => ({ code, meaning })),
    phenomena: WX_PHENOMENA.map(([code, meaning]) => ({ code, meaning })),
    rvr_note: WX_RVR_NOTE,
  };
}

export const weatherPhrasingExample = {
  inputs: {},
  expected: { cloud_cover_count: 7, phenomena_count: 19 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderWeatherPhrasing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: FAA Aviation Weather Services (AC 00-45H Change 2). NWS Instruction 10-813 (Surface Weather Observations - METAR). FAA Aeronautical Information Manual §7-1-31 (METAR / TAF decoding). Free at faa.gov and weather.gov.";
  const r = computeWeatherPhrasing();
  const oCloud = makeOutputLine(outputRegion, "Cloud cover", "wxp-out-cloud");
  const oInt = makeOutputLine(outputRegion, "Intensity prefix", "wxp-out-int");
  const oDesc = makeOutputLine(outputRegion, "Descriptor", "wxp-out-desc");
  const oPhen = makeOutputLine(outputRegion, "Weather phenomena", "wxp-out-phen");
  const oRVR = makeOutputLine(outputRegion, "RVR encoding", "wxp-out-rvr");
  attachExampleButton(inputRegion, () => { /* nothing to seed; static render. */ });
  oCloud.textContent = r.cloud_cover.map((c) => c.code + " - " + c.meaning).join("  |  ");
  oInt.textContent = r.intensity.map((c) => (c.code === "" ? "(no prefix)" : c.code) + " - " + c.meaning).join("  |  ");
  oDesc.textContent = r.descriptor.map((c) => c.code + " - " + c.meaning).join("  |  ");
  oPhen.textContent = r.phenomena.map((c) => c.code + " - " + c.meaning).join("  |  ");
  oRVR.textContent = r.rvr_note;
}

// ====================================================================
// W.14 Transponder code reference
// ====================================================================
//
// The four reserved codes every pilot memorizes, plus VFR 1200,
// per FAA Aeronautical Information Manual §4-1-20 ("Transponder
// Operation") and 14 CFR §91.215. The "ident" reserved and military
// intercept codes are also surfaced.

const TRANSPONDER_CODES = [
  { code: "1200", meaning: "VFR cruise (continental US, below FL180; Class G / E without ATC assignment)" },
  { code: "1201", meaning: "VFR cruise (vicinity of Grand Canyon special-area airspace)" },
  { code: "1202", meaning: "VFR glider operations (no transponder mandate for gliders below 18,000 ft MSL)" },
  { code: "7500", meaning: "EMERGENCY: hijacking / unlawful interference. Squawk only if it can be done covertly." },
  { code: "7600", meaning: "EMERGENCY: lost two-way communications (radio failure)." },
  { code: "7700", meaning: "EMERGENCY: any in-flight emergency. ATC alerts immediately." },
  { code: "7777", meaning: "Reserved: military intercept (do NOT squawk; ATC-assigned only)." },
  { code: "0000", meaning: "Reserved: discrete; do NOT squawk unless specifically assigned by ATC." },
];

// dims: in { code: dimensionless } out: { codes: dimensionless, lookup: dimensionless }
// (Reference / lookup tile; four-digit octal squawk codes are categorical.)
export function computeTransponderCodes({ code }) {
  if (typeof code === "string" && code.length > 0) {
    const c = code.trim();
    const match = TRANSPONDER_CODES.find((row) => row.code === c);
    if (/^\d{4}$/.test(c) === false) return { codes: TRANSPONDER_CODES, lookup: { code: c, status: "Not a four-digit octal squawk code (each digit must be 0-7)." } };
    if (/[89]/.test(c)) return { codes: TRANSPONDER_CODES, lookup: { code: c, status: "Octal only: each digit must be 0-7. A transponder cannot dial '" + c + "'." } };
    return {
      codes: TRANSPONDER_CODES,
      lookup: { code: c, status: match ? match.meaning : "ATC-assigned discrete code. Verify against the assignment readback." },
    };
  }
  return { codes: TRANSPONDER_CODES, lookup: null };
}

export const transponderExample = {
  inputs: { code: "7700" },
  expected: { lookup_status_contains: "EMERGENCY" },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderTransponderCodes(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: FAA Aeronautical Information Manual §4-1-20 (Transponder Operation) and §6-2-2 (Emergency Codes). 14 CFR §91.215 (ATC transponder and altitude reporting). Free at faa.gov and ecfr.gov.";
  const C = makeText("Look up a code (optional)", "xp-c", { placeholder: "e.g. 1200, 7500, 7600, 7700" });
  inputRegion.appendChild(C.wrap);
  attachExampleButton(inputRegion, () => { C.input.value = transponderExample.inputs.code; update(); });
  const oLookup = makeOutputLine(outputRegion, "Lookup", "xp-out-lookup");
  const oList = makeOutputLine(outputRegion, "Reserved / VFR codes", "xp-out-list");
  const update = debounce(() => {
    const r = computeTransponderCodes({ code: C.input.value || "" });
    oLookup.textContent = r.lookup ? r.lookup.code + ": " + r.lookup.status : "(enter a four-digit code above)";
    oList.textContent = r.codes.map((row) => row.code + " - " + row.meaning).join("  |  ");
  }, DEBOUNCE_MS);
  C.input.addEventListener("input", update);
  update();
}

// ====================================================================
// W.15 Standard turn rate, rate of climb, rate of descent
// ====================================================================
//
// Standard rate ("Rate One") turn: 3 deg/sec, completing a 360 in
// 2 min. The published rule-of-thumb bank angle for a standard rate
// turn at a given TAS is (TAS_kt / 10) + 7 (FAA Instrument Flying
// Handbook FAA-H-8083-15B Chapter 5). The exact formula via radius:
// bank = atan(V^2 / (g * r)) for a constant-altitude coordinated turn.
// We expose both: the FAA rule of thumb and the published exact value.
//
// Climb / descent rate from groundspeed and gradient:
//   gradient_ft_per_nm = alt_change_ft / distance_nm
//   rate_fpm = GS_kt * gradient_ft_per_nm / 60
// (One nm at 1 kt takes 60 seconds, so 1 ft/nm at 1 kt = 1/60 fpm.)

const G_FT_PER_SEC2 = 32.17405;

// dims: in { true_airspeed_kt: L T^-1, ground_speed_kt: L T^-1, altitude_change_ft: L, distance_nm: L, turn_through_deg: dimensionless }
//        out: { standard_turn_rate_deg_per_sec: dimensionless, bank_rule_of_thumb_deg: dimensionless, bank_exact_deg: dimensionless, time_for_360_min: T, time_to_turn_through_sec: T, gradient_ft_per_nm: dimensionless, rate_fpm: L T^-1 }
export function computeStandardTurn({ true_airspeed_kt, ground_speed_kt, altitude_change_ft, distance_nm, turn_through_deg }) {
  const tas = Number(true_airspeed_kt);
  const gs = Number(ground_speed_kt);
  const dAlt = Number(altitude_change_ft);
  const dist = Number(distance_nm);
  const turn = Number(turn_through_deg);
  const out = {};
  // DR-19 (D-4/C-7): an out-of-range value in one input block must suppress
  // only that block's outputs and flag it, not discard the whole tile's
  // otherwise-valid turn-time and climb-rate outputs.
  const flags = [];
  if (Number.isFinite(tas) && tas > 0) {
    if (tas > 600) {
      flags.push("TAS above 600 kt: bank-angle outputs suppressed; standard-rate turn is limited to 1.5 deg/sec above 250 kt by FAA / ICAO Mach-limit convention.");
    } else {
      out.standard_turn_rate_deg_per_sec = 3;
      out.bank_rule_of_thumb_deg = (tas / 10) + 7;
      // Exact: tan(bank) = V * omega / g where V is TAS in ft/sec and omega is 3 deg/sec in rad/sec.
      const v_fps = tas * 1.68781;
      const omega_rad_per_sec = (3 * Math.PI) / 180;
      out.bank_exact_deg = (Math.atan((v_fps * omega_rad_per_sec) / G_FT_PER_SEC2) * 180) / Math.PI;
      out.time_for_360_min = 2;
    }
  }
  if (Number.isFinite(turn) && turn > 0) {
    if (turn > 360) flags.push("Turn-through-degrees above 360: turn-time output suppressed; enter a value 0 to 360.");
    else out.time_to_turn_through_sec = turn / 3;
  }
  if (Number.isFinite(dAlt) && Number.isFinite(dist) && dist > 0) {
    if (Math.abs(dAlt) > 50000) {
      flags.push("Altitude change above 50,000 ft: climb/descent outputs suppressed; verify.");
    } else {
      const gradient = dAlt / dist;
      out.gradient_ft_per_nm = gradient;
      if (Number.isFinite(gs) && gs > 0) {
        out.rate_fpm = (gs * gradient) / 60;
      }
    }
  }
  if (Object.keys(out).length === 0 && flags.length === 0) {
    return { error: "Enter TAS (for bank angle) and/or turn-through-degrees (for turn time) and/or altitude-change + distance (+ GS) for climb / descent rate." };
  }
  if (flags.length) out.flags = flags;
  return out;
}

export const standardTurnExample = {
  inputs: { true_airspeed_kt: 120, ground_speed_kt: 120, altitude_change_ft: 3000, distance_nm: 10, turn_through_deg: 90 },
  // Bank rule of thumb = 120/10 + 7 = 19 deg.
  // Time to turn 90 deg = 90 / 3 = 30 sec.
  // Gradient = 3000 / 10 = 300 ft/nm. Rate = 120 * 300 / 60 = 600 fpm.
  expected: { bank_rule_of_thumb_deg: 19, time_to_turn_through_sec: 30, rate_fpm: 600 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderStandardTurn(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: FAA Instrument Flying Handbook (FAA-H-8083-15B) Chapter 5 (Flight Instruments). Pilot's Handbook of Aeronautical Knowledge (FAA-H-8083-25C) Chapter 5 (Aerodynamics of Flight). Standard rate turn = 3 deg/sec; bank rule of thumb = (TAS/10) + 7. The exact bank uses g and the angular rate. Pure deterministic math; PIC and the AFM govern.";
  const TAS = makeNumber("True airspeed (kt)", "st-tas", { step: "any", min: "0" });
  const GS = makeNumber("Groundspeed for climb/descent rate (kt, optional)", "st-gs", { step: "any", min: "0", value: "0" });
  const DA = makeNumber("Altitude change (ft, optional, climb +; descent -)", "st-da", { step: "any", value: "0" });
  const D = makeNumber("Distance over which to climb/descend (nm, optional)", "st-d", { step: "any", min: "0", value: "0" });
  const T = makeNumber("Turn through (deg, optional)", "st-t", { step: "any", min: "0", max: "360", value: "0" });
  for (const f of [TAS, GS, DA, D, T]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    TAS.input.value = String(standardTurnExample.inputs.true_airspeed_kt);
    GS.input.value = String(standardTurnExample.inputs.ground_speed_kt);
    DA.input.value = String(standardTurnExample.inputs.altitude_change_ft);
    D.input.value = String(standardTurnExample.inputs.distance_nm);
    T.input.value = String(standardTurnExample.inputs.turn_through_deg);
    update();
  });
  const oBankROT = makeOutputLine(outputRegion, "Bank for std rate, rule of thumb (deg)", "st-out-brot");
  const oBankExact = makeOutputLine(outputRegion, "Bank for std rate, exact (deg)", "st-out-bex");
  const o360 = makeOutputLine(outputRegion, "Time for 360 (min)", "st-out-360");
  const oTurn = makeOutputLine(outputRegion, "Time to turn through (sec)", "st-out-turn");
  const oGrad = makeOutputLine(outputRegion, "Gradient (ft / nm)", "st-out-grad");
  const oRate = makeOutputLine(outputRegion, "Climb / descent rate (fpm)", "st-out-rate");
  const update = debounce(() => {
    const r = computeStandardTurn({
      true_airspeed_kt: TAS.input.value, ground_speed_kt: GS.input.value,
      altitude_change_ft: DA.input.value, distance_nm: D.input.value,
      turn_through_deg: T.input.value,
    });
    if (r.error) {
      oBankROT.textContent = r.error;
      for (const o of [oBankExact, o360, oTurn, oGrad, oRate]) o.textContent = "-";
      return;
    }
    oBankROT.textContent = r.bank_rule_of_thumb_deg != null ? fmt(r.bank_rule_of_thumb_deg, 1) : (r.flags && r.flags.length ? r.flags.join(" ") : "-");
    oBankExact.textContent = r.bank_exact_deg != null ? fmt(r.bank_exact_deg, 2) : "-";
    o360.textContent = r.time_for_360_min != null ? fmt(r.time_for_360_min, 1) : "-";
    oTurn.textContent = r.time_to_turn_through_sec != null ? fmt(r.time_to_turn_through_sec, 1) : "-";
    oGrad.textContent = r.gradient_ft_per_nm != null ? fmt(r.gradient_ft_per_nm, 1) : "-";
    oRate.textContent = r.rate_fpm != null ? fmt(r.rate_fpm, 0) : "-";
  }, DEBOUNCE_MS);
  for (const el of [TAS.input, GS.input, DA.input, D.input, T.input]) el.addEventListener("input", update);
}

// ====================================================================
// W.2 True airspeed from CAS / pressure altitude / OAT
// ====================================================================
//
// Standard E6B identity: TAS = CAS / sqrt(rho / rho_sl), where the
// density ratio is computed from the ICAO Standard Atmosphere via
// the density altitude. We use:
//
//   ISA_C  = 15 - 1.98 * (PA / 1000)
//   DA_ft  = PA + 120 * (OAT_C - ISA_C)
//   rho_ratio = (1 - DA_ft / 145442)^4.2561
//   TAS    = CAS / sqrt(rho_ratio)
//
// Constant 145442 ft is the ISA reference height where rho -> 0;
// exponent 4.2561 is g * M / (R * L) - 1 in the ISA model. The
// resulting TAS agrees with an E6B wheel reading to within 1-2 kt
// up to ~30,000 ft for normal GA / turbine cruise; the FAA PHAK
// rule of thumb (2% per 1000 ft + 1% per 10 C above ISA) is a
// reasonable mental cross-check.

// dims: in { cas_kt: L T^-1, pressure_altitude_ft: L, oat_c: T }
//        out: { tas_kt: L T^-1, density_altitude_ft: L, density_ratio: dimensionless, isa_deviation_c: T, mach: dimensionless }
export function computeTrueAirspeed({ cas_kt, pressure_altitude_ft, oat_c }) {
  const CAS = Number(cas_kt);
  const PA = Number(pressure_altitude_ft);
  const OAT = Number(oat_c);
  if (!Number.isFinite(CAS) || CAS <= 0) return { error: "Enter a positive CAS in knots." };
  if (!Number.isFinite(PA) || PA < -2000 || PA > 60000) return { error: "Pressure altitude must be between -2000 and 60000 ft." };
  if (!Number.isFinite(OAT) || OAT < -80 || OAT > 60) return { error: "OAT must be between -80 and 60 degrees C." };
  const isa_c = 15 - 1.98 * (PA / 1000);
  const isa_dev = OAT - isa_c;
  const da = PA + 120 * isa_dev;
  // Density ratio from density altitude (ISA model).
  const rho_ratio = Math.pow(1 - da / 145442, 4.2561);
  if (rho_ratio <= 0) return { error: "Density altitude exceeds ISA model validity; verify inputs." };
  const tas = CAS / Math.sqrt(rho_ratio);
  // Mach number at TAS, where the speed of sound a = 661.4787 * sqrt(T_K / 288.15) kt
  // (standard ISA speed of sound at sea level is ~661.5 kt).
  const T_K = OAT + 273.15;
  const a_kt = 661.4787 * Math.sqrt(T_K / 288.15);
  const mach = tas / a_kt;
  return {
    tas_kt: tas,
    density_altitude_ft: da,
    density_ratio: rho_ratio,
    isa_deviation_c: isa_dev,
    mach,
  };
}

export const trueAirspeedExample = {
  inputs: { cas_kt: 110, pressure_altitude_ft: 8000, oat_c: 0 },
  // ISA at 8000 = 15 - 1.98*8 = -0.84 C. Dev = 0 - (-0.84) = 0.84.
  // DA = 8000 + 120*0.84 = 8100.8.
  // rho_ratio = (1 - 8100.8/145442)^4.2561 = (0.94428)^4.2561 = exp(4.2561 * ln(0.94428))
  //           = exp(4.2561 * -0.05733) = exp(-0.24398) = 0.7836.
  // TAS = 110 / sqrt(0.7836) = 110 / 0.8852 = 124.27 kt.
  expected: { tas_kt_approx: 124.27 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderTrueAirspeed(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: ICAO Standard Atmosphere model. FAA Pilot's Handbook of Aeronautical Knowledge (FAA-H-8083-25C) Chapter 11 (Aircraft Performance) for the TAS identity and the 2% per 1000 ft rule of thumb. The 145442 ft / 4.2561 exponent are the ISA model constants. POH performance section governs the aircraft-specific TAS schedule.";
  const CAS = makeNumber("Calibrated airspeed (kt)", "tas-cas", { step: "any", min: "0" });
  const PA = makeNumber("Pressure altitude (ft)", "tas-pa", { step: "any" });
  const OAT = makeNumber("Outside air temperature (C)", "tas-oat", { step: "any" });
  for (const f of [CAS, PA, OAT]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    CAS.input.value = String(trueAirspeedExample.inputs.cas_kt);
    PA.input.value = String(trueAirspeedExample.inputs.pressure_altitude_ft);
    OAT.input.value = String(trueAirspeedExample.inputs.oat_c);
    update();
  });
  const oTAS = makeOutputLine(outputRegion, "True airspeed (kt)", "tas-out-tas");
  const oDA = makeOutputLine(outputRegion, "Density altitude (ft)", "tas-out-da");
  const oRho = makeOutputLine(outputRegion, "Density ratio (rho / rho_sl)", "tas-out-rho");
  const oMach = makeOutputLine(outputRegion, "Mach number", "tas-out-mach");
  const update = debounce(() => {
    const r = computeTrueAirspeed({ cas_kt: CAS.input.value, pressure_altitude_ft: PA.input.value, oat_c: OAT.input.value });
    if (r.error) {
      oTAS.textContent = r.error;
      for (const o of [oDA, oRho, oMach]) o.textContent = "-";
      return;
    }
    oTAS.textContent = fmt(r.tas_kt, 1);
    oDA.textContent = fmt(r.density_altitude_ft, 0);
    oRho.textContent = fmt(r.density_ratio, 4);
    oMach.textContent = fmt(r.mach, 3);
  }, DEBOUNCE_MS);
  for (const el of [CAS.input, PA.input, OAT.input]) el.addEventListener("input", update);
}

// ====================================================================
// W.17 Sectional chart symbology reference
// ====================================================================
//
// Reference render of the most-used sectional / TAC symbols per the
// FAA Aeronautical Chart User's Guide. Pilot kneeboard aid; the
// chart legend and the most current edition of the Chart User's
// Guide are the source of record.

const SECTIONAL_SYMBOLS = [
  { category: "Airports",
    items: [
      { sym: "Solid blue / magenta circle", meaning: "Hard-surfaced runway 1500 to 8069 ft (blue: control tower); >= 8069 ft uses runway-shape outline." },
      { sym: "Magenta circle outline", meaning: "Airport without control tower; runway < 1500 ft or no hard surface." },
      { sym: "R inside the airport symbol", meaning: "Restricted (private / military / closed)." },
      { sym: "ATC tower (CT) plus 121.6", meaning: "Tower frequency printed next to airport name with 'CT-'." },
      { sym: "Star above airport symbol", meaning: "Rotating beacon operates sunset to sunrise." },
    ],
  },
  { category: "Airspace",
    items: [
      { sym: "Solid blue line", meaning: "Class B (controlled, surface to ~10,000 MSL; clearance required)." },
      { sym: "Solid magenta line", meaning: "Class C (controlled, surface or 1200-4000 AGL; two-way radio required)." },
      { sym: "Dashed blue line", meaning: "Class D (control tower; surface to ~2500 AGL; two-way radio required)." },
      { sym: "Magenta shaded ring", meaning: "Class E starts at 700 ft AGL within the ring." },
      { sym: "Blue shaded ring", meaning: "Class E starts at 1200 ft AGL within the ring." },
      { sym: "Dashed magenta line", meaning: "Class E surface area (typically around a non-towered IFR-equipped airport)." },
      { sym: "Blue / magenta tick boundary", meaning: "Class G (uncontrolled) outside any other depicted boundary." },
    ],
  },
  { category: "Special Use Airspace",
    items: [
      { sym: "P-### (blue hatched)",  meaning: "Prohibited area." },
      { sym: "R-### (blue hatched)",  meaning: "Restricted area; check NOTAMs / charts for activation." },
      { sym: "MOA (magenta hatched)", meaning: "Military Operations Area; VFR transit advisable to monitor / contact ATC." },
      { sym: "W-### (blue hatched)",  meaning: "Warning area (offshore)." },
      { sym: "A-### (blue hatched)",  meaning: "Alert area; high-volume training." },
    ],
  },
  { category: "Obstructions / Terrain",
    items: [
      { sym: "Tower symbol (chimney shape)",  meaning: "Obstruction; bold number = top elevation MSL; small italic = AGL." },
      { sym: "Tower with lightning bolts",    meaning: "Lighted obstruction." },
      { sym: "Group of towers",                meaning: "Tower farm / wind turbines." },
      { sym: "Maximum elevation figure (MEF)", meaning: "Per-quadrangle highest terrain + obstruction figure (hundreds of ft MSL); add buffer before crossing." },
    ],
  },
  { category: "Navigation",
    items: [
      { sym: "Compass rose around VOR",            meaning: "VOR station; rose oriented to magnetic north of the date shown." },
      { sym: "Hexagon over a square",              meaning: "VORTAC (VOR + military TACAN)." },
      { sym: "Hexagon",                            meaning: "VOR-DME." },
      { sym: "Triangle within compass rose",       meaning: "NDB (Non-directional beacon)." },
      { sym: "Solid airway line (V-/T- route)",    meaning: "Victor airway (low) or Tango / Q airway (high)." },
    ],
  },
];

// dims: in { category: dimensionless } out: { categories: dimensionless, selected: dimensionless }
// (Reference table; FAA Aeronautical Chart User's Guide symbol categories are categorical.)
export function computeSectionalSymbols({ category }) {
  if (category == null || category === "") {
    return { categories: SECTIONAL_SYMBOLS, selected: null };
  }
  const key = String(category).trim().toLowerCase();
  const row = SECTIONAL_SYMBOLS.find((c) => c.category.toLowerCase() === key);
  if (!row) return { error: "Category must be one of: " + SECTIONAL_SYMBOLS.map((c) => c.category).join(", ") + "." };
  return { categories: SECTIONAL_SYMBOLS, selected: row };
}

export const sectionalExample = {
  inputs: { category: "Airspace" },
  expected: { selected_item_count: 7 },
};

const SECTIONAL_CAT_OPTS = SECTIONAL_SYMBOLS.map((c) => ({ value: c.category, label: c.category }));

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderSectionalSymbols(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: FAA Aeronautical Chart User's Guide (most current edition; the FAA publishes a new edition with each chart cycle). VFR sectional chart legend. Free at faa.gov/air_traffic/flight_info/aeronav. The chart legend on the printed / electronic sectional is the value of record.";
  const C = makeSelect("Category (optional)", "sec-c", [{ value: "", label: "All categories" }, ...SECTIONAL_CAT_OPTS]);
  inputRegion.appendChild(C.wrap);
  attachExampleButton(inputRegion, () => { C.select.value = sectionalExample.inputs.category; update(); });
  const oSel = makeOutputLine(outputRegion, "Category contents", "sec-out-sel");
  const oList = makeOutputLine(outputRegion, "All categories (overview)", "sec-out-list");
  const update = debounce(() => {
    const r = computeSectionalSymbols({ category: C.select.value });
    if (r.error) { oSel.textContent = r.error; oList.textContent = "-"; return; }
    oSel.textContent = r.selected
      ? r.selected.items.map((i) => i.sym + " - " + i.meaning).join("  |  ")
      : "(select a category for details)";
    oList.textContent = r.categories.map((c) => c.category + " (" + c.items.length + " entries)").join("  |  ");
  }, DEBOUNCE_MS);
  C.select.addEventListener("change", update);
  update();
}

// ====================================================================
// W.18 Aircraft category and class reference (14 CFR §1.1)
// ====================================================================
//
// Reference render of the certification 'category' / 'class' framework
// per 14 CFR §1.1. Two senses of 'category': (1) airworthiness
// certification category (normal, utility, acrobatic, commuter,
// transport), (2) pilot-certification category (airplane, rotorcraft,
// glider, lighter-than-air, powered-lift, weight-shift control,
// powered parachute). 'Class' likewise has two senses. Both are
// surfaced here.

const CATEGORY_CLASS = {
  pilot_certification: {
    note: "Per 14 CFR §1.1 (pilot certification). 'Category' here is the broad grouping; 'class' narrows the group; 'type' (e.g., Boeing 737) further narrows for large or turbojet aircraft.",
    rows: [
      { category: "Airplane",            classes: ["Single-engine land (ASEL)", "Multi-engine land (AMEL)", "Single-engine sea (ASES)", "Multi-engine sea (AMES)"] },
      { category: "Rotorcraft",           classes: ["Helicopter", "Gyroplane"] },
      { category: "Powered-lift",         classes: ["Powered-lift"] },
      { category: "Glider",               classes: ["Glider"] },
      { category: "Lighter-than-air",     classes: ["Airship", "Free balloon"] },
      { category: "Weight-shift-control", classes: ["Land", "Sea"] },
      { category: "Powered parachute",    classes: ["Land", "Sea"] },
    ],
  },
  airworthiness_certification: {
    note: "Per 14 CFR §1.1 (airworthiness certification). Sets the certification basis and operating limitations.",
    rows: [
      { category: "Normal",     classes: ["Up to 9 passenger seats and 12,500 lb MGW; cannot exceed +3.8g (Part 23)."] },
      { category: "Utility",    classes: ["Limited acrobatic maneuvers; up to +4.4g."] },
      { category: "Acrobatic",  classes: ["No restriction except the AFM-specified."] },
      { category: "Commuter",   classes: ["Multiengine propeller; up to 19 passenger seats and 19,000 lb MGW (Part 23)."] },
      { category: "Transport",  classes: ["Certificated under Part 25 (jets, transport-category turboprops)."] },
      { category: "Limited",    classes: ["Surplus military aircraft."] },
      { category: "Restricted", classes: ["Special-purpose (ag-cat, fire-bomber, etc.)."] },
      { category: "Experimental", classes: ["Amateur-built, exhibition, research and development, etc."] },
      { category: "LSA",        classes: ["Light Sport Aircraft per 14 CFR §1.1; max 1320 lb (1430 lb amphibious), 120 KCAS max."] },
    ],
  },
};

// dims: in { sense: dimensionless } out: { sense: dimensionless, note: dimensionless, rows: dimensionless }
// (Reference table; 14 CFR §1.1 category / class strings are categorical.)
export function computeAircraftCategory({ sense }) {
  const s = String(sense || "pilot_certification").toLowerCase();
  if (!CATEGORY_CLASS[s]) return { error: "Sense must be 'pilot_certification' or 'airworthiness_certification'." };
  return { sense: s, ...CATEGORY_CLASS[s] };
}

export const aircraftCategoryExample = {
  inputs: { sense: "pilot_certification" },
  expected: { row_count: 7 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderAircraftCategory(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: 14 CFR §1.1 (Definitions and Abbreviations). 14 CFR Part 23 (small airplanes), Part 25 (transport airplanes), Part 27 / 29 (rotorcraft). Pilot certification categories / classes per 14 CFR §61.5 (Certificates and ratings issued under this part). Free at ecfr.gov.";
  const S = makeSelect("Sense", "ac-s", [
    { value: "pilot_certification", label: "Pilot certification (cat / class / type)" },
    { value: "airworthiness_certification", label: "Airworthiness certification (Part 23 / 25 etc.)" },
  ]);
  inputRegion.appendChild(S.wrap);
  attachExampleButton(inputRegion, () => { S.select.value = aircraftCategoryExample.inputs.sense; update(); });
  const oNote = makeOutputLine(outputRegion, "Sense note", "ac-out-note");
  const oRows = makeOutputLine(outputRegion, "Category -> classes", "ac-out-rows");
  const update = debounce(() => {
    const r = computeAircraftCategory({ sense: S.select.value });
    if (r.error) { oNote.textContent = r.error; oRows.textContent = "-"; return; }
    oNote.textContent = r.note;
    oRows.textContent = r.rows.map((row) => row.category + ": " + row.classes.join(" | ")).join("  ||  ");
  }, DEBOUNCE_MS);
  S.select.addEventListener("change", update);
  update();
}

// ====================================================================
// W.4 Magnetic variation conversion (TVMDC wrapper)
// ====================================================================
//
// FAA sectional and IFR enroute charts publish lines of constant
// magnetic variation (isogonic lines, magenta-dashed). The pilot
// reads variation off the chart for the planned route, then applies
// the standard TVMDC mnemonic at the kneeboard:
//
//   True heading  -> Magnetic heading: add  westerly variation,
//                                       subtract easterly variation
//   Magnetic heading -> True heading: subtract westerly variation,
//                                      add easterly variation
//
// Mnemonic: "East is least; West is best" when going True -> Magnetic.
// This tile is a calm arithmetic cross-check; the underlying
// continental-scale model (NOAA / NCEI World Magnetic Model 2025) is
// already wired as the v9 §F.1 magnetic-declination tile in
// calc-field.js for pilots who want a lat / lon / date answer when no
// sectional is at hand.

function normalizeHeading(deg) {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

// dims: in { variation_deg: dimensionless, direction_ew: dimensionless, heading_deg: dimensionless, sense: dimensionless }
//        out: { input_heading: dimensionless, result_heading: dimensionless, variation_deg: dimensionless, direction_ew: dimensionless, sense: dimensionless, mnemonic: dimensionless }
export function computeMagneticVariation({ variation_deg, direction_ew, heading_deg, sense }) {
  const v = Number(variation_deg);
  const h = Number(heading_deg);
  const ew = String(direction_ew || "").toLowerCase();
  const s = String(sense || "").toLowerCase();
  if (!Number.isFinite(v) || v < 0 || v > 30) return { error: "Variation must be 0-30 degrees (rare US values rarely exceed 25)." };
  if (!Number.isFinite(h) || h < 0 || h > 360) return { error: "Heading must be 0-360 degrees." };
  if (ew !== "east" && ew !== "west") return { error: "Variation direction must be 'east' or 'west'." };
  if (s !== "true_to_magnetic" && s !== "magnetic_to_true") return { error: "Sense must be 'true_to_magnetic' or 'magnetic_to_true'." };
  const signedVariation = ew === "west" ? v : -v;
  let result;
  if (s === "true_to_magnetic") {
    // True + westerly -> Magnetic; True - easterly -> Magnetic.
    result = h + signedVariation;
  } else {
    // Magnetic - westerly -> True; Magnetic + easterly -> True.
    result = h - signedVariation;
  }
  result = normalizeHeading(result);
  return {
    input_heading: normalizeHeading(h),
    result_heading: result,
    variation_deg: v,
    direction_ew: ew,
    sense: s,
    mnemonic: "East is least; West is best (True -> Magnetic).",
  };
}

export const magneticVariationExample = {
  // GA reference: KDEN (Denver) sectional shows ~ 7 deg E variation in 2026.
  // A true heading of 090 deg becomes 090 - 7 = 083 deg magnetic.
  inputs: { variation_deg: 7, direction_ew: "east", heading_deg: 90, sense: "true_to_magnetic" },
  expected: { result_heading: 83 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderMagneticVariation(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: TVMDC convention per FAA Pilot's Handbook of Aeronautical Knowledge (FAA-H-8083-25C) Chapter 16. 'East is least; West is best' applies True -> Magnetic. Sectional / IFR enroute charts (NOAA / FAA AeroNav) publish magenta-dashed isogonic lines for the planned route. PIC must cross-check against a current sectional. Lat / lon / date wrapper over NOAA / NCEI WMM2025 lives at the v9 §F.1 magnetic-declination tile.";
  const V = makeNumber("Magnetic variation (deg, 0-30)", "mv-v", { step: "any", min: "0", max: "30" });
  const EW = makeSelect("Variation direction", "mv-ew", [
    { value: "east", label: "East (subtract from True)" },
    { value: "west", label: "West (add to True)" },
  ]);
  const H = makeNumber("Heading (deg, 0-360)", "mv-h", { step: "any", min: "0", max: "360" });
  const S = makeSelect("Conversion sense", "mv-s", [
    { value: "true_to_magnetic", label: "True -> Magnetic" },
    { value: "magnetic_to_true", label: "Magnetic -> True" },
  ]);
  for (const f of [V, EW, H, S]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    V.input.value = String(magneticVariationExample.inputs.variation_deg);
    EW.select.value = magneticVariationExample.inputs.direction_ew;
    H.input.value = String(magneticVariationExample.inputs.heading_deg);
    S.select.value = magneticVariationExample.inputs.sense;
    update();
  });
  const oResult = makeOutputLine(outputRegion, "Converted heading (deg)", "mv-out-result");
  const oNote = makeOutputLine(outputRegion, "Mnemonic", "mv-out-note");
  const update = debounce(() => {
    const r = computeMagneticVariation({
      variation_deg: V.input.value,
      direction_ew: EW.select.value,
      heading_deg: H.input.value,
      sense: S.select.value,
    });
    if (r.error) { oResult.textContent = r.error; oNote.textContent = "-"; return; }
    oResult.textContent = fmt(r.result_heading, 0) + " deg " + (r.sense === "true_to_magnetic" ? "(magnetic)" : "(true)");
    oNote.textContent = r.mnemonic;
  }, DEBOUNCE_MS);
  for (const el of [V.input, EW.select, H.input, S.select]) el.addEventListener("input", update);
  for (const el of [EW.select, S.select]) el.addEventListener("change", update);
}

// ====================================================================
// W.5 METAR decoder
// ====================================================================
//
// METAR is the international observation report encoding (FAA / NWS /
// WMO). The full specification is FAA Aviation Weather Services AC
// 00-45H Change 2 (free at faa.gov) and FMH-1 (Surface Weather
// Observations and Reports). This decoder handles the common ASCII
// METAR / SPECI fields a GA pilot sees on a kneeboard:
//
//   METAR / SPECI prefix
//   Station ICAO (4 letters)
//   Day-Hour-Minute group (DDHHMMZ)
//   AUTO / COR modifiers
//   Wind (dddffKT or dddffGggKT or VRB)
//   Visibility (NsM or NNNN; CAVOK)
//   Weather phenomena (RA, SN, TS, FG, BR, ...)
//   Sky conditions (FEW / SCT / BKN / OVC + 3-digit hundreds of feet)
//     CLR / SKC / NSC
//   Temperature / dewpoint (Tt/Td; M for minus)
//   Altimeter (Annnn inHg or QNNNN hPa)
//   RMK remarks block (passed through, not decoded)

const METAR_WX_PHENOMENA = {
  TS: "Thunderstorm", RA: "Rain", SN: "Snow", DZ: "Drizzle", SH: "Shower",
  BR: "Mist", FG: "Fog", FU: "Smoke", HZ: "Haze", GR: "Hail", GS: "Small hail / snow pellets",
  PL: "Ice pellets", IC: "Ice crystals", SG: "Snow grains", SQ: "Squall", FC: "Funnel cloud / tornado",
  PO: "Dust / sand whirls", SS: "Sandstorm", DS: "Duststorm", VA: "Volcanic ash",
};
const METAR_WX_INTENSITY = { "-": "Light", "+": "Heavy", VC: "In the vicinity" };
const METAR_SKY_COVER = {
  CLR: "Clear (automated, no cloud below 12,000 ft)",
  SKC: "Sky clear (manual)",
  NSC: "No significant cloud",
  FEW: "Few (1-2 oktas)",
  SCT: "Scattered (3-4 oktas)",
  BKN: "Broken (5-7 oktas)",
  OVC: "Overcast (8 oktas)",
};

function decodeWindGroup(tok) {
  // Accepted forms: dddffKT, dddffGggKT, VRBffKT, /////KT (unknown).
  const m = tok.match(/^(VRB|\d{3})(\d{2,3})(G(\d{2,3}))?(KT|MPS|KMH)$/);
  if (!m) return null;
  const direction = m[1] === "VRB" ? "VRB" : Number(m[1]);
  const speed = Number(m[2]);
  const gust = m[4] ? Number(m[4]) : null;
  const units = m[5];
  return { direction, speed, gust, units };
}
function decodeAltimeter(tok) {
  // A2992 -> 29.92 inHg; Q1013 -> 1013 hPa.
  let m = tok.match(/^A(\d{4})$/);
  if (m) return { inhg: Number(m[1]) / 100, hpa: null };
  m = tok.match(/^Q(\d{4})$/);
  if (m) return { inhg: null, hpa: Number(m[1]) };
  return null;
}
function decodeTempDew(tok) {
  // 12/M03 -> +12 C / -3 C dewpoint.
  const m = tok.match(/^(M?\d{2})\/(M?\d{2})$/);
  if (!m) return null;
  const t = (s) => (s.startsWith("M") ? -Number(s.slice(1)) : Number(s));
  return { temp_c: t(m[1]), dewpoint_c: t(m[2]) };
}
function decodeSkyGroup(tok) {
  if (METAR_SKY_COVER[tok]) return { cover: tok, label: METAR_SKY_COVER[tok], altitude_ft: null };
  const m = tok.match(/^(FEW|SCT|BKN|OVC|VV)(\d{3})(CB|TCU)?$/);
  if (!m) return null;
  const cover = m[1];
  const alt = Number(m[2]) * 100;
  return {
    cover,
    label: cover === "VV" ? "Vertical visibility (sky obscured)" : METAR_SKY_COVER[cover],
    altitude_ft: alt,
    convective: m[3] || null,
  };
}
function decodeVisibility(tok) {
  if (tok === "CAVOK") return { miles: null, meters: null, cavok: true };
  let m = tok.match(/^(\d+(?:\/\d+)?)SM$/);
  if (m) {
    const v = m[1];
    let miles;
    if (v.includes("/")) {
      const [n, d] = v.split("/").map(Number);
      miles = n / d;
    } else miles = Number(v);
    return { miles, meters: null, cavok: false };
  }
  m = tok.match(/^(\d{4})$/);
  if (m) return { miles: null, meters: Number(m[1]), cavok: false };
  return null;
}
function decodeWeatherToken(tok) {
  // Examples: -RA, +TSRA, VCSH, BR, RA, -SHRA, FZRA, FZFG.
  let rest = tok;
  let intensity = "";
  if (rest.startsWith("-") || rest.startsWith("+")) { intensity = rest[0]; rest = rest.slice(1); }
  else if (rest.startsWith("VC")) { intensity = "VC"; rest = rest.slice(2); }
  const phenom = [];
  while (rest.length >= 2) {
    const two = rest.slice(0, 2);
    if (METAR_WX_PHENOMENA[two] || two === "FZ" || two === "MI" || two === "BC" || two === "BL" || two === "DR") {
      phenom.push(two);
      rest = rest.slice(2);
    } else break;
  }
  if (rest !== "" || phenom.length === 0) return null;
  const parts = [];
  if (intensity) parts.push(METAR_WX_INTENSITY[intensity] || intensity);
  for (const p of phenom) {
    parts.push(METAR_WX_PHENOMENA[p] || p);
  }
  return { phenom, intensity, label: parts.join(" ") };
}

// dims: in { input: dimensionless } out: { decoded_metar: dimensionless }
// (METAR / SPECI tokenizer + field decoder; raw report strings and decoded sub-fields are all categorical.)
export function decodeMetar(input) {
  const raw = String(input && input.metar != null ? input.metar : input || "").trim();
  if (!raw) return { error: "Enter a METAR string." };
  let body = raw;
  let remarks = null;
  const rmkIdx = body.indexOf(" RMK ");
  if (rmkIdx >= 0) {
    remarks = body.slice(rmkIdx + 5);
    body = body.slice(0, rmkIdx);
  }
  const toks = body.split(/\s+/);
  const decoded = {
    report_type: null,
    station: null,
    time: null,
    auto: false,
    cor: false,
    wind: null,
    visibility: null,
    weather: [],
    sky: [],
    temperature_c: null,
    dewpoint_c: null,
    altimeter_inhg: null,
    altimeter_hpa: null,
    remarks,
    raw,
    unparsed: [],
  };
  let i = 0;
  if (toks[i] === "METAR" || toks[i] === "SPECI") { decoded.report_type = toks[i]; i += 1; }
  else decoded.report_type = "METAR";
  if (toks[i] && /^[A-Z]{4}$/.test(toks[i])) { decoded.station = toks[i]; i += 1; }
  if (toks[i] && /^\d{6}Z$/.test(toks[i])) { decoded.time = toks[i]; i += 1; }
  while (toks[i] === "AUTO" || toks[i] === "COR") {
    if (toks[i] === "AUTO") decoded.auto = true;
    if (toks[i] === "COR") decoded.cor = true;
    i += 1;
  }
  if (toks[i]) {
    const wind = decodeWindGroup(toks[i]);
    if (wind) { decoded.wind = wind; i += 1; }
  }
  // Optional variable wind direction: dddVddd.
  if (toks[i] && /^\d{3}V\d{3}$/.test(toks[i])) { decoded.wind_variable_range = toks[i]; i += 1; }
  if (toks[i]) {
    // Visibility may be a mixed fraction "1 1/2SM".
    let vtok = toks[i];
    if (/^\d$/.test(vtok) && toks[i + 1] && /^\d+\/\d+SM$/.test(toks[i + 1])) {
      vtok = vtok + " " + toks[i + 1];
      const m = vtok.match(/^(\d) (\d+)\/(\d+)SM$/);
      decoded.visibility = { miles: Number(m[1]) + Number(m[2]) / Number(m[3]), meters: null, cavok: false };
      i += 2;
    } else {
      const vis = decodeVisibility(vtok);
      if (vis) { decoded.visibility = vis; i += 1; }
    }
  }
  // Weather + sky groups until we hit temperature/dewpoint.
  while (i < toks.length) {
    const t = toks[i];
    if (/^M?\d{2}\/M?\d{2}$/.test(t)) break; // temperature
    const sky = decodeSkyGroup(t);
    if (sky) { decoded.sky.push(sky); i += 1; continue; }
    const wx = decodeWeatherToken(t);
    if (wx) { decoded.weather.push(wx); i += 1; continue; }
    decoded.unparsed.push(t);
    i += 1;
  }
  if (toks[i]) {
    const td = decodeTempDew(toks[i]);
    if (td) { decoded.temperature_c = td.temp_c; decoded.dewpoint_c = td.dewpoint_c; i += 1; }
  }
  if (toks[i]) {
    const alt = decodeAltimeter(toks[i]);
    if (alt) { decoded.altimeter_inhg = alt.inhg; decoded.altimeter_hpa = alt.hpa; i += 1; }
  }
  while (i < toks.length) { decoded.unparsed.push(toks[i]); i += 1; }
  return decoded;
}

export const metarExample = {
  // Canonical AC 00-45H teaching example, KJFK 011351Z.
  inputs: { metar: "METAR KJFK 011351Z 18015G25KT 3SM -RA BR BKN015 OVC025 17/15 A2987 RMK AO2 SLP115" },
  expected: { station: "KJFK", temperature_c: 17, altimeter_inhg: 29.87 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderMETAR(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: METAR / SPECI encoding per FAA Aviation Weather Services (AC 00-45H Change 2) and NWS Federal Meteorological Handbook FMH-1 (Surface Weather Observations and Reports). WMO Manual on Codes (WMO-No. 306). Decoder handles common ASCII fields; raw RMK block is passed through unparsed. PIC governs.";
  const F = makeText("METAR string (paste raw)", "metar-in", { placeholder: "METAR KJFK 011351Z 18015G25KT 3SM -RA BR BKN015 OVC025 17/15 A2987" });
  inputRegion.appendChild(F.wrap);
  attachExampleButton(inputRegion, () => { F.input.value = metarExample.inputs.metar; update(); });
  const oStation = makeOutputLine(outputRegion, "Station / time / type", "metar-out-stn");
  const oWind = makeOutputLine(outputRegion, "Wind", "metar-out-wind");
  const oVis = makeOutputLine(outputRegion, "Visibility", "metar-out-vis");
  const oWx = makeOutputLine(outputRegion, "Weather", "metar-out-wx");
  const oSky = makeOutputLine(outputRegion, "Sky condition", "metar-out-sky");
  const oTd = makeOutputLine(outputRegion, "Temperature / dewpoint", "metar-out-td");
  const oAlt = makeOutputLine(outputRegion, "Altimeter", "metar-out-alt");
  const oRmk = makeOutputLine(outputRegion, "Remarks (raw)", "metar-out-rmk");
  const update = debounce(() => {
    const r = decodeMetar({ metar: F.input.value });
    if (r.error) { oStation.textContent = r.error; for (const o of [oWind, oVis, oWx, oSky, oTd, oAlt, oRmk]) o.textContent = "-"; return; }
    oStation.textContent = (r.report_type || "?") + " " + (r.station || "?") + " " + (r.time || "?") + (r.auto ? " (AUTO)" : "") + (r.cor ? " (COR)" : "");
    oWind.textContent = r.wind ? (r.wind.direction === "VRB" ? "VRB" : (r.wind.direction + " deg")) + " at " + r.wind.speed + " " + r.wind.units.toLowerCase() + (r.wind.gust ? ", gust " + r.wind.gust : "") : "(no wind group)";
    oVis.textContent = r.visibility ? (r.visibility.cavok ? "CAVOK (>= 10 km, no significant cloud / weather)" : r.visibility.miles != null ? r.visibility.miles + " SM" : r.visibility.meters + " m") : "-";
    oWx.textContent = r.weather.length === 0 ? "(none)" : r.weather.map((w) => w.label).join(" | ");
    oSky.textContent = r.sky.length === 0 ? "(none)" : r.sky.map((s) => s.label + (s.altitude_ft != null ? " at " + s.altitude_ft + " ft" : "") + (s.convective ? " (" + s.convective + ")" : "")).join(" | ");
    oTd.textContent = r.temperature_c != null ? r.temperature_c + " C / " + r.dewpoint_c + " C" : "-";
    oAlt.textContent = r.altimeter_inhg != null ? r.altimeter_inhg.toFixed(2) + " inHg" : r.altimeter_hpa != null ? r.altimeter_hpa + " hPa" : "-";
    oRmk.textContent = r.remarks || "(none)";
  }, DEBOUNCE_MS);
  F.input.addEventListener("input", update);
}

// ====================================================================
// W.6 TAF decoder
// ====================================================================
//
// TAF is the terminal aerodrome forecast. Same field vocabulary as
// METAR, broken into validity period (DDHH/DDHH) and amendment groups
// (FM, BECMG, TEMPO, PROB30, PROB40). This decoder splits the raw
// string into the prevailing forecast and the change groups; each
// group is decoded with the METAR field-decoders above.

function decodeTafGroup(tokens) {
  const body = tokens.join(" ");
  // Build a minimal pseudo-METAR for the field decoders.
  return decodeMetar({ metar: body + (body.includes("/") ? "" : "") });
}

// dims: in { input: dimensionless } out: { decoded_taf: dimensionless }
// (TAF tokenizer; raw forecast and FM / BECMG / TEMPO / PROBxx change-group decoding are all categorical.)
export function decodeTaf(input) {
  const raw = String(input && input.taf != null ? input.taf : input || "").trim();
  if (!raw) return { error: "Enter a TAF string." };
  const toks = raw.split(/\s+/);
  let i = 0;
  const out = { type: null, station: null, issued: null, validity: null, groups: [], raw };
  if (toks[i] === "TAF") { out.type = "TAF"; i += 1; }
  if (toks[i] === "AMD" || toks[i] === "COR") { out.amendment = toks[i]; i += 1; }
  if (toks[i] && /^[A-Z]{4}$/.test(toks[i])) { out.station = toks[i]; i += 1; }
  if (toks[i] && /^\d{6}Z$/.test(toks[i])) { out.issued = toks[i]; i += 1; }
  if (toks[i] && /^\d{4}\/\d{4}$/.test(toks[i])) { out.validity = toks[i]; i += 1; }
  // The remaining tokens are the prevailing forecast plus FM / BECMG / TEMPO / PROBxx groups.
  let current = { label: "Prevailing", tokens: [] };
  const flush = () => { if (current.tokens.length) { current.decoded = decodeTafGroup(current.tokens); out.groups.push(current); } };
  while (i < toks.length) {
    const t = toks[i];
    let groupHeader = null;
    if (/^FM\d{6}$/.test(t)) {
      groupHeader = { label: "FM " + t.slice(2), tokens: [] };
      i += 1;
    } else if (t === "BECMG" && toks[i + 1] && /^\d{4}\/\d{4}$/.test(toks[i + 1])) {
      groupHeader = { label: "BECMG " + toks[i + 1], tokens: [] };
      i += 2;
    } else if (t === "TEMPO" && toks[i + 1] && /^\d{4}\/\d{4}$/.test(toks[i + 1])) {
      groupHeader = { label: "TEMPO " + toks[i + 1], tokens: [] };
      i += 2;
    } else if (/^PROB\d{2}$/.test(t)) {
      const valid = toks[i + 1] && /^\d{4}\/\d{4}$/.test(toks[i + 1]) ? toks[i + 1] : "";
      groupHeader = { label: t + (valid ? " " + valid : ""), tokens: [] };
      i += valid ? 2 : 1;
    }
    if (groupHeader) {
      flush();
      current = groupHeader;
      continue;
    }
    current.tokens.push(t);
    i += 1;
  }
  flush();
  return out;
}

export const tafExample = {
  // Canonical AC 00-45H TAF example.
  inputs: { taf: "TAF KSFO 011130Z 0112/0218 27012KT P6SM FEW015 FM011600 28015G25KT P6SM SCT020 BKN040 TEMPO 0118/0122 4SM -RA BR BKN015" },
  expected: { station: "KSFO", group_count_min: 2 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderTAF(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: TAF encoding per FAA Aviation Weather Services (AC 00-45H Change 2), NWS Federal Meteorological Handbook FMH-1, and WMO Manual on Codes (WMO-No. 306). Decoder splits the prevailing forecast and FM / BECMG / TEMPO / PROBxx change groups; each group reuses the METAR field-decoders. PIC governs flight planning.";
  const F = makeText("TAF string (paste raw)", "taf-in", { placeholder: "TAF KSFO 011130Z 0112/0218 27012KT P6SM FEW015 ..." });
  inputRegion.appendChild(F.wrap);
  attachExampleButton(inputRegion, () => { F.input.value = tafExample.inputs.taf; update(); });
  const oHeader = makeOutputLine(outputRegion, "Type / station / issued / validity", "taf-out-hdr");
  const oGroups = makeOutputLine(outputRegion, "Groups (count)", "taf-out-count");
  const oList = makeOutputLine(outputRegion, "Decoded groups", "taf-out-list");
  const update = debounce(() => {
    const r = decodeTaf({ taf: F.input.value });
    if (r.error) { oHeader.textContent = r.error; oGroups.textContent = "-"; oList.textContent = "-"; return; }
    oHeader.textContent = (r.type || "?") + " " + (r.station || "?") + " issued " + (r.issued || "?") + " valid " + (r.validity || "?");
    oGroups.textContent = String(r.groups.length);
    oList.textContent = r.groups.map((g) => {
      const d = g.decoded || {};
      const wind = d.wind ? ((d.wind.direction === "VRB" ? "VRB" : d.wind.direction + " deg") + "/" + d.wind.speed + (d.wind.gust ? "G" + d.wind.gust : "") + " " + d.wind.units.toLowerCase()) : "(no wind)";
      const vis = d.visibility ? (d.visibility.cavok ? "CAVOK" : d.visibility.miles != null ? d.visibility.miles + "SM" : d.visibility.meters + "m") : "-";
      const sky = (d.sky || []).map((s) => s.cover + (s.altitude_ft != null ? Math.floor(s.altitude_ft / 100).toString().padStart(3, "0") : "")).join(" ");
      return g.label + ": " + wind + " " + vis + " " + sky;
    }).join("  ||  ");
  }, DEBOUNCE_MS);
  F.input.addEventListener("input", update);
}

// ====================================================================
// W.5 Holding pattern fuel and time
// ====================================================================
//
// You are sent into a hold (ATC delay, weather at the destination, a
// closed runway). The question every pilot asks is the same: how much
// fuel does the hold cost, what is left when ATC releases me, and how
// long until I bust my regulatory reserve and must divert.
//
//   hold_hr            = hold_min / 60
//   fuel_for_hold_gal  = burn_gph * hold_hr
//   fuel_remaining_gal = tank_gal - fuel_for_hold_gal
//   endurance_after_hr = fuel_remaining_gal / burn_gph         (to dry tanks)
//   reserve_gal        = burn_gph * reserve_min / 60
//   max_hold_min       = max(0, (tank_gal - reserve_gal) / burn_gph * 60)
//
// Fuel weight is reported at 6.0 lb/gal avgas / 6.7 lb/gal jet-A per the
// same convention as W.8. The holding airspeed is informational: at a
// no-wind groundspeed it sets the leg distance, but it does not change
// the fuel burn, which is governed by the engine setting. The FAA
// reserve floors are 45 min IFR (91.167) and 30 min day VFR (91.151).
//
// This is the in-hold endurance question; W.8 Fuel Planning sizes the
// trip+reserve fuel load before departure. PIC governs the divert
// decision; the AFM burn and ATC clearance govern the actual hold.

// dims: in { burn_gph: L^3 T^-1, hold_min: T, tank_gal: L^3, reserve_min: T, fuel_type: dimensionless, hold_speed_kt: L T^-1 }
//        out: { fuel_for_hold_gal: L^3, fuel_for_hold_lb: M L T^-2, fuel_remaining_gal: L^3, fuel_remaining_lb: M L T^-2, endurance_after_hr: T, reserve_gal: L^3, max_hold_min: T, leg_distance_nm: L, reserve_band: dimensionless }
export function computeHoldingFuel({ burn_gph, hold_min, tank_gal, reserve_min, fuel_type, hold_speed_kt }) {
  const burn = Number(burn_gph);
  const hold = Number(hold_min);
  const tank = Number(tank_gal);
  const reserveMin = reserve_min === undefined || reserve_min === "" ? 45 : Number(reserve_min);
  if (!Number.isFinite(burn) || burn <= 0) return { error: "Enter a positive fuel burn in gallons per hour." };
  if (!Number.isFinite(hold) || hold < 0) return { error: "Enter a non-negative holding duration in minutes." };
  if (!Number.isFinite(tank) || tank <= 0) return { error: "Enter a positive tank quantity in gallons." };
  if (!Number.isFinite(reserveMin) || reserveMin < 0) return { error: "Reserve must be 0 or more minutes." };
  if (burn > 1000) return { error: "Fuel burn over 1000 gph is outside this tile's scope." };
  if (hold > 600) return { error: "Holding duration over 600 min is outside this tile's scope." };
  const type = String(fuel_type || "avgas").toLowerCase();
  if (!(type in FUEL_TYPE_WEIGHTS_LB_PER_GAL)) return { error: "Fuel type must be avgas or jet_a." };
  const lb_per_gal = FUEL_TYPE_WEIGHTS_LB_PER_GAL[type];
  const hold_hr = hold / 60;
  const fuel_for_hold_gal = burn * hold_hr;
  const fuel_remaining_gal = tank - fuel_for_hold_gal;
  const endurance_after_hr = fuel_remaining_gal > 0 ? fuel_remaining_gal / burn : 0;
  const reserve_gal = burn * reserveMin / 60;
  const max_hold_min = Math.max(0, (tank - reserve_gal) / burn * 60);
  const spd = Number(hold_speed_kt);
  const leg_distance_nm = Number.isFinite(spd) && spd > 0 ? spd * hold_hr : null;
  let reserve_band;
  if (reserveMin < 30) reserve_band = "below 14 CFR 91.151 day VFR minimum (30 min)";
  else if (reserveMin < 45) reserve_band = "meets 91.151 day VFR (30 min); below 91.167 night VFR / IFR (45 min)";
  else reserve_band = "meets 91.167 night VFR / IFR (>= 45 min reserve)";
  const flags = [];
  if (fuel_remaining_gal < 0) {
    flags.push("INSUFFICIENT FUEL: the hold runs the tanks dry before it ends; divert now.");
  } else if (fuel_remaining_gal < reserve_gal) {
    flags.push("Below the " + fmt(reserveMin, 0) + "-min reserve at release; this hold violates your fuel reserve.");
  }
  if (hold > 60) flags.push("Hold over 60 min is unusual; evaluate an alternate before accepting it.");
  return {
    fuel_for_hold_gal,
    fuel_for_hold_lb: fuel_for_hold_gal * lb_per_gal,
    fuel_remaining_gal,
    fuel_remaining_lb: fuel_remaining_gal * lb_per_gal,
    endurance_after_hr,
    reserve_gal,
    reserve_minutes: reserveMin,
    max_hold_min,
    leg_distance_nm,
    fuel_type: type,
    reserve_band,
    flags,
  };
}

export const holdingFuelExample = {
  // 12 gph, hold 30 min, 40 gal on board, 45-min IFR reserve, 90 kt.
  // Hold burns 12*0.5 = 6 gal; 34 gal left; endurance 34/12 = 2.8333 hr;
  // reserve 12*0.75 = 9 gal; max hold (40-9)/12*60 = 155 min; leg 45 nm.
  inputs: { burn_gph: 12, hold_min: 30, tank_gal: 40, reserve_min: 45, fuel_type: "avgas", hold_speed_kt: 90 },
  expected: { fuel_for_hold_gal: 6, fuel_remaining_gal: 34, max_hold_min: 155 },
};

// dims: in { inputRegion: dimensionless, outputRegion: dimensionless, citationEl: dimensionless }
//        out: { dom_side_effect: dimensionless }
// (DOM-mount renderer; HTMLElement refs are categorical.)
export function renderHoldingFuel(inputRegion, outputRegion, citationEl) {
  citationEl.textContent =
    "Citation: Holding fuel = burn_gph * hold_min / 60; fuel remaining = tank - hold fuel; endurance = remaining / burn; max hold before reserve = (tank - reserve fuel) / burn. Fuel weight at 6.0 lb/gal avgas / 6.7 lb/gal jet-A. Reserve floors per 14 CFR 91.151 (30 min day VFR) and 91.167 (45 min night VFR / IFR), non-commercial. Free at ecfr.gov. PIC governs the divert decision; the AFM burn and ATC clearance govern the actual hold.";
  const B = makeNumber("Fuel burn (gph)", "hf-b", { step: "any", min: "0" });
  const H = makeNumber("Holding duration (minutes)", "hf-h", { step: "any", min: "0" });
  const Q = makeNumber("Fuel on board (gal)", "hf-q", { step: "any", min: "0" });
  const R = makeNumber("Reserve floor (minutes)", "hf-r", { step: "any", min: "0", value: "45" });
  const F = makeSelect("Fuel type", "hf-f", [
    { value: "avgas", label: "Avgas 100LL (6.0 lb/gal)" },
    { value: "jet_a", label: "Jet-A (6.7 lb/gal)" },
  ]);
  const S = makeNumber("Holding airspeed (kt, optional)", "hf-s", { step: "any", min: "0", value: "0" });
  for (const f of [B, H, Q, R, F, S]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    const ex = holdingFuelExample.inputs;
    B.input.value = String(ex.burn_gph); H.input.value = String(ex.hold_min);
    Q.input.value = String(ex.tank_gal); R.input.value = String(ex.reserve_min);
    F.select.value = ex.fuel_type; S.input.value = String(ex.hold_speed_kt);
    update();
  });
  const oHold = makeOutputLine(outputRegion, "Fuel for the hold (gal)", "hf-out-hold");
  const oRem = makeOutputLine(outputRegion, "Fuel remaining at release (gal)", "hf-out-rem");
  const oEnd = makeOutputLine(outputRegion, "Endurance remaining (hr:min)", "hf-out-end");
  const oMax = makeOutputLine(outputRegion, "Max hold before reserve (min)", "hf-out-max");
  const oLeg = makeOutputLine(outputRegion, "Holding leg distance (nm, no wind)", "hf-out-leg");
  const oBand = makeOutputLine(outputRegion, "Regulatory reserve band", "hf-out-band");
  const oFlag = makeOutputLine(outputRegion, "Flags", "hf-out-flag");
  const update = debounce(() => {
    const r = computeHoldingFuel({
      burn_gph: B.input.value, hold_min: H.input.value, tank_gal: Q.input.value,
      reserve_min: R.input.value, fuel_type: F.select.value, hold_speed_kt: S.input.value,
    });
    if (r.error) { oHold.textContent = r.error; for (const o of [oRem, oEnd, oMax, oLeg, oBand, oFlag]) o.textContent = "-"; return; }
    oHold.textContent = fmt(r.fuel_for_hold_gal, 2) + " gal (" + fmt(r.fuel_for_hold_lb, 1) + " lb)";
    oRem.textContent = fmt(r.fuel_remaining_gal, 2) + " gal (" + fmt(r.fuel_remaining_lb, 1) + " lb)";
    const mins = Math.round(r.endurance_after_hr * 60);
    oEnd.textContent = Math.floor(mins / 60) + ":" + String(mins % 60).padStart(2, "0");
    oMax.textContent = fmt(r.max_hold_min, 0) + " min";
    oLeg.textContent = r.leg_distance_nm == null ? "(enter airspeed)" : fmt(r.leg_distance_nm, 1) + " nm";
    oBand.textContent = r.reserve_band;
    oFlag.textContent = r.flags.length ? r.flags.join(" | ") : "Within reserve; hold is sustainable.";
  }, DEBOUNCE_MS);
  for (const el of [B.input, H.input, Q.input, R.input, S.input]) el.addEventListener("input", update);
  F.select.addEventListener("change", update);
}

// --- Renderer registry ---

export const AVIATION_RENDERERS = {
  "density-altitude": renderDensityAltitude,
  "crosswind-component": renderCrosswind,
  "ete-eta": renderETE,
  "hypoxia-altitude": renderHypoxiaAltitude,
  "pressure-altitude": renderPressureAltitude,
  "phonetic-alphabet": renderPhoneticAlphabet,
  "fuel-planning": renderFuelPlanning,
  "wind-triangle": renderWindTriangle,
  "top-of-descent": renderTopOfDescent,
  "holding-fuel": renderHoldingFuel,
  "weather-phrasing": renderWeatherPhrasing,
  "transponder-codes": renderTransponderCodes,
  "standard-turn-rate": renderStandardTurn,
  "true-airspeed": renderTrueAirspeed,
  "sectional-symbols": renderSectionalSymbols,
  "aircraft-category": renderAircraftCategory,
  "magnetic-variation": renderMagneticVariation,
  "metar-decoder": renderMETAR,
  "taf-decoder": renderTAF,
};

// =====================================================================
// v23 shared simple-renderer (select + number fields). Non-exported.
// =====================================================================
function _v23SimpleRenderer(spec) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = f.kind === "select" ? makeSelect(f.label, f.id, f.options) : makeNumber(f.label, f.id, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) { if (f.kind === "select") field.select.value = f.default; else field.input.value = String(f.default); }
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        if (f.kind === "select") fields[f.key].select.value = v[f.key]; else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) params[f.key] = f.kind === "select" ? fields[f.key].select.value : (Number(fields[f.key].input.value) || 0);
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) (f.kind === "select" ? fields[f.key].select : fields[f.key].input).addEventListener("input", update);
  };
}

// =====================================================================
// v23 W.1: In-flight CG migration as fuel burns (FAA-H-8083-1)
// =====================================================================
// Weight and CG at an elapsed time as fuel burns from a fixed-arm tank,
// plus the fuel/time at which the CG would reach the forward or aft limit
// (limits user-supplied from the envelope). Extends weight-shift-cg into
// the time domain. Multi-tank sequencing is out of scope.
//
// dims: in { zfw_lb: M, zfw_moment_lbin: M L, fuel_gal: dimensionless, fuel_arm_in: L, burn_gph: dimensionless, elapsed_hr: dimensionless, lb_per_gal: dimensionless, fwd_limit_in: L, aft_limit_in: L } out: { weight_lb: M, cg_in: L, within_limits: dimensionless, fuel_to_fwd_gal: dimensionless, fuel_to_aft_gal: dimensionless }
export function computeWeightShiftFuelBurn({ zfw_lb = 0, zfw_moment_lbin = 0, fuel_gal = 0, fuel_arm_in = 0, burn_gph = 0, elapsed_hr = 0, lb_per_gal = 6, fwd_limit_in = 0, aft_limit_in = 0 } = {}) {
  const zfw = Number(zfw_lb) || 0;
  const m0z = Number(zfw_moment_lbin) || 0;
  const fuel = Number(fuel_gal) || 0;
  const arm = Number(fuel_arm_in) || 0;
  const burn = Number(burn_gph) || 0;
  let elapsed = Number(elapsed_hr); if (!Number.isFinite(elapsed) || elapsed < 0) elapsed = 0;
  let k = Number(lb_per_gal); if (!Number.isFinite(k) || k <= 0) k = 6;
  const fwd = Number(fwd_limit_in) || 0;
  const aft = Number(aft_limit_in) || 0;
  if (!(zfw > 0 && Number.isFinite(zfw))) return { error: "Zero-fuel weight must be positive (lb)." };
  if (!(fuel >= 0 && Number.isFinite(fuel))) return { error: "Fuel loaded must be zero or positive (gal)." };
  if (!Number.isFinite(m0z)) return { error: "Zero-fuel moment must be finite (lb-in)." };
  if (!Number.isFinite(arm)) return { error: "Fuel-tank arm must be finite (in)." };
  if (!(burn >= 0 && Number.isFinite(burn))) return { error: "Burn rate must be zero or positive (gph)." };
  const W0 = zfw + fuel * k;
  const M0 = m0z + fuel * k * arm;
  const burned_gal = Math.min(fuel, burn * elapsed);
  const weight_lb = W0 - burned_gal * k;
  const cg_in = weight_lb > 0 ? (M0 - burned_gal * k * arm) / weight_lb : null;
  const within_limits = (cg_in !== null && fwd > 0 && aft > 0) ? (cg_in >= fwd && cg_in <= aft) : null;
  // Solve burned gallons b where CG(b) hits a limit L:
  // (M0 - b*k*arm) = L*(W0 - b*k)  ->  b = (M0 - L*W0) / (k*(arm - L))
  function fuelToLimit(L) {
    if (!(L > 0) || arm === L) return null;
    const b = (M0 - L * W0) / (k * (arm - L));
    if (!Number.isFinite(b) || b <= burned_gal || b > fuel) return null;
    return b * k; // pounds of fuel from the start; report remaining gallons below
  }
  const fuel_to_fwd_lb = fuelToLimit(fwd);
  const fuel_to_aft_lb = fuelToLimit(aft);
  return {
    weight_lb,
    cg_in,
    within_limits,
    burned_gal,
    fuel_to_fwd_gal: fuel_to_fwd_lb === null ? null : (fuel_to_fwd_lb / k),
    fuel_to_aft_gal: fuel_to_aft_lb === null ? null : (fuel_to_aft_lb / k),
  };
}
export const weightShiftFuelBurnExample = { inputs: { zfw_lb: 1800, zfw_moment_lbin: 158400, fuel_gal: 40, fuel_arm_in: 95, burn_gph: 10, elapsed_hr: 2, lb_per_gal: 6, fwd_limit_in: 82, aft_limit_in: 93 } };
const renderWeightShiftFuelBurn = _v23SimpleRenderer({
  citation: "Notice: Pilot-in-command and the airplane flight manual govern. Citation: Per the FAA Weight & Balance Handbook (FAA-H-8083-1) moment/arm method; envelope limits are user-supplied from the AFM loading graph. Assumes a fixed fuel-tank arm (multi-tank sequencing out of scope); 6 lb/gal is the avgas standard (Jet-A differs). Extends the weight-shift-cg tile into the time domain. Free at faa.gov.",
  example: weightShiftFuelBurnExample.inputs,
  fields: [
    { key: "zfw_lb", label: "Zero-fuel weight (lb)", kind: "number" },
    { key: "zfw_moment_lbin", label: "Zero-fuel moment (lb-in)", kind: "number" },
    { key: "fuel_gal", label: "Fuel loaded (gal)", kind: "number" },
    { key: "fuel_arm_in", label: "Fuel-tank arm (in)", kind: "number" },
    { key: "burn_gph", label: "Fuel burn (gph)", kind: "number" },
    { key: "elapsed_hr", label: "Elapsed time (hr)", kind: "number" },
    { key: "lb_per_gal", label: "Fuel weight (lb/gal)", kind: "number", default: 6 },
    { key: "fwd_limit_in", label: "Forward CG limit (in, optional)", kind: "number" },
    { key: "aft_limit_in", label: "Aft CG limit (in, optional)", kind: "number" },
  ],
  outputs: [
    { key: "w", id: "wsf-out-w", label: "Weight at time", value: (r) => fmt(r.weight_lb, 0) + " lb (burned " + fmt(r.burned_gal, 1) + " gal)" },
    { key: "cg", id: "wsf-out-cg", label: "CG at time", value: (r) => (r.cg_in === null ? "-" : fmt(r.cg_in, 2) + " in") + (r.within_limits === null ? "" : (r.within_limits ? " (within envelope)" : " - OUTSIDE envelope")) },
    { key: "lim", id: "wsf-out-lim", label: "Fuel to a CG limit", value: (r) => {
      const parts = [];
      if (r.fuel_to_fwd_gal !== null) parts.push("fwd limit after burning " + fmt(r.fuel_to_fwd_gal, 1) + " gal");
      if (r.fuel_to_aft_gal !== null) parts.push("aft limit after burning " + fmt(r.fuel_to_aft_gal, 1) + " gal");
      return parts.length ? parts.join("; ") : "CG stays within the entered limits through the remaining fuel";
    } },
  ],
  compute: computeWeightShiftFuelBurn,
});
AVIATION_RENDERERS["weight-shift-fuel-burn"] = renderWeightShiftFuelBurn;
