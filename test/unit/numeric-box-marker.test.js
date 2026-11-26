// A NUMERIC BOX IS NOT ALWAYS type="number", AND READING type MISTYPES IT.
//
// `makeNumber` ends with `if (unit) makeLengthEntry(input, wrap, unit)`: a box
// whose LABEL names feet or inches is converted to `type="text"` on purpose, so
// a reader can type `8'6"` or `3-1/2` into it (spec-v1970; the behaviour has its
// own integration lane, length-entry.test.js). So on `concrete`, "Waste factor
// (0-1)" is `type="number"` while "Length (ft)", "Thickness (in)" and "Diameter
// (in)" are all `type="text"` -- from the same factory, in the same renderer.
//
// Anything inferring a field's KIND from `type` therefore mistypes every length
// box as free text. That is not hypothetical: a 2026-11-26 sweep that drove
// each renderer and read `input.type` reported `concrete::diameter_in` and all
// seven of `metal-weight`'s profile dimensions as `text`, and publishing that
// into the agent contract would have told an agent to send a string where the
// page sends a number -- a FALSE type, which is worse than the `null` those
// fields carry today.
//
// `inputMode` is the marker that survives the conversion: `makeNumber` sets
// `decimal` before length entry can rewrite `type`, and `makeText` sets none.
// This pins both halves, because a sweep is only safe if the distinction holds.
import { test } from "node:test";
import assert from "node:assert/strict";

test("makeNumber marks a box numeric with inputMode, whatever its type ends up", async () => {
  const { installDocument, installTimers } = await import("../fixtures/fake-dom.js");
  installTimers();
  installDocument();
  const { makeNumber, makeText } = await import("../../ui-fields.js");

  // A label with no length unit keeps type="number".
  for (const label of ["Waste factor (0-1)", "Temperature (F)", "Current (A)"]) {
    const f = makeNumber(label, "t-" + label.length, { step: "any", min: "0" });
    assert.equal(f.input.type, "number", `${label} has no length unit, so it stays a number box`);
    assert.equal(f.input.inputMode, "decimal", `${label} is marked numeric`);
  }

  // A label naming feet or inches becomes type="text" BY DESIGN, and is still
  // numeric. If this ever flips back, length entry has been lost and
  // length-entry.test.js should be the one failing -- but a sweep reading
  // `type` would also silently start working, so the two are pinned together.
  for (const label of ["Length (ft)", "Thickness (in)", "Diameter (in)"]) {
    const f = makeNumber(label, "u-" + label.length, { step: "any", min: "0" });
    assert.equal(f.input.type, "text", `${label} takes 8'6" and 3-1/2, so it is a text box on purpose`);
    assert.equal(f.input.inputMode, "decimal", `${label} is STILL numeric -- this is the marker a sweep must read`);
    assert.equal(f.input.getAttribute("min"), "0", "and it keeps the bound the caller declared");
  }

  // Free text sets no inputMode, which is what makes the two distinguishable.
  const t = makeText("Chemical formula", "v-1", {});
  assert.equal(t.input.type, "text");
  assert.equal(t.input.inputMode, undefined, "makeText leaves inputMode unset, so `decimal` means numeric");
});

// The same thing through a real renderer, because the invariant only matters
// where a sweep meets it: concrete's mode-dependent dimension boxes.
test("concrete's dimension boxes are text-typed and numeric at once", async () => {
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

  const byId = new Map([...inputRegion.querySelectorAll("input")].map((i) => [i.id, i]));
  const waste = byId.get("co-w");
  assert.ok(waste, "the waste-factor box is always present");
  assert.equal(waste.type, "number", "its label names no length unit");

  for (const id of ["co-length_ft", "co-width_ft", "co-thickness_in"]) {
    const box = byId.get(id);
    assert.ok(box, `${id} is in the default (slab) mode`);
    assert.equal(box.type, "text", `${id} is a length box, so type is text by design`);
    assert.equal(box.inputMode, "decimal", `${id} is numeric all the same`);
  }

  // Both kinds of box live in one renderer, which is the whole trap: a sweep
  // that reads `type` gets a different answer for two fields the same factory
  // made, and neither answer is wrong about the DOM.
  assert.notEqual(waste.type, byId.get("co-length_ft").type);
  assert.equal(waste.inputMode, byId.get("co-length_ft").inputMode);
});
