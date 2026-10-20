// Renders every tile against the fake DOM, loads its example, then scales each
// numeric input by 0.2, 0.5, 2 and 5 and reads the output lines for a minus
// sign in front of a figure the sentence already gives a direction ("-33.3 %
// less", "saving -8.8 min", "up -5.46 ft"). Prints a JSON report; see
// test/unit/render-text-guard.test.js.
import { installDocument, installTimers, flushTimers } from "./fake-dom.js";
import { RENDERER_MAP } from "./renderer-map.js";

installTimers();
const doc = installDocument();
const { TOOLS } = await import("../../tools-data.js");

const NUM = "-\\$?\\d[\\d,]*(?:\\.\\d+)?";
const UNIT = "(?:\\s?(?:%|percent|x|times|lb|ft|in|gal|psi|psig|dB|V|A|W|kW|hours?|hr|min|days?|years?|cfm|gpm|tons?|cy|MBF|points|sq ft|deg F|degF))?";
// figure, then the direction word (at most two words between: "-5 lb per ton more")
const AFTER = new RegExp("(?:^|[\\s(])" + NUM + UNIT + "\\s(?:(?!the\\b)[a-z]+\\s){0,2}?(?:less|more|fewer|saved|saving|savings|short|shorter|longer|taller|wider|thicker|thinner|slower|faster|finer|heavier|lighter|smaller|larger|higher|lower|over rated)\\b(?! negative)", "i");
// direction word, then the figure
const BEFORE = new RegExp("\\b(?:saving of|saving|saves|short by|over by|under by|off by|another|extra|up|down|risen|fallen|increase of|decrease of|reduction of|underpitches by|overstates it by)\\s" + NUM, "i");

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
  let hit = false;
  const scan = (state) => {
    if (hit) return;
    for (const line of outputs.querySelectorAll("span").filter((x) => x.classList.contains("out-value"))) {
      const text = line.textContent;
      const m = text.match(AFTER) || text.match(BEFORE);
      if (m) { hit = true; report.hits.push(`${id} (${state}): ...${text.slice(Math.max(0, m.index - 50), m.index + 60).replace(/\s+/g, " ")}`); return; }
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
      for (const k of [0.2, 0.5, 2, 5]) { el.value = String(+(x * k).toPrecision(6)); fire(el); scan(el.id + " x" + k); }
      el.value = v; fire(el);
    }
  } catch { /* render-text-sweep reports crashes */ }
}
process.stdout.write(JSON.stringify(report));
