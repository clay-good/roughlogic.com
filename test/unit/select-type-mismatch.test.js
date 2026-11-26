// WHY THREE TILES PUBLISH NO ENUM, PINNED SO A FOURTH IS NOTICED.
//
// A tile's page offers a mode select; `describe()` publishes its options, and
// `validateSelects` then refuses an out-of-set value with the allowed ones
// named (spec-v1184) rather than coercing a bad enum into a wrong number. The
// schema extractor withholds the enum when "no select value is Number()-coerced
// (that string->number mismatch would feed a wrong-typed value to run())".
//
// That refusal is correct, and it is doing real work on three tiles, where the
// PAGE'S SELECT and the TILE'S OWN WORKED EXAMPLE disagree about the type of
// the same input:
//
//   exterior-opening-protection  select "no"|"yes"      example `protected: true`
//   egress-capacity              select "yes"|"no"      example `sprinklered: true`
//   nfpa-1142-water-supply       select "3".."7"        example `occupancy_class: 7`
//
// Publishing the enum on the first of those was tried twice in 2026-11 and
// reverted both times: it makes the calculator's own worked example fail
// validation through the door. Each compute reads either form, so nothing is
// wrong on screen and nothing is wrong through the door -- the three surfaces
// simply disagree about the canonical value, and the extractor is right to say
// so by withholding rather than guessing.
//
// This pins the set at three. A fourth tile acquiring the mismatch is a real
// finding -- it means another enum is being withheld -- and so is one of these
// being aligned, because the enum should then be published.
import { test } from "node:test";
import assert from "node:assert/strict";

// id -> the input whose select-vs-example types disagree.
const MISMATCHED = [
  ["exterior-opening-protection", "protected"],
  ["egress-capacity", "sprinklered"],
  ["nfpa-1142-water-supply", "occupancy_class"],
];

test("a select whose options and worked example disagree on type publishes no enum", async () => {
  const { describe } = await import("../../mcp/catalog.mjs");
  const { installDocument, installTimers, flushTimers } = await import("../fixtures/fake-dom.js");
  const { RENDERER_MAP } = await import("../fixtures/renderer-map.js");
  installTimers();
  const doc = installDocument();
  const ROOT = new URL("../../", import.meta.url);

  for (const [id, key] of MISMATCHED) {
    const d = await describe({ id });
    const field = (d.inputs || []).find((f) => (f.key ?? f.name) === key);
    assert.ok(field, `${id} advertises ${key}`);
    assert.ok(!field.options, `${id}.${key} must publish NO option list while the types disagree`);

    // The page really does offer a select for it, so the enum is withheld
    // rather than absent: drive the renderer and find an option set that is
    // typed differently from the example's value.
    const reg = RENDERER_MAP[id];
    const ns = await import(new URL(reg.module.replace(/^(\.\.\/)+/, ""), ROOT).href);
    const render = ns[reg.exportName][id];
    const inputRegion = doc.createElement("div");
    const outputRegion = doc.createElement("div");
    doc.body.replaceChildren();
    doc.body.appendChild(inputRegion);
    doc.body.appendChild(outputRegion);
    render(inputRegion, outputRegion, doc.createElement("p"));
    flushTimers();
    const selects = [...inputRegion.querySelectorAll("select")];
    assert.ok(selects.length, `${id} renders at least one select`);
    assert.ok(
      selects.every((s) => [...s.options].every((o) => typeof o.value === "string")),
      "a select's option values are strings, which is the whole point",
    );

    const rows = d.examples || (d.example ? [d.example] : []);
    const exValue = ((rows[0] && rows[0].inputs) || {})[key];
    const viaDefault = exValue === undefined;
    const value = viaDefault ? field.default : exValue;
    assert.ok(
      typeof value !== "string",
      `${id}.${key} is the mismatch: the select offers strings and the ${viaDefault ? "default" : "example"} is ${JSON.stringify(value)}`,
    );

    // And each compute reads the example's form, so the tile itself is sound --
    // this is a disagreement about the canonical value, not a broken tile.
    const { run } = await import("../../mcp/catalog.mjs");
    const ran = await run({ id });
    assert.ok(ran.result && !ran.result.error, `${id} still answers its own worked example: ${ran.result && ran.result.error}`);
  }
});

// The other side of the same measurement: the selects whose types DO agree are
// refused correctly today by their own computes, which is why withholding the
// enum costs nothing but a round trip. If one of these ever stops refusing, the
// enum is worth publishing after all.
test("a select-backed input with no published enum still refuses a value off its list", async () => {
  const { describe, run } = await import("../../mcp/catalog.mjs");
  for (const [id, key] of [
    ["egress-capacity", "occupancy_group"],
    ["egress-capacity", "story"],
    ["egress-capacity", "path"],
    ["nfpa-1142-water-supply", "construction_class"],
  ]) {
    const d = await describe({ id });
    const rows = d.examples || (d.example ? [d.example] : []);
    const ex = (rows[0] && rows[0].inputs) || {};
    const bad = await run({ id, inputs: { ...ex, [key]: "__NOT_AN_OPTION__" } });
    assert.ok(
      bad.result && bad.result.error,
      `${id}.${key} publishes no enum, so its COMPUTE must refuse a value off the list`,
    );
  }
});
