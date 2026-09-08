// Group E: Oil, gas, and pipeline.
//
// spec-v1524..v1533 (scope-trade-expansion-2, the oil and gas band): the
// pipeline and drilling side of Group E, a trade the charter's keyword probe
// found at ZERO tiles. Two benches in one module because they share a
// vocabulary and a reader: the transmission and integrity side (MAOP against
// the class-location design factor, gas flow by Weymouth and Panhandle,
// liquid station spacing, pig volume and velocity, cathodic protection, and
// the ASME B31G corrosion screen) and the wellsite side (cement volume and
// displacement, mud hydrostatic, kill mud weight, and annular velocity).
//
// Every one of these is a screen. The codes they cite -- 49 CFR 192 and 195,
// ASME B31.4, B31.8 and B31G, API RP 1102 -- govern, and a well-control or
// integrity decision is made by a qualified engineer against the operator's
// own procedures, never by arithmetic on a page.

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
  const _ogRender = function (inputRegion, outputRegion, citationEl) {
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

  _ogRender.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _ogRender;
}


export const OILGAS_RENDERERS = {};

// Unit constants. Leading-underscore names of their own, because several of
// these are oilfield CONVENTIONS rather than definitions and pinning them to a
// shared catalog name would make one cited relation disagree with another.
//
// The oilfield annular-capacity constant: square inches of area over a foot of
// length, in barrels. It is 1029.4 in every well-control manual and on every
// driller's slide rule.
const _OG_ANNULAR_BBL_CONST = 1029.4;
// The mud-weight gradient constant: one pound per gallon over one foot is
// 0.052 psi. Written as the trade writes it; the exact figure is 0.0519481.
const _OG_MUD_GRADIENT_CONST = 0.052;
// Annular velocity in ft/min from gpm over square inches.
const _OG_ANNULAR_VELOCITY_CONST = 24.5;
// Exact by definition: the US petroleum barrel is 42 US gallons, and the US
// gallon is 231 cubic inches, so a barrel is 42 x 231 / 1728 cubic feet.
const _OG_CUFT_PER_BBL = 42 * 231 / 1728;
const _OG_FT_PER_MILE = 5280;
const _OG_HOURS_PER_DAY = 24;
const _OG_SECONDS_PER_HOUR = 3600;
const _OG_HOURS_PER_YEAR = 8760;
const _OG_MA_PER_AMP = 1000;
// Gas flow. The Weymouth and Panhandle A coefficients as the equations are
// published for SCF/day with inches, miles, degrees Rankine and psia.
const _OG_WEYMOUTH_COEFF = 433.5;
const _OG_WEYMOUTH_DIAMETER_EXP = 2.667;
const _OG_PANHANDLE_A_COEFF = 435.87;
const _OG_PANHANDLE_A_TB_EXP = 1.0788;
const _OG_PANHANDLE_A_BRACKET_EXP = 0.5394;
const _OG_PANHANDLE_A_DIAMETER_EXP = 2.6182;
const _OG_PANHANDLE_A_GRAVITY_EXP = 0.8539;
// Standard (base) conditions for gas measurement, and the atmospheric pressure
// used to convert a gauge reading. They are deliberately different numbers:
// 14.73 psia is the contractual base, 14.7 is the gauge conversion.
const _OG_BASE_TEMP_R = 520;
const _OG_BASE_PRESSURE_PSIA = 14.73;
const _OG_ATM_PSIA = 14.7;
const _OG_RANKINE_OFFSET = 459.67;
// ASME B31G. The flow stress is 1.1 x SMYS, the Folias bulging factor carries
// the 0.8 coefficient, and A = 0.893 L / sqrt(D t) selects the branch: at or
// below 4.0 the parabolic (Folias) form applies, above it the rectangular
// form, which carries no bulging factor at all.
const _OG_B31G_FLOW_STRESS_FACTOR = 1.1;
const _OG_B31G_FOLIAS_COEFF = 0.8;
const _OG_B31G_A_COEFF = 0.893;
const _OG_B31G_A_LIMIT = 4.0;
const _OG_B31G_MAX_DEPTH_FRACTION = 0.8;
// 49 CFR 192 design factors by class location for gas transmission.
const _OG_CLASS_DESIGN_FACTOR = { class_1: 0.72, class_2: 0.60, class_3: 0.50, class_4: 0.40 };

// =====================================================================
// spec-v1524: Pipeline maximum allowable operating pressure (Barlow).
// =====================================================================
//
// The design factor is the big one, and it is a property of the ROUTE rather
// than of the pipe: as development grows around a line its class location
// changes, the allowable factor drops, and a line compliant at 0.72 in open
// country is not compliant at 0.50 once a subdivision is built beside it.
// dims: in { od_in: L, wall_in: L, smys_psi: M L^-1 T^-2, joint_factor: dimensionless, temperature_factor: dimensionless, operating_pressure_psig: M L^-1 T^-2, target_pressure_psig: M L^-1 T^-2 } out: { barlow_yield_psi: M L^-1 T^-2, maop_psig: M L^-1 T^-2, hoop_stress_psi: M L^-1 T^-2, pct_smys: dimensionless, wall_required_in: L }
export function computePipelineMaoBarlow({
  od_in = 0, wall_in = 0, smys_psi = 0, class_location = "class_1",
  joint_factor = 1, temperature_factor = 1,
  operating_pressure_psig = 0, target_pressure_psig = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(od_in > 0)) return { error: "Outside diameter must be positive (in)." };
  if (!(wall_in > 0)) return { error: "Wall thickness must be positive (in)." };
  if (!(wall_in < od_in / 2)) return { error: "Wall thickness must be less than half the outside diameter." };
  if (!(smys_psi > 0)) return { error: "Specified minimum yield strength must be positive (psi)." };
  if (!(joint_factor > 0 && joint_factor <= 1)) return { error: "Longitudinal joint factor must be above 0 and at most 1." };
  if (!(temperature_factor > 0 && temperature_factor <= 1)) return { error: "Temperature derating factor must be above 0 and at most 1." };
  if (operating_pressure_psig < 0 || target_pressure_psig < 0) return { error: "Pressures cannot be negative (psig)." };
  const design_factor = _OG_CLASS_DESIGN_FACTOR[class_location];
  if (!design_factor) return { error: "Class location must be class_1, class_2, class_3, or class_4." };
  // Barlow at yield, then the code multipliers that turn it into a pressure
  // the line may actually be operated at.
  const barlow_yield_psi = 2 * smys_psi * wall_in / od_in;
  const maop_psig = barlow_yield_psi * design_factor * joint_factor * temperature_factor;
  // Every class location, because the useful question is usually what happens
  // when the route reclassifies rather than what the pipe does today.
  const maop_class_1 = barlow_yield_psi * _OG_CLASS_DESIGN_FACTOR.class_1 * joint_factor * temperature_factor;
  const maop_class_2 = barlow_yield_psi * _OG_CLASS_DESIGN_FACTOR.class_2 * joint_factor * temperature_factor;
  const maop_class_3 = barlow_yield_psi * _OG_CLASS_DESIGN_FACTOR.class_3 * joint_factor * temperature_factor;
  const maop_class_4 = barlow_yield_psi * _OG_CLASS_DESIGN_FACTOR.class_4 * joint_factor * temperature_factor;
  // The hoop stress an entered operating pressure actually produces, as a
  // percent of SMYS -- the number an integrity program is written around.
  const has_operating = operating_pressure_psig > 0;
  const hoop_stress_psi = has_operating ? operating_pressure_psig * od_in / (2 * wall_in) : 0;
  const pct_smys = has_operating ? hoop_stress_psi / smys_psi * 100 : 0;
  const within_maop = has_operating ? operating_pressure_psig <= maop_psig : true;
  const operating_verdict = !has_operating
    ? "(no operating pressure entered)"
    : within_maop
      ? "the entered " + fmt(operating_pressure_psig, 0) + " psig is within MAOP, at " + fmt(pct_smys, 1) + "% of SMYS"
      : "the entered " + fmt(operating_pressure_psig, 0) + " psig is OVER the MAOP of " + fmt(maop_psig, 0) + " psig by " + fmt(operating_pressure_psig - maop_psig, 0) + " psi, at " + fmt(pct_smys, 1) + "% of SMYS -- reduce pressure, replace the segment with heavier wall, or pressure-test to requalify";
  // Inverted: the wall a target pressure needs at the selected class.
  const has_target = target_pressure_psig > 0;
  const wall_required_in = has_target ? target_pressure_psig * od_in / (2 * smys_psi * design_factor * joint_factor * temperature_factor) : 0;
  const wall_adequate = has_target ? wall_in >= wall_required_in : true;
  if (![barlow_yield_psi, maop_psig, hoop_stress_psi, pct_smys, wall_required_in].every(Number.isFinite)) return { error: "MAOP math is not a finite value." };
  return {
    barlow_yield_psi, maop_psig, design_factor, class_location,
    maop_class_1, maop_class_2, maop_class_3, maop_class_4,
    has_operating, hoop_stress_psi, pct_smys, within_maop, operating_verdict,
    has_target, wall_required_in, wall_adequate,
    note: "The pressure a gas transmission line may be operated at, from Barlow's hoop-stress relation with the design factors 49 CFR 192 and ASME B31.8 apply to it. Barlow, P = 2 S t / D, gives the pressure at which the pipe wall reaches its specified minimum yield; the multipliers turn that into an allowable operating pressure. The design factor is the big one and it is a property of the ROUTE, not of the pipe: 0.72 in Class 1, 0.60 in Class 2, 0.50 in Class 3 and 0.40 in Class 4. As development grows around a line its class location changes, the allowable factor drops, and a line that was compliant at 0.72 in open country is not compliant at 0.50 once a subdivision is built beside it. That recalculation is triggered by population rather than by anything happening to the steel, and it is a routine and consequential part of integrity management -- which is why the MAOP at every class location is reported here rather than only the one selected. The longitudinal joint factor catches older pipe. Pre-1970 electric-resistance-welded and furnace-welded pipe carry factors below 1.0 because their seams are less reliable, and applying 1.0 to a 1950s line overstates its MAOP directly. The temperature factor derates above roughly 250 degF. Wall loss from corrosion changes the thickness this relation multiplies, and an in-service line with measured metal loss is governed by a remaining-strength evaluation instead, which is a different calculation on the same pipe. This is a design screen on nominal wall: it does not establish MAOP of record, which depends on the pressure test history, the manufacturing and construction records, and the grandfathering provisions; it does not evaluate seam integrity, cyclic fatigue, or dents and gouges; and it does not address liquid lines, which are designed to a different factor under B31.4 and 49 CFR 195. The operator's integrity management program, the pipeline engineer of record, and the regulator govern.",
  };
}
export const pipelineMaoBarlowExample = { inputs: { od_in: 12.75, wall_in: 0.25, smys_psi: 52000, class_location: "class_1", joint_factor: 1.0, temperature_factor: 1.0, operating_pressure_psig: 1468, target_pressure_psig: 0 } };
OILGAS_RENDERERS["pipeline-mao-barlow"] = _simpleRenderer({
  citation: "Citation: Barlow's relation P = 2 S t / D with the design factors 49 CFR 192.111 / 192.105 and ASME B31.8 apply -- design factor F by class location (0.72 Class 1, 0.60 Class 2, 0.50 Class 3, 0.40 Class 4), longitudinal joint factor E, and temperature derating factor T. A design screen on NOMINAL wall: it does not establish the MAOP of record (pressure test history, manufacturing and construction records, and grandfathering govern that), evaluate seam integrity, fatigue, dents or gouges, or cover liquid lines, which are designed under ASME B31.4 and 49 CFR 195. The operator's integrity management program and the pipeline engineer of record govern.",
  example: pipelineMaoBarlowExample.inputs,
  fields: [
    { key: "od_in", label: "Pipe outside diameter (in)", kind: "number" },
    { key: "wall_in", label: "Wall thickness (in)", kind: "number" },
    { key: "smys_psi", label: "Specified minimum yield strength SMYS (psi)", kind: "number" },
    { key: "class_location", label: "Class location", kind: "select", default: "class_1", options: [{ value: "class_1", label: "Class 1 (F = 0.72)" }, { value: "class_2", label: "Class 2 (F = 0.60)" }, { value: "class_3", label: "Class 3 (F = 0.50)" }, { value: "class_4", label: "Class 4 (F = 0.40)" }] },
    { key: "joint_factor", label: "Longitudinal joint factor E", kind: "number", default: 1 },
    { key: "temperature_factor", label: "Temperature derating factor T", kind: "number", default: 1 },
    { key: "operating_pressure_psig", label: "Operating pressure (psig, 0 to skip)", kind: "number" },
    { key: "target_pressure_psig", label: "Target pressure for a wall check (psig, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "b", id: "pmb-out-b", label: "Barlow pressure at yield", value: (r) => fmt(r.barlow_yield_psi, 0) + " psi" },
    { key: "m", id: "pmb-out-m", label: "MAOP", value: (r) => fmt(r.maop_psig, 0) + " psig at F = " + fmt(r.design_factor, 2) },
    { key: "c", id: "pmb-out-c", label: "At each class location", value: (r) => "Class 1 " + fmt(r.maop_class_1, 0) + ", Class 2 " + fmt(r.maop_class_2, 0) + ", Class 3 " + fmt(r.maop_class_3, 0) + ", Class 4 " + fmt(r.maop_class_4, 0) + " psig" },
    { key: "o", id: "pmb-out-o", label: "Against the operating pressure", value: (r) => r.operating_verdict },
    { key: "w", id: "pmb-out-w", label: "Wall for the target pressure", value: (r) => !r.has_target ? "(no target pressure entered)" : fmt(r.wall_required_in, 3) + " in required" + (r.wall_adequate ? ", which the entered wall meets" : ", MORE than the entered wall") },
    { key: "n", id: "pmb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePipelineMaoBarlow,
});

// =====================================================================
// spec-v1525: Gas pipeline flow (Weymouth and Panhandle A).
// =====================================================================
//
// Both equations say the same physical thing: flow is driven by the difference
// of the SQUARES of the absolute pressures, not by the pressure difference.
// Helpers above the first export so the v14 lint reads the annotation, and
// each returns an arithmetic expression rather than a bare identifier.
const _ogWeymouth = (tb, pb, dp2, g, t, l, z, d, e) =>
  _OG_WEYMOUTH_COEFF * (tb / pb) * Math.sqrt(dp2 / (g * t * l * z)) * Math.pow(d, _OG_WEYMOUTH_DIAMETER_EXP) * e;
const _ogPanhandleA = (tb, pb, dp2, g, t, l, z, d, e) =>
  _OG_PANHANDLE_A_COEFF * Math.pow(tb / pb, _OG_PANHANDLE_A_TB_EXP)
  * Math.pow(dp2 / (Math.pow(g, _OG_PANHANDLE_A_GRAVITY_EXP) * t * l * z), _OG_PANHANDLE_A_BRACKET_EXP)
  * Math.pow(d, _OG_PANHANDLE_A_DIAMETER_EXP) * e;
// dims: in { id_in: L, length_mi: L, inlet_psig: M L^-1 T^-2, outlet_psig: M L^-1 T^-2, gravity: dimensionless, flowing_temp_f: T, z_factor: dimensionless, efficiency: dimensionless, alternate_id_in: L } out: { squared_difference: dimensionless, q_scfd: L^3 T^-1, q_mmscfd: L^3 T^-1, alternate_q_scfd: L^3 T^-1, diameter_capacity_ratio: dimensionless }
export function computeGasPipelineFlow({
  equation = "panhandle_a", id_in = 0, length_mi = 0, inlet_psig = 0, outlet_psig = 0,
  gravity = 0.6, flowing_temp_f = 60, z_factor = 1, efficiency = 0.92, alternate_id_in = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(id_in > 0)) return { error: "Inside diameter must be positive (in)." };
  if (!(length_mi > 0)) return { error: "Segment length must be positive (miles)." };
  if (!(gravity > 0)) return { error: "Gas specific gravity must be positive." };
  if (!(z_factor > 0)) return { error: "Compressibility factor must be positive." };
  if (!(efficiency > 0 && efficiency <= 1)) return { error: "Pipeline efficiency must be above 0 and at most 1." };
  if (alternate_id_in < 0) return { error: "Alternate diameter cannot be negative (in)." };
  const inlet_psia = inlet_psig + _OG_ATM_PSIA;
  const outlet_psia = outlet_psig + _OG_ATM_PSIA;
  if (!(inlet_psia > 0)) return { error: "Inlet pressure must be above a full vacuum." };
  if (!(outlet_psia > 0)) return { error: "Outlet pressure must be above a full vacuum." };
  if (!(inlet_psia > outlet_psia)) return { error: "Inlet pressure must exceed outlet pressure for flow." };
  const flowing_temp_r = flowing_temp_f + _OG_RANKINE_OFFSET;
  if (!(flowing_temp_r > 0)) return { error: "Flowing temperature must be above absolute zero." };
  // The driving term. Reported on its own because it is the part that is
  // counter-intuitive and the part a field decision usually turns on.
  const squared_difference = inlet_psia * inlet_psia - outlet_psia * outlet_psia;
  const weymouth_scfd = _ogWeymouth(_OG_BASE_TEMP_R, _OG_BASE_PRESSURE_PSIA, squared_difference, gravity, flowing_temp_r, length_mi, z_factor, id_in, efficiency);
  const panhandle_scfd = _ogPanhandleA(_OG_BASE_TEMP_R, _OG_BASE_PRESSURE_PSIA, squared_difference, gravity, flowing_temp_r, length_mi, z_factor, id_in, efficiency);
  const is_weymouth = equation === "weymouth";
  const q_scfd = is_weymouth ? weymouth_scfd : panhandle_scfd;
  const alternate_q_scfd = is_weymouth ? panhandle_scfd : weymouth_scfd;
  const q_mscfd = q_scfd / 1000;
  const q_mmscfd = q_scfd / 1000000;
  const equation_label = is_weymouth ? "Weymouth" : "Panhandle A";
  const alternate_label = is_weymouth ? "Panhandle A" : "Weymouth";
  const diameter_exp = is_weymouth ? _OG_WEYMOUTH_DIAMETER_EXP : _OG_PANHANDLE_A_DIAMETER_EXP;
  // Diameter dominates: capacity goes as d to roughly 2.6 or 2.67, which is
  // why capacity problems are solved with pipe rather than with compression.
  const has_alternate = alternate_id_in > 0;
  const diameter_capacity_ratio = has_alternate ? Math.pow(alternate_id_in / id_in, diameter_exp) : 0;
  const diameter_verdict = !has_alternate
    ? "(no alternative diameter entered)"
    : "a " + fmt(alternate_id_in, 2) + " in line carries " + fmt(diameter_capacity_ratio, 2) + " times this one at the same pressures, from the d^" + fmt(diameter_exp, 4) + " exponent -- a " + fmt((alternate_id_in / id_in - 1) * 100, 0) + "% diameter change for a " + fmt((diameter_capacity_ratio - 1) * 100, 0) + "% capacity change";
  if (![squared_difference, q_scfd, alternate_q_scfd, q_mmscfd, diameter_capacity_ratio].every(Number.isFinite)) return { error: "Gas pipeline flow math is not a finite value." };
  return {
    inlet_psia, outlet_psia, squared_difference, flowing_temp_r,
    q_scfd, q_mscfd, q_mmscfd, equation_label,
    alternate_q_scfd, alternate_label,
    has_alternate, diameter_capacity_ratio, diameter_verdict,
    note: "Steady-state gas transmission flow by the two equations the trade actually uses, reported side by side because the choice between them is a judgment. Both say the same physical thing: flow is driven by the difference of the SQUARES of the absolute pressures, not by the pressure difference. That squared form is the part worth carrying in the field, because it means dropping the outlet pressure buys much more additional flow on a high-pressure line than the same drop does on a low-pressure one. Weymouth suits short, smaller-diameter, high-friction and rough pipe and is generally conservative on large lines; Panhandle A suits long large-diameter transmission at higher flow. They can differ substantially on the same segment, which is why both are shown and neither is presented as the answer. Diameter dominates everything else: capacity goes as diameter to roughly the 2.6 to 2.67 power, so a modest increase in size is a large increase in capacity while doubling the length costs only about 30 percent of the flow. That exponent is why looping a line -- laying a parallel segment -- is such an effective way to add capacity, and why a small restriction anywhere in a run costs more than intuition suggests. Efficiency is where a real line differs from a calculated one: a factor near 0.92 is a clean dry line, and liquid holdup, internal corrosion product, or a partially closed valve show up here and are the usual reason measured flow falls short of predicted. Compressibility is ENTERED because it depends on pressure, temperature and composition, and assuming 1.0 at transmission pressure overstates flow. This is a steady-state, isothermal, single-phase screen at one uniform elevation: it does not handle elevation change, two-phase or liquid-bearing flow, transients and line pack, or compressor station hydraulics, and it does not select the equation for you. The operator's own hydraulic model and the pipeline engineer of record govern.",
  };
}
export const gasPipelineFlowExample = { inputs: { equation: "panhandle_a", id_in: 15.5, length_mi: 42, inlet_psig: 850, outlet_psig: 600, gravity: 0.60, flowing_temp_f: 60, z_factor: 1.0, efficiency: 0.92, alternate_id_in: 19.25 } };
OILGAS_RENDERERS["gas-pipeline-flow"] = _simpleRenderer({
  citation: "Citation: the Weymouth and Panhandle A gas transmission equations as published for SCF/day -- Weymouth Q = 433.5 (Tb/Pb) [(P1^2 - P2^2)/(G T L Z)]^0.5 d^2.667 E, Panhandle A Q = 435.87 (Tb/Pb)^1.0788 [(P1^2 - P2^2)/(G^0.8539 T L Z)]^0.5394 d^2.6182 E, with diameter in inches, length in miles, temperature in degrees Rankine and pressure in psia at a 14.73 psia and 520 degR base. Gauge pressures convert at 14.7 psi. Compressibility and efficiency are ENTERED. A steady-state, isothermal, single-phase screen at uniform elevation: it does not handle elevation change, two-phase flow, transients and line pack, or compressor hydraulics. The operator's own hydraulic model governs.",
  example: gasPipelineFlowExample.inputs,
  fields: [
    { key: "equation", label: "Equation", kind: "select", default: "panhandle_a", options: [{ value: "panhandle_a", label: "Panhandle A (long, large-diameter transmission)" }, { value: "weymouth", label: "Weymouth (short, smaller diameter, rough pipe)" }] },
    { key: "id_in", label: "Pipe inside diameter (in)", kind: "number" },
    { key: "length_mi", label: "Segment length (miles)", kind: "number" },
    { key: "inlet_psig", label: "Inlet pressure (psig)", kind: "number" },
    { key: "outlet_psig", label: "Outlet pressure (psig)", kind: "number" },
    { key: "gravity", label: "Gas specific gravity (air = 1)", kind: "number", default: 0.6 },
    { key: "flowing_temp_f", label: "Flowing temperature (°F)", kind: "number", attrs: { step: "any" }, default: 60 },
    { key: "z_factor", label: "Compressibility factor Z", kind: "number", default: 1 },
    { key: "efficiency", label: "Pipeline efficiency E (0-1)", kind: "number", default: 0.92 },
    { key: "alternate_id_in", label: "Alternative diameter (in, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "d", id: "gpf-out-d", label: "Driving term", value: (r) => fmt(r.squared_difference, 0) + " psia² (" + fmt(r.inlet_psia, 1) + "² − " + fmt(r.outlet_psia, 1) + "²)" },
    { key: "q", id: "gpf-out-q", label: "Flow", value: (r) => fmt(r.q_mmscfd, 2) + " MMSCFD (" + fmt(r.q_mscfd, 0) + " MSCFD) by " + r.equation_label },
    { key: "a", id: "gpf-out-a", label: "By the other equation", value: (r) => fmt(r.alternate_q_scfd / 1000000, 2) + " MMSCFD by " + r.alternate_label },
    { key: "l", id: "gpf-out-l", label: "Larger pipe", value: (r) => r.diameter_verdict },
    { key: "n", id: "gpf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeGasPipelineFlow,
});

// =====================================================================
// spec-v1526: Liquid pipeline friction loss and pump station spacing.
// =====================================================================
//
// Unlike gas, liquid is incompressible, so the pressure profile is a straight
// line falling at the friction gradient and tilted by terrain. That makes the
// arithmetic simple and makes elevation matter enormously.
// dims: in { total_length_mi: L, friction_gradient_ft_per_mi: dimensionless, elevation_change_ft: L, maop_head_ft: L, min_suction_head_ft: L, flow_bpd: L^3 T^-1, alternate_flow_bpd: L^3 T^-1 } out: { available_head_ft: L, elevation_gradient_ft_per_mi: dimensionless, combined_gradient_ft_per_mi: dimensionless, max_spacing_mi: L, station_count: dimensionless, alternate_gradient_ft_per_mi: dimensionless }
export function computeLiquidPipelineStationSpacing({
  total_length_mi = 0, friction_gradient_ft_per_mi = 0, elevation_change_ft = 0,
  maop_head_ft = 0, min_suction_head_ft = 0, flow_bpd = 0, alternate_flow_bpd = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(total_length_mi > 0)) return { error: "Total length must be positive (miles)." };
  if (!(friction_gradient_ft_per_mi > 0)) return { error: "Friction gradient must be positive (ft per mile)." };
  if (!(maop_head_ft > 0)) return { error: "MAOP head must be positive (ft)." };
  if (min_suction_head_ft < 0) return { error: "Minimum suction head cannot be negative (ft)." };
  if (!(maop_head_ft > min_suction_head_ft)) return { error: "MAOP head must exceed the minimum suction head -- there is no head available to spend." };
  if (flow_bpd < 0 || alternate_flow_bpd < 0) return { error: "Flow rates cannot be negative (bbl/day)." };
  const available_head_ft = maop_head_ft - min_suction_head_ft;
  const elevation_gradient_ft_per_mi = elevation_change_ft / total_length_mi;
  const combined_gradient_ft_per_mi = friction_gradient_ft_per_mi + elevation_gradient_ft_per_mi;
  if (!(combined_gradient_ft_per_mi > 0)) return { error: "The combined gradient is not positive -- a line falling faster than friction consumes runs slack, which is a surge problem rather than a spacing one." };
  const max_spacing_mi = available_head_ft / combined_gradient_ft_per_mi;
  const station_count = Math.max(1, Math.ceil(total_length_mi / max_spacing_mi));
  const actual_spacing_mi = total_length_mi / station_count;
  const head_used_per_station_ft = actual_spacing_mi * combined_gradient_ft_per_mi;
  // Elevation is head spent regardless of flow, so on a climb the static term
  // can exceed the friction term entirely. Report the split.
  const elevation_share_pct = elevation_gradient_ft_per_mi / combined_gradient_ft_per_mi * 100;
  const elevation_dominates = Math.abs(elevation_gradient_ft_per_mi) > friction_gradient_ft_per_mi;
  // Friction goes roughly as the SQUARE of flow, which is the whole shape of
  // the economics: the last increment of throughput is the most expensive.
  const has_alternate = flow_bpd > 0 && alternate_flow_bpd > 0;
  const flow_ratio = has_alternate ? alternate_flow_bpd / flow_bpd : 0;
  const alternate_gradient_ft_per_mi = has_alternate ? friction_gradient_ft_per_mi * flow_ratio * flow_ratio : 0;
  const alternate_combined = has_alternate ? alternate_gradient_ft_per_mi + elevation_gradient_ft_per_mi : 0;
  const alternate_spacing_mi = has_alternate && alternate_combined > 0 ? available_head_ft / alternate_combined : 0;
  const alternate_station_count = has_alternate && alternate_spacing_mi > 0 ? Math.max(1, Math.ceil(total_length_mi / alternate_spacing_mi)) : 0;
  const alternate_verdict = !has_alternate
    ? "(no throughput comparison entered)"
    : "at " + fmt(alternate_flow_bpd, 0) + " bbl/day the friction gradient rises to " + fmt(alternate_gradient_ft_per_mi, 1) + " ft per mile (friction goes as the SQUARE of flow), spacing falls to " + fmt(alternate_spacing_mi, 0) + " miles, and the line needs " + fmt(alternate_station_count, 0) + " station" + (alternate_station_count === 1 ? "" : "s");
  if (![available_head_ft, elevation_gradient_ft_per_mi, combined_gradient_ft_per_mi, max_spacing_mi, station_count, alternate_gradient_ft_per_mi].every(Number.isFinite)) return { error: "Station spacing math is not a finite value." };
  return {
    available_head_ft, elevation_gradient_ft_per_mi, combined_gradient_ft_per_mi,
    max_spacing_mi, station_count, actual_spacing_mi, head_used_per_station_ft,
    elevation_share_pct, elevation_dominates,
    has_alternate, alternate_gradient_ft_per_mi, alternate_spacing_mi, alternate_station_count, alternate_verdict,
    note: "How far apart a liquid pipeline's pump stations can sit, from the head available between MAOP and the minimum suction requirement. Liquid is incompressible, so unlike a gas line the pressure profile is a straight line falling at the friction gradient and tilted by terrain -- which makes the arithmetic simple and makes elevation matter enormously. A line climbing spends that lift regardless of flow, and on a mountain crossing the static term can exceed the friction term entirely, so the split between the two is reported here rather than buried in one combined number. Two constraints bracket every station. The discharge cannot exceed MAOP, and the suction must stay above the minimum required to keep the pump out of cavitation and, on a hot or volatile product, above the vapour pressure so the line does not go slack. That second one is why a downhill segment can be a problem rather than a gift: a line running downhill faster than friction holds it back goes to slack flow, and the column separation and rejoin that follows is a surge event. Friction goes roughly as the SQUARE of flow, so raising throughput raises the gradient quadratically and the station count with it. That is the shape of the economics -- capacity is bought with horsepower and stations, and the last increment of throughput is always the most expensive. The friction gradient is ENTERED, from a Darcy-Weisbach or Hazen-Williams calculation at the design flow, viscosity and roughness, because it depends on properties this does not take. This is a steady-state screen: it does not compute the friction gradient, size the pumps or their drivers, model batching and the different gradients each product produces, or -- most importantly -- analyse SURGE, whose transient pressures from a valve closure or pump trip routinely exceed the steady-state profile everywhere on the line. ASME B31.4, 49 CFR 195, a transient surge analysis, and the pipeline engineer of record govern.",
  };
}
export const liquidPipelineStationSpacingExample = { inputs: { total_length_mi: 120, friction_gradient_ft_per_mi: 12, elevation_change_ft: 400, maop_head_ft: 2300, min_suction_head_ft: 150, flow_bpd: 60000, alternate_flow_bpd: 90000 } };
OILGAS_RENDERERS["liquid-pipeline-station-spacing"] = _simpleRenderer({
  citation: "Citation: the steady-state liquid pipeline head balance as ASME B31.4 / 49 CFR 195 practice writes it -- available head = MAOP head minus minimum suction head, spacing = available head / (friction gradient + elevation gradient), station count = ceiling of length over spacing -- with friction scaling as roughly the SQUARE of flow. The friction gradient is ENTERED from a Darcy-Weisbach or Hazen-Williams calculation at the design flow, viscosity and roughness. It does not compute that gradient, size pumps or drivers, model batching, or analyse SURGE, whose transient pressures routinely exceed the steady-state profile. A transient surge analysis and the pipeline engineer of record govern.",
  example: liquidPipelineStationSpacingExample.inputs,
  fields: [
    { key: "total_length_mi", label: "Total line length (miles)", kind: "number" },
    { key: "friction_gradient_ft_per_mi", label: "Friction gradient (ft of head per mile)", kind: "number" },
    { key: "elevation_change_ft", label: "Net elevation change, origin to terminal (ft)", kind: "number", attrs: { step: "any" } },
    { key: "maop_head_ft", label: "MAOP expressed as head (ft)", kind: "number" },
    { key: "min_suction_head_ft", label: "Minimum required suction head (ft)", kind: "number" },
    { key: "flow_bpd", label: "Design flow (bbl/day, 0 to skip the comparison)", kind: "number" },
    { key: "alternate_flow_bpd", label: "Alternative throughput (bbl/day)", kind: "number" },
  ],
  outputs: [
    { key: "h", id: "lps-out-h", label: "Head available per station", value: (r) => fmt(r.available_head_ft, 0) + " ft" },
    { key: "g", id: "lps-out-g", label: "Combined gradient", value: (r) => fmt(r.combined_gradient_ft_per_mi, 2) + " ft per mile (" + fmt(r.elevation_gradient_ft_per_mi, 2) + " of it elevation, " + fmt(r.elevation_share_pct, 0) + "%" + (r.elevation_dominates ? " -- elevation is the LARGER term" : "") + ")" },
    { key: "s", id: "lps-out-s", label: "Maximum station spacing", value: (r) => fmt(r.max_spacing_mi, 0) + " miles" },
    { key: "c", id: "lps-out-c", label: "Stations required", value: (r) => fmt(r.station_count, 0) + " at " + fmt(r.actual_spacing_mi, 0) + " mile spacing, using " + fmt(r.head_used_per_station_ft, 0) + " ft of the available head" },
    { key: "a", id: "lps-out-a", label: "At the alternative throughput", value: (r) => r.alternate_verdict },
    { key: "n", id: "lps-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLiquidPipelineStationSpacing,
});

// =====================================================================
// spec-v1527: Pipeline pigging volume and batch displacement.
// =====================================================================
//
// spec-v1527's own example calls 2.98 ft/s "comfortably inside" a 3 to 12 ft/s
// tool window. It is BELOW the window. The verdict here is driven off a
// boolean the compute returns, so the sentence cannot disagree with the number.
// dims: in { id_in: L, length_mi: L, flow_bpd: L^3 T^-1, tool_min_fps: L T^-1, tool_max_fps: L T^-1 } out: { bbl_per_mile: L^2, total_bbl: L^3, total_ft3: L^3, velocity_fps: L T^-1, travel_time_h: T, flow_for_min_bpd: L^3 T^-1 }
export function computePigBatchVolume({
  id_in = 0, length_mi = 0, flow_bpd = 0, tool_min_fps = 0, tool_max_fps = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(id_in > 0)) return { error: "Inside diameter must be positive (in)." };
  if (!(length_mi > 0)) return { error: "Segment length must be positive (miles)." };
  if (flow_bpd < 0) return { error: "Flow cannot be negative (bbl/day)." };
  if (tool_min_fps < 0 || tool_max_fps < 0) return { error: "Tool velocity limits cannot be negative (ft/s)." };
  if (tool_max_fps > 0 && tool_min_fps > tool_max_fps) return { error: "The tool's minimum velocity cannot exceed its maximum." };
  // A pipeline is a very long cylinder, and its volume is larger than
  // intuition suggests.
  const area_ft2 = Math.PI / 4 * (id_in / 12) * (id_in / 12);
  const ft3_per_mile = area_ft2 * _OG_FT_PER_MILE;
  const bbl_per_mile = ft3_per_mile / _OG_CUFT_PER_BBL;
  const total_bbl = bbl_per_mile * length_mi;
  const total_ft3 = ft3_per_mile * length_mi;
  // Pig velocity is flow over area, and it matters for more than scheduling.
  const has_flow = flow_bpd > 0;
  const velocity_mph = has_flow ? flow_bpd / _OG_HOURS_PER_DAY / bbl_per_mile : 0;
  const velocity_fps = velocity_mph * _OG_FT_PER_MILE / _OG_SECONDS_PER_HOUR;
  const travel_time_h = has_flow && velocity_mph > 0 ? length_mi / velocity_mph : 0;
  // The window check, as a boolean. Both ends, and neither is assumed.
  const has_window = tool_min_fps > 0 || tool_max_fps > 0;
  const above_min = tool_min_fps > 0 ? velocity_fps >= tool_min_fps : true;
  const below_max = tool_max_fps > 0 ? velocity_fps <= tool_max_fps : true;
  const in_window = has_flow && has_window && above_min && below_max;
  const flow_for_min_bpd = tool_min_fps > 0 ? tool_min_fps * _OG_SECONDS_PER_HOUR / _OG_FT_PER_MILE * bbl_per_mile * _OG_HOURS_PER_DAY : 0;
  const flow_for_max_bpd = tool_max_fps > 0 ? tool_max_fps * _OG_SECONDS_PER_HOUR / _OG_FT_PER_MILE * bbl_per_mile * _OG_HOURS_PER_DAY : 0;
  const window_verdict = !has_flow
    ? "(no flow entered)"
    : !has_window
      ? "(no tool velocity window entered)"
      : in_window
        ? "INSIDE the window: " + fmt(velocity_fps, 2) + " ft/s against " + fmt(tool_min_fps, 1) + " to " + fmt(tool_max_fps, 1) + " ft/s"
        : !above_min
          ? "BELOW the window: " + fmt(velocity_fps, 2) + " ft/s against a " + fmt(tool_min_fps, 1) + " ft/s minimum -- the run has to wait for throughput, or the line must move at least " + fmt(flow_for_min_bpd, 0) + " bbl/day"
          : "ABOVE the window: " + fmt(velocity_fps, 2) + " ft/s against a " + fmt(tool_max_fps, 1) + " ft/s maximum -- the tool's sensors cannot sample properly and the run would have to be repeated; hold the line at or below " + fmt(flow_for_max_bpd, 0) + " bbl/day";
  if (![bbl_per_mile, total_bbl, total_ft3, velocity_fps, travel_time_h, flow_for_min_bpd].every(Number.isFinite)) return { error: "Pig volume math is not a finite value." };
  return {
    bbl_per_mile, total_bbl, total_ft3, ft3_per_mile,
    has_flow, velocity_mph, velocity_fps, travel_time_h,
    has_window, above_min, below_max, in_window,
    flow_for_min_bpd, flow_for_max_bpd, window_verdict,
    note: "The volume of product a pipeline segment holds, and how fast and how long a pig moving through it travels. A pipeline is a very long cylinder and its volume is larger than intuition suggests, which is the number that sizes the receiver, the tankage, and the displacement batch all at once. Pig velocity follows directly from flow over area, and it matters for more than scheduling. Too slow and a cleaning pig can stall, or its bypass lets debris past; too fast and an inline inspection tool's sensors cannot sample properly and the run has to be repeated at the cost of another mobilisation. Most inline inspection tools have a stated velocity window, and checking that the planned flow puts the tool inside it -- before the tool is in the line -- is exactly what this is for. That check is reported as a verdict computed from the velocity rather than as a number for the reader to compare by eye, and it names which end of the window was missed and the throughput that would fix it, because a velocity a little under a minimum reads as acceptable at a glance and is not. For a batched liquid line the same volume arithmetic sizes the interface: two products in contact mix over a length that grows with the distance travelled, and the contaminated interface volume has to be cut to slop or downgraded, a real cost that scales with the line volume. Barrels convert at 42 gallons of 231 cubic inches, exact by definition. This assumes a constant inside diameter and a full line: it does not model bypass around the pig, the differential pressure needed to drive it, tool wear, or the interface mixing length itself, which depends on the products, the flow regime and the distance. The tool vendor's velocity specification and the operator's pigging procedure govern.",
  };
}
export const pigBatchVolumeExample = { inputs: { id_in: 15.5, length_mi: 42, flow_bpd: 60000, tool_min_fps: 3, tool_max_fps: 12 } };
OILGAS_RENDERERS["pig-batch-volume"] = _simpleRenderer({
  citation: "Citation: line volume as the geometry of a cylinder, V = (pi/4) d^2 L, converted at 42 gallons of 231 cubic inches per barrel (exact by definition), with pig velocity = flow / line volume per unit length and travel time = length / velocity. The inline inspection tool's velocity window is ENTERED from the tool vendor's specification. It assumes a constant inside diameter and a full line, and does not model bypass around the pig, the differential pressure driving it, tool wear, or the batch interface mixing length. The tool vendor's specification and the operator's pigging procedure govern.",
  example: pigBatchVolumeExample.inputs,
  fields: [
    { key: "id_in", label: "Pipe inside diameter (in)", kind: "number" },
    { key: "length_mi", label: "Segment length (miles)", kind: "number" },
    { key: "flow_bpd", label: "Flow rate (bbl/day, 0 to skip velocity)", kind: "number" },
    { key: "tool_min_fps", label: "Tool minimum velocity (ft/s, 0 to skip)", kind: "number" },
    { key: "tool_max_fps", label: "Tool maximum velocity (ft/s, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "m", id: "pbv-out-m", label: "Volume per mile", value: (r) => fmt(r.bbl_per_mile, 1) + " bbl per mile (" + fmt(r.ft3_per_mile, 0) + " cu ft)" },
    { key: "t", id: "pbv-out-t", label: "Total line volume", value: (r) => fmt(r.total_bbl, 0) + " bbl (" + fmt(r.total_ft3, 0) + " cu ft) -- the receiver, the tankage, and the displacement at once" },
    { key: "v", id: "pbv-out-v", label: "Pig velocity", value: (r) => !r.has_flow ? "(no flow entered)" : fmt(r.velocity_fps, 2) + " ft/s (" + fmt(r.velocity_mph, 2) + " miles/h)" },
    { key: "h", id: "pbv-out-h", label: "Travel time", value: (r) => !r.has_flow ? "(no flow entered)" : fmt(r.travel_time_h, 1) + " hours end to end" },
    { key: "w", id: "pbv-out-w", label: "Against the tool window", value: (r) => r.window_verdict },
    { key: "n", id: "pbv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePigBatchVolume,
});

// =====================================================================
// spec-v1528: Cathodic protection anode count and life.
// =====================================================================
//
// Everything turns on how much steel is actually exposed. The current this
// returns is the input a sacrificial-anode life calculation asks a user to
// supply, so what that one takes on faith is computed here.
// dims: in { od_in: L, length_mi: L, coating_efficiency_pct: dimensionless, current_density_ma_per_ft2: I L^-2, anode_weight_lb: M, consumption_lb_per_a_yr: M I^-1 T^-1, utilization: dimensionless, current_per_anode_a: I, degraded_efficiency_pct: dimensionless, target_life_years: T } out: { total_area_ft2: L^2, bare_area_ft2: L^2, current_required_a: I, anode_count: dimensionless, anode_life_years: T, mass_for_target_lb: M, degraded_current_a: I }
export function computeCathodicAnodeCountLife({
  od_in = 0, length_mi = 0, coating_efficiency_pct = 0, current_density_ma_per_ft2 = 0,
  anode_weight_lb = 0, consumption_lb_per_a_yr = 0, utilization = 0.85,
  current_per_anode_a = 0, degraded_efficiency_pct = 0, target_life_years = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(od_in > 0)) return { error: "Pipe outside diameter must be positive (in)." };
  if (!(length_mi > 0)) return { error: "Length must be positive (miles)." };
  if (!(coating_efficiency_pct >= 0 && coating_efficiency_pct < 100)) return { error: "Coating efficiency must be at least 0 and below 100 percent -- a perfect coating needs no protection and is not a design case." };
  if (!(current_density_ma_per_ft2 > 0)) return { error: "Current density must be positive (mA per sq ft of bare steel)." };
  if (!(utilization > 0 && utilization <= 1)) return { error: "Utilization factor must be above 0 and at most 1." };
  if (anode_weight_lb < 0 || consumption_lb_per_a_yr < 0 || current_per_anode_a < 0) return { error: "Anode weight, consumption rate, and current per anode cannot be negative." };
  if (degraded_efficiency_pct < 0 || degraded_efficiency_pct >= 100) return { error: "The degraded coating efficiency must be at least 0 and below 100 percent." };
  if (target_life_years < 0) return { error: "Target life cannot be negative (years)." };
  const total_area_ft2 = Math.PI * (od_in / 12) * length_mi * _OG_FT_PER_MILE;
  const bare_fraction = 1 - coating_efficiency_pct / 100;
  const bare_area_ft2 = total_area_ft2 * bare_fraction;
  const current_required_a = bare_area_ft2 * current_density_ma_per_ft2 / _OG_MA_PER_AMP;
  // The count, and the life, each gated on the input they need.
  const has_anode_output = current_per_anode_a > 0;
  const anode_count = has_anode_output ? Math.ceil(current_required_a / current_per_anode_a) : 0;
  const has_life_basis = anode_weight_lb > 0 && consumption_lb_per_a_yr > 0 && current_per_anode_a > 0;
  const anode_life_years = has_life_basis ? anode_weight_lb * utilization / (consumption_lb_per_a_yr * current_per_anode_a) : 0;
  const has_target_life = target_life_years > 0 && consumption_lb_per_a_yr > 0;
  const mass_for_target_lb = has_target_life ? consumption_lb_per_a_yr * current_required_a * target_life_years / utilization : 0;
  // The degradation case, which is the one that surprises people.
  const has_degraded = degraded_efficiency_pct > 0 && degraded_efficiency_pct < coating_efficiency_pct;
  const degraded_bare_ft2 = has_degraded ? total_area_ft2 * (1 - degraded_efficiency_pct / 100) : 0;
  const degraded_current_a = has_degraded ? degraded_bare_ft2 * current_density_ma_per_ft2 / _OG_MA_PER_AMP : 0;
  const current_multiple = has_degraded && current_required_a > 0 ? degraded_current_a / current_required_a : 0;
  const degraded_verdict = !has_degraded
    ? "(no degraded coating case entered, or it is not worse than the design coating)"
    : "at " + fmt(degraded_efficiency_pct, 1) + "% efficiency the bare area is " + fmt(degraded_bare_ft2, 0) + " sq ft and the demand is " + fmt(degraded_current_a, 2) + " A -- " + fmt(current_multiple, 1) + " times the design current, from a coating change many would describe as still mostly good. A rectifier sized for the design case cannot hold this line, and the symptom is a potential survey that fails at the far end";
  const life_verdict = !has_life_basis
    ? "(no anode weight, consumption rate, or current per anode entered)"
    : fmt(anode_life_years, 1) + " years per anode at " + fmt(current_per_anode_a, 2) + " A each";
  if (![total_area_ft2, bare_area_ft2, current_required_a, anode_count, anode_life_years, mass_for_target_lb, degraded_current_a].every(Number.isFinite)) return { error: "Cathodic protection math is not a finite value." };
  return {
    total_area_ft2, bare_fraction, bare_area_ft2, current_required_a,
    has_anode_output, anode_count, has_life_basis, anode_life_years, life_verdict,
    has_target_life, mass_for_target_lb,
    has_degraded, degraded_bare_ft2, degraded_current_a, current_multiple, degraded_verdict,
    note: "The protective current a coated pipeline needs, the anodes that deliver it, and how long they last. Everything turns on how much steel is actually exposed. A well-coated line needs current only where the coating has holidays, so its demand is a small fraction of a bare line's -- and that is why coating is the primary corrosion control and cathodic protection is the secondary system that handles what the coating misses. A line assumed bare when it is well coated gets a wildly oversized rectifier and anode bed; a line assumed well coated when its coating has degraded gets a system that cannot hold potential, which is the more dangerous error and the one the degraded case here is for. The sensitivity is severe and it is worth seeing as a number: because demand is proportional to bare area, a coating falling from 99.9 to 99 percent efficiency multiplies the current requirement tenfold, and a coating most people would still call good can leave a correctly sized rectifier unable to protect the far end of the line. Anode life is then mass over consumption rate. The material choice drives it: galvanic magnesium is consumed roughly twenty times faster per ampere than an impressed-current high-silicon cast iron anode, which is why galvanic systems suit small, well-coated, low-current jobs and impressed current suits everything larger. The utilization factor accounts for an anode becoming ineffective before it is fully consumed. The current this returns is the figure a sacrificial-anode service-life calculation asks the user to supply, so it is computed here rather than assumed. Current density, coating efficiency, and the anode's own consumption rate and output are ENTERED, because they depend on soil resistivity, moisture, temperature, coating type and condition, and the anode bed design. This does not design the ground bed or its resistance, size the rectifier's voltage, evaluate interference with foreign structures, address stray current or AC corrosion, or set the protection criteria themselves. NACE / AMPP practice, a close-interval potential survey, and a qualified corrosion engineer govern.",
  };
}
export const cathodicAnodeCountLifeExample = { inputs: { od_in: 12.75, length_mi: 42, coating_efficiency_pct: 99.9, current_density_ma_per_ft2: 1.5, anode_weight_lb: 50, consumption_lb_per_a_yr: 1.0, utilization: 0.85, current_per_anode_a: 3, degraded_efficiency_pct: 99, target_life_years: 20 } };
OILGAS_RENDERERS["cathodic-anode-count-life"] = _simpleRenderer({
  citation: "Citation: the cathodic protection current balance as NACE / AMPP practice writes it -- required current = bare surface area x current density, bare area = total area x (1 - coating efficiency), anode count = required current / current per anode, and anode life = weight x utilization / (consumption rate x current). Current density, coating efficiency, and the anode's consumption rate and output are ENTERED, because they depend on soil resistivity, moisture, temperature, coating type and condition, and the bed design. It does not design the ground bed or its resistance, size the rectifier voltage, evaluate interference with foreign structures, address stray current or AC corrosion, or set the protection criteria. A close-interval potential survey and a qualified corrosion engineer govern.",
  example: cathodicAnodeCountLifeExample.inputs,
  fields: [
    { key: "od_in", label: "Pipe outside diameter (in)", kind: "number" },
    { key: "length_mi", label: "Length (miles)", kind: "number" },
    { key: "coating_efficiency_pct", label: "Coating efficiency (%)", kind: "number", attrs: { step: "any" } },
    { key: "current_density_ma_per_ft2", label: "Current density (mA per sq ft of bare steel)", kind: "number" },
    { key: "anode_weight_lb", label: "Anode net weight (lb, 0 to skip life)", kind: "number" },
    { key: "consumption_lb_per_a_yr", label: "Consumption rate (lb per A-year)", kind: "number" },
    { key: "utilization", label: "Utilization factor (0-1)", kind: "number", default: 0.85 },
    { key: "current_per_anode_a", label: "Current output per anode (A, 0 to skip count)", kind: "number" },
    { key: "degraded_efficiency_pct", label: "Degraded coating efficiency (%, 0 to skip)", kind: "number", attrs: { step: "any" } },
    { key: "target_life_years", label: "Target system life (years, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "a", id: "cac-out-a", label: "Surface area", value: (r) => fmt(r.total_area_ft2, 0) + " sq ft total, " + fmt(r.bare_area_ft2, 0) + " sq ft bare" },
    { key: "i", id: "cac-out-i", label: "Current required", value: (r) => fmt(r.current_required_a, 2) + " A" },
    { key: "c", id: "cac-out-c", label: "Anodes", value: (r) => !r.has_anode_output ? "(no current per anode entered)" : fmt(r.anode_count, 0) + " anode" + (r.anode_count === 1 ? "" : "s") },
    { key: "l", id: "cac-out-l", label: "Anode life", value: (r) => r.life_verdict },
    { key: "m", id: "cac-out-m", label: "Mass for the target life", value: (r) => !r.has_target_life ? "(no target life entered)" : fmt(r.mass_for_target_lb, 0) + " lb of anode total" },
    { key: "d", id: "cac-out-d", label: "If the coating degrades", value: (r) => r.degraded_verdict },
    { key: "n", id: "cac-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCathodicAnodeCountLife,
});

// =====================================================================
// spec-v1529: Corroded pipe remaining strength (ASME B31G).
// =====================================================================
//
// spec-v1529 does two things this does not. It says a defect whose SAFE
// pressure is 1,328 psi "evaluates comfortably above" a 1,468 psig MAOP -- it
// is 140 psi BELOW it -- and it applies the parabolic Folias form to a 20 in
// defect whose A of 10.0 is far outside that form's validity. Both verdicts
// here are computed: the branch from A, and the acceptance from P_safe.
// dims: in { od_in: L, wall_in: L, smys_psi: M L^-1 T^-2, defect_depth_in: L, defect_length_in: L, safety_factor: dimensionless, maop_psig: M L^-1 T^-2 } out: { depth_pct: dimensionless, folias_m: dimensionless, a_parameter: dimensionless, failure_pressure_psi: M L^-1 T^-2, safe_pressure_psi: M L^-1 T^-2, margin_psi: M L^-1 T^-2 }
export function computeCorrodedPipeB31g({
  od_in = 0, wall_in = 0, smys_psi = 0, defect_depth_in = 0, defect_length_in = 0,
  safety_factor = 1.39, maop_psig = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(od_in > 0)) return { error: "Outside diameter must be positive (in)." };
  if (!(wall_in > 0)) return { error: "Nominal wall thickness must be positive (in)." };
  if (!(smys_psi > 0)) return { error: "Specified minimum yield strength must be positive (psi)." };
  if (!(defect_depth_in > 0)) return { error: "Defect depth must be positive (in)." };
  if (!(defect_length_in > 0)) return { error: "Defect axial length must be positive (in)." };
  if (!(defect_depth_in < wall_in)) return { error: "Defect depth must be less than the wall thickness -- a through-wall defect is a leak, not a screening case." };
  if (!(safety_factor > 0)) return { error: "Safety factor must be positive." };
  if (maop_psig < 0) return { error: "MAOP cannot be negative (psig)." };
  const depth_ratio = defect_depth_in / wall_in;
  const depth_pct = depth_ratio * 100;
  // The screening limit comes first: past 80 percent of wall, B31G does not
  // evaluate the defect at all.
  const over_depth_limit = depth_ratio > _OG_B31G_MAX_DEPTH_FRACTION;
  const flow_stress_psi = _OG_B31G_FLOW_STRESS_FACTOR * smys_psi;
  const hoop_term = 2 * wall_in / od_in;
  // A selects the branch. At or below 4.0 the parabolic (Folias) form applies;
  // above it the RECTANGULAR form, which carries no bulging factor at all.
  const a_parameter = _OG_B31G_A_COEFF * defect_length_in / Math.sqrt(od_in * wall_in);
  const is_parabolic = a_parameter <= _OG_B31G_A_LIMIT;
  const folias_m = Math.sqrt(1 + _OG_B31G_FOLIAS_COEFF * defect_length_in * defect_length_in / (od_in * wall_in));
  const two_thirds_depth = 2 / 3 * depth_ratio;
  const failure_pressure_psi = is_parabolic
    ? flow_stress_psi * hoop_term * (1 - two_thirds_depth) / (1 - two_thirds_depth / folias_m)
    : flow_stress_psi * hoop_term * (1 - depth_ratio);
  const safe_pressure_psi = failure_pressure_psi / safety_factor;
  const branch_label = is_parabolic
    ? "PARABOLIC (Folias) form, A = " + fmt(a_parameter, 2) + " at or below the 4.0 limit, bulging factor M = " + fmt(folias_m, 3)
    : "RECTANGULAR form, A = " + fmt(a_parameter, 2) + " ABOVE the 4.0 limit -- the parabolic profile and its bulging factor do not apply to a defect this long, and using them here overstates the remaining strength";
  // The acceptance verdict, driven off the SAFE pressure against MAOP. This
  // is the comparison that governs; the failure pressure alone always looks
  // better and comparing against it is how a condemned joint reads as fine.
  const has_maop = maop_psig > 0;
  const margin_psi = has_maop ? safe_pressure_psi - maop_psig : 0;
  const acceptable = has_maop && !over_depth_limit && safe_pressure_psi >= maop_psig;
  const verdict = over_depth_limit
    ? "UNACCEPTABLE regardless of length: the metal loss is " + fmt(depth_pct, 1) + "% of wall, past B31G's 80% screening limit, and the criterion does not evaluate it"
    : !has_maop
      ? "(no MAOP entered to evaluate against)"
      : acceptable
        ? "ACCEPTABLE at this MAOP: the safe pressure of " + fmt(safe_pressure_psi, 0) + " psi exceeds the " + fmt(maop_psig, 0) + " psig MAOP by " + fmt(margin_psi, 0) + " psi"
        : "REPAIR OR RE-EVALUATE: the safe pressure of " + fmt(safe_pressure_psi, 0) + " psi is " + fmt(-margin_psi, 0) + " psi BELOW the " + fmt(maop_psig, 0) + " psig MAOP -- the predicted failure pressure of " + fmt(failure_pressure_psi, 0) + " psi is above MAOP, but the safety factor is what makes this a criterion and the safe pressure is what governs";
  if (![depth_pct, folias_m, a_parameter, failure_pressure_psi, safe_pressure_psi, margin_psi].every(Number.isFinite)) return { error: "B31G math is not a finite value." };
  return {
    depth_ratio, depth_pct, over_depth_limit, flow_stress_psi,
    a_parameter, is_parabolic, folias_m, branch_label,
    failure_pressure_psi, safe_pressure_psi, safety_factor,
    has_maop, margin_psi, acceptable, verdict,
    note: "The remaining strength of a corroded pipeline by the original ASME B31G criterion, and whether it still supports the line's operating pressure. The criterion says a corroded area behaves like a blunt flaw whose severity depends on how deep it is relative to the wall AND how long it is relative to the pipe's ability to bulge around it. Depth alone is not the answer: a deep short pit can be tolerable while a shallower but much longer groove is not, because the bulging factor grows with length and drives the failure pressure down. That is the single most useful thing to know when reading an inline inspection report, and it is why anomalies are ranked by predicted failure pressure rather than by depth. Two things here are easy to get wrong and are therefore computed rather than left to the reader. The first is the BRANCH: B31G is a two-part criterion, and the parabolic form with its Folias bulging factor applies only while A = 0.893 L / sqrt(D t) is at or below 4.0. Past that the defect is treated as a full rectangular loss with no bulging factor at all, and carrying the parabolic form beyond its range overstates the remaining strength on exactly the long defects that matter most. The second is WHICH PRESSURE the acceptance is read against: the predicted failure pressure is not the criterion, the safe pressure after the safety factor is, and a defect whose failure pressure sits above MAOP can still fail the screen once the factor is applied. The original B31G is deliberately conservative -- it assumes a parabolic profile and a 1.1 flow stress -- and Modified B31G and RSTRENG use a more realistic effective area and typically permit higher pressures on the same defect. That conservatism is a feature when screening hundreds of anomalies and a cost when it condemns a joint unnecessarily, which is why a defect failing this is normally re-evaluated by RSTRENG with the detailed river-bottom profile before anyone digs. This screens a single area of general metal loss on nominal wall: it does not evaluate cracks, gouges, dents, seam or girth weld anomalies, interacting defects, or corrosion under external loading, and it is not a fitness-for-service assessment. ASME B31G, the operator's integrity management program, and a qualified engineer govern.",
  };
}
export const corrodedPipeB31gExample = { inputs: { od_in: 12.75, wall_in: 0.25, smys_psi: 52000, defect_depth_in: 0.105, defect_length_in: 4.0, safety_factor: 1.39, maop_psig: 1468 } };
OILGAS_RENDERERS["corroded-pipe-b31g"] = _simpleRenderer({
  citation: "Citation: the original ASME B31G criterion by name -- flow stress 1.1 x SMYS, A = 0.893 L / sqrt(D t) selecting the branch, the parabolic form P = S_flow (2t/D) [1 - (2/3)(d/t)] / [1 - (2/3)(d/t)/M] with M = sqrt(1 + 0.8 L^2/(D t)) at A at or below 4.0, the rectangular form P = S_flow (2t/D)(1 - d/t) above it, and the 80% of wall screening limit. The safe pressure is the predicted failure pressure divided by the ENTERED safety factor, and acceptance is read against the SAFE pressure. It screens a single area of general metal loss on nominal wall; it does not evaluate cracks, gouges, dents, seam or girth weld anomalies, interacting defects, or external loading, and it is not a fitness-for-service assessment. Modified B31G and RSTRENG typically permit more on the same defect. ASME B31G and a qualified engineer govern.",
  example: corrodedPipeB31gExample.inputs,
  fields: [
    { key: "od_in", label: "Pipe outside diameter (in)", kind: "number" },
    { key: "wall_in", label: "Nominal wall thickness (in)", kind: "number" },
    { key: "smys_psi", label: "Specified minimum yield strength SMYS (psi)", kind: "number" },
    { key: "defect_depth_in", label: "Maximum metal loss depth (in)", kind: "number" },
    { key: "defect_length_in", label: "Defect axial length (in)", kind: "number" },
    { key: "safety_factor", label: "Safety factor", kind: "number", default: 1.39 },
    { key: "maop_psig", label: "MAOP (psig, 0 to skip the verdict)", kind: "number" },
  ],
  outputs: [
    { key: "d", id: "cpb-out-d", label: "Depth", value: (r) => fmt(r.depth_pct, 1) + "% of wall" + (r.over_depth_limit ? " -- past the 80% screening limit" : "") },
    { key: "b", id: "cpb-out-b", label: "Which B31G branch", value: (r) => r.branch_label },
    { key: "f", id: "cpb-out-f", label: "Predicted failure pressure", value: (r) => fmt(r.failure_pressure_psi, 0) + " psi at a flow stress of " + fmt(r.flow_stress_psi, 0) + " psi" },
    { key: "s", id: "cpb-out-s", label: "Safe operating pressure", value: (r) => fmt(r.safe_pressure_psi, 0) + " psi at a safety factor of " + fmt(r.safety_factor, 2) },
    { key: "v", id: "cpb-out-v", label: "Verdict", value: (r) => r.verdict },
    { key: "n", id: "cpb-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCorrodedPipeB31g,
});

// =====================================================================
// spec-v1530: Well casing and annulus cement volume.
// =====================================================================
//
// The annulus is a difference of SQUARES, which is why it is far more
// sensitive to hole size than to casing size, and why an oversized or
// washed-out hole eats cement fast.
// dims: in { hole_dia_in: L, casing_od_in: L, casing_id_in: L, cement_column_ft: L, excess_pct: dimensionless, float_collar_ft: L, slurry_yield_ft3_per_sack: L^3, low_excess_pct: dimensionless, high_excess_pct: dimensionless } out: { annular_capacity_bbl_ft: L^2, casing_capacity_bbl_ft: L^2, annular_volume_bbl: L^3, slurry_volume_bbl: L^3, sacks: dimensionless, displacement_bbl: L^3, excess_spread_bbl: L^3 }
export function computeCasingCementVolume({
  hole_dia_in = 0, casing_od_in = 0, casing_id_in = 0, cement_column_ft = 0,
  excess_pct = 0, float_collar_ft = 0, slurry_yield_ft3_per_sack = 0,
  low_excess_pct = 0, high_excess_pct = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(hole_dia_in > 0)) return { error: "Hole diameter must be positive (in)." };
  if (!(casing_od_in > 0)) return { error: "Casing outside diameter must be positive (in)." };
  if (!(casing_od_in < hole_dia_in)) return { error: "Casing outside diameter must be smaller than the hole -- there is no annulus otherwise." };
  if (!(casing_id_in > 0 && casing_id_in < casing_od_in)) return { error: "Casing inside diameter must be positive and smaller than its outside diameter." };
  if (!(cement_column_ft > 0)) return { error: "Cement column length must be positive (ft)." };
  if (excess_pct < 0) return { error: "Excess cannot be negative (%)." };
  if (float_collar_ft < 0) return { error: "Depth to the float collar cannot be negative (ft)." };
  if (slurry_yield_ft3_per_sack < 0) return { error: "Slurry yield cannot be negative (cu ft per sack)." };
  if (low_excess_pct < 0 || high_excess_pct < 0) return { error: "Excess comparison values cannot be negative (%)." };
  // The oilfield capacity constant, 1029.4, turns square inches over a foot
  // into barrels. Once it is in hand the whole job is arithmetic.
  const annular_capacity_bbl_ft = (hole_dia_in * hole_dia_in - casing_od_in * casing_od_in) / _OG_ANNULAR_BBL_CONST;
  const casing_capacity_bbl_ft = casing_id_in * casing_id_in / _OG_ANNULAR_BBL_CONST;
  const annular_volume_bbl = annular_capacity_bbl_ft * cement_column_ft;
  const slurry_volume_bbl = annular_volume_bbl * (1 + excess_pct / 100);
  const slurry_volume_ft3 = slurry_volume_bbl * _OG_CUFT_PER_BBL;
  const has_yield = slurry_yield_ft3_per_sack > 0;
  const sacks = has_yield ? Math.ceil(slurry_volume_ft3 / slurry_yield_ft3_per_sack) : 0;
  // Displacement is the casing capacity to the float, and getting it wrong is
  // the more dangerous error in either direction.
  const has_float = float_collar_ft > 0;
  const displacement_bbl = has_float ? casing_capacity_bbl_ft * float_collar_ft : 0;
  // The excess sensitivity, which is what a caliper log buys.
  const has_spread = low_excess_pct > 0 && high_excess_pct > low_excess_pct;
  const low_slurry_bbl = has_spread ? annular_volume_bbl * (1 + low_excess_pct / 100) : 0;
  const high_slurry_bbl = has_spread ? annular_volume_bbl * (1 + high_excess_pct / 100) : 0;
  const excess_spread_bbl = high_slurry_bbl - low_slurry_bbl;
  const spread_column_ft = has_spread && annular_capacity_bbl_ft > 0 ? excess_spread_bbl / annular_capacity_bbl_ft : 0;
  const spread_verdict = !has_spread
    ? "(no excess range entered)"
    : "between " + fmt(low_excess_pct, 0) + "% and " + fmt(high_excess_pct, 0) + "% excess the slurry runs " + fmt(low_slurry_bbl, 1) + " to " + fmt(high_slurry_bbl, 1) + " bbl, a " + fmt(excess_spread_bbl, 1) + " bbl spread on the same hole -- which at the top of the column is " + fmt(spread_column_ft, 0) + " ft of cement either way, and is why the caliper matters more than the arithmetic does";
  if (![annular_capacity_bbl_ft, casing_capacity_bbl_ft, annular_volume_bbl, slurry_volume_bbl, sacks, displacement_bbl, excess_spread_bbl].every(Number.isFinite)) return { error: "Cement volume math is not a finite value." };
  return {
    annular_capacity_bbl_ft, casing_capacity_bbl_ft,
    annular_volume_bbl, slurry_volume_bbl, slurry_volume_ft3, has_yield, sacks,
    has_float, displacement_bbl,
    has_spread, low_slurry_bbl, high_slurry_bbl, excess_spread_bbl, spread_column_ft, spread_verdict,
    note: "The slurry a casing cement job takes and the mud that displaces it, from the oilfield capacity constant. Square inches of area over a foot of length is barrels divided by 1029.4, and once that is in hand the whole job is arithmetic: annulus capacity times the column height gives the slurry, casing capacity to the float collar gives the displacement. The annulus is a difference of SQUARES, which means it is far more sensitive to hole size than to casing size and is why an oversized or washed-out hole eats cement fast. Excess is where the honesty lives. A gauge hole needs little; a washed-out shale section can need double, and the spread between a reasonable low and high assumption is reported here in barrels and in feet of column, because that spread is the actual uncertainty in where the top of cement lands. A caliper log turns excess from a guess into a measurement, and running one before a critical job is the difference between hitting the planned top of cement and finding out later from a bond log. Getting the DISPLACEMENT wrong is the more dangerous error and it fails in both directions: over-displacing pumps cement past the float and back up the annulus from the wrong end, and under-displacing leaves cement inside the casing to drill out. Neither is recoverable cheaply, which is why the displacement is computed from the casing's own inside diameter and the measured depth to the float rather than estimated. Capacities assume a clean concentric annulus and a gauge hole apart from the entered excess; a real hole is neither. This does not design the slurry, its density, thickening time or free water, evaluate centralisation and mud removal -- which decide whether the cement actually bonds -- account for compressibility or losses to the formation, or address stage tools and multi-stage jobs. The cementing program, the service company's job design, and the well engineer govern.",
  };
}
export const casingCementVolumeExample = { inputs: { hole_dia_in: 12.25, casing_od_in: 9.625, casing_id_in: 8.535, cement_column_ft: 4200, excess_pct: 35, float_collar_ft: 4160, slurry_yield_ft3_per_sack: 1.18, low_excess_pct: 25, high_excess_pct: 60 } };
OILGAS_RENDERERS["casing-cement-volume"] = _simpleRenderer({
  citation: "Citation: the oilfield capacity relations as every well-control manual writes them -- annular capacity bbl/ft = (D_hole^2 - D_casing^2) / 1029.4, pipe capacity bbl/ft = ID^2 / 1029.4 -- with slurry = annular volume x (1 + excess) and displacement = casing capacity x depth to the float collar. Barrels convert at 42 gallons of 231 cubic inches, exact by definition. Excess and slurry yield are ENTERED; a caliper log is what turns excess from a guess into a measurement. It does not design the slurry, evaluate centralisation and mud removal, account for losses to the formation, or address stage tools. The cementing program and the well engineer govern.",
  example: casingCementVolumeExample.inputs,
  fields: [
    { key: "hole_dia_in", label: "Hole diameter (in)", kind: "number" },
    { key: "casing_od_in", label: "Casing outside diameter (in)", kind: "number" },
    { key: "casing_id_in", label: "Casing inside diameter (in)", kind: "number" },
    { key: "cement_column_ft", label: "Cement column length (ft)", kind: "number" },
    { key: "excess_pct", label: "Excess over theoretical (%)", kind: "number" },
    { key: "float_collar_ft", label: "Depth to the float collar (ft, 0 to skip)", kind: "number" },
    { key: "slurry_yield_ft3_per_sack", label: "Slurry yield (cu ft per sack, 0 to skip)", kind: "number" },
    { key: "low_excess_pct", label: "Low excess for the spread (%, 0 to skip)", kind: "number" },
    { key: "high_excess_pct", label: "High excess for the spread (%)", kind: "number" },
  ],
  outputs: [
    { key: "c", id: "ccv-out-c", label: "Capacities", value: (r) => fmt(r.annular_capacity_bbl_ft, 4) + " bbl/ft annulus, " + fmt(r.casing_capacity_bbl_ft, 4) + " bbl/ft casing" },
    { key: "a", id: "ccv-out-a", label: "Annular volume", value: (r) => fmt(r.annular_volume_bbl, 1) + " bbl theoretical" },
    { key: "s", id: "ccv-out-s", label: "Slurry with excess", value: (r) => fmt(r.slurry_volume_bbl, 1) + " bbl (" + fmt(r.slurry_volume_ft3, 0) + " cu ft)" + (r.has_yield ? ", " + fmt(r.sacks, 0) + " sacks at the entered yield" : "") },
    { key: "d", id: "ccv-out-d", label: "Displacement", value: (r) => !r.has_float ? "(no float collar depth entered)" : fmt(r.displacement_bbl, 1) + " bbl to the float" },
    { key: "e", id: "ccv-out-e", label: "Excess sensitivity", value: (r) => r.spread_verdict },
    { key: "n", id: "ccv-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeCasingCementVolume,
});

// =====================================================================
// spec-v1531: Drilling mud weight and hydrostatic pressure.
// =====================================================================
//
// Pressure comes from the VERTICAL height of fluid, so a crew that reaches for
// measured depth on a deviated well believes it has overbalance it does not
// have. That error is computed here rather than warned about.
// dims: in { mud_weight_ppg: M L^-3, tvd_ft: L, measured_depth_ft: L, formation_pressure_psi: M L^-1 T^-2 } out: { gradient_psi_ft: M L^-2 T^-2, hydrostatic_psi: M L^-1 T^-2, overbalance_psi: M L^-1 T^-2, formation_emw_ppg: M L^-3, md_hydrostatic_psi: M L^-1 T^-2, md_error_psi: M L^-1 T^-2 }
export function computeMudHydrostaticPressure({
  mud_weight_ppg = 0, tvd_ft = 0, measured_depth_ft = 0, formation_pressure_psi = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(mud_weight_ppg > 0)) return { error: "Mud weight must be positive (ppg)." };
  if (!(tvd_ft > 0)) return { error: "True vertical depth must be positive (ft)." };
  if (measured_depth_ft < 0) return { error: "Measured depth cannot be negative (ft)." };
  if (measured_depth_ft > 0 && measured_depth_ft < tvd_ft) return { error: "Measured depth cannot be less than true vertical depth." };
  if (formation_pressure_psi < 0) return { error: "Formation pressure cannot be negative (psi)." };
  const gradient_psi_ft = _OG_MUD_GRADIENT_CONST * mud_weight_ppg;
  const hydrostatic_psi = gradient_psi_ft * tvd_ft;
  // Overbalance, with the SIGN driven off a boolean rather than off a minus.
  const has_formation = formation_pressure_psi > 0;
  const overbalance_psi = has_formation ? hydrostatic_psi - formation_pressure_psi : 0;
  const is_overbalanced = has_formation && overbalance_psi > 0;
  const formation_emw_ppg = has_formation ? formation_pressure_psi / (_OG_MUD_GRADIENT_CONST * tvd_ft) : 0;
  const balance_verdict = !has_formation
    ? "(no formation pressure entered)"
    : is_overbalanced
      ? "OVERBALANCED by " + fmt(overbalance_psi, 0) + " psi -- the well is static; in mud weight terms the formation is " + fmt(formation_emw_ppg, 2) + " ppg equivalent against " + fmt(mud_weight_ppg, 2) + " ppg in the hole"
      : overbalance_psi < 0
        ? "UNDERBALANCED by " + fmt(-overbalance_psi, 0) + " psi -- the well will flow; the formation is " + fmt(formation_emw_ppg, 2) + " ppg equivalent against " + fmt(mud_weight_ppg, 2) + " ppg in the hole"
        : "exactly balanced at " + fmt(formation_emw_ppg, 2) + " ppg equivalent";
  // The error this exists to prevent, as a number.
  const has_md = measured_depth_ft > tvd_ft;
  const md_hydrostatic_psi = has_md ? gradient_psi_ft * measured_depth_ft : 0;
  const md_error_psi = has_md ? md_hydrostatic_psi - hydrostatic_psi : 0;
  const md_apparent_overbalance_psi = has_md && has_formation ? md_hydrostatic_psi - formation_pressure_psi : 0;
  const md_verdict = !has_md
    ? "(no measured depth entered, or it equals the true vertical depth)"
    : "using the " + fmt(measured_depth_ft, 0) + " ft measured depth instead of the " + fmt(tvd_ft, 0) + " ft true vertical gives " + fmt(md_hydrostatic_psi, 0) + " psi -- " + fmt(md_error_psi, 0) + " psi of pressure that is not there" + (has_formation ? ", so a crew reading it believes it has " + fmt(md_apparent_overbalance_psi, 0) + " psi of overbalance when it has " + fmt(overbalance_psi, 0) : "");
  if (![gradient_psi_ft, hydrostatic_psi, overbalance_psi, formation_emw_ppg, md_hydrostatic_psi, md_error_psi].every(Number.isFinite)) return { error: "Hydrostatic math is not a finite value." };
  return {
    gradient_psi_ft, hydrostatic_psi,
    has_formation, overbalance_psi, is_overbalanced, formation_emw_ppg, balance_verdict,
    has_md, md_hydrostatic_psi, md_error_psi, md_apparent_overbalance_psi, md_verdict,
    note: "The hydrostatic pressure a mud column exerts, and the overbalance it holds against a formation. The 0.052 constant is only unit conversion -- a pound per gallon over a foot of vertical column is 0.052 psi -- but the depth it multiplies is the entire point. Pressure comes from the VERTICAL height of fluid, so a well drilled to twelve thousand feet of measured depth that is only nine thousand eight hundred feet true vertical has the hydrostatic of nine thousand eight hundred, and a crew that reaches for the measured depth believes it has hundreds of psi more overbalance than it does. On a high-angle or horizontal well that gap is enormous, and it is computed here rather than warned about, because the difference between a warning and a number is whether anyone acts on it. Everything in well control is built on this one line. Formation pressure expressed as an equivalent mud weight, kick tolerance, the kill sheet, leak-off test results and equivalent circulating density are all this relation rearranged. Getting the sense of the comparison right is the whole job: hydrostatic above formation pressure is overbalance and the well is static, below it and the well flows -- so the verdict here is driven off a boolean the calculation returns rather than off the sign of a subtraction, which is a thing people misread. This is the STATIC column only. It does not include the annular friction that raises bottom-hole pressure while circulating, which is the equivalent circulating density, nor the surge and swab pressures from moving pipe, nor any cuttings loading, gas cutting, or temperature and compressibility effect on mud density downhole. It does not evaluate the fracture gradient, so it cannot tell you whether a weight the formation will hold is a weight the shoe will hold. The well's own pressure data, the leak-off or formation integrity test, the drilling program, and a qualified well-control supervisor govern.",
  };
}
export const mudHydrostaticPressureExample = { inputs: { mud_weight_ppg: 12.5, tvd_ft: 9800, measured_depth_ft: 12000, formation_pressure_psi: 6100 } };
OILGAS_RENDERERS["mud-hydrostatic-pressure"] = _simpleRenderer({
  citation: "Citation: the mud hydrostatic relation as every well-control manual writes it -- P = 0.052 x mud weight x TRUE VERTICAL depth, gradient = 0.052 x mud weight, and equivalent mud weight = P / (0.052 x TVD), where 0.052 is the pounds-per-gallon-per-foot to psi conversion (exactly 0.0519481). The STATIC column only: it excludes equivalent circulating density, surge and swab, cuttings loading, gas cutting, and downhole temperature and compressibility effects on density, and it does not evaluate the fracture gradient. The well's pressure data, the leak-off test, the drilling program, and a qualified well-control supervisor govern.",
  example: mudHydrostaticPressureExample.inputs,
  fields: [
    { key: "mud_weight_ppg", label: "Mud weight (ppg)", kind: "number" },
    { key: "tvd_ft", label: "True vertical depth (ft)", kind: "number" },
    { key: "measured_depth_ft", label: "Measured depth (ft, 0 to skip the comparison)", kind: "number" },
    { key: "formation_pressure_psi", label: "Formation pressure (psi, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "g", id: "mhp-out-g", label: "Mud gradient", value: (r) => fmt(r.gradient_psi_ft, 4) + " psi per ft" },
    { key: "h", id: "mhp-out-h", label: "Hydrostatic at TVD", value: (r) => fmt(r.hydrostatic_psi, 0) + " psi" },
    { key: "b", id: "mhp-out-b", label: "Against the formation", value: (r) => r.balance_verdict },
    { key: "m", id: "mhp-out-m", label: "If measured depth were used", value: (r) => r.md_verdict },
    { key: "n", id: "mhp-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeMudHydrostaticPressure,
});

// =====================================================================
// spec-v1532: Well control kill mud weight and circulating pressure.
// =====================================================================
//
// spec-v1532 says "weight up to 13.2 ppg" for a kill weight of 13.25, and
// then describes ROUNDING UP to a weight BELOW the one it just computed,
// arriving at a negative number it calls extra pressure. Rounding a kill
// weight DOWN leaves the well underbalanced, so the rounded weight here is an
// input and the verdict on it is driven off a boolean.
// dims: in { original_mw_ppg: M L^-3, tvd_ft: L, sidpp_psi: M L^-1 T^-2, scr_pressure_psi: M L^-1 T^-2, safety_margin_ppg: M L^-3, rounded_mw_ppg: M L^-3, drillpipe_capacity_bbl_ft: L^2, measured_depth_ft: L, pump_output_bbl_stroke: L^3, pump_spm: T^-1 } out: { kill_mw_ppg: M L^-3, formation_pressure_psi: M L^-1 T^-2, icp_psi: M L^-1 T^-2, fcp_psi: M L^-1 T^-2, strokes_to_bit: dimensionless, minutes_to_bit: T, rounded_bhp_change_psi: M L^-1 T^-2 }
export function computeKillMudWeight({
  original_mw_ppg = 0, tvd_ft = 0, sidpp_psi = 0, scr_pressure_psi = 0,
  safety_margin_ppg = 0, rounded_mw_ppg = 0,
  drillpipe_capacity_bbl_ft = 0, measured_depth_ft = 0, pump_output_bbl_stroke = 0, pump_spm = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(original_mw_ppg > 0)) return { error: "Original mud weight must be positive (ppg)." };
  if (!(tvd_ft > 0)) return { error: "True vertical depth must be positive (ft)." };
  if (sidpp_psi < 0) return { error: "Shut-in drillpipe pressure cannot be negative (psi)." };
  if (scr_pressure_psi < 0) return { error: "Slow circulating rate pressure cannot be negative (psi)." };
  if (safety_margin_ppg < 0) return { error: "The kill-weight safety margin cannot be negative (ppg) -- a negative margin is an underbalanced well." };
  if (rounded_mw_ppg < 0) return { error: "The rounded mud weight cannot be negative (ppg)." };
  if (drillpipe_capacity_bbl_ft < 0 || measured_depth_ft < 0 || pump_output_bbl_stroke < 0 || pump_spm < 0) return { error: "Pipe capacity, depth, pump output, and rate cannot be negative." };
  // Shut-in drillpipe pressure is the amount by which formation pressure
  // exceeds the hydrostatic already in the hole, read at surface.
  const original_hydrostatic_psi = _OG_MUD_GRADIENT_CONST * original_mw_ppg * tvd_ft;
  const formation_pressure_psi = sidpp_psi + original_hydrostatic_psi;
  const kill_mw_ppg = original_mw_ppg + sidpp_psi / (_OG_MUD_GRADIENT_CONST * tvd_ft);
  const kill_mw_with_margin_ppg = kill_mw_ppg + safety_margin_ppg;
  const weight_up_ppg = kill_mw_ppg - original_mw_ppg;
  // Circulating pressures. FCP scales with the density ratio, because a
  // heavier mud takes proportionally more pressure to circulate.
  const icp_psi = sidpp_psi + scr_pressure_psi;
  const fcp_psi = scr_pressure_psi * (kill_mw_with_margin_ppg / original_mw_ppg);
  // Strokes and time to the bit, gated on the pump data.
  const has_pump = drillpipe_capacity_bbl_ft > 0 && measured_depth_ft > 0 && pump_output_bbl_stroke > 0;
  const drillpipe_volume_bbl = has_pump ? drillpipe_capacity_bbl_ft * measured_depth_ft : 0;
  const strokes_to_bit = has_pump ? drillpipe_volume_bbl / pump_output_bbl_stroke : 0;
  const minutes_to_bit = has_pump && pump_spm > 0 ? strokes_to_bit / pump_spm : 0;
  // The rounding check. A kill weight rounded DOWN is an underbalanced well,
  // and the direction is reported as a verdict rather than as a signed number.
  const has_rounded = rounded_mw_ppg > 0;
  const rounded_bhp_change_psi = has_rounded ? _OG_MUD_GRADIENT_CONST * (rounded_mw_ppg - kill_mw_with_margin_ppg) * tvd_ft : 0;
  const rounded_is_below = has_rounded && rounded_mw_ppg < kill_mw_with_margin_ppg;
  const rounding_verdict = !has_rounded
    ? "(no rounded mud weight entered)"
    : rounded_is_below
      ? "ROUNDED DOWN: " + fmt(rounded_mw_ppg, 2) + " ppg is BELOW the " + fmt(kill_mw_with_margin_ppg, 2) + " ppg required and gives up " + fmt(-rounded_bhp_change_psi, 0) + " psi of bottom-hole pressure -- the well would be underbalanced by that much and would flow again"
      : "rounded up: " + fmt(rounded_mw_ppg, 2) + " ppg adds " + fmt(rounded_bhp_change_psi, 0) + " psi of bottom-hole pressure over the required " + fmt(kill_mw_with_margin_ppg, 2) + " ppg -- check that against the fracture gradient at the shoe before pumping it, because excessive kill weight turns a kick into an underground blowout";
  if (![kill_mw_ppg, formation_pressure_psi, icp_psi, fcp_psi, strokes_to_bit, minutes_to_bit, rounded_bhp_change_psi].every(Number.isFinite)) return { error: "Kill sheet math is not a finite value." };
  return {
    original_hydrostatic_psi, formation_pressure_psi,
    kill_mw_ppg, kill_mw_with_margin_ppg, weight_up_ppg, safety_margin_ppg,
    icp_psi, fcp_psi,
    has_pump, drillpipe_volume_bbl, strokes_to_bit, minutes_to_bit,
    has_rounded, rounded_bhp_change_psi, rounded_is_below, rounding_verdict,
    note: "The kill sheet arithmetic for a shut-in well: the mud weight that balances the formation, and the drillpipe pressures to hold while circulating it. Shut-in drillpipe pressure is the amount by which formation pressure exceeds the hydrostatic already in the hole, read directly at surface through a column of clean mud. Converting that pressure back into density is the same 0.052 relation rearranged, and the result is the weight that balances the formation with no surface pressure at all. The circulating pressures follow. Initial circulating pressure is the shut-in pressure plus whatever it takes to move mud at the slow rate; final circulating pressure is the slow-rate pressure scaled by the density ratio, since a heavier mud takes proportionally more pressure to circulate. Between them the drillpipe pressure is walked down on a schedule while kill mud goes to the bit, and it is held at the final value from there until the influx is out. The rounding question is where this gets dangerous, and it is why the rounded weight is an input here rather than a note. A kill weight rounded DOWN -- to a tidier number, or to what is already mixed -- leaves the well underbalanced by the difference, and the arithmetic that looks like it adds pressure actually subtracts it. The direction is therefore reported as a verdict computed from the two weights rather than as a signed number a reader has to interpret. Rounding UP is the safe direction and it has its own limit: excessive kill weight risks fracturing the formation at the shoe and turning a kick into an underground blowout, which is a check against the fracture gradient that this does not make. This is the driller's-method kill sheet for a vertical or near-vertical well with a clean drillpipe column: it does not compute kick tolerance or the equivalent mud weight at the shoe, handle a plugged or wet-string reading, account for influx type and migration, model the annulus pressure profile or choke schedule, or address the wait-and-weight variations. The operator's well control procedures, the certified kill sheet, and a qualified well-control supervisor govern.",
  };
}
export const killMudWeightExample = { inputs: { original_mw_ppg: 12.5, tvd_ft: 9800, sidpp_psi: 380, scr_pressure_psi: 600, safety_margin_ppg: 0, rounded_mw_ppg: 13.0, drillpipe_capacity_bbl_ft: 0.01776, measured_depth_ft: 9800, pump_output_bbl_stroke: 0.117, pump_spm: 30 } };
OILGAS_RENDERERS["kill-mud-weight"] = _simpleRenderer({
  citation: "Citation: the driller's-method kill sheet as every well-control manual writes it -- kill mud weight = original weight + SIDPP / (0.052 x TVD), formation pressure = SIDPP + 0.052 x MW x TVD, initial circulating pressure = SIDPP + slow-circulating-rate pressure, and final circulating pressure = SCR pressure x (kill weight / original weight). For a vertical or near-vertical well with a clean drillpipe column: it does not compute kick tolerance or the equivalent mud weight at the shoe, handle a plugged or wet string, account for influx type and migration, model the annulus profile or choke schedule, or check the fracture gradient. The operator's well control procedures, the certified kill sheet, and a qualified well-control supervisor govern.",
  example: killMudWeightExample.inputs,
  fields: [
    { key: "original_mw_ppg", label: "Original mud weight (ppg)", kind: "number" },
    { key: "tvd_ft", label: "True vertical depth (ft)", kind: "number" },
    { key: "sidpp_psi", label: "Shut-in drillpipe pressure SIDPP (psi)", kind: "number" },
    { key: "scr_pressure_psi", label: "Slow circulating rate pressure (psi)", kind: "number" },
    { key: "safety_margin_ppg", label: "Kill-weight safety margin (ppg)", kind: "number" },
    { key: "rounded_mw_ppg", label: "Mud weight actually planned (ppg, 0 to skip)", kind: "number" },
    { key: "drillpipe_capacity_bbl_ft", label: "Drillpipe capacity (bbl/ft, 0 to skip strokes)", kind: "number" },
    { key: "measured_depth_ft", label: "Measured depth (ft)", kind: "number" },
    { key: "pump_output_bbl_stroke", label: "Pump output (bbl per stroke)", kind: "number" },
    { key: "pump_spm", label: "Pump rate (strokes per minute)", kind: "number" },
  ],
  outputs: [
    { key: "k", id: "kmw-out-k", label: "Kill mud weight", value: (r) => fmt(r.kill_mw_with_margin_ppg, 2) + " ppg" + (r.safety_margin_ppg > 0 ? " (" + fmt(r.kill_mw_ppg, 2) + " to balance plus a " + fmt(r.safety_margin_ppg, 2) + " ppg margin)" : "") + ", weighting up " + fmt(r.weight_up_ppg, 2) + " ppg" },
    { key: "f", id: "kmw-out-f", label: "Formation pressure", value: (r) => fmt(r.formation_pressure_psi, 0) + " psi" },
    { key: "p", id: "kmw-out-p", label: "Drillpipe pressures", value: (r) => "start at " + fmt(r.icp_psi, 0) + " psi (ICP), walk down to " + fmt(r.fcp_psi, 0) + " psi (FCP) as kill mud reaches the bit, then hold FCP" },
    { key: "s", id: "kmw-out-s", label: "To the bit", value: (r) => !r.has_pump ? "(no pipe capacity or pump output entered)" : fmt(r.strokes_to_bit, 0) + " strokes" + (r.minutes_to_bit > 0 ? ", " + fmt(r.minutes_to_bit, 0) + " minutes at the entered rate" : "") },
    { key: "r", id: "kmw-out-r", label: "The weight actually planned", value: (r) => r.rounding_verdict },
    { key: "n", id: "kmw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeKillMudWeight,
});

// =====================================================================
// spec-v1533: Annular velocity and hole cleaning.
// =====================================================================
//
// The number that matters is transport ratio, not velocity alone: what counts
// is how much faster the mud rises than the cuttings fall.
// dims: in { hole_dia_in: L, pipe_od_in: L, flow_gpm: L^3 T^-1, slip_velocity_ft_min: L T^-1, measured_depth_ft: L, pump_output_bbl_stroke: L^3, pump_spm: T^-1, target_velocity_ft_min: L T^-1 } out: { annular_velocity_ft_min: L T^-1, annular_capacity_bbl_ft: L^2, annular_volume_bbl: L^3, bottoms_up_strokes: dimensionless, bottoms_up_min: T, transport_ratio: dimensionless, flow_for_target_gpm: L^3 T^-1 }
export function computeAnnularVelocityCleaning({
  hole_dia_in = 0, pipe_od_in = 0, flow_gpm = 0, slip_velocity_ft_min = 0,
  measured_depth_ft = 0, pump_output_bbl_stroke = 0, pump_spm = 0, target_velocity_ft_min = 0,
} = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(hole_dia_in > 0)) return { error: "Hole diameter must be positive (in)." };
  if (!(pipe_od_in > 0)) return { error: "Pipe outside diameter must be positive (in)." };
  if (!(pipe_od_in < hole_dia_in)) return { error: "Pipe outside diameter must be smaller than the hole -- there is no annulus otherwise." };
  if (!(flow_gpm > 0)) return { error: "Flow rate must be positive (gpm)." };
  if (slip_velocity_ft_min < 0) return { error: "Slip velocity cannot be negative (ft/min)." };
  if (measured_depth_ft < 0 || pump_output_bbl_stroke < 0 || pump_spm < 0) return { error: "Depth, pump output, and rate cannot be negative." };
  if (target_velocity_ft_min < 0) return { error: "Target annular velocity cannot be negative (ft/min)." };
  // The annulus is a difference of squares, so velocity changes fast with
  // hole size: the rate that cleans a small hole is nowhere near enough in a
  // large one at the same pipe.
  const annular_area_in2 = hole_dia_in * hole_dia_in - pipe_od_in * pipe_od_in;
  const annular_velocity_ft_min = _OG_ANNULAR_VELOCITY_CONST * flow_gpm / annular_area_in2;
  const annular_capacity_bbl_ft = annular_area_in2 / _OG_ANNULAR_BBL_CONST;
  // Transport ratio: how much faster the mud rises than the cuttings fall.
  const has_slip = slip_velocity_ft_min > 0;
  const transport_ratio = has_slip ? (annular_velocity_ft_min - slip_velocity_ft_min) / annular_velocity_ft_min : 0;
  const cuttings_rise = has_slip && annular_velocity_ft_min > slip_velocity_ft_min;
  const transport_verdict = !has_slip
    ? "(no slip velocity entered)"
    : cuttings_rise
      ? "transport ratio " + fmt(transport_ratio, 2) + ": the mud rises " + fmt(annular_velocity_ft_min - slip_velocity_ft_min, 0) + " ft/min faster than the cuttings fall, so they come up"
      : "transport ratio " + fmt(transport_ratio, 2) + ": the annular velocity of " + fmt(annular_velocity_ft_min, 0) + " ft/min does NOT exceed the " + fmt(slip_velocity_ft_min, 0) + " ft/min slip velocity, so cuttings are not being transported at all";
  // Bottoms up: the number a crew actually uses.
  const has_bottoms_up = measured_depth_ft > 0;
  const annular_volume_bbl = has_bottoms_up ? annular_capacity_bbl_ft * measured_depth_ft : 0;
  const bottoms_up_strokes = has_bottoms_up && pump_output_bbl_stroke > 0 ? annular_volume_bbl / pump_output_bbl_stroke : 0;
  const bottoms_up_min = bottoms_up_strokes > 0 && pump_spm > 0 ? bottoms_up_strokes / pump_spm : 0;
  const bottoms_up_verdict = !has_bottoms_up
    ? "(no measured depth entered)"
    : fmt(annular_volume_bbl, 1) + " bbl in the annulus" + (bottoms_up_strokes > 0 ? ", " + fmt(bottoms_up_strokes, 0) + " strokes" : "") + (bottoms_up_min > 0 ? " and " + fmt(bottoms_up_min, 0) + " minutes to bottoms up" : "");
  // Inverted: the rate a target velocity needs in this annulus.
  const has_target = target_velocity_ft_min > 0;
  const flow_for_target_gpm = has_target ? target_velocity_ft_min * annular_area_in2 / _OG_ANNULAR_VELOCITY_CONST : 0;
  if (![annular_velocity_ft_min, annular_capacity_bbl_ft, annular_volume_bbl, bottoms_up_strokes, bottoms_up_min, transport_ratio, flow_for_target_gpm].every(Number.isFinite)) return { error: "Annular velocity math is not a finite value." };
  return {
    annular_area_in2, annular_velocity_ft_min, annular_capacity_bbl_ft,
    has_slip, transport_ratio, cuttings_rise, transport_verdict,
    has_bottoms_up, annular_volume_bbl, bottoms_up_strokes, bottoms_up_min, bottoms_up_verdict,
    has_target, flow_for_target_gpm,
    note: "The annular velocity a pump rate produces, whether it actually carries cuttings, and how long a bottoms-up takes. Annular velocity is flow over annular area, and because that area is a difference of SQUARES it changes fast with hole size: the same pump rate that cleans a small hole around a given pipe is nowhere near enough in a large one. That is why rate has to rise with every larger hole section, and why a washed-out interval is a cleaning problem as well as a cement problem. The number that matters is transport ratio rather than velocity alone -- what counts is how much faster the mud rises than the cuttings fall. Slip velocity depends on cutting size and density and on the mud's rheology, so a thin mud carries poorly at any rate, which is why hole cleaning is fixed with sweeps, rheology and pipe rotation as much as with flow. On a high-angle well none of this is sufficient: cuttings form a bed on the low side of the hole, and mechanical agitation from rotation is what removes them, so a horizontal section that looks clean by this arithmetic can still be packing off. That is the limit of the calculation and it is a real one. Bottoms-up time is the companion number and the one a crew actually uses: how long before what the bit is making reaches the shakers. The rate a target velocity would need is reported too, because in a large hole that rate is often more than the pumps or the motor will take, and that is the moment sweeps and rheology stop being optional. Slip velocity is ENTERED because it depends on the cuttings and the mud. This is a vertical-hole screen with a concentric annulus: it does not compute slip velocity, model cuttings beds or eccentricity on a deviated well, account for pipe rotation, evaluate equivalent circulating density or the pressure the rate costs, or address the effect of hole washout on the real annular area. The drilling program, the mud engineer, and the directional driller govern.",
  };
}
export const annularVelocityCleaningExample = { inputs: { hole_dia_in: 8.75, pipe_od_in: 5.0, flow_gpm: 420, slip_velocity_ft_min: 30, measured_depth_ft: 9800, pump_output_bbl_stroke: 0.117, pump_spm: 30, target_velocity_ft_min: 0 } };
OILGAS_RENDERERS["annular-velocity-cleaning"] = _simpleRenderer({
  citation: "Citation: the oilfield annular relations -- annular velocity ft/min = 24.5 x gpm / (D_hole^2 - D_pipe^2), annular capacity bbl/ft = (D_hole^2 - D_pipe^2) / 1029.4, transport ratio = (annular velocity - slip velocity) / annular velocity -- as every drilling and well-control manual writes them. Slip velocity is ENTERED because it depends on cutting size and density and on mud rheology. A vertical-hole screen with a concentric annulus: it does not compute slip velocity, model cuttings beds or eccentricity on a deviated well, account for pipe rotation, evaluate equivalent circulating density, or address hole washout. The drilling program, the mud engineer, and the directional driller govern.",
  example: annularVelocityCleaningExample.inputs,
  fields: [
    { key: "hole_dia_in", label: "Hole diameter (in)", kind: "number" },
    { key: "pipe_od_in", label: "Pipe or collar outside diameter (in)", kind: "number" },
    { key: "flow_gpm", label: "Flow rate (gpm)", kind: "number" },
    { key: "slip_velocity_ft_min", label: "Cutting slip velocity (ft/min, 0 to skip)", kind: "number" },
    { key: "measured_depth_ft", label: "Measured depth (ft, 0 to skip bottoms up)", kind: "number" },
    { key: "pump_output_bbl_stroke", label: "Pump output (bbl per stroke)", kind: "number" },
    { key: "pump_spm", label: "Pump rate (strokes per minute)", kind: "number" },
    { key: "target_velocity_ft_min", label: "Target annular velocity (ft/min, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "v", id: "avc-out-v", label: "Annular velocity", value: (r) => fmt(r.annular_velocity_ft_min, 0) + " ft/min across " + fmt(r.annular_area_in2, 2) + " sq in of annulus" },
    { key: "t", id: "avc-out-t", label: "Cuttings transport", value: (r) => r.transport_verdict },
    { key: "c", id: "avc-out-c", label: "Annular capacity", value: (r) => fmt(r.annular_capacity_bbl_ft, 4) + " bbl/ft" },
    { key: "b", id: "avc-out-b", label: "Bottoms up", value: (r) => r.bottoms_up_verdict },
    { key: "f", id: "avc-out-f", label: "Flow for the target velocity", value: (r) => !r.has_target ? "(no target velocity entered)" : fmt(r.flow_for_target_gpm, 0) + " gpm -- which may be more than the pumps or the motor will take" },
    { key: "n", id: "avc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAnnularVelocityCleaning,
});
