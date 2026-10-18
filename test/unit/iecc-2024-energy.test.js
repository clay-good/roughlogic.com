// The IECC tiles were read against the 2021 and 2024 printings on 2026-10-17.
// Duct leakage is the one whose RULE changed shape: IECC 2024 Table R403.3.8
// keys the limit to the number of ducted returns and caps a small system at a
// total CFM25. (Lighting density is pinned in calc-electrical-v2.test.js.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDuctLeakageCfm25 } from "../../calc-hvacservice.js";

test("duct leakage: IECC 2024 Table R403.3.8 limits by configuration and ducted returns", () => {
  const at = (configuration, ducted_returns) => computeDuctLeakageCfm25({ leakage_cfm25: 100, cfa_ft2: 2000, configuration, ducted_returns }).limit;
  assert.deepEqual(["rough-in", "installed", "rough-in-inside", "installed-inside"].map((c) => at(c, "fewer-than-3")), [3, 4, 6, 8]);
  assert.deepEqual(["rough-in", "installed", "rough-in-inside", "installed-inside"].map((c) => at(c, "3-or-more")), [4, 6, 8, 12]);
  // 5 per 100 ft^2 fails with two returns and passes with three.
  assert.equal(computeDuctLeakageCfm25({ leakage_cfm25: 100, cfa_ft2: 2000, configuration: "installed" }).passes, false);
  assert.equal(computeDuctLeakageCfm25({ leakage_cfm25: 100, cfa_ft2: 2000, configuration: "installed", ducted_returns: "3-or-more" }).passes, true);
});

test("duct leakage: a system serving 1,000 ft^2 or less is held to a total CFM25", () => {
  const r = computeDuctLeakageCfm25({ leakage_cfm25: 38, cfa_ft2: 800, configuration: "installed" });
  assert.equal(r.limit_cfm, 40);
  assert.equal(r.passes, true); // 4.75 per 100 ft^2 would fail the per-area rule
  assert.equal(computeDuctLeakageCfm25({ leakage_cfm25: 41, cfa_ft2: 800, configuration: "installed" }).passes, false);
  assert.equal(computeDuctLeakageCfm25({ leakage_cfm25: 41, cfa_ft2: 1001, configuration: "installed" }).limit_cfm, null);
});

test("duct leakage: IECC 2021 keeps 3 / 4 / 8, and a typed limit with no configuration is honored as before", () => {
  assert.equal(computeDuctLeakageCfm25({ leakage_cfm25: 100, cfa_ft2: 2000, configuration: "rough-in", code_edition: "2021" }).limit, 3);
  assert.equal(computeDuctLeakageCfm25({ leakage_cfm25: 100, cfa_ft2: 2000, configuration: "installed-inside", code_edition: "2021", ducted_returns: "3-or-more" }).limit, 8);
  const custom = computeDuctLeakageCfm25({ leakage_cfm25: 64.2, cfa_ft2: 800, limit: 3 });
  assert.equal(custom.configuration, "custom");
  assert.equal(custom.limit_cfm, null);
  assert.ok(computeDuctLeakageCfm25({ leakage_cfm25: 1, cfa_ft2: 2000, configuration: "installed", code_edition: "2018" }).error);
});
