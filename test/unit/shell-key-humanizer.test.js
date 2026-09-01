// A worked-example row prints the calculator's own caption where there is one.
// Where there is not, the machine key is read back as English instead of being
// dumped on the reader as snake_case. This claims nothing the key does not
// already say -- it spaces the words out and spells the unit -- so the whole
// risk is in the unit rules, and that is what these pin.
import test from "node:test";
import assert from "node:assert/strict";
import { humanizeKey } from "../../scripts/build-shells.mjs";

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
