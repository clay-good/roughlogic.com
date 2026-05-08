// Unit tests for v5-platform.js (utilities 269 / 271).
//
// 270 (print-table CSS) is verified by lint of styles.css and visual
// review; no JS to unit-test.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCsv, inputHash, GLOSSARY,
} from "../../v5-platform.js";

// 269 CSV builder
test("CSV: simple header + row", () => {
  const s = buildCsv({ header: ["A", "B"], rows: [["1", "2"], ["3", "4"]] });
  assert.equal(s, "A,B\r\n1,2\r\n3,4");
});
test("CSV: quotes cells with commas", () => {
  const s = buildCsv({ header: ["a"], rows: [["x,y"]] });
  assert.equal(s, "a\r\n\"x,y\"");
});
test("CSV: escapes embedded double-quotes by doubling", () => {
  const s = buildCsv({ header: ["a"], rows: [["he said \"hi\""]] });
  assert.equal(s, "a\r\n\"he said \"\"hi\"\"\"");
});
test("CSV: handles newlines in cells", () => {
  const s = buildCsv({ header: ["a"], rows: [["line1\nline2"]] });
  assert.match(s, /"line1\nline2"/);
});
test("CSV: empty rows -> just header", () => {
  const s = buildCsv({ header: ["a", "b"], rows: [] });
  assert.equal(s, "a,b");
});
test("CSV: numbers stringified", () => {
  const s = buildCsv({ header: ["n"], rows: [[42], [3.14]] });
  assert.equal(s, "n\r\n42\r\n3.14");
});
test("CSV: null / undefined cells become empty", () => {
  const s = buildCsv({ header: ["a", "b"], rows: [[null, undefined]] });
  assert.equal(s, "a,b\r\n,");
});

// inputHash determinism
test("hash: same input gives same output", () => {
  assert.equal(inputHash("abc"), inputHash("abc"));
});
test("hash: different input gives different output", () => {
  assert.notEqual(inputHash("abc"), inputHash("abd"));
});
test("hash: returns 8 lowercase hex chars", () => {
  assert.match(inputHash("anything"), /^[0-9a-f]{8}$/);
});
test("hash: empty string is stable", () => {
  assert.equal(inputHash(""), inputHash(""));
  assert.match(inputHash(""), /^[0-9a-f]{8}$/);
});

// 271 Glossary
test("Glossary: includes the spec-required v5 keys", () => {
  for (const k of ["MACRS", "FICA", "statute_of_limitations", "molarity", "RCF"]) {
    assert.ok(GLOSSARY[k], "missing glossary key " + k);
  }
});
test("Glossary: every entry is a non-empty string", () => {
  for (const v of Object.values(GLOSSARY)) assert.ok(typeof v === "string" && v.length > 10);
});
test("Glossary: at least 15 terms bundled", () => {
  assert.ok(Object.keys(GLOSSARY).length >= 15);
});

// --- Additional v5-platform edge-case coverage ---

// 269 CSV builder
test("CSV: tab character is not escaped (only quote/comma/CR/LF trigger quoting)", () => {
  const s = buildCsv({ header: ["a"], rows: [["x\ty"]] });
  assert.equal(s, "a\r\nx\ty");
});
test("CSV: cell starting with quote is quoted+escaped", () => {
  const s = buildCsv({ header: ["a"], rows: [["\"start"]] });
  assert.equal(s, "a\r\n\"\"\"start\"");
});
test("CSV: header-only with no rows", () => {
  const s = buildCsv({ header: ["a", "b", "c"], rows: [] });
  assert.equal(s, "a,b,c");
});
test("CSV: single column with quotes only", () => {
  const s = buildCsv({ header: ["x"], rows: [["\"\""]] });
  assert.equal(s, "x\r\n\"\"\"\"\"\"");
});
test("CSV: handles boolean and 0 cells", () => {
  const s = buildCsv({ header: ["a"], rows: [[0], [false], [true]] });
  assert.equal(s, "a\r\n0\r\nfalse\r\ntrue");
});

// inputHash
test("hash: long input still yields 8 hex chars", () => {
  const long = "a".repeat(10000);
  assert.match(inputHash(long), /^[0-9a-f]{8}$/);
});
test("hash: numeric input is stringified consistently", () => {
  assert.equal(inputHash(123), inputHash(123));
});
test("hash: collision avoidance for similar strings", () => {
  // Not a guarantee, but FNV separates these:
  assert.notEqual(inputHash("abc"), inputHash("acb"));
  assert.notEqual(inputHash("abc1"), inputHash("abc2"));
});

// 271 Glossary: spec-required v5 minimum
test("Glossary: spec-required minimum (MACRS, FICA, SOTL, molarity, RCF)", () => {
  for (const k of ["MACRS", "FICA", "statute_of_limitations", "molarity", "RCF"]) {
    assert.ok(GLOSSARY[k], "missing spec-required " + k);
  }
});
test("Glossary: every entry is plain English (>15 chars, no HTML)", () => {
  for (const [k, v] of Object.entries(GLOSSARY)) {
    assert.ok(v.length > 15, k + " too short");
    assert.ok(!v.includes("<"), k + " contains HTML");
    assert.ok(!v.includes("\n\n"), k + " contains paragraph break (should be one paragraph)");
  }
});
test("Glossary: at least 20 terms bundled (v5 starter)", () => {
  assert.ok(Object.keys(GLOSSARY).length >= 20);
});
