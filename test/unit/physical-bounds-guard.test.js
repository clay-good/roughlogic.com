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
];
const ROWS = JSON.parse(readFileSync(new URL("../fixtures/worked-examples.json", import.meta.url), "utf8")).rows;

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
