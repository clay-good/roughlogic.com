#!/usr/bin/env node
// docs/notice-variants.md must describe the notice selector that ships.
//
// Every tile page carries one inline notice naming who governs the answer --
// the AHJ, the IRS, the lab's SOP. It is the load-bearing sentence on the page,
// and which one a tile gets is decided by a short priority block in app.js.
// docs/notice-variants.md is the only written account of that block, and
// nothing checked it.
//
// It had drifted: the doc still listed `NOTICE_VETERINARY`, `NOTICE_EMS` and
// `NOTICE_AVIATION` as "variants in use", and still gave per-group rules for
// Groups S, U, V and W. Those groups were retired and the dead branches removed
// from app.js; the CHANGELOG records the removal, and the document describing
// the feature was never touched. A maintainer reading it would have believed
// the veterinary notice was reachable.
//
// Four assertions, all in both directions:
//   CONSTANTS  every NOTICE_* in app.js is in the doc's table, verbatim, and
//              the table names no constant app.js does not define.
//   GROUPS     the group letters the selector branches on are exactly the ones
//              the doc's per-group rules list.
//   IDS        same for the per-id overrides.
//   LIVE       every group letter the selector branches on is a group some tile
//              is actually in -- the check that would have caught S/U/V/W at
//              retirement rather than months later.
//
// Standalone Node 20, built-ins only. Wired into `npm run lint`.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = await readFile(resolve(ROOT, "app.js"), "utf8");
const doc = await readFile(resolve(ROOT, "docs", "notice-variants.md"), "utf8");
const { TOOLS } = await import(new URL("../tools-data.js", import.meta.url).href);

const errors = [];
const eq = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const list = (s) => [...s].sort().join(", ") || "(none)";

// --- CONSTANTS ---
const inCode = new Map();
for (const m of app.matchAll(/^const (NOTICE_[A-Z_]+) = "((?:[^"\\]|\\.)*)";/gm)) {
  inCode.set(m[1], m[2].replace(/\\"/g, '"'));
}
const inDoc = new Map();
for (const m of doc.matchAll(/\|\s*`(NOTICE_[A-Z_]+)`\s*\|\s*"([^"]*)"\s*\|/g)) {
  inDoc.set(m[1], m[2]);
}
if (inCode.size === 0) errors.push("no NOTICE_* constants found in app.js; this check has nothing to compare");
for (const [name, text] of inCode) {
  if (!inDoc.has(name)) errors.push(`app.js defines ${name}; docs/notice-variants.md does not list it`);
  else if (inDoc.get(name) !== text) {
    errors.push(`${name} wording differs:\n    app.js: ${text}\n    doc:    ${inDoc.get(name)}`);
  }
}
for (const name of inDoc.keys()) {
  if (!inCode.has(name)) errors.push(`docs/notice-variants.md lists ${name}; app.js no longer defines it`);
}

// --- SELECTOR ---
const start = app.indexOf('if (tool.id === "sales-tax-nexus") notice.textContent');
const block = start >= 0 ? app.slice(start, app.indexOf("\n\n", start)) : "";
if (!block) errors.push("could not find the notice selection block in app.js");
const codeGroups = new Set([...block.matchAll(/tool\.group === "([A-Z])"/g)].map((m) => m[1]));
const codeIds = new Set([...block.matchAll(/tool\.id === "([a-z0-9-]+)"/g)].map((m) => m[1]));

const rulesSection = doc.slice(doc.indexOf("## Selection rules"), doc.indexOf("## Adding a new variant"));
const docGroups = new Set([...rulesSection.matchAll(/^\s*-\s*Group ([A-Z])\b/gm)].map((m) => m[1]));
const docIds = new Set([...rulesSection.matchAll(/^\s*-\s*`([a-z0-9-]+)` ->/gm)].map((m) => m[1]));

if (!eq(codeGroups, docGroups)) {
  errors.push(`per-group rules disagree: app.js branches on [${list(codeGroups)}], the doc lists [${list(docGroups)}]`);
}
if (!eq(codeIds, docIds)) {
  errors.push(`per-id overrides disagree: app.js branches on [${list(codeIds)}], the doc lists [${list(docIds)}]`);
}

// --- LIVE ---
const liveGroups = new Set(TOOLS.map((t) => t.group));
for (const g of codeGroups) {
  if (!liveGroups.has(g)) errors.push(`the selector branches on Group ${g}, which no tile is in any more`);
}
const liveIds = new Set(TOOLS.map((t) => t.id));
for (const id of codeIds) {
  if (!liveIds.has(id)) errors.push(`the selector overrides "${id}", which is not a tile`);
}

if (errors.length) {
  console.error(`check-notice-variants FAILED with ${errors.length} problem(s):`);
  for (const e of errors) console.error("  - " + e);
  console.error("The notice names who governs the answer. Keep app.js and docs/notice-variants.md saying the same thing.");
  process.exit(1);
}
console.log(
  `check-notice-variants OK: ${inCode.size} notice variants match the doc verbatim; ` +
  `${codeGroups.size} per-group rule(s) [${list(codeGroups)}] and ${codeIds.size} per-id override(s) documented and live.`
);
