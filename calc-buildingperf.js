// Group C: Building performance, air leakage, and envelope moisture.
//
// spec-v1495..v1504 (scope-trade-expansion-2, the building performance band):
// the diagnostic side of the building envelope -- what a blower door reading
// means, whether a house is too tight for the appliances in it, how the
// leakage divides between planes, and where an assembly's sheathing sits
// against the dew point.
//
// The thread through it is that a single measured number rarely answers the
// question on its own. CFM50 becomes a hole in square inches, a tightness
// limit, a leakage split, and a natural infiltration rate that varies
// threefold with where the house stands -- and each of those is a different
// conversation with the homeowner and a different scope of work.
//
// Two of the band's specs were CUT as duplicates: spec-v1501's natural
// infiltration is already in blower-door-ach50, and spec-v1503's wall dew
// point is already in wall-condensation-gradient.

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

// Compact renderer factory, copied verbatim from calc-masonry.js (same
// ui-fields imports) per the new-module convention; only the inner render
// function's name differs, so the schema-coverage gates read it unchanged.
function _simpleRenderer(spec) {
  const _bpRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id || f.key, f.options);
      else field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any", min: "0" });
      fields[f.key] = field;
      if (f.default !== undefined) {
        if (f.kind === "select") field.select.value = f.default;
        else field.input.value = String(f.default);
      }
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = makeOutputLine(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        if (f.kind === "select") fields[f.key].select.value = v[f.key];
        else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) {
        if (f.kind === "select") params[f.key] = fields[f.key].select.value;
        else params[f.key] = Number(fields[f.key].input.value) || 0;
      }
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener(f.kind === "select" ? "change" : "input", update);
    }
  };

  _bpRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _bpRender;
}


export const BUILDINGPERF_RENDERERS = {};

// Unit constants, each with a leading-underscore name of its own.
//
// The ELA divisor: CFM50 to effective leakage area in square inches at the
// 4 Pa US reference. The Canadian equivalent leakage area uses a 10 Pa
// reference and a divisor of 10.0, which is why the same house reports two
// leakage areas differing by about a factor of two.
const _BP_ELA_DIVISOR = 18.9;
const _BP_EQLA_DIVISOR = 10.0;
// Normalized leakage: NL = 1000 (ELA / floor area) (H / 8.2)^0.3, with the
// reference storey height in feet and the exponent from the LBL work.
const _BP_NL_REFERENCE_HEIGHT_FT = 8.2;
const _BP_NL_HEIGHT_EXPONENT = 0.3;
// ASHRAE 62.2 whole-house rate: 0.03 cfm per square foot plus 7.5 cfm per
// (bedrooms + 1).
const _BP_622_AREA_COEFF = 0.03;
const _BP_622_PERSON_COEFF = 7.5;
// STACK EFFECT. The established relation is dP(Pa) = 3460 h(m) (1/T_o - 1/T_i)
// with temperatures in kelvin. Converted to feet and degrees Rankine that
// constant is 3460 x 0.3048 x 1.8 = 1898.3 Pa per foot per reciprocal degree
// Rankine, and it is carried here in that form so the calculation stays in
// the units a US reader measures in.
//
// spec-v1500 pairs a 0.0188 constant with this same (1/T_o - 1/T_i) bracket,
// which is a mismatch of about 400x: on its own worked example that gives
// 0.027 Pa where the relation gives 11.0 Pa, and the spec duly printed 0 Pa
// for every case including a 240 ft tower.
const _BP_STACK_PA_PER_FT_PER_RANKINE = 1898.3;
const _BP_PA_PER_IN_WC = 248.84;
const _BP_RANKINE_OFFSET = 459.67;
// A therm is 100,000 BTU exactly, and there are 24 hours in a day.
const _BP_BTU_PER_THERM = 100000;
const _BP_HOURS_PER_DAY = 24;

// Magnus dew point, non-exported and above the first export, returning an
// arithmetic expression rather than a bare identifier.
const _bpDewPointF = (tf, rh) => {
  const tc = (tf - 32) * 5 / 9;
  const gamma = Math.log(rh / 100) + 17.62 * tc / (243.12 + tc);
  return (243.12 * gamma / (17.62 - gamma)) * 9 / 5 + 32;
};

// =====================================================================
// spec-v1495: effective leakage area and normalized leakage.
// =====================================================================
//
// The practical value of ELA is rhetorical: telling someone their house has a
// ten by ten inch hole in it permanently changes a conversation that "5.8
// ACH50" does not.
// dims: in { cfm50: L^3 T^-1, floor_area_ft2: L^2, ceiling_height_ft: L, storeys: dimensionless } out: { ela_in2: L^2, eqla_in2: L^2, normalized_leakage: dimensionless, sla: dimensionless, hole_side_in: L, ach50: T^-1 }
export function computeEffectiveLeakageArea({
  cfm50 = 0, floor_area_ft2 = 0, ceiling_height_ft = 8, storeys = 1,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(cfm50 > 0)) return { error: "The blower-door CFM50 must be positive (cfm)." };
  if (!(floor_area_ft2 > 0)) return { error: "Conditioned floor area must be positive (sq ft)." };
  if (!(ceiling_height_ft > 0)) return { error: "Ceiling height must be positive (ft)." };
  if (!(storeys >= 1)) return { error: "The building must have at least one storey." };
  const ela_in2 = cfm50 / _BP_ELA_DIVISOR;
  const eqla_in2 = cfm50 / _BP_EQLA_DIVISOR;
  const convention_ratio = eqla_in2 / ela_in2;
  // Normalized leakage carries the height correction, because a tall house
  // drives more stack flow through the same hole.
  const building_height_ft = ceiling_height_ft * storeys;
  const height_factor = Math.pow(building_height_ft / _BP_NL_REFERENCE_HEIGHT_FT, _BP_NL_HEIGHT_EXPONENT);
  const normalized_leakage = 1000 * (ela_in2 / floor_area_ft2) * height_factor;
  const sla = ela_in2 / floor_area_ft2;
  // The sentence that changes a homeowner's mind.
  const hole_side_in = Math.sqrt(ela_in2);
  const volume_ft3 = floor_area_ft2 * building_height_ft;
  const ach50 = cfm50 * 60 / volume_ft3;
  const hole_verdict = fmt(ela_in2, 1) + " square inches is a hole about " + fmt(hole_side_in, 1) + " in on a side -- a " + fmt(hole_side_in, 0) + " by " + fmt(hole_side_in, 0) + " inch opening in the envelope, permanently. That is the same measurement as " + fmt(ach50, 2) + " ACH50, and it is the one that changes a homeowner's mind";
  const convention_verdict = "on the Canadian 10 Pa convention the same house reports " + fmt(eqla_in2, 1) + " sq in of equivalent leakage area, " + fmt(convention_ratio, 2) + " times the US 4 Pa figure -- an identical building, differing purely by the reference pressure, which is a common source of confused comparisons";
  const nl_verdict = "normalized leakage is " + fmt(normalized_leakage, 2) + " at " + fmt(building_height_ft, 1) + " ft of height, from a specific leakage area of " + fmt(sla, 5) + " -- and the height correction is why two houses with the SAME ACH50 can have quite different real air change rates, which is what makes normalized leakage rather than ACH50 the right basis for estimating natural infiltration";
  if (![ela_in2, eqla_in2, normalized_leakage, sla, hole_side_in, ach50].every(Number.isFinite)) return { error: "Leakage area math is not a finite value." };
  return {
    ela_in2, eqla_in2, convention_ratio, building_height_ft, height_factor,
    normalized_leakage, sla, hole_side_in, volume_ft3, ach50,
    hole_verdict, convention_verdict, nl_verdict,
    note: "A blower-door result expressed as the hole it actually represents. Effective leakage area converts CFM50 into square inches by fitting the building's leakage curve back to a reference pressure and treating the whole envelope as one sharp-edged orifice -- a single divisor, because that is all the fit amounts to. The US convention references 4 Pa and the Canadian equivalent leakage area references 10 Pa, so the SAME house has two leakage areas differing by about a factor of two, and quoting the wrong one is a frequent source of confused comparisons between reports. Both are reported here for that reason. Normalized leakage adds a height correction, because a tall house drives more stack flow through the same hole than a single-storey house does. That is what makes normalized leakage rather than ACH50 the right basis for estimating natural infiltration, and it is why two houses with identical ACH50 can have quite different real-world air change rates -- the ACH50 number normalizes by volume, which is not what drives the flow. The practical value of leakage area, though, is rhetorical rather than technical, and that is worth being explicit about. A homeowner told their house tests at some number of air changes per hour at fifty pascals has learned nothing they can picture. Told that the house has a hole in it the size of an open window, permanently, in every weather, they have learned something they can act on. The arithmetic is the same measurement; only the sentence differs. This is a conversion of an ENTERED measurement: it does not perform the blower-door test, correct for temperature, altitude or the exponent of the actual leakage curve (the single divisor assumes a typical exponent near 0.65), locate any of the leakage, or estimate natural infiltration, which needs a climate and shielding factor and is a separate calculation. ASTM E779 or E1827, the RESNET or BPI protocol in force, and the rater's own procedure govern.",
  };
}
export const effectiveLeakageAreaExample = { inputs: { cfm50: 1850, floor_area_ft2: 2400, ceiling_height_ft: 8, storeys: 1 } };
BUILDINGPERF_RENDERERS["effective-leakage-area"] = _simpleRenderer({
  citation: "Citation: effective leakage area ELA = CFM50 / 18.9 at the US 4 Pa reference and equivalent leakage area EqLA = CFM50 / 10.0 at the Canadian 10 Pa reference, with normalized leakage NL = 1000 (ELA / floor area) (H / 8.2)^0.3 from the Lawrence Berkeley work. A conversion of an ENTERED measurement: it does not perform the test, correct for temperature, altitude or the actual leakage exponent (the single divisor assumes a typical value near 0.65), locate any leakage, or estimate natural infiltration, which needs a climate and shielding factor. ASTM E779 or E1827 and the RESNET or BPI protocol in force govern.",
  example: effectiveLeakageAreaExample.inputs,
  fields: [
    { key: "cfm50", label: "Blower-door CFM50", kind: "number", attrs: { step: "any" } },
    { key: "floor_area_ft2", label: "Conditioned floor area (sq ft)", kind: "number" },
    { key: "ceiling_height_ft", label: "Average ceiling height (ft)", kind: "number", default: 8, attrs: { step: "any" } },
    { key: "storeys", label: "Storeys", kind: "number", default: 1, attrs: { step: "any", min: "1" } },
  ],
  outputs: [
    { key: "e", id: "ela-out-e", label: "Effective leakage area", value: (r) => fmt(r.ela_in2, 1) + " sq in at the 4 Pa reference" },
    { key: "h", id: "ela-out-h", label: "What that is", value: (r) => r.hole_verdict },
    { key: "c", id: "ela-out-c", label: "The other convention", value: (r) => r.convention_verdict },
    { key: "n", id: "ela-out-n", label: "Normalized leakage", value: (r) => r.nl_verdict },
    { key: "z", id: "ela-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeEffectiveLeakageArea,
});

// =====================================================================
// spec-v1496: minimum ventilation vs building tightness limit.
// =====================================================================
//
// The logic runs BACKWARDS from the ventilation requirement: the tightness
// limit is the leakage below which the free share no longer covers it. Above
// the limit sealing is pure benefit; below it, sealing without adding a fan
// trades energy for air quality, and that is not a trade to make silently.
// dims: in { floor_area_ft2: L^2, bedrooms: dimensionless, cfm50: L^3 T^-1, n_factor: dimensionless, ceiling_height_ft: L, planned_cfm50_reduction: L^3 T^-1 } out: { required_cfm: L^3 T^-1, tightness_limit_cfm50: L^3 T^-1, margin_cfm50: L^3 T^-1, natural_cfm: L^3 T^-1, ach50: T^-1 }
export function computeBuildingTightnessLimit({
  floor_area_ft2 = 0, bedrooms = 0, cfm50 = 0, n_factor = 17,
  ceiling_height_ft = 8, planned_cfm50_reduction = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(floor_area_ft2 > 0)) return { error: "Conditioned floor area must be positive (sq ft)." };
  if (bedrooms < 0) return { error: "Bedrooms cannot be negative." };
  if (!(cfm50 > 0)) return { error: "The measured CFM50 must be positive (cfm)." };
  if (!(n_factor > 0)) return { error: "The LBL N factor must be positive -- it runs roughly from 10 in a cold, windy, exposed, tall situation to over 30 in a mild, sheltered, single-storey one." };
  if (!(ceiling_height_ft > 0)) return { error: "Ceiling height must be positive (ft)." };
  if (planned_cfm50_reduction < 0) return { error: "A planned air-sealing reduction cannot be negative (cfm)." };
  const required_cfm = _BP_622_AREA_COEFF * floor_area_ft2 + _BP_622_PERSON_COEFF * (bedrooms + 1);
  const tightness_limit_cfm50 = required_cfm * n_factor;
  const natural_cfm = cfm50 / n_factor;
  const margin_cfm50 = cfm50 - tightness_limit_cfm50;
  const margin_pct = tightness_limit_cfm50 > 0 ? margin_cfm50 / tightness_limit_cfm50 * 100 : 0;
  const above_limit = cfm50 > tightness_limit_cfm50;
  const volume_ft3 = floor_area_ft2 * ceiling_height_ft;
  const ach50 = cfm50 * 60 / volume_ft3;
  const limit_verdict = above_limit
    ? "the house sits " + fmt(margin_cfm50, 0) + " CFM50 ABOVE the " + fmt(tightness_limit_cfm50, 0) + " limit, so as tested it draws enough air naturally -- but the margin is only " + fmt(margin_pct, 0) + "%"
    : "the house sits " + fmt(-margin_cfm50, 0) + " CFM50 BELOW the " + fmt(tightness_limit_cfm50, 0) + " limit, so natural infiltration no longer covers the " + fmt(required_cfm, 0) + " cfm requirement and mechanical ventilation is required";
  // The scope-of-work question: what a planned sealing job does to the verdict.
  const has_plan = planned_cfm50_reduction > 0;
  const after_cfm50 = cfm50 - planned_cfm50_reduction;
  const after_above = has_plan && after_cfm50 > tightness_limit_cfm50;
  const crosses_limit = has_plan && above_limit && !after_above;
  const plan_verdict = !has_plan
    ? (above_limit
      ? "a sealing job of " + fmt(margin_cfm50, 0) + " CFM50 would take this house to the limit -- worth knowing before the scope is written rather than after"
      : "(no planned reduction entered; the house is already below the limit)")
    : crosses_limit
      ? "the planned " + fmt(planned_cfm50_reduction, 0) + " CFM50 of sealing takes the house to " + fmt(after_cfm50, 0) + ", BELOW the limit -- so the scope of work should include the ventilation fan rather than discovering the need afterward"
      : after_above
        ? "after the planned " + fmt(planned_cfm50_reduction, 0) + " CFM50 of sealing the house is at " + fmt(after_cfm50, 0) + ", still above the limit"
        : "the house is already below the limit, and sealing further only widens the gap";
  const natural_verdict = "natural infiltration is about " + fmt(natural_cfm, 0) + " cfm at an N of " + fmt(n_factor, 0) + " -- a SEASONAL AVERAGE, wrong on any given day by a wide margin, and the reason the tightness limit is climate-dependent rather than a single number";
  if (![required_cfm, tightness_limit_cfm50, margin_cfm50, natural_cfm, ach50, after_cfm50].every(Number.isFinite)) return { error: "Tightness limit math is not a finite value." };
  return {
    required_cfm, tightness_limit_cfm50, natural_cfm, margin_cfm50, margin_pct,
    above_limit, volume_ft3, ach50, limit_verdict,
    has_plan, after_cfm50, after_above, crosses_limit, plan_verdict, natural_verdict,
    note: "The leakage below which a house stops ventilating itself, and whether the one in front of you is above or below it. The logic runs backwards from the ventilation requirement rather than forwards from the test. A house needs a certain outdoor air rate; a leaky house gets some of that for free through infiltration; the building tightness limit is the CFM50 at which the free share exactly covers the requirement. Above the limit, air sealing is pure benefit -- less energy, no ventilation consequence. Below it, sealing without adding a fan trades energy for indoor air quality, and that is not a trade a contractor should make silently on a homeowner's behalf. The limit is the ventilation requirement times the LBL N factor, and N is what ties it to place and building rather than to the house alone. A windy cold exposed site drives far more natural infiltration through the same hole than a sheltered mild one, so the same house has a different tightness limit depending on where it stands -- which is the whole reason the limit cannot be a single number in a code table. The practical use is writing the scope of work. A house comfortably above the limit today can be below it after one afternoon of sealing can lights, top plates and the rim joist, and the moment to discover that is while the scope is being written rather than after the crew has left. That is why the planned reduction is an input here: the question is not only where the house is but where the job will put it. Natural infiltration itself is a seasonal average and is wrong on any given day by a wide margin -- still mild days give almost nothing, a windy cold night gives multiples -- so a house that meets its requirement on the annual mean can be badly under-ventilated for weeks at a time. Using an infiltration estimate to claim a house is adequately ventilated is the error this calculation is most often misused to commit. This does not measure anything, select the N factor (which depends on climate zone, storeys, shielding and leakiness), size or select a ventilation system, or address distribution, filtration and the source control that matter as much as the rate. ASHRAE 62.2, the BPI or RESNET protocol in force, and the rater's own judgment govern.",
  };
}
export const buildingTightnessLimitExample = { inputs: { floor_area_ft2: 2400, bedrooms: 3, cfm50: 1850, n_factor: 17, ceiling_height_ft: 8, planned_cfm50_reduction: 200 } };
BUILDINGPERF_RENDERERS["building-tightness-limit"] = _simpleRenderer({
  citation: "Citation: the building tightness limit as weatherization practice states it -- the ASHRAE 62.2 whole-house rate (0.03 cfm per sq ft plus 7.5 cfm per bedroom-plus-one) multiplied by the LBL N factor gives the CFM50 whose natural infiltration just covers the requirement. The N factor is ENTERED because it depends on climate zone, storeys, shielding and leakiness, and it runs roughly from 10 to over 30. Natural infiltration estimated this way is a SEASONAL AVERAGE and is wrong on any given day by a wide margin. It does not measure anything, select the N factor, size or select a ventilation system, or address distribution, filtration and source control. ASHRAE 62.2 and the BPI or RESNET protocol in force govern.",
  example: buildingTightnessLimitExample.inputs,
  fields: [
    { key: "floor_area_ft2", label: "Conditioned floor area (sq ft)", kind: "number" },
    { key: "bedrooms", label: "Bedrooms", kind: "number", attrs: { step: "1", min: "0" } },
    { key: "cfm50", label: "Measured CFM50", kind: "number", attrs: { step: "any" } },
    { key: "n_factor", label: "LBL N factor", kind: "number", default: 17, attrs: { step: "any" } },
    { key: "ceiling_height_ft", label: "Average ceiling height (ft)", kind: "number", default: 8, attrs: { step: "any" } },
    { key: "planned_cfm50_reduction", label: "Planned air-sealing reduction (CFM50, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "r", id: "btl-out-r", label: "Ventilation required", value: (r) => fmt(r.required_cfm, 0) + " cfm by ASHRAE 62.2" },
    { key: "l", id: "btl-out-l", label: "Tightness limit", value: (r) => fmt(r.tightness_limit_cfm50, 0) + " CFM50; the house tests at " + fmt(r.ach50, 2) + " ACH50" },
    { key: "v", id: "btl-out-v", label: "Where the house sits", value: (r) => r.limit_verdict },
    { key: "p", id: "btl-out-p", label: "After the planned sealing", value: (r) => r.plan_verdict },
    { key: "i", id: "btl-out-i", label: "Natural infiltration", value: (r) => r.natural_verdict },
    { key: "n", id: "btl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBuildingTightnessLimit,
});

// =====================================================================
// spec-v1497: ASHRAE 62.1 ventilation rate procedure (multiple zone).
// =====================================================================
//
// A single air handler delivers ONE outdoor air fraction to every zone, so the
// zone with the highest ratio of required outdoor air to primary air -- the
// critical zone -- sets the fraction the whole system must run at, and every
// other zone is over-ventilated as a consequence.
// dims: in { rp_cfm_per_person: L^3 T^-1, ra_cfm_per_ft2: L T^-1, ez: dimensionless, people_1: dimensionless, area_1_ft2: L^2, primary_1_cfm: L^3 T^-1, people_2: dimensionless, area_2_ft2: L^2, primary_2_cfm: L^3 T^-1, people_3: dimensionless, area_3_ft2: L^2, primary_3_cfm: L^3 T^-1, diversity: dimensionless } out: { vou_cfm: L^3 T^-1, vps_cfm: L^3 T^-1, xs: dimensionless, zp_max: dimensionless, ev: dimensionless, vot_cfm: L^3 T^-1 }
export function computeVentilationRateProcedure({
  rp_cfm_per_person = 0, ra_cfm_per_ft2 = 0, ez = 1,
  people_1 = 0, area_1_ft2 = 0, primary_1_cfm = 0,
  people_2 = 0, area_2_ft2 = 0, primary_2_cfm = 0,
  people_3 = 0, area_3_ft2 = 0, primary_3_cfm = 0,
  diversity = 1,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(rp_cfm_per_person > 0)) return { error: "The per-person rate must be positive (cfm/person)." };
  if (ra_cfm_per_ft2 < 0) return { error: "The per-area rate cannot be negative (cfm/sq ft)." };
  if (!(ez > 0 && ez <= 1.2)) return { error: "Zone air distribution effectiveness must be above 0 and at most 1.2." };
  if (!(diversity > 0 && diversity <= 1)) return { error: "The occupant diversity factor must be above 0 and at most 1." };
  const zones = [
    ["1", people_1, area_1_ft2, primary_1_cfm],
    ["2", people_2, area_2_ft2, primary_2_cfm],
    ["3", people_3, area_3_ft2, primary_3_cfm],
  ];
  for (const [label, pz, az, vpz] of zones) {
    if (pz < 0 || az < 0 || vpz < 0) return { error: "Zone " + label + ": people, area and primary airflow cannot be negative." };
    if ((pz > 0 || az > 0) && !(vpz > 0)) return { error: "Zone " + label + " has a load but no primary airflow, so its outdoor air fraction is undefined." };
  }
  const active = zones.filter(([, pz, az]) => pz > 0 || az > 0);
  if (active.length < 1) return { error: "Enter at least one zone with people or floor area." };
  const rows = active.map(([label, pz, az, vpz]) => {
    const vbz = rp_cfm_per_person * pz + ra_cfm_per_ft2 * az;
    const voz = vbz / ez;
    return { label, pz, az, vpz, vbz, voz, zp: voz / vpz };
  });
  const people_term = rows.reduce((s, z) => s + rp_cfm_per_person * z.pz, 0);
  const area_term = rows.reduce((s, z) => s + ra_cfm_per_ft2 * z.az, 0);
  // The uncorrected intake applies diversity to the PEOPLE term only.
  const vou_cfm = diversity * people_term + area_term;
  const vps_cfm = rows.reduce((s, z) => s + z.vpz, 0);
  if (!(vps_cfm > 0)) return { error: "Total primary airflow must be positive." };
  const xs = vou_cfm / vps_cfm;
  let critical = rows[0];
  for (const z of rows) if (z.zp > critical.zp) critical = z;
  const zp_max = critical.zp;
  // The simplified 62.1 system ventilation efficiency.
  const ev = 1 + xs - zp_max;
  if (!(ev > 0)) return { error: "System ventilation efficiency is not positive -- the critical zone's outdoor air fraction exceeds what the system can deliver, and the design needs more primary air to that zone or a dedicated outdoor air path." };
  const vot_cfm = vou_cfm / ev;
  const penalty_cfm = vot_cfm - vou_cfm;
  const rows_text = rows.map((z) => "zone " + z.label + " Vbz " + fmt(z.vbz, 0) + ", Voz " + fmt(z.voz, 0) + ", Zp " + fmt(z.zp, 3)).join("; ");
  const critical_verdict = "zone " + critical.label + " is the CRITICAL zone at Zp " + fmt(zp_max, 3) + " -- it has the highest ratio of required outdoor air to the primary air it receives, so it sets the fraction the whole system runs at and every other zone is over-ventilated as a consequence";
  const efficiency_verdict = "system ventilation efficiency " + fmt(ev, 4) + " = 1 + " + fmt(xs, 4) + " - " + fmt(zp_max, 4) + ", so the intake is " + fmt(vot_cfm, 0) + " cfm against an uncorrected " + fmt(vou_cfm, 0) + " -- a " + fmt(penalty_cfm, 0) + " cfm penalty, " + fmt(penalty_cfm / vou_cfm * 100, 1) + "%, paid because one zone is short of primary air";
  // The fix is REDISTRIBUTION at constant total primary air, not simply more
  // air to the critical zone. Adding air raises Vps, which lowers Xs as well
  // as Zp, and on this example Xs falls faster -- Ev goes DOWN and the intake
  // goes UP. Moving air from an over-ventilated zone to the critical one holds
  // Vps fixed, so only Zp moves and Ev rises.
  const fix_verdict = "the fix is to REDISTRIBUTE primary air toward the critical zone from the zones the design over-ventilates, holding the system total where it is: that lowers the critical zone's Zp without lowering the system fraction with it, so the efficiency rises and the intake comes down -- usually far cheaper than conditioning the extra outdoor air for the life of the building. Simply adding primary air to the critical zone is NOT the same move and can make this worse, because the added air raises the system's total primary flow and lowers the system fraction alongside the zone fraction. A design that responds to a low efficiency by raising the INTAKE has treated the symptom";
  if (![vou_cfm, vps_cfm, xs, zp_max, ev, vot_cfm].every(Number.isFinite)) return { error: "Ventilation rate procedure math is not a finite value." };
  return {
    zone_count: rows.length, rows_text, people_term, area_term,
    vou_cfm, vps_cfm, xs, critical_label: critical.label, zp_max, ev, vot_cfm, penalty_cfm,
    critical_verdict, efficiency_verdict, fix_verdict,
    note: "The outdoor air a multiple-zone system must draw at its intake, which is more than the sum of what its zones need. The problem the ventilation rate procedure solves is that a single air handler delivers ONE outdoor air fraction to every zone it serves. A zone with many people and little supply air receives the same percentage of outdoor air as a zone with few people and lots of supply -- so the zone with the highest ratio of required outdoor air to primary air, the critical zone, sets the fraction the whole system has to run at, and every other zone is over-ventilated as a consequence. The penalty that produces is the number this exists to report, because it is invisible in a zone-by-zone calculation. The procedure builds upward. Each zone's breathing zone rate is the per-person rate times the people plus the per-area rate times the area; dividing by the zone air distribution effectiveness gives the outdoor air that zone needs at its diffuser, and dividing that by the zone's primary airflow gives its outdoor air fraction. The system's uncorrected intake sums those requirements, the system fraction is that over the total primary air, and the simplified system ventilation efficiency is one plus the system fraction minus the critical zone's fraction. The intake is the uncorrected total divided by that efficiency. Where the fix lies follows directly and it is not more outdoor air. REDISTRIBUTING primary air toward the critical zone, taken from the zones the design over-ventilates and holding the system total where it is, lowers the critical fraction without lowering the system fraction alongside it -- so the efficiency rises and the intake comes down, usually far cheaper than conditioning the extra outdoor air for the life of the building. The distinction matters and it is easy to get wrong: simply ADDING primary air to the critical zone is a different move, because it raises the system's total primary flow and therefore lowers the system fraction as well as the zone fraction, and the efficiency can fall rather than rise. A design that responds to a low efficiency by increasing the INTAKE has treated the symptom. Diversity applies to the people term only, and it is entered rather than assumed, because the population of a whole building is rarely the sum of its zones' design populations while its floor area always is. This handles up to three zones on one air handler at a single design condition: it does not size equipment, address multiple systems or secondary recirculation, apply the IAQ procedure or the natural ventilation procedure as alternatives, select the zone air distribution effectiveness (which depends on supply air temperature and diffuser type), or verify anything in operation. ANSI/ASHRAE 62.1, the mechanical code in force, and the engineer of record govern.",
  };
}
export const ventilationRateProcedureExample = { inputs: { rp_cfm_per_person: 5, ra_cfm_per_ft2: 0.06, ez: 0.8, people_1: 25, area_1_ft2: 2500, primary_1_cfm: 1200, people_2: 12, area_2_ft2: 1800, primary_2_cfm: 900, people_3: 40, area_3_ft2: 3000, primary_3_cfm: 1500, diversity: 1 } };
BUILDINGPERF_RENDERERS["ventilation-rate-procedure"] = _simpleRenderer({
  citation: "Citation: the ANSI/ASHRAE 62.1 Ventilation Rate Procedure for multiple-zone recirculating systems -- Vbz = Rp Pz + Ra Az, Voz = Vbz / Ez, Zp = Voz / Vpz, Vou = D sum(Rp Pz) + sum(Ra Az), Xs = Vou / Vps, the simplified system ventilation efficiency Ev = 1 + Xs - Zp,max, and Vot = Vou / Ev. Rates, the zone air distribution effectiveness and the diversity factor are ENTERED. Up to three zones on one air handler at a single design condition: it does not size equipment, address multiple systems or secondary recirculation, apply the IAQ or natural ventilation procedures, select Ez (which depends on supply temperature and diffuser type), or verify anything in operation. ASHRAE 62.1 and the engineer of record govern.",
  example: ventilationRateProcedureExample.inputs,
  fields: [
    { key: "rp_cfm_per_person", label: "Rp, per-person rate (cfm/person)", kind: "number", attrs: { step: "any" } },
    { key: "ra_cfm_per_ft2", label: "Ra, per-area rate (cfm/sq ft)", kind: "number", attrs: { step: "any" } },
    { key: "ez", label: "Ez, zone air distribution effectiveness", kind: "number", default: 1, attrs: { step: "any" } },
    { key: "people_1", label: "Zone 1 people", kind: "number", attrs: { step: "any" } },
    { key: "area_1_ft2", label: "Zone 1 area (sq ft)", kind: "number" },
    { key: "primary_1_cfm", label: "Zone 1 primary airflow (cfm)", kind: "number" },
    { key: "people_2", label: "Zone 2 people (0 if unused)", kind: "number", attrs: { step: "any" } },
    { key: "area_2_ft2", label: "Zone 2 area (sq ft)", kind: "number" },
    { key: "primary_2_cfm", label: "Zone 2 primary airflow (cfm)", kind: "number" },
    { key: "people_3", label: "Zone 3 people (0 if unused)", kind: "number", attrs: { step: "any" } },
    { key: "area_3_ft2", label: "Zone 3 area (sq ft)", kind: "number" },
    { key: "primary_3_cfm", label: "Zone 3 primary airflow (cfm)", kind: "number" },
    { key: "diversity", label: "Occupant diversity D (0-1)", kind: "number", default: 1, attrs: { step: "any" } },
  ],
  outputs: [
    { key: "z", id: "vrp-out-z", label: "Zones", value: (r) => r.rows_text },
    { key: "u", id: "vrp-out-u", label: "Uncorrected intake", value: (r) => fmt(r.vou_cfm, 0) + " cfm against " + fmt(r.vps_cfm, 0) + " cfm of primary air, a system fraction of " + fmt(r.xs, 4) },
    { key: "c", id: "vrp-out-c", label: "Critical zone", value: (r) => r.critical_verdict },
    { key: "e", id: "vrp-out-e", label: "System intake", value: (r) => r.efficiency_verdict },
    { key: "f", id: "vrp-out-f", label: "Where the fix is", value: (r) => r.fix_verdict },
    { key: "n", id: "vrp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeVentilationRateProcedure,
});

// =====================================================================
// spec-v1498: zonal pressure diagnostic leakage split.
// =====================================================================
//
// Two leakage paths in series divide the pressure between them exactly as two
// resistors divide voltage. That single reading redirects the work.
// dims: in { house_pressure_pa: M L^-1 T^-2, zone_a_pressure_pa: M L^-1 T^-2, zone_b_pressure_pa: M L^-1 T^-2 } out: { zone_a_ratio: dimensionless, zone_a_path_ratio: dimensionless, zone_b_ratio: dimensionless, zone_b_path_ratio: dimensionless }
export function computeZonalPressureDiagnostics({
  house_pressure_pa = 50, zone_a_pressure_pa = 0, zone_b_pressure_pa = 0,
  zone_a_label = "attic", zone_b_label = "crawl",
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(house_pressure_pa > 0)) return { error: "The house-to-outside pressure must be positive (Pa)." };
  if (zone_a_pressure_pa < 0 || zone_b_pressure_pa < 0) return { error: "Zone pressures cannot be negative (Pa) -- enter the magnitude of the zone-to-outside difference." };
  if (zone_a_pressure_pa > house_pressure_pa || zone_b_pressure_pa > house_pressure_pa) return { error: "A zone cannot read a larger pressure to outside than the house does -- check which reference each reading was taken against." };
  const describe = (label, zone_pa, present) => {
    if (!present) return { label, present: false, ratio: 0, path_ratio: 0, verdict: "(no " + label + " reading entered)" };
    const ratio = zone_pa / house_pressure_pa;
    // Two paths in series divide the pressure like resistors: the ratio of
    // house-to-zone leakage to zone-to-outside leakage is sqrt(PR/(1-PR)).
    const path_ratio = ratio >= 1 ? Number.POSITIVE_INFINITY : Math.sqrt(ratio / (1 - ratio));
    const verdict = ratio >= 0.999
      ? "the " + label + " is AT house pressure: the plane between them is effectively open and the " + label + " is part of the house"
      : ratio > 0.5
        ? "the " + label + " at a pressure ratio of " + fmt(ratio, 2) + " is nearly at HOUSE pressure: the plane between the house and it is " + fmt(path_ratio, 2) + " times as leaky as the plane between it and outdoors, so that air is house air -- seal the plane on the HOUSE side first, and adding insulation on top of it without sealing would be close to wasted"
        : "the " + label + " at a pressure ratio of " + fmt(ratio, 2) + " is nearly at OUTDOOR pressure: the plane between the house and it is comparatively tight (" + fmt(path_ratio, 2) + " times the outdoor plane), so it is effectively outdoors and the money is elsewhere";
    return { label, present: true, ratio, path_ratio, verdict };
  };
  const a = describe(zone_a_label || "zone A", zone_a_pressure_pa, zone_a_pressure_pa > 0);
  const b = describe(zone_b_label || "zone B", zone_b_pressure_pa, zone_b_pressure_pa > 0);
  if (!a.present && !b.present) return { error: "Enter at least one zone pressure reading." };
  const both = a.present && b.present;
  const priority = !both
    ? "(only one zone entered)"
    : a.ratio > b.ratio
      ? "the " + a.label + " has the higher pressure ratio, so the plane between the house and it is the leakier of the two and is where the work starts"
      : b.ratio > a.ratio
        ? "the " + b.label + " has the higher pressure ratio, so the plane between the house and it is the leakier of the two and is where the work starts"
        : "both zones read the same ratio, so neither plane is the obvious priority on pressure alone";
  if (![a.ratio, b.ratio].every(Number.isFinite)) return { error: "Zonal pressure math is not a finite value." };
  return {
    zone_a_ratio: a.ratio, zone_a_path_ratio: a.path_ratio, zone_a_verdict: a.verdict, zone_a_present: a.present,
    zone_b_ratio: b.ratio, zone_b_path_ratio: b.path_ratio, zone_b_verdict: b.verdict, zone_b_present: b.present,
    both, priority,
    note: "What a zone's pressure reading during a blower-door test says about where its leakage actually is. Two leakage paths in series -- house to attic, attic to outside -- divide the pressure between them exactly as two resistors divide a voltage, so the intermediate zone's pressure is a direct readout of which path has the resistance. A zone sitting near house pressure has almost all its resistance between itself and outdoors, meaning the plane between it and the house is wide open and the zone is effectively part of the house. A zone sitting near outdoor pressure has a tight plane on the house side and is effectively outdoors. That single reading redirects the work, which is the whole value of it. A high pressure ratio at the attic says seal the ceiling plane -- top plates, wire and pipe penetrations, the attic hatch, recessed lights -- and blowing more insulation on top of an unsealed ceiling is close to wasted money, because insulation does not stop air. A low ratio says the ceiling is already tight and the money is elsewhere in the building. The leakage path ratio reported here puts a number on it rather than leaving it as a direction, because the square-root relation is not intuitive: a pressure ratio of a half means the two paths are equally leaky, and the ratio climbs steeply on either side of that. Two readings are usually taken together, because the priority between planes is what a scope of work needs. The add-a-hole method extends this: opening a known hole to outside and re-reading isolates each path separately, which turns the ratio into an actual leakage area rather than a comparison. That refinement is not computed here. This interprets ENTERED readings from a blower-door test with the house held at a reference pressure: it does not perform the test, correct for the sign or reference of each gauge (a reading taken against the wrong reference inverts the conclusion), estimate leakage areas in absolute terms, or account for a zone with more than two significant paths, such as an attic connected to a garage. The BPI or RESNET procedure in force and the technician's own judgment govern.",
  };
}
export const zonalPressureDiagnosticsExample = { inputs: { house_pressure_pa: 50, zone_a_pressure_pa: 42, zone_b_pressure_pa: 6, zone_a_label: "attic", zone_b_label: "crawl" } };
BUILDINGPERF_RENDERERS["zonal-pressure-diagnostics"] = _simpleRenderer({
  citation: "Citation: zonal pressure diagnostics as blower-door practice states it -- the pressure ratio PR = zone-to-outside over house-to-outside, with two leakage paths in series dividing the pressure like resistors, and the ratio of house-to-zone leakage to zone-to-outside leakage equal to sqrt(PR / (1 - PR)). Readings are ENTERED from a test with the house at a reference pressure. It does not perform the test, correct for gauge sign or reference (a reading against the wrong reference inverts the conclusion), estimate leakage areas in absolute terms (the add-a-hole method does that and is not computed here), or handle a zone with more than two significant paths. The BPI or RESNET procedure in force governs.",
  example: zonalPressureDiagnosticsExample.inputs,
  fields: [
    { key: "house_pressure_pa", label: "House to outside (Pa)", kind: "number", default: 50, attrs: { step: "any" } },
    { key: "zone_a_label", label: "First zone", kind: "select", default: "attic", options: [{ value: "attic", label: "Attic" }, { value: "crawl", label: "Crawl space" }, { value: "basement", label: "Basement" }, { value: "garage", label: "Garage" }, { value: "knee wall", label: "Knee wall" }] },
    { key: "zone_a_pressure_pa", label: "That zone to outside (Pa)", kind: "number", attrs: { step: "any" } },
    { key: "zone_b_label", label: "Second zone", kind: "select", default: "crawl", options: [{ value: "crawl", label: "Crawl space" }, { value: "attic", label: "Attic" }, { value: "basement", label: "Basement" }, { value: "garage", label: "Garage" }, { value: "knee wall", label: "Knee wall" }] },
    { key: "zone_b_pressure_pa", label: "That zone to outside (Pa, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "a", id: "zpd-out-a", label: "First zone", value: (r) => r.zone_a_verdict },
    { key: "b", id: "zpd-out-b", label: "Second zone", value: (r) => r.zone_b_verdict },
    { key: "p", id: "zpd-out-p", label: "Where the work starts", value: (r) => r.priority },
    { key: "n", id: "zpd-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeZonalPressureDiagnostics,
});

// =====================================================================
// spec-v1499: combustion appliance zone depressurization limit.
// =====================================================================
//
// The zone is judged by the WEAKEST appliance in it. An atmospherically vented
// appliance relies on a buoyant draft worth only a few pascals, and any
// exhaust that pulls the room more negative than that reverses the flow.
// dims: in { measured_depressurization_pa: M L^-1 T^-2, natural_draft_wh_limit_pa: M L^-1 T^-2, natural_draft_furnace_limit_pa: M L^-1 T^-2, induced_draft_limit_pa: M L^-1 T^-2, direct_vent_limit_pa: M L^-1 T^-2, largest_exhaust_cfm: L^3 T^-1 } out: { governing_limit_pa: M L^-1 T^-2, margin_pa: M L^-1 T^-2 }
export function computeCazDepressurizationLimit({
  measured_depressurization_pa = 0,
  has_natural_draft_water_heater = "no", natural_draft_wh_limit_pa = 2,
  has_natural_draft_furnace = "no", natural_draft_furnace_limit_pa = 3,
  has_induced_draft = "no", induced_draft_limit_pa = 5,
  has_direct_vent = "no", direct_vent_limit_pa = 15,
  largest_exhaust_cfm = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const measured = Math.abs(measured_depressurization_pa);
  if (!(measured > 0)) return { error: "Enter the worst-case depressurization as a magnitude in pascals." };
  for (const [name, v] of [["water heater", natural_draft_wh_limit_pa], ["furnace", natural_draft_furnace_limit_pa], ["induced draft", induced_draft_limit_pa], ["direct vent", direct_vent_limit_pa]]) {
    if (!(v > 0)) return { error: "The " + name + " limit must be positive (Pa)." };
  }
  if (largest_exhaust_cfm < 0) return { error: "Exhaust airflow cannot be negative (cfm)." };
  const present = [];
  if (has_natural_draft_water_heater === "yes") present.push({ name: "natural draft water heater", limit: natural_draft_wh_limit_pa });
  if (has_natural_draft_furnace === "yes") present.push({ name: "natural draft furnace or boiler", limit: natural_draft_furnace_limit_pa });
  if (has_induced_draft === "yes") present.push({ name: "induced draft appliance", limit: induced_draft_limit_pa });
  if (has_direct_vent === "yes") present.push({ name: "direct vent or power vent appliance", limit: direct_vent_limit_pa });
  if (present.length === 0) return { error: "Select at least one appliance in the zone -- with no combustion appliance there is no depressurization limit to test against." };
  // The zone is judged by the WEAKEST appliance present.
  let weakest = present[0];
  for (const a of present) if (a.limit < weakest.limit) weakest = a;
  const governing_limit_pa = weakest.limit;
  const margin_pa = governing_limit_pa - measured;
  const passes = measured <= governing_limit_pa;
  const per_appliance = present.map((a) => a.name + " " + fmt(a.limit, 1) + " Pa " + (measured <= a.limit ? "pass by " + fmt(a.limit - measured, 1) : "FAIL by " + fmt(measured - a.limit, 1))).join("; ");
  const verdict = passes
    ? "the zone PASSES: " + fmt(measured, 1) + " Pa against the governing " + fmt(governing_limit_pa, 1) + " Pa limit for the " + weakest.name + ", with " + fmt(margin_pa, 1) + " Pa of margin"
    : "the zone FAILS: " + fmt(measured, 1) + " Pa against the governing " + fmt(governing_limit_pa, 1) + " Pa limit for the " + weakest.name + ", over by " + fmt(-margin_pa, 1) + " Pa";
  const mixed = present.length > 1 && present.some((a) => measured <= a.limit) && !passes;
  const weakest_verdict = mixed
    ? "some appliances in this zone pass and the zone still fails, because the zone is judged by the WEAKEST one present -- the " + weakest.name + " at " + fmt(governing_limit_pa, 1) + " Pa"
    : present.length > 1
      ? "the " + weakest.name + " governs at " + fmt(governing_limit_pa, 1) + " Pa, the lowest limit among the appliances present"
      : "one appliance present, so its limit is the zone's";
  const action_verdict = passes
    ? "there is " + fmt(margin_pa, 1) + " Pa of headroom, and further air sealing consumes it -- a house sealed toward its tightness limit should be retested here afterward"
    : "the ordered fixes are: reduce the exhaust that causes it (a clothes dryer is often most of it, and a condensing dryer removes the problem entirely), provide dedicated makeup air, or replace the weakest appliance with a power-vented or sealed-combustion unit -- and this house should not be air sealed further until that is resolved" + (largest_exhaust_cfm > 0 ? ", with the largest single exhaust at " + fmt(largest_exhaust_cfm, 0) + " cfm the first thing to look at" : "");
  if (![governing_limit_pa, margin_pa].every(Number.isFinite)) return { error: "Depressurization limit math is not a finite value." };
  return {
    measured, appliance_count: present.length, per_appliance,
    governing_limit_pa, governing_name: weakest.name, margin_pa, passes, mixed,
    verdict, weakest_verdict, action_verdict,
    note: "Whether a combustion appliance zone stays inside its depressurization limit under worst-case conditions. The physics is that an atmospherically vented appliance draws its combustion air from the room and relies on a weak buoyant draft to push flue gases up the chimney -- a draft worth only a few pascals. Any exhaust that pulls the room more negative than that draft can overcome reverses the flow, and the flue becomes an inlet: combustion products, including carbon monoxide, enter the house instead of leaving it. That is why the limits are small numbers and why they differ by venting type, from a couple of pascals for a natural draft water heater to well over ten for a sealed-combustion unit. The zone is judged by the WEAKEST appliance in it, and that is the part that gets misread. A basement with a natural draft water heater and an induced draft furnace is governed by the water heater, so a reading that the furnace passes comfortably can still fail the zone -- and it is reported that way here rather than as a single pass or fail, because the fix depends on which appliance is the problem. Worst case is a test condition, not an observation. It means every exhaust appliance running, interior doors positioned to maximise the depressurization, and the air handler tested both on and off, because a duct leak on the return side can depressurize the zone by itself. A CAZ test done without establishing worst case has measured something, but not the thing the limit refers to. The connection to air sealing is why this belongs in a weatherization workflow rather than only a service call. Every hole sealed makes the house tighter and the same exhaust more effective at depressurizing it, so a zone that passes today can fail after the crew leaves -- and a house that fails should not be sealed further until the appliance or the exhaust is resolved. The limits are ENTERED because they vary by protocol and by jurisdiction. This does not perform the test, establish worst case, measure spillage or draft, test for carbon monoxide (which is a separate and non-optional measurement), or evaluate the venting system, its sizing or its condition. The BPI or equivalent protocol in force, the appliance manufacturer, and the technician's own judgment govern.",
  };
}
export const cazDepressurizationLimitExample = { inputs: { measured_depressurization_pa: 4.5, has_natural_draft_water_heater: "yes", natural_draft_wh_limit_pa: 2, has_natural_draft_furnace: "no", natural_draft_furnace_limit_pa: 3, has_induced_draft: "yes", induced_draft_limit_pa: 5, has_direct_vent: "no", direct_vent_limit_pa: 15, largest_exhaust_cfm: 200 } };
BUILDINGPERF_RENDERERS["caz-depressurization-limit"] = _simpleRenderer({
  citation: "Citation: the combustion appliance zone depressurization limits as BPI and weatherization practice state them -- commonly around -2 Pa for a natural draft water heater, -3 Pa for a natural draft furnace or boiler, -5 Pa induced draft and -15 Pa direct or power vent -- with the zone judged by the WEAKEST appliance present and the reading taken under WORST CASE (every exhaust running, doors positioned to maximise it, air handler both on and off). Limits are ENTERED because they vary by protocol and jurisdiction. It does not perform the test, establish worst case, measure spillage or draft, test for carbon monoxide (a separate and non-optional measurement), or evaluate the venting system. The protocol in force and the technician's judgment govern.",
  example: cazDepressurizationLimitExample.inputs,
  fields: [
    { key: "measured_depressurization_pa", label: "Worst-case depressurization (Pa, magnitude)", kind: "number", attrs: { step: "any" } },
    { key: "has_natural_draft_water_heater", label: "Natural draft water heater present?", kind: "select", default: "no", options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }] },
    { key: "natural_draft_wh_limit_pa", label: "Its limit (Pa)", kind: "number", default: 2, attrs: { step: "any" } },
    { key: "has_natural_draft_furnace", label: "Natural draft furnace or boiler present?", kind: "select", default: "no", options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }] },
    { key: "natural_draft_furnace_limit_pa", label: "Its limit (Pa)", kind: "number", default: 3, attrs: { step: "any" } },
    { key: "has_induced_draft", label: "Induced draft appliance present?", kind: "select", default: "no", options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }] },
    { key: "induced_draft_limit_pa", label: "Its limit (Pa)", kind: "number", default: 5, attrs: { step: "any" } },
    { key: "has_direct_vent", label: "Direct or power vent appliance present?", kind: "select", default: "no", options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }] },
    { key: "direct_vent_limit_pa", label: "Its limit (Pa)", kind: "number", default: 15, attrs: { step: "any" } },
    { key: "largest_exhaust_cfm", label: "Largest single exhaust (cfm, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "v", id: "caz-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "a", id: "caz-out-a", label: "Each appliance", value: (r) => r.per_appliance },
    { key: "w", id: "caz-out-w", label: "What governs", value: (r) => r.weakest_verdict },
    { key: "x", id: "caz-out-x", label: "What to do", value: (r) => r.action_verdict },
    { key: "n", id: "caz-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCazDepressurizationLimit,
});

// =====================================================================
// spec-v1500: stack effect pressure and neutral pressure plane.
// =====================================================================
//
// spec-v1500 pairs a 0.0188 constant with a (1/T_out - 1/T_in) bracket, which
// is a mismatch of roughly 400x. On its own example that gives 0.027 Pa where
// the established relation gives 11.0 Pa -- and the spec printed "0 Pa" for
// every case it worked, including a 240 ft tower, without anyone noticing that
// scaling the building tenfold changed nothing.
// dims: in { height_ft: L, indoor_temp_f: T, outdoor_temp_f: T, neutral_plane_fraction: dimensionless, tall_building_height_ft: L } out: { total_pressure_pa: M L^-1 T^-2, total_pressure_inwc: M L^-1 T^-2, neutral_plane_ft: L, bottom_pressure_pa: M L^-1 T^-2, top_pressure_pa: M L^-1 T^-2, tall_pressure_pa: M L^-1 T^-2 }
export function computeStackEffectNpp({
  height_ft = 0, indoor_temp_f = 70, outdoor_temp_f = 0,
  neutral_plane_fraction = 0.5, tall_building_height_ft = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(height_ft > 0)) return { error: "The height from the lowest to the highest opening must be positive (ft)." };
  if (!(neutral_plane_fraction > 0 && neutral_plane_fraction < 1)) return { error: "The neutral plane fraction must be between 0 and 1 -- it sits at mid-height for symmetric leakage and moves toward the larger opening." };
  if (tall_building_height_ft < 0) return { error: "The comparison height cannot be negative (ft)." };
  const indoor_r = indoor_temp_f + _BP_RANKINE_OFFSET;
  const outdoor_r = outdoor_temp_f + _BP_RANKINE_OFFSET;
  if (!(indoor_r > 0) || !(outdoor_r > 0)) return { error: "Temperatures must be above absolute zero." };
  if (Math.abs(indoor_r - outdoor_r) < 1e-9) return { error: "Indoor and outdoor temperatures are equal, so there is no density difference and no stack effect at all." };
  // dP(Pa) = 1898.3 x h(ft) x (1/T_out - 1/T_in), temperatures in degrees
  // Rankine. Positive when it is colder outside, which is the winter case.
  const reciprocal_difference = 1 / outdoor_r - 1 / indoor_r;
  const total_pressure_pa = _BP_STACK_PA_PER_FT_PER_RANKINE * height_ft * reciprocal_difference;
  const total_pressure_inwc = total_pressure_pa / _BP_PA_PER_IN_WC;
  const is_winter = total_pressure_pa > 0;
  // The neutral plane splits that total between the bottom and the top.
  const neutral_plane_ft = height_ft * neutral_plane_fraction;
  const bottom_pressure_pa = total_pressure_pa * neutral_plane_fraction;
  const top_pressure_pa = total_pressure_pa * (1 - neutral_plane_fraction);
  const plane_verdict = is_winter
    ? "the neutral plane sits " + fmt(neutral_plane_ft, 1) + " ft up. Below it the building is NEGATIVE to outside and cold air comes IN at about " + fmt(bottom_pressure_pa, 2) + " Pa at the lowest opening; above it the building is POSITIVE and warm moist air goes OUT at about " + fmt(top_pressure_pa, 2) + " Pa at the highest -- which is why the top of a building gets the moisture problems and the bottom gets the cold draughts"
    : "it is warmer outside than in, so the stack runs in REVERSE: air enters at the top and leaves at the bottom, at about " + fmt(Math.abs(top_pressure_pa), 2) + " Pa and " + fmt(Math.abs(bottom_pressure_pa), 2) + " Pa respectively";
  // Linear in height, which is why it is a curiosity in a house and a design
  // problem in a tower.
  const has_tall = tall_building_height_ft > 0;
  const tall_pressure_pa = has_tall ? _BP_STACK_PA_PER_FT_PER_RANKINE * tall_building_height_ft * reciprocal_difference : 0;
  const height_ratio = has_tall ? tall_building_height_ft / height_ft : 0;
  const scale_verdict = !has_tall
    ? "(no comparison height entered)"
    : "at " + fmt(tall_building_height_ft, 0) + " ft the same temperatures give " + fmt(tall_pressure_pa, 1) + " Pa, exactly " + fmt(height_ratio, 1) + " times as much -- the relation is LINEAR in height with no wind and no fans involved at all, which is why stack effect is a curiosity in a house and a design problem in a tower";
  const magnitude_verdict = Math.abs(total_pressure_pa) < 1
    ? "under a pascal across the whole height, which is small against the pressures a fan or the wind produces"
    : Math.abs(total_pressure_pa) < 10
      ? fmt(Math.abs(total_pressure_pa), 1) + " Pa across the full height -- the same order as the draft an atmospherically vented appliance relies on, and enough to matter for door forces and for where a building leaks"
      : fmt(Math.abs(total_pressure_pa), 1) + " Pa across the full height, which is a design pressure: it drives elevator door forces, shaft flows, and the moisture the top of the building has to handle";
  if (![total_pressure_pa, total_pressure_inwc, neutral_plane_ft, bottom_pressure_pa, top_pressure_pa, tall_pressure_pa].every(Number.isFinite)) return { error: "Stack effect math is not a finite value." };
  return {
    indoor_r, outdoor_r, reciprocal_difference,
    total_pressure_pa, total_pressure_inwc, is_winter,
    neutral_plane_ft, bottom_pressure_pa, top_pressure_pa, plane_verdict,
    has_tall, tall_pressure_pa, height_ratio, scale_verdict, magnitude_verdict,
    note: "The pressure a building develops from its own warmth, and where the neutral plane sits. The driving force is nothing but the density difference between a warm column of air inside and a cold column outside, integrated over height -- so a tall building in a cold climate develops a large pressure with no wind and no fans involved at all. The relation is LINEAR in height and roughly linear in the temperature difference, which is why the same weather that is a curiosity in a two-storey house is a design problem in a tower: ten times the height is ten times the pressure. The neutral plane is the useful half of the answer. Below it the building is negative to outside and air comes in; above it the building is positive and air goes out, carrying whatever moisture the indoor air holds into the assemblies at the top of the building. That is why the top floors get the condensation problems and the bottom floors get the cold draughts, and why sealing the top of a building changes the pressure everywhere below it. The plane sits at mid-height only when the leakage is symmetric, and it moves toward whichever opening is larger -- a building with a leaky lobby and a tight roof has its neutral plane low, and most of the building is then positive. That fraction is an input here rather than an assumption, because it is the part that a real building rarely satisfies. The consequences are practical rather than theoretical: elevator and stairwell doors that will not close against the pressure, shafts that behave as chimneys, smoke that moves the wrong way in a fire, and combustion appliances low in the building fighting a draft they were not designed for. This is a steady-state calculation on ENTERED temperatures at a single condition: it does not model wind, which routinely exceeds stack effect and can reverse it locally, mechanical pressurization, the leakage distribution that actually sets the neutral plane, or the interaction between floors that compartmentation changes entirely. ASHRAE Fundamentals, the smoke control design where one exists, and the mechanical engineer of record govern.",
  };
}
export const stackEffectNppExample = { inputs: { height_ft: 24, indoor_temp_f: 70, outdoor_temp_f: 10, neutral_plane_fraction: 0.5, tall_building_height_ft: 240 } };
BUILDINGPERF_RENDERERS["stack-effect-npp"] = _simpleRenderer({
  citation: "Citation: the stack effect relation as ASHRAE Fundamentals gives it -- dP = 3460 h (1/T_o - 1/T_i) in pascals with height in metres and temperatures in kelvin, carried here as 1898.3 Pa per foot per reciprocal degree Rankine so the calculation stays in US units -- with the neutral plane splitting that total between the bottom and the top. The neutral plane fraction is ENTERED because it sits at mid-height only for symmetric leakage and moves toward the larger opening. A steady-state calculation at one condition: it does not model wind (which routinely exceeds stack effect and can reverse it locally), mechanical pressurization, the leakage distribution that actually sets the plane, or compartmentation between floors. The smoke control design where one exists and the engineer of record govern.",
  example: stackEffectNppExample.inputs,
  fields: [
    { key: "height_ft", label: "Height, lowest to highest opening (ft)", kind: "number", attrs: { step: "any" } },
    { key: "indoor_temp_f", label: "Indoor temperature (°F)", kind: "number", default: 70, attrs: { step: "any" } },
    { key: "outdoor_temp_f", label: "Outdoor temperature (°F)", kind: "number", attrs: { step: "any" } },
    { key: "neutral_plane_fraction", label: "Neutral plane, fraction of height (0-1)", kind: "number", default: 0.5, attrs: { step: "any" } },
    { key: "tall_building_height_ft", label: "Compare against a height of (ft, 0 to skip)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "p", id: "sen-out-p", label: "Stack pressure", value: (r) => fmt(r.total_pressure_pa, 2) + " Pa (" + fmt(r.total_pressure_inwc, 4) + " in wc) across the full height" },
    { key: "m", id: "sen-out-m", label: "What that means", value: (r) => r.magnitude_verdict },
    { key: "l", id: "sen-out-l", label: "Neutral plane", value: (r) => r.plane_verdict },
    { key: "s", id: "sen-out-s", label: "Scaled up", value: (r) => r.scale_verdict },
    { key: "n", id: "sen-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeStackEffectNpp,
});

// =====================================================================
// spec-v1502: utility bill baseload and weather-sensitive split.
// =====================================================================
//
// That single split reorders an audit: a house with a huge intercept and a
// modest slope does not need insulation, it needs someone to find out what is
// running all the time, and no amount of air sealing will touch it.
// dims: in { baseload_per_year: dimensionless, slope_per_degree_day: dimensionless, degree_days: dimensionless, equipment_efficiency: dimensionless, btu_per_unit: L^2 M T^-2 } out: { weather_units: dimensionless, total_units: dimensionless, baseload_per_year: dimensionless, baseload_per_month: dimensionless, weather_share_pct: dimensionless, baseload_share_pct: dimensionless, implied_ua: M L^2 T^-3 }
export function computeBillDisaggregation({
  baseload_per_year = 0, slope_per_degree_day = 0, degree_days = 0,
  equipment_efficiency = 0.8, btu_per_unit = _BP_BTU_PER_THERM, balance_point_f = 65,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (baseload_per_year < 0) return { error: "Baseload cannot be negative." };
  if (!(slope_per_degree_day > 0)) return { error: "The slope must be positive (energy per degree-day) -- a non-positive slope means the fit found no weather sensitivity at all." };
  if (!(degree_days > 0)) return { error: "Degree-days must be positive." };
  if (!(equipment_efficiency > 0 && equipment_efficiency <= 1)) return { error: "Equipment efficiency must be above 0 and at most 1." };
  if (!(btu_per_unit > 0)) return { error: "The energy content per unit must be positive (BTU)." };
  const weather_units = slope_per_degree_day * degree_days;
  const total_units = weather_units + baseload_per_year;
  if (!(total_units > 0)) return { error: "Total consumption is not positive." };
  const weather_share_pct = weather_units / total_units * 100;
  const baseload_share_pct = 100 - weather_share_pct;
  const weather_dominates = weather_units > baseload_per_year;
  const baseload_per_month = baseload_per_year / 12;
  // The implied heat loss coefficient: energy per degree-day, corrected for
  // the equipment that delivered it, over 24 hours in a day.
  const implied_ua = slope_per_degree_day * equipment_efficiency * btu_per_unit / _BP_HOURS_PER_DAY;
  const split_verdict = weather_dominates
    ? fmt(weather_share_pct, 0) + "% of this bill is the shell and the heating system, so envelope work is worth doing here -- insulation, air sealing and equipment all act on the slope"
    : fmt(baseload_share_pct, 0) + "% of this bill is BASELOAD, which the weather does not drive at all: water heating, refrigeration, lighting, plugs and standby. Envelope work acts on the smaller half, and the audit should start by finding what is running all the time -- no amount of air sealing will touch it";
  const ua_verdict = "the slope implies a heat loss coefficient of about " + fmt(implied_ua, 0) + " BTU/h per degF at " + fmt(equipment_efficiency * 100, 0) + "% equipment efficiency -- a whole-building UA derived from bills rather than from a takeoff, which is worth comparing against a modelled one because a large disagreement means one of the two is wrong";
  const baseline_verdict = "baseload is " + fmt(baseload_per_year, 0) + " a year, " + fmt(baseload_per_month, 1) + " a month, and it is what the bill would be in a month with no heating at all -- the summer bills are the check on it";
  const balance_verdict = "the balance point is a FITTED parameter here at " + fmt(balance_point_f, 0) + " degF rather than the conventional 65 -- a well-insulated house with large internal gains balances lower, and fitting the base temperature rather than assuming it is what makes the intercept and the slope mean anything";
  if (![weather_units, total_units, weather_share_pct, baseload_share_pct, implied_ua].every(Number.isFinite)) return { error: "Bill disaggregation math is not a finite value." };
  return {
    weather_units, total_units, weather_share_pct, baseload_share_pct,
    weather_dominates, baseload_per_year, baseload_per_month, implied_ua,
    split_verdict, ua_verdict, baseline_verdict, balance_verdict,
    note: "A utility bill split into the part the weather drives and the part it does not. Plot monthly energy against monthly degree-days and the points fall on a line: the intercept is everything the weather does not drive -- water heating, refrigeration, lighting, plugs, standby -- and the slope is everything it does. That single split reorders an audit before anyone opens a wall. A house with a large intercept and a modest slope does not need insulation; it needs someone to find out what is running all the time, and no amount of air sealing will touch it. A house with the opposite shape is an envelope job. Getting that backwards is how a homeowner spends a great deal of money and sees their bill barely move. The base temperature is a fitted parameter rather than 65 degF by convention, and treating it as a convention is what makes the fit wrong. A well-insulated house with large internal gains stops needing heat at a much lower outdoor temperature, so its degree-days accumulate differently -- and fitting the base temperature is what makes the intercept and the slope mean what they claim to. A fit done at the wrong base temperature will still produce a line, which is why the quality of the fit is worth looking at rather than the coefficients alone. The implied heat loss coefficient is the bridge to the rest of an audit. The slope is energy per degree-day at the meter; correcting it for the equipment's efficiency and dividing by twenty-four hours gives a whole-building UA in the same units a heat loss calculation produces -- so a bill-derived UA and a modelled one can be compared directly, and a large disagreement means one of them is wrong. That comparison catches a bad model, a wrong efficiency assumption, and a house that is not being heated the way anyone thinks it is. This takes the fit as ENTERED: it does not fit the regression, choose the base temperature, assess the fit quality, separate heating from cooling in a bill that contains both, correct for occupancy changes or a partial-year record, or account for a second fuel. The utility records, a proper regression, and the auditor's own judgment govern.",
  };
}
export const billDisaggregationExample = { inputs: { baseload_per_year: 310, slope_per_degree_day: 1.85, degree_days: 1240, equipment_efficiency: 0.80, btu_per_unit: 100000, balance_point_f: 60 } };
BUILDINGPERF_RENDERERS["bill-disaggregation"] = _simpleRenderer({
  citation: "Citation: the degree-day regression as energy auditing practice writes it -- monthly energy = baseload + slope x degree-days at a FITTED base temperature -- with the implied heat loss coefficient = slope x equipment efficiency x BTU per unit / 24 hours. The fit (baseload, slope and base temperature) is ENTERED; a therm is 100,000 BTU exactly. It does not fit the regression, choose the base temperature, assess fit quality, separate heating from cooling in a bill containing both, correct for occupancy changes or a partial-year record, or account for a second fuel. The utility records and the auditor's own judgment govern.",
  example: billDisaggregationExample.inputs,
  fields: [
    { key: "baseload_per_year", label: "Fitted baseload (units per year)", kind: "number", attrs: { step: "any" } },
    { key: "slope_per_degree_day", label: "Fitted slope (units per degree-day)", kind: "number", attrs: { step: "any" } },
    { key: "degree_days", label: "Degree-days for the period", kind: "number", attrs: { step: "any" } },
    { key: "balance_point_f", label: "Fitted balance point (°F)", kind: "number", default: 65, attrs: { step: "any" } },
    { key: "equipment_efficiency", label: "Equipment efficiency (0-1)", kind: "number", default: 0.8, attrs: { step: "any" } },
    { key: "btu_per_unit", label: "BTU per unit (100,000 for a therm)", kind: "number", default: 100000 },
  ],
  outputs: [
    { key: "t", id: "bdg-out-t", label: "Total", value: (r) => fmt(r.total_units, 0) + " units: " + fmt(r.weather_units, 0) + " weather-driven, " + fmt(r.baseload_per_year, 0) + " baseload" },
    { key: "s", id: "bdg-out-s", label: "What that means", value: (r) => r.split_verdict },
    { key: "u", id: "bdg-out-u", label: "Implied UA", value: (r) => r.ua_verdict },
    { key: "b", id: "bdg-out-b", label: "Baseload", value: (r) => r.baseline_verdict },
    { key: "p", id: "bdg-out-p", label: "Balance point", value: (r) => r.balance_verdict },
    { key: "n", id: "bdg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeBillDisaggregation,
});

// =====================================================================
// spec-v1504: continuous vs cavity insulation ratio for condensation.
// =====================================================================
//
// spec-v1503 was CUT to wall-condensation-gradient, which already computes the
// sheathing plane temperature against the dew point. Its remaining material --
// the required RATIO -- is here, because that is the form the code table takes
// and the form a builder works to.
//
// The counterintuitive direction is the reason this tile earns its place:
// adding CAVITY insulation to a wall with fixed exterior insulation makes the
// assembly WORSE from a moisture standpoint even as it improves the R-value.
// dims: in { r_cavity: dimensionless, r_continuous: dimensionless, required_ratio: dimensionless, indoor_temp_f: T, indoor_rh_pct: dimensionless, outdoor_design_temp_f: T } out: { achieved_ratio: dimensionless, r_continuous_min: dimensionless, r_cavity_max: dimensionless, dew_point_f: T, ratio_from_dew_point: dimensionless, sheathing_temp_f: T }
export function computeContinuousInsulationRatio({
  r_cavity = 0, r_continuous = 0, required_ratio = 0,
  indoor_temp_f = 70, indoor_rh_pct = 0, outdoor_design_temp_f = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(r_cavity > 0)) return { error: "Cavity R-value must be positive." };
  if (r_continuous < 0) return { error: "Continuous exterior R-value cannot be negative." };
  if (required_ratio < 0 || required_ratio >= 1) return { error: "The required ratio must be at least 0 and below 1." };
  if (indoor_rh_pct < 0 || indoor_rh_pct > 100) return { error: "Indoor relative humidity must be between 0 and 100 percent." };
  const r_total = r_cavity + r_continuous;
  const achieved_ratio = r_continuous / r_total;
  const has_requirement = required_ratio > 0;
  // Compared with a tolerance rather than a bare >=: the exact inversion below
  // lands within one part in 1e16 of the requirement and a strict comparison
  // told a wall built precisely to the code table that it FAILED.
  const meets = has_requirement && achieved_ratio >= required_ratio - 1e-12;
  // The two inversions a builder actually asks for.
  const r_continuous_min = has_requirement ? required_ratio * r_cavity / (1 - required_ratio) : 0;
  const r_cavity_max = has_requirement && required_ratio > 0 ? r_continuous * (1 - required_ratio) / required_ratio : 0;
  const ratio_verdict = !has_requirement
    ? "the assembly achieves a ratio of " + fmt(achieved_ratio, 3) + " (R-" + fmt(r_continuous, 1) + " continuous over R-" + fmt(r_total, 1) + " total)"
    : meets
      ? "the achieved ratio of " + fmt(achieved_ratio, 3) + " MEETS the " + fmt(required_ratio, 3) + " requirement"
      : "the achieved ratio of " + fmt(achieved_ratio, 3) + " FAILS the " + fmt(required_ratio, 3) + " requirement -- this assembly needs R-" + fmt(r_continuous_min, 2) + " continuous over its R-" + fmt(r_cavity, 1) + " cavity, not R-" + fmt(r_continuous, 1);
  const inversion_verdict = !has_requirement
    ? "(no required ratio entered)"
    : "at this requirement, R-" + fmt(r_cavity, 1) + " of cavity needs R-" + fmt(r_continuous_min, 2) + " continuous -- or, holding the continuous insulation at R-" + fmt(r_continuous, 1) + ", the cavity can be no more than R-" + fmt(r_cavity_max, 2);
  // The direction people get wrong.
  const more_cavity_ratio = r_continuous / (r_total + 5);
  const counterintuitive_verdict = "adding CAVITY insulation makes this assembly WORSE for moisture even as it improves the R-value: five more points of cavity takes the ratio from " + fmt(achieved_ratio, 3) + " to " + fmt(more_cavity_ratio, 3) + ", because the sheathing gets colder while the exterior insulation keeping it warm has not changed. A deeper wall filled with more cavity insulation is a common upgrade and a moisture downgrade";
  // The physics behind the table, when the conditions are entered.
  const has_conditions = indoor_rh_pct > 0 && indoor_temp_f > outdoor_design_temp_f;
  const dew_point_f = has_conditions ? _bpDewPointF(indoor_temp_f, indoor_rh_pct) : 0;
  // The sheathing plane sits OUTBOARD of the cavity, so from outdoors you cross
  // only the continuous R to reach it: T_sheath = T_out + ratio x (T_in - T_out).
  // Setting that equal to the dew point gives the ratio below. Writing the
  // complement instead is an easy mistake near ratio 0.5 and reverses the
  // direction with humidity; the identity that the sheathing at this ratio
  // lands EXACTLY on the dew point is what catches it.
  const ratio_from_dew_point = has_conditions
    ? (dew_point_f - outdoor_design_temp_f) / (indoor_temp_f - outdoor_design_temp_f)
    : 0;
  const sheathing_temp_f = has_conditions
    ? outdoor_design_temp_f + achieved_ratio * (indoor_temp_f - outdoor_design_temp_f)
    : 0;
  const physics_verdict = !has_conditions
    ? "(no indoor humidity and outdoor design temperature entered)"
    : "at " + fmt(indoor_temp_f, 0) + " degF and " + fmt(indoor_rh_pct, 0) + "% RH the dew point is " + fmt(dew_point_f, 1) + " degF, so against a " + fmt(outdoor_design_temp_f, 0) + " degF design temperature the ratio the physics requires is " + fmt(ratio_from_dew_point, 3) + ", and this assembly puts the sheathing at " + fmt(sheathing_temp_f, 1) + " degF -- " + (sheathing_temp_f >= dew_point_f ? "above the dew point, so it stays dry at design conditions" : "BELOW the dew point, so it condenses at design conditions") + ". The code table is nothing but this calculation solved once per climate zone at assumed indoor conditions, and a house run at a higher indoor humidity needs MORE continuous insulation than the table gives";
  if (![achieved_ratio, r_continuous_min, r_cavity_max, dew_point_f, ratio_from_dew_point, sheathing_temp_f].every(Number.isFinite)) return { error: "Insulation ratio math is not a finite value." };
  return {
    r_total, achieved_ratio, has_requirement, meets,
    r_continuous_min, r_cavity_max, ratio_verdict, inversion_verdict,
    more_cavity_ratio, counterintuitive_verdict,
    has_conditions, dew_point_f, ratio_from_dew_point, sheathing_temp_f, physics_verdict,
    note: "Whether a wall's insulation is split between cavity and exterior in the proportion condensation control needs. The required ratio is nothing but a dew point calculation solved once per climate zone at assumed indoor conditions and turned into a table a plans examiner can use -- it rises with climate severity because a colder outdoor design temperature pulls the sheathing colder for the same split. Entering the indoor conditions and the design temperature here reproduces the physics behind the table, which matters because a house run at a higher indoor humidity than the table assumed needs MORE continuous insulation than the table gives. Two things this makes visible that the R-value alone does not. The first is the counterintuitive direction: adding CAVITY insulation to a wall with fixed exterior insulation makes the assembly WORSE from a moisture standpoint even though it improves the R-value, because it lowers the ratio and the sheathing gets colder. A deeper wall packed with more cavity insulation is a common energy upgrade and a moisture downgrade, and it is exactly the change a builder makes without thinking of it as an assembly change. The second is the inversion a builder actually asks for: not what ratio this wall achieves, but how much exterior insulation a given cavity demands, or how much cavity a given thickness of foam will support. Both are reported, because the design usually starts from one of them rather than from the ratio. The vapor retarder is the alternative rather than the partner, and the two trade against each other. Keeping the sheathing warm with exterior insulation lets the assembly dry inward; a low-permeance interior vapor retarder instead stops the moisture reaching the sheathing but also stops the wall drying that way, and a wall with both can be unable to dry in either direction. Which is permitted in lieu of which is a code question rather than a physics one. This screens a ratio at design conditions: it does not perform a hygrothermal analysis, account for air leakage carrying moisture into the assembly (which dwarfs vapor diffusion and is what actually wets most walls), address the drying potential of the materials, evaluate rain control or the water-resistive barrier, or determine what the code requires in any jurisdiction. The energy code in force, a hygrothermal analysis where the assembly is unusual, and the designer of record govern.",
  };
}
export const continuousInsulationRatioExample = { inputs: { r_cavity: 20, r_continuous: 6, required_ratio: 0.36, indoor_temp_f: 70, indoor_rh_pct: 35, outdoor_design_temp_f: 10 } };
BUILDINGPERF_RENDERERS["continuous-insulation-ratio"] = _simpleRenderer({
  citation: "Citation: the continuous-insulation ratio for condensation control as the energy code expresses it -- ratio = R continuous exterior / R total insulation, against a required ratio that rises with climate severity -- with the inversions R_ci,min = required ratio x R_cavity / (1 - required ratio) and R_cavity,max = R_ci x (1 - required ratio) / required ratio. The required ratio is ENTERED from the applicable code table; entering the indoor conditions and design temperature reproduces the dew point calculation the table came from, since the sheathing sits at T_out + ratio x (T_in - T_out) and the required ratio is (dew point - T_out) / (T_in - T_out). It does not perform a hygrothermal analysis, account for AIR LEAKAGE carrying moisture into the assembly (which dwarfs vapor diffusion and wets most walls), address drying potential, evaluate rain control, or determine what any jurisdiction requires. The energy code in force and the designer of record govern.",
  example: continuousInsulationRatioExample.inputs,
  fields: [
    { key: "r_cavity", label: "Cavity insulation R-value", kind: "number", attrs: { step: "any" } },
    { key: "r_continuous", label: "Continuous exterior R-value", kind: "number", attrs: { step: "any" } },
    { key: "required_ratio", label: "Required ratio from the code table (0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "indoor_temp_f", label: "Indoor temperature (°F)", kind: "number", default: 70, attrs: { step: "any" } },
    { key: "indoor_rh_pct", label: "Indoor relative humidity (%, 0 to skip the physics)", kind: "number", attrs: { step: "any" } },
    { key: "outdoor_design_temp_f", label: "Outdoor design temperature (°F)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "r", id: "cir-out-r", label: "Against the requirement", value: (r) => r.ratio_verdict },
    { key: "i", id: "cir-out-i", label: "What it would take", value: (r) => r.inversion_verdict },
    { key: "c", id: "cir-out-c", label: "The direction people get wrong", value: (r) => r.counterintuitive_verdict },
    { key: "p", id: "cir-out-p", label: "The physics behind the table", value: (r) => r.physics_verdict },
    { key: "n", id: "cir-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeContinuousInsulationRatio,
});

// ===================== spec-v1506: ground loop flow, antifreeze and pump power =====================
// 448.831 gal/min per ft^3/s and 3,960 are the standard hydraulic constants;
// 6.7197e-4 converts centipoise to lb/(ft s).
const _GPM_PER_CFS = 448.831;
const _PUMP_CONSTANT = 3960;
const _CP_TO_LB_FT_S = 6.7197e-4;
// dims: in { args: dimensionless } out: { design_flow_gpm: L^3 T^-1, velocity_fps: L T^-1, reynolds: dimensionless, pump_bhp: M L^2 T^-3, pump_watts: M L^2 T^-3, watts_per_ton: dimensionless }
export function computeGroundLoopFlowAntifreeze({
  tons = 0, gpm_per_ton = 3.0, pipe_id_in = 0,
  fluid_density_lb_ft3 = 63.9, fluid_viscosity_cp = 4.7, specific_gravity = 1.02,
  head_ft = 0, wire_to_water_efficiency = 0.35, benchmark_w_per_ton = 100,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(tons > 0)) return { error: "Capacity in tons must be positive." };
  if (!(gpm_per_ton > 0)) return { error: "Flow per ton must be positive." };
  if (!(pipe_id_in > 0)) return { error: "Pipe inside diameter must be positive." };
  if (!(fluid_density_lb_ft3 > 0)) return { error: "Fluid density must be positive." };
  if (!(fluid_viscosity_cp > 0)) return { error: "Fluid viscosity must be positive." };
  if (!(specific_gravity > 0)) return { error: "Specific gravity must be positive." };
  if (!(head_ft >= 0)) return { error: "Head cannot be negative." };
  if (!(wire_to_water_efficiency > 0 && wire_to_water_efficiency <= 1)) return { error: "Wire-to-water efficiency must be greater than 0 and no more than 1." };
  if (!(benchmark_w_per_ton > 0)) return { error: "The pumping benchmark must be positive." };
  const design_flow_gpm = tons * gpm_per_ton;
  // Velocity comes from the ACTUAL pipe bore, not from a nominal size.
  const diameter_ft = pipe_id_in / 12;
  const area_ft2 = Math.PI / 4 * diameter_ft * diameter_ft;
  const flow_cfs = design_flow_gpm / _GPM_PER_CFS;
  const velocity_fps = flow_cfs / area_ft2;
  const flow_verdict = fmt(design_flow_gpm, 1) + " gpm at " + fmt(gpm_per_ton, 2) + " gpm per ton, which through a "
    + fmt(pipe_id_in, 3) + " in bore is " + fmt(velocity_fps, 2) + " ft/s";
  // Reynolds number decides whether the loop's rated capacity applies at all.
  const viscosity_lb_ft_s = fluid_viscosity_cp * _CP_TO_LB_FT_S;
  const reynolds = fluid_density_lb_ft3 * velocity_fps * diameter_ft / viscosity_lb_ft_s;
  const turbulent = reynolds >= 4000;
  const laminar = reynolds < 2300;
  const regime = laminar ? "LAMINAR" : (turbulent ? "turbulent" : "TRANSITIONAL");
  const flow_regime_verdict = fmt(reynolds, 0) + " Reynolds -- " + regime
    + (turbulent
      ? (reynolds < 6000 ? ", but not by a wide margin. A colder day, a higher glycol concentration, or a fouled bore moves this the wrong way, and the loop's rated capacity assumes turbulent flow" : ". The loop's rated heat transfer assumes turbulent flow and this has margin")
      : ", and the loop's rated capacity NO LONGER APPLIES. Heat transfer collapses at the pipe wall below turbulence, so a loop that goes laminar on the coldest day is undersized exactly when it is needed. Raising the flow, using a smaller bore, or lowering the glycol concentration are the fixes, in that order of cheapness");
  // Pump power, and the benchmark comparison the spec inverted.
  const pump_bhp = design_flow_gpm * head_ft * specific_gravity / (_PUMP_CONSTANT * wire_to_water_efficiency);
  const pump_watts = pump_bhp * 745.699872;
  const watts_per_ton = pump_watts / tons;
  const within_benchmark = watts_per_ton <= benchmark_w_per_ton;
  const pump_verdict = fmt(design_flow_gpm, 1) + " gpm at " + fmt(head_ft, 0) + " ft of head and "
    + fmt(wire_to_water_efficiency * 100, 0) + "% wire-to-water is " + fmt(pump_bhp, 2) + " bhp = "
    + fmt(pump_watts, 0) + " W, or " + fmt(watts_per_ton, 0) + " W per ton";
  const benchmark_verdict = within_benchmark
    ? fmt(watts_per_ton, 0) + " W per ton is WITHIN the " + fmt(benchmark_w_per_ton, 0)
      + " W per ton benchmark, by " + fmt(benchmark_w_per_ton - watts_per_ton, 0)
      + " W per ton. The loop is not spending too much on pumping"
    : fmt(watts_per_ton, 0) + " W per ton is OVER the " + fmt(benchmark_w_per_ton, 0)
      + " W per ton benchmark by " + fmt(watts_per_ton - benchmark_w_per_ton, 0)
      + " W per ton -- the loop is spending too much on pumping, and the fixes in order are larger header pipe, fewer fittings, the lowest workable glycol concentration, and only then a different pump";
  // The head a given W/ton budget allows, which is the design question.
  const allowable_head_ft = benchmark_w_per_ton * tons / 745.699872 * _PUMP_CONSTANT * wire_to_water_efficiency / (design_flow_gpm * specific_gravity);
  const head_verdict = "the " + fmt(benchmark_w_per_ton, 0) + " W per ton benchmark allows "
    + fmt(allowable_head_ft, 0) + " ft of head at this flow and efficiency, against the "
    + fmt(head_ft, 0) + " ft entered -- head is the variable a designer actually controls, through header size, loop count, and fitting count";
  if (![design_flow_gpm, velocity_fps, reynolds, pump_bhp, watts_per_ton, allowable_head_ft].every(Number.isFinite)) return { error: "Ground loop math is not a finite value." };
  return {
    design_flow_gpm, velocity_fps, area_ft2, flow_verdict,
    reynolds, turbulent, laminar, regime, flow_regime_verdict,
    pump_bhp, pump_watts, watts_per_ton, within_benchmark, pump_verdict, benchmark_verdict,
    allowable_head_ft, head_verdict,
    note: "A ground loop has to move enough fluid to stay turbulent and few enough watts to be worth having, and those two pull against each other. The flow follows from the capacity at an entered gpm per ton, and the VELOCITY follows from the actual pipe bore rather than a nominal size -- 12 gpm is 5.3 ft/s in 1 in HDPE and 2.5 ft/s in 1.5 in, so a nominal size is not a velocity. Reynolds number is the number that decides whether the loop works at all: below about 4,000 the flow leaves turbulence, heat transfer collapses at the pipe wall, and the loop's rated capacity no longer applies. That matters most on the coldest day, because cold antifreeze is thick -- the same loop that is comfortably turbulent in October can sit on the laminar boundary in January, and a higher glycol concentration moves it the same way. Antifreeze concentration is therefore a heat transfer decision and not only a freeze protection one: use the lowest concentration that protects the loop, and size it against the BURST point rather than the freeze point where the equipment allows it, since a slushy glycol solution expands far less than water does. Pump power is the other half. Wire-to-water efficiency on a small circulator is poor, often near a third, so the electrical draw is roughly three times the hydraulic work, and a loop above about 100 W per ton is spending more on pumping than the efficiency gain over a conventional system is worth. The fixes are in a definite order of cheapness: larger header pipe, fewer fittings, the lowest workable glycol concentration, and only then a different pump. Head is the variable a designer actually controls, so the head a given watts-per-ton budget allows is reported beside the head entered. Fluid properties are ENTERED at the minimum expected loop temperature because they vary strongly with glycol type and concentration and with temperature; propylene and ethylene glycol differ substantially and the manufacturer's data is the source. This is a flow, regime and pumping screen: it does not size the ground loop or its length (`geothermal-loop` estimates that), compute the freeze or burst point (`glycol-mix` does), model ground thermal properties, the annual thermal balance of the field, or the long-term drift a heating-dominated or cooling-dominated load produces, size the circulator, or address purging, flushing, and air removal, which are where loops actually fail in the field. IGSHPA design procedure, the heat pump manufacturer's flow requirements, the antifreeze manufacturer's data, and the designer of record govern.",
  };
}
export const groundLoopFlowAntifreezeExample = { inputs: { tons: 4, gpm_per_ton: 3.0, pipe_id_in: 1.21, fluid_density_lb_ft3: 63.9, fluid_viscosity_cp: 4.7, specific_gravity: 1.02, head_ft: 45, wire_to_water_efficiency: 0.35, benchmark_w_per_ton: 100 } };
BUILDINGPERF_RENDERERS["ground-loop-flow-antifreeze"] = _simpleRenderer({
  citation: "Citation: design flow = tons x gpm per ton; velocity from the actual pipe bore; Reynolds number = density x velocity x diameter / dynamic viscosity, with turbulence taken at Re 4,000 and the laminar boundary at 2,300; pump brake horsepower = gpm x head x specific gravity / (3,960 x wire-to-water efficiency). Fluid properties are ENTERED at the minimum expected loop temperature because they vary strongly with glycol type, concentration and temperature. It does not size the loop or its length, compute the freeze or burst point, model ground thermal properties or the field's annual thermal balance, size the circulator, or address purging and air removal. IGSHPA design procedure, the heat pump manufacturer's flow requirements, the antifreeze manufacturer's data, and the designer of record govern.",
  example: groundLoopFlowAntifreezeExample.inputs,
  fields: [
    { key: "tons", label: "Heat pump capacity (tons)", kind: "number", attrs: { step: "any" } },
    { key: "gpm_per_ton", label: "Design flow (gpm per ton)", kind: "number", attrs: { step: "any" } },
    { key: "pipe_id_in", label: "Pipe inside diameter (in)", kind: "number", attrs: { step: "any" } },
    { key: "fluid_density_lb_ft3", label: "Fluid density at the minimum loop temperature (lb/cu ft)", kind: "number", attrs: { step: "any" } },
    { key: "fluid_viscosity_cp", label: "Fluid dynamic viscosity at that temperature (cP)", kind: "number", attrs: { step: "any" } },
    { key: "specific_gravity", label: "Fluid specific gravity", kind: "number", attrs: { step: "any" } },
    { key: "head_ft", label: "Loop head (ft)", kind: "number", attrs: { step: "any" } },
    { key: "wire_to_water_efficiency", label: "Wire-to-water efficiency (0 to 1)", kind: "number", attrs: { step: "any" } },
    { key: "benchmark_w_per_ton", label: "Pumping benchmark (W per ton)", kind: "number", attrs: { step: "any" } },
  ],
  outputs: [
    { key: "f", id: "glfa-out-f", label: "Design flow and velocity", value: (r) => r.flow_verdict },
    { key: "r", id: "glfa-out-r", label: "Flow regime", value: (r) => r.flow_regime_verdict },
    { key: "p", id: "glfa-out-p", label: "Pump power", value: (r) => r.pump_verdict },
    { key: "b", id: "glfa-out-b", label: "Against the benchmark", value: (r) => r.benchmark_verdict },
    { key: "h", id: "glfa-out-h", label: "The head the benchmark allows", value: (r) => r.head_verdict },
    { key: "n", id: "glfa-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGroundLoopFlowAntifreeze,
});
