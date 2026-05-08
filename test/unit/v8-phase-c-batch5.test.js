// v8 Phase C batch 5 - 5 final compute-side spec §5 items.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseConductorShorthand, computeConduitFill,
  WIRE_AMPACITY_AMBIENT_PRESETS,
} from "../../calc-electrical.js";
import {
  PIPE_SIZING_RESIDENTIAL_PRESETS, pipeSizingFromPreset,
} from "../../calc-plumbing.js";
import { computeRefrigerantPT } from "../../calc-hvac.js";
import { computeAirMovers } from "../../calc-restoration.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;

// --- C.1 conductor shorthand parser ---

test("C.1 parseConductorShorthand: '12 THHN ×20' → { awg: '12', insulation: 'THHN', count: 20 }", () => {
  assert.deepEqual(parseConductorShorthand("12 THHN ×20"), { awg: "12", insulation: "THHN", count: 20 });
});

test("C.1 parseConductorShorthand: 'x' multiplier accepted", () => {
  assert.deepEqual(parseConductorShorthand("12 THHN x20"), { awg: "12", insulation: "THHN", count: 20 });
});

test("C.1 parseConductorShorthand: lowercase x and uppercase X both work", () => {
  assert.deepEqual(parseConductorShorthand("10 THHN X 5"), { awg: "10", insulation: "THHN", count: 5 });
});

test("C.1 parseConductorShorthand: bare row defaults count = 1", () => {
  assert.deepEqual(parseConductorShorthand("8 THHN"), { awg: "8", insulation: "THHN", count: 1 });
});

test("C.1 parseConductorShorthand: '1/0 THHN ×3' (slash AWG)", () => {
  assert.deepEqual(parseConductorShorthand("1/0 THHN ×3"), { awg: "1/0", insulation: "THHN", count: 3 });
});

test("C.1 parseConductorShorthand: unknown insulation errors", () => {
  assert.ok(parseConductorShorthand("12 BOGUS ×5").error);
});

test("C.1 parseConductorShorthand: unknown AWG errors", () => {
  assert.ok(parseConductorShorthand("99 THHN").error);
});

test("C.1 parseConductorShorthand: empty input errors", () => {
  assert.ok(parseConductorShorthand("").error);
  assert.ok(parseConductorShorthand("   ").error);
});

test("C.1 parseConductorShorthand: garbage errors", () => {
  assert.ok(parseConductorShorthand("hello").error);
  assert.ok(parseConductorShorthand("12 THHN extra junk").error);
});

test("C.1 parseConductorShorthand: parsed row passes computeConduitFill", () => {
  const row = parseConductorShorthand("12 THHN ×4");
  const r = computeConduitFill({ conduit: "EMT", trade_size: "3/4", conductors: [row] });
  assert.equal(r.pass_flag, "PASS");
});

// --- C.1 wire-ampacity ambient presets ---

test("C.1 WIRE_AMPACITY_AMBIENT_PRESETS exposes 3 presets at 30/45/60 °C", () => {
  assert.equal(WIRE_AMPACITY_AMBIENT_PRESETS.length, 3);
  assert.deepEqual(WIRE_AMPACITY_AMBIENT_PRESETS.map((p) => p.ambient_C), [30, 45, 60]);
});

test("C.1 ambient preset 30 °C is labeled 'Indoor'", () => {
  const p = WIRE_AMPACITY_AMBIENT_PRESETS.find((x) => x.ambient_C === 30);
  assert.match(p.label, /Indoor/i);
});

// --- C.2 pipe-sizing residential preset ---

test("C.2 pipeSizingFromPreset('3bed_2bath') yields a sane WSFU total", () => {
  const r = pipeSizingFromPreset("3bed_2bath");
  // 3-bed/2-bath aggregates: 2 toilets (5) + 3 lavs (3) + shower (2) + tub (4) + kitchen sink (1.5) + DW (1.5) + laundry (1.5) + 2 hose (5) ≈ 23.5
  assert.ok(r.total_wsfu >= 20 && r.total_wsfu <= 30);
});

test("C.2 pipeSizingFromPreset upgrades pipe size as fixtures grow", () => {
  const small = pipeSizingFromPreset("3bed_2bath");
  const big = pipeSizingFromPreset("5bed_35bath");
  assert.ok(big.total_wsfu > small.total_wsfu);
});

test("C.2 pipeSizingFromPreset unknown id errors", () => {
  assert.ok(pipeSizingFromPreset("no_such").error);
});

test("C.2 PIPE_SIZING_RESIDENTIAL_PRESETS has 3 presets with labels", () => {
  for (const id of ["3bed_2bath", "4bed_3bath", "5bed_35bath"]) {
    assert.ok(PIPE_SIZING_RESIDENTIAL_PRESETS[id]);
    assert.ok(PIPE_SIZING_RESIDENTIAL_PRESETS[id].label);
    assert.ok(Array.isArray(PIPE_SIZING_RESIDENTIAL_PRESETS[id].fixtures));
  }
});

// --- C.3 refrigerant-pt target_superheat_F lookup ---

test("C.3 refrigerant-pt target_superheat_F null when outdoor/wb not supplied", () => {
  const r = computeRefrigerantPT({ refrigerant: "R-410A", pressure_psig: 118 });
  assert.equal(r.target_superheat_F, undefined);
});

test("C.3 refrigerant-pt target_superheat_F supplied when outdoor + wb given", () => {
  // 95 F outdoor, 67 F wet-bulb (AHRI conditions): target = 70 + 0.6×67 - 0.5×95 = 70 + 40.2 - 47.5 = 62.7 → clamped 30.
  // 85 F outdoor, 67 F wet-bulb: target = 70 + 40.2 - 42.5 = 67.7 → clamped 30.
  const r = computeRefrigerantPT({ refrigerant: "R-410A", pressure_psig: 118, outdoor_F: 95, indoor_wb_F: 67 });
  assert.ok(r.target_superheat_F >= 5 && r.target_superheat_F <= 30);
});

test("C.3 refrigerant-pt target clamps to ≥ 5 °F at extreme high OAT", () => {
  const r = computeRefrigerantPT({ refrigerant: "R-410A", pressure_psig: 118, outdoor_F: 130, indoor_wb_F: 60 });
  assert.ok(r.target_superheat_F >= 5);
});

test("C.3 refrigerant-pt target clamps to ≤ 30 °F at extreme low OAT / high WB", () => {
  const r = computeRefrigerantPT({ refrigerant: "R-410A", pressure_psig: 118, outdoor_F: 60, indoor_wb_F: 80 });
  assert.equal(r.target_superheat_F, 30);
});

// --- C.6 air-mover placement pattern ---

test("C.6 air-mover small chamber → corners pattern", () => {
  const r = computeAirMovers({ affected_area_ft2: 200, water_class: "2" });
  assert.equal(r.placement_pattern, "corners");
});

test("C.6 air-mover medium chamber → corners + perimeter", () => {
  const r = computeAirMovers({ affected_area_ft2: 800, water_class: "2" });
  assert.match(r.placement_pattern, /corners.*perimeter|perimeter/i);
});

test("C.6 air-mover large chamber → continuous perimeter", () => {
  const r = computeAirMovers({ affected_area_ft2: 5000, water_class: "2" });
  assert.match(r.placement_pattern, /continuous perimeter/i);
});

test("C.6 air-mover placement_note guidance is non-empty", () => {
  const r = computeAirMovers({ affected_area_ft2: 200, water_class: "2" });
  assert.ok(r.placement_note && r.placement_note.length > 20);
});
