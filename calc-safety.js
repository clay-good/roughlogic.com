// Group G occupational-safety calculators split from calc-cross.js by spec-v1855.

import {
  DEBOUNCE_MS as _DG, debounce as _debG, makeNumber as _mnG, makeSelect as _msG, makeCheckbox as _mcG,
  makeOutputLine as _moG, attachExampleButton as _aeG, fmt,
} from "./ui-fields.js";

const _finiteGuard = (o) => {
  if (o && typeof o === "object" && !Array.isArray(o)) {
    for (const v of Object.values(o)) {
      if (typeof v === "number" && !Number.isFinite(v)) return { error: "All numeric inputs must be finite numbers." };
    }
  }
  return null;
};

function _simpleRendererG(spec) {
  const renderer = function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = spec.citation;
    _aeG(inputRegion, () => fillExample(spec.example));
    const fields = {};
    for (const f of spec.fields) {
      let field;
      if (f.kind === "select") field = _msG(f.label, f.id || f.key, f.options);
      else if (f.kind === "checkbox") field = _mcG(f.label, f.id || f.key);
      else field = _mnG(f.label, f.id || f.key, f.attrs || { step: "any" });
      fields[f.key] = field;
      if (f.default !== undefined) {
        if (f.kind === "select") field.select.value = f.default;
        else if (f.kind === "checkbox") field.input.checked = !!f.default;
        else field.input.value = String(f.default);
      }
      inputRegion.appendChild(field.wrap);
    }
    const outs = {};
    for (const o of spec.outputs) outs[o.key] = _moG(outputRegion, o.label, o.id);
    function fillExample(v) {
      for (const f of spec.fields) {
        if (v[f.key] === undefined) continue;
        if (f.kind === "select") fields[f.key].select.value = v[f.key];
        else if (f.kind === "checkbox") fields[f.key].input.checked = !!v[f.key];
        else fields[f.key].input.value = v[f.key];
      }
      update();
    }
    const update = _debG(() => {
      const params = {};
      for (const f of spec.fields) {
        if (f.kind === "select") params[f.key] = fields[f.key].select.value;
        else if (f.kind === "checkbox") params[f.key] = fields[f.key].input.checked;
        else params[f.key] = Number(fields[f.key].input.value) || 0;
      }
      const result = spec.compute(params);
      if (result.error) {
        for (const key of Object.keys(outs)) outs[key].textContent = "-";
        outs[spec.outputs[0].key].textContent = result.error;
        return;
      }
      for (const o of spec.outputs) outs[o.key].textContent = o.value(result);
    }, _DG);
    for (const f of spec.fields) {
      const el = f.kind === "select" ? fields[f.key].select : fields[f.key].input;
      el.addEventListener(f.kind === "checkbox" ? "change" : "input", update);
    }
  };
  renderer.schema = {
    inputs: (spec.fields || []).map((f) => ({ key: f.key, label: f.label, kind: f.kind, options: f.options ?? null, default: f.default ?? null, attrs: f.attrs ?? null })),
    outputs: (spec.outputs || []).map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null, format: o.value })),
    citation: spec.citation ?? null,
    scope: spec.scope ?? null,
  };
  return renderer;
}

export const SAFETY_RENDERERS = {};

// --- spec-v1156: portable ladder setup geometry (OSHA 1926.1053) ---
// ladder-angle does the 4:1 base setback and stops there. Three other numbers decide whether
// a ladder is usable, and the first one is the one people improvise around.
// EXTENSION: side rails shall extend at least 3 ft above the upper landing surface - and the
// consequence nobody computes is that the 3 ft comes out of the CLIMBABLE length. A 24 ft
// extension ladder does not reach a 24 ft roof; after the 3 ft extension and the base setback
// the highest landing it serves is materially lower, and the tile reports that number.
// If the 3 ft is impossible, the ladder must be secured at its top to a rigid support and a
// grasping device provided - an alternative, not an excuse.
// RUNGS: spaced not less than 10 in nor more than 14 in apart, measured between centrelines.
// It is a WINDOW, and too close fails as surely as too far.
// WIDTH: minimum clear distance between side rails for all portable ladders is 11.5 in.
// dims: in { ladder_length_ft: L, landing_height_ft: L, extension_above_landing_ft: L, rung_spacing_in: L, clear_width_in: L, secured_with_grasping_device: dimensionless, base_ratio: dimensionless } out: { required_extension_ft: L, base_setback_ft: L, max_landing_served_ft: L, climbable_height_ft: L }
export function computePortableLadderSetup({ ladder_length_ft = 0, landing_height_ft = 0, extension_above_landing_ft = 0, rung_spacing_in = 12, clear_width_in = 12, secured_with_grasping_device = "no", base_ratio = 4 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L = Number(ladder_length_ft) || 0;
  const H = Number(landing_height_ft) || 0;
  const ext = Number(extension_above_landing_ft) || 0;
  const rs = Number(rung_spacing_in) || 0;
  const cw = Number(clear_width_in) || 0;
  const ratio = Number(base_ratio) || 0;
  const secured = secured_with_grasping_device === "yes";
  if (!(L > 0)) return { error: "Ladder length must be positive (ft)." };
  if (!(H > 0)) return { error: "Landing height must be positive (ft)." };
  if (ext < 0) return { error: "Extension above the landing cannot be negative (ft)." };
  if (!(rs > 0)) return { error: "Rung spacing must be positive (in)." };
  if (!(cw > 0)) return { error: "Clear width between side rails must be positive (in)." };
  if (!(ratio > 0)) return { error: "The base ratio must be positive (4 for the 4:1 rule)." };

  const REQ_EXT = 3, RUNG_MIN = 10, RUNG_MAX = 14, WIDTH_MIN = 11.5;
  // Extension: required unless secured at the top with a grasping device.
  const extension_ok = ext >= REQ_EXT - 1e-9 * Math.abs(REQ_EXT) || secured;
  const extension_by_alternative = ext < REQ_EXT && secured;
  const extension_shortfall_ft = Math.max(0, REQ_EXT - ext);

  // The reach arithmetic nobody does: setback and extension both eat the ladder.
  // A ladder at a b:1 ratio has its top at H, so its length along the rail is
  // sqrt(H^2 + (H/ratio)^2) = H sqrt(1 + 1/ratio^2).
  const railPerFootOfHeight = Math.sqrt(1 + 1 / (ratio * ratio));
  const base_setback_ft = H / ratio;
  const rail_used_to_landing_ft = H * railPerFootOfHeight;
  const rail_used_total_ft = rail_used_to_landing_ft + REQ_EXT * railPerFootOfHeight;
  const length_ok = rail_used_total_ft <= L + 1e-9 * Math.abs(L);
  const length_short_ft = Math.max(0, rail_used_total_ft - L);
  // The highest landing this ladder can actually serve, with the 3 ft still above it.
  const max_landing_served_ft = (L / railPerFootOfHeight) - REQ_EXT;
  const climbable_height_ft = Math.min(H, Math.max(0, max_landing_served_ft));

  // Rung spacing is a WINDOW.
  const rung_ok = rs >= RUNG_MIN - 1e-9 * Math.abs(RUNG_MIN) && rs <= RUNG_MAX + 1e-9 * Math.abs(RUNG_MAX);
  const rung_too_close = rs < RUNG_MIN - 1e-9 * Math.abs(RUNG_MIN);
  const width_ok = cw >= WIDTH_MIN - 1e-9 * Math.abs(WIDTH_MIN);
  const width_shortfall_in = Math.max(0, WIDTH_MIN - cw);

  const passes = extension_ok && length_ok && rung_ok && width_ok;

  const note = "EXTENSION: side rails shall extend at least " + REQ_EXT + " ft above the upper landing surface. Here " + ext + " ft, " + (ext >= REQ_EXT - 1e-9 * Math.abs(REQ_EXT) ? "OK. " : extension_by_alternative ? "SHORT by " + extension_shortfall_ft.toFixed(1) + " ft - but the ladder is stated as secured at its top to a rigid support with a grasping device provided, which is the alternative the standard allows. That is an alternative, not an excuse: it requires both the securing AND the grasping device, and it exists for landings where the extension is genuinely impossible. " : "SHORT by " + extension_shortfall_ft.toFixed(1) + " ft, with no securing and grasping device claimed. ")
    + "THE ARITHMETIC NOBODY DOES: that " + REQ_EXT + " ft comes out of the CLIMBABLE length, and so does the setback. At a " + ratio + ":1 setup the base sits " + base_setback_ft.toFixed(1) + " ft out, so every foot of height costs " + railPerFootOfHeight.toFixed(4) + " ft of rail. Reaching a " + H + " ft landing takes " + rail_used_to_landing_ft.toFixed(1) + " ft of rail, plus " + (REQ_EXT * railPerFootOfHeight).toFixed(1) + " ft more for the extension - " + rail_used_total_ft.toFixed(1) + " ft against a " + L + " ft ladder. " + (length_ok ? "It reaches. " : "IT DOES NOT REACH, short by " + length_short_ft.toFixed(1) + " ft of rail. ")
    + "The highest landing a " + L + " ft ladder can serve with the extension still above it is about " + max_landing_served_ft.toFixed(1) + " ft. A ladder never reaches its label - the number on the side is rail length, not working height, and buying the ladder that matches the roof height is the classic mistake. "
    + "RUNG SPACING is a WINDOW, not a minimum: not less than " + RUNG_MIN + " in nor more than " + RUNG_MAX + " in between centrelines. " + rs + " in here, " + (rung_ok ? "in range. " : rung_too_close ? "TOO CLOSE - and too close fails as surely as too far, because a climber's stride is what the window is protecting. " : "TOO FAR APART. ")
    + "CLEAR WIDTH between side rails for all portable ladders: at least " + WIDTH_MIN + " in. " + cw + " in here, " + (width_ok ? "OK. " : "SHORT by " + width_shortfall_in.toFixed(1) + " in. ")
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: the 4:1 setup angle itself, which the ladder-angle tile computes and which this only uses to work out the rail budget; the ladder's duty rating and the load actually on it; securing the base and the footing it stands on; ladders used to access a roof versus a floor, and the extra rules for fixed ladders and for ladders on scaffolds; the prohibition on the top step of a stepladder; overlap between the sections of an extension ladder, which the extension-ladder-overlap tile computes and which reduces the usable length further; electrical clearance and conductive side rails near energized lines; and inspection and defect removal. A screen, not a ladder plan; 29 CFR 1926 Subpart X and the competent person govern.";

  return { required_extension_ft: REQ_EXT, extension_ok, extension_by_alternative, extension_shortfall_ft, base_setback_ft, rail_used_to_landing_ft, rail_used_total_ft, length_ok, length_short_ft, max_landing_served_ft, climbable_height_ft, rung_ok, rung_too_close, width_ok, width_shortfall_in, passes, note };
}

export const portableLadderSetupExample = { inputs: { ladder_length_ft: 24, landing_height_ft: 22, extension_above_landing_ft: 3, rung_spacing_in: 12, clear_width_in: 12, secured_with_grasping_device: "no", base_ratio: 4 } };

SAFETY_RENDERERS["portable-ladder-setup"] = _simpleRendererG({
  citation: "Citation: OSHA 29 CFR 1926.1053, a US federal regulation in the public domain. 'When portable ladders are used for access to an upper landing surface, the ladder side rails shall extend at least 3 feet above the upper landing surface' - and where that is not possible, the ladder shall be secured at its top to a rigid support that will not deflect, and a grasping device shall be provided. Rungs, cleats, and steps 'shall be spaced not less than 10 inches apart, nor more than 14 inches apart, as measured between center lines of the rungs, cleats, and steps.' 'The minimum clear distance between side rails for all portable ladders shall be 11 1/2 inches.' The rail-budget arithmetic is geometry from the setup ratio, not a code value. Not checked: the 4:1 angle itself (see ladder-angle), duty rating and load, base securing and footing, fixed ladders and ladders on scaffolds, the stepladder top step, section overlap (see extension-ladder-overlap), electrical clearance, or inspection. A screen, not a ladder plan; Subpart X and the competent person govern.",
  example: portableLadderSetupExample.inputs,
  fields: [
    { key: "ladder_length_ft", label: "Ladder length (ft, as labelled)", kind: "number" },
    { key: "landing_height_ft", label: "Height of the upper landing surface (ft)", kind: "number" },
    { key: "extension_above_landing_ft", label: "Rails extend above the landing (ft)", kind: "number" },
    { key: "secured_with_grasping_device", label: "Secured at the top with a grasping device?", kind: "select", options: [{ value: "no", label: "No", selected: true }, { value: "yes", label: "Yes - the 3 ft alternative" }] },
    { key: "rung_spacing_in", label: "Rung spacing, centre to centre (in)", kind: "number" },
    { key: "clear_width_in", label: "Clear width between side rails (in)", kind: "number" },
    { key: "base_ratio", label: "Setup ratio (4 for the 4:1 rule)", kind: "number" },
  ],
  outputs: [
    { key: "e", id: "pls-out-e", label: "Extension above the landing", value: (r) => r.extension_ok ? (r.extension_by_alternative ? "short, but carried by the secured-and-grasping-device alternative" : "3 ft satisfied") : "SHORT by " + fmt(r.extension_shortfall_ft, 1) + " ft" },
    { key: "r", id: "pls-out-r", label: "Rail budget", value: (r) => fmt(r.rail_used_total_ft, 1) + " ft needed (landing " + fmt(r.rail_used_to_landing_ft, 1) + " + extension) - " + (r.length_ok ? "reaches" : "SHORT by " + fmt(r.length_short_ft, 1) + " ft") },
    { key: "m", id: "pls-out-m", label: "Highest landing this ladder serves", value: (r) => fmt(r.max_landing_served_ft, 1) + " ft, with the 3 ft still above it" },
    { key: "s", id: "pls-out-s", label: "Rung spacing (10-14 in window)", value: (r) => r.rung_ok ? "in range" : r.rung_too_close ? "TOO CLOSE" : "TOO FAR APART" },
    { key: "w", id: "pls-out-w", label: "Clear width (11.5 in min)", value: (r) => r.width_ok ? "OK" : "SHORT by " + fmt(r.width_shortfall_in, 1) + " in" },
    { key: "n", id: "pls-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computePortableLadderSetup,
});

// --- spec-v1166: hearing protector attenuation (OSHA 1910.95 Appendix B, NIOSH derating) ---
// noise-dose gives the TWA. This is the other half: what the protector actually leaves at the
// ear, and the answer is never the number on the package.
// Appendix B is explicit that the NRR comes off a C-WEIGHTED measurement directly, but that an
// A-weighted measurement - which is what a dosimeter reports and what everyone actually has -
// requires SUBTRACTING 7 FROM THE NRR FIRST, for spectral uncertainty. That single step is the
// most commonly skipped number in hearing conservation, and it is worth 7 dB every time.
// On top of that sits derating, which is guidance rather than Appendix B text: OSHA's field
// guidance halves the adjusted value, and NIOSH derates the LABELLED NRR by type - 25% for
// earmuffs, 50% for slow-recovery formable earplugs, 70% for all other earplugs - because a
// laboratory fit is not a jobsite fit.
// dims: in { twa_db: dimensionless, weighting: dimensionless, nrr_db: dimensionless, method: dimensionless, dual_protection: dimensionless, dual_bonus_db: dimensionless, target_db: dimensionless } out: { protected_twa_db: dimensionless, effective_attenuation_db: dimensionless, margin_db: dimensionless, label_vs_real_db: dimensionless }
export function computeHearingProtectorNrr({ twa_db = 0, weighting = "A", nrr_db = 0, method = "appendix-b", dual_protection = "no", dual_bonus_db = 5, target_db = 85 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const twa = Number(twa_db);
  const nrr = Number(nrr_db) || 0;
  const bonus = Number(dual_bonus_db) || 0;
  const target = Number(target_db);
  const isA = weighting === "A";
  const dual = dual_protection === "yes";
  const METHODS = { "appendix-b": null, "osha-50": 0.5, "niosh-muff": 0.75, "niosh-formable": 0.5, "niosh-other": 0.3 };
  if (weighting !== "A" && weighting !== "C") return { error: "Weighting must be A or C - Appendix B treats them differently, and the difference is 7 dB." };
  if (!(method in METHODS)) return { error: "Method must be appendix-b, osha-50, niosh-muff, niosh-formable, or niosh-other." };
  if (dual_protection !== "yes" && dual_protection !== "no") return { error: "State whether dual protection is worn (yes or no)." };
  if (!Number.isFinite(twa) || twa <= 0) return { error: "Measured TWA must be a positive number (dB)." };
  if (!(nrr > 0)) return { error: "Noise reduction rating must be positive (dB)." };
  if (bonus < 0) return { error: "Dual-protection bonus cannot be negative (dB)." };
  if (!Number.isFinite(target) || target <= 0) return { error: "Target exposure must be a positive number (dB)." };

  const SPECTRAL = 7;
  // Appendix B: the NRR applies directly to a C-weighted measurement, less 7 for an A-weighted one.
  const appendix_b_attenuation_db = isA ? nrr - SPECTRAL : nrr;
  // Derating, where a method other than Appendix B as written is chosen.
  const keep = METHODS[method];
  const derated_nrr_db = keep === null ? nrr : (method === "osha-50" ? nrr : nrr * keep);
  // OSHA's methods carry the 7 dB spectral adjustment. NIOSH's type-specific derating is its own
  // adjustment for real-world fit and is applied to the labelled NRR directly, so the 7 is not
  // stacked on top of it - that is this tile's stated reading, and it is why the two families
  // report different spectral terms.
  const niosh = method.startsWith("niosh-");
  let base_attenuation_db;
  if (keep === null) base_attenuation_db = appendix_b_attenuation_db;
  else if (method === "osha-50") base_attenuation_db = appendix_b_attenuation_db / 2;
  else base_attenuation_db = derated_nrr_db;

  const dual_bonus_applied_db = dual ? bonus : 0;
  const effective_attenuation_db = Math.max(0, base_attenuation_db + dual_bonus_applied_db);
  const attenuation_floored = base_attenuation_db + dual_bonus_applied_db < 0;
  const protected_twa_db = twa - effective_attenuation_db;
  const meets_target = protected_twa_db <= target + 1e-9 * Math.abs(target);
  const margin_db = target - protected_twa_db;

  // What the package number would have suggested, versus what the method leaves.
  const label_vs_real_db = nrr - effective_attenuation_db;
  // The NRR that would be needed to reach the target by this method.
  const spectral_term = niosh ? 0 : (isA ? SPECTRAL : 0);
  const needed_attenuation_db = Math.max(0, twa - target - dual_bonus_applied_db);
  let nrr_needed_db;
  if (keep === null) nrr_needed_db = needed_attenuation_db + spectral_term;
  else if (method === "osha-50") nrr_needed_db = needed_attenuation_db * 2 + spectral_term;
  else nrr_needed_db = needed_attenuation_db / keep;

  const METHOD_LABEL = {
    "appendix-b": "Appendix B as written, no derating",
    "osha-50": "OSHA field guidance: the adjusted value halved",
    "niosh-muff": "NIOSH earmuffs: labelled NRR less 25%",
    "niosh-formable": "NIOSH slow-recovery formable earplugs: labelled NRR less 50%",
    "niosh-other": "NIOSH all other earplugs: labelled NRR less 70%",
  };

  const note = "THE NUMBER ON THE PACKAGE IS NEVER THE PROTECTION. Appendix B applies the NRR directly to a C-WEIGHTED measurement, but requires SUBTRACTING 7 dB FIRST where the measurement is A-weighted - which is what a dosimeter reports and what everyone actually has. "
    + "This exposure is " + twa + " dB" + weighting + ", so under OSHA's methods " + (isA ? "the 7 dB spectral adjustment applies and an NRR of " + nrr + " becomes " + appendix_b_attenuation_db.toFixed(1) + " dB before anything else. That single step is the most commonly skipped number in hearing conservation, and it is worth 7 dB every time. " : "the NRR applies directly, with no 7 dB adjustment - measuring in dBC is worth 7 dB of paper protection relative to the same job measured in dBA. ")
    + "METHOD: " + METHOD_LABEL[method] + ". "
    + (keep === null ? "Appendix B contains no derating instruction; it says only that calculated values are realistic to the extent the protectors are properly fitted and worn, which is the whole problem. " : method === "osha-50" ? "OSHA field guidance halves the adjusted value as a safety factor, giving " + base_attenuation_db.toFixed(1) + " dB. This is enforcement guidance rather than Appendix B text. " : "NIOSH derates the LABELLED NRR by protector type because a laboratory fit is not a jobsite fit: " + nrr + " becomes " + derated_nrr_db.toFixed(1) + " dB. NIOSH's derating IS its adjustment for real-world performance, so this tile does not stack OSHA's separate 7 dB on top of it; that is a stated reading rather than a quoted instruction, and it is why the two families report different spectral terms. ")
    + (dual ? "DUAL PROTECTION adds " + dual_bonus_applied_db + " dB here. That value is editable and it is not from Appendix B: OSHA's Technical Manual guidance commonly adds 5 dB to the higher-rated device, while NIOSH recommends double protection above a 100 dBA TWA without quantifying the gain. Two protectors do not add their ratings - the second one is working against the sound that gets in by bone conduction and around the first. " : "")
    + "RESULT: " + effective_attenuation_db.toFixed(1) + " dB of effective attenuation leaves " + protected_twa_db.toFixed(1) + " dB at the ear against a " + target + " dB target - " + (meets_target ? "MEETS it with " + margin_db.toFixed(1) + " dB to spare. " : "OVER by " + (-margin_db).toFixed(1) + " dB. ")
    + (attenuation_floored ? "The method produced a negative attenuation, which is meaningless, so it is reported as zero; the protector is not credited with making things worse. " : "")
    + "THE TWO FAMILIES CROSS OVER, which is worth knowing before arguing about which is stricter: an A-weighted Appendix B figure loses a flat 7 dB while a NIOSH figure loses a percentage, so at a low NRR the NIOSH earmuff number is the MORE generous of the two and at a high NRR it is the less. Neither method dominates the other. "
    + "LABEL VERSUS REALITY: the package says " + nrr + " dB and this method credits " + effective_attenuation_db.toFixed(1) + " dB, a gap of " + label_vs_real_db.toFixed(1) + " dB. "
    + (meets_target ? "" : "To reach the target by this method the NRR would have to be about " + nrr_needed_db.toFixed(1) + " dB" + (nrr_needed_db > 33 ? " - which exceeds anything on the market, so the answer is engineering controls, administrative limits, or dual protection rather than a better earplug. " : ". "))
    + "Not checked: whether the exposure itself is measured correctly, which is the TWA calculation and a separate question; the noise spectrum, since the NRR is a single number standing in for a curve and low-frequency noise defeats it; fit, which is what the derating exists to approximate and which fit-testing measures directly rather than estimating; wearing time, where taking a protector off for even a few minutes of an eight-hour shift costs far more than any derating; whether the protector is undamaged, the right size, and correctly inserted; the audiometric testing, training, and recordkeeping the standard also requires; and the significant-threshold-shift provision, which requires attenuation sufficient to reduce exposure to a TWA of 85 dB. An attenuation estimate, not a hearing conservation program; 29 CFR 1910.95 and the program administrator govern.";

  return { appendix_b_attenuation_db, derated_nrr_db, base_attenuation_db, dual_bonus_applied_db, effective_attenuation_db, attenuation_floored, protected_twa_db, meets_target, margin_db, label_vs_real_db, nrr_needed_db, spectral_adjustment_db: spectral_term, note };
}

export const hearingProtectorNrrExample = { inputs: { twa_db: 98, weighting: "A", nrr_db: 29, method: "niosh-other", dual_protection: "no", dual_bonus_db: 5, target_db: 85 } };

SAFETY_RENDERERS["hearing-protector-nrr"] = _simpleRendererG({
  citation: "Citation: OSHA 29 CFR 1910.95 Appendix B, Methods for Estimating the Adequacy of Hearing Protector Attenuation, a US federal regulation in the public domain. Where the measurement is C-weighted the NRR is subtracted directly; where it is A-weighted, 'subtract 7 dB from the NRR' and subtract the remainder from the A-weighted TWA. Appendix B also states that calculated attenuation values reflect realistic values only to the extent that the protectors are properly fitted and worn, and that for employees who have experienced a significant threshold shift, attenuation must be sufficient to reduce exposure to a TWA of 85 dB. Derating is NOT Appendix B text: the 50% field adjustment is OSHA enforcement guidance, and the type-specific factors are NIOSH's, and this tile applies them to the labelled NRR without also taking OSHA's 7 dB, on the reading that NIOSH's derating IS its own real-world adjustment - 'earmuffs: subtract 25% from the manufacturers' labeled NRR; slow-recovery formable earplugs: subtract 50%; all other earplugs: subtract 70%' (NIOSH Criteria for a Recommended Standard, Occupational Noise Exposure). The dual-protection bonus is an editable input, defaulted to the 5 dB commonly applied under OSHA Technical Manual guidance; NIOSH recommends double protection above a 100 dBA TWA without quantifying the gain. Not checked: the TWA measurement itself (see noise-dose), the noise spectrum, fit, wearing time, protector condition, or the audiometric testing, training, and recordkeeping the standard also requires. An attenuation estimate, not a hearing conservation program.",
  example: hearingProtectorNrrExample.inputs,
  fields: [
    { key: "twa_db", label: "Measured 8-hr TWA (dB)", kind: "number" },
    { key: "weighting", label: "Weighting of the measurement", kind: "select", options: [{ value: "A", label: "A-weighted (dBA) - the usual dosimeter reading", selected: true }, { value: "C", label: "C-weighted (dBC)" }] },
    { key: "nrr_db", label: "Noise reduction rating on the package (dB)", kind: "number" },
    { key: "method", label: "Method", kind: "select", options: [{ value: "appendix-b", label: "Appendix B as written (no derating)" }, { value: "osha-50", label: "OSHA field guidance (halve the adjusted value)" }, { value: "niosh-muff", label: "NIOSH earmuffs (NRR less 25%)" }, { value: "niosh-formable", label: "NIOSH formable earplugs (NRR less 50%)" }, { value: "niosh-other", label: "NIOSH all other earplugs (NRR less 70%)", selected: true }] },
    { key: "dual_protection", label: "Plugs and muffs worn together?", kind: "select", options: [{ value: "no", label: "No", selected: true }, { value: "yes", label: "Yes" }] },
    { key: "dual_bonus_db", label: "Dual-protection bonus (dB; editable, not from Appendix B)", kind: "number", default: 5 },
    { key: "target_db", label: "Target exposure at the ear (dB)", kind: "number", default: 85 },
  ],
  outputs: [
    { key: "s", id: "hpn-out-s", label: "Spectral adjustment", value: (r) => r.spectral_adjustment_db === 0 ? "none applied - either the measurement is C-weighted, or the NIOSH derating stands in its place" : "7 dB comes off the NRR because the measurement is A-weighted" },
    { key: "a", id: "hpn-out-a", label: "Effective attenuation", value: (r) => fmt(r.effective_attenuation_db, 1) + " dB" + (r.dual_bonus_applied_db > 0 ? " (including " + fmt(r.dual_bonus_applied_db, 1) + " dB for dual protection)" : "") },
    { key: "p", id: "hpn-out-p", label: "Exposure at the ear", value: (r) => fmt(r.protected_twa_db, 1) + " dB - " + (r.meets_target ? "meets the target with " + fmt(r.margin_db, 1) + " dB to spare" : "OVER by " + fmt(-r.margin_db, 1) + " dB") },
    { key: "g", id: "hpn-out-g", label: "Label versus reality", value: (r) => "package " + fmt(r.label_vs_real_db + r.effective_attenuation_db, 0) + " dB, credited " + fmt(r.effective_attenuation_db, 1) + " dB - a gap of " + fmt(r.label_vs_real_db, 1) + " dB" },
    { key: "n2", id: "hpn-out-n2", label: "NRR that would reach the target", value: (r) => r.meets_target ? "already met" : fmt(r.nrr_needed_db, 1) + " dB by this method" + (r.nrr_needed_db > 33 ? " - beyond anything on the market" : "") },
    { key: "n", id: "hpn-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeHearingProtectorNrr,
});

// --- spec-v1167: OSHA silica Table 1 respirator lookup (29 CFR 1926.1153) ---
// Table 1 is the shortcut: implement the listed controls for a listed task and you skip
// exposure assessment entirely. Three things about it get missed.
// It is ALL OR NOTHING. 1926.1153(c)(1) requires the engineering controls, work practices AND
// respiratory protection to be fully and properly implemented; do part of it and Table 1 stops
// applying at all, dropping the job into exposure assessment against the 50 ug/m3 PEL.
// The duration column is a CLIFF at four hours, not a ramp. Tuckpointing goes from APF 10 to
// APF 25 - a half mask to a PAPR or full facepiece - at four hours and one minute.
// And several rows change or vanish indoors. A walk-behind saw needs nothing outdoors and APF
// 10 indoors; a drivable saw has no indoor row at all, so taking it inside leaves Table 1.
// dims: in { hours_per_shift: T, apf_provided: dimensionless } out: { required_apf: dimensionless, hours_to_upgrade: T }
export function computeSilicaTable1({ task = "xi", location = "outdoors", hours_per_shift = 0, controls_fully_implemented = "yes", apf_provided = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const hrs = Number(hours_per_shift);
  const provided = Number(apf_provided) || 0;
  const indoors = location === "indoors";
  const full = controls_fully_implemented === "yes";
  // [label, outdoor <=4, outdoor >4, indoor <=4, indoor >4, outdoorOnly]
  const T1 = {
    i: ["Stationary masonry saws", 0, 0, 0, 0, false],
    ii: ["Handheld power saws (any blade diameter)", 0, 10, 10, 10, false],
    iii: ["Handheld power saws for cutting fiber-cement board (blade 8 in or less)", 0, 0, null, null, true],
    iv: ["Walk-behind saws", 0, 0, 10, 10, false],
    v: ["Drivable saws", 0, 0, null, null, true],
    vi: ["Rig-mounted core saws or drills", 0, 0, 0, 0, false],
    vii: ["Handheld and stand-mounted drills, including impact and rotary hammer drills", 0, 0, 0, 0, false],
    viii: ["Dowel drilling rigs for concrete", 10, 10, null, null, true],
    ix: ["Vehicle-mounted drilling rigs for rock and concrete", 0, 0, 0, 0, false],
    x: ["Jackhammers and handheld powered chipping tools", 0, 10, 10, 10, false],
    xi: ["Handheld grinders for mortar removal (tuckpointing)", 10, 25, 10, 25, false],
    xii: ["Handheld grinders for uses other than mortar removal", 0, 0, 0, 10, false],
    xiii: ["Walk-behind milling machines and floor grinders", 0, 0, 0, 0, false],
    xiv: ["Small drivable milling machines (less than half-lane)", 0, 0, 0, 0, false],
    // 29 CFR 1926.1153 Table 1 (xv) has no outdoor-only condition (until 2026-09-25 it was marked
    // outdoor-only, so an indoor run read as "outside Table 1" instead of "no respirator").
    xv: ["Large drivable milling machines (half-lane and larger)", 0, 0, 0, 0, false],
    xvi: ["Crushing machines", 0, 0, 0, 0, false],
    xvii: ["Heavy equipment and utility vehicles used to abrade or fracture silica-containing materials", 0, 0, 0, 0, false],
    xviii: ["Heavy equipment and utility vehicles for grading and excavating", 0, 0, 0, 0, false],
  };
  if (!(task in T1)) return { error: "Task must be one of the eighteen Table 1 entries (i through xviii)." };
  if (location !== "outdoors" && location !== "indoors") return { error: "Location must be outdoors or indoors (indoors includes any enclosed area)." };
  if (controls_fully_implemented !== "yes" && controls_fully_implemented !== "no") return { error: "State whether the Table 1 controls are fully and properly implemented (yes or no)." };
  if (!Number.isFinite(hrs) || hrs <= 0) return { error: "Hours on the task per shift must be positive." };
  if (hrs > 24) return { error: "Hours on the task per shift cannot exceed 24." };
  if (provided < 0) return { error: "Assigned protection factor provided cannot be negative." };

  const [task_label, out4, outOver, in4, inOver, outdoor_only] = T1[task];
  const CLIFF = 4, PEL_UG = 50;
  const over_four = hrs > CLIFF + 1e-9 * Math.abs(CLIFF);
  const indoor_permitted = !(outdoor_only && indoors);
  const in_table_1 = full && indoor_permitted;

  const required_apf = !in_table_1 ? null : indoors ? (over_four ? inOver : in4) : (over_four ? outOver : out4);
  const low_apf = indoors ? in4 : out4;
  const high_apf = indoors ? inOver : outOver;
  const has_cliff = indoor_permitted && high_apf !== null && low_apf !== null && high_apf > low_apf;
  const hours_to_upgrade = has_cliff && !over_four ? CLIFF - hrs : null;

  const respirator_required = required_apf !== null && required_apf > 0;
  const apf_ok = required_apf === null ? null : provided >= required_apf - 1e-9 * Math.abs(required_apf);
  const apf_shortfall = required_apf === null ? null : Math.max(0, required_apf - provided);
  const passes = in_table_1 && apf_ok === true;

  // What the same task costs on the other side of each switch, so the tradeoffs are visible.
  const other_location_apf = !indoor_permitted ? null : indoors ? (over_four ? outOver : out4) : (over_four ? inOver : in4);
  const indoor_move_penalty = other_location_apf === null || required_apf === null ? null : (indoors ? required_apf - other_location_apf : other_location_apf - required_apf);

  const note = "TABLE 1 IS THE SHORTCUT, AND IT IS ALL OR NOTHING. Implement the listed engineering controls, work practices AND respiratory protection for a listed task and you skip exposure assessment entirely; 1926.1153(c)(1) requires them 'fully and properly implemented,' so doing part of it does not get you part of the benefit. "
    + "Task: " + task_label + " (" + task + "), " + location + ", " + hrs + " h/shift. "
    + (!full ? "CONTROLS ARE NOT FULLY IMPLEMENTED, so Table 1 does not apply at all. The job falls to 1926.1153(d): assess exposure, apply feasible engineering and work practice controls first, and supplement with respiratory protection as needed so that no employee is exposed above " + PEL_UG + " ug/m3 as an 8-hour TWA. That is a monitoring obligation, not a respirator choice, and it is the expensive path Table 1 exists to avoid. "
      : !indoor_permitted ? "THIS ROW IS LIMITED TO OUTDOOR USE. Table 1 provides no indoor entry for " + task_label.toLowerCase() + ", so running it indoors or in an enclosed area leaves Table 1 entirely and the job falls to 1926.1153(d) - exposure assessment against the " + PEL_UG + " ug/m3 PEL. Moving the work outside is usually cheaper than the monitoring. "
      : "REQUIRED RESPIRATORY PROTECTION: " + (required_apf === 0 ? "none, provided the listed controls are in place and maintained. " : "APF " + required_apf + " minimum. ")
        + (has_cliff
          ? "THE DURATION COLUMN IS A CLIFF, NOT A RAMP. Four hours or less takes " + (low_apf === 0 ? "no respirator" : "APF " + low_apf) + "; more than four hours takes APF " + high_apf + ". "
            + (over_four ? "This shift is over the line at " + hrs + " h. Coming back under four hours would drop the requirement to " + (low_apf === 0 ? "none" : "APF " + low_apf) + ". " : "This shift is under the line with " + hours_to_upgrade.toFixed(2) + " h of headroom; at four hours and one minute the requirement steps up to APF " + high_apf + ". ")
            + (high_apf === 25 ? "That particular step is not a paperwork change: APF 10 is a half-mask, APF 25 is a PAPR or a full facepiece with the right cartridge, and it is a different purchase, a different fit test, and a different training record. " : "")
          : "The requirement does not change with duration for this row" + (indoor_permitted && low_apf === high_apf && low_apf > 0 ? " - a respirator is required even for ten minutes of it, which is the assumption people get wrong in the other direction. " : ". "))
        + (indoor_move_penalty !== null && indoor_move_penalty !== 0 ? "LOCATION MATTERS HERE: the same task and duration " + (indoors ? "outdoors would require " + (other_location_apf === 0 ? "no respirator" : "APF " + other_location_apf) : "indoors or in an enclosed area would require " + (other_location_apf === 0 ? "no respirator" : "APF " + other_location_apf)) + ". Enclosure is a control decision with a respirator attached to it. " : "")
        + "Provided APF " + provided + ": " + (apf_ok ? "adequate. " : "SHORT - APF " + required_apf + " is required" + (apf_shortfall > 0 ? " and the shortfall is " + apf_shortfall + " " : " ") + ". "))
    + (passes ? "The items entered PASS. " : "The items entered DO NOT pass. ")
    + "Not checked: the engineering controls and work practices themselves, which Table 1 specifies task by task and which this tile assumes are in place rather than reproducing - read the row before relying on the respirator answer; whether the material actually contains crystalline silica; the written exposure control plan and the competent person the standard requires; respirator fit testing, medical evaluation, and the written respiratory protection program under 1910.134; housekeeping restrictions on dry sweeping and compressed air; medical surveillance and its 30-day-per-year trigger; multiple tasks in one shift, which this tile does not add together; and any state plan with more stringent requirements. A Table 1 lookup, not an exposure assessment; 29 CFR 1926.1153 and the competent person govern.";

  return { task_label, over_four, outdoor_only, indoor_permitted, in_table_1, required_apf, low_apf, high_apf, has_cliff, hours_to_upgrade, respirator_required, apf_ok, apf_shortfall, other_location_apf, indoor_move_penalty, pel_ug_m3: PEL_UG, passes, note };
}

export const silicaTable1Example = { inputs: { task: "xi", location: "outdoors", hours_per_shift: 5, controls_fully_implemented: "yes", apf_provided: 10 } };

SAFETY_RENDERERS["silica-table-1"] = _simpleRendererG({
  citation: "Citation: OSHA 29 CFR 1926.1153 Table 1 (Specified Exposure Control Methods When Working With Materials Containing Crystalline Silica), a US federal regulation in the public domain. Section 1926.1153(c)(1) requires that for each employee engaged in a task identified on Table 1, the employer shall fully and properly implement the engineering controls, work practices, and respiratory protection specified for that task, unless the employer assesses and limits exposure in accordance with 1926.1153(d). Under 1926.1153(d) the employer shall ensure that no employee is exposed to an airborne concentration of respirable crystalline silica in excess of 50 micrograms per cubic meter of air, calculated as an 8-hour TWA. This tile reproduces the respiratory protection column only - the required engineering controls and work practices are specified row by row in Table 1 and are ASSUMED here rather than reproduced; read the row before relying on the respirator answer. Not checked: whether the material contains crystalline silica, the written exposure control plan and competent person, fit testing and medical evaluation and the written respiratory protection program under 1910.134, housekeeping restrictions, medical surveillance and its 30-day trigger, multiple tasks in one shift, or state plans with more stringent requirements. A Table 1 lookup, not an exposure assessment.",
  example: silicaTable1Example.inputs,
  fields: [
    { key: "task", label: "Table 1 task", kind: "select", options: [
      { value: "i", label: "(i) Stationary masonry saws" },
      { value: "ii", label: "(ii) Handheld power saws (any blade diameter)" },
      { value: "iii", label: "(iii) Handheld power saws for fiber-cement board (blade 8 in or less)" },
      { value: "iv", label: "(iv) Walk-behind saws" },
      { value: "v", label: "(v) Drivable saws" },
      { value: "vi", label: "(vi) Rig-mounted core saws or drills" },
      { value: "vii", label: "(vii) Handheld and stand-mounted drills, including rotary hammers" },
      { value: "viii", label: "(viii) Dowel drilling rigs for concrete" },
      { value: "ix", label: "(ix) Vehicle-mounted drilling rigs for rock and concrete" },
      { value: "x", label: "(x) Jackhammers and handheld powered chipping tools" },
      { value: "xi", label: "(xi) Handheld grinders for mortar removal (tuckpointing)", selected: true },
      { value: "xii", label: "(xii) Handheld grinders for uses other than mortar removal" },
      { value: "xiii", label: "(xiii) Walk-behind milling machines and floor grinders" },
      { value: "xiv", label: "(xiv) Small drivable milling machines (less than half-lane)" },
      { value: "xv", label: "(xv) Large drivable milling machines (half-lane and larger)" },
      { value: "xvi", label: "(xvi) Crushing machines" },
      { value: "xvii", label: "(xvii) Heavy equipment abrading or fracturing silica materials" },
      { value: "xviii", label: "(xviii) Heavy equipment for grading and excavating" },
    ] },
    { key: "location", label: "Where the work happens", kind: "select", options: [{ value: "outdoors", label: "Outdoors", selected: true }, { value: "indoors", label: "Indoors or an enclosed area" }] },
    { key: "hours_per_shift", label: "Hours on this task per shift", kind: "number" },
    { key: "controls_fully_implemented", label: "Table 1 controls fully and properly implemented?", kind: "select", options: [{ value: "yes", label: "Yes", selected: true }, { value: "no", label: "No" }] },
    { key: "apf_provided", label: "Assigned protection factor of the respirator provided (0 = none)", kind: "number" },
  ],
  outputs: [
    { key: "t", id: "st1-out-t", label: "Task", value: (r) => r.task_label + (r.outdoor_only ? " - Table 1 lists this row for OUTDOOR use only" : "") },
    { key: "r", id: "st1-out-r", label: "Required respiratory protection", value: (r) => r.required_apf === null ? "Table 1 does not apply here - go to 1926.1153(d) and the " + r.pel_ug_m3 + " ug/m3 PEL" : r.required_apf === 0 ? "none, with the listed controls in place" : "APF " + r.required_apf + " minimum" },
    { key: "c", id: "st1-out-c", label: "Duration", value: (r) => !r.has_cliff ? "no change with duration on this row" : r.over_four ? "over four hours: APF " + r.high_apf + " (four hours or less would be " + (r.low_apf === 0 ? "none" : "APF " + r.low_apf) + ")" : fmt(r.hours_to_upgrade, 2) + " h of headroom before it steps to APF " + r.high_apf },
    { key: "l", id: "st1-out-l", label: "The other location", value: (r) => r.other_location_apf === null ? "no entry for the other location" : (r.other_location_apf === 0 ? "no respirator" : "APF " + r.other_location_apf) },
    { key: "p", id: "st1-out-p", label: "Respirator provided", value: (r) => r.apf_ok === null ? "not the question here - Table 1 does not apply" : r.apf_ok ? "adequate" : "SHORT of the required APF " + r.required_apf },
    { key: "v", id: "st1-out-v", label: "Verdict", value: (r) => r.passes ? "PASSES the Table 1 path" : "DOES NOT pass the Table 1 path" },
    { key: "n", id: "st1-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeSilicaTable1,
});

// --- spec-v1174: horizontal lifeline tension and anchorage demand (OSHA 1926.502(d)) ---
// The number that surprises everyone: a horizontal lifeline multiplies the arrest force it is
// asked to catch, and the multiplier is set by SAG. A cable pulled tight has almost no vertical
// component to work with, so the tension runs away - halve the sag and the tension roughly
// doubles. A 1,800 lb arrest at midspan of a 30 ft line sagging 1 ft puts over 13,000 lb into
// each end anchor, which is why a lifeline strung between two roof-hatch handles is not a
// lifeline.
// Statics at midspan: 2 T sin(theta) = W, sin(theta) = s / sqrt((L/2)^2 + s^2), so
// T = W sqrt((L/2)^2 + s^2) / (2 s), with a horizontal pull H = W L / (4 s) at each anchor.
// OSHA then puts a factor on top: 1926.502(d)(8) requires a horizontal lifeline to maintain a
// safety factor of at least two, and (d)(15) wants an anchorage good for 5,000 lb per employee
// unless the whole system is engineered to that factor of two by a qualified person.
// dims: in { span_ft: L, sag_ft: L, arrest_force_lb: M L T^-2, workers: dimensionless } out: { cable_tension_lb: M L T^-2, horizontal_pull_lb: M L T^-2, anchorage_demand_lb: M L T^-2, sag_for_target_ft: L, target_tension_lb: M L T^-2 }
export function computeLifelineTension({ span_ft = 0, sag_ft = 0, arrest_force_lb = 1800, workers = 1, safety_factor = 2, anchorage_capacity_lb = 0, target_tension_lb = 0 } = {}) {
  const _g = _finiteGuard(arguments[0]); if (_g) return _g;
  const L = Number(span_ft) || 0;
  const s = Number(sag_ft) || 0;
  const W = Number(arrest_force_lb) || 0;
  const n = Number(workers) || 0;
  const sf = Number(safety_factor) || 0;
  const cap = Number(anchorage_capacity_lb) || 0;
  const target = Number(target_tension_lb) || 0;
  if (!(L > 0)) return { error: "Span between anchors must be positive (ft)." };
  if (!(s > 0)) return { error: "Midspan sag must be positive (ft) - a lifeline with no sag has no vertical component to arrest against, and the tension is unbounded." };
  if (!(W > 0)) return { error: "Arrest force must be positive (lb)." };
  if (!Number.isInteger(n) || n < 1) return { error: "Number of workers attached must be a whole number, one or more." };
  if (!(sf > 0)) return { error: "Safety factor must be positive." };
  if (cap < 0) return { error: "Anchorage capacity cannot be negative (lb)." };
  if (target < 0) return { error: "Target tension cannot be negative (lb)." };
  if (s >= L) return { error: "Sag cannot equal or exceed the span - check the units." };

  const MAF_HARNESS = 1800, PER_WORKER = 5000, FREE_FALL_MAX = 6, DECEL_MAX = 3.5;
  const half = L / 2;
  const slant_ft = Math.sqrt(half * half + s * s);
  const cable_tension_lb = W * slant_ft / (2 * s);
  const horizontal_pull_lb = W * half / (2 * s);
  const tension_multiple = cable_tension_lb / W;
  const angle_deg = Math.atan2(s, half) * 180 / Math.PI;

  const anchorage_demand_lb = cable_tension_lb * sf;
  const prescriptive_anchorage_lb = PER_WORKER * n;
  const governing_anchorage_lb = Math.max(anchorage_demand_lb, prescriptive_anchorage_lb);
  const engineered_governs = anchorage_demand_lb > prescriptive_anchorage_lb;
  const anchorage_ok = cap > 0 ? cap >= governing_anchorage_lb - 1e-9 * Math.abs(governing_anchorage_lb) : null;
  const anchorage_deficit_lb = cap > 0 ? Math.max(0, governing_anchorage_lb - cap) : null;

  // The inverse: the sag that would bring the cable tension down to a target.
  // T = W sqrt((L/2)^2 + s^2)/(2 s)  ->  s = W (L/2) / sqrt(4 T^2 - W^2)
  const sag_for_target_ft = target > W / 2 ? (W * half) / Math.sqrt(4 * target * target - W * W) : null;
  // Doubling the sag from here, to show the trade.
  const tension_at_double_sag_lb = W * Math.sqrt(half * half + 4 * s * s) / (4 * s);
  const arrest_over_harness = W > MAF_HARNESS + 1e-9 * Math.abs(MAF_HARNESS);

  const note = "A HORIZONTAL LIFELINE MULTIPLIES THE FORCE IT IS ASKED TO CATCH, and the multiplier is set by SAG. At midspan the two halves of the cable have to turn a vertical arrest force into two axial pulls, and the flatter the cable the less vertical component there is to work with. "
    + "A " + W + " lb arrest at midspan of a " + L + " ft line sagging " + s + " ft puts " + cable_tension_lb.toFixed(0) + " lb in the cable - " + tension_multiple.toFixed(1) + " times the arrest force - with a horizontal pull of " + horizontal_pull_lb.toFixed(0) + " lb at each anchor, the cable sitting at " + angle_deg.toFixed(1) + " degrees off horizontal. "
    + "HALVE THE SAG AND THIS RISES TO ABOUT " + (W * Math.sqrt(half * half + s * s / 4) / s).toFixed(0) + " lb; double it and this drops to about " + tension_at_double_sag_lb.toFixed(0) + " lb. That is the whole design trade, and it runs the opposite way from intuition: a lifeline pulled drum-tight is the dangerous one, and the slack that looks sloppy is what keeps the anchors alive. It also costs fall clearance below, which is a separate calculation and the reason sag cannot simply be maximised. "
    + "ANCHORAGE: 1926.502(d)(8) requires a horizontal lifeline to be designed, installed, and used under the supervision of a QUALIFIED PERSON as part of a complete personal fall arrest system maintaining a safety factor of at least two - so at a factor of " + sf + " the engineered demand is " + anchorage_demand_lb.toFixed(0) + " lb per anchor. "
    + "1926.502(d)(15) separately wants an anchorage capable of supporting at least 5,000 lb PER EMPLOYEE ATTACHED, which for " + n + " worker" + (n === 1 ? "" : "s") + " is " + prescriptive_anchorage_lb.toFixed(0) + " lb, unless the system is engineered to that factor of two by a qualified person. "
    + "Governing here: " + governing_anchorage_lb.toFixed(0) + " lb, from the " + (engineered_governs ? "ENGINEERED path - the geometry demands more than the 5,000 lb per worker figure, which is the case people never expect and the reason a flat lifeline cannot be signed off on the prescriptive number alone. " : "prescriptive 5,000 lb per worker figure, which exceeds what this geometry demands. ")
    + (cap > 0 ? "Anchorage capacity entered " + cap + " lb: " + (anchorage_ok ? "adequate. " : "SHORT by " + anchorage_deficit_lb.toFixed(0) + " lb. ") : "No anchorage capacity entered, so nothing is checked against it. ")
    + (sag_for_target_ft !== null ? "TO BRING THE CABLE TENSION TO " + target + " LB the sag would have to be " + sag_for_target_ft.toFixed(2) + " ft" + (sag_for_target_ft > s ? " - more than the " + s + " ft entered, so the line needs to be let out. " : " - less than the " + s + " ft entered, which this line already beats. ") : target > 0 ? "The target tension entered is at or below half the arrest force, which no sag can achieve: each half of the cable can never carry less than half the load it turns. " : "")
    + (arrest_over_harness ? "NOTE THE ARREST FORCE ENTERED: " + W + " lb exceeds the 1,800 lb that 1926.502(d)(16)(ii) permits on an employee with a body harness, so the system fails on the worker before the anchors are reached. " : "")
    + "Not checked: the fall clearance below the lifeline, which grows with sag and is the reason sag cannot simply be maximised - that is a separate tile; the cable, its terminations, turnbuckles, and connectors, whose ratings are usually what governs before the anchor does; dynamic and impact effects beyond the static midspan case modelled here, and load applied off midspan, which changes the geometry; more than one worker loading the line at once, which this does not superpose; sag under self-weight before anyone falls; the maximum arresting force, deceleration distance of 3.5 ft, and 6 ft free-fall limits of 1926.502(d)(16); the structure the anchors are attached to, which is the usual real limit; and the requirement, which is not optional, that the whole system be designed and supervised by a QUALIFIED PERSON. A tension estimate, not a lifeline design; 29 CFR 1926 Subpart M and that qualified person govern.";

  return { slant_ft, cable_tension_lb, horizontal_pull_lb, tension_multiple, angle_deg, anchorage_demand_lb, prescriptive_anchorage_lb, governing_anchorage_lb, engineered_governs, anchorage_ok, anchorage_deficit_lb, sag_for_target_ft, target_tension_lb: target, tension_at_double_sag_lb, arrest_over_harness, max_arresting_force_lb: MAF_HARNESS, free_fall_max_ft: FREE_FALL_MAX, decel_max_ft: DECEL_MAX, note };
}

export const lifelineTensionExample = { inputs: { span_ft: 30, sag_ft: 1, arrest_force_lb: 1800, workers: 1, safety_factor: 2, anchorage_capacity_lb: 5000, target_tension_lb: 5000 } };

SAFETY_RENDERERS["lifeline-tension"] = _simpleRendererG({
  citation: "Citation: statics of a cable loaded at midspan - T = W x sqrt((L/2)^2 + s^2) / (2 s) - with the regulatory requirements from OSHA 29 CFR 1926.502(d), a US federal regulation in the public domain. 1926.502(d)(8): 'Horizontal lifelines shall be designed, installed, and used, under the supervision of a qualified person, as part of a complete personal fall arrest system, which maintains a safety factor of at least two.' 1926.502(d)(15): anchorages used for attachment of personal fall arrest equipment shall be independent of any anchorage being used to support or suspend platforms and capable of supporting at least 5,000 pounds per employee attached, or shall be designed, installed, and used as part of a complete personal fall arrest system which maintains a safety factor of at least two and under the supervision of a qualified person. 1926.502(d)(16): systems shall limit maximum arresting force on an employee to 900 lb with a body belt and 1,800 lb with a body harness, be rigged such that an employee can neither free fall more than 6 ft nor contact any lower level, bring an employee to a complete stop and limit the maximum deceleration distance to 3.5 ft, and have sufficient strength to withstand twice the potential impact energy of an employee free falling 6 ft or the free fall distance permitted by the system, whichever is less. The tension model is the static midspan case; dynamic effects, off-midspan loading, multiple simultaneous loads, cable and connector ratings, and the supporting structure are not modelled. A tension estimate, not a lifeline design; the qualified person governs.",
  example: lifelineTensionExample.inputs,
  fields: [
    { key: "span_ft", label: "Span between anchors (ft)", kind: "number" },
    { key: "sag_ft", label: "Midspan sag under load (ft)", kind: "number" },
    { key: "arrest_force_lb", label: "Arrest force applied at midspan (lb)", kind: "number" },
    { key: "workers", label: "Workers attached", kind: "number" },
    { key: "safety_factor", label: "Safety factor (2 is the OSHA minimum)", kind: "number" },
    { key: "anchorage_capacity_lb", label: "Anchorage capacity available (lb; 0 = not checked)", kind: "number" },
    { key: "target_tension_lb", label: "Target cable tension, to solve for sag (lb; 0 = skip)", kind: "number" },
  ],
  outputs: [
    { key: "t", id: "llt-out-t", label: "Cable tension", value: (r) => fmt(r.cable_tension_lb, 0) + " lb - " + fmt(r.tension_multiple, 1) + "x the arrest force, at " + fmt(r.angle_deg, 1) + " degrees off horizontal" },
    { key: "h", id: "llt-out-h", label: "Horizontal pull at each anchor", value: (r) => fmt(r.horizontal_pull_lb, 0) + " lb" },
    { key: "d", id: "llt-out-d", label: "Double the sag", value: (r) => "tension falls to about " + fmt(r.tension_at_double_sag_lb, 0) + " lb" },
    { key: "a", id: "llt-out-a", label: "Anchorage required", value: (r) => fmt(r.governing_anchorage_lb, 0) + " lb - the " + (r.engineered_governs ? "engineered demand (" + fmt(r.anchorage_demand_lb, 0) + ") exceeds the 5,000 lb per worker figure" : "prescriptive 5,000 lb per worker figure exceeds the engineered demand (" + fmt(r.anchorage_demand_lb, 0) + ")") },
    { key: "c", id: "llt-out-c", label: "Against the capacity entered", value: (r) => r.anchorage_ok === null ? "not checked" : r.anchorage_ok ? "adequate" : "SHORT by " + fmt(r.anchorage_deficit_lb, 0) + " lb" },
    { key: "s", id: "llt-out-s", label: "Sag needed for the target tension", value: (r) => !(r.target_tension_lb > 0) ? "(no target tension entered)" : r.sag_for_target_ft === null ? "no sag reaches that target - each half carries at least half the load" : fmt(r.sag_for_target_ft, 2) + " ft" },
    { key: "n", id: "llt-out-n", label: "Note", value: (r) => r.note },
  ],
  compute: computeLifelineTension,
});
