// How many input CONTROLS does each calculator's page actually build?
//
// The bespoke-schema extractor reads source. When it cannot resolve a field it
// emits nothing, and the agent door then advertises that compute parameter as a
// bare key -- no label, no kind, no options, no bound. 262 parameters on 158
// calculators are in that state.
//
// Before writing a DOM-reading extractor to recover them, this answers the
// question that decides whether one is worth writing: how many of those
// parameters have a control on the page at all? A parameter with no box can
// never carry a schema however the extractor is written -- friction-loss's
// internal diameter is an optional override the page derives from the nominal
// pipe size, and there is nothing on screen to read.
//
// Counts number inputs, text inputs, selects and checkboxes per tile. Prints a
// JSON report; the comparison against describe() lives in the audit that reads
// it.
//
// UPDATED 2026-11-26 after three of the shapes were fixed: the figure is now
// 210 on 121 calculators (it was 262 on 158). What moved: makeCheckbox was not
// modelled at all, a select's options could not come from a const in the
// renderer body, and a module-local helper could not be used inside a larger
// expression. See the commit; the split below is from the original measurement
// and the proportions still hold.
//
// MEASURED 2026-11-26, which is the point of the file. Of the 262 compute
// parameters the door advertises with no detail:
//     47  are LIST-valued -- one parameter rendered as many boxes (a panel's
//         circuits, a feeder's loads, a generator's motors). These can never
//         carry a conventional schema and are documented as such.
//     57  have NO control on the page at all. friction-loss's internal
//         diameter is the shape: an optional override the page derives from
//         the nominal pipe size, so there is nothing on screen to read and the
//         extractor emitting nothing is correct.
//    158  are a SINGLE control on the page, with a real label and, for the
//         selects, real options -- conduit-fill's trade size, breaker-sizing's
//         continuous-load flag, lighting-density's occupancy class,
//         parallel-conductor-derate's conductor size. An agent sees a bare key
//         for every one of them.
//
// So a DOM-reading extractor is worth writing, and this is the number it would
// move: 158, not 262. The mapping it needs already half exists -- the schema
// extractor statically parses the (label, id) pair of every makeSelect and
// makeNumber, so a control can be found in the rendered page by its id and its
// options and attributes read off the live element instead of guessed from
// source. That is the next chunk of this work, and it is scoped rather than
// speculative.
const { installDocument, installTimers, flushTimers } = await import("./fake-dom.js");
const { RENDERER_MAP } = await import("./renderer-map.js");
installTimers();
const doc = installDocument();
const { TOOLS } = await import("../../tools-data.js");

const report = { rendered: 0, tiles: {} };
for (const { id } of TOOLS) {
  const reg = RENDERER_MAP[id];
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
  try { await render(inputs, outputs, cite); flushTimers(); } catch { continue; }
  report.rendered += 1;

  const ins = inputs.querySelectorAll("input");
  const sels = inputs.querySelectorAll("select");
  const numbers = ins.filter((el) => el.type === "number").length;
  const texts = ins.filter((el) => el.type === "text").length;
  const checks = ins.filter((el) => el.type === "checkbox").length;
  report.tiles[id] = { controls: numbers + texts + checks + sels.length, numbers, texts, checks, selects: sels.length };
}
console.log(JSON.stringify(report));
