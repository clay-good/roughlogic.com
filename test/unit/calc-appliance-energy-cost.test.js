// spec-v1997 appliance electricity use and cost, checked against Virginia
// Cooperative Extension 2901-9014's printed examples and its own arithmetic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeApplianceEnergyCost as f } from "../../calc-electricalanalysis.js";

test("appliance-energy-cost reproduces the Extension examples", () => {
  const fan = f({ watts: 200, hours_per_day: 4, days_per_year: 120, rate_cents_per_kwh: 8.5 });
  assert.equal(fan.kwh_per_year, 96);
  assert.ok(Math.abs(fan.cost_per_year - 8.16) < 1e-9);
  const pc = f({ watts: 120 + 150, hours_per_day: 4, rate_cents_per_kwh: 8.5 });
  assert.ok(Math.abs(pc.kwh_per_year - 394.2) < 1e-9);
  assert.equal(Math.round(pc.cost_per_year * 100) / 100, 33.51);
});

test("appliance-energy-cost: amps x volts, per day and month, and the refusals", () => {
  const h = f({ watts: 1500, hours_per_day: 8, rate_cents_per_kwh: 15 });
  assert.ok(Math.abs(h.cost_per_day - 1.8) < 1e-12 && Math.abs(h.cost_per_year - 657) < 1e-9 && Math.abs(h.cost_per_month - 54.75) < 1e-9);
  assert.equal(f({ amps: 12.5, hours_per_day: 8, rate_cents_per_kwh: 15 }).watts, 1500);
  assert.equal(f({ amps: 25, volts: 240, hours_per_day: 1, rate_cents_per_kwh: 15 }).watts, 6000);
  // A null from the agent door takes the default.
  assert.equal(f({ watts: 100, hours_per_day: 10, days_per_year: null, volts: null, rate_cents_per_kwh: 10 }).kwh_per_year, 365);
  const ok = { watts: 100, hours_per_day: 1, rate_cents_per_kwh: 15 };
  for (const bad of [{ watts: null }, { amps: 1 }, { watts: 0 }, { hours_per_day: 25 }, { hours_per_day: null },
    { rate_cents_per_kwh: 0.15 }, { rate_cents_per_kwh: null }, { days_per_year: 400 },
    { watts: null, amps: 10, volts: 0 }]) {
    assert.ok("error" in f({ ...ok, ...bad }), JSON.stringify(bad));
  }
  assert.ok(!("error" in f(ok)));
});
