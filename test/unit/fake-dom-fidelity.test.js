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

// The third gap, and the one that fails most quietly: a selector the matcher
// cannot honor. `matchSel` read only the LAST compound of a selector, so
// `tbody tr` matched every row on the page. That over-matches -- it finds more
// than a browser would and nothing throws -- which is how a sweep built on this
// harness returns a confident wrong count. Driven through csvFromTable, the
// real page function that asks for exactly that selector.
test("fake DOM: a descendant selector matches only inside its ancestor", async () => {
  const { installDocument } = await import("../fixtures/fake-dom.js");
  const { csvFromTable } = await import("../../v5-platform.js");
  const doc = installDocument();

  const table = doc.createElement("table");
  const thead = doc.createElement("thead");
  const hrow = doc.createElement("tr");
  for (const h of ["Size", "Amps"]) {
    const c = doc.createElement("th");
    c.textContent = h;
    hrow.appendChild(c);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);
  const tbody = doc.createElement("tbody");
  for (const row of [["12 AWG", "20"], ["10 AWG", "30"]]) {
    const tr = doc.createElement("tr");
    for (const v of row) {
      const c = doc.createElement("td");
      c.textContent = v;
      tr.appendChild(c);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  assert.equal(table.querySelectorAll("tr").length, 3, "three rows in all");
  assert.equal(
    table.querySelectorAll("tbody tr").length,
    2,
    "but only two are inside the body -- the header row is not one of them",
  );
  // And the consequence, in the function that asks: the header must appear
  // once, as the header, and never again as a data row.
  assert.equal(csvFromTable(table), "Size,Amps\r\n12 AWG,20\r\n10 AWG,30");

  // The child combinator, so the same mistake cannot return through `>`.
  const outer = doc.createElement("div");
  const mid = doc.createElement("section");
  const leaf = doc.createElement("span");
  mid.appendChild(leaf);
  outer.appendChild(mid);
  assert.ok(leaf.matches("section > span"), "its direct parent satisfies `>`");
  assert.equal(leaf.matches("div > span"), false, "a grandparent does not");
  assert.ok(leaf.matches("div span"), "but it does satisfy a descendant selector");
});

// The fourth infidelity of the week, and the same shape as the first three: a
// property a browser defines that this harness did not.
//
// `HTMLOptionElement.text` is the words a reader actually chose.
// steps-panel.js's domFields prints `el.options[el.selectedIndex].text` for a
// select, so with `text` undefined it fell through to `el.value` -- and every
// sweep that read a select off the page under this harness saw the raw code.
// In a 2026-11-26 door-vs-page comparison that made 734 select values look
// like drift ("copper" vs "Copper", "single" vs "Single", "led_lighting" vs
// "LED lighting") when the door had been right every time. Fixing it dropped
// those 734 to 68, and what remained was real.
test("fake DOM: an option carries its text, as a browser does", async () => {
  const { installDocument } = await import("../fixtures/fake-dom.js");
  const doc = installDocument();

  const sel = doc.createElement("select");
  for (const [value, label] of [["copper", "Copper"], ["aluminum", "Aluminum"]]) {
    const o = doc.createElement("option");
    o.value = value;
    o.textContent = label;
    sel.appendChild(o);
  }
  assert.equal(sel.value, "copper", "the first option is selected by default");
  assert.equal(sel.options[sel.selectedIndex].text, "Copper", "and its TEXT is what the reader read");

  sel.value = "aluminum";
  assert.equal(sel.options[sel.selectedIndex].text, "Aluminum", "it follows the selection");

  // Only OPTION carries `text`, as in a browser: a div does not.
  const div = doc.createElement("div");
  div.textContent = "not an option";
  assert.equal(div.text, undefined);

  // The setter writes the text, so a renderer that assigns it is not silently lost.
  const o = doc.createElement("option");
  o.text = "Type C";
  assert.equal(o.textContent, "Type C");
  assert.equal(o.text, "Type C");
});

// A removed node must know it is removed.
//
// `replaceChildren` emptied `childNodes` and left every removed child still
// pointing at its old parent, so a node taken off the page went on looking
// attached for ever. Nothing noticed while `isConnected` was undefined -- it
// read as falsy and every path guarded by it bailed out. The two together is
// what bit: calc-field.js runs a 1 Hz interval that stops itself when its input
// region is detached ("the view-region clears between tools"), and the render
// sweeps clear a tile with exactly that call, so defining `isConnected` on top
// of the old `replaceChildren` left 2,288 intervals alive, firing on every
// later flush. steps-panel-guard went from 2.6s to over 200s.
test("fake DOM: a node detached from the document knows it", async () => {
  const { installDocument } = await import("../fixtures/fake-dom.js");
  const doc = installDocument();

  const view = doc.createElement("section");
  const inner = doc.createElement("div");
  view.appendChild(inner);
  doc.body.appendChild(view);
  assert.equal(view.isConnected, true, "attached to the body");
  assert.equal(inner.isConnected, true, "and so is a descendant");

  // The call the sweeps use between tiles.
  doc.body.replaceChildren();
  assert.equal(view.parentNode, null, "replaceChildren detaches what it removes");
  assert.equal(view.isConnected, false);
  assert.equal(inner.isConnected, false, "a descendant of a detached node is detached too");

  // removeChild has always detached; this keeps the two consistent.
  const other = doc.createElement("div");
  doc.body.appendChild(other);
  assert.equal(other.isConnected, true);
  doc.body.removeChild(other);
  assert.equal(other.isConnected, false);

  // A node that was never attached.
  assert.equal(doc.createElement("p").isConnected, false);
});

// The consequence, through the real code that depends on it: a tile's 1 Hz
// timer must not outlive its tile.
test("fake DOM: a tile's self-clearing interval stops when its region is cleared", async () => {
  const { installDocument, installTimers, flushTimers } = await import("../fixtures/fake-dom.js");
  installTimers();
  const doc = installDocument();

  const region = doc.createElement("div");
  doc.body.appendChild(region);
  let fired = 0;
  const tick = setInterval(() => {
    if (!region.isConnected) { clearInterval(tick); return; }
    fired += 1;
  }, 1000);

  flushTimers();
  assert.ok(fired > 0, "it runs while the region is on the page");

  doc.body.replaceChildren();
  const before = fired;
  flushTimers();
  flushTimers();
  assert.equal(fired, before, "and stops itself once the region is cleared, as calc-field.js intends");
});
