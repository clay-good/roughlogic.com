// What does a calculator actually RECEIVE from an empty box?
//
// scripts/measure-phantom-defaults.mjs probes the COMPUTE -- it runs the tile
// with a key absent and with an explicit 0 and calls the difference a hidden
// value. That is the right question to ask of a compute and the wrong one to
// ask of a PAGE, because it never looks at what the renderer sends. A hand-
// written renderer that reads a blank box as `null` (ohms-law's readNum) or as
// `Number(v) || 0` passes a value, so the compute's signature default never
// applies and nothing is hidden at all.
//
// This drives every renderer against the fake DOM under the compute spy, clears
// every number box, and reports which arguments arrive as `undefined` -- the
// only shape a destructuring default can fill. That is the true page figure.
// Prints a JSON report; scripts/measure-phantom-defaults.mjs reads it.
import * as nodeModule from "node:module";
if (nodeModule.registerHooks) nodeModule.registerHooks({ load: (await import("./compute-spy-loader.js")).load });
else nodeModule.register("./compute-spy-loader.js", import.meta.url);

const lastArgs = new Map();
globalThis.__computeSpy = (fn, name) => {
  const w = function (...a) { const r = fn.apply(this, a); lastArgs.set(name, a[0]); return r; };
  w.__orig = fn;
  return w;
};

const { installDocument, installTimers, flushTimers } = await import("./fake-dom.js");
const { RENDERER_MAP } = await import("./renderer-map.js");
const { COMPUTE_MAP } = await import("./compute-map.js");
installTimers();
const doc = installDocument();
const { TOOLS } = await import("../../tools-data.js");

const report = { tiles: 0, undefinedArgs: {}, rendered: 0 };
for (const { id } of TOOLS) {
  const reg = RENDERER_MAP[id], creg = COMPUTE_MAP[id];
  if (!reg || !creg) continue;
  let mod, render;
  try {
    mod = await import(new URL(creg.module, new URL("./", import.meta.url)).href);
    render = (await import(new URL(reg.module, new URL("./", import.meta.url)).href))[reg.exportName]?.[id];
  } catch { continue; }
  if (typeof render !== "function" || typeof mod[creg.fn] !== "function") continue;

  doc.body.replaceChildren();
  const view = doc.createElement("section");
  const inputs = doc.createElement("div"), outputs = doc.createElement("div"), cite = doc.createElement("p");
  view.append(inputs, outputs, cite);
  doc.body.appendChild(view);
  try {
    await render(inputs, outputs, cite);
    flushTimers();
    report.rendered += 1;
    // The page AS IT OPENS. Boxes are left exactly as the renderer built them,
    // so a field that declares a default is prefilled and the reader can see
    // the number -- clearing it instead would measure a reader who deleted a
    // shown value, which is a different question and the one this sweep got
    // wrong on its first run (2026-11-24: it reported 1,591 "hidden" values,
    // 748 of them boxes the page prefills and the reader can read).
    const boxes = inputs.querySelectorAll("input").filter((el) => el.type === "number");
    if (!boxes.length) continue;
    lastArgs.delete(creg.fn);
    for (const el of boxes) {
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    flushTimers();
    const args = lastArgs.get(creg.fn);
    if (!args || typeof args !== "object" || Array.isArray(args)) continue;
    report.tiles += 1;
    // `undefined` is the only shape a destructuring default can fill. A key the
    // renderer omitted entirely counts too, which is the same thing to the
    // compute; both are reported, and a key present as null or 0 is not.
    const named = new Set(Object.keys(args));
    const sig = String(mod[creg.fn]);
    const open = sig.indexOf("("), brace = sig.indexOf("{", open);
    const params = brace > 0 && !sig.slice(open, brace).includes(")")
      ? [...sig.slice(brace + 1, sig.indexOf("}", brace) + 1).matchAll(/([A-Za-z_$][\w$]*)\s*=/g)].map((m) => m[1])
      : [];
    const blank = [...named].filter((k) => args[k] === undefined)
      .concat(params.filter((k) => !named.has(k)));
    if (blank.length) report.undefinedArgs[id] = [...new Set(blank)];
  } catch { /* a renderer that will not drive is not evidence either way */ }
}
console.log(JSON.stringify(report));
