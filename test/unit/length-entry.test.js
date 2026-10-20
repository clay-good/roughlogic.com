// spec-v1970: feet, inches and fractions in length fields.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseLength, lengthUnitOf, lengthHint } from "../../length-entry.js";
import { rewriteQuery } from "../../query-fill.js";

const FT = [
  ["8'6\"", 8.5], ["8' 6\"", 8.5], ["8'-6\"", 8.5], ["8'6", 8.5], ["8 ft 6 in", 8.5], ["8 feet 6 inches", 8.5], ["8ft 6in", 8.5],
  ["8-6", 8.5], ["8'", 8], ["8 ft", 8], ["8 feet", 8], ["12'0\"", 12], ["10' 6-1/2\"", 10 + 6.5 / 12], ["10'6 1/2\"", 10 + 6.5 / 12],
  ["8\u2019 6\u201d", 8.5], ["8\u20326\u2033", 8.5], ["8' 6 in", 8.5], ["1-1/2'", 1.5], ["2 1/2 ft", 2.5], ["8 FT 6 IN", 8.5],
  ["6 in", 0.5], ["6\"", 0.5], ["18 in", 1.5], ["12.5", 12.5], ["0.75", 0.75], [".5", 0.5], ["-3", -3], ["3-1/2", 3.5], ["1/2", 0.5],
  ["-2' 6\"", -2.5], ["-6\"", -0.5], ["- 1'", -1], ["8' 6\u00bd\"", 8 + 6.5 / 12],
];
const IN = [
  ["3-1/2", 3.5], ["3 1/2", 3.5], ["3-1/2\"", 3.5], ["3 1/2 in", 3.5], ["5/8", 0.625], ["5/8\"", 0.625], ["3/4 in", 0.75],
  ["12\"", 12], ["12 in", 12], ["12 inches", 12], ["8'6\"", 102], ["2 ft", 24], ["1'", 12], ["0.125", 0.125], ["16", 16], ["1e2", 100], ["1-15/16", 1.9375],
  ["\u00bd", 0.5], ["5\u00bd\"", 5.5], ["3\u00be", 3.75], ["1\u215d in", 1.625], ["-3-1/2", -3.5],
];
const REFUSED = [["8'15\"", "ft"], ["16 ft 16 in", "ft"], ["1/0", "in"], ["3-1/0", "in"], ["--3", "in"], ["abc", "ft"], ["8-6", "in"], ["8'6'6", "ft"], ["5//8", "in"], ["3 - - 1/2", "in"], ["ft", "ft"], ["12 m", "in"], ["0' 13\"", "ft"], ["0 ft 12 in", "in"], ["1e400", "ft"], ["-", "in"], ["+-3", "in"]];

test("length entry: every tape spelling in a feet box reads the decimal feet", () => {
  for (const [t, v] of FT) assert.ok(Math.abs(parseLength(t, "ft").value - v) < 1e-12, t);
});
test("length entry: every tape spelling in an inches box reads the decimal inches", () => {
  for (const [t, v] of IN) assert.ok(Math.abs(parseLength(t, "in").value - v) < 1e-12, t);
});
test("length entry: text that is not a length is refused with a reason, never read as a number", () => {
  for (const [t, u] of REFUSED) assert.ok(parseLength(t, u).error, t);
  assert.deepEqual(parseLength("", "ft"), { value: null });
  assert.deepEqual(parseLength("   ", "in"), { value: null });
});
test("length entry: the box and the search box read the same feet-and-inches spellings", () => {
  for (const [t, v] of [["8'6\"", 8.5], ["8 ft 6 in", 8.5], ["10'6 1/2\"", 10 + 6.5 / 12]]) {
    assert.ok(rewriteQuery(t).includes(String(v)) || Math.abs(Number(rewriteQuery(t).split(" ")[0]) - v) < 1e-9, t + " -> " + rewriteQuery(t));
    assert.ok(Math.abs(parseLength(t, "ft").value - v) < 1e-12);
  }
});
test("length entry: only a closing (ft) or (in) label makes a length box", () => {
  assert.equal(lengthUnitOf("Length one-way (ft)"), "ft");
  assert.equal(lengthUnitOf("Stud spacing (in)"), "in");
  assert.equal(lengthUnitOf("Run (feet)"), "ft");
  for (const l of ["Static pressure (in wc)", "Vacuum (in Hg)", "Rise (in) per foot", "Pressure (psi)", "Area (sq ft)", "Count"]) assert.equal(lengthUnitOf(l), null, l);
  assert.equal(lengthHint(8.5, "ft"), "= 8.5 ft");
  assert.equal(lengthHint(1 / 3, "in"), "= 0.3333 in");
});
test("length entry: a length box hands every reader the decimal, and junk reads empty like a number field", async () => {
  const { installDocument } = await import("../fixtures/fake-dom.js");
  installDocument();
  const { makeNumber } = await import("../../ui-fields.js");
  const f = makeNumber("Run (ft)", "le-run", { step: "any", min: "0" });
  assert.equal(f.input.dataset.lengthUnit, "ft");
  f.input.value = "8'6\"";
  assert.equal(f.input.value, "8.5");
  f.input.value = "8'15\"";
  assert.equal(f.input.value, "");
  f.input.value = "12";
  assert.equal(f.input.value, "12");
  f.input.value = "8'7\"";
  assert.equal(f.input.value, "8.5833333333", "float noise is rounded off");
  assert.equal(f.input.getAttribute("aria-describedby"), "le-run-hint");
  const g = makeNumber("Static pressure (in wc)", "le-sp");
  assert.equal(g.input.type, "number", "not every (in) is inches");
});
test("length entry: retyping every worked example's lengths as tape readings changes no answer", () => {
  const sweep = fileURLToPath(new URL("../fixtures/render-length-sweep.js", import.meta.url));
  const report = JSON.parse(execFileSync(process.execPath, [sweep], { encoding: "utf8", maxBuffer: 1 << 24, stdio: ["ignore", "pipe", "ignore"] }));
  assert.ok(report.boxes > 200, `only ${report.boxes} length boxes were retyped`);
  assert.deepEqual(report.mismatches, []);
});
