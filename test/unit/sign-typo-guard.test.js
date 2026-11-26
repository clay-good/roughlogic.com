// Sign-typo guard: a negative number in a field that cannot be negative must
// not come back as a confident answer.
//
// The tile-contract sweep drives every numeric slot to -1 but fails only when
// that leaks NaN/Infinity. A finite answer passes it, so a sign typo in a
// length, a lap, a price or a void ratio used to compute a plausible-looking
// result with no warning on either door: no `min` on the field (so the page
// does not strike the output and the agent door does not warn), and no
// `{error}` from the compute.
//
// For every registered tile, this test takes the first worked example and
// negates each positive numeric input whose field declares no `min >= 0`.
// The input passes when the compute returns `{error}` or an unchanged result.
// Otherwise it must be listed in test/fixtures/signed-inputs.js, the inputs
// that are legitimately signed (temperatures, elevations, coordinates,
// coefficients, dB, phase angles, signed offsets). A new tile whose length
// field takes a negative silently fails here until it gets a guard or a
// `min`, or is consciously added to that list.
//
// The second test is the ceiling twin: an efficiency, a lightweight factor
// lambda, a discharge coefficient Cd, or a fraction pushed past 1 (or past
// 100 when it is a percent) must error unless the field declares a `max` or
// the input is listed in CEILING_EXEMPT below.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { COMPUTE_MAP, importCalc } from "../fixtures/compute-map.js";
import { SIGNED_INPUTS } from "../fixtures/signed-inputs.js";
import { describe } from "../../mcp/catalog.mjs";

const FIXTURE = new URL("../fixtures/worked-examples.json", import.meta.url);

// Round so float noise in an untouched path does not read as a change.
const stable = (o) => JSON.stringify(o, (k, v) => (typeof v === "number" ? Math.round(v * 1e6) / 1e6 : v));

// Every registered tile's first worked example, its compute, its schema, and
// the inputs whose `perturb(field, value)` returns a bad value that the
// compute answers without an error and with a changed result.
async function silentPerturbations(perturb) {
  const { rows } = JSON.parse(await readFile(FIXTURE, "utf8"));
  const first = new Map();
  for (const r of rows) if (!first.has(r.tile_id)) first.set(r.tile_id, r);
  const silent = [];
  for (const [id, row] of first) {
    const reg = COMPUTE_MAP[id];
    if (!reg) continue;
    const fn = (await importCalc(reg.module))[reg.fn];
    const d = await describe({ id });
    if (!d || !d.inputs) continue;
    const base = stable(fn({ ...row.inputs }));
    for (const f of d.inputs) {
      // An input the schema could not type (kind null: an agent-only or
      // unmapped parameter) is still a number when its worked example says so;
      // the agent door accepts it, so it is held to the same rule.
      if (f.kind !== "number" && !(f.kind == null && typeof row.inputs[f.key] === "number")) continue;
      const v = Number(row.inputs[f.key]);
      if (!(v > 0)) continue;
      const bad = perturb(f, v);
      if (bad === null) continue;
      const r = fn({ ...row.inputs, [f.key]: bad });
      if (r && r.error) continue;
      if (stable(r) === base) continue;
      silent.push(`${id}::${f.key}`);
    }
  }
  return silent;
}

const declared = (f, attr) => (f.attrs && f.attrs[attr] != null && f.attrs[attr] !== "" ? Number(f.attrs[attr]) : null);

// A sign typo: negate, unless the field already declares min >= 0.
const negate = (f, v) => (declared(f, "min") != null && declared(f, "min") >= 0 ? null : -v);

// Bounded by definition: efficiencies, ACI lambda, orifice Cd, fractions.
// Emissivity, absorptance, reflectance, albedo and porosity joined 2026-11-15: each
// is a 0-1 share by definition, and jacket emissivity answered 90.
const BOUNDED = /(^|_)eff(_|$)|efficiency|^lambda$|^cd$|fraction$|_fraction_|^runoff_c$|emissivity|absorptan|reflectan|albedo|porosity/i;
const pastCeiling = (f, v) => {
  if (!BOUNDED.test(f.key) || declared(f, "max") != null) return null;
  const pct = /pct|percent/i.test(f.key) || /%|percent/i.test(f.label);
  if (pct && v > 1) return 150;
  // A worked value above 1 says this name is not a 0-1 fraction here
  // (eff_min_per_hr, seismic Cd); only a value in use as a fraction is probed.
  return v <= 1 ? 1.5 : null;
};

// Names that match BOUNDED but legitimately exceed 1.
const CEILING_EXEMPT = [
  "degree-day-energy::eff", // AFUE or COP; a heat pump's COP is above 1
  "wood-nail-withdrawal::cd", // NDS load-duration factor CD, 1.6 for wind
  "wood-lag-withdrawal::cd",
  "wood-screw-withdrawal::cd",
  "wood-nail-lateral::cd",
  "hose-lay-section-count::slack_fraction", // a slack allowance, not a share
  "screen-deck-capacity::efficiency_factor", // sizing factor, ~2 at low efficiency
  "blast-fume-clearance-time::target_fraction_pct", // a percent; the compute caps it at 100
  "transformer-voltage-regulation::load_fraction", // per-unit loading, not a 0-1 share; legitimately above 1 (overload), the compute caps it at 3
];

test("sign typo: a non-negative input rejects a negative value or is listed as signed", async () => {
  const silent = await silentPerturbations(negate);
  const listed = new Set(SIGNED_INPUTS);
  const unlisted = silent.filter((k) => !listed.has(k));
  assert.deepEqual(
    unlisted,
    [],
    "These inputs return a different answer for a negative value with no error and no field min.\n" +
      "Guard them in the compute ({ error }) or, if the quantity is truly signed, add them to\n" +
      "test/fixtures/signed-inputs.js:\n  " + unlisted.join("\n  "),
  );
  // A listed input that now rejects negatives is stale; drop it so the list
  // stays a record of what is signed, not of what once was.
  const stale = SIGNED_INPUTS.filter((k) => !silent.includes(k));
  assert.deepEqual(stale, [], "Listed as signed but now rejects or ignores a negative; remove from signed-inputs.js:\n  " + stale.join("\n  "));
});

test("ceiling: an efficiency, lambda, Cd, or fraction past 1 (or 100%) errors or is exempt", async () => {
  const silent = await silentPerturbations(pastCeiling);
  const exempt = new Set(CEILING_EXEMPT);
  const unlisted = silent.filter((k) => !exempt.has(k));
  assert.deepEqual(unlisted, [], "These bounded inputs return an answer past their ceiling with no error and no field max:\n  " + unlisted.join("\n  "));
  const stale = CEILING_EXEMPT.filter((k) => !silent.includes(k));
  assert.deepEqual(stale, [], "Exempt but now rejects the value; remove from CEILING_EXEMPT:\n  " + stale.join("\n  "));
});

// The page marks a value below a field's `min` as invalid and strikes the
// result. A worked example or a field default that sits below its own field's
// minimum therefore loads as an invalid tile: ice-melt-working-temperature's
// eutectic default of -6 F sat in a field the shared factory drew as min="0"
// until 2026-10-09. Every example value and default must satisfy the minimum
// its field declares.
test("no worked-example value or default sits below its field's own minimum", async () => {
  const { rows } = JSON.parse(await readFile(FIXTURE, "utf8"));
  const bad = [];
  // Only a tile's FIRST row is what its Example button loads, and a default
  // of 0 is a blank field rather than a prefilled value.
  const first = new Map();
  for (const r of rows) if (!first.has(r.tile_id)) first.set(r.tile_id, r);
  for (const [id, row] of first) {
    if (!COMPUTE_MAP[id]) continue;
    const d = await describe({ id });
    if (!d || !d.inputs) continue;
    for (const f of d.inputs) {
      const min = declared(f, "min");
      if (f.kind !== "number" || min == null) continue;
      const ex = row.inputs[f.key];
      if (typeof ex === "number" && ex < min) bad.push(`${id}::${f.key} example ${ex} is below min ${min}`);
      if (typeof f.default === "number" && f.default !== 0 && f.default < min) bad.push(`${id}::${f.key} default ${f.default} is below min ${min}`);
    }
  }
  assert.deepEqual(bad, [], "These values load as invalid on their own page; drop the field's min or fix the value:\n  " + bad.join("\n  "));
});

// The declared-min blind spot: a bound that is declared but enforced nowhere.
//
// `negate` above SKIPS any field declaring `min >= 0`, on the reasoning that
// the page's number box already stops a negative there. The page does -- the
// AGENT DOOR does not. `run_calculator` hands the value straight to the
// compute, and 2,169 of the 2,256 calculators with numeric inputs declare a
// bound, so declaring one quietly removed a field from the only guard that was
// checking it.
//
// 69 such fields answered a negated worked example. Most only shift a number,
// which the door's out-of-range warning discloses. These 13 handed back a
// quantity that cannot exist -- a negative pipe diameter, a negative panel
// thickness, a negative total dynamic head, a negative solar gain, a negative
// moment -- with no error at all, and one of them (residential-framing's roof
// pitch) priced 42 more board feet of lumber off a nonsense input because the
// sign vanishes into the slope formula. All 13 now refuse, naming the field.
//
// This is the narrow, unambiguous half of the rule: not "a negative must be
// refused" but "a negative must not come back as an impossible magnitude".
const IMPOSSIBLE_EXEMPT = [
  // The compute DELIBERATELY accepts a negative discount rate ("The discount
  // rate must be above -100%") -- a negative real rate is a real thing -- and
  // only echoes the entered value back. Its page box still says min="0", so
  // the two surfaces disagree about whether a reader may type one; that is a
  // product question, not a wrong number, and it is left as it stands.
  "upgrade-roi::discount_rate_percent",
];

// Output names for which a negative is meaningful in its own right.
const SIGNED_OUTPUT = /temp|elev|delta|diff|change|profit|loss|margin|savings|net_|_net$|offset|declination|balance|variance|error|residual|skew|correction|adjust|gain|drift/i;

test("a field declaring min >= 0 does not answer a negative with an impossible magnitude", async () => {
  const { rows } = JSON.parse(await readFile(FIXTURE, "utf8"));
  const first = new Map();
  for (const r of rows) if (!first.has(r.tile_id)) first.set(r.tile_id, r);

  const bad = [];
  let probed = 0;
  for (const [id, row] of first) {
    const reg = COMPUTE_MAP[id];
    if (!reg) continue;
    const fn = (await importCalc(reg.module))[reg.fn];
    const d = await describe({ id });
    if (!d || !d.inputs) continue;
    const base = fn({ ...row.inputs });
    if (!base || base.error) continue;
    for (const f of d.inputs) {
      if (f.kind !== "number" && !(f.kind == null && typeof row.inputs[f.key] === "number")) continue;
      const v = Number(row.inputs[f.key]);
      if (!(v > 0)) continue;
      const min = f.attrs && f.attrs.min != null && f.attrs.min !== "" ? Number(f.attrs.min) : null;
      if (min === null || min < 0) continue;        // the first test already covers these
      if (IMPOSSIBLE_EXEMPT.includes(`${id}::${f.key}`)) continue;
      probed += 1;
      const r = fn({ ...row.inputs, [f.key]: -v });
      if (!r || r.error) continue;
      for (const [k, val] of Object.entries(r)) {
        if (typeof val !== "number" || !(val < 0)) continue;
        if (SIGNED_OUTPUT.test(k)) continue;
        if (typeof base[k] === "number" && base[k] < 0) continue;   // negative before the probe too
        bad.push(`${id}::${f.key} -> ${k}=${val} (was ${base[k]})`);
        break;
      }
    }
  }

  assert.ok(probed > 2000, `the declared-min population really is swept (${probed} field(s))`);
  assert.deepEqual(
    bad,
    [],
    `${bad.length} field(s) declare a minimum and answer a negative with a quantity that cannot exist:\n  ` + bad.join("\n  "),
  );
});

// A negative INSIDE a list input -- the surface neither guard was looking at.
//
// Both tests above iterate `describe().inputs` and probe a field whose example
// value is a NUMBER. A list input's value is an array, so every one of them was
// skipped. Nothing else covered it either: check-list-inputs.mjs tests that
// each value inside a row REACHES the calculation, not that an impossible one
// is refused.
//
// Neither surface stops it. The page cannot produce a negative there (each box
// it renders for a row carries min="0"), and `run_calculator` cannot warn about
// one, because the whole list arrives as a single field whose `attrs` are null
// -- validateNumbers reads `field.attrs` and returns early. 75 tiles bound more
// boxes on the page than the door has bounded fields, 327 boxes in all, and
// they are overwhelmingly list rows.
//
// Two of 84 probes answered with a quantity that cannot exist:
//   mileage-rollup   a negative trip returned a NEGATIVE deductible (-$16.80)
//                    and inflated implied personal miles from 1 to 85. It had
//                    a guard -- keyed to `t.miles`, while the loop reads
//                    `t.business_miles`, so the rule it states had never once
//                    fired. The same wrong-sub-key shape check-list-inputs.mjs
//                    exists for, on the guard instead of the data.
//   refrigerant-charge  a negative section length returned a NEGATIVE CHARGE,
//                    -10.25 oz, with the section itself at -15 oz.
test("a negative inside a list row does not come back as an impossible magnitude", async () => {
  const { rows } = JSON.parse(await readFile(FIXTURE, "utf8"));
  const first = new Map();
  for (const r of rows) if (!first.has(r.tile_id)) first.set(r.tile_id, r);

  const bad = [];
  let tiles = 0, probes = 0;
  for (const [id, row] of first) {
    const reg = COMPUTE_MAP[id];
    if (!reg) continue;
    const lists = Object.entries(row.inputs || {}).filter(([, v]) => Array.isArray(v) && v.length);
    if (!lists.length) continue;
    const fn = (await importCalc(reg.module))[reg.fn];
    let base;
    try { base = fn({ ...row.inputs }); } catch { continue; }
    if (!base || base.error) continue;
    tiles += 1;

    for (const [key, arr] of lists) {
      // Exactly one numeric leaf of the first row, so a normalised quantity
      // cannot cancel the perturbation out -- the ONE ELEMENT, NOT ALL rule
      // check-list-inputs.mjs learned the same way.
      const el = arr[0];
      const variants = [];
      if (typeof el === "number" && el > 0) {
        const copy = arr.slice();
        copy[0] = -el;
        variants.push([`${key}[0]`, copy]);
      } else if (typeof el === "string" && /^-?[\d.]+$/.test(el) && Number(el) > 0) {
        const copy = arr.slice();
        copy[0] = String(-Number(el));
        variants.push([`${key}[0]`, copy]);
      } else if (el && typeof el === "object") {
        for (const [sk, sv] of Object.entries(el)) {
          if (typeof sv !== "number" || !(sv > 0)) continue;
          const copy = arr.map((x) => ({ ...x }));
          copy[0][sk] = -sv;
          variants.push([`${key}[0].${sk}`, copy]);
        }
      }

      for (const [label, copy] of variants) {
        probes += 1;
        let r;
        try { r = fn({ ...row.inputs, [key]: copy }); } catch { continue; }
        if (!r || r.error) continue;
        for (const [k, val] of Object.entries(r)) {
          if (typeof val !== "number" || !(val < 0)) continue;
          if (SIGNED_OUTPUT.test(k)) continue;
          if (typeof base[k] === "number" && base[k] < 0) continue;
          bad.push(`${id}::${label} -> ${k}=${val} (was ${base[k]})`);
          break;
        }
      }
    }
  }

  assert.ok(tiles > 40, `the list-taking tiles are swept (${tiles} tiles, ${probes} probes)`);
  assert.deepEqual(
    bad,
    [],
    `${bad.length} list input(s) answered a negative element with a quantity that cannot exist:\n  ` + bad.join("\n  "),
  );
});

// The mirror of the declared-min blind spot: a DECLARED MAXIMUM.
//
// `pastCeiling` above returns null when a field declares a max, the same
// exemption `negate` makes for a declared min, and for the same stated reason
// -- the page's number box enforces it. The agent door enforces neither.
//
// The max side turned out far healthier than the min side: of 335 fields that
// declare one, 326 refuse a value past it. The nine that answer are listed
// here with the reason each is acceptable, so a TENTH shows up as a failure
// to be reviewed rather than joining them in silence.
//
// It found one real defect. `braking-distance`'s friction coefficient sits in
// the DENOMINATOR, so an impossible value runs the dangerous way: mu=3 (the box
// declares max 1; dry asphalt is 0.7-0.9) returned a 34 ft braking distance
// where the real answer is 144 ft. That one now refuses.
const PAST_MAX_REVIEWED = [
  // Arithmetically honest answers to an absurd input: the number moves the way
  // it should, a reader would see it, and the door's own max warning says the
  // value is outside the field. None of them understates a safety margin.
  "concrete::waste_factor",              // 300% waste: triples the material, visibly
  "material-cost::tax_rate_percent",     // a 41% sales tax; no jurisdiction has one
  "foam::foam_percentage",               // NFPA concentrates are 1/3/6%; 21% just scales
  "foam-max-coverage-area::foam_percentage",
  "piti::apr_percent",                   // a 61% APR; the payment follows correctly
  "piti::term_years",                    // a 101-year term; likewise
  "per-diem-interest::annual_rate_pct",
  // Bounded by something other than the field: the window cannot exceed the
  // data on hand, so a longer lookback simply returns every point there is.
  "historical-pricing::lookback_months",
  // Clamped by code, not ignored: IRC R311.7.5.1 caps a riser at 7-3/4 in, so
  // computeStairs adds risers until it fits and a 19 in "preference" lands on
  // the same 14 risers as 7.5 in. A smaller preference still moves the answer,
  // so this is a clamp rather than a dead input.
  "stairs::preferred_riser_height_in",
];

test("a field declaring a max answers past it only where that has been reviewed", async () => {
  const { rows } = JSON.parse(await readFile(FIXTURE, "utf8"));
  const first = new Map();
  for (const r of rows) if (!first.has(r.tile_id)) first.set(r.tile_id, r);

  const answered = [];
  let probed = 0;
  for (const [id, row] of first) {
    const reg = COMPUTE_MAP[id];
    if (!reg) continue;
    const fn = (await importCalc(reg.module))[reg.fn];
    const d = await describe({ id });
    if (!d || !d.inputs) continue;
    let base;
    try { base = fn({ ...row.inputs }); } catch { continue; }
    if (!base || base.error) continue;
    for (const f of d.inputs) {
      if (f.kind !== "number" && !(f.kind == null && typeof row.inputs[f.key] === "number")) continue;
      const max = declared(f, "max");
      if (max === null || !Number.isFinite(max)) continue;
      const v = Number(row.inputs[f.key]);
      if (!(v > 0) || v > max) continue;        // the example itself must be inside the bound
      probed += 1;
      let r;
      // Comfortably past the bound, and a fixed formula so the set is stable.
      try { r = fn({ ...row.inputs, [f.key]: max * 2 + 1 }); } catch { continue; }
      if (!r || r.error) continue;
      answered.push(`${id}::${f.key}`);
    }
  }

  assert.ok(probed > 300, `the declared-max population is swept (${probed} field(s))`);
  assert.deepEqual(
    answered.sort(),
    [...PAST_MAX_REVIEWED].sort(),
    "a field answering past its declared maximum that is not in PAST_MAX_REVIEWED. Check which way the " +
    "answer moves: braking-distance understated a stopping distance threefold because its friction " +
    "coefficient divides. If the answer is merely absurd rather than unsafe, add it with the reason.",
  );
});
