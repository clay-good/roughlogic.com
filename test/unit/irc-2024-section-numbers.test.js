// The 2024 IRC renumbered Chapter 3: stairs and landings moved from R311 to
// R318, emergency escape openings from R310 to R319, handrails to a new R320,
// guards from R312 to R321, smoke alarms from R314 to R310 and carbon monoxide
// alarms from R315 to R311. On 2026-10-17 the twelve tiles that cite those
// sections were checked against the 2024 text (values unchanged) and re-cited
// to the 2024 numbers, with the 2021 number kept beside each one in the form
// "R318.7.5 [R311.7.5 in IRC 2021]" for readers on a 2021 jurisdiction.
//
// A 2021 number written bare now points at the wrong section of the current
// code (2024 R312 is minimum room areas, R314 mezzanines, R315 sleeping lofts),
// so this fails on any of them outside that bracketed form or an explicit "IRC 2021 R314.3.1". R311 and R311.3
// are left out: both are also valid 2024 numbers (carbon monoxide alarms).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
// A number written straight after "IRC 2021" names its own edition and is fine.
const STALE = /(?<![\w.[])(?<!IRC 2021 )(R310\.[24](?:\.\d+)*|R311\.7(?:\.\d+)*|R312(?:\.\d+)*|R314(?:\.\d+)*|R315(?:\.\d+)*)(?![\w]|\.\d)(?! in IRC 2021\])/g;

test("IRC Chapter 3 is cited by its 2024 section numbers, with the 2021 number only in brackets", () => {
  const files = ["citations.js", "tools-data.js", ...readdirSync(ROOT).filter((f) => /^calc-.*\.js$/.test(f))];
  const bad = [];
  for (const f of files) {
    readFileSync(resolve(ROOT, f), "utf8").split("\n").forEach((line, i) => {
      if (/^\s*\/\//.test(line)) return; // a code comment is for the maintainer, not the reader
      if (/^const IRC_CH3_2024 = /.test(line)) return; // the note that spells out the renumbering itself
      const code = line.split(" // ")[0];
      for (const lit of code.match(/"(?:[^"\\\n]|\\.)*"/g) || []) {
        // Only the IRC: IBC / IPC / NEC section numbers never start with R.
        for (const m of lit.matchAll(STALE)) bad.push(`${f}:${i + 1}: ${m[0]} in ${lit.slice(0, 90)}`);
      }
    });
  }
  assert.deepEqual(bad, []);
});
