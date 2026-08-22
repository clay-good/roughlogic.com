#!/usr/bin/env node
// v6 citation-discipline lints (spec-v6.md §7).
//
// Three checks. Any failure exits non-zero so npm run lint blocks the
// release.
//
// 1. Edition-stamp lint: every per-folder data manifest carries an
//    "edition" field. (The build pipeline writes it from the DATASETS
//    table; this script verifies the on-disk artifact matches.)
//
// 2. Free-access lint: every dataset listed in scripts/expected-hashes.json
//    has a corresponding "### data/<folder>/<file>" entry in
//    docs/data-sources.md. The doc is the canonical place where each
//    shard names its publisher and (where applicable) the free public
//    access pointer; the build fails if a shard ships without a docs
//    entry.
//
// 3. Citation-string lint (advisory): scan every calc-*.js for
//    inline reference strings (regex: "per\s+[A-Z]") and report a
//    summary count. Not failing yet - the v6 audit converts these into
//    structured citation entries one trade group at a time, and
//    failing here would block all PRs that have not yet completed
//    their group's audit. The summary nonetheless tells the maintainer
//    where the audit work is concentrated; --verbose adds the per-module
//    counts, which are otherwise 49 WARN lines on every lint run and drown
//    the warnings a maintainer must actually act on.
//
// No network. No mutation. Pure read-and-report.

import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = resolve(ROOT, "data");
const DOCS_SOURCES = resolve(ROOT, "docs", "data-sources.md");

const errors = [];
const warnings = [];

async function checkEditionStamps() {
  const folders = (await readdir(DATA, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const folder of folders) {
    const manifestPath = resolve(DATA, folder, "manifest.json");
    if (!existsSync(manifestPath)) {
      errors.push("v6 edition-stamp lint: data/" + folder + "/ has no manifest.json. Add the dataset to scripts/build-data.mjs DATASETS or remove the directory.");
      continue;
    }
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (!manifest.edition || typeof manifest.edition !== "string" || manifest.edition.length === 0) {
      errors.push("v6 edition-stamp lint: data/" + folder + "/manifest.json is missing the 'edition' field (spec-v6 §2.6 / §7). Add an edition or 'as of' date to the dataset's entry in scripts/build-data.mjs DATASETS and re-run npm run data:refresh.");
    }
  }
}

async function checkFreeAccessDocCoverage() {
  if (!existsSync(DOCS_SOURCES)) {
    errors.push("v6 free-access lint: docs/data-sources.md not found.");
    return;
  }
  const doc = await readFile(DOCS_SOURCES, "utf8");
  const folders = (await readdir(DATA, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  // Gather every shipped shard from the on-disk manifests so the lint is
  // self-checking against the artifact.
  const shipped = [];
  for (const folder of folders) {
    const manifestPath = resolve(DATA, folder, "manifest.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    for (const shard of manifest.shards || []) {
      shipped.push("data/" + folder + "/" + shard.file);
    }
  }

  for (const path of shipped) {
    // The docs file may either name the shard exactly, or name the
    // folder collectively (used for fan-out shards like the per-commodity
    // historical files: docs lists "data/historical/commodities/*.json").
    const exact = doc.includes("### " + path);
    if (exact) continue;
    // Collective wildcard match: e.g., "data/historical/commodities/*.json"
    const wildcardMatch = doc.match(/^###\s+data\/[^\s\n]+\*\.json/gm) || [];
    const matchedByWildcard = wildcardMatch.some((line) => {
      const pattern = line.replace(/^###\s+/, "").trim();
      const regex = new RegExp("^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*") + "$");
      return regex.test(path);
    });
    if (matchedByWildcard) continue;
    errors.push("v6 free-access lint: " + path + " ships in data/ but is not documented in docs/data-sources.md. Add a '### " + path + "' section naming the publisher, the free-access pointer (if one exists), and the cadence.");
  }
}

async function reportInlineCitationStrings() {
  // Scan calc-*.js for "per <Capitalized>..." patterns. Advisory only.
  //
  // The per-file rows are behind --verbose. They used to print unconditionally:
  // 49 WARN lines on every `npm run lint`, out of 50 warnings and 280 lines of
  // output in total. That is a standing backlog nobody actions on a given run,
  // and it buried the warnings that ARE actionable -- a data shard past its
  // refresh cadence emits exactly one WARN line, visually identical to these.
  // The summary below keeps the number and the pointer, so nothing is lost
  // from the default run.
  const entries = (await readdir(ROOT)).filter((n) => /^calc-.*\.js$/.test(n));
  const verbose = process.argv.includes("--verbose");
  let total = 0;
  let files = 0;
  for (const f of entries) {
    const text = await readFile(resolve(ROOT, f), "utf8");
    const matches = text.match(/"[^"]*\bper [A-Z][^"]*"/g) || [];
    if (matches.length > 0) {
      total += matches.length;
      files += 1;
      if (verbose) {
        warnings.push("v6 citation-string lint (advisory): " + f + " contains " + matches.length + " inline 'per <Source>' citation strings. The v6 audit moves these into citations.js so an audit edits one place.");
      }
    }
  }
  if (total > 0) {
    warnings.push("v6 citation-string lint summary (advisory): " + total + " inline reference strings across " + files + " calc-*.js modules. Track per-group audit progress in docs/v6-audit.md; re-run with --verbose for the per-module counts.");
  }
}

async function main() {
  await checkEditionStamps();
  await checkFreeAccessDocCoverage();
  await reportInlineCitationStrings();

  if (warnings.length > 0) {
    for (const w of warnings) console.warn("WARN: " + w);
  }
  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error("v6 discipline lint FAILED with " + errors.length + " errors.");
    process.exit(1);
  }
  console.log("v6 discipline lint OK (edition stamps + free-access doc coverage).");
}

await main();
