#!/usr/bin/env node
// v10 §2 single-shot pre-PR audit (spec-v10.md §2 / §14).
//
// Spec-v10 §2 declares: "v10 promotes the recurring portion of [the
// launch-checklist] gates into a single, automated `npm run audit`
// command that any contributor can run before opening a pull request."
// Spec-v10 §14 then names it in the per-release ritual.
//
// This script chains the gates in the order a fresh contributor wants. The
// authoritative list is STAGES below, not this comment: it enumerated six
// stages while STAGES ran ten, so check-ci-claims now compares the two and
// fails if they drift.
//
//   1. lint               - every static + content check (57 gates).
//   2. test               - the full Node:test unit suite.
//   3. build              - produces dist/.
//   4. check:dist         - spec-v12 §G.3 dist/-vs-runtime cross-check: every
//                           same-origin reference under dist/ resolves.
//   5. check:shells       - spec-v13 Phase G shell content gate.
//   6. check:module-sizes - the per-module gzip cap. It measures the BUILT
//                           copy, which is why it sits here and not in lint,
//                           where it no-ops for want of a dist/.
//   7. check:shell-values - no NaN / undefined / empty prerendered answers.
//   8. check:lastmod      - the per-URL <lastmod> ledger matches dist/.
//   9. data:verify        - SHA-256 of every shard vs scripts/expected-hashes.json.
//  10. check:data-stamps  - provenance stamps only move forward vs the base.
//
// WHAT THIS DOES NOT RUN, and therefore what a green audit does not promise:
//
//   test:a11y          - the axe-core sweep over every route.
//   test:e2e:ci        - the rest of the Playwright integration suite.
//   check:shell-mobile - the 320 px prerendered-shell sweep.
//
// All three need a browser, so they stay out of a command meant to run
// anywhere without `playwright install`. That is a deliberate boundary, not an
// oversight -- but it was an undocumented one, and a contributor who reads
// "run this before opening a pull request" is entitled to know that a green
// audit is not a green CI. check-ci-claims pins this list to the difference
// between STAGES and the commands ci.yml actually runs, so a stage added to CI
// without a decision here fails the build.
//
// Each stage runs in series; a failure short-circuits the audit (the
// downstream stage probably depends on the earlier one).
//
// The script is deliberately a thin orchestrator: it runs the same
// npm scripts a contributor would otherwise type one at a time. The
// value is in the canonical order + per-stage banner + exit-code
// summary at the end.

import { spawnSync } from "node:child_process";

const STAGES = [
  { name: "lint", cmd: ["npm", "run", "lint"] },
  { name: "test", cmd: ["npm", "test"] },
  { name: "build", cmd: ["npm", "run", "build"] },
  // spec-v12 §G.3: dist/-vs-runtime cross-check. Runs after build so
  // it sees the actual shipped tree; a dangling reference fails CI.
  { name: "check:dist", cmd: ["npm", "run", "check:dist"] },
  // spec-v13 Phase G: shell authoring + payload-budget lint. Runs
  // after build so it can read the freshly generated shells in
  // dist/tools/<id>/ and dist/groups/<slug>/.
  { name: "check:shells", cmd: ["npm", "run", "check:shells"] },
  // The rest of what CI runs after its build. This gate is the one a
  // contributor is told to tick instead of running the chain by hand, so
  // anything CI checks after building has to be here or the promise is
  // false: until 2026-09-01 four of CI's six post-build gates were absent,
  // and a contributor could see "all 6 stages passed" and still go red.
  { name: "check:module-sizes", cmd: ["npm", "run", "check:module-sizes"] },
  { name: "check:shell-values", cmd: ["npm", "run", "check:shell-values"] },
  { name: "check:lastmod", cmd: ["npm", "run", "check:lastmod"] },
  { name: "data:verify", cmd: ["npm", "run", "data:verify"] },
  // Runs in CI as its own step, so it belongs here too: docs/contributor-
  // checklist.md promises a green `npm run audit` means CI will be green, and
  // this gate reached CI without reaching this list. It resolves its own base
  // (origin/main, else the parent commit), so it needs no configuration.
  { name: "check:data-stamps", cmd: ["npm", "run", "check:data-stamps"] },
  // Runs in CI as its own step, so it belongs here too: docs/contributor-
  // checklist.md promises that a green `npm run audit` means CI will be green,
  // and this gate was added to CI without being added here. It resolves its own
  // base (origin/main, else the parent commit), so it needs no configuration.
];

// The one CI post-build gate this chain does not run. check:shell-mobile
// drives 1,826 shells through a headless browser at 320px and takes four to
// five minutes; putting it here would make the gate something contributors
// skip. Named here and in docs/contributor-checklist.md rather than left as
// a silent difference, because a gap nobody states is a gap nobody runs.
const NOT_RUN_HERE = "check:shell-mobile (needs a headless browser; ~5 min -- run `npm run check:shell-mobile` before a layout or type change)";

function banner(stage, status) {
  // ASCII-only per the global typographic policy.
  const bar = "=".repeat(60);
  console.log("\n" + bar);
  console.log("[" + status + "] " + stage);
  console.log(bar);
}

let failures = 0;
const results = [];
for (const stage of STAGES) {
  banner(stage.name, "RUN ");
  const r = spawnSync(stage.cmd[0], stage.cmd.slice(1), {
    stdio: "inherit",
    shell: false,
  });
  const ok = r.status === 0;
  results.push({ name: stage.name, ok, code: r.status });
  if (!ok) {
    failures += 1;
    banner(stage.name, "FAIL");
    break; // short-circuit on first failure
  }
  banner(stage.name, " OK ");
}

console.log("\n" + "=".repeat(60));
console.log("v10 audit summary");
console.log("=".repeat(60));
for (const r of results) {
  console.log("  " + (r.ok ? " OK " : "FAIL") + "  " + r.name + (r.ok ? "" : "  (exit " + r.code + ")"));
}
const skipped = STAGES.length - results.length;
if (skipped > 0) {
  console.log("  ----  " + skipped + " stage(s) skipped after first failure");
}
if (failures > 0) {
  console.log("\nv10 audit FAILED: " + failures + " stage(s) failed.");
  process.exit(1);
}
console.log("\nv10 audit OK: all " + STAGES.length + " stages passed.");
console.log("Not run here: " + NOT_RUN_HERE);
