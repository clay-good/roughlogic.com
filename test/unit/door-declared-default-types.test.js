// A worked example is not a complete type declaration.
//
// The door coerces a caller's "12" to 12 before a compute sees it, because
// JSON callers send numbers as strings and a compute that compares them orders
// them as text. It decides which fields are numeric from the schema's kind and,
// where there is none, from the type of the value the tile's WORKED EXAMPLE
// passes there.
//
// A publisher's worked example need not exercise every input -- an OPTIONAL one
// is exactly what an example leaves out -- so that second witness is silent for
// 84 of the door's 296 kind-less parameters, and those were handed to the
// compute exactly as typed. The 2026-10-09 boolean-word fix ("no", "off" and
// "0" are truthy strings, and 23 tiles read them as TRUE) therefore survived in
// the gap it could not see.
//
// A destructured default is itself a type declaration, so it is consulted as a
// third witness, last, after the schema and the example. This pins the defect
// it closed, the precedence that keeps it from moving anything else, and the
// two limits on how far it reaches.
import { test } from "node:test";
import assert from "node:assert/strict";

// The defect, on the tile that showed it. `motor-vd-starting`'s example sets a
// nameplate locked-rotor current and omits `lrc_estimated` (default `false`),
// so the string "false" reached the compute truthy and the answer carried a
// caveat about a figure the caller had read off the nameplate themselves.
test("door: a boolean the worked example never sets still reads its words", async () => {
  const { run } = await import("../../mcp/catalog.mjs");
  const base = {
    source_voltage_V: 480, length_ft: 250, cmils: 250000,
    lrc_A: 180, phase: "three", dip_limit_pct: 15,
  };
  const caveat = /LRC estimated as 6x FLA/;

  for (const falsey of [false, "false", "no", "off", "0", "n"]) {
    const r = await run({ id: "motor-vd-starting", inputs: { ...base, lrc_estimated: falsey } });
    assert.ok(r.result && !r.result.error, `ran for ${JSON.stringify(falsey)}`);
    assert.doesNotMatch(
      r.result.note, caveat,
      `${JSON.stringify(falsey)} means the nameplate was read, so the answer must not say the current was estimated`,
    );
  }
  // And the caveat must still appear when the caller DOES say it was estimated,
  // or this test would pass on a compute that simply never warns.
  for (const truthy of [true, "true", "yes", "on", "1"]) {
    const r = await run({ id: "motor-vd-starting", inputs: { ...base, lrc_estimated: truthy } });
    assert.match(r.result.note, caveat, `${JSON.stringify(truthy)} must keep the estimate caveat`);
  }
});

// The precedence, which is what makes the third witness safe to add: a field
// the example already types keeps the example's answer. `phase` is a string
// there, so it is never read as a number however it is sent.
test("door: the worked example outranks a declared default", async () => {
  const { run } = await import("../../mcp/catalog.mjs");
  const base = {
    source_voltage_V: "480", length_ft: "250", cmils: "250000",
    lrc_A: "180", phase: "three", dip_limit_pct: "15",
  };
  const strung = await run({ id: "motor-vd-starting", inputs: base });
  const typed = await run({
    id: "motor-vd-starting",
    inputs: { source_voltage_V: 480, length_ft: 250, cmils: 250000, lrc_A: 180, phase: "three", dip_limit_pct: 15 },
  });
  assert.ok(!strung.result.error, strung.result.error || "");
  assert.deepEqual(
    strung.result, typed.result,
    "the example's own fields answer the same sent as strings, which is the older witness still working",
  );
});

// A numeric parameter typed only by its default. No compute was measured
// answering these differently -- each one happens to run its input through
// Number() itself -- so this is the contract holding, not a bug reproduced:
// the door converts rather than relying on every compute to defend itself.
test("door: a numeric parameter the example omits is converted from its default's type", async () => {
  const { run } = await import("../../mcp/catalog.mjs");
  const base = { area_ft2: 100, tile_width_in: 12, tile_height_in: 12 };
  const a = await run({ id: "tile-count", inputs: { ...base, waste_factor: 0.15 } });
  const b = await run({ id: "tile-count", inputs: { ...base, waste_factor: "0.15" } });
  assert.ok(!a.result.error && !b.result.error);
  assert.deepEqual(b.result, a.result, "waste_factor is optional, and its default says it is a number");
});

// The whole surface, so a regression anywhere is caught and not just on the one
// tile that showed the defect. For every kind-less parameter that a witness --
// the worked example's value, or the declared default -- types as a number or a
// boolean, the answer must not depend on whether the caller sent it typed or as
// a string. This is the sweep that found `lrc_estimated`: it reported one
// divergence of 131 probes before the third witness, and none after.
test("door: no kind-less parameter answers differently sent as a string", async () => {
  const { describe, run } = await import("../../mcp/catalog.mjs");
  const { TOOLS } = await import("../../tools-data.js");
  const diverged = [];
  let probed = 0;
  for (const t of TOOLS) {
    let d;
    try { d = await describe({ id: t.id }); } catch { continue; }
    if (!d.runnable || !Array.isArray(d.inputs)) continue;
    const rows = d.examples || (d.example ? [d.example] : []);
    const ex = rows[0] && rows[0].inputs;
    if (!ex) continue;
    for (const f of d.inputs) {
      if (f.kind) continue;
      // The witness, in the door's own order: the example first, the default
      // only where the example is silent.
      const v = f.key in ex ? ex[f.key] : f.default;
      if (typeof v !== "number" && typeof v !== "boolean") continue;
      probed++;
      let typed;
      try { typed = await run({ id: t.id, inputs: { ...ex, [f.key]: v } }); } catch { continue; }
      let strung;
      try { strung = await run({ id: t.id, inputs: { ...ex, [f.key]: String(v) } }); }
      catch (e) { diverged.push(`${t.id}::${f.key} threw as a string: ${e.message}`); continue; }
      const a = JSON.stringify(typed && typed.result);
      const b = JSON.stringify(strung && strung.result);
      if (a !== b) diverged.push(`${t.id}::${f.key} (${typeof v}) sent as "${v}"\n    typed: ${String(a).slice(0, 150)}\n    string: ${String(b).slice(0, 150)}`);
    }
  }
  assert.ok(probed > 100, `the sweep must actually reach the parameters it claims to (probed ${probed})`);
  assert.deepEqual(diverged, [], `a string must answer as its own type:\n${diverged.join("\n")}`);
});

// The second limit, stated so it is not mistaken for an oversight: a list or
// object parameter is still published with no kind. The door's vocabulary is
// number | select | checkbox | text, none of which describes a list of rows,
// and the worked example returned beside the description is what shows their
// shape. 60 of the 296 kind-less parameters are these.
test("door: a structured parameter stays kind-less, and its example shows the shape", async () => {
  const { describe } = await import("../../mcp/catalog.mjs");
  const d = await describe({ id: "conduit-fill" });
  const field = (d.inputs || []).find((f) => f.key === "conductors");
  assert.ok(field, "conduit-fill takes a list of conductors");
  assert.equal(field.kind, null, "no kind in the vocabulary describes a list");
  const ex = (d.examples || (d.example ? [d.example] : []))[0];
  assert.ok(Array.isArray(ex && ex.inputs && ex.inputs.conductors), "so the worked example carries the shape instead");
  assert.ok(ex.inputs.conductors.length > 0);
});
