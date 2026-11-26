// A value the reader's question carried must land in the control it belongs to.
//
// Two halves of query prefill, measured separately until now. The EXTRACTION
// is swept catalog-wide by scripts/measure-query-fill.mjs (WRONG values 0).
// The APPLICATION -- tile-prefill.js writing those values into the page's own
// controls -- had two seed tiles in the nightly Playwright lane, and could not
// be driven under the fake DOM at all: `applyQueryPrefill` bails out on
// `region.isConnected` (undefined until ababf015) and gives up silently when
// `loadFields`' fetch of data/fields/<bucket>.json fails (no fetch here until
// the same change).
//
// `resolveFields` finds a control two ways: the DOM id IS the field key, or the
// page prints a label matching the one the field index stored. 25 indexed rows
// across 7 tiles matched NEITHER, so the question's values were written
// nowhere. Three tiles were entirely unreachable -- fineness-modulus,
// fine-aggregate-grading and transformer-k-factor -- where a reader arriving
// from a search with every value in their question got empty boxes, no
// provenance caption, and no answer.
//
// The cause is a second-surface mismatch, not a typo: fineness-modulus is
// indexed as "Cumulative retained on #4", which is the caption the tile
// publishes for an agent, while its page reads "Cumulative % retained, #4" and
// then bare "#8", "#16". Both are right for their own reader; neither matches
// the other. So a third resolution was added -- the control whose id is the
// field key behind a tile prefix (`r4` -> `fm-r4`), accepted only when exactly
// one control fits.
import { test } from "node:test";
import assert from "node:assert/strict";

const REPO = new URL("../../", import.meta.url);
// renderer-map records each module relative to test/fixtures/, not the root.
const FIXTURES = new URL("../fixtures/", import.meta.url);

async function harness() {
  const fake = await import("../fixtures/fake-dom.js");
  fake.installTimers();
  fake.installFetch();
  const doc = fake.installDocument();
  if (!globalThis.CSS) globalThis.CSS = { escape: (s) => s };
  return { ...fake, doc };
}
const turn = () => new Promise((r) => setImmediate(r));

test("every indexed field resolves to a control on its own page", async () => {
  const { doc, flushTimers } = await harness();
  const { RENDERER_MAP } = await import("../fixtures/renderer-map.js");
  const { TOOLS } = await import("../../tools-data.js");
  const { loadFields } = await import("../../query-fill.js");
  const norm = (s) => String(s || "").replace(/\s*\([^()]*\)\s*$/, "").trim().toLowerCase();

  // Resolvable by none of the three routes. Both are checkboxes whose control
  // id shares nothing with the field key; listed so a NEW one is a failure.
  const UNRESOLVABLE = ["transformer-voltage-regulation::leading", "termination-temp-ampacity::over_100a"];

  const miss = [];
  let tiles = 0, rows = 0;
  for (const tool of TOOLS) {
    const reg = RENDERER_MAP[tool.id];
    if (!reg) continue;
    let render;
    try { render = (await import(new URL(reg.module, FIXTURES).href))[reg.exportName]?.[tool.id]; } catch { continue; }
    if (typeof render !== "function") continue;
    let fields;
    try { fields = await loadFields(tool.id, tool.group); } catch { fields = null; }
    if (!fields || !fields.length) continue;

    doc.body.replaceChildren();
    const view = doc.createElement("section");
    const region = doc.createElement("div"), outputs = doc.createElement("div"), cite = doc.createElement("p");
    view.append(region, outputs, cite);
    doc.body.appendChild(view);
    try { await render(region, outputs, cite); flushTimers(); } catch { continue; }
    tiles += 1;

    const controls = region.querySelectorAll("input, select, textarea");
    const ids = new Set(controls.map((c) => c.id).filter(Boolean));
    const labels = new Set(region.querySelectorAll("label[for]").map((l) => norm(l.textContent)));
    for (const row of fields) {
      rows += 1;
      if (ids.has(row.d)) continue;
      if (labels.has(norm(row.l))) continue;
      const suffixed = [...ids].filter((x) => x.endsWith("-" + row.d) || x.endsWith("_" + row.d));
      if (suffixed.length === 1) continue;
      const key = `${tool.id}::${row.d}`;
      if (!UNRESOLVABLE.includes(key)) miss.push(`${key} ("${row.l}") -- ${suffixed.length} id candidates`);
    }
  }

  assert.ok(tiles > 2200 && rows > 11000, `the catalog's field index is swept (${tiles} tiles, ${rows} rows)`);
  assert.deepEqual(
    miss.slice(0, 10),
    [],
    `${miss.length} indexed field(s) resolve to no control, so a value from the reader's question is written nowhere`,
  );
});

test("a question's values reach the boxes on a tile the label match cannot reach", async () => {
  const { doc, flushTimers } = await harness();
  const { RENDERER_MAP } = await import("../fixtures/renderer-map.js");
  const { TOOLS } = await import("../../tools-data.js");
  const { applyQueryPrefill } = await import("../../tile-prefill.js");

  // The worst of the three: six boxes, and the page's labels are nothing like
  // the captions the field index carries.
  const tool = TOOLS.find((t) => t.id === "fineness-modulus");
  const reg = RENDERER_MAP["fineness-modulus"];
  const render = (await import(new URL(reg.module, FIXTURES).href))[reg.exportName]["fineness-modulus"];

  const view = doc.createElement("section");
  const region = doc.createElement("div"), outputs = doc.createElement("div"), cite = doc.createElement("p");
  view.append(region, outputs, cite);
  doc.body.appendChild(view);
  await render(region, outputs, cite);
  flushTimers();

  // Phrased from the field's own label lead and value, the way
  // scripts/measure-query-fill.mjs phrases a worked example -- the extractor
  // reads repeated mentions of one lead positionally.
  const q = [2, 12, 32, 57, 82, 95].map((v) => `Cumulative retained on ${v} pct`).join(", ");
  applyQueryPrefill({ region, tool, params: {}, query: q, provenanceText: "from your question" });
  for (let i = 0; i < 12; i++) { flushTimers(); await turn(); }

  const values = ["fm-r4", "fm-r8", "fm-r16", "fm-r30", "fm-r50", "fm-r100"].map((id) => region.querySelector("#" + id).value);
  assert.deepEqual(values, ["2", "12", "32", "57", "82", "95"], "each sieve's value lands in its own box");
  assert.ok(region.querySelectorAll(".field-provenance").length > 0, "and the reader is told which boxes came from their question");
});

// Two labels that collide once their unit is stripped.
//
// dovetail-over-pins prints "Known dimension" (which of the two the reader
// has) beside "Known dimension (in)" (its value). Both normalise to "known
// dimension", and the label map kept only the FIRST control under a label --
// so the select claimed it, the dimension box could never be resolved, and the
// reader's measurement was written nowhere. The tile then answered "The known
// dimension must be positive" about a number the reader had typed.
test("two controls under one label each take their own value", async () => {
  const { doc, flushTimers } = await harness();
  const { RENDERER_MAP } = await import("../fixtures/renderer-map.js");
  const { TOOLS } = await import("../../tools-data.js");
  const { applyQueryPrefill } = await import("../../tile-prefill.js");

  const tool = TOOLS.find((t) => t.id === "dovetail-over-pins");
  const reg = RENDERER_MAP["dovetail-over-pins"];
  const render = (await import(new URL(reg.module, FIXTURES).href))[reg.exportName]["dovetail-over-pins"];

  const view = doc.createElement("section");
  const region = doc.createElement("div"), outputs = doc.createElement("div"), cite = doc.createElement("p");
  view.append(region, outputs, cite);
  doc.body.appendChild(view);
  await render(region, outputs, cite);
  flushTimers();

  const q = "Dovetail type male, Known dimension flat, Known dimension 2 in, Rod / pin diameter 0.5 in, Included dovetail angle 60 deg";
  applyQueryPrefill({ region, tool, params: {}, query: q, provenanceText: "from your question" });
  for (let i = 0; i < 12; i++) { flushTimers(); await turn(); }

  assert.equal(region.querySelector("#dvt-known").value, "flat", "the select takes which dimension is known");
  assert.equal(region.querySelector("#dvt-dim").value, "2", "and the box beside it takes the measurement");
  assert.equal(region.querySelector("#dvt-pin").value, "0.5");
});
