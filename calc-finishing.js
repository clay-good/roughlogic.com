// Group G (cont.): metal finishing and galvanizing bench.
// spec-v1824..v1827 (scope-trade-expansion-3) establish this new lazy-loaded
// renderer module for the arithmetic a galvanizer and a metal finisher do
// daily: what a coating weighs, what a bath drags out, what a kettle can put
// through, and what a stripped panel says about a conversion coating. Split
// into its own module rather than added to calc-finish.js (architectural
// finishes) or calc-cross.js, neither of which is this trade and both of
// which carry their own cap watch. Every tile keeps group: "G" (a tile's
// group letter is independent of the module that holds it -- the v28/v70..v100
// split precedent). Tiles:
//   v1824 galvanize-coating-weight     v1825 pretreatment-bath-dragout
//   v1826 galvanize-kettle-throughput  v1827 phosphate-coating-weight
// All four are GOVERNANCE.general quantity arithmetic (ASTM A123, the
// applicable ASTM test method, the coating supplier, the discharge permit,
// and the galvanizer govern). See spec-v1824.md through spec-v1827.md.

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

export const FINISHING_RENDERERS = {};

// Zinc density fixed by the metal, not by the process: 1 mil of zinc over
// 1 sq ft weighs 0.5940 oz. Microns to mils is the exact inch definition
// (25.4 um per mil), ounces to pounds is 16, and a short ton is 2,000 lb.
const _OZ_PER_MIL_FT2 = 0.5940;
const _UM_PER_MIL = 25.4;
const _OZ_PER_LB = 16;
const _LB_PER_TON = 2000;

// ============ spec-v1824: hot-dip galvanised coating weight and thickness ============

// dims: in { coating_grade_um: L, steel_tons: M, area_per_ton_ft2: L^2 M^-1, alt_area_per_ton_ft2: L^2 M^-1 } out: { thickness_mils: L, coating_oz_ft2: M L^-2, total_area_ft2: L^2, zinc_lb: M, pickup_pct: dimensionless }
export function computeGalvanizeCoatingWeight({ coating_grade_um = 0, steel_tons = 0, area_per_ton_ft2 = 0, alt_area_per_ton_ft2 = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(coating_grade_um > 0)) return { error: "Coating grade (thickness) must be positive (microns)." };
  if (!(steel_tons > 0)) return { error: "Steel tonnage must be positive (tons)." };
  if (!(area_per_ton_ft2 > 0)) return { error: "Surface area per ton must be positive (sq ft per ton)." };
  const thickness_mils = coating_grade_um / _UM_PER_MIL;
  const coating_oz_ft2 = thickness_mils * _OZ_PER_MIL_FT2;
  const total_area_ft2 = steel_tons * area_per_ton_ft2;
  const zinc_lb = total_area_ft2 * coating_oz_ft2 / _OZ_PER_LB;
  const steel_lb = steel_tons * _LB_PER_TON;
  const pickup_pct = 100 * zinc_lb / steel_lb;
  const zinc_lb_per_ton = area_per_ton_ft2 * coating_oz_ft2 / _OZ_PER_LB;
  const compared = alt_area_per_ton_ft2 > 0;
  const alt_zinc_lb_per_ton = compared ? alt_area_per_ton_ft2 * coating_oz_ft2 / _OZ_PER_LB : null;
  const alt_pickup_pct = compared ? 100 * alt_zinc_lb_per_ton / _LB_PER_TON : null;
  const zinc_ratio = compared ? area_per_ton_ft2 / alt_area_per_ton_ft2 : null;
  const zinc_delta_lb_per_ton = compared ? zinc_lb_per_ton - alt_zinc_lb_per_ton : null;
  return {
    thickness_mils, coating_oz_ft2, total_area_ft2, zinc_lb, steel_lb, pickup_pct,
    zinc_lb_per_ton, alt_zinc_lb_per_ton, alt_pickup_pct, zinc_ratio, zinc_delta_lb_per_ton,
    note: "Zinc consumption follows SURFACE AREA and the purchase order is written in TONS, which is why galvanizing prices look strange to a fabricator. Two loads of identical weight can differ by a factor of three or four in the zinc they take, and that is what minimum charges and light-section pricing exist to recover. Surface area per ton runs roughly 100 to 150 sq ft for heavy structural shapes and 300 to 500 for light angle, grating and fabricated assemblies, and it must come from the fabricator's own takeoff rather than a table. ASTM A123 thickness is an AVERAGE with minimums, not a uniform value: the coating grows by reaction with the steel, so a silicon-reactive steel produces a thick dull grey coating that meets the specification and looks nothing like the bright pieces beside it. That is metallurgy, not a defect. Fasteners fall under A153 and sheet under other standards. ASTM A123, the fabricator's takeoff, and the galvanizer govern.",
  };
}
const galvanizeCoatingWeightExample = { inputs: { coating_grade_um: 85, steel_tons: 5, area_per_ton_ft2: 400, alt_area_per_ton_ft2: 120 } };
FINISHING_RENDERERS["galvanize-coating-weight"] = _simpleRenderer({
  citation: "Citation: ASTM A123 Zinc (Hot-Dip Galvanized) Coatings on Iron and Steel Products (by name) - coating grades in microns by material category and steel thickness. The zinc density conversion 1 mil over 1 sq ft = 0.5940 oz, 25.4 microns per mil, 16 oz per lb, 2,000 lb per ton. Surface area per ton is ENTERED from the fabricator's own takeoff; ASTM A123 and the galvanizer govern.",
  example: galvanizeCoatingWeightExample.inputs,
  fields: [
    { key: "coating_grade_um", label: "Specified coating grade (microns)", kind: "number", default: 85 },
    { key: "steel_tons", label: "Steel weight (tons)", kind: "number" },
    { key: "area_per_ton_ft2", label: "Surface area per ton (sq ft/ton)", kind: "number" },
    { key: "alt_area_per_ton_ft2", label: "Compare against area per ton (sq ft/ton, 0 to skip)", kind: "number", default: 120 },
  ],
  outputs: [
    { key: "t", id: "gcw-out-t", label: "Coating thickness", value: (r) => fmt(r.thickness_mils, 2) + " mils" },
    { key: "w", id: "gcw-out-w", label: "Coating weight", value: (r) => fmt(r.coating_oz_ft2, 3) + " oz/sq ft" },
    { key: "a", id: "gcw-out-a", label: "Total surface area", value: (r) => fmt(r.total_area_ft2, 0) + " sq ft" },
    { key: "z", id: "gcw-out-z", label: "Zinc required", value: (r) => fmt(r.zinc_lb, 1) + " lb (" + fmt(r.zinc_lb_per_ton, 1) + " lb per ton)" },
    { key: "p", id: "gcw-out-p", label: "Zinc pickup", value: (r) => fmt(r.pickup_pct, 2) + " % of steel weight" },
    { key: "c", id: "gcw-out-c", label: "Comparison section", value: (r) => r.alt_zinc_lb_per_ton === null ? "not compared" : fmt(r.alt_zinc_lb_per_ton, 1) + " lb per ton, " + fmt(r.alt_pickup_pct, 2) + " % pickup" },
    { key: "r", id: "gcw-out-r", label: "Zinc per ton ratio", value: (r) => r.zinc_ratio === null ? "not compared" : fmt(r.zinc_ratio, 2) + " x (" + fmt(r.zinc_delta_lb_per_ton, 1) + " lb per ton more)" },
    { key: "n", id: "gcw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGalvanizeCoatingWeight,
});

// ============ spec-v1825: pretreatment bath dragout and rinse water ============

// dims: in { dragout_gal_per_1000ft2: L^3 L^-2, area_ft2_per_day: L^2, bath_volume_gal: L^3, bath_concentrate_pct: dimensionless, dilution_ratio: dimensionless, rinse_stages: dimensionless } out: { dragout_gal_day: L^3, concentrate_gal_day: L^3, bath_turnover_days: T, single_rinse_gal_day: L^3, rinse_flow_gal_day: L^3 }
export function computePretreatmentBathDragout({ dragout_gal_per_1000ft2 = 0, area_ft2_per_day = 0, bath_volume_gal = 0, bath_concentrate_pct = 5, dilution_ratio = 1000, rinse_stages = 2 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(dragout_gal_per_1000ft2 > 0)) return { error: "Dragout rate must be positive (gal per 1,000 sq ft)." };
  if (!(area_ft2_per_day > 0)) return { error: "Area processed must be positive (sq ft per day)." };
  if (!(bath_volume_gal > 0)) return { error: "Bath volume must be positive (gal)." };
  if (!(bath_concentrate_pct > 0 && bath_concentrate_pct <= 100)) return { error: "Bath concentration must be in (0, 100] percent." };
  if (!(dilution_ratio > 1)) return { error: "Required rinse dilution ratio must be greater than 1." };
  const stages = Math.round(rinse_stages);
  if (!(stages >= 1)) return { error: "Counterflow rinse stages must be at least 1." };
  const dragout_gal_day = dragout_gal_per_1000ft2 * area_ft2_per_day / 1000;
  const concentrate_gal_day = dragout_gal_day * (bath_concentrate_pct / 100);
  const makeup_water_gal_day = dragout_gal_day - concentrate_gal_day;
  const bath_turnover_days = bath_volume_gal / dragout_gal_day;
  const single_rinse_gal_day = dragout_gal_day * dilution_ratio;
  const flowAt = (n) => dragout_gal_day * Math.pow(dilution_ratio, 1 / n);
  const rinse_flow_gal_day = flowAt(stages);
  const two_stage_gal_day = flowAt(2);
  const three_stage_gal_day = flowAt(3);
  const saving_vs_single_pct = 100 * (single_rinse_gal_day - rinse_flow_gal_day) / single_rinse_gal_day;
  const two_stage_saving_pct = 100 * (single_rinse_gal_day - two_stage_gal_day) / single_rinse_gal_day;
  const three_stage_saving_pct = 100 * (single_rinse_gal_day - three_stage_gal_day) / single_rinse_gal_day;
  const next_stage_saving_gal_day = rinse_flow_gal_day - flowAt(stages + 1);
  return {
    dragout_gal_day, concentrate_gal_day, makeup_water_gal_day, bath_turnover_days,
    single_rinse_gal_day, rinse_flow_gal_day, two_stage_gal_day, three_stage_gal_day,
    saving_vs_single_pct, two_stage_saving_pct, three_stage_saving_pct,
    next_stage_saving_gal_day, stages,
    note: "The required flow falls as the Nth ROOT of the dilution ratio, so the step from one rinse tank to two is the single largest saving available, the step from two to three is an order of magnitude smaller, and a fourth stage usually does not pay for its tank, floor space and transfer. That power law is why lines are built with two or three rinses and almost never with five. The counterflow relation assumes ideal mixing in each stage, complete carry-over between stages, and steady state, and a real rinse falls short of all three, so these flows are a LOWER BOUND. The cheapest gallon is the one never dragged out: longer drain time over the tank, a rack that lets solution run off instead of cupping, drain boards and air knives cut the chemical loss, the rinse water and the effluent load at once, because all three are proportional to the same number. Dragout must be MEASURED for the actual parts and racks (weighing racked parts wet and dry over the tank is the usual method); it varies by an order of magnitude between well-drained flat work and cupped or threaded parts. The chemical supplier's data, the applicable discharge permit and effluent guidelines, and the finishing line engineer govern.",
  };
}
const pretreatmentBathDragoutExample = { inputs: { dragout_gal_per_1000ft2: 1.5, area_ft2_per_day: 20000, bath_volume_gal: 2000, bath_concentrate_pct: 5, dilution_ratio: 1000, rinse_stages: 2 } };
FINISHING_RENDERERS["pretreatment-bath-dragout"] = _simpleRenderer({
  citation: "Citation: the dragout mass balance and the counterflow rinse dilution relation flow = dragout x (dilution ratio)^(1/N) (by name) - standard metal finishing practice. Dragout rate is ENTERED and must be measured for the actual parts, racks and drain practice. The chemical supplier's data and the applicable discharge permit and pretreatment standards govern what may leave the site.",
  example: pretreatmentBathDragoutExample.inputs,
  fields: [
    { key: "dragout_gal_per_1000ft2", label: "Dragout rate (gal per 1,000 sq ft)", kind: "number" },
    { key: "area_ft2_per_day", label: "Area processed (sq ft per day)", kind: "number" },
    { key: "bath_volume_gal", label: "Bath volume (gal)", kind: "number" },
    { key: "bath_concentrate_pct", label: "Bath concentration (% concentrate)", kind: "number", default: 5 },
    { key: "dilution_ratio", label: "Required rinse dilution ratio (:1)", kind: "number", default: 1000 },
    { key: "rinse_stages", label: "Counterflow rinse stages", kind: "number", default: 2, attrs: { step: "1", min: "1" } },
  ],
  outputs: [
    { key: "d", id: "pbd-out-d", label: "Dragout volume", value: (r) => fmt(r.dragout_gal_day, 1) + " gal/day" },
    { key: "c", id: "pbd-out-c", label: "Concentrate lost (makeup)", value: (r) => fmt(r.concentrate_gal_day, 2) + " gal/day concentrate + " + fmt(r.makeup_water_gal_day, 1) + " gal/day water" },
    { key: "t", id: "pbd-out-t", label: "Bath turnover by dragout", value: (r) => fmt(r.bath_turnover_days, 0) + " days" },
    { key: "s", id: "pbd-out-s", label: "Single rinse tank", value: (r) => fmt(r.single_rinse_gal_day, 0) + " gal/day" },
    { key: "f", id: "pbd-out-f", label: "At the entered stage count", value: (r) => fmt(r.rinse_flow_gal_day, 0) + " gal/day at " + r.stages + " stage(s), " + fmt(r.saving_vs_single_pct, 2) + " % less than one tank" },
    { key: "s2", id: "pbd-out-2", label: "Two counterflow stages", value: (r) => fmt(r.two_stage_gal_day, 0) + " gal/day (" + fmt(r.two_stage_saving_pct, 2) + " % saving)" },
    { key: "s3", id: "pbd-out-3", label: "Three counterflow stages", value: (r) => fmt(r.three_stage_gal_day, 0) + " gal/day (" + fmt(r.three_stage_saving_pct, 2) + " % saving)" },
    { key: "x", id: "pbd-out-x", label: "One more stage would save", value: (r) => fmt(r.next_stage_saving_gal_day, 0) + " gal/day" },
    { key: "n", id: "pbd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePretreatmentBathDragout,
});

// ============ spec-v1826: galvanising kettle immersion cycle and throughput ============

// dims: in { lower_min: T, immerse_min: T, withdraw_min: T, travel_min: T, load_lb_per_lift: M, area_per_ton_ft2: L^2 M^-1, steel_specific_heat_btu_lb_f: L^2 T^-2, bath_temp_f: T, ambient_temp_f: T, burner_btu_hr: M L^2 T^-3 } out: { cycle_min: T, lifts_per_hour: T^-1, throughput_lb_hr: M T^-1, heat_demand_btu_hr: M L^2 T^-3, heat_limited_lb_hr: M T^-1 }
export function computeGalvanizeKettleThroughput({ lower_min = 0, immerse_min = 0, withdraw_min = 0, travel_min = 0, load_lb_per_lift = 0, area_per_ton_ft2 = 0, steel_specific_heat_btu_lb_f = 0.12, bath_temp_f = 830, ambient_temp_f = 70, burner_btu_hr = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(lower_min > 0)) return { error: "Lowering time must be positive (min)." };
  if (!(immerse_min > 0)) return { error: "Immersion time must be positive (min)." };
  if (!(withdraw_min > 0)) return { error: "Withdrawal and drain time must be positive (min)." };
  if (!(travel_min > 0)) return { error: "Return travel time must be positive (min)." };
  if (!(load_lb_per_lift > 0)) return { error: "Load per lift must be positive (lb)." };
  if (!(area_per_ton_ft2 > 0)) return { error: "Surface area per ton must be positive (sq ft per ton)." };
  if (!(steel_specific_heat_btu_lb_f > 0)) return { error: "Steel specific heat must be positive (Btu/lb-degF)." };
  if (!(burner_btu_hr > 0)) return { error: "Burner heat delivered to the steel must be positive (Btu/hr)." };
  if (!(bath_temp_f > ambient_temp_f)) return { error: "Bath temperature must be above ambient." };
  const cycle_min = lower_min + immerse_min + withdraw_min + travel_min;
  const lifts_per_hour = 60 / cycle_min;
  const throughput_lb_hr = lifts_per_hour * load_lb_per_lift;
  const throughput_tons_hr = throughput_lb_hr / _LB_PER_TON;
  const area_per_lift_ft2 = (load_lb_per_lift / _LB_PER_TON) * area_per_ton_ft2;
  const area_per_min_ft2 = area_per_lift_ft2 / cycle_min;
  const delta_t_f = bath_temp_f - ambient_temp_f;
  const heat_demand_btu_hr = throughput_lb_hr * steel_specific_heat_btu_lb_f * delta_t_f;
  const heat_limited_lb_hr = burner_btu_hr / (steel_specific_heat_btu_lb_f * delta_t_f);
  const heat_limited_tons_hr = heat_limited_lb_hr / _LB_PER_TON;
  const heat_limited = heat_demand_btu_hr > burner_btu_hr;
  const governing_tons_hr = Math.min(throughput_tons_hr, heat_limited_tons_hr);
  const shortfall_pct = 100 * (throughput_tons_hr - governing_tons_hr) / throughput_tons_hr;
  const governing_verdict = heat_limited
    ? "THE BURNERS GOVERN. The crane cycle promises " + throughput_tons_hr.toFixed(1) + " tons/h but the steel wants " + (heat_demand_btu_hr / 1e6).toFixed(2) + " MMBtu/h against " + (burner_btu_hr / 1e6).toFixed(2) + " delivered, so the real output is " + governing_tons_hr.toFixed(1) + " tons/h."
    : "THE CRANE GOVERNS. The steel wants " + (heat_demand_btu_hr / 1e6).toFixed(2) + " MMBtu/h and the burners deliver " + (burner_btu_hr / 1e6).toFixed(2) + ", so the cycle sets the output at " + throughput_tons_hr.toFixed(1) + " tons/h.";
  return {
    cycle_min, lifts_per_hour, throughput_lb_hr, throughput_tons_hr,
    area_per_lift_ft2, area_per_min_ft2, delta_t_f,
    heat_demand_btu_hr, heat_limited_lb_hr, heat_limited_tons_hr,
    governing_tons_hr, shortfall_pct, heat_limited, governing_verdict,
    note: "A kettle is two machines in series with different limits: the crane is a handling machine and the kettle is a thermal machine. Light work loads the crane and leaves the burners idle; heavy work loads the burners and leaves the crane waiting, so a single tons-per-hour figure for the plant hides which one is binding. TONS PER HOUR AND SQUARE FEET PER HOUR DISAGREE and both are real -- zinc consumption, dross generation and coating quality all follow AREA while the invoice follows WEIGHT. Immersion time is a metallurgical requirement, not a preference: the steel must reach bath temperature for the iron-zinc reaction to proceed, and pulling early gives a thin or incomplete coating that fails inspection. THE REMEDY FOR A HEAT-LIMITED KETTLE IS BURNER CAPACITY OR SCHEDULING, NOT A HOTTER BATH -- raising bath temperature accelerates kettle wall attack, and a kettle failure is the most expensive event a galvanizing plant has. This heat figure covers only heating the steel; a real kettle also loses heat through its walls and to ash and dross, reheats the zinc the work removes, and evaporates flux, so the burner capacity actually needed exceeds it. Pickling, fluxing, drying and quenching are not counted and any of them can be the line's real bottleneck. The galvanizer's own cycle records, the kettle and burner manufacturers' data, and ASTM A123 govern.",
  };
}
const galvanizeKettleThroughputExample = { inputs: { lower_min: 1, immerse_min: 5, withdraw_min: 2, travel_min: 2, load_lb_per_lift: 2000, area_per_ton_ft2: 400, steel_specific_heat_btu_lb_f: 0.12, bath_temp_f: 830, ambient_temp_f: 70, burner_btu_hr: 1500000 } };
FINISHING_RENDERERS["galvanize-kettle-throughput"] = _simpleRenderer({
  citation: "Citation: the kettle cycle throughput relation (60 / cycle time x load per lift) and the sensible heat demand of the steel (lb/h x specific heat x temperature rise), with ASTM A123 named for the coating the immersion time is chosen to produce. Immersion time and burner output are ENTERED; the galvanizer's own cycle and coating records govern.",
  example: galvanizeKettleThroughputExample.inputs,
  fields: [
    { key: "lower_min", label: "Lowering time (min)", kind: "number", default: 1 },
    { key: "immerse_min", label: "Immersion time (min)", kind: "number" },
    { key: "withdraw_min", label: "Withdrawal and drain time (min)", kind: "number", default: 2 },
    { key: "travel_min", label: "Return travel time (min)", kind: "number", default: 2 },
    { key: "load_lb_per_lift", label: "Load per lift (lb)", kind: "number" },
    { key: "area_per_ton_ft2", label: "Surface area per ton (sq ft/ton)", kind: "number" },
    { key: "steel_specific_heat_btu_lb_f", label: "Steel specific heat (Btu/lb-degF)", kind: "number", default: 0.12 },
    { key: "bath_temp_f", label: "Bath temperature (degF)", kind: "number", default: 830 },
    { key: "ambient_temp_f", label: "Ambient steel temperature (degF)", kind: "number", default: 70 },
    { key: "burner_btu_hr", label: "Burner heat delivered to the steel (Btu/hr)", kind: "number", default: 1500000 },
  ],
  outputs: [
    { key: "c", id: "gkt-out-c", label: "Cycle time", value: (r) => fmt(r.cycle_min, 1) + " min, " + fmt(r.lifts_per_hour, 2) + " lifts/hr" },
    { key: "o", id: "gkt-out-o", label: "Crane-cycle throughput", value: (r) => fmt(r.throughput_lb_hr, 0) + " lb/hr (" + fmt(r.throughput_tons_hr, 1) + " tons/hr)" },
    { key: "a", id: "gkt-out-a", label: "Area processed", value: (r) => fmt(r.area_per_min_ft2, 1) + " sq ft/min" },
    { key: "h", id: "gkt-out-h", label: "Heat demand of the steel", value: (r) => fmt(r.heat_demand_btu_hr, 0) + " Btu/hr (" + fmt(r.heat_demand_btu_hr / 1000000, 2) + " MMBtu/hr)" },
    { key: "l", id: "gkt-out-l", label: "Heat-limited throughput", value: (r) => fmt(r.heat_limited_lb_hr, 0) + " lb/hr (" + fmt(r.heat_limited_tons_hr, 1) + " tons/hr)" },
    { key: "g", id: "gkt-out-g", label: "Governing output", value: (r) => fmt(r.governing_tons_hr, 1) + " tons/hr, shortfall " + fmt(r.shortfall_pct, 1) + " %" },
    { key: "v", id: "gkt-out-v", label: "Which constraint", value: (r) => r.governing_verdict },
    { key: "n", id: "gkt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGalvanizeKettleThroughput,
});

// ============ spec-v1827: phosphate conversion coating weight ============

// dims: in { panel_length_in: L, panel_width_in: L, faces_coated: dimensionless, mass_before_g: M, mass_after_g: M, spec_min_mg_ft2: M L^-2, spec_max_mg_ft2: M L^-2 } out: { area_one_face_ft2: L^2, area_coated_ft2: L^2, mass_lost_mg: M, coating_mg_ft2: M L^-2, coating_g_m2: M L^-2 }
export function computePhosphateCoatingWeight({ panel_length_in = 0, panel_width_in = 0, faces_coated = 2, mass_before_g = 0, mass_after_g = 0, spec_min_mg_ft2 = 150, spec_max_mg_ft2 = 300 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(panel_length_in > 0)) return { error: "Panel length must be positive (in)." };
  if (!(panel_width_in > 0)) return { error: "Panel width must be positive (in)." };
  const faces = Math.round(faces_coated);
  if (!(faces === 1 || faces === 2)) return { error: "Faces coated must be 1 or 2." };
  if (!(mass_before_g > 0)) return { error: "Mass before stripping must be positive (g)." };
  if (!(mass_after_g > 0)) return { error: "Mass after stripping must be positive (g)." };
  if (!(mass_after_g < mass_before_g)) return { error: "Mass after stripping must be less than the mass before stripping." };
  if (!(spec_min_mg_ft2 > 0)) return { error: "Specification minimum must be positive (mg/sq ft)." };
  if (!(spec_max_mg_ft2 > spec_min_mg_ft2)) return { error: "Specification maximum must exceed the minimum." };
  const area_one_face_ft2 = panel_length_in * panel_width_in / 144;
  const area_coated_ft2 = area_one_face_ft2 * faces;
  const mass_lost_mg = (mass_before_g - mass_after_g) * 1000;
  const coating_mg_ft2 = mass_lost_mg / area_coated_ft2;
  const coating_g_m2 = coating_mg_ft2 * 10.7639 / 1000;
  const one_sided_mg_ft2 = mass_lost_mg / area_one_face_ft2;
  const within_spec = coating_mg_ft2 >= spec_min_mg_ft2 && coating_mg_ft2 <= spec_max_mg_ft2;
  const margin_mg_ft2 = within_spec ? 0 : (coating_mg_ft2 < spec_min_mg_ft2 ? spec_min_mg_ft2 - coating_mg_ft2 : coating_mg_ft2 - spec_max_mg_ft2);
  const spec_verdict = within_spec
    ? "WITHIN the entered " + fmt(spec_min_mg_ft2, 0) + " to " + fmt(spec_max_mg_ft2, 0) + " mg/sq ft range."
    : (coating_mg_ft2 < spec_min_mg_ft2
      ? "FAILS THE MINIMUM by " + fmt(margin_mg_ft2, 0) + " mg/sq ft -- a light coating, the kind that gives poor paint adhesion and corrosion resistance in service."
      : "EXCEEDS THE MAXIMUM by " + fmt(margin_mg_ft2, 0) + " mg/sq ft -- a coarse, friable coating that fails within itself under the paint film.");
  return {
    area_one_face_ft2, area_coated_ft2, mass_lost_mg, coating_mg_ft2, coating_g_m2,
    one_sided_mg_ft2, within_spec, margin_mg_ft2, spec_verdict, faces,
    note: "THE AREA IS BOTH FACES OF A FLAT PANEL: a 4 x 6 in panel is 48 sq in, not 24. Dividing by one face of a two-faced panel reports exactly DOUBLE the coating weight, which is enough to turn a failing coating into a passing one with a correct measurement and a correct balance -- the one-face figure is reported here so the error is visible rather than silent. Typical ranges are roughly 150 to 300 mg/sq ft for zinc phosphate as a paint base and roughly 30 to 80 for iron phosphate, but ranges are set by the coating supplier and the paint system that follows and are entered rather than assumed. BOTH FAILURE DIRECTIONS ARE REAL, which is why a specification states a range rather than a minimum: a light coating leaves bare or thinly covered areas and shows up as blistering or filiform corrosion, while a heavy coating is coarse and friable and fails within itself under a well-adhered paint film. THE STRIP SOLUTION IS WHERE A RESULT QUIETLY GOES WRONG -- it must dissolve the coating and leave the substrate alone, and one that takes metal with the coating reports a coating weight that is partly base metal. Suspect it whenever a result comes back higher than the process can plausibly produce. Coating weight is a PROXY for coverage and crystal structure, neither of which it measures; those are evaluated by microscopy and by performance testing. The applicable ASTM test method, the coating supplier's specification, and the paint system requirements govern.",
  };
}
const phosphateCoatingWeightExample = { inputs: { panel_length_in: 4, panel_width_in: 6, faces_coated: 2, mass_before_g: 45.682, mass_after_g: 45.647, spec_min_mg_ft2: 150, spec_max_mg_ft2: 300 } };
FINISHING_RENDERERS["phosphate-coating-weight"] = _simpleRenderer({
  citation: "Citation: the strip-and-weigh conversion coating weight method (by name) - mass lost on stripping divided by the COATED area, both faces of a flat panel. Conversion 1 mg/sq ft = 10.7639/1,000 g/m^2. Typical zinc phosphate roughly 150 to 300 mg/sq ft and iron phosphate roughly 30 to 80, entered rather than assumed. The applicable ASTM test method and the coating supplier's specification govern.",
  example: phosphateCoatingWeightExample.inputs,
  fields: [
    { key: "panel_length_in", label: "Panel length (in)", kind: "number" },
    { key: "panel_width_in", label: "Panel width (in)", kind: "number" },
    { key: "faces_coated", label: "Faces coated (1 or 2)", kind: "number", default: 2, attrs: { step: "1", min: "1" } },
    { key: "mass_before_g", label: "Mass before stripping (g)", kind: "number" },
    { key: "mass_after_g", label: "Mass after stripping (g)", kind: "number" },
    { key: "spec_min_mg_ft2", label: "Specification minimum (mg/sq ft)", kind: "number", default: 150 },
    { key: "spec_max_mg_ft2", label: "Specification maximum (mg/sq ft)", kind: "number", default: 300 },
  ],
  outputs: [
    { key: "a", id: "pcw-out-a", label: "Coated area", value: (r) => fmt(r.area_coated_ft2, 4) + " sq ft (" + fmt(r.area_one_face_ft2, 4) + " sq ft per face)" },
    { key: "m", id: "pcw-out-m", label: "Mass lost on stripping", value: (r) => fmt(r.mass_lost_mg, 1) + " mg" },
    { key: "w", id: "pcw-out-w", label: "Coating weight", value: (r) => fmt(r.coating_mg_ft2, 0) + " mg/sq ft (" + fmt(r.coating_g_m2, 2) + " g/m^2)" },
    { key: "v", id: "pcw-out-v", label: "Against specification", value: (r) => r.spec_verdict },
    { key: "e", id: "pcw-out-e", label: "If one face had been used", value: (r) => fmt(r.one_sided_mg_ft2, 0) + " mg/sq ft" },
    { key: "n", id: "pcw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePhosphateCoatingWeight,
});
