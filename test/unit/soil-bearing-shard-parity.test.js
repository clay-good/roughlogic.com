// footing-area computes from SOIL_BEARING_PSF, and the page names the shard
// data/construction/soil-bearing.json as its data source. When the code's "rock"
// row was corrected to the IBC Table 1806.2 sedimentary-rock value (4,000 psf,
// 2026-10-03) the shard kept 12,000 until 2026-10-17. The two must agree.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SOIL_BEARING_PSF } from "../../calc-construction.js";

test("the soil-bearing shard states the values footing-area computes with", () => {
  const shard = JSON.parse(readFileSync(new URL("../../data/construction/soil-bearing.json", import.meta.url), "utf8")).allowable_psf;
  for (const [k, v] of Object.entries(shard)) assert.equal(v, SOIL_BEARING_PSF[k], `shard ${k}`);
  assert.equal(shard.rock, 4000);
  assert.equal(shard.crystalline_bedrock, 12000);
});
