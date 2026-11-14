// A whole count printed beside a fixed plural noun reads "1 bags", "1 rolls",
// "1 days" on every small job. On 2026-11-14 about 300 renderer lines of the
// shape `fmt(r.x, 0) + " bags` or `r.x + " bags` were changed to choose the
// noun by the printed count; this keeps new lines from coming back in the old
// shape. Units that are not nouns (cfs, fps) and words that are not plurals
// are listed below.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url);
const NOT_A_PLURAL_NOUN = new Set(["governs", "vs", "pass", "cfs", "fps", "pays", "times", "plus", "minus", "gas", "less",
  // calc-soilproperties.js: a soil type name followed by a verb ("Gravel needs ...").
  "needs"]);
const SHAPE = /(?:fmt\((?:r|x|res|out)\.[A-Za-z_0-9]+, ?0\)|(?:r|x)\.[a-z_0-9]+) \+ " ([a-z]+s)\b/g;

test("count nouns: a whole count is not printed beside a fixed plural noun", () => {
  const hits = [];
  for (const f of readdirSync(ROOT).filter((n) => /^calc-.*\.js$/.test(n)).sort()) {
    const src = readFileSync(new URL(f, ROOT), "utf8");
    for (const m of src.matchAll(SHAPE)) {
      const w = m[1];
      if (NOT_A_PLURAL_NOUN.has(w) || /(?:ss|us|is)$/.test(w)) continue;
      hits.push(`${f}: ${m[0]}`);
    }
  }
  assert.deepEqual(hits, [], 'write `fmt(r.n, 0) + " " + (fmt(r.n, 0) === "1" ? "bag" : "bags")`');
});
