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

// rows[0] per tile is the worked example the page prints (see
// test/integration/example-parity-runtime.test.js, whose comparison this
// repeats without a browser).
const { readFileSync } = await import("node:fs");
const FIRST_ROW = new Map();
for (const row of JSON.parse(readFileSync(new URL("./worked-examples.json", import.meta.url), "utf8")).rows) {
  if (!FIRST_ROW.has(row.tile_id)) FIRST_ROW.set(row.tile_id, row);
}
const near = (a, b) => Math.abs(a - b) <= Math.max(Math.abs(b) * 0.002, 1e-9);
function present(value, shown) {
  if (typeof value === "number" || (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)))) {
    const n = Number(value);
    return shown.some((x) => String(x).trim() !== "" && Number.isFinite(Number(x)) && near(n, Number(x)));
  }
  if (typeof value === "string") return shown.some((x) => String(x).trim().toLowerCase() === value.trim().toLowerCase());
  return true; // booleans, arrays and objects: other gates own those
}

const report = { rendered: 0, withExample: 0, leaks: [], crashes: [], exampleErrors: [], unlistened: [], exampleMismatch: [], exampleCompared: 0 };
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
    // A control nobody listens to: typing in it changes nothing until another field does.
    const delegated = inputs.listeners.some((l) => (l.t === "input" || l.t === "change") && !l.capture);
    const heard = (el) => { for (let n = el; n && n !== inputs; n = n.parentNode) if (n.listeners.some((l) => ["input", "change", "click", "keyup"].includes(l.t))) return true; return false; };
    if (!delegated) for (const el of [...inputs.querySelectorAll("input"), ...inputs.querySelectorAll("select"), ...inputs.querySelectorAll("textarea")]) {
      if (el.type !== "button" && el.type !== "file" && !heard(el)) report.unlistened.push(`${id}: ${el.tagName.toLowerCase()}#${el.id}`);
    }
    const btn = view.querySelectorAll("button").find((b) => b.classList.contains("example-btn"));
    if (!btn) continue;
    btn.click();
    flushTimers();
    report.withExample++;
    scan("example");
    // The button must load the worked example the page prints. Values, not
    // keys: half or more of the fixture's inputs missing from the form is a
    // different example (the runtime spec's threshold, and its reasons).
    const row = FIRST_ROW.get(id);
    const wanted = row && row.inputs ? Object.entries(row.inputs).filter(([, v]) => v !== null && v !== undefined && typeof v !== "object" && typeof v !== "boolean") : [];
    if (wanted.length) {
      report.exampleCompared++;
      const shown = [];
      for (const el of [...inputs.querySelectorAll("input"), ...inputs.querySelectorAll("textarea")]) if (el.value != null && String(el.value).trim() !== "") shown.push(el.value);
      for (const el of inputs.querySelectorAll("select")) {
        shown.push(el.value);
        const picked = [...el.options].find((o) => o.value === el.value);
        if (picked) shown.push(picked.textContent);
      }
      const missing = wanted.filter(([, v]) => !present(v, shown));
      if (missing.length * 2 >= wanted.length) report.exampleMismatch.push(`${id}: ${missing.length}/${wanted.length} fixture inputs absent (${missing.map(([k, v]) => `${k}=${JSON.stringify(v)}`).slice(0, 4).join(", ")})`);
    }
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
