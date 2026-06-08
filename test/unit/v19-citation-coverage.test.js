// spec-v19 Citation Integrity Sweep — coverage-gate graduation pins.
//
// v19 graduated check-citation-coverage.mjs from warn to fail on three
// contracts (the substance of the sweep itself landed via v22's findings
// register, see test/unit/v22-citation-integrity.test.js). These tests
// re-assert the contracts at the unit layer so a regression surfaces in
// `npm test` and not only in the lint gate:
//   §2.1 every public tile has a citation entry (and no orphan entries),
//   §2.2 every entry carries the four required fields, non-empty,
//   §4.1 no field carries a raw http(s):// scheme (bare domains only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Parse the TOOLS id list out of tools-data.js the same brace-balanced way
// the render and a11y integration tests do (no eval, no build).
async function toolIds() {
  const src = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const start = src.indexOf("const TOOLS = [");
  assert.ok(start >= 0, "TOOLS array not found in tools-data.js");
  let i = src.indexOf("[", start) + 1;
  let depth = 1;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === "[") depth++;
    else if (ch === "]") { depth--; if (depth === 0) break; }
    i++;
  }
  const body = src.slice(start, i);
  const ids = [];
  for (const m of body.matchAll(/\{\s*id:\s*"([a-z0-9-]+)"/g)) ids.push(m[1]);
  return ids;
}

test("§2.1: every TOOLS tile has a CITATIONS entry, no orphan entries", async () => {
  const { CITATIONS } = await import("../../citations.js");
  const tools = new Set(await toolIds());
  const cited = new Set(Object.keys(CITATIONS));
  const uncovered = [...tools].filter((id) => !cited.has(id));
  const orphans = [...cited].filter((id) => !tools.has(id));
  assert.deepEqual(uncovered, [], "tiles with no citation entry: " + uncovered.join(", "));
  assert.deepEqual(orphans, [], "orphan citation entries (no live tile): " + orphans.join(", "));
});

test("§2.2: every CITATIONS entry carries the four required fields, non-empty", async () => {
  const { CITATIONS } = await import("../../citations.js");
  const required = ["formula", "edition", "freeAccess", "governance"];
  const missing = [];
  for (const [id, entry] of Object.entries(CITATIONS)) {
    for (const f of required) {
      const v = entry[f];
      if (v == null || String(v).trim() === "") missing.push(id + "." + f);
    }
  }
  assert.deepEqual(missing, [], "entries missing a required field: " + missing.join(", "));
});

test("§4.1: no citation field carries a raw http(s):// scheme", async () => {
  const { CITATIONS } = await import("../../citations.js");
  const fields = ["formula", "edition", "freeAccess", "governance", "editionNote"];
  const offenders = [];
  for (const [id, entry] of Object.entries(CITATIONS)) {
    for (const f of fields) {
      if (typeof entry[f] === "string" && /https?:\/\//.test(entry[f])) offenders.push(id + "." + f);
    }
  }
  assert.deepEqual(offenders, [], "fields with a raw URL scheme (use a bare domain): " + offenders.join(", "));
});
