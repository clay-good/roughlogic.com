// Renders every tile against the fake DOM, loads its example, then scales each
// numeric input down (x0.01 .. x0.5) so counts fall to one, and reports every
// output line that prints "1" beside a plural word ("1 trips", "1 benches",
// "1 seconds longer"). count-noun-agreement.test.js reads the report; it
// catches what the source-shape check there cannot see (bare variables,
// .length, a raw value compared where the rounded one is printed). Added
// 2026-11-14. The same pass reports two more kinds, read by
// render-text-guard.test.js: "a" before a figure said with a vowel sound
// ("a 85 dB target", "a 11 ft landing"; aFig() in ui-fields.js picks the
// article) and a negative zero ("-0.000 ft"); since 2026-11-15 also a raw
// float tail ("6.6000000000000005 ft") and a full-precision exponent.
import { installDocument, installTimers, flushTimers } from "./fake-dom.js";
import { RENDERER_MAP } from "./renderer-map.js";

installTimers();
const doc = installDocument();
const { TOOLS } = await import("../../tools-data.js");

const KINDS = [];

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
      for (const [kind, re] of KINDS) {
        for (const m of text.matchAll(re)) {
          const word = kind === "plural" ? m[1] : m[0].trim();
          const ctx = kind + text.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, " ").replace(/\d[\d,.]*/g, "#");
          if (seen.has(ctx)) continue;
          seen.add(ctx);
          report.hits.push({ id, kind, word, state, text: text.slice(Math.max(0, m.index - 50), m.index + 60).replace(/\s+/g, " ") });
        }
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
    const labelOf = (el) => (view.querySelectorAll("label").find((l) => l.htmlFor === el.id)?.textContent || "");
    const COUNT = /\b(count|number of|how many|quantity|qty|bolts|cabinets|poles|pins|people|workers|crew size|carriers|persons|stories|floors|columns|rows|bays|spans|strands|conductors|circuits|sprinklers|heads|fixtures|anchors|piles|lanes|doors|windows|teeth|starts|cycles per)\b/i;
    const text0 = outputs.textContent;
    for (const el of inputs.querySelectorAll("input")) {
      if (el.type !== "number") continue;
      const lab = labelOf(el);
      if (!COUNT.test(lab) || /\b(per|rate|ratio|average|avg|%|percent|factor|fraction|hours|ft|in\b|lb|psi|gal|gpm|cfm|mph|sq|kw|watts|amps|volts|\$)/i.test(lab)) continue;
      const v = el.value, x = Number(v);
      if (!Number.isInteger(x) || x < 2) continue;
      el.value = String(x + 0.5); fire(el);
      const t = outputs.textContent;
      const refused = /\b(whole|integer|must|cannot|round)\b/i.test(outputs.querySelectorAll("span").find((s) => s.classList.contains("out-value"))?.textContent || "");
      const halfShown = /\d\.5\b/.test(t) && !/\d\.5\b/.test(text0);
      if (!refused && t !== text0) report.hits.push({ id, label: lab, value: x + 0.5, halfShown, sample: (t.match(/[^.]{0,60}\d\.5\b[^.]{0,30}/) || [""])[0] });
      el.value = v; fire(el);
    }
  } catch { /* render-text-sweep reports crashes */ }
}
process.stdout.write(JSON.stringify(report));
