// The lighting-density page names data/electrical/lighting-density.json as its
// source, while computeLightingDensity computes from constants in
// calc-electrical.js. When IECC 2024 lowered four of the six LPDs (2026-10-17)
// both had to move together; this holds them to each other.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LIGHTING_DENSITY_W_PER_FT2, LIGHTING_DENSITY_2021_W_PER_FT2 } from "../../calc-electrical.js";

test("the lighting-density shard states the LPDs the compute uses, for both editions", () => {
  const shard = JSON.parse(readFileSync(new URL("../../data/electrical/lighting-density.json", import.meta.url), "utf8"));
  assert.deepEqual(shard.benchmark_W_per_ft2, LIGHTING_DENSITY_W_PER_FT2);
  assert.deepEqual(shard.benchmark_2021_W_per_ft2, LIGHTING_DENSITY_2021_W_PER_FT2);
});
