// silent-flag-guard.test.js reads a schema tile's page through each output's
// format(r); the ~1,100 tiles drawn by hand-written renderers have no format()
// to call. This drives every renderer against the fake DOM instead, with each
// exported compute wrapped (compute-spy-loader.js) so the flags the code
// RETURNED can be held against the words the page PRINTED: from the worked
// example, change one control at a time (a number x0, x0.25, x0.5, x2, x4, x10;
// each select option; each checkbox). Where a flag-named boolean in the tile's
// own compute result flips and the output region's words (numbers stripped) do
// not change, report it. Prints a JSON report; see silent-flag-guard.test.js.
//
// --pairs (about 2 min, not in the unit suite): also change a SECOND control
// from each first-step state (numbers blanked, x0, x0.25, x4), comparing against
// that first-step state. That is the shape of the well-VFD and spa-drain bugs:
// a blank field that hid a verdict another field then flipped. Run it by hand
// when renderers change in bulk. Its 2026-11-14 run, after six fixes, left 17
// hits, each a flag masked by a louder verdict on the same page (OVER THE PEL,
// DOES NOT PASS, FAILS BOTH, OVERLOADED, ...) or reached only by an input no
// real case has; the unit test holds the one-input list, not these.
// registerHooks (in-thread) is Node 22.15+; CI runs Node 20, which has only the
// off-thread register(). The hook is the same either way.
import * as nodeModule from "node:module";
if (nodeModule.registerHooks) nodeModule.registerHooks({ load: (await import("./compute-spy-loader.js")).load });
else nodeModule.register("./compute-spy-loader.js", import.meta.url);

const calls = new Map();
globalThis.__computeSpy = (fn, name) => function (...a) {
  const r = fn.apply(this, a);
  if (!calls.has(name)) calls.set(name, r);
  return r;
};

const { installDocument, installTimers, flushTimers } = await import("./fake-dom.js");
const { RENDERER_MAP } = await import("./renderer-map.js");
const { COMPUTE_MAP } = await import("./compute-map.js");
const { FLAG } = await import("./silent-flag-pattern.js");
installTimers();
const doc = installDocument();
const { TOOLS } = await import("../../tools-data.js");

const PAIRS = process.argv.includes("--pairs");
const words = (s) => s.replace(/-?[\d.,]+(e[-+]?\d+)?/gi, "#").replace(/\s+/g, " ").trim();
const report = { withExample: 0, spied: 0, hits: [] };
for (const { id } of TOOLS) {
  const reg = RENDERER_MAP[id], creg = COMPUTE_MAP[id];
  if (!reg || !creg) continue;
  const render = (await import(new URL(reg.module, new URL("./", import.meta.url)).href))[reg.exportName]?.[id];
  if (typeof render !== "function") continue;
  doc.body.replaceChildren();
  const view = doc.createElement("section");
  const inputs = doc.createElement("div"), outputs = doc.createElement("div"), cite = doc.createElement("p");
  view.append(inputs, outputs, cite);
  doc.body.appendChild(view);
  const fire = (el) => { calls.clear(); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); flushTimers(); };
  const read = () => { const r = calls.get(creg.fn); return r && typeof r === "object" && !r.error ? { r, t: words(outputs.textContent) } : null; };
  const seen = new Set();
  try {
    await render(inputs, outputs, cite);
    flushTimers();
    const btn = view.querySelectorAll("button").find((b) => b.classList.contains("example-btn"));
    if (!btn) continue;
    calls.clear();
    btn.click();
    flushTimers();
    report.withExample++;
    const base = read();
    if (!base) continue;
    report.spied++;
    const compare = (state, ref = base) => {
      const v = read();
      if (!v || !ref || v.t !== ref.t) return;
      for (const [k, bv] of Object.entries(ref.r)) {
        if (typeof bv !== "boolean" || typeof v.r[k] !== "boolean" || bv === v.r[k] || !FLAG.test(k) || seen.has(k)) continue;
        seen.add(k);
        report.hits.push({ key: id + " " + k, state, from: bv, to: v.r[k] });
      }
    };
    // Each control and the values it is tried at, one at a time from the example.
    const ctrls = [];
    for (const el of inputs.querySelectorAll("input")) {
      if (el.type === "checkbox" || el.type === "radio") { const c = el.checked; ctrls.push({ el, vals: [!c], set: (x) => { el.checked = x; }, restore: () => { el.checked = c; } }); continue; }
      const v = el.value, x = Number(v);
      if (v === "" || !Number.isFinite(x)) continue;
      ctrls.push({ el, vals: (PAIRS ? [""] : []).concat([0, 0.25, 0.5, 2, 4, 10].map((m) => String(+(x * m).toPrecision(6)))), second: ["", ...[0, 0.25, 4].map((m) => String(+(x * m).toPrecision(6)))], set: (y) => { el.value = y; }, restore: () => { el.value = v; } });
    }
    for (const el of inputs.querySelectorAll("select")) { const v = el.value; const opts = [...el.options].map((o) => o.value).filter((o) => o !== v); ctrls.push({ el, vals: opts, second: opts, set: (y) => { el.value = y; }, restore: () => { el.value = v; } }); }
    for (const A of ctrls) for (const a of A.vals) {
      A.set(a); fire(A.el);
      const state = A.el.id + "=" + JSON.stringify(a);
      compare(state);
      if (PAIRS) {
        const ref = read();
        for (const B of ctrls) if (B !== A) for (const b of B.second || B.vals) { B.set(b); fire(B.el); compare(state + " " + B.el.id + "=" + JSON.stringify(b), ref); B.restore(); fire(B.el); }
      }
      A.restore(); fire(A.el);
    }
  } catch { /* render-text-sweep reports crashes */ }
}
process.stdout.write(JSON.stringify(report));
