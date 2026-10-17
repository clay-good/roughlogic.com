// "Show the steps" (spec-v1964, spec-v106 roadmap pillar 3): under the answer,
// the inputs as the compute received them and every intermediate number it
// returned, so a result can be defended without redoing it. A steps panel
// that prints "undefined" or "NaN" undoes the point, so this runs the panel's
// pure row builder over every tile that exposes a field schema, on each of its
// worked examples, and fails on anything a reader should never see.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { stepRows, stepNum, domFields, drawSteps } from "../../steps-panel.js";
import { humanizeKey } from "../../key-labels.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BAD = /\bundefined\b|\bNaN\b|Infinity|^null$/;

test("the steps panel never prints undefined, NaN, Infinity or a bare null", async () => {
  const { rows } = JSON.parse(readFileSync(resolve(ROOT, "test/fixtures/worked-examples.json"), "utf8"));
  const { COMPUTE_MAP } = await import("../fixtures/compute-map.js");
  const { RENDERER_MAP } = await import("../fixtures/renderer-map.js");
  const mods = new Map();
  const load = async (rel) => { const p = resolve(ROOT, rel.replace("../../", "")); if (!mods.has(p)) mods.set(p, await import(p)); return mods.get(p); };
  const bad = [];
  let tiles = 0, checked = 0;
  const seen = new Set();
  for (const row of rows) {
    const id = row.tile_id;
    const cm = COMPUTE_MAP[id], rm = RENDERER_MAP[id];
    if (!cm || !rm) continue;
    const render = (await load(rm.module))[rm.exportName]?.[id];
    const fields = render?.schema?.inputs;
    if (!Array.isArray(fields) || !fields.length) continue;
    const fn = (await load(cm.module))[cm.fn];
    if (typeof fn !== "function") continue;
    if (!seen.has(id)) { seen.add(id); tiles++; }
    const params = row.inputs || {};
    let r; try { r = fn(params); } catch { continue; }
    if (!r || r.error) continue;
    checked++;
    const out = stepRows(fields, params, r, humanizeKey);
    for (const x of out) {
      if (BAD.test(x.label) || BAD.test(x.value) || x.label === "" || x.value === "") bad.push(`${id}: ${x.section} "${x.label}" = "${x.value}"`);
    }
    // Every input row must name a real field, in field order, with the value passed.
    const inRows = out.filter((x) => x.section === "in");
    const labels = new Set(fields.map((f) => String(f.label)));
    for (const x of inRows) if (!labels.has(x.label)) bad.push(`${id}: input row "${x.label}" is not one of the tile's fields`);
  }
  assert.ok(tiles > 900, `the guard reached only ${tiles} tiles; did the renderer map or schemas move?`);
  assert.ok(checked > tiles, "each tile's worked examples should run through the panel");
  assert.deepEqual(bad.slice(0, 20), [], `${bad.length} bad steps-panel row(s)`);
});

test("an error result shows no steps, and only finite numbers become worked values", () => {
  const fields = [{ key: "a_ft", label: "Length (ft)" }];
  assert.deepEqual(stepRows(fields, { a_ft: 3 }, { error: "nope" }, humanizeKey), []);
  const out = stepRows(fields, { a_ft: 3 }, { a_ft: 3, area_ft2: 9, ok: true, verdict: "fine", bad_ft: NaN, inf_ft: Infinity, x: 4 }, humanizeKey);
  assert.deepEqual(out.map((x) => [x.section, x.label, x.value]), [
    ["in", "Length (ft)", "3"],
    ["out", humanizeKey("area_ft2"), "9"],
  ], "input echo, booleans, text, NaN, Infinity and an uncaptionable key are all left out");
  assert.equal(stepNum(0.010416), "0.0104");
  assert.equal(stepNum(26180.44), "26,180.4");
  assert.equal(stepNum(12.5), "12.5");
  assert.equal(stepNum(7), "7");
});

test("every _simpleRenderer copy creates the steps panel and feeds it each result", () => {
  const missing = [];
  for (const f of readdirSync(ROOT).filter((n) => /^calc-.*\.js$/.test(n))) {
    const src = readFileSync(resolve(ROOT, f), "utf8");
    const i = src.indexOf("function _simpleRenderer");
    if (i < 0) continue;
    const body = src.slice(i, src.indexOf("\n}\n", i));
    const created = (body.match(/_steps = makeStepsPanel\(outputRegion\)/g) || []).length;
    const fed = (body.match(/_steps\.update\(spec\.fields, params, \w+\)/g) || []).length;
    if (created !== 1 || fed !== 1) missing.push(`${f}: created ${created}, fed ${fed}`);
  }
  assert.deepEqual(missing, [], "a _simpleRenderer copy without the steps panel leaves its tiles unexplained");
});

// The hand-written renderers (spec-v1964 extension): each gets one line after
// its main compute call, `stepsFor(outputRegion, inputRegion, keys, r)`. A
// renderer with one main call -- `const X = computeY(...)` followed by a check
// of `X.error`, or its only compute call outside any loop -- that does not
// feed the panel leaves its tile unexplained. Renderers with no such call (input-free references, multi-mode
// pages) are not counted.
test("every hand-written renderer with one main compute call feeds the steps panel", () => {
  const FN = /function (\w*)\(inputRegion,\s*outputRegion[^)]*\)\s*\{/g;
  const CALL = /const (\w+) = (compute\w+)\(/g;
  const close = (s, i, o, c) => { let d = 0; for (let k = i; k < s.length; k++) { if (s[k] === o) d++; else if (s[k] === c && --d === 0) return k; } return -1; };
  const missing = [];
  let fed = 0;
  for (const f of readdirSync(ROOT).filter((n) => /^calc-.*\.js$/.test(n))) {
    const src = readFileSync(resolve(ROOT, f), "utf8");
    for (const m of src.matchAll(FN)) {
      const b = m.index + m[0].length - 1;
      const body = src.slice(b, close(src, b, "{", "}"));
      if (body.includes("_steps")) continue; // a _simpleRenderer copy, checked above
      // The main call is the one whose result is checked for .error; failing
      // that, a renderer's only compute call (outside any loop) is its main one.
      const all = [...body.matchAll(CALL)];
      const mains = all.filter((c) => {
        const pe = close(body, c.index + c[0].length - 1, "(", ")");
        return pe > 0 && new RegExp("\\b" + c[1] + "\\.error\\b").test(body.slice(pe, pe + 400));
      });
      const inLoop = (c) => /\b(for|while)\s*\([^)]*\)\s*\{[^}]*$/.test(body.slice(0, c.index));
      const hookable = mains.length === 1 || (mains.length === 0 && all.length === 1 && !inLoop(all[0]));
      if (!hookable) continue;
      const n = (body.match(/stepsFor\(outputRegion, inputRegion, /g) || []).length;
      if (n === 1) fed++; else missing.push(`${f} ${m[1] || "(anonymous)"}: stepsFor x${n}`);
    }
  }
  assert.ok(fed > 1000, `only ${fed} hand-written renderers feed the panel; did the hook move?`);
  assert.deepEqual(missing, [], "a hand-written renderer with one main compute call does not feed the steps panel");
});

// A hand-written renderer has no field list, so the inputs come off the page:
// each control's own <label for> caption and the value it shows.
function stubRegion(controls) {
  const labels = new Map(controls.map((c) => [c.id, c.label]));
  return {
    querySelectorAll: () => controls.map((c) => ({ id: c.id, type: c.type || "number", tagName: c.tag || "INPUT", value: c.value ?? "", checked: !!c.checked,
      options: c.options || [], selectedIndex: c.selectedIndex ?? 0, closest: () => (c.hidden ? {} : null) })),
    querySelector: (sel) => { const id = /for="([^"]+)"/.exec(sel)?.[1]; return labels.get(id) ? { textContent: labels.get(id) } : null; },
  };
}

test("hand-written renderers: inputs are read from the page, and argument names stay out of the worked values", () => {
  const region = stubRegion([
    { id: "bcw-c", label: "Number of branch circuits", value: "20" },
    { id: "bcw-mat", label: "Material", tag: "SELECT", type: "select-one", options: [{ text: "Copper", value: "cu" }], selectedIndex: 0 },
    { id: "bcw-gfci", label: "GFCI", type: "checkbox", checked: true },
    { id: "bcw-blank", label: "Optional limit", value: "" },
    { id: "bcw-hid", label: "Hidden one", value: "5", hidden: true },
    { id: "bcw-nolabel", label: "", value: "3" },
  ]);
  const { fields, params } = domFields(region);
  assert.deepEqual(fields.map((f) => [f.label, params[f.key]]), [
    ["Number of branch circuits", 20],
    ["Material", "Copper"],
    ["GFCI", "yes"],
  ], "a blank, a hidden and an unlabelled control are left out; a select shows its option text");
  assert.ok(fields.every((f) => f.key.startsWith("\u0000")), "page keys can never collide with a result key");
  // drawSteps on the hand-written path: `circuits` was a compute argument, so it
  // is an input echo and does not repeat under Worked values.
  const made = [];
  const el = () => ({ textContent: "", append(...c) { made.push(...c); }, appendChild(c) { made.push(c); } });
  globalThis.document ??= { createElement: el };
  const body = { textContent: "", append(...c) { made.push(...c); } };
  drawSteps(body, { fields: ["circuits"], params: null, r: { circuits: 20, total_ft: 3600, rolls: 4 } }, (k) => ({ total_ft: "Total (ft)", rolls: "Rolls", circuits: "Circuits" })[k], region);
  const text = JSON.stringify(made.map((m) => m.textContent));
  assert.ok(text.includes("Total (ft)") && text.includes("3,600"), text);
  assert.ok(!text.includes("Circuits"), "an argument name is an input echo, not a worked value");
});
