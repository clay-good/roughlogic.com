// Regression guard for the data-refresh GITHUB_OUTPUT heredoc.
//
// .github/workflows/data-refresh.yml and data-refresh-weekly.yml pipe this
// script's stdout into a multiline `$GITHUB_OUTPUT` assignment:
//
//     node scripts/analyze-data-changes.mjs > body.md
//     { echo 'body<<EOF'; cat body.md; echo EOF; } >> "$GITHUB_OUTPUT"
//
// GitHub Actions reads everything up to a line that is exactly the delimiter.
// Two output properties keep that contract intact, and both are asserted here:
//   1. The body MUST end with a newline. Without it, `cat body; echo EOF`
//      glues the last line onto the delimiter (`...rate.EOF`), so Actions
//      never sees a standalone `EOF` and the step dies with "Matching
//      delimiter not found 'EOF'" -- the real failure on the 2026-06-22
//      weekly Data Refresh run.
//   2. No body line may be exactly `EOF`, which would close the heredoc early.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = resolve(ROOT, "scripts", "analyze-data-changes.mjs");

function run() {
  const r = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" });
  assert.equal(r.status, 0, "stderr=" + r.stderr);
  return r.stdout;
}

test("analyze-data-changes emits a non-empty body", () => {
  assert.ok(run().length > 0, "body must not be empty");
});

test("body ends with a newline (keeps the $GITHUB_OUTPUT heredoc delimiter on its own line)", () => {
  assert.ok(run().endsWith("\n"), "body must end with a trailing newline");
});

test("no body line is exactly the heredoc delimiter EOF", () => {
  const lines = run().split("\n");
  assert.ok(!lines.includes("EOF"), "a standalone 'EOF' line would close the heredoc early");
});
