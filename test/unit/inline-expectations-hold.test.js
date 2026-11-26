// A DECLARED EXPECTATION THAT NOTHING READS IS A CLAIM THAT LOOKS VERIFIED.
//
// 167 worked-example exports in calc-*.js carry an inline `expected` or
// `expectedRange` -- a publisher-facing statement of what the tile answers.
// The v10 runner checks test/fixtures/worked-examples.json, a DIFFERENT
// surface, and the inline blocks were left to whichever per-module test
// remembered to read one. Most do not: they re-assert the same numbers as their
// own literals, so the block and the test drift apart in silence.
//
// `insulationThicknessExample` is what that cost. It declared
// `thickness_in: { min: 0.4, max: 3.0 }` while the compute returns 0.364 -- the
// CORRECT answer since conduction per foot started taking k/12, which
// calc-hvac-v2.test.js records ("0.364 in: conduction per foot takes k/12") and
// the example's band did not. A fix updated the test and left the claim behind.
//
// REACH, STATED PLAINLY. An inline example has no recorded owner: nothing maps
// `fooExample` to the compute it belongs to. Three resolutions were tried and
// two were unsound -- matching a compute that merely RETURNS the named keys
// picks the wrong one of two siblings (`computeReadability` and
// `computeAlternateReadability` both return `sentences`), and matching on
// shared fixture inputs collapses on the reference tiles, which all take `{}`.
// So this gate uses the one exact rule, `fooExample` -> `computeFoo`, plus a
// recorded exception table for the 35 it cannot reach -- taken from the
// per-module test that already imports both and calls them together, and from
// compute-map.js for three whose names differ by an acronym's case
// (computeGFCIReference) or a suffix. Every claim is now read and enforced, and
// both counts are held at zero: a new unreachable example or a new declaration
// shape fails here rather than being skipped quietly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { EXAMPLE_COMPUTE_EXCEPTIONS } from "../fixtures/example-compute-exceptions.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Two computes take a fetched data shard as an argument, so their worked
// example cannot run from its inputs alone. calc-realestate.test.js drives both
// against the shipped shard.
const NEEDS_A_SHARD = new Set(["hudFmrExample", "loanLimitsExample"]);

// The shapes actually in use, written down as a schema rather than left as a
// habit. Nothing read these generically before, so six grew:
//   expected:      { key: number|string }        exact, or 0.1% for a float
//   expected:      { key_approx: number }        the value is approximate: 1%
//   expected:      { key_count: number }         result[key].length
//   expected:      { count: number }             the one array output's length
//   expectedRange: { key: { min?, max? } }       a band on result[key]
//   expectedRange: { key_min: n, key_max: n }    the same band, flattened
// Plus a dotted path into a nested result (`selected.typical`,
// `splits.0.share`) and `_key_count` for an object's key count.
//
// A claim this schema cannot read is a FAILURE, not a skip: an unreadable
// declaration is exactly the kind that drifts.
function arrayOutputLength(result) {
  const arrays = Object.entries(result).filter(([, v]) => Array.isArray(v));
  return arrays.length === 1 ? arrays[0][1].length : null;
}
// A DOTTED PATH reaches into a nested result: `selected.typical`,
// `splits.0.share`. Added 2026-11-26 so a claim about a nested value can be
// written in the schema instead of inventing a flat alias for it.
function atPath(result, path) {
  let node = result;
  for (const seg of path.split(".")) {
    if (node === null || node === undefined) return undefined;
    if (Array.isArray(node)) {
      if (!/^\d+$/.test(seg)) return undefined;
      node = node[Number(seg)];
    } else if (typeof node === "object") {
      if (!(seg in node)) return undefined;
      node = node[seg];
    } else return undefined;
  }
  return node;
}
const hasPath = (result, path) => path.includes(".") && atPath(result, path) !== undefined;
function readClaim(result, declared, value, isRange) {
  // A flattened bound reads the same in either block: readabilityExample puts
  // `words_min` / `fkgl_max` under `expected`, conduitFillExample puts a band
  // under `expectedRange`. Same claim, two homes.
  for (const [suffix, side] of [["_min", "min"], ["_max", "max"]]) {
    if (declared.endsWith(suffix)) {
      const base = declared.slice(0, -suffix.length);
      if (base in result) return [{ key: base, got: result[base], cmp: { [side]: value } }];
    }
  }
  if (isRange) {
    // A boolean under expectedRange is not a band: conduitFillExample declares
    // `pass: true` beside its fill-percent band.
    if (declared in result && typeof value === "boolean") return [{ key: declared, got: result[declared], cmp: "exact" }];
    const node = declared in result ? result[declared] : (hasPath(result, declared) ? atPath(result, declared) : undefined);
    if (node !== undefined && value && typeof value === "object") {
      const out = [];
      if (value.min !== undefined) out.push({ key: declared, got: node, cmp: { min: value.min } });
      if (value.max !== undefined) out.push({ key: declared, got: node, cmp: { max: value.max } });
      return out.length ? out : null;
    }
    return null;
  }
  if (declared in result) return [{ key: declared, got: result[declared], cmp: "exact" }];
  if (hasPath(result, declared)) return [{ key: declared, got: atPath(result, declared), cmp: "exact" }];
  if (declared.endsWith("_key_count")) {
    // An object output's KEY count, which is what a "how many trades" claim
    // means. Distinct from _count, which is an array's length.
    const base = declared.slice(0, -"_key_count".length);
    const node = result[base];
    if (node && typeof node === "object" && !Array.isArray(node)) {
      return [{ key: "Object.keys(" + base + ").length", got: Object.keys(node).length, cmp: "exact" }];
    }
  }
  if (declared.endsWith("_approx")) {
    const base = declared.slice(0, -"_approx".length);
    if (base in result) return [{ key: base, got: result[base], cmp: "approx" }];
  }
  if (declared.endsWith("_count")) {
    const base = declared.slice(0, -"_count".length);
    if (Array.isArray(result[base])) return [{ key: base + ".length", got: result[base].length, cmp: "exact" }];
  }
  if (declared === "count") {
    const n = arrayOutputLength(result);
    if (n !== null) return [{ key: "the one array output's length", got: n, cmp: "exact" }];
  }
  return null;
}

test("every inline expected / expectedRange this gate can reach holds", async () => {
  const modules = readdirSync(ROOT).filter((f) => /^calc-.*\.js$/.test(f));
  const violated = [];
  const unreadable = [];
  const unreachable = [];
  let examples = 0;
  let claims = 0;

  for (const file of modules) {
    let ns;
    try { ns = await import(resolve(ROOT, file)); } catch { continue; }

    for (const [name, example] of Object.entries(ns)) {
      if (!/Example$/.test(name) || !example || typeof example !== "object") continue;
      const exp = example.expected && typeof example.expected === "object" ? example.expected : null;
      const range = example.expectedRange && typeof example.expectedRange === "object" ? example.expectedRange : null;
      if (!exp && !range) continue;
      if (NEEDS_A_SHARD.has(name)) continue;
      examples++;

      // The exact rule, then the recorded exception for the 35 that break it.
      // No fuzzy relaxation: a near-miss picks a sibling.
      const base = name.replace(/Example$/, "");
      let fnName = "compute" + base[0].toUpperCase() + base.slice(1);
      if (typeof ns[fnName] !== "function") fnName = EXAMPLE_COMPUTE_EXCEPTIONS[name];
      if (!fnName || typeof ns[fnName] !== "function") { unreachable.push(`${file}::${name}`); continue; }

      let result;
      try { result = ns[fnName](structuredClone(example.inputs || {})); } catch (e) {
        violated.push(`${file}::${name} (${fnName}) threw on its own inputs: ${e.message}`);
        continue;
      }
      if (!result || typeof result !== "object") { violated.push(`${file}::${name} (${fnName}) returned ${typeof result}`); continue; }
      if (result.error) { violated.push(`${file}::${name} (${fnName}) refuses its own example: ${result.error.slice(0, 90)}`); continue; }

      for (const [isRange, block] of [[false, exp], [true, range]]) {
        for (const [declared, value] of Object.entries(block || {})) {
          claims++;
          const checks = readClaim(result, declared, value, isRange);
          if (!checks) { unreadable.push(`${file}::${name}.${isRange ? "expectedRange" : "expected"}.${declared} names nothing ${fnName} returns`); continue; }
          for (const c of checks) {
            if (c.cmp === "exact" || c.cmp === "approx") {
              if (typeof value === "number") {
                if (typeof c.got !== "number" || !Number.isFinite(c.got)) { unreadable.push(`${file}::${name}.${declared}: ${c.key} is ${JSON.stringify(c.got)}`); continue; }
                const tol = c.cmp === "approx" ? Math.abs(value) * 0.01 : Math.max(1e-9, Math.abs(value) * 1e-3);
                if (Math.abs(c.got - value) > tol) violated.push(`${file}::${name} (${fnName}).${declared}: declared ${value}, ${c.key} is ${c.got}`);
              } else if (String(c.got) !== String(value)) {
                violated.push(`${file}::${name} (${fnName}).${declared}: declared ${JSON.stringify(value)}, ${c.key} is ${JSON.stringify(c.got)}`);
              }
            } else {
              if (typeof c.got !== "number" || !Number.isFinite(c.got)) { unreadable.push(`${file}::${name}.${declared}: ${c.key} is ${JSON.stringify(c.got)}`); continue; }
              if (c.cmp.min !== undefined && c.got < c.cmp.min) violated.push(`${file}::${name} (${fnName}).${declared}: ${c.key} is ${c.got}, below the declared min ${c.cmp.min}`);
              if (c.cmp.max !== undefined && c.got > c.cmp.max) violated.push(`${file}::${name} (${fnName}).${declared}: ${c.key} is ${c.got}, above the declared max ${c.cmp.max}`);
            }
          }
        }
      }
    }
  }

  assert.ok(examples > 150, `only ${examples} examples carried an inline expectation; did the shape change?`);
  assert.deepEqual(violated, [], "an inline expectation its own compute does not satisfy");
  // THE SHAPE ZOO IS CLOSED. These declarations were in twelve ad-hoc shapes,
  // because nothing had ever read them generically. Eight examples carried the
  // fourteen claims no schema could reach, and each was translated to the
  // conventions above rather than parsed around:
  //
  //   tipOutExample            A / B / C      -> splits.N.name + splits.N.share
  //   lexileBandExample        selected_typical -> "selected.typical"
  //   readabilityExample       fkgl_* / fre_* -> the real output names
  //   statisticsExample        sd_sample_value -> sd_sample_approx
  //   wireAmpacityExample      bare { min, max } -> { ampacity_A: { ... } }
  //   inspectionChecklistExample  count       -> trades_key_count
  //   labSafetyExample         picto_count / tree_steps -> pictograms_count /
  //                                               decision_tree_count
  //
  // Every translation preserved the claim; `tipOutExample` is now stronger,
  // since the name is asserted beside the share. Two of them were VALUES that
  // were right all along -- labSafetyExample reads its numbers straight off the
  // source lists -- which is exactly how an unreadable claim stays plausible.
  //
  // Held at zero: a thirteenth shape is a failure here, not a silent skip.
  assert.equal(unreadable.length, 0, `an inline expectation this schema cannot read -- translate it to a documented convention rather than widening the parser:\n${unreadable.join("\n")}`);
  // Both counts are now ZERO: every inline expectation on every worked example
  // is read and enforced. The 35 the naming rule could not reach are paired in
  // test/fixtures/example-compute-exceptions.js, each row taken from where the
  // repo already records the pairing rather than guessed. None of their claims
  // failed once reached, which is a clean result for the per-module tests that
  // had been carrying them.
  assert.equal(unreachable.length, 0, `an example neither the naming rule nor the recorded exceptions reach -- add it to test/fixtures/example-compute-exceptions.js:\n${unreachable.join("\n")}`);
  assert.ok(claims > 130, `only ${claims} claims were read from ${examples - unreachable.length} reachable examples`);
  // Coverage, printed so the gate's reach is visible rather than implied.
  console.log(`inline expectations: ${examples} examples carry one, ${examples - unreachable.length} reachable by name, ${claims} claims read, ${claims - unreadable.length} enforced`);
});
