// v10 Phase A.1 unit tests for scripts/check-citation-freshness.mjs.
//
// Asserts the lint:
//   - exits 0 against the project's real manifests (must always pass).
//   - exits 1 with a clear error when a manifest is missing 'edition'.
//   - exits 1 when a date-bounded model bundle is past expiration.
//   - emits a WARN (does not fail) when 'asOf' is older than 365 days.
//
// Negative cases run the lint against a temporary fixture root: the
// script is copied into a tmpdir whose data/ tree is shaped per test.
// The script resolves ROOT from its own location, so a copied script
// reads the fixture's data/ tree.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = resolve(ROOT, "scripts", "check-citation-freshness.mjs");

function buildFixture(manifests, cycle) {
  const dir = mkdtempSync(resolve(tmpdir(), "rl-cit-"));
  mkdirSync(resolve(dir, "scripts"), { recursive: true });
  mkdirSync(resolve(dir, "data"), { recursive: true });
  writeFileSync(
    resolve(dir, "scripts", "sources-cycle.json"),
    JSON.stringify(cycle),
  );
  for (const [folder, body] of Object.entries(manifests)) {
    mkdirSync(resolve(dir, "data", folder), { recursive: true });
    writeFileSync(
      resolve(dir, "data", folder, "manifest.json"),
      JSON.stringify(body),
    );
  }
  copyFileSync(SCRIPT, resolve(dir, "scripts", "check-citation-freshness.mjs"));
  return dir;
}

function runScript(scriptPath) {
  const r = spawnSync(process.execPath, [scriptPath], { encoding: "utf8" });
  return {
    code: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

function runFixture(dir) {
  return runScript(resolve(dir, "scripts", "check-citation-freshness.mjs"));
}

test("lint exits 0 against the project's real manifests", () => {
  const r = runScript(SCRIPT);
  assert.equal(r.code, 0, "expected exit 0; stderr=\n" + r.stderr);
  assert.match(r.stdout, /citation-freshness lint OK/);
});

test("lint exits 1 when a manifest is missing 'edition'", () => {
  const dir = buildFixture(
    { sample: { name: "sample", asOf: "2026-05-10", shards: [] } },
    { standards: [] },
  );
  try {
    const r = runFixture(dir);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /missing 'edition'/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("lint exits 1 when a date-bounded model bundle is past expiration", () => {
  const dir = buildFixture(
    {
      sample: {
        name: "sample",
        edition: "WMM2020 coefficient bundle (test fixture, expired).",
        asOf: "2026-05-10",
        shards: [],
      },
    },
    {
      standards: [
        {
          id: "wmm-old",
          name: "NOAA WMM (test fixture, expired)",
          current_edition: "WMM2020",
          current_release: "2019-12",
          cycle_years: 5,
          expires_on: "2025-01-01",
          match_terms: ["WMM"],
        },
      ],
    },
  );
  try {
    const r = runFixture(dir);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /past expiration/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("lint warns when 'asOf' is older than 365 days", () => {
  const dir = buildFixture(
    {
      sample: {
        name: "sample",
        edition: "Original project content; no external standard cited.",
        asOf: "2020-01-01",
        shards: [],
      },
    },
    { standards: [] },
  );
  try {
    const r = runFixture(dir);
    assert.equal(r.code, 0);
    // Warnings go to stderr.
    assert.match(r.stderr, /more than 365 days old/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
