#!/usr/bin/env node
// spec-v1968 gate: the per-state NEC adoption rows.
//
// - docs/code-adoption-rows.json has all 50 states and DC, each with a status,
//   a citation and an https source, and every listed edition is a year with an
//   effective date (or a draft_note saying why there is none);
// - an edition the NFPA map does not show is explained in draft_note, so a
//   mistyped edition cannot slip in quietly;
// - a row is signed only with a name, a date that is not in the future and a
//   primary citation; a signed row past its recheck is a warning (the page
//   withholds it) and two rechecks late is an error;
// - data/legal/code-adoption.json is exactly what build-data.mjs would write:
//   the signed rows, nothing else; docs/code-adoption-signoff.md is current.
//
// Read-and-report. With --write (after a sign-off), it rewrites the shard and
// re-hashes the legal manifest, scripts/expected-hashes.json and
// data/integrity.json for that folder only -- what `npm run data:refresh`
// would write for it, without restamping every other folder.

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { lintProseInShard } from "./prose-lint-keys.mjs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRows, validateRows, buildCodeAdoptionShard, signoffSheet } from "./code-adoption.mjs";
import { isoToday } from "../code-adoption.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHARD = resolve(ROOT, "data", "legal", "code-adoption.json");
const SHEET = resolve(ROOT, "docs", "code-adoption-signoff.md");

const doc = loadRows();
const today = isoToday();
const { errors, warnings } = validateRows(doc, today);

let shard = JSON.parse(readFileSync(SHARD, "utf8"));
let built = buildCodeAdoptionShard(doc, shard.fetched);
if (process.argv.includes("--write") && JSON.stringify(built) !== JSON.stringify(shard)) {
  if (errors.length) {
    console.error("check-code-adoption: not writing; fix these first:\n  " + errors.join("\n  "));
    process.exit(1);
  }
  built = buildCodeAdoptionShard(doc, today);
  const lint = lintProseInShard("legal", "code-adoption.json", built);
  if (lint.length) {
    console.error("check-code-adoption: not writing; prose-lint:\n  " + lint.join("\n  "));
    process.exit(1);
  }
  const fmt = (o) => JSON.stringify(o, null, 2) + "\n";
  const sha = (t) => createHash("sha256").update(t).digest("hex");
  const shardText = fmt(built);
  writeFileSync(SHARD, shardText);
  const mPath = resolve(ROOT, "data", "legal", "manifest.json");
  const m = JSON.parse(readFileSync(mPath, "utf8"));
  m.version = m.fetched = m.asOf = today;
  for (const s of m.shards) if (s.file === "code-adoption.json") s.gzip_size_bytes = gzipSync(Buffer.from(shardText, "utf8")).length;
  m.hashes["code-adoption.json"] = sha(shardText);
  const mText = fmt(m);
  writeFileSync(mPath, mText);
  const ehPath = resolve(ROOT, "scripts", "expected-hashes.json");
  const eh = JSON.parse(readFileSync(ehPath, "utf8"));
  eh.hashes["legal/code-adoption.json"] = sha(shardText);
  eh.hashes["legal/manifest.json"] = sha(mText);
  writeFileSync(ehPath, fmt(eh));
  const igPath = resolve(ROOT, "data", "integrity.json");
  const ig = JSON.parse(readFileSync(igPath, "utf8"));
  ig.manifests.legal = sha(mText);
  writeFileSync(igPath, fmt(ig));
  shard = built;
  console.log("check-code-adoption: wrote data/legal/code-adoption.json and re-hashed the legal folder.");
}
// The sheet is dated by the shard's fetch day, not the clock, so it does not
// go stale on its own; it changes when the rows do.
const sheet = signoffSheet(doc, shard.fetched);
let sheetOnDisk = "";
try { sheetOnDisk = readFileSync(SHEET, "utf8"); } catch { /* first write */ }
if (sheet !== sheetOnDisk) {
  if (process.argv.includes("--write")) { writeFileSync(SHEET, sheet); console.log("check-code-adoption: wrote docs/code-adoption-signoff.md."); }
  else errors.push("docs/code-adoption-signoff.md is out of date; run `node scripts/check-code-adoption.mjs --write`");
}
if (JSON.stringify(built) !== JSON.stringify(shard)) {
  errors.push("data/legal/code-adoption.json does not match docs/code-adoption-rows.json; run `node scripts/check-code-adoption.mjs --write`");
}

for (const w of warnings) console.warn("check-code-adoption: warning: " + w);
if (errors.length) {
  console.error("check-code-adoption: " + errors.length + " problem(s):\n  " + errors.join("\n  "));
  process.exit(1);
}
const shipped = Object.keys(shard.by_state).filter((k) => k !== "verifiedOn");
const signed = shipped.filter((k) => shard.by_state[k].verified_on).length;
console.log("check-code-adoption OK: " + Object.keys(doc.rows).length + " jurisdictions drafted, each cited; " + shipped.length + " shipped, " + signed + " signed off (the rest show as not verified); the shard matches the rows.");
