// Group G (cont.) and Group J: snow and ice management bench.
// spec-v1845..v1850 (scope-trade-expansion-3) establish this new lazy-loaded
// renderer module for the arithmetic a winter operations crew does: how much
// salt a pavement temperature calls for, what a brine batch has to be mixed
// to, how long a plow route takes and how many trucks that costs, where the
// plowed snow goes, when a deicer stops working, and whether a walk crew
// makes its window. Tiles:
//   v1845 salt-application-rate   v1846 brine-batch-salinity
//   v1847 plow-route-cycle-time   v1848 snow-stacking-area
//   v1849 ice-melt-working-temperature
//   v1850 walkway-clearing-productivity
// Five keep group: "G" and plow-route-cycle-time takes "J" (a tile's group
// letter is independent of the module that holds it -- the v28/v70..v100
// split precedent). All GOVERNANCE.general quantity arithmetic: the agency
// policy, a verified spreader calibration, the site snow plan, the product
// supplier, and the contractor's own records govern. See spec-v1845.md
// through spec-v1850.md.
import {
  DEBOUNCE_MS, debounce, makeNumber,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";

// v18 §7 contract guard: reject a non-finite numeric input (copied
// verbatim from the sibling calc-* modules; non-exported, no corpus row).
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

// Compact renderer factory (number inputs only here; same shape as the
// calc-disinfect.js / calc-finish.js _simpleRenderer).
function _simpleRenderer(spec) {
  const _rlRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      const field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) field.input.value = String(f.default);
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) params[f.key] = Number(fields[f.key].input.value) || 0;
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) fields[f.key].input.addEventListener("input", update);
  };

  _rlRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}


export const WINTEROPS_RENDERERS = {};

// One lane-mile is one 12 ft lane one mile long: 12 x 5,280 = 63,360 sq ft.
// It is the basis every published application rate is written against.
const _SQFT_PER_LANE_MILE = 63360;
const _LB_PER_TON = 2000;
const _CUFT_PER_CY = 27;

// ===================== spec-v1845: deicing salt application rate =====================

// dims: in { rate_lb_per_lane_mile: M L^-2, route_lane_miles: L, lot_area_ft2: L^2, hopper_capacity_tons: M, alt_rate_lb_per_lane_mile: M L^-2 } out: { material_lb_per_pass: M, passes_per_load: dimensionless, lot_lane_miles: L, lot_material_lb: M }
export function computeSaltApplicationRate({ rate_lb_per_lane_mile = 0, route_lane_miles = 0, lot_area_ft2 = 0, hopper_capacity_tons = 0, alt_rate_lb_per_lane_mile = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rate_lb_per_lane_mile > 0)) return { error: "Application rate must be positive (lb per lane-mile)." };
  if (!(route_lane_miles > 0)) return { error: "Route length must be positive (lane-miles)." };
  if (!(hopper_capacity_tons > 0)) return { error: "Spreader hopper capacity must be positive (tons)." };
  if (lot_area_ft2 < 0) return { error: "Lot area cannot be negative (sq ft)." };
  const material_lb_per_pass = rate_lb_per_lane_mile * route_lane_miles;
  const material_tons_per_pass = material_lb_per_pass / _LB_PER_TON;
  const hopper_lb = hopper_capacity_tons * _LB_PER_TON;
  const passes_per_load = hopper_lb / material_lb_per_pass;
  const reloads_per_pass = 1 / passes_per_load;
  const compared = alt_rate_lb_per_lane_mile > 0;
  const alt_material_lb_per_pass = compared ? alt_rate_lb_per_lane_mile * route_lane_miles : null;
  const alt_passes_per_load = compared ? hopper_lb / alt_material_lb_per_pass : null;
  const alt_reloads_per_pass = compared ? 1 / alt_passes_per_load : null;
  const rate_ratio = compared ? alt_rate_lb_per_lane_mile / rate_lb_per_lane_mile : null;
  const lot_used = lot_area_ft2 > 0;
  const lot_lane_miles = lot_used ? lot_area_ft2 / _SQFT_PER_LANE_MILE : null;
  const lot_material_lb = lot_used ? lot_lane_miles * rate_lb_per_lane_mile : null;
  const lot_acres = lot_used ? lot_area_ft2 / 43560 : null;
  return {
    material_lb_per_pass, material_tons_per_pass, passes_per_load, reloads_per_pass,
    alt_material_lb_per_pass, alt_passes_per_load, alt_reloads_per_pass, rate_ratio,
    lot_lane_miles, lot_material_lb, lot_acres, hopper_lb,
    note: "PAVEMENT TEMPERATURE IS THE CONTROLLING VARIABLE AND IT IS NOT THE AIR TEMPERATURE. A bridge deck, a shaded north-facing lot, and a pavement that has radiated to a clear sky all night each sit several degrees below the air -- which is one published rate band and sometimes two. Measure it with an infrared gun or a road sensor. The published bands run roughly 100 to 200 lb per lane-mile at 30 degF and above, 200 to 300 at 25 to 30, 300 to 400 at 20 to 25, and 400 to 600 below 20; the band and the rate are ENTERED here, not selected. Doubling the rate does not only double the material -- it HALVES the coverage per load and doubles the reload trips, and those trips come straight out of the cycle time the route was designed around. Below about 15 degF salt alone is not effective at any rate. Anti-icing before an event uses far less material and is a different practice, not a lower rate. This does not address spreader calibration, which decides whether the rate on the controller is the rate on the road and has to be verified by a catch test. The applicable agency policy and published rate guidance, a verified spreader calibration, and a measured pavement temperature govern.",
  };
}
const saltApplicationRateExample = { inputs: { rate_lb_per_lane_mile: 250, route_lane_miles: 30, lot_area_ft2: 100000, hopper_capacity_tons: 8, alt_rate_lb_per_lane_mile: 500 } };
WINTEROPS_RENDERERS["salt-application-rate"] = _simpleRenderer({
  citation: "Citation: the lane-mile basis (one 12 ft lane one mile long = 63,360 sq ft) and published deicing application rate bands by PAVEMENT temperature (by name: Salt Institute, Clear Roads, and state maintenance manuals). The rate is ENTERED, not selected. The applicable agency policy, a verified spreader calibration, and a measured pavement temperature govern.",
  example: saltApplicationRateExample.inputs,
  fields: [
    { key: "rate_lb_per_lane_mile", label: "Application rate (lb per lane-mile)", kind: "number", default: 250 },
    { key: "route_lane_miles", label: "Route length (lane-miles)", kind: "number" },
    { key: "hopper_capacity_tons", label: "Spreader hopper capacity (tons)", kind: "number", default: 8 },
    { key: "alt_rate_lb_per_lane_mile", label: "Colder-condition rate (lb per lane-mile, 0 to skip)", kind: "number", default: 500 },
    { key: "lot_area_ft2", label: "Parking lot area (sq ft, 0 to skip)", kind: "number", default: 0 },
  ],
  outputs: [
    { key: "m", id: "sar-out-m", label: "Material per pass", value: (r) => fmt(r.material_lb_per_pass, 0) + " lb (" + fmt(r.material_tons_per_pass, 2) + " tons)" },
    { key: "c", id: "sar-out-c", label: "Coverage per hopper load", value: (r) => fmt(r.passes_per_load, 2) + " route passes (" + fmt(r.reloads_per_pass, 2) + " reloads per pass)" },
    { key: "a", id: "sar-out-a", label: "At the colder rate", value: (r) => r.alt_material_lb_per_pass === null ? "not compared" : fmt(r.alt_material_lb_per_pass, 0) + " lb per pass, " + fmt(r.alt_passes_per_load, 2) + " passes per load (" + fmt(r.rate_ratio, 2) + " x the rate)" },
    { key: "l", id: "sar-out-l", label: "Lot as lane-miles", value: (r) => r.lot_lane_miles === null ? "no lot entered" : fmt(r.lot_lane_miles, 2) + " lane-miles (" + fmt(r.lot_acres, 2) + " acres)" },
    { key: "p", id: "sar-out-p", label: "Material per lot application", value: (r) => r.lot_material_lb === null ? "no lot entered" : fmt(r.lot_material_lb, 0) + " lb" },
    { key: "n", id: "sar-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSaltApplicationRate,
});

// ===================== spec-v1846: salt brine batch salinity =====================

// Published sodium chloride freezing points along the phase diagram's ice
// branch, as [weight percent NaCl, freezing point degF], ending at the
// eutectic. Linearly interpolated between nodes; the curve is not a straight
// line, which is why it is carried as points rather than as a slope.
const _NACL_FREEZE_F = [
  [0, 32.0], [5, 26.6], [10, 20.1], [15, 12.2], [20, 1.9], [23.3, -6.0],
];
function _naclFreezePointF(pct) {
  const t = _NACL_FREEZE_F;
  if (pct <= t[0][0]) return t[0][1];
  if (pct >= t[t.length - 1][0]) return t[t.length - 1][1];
  for (let i = 1; i < t.length; i++) {
    if (pct <= t[i][0]) {
      const [x0, y0] = t[i - 1], [x1, y1] = t[i];
      return y0 + (y1 - y0) * (pct - x0) / (x1 - x0);
    }
  }
  return t[t.length - 1][1];
}

// dims: in { batch_gal: L^3, target_pct: dimensionless, brine_density_lb_gal: M L^-3, saturation_pct: dimensionless, alt_pct: dimensionless } out: { batch_weight_lb: M, salt_lb: M, water_lb: M, water_gal: L^3, salt_per_1000gal_lb: M }
export function computeBrineBatchSalinity({ batch_gal = 0, target_pct = 23.3, brine_density_lb_gal = 9.8, saturation_pct = 26.4, alt_pct = 20 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(batch_gal > 0)) return { error: "Batch volume must be positive (gal)." };
  if (!(brine_density_lb_gal > 0)) return { error: "Brine density must be positive (lb per gal)." };
  if (!(saturation_pct > 0 && saturation_pct <= 100)) return { error: "Saturation concentration must be in (0, 100] percent." };
  if (!(target_pct > 0 && target_pct <= saturation_pct)) return { error: "Target concentration must be above 0 and no more than the saturation concentration." };
  const batch_weight_lb = batch_gal * brine_density_lb_gal;
  const salt_lb = batch_weight_lb * (target_pct / 100);
  const salt_tons = salt_lb / _LB_PER_TON;
  const water_lb = batch_weight_lb - salt_lb;
  const water_gal = water_lb / 8.345;
  const salt_per_1000gal_lb = salt_lb / batch_gal * 1000;
  const salometer = target_pct / saturation_pct * 100;
  const freeze_point_f = _naclFreezePointF(target_pct);
  const over_saturated = target_pct > saturation_pct;
  const compared = alt_pct > 0 && alt_pct <= saturation_pct;
  const alt_salt_lb = compared ? batch_weight_lb * (alt_pct / 100) : null;
  const alt_freeze_point_f = compared ? _naclFreezePointF(alt_pct) : null;
  const salt_difference_lb = compared ? salt_lb - alt_salt_lb : null;
  const freeze_point_given_up_f = compared ? alt_freeze_point_f - freeze_point_f : null;
  const eutectic_pct = _NACL_FREEZE_F[_NACL_FREEZE_F.length - 1][0];
  const at_eutectic = Math.abs(target_pct - eutectic_pct) < 0.05;
  const target_verdict = at_eutectic
    ? "AT THE EUTECTIC (" + eutectic_pct + "%), where the freezing point is at its minimum of about " + freeze_point_f.toFixed(0) + " degF."
    : (target_pct < eutectic_pct
      ? "BELOW THE EUTECTIC (" + eutectic_pct + "%). The freezing point RISES to about " + freeze_point_f.toFixed(0) + " degF -- the brine sprays perfectly and freezes on a road that will reach that temperature, which is the more dangerous of the two failures because nothing about the application looks wrong."
      : "ABOVE THE EUTECTIC (" + eutectic_pct + "%). The solution cannot hold the salt; it crystallises in tanks, lines, screens and nozzles -- an intermittent spray pattern and a maintenance backlog that takes the truck out of service mid-event.");
  return {
    batch_weight_lb, salt_lb, salt_tons, water_lb, water_gal, salt_per_1000gal_lb,
    salometer, freeze_point_f, alt_salt_lb, alt_freeze_point_f, salt_difference_lb,
    freeze_point_given_up_f, over_saturated, at_eutectic, target_verdict,
    note: "23.3% SODIUM CHLORIDE BY WEIGHT IS THE EUTECTIC -- the concentration at which the freezing point is at its lowest, about -6 degF -- and it is a property of the salt and water system rather than a recipe anyone chose. Moving away from it in EITHER direction raises the freezing point, which is why every brine operation in the country mixes to the same number. VERIFY EVERY BATCH WITH A SALOMETER OR A DENSITY READING, not by counting bags; the salometer scale is a percent of saturation referenced to a stated temperature (commonly 60 degF) and a hydrometer dropped into cold brine READS HIGH, which is exactly when a crew is most likely to check it. Brine density varies with concentration and temperature and the figure entered here is nominal, so the comparison case is computed at the same entered density. BRINE IS ANTI-ICING, NOT DEICING: applied to dry pavement before a storm it prevents the bond, which is what lets the plow scrape to bare pavement afterwards with far less salt. Applied to snow already on the ground it is adding water to the problem. Freezing points quoted for chloride solutions are for the pure system; a working brine picks up dissolved and suspended material that shifts its behaviour. Blends with other chlorides, organic additives or corrosion inhibitors are formulated by their supplier, not by this arithmetic. The material supplier's data, a salometer or density verification of each batch, and the applicable agency policy govern.",
  };
}
const brineBatchSalinityExample = { inputs: { batch_gal: 3000, target_pct: 23.3, brine_density_lb_gal: 9.8, saturation_pct: 26.4, alt_pct: 20 } };
WINTEROPS_RENDERERS["brine-batch-salinity"] = _simpleRenderer({
  citation: "Citation: the sodium chloride eutectic at 23.3 percent by weight and about -6 degF, the published NaCl freezing-point curve (linearly interpolated between 0, 5, 10, 15, 20 and 23.3 percent), and the salometer scale as percent of saturation at a stated temperature. Brine density is ENTERED and is nominal. The material supplier's data and a salometer or density verification of each batch govern.",
  example: brineBatchSalinityExample.inputs,
  fields: [
    { key: "batch_gal", label: "Batch volume (gal)", kind: "number" },
    { key: "target_pct", label: "Target concentration (% NaCl by weight)", kind: "number", default: 23.3 },
    { key: "brine_density_lb_gal", label: "Brine density (lb per gal)", kind: "number", default: 9.8 },
    { key: "saturation_pct", label: "Saturation concentration (%)", kind: "number", default: 26.4 },
    { key: "alt_pct", label: "Compare against concentration (%, 0 to skip)", kind: "number", default: 20 },
  ],
  outputs: [
    { key: "b", id: "bbs-out-b", label: "Batch weight", value: (r) => fmt(r.batch_weight_lb, 0) + " lb" },
    { key: "s", id: "bbs-out-s", label: "Salt required", value: (r) => fmt(r.salt_lb, 0) + " lb (" + fmt(r.salt_tons, 2) + " tons)" },
    { key: "w", id: "bbs-out-w", label: "Water required", value: (r) => fmt(r.water_lb, 0) + " lb (" + fmt(r.water_gal, 0) + " gal)" },
    { key: "k", id: "bbs-out-k", label: "Salt per 1,000 gal of brine", value: (r) => fmt(r.salt_per_1000gal_lb, 0) + " lb" },
    { key: "m", id: "bbs-out-m", label: "Salometer target", value: (r) => fmt(r.salometer, 0) + " (percent of saturation, at the scale's reference temperature)" },
    { key: "f", id: "bbs-out-f", label: "Freezing point", value: (r) => fmt(r.freeze_point_f, 1) + " degF" },
    { key: "v", id: "bbs-out-v", label: "Against the eutectic", value: (r) => r.target_verdict },
    { key: "a", id: "bbs-out-a", label: "At the comparison mix", value: (r) => r.alt_salt_lb === null ? "not compared" : fmt(r.alt_salt_lb, 0) + " lb of salt (" + fmt(r.salt_difference_lb, 0) + " lb less) and a freezing point of " + fmt(r.alt_freeze_point_f, 1) + " degF, " + fmt(r.freeze_point_given_up_f, 1) + " degF higher" },
    { key: "n", id: "bbs-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBrineBatchSalinity,
});

// ===================== spec-v1847: plow route cycle time and truck count =====================

// dims: in { route_lane_miles: L, plow_speed_mph: L T^-1, overhead_factor: dimensionless, system_lane_miles: L, cycle_target_hr: T, snowfall_in_hr: L T^-1, alt_cycle_target_hr: T } out: { effective_speed_lane_miles_hr: L T^-1, cycle_time_hr: T, accumulation_in: L, lane_miles_per_truck: L, trucks_required: dimensionless }
export function computePlowRouteCycleTime({ route_lane_miles = 0, plow_speed_mph = 0, overhead_factor = 1.2, system_lane_miles = 0, cycle_target_hr = 2, snowfall_in_hr = 1.5, alt_cycle_target_hr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(route_lane_miles > 0)) return { error: "Route length must be positive (lane-miles)." };
  if (!(plow_speed_mph > 0)) return { error: "Plowing speed must be positive (mph)." };
  if (!(overhead_factor >= 1)) return { error: "Overhead factor must be at least 1 (1.2 to 1.5 is ordinary)." };
  if (!(system_lane_miles > 0)) return { error: "System length must be positive (lane-miles)." };
  if (!(cycle_target_hr > 0)) return { error: "Cycle time target must be positive (hours)." };
  if (snowfall_in_hr < 0) return { error: "Snowfall rate cannot be negative (in per hour)." };
  const effective_speed_lane_miles_hr = plow_speed_mph / overhead_factor;
  const cycle_time_hr = route_lane_miles / effective_speed_lane_miles_hr;
  const cycle_time_min = cycle_time_hr * 60;
  const accumulation_in = snowfall_in_hr * cycle_time_hr;
  const lane_miles_per_truck = effective_speed_lane_miles_hr * cycle_target_hr;
  const trucks_required = Math.ceil(system_lane_miles / lane_miles_per_truck);
  const target_accumulation_in = snowfall_in_hr * cycle_target_hr;
  const compared = alt_cycle_target_hr > 0;
  const alt_lane_miles_per_truck = compared ? effective_speed_lane_miles_hr * alt_cycle_target_hr : null;
  const alt_trucks_required = compared ? Math.ceil(system_lane_miles / alt_lane_miles_per_truck) : null;
  const alt_target_accumulation_in = compared ? snowfall_in_hr * alt_cycle_target_hr : null;
  const extra_trucks = compared ? alt_trucks_required - trucks_required : null;
  const extra_trucks_pct = compared ? 100 * extra_trucks / trucks_required : null;
  const accumulation_bought_in = compared ? target_accumulation_in - alt_target_accumulation_in : null;
  return {
    effective_speed_lane_miles_hr, cycle_time_hr, cycle_time_min, accumulation_in,
    lane_miles_per_truck, trucks_required, target_accumulation_in,
    alt_lane_miles_per_truck, alt_trucks_required, alt_target_accumulation_in,
    extra_trucks, extra_trucks_pct, accumulation_bought_in,
    note: "CYCLE TIME IS THE SERVICE LEVEL AND EVERYTHING ELSE IS BOOKKEEPING. A customer or a council does not experience lane-miles or truck counts; they experience how deep the snow is when the plow comes back, and that is the snowfall rate times the cycle. THE FLEET SCALES INVERSELY WITH THE CYCLE TARGET, so halving the cycle doubles the trucks, the drivers, the maintenance and the yard space -- for a promise tested a handful of times a winter. Stating the trade in inches of accumulation is what makes it visible. THE OVERHEAD FACTOR CARRIES THE WHOLE ANSWER and must come from the operation's own route timing records: turns, intersections, traffic, parked cars, driveway aprons, blade lifts and reload trips all differ by route type, and 1.2 for an open arterial against 1.5 for a dense residential grid is the difference between a fleet that meets the standard and one that is short. This treats plowing speed as constant, which it is not -- deep or wet snow slows a truck substantially at exactly the moment the cycle matters most. And a cold event lengthens the cycle without anyone deciding to, because the material rate roughly doubles below 20 degF and doubles the reload trips with it. Route sequencing by priority means the lowest-priority streets have a cycle time far longer than any published standard. The operation's own route timing records, the applicable hours of service provisions, and the public works or contract standard govern.",
  };
}
const plowRouteCycleTimeExample = { inputs: { route_lane_miles: 30, plow_speed_mph: 25, overhead_factor: 1.2, system_lane_miles: 300, cycle_target_hr: 2, snowfall_in_hr: 1.5, alt_cycle_target_hr: 1.3333333333333333 } };
WINTEROPS_RENDERERS["plow-route-cycle-time"] = _simpleRenderer({
  citation: "Citation: the route cycle time and fleet sizing relations (cycle = route lane-miles / effective speed; effective speed = plowing speed / overhead factor; lane-miles per truck = effective speed x cycle target; trucks = system lane-miles / lane-miles per truck, rounded up). The overhead factor is ENTERED from the operation's own route timing records. The applicable public works or contract service standard governs.",
  example: plowRouteCycleTimeExample.inputs,
  fields: [
    { key: "route_lane_miles", label: "Route length (lane-miles)", kind: "number" },
    { key: "plow_speed_mph", label: "Plowing speed (mph)", kind: "number", default: 25 },
    { key: "overhead_factor", label: "Overhead factor (1.2 to 1.5)", kind: "number", default: 1.2 },
    { key: "system_lane_miles", label: "System length (lane-miles)", kind: "number" },
    { key: "cycle_target_hr", label: "Cycle time target (hours)", kind: "number", default: 2 },
    { key: "snowfall_in_hr", label: "Snowfall rate (in per hour)", kind: "number", default: 1.5 },
    { key: "alt_cycle_target_hr", label: "Tighter cycle target (hours, 0 to skip)", kind: "number", default: 1.33 },
  ],
  outputs: [
    { key: "e", id: "prc-out-e", label: "Effective plowing speed", value: (r) => fmt(r.effective_speed_lane_miles_hr, 2) + " lane-miles/hr" },
    { key: "c", id: "prc-out-c", label: "Cycle time for this route", value: (r) => fmt(r.cycle_time_min, 0) + " min (" + fmt(r.cycle_time_hr, 2) + " hr)" },
    { key: "a", id: "prc-out-a", label: "Accumulation between passes", value: (r) => fmt(r.accumulation_in, 1) + " in" },
    { key: "t", id: "prc-out-t", label: "At the cycle target", value: (r) => fmt(r.lane_miles_per_truck, 1) + " lane-miles per truck, " + r.trucks_required + " trucks, " + fmt(r.target_accumulation_in, 1) + " in on the ground" },
    { key: "x", id: "prc-out-x", label: "At the tighter target", value: (r) => r.alt_trucks_required === null ? "not compared" : fmt(r.alt_lane_miles_per_truck, 1) + " lane-miles per truck, " + r.alt_trucks_required + " trucks, " + fmt(r.alt_target_accumulation_in, 1) + " in on the ground" },
    { key: "d", id: "prc-out-d", label: "What the tighter promise costs", value: (r) => r.extra_trucks === null ? "not compared" : r.extra_trucks + " more trucks (" + fmt(r.extra_trucks_pct, 0) + " % more fleet) to buy " + fmt(r.accumulation_bought_in, 1) + " in of accumulation" },
    { key: "n", id: "prc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePlowRouteCycleTime,
});

// ===================== spec-v1848: snow storage stacking area =====================

// dims: in { lot_area_ft2: L^2, accumulation_in: L, events: dimensionless, fresh_density_lb_ft3: M L^-3, pile_density_lb_ft3: M L^-3, pile_height_ft: L, side_slope_run_per_rise: dimensionless, area_per_space_ft2: L^2, allocated_pct: dimensionless } out: { fallen_volume_ft3: L^3, pile_volume_ft3: L^3, windrow_length_ft: L, footprint_ft2: L^2, haul_volume_ft3: L^3 }
export function computeSnowStackingArea({ lot_area_ft2 = 0, accumulation_in = 0, events = 1, fresh_density_lb_ft3 = 7, pile_density_lb_ft3 = 25, pile_height_ft = 12, side_slope_run_per_rise = 1, area_per_space_ft2 = 300, allocated_pct = 5 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(lot_area_ft2 > 0)) return { error: "Lot area must be positive (sq ft)." };
  if (!(accumulation_in > 0)) return { error: "Accumulation per event must be positive (in)." };
  if (!(fresh_density_lb_ft3 > 0)) return { error: "Fresh snow density must be positive (lb per cu ft)." };
  if (!(pile_density_lb_ft3 > fresh_density_lb_ft3)) return { error: "Piled density must exceed the fresh snow density." };
  if (!(pile_height_ft > 0)) return { error: "Pile height must be positive (ft)." };
  if (!(side_slope_run_per_rise > 0)) return { error: "Side slope run per rise must be positive (1 is 45 degrees)." };
  if (!(area_per_space_ft2 > 0)) return { error: "Area per parking space must be positive (sq ft)." };
  const n = Math.max(1, Math.round(events));
  if (!(allocated_pct >= 0 && allocated_pct <= 100)) return { error: "Allocated storage share must be in [0, 100] percent." };
  const fallen_volume_ft3 = lot_area_ft2 * (accumulation_in / 12);
  const densification_ratio = fresh_density_lb_ft3 / pile_density_lb_ft3;
  const pile_volume_ft3 = fallen_volume_ft3 * densification_ratio;
  const densification_saving_pct = 100 * (1 - densification_ratio);
  const base_width_ft = 2 * pile_height_ft * side_slope_run_per_rise;
  const cross_section_ft2 = 0.5 * base_width_ft * pile_height_ft;
  const windrow_length_ft = pile_volume_ft3 / cross_section_ft2;
  const footprint_ft2 = windrow_length_ft * base_width_ft;
  const footprint_pct_of_lot = 100 * footprint_ft2 / lot_area_ft2;
  const spaces_lost = Math.ceil(footprint_ft2 / area_per_space_ft2);
  const season_pile_volume_ft3 = pile_volume_ft3 * n;
  const season_length_ft = season_pile_volume_ft3 / cross_section_ft2;
  const season_footprint_ft2 = season_length_ft * base_width_ft;
  const season_footprint_pct_of_lot = 100 * season_footprint_ft2 / lot_area_ft2;
  const season_spaces_lost = Math.ceil(season_footprint_ft2 / area_per_space_ft2);
  const allocated_area_ft2 = lot_area_ft2 * (allocated_pct / 100);
  const allocated_volume_ft3 = allocated_area_ft2 / base_width_ft * cross_section_ft2;
  const haul_volume_ft3 = Math.max(0, season_pile_volume_ft3 - allocated_volume_ft3);
  const haul_cy = haul_volume_ft3 / _CUFT_PER_CY;
  // A free cone at the same side slope: r = h x run-per-rise, V = pi r^2 h / 3.
  const cone_height_ft = Math.cbrt(3 * pile_volume_ft3 / (Math.PI * side_slope_run_per_rise * side_slope_run_per_rise));
  const cone_radius_ft = cone_height_ft * side_slope_run_per_rise;
  const cone_footprint_ft2 = Math.PI * cone_radius_ft * cone_radius_ft;
  const cone_saving_ft2 = footprint_ft2 - cone_footprint_ft2;
  const cone_saving_pct = 100 * cone_saving_ft2 / footprint_ft2;
  return {
    fallen_volume_ft3, pile_volume_ft3, densification_saving_pct, base_width_ft,
    cross_section_ft2, windrow_length_ft, footprint_ft2, footprint_pct_of_lot, spaces_lost,
    season_pile_volume_ft3, season_length_ft, season_footprint_ft2,
    season_footprint_pct_of_lot, season_spaces_lost, events: n,
    allocated_area_ft2, allocated_volume_ft3, haul_volume_ft3, haul_cy,
    cone_height_ft, cone_footprint_ft2, cone_saving_ft2, cone_saving_pct,
    note: "SNOW STORAGE IS A LAND-USE PROBLEM DISGUISED AS A WEATHER PROBLEM. What makes it tractable is densification -- a worked pile is several times denser than the snow that fell -- and what makes it difficult again is the HEIGHT LIMIT, because without one a pile would be a compact cone and with one it becomes a long low windrow that eats ground. The height limit is not a preference: a pile at a drive aisle blocks sight lines, a pile above the reach of a loader or pusher cannot be built or maintained, and a tall pile in an exposed lot is a wind and a melt-and-refreeze problem underneath. Ten to fifteen feet is where operations settle. THE MULTI-EVENT CASE ASSUMES NO MELTING BETWEEN EVENTS, which is the design case rather than the typical one; a real requirement is better established from a season's records. Snow densities are entered and vary enormously -- fresh snow from very light dry powder to heavy wet snow several times denser, and a worked pile densifies further with handling, melt and refreeze, and the dirt and gravel it picks up, so a late-season pile is denser and dirtier than this arithmetic suggests. THE HAUL TRIGGER IS A PLANNING DECISION ALMOST ALWAYS MADE TOO LATE: hauling is slow, expensive, and needs a permitted disposal site arranged before the storm rather than during it. This does not address WHERE storage may be placed -- drainage and where meltwater goes, sight lines, fire lanes and hydrant access, accessible parking and routes that may not be blocked, and landscaping and pavement damage are all site constraints and several are regulatory. The site's own snow plan, the applicable accessibility and fire access requirements, the local snow disposal regulations, and the property manager govern.",
  };
}
const snowStackingAreaExample = { inputs: { lot_area_ft2: 100000, accumulation_in: 12, events: 3, fresh_density_lb_ft3: 7, pile_density_lb_ft3: 25, pile_height_ft: 12, side_slope_run_per_rise: 1, area_per_space_ft2: 300, allocated_pct: 5 } };
WINTEROPS_RENDERERS["snow-stacking-area"] = _simpleRenderer({
  citation: "Citation: the snow densification volume relation (pile volume = fallen volume x fresh density / piled density) and windrow prism geometry with sloped sides (base = 2 x height x run-per-rise; cross-section = 0.5 x base x height), with the free-cone comparison at the same slope. Snow densities and the height limit are ENTERED. The site's snow plan, the applicable accessibility and fire access requirements, and the local snow disposal regulations govern.",
  example: snowStackingAreaExample.inputs,
  fields: [
    { key: "lot_area_ft2", label: "Lot area (sq ft)", kind: "number" },
    { key: "accumulation_in", label: "Accumulation per event (in)", kind: "number" },
    { key: "events", label: "Events with no melting between", kind: "number", default: 3, attrs: { step: "1", min: "1" } },
    { key: "fresh_density_lb_ft3", label: "Fresh snow density (lb per cu ft)", kind: "number", default: 7 },
    { key: "pile_density_lb_ft3", label: "Piled snow density (lb per cu ft)", kind: "number", default: 25 },
    { key: "pile_height_ft", label: "Pile height limit (ft)", kind: "number", default: 12 },
    { key: "side_slope_run_per_rise", label: "Side slope (run per rise; 1 is 45 degrees)", kind: "number", default: 1 },
    { key: "area_per_space_ft2", label: "Area per parking space incl. aisle (sq ft)", kind: "number", default: 300 },
    { key: "allocated_pct", label: "Lot area allocated to snow storage (%)", kind: "number", default: 5 },
  ],
  outputs: [
    { key: "v", id: "ssa-out-v", label: "Volume per event", value: (r) => fmt(r.fallen_volume_ft3, 0) + " cu ft fallen, " + fmt(r.pile_volume_ft3, 0) + " cu ft piled (" + fmt(r.densification_saving_pct, 0) + " % lost to densification)" },
    { key: "w", id: "ssa-out-w", label: "Windrow", value: (r) => fmt(r.base_width_ft, 1) + " ft base, " + fmt(r.cross_section_ft2, 0) + " sq ft section, " + fmt(r.windrow_length_ft, 0) + " ft long" },
    { key: "f", id: "ssa-out-f", label: "Footprint after one event", value: (r) => fmt(r.footprint_ft2, 0) + " sq ft (" + fmt(r.footprint_pct_of_lot, 1) + " % of the lot), " + r.spaces_lost + " parking spaces" },
    { key: "s", id: "ssa-out-s", label: "After the entered events", value: (r) => fmt(r.season_footprint_ft2, 0) + " sq ft (" + fmt(r.season_footprint_pct_of_lot, 1) + " % of the lot), " + r.season_spaces_lost + " parking spaces over " + r.events + " event(s)" },
    { key: "h", id: "ssa-out-h", label: "Haul trigger", value: (r) => "allocation holds " + fmt(r.allocated_volume_ft3, 0) + " cu ft; " + (r.haul_volume_ft3 > 0 ? fmt(r.haul_volume_ft3, 0) + " cu ft (" + fmt(r.haul_cy, 0) + " cu yd) to haul" : "nothing to haul yet") },
    { key: "c", id: "ssa-out-c", label: "As a free cone instead", value: (r) => fmt(r.cone_footprint_ft2, 0) + " sq ft standing " + fmt(r.cone_height_ft, 0) + " ft tall -- " + fmt(r.cone_saving_pct, 0) + " % less ground, which the height limit is what gives up" },
    { key: "n", id: "ssa-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSnowStackingArea,
});

// ===================== spec-v1849: ice melt working temperature and capacity =====================

// dims: in { area_ft2: L^2, ice_thickness_in: L, ice_density_lb_ft3: M L^-3, pavement_temp_f: T, capacity_lb_ice_per_lb: dimensionless, alt_capacity_lb_ice_per_lb: dimensionless, alt_temp_f: T, practical_limit_f: T, eutectic_f: T } out: { ice_volume_ft3: L^3, ice_mass_lb: M, product_lb: M, alt_product_lb: M }
export function computeIceMeltWorkingTemperature({ area_ft2 = 0, ice_thickness_in = 0, ice_density_lb_ft3 = 57.2, pavement_temp_f = 30, capacity_lb_ice_per_lb = 0, alt_capacity_lb_ice_per_lb = 0, alt_temp_f = 20, practical_limit_f = 15, eutectic_f = -6 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(area_ft2 > 0)) return { error: "Area must be positive (sq ft)." };
  if (!(ice_thickness_in > 0)) return { error: "Ice thickness must be positive (in)." };
  if (!(ice_density_lb_ft3 > 0)) return { error: "Ice density must be positive (lb per cu ft)." };
  if (!(capacity_lb_ice_per_lb > 0)) return { error: "Melting capacity must be positive (lb of ice per lb of product)." };
  const ice_volume_ft3 = area_ft2 * (ice_thickness_in / 12);
  const ice_mass_lb = ice_volume_ft3 * ice_density_lb_ft3;
  const product_lb = ice_mass_lb / capacity_lb_ice_per_lb;
  const compared = alt_capacity_lb_ice_per_lb > 0;
  const alt_product_lb = compared ? ice_mass_lb / alt_capacity_lb_ice_per_lb : null;
  const product_ratio = compared ? alt_product_lb / product_lb : null;
  const capacity_ratio = compared ? capacity_lb_ice_per_lb / alt_capacity_lb_ice_per_lb : null;
  const within_practical_limit = pavement_temp_f >= practical_limit_f;
  const alt_within_practical_limit = compared ? alt_temp_f >= practical_limit_f : null;
  const margin_f = pavement_temp_f - practical_limit_f;
  const limit_verdict = within_practical_limit
    ? "INSIDE the product's practical working limit of " + practical_limit_f.toFixed(0) + " degF, by " + margin_f.toFixed(0) + " degF."
    : "BELOW the product's practical working limit of " + practical_limit_f.toFixed(0) + " degF, by " + Math.abs(margin_f).toFixed(0) + " degF. The brine that forms refreezes about as fast as it is made, so NO QUANTITY produces the result -- the answer is a DIFFERENT CHEMISTRY, not a heavier application of the same one. The quantity above is arithmetic rather than practice.";
  const eutectic_gap_f = practical_limit_f - eutectic_f;
  return {
    ice_volume_ft3, ice_mass_lb, product_lb, alt_product_lb, product_ratio, capacity_ratio,
    within_practical_limit, alt_within_practical_limit, margin_f, eutectic_gap_f, limit_verdict,
    note: "THE EUTECTIC IS A THERMODYNAMIC BOUNDARY AND THE WORKING LIMIT IS AN OPERATIONAL ONE, and confusing them is the most common error in deicer selection. A solution can remain liquid at its eutectic and still take hours to penetrate and undercut a sheet of ice, which is no use to anyone clearing a walk before opening. A bag advertising a very low temperature is usually quoting the EUTECTIC: sodium chloride's is about -6 degF and nobody would treat a walk with it there. Practical working limits run roughly 15 to 20 degF for rock salt, about 0 for magnesium chloride, and -20 or below for calcium chloride. CALCIUM CHLORIDE'S ADVANTAGE IS THERMODYNAMIC RATHER THAN MARKETING -- it releases heat as it dissolves, so it warms the brine it is making and keeps the reaction going where a neutral or endothermic product stalls, and that is also why it is more expensive, more hygroscopic, and more aggressive to concrete and metal. The properties come together. MELTING CAPACITIES ARE LABORATORY FIGURES measured over a stated time at a stated temperature on a stated ice thickness, and they are NOT field yields: penetration and undercutting depend on the ice's condition, whether it is bonded, the pavement, traffic working the product in, and dilution by continuing precipitation. A field application is substantially less effective, in a direction and magnitude this cannot quantify. This selects no product -- cost, corrosivity, effect on concrete (particularly young concrete), tracking indoors, effect on vegetation and receiving waters, and the increasing regulatory restrictions on chloride application all bear on the choice. The product supplier's data, the applicable environmental and agency restrictions, and the winter operations manager govern.",
  };
}
const iceMeltWorkingTemperatureExample = { inputs: { area_ft2: 1000, ice_thickness_in: 1, ice_density_lb_ft3: 57.2, pavement_temp_f: 30, capacity_lb_ice_per_lb: 46.3, alt_capacity_lb_ice_per_lb: 4.9, alt_temp_f: 10, practical_limit_f: 15, eutectic_f: -6 } };
WINTEROPS_RENDERERS["ice-melt-working-temperature"] = _simpleRenderer({
  citation: "Citation: published deicer melting capacity and eutectic data (by name) - sodium chloride's eutectic about -6 degF against a practical working limit near 15 to 20 degF, magnesium chloride -28 against about 0, calcium chloride -60 against -20 or below; rock salt capacity roughly 46 lb of ice per lb at 30 degF, 8.6 at 20 and under 5 at 10. Ice density 57.2 lb per cu ft. Capacities are ENTERED laboratory figures, not field yields. The product supplier's data and the applicable environmental restrictions govern.",
  example: iceMeltWorkingTemperatureExample.inputs,
  fields: [
    { key: "area_ft2", label: "Area to treat (sq ft)", kind: "number" },
    { key: "ice_thickness_in", label: "Ice thickness (in)", kind: "number", default: 1 },
    { key: "ice_density_lb_ft3", label: "Ice density (lb per cu ft)", kind: "number", default: 57.2 },
    { key: "pavement_temp_f", label: "Pavement temperature (degF)", kind: "number", default: 30 },
    { key: "capacity_lb_ice_per_lb", label: "Melting capacity at that temperature (lb ice per lb)", kind: "number", default: 46.3 },
    { key: "alt_temp_f", label: "Colder temperature to compare (degF)", kind: "number", default: 10 },
    { key: "alt_capacity_lb_ice_per_lb", label: "Melting capacity there (lb ice per lb, 0 to skip)", kind: "number", default: 4.9 },
    { key: "practical_limit_f", label: "Product practical working limit (degF)", kind: "number", default: 15 },
    { key: "eutectic_f", label: "Product eutectic temperature (degF)", kind: "number", default: -6 },
  ],
  outputs: [
    { key: "i", id: "imw-out-i", label: "Ice to be melted", value: (r) => fmt(r.ice_volume_ft3, 1) + " cu ft (" + fmt(r.ice_mass_lb, 0) + " lb)" },
    { key: "p", id: "imw-out-p", label: "Product required", value: (r) => fmt(r.product_lb, 0) + " lb" },
    { key: "a", id: "imw-out-a", label: "At the colder temperature", value: (r) => r.alt_product_lb === null ? "not compared" : fmt(r.alt_product_lb, 0) + " lb -- " + fmt(r.product_ratio, 1) + " times as much, from a " + fmt(r.capacity_ratio, 1) + " x collapse in capacity" },
    { key: "v", id: "imw-out-v", label: "Against the working limit", value: (r) => r.limit_verdict },
    { key: "e", id: "imw-out-e", label: "Working limit above the eutectic", value: (r) => fmt(r.eutectic_gap_f, 0) + " degF -- the bag quotes the eutectic, the road needs the working limit" },
    { key: "n", id: "imw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeIceMeltWorkingTemperature,
});

// ===================== spec-v1850: walkway clearing crew productivity =====================

// dims: in { total_area_ft2: L^2, hand_area_ft2: L^2, blower_rate_ft2_hr: L^2 T^-1, hand_rate_ft2_hr_person: L^2 T^-1, crew_size: dimensionless, service_window_hr: T, blower_depth_factor: dimensionless, hand_depth_factor: dimensionless, icemelt_lb_per_1000ft2: M L^-2, applications: dimensionless } out: { blower_hr: T, hand_hr: T, crew_hr: T, crews_required: dimensionless, icemelt_event_lb: M }
export function computeWalkwayClearingProductivity({ total_area_ft2 = 0, hand_area_ft2 = 0, blower_rate_ft2_hr = 0, hand_rate_ft2_hr_person = 0, crew_size = 2, service_window_hr = 2, blower_depth_factor = 1, hand_depth_factor = 1, icemelt_lb_per_1000ft2 = 4, applications = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(total_area_ft2 > 0)) return { error: "Total walk area must be positive (sq ft)." };
  if (!(hand_area_ft2 >= 0)) return { error: "Hand-work area cannot be negative (sq ft)." };
  if (!(hand_area_ft2 <= total_area_ft2)) return { error: "Hand-work area cannot exceed the total walk area." };
  if (!(blower_rate_ft2_hr > 0)) return { error: "Blower production rate must be positive (sq ft per hour)." };
  if (!(hand_rate_ft2_hr_person > 0)) return { error: "Hand production rate must be positive (sq ft per hour per person)." };
  if (!(crew_size >= 1)) return { error: "Crew size must be at least 1." };
  if (!(service_window_hr > 0)) return { error: "Service window must be positive (hours)." };
  if (!(icemelt_lb_per_1000ft2 > 0)) return { error: "Ice melt application rate must be positive (lb per 1,000 sq ft)." };
  if (!(blower_depth_factor > 0 && blower_depth_factor <= 1)) return { error: "Blower depth factor must be in (0, 1] -- the share of the design-depth rate." };
  if (!(hand_depth_factor > 0 && hand_depth_factor <= 1)) return { error: "Hand depth factor must be in (0, 1] -- the share of the design-depth rate." };
  const shovellers = Math.max(1, Math.round(crew_size));
  const apps = Math.max(1, Math.round(applications));
  const open_area_ft2 = total_area_ft2 - hand_area_ft2;
  const blower_hr = open_area_ft2 > 0 ? open_area_ft2 / (blower_rate_ft2_hr * blower_depth_factor) : 0;
  const hand_hr = hand_area_ft2 > 0 ? hand_area_ft2 / (shovellers * hand_rate_ft2_hr_person * hand_depth_factor) : 0;
  // The crew is done when the SLOWER of the two parallel operations is done.
  const crew_hr = Math.max(blower_hr, hand_hr);
  const crew_min = crew_hr * 60;
  const slack_hr = Math.abs(blower_hr - hand_hr);
  const balanced = slack_hr < 0.05 * Math.max(crew_hr, 1e-12);
  // Reported as "balanced" when the two finish together, so the field never
  // names a governing operation the arithmetic does not actually single out.
  const governing_operation = balanced ? "balanced" : (blower_hr > hand_hr ? "machine work" : "hand work");
  const meets_window = crew_hr <= service_window_hr;
  const crews_required = Math.ceil(crew_hr / service_window_hr);
  const icemelt_per_application_lb = total_area_ft2 / 1000 * icemelt_lb_per_1000ft2;
  const icemelt_event_lb = icemelt_per_application_lb * apps;
  const balance_verdict = balanced
    ? "BALANCED: the two operations finish together, so adding a second machine or another shoveller would save nothing at all."
    : "THE " + governing_operation.toUpperCase() + " GOVERNS by " + (slack_hr * 60).toFixed(0) + " min, and the other operation waits. Adding capacity to the operation that is NOT governing changes nothing.";
  return {
    open_area_ft2, blower_hr, hand_hr, crew_hr, crew_min, governing_operation, slack_hr,
    balanced, meets_window, crews_required, icemelt_per_application_lb, icemelt_event_lb,
    applications: apps, crew_size: shovellers, balance_verdict,
    note: "A WALK CREW IS TWO OPERATIONS RUNNING IN PARALLEL AND THE CREW TIME IS THE LARGER OF THE TWO, NOT THE SUM. That makes the split between machine work and hand work the whole design of the crew: adding a second blower to a route waiting on its shovellers changes nothing, and adding a shoveller changes everything. Which operation governs is COMPUTED here from the entered rates and depth factors rather than assumed -- the intuition that hand work always fails first is not reliable, because a blower's rate can fall faster with depth than a shoveller's and then the machine is the one holding the crew. DEPTH PENALISES BOTH OPERATIONS and the factors are entered as the share of the design-depth rate; the illustrative figures are not measured, and production rates must come from the contractor's own timed records -- they vary enormously with snow type and moisture, walk width and surface, the number of doorways, steps and obstacles, where the snow can be thrown, the equipment and the crew. THE MATERIAL IS COUNTED PER APPLICATION, NOT PER STORM. A walk cleared once and then left to refreeze is a worse condition than one never cleared, so re-application through a long event is part of the same commitment -- and it is the part most often left out of both the material order and the labour estimate. This treats the two operations as perfectly parallel and independent, which they are not: crews interfere, share transport, and lose time between properties, and on a route of small sites travel commonly exceeds the clearing time. The contractor's own production records, the applicable accessibility requirements, and the service contract govern.",
  };
}
const walkwayClearingProductivityExample = { inputs: { total_area_ft2: 12000, hand_area_ft2: 2000, blower_rate_ft2_hr: 12000, hand_rate_ft2_hr_person: 1200, crew_size: 2, service_window_hr: 2, blower_depth_factor: 0.25, hand_depth_factor: 0.3333333333333333, icemelt_lb_per_1000ft2: 4, applications: 3 } };
WINTEROPS_RENDERERS["walkway-clearing-productivity"] = _simpleRenderer({
  citation: "Citation: the parallel-operation crew time convention -- machine work on open walk and hand work on steps, landings and entrances run at the same time, so the crew time is the LARGER of the two rather than their sum. Production rates and depth factors are ENTERED from the contractor's own timed records. The applicable accessibility requirements and the service contract govern.",
  example: walkwayClearingProductivityExample.inputs,
  fields: [
    { key: "total_area_ft2", label: "Total walk area (sq ft)", kind: "number" },
    { key: "hand_area_ft2", label: "Steps, landings and entrances by hand (sq ft)", kind: "number" },
    { key: "blower_rate_ft2_hr", label: "Blower rate at design depth (sq ft/hr)", kind: "number", default: 12000 },
    { key: "hand_rate_ft2_hr_person", label: "Hand rate at design depth (sq ft/hr per person)", kind: "number", default: 1200 },
    { key: "crew_size", label: "Shovellers on the crew", kind: "number", default: 2, attrs: { step: "1", min: "1" } },
    { key: "blower_depth_factor", label: "Blower rate at this depth (share of design, 1 = design)", kind: "number", default: 1 },
    { key: "hand_depth_factor", label: "Hand rate at this depth (share of design, 1 = design)", kind: "number", default: 1 },
    { key: "service_window_hr", label: "Service window (hours after the storm)", kind: "number", default: 2 },
    { key: "icemelt_lb_per_1000ft2", label: "Ice melt rate (lb per 1,000 sq ft)", kind: "number", default: 4 },
    { key: "applications", label: "Applications through the event", kind: "number", default: 1, attrs: { step: "1", min: "1" } },
  ],
  outputs: [
    { key: "b", id: "wcp-out-b", label: "Machine work", value: (r) => fmt(r.blower_hr * 60, 0) + " min on " + fmt(r.open_area_ft2, 0) + " sq ft of open walk" },
    { key: "h", id: "wcp-out-h", label: "Hand work", value: (r) => fmt(r.hand_hr * 60, 0) + " min with " + r.crew_size + " shoveller(s)" },
    { key: "c", id: "wcp-out-c", label: "Crew time (the larger)", value: (r) => fmt(r.crew_min, 0) + " min (" + fmt(r.crew_hr, 2) + " hr)" },
    { key: "g", id: "wcp-out-g", label: "Which operation governs", value: (r) => r.balance_verdict },
    { key: "w", id: "wcp-out-w", label: "Against the service window", value: (r) => (r.meets_window ? "MEETS the window" : "FAILS the window") + "; " + r.crews_required + " crew(s) required on this route" },
    { key: "m", id: "wcp-out-m", label: "Ice melt", value: (r) => fmt(r.icemelt_per_application_lb, 0) + " lb per application, " + fmt(r.icemelt_event_lb, 0) + " lb over " + r.applications + " application(s)" },
    { key: "n", id: "wcp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWalkwayClearingProductivity,
});
