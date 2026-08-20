# spec-v1346.md — Both doors, gated

> Status: **PLANNED.** Part of [scope-one-box](scope-one-box.md).
> One new lint gate. No tile added, no compute touched, no pixel moved. Catalog stays **1,709**.
> Lands **early**: it is the safety net the rest of the program is built over.

## Why

A calculator in this catalog is reachable two ways. A person types into the search box on the
website; an agent calls the local MCP server. Measured across the whole catalog today:

| | |
|---|---|
| Tiles reachable in the search dropdown by their own name | **1,709 / 1,709** (1,704 rank first) |
| Tiles runnable through the MCP server | **1,709 / 1,709** |
| Tiles with a publisher-verified worked example | **1,709 / 1,709** |

Both doors are wide open. **Nothing asserts that they stay open.** `check-wiring` walks the import
graph, `check-discoverability` validates alias targets, and `check-tile-contract` holds the tile
shape — but no gate in the 42-gate chain says *every tile is findable* or *every tile is runnable*.

That matters more now than it did last month, for two reasons. The rest of this program rewires
how search routes — v1341 changes what Enter does, v1343 can decline to route at all — and a
regression there would show up as a tile that quietly cannot be reached, which is invisible to
every existing gate. And if a large share of the ~20k/mo really is agent traffic, the MCP door is
not a side feature; it is a primary interface, and its coverage deserves the same enforcement the
formula gates get.

## What it does

`scripts/check-both-doors.mjs` asserts two properties over the live catalog and fails CI on either.

| | |
|---|---|
| **Search door** | For every tile, `normalizeQuery(tool.name)` yields tokens, and `rankTools` returns that tile within the first 12 results — the same ranker, corpus, and limit the browser's dropdown uses. Not "rank 1": five tiles legitimately share vocabulary with a near-neighbour, and demanding first place would gate on a tie-break rather than on reachability. |
| **MCP door** | For every tile, `describe({id})` resolves, reports `runnable: true`, and names a compute the server can call. |
| **The example floor** | Every tile has at least one publisher-verified worked example row. This is what makes a tile answerable in one MCP round trip and is the fixture v1344 leans on. |
| **Failure output** | Names the tile, which door it failed, and why — a rank, a missing `COMPUTE_MAP` row, a throwing `describe`. A count alone is not actionable at this catalog size. |

It runs the **real** ranker and the **real** catalog loader. A gate that reimplements the thing it
checks passes while the product is broken.

## No allowlist

The obvious escape hatch — a list of tiles exempted from one door — is deliberately absent. Both
numbers are 1,709 of 1,709 today, so an allowlist would start empty and exist only to absorb the
first regression silently. If a tile genuinely cannot be run or found, that is a spec decision
with a written reason, not a line in a JSON file.

## Where it lives

- `scripts/check-both-doors.mjs` — **new.**
- `package.json` — joins the lint chain as the **43rd** gate.
- `README.md` — the gate count, 42 → 43. (`check-readme-counts` enforces this; it will fail
  the build until both strings are bumped.)

## Gotchas

- **Import the ranker, do not re-rank.** `search-discovery.js` is shared by the browser and
  `mcp/catalog.mjs` precisely so recall cannot drift; a third copy in a gate defeats the point.
- **Load aliases from `data/search/aliases.json`, the master** — not a per-group shard. The
  browser merges all shards at runtime, so the master is the equivalent corpus.
- `describe()` lazy-imports a calc module per tile. Over 1,709 tiles that is the slowest gate in
  the chain (~20 s). It belongs in `lint`, not in a pre-commit hook.
- Do not assert rank 1. It passes today at 1,704/1,709 and would fail on a legitimate,
  well-reviewed tile name that happens to share a word with a sibling.

## Proof

- `node scripts/check-both-doors.mjs` — clean, reporting `1709 searchable, 1709 runnable`.
- Verified to fail: a tile temporarily removed from `COMPUTE_MAP` is named with the MCP-door
  reason, and a tile renamed to collide out of the top twelve is named with its rank.
- Full chain green: `lint` (43 gates), `test:unit`, `build`.
