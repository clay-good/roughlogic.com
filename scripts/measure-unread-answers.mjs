#!/usr/bin/env node
// Harness: does the agent door ever ANSWER a question it did not fully read?
//
// `answer_query` reports `unread` -- the numbers it could not place -- beside an
// `OK` answer. That disclosure was honest and useless: the agent got a
// confident number with a footnote saying one of its own values had been
// ignored, and no way to tell whether the footnote mattered.
//
// This sweep phrases every tile's worked example as a question (the tile's own
// name, then each field's label lead, value and declared unit -- the same
// phrasing measure-query-fill.mjs uses in --named mode), asks the door, and
// where the answer came back `OK` compares it against running the SAME tile on
// the SAME example inputs directly. A difference is a wrong answer the door
// handed out: the question supplied the value, the fill declined to place it,
// and the calculator ran on its default instead.
//
// Measured 2026-11-23, before the door refused these: of 1,625 answers, 106
// left a supplied number unread and 36 returned a number that disagreed with
// the calculator's own worked example -- "Household Clothes Dryer Demand Load
// (NEC 220.54), number of dryers 4, each dryer nameplate 4500 w" answered
// 5,000 W for one dryer instead of 20,000 W for four; a compound sales tax of
// 6.25% and 1.5% came back as no tax at all; a blast of 7,920 tons came back
// as 198. The door now says what it could not read instead.
//
// Two filters keep this honest, and the door applies the same two:
//   - a digit inside the CALCULATOR'S OWN NAME ("NEC 250.122(F)", "4-20 mA",
//     "Lee 1982") is not a value the answer ignored;
//   - neither is the numeric value of a dropdown the fill placed correctly
//     ("Phase 3", "AWG 10", "Horsepower 5").
// Without them this reported 324 cases, three in five of them the harness
// measuring itself.
//
// It also checks the route: a question that OPENS with the calculator's own
// name must not be answered by a different calculator. That has been clean
// (0 of 1,625) since the naming layer landed, and it is cheap to keep asking.
//
// About four minutes. Zero dependencies, no network. Run it after any change
// to query-fill.js, to the field index, or to how answer_query decides it has
// enough to answer. test/unit/mcp-catalog.test.js keeps the dryer, the solar
// date and the chatter case as fast standing regressions.
//
//   node scripts/measure-unread-answers.mjs [--all]
import { readdir, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHOW_ALL = process.argv.includes("--all");
const { describe, answerQuery, run } = await import(resolve(ROOT, "mcp", "catalog.mjs"));

const FIELD_DIR = resolve(ROOT, "data", "fields");
const rowsByTile = new Map();
for (const name of await readdir(FIELD_DIR)) {
  if (!name.endsWith(".json") || name === "manifest.json") continue;
  const shard = JSON.parse(await readFile(resolve(FIELD_DIR, name), "utf8"));
  for (const [id, rows] of Object.entries(shard.tiles || {})) rowsByTile.set(id, rows);
}

// Numbers inside a LABEL are dropped, as in measure-query-fill.mjs: a person
// types "rainfall 4 in/hr", never the label's own thresholds back at it.
function phrase(rows, inputs) {
  const parts = [];
  for (const row of rows) {
    const v = inputs[row.d];
    if (v === null || v === undefined || v === "") continue;
    const label = String(row.l).split(/\s+/).filter((w) => !/\d/.test(w)).join(" ").trim();
    if (row.k === "select" || row.k === "checkbox") parts.push(`${label} ${v}`.trim());
    else parts.push(`${label} ${v}${row.u ? " " + row.u : ""}`.trim());
  }
  return parts.join(", ");
}

const close = (a, b) => {
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 1e-6);
  }
  return JSON.stringify(a) === JSON.stringify(b);
};

let tiles = 0, answered = 0, leftUnread = 0;
const wrong = [], harmless = [], misrouted = [];

for (const [id, rows] of rowsByTile) {
  let d;
  try { d = await describe({ id }); } catch { continue; }
  const ex = d.example && d.example.inputs;
  if (!ex || typeof ex !== "object") continue;
  if (!rows.some((r) => ex[r.d] !== null && ex[r.d] !== undefined && ex[r.d] !== "")) continue;
  tiles++;

  const q = `${d.name || id} ${phrase(rows, ex)}`;
  let r;
  try { r = await answerQuery({ query: q }); } catch { continue; }
  if (r.status !== "OK") continue;
  if (r.id !== id) { misrouted.push(`${id} -> ${r.id}  ::  ${q.slice(0, 140)}`); continue; }
  answered++;

  const nameNums = new Set(String(d.name || "").match(/\d+(?:\.\d+)?/g) || []);
  const placed = new Set(Object.values(r.inputs || {}).map(String));
  for (const x of rows) if (x.k === "select" || x.k === "checkbox") placed.add(String(ex[x.d]));
  const real = (r.unread || []).filter((u) => {
    const num = (String(u).match(/-?\d+(?:\.\d+)?/) || [])[0];
    return num !== undefined && !nameNums.has(num) && !placed.has(num);
  });
  if (!real.length) continue;
  leftUnread++;

  let truth;
  try { truth = await run({ id, inputs: ex }); } catch { continue; }
  const got = r.result || {}, want = (truth && truth.result) || {};
  const diffs = Object.keys(want).filter((k) => typeof want[k] !== "string" && !close(got[k], want[k]));
  const line = `${id}: unread ${JSON.stringify(real)}`;
  if (diffs.length) {
    wrong.push(`${line} -> ` + diffs.slice(0, 4).map((k) => `${k} ${JSON.stringify(got[k])} vs ${JSON.stringify(want[k])}`).join("; "));
  } else {
    harmless.push(`${line} (answer unchanged)`);
  }
}

console.log(`measure-unread-answers: ${tiles} worked example(s) phrased as named questions; ${answered} answered OK as themselves.`);
console.log(`  answered as a DIFFERENT calculator: ${misrouted.length}`);
for (const l of misrouted) console.log("    " + l);
console.log(`  answered while leaving a supplied number unread: ${leftUnread}`);
console.log(`  of those, returning a number that DISAGREES with the worked example: ${wrong.length}`);
for (const l of wrong) console.log("    " + l);
if (SHOW_ALL) for (const l of harmless) console.log("    " + l);
process.exit(wrong.length || misrouted.length ? 1 : 0);
