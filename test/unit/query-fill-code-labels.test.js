// A label that IS a code: "C1", "C2", "V2", "A260", "A280", "b2".
//
// Both label terms and query words have their digits stripped, so each of
// those reduces to a bare letter -- and c1 and c2 then reduce to the SAME
// letter, so no term can tell them apart. molarity-dilution,
// nucleic-acid-a260 and linear-system-2x2 answered NO_VALUES to a question
// carrying every value they need, written the way a reader writes it
// (2026-11-26).
//
// The single-letter rule is the precedent: a letter is admitted only where the
// reader clearly wrote it as a name, standing alone immediately before its own
// number. A code is a stronger claim, so query-fill.js asks for more -- the
// whole label must BE the code (so it cannot fire on "Point 1 x" or "Flow at
// 20 mA"), the code must be unique among that tile's number fields, and the
// field must still be unfilled, so the rule can only add a reading and never
// overturn one reached on better evidence.
//
// THIS FILE IS THE ONLY GUARD ON THAT RULE. measure-query-fill cannot see it:
// its phrasing drops any label word containing a digit, so the code is never
// in the question it builds. The catalog figures it reports are unchanged by
// this rule -- 10,501 of 10,727 fields, WRONG 0 -- which means they are also
// no evidence FOR it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url);

function serveRepo() {
  globalThis.fetch = async (u) => {
    const rel = String(u).split("?")[0].replace(/^\.?\//, "");
    try {
      const text = readFileSync(new URL(rel, ROOT), "utf8");
      return { ok: true, text: async () => text, json: async () => JSON.parse(text) };
    } catch {
      return { ok: false, text: async () => "", json: async () => null };
    }
  };
}

const codeOf = (label) => {
  const flat = String(label || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return flat.length === 1 && /^[a-z]{1,2}\d{1,3}$/.test(flat[0]) ? flat[0] : null;
};

test("a question written with a field's code fills that field, and the right one", async () => {
  serveRepo();
  const { TOOLS } = await import("../../tools-data.js");
  const { loadFields, queryFill } = await import("../../query-fill.js");
  const { rows: exampleRows } = JSON.parse(readFileSync(new URL("test/fixtures/worked-examples.json", ROOT), "utf8"));
  const first = new Map();
  for (const r of exampleRows) if (!first.has(r.tile_id)) first.set(r.tile_id, r);

  const same = (got, want) => {
    const a = Number(got), b = Number(want);
    if (Number.isFinite(a) && Number.isFinite(b)) return Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 1e-4);
    return String(got).toLowerCase() === String(want).toLowerCase();
  };

  const wrong = [], unfilled = [];
  let tiles = 0, fields = 0;
  for (const tool of TOOLS) {
    const example = first.get(tool.id);
    if (!example) continue;
    let rows;
    try { rows = await loadFields(tool.id, tool.group); } catch { rows = null; }
    if (!rows) continue;
    const codes = rows.filter((r) => codeOf(r.l));
    if (!codes.length) continue;
    tiles += 1;

    // Phrased as a reader writes it: the code kept whole, every other label
    // with its digits dropped the way measure-query-fill drops them.
    const q = rows.flatMap((r) => {
      const v = example.inputs[r.d];
      if (v === null || v === undefined || v === "") return [];
      const isCode = !!codeOf(r.l);
      const label = isCode ? String(r.l).trim() : String(r.l).split(/\s+/).filter((w) => !/\d/.test(w)).join(" ").trim();
      return [`${label} ${v}${!isCode && r.u ? " " + r.u : ""}`.trim()];
    }).join(", ");

    const { filled } = queryFill(q, rows, { name: tool.name });
    for (const r of codes) {
      const want = example.inputs[r.d];
      if (want === null || want === undefined || want === "") continue;
      fields += 1;
      if (!(r.d in filled)) { unfilled.push(`${tool.id}.${r.d}`); continue; }
      if (!same(filled[r.d], want)) wrong.push(`${tool.id}.${r.d}: filled ${JSON.stringify(filled[r.d])}, the example says ${JSON.stringify(want)}`);
    }
  }

  assert.ok(tiles >= 7 && fields >= 16, `the code-labelled fields are swept (${tiles} tiles, ${fields} fields)`);
  // A WRONG value here is the thing this rule could do that nothing else
  // would catch. The first version read "b2 -1" as a separator plus 1 and
  // filled +1 for a coefficient of -1.
  assert.deepEqual(wrong, [], `${wrong.length} code-labelled field(s) filled with the wrong value`);
  assert.deepEqual(unfilled, [], `${unfilled.length} code-labelled field(s) the question named and the fill missed`);
});

test("three calculators that answered NO_VALUES now answer, correctly", async () => {
  serveRepo();
  const { answerQuery } = await import("../../mcp/catalog.mjs");

  // C1 V1 = C2 V2, so V1 = 0.1 * 0.05 / 1 = 0.005 L.
  const dil = await answerQuery({ query: "molarity dilution C1 1 M, C2 0.1 M, V2 0.05 L" });
  assert.equal(dil.status, "OK");
  assert.equal(dil.id, "molarity-dilution");
  assert.ok(Math.abs(Number(dil.result.v1) - 0.005) < 1e-6, `V1 should be 0.005 L, got ${dil.result.v1}`);

  // A260 0.65 x 50 ng/uL = 32.5; purity 0.65 / 0.34 = 1.91.
  const dna = await answerQuery({ query: "nucleic acid A260 0.65, A280 0.34" });
  assert.equal(dna.status, "OK");
  assert.ok(Math.abs(Number(dna.result.concentration_ng_ul) - 32.5) < 1e-6);
  assert.ok(Math.abs(Number(dna.result.purity_260_280) - 1.9118) < 1e-3);

  // 2x + y = 5 and x - y = 1 meet at (2, 1): the negative coefficient has to
  // survive, which is what the separator bug got wrong.
  const sys = await answerQuery({ query: "linear system 2x2 a1 2, b1 1, c1 5, a2 1, b2 -1, c2 1" });
  assert.equal(sys.status, "OK");
  assert.equal(Number(sys.result.x), 2);
  assert.equal(Number(sys.result.y), 1);
  assert.equal(Number(sys.result.determinant), -3, "a positive b2 would make this +3");
});
