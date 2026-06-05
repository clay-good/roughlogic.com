// v10 Phase A.3 unit tests for the citation-strings generator.
//
// Asserts:
//   - docs/citation-strings.generated.json exists and parses.
//   - Every entry's tile id is real (in TOOLS).
//   - Every stamp string is a single-line plain-ASCII string with no
//     em-dashes, smart quotes, or other typographic invariants per
//     spec.md / spec-v6.
//   - Running scripts/build-citation-strings.mjs --check passes.
//   - Re-running the generator over the same source yields the same
//     output (deterministic).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GEN = resolve(ROOT, "docs", "citation-strings.generated.json");
const SCRIPT = resolve(ROOT, "scripts", "build-citation-strings.mjs");

async function loadToolIds() {
  const text = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const ids = new Set();
  for (const m of text.matchAll(/\{\s*id:\s*"([a-z0-9-]+)"/g)) ids.add(m[1]);
  return ids;
}

test("docs/citation-strings.generated.json exists and parses", async () => {
  assert.ok(existsSync(GEN), "generated file must exist; run `npm run docs:citation-strings`");
  const text = await readFile(GEN, "utf8");
  const json = JSON.parse(text);
  assert.ok(json.strings && typeof json.strings === "object");
  assert.ok(Object.keys(json.strings).length > 0);
});

test("every generated entry's tile id is a real tile (or a known alias)", async () => {
  const json = JSON.parse(await readFile(GEN, "utf8"));
  const ids = await loadToolIds();
  // citation-discipline.md is the human-edited source of truth and may
  // drift slightly ahead of or behind the live tile registry. Rows whose
  // ids do not yet (or no longer) match a live tile are listed here so
  // the test surfaces the divergence as documentation, not a hard fail.
  // Empty as of 2026-05-11: the two long-standing orphans (cook-temps
  // and vent-sizing) were removed from the discipline doc - cook-temps
  // had been refactored into the richer cooling-curve tile, and the
  // vent-sizing tile was never shipped.
  const KNOWN_STALE = new Set();
  const missing = [];
  for (const id of Object.keys(json.strings)) {
    if (ids.has(id)) continue;
    if (KNOWN_STALE.has(id)) continue;
    missing.push(id);
  }
  assert.deepEqual(missing, [], "generated entries with no live tile: " + missing.join(", "));
});

test("every stamp is a single-line, plain-ASCII string", async () => {
  const json = JSON.parse(await readFile(GEN, "utf8"));
  for (const [id, row] of Object.entries(json.strings)) {
    assert.ok(typeof row.stamp === "string", id + ": stamp must be a string");
    assert.ok(row.stamp.length > 0, id + ": stamp must be non-empty");
    assert.ok(!/[–—]/.test(row.stamp), id + ": stamp must not contain em-dash / en-dash");
    assert.ok(!/[‘’“”]/.test(row.stamp), id + ": stamp must not contain smart quotes");
    assert.ok(!/\n/.test(row.stamp), id + ": stamp must be single-line");
    // Stamps start with "Citation:" or "Notice:" per spec-v6 / v8 discipline.
    assert.ok(
      /^(Citation:|Notice:)/.test(row.stamp),
      id + ": stamp must start with 'Citation:' or 'Notice:'",
    );
  }
});

test("--check mode passes against the on-disk generated file", () => {
  const r = spawnSync(process.execPath, [SCRIPT, "--check"], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, "stderr=" + r.stderr);
  assert.match(r.stdout, /citation-strings in-sync OK/);
});

test("generator is deterministic: regenerating produces the same bytes", async () => {
  // Read current bytes, re-run the generator (emit), confirm byte-equal.
  const before = await readFile(GEN, "utf8");
  const r = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" });
  assert.equal(r.status, 0, "stderr=" + r.stderr);
  const after = await readFile(GEN, "utf8");
  assert.equal(after, before, "regeneration changed bytes (non-deterministic)");
});
