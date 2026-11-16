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
globalThis.__computeSpy = (fn, name) => { const w = function (...a) {
  const r = fn.apply(this, a);
  last.set(name, r); lastArgs.set(name, a[0]);
  return r;
}; w.__orig = fn; return w; };

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
const report = { compared: 0, mismatches: {}, outOfRange: [], droppedLines: [], blankDefault: [], silentErrors: [], staleTables: [], unshownInputs: [] };
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
  // "Show the steps" lists the inputs its keys name (null = every box in the region).
  // An argument the compute received but the list leaves out is missing from the
  // steps: generator other loads, superheat pressure, drying indoor temperature,
  // Steinhart-Hart C and the 30 s IR reading were until 2026-11-15.
  let stepKeys = null, stepsObj;
  Object.defineProperty(outputs, "_steps", { configurable: true, get() { return stepsObj; }, set(v) { const u = v.update.bind(v); v.update = (keys, p, r) => { stepKeys = keys && keys.map((k) => (k && typeof k === "object" ? k.key : k)); return u(keys, p, r); }; stepsObj = v; } });
  try {
    await render(inputs, outputs, cite);
    flushTimers();
    const btn = view.querySelectorAll("button").find((b) => b.classList.contains("example-btn"));
    if (!btn) continue;
    last = new Map();
    btn.click();
    flushTimers();
    { const args = lastArgs.get(creg.fn);
      if (args && typeof args === "object" && Array.isArray(stepKeys)) { const miss = Object.keys(args).filter((k) => args[k] !== undefined && !stepKeys.includes(k)); if (miss.length) report.unshownInputs.push(id + ": " + miss.join(", ")); } }
    // A table, list, or plot drawn for the example must not survive an error: the
    // pump operating point kept its last curve table and plot beside the error
    // until 2026-11-15.
    const shapes = () => outputs.querySelectorAll("tr").length + "/" + outputs.querySelectorAll("svg").length + "/" + outputs.querySelectorAll("li").length;
    const shapes0 = shapes();
    const fire = (el) => { el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); flushTimers(); };
    const labelOf = (el) => (view.querySelectorAll("label").find((l) => l.htmlFor === el.id)?.textContent || el.id);
    const argsAfter = (el, v) => { lastArgs.delete(creg.fn); el.value = v; fire(el); return lastArgs.get(creg.fn); };
    // A list box must not drop a line it cannot read: the answer would look complete
    // with a row the reader typed missing (mileage, PCR, ANOVA until 2026-11-15).
    // A compute error must reach the page: 15 renderers had no r.error branch and printed
    // dashes (one printed "undefined") with no reason until 2026-11-15.
    {
      let found = false;
      for (const el of inputs.querySelectorAll("input")) {
        if (el.type !== "number" || found) continue;
        const v0e = el.value;
        for (const bad of ["-1", "-1000", "0"]) {
          last.delete(creg.fn); el.value = bad; fire(el);
          const r = last.get(creg.fn);
          if (r && r.error) {
            found = true;
            const t = outputs.textContent;
            const words = r.error.replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter((w) => w.length > 4).slice(0, 4);
            if (!words.length || !words.some((w) => t.includes(w))) report.silentErrors.push(id + " (" + el.id + "=" + bad + "): " + r.error.slice(0, 70));
            if (shapes0 !== "0/0/0" && shapes() === shapes0) report.staleTables.push(id + " (" + el.id + "=" + bad + ") rows/svg/li " + shapes0);
            break;
          }
        }
        el.value = v0e; fire(el);
      }
    }
    const outText = () => outputs.querySelectorAll("span").filter((x) => x.classList.contains("out-value")).map((x) => x.textContent).join(" | ");
    for (const ta of inputs.querySelectorAll("textarea")) {
      const t0 = ta.value; if (!t0.trim()) continue;
      const before = outText();
      ta.value = t0 + "\nzz,yy,qq"; fire(ta);
      if (outText() === before) report.droppedLines.push(id + " " + ta.id);
      ta.value = t0; fire(ta);
    }
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
      // A label that promises a default ("default 500", "blank = 3 mph") must keep the
      // promise: blank runs with that default, or with 0 where the label documents 0 as
      // the "use the default" sentinel. 23 boxes errored or ran something else on a
      // blank until 2026-11-15 (the spec factories sent a blank as 0).
      const lab0 = labelOf(el);
      const dm = /(?:default|blank\s*=|blank uses|if blank)\s*:?\s*(-?[\d,]*\.?\d+)/i.exec(lab0);
      if (dm) {
        const stated = Number(dm[1].replace(/,/g, ""));
        const blankArgs = argsAfter(el, "");
        const rr = last.get(creg.fn);
        const src = (mod[creg.fn].__orig || mod[creg.fn]).toString(); const sig = src.slice(0, src.indexOf(") {"));
        const sm = new RegExp("\\b" + key + "\\s*=\\s*(-?[\\d.]+)").exec(sig);
        const ba = blankArgs?.[key];
        const used = ba === null || ba === undefined || ba === "" ? (sm ? Number(sm[1]) : undefined) : Number(ba);
        const sentinel = /\b0\s*=\s*default|blank\s*=/i.test(lab0) && used === 0;
        if (rr && rr.error) report.blankDefault.push(id + " " + key + ": blank errors (" + rr.error.slice(0, 60) + ")");
        else if (!sentinel && used !== undefined && Math.abs(used - stated) > 1e-9 * Math.max(1, Math.abs(stated))) report.blankDefault.push(id + " " + key + ": label says " + stated + ", blank runs with " + used);
      }
      const z = argsAfter(el, "0");
      const got = z && typeof z === "object" ? z[key] : undefined;
      if (z && got !== undefined && got !== null && got !== "" && Number(got) !== 0) report.mismatches[id + " " + key] = labelOf(el) + " | typed 0, compute got " + JSON.stringify(got);
      el.value = v0; fire(el);
    }
  } catch { /* render-text-sweep reports crashes */ }
}
process.stdout.write(JSON.stringify(report));
