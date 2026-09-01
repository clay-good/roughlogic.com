// The agent door extracting a wrong number from a question a person typed.
//
// scripts/measure-query-fill.mjs reports "WRONG values 0", and that is true of
// the corpus it measures: every number labelled, in field order, taken from
// each tile's own worked example. Give the door a question with a spare number
// in it and five of five hand-written trade questions bind a value the query
// text rules out -- "wire size for a 50 amp circuit 90 feet away" puts 90 into
// the conductor's insulation temperature rating, where 90 C is a real value
// and an agent has nothing to notice.
//
// Every one has the same shape: a number carrying a unit is converted into a
// field of the same DIMENSION but a different MEANING. Feet and inches share a
// dimension; a wall and a stud do not share a meaning.
//
// This pins the count as a CEILING. The extractor is a tuned module with a
// documented history of guards that cost more recoveries than they saved, so
// this measures the gap rather than closing it, and any attempt at closing it
// is judged here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { measureFreeTextFill } from "../../scripts/measure-free-text-fill.mjs";

// Known-wrong bindings as of 2026-09-01, when this measurement was written.
// Lower it when a fix lands; raising it means the extractor got worse.
const CEILING = 5;

test("free-text extraction does not get worse", async () => {
  const { rows, violations } = await measureFreeTextFill();
  assert.ok(rows.length >= 5, `the fixture shrank to ${rows.length} rows`);
  assert.ok(
    violations.length <= CEILING,
    `${violations.length} wrong binding(s), ceiling ${CEILING}:\n` +
      violations.map((v) => `  ${v.field}=${v.value} from ${JSON.stringify(v.query)}`).join("\n"),
  );
});

test("the ceiling is not stale in the other direction", async () => {
  // A ceiling nobody lowers is a ceiling nobody looks at. If a fix drops the
  // count, this fails and the constant has to come down with it, so the number
  // in this file always says what the door actually does.
  const { violations } = await measureFreeTextFill();
  assert.equal(
    violations.length, CEILING,
    `free-text wrong bindings are now ${violations.length}, not ${CEILING}. ` +
      `Lower CEILING in this file to match, and say so in the CHANGELOG.`,
  );
});

test("every fixture row says why the binding is wrong", async () => {
  // The assertion is a claim about trade math, so it carries its reasoning.
  const text = await readFile(new URL("../fixtures/free-text-queries.json", import.meta.url), "utf8");
  for (const row of JSON.parse(text).rows) {
    assert.ok(row.query && row.query.length > 10, `row has no question: ${JSON.stringify(row)}`);
    assert.ok(Object.keys(row.mustNotBind || {}).length > 0, `${row.query}: nothing asserted`);
    assert.ok(row.why && row.why.length > 40, `${row.query}: no reasoning given`);
  }
});
