# spec-v1972.md -- Show the steps on the agent door

> **Status: PROPOSED (2026-10-19). Platform spec, no tile added. Part of [scope-product-expansion](scope-product-expansion.md). Extends roadmap pillar 3 of [spec-v106](spec-v106.md) section 7, landed for the website as [spec-v1964](spec-v1964.md), to the second of the three doors.** Catalog stays at **2,267**.

## What it does for you

An agent that runs a calculator through the local MCP server gets the raw result object and the rendered outputs. It does not get what the website shows under "Show the steps": the inputs as the compute received them, with their labels, and every intermediate number, captioned. An agent asked "why 7.45 V?" today has to invent the derivation. After this change `run_calculator`, `run_calculators` and `answer_query` return the same rows the panel draws, so the agent can quote them.

```
"steps": [
  { "section": "in",  "label": "Length one-way (ft)", "value": "150" },
  { "section": "in",  "label": "Current (A)",         "value": "20" },
  { "section": "out", "label": "Resistance per 1,000 ft (ohm)", "value": "1.24" },
  { "section": "out", "label": "Voltage drop (V)",    "value": "7.45" }
]
```

## Why it costs almost nothing

`stepRows(fields, params, r, humanize)` in steps-panel.js is already pure and already tested over the whole declarative catalog without a DOM (`steps-panel-guard.test.js`). The MCP catalog already loads each tile's field descriptors from the same `data/fields/<bucket>.json` shards the browser uses, and already runs the compute. The only missing pieces are a DOM-free home for `stepRows` and `stepNum` (they import `fmt` from ui-fields.js, which the server must not import) and one call per run.

## Rules

- `steps` is always present on a successful run: an array, empty for the 24 tiles spec-v1964 left without a panel (the no-input references, the Manual J worker, the multi-mode renderers) and for any hand-written renderer whose compute the door cannot caption. A compute error returns no `steps`.
- Rows are built from the field descriptors the door already advertises, so a select prints the option text the reader would have chosen, exactly as on the website. Captions come from `humanizeKey`; a key it cannot caption is left out, never guessed.
- Numbers are formatted by `stepNum` (thousands grouped since spec-v1962; 0.0104, 3.142, 26,180.4) so a step quoted by an agent matches the page.
- `describe_calculator` is unchanged. `answer_query` carries `steps` beside `outputs`; `run_calculators` carries them per entry.

## How it is built

| Piece | Change |
|---|---|
| `steps-rows.js` (new, no DOM) | `stepNum`, `stepRows`, and a copy-free `fmt` import path: `fmt` moves to `pure-math.js` or `steps-rows.js` re-exports it from a DOM-free module, and ui-fields.js imports it from there. |
| `steps-panel.js` | Imports from `steps-rows.js`; `drawSteps` and `domFields` stay. |
| `mcp/catalog.mjs` | `run()` calls `stepRows(fields, inputs, result, humanizeKey)` and attaches `steps`. |
| `mcp/server.mjs` | `outputSchema` of the three tools gains `steps`. |
| `test/fixtures/mcp-surface.json` | Regenerated. |
| `mcp/README.md`, `AGENTS.md` | One sentence each: the steps are the website's panel, row for row. |

## Proof

- `mcp-steps.test.js` runs every tile's worked example through the door and asserts: `steps` is an array; no value is `undefined`, `NaN` or `Infinity`; every `in` row's label is a field label of that tile; the set of tiles with empty `steps` equals the spec-v1964 exemption list, and growing it fails.
- Parity: for 50 evenly strided tiles, the rows the door returns equal the rows `stepRows` produces in the fake-DOM sweep for the same inputs.
- `check-both-doors` keeps asserting that nothing on the website door is absent from the agent door; the steps panel is added to its list.

## Not in v1

- A `steps` string rendered as prose. The rows are the contract; prose is the agent's job.
- Derivation text (the formula families in docs/derivations.md). An agent can already fetch `roughlogic://calculator/{id}` for the citation and formula line.
