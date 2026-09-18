// Three ACI 318-19 provisions a pinned example did not exercise, each found
// 2026-09-18 by re-deriving worked examples: the 2/3 inside Bischoff's Ie,
// the narrow-member cap on c_a1, and the edge/corner punching perimeter.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeConcreteEffectiveInertia, computeConcreteAnchorShearBreakout, computeRcPunchingShear } from "../../calc-concrete.js";

test("Ie (Eq 24.2.3.5a) meets Ig at Ma = (2/3)Mcr and never goes negative", () => {
  const base = { b_in: 12, h_in: 20, d_in: 17.5, as_in2: 3.0, fc_psi: 4000, lambda: 1.0 };
  const r = computeConcreteEffectiveInertia({ ...base, ma_kipft: 60 });
  assert.ok(Math.abs(r.ie_in4 - 4280.3) < 0.5);
  const switchAt = (2 / 3) * r.mcr_kipft;
  const just = computeConcreteEffectiveInertia({ ...base, ma_kipft: switchAt * 1.0001 });
  assert.ok(Math.abs(just.ie_in4 - r.ig_in4) / r.ig_in4 < 1e-3, `Ie jumps at the switch: ${just.ie_in4}`);
  let prev = Infinity;
  for (let ma = switchAt * 1.001; ma < 200; ma *= 1.1) {
    const ie = computeConcreteEffectiveInertia({ ...base, ma_kipft: ma }).ie_in4;
    assert.ok(ie > 0 && ie <= prev, `Ie ${ie} at Ma ${ma}`);
    prev = ie;
  }
});

test("shear breakout caps c_a1 in a narrow, thin member (17.7.2.1.2)", () => {
  const r = computeConcreteAnchorShearBreakout({ anchor_dia_in: 0.75, embedment_in: 6, fc_psi: 4000, edge_distance_in: 6, perp_edge_in: 4, member_thickness_in: 6, cracking: "cracked", lambda: 1.0 });
  assert.equal(r.ca1_used_in, 4);
  assert.ok(Math.abs(r.phi_vcb_lb - 2390.7) < 0.5);
  // The capped result equals entering c_a1 = 4 directly.
  const direct = computeConcreteAnchorShearBreakout({ anchor_dia_in: 0.75, embedment_in: 6, fc_psi: 4000, edge_distance_in: 4, perp_edge_in: 4, member_thickness_in: 6, cracking: "cracked", lambda: 1.0 });
  assert.ok(Math.abs(direct.phi_vcb_lb - r.phi_vcb_lb) < 1e-9);
  // Only one of the two narrow conditions: no cap.
  assert.equal(computeConcreteAnchorShearBreakout({ anchor_dia_in: 0.75, embedment_in: 6, fc_psi: 4000, edge_distance_in: 6, perp_edge_in: 4, member_thickness_in: 0 }).ca1_used_in, 6);
});

test("punching shear uses the three- and two-sided perimeters at edge and corner columns", () => {
  const p = (position) => computeRcPunchingShear({ c1_in: 20, c2_in: 20, d_in: 6, fc_psi: 4000, position });
  assert.equal(p("interior").bo_in, 104);
  assert.equal(p("edge").bo_in, 2 * (20 + 3) + (20 + 6));
  assert.equal(p("corner").bo_in, (20 + 3) + (20 + 3));
  assert.ok(Math.abs(p("edge").phi_vc_kip - 82.0) < 0.1);
  assert.ok(Math.abs(p("corner").phi_vc_kip - 52.4) < 0.1);
  assert.ok(p("corner").phi_vc_kip < p("edge").phi_vc_kip && p("edge").phi_vc_kip < p("interior").phi_vc_kip);
});
