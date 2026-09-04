// The phrasing the site's first instruction teaches, and nothing measured it.
//
// README's step 1 is "Type the job the way you'd say it". The ranking harness
// had three ground truths -- curated aliases, tile names, tile ids -- and not
// one of them carries a question word. So a tokenizer change that stopped
// stripping "how many" would have broken the primary documented path while
// every one of those three stayed green, and the only way to notice would have
// been someone typing a question by hand.
//
// The ground truth here is not invented: a tile that ALREADY ranks first for
// its bare name must still rank first when the words a person actually types
// surround it. A tile that misses on its bare name is skipped, so this measures
// the opener and nothing else. It read 0 misses the day it was written, which
// is the point -- this pins a property that was already true.
//
// Sampling is stated, not hidden: every 24th tile, three phrasings each (a
// leading question word, a leading article, a trailing noun), because the full
// sweep over all 1,804 costs about as much as the other three sets combined.
// Run it in full with `node scripts/measure-ranking.mjs --asked`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { askedRows, measureAsked } from "../../scripts/measure-ranking.mjs";

const STRIDE = 24;

test("a question wrapped around a tile's own name still reaches that tile", () => {
  const rows = askedRows(STRIDE);
  // If the sample ever empties, the assertion below passes having checked
  // nothing -- the failure mode this whole file exists to prevent.
  assert.ok(rows.length > 150, `expected a real sample, got ${rows.length} rows`);

  const misses = measureAsked(STRIDE);
  assert.deepEqual(
    misses.map((m) => `${m.phrase} -> ${m.got} (want ${m.target})`),
    [],
    "a question phrasing lost a tile that wins on its bare name; the filler-word " +
      "stripping in normalizeQuery is what to look at",
  );
});
