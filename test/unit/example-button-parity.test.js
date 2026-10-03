// The "Test with example" button must load the tile's own worked example.
//
// check-example-parity pins each `<name>Example` export to the fixture the page
// prints, and example-parity-runtime drives the tiles that have NO export. A
// third class fell between them: a tile WITH an export whose renderer fills the
// button from inline literals instead. Those literals drifted unseen --
// char-depth-capacity added a 0.2 in layer the example leaves at 0, sprayer-
// calibration filled 20 ft where the example has a 1.667 ft nozzle spacing, and
// gas-leak-hole-diameter opened at 3.15 cfh against the printed 7.72 (all found
// 2026-10-03).
//
// The check: every number the button types must be one of the example's input
// values or one of the compute's own defaults. A reviewed exception fills a
// field the example does not use (another mode, a unit-converted twin, a list).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { COMPUTE_MAP, importCalc } from "../fixtures/compute-map.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REVIEWED = new Map([
  ["cctv-storage", "50% motion duty fills the motion-mode field"],
  ["cctv-retention-days", "50% motion duty fills the motion-mode field"],
  ["recirc-loop-sizing", "fills the optional annual-cost extension fields"],
  ["sanitary-dfu", "fixture counts are an object, not scalar inputs"],
  ["pipe-velocity", "0.75 is the nominal size select; fillID() writes the 0.785 in ID"],
  ["radiant-floor-output", "30 Btu/h-ft2 fills the inverse-mode target"],
  ["soil-permeability", "fills the falling-head fields as well"],
  ["gear-cascade", "the gear train is a list input"],
  ["well-drawdown", "fills the optional recovery and Jacob fields"],
  ["langelier-index", "77 F is the example's 25 C in the imperial field"],
  ["spl-atmospheric", "the form is imperial; the example is metric"],
  ["amp-power-spl", "3.28 ft is the example's 1 m"],
  ["azimuth-bearing-conversion", "41.5 fills the bearing-to-azimuth mode"],
]);

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const near = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)) || Math.abs(a - b) < 0.0006;

test("every inline example button types only the example's values or the compute's defaults", async () => {
  const map = readFileSync(resolve(ROOT, "test/fixtures/renderer-map.js"), "utf8");
  const bad = [];
  let checked = 0;
  for (const m of map.matchAll(/"([a-z0-9-]+)":\s*\{\s*module:\s*"([^"]+)"/g)) {
    const [, id, modPath] = m;
    const reg = COMPUTE_MAP[id];
    if (!reg || REVIEWED.has(id)) continue;
    const src = readFileSync(resolve(ROOT, modPath.replace(/^\.\.\/\.\.\//, "")), "utf8");
    const a = new RegExp('\\["' + id + '"\\]\\s*=\\s*(\\w+)\\s*;').exec(src);
    if (!a) continue;
    const f = new RegExp("function " + a[1] + "\\s*\\(").exec(src);
    if (!f) continue;
    const body = src.slice(f.index, src.indexOf("\n}\n", f.index));
    const k = body.indexOf("attachExampleButton(");
    if (k < 0) continue;
    let d = 0, j = k + "attachExampleButton".length;
    for (; j < body.length; j++) { if (body[j] === "(") d++; else if (body[j] === ")" && --d === 0) break; }
    const typed = [...body.slice(k, j).matchAll(/\.value = "(-?[\d.]+)"/g)].map((x) => Number(x[1]));
    if (!typed.length) continue;
    const mod = await importCalc(reg.module);
    const stem = reg.fn.replace(/^compute/, "");
    const names = [stem[0].toLowerCase() + stem.slice(1) + "Example", camel(id) + "Example"].map((n) => n.toLowerCase());
    const key = Object.keys(mod).find((x) => names.includes(x.toLowerCase()));
    if (!key || !mod[key].inputs) continue;
    const numbers = (v) => typeof v === "number" ? [v]
      : typeof v === "string" && /^[-\d., ]+$/.test(v) ? v.split(",").map(Number)
      : v && typeof v === "object" ? Object.values(v).flatMap(numbers) : [];
    const allowed = numbers(mod[key].inputs);
    const fsrc = mod[reg.fn].toString();
    const sig = fsrc.slice(0, fsrc.indexOf("{", fsrc.indexOf("}") + 1));
    for (const dflt of sig.matchAll(/\b\w+ = (-?[\d.]+)/g)) allowed.push(Number(dflt[1]));
    checked++;
    const stray = typed.filter((t) => !allowed.some((v) => near(t, v)));
    if (stray.length) bad.push(`${id}: button types ${JSON.stringify(stray)} not in ${key}`);
  }
  assert.ok(checked > 600, `only ${checked} inline buttons were checked; the renderer-map scan broke`);
  assert.deepEqual(bad, []);
});

// The same drift in a renderer's blank-field fallback (`key: f.input.value === ""
// ? N : ...`): a reader who leaves an optional field blank should get the compute's
// documented default. 2026-10-03: 14 fallbacks typed 0 where the compute defaults
// to 5% grade, a 12 in drum, 15 ft of makeup, 5% waste... and rainwater catchment
// fell back to 0.62 (the gal/in-ft^2 constant misread as an efficiency).
const FALLBACK_REVIEWED = new Map([
  ["calc-hvacservice.js:air_temp_f", "a measurement; 70 F room air, as the example"],
  ["calc-instrumentation.js:flow_high", "the transmitter range, 500 as the example"],
  ["calc-instrumentation.js:resistance_ohms", "a measurement, 20,000 as the example"],
  ["calc-lab.js:temperature_c", "the renderers call computeVanDerWaals (a measured temperature) and computeOsmolarity (37 C), not Nernst"],
]);

test("a blank optional field falls back to the compute's own default", () => {
  const bad = [];
  for (const f of readdirSync(ROOT).filter((x) => /^calc-.*\.js$/.test(x))) {
    const src = readFileSync(resolve(ROOT, f), "utf8");
    const sigs = [...src.matchAll(/export function (compute\w+)\(\{([^}]*)\}/g)].map((m) => ({
      fn: m[1], at: m.index,
      defs: Object.fromEntries([...m[2].matchAll(/(\w+)\s*=\s*(-?[\d.]+)/g)].map((d) => [d[1], Number(d[2])])),
    }));
    for (const m of src.matchAll(/(\w+):\s*\w+\.input\.value\s*===\s*""\s*\?\s*(-?[\d.]+)\s*:/g)) {
      const [, key, fb] = m;
      if (FALLBACK_REVIEWED.has(f + ":" + key)) continue;
      const before = sigs.filter((s) => key in s.defs && s.at < m.index);
      const s = before[before.length - 1] || sigs.find((x) => key in x.defs);
      if (s && Math.abs(s.defs[key] - Number(fb)) > 1e-9) bad.push(`${f}:${src.slice(0, m.index).split("\n").length} ${key} blank -> ${fb}, ${s.fn} default ${s.defs[key]}`);
    }
  }
  assert.deepEqual(bad, []);
});
