// A value the reader never asked for must not change the answer.
//
// measure-query-fill asks whether each value the question CARRIES is recovered
// (recall 97.9%, WRONG 0). It does not ask the opposite question: does the
// extractor also fill a field the question never mentioned? Mostly that is
// harmless. For a MODE select it is not -- the mode decides what the tile
// requires, so an invented mode can make a tile refuse inputs the reader did
// supply.
//
// Found by prefilling every tile from its own worked example (3140a975): five
// steam tiles answered "Enter the steam pressure (psig)" for a question that
// named no pressure at all. The word came from a SIBLING FIELD'S LABEL --
// "Steam specific volume at pressure" -- and `steam_basis` has an option
// called "pressure". A reader typing "specific volume at pressure 13.7" would
// hit the same thing, so this is not only a harness artifact.
//
// Catalog-wide there are 10 extra fills and 6 that break an answer, all listed
// with their cause, so a SEVENTH has to be looked at.
//
// It was 11 and 7 when this landed, and the two extra ones were the harness
// rather than the extractor -- a correction worth keeping, because the first
// reading looked like a real misfill. linear-interpolation's "extra" x1 came
// from the phrasing below dropping the 1 and 2 out of "Point 1 x" and "Point 2
// x", leaving a question with the same field named twice; given the digit back
// it fills correctly. Only the steam cluster is a hazard a reader shares.
// The extractor itself is not changed here: its select path is built from many
// narrow vetoes, each added for a measured misfill, and the guardrails on a
// change to it are measure-query-fill's recall and WRONG count rather than
// anything this test can see.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { COMPUTE_MAP, importCalc } from "../fixtures/compute-map.js";

const ROOT = new URL("../../", import.meta.url);

const KNOWN = [
  // THE ONE THAT IS NOT THE HARNESS. `steam_basis` owns an option called
  // "pressure", and a sibling field's label reads "Steam specific volume at
  // pressure". The mode then demands a pressure the question never carried, and
  // a reader typing "specific volume at pressure 13.7" would hit it too.
  "flash-steam-pct", "steam-pipe-velocity", "steam-pipe-capacity",
  "steam-trap-sizing", "condensate-return-sizing",
  // A tile this harness cannot phrase at all. Its two flow fields are labelled
  // "Flow at 4 mA" and "Flow at 20 mA": drop the label's number and the two are
  // indistinguishable, keep it and the 20 is read as the reader's value for the
  // other field. Both halves of that were measured. Nothing about the tile is
  // wrong; the example simply cannot be put into words mechanically.
  "dp-flow-signal-scaling",
];

test("a field the question never mentioned is not filled into a broken answer", async () => {
  // query-fill.js loads its field shards over fetch; serve them from disk.
  const { readFileSync } = await import("node:fs");
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
  const { rows: exampleRows } = JSON.parse(await readFile(new URL("test/fixtures/worked-examples.json", ROOT), "utf8"));
  const firstExample = new Map();
  for (const r of exampleRows) if (!firstExample.has(r.tile_id)) firstExample.set(r.tile_id, r);

  // The same phrasing scripts/measure-query-fill.mjs uses: the field's own
  // label lead, its value, and the unit the label declares.
  const grp = (v) => (typeof v === "number" ? v.toLocaleString("en-US") : String(v));
  // measure-query-fill drops every number inside a label, so a label's own
  // threshold cannot be read as the reader's value. Right in general -- but
  // when two labels differ ONLY by that number ("Point 1 x" beside "Point 2
  // x") dropping it removes the only thing telling them apart, and the
  // question built from the example is then genuinely ambiguous. That is what
  // linear-interpolation's "extra" x1 was: not a misfill, a question with two
  // identical field names in it. Keep the digit exactly where a sibling needs
  // it, and nowhere else.
  const bare = (l) => String(l).split(/\s+/).filter((w) => !/\d/.test(w)).join(" ").trim();
  const phrase = (rows, inputs) => {
    const collide = new Map();
    for (const r of rows) { const k = bare(r.l); collide.set(k, (collide.get(k) || 0) + 1); }
    return rows.flatMap((row) => {
      const v = inputs[row.d];
      if (v === null || v === undefined || v === "") return [];
      const stripped = bare(row.l);
      const label = collide.get(stripped) > 1 ? String(row.l).trim() : stripped;
      const isWord = row.k === "select" || row.k === "checkbox";
      return [`${label} ${isWord ? v : grp(v) + (row.u ? " " + row.u : "")}`.trim()];
    }).join(", ");
  };
  const stable = (o) => JSON.stringify(o, (k, v) => (typeof v === "number" && Number.isFinite(v) ? Number(v.toPrecision(10)) : v));

  const broke = [];
  let tiles = 0, extras = 0;
  for (const tool of TOOLS) {
    const reg = COMPUTE_MAP[tool.id];
    const example = firstExample.get(tool.id);
    if (!reg || !example) continue;
    const fn = (await importCalc(reg.module))[reg.fn];
    if (typeof fn !== "function") continue;
    let rows;
    try { rows = await loadFields(tool.id, tool.group); } catch { rows = null; }
    if (!rows) continue;
    const q = phrase(rows, example.inputs);
    if (!q) continue;
    let filled;
    try { ({ filled } = queryFill(q, rows, { name: tool.name })); } catch { continue; }
    tiles += 1;

    const extra = Object.keys(filled).filter((k) => !(k in example.inputs));
    if (!extra.length) continue;
    extras += extra.length;

    let want, got;
    try {
      want = fn({ ...example.inputs });
      got = fn({ ...example.inputs, ...Object.fromEntries(extra.map((k) => [k, filled[k]])) });
    } catch { continue; }
    if (!want || want.error) continue;
    if (got && !got.error && stable(got) === stable(want)) continue;
    if (KNOWN.includes(tool.id)) continue;
    broke.push(`${tool.id}: extra ${extra.map((k) => `${k}=${JSON.stringify(filled[k])}`).join(", ")} -> ${got && got.error ? "error" : "answer changed"}`);
  }

  assert.ok(tiles > 2200, `the catalog is swept (${tiles} tiles, ${extras} extra fills)`);
  assert.deepEqual(
    broke.slice(0, 8),
    [],
    `${broke.length} tile(s) are given a value their question never asked for, and it breaks the answer`,
  );
});
