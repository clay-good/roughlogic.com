#!/usr/bin/env node
// What the agent door extracts from a question a person actually typed.
//
// scripts/measure-query-fill.mjs builds its corpus from each tile's worked
// example: every number labelled, in field order, no distractors. It reports
// "WRONG values 0", and that is true of the corpus it measures. Ask the door a
// question with a spare number in it and the picture changes -- "wire size for
// a 50 amp circuit 90 feet away" puts 90 into the conductor's insulation
// temperature rating, where 90 C is a real value and nothing looks wrong.
//
// This measures the case that one cannot: a question carrying more numbers
// than fields, or the same number in more than one plausible role. Each row in
// test/fixtures/free-text-queries.json says what a number must NOT become,
// because the query text settles that much on its own. Which tile ought to
// answer is a separate question and this fixture takes no position on it.
//
// Run: node scripts/measure-free-text-fill.mjs [--verbose]
// Pinned as a ceiling by test/unit/free-text-fill.test.js, so the count can
// fall but not rise.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function measureFreeTextFill() {
  const { rows } = JSON.parse(
    await readFile(resolve(ROOT, "test", "fixtures", "free-text-queries.json"), "utf8"),
  );
  const { answerQuery } = await import(pathToFileURL(resolve(ROOT, "mcp", "catalog.mjs")).href);
  const violations = [];
  for (const row of rows) {
    const r = await answerQuery({ query: row.query });
    const filled = (r && r.inputs) || {};
    for (const [field, bad] of Object.entries(row.mustNotBind || {})) {
      if (!(field in filled)) continue;
      if (String(filled[field]) !== String(bad)) continue;
      violations.push({ query: row.query, tile: r.id || null, field, value: filled[field], why: row.why });
    }
  }
  return { rows, violations };
}

async function main() {
  const { rows, violations } = await measureFreeTextFill();
  const verbose = process.argv.includes("--verbose");
  for (const v of violations) {
    console.log(`WRONG  ${v.field} = ${v.value}   (${v.tile})`);
    console.log(`       ${JSON.stringify(v.query)}`);
    if (verbose) console.log(`       ${v.why}`);
  }
  console.log(
    `measure-free-text-fill: ${rows.length} free-text question(s); ` +
    `${violations.length} wrong binding(s) the query text rules out.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) await main();
