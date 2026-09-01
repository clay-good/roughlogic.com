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
import { execFileSync } from "node:child_process";
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

  // The two Playwright jobs partition the suite by title: `test:a11y` runs
  // `--grep 'a11y:'` and the integration job runs `--grep-invert` of the same
  // pattern. If the two ever stop being each other's complement, specs fall
  // into the gap and no job runs them -- a coverage hole that looks exactly
  // like a green build. Split 2026-08-30 to stop running the 1,806-test axe
  // sweep twice per push.
  const pkgJson = JSON.parse(await readFile(resolve(ROOT, "package.json"), "utf8"));
  const a11yScript = String(pkgJson.scripts["test:a11y"] || "");
  const ciScript = String(pkgJson.scripts["test:e2e:ci"] || "");
  const a11yPattern = (a11yScript.match(/--grep\s+'([^']+)'/) || [])[1];
  const ciPattern = (ciScript.match(/--grep-invert\s+'([^']+)'/) || [])[1];
  if (!a11yPattern || !ciPattern) {
    errors.push(
      "could not read the grep patterns out of package.json (`test:a11y` --grep and `test:e2e:ci` --grep-invert); " +
        "the two Playwright jobs are supposed to partition the suite by title.",
    );
  } else if (a11yPattern !== ciPattern) {
    errors.push(
      `test:a11y greps '${a11yPattern}' while test:e2e:ci inverts '${ciPattern}'. They must be the same pattern, ` +
        "or specs fall into the gap between the two jobs and nothing runs them.",
    );
  }
  // README states how big the axe pass is. That figure drifted the day the
  // shell sweep was added -- it said 1,806 against a live 1,875 -- which is the
  // same shape as every other unwatched number on this site. Pinned against the
  // count Playwright itself reports, in a band: a stated figure exists to tell a
  // reader the order of magnitude, and an exact pin that fails on every new
  // tile gets edited out of the way rather than obeyed. It also fails if the
  // prose stops stating a figure at all, so the check cannot go quiet.
  const claimed = readme.match(/the ([\d,]+)-test axe pass/);
  if (!claimed) {
    errors.push("README no longer states the size of the axe pass; the figure is the thing this check watches.");
  } else if (a11yPattern) {
    let live = null;
    try {
      // `--no-install` so this can never reach for the network: a gate that
      // installs things is a gate that can pass for the wrong reason. npx still
      // resolves an ancestor node_modules, which is what a git worktree has.
      // `--list` launches no browser, so this runs in the lint job, which
      // installs none.
      const out = execFileSync("npx", [
        "--no-install", "playwright", "test",
        "--config", "test/integration/playwright.config.js",
        "--grep", a11yPattern, "--list",
      ], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      const m = out.match(/Total:\s+(\d+)\s+tests/);
      if (m) live = Number(m[1]);
    } catch {
      live = null;
    }
    if (live === null) {
      errors.push("could not count the axe pass with `playwright --list`; the README figure is unverified, which is not the same as correct.");
    } else {
      const stated = Number(claimed[1].replace(/,/g, ""));
      const drift = Math.abs(live - stated) / live;
      if (drift > 0.05) {
        errors.push(`README says the axe pass is ${claimed[1]} tests; it is ${live} (${(drift * 100).toFixed(1)}% off).`);
      }
    }
  }

  if (!/npm run test:e2e:ci/.test(yaml)) {
    errors.push("the integration job no longer runs `npm run test:e2e:ci`; check it still complements the accessibility job.");
  }

  // The contributor checklist tells a reader that ticking `npm run audit` is
  // sufficient. That is only true while the audit chain covers what CI runs
  // after its build. Until 2026-09-01 it covered two of six, so a contributor
  // could see "all 6 stages passed" and go red in CI on four different gates.
  // Assert the two lists agree, with the one browser-driven gate named as a
  // deliberate exception rather than left as a silent difference.
  const auditSrc = await readFile(resolve(ROOT, "scripts", "audit.mjs"), "utf8");
  const auditStages = new Set(
    [...auditSrc.matchAll(/\{\s*name:\s*"([^"]+)"/g)].map((m) => m[1]),
  );
  const notRunHere = /const NOT_RUN_HERE = "([a-z:-]+)/.exec(auditSrc);
  const exempt = notRunHere ? notRunHere[1] : null;
  const ciPostBuild = [...yaml.matchAll(/run:\s*npm run (check:[a-z-]+)/g)].map((m) => m[1]);
  for (const gate of new Set(ciPostBuild)) {
    if (auditStages.has(gate)) continue;
    if (gate === exempt) continue;
    errors.push(
      `scripts/audit.mjs does not run ${gate}, which ${WORKFLOW} runs after its build. ` +
      `docs/contributor-checklist.md says ticking \`npm run audit\` is sufficient, so either add ` +
      `the stage or name it in that file's NOT_RUN_HERE with the reason.`);
  }
  if (exempt && !(await readFile(resolve(ROOT, "docs", "contributor-checklist.md"), "utf8")).includes(exempt)) {
    errors.push(
      `scripts/audit.mjs exempts ${exempt} but docs/contributor-checklist.md does not tell a ` +
      `contributor to run it. An exemption nobody states is a gate nobody runs.`);
  }

  if (errors.length) {
    console.error("check-ci-claims FAILED:");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(
    `check-ci-claims OK: README names all ${jobs.length} CI jobs (${jobs.join(", ")}), states the axe pass within 5% of its live size, and no doc claims a gate the workflow does not run.`,
  );
}

main().catch((e) => {
  console.error("check-ci-claims: unexpected error", e);
  process.exit(1);
});
