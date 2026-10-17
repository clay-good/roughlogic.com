// A verdict may not report a pass for a check it never ran. On 2026-10-16
// three fields did: pipeline-mao-barlow's wall_adequate and within_maop, and
// fume-hood face velocity's velocity_compliant, each returned `true` when the
// pressure or reading it checks had not been entered. The printed verdicts
// read the has_* flag first, so a person saw "(no ... entered)"; an API or
// agent caller saw `true` -- a pass on nothing. An unrun check is null.
//
// The pattern is narrow on purpose: the guard must be an INPUT-PRESENCE flag
// (has_*, *_entered, *_given, *_provided). A REQUIREMENT-APPLIES flag
// (needs_pan, in_zone, needs_ramp, emergency) legitimately passes when the
// requirement does not apply, and is not matched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const VERDICT = "(?:ok|pass|passes|adequate|within|meets|compliant|safe|acceptable|sufficient|fits)";
const PRESENCE = "(?:has_\\w+|\\w+_entered|\\w+_given|\\w+_provided)";
const UNRUN_PASS = new RegExp(`const\\s+(\\w*${VERDICT}\\w*)\\s*=\\s*(${PRESENCE})\\s*\\?[^;]*:\\s*true\\s*;`, "g");

test("a verdict guarded by an input-presence flag is null when the input is absent, not true", () => {
  const offenders = [];
  for (const f of readdirSync(ROOT).filter((n) => /^calc-.*\.js$/.test(n))) {
    const src = readFileSync(resolve(ROOT, f), "utf8");
    for (const m of src.matchAll(UNRUN_PASS)) offenders.push(`${f}: ${m[1]} = ${m[2]} ? ... : true`);
  }
  assert.deepEqual(offenders, [], "an unrun check reports a pass -- return null when the input is absent");
});
