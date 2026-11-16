// A page-vs-compute sweep on 2026-11-15 set each number box past its own
// min/max and found 19 computes that answered a physically impossible entry
// the page box already bounded: a power factor or emissivity of 2, 150%
// relative humidity, 36 hours a day, a 540 deg sector, a quadrant bearing past
// 90 deg, an end-moment ratio of 2. The agent door only warns on min/max, so
// the compute must refuse. Each tile's own worked example still runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COMPUTE_MAP } from "../fixtures/compute-map.js";

const CASES = [
  ["breaker-sizing", "power_factor", 2], ["lux-to-footcandle", "cu", 2], ["lux-to-footcandle", "llf", 2],
  ["recirc-loop-sizing", "heater_efficiency", 2], ["gas-leak-hole-diameter", "c", 2],
  ["insulation-thickness", "jacket_emissivity", 2], ["pipe-insulation-for-condensation", "jacket_emissivity", -0.5],
  ["insulation-heat-loss", "jacket_emissivity", 2], ["humidifier-capacity", "target_rh_pct", 150],
  ["humidifier-capacity", "entering_rh_pct", -5], ["refractory-shell-temperature", "shell_emissivity", 2],
  ["mold", "rh_percent", 150], ["hepa-filter-life", "hours_per_day", 36], ["geometry", "sector_deg", 540],
  ["dilution", "concentrate_percent", 150], ["search-track-spacing", "target_pod", 2],
  ["cctv-storage", "motion_duty_percent", 150], ["cctv-retention-days", "motion_duty_percent", 150],
  ["azimuth-bearing-conversion", "quadrant_angle_deg", 135], ["steel-b1-amplifier", "m1_m2", 2],
  ["contact-time-baffling", "custom_baffling_factor", 2],
  // A follow-up sweep the same day set each min-0 box negative and kept the hits
  // whose answer differed from a typed 0: the negative was used, not skipped.
  ["pv-string-sizing", "inverter_mppt_max_V", -500], ["friction-loss", "flow_gpm", -10],
  ["static-pressure-piping", "friction_loss_psi", -5], ["slope", "run", -12], ["recirc-loop-sizing", "fuel_price", -1],
  ["wh-expansion-tank", "incoming_psi", -60], ["wh-expansion-tank", "relief_psi", -150], ["backflow-sizing", "min_residual_psi", -20],
  ["affinity-laws", "baseline_CFM", -1000], ["air-receiver", "pump_scfm", -10], ["air-receiver", "p_low_psi", -90],
  ["smoke-ejector-cfm", "exhaust_opening_ft2", -20], ["tip-out", "total_amount", -500], ["mileage-cost", "irs_rate_per_mile", -0.7],
  ["overtime", "overtime_multiplier", -1.5], ["cattle-stocking-rate", "herd_size", -40], ["sales-tax-compound", "rate2_pct", -2],
  ["piti", "monthly_hoa", -100], ["cap-rate-dscr", "operating_expenses_annual", -5000], ["rental-worksheet", "depreciation_annual", -9000],
  ["rent-vs-buy", "insurance_annual", -1800], ["superelevation", "f", -0.1], ["fiber-loss-budget", "max_channel_loss_db", -3],
  ["duct-static-pressure-total", "rated_esp_in_wc", -0.5], ["cutting-speed-rpm", "chip_load_in", -0.002], ["drill-point-depth", "full_depth_in", -1],
  ["bound-water", "mc_goal_pct", -5], ["dry-time-projection", "goal_mc_pct", -5], ["reducer-offset", "lay_length_in", -5],
  ["pv-circuit-ampacity", "ocpd_a", -15], ["masonry-cleaning-dilution", "acid_safe_unit", 2],
];
const ROWS = JSON.parse(readFileSync(new URL("../fixtures/worked-examples.json", import.meta.url), "utf8")).rows;

const LISTS = [
  ["static-pressure-hvac", (i) => ({ elements: [...i.elements, { name: "Registers", dp_in_wc: -0.3 }] })],
  ["timesheet", (i) => ({ ...i, jobs: i.jobs.map((j, n) => (n ? j : { ...j, lunch_min: -60 })) })],
  ["noise-dose", (i) => ({ ...i, rows: i.rows.map((r, n) => (n ? r : { ...r, hours: -2 })) })],
  ["irrigation-uniformity", (i) => ({ ...i, catch_volumes: [...i.catch_volumes.slice(1), -5] })],
];
for (const [id, mutate] of LISTS) {
  test(`${id}: a negative list entry is refused`, async () => {
    const c = COMPUTE_MAP[id];
    const fn = (await import(new URL(c.module, new URL("../fixtures/", import.meta.url)).href))[c.fn];
    const row = ROWS.find((r) => r.tile_id === id);
    assert.ok(!fn(structuredClone(row.inputs)).error, "the worked example still runs");
    assert.ok(fn(mutate(structuredClone(row.inputs))).error, "a negative entry answered instead of refusing");
  });
}
for (const [id, key, bad] of CASES) {
  test(`${id}: ${key} = ${bad} is refused`, async () => {
    const c = COMPUTE_MAP[id];
    const fn = (await import(new URL(c.module, new URL("../fixtures/", import.meta.url)).href))[c.fn];
    const row = ROWS.find((r) => r.tile_id === id);
    assert.ok(row, "worked example row");
    const ok = fn(structuredClone(row.inputs));
    assert.ok(ok && !ok.error, "the worked example still runs: " + (ok && ok.error));
    const r = fn({ ...structuredClone(row.inputs), [key]: bad });
    assert.ok(r && r.error, `${key} = ${bad} answered instead of refusing`);
  });
}
