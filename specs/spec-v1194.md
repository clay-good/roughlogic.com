# roughlogic.com Specification v1194 -- AGENTS.md: The Repo-Level Agent Onboarding Guide (AGENTS.md, build -> dist/, 0 New Tiles)

> **Status: PROPOSED (2026-07-31). Platform spec, third and last of the "MCP full agent integration, part 3" series (v1192-v1194).**
> Spec-only session: no code lands with this file. No new tile, module, group, or dependency. Inherits spec.md
> through spec-v1193.md.
>
> **The gap, and the evidence for it.** v1188 gives a *browsing* agent a pointer (`dist/llms.txt`,
> `dist/.well-known/mcp.json`). But an agent that lands **inside the repo** -- a coding agent asked to add a
> calculator, wire the MCP server into a client, or use the catalog from a script -- has no map. The root
> `CLAUDE.md` is 20 lines about the OpenLore memory tool and nothing else; `mcp/README.md` covers installing the
> server but not the repo's shape, and it is one directory deep. There is no `AGENTS.md` -- the emerging
> cross-tool convention (Claude Code, Cursor, and others read it) for "how an agent works in this repository."
> The request is that this repo be *incredibly easy for an AI agent to use*; the one file every agent now looks
> for at the root is missing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

Documentation only. `AGENTS.md` is a hand-authored guide at the repo root; it authors no data and changes no
runtime. Where it states a count (tiles, tools) it is fed by the build the way the home lede and `llms.txt`
counts are, so the number cannot drift (mirror `check-readme-counts`). It complements, not duplicates, the
existing docs: `CLAUDE.md` keeps its OpenLore note, `mcp/README.md` keeps the install detail, and `AGENTS.md`
points at both rather than restating them (the planning-artifact discipline: point, do not repeat).

## 2. What AGENTS.md contains (AGENTS.md)

One page, skimmable, task-oriented -- what an agent needs and nothing more:

- **What this repo is:** a static, offline-first site of trades calculators (the exact tile count, gated) plus
  a local, zero-cost MCP server that exposes every one of them. US standards only; no AI at runtime; no hosted
  service.
- **Use the calculators as an agent (the fast path):** the one-line install
  (`claude mcp add roughlogic -- node mcp/server.mjs`), the four tools (`search` -> `describe` -> `run` /
  `run_calculators`), and the typical flow, pointing to `mcp/README.md` for client-specific config.
- **The repo map:** where the compute lives (`calc-*.js`), the single sources of truth
  (`tools-data.js`, `test/fixtures/compute-map.js`, `worked-examples.json`), and the MCP layer
  (`mcp/catalog.mjs`, `mcp/server.mjs`).
- **How to add or change a calculator:** the spec-first workflow (a numbered `specs/spec-vNNNN.md`), the
  registries a new tile touches, and the CI gates it must pass -- the guardrails that keep a change from
  breaking the catalog, stated so an agent does not have to rediscover them.
- **The rules that bind an agent here:** US standards only, no copyrighted tables reproduced, formulas verified
  against a primary source, and the no-hosting constraint (the MCP server stays local stdio).

## 3. Scope

A root guide and its discoverability. No new tile, no compute change, no protocol change, no new dependency. It
does not replace `CLAUDE.md` (OpenLore) or `mcp/README.md` (install); it is the front door that routes an agent
to the right one. It reproduces no copyrighted material.

## 4. Wiring

`AGENTS.md` is added at the repo root. The build copies it into `dist/` (so a browsing agent reaches it at
`/AGENTS.md`, next to the v1188 `llms.txt`), and `llms.txt` links it. A counts gate ties any tile/tool number in
`AGENTS.md` to the live catalog (extend `check-readme-counts` to cover the file). Tests: a build test asserting
`dist/AGENTS.md` exists and its stated tile count equals the catalog total; a link test asserting `llms.txt`
references `AGENTS.md`; and a doc-consistency check that the four tool names in `AGENTS.md` match the live
`tools/list` (reuse the v1191 golden surface). Cross-linked back to v1188 (the browsing-agent pointers this
joins at the repo level) and v1192/v1193 (the tool contract this guide points an agent to).
