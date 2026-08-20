// spec-v1339: which shard a tile's field descriptors live in.
//
// One rule, imported by BOTH the build step that writes data/fields/*.json and
// the browser code that fetches them, so the two cannot disagree about a
// filename. A mismatch here is a silent 404 that degrades prefill to nothing,
// which is exactly the kind of failure a shared module makes impossible.
//
// The default shard is the tile's group letter, matching the
// data/search/aliases-<g>.json convention already in place: the browser knows
// a tile's group from TOOLS before it wants that tile's fields, so it derives
// the filename with no manifest fetch.
//
// A group whose shard outgrows the 24 KB gzip cap is SPLIT here rather than
// having the cap raised -- the cap exists because these are fetched on a phone
// on a job site. Splitting is alphabetical on the tile id's first character so
// it is stable: adding a tile never moves an existing one to another shard.

// group letter -> number of shards. Absent means one shard named for the group.
//
// e (Electrical) holds 2,305 field descriptors, a third of the catalog's, and
// gzips to 31.7 KB as a single shard. Split in two it is well under the cap.
export const SPLIT_GROUPS = { e: 2 };

const A = "a".charCodeAt(0);

// The shard basename for a tile: "k", or "e-1" / "e-2" for a split group.
export function bucketFor(group, tileId) {
  const g = String(group || "").toLowerCase();
  const parts = SPLIT_GROUPS[g];
  if (!parts || parts < 2) return g;
  const first = String(tileId || "").toLowerCase().charCodeAt(0) - A;
  // A tile id starting with a digit or symbol sorts before "a"; it belongs in
  // the first shard, which is where an alphabetical listing would put it.
  const idx = first >= 0 && first < 26 ? first : 0;
  const share = Math.ceil(26 / parts);
  return `${g}-${Math.min(parts, Math.floor(idx / share) + 1)}`;
}

// Every shard basename the catalog produces, for the build step's stale-file
// sweep and for the service worker's precache list.
export function allBuckets(groups) {
  const out = [];
  for (const group of groups) {
    const g = String(group).toLowerCase();
    const parts = SPLIT_GROUPS[g] || 1;
    if (parts < 2) out.push(g);
    else for (let i = 1; i <= parts; i++) out.push(`${g}-${i}`);
  }
  return [...new Set(out)].sort();
}
