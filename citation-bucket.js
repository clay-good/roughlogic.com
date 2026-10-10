// Which shard a tile's citation lives in.
//
// One rule, imported by BOTH scripts/build-citation-shards.mjs (which writes
// data/citations/*.json) and app.js (which fetches them), so the two cannot
// disagree about a filename -- the same arrangement as desc-bucket.js.
//
// Hashed rather than keyed by first letter: ids starting with "s" alone carry
// 171 KB of citations gzipped, and a hash spreads 2,263 entries over 64 shards
// of 13 to 30 KB. The browser has the id before it has anything else, so no
// manifest fetch is needed to name the shard.

export const CITATION_BUCKETS = 64;

// "00".."63": a 31-multiplier string hash of the tile id, modulo the count.
export function citationBucket(tileId) {
  let h = 0;
  for (const ch of String(tileId || "")) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return String(h % CITATION_BUCKETS).padStart(2, "0");
}
