# roughlogic.com Specification v1192 -- MCP Structured Tool Output: `outputSchema` and `structuredContent` (mcp/server.mjs, mcp/catalog.mjs, 0 New Tiles)

> **Status: PROPOSED (2026-07-31). Platform spec, first of the three-part "MCP full agent integration, part 3" series (v1192-v1194) -- protocol conformance and repo onboarding.**
> Spec-only session: no code lands with this file. No new tile, module, group, dependency, or hosted service;
> the server stays local stdio (the no-hosting constraint carried in v1188). Inherits spec.md through spec-v1191.md.
>
> **The gap, and the evidence for it.** Every tool result is returned as a single blob of text:
> `content: [{ type: "text", text: JSON.stringify(data, null, 2) }]` (mcp/server.mjs:116). The agent gets a
> **string it has to re-parse**, with no declared shape to validate against. The MCP protocol added structured
> tool output for exactly this: a tool may declare an `outputSchema` (JSON Schema for its result) and return a
> `structuredContent` object the client validates and hands to the model as typed data. The server declares no
> `outputSchema` on any tool and returns no `structuredContent`. v1189 gave the *result* real structure
> (`outputs[].value/unit/display`); v1192 makes that structure a **declared, machine-validated contract** at the
> protocol layer instead of a JSON string the agent parses by hope.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

Protocol-layer only, over the data v1184-v1190 already assemble. Backward compatible: a tool that declares
`outputSchema` must also return the same data as text `content` for clients that predate structured output
(the spec keeps both), and `structuredContent` is additive -- older clients ignore it. The server continues to
echo the client's negotiated `protocolVersion` (mcp/server.mjs:100); `structuredContent` is emitted regardless,
since it is inert to a client that does not read it. No new dependency, DOM-free.

## 2. Declare `outputSchema` per tool (mcp/server.mjs)

Each of the four tools (`search_calculators`, `describe_calculator`, `run_calculator`, `run_calculators` -- the
last from v1187) gains an `outputSchema` describing its result:

- `search_calculators` -> `{ total, returned, results: [{ id, name, group, trades, desc }] }` (or the
  no-argument trade-overview shape).
- `describe_calculator` -> the full card: `inputs[]` (v1184), `outputs[]` with `unit` (v1189), `citation`
  (v1185), `limitation` (v1190), `example`.
- `run_calculator` -> `{ id, inputs, usedExample, result, outputs: [{ key, label, value, unit, display }],
  warnings: [], limitation }` (v1189/v1190).
- `run_calculators` -> `{ count, results: [ <run result> | { id, error } ] }`.

The schemas are authored once beside the input schemas already in `TOOLS`, and are the same shapes the
catalog layer returns -- a golden-manifest gate (v1191) pins them so a result that stops matching its declared
`outputSchema` fails the build.

## 3. Return `structuredContent` (mcp/server.mjs)

`tools/call` returns both, so no client regresses:

```
reply(id, {
  content:          [{ type: "text", text: JSON.stringify(data, null, 2) }],  // unchanged fallback
  structuredContent: data,                                                    // NEW: the typed object
});
```

A failed `tools/call` keeps the existing tool-level error shape (`isError: true`), unchanged.

## 4. Scope

Protocol conformance only. No new tile, no compute change, no change to the numbers or the browser. The
structured object is the object the catalog layer already builds; this declares its schema and ships it in the
protocol's structured channel. No hosted endpoint -- the local server gains the declaration, nothing else.

## 5. Wiring

`server.mjs` adds an `outputSchema` to each `TOOLS` entry and includes `structuredContent: data` in the
`tools/call` reply; `catalog.mjs` is unchanged (it already returns the objects the schemas describe). Tests: a
`tools/list` assertion that every tool declares an `outputSchema`; a `tools/call` assertion that
`run_calculator` returns `structuredContent` whose shape validates against the declared schema (a tiny inline
validator over the schema's `required`/`properties`, no dependency); an assertion that the text `content`
fallback is still present and equal to `JSON.stringify(structuredContent)`; and a v1191 golden-manifest update
folding the four `outputSchema` shapes into the pinned surface. Cross-linked back to v1189 (the structured
result this declares) and forward to v1193 (tool annotations complete the tool-declaration metadata).
