// Every worked example, re-phrased as a typed question, fills no wrong value.
//
// scripts/measure-query-fill.mjs phrases each tile's worked example the way a
// person types it and counts the fields that come back holding a value the
// example did not have. A wrong value is a confident wrong answer on a job, so
// that count is the number that matters. It reached 0 in every phrasing on
// 2026-11-16 (it was 0 / 1 / 7 for plain / named / values-only a day earlier),
// and this pins it there. Recovery is NOT pinned: it moves honestly with the
// catalog. Run the script with --wrong to see what a failure filled.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "scripts", "measure-query-fill.mjs");
const MODES = [[], ["--named"], ["--terse"], ["--grouped", "--terse"], ["--grouped", "--named"]];

test("query-fill: no worked example re-typed as a question fills a wrong value", async () => {
  const results = await Promise.all(MODES.map(async (flags) => {
    const { stdout } = await run(process.execPath, [SCRIPT, ...flags, "--wrong"], { maxBuffer: 1 << 24 });
    const m = stdout.match(/WRONG values (\d+)/);
    assert.ok(m, `no WRONG count in output for ${flags.join(" ") || "(plain)"}`);
    return { flags: flags.join(" ") || "(plain)", wrong: Number(m[1]), lines: stdout.split("\n").filter((l) => l.startsWith("WRONG ")) };
  }));
  for (const r of results) assert.equal(r.wrong, 0, `${r.flags}: ${r.wrong} wrong value(s)\n${r.lines.join("\n")}`);
});
