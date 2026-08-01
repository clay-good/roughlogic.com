# roughlogic.com Specification v1187 -- MCP Batch Evaluation: `run_calculators` (mcp/catalog.mjs, mcp/server.mjs, 0 New Tiles)

> **Status: PROPOSED (2026-07-31). Platform spec, fourth of the five-part "MCP full agent integration" series (v1184-v1188).**
> Spec-only session: no code lands with this file. No new tile, module, group, dependency, or hosted service.
> Inherits spec.md through spec-v1186.md.
>
> **The gap, and the evidence for it.** `run_calculator` evaluates exactly one tile with one input set
> (mcp/catalog.mjs:196). The real agent tasks are plural: sweep a voltage-drop across five wire gauges,
> compare two accessible-parking layouts, re-run a load calc at three occupancy counts, or size a run and then
> check it against the neighbor tile v1185 pointed to. Each of those is N sequential `tools/call` round-trips
> today -- N times the latency and N times the token overhead of the tool envelope, for work that is
> embarrassingly parallel and already cheap (every compute is a pure function). One batch call collapses it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

A thin fan-out over the existing `run`. No new compute, no new data, no dependency. Bounded and total: one bad
item fails that item, not the batch, mirroring how the workflow layer treats a thrown item as `null` rather
than aborting the run.

## 2. The tool (mcp/server.mjs, mcp/catalog.mjs)

`run_calculators` (plural) accepts a `calls` array and evaluates each against the same catalog, reusing the
per-item logic of `run` (including the v1184 enum validation and the empty-inputs worked-example fallback):

```
run_calculators({ calls: [ { id, inputs }, ... ] })
  -> { count, results: [ { id, inputs, usedExample, result } | { id, error } ] }
```

- Cap `calls` at 50 per invocation; over the cap returns a tool error naming the cap (the same bounded-fan-out
  discipline the site uses everywhere -- no silent truncation).
- Module import stays cached across the batch (`modCache`), so a 20-gauge sweep imports the electrical module
  once.
- An item that throws (unknown id, invalid enum, bad numeric) becomes `{ id, error }` in place; the batch
  always returns `count` and a full-length `results` array.

## 3. Scope

Evaluation fan-out only. No new tile, no compute change, no cross-tile orchestration or dependency graph --
the agent composes multi-step work; this only removes the round-trip tax on the parallel parts. Single-tile
`run_calculator` stays, unchanged, as the common path.

## 4. Wiring

`catalog.mjs` gains `runMany({ calls })` that validates the cap, then maps each call through the existing
`run` in a try/catch, tagging failures with their `id`. `server.mjs` registers the `run_calculators` tool
with a `calls` array schema and dispatches to `runMany`. Tests: a batch of three ids returns three results in
order; an over-cap batch returns the cap error; a batch mixing one good id and one unknown id returns one
`result` and one `error`, with `count` equal to the input length; and a same-module sweep asserts a single
module import (import spy or cache-size check).
