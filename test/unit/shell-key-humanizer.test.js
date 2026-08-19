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
