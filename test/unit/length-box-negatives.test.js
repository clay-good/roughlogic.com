// A LENGTH BOX IS THE ONE PLACE NO OTHER GUARD IS WATCHING.
//
// `makeNumber` turns a box whose label names feet or inches into a LENGTH box
// (spec-v1970), so a reader can type `8'6"` or `3-1/2`. Doing that costs the
// native number input: `makeLengthEntry` sets `type = "text"` and redefines
// `value` to return the parsed decimal. 1,846 distinct labels across the
// catalog become one.
//
// Which leaves a field declaring `min="0"` with nothing enforcing it:
//
//   - The BROWSER does not, because the box is text. makeLengthEntry checks the
//     bound itself and reports it through `setCustomValidity`, but the `value`
//     getter still returns the parsed decimal, so the renderer reads -4 from a
//     field it has just marked invalid and computes with it. Verified on
//     `concrete`: typing -4 into "Thickness (in)" sets the message "Enter 0 or
//     more." and hands `thickness_in: -4` to the compute.
//   - The SIGN-TYPO GUARD does not, because it negates only a field that
//     declares NO `min >= 0` -- explicitly "because the page's box stops it".
//     For a length box that premise is false.
//
// So the invariant is held entirely by each compute's own negative check, and
// nothing asserted that. It holds: 2,136 length boxes with a declared minimum,
// every one of them either refusing a negative or answering exactly as it would
// for 0. This keeps it true -- a new length box whose compute forgets its guard
// fails here, where the two sweeps that look like they would catch it will not.
//
// REACH, STATED. This sweep needs a published `min` and a positive value in the
// worked example, so it covers the 2,136 length boxes whose schema carries
// both. It does NOT reach the CONDITIONALLY RENDERED ones -- concrete's
// thickness and metal-weight's profile dimensions publish `attrs: null`,
// because the schema extractor reads one branch of their mode select, and the
// example exercises one shape so there is no positive value to negate either.
// The second test covers that class by driving the page instead, on the tile
// that demonstrates it.
//
// About four seconds, so it runs in the push lane.
import { test } from "node:test";
import assert from "node:assert/strict";

test("a length box with a declared minimum never answers on a negative", async () => {
  const { describe, run } = await import("../../mcp/catalog.mjs");
  const { lengthUnitOf } = await import("../../length-entry.js");
  const { TOOLS } = await import("../../tools-data.js");

  const answered = [];
  let probed = 0;
  for (const t of TOOLS) {
    let d;
    try { d = await describe({ id: t.id }); } catch { continue; }
    if (!d.runnable || !Array.isArray(d.inputs)) continue;
    const rows = d.examples || (d.example ? [d.example] : []);
    const ex = rows[0] && rows[0].inputs;
    if (!ex) continue;

    for (const f of d.inputs) {
      // A length box is decided by the LABEL, exactly as makeNumber decides it.
      if (typeof f.label !== "string" || !lengthUnitOf(f.label)) continue;
      const min = f.attrs && f.attrs.min;
      if (min === undefined || min === null || Number(min) < 0) continue;
      const value = ex[f.key];
      if (typeof value !== "number" || value <= 0) continue;
      probed++;

      let negative, atZero;
      try { negative = await run({ id: t.id, inputs: { ...ex, [f.key]: -value } }); } catch { continue; }
      try { atZero = await run({ id: t.id, inputs: { ...ex, [f.key]: 0 } }); } catch { continue; }
      const neg = (negative && negative.result) || {};
      const zero = (atZero && atZero.result) || {};
      if (neg.error) continue;                                     // refused outright
      if (JSON.stringify(neg) === JSON.stringify(zero)) continue;  // read as 0, so harmless
      answered.push(`${t.id}::${f.key} ("${f.label}", min=${min}) answered on ${-value}: ${JSON.stringify(neg).slice(0, 140)}`);
    }
  }

  assert.ok(probed > 2000, `the sweep must reach the length boxes it claims to (probed ${probed}, was 2,136)`);
  assert.deepEqual(
    answered, [],
    `a negative length must be refused, or read as 0 -- the page's text box does not stop it and the sign-typo guard skips it:\n${answered.join("\n")}`,
  );
});

// The premise, pinned on the tile that demonstrates it, so the test above
// cannot quietly become vacuous if length boxes ever regain native validation.
test("a length box hands the renderer a negative it has just marked invalid", async () => {
  const { installDocument, installTimers, flushTimers } = await import("../fixtures/fake-dom.js");
  installTimers();
  const doc = installDocument();
  const { renderConcrete } = await import("../../calc-construction.js");

  const inputRegion = doc.createElement("div");
  const outputRegion = doc.createElement("div");
  doc.body.appendChild(inputRegion);
  doc.body.appendChild(outputRegion);
  renderConcrete(inputRegion, outputRegion, doc.createElement("p"));
  flushTimers();

  const box = [...inputRegion.querySelectorAll("input")].find((i) => i.id === "co-thickness_in");
  assert.ok(box, "the slab thickness box");
  assert.equal(box.type, "text", "a length box is text, so the browser enforces no bound");
  assert.equal(box.getAttribute("min"), "0", "and it declares one all the same");

  // A valid slab first, so the tile is answering before the negative goes in.
  const byId = new Map([...inputRegion.querySelectorAll("input")].map((i) => [i.id, i]));
  for (const [id, v] of [["co-length_ft", "10"], ["co-width_ft", "10"], ["co-thickness_in", "4"]]) {
    byId.get(id).value = v;
    byId.get(id).dispatchEvent(new globalThis.Event("input", { bubbles: true }));
  }
  flushTimers();
  assert.match(outputRegion.textContent, /3\.7|3\.70|Cubic yards/, "the slab answers first");

  box.value = "-4";
  box.dispatchEvent(new globalThis.Event("input", { bubbles: true }));
  flushTimers();
  assert.match(box.validationMessage, /0 or more/, "makeLengthEntry does report the bound");
  assert.equal(box.value, "-4", "but the value getter still hands over the negative");

  // So the COMPUTE is the only thing left, and it must refuse. This is the
  // conditionally-rendered class the sweep above cannot reach, checked here on
  // the tile that shows it: a negative thickness must not produce a volume.
  assert.match(
    outputRegion.textContent,
    /cannot be negative/,
    "the compute refuses the negative the box handed it, since nothing before it did",
  );
});
