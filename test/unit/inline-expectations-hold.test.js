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
// So this gate uses the one exact rule, `fooExample` -> `computeFoo`, which
// reaches most but not all of them, and pins the count it cannot reach. The two
// pinned counts are held at their measured size, so a new unreachable example
// or a new declaration shape fails here rather than being skipped quietly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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
// A claim this schema cannot read is a FAILURE, not a skip: an unreadable
// declaration is exactly the kind that drifts.
function arrayOutputLength(result) {
  const arrays = Object.entries(result).filter(([, v]) => Array.isArray(v));
  return arrays.length === 1 ? arrays[0][1].length : null;
}
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
    if (declared in result && value && typeof value === "object") {
      const out = [];
      if (value.min !== undefined) out.push({ key: declared, got: result[declared], cmp: { min: value.min } });
      if (value.max !== undefined) out.push({ key: declared, got: result[declared], cmp: { max: value.max } });
      return out.length ? out : null;
    }
    return null;
  }
  if (declared in result) return [{ key: declared, got: result[declared], cmp: "exact" }];
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

      // The one exact rule. No relaxation: a near-miss picks a sibling.
      const base = name.replace(/Example$/, "");
      const fnName = "compute" + base[0].toUpperCase() + base.slice(1);
      if (typeof ns[fnName] !== "function") { unreachable.push(`${file}::${name}`); continue; }

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
  // THE SHAPE ZOO, PINNED RATHER THAN PARSED. Beyond the six shapes above there
  // are at least five more, each used once or twice: tipOutExample maps
  // `splits[].name` to `splits[].share`; lexileBandExample's `selected_typical`
  // means `selected.typical`; statisticsExample uses a `_value` suffix for an
  // approximate figure; inspectionChecklistExample's `count` means the number of
  // TRADE KEYS in a nested object, not an array length; wireAmpacityExample
  // declares a bare `{ min, max }` naming no output at all; readabilityExample
  // abbreviates its keys (`fkgl_min` for flesch_kincaid_grade_level,
  // `fre_min` for flesch_reading_ease); and labSafetyExample's `picto_count`
  // and `tree_steps` count entries inside nested objects. Fourteen claims
  // across eight examples.
  //
  // Writing a parser for eleven shapes would be building a gate around an
  // accident. Normalising all 167 declarations onto one schema is the right fix
  // and is a campaign of its own -- each needs a faithful translation, and a
  // careless one changes what a publisher claimed, which is worse than leaving
  // it unenforced. So the count is pinned here instead: it cannot grow, which
  // makes a twelfth shape fail rather than pass, and it shrinks as declarations
  // are normalised.
  assert.equal(unreadable.length, 14, `unreadable inline expectations moved from 14 to ${unreadable.length}:\n${unreadable.join("\n")}`);
  // Held at the measured size. An example the naming rule cannot reach is not a
  // finding -- but a NEW one is, because it would arrive unchecked.
  assert.equal(unreachable.length, 35, `examples the naming rule cannot reach moved from 35 to ${unreachable.length}:\n${unreachable.join("\n")}`);
  assert.ok(claims > 130, `only ${claims} claims were read from ${examples - unreachable.length} reachable examples`);
  // Coverage, printed so the gate's reach is visible rather than implied.
  console.log(`inline expectations: ${examples} examples carry one, ${examples - unreachable.length} reachable by name, ${claims} claims read, ${claims - unreadable.length} enforced`);
});
