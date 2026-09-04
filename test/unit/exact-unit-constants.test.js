// A conversion factor that is exact by definition must be written exactly.
//
// Three module-level constants disagreed with the repo's own audit trail, which
// records 28.349523125 g/oz and 29.5735295625 mL/oz as the exact values
// (docs/audit-trail.md). calc-agriculture defined G_PER_OZ as 28.3495 while
// calc-kitchen defined the same name as 28.349523125; calc-kitchen and
// calc-mechanic defined ML_PER_OZ as 29.5735 while calc-agriculture used the
// exact figure. So two tiles converting the same quantity gave different
// answers, and for a site whose whole proposition is a number you can check
// against a published definition, "close enough" is the wrong default.
//
// The errors were small -- around 1 part in a million -- and two of them still
// surfaced at the six significant digits the pages display: pour-cost's
// suggested price moved 8.34764 -> 8.34765 and paint-mix-ratio's total moved
// 709.764 -> 709.765. Both are now right.
//
// Each expected value is written as its DEFINITION, not as a decimal, so this
// file cannot re-encode a truncation the way the tank-mix test did: it asserted
// against a literal 28.3495 and so pinned the truncated constant in place.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// name -> [exact value, how it is defined]
const EXACT = {
  G_PER_OZ: [453.59237 / 16, "1 lb = 453.59237 g exactly, 16 oz to the pound"],
  ML_PER_OZ: [(3.785411784 / 128) * 1000, "1 US gal = 3.785411784 L exactly, 128 fl oz to the gallon"],
  // The same factor under a second name. calc-agriculture spelled it
  // ML_PER_FL_OZ and held the truncated 29.5735, which the same-name scan below
  // cannot see: two constants only conflict if they are called the same thing.
  // A synonym is exactly how a fixed inconsistency comes back.
  ML_PER_FL_OZ: [(3.785411784 / 128) * 1000, "the same US fluid ounce, spelled differently"],
};

test("every module defines its unit-conversion constants exactly", () => {
  const wrong = [];
  let found = 0;
  for (const file of readdirSync(ROOT).filter((f) => /^calc-.*\.js$/.test(f))) {
    const src = readFileSync(resolve(ROOT, file), "utf8");
    for (const [name, [exact, how]] of Object.entries(EXACT)) {
      const re = new RegExp("\\bconst\\s+" + name + "\\s*=\\s*(-?[\\d.]+)\\s*;", "g");
      for (const m of src.matchAll(re)) {
        found++;
        if (Number(m[1]) !== exact) {
          wrong.push(`${file}: ${name} = ${m[1]}, but it is ${exact} (${how})`);
        }
      }
    }
  }
  // A rename would leave this asserting nothing, which is the failure mode this
  // whole suite keeps finding elsewhere.
  assert.ok(found >= 5, `expected to find the unit constants, found ${found} definition(s)`);
  assert.deepEqual(wrong, []);
});

test("no two modules define the same named numeric constant differently", () => {
  // The general form of the bug above: the scan that found it, kept.
  const seen = new Map();
  for (const file of readdirSync(ROOT).filter((f) => /^calc-.*\.js$/.test(f))) {
    const src = readFileSync(resolve(ROOT, file), "utf8");
    for (const m of src.matchAll(/^\s*const\s+([A-Z][A-Z0-9_]{3,})\s*=\s*(-?\d+(?:\.\d+)?(?:e-?\d+)?)\s*;/gm)) {
      const [, name, value] = m;
      if (!seen.has(name)) seen.set(name, new Map());
      const byValue = seen.get(name);
      if (!byValue.has(value)) byValue.set(value, []);
      byValue.get(value).push(file);
    }
  }
  assert.ok(seen.size > 20, `expected a real corpus of named constants, found ${seen.size}`);
  const conflicts = [...seen.entries()]
    .filter(([, byValue]) => byValue.size > 1)
    .map(([name, byValue]) =>
      `${name}: ` + [...byValue.entries()].map(([v, fs]) => `${v} in ${fs.join("/")}`).join("  vs  "));
  assert.deepEqual(conflicts, []);
});
