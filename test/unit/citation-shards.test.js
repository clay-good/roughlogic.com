// The browser's citations are data/citations/<bucket>.json (the registry's
// entries, sharded by a hash of the tile id) rendered by citation-block.js.
// citations.js stays the source of truth. The split is only safe if it is
// invisible: every tile's entry in exactly one shard, in the shard the browser
// will ask for, saying exactly what the registry says, and rendering the same
// block and the same copy text. scripts/build-citation-shards.mjs asserts the
// round trip when it writes; this test asserts it of the files committed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { CITATIONS, buildAnswerWithReference } from "../../citations.js";
import { buildReferenceText } from "../../citation-block.js";
import { citationBucket, CITATION_BUCKETS } from "../../citation-bucket.js";
import { TOOLS } from "../../tools-data.js";

const DIR = new URL("../../data/citations/", import.meta.url);
const text = (name) => readFileSync(new URL(name, DIR), "utf8");
const shardNames = readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "manifest.json").sort();
const shards = new Map(shardNames.map((f) => [f.slice(0, -5), JSON.parse(text(f))]));

test("citation shards: every registry entry is in exactly the shard the browser asks for, unchanged", () => {
  let seen = 0;
  for (const [b, s] of shards) {
    assert.equal(s.bucket, b);
    for (const [id, entry] of Object.entries(s.entries)) {
      assert.equal(citationBucket(id), b, id + " is in the wrong shard");
      assert.ok(Object.hasOwn(CITATIONS, id), id + " in " + b + ".json is not in the registry");
      assert.deepEqual(entry, CITATIONS[id], id + " differs from the registry");
      seen++;
    }
  }
  assert.equal(seen, Object.keys(CITATIONS).length);
  for (const id of Object.keys(CITATIONS)) {
    assert.ok(Object.hasOwn(shards.get(citationBucket(id)).entries, id), id + " is missing from its shard");
  }
});

test("citation shards: every catalog tile finds its citation through the bucket rule", () => {
  for (const t of TOOLS) {
    const s = shards.get(citationBucket(t.id));
    assert.ok(s && s.entries[t.id], t.id + " has no citation in " + citationBucket(t.id) + ".json");
  }
});

test("citation shards: the copy text built from a shard entry is the text built from the registry", () => {
  for (const id of Object.keys(CITATIONS)) {
    const entry = shards.get(citationBucket(id)).entries[id];
    assert.equal(buildReferenceText("Name", "answer: 1", entry), buildAnswerWithReference("Name", "answer: 1", id), id);
  }
  // A tile with no entry keeps the same fallback line.
  assert.equal(buildReferenceText("Name", "", null), buildAnswerWithReference("Name", "", "no-such-tile"));
});

test("citation shards: bucket names are two digits below the bucket count, and all are in use", () => {
  for (const id of ["a", "voltage-drop", "", "zonal-add-a-hole", "123"]) {
    const b = citationBucket(id);
    assert.match(b, /^\d{2}$/);
    assert.ok(Number(b) < CITATION_BUCKETS);
  }
  assert.equal(shards.size, CITATION_BUCKETS);
});

test("citation shards: the manifest hashes every shard on disk and nothing else", () => {
  const manifest = JSON.parse(text("manifest.json"));
  assert.deepEqual(Object.keys(manifest.hashes).sort(), shardNames);
  for (const f of shardNames) {
    assert.equal(manifest.hashes[f], createHash("sha256").update(text(f), "utf8").digest("hex"), f);
  }
});

test("citation shards: no shard is large enough to matter on a phone", () => {
  for (const f of shardNames) assert.ok(text(f).length < 400 * 1024, f + " is " + text(f).length + " bytes raw");
});
