// A select that changes nothing on the page: on 2026-11-15 a sweep that tried
// every option of every select found standpipe-pdp's Class II answering with
// the Class I 100 psi / 250 gpm the page's example had filled in. NFPA 14 7.8
// sets Class II at 65 psi and 100 gpm. The entered pair still governs (a
// higher figure is the user's call); the page now says when it is not the
// selected class's figure, and when it is below it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStandpipePDP } from "../../calc-fire.js";

test("standpipe: an entered pair that is not the class's NFPA 14 figure is named", () => {
  const ii = computeStandpipePDP({ standpipe_class: "II", highest_outlet_elevation_ft: 110, nozzle_pressure_psi: 100, design_gpm: 250 });
  assert.ok(ii.warnings.some((w) => /Class II at 65 psi and 100 gpm/.test(w) && !/BELOW/.test(w)));
  const low = computeStandpipePDP({ standpipe_class: "I", highest_outlet_elevation_ft: 110, nozzle_pressure_psi: 65, design_gpm: 250 });
  assert.ok(low.warnings.some((w) => /BELOW that minimum/.test(w)));
  for (const cls of ["I", "II", "III"]) {
    const blank = computeStandpipePDP({ standpipe_class: cls, highest_outlet_elevation_ft: 110 });
    assert.equal(blank.warnings.filter((w) => /NFPA 14 7\.8 sets/.test(w)).length, 0, cls + " with blank fields uses its own figures");
  }
});
