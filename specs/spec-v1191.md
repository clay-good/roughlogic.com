# roughlogic.com Specification v1191 -- MCP Completeness Gate: Full-Catalog Reachability and a Golden Surface Manifest (test/, mcp/catalog.mjs, 0 New Tiles)

> **Status: PROPOSED (2026-07-31). Platform spec, third and last of the "MCP full agent integration, part 2" series (v1189-v1191).**
> Spec-only session: no code lands with this file. No new tile, module, group, dependency, or hosted service.
> Inherits spec.md through spec-v1190.md.
>
> **The gap, and the evidence for it.** The whole point of the MCP surface is that **every** tool a person can
> use in the browser is reachable by an agent. Nothing enforces that. v1184's gate checks a renderer's schema
> against its own compute params; v1188's pack-and-run checks the tarball boots and lists the current tool
> names. Neither asserts the end-to-end promise: that all 1,567 tiles actually `describe` and `run` over MCP,
> that every runnable tile's worked example evaluates without throwing, and that the exposed tool / resource /
> prompt surface is exactly the intended one. A tile added next week with a renderer that forgets `render.schema`,
> a compute that throws on its own example, or an id present in `tools-data.js` but missing from `compute-map.js`
> would degrade agent coverage **silently** -- the site would still build and the browser would still work. The
> completeness this series delivers has to be gated, or it decays.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

Test and CI only; no runtime change. The gate drives the existing catalog loader (`search`/`describe`/`run`,
plus the v1187 batch and the v1189/v1190 rendered-output and validation fields) exactly as an agent would, over
the real registries. It authors no data -- it asserts that what the browser exposes and what MCP exposes are the
same set. Runs under the existing node:test harness (`fail 0`; not `not ok`), serial where needed, consistent
with the repo's test conventions.

## 2. Full-catalog reachability (test/mcp-reachability.test.mjs)

One gate walks the entire live catalog through the MCP catalog layer and asserts, for every tile:

- `describe_calculator(id)` returns without throwing and carries `inputs` (v1184), `outputs` with `unit`
  (v1189), `citation` (v1185), and, where applicable, `limitation` (v1190).
- Every tile is `runnable` (compute-map parity is already true today; the gate pins it so a future
  non-runnable tile is a **conscious** carve-out, not an accident).
- `run_calculator(id)` with no inputs -- the worked-example fallback -- returns a `result` with no `error`, a
  populated `outputs[].display` (v1189), and `warnings: []` for the publisher-verified example (a verified
  example must sit inside its own field bounds; a warning here means the example or the `attrs` is wrong).
- The set of ids reachable over MCP equals the set of ids in `tools-data.js` -- no tile is exposed to people
  but hidden from agents, and none the reverse.

The walk reuses the batch path (v1187) so it is one bounded fan-out, not 1,567 imports, and reports any failing
id by name (no silent truncation -- if a subset is skipped for a known reason, it is listed).

## 3. Golden surface manifest (test/fixtures/mcp-surface.json, test/mcp-surface.test.mjs)

A checked-in golden file records the intended protocol surface: the tool names and their input-schema shape,
the advertised capabilities (`tools`, `resources`, `prompts` -- v1186), the resource URI templates, and the
prompt names and arguments. A gate boots the server in-process, calls `tools/list`, `resources/list`,
`resources/templates/list`, and `prompts/list`, and asserts the live surface equals the golden. Adding or
renaming a tool, capability, resource, or prompt then requires updating the golden in the same change -- the
surface can never drift from its spec, and a review sees the diff. This is the `resources`/`prompts` analogue of
the contract-baseline discipline the repo already uses for the browser.

## 4. Scope

Enforcement only. No new tile, no compute change, no protocol change, no new dependency. The gate does not
re-verify the numbers (the worked-example suite already does that against primary sources); it verifies
**reachability and surface**, the two things that make "every tool is exposed to agents" a guarantee instead of
a hope. It does not hit the network -- it drives the local catalog and the in-process server, honoring the
no-hosting constraint.

## 5. Wiring

`test/mcp-reachability.test.mjs` imports `catalog.mjs` and iterates `TOOLS`, using the v1187 `runMany` for the
example-run sweep; `test/mcp-surface.test.mjs` imports the server's handler (refactored to an importable
`handle`/`dispatch` if not already) and diffs against `test/fixtures/mcp-surface.json`. Both join the default
`npm test` run and the CI matrix. Tests (the gates are the tests): reachability asserts zero failing ids across
the catalog and set-equality of ids with `tools-data.js`; surface asserts the four `*/list` responses match the
golden byte-for-byte after canonical JSON ordering; and a deliberately broken fixture (an id removed from the
golden) is shown to fail, proving the gate bites. Cross-linked back to v1184 (`check-renderer-schema.mjs`, the
per-tile schema gate this completes at the catalog level) and v1188 (`pack-and-run`, the packaging gate this
complements with reachability).
