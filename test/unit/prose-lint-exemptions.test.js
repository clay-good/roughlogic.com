import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { PROSE_LINT_THRESHOLD, PROSE_LINT_EXEMPT_KEYS } from "../../scripts/prose-lint-keys.mjs";

// Every key on the exemption list is a standing permission for one field to
// hold unbounded text, and an unexercised escape hatch is how things hide. On
// 2026-09-04 four of the twenty-one named keys that appear in NO shard --
// `summary`, `summaries`, `partial_payment_rule`, `self_help_warning`. They
// granted permission to nothing, and would have granted it silently to
// whatever claimed those names later.
//
// The remaining exemptions are justified by the NATURE of the field, not by
// its current length: `triage` and `storm_shelter` hold plain-English safety
// summaries, and one more sentence in either is a legitimate edit. So this
// does not require an exemption to be over the cap today -- only that the key
// exists somewhere, which is the thing that rots.

const DATA = resolve(import.meta.dirname, "..", "..", "data");

function collectKeys() {
  const seen = new Map();
  const walk = (v, lastKey) => {
    if (typeof v === "string") {
      if (lastKey == null) return;
      const cur = seen.get(lastKey) || { count: 0, max: 0 };
      cur.count++;
      cur.max = Math.max(cur.max, v.length);
      seen.set(lastKey, cur);
    } else if (Array.isArray(v)) {
      for (const x of v) walk(x, lastKey);
    } else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) walk(x, k);
    }
  };
  for (const folder of readdirSync(DATA)) {
    const dir = resolve(DATA, folder);
    if (!statSync(dir).isDirectory()) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;
      walk(JSON.parse(readFileSync(resolve(dir, file), "utf8")), null);
    }
  }
  return seen;
}

test("every prose-lint exemption names a key that actually exists in a shard", () => {
  const seen = collectKeys();
  const dead = [...PROSE_LINT_EXEMPT_KEYS].filter((k) => !seen.has(k));
  assert.deepEqual(
    dead,
    [],
    "these exempt keys appear in no data shard, so the exemption protects nothing " +
      "and would silently cover any future field taking the name: " + dead.join(", "),
  );
});

test("citation is not exempt, so a row cannot grow into an essay", () => {
  // The header comment in build-data.mjs claimed citations were exempt while
  // the code linted them. The code was right: the cap is what forces a row to
  // name its provision and measurement period and leave the rest to docs/.
  assert.ok(
    !PROSE_LINT_EXEMPT_KEYS.has("citation"),
    "citation must stay under the cap; put the explanation in docs/data-sources.md",
  );
  const nexus = JSON.parse(readFileSync(resolve(DATA, "legal", "sales-tax-nexus.json"), "utf8"));
  for (const [st, row] of Object.entries(nexus.by_state)) {
    if (!row || typeof row !== "object" || !row.citation) continue;
    assert.ok(
      row.citation.length <= PROSE_LINT_THRESHOLD,
      st + " citation is " + row.citation.length + " chars, over the " + PROSE_LINT_THRESHOLD + " cap",
    );
  }
});
