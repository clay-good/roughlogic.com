// Renders every tile against the fake DOM, loads its example, then scales each
// numeric input down (x0.01 .. x0.5) so counts fall to one, and reports every
// output line that prints "1" beside a plural word ("1 trips", "1 benches",
// "1 seconds longer"). count-noun-agreement.test.js reads the report; it
// catches what the source-shape check there cannot see (bare variables,
// .length, a raw value compared where the rounded one is printed). Added
// 2026-11-14.
import { installDocument, installTimers, flushTimers } from "./fake-dom.js";
import { RENDERER_MAP } from "./renderer-map.js";

installTimers();
const doc = installDocument();
const { TOOLS } = await import("../../tools-data.js");

const ONE = /(?:^|[\s(=])1 ([a-z]{3,}s)\b/g;

const report = { withExample: 0, hits: [] };
for (const { id } of TOOLS) {
  const reg = RENDERER_MAP[id];
  if (!reg) continue;
  const render = (await import(new URL(reg.module, new URL("./", import.meta.url)).href))[reg.exportName]?.[id];
  if (typeof render !== "function") continue;
  doc.body.replaceChildren();
  const view = doc.createElement("section");
  const inputs = doc.createElement("div"), outputs = doc.createElement("div"), cite = doc.createElement("p");
  view.append(inputs, outputs, cite);
  doc.body.appendChild(view);
  const fire = (el) => { el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); flushTimers(); };
  const seen = new Set();
  const scan = (state) => {
    for (const line of outputs.querySelectorAll("span").filter((x) => x.classList.contains("out-value"))) {
      const text = line.textContent;
      for (const m of text.matchAll(ONE)) {
        const ctx = text.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, " ").replace(/\d[\d,.]*/g, "#");
        if (seen.has(m[1] + ctx)) continue;
        seen.add(m[1] + ctx);
        report.hits.push({ id, word: m[1], state, text: text.slice(Math.max(0, m.index - 50), m.index + 60).replace(/\s+/g, " ") });
      }
    }
  };
  try {
    await render(inputs, outputs, cite);
    flushTimers();
    const btn = view.querySelectorAll("button").find((b) => b.classList.contains("example-btn"));
    if (!btn) continue;
    btn.click();
    flushTimers();
    report.withExample++;
    scan("example");
    for (const el of inputs.querySelectorAll("input")) {
      if (el.type !== "number" && !el.dataset?.lengthUnit) continue;
      const v = el.value, x = Number(v);
      if (v === "" || !Number.isFinite(x) || x === 0) continue;
      for (const k of [0.01, 0.05, 0.1, 0.2, 0.5]) { el.value = String(+(x * k).toPrecision(6)); fire(el); scan(el.id + " x" + k); }
      el.value = v; fire(el);
    }
  } catch { /* render-text-sweep reports crashes */ }
}
process.stdout.write(JSON.stringify(report));
