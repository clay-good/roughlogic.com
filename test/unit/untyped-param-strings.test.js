// THE PARAMS NO WITNESS TYPES, AND WHAT A STRING DOES TO THEM.
//
// The door types a field from its schema kind, the worked example's value, or
// the compute parameter's declared default. 54 kind-less params have none of
// the three: they are the CONDITIONALLY RENDERED boxes -- concrete's column and
// footing dimensions, metal-weight's per-shape dimensions, layout-squaring's
// diagonals -- which the schema extractor captures only for the shape the
// worked example happens to use, plus a handful of optional strings and dates.
// So `coerceNumericStrings` leaves them alone and a caller's "7" reaches the
// compute as a string.
//
// That is a published-contract gap rather than an answer gap on most of them:
// the computes read their inputs through Number() and answer identically. This
// test is what establishes that, and it found the one place it was not true.
//
// `magnetic-declination` guarded its bearing conversion with
// `Number.isFinite(bearing_deg)` -- STRICTER than the compute it guards, which
// coerces on its next line. A caller's "7" failed that guard, so
// `converted_bearing_deg` was dropped in silence: no error, no warning, and
// declination, intensities and the model window all came back looking
// complete. An agent asking to convert a magnetic bearing to true got
// everything except the bearing. A missing output key is worse than a wrong
// one, because nothing in the answer says it is missing.
//
// THE REAL FIX IS UPSTREAM AND IS NOT THIS. These params are invisible to the
// door because the renderer declares them conditionally and the schema
// extractor reads one branch -- the same class as the mixed-select gap closed
// on 2026-10-09. Typing them from the `// dims:` annotations was considered and
// rejected: it would make the door depend on parsing source comments, and the
// annotation is per-ELEMENT, so `rainwater-yield::monthly_in = L` would publish
// `number` for a list of monthly rainfall figures. Until the extractor reaches
// a conditional branch, this test holds the line.
import { test } from "node:test";
import assert from "node:assert/strict";

// A string sent here comes back echoed in a numeric field. The computed answer
// is identical in every case -- only the echo of the caller's own input differs
// -- so these are listed rather than fixed: the echo follows the missing type,
// and the fix for that is the extractor.
const ECHOES_THE_CALLERS_STRING = new Set([
  "friction-loss::internal_diameter_in",
  "hydrostatic-test::multiplier",
  "dehumidifier::expected_pints_per_day",
]);

// Not a number at all: an ISO timestamp. Probing it with 7 against "7" compares
// two invalid inputs, which says nothing.
const NOT_NUMERIC = new Set(["hos-math::current_time_iso"]);

test("door: a kind-less, witness-less param answers the same sent as a string", async () => {
  const { describe, run } = await import("../../mcp/catalog.mjs");
  const { TOOLS } = await import("../../tools-data.js");

  const diverged = [];
  const probed = [];
  for (const t of TOOLS) {
    let d;
    try { d = await describe({ id: t.id }); } catch { continue; }
    if (!d.runnable || !Array.isArray(d.inputs)) continue;
    const ex = (d.examples || (d.example ? [d.example] : []))[0];
    const inputs = (ex && ex.inputs) || {};
    if (!Object.keys(inputs).length) continue;
    for (const f of d.inputs) {
      if (f.kind) continue;                                  // the schema types it
      if (f.key in inputs) continue;                         // the example types it
      const dv = f.default;
      if (typeof dv === "number" || typeof dv === "boolean") continue;  // the default types it
      if (Array.isArray(dv) || (dv && typeof dv === "object")) continue; // structured
      const id = `${t.id}::${f.key}`;
      if (NOT_NUMERIC.has(id)) continue;
      probed.push(id);
      let typed, strung;
      try { typed = await run({ id: t.id, inputs: { ...inputs, [f.key]: 7 } }); } catch { continue; }
      try { strung = await run({ id: t.id, inputs: { ...inputs, [f.key]: "7" } }); }
      catch (e) { diverged.push(`${id} threw as a string: ${e.message}`); continue; }
      const a = typed && typed.result;
      const b = strung && strung.result;
      // An OMITTED key is the failure that matters: the answer looks complete.
      const missing = Object.keys(a || {}).filter((k) => !(k in (b || {})));
      if (missing.length) { diverged.push(`${id}: sending a string DROPS ${missing.join(", ")} from the answer`); continue; }
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      if (ECHOES_THE_CALLERS_STRING.has(id)) {
        // Confirm it really is only the echo, or the exemption is hiding more.
        const differing = Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
        assert.deepEqual(differing, [f.key], `${id} is listed as echo-only but ${differing.join(", ")} differ`);
        continue;
      }
      diverged.push(`${id}\n    num: ${JSON.stringify(a).slice(0, 130)}\n    str: ${JSON.stringify(b).slice(0, 130)}`);
    }
  }

  // 54 before 2026-11-26, 24 after: the conditional-kinds extractor typed the
  // rest by driving the page, so they are no longer witness-less. The floor
  // guards against the sweep reaching nothing.
  assert.ok(probed.length > 15, `the sweep must reach the params it claims to (probed ${probed.length})`);
  assert.deepEqual(diverged, [], `a witness-less param must not answer differently sent as a string:\n${diverged.join("\n")}`);
});

// The bug, pinned on its own so the reason survives: a bearing sent as a string
// must still be converted, and a bearing that is genuinely absent or impossible
// must still be left out.
test("magnetic-declination: a bearing sent as a string is still converted", async () => {
  const { run } = await import("../../mcp/catalog.mjs");
  const base = { lat_deg: 39.7, lon_deg: -104.9, date: "2026-01-01" };
  const asNumber = (await run({ id: "magnetic-declination", inputs: { ...base, bearing_deg: 7 } })).result;
  assert.ok(Number.isFinite(asNumber.converted_bearing_deg), "a numeric bearing converts");

  const asString = (await run({ id: "magnetic-declination", inputs: { ...base, bearing_deg: "7" } })).result;
  assert.equal(asString.converted_bearing_deg, asNumber.converted_bearing_deg, "and so does the same bearing as a string");
  assert.deepEqual(Object.keys(asString), Object.keys(asNumber), "with no key dropped from the answer");

  // The other direction: silence and nonsense must still omit it rather than
  // convert a zero, or this test would pass on a guard that never refuses.
  for (const absent of [undefined, null, "", "abc", 400, -5]) {
    const inputs = { ...base };
    if (absent !== undefined) inputs.bearing_deg = absent;
    const r = (await run({ id: "magnetic-declination", inputs })).result;
    assert.equal(r.converted_bearing_deg, undefined, `${JSON.stringify(absent)} must not produce a converted bearing`);
    assert.ok(Number.isFinite(r.declination_deg), "while the declination itself still answers");
  }
});
