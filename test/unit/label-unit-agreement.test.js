// A field label states its unit to the reader -- "Cut-in pressure (psi)" --
// and the key's `// dims:` annotation states a dimension to the gates. Until
// now nothing compared them, and they are the two surfaces most likely to
// drift apart: the label is written for a person and the annotation for a
// machine, by different edits, months apart.
//
// check-dimensions reads the KEY NAME for its unit, which catches `_psi`
// declared as a length. It cannot catch a key whose name carries no unit at
// all: `class_life`, `dso`, `dio`, `dpo` and `v_ll` each said `dimensionless`
// while their own label said years, days or volts, and no rule could see it.
// The sweep that proposed this test compared 1,530 labelled inputs (1,348 of
// them under this test's narrower unit list) and found eleven such keys; all
// eleven are fixed, and this holds the line.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BESPOKE_LABELS } from "../fixtures/bespoke-labels.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// A parenthetical unit a label may end with -> the dimension it means. Only
// units whose reading is unambiguous appear here: `lb`, `pcf` and `tons` are
// left out because the pound convention makes them a force or a mass by
// context, and `M` is left out because a label means MOLAR by it, not metres.
const LABEL_UNIT = Object.freeze({
  ft: "L", in: "L", mm: "L", cm: "L", mi: "L", yd: "L", km: "L",
  "sq ft": "L^2", "ft^2": "L^2", "sq in": "L^2", "in^2": "L^2", "m^2": "L^2", acres: "L^2",
  "cu ft": "L^3", "ft^3": "L^3", "cu in": "L^3", "in^3": "L^3", "cu yd": "L^3", "yd^3": "L^3",
  gal: "L^3", gallons: "L^3", l: "L^3", ml: "L^3", liters: "L^3", cy: "L^3",
  psi: "M L^-1 T^-2", psig: "M L^-1 T^-2", psf: "M L^-1 T^-2", ksi: "M L^-1 T^-2",
  kpa: "M L^-1 T^-2", bar: "M L^-1 T^-2", atm: "M L^-1 T^-2",
  gpm: "L^3 T^-1", cfm: "L^3 T^-1", cfs: "L^3 T^-1", gph: "L^3 T^-1", gpd: "L^3 T^-1",
  mgd: "L^3 T^-1", scfm: "L^3 T^-1",
  a: "I", amps: "I", v: "M L^2 T^-3 I^-1", kv: "M L^2 T^-3 I^-1",
  w: "M L^2 T^-3", kw: "M L^2 T^-3", hp: "M L^2 T^-3", "btu/h": "M L^2 T^-3", btuh: "M L^2 T^-3",
  btu: "M L^2 T^-2", kwh: "M L^2 T^-2",
  hr: "T", hours: "T", min: "T", minutes: "T", sec: "T", days: "T", yr: "T", years: "T",
  mph: "L T^-1", fpm: "L T^-1", fps: "L T^-1", rpm: "T^-1", hz: "T^-1",
  "mg/l": "M L^-3",
});

// Keys whose parenthetical is not the unit of the value.
const EXEMPT = new Map([
  ["steam-pipe-capacity.nps", "NPS is a nominal SIZE designation, not a measured length"],
  ["motor-feeder-multiple.motors", "a typed list of motors; the (A) describes an item inside it"],
]);

function canonical(expr) {
  const t = String(expr).replace(/\*/g, " ").trim();
  if (t === "dimensionless") return "1";
  const map = new Map();
  let sign = 1;
  for (const tok of t.split(/(\s+|\/)/)) {
    if (!tok || /^\s+$/.test(tok)) continue;
    if (tok === "/") { sign = -1; continue; }
    const m = tok.match(/^([A-Za-z]+)(?:\^(-?\d+))?$/);
    if (!m) return null;
    map.set(m[1], (map.get(m[1]) || 0) + (m[2] ? parseInt(m[2], 10) : 1) * sign);
    sign = 1;
  }
  const parts = [...map.entries()].filter(([, e]) => e !== 0).sort((a, b) => a[0].localeCompare(b[0]));
  return parts.length ? parts.map(([b, e]) => b + "^" + e).join(" ") : "1";
}

export function declaredDimensions(root = ROOT) {
  const dims = new Map();
  for (const f of readdirSync(root).filter((n) => /^calc-.*\.js$/.test(n))) {
    for (const line of readFileSync(resolve(root, f), "utf8").split("\n")) {
      if (!line.includes("// dims:")) continue;
      for (const [, k, d] of line.split("// dims:")[1].matchAll(/(\w+): ([^,}]+)/g)) {
        if (k === "in" || k === "out") continue;
        const c = canonical(d);
        if (!c) continue;
        if (!dims.has(k)) dims.set(k, new Set());
        dims.get(k).add(c);
      }
    }
  }
  return dims;
}

export function labelDisagreements(labels, dims) {
  const bad = [];
  let compared = 0;
  for (const [tile, fields] of Object.entries(labels)) {
    for (const [key, label] of Object.entries(fields)) {
      if (EXEMPT.has(tile + "." + key)) continue;
      const m = /\(([^()]{1,8})\)\s*$/.exec(String(label));
      if (!m) continue;
      const want = LABEL_UNIT[m[1].trim().toLowerCase()];
      if (!want) continue;
      const declared = dims.get(key);
      // A key declared two ways is the key-agreement rule's business, not this
      // one's; judging it here would report the same defect twice.
      if (!declared || declared.size !== 1) continue;
      compared++;
      const got = [...declared][0];
      if (got !== canonical(want)) {
        bad.push(`${tile} ${key}: label "${label}" says ${m[1]}, dims says ${got}`);
      }
    }
  }
  return { compared, bad };
}

test("a field label's unit agrees with the key's declared dimension", () => {
  const { compared, bad } = labelDisagreements(BESPOKE_LABELS, declaredDimensions());
  assert.ok(compared > 1200, "only " + compared + " labelled inputs were comparable; a fixture did not load");
  assert.deepEqual(bad, []);
});

test("the check is seeded red", () => {
  const dims = new Map([["seed_key", new Set(["1"])], ["ok_key", new Set(["T^1"])]]);
  // The failure it exists for: a label saying years over a key saying nothing.
  assert.equal(labelDisagreements({ t: { seed_key: "Useful life (yr)" } }, dims).bad.length, 1);
  assert.equal(labelDisagreements({ t: { ok_key: "Useful life (yr)" } }, dims).bad.length, 0);
  // A label with no parenthetical unit, and a unit not on the list, are skipped.
  assert.equal(labelDisagreements({ t: { seed_key: "Useful life" } }, dims).bad.length, 0);
  assert.equal(labelDisagreements({ t: { seed_key: "Weight (lb)" } }, dims).bad.length, 0);
  // A key declared two ways belongs to the key-agreement rule, not this one.
  assert.equal(labelDisagreements({ t: { split: "Life (yr)" } },
    new Map([["split", new Set(["1", "T^1"])]])).bad.length, 0);
});
