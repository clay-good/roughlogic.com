#!/usr/bin/env node
// A provenance stamp may not be dated after tomorrow.
//
// `verified_on`, `last_verified`, `_updated` and their kin record when this
// project looked at something. A stamp dated in the future records a look that
// has not happened. On 2026-09-18, fifty worked-example rows for four bands
// committed that same day claimed verification on 2026-09-19, -20, -21 and
// -22 -- one invented day per band -- and `data/search/aliases.json` and the
// worked-example fixture both carried an `_updated` of 2026-09-22. Every gate
// passed: they check that a stamp is date-shaped, backed by the ledger, and
// never moves backwards, and none of them asks whether the date has arrived.
//
// Worse, check-data-stamp-monotonic turned the invented date into a ratchet:
// correcting `_updated` from 2026-09-22 to the real date reads as a stamp
// moving backwards, so the gate would have forced every honest stamp to wait
// for the calendar to catch up with the fiction.
//
// This is the one clock comparison that is safe to make. The project refuses
// date-triggered gates because they turn main red at UTC midnight with no
// commit (see check-verified-on-ledger). This gate can only move the other
// way: a stamp that passes today passes on every later day. Time can turn it
// green, never red.
//
// The horizon is TOMORROW in UTC, not today, so a stamp written in a zone
// ahead of UTC on its own local date still passes.
//
// Pure read-and-report; no network, no mutation.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { argv } from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Keys that record when this project looked. Content dates (`effective_from`,
// `release_date`, `next_expected`, ...) are facts about the world and may
// legitimately lie ahead, so they are not read.
export const STAMP_KEYS = new Set([
  "verified_on",
  "verifiedOn",
  "last_verified",
  "fetched",
  "asOf",
  "built",
  "generated",
  "derived_at",
  "_updated",
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Tomorrow's date in UTC, as YYYY-MM-DD.
export function stampHorizon(now = new Date()) {
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return t.toISOString().slice(0, 10);
}

// Every [pointer, value] under a stamp key whose date lies past the horizon.
export function findFutureStamps(node, horizon, pointer = "") {
  const found = [];
  if (!node || typeof node !== "object") return found;
  for (const [key, value] of Object.entries(node)) {
    const here = pointer + "/" + key;
    if (STAMP_KEYS.has(key) && typeof value === "string" && DATE_RE.test(value.slice(0, 10))) {
      if (value.slice(0, 10) > horizon) found.push([here, value]);
    } else if (value && typeof value === "object") {
      found.push(...findFutureStamps(value, horizon, here));
    }
  }
  return found;
}

function* jsonFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* jsonFiles(path);
    else if (name.endsWith(".json")) yield path;
  }
}

function main() {
  const horizon = stampHorizon();
  const files = [
    ...jsonFiles(resolve(ROOT, "data")),
    resolve(ROOT, "test/fixtures/worked-examples.json"),
    resolve(ROOT, "scripts/sources-cycle.json"),
  ];
  const errors = [];
  let scanned = 0;
  for (const file of files) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      continue; // malformed JSON is another gate's job
    }
    scanned += 1;
    for (const [pointer, value] of findFutureStamps(parsed, horizon)) {
      errors.push(relative(ROOT, file) + " " + pointer + ": " + value);
    }
  }
  if (errors.length > 0) {
    for (const e of errors.slice(0, 25)) console.error("ERROR: " + e);
    if (errors.length > 25) console.error("ERROR: ... and " + (errors.length - 25) + " more.");
    console.error(
      "check-future-stamps FAILED: " + errors.length + " provenance stamp(s) dated after " +
        horizon + " (tomorrow, UTC).\nA stamp records when this project looked at a source; " +
        "a date that has not arrived records a look that has not happened.\nStamp the date the " +
        "work was actually done.",
    );
    process.exit(1);
  }
  console.log("check-future-stamps OK: no provenance stamp dated after " + horizon + " across " + scanned + " file(s).");
}

if (resolve(argv[1] || "") === fileURLToPath(import.meta.url)) main();
