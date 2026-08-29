#!/usr/bin/env node
// CI-claims gate.
//
// A Lighthouse job was removed from .github/workflows/ci.yml on 2026-08-23
// (commit 88e7ea7f) for a sound reason: @lhci/cli's latest release carries an
// unpatched high-severity archive-traversal advisory. The removal was the right
// call and the CHANGELOG records it. What it left behind was the problem --
// README.md went on saying "CI adds four parallel jobs per push: ... Lighthouse
// (median of 3) ..." and docs/performance.md went on saying the workflow "runs
// Lighthouse CI ... on every push and pull request. The build fails if any
// assertion is violated." For six days a reader was told the performance budget
// gated every push when nothing measured it.
//
// This gate pins the claim to the workflow:
//
//   A. README states the number of CI jobs, and names each one, matching the
//      jobs ci.yml actually defines.
//   B. no living doc says Lighthouse runs in CI while no job runs it.
//
// It is deliberately about the CLAIM, not the workflow: removing a job stays a
// one-line edit, but it now costs the sentence that describes it too.
//
// Deterministic, offline, no YAML dependency (the workflow's job keys are the
// only structure read). Standalone Node 20, built-ins only.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = ".github/workflows/ci.yml";

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

// Job keys are the two-space-indented mapping keys under a top-level `jobs:`.
function workflowJobs(yaml) {
  const lines = yaml.split("\n");
  const start = lines.findIndex((l) => /^jobs:\s*$/.test(l));
  if (start === -1) return null;
  const jobs = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line) && line.trim()) break; // next top-level key
    const m = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (m) jobs.push(m[1]);
  }
  return jobs;
}

async function main() {
  const errors = [];
  const yaml = await readFile(resolve(ROOT, WORKFLOW), "utf8");
  const readme = await readFile(resolve(ROOT, "README.md"), "utf8");

  const jobs = workflowJobs(yaml);
  if (!jobs || jobs.length === 0) {
    console.error(`check-ci-claims: could not read job names from ${WORKFLOW}. Did the workflow layout change?`);
    process.exit(1);
  }

  // A. the stated count.
  const stated = /CI adds (\w+) (?:parallel )?jobs? per push/.exec(readme);
  if (!stated) {
    errors.push(
      `README.md no longer contains the "CI adds <N> jobs per push" sentence this gate anchors on. ` +
        `Restore it or update this gate -- it is how a reader learns what stands between a change and a deploy.`,
    );
  } else {
    const claimed = NUMBER_WORDS[stated[1].toLowerCase()] ?? Number(stated[1]);
    if (claimed !== jobs.length) {
      errors.push(
        `README.md says "${stated[0]}", but ${WORKFLOW} defines ${jobs.length} (${jobs.join(", ")}).`,
      );
    }
    // B. each job named.
    for (const job of jobs) {
      if (!new RegExp(`\`${job}\``).test(readme)) {
        errors.push(`${WORKFLOW} defines the "${job}" job, but README.md never names it.`);
      }
    }
  }

  // C. nothing claims Lighthouse gates CI unless a job runs it.
  const runsLighthouse = /lhci|lighthouse/i.test(yaml);
  if (!runsLighthouse) {
    for (const doc of ["README.md", "docs/performance.md", "docs/architecture.md", "docs/deployment.md"]) {
      let text;
      try {
        text = await readFile(resolve(ROOT, doc), "utf8");
      } catch {
        continue;
      }
      for (const line of text.split("\n")) {
        // A claim, not a mention. Two conditions have to hold together: the
        // line ties Lighthouse to the automated pipeline, AND it asserts that
        // pipeline runs or enforces it. A sentence saying a PERSON runs it, or
        // that it no longer runs, is not a claim about CI -- and the exemption
        // is a negation test, not a keyword allowlist, so it cannot be widened
        // into a hole by accident.
        if (!/lighthouse/i.test(line)) continue;
        const negated = /\bno longer\b|\bno CI\b|\bnot? (?:measured|run|asserted)\b|\b(?:was|were) removed\b|\bremoved on\b|\bmanual\b|\bdesign target\b|\breinstated\b/i.test(line);
        const tiedToCi = /\bCI\b|ci\.yml|\bpipeline\b|\bthe build\b|\bevery push\b|\bper push\b|\bworkflow\b/i.test(line);
        const asserts = /\bruns?\b|\bgates?\b|\bpass(?:es|ing)?\b|\bfails the build\b|\benforced?\b/i.test(line);
        if (!negated && tiedToCi && asserts) {
          errors.push(
            `${doc} says Lighthouse runs or gates CI, but ${WORKFLOW} has no Lighthouse job: ` +
              `"${line.trim().slice(0, 120)}"`,
          );
        }
      }
    }
  }

  if (errors.length) {
    console.error("check-ci-claims FAILED:");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(
    `check-ci-claims OK: README names all ${jobs.length} CI jobs (${jobs.join(", ")}) and no doc claims a gate the workflow does not run.`,
  );
}

main().catch((e) => {
  console.error("check-ci-claims: unexpected error", e);
  process.exit(1);
});
