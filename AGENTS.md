# AGENTS.md

Guidance for AI agents working in or with this repository. (Humans: see
[README.md](README.md); the MCP server has its own [mcp/README.md](mcp/README.md).)

## What this repo is

**roughlogic.com** is a static, offline-first site of **1,709 calculators** for the
trades (electrical, plumbing, HVAC, construction, restoration, and more) across
**57 calc modules**, plus a local, zero-cost **MCP server** that exposes every one
of them to an AI agent. US standards only. No AI at runtime. No hosted service —
the site serves static files and the MCP server runs on your machine over stdio.

## Use the calculators as an agent (the fast path)

The server is local, zero-dependency, Node 18+. Point any MCP client at it:

```sh
claude mcp add roughlogic -- node /absolute/path/to/roughlogic.com/mcp/server.mjs
```

Four tools, all read-only and safe to call freely:

- `search_calculators` — find a calculator by keyword and/or trade (no args → trade overview).
- `describe_calculator` — one tile's inputs (with select options, units, min/max), outputs, worked examples, citation, and any limitation banner.
- `run_calculator` — evaluate a tile; returns the raw result plus rendered outputs (units + display strings), range warnings, and the limitation banner.
- `run_calculators` — up to 50 `{ id, inputs }` calls in one request, for sweeps and comparisons.

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
| Tile id → renderer (for field schemas) | `test/fixtures/renderer-map.js` (generated from `app.js`) |
| Publisher-verified worked examples | `test/fixtures/worked-examples.json` |
| MCP server + catalog layer | `mcp/server.mjs`, `mcp/catalog.mjs` |

## How to add or change a calculator

Work is **spec-first**: write a numbered `specs/spec-vNNNN.md`, then implement. A
new tile touches several registries (`tools-data.js`, the compute module, the
`declare(...)` table in `app.js`, `compute-map.js`, a `worked-examples.json`
fixture) and must pass the CI gates (`npm run lint`, `npm test`, `npm run build`).
Run them locally before pushing. Match the surrounding module's style.

## The rules that bind an agent here

- **US standards only.** No metric-defaulted inputs.
- **Never reproduce copyrighted tables.** Cite the source and locator; take table values as inputs.
- **Verify every formula against a primary source** — not against a sibling tile.
- **No hosting.** The MCP server stays local stdio; the site serves only static files.
- **Work in a git worktree**, not directly on `main`.
