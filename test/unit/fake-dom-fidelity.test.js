// The harness has to answer like a browser, or every sweep built on it is
// measuring the harness.
//
// Two gaps have already cost real measurements. The `value` ATTRIBUTE was not
// reflected into the property, so every render sweep saw a prefilled box as
// blank and the blank-box campaign reported 1,591 hidden defaults that were
// visible all along (2026-11-24). `htmlFor` was not reflected to the `for`
// attribute, so `label[for="..."]` matched nothing, steps-panel.js's domFields
// returned no fields, and any sweep of the panel's page path could only report
// a clean zero (2026-11-26).
//
// Both are the same mistake: a REFLECTED IDL attribute, where the property and
// the attribute are two views of one value. This pins the ones this project's
// instruments actually read, and the three that must NOT reflect, because
// getting that backwards is the other half of the same error.
import { test } from "node:test";
import assert from "node:assert/strict";

test("fake DOM: a reflected property is readable as its attribute, as in a browser", async () => {
  const { installDocument } = await import("../fixtures/fake-dom.js");
  const doc = installDocument();

  // min / max / step. Most boxes get these through makeNumber's setAttribute
  // loop, but cost-output.js -- which many tiles share -- assigns the PROPERTY
  // (`input.step = "any"; input.min = "0"`), and so do a few hand-built rows.
  // Those were invisible to anything reading the attribute, which included this
  // project's own declared-minimum sweep: it read 7,756 of 8,547 boxes bounded
  // when the true figure was 7,765.
  const box = doc.createElement("input");
  box.type = "number";
  box.min = "0";
  box.max = "10";
  box.step = "any";
  assert.equal(box.getAttribute("min"), "0", "min reflects to its attribute");
  assert.equal(box.getAttribute("max"), "10");
  assert.equal(box.getAttribute("step"), "any");
  assert.equal(box.min, "0", "and reads back through the property");

  // `hidden`, because steps-panel.js skips a control with closest("[hidden]"),
  // and only an attribute can match that.
  const h = doc.createElement("div");
  assert.equal(h.hidden, false, "a fresh element is not hidden");
  assert.equal(h.getAttribute("hidden"), null);
  h.hidden = true;
  assert.equal(h.getAttribute("hidden"), "", "hidden=true sets the attribute");
  assert.ok(h.matches("[hidden]"), "and the attribute selector finds it");
  h.hidden = false;
  assert.equal(h.getAttribute("hidden"), null, "hidden=false REMOVES it, as a browser does");
  assert.equal(h.hidden, false);

  // htmlFor -> for, the gap that disarmed the steps-panel sweep.
  const lab = doc.createElement("label");
  lab.htmlFor = "abc";
  assert.equal(lab.getAttribute("for"), "abc");

  // The value ATTRIBUTE is the default and seeds the property, which is what
  // `makeNumber(l, id, { value: "45" })` relies on to prefill a box.
  const pre = doc.createElement("input");
  pre.setAttribute("value", "45");
  assert.equal(pre.value, "45", "the value attribute seeds the property");
});

test("fake DOM: value, checked and selected do NOT write back to the attribute", async () => {
  const { installDocument } = await import("../fixtures/fake-dom.js");
  const doc = installDocument();
  // The other half of the same error. For these three the attribute is the
  // DEFAULT and the property is the current state: typing in a box does not
  // rewrite its `value` attribute, and a browser keeps them apart. A harness
  // that reflected them would make a dirtied box look pristine, which is how a
  // sweep concludes that a reader never typed anything.
  const el = doc.createElement("input");
  el.value = "5";
  assert.equal(el.getAttribute("value"), null, "typing does not rewrite the value attribute");
  assert.equal(el.value, "5", "but the property holds what was typed");

  const cb = doc.createElement("input");
  cb.type = "checkbox";
  cb.checked = true;
  assert.equal(cb.getAttribute("checked"), null, "ticking does not set the checked attribute");
  assert.equal(cb.checked, true);

  const opt = doc.createElement("option");
  opt.selected = true;
  assert.equal(opt.getAttribute("selected"), null, "selecting does not set the selected attribute");
  assert.equal(opt.selected, true);
});
