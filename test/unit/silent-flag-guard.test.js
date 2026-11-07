// A warning flag a compute returns (cannot_hold, negative_pressure_ok, ...) is
// only worth something if the page says it. Until 2026-11-07 two did not:
// constant-pressure-well-vfd computed cannot_hold with drawdown blank and printed
// a placeholder, kitchen-makeup-air-deficit checked the 0.02 in wc limit and
// never showed the result, and conductor-sag-at-temperature warned of an
// over-strength tension only when the tension was rising.
//
// From every worked example, change one input at a time (x0, x0.25, x0.5, x2,
// x4, x10, each select option). Where a flag-named boolean flips, the page's WORDS (numbers
// stripped) must change too. A flip whose only trace is a number is listed in
// REVIEWED with the reason.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COMPUTE_MAP } from "../fixtures/compute-map.js";
import { RENDERER_MAP } from "../fixtures/renderer-map.js";

const FLAG = /(cannot|can_not|exceed|fail|over_|_over|unsafe|short|insufficient|violat|lifted|too_|not_ok|warn|undersiz|overload|_ok$|^ok_|passes|^pass$|adequate|meets|complies|governs|required$|needs_|needed$|unstable|slides|tips|overturn|collapse|buckl|yield)/i;

const REVIEWED = {
  // The four criteria are inputs echoed back; the page shows the criteria count and eligibility.
  "hazard-tree-stump-screen fallen_ok": "an echoed yes/no input; it moves the printed criteria count",
  "hazard-tree-stump-screen split_ok": "an echoed yes/no input; it moves the printed criteria count",
  // The toilet line prints the per-sex counts, which already show the two-unit minimum; the note explains it.
  "responder-camp-sanitation minimum_governs": "the per-sex toilet counts show the minimum of two",
  // "Which governs" prints "neither, tightly" whenever both_ample is true, whichever side is larger.
  "separator-retention-sizing gas_governs": "masked by both_ample, which the page states",
  // A quarter-height element on an obstructed side reach: the page already says no height complies.
  "reach-range low_ok": "masked by 'no height complies; the element must move'",
  // Rows without a four-hour step print "no change with duration", correctly, either side of four hours.
  "silica-table-1 over_four": "only rows with a duration step print it, and those do",
  // An action level raised past the PEL: the OVER THE PEL verdict takes precedence, as it should.
  "silica-ventilation-screen over_action_level": "masked by over_pel, which the verdict states",
};

const words = (s) => s.replace(/-?[\d.,]+(e[-+]?\d+)?/gi, "#").replace(/\s+/g, " ").trim();

test("silent flags: a warning flag that flips changes the words on the page", async () => {
  const rows = JSON.parse(readFileSync(new URL("../fixtures/worked-examples.json", import.meta.url), "utf8")).rows;
  const byTile = new Map();
  for (const r of rows) { if (!byTile.has(r.tile_id)) byTile.set(r.tile_id, []); byTile.get(r.tile_id).push(r); }
  const mods = new Map();
  const imp = async (rel, base) => { const u = new URL(rel, base).href; if (!mods.has(u)) mods.set(u, await import(u)); return mods.get(u); };
  const computeBase = new URL("../fixtures/compute-map.js", import.meta.url);
  const rendererBase = new URL("../fixtures/renderer-map.js", import.meta.url);
  const found = new Set();
  let tilesRun = 0;
  for (const [id, trs] of byTile) {
    const reg = COMPUTE_MAP[id], rreg = RENDERER_MAP[id];
    if (!reg || !rreg) continue;
    const fn = (await imp(reg.module, computeBase))[reg.fn];
    const schema = (await imp(rreg.module, rendererBase))[rreg.exportName]?.[id]?.schema;
    if (typeof fn !== "function" || !schema?.outputs?.length) continue;
    tilesRun++;
    const view = (inp) => {
      let r; try { r = fn(structuredClone(inp)); } catch { return null; }
      if (!r || r.error) return null;
      let t = "";
      for (const o of schema.outputs) { try { t += " | " + String(o.format(r)); } catch { t += " | ERR"; } }
      return { r, t: words(t) };
    };
    for (const row of trs) {
      const base = row.inputs || {};
      const b = view(base);
      if (!b) continue;
      const variants = [];
      for (const [k, v] of Object.entries(base)) if (typeof v === "number") for (const m of [0, 0.25, 0.5, 2, 4, 10]) variants.push({ ...base, [k]: v * m });
      for (const f of schema.inputs || []) if (f.options) for (const o of f.options) { const val = o.value ?? o; if (val !== base[f.key]) variants.push({ ...base, [f.key]: val }); }
      for (const inp of variants) {
        const v = view(inp);
        if (!v || v.t !== b.t) continue;
        for (const [k, bv] of Object.entries(b.r)) {
          if (typeof bv === "boolean" && typeof v.r[k] === "boolean" && bv !== v.r[k] && FLAG.test(k)) found.add(id + " " + k);
        }
      }
    }
  }
  assert.ok(tilesRun > 1000, `only ${tilesRun} tiles ran; the harness stopped reaching the renderers`);
  const unexpected = [...found].filter((k) => !REVIEWED[k]).sort();
  assert.deepEqual(unexpected, [], "a flag flipped but the page's words did not change");
  const stale = Object.keys(REVIEWED).filter((k) => !found.has(k)).sort();
  assert.deepEqual(stale, [], "a REVIEWED entry no longer reproduces; remove it");
});
