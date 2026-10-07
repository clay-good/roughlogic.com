// Inert-input guard: an input a person can set should be able to change the answer.
//
// check-dead-inputs and check-guard-only-inputs read source, so an input the
// code does read but that cannot move a returned value passes both: on
// 2026-10-07 pf-correction's Phase select ran two algebraically identical
// branches, weld-heat-input's process filled the efficiency box only on the
// page, and masonry-count's 8x16x16 option carried the 8x8x16 face.
//
// For every registered tile with worked examples, this test changes one input
// at a time across every example row -- each other select option, a flipped
// checkbox, a number scaled by 1.37, 0.73, +1 or -1 (1 and 0.5 from zero) --
// and records the inputs that never change any output (note text excluded).
// That set must equal test/fixtures/inert-inputs.js, where each entry carries
// the reason it is legitimate (read only in another mode, a step the examples
// do not cross, text-only). A new inert input fails until it is fixed or
// reviewed into the list; an entry that has started to move fails as stale.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { COMPUTE_MAP, importCalc } from "../fixtures/compute-map.js";
import { INERT_INPUTS } from "../fixtures/inert-inputs.js";
import { describe } from "../../mcp/catalog.mjs";

function answer(r) {
  if (!r || typeof r !== "object") return JSON.stringify(r);
  const c = { ...r };
  delete c.note;
  delete c.notes;
  return JSON.stringify(c, (k, v) => (typeof v === "number" ? +v.toPrecision(10) : v));
}

test("inert inputs: every input that never moves an output is reviewed in inert-inputs.js", async () => {
  const rows = JSON.parse(await readFile(new URL("../fixtures/worked-examples.json", import.meta.url), "utf8")).rows;
  const byTile = new Map();
  for (const r of rows) {
    if (!byTile.has(r.tile_id)) byTile.set(r.tile_id, []);
    byTile.get(r.tile_id).push(r);
  }
  const inert = new Set();
  for (const [id, reg] of Object.entries(COMPUTE_MAP)) {
    const ex = byTile.get(id);
    if (!ex) continue;
    const fn = (await importCalc(reg.module))[reg.fn];
    if (typeof fn !== "function") continue;
    let schema = [];
    try { schema = (await describe({ id })).inputs || []; } catch { schema = []; }
    const opts = new Map();
    for (const f of schema) if (f.options && f.key) opts.set(f.key, f.options.map((o) => o.value ?? o));
    for (const k of new Set(ex.flatMap((r) => Object.keys(r.inputs)))) {
      let moved = false, tried = 0;
      for (const row of ex) {
        if (!(k in row.inputs)) continue;
        let base;
        try { base = fn({ ...row.inputs }); } catch { continue; }
        if (!base || base.error) continue;
        const v = row.inputs[k];
        let alts;
        if (opts.has(k)) alts = opts.get(k).filter((o) => String(o) !== String(v));
        else if (typeof v === "number") alts = v === 0 ? [1, 0.5] : [v * 1.37, v * 0.73, Number.isInteger(v) ? v + 1 : v * 1.1, Number.isInteger(v) && v > 1 ? v - 1 : v * 0.9];
        else if (typeof v === "boolean") alts = [!v];
        else continue;
        for (const a of alts) {
          let r;
          try { r = fn({ ...row.inputs, [k]: a }); } catch { continue; }
          if (!r) continue;
          tried++;
          if (r.error || answer(r) !== answer(base)) { moved = true; break; }
        }
        if (moved) break;
      }
      if (tried && !moved) inert.add(id + "::" + k);
    }
  }
  const listed = new Set(Object.keys(INERT_INPUTS));
  const unreviewed = [...inert].filter((k) => !listed.has(k)).sort();
  const stale = [...listed].filter((k) => !inert.has(k)).sort();
  assert.deepEqual(unreviewed, [], "These inputs never change an output: fix the compute, or add a reviewed reason to test/fixtures/inert-inputs.js");
  assert.deepEqual(stale, [], "Listed as inert but now move the answer; remove from test/fixtures/inert-inputs.js");
  for (const [k, why] of Object.entries(INERT_INPUTS)) assert.ok(typeof why === "string" && why.length > 10, `${k} needs a reason`);
});
