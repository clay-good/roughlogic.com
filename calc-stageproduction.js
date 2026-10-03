// Group N (cont.): stage and live-production systems.
// spec-v1863 moves the existing spec-v1364..v1376 production-systems band
// out of calc-stage.js so the parent module stays below its gzip cap.
// Calculator behavior, IDs, citations, examples, and Group N assignments are unchanged.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeCheckbox,
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

function _r(spec) {
  const _rlRender = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    attachExampleButton(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = makeSelect(f.label, f.id || f.key, f.options);
      else if (f.kind === "checkbox") field = makeCheckbox(f.label, f.id || f.key);
      else field = makeNumber(f.label, f.id || f.key, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) {
        if (f.kind === "select") field.select.value = f.default;
        else if (f.kind === "checkbox") field.input.checked = !!f.default;
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
        else if (f.kind === "checkbox") fields[f.key].input.checked = !!v[f.key];
        else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = debounce(() => {
      const params = {};
      for (const f of spec.fields) {
        if (f.kind === "select") params[f.key] = fields[f.key].select.value;
        else if (f.kind === "checkbox") params[f.key] = fields[f.key].input.checked;
        else params[f.key] = Number(fields[f.key].input.value) || 0;
      }
      const r = spec.compute(params);
      if (r.error) { for (const k of Object.keys(outs)) outs[k].textContent = "-"; outs[spec.outputs[0].key].textContent = r.error; return; }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(r);
    }, DEBOUNCE_MS);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener(f.kind === "checkbox" ? "change" : "input", update);
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

export const STAGEPRODUCTION_RENDERERS = {};

// ===========================================================================
// spec-v1364..v1376: the 2026-08-26 trade-expansion Group N band.
// See specs/scope-trade-expansion.md. Thirteen tiles, no new dependency.
// ===========================================================================

// Speed of sound in dry air, ft/s: 49.03 x sqrt(Rankine), about 1,128 ft/s at 70 F (QSC prints
// 1,128 ft/s; until 2026-09-26 this used a 1,125 ft/s reference, 0.3% slow). Shared by the four
// acoustic tiles below; non-exported, so it adds no v14 derivation-corpus row.
const _speedOfSound = (temp_f) => 49.03 * Math.sqrt(temp_f + 459.67);

// ===================== spec-v1364: line array vertical coverage and splay =====================
// dims: in { trim_height_ft: L, ear_height_ft: L, near_throw_ft: L, far_throw_ft: L, cabinets: dimensionless } out: { coverage_deg: dimensionless, avg_splay_deg: dimensionless, level_taper_db: dimensionless }
export function computeLineArraySplay({ trim_height_ft = 0, ear_height_ft = 4, near_throw_ft = 0, far_throw_ft = 0, cabinets = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(trim_height_ft > 0)) return { error: "Trim height must be positive." };
  if (!(ear_height_ft >= 0)) return { error: "Ear height cannot be negative." };
  if (!(trim_height_ft > ear_height_ft)) return { error: "Trim height must be above the listener's ear height." };
  if (!(near_throw_ft > 0)) return { error: "Near throw must be positive." };
  if (!(far_throw_ft > near_throw_ft)) return { error: "Far throw must exceed the near throw." };
  if (!(cabinets >= 1)) return { error: "Cabinet count must be at least 1." };
  // The angle to cover is fixed by geometry, not by the boxes.
  const dh_ft = trim_height_ft - ear_height_ft;
  const angle_near_deg = Math.atan(dh_ft / near_throw_ft) * 180 / Math.PI;
  const angle_far_deg = Math.atan(dh_ft / far_throw_ft) * 180 / Math.PI;
  const coverage_deg = angle_near_deg - angle_far_deg;
  const avg_splay_deg = coverage_deg / cabinets;
  const level_taper_db = 20 * Math.log10(far_throw_ft / near_throw_ft);
  if (![dh_ft, angle_near_deg, angle_far_deg, coverage_deg, avg_splay_deg, level_taper_db].every(Number.isFinite)) return { error: "Line-array geometry is not a finite value." };
  return {
    angle_near_deg,
    angle_far_deg,
    coverage_deg,
    avg_splay_deg,
    level_taper_db,
    dh_ft,
    note: "The vertical angle a line array has to cover, the average splay per cabinet that covers it, and the level taper the splay pattern is being asked to recover. An array hung at a trim height must cover the angle between the down-tilt to the first row and the down-tilt to the last, and that angle is set by geometry rather than by the boxes: it is atan(drop / near throw) minus atan(drop / far throw), where the drop is the trim height above the listeners' ears. Dividing it by the cabinet count gives the average splay, which is the design starting point a manufacturer's prediction software then refines. The taper line explains why the splays are never actually equal: the last row is far more distant than the first, so it is much quieter by inverse square, and the array makes that up by aiming more of its energy at the far seats -- tight splays at the top where the boxes throw long, opening toward the bottom where they cover the near rows. An array trimmed at 26 ft over a seated audience with 4 ft ears, first row 25 ft and last row 150 ft, covers 41.3 down to 8.3 degrees, so 33.0 degrees across twelve cabinets is 2.75 degrees of average splay, against 20 log(150/25) = 15.6 dB of taper. Nearly sixteen decibels across thirty-three degrees is a lot of asymmetry to build in, and the top boxes will sit near the array's minimum splay while the bottom ones open to five or six. A design starting point; the manufacturer's prediction software and the array's mechanical splay limits govern the rig.",
  };
}

export const lineArraySplayExample = { inputs: { trim_height_ft: 26, ear_height_ft: 4, near_throw_ft: 25, far_throw_ft: 150, cabinets: 12 } };

STAGEPRODUCTION_RENDERERS["line-array-splay"] = _r({
  citation: "Citation: line-array vertical coverage from the trim geometry, with the inverse-square (20 log) level taper between the near and far rows, by name. Coverage = atan(dh/near) - atan(dh/far); average splay = coverage / cabinets. A design starting point; the manufacturer's prediction software and the array's mechanical splay limits govern.",
  example: lineArraySplayExample.inputs,
  fields: [
    { key: "trim_height_ft", label: "Trim height to the top of the array (ft)", kind: "number" },
    { key: "ear_height_ft", label: "Listener ear height (ft)", kind: "number" },
    { key: "near_throw_ft", label: "Near throw, array to first row (ft)", kind: "number" },
    { key: "far_throw_ft", label: "Far throw, array to last row (ft)", kind: "number" },
    { key: "cabinets", label: "Number of cabinets", kind: "number" },
  ],
  outputs: [
    { key: "n", id: "lasp-out-n", label: "Down-tilt to the first row", value: (r) => fmt(r.angle_near_deg, 2) + " deg below horizontal" },
    { key: "f", id: "lasp-out-f", label: "Down-tilt to the last row", value: (r) => fmt(r.angle_far_deg, 2) + " deg below horizontal" },
    { key: "c", id: "lasp-out-c", label: "Total vertical coverage", value: (r) => fmt(r.coverage_deg, 2) + " deg" },
    { key: "s", id: "lasp-out-s", label: "Average splay per box", value: (r) => fmt(r.avg_splay_deg, 2) + " deg" },
    { key: "t", id: "lasp-out-t", label: "Near-to-far level taper", value: (r) => fmt(r.level_taper_db, 1) + " dB" },
    { key: "z", id: "lasp-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeLineArraySplay,
});

// ===================== spec-v1365: delay loudspeaker time and Haas offset =====================
// dims: in { distance_ft: L, temp_f: T, haas_offset_ms: T, compare_temp_f: T } out: { speed_ft_s: L T^-1, geometric_ms: T, set_delay_ms: T }
export function computeDelayTowerAlignment({ distance_ft = 0, temp_f = 70, haas_offset_ms = 15, compare_temp_f = 90 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(distance_ft > 0)) return { error: "Distance from the main array must be positive." };
  if (!(temp_f > -459.67)) return { error: "Air temperature must be above absolute zero." };
  if (!(compare_temp_f > -459.67)) return { error: "Comparison temperature must be above absolute zero." };
  if (!(haas_offset_ms >= 0)) return { error: "Haas offset cannot be negative." };
  // The speed of sound rises with the square root of ABSOLUTE temperature, so an
  // alignment set in the afternoon is wrong by showtime -- and the error grows with distance.
  const speed_ft_s = _speedOfSound(temp_f);
  const geometric_ms = distance_ft / speed_ft_s * 1000;
  const set_delay_ms = geometric_ms + haas_offset_ms;
  const compare_speed_ft_s = _speedOfSound(compare_temp_f);
  const compare_geometric_ms = distance_ft / compare_speed_ft_s * 1000;
  const drift_ms = compare_geometric_ms - geometric_ms;
  const haas_distance_ft = haas_offset_ms / 1000 * speed_ft_s;
  if (![speed_ft_s, geometric_ms, set_delay_ms, compare_geometric_ms, drift_ms, haas_distance_ft].every(Number.isFinite)) return { error: "Delay-alignment math is not a finite value." };
  return {
    speed_ft_s,
    geometric_ms,
    set_delay_ms,
    compare_speed_ft_s,
    compare_geometric_ms,
    drift_ms,
    haas_distance_ft,
    note: "The delay time to set on a delay tower or under-balcony loudspeaker, and how far that setting moves when the air temperature does. The geometric half is the easy half: sound from the main array reaches the delay position some milliseconds after the delay speaker could fire, and delaying the tower by that time puts the two arrivals on top of each other. But two coincident arrivals from two directions do not localize, so the audience hears the delay speaker sitting right above them and the show appears to come from the wrong place. The Haas offset is the fix: adding 10 to 20 milliseconds beyond the geometric time makes the main array arrive FIRST by a margin the ear reads as the source direction, while the delay speaker, arriving inside the precedence window, still adds level without being heard separately. Fifteen milliseconds is the common starting point. Temperature is the trap, because the speed of sound rises with the square root of absolute temperature: a tower 180 ft downfield aligned at 70 F takes 159.5 ms of geometric delay, and on a 90 F afternoon the air carries sound at 1,150 ft/s instead of 1,128 and the geometric time falls to 156.6 ms. Three milliseconds is small, but the same twenty-degree swing on a 400 ft throw is 6.5 ms, which is audible, and outdoor shows re-check delay times when the air moves. An alignment starting point; a measurement system and the system engineer's ears govern the final setting.",
  };
}

export const delayTowerAlignmentExample = { inputs: { distance_ft: 180, temp_f: 70, haas_offset_ms: 15, compare_temp_f: 90 } };

STAGEPRODUCTION_RENDERERS["delay-tower-alignment"] = _r({
  citation: "Citation: delay-loudspeaker alignment time from the geometric propagation delay plus a Haas (precedence-effect) offset, with the speed of sound scaled as the square root of absolute temperature, about 1,128 ft/s at 70 F, by name. The precedence effect is Haas's published result, cited not reproduced. A measurement system and the system engineer govern the final setting.",
  example: delayTowerAlignmentExample.inputs,
  fields: [
    { key: "distance_ft", label: "Main array to delay position (ft)", kind: "number" },
    { key: "temp_f", label: "Air temperature (F)", kind: "number", default: 70 },
    { key: "haas_offset_ms", label: "Haas offset (ms)", kind: "number", default: 15 },
    { key: "compare_temp_f", label: "Comparison temperature (F)", kind: "number" },
  ],
  outputs: [
    { key: "c", id: "dtal-out-c", label: "Speed of sound at this temperature", value: (r) => fmt(r.speed_ft_s, 1) + " ft/s" },
    { key: "g", id: "dtal-out-g", label: "Geometric delay", value: (r) => fmt(r.geometric_ms, 1) + " ms" },
    { key: "s", id: "dtal-out-s", label: "Delay to set", value: (r) => fmt(r.set_delay_ms, 1) + " ms (Haas offset is worth " + fmt(r.haas_distance_ft, 1) + " ft of apparent distance)" },
    { key: "t", id: "dtal-out-t", label: "Geometric delay at the comparison temperature", value: (r) => fmt(r.compare_geometric_ms, 1) + " ms at " + fmt(r.compare_speed_ft_s, 1) + " ft/s" },
    { key: "d", id: "dtal-out-d", label: "Drift between the two temperatures", value: (r) => fmt(r.drift_ms, 2) + " ms" },
    { key: "z", id: "dtal-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeDelayTowerAlignment,
});

// ===================== spec-v1366: end-fire and cardioid subwoofer array spacing =====================
// dims: in { spacing_ft: L, elements: dimensionless, temp_f: T, target_freq_hz: T^-1 } out: { delay_per_element_ms: T, optimum_freq_hz: T^-1, wavelength_ft: L }
export function computeCardioidSubArray({ spacing_ft = 0, elements = 4, temp_f = 70, target_freq_hz = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // Unit / range guard added 2026-09-26 after printed-example probing.
  if (!Number.isInteger(Number(arguments[0]?.elements ?? 4))) return { error: "The element count must be a whole number." };
  if (!(spacing_ft > 0)) return { error: "Element spacing must be positive." };
  if (!(elements >= 2)) return { error: "An end-fire array needs at least 2 elements." };
  if (!(temp_f > -459.67)) return { error: "Air temperature must be above absolute zero." };
  if (!(target_freq_hz >= 0)) return { error: "Target rejection frequency cannot be negative." };
  // Rejection is deepest where the spacing is a QUARTER wavelength: that puts the rear
  // arrivals a half wavelength -- a full polarity flip -- apart.
  const speed_ft_s = _speedOfSound(temp_f);
  const delay_per_element_ms = spacing_ft / speed_ft_s * 1000;
  const optimum_freq_hz = speed_ft_s / (4 * spacing_ft);
  const wavelength_ft = speed_ft_s / optimum_freq_hz;
  const total_delay_ms = delay_per_element_ms * (elements - 1);
  const array_depth_ft = spacing_ft * (elements - 1);
  const spacing_for_target_ft = target_freq_hz > 0 ? speed_ft_s / (4 * target_freq_hz) : null;
  if (![delay_per_element_ms, optimum_freq_hz, wavelength_ft, total_delay_ms, array_depth_ft].every(Number.isFinite)) return { error: "End-fire array math is not a finite value." };
  if (spacing_for_target_ft !== null && !Number.isFinite(spacing_for_target_ft)) return { error: "End-fire array math is not a finite value." };
  return {
    delay_per_element_ms,
    optimum_freq_hz,
    wavelength_ft,
    total_delay_ms,
    array_depth_ft,
    spacing_for_target_ft,
    speed_ft_s,
    note: "The per-element delay for an end-fire subwoofer array and the frequency at which its rearward rejection is deepest. An end-fire array puts subwoofers in a line pointed at the audience and delays each one behind the one in front by exactly the time sound takes to travel the spacing. Forward, every cabinet's output arrives together and adds; backward, the electronic delay and the acoustic travel time add rather than cancel, so the rear arrivals spread out and the level collapses. The rejection is deepest where the spacing is a QUARTER wavelength, because that puts the rear arrivals a half wavelength -- a full polarity flip -- apart, which makes the optimum frequency the speed of sound divided by four times the spacing. That quarter-wave relationship is the whole design, and it also sets the band: an array tuned for deep rejection at 90 Hz is progressively less directional as frequency falls, and above roughly twice the tuning frequency the pattern breaks up. Adding elements deepens and broadens the rejection without moving where it is centered. Four cabinets on 3.0 ft centers at 70 F want 2.659 ms per element, with the deepest rejection at 1128 / 12 = 94.0 Hz, right in the kick-drum band, and a 12.0 ft wavelength there of which the spacing is one quarter. Moving the tuning down to 60 Hz opens the spacing to 4.70 ft, which puts over fourteen feet of stage depth behind four cabinets -- and that trade, stage depth against depth of rejection, is the real constraint. The reverse-stack cardioid variant works on the same arithmetic with the spacing set by cabinet depth rather than chosen. A design relation; a measurement system and the room govern the deployed result.",
  };
}

export const cardioidSubArrayExample = { inputs: { spacing_ft: 3.0, elements: 4, temp_f: 70, target_freq_hz: 60 } };

STAGEPRODUCTION_RENDERERS["cardioid-sub-array"] = _r({
  citation: "Citation: end-fire and reverse-stack cardioid subwoofer arrays from the quarter-wavelength spacing relation, by name (standard live-sound system design practice; the quarter-wave rear-cancellation geometry is public acoustics). Delay per element = spacing / c; optimum rejection frequency = c / (4 x spacing). A measurement system and the room govern the deployed result.",
  example: cardioidSubArrayExample.inputs,
  fields: [
    { key: "spacing_ft", label: "Element spacing, front to back (ft)", kind: "number" },
    { key: "elements", label: "Number of elements", kind: "number" },
    { key: "temp_f", label: "Air temperature (F)", kind: "number", default: 70 },
    { key: "target_freq_hz", label: "Target rejection frequency (Hz, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "d", id: "csub-out-d", label: "Delay per element", value: (r) => fmt(r.delay_per_element_ms, 3) + " ms (last element " + fmt(r.total_delay_ms, 3) + " ms)" },
    { key: "f", id: "csub-out-f", label: "Deepest rejection at", value: (r) => fmt(r.optimum_freq_hz, 2) + " Hz" },
    { key: "w", id: "csub-out-w", label: "Wavelength there", value: (r) => fmt(r.wavelength_ft, 2) + " ft (the spacing is one quarter of it)" },
    { key: "p", id: "csub-out-p", label: "Array depth on deck", value: (r) => fmt(r.array_depth_ft, 2) + " ft" },
    { key: "s", id: "csub-out-s", label: "Spacing the target frequency would need", value: (r) => r.spacing_for_target_ft === null ? "-" : fmt(r.spacing_for_target_ft, 2) + " ft" },
    { key: "z", id: "csub-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeCardioidSubArray,
});

// ===================== spec-v1367: driver spacing, lobing, and crossover ceiling =====================
// dims: in { spacing_ft: L, test_freq_hz: T^-1, temp_f: T } out: { crossover_ceiling_hz: T^-1, wavelength_ft: L, max_spacing_ft: L }
export function computeDriverSpacingLobing({ spacing_ft = 0, test_freq_hz = 0, temp_f = 70 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(spacing_ft > 0)) return { error: "Center-to-center spacing must be positive." };
  if (!(test_freq_hz > 0)) return { error: "Crossover or test frequency must be positive." };
  if (!(temp_f > -459.67)) return { error: "Air temperature must be above absolute zero." };
  // No null can exist anywhere below c / (2 x spacing), because even the worst-case path
  // difference -- the full spacing, 90 degrees off axis -- is under half a wavelength.
  const speed_ft_s = _speedOfSound(temp_f);
  const crossover_ceiling_hz = speed_ft_s / (2 * spacing_ft);
  const wavelength_ft = speed_ft_s / test_freq_hz;
  const ratio = speed_ft_s / (2 * spacing_ft * test_freq_hz);
  const null_angle_deg = ratio <= 1 ? Math.asin(ratio) * 180 / Math.PI : null;
  const max_spacing_ft = speed_ft_s / (2 * test_freq_hz);
  const verdict = null_angle_deg === null
    ? "clean: no null exists anywhere at this frequency, and the pair behaves as one source"
    : "a null sits " + fmt(null_angle_deg, 1) + " deg off axis at this frequency, and it moves with frequency as the audience walks past it";
  if (![crossover_ceiling_hz, wavelength_ft, ratio, max_spacing_ft].every(Number.isFinite)) return { error: "Driver-spacing math is not a finite value." };
  return {
    crossover_ceiling_hz,
    wavelength_ft,
    null_angle_deg,
    max_spacing_ft,
    verdict,
    speed_ft_s,
    note: "The highest frequency two sources on a given center-to-center spacing can share before the pattern acquires a null, and where that null sits when they are crossed above it. Two sources radiating the same signal are in phase everywhere on their perpendicular bisector and progressively out of phase off it, because the path lengths differ by the spacing times the sine of the off-axis angle. When that path difference reaches half a wavelength they cancel. Below the frequency at which even the WORST case -- the full spacing, at 90 degrees off axis -- is under half a wavelength, no null can exist anywhere and the pair behaves as one source, which puts the crossover ceiling at the speed of sound divided by twice the spacing. Cross two drivers below it and the array is coherent through the crossover region; cross above it and a null sits in the pattern at the crossover, moving with frequency, audible as the audience walks past it. Two 15 in woofers on 18 in centers at 70 F have a ceiling of 1128 / 3 = 376 Hz: crossed at 250 Hz the ratio exceeds one and there is no null anywhere, while crossed at 500 Hz the ratio is 0.75 and the null lands 48.8 degrees off axis. Run it backward and keeping 500 Hz clean would need the spacing in to 1.13 ft, about thirteen and a half inches center to center, which two 15 in drivers physically cannot do -- which is why large-format two-way boxes cross low, and why the spacing constraint is a cabinet design decision long before it is a system tuning one. The same arithmetic answers how far apart two subwoofers can be spread before the center of the room gets a hole. A geometric screen; measured polar data governs a real cabinet.",
  };
}

export const driverSpacingLobingExample = { inputs: { spacing_ft: 1.5, test_freq_hz: 500, temp_f: 70 } };

STAGEPRODUCTION_RENDERERS["driver-spacing-lobing"] = _r({
  citation: "Citation: two-source interference geometry -- path difference = spacing x sin(angle), first null at half a wavelength -- giving the crossover ceiling c / (2 x spacing), by name. Public acoustics, standard in the loudspeaker-design literature. Measured polar data for the real cabinet governs.",
  example: driverSpacingLobingExample.inputs,
  fields: [
    { key: "spacing_ft", label: "Center-to-center spacing (ft)", kind: "number" },
    { key: "test_freq_hz", label: "Crossover or test frequency (Hz)", kind: "number" },
    { key: "temp_f", label: "Air temperature (F)", kind: "number", default: 70 },
  ],
  outputs: [
    { key: "c", id: "dslo-out-c", label: "Crossover ceiling", value: (r) => fmt(r.crossover_ceiling_hz, 1) + " Hz" },
    { key: "v", id: "dslo-out-v", label: "At the test frequency", value: (r) => r.verdict },
    { key: "w", id: "dslo-out-w", label: "Wavelength at the test frequency", value: (r) => fmt(r.wavelength_ft, 3) + " ft" },
    { key: "m", id: "dslo-out-m", label: "Maximum spacing that keeps the test frequency clean", value: (r) => fmt(r.max_spacing_ft, 3) + " ft (" + fmt(r.max_spacing_ft * 12, 1) + " in)" },
    { key: "z", id: "dslo-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeDriverSpacingLobing,
});

// ===================== spec-v1368: two-transmitter intermodulation screen =====================
// dims: in { f1_mhz: T^-1, f2_mhz: T^-1, test_freq_mhz: T^-1 } out: { spacing_mhz: T^-1, third_low_mhz: T^-1, third_high_mhz: T^-1 }
export function computeWirelessIntermod({ f1_mhz = 0, f2_mhz = 0, test_freq_mhz = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(f1_mhz > 0) || !(f2_mhz > 0)) return { error: "Both carrier frequencies must be positive." };
  if (f1_mhz === f2_mhz) return { error: "The two carriers must be on different frequencies." };
  if (f1_mhz < 30 || f2_mhz < 30 || f1_mhz > 6000 || f2_mhz > 6000) return { error: "Enter carrier frequencies in MHz (wireless mics sit about 470 to 2,400 MHz), not kHz or GHz." };
  if (Math.max(f1_mhz, f2_mhz) >= 2 * Math.min(f1_mhz, f2_mhz)) return { error: "Carriers an octave or more apart put a third-order product at or below zero; these are not two channels of one band." };
  if (!(test_freq_mhz >= 0)) return { error: "Test frequency cannot be negative." };
  // An evenly spaced channel plan is the WORST possible plan: the third-order product of
  // one pair lands exactly on the next channel.
  const lo = Math.min(f1_mhz, f2_mhz);
  const hi = Math.max(f1_mhz, f2_mhz);
  const spacing_mhz = hi - lo;
  const third_low_mhz = 2 * lo - hi;
  const third_high_mhz = 2 * hi - lo;
  const fifth_low_mhz = 3 * lo - 2 * hi;
  const fifth_high_mhz = 3 * hi - 2 * lo;
  const products = [third_low_mhz, third_high_mhz, fifth_low_mhz, fifth_high_mhz];
  let nearest_product_mhz = null;
  let test_margin_mhz = null;
  if (test_freq_mhz > 0) {
    nearest_product_mhz = products.reduce((a, b) => (Math.abs(b - test_freq_mhz) < Math.abs(a - test_freq_mhz) ? b : a));
    test_margin_mhz = Math.abs(nearest_product_mhz - test_freq_mhz);
  }
  if (!products.every(Number.isFinite) || !Number.isFinite(spacing_mhz)) return { error: "Intermodulation math is not a finite value." };
  return {
    spacing_mhz,
    third_low_mhz,
    third_high_mhz,
    fifth_low_mhz,
    fifth_high_mhz,
    nearest_product_mhz,
    test_margin_mhz,
    note: "Where two wireless transmitters put their intermodulation products, and how close a third channel sits to one. When two transmitters are near enough for one's signal to reach the other's output stage, or for both to hit a shared receiver front end, the nonlinearity mixes them and the products land at predictable frequencies. The third-order pair lands one full spacing outside each carrier, so two transmitters 3 MHz apart put products 3 MHz below the lower and 3 MHz above the upper; the fifth-order pair lands two spacings out, weaker but still able to take down a channel. The practical consequence is that an evenly spaced channel plan is the worst possible plan. Carriers at 542.000 and 545.000 MHz are 3.000 MHz apart and produce third-order products at 539.000 and 548.000 and fifth-order products at 536.000 and 551.000, so a third channel at 539.000 -- which looks like a perfectly reasonable 3 MHz step down -- sits directly on a product and is unusable whenever both other transmitters are on. Moving it to 540.100 clears every product in the list by at least a megahertz. Note also that an evenly spaced five-channel plan on 3 MHz steps collides with itself at both ends. Coordination software solves the whole set at once; this solves the pair, which is what a tech in a room needs when one channel out of twelve is dropping and the rest are fine. A screen, not a coordination: the FCC rules for the band, the licensed users in the market, and full coordination software govern a real channel plan.",
  };
}

export const wirelessIntermodExample = { inputs: { f1_mhz: 542.0, f2_mhz: 545.0, test_freq_mhz: 539.0 } };

STAGEPRODUCTION_RENDERERS["wireless-intermod"] = _r({
  citation: "Citation: third- and fifth-order two-tone intermodulation products (2f1-f2, 2f2-f1, 3f1-2f2, 3f2-2f1), by name -- public RF theory, and the frequency-coordination practice published by the wireless-microphone manufacturers. A pair screen, not a coordination; the FCC rules for the band, the licensed users in the market, and full coordination software govern a real channel plan.",
  example: wirelessIntermodExample.inputs,
  fields: [
    { key: "f1_mhz", label: "Carrier 1 (MHz)", kind: "number" },
    { key: "f2_mhz", label: "Carrier 2 (MHz)", kind: "number" },
    { key: "test_freq_mhz", label: "Third channel to test (MHz, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "s", id: "wint-out-s", label: "Carrier spacing", value: (r) => fmt(r.spacing_mhz, 3) + " MHz" },
    { key: "t", id: "wint-out-t", label: "Third-order products", value: (r) => fmt(r.third_low_mhz, 3) + " MHz and " + fmt(r.third_high_mhz, 3) + " MHz" },
    { key: "f", id: "wint-out-f", label: "Fifth-order products", value: (r) => fmt(r.fifth_low_mhz, 3) + " MHz and " + fmt(r.fifth_high_mhz, 3) + " MHz" },
    { key: "m", id: "wint-out-m", label: "Test channel against the nearest product", value: (r) => r.test_margin_mhz === null ? "-" : fmt(r.test_margin_mhz, 3) + " MHz clear of " + fmt(r.nearest_product_mhz, 3) + " MHz" },
    { key: "z", id: "wint-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeWirelessIntermod,
});

// ===================== spec-v1369: RF antenna cable loss and amplifier budget =====================
// dims: in { length_ft: L, loss_per_100ft_db: dimensionless, connectors: dimensionless, loss_per_connector_db: dimensionless, splitter_loss_db: dimensionless, amplifier_gain_db: dimensionless } out: { cable_loss_db: dimensionless, total_loss_db: dimensionless, net_gain_db: dimensionless }
export function computeRfAntennaCableLoss({ length_ft = 0, loss_per_100ft_db = 0, connectors = 0, loss_per_connector_db = 0.25, splitter_loss_db = 0, amplifier_gain_db = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // Unit / range guard added 2026-09-26 after printed-example probing.
  if (!Number.isInteger(Number(arguments[0]?.connectors ?? 0))) return { error: "The connector count must be a whole number." };
  if (!(length_ft > 0)) return { error: "Cable length must be positive." };
  if (!(loss_per_100ft_db > 0)) return { error: "Loss per 100 ft must be positive." };
  if (!(connectors >= 0)) return { error: "Connector count cannot be negative." };
  if (!(loss_per_connector_db >= 0)) return { error: "Per-connector loss cannot be negative." };
  if (!(splitter_loss_db >= 0)) return { error: "Splitter insertion loss cannot be negative." };
  if (!(amplifier_gain_db >= 0)) return { error: "Amplifier gain cannot be negative." };
  // The target is UNITY gain, not maximum gain: an amplifier replaces the cable's loss.
  const cable_loss_db = length_ft / 100 * loss_per_100ft_db;
  const connector_loss_db = connectors * loss_per_connector_db;
  const total_loss_db = cable_loss_db + connector_loss_db + splitter_loss_db;
  const net_gain_db = amplifier_gain_db - total_loss_db;
  const verdict = net_gain_db > 3
    ? "OVER unity: the receiver front end is being pushed toward overload and intermodulation, and the symptom looks exactly like a weak signal"
    : net_gain_db < -3
      ? "UNDER unity: every decibel short of unity comes straight off the system's range"
      : "at unity (within the -3 to +3 dB window): the amplifier is replacing the cable's loss rather than exceeding it";
  if (![cable_loss_db, connector_loss_db, total_loss_db, net_gain_db].every(Number.isFinite)) return { error: "RF budget math is not a finite value." };
  return {
    cable_loss_db,
    connector_loss_db,
    total_loss_db,
    net_gain_db,
    verdict,
    note: "The loss between a wireless antenna and its receiver, and whether the inline amplifier makes it up or overshoots. Coax loss is quoted per hundred feet at a stated frequency and rises with frequency, so a run that is fine for a 200 MHz intercom is lossy for a 600 MHz microphone. Every decibel lost between the antenna and the receiver comes straight off the system's range and cannot be recovered downstream, because an amplifier at the receiver end amplifies the noise the cable added along with the signal. The target is UNITY gain, not maximum gain: an inline amplifier is there to replace the cable's loss, not to exceed it, and a net meaningfully above zero pushes the receiver front end toward overload and intermodulation, whose symptom looks exactly like a weak signal. Aim for a net between about -3 and +3 dB, and put the amplifier at the antenna end where it amplifies signal before the cable degrades it. A 150 ft run on RG-8X-class coax at 600 MHz, about 8.8 dB per 100 ft, loses 13.2 dB, so a 12 dB inline amplifier lands at -1.2 dB net and the system will work. Change one thing -- the same 150 ft on LMR-400-class coax at about 3.2 dB per 100 ft at 600 MHz (Times Microwave prints 2.7 at 450 MHz and 3.9 at 900) -- and the loss is about 4.8 dB, about a third of the RG-8X loss, so a small amplifier brings it to unity, or none at all if the system has range to spare, which leaves one less active device in the path. Better cable is almost always the better answer. A budget estimate; the cable manufacturer's published loss at the operating frequency and a measured RF level govern.",
  };
}

export const rfAntennaCableLossExample = { inputs: { length_ft: 150, loss_per_100ft_db: 8.8, connectors: 0, loss_per_connector_db: 0.25, splitter_loss_db: 0, amplifier_gain_db: 12 } };

STAGEPRODUCTION_RENDERERS["rf-antenna-cable-loss"] = _r({
  citation: "Citation: RF antenna feedline budget from the cable manufacturer's published loss per 100 ft at the operating frequency, plus connector and splitter insertion loss, against inline amplifier gain, by name. The unity-gain target (net between about -3 and +3 dB) is the wireless-microphone manufacturers' published antenna-distribution practice. A measured RF level governs.",
  example: rfAntennaCableLossExample.inputs,
  fields: [
    { key: "length_ft", label: "Cable length (ft)", kind: "number" },
    { key: "loss_per_100ft_db", label: "Cable loss per 100 ft at the operating frequency (dB)", kind: "number" },
    { key: "connectors", label: "Number of connectors", kind: "number" },
    { key: "loss_per_connector_db", label: "Loss per connector (dB)", kind: "number" },
    { key: "splitter_loss_db", label: "Splitter or distribution insertion loss (dB)", kind: "number" },
    { key: "amplifier_gain_db", label: "Inline amplifier gain (dB)", kind: "number" },
  ],
  outputs: [
    { key: "c", id: "rfcl-out-c", label: "Cable loss", value: (r) => fmt(r.cable_loss_db, 2) + " dB" },
    { key: "t", id: "rfcl-out-t", label: "Total system loss", value: (r) => fmt(r.total_loss_db, 2) + " dB" },
    { key: "n", id: "rfcl-out-n", label: "Net gain", value: (r) => fmt(r.net_gain_db, 2) + " dB" },
    { key: "v", id: "rfcl-out-v", label: "Against unity", value: (r) => r.verdict },
    { key: "z", id: "rfcl-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeRfAntennaCableLoss,
});

// ===================== spec-v1370: chain hoist lift time, power, and duty cycle =====================
// dims: in { lift_height_ft: L, hoist_speed_fpm: L T^-1, load_lb: M L T^-2, duty_cycle: dimensionless, rating_period_min: T, hoists: dimensionless } out: { lift_time_min: T, hoisting_hp: M L^2 T^-3, allowed_on_time_min: T, lifts_per_period: dimensionless }
export function computeChainHoistLiftTime({ lift_height_ft = 0, hoist_speed_fpm = 16, load_lb = 0, duty_cycle = 0.4, rating_period_min = 10, hoists = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // Unit / range guard added 2026-09-26 after printed-example probing.
  if (!Number.isInteger(Number(arguments[0]?.hoists ?? 1))) return { error: "The hoist count must be a whole number." };
  if (!(lift_height_ft > 0)) return { error: "Lift height must be positive." };
  if (!(hoist_speed_fpm > 0)) return { error: "Hoist speed must be positive." };
  if (!(load_lb > 0)) return { error: "Load must be positive." };
  if (!(duty_cycle > 0 && duty_cycle <= 1)) return { error: "Duty-cycle fraction must be between 0 and 1." };
  if (!(rating_period_min > 0)) return { error: "Rating period must be positive." };
  if (!(hoists >= 1)) return { error: "Hoist count must be at least 1." };
  // An electric chain hoist is rated for INTERMITTENT duty. On a long trim one
  // full-height lift can consume most of the allowed on-time by itself.
  const lift_time_min = lift_height_ft / hoist_speed_fpm;
  const hoisting_hp = load_lb * hoist_speed_fpm / 33000;
  const set_hp = hoisting_hp * hoists;
  const allowed_on_time_min = duty_cycle * rating_period_min;
  const lifts_per_period = allowed_on_time_min / lift_time_min;
  const verdict = lifts_per_period >= 2
    ? "room to spare: the rating allows at least two full lifts per period"
    : lifts_per_period >= 1
      ? "only " + lifts_per_period.toFixed(1) + " lifts per period and no margin: a rig that has to come in and out twice inside the period is asking the motor for more than its rating"
      : "over the rating: a single full-height lift exceeds the allowed on-time, so the motor cannot make the trim in one press without exceeding its duty cycle";
  if (![lift_time_min, hoisting_hp, set_hp, allowed_on_time_min, lifts_per_period].every(Number.isFinite)) return { error: "Chain-hoist duty math is not a finite value." };
  return {
    lift_time_min,
    hoisting_hp,
    set_hp,
    allowed_on_time_min,
    lifts_per_period,
    verdict,
    note: "How long a chain hoist takes to make its trim, how much power it draws doing it, and how many times the rating allows that inside one period. The first line is the schedule, and it is the one nobody estimates correctly by eye: a hundred trusses that each take four minutes to fly is nearly seven hours of hoist time, and hoist speed varies by an order of magnitude across the hoists on a truck -- 16 ft/min for a standard motor, 32 or 64 for a high-speed one. The duty-cycle lines are the ones that surprise people. An electric chain hoist is rated for INTERMITTENT duty, and a common rating allows the motor to run 40% of a ten-minute period, four minutes on and six minutes off. Run it harder and the motor overheats, and the failure is not graceful. A one-ton hoist at 16 ft/min taking a 2,000 lb load up a 60 ft trim needs 60 / 16 = 3.75 min, draws 2,000 x 16 / 33,000 = 0.97 hoisting horsepower, and against a 40% duty over ten minutes has 4.0 minutes of allowed on-time -- 1.07 lifts per period, one lift and no margin. A show that needs the same rig in and out twice in a ten-minute window is asking the motor for more than its rating, and the answer is a faster hoist or a shorter trim, not a longer button press. Note that the hoisting horsepower is under one: chain hoist motors are small, and the number that sizes the distro is the INRUSH, not this steady figure. A planning screen; the hoist manufacturer's duty rating and load chart, ANSI E1.6, and the venue's qualified rigger govern.",
  };
}

export const chainHoistLiftTimeExample = { inputs: { lift_height_ft: 60, hoist_speed_fpm: 16, load_lb: 2000, duty_cycle: 0.40, rating_period_min: 10, hoists: 8 } };

STAGEPRODUCTION_RENDERERS["chain-hoist-lift-time"] = _r({
  citation: "Citation: chain-hoist lift time from height and rated speed, hoisting horsepower from load x speed / 33,000, and the intermittent-duty on-time from the motor's rated duty cycle over its rating period, by name. Duty ratings and load charts are the hoist manufacturer's; ANSI E1.6 entertainment hoist standards and the venue's qualified rigger govern. The distro is sized on inrush, not on this steady figure.",
  example: chainHoistLiftTimeExample.inputs,
  fields: [
    { key: "lift_height_ft", label: "Lift height / trim (ft)", kind: "number" },
    { key: "hoist_speed_fpm", label: "Hoist speed (ft/min)", kind: "number" },
    { key: "load_lb", label: "Load per hoist (lb)", kind: "number" },
    { key: "duty_cycle", label: "Duty-cycle fraction (0.40 = 40%)", kind: "number" },
    { key: "rating_period_min", label: "Rating period (min)", kind: "number" },
    { key: "hoists", label: "Number of hoists", kind: "number" },
  ],
  outputs: [
    { key: "t", id: "chlt-out-t", label: "Lift time", value: (r) => fmt(r.lift_time_min, 2) + " min" },
    { key: "p", id: "chlt-out-p", label: "Hoisting horsepower", value: (r) => fmt(r.hoisting_hp, 2) + " hp each (" + fmt(r.set_hp, 2) + " hp for the set)" },
    { key: "o", id: "chlt-out-o", label: "Allowed on-time per period", value: (r) => fmt(r.allowed_on_time_min, 2) + " min" },
    { key: "l", id: "chlt-out-l", label: "Full lifts per period", value: (r) => fmt(r.lifts_per_period, 2) },
    { key: "v", id: "chlt-out-v", label: "Against the duty rating", value: (r) => r.verdict },
    { key: "z", id: "chlt-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeChainHoistLiftTime,
});

// ===================== spec-v1371: gobo projected image size and keystone =====================
// dims: in { throw_ft: L, field_angle_deg: dimensionless, incidence_deg: dimensionless, gobo_image_mm: L, gate_diameter_mm: L } out: { image_diameter_ft: L, keystone_stretch: dimensionless, stretched_axis_ft: L, relative_illuminance: dimensionless }
export function computeGoboImageSize({ throw_ft = 0, field_angle_deg = 0, incidence_deg = 0, gobo_image_mm = 0, gate_diameter_mm = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(throw_ft > 0)) return { error: "Throw distance must be positive." };
  if (!(field_angle_deg > 0 && field_angle_deg < 180)) return { error: "Field angle must be between 0 and 180 degrees." };
  if (!(incidence_deg >= 0 && incidence_deg < 90)) return { error: "Incidence angle must be at least 0 and below 90 degrees." };
  if (!(gobo_image_mm >= 0 && gate_diameter_mm >= 0)) return { error: "Gobo image and gate diameters cannot be negative." };
  if (gobo_image_mm > 0 && gate_diameter_mm > 0 && gobo_image_mm > gate_diameter_mm) return { error: "The gobo's usable image cannot be larger than the gate." };
  // The image is the field-angle cone intersected with the surface. Off perpendicular the
  // edge rays at +/- phi (half the field) land T sin(phi)/cos(alpha -/+ phi) either side of
  // the beam centre, so the long axis is T sin(phi) [1/cos(alpha - phi) + 1/cos(alpha + phi)].
  // Until 2026-09-25 this used the narrow-beam limit 1/cos(alpha), 11% short for a 36-degree
  // field at 45 degrees and a third short at 60; past alpha + phi = 90 the far edge never lands.
  const phi = field_angle_deg / 2 * Math.PI / 180, alpha = incidence_deg * Math.PI / 180;
  if (alpha + phi >= Math.PI / 2 - 1e-9) return { error: "At this incidence the far edge of the beam runs parallel to or away from the surface (incidence + half the field angle reaches 90 degrees), so the image has no finite length." };
  const image_diameter_ft = 2 * throw_ft * Math.tan(phi);
  const stretched_axis_ft = throw_ft * Math.sin(phi) * (1 / Math.cos(alpha - phi) + 1 / Math.cos(alpha + phi));
  const keystone_stretch = stretched_axis_ft / image_diameter_ft;
  const relative_illuminance = Math.cos(incidence_deg * Math.PI / 180);
  const stops_down = -Math.log2(relative_illuminance);
  const frame_fraction = (gobo_image_mm > 0 && gate_diameter_mm > 0) ? gobo_image_mm / gate_diameter_mm : null;
  const framed_diameter_ft = frame_fraction === null ? null : image_diameter_ft * frame_fraction;
  if (![image_diameter_ft, keystone_stretch, stretched_axis_ft, relative_illuminance, stops_down].every(Number.isFinite)) return { error: "Gobo projection math is not a finite value." };
  return {
    image_diameter_ft,
    keystone_stretch,
    stretched_axis_ft,
    relative_illuminance,
    stops_down,
    framed_diameter_ft,
    note: "The size a gobo image projects to, how much a non-perpendicular hit stretches it, and what that costs in brightness. A gobo fills the fixture's field, so the projected image is the field-angle cone intersected with the surface: straight on, a circle whose diameter is twice the throw times the tangent of half the field angle, the same geometry as the beam pool applied to the image rather than the light. Off perpendicular that circle becomes an ellipse. The axis in the plane of the tilt stretches, and more than the narrow-beam 1/cos rule says, because the far edge of the beam lands at a flatter angle than the centre: each edge ray at half the field angle phi lands throw x sin(phi)/cos(incidence -/+ phi) from the centre. The perpendicular axis stays close to its straight-on width, which is what makes a projected logo look like a trapezoid. For a 36-degree field the long axis is 1.58 times the straight-on diameter at 45 degrees and 2.93 times at 60, and once the incidence plus half the field reaches 90 degrees the far edge never lands at all. The same cosine works against you on brightness, because the light is spread over more area and illuminance falls by the cosine of the same angle. A 36-degree ellipsoidal at a 30 ft throw makes a 19.5 ft circle straight on; hang it 45 degrees off perpendicular onto a back wall, an ordinary front-of-house angle, and the long axis goes to 30.8 ft while illuminance at the beam centre falls to 0.71, half a stop down. A logo that reads 19.5 ft wide straight on becomes 30.8 ft tall and noticeably dimmer, and it needs optical keystone correction, a distorted gobo cut to compensate, or a better hanging position -- and the case for the better position is worth making before the gobo is ordered. When the gobo's usable image is smaller than the gate, the projection scales by that fraction. A geometric estimate; the fixture's published field angle and a focus check in the room govern.",
  };
}

export const goboImageSizeExample = { inputs: { throw_ft: 30, field_angle_deg: 36, incidence_deg: 45, gobo_image_mm: 0, gate_diameter_mm: 0 } };

STAGEPRODUCTION_RENDERERS["gobo-image-size"] = _r({
  citation: "Citation: gobo image size from the field-angle cone (diameter = 2 x throw x tan(field/2)) with the exact edge-ray keystone stretch and cos illuminance falloff for a non-perpendicular hit, by name. Public projection geometry. The fixture's published field angle and a focus check in the room govern.",
  example: goboImageSizeExample.inputs,
  fields: [
    { key: "throw_ft", label: "Throw distance (ft)", kind: "number" },
    { key: "field_angle_deg", label: "Fixture field angle (deg)", kind: "number" },
    { key: "incidence_deg", label: "Incidence angle off perpendicular (deg)", kind: "number" },
    { key: "gobo_image_mm", label: "Gobo usable image diameter (mm, 0 to skip)", kind: "number" },
    { key: "gate_diameter_mm", label: "Fixture gate diameter (mm, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "d", id: "gobo-out-d", label: "Perpendicular image diameter", value: (r) => fmt(r.image_diameter_ft, 2) + " ft" },
    { key: "k", id: "gobo-out-k", label: "Keystone stretch", value: (r) => fmt(r.keystone_stretch, 3) + " x" },
    { key: "s", id: "gobo-out-s", label: "Stretched axis", value: (r) => fmt(r.stretched_axis_ft, 2) + " ft" },
    { key: "i", id: "gobo-out-i", label: "Relative illuminance", value: (r) => fmt(r.relative_illuminance, 3) + " (" + fmt(r.stops_down, 2) + " stops down)" },
    { key: "p", id: "gobo-out-p", label: "Partial-frame image diameter", value: (r) => r.framed_diameter_ft === null ? "-" : fmt(r.framed_diameter_ft, 2) + " ft" },
    { key: "z", id: "gobo-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeGoboImageSize,
});

// ===================== spec-v1372: color-temperature correction in mireds =====================
// The standard correction sheets, as mired shifts: Rosco's published figures.
// Negative is blue (raises color temperature), positive is orange (lowers it).
// CTB and CTO are not mirror images. Until 2026-09-24 the CTO rows were the
// CTB magnitudes with the sign flipped (+12/+30/+68/+131); Rosco's CTOs are
// +20/+42/+81/+167, and +131 is RoscoSun 85, the 3/4 CTO -- so a 5,600 to
// 3,200 K conversion was told "Full CTO" and a full CTO was said to land at
// 3,230 K when it lands near 2,890 K.
export const MIRED_CORRECTIONS = [
  { name: "Full CTB", shift: -131 },
  { name: "Half CTB", shift: -68 },
  { name: "Quarter CTB", shift: -30 },
  { name: "Eighth CTB", shift: -12 },
  { name: "Eighth CTO", shift: 20 },
  { name: "Quarter CTO", shift: 42 },
  { name: "Half CTO", shift: 81 },
  { name: "3/4 CTO", shift: 131 },
  { name: "Full CTO", shift: 167 },
];

// dims: in { source_k: T, target_k: T, applied_shift: T^-1 } out: { source_mired: T^-1, target_mired: T^-1, shift_needed: T^-1, resulting_k: T }
export function computeMiredGelShift({ source_k = 3200, target_k = 5600, applied_shift = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // Unit / range guard added 2026-09-26 after printed-example probing.
  if ([arguments[0]?.source_k, arguments[0]?.target_k].some((v) => Number(v) > 0 && Number(v) < 1000)) return { error: "Enter color temperatures in kelvin (3200), not thousands of kelvin (3.2)." };
  if (!(source_k > 0)) return { error: "Source color temperature must be positive." };
  if (!(target_k > 0)) return { error: "Target color temperature must be positive." };
  if (!Number.isFinite(applied_shift)) return { error: "Applied mired shift must be a finite number." };
  // Kelvin is not perceptually even; mireds are, which is why every correction filter is
  // specified as a mired shift rather than as a pair of kelvin values.
  const source_mired = 1e6 / source_k;
  const target_mired = 1e6 / target_k;
  const shift_needed = target_mired - source_mired;
  const nearest = MIRED_CORRECTIONS.reduce((a, b) => (Math.abs(b.shift - shift_needed) < Math.abs(a.shift - shift_needed) ? b : a));
  const nearest_error = shift_needed - nearest.shift;
  const effective_shift = applied_shift !== 0 ? applied_shift : nearest.shift;
  const applied_mired = source_mired + effective_shift;
  if (!(applied_mired > 0)) return { error: "That shift takes the source past infinite color temperature; choose a smaller one." };
  const resulting_k = 1e6 / applied_mired;
  if (![source_mired, target_mired, shift_needed, resulting_k].every(Number.isFinite)) return { error: "Mired math is not a finite value." };
  return {
    source_mired,
    target_mired,
    shift_needed,
    nearest_name: nearest.name,
    nearest_shift: nearest.shift,
    nearest_error,
    resulting_k,
    effective_shift,
    note: "The mired shift that takes one color temperature to another, the standard correction sheet closest to it, and where a given sheet actually lands. Kelvin is not a perceptually even scale: going from 3,000 K to 3,200 K is a visible correction while going from 9,000 K to 9,200 K is invisible. Mireds -- reciprocal color temperature times a million -- ARE even, which is why every correction filter on the market is specified as a mired shift rather than as a pair of kelvin values, and why a full CTB is about -131 mireds no matter what it is put in front of. Once a crew is thinking in mireds, what gel gets me from here to there is a subtraction and what does this gel do to that source is an addition. Negative shifts are blue and raise color temperature; positive shifts are orange and lower it. Matching a 3,200 K tungsten fixture to 5,600 K daylight is 178.6 minus 312.5, a shift of -133.9 mireds, and a full CTB at about -131 lands within three mireds of the target -- effectively exact. Try the same correction by kelvin arithmetic and the difference is 2,400 K, but there is no gel labeled 2,400 K because the number means something different depending on where you start: from 5,600 K a full CTO (+167) lands at 2,890 K, while from 6,500 K the same sheet lands at 3,120 K. CTB and CTO are not mirror images: the sheet that takes daylight to 3,200 K is the 3/4 CTO (+131), not the full. Same gel, different result, and only the mired scale predicts it. A conversion; the filter manufacturer's published mired shift for the specific sheet and a color meter govern a critical match.",
  };
}

export const miredGelShiftExample = { inputs: { source_k: 3200, target_k: 5600, applied_shift: 0 } };

STAGEPRODUCTION_RENDERERS["mired-gel-shift"] = _r({
  citation: "Citation: reciprocal color temperature (mireds = 1,000,000 / kelvin) and the mired-shift specification of correction filters, by name. The full/half/quarter/eighth CTB and CTO shift values are Rosco's published figures (Full CTB -131, Full CTO +167, 3/4 CTO +131); other makers' sheets differ (Lee Full CTO +159); the filter manufacturer's published mired shift for the specific sheet, and a color meter, govern a critical match.",
  example: miredGelShiftExample.inputs,
  fields: [
    { key: "source_k", label: "Source color temperature (K)", kind: "number" },
    { key: "target_k", label: "Target color temperature (K)", kind: "number" },
    { key: "applied_shift", label: "Applied mired shift (0 to use the nearest standard sheet)", kind: "number" },
  ],
  outputs: [
    { key: "s", id: "mird-out-s", label: "Source", value: (r) => fmt(r.source_mired, 1) + " mireds" },
    { key: "t", id: "mird-out-t", label: "Target", value: (r) => fmt(r.target_mired, 1) + " mireds" },
    { key: "n", id: "mird-out-n", label: "Shift needed", value: (r) => fmt(r.shift_needed, 1) + " mireds" },
    { key: "g", id: "mird-out-g", label: "Nearest standard correction", value: (r) => r.nearest_name + " at " + fmt(r.nearest_shift, 0) + " mireds (" + fmt(Math.abs(r.nearest_error), 1) + " mireds off target)" },
    { key: "k", id: "mird-out-k", label: "Where the applied shift lands", value: (r) => fmt(r.resulting_k, 0) + " K from a " + fmt(r.effective_shift, 0) + " mired shift" },
    { key: "z", id: "mird-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeMiredGelShift,
});

// ===================== spec-v1373: haze and fog machine output for a venue =====================
// dims: in { volume_cf: L^3, ach: T^-1, ref_volume_cf: L^3, ref_ach: T^-1, ref_output: dimensionless } out: { ventilation_cfm: L^3 T^-1, required_output: dimensionless, time_constant_hr: T, time_to_90_hr: T }
export function computeHazeMachineSizing({ volume_cf = 0, ach = 0, ref_volume_cf = 100000, ref_ach = 2, ref_output = 1 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(volume_cf > 0)) return { error: "Venue volume must be positive." };
  if (!(ach > 0)) return { error: "Air changes per hour must be positive." };
  if (!(ref_volume_cf > 0)) return { error: "Reference volume must be positive." };
  if (!(ref_ach > 0)) return { error: "Reference air-change rate must be positive." };
  if (!(ref_output > 0)) return { error: "Reference machine output must be positive." };
  // A hazed room is a STEADY STATE, not a fill: required output is proportional to the
  // PRODUCT of volume and air-change rate, which is why sizing on volume alone fails.
  const ventilation_cfm = volume_cf * ach / 60;
  const scaling_factor = (volume_cf * ach) / (ref_volume_cf * ref_ach);
  const required_output = ref_output * scaling_factor;
  const time_constant_hr = 1 / ach;
  const time_to_90_hr = Math.LN10 / ach;
  if (![ventilation_cfm, scaling_factor, required_output, time_constant_hr, time_to_90_hr].every(Number.isFinite)) return { error: "Haze-sizing math is not a finite value." };
  return {
    ventilation_cfm,
    scaling_factor,
    required_output,
    time_constant_hr,
    time_to_90_hr,
    note: "How much haze output a room needs and how long it takes to get there. A hazed room is a steady state, not a fill: the machine adds haze continuously while the ventilation removes it continuously, and the density settles where the two rates match. That makes required output proportional to the PRODUCT of volume and air-change rate. Double the room and you need twice the machine; leave the room the same size and double the air handlers and you also need twice the machine. Crews consistently size on volume alone and are then surprised the look will not hold once the HVAC comes on for the audience. The time constant is the other half. At 4 air changes per hour a room reaches 63% of its final density in 15 minutes and 90% in about 35, so a haze cue called two minutes before the top of the show does nothing and the machine has to have been running through the pre-show; at 1 air change per hour the same room takes over two hours to settle, which is why a tight room hazes beautifully and then will not clear for the next act. A 200,000 cubic ft hall at 4 air changes moves 13,333 cfm and, scaled from a machine that holds a good haze in a 100,000 cubic ft room at 2 air changes on one quart per hour, needs four quarts an hour -- four times the fluid for a room only twice as large, because the air handlers did half the damage. If the house will run at 2 air changes during the show the requirement halves and the pre-show fill takes twice as long, and that negotiation with the building engineer is worth more than a second machine. A scaling estimate; the machine manufacturer's rated output, the fluid's safety data sheet, and the venue's smoke-detection and fire-authority requirements govern.",
  };
}

export const hazeMachineSizingExample = { inputs: { volume_cf: 200000, ach: 4, ref_volume_cf: 100000, ref_ach: 2, ref_output: 1 } };

STAGEPRODUCTION_RENDERERS["haze-machine-sizing"] = _r({
  citation: "Citation: haze density as the steady state between machine output and ventilation removal, scaled on the product of volume and air-change rate, with the first-order fill time constant 1/ACH, by name. Public mass-balance physics. The machine manufacturer's rated output, the fluid's safety data sheet, and the venue's smoke-detection and fire-authority requirements govern.",
  example: hazeMachineSizingExample.inputs,
  fields: [
    { key: "volume_cf", label: "Venue volume (cubic ft)", kind: "number" },
    { key: "ach", label: "Air changes per hour", kind: "number" },
    { key: "ref_volume_cf", label: "Reference volume (cubic ft)", kind: "number" },
    { key: "ref_ach", label: "Reference air changes per hour", kind: "number" },
    { key: "ref_output", label: "Reference machine output (fluid per hour)", kind: "number" },
  ],
  outputs: [
    { key: "v", id: "haze-out-v", label: "Ventilation rate", value: (r) => fmt(r.ventilation_cfm, 0) + " cfm" },
    { key: "s", id: "haze-out-s", label: "Scaling factor against the reference", value: (r) => fmt(r.scaling_factor, 2) + " x" },
    { key: "o", id: "haze-out-o", label: "Required output", value: (r) => fmt(r.required_output, 2) + " fluid units per hour" },
    { key: "t", id: "haze-out-t", label: "Time constant (63% of steady state)", value: (r) => fmt(r.time_constant_hr, 2) + " hr (" + fmt(r.time_constant_hr * 60, 0) + " min)" },
    { key: "n", id: "haze-out-n", label: "Time to 90% of steady state", value: (r) => fmt(r.time_to_90_hr, 2) + " hr (" + fmt(r.time_to_90_hr * 60, 0) + " min)" },
    { key: "z", id: "haze-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeHazeMachineSizing,
});

// ===================== spec-v1374: stage deck and platform live-load check =====================
// dims: in { length_ft: L, width_ft: L, legs: dimensionless, design_psf: M L^-1 T^-2, deck_dead_lb: M L T^-2, leg_rating_lb: M L T^-2, point_load_lb: M L T^-2, bearing_sqin: L^2, deck_point_rating_lb: M L T^-2 } out: { deck_area_sqft: L^2, live_load_lb: M L T^-2, load_per_leg_lb: M L T^-2, leg_utilization_pct: dimensionless }
export function computeStageDeckLiveLoad({ length_ft = 0, width_ft = 0, legs = 4, design_psf = 150, deck_dead_lb = 0, leg_rating_lb = 0, point_load_lb = 0, bearing_sqin = 0, deck_point_rating_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(length_ft > 0 && width_ft > 0)) return { error: "Deck length and width must be positive." };
  if (!(legs >= 1)) return { error: "Leg count must be at least 1." };
  if (!(design_psf > 0)) return { error: "Design live load must be positive." };
  if (!(deck_dead_lb >= 0)) return { error: "Deck dead weight cannot be negative." };
  if (!(leg_rating_lb > 0)) return { error: "Leg rating must be positive." };
  if (!(point_load_lb >= 0 && bearing_sqin >= 0 && deck_point_rating_lb >= 0)) return { error: "Concentrated-load inputs cannot be negative." };
  // A uniform live load is a design abstraction; a piano wheel is a real point load in a
  // real square inch, and a deck that passes the uniform check can fail under one wheel.
  const deck_area_sqft = length_ft * width_ft;
  const live_load_lb = deck_area_sqft * design_psf;
  const total_load_lb = live_load_lb + deck_dead_lb;
  const load_per_leg_lb = total_load_lb / legs;
  const leg_utilization_pct = load_per_leg_lb / leg_rating_lb * 100;
  const bearing_psi = (point_load_lb > 0 && bearing_sqin > 0) ? point_load_lb / bearing_sqin : null;
  const point_utilization_pct = (point_load_lb > 0 && deck_point_rating_lb > 0) ? point_load_lb / deck_point_rating_lb * 100 : null;
  const leg_verdict = leg_utilization_pct > 100
    ? "OVER: the legs are past their rating before any point load is considered -- add legs or lower the design load"
    : leg_utilization_pct > 85
      ? "TIGHT: inside the rating but with little margin"
      : "OK: real margin against the leg rating";
  const point_verdict = point_utilization_pct === null
    ? "no concentrated load entered"
    : point_utilization_pct > 100
      ? "OVER the deck's rated point load"
      : "inside the deck's rated point load";
  if (![deck_area_sqft, live_load_lb, total_load_lb, load_per_leg_lb, leg_utilization_pct].every(Number.isFinite)) return { error: "Stage-deck load math is not a finite value." };
  return {
    deck_area_sqft,
    live_load_lb,
    total_load_lb,
    load_per_leg_lb,
    leg_utilization_pct,
    bearing_psi,
    point_utilization_pct,
    leg_verdict,
    point_verdict,
    note: "Whether a staging deck and its legs carry the code live load, and whether the deck survives the point load nobody checked. The building code assigns stages and platforms a uniform live load -- 150 psf for stage floors, 100 psf for assembly areas -- and the whole uniform check is applying it to the deck's own footprint and dividing by the legs. A 4 by 8 deck at 150 psf carries 2.4 tons, and the four legs under it each take 1,200 lb before the deck's own weight is added. Rented staging legs are commonly rated somewhere between 1,000 and 2,500 lb, so the same deck can be well inside its rating or well outside it depending on which product is on the truck: 32 sq ft at 150 psf is 4,800 lb, plus 60 lb of deck, is 1,215 lb per leg -- 121.5% of a 1,000 lb rating and 49% of a 2,500 lb one. The concentrated-load line matters more often than the uniform one. A uniform live load is a design abstraction, while a piano wheel, a forklift, or a truss base plate is a real point load in a real square inch, and a deck that passes the uniform check by a wide margin can fail under a single wheel. Both belong on the same screen, and the bearing pressure in pounds per square inch is what decides whether a load-spreading pad is needed. A screen, never a stamp: the staging manufacturer's published deck and leg ratings, the governing building code edition adopted locally, and a qualified engineer govern.",
  };
}

export const stageDeckLiveLoadExample = { inputs: { length_ft: 4, width_ft: 8, legs: 4, design_psf: 150, deck_dead_lb: 60, leg_rating_lb: 1000, point_load_lb: 900, bearing_sqin: 4, deck_point_rating_lb: 1000 } };

STAGEPRODUCTION_RENDERERS["stage-deck-live-load"] = _r({
  citation: "Citation: uniform live load applied to the deck footprint and divided among the legs, with a separate concentrated-load comparison and bearing pressure. The 150 psf stage-floor and 100 psf assembly live loads are the International Building Code Table 1607.1 values, cited by table and edition and not reproduced. The staging manufacturer's published deck and leg ratings, the locally adopted code edition, and a qualified engineer govern. A screen, never a stamp.",
  example: stageDeckLiveLoadExample.inputs,
  fields: [
    { key: "length_ft", label: "Deck length (ft)", kind: "number" },
    { key: "width_ft", label: "Deck width (ft)", kind: "number" },
    { key: "legs", label: "Number of legs", kind: "number" },
    { key: "design_psf", label: "Design live load (psf)", kind: "number" },
    { key: "deck_dead_lb", label: "Deck dead weight (lb)", kind: "number" },
    { key: "leg_rating_lb", label: "Leg rating (lb)", kind: "number" },
    { key: "point_load_lb", label: "Concentrated load to check (lb, 0 to skip)", kind: "number" },
    { key: "bearing_sqin", label: "Bearing area of that load (sq in, 0 to skip)", kind: "number" },
    { key: "deck_point_rating_lb", label: "Deck rated point load (lb, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "a", id: "sdll-out-a", label: "Deck area", value: (r) => fmt(r.deck_area_sqft, 1) + " sq ft" },
    { key: "u", id: "sdll-out-u", label: "Uniform live load", value: (r) => fmt(r.live_load_lb, 0) + " lb (total with deck " + fmt(r.total_load_lb, 0) + " lb)" },
    { key: "l", id: "sdll-out-l", label: "Load per leg", value: (r) => fmt(r.load_per_leg_lb, 1) + " lb" },
    { key: "p", id: "sdll-out-p", label: "Leg utilization", value: (r) => fmt(r.leg_utilization_pct, 1) + " % -- " + r.leg_verdict },
    { key: "c", id: "sdll-out-c", label: "Concentrated load", value: (r) => r.point_utilization_pct === null ? r.point_verdict : fmt(r.point_utilization_pct, 1) + " % of the deck's point rating, " + r.point_verdict + (r.bearing_psi === null ? "" : " (" + fmt(r.bearing_psi, 1) + " psi bearing)") },
    { key: "z", id: "sdll-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeStageDeckLiveLoad,
});

// ===================== spec-v1375: LED wall data rate and processor port count =====================
// dims: in { width_px: dimensionless, height_px: dimensionless, bit_depth: dimensionless, refresh_hz: T^-1, pixels_per_port: dimensionless } out: { total_pixels: dimensionless, data_rate_gbps: dimensionless, ports_needed: dimensionless, spare_pixels: dimensionless }
export function computeVideoWallDataRate({ width_px = 0, height_px = 0, bit_depth = 8, refresh_hz = 60, pixels_per_port = 650000 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  // Unit / range guard added 2026-09-26 after printed-example probing.
  if (Number(arguments[0]?.bit_depth) > 16) return { error: "Enter the bit depth per color channel (8 or 10), not per pixel (24)." };
  if (!(width_px > 0 && height_px > 0)) return { error: "Wall width and height in pixels must be positive." };
  if (!(bit_depth > 0)) return { error: "Bit depth per channel must be positive." };
  if (!(refresh_hz > 0)) return { error: "Refresh rate must be positive." };
  if (!(pixels_per_port > 0)) return { error: "Pixels per processor port must be positive." };
  // A wall's processor budget is counted in PIXELS PER PORT, not in resolution, which is why
  // two walls of the same physical size need very different amounts of processing.
  const total_pixels = width_px * height_px;
  const data_rate_gbps = total_pixels * bit_depth * 3 * refresh_hz / 1e9;
  const ports_needed = Math.ceil(total_pixels / pixels_per_port - 1e-9);
  const spare_pixels = ports_needed * pixels_per_port - total_pixels;
  const last_port_used = pixels_per_port - spare_pixels;
  if (![total_pixels, data_rate_gbps, ports_needed, spare_pixels, last_port_used].every(Number.isFinite)) return { error: "Video-wall data-rate math is not a finite value." };
  return {
    total_pixels,
    data_rate_gbps,
    ports_needed,
    spare_pixels,
    last_port_used,
    note: "The pixel count, uncompressed data rate, and processor port count for an LED wall. A wall's processor budget is counted in pixels per output port, not in resolution. A gigabit sending-card port carries a fixed pixel budget -- commonly around 650,000 pixels at 60 Hz, and proportionally fewer as refresh rate or bit depth rises -- and the wall is divided among however many ports that takes. The consequence is that two walls with the same physical size but different pixel pitches need very different amounts of processing, and the finer wall may need a second processor entirely. That is a fact about the processor rather than about the panels, which is exactly why it is missed when a wall is quoted by panel count. The data-rate line is the sanity check on the source side, and it says whether the incoming signal format can actually carry the wall. A wall built out to 3,840 by 2,160 is 8,294,400 pixels, which at 8-bit color and 60 Hz is 8,294,400 x 24 x 60 / 1e9 = 11.94 Gbps and takes thirteen 650,000-pixel ports -- more than one sending card carries, so this wall needs two. The same 11.94 Gbps fits HDMI 2.0 (14.4 Gbps of video data) but is just over a 12G-SDI link's 11.88 Gbps, which is why 12G-SDI carries 4K60 as 10-bit 4:2:2 rather than full RGB; moving to 10-bit RGB takes the rate to 14.93 Gbps, past HDMI 2.0 as well, and the source format has to change. A planning estimate; the processor manufacturer's published per-port capacity at the operating refresh and bit depth, and the panel maker's own mapping, govern the build.",
  };
}

export const videoWallDataRateExample = { inputs: { width_px: 3840, height_px: 2160, bit_depth: 8, refresh_hz: 60, pixels_per_port: 650000 } };

STAGEPRODUCTION_RENDERERS["video-wall-data-rate"] = _r({
  citation: "Citation: uncompressed video data rate = pixels x bit depth x 3 channels x refresh, and processor port count = ceil(pixels / pixels per port), by name. Public arithmetic; the per-port pixel budget is the processor manufacturer's published figure at the operating refresh and bit depth, cited not reproduced. The processor maker's capacity and the panel maker's mapping govern the build.",
  example: videoWallDataRateExample.inputs,
  fields: [
    { key: "width_px", label: "Wall width (pixels)", kind: "number" },
    { key: "height_px", label: "Wall height (pixels)", kind: "number" },
    { key: "bit_depth", label: "Bit depth per channel", kind: "number" },
    { key: "refresh_hz", label: "Refresh rate (Hz)", kind: "number" },
    { key: "pixels_per_port", label: "Pixels per processor port", kind: "number" },
  ],
  outputs: [
    { key: "p", id: "vwdr-out-p", label: "Total pixels", value: (r) => fmt(r.total_pixels, 0) },
    { key: "d", id: "vwdr-out-d", label: "Uncompressed data rate", value: (r) => fmt(r.data_rate_gbps, 2) + " Gbps" },
    { key: "n", id: "vwdr-out-n", label: "Processor ports required", value: (r) => String(r.ports_needed) + " ports" },
    { key: "s", id: "vwdr-out-s", label: "Spare capacity on the last port", value: (r) => fmt(r.spare_pixels, 0) + " pixels (" + fmt(r.last_port_used, 0) + " used)" },
    { key: "z", id: "vwdr-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeVideoWallDataRate,
});

// ===================== spec-v1376: outdoor stage and banner wind load with ballast =====================
// dims: in { banner_height_ft: L, banner_width_ft: L, centroid_height_ft: L, wind_speed_mph: L T^-1, drag_coefficient: dimensionless, base_width_ft: L, safety_factor: dimensionless, available_ballast_lb: M L T^-2 } out: { velocity_pressure_psf: M L^-1 T^-2, wind_force_lb: M L T^-2, overturning_moment_ftlb: M L^2 T^-2, required_ballast_lb: M L T^-2 }
export function computeOutdoorStageWind({ banner_height_ft = 0, banner_width_ft = 0, centroid_height_ft = 0, wind_speed_mph = 0, drag_coefficient = 1.3, base_width_ft = 0, safety_factor = 1.5, available_ballast_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  if (!(banner_height_ft > 0 && banner_width_ft > 0)) return { error: "Banner height and width must be positive." };
  if (!(centroid_height_ft > 0)) return { error: "Centroid height above the base must be positive." };
  if (!(wind_speed_mph > 0)) return { error: "Wind speed must be positive." };
  if (!(drag_coefficient > 0)) return { error: "Drag coefficient must be positive." };
  if (!(base_width_ft > 0)) return { error: "Base width between ballast points must be positive." };
  if (!(safety_factor >= 1)) return { error: "Safety factor must be at least 1." };
  if (!(available_ballast_lb >= 0)) return { error: "Available ballast cannot be negative." };
  // Velocity pressure rises with the SQUARE of wind speed: a 40 mph gust carries four
  // times the load of a 20 mph one, not twice.
  const area_sqft = banner_height_ft * banner_width_ft;
  const velocity_pressure_psf = 0.00256 * wind_speed_mph * wind_speed_mph;
  const wind_force_lb = velocity_pressure_psf * drag_coefficient * area_sqft;
  const overturning_moment_ftlb = wind_force_lb * centroid_height_ft;
  const resisting_arm_ft = base_width_ft / 2;
  const required_ballast_lb = overturning_moment_ftlb * safety_factor / resisting_arm_ft;
  // Ballast resists as V^2, so the speed a stated ballast survives inverts the square law.
  const capacity_speed_mph = available_ballast_lb > 0
    ? Math.sqrt(available_ballast_lb * resisting_arm_ft / (safety_factor * drag_coefficient * area_sqft * centroid_height_ft * 0.00256))
    : null;
  if (![area_sqft, velocity_pressure_psf, wind_force_lb, overturning_moment_ftlb, required_ballast_lb].every(Number.isFinite)) return { error: "Wind-load math is not a finite value." };
  if (capacity_speed_mph !== null && !Number.isFinite(capacity_speed_mph)) return { error: "Wind-load math is not a finite value." };
  return {
    area_sqft,
    velocity_pressure_psf,
    wind_force_lb,
    overturning_moment_ftlb,
    required_ballast_lb,
    capacity_speed_mph,
    resisting_arm_ft,
    note: "The wind force on an outdoor banner or scrim, the moment it tries to tip the structure with, and the ballast that holds it down. Velocity pressure rises with the SQUARE of wind speed, which is the fact that catches people out: a 40 mph gust does not carry twice the load of a 20 mph one, it carries four times. The drag coefficient for a flat panel normal to the wind is around 1.3, and a solid banner is exactly that, with no shape to shed the load. The overturning check is a moment balance about the downwind base edge, where the wind force acts at the banner's centroid height and the only thing resisting it is the ballast acting at half the base width. Because the lever arms are so different -- a centroid twelve feet up against a four-foot resisting arm -- the required ballast comes out several times the wind force itself, and the numbers get large fast. A 20 by 8 ft banner with its centroid 12 ft above an 8 ft base, in a 40 mph gust at a 1.5 safety factor, sees 4.10 psf and 852 lb of force, a 10,224 ft-lb overturning moment, and needs 3,834 lb of ballast: nearly two tons to hold one banner in a gust an ordinary summer thunderstorm produces. Drop the design wind to 30 mph and the requirement falls to 2,157 lb, because the square law works in both directions; raise it to 55 mph and it climbs to 7,248 lb. The design wind speed is the most expensive number on the drawing, and the honest way to reduce it is to plan to drop the banner rather than to assume the storm will be small. The safety factor and the wind speed at which the structure comes down are decisions ANSI E1.21 requires be made IN ADVANCE, written into an operations management plan, with someone watching an anemometer and holding the authority to stop the show. A screen, never an engineered result; ANSI E1.21, the structure manufacturer's data, and a qualified engineer govern.",
  };
}

export const outdoorStageWindExample = { inputs: { banner_height_ft: 8, banner_width_ft: 20, centroid_height_ft: 12, wind_speed_mph: 40, drag_coefficient: 1.3, base_width_ft: 8, safety_factor: 1.5, available_ballast_lb: 2000 } };

STAGEPRODUCTION_RENDERERS["outdoor-stage-wind"] = _r({
  citation: "Citation: velocity pressure q = 0.00256 V^2 (V in mph), force = q x Cd x area, and an overturning-moment balance about the downwind base edge against ballast acting at half the base width. ANSI E1.21, Entertainment Technology -- Temporary Structures Used for Technical Production of Outdoor Entertainment Events, is cited by name for the requirement that the safety factor and the take-down wind speed be set IN ADVANCE in an operations management plan. A screen, never an engineered result; a qualified engineer governs.",
  example: outdoorStageWindExample.inputs,
  fields: [
    { key: "banner_height_ft", label: "Banner or scrim height (ft)", kind: "number" },
    { key: "banner_width_ft", label: "Banner or scrim width (ft)", kind: "number" },
    { key: "centroid_height_ft", label: "Centroid height above the base (ft)", kind: "number" },
    { key: "wind_speed_mph", label: "Design wind speed (mph)", kind: "number" },
    { key: "drag_coefficient", label: "Drag coefficient", kind: "number" },
    { key: "base_width_ft", label: "Base width between ballast points (ft)", kind: "number" },
    { key: "safety_factor", label: "Safety factor", kind: "number" },
    { key: "available_ballast_lb", label: "Ballast on hand (lb, 0 to skip)", kind: "number" },
  ],
  outputs: [
    { key: "q", id: "oswd-out-q", label: "Velocity pressure", value: (r) => fmt(r.velocity_pressure_psf, 2) + " psf on " + fmt(r.area_sqft, 0) + " sq ft" },
    { key: "f", id: "oswd-out-f", label: "Wind force", value: (r) => fmt(r.wind_force_lb, 0) + " lb" },
    { key: "m", id: "oswd-out-m", label: "Overturning moment", value: (r) => fmt(r.overturning_moment_ftlb, 0) + " ft-lb about the downwind base edge" },
    { key: "b", id: "oswd-out-b", label: "Required ballast", value: (r) => fmt(r.required_ballast_lb, 0) + " lb at a " + fmt(r.resisting_arm_ft, 1) + " ft resisting arm" },
    { key: "s", id: "oswd-out-s", label: "Wind speed the ballast on hand survives", value: (r) => r.capacity_speed_mph === null ? "-" : fmt(r.capacity_speed_mph, 1) + " mph" },
    { key: "z", id: "oswd-out-z", label: "Note", value: (r) => r.note },
  ],
  compute: computeOutdoorStageWind,
});
