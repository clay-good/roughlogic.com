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

test("ACI 318-19 Table 20.2.2.4(a): stirrup fyt is capped at 60 ksi for bars and 80 ksi for welded deformed wire", async () => {
  const c = await import("../../calc-concrete.js");
  const beam = { fc: 4000, bw: 12, d: 21.5, av_in2: 0.22, vu: 40 };
  const s = (fyt, stirrup_type) => c.computeRcBeamShear({ ...beam, fyt, stirrup_type }).s_req_in;
  assert.strictEqual(s(80000, "bar"), s(60000, "bar"));
  assert.ok(s(80000, "wwr") > s(60000, "bar"));
  assert.strictEqual(s(100000, "wwr"), s(80000, "wwr"));
  assert.ok(c.computeRcBeamShear({ ...beam, fyt: 60000, stirrup_type: "rod" }).error);
  const m = (fyt_psi, stirrup_type) => c.computeRcMinShearReinforcement({ fc_psi: 4000, fyt_psi, bw_in: 12, d_in: 21.5, av_in2: 0.22, vu_kip: 40, stirrup_type }).av_min_per_s;
  assert.strictEqual(m(100000, "bar"), m(60000, "bar"));
});
