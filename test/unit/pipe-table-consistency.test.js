// Pipe inside diameters are copied into five modules. On 2026-09-18 every copy
// agreed with ASME B36.10 (Schedule 40 steel) and ASTM B88 (Type L copper),
// but nothing held them together: a copied table drifts silently, and a tile
// sizing gas pipe would then disagree with one sizing water pipe for the same
// nominal size. This pins every copy to the standard and so to each other.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BOILER_PIPE_TABLE } from "../../calc-hvacsystems.js";
import { SCH40_ID_IN as GAS_SCH40 } from "../../calc-gas.js";
import { SCH40_ID_IN as PLUMBING_SCH40, COPPER_TYPE_L_ID_IN } from "../../calc-plumbing.js";
import { _SCH40_ID_IN as PIPEFIT_SCH40 } from "../../calc-pipefit.js";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..", "..");

// ASME B36.10M Schedule 40 inside diameters, inches.
const B36_10_SCH40 = {
  "0.5": 0.622, "0.75": 0.824, "1": 1.049, "1.25": 1.38, "1.5": 1.61, "2": 2.067, "2.5": 2.469,
  "3": 3.068, "3.5": 3.548, "4": 4.026, "5": 5.047, "6": 6.065, "8": 7.981, "10": 10.02, "12": 11.938,
};
// ASTM B88 Type L copper tube inside diameters, inches.
const B88_TYPE_L = { "0.5": 0.545, "0.75": 0.785, "1": 1.025, "1.25": 1.265, "1.5": 1.505, "2": 1.985, "2.5": 2.465, "3": 2.945 };

const nominal = (label) => {
  const [whole, frac] = String(label).split("-");
  const f = (s) => (s.includes("/") ? Number(s.split("/")[0]) / Number(s.split("/")[1]) : Number(s));
  return String(frac ? f(whole) + f(frac) : f(whole));
};

const check = (name, table, standard) => {
  let n = 0;
  for (const [size, id] of table) {
    const key = nominal(size);
    assert.ok(key in standard, `${name}: ${size} is not a size the standard lists`);
    assert.equal(id, standard[key], `${name} ${size}: ${id} vs ${standard[key]}`);
    n++;
  }
  assert.ok(n >= 5, `${name}: expected a real table, read ${n} rows`);
};

test("every Schedule 40 table in the catalog matches ASME B36.10", () => {
  check("calc-gas SCH40_ID_IN", Object.entries(GAS_SCH40), B36_10_SCH40);
  check("calc-plumbing SCH40_ID_IN", Object.entries(PLUMBING_SCH40), B36_10_SCH40);
  check("calc-pipefit _SCH40_ID_IN", PIPEFIT_SCH40, B36_10_SCH40);
  check("calc-hvacsystems steel", BOILER_PIPE_TABLE.steel.sizes.map((s) => [s.size, s.id_in]), B36_10_SCH40);
});

test("every Type L copper table in the catalog matches ASTM B88", () => {
  check("calc-plumbing COPPER_TYPE_L_ID_IN", Object.entries(COPPER_TYPE_L_ID_IN), B88_TYPE_L);
  check("calc-hvacsystems copper", BOILER_PIPE_TABLE.copper.sizes.map((s) => [s.size, s.id_in]), B88_TYPE_L);
});

test("the pipe-velocity tile's private table agrees with the shared ones", () => {
  // _V26_PIPE_ID_IN is module-private; read its steel and copper rows from source.
  const src = readFileSync(resolve(ROOT, "calc-plumbing.js"), "utf8");
  const block = src.slice(src.indexOf("const _V26_PIPE_ID_IN = {"), src.indexOf("};", src.indexOf("const _V26_PIPE_ID_IN = {")));
  const row = (name) => Object.entries(JSON.parse("{" + block.match(new RegExp(name + ":\\s*\\{([^}]*)\\}"))[1] + "}"));
  check("calc-plumbing _V26 steel", row("steel"), B36_10_SCH40);
  check("calc-plumbing _V26 copper", row("copper"), B88_TYPE_L);
});
