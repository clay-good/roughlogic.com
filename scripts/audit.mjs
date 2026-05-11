#!/usr/bin/env node
// v10 §2 single-shot pre-PR audit (spec-v10.md §2 / §14).
//
// Spec-v10 §2 declares: "v10 promotes the recurring portion of [the
// launch-checklist] gates into a single, automated `npm run audit`
// command that any contributor can run before opening a pull request."
// Spec-v10 §14 then names it in the per-release ritual.
//
// This script chains the gates in the order a fresh contributor wants:
//   1. lint   - all the static + content checks (grep, ngrams, v6
//               discipline, manifests, citation freshness,
//               citation-strings in-sync, discoverability,
//               worked-examples, tile-meta, module sizes, home-view
//               payload).
//   2. test   - the full Node:test unit suite.
//   3. build  - produces dist/.
//   4. data:verify - re-checks SHA-256 hashes of every shard against
//               scripts/expected-hashes.json.
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
  { name: "data:verify", cmd: ["npm", "run", "data:verify"] },
];

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
