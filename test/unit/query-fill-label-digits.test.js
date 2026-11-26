// A number inside a field's own label is the label's, not the reader's.
//
// `measure-query-fill` drops every digit-bearing word out of a label before it
// phrases a question -- the right choice, and the reason its WRONG count has
// never seen what happens when a reader writes the label the way the PAGE
// prints it. Written that way, `dp-flow-signal-scaling` read "Flow at 4 mA 0,
// Flow at 20 mA 500" as flow_low = 4 and flow_high = 20: the milliamp numbers
// that NAME the two taps became the two flows, and the reader's own 0 and 500
// were dropped. A confident wrong answer on the most natural phrasing there
// is.
//
// So this file is the instrument that rule needs, and the catalog figures are
// no substitute for it: recall stays at 10,501 of 10,727 fields with WRONG 0
// either way, because that harness never writes a label's digits.
//
// Measured over every tile whose labels carry a digit, phrased with the label
// written out in full: 75 wrong values before the rule, 0 after.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url);

test("a label written out in full does not hand its own numbers to the fill", async () => {
  globalThis.fetch = async (u) => {
    const rel = String(u).split("?")[0].replace(/^\.?\//, "");
    try {
      const text = readFileSync(new URL(rel, ROOT), "utf8");
      return { ok: true, text: async () => text, json: async () => JSON.parse(text) };
    } catch {
      return { ok: false, text: async () => "", json: async () => null };
    }
  };

  const { TOOLS } = await import("../../tools-data.js");
  const { loadFields, queryFill } = await import("../../query-fill.js");
  const { rows: exampleRows } = JSON.parse(readFileSync(new URL("test/fixtures/worked-examples.json", ROOT), "utf8"));
  const first = new Map();
  for (const r of exampleRows) if (!first.has(r.tile_id)) first.set(r.tile_id, r);

  // NOTHING is exempt. The list held four labels whose punctuation defeated
  // the span match -- "Rate on first $100k", "Rate on next $400k", "Rate above
  // $500k" and a label embedding its own lookup table, "Bag yield (ft3): 80lb
  // 0.60, 60lb 0.45" -- until the match was done on a normalised copy of the
  // text with an index map, and the label was put through the SAME rewrite the
  // question goes through. "$100k" becomes "100 usdk" in a rewritten question,
  // so a needle built from the raw label could never be found in it.
  const KNOWN = [];

  const same = (got, want) => {
    const a = Number(got), b = Number(want);
    if (Number.isFinite(a) && Number.isFinite(b)) return Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 1e-4);
    return String(got).toLowerCase() === String(want).toLowerCase();
  };

  const wrong = [];
  let tiles = 0, values = 0;
  for (const tool of TOOLS) {
    const example = first.get(tool.id);
    if (!example) continue;
    let rows;
    try { rows = await loadFields(tool.id, tool.group); } catch { rows = null; }
    if (!rows) continue;
    const digitLabelled = rows.filter((r) => /\d/.test(String(r.l || "")) &&
      String(r.l).split(/[^a-z0-9]+/i).filter(Boolean).length >= 2);
    if (!digitLabelled.length) continue;
    tiles += 1;

    const q = rows.flatMap((r) => {
      const v = example.inputs[r.d];
      if (v === null || v === undefined || v === "" || typeof v === "object") return [];
      return [`${String(r.l).trim()} ${v}${r.u ? " " + r.u : ""}`.trim()];
    }).join(", ");
    if (!q) continue;

    const { filled } = queryFill(q, rows, { name: tool.name });
    for (const [key, got] of Object.entries(filled)) {
      const want = example.inputs[key];
      if (want === null || want === undefined || want === "" || typeof want === "object") continue;
      values += 1;
      if (same(got, want)) continue;
      if (KNOWN.includes(`${tool.id}.${key}`)) continue;
      wrong.push(`${tool.id}.${key}: filled ${JSON.stringify(got)}, the example says ${JSON.stringify(want)}`);
    }
  }

  assert.ok(tiles > 200 && values > 900, `the digit-labelled tiles are swept (${tiles} tiles, ${values} values)`);
  assert.deepEqual(wrong.slice(0, 10), [], `${wrong.length} value(s) taken from a label rather than from the reader`);
});

test("the demonstrated case: the milliamp taps are not the flows", async () => {
  const { TOOLS } = await import("../../tools-data.js");
  const { loadFields, queryFill } = await import("../../query-fill.js");
  const tool = TOOLS.find((t) => t.id === "dp-flow-signal-scaling");
  const rows = await loadFields(tool.id, tool.group);
  const { filled } = queryFill(
    "dp flow signal scaling Loop signal 12 mA, Flow at 4 mA 0, Flow at 20 mA 500",
    rows, { name: tool.name },
  );
  assert.notEqual(filled.flow_low, "4", "the 4 mA naming the tap is not the low flow");
  assert.notEqual(filled.flow_high, "20", "nor is the 20 mA the high flow");
  assert.equal(filled.signal_ma, "12", "and the reader's own signal still binds");
});
