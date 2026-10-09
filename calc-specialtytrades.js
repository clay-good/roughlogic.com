// Group E: specialty building trades and temporary-works calculators.
//
// Split intact from calc-construction.js by spec-v1871. Calculator IDs,
// formulas, fields, outputs, citations, examples, and Group E assignments
// are unchanged.

import {
  DEBOUNCE_MS as _DC, debounce as _debC, makeNumber as _mnC,
  makeSelect as _msC, makeOutputLine as _moC,
  attachExampleButton as _aeC, fmt as _fmtC, fmt,
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


function _simpleRenderer(spec) {
  const _rlRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    _aeC(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = _msC(f.label, f.id || f.key, f.options);
      else field = _mnC(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) {
        if (f.kind === "select") field.select.value = f.default;
        else field.input.value = String(f.default);
      }
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = _moC(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        if (f.kind === "select") fields[f.key].select.value = v[f.key];
        else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = _debC(() => {
      const params = {};
      for (const f of spec.fields) {
        if (f.kind === "select") params[f.key] = fields[f.key].select.value;
        else params[f.key] = Number(fields[f.key].input.value) || 0;
      }
      const r = spec.compute(params);
      if (r.error) {
        for (const k of Object.keys(outs)) outs[k].textContent = "-";
        outs[spec.outputs[0].key].textContent = r.error;
        return;
      }
      for (const o of spec.outputs) {
        const val = o.value(r);
        outs[o.key].textContent = val;
      }
    }, _DC);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener("input", update);
    }
  };

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

export const SPECIALTYTRADES_RENDERERS = {};

// ===========================================================================
// spec-v1425, v1426, v1428, v1429, v1430, v1431, v1434: the specialty-trades
// band of the 2026-08-26 trade expansion. See specs/scope-trade-expansion.md.
// Elevators, escalators, glazing, canopies, and overhead door hardware -- six
// specialty trades the catalog had never touched.
//
// spec-v1427 (door opening force against the ADA 5 lbf limit) was CUT as a
// duplicate. The catalog's stairwell-pressurization tile already computes the
// pressure force at the knob from exactly 5.2 x W x A x dP / (2 x (W - d)),
// adds the closer force, checks the total against an opening-force limit that
// is a user input, and returns the maximum pressure the door tolerates at that
// closer setting. Entering 5 lbf as the limit IS the accessibility check; only
// the default differed.
// ===========================================================================

// ===================== spec-v1425: elevator round-trip time =====================
// dims: in { rise_ft: L, car_speed_fpm: L T^-1, passengers_per_trip: dimensionless, probable_stops: dimensionless, stop_time_s: T, transfer_time_s: T, cars: dimensionless, population: dimensionless, target_interval_s: T } out: { rtt_s: T, interval_s: T, hc_total: T^-1 }
export function computeElevatorHandlingCapacity({ rise_ft = 0, car_speed_fpm = 0, passengers_per_trip = 0, probable_stops = 0, stop_time_s = 0, transfer_time_s = 0, cars = 1, population = 0, target_interval_s = 30 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rise_ft > 0)) return { error: "Rise must be positive." };
  if (!(car_speed_fpm > 0)) return { error: "Car rated speed must be positive." };
  if (!(passengers_per_trip > 0)) return { error: "Passengers per trip must be positive." };
  if (!(probable_stops >= 0)) return { error: "Probable stops cannot be negative." };
  if (!(stop_time_s > 0)) return { error: "Time per stop must be positive." };
  if (!(transfer_time_s > 0)) return { error: "Passenger transfer time must be positive." };
  if (!(cars >= 1)) return { error: "There must be at least one car." };
  if (!(population > 0)) return { error: "Building population must be positive." };
  if (!(target_interval_s > 0)) return { error: "Target interval must be positive." };
  // Three terms, and their relative sizes are most of the insight: on a typical
  // office run the STOPPING term is the largest, which is why a faster car buys
  // so little and why zoning the building into banks is the standard move.
  const travel_s = 2 * rise_ft / (car_speed_fpm / 60);
  const stopping_s = (probable_stops + 1) * stop_time_s;
  const transfer_s = 2 * passengers_per_trip * transfer_time_s;
  const rtt_s = travel_s + stopping_s + transfer_s;
  const interval_s = rtt_s / cars;
  const hc_per_car = 300 * passengers_per_trip / rtt_s;
  const hc_total = hc_per_car * cars;
  const hc_percent = hc_total / population * 100;
  const cars_for_target = Math.ceil(rtt_s / target_interval_s - 1e-9);
  const dominant = stopping_s >= travel_s && stopping_s >= transfer_s ? "stopping" : travel_s >= transfer_s ? "travel" : "transfer";
  // Judged against the user's own target first (it used to drive only cars_for_target), then the office bands.
  const interval_verdict = (interval_s <= target_interval_s * (1 + 1e-9) ? "meets the " + fmt(target_interval_s, 0) + " s target; " : "MISSES the " + fmt(target_interval_s, 0) + " s target; ")
    + (interval_s <= 30 ? "good office service" : interval_s <= 40 ? "acceptable, near the complaint threshold" : "poor -- over 40 s generates complaints");
  if (![travel_s, stopping_s, transfer_s, rtt_s, interval_s, hc_per_car, hc_total, hc_percent].every(Number.isFinite)) return { error: "Elevator round-trip math is not a finite value." };
  return {
    travel_s, stopping_s, transfer_s, rtt_s, interval_s,
    hc_per_car, hc_total, hc_percent, cars_for_target, dominant,
    interval_verdict,
    note: "How many elevator cars a building needs, by the classical round-trip-time traffic analysis that every developer, architect, and tenant improvement eventually asks for. Round-trip time is the sum of three things and knowing their relative sizes is most of the insight. The TRAVEL term is the round trip at rated speed. The STOPPING term is the number of stops the car probably makes times what each stop costs -- door open, dwell, close, accelerate, decelerate -- and on a typical office run it is the LARGEST of the three. The TRANSFER term is passengers boarding and alighting. Because stopping dominates, faster cars help far less than people expect: a car that spends 41 seconds travelling and 80 seconds stopping barely improves with a higher rated speed, and doubling the rated speed on a 150 second round trip takes only 21 seconds off it. It gets better with faster doors, shorter dwell, and above all fewer stops, which is exactly what zoning a tall building into low-rise and high-rise banks accomplishes. Two outputs matter and they measure different things. INTERVAL is the average wait and it is what a tenant notices: under about 30 seconds is good office service and over 40 generates complaints. HANDLING CAPACITY is throughput in the five-minute peak as a percentage of the building population, and 12 to 15 percent is the conventional office target. A ten-story building with 120 ft of rise, three cars at 350 fpm carrying 12 people past 7 probable stops passes on capacity at 14.4 percent and fails badly on interval at 50 seconds -- it can move the people, it just makes them wait to do it, and meeting a 30 second interval takes five cars rather than three. A single-zone up-peak analysis using assumed probable stops, which is the classical hand method and not what a modern consultant uses: real analysis simulates the traffic, computes probable stops from the population distribution, handles down-peak and interfloor traffic, and models destination dispatch, which changes the answer substantially. ASME A17.1, the elevator consultant, and the AHJ govern.",
  };
}

export const elevatorHandlingCapacityExample = { inputs: { rise_ft: 120, car_speed_fpm: 350, passengers_per_trip: 12, probable_stops: 7, stop_time_s: 10, transfer_time_s: 1.2, cars: 3, population: 500, target_interval_s: 30 } };

SPECIALTYTRADES_RENDERERS["elevator-handling-capacity"] = _simpleRenderer({
  citation: "Citation: the classical elevator round-trip-time traffic analysis -- RTT = 2 x rise / rated speed + (probable stops + 1) x time per stop + 2 x passengers x transfer time, with interval = RTT / cars and five-minute handling capacity = 300 x passengers / RTT -- by name. The conventional office targets (interval under about 30 s, handling capacity 12 to 15 percent of population) are stated as design practice and no table is reproduced. A single-zone up-peak hand method, not a traffic study: ASME A17.1, the elevator consultant, and the AHJ govern.",
  example: elevatorHandlingCapacityExample.inputs,
  fields: [
    { key: "rise_ft", label: "Rise served (ft)", kind: "number" },
    { key: "car_speed_fpm", label: "Car rated speed (fpm)", kind: "number" },
    { key: "passengers_per_trip", label: "Passengers carried per trip", kind: "number" },
    { key: "probable_stops", label: "Probable stops per trip", kind: "number" },
    { key: "stop_time_s", label: "Time per stop (s)", kind: "number" },
    { key: "transfer_time_s", label: "Passenger transfer time (s each)", kind: "number" },
    { key: "cars", label: "Number of cars in the group", kind: "number" },
    { key: "population", label: "Building population served", kind: "number" },
    { key: "target_interval_s", label: "Target interval (s)", kind: "number" },
  ],
  outputs: [
    { key: "r", id: "ehc-out-r", label: "Round-trip time", value: (r) => fmt(r.rtt_s, 1) + " s = " + fmt(r.travel_s, 1) + " travel + " + fmt(r.stopping_s, 1) + " stopping + " + fmt(r.transfer_s, 1) + " transfer" },
    { key: "d", id: "ehc-out-d", label: "Largest term", value: (r) => "the " + r.dominant + " term -- " + (r.dominant === "stopping" ? "fewer stops, not a faster car, is the lever" : "unusual for an office run") },
    { key: "i", id: "ehc-out-i", label: "Average interval", value: (r) => fmt(r.interval_s, 1) + " s with " + fmt(r.cars_for_target, 0) + " cars needed for the target -- " + r.interval_verdict },
    { key: "h", id: "ehc-out-h", label: "Handling capacity", value: (r) => fmt(r.hc_total, 1) + " persons per 5 min (" + fmt(r.hc_per_car, 1) + " per car), " + fmt(r.hc_percent, 1) + "% of population" },
    { key: "n", id: "ehc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeElevatorHandlingCapacity,
});

// ===================== spec-v1426: glass lite wind load, deflection, weight =====================
// ASTM E1300 glass-type strength factors. The tile does NOT reproduce the
// standard's load-resistance charts -- it produces the equivalent annealed
// pressure a reader enters one with.
export const GLASS_TYPE_FACTOR = {
  annealed: { factor: 1, label: "Annealed" },
  heat_strengthened: { factor: 2, label: "Heat-strengthened" },
  tempered: { factor: 4, label: "Fully tempered" },
};

// dims: in { width_ft: L, height_ft: L, design_pressure_psf: M L^-1 T^-2, glass_type: dimensionless, deflection_divisor: dimensionless, thickness_in: L, lites: dimensionless, spacer_allowance_psf: M L^-1 T^-2 } out: { area_sqft: L^2, total_load_lb: M L T^-2, allowable_deflection_in: L }
export function computeGlassThicknessWind({ width_ft = 0, height_ft = 0, design_pressure_psf = 0, glass_type = "annealed", deflection_divisor = 175, thickness_in = 0, lites = 1, spacer_allowance_psf = 0.33 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const t = GLASS_TYPE_FACTOR[glass_type];
  if (!t) return { error: "Glass type must be annealed, heat-strengthened, or fully tempered." };
  if (!(width_ft > 0 && height_ft > 0)) return { error: "Lite width and height must be positive." };
  if (!(design_pressure_psf > 0)) return { error: "Design wind pressure must be positive." };
  if (!(deflection_divisor > 0)) return { error: "Deflection-limit divisor must be positive." };
  if (!(thickness_in > 0)) return { error: "Glass thickness must be positive." };
  if (!(lites >= 1)) return { error: "There must be at least one lite." };
  if (!(spacer_allowance_psf >= 0)) return { error: "Spacer and sealant allowance cannot be negative." };
  const area_sqft = width_ft * height_ft;
  const total_load_lb = area_sqft * design_pressure_psf;
  const long_ft = Math.max(width_ft, height_ft);
  const short_ft = Math.min(width_ft, height_ft);
  const aspect_ratio = long_ft / short_ft;
  // The limit is set on the SHORT span, which is where the curvature is.
  const allowable_deflection_in = short_ft * 12 / deflection_divisor;
  const equivalent_annealed_psf = design_pressure_psf / t.factor;
  // Soda-lime float glass, about 13.1 lb per sq ft per inch of thickness.
  const lite_weight_lb = area_sqft * 13.1 * thickness_in;
  const assembly_weight_lb = lite_weight_lb * lites + (lites > 1 ? area_sqft * spacer_allowance_psf : 0);
  if (![area_sqft, total_load_lb, aspect_ratio, allowable_deflection_in, equivalent_annealed_psf, lite_weight_lb, assembly_weight_lb].every(Number.isFinite)) return { error: "Glass lite math is not a finite value." };
  return {
    area_sqft, total_load_lb, aspect_ratio, allowable_deflection_in,
    equivalent_annealed_psf, lite_weight_lb, assembly_weight_lb,
    type_factor: t.factor, type_label: t.label,
    two_person: assembly_weight_lb > 50,
    note: "The three numbers a glazier needs before ordering a large lite, and only one of them needs a standard. LOAD is arithmetic -- pressure times area -- and it is what the framing, the anchors, and the structure behind them have to carry. DEFLECTION governs the glazing pocket and the sealant, because a lite that deflects past its bite comes out of the frame whether or not it broke, and the limit is set on the SHORT span, which is where the curvature is. WEIGHT decides handling: a large insulating unit is a two-crew-and-a-vacuum-lifter problem long before it is a structural one, and the suction-cup lifter count is its own calculation here. The fourth line is the honest one. Heat-strengthened glass carries roughly twice the load of annealed at the same thickness and fully tempered roughly four times, so dividing the design pressure by the type factor gives the EQUIVALENT ANNEALED PRESSURE that a load-resistance chart is entered with. That chart is ASTM E1300, it is a copyrighted compilation, and this calculation does not reproduce it -- it gets a reader to the door of the chart with the right number in hand. A 5 by 8 ft lite of quarter-inch glass at 30 psf puts 1,200 lb into the perimeter framing, allows about a third of an inch of center deflection at L/175, and weighs 131 lb as a single lite or about 275 lb as an insulating unit. Then the type factor: at 30 psf design, annealed is charted at 30 psf, heat-strengthened at an equivalent 15, and fully tempered at 7.5, which is usually the difference between a thickness that is available and one that is not. THIS DOES NOT SELECT GLASS THICKNESS. It does not compute design wind pressure (wind-cc-pressure does), which is an ASCE 7 calculation with its own exposure, height, and component-and-cladding factors, and it does not address glazing bite, setting blocks, edge condition, thermal stress breakage, safety glazing, or laminated interlayer behavior. ASTM E1300, the glass fabricator, the structural engineer, and the AHJ govern.",
  };
}

export const glassThicknessWindExample = { inputs: { width_ft: 5, height_ft: 8, design_pressure_psf: 30, glass_type: "annealed", deflection_divisor: 175, thickness_in: 0.25, lites: 1, spacer_allowance_psf: 0.33 } };

SPECIALTYTRADES_RENDERERS["glass-thickness-wind"] = _simpleRenderer({
  citation: "Citation: the ASTM E1300 glass-type strength factors (annealed 1.0, heat-strengthened about 2, fully tempered about 4) and the equivalent-annealed-pressure convention for entering a load-resistance chart, cited by number and NOT reproduced -- no E1300 table appears here. Deflection at the customary L/175 limit for glass, taken on the short span. Weight from the nominal density of soda-lime float glass, about 13.1 lb per sq ft per inch of thickness. This does not select glass thickness; ASTM E1300, the fabricator, the structural engineer, and the AHJ govern.",
  example: glassThicknessWindExample.inputs,
  fields: [
    { key: "width_ft", label: "Lite width (ft)", kind: "number" },
    { key: "height_ft", label: "Lite height (ft)", kind: "number" },
    { key: "design_pressure_psf", label: "Design wind pressure (psf)", kind: "number" },
    { key: "glass_type", label: "Glass type", kind: "select", options: Object.keys(GLASS_TYPE_FACTOR).map((k) => ({ value: k, label: GLASS_TYPE_FACTOR[k].label })) },
    { key: "deflection_divisor", label: "Deflection limit divisor (175 = L/175)", kind: "number" },
    { key: "thickness_in", label: "Thickness of one lite (in)", kind: "number" },
    { key: "lites", label: "Number of lites in the unit", kind: "number" },
    { key: "spacer_allowance_psf", label: "Spacer and sealant allowance (psf of unit)", kind: "number" },
  ],
  outputs: [
    { key: "a", id: "gtw-out-a", label: "Lite area and total design load", value: (r) => fmt(r.area_sqft, 1) + " sq ft carrying " + fmt(r.total_load_lb, 0) + " lb into the framing and anchors" },
    { key: "d", id: "gtw-out-d", label: "Allowable deflection on the short span", value: (r) => fmt(r.allowable_deflection_in, 3) + " in (aspect ratio " + fmt(r.aspect_ratio, 2) + ")" },
    { key: "e", id: "gtw-out-e", label: "Equivalent annealed pressure to chart", value: (r) => fmt(r.equivalent_annealed_psf, 1) + " psf at the " + r.type_label + " factor of " + fmt(r.type_factor, 1) },
    { key: "w", id: "gtw-out-w", label: "Weight", value: (r) => fmt(r.lite_weight_lb, 0) + " lb per lite, " + fmt(r.assembly_weight_lb, 0) + " lb assembled" + (r.two_person ? " -- past a one-person lift" : "") },
    { key: "n", id: "gtw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGlassThicknessWind,
});

// ===================== spec-v1428: attached canopy wind uplift and snow =====================
// dims: in { projection_ft: L, width_ft: L, wind_speed_mph: L T^-1, kz: dimensionless, kzt: dimensionless, kd: dimensionless, cn_uplift: dimensionless, cn_downward: dimensionless, ground_snow_psf: M L^-1 T^-2, ce: dimensionless, ct: dimensionless, dead_load_psf: M L^-1 T^-2 } out: { area_sqft: L^2, q_psf: M L^-1 T^-2, uplift_force_lb: M L T^-2 }
export function computeAwningCanopyLoad({ projection_ft = 0, width_ft = 0, wind_speed_mph = 0, kz = 0.98, kzt = 1, kd = 0.85, cn_uplift = 1.2, cn_downward = 0.7, ground_snow_psf = 0, ce = 1, ct = 1, dead_load_psf = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(projection_ft > 0 && width_ft > 0)) return { error: "Canopy projection and width must be positive." };
  if (!(wind_speed_mph > 0)) return { error: "Basic wind speed must be positive." };
  if (!(kz > 0 && kzt > 0 && kd > 0)) return { error: "Kz, Kzt, and Kd must be positive." };
  if (!(cn_uplift > 0)) return { error: "The net uplift pressure coefficient must be non-zero." };
  if (!(cn_downward > 0)) return { error: "The net downward pressure coefficient must be non-zero." };
  if (!(ground_snow_psf >= 0)) return { error: "Ground snow load cannot be negative." };
  if (!(ce > 0 && ct > 0)) return { error: "Ce and Ct must be positive." };
  if (!(dead_load_psf >= 0)) return { error: "Canopy dead load cannot be negative." };
  const area_sqft = projection_ft * width_ft;
  const q_psf = 0.00256 * wind_speed_mph * wind_speed_mph * kz * kzt * kd;
  // A canopy is open underneath, so wind acts on BOTH faces at once -- which is
  // why ASCE 7 gives it a NET coefficient rather than external plus internal.
  const uplift_psf = q_psf * cn_uplift;
  const downward_psf = q_psf * cn_downward;
  const uplift_force_lb = uplift_psf * area_sqft;
  const downward_force_lb = downward_psf * area_sqft;
  // ASCE 7-22 Eq. 7.3-1 has no importance factor: pg is already the risk-category
  // ground snow load. Until 2026-09-25 this multiplied by a 7-16 Is.
  const snow_pf_psf = 0.7 * ce * ct * ground_snow_psf;
  const snow_force_lb = snow_pf_psf * area_sqft;
  const dead_force_lb = dead_load_psf * area_sqft;
  const net_uplift_lb = uplift_force_lb - dead_force_lb;
  const gravity_force_lb = Math.max(snow_force_lb, downward_force_lb);
  const uplift_governs = uplift_force_lb > gravity_force_lb;
  const dead_offset_pct = uplift_force_lb > 0 ? dead_force_lb / uplift_force_lb * 100 : 0;
  if (![area_sqft, q_psf, uplift_force_lb, snow_force_lb, net_uplift_lb].every(Number.isFinite)) return { error: "Canopy load math is not a finite value." };
  return {
    area_sqft, q_psf, uplift_psf, downward_psf, uplift_force_lb, downward_force_lb,
    snow_pf_psf, snow_force_lb, dead_force_lb, net_uplift_lb, gravity_force_lb,
    uplift_governs, dead_offset_pct,
    governing: uplift_governs ? "UPLIFT governs at " + fmt(uplift_force_lb, 0) + " lb up, " + fmt((uplift_force_lb / gravity_force_lb - 1) * 100, 0) + "% over the gravity case" : "the gravity case governs at " + fmt(gravity_force_lb, 0) + " lb down",
    note: "Wind uplift and snow on an attached canopy or awning, where the governing case is usually uplift and the anchors are the whole design. A canopy is open underneath, so wind acts on BOTH faces at once -- pressure on top and suction below, or the reverse -- and ASCE 7 handles that with a NET pressure coefficient rather than the separate external and internal coefficients used on an enclosed building. That is what makes a canopy different from a roof. On a roof, gravity is the design case and wind uplift is a check; on a canopy the uplift case frequently governs outright, and it loads the wall anchors in TENSION and the connection in PRYING, which are the two load directions masonry and stud walls are worst at and the two that get detailed most casually because the canopy looks light. Both cases have to be run because the two loads come from different weather: the snow case governs the members and the deflection, the uplift case governs the anchors. A 12 ft by 20 ft canopy in a 115 mph wind sees about 28 psf of velocity pressure, 34 psf of net uplift, and 8,122 lb trying to pull it off the wall, against 5,040 lb of flat-roof snow pushing down -- uplift beats snow by 61 percent and it acts the wrong way, while the canopy's own 800 lb of dead weight offsets only a tenth of it. That is the number that decides whether this canopy is through-bolted with backing plates or lagged into a stud, and it is the number nobody runs before the second one blows off. LOAD ONLY, NOT A CANOPY DESIGN. It does not size members, connections, or anchors, does not compute the prying and eccentric moment at the wall, and does not check the wall or its backup for the tension it is being asked to carry, which on masonry is frequently the actual limit. Kz, Kzt, Kd, Cn, Ce, and Ct are all ASCE 7 values determined elsewhere, and pg is the ASCE 7-22 ground snow load for the risk category (7-22 has no Is), and a wrong Cn moves the answer by a factor. Fabric awnings behave differently again, and drifting or sliding snow off the roof above can far exceed the flat-roof value. ASCE 7, the structural engineer, and the AHJ govern.",
  };
}

export const awningCanopyLoadExample = { inputs: { projection_ft: 12, width_ft: 20, wind_speed_mph: 115, kz: 0.98, kzt: 1, kd: 0.85, cn_uplift: 1.2, cn_downward: 0.7, ground_snow_psf: 30, ce: 1, ct: 1, dead_load_psf: 3.33 } };

SPECIALTYTRADES_RENDERERS["awning-canopy-load"] = _simpleRenderer({
  citation: "Citation: velocity pressure q = 0.00256 x V^2 x Kz x Kzt x Kd and the ATTACHED-CANOPY net pressure coefficients of ASCE 7 Chapter 29, cited by chapter and not reproduced -- Cn is entered, not looked up here. Flat-roof snow from ASCE 7-22 Chapter 7, pf = 0.7 x Ce x Ct x pg (Eq. 7.3-1, no Is), cited by chapter. Load only, not a canopy design: it sizes no member, connection, or anchor and checks no wall for the tension it is asked to carry. ASCE 7, the structural engineer, and the AHJ govern.",
  example: awningCanopyLoadExample.inputs,
  fields: [
    { key: "projection_ft", label: "Canopy projection from the wall (ft)", kind: "number" },
    { key: "width_ft", label: "Canopy width (ft)", kind: "number" },
    { key: "wind_speed_mph", label: "Basic wind speed (mph)", kind: "number" },
    { key: "kz", label: "Velocity pressure exposure coefficient Kz", kind: "number" },
    { key: "kzt", label: "Topographic factor Kzt", kind: "number" },
    { key: "kd", label: "Directionality factor Kd", kind: "number" },
    { key: "cn_uplift", label: "Net pressure coefficient Cn, uplift", kind: "number" },
    { key: "cn_downward", label: "Net pressure coefficient Cn, downward", kind: "number" },
    { key: "ground_snow_psf", label: "Ground snow load pg (psf)", kind: "number" },
    { key: "ce", label: "Exposure factor Ce", kind: "number" },
    { key: "ct", label: "Thermal factor Ct", kind: "number" },
    { key: "dead_load_psf", label: "Canopy dead load (psf)", kind: "number" },
  ],
  outputs: [
    { key: "q", id: "acl-out-q", label: "Canopy area and velocity pressure", value: (r) => fmt(r.area_sqft, 0) + " sq ft at q = " + fmt(r.q_psf, 1) + " psf" },
    { key: "u", id: "acl-out-u", label: "Wind uplift", value: (r) => fmt(r.uplift_psf, 1) + " psf = " + fmt(r.uplift_force_lb, 0) + " lb up, " + fmt(r.net_uplift_lb, 0) + " lb net of dead weight" },
    { key: "d", id: "acl-out-d", label: "Wind downward", value: (r) => fmt(r.downward_psf, 1) + " psf = " + fmt(r.downward_force_lb, 0) + " lb down" },
    { key: "s", id: "acl-out-s", label: "Flat-roof snow", value: (r) => fmt(r.snow_pf_psf, 1) + " psf = " + fmt(r.snow_force_lb, 0) + " lb down" },
    { key: "g", id: "acl-out-g", label: "Governing case", value: (r) => r.governing + "; dead weight offsets " + fmt(r.dead_offset_pct, 0) + "% of the uplift" },
    { key: "n", id: "acl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAwningCanopyLoad,
});

// ===================== spec-v1429: garage door torsion spring =====================
// dims: in { door_weight_lb: M L T^-2, door_height_in: L, drum_radius_in: L, springs: dimensionless, extra_turns: dimensionless } out: { required_torque_inlb: M L^2 T^-2, turns: dimensionless, lift_turns: dimensionless, required_ippt: M L^2 T^-2 }
export function computeGarageDoorTorsionSpring({ door_weight_lb = 0, door_height_in = 0, drum_radius_in = 0, springs = 1, extra_turns = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(door_weight_lb > 0)) return { error: "Door weight must be positive." };
  if (!(door_height_in > 0)) return { error: "Door height must be positive." };
  if (!(drum_radius_in > 0)) return { error: "Cable drum radius must be positive." };
  if (!(springs >= 1)) return { error: "There must be at least one spring." };
  if (!(extra_turns >= 0 && extra_turns <= 3)) return { error: "Extra turns must be 0 to 3 (about 1 is usual; the drum maker's chart governs)." };
  // Torque is weight through the drum radius; turns are pure geometry -- the
  // cable has to wind the full door height onto the drum's circumference.
  const required_torque_inlb = door_weight_lb * drum_radius_in;
  const travel_per_turn_in = 2 * Math.PI * drum_radius_in;
  // The lift turns wind the door height onto the drum; the spring also needs
  // torque left with the door OPEN, so it is wound about one turn more
  // (Canimex drum charts run about 1.15). Until 2026-10-01 the turns were the
  // lift turns alone, which leaves the spring slack at the top of travel.
  const lift_turns = door_height_in / travel_per_turn_in;
  const turns = lift_turns + extra_turns;
  const required_ippt = required_torque_inlb / turns;
  const ippt_per_spring = required_ippt / springs;
  if (![required_torque_inlb, travel_per_turn_in, turns, required_ippt, ippt_per_spring].every(Number.isFinite)) return { error: "Torsion-spring math is not a finite value." };
  return {
    required_torque_inlb, travel_per_turn_in, lift_turns, extra_turns, turns, required_ippt, ippt_per_spring,
    note: "What a garage door torsion spring has to do: the torque it must produce is the door's weight acting through the cable drum radius, the turns come from the door height, and the required spring rate is one divided by the other. A torsion spring balances a door by storing exactly as much torque at the closed position as the door weight exerts through the drum, so torque is weight times drum radius and that is the target. The number of turns is pure geometry -- the cable has to wind the full door height onto the drum, and one turn takes up the drum's circumference. Spring rate in inch-pounds per turn, IPPT, is what a supplier is given, and it is the target torque divided by the turns. Note what that means: two doors of the same weight but different heights need springs of DIFFERENT rate, because the taller door gets more turns to reach the same torque, and two springs share the rate with each carrying half. A 7 ft door weighing 150 lb on a 2 in effective cable radius wants 300 in-lb; the cable takes 6.68 turns to wind the door height, and the spring carries about one turn more so it still holds the door at the top (Canimex's drum charts run about 1.15), so 7.68 turns and 39.0 IPPT total, or 19.5 IPPT per spring in a pair. Winding only the 6.68 lift turns leaves no spring torque with the door open, and an open door that drifts down is the hazard. Add an insulated panel that brings it to 190 lb and the required rate rises 27 percent with the weight; raise the door to 8 ft at the original weight and the rate FALLS to 34.7, because the same torque is reached over more turns. Weight and height pull in opposite directions. The balance is exact at only one position, because the spring is linear and the door's demand is not once it starts breaking over the radius, which is why a properly balanced door still needs a few pounds of hand force mid-travel. TORSION SPRINGS ARE STORED ENERGY AND THEY INJURE PEOPLE. Winding, unwinding, and replacing them is done with proper winding bars by someone trained to do it, and a broken cable or a slipping drum turns a wound spring into a projectile. This calculates what a spring must do; it does not tell anyone how to install one and no one should learn that here. It does not select a spring from wire size, inside diameter, and length -- that is the manufacturer's table, which also sets the cycle life most owners actually care about -- and the helical torsion spring rate calculation here is the one that goes the other way, from wire geometry to rate. It assumes a linear spring pair on a standard-lift door with matched drums; high-lift, vertical-lift, and low-headroom conversions change the drum geometry. The door and hardware manufacturers and a qualified installer govern.",
  };
}

export const garageDoorTorsionSpringExample = { inputs: { door_weight_lb: 150, door_height_in: 84, drum_radius_in: 2, springs: 2, extra_turns: 1 } };

SPECIALTYTRADES_RENDERERS["garage-door-torsion-spring"] = _simpleRenderer({
  citation: "Citation: the torsion-spring balance relation -- required torque equals door weight times cable drum radius, turns equal door height divided by the drum circumference plus about one turn to hold the door open, and required rate equals torque divided by turns -- with the inch-pounds-per-turn (IPPT) rate convention used by overhead door manufacturers, by name. Torsion springs are stored energy: this states what a spring must do and is not installation instruction. The door and hardware manufacturers, their spring tables and cycle-life ratings, and a qualified installer govern.",
  example: garageDoorTorsionSpringExample.inputs,
  fields: [
    { key: "door_weight_lb", label: "Door weight (lb)", kind: "number" },
    { key: "door_height_in", label: "Door height (in)", kind: "number" },
    { key: "drum_radius_in", label: "Effective cable drum radius (in)", kind: "number" },
    { key: "springs", label: "Number of springs", kind: "number" },
    { key: "extra_turns", label: "Turns beyond the lift that hold the door open (about 1; the drum maker's chart governs)", kind: "number", default: 1 },
  ],
  outputs: [
    { key: "t", id: "gdts-out-t", label: "Required torque at the closed position", value: (r) => fmt(r.required_torque_inlb, 0) + " in-lb" },
    { key: "u", id: "gdts-out-u", label: "Turns of the spring", value: (r) => fmt(r.turns, 2) + " turns: " + fmt(r.lift_turns, 2) + " to wind the door height at " + fmt(r.travel_per_turn_in, 2) + " in of cable per turn, plus " + fmt(r.extra_turns, 2) + " to hold it open" },
    { key: "r", id: "gdts-out-r", label: "Required rate", value: (r) => fmt(r.required_ippt, 1) + " IPPT total" },
    { key: "p", id: "gdts-out-p", label: "Rate per spring", value: (r) => fmt(r.ippt_per_spring, 1) + " IPPT each across " + fmt(r.required_ippt / r.ippt_per_spring, 0) + " springs" },
    { key: "n", id: "gdts-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGarageDoorTorsionSpring,
});

// ===================== spec-v1430: window film solar heat gain reduction =====================
// dims: in { area_sqft: L^2, shgc_before: dimensionless, shgc_after: dimensionless, peak_irradiance_btuh_sqft: M T^-3, full_sun_hours: T, eer: dimensionless, price_per_kwh: dimensionless, cost_per_sqft: dimensionless } out: { peak_reduction_btuh: M L^2 T^-3, kwh_saved: M L^2 T^-2, payback_years: T }
export function computeWindowFilmShgc({ area_sqft = 0, shgc_before = 0, shgc_after = 0, peak_irradiance_btuh_sqft = 0, full_sun_hours = 0, eer = 0, price_per_kwh = 0, cost_per_sqft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(area_sqft > 0)) return { error: "Glass area must be positive." };
  if (!(shgc_before > 0 && shgc_before <= 1)) return { error: "SHGC before film must be between 0 and 1." };
  if (!(shgc_after >= 0 && shgc_after <= 1)) return { error: "SHGC after film must be between 0 and 1." };
  if (!(shgc_after < shgc_before)) return { error: "SHGC after film must be lower than before it." };
  if (!(peak_irradiance_btuh_sqft > 0)) return { error: "Peak incident irradiance must be positive." };
  if (!(full_sun_hours > 0)) return { error: "Equivalent full-sun hours must be positive." };
  if (!(eer > 0)) return { error: "Equipment EER must be positive." };
  if (!(price_per_kwh > 0)) return { error: "Electricity price must be positive." };
  if (!(cost_per_sqft > 0)) return { error: "Installed film cost must be positive." };
  const peak_before_btuh = area_sqft * shgc_before * peak_irradiance_btuh_sqft;
  const peak_after_btuh = area_sqft * shgc_after * peak_irradiance_btuh_sqft;
  const peak_reduction_btuh = peak_before_btuh - peak_after_btuh;
  const peak_reduction_tons = peak_reduction_btuh / 12000;
  const annual_btu = peak_reduction_btuh * full_sun_hours;
  // EER is cooling BTU per watt-hour of electrical input -- that IS what it means.
  const kwh_saved = annual_btu / eer / 1000;
  const dollars_saved = kwh_saved * price_per_kwh;
  const installed_cost = area_sqft * cost_per_sqft;
  const payback_years = installed_cost / dollars_saved;
  if (![peak_reduction_btuh, peak_reduction_tons, annual_btu, kwh_saved, dollars_saved, payback_years].every(Number.isFinite)) return { error: "Window-film math is not a finite value." };
  return {
    peak_before_btuh, peak_after_btuh, peak_reduction_btuh, peak_reduction_tons,
    annual_btu, kwh_saved, dollars_saved, installed_cost, payback_years,
    note: "What window film actually buys, priced honestly. Solar heat gain coefficient is the fraction of incident solar energy that ends up as heat inside; film works by lowering it, and the saving is the DIFFERENCE, multiplied by the glass area and by how hard the sun is hitting it. That last factor is why orientation dominates -- a west exposure at 4 pm in summer is the worst case in almost every building, both because the irradiance is high and because it coincides with the peak of everything else. The two outputs answer different questions. PEAK reduction in tons is a capacity argument: a building whose cooling plant is short may avoid an equipment replacement, and a ton avoided at peak is worth far more than a ton avoided on average. ANNUAL kilowatt-hours is the operating argument, and it converts through the equipment's EER, because dividing cooling BTU by EER gives watt-hours of electrical input -- that is what EER means. Two hundred square feet of west glass going from 0.70 to 0.35 SHGC at 230 BTU/hr per sq ft removes 16,100 BTU/hr, or 1.34 tons at peak, and over 1,200 equivalent full-sun hours saves about 1,610 kWh and $225 a year against $1,800 of installed film -- eight years, which is a poor investment if energy is the only reason. But 1.34 tons of peak capacity freed in a building short of cooling, plus the glare and fading control that motivated most film jobs in the first place, is a different calculation and usually the real one. COOLING ONLY. Film lowers SHGC year-round, so in a heating-dominated climate it takes away useful winter solar gain and the annual figure here does not net that out; the true annual saving there can be near zero or negative. Equivalent full-sun hours and peak irradiance are orientation, latitude, climate, and shading dependent and must come from local data. It does not address visible light transmittance, glare, or fading, and it does not evaluate the thermal stress risk that applying absorbing film to annealed or already-stressed glass creates, which can break the glass and voids many glass warranties. The film manufacturer, the glass manufacturer's warranty terms, and a qualified installer govern.",
  };
}

export const windowFilmShgcExample = { inputs: { area_sqft: 200, shgc_before: 0.7, shgc_after: 0.35, peak_irradiance_btuh_sqft: 230, full_sun_hours: 1200, eer: 12, price_per_kwh: 0.14, cost_per_sqft: 9 } };

SPECIALTYTRADES_RENDERERS["window-film-shgc"] = _simpleRenderer({
  citation: "Citation: the solar heat gain relation, area x SHGC x incident irradiance, and the EER definition -- cooling BTU per watt-hour of electrical input -- used to convert the avoided cooling into kilowatt-hours, by name. Cooling only: the winter solar gain the film also removes is not netted out, and in a heating-dominated climate the true annual saving can be near zero or negative. The film manufacturer, the glass manufacturer's warranty terms, and a qualified installer govern.",
  example: windowFilmShgcExample.inputs,
  fields: [
    { key: "area_sqft", label: "Glass area (sq ft)", kind: "number" },
    { key: "shgc_before", label: "SHGC before film", kind: "number" },
    { key: "shgc_after", label: "SHGC after film", kind: "number" },
    { key: "peak_irradiance_btuh_sqft", label: "Peak incident irradiance (BTU/hr per sq ft)", kind: "number" },
    { key: "full_sun_hours", label: "Equivalent full-sun hours per year", kind: "number" },
    { key: "eer", label: "Cooling equipment EER", kind: "number" },
    { key: "price_per_kwh", label: "Electricity price ($/kWh)", kind: "number" },
    { key: "cost_per_sqft", label: "Installed film cost ($/sq ft)", kind: "number" },
  ],
  outputs: [
    { key: "p", id: "wfs-out-p", label: "Peak solar gain", value: (r) => fmt(r.peak_before_btuh, 0) + " BTU/hr before, " + fmt(r.peak_after_btuh, 0) + " after" },
    { key: "r", id: "wfs-out-r", label: "Peak reduction", value: (r) => fmt(r.peak_reduction_btuh, 0) + " BTU/hr = " + fmt(r.peak_reduction_tons, 2) + " tons of capacity freed" },
    { key: "a", id: "wfs-out-a", label: "Annual saving", value: (r) => fmt(r.kwh_saved, 0) + " kWh, $" + fmt(r.dollars_saved, 0) + " per year" },
    { key: "b", id: "wfs-out-b", label: "Simple payback", value: (r) => fmt(r.payback_years, 1) + " years on $" + fmt(r.installed_cost, 0) + " installed -- energy alone" },
    { key: "n", id: "wfs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWindowFilmShgc,
});

// ===================== spec-v1431: insulating glass U-factor and condensation =====================
// dims: in { lites: dimensionless, r_per_lite: dimensionless, r_gap: dimensionless, r_indoor_film: dimensionless, r_outdoor_film: dimensionless, indoor_temp_f: T, outdoor_temp_f: T, indoor_rh_pct: dimensionless } out: { r_total: dimensionless, u_factor: M T^-4, surface_temp_f: T, dew_point_f: T }
export function computeIguUFactor({ lites = 2, r_per_lite = 0.03, r_gap = 1.02, r_indoor_film = 0.68, r_outdoor_film = 0.17, indoor_temp_f = 70, outdoor_temp_f = 0, indoor_rh_pct = 40 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(lites >= 1)) return { error: "There must be at least one lite." };
  if (!(r_per_lite > 0)) return { error: "Resistance per lite must be positive." };
  if (!(r_gap > 0)) return { error: "Gap resistance must be positive." };
  if (!(r_indoor_film > 0 && r_outdoor_film > 0)) return { error: "Indoor and outdoor air film resistances must be positive." };
  if (!(indoor_temp_f > outdoor_temp_f)) return { error: "Indoor temperature must be above the outdoor temperature." };
  if (!(indoor_rh_pct > 0 && indoor_rh_pct <= 100)) return { error: "Indoor relative humidity must be between 0 and 100 percent." };
  const gaps = Math.floor(lites) - 1;
  // Everything is in SERIES, so the resistances add and U is the reciprocal.
  const r_total = r_indoor_film + r_outdoor_film + Math.floor(lites) * r_per_lite + gaps * r_gap;
  const u_factor = 1 / r_total;
  const delta_t = indoor_temp_f - outdoor_temp_f;
  const surface_temp_f = indoor_temp_f - u_factor * r_indoor_film * delta_t;
  // Magnus dew point, computed in Celsius and reported in Fahrenheit.
  const A = 17.625, B = 243.04;
  const t_in_c = (indoor_temp_f - 32) / 1.8;
  const gamma_in = Math.log(indoor_rh_pct / 100) + A * t_in_c / (B + t_in_c);
  const dew_point_c = B * gamma_in / (A - gamma_in);
  const dew_point_f = dew_point_c * 1.8 + 32;
  // The RH at which condensation would begin on THIS surface.
  const t_surf_c = (surface_temp_f - 32) / 1.8;
  const critical_rh_pct = Math.exp(A * t_surf_c / (B + t_surf_c) - A * t_in_c / (B + t_in_c)) * 100;
  const margin_f = surface_temp_f - dew_point_f;
  if (![r_total, u_factor, surface_temp_f, dew_point_f, critical_rh_pct, margin_f].every(Number.isFinite)) return { error: "Glazing U-factor math is not a finite value." };
  return {
    r_total, u_factor, surface_temp_f, dew_point_f, critical_rh_pct, margin_f, gaps,
    condenses: surface_temp_f <= dew_point_f,
    note: "The U-factor of a glazing unit and the interior glass temperature that turns it into a service call. Everything in a glazing unit is in SERIES, so the resistances add and the U-factor is the reciprocal. What is striking is how little the glass contributes: a light of glass is about R-0.03, essentially nothing, and the entire performance of an insulating unit lives in the gap and in the air films -- which is exactly why a low-emissivity coating and an argon fill work, because they attack the gap, the only meaningful resistance in the stack-up. The surface temperature line is the useful one. Interior glass runs colder than the room by a fraction of the indoor-outdoor difference, and that fraction is U times the indoor film resistance. A poor unit puts the glass far below room temperature and it condenses; a good one keeps it up. At 70 F inside and 0 F outside, a clear double-glazed unit with a half-inch air gap comes to R-1.93, U-0.518, and 45.3 F at the interior surface, while a low-e argon unit comes to R-3.04, U-0.329, and 54.3 F -- nine degrees of interior surface temperature from one coating and one gas fill. At 40 percent indoor relative humidity the dew point is about 44.6 F, so the clear unit is within a degree of running with water on it and the low-e unit has nine degrees of margin. Raise the indoor humidity to 55 percent, an ordinary winter kitchen, and the dew point climbs to about 53 F: the clear unit condenses heavily and the low-e unit is now the one within a degree of trouble. This is the honest answer to a complaint that new windows are sweating, which is usually not a window defect at all but an indoor humidity the old, leaky windows were quietly removing. CENTER-OF-GLASS PERFORMANCE ONLY, which is the best part of a window. The whole-window U-factor is worse, because the edge of the glass, the spacer, and the frame all conduct more than the center, and an NFRC-rated whole-window U-factor is the number that belongs on a code compliance form. Gap resistances depend on gap width, fill gas, coating emissivity and its surface position, and the temperature difference itself, so published values are condition-specific. Solar heat gain, air leakage, condensation resistance ratings, and the frame and sill condensation that is usually worse than the glass are all separate. NFRC ratings, the manufacturer's data, and the adopted energy code govern.",
  };
}

export const iguUFactorExample = { inputs: { lites: 2, r_per_lite: 0.03, r_gap: 1.02, r_indoor_film: 0.68, r_outdoor_film: 0.17, indoor_temp_f: 70, outdoor_temp_f: 0, indoor_rh_pct: 40 } };

SPECIALTYTRADES_RENDERERS["igu-u-factor"] = _simpleRenderer({
  citation: "Citation: series-resistance summation with the standard ASHRAE indoor and outdoor air film resistances, U = 1 / R_total, and the interior-surface temperature relation T_surface = T_in - U x R_indoor film x (T_in - T_out), by name. Dew point by the Magnus relation. Center-of-glass only: the whole-window U-factor including the edge, spacer, and frame is worse, and an NFRC rating is the number a code compliance form wants. NFRC ratings, the manufacturer's data, and the adopted energy code govern.",
  example: iguUFactorExample.inputs,
  fields: [
    { key: "lites", label: "Number of lites", kind: "number" },
    { key: "r_per_lite", label: "Resistance per lite (hr-sq ft-F/BTU)", kind: "number" },
    { key: "r_gap", label: "Resistance of each gap (hr-sq ft-F/BTU)", kind: "number" },
    { key: "r_indoor_film", label: "Indoor air film resistance", kind: "number" },
    { key: "r_outdoor_film", label: "Outdoor air film resistance", kind: "number" },
    { key: "indoor_temp_f", label: "Indoor temperature (F)", kind: "number" },
    { key: "outdoor_temp_f", label: "Outdoor temperature (F)", kind: "number", attrs: { step: "any" } },
    { key: "indoor_rh_pct", label: "Indoor relative humidity (%)", kind: "number" },
  ],
  outputs: [
    { key: "u", id: "iguu-out-u", label: "Center-of-glass R and U", value: (r) => "R-" + fmt(r.r_total, 2) + " across " + fmt(r.gaps, 0) + " gap(s), U-" + fmt(r.u_factor, 3) },
    { key: "t", id: "iguu-out-t", label: "Interior glass surface temperature", value: (r) => fmt(r.surface_temp_f, 1) + " F" },
    { key: "d", id: "iguu-out-d", label: "Indoor dew point", value: (r) => fmt(r.dew_point_f, 1) + " F -- " + (r.condenses ? "the glass CONDENSES, " + fmt(-r.margin_f, 1) + " F below the dew point" : fmt(r.margin_f, 1) + " F of margin") },
    { key: "c", id: "iguu-out-c", label: "Condensation begins at", value: (r) => fmt(r.critical_rh_pct, 1) + "% indoor relative humidity" },
    { key: "n", id: "iguu-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeIguUFactor,
});

// ===================== spec-v1434: escalator handling capacity =====================
// dims: in { speed_fpm: L T^-1, step_depth_in: L, persons_per_step: dimensionless, loading_factor: dimensionless, weight_per_person_lb: M L T^-2, design_flow_pph: T^-1 } out: { steps_per_hour: T^-1, practical_pph: T^-1, step_load_lb: M L T^-2 }
export function computeEscalatorCapacity({ speed_fpm = 0, step_depth_in = 0, persons_per_step = 1, loading_factor = 0.6, weight_per_person_lb = 150, design_flow_pph = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(speed_fpm > 0)) return { error: "Rated speed must be positive." };
  if (!(step_depth_in > 0)) return { error: "Step depth must be positive." };
  if (!(persons_per_step > 0)) return { error: "Persons per step must be positive." };
  if (!(loading_factor > 0 && loading_factor <= 1)) return { error: "Loading factor must be between 0 and 1." };
  if (!(weight_per_person_lb > 0)) return { error: "Weight per person must be positive." };
  if (!(design_flow_pph >= 0)) return { error: "Design peak flow cannot be negative." };
  const speed_fps = speed_fpm / 60;
  const step_depth_ft = step_depth_in / 12;
  const steps_per_hour = 3600 * speed_fps / step_depth_ft;
  const theoretical_pph = steps_per_hour * persons_per_step;
  // Nobody stands on every step: real throughput is commonly half to two thirds
  // of theoretical, and theoretical is nonetheless what gets quoted.
  const practical_pph = theoretical_pph * loading_factor;
  const units_needed = design_flow_pph > 0 ? Math.ceil(design_flow_pph / practical_pph - 1e-9) : 0;
  const units_theoretical = design_flow_pph > 0 ? Math.ceil(design_flow_pph / theoretical_pph - 1e-9) : 0;
  const step_load_lb = persons_per_step * weight_per_person_lb;
  if (![steps_per_hour, theoretical_pph, practical_pph, step_load_lb].every(Number.isFinite)) return { error: "Escalator capacity math is not a finite value." };
  return {
    steps_per_hour, theoretical_pph, practical_pph, units_needed, units_theoretical, step_load_lb,
    understated: units_needed > units_theoretical,
    note: "What an escalator actually moves, which is roughly half of what the theoretical number says. Throughput is a conveyor calculation: how many steps pass a point per hour, times how many people stand on each one. Speed and step depth set the first term, and step width sets the second -- a 40 in step takes two people side by side and a 24 in step takes one, so width nearly doubles capacity while costing nothing in speed. The loading factor is what makes the answer honest. Nobody stands on every step: riders leave a step or two between groups, they hesitate at the comb plate, and a 40 in step often carries one person rather than two. Real observed throughput is commonly half to two thirds of the theoretical figure, and the theoretical figure is nonetheless what gets quoted in a specification, which is how a transit station gets sized to back up onto the platform. A 40 in unit at 100 fpm on a 16 in step passes 4,500 steps an hour, which is 9,000 persons per hour theoretical and 5,400 at a 0.6 loading factor -- so a design peak of 8,000 per hour looks like it fits on one unit and needs two. Compare the two levers from there. Speeding the unit to 120 fpm raises practical capacity 20 percent and is the lever most people reach for. Going from a 24 in step to a 40 in step at the ORIGINAL speed takes practical capacity from 2,700 to 5,400 -- it doubles it, for no change in speed and no change in the ride. Step width is the design decision; speed is a refinement. Throughput arithmetic, not an escalator design or a traffic study. Loading factor is an observational figure that depends on the population: commuters with luggage, shoppers with carts, and a mixed-mobility crowd all load differently, and a transit peak loads very differently from a mall on a weekday. It does not address rise, incline angle, machine sizing, power, the queuing and run-off space at the landings that usually governs before the escalator does, or the balustrade, handrail, comb plate, and emergency stop requirements that make an escalator a code-regulated machine. Escalators are permitted, inspected equipment. ASME A17.1, the manufacturer, the traffic consultant, and the AHJ govern.",
  };
}

export const escalatorCapacityExample = { inputs: { speed_fpm: 100, step_depth_in: 16, persons_per_step: 2, loading_factor: 0.6, weight_per_person_lb: 150, design_flow_pph: 8000 } };

SPECIALTYTRADES_RENDERERS["escalator-capacity"] = _simpleRenderer({
  citation: "Citation: the escalator theoretical-capacity relation -- steps per hour = 3600 x speed / step depth, times persons per step -- and the practical loading factors published for escalator traffic design (commonly 0.5 to 0.7, with a 24 in step carrying one person and a 40 in step 1.5 to 2), by name. Throughput arithmetic, not an escalator design or a traffic study: ASME A17.1, the manufacturer, the traffic consultant, and the AHJ govern.",
  example: escalatorCapacityExample.inputs,
  fields: [
    { key: "speed_fpm", label: "Rated speed (fpm)", kind: "number" },
    { key: "step_depth_in", label: "Step depth (in)", kind: "number" },
    { key: "persons_per_step", label: "Persons per step (1 for a 24 in step, 1.5 to 2 for a 40 in step)", kind: "number" },
    { key: "loading_factor", label: "Loading factor (0 to 1)", kind: "number" },
    { key: "weight_per_person_lb", label: "Weight per person (lb)", kind: "number" },
    { key: "design_flow_pph", label: "Design peak flow to serve (persons/hr)", kind: "number" },
  ],
  outputs: [
    { key: "s", id: "esc-out-s", label: "Steps past a point", value: (r) => fmt(r.steps_per_hour, 0) + " steps per hour" },
    { key: "c", id: "esc-out-c", label: "Capacity", value: (r) => fmt(r.theoretical_pph, 0) + " persons/hr theoretical, " + fmt(r.practical_pph, 0) + " practical" },
    { key: "u", id: "esc-out-u", label: "Units for the design flow", value: (r) => r.units_needed === 0 ? "no design flow entered" : fmt(r.units_needed, 0) + " at the practical rate" + (r.understated ? ", against " + fmt(r.units_theoretical, 0) + " if the theoretical figure were believed" : "") },
    { key: "l", id: "esc-out-l", label: "Live load per step", value: (r) => fmt(r.step_load_lb, 0) + " lb" },
    { key: "n", id: "esc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeEscalatorCapacity,
});

// ===========================================================================
// spec-v1686..v1689: the 2026-09-08 trade-expansion scaffold and shoring band.
// Four tiles, all group E, into this existing module.
//
// spec-v1687 left an unrendered python placeholder `{5200*24:,.0f}` in its
// worked example (it is 124,800 ft-lb) -- the third occurrence of that defect
// in this program, after spec-v1652 and spec-v1615.
//
// `scaffold-leg-load` shares the number 4 with v1686 and means something
// different by it: there it is the OSHA 4:1 SAFETY FACTOR on a component
// rating, here it is the 4:1 HEIGHT-TO-BASE ratio. `shore-post-load` computes
// a single level's shore load from tributary area and its own citation says
// reshoring and multi-level distribution are a separate analysis -- which is
// what v1689 is.

// ============ spec-v1686: scaffold tie spacing and height-to-base ratio ============

// dims: in { scaffold_height_ft: L, base_width_ft: L, outrigger_base_ft: L, max_ratio: dimensionless, vertical_tie_spacing_ft: L, horizontal_tie_spacing_ft: L, scaffold_run_ft: L, sheeted: dimensionless } out: { height_to_base_ratio: dimensionless, max_free_standing_ft: L, first_tie_height_ft: L, tie_rows: dimensionless, ties_per_row: dimensionless, tie_count: dimensionless }
export function computeScaffoldTieSpacing({ scaffold_height_ft = 0, base_width_ft = 0, outrigger_base_ft = 0, max_ratio = 4, vertical_tie_spacing_ft = 0, horizontal_tie_spacing_ft = 0, scaffold_run_ft = 0, sheeted = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(scaffold_height_ft > 0)) return { error: "Scaffold height must be positive (ft)." };
  if (!(base_width_ft > 0)) return { error: "The minimum base dimension must be positive (ft)." };
  if (outrigger_base_ft < 0) return { error: "The outrigger effective base cannot be negative (ft)." };
  if (!(max_ratio > 0)) return { error: "The height-to-base limit must be positive; OSHA sets 4:1 for a free-standing scaffold." };
  if (vertical_tie_spacing_ft < 0 || horizontal_tie_spacing_ft < 0) return { error: "A tie spacing cannot be negative (ft)." };
  if (scaffold_run_ft < 0) return { error: "The scaffold run cannot be negative (ft)." };
  if (sheeted < 0) return { error: "The sheeted flag is 1 or 0." };
  const effective_base_ft = Math.max(base_width_ft, outrigger_base_ft);
  const height_to_base_ratio = scaffold_height_ft / effective_base_ft;
  const bare_ratio = scaffold_height_ft / base_width_ft;
  const max_free_standing_ft = max_ratio * effective_base_ft;
  const max_free_standing_bare_ft = max_ratio * base_width_ft;
  const ties_required = scaffold_height_ft > max_free_standing_ft;
  // The first tie goes at or BELOW the height where the ratio is reached; a
  // scaffold with its first tie higher has unbraced length past the limit.
  const first_tie_height_ft = ties_required ? max_free_standing_ft : null;
  const tie_rows = (ties_required && vertical_tie_spacing_ft > 0)
    ? Math.ceil((scaffold_height_ft - max_free_standing_ft) / vertical_tie_spacing_ft - 1e-9) + 1
    : (ties_required ? null : 0);
  const ties_per_row = (scaffold_run_ft > 0 && horizontal_tie_spacing_ft > 0)
    // 1926.451(c)(1)(ii): a tie at each end and intervals not over the spacing,
    // measured from one end -- ceil, not floor. Until 2026-10-01 a 119 ft run at
    // 30 ft read 4 ties with 39.7 ft gaps; OSHA requires 5.
    ? Math.ceil(scaffold_run_ft / horizontal_tie_spacing_ft - 1e-9) + 1
    : null;
  const tie_count = (tie_rows !== null && ties_per_row !== null) ? tie_rows * ties_per_row : null;
  // The base outriggers would have to reach for this height to stand alone.
  const base_to_eliminate_ties_ft = scaffold_height_ft / max_ratio;
  const outrigger_reach_needed_ft = Math.max(0, base_to_eliminate_ties_ft - base_width_ft);
  const outriggers_sufficient = outrigger_base_ft > 0 ? outrigger_base_ft >= base_to_eliminate_ties_ft - 1e-9 * Math.abs(base_to_eliminate_ties_ft) : null;
  const is_sheeted = sheeted >= 0.5;
  const outs = [effective_base_ft, height_to_base_ratio, max_free_standing_ft, base_to_eliminate_ties_ft];
  if (!outs.every(Number.isFinite)) return { error: "Scaffold tie math is not a finite value." };
  const verdict = ties_required
    ? "TIES REQUIRED: " + fmt(height_to_base_ratio, 1) + ":1 against a " + fmt(max_ratio, 0) + ":1 limit, so the FIRST tie goes at or below " + fmt(max_free_standing_ft, 1) + " ft. A first tie higher than that leaves unbraced height past the free-standing limit, which is the geometry that folds"
    : "FREE-STANDING: " + fmt(height_to_base_ratio, 1) + ":1 is inside the " + fmt(max_ratio, 0) + ":1 limit at an effective base of " + fmt(effective_base_ft, 1) + " ft, so no ties are required by the ratio";
  const outrigger_verdict = outrigger_base_ft > 0
    ? (outriggers_sufficient
      ? "Outriggers to " + fmt(outrigger_base_ft, 1) + " ft carry this height free-standing, against the " + fmt(base_to_eliminate_ties_ft, 1) + " ft needed"
      : "Outriggers to " + fmt(outrigger_base_ft, 1) + " ft raise the free-standing limit to " + fmt(max_free_standing_ft, 1) + " ft, still short of " + fmt(scaffold_height_ft, 1) + " ft -- this scaffold needs BOTH outriggers and ties")
    : "Outriggers taking the effective base to " + fmt(base_to_eliminate_ties_ft, 1) + " ft would carry this height free-standing, which is " + fmt(outrigger_reach_needed_ft, 1) + " ft of reach beyond the " + fmt(base_width_ft, 1) + " ft frame";
  const sheeting_verdict = is_sheeted
    ? "SHEETED: a scaffold wrapped in netting or shrink wrap is a sail, and the lateral load on the ties multiplies several times over. A tie pattern adequate for open frames does not carry it, and the correct action is a re-evaluated pattern from the manufacturer or a qualified person -- not the same ties with the wrap added"
    : "Open frames. If this scaffold is later wrapped, the tie pattern has to be re-evaluated before the wrap goes on, not after";
  return {
    scaffold_height_ft, base_width_ft, outrigger_base_ft, effective_base_ft,
    height_to_base_ratio, bare_ratio, max_ratio, max_free_standing_ft,
    max_free_standing_bare_ft, ties_required, first_tie_height_ft,
    vertical_tie_spacing_ft, horizontal_tie_spacing_ft, scaffold_run_ft,
    tie_rows, ties_per_row, tie_count, base_to_eliminate_ties_ft,
    outrigger_reach_needed_ft, outriggers_sufficient, sheeted: is_sheeted ? 1 : 0,
    verdict, outrigger_verdict, sheeting_verdict,
    note: "THE 4-TO-1 RATIO IS A THRESHOLD RATHER THAN A DESIGN. It is the point at which a scaffold can no longer be relied on to stand on its own, and everything above it depends on ties. The first tie therefore goes at or BELOW that height, and a scaffold erected past the ratio with its first tie somewhere higher has an unbraced length below it that is exactly the failure geometry -- the tie pattern above is irrelevant to a column that has already gone. OUTRIGGERS WORK BY WIDENING THE BASE, which is the denominator, so they raise the free-standing height directly and proportionally. A five foot wide frame is limited to twenty feet free-standing; outriggers taking the effective base to ten feet double it to forty. That is often cheaper and faster than tying, and it is why outrigger frames exist -- but the arithmetic has to be run, because a scaffold that still exceeds the ratio with outriggers on needs both. SHEETING CHANGES THE PROBLEM ENTIRELY. A scaffold covered in netting or shrink wrap becomes a sail, and the lateral load on the ties can multiply several times over. A tie pattern adequate for open frames does not carry it, and wrapping an already-erected scaffold without re-evaluating the ties is a recognized cause of collapses. The flag here is a reminder, not a wind calculation: the re-evaluated pattern comes from the manufacturer or a qualified person. AND THE TIE ITSELF HAS TO GO TO SOMETHING. A tie anchored to a window frame, a gutter, a downspout, or a piece of architectural trim is not resisting a lateral load, and that is a common finding -- the tie pattern is correct on paper, every tie is present, and every one of them is anchored to something that cannot hold it. Each tie has to reach structure capable of the load, and a tie pattern correct on the drawing and anchored to cladding is a scaffold with no ties at all. A ratio check and a tie count at spacings the reader supplies. IT IS NOT A SCAFFOLD DESIGN. Tie spacings come from the manufacturer's instructions and the applicable OSHA requirements for the scaffold type and height, and they vary; the tie's own capacity and the anchor's capacity are separate and are usually what governs. It does not compute wind load, sheeted or open; it does not address the foundation, the leg loads, the planking, the guardrails, or the access, each of which has its own requirement; and it does not cover suspended, mast climbing, or system scaffolds, whose rules differ. Scaffolds are erected and altered under the supervision of a competent person, and one is required here. OSHA 29 CFR 1926 Subpart L, the scaffold manufacturer's instructions, and the competent person govern.",
  };
}
const scaffoldTieSpacingExample = { inputs: { scaffold_height_ft: 60, base_width_ft: 5, outrigger_base_ft: 10, max_ratio: 4, vertical_tie_spacing_ft: 20, horizontal_tie_spacing_ft: 30, scaffold_run_ft: 90, sheeted: 0 } };
SPECIALTYTRADES_RENDERERS["scaffold-tie-spacing"] = _simpleRenderer({
  citation: "Citation: the OSHA 1926.451(c)(1) height-to-base rule by name -- a supported scaffold whose height exceeds four times its minimum base dimension must be restrained from tipping, so the first tie goes at or below four times the effective base, and outriggers raise that limit by widening the base. Tie SPACINGS are entered from the manufacturer's instructions and the applicable requirements for the scaffold type; the tie's own capacity and its anchorage are separate and usually govern. Sheeting multiplies the lateral load and requires a re-evaluated pattern. OSHA 29 CFR 1926 Subpart L, the scaffold manufacturer's instructions, and the competent person govern.",
  example: scaffoldTieSpacingExample.inputs,
  fields: [
    { key: "scaffold_height_ft", label: "Scaffold height (ft)", kind: "number" },
    { key: "base_width_ft", label: "Minimum base dimension (ft)", kind: "number" },
    { key: "outrigger_base_ft", label: "Least base dimension with outriggers -- the frame length if that is now shorter (ft, 0 for none; OSHA 2004-03-10)", kind: "number" },
    { key: "max_ratio", label: "Height-to-base limit", kind: "number", default: 4 },
    { key: "vertical_tie_spacing_ft", label: "Vertical tie spacing (ft, 0 to skip the count)", kind: "number" },
    { key: "horizontal_tie_spacing_ft", label: "Horizontal tie spacing (ft, 0 to skip)", kind: "number" },
    { key: "scaffold_run_ft", label: "Scaffold run (ft, 0 to skip)", kind: "number" },
    { key: "sheeted", label: "Sheeted or wrapped (1 yes, 0 no)", kind: "number", default: 0, attrs: { step: "1", min: "0", max: "1" } },
  ],
  outputs: [
    { key: "r", id: "sts-out-r", label: "Height to base", value: (r) => fmt(r.height_to_base_ratio, 1) + ":1 at an effective base of " + fmt(r.effective_base_ft, 1) + " ft" + (r.outrigger_base_ft > 0 ? " (" + fmt(r.bare_ratio, 1) + ":1 on the " + fmt(r.base_width_ft, 1) + " ft frame alone)" : "") },
    { key: "v", id: "sts-out-v", label: "Ties", value: (r) => r.verdict },
    { key: "c", id: "sts-out-c", label: "Tie count", value: (r) => r.tie_count === null ? "(enter the spacings and the run for a count)" : fmt(r.tie_count, 0) + " ties -- " + fmt(r.tie_rows, 0) + " rows at " + fmt(r.vertical_tie_spacing_ft, 0) + " ft vertically, " + fmt(r.ties_per_row, 0) + " per row at " + fmt(r.horizontal_tie_spacing_ft, 0) + " ft along a " + fmt(r.scaffold_run_ft, 0) + " ft run" },
    { key: "o", id: "sts-out-o", label: "Outriggers", value: (r) => r.outrigger_verdict },
    { key: "s", id: "sts-out-s", label: "Sheeting", value: (r) => r.sheeting_verdict },
    { key: "n", id: "sts-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeScaffoldTieSpacing,
});

// ============ spec-v1687: mast climbing work platform load distribution ============

// dims: in { platform_length_ft: L, cantilever_length_ft: L, rated_capacity_lb: M L T^-2, zone_rated_capacity_lb: M L T^-2, load_lb: M L T^-2, load_centroid_ft: L, tie_spacing_ft: L, tie_capacity_lb: M L T^-2 } out: { total_utilization_pct: dimensionless, zone_utilization_pct: dimensionless, moment_ft_lb: M L^2 T^-2, distributed_moment_ft_lb: M L^2 T^-2, tie_force_lb: M L T^-2, max_load_at_position_lb: M L T^-2 }
export function computeMastClimberPlatformLoad({ platform_length_ft = 0, cantilever_length_ft = 0, rated_capacity_lb = 0, zone_rated_capacity_lb = 0, load_lb = 0, load_centroid_ft = 0, tie_spacing_ft = 0, tie_capacity_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(platform_length_ft > 0)) return { error: "Platform length must be positive (ft)." };
  if (cantilever_length_ft < 0) return { error: "Cantilever length cannot be negative (ft)." };
  if (!(2 * cantilever_length_ft < platform_length_ft)) return { error: "The two cantilever ends cannot take up the whole platform; the mast bay is what is left between them." };
  if (!(rated_capacity_lb > 0)) return { error: "The platform's rated live load must be positive (lb)." };
  if (zone_rated_capacity_lb < 0) return { error: "A zone rating cannot be negative (lb)." };
  if (!(load_lb > 0)) return { error: "The load must be positive (lb)." };
  if (load_centroid_ft < 0) return { error: "The load's distance from the mast cannot be negative (ft)." };
  if (!(load_centroid_ft <= platform_length_ft / 2)) return { error: "The load cannot sit beyond the end of the platform." };
  if (tie_spacing_ft < 0) return { error: "Mast tie spacing cannot be negative (ft)." };
  if (tie_capacity_lb < 0) return { error: "Tie capacity cannot be negative (lb)." };
  const half_platform_ft = platform_length_ft / 2;
  const total_utilization_pct = load_lb / rated_capacity_lb * 100;
  const within_total = load_lb <= rated_capacity_lb + 1e-9 * Math.abs(rated_capacity_lb);
  // A mast climber is a cantilever, and the rating is stated for a defined
  // distribution. The same total at the outboard end is a different structure.
  const moment_ft_lb = load_lb * load_centroid_ft;
  // Spread evenly over the platform, the centroid of each half sits at a
  // quarter of the length, and the two halves oppose -- so the moment about a
  // centre mast is essentially nothing.
  const distributed_moment_ft_lb = 0;
  const on_cantilever = cantilever_length_ft > 0 && load_centroid_ft > half_platform_ft - cantilever_length_ft;
  const zone_utilization_pct = zone_rated_capacity_lb > 0 ? load_lb / zone_rated_capacity_lb * 100 : null;
  const within_zone = zone_rated_capacity_lb > 0 ? load_lb <= zone_rated_capacity_lb + 1e-9 * Math.abs(zone_rated_capacity_lb) : null;
  const max_load_at_position_lb = zone_rated_capacity_lb > 0 && on_cantilever ? zone_rated_capacity_lb : rated_capacity_lb;
  // The moment ends up in the ties to the building at their spacing.
  const tie_force_lb = tie_spacing_ft > 0 ? moment_ft_lb / tie_spacing_ft : null;
  const tie_utilization_pct = (tie_force_lb !== null && tie_capacity_lb > 0) ? tie_force_lb / tie_capacity_lb * 100 : null;
  const tie_ok = (tie_force_lb !== null && tie_capacity_lb > 0) ? tie_force_lb <= tie_capacity_lb + 1e-9 * Math.abs(tie_capacity_lb) : null;
  const outs = [total_utilization_pct, moment_ft_lb, max_load_at_position_lb];
  if (!outs.every(Number.isFinite)) return { error: "Mast climber load math is not a finite value." };
  const total_verdict = within_total
    ? "TOTAL WITHIN RATING: " + fmt(load_lb, 0) + " lb against " + fmt(rated_capacity_lb, 0) + " lb, " + fmt(total_utilization_pct, 0) + "% -- and the scale is not the check"
    : "TOTAL OVER RATING: " + fmt(load_lb, 0) + " lb against " + fmt(rated_capacity_lb, 0) + " lb";
  const zone_verdict = within_zone === null
    ? "Enter the zone's rated capacity from the manufacturer's load chart. Cantilever ends carry a small fraction of the platform's rating."
    : within_zone
      ? "ZONE WITHIN RATING: " + fmt(load_lb, 0) + " lb against a zone rating of " + fmt(zone_rated_capacity_lb, 0) + " lb, " + fmt(zone_utilization_pct, 0) + "%"
      : within_total
        ? "ZONE EXCEEDED WHILE THE TOTAL IS WITHIN CAPACITY: " + fmt(load_lb, 0) + " lb on a zone rated " + fmt(zone_rated_capacity_lb, 0) + " lb, " + fmt(zone_utilization_pct, 0) + "% of it. The scale says the load is fine and the structure says it is not -- this is the case the load chart exists for"
        : "ZONE EXCEEDED, AND THE TOTAL IS OVER THE PLATFORM RATING TOO: " + fmt(load_lb, 0) + " lb on a zone rated " + fmt(zone_rated_capacity_lb, 0) + " lb, " + fmt(zone_utilization_pct, 0) + "% of it";
  const tie_verdict = tie_ok === null
    ? "Enter the mast tie spacing and capacity to carry the moment into the ties."
    : tie_ok
      ? "TIES OK: " + fmt(tie_force_lb, 0) + " lb per tie at " + fmt(tie_spacing_ft, 0) + " ft spacing, against " + fmt(tie_capacity_lb, 0) + " lb rated, " + fmt(tie_utilization_pct, 0) + "%"
      : "TIES OVERLOADED: " + fmt(tie_force_lb, 0) + " lb per tie at " + fmt(tie_spacing_ft, 0) + " ft spacing, against " + fmt(tie_capacity_lb, 0) + " lb rated. Everything the platform carries ends up here";
  return {
    platform_length_ft, cantilever_length_ft, half_platform_ft, rated_capacity_lb,
    zone_rated_capacity_lb, load_lb, load_centroid_ft, on_cantilever,
    total_utilization_pct, within_total, zone_utilization_pct, within_zone,
    moment_ft_lb, distributed_moment_ft_lb, max_load_at_position_lb,
    tie_spacing_ft, tie_capacity_lb, tie_force_lb, tie_utilization_pct, tie_ok,
    total_verdict, zone_verdict, tie_verdict,
    note: "A MAST CLIMBER IS A CANTILEVER, and the manufacturer's capacity is stated for a defined load distribution. Placing the same total load at the outboard edge, or all of it on one cantilevered end, produces a moment the platform and mast were never rated for even though the scale says the load is within capacity. That distinction is the difference between the rated number and a safe load, and it is why manufacturers publish load charts BY ZONE rather than as a single figure -- a platform with a six thousand pound rating does not have six thousand pounds of capacity anywhere on it. MASONRY WORK IS THE CASE THAT STRESSES IT. A platform staged with cubes of block and a mixer is carrying a very large concentrated load, placed by a forklift at whatever spot is accessible, and it is easy to exceed a zone's rating while the total remains comfortably under the platform's. Marking the platform with its zone limits, and staging to them, is what keeps that from being a judgment made by whoever is driving the lift -- and it is why the material delivery sequence on a mast climber job is a safety document rather than a logistics one. THE MAST TIES ARE WHERE THE MOMENT ENDS UP. Everything the platform carries, and everything the wind pushes, becomes a load in the ties to the building at their spacing, so the tie pattern is part of the load path and not an incidental detail. Ties anchored into cladding rather than structure, or spaced beyond the manufacturer's interval, are the failure that no load chart can see. The same load spread evenly across the platform produces essentially no moment about a centre mast and leaves every zone within its rating -- same weight, same platform, entirely different structure. A screening comparison of a load and its position against ratings the reader takes from the manufacturer's load chart. IT IS NOT A LOAD CHART and it does not generate one: zone boundaries and zone ratings are the manufacturer's, they differ between machines and between configurations, and a chart from a similar machine is not this machine's chart. It does not compute wind load on the platform or on any sheeting, evaluate the mast's own capacity or its erected height limits, or address the base, the foundation, or the tie anchorage into the structure. It does not cover twin-mast configurations, bridging, or platform extensions, each of which has its own chart. The manufacturer's load chart and erection manual, the competent person, and the erector's engineering govern.",
  };
}
const mastClimberPlatformLoadExample = { inputs: { platform_length_ft: 40, cantilever_length_ft: 8, rated_capacity_lb: 6000, zone_rated_capacity_lb: 1500, load_lb: 5200, load_centroid_ft: 16, tie_spacing_ft: 25, tie_capacity_lb: 4000 } };
SPECIALTYTRADES_RENDERERS["mast-climber-platform-load"] = _simpleRenderer({
  citation: "Citation: the cantilever load-distribution relations by name -- utilization against the platform's total rating and against the ZONE rating for the load's position, the moment about the mast as load x distance, and the tie force as that moment over the mast tie spacing. ZONE RATINGS ARE THE MANUFACTURER'S and are entered: cantilever ends carry a small fraction of the platform's rating, and a load within the total can exceed a zone. It does not compute wind load, mast capacity, or tie anchorage. The manufacturer's load chart and erection manual, the competent person, and the erector's engineering govern.",
  example: mastClimberPlatformLoadExample.inputs,
  fields: [
    { key: "platform_length_ft", label: "Platform length (ft)", kind: "number" },
    { key: "cantilever_length_ft", label: "Cantilever length at each end (ft)", kind: "number" },
    { key: "rated_capacity_lb", label: "Platform rated live load (lb)", kind: "number" },
    { key: "zone_rated_capacity_lb", label: "Zone rated capacity at the load's position (lb, 0 to skip)", kind: "number" },
    { key: "load_lb", label: "Load placed (lb)", kind: "number" },
    { key: "load_centroid_ft", label: "Load centroid from the mast (ft)", kind: "number" },
    { key: "tie_spacing_ft", label: "Mast tie spacing (ft, 0 to skip)", kind: "number" },
    { key: "tie_capacity_lb", label: "Tie rated capacity (lb, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "t", id: "mcpl-out-t", label: "Against the platform rating", value: (r) => r.total_verdict },
    { key: "z", id: "mcpl-out-z", label: "Against the zone rating", value: (r) => r.zone_verdict },
    { key: "m", id: "mcpl-out-m", label: "Moment about the mast", value: (r) => fmt(r.moment_ft_lb, 0) + " ft-lb from " + fmt(r.load_lb, 0) + " lb at " + fmt(r.load_centroid_ft, 1) + " ft" + (r.on_cantilever ? ", which is out on a cantilever end" : ", inside the mast bay") },
    { key: "d", id: "mcpl-out-d", label: "The same load spread evenly", value: (r) => "about " + fmt(r.distributed_moment_ft_lb, 0) + " ft-lb about a centre mast" + (r.within_total ? ", and every zone within its rating. Same weight, same platform, entirely different structure" : ", but the total is over the platform rating, so spreading it does not make it a permitted load") },
    { key: "k", id: "mcpl-out-k", label: "Into the ties", value: (r) => r.tie_verdict },
    { key: "n", id: "mcpl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMastClimberPlatformLoad,
});

// ============ spec-v1688: suspended scaffold outrigger counterweight ============

// dims: in { rated_load_lb: M L T^-2, outboard_arm_ft: L, inboard_arm_ft: L, factor_of_safety: dimensionless, counterweight_unit_lb: M L T^-2, target_counterweight_lb: M L T^-2, hoist_stall_load_lb: M L T^-2 } out: { lever_ratio: dimensionless, stall_counterweight_lb: M L T^-2, overturning_moment_ft_lb: M L^2 T^-2, required_counterweight_lb: M L T^-2, counterweight_units: dimensionless, resisting_moment_ft_lb: M L^2 T^-2, inboard_for_target_ft: L }
export function computeSuspendedScaffoldCounterweight({ rated_load_lb = 0, outboard_arm_ft = 0, inboard_arm_ft = 0, factor_of_safety = 4, counterweight_unit_lb = 0, target_counterweight_lb = 0, hoist_stall_load_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rated_load_lb > 0)) return { error: "The hoist's RATED load must be positive (lb) -- not its empty weight, and not what happens to be on it today." };
  if (!(outboard_arm_ft > 0)) return { error: "The outboard arm must be positive (ft)." };
  if (!(inboard_arm_ft > 0)) return { error: "The inboard arm must be positive (ft)." };
  // 29 CFR 1926.451(a)(2): the counterweights resist at least 4 times the tipping moment at the
  // hoist's rated load. Until 2026-10-03 any factor from 1 up was accepted.
  if (!(factor_of_safety >= 4 - 1e-9 * 4)) return { error: "The factor of safety against tipping must be at least 4 (29 CFR 1926.451(a)(2))." };
  if (counterweight_unit_lb < 0) return { error: "The counterweight unit weight cannot be negative (lb)." };
  if (target_counterweight_lb < 0) return { error: "The target counterweight cannot be negative (lb)." };
  if (hoist_stall_load_lb < 0) return { error: "The hoist stall load cannot be negative (lb)." };
  const lever_ratio = outboard_arm_ft / inboard_arm_ft;
  const overturning_moment_ft_lb = rated_load_lb * outboard_arm_ft;
  const balance_counterweight_lb = rated_load_lb * lever_ratio;
  // 29 CFR 1926.451(a)(2): at least 4 times the tipping moment at the hoist's RATED load, or 1.5 times
  // the tipping moment at its STALL load, whichever is greater. Until 2026-09-25 only the first test was
  // applied; the stall test governs once the stall load exceeds 2.67 times the rated load.
  const stall_counterweight_lb = hoist_stall_load_lb * lever_ratio * 1.5;
  const stall_governs = stall_counterweight_lb > balance_counterweight_lb * factor_of_safety;
  const required_counterweight_lb = Math.max(balance_counterweight_lb * factor_of_safety, stall_counterweight_lb);
  const counterweight_units = counterweight_unit_lb > 0 ? Math.ceil(required_counterweight_lb / counterweight_unit_lb - 1e-9) : null;
  const provided_counterweight_lb = counterweight_units === null ? required_counterweight_lb : counterweight_units * counterweight_unit_lb;
  const resisting_moment_ft_lb = provided_counterweight_lb * inboard_arm_ft;
  const achieved_fos = overturning_moment_ft_lb > 0 ? resisting_moment_ft_lb / overturning_moment_ft_lb : null;
  // Worked backwards: the inboard arm that would bring the counterweight to a
  // target, which is the lever the arithmetic actually gives you to pull.
  const inboard_for_target_ft = target_counterweight_lb > 0
    ? Math.max(rated_load_lb * factor_of_safety, hoist_stall_load_lb * 1.5) * outboard_arm_ft / target_counterweight_lb
    : null;
  const outs = [lever_ratio, overturning_moment_ft_lb, required_counterweight_lb, resisting_moment_ft_lb];
  if (!outs.every(Number.isFinite)) return { error: "Counterweight math is not a finite value." };
  const verdict = "REQUIRED: " + fmt(required_counterweight_lb, 0) + " lb per outrigger" + (stall_governs ? " (the 1.5x stall-load test governs) -- " : " -- ") + fmt(rated_load_lb, 0) + " lb of rated load at a " + fmt(lever_ratio, 2) + ":1 lever disadvantage, times a " + fmt(factor_of_safety, 1) + ":1 factor"
    + (counterweight_units === null ? "" : ", which is " + fmt(counterweight_units, 0) + " units of " + fmt(counterweight_unit_lb, 0) + " lb (" + fmt(provided_counterweight_lb, 0) + " lb provided, " + fmt(achieved_fos, 2) + ":1 achieved)");
  return {
    rated_load_lb, outboard_arm_ft, inboard_arm_ft, lever_ratio, factor_of_safety,
    overturning_moment_ft_lb, balance_counterweight_lb, required_counterweight_lb, hoist_stall_load_lb, stall_counterweight_lb, stall_governs,
    counterweight_unit_lb, counterweight_units, provided_counterweight_lb,
    resisting_moment_ft_lb, achieved_fos, target_counterweight_lb, inboard_for_target_ft, verdict,
    note: "THE LEVER RATIO IS WHAT MAKES THE COUNTERWEIGHT LARGE, and it is why crews consistently underestimate it: the physical weight looks absurd next to the platform. An outrigger reaching eighteen inches inboard and six feet outboard carries a four-to-one disadvantage before any factor of safety, so a fifteen hundred pound suspended load needs six thousand pounds just to balance -- and a four-to-one factor against overturning puts the requirement into the tens of thousands per outrigger. Shortening the outboard reach or lengthening the inboard arm are the only two levers, and the inboard arm needed for a target counterweight is reported here because that is the one a crew can usually move. THE LOAD TO USE IS THE PLATFORM'S RATED LOAD, not what happens to be on it. The scaffold is designed to carry that load and the counterweight has to hold it down whether or not today's crew intends to use it -- a counterweight sized for two workers is inadequate the day someone stages material, and nobody re-runs the arithmetic before doing that. TWO REQUIREMENTS SIT ALONGSIDE THE WEIGHT AND ARE NOT SUBSTITUTES FOR IT. Counterweights must be non-flowable and secured to the outrigger: sand bags, water containers, masonry units, and loose material are prohibited because they leak, are removed, or get borrowed for other work, and a counterweight that walks away is the classic failure on this equipment. And a TIEBACK to independent structural anchorage is required in addition to the counterweight, so that the outrigger cannot slide or rotate even if the counterweight is disturbed. The anchorage that tieback goes to has its own requirement and is not a parapet clamp on a cornice. A static moment balance on one outrigger. It does not design the outrigger, the beam, its bearing on the roof, or the roof's ability to take the concentrated loads at both ends -- a counterweight of this size sitting on a roof is itself a structural question. It does not address the tieback capacity or its anchorage, the suspension ropes, the hoists, the secondary lines, or the personal fall arrest that is required independently of everything here. It does not cover parapet clamps, roof cars, or transportable outrigger systems, each of which has its own criteria. Suspended scaffolds kill people. OSHA 29 CFR 1926 Subpart L, the manufacturer's instructions, and the qualified person who designs the rigging govern.",
  };
}
const suspendedScaffoldCounterweightExample = { inputs: { rated_load_lb: 1500, outboard_arm_ft: 6, inboard_arm_ft: 1.5, factor_of_safety: 4, counterweight_unit_lb: 50, target_counterweight_lb: 12000 } };
SPECIALTYTRADES_RENDERERS["suspended-scaffold-counterweight"] = _simpleRenderer({
  citation: "Citation: 29 CFR 1926.451(a)(2) -- counterweights resist at least 4 times the tipping moment at the hoist's rated load, or 1.5 times the tipping moment at its stall load, whichever is greater -- applied through the outrigger moment balance: required counterweight = the larger of rated load x 4 and stall load x 1.5, times (outboard / inboard). The load used is the platform's RATED load, not its empty weight. Counterweights must be non-flowable and secured, and a tieback to independent structural anchorage is required IN ADDITION and is not a substitute. OSHA 29 CFR 1926 Subpart L, the manufacturer's instructions, and the qualified person who designs the rigging govern.",
  example: suspendedScaffoldCounterweightExample.inputs,
  fields: [
    { key: "rated_load_lb", label: "Hoist RATED load (lb)", kind: "number" },
    { key: "hoist_stall_load_lb", label: "Hoist STALL load (lb, 0 if unknown; 1926.451(a)(2) checks 1.5x it)", kind: "number", default: 0 },
    { key: "outboard_arm_ft", label: "Outboard arm (ft)", kind: "number" },
    { key: "inboard_arm_ft", label: "Inboard arm (ft)", kind: "number" },
    { key: "factor_of_safety", label: "Factor of safety against overturning", kind: "number", default: 4 },
    { key: "counterweight_unit_lb", label: "Counterweight unit weight (lb, 0 to skip the count)", kind: "number" },
    { key: "target_counterweight_lb", label: "Target counterweight to solve the arm for (lb, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "l", id: "ssc-out-l", label: "Lever disadvantage", value: (r) => fmt(r.lever_ratio, 2) + ":1 -- " + fmt(r.outboard_arm_ft, 2) + " ft out against " + fmt(r.inboard_arm_ft, 2) + " ft in" },
    { key: "m", id: "ssc-out-m", label: "Overturning moment", value: (r) => fmt(r.overturning_moment_ft_lb, 0) + " ft-lb at the rated load" },
    { key: "v", id: "ssc-out-v", label: "Counterweight required", value: (r) => r.verdict },
    { key: "b", id: "ssc-out-b", label: "Bare balance, before the factor", value: (r) => fmt(r.balance_counterweight_lb, 0) + " lb would only just hold it -- the factor is what makes it safe" },
    { key: "i", id: "ssc-out-i", label: "Inboard arm for a target", value: (r) => r.inboard_for_target_ft === null ? "(no target entered)" : fmt(r.inboard_for_target_ft, 2) + " ft of inboard arm brings the requirement to " + fmt(r.target_counterweight_lb, 0) + " lb. Lengthening the inboard arm is usually the only lever a crew can move" },
    { key: "n", id: "ssc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSuspendedScaffoldCounterweight,
});

// ============ spec-v1689: slab shoring and reshoring load distribution ============

// dims: in { slab_dead_psf: M L^-1 T^-2, construction_live_psf: M L^-1 T^-2, form_dead_psf: M L^-1 T^-2, connected_levels: dimensionless, backshored: dimensionless, governing_slab_capacity_psf: M L^-1 T^-2, governing_slab_strength_psi: M L^-1 T^-2 } out: { new_pour_load_psf: M L^-1 T^-2, redistributed_load_psf: M L^-1 T^-2, share_per_level_psf: M L^-1 T^-2, governing_level_load_psf: M L^-1 T^-2, capacity_margin_psf: M L^-1 T^-2, levels_required: dimensionless }
export function computeShoringReshoringLoad({ slab_dead_psf = 0, construction_live_psf = 0, form_dead_psf = 0, connected_levels = 0, backshored = 0, governing_slab_capacity_psf = 0, governing_slab_strength_psi = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(slab_dead_psf > 0)) return { error: "The slab dead load must be positive (psf)." };
  if (construction_live_psf < 0) return { error: "Construction live load cannot be negative (psf)." };
  if (form_dead_psf < 0) return { error: "Formwork dead load cannot be negative (psf)." };
  if (!(connected_levels >= 1)) return { error: "There must be at least one supporting level connected by shores." };
  if (backshored < 0) return { error: "The backshore flag is 1 or 0." };
  if (governing_slab_capacity_psf < 0) return { error: "The governing slab's capacity cannot be negative (psf)." };
  if (governing_slab_strength_psi < 0) return { error: "The governing slab's strength cannot be negative (psi)." };
  const N = Math.round(connected_levels);
  const is_backshored = backshored >= 0.5;
  // The new pour is what the shores put into the stack: wet concrete, the
  // forms, and the crew and equipment on them.
  const new_pour_load_psf = slab_dead_psf + form_dead_psf + construction_live_psf;
  // A RESHORE is placed after the slab above has been stripped and allowed to
  // deflect, so that slab already carries its own weight and the reshore takes
  // only what is added afterwards. A BACKSHORE never permitted that
  // deflection, so the slab's own dead load is still in the stack.
  const redistributed_load_psf = new_pour_load_psf + (is_backshored ? slab_dead_psf : 0);
  // Equal stiffness across the connected slabs is the standard simplifying
  // assumption, and it makes the share a straight division.
  const share_per_level_psf = redistributed_load_psf / N;
  const governing_level_load_psf = slab_dead_psf + share_per_level_psf;
  const capacity_margin_psf = governing_slab_capacity_psf > 0 ? governing_slab_capacity_psf - governing_level_load_psf : null;
  const within_capacity = governing_slab_capacity_psf > 0 ? governing_level_load_psf <= governing_slab_capacity_psf + 1e-9 * Math.abs(governing_slab_capacity_psf) : null;
  const utilization_pct = governing_slab_capacity_psf > 0 ? governing_level_load_psf / governing_slab_capacity_psf * 100 : null;
  // Levels needed to bring the governing slab inside capacity. Below its own
  // dead load no number of levels helps, which is a different problem.
  const headroom_psf = governing_slab_capacity_psf - slab_dead_psf;
  const levels_required = (governing_slab_capacity_psf > 0 && headroom_psf > 0)
    ? Math.max(1, Math.ceil(redistributed_load_psf / headroom_psf - 1e-9))
    : null;
  const capacity_below_dead = governing_slab_capacity_psf > 0 && headroom_psf <= 0;
  // The same stack read the other way, so the distinction is visible.
  const other_case_load_psf = slab_dead_psf + (new_pour_load_psf + (is_backshored ? 0 : slab_dead_psf)) / N;
  const outs = [new_pour_load_psf, redistributed_load_psf, share_per_level_psf, governing_level_load_psf];
  if (!outs.every(Number.isFinite)) return { error: "Shoring distribution math is not a finite value." };
  const verdict = within_capacity === null
    ? "Enter the governing slab's capacity at its age today to check it."
    : capacity_below_dead
      ? "THE SLAB CANNOT CARRY ITS OWN WEIGHT at " + fmt(governing_slab_capacity_psf, 0) + " psf against a " + fmt(slab_dead_psf, 0) + " psf dead load. No number of shoring levels fixes that; the slab is too young to strip at all"
      : within_capacity
        ? "WITHIN CAPACITY: the governing level carries " + fmt(governing_level_load_psf, 0) + " psf against " + fmt(governing_slab_capacity_psf, 0) + " psf at its age today, " + fmt(utilization_pct, 0) + "%"
        : "OVERLOADED by " + fmt(-capacity_margin_psf, 0) + " psf: the governing level carries " + fmt(governing_level_load_psf, 0) + " psf against " + fmt(governing_slab_capacity_psf, 0) + " psf at its age today. " + fmt(levels_required, 0) + " connected levels are needed instead of " + fmt(N, 0);
  const case_verdict = is_backshored
    ? "BACKSHORED: the slabs were stripped and reshored without permitting deflection, so each still carries a share of the dead load above it. Read as reshores instead, the governing level would carry " + fmt(other_case_load_psf, 0) + " psf"
    : "RESHORED: the slabs were stripped and allowed to deflect first, so each already carries its own weight and the shores take only what is added afterwards. Read as backshores instead, the governing level would carry " + fmt(other_case_load_psf, 0) + " psf";
  return {
    slab_dead_psf, construction_live_psf, form_dead_psf, new_pour_load_psf,
    connected_levels: N, backshored: is_backshored ? 1 : 0, redistributed_load_psf,
    share_per_level_psf, governing_level_load_psf, governing_slab_capacity_psf,
    capacity_margin_psf, within_capacity, utilization_pct, levels_required,
    capacity_below_dead, governing_slab_strength_psi, other_case_load_psf,
    verdict, case_verdict,
    note: "A slab poured on shores does not load the slab directly below it; it loads the whole stack of levels the shores connect, and the load is shared among them. THE DISTINCTION BETWEEN RESHORING AND BACKSHORING IS THE ONE THAT GETS LOST, and it changes the arithmetic completely. A RESHORE is installed after the slab above has been stripped and allowed to DEFLECT and carry its own weight, so it carries only loads added afterwards. A BACKSHORE is installed without permitting that deflection -- typically by stripping and reshoring in small areas -- so it continues to carry a share of the slab's own dead load as well. Treating a backshore as a reshore, or the reverse, misallocates the load through the whole stack, and both readings are computed here so the difference is a number rather than a word. GETTING IT WRONG IS NOT CONSERVATIVE IN A PREDICTABLE DIRECTION: it can under-count the load on a level or over-count it, and the design of the sequence depends on which it is. THE CONSEQUENCE IS A SLAB LOADED BEYOND ITS CAPACITY AT ITS AGE. A young slab has a fraction of its 28 day strength, and construction loads -- the wet concrete above, plus the forms, plus the crew and equipment -- are often the largest loads the slab will ever see in its life. Multi-storey construction failures during placement are a recognized category and the shoring sequence is usually at the centre of them. The governing level is the youngest supporting slab, because it is the one whose capacity today is furthest below its design capacity. AND THE STRENGTH TO USE IS FIELD-CURED CYLINDERS that experienced the same conditions as the slab, not laboratory-cured ones. A slab poured in cold weather is far behind lab cylinders that sat in a warm curing tank, and stripping to a laboratory strength on a cold weather pour is stripping to a strength the slab does not have. That is the trap that turns a correct calculation into a collapse. EQUAL STIFFNESS ACROSS THE CONNECTED SLABS IS THE SIMPLIFYING ASSUMPTION HERE and it is the standard first-order one, which makes the share a straight division by the number of connected levels. A real analysis follows the construction sequence step by step, tracks each slab's stiffness at its actual age, and accounts for shore stiffness and for the fact that the lower slabs are older and stiffer and therefore take more than an equal share. This is a screen against that, not a substitute for it. It does not design the shores, which is a separate calculation from tributary area, or evaluate slab punching, deflection, or cracking under construction load; it does not set stripping times; and it does not address post-tensioned slabs, whose stripping and reshoring rules differ, or the lateral bracing of the shoring stack. ACI 347 and ACI 347.2R, the shoring designer's sequence drawings, the field-cured cylinder breaks, and the engineer of record govern.",
  };
}
const shoringReshoringLoadExample = { inputs: { slab_dead_psf: 100, construction_live_psf: 50, form_dead_psf: 10, connected_levels: 3, backshored: 0, governing_slab_capacity_psf: 200, governing_slab_strength_psi: 2500 } };
SPECIALTYTRADES_RENDERERS["shoring-reshoring-load"] = _simpleRenderer({
  citation: "Citation: the ACI 347.2R shoring and reshoring load distribution by name, taken at the standard first-order EQUAL STIFFNESS assumption -- the load a new pour puts into the stack is shared equally among the connected levels, so each supporting slab carries its own dead load plus that share. A RESHORE is placed after the slab above has deflected and carries only later loads; a BACKSHORE never permitted that deflection and still carries a share of the dead load, and both readings are reported. The slab's capacity must come from FIELD-CURED cylinders at its age today, not laboratory-cured ones. A screen, not a sequence analysis. ACI 347 and ACI 347.2R, the shoring designer's sequence drawings, the field-cured cylinder breaks, and the engineer of record govern.",
  example: shoringReshoringLoadExample.inputs,
  fields: [
    { key: "slab_dead_psf", label: "Slab dead load (psf)", kind: "number" },
    { key: "construction_live_psf", label: "Construction live load (psf)", kind: "number" },
    { key: "form_dead_psf", label: "Formwork dead load (psf)", kind: "number" },
    { key: "connected_levels", label: "Levels connected by shores", kind: "number" },
    { key: "backshored", label: "Backshored rather than reshored (1 yes, 0 no)", kind: "number", default: 0, attrs: { step: "1", min: "0", max: "1" } },
    { key: "governing_slab_capacity_psf", label: "Governing slab capacity at its age today (psf, 0 to skip)", kind: "number" },
    { key: "governing_slab_strength_psi", label: "Governing slab strength from field-cured cylinders (psi)", kind: "number" },
  ],
  outputs: [
    { key: "p", id: "srl-out-p", label: "What the new pour puts in", value: (r) => fmt(r.new_pour_load_psf, 0) + " psf -- " + fmt(r.slab_dead_psf, 0) + " of wet slab, " + fmt(r.form_dead_psf, 0) + " of forms, " + fmt(r.construction_live_psf, 0) + " of crew and equipment" },
    { key: "s", id: "srl-out-s", label: "Share per level", value: (r) => fmt(r.share_per_level_psf, 1) + " psf across " + fmt(r.connected_levels, 0) + " connected levels, of " + fmt(r.redistributed_load_psf, 0) + " psf redistributed" },
    { key: "g", id: "srl-out-g", label: "The governing level carries", value: (r) => fmt(r.governing_level_load_psf, 1) + " psf -- its own " + fmt(r.slab_dead_psf, 0) + " psf plus its share" },
    { key: "v", id: "srl-out-v", label: "Against its capacity today", value: (r) => r.verdict },
    { key: "c", id: "srl-out-c", label: "Reshore or backshore", value: (r) => r.case_verdict },
    { key: "n", id: "srl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeShoringReshoringLoad,
});
