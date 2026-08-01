# roughlogic.com Specification v1184 -- MCP Field Schemas: Expose the Renderer Descriptors (calc-*.js renderer factories, mcp/catalog.mjs, mcp/server.mjs, 0 New Tiles)

> **Status: PROPOSED (2026-07-31). Platform spec, first of the five-part "MCP full agent integration" series (v1184-v1188).**
> Spec-only session: no code lands with this file. This series makes the local, zero-cost MCP server expose
> everything the site already knows -- field schemas, citations, the MCP resource and prompt surfaces, batch
> evaluation, and a no-hosting install path -- so an AI agent can use the whole catalog as well as a person
> using the browser. No new tile, module, group, dependency, or hosted service; the server stays local stdio
> (see the no-hosting constraint carried in v1188). Inherits spec.md through spec-v1183.md.
>
> **The gap, and the evidence for it.** `describe_calculator` (mcp/catalog.mjs `describe`, `introspectInputs`)
> recovers a tile's inputs by parsing the compute function's parameter destructuring -- it gets **parameter
> names and defaults, and nothing else**. The valid values of a select field (`phase: "single" | "three"`,
> `material: "copper" | "aluminum"`), the unit each number is in, the human label, and the min/max/step the
> browser enforces all live in the `fields` arrays passed to the renderer factories in `calc-*.js` (e.g.
> `_simpleRenderer` in calc-elecdesign.js:32, which reads `spec.fields` with `kind`, `label`, `options`,
> `default`, and `attrs`). Those arrays are the site's single source of truth for the form, but the factory
> closes over `spec` and returns only a DOM render closure, so **none of it is readable from Node.** An agent
> therefore cannot construct a valid `run_calculator` call for any tile with an enum input without guessing or
> reverse-engineering the worked example. Retain the descriptor and expose it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v10 layer discipline applies: matching and catalog logic stays pure and DOM-free. The field descriptor
arrays are already static data (`{ key, label, kind, options, default, attrs }`); only the output `value`
closures need the DOM, and those are not read here. The MCP surface must never author field data -- it reads
what the browser reads, so agent and browser can never drift (the v589 principle, extended from search to
inputs). No CSP change, no new dependency (`package.json` stays empty).

## 2. Retain the descriptor (calc-*.js renderer factories)

Every renderer factory (`_simpleRenderer` and the hand-written siblings) attaches its normalized descriptor to
the render function it returns, as inert data the browser ignores:

```
render.schema = {
  inputs:  spec.fields.map(f => ({ key: f.key, label: f.label, kind: f.kind,
                                   options: f.options ?? null, default: f.default ?? null,
                                   attrs: f.attrs ?? null })),
  outputs: spec.outputs.map(o => ({ key: o.key, label: o.label })),
}
```

One line per factory. Modules that build renderers by hand expose the same `render.schema` shape. A
build-time gate (`check-renderer-schema.mjs`) asserts every runnable tile's renderer carries a `schema` whose
`inputs[].key` set exactly equals its compute function's destructured parameters -- reusing the
`introspectInputs` parser already in mcp/catalog.mjs as the cross-check, so a renderer and its compute cannot
drift.

## 3. Expose it (mcp/catalog.mjs, mcp/server.mjs)

`catalog.mjs` loads renderer modules the same lazy, cached way it already imports compute modules, via a
`renderer-map.js` fixture built from the `declare(...)` table in app.js (module, export name, tile ids) --
the mirror of `compute-map.js`.

- **`describe_calculator`** returns `inputs: [{ key, label, kind, options, default, attrs }]` (replacing the
  name-and-default-only list) and adds `outputs: [{ key, label }]`, so an agent learns every valid enum value,
  the unit in each label, and what each result key means before it calls.
- **`run_calculator`** validates any input whose field `kind` is `select` against that field's `options`, and
  on a mismatch returns a tool error that names the allowed values -- instead of silently coercing a bad enum
  and computing a wrong answer.

## 4. Scope

Inputs and outputs only. No change to any compute function, no new tile, no change to the browser form (the
retained descriptor is the same object the form already consumes). The `value` output closures are not read
over MCP -- structured results already come from `run_calculator`. All 1,567 tiles are runnable today
(compute-map parity), so there is no reference-tile carve-out.

## 5. Wiring

`renderer-map.js` fixture beside `compute-map.js`; `catalog.mjs` gains a `describeInputs(id)` reader that
imports the renderer module, reads `render.schema`, and degrades to the old `introspectInputs` path if a
tile's schema is somehow absent (defense, not expected). Tests: the `check-renderer-schema.mjs` parity gate;
a catalog test asserting a known enum tile (`voltage-drop`) reports its `phase` and `material` options; and a
`run_calculator` test asserting an out-of-set enum returns the allowed-values error. Cross-linked forward to
v1185 (the same retained descriptor carries `spec.citation` and `spec.example`).
