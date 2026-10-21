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
import { readFileSync, readdirSync } from "node:fs";
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

// The other direction, for keys whose name states a unit. On 2026-10-20 about
// 4,300 numeric outputs that tile computes return on their worked examples
// were missing from their `// dims:` annotation, so the unit-tail rule never
// saw them: computeScrewConveyorRpm returned `area_ft2` and declared only
// `rpm`. 1,806 of them are named for a unit (`_ft2`, `_gpm`, `_psi`...) and
// were declared from that name, 258 more from the one dimension every other
// declaration of the key gives. Now every returned number whose name states a
// unit must be declared. (Names that state no unit, `area_ratio` or `se`,
// still need a person's reading and are not held here.) A name ending in a
// count or ratio word (`_ratio`, `_count`, `_fraction`) is held the same way.
test("every number a tile compute returns under a unit-named key is declared in its dims", async () => {
  const { unitTailExpectation, UNIT_TAIL_EXEMPT } = await import("../../scripts/check-dimensions.mjs");
  // Suffix words the corpus declares dimensionless in at least 98% of 10 or
  // more uses (165 outputs declared from this on 2026-10-20). `_factor` and
  // `_grade` are not here: a U-factor and a balance grade carry units.
  const COUNT_OR_RATIO = /_(ratio|fraction|efficiency|utilization|pct|percent|count|number|bags|rows|pieces)$/;
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
    if (at < 1) continue;
    let j = at - 1;
    while (j >= 0 && /^\s*\/\//.test(lines[j])) j--;
    const block = lines.slice(j + 1, at).join(" ");
    const outAt = block.indexOf("out:");
    if (!block.includes("dims:") || outAt < 0) continue;
    const declared = new Set([...block.slice(outAt).matchAll(/(\w+)\s*:/g)].map((m) => m[1]));
    const compute = (await import(resolve(ROOT, rel)))[fn];
    const returned = new Set();
    for (const inputs of examples.get(id) || [{}]) {
      try {
        const r = compute(inputs);
        if (r && typeof r === "object" && !Array.isArray(r)) {
          for (const [k, v] of Object.entries(r)) if (typeof v === "number") returned.add(k);
        }
      } catch { /* a throwing example is another test's concern */ }
    }
    for (const key of returned) {
      const named = unitTailExpectation(key) || COUNT_OR_RATIO.test(key);
      if (!named || UNIT_TAIL_EXEMPT.has(`${rel}:${fn}:${key}`)) continue;
      checked++;
      if (!declared.has(key)) bad.push(`${rel}: ${fn} returns \`${key}\` but its dims annotation does not declare it`);
    }
  }
  assert.ok(checked > 5000, `only ${checked} unit-named outputs checked; did the annotation format or the compute map move?`);
  assert.deepEqual(bad, []);
});

// A name that ends in a unit and then a time is a RATE: `influent_lb_day`,
// `target_ft3_hr`, `app_rate_in_hr`. The unit-tail rule stops at the time
// segment on purpose (see check-dimensions), so 18 such keys were declared
// `dimensionless` and nothing objected; fixed 2026-10-20. A ratio or factor
// named for the same units (`_per_`, `pct`, `ratio`, `factor`) is not held.
test("a key named for a per-time rate is never declared dimensionless", () => {
  const RATE = /^(?:[a-z0-9]+_)*?(ft3|gal|gallons|lb|lbs|btu|cf|yd3|cy|ton|tons|mi|ft|in|kwh|pints|ft2|sf|acres?|bbl|kg|g|l|m3)_(hr|min|day|yr|year|sec|hour|week|month)$/;
  const bad = [];
  let seen = 0;
  for (const f of readdirSync(ROOT).filter((n) => /^calc-.*\.js$/.test(n))) {
    for (const line of readFileSync(resolve(ROOT, f), "utf8").split("\n")) {
      if (!/^\s*\/\/.*(dims:|out:)/.test(line)) continue;
      for (const m of line.matchAll(/\b([A-Za-z0-9_]+)\s*:\s*([A-Za-z][^,}:{]*)/g)) {
        const key = m[1].toLowerCase();
        if (!RATE.test(key) || /(_per_|pct|percent|ratio|fraction|factor)/.test(key)) continue;
        seen++;
        if (m[2].trim() === "dimensionless") bad.push(`${f}: \`${m[1]}\` is a rate and is declared dimensionless`);
      }
    }
  }
  assert.ok(seen > 100, `only ${seen} rate-named keys found; did the annotation format move?`);
  assert.deepEqual(bad, []);
});

// The spelled-out form of the same rule. `cycles_per_day`, `doses_per_day`
// and `trucks_per_hour` were declared `dimensionless` while 39 siblings
// (`cycles_per_hour`, `meals_per_day`) were `T^-1`, and `lb_per_day`,
// `water_gal_per_year`, `area_ft2_per_day` and `heat_btu_per_day` were
// declared as the bare amount -- a mass, a volume, an energy -- with the time
// dropped (60 declarations fixed 2026-10-20). A `<thing>_per_<time>` key must
// carry a negative time exponent. Not held: a time per time (`hours_per_day`,
// `eff_min_per_hr`, a repo convention), money rates (money is dimensionless
// here, by convention), and temperatures, which this grammar writes with the
// same `T` as time.
test("a <thing>_per_<time> key is declared with the time in its denominator", () => {
  const timeExponent = (expr) => {
    if (expr.trim() === "dimensionless") return 0;
    let t = 0, sign = 1;
    for (const tok of expr.trim().split(/(\s+|\*|\/)/)) {
      if (!tok || /^\s+$/.test(tok)) continue;
      if (tok === "/") { sign = -1; continue; }
      if (tok === "*") { sign = 1; continue; }
      const m = tok.match(/^([A-Za-z]+)(?:\^(-?\d+))?$/);
      if (m && m[1] === "T") t += (m[2] ? Number(m[2]) : 1) * sign;
      sign = 1;
    }
    return t;
  };
  const TIME_NUMERATOR = /(^|_)(hours?|hrs?|minutes?|mins?|days?|weeks?|months?|years?|yrs?|seconds?|secs?|shifts?|runtime)(_|$)/;
  const MONEY = /(cost|usd|price|wage|rate_per|labor_rate|fee|dollar|fixed_per|revenue)/;
  const NOT_HELD = /(temp|_f_per|deg|hdd|cdd|baseload)/;
  const bad = [];
  let seen = 0;
  for (const f of readdirSync(ROOT).filter((n) => /^calc-.*\.js$/.test(n))) {
    for (const line of readFileSync(resolve(ROOT, f), "utf8").split("\n")) {
      if (!/^\s*\/\/.*(dims:|out:)/.test(line)) continue;
      for (const m of line.matchAll(/\b([A-Za-z0-9_]+)\s*:\s*([A-Za-z][^,}:{]*)/g)) {
        const key = m[1].toLowerCase();
        const per = key.match(/^(.*)_per_(day|hr|hour|min|minute|week|month|year|yr|sec|second|shift)$/);
        if (!per || TIME_NUMERATOR.test(per[1]) || MONEY.test(key) || NOT_HELD.test(key)) continue;
        seen++;
        if (timeExponent(m[2]) >= 0) bad.push(`${f}: \`${m[1]}\` is per ${per[2]} but declared \`${m[2].trim()}\``);
      }
    }
  }
  assert.ok(seen > 100, `only ${seen} per-time keys found; did the annotation format move?`);
  assert.deepEqual(bad, []);
});

// Every number a tile compute returns on its worked examples now has a
// declared dimension except these: a non-integer exponent (culvert flow
// factor, Kf) or a name meaning another quantity elsewhere. 2026-10-20: ~4,300 undeclared -> 30. The count may only
// fall; a new tile declares every output it returns.
const UNDECLARED_BUDGET = 30;
test("undeclared returned outputs only fall", async () => {
  const { COMPUTE_MAP } = await import("../fixtures/compute-map.js");
  const { rows } = JSON.parse(readFileSync(resolve(ROOT, "test/fixtures/worked-examples.json"), "utf8"));
  const examples = new Map();
  for (const r of rows) {
    if (!examples.has(r.tile_id)) examples.set(r.tile_id, []);
    examples.get(r.tile_id).push(r.inputs || {});
  }
  const sources = new Map();
  const seen = new Set();
  let undeclared = 0;
  for (const [id, { module, fn }] of Object.entries(COMPUTE_MAP)) {
    const rel = module.replace("../../", "");
    if (seen.has(rel + ":" + fn)) continue;
    seen.add(rel + ":" + fn);
    if (!sources.has(rel)) sources.set(rel, readFileSync(resolve(ROOT, rel), "utf8").split("\n"));
    const lines = sources.get(rel);
    const at = lines.findIndex((l) => new RegExp("^export function " + fn + "\\(").test(l));
    if (at < 1) continue;
    let j = at - 1;
    while (j >= 0 && /^\s*\/\//.test(lines[j])) j--;
    const block = lines.slice(j + 1, at).join(" ");
    const outAt = block.indexOf("out:");
    if (!block.includes("dims:") || outAt < 0) continue;
    const declared = new Set([...block.slice(outAt).matchAll(/(\w+)\s*:/g)].map((m) => m[1]));
    const compute = (await import(resolve(ROOT, rel)))[fn];
    const returned = new Set();
    for (const inputs of examples.get(id) || [{}]) {
      try {
        const r = compute(inputs);
        if (r && typeof r === "object" && !Array.isArray(r)) {
          for (const [k, v] of Object.entries(r)) if (typeof v === "number" && /^[A-Za-z_]\w*$/.test(k)) returned.add(k);
        }
      } catch { /* another test's concern */ }
    }
    for (const k of returned) if (!declared.has(k)) undeclared++;
  }
  assert.ok(undeclared <= UNDECLARED_BUDGET, `${undeclared} returned outputs have no declared dimension (budget ${UNDECLARED_BUDGET}); declare the new ones`);
  if (undeclared < UNDECLARED_BUDGET) console.log(`undeclared outputs fell to ${undeclared}; lower UNDECLARED_BUDGET`);
});
