#!/usr/bin/env node
// spec-v22 CF-05: a `verified_on` stamp must be backed by the ledger.
//
// CF-04 gave the bundled federal dollar figures a recheck calendar after five
// of them were found wrong in a single day -- every one sitting under a recent
// `verified_on` stamp. This gate closes the other half of that finding: where
// the stamp comes from.
//
// It came from the clock. scripts/build-data.mjs wrote `verified_on: TODAY`
// into each shard body, so every refresh re-certified the whole catalog whether
// or not a human had looked at anything. data/accounting/pub-15-t-tables.json
// claimed verified_on 2026-09-02 over brackets it labels edition 2025, while
// scripts/sources-cycle.json -- the record of what was actually checked --
// said 2025-12-01, nine months earlier. Two layers disagreed and the reader
// saw the flattering one.
//
// The ledger is now authoritative for every shard it names, and this gate
// pins that:
//
//   1. a shard file named in a sources-cycle.json row carries `verified_on`
//   2. that stamp equals the OLDEST `last_verified` among the rows naming it
//      (a file is only as verified as its least-verified part)
//
// It deliberately does NOT compare against today's date. A date-triggered gate
// turns main red at UTC midnight with no commit; staleness is CF-03/CF-04's
// job, and this one only asks whether the stamp is honest about its own source.
//
// Pure read-and-report; no network, no mutation.

import { readFileSync } from "node:fs";
import { argv } from "node:process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The same `where`-parsing the generator uses. `where` is prose: a
// semicolon-separated list mixing shard paths, sub-key hints and the names of
// runtime constants -- "data/realestate/loan-limits.json baseline.fha_*;
// FHA_LIMITS". Only the data/*.json words are files.
export function ledgerVerifiedOn(cycle) {
  const out = new Map();
  for (const row of [...(cycle.annual_figures || []), ...(cycle.standards || [])]) {
    if (!row.last_verified || !row.where) continue;
    for (const piece of String(row.where).split(";")) {
      const file = piece.trim().split(/\s+/)[0];
      if (!file.startsWith("data/") || !file.endsWith(".json")) continue;
      const prior = out.get(file);
      if (!prior || row.last_verified < prior.date) {
        out.set(file, { date: row.last_verified, id: row.id });
      }
    }
  }
  return out;
}

function main() {
  const cycle = JSON.parse(readFileSync(resolve(ROOT, "scripts/sources-cycle.json"), "utf8"));
  const tracked = ledgerVerifiedOn(cycle);

  const errors = [];
  for (const [file, { date, id }] of tracked) {
    let shard;
    try {
      shard = JSON.parse(readFileSync(resolve(ROOT, file), "utf8"));
    } catch {
      errors.push(
        file + ": named by sources-cycle.json row '" + id + "' but cannot be read as JSON.",
      );
      continue;
    }
    const stamp = shard.verified_on || shard.verifiedOn;
    if (!stamp) {
      errors.push(
        file +
          ": no verified_on, but sources-cycle.json row '" +
          id +
          "' tracks it and records last_verified " +
          date +
          ". A tracked shard must carry the date, so a reader of the file alone " +
          "sees the same answer the ledger gives.",
      );
      continue;
    }
    if (stamp !== date) {
      errors.push(
        file +
          ": verified_on is " +
          stamp +
          ", but the oldest last_verified among the sources-cycle.json rows naming " +
          "it ('" +
          id +
          "') is " +
          date +
          ". The ledger records what a human checked; the shard must not claim more.",
      );
    }
  }

  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error(
      "check-verified-on-ledger FAILED: " +
        errors.length +
        " shard stamp(s) not backed by scripts/sources-cycle.json.\n" +
        "Fix the ledger row if the verification really happened, or let " +
        "scripts/build-data.mjs restamp the shard from the ledger " +
        "(npm run data:refresh).",
    );
    process.exit(1);
  }

  console.log(
    "check-verified-on-ledger OK: " +
      tracked.size +
      " ledger-tracked shard(s) carry a verified_on equal to their oldest recorded verification.",
  );
}

// The test suite imports ledgerVerifiedOn from this file. Running main() on
// import would print on every import and, on a real failure, process.exit(1)
// out of the middle of the test run.
if (resolve(argv[1] || "") === fileURLToPath(import.meta.url)) main();
