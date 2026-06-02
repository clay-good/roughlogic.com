// spec-v15 unit tests for the Group G (Cross-Trade Utilities) tiles landed in
// the v15 expansion:
//   G.1 Pump total dynamic head (Hazen-Williams + static head)
//   G.3 Hydraulic cylinder force and speed (NFPA T2.13.7)
//   G.4 V-belt sheave and drive sizing (ANSI/RMA IP-20 / IP-22)
//   G.8 Gear ratio and RPM cascade (first-principles / AGMA)
//
// All pure arithmetic. The assertions pin the published-formula constants so a
// future edit that changed a constant or swapped an operator fails loudly.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePumpTdh, pumpTdhExample,
  computeHydraulicCylinder, hydraulicCylinderExample,
  computeVbeltDrive, vbeltDriveExample,
  computeGearCascade, gearCascadeExample,
} from "../../calc-cross.js";

// ---------------------------------------------------------------------------
// G.1 Pump total dynamic head
// ---------------------------------------------------------------------------

test("tdh: worked example (100 GPM, 4.026 in, C=150, 10 ft lift, 50 ft head) ~ 60.6 ft", () => {
  const r = computePumpTdh(pumpTdhExample.inputs);
  assert.strictEqual(r.static_head_ft, 60);
  assert.ok(Math.abs(r.tdh_ft - 60.604257666) < 1e-3);
  assert.ok(r.discharge_friction_ft > r.suction_friction_ft); // longer run, more loss
});

test("tdh: TDH is static head plus the three friction components", () => {
  const r = computePumpTdh({ flow_gpm: 80, internal_diameter_in: 3, hw_c: 130, static_suction_lift_ft: 8, static_discharge_head_ft: 40, suction_length_ft: 15, discharge_length_ft: 150, fittings_equiv_length_ft: 25 });
  const sum = r.static_head_ft + r.suction_friction_ft + r.discharge_friction_ft + r.fittings_friction_ft;
  assert.ok(Math.abs(r.tdh_ft - sum) < 1e-9);
});

test("tdh: a flooded (negative) suction lift lowers static head below the discharge head", () => {
  const r = computePumpTdh({ flow_gpm: 100, internal_diameter_in: 4, hw_c: 150, static_suction_lift_ft: -6, static_discharge_head_ft: 50 });
  assert.strictEqual(r.static_head_ft, 44);
});

test("tdh: velocity follows v = 0.4085 * GPM / d^2", () => {
  const r = computePumpTdh({ flow_gpm: 150, internal_diameter_in: 4, hw_c: 150, static_discharge_head_ft: 10 });
  assert.ok(Math.abs(r.velocity_fps - 0.4085 * 150 / 16) < 1e-9);
});

test("tdh: friction grows with length (more discharge pipe, more loss)", () => {
  const shortRun = computePumpTdh({ flow_gpm: 100, internal_diameter_in: 4, hw_c: 150, static_discharge_head_ft: 0, discharge_length_ft: 100 });
  const longRun = computePumpTdh({ flow_gpm: 100, internal_diameter_in: 4, hw_c: 150, static_discharge_head_ft: 0, discharge_length_ft: 300 });
  assert.ok(longRun.discharge_friction_ft > shortRun.discharge_friction_ft);
});

test("tdh: a high suction lift triggers the cavitation warning", () => {
  const r = computePumpTdh({ flow_gpm: 100, internal_diameter_in: 4, hw_c: 150, static_suction_lift_ft: 30, static_discharge_head_ft: 20 });
  assert.ok(r.warnings.some((w) => w.toLowerCase().includes("cavitation")));
});

test("tdh: a smaller pipe raises velocity and the high-velocity warning fires", () => {
  const r = computePumpTdh({ flow_gpm: 200, internal_diameter_in: 2, hw_c: 150, static_discharge_head_ft: 20 });
  assert.ok(r.velocity_fps > 10);
  assert.ok(r.warnings.some((w) => w.includes("velocity")));
});

test("tdh: the operating point carries the duty flow and computed TDH", () => {
  const r = computePumpTdh({ flow_gpm: 120, internal_diameter_in: 4, hw_c: 150, static_discharge_head_ft: 30 });
  assert.strictEqual(r.operating_point.gpm, 120);
  assert.strictEqual(r.operating_point.tdh_ft, r.tdh_ft);
});

test("tdh: rejection paths (zero flow, zero diameter, zero C, negative length)", () => {
  assert.ok("error" in computePumpTdh({ flow_gpm: 0, internal_diameter_in: 4, hw_c: 150 }));
  assert.ok("error" in computePumpTdh({ flow_gpm: 100, internal_diameter_in: 0, hw_c: 150 }));
  assert.ok("error" in computePumpTdh({ flow_gpm: 100, internal_diameter_in: 4, hw_c: 0 }));
  assert.ok("error" in computePumpTdh({ flow_gpm: 100, internal_diameter_in: 4, hw_c: 150, discharge_length_ft: -10 }));
});

test("tdh: zero pipe and fittings lengths give pure static head", () => {
  const r = computePumpTdh({ flow_gpm: 100, internal_diameter_in: 4, hw_c: 150, static_suction_lift_ft: 5, static_discharge_head_ft: 45 });
  assert.strictEqual(r.tdh_ft, 50);
});

// ---------------------------------------------------------------------------
// G.3 Hydraulic cylinder force and speed
// ---------------------------------------------------------------------------

test("cylinder: worked example (4 in bore, 2 in rod, 2000 psi, 10 GPM, extend, 12 in)", () => {
  const r = computeHydraulicCylinder(hydraulicCylinderExample.inputs);
  assert.ok(Math.abs(r.effective_area_in2 - Math.PI * 4) < 1e-9);
  assert.ok(Math.abs(r.force_lb - 2000 * Math.PI * 4) < 1e-6);
  assert.ok(Math.abs(r.speed_in_per_s - (10 * 231) / (60 * Math.PI * 4)) < 1e-9);
  assert.ok(Math.abs(r.oil_per_stroke_gal - (Math.PI * 4 * 12) / 231) < 1e-9);
});

test("cylinder: force = pressure times effective area", () => {
  for (const [bore, p] of [[2, 1500], [3, 3000], [5, 1000]]) {
    const r = computeHydraulicCylinder({ bore_in: bore, rod_in: 1, pressure_psi: p, direction: "extend" });
    assert.ok(Math.abs(r.force_lb - p * Math.PI * (bore / 2) ** 2) < 1e-6);
  }
});

test("cylinder: retract area is the bore annulus (bore minus rod)", () => {
  const r = computeHydraulicCylinder({ bore_in: 4, rod_in: 2, pressure_psi: 2000, direction: "retract" });
  assert.ok(Math.abs(r.effective_area_in2 - (Math.PI * 4 - Math.PI * 1)) < 1e-9);
});

test("cylinder: retract is faster and weaker than extend at the same flow/pressure", () => {
  const ext = computeHydraulicCylinder({ bore_in: 4, rod_in: 2, pressure_psi: 2000, flow_gpm: 10, direction: "extend" });
  const ret = computeHydraulicCylinder({ bore_in: 4, rod_in: 2, pressure_psi: 2000, flow_gpm: 10, direction: "retract" });
  assert.ok(ret.force_lb < ext.force_lb);
  assert.ok(ret.speed_in_per_s > ext.speed_in_per_s);
});

test("cylinder: speed = (GPM * 231) / (60 * area)", () => {
  const r = computeHydraulicCylinder({ bore_in: 3, rod_in: 1, pressure_psi: 2000, flow_gpm: 6, direction: "extend" });
  assert.ok(Math.abs(r.speed_in_per_s - (6 * 231) / (60 * Math.PI * 2.25)) < 1e-9);
});

test("cylinder: omitting flow/stroke returns null speed/oil/cycle (force still computed)", () => {
  const r = computeHydraulicCylinder({ bore_in: 4, rod_in: 2, pressure_psi: 2000, direction: "extend" });
  assert.strictEqual(r.speed_in_per_s, null);
  assert.strictEqual(r.oil_per_stroke_gal, null);
  assert.strictEqual(r.cycle_time_s, null);
  assert.ok(r.force_lb > 0);
});

test("cylinder: pressure above 5000 psi and bore below 0.5 in are flagged", () => {
  assert.ok(computeHydraulicCylinder({ bore_in: 4, pressure_psi: 6000 }).warnings.some((w) => w.includes("5000")));
  assert.ok(computeHydraulicCylinder({ bore_in: 0.25, pressure_psi: 2000 }).warnings.some((w) => w.toLowerCase().includes("miniature")));
});

test("cylinder: cycle time = stroke / speed", () => {
  const r = computeHydraulicCylinder({ bore_in: 4, rod_in: 2, pressure_psi: 2000, flow_gpm: 10, direction: "extend", stroke_in: 12 });
  assert.ok(Math.abs(r.cycle_time_s - 12 / r.speed_in_per_s) < 1e-9);
});

test("cylinder: rejection paths (zero bore, rod >= bore, zero pressure, bad direction)", () => {
  assert.ok("error" in computeHydraulicCylinder({ bore_in: 0, pressure_psi: 2000 }));
  assert.ok("error" in computeHydraulicCylinder({ bore_in: 4, rod_in: 4, pressure_psi: 2000 }));
  assert.ok("error" in computeHydraulicCylinder({ bore_in: 4, rod_in: 5, pressure_psi: 2000 }));
  assert.ok("error" in computeHydraulicCylinder({ bore_in: 4, pressure_psi: 0 }));
  assert.ok("error" in computeHydraulicCylinder({ bore_in: 4, pressure_psi: 2000, direction: "sideways" }));
});

// ---------------------------------------------------------------------------
// G.4 V-belt sheave and drive sizing
// ---------------------------------------------------------------------------

test("vbelt: worked example (1750/875 rpm, 10 HP, 4 in driver, 20 in center, B, 1.2 SF)", () => {
  const r = computeVbeltDrive(vbeltDriveExample.inputs);
  assert.strictEqual(r.ratio, 2);
  assert.strictEqual(r.driven_pitch_diameter_in, 8);
  const expectedL = 2 * 20 + (Math.PI / 2) * (4 + 8) + ((8 - 4) ** 2) / (4 * 20);
  assert.ok(Math.abs(r.belt_length_in - expectedL) < 1e-9);
  assert.strictEqual(r.design_hp, 12);
  assert.strictEqual(r.belts, 2);
});

test("vbelt: ratio = driver_rpm / driven_rpm and driven dia = driver dia * ratio", () => {
  const r = computeVbeltDrive({ driver_rpm: 3450, driven_rpm: 1150, driver_hp: 5, driver_pitch_diameter_in: 3, center_distance_in: 18, belt_section: "A", service_factor: 1.0 });
  assert.ok(Math.abs(r.ratio - 3) < 1e-9);
  assert.ok(Math.abs(r.driven_pitch_diameter_in - 9) < 1e-9);
});

test("vbelt: belt length follows the standard two-sheave formula", () => {
  const C = 24, d1 = 5, ratio = 1.5, d2 = d1 * ratio;
  const r = computeVbeltDrive({ driver_rpm: 1500, driven_rpm: 1000, driver_hp: 7, driver_pitch_diameter_in: d1, center_distance_in: C, belt_section: "C", service_factor: 1.0 });
  const expectedL = 2 * C + (Math.PI / 2) * (d1 + d2) + ((d2 - d1) ** 2) / (4 * C);
  assert.ok(Math.abs(r.belt_length_in - expectedL) < 1e-9);
});

test("vbelt: design HP = nameplate HP * service factor", () => {
  const r = computeVbeltDrive({ driver_rpm: 1750, driven_rpm: 875, driver_hp: 20, driver_pitch_diameter_in: 5, center_distance_in: 25, belt_section: "C", service_factor: 1.4 });
  assert.ok(Math.abs(r.design_hp - 28) < 1e-9);
});

test("vbelt: belt count rounds up to cover the design HP", () => {
  // 28 design HP at ~15 HP/belt (C) -> ceil(28/15) = 2.
  const r = computeVbeltDrive({ driver_rpm: 1750, driven_rpm: 875, driver_hp: 20, driver_pitch_diameter_in: 5, center_distance_in: 25, belt_section: "C", service_factor: 1.4 });
  assert.strictEqual(r.belts, 2);
});

test("vbelt: a ratio above 7:1 is flagged", () => {
  const r = computeVbeltDrive({ driver_rpm: 3600, driven_rpm: 400, driver_hp: 5, driver_pitch_diameter_in: 3, center_distance_in: 40, belt_section: "B", service_factor: 1.0 });
  assert.ok(r.warnings.some((w) => w.includes("7:1")));
});

test("vbelt: every belt section resolves to a positive HP-per-belt default", () => {
  for (const sec of ["A", "B", "C", "D", "3V", "5V", "8V"]) {
    const r = computeVbeltDrive({ driver_rpm: 1750, driven_rpm: 875, driver_hp: 5, driver_pitch_diameter_in: 4, center_distance_in: 20, belt_section: sec, service_factor: 1.0 });
    assert.ok(r.hp_per_belt > 0 && r.belts >= 1);
  }
});

test("vbelt: rejection paths (zero RPM, zero HP, zero driver dia, bad section, zero center)", () => {
  assert.ok("error" in computeVbeltDrive({ driver_rpm: 0, driven_rpm: 875, driver_hp: 10, driver_pitch_diameter_in: 4, center_distance_in: 20 }));
  assert.ok("error" in computeVbeltDrive({ driver_rpm: 1750, driven_rpm: 875, driver_hp: 0, driver_pitch_diameter_in: 4, center_distance_in: 20 }));
  assert.ok("error" in computeVbeltDrive({ driver_rpm: 1750, driven_rpm: 875, driver_hp: 10, driver_pitch_diameter_in: 0, center_distance_in: 20 }));
  assert.ok("error" in computeVbeltDrive({ driver_rpm: 1750, driven_rpm: 875, driver_hp: 10, driver_pitch_diameter_in: 4, center_distance_in: 0 }));
  assert.ok("error" in computeVbeltDrive({ driver_rpm: 1750, driven_rpm: 875, driver_hp: 10, driver_pitch_diameter_in: 4, center_distance_in: 20, belt_section: "Z" }));
});

// ---------------------------------------------------------------------------
// G.8 Gear ratio and RPM cascade
// ---------------------------------------------------------------------------

test("gear: worked example (two 3:1 stages -> 9:1, 1800 rpm -> 200, 100 lb-in -> 846.81)", () => {
  const r = computeGearCascade(gearCascadeExample.inputs);
  assert.strictEqual(r.overall_ratio, 9);
  assert.strictEqual(r.output_rpm, 200);
  assert.ok(Math.abs(r.output_torque - 100 * 9 * Math.pow(0.97, 2)) < 1e-9);
  assert.deepStrictEqual(r.stage_ratios, [3, 3]);
});

test("gear: overall ratio is the product of per-stage ratios", () => {
  const r = computeGearCascade({ stages: [{ n_in: 10, n_out: 20 }, { n_in: 12, n_out: 36 }, { n_in: 15, n_out: 30 }] });
  // 2 * 3 * 2 = 12.
  assert.strictEqual(r.overall_ratio, 12);
  assert.strictEqual(r.stages_used, 3);
});

test("gear: output RPM = input RPM / overall ratio", () => {
  const r = computeGearCascade({ stages: [{ n_in: 10, n_out: 50 }], input_rpm: 1000 });
  assert.strictEqual(r.overall_ratio, 5);
  assert.strictEqual(r.output_rpm, 200);
});

test("gear: output torque applies efficiency once per stage", () => {
  const r = computeGearCascade({ stages: [{ n_in: 10, n_out: 30 }, { n_in: 10, n_out: 20 }], input_torque: 50, efficiency: 0.95 });
  // overall 6:1, 2 stages: 50 * 6 * 0.95^2.
  assert.ok(Math.abs(r.output_torque - 50 * 6 * Math.pow(0.95, 2)) < 1e-9);
});

test("gear: blank/incomplete stages are ignored", () => {
  const r = computeGearCascade({ stages: [{ n_in: 10, n_out: 40 }, { n_in: 0, n_out: 0 }, { n_in: 0, n_out: 0 }], input_rpm: 1000 });
  assert.strictEqual(r.stages_used, 1);
  assert.strictEqual(r.overall_ratio, 4);
});

test("gear: omitting RPM and torque returns null outputs but a valid ratio", () => {
  const r = computeGearCascade({ stages: [{ n_in: 12, n_out: 36 }] });
  assert.strictEqual(r.overall_ratio, 3);
  assert.strictEqual(r.output_rpm, null);
  assert.strictEqual(r.output_torque, null);
});

test("gear: a tooth count below 8 is flagged for undercut", () => {
  const r = computeGearCascade({ stages: [{ n_in: 6, n_out: 30 }] });
  assert.ok(r.warnings.some((w) => w.toLowerCase().includes("undercut")));
});

test("gear: rejection paths (no stages, incomplete stage, efficiency out of range)", () => {
  assert.ok("error" in computeGearCascade({ stages: [] }));
  assert.ok("error" in computeGearCascade({ stages: [{ n_in: 12, n_out: 0 }] }));
  assert.ok("error" in computeGearCascade({ stages: [{ n_in: 0, n_out: 36 }] }));
  assert.ok("error" in computeGearCascade({ stages: [{ n_in: 12, n_out: 36 }], efficiency: 0 }));
  assert.ok("error" in computeGearCascade({ stages: [{ n_in: 12, n_out: 36 }], efficiency: 1.2 }));
});
