// Renders every tile against the fake DOM, loads its example, then for each
// number input labelled as a temperature compares the output with the box
// cleared against the box holding 0. The same answer twice means the page read
// a blank temperature as 0 degrees and printed it with confidence. 0 F and 0 C
// are real readings, so only the blank is the defect. Prints a JSON report;
// see test/unit/render-text-guard.test.js.
import { installDocument, installTimers, flushTimers } from "./fake-dom.js";
import { RENDERER_MAP } from "./renderer-map.js";

installTimers();
const doc = installDocument();
const { TOOLS } = await import("../../tools-data.js");

const TEMP = /temp|deg ?F|deg ?C|°|ambient|\bOAT\b/i;
// A difference, a rise, a coefficient or a field that says 0 skips it is
// legitimately 0 when blank.
const SKIP = /0 to skip|optional|rise|delta|difference|swing|coeff|per |%|drop|split|approach|range|change|gain|lift|blank/i;

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
  const text = () => outputs.querySelectorAll("span").filter((x) => x.classList.contains("out-value")).map((x) => x.textContent).join(" | ");
  try {
    await render(inputs, outputs, cite);
    flushTimers();
    const btn = view.querySelectorAll("button").find((b) => b.classList.contains("example-btn"));
    if (!btn) continue;
    btn.click();
    flushTimers();
    report.withExample++;
    const labels = inputs.querySelectorAll("label");
    for (const el of inputs.querySelectorAll("input")) {
      if (el.type !== "number") continue;
      const lab = labels.find((l) => l.htmlFor === el.id || l.getAttribute("for") === el.id);
      const name = (lab ? lab.textContent : "") + " " + el.id;
      if (!TEMP.test(name) || SKIP.test(name)) continue;
      const v = el.value;
      el.value = ""; fire(el); const blank = text();
      el.value = "0"; fire(el); const zero = text();
      el.value = v; fire(el);
      if (blank === zero && /\d/.test(blank) && !/enter|required|error|invalid|must be|cannot/i.test(blank.slice(0, 200))) report.hits.push(id + "::" + el.id);
    }
  } catch { /* render-text-sweep reports crashes */ }
}
process.stdout.write(JSON.stringify(report));
