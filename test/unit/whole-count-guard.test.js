// A count of things is whole. On 2026-11-15 a sweep that typed each count
// field's example value plus 0.5 found 96 tiles that answered anyway: a
// 43.5-tooth gear, 4.5 speaker drivers, 2.5 conductors in a conduit (which
// picked neither the 31% nor the 40% fill column), 10.5 pairs in a t-test.
// These are the discrete ones; occupancy, bushels, recipe quantities and the
// drywall "sheets per 1,000 sq ft" table stay fractional on purpose. Each must
// now refuse a half, and still run at its whole worked example.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COMPUTE_MAP } from "../fixtures/compute-map.js";

const ROWS = JSON.parse(readFileSync(new URL("../fixtures/worked-examples.json", import.meta.url), "utf8")).rows;
const COUNTS = [
  ["service-load", "small_appliance_circuits"],
  ["branch-circuit-wire-footage", "circuits"],
  ["service-load-optional", "small_appliance_circuits"],
  ["recirc-pump-head", "fittings_count"],
  ["pipe-insulation-takeoff", "num_fittings"],
  ["septic-lpp-orifice", "num_laterals"],
  ["raised-floor-tile-airflow", "increased_tile_count"],
  ["board-footage", "count"],
  ["mortar-mix", "unit_count"],
  ["reverse-lay-friction", "n_pumps"],
  ["tanker-shuttle-flow", "tanker_count"],
  ["deck-point-load-dunnage", "feet_count"],
  ["mooring-load-wind-current", "line_count"],
  ["livestock-water-requirement", "head"],
  ["line-array-splay", "cabinets"],
  ["stage-deck-live-load", "legs"],
  ["bakers-percentage", "pieces"],
  ["pcr-master-mix", "number_of_reactions"],
  ["paired-t-test", "n_pairs"],
  ["cctv-retention-days", "camera_count"],
  ["speaker-70v-line", "tap_count"],
  ["lv-cable-pull-footage", "drops"],
  ["worm-gear-geometry", "wheel_teeth"],
  ["gear-identification", "teeth"],
  ["rack-and-pinion", "pinion_teeth"],
  ["flange-coupling-torque", "bolt_count"],
  ["concrete-stair-volume", "num_risers"],
  ["slab-dowel-schedule", "num_joints"],
  ["leach-field-aggregate", "num_trenches"],
  ["pv-ballast-weight", "modules"],
  ["menu-engineering", "item_count"],
  ["ev-load-management-ems", "charger_count"],
  ["compressor-displacement", "cylinders"],
  ["gear-tooth-bending-stress", "number_of_teeth"],
  ["gear-contact-stress", "pinion_teeth"],
  ["gear-contact-stress", "gear_teeth"],
  ["planetary-gear-ratio", "sun_teeth"],
  ["planetary-gear-ratio", "ring_teeth"],
  ["scaffold-leg-load", "num_workers"],
  ["scaffold-leg-load", "n_legs"],
  ["bolt-group-eccentric", "ncols"],
  ["bolt-group-eccentric", "nrows"],
  ["mold-cleaning-labor", "crew_size"],
  ["dryer-demand-220-54", "num_dryers"],
  ["lighting-retrofit-savings", "fixtures"],
  ["battery-hydrogen-vent", "cell_count"],
  ["battery-vent-max-current", "cell_count"],
  ["garage-door-torsion-spring", "springs"],
  ["gas-strut-force", "struts"],
  ["traction-roping-ratio", "rope_count"],
  ["rope-safety-factor", "rope_count"],
  ["step-chain-tension", "chain_count"],
  ["electric-lock-power-budget", "device_count"],
  ["master-key-bitting-capacity", "cut_positions"],
  ["master-key-bitting-capacity", "alternative_mastered_positions"],
  ["revolving-door-throughput", "wings"],
  ["dust-collector-air-to-cloth", "bag_count"],
  ["highwall-bench-geometry", "bench_count"],
  ["hoist-rope-safety-factor", "rope_count"],
  ["lead-dust-clearance", "rooms"],
  ["vibration-forcing-frequencies", "gear_tooth_count"],
  ["mstp-segment-loading", "alt_device_count"],
  ["speaker-impedance", "count"],
  ["gear-dynamic-tooth-stress", "number_of_teeth"],
  ["air-compressor-cfm-sizing", "tool1_qty"],
  ["service-load-standard", "small_appliance_circuits"],
  ["air-compressor-cfm-sizing", "tool2_qty"],
];

test("whole counts: every listed count field refuses a fraction", async () => {
  const misses = [];
  for (const [id, key] of COUNTS) {
    const reg = COMPUTE_MAP[id];
    const fn = (await import(new URL(reg.module, new URL("../fixtures/", import.meta.url)).href))[reg.fn];
    const row = ROWS.find((r) => r.tile_id === id && Number.isInteger(r.inputs?.[key]) && r.inputs[key] > 0) ?? ROWS.find((r) => r.tile_id === id);
    const inputs = { ...row.inputs, [key]: (Number.isInteger(row.inputs?.[key]) && row.inputs[key] > 0 ? row.inputs[key] : 2) + 0.5 };
    const r = fn(inputs);
    if (!/whole number/.test(r?.error ?? "")) misses.push(`${id}.${key}: ${r?.error ?? "answered"}`);
  }
  assert.deepEqual(misses, []);
});
