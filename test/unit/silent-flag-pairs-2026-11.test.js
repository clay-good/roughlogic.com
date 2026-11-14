// 2026-11-14: render-silent-flag-sweep.js --pairs (two controls changed, the
// second compared against the first-step state) found six tiles whose code
// computed a verdict the page then did not say. Each is held here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { computeSpaDrainInterval } from "../../calc-pool.js";
import { computeTrackSuperelevation, RAIL_RENDERERS } from "../../calc-rail.js";
import { computeSeparatorRetentionSizing, OILGAS_RENDERERS } from "../../calc-oilgas.js";
import { computeBufferStroke } from "../../calc-elevator.js";
import { computeBackflowTestPSI } from "../../calc-water.js";

const line = (registry, id, key, r) => registry[id].schema.outputs.find((o) => o.key === key).format(r);

test("spa drain: a current TDS over the limit is said even with the fill reading blank", () => {
  const r = computeSpaDrainInterval({ spa_gallons: 400, daily_bathers: 6, current_tds_ppm: 4400 });
  assert.equal(r.over_tds, true);
  assert.match(r.tds_verdict, /OVER the 1,500 ppm limit/);
  assert.match(computeSpaDrainInterval({ spa_gallons: 400, daily_bathers: 6, current_tds_ppm: 900 }).tds_verdict, /within the 1,500 ppm limit/);
  assert.match(computeSpaDrainInterval({ spa_gallons: 400, daily_bathers: 6 }).tds_verdict, /no current TDS entered/);
});

test("track superelevation: a target needing more than the cap says so while the unbalance is also over", () => {
  const r = computeTrackSuperelevation({ degree_of_curve: 16, speed_mph: 50, actual_elevation_in: 4, allowable_unbalance_in: 3, max_elevation_in: 6, target_speed_mph: 57 });
  assert.equal(r.over_unbalance, true);
  assert.equal(r.required_over_cap, true);
  assert.match(line(RAIL_RENDERERS, "track-superelevation", "t", r), /MORE than the entered elevation cap/);
});

test("separator: a liquid side short of its retention says SHORT on both lines that report it", () => {
  const r = computeSeparatorRetentionSizing({ vessel_diameter_ft: 4, seam_to_seam_ft: 3, liquid_fraction: 0.125, liquid_rate_bpd: 1200, required_retention_min: 3, gas_rate_mmscfd: 3.5, pressure_psig: 400, temperature_f: 100, z_factor: 0.92, gas_gravity: 0.65, liquid_density_lb_ft3: 50, k_factor: 0.35 });
  assert.equal(r.liquid_ok, false, JSON.stringify(r).slice(0, 300));
  assert.match(r.liquidVerdict, /SHORT of the required retention/);
  assert.match(line(OILGAS_RENDERERS, "separator-retention-sizing", "actual_retention_min", r), /SHORT of the requirement/);
});

test("buffer: a buffer over its rated speed AND short of stroke names both", () => {
  const r = computeBufferStroke({ contract_speed_fpm: 500, governor_trip_fpm: 575, permitted_retardation_g: 0.25, buffer_rated_stroke_in: 21, buffer_rated_speed_fpm: 150 });
  assert.equal(r.speed_ok, false);
  assert.equal(r.stroke_ok, false);
  assert.match(r.verdict, /OVER the buffer's rated striking speed, and SHORT of the stroke/);
});

test("backflow: an RP failure names the part that failed", () => {
  assert.equal(computeBackflowTestPSI({ check1_psid: 8, relief_open_psid: 4, check2_psi: 0 }).failed, "#2 check under 1 psid");
  assert.equal(computeBackflowTestPSI({ check1_psid: 8, relief_open_psid: 1, check2_psi: 3 }).failed, "relief opens under 2 psid");
  assert.equal(computeBackflowTestPSI({ check1_psid: 6, relief_open_psid: 6, check2_psi: 3 }).failed, "#1 check not above the relief opening point");
  assert.equal(computeBackflowTestPSI({ check1_psid: 8, relief_open_psid: 4, check2_psi: 3 }).failed, "");
});

// Bespoke renderer: driven against the fake DOM in a child so its globals stay out of the runner.
test("economizer: a lockout prints the margin without a minus before 'over' and names the limit", () => {
  const src = `
    import { installDocument, installTimers, flushTimers } from ${JSON.stringify(new URL("../fixtures/fake-dom.js", import.meta.url).href)};
    installTimers(); const doc = installDocument();
    const { HVAC_RENDERERS } = await import(${JSON.stringify(new URL("../../calc-hvac.js", import.meta.url).href)});
    const i = doc.createElement("div"), o = doc.createElement("div"), c = doc.createElement("p");
    doc.body.append(i, o, c);
    await HVAC_RENDERERS["economizer-enthalpy-changeover"](i, o, c); flushTimers();
    const set = (id, v) => { const el = [...i.querySelectorAll("input"), ...i.querySelectorAll("select")].find((e) => e.id === id); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); flushTimers(); };
    set("eco-mode", "differential_enthalpy_drybulb"); set("eco-hoa", "30"); set("eco-hra", "28"); set("eco-toa", "80"); set("eco-sp", "75");
    process.stdout.write(o.textContent);`;
  const text = execFileSync(process.execPath, ["--input-type=module", "-e", src], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  assert.match(text, /LOCK OUT \(mechanical cooling\) -- outdoor enthalpy above the return and outdoor dry-bulb above the fixed limit/);
  assert.match(text, /5\.0 F over the limit/);
  assert.doesNotMatch(text, /-5\.0 F over/);
});
