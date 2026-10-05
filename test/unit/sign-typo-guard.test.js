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

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { COMPUTE_MAP, importCalc } from "../fixtures/compute-map.js";
import { SIGNED_INPUTS } from "../fixtures/signed-inputs.js";
import { describe } from "../../mcp/catalog.mjs";

const FIXTURE = new URL("../fixtures/worked-examples.json", import.meta.url);

// Round so float noise in an untouched path does not read as a change.
const stable = (o) => JSON.stringify(o, (k, v) => (typeof v === "number" ? Math.round(v * 1e6) / 1e6 : v));

async function silentSignTypos() {
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
      const min = f.attrs && f.attrs.min != null && f.attrs.min !== "" ? Number(f.attrs.min) : null;
      if (min != null && min >= 0) continue;
      const r = fn({ ...row.inputs, [f.key]: -v });
      if (r && r.error) continue;
      if (stable(r) === base) continue;
      silent.push(`${id}::${f.key}`);
    }
  }
  return silent;
}

test("sign typo: a non-negative input rejects a negative value or is listed as signed", async () => {
  const silent = await silentSignTypos();
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
