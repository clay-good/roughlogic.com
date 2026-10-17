// The IBC Chapter 10 egress tiles were checked against the 2027 IBC printing on
// 2026-10-17. Most limits are unchanged; these are the two behaviors that moved.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeEgressCapacity } from "../../calc-construction.js";
import { computeEgressLightingCheck } from "../../calc-elecdesign.js";

// IBC 2027 1006.3.3 item 4 (item 3 in 2021) lets Group R-3 and R-4 have one exit
// at any occupant load. The tile had filed R-4 under the 10-occupant row, so a
// 20-occupant R-4 story was told it needed two exits.
test("R-3 / R-4 stories need one exit at any occupant load", () => {
  const r = computeEgressCapacity({ occupant_load: 40, occupancy_group: "R3-R4", story: "first" });
  assert.equal(r.exits_required, 1);
  const r1 = computeEgressCapacity({ occupant_load: 40, occupancy_group: "I1-I3-I4-R1-R4", story: "first" });
  assert.equal(r1.exits_required, 2);
  // The Table 1006.3.2 counts above 500 still apply to everyone else.
  assert.equal(computeEgressCapacity({ occupant_load: 600, occupancy_group: "A-B-E-F-M-U" }).exits_required, 3);
});

// IBC 1008.2.1 asks for 10 fc (an average, in 2027) on an interior exit stairway
// in use; the tile had checked only the 1 fc walking-surface floor.
test("stairway mode holds the average to 10 fc and keeps the 1 fc floor", () => {
  assert.equal(computeEgressLightingCheck({ avg_fc: 12, min_fc: 2, max_fc: 20, mode: "stairway" }).pass, true);
  assert.equal(computeEgressLightingCheck({ avg_fc: 8, min_fc: 2, max_fc: 20, mode: "stairway" }).pass, false);
  assert.equal(computeEgressLightingCheck({ avg_fc: 12, min_fc: 0.5, max_fc: 20, mode: "stairway" }).pass, false);
  // The same readings pass the general 1 fc rule, so the mode is what changed the answer.
  assert.equal(computeEgressLightingCheck({ avg_fc: 8, min_fc: 2, max_fc: 20, mode: "normal" }).pass, true);
});
