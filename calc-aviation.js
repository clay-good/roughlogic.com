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
};
