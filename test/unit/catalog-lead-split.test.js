// The browser's catalog is tools-lead.js (each description cut to its opening
// sentence) plus data/desc/<bucket>.json (the remainders). tools-data.js stays
// the source of truth. The split is only safe if it is invisible: the same
// tiles in the same order, every description restored character for
// character, and the same sentence shown under a tile's title before and after
// its shard lands. scripts/build-catalog-lead.mjs asserts this when it writes;
// this test asserts it of the files actually committed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { TOOLS as FULL } from "../../tools-data.js";
import { TOOLS as LEAD } from "../../tools-lead.js";
import { leadSentence, restOfDescription } from "../../text-lead.js";
import { descBucket, descBuckets } from "../../desc-bucket.js";

const DIR = new URL("../../data/desc/", import.meta.url);
const shard = (b) => JSON.parse(readFileSync(new URL(b + ".json", DIR), "utf8"));

test("catalog split: tools-lead.js holds every tile in tools-data.js order", () => {
  assert.equal(LEAD.length, FULL.length);
  // constant-notes.js decodes a bitmap by catalog POSITION, so order is load-bearing.
  assert.deepEqual(LEAD.map((t) => t.id), FULL.map((t) => t.id));
  for (let i = 0; i < FULL.length; i++) {
    const { desc: _d, more: _m, ...lead } = LEAD[i];
    const { desc: _f, ...full } = FULL[i];
    assert.deepEqual(lead, full, FULL[i].id + " differs outside desc");
  }
});

test("catalog split: lead plus its shard remainder is the original description, exactly", () => {
  const cache = new Map();
  let withRest = 0;
  for (let i = 0; i < FULL.length; i++) {
    const t = LEAD[i];
    let restored = t.desc;
    if (t.more) {
      const b = descBucket(t.id);
      if (!cache.has(b)) cache.set(b, shard(b));
      const rest = cache.get(b).rest[t.id];
      assert.equal(typeof rest, "string", t.id + " is marked more but has no remainder in " + b + ".json");
      restored += rest;
      withRest++;
    }
    assert.equal(restored, FULL[i].desc, t.id + " does not reconstruct");
  }
  assert.ok(withRest > 1500, "expected most tiles to have a remainder, got " + withRest);
});

test("catalog split: the sentence under the title is the same before and after the shard lands", () => {
  for (let i = 0; i < FULL.length; i++) {
    assert.equal(leadSentence(LEAD[i].desc), leadSentence(FULL[i].desc), FULL[i].id);
    // A tile with nothing left over must not promise more, and the reverse.
    if (!LEAD[i].more) assert.equal(LEAD[i].desc, FULL[i].desc, FULL[i].id);
    else assert.ok(restOfDescription(FULL[i].desc).length > 0 || FULL[i].desc.length > LEAD[i].desc.length, FULL[i].id);
  }
});

test("catalog split: the shard files on disk are exactly the buckets in use, with no stray ids", () => {
  const onDisk = readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "manifest.json").map((f) => f.slice(0, -5)).sort();
  const expected = descBuckets(LEAD.filter((t) => t.more).map((t) => t.id));
  assert.deepEqual(onDisk, expected);
  const ids = new Set(LEAD.filter((t) => t.more).map((t) => t.id));
  for (const b of onDisk) {
    const s = shard(b);
    assert.equal(s.bucket, b);
    for (const id of Object.keys(s.rest)) {
      assert.ok(ids.has(id), id + " in " + b + ".json is not a tile with a remainder");
      assert.equal(descBucket(id), b, id + " is in the wrong shard");
    }
  }
});

test("catalog split: app.js imports the lead catalog, and nothing the browser loads imports the full one", () => {
  const app = readFileSync(new URL("../../app.js", import.meta.url), "utf8");
  assert.match(app, /import\("\.\/tools-lead\.js"\)/);
  assert.doesNotMatch(app, /tools-data\.js"\)/);
  const notes = readFileSync(new URL("../../constant-notes.js", import.meta.url), "utf8");
  assert.match(notes, /from "\.\/tools-lead\.js"/);
  const sw = readFileSync(new URL("../../sw.js", import.meta.url), "utf8");
  assert.match(sw, /"\.\/tools-lead\.js"/);
  assert.doesNotMatch(sw, /"\.\/tools-data\.js"/);
});
