// A MODE THAT RENDERS NOTHING IS A DEAD FORM ON A LIVE PAGE.
//
// 640 of the 2,288 tiles open with a mode select -- concrete's shape,
// metal-weight's profile, layout-squaring's find-diagonal against check-square
// -- and the controls below it are rebuilt per mode, inside a branch. Nothing
// exercised those branches. The render sweeps load each tile once, in its
// DEFAULT mode, so a branch that renders no controls at all would leave a
// reader who picks that mode looking at an empty form, and every existing gate
// would still be green.
//
// This drives each renderer under the fake DOM, walks every option of every
// multi-option select, and requires that a mode render at least one control
// where its siblings do. 3,493 modes in about 0.7s, so it earns its place in
// the push lane.
//
// WHAT IT DELIBERATELY DOES NOT DO: compare the controls a mode reveals against
// the inputs `describe()` publishes. Those disagree by design on 83 params, and
// the reason is upstream -- extract-bespoke-schemas.mjs reads a render
// function's SOURCE and so sees one branch, while the page builds the others at
// runtime. Driving the renderer instead is what this file shows is possible,
// but swapping the extractor's method is a feature with its own safety rules,
// not something to smuggle in behind a test. A first attempt at that comparison
// also mis-reported `adpi-diffuser-selection` by counting only `<input>` and
// missing that its cooling-load control is a `<select>`.
import { test } from "node:test";
import assert from "node:assert/strict";

// One mode is legitimately a SUBSET of its sibling rather than a branch of its
// own: layout-squaring's `find-diagonal` asks for a length and a width and
// returns the diagonal, and `check-square` asks for the same two plus the two
// measured diagonals. So find-diagonal adds nothing beyond the shared core and
// is complete as it stands. Listed, with the count pinned, so a second such
// mode has to be looked at rather than absorbed.
const BASE_MODE_ADDS_NOTHING = new Set([
  "layout-squaring [lsq-mode]: find-diagonal",
]);

test("every mode of every mode-selecting tile renders a form", async () => {
  const { installDocument, installTimers, flushTimers } = await import("../fixtures/fake-dom.js");
  const { RENDERER_MAP } = await import("../fixtures/renderer-map.js");
  installTimers();
  const doc = installDocument();

  const ROOT = new URL("../../", import.meta.url);
  let driven = 0, withSelect = 0, modes = 0;
  const empty = [];
  const exempted = [];
  const threw = [];

  for (const [id, reg] of Object.entries(RENDERER_MAP)) {
    let ns;
    try { ns = await import(new URL(reg.module.replace(/^(\.\.\/)+/, ""), ROOT).href); } catch { continue; }
    const fn = ns[reg.exportName] && ns[reg.exportName][id];
    if (typeof fn !== "function") continue;

    const inputRegion = doc.createElement("div");
    const outputRegion = doc.createElement("div");
    doc.body.replaceChildren();
    doc.body.appendChild(inputRegion);
    doc.body.appendChild(outputRegion);
    try { fn(inputRegion, outputRegion, doc.createElement("p")); flushTimers(); } catch { continue; }
    driven++;

    const selects = [...inputRegion.querySelectorAll("select")].filter((s) => s.options.length > 1);
    if (!selects.length) continue;
    withSelect++;

    // The IDS, not a count. A count of the whole input region is useless here
    // and the first version of this test proved it: the mode select itself and
    // any always-present box keep the total above zero, so emptying concrete's
    // column branch entirely did not fail. Measured against the controls common
    // to EVERY mode instead -- that set is the tile's invariant core, and a mode
    // must add at least one control beyond it where its siblings do.
    const controlIds = () => [
      ...inputRegion.querySelectorAll("input"),
      ...inputRegion.querySelectorAll("select"),
      ...inputRegion.querySelectorAll("textarea"),
    ].map((el) => el.id || el.name || "(anonymous)");

    for (const sel of selects) {
      const perMode = [];
      for (const value of [...sel.options].map((o) => o.value)) {
        sel.value = value;
        // The renderers listen for "input", not "change" -- a probe that fires
        // "change" sees only the default mode and reports a confident nothing.
        try { sel.dispatchEvent(new globalThis.Event("input", { bubbles: true })); flushTimers(); }
        catch (e) { threw.push(`${id} [${sel.id}] ${value}: ${e.message}`); continue; }
        modes++;
        perMode.push([value, new Set(controlIds())]);
      }
      if (perMode.length < 2) continue;
      // The invariant core: present in every mode.
      const core = [...perMode[0][1]].filter((cid) => perMode.every(([, ids]) => ids.has(cid)));
      const beyond = perMode.map(([value, ids]) => [value, [...ids].filter((cid) => !core.includes(cid)).length]);
      // Only meaningful against its own siblings: a tile whose every mode shows
      // the same controls is not switching a form, and has nothing to check.
      if (!beyond.some(([, n]) => n > 0)) continue;
      for (const [value, n] of beyond) {
        if (n > 0) continue;
        const key = `${id} [${sel.id}]: ${value}`;
        if (BASE_MODE_ADDS_NOTHING.has(key)) { exempted.push(key); continue; }
        empty.push(`${key} adds no controls of its own while its sibling modes do`);
      }
    }
  }

  // Reach, asserted so the gate cannot quietly stop finding its subject.
  assert.ok(driven > 2000, `only ${driven} renderers were driven; the sweep should reach the catalog`);
  assert.ok(withSelect > 500, `only ${withSelect} tiles offered a multi-option select (was 640)`);
  assert.ok(modes > 3000, `only ${modes} modes were exercised (was 3,493)`);
  assert.deepEqual(threw, [], "switching a mode must not throw");
  // Pinned: the one legitimate subset mode must still BE one, so removing it
  // from the renderer fails here too.
  assert.equal(exempted.length, 1, `the reviewed subset modes moved from 1 to ${exempted.length}: ${exempted.join(", ")}`);
  assert.deepEqual(empty, [], `a mode that adds no controls of its own leaves the reader a form that cannot describe it:\n${empty.join("\n")}`);
});
