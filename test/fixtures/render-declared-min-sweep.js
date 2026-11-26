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
//
// TWO THINGS TO KNOW BEFORE DECLARING ANOTHER BOUND FROM A SWEEP LIKE THIS.
//
// 1. "The compute errors when I negate this field" DOES NOT mean the field is
//    non-negative. It was the criterion that declared 2,083 bounds here, and it
//    holds for those -- every one of them refuses with wording about that field
//    ("HP must be positive", "Provide positive rise and run", "Relative
//    humidity is between 0 and 100%"). It does NOT hold generally, and the
//    remaining hand-built fields are where it breaks:
//      distance-distance-intersection::n0_ft  negating a survey NORTHING moves
//        the control points 10,000 ft apart, so the error is "the two distances
//        are too short to meet" -- about the geometry. A negative northing is
//        perfectly valid on a local grid.
//      refrigeration-cop::h4_btulb  negating an ENTHALPY pushes COP past the
//        Carnot limit, so the error is about the cycle. Refrigerant enthalpies
//        are reference-state values and go negative; signed-inputs.js lists one
//        of them for exactly that reason.
//      edm-slope-reduction::angle_deg  the real bound is 0 to 180 (90 = level),
//        which the compute states itself.
//    So an incidental refusal reads exactly like a real one. Check that the
//    message concerns the FIELD, and for anything signed in principle --
//    coordinates, enthalpies, angles, arms, elevations -- check the physics
//    rather than the error.
//
// 2. A DECLARED MINIMUM IS THE PROTECTION, so a compute need not also guard it.
//    `sign-typo-guard` deliberately skips any field that declares a min: the
//    model is that the schema declares the bound, the browser marks the field
//    invalid, `run_calculator` warns and `answer_query` refuses. 95 fields
//    declare min="0" while their compute still accepts a negative, and that is
//    the documented design rather than 95 defects. Do not "fix" them.
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
