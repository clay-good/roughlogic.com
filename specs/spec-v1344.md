# spec-v1344.md — answer_query reads the same registry

> Status: **SHIPPED (2026-08-20).** Part of [scope-one-box](scope-one-box.md). Depends on [v1340](spec-v1340.md).
> MCP only. No tile added, no compute changed, nothing visible. Catalog stays **1,709**.

## Why

The MCP server exposes `search`, `describe`, and `run`. An agent that already knows the values —
because the user's question contained them — still has to make **three** round trips: search to
pick a tile, describe to learn its input keys, run to compute, re-typing values it had written out
itself.

If a large share of the ~20k/mo really is agent traffic, that is the single highest-leverage
change in this program. The website goes from 49 tiles of extraction to 1,331 in
[v1340](spec-v1340.md); agents should not be left on the old path.

And it is nearly free here: `mcp/catalog.mjs` already imports the renderers directly, so the same
extractor runs with **no data file at all**. `data/fields/` is the browser's copy, not the
server's.

## What it does

One new tool, `answer_query`, on the existing stdio server.

| Result | When |
|---|---|
| **an answer**, with `via: "registry"` | Ranked a tile, extracted values, computed. |
| **`MISSING_INPUTS`** | Names the calculator, the inputs it recovered, and the ones it still needs — **one round trip instead of three, even when it cannot answer.** |
| **`NO_VALUES`** | The query named a calculator but carried nothing computable. |
| **`NO_MATCH`** | Nothing matched. |

The answer carries the same rendered output strings `run` returns, so a unit-bearing display
string reaches the caller rather than a bare number.

## Not answering wrongly is the hard part

The ranker returns its best guess however weak. A first cut that trusts it will confidently point
at a calculator the caller never asked about — sophiewell's returned `crop-index` for *"what is the
meaning of life"*.

**A tile is only named when something corroborates it:** either the query yielded values for it, or
the query contains a **distinctive** word from its name — four characters or more, and not the
connective vocabulary a trade catalog shares everywhere. Build that noise list from the actual
catalog, not from intuition; in this catalog it will include at least `calculator`, `sizing`,
`load`, `size`, `flow`, `drop`, `rate`, `factor`, `index`, `chart`, `table`, `length`, `weight`.

## Measured

Every indexed tile's own worked example, re-phrased as a question and asked through
`answer_query`:

| | |
|---|---|
| Tiles asked | 1,330 |
| **Answered in ONE call** | **468 (35.2%)** |
| `MISSING_INPUTS`, naming what it recovered and what it needs | 641 (48.2%) |
| `NO_VALUES` / `NO_MATCH` | 221 |

**Read the second row as a success, not a shortfall.** It is still one round trip, and it comes
back with the recovered inputs and the missing ones named by their human labels — where the old
path needed `search` + `describe` + `run` and re-typing. The one-call rate is well under
sophiewell's 75.7% for a deliberate reason: [v1342](spec-v1342.md)'s requiredness derivation is
strict here (71.7% of fields), so a tile with one unrecovered required value reports it instead of
computing around it.

**15 of the 468 answered on a different tile than the one whose example generated the question**
(3.2%). These are near-siblings — the synthetic query names a tile and the ranker prefers a
close relative that also answers it. It is the same ambiguity [v1343](spec-v1343.md) handles in
the browser. It is **not silent**: every response carries `id` and `name`, so the caller is always
told exactly which calculator ran. That is the mitigation, and it is why this ships rather than
waiting.

## What shipped differently

- **It reads `data/fields/*.json`, the browser's own shards, rather than re-projecting
  `describe()`.** The plan said the server needs no data file because it holds the registry in
  memory. True, but the shards also carry v1342's `r` (required) flags, which a fresh projection
  would not — and reading them is what guarantees an agent and a person cannot disagree about what
  a tile needs. A missing shard still degrades to a `describe()` projection, minus requiredness.
- **Values are coerced at the boundary, and unfilled numerics are passed as explicit `null`.**
  Two bugs, one after the other. `queryFill` returns strings because it also feeds the DOM and the
  URL hash, and `ohms-law` counts how many of V/I/R/P it was handed with `Number.isFinite` — so a
  question that plainly supplied two values came back **"Provide any two of V, I, R, P."** Then,
  with numbers, it still derived nothing: the compute tests `out.V === null`, so an *undefined*
  key derives nothing at all. Both are how the browser already behaves (`Number(input.value)`, and
  every worked example in the repo spelling absence as `R: null`); this is the same convention
  applied at the same boundary. Selects and checkboxes are omitted rather than nulled, so their
  own defaults apply and `validateSelects` is never handed a null to reject.

## Gotchas

- **A converter is needed from `describe()`'s input descriptors to v1339 row shape.** The server
  holds `{key, label, kind, options, attrs}`; `queryFill` reads `{d, l, k, u, o}`. Put that
  converter in `query-fill.js` and export it, so browser and server share one projection and the
  unit-from-label rule cannot fork.
- **Selects accept numbers-as-strings.** `validateSelects` already normalizes `4` to `"4"` because
  seven tiles' own published worked examples record select inputs as numbers. Route
  `answer_query`'s inputs through the same `validateSelects` / `validateNumbers` path `run` uses —
  do not call the compute directly, or the enum strictness bug returns.
- **Do not swap `search()` for a raw `rankTools` call to get scores.** It builds its corpus
  differently and picks different tiles.
- Every safety rule in `queryFill` applies unchanged: unit families must agree, ambiguity fills
  nothing, and negation never asserts the positive.
- Register the tool in the manifest surfaces too — `mcp/README.md`, `scripts/agent-discovery.mjs`
  (`llms.txt` and `.well-known/mcp.json`). A tool the server answers but the manifest omits is
  invisible to the agents this spec exists for.
- Adding a tool changes the MCP tool count; check whether any gate or doc pins it.

## Proof

- MCP tests: a full-sentence trade query answers with `via: "registry"` and the correct number; a
  partial query returns `MISSING_INPUTS` naming both what it recovered and what it needs;
  a calculator named with no values returns `NO_VALUES`; and **nonsense returns `NO_MATCH`**, not
  a confident pointer at a tile.
- Determinism: the same query twice returns the same answer.
- A measurement in the commit: how many of the 1,709 tiles' own worked examples, re-phrased as
  queries, `answer_query` resolves in one call.
- `check-both-doors` (v1346) — 1,709 still runnable. This spec touches the MCP surface; that gate
  is what proves it did not break the door it is widening.
