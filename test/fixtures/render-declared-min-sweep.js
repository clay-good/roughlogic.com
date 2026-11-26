// Which number boxes does the PAGE declare a minimum on?
//
// The bound-declaration campaign measured "fields with no declared min" from
// `describe()`, which reads a tile's schema. For a tile whose schema is
// extracted rather than declared, that is the wrong surface to ask: the rental
// worksheet builds every expense box with `makeNumber(..., { min: "0" })`, so
// the browser already marks a negative, while `describe()` reports `attrs:
// null` and the field looks unbounded. Five "missing" bounds were added to that
// tile's field table before anyone checked, and they were dead code -- the map
// that builds the boxes reads only `label` and `key`.
//
// This is the same correction the blank-box campaign needed twice: ask the PAGE
// what it built, not the compute or the schema. It renders every tile under the
// fake DOM, leaves the boxes exactly as the renderer made them, and reports the
// `min` attribute actually present on each number input.
//
// Prints a JSON report keyed by tile; a reader passes --tile=<id> for one.
import * as nodeModule from "node:module";

const { installDocument, installTimers, flushTimers } = await import("./fake-dom.js");
const { RENDERER_MAP } = await import("./renderer-map.js");
const { COMPUTE_MAP } = await import("./compute-map.js");
installTimers();
const doc = installDocument();
const { TOOLS } = await import("../../tools-data.js");

const ONLY = (process.argv.find((a) => a.startsWith("--tile=")) || "").slice(7);
const report = { rendered: 0, boxes: 0, withMin: 0, withoutMin: 0, tiles: {} };

for (const { id } of TOOLS) {
  if (ONLY && id !== ONLY) continue;
  const reg = RENDERER_MAP[id], creg = COMPUTE_MAP[id];
  if (!reg) continue;
  let render;
  try {
    render = (await import(new URL(reg.module, new URL("./", import.meta.url)).href))[reg.exportName]?.[id];
  } catch { continue; }
  if (typeof render !== "function") continue;

  doc.body.replaceChildren();
  const view = doc.createElement("section");
  const inputs = doc.createElement("div"), outputs = doc.createElement("div"), cite = doc.createElement("p");
  view.append(inputs, outputs, cite);
  doc.body.appendChild(view);
  try {
    await render(inputs, outputs, cite);
    flushTimers();
  } catch { continue; }
  report.rendered += 1;

  const boxes = inputs.querySelectorAll("input").filter((el) => el.type === "number");
  if (!boxes.length) continue;
  const rows = [];
  for (const el of boxes) {
    const min = el.getAttribute ? el.getAttribute("min") : null;
    rows.push({ id: el.getAttribute ? el.getAttribute("id") : null, min: min === null ? null : String(min) });
    report.boxes += 1;
    if (min === null || min === "") report.withoutMin += 1;
    else report.withMin += 1;
  }
  report.tiles[id] = rows;
}

console.log(JSON.stringify(report));
