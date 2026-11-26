// The number an agent reads is the number on the page.
//
// `run_calculator` returns a `display` per output -- "260.5 kip-ft (phi =
// 0.90)" -- and the website prints its own line for the same output. Two
// strings that must agree, and `check-both-doors.mjs` checks that the output
// KEYS line up but never what they say.
//
// They agree today by construction rather than by luck: each module's
// `_simpleRenderer` publishes the schema as
// `{ key, label, unit, format: o.value }`, so the closure the door formats
// with IS the closure the page prints with. That is one line per module, in
// about a hundred modules, and a second closure written in any one of them
// would split the two surfaces silently -- an agent quoting a figure to a
// reader looking at a different one.
//
// It did NOT hold on three tiles, all of them hand-written renderers with a
// hand-authored schema beside them -- two strings written twice:
//   ohms-law                        page fmt(x, 3), schema fmt(x, 2): an agent
//                                   quoting "12.00 ohm" where the reader saw
//                                   "12.000 ohm".
//   transformer-voltage-regulation  the page prints a sign and says which way
//                                   ("+3.72% (voltage sags)"); the door said
//                                   "3.72 %".
//   termination-temp-ampacity       "208.0 A (derating)" against the page's
//                                   "208 A (derating governs)".
// All three now mirror their page's own line, and this sweeps every tile that
// prints output lines: each display string the door returns must appear
// verbatim in the page's output region.
import { test } from "node:test";
import assert from "node:assert/strict";

const FIXTURES = new URL("../fixtures/", import.meta.url);

test("every display the door returns is text the page prints", async () => {
  const fake = await import("../fixtures/fake-dom.js");
  fake.installTimers();
  fake.installFetch();
  const doc = fake.installDocument();
  if (!globalThis.CSS) globalThis.CSS = { escape: (s) => s };

  const { RENDERER_MAP } = await import("../fixtures/renderer-map.js");
  const { TOOLS } = await import("../../tools-data.js");
  const { describe, run } = await import("../../mcp/catalog.mjs");

  // Where the page's example BUTTON and the tile's fixture supply different
  // inputs, the two surfaces are answering different questions and their
  // strings have no reason to match. Each of these was checked that way -- the
  // page's own compute result differs from the compute on the fixture's inputs
  // -- rather than assumed: example-result-parity governs that difference, not
  // this test.
  const DIFFERENT_INPUTS = [
    "duct-leakage-cfm25",                 // the button picks a configuration; the fixture enters a limit
    "flocculation-g-value",               // the button fills water_temp_f, the fixture water_temp_c
    "concrete-depth-for-cracking-moment",
    "shaft-diameter-for-torsion",         // the button fills length and G, so no "(enter length and G)"
    "blower-door-ach50",                  // the button fills the N-factor range and degree days
    "kitchen-makeup-air-deficit",         // the page's door-closer default is 8 lbf, the compute's 0
  ];

  const ids = [];
  for (const tool of TOOLS) {
    if (!RENDERER_MAP[tool.id] || DIFFERENT_INPUTS.includes(tool.id)) continue;
    ids.push(tool.id);
  }

  const missing = [];
  let compared = 0, tiles = 0;
  for (const id of ids) {
    const reg = RENDERER_MAP[id];
    let rmod;
    try { rmod = await import(new URL(reg.module, FIXTURES).href); } catch { continue; }
    const render = rmod[reg.exportName] && rmod[reg.exportName][id];
    if (typeof render !== "function" || !render.schema || !Array.isArray(render.schema.outputs)) continue;

    let d;
    try { d = await describe({ id }); } catch { continue; }
    if (!d.runnable || !d.example) continue;

    doc.body.replaceChildren();
    const view = doc.createElement("section");
    const inputs = doc.createElement("div"), outputs = doc.createElement("div"), cite = doc.createElement("p");
    view.append(inputs, outputs, cite);
    doc.body.appendChild(view);
    try { await render(inputs, outputs, cite); fake.flushTimers(); } catch { continue; }
    const button = view.querySelectorAll("button").find((b) => b.classList && b.classList.contains("example-btn"));
    if (!button) continue;
    try { button.click(); fake.flushTimers(); } catch { continue; }
    const printed = String(outputs.textContent || "");
    if (!printed.trim()) continue;

    let out;
    try { out = await run({ id, inputs: { ...d.example.inputs } }); } catch { continue; }
    if (!out.result || out.result.error) continue;
    tiles += 1;
    for (const o of out.outputs || []) {
      if (typeof o.display !== "string" || !o.display.trim()) continue;
      compared += 1;
      if (!printed.includes(o.display)) {
        missing.push(`${id}/${o.key}: door says ${JSON.stringify(o.display)}, the page's lines do not contain it`);
      }
    }
  }

  assert.ok(tiles > 1100 && compared > 5000, `every tile that prints output lines is driven (${tiles} tiles, ${compared} displays)`);
  assert.deepEqual(
    missing.slice(0, 10),
    [],
    `${missing.length} display string(s) an agent would quote that the page never shows`,
  );
});
