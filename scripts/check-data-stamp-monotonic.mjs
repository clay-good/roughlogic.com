#!/usr/bin/env node
// Provenance-stamp monotonicity lint (data/**).
//
// Every data shard carries "when we last looked" stamps -- verified_on,
// fetched, asOf, built, a date-shaped manifest version. They record research,
// so they only ever move FORWARD. A stamp that moves backwards means the
// branch is not adding knowledge, it is restoring an older snapshot over a
// newer one.
//
// That is not hypothetical. The monthly Data Refresh workflow regenerates
// data/ and opens a pull request. If a hand-correction lands on main after the
// refresh branch is cut, the branch is now a stale snapshot: merging it reverts
// the correction, and every existing gate passes, because the reverted file is
// internally consistent and its hashes were regenerated to match. Open PR #16
// would have rolled section-179-limits.json back from the OBBBA figures to the
// repealed TCJA phase-down -- halving the deduction cap a reader is shown --
// and the only visible trace was a verified_on that read 2026-09-01 against
// main's 2026-09-02.
//
// So: for every data/**/*.json this branch modifies, compare its provenance
// stamps against the BASE TIP -- not the merge base. Merge base is exactly the
// wrong reference here: a stale branch agrees with the commit it was cut from,
// and its regression is only visible against what main has learned since. A
// stale refresh PR always trips this, because the generator stamps TODAY into
// every shard it writes, so its stamps freeze on the day the branch was cut.
//
// Content dates (`date`, `effective_from`, `release_date`, `expires_on`, ...)
// are excluded: those are facts about the world and may legitimately be
// corrected in either direction.
//
// Pure read-and-report; no network, no mutation.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Keys that record when THIS PROJECT last looked at the source. Monotonic.
const STAMP_KEYS = new Set([
  "verified_on",
  "verifiedOn",
  "fetched",
  "asOf",
  "built",
  "generated",
  "derived_at",
  "_updated",
  "version", // only when date-shaped; a semver-ish version is ignored below
]);

const DATE_RE = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/;

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function tryGit(args) {
  try {
    return git(args).trim();
  } catch {
    return null;
  }
}

// A stamp is comparable only if both sides are date-shaped. "current",
// "2026 edition" and semver strings are left to the other gates.
function asDate(value) {
  if (typeof value !== "string") return null;
  const m = DATE_RE.exec(value);
  if (!m) return null;
  return m[3] ? value : value + "-01"; // month-only stamps compare at the 1st
}

// Walk two parsed JSON trees in lockstep, yielding [pointer, before, after]
// for every stamp key present on both sides.
function* stampPairs(before, after, pointer = "") {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return;
  if (Array.isArray(before) !== Array.isArray(after)) return;
  for (const [key, afterValue] of Object.entries(after)) {
    if (!Object.prototype.hasOwnProperty.call(before, key)) continue;
    const beforeValue = before[key];
    const here = pointer + "/" + key;
    if (STAMP_KEYS.has(key)) {
      const a = asDate(beforeValue);
      const b = asDate(afterValue);
      if (a && b) yield [here, a, b, beforeValue, afterValue];
      continue;
    }
    if (afterValue && typeof afterValue === "object") {
      yield* stampPairs(beforeValue, afterValue, here);
    }
  }
}

function resolveBase() {
  const explicit = process.env.DATA_STAMP_BASE;
  const candidates = explicit
    ? [explicit]
    : [
        process.env.GITHUB_BASE_REF && "origin/" + process.env.GITHUB_BASE_REF,
        "origin/main",
        "main",
      ].filter(Boolean);
  for (const ref of candidates) {
    const sha = tryGit(["rev-parse", "--verify", "--quiet", ref + "^{commit}"]);
    if (sha) return { ref, sha };
  }
  return null;
}

function main() {
  const base = resolveBase();
  if (!base) {
    console.error(
      "check-data-stamp-monotonic FAILED: no base commit to compare against. " +
        "Set DATA_STAMP_BASE to a ref (in CI, check out with fetch-depth: 0 so " +
        "origin/main resolves). Refusing to pass without looking.",
    );
    process.exit(1);
  }

  // Files THIS branch changed, relative to where it diverged. Anything main
  // moved on its own is not this branch's business.
  // A base identical to HEAD compares a commit with itself and finds nothing.
  // That is how this gate spent its first day in CI: on a push to main it
  // resolved origin/main, which after the push IS this commit, and reported
  // "OK: 0 stamps across 0 files" on every run. Green having looked at nothing
  // is the failure this gate's own contract says it refuses, so refuse it.
  const head = tryGit(["rev-parse", "HEAD"]);
  if (head && head === base.sha) {
    console.error(
      "check-data-stamp-monotonic FAILED: the base (" +
        base.ref +
        ") is this very commit, so there is nothing to compare. On a push, pass " +
        "the commit the push moved FROM (github.event.before); on a pull request, " +
        "the base branch. Refusing to report OK on an empty comparison.",
    );
    process.exit(1);
  }

  const mergeBase = tryGit(["merge-base", base.sha, "HEAD"]) || base.sha;
  const changed = git(["diff", "--name-only", mergeBase, "--", "data"])
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith(".json"));

  const errors = [];
  let compared = 0;

  for (const file of changed) {
    // ...but read the OTHER side from the base tip, which is what this branch
    // would actually land on top of.
    const raw = tryGit(["show", base.sha + ":" + file]);
    if (raw === null) continue; // new file on this branch; nothing to regress
    let before;
    let after;
    try {
      before = JSON.parse(raw);
      after = JSON.parse(readFileSync(resolve(ROOT, file), "utf8"));
    } catch {
      continue; // malformed JSON is another gate's job
    }
    for (const [pointer, a, b, rawBefore, rawAfter] of stampPairs(before, after)) {
      compared += 1;
      if (b < a) {
        errors.push(file + " " + pointer + ": " + rawBefore + " -> " + rawAfter);
      }
    }
  }

  if (errors.length > 0) {
    // One line per stamp, then the remediation once. Repeating the fix on
    // every line buries the list it is meant to explain.
    const SHOWN = 25;
    for (const e of errors.slice(0, SHOWN)) console.error("ERROR: " + e);
    if (errors.length > SHOWN) {
      console.error("ERROR: ... and " + (errors.length - SHOWN) + " more.");
    }
    console.error(
      "check-data-stamp-monotonic FAILED: " +
        errors.length +
        " provenance stamp(s) move BACKWARDS against " +
        base.ref +
        ".\nA stamp records when this project last looked at a source, so it only " +
        "moves forward.\nGoing back means this branch would restore an older " +
        "snapshot over newer work -- most often a data-refresh branch that was " +
        "cut before a hand-correction landed.\nRebase on " +
        base.ref +
        " and regenerate (npm run data:refresh) rather than merging as-is.",
    );
    process.exit(1);
  }

  console.log(
    "check-data-stamp-monotonic OK: " +
      compared +
      " provenance stamp(s) across " +
      changed.length +
      " modified data file(s) all move forward against " +
      base.ref +
      ".",
  );
}

main();
