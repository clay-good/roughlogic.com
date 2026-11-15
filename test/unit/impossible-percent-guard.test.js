// A rendered-page sweep on 2026-11-15 (inputs scaled x0..x10) found two
// percentages no input can make true: a pruning dose of "1,500.0%" (more
// foliage removed than the crown had) and a combustion efficiency of "-10.4%"
// (a Siegert stack loss past 100% at a 4,000 F stack). Both now refuse.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCrownPruningDose } from "../../calc-arborist.js";
import { computeFlueGasCombustionEff } from "../../calc-hvacservice.js";

test("crown pruning: removing more foliage than the crown has is an error, all of it is not", () => {
  assert.match(computeCrownPruningDose({ live_foliage: 1, removed_foliage: 15 }).error, /cannot exceed/);
  const all = computeCrownPruningDose({ live_foliage: 15, removed_foliage: 15 });
  assert.equal(all.removal_pct, 100);
  assert.equal(all.within, false);
});

test("flue gas: a stack loss of 100% or more refuses instead of printing a negative efficiency", () => {
  assert.match(computeFlueGasCombustionEff({ fuel: "natural_gas", flue_o2_pct: 5, stack_temp_f: 4000, air_temp_f: 70 }).error, /stack loss works out to \d+%/);
  const ok = computeFlueGasCombustionEff({ fuel: "natural_gas", flue_o2_pct: 5, stack_temp_f: 400, air_temp_f: 70 });
  assert.ok(ok.eff_net_pct > 70 && ok.eff_net_pct < 100);
});
