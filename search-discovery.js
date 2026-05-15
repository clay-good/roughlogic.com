// v10 Phase D runtime helpers (spec-v10.md §6).
//
// Pure-functional resolvers over the data/search/aliases.json shard.
// The resolvers are deliberately allocation-light and DOM-free so they
// can be unit-tested under node:test and so the same code runs in any
// future Web Worker.
//
// Functions:
//   resolveQuery(query, aliases, toolIds)
//     -> { match: tileId, alias?: term, kind?: 'industry' | 'redirect'
//          | 'adjacent' } | null
//     Resolves a free-text query against the alias table. Exact tile-id
//     match wins over any alias. Match is case-insensitive and trims
//     leading / trailing whitespace. Returns null on no match.
//
//   matchAliasPrefix(prefix, aliases, limit)
//     -> [{ term, target, kind }, ...]
//     Returns alias rows whose `term` starts with the given prefix
//     (case-insensitive). Used by the home-view search index for
//     autocomplete suggestions; capped at `limit` (default 8).
//
// All inputs are validated; bad input returns the appropriate empty
// value rather than throwing.

export function resolveQuery(query, aliases, toolIds) {
  if (typeof query !== "string") return null;
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const ids = toIdSet(toolIds);
  // Exact tile-id match (no alias indirection): the user typed the id.
  if (ids.has(q)) return { match: q };
  if (!Array.isArray(aliases)) return null;
  for (const row of aliases) {
    if (!row || typeof row !== "object") continue;
    if (typeof row.term !== "string" || typeof row.target !== "string") continue;
    if (row.term.toLowerCase() !== q) continue;
    if (ids.size > 0 && !ids.has(row.target)) continue;
    return { match: row.target, alias: row.term, kind: row.kind || "redirect" };
  }
  return null;
}

export function matchAliasPrefix(prefix, aliases, limit) {
  if (typeof prefix !== "string") return [];
  const p = prefix.trim().toLowerCase();
  if (!p) return [];
  if (!Array.isArray(aliases)) return [];
  const cap = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 8;
  const out = [];
  for (const row of aliases) {
    if (!row || typeof row !== "object") continue;
    if (typeof row.term !== "string" || typeof row.target !== "string") continue;
    if (!row.term.toLowerCase().startsWith(p)) continue;
    out.push({ term: row.term, target: row.target, kind: row.kind || "redirect" });
    if (out.length >= cap) break;
  }
  return out;
}

function toIdSet(toolIds) {
  if (toolIds instanceof Set) return toolIds;
  if (Array.isArray(toolIds)) return new Set(toolIds);
  return new Set();
}
