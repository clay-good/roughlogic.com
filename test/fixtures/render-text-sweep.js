// Renders every tile against the fake DOM, clicks "Test with example", then
// blanks each input, cycles every select option, and toggles each checkbox,
// reading the output region after each change. Prints a JSON report; see
// test/unit/render-text-guard.test.js.
import { installDocument, installTimers, flushTimers } from "./fake-dom.js";
import { RENDERER_MAP } from "./renderer-map.js";

installTimers();
const doc = installDocument();
const { TOOLS } = await import("../../tools-data.js");

const BAD = /\bnull\b|\bundefined|\bNaN|\bInfinity/;
// Prose where the word is the subject: an acoustic or locator null, and a
// fraction the tile explains is mathematically undefined.
const ALLOWED = /\b(?:a|no|that|the|first|each|left|right) null\b|\bfraction is undefined\b/gi;

const report = { rendered: 0, withExample: 0, leaks: [], crashes: [], exampleErrors: [] };
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
  let leaked = false;
  const scan = (state) => {
    if (leaked) return;
    const text = outputs.textContent.replace(ALLOWED, "");
    const m = text.match(BAD);
    if (m) { leaked = true; report.leaks.push(`${id} (${state}): ...${text.slice(Math.max(0, m.index - 60), m.index + 20).replace(/\s+/g, " ")}`); }
  };
  try {
    await render(inputs, outputs, cite);
    flushTimers();
    report.rendered++;
    const btn = view.querySelectorAll("button").find((b) => b.classList.contains("example-btn"));
    if (!btn) continue;
    btn.click();
    flushTimers();
    report.withExample++;
    scan("example");
    // The renderer factories show a compute error by writing it into the first
    // line and "-" into every other one. A worked example should never land there.
    const lines = outputs.querySelectorAll("span").filter((x) => x.classList.contains("out-value") && !x.classList.contains("note-value"));
    if (lines.length > 1 && lines.slice(1).every((x) => x.textContent.trim() === "-") && /\b(must|cannot|enter|invalid|is required)\b/i.test(lines[0].textContent)) report.exampleErrors.push(`${id}: ${lines[0].textContent.slice(0, 120)}`);
    for (const el of inputs.querySelectorAll("input")) {
      if (el.type === "checkbox" || el.type === "radio") { el.checked = !el.checked; fire(el); scan("toggle " + el.id); el.checked = !el.checked; fire(el); continue; }
      const v = el.value; el.value = ""; fire(el); scan("blank " + el.id); el.value = v; fire(el);
    }
    for (const el of inputs.querySelectorAll("select")) {
      const v = el.value;
      for (const o of el.options) { el.value = o.value; fire(el); scan("select " + el.id + "=" + o.value); }
      el.value = v; fire(el);
    }
  } catch (e) {
    report.crashes.push(`${id}: ${e && e.message}`);
  }
}
process.stdout.write(JSON.stringify(report));
