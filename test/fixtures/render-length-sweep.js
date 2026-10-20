// spec-v1970: renders every tile against the fake DOM, loads its example, and for
// each feet or inches box retypes the example's decimal as a tape reading
// (8.5 ft as 8'6", 3.5 in as 3-1/2) and requires every output line to read the
// same as with the decimal. Prints a JSON report; see test/unit/length-entry.test.js.
import { installDocument, installTimers, flushTimers } from "./fake-dom.js";
import { RENDERER_MAP } from "./renderer-map.js";

installTimers();
const doc = installDocument();
const { TOOLS } = await import("../../tools-data.js");

// A sixteenth-exact tape spelling of x in the box's unit, or null.
function tape(x, unit) {
  if (!(x > 0)) return null;
  const sixteenths = Math.round((unit === "ft" ? x * 12 : x) * 16);
  if (Math.abs(sixteenths / 16 - (unit === "ft" ? x * 12 : x)) > 1e-9) return null;
  const inchesTotal = sixteenths / 16;
  const whole = Math.floor(inchesTotal + 1e-9), rem = sixteenths - whole * 16;
  const g = (a, b) => (b ? g(b, a % b) : a), d = rem ? g(rem, 16) : 1;
  const fracText = rem ? rem / d + "/" + 16 / d : "";
  if (unit === "in") return rem ? (whole ? whole + "-" + fracText : fracText) : null; // plain whole inches stay plain
  const ft = Math.floor(whole / 12), inch = whole % 12;
  if (!ft) return null;
  return ft + "'" + (inch || rem ? (inch ? inch : "") + (inch && rem ? " " : "") + fracText + '"' : "");
}

const report = { tiles: 0, boxes: 0, mismatches: [] };
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
  const read = () => outputs.querySelectorAll("span").filter((x) => x.classList.contains("out-value")).map((x) => x.textContent).join(" | ");
  try {
    await render(inputs, outputs, cite);
    flushTimers();
    const btn = view.querySelectorAll("button").find((b) => b.classList.contains("example-btn"));
    if (!btn) continue;
    btn.click();
    flushTimers();
    let counted = false;
    for (const el of inputs.querySelectorAll("input")) {
      const unit = el.dataset?.lengthUnit;
      if (!unit) continue;
      const v = el.value, spelled = tape(Number(v), unit);
      if (v === "" || !spelled) continue;
      if (!counted) { report.tiles++; counted = true; }
      report.boxes++;
      el.value = v; fire(el);
      const before = read();
      el.value = spelled; fire(el);
      const after = read();
      if (el.value !== String(Number(v)) || after !== before) report.mismatches.push(id + "#" + el.id + ": " + spelled + " read " + el.value + " for " + v);
      el.value = v; fire(el);
    }
  } catch { /* render-text-sweep reports crashes */ }
}
process.stdout.write(JSON.stringify(report));
