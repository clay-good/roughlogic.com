# roughlogic.com Specification v1189 -- MCP Rendered Outputs: Units, Display, and Verdict (calc-*.js renderer factories, mcp/catalog.mjs, mcp/server.mjs, 0 New Tiles)

> **Status: PROPOSED (2026-07-31). Platform spec, first of the three-part "MCP full agent integration, part 2" series (v1189-v1191) that completes the surface v1184-v1188 opened.**
> Spec-only session: no code lands with this file. No new tile, module, group, dependency, or hosted service; the
> server stays local stdio (the no-hosting constraint carried in v1188). Inherits spec.md through spec-v1188.md.
>
> **The gap, and the evidence for it.** v1184 exposed the input side -- field schemas, enum options, output
> *labels*. The output side is still raw. `run_calculator` returns the compute function's return object verbatim
> (mcp/catalog.mjs:212): `{ governing: 24, straight_min: 24, ... }`. But the number a user reads is
> `"24.0 in (straight pull)"` -- the **unit**, the **formatting**, and any inline **verdict** live only in the
> renderer's output `value` closures (`calc-elecdesign.js:106`, `(r) => fmt(r.governing, 1) + " in (...)"`).
> v1184 §4 deliberately did not read those closures. So an agent that runs a code-check gets `governing: 24`
> with **no unit** and no idea whether 24 passes or fails -- the two things the browser puts in front of a
> person. Those closures are already **pure functions of the compute result** (no DOM, no globals); they can be
> retained and evaluated in Node to produce the exact string the site shows.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

Read-only over existing data, extending v1184's retained descriptor from inputs to outputs. The output `value`
formatters in every `_simpleRenderer` and its hand-written siblings are already pure (`r => ...` over the
compute result, using `fmt` from ui-fields.js); v1189 retains them and marks their purity, it does not author
new copy. The MCP surface renders what the browser renders -- agent and browser can never drift (the v589
principle, now closed on the output side). DOM-free, no new dependency.

## 2. Retain the output formatter and unit (calc-*.js renderer factories)

v1184 already retains `render.schema.outputs = [{ key, label }]`. v1189 widens each output descriptor to carry
the unit and the pure formatter that produce the displayed string:

```
outputs: spec.outputs.map(o => ({
  key:    o.key,
  label:  o.label,
  unit:   o.unit ?? null,      // structured unit when the descriptor declares one
  format: o.value,             // the existing pure (r) => string closure, retained as-is
}))
```

No new formatting is written: `o.value` is the closure the browser already calls. A build-time gate
(`check-output-purity.mjs`) statically asserts every retained `format` closure references only its `r`
parameter and the shared `fmt` helper -- no `document`, no free identifiers -- so evaluating it in Node is
proven safe before it ships. Descriptors whose unit is embedded in the format string (the common case) are
left as-is; `unit` is populated only where a tile already declares a discrete unit token.

## 3. Expose it (mcp/catalog.mjs, mcp/server.mjs)

`run_calculator` (and, via v1187, `run_calculators`) returns, alongside the raw `result`, a rendered view keyed
by output:

```
outputs: [
  { key: "governing", label: "Minimum box dimension", value: 24, unit: "in",
    display: "24.0 in (straight pull)" },   // display = format(result)
  ...
]
```

- `value` is the raw number from `result` (unchanged, still authoritative for further computation).
- `display` is `format(result)` -- the byte-identical string the browser paints -- computed by evaluating the
  retained pure formatter against the run result.
- `unit` is the discrete unit when declared, else `null`.
- Any output the tile treats as a verdict or note (the trailing `note`/verdict outputs some tiles already
  emit, e.g. `calc-elecdesign.js:110`) is surfaced through the same `display`, so the agent sees the pass/fail
  language a person sees.

`describe_calculator` gains the same `unit` on its `outputs` entries so an agent knows the result units before
it runs.

## 4. Scope

Output presentation only. No change to any compute function, no change to the numbers, no change to the browser
form (the retained formatter is the same closure the form already calls). This does not invent units for tiles
that lack them (`unit` degrades to `null`; `display` still renders via the format closure). It does not
reproduce copyrighted tables -- it formats the tile's own computed result.

## 5. Wiring

`renderer-map.js` (introduced by v1184) already resolves each tile to its renderer module; `catalog.mjs` reads
`render.schema.outputs` and, for each, evaluates `format(result)` inside a try/catch (a throwing or impure
formatter degrades to `display: null` with the raw `value` intact -- defense, not expected, since the purity
gate blocks impure formatters at build). Tests: the `check-output-purity.mjs` gate; a catalog test asserting a
known tile (`pull-box-sizing`) reports `display: "24.0 in (straight pull)"` and `unit`/`value` for its governing
output; a parity test asserting the MCP `display` string equals what the browser renderer produces for the same
worked example (shared fixture, so the two cannot drift); and a degradation test asserting a formatter-less
output returns `display: null` without error. Cross-linked back to v1184 (inputs) and forward to v1190 (the same
run path gains input validation and limitation banners).
