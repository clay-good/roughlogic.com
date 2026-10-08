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
      if (f.kind !== "number") continue;
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
const BOUNDED = /(^|_)eff(_|$)|efficiency|^lambda$|^cd$|fraction$|_fraction_|^runoff_c$/i;
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
