# roughlogic.com Specification v1193 -- MCP Tool Annotations and the Full Example Gallery (mcp/server.mjs, mcp/catalog.mjs, 0 New Tiles)

> **Status: PROPOSED (2026-07-31). Platform spec, second of the three-part "MCP full agent integration, part 3" series (v1192-v1194).**
> Spec-only session: no code lands with this file. No new tile, module, group, dependency, or hosted service.
> Inherits spec.md through spec-v1192.md.
>
> **The gaps, and the evidence for them.** (1) The tools carry a `name`, `description`, and `inputSchema` and
> nothing more (mcp/server.mjs:30-67). The MCP protocol defines tool **annotations** -- `readOnlyHint`,
> `idempotentHint`, `destructiveHint`, `openWorldHint`, `title` -- behavioral hints a client uses to decide
> whether a tool is safe to call without a confirmation prompt, safe to retry, and safe to call in parallel.
> Every roughlogic tool is a pure read over a local catalog: read-only, idempotent, non-destructive, closed-world.
> The server tells the client none of that, so a cautious client gates every call behind a human. (2)
> `describe_calculator` returns exactly **one** worked example -- the catalog keeps only the first of a tile's
> example rows (mcp/catalog.mjs:38-41: "a tile can have several rows; the first is representative"). Tiles that
> ship several examples (a straight pull and an angle pull; copper and aluminum) hand the agent one and hide the
> rest, so the agent sees a narrower slice of valid usage than the test suite verifies.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

Metadata-only, over data that already exists. The annotations are static truths about these tools, not new
behavior; the additional examples are already in `worked-examples.json` (the catalog simply stops reading after
the first row). No new dependency, DOM-free, stdio unchanged.

## 2. Tool annotations (mcp/server.mjs)

Each tool gains the accurate annotation set:

```
annotations: {
  title:          "Search calculators" | "Describe calculator" | "Run calculator" | "Run calculators",
  readOnlyHint:   true,   // no state is written anywhere
  idempotentHint: true,   // same inputs -> same result (pure compute over a static catalog)
  destructiveHint:false,
  openWorldHint:  false,  // the catalog is closed and local; no external entities are touched
}
```

These are true for all four tools (v1187's `run_calculators` included). A client that honors annotations can
then auto-approve the calls, retry safely, and fan them out -- which is the whole point of a calculator server:
the agent should be able to run a hundred evaluations without a hundred confirmation prompts.

## 3. The full example gallery (mcp/catalog.mjs)

The catalog keeps **all** example rows for a tile, not just the first, and `describe_calculator` returns them:

```
examples: [
  { inputs: { pull_type: "straight", ... }, outputs: { ... }, source: "NEC 314.28(A)(1) ..." },
  { inputs: { pull_type: "angle",    ... }, outputs: { ... }, source: "NEC 314.28(A)(2) ..." },
]
example: examples[0]   // retained as a compatibility alias for the single-example callers
```

Each entry carries the same publisher-verified inputs/outputs/source the suite pins, so an agent can read the
full range of intended use -- every enum branch a tile's authors thought worth demonstrating -- before it
composes its own call. `run_calculator` with no inputs still falls back to `examples[0]` (v1184 behavior,
unchanged).

## 4. Scope

Tool metadata and example exposure only. No new tile, no compute change, no protocol method added (annotations
ride `tools/list`; the gallery rides `describe_calculator`). The annotations assert what is already true; the
gallery surfaces rows already authored and tested. No hosted endpoint.

## 5. Wiring

`server.mjs` adds the `annotations` block to each `TOOLS` entry; `catalog.mjs` changes the example map from
"first row" to "all rows per id" and `describe` returns `examples[]` (plus the `example` alias). Tests: a
`tools/list` assertion that all four tools declare `readOnlyHint: true` and `destructiveHint: false`; a
describe assertion that a multi-example tile (`pull-box-sizing`, straight and angle) returns both rows in
`examples`; an assertion that `example` still equals `examples[0]`; and a v1191 golden-manifest update folding
the annotations into the pinned surface. Cross-linked back to v1192 (annotations complete the tool declaration
that `outputSchema` began) and forward to v1194 (the repo-level agent guide points at these tools).
