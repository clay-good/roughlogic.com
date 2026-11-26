// The agent door never answers as a different calculator, and never answers a
// question with a number that disagrees with the example the question came from.
//
// scripts/measure-unread-answers.mjs phrases every tile's worked example as a
// named question, puts it through answerQuery, and compares the answer to
// run(id, example). On 2026-11-24 that found 36 answers returning a number that
// DISAGREED with the worked example the question was built from: four dryers
// answered as one, a 6.25% + 1.5% sales tax answered as $0, 7,920 tons answered
// as 198, five smoke alarms as two. Each was an answer computed around a value
// the question had supplied. The door refuses those now.
//
// AND NOTHING WAS HOLDING THAT. The harness was referenced by no test, no lint
// gate and no workflow -- it was run once, the finding was fixed, and the fix
// had no guard. A measurement nobody reads is a measurement that stops being
// true without telling anyone, so the two counts that must stay at zero are
// pinned here. Found by listing scripts/measure-*.mjs against the files that
// mention them: this was the only one with no reader at all.
//
// WHAT IS AND IS NOT PINNED. The two zero counts are, because each is a
// confidently wrong answer on a job: an answer from the WRONG tile, and an
// answer whose number contradicts its own source. The "left a supplied number
// unread" count is NOT pinned -- it is a recall figure that moves honestly with
// the catalog and the fill rules (106 on 2026-11-24, 1 today), and pinning it
// would make an improvement elsewhere look like a regression here. Pinning a
// recall number is how a gate starts costing more than it catches.
//
// Takes about two minutes, the same order as the query-fill gate beside it, and
// it runs in the push lane where the browser sweeps do not.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "scripts", "measure-unread-answers.mjs");

test("door: no worked example asked as a question is answered wrongly or by the wrong tile", async () => {
  // The sweep EXITS NON-ZERO when it finds a misroute, so a plain await throws
  // before any of this can read what it found. The exit code is its own signal;
  // the report is what this gate judges, so take stdout either way.
  let stdout;
  try { ({ stdout } = await run(process.execPath, [SCRIPT], { maxBuffer: 1 << 24 })); }
  catch (e) {
    stdout = e && typeof e.stdout === "string" ? e.stdout : "";
    assert.ok(stdout, `measure-unread-answers failed with no report:\n${(e && e.stderr) || e}`);
  }

  // Anchor on the harness's own summary labels. If a label moves, fail loudly
  // rather than silently matching nothing and passing -- a gate that stops
  // finding its subject is the thing this file exists to prevent.
  const grab = (label) => {
    const m = stdout.match(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":\\s*(\\d+)"));
    assert.ok(m, `measure-unread-answers no longer prints "${label}". Move this anchor with it.\n${stdout}`);
    return Number(m[1]);
  };
  // The indented detail lines the script prints under each count.
  const detail = stdout.split("\n").filter((l) => /^ {4}\S/.test(l)).join("\n");

  const total = stdout.match(/measure-unread-answers: (\d+) worked example/);
  assert.ok(total, `no example count in output:\n${stdout}`);
  assert.ok(Number(total[1]) > 2000, `the sweep only reached ${total[1]} examples; it should cover the catalog`);

  // One misroute is reviewed, and it is PRE-EXISTING rather than a regression:
  // the same question routes the same way at the commit before the schema work
  // that made it askable. `pitot-traverse-average` and `pitot-traverse-cfm` are
  // two readings of one instrument, and the question opens with the longer
  // tile's whole name -- "Pitot Traverse Airflow from Point Readings
  // (Velocity-Averaged)" -- which `nameThenOwnFields` matches as a whole-name
  // prefix and then hands to the sibling anyway. It only became visible when
  // the velocity-pressure field gained a caption, because a question the sweep
  // could not phrase is a question nobody asked.
  //
  // Listed rather than waived away: the count is held at exactly one, and the
  // entry must still reproduce, so a second misroute fails and so does fixing
  // this one without removing it from here.
  const REVIEWED_MISROUTES = ["pitot-traverse-average -> pitot-traverse-cfm"];
  const misrouteLines = stdout.split("\n").filter((l) => /^ {4}\S.* -> /.test(l)).map((l) => l.trim());
  const unreviewed = misrouteLines.filter((l) => !REVIEWED_MISROUTES.some((r) => l.startsWith(r)));
  assert.deepEqual(unreviewed, [],
    `the door answered a named question as another calculator:\n${detail}`);
  const stale = REVIEWED_MISROUTES.filter((r) => !misrouteLines.some((l) => l.startsWith(r)));
  assert.deepEqual(stale, [], "reviewed misroute no longer reproduces; remove it from REVIEWED_MISROUTES");
  assert.equal(grab("answered as a DIFFERENT calculator"), REVIEWED_MISROUTES.length,
    `misroute count moved:\n${detail}`);
  assert.equal(grab("of those, returning a number that DISAGREES with the worked example"), 0,
    `the door answered with a number that contradicts its own worked example:\n${detail}`);
});
