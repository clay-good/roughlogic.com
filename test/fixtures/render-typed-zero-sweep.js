// A reader who types 0 means zero. On 2026-11-15, 65 tiles' renderers read a
// box as `Number(x.value) || default`, so a typed 0 reached the compute as the
// default: a snow-load Cs of 0 (a steep slippery roof, ASCE 7 Fig. 7.4-1)
// computed with 1, a 0 GPP drying margin with 10, a 0 deg excavation slope as a
// vertical cut. A blank box still takes the default; a typed 0 must arrive as
// 0, where the compute either uses it or refuses it. This drives every renderer
// against the fake DOM under the compute spy, finds each number box's argument
// by typing a marker value, then types 0 and reports any argument that arrives
// as something else. Prints a JSON report; see typed-zero.test.js.
import * as nodeModule from "node:module";
import { readFileSync } from "node:fs";
if (nodeModule.registerHooks) nodeModule.registerHooks({ load: (await import("./compute-spy-loader.js")).load });
else nodeModule.register("./compute-spy-loader.js", import.meta.url);

let last = new Map(); const lastArgs = new Map();
globalThis.__computeSpy = (fn, name) => function (...a) {
  const r = fn.apply(this, a);
  last.set(name, r); lastArgs.set(name, a[0]);
  return r;
};

const { installDocument, installTimers, flushTimers } = await import("./fake-dom.js");
const { RENDERER_MAP } = await import("./renderer-map.js");
const { COMPUTE_MAP } = await import("./compute-map.js");
installTimers();
const doc = installDocument();
const { TOOLS } = await import("../../tools-data.js");
const ROWS = JSON.parse(readFileSync(new URL("./worked-examples.json", import.meta.url), "utf8")).rows;
const first = new Map();
for (const r of ROWS) if (!first.has(r.tile_id)) first.set(r.tile_id, r);

// At the precision a reader can see, as check-example-parity compares inputs:
// the button types 66.82 where the fixture carries 66.8235.
const close = (a, b) => a === b || Math.abs(a - b) <= Math.max(Math.abs(b) * 0.001, 1e-12);
const report = { compared: 0, mismatches: {}, outOfRange: [] };
for (const { id } of TOOLS) {
  const reg = RENDERER_MAP[id], creg = COMPUTE_MAP[id], row0 = first.get(id);
  if (!reg || !creg || !row0) continue;
  const inputs0 = row0.inputs, printed = new Set(Object.keys(row0.outputs || {}));
  const mod = await import(new URL(creg.module, new URL("./", import.meta.url)).href);
  const render = (await import(new URL(reg.module, new URL("./", import.meta.url)).href))[reg.exportName]?.[id];
  if (typeof render !== "function" || typeof mod[creg.fn] !== "function") continue;
  doc.body.replaceChildren();
  const view = doc.createElement("section");
  const inputs = doc.createElement("div"), outputs = doc.createElement("div"), cite = doc.createElement("p");
  view.append(inputs, outputs, cite);
  doc.body.appendChild(view);
  try {
    await render(inputs, outputs, cite);
    flushTimers();
    const btn = view.querySelectorAll("button").find((b) => b.classList.contains("example-btn"));
    if (!btn) continue;
    last = new Map();
    btn.click();
    flushTimers();
    const fire = (el) => { el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); flushTimers(); };
    const labelOf = (el) => (view.querySelectorAll("label").find((l) => l.htmlFor === el.id)?.textContent || el.id);
    const argsAfter = (el, v) => { lastArgs.delete(creg.fn); el.value = v; fire(el); return lastArgs.get(creg.fn); };
    for (const el of inputs.querySelectorAll("input")) {
      if (el.type !== "number") continue;
      const v0 = el.value;
      // The example must sit inside the box's own min/max: a value outside them fails
      // checkValidity and ui-validity strikes through the answer (UTM's zone 0, 2026-11-15).
      const mn = el.attributes?.min, mx = el.attributes?.max;
      if (v0 !== "" && ((mn !== undefined && Number(v0) < Number(mn)) || (mx !== undefined && Number(v0) > Number(mx)))) report.outOfRange.push(id + " " + el.id + ": example " + v0 + " outside [" + (mn ?? "") + ", " + (mx ?? "") + "]");
      const st = el.attributes?.step;
      if (v0 !== "" && st !== undefined && st !== "any" && Number(st) > 0) {
        const q = (Number(v0) - (mn !== undefined && Number.isFinite(Number(mn)) ? Number(mn) : 0)) / Number(st);
        if (Math.abs(q - Math.round(q)) > 1e-7) report.outOfRange.push(id + " " + el.id + ": example " + v0 + " is off the box's step " + st);
      }
      const mark = argsAfter(el, "7.31");
      if (!mark || typeof mark !== "object") { el.value = v0; fire(el); continue; }
      const key = Object.keys(mark).find((k) => Number(mark[k]) === 7.31 || mark[k] === "7.31");
      if (!key) { el.value = v0; fire(el); continue; }
      report.compared++;
      const z = argsAfter(el, "0");
      const got = z && typeof z === "object" ? z[key] : undefined;
      if (z && got !== undefined && got !== null && got !== "" && Number(got) !== 0) report.mismatches[id + " " + key] = labelOf(el) + " | typed 0, compute got " + JSON.stringify(got);
      el.value = v0; fire(el);
    }
  } catch { /* render-text-sweep reports crashes */ }
}
process.stdout.write(JSON.stringify(report));
