// ACI 318-19 limits that apply to every equation they govern, pinned on each tile that uses one.
import { test } from "node:test";
import assert from "node:assert/strict";

test("ACI 318-19 caps: f'c in breakout and pullout (17.3.1), fy in shear friction (Table 20.2.2.4(a))", async () => {
  const c = await import("../../calc-concrete.js");
  const nb = (fc, t) => c.computeConcreteAnchorBreakout({ embedment_in: 6, fc_psi: fc, edge_distance_in: 100, anchor_type: t }).nb_lb;
  assert.strictEqual(nb(12000, "cast-in"), nb(10000, "cast-in"));
  assert.strictEqual(nb(10000, "post-installed"), nb(8000, "post-installed"));
  assert.ok(nb(9000, "cast-in") < nb(10000, "cast-in"));
  assert.strictEqual(c.computeConcreteAnchorPullout({ head_bearing_area_in2: 1, fc_psi: 12000 }).np_lb, 80000);
  const sf = (fy) => c.computeRcShearFriction({ avf_in2: 2, fy_psi: fy, ac_in2: 400, fc_psi: 5000 }).phi_vn_kip;
  assert.strictEqual(sf(100000), sf(60000));
  assert.strictEqual(sf(60000), 90);
});
