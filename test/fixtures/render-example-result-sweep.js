// The page's "Test with example" button and the tile's worked example are meant
// to be the same calculation. Other gates compare the button's FORM values with
// the fixture's inputs; none compared what the page then COMPUTED. On
// 2026-11-15 irrigation-uniformity read its four blank catch-can rows as dry
// cans (Number("") is 0), so its own example printed DU 0.0% while the fixture
// said 99. This drives every renderer against the fake DOM with each exported
// compute wrapped (compute-spy-loader.js), clicks the example, and holds the
// result the page's compute call returned against the compute run on the
// fixture's row-0 inputs: every output the fixture row declares (the "You get"
// figures the static page prints) must come back the same from the page, at the
// 0.1% a reader can see. Extra inputs the button fills to show a further line
// (a footing moment, a door closer) are fine as long as they leave those alone. Prints a JSON report; see
// example-result-parity.test.js.
import * as nodeModule from "node:module";
import { readFileSync } from "node:fs";
if (nodeModule.registerHooks) nodeModule.registerHooks({ load: (await import("./compute-spy-loader.js")).load });
else nodeModule.register("./compute-spy-loader.js", import.meta.url);

let last = new Map();
globalThis.__computeSpy = (fn, name) => function (...a) {
  const r = fn.apply(this, a);
  last.set(name, r);
  return r;
};

const { installDocument, installTimers, flushTimers } = await import("./fake-dom.js");
const { RENDERER_MAP } = await import("./renderer-map.js");
const { COMPUTE_MAP } = await import("./compute-map.js");
installTimers();
const doc = installDocument();
const { TOOLS } = await import("../../tools-data.js");
const ROWS = JSON.parse(readFileSync(new URL("./worked-examples.json", import.meta.url), "utf8")).rows;
const first = new Map();
for (const r of ROWS) if (!first.has(r.tile_id)) first.set(r.tile_id, r);

// At the precision a reader can see, as check-example-parity compares inputs:
// the button types 66.82 where the fixture carries 66.8235.
const close = (a, b) => a === b || Math.abs(a - b) <= Math.max(Math.abs(b) * 0.001, 1e-12);
const report = { compared: 0, mismatches: {}, dirty: [] };
for (const { id } of TOOLS) {
  const reg = RENDERER_MAP[id], creg = COMPUTE_MAP[id], row0 = first.get(id);
  if (!reg || !creg || !row0) continue;
  const inputs0 = row0.inputs, printed = new Set(Object.keys(row0.outputs || {}));
  const mod = await import(new URL(creg.module, new URL("./", import.meta.url)).href);
  const render = (await import(new URL(reg.module, new URL("./", import.meta.url)).href))[reg.exportName]?.[id];
  if (typeof render !== "function" || typeof mod[creg.fn] !== "function") continue;
  doc.body.replaceChildren();
  const view = doc.createElement("section");
  const inputs = doc.createElement("div"), outputs = doc.createElement("div"), cite = doc.createElement("p");
  view.append(inputs, outputs, cite);
  doc.body.appendChild(view);
  try {
    await render(inputs, outputs, cite);
    flushTimers();
    const btn = view.querySelectorAll("button").find((b) => b.classList.contains("example-btn"));
    if (!btn) continue;
    last = new Map();
    btn.click();
    flushTimers();
    const page = last.get(creg.fn);
    if (!page || typeof page !== "object" || page.error) continue;
    // Fill every box and pick the last option of every select, then press the button
    // again: the answer must be the same, because the example resets what it does not
    // name (103 tiles kept the reader's optional boxes until 2026-11-15).
    { const fire = (el) => { el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
      for (const el of inputs.querySelectorAll("input")) if (el.type === "number" || el.type === "text") { el.value = el.type === "number" ? "3" : el.value; fire(el); }
      for (const el of inputs.querySelectorAll("select")) { const o = el.querySelectorAll ? el.querySelectorAll("option") : []; if (o.length > 1) { el.value = o[o.length - 1].value; fire(el); } }
      flushTimers(); last = new Map(); btn.click(); flushTimers();
      const again = last.get(creg.fn);
      if (again && typeof again === "object") { const d = Object.entries(page).filter(([k, v]) => typeof v === "number" && Number.isFinite(v) && !(typeof again[k] === "number" && close(v, again[k])));
        if (d.length || again.error) report.dirty.push(id + ": " + (again.error ? "ERROR " + again.error.slice(0, 60) : d.slice(0, 2).map(([k, v]) => k + " " + v + " -> " + again[k]).join("; "))); } }
    const want = mod[creg.fn](structuredClone(inputs0));
    if (!want || typeof want !== "object" || want.error) continue;
    report.compared++;
    const diff = Object.entries(want).filter(([k, v]) => printed.has(k) && typeof v === "number" && Number.isFinite(v) && !(typeof page[k] === "number" && close(v, page[k])));
    if (diff.length) report.mismatches[id] = diff.slice(0, 3).map(([k, v]) => `${k} page ${page[k]} vs example ${v}`).join("; ") + (diff.length > 3 ? ` (+${diff.length - 3} more)` : "");
  } catch { /* render-text-sweep reports crashes */ }
}
process.stdout.write(JSON.stringify(report));
