# AGENTS.md

Guidance for AI agents working in or with this repository. (Humans: see
[README.md](README.md); the MCP server has its own [mcp/README.md](mcp/README.md).)

## What this repo is

**roughlogic.com** is a static, offline-first site of **1,843 calculators** for the
trades (electrical, plumbing, HVAC, construction, restoration, and more) across
**61 calc modules**, plus a local, zero-cost **MCP server** that exposes every one
of them to an AI agent. US standards only. No AI at runtime. Calculator execution
is local; the only hosted write path is the bounded, user-initiated D1 feedback
endpoint, and the MCP server runs on your machine over stdio.

## Use the calculators as an agent (the fast path)

The server is local, zero-dependency, Node 18+. Point any MCP client at it:

```sh
claude mcp add roughlogic -- node /absolute/path/to/roughlogic.com/mcp/server.mjs
```

Five tools, all read-only and safe to call freely:

- `search_calculators` -- find a calculator by keyword and/or trade (no args → trade overview).
- `describe_calculator` -- one tile's inputs (with select options, units, min/max), outputs, worked examples, citation, and any limitation banner.
- `run_calculator` -- evaluate a tile; returns the raw result plus rendered outputs (units + display strings), range warnings, and the limitation banner.
- `answer_query` -- a plain-language question with its numbers in it, answered in one call. Use it instead of chaining search + describe + run when the question already carries its values. The 21 tiles that take no inputs at all (OSHA Top-10, the knot and hand-signal references) answer from their own content, so asking one by name returns the table rather than a request for values. Every other tile refuses: a question that names a calculator but carries no numbers gets `NO_VALUES` and a pointer to `describe_calculator`, never an answer computed from the tile's own defaults.
- `run_calculators` -- up to 50 `{ id, inputs }` calls in one request, for sweeps and comparisons.

Typical flow: `search_calculators` → `describe_calculator` → `run_calculator`. The
server also serves MCP resources (`roughlogic://catalog`, `roughlogic://trade/{trade}`,
`roughlogic://calculator/{id}`) and prompts (`find-calculator`, `run-with-inputs`,
`size-and-check`). See [mcp/README.md](mcp/README.md) for client-specific config.

## The repo map

| What | Where |
| --- | --- |
| Compute functions **and** renderers | `calc-*.js` (one module per trade group) |
| Tile registry (id → name, group, trades) | `tools-data.js` |
| Tile id → compute function | `test/fixtures/compute-map.js` |
| Tile id → renderer (for field schemas) | `test/fixtures/renderer-map.js` (generated from `tool-modules.js`) |
| Publisher-verified worked examples | `test/fixtures/worked-examples.json` |
| MCP server + catalog layer | `mcp/server.mjs`, `mcp/catalog.mjs` |
| Shared calculator report UI | `report-feedback.js` |
| Defensive report Worker + D1 | `report-worker.mjs`, `migrations/` |

## How to add or change a calculator

Work is **spec-first**: write a numbered `specs/spec-vNNNN.md`, then implement. A
new tile touches several registries (`tools-data.js`, the compute module, the
`declare(...)` table in `tool-modules.js`, `compute-map.js`, a `worked-examples.json`
fixture) and must pass the CI gates (`npm run lint`, `npm test`, `npm run build`).
Run them locally before pushing. Match the surrounding module's style.

Every calculator has three mandatory doors: website rendering, local MCP
description/execution, and the shared **Report a problem** path. New tiles inherit
reporting through `renderToolView`; never bypass, hide, fork, or replace that
shared control. `scripts/check-feedback-loop.mjs` enforces the repository-level
mount, API, D1 migration, and documentation standard.
Any identity, contact, address, credential, payment, or other private/free-prose
control must set `data-report-sensitive="true"`. Private controls must never be
serialized into URL state, report inputs, or derived output snapshots.

## The rules that bind an agent here

- **US standards only.** No metric-defaulted inputs.
- **Never reproduce copyrighted tables.** Cite the source and locator; take table values as inputs.
- **Verify every formula against a primary source** -- not against a sibling tile.
- **No hosted calculator or AI runtime.** The MCP server stays local stdio; only
  the spec-v1348 feedback endpoint may write remotely, and it must remain bounded,
  Turnstile-protected, data-minimized, and fail-closed.
- **Work in a git worktree**, not directly on `main`.
