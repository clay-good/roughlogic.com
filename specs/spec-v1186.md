# roughlogic.com Specification v1186 -- MCP Resources and Prompts (mcp/server.mjs, mcp/catalog.mjs, 0 New Tiles)

> **Status: PROPOSED (2026-07-31). Platform spec, third of the five-part "MCP full agent integration" series (v1184-v1188).**
> Spec-only session: no code lands with this file. No new tile, module, group, dependency, or hosted service.
> Inherits spec.md through spec-v1185.md.
>
> **The gap, and the evidence for it.** The server implements only the `tools/*` half of MCP (server.mjs:110,
> `tools/list` and `tools/call`). It advertises `capabilities: { tools: {} }` and nothing else. MCP clients
> also render **resources** (browsable, addressable content the user or agent can attach or read) and
> **prompts** (parameterized task templates the client surfaces in its prompt picker). Today an agent must
> already know the tool names and the id conventions to get anywhere; there is no in-client way to browse the
> catalog or start a common task. Both surfaces are pure reads over data the server already has, and both are
> what makes the server feel native inside a client rather than a raw JSON-RPC endpoint.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

Implements the standard MCP `resources/*` and `prompts/*` methods over the existing catalog loader. No new
data: resources are views of `TOOLS`, the retained descriptors (v1184), and the citations (v1185). DOM-free,
no dependency, stdio transport unchanged. `initialize` advertises the new capabilities alongside `tools`.

## 2. Resources (mcp/server.mjs, mcp/catalog.mjs)

- `resources/list` returns a small, stable set plus a per-trade index, not one resource per tile (the same
  restraint that made the tool surface three meta-tools, not 1,567):
  - `roughlogic://catalog` -- the trade overview with counts (the no-argument `search` result).
  - `roughlogic://trade/{trade}` -- the tile list for one trade.
- `resources/templates/list` advertises a URI template `roughlogic://calculator/{id}` so a client can address
  any single tile.
- `resources/read` on `roughlogic://calculator/{id}` returns the `describe_calculator` payload (inputs with
  options, outputs, worked example, citation) as JSON text -- the full card for one tile, attachable in a
  client without a tool round-trip.

## 3. Prompts (mcp/server.mjs)

`prompts/list` and `prompts/get` expose a few task templates that expand into a first message wired to the
tools:

- `find-calculator` (argument: `need`) -- "search the catalog for {need}, then describe the best match."
- `run-with-inputs` (arguments: `id`, `inputs`) -- "run {id} with {inputs} and cite the source."
- `size-and-check` (argument: `task`) -- the common trades pattern: search, pick, run the worked example,
  then re-run with the user's numbers and report against the code limit with its citation.

Templates are static strings with argument substitution -- no model call, no inference, consistent with the
site's standing "No AI at runtime" constraint.

## 4. Scope

Read-only protocol surfaces. No new tile, no compute change, no per-tile resource explosion. Prompts are
plain templates, not agents. The browser is untouched.

## 5. Wiring

`server.mjs` gains `resources/list`, `resources/templates/list`, `resources/read`, `prompts/list`, and
`prompts/get` cases beside the existing `tools/*` cases, and `initialize` advertises
`capabilities: { tools: {}, resources: {}, prompts: {} }`. `catalog.mjs` gains a `readResource(uri)` helper
that parses the `roughlogic://` scheme and dispatches to the existing `search`/`describe`. Tests: a
resources round-trip (`resources/list` then `resources/read` on a `calculator/{id}` URI returns that tile's
card); a prompts round-trip (`prompts/get` on `run-with-inputs` substitutes its arguments); and an
`initialize` assertion that all three capabilities are advertised. The smoke-test block in mcp/README.md gains
a resources/prompts line.
