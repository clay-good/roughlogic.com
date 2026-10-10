// Which shard a tile's description remainder lives in.
//
// One rule, imported by BOTH scripts/build-catalog-lead.mjs (which writes
// data/desc/*.json) and app.js (which fetches them), so the two cannot disagree
// about a filename -- the same arrangement as field-bucket.js.
//
// Sharded by the first character of the tile id rather than by group: group E
// alone is a fifth of the catalog, and ids spread it across the alphabet. The
// browser has the id before it has anything else, so no manifest fetch is
// needed to name the shard.

// "a".."z", or "0" for an id that starts with a digit or a symbol.
export function descBucket(tileId) {
  const c = String(tileId || "").toLowerCase().charAt(0);
  return c >= "a" && c <= "z" ? c : "0";
}

// Every shard basename a catalog produces, in order.
export function descBuckets(tileIds) {
  return [...new Set(tileIds.map(descBucket))].sort();
}
