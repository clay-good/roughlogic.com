// A `// dims:` annotation declares each output's dimension, and check-dimensions
// holds those declarations to the unit in the key's name and to every other
// declaration of the same key. Neither rule asked whether the key EXISTS.
// computeConcreteVolume declared `volume_yd3`, `bags_60` and `bags_80` and
// returns `cubic_yards`, `bags_60lb` and `bags_80lb`; on 2026-10-17, 137 tile
// computes declared 250 outputs they never return. Each one was a dimension
// "checked" on a key no reader or agent ever receives, while the real output
// beside it went unchecked.
//
// So: every output a tile's compute declares must appear in that function's
// source or in a result it returns on its worked examples. (The source text
// covers keys only some modes return; the run covers keys built from a
// constant, like a reference table's `items`.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("every output a tile compute's dims annotation declares is one it returns", async () => {
  const { COMPUTE_MAP } = await import("../fixtures/compute-map.js");
  const { rows } = JSON.parse(readFileSync(resolve(ROOT, "test/fixtures/worked-examples.json"), "utf8"));
  const examples = new Map();
  for (const r of rows) {
    if (!examples.has(r.tile_id)) examples.set(r.tile_id, []);
    examples.get(r.tile_id).push(r.inputs || {});
  }
  const sources = new Map();
  const seen = new Set();
  const bad = [];
  let checked = 0;
  for (const [id, { module, fn }] of Object.entries(COMPUTE_MAP)) {
    const rel = module.replace("../../", "");
    if (seen.has(rel + ":" + fn)) continue;
    seen.add(rel + ":" + fn);
    if (!sources.has(rel)) sources.set(rel, readFileSync(resolve(ROOT, rel), "utf8").split("\n"));
    const lines = sources.get(rel);
    const at = lines.findIndex((l) => new RegExp("^export function " + fn + "\\(").test(l));
    if (at < 1 || !lines[at - 1].includes("// dims:")) continue;
    const out = /out:\s*\{([^}]*)\}/.exec(lines[at - 1]);
    if (!out) continue;
    let end = at;
    while (end < lines.length && lines[end].trimEnd() !== "}") end++;
    const body = lines.slice(at, end + 1).join("\n");
    const compute = (await import(resolve(ROOT, rel)))[fn];
    const returned = new Set();
    for (const inputs of examples.get(id) || [{}]) {
      try {
        const r = compute(inputs);
        if (r && typeof r === "object") for (const k of Object.keys(r)) returned.add(k);
      } catch { /* a throwing example is another test's concern */ }
    }
    for (const [, key] of out[1].matchAll(/(\w+):/g)) {
      checked++;
      if (!new RegExp("\\b" + key + "\\b").test(body) && !returned.has(key)) bad.push(`${rel}: ${fn} declares \`${key}\`, which it never returns`);
    }
  }
  assert.ok(checked > 5000, `only ${checked} declared outputs checked; did the annotation format or the compute map move?`);
  assert.deepEqual(bad, []);
});

// The input side of the same claim. computeNIOSHLifting declared `load_lb`,
// `h_in`, `a_deg`, `f` and `c` while taking `weight_lb`, `H_in`,
// `asymmetry_deg`, `frequency_per_min` and `coupling`, so the dimension check
// ran on parameter names that do not exist (six computes, 13 inputs, fixed
// 2026-10-17). Every declared input must be a name the compute uses.
test("every input a tile compute's dims annotation declares is one it takes", async () => {
  const { COMPUTE_MAP } = await import("../fixtures/compute-map.js");
  const sources = new Map();
  const seen = new Set();
  const bad = [];
  let checked = 0;
  for (const { module, fn } of Object.values(COMPUTE_MAP)) {
    const rel = module.replace("../../", "");
    if (seen.has(rel + ":" + fn)) continue;
    seen.add(rel + ":" + fn);
    if (!sources.has(rel)) sources.set(rel, readFileSync(resolve(ROOT, rel), "utf8").split("\n"));
    const lines = sources.get(rel);
    const at = lines.findIndex((l) => new RegExp("^export function " + fn + "\\(").test(l));
    if (at < 1 || !lines[at - 1].includes("// dims:")) continue;
    const inp = /in\s*\{([^}]*)\}/.exec(lines[at - 1]);
    if (!inp) continue;
    let end = at;
    while (end < lines.length && lines[end].trimEnd() !== "}") end++;
    const body = lines.slice(at, end + 1).join("\n");
    for (const [, key] of inp[1].matchAll(/(\w+):/g)) {
      if (key === "args") continue; // the stub form check-dimensions budgets separately
      checked++;
      if (!new RegExp("\\b" + key + "\\b").test(body)) bad.push(`${rel}: ${fn} declares input \`${key}\`, which it never uses`);
    }
  }
  assert.ok(checked > 8000, `only ${checked} declared inputs checked`);
  assert.deepEqual(bad, []);
});
