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

// WHERE THIS RULE STOPS, because the distinction is easy to get backwards and
// the wrong "fix" would be a regression.
//
// This file is about factors that are exact BY DEFINITION -- the pound, the
// gallon, the inch. Writing those to fewer digits is a rounding error with no
// upside. It is NOT about a coefficient a cited standard prints, even when that
// coefficient is a rounded irrational. Scanning the catalog for literals near an
// exact mathematical or physical constant returns 39 of those, and every one is
// correct as written:
//
//   0.7854   SAE J429 / ASME B1.1 print the tensile stress area as
//            At = 0.7854 (d - 0.9743/n)^2. Substituting PI/4 would make the code
//            disagree with the standard it cites, on a bolt-strength number.
//   1.732    the three-phase factor as the NEC voltage-drop formulas are written
//            and as an electrician computes it.
//   1.414    ASME B30.9 sling geometry and the ASHRAE vibration relations.
//   32.174   the conventional US value of g in ft/s^2, as textbooks state it.
//   3.1416   a worked-example INPUT -- the area of a 2 in round bar, rounded the
//            way a person types it, not a constant at all.
//
// No compute in the catalog uses a truncated PI; every one calls Math.PI.
// Checked 2026-09-04. If a future pass reaches for these, the question to ask
// first is whether the number is exact by definition or quoted from a source.

// name -> [exact value, how it is defined]
const EXACT = {
  G_PER_OZ: [453.59237 / 16, "1 lb = 453.59237 g exactly, 16 oz to the pound"],
  ML_PER_OZ: [(3.785411784 / 128) * 1000, "1 US gal = 3.785411784 L exactly, 128 fl oz to the gallon"],
  // The same factor under a second name. calc-agriculture spelled it
  // ML_PER_FL_OZ and held the truncated 29.5735, which the same-name scan below
  // cannot see: two constants only conflict if they are called the same thing.
  // A synonym is exactly how a fixed inconsistency comes back.
  ML_PER_FL_OZ: [(3.785411784 / 128) * 1000, "the same US fluid ounce, spelled differently"],
  // Added 2026-09-18 when the reference suite for calc-greenhouse found its
  // square-foot factor cut at 10.7639104. The scan below then found nine more
  // exact factors written short -- up to 8 parts per million -- that the
  // conflict test could not see: a factor defined as an expression (1728 / 231)
  // or on a line declaring several constants never matched its pattern.
  GAL_PER_FT3: [1728 / 231, "231 cu in to the US gallon, 1,728 to the cubic foot"],
  GAL_PER_CU_FT: [1728 / 231, "the same factor, spelled differently"],
  GAL_PER_ACRE_FT: [43560 * 1728 / 231, "43,560 sq ft to the acre, 231 cu in to the gallon"],
  FT_PER_M: [1 / 0.3048, "1 ft = 0.3048 m exactly"],
  SQ_FT_PER_SQ_M: [1 / (0.3048 * 0.3048), "the square of the international foot"],
  LUX_PER_FC: [1 / (0.3048 * 0.3048), "a footcandle is one lumen per square foot"],
  CU_FT_PER_CU_M: [1 / (0.3048 * 0.3048 * 0.3048), "the cube of the international foot"],
  L_PER_FT3: [0.3048 * 0.3048 * 0.3048 * 1000, "the cube of the international foot, in litres"],
  M2_PER_ACRE: [43560 * 0.3048 * 0.3048, "43,560 international sq ft to the acre"],
  PA_PER_PSF: [4.4482216152605 / (0.3048 * 0.3048), "1 lbf = 4.4482216152605 N exactly, over a square foot"],
  LB_PER_MEGAGRAM: [1e6 / 453.59237, "1 lb = 453.59237 g exactly"],
  // Module-private factors, underscore-prefixed, which the pattern below could
  // not see until 2026-09-18 -- when calc-oilgas held both an exact barrel and
  // a 5.615 one a hundred lines apart.
  _OG_CUFT_PER_BBL: [42 * 231 / 1728, "a barrel is 42 US gallons of 231 cu in"],
  _CUFT_PER_BBL: [42 * 231 / 1728, "the same barrel"],
  _GAL_PER_CUFT: [1728 / 231, "231 cu in to the gallon, 1,728 to the cubic foot"],
  _AQ_GAL_PER_CUFT: [1728 / 231, "the same factor"],
  _REF_GAL_PER_CUFT: [1728 / 231, "the same factor"],
  _CRYO_GAL_PER_FT3: [1728 / 231, "the same factor"],
  _POOL_GAL_PER_CU_FT: [1728 / 231, "the same factor"],
  _WW_GAL_PER_CU_FT: [1728 / 231, "the same factor"],
  _GPM_PER_CFS: [60 * 1728 / 231, "60 s a minute of 1,728 / 231 gal"],
  _FPS_PER_MPH: [22 / 15, "5,280 ft per mile over 3,600 s per hour"],
  _POOL_KW_PER_HP: [550 * 0.3048 * 4.4482216152605 / 1000, "550 ft-lbf/s, exactly 745.699872 W"],
  _M2_PER_FT2: [0.3048 * 0.3048, "the square of the international foot"],
  _M3_PER_FT3: [0.3048 * 0.3048 * 0.3048, "the cube of the international foot"],
};

// Every `NAME = value` in a `const` statement, including the second and later
// names on a line that declares several, with the value either a numeric
// literal or arithmetic on literals (1728 / 231). Anything else -- a call, a
// reference to another name -- is not a constant this file can judge.
const ARITHMETIC = /^[\d.eE\s+\-*/()]+$/;
// `plain` marks the one form the conflict scan below always read: a single
// name bound to a bare literal.
function* numericConstants(src) {
  for (const stmt of src.matchAll(/^\s*const\s+([^;]+);/gm)) {
    const parts = stmt[1].split(/,(?![^(]*\))/);
    for (const part of parts) {
      const m = /^\s*(_?[A-Z][A-Z0-9_]*)\s*=\s*(.+?)\s*$/.exec(part);
      if (!m || !ARITHMETIC.test(m[2]) || !/\d/.test(m[2])) continue;
      const value = Function(`"use strict"; return (${m[2]});`)();
      const plain = parts.length === 1 && /^-?\d+(?:\.\d+)?(?:e-?\d+)?$/.test(m[2]);
      if (typeof value === "number" && Number.isFinite(value)) yield [m[1], value, m[2], plain];
    }
  }
}

test("every module defines its unit-conversion constants exactly", () => {
  const wrong = [];
  let found = 0;
  for (const file of readdirSync(ROOT).filter((f) => /^calc-.*\.js$/.test(f))) {
    const src = readFileSync(resolve(ROOT, file), "utf8");
    for (const [name, value, written] of numericConstants(src)) {
      if (!Object.hasOwn(EXACT, name)) continue;
      const [exact, how] = EXACT[name];
      found++;
      // Written as a definition, a factor can differ from the table's own
      // arithmetic in the last binary place; a truncation differs by far more.
      if (Math.abs(value - exact) > Math.abs(exact) * 1e-15) {
        wrong.push(`${file}: ${name} = ${written}, but it is ${exact} (${how})`);
      }
    }
  }
  // A rename would leave this asserting nothing, which is the failure mode this
  // whole suite keeps finding elsewhere.
  assert.ok(found >= 20, `expected to find the unit constants, found ${found} definition(s)`);
  assert.deepEqual(wrong, []);
});

test("no two modules define the same named numeric constant differently", () => {
  // The general form of the bug above: the scan that found it, kept.
  const seen = new Map();
  for (const file of readdirSync(ROOT).filter((f) => /^calc-.*\.js$/.test(f))) {
    const src = readFileSync(resolve(ROOT, file), "utf8");
    for (const [name, number, , plain] of numericConstants(src)) {
      if (name.length < 4) continue;
      // Underscore-prefixed names are module-private by convention and may
      // legitimately differ (calc-hvac's _KW_PER_HP is the DOE compressed-air
      // 0.746 it cites); only the table above judges them.
      if (name.startsWith("_")) continue;
      // Function-local limits declared several to a line (MIN_W, H_MAX) name
      // different quantities in different places; a unit factor never does.
      if (!plain && !name.includes("_PER_")) continue;
      const value = String(number);
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

// The same factor written inline. On 2026-09-18 seventeen code lines across ten
// modules multiplied by 7.48052, 7.4805 or 7.48 -- up to 70 ppm off 1728 / 231
// -- where the table above could not see them. They now read (1728 / 231).
// An inline literal is allowed only where the tile's own cited formula prints
// it, and each such line is named here with its reason.
const INLINE_GALLON_ALLOWED = new Map([
  ["calc-treatment.js", "the WEF operator formula for digester detention time, DT = volume x 7.48 / feed, as the cited courses print it"],
]);

test("no code line converts cubic feet to gallons with a truncated inline 7.48", () => {
  const found = [];
  for (const file of readdirSync(ROOT).filter((f) => /^calc-.*\.js$/.test(f))) {
    const lines = readFileSync(resolve(ROOT, file), "utf8").split("\n");
    lines.forEach((line, i) => {
      if (/^\s*\/\//.test(line)) return;
      // Strings carry citation prose, which may print the rounded figure.
      const code = line.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""').replace(/\/\/.*$/, "");
      // Only as a multiplier or divisor: HEPES's pKa of 7.48 is not a gallon.
      if (/[*/]\s*7\.48\d*\b|\b7\.48\d*\s*[*/]/.test(code) && !INLINE_GALLON_ALLOWED.has(file)) found.push(`${file}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(found, []);
});

// The same scan for the other two conversions seen inline: gpm per cfs
// (exactly 60 x 1,728 / 231 = 448.8312) and kW per horsepower (exactly
// 0.74569987). 0.746 is allowed where a tile's own formula and citation print
// it as the motor convention -- calc-electrical's premium-motor saving and
// calc-motor's energy tiles -- and nowhere else.
const INLINE_POWER_FLOW_ALLOWED = new Map([
  ["calc-electrical.js", "the premium-motor relation, input kW = HP x 0.746 x load / efficiency, as its citation prints it"],
  ["calc-motor.js", "the motor energy tiles, whose formula and citation state 0.746 kW/HP"],
]);

test("no code line converts cfs or horsepower with a truncated inline factor", () => {
  const found = [];
  for (const file of readdirSync(ROOT).filter((f) => /^calc-.*\.js$/.test(f))) {
    const lines = readFileSync(resolve(ROOT, file), "utf8").split("\n");
    lines.forEach((line, i) => {
      if (/^\s*\/\//.test(line)) return;
      const code = line.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""').replace(/\/\/.*$/, "");
      if (/[*/]\s*448\.83\d*\b|\b448\.83\d*\s*[*/]/.test(code)) found.push(`${file}:${i + 1}: ${line.trim()}`);
      if (/[*/]\s*0\.745\d*\b|\b0\.745\d*\s*[*/]/.test(code) && !/0\.745699872/.test(code)) found.push(`${file}:${i + 1}: ${line.trim()}`);
      if (/[*/]\s*0\.746\b|\b0\.746\s*[*/]/.test(code) && !INLINE_POWER_FLOW_ALLOWED.has(file)) found.push(`${file}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(found, []);
});
