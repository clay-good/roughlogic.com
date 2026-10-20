// Group E: accessibility and floodplain compliance checks.
//
// Split intact from calc-construction.js by spec-v1993: the spec-v1159
// through spec-v1183 band (2010 ADA Standards checks and the two NFIP
// floodplain checks that landed with it). Calculator IDs, formulas, fields,
// outputs, citations, examples, and Group E assignments are unchanged.

import {
  DEBOUNCE_MS as _DC, debounce as _debC, makeNumber as _mnC, makeSelect as _msC,
  makeOutputLine as _moC, attachExampleButton as _aeC, fmt,
  makeStepsPanel,
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
    const _steps = makeStepsPanel(outputRegion);
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
        else if (f.blankUndefined && fields[f.key].input.value === "") params[f.key] = undefined;
        // A field marked `required` passes null when blank, so the compute can
        // tell a cleared temperature from a typed 0.
        else params[f.key] = f.required && fields[f.key].input.value === "" ? null : Number(fields[f.key].input.value) || 0;
      }
      const r = spec.compute(params); _steps.update(spec.fields, params, r);
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
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind ?? "number", options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? (f.kind && f.kind !== "number" ? null : { step: "any", min: "0" }) })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return _rlRender;
}

export const ACCESSIBILITY_RENDERERS = {};

// ===================== spec-v1159: accessible parking count (2010 ADA Standards 208.2) =====================

// Two rules, and people run the first and forget the second. Table 208.2 gives the accessible
// count from the lot total; 208.2.4 then requires one VAN space for every six or FRACTION OF
// SIX of those - so four accessible spaces still owe one van, and seven owe two.
// The table also has two branches people miss. From 501 to 1,000 it stops being a lookup and
// becomes 2 percent of the total; above 1,000 it is 20 plus one for each 100 or fraction over.
// And the count is PER PARKING FACILITY, not per site: four separate lots of 26 owe eight
// accessible spaces, while one lot of 104 owes five. Splitting a lot raises the requirement.
// dims: in { total_spaces: dimensionless, facility_count: dimensionless, provided_accessible: dimensionless, provided_van: dimensionless } out: { required_accessible: dimensionless, required_van: dimensionless, required_car: dimensionless, site_required_accessible: dimensionless, accessible_short: dimensionless, combined_required: dimensionless, site_required_van: dimensionless, site_total_spaces: dimensionless, split_penalty: dimensionless, van_short: dimensionless }
export function computeAccessibleParkingCount({ total_spaces = 0, facility_count = 1, provided_accessible = 0, provided_van = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const n = Number(total_spaces) || 0;
  const lots = Number(facility_count) || 0;
  const provA = Number(provided_accessible) || 0;
  const provV = Number(provided_van) || 0;
  if (!Number.isInteger(n) || n <= 0) return { error: "Spaces in one parking facility must be a positive whole number." };
  if (!Number.isInteger(lots) || lots <= 0) return { error: "Number of parking facilities must be a positive whole number." };
  if (!Number.isInteger(provA) || provA < 0) return { error: "Accessible spaces provided must be a whole number, zero or more." };
  if (!Number.isInteger(provV) || provV < 0) return { error: "Van spaces provided must be a whole number, zero or more." };
  if (provV > provA) return { error: "Van spaces provided cannot exceed the accessible spaces provided - a van space is one of them, not an extra." };

  const BANDS = [[25, 1], [50, 2], [75, 3], [100, 4], [150, 5], [200, 6], [300, 7], [400, 8], [500, 9]];
  let required_accessible = null, branch = "";
  let percent_raw = null;
  if (n <= 500) {
    for (const [hi, req] of BANDS) if (n <= hi) { required_accessible = req; break; }
    branch = "table lookup";
  } else if (n <= 1000) {
    percent_raw = n * 0.02;
    required_accessible = Math.ceil(percent_raw - 1e-9);
    branch = "2% of the total";
  } else {
    required_accessible = 20 + Math.ceil((n - 1000) / 100 - 1e-9);
    branch = "20 plus 1 per 100 or fraction over 1,000";
  }

  const VAN_EVERY = 6;
  const required_van = Math.ceil(required_accessible / VAN_EVERY - 1e-9);
  const required_car = required_accessible - required_van;

  const site_required_accessible = required_accessible * lots;
  const site_required_van = required_van * lots;
  const site_total_spaces = n * lots;

  // What the same total would owe if it were ONE facility instead of several.
  let combined_required = null;
  if (lots > 1) {
    const m = site_total_spaces;
    if (m <= 500) { for (const [hi, req] of BANDS) if (m <= hi) { combined_required = req; break; } }
    else if (m <= 1000) combined_required = Math.ceil(m * 0.02 - 1e-9);
    else combined_required = 20 + Math.ceil((m - 1000) / 100 - 1e-9);
  }
  const split_penalty = combined_required === null ? null : site_required_accessible - combined_required;

  const accessible_ok = provA >= site_required_accessible - 1e-9 * Math.abs(site_required_accessible);
  const van_ok = provV >= site_required_van - 1e-9 * Math.abs(site_required_van);
  const accessible_short = Math.max(0, site_required_accessible - provA);
  const van_short = Math.max(0, site_required_van - provV);
  const passes = accessible_ok && van_ok;
  const van_only_failure = accessible_ok && !van_ok;

  const note = "TWO RULES, and the second is the one that gets skipped. Table 208.2 sets the accessible count from the lot total; 208.2.4 then requires one VAN space for every six OR FRACTION OF SIX of those. "
    + n + " spaces in one facility -> " + required_accessible + " accessible (" + branch + "), of which " + required_van + " must be van and " + required_car + " may be car. "
    + (percent_raw !== null ? "The 2% comes to " + percent_raw.toFixed(2) + ", rounded up to " + required_accessible + " - a count of spaces cannot be fractional, and rounding down would provide fewer than the standard requires. " : "")
    + (n >= 495 && n <= 520 ? "NOTE THE STEP AT 500: the last table row (401-500) gives 9, and at 501 the rule switches to 2% - 10.02 for 501, so 11. One space added to a 500-space lot adds TWO accessible spaces. " : "")
    + "FRACTION OF SIX is the trap: " + required_accessible + " accessible spaces need " + required_van + " van, not " + Math.floor(required_accessible / VAN_EVERY + 1e-9) + ". Four accessible spaces still owe one van; seven owe two. And a van space is one OF the accessible spaces, not an extra one beyond them. "
    + (lots > 1 ? "PER FACILITY, NOT PER SITE: the table is applied to each parking facility separately, so " + lots + " lots of " + n + " owe " + site_required_accessible + " accessible spaces and " + site_required_van + " van, while the same " + site_total_spaces + " spaces in ONE lot would owe " + combined_required + ". " + (split_penalty > 0 ? "Splitting the parking RAISES the requirement by " + split_penalty + ". " : split_penalty === 0 ? "Here the split happens to cost nothing. " : "") : "Counted for one parking facility. Where a site has several separate lots or structures, the table is applied to EACH one, and the totals rarely match what the combined count would have been. ")
    + "Provided " + provA + " accessible / " + provV + " van: " + (passes ? "meets both. " : (accessible_ok ? "" : "SHORT " + accessible_short + " accessible. ") + (van_ok ? "" : "SHORT " + van_short + " van. "))
    + (van_only_failure ? "The total is right and the MIX is wrong - the most common finding on a restripe, because the count gets checked and the van share does not. " : "")
    + "Not checked: the geometry of the spaces themselves under 502 - space and access-aisle widths, the wider space or wider aisle a van requires, the 98 in vertical clearance a van needs along its whole route in, surface slope, and signage; whether spaces are on the shortest accessible route to the entrance and dispersed among the entrances under 208.3; the higher ratios for hospital outpatient, rehabilitation, and residential facilities under 208.2.1 through 208.2.3; state and local requirements, several of which exceed these; and enforcement of who parks there. A count, not a layout; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { required_accessible, required_van, required_car, branch, percent_raw, site_required_accessible, site_required_van, site_total_spaces, combined_required, split_penalty, accessible_ok, van_ok, accessible_short, van_short, van_only_failure, passes, note };
}

export const accessibleParkingCountExample = { inputs: { total_spaces: 100, facility_count: 1, provided_accessible: 4, provided_van: 0 } };

ACCESSIBILITY_RENDERERS["accessible-parking-count"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 208.2 and Table 208.2 (Parking Spaces) and 208.2.4 (Van Parking Spaces). A US federal standard in the public domain. Table 208.2 gives the minimum accessible spaces by lot total: 1 to 25 -> 1; 26 to 50 -> 2; 51 to 75 -> 3; 76 to 100 -> 4; 101 to 150 -> 5; 151 to 200 -> 6; 201 to 300 -> 7; 301 to 400 -> 8; 401 to 500 -> 9; 501 to 1,000 -> 2 percent of the total; 1,001 and over -> 20, plus 1 for each 100, or fraction thereof, over 1,000. Section 208.2.4: 'For every six or fraction of six parking spaces required by 208.2 to comply with 502, at least one shall be a van parking space complying with 502.' Not checked: the geometry of the spaces under 502, the accessible route and dispersion required by 208.3, the higher ratios at hospital outpatient, rehabilitation, and residential facilities under 208.2.1 through 208.2.3, or state and local requirements that exceed these. A count, not a layout.",
  example: accessibleParkingCountExample.inputs,
  fields: [
    { key: "total_spaces", label: "Parking spaces in ONE parking facility", kind: "number" },
    { key: "facility_count", label: "Number of such facilities (separate lots) on the site", kind: "number" },
    { key: "provided_accessible", label: "Accessible spaces provided (site total)", kind: "number" },
    { key: "provided_van", label: "Of those, van spaces provided", kind: "number" },
  ],
  outputs: [
    { key: "a", id: "apc-out-a", label: "Required per facility", value: (r) => r.required_accessible + " accessible (" + r.branch + "): " + r.required_van + " van + " + r.required_car + " car" },
    { key: "s", id: "apc-out-s", label: "Required site total", value: (r) => r.site_required_accessible + " accessible, of which " + r.site_required_van + " van" + (r.combined_required === null ? "" : "; as one lot of " + r.site_total_spaces + " it would be " + r.combined_required) },
    { key: "p", id: "apc-out-p", label: "Provided vs required", value: (r) => r.passes ? "meets both the count and the van share" : [r.accessible_ok ? null : "short " + r.accessible_short + " accessible", r.van_ok ? null : "short " + r.van_short + " van"].filter(Boolean).join(", ") },
    { key: "v", id: "apc-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES 208.2 and 208.2.4" : r.van_only_failure ? "COUNT OK, VAN SHARE SHORT" : "DOES NOT PASS" },
    { key: "n", id: "apc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAccessibleParkingCount,
});

// ===================== spec-v1161: visual character height (2010 ADA Standards Table 703.5.5) =====================

// The size of the letters on a sign is not a design choice - it is a function of how high the
// sign sits and how close a person can actually get to it. Table 703.5.5 sets a base height by
// mounting band and then adds 1/8 in for every foot of viewing distance past that band's
// threshold. The band boundaries are cliffs, not ramps: a sign whose baseline sits at 70 in
// needs 5/8 in characters, and the same sign raised a tenth of an inch needs 2 in - more than
// three times as tall - because it has crossed into the next band.
// Two measurement rules do most of the damage. The height is measured to the BASELINE of the
// character, not to the top or bottom of the panel. And the viewing distance is the horizontal
// distance to whatever OBSTRUCTION prevents further approach, not the distance from wherever a
// person happens to stand - so a counter, a rail, or a planter in front of a sign is what sets
// the letter height, and removing one later shortens the distance rather than lengthening it.
// dims: in { baseline_height_in: L, viewing_distance_in: L, provided_character_height_in: L } out: { required_character_height_in: L, base_height_in: L, shortfall_in: L, max_viewing_distance_in: L, added_in: L, excess_in: L, next_band_required_in: L, threshold_in: L, cliff_multiple: dimensionless }
export function computeSignCharacterHeight({ baseline_height_in = 0, viewing_distance_in = 0, provided_character_height_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const h = Number(baseline_height_in) || 0;
  const v = Number(viewing_distance_in) || 0;
  const provided = Number(provided_character_height_in) || 0;
  if (!(h > 0)) return { error: "Baseline height above the finish floor must be positive (in)." };
  if (!(v > 0)) return { error: "Horizontal viewing distance must be positive (in)." };
  if (provided < 0) return { error: "Provided character height cannot be negative (in)." };
  if (h < 40) return { error: "Table 703.5.5 starts at 40 in: visual characters are not permitted below 40 in above the finish floor, so no required height can be read off the table for a baseline at " + h + " in." };

  const PER_FT = 0.125;
  let base_height_in, threshold_in, band;
  if (h <= 70) { base_height_in = 0.625; threshold_in = 72; band = "40 to 70 in above the floor"; }
  else if (h <= 120) { base_height_in = 2; threshold_in = 180; band = "over 70 to 120 in above the floor"; }
  else { base_height_in = 3; threshold_in = 252; band = "over 120 in above the floor"; }

  const excess_in = Math.max(0, v - threshold_in);
  const added_in = (excess_in / 12) * PER_FT;
  const required_character_height_in = base_height_in + added_in;
  const distance_governs = excess_in > 0;

  const ok = provided >= required_character_height_in - 1e-9;
  const shortfall_in = Math.max(0, required_character_height_in - provided);

  // The inverse: how far back this character height actually serves, in its own band.
  const max_viewing_distance_in = provided >= base_height_in ? threshold_in + ((provided - base_height_in) / PER_FT) * 12 : null;

  // The cliff: what the SAME sign would need one band up, where a band up exists.
  const next_base_in = h <= 70 ? 2 : h <= 120 ? 3 : null;
  const next_threshold_in = h <= 70 ? 180 : h <= 120 ? 252 : null;
  const next_band_required_in = next_base_in === null ? null : next_base_in + (Math.max(0, v - next_threshold_in) / 12) * PER_FT;
  const cliff_multiple = next_band_required_in === null ? null : next_band_required_in / required_character_height_in;

  const note = "LETTER HEIGHT IS NOT A DESIGN CHOICE. Table 703.5.5 reads it off two things: how high the characters sit and how close a person can actually get. A baseline at " + h + " in falls in the band " + band + ", where the base height is " + base_height_in + " in and 1/8 in is added for every foot of viewing distance past " + threshold_in + " in. "
    + "At " + v + " in of viewing distance that is " + (distance_governs ? base_height_in + " + " + added_in.toFixed(3) + " = " + required_character_height_in.toFixed(3) + " in, and THE DISTANCE GOVERNS - the base height alone would be short. " : "just the base " + base_height_in + " in, since " + v + " in does not reach the " + threshold_in + " in threshold. ")
    + "Provided " + provided + " in: " + (ok ? "OK. " : "SHORT by " + shortfall_in.toFixed(3) + " in. ")
    + (max_viewing_distance_in !== null ? provided + " in characters serve out to " + max_viewing_distance_in.toFixed(1) + " in (" + (max_viewing_distance_in / 12).toFixed(1) + " ft) in this band. " : provided + " in is under the band's base height, so there is no viewing distance at which it complies. ")
    + (next_band_required_in !== null ? "THE BAND BOUNDARIES ARE CLIFFS, NOT RAMPS: raise this baseline past " + (h <= 70 ? 70 : 120) + " in and the same sign at the same distance needs " + next_band_required_in.toFixed(3) + " in - " + cliff_multiple.toFixed(2) + " times as tall - because the base jumps from " + base_height_in + " to " + next_base_in + " in. A sign nudged up to clear a door head can more than triple its required letter height without moving an inch closer or further away. " : "This is the top band; there is no higher one to cross into. ")
    + "TWO MEASUREMENT RULES DO MOST OF THE DAMAGE. The height is measured to the BASELINE of the characters, not to the top or bottom of the panel - a tall panel hung low can put its lettering in a different band than the sign appears to occupy. And the viewing distance is the horizontal distance to whatever OBSTRUCTION prevents further approach toward the sign, not the distance from wherever a person happens to stand. A counter, a rail, or a planter in front of a sign is what sets the letter height; take one out and the distance gets SHORTER, not longer. Character height itself is based on the uppercase letter I, so it is the font's cap height rather than the panel, the lowercase, or the ascender. "
    + "Not checked: whether this sign is required to have visual characters at all, or tactile ones, or both, which turns on what it identifies; the raised-character and Braille requirements and their own 48 to 60 in mounting range; stroke thickness, character width, spacing, line spacing, case, and the prohibition on italic, script, and highly decorative fonts; finish, contrast, and glare; the location requirement at doors; pictograms and their fields; and state and local accessibility law. A height check, not a sign design; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { required_character_height_in, base_height_in, threshold_in, band, excess_in, added_in, distance_governs, ok, shortfall_in, max_viewing_distance_in, next_band_required_in, cliff_multiple, note };
}

export const signCharacterHeightExample = { inputs: { baseline_height_in: 60, viewing_distance_in: 120, provided_character_height_in: 0.625 } };

ACCESSIBILITY_RENDERERS["sign-character-height"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 703.5.5 and Table 703.5.5 (Visual Character Height). A US federal standard in the public domain. The table sets the minimum height of visual characters from the height of the characters above the finish floor or ground, measured to the baseline, and the horizontal viewing distance: at 40 to 70 in above the floor, 5/8 in, plus 1/8 in per foot of viewing distance above 72 in; at over 70 to 120 in, 2 in, plus 1/8 in per foot of viewing distance above 180 in; at over 120 in, 3 in, plus 1/8 in per foot of viewing distance above 21 ft. Viewing distance is measured as the horizontal distance between the character and an obstruction preventing further approach towards the sign, and character height is based on the uppercase letter I. Not checked: whether visual characters, tactile characters, or both are required for this sign; raised-character and Braille requirements and their 48 to 60 in mounting range; stroke thickness, character width and spacing, line spacing, case, and font restrictions; finish, contrast, and glare; sign location at doors; pictograms; or state and local accessibility law. A height check, not a sign design.",
  example: signCharacterHeightExample.inputs,
  fields: [
    { key: "baseline_height_in", label: "Height of the character BASELINE above the finish floor (in)", kind: "number" },
    { key: "viewing_distance_in", label: "Horizontal viewing distance to the obstruction preventing approach (in)", kind: "number" },
    { key: "provided_character_height_in", label: "Character height provided, uppercase I (in)", kind: "number" },
  ],
  outputs: [
    { key: "b", id: "sch-out-b", label: "Band and base", value: (r) => r.band + ": base " + r.base_height_in + " in, +1/8 in per ft past " + r.threshold_in + " in" },
    { key: "r", id: "sch-out-r", label: "Required character height", value: (r) => fmt(r.required_character_height_in, 3) + " in" + (r.distance_governs ? " (the viewing distance governs, adding " + fmt(r.added_in, 3) + " in)" : " (base only; the distance does not reach the threshold)") },
    { key: "v", id: "sch-out-v", label: "Provided vs required", value: (r) => r.ok ? "OK" : "SHORT by " + fmt(r.shortfall_in, 3) + " in" },
    { key: "d", id: "sch-out-d", label: "How far these characters serve", value: (r) => r.max_viewing_distance_in === null ? "under the band's base height - no viewing distance complies" : fmt(r.max_viewing_distance_in, 1) + " in (" + fmt(r.max_viewing_distance_in / 12, 1) + " ft) in this band" },
    { key: "c", id: "sch-out-c", label: "If the sign crossed into the next band", value: (r) => r.next_band_required_in === null ? "top band - none above it" : fmt(r.next_band_required_in, 3) + " in, " + fmt(r.cliff_multiple, 2) + "x as tall" },
    { key: "n", id: "sch-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSignCharacterHeight,
});

// ===================== spec-v1162: reach ranges (2010 ADA Standards 308) =====================

// Where an outlet, switch, thermostat, dispenser, or control may sit is not a rule of thumb -
// it is four rules that depend on which way a person approaches and what is in the way.
// Forward, unobstructed: 15 to 48 in. Forward over an obstruction: still 48 in where the reach
// depth is 20 in or less, but 44 in past that, and past 25 in of depth there is NO permitted
// reach at all - the element has to move rather than come down.
// Side, unobstructed: 15 to 48 in. Side over an obstruction: 48 in to 10 in of depth, 46 in
// from 10 to 24 in, and the OBSTRUCTION ITSELF may be no more than 34 in high and 24 in deep.
// That last number is the one that ends arguments: a standard 36 in counter is too TALL to be
// reached over under this section at all, whatever the height of the thing behind it.
// dims: in { approach: dimensionless, obstructed: dimensionless, obstruction_depth_in: L, obstruction_height_in: L, element_height_in: L } out: { max_height_in: L, min_height_in: L, height_excess_in: L, max_obstruction_depth_in: L, depth_to_gain_in: L, low_deficit_in: L, max_obstruction_height_in: L, shallow_limit_in: L }
export function computeReachRange({ approach = "forward", obstructed = "yes", obstruction_depth_in = 0, obstruction_height_in = 0, element_height_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (approach === "side" && obstructed === "yes" && !(Number(obstruction_height_in) > 0)) return { error: "Enter the height of the obstruction (in); a side reach is only allowed over one 34 in high or less." };
  const depth = Number(obstruction_depth_in) || 0;
  const obsH = Number(obstruction_height_in) || 0;
  const h = Number(element_height_in) || 0;
  const isSide = approach === "side";
  const isObs = obstructed === "yes";
  if (approach !== "forward" && approach !== "side") return { error: "Approach must be forward or side - the two have different reach ranges and different obstruction limits." };
  if (obstructed !== "yes" && obstructed !== "no") return { error: "State whether the reach is over an obstruction (yes or no)." };
  if (!(h > 0)) return { error: "Element height above the finish floor must be positive (in)." };
  if (isObs && !(depth > 0)) return { error: "Reach depth over the obstruction must be positive (in) - an obstructed reach with no depth is an unobstructed reach." };
  if (isObs && obsH < 0) return { error: "Obstruction height cannot be negative (in)." };

  const LOW = 15;
  const MAX_OBS_HEIGHT = 34;
  const max_obstruction_depth_in = isObs ? (isSide ? 24 : 25) : null;

  let max_height_in = null, rule = "", depth_permitted = true;
  if (!isObs) { max_height_in = 48; rule = isSide ? "unobstructed side reach (308.3.1)" : "unobstructed forward reach (308.2.1)"; }
  else if (isSide) {
    rule = "obstructed high side reach (308.3.2)";
    if (depth <= 10 + 1e-9) max_height_in = 48;
    else if (depth <= 24 + 1e-9) max_height_in = 46;
    else { max_height_in = null; depth_permitted = false; }
  } else {
    rule = "obstructed high forward reach (308.2.2)";
    if (depth <= 20 + 1e-9) max_height_in = 48;
    else if (depth <= 25 + 1e-9) max_height_in = 44;
    else { max_height_in = null; depth_permitted = false; }
  }

  // The obstruction's own height ceiling applies to the side case only.
  const obstruction_height_ok = isObs && isSide ? obsH <= MAX_OBS_HEIGHT + 1e-9 * Math.abs(MAX_OBS_HEIGHT) : null;

  const high_ok = max_height_in === null ? false : h <= max_height_in + 1e-9 * Math.abs(max_height_in);
  const low_ok = h >= LOW - 1e-9 * Math.abs(LOW);
  const height_excess_in = max_height_in === null ? null : Math.max(0, h - max_height_in);
  const low_deficit_in = Math.max(0, LOW - h);
  const passes = depth_permitted && high_ok && low_ok && (obstruction_height_ok !== false);

  // What trimming the reach depth would buy, where a shallower band exists.
  const shallow_limit_in = isObs ? (isSide ? 10 : 20) : null;
  const depth_to_gain_in = isObs && depth > shallow_limit_in ? depth - shallow_limit_in : null;

  const note = "REACH RANGE IS FOUR RULES, not one number, and which one applies turns on the approach and on what is in the way. This is a " + rule + ". "
    + (isObs ? "Reach depth " + depth + " in: " : "")
    + (max_height_in === null
      ? "THERE IS NO PERMITTED REACH AT THIS DEPTH. " + (isSide ? "The side-reach obstruction may be 24 in deep at most" : "The forward reach depth may be 25 in at most") + ", and " + depth + " in exceeds it - so the element does not need to come DOWN, it needs to MOVE. Lowering it does not help, because no height complies. "
      : "the high reach is " + max_height_in + " in maximum" + (isObs ? " (48 in only out to " + shallow_limit_in + " in of depth" + (isSide ? ", 46 in from there to 24 in" : ", 44 in from there to 25 in") + ")" : "") + ", and the low reach is " + LOW + " in minimum. ")
    + "Element at " + h + " in: " + (max_height_in === null ? "" : high_ok && low_ok ? "within range. " : (high_ok ? "" : "TOO HIGH by " + height_excess_in.toFixed(1) + " in. ") + (low_ok ? "" : "TOO LOW by " + low_deficit_in.toFixed(1) + " in - the 15 in floor is a rule, not a courtesy, and a receptacle set at the framer's usual 12 in fails it. "))
    + (depth_to_gain_in !== null ? "TRIMMING THE DEPTH BUYS HEIGHT: pull the reach depth back " + depth_to_gain_in.toFixed(1) + " in, to " + shallow_limit_in + " in, and the maximum returns to 48 in. " : "")
    + (isObs && isSide
      ? "THE OBSTRUCTION HAS ITS OWN CEILING, and this is the number that ends arguments: it may be no more than 34 in high and 24 in deep. This one is " + obsH + " in high - " + (obstruction_height_ok ? "OK. " : "OVER, so there is no compliant side reach across it at any element height. A standard 36 in kitchen counter is too TALL to be reached over under this section, whatever is behind it. ") + "The section allows exactly two exceptions: the top of washing machines and clothes dryers may be 36 in maximum, and operable parts of fuel dispensers may be 54 in maximum measured from the vehicular way where the dispensers are on existing curbs. "
      : "")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: whether a clear floor or ground space of the right size and orientation is actually there, which every one of these rules presumes - a forward reach needs a forward approach and a side reach needs a parallel one, and without the space the range does not apply; the 5 lbf operating force and the requirement that operable parts work with one hand and without tight grasping, pinching, or twisting of the wrist; which elements are operable parts at all and which are exempt; kitchen and kitchenette work surfaces, appliances, and storage, which are governed by their own sections; knee and toe clearance under a forward approach; and state and local accessibility law and the electrical code, which sets its own mounting heights for different reasons. A reach check, not a rough-in schedule; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { max_height_in, min_height_in: LOW, rule, depth_permitted, max_obstruction_depth_in, shallow_limit_in, depth_to_gain_in, obstruction_height_ok, max_obstruction_height_in: isObs && isSide ? MAX_OBS_HEIGHT : null, high_ok, low_ok, height_excess_in, low_deficit_in, passes, note };
}

export const reachRangeExample = { inputs: { approach: "side", obstructed: "yes", obstruction_depth_in: 24, obstruction_height_in: 34, element_height_in: 48 } };

ACCESSIBILITY_RENDERERS["reach-range"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 308 Reach Ranges. A US federal standard in the public domain. 308.2.1: high forward reach 48 in maximum and low forward reach 15 in minimum above the finish floor. 308.2.2: high forward reach 48 in maximum where the reach depth is 20 in maximum; where the reach depth exceeds 20 in, the high forward reach shall be 44 in maximum and the reach depth 25 in maximum. 308.3.1: high side reach 48 in maximum and low side reach 15 in minimum. 308.3.2: where a clear floor space allows a parallel approach and the high side reach is over an obstruction, the obstruction shall be 34 in high maximum and 24 in deep maximum; the high side reach shall be 48 in maximum for a reach depth of 10 in maximum, and where the reach depth exceeds 10 in the high side reach shall be 46 in maximum for a reach depth of 24 in maximum. Exceptions: the top of washing machines and clothes dryers may be 36 in maximum; operable parts of fuel dispensers may be 54 in maximum from the vehicular way where installed on existing curbs. Not checked: whether the required clear floor space and approach direction are present, operating force and one-hand operation, which elements are operable parts, kitchen work surfaces and appliances governed by their own sections, knee and toe clearance, or state and local law and electrical-code mounting heights. A reach check, not a rough-in schedule.",
  example: reachRangeExample.inputs,
  fields: [
    { key: "approach", label: "Approach", kind: "select", options: [{ value: "forward", label: "Forward (perpendicular)" }, { value: "side", label: "Side (parallel)", selected: true }] },
    { key: "obstructed", label: "Reach is over an obstruction?", kind: "select", options: [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }] },
    { key: "obstruction_depth_in", label: "Reach depth over the obstruction (in)", kind: "number" },
    { key: "obstruction_height_in", label: "Height of the obstruction itself (in; side reach only)", kind: "number" },
    { key: "element_height_in", label: "Height of the outlet, switch, or control (in)", kind: "number" },
  ],
  outputs: [
    { key: "r", id: "rr-out-r", label: "Rule that applies", value: (r) => r.rule },
    { key: "m", id: "rr-out-m", label: "Permitted range", value: (r) => r.max_height_in === null ? "NONE at this reach depth - the maximum is " + r.max_obstruction_depth_in + " in" : r.min_height_in + " to " + r.max_height_in + " in above the finish floor" },
    { key: "e", id: "rr-out-e", label: "Element height", value: (r) => r.max_height_in === null ? "no height complies; the element must move, not drop" : r.high_ok && r.low_ok ? "within range" : [r.high_ok ? null : "too high by " + fmt(r.height_excess_in, 1) + " in", r.low_ok ? null : "too low by " + fmt(r.low_deficit_in, 1) + " in"].filter(Boolean).join(", ") },
    { key: "o", id: "rr-out-o", label: "Obstruction itself", value: (r) => r.obstruction_height_ok === null ? "no height limit applies to this case" : r.obstruction_height_ok ? "within the 34 in maximum" : "OVER the 34 in maximum - no compliant side reach across it at any height" },
    { key: "t", id: "rr-out-t", label: "What trimming the depth buys", value: (r) => r.depth_to_gain_in === null ? "nothing to trim - already in the shallow band" : "pull back " + fmt(r.depth_to_gain_in, 1) + " in to " + r.shallow_limit_in + " in and the maximum returns to 48 in" },
    { key: "v", id: "rr-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES 308" : "DOES NOT PASS" },
    { key: "n", id: "rr-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeReachRange,
});

// ===================== spec-v1163: protruding objects (2010 ADA Standards 307) =====================

// The rule everybody half-remembers is "4 inches", and the half that gets dropped is WHERE.
// The 4 in limit applies only to objects whose leading edge is MORE than 27 in and NOT MORE
// than 80 in above the floor - the band a cane sweeps under and a person walks into. Below
// 27 in a cane finds the object, above 80 in you walk under it, and in neither case does 307.2
// limit how far it sticks out. So the fix for an over-projecting wall object is often to LOWER
// it rather than shrink it, which is the opposite of what people try.
// A free-standing object on posts gets 12 in, three times a wall-mounted one. Overhead, the
// clearance is 80 in and anything less needs a barrier whose LEADING EDGE is 27 in maximum -
// a rail at waist height is not a barrier, because the cane has to find it.
// dims: in { mounting: dimensionless, leading_edge_height_in: L, projection_in: L, corridor_width_in: L, required_route_width_in: L, vertical_clearance_in: L, barrier_edge_height_in: L } out: { max_projection_in: L, projection_excess_in: L, remaining_width_in: L, width_deficit_in: L, drop_to_cane_zone_in: L, raise_above_zone_in: L }
export function computeProtrudingObject({ mounting = "wall", leading_edge_height_in = 0, projection_in = 0, corridor_width_in = 0, required_route_width_in = 36, vertical_clearance_in = 80, barrier_edge_height_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const h = Number(leading_edge_height_in) || 0;
  const p = Number(projection_in) || 0;
  const w = Number(corridor_width_in) || 0;
  const reqW = Number(required_route_width_in) || 0;
  const vc = Number(vertical_clearance_in) || 0;
  const barrier = Number(barrier_edge_height_in) || 0;
  if (mounting !== "wall" && mounting !== "handrail" && mounting !== "post") return { error: "Mounting must be wall, handrail, or post - the permitted projection differs by a factor of three between them." };
  if (!(h > 0)) return { error: "Leading edge height above the finish floor must be positive (in)." };
  if (p < 0) return { error: "Projection into the circulation path cannot be negative (in)." };
  if (!(w > 0)) return { error: "Circulation path width must be positive (in)." };
  if (!(reqW > 0)) return { error: "Required clear width must be positive (in)." };
  if (!(vc > 0)) return { error: "Vertical clearance must be positive (in)." };
  if (barrier < 0) return { error: "Barrier leading edge height cannot be negative (in)." };

  const LOW = 27, HIGH = 80, MIN_VERT = 80, BARRIER_MAX = 27;
  // 307.2 wall: leading edge MORE than 27 in; 307.3 post: 27 in MINIMUM, so 27 is in the band.
  const in_zone = (mounting === "post" ? h >= LOW : h > LOW) && h <= HIGH;
  const LIMIT = { wall: 4, handrail: 4.5, post: 12 };
  const max_projection_in = in_zone ? LIMIT[mounting] : null;
  const projection_ok = in_zone ? p <= max_projection_in + 1e-9 * Math.abs(max_projection_in) : true;
  const projection_excess_in = in_zone ? Math.max(0, p - max_projection_in) : 0;
  // The move people do not think of: drop the leading edge into the cane-detectable zone.
  const drop_to_cane_zone_in = in_zone && !projection_ok ? h - LOW : null;
  const raise_above_zone_in = in_zone && !projection_ok ? HIGH - h : null;

  // 307.5: a compliant projection still may not eat the required route width.
  const remaining_width_in = w - p;
  const width_ok = remaining_width_in >= reqW - 1e-9 * Math.abs(reqW);
  const width_deficit_in = Math.max(0, reqW - remaining_width_in);

  // 307.4: overhead.
  const vertical_ok = vc >= MIN_VERT - 1e-9 * Math.abs(MIN_VERT);
  const barrier_present = barrier > 0;
  const barrier_ok = vertical_ok ? null : (barrier_present ? barrier <= BARRIER_MAX + 1e-9 * Math.abs(BARRIER_MAX) : false);
  const overhead_ok = vertical_ok || barrier_ok === true;

  const passes = projection_ok && width_ok && overhead_ok;

  const note = "THE RULE IS 4 INCHES, AND THE HALF THAT GETS DROPPED IS WHERE. 307.2 limits protrusion only for objects whose leading edge is MORE than 27 in and NOT MORE than 80 in above the floor - the band a cane sweeps under and a person walks into. "
    + "This leading edge is at " + h + " in, which is " + (in_zone ? "INSIDE that band" : h <= LOW ? "at or below 27 in, where a cane finds the object before a knee does" : "above 80 in, where a person walks under it") + ". "
    + (in_zone
      ? "A " + (mounting === "post" ? "free-standing object on posts or pylons may overhang the path 12 in" : mounting === "handrail" ? "handrail may protrude 4 1/2 in" : "wall-mounted object may protrude 4 in") + " maximum. This one projects " + p + " in: " + (projection_ok ? "OK. " : "OVER by " + projection_excess_in.toFixed(1) + " in. "
        + "THREE MOVES FIX IT, and the obvious one is the hardest: shrink the projection by " + projection_excess_in.toFixed(1) + " in, or LOWER the leading edge " + drop_to_cane_zone_in.toFixed(1) + " in to 27 in, or RAISE it more than " + raise_above_zone_in.toFixed(1) + " in, to above 80 in. Lowering is the move people do not think of, because the limit is about detection rather than size - once a cane finds the object, how far it sticks out stops being 307.2's concern. ")
      : "307.2 does not limit how far it projects at this height. " + (h > HIGH ? "But note the vertical clearance rule below - clearing 80 in for the protrusion and providing 80 in of headroom are different questions. " : ""))
    + (mounting === "post" && in_zone ? "A post-mounted object gets THREE TIMES the wall-mounted allowance, which is why the same drinking fountain is a violation recessed into a wall and compliant on a pylon. Where a sign is mounted BETWEEN posts more than 12 in apart, its lowest edge must be 27 in maximum or 80 in minimum - there is no permitted middle. " : "")
    + "CLEAR WIDTH (307.5): a protruding object may not reduce the clear width an accessible route requires, and a projection that passes 307.2 can still fail this. " + w + " in less " + p + " in leaves " + remaining_width_in.toFixed(1) + " in against " + reqW + " in required: " + (width_ok ? "OK. " : "SHORT by " + width_deficit_in.toFixed(1) + " in. ")
    + "VERTICAL CLEARANCE (307.4): 80 in minimum. This path has " + vc + " in: " + (vertical_ok ? "OK. " : "UNDER, so a guardrail or barrier is required, and its LEADING EDGE must be 27 in maximum above the floor. " + (barrier_present ? "The barrier entered is at " + barrier + " in: " + (barrier_ok ? "OK. " : "TOO HIGH - a rail at waist height is not a barrier here, because the cane has to find it before the head does. ") : "None is stated. The classic case is the open space under a stair, where a rail gets added at hand height and the actual hazard is at head height. ") + "Door closers and door stops are the stated exception, permitted at 78 in minimum. ")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: whether this path is an accessible route or a circulation path at all; the required route width itself, which is an input here because it varies with the situation; turning space, passing space, and maneuvering clearances; the object's own operable parts and reach ranges; doors and their hardware; whether a barrier is structurally adequate or detectable in practice; and state and local accessibility law. A protrusion screen, not a route design; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { in_zone, max_projection_in, projection_ok, projection_excess_in, drop_to_cane_zone_in, raise_above_zone_in, remaining_width_in, width_ok, width_deficit_in, vertical_ok, barrier_present, barrier_ok, overhead_ok, passes, note };
}

export const protrudingObjectExample = { inputs: { mounting: "wall", leading_edge_height_in: 48, projection_in: 6, corridor_width_in: 44, required_route_width_in: 36, vertical_clearance_in: 80, barrier_edge_height_in: 0 } };

ACCESSIBILITY_RENDERERS["protruding-object-check"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 307 Protruding Objects. A US federal standard in the public domain. 307.2: objects with leading edges more than 27 in and not more than 80 in above the finish floor shall protrude 4 in maximum horizontally into the circulation path; handrails shall be permitted to protrude 4 1/2 in maximum. 307.3: free-standing objects mounted on posts or pylons shall overhang circulation paths 12 in maximum when located 27 in minimum and 80 in maximum above the finish floor, and where a sign or other obstruction is mounted between posts or pylons more than 12 in apart, the lowest edge of such sign or obstruction shall be 27 in maximum or 80 in minimum above the finish floor. 307.4: vertical clearance shall be 80 in high minimum; guardrails or other barriers shall be provided where the vertical clearance is less than 80 in high, and the leading edge of such guardrail or barrier shall be located 27 in maximum above the finish floor, with door closers and door stops permitted at 78 in minimum. 307.5: protruding objects shall not reduce the clear width required for accessible routes. Not checked: whether the path is an accessible route, the required width itself, turning and passing space, maneuvering clearances, the object's own operable parts, doors and hardware, whether a barrier is structurally adequate, or state and local law. A protrusion screen, not a route design.",
  example: protrudingObjectExample.inputs,
  fields: [
    { key: "mounting", label: "Mounting", kind: "select", options: [{ value: "wall", label: "Wall-mounted (4 in)", selected: true }, { value: "handrail", label: "Handrail (4 1/2 in)" }, { value: "post", label: "Free-standing on posts or pylons (12 in)" }] },
    { key: "leading_edge_height_in", label: "Leading edge height above the finish floor (in)", kind: "number" },
    { key: "projection_in", label: "Horizontal projection into the path (in)", kind: "number" },
    { key: "corridor_width_in", label: "Circulation path width before the object (in)", kind: "number" },
    { key: "required_route_width_in", label: "Clear width the route requires (in)", kind: "number" },
    { key: "vertical_clearance_in", label: "Vertical clearance (headroom) along the path (in)", kind: "number" },
    { key: "barrier_edge_height_in", label: "Barrier leading edge height, if headroom is under 80 in (in; 0 = none)", kind: "number" },
  ],
  outputs: [
    { key: "z", id: "po-out-z", label: "Is the leading edge in the limited band?", value: (r) => r.in_zone ? "yes - over 27 in and not over 80 in, so 307.2 applies" : "no - 307.2 places no limit on the projection at this height" },
    { key: "p", id: "po-out-p", label: "Projection", value: (r) => !r.in_zone ? "unlimited by 307.2 here" : r.projection_ok ? "within the " + r.max_projection_in + " in maximum" : "OVER the " + r.max_projection_in + " in maximum by " + fmt(r.projection_excess_in, 1) + " in" },
    { key: "f", id: "po-out-f", label: "Three ways to fix it", value: (r) => r.projection_ok || !r.in_zone ? "nothing to fix" : "shrink " + fmt(r.projection_excess_in, 1) + " in, lower " + fmt(r.drop_to_cane_zone_in, 1) + " in to 27 in, or raise more than " + fmt(r.raise_above_zone_in, 1) + " in, to above 80 in" },
    { key: "w", id: "po-out-w", label: "Clear width left (307.5)", value: (r) => fmt(r.remaining_width_in, 1) + " in - " + (r.width_ok ? "meets the required width" : "SHORT by " + fmt(r.width_deficit_in, 1) + " in") },
    { key: "v", id: "po-out-v", label: "Vertical clearance (307.4)", value: (r) => r.vertical_ok ? "80 in or more - OK" : r.barrier_ok ? "under 80 in, but a barrier is provided at a compliant leading edge" : r.barrier_present ? "under 80 in and the barrier leading edge is above 27 in" : "under 80 in and no barrier is stated" },
    { key: "d", id: "po-out-d", label: "Verdict", value: (r) => r.passes ? "PASSES 307" : "DOES NOT PASS" },
    { key: "n", id: "po-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeProtrudingObject,
});

// ===================== spec-v1164: accessible route width, pinch points, turns, passing spaces (2010 ADA Standards 403.5) =====================

// 36 in is the route width, and the three things around it are what get missed.
// The 32 in figure people quote is not a width - it is a PINCH, allowed for 24 in of length at
// most and only where the reduced segments are separated by full-width runs 48 in long. A hall
// built at 32 in is not a hall with an exception, it is a noncompliant hall.
// A 180 degree turn around an element narrower than 48 in needs 42 in approaching, 48 in AT the
// turn and 42 in leaving - so a perfectly compliant 36 in corridor stops complying the moment
// it doubles back around a narrow wall stub, unless the turn itself is 60 in.
// And any route under 60 in wide owes passing spaces at intervals of 200 ft maximum, which is
// nearly every corridor, and the one people never draw.
// dims: in { clear_width_in: L, pinch_width_in: L, pinch_length_in: L, separation_length_in: L, turn_element_width_in: L, approach_width_in: L, at_turn_width_in: L, route_length_ft: L } out: { width_deficit_in: L, pinch_length_excess_in: L, required_at_turn_in: L, passing_spaces_required: dimensionless, longest_stretch_ft: L, required_approach_in: L }
export function computeAccessibleRouteWidth({ clear_width_in = 0, pinch_present = "no", pinch_width_in = 0, pinch_length_in = 0, separation_length_in = 0, turn_present = "no", turn_element_width_in = 0, approach_width_in = 0, at_turn_width_in = 0, route_length_ft = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(clear_width_in) || 0;
  const pw = Number(pinch_width_in) || 0;
  const pl = Number(pinch_length_in) || 0;
  const sep = Number(separation_length_in) || 0;
  const tew = Number(turn_element_width_in) || 0;
  const aw = Number(approach_width_in) || 0;
  const tw = Number(at_turn_width_in) || 0;
  const L = Number(route_length_ft) || 0;
  const hasPinch = pinch_present === "yes";
  const hasTurn = turn_present === "yes";
  if (pinch_present !== "yes" && pinch_present !== "no") return { error: "State whether the route has a reduced-width pinch point (yes or no)." };
  if (turn_present !== "yes" && turn_present !== "no") return { error: "State whether the route makes a 180 degree turn around an element (yes or no)." };
  if (!(w > 0)) return { error: "Clear width of the route must be positive (in)." };
  if (!(L > 0)) return { error: "Route length must be positive (ft)." };
  if (hasPinch && (!(pw > 0) || !(pl > 0))) return { error: "Pinch width and length must be positive (in) where a pinch point is present." };
  if (hasPinch && sep < 0) return { error: "Separation between reduced segments cannot be negative (in)." };
  if (hasTurn && (!(tew > 0) || !(aw > 0) || !(tw > 0))) return { error: "Turn element width, approach width, and width at the turn must be positive (in) where a 180 degree turn is present." };

  const MIN_W = 36, PINCH_MIN_W = 32, PINCH_MAX_L = 24, SEP_MIN = 48;
  const TURN_ELEMENT = 48, TURN_APPROACH = 42, TURN_AT = 48, TURN_RELIEF = 60;
  const PASSING_TRIGGER = 60, PASSING_INTERVAL_FT = 200;

  const width_ok = w >= MIN_W - 1e-9 * Math.abs(MIN_W);
  const width_deficit_in = Math.max(0, MIN_W - w);

  // The pinch exception: a width AND a length AND a separation, all three.
  const pinch_width_ok = hasPinch ? pw >= PINCH_MIN_W - 1e-9 * Math.abs(PINCH_MIN_W) : null;
  const pinch_length_ok = hasPinch ? pl <= PINCH_MAX_L + 1e-9 * Math.abs(PINCH_MAX_L) : null;
  const pinch_separation_ok = hasPinch ? sep >= SEP_MIN - 1e-9 * Math.abs(SEP_MIN) : null;
  const pinch_length_excess_in = hasPinch ? Math.max(0, pl - PINCH_MAX_L) : null;
  const pinch_ok = hasPinch ? (pinch_width_ok && pinch_length_ok && pinch_separation_ok) : null;

  // The turn: only where the element is narrower than 48 in, and relieved entirely at 60 in.
  const turn_applies = hasTurn ? tew < TURN_ELEMENT : null;
  const turn_relieved = hasTurn && turn_applies ? tw >= TURN_RELIEF : null;
  const required_at_turn_in = hasTurn && turn_applies && !turn_relieved ? TURN_AT : null;
  const required_approach_in = hasTurn && turn_applies && !turn_relieved ? TURN_APPROACH : null;
  const turn_approach_ok = required_approach_in === null ? null : aw >= required_approach_in - 1e-9 * Math.abs(required_approach_in);
  const turn_at_ok = required_at_turn_in === null ? null : tw >= required_at_turn_in - 1e-9 * Math.abs(required_at_turn_in);
  const turn_ok = hasTurn ? (!turn_applies || turn_relieved === true || (turn_approach_ok && turn_at_ok)) : null;

  // Passing spaces: triggered by width alone, spaced so no stretch exceeds 200 ft.
  const passing_required = w < PASSING_TRIGGER;
  const passing_spaces_required = passing_required ? Math.max(0, Math.ceil(L / PASSING_INTERVAL_FT - 1e-9) - 1) : 0;
  const longest_stretch_ft = passing_required ? L / (passing_spaces_required + 1) : L;

  const passes = width_ok && (pinch_ok !== false) && (turn_ok !== false);

  const note = "36 IN IS THE ROUTE WIDTH, and the three rules around it are what get missed. The clear width of a walking surface is 36 in minimum; this route is " + w + " in: " + (width_ok ? "OK. " : "SHORT by " + width_deficit_in.toFixed(1) + " in. ")
    + (hasPinch
      ? "THE 32 IN FIGURE IS NOT A WIDTH, IT IS A PINCH. The exception permits 32 in minimum for a length of 24 in MAXIMUM, and only where the reduced segments are separated by segments 48 in long minimum and 36 in wide minimum - three conditions, not one. This pinch is " + pw + " in wide over " + pl + " in of length with " + sep + " in of separation: "
        + (pinch_ok ? "all three met. " : (pinch_width_ok ? "" : "WIDTH under 32 in. ") + (pinch_length_ok ? "" : "LENGTH over by " + pinch_length_excess_in.toFixed(1) + " in - past 24 in it stops being a pinch and becomes the width of the route. ") + (pinch_separation_ok ? "" : "SEPARATION under 48 in, so the reduced segments are not separated by a full-width run and read as one long narrow stretch. "))
        + "A hall built at 32 in is not a hall with an exception; it is a noncompliant hall. "
      : "No pinch point entered. Note that the 32 in people quote is a length-limited exception rather than a route width. ")
    + (hasTurn
      ? (turn_applies
        ? "THE 180 DEGREE TURN BITES BECAUSE THE ELEMENT IS NARROW. Turning around an element less than 48 in wide - this one is " + tew + " in - requires 42 in approaching, 48 in AT the turn, and 42 in leaving, "
          + (turn_relieved ? "unless the turn itself is 60 in minimum, which at " + tw + " in it is, so 403.5.2 does not apply. " : "and " + tw + " in at the turn does not reach the 60 in that would relieve it. Approach " + aw + " in: " + (turn_approach_ok ? "OK" : "SHORT") + "; at the turn " + tw + " in: " + (turn_at_ok ? "OK" : "SHORT") + ". A perfectly compliant 36 in corridor stops complying the moment it doubles back around a narrow stub - the width did not change, the geometry did. ")
        : "The element turned around is " + tew + " in wide, which is 48 in or more, so 403.5.2 does not apply and the ordinary 36 in width governs through the turn. ")
      : "")
    + "PASSING SPACES: any accessible route with a clear width LESS than 60 in owes them at intervals of 200 ft maximum - which is nearly every corridor, and the thing that never gets drawn. At " + w + " in this route " + (passing_required ? "DOES owe them" : "does NOT owe them, being 60 in or wider") + ". "
    + (passing_required ? "Over " + L + " ft, keeping every stretch at or under 200 ft takes " + passing_spaces_required + " passing space" + (passing_spaces_required === 1 ? "" : "s") + ", leaving the longest stretch at " + longest_stretch_ft.toFixed(0) + " ft. That count is the minimum needed so no run exceeds the interval; the standard states the interval, not a count, and where a space must go is a layout question. Each one is either 60 x 60 in, or the intersection of two walking surfaces forming a T-shaped space whose base and arms extend 48 in minimum beyond the intersection. " : "")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: running slope, cross slope, changes in level, and surface; whether this is an accessible route at all and where one is required; doors, their clear opening width, and maneuvering clearances, which routinely govern a corridor before its width does; turning space at the ends; protruding objects, which reduce the clear width separately; handrails and guards; and state and local accessibility law. A width screen, not a route design; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { width_ok, width_deficit_in, pinch_width_ok, pinch_length_ok, pinch_separation_ok, pinch_length_excess_in, pinch_ok, turn_applies, turn_relieved, required_approach_in, required_at_turn_in, turn_approach_ok, turn_at_ok, turn_ok, passing_required, passing_spaces_required, longest_stretch_ft, passes, note };
}

export const accessibleRouteWidthExample = { inputs: { clear_width_in: 36, pinch_present: "yes", pinch_width_in: 32, pinch_length_in: 30, separation_length_in: 48, turn_present: "no", turn_element_width_in: 0, approach_width_in: 0, at_turn_width_in: 0, route_length_ft: 250 } };

ACCESSIBILITY_RENDERERS["accessible-route-width"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 403.5.1, 403.5.2, and 403.5.3. A US federal standard in the public domain. 403.5.1: the clear width of walking surfaces shall be 36 in minimum; exception - the clear width shall be permitted to be reduced to 32 in minimum for a length of 24 in maximum provided that reduced width segments are separated by segments that are 48 in long minimum and 36 in wide minimum. 403.5.2: where the accessible route makes a 180 degree turn around an element which is less than 48 in wide, clear width shall be 42 in minimum approaching the turn, 48 in minimum at the turn and 42 in minimum leaving the turn; exception - where the clear width at the turn is 60 in minimum, compliance with 403.5.2 shall not be required. 403.5.3: an accessible route with a clear width less than 60 in shall provide passing spaces at intervals of 200 ft maximum; passing spaces shall be either a space 60 in minimum by 60 in minimum, or an intersection of two walking surfaces providing a T-shaped space complying with 304.3.2 where the base and arms of the T-shaped space extend 48 in minimum beyond the intersection. The passing-space COUNT here is the minimum needed so that no stretch exceeds the stated interval; the standard states the interval rather than a count, and placement is a layout question. Not checked: running slope, cross slope, changes in level, surface, doors and their maneuvering clearances, turning space, protruding objects, handrails, or state and local law. A width screen, not a route design.",
  example: accessibleRouteWidthExample.inputs,
  fields: [
    { key: "clear_width_in", label: "Clear width of the route (in)", kind: "number" },
    { key: "route_length_ft", label: "Route length (ft)", kind: "number" },
    { key: "pinch_present", label: "Route has a reduced-width pinch point?", kind: "select", options: [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }] },
    { key: "pinch_width_in", label: "Pinch width (in)", kind: "number" },
    { key: "pinch_length_in", label: "Pinch length (in)", kind: "number" },
    { key: "separation_length_in", label: "Full-width separation between reduced segments (in)", kind: "number" },
    { key: "turn_present", label: "Route makes a 180 degree turn around an element?", kind: "select", options: [{ value: "no", label: "No", selected: true }, { value: "yes", label: "Yes" }] },
    { key: "turn_element_width_in", label: "Width of the element turned around (in)", kind: "number" },
    { key: "approach_width_in", label: "Clear width approaching and leaving the turn, the narrower of the two (in)", kind: "number" },
    { key: "at_turn_width_in", label: "Clear width at the turn (in)", kind: "number" },
  ],
  outputs: [
    { key: "w", id: "arw-out-w", label: "Clear width", value: (r) => r.width_ok ? "meets the 36 in minimum" : "SHORT of 36 in by " + fmt(r.width_deficit_in, 1) + " in" },
    { key: "p", id: "arw-out-p", label: "Pinch point (32 in exception)", value: (r) => r.pinch_ok === null ? "none entered" : r.pinch_ok ? "all three conditions met" : [r.pinch_width_ok ? null : "under 32 in wide", r.pinch_length_ok ? null : "over 24 in long by " + fmt(r.pinch_length_excess_in, 1) + " in", r.pinch_separation_ok ? null : "separation under 48 in"].filter(Boolean).join(", ") },
    { key: "t", id: "arw-out-t", label: "180 degree turn", value: (r) => r.turn_ok === null ? "none entered" : !r.turn_applies ? "element is 48 in or wider - 403.5.2 does not apply" : r.turn_relieved ? "relieved: the turn is 60 in or wider" : (r.turn_approach_ok && r.turn_at_ok ? "meets 42 in approaching and 48 in at the turn" : "needs 42 in approaching and 48 in at the turn: " + [r.turn_approach_ok ? null : "approach short", r.turn_at_ok ? null : "turn short"].filter(Boolean).join(", ")) },
    { key: "s", id: "arw-out-s", label: "Passing spaces", value: (r) => !r.passing_required ? "not required - the route is 60 in or wider" : r.passing_spaces_required + " needed over this length; longest stretch " + fmt(r.longest_stretch_ft, 0) + " ft" },
    { key: "v", id: "arw-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES the items entered" : "DOES NOT PASS" },
    { key: "n", id: "arw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAccessibleRouteWidth,
});

// ===================== spec-v1165: door clear width, thresholds, doors in series (2010 ADA Standards 404.2) =====================

// 32 in is the CLEAR OPENING, not the door. It is measured between the face of the door open
// 90 degrees and the stop, so the leaf loses its own thickness and the stop before anyone
// measures - which is why a 32 in door yields roughly 30 in and does not comply, and why the
// smallest leaf that reliably works is 36 in.
// Two rules ride along that get skipped. An opening more than 24 in DEEP - a thick wall, a
// vestibule, a deep jamb - needs 36 in of clear width rather than 32, so the same door fails
// simply for being set in a thicker wall. And the 5/8 in latch-side stop projection everyone
// quotes is an ALTERATIONS exception; in new construction it is not available.
// dims: in { leaf_width_in: L, door_thickness_in: L, measured_clear_width_in: L, opening_depth_in: L, latch_stop_projection_in: L, threshold_height_in: L, series_spacing_in: L, series_door_width_in: L } out: { estimated_clear_width_in: L, required_clear_width_in: L, clear_width_deficit_in: L, required_series_spacing_in: L, clear_width_in: L, effective_clear_in: L, latch_allowance_in: L, leaf_needed_in: L, series_deficit_in: L, threshold_excess_in: L, threshold_limit_in: L }
export function computeDoorClearWidth({ leaf_width_in = 0, door_thickness_in = 1.75, measured_clear_width_in = 0, opening_depth_in = 5, is_alteration = "no", latch_stop_projection_in = 0, threshold_height_in = 0, threshold_beveled = "no", series_spacing_in = 0, series_door_width_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const leaf = Number(leaf_width_in) || 0;
  const thick = Number(door_thickness_in) || 0;
  const measured = Number(measured_clear_width_in) || 0;
  const depth = Number(opening_depth_in) || 0;
  const latchProj = Number(latch_stop_projection_in) || 0;
  const thr = Number(threshold_height_in) || 0;
  const spacing = Number(series_spacing_in) || 0;
  const seriesDoor = Number(series_door_width_in) || 0;
  const alteration = is_alteration === "yes";
  const beveled = threshold_beveled === "yes";
  if (is_alteration !== "yes" && is_alteration !== "no") return { error: "State whether this is an alteration (yes or no) - the latch-side stop projection is an alterations-only exception." };
  if (threshold_beveled !== "yes" && threshold_beveled !== "no") return { error: "State whether the threshold is beveled on each side (yes or no)." };
  if (!(leaf > 0)) return { error: "Door leaf width must be positive (in)." };
  if (!(thick > 0)) return { error: "Door thickness must be positive (in) - the leaf blocks its own thickness at 90 degrees." };
  if (measured < 0) return { error: "Measured clear width cannot be negative (in)." };
  if (!(depth > 0)) return { error: "Opening depth must be positive (in)." };
  if (latchProj < 0) return { error: "Latch-side stop projection cannot be negative (in)." };
  if (thr < 0) return { error: "Threshold height cannot be negative (in)." };
  if (spacing < 0 || seriesDoor < 0) return { error: "Doors-in-series spacing and door width cannot be negative (in)." };

  const STOP = 0.5, MIN_CLEAR = 32, DEEP = 24, DEEP_CLEAR = 36;
  const ALT_LATCH_MAX = 0.625, THR_MAX = 0.5, THR_ALT_MAX = 0.75, SERIES_BASE = 48;

  const estimated_clear_width_in = leaf - thick - STOP;
  const used_measured = measured > 0;
  const clear_width_in = used_measured ? measured : estimated_clear_width_in;

  const is_deep = depth > DEEP;
  const required_clear_width_in = is_deep ? DEEP_CLEAR : MIN_CLEAR;
  // The latch-side stop may eat into the required width only in an alteration.
  const latch_allowance_in = alteration ? ALT_LATCH_MAX : 0;
  const latch_projection_ok = latchProj <= latch_allowance_in + 1e-9 * Math.abs(latch_allowance_in);
  const effective_clear_in = clear_width_in - Math.max(0, latchProj - latch_allowance_in);
  const clear_width_ok = effective_clear_in >= required_clear_width_in - 1e-9 * Math.abs(required_clear_width_in);
  const clear_width_deficit_in = Math.max(0, required_clear_width_in - effective_clear_in);
  // The smallest leaf that would deliver the required width, on the same assumptions.
  const leaf_needed_in = required_clear_width_in + thick + STOP;

  const threshold_limit_in = alteration && beveled ? THR_ALT_MAX : THR_MAX;
  const threshold_ok = thr <= threshold_limit_in + 1e-9 * Math.abs(threshold_limit_in);
  const threshold_excess_in = Math.max(0, thr - threshold_limit_in);

  const has_series = spacing > 0;
  const required_series_spacing_in = has_series ? SERIES_BASE + seriesDoor : null;
  const series_ok = has_series ? spacing >= required_series_spacing_in - 1e-9 * Math.abs(required_series_spacing_in) : null;
  const series_deficit_in = has_series ? Math.max(0, required_series_spacing_in - spacing) : null;

  const passes = clear_width_ok && threshold_ok && (series_ok !== false);

  const note = "32 IN IS THE CLEAR OPENING, NOT THE DOOR. It is measured between the face of the door open 90 degrees and the stop, so the leaf loses its own thickness and the stop before anyone puts a tape on it. "
    + "A " + leaf + " in leaf " + thick + " in thick, over a 1/2 in stop, estimates to " + estimated_clear_width_in.toFixed(2) + " in of clear opening" + (used_measured ? ", though the measured " + measured + " in entered is what governs here. " : " - and that estimate is what this check uses, since no measurement was entered. It is an estimate; the measured opening governs. ")
    + "THIS IS WHY A 32 IN DOOR DOES NOT COMPLY: it nets roughly 30 in, and the smallest leaf that reliably delivers " + required_clear_width_in + " in on these assumptions is " + leaf_needed_in.toFixed(2) + " in. "
    + "Required here: " + required_clear_width_in + " in, " + (is_deep ? "because the opening is " + depth + " in DEEP - more than 24 in - and a deep opening owes 36 in rather than 32. A thick wall, a vestibule, or a deep jamb can fail a door that would pass anywhere else, with nothing about the door changing. " : "the ordinary minimum, the opening being " + depth + " in deep. ")
    + (latchProj > 0 ? "LATCH-SIDE STOP: " + latchProj + " in of projection entered. The 5/8 in everyone quotes is an ALTERATIONS exception, and this is " + (alteration ? "an alteration, so up to 5/8 in is permitted; " + (latch_projection_ok ? "this is within it. " : "this exceeds it by " + (latchProj - ALT_LATCH_MAX).toFixed(3) + " in and the excess comes off the clear width. ") : "NEW CONSTRUCTION, where the exception is not available at all - the full " + latchProj + " in comes off the required clear width. ") : "")
    + "Effective clear width " + effective_clear_in.toFixed(2) + " in: " + (clear_width_ok ? "OK. " : "SHORT by " + clear_width_deficit_in.toFixed(2) + " in. ")
    + "THRESHOLD: 1/2 in maximum, " + (alteration && beveled ? "or 3/4 in for an existing or altered threshold beveled on each side at a slope no steeper than 1:2, which is the limit applied here. " : "and the 3/4 in figure is available only for an EXISTING OR ALTERED threshold that is beveled on each side at no steeper than 1:2 - " + (alteration ? "this alteration's threshold is not stated as beveled, so 1/2 in governs. " : "this is new construction, so 1/2 in governs. ")) + "This one is " + thr + " in: " + (threshold_ok ? "OK. " : "OVER by " + threshold_excess_in.toFixed(3) + " in. ")
    + (has_series ? "DOORS IN SERIES: the distance between two hinged or pivoted doors in series must be 48 in minimum PLUS the width of doors swinging into the space - here 48 + " + seriesDoor + " = " + required_series_spacing_in + " in, against " + spacing + " in provided: " + (series_ok ? "OK. " : "SHORT by " + series_deficit_in.toFixed(1) + " in. ") + "The additive term is the part that gets dropped, and it is why a vestibule laid out at a flat 48 in fails whenever either door swings into it. " : "")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: maneuvering clearances on each side, which are asymmetric and routinely govern before the width does; hardware type, height, and the requirement that it operate with one hand without tight grasping, pinching, or twisting; opening force and closing speed; the smooth surface at the bottom of the door; vision lights; automatic and power-assisted doors; two-leaf doors, where one leaf must provide the full clear width on its own; changes in level at the threshold beyond its height; and state and local accessibility law and the fire-door and egress requirements that apply at the same opening. A doorway screen, not a hardware schedule; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { estimated_clear_width_in, used_measured, clear_width_in, is_deep, required_clear_width_in, latch_allowance_in, latch_projection_ok, effective_clear_in, clear_width_ok, clear_width_deficit_in, leaf_needed_in, threshold_limit_in, threshold_ok, threshold_excess_in, has_series, required_series_spacing_in, series_ok, series_deficit_in, passes, note };
}

export const doorClearWidthExample = { inputs: { leaf_width_in: 32, door_thickness_in: 1.75, measured_clear_width_in: 0, opening_depth_in: 5, is_alteration: "no", latch_stop_projection_in: 0, threshold_height_in: 0.5, threshold_beveled: "no", series_spacing_in: 0, series_door_width_in: 0 } };

ACCESSIBILITY_RENDERERS["door-clear-width"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 404.2.3 Clear Width, 404.2.5 Thresholds, and 404.2.6 Doors in Series and Gates in Series. A US federal standard in the public domain. 404.2.3: door openings shall provide a clear width of 32 in minimum; clear openings of doorways with swinging doors shall be measured between the face of the door and the stop, with the door open 90 degrees; openings more than 24 in deep shall provide a clear opening of 36 in minimum. Exception: in alterations, a projection of 5/8 in maximum into the required clear width shall be permitted for the latch side stop. 404.2.5: thresholds, if provided at doorways, shall be 1/2 in high maximum; exception - existing or altered thresholds 3/4 in high maximum that have a beveled edge on each side with a slope not steeper than 1:2 shall not be required to comply. 404.2.6: the distance between two hinged or pivoted doors in series shall be 48 in minimum plus the width of doors swinging into the space. The clear-opening ESTIMATE from the leaf assumes the leaf loses its own thickness plus a 1/2 in stop; it is an estimate and the measured opening governs. Not checked: maneuvering clearances, hardware and its operation, opening force and closing speed, the smooth bottom surface, vision lights, automatic and power-assisted doors, two-leaf doors, changes in level beyond the threshold height, or state and local law and the fire-door and egress requirements at the same opening. A doorway screen, not a hardware schedule.",
  example: doorClearWidthExample.inputs,
  fields: [
    { key: "leaf_width_in", label: "Door leaf width (in)", kind: "number" },
    { key: "door_thickness_in", label: "Door thickness (in)", kind: "number" },
    { key: "measured_clear_width_in", label: "MEASURED clear opening at 90 degrees (in; 0 = use the estimate)", kind: "number" },
    { key: "opening_depth_in", label: "Depth of the opening (in)", kind: "number" },
    { key: "is_alteration", label: "Alteration to an existing building?", kind: "select", options: [{ value: "no", label: "No - new construction", selected: true }, { value: "yes", label: "Yes" }] },
    { key: "latch_stop_projection_in", label: "Latch-side stop projection into the opening (in)", kind: "number" },
    { key: "threshold_height_in", label: "Threshold height (in)", kind: "number" },
    { key: "threshold_beveled", label: "Threshold beveled on each side at 1:2 or flatter?", kind: "select", options: [{ value: "no", label: "No", selected: true }, { value: "yes", label: "Yes" }] },
    { key: "series_spacing_in", label: "Distance between doors in series (in; 0 = none)", kind: "number" },
    { key: "series_door_width_in", label: "Width of doors swinging into that space (in)", kind: "number" },
  ],
  outputs: [
    { key: "c", id: "dcw-out-c", label: "Clear opening", value: (r) => fmt(r.clear_width_in, 2) + " in " + (r.used_measured ? "(measured)" : "(estimated from the leaf, less its thickness and a 1/2 in stop)") },
    { key: "q", id: "dcw-out-q", label: "Required", value: (r) => r.required_clear_width_in + " in" + (r.is_deep ? " - the opening is more than 24 in deep" : "") + "; smallest leaf that delivers it: " + fmt(r.leaf_needed_in, 2) + " in" },
    { key: "v", id: "dcw-out-v", label: "Effective clear width", value: (r) => fmt(r.effective_clear_in, 2) + " in - " + (r.clear_width_ok ? "OK" : "SHORT by " + fmt(r.clear_width_deficit_in, 2) + " in") },
    { key: "t", id: "dcw-out-t", label: "Threshold", value: (r) => "limit " + r.threshold_limit_in + " in - " + (r.threshold_ok ? "OK" : "over by " + fmt(r.threshold_excess_in, 3) + " in") },
    { key: "s", id: "dcw-out-s", label: "Doors in series", value: (r) => !r.has_series ? "none entered" : "needs " + r.required_series_spacing_in + " in (48 + the swinging door width) - " + (r.series_ok ? "OK" : "short by " + fmt(r.series_deficit_in, 1) + " in") },
    { key: "d", id: "dcw-out-d", label: "Verdict", value: (r) => r.passes ? "PASSES the items entered" : "DOES NOT PASS" },
    { key: "n", id: "dcw-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDoorClearWidth,
});

// ===================== spec-v1169: changes in level and floor surfaces (2010 ADA Standards 302, 303) =====================

// Three thresholds, and the last one is a cliff rather than a step.
// Up to 1/4 in a change in level may be vertical - a square edge, no transition at all.
// Between 1/4 and 1/2 in it must be beveled at a slope no steeper than 1:2, which means the
// run has to be at least twice the rise; a transition strip cut at 1:1 looks beveled and is not.
// Over 1/2 in it stops being a threshold detail and becomes a RAMP under 405 or 406 - which is
// 1:12 at best, so a 5/8 in change needs 7.5 in of run instead of 1.25, and brings landings,
// edge protection, and handrails with it. One sixteenth of an inch is the difference.
// dims: in { level_change_in: L, bevel_run_in: L, carpet_pile_in: L, opening_size_in: L, ramp_run_per_rise: dimensionless } out: { required_bevel_run_in: L, bevel_run_deficit_in: L, ramp_run_required_in: L, vertical_allowance_in: L, bevel_run_if_under_in: L, over_by_in: L, bevel_slope_run_per_rise: dimensionless, cliff_multiple: dimensionless }
export function computeFloorLevelChange({ level_change_in = 0, bevel_run_in = 0, carpet_pile_in = 0, opening_size_in = 0, opening_elongated = "no", opening_perpendicular = "yes", ramp_run_per_rise = 12 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const h = Number(level_change_in) || 0;
  const run = Number(bevel_run_in) || 0;
  const pile = Number(carpet_pile_in) || 0;
  const open = Number(opening_size_in) || 0;
  const rampRatio = Number(ramp_run_per_rise) || 0;
  const elongated = opening_elongated === "yes";
  const perpendicular = opening_perpendicular === "yes";
  if (opening_elongated !== "yes" && opening_elongated !== "no") return { error: "State whether the opening is elongated (yes or no)." };
  if (opening_perpendicular !== "yes" && opening_perpendicular !== "no") return { error: "State whether an elongated opening runs perpendicular to the dominant direction of travel (yes or no)." };
  if (h < 0) return { error: "Change in level cannot be negative (in)." };
  if (run < 0) return { error: "Bevel run cannot be negative (in)." };
  if (pile < 0) return { error: "Carpet pile height cannot be negative (in)." };
  if (open < 0) return { error: "Opening size cannot be negative (in)." };
  if (!(rampRatio > 0)) return { error: "Ramp run per unit rise must be positive (12 for the 1:12 maximum)." };

  const VERTICAL_MAX = 0.25, BEVEL_MAX = 0.5, BEVEL_SLOPE_RUN = 2;
  const PILE_MAX = 0.5, SPHERE_MAX = 0.5;

  let category, needs_bevel = false, needs_ramp = false;
  if (h === 0) category = "no change in level";
  else if (h <= VERTICAL_MAX + 1e-9) category = "vertical permitted";
  else if (h <= BEVEL_MAX + 1e-9) { category = "must be beveled at 1:2 or flatter"; needs_bevel = true; }
  else { category = "must be a ramp under 405 or 406"; needs_ramp = true; }

  const required_bevel_run_in = needs_bevel ? h * BEVEL_SLOPE_RUN : null;
  const bevel_run_deficit_in = needs_bevel ? Math.max(0, required_bevel_run_in - run) : null;
  const bevel_slope_run_per_rise = needs_bevel && h > 0 ? run / h : null;
  const bevel_ok = needs_bevel ? run >= required_bevel_run_in - 1e-9 * Math.abs(required_bevel_run_in) : null;

  const ramp_run_required_in = needs_ramp ? h * rampRatio : null;
  // What the same change would have cost had it landed a hair under the 1/2 in line.
  const bevel_run_if_under_in = needs_ramp ? BEVEL_MAX * BEVEL_SLOPE_RUN : null;
  const cliff_multiple = needs_ramp ? ramp_run_required_in / bevel_run_if_under_in : null;
  const over_by_in = needs_ramp ? h - BEVEL_MAX : null;

  const has_carpet = pile > 0;
  const carpet_ok = has_carpet ? pile <= PILE_MAX + 1e-9 * Math.abs(PILE_MAX) : null;
  const has_opening = open > 0;
  const opening_size_ok = has_opening ? open <= SPHERE_MAX + 1e-9 * Math.abs(SPHERE_MAX) : null;
  const opening_orientation_ok = has_opening && elongated ? perpendicular : null;
  const opening_ok = has_opening ? (opening_size_ok && opening_orientation_ok !== false) : null;

  const level_ok = needs_ramp ? false : needs_bevel ? bevel_ok : true;
  const passes = level_ok && (carpet_ok !== false) && (opening_ok !== false);

  const note = "THREE THRESHOLDS, AND THE LAST ONE IS A CLIFF. Up to 1/4 in a change in level may be VERTICAL - a square edge, no transition at all. Between 1/4 and 1/2 in it must be BEVELED at a slope no steeper than 1:2. Over 1/2 in it stops being a threshold detail and becomes a RAMP under 405 or 406. "
    + "This change is " + h + " in: " + category + ". "
    + (needs_bevel
      ? "A 1:2 bevel means the run must be at least TWICE the rise, so " + h + " in needs " + required_bevel_run_in.toFixed(3) + " in of run. This one has " + run + " in, a slope of 1:" + bevel_slope_run_per_rise.toFixed(2) + " - " + (bevel_ok ? "flat enough. " : "TOO STEEP, short by " + bevel_run_deficit_in.toFixed(3) + " in of run. A transition strip cut at 1:1 looks beveled and is not; the test is the run, not the appearance. ")
      : "")
    + (needs_ramp
      ? "OVER THE LINE BY " + over_by_in.toFixed(3) + " IN, and that is the expensive sixteenth. At 1:" + rampRatio + " this change needs " + ramp_run_required_in.toFixed(2) + " in of run, against the " + bevel_run_if_under_in.toFixed(2) + " in a 1/2 in change would have needed as a bevel - " + cliff_multiple.toFixed(1) + " times as much. And the run is the small part: a ramp under 405 brings landings top and bottom, edge protection, and handrails on both sides where the rise exceeds 6 in, none of which a bevel needs. Taking the change down to 1/2 in is almost always cheaper than ramping it. "
      : "")
    + (h > 0 && h <= VERTICAL_MAX ? "No transition is required at this height, though a vertical edge is still an edge; the standard permits it rather than recommending it. " : "")
    + (has_carpet ? "CARPET (302.2): pile height 1/2 in maximum, on a level loop, textured loop, level cut pile, or level cut/uncut pile texture, with exposed edges fastened and trimmed. This pile is " + pile + " in: " + (carpet_ok ? "OK. " : "OVER by " + (pile - PILE_MAX).toFixed(3) + " in - and a thick pad under a compliant carpet defeats it just as surely, because the standard is about what the wheel sinks into. ") : "")
    + (has_opening ? "OPENINGS (302.3): must not allow passage of a sphere more than 1/2 in in diameter, and elongated openings must be placed so the long dimension runs PERPENDICULAR to the dominant direction of travel. This opening is " + open + " in: " + (opening_size_ok ? "within the sphere limit" : "TOO LARGE") + (elongated ? ", elongated and " + (perpendicular ? "correctly oriented. " : "running WITH travel rather than across it, which is the orientation that catches a caster or a cane tip. ") : ". ") : "")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: whether the surface is stable, firm, and slip resistant, which 302.1 requires and no dimension captures; the ramp itself where one is required - slope, rise per run, landings, edge protection, handrails, and cross slope are 405 and a separate tile; door thresholds, which have their own 1/2 in rule and their own bevel exception at 404.2.5; grating placement relative to a curb ramp or a crossing; carpet padding and its effect underfoot; the accessible route this surface sits on; and state and local accessibility law. A surface screen, not a floor detail; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { category, needs_bevel, needs_ramp, required_bevel_run_in, bevel_run_deficit_in, bevel_slope_run_per_rise, bevel_ok, ramp_run_required_in, bevel_run_if_under_in, cliff_multiple, over_by_in, has_carpet, carpet_ok, has_opening, opening_size_ok, opening_orientation_ok, opening_ok, level_ok, vertical_allowance_in: VERTICAL_MAX, passes, note };
}

export const floorLevelChangeExample = { inputs: { level_change_in: 0.5, bevel_run_in: 0.5, carpet_pile_in: 0, opening_size_in: 0, opening_elongated: "no", opening_perpendicular: "yes", ramp_run_per_rise: 12 } };

ACCESSIBILITY_RENDERERS["floor-level-change"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 302.2 (Carpet), 302.3 (Openings), 303.2 (Vertical), 303.3 (Beveled), and 303.4 (Ramps). A US federal standard in the public domain. 303.2: changes in level of 1/4 in high maximum shall be permitted to be vertical. 303.3: changes in level between 1/4 in high minimum and 1/2 in high maximum shall be beveled with a slope not steeper than 1:2. 303.4: changes in level greater than 1/2 in high shall be ramped, and shall comply with 405 or 406. 302.2: carpet or carpet tile shall be securely attached, have a firm cushion, pad, or backing or no cushion or pad, have a level loop, textured loop, level cut pile, or level cut/uncut pile texture, and a pile height of 1/2 in maximum, with exposed edges fastened and trim complying with 303. 302.3: openings in floor or ground surfaces shall not allow passage of a sphere more than 1/2 in diameter, and elongated openings shall be placed so that the long dimension is perpendicular to the dominant direction of travel. Not checked: whether the surface is stable, firm, and slip resistant under 302.1; the ramp itself where one is required, which is 405 and a separate tile; door thresholds, which have their own rule at 404.2.5; grating placement at curb ramps and crossings; carpet padding; or state and local law. A surface screen, not a floor detail.",
  example: floorLevelChangeExample.inputs,
  fields: [
    { key: "level_change_in", label: "Change in level (in)", kind: "number" },
    { key: "bevel_run_in", label: "Horizontal run of the transition provided (in)", kind: "number" },
    { key: "ramp_run_per_rise", label: "Ramp run per unit rise, where a ramp is required (12 = 1:12)", kind: "number" },
    { key: "carpet_pile_in", label: "Carpet pile height (in; 0 = no carpet)", kind: "number" },
    { key: "opening_size_in", label: "Largest opening in the surface (in; 0 = none)", kind: "number" },
    { key: "opening_elongated", label: "Is the opening elongated?", kind: "select", options: [{ value: "no", label: "No", selected: true }, { value: "yes", label: "Yes" }] },
    { key: "opening_perpendicular", label: "If elongated, does the long dimension run across the direction of travel?", kind: "select", options: [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }] },
  ],
  outputs: [
    { key: "c", id: "flc-out-c", label: "Which rule applies", value: (r) => r.category },
    { key: "b", id: "flc-out-b", label: "Bevel", value: (r) => !r.needs_bevel ? "not required at this height" : "needs " + fmt(r.required_bevel_run_in, 3) + " in of run for 1:2; provided slope is 1:" + fmt(r.bevel_slope_run_per_rise, 2) + " - " + (r.bevel_ok ? "OK" : "short by " + fmt(r.bevel_run_deficit_in, 3) + " in") },
    { key: "r", id: "flc-out-r", label: "If it must be ramped", value: (r) => !r.needs_ramp ? "not required" : fmt(r.ramp_run_required_in, 2) + " in of run against " + fmt(r.bevel_run_if_under_in, 2) + " in for a 1/2 in bevel - " + fmt(r.cliff_multiple, 1) + "x, plus landings, edge protection, and handrails" },
    { key: "p", id: "flc-out-p", label: "Carpet", value: (r) => r.carpet_ok === null ? "none entered" : r.carpet_ok ? "pile within the 1/2 in maximum" : "pile over the 1/2 in maximum" },
    { key: "o", id: "flc-out-o", label: "Openings", value: (r) => r.opening_ok === null ? "none entered" : r.opening_ok ? "within the 1/2 in sphere and correctly oriented" : [r.opening_size_ok ? null : "passes a sphere over 1/2 in", r.opening_orientation_ok === false ? "elongated the wrong way" : null].filter(Boolean).join(", ") },
    { key: "v", id: "flc-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES the items entered" : "DOES NOT PASS" },
    { key: "n", id: "flc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFloorLevelChange,
});

// ===================== spec-v1170: turning space, clear floor space, and alcoves (2010 ADA Standards 304, 305) =====================

// Two spaces that get conflated and are not the same thing at all. CLEAR FLOOR SPACE is where a
// person stands or parks to USE something: 30 x 48 in, oriented for a forward or a parallel
// approach. TURNING SPACE is where they turn around: a 60 in circle, or a T within a 60 in
// square. A room can have plenty of one and none of the other.
// The T is the escape hatch when 60 in of circle will not fit, and it has more conditions than
// people remember: the arms and base are 36 in wide minimum, each ARM must be clear of
// obstructions 12 in minimum in each direction, and the BASE 24 in minimum.
// The alcove rules are the ones that get skipped entirely. A clear floor space boxed in on three
// sides is not the bare 30 x 48 any more: a forward-approach alcove deeper than 24 in must be
// 36 in wide, and a parallel-approach alcove deeper than 15 in must be 60 in wide. That last
// one turns a 30 in nook into a 60 in one - double - and it is why a washer squeezed into a
// closet fails while the same washer on an open wall passes.
// dims: in { cfs_width_in: L, cfs_depth_in: L, alcove_depth_in: L, turning_diameter_in: L, t_square_in: L, t_arm_width_in: L } out: { required_alcove_width_in: L, alcove_width_deficit_in: L, cfs_short_side_in: L, alcove_trigger_in: L, cfs_long_side_in: L, circle_deficit_in: L }
export function computeTurningAndClearFloorSpace({ cfs_width_in = 0, cfs_depth_in = 0, approach = "forward", alcove_depth_in = 0, turning_type = "circular", turning_diameter_in = 0, t_square_in = 0, t_arm_width_in = 0, t_arm_clear_in = 0, t_base_clear_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(cfs_width_in) || 0;
  const d = Number(cfs_depth_in) || 0;
  const alc = Number(alcove_depth_in) || 0;
  const dia = Number(turning_diameter_in) || 0;
  const sq = Number(t_square_in) || 0;
  const armW = Number(t_arm_width_in) || 0;
  const armC = Number(t_arm_clear_in) || 0;
  const baseC = Number(t_base_clear_in) || 0;
  const forward = approach === "forward";
  const circular = turning_type === "circular";
  const noTurning = turning_type === "none";
  if (approach !== "forward" && approach !== "parallel") return { error: "Approach must be forward or parallel - the alcove rule differs by a factor of two between them." };
  if (turning_type !== "circular" && turning_type !== "t-shaped" && turning_type !== "none") return { error: "Turning space must be circular, t-shaped, or none." };
  if (!(w > 0) || !(d > 0)) return { error: "Clear floor space width and depth must be positive (in)." };
  if (alc < 0) return { error: "Alcove depth cannot be negative (in) - enter 0 where the space is not confined on three sides." };
  if (circular && !(dia > 0)) return { error: "Turning circle diameter must be positive (in)." };
  if (turning_type === "t-shaped" && (!(sq > 0) || !(armW > 0))) return { error: "T-shaped turning space needs a positive square size and arm width (in)." };
  if (turning_type === "t-shaped" && (armC < 0 || baseC < 0)) return { error: "T-shaped arm and base clearances cannot be negative (in)." };

  const CFS_SHORT = 30, CFS_LONG = 48;
  const FWD_TRIGGER = 24, FWD_WIDTH = 36, PAR_TRIGGER = 15, PAR_WIDTH = 60;
  const CIRCLE = 60, T_SQUARE = 60, T_ARM_W = 36, T_ARM_CLEAR = 12, T_BASE_CLEAR = 24;

  // 305.3 is 30 x 48 without regard to which way round, but the approach decides which is which:
  // a forward approach puts the 48 in in the direction of travel toward the element.
  const cfs_short_side_in = Math.min(w, d);
  const cfs_long_side_in = Math.max(w, d);
  const cfs_size_ok = cfs_short_side_in >= CFS_SHORT - 1e-9 * Math.abs(CFS_SHORT) && cfs_long_side_in >= CFS_LONG - 1e-9 * Math.abs(CFS_LONG);
  const cfs_depth_ok = forward ? d >= CFS_LONG - 1e-9 * Math.abs(CFS_LONG) : d >= CFS_SHORT - 1e-9 * Math.abs(CFS_SHORT);
  const cfs_width_ok = forward ? w >= CFS_SHORT - 1e-9 * Math.abs(CFS_SHORT) : w >= CFS_LONG - 1e-9 * Math.abs(CFS_LONG);
  const cfs_oriented_ok = cfs_depth_ok && cfs_width_ok;

  // 305.7 alcoves.
  const alcove_trigger_in = forward ? FWD_TRIGGER : PAR_TRIGGER;
  const is_alcove = alc > alcove_trigger_in;
  const required_alcove_width_in = is_alcove ? (forward ? FWD_WIDTH : PAR_WIDTH) : null;
  const alcove_width_ok = is_alcove ? w >= required_alcove_width_in - 1e-9 * Math.abs(required_alcove_width_in) : null;
  const alcove_width_deficit_in = is_alcove ? Math.max(0, required_alcove_width_in - w) : null;
  // What the other approach would have demanded of the same nook.
  const other_required_width_in = alc > (forward ? PAR_TRIGGER : FWD_TRIGGER) ? (forward ? PAR_WIDTH : FWD_WIDTH) : null;

  // 304.3 turning space.
  let turning_ok = null, turning_detail = "";
  let circle_deficit_in = null, t_square_ok = null, t_arm_width_ok = null, t_arm_clear_ok = null, t_base_clear_ok = null;
  if (circular) {
    turning_ok = dia >= CIRCLE;
    circle_deficit_in = Math.max(0, CIRCLE - dia);
    turning_detail = "a " + CIRCLE + " in circle";
  } else if (turning_type === "t-shaped") {
    t_square_ok = sq >= T_SQUARE;
    t_arm_width_ok = armW >= T_ARM_W;
    t_arm_clear_ok = armC >= T_ARM_CLEAR;
    t_base_clear_ok = baseC >= T_BASE_CLEAR;
    turning_ok = t_square_ok && t_arm_width_ok && t_arm_clear_ok && t_base_clear_ok;
    turning_detail = "a T within a " + T_SQUARE + " in square";
  }

  const passes = cfs_oriented_ok && (alcove_width_ok !== false) && (turning_ok !== false);

  const note = "TWO SPACES THAT GET CONFLATED AND ARE NOT THE SAME THING. Clear floor space is where a person stands or parks to USE something - 30 x 48 in. Turning space is where they turn around - a 60 in circle or a T in a 60 in square. A room can have plenty of one and none of the other, and satisfying 305 says nothing about 304. "
    + "CLEAR FLOOR SPACE (305.3): 30 in minimum by 48 in minimum, positioned for a " + approach + " approach, which here means " + (forward ? "48 in deep toward the element and 30 in wide" : "48 in wide along the element and 30 in deep") + ". Entered " + w + " wide x " + d + " deep: " + (cfs_oriented_ok ? "OK. " : "SHORT. " + (cfs_size_ok ? "The two dimensions would satisfy 30 x 48 the other way round - the space is big enough and turned the wrong way, which is the failure that gets drawn most often because the area looks right on a plan. " : ""))
    + (is_alcove
      ? "ALCOVE (305.7): this space is confined on three sides at " + alc + " in deep, past the " + alcove_trigger_in + " in trigger for a " + approach + " approach, so it is no longer the bare 30 x 48 - it must be " + required_alcove_width_in + " in wide minimum. Entered " + w + " in: " + (alcove_width_ok ? "OK. " : "SHORT by " + alcove_width_deficit_in.toFixed(1) + " in. ")
        + (forward ? "" : "THE PARALLEL CASE IS THE BRUTAL ONE: a nook deeper than 15 in must be 60 in wide, double the 30 in the bare clear floor space would have allowed. It is why an appliance squeezed between two walls fails where the same appliance on an open wall passes, and 15 in is barely the depth of the appliance itself. ")
      : "ALCOVE (305.7): at " + alc + " in of confinement this is not an alcove for a " + approach + " approach, whose trigger is " + alcove_trigger_in + " in. " + (other_required_width_in !== null ? "Note that the SAME nook approached in " + (forward ? "parallel" : "forward") + " would be an alcove and would demand " + other_required_width_in + " in of width - the approach direction, not the geometry, decides. " : ""))
    + (noTurning
      ? "No turning space was entered. Note that where one is required, 305 does not provide it: a compliant clear floor space is not somewhere a person can turn around. "
      : "TURNING SPACE (304.3): " + turning_detail + ". "
        + (circular
          ? "Entered " + dia + " in: " + (turning_ok ? "OK. " : "SHORT by " + circle_deficit_in.toFixed(1) + " in. The T-shaped alternative exists precisely for the rooms where 60 in of circle will not fit. ")
          : "The T has more conditions than people remember: within a 60 in square minimum, arms and base 36 in wide minimum, each ARM clear of obstructions 12 in minimum in each direction, and the BASE clear 24 in minimum. Entered " + sq + " in square, " + armW + " in arms, " + armC + " in of arm clearance, " + baseC + " in of base clearance: "
            + (turning_ok ? "all four met. " : [t_square_ok ? null : "the square is under 60 in", t_arm_width_ok ? null : "the arms are under 36 in", t_arm_clear_ok ? null : "an arm is not clear 12 in in each direction", t_base_clear_ok ? null : "the base is not clear 24 in"].filter(Boolean).join(", ") + ". "))
        + "Doors are permitted to swing into a turning space, which is worth knowing before a layout gets redrawn to avoid it. ")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: whether a turning space or a clear floor space is required at this location at all, which turns on the element and the space type; knee and toe clearance under 306, which a T-shaped space may include at the end of the base or one arm and which changes what counts as clear; the surface itself and its slope, which 305.2 ties to 302 and 303; protruding objects into either space; the element being reached and its own reach ranges and operable parts; door maneuvering clearances, which overlap these spaces and are governed separately; and state and local accessibility law. A space screen, not a plan review; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { cfs_short_side_in, cfs_long_side_in, cfs_size_ok, cfs_depth_ok, cfs_width_ok, cfs_oriented_ok, alcove_trigger_in, is_alcove, required_alcove_width_in, alcove_width_ok, alcove_width_deficit_in, other_required_width_in, turning_ok, circle_deficit_in, t_square_ok, t_arm_width_ok, t_arm_clear_ok, t_base_clear_ok, passes, note };
}

export const turningAndClearFloorSpaceExample = { inputs: { cfs_width_in: 30, cfs_depth_in: 48, approach: "parallel", alcove_depth_in: 20, turning_type: "circular", turning_diameter_in: 60, t_square_in: 0, t_arm_width_in: 0, t_arm_clear_in: 0, t_base_clear_in: 0 } };

ACCESSIBILITY_RENDERERS["turning-clear-floor-space"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 304.3.1, 304.3.2, 304.4, 305.3, 305.5, 305.7.1, and 305.7.2. A US federal standard in the public domain. 305.3: the clear floor or ground space shall be 30 in minimum by 48 in minimum. 305.5: clear floor or ground space shall be positioned for either forward or parallel approach to an element. 305.7.1: alcoves shall be 36 in wide minimum where the depth exceeds 24 in (forward approach). 305.7.2: alcoves shall be 60 in wide minimum where the depth exceeds 15 in (parallel approach). 304.3.1: the turning space shall be a space of 60 in diameter minimum. 304.3.2: the turning space shall be a T-shaped space within a 60 in square minimum with arms and base 36 in wide minimum, each arm of the T clear of obstructions 12 in minimum in each direction and the base clear of obstructions 24 in minimum, and the space shall be permitted to include knee and toe clearance complying with 306 only at the end of either the base or one arm. 304.4: doors shall be permitted to swing into turning spaces. Not checked: whether either space is required at this location, knee and toe clearance under 306, the surface and its slope, protruding objects, the element being reached, door maneuvering clearances, or state and local law. A space screen, not a plan review.",
  example: turningAndClearFloorSpaceExample.inputs,
  fields: [
    { key: "cfs_width_in", label: "Clear floor space width, along the element (in)", kind: "number" },
    { key: "cfs_depth_in", label: "Clear floor space depth, toward the element (in)", kind: "number" },
    { key: "approach", label: "Approach", kind: "select", options: [{ value: "forward", label: "Forward (perpendicular to the element)" }, { value: "parallel", label: "Parallel (alongside the element)", selected: true }] },
    { key: "alcove_depth_in", label: "Depth of confinement on three sides (in; 0 = open)", kind: "number" },
    { key: "turning_type", label: "Turning space provided", kind: "select", options: [{ value: "circular", label: "Circular (60 in)", selected: true }, { value: "t-shaped", label: "T-shaped" }, { value: "none", label: "None entered" }] },
    { key: "turning_diameter_in", label: "Turning circle diameter (in)", kind: "number" },
    { key: "t_square_in", label: "T-shaped: size of the enclosing square (in)", kind: "number" },
    { key: "t_arm_width_in", label: "T-shaped: width of the arms and base (in)", kind: "number" },
    { key: "t_arm_clear_in", label: "T-shaped: each arm clear of obstructions (in)", kind: "number" },
    { key: "t_base_clear_in", label: "T-shaped: base clear of obstructions (in)", kind: "number" },
  ],
  outputs: [
    { key: "c", id: "tcf-out-c", label: "Clear floor space", value: (r) => r.cfs_oriented_ok ? "meets 30 x 48 in the right orientation" : r.cfs_size_ok ? "big enough but TURNED THE WRONG WAY for this approach" : "under 30 x 48 in" },
    { key: "a", id: "tcf-out-a", label: "Alcove", value: (r) => !r.is_alcove ? "not an alcove at this depth (trigger is " + r.alcove_trigger_in + " in for this approach)" : "confined past " + r.alcove_trigger_in + " in, so it needs " + r.required_alcove_width_in + " in of width - " + (r.alcove_width_ok ? "OK" : "short by " + fmt(r.alcove_width_deficit_in, 1) + " in") },
    { key: "o", id: "tcf-out-o", label: "The other approach", value: (r) => r.other_required_width_in === null ? (r.is_alcove ? "would not be an alcove" : "would not be an alcove either") : "the same nook would demand " + r.other_required_width_in + " in of width" },
    { key: "t", id: "tcf-out-t", label: "Turning space", value: (r) => r.turning_ok === null ? "none entered" : r.turning_ok ? "meets 304.3" : r.circle_deficit_in !== null ? "circle short by " + fmt(r.circle_deficit_in, 1) + " in" : [r.t_square_ok ? null : "square under 60 in", r.t_arm_width_ok ? null : "arms under 36 in", r.t_arm_clear_ok ? null : "arm clearance under 12 in", r.t_base_clear_ok ? null : "base clearance under 24 in"].filter(Boolean).join(", ") },
    { key: "v", id: "tcf-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES the items entered" : "DOES NOT PASS" },
    { key: "n", id: "tcf-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTurningAndClearFloorSpace,
});

// ===================== spec-v1171: handrail geometry and extensions (2010 ADA Standards 505) =====================

// The height everybody knows is 34 to 38 in. The three that get missed are the grip, the
// clearance behind it, and the extensions - and the extensions are asymmetric.
// At the TOP of a stair the handrail extends 12 in horizontally beginning directly above the
// first riser nosing. At the BOTTOM it extends AT THE SLOPE OF THE FLIGHT for a horizontal
// distance of one TREAD DEPTH beyond the last riser nosing - so the bottom extension is a
// function of the stair, not a fixed number, and on an 11 in tread it is 11 in of run at the
// pitch, not 12 in of level rail. At a ramp both ends take a flat 12 in horizontal.
// The grip is a window in both directions: a circular rail is 1-1/4 to 2 in in diameter, so a
// 2-1/2 in rail is too FAT to grip and fails as surely as a thin one.
// dims: in { rail_height_in: L, clearance_in: L, diameter_in: L, perimeter_in: L, cross_section_in: L, tread_depth_in: L, top_extension_in: L, bottom_extension_in: L } out: { required_top_extension_in: L, required_bottom_extension_in: L, top_deficit_in: L, bottom_deficit_in: L, bottom_vs_flat_in: L, clearance_deficit_in: L }
export function computeHandrailGeometry({ rail_height_in = 0, clearance_in = 0, grip_shape = "circular", diameter_in = 0, perimeter_in = 0, cross_section_in = 0, flight_type = "stair", tread_depth_in = 0, top_extension_in = 0, bottom_extension_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const h = Number(rail_height_in) || 0;
  const clr = Number(clearance_in) || 0;
  const dia = Number(diameter_in) || 0;
  const per = Number(perimeter_in) || 0;
  const cs = Number(cross_section_in) || 0;
  const tread = Number(tread_depth_in) || 0;
  const topE = Number(top_extension_in) || 0;
  const botE = Number(bottom_extension_in) || 0;
  const circular = grip_shape === "circular";
  const isStair = flight_type === "stair";
  if (grip_shape !== "circular" && grip_shape !== "non-circular") return { error: "Grip shape must be circular or non-circular - they are measured differently." };
  if (flight_type !== "stair" && flight_type !== "ramp") return { error: "Flight type must be stair or ramp - the bottom extension differs between them." };
  if (!(h > 0)) return { error: "Handrail height above the walking surface must be positive (in)." };
  if (clr < 0) return { error: "Clearance behind the handrail cannot be negative (in)." };
  if (circular && !(dia > 0)) return { error: "Circular handrail diameter must be positive (in)." };
  if (!circular && (!(per > 0) || !(cs > 0))) return { error: "A non-circular handrail needs a positive perimeter and cross-section dimension (in)." };
  if (isStair && !(tread > 0)) return { error: "Tread depth must be positive (in) - the bottom extension at a stair is one tread depth." };
  if (topE < 0 || botE < 0) return { error: "Handrail extensions cannot be negative (in)." };

  const H_MIN = 34, H_MAX = 38, CLR_MIN = 1.5;
  const DIA_MIN = 1.25, DIA_MAX = 2, PER_MIN = 4, PER_MAX = 6.25, CS_MAX = 2.25;
  const EXT_FLAT = 12;

  const height_ok = h >= H_MIN - 1e-9 * Math.abs(H_MIN) && h <= H_MAX + 1e-9 * Math.abs(H_MAX);
  const height_too_high = h > H_MAX + 1e-9 * Math.abs(H_MAX);
  const clearance_ok = clr >= CLR_MIN - 1e-9 * Math.abs(CLR_MIN);
  const clearance_deficit_in = Math.max(0, CLR_MIN - clr);

  const diameter_ok = circular ? dia >= DIA_MIN - 1e-9 * Math.abs(DIA_MIN) && dia <= DIA_MAX + 1e-9 * Math.abs(DIA_MAX) : null;
  const diameter_too_fat = circular ? dia > DIA_MAX + 1e-9 * Math.abs(DIA_MAX) : null;
  const perimeter_ok = circular ? null : per >= PER_MIN - 1e-9 * Math.abs(PER_MIN) && per <= PER_MAX + 1e-9 * Math.abs(PER_MAX);
  const cross_section_ok = circular ? null : cs <= CS_MAX + 1e-9 * Math.abs(CS_MAX);
  const grip_ok = circular ? diameter_ok : (perimeter_ok && cross_section_ok);

  const required_top_extension_in = EXT_FLAT;
  const required_bottom_extension_in = isStair ? tread : EXT_FLAT;
  const top_ok = topE >= required_top_extension_in - 1e-9 * Math.abs(required_top_extension_in);
  const bottom_ok = botE >= required_bottom_extension_in - 1e-9 * Math.abs(required_bottom_extension_in);
  const top_deficit_in = Math.max(0, required_top_extension_in - topE);
  const bottom_deficit_in = Math.max(0, required_bottom_extension_in - botE);
  const extensions_ok = top_ok && bottom_ok;
  // The asymmetry, priced: what the bottom would be if the flat 12 in were assumed.
  const bottom_vs_flat_in = isStair ? required_bottom_extension_in - EXT_FLAT : 0;

  const passes = height_ok && clearance_ok && grip_ok && extensions_ok;

  const note = "THE HEIGHT IS THE PART EVERYBODY KNOWS. 34 in minimum to 38 in maximum, to the TOP OF THE GRIPPING SURFACE, measured vertically above walking surfaces, stair NOSINGS, and ramp surfaces - so on a stair it is measured from the nosing line and not from the tread. This one is " + h + " in: " + (height_ok ? "OK. " : height_too_high ? "OVER the 38 in maximum by " + (h - H_MAX).toFixed(2) + " in - a handrail can be too HIGH, which surprises people who treat 34 as the only number. " : "UNDER the 34 in minimum by " + (H_MIN - h).toFixed(2) + " in. ")
    + "CLEARANCE (505.5): 1-1/2 in minimum between the gripping surface and any adjacent surface. Entered " + clr + " in: " + (clearance_ok ? "OK. " : "SHORT by " + clearance_deficit_in.toFixed(3) + " in - and this is the one a wall-mounted bracket eats without anyone noticing, because the rail looks clear until a hand wraps it. ")
    + "GRIP (505.7): "
    + (circular
      ? "a circular rail is 1-1/4 in minimum to 2 in maximum in outside diameter - a WINDOW, so " + dia + " in is " + (diameter_ok ? "within it. " : diameter_too_fat ? "TOO FAT to grip, which fails as surely as a thin one; a 2-1/2 in rail is not a generous handrail, it is a noncompliant one. " : "TOO THIN. ")
      : "a non-circular rail needs a perimeter of 4 in minimum to 6-1/4 in maximum AND a cross-section dimension of 2-1/4 in maximum - two conditions, and a wide flat rail can meet the perimeter while failing the cross-section. Entered " + per + " in perimeter, " + cs + " in cross section: " + (grip_ok ? "both met. " : (perimeter_ok ? "" : "PERIMETER outside 4 to 6-1/4 in. ") + (cross_section_ok ? "" : "CROSS SECTION over 2-1/4 in. ")))
    + "EXTENSIONS (505.10) ARE ASYMMETRIC, and this is the part that gets built wrong. "
    + (isStair
      ? "At the TOP of a stair the rail extends 12 in horizontally, beginning directly above the first riser nosing. At the BOTTOM it extends AT THE SLOPE OF THE FLIGHT for a horizontal distance at least equal to ONE TREAD DEPTH beyond the last riser nosing - so the bottom is a function of the stair rather than a fixed number, and on an " + tread + " in tread it is " + required_bottom_extension_in.toFixed(2) + " in of horizontal run at the pitch, not 12 in of level rail. "
        + (bottom_vs_flat_in < 0 ? "That is " + (-bottom_vs_flat_in).toFixed(2) + " in LESS than the 12 in people assume, so assuming 12 in here is merely wasteful. " : bottom_vs_flat_in > 0 ? "That is " + bottom_vs_flat_in.toFixed(2) + " in MORE than the 12 in people assume, so assuming 12 in here is short. " : "Which happens to equal 12 in on this tread. ")
      : "At a ramp BOTH ends take a flat 12 in horizontal above the landing, beyond the top and bottom of the ramp run - the sloped-extension rule belongs to stairs. ")
    + "Top " + topE + " in: " + (top_ok ? "OK" : "SHORT by " + top_deficit_in.toFixed(2) + " in") + ". Bottom " + botE + " in against " + required_bottom_extension_in.toFixed(2) + " in required: " + (bottom_ok ? "OK. " : "SHORT by " + bottom_deficit_in.toFixed(2) + " in. ")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: continuity, which 505.6 requires along the tops and sides of the gripping surface without obstruction, and the related limits on how far a support may intrude; whether handrails are required on this run at all and on how many sides; the 505.10 exceptions, including those for aisle handrails and for extensions that would be hazardous or intrude into a circulation path; the rail's structural capacity, which is a code load case and not a dimension; the stair or ramp itself - riser, tread, nosing profile, slope, landings, and cross slope; guards, which are a different element with different heights; and state and local accessibility law and the building code, which sets its own handrail rules for different reasons. A handrail dimension screen, not a stair design; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { height_ok, height_too_high, clearance_ok, clearance_deficit_in, diameter_ok, diameter_too_fat, perimeter_ok, cross_section_ok, grip_ok, required_top_extension_in, required_bottom_extension_in, top_ok, bottom_ok, top_deficit_in, bottom_deficit_in, extensions_ok, bottom_vs_flat_in, passes, note };
}

export const handrailGeometryExample = { inputs: { rail_height_in: 36, clearance_in: 1.5, grip_shape: "circular", diameter_in: 2.5, perimeter_in: 0, cross_section_in: 0, flight_type: "stair", tread_depth_in: 11, top_extension_in: 12, bottom_extension_in: 12 } };

ACCESSIBILITY_RENDERERS["handrail-geometry"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 505.4, 505.5, 505.7.1, 505.7.2, 505.10.1, 505.10.2, and 505.10.3. A US federal standard in the public domain. 505.4: top of gripping surfaces of handrails shall be 34 in minimum and 38 in maximum vertically above walking surfaces, stair nosings, and ramp surfaces. 505.5: clearance between handrail gripping surfaces and adjacent surfaces shall be 1 1/2 in minimum. 505.7.1: handrail gripping surfaces with a circular cross section shall have an outside diameter of 1 1/4 in minimum and 2 in maximum. 505.7.2: handrail gripping surfaces with a non-circular cross section shall have a perimeter dimension of 4 in minimum and 6 1/4 in maximum, and a cross-section dimension of 2 1/4 in maximum. 505.10.1: ramp handrails shall extend horizontally above the landing for 12 in minimum beyond the top and bottom of ramp runs. 505.10.2: at the top of a stair flight, handrails shall extend horizontally above the landing for 12 in minimum beginning directly above the first riser nosing. 505.10.3: at the bottom of a stair flight, handrails shall extend at the slope of the stair flight for a horizontal distance at least equal to one tread depth beyond the last riser nosing. Not checked: continuity under 505.6, whether handrails are required and on how many sides, the 505.10 exceptions, structural capacity, the stair or ramp itself, guards, or state and local law and the building code. A handrail dimension screen, not a stair design.",
  example: handrailGeometryExample.inputs,
  fields: [
    { key: "rail_height_in", label: "Height to the top of the gripping surface (in)", kind: "number" },
    { key: "clearance_in", label: "Clearance between the grip and the adjacent surface (in)", kind: "number" },
    { key: "grip_shape", label: "Gripping surface", kind: "select", options: [{ value: "circular", label: "Circular", selected: true }, { value: "non-circular", label: "Non-circular" }] },
    { key: "diameter_in", label: "Circular: outside diameter (in)", kind: "number" },
    { key: "perimeter_in", label: "Non-circular: perimeter (in)", kind: "number" },
    { key: "cross_section_in", label: "Non-circular: largest cross-section dimension (in)", kind: "number" },
    { key: "flight_type", label: "Flight", kind: "select", options: [{ value: "stair", label: "Stair", selected: true }, { value: "ramp", label: "Ramp" }] },
    { key: "tread_depth_in", label: "Tread depth, for the bottom extension at a stair (in)", kind: "number" },
    { key: "top_extension_in", label: "Top extension provided (in, horizontal)", kind: "number" },
    { key: "bottom_extension_in", label: "Bottom extension provided (in, horizontal)", kind: "number" },
  ],
  outputs: [
    { key: "h", id: "hrg-out-h", label: "Height (34-38 in)", value: (r) => r.height_ok ? "within range" : r.height_too_high ? "OVER the 38 in maximum" : "under the 34 in minimum" },
    { key: "c", id: "hrg-out-c", label: "Clearance (1 1/2 in min)", value: (r) => r.clearance_ok ? "OK" : "short by " + fmt(r.clearance_deficit_in, 3) + " in" },
    { key: "g", id: "hrg-out-g", label: "Grip", value: (r) => r.grip_ok ? "within the gripping-surface limits" : r.diameter_too_fat ? "TOO FAT - over the 2 in maximum diameter" : r.diameter_ok === false ? "under the 1 1/4 in minimum diameter" : [r.perimeter_ok ? null : "perimeter outside 4 to 6 1/4 in", r.cross_section_ok ? null : "cross section over 2 1/4 in"].filter(Boolean).join(", ") },
    { key: "e", id: "hrg-out-e", label: "Extensions required", value: (r) => "top " + r.required_top_extension_in + " in horizontal; bottom " + fmt(r.required_bottom_extension_in, 2) + " in" + (r.bottom_vs_flat_in !== 0 ? " (" + (r.bottom_vs_flat_in > 0 ? "+" : "") + fmt(r.bottom_vs_flat_in, 2) + " in against the 12 in people assume)" : "") },
    { key: "p", id: "hrg-out-p", label: "Extensions provided", value: (r) => r.extensions_ok ? "both met" : [r.top_ok ? null : "top short " + fmt(r.top_deficit_in, 2) + " in", r.bottom_ok ? null : "bottom short " + fmt(r.bottom_deficit_in, 2) + " in"].filter(Boolean).join(", ") },
    { key: "v", id: "hrg-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES the items entered" : "DOES NOT PASS" },
    { key: "n", id: "hrg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHandrailGeometry,
});

// ===================== spec-v1172: knee and toe clearance (2010 ADA Standards 306) =====================

// What makes a lavatory, a work surface, or a sink actually usable, and the part that gets built
// wrong because a plumber sees an open space and calls it clear.
// Two stacked zones. TOE is floor to 9 in, KNEE is 9 in to 27 in, both 30 in wide minimum.
// The knee depth is not one number: 11 in minimum at 9 in above the floor and 8 in minimum at
// 27 in, and between those it may taper at 1 in of depth per 6 in of height - no faster. A
// slanted apron or a bowl that hangs down eats the depth exactly where a knee needs it.
// The 27 in figure is the one that decides a job: a lavatory whose apron sits at 26 in has NO
// knee clearance at all under this section, whatever the space below it looks like.
// dims: in { knee_depth_at_9_in: L, knee_depth_at_27_in: L, toe_depth_in: L, clear_width_in: L, apron_height_in: L } out: { required_knee_depth_at_27_in: L, taper_allowed_in: L, knee_deficit_in: L, toe_deficit_in: L, actual_taper_in: L, apron_shortfall_in: L, knee_height_available_in: L, required_knee_depth_at_9_in: L, width_deficit_in: L }
export function computeKneeToeClearance({ apron_height_in = 0, knee_depth_at_9_in = 0, knee_depth_at_27_in = 0, toe_depth_in = 0, clear_width_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const apron = Number(apron_height_in) || 0;
  const k9 = Number(knee_depth_at_9_in) || 0;
  const k27 = Number(knee_depth_at_27_in) || 0;
  const toe = Number(toe_depth_in) || 0;
  const w = Number(clear_width_in) || 0;
  if (!(apron > 0)) return { error: "Height of the underside of the element must be positive (in)." };
  if (k9 < 0 || k27 < 0) return { error: "Knee depths cannot be negative (in)." };
  if (toe < 0) return { error: "Toe depth cannot be negative (in)." };
  if (!(w > 0)) return { error: "Clear width under the element must be positive (in)." };

  const TOE_TOP = 9, KNEE_TOP = 27, MAX_DEPTH = 25, WIDTH_MIN = 30;
  const TOE_MIN = 17, KNEE_MIN_AT_9 = 11, KNEE_MIN_AT_27 = 8;
  const TAPER_DEPTH_PER = 1, TAPER_HEIGHT_PER = 6;

  const has_knee_zone = apron >= KNEE_TOP;
  const knee_height_available_in = Math.min(apron, KNEE_TOP);
  // Taper allowance over the 18 in from 9 to 27: 1 in per 6 in = 3 in total, which is exactly
  // the 11 -> 8 the section states. Reported so the rate is visible rather than assumed.
  const taper_allowed_in = ((KNEE_TOP - TOE_TOP) / TAPER_HEIGHT_PER) * TAPER_DEPTH_PER;
  const required_knee_depth_at_9_in = KNEE_MIN_AT_9;
  const required_knee_depth_at_27_in = KNEE_MIN_AT_27;

  const knee_9_ok = has_knee_zone ? k9 >= KNEE_MIN_AT_9 - 1e-9 * KNEE_MIN_AT_9 : null;
  const knee_27_ok = has_knee_zone ? k27 >= KNEE_MIN_AT_27 - 1e-9 * KNEE_MIN_AT_27 : null;
  const actual_taper_in = has_knee_zone ? k9 - k27 : null;
  const taper_ok = has_knee_zone ? actual_taper_in <= taper_allowed_in + 1e-9 : null;
  const knee_depth_over_max = has_knee_zone ? k9 > MAX_DEPTH + 1e-9 * Math.abs(MAX_DEPTH) : null;
  const knee_deficit_in = has_knee_zone ? Math.max(Math.max(0, KNEE_MIN_AT_9 - k9), Math.max(0, KNEE_MIN_AT_27 - k27)) : null;
  // 306.3.3's rate describes the minimum envelope (11 in at 9, 8 in at 27). A straight profile
  // that meets both ends stays above it everywhere, so a faster taper from a deeper top is
  // compliant. Until 2026-10-03 taper_ok was part of the verdict and failed 20 in / 8 in.
  const knee_ok = has_knee_zone ? (knee_9_ok && knee_27_ok && !knee_depth_over_max) : false;

  const toe_ok = toe >= TOE_MIN - 1e-9 * Math.abs(TOE_MIN);
  const toe_deficit_in = Math.max(0, TOE_MIN - toe);
  const toe_over_max = toe > MAX_DEPTH + 1e-9 * Math.abs(MAX_DEPTH);
  const width_ok = w >= WIDTH_MIN - 1e-9 * Math.abs(WIDTH_MIN);
  const width_deficit_in = Math.max(0, WIDTH_MIN - w);

  const apron_shortfall_in = has_knee_zone ? 0 : KNEE_TOP - apron;
  const passes = has_knee_zone && knee_ok && toe_ok && !toe_over_max && width_ok;

  const note = "TWO STACKED ZONES, and calling an open space clear is how this gets built wrong. Space between the floor and 9 in is TOE clearance; space between 9 in and 27 in is KNEE clearance. Both are 30 in wide minimum and neither may extend more than 25 in under the element. "
    + "THE 27 IN FIGURE DECIDES THE JOB. The underside entered is " + apron + " in: "
    + (has_knee_zone ? "at or above 27 in, so a knee zone exists. " : "BELOW 27 in by " + apron_shortfall_in.toFixed(2) + " in, so there is NO knee clearance under this section at all, whatever the space below it looks like. A lavatory whose apron sits at 26 in does not have shallow knee clearance; it has none, and no depth below can rescue it. ")
    + (has_knee_zone
      ? "KNEE DEPTH IS NOT ONE NUMBER: 11 in minimum at 9 in above the floor, and 8 in minimum at 27 in. Entered " + k9 + " in at 9 in and " + k27 + " in at 27 in: " + (knee_9_ok && knee_27_ok ? "both met" : (knee_9_ok ? "" : "the 9 in depth is short") + (knee_9_ok || knee_27_ok ? "" : " and ") + (knee_27_ok ? "" : "the 27 in depth is short")) + ". "
        + "BETWEEN THEM THE MINIMUM MAY TAPER AT 1 IN OF DEPTH PER 6 IN OF HEIGHT, which over the 18 in from 9 to 27 is " + taper_allowed_in.toFixed(0) + " in total - exactly the 11 to 8 the section states, so the two depths and the rate are the same envelope read two ways. This one loses " + actual_taper_in.toFixed(2) + " in: " + (taper_ok ? "within the rate. " : "faster than the rate, which is fine on a straight profile that meets both minimums, but check that no bowl or slanted apron dips below the envelope between the two measured heights. ")
        + (knee_depth_over_max ? "The knee depth entered exceeds the 25 in maximum any clearance may extend under an element. " : "")
      : "")
    + "TOE (306.2): the clearance must extend " + TOE_MIN + " in minimum under the element where toe clearance is required, and " + MAX_DEPTH + " in maximum. Entered " + toe + " in: " + (toe_over_max ? "past the 25 in maximum. " : toe_ok ? "OK. " : "SHORT by " + toe_deficit_in.toFixed(2) + " in. ")
    + "WIDTH: 30 in minimum for both zones. Entered " + w + " in: " + (width_ok ? "OK. " : "SHORT by " + width_deficit_in.toFixed(2) + " in - and this is the one a pedestal, a trap arm, or a cabinet gable takes out on one side without changing the apparent opening. ")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: whether knee and toe clearance are required at this element at all, which turns on the element and on whether a forward approach is required - a parallel approach needs neither; the 306.2.4 rule that space extending more than 6 in beyond the available knee clearance at 9 in above the floor does not count as toe clearance, which requires the two zones to be read together and a section drawn; the clear floor space in front, which is a separate requirement and a separate tile; pipe insulation and the requirement that exposed pipes and surfaces be configured to protect against contact; the element's own rim or counter height and reach ranges; and state and local accessibility law. A clearance screen, not a fixture rough-in; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { has_knee_zone, apron_shortfall_in, knee_height_available_in, required_knee_depth_at_9_in, required_knee_depth_at_27_in, taper_allowed_in, actual_taper_in, taper_ok, knee_9_ok, knee_27_ok, knee_depth_over_max, knee_deficit_in, knee_ok, toe_ok, toe_deficit_in, toe_over_max, width_ok, width_deficit_in, passes, note };
}

export const kneeToeClearanceExample = { inputs: { apron_height_in: 26, knee_depth_at_9_in: 17, knee_depth_at_27_in: 14, toe_depth_in: 17, clear_width_in: 30 } };

ACCESSIBILITY_RENDERERS["knee-toe-clearance"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 306.2 and 306.3. A US federal standard in the public domain. 306.2.1: space under an element between the finish floor or ground and 9 in above the finish floor or ground shall be considered toe clearance. 306.2.2: toe clearance shall extend 25 in maximum under an element. 306.2.3: where toe clearance is required at an element as part of a clear floor space, the toe clearance shall extend 17 in minimum under the element. 306.2.4: space extending greater than 6 in beyond the available knee clearance at 9 in above the finish floor or ground shall not be considered toe clearance. 306.2.5: toe clearance shall be 30 in wide minimum. 306.3.1: space under an element between 9 in and 27 in above the finish floor or ground shall be considered knee clearance. 306.3.2: knee clearance shall extend 25 in maximum under an element at 9 in above the finish floor or ground. 306.3.3: where knee clearance is required under an element as part of a clear floor space, the knee clearance shall be 11 in deep minimum at 9 in above the finish floor or ground, and 8 in deep minimum at 27 in above the finish floor or ground. 306.3.4: between 9 in and 27 in above the finish floor or ground, the knee clearance shall be permitted to reduce at a rate of 1 in in depth for each 6 in in height. 306.3.5: knee clearance shall be 30 in wide minimum. Not checked: whether knee and toe clearance are required at this element, the 306.2.4 interaction between the two zones, the clear floor space in front, pipe protection, the element's own height and reach ranges, or state and local law. A clearance screen, not a fixture rough-in.",
  example: kneeToeClearanceExample.inputs,
  fields: [
    { key: "apron_height_in", label: "Height of the underside of the element (in)", kind: "number" },
    { key: "knee_depth_at_9_in", label: "Knee depth available at 9 in above the floor (in)", kind: "number" },
    { key: "knee_depth_at_27_in", label: "Knee depth available at 27 in above the floor (in)", kind: "number" },
    { key: "toe_depth_in", label: "Toe depth available below 9 in (in)", kind: "number" },
    { key: "clear_width_in", label: "Clear width under the element (in)", kind: "number" },
  ],
  outputs: [
    { key: "k", id: "ktc-out-k", label: "Is there a knee zone at all?", value: (r) => r.has_knee_zone ? "yes - the underside is at or above 27 in" : "NO - the underside is " + fmt(r.apron_shortfall_in, 2) + " in below 27 in, so no depth below can rescue it" },
    { key: "d", id: "ktc-out-d", label: "Knee depth", value: (r) => !r.has_knee_zone ? "not applicable" : "needs " + r.required_knee_depth_at_9_in + " in at 9 in and " + r.required_knee_depth_at_27_in + " in at 27 in - " + (r.knee_9_ok && r.knee_27_ok ? "both met" : "short by " + fmt(r.knee_deficit_in, 2) + " in") },
    { key: "t", id: "ktc-out-t", label: "Taper", value: (r) => !r.has_knee_zone ? "not applicable" : "may lose " + fmt(r.taper_allowed_in, 0) + " in over the 18 in of height (1 in per 6 in); loses " + fmt(r.actual_taper_in, 2) + " in - " + (r.taper_ok ? "within the rate" : "faster than the rate; fine if nothing dips between the two measured heights") },
    { key: "o", id: "ktc-out-o", label: "Toe clearance", value: (r) => r.toe_over_max ? "past the 25 in maximum" : r.toe_ok ? "meets the 17 in minimum" : "short of 17 in by " + fmt(r.toe_deficit_in, 2) + " in" },
    { key: "w", id: "ktc-out-w", label: "Width", value: (r) => r.width_ok ? "meets the 30 in minimum" : "short by " + fmt(r.width_deficit_in, 2) + " in" },
    { key: "v", id: "ktc-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES the items entered" : "DOES NOT PASS" },
    { key: "n", id: "ktc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeKneeToeClearance,
});

// ===================== spec-v1173: NFIP flood openings (44 CFR 60.3(c)(5)) =====================

// The rule is one square inch of NET area per square foot of enclosed area, a MINIMUM OF TWO
// openings, and the BOTTOM of every opening no higher than one foot above grade.
// Three things get missed. Net free area is not the size of the hole - a block vent with a
// louver and an insect screen passes a fraction of its gross opening, and the fraction is what
// counts. The two-opening minimum is independent of the area, so a small enclosure that a
// single large vent would satisfy on square inches still fails on count. And the ONE FOOT is
// measured to the BOTTOM of the opening, not the top or the centre, so a vent set in the
// second course of block is usually already too high.
// Engineered openings are a different animal: they are certified by the square feet of
// enclosure each one serves, and the square-inch rule does not apply to them at all.
// dims: in { enclosed_area_sf: L^2, net_free_area_per_opening_sqin: L^2, coverage_sf_per_opening: L^2, bottom_height_in: L } out: { required_net_area_sqin: L^2, provided_net_area_sqin: L^2, net_area_deficit_sqin: L^2, openings_required: dimensionless, height_excess_in: L, openings_for_area: dimensionless, openings_short: dimensionless }
export function computeFloodOpeningArea({ enclosed_area_sf = 0, opening_type = "non-engineered", net_free_area_per_opening_sqin = 0, coverage_sf_per_opening = 0, openings_provided = 0, bottom_height_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const area = Number(enclosed_area_sf) || 0;
  const nfa = Number(net_free_area_per_opening_sqin) || 0;
  const cov = Number(coverage_sf_per_opening) || 0;
  const provided = Number(openings_provided) || 0;
  const bottom = Number(bottom_height_in);
  const engineered = opening_type === "engineered";
  if (opening_type !== "engineered" && opening_type !== "non-engineered") return { error: "Opening type must be non-engineered or engineered - they are rated on completely different bases." };
  if (!(area > 0)) return { error: "Enclosed area subject to flooding must be positive (sq ft)." };
  if (!Number.isInteger(provided) || provided < 0) return { error: "Openings provided must be a whole number, zero or more." };
  if (!Number.isFinite(bottom)) return { error: "Height to the bottom of the openings must be a number (in)." };
  if (bottom < 0) return { error: "Height to the bottom of the openings cannot be negative (in) - an opening below grade does not admit floodwater, it admits everything." };
  if (!engineered && !(nfa > 0)) return { error: "Net free area per opening must be positive (sq in) for non-engineered openings." };
  if (engineered && !(cov > 0)) return { error: "Certified coverage per opening must be positive (sq ft) for engineered openings." };

  const SQIN_PER_SF = 1, MIN_OPENINGS = 2, MAX_BOTTOM_IN = 12;

  const required_net_area_sqin = engineered ? null : area * SQIN_PER_SF;
  const provided_net_area_sqin = engineered ? null : provided * nfa;
  const net_area_deficit_sqin = engineered ? null : Math.max(0, required_net_area_sqin - provided_net_area_sqin);
  const openings_for_area = engineered ? Math.ceil(area / cov - 1e-9) : Math.ceil(required_net_area_sqin / nfa - 1e-9);
  const openings_required = Math.max(MIN_OPENINGS, openings_for_area);
  const count_governed_by_minimum = openings_for_area < MIN_OPENINGS;
  const count_ok = provided >= openings_required - 1e-9 * Math.abs(openings_required);
  const openings_short = Math.max(0, openings_required - provided);
  const area_ok = engineered ? provided * cov >= area - 1e-9 * Math.abs(area) : provided_net_area_sqin >= required_net_area_sqin - 1e-9 * Math.abs(required_net_area_sqin);
  const coverage_provided_sf = engineered ? provided * cov : null;

  const height_ok = bottom <= MAX_BOTTOM_IN + 1e-9 * Math.abs(MAX_BOTTOM_IN);
  const height_excess_in = Math.max(0, bottom - MAX_BOTTOM_IN);

  const passes = count_ok && area_ok && height_ok;

  const note = "ONE SQUARE INCH OF NET AREA PER SQUARE FOOT OF ENCLOSED AREA, a minimum of TWO openings, and the BOTTOM of every opening no higher than one foot above grade. "
    + (engineered
      ? "ENGINEERED OPENINGS ARE A DIFFERENT ANIMAL and the square-inch rule does not apply to them at all: each one is certified for the square feet of enclosure it serves. At " + cov + " sq ft per opening, " + area + " sq ft takes " + openings_for_area + " - and the two-opening minimum still applies on top of that, so the requirement is " + openings_required + ". Provided " + provided + ", covering " + coverage_provided_sf.toFixed(0) + " sq ft: " + (count_ok && area_ok ? "adequate. " : "SHORT by " + openings_short + " opening" + (openings_short === 1 ? "" : "s") + ". ") + "The certification is the whole basis here; an engineered vent without its certification is a hole in a wall. "
      : "NET FREE AREA IS NOT THE SIZE OF THE HOLE. A block vent with a louver and an insect screen passes a fraction of its gross opening, and the fraction is what counts - which is why a 16 x 8 in vent is not 128 sq in of anything. This calculation uses " + nfa + " sq in of NET free area per opening, which should come off the product listing rather than a tape measure. "
        + area + " sq ft needs " + required_net_area_sqin.toFixed(0) + " sq in, which takes " + openings_for_area + " opening" + (openings_for_area === 1 ? "" : "s") + " at " + nfa + " sq in each. "
        + (count_governed_by_minimum ? "THE TWO-OPENING MINIMUM GOVERNS HERE, not the area: the square inches would be satisfied by " + openings_for_area + ", and the rule still demands 2. A single large vent is not compliant however generous it is, because the point is cross-flow rather than throughput. " : "")
        + "Requirement: " + openings_required + " openings and " + required_net_area_sqin.toFixed(0) + " sq in. Provided " + provided + " opening" + (provided === 1 ? "" : "s") + " giving " + provided_net_area_sqin.toFixed(0) + " sq in: "
        + (passes || (count_ok && area_ok) ? "adequate. " : (count_ok ? "" : "SHORT by " + openings_short + " opening" + (openings_short === 1 ? "" : "s") + ". ") + (area_ok ? "" : "SHORT by " + net_area_deficit_sqin.toFixed(0) + " sq in of net area. ")))
    + "HEIGHT: the ONE FOOT is measured to the BOTTOM of the opening, not the top and not the centre, so a vent set in the second course of block is usually already too high before anyone measures. Entered " + bottom + " in: " + (height_ok ? "OK. " : "OVER by " + height_excess_in.toFixed(1) + " in, and no amount of extra net area fixes it - an opening above the water does nothing. ")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: which grade governs, where interior and exterior grades differ, which is a question for the floodplain administrator; the placement of openings, where FEMA guidance calls for them on at least two walls of each enclosed area so water can flow through rather than in; whether each separate enclosed area gets its own openings, which it must - a partition wall creates a second enclosure with its own requirement; whether the enclosure is used only for parking, access, or storage, since any other use is a different problem entirely; the alternative of a design certified by a registered professional engineer or architect, which 60.3(c)(5) permits in place of these criteria; screens, louvers, valves, and covers, which are allowed only if they permit AUTOMATIC entry and exit of floodwater, ruling out anything a person has to open; and the local floodplain ordinance, which is frequently stricter than the federal minimum. A vent-area screen, not a floodplain determination; 44 CFR 60.3 and the community's floodplain administrator govern.";

  return { required_net_area_sqin, provided_net_area_sqin, net_area_deficit_sqin, openings_for_area, openings_required, count_governed_by_minimum, count_ok, openings_short, area_ok, coverage_provided_sf, height_ok, height_excess_in, passes, note };
}

export const floodOpeningAreaExample = { inputs: { enclosed_area_sf: 1200, opening_type: "non-engineered", net_free_area_per_opening_sqin: 51, coverage_sf_per_opening: 0, openings_provided: 8, bottom_height_in: 16 } };

ACCESSIBILITY_RENDERERS["flood-opening-area"] = _simpleRenderer({
  citation: "Citation: 44 CFR 60.3(c)(5), the NFIP floodplain management criteria, a US federal regulation in the public domain. Fully enclosed areas below the lowest floor that are usable solely for parking of vehicles, building access, or storage in an area other than a basement, and which are subject to flooding, shall be designed to automatically equalize hydrostatic flood forces on exterior walls by allowing for the entry and exit of floodwaters; designs for meeting this requirement must either be certified by a registered professional engineer or architect or meet or exceed the following minimum criteria: a minimum of two openings having a total net area of not less than one square inch for every square foot of enclosed area subject to flooding shall be provided, the bottom of all openings shall be no higher than one foot above grade, and openings may be equipped with screens, louvers, valves, or other coverings or devices provided that they permit the automatic entry and exit of floodwaters. Engineered openings are certified for the square feet of enclosure each serves and the square-inch rule does not apply to them. Not checked: which grade governs where interior and exterior differ, the placement of openings on separate walls, whether each enclosed area has its own openings, the use of the enclosure, the certified-design alternative, whether coverings permit automatic entry and exit, or the local floodplain ordinance, which is frequently stricter. A vent-area screen, not a floodplain determination.",
  example: floodOpeningAreaExample.inputs,
  fields: [
    { key: "enclosed_area_sf", label: "Enclosed area subject to flooding (sq ft)", kind: "number" },
    { key: "opening_type", label: "Opening type", kind: "select", options: [{ value: "non-engineered", label: "Non-engineered (rated in net free area)", selected: true }, { value: "engineered", label: "Engineered (certified by coverage area)" }] },
    { key: "net_free_area_per_opening_sqin", label: "NET free area per opening (sq in, from the product listing)", kind: "number" },
    { key: "coverage_sf_per_opening", label: "Engineered: certified coverage per opening (sq ft)", kind: "number" },
    { key: "openings_provided", label: "Openings provided", kind: "number" },
    { key: "bottom_height_in", label: "Height above grade to the BOTTOM of the openings (in)", kind: "number" },
  ],
  outputs: [
    { key: "a", id: "foa-out-a", label: "Net area required", value: (r) => r.required_net_area_sqin === null ? "not applicable - engineered openings are rated by coverage" : fmt(r.required_net_area_sqin, 0) + " sq in; provided " + fmt(r.provided_net_area_sqin, 0) + (r.area_ok ? "" : " (short " + fmt(r.net_area_deficit_sqin, 0) + ")") },
    { key: "c", id: "foa-out-c", label: "Openings required", value: (r) => r.openings_required + (r.count_governed_by_minimum ? " - the two-opening minimum governs, not the area" : "") + "; provided " + (r.count_ok ? "enough" : "short by " + r.openings_short) },
    { key: "g", id: "foa-out-g", label: "Coverage (engineered)", value: (r) => r.coverage_provided_sf === null ? "not applicable" : fmt(r.coverage_provided_sf, 0) + " sq ft covered" },
    { key: "h", id: "foa-out-h", label: "Height to the BOTTOM of the openings", value: (r) => r.height_ok ? "within 12 in of grade" : "OVER by " + fmt(r.height_excess_in, 1) + " in - extra net area does not fix it" },
    { key: "v", id: "foa-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES the minimum criteria" : "DOES NOT PASS" },
    { key: "n", id: "foa-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeFloodOpeningArea,
});

// ===================== spec-v1175: ADA stair treads and risers (2010 ADA Standards 504) =====================

// The trap in one sentence: a stair that satisfies the building code can fail the ADA, and the
// usual builder's stair does. 504.2 wants risers 4 to 7 in and treads 11 in MINIMUM, where the
// IBC commonly allows a 7 in riser with an 11 in tread and the IRC as much as 7-3/4 in on a
// 10 in tread. So the ordinary residential-style flight - 7-3/4 and 10 - misses BOTH numbers,
// and the fix is not a trim adjustment: holding the same total rise, dropping to a 7 in riser
// adds treads, and each added tread adds 11 in of run.
// Three more rules ride along. Open risers are not permitted at all. The leading edge may have
// a radius of 1/2 in maximum. A nosing may project 1-1/2 in maximum over the tread below, and
// a riser may slope under the tread at 30 degrees maximum from vertical.
// dims: in { riser_height_in: L, tread_depth_in: L, total_rise_in: L, nosing_projection_in: L, leading_edge_radius_in: L } out: { risers_required: dimensionless, run_required_in: L, run_added_in: L, riser_deficit_in: L, tread_deficit_in: L, compliant_riser_in: L, run_as_built_in: L, risers_added: dimensionless, risers_as_built: dimensionless, treads_as_built: dimensionless, treads_required: dimensionless }
export function computeAdaStairCheck({ riser_height_in = 0, tread_depth_in = 0, total_rise_in = 0, open_risers = "no", nosing_projection_in = 0, leading_edge_radius_in = 0, riser_slope_deg = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const rise = Number(riser_height_in) || 0;
  const tread = Number(tread_depth_in) || 0;
  const total = Number(total_rise_in) || 0;
  const nose = Number(nosing_projection_in) || 0;
  const radius = Number(leading_edge_radius_in) || 0;
  const slope = Number(riser_slope_deg) || 0;
  const open = open_risers === "yes";
  if (open_risers !== "yes" && open_risers !== "no") return { error: "State whether the risers are open (yes or no)." };
  if (!(rise > 0)) return { error: "Riser height must be positive (in)." };
  if (!(tread > 0)) return { error: "Tread depth must be positive (in)." };
  if (!(total > 0)) return { error: "Total rise of the flight must be positive (in)." };
  if (nose < 0) return { error: "Nosing projection cannot be negative (in)." };
  if (radius < 0) return { error: "Leading-edge radius cannot be negative (in)." };
  if (slope < 0 || slope > 90) return { error: "Riser slope under the tread must be between 0 and 90 degrees from vertical." };

  const RISER_MIN = 4, RISER_MAX = 7, TREAD_MIN = 11;
  const RADIUS_MAX = 0.5, NOSE_MAX = 1.5, SLOPE_MAX = 30;

  const riser_ok = rise >= RISER_MIN - 1e-9 * Math.abs(RISER_MIN) && rise <= RISER_MAX + 1e-9 * Math.abs(RISER_MAX);
  const riser_too_tall = rise > RISER_MAX + 1e-9 * Math.abs(RISER_MAX);
  const riser_deficit_in = riser_too_tall ? rise - RISER_MAX : Math.max(0, RISER_MIN - rise);
  const tread_ok = tread >= TREAD_MIN - 1e-9 * Math.abs(TREAD_MIN);
  const tread_deficit_in = Math.max(0, TREAD_MIN - tread);

  const open_ok = !open;
  const radius_ok = radius <= RADIUS_MAX + 1e-9 * Math.abs(RADIUS_MAX);
  const nosing_ok = nose <= NOSE_MAX + 1e-9 * Math.abs(NOSE_MAX);
  const slope_ok = slope <= SLOPE_MAX + 1e-9 * Math.abs(SLOPE_MAX);

  // What holding the same total rise costs once the riser comes down to 7 in.
  const risers_as_built = Math.round(total / rise);
  const risers_required = Math.ceil(total / RISER_MAX - 1e-9);
  const compliant_riser_in = total / risers_required;
  const treads_as_built = Math.max(0, risers_as_built - 1);
  const treads_required = Math.max(0, risers_required - 1);
  const run_as_built_in = treads_as_built * tread;
  const run_required_in = treads_required * TREAD_MIN;
  const run_added_in = run_required_in - run_as_built_in;
  const risers_added = risers_required - risers_as_built;

  const passes = riser_ok && tread_ok && open_ok && radius_ok && nosing_ok && slope_ok;

  const note = "A STAIR THAT SATISFIES THE BUILDING CODE CAN FAIL THE ADA, and the usual builder's flight does. 504.2 wants risers 4 in minimum to 7 in MAXIMUM and treads 11 in MINIMUM. The IRC commonly allows 7-3/4 in on a 10 in tread, so an ordinary residential-style flight misses BOTH numbers at once. "
    + "Riser " + rise + " in: " + (riser_ok ? "within 4 to 7. " : riser_too_tall ? "OVER the 7 in maximum by " + riser_deficit_in.toFixed(2) + " in. " : "UNDER the 4 in minimum by " + riser_deficit_in.toFixed(2) + " in - a riser can be too SHORT, which catches shallow entry flights and transitions. ")
    + "Tread " + tread + " in: " + (tread_ok ? "meets the 11 in minimum. " : "SHORT by " + tread_deficit_in.toFixed(2) + " in. ")
    + "THE FIX IS NOT A TRIM ADJUSTMENT. Holding the same " + total + " in of total rise, a 7 in maximum riser takes " + risers_required + " risers at " + compliant_riser_in.toFixed(3) + " in each"
    + (risers_added > 0 ? " - " + risers_added + " more than the " + risers_as_built + " this flight has - and each added tread adds 11 in of run. " : ", the same count this flight has. ")
    + "Run goes from " + run_as_built_in.toFixed(1) + " in to " + run_required_in.toFixed(1) + " in" + (run_added_in > 0 ? ", " + run_added_in.toFixed(1) + " in (" + (run_added_in / 12).toFixed(2) + " ft) LONGER. That extra run is the real cost, and it is why an accessible stair rarely fits the opening a code stair was framed for. " : run_added_in < 0 ? ", which is " + (-run_added_in).toFixed(1) + " in shorter - this flight is already deeper than the minimum demands. " : ", unchanged. ")
    + "THREE MORE RULES RIDE ALONG. Open risers are NOT PERMITTED at all: " + (open ? "these are open, and that is not a dimension to adjust but a stair to rebuild. " : "these are closed. ") + "The leading edge may have a radius of 1/2 in maximum - entered " + radius + " in, " + (radius_ok ? "OK. " : "OVER. ") + "A nosing may project 1-1/2 in maximum over the tread below - entered " + nose + " in, " + (nosing_ok ? "OK. " : "OVER by " + (nose - NOSE_MAX).toFixed(2) + " in. ") + "And a riser may slope under the tread at 30 degrees maximum from vertical - entered " + slope + " degrees, " + (slope_ok ? "OK. " : "OVER. ")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: handrails, which 504.6 requires complying with 505 and which is a separate tile; the tread surface, which 504.4 ties to the floor-surface rules; landings, headroom, width, and the guard, which are building-code questions this section does not touch; uniformity of risers and treads within a flight, which the building code polices and which an inspector will measure; whether the stair is on an accessible route or is an alternative to an elevator, which decides whether 504 applies at all; and state and local accessibility law. A stair dimension screen, not a stair design; the 2010 ADA Standards, the adopted building code, and the authority having jurisdiction govern.";

  return { riser_ok, riser_too_tall, riser_deficit_in, tread_ok, tread_deficit_in, open_ok, radius_ok, nosing_ok, slope_ok, risers_as_built, risers_required, compliant_riser_in, risers_added, treads_as_built, treads_required, run_as_built_in, run_required_in, run_added_in, passes, note };
}

export const adaStairCheckExample = { inputs: { riser_height_in: 7.75, tread_depth_in: 10, total_rise_in: 108.5, open_risers: "no", nosing_projection_in: 1, leading_edge_radius_in: 0.25, riser_slope_deg: 0 } };

ACCESSIBILITY_RENDERERS["ada-stair-check"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 504.2, 504.3, 504.5, and 504.6. A US federal standard in the public domain. 504.2: risers shall be 4 in high minimum and 7 in high maximum, and treads shall be 11 in deep minimum. 504.3: open risers are not permitted. 504.5: the radius of curvature at the leading edge of the tread shall be 1/2 in maximum; nosings that project beyond risers shall have the underside of the leading edge curved or beveled, risers shall be permitted to slope under the tread at an angle of 30 degrees maximum from vertical, and the permitted projection of the nosing shall extend 1 1/2 in maximum over the tread below. 504.6: stairs shall have handrails complying with 505. Not checked: handrails, which are a separate tile; the tread surface under 504.4; landings, headroom, width, and guards, which are building-code questions; uniformity of risers and treads within a flight; whether the stair is on an accessible route or serves as an alternative to an elevator, which decides whether 504 applies; or state and local law. A stair dimension screen, not a stair design.",
  example: adaStairCheckExample.inputs,
  fields: [
    { key: "riser_height_in", label: "Riser height (in)", kind: "number" },
    { key: "tread_depth_in", label: "Tread depth (in)", kind: "number" },
    { key: "total_rise_in", label: "Total rise of the flight (in)", kind: "number" },
    { key: "open_risers", label: "Open risers?", kind: "select", options: [{ value: "no", label: "No - closed", selected: true }, { value: "yes", label: "Yes - open" }] },
    { key: "nosing_projection_in", label: "Nosing projection over the tread below (in)", kind: "number" },
    { key: "leading_edge_radius_in", label: "Radius at the leading edge (in)", kind: "number" },
    { key: "riser_slope_deg", label: "Riser slope under the tread (degrees from vertical)", kind: "number" },
  ],
  outputs: [
    { key: "r", id: "asc-out-r", label: "Riser (4 to 7 in)", value: (r) => r.riser_ok ? "within range" : r.riser_too_tall ? "OVER by " + fmt(r.riser_deficit_in, 2) + " in" : "under the 4 in minimum by " + fmt(r.riser_deficit_in, 2) + " in" },
    { key: "t", id: "asc-out-t", label: "Tread (11 in min)", value: (r) => r.tread_ok ? "meets the minimum" : "short by " + fmt(r.tread_deficit_in, 2) + " in" },
    { key: "c", id: "asc-out-c", label: "What compliance costs", value: (r) => r.risers_required + " risers at " + fmt(r.compliant_riser_in, 3) + " in (" + (r.risers_added > 0 ? "+" + r.risers_added : "no change") + "); run " + fmt(r.run_as_built_in, 1) + " to " + fmt(r.run_required_in, 1) + " in" + (r.run_added_in > 0 ? " (+" + fmt(r.run_added_in / 12, 2) + " ft)" : "") },
    { key: "o", id: "asc-out-o", label: "Open risers", value: (r) => r.open_ok ? "closed - OK" : "OPEN - not permitted at all" },
    { key: "d", id: "asc-out-d", label: "Nosing details", value: (r) => [r.radius_ok ? null : "leading-edge radius over 1/2 in", r.nosing_ok ? null : "projection over 1 1/2 in", r.slope_ok ? null : "riser slope over 30 degrees"].filter(Boolean).join(", ") || "radius, projection, and riser slope all within limits" },
    { key: "v", id: "asc-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES 504" : "DOES NOT PASS" },
    { key: "n", id: "asc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAdaStairCheck,
});

// ===================== spec-v1176: tactile sign mounting (2010 ADA Standards 703.4) =====================

// The rule reads like a range and is not one. 703.4.1 is TWO measurements taken from TWO
// different characters: 48 in minimum from the baseline of the LOWEST tactile character, and
// 60 in maximum from the baseline of the HIGHEST. A tall sign therefore has a usable window
// far narrower than 12 in, and a sign whose tactile block is more than 12 in tall cannot be
// mounted compliantly at all - no height satisfies both ends at once.
// 703.4.2 puts it alongside the door at the LATCH side, not on the door, because a person
// reading it has to stand still while the door stays shut. And the 18 x 18 in clear floor space
// must sit beyond the arc of the door swing between closed and 45 degrees open, which is what
// rules out the wall a door swings back against.
// dims: in { lowest_baseline_in: L, tactile_block_height_in: L, clear_space_width_in: L, clear_space_depth_in: L } out: { highest_baseline_in: L, window_height_in: L, lowest_min_in: L, lowest_max_in: L, high_excess_in: L, low_deficit_in: L, space_deficit_in: L, usable_range_in: L }
export function computeTactileSignMounting({ lowest_baseline_in = 0, tactile_block_height_in = 0, sign_position = "latch-side", clear_space_width_in = 0, clear_space_depth_in = 0, beyond_door_arc = "yes" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const low = Number(lowest_baseline_in) || 0;
  const block = Number(tactile_block_height_in);
  const w = Number(clear_space_width_in) || 0;
  const d = Number(clear_space_depth_in) || 0;
  const beyond = beyond_door_arc === "yes";
  const POSITIONS = { "latch-side": "alongside the door at the latch side", "on-door": "on the door leaf itself", "hinge-side": "alongside the door at the hinge side", "inactive-leaf": "on the inactive leaf of a pair with one active leaf", "right-of-right": "to the right of the right-hand door of a pair with two active leaves", "push-side-closer": "on the push side of a door with a closer and no hold-open device" };
  if (!(sign_position in POSITIONS)) return { error: "Sign position must be latch-side, on-door, hinge-side, inactive-leaf, right-of-right, or push-side-closer." };
  if (beyond_door_arc !== "yes" && beyond_door_arc !== "no") return { error: "State whether the clear floor space sits beyond the door swing arc (yes or no)." };
  if (!(low > 0)) return { error: "Baseline height of the lowest tactile character must be positive (in)." };
  if (!Number.isFinite(block) || block < 0) return { error: "Height of the tactile character block must be zero or more (in)." };
  if (!(w > 0) || !(d > 0)) return { error: "Clear floor space width and depth must be positive (in)." };

  const LOW_MIN = 48, HIGH_MAX = 60, SPACE_MIN = 18;
  const highest_baseline_in = low + block;
  const window_height_in = HIGH_MAX - LOW_MIN;
  const mountable = block <= window_height_in;
  const lowest_min_in = LOW_MIN;
  const lowest_max_in = mountable ? HIGH_MAX - block : null;

  const low_ok = low >= LOW_MIN - 1e-9 * Math.abs(LOW_MIN);
  const high_ok = highest_baseline_in <= HIGH_MAX + 1e-9 * Math.abs(HIGH_MAX);
  const low_deficit_in = Math.max(0, LOW_MIN - low);
  const high_excess_in = Math.max(0, highest_baseline_in - HIGH_MAX);
  const height_ok = low_ok && high_ok;
  const usable_range_in = mountable ? lowest_max_in - lowest_min_in : 0;

  // 703.4.2 Exception: a tactile sign is permitted on the push side of a door with a closer and
  // without a hold-open device (added 2026-10-03; before, every on-leaf sign failed).
  const position_ok = sign_position !== "on-door" && sign_position !== "hinge-side";
  const space_size_ok = w >= SPACE_MIN - 1e-9 * Math.abs(SPACE_MIN) && d >= SPACE_MIN - 1e-9 * Math.abs(SPACE_MIN);
  const space_ok = space_size_ok && beyond;
  const space_deficit_in = Math.max(0, SPACE_MIN - Math.min(w, d));

  const passes = height_ok && mountable && position_ok && space_ok;

  const note = "IT READS LIKE A RANGE AND IT IS NOT ONE. 703.4.1 is TWO measurements taken from TWO different characters: 48 in minimum from the baseline of the LOWEST tactile character, and 60 in maximum from the baseline of the HIGHEST. "
    + "With a tactile block " + block + " in tall, the lowest baseline may sit between " + lowest_min_in + " in and " + (mountable ? lowest_max_in.toFixed(2) + " in - a usable window of " + usable_range_in.toFixed(2) + " in" + (block > 0 ? ", not the 12 in the two numbers suggest" : "") + ". " : "nothing, because the block is taller than the 12 in the two limits leave. ")
    + (mountable ? "" : "A SIGN WHOSE TACTILE BLOCK EXCEEDS 12 IN CANNOT BE MOUNTED COMPLIANTLY AT ALL - no height satisfies both ends at once, and the answer is a shorter sign or fewer tactile lines rather than a different height. ")
    + "Entered: lowest baseline " + low + " in, highest " + highest_baseline_in.toFixed(2) + " in. "
    + (height_ok ? "Both ends are satisfied. " : (low_ok ? "" : "The LOWEST baseline is " + low_deficit_in.toFixed(2) + " in under 48. ") + (high_ok ? "" : "The HIGHEST baseline is " + high_excess_in.toFixed(2) + " in over 60. "))
    + "POSITION (703.4.2): " + POSITIONS[sign_position] + ". "
    + (sign_position === "on-door" ? "A tactile sign at a door goes ALONGSIDE the door at the latch side, not on the leaf - because a person reading it has to stand still while the door stays shut, and a sign on the door moves away the moment anyone opens it. The one exception (703.4.2) is the push side of a door with a closer and no hold-open device, which a reader faces while it stays shut. " : sign_position === "hinge-side" ? "The latch side is specified, not either side: the hinge side puts a reader in the swing of the door. " : "")
    + "CLEAR FLOOR SPACE: 18 x 18 in minimum, centered on the tactile characters, and BEYOND THE ARC of any door swing between the closed position and 45 degrees open. Entered " + w + " x " + d + " in, " + (beyond ? "clear of the swing. " : "INSIDE the swing arc - which is what rules out the wall a door swings back against, and it is a location problem rather than a size problem. ")
    + (space_size_ok ? "" : "The space is " + space_deficit_in.toFixed(2) + " in short on its smaller dimension. ")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: whether this sign needs tactile characters at all, which turns on what it identifies - a room designation needs them, a directional sign does not; raised character height, style, case, and the requirement that they be duplicated in Braille with its own position and spacing rules; visual character requirements, which are a separate section and a separate tile; pictograms and their fields; finish, contrast, and glare; signs at doors to exits and stairs, which carry additional content requirements; and state and local accessibility law. A mounting screen, not a signage package; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { highest_baseline_in, window_height_in, mountable, lowest_min_in, lowest_max_in, usable_range_in, low_ok, high_ok, low_deficit_in, high_excess_in, height_ok, position_ok, space_size_ok, space_deficit_in, beyond_arc: beyond, space_ok, passes, note };
}

export const tactileSignMountingExample = { inputs: { lowest_baseline_in: 60, tactile_block_height_in: 4, sign_position: "latch-side", clear_space_width_in: 18, clear_space_depth_in: 18, beyond_door_arc: "yes" } };

ACCESSIBILITY_RENDERERS["tactile-sign-mounting"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 703.4.1 and 703.4.2. A US federal standard in the public domain. 703.4.1: tactile characters on signs shall be located 48 in minimum above the finish floor or ground surface, measured from the baseline of the lowest tactile character, and 60 in maximum above the finish floor or ground surface, measured from the baseline of the highest tactile character. 703.4.2: where a tactile sign is provided at a door, the sign shall be located alongside the door at the latch side; where provided at double doors with one active leaf, the sign shall be located on the inactive leaf; where provided at double doors with two active leaves, the sign shall be located to the right of the right hand door; and signs containing tactile characters shall be located so that a clear floor space of 18 in minimum by 18 in minimum, centered on the tactile characters, is provided beyond the arc of any door swing between the closed position and 45 degree open position. Not checked: whether the sign requires tactile characters at all, raised character height and style, Braille and its own position and spacing rules, visual character requirements, pictograms, finish and contrast, additional content requirements at exits and stairs, or state and local law. A mounting screen, not a signage package.",
  example: tactileSignMountingExample.inputs,
  fields: [
    { key: "lowest_baseline_in", label: "Baseline of the LOWEST tactile character (in above the floor)", kind: "number" },
    { key: "tactile_block_height_in", label: "Height from the lowest baseline to the highest (in)", kind: "number" },
    { key: "sign_position", label: "Where the sign is mounted", kind: "select", options: [{ value: "latch-side", label: "Alongside the door, latch side", selected: true }, { value: "on-door", label: "On the door leaf" }, { value: "hinge-side", label: "Alongside the door, hinge side" }, { value: "inactive-leaf", label: "On the inactive leaf (pair, one active)" }, { value: "right-of-right", label: "Right of the right-hand door (pair, two active)" }, { value: "push-side-closer", label: "On the push side of a door with a closer, no hold-open" }] },
    { key: "clear_space_width_in", label: "Clear floor space width (in)", kind: "number" },
    { key: "clear_space_depth_in", label: "Clear floor space depth (in)", kind: "number" },
    { key: "beyond_door_arc", label: "Clear floor space beyond the door swing arc?", kind: "select", options: [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }] },
  ],
  outputs: [
    { key: "w", id: "tsm-out-w", label: "Where the lowest baseline may sit", value: (r) => !r.mountable ? "nowhere - the tactile block is taller than the 12 in the two limits leave" : r.lowest_min_in + " to " + fmt(r.lowest_max_in, 2) + " in, a usable window of " + fmt(r.usable_range_in, 2) + " in" },
    { key: "h", id: "tsm-out-h", label: "Heights as entered", value: (r) => "lowest " + (r.low_ok ? "OK" : "under 48 by " + fmt(r.low_deficit_in, 2)) + "; highest " + fmt(r.highest_baseline_in, 2) + " in " + (r.high_ok ? "OK" : "over 60 by " + fmt(r.high_excess_in, 2)) },
    { key: "p", id: "tsm-out-p", label: "Position", value: (r) => r.position_ok ? "acceptable under 703.4.2" : "NOT acceptable - the sign goes alongside the door at the latch side" },
    { key: "s", id: "tsm-out-s", label: "Clear floor space", value: (r) => r.space_ok ? "18 x 18 in and clear of the swing" : [r.space_size_ok ? null : "short by " + fmt(r.space_deficit_in, 2) + " in", r.beyond_arc ? null : "inside the door swing arc"].filter(Boolean).join(", ") },
    { key: "v", id: "tsm-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES the items entered" : "DOES NOT PASS" },
    { key: "n", id: "tsm-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeTactileSignMounting,
});

// ===================== spec-v1177: drinking fountain heights and count (2010 ADA Standards 211, 602) =====================

// One fountain is never enough. 211.2 requires no fewer than TWO: one for a person seated in a
// wheelchair (602.1 through 602.6) and one for a person standing (602.7). A single unit counts
// for both only if it complies with BOTH sets - which is what a hi-lo bi-level fountain is, and
// why a single ordinary fountain, however well mounted, satisfies neither half of the rule.
// The two heights are opposite ends: the wheelchair spout is 36 in MAXIMUM and the standing
// spout is 38 in MINIMUM to 43 in maximum. A single spout at 37 in is out of both windows.
// Two location rules ride along and get skipped: the spout must be at least 15 in from the
// vertical support and not more than 5 in from the front edge INCLUDING BUMPERS, and the stream
// must rise 4 in minimum so a cup can be filled under it.
// dims: in { wheelchair_spout_in: L, standing_spout_in: L, spout_from_support_in: L, spout_from_front_in: L, water_flow_height_in: L } out: { wheelchair_excess_in: L, standing_deficit_in: L, support_deficit_in: L, front_excess_in: L, dead_band_high_in: L, dead_band_low_in: L, flow_deficit_in: L, units_short: dimensionless }
export function computeDrinkingFountainCheck({ units_provided = 0, bi_level = "no", wheelchair_spout_in = 0, standing_spout_in = 0, spout_from_support_in = 0, spout_from_front_in = 0, water_flow_height_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const units = Number(units_provided) || 0;
  const wc = Number(wheelchair_spout_in) || 0;
  const st = Number(standing_spout_in) || 0;
  const sup = Number(spout_from_support_in) || 0;
  const front = Number(spout_from_front_in) || 0;
  const flow = Number(water_flow_height_in) || 0;
  const bi = bi_level === "yes";
  if (bi_level !== "yes" && bi_level !== "no") return { error: "State whether the unit is bi-level, complying with both height sets (yes or no)." };
  if (!Number.isInteger(units) || units < 1) return { error: "Units provided must be a whole number, one or more." };
  if (!(wc > 0)) return { error: "Wheelchair-height spout outlet must be positive (in)." };
  if (!(st > 0)) return { error: "Standing-height spout outlet must be positive (in) - enter the same value as the wheelchair spout for a single-height unit." };
  if (sup < 0) return { error: "Distance from the vertical support cannot be negative (in)." };
  if (front < 0) return { error: "Distance from the front edge cannot be negative (in)." };
  if (flow < 0) return { error: "Water flow height cannot be negative (in)." };

  const WC_MAX = 36, STAND_MIN = 38, STAND_MAX = 43;
  const SUPPORT_MIN = 15, FRONT_MAX = 5, FLOW_MIN = 4;

  const wheelchair_ok = wc <= WC_MAX + 1e-9 * Math.abs(WC_MAX);
  const wheelchair_excess_in = Math.max(0, wc - WC_MAX);
  const standing_ok = st >= STAND_MIN - 1e-9 * Math.abs(STAND_MIN) && st <= STAND_MAX + 1e-9 * Math.abs(STAND_MAX);
  const standing_too_low = st < STAND_MIN - 1e-9 * Math.abs(STAND_MIN);
  const standing_deficit_in = standing_too_low ? STAND_MIN - st : Math.max(0, st - STAND_MAX);
  // The dead band between the two windows: 36 to 38 in satisfies neither.
  const dead_band_low_in = WC_MAX, dead_band_high_in = STAND_MIN;
  const single_height = Math.abs(wc - st) < 1e-9;
  const in_dead_band = single_height && wc > WC_MAX && wc < STAND_MIN;

  // 211.2: two units, or one bi-level unit that complies with both.
  const count_ok = units >= 2 - 1e-9 * Math.abs(2) || (units === 1 && bi);
  const substitution_used = units === 1 && bi;
  const units_short = count_ok ? 0 : 2 - units;

  const support_ok = sup >= SUPPORT_MIN - 1e-9 * Math.abs(SUPPORT_MIN);
  const support_deficit_in = Math.max(0, SUPPORT_MIN - sup);
  const front_ok = front <= FRONT_MAX + 1e-9 * Math.abs(FRONT_MAX);
  const front_excess_in = Math.max(0, front - FRONT_MAX);
  const flow_ok = flow >= FLOW_MIN - 1e-9 * Math.abs(FLOW_MIN);
  const flow_deficit_in = Math.max(0, FLOW_MIN - flow);

  const passes = count_ok && wheelchair_ok && standing_ok && support_ok && front_ok && flow_ok;

  const note = "ONE FOUNTAIN IS NEVER ENOUGH. 211.2 requires no fewer than TWO: one complying with 602.1 through 602.6, for a person seated in a wheelchair, and one complying with 602.7, for a person standing. A single unit substitutes for both ONLY if it complies with both sets - which is what a bi-level hi-lo fountain is, and why one ordinary fountain, however carefully mounted, satisfies neither half of the requirement. "
    + units + " unit" + (units === 1 ? "" : "s") + " provided" + (bi ? ", bi-level" : "") + ": " + (count_ok ? (substitution_used ? "the single-unit substitution applies. " : "the count is met. ") : "SHORT by " + units_short + " - a single non-bi-level fountain is not a compliant installation whatever its height. ")
    + "THE TWO HEIGHTS ARE OPPOSITE ENDS, and the gap between them is real: the wheelchair spout outlet is 36 in MAXIMUM and the standing spout is 38 in MINIMUM to 43 in maximum. Nothing between 36 and 38 in satisfies either. "
    + "Wheelchair spout " + wc + " in: " + (wheelchair_ok ? "OK. " : "OVER by " + wheelchair_excess_in.toFixed(2) + " in. ")
    + "Standing spout " + st + " in: " + (standing_ok ? "OK. " : standing_too_low ? "UNDER the 38 in minimum by " + standing_deficit_in.toFixed(2) + " in - a standing fountain can be too LOW, which is the half people never check because low reads as accessible. " : "OVER the 43 in maximum by " + standing_deficit_in.toFixed(2) + " in. ")
    + (in_dead_band ? "BOTH SPOUTS ARE AT THE SAME HEIGHT AND THAT HEIGHT IS IN THE DEAD BAND between " + dead_band_low_in + " and " + dead_band_high_in + " in, so this installation satisfies NEITHER window - the classic single fountain set at a comfortable-looking height. " : single_height ? "Both spouts are at the same height, so this is a single-height unit and only one of the two windows can be satisfied. " : "")
    + "TWO LOCATION RULES GET SKIPPED. The spout must be at least 15 in from the VERTICAL SUPPORT - entered " + sup + " in, " + (support_ok ? "OK" : "SHORT by " + support_deficit_in.toFixed(2) + " in") + " - and not more than 5 in from the front edge of the unit INCLUDING BUMPERS, which is the phrase that catches a retrofit: entered " + front + " in, " + (front_ok ? "OK. " : "OVER by " + front_excess_in.toFixed(2) + " in, and bumpers added later can push a compliant fountain out of tolerance without anyone touching the plumbing. ")
    + "The stream must rise 4 in minimum so a cup can be filled under it - entered " + flow + " in, " + (flow_ok ? "OK. " : "SHORT by " + flow_deficit_in.toFixed(2) + " in. ")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: the clear floor space and forward approach the wheelchair unit needs, and the knee and toe clearance under it, which are separate tiles (knee-toe-clearance checks the knee and toe space); the angle of the water stream, which the standard limits differently depending on how far the spout sits from the front; controls and their operating force and one-hand operation; whether drinking fountains are provided at all, and where more than the minimum are provided, the further requirement that they be distributed; wall-hung units as protruding objects, which is a separate section and a frequent failure at the same fixture; bottle fillers, which do not substitute for either unit; and state and local accessibility law and the plumbing code's own fixture counts. A fixture screen, not a rough-in; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { count_ok, substitution_used, units_short, wheelchair_ok, wheelchair_excess_in, standing_ok, standing_too_low, standing_deficit_in, single_height, in_dead_band, dead_band_low_in, dead_band_high_in, support_ok, support_deficit_in, front_ok, front_excess_in, flow_ok, flow_deficit_in, passes, note };
}

export const drinkingFountainCheckExample = { inputs: { units_provided: 1, bi_level: "no", wheelchair_spout_in: 37, standing_spout_in: 37, spout_from_support_in: 15, spout_from_front_in: 5, water_flow_height_in: 4 } };

ACCESSIBILITY_RENDERERS["drinking-fountain-check"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 211.2, 602.4, 602.5, 602.6, and 602.7. A US federal standard in the public domain. 211.2: no fewer than two drinking fountains shall be provided; one drinking fountain shall comply with 602.1 through 602.6 and one drinking fountain shall comply with 602.7; exception - where a single drinking fountain complies with 602.1 through 602.6 and 602.7, it shall be permitted to be substituted for two separate drinking fountains. 602.4: spout outlets shall be 36 in maximum above the finish floor or ground. 602.5: the spout shall be located 15 in minimum from the vertical support and 5 in maximum from the front edge of the unit, including bumpers. 602.6: the spout shall provide a flow of water 4 in high minimum. 602.7: spout outlets of drinking fountains for standing persons shall be 38 in minimum and 43 in maximum above the finish floor or ground. Not checked: clear floor space and knee and toe clearance at the wheelchair unit, which are separate tiles (knee-toe-clearance checks the knee and toe space); the angle of the water stream; controls and their operation; whether fountains are provided at all and the distribution required where more than the minimum are provided; wall-hung units as protruding objects; bottle fillers, which do not substitute for either unit; or state and local law and the plumbing code's fixture counts. A fixture screen, not a rough-in.",
  example: drinkingFountainCheckExample.inputs,
  fields: [
    { key: "units_provided", label: "Drinking fountains provided at this location", kind: "number" },
    { key: "bi_level", label: "Bi-level unit complying with both height sets?", kind: "select", options: [{ value: "no", label: "No", selected: true }, { value: "yes", label: "Yes" }] },
    { key: "wheelchair_spout_in", label: "Wheelchair-height spout outlet (in above the floor)", kind: "number" },
    { key: "standing_spout_in", label: "Standing-height spout outlet (in above the floor)", kind: "number" },
    { key: "spout_from_support_in", label: "Spout distance from the vertical support (in)", kind: "number" },
    { key: "spout_from_front_in", label: "Spout distance from the front edge, including bumpers (in)", kind: "number" },
    { key: "water_flow_height_in", label: "Height of the water stream (in)", kind: "number" },
  ],
  outputs: [
    { key: "c", id: "dfc-out-c", label: "Count", value: (r) => r.count_ok ? (r.substitution_used ? "one bi-level unit, substituting for two" : "two or more provided") : "SHORT by " + r.units_short + " - one ordinary fountain is never compliant" },
    { key: "w", id: "dfc-out-w", label: "Wheelchair spout (36 in max)", value: (r) => r.wheelchair_ok ? "OK" : "over by " + fmt(r.wheelchair_excess_in, 2) + " in" },
    { key: "s", id: "dfc-out-s", label: "Standing spout (38 to 43 in)", value: (r) => r.standing_ok ? "OK" : r.standing_too_low ? "UNDER 38 in by " + fmt(r.standing_deficit_in, 2) + " in" : "over 43 in by " + fmt(r.standing_deficit_in, 2) + " in" },
    { key: "d", id: "dfc-out-d", label: "The dead band", value: (r) => r.in_dead_band ? "both spouts sit between " + r.dead_band_low_in + " and " + r.dead_band_high_in + " in, satisfying NEITHER window" : "not in the " + r.dead_band_low_in + " to " + r.dead_band_high_in + " in gap" },
    { key: "l", id: "dfc-out-l", label: "Spout location and flow", value: (r) => [r.support_ok ? null : "under 15 in from the support", r.front_ok ? null : "over 5 in from the front edge", r.flow_ok ? null : "stream under 4 in"].filter(Boolean).join(", ") || "support distance, front distance, and stream height all met" },
    { key: "v", id: "dfc-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES the items entered" : "DOES NOT PASS" },
    { key: "n", id: "dfc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeDrinkingFountainCheck,
});

// ===================== spec-v1178: accessible shower compartments (2010 ADA Standards 608.2) =====================

// Three shower types with three different geometries, and picking the wrong one is what puts a
// bathroom remodel a foot short in the wrong direction.
// TRANSFER: 36 x 36 in clear inside, a 36 in wide entry, and a 36 x 48 in clearance OUTSIDE
// extending from the control wall - the small stall, and the one whose exterior clearance is
// deeper than the stall itself.
// STANDARD ROLL-IN: 30 x 60 in clear inside with a 60 in wide entry - the entry is the WHOLE
// long side, which is what a curb, a jamb, or a door defeats.
// ALTERNATE ROLL-IN: 36 x 60 in inside with a 36 in wide entry on one long side.
// The transfer type is the only one that fits in a standard 36 in alcove, and the roll-in types
// are the ones people draw at 32 or 34 in wide because that is what the tub was.
// dims: in { width_in: L, depth_in: L, entry_width_in: L, clearance_width_in: L, clearance_length_in: L } out: { required_width_in: L, required_depth_in: L, required_entry_in: L, width_deficit_in: L, clearance_length_deficit_in: L, clearance_width_deficit_in: L, depth_deficit_in: L, entry_deficit_in: L, inside_area_sf: L^2, required_clearance_length_in: L, required_clearance_width_in: L, total_footprint_sf: L^2 }
export function computeAccessibleShowerCheck({ shower_type = "transfer", width_in = 0, depth_in = 0, entry_width_in = 0, clearance_width_in = 0, clearance_length_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(width_in) || 0;
  const d = Number(depth_in) || 0;
  const e = Number(entry_width_in) || 0;
  const cw = Number(clearance_width_in) || 0;
  const cl = Number(clearance_length_in) || 0;
  // [label, width, depth, entry, clearance width, clearance length]
  const TYPES = {
    transfer: ["transfer type", 36, 36, 36, 36, 48],
    "standard-roll-in": ["standard roll-in type", 30, 60, 60, 30, 60],
    "alternate-roll-in": ["alternate roll-in type", 36, 60, 36, 30, 60],
  };
  if (!(shower_type in TYPES)) return { error: "Shower type must be transfer, standard-roll-in, or alternate-roll-in." };
  if (!(w > 0) || !(d > 0)) return { error: "Compartment width and depth must be positive (in)." };
  if (!(e > 0)) return { error: "Entry width must be positive (in)." };
  if (cw < 0 || cl < 0) return { error: "Clearance dimensions cannot be negative (in)." };

  const [type_label, reqW, reqD, reqE, reqCW, reqCL] = TYPES[shower_type];
  const is_transfer = shower_type === "transfer";

  // 608.2.1: a transfer stall is 36 x 36 in, an absolute dimension (only its entry is a
  // minimum), held here to a 1/2 in construction tolerance (104.1.1); a bigger stall puts the
  // seat and the control wall out of reach. The roll-in types are minimums, and either
  // orientation is the same stall. Until 2026-10-03 a 48 x 48 "transfer" stall passed and a
  // 60 x 30 standard roll-in failed while the tile's own fits list named it.
  const TRANSFER_TOL_IN = 0.5;
  const minOk = (v, req) => v >= req - 1e-9 * Math.abs(req);
  const exactOk = (v, req) => Math.abs(v - req) <= TRANSFER_TOL_IN + 1e-9;
  const rotated = !is_transfer && !(minOk(w, reqW) && minOk(d, reqD)) && minOk(d, reqW) && minOk(w, reqD);
  const width_ok = is_transfer ? exactOk(w, reqW) : rotated ? true : minOk(w, reqW);
  const depth_ok = is_transfer ? exactOk(d, reqD) : rotated ? true : minOk(d, reqD);
  const entry_ok = minOk(e, reqE);
  const width_deficit_in = Math.max(0, reqW - w);
  const depth_deficit_in = Math.max(0, reqD - d);
  const entry_deficit_in = Math.max(0, reqE - e);
  const inside_ok = width_ok && depth_ok && entry_ok;

  const clearance_entered = cw > 0 || cl > 0;
  const clearance_width_ok = clearance_entered ? cw >= reqCW - 1e-9 * Math.abs(reqCW) : null;
  const clearance_length_ok = clearance_entered ? cl >= reqCL - 1e-9 * Math.abs(reqCL) : null;
  const clearance_ok = clearance_entered ? (clearance_width_ok && clearance_length_ok) : null;
  const clearance_width_deficit_in = clearance_entered ? Math.max(0, reqCW - cw) : null;
  const clearance_length_deficit_in = clearance_entered ? Math.max(0, reqCL - cl) : null;

  // The footprint the stall itself takes, and the total with the clearance in front.
  const inside_area_sf = (reqW * reqD) / 144;
  const total_footprint_sf = (reqW * reqD + reqCW * reqCL) / 144;

  // Which of the three this compartment would satisfy as built, so the answer is not just "no".
  const fits = [];
  for (const [key, [label, tw, td, te]] of Object.entries(TYPES)) {
    if (key === "transfer") { if (exactOk(w, tw) && exactOk(d, td) && minOk(e, te)) fits.push(label); continue; }
    if (w >= tw && d >= td && e >= te) fits.push(label);
    else if (d >= tw && w >= td && e >= te) fits.push(label + " rotated");
  }

  const passes = inside_ok && (clearance_ok !== false);

  const note = "THREE TYPES, THREE GEOMETRIES, and picking the wrong one is what puts a remodel a foot short in the wrong direction. This is the " + type_label + ": " + reqW + " x " + reqD + " in clear inside, a " + reqE + " in wide entry, and a " + reqCW + " x " + reqCL + " in clearance outside it. "
    + (is_transfer ? "THE TRANSFER TYPE IS THE SMALL ONE - a 36 in square, which is the only one of the three that fits a standard 36 in alcove where a tub used to be. What surprises people is its OUTSIDE clearance: 36 x 48 in extending from the CONTROL WALL, deeper than the stall itself, so the fixture is small and the room it needs is not. "
      : shower_type === "standard-roll-in" ? "THE STANDARD ROLL-IN ENTRY IS THE WHOLE LONG SIDE: 60 in wide minimum on a 60 in compartment, which means no curb, no jamb, and no door narrowing it. A 30 in deep stall reads as tight on a plan and is correct; what defeats it is anything built across the opening. "
      : "THE ALTERNATE ROLL-IN trades depth of entry for width of stall: 36 x 60 in inside with a 36 in entry on one LONG side, which is the type that fits where a 60 in tub was and a full-width opening is impossible. ")
    + "Entered " + w + " x " + d + " in with a " + e + " in entry: "
    + (inside_ok ? "the inside dimensions and entry are met. " : (width_ok ? "" : width_deficit_in > 0 ? "WIDTH short by " + width_deficit_in.toFixed(1) + " in. " : "WIDTH " + w + " in, but a transfer stall is 36 in, not a minimum. ") + (depth_ok ? "" : depth_deficit_in > 0 ? "DEPTH short by " + depth_deficit_in.toFixed(1) + " in. " : "DEPTH " + d + " in, but a transfer stall is 36 in, not a minimum. ") + (entry_ok ? "" : "ENTRY short by " + entry_deficit_in.toFixed(1) + " in. "))
    + (fits.length > 0 ? "AS BUILT THIS COMPARTMENT WOULD SATISFY: " + fits.join(", ") + " - worth knowing before it is torn out, because a stall that fails one type often meets another. " : "As built this compartment satisfies none of the three types in any orientation. ")
    + (clearance_entered
      ? "CLEARANCE OUTSIDE: " + reqCW + " x " + reqCL + " in required" + (is_transfer ? ", extending from the control wall" : ", adjacent to the open face") + ". Entered " + cw + " x " + cl + " in: " + (clearance_ok ? "OK. " : (clearance_width_ok ? "" : "width short by " + clearance_width_deficit_in.toFixed(1) + " in. ") + (clearance_length_ok ? "" : "length short by " + clearance_length_deficit_in.toFixed(1) + " in. "))
      : "No outside clearance entered, so it is not checked - but it is required, and on the transfer type it is the dimension that decides whether the room works. ")
    + "The stall alone is " + inside_area_sf.toFixed(2) + " sq ft; with its clearance the footprint is " + total_footprint_sf.toFixed(2) + " sq ft. "
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: grab bars, which differ by type and are the reason the three are not interchangeable; the seat, which a transfer shower requires and a standard roll-in requires only in some configurations; controls, faucets, and the hand shower, whose location is tied to the seat and the entry; thresholds and the 1/2 in limit on a roll-in curb; the shower spray unit, hose length, and the fixed-head option; enclosures, which may not obstruct transfer or the clear floor space; drainage and slope; and state and local accessibility law and the plumbing code. A compartment sizing screen, not a bathroom design; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { type_label, required_width_in: reqW, required_depth_in: reqD, required_entry_in: reqE, required_clearance_width_in: reqCW, required_clearance_length_in: reqCL, width_ok, depth_ok, entry_ok, width_deficit_in, depth_deficit_in, entry_deficit_in, inside_ok, clearance_entered, clearance_width_ok, clearance_length_ok, clearance_ok, clearance_width_deficit_in, clearance_length_deficit_in, inside_area_sf, total_footprint_sf, fits, passes, note };
}

export const accessibleShowerCheckExample = { inputs: { shower_type: "standard-roll-in", width_in: 32, depth_in: 60, entry_width_in: 32, clearance_width_in: 30, clearance_length_in: 60 } };

ACCESSIBILITY_RENDERERS["accessible-shower-check"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 608.2.1, 608.2.2, and 608.2.3. A US federal standard in the public domain. 608.2.1: transfer type shower compartments shall be 36 in by 36 in clear inside dimensions measured at the center points of opposing sides and shall have a 36 in wide minimum entry on the face of the shower compartment, with a clearance of 36 in wide minimum by 48 in long minimum measured from the control wall. 608.2.2: standard roll-in type shower compartments shall be 30 in wide minimum by 60 in deep minimum clear inside dimensions measured at the center point of opposing sides and shall have a 60 in wide minimum entry on the face of the shower compartment, with a clearance of 30 in wide minimum by 60 in long minimum adjacent to the open face of the compartment. 608.2.3: alternate roll-in type shower compartments shall be 36 in wide and 60 in deep minimum clear inside dimensions measured at the center point of opposing sides, with a 36 in wide minimum entry provided at one end of the long side of the compartment. Not checked: grab bars, which differ by type; seats; controls, faucets, and the hand shower; thresholds and the roll-in curb limit; enclosures, which may not obstruct transfer or the clear floor space; drainage; or state and local law and the plumbing code. A compartment sizing screen, not a bathroom design.",
  example: accessibleShowerCheckExample.inputs,
  fields: [
    { key: "shower_type", label: "Shower type", kind: "select", options: [{ value: "transfer", label: "Transfer (36 x 36 in)" }, { value: "standard-roll-in", label: "Standard roll-in (30 x 60 in, full-width entry)", selected: true }, { value: "alternate-roll-in", label: "Alternate roll-in (36 x 60 in, 36 in entry)" }] },
    { key: "width_in", label: "Clear inside width (in)", kind: "number" },
    { key: "depth_in", label: "Clear inside depth (in)", kind: "number" },
    { key: "entry_width_in", label: "Entry width (in)", kind: "number" },
    { key: "clearance_width_in", label: "Clearance outside the compartment, width (in; 0 = skip)", kind: "number" },
    { key: "clearance_length_in", label: "Clearance outside the compartment, length (in; 0 = skip)", kind: "number" },
  ],
  outputs: [
    { key: "r", id: "asc2-out-r", label: "Required for this type", value: (r) => r.required_width_in + " x " + r.required_depth_in + " in inside, " + r.required_entry_in + " in entry, " + r.required_clearance_width_in + " x " + r.required_clearance_length_in + " in clearance" },
    { key: "i", id: "asc2-out-i", label: "Inside and entry", value: (r) => r.inside_ok ? "met" : [r.width_ok ? null : "width short " + fmt(r.width_deficit_in, 1), r.depth_ok ? null : "depth short " + fmt(r.depth_deficit_in, 1), r.entry_ok ? null : "entry short " + fmt(r.entry_deficit_in, 1)].filter(Boolean).join(", ") + " in" },
    { key: "f", id: "asc2-out-f", label: "What it would satisfy as built", value: (r) => r.fits.length ? r.fits.join(", ") : "none of the three, in any orientation" },
    { key: "c", id: "asc2-out-c", label: "Clearance outside", value: (r) => r.clearance_ok === null ? "not entered - but it is required" : r.clearance_ok ? "met" : [r.clearance_width_ok ? null : "width short " + fmt(r.clearance_width_deficit_in, 1), r.clearance_length_ok ? null : "length short " + fmt(r.clearance_length_deficit_in, 1)].filter(Boolean).join(", ") + " in" },
    { key: "a", id: "asc2-out-a", label: "Footprint", value: (r) => fmt(r.inside_area_sf, 2) + " sq ft of stall, " + fmt(r.total_footprint_sf, 2) + " sq ft with its clearance" },
    { key: "v", id: "asc2-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES the items entered" : "DOES NOT PASS" },
    { key: "n", id: "asc2-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAccessibleShowerCheck,
});

// ===================== spec-v1179: NFIP substantial improvement and damage (44 CFR 59.1) =====================

// The 50 percent rule decides whether a remodel in a flood zone is a remodel or a rebuild, and
// almost nobody prices it before starting.
// SUBSTANTIAL IMPROVEMENT: any reconstruction, rehabilitation, addition, or other improvement
// whose COST equals or exceeds 50 percent of the MARKET VALUE OF THE STRUCTURE before the start
// of construction. Cross that line and the whole building must be brought into compliance -
// elevated above the base flood elevation, flood openings, the works - which is a different
// project with a different budget.
// SUBSTANTIAL DAMAGE: the same 50 percent, measured as the cost of restoring the structure to
// its before-damaged condition against its market value BEFORE the damage. A structure that is
// substantially damaged is treated as substantially improved when it is repaired.
// The two things people get wrong: the denominator is the STRUCTURE, not the property - the land
// is not in it, which on an expensive lot with a modest house makes the threshold far lower than
// expected - and many communities count cumulative work over a period rather than one permit.
// dims: in { market_value: dimensionless, improvement_cost: dimensionless, prior_costs: dimensionless } out: { threshold: dimensionless, headroom: dimensionless, ratio_pct: dimensionless, cumulative_ratio_pct: dimensionless, federal_pct: dimensionless, land_share_pct: dimensionless, property_value: dimensionless, wrong_ratio_pct: dimensionless, countable_cost: dimensionless, cumulative_cost: dimensionless, over_by: dimensionless }
export function computeSubstantialImprovement({ market_value = 0, improvement_cost = 0, prior_costs = 0, threshold_pct = 50, land_value = 0, excluded_code_cost = 0, historic_structure = "no" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const mv = Number(market_value) || 0;
  const cost = Number(improvement_cost) || 0;
  const prior = Number(prior_costs) || 0;
  const pct = Number(threshold_pct);
  const land = Number(land_value) || 0;
  const excluded = Number(excluded_code_cost) || 0;
  const historic = historic_structure === "yes";
  if (historic_structure !== "yes" && historic_structure !== "no") return { error: "State whether this is a historic structure (yes or no)." };
  if (!(mv > 0)) return { error: "Market value of the STRUCTURE must be positive - the land is not part of it." };
  if (cost < 0 || prior < 0) return { error: "Costs cannot be negative." };
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return { error: "Threshold percent must be between 0 and 100 (50 is the federal figure; communities may adopt a lower one)." };
  if (land < 0) return { error: "Land value cannot be negative." };
  if (excluded < 0) return { error: "Excluded code-correction cost cannot be negative." };
  if (excluded > cost) return { error: "The excluded code-correction cost cannot exceed the total improvement cost." };

  const FEDERAL_PCT = 50;
  const threshold = mv * (pct / 100);
  const countable_cost = Math.max(0, cost - excluded);
  const cumulative_cost = countable_cost + prior;
  const ratio_pct = (countable_cost / mv) * 100;
  const cumulative_ratio_pct = (cumulative_cost / mv) * 100;

  const single_triggers = countable_cost >= threshold;
  const cumulative_triggers = cumulative_cost >= threshold;
  const cumulative_only = cumulative_triggers && !single_triggers;
  const headroom = threshold - cumulative_cost;
  const over_by = Math.max(0, cumulative_cost - threshold);

  // The land trap: what the ratio would look like if the property value were used instead.
  const property_value = mv + land;
  const wrong_ratio_pct = land > 0 ? (countable_cost / property_value) * 100 : null;
  const land_share_pct = land > 0 ? (land / property_value) * 100 : null;

  const triggers = cumulative_triggers && !historic;
  const note = "THE 50 PERCENT RULE DECIDES WHETHER THIS IS A REMODEL OR A REBUILD, and almost nobody prices it before starting. Substantial improvement is any reconstruction, rehabilitation, addition, or other improvement whose COST equals or exceeds 50 percent of the MARKET VALUE OF THE STRUCTURE before the start of construction. Cross the line and the whole building has to be brought into compliance - elevated above the base flood elevation, flood openings, the rest of it - which is a different project with a different budget. "
    + "THE DENOMINATOR IS THE STRUCTURE, NOT THE PROPERTY. The land is not in it. " + (land > 0 ? "With land at " + land.toLocaleString("en-US") + " the property is worth " + property_value.toLocaleString("en-US") + ", and a cost of " + countable_cost.toLocaleString("en-US") + " reads as " + wrong_ratio_pct.toFixed(1) + "% of THAT while being " + ratio_pct.toFixed(1) + "% of the structure. The land is " + land_share_pct.toFixed(0) + "% of the property here, and on an expensive lot with a modest house that gap is the whole argument. " : "No land value entered; note that using the property value or the tax assessment instead of the structure value is the single most common way this comes out wrong. ")
    + "Threshold: " + pct + "% of " + mv.toLocaleString("en-US") + " = " + threshold.toLocaleString("en-US", { maximumFractionDigits: 0 }) + ". "
    + (excluded > 0 ? "EXCLUDED: " + excluded.toLocaleString("en-US") + " of the " + cost.toLocaleString("en-US") + " is code-correction work. 59.1 excludes any project to correct existing violations of state or local health, sanitary, or safety code specifications that have been IDENTIFIED BY THE LOCAL CODE ENFORCEMENT OFFICIAL and are the minimum necessary to assure safe living conditions - two conditions, not one, and the official has to have identified them. That leaves " + countable_cost.toLocaleString("en-US") + " countable. " : "")
    + "This work is " + ratio_pct.toFixed(1) + "% of structure value" + (prior > 0 ? ", and with " + prior.toLocaleString("en-US") + " of prior work it is " + cumulative_ratio_pct.toFixed(1) + "% cumulatively" : "") + ": "
    + (single_triggers ? "OVER the threshold on this work alone. " : cumulative_only ? "under the threshold ALONE and OVER it cumulatively - which matters because many communities count improvements over a rolling period rather than one permit at a time, and that local rule is what catches a house improved in stages. " : "under the threshold, with " + headroom.toLocaleString("en-US", { maximumFractionDigits: 0 }) + " of room left. ")
    + (over_by > 0 ? "Over by " + over_by.toLocaleString("en-US", { maximumFractionDigits: 0 }) + ". " : "")
    + (historic ? "HISTORIC STRUCTURE: 59.1 excludes any alteration of a historic structure provided the alteration will not preclude the structure's continued designation as a historic structure - so this does not count as substantial improvement, subject to that proviso holding. " : "")
    + "SUBSTANTIAL DAMAGE runs on the same 50 percent from the other direction: damage of any origin where the cost of RESTORING the structure to its before-damaged condition would equal or exceed 50 percent of the market value BEFORE the damage. A structure that is substantially damaged is treated as substantially improved when it is repaired, whatever the owner intended to spend. "
    + (triggers ? "VERDICT: this work TRIGGERS substantial improvement. " : "VERDICT: on the figures entered, it does not trigger. ")
    + "Not checked: what counts as cost, which communities define differently and which commonly includes materials, labour, overhead, profit, and donated or discounted work at market rates while excluding plans, permits, and site work outside the structure; how market value is established, whether by appraisal, adjusted assessment, or replacement cost less depreciation, which the community chooses and which changes the answer; whether the community has adopted a threshold BELOW 50 percent or a cumulative period, both of which are common and both of which are stricter than the federal minimum; the base flood elevation and freeboard the building would have to meet if triggered; whether the structure is in a Special Flood Hazard Area at all; and the separate insurance consequences. A threshold screen, not a determination - the community's floodplain administrator makes that call, and 44 CFR 59.1 and the local ordinance govern.";

  return { threshold, countable_cost, cumulative_cost, ratio_pct, cumulative_ratio_pct, single_triggers, cumulative_triggers, cumulative_only, headroom, over_by, property_value, wrong_ratio_pct, land_share_pct, historic_excluded: historic, triggers, federal_pct: FEDERAL_PCT, note };
}

export const substantialImprovementExample = { inputs: { market_value: 180000, improvement_cost: 95000, prior_costs: 0, threshold_pct: 50, land_value: 220000, excluded_code_cost: 0, historic_structure: "no" } };

ACCESSIBILITY_RENDERERS["substantial-improvement-check"] = _simpleRenderer({
  citation: "Citation: 44 CFR 59.1, the NFIP definitions, a US federal regulation in the public domain. 'Substantial improvement means any reconstruction, rehabilitation, addition, or other improvement of a structure, the cost of which equals or exceeds 50 percent of the market value of the structure before the start of construction of the improvement. This term includes structures which have incurred substantial damage, regardless of the actual repair work performed. The term does not, however, include either: (1) Any project for improvement of a structure to correct existing violations of state or local health, sanitary, or safety code specifications which have been identified by the local code enforcement official and which are the minimum necessary to assure safe living conditions or (2) Any alteration of a historic structure, provided that the alteration will not preclude the structure's continued designation as a historic structure.' 'Substantial damage means damage of any origin sustained by a structure whereby the cost of restoring the structure to its before damaged condition would equal or exceed 50 percent of the market value of the structure before the damage occurred.' The denominator is the market value of the STRUCTURE, not the property, and the land is not included. Not checked: what counts as cost, how market value is established, whether the community has adopted a lower threshold or a cumulative period, the base flood elevation the building would have to meet, whether the structure is in a Special Flood Hazard Area, or the insurance consequences. A threshold screen, not a determination - the community's floodplain administrator makes that call.",
  example: substantialImprovementExample.inputs,
  fields: [
    { key: "market_value", label: "Market value of the STRUCTURE, before construction ($)", kind: "number" },
    { key: "improvement_cost", label: "Cost of the improvement ($)", kind: "number" },
    { key: "excluded_code_cost", label: "Of that, code-correction work identified by the official ($)", kind: "number" },
    { key: "prior_costs", label: "Prior improvements counted by a cumulative local rule ($)", kind: "number" },
    { key: "threshold_pct", label: "Threshold percent (50 federal; communities may adopt lower)", kind: "number" },
    { key: "land_value", label: "Land value, for comparison only ($; 0 = skip)", kind: "number" },
    { key: "historic_structure", label: "Historic structure?", kind: "select", options: [{ value: "no", label: "No", selected: true }, { value: "yes", label: "Yes" }] },
  ],
  outputs: [
    { key: "t", id: "sic-out-t", label: "Threshold", value: (r) => "$" + fmt(r.threshold, 0) + " of countable cost" },
    { key: "r", id: "sic-out-r", label: "This work", value: (r) => "$" + fmt(r.countable_cost, 0) + " = " + fmt(r.ratio_pct, 1) + "% of structure value" + (r.cumulative_cost !== r.countable_cost ? "; cumulative " + fmt(r.cumulative_ratio_pct, 1) + "%" : "") },
    { key: "l", id: "sic-out-l", label: "The land trap", value: (r) => r.wrong_ratio_pct === null ? "no land value entered" : "against the whole property it would read as only " + fmt(r.wrong_ratio_pct, 1) + "% - the land is " + fmt(r.land_share_pct, 0) + "% of the property and is NOT in the denominator" },
    { key: "h", id: "sic-out-h", label: "Headroom", value: (r) => r.over_by > 0 ? "OVER by $" + fmt(r.over_by, 0) : "$" + fmt(r.headroom, 0) + " left before the threshold" },
    { key: "v", id: "sic-out-v", label: "Verdict", value: (r) => r.historic_excluded ? "historic structure - excluded, subject to the designation proviso" : r.triggers ? (r.cumulative_only ? "TRIGGERS cumulatively, though not on this work alone" : "TRIGGERS substantial improvement") : "does not trigger on these figures" },
    { key: "n", id: "sic-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSubstantialImprovement,
});

// ===================== spec-v1180: accessible parking space geometry (2010 ADA Standards 502) =====================

// accessible-parking-count says how many. This says how big, and the van case is where lots go
// wrong twice.
// A car space is 96 in wide. A VAN space is 132 in - eleven feet - unless the access aisle is
// widened to 96 in, in which case the van space may drop to 96 in too. So there are two legal
// van layouts, 132 + 60 and 96 + 96, and both total 192 in; picking either is a striping
// decision, not a compliance one.
// The aisle is 60 in minimum and must run the FULL LENGTH of the space it serves, may not
// overlap the vehicular way, and on ANGLED van spaces must sit on the PASSENGER side - the one
// rule that cannot be satisfied by flipping the stripes at the end.
// And a van space, its aisle, AND the vehicular route serving them need 98 in of vertical
// clearance, which is what disqualifies most parking structures without any striping involved.
// dims: in { space_width_in: L, aisle_width_in: L, space_length_in: L, aisle_length_in: L, vertical_clearance_in: L } out: { required_space_width_in: L, required_aisle_width_in: L, pair_width_in: L, space_deficit_in: L, aisle_deficit_in: L, clearance_deficit_in: L, length_deficit_in: L, min_pair_width_in: L }
export function computeAccessibleParkingGeometry({ space_type = "van", space_width_in = 0, aisle_width_in = 0, space_length_in = 0, aisle_length_in = 0, angled = "no", aisle_side = "passenger", vertical_clearance_in = 0, surface_slope_ratio = 48 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const w = Number(space_width_in) || 0;
  const a = Number(aisle_width_in) || 0;
  const sl = Number(space_length_in) || 0;
  const al = Number(aisle_length_in) || 0;
  const vc = Number(vertical_clearance_in) || 0;
  const slope = Number(surface_slope_ratio) || 0;
  const isVan = space_type === "van";
  const isAngled = angled === "yes";
  const passengerSide = aisle_side === "passenger";
  if (space_type !== "van" && space_type !== "car") return { error: "Space type must be van or car." };
  if (angled !== "yes" && angled !== "no") return { error: "State whether the space is angled (yes or no)." };
  if (aisle_side !== "passenger" && aisle_side !== "driver") return { error: "Aisle side must be passenger or driver." };
  if (!(w > 0) || !(a > 0)) return { error: "Space width and access aisle width must be positive (in)." };
  if (!(sl > 0) || !(al > 0)) return { error: "Space length and aisle length must be positive (in)." };
  if (!(vc > 0)) return { error: "Vertical clearance must be positive (in)." };
  if (!(slope > 0)) return { error: "Surface slope ratio must be positive (48 for the 1:48 maximum)." };

  const CAR_W = 96, VAN_W = 132, VAN_ALT_W = 96, AISLE_W = 60, VAN_ALT_AISLE = 96;
  const VAN_CLEAR = 98, SLOPE_MAX = 48;

  // Two legal van layouts; a car space has one.
  const wide_van_path = isVan && w >= VAN_W && a >= AISLE_W;
  const wide_aisle_path = isVan && w >= VAN_ALT_W && a >= VAN_ALT_AISLE;
  const required_space_width_in = isVan ? (a >= VAN_ALT_AISLE ? VAN_ALT_W : VAN_W) : CAR_W;
  const required_aisle_width_in = isVan && w < VAN_W ? VAN_ALT_AISLE : AISLE_W;
  const width_ok = isVan ? (wide_van_path || wide_aisle_path) : (w >= CAR_W - 1e-9 * Math.abs(CAR_W) && a >= AISLE_W - 1e-9 * Math.abs(AISLE_W));
  const space_deficit_in = Math.max(0, required_space_width_in - w);
  const aisle_deficit_in = Math.max(0, required_aisle_width_in - a);
  const pair_width_in = w + a;
  const min_pair_width_in = isVan ? VAN_W + AISLE_W : CAR_W + AISLE_W;
  const both_van_layouts_equal = isVan && (VAN_W + AISLE_W) === (VAN_ALT_W + VAN_ALT_AISLE);

  const length_ok = al >= sl - 1e-9 * Math.abs(sl);
  const length_deficit_in = Math.max(0, sl - al);

  const side_applies = isVan && isAngled;
  const side_ok = side_applies ? passengerSide : null;

  const clearance_applies = isVan;
  const clearance_ok = clearance_applies ? vc >= VAN_CLEAR - 1e-9 * Math.abs(VAN_CLEAR) : null;
  const clearance_deficit_in = clearance_applies ? Math.max(0, VAN_CLEAR - vc) : null;

  const slope_ok = slope >= SLOPE_MAX - 1e-9 * Math.abs(SLOPE_MAX);

  const passes = width_ok && length_ok && (side_ok !== false) && (clearance_ok !== false) && slope_ok;

  const note = "COUNT IS ONE QUESTION AND GEOMETRY IS ANOTHER, and the van case goes wrong twice. A car space is 96 in wide with a 60 in aisle. A VAN space is 132 in - eleven feet - UNLESS the access aisle is widened to 96 in, in which case the van space may drop to 96 in as well. "
    + (both_van_layouts_equal ? "SO THERE ARE TWO LEGAL VAN LAYOUTS AND THEY COST THE SAME GROUND: 132 + 60 and 96 + 96 both total 192 in. Which one to stripe is a layout decision, not a compliance one, and knowing that is usually what unsticks a tight lot. " : "")
    + "This is a " + (isVan ? "van" : "car") + " space: " + w + " in wide with a " + a + " in aisle, " + pair_width_in + " in of pavement together against a " + min_pair_width_in + " in minimum pair. "
    + (width_ok ? "The widths comply" + (isVan ? (wide_aisle_path && !wide_van_path ? " on the wide-aisle path - the 96 in space is legal only because the aisle is 96 in. " : wide_van_path && wide_aisle_path ? " on both paths. " : " on the 132 in van path. ") : ". ") : "WIDTHS FAIL: at " + a + " in of aisle the space must be " + required_space_width_in + " in" + (space_deficit_in > 0 ? ", short by " + space_deficit_in.toFixed(1) + " in" : "") + (aisle_deficit_in > 0 ? ", and the aisle is short by " + aisle_deficit_in.toFixed(1) + " in" : "") + ". " + (isVan ? "Either widen the space to 132 in or widen the AISLE to 96 in - the second is often the cheaper stripe. " : ""))
    + "THE AISLE MUST RUN THE FULL LENGTH of the space it serves: " + al + " in against " + sl + " in, " + (length_ok ? "OK. " : "SHORT by " + length_deficit_in.toFixed(1) + " in - a stub aisle at the head of a space is a common and easy failure. ")
    + (side_applies ? "ANGLED VAN SPACES must have the access aisle on the PASSENGER side, and this one is on the " + aisle_side + " side" + (side_ok ? ". " : " - which is the one rule that cannot be fixed by flipping the stripes at the far end, because it is about which side the lift deploys from. ") : isVan ? "This van space is not angled, so the aisle may sit on either side; on an ANGLED van space it would have to be on the passenger side. " : "")
    + (clearance_applies ? "VERTICAL CLEARANCE: 98 in minimum at the van space, its access aisle, AND the vehicular route serving them - which is the requirement that disqualifies most parking structures with no striping involved at all, because the route matters as much as the stall. Entered " + vc + " in: " + (clearance_ok ? "OK. " : "SHORT by " + clearance_deficit_in.toFixed(1) + " in. ") : "No vertical clearance requirement applies to a car space under this section. ")
    + "SURFACE: the space and its aisle must be at the same level, with slopes no steeper than 1:48 in all directions. Entered 1:" + slope + ": " + (slope_ok ? "OK - and note that 1:48 is about 2%, which is flatter than most paving crews target for drainage, so this is the item that fails on a lot that drains well. " : "TOO STEEP. ")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: how many accessible and van spaces are required, which is a separate tile; whether the access aisle overlaps the vehicular way, which 502.3.4 prohibits and which a drawing shows better than a dimension; marking, which must discourage parking in the aisle; identification signage and its own mounting height; the accessible route from the space to the entrance and whether it crosses the vehicular way; curb ramps and their placement relative to the aisle; the location requirement that spaces be on the shortest accessible route; and state and local law, several of which require more. A geometry screen, not a striping plan; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { required_space_width_in, required_aisle_width_in, wide_van_path, wide_aisle_path, width_ok, space_deficit_in, aisle_deficit_in, pair_width_in, min_pair_width_in, both_van_layouts_equal, length_ok, length_deficit_in, side_applies, side_ok, clearance_applies, clearance_ok, clearance_deficit_in, slope_ok, passes, note };
}

export const accessibleParkingGeometryExample = { inputs: { space_type: "van", space_width_in: 96, aisle_width_in: 60, space_length_in: 216, aisle_length_in: 216, angled: "no", aisle_side: "passenger", vertical_clearance_in: 98, surface_slope_ratio: 48 } };

ACCESSIBILITY_RENDERERS["accessible-parking-geometry"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 502.2, 502.3.1, 502.3.2, 502.3.3, 502.3.4, 502.4, and 502.5. A US federal standard in the public domain. 502.2: car parking spaces shall be 96 in wide minimum and van parking spaces shall be 132 in wide minimum, shall be marked to define the width, and shall have an adjacent access aisle; exception - van parking spaces shall be permitted to be 96 in wide minimum where the access aisle is 96 in wide minimum. 502.3.1: access aisles serving car and van parking spaces shall be 60 in wide minimum. 502.3.2: access aisles shall extend the full length of the parking spaces they serve. 502.3.3: access aisles shall be marked so as to discourage parking in them. 502.3.4: access aisles shall not overlap the vehicular way; access aisles shall be permitted to be placed on either side of the parking space except for angled van parking spaces which shall have access aisles located on the passenger side of the parking spaces. 502.4: parking spaces and access aisles serving them shall comply with 302, access aisles shall be at the same level as the parking spaces they serve, and changes in level are not permitted; exception - slopes not steeper than 1:48 shall be permitted. 502.5: parking spaces for vans and access aisles and vehicular routes serving them shall provide a vertical clearance of 98 in minimum. Not checked: how many spaces are required, which is a separate tile; whether the aisle overlaps the vehicular way; marking; identification signage; the accessible route to the entrance; curb ramps; or state and local law. A geometry screen, not a striping plan.",
  example: accessibleParkingGeometryExample.inputs,
  fields: [
    { key: "space_type", label: "Space type", kind: "select", options: [{ value: "van", label: "Van accessible", selected: true }, { value: "car", label: "Car accessible" }] },
    { key: "space_width_in", label: "Space width (in)", kind: "number" },
    { key: "aisle_width_in", label: "Access aisle width (in)", kind: "number" },
    { key: "space_length_in", label: "Space length (in)", kind: "number" },
    { key: "aisle_length_in", label: "Access aisle length (in)", kind: "number" },
    { key: "angled", label: "Angled space?", kind: "select", options: [{ value: "no", label: "No", selected: true }, { value: "yes", label: "Yes" }] },
    { key: "aisle_side", label: "Aisle side", kind: "select", options: [{ value: "passenger", label: "Passenger side", selected: true }, { value: "driver", label: "Driver side" }] },
    { key: "vertical_clearance_in", label: "Vertical clearance at the space, aisle, and route (in)", kind: "number" },
    { key: "surface_slope_ratio", label: "Surface slope, run per unit rise (48 = 1:48 maximum)", kind: "number" },
  ],
  outputs: [
    { key: "w", id: "apg-out-w", label: "Widths", value: (r) => r.width_ok ? "comply" + (r.wide_aisle_path && !r.wide_van_path ? " - on the wide-aisle path only" : "") : "space needs " + r.required_space_width_in + " in at this aisle width" + (r.space_deficit_in > 0 ? " (short " + fmt(r.space_deficit_in, 1) + ")" : "") + (r.aisle_deficit_in > 0 ? ", aisle short " + fmt(r.aisle_deficit_in, 1) : "") },
    { key: "p", id: "apg-out-p", label: "Pavement together", value: (r) => r.pair_width_in + " in against a " + r.min_pair_width_in + " in minimum pair" + (r.both_van_layouts_equal ? " - and 132+60 and 96+96 both total 192 in" : "") },
    { key: "l", id: "apg-out-l", label: "Aisle length", value: (r) => r.length_ok ? "runs the full length of the space" : "SHORT by " + fmt(r.length_deficit_in, 1) + " in" },
    { key: "s", id: "apg-out-s", label: "Aisle side", value: (r) => r.side_ok === null ? "either side is permitted here" : r.side_ok ? "passenger side, as an angled van space requires" : "DRIVER side on an angled van space - not permitted" },
    { key: "c", id: "apg-out-c", label: "Vertical clearance", value: (r) => r.clearance_ok === null ? "no 98 in requirement at a car space" : r.clearance_ok ? "98 in or more at the space, aisle, and route" : "SHORT by " + fmt(r.clearance_deficit_in, 1) + " in" },
    { key: "v", id: "apg-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES 502" : "DOES NOT PASS" },
    { key: "n", id: "apg-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeAccessibleParkingGeometry,
});

// ===================== spec-v1181: water closet location and seat height (2010 ADA Standards 604) =====================

// The centerline everyone remembers as "18 in" is a WINDOW of 16 to 18, and the plumbing code's
// 15 in minimum is not in it. So a water closet roughed at the IPC minimum is code-compliant and
// ADA-noncompliant by an inch, and a closet set at 20 in - which reads as generous - fails on the
// other end. There is exactly three inches of usable rough-in between the two codes and two of
// them are unusable.
// The seat is 17 to 19 in to the TOP OF THE SEAT, so a standard 15 in bowl with a thick seat can
// land under it and a comfort-height bowl with a thick seat can land over it.
// The clearance around the closet is 60 in from the SIDE wall and 56 in from the REAR - and it is
// clearance, not a compartment: it must be clear of everything, which is why a lavatory that fits
// the room can still fail by standing in it.
// dims: in { centerline_in: L, seat_height_in: L, clear_side_in: L, clear_rear_in: L } out: { centerline_deficit_in: L, seat_deficit_in: L, side_deficit_in: L, rear_deficit_in: L, clear_area_sf: L^2, required_area_sf: L^2 }
export function computeWaterClosetLocation({ centerline_in = 0, seat_height_in = 0, clear_side_in = 0, clear_rear_in = 0, flush_side = "open", ambulatory = "no" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const c = Number(centerline_in) || 0;
  const s = Number(seat_height_in) || 0;
  const cs = Number(clear_side_in) || 0;
  const cr = Number(clear_rear_in) || 0;
  const amb = ambulatory === "yes";
  if (flush_side !== "open" && flush_side !== "wall") return { error: "Flush control side must be open or wall." };
  if (ambulatory !== "yes" && ambulatory !== "no") return { error: "State whether this is an ambulatory accessible compartment (yes or no)." };
  if (!(c > 0)) return { error: "Centerline distance from the side wall must be positive (in)." };
  if (!(s > 0)) return { error: "Seat height must be positive (in)." };
  if (cs < 0 || cr < 0) return { error: "Clearances cannot be negative (in)." };

  // 604.2: 16 to 18 in, but 17 to 19 in inside an ambulatory accessible compartment (604.8.2).
  const C_MIN = amb ? 17 : 16, C_MAX = amb ? 19 : 18, S_MIN = 17, S_MAX = 19;
  const SIDE_MIN = 60, REAR_MIN = 56, IPC_MIN = 15;

  const centerline_ok = c >= C_MIN - 1e-9 * Math.abs(C_MIN) && c <= C_MAX + 1e-9 * Math.abs(C_MAX);
  const centerline_too_close = c < C_MIN - 1e-9 * Math.abs(C_MIN);
  const centerline_deficit_in = centerline_too_close ? C_MIN - c : Math.max(0, c - C_MAX);
  const meets_ipc_only = c >= IPC_MIN - 1e-9 * Math.abs(IPC_MIN) && c < C_MIN;

  const seat_ok = s >= S_MIN - 1e-9 * Math.abs(S_MIN) && s <= S_MAX + 1e-9 * Math.abs(S_MAX);
  const seat_too_low = s < S_MIN - 1e-9 * Math.abs(S_MIN);
  const seat_deficit_in = seat_too_low ? S_MIN - s : Math.max(0, s - S_MAX);

  const clearance_entered = cs > 0 || cr > 0;
  const side_ok = clearance_entered ? cs >= SIDE_MIN - 1e-9 * Math.abs(SIDE_MIN) : null;
  const rear_ok = clearance_entered ? cr >= REAR_MIN - 1e-9 * Math.abs(REAR_MIN) : null;
  const side_deficit_in = clearance_entered ? Math.max(0, SIDE_MIN - cs) : null;
  const rear_deficit_in = clearance_entered ? Math.max(0, REAR_MIN - cr) : null;
  const clearance_ok = clearance_entered ? (side_ok && rear_ok) : null;
  const clear_area_sf = clearance_entered ? (Math.max(cs, 0) * Math.max(cr, 0)) / 144 : null;
  const required_area_sf = (SIDE_MIN * REAR_MIN) / 144;

  // Flush controls go on the open side, except in an ambulatory compartment.
  const flush_rule_applies = !amb;
  const flush_ok = flush_rule_applies ? flush_side === "open" : null;

  const passes = centerline_ok && seat_ok && (clearance_ok !== false) && (flush_ok !== false);

  const note = "THE 18 IN EVERYONE REMEMBERS IS A WINDOW OF 16 TO 18, and the plumbing code's 15 in minimum is not inside it. A water closet roughed at the IPC minimum is code-compliant and ADA-noncompliant by an inch (by two in an ambulatory compartment); one set at 20 in, which reads as generous, fails the other end. There are three inches of rough-in between the two codes and two of them do not work. "
    + "Centerline " + c + " in: " + (centerline_ok ? "within " + C_MIN + " to " + C_MAX + (amb ? " (the ambulatory-compartment window). " : ". ") : centerline_too_close ? "TOO CLOSE by " + centerline_deficit_in.toFixed(2) + " in" + (meets_ipc_only ? " - and note that it does satisfy the plumbing code's 15 in minimum, which is exactly how this gets roughed in wrong: the plumber met a code, just not this one. " : ". ") : "TOO FAR by " + centerline_deficit_in.toFixed(2) + " in - a centerline can be too far from the wall, because the grab bar has to be in reach from the seat. ")
    + "SEAT: 17 to 19 in measured to the TOP OF THE SEAT, not the rim of the bowl - so a standard 15 in bowl with a thick seat can still land under, and a comfort-height bowl with a thick seat can land over. Entered " + s + " in: " + (seat_ok ? "OK. " : seat_too_low ? "UNDER by " + seat_deficit_in.toFixed(2) + " in. " : "OVER by " + seat_deficit_in.toFixed(2) + " in - too high is a real failure, because a transfer works both ways. ")
    + (clearance_entered
      ? "CLEARANCE: 60 in minimum measured perpendicular from the SIDE wall and 56 in from the REAR - " + required_area_sf.toFixed(2) + " sq ft of floor. Entered " + cs + " x " + cr + " in (" + clear_area_sf.toFixed(2) + " sq ft): " + (clearance_ok ? "OK. " : (side_ok ? "" : "side short by " + side_deficit_in.toFixed(1) + " in. ") + (rear_ok ? "" : "rear short by " + rear_deficit_in.toFixed(1) + " in. "))
        + "IT IS CLEARANCE, NOT A COMPARTMENT: it must be clear of everything, which is why a lavatory that fits the room comfortably can still fail by standing in it. "
      : "No clearance entered. The requirement is 60 in from the side wall by 56 in from the rear, and it must be clear of other fixtures rather than merely inside a compartment. ")
    + "FLUSH CONTROLS go on the OPEN side of the water closet" + (amb ? ", except in an ambulatory accessible compartment - which this is, so the rule does not apply here. " : ", and this one is on the " + (flush_side === "open" ? "open side. " : "WALL side, which is the side a person transferring cannot reach. Handing is decided when the fixture is ordered, not when it is set, so this is a purchasing error more often than an installation one. "))
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: grab bars, which are a separate tile and whose reaches interact with the centerline; the toilet compartment around it, which has its own dimensions and its own tile; whether the flush control meets the operable-parts requirements for force and one-hand operation; dispensers and their position, which routinely intrude into the clearance; the clear floor space and the approach it permits; the water closet\\'s own rough-in dimension and carrier; children\\'s-use dimensions, which differ; and state and local accessibility law and the plumbing code, whose 15 in is a minimum rather than a target. A fixture location screen, not a rough-in drawing; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { centerline_ok, centerline_too_close, centerline_deficit_in, meets_ipc_only, seat_ok, seat_too_low, seat_deficit_in, clearance_entered, side_ok, rear_ok, side_deficit_in, rear_deficit_in, clearance_ok, clear_area_sf, required_area_sf, flush_rule_applies, flush_ok, passes, note };
}

export const waterClosetLocationExample = { inputs: { centerline_in: 15, seat_height_in: 16.5, clear_side_in: 60, clear_rear_in: 56, flush_side: "open", ambulatory: "no" } };

ACCESSIBILITY_RENDERERS["water-closet-location"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 604.2, 604.3.1, 604.4, and 604.6. A US federal standard in the public domain. 604.2: the water closet shall be positioned with a wall or partition to the rear and to one side, and the centerline of the water closet shall be 16 in minimum to 18 in maximum from the side wall or partition. 604.3.1: clearance around a water closet shall be 60 in minimum measured perpendicular from the side wall and 56 in minimum measured perpendicular from the rear wall. 604.4: the seat height of a water closet above the finish floor shall be 17 in minimum and 19 in maximum measured to the top of the seat. 604.6: flush controls shall be hand operated or automatic, hand operated flush controls shall comply with 309, and flush controls shall be located on the open side of the water closet except in ambulatory accessible compartments complying with 604.8.2. Not checked: grab bars, which are a separate tile; the toilet compartment, which has its own tile; whether the flush control meets the operable-parts requirements; dispensers, which routinely intrude into the clearance; the clear floor space; the fixture's own rough-in and carrier; children's-use dimensions; or state and local law and the plumbing code. A fixture location screen, not a rough-in drawing.",
  example: waterClosetLocationExample.inputs,
  fields: [
    { key: "centerline_in", label: "Centerline from the side wall or partition (in)", kind: "number" },
    { key: "seat_height_in", label: "Seat height to the TOP of the seat (in)", kind: "number" },
    { key: "clear_side_in", label: "Clearance from the side wall (in; 0 = skip)", kind: "number" },
    { key: "clear_rear_in", label: "Clearance from the rear wall (in; 0 = skip)", kind: "number" },
    { key: "flush_side", label: "Flush control side", kind: "select", options: [{ value: "open", label: "Open side", selected: true }, { value: "wall", label: "Wall side" }] },
    { key: "ambulatory", label: "Ambulatory accessible compartment?", kind: "select", options: [{ value: "no", label: "No", selected: true }, { value: "yes", label: "Yes" }] },
  ],
  outputs: [
    { key: "c", id: "wcl-out-c", label: "Centerline (16 to 18 in; 17 to 19 in an ambulatory compartment)", value: (r) => r.centerline_ok ? "within the window" : r.centerline_too_close ? "TOO CLOSE by " + fmt(r.centerline_deficit_in, 2) + " in" + (r.meets_ipc_only ? " - though it does meet the plumbing code's 15 in" : "") : "TOO FAR by " + fmt(r.centerline_deficit_in, 2) + " in" },
    { key: "s", id: "wcl-out-s", label: "Seat height (17 to 19 in)", value: (r) => r.seat_ok ? "within the window" : r.seat_too_low ? "under by " + fmt(r.seat_deficit_in, 2) + " in" : "over by " + fmt(r.seat_deficit_in, 2) + " in" },
    { key: "l", id: "wcl-out-l", label: "Clearance (60 side x 56 rear)", value: (r) => r.clearance_ok === null ? "not entered" : r.clearance_ok ? fmt(r.clear_area_sf, 2) + " sq ft - meets both" : [r.side_ok ? null : "side short " + fmt(r.side_deficit_in, 1), r.rear_ok ? null : "rear short " + fmt(r.rear_deficit_in, 1)].filter(Boolean).join(", ") + " in" },
    { key: "f", id: "wcl-out-f", label: "Flush control", value: (r) => r.flush_ok === null ? "rule does not apply in an ambulatory compartment" : r.flush_ok ? "on the open side" : "on the WALL side - not permitted" },
    { key: "v", id: "wcl-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES the items entered" : "DOES NOT PASS" },
    { key: "n", id: "wcl-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeWaterClosetLocation,
});

// ===================== spec-v1182: lavatory and bathtub clearances (2010 ADA Standards 606, 607) =====================

// Two fixtures whose rules are short enough to be skipped and specific enough to fail a
// remodel that measured fine everywhere else.
// LAVATORY (606.3): the front of the HIGHER of the rim or the counter surface is 34 in MAXIMUM.
// Not the bowl, not the faucet - the higher of the two, so a vessel sink on a 34 in counter is
// out by the height of the vessel, and a thick stone top on a standard-height cabinet can be out
// by an inch before anything is set on it.
// Metering faucets must stay open 10 SECONDS minimum, which is longer than most are shipped set.
// BATHTUB (607.2): the clearance in front runs THE LENGTH OF THE TUB and is 30 in wide minimum -
// and where there is a permanent seat at the head end it extends 12 in BEYOND the wall at that
// end, so the fixture is 60 in and the clearance is 72.
// dims: in { rim_height_in: L, counter_height_in: L, metering_seconds: T, tub_length_in: L, clear_width_in: L, clear_length_in: L } out: { governing_lav_height_in: L, lav_excess_in: L, required_clear_length_in: L, clear_length_deficit_in: L, clear_area_sf: L^2, clear_width_deficit_in: L, seat_extra_in: L, metering_deficit_s: T }
export function computeLavatoryTubClearance({ rim_height_in = 0, counter_height_in = 0, metering_seconds = 0, tub_length_in = 0, permanent_seat = "no", clear_width_in = 0, clear_length_in = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const rim = Number(rim_height_in) || 0;
  const counter = Number(counter_height_in) || 0;
  const meter = Number(metering_seconds) || 0;
  const tub = Number(tub_length_in) || 0;
  const cw = Number(clear_width_in) || 0;
  const cl = Number(clear_length_in) || 0;
  const seat = permanent_seat === "yes";
  if (permanent_seat !== "yes" && permanent_seat !== "no") return { error: "State whether there is a permanent seat at the head end (yes or no)." };
  if (!(rim > 0)) return { error: "Lavatory rim height must be positive (in)." };
  if (counter < 0) return { error: "Counter height cannot be negative (in) - enter 0 where there is no surrounding counter." };
  if (meter < 0) return { error: "Metering faucet open time cannot be negative (seconds)." };
  if (!(tub > 0)) return { error: "Bathtub length must be positive (in)." };
  if (cw < 0 || cl < 0) return { error: "Clearances cannot be negative (in)." };

  const LAV_MAX = 34, METER_MIN = 10, TUB_CLEAR_W = 30, SEAT_EXTRA = 12;

  const governing_lav_height_in = Math.max(rim, counter);
  const counter_governs = counter > rim;
  const lav_ok = governing_lav_height_in <= LAV_MAX + 1e-9 * Math.abs(LAV_MAX);
  const lav_excess_in = Math.max(0, governing_lav_height_in - LAV_MAX);
  const rim_alone_ok = rim <= LAV_MAX + 1e-9 * Math.abs(LAV_MAX);
  const hidden_by_counter = rim_alone_ok && !lav_ok;

  const metering_entered = meter > 0;
  const metering_ok = metering_entered ? meter >= METER_MIN - 1e-9 * Math.abs(METER_MIN) : null;
  const metering_deficit_s = metering_entered ? Math.max(0, METER_MIN - meter) : null;

  const required_clear_length_in = tub + (seat ? SEAT_EXTRA : 0);
  const clear_length_ok = cl >= required_clear_length_in - 1e-9 * Math.abs(required_clear_length_in);
  const clear_length_deficit_in = Math.max(0, required_clear_length_in - cl);
  const clear_width_ok = cw >= TUB_CLEAR_W - 1e-9 * Math.abs(TUB_CLEAR_W);
  const clear_width_deficit_in = Math.max(0, TUB_CLEAR_W - cw);
  const tub_ok = clear_length_ok && clear_width_ok;
  const seat_extra_in = seat ? SEAT_EXTRA : 0;
  const clear_area_sf = (required_clear_length_in * TUB_CLEAR_W) / 144;

  const passes = lav_ok && tub_ok && (metering_ok !== false);

  const note = "TWO FIXTURES WHOSE RULES ARE SHORT ENOUGH TO SKIP AND SPECIFIC ENOUGH TO FAIL A REMODEL THAT MEASURED FINE EVERYWHERE ELSE. "
    + "LAVATORY (606.3): the front of the HIGHER of the rim or the counter surface is 34 in MAXIMUM. Not the bowl, not the faucet - the higher of the two. Rim " + rim + " in, counter " + counter + " in, so " + governing_lav_height_in + " in governs" + (counter_governs ? " and it is the COUNTER, not the fixture. " : ". ")
    + (lav_ok ? "Within the 34 in maximum. " : "OVER by " + lav_excess_in.toFixed(2) + " in. ")
    + (hidden_by_counter ? "NOTE WHAT HAPPENED: the rim alone would have passed and the counter around it does not, which is exactly how a thick stone top or a raised counter fails a lavatory that was specified correctly. The fixture was never the problem. " : "")
    + (metering_entered ? "METERING FAUCETS (606.4) must remain open 10 SECONDS MINIMUM, which is longer than most are shipped set and is adjusted at the cartridge rather than specified at purchase. Entered " + meter + " s: " + (metering_ok ? "OK. " : "SHORT by " + metering_deficit_s.toFixed(1) + " s. ") : "No metering faucet entered; note that a hand-operated metering faucet must stay open 10 seconds minimum. ")
    + "BATHTUB (607.2): the clearance in front runs THE LENGTH OF THE TUB and is 30 in wide minimum. " + (seat ? "With a permanent seat at the head end it extends 12 in BEYOND the wall at that end, so a " + tub + " in tub needs " + required_clear_length_in + " in of clearance - the fixture is one length and the floor it needs is another, which is the part that gets drawn short. " : "With no permanent seat the clearance is the tub length, " + required_clear_length_in + " in; adding a permanent seat at the head end would push it to " + (tub + SEAT_EXTRA) + " in. ")
    + "Entered " + cl + " in long x " + cw + " in wide: " + (tub_ok ? "OK. " : (clear_length_ok ? "" : "LENGTH short by " + clear_length_deficit_in.toFixed(1) + " in. ") + (clear_width_ok ? "" : "WIDTH short by " + clear_width_deficit_in.toFixed(1) + " in. "))
    + "That clearance is " + clear_area_sf.toFixed(2) + " sq ft of floor that has to stay empty in front of the tub. "
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: the clear floor space at the lavatory and the knee and toe clearance under it, which are separate tiles (knee-toe-clearance checks the knee and toe space) and which a cabinet defeats before the height does; whether the lavatory faucet controls meet the operable-parts requirements for force and one-hand operation; the requirement that water supply and drain pipes under a lavatory be insulated or otherwise configured to protect against contact, and that there be no sharp or abrasive surfaces beneath; grab bars at the tub, which have their own geometry and are a separate tile; the tub seat itself, whether permanent at the head end or removable in-tub, and its own dimensions; controls, faucets, and the hand shower at the tub; enclosures, which may not obstruct transfer; and state and local accessibility law and the plumbing code. A clearance screen, not a bathroom design; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { governing_lav_height_in, counter_governs, lav_ok, lav_excess_in, rim_alone_ok, hidden_by_counter, metering_entered, metering_ok, metering_deficit_s, required_clear_length_in, seat_extra_in, clear_length_ok, clear_length_deficit_in, clear_width_ok, clear_width_deficit_in, tub_ok, clear_area_sf, passes, note };
}

export const lavatoryTubClearanceExample = { inputs: { rim_height_in: 33, counter_height_in: 36, metering_seconds: 6, tub_length_in: 60, permanent_seat: "yes", clear_width_in: 30, clear_length_in: 60 } };

ACCESSIBILITY_RENDERERS["lavatory-tub-clearance"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 606.3, 606.4, 606.5, 607.2, and 607.3. A US federal standard in the public domain. 606.3: lavatories and sinks shall be installed with the front of the higher of the rim or counter surface 34 in maximum above the finish floor or ground. 606.4: controls for faucets shall comply with 309, and hand-operated metering faucets shall remain open for 10 seconds minimum. 606.5: water supply and drain pipes under lavatories and sinks shall be insulated or otherwise configured to protect against contact, and there shall be no sharp or abrasive surfaces under lavatories and sinks. 607.2: clearance in front of bathtubs shall extend the length of the bathtub and shall be 30 in wide minimum, and where a permanent seat is provided at the head end of the bathtub, the clearance shall extend 12 in minimum beyond the wall at the head end of the bathtub. 607.3: a permanent seat at the head end of the bathtub or a removable in-tub seat shall be provided. Not checked: clear floor space and knee and toe clearance at the lavatory, which are separate tiles (knee-toe-clearance checks the knee and toe space); whether faucet controls meet the operable-parts requirements; the pipe-protection requirement, which is stated but not measured here; grab bars at the tub; the tub seat's own dimensions; controls and the hand shower; enclosures; or state and local law and the plumbing code. A clearance screen, not a bathroom design.",
  example: lavatoryTubClearanceExample.inputs,
  fields: [
    { key: "rim_height_in", label: "Lavatory rim height (in)", kind: "number" },
    { key: "counter_height_in", label: "Surrounding counter height (in; 0 = none)", kind: "number" },
    { key: "metering_seconds", label: "Metering faucet open time (s; 0 = not a metering faucet)", kind: "number" },
    { key: "tub_length_in", label: "Bathtub length (in)", kind: "number" },
    { key: "permanent_seat", label: "Permanent seat at the head end?", kind: "select", options: [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }] },
    { key: "clear_length_in", label: "Clearance in front of the tub, length (in)", kind: "number" },
    { key: "clear_width_in", label: "Clearance in front of the tub, width (in)", kind: "number" },
  ],
  outputs: [
    { key: "l", id: "ltc-out-l", label: "Lavatory height (34 in max)", value: (r) => (r.counter_governs ? "the COUNTER governs at " : "the rim governs at ") + r.governing_lav_height_in + " in - " + (r.lav_ok ? "OK" : "over by " + fmt(r.lav_excess_in, 2) + " in") },
    { key: "h", id: "ltc-out-h", label: "What the counter did", value: (r) => r.hidden_by_counter ? "the rim alone would have passed - the counter around it is what fails" : "the counter is not what decides this one" },
    { key: "m", id: "ltc-out-m", label: "Metering faucet (10 s min)", value: (r) => r.metering_ok === null ? "not entered" : r.metering_ok ? "OK" : "short by " + fmt(r.metering_deficit_s, 1) + " s" },
    { key: "t", id: "ltc-out-t", label: "Tub clearance required", value: (r) => r.required_clear_length_in + " in long x 30 in wide" + (r.seat_extra_in > 0 ? " (tub length plus 12 in past the head-end wall)" : " (the tub length)") + " = " + fmt(r.clear_area_sf, 2) + " sq ft" },
    { key: "p", id: "ltc-out-p", label: "Tub clearance provided", value: (r) => r.tub_ok ? "meets both" : [r.clear_length_ok ? null : "length short " + fmt(r.clear_length_deficit_in, 1), r.clear_width_ok ? null : "width short " + fmt(r.clear_width_deficit_in, 1)].filter(Boolean).join(", ") + " in" },
    { key: "v", id: "ltc-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES the items entered" : "DOES NOT PASS" },
    { key: "n", id: "ltc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLavatoryTubClearance,
});

// ===================== spec-v1183: ramp cross slope, width, and edge protection (2010 ADA Standards 405) =====================

// ada-ramp-slope lays the ramp out - running slope, runs, landings. These are the four rules on
// the same ramp that get built wrong after the layout is right.
// CROSS SLOPE is 1:48 - about 2% - across the direction of travel, which is flatter than the
// drainage most sitework targets, so the ramp that sheds water well is the one that fails.
// CLEAR WIDTH is 36 in, and where handrails are provided it is measured BETWEEN THE HANDRAILS,
// so a 36 in ramp with rails on both sides is not a 36 in ramp any more.
// A LANDING is 60 in long minimum and at least as wide as the widest run reaching it - and where
// the ramp CHANGES DIRECTION the landing is 60 x 60, which is the one that turns a switchback
// into a wider footprint than anyone drew.
// EDGE PROTECTION is either the floor surface extended 12 in beyond the handrail or a curb or
// barrier that stops a 4 in sphere within 4 in of the surface - a rail alone is not edge
// protection, because the hazard is at the wheel and not at the hand.
// dims: in { clear_width_in: L, handrail_intrusion_in: L, landing_length_in: L, landing_width_in: L, run_width_in: L } out: { effective_width_in: L, width_deficit_in: L, required_landing_width_in: L, cross_slope_pct: dimensionless, width_needed_between_rails_in: L, required_landing_length_in: L, landing_length_deficit_in: L, landing_width_deficit_in: L }
export function computeRampDetailCheck({ cross_slope_ratio = 48, clear_width_in = 0, handrails = "yes", handrail_intrusion_in = 0, landing_length_in = 0, landing_width_in = 0, run_width_in = 0, changes_direction = "no", edge_protection = "none" } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const xs = Number(cross_slope_ratio) || 0;
  const w = Number(clear_width_in) || 0;
  const intr = Number(handrail_intrusion_in) || 0;
  const ll = Number(landing_length_in) || 0;
  const lw = Number(landing_width_in) || 0;
  const rw = Number(run_width_in) || 0;
  const rails = handrails === "yes";
  const turns = changes_direction === "yes";
  // 405.9 Exception 1 waives edge protection on a ramp not required to have handrails whose sides
  // are flared per 406.3; Exception 2 waives it on a landing side serving an adjoining run or stair.
  const EDGES = { none: "none provided", "extended-floor": "the floor surface extended 12 in beyond the handrail", "curb-or-barrier": "a curb or barrier stopping a 4 in sphere within 4 in of the surface", "not-required": "not required here under a 405.9 exception" };
  if (!(edge_protection in EDGES)) return { error: "Edge protection must be none, extended-floor, curb-or-barrier, or not-required." };
  if (handrails !== "yes" && handrails !== "no") return { error: "State whether handrails are provided (yes or no)." };
  if (changes_direction !== "yes" && changes_direction !== "no") return { error: "State whether the ramp changes direction at this landing (yes or no)." };
  if (!(xs > 0)) return { error: "Cross slope ratio must be positive (48 for the 1:48 maximum)." };
  if (!(w > 0)) return { error: "Clear width of the ramp run must be positive (in)." };
  if (intr < 0) return { error: "Handrail intrusion cannot be negative (in)." };
  if (!(ll > 0) || !(lw > 0)) return { error: "Landing length and width must be positive (in)." };
  if (!(rw > 0)) return { error: "Width of the widest run reaching the landing must be positive (in)." };

  const XS_MAX = 48, WIDTH_MIN = 36, LANDING_LEN = 60, TURN_DIM = 60;

  const cross_slope_ok = xs >= XS_MAX - 1e-9 * Math.abs(XS_MAX);
  const cross_slope_pct = 100 / xs;

  // Where handrails are provided the clear width is measured between them.
  const effective_width_in = rails ? w - intr : w;
  const width_ok = effective_width_in >= WIDTH_MIN - 1e-9 * Math.abs(WIDTH_MIN);
  const width_deficit_in = Math.max(0, WIDTH_MIN - effective_width_in);
  const handrails_cost_compliance = rails && w >= WIDTH_MIN && !width_ok;
  const width_needed_between_rails_in = rails ? WIDTH_MIN + intr : WIDTH_MIN;

  const required_landing_length_in = turns ? TURN_DIM : LANDING_LEN;
  const required_landing_width_in = turns ? Math.max(TURN_DIM, rw) : rw;
  const landing_length_ok = ll >= required_landing_length_in - 1e-9 * Math.abs(required_landing_length_in);
  const landing_width_ok = lw >= required_landing_width_in - 1e-9 * Math.abs(required_landing_width_in);
  const landing_length_deficit_in = Math.max(0, required_landing_length_in - ll);
  const landing_width_deficit_in = Math.max(0, required_landing_width_in - lw);
  const landing_ok = landing_length_ok && landing_width_ok;
  const turn_drives_width = turns && TURN_DIM > rw;

  const edge_ok = edge_protection !== "none";

  const passes = cross_slope_ok && width_ok && landing_ok && edge_ok;

  const note = "THE LAYOUT CAN BE RIGHT AND THE RAMP STILL WRONG. These are the four rules on the same ramp that get built wrong after the slope, the runs, and the landing count are settled. "
    + "CROSS SLOPE (405.3): not steeper than 1:48 - about 2% - measured ACROSS the direction of travel. Entered 1:" + xs + ", which is " + cross_slope_pct.toFixed(2) + "%: " + (cross_slope_ok ? "OK. " : "TOO STEEP. ")
    + "This is flatter than the drainage most sitework targets, so the ramp that sheds water beautifully is the one that fails, and it fails after the concrete is down. "
    + "CLEAR WIDTH (405.5): 36 in minimum - and where handrails are provided it is measured BETWEEN THE HANDRAILS. "
    + (rails ? "With rails taking " + intr + " in, a " + w + " in ramp leaves " + effective_width_in.toFixed(1) + " in between them: " + (width_ok ? "OK. " : "SHORT by " + width_deficit_in.toFixed(1) + " in. ") + (handrails_cost_compliance ? "NOTE WHAT HAPPENED: the ramp itself is 36 in or wider and the HANDRAILS took it under. A 36 in ramp with rails on both sides is not a 36 in ramp any more, and the fix is a wider slab rather than a different rail - " + width_needed_between_rails_in.toFixed(1) + " in of ramp to leave 36 between the rails. " : "") : "No handrails entered, so the full " + w + " in is the clear width: " + (width_ok ? "OK. " : "SHORT by " + width_deficit_in.toFixed(1) + " in. ") + "Note that adding handrails later measures BETWEEN them and can take a compliant ramp under. ")
    + "LANDING (405.7): 60 in long minimum and at least as wide as the widest run leading to it" + (turns ? " - and this ramp CHANGES DIRECTION here, so the landing must be 60 x 60 minimum" + (turn_drives_width ? ", which at a " + rw + " in run is the 60 in that governs rather than the run width. This is the rule that turns a switchback into a wider footprint than anyone drew. " : ". ") : ". ")
    + "Required " + required_landing_length_in + " x " + required_landing_width_in + " in; entered " + ll + " x " + lw + " in: " + (landing_ok ? "OK. " : (landing_length_ok ? "" : "length short by " + landing_length_deficit_in.toFixed(1) + " in. ") + (landing_width_ok ? "" : "width short by " + landing_width_deficit_in.toFixed(1) + " in. "))
    + "EDGE PROTECTION (405.9): " + EDGES[edge_protection] + ". " + (edge_protection === "not-required" ? "Exception 1 covers a ramp that is not required to have handrails and whose sides comply with 406.3; Exception 2 covers the side of a landing serving an adjoining ramp run or stair; Exception 3 covers the side of a landing with a vertical drop-off of 1/2 in maximum within 10 in horizontally of the minimum landing area. Confirm the exception applies before relying on it. " : "") + (edge_ok ? "" : "NONE IS PROVIDED, and a handrail is not edge protection - the hazard is at the WHEEL, not at the hand. The two ways to satisfy it are the floor surface extended 12 in beyond the handrail, or a curb or barrier that stops a 4 in sphere from passing within 4 in of the surface. ")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: the running slope, the number of runs, the 30 in maximum rise per run, and the total ramp length, which are a separate tile; handrail height, grip, clearance, and extensions, which are their own tile; the surface, changes in level, and openings on the ramp and its landings; doors opening onto landings and the maneuvering clearance they need, which routinely conflicts with the 60 in landing; wet conditions and the requirement that outdoor ramps and their approaches be designed so water does not accumulate; the structure and its frost depth; curb ramps, which are section 406 and a different set of rules; and state and local accessibility law. A ramp detail screen, not a ramp design; the 2010 ADA Standards and the authority having jurisdiction govern.";

  return { cross_slope_ok, cross_slope_pct, effective_width_in, width_ok, width_deficit_in, handrails_cost_compliance, width_needed_between_rails_in, required_landing_length_in, required_landing_width_in, landing_length_ok, landing_width_ok, landing_length_deficit_in, landing_width_deficit_in, landing_ok, turn_drives_width, edge_ok, passes, note };
}

export const rampDetailCheckExample = { inputs: { cross_slope_ratio: 40, clear_width_in: 36, handrails: "yes", handrail_intrusion_in: 6, landing_length_in: 60, landing_width_in: 48, run_width_in: 36, changes_direction: "yes", edge_protection: "none" } };

ACCESSIBILITY_RENDERERS["ramp-detail-check"] = _simpleRenderer({
  citation: "Citation: 2010 ADA Standards for Accessible Design, 405.3, 405.5, 405.7.2, 405.7.3, 405.7.4, and 405.9. A US federal standard in the public domain. 405.3: cross slope of ramp runs shall not be steeper than 1:48. 405.5: the clear width of a ramp run and, where handrails are provided, the clear width between handrails shall be 36 in minimum. 405.7.2: the landing clear width shall be at least as wide as the widest ramp run leading to the landing. 405.7.3: the landing clear length shall be 60 in long minimum. 405.7.4: ramps that change direction between runs at landings shall have a clear landing 60 in minimum by 60 in minimum. 405.9: edge protection complying with 405.9.1 or 405.9.2 shall be provided on each side of ramp runs and at each side of ramp landings - either the surface of the ramp run or landing extending 12 in minimum beyond the inside face of a handrail, or a curb or barrier constructed so that the curb or barrier prevents the passage of a 4 in diameter sphere where any portion of the sphere is within 4 in of the finish floor or ground surface. Not checked: running slope, the number of runs, the 30 in maximum rise, and total length, which are a separate tile; handrail height, grip, clearance, and extensions, which are their own tile; the surface and changes in level; doors opening onto landings; drainage; curb ramps, which are section 406; or state and local law. A ramp detail screen, not a ramp design.",
  example: rampDetailCheckExample.inputs,
  fields: [
    { key: "cross_slope_ratio", label: "Cross slope, run per unit rise (48 = the 1:48 maximum)", kind: "number" },
    { key: "clear_width_in", label: "Clear width of the ramp run (in)", kind: "number" },
    { key: "handrails", label: "Handrails provided?", kind: "select", options: [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }] },
    { key: "handrail_intrusion_in", label: "Total width the handrails take from the run (in)", kind: "number" },
    { key: "landing_length_in", label: "Landing clear length (in)", kind: "number" },
    { key: "landing_width_in", label: "Landing clear width (in)", kind: "number" },
    { key: "run_width_in", label: "Width of the widest run reaching the landing (in)", kind: "number" },
    { key: "changes_direction", label: "Ramp changes direction at this landing?", kind: "select", options: [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }] },
    { key: "edge_protection", label: "Edge protection", kind: "select", options: [{ value: "none", label: "None provided", selected: true }, { value: "extended-floor", label: "Floor extended 12 in beyond the handrail" }, { value: "not-required", label: "Not required (405.9 Exception 1, 2 or 3)" }, { value: "curb-or-barrier", label: "Curb or barrier stopping a 4 in sphere" }] },
  ],
  outputs: [
    { key: "x", id: "rdc-out-x", label: "Cross slope (1:48 max)", value: (r) => fmt(r.cross_slope_pct, 2) + "% - " + (r.cross_slope_ok ? "OK" : "TOO STEEP") },
    { key: "w", id: "rdc-out-w", label: "Clear width", value: (r) => fmt(r.effective_width_in, 1) + " in " + (r.handrails_cost_compliance ? "between the handrails - the ramp is wide enough and the RAILS took it under; needs " + fmt(r.width_needed_between_rails_in, 1) + " in of ramp" : r.width_ok ? "- OK" : "- short by " + fmt(r.width_deficit_in, 1) + " in") },
    { key: "l", id: "rdc-out-l", label: "Landing required", value: (r) => r.required_landing_length_in + " x " + r.required_landing_width_in + " in" + (r.turn_drives_width ? " - the change in direction drives the width, not the run" : "") },
    { key: "p", id: "rdc-out-p", label: "Landing provided", value: (r) => r.landing_ok ? "meets both" : [r.landing_length_ok ? null : "length short " + fmt(r.landing_length_deficit_in, 1), r.landing_width_ok ? null : "width short " + fmt(r.landing_width_deficit_in, 1)].filter(Boolean).join(", ") + " in" },
    { key: "e", id: "rdc-out-e", label: "Edge protection", value: (r) => r.edge_ok ? "provided" : "NONE - and a handrail is not edge protection" },
    { key: "v", id: "rdc-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES the items entered" : "DOES NOT PASS" },
    { key: "n", id: "rdc-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeRampDetailCheck,
});
