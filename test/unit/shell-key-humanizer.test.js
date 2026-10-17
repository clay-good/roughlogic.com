// A worked-example row prints the calculator's own caption where there is one.
// Where there is not, the machine key is read back as English instead of being
// dumped on the reader as snake_case. This claims nothing the key does not
// already say -- it spaces the words out and spells the unit -- so the whole
// risk is in the unit rules, and that is what these pin.
import test from "node:test";
import assert from "node:assert/strict";
import { humanizeKey } from "../../scripts/build-shells.mjs";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

test("a key with a trailing unit reads as a caption", () => {
  assert.equal(humanizeKey("tank_volume_gal"), "Tank volume (gal)");
  assert.equal(humanizeKey("tank_volume_ft3"), "Tank volume (ft³)");
  assert.equal(humanizeKey("moment_inertia_in4"), "Moment inertia (in⁴)");
  assert.equal(humanizeKey("stress_ksi"), "Stress (ksi)");
});

test("case tells amps from area and degrees from a variable", () => {
  assert.equal(humanizeKey("max_deviation_V"), "Max deviation (V)");
  assert.equal(humanizeKey("delta_T_F"), "Delta T (°F)", "the T is the variable, only the F is the unit");
  assert.equal(humanizeKey("totals_C_amps"), "Totals C (A)", "a mid-key C is a conductor, not Celsius");
});

test("a per-unit denominator is only ever the last token", () => {
  assert.equal(humanizeKey("mass_rate_lb_hr"), "Mass rate (lb/hr)");
  assert.equal(humanizeKey("influent_lb_day"), "Influent (lb/day)");
  assert.equal(humanizeKey("aggregate_lb_sy"), "Aggregate (lb/SY)");
  // `min` here is "minimum", not minutes -- the trap this rule exists for.
  assert.equal(humanizeKey("conductor_min_A"), "Conductor min (A)");
  assert.equal(humanizeKey("speed_rule_min_ft"), "Speed rule min (ft)");
  assert.equal(humanizeKey("theta_s_deg"), "Theta s (deg)");
});

test("a key that spells its own `per` reads as one quotient, never \"X per (unit)\"", () => {
  assert.equal(humanizeKey("pitch_in_per_ft"), "Pitch (in/ft)");
  assert.equal(humanizeKey("loading_gpm_per_ft2"), "Loading (GPM/ft²)");
  assert.equal(humanizeKey("glazed_btuh_per_ft2"), "Glazed (Btu/h/ft²)");
  // A same-unit quotient keeps both halves; the dedupe for `lb_lb` must not eat it.
  assert.equal(humanizeKey("angularity_in_per_in"), "Angularity (in/in)");
  assert.equal(humanizeKey("moment_lb_in_per_ft"), "Moment (lb-in/ft)", "two units before the per are a product");
  assert.equal(humanizeKey("cost_per_lb"), "Cost per lb", "no unit before the per keeps the word");
  assert.equal(humanizeKey("work_min_per_hr"), "Work min per hr", "min is still a minimum, never a unit");
  assert.equal(humanizeKey("w_per_ft2"), "W per ft²");
  assert.equal(humanizeKey("cfm_per_ton"), "CFM per ton");
  assert.equal(humanizeKey("tons_per_ft"), "Tons per ft", "a key that is only units keeps its own word");
  assert.equal(humanizeKey("kva_per_hp"), "kVA per hp");
  assert.equal(humanizeKey("cu_ft_per_day"), "Cubic feet per day");
  assert.equal(humanizeKey("rimpull_per_ton_lb"), "Rimpull per ton (lb)", "a per that is not last is unchanged");
});

test("metric and cubic-yard areas and volumes are units, and a count or mass before one is a density", () => {
  assert.equal(humanizeKey("spoil_volume_yd3"), "Spoil volume (yd³)");
  assert.equal(humanizeKey("area_m2"), "Area (m²)");
  assert.equal(humanizeKey("water_lb_yd3"), "Water (lb/yd³)");
  assert.equal(humanizeKey("pel_ug_m3"), "PEL (µg/m³)");
  assert.equal(humanizeKey("incident_energy_cal_cm2"), "Incident energy (cal/cm²)");
  assert.equal(humanizeKey("cement_bags_yd3"), "Cement (bags/yd³)", "bags per yard, not a volume of bags");
  assert.equal(humanizeKey("indoor_spores_m3"), "Indoor (spores/m³)");
  assert.equal(humanizeKey("coating_g_m2"), "Coating (g/m²)");
  assert.equal(humanizeKey("supplemental_ppfd_umol_m2_s"), "Supplemental PPFD (µmol/m²/s)");
  // Ambiguous tops keep printing the key: mJ or MJ, and AISC's M1/M2 ratio.
  assert.equal(humanizeKey("dose_mj_cm2"), "Dose mj cm2");
  assert.equal(humanizeKey("ra_mj_m2_day"), "Ra mj m2 (day)");
  assert.equal(humanizeKey("m1_m2"), "M1 m2");
});

test("in_lb and ft_lb are torques, not quotients", () => {
  assert.equal(humanizeKey("torque_in_lb"), "Torque (in-lb)");
  assert.equal(humanizeKey("torque_ft_lb"), "Torque (ft-lb)");
});

test("a key that would gain nothing keeps printing itself", () => {
  assert.equal(humanizeKey("va"), null);
  assert.equal(humanizeKey("ecc"), null);
  assert.equal(humanizeKey("df"), null);
  assert.equal(humanizeKey("ratio"), "Ratio", "a one-word key is already English");
  assert.equal(humanizeKey("fc_psi"), "Fc (psi)", "a spelled unit rescues a bare symbol");
});

test("trade acronyms stay uppercase", () => {
  assert.equal(humanizeKey("primary_ocpd_max_A"), "Primary OCPD max (A)");
  assert.equal(humanizeKey("required_ach"), "Required ACH");
});

// Units added 2026-08-25, and the three traps they surfaced.
test("unambiguous multi-letter units read back as units", () => {
  assert.equal(humanizeKey("resistance_ohm"), "Resistance (ohm)");
  assert.equal(humanizeKey("run_time_sec"), "Run time (sec)");
  assert.equal(humanizeKey("discharge_psia"), "Discharge (psia)");
  assert.equal(humanizeKey("magnetizing_kvar"), "Magnetizing (kVAR)");
  assert.equal(humanizeKey("illuminance_lux"), "Illuminance (lux)");
  assert.equal(humanizeKey("total_oz"), "Total (oz)");
  assert.equal(humanizeKey("baseboard_lf"), "Baseboard (LF)");
});

test("a compound unit that is a PRODUCT never renders as a quotient", () => {
  // in-lbf is inch-pounds of torque; in/lbf inverts it. Same for resistivity,
  // which is ohm-cm, never ohms per centimetre.
  assert.equal(humanizeKey("raise_torque_in_lbf"), "Raise torque (in-lbf)");
  assert.equal(humanizeKey("soil_resistivity_ohm_cm"), "Soil resistivity (ohm-cm)");
  // A genuine rate keeps its slash.
  assert.equal(humanizeKey("sweat_rate_oz_hr"), "Sweat rate (oz/hr)");
});

test("`db` is never treated as a unit: it is dry-bulb and beam depth too", () => {
  // Decibels in the acoustics tiles, DRY-BULB in the HVAC ones, BEAM DEPTH in
  // the structural ones. Mapping it made "Leaving db (°F)" into
  // "Leaving (dB/°F)" and a beam depth into decibels per inch.
  assert.equal(humanizeKey("leaving_db_F"), "Leaving db (°F)");
  assert.equal(humanizeKey("beam_depth_db_in"), "Beam depth db (in)");
});

test("an acronym is upper-cased whether or not it has company", () => {
  // The one-word path title-cased and never consulted the acronym list, so
  // `afci` rendered "Afci" and `scfm` rendered "Scfm" on the two pages that
  // print them as labels. `vslr` and `wsfu` did the same despite already
  // being on the list.
  assert.equal(humanizeKey("afci"), "AFCI");
  assert.equal(humanizeKey("rated_wll_lb"), "Rated WLL (lb)");
  assert.equal(humanizeKey("pel_ug_m3"), "PEL (µg/m³)");
  assert.equal(humanizeKey("cfm_required"), "CFM required");
  assert.equal(humanizeKey("scfm"), "SCFM");
  assert.equal(humanizeKey("vslr"), "VSLR");
  assert.equal(humanizeKey("wsfu"), "WSFU");
  // Unchanged where the acronym already had company.
  assert.equal(humanizeKey("nec_ref"), "NEC ref");
});

test("an ordinary word is still title-cased, not shouted", () => {
  // The acronym check must not swallow the one-word English path.
  assert.equal(humanizeKey("ratio"), "Ratio");
  assert.equal(humanizeKey("efficiency"), "Efficiency");
  assert.equal(humanizeKey("occupancy"), "Occupancy");
  // And a short symbol still says more as itself than as a caption.
  assert.equal(humanizeKey("df"), null);
});

test("no mixed-case symbol was swept into the acronym list", () => {
  // GCpi, Mmax, Vmax and kvar are symbols with a deliberate case, and
  // upper-casing them would be a different error from the one being fixed.
  // cplh / splh / rctf are ambiguous four-letter keys, left alone.
  for (const k of ["gcpi", "mmax", "vmax", "kvar", "cplh", "splh", "rctf"]) {
    const v = humanizeKey(k);
    assert.notEqual(v, k.toUpperCase(), `${k} was upper-cased; it is not an unambiguous acronym`);
  }
});

// A final `min` is minutes or a minimum, and only the key's `// dims:`
// annotation says which. `idler_hp_min` printed "Idler (hp/min)" and
// `water_closets_min` "Water closets (min)" -- a horsepower per minute and a
// count of minutes, where both are minimums. Every annotated `_min` key is held
// to its annotation: a time (T) reads "(min)"; anything else never does.
test("a final `min` reads as minutes only where the dims annotation says time", () => {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  // Not judged by the annotation, each for a stated reason.
  const EXEMPT = new Map([
    ["speed_ft_min", "annotated dimensionless as filler; it is a speed in ft/min and reads so"],
    ["typical_contact_min", "a text value (\"10 min\"), never captioned from the key"],
    ["free_air_l_min", "litres per minute; the single letter l is deliberately not a unit"],
  ]);
  const dims = new Map();
  for (const f of readdirSync(ROOT).filter((n) => /^calc-.*\.js$/.test(n))) {
    for (const line of readFileSync(resolve(ROOT, f), "utf8").split("\n")) {
      if (!line.includes("// dims:")) continue;
      for (const [, k, d] of line.matchAll(/(\w+_min): ([^,}]+)/g)) {
        if (!dims.has(k)) dims.set(k, new Set());
        dims.get(k).add(d.trim());
      }
    }
  }
  assert.ok(dims.size > 150, `only ${dims.size} annotated _min keys found; did the annotation format move?`);
  const bad = [];
  for (const [k, ds] of dims) {
    if (EXEMPT.has(k)) continue;
    const label = humanizeKey(k) || "";
    const time = [...ds].every((d) => d === "T");
    if (time && !/\(min\)/.test(label)) bad.push(`${k} is a time but reads "${label}"`);
    if (![...ds].some((d) => d === "T") && /\(min\)/.test(label)) bad.push(`${k} [${[...ds].join("|")}] is not a time but reads "${label}"`);
  }
  assert.deepEqual(bad, []);
  assert.equal(humanizeKey("idler_hp_min"), "Idler hp min");
  assert.equal(humanizeKey("water_closets_min"), "Water closets min");
  assert.equal(humanizeKey("drain_time_min"), "Drain time (min)");
  assert.equal(humanizeKey("rate_at_depth_cuft_min"), "Rate at depth (ft³/min)");
});
