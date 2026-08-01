# roughlogic.com Specification v1185 -- MCP Citation and Scope Surface (mcp/catalog.mjs, mcp/server.mjs, 0 New Tiles)

> **Status: PROPOSED (2026-07-31). Platform spec, second of the five-part "MCP full agent integration" series (v1184-v1188).**
> Spec-only session: no code lands with this file. Builds directly on v1184's retained renderer descriptor.
> No new tile, module, group, dependency, or hosted service. Inherits spec.md through spec-v1184.md.
>
> **The gap, and the evidence for it.** `describe_calculator` folds the source into a single joined string
> (`ex.source_publisher -- ex.source_title -- ex.source_section_or_page`, mcp/catalog.mjs:191) and stops
> there. The browser shows more next to every result: the tile's **citation text** (the cited code section and
> formula, set on `citationEl` from `spec.citation`), its **scope note** (what the tile deliberately does not
> check -- the "self-declared gap" that recurs across the catalog), and its **related tiles** (the cross-links
> every spec authors, e.g. `ramp-detail-check` -> `ada-ramp-slope`, `handrail-geometry`). An agent that runs a
> calculation cannot attribute the result to a standard, cannot see the tile's stated limits, and cannot
> navigate to the neighbor tile that covers what this one skips. All three already exist as data; expose them
> as structured fields, not prose.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

Read-only over existing data; author nothing new. The citation text comes from the retained descriptor
(`spec.citation`, exposed alongside `render.schema` per v1184), the source triple from
`worked-examples.json`, and the related-tile ids from the tile's cross-links (the same ids the spec's Wiring
section lists; already present in the tile metadata used to render "related" in the browser). DOM-free, no
new dependency.

## 2. Structured citation on `describe_calculator`

`describe_calculator` replaces the single joined `source` string with a `citation` object and keeps the flat
string as a compatibility alias:

```
citation: {
  text:      spec.citation,              // the cited section + formula shown in the browser
  publisher: ex.source_publisher,        // e.g. "2010 ADA Standards for Accessible Design"
  title:     ex.source_title,
  locator:   ex.source_section_or_page,  // e.g. "405.3, 405.5"
}
scope_note: spec.scope ?? null           // the tile's self-declared limits, when present
related:    [{ id, name }]               // cross-linked neighbor tiles, resolved to names
```

`run_calculator` gains an optional `include: ["citation"]` flag so an agent can get the result and its
attribution in one call when it intends to cite the number.

## 3. Scope

Attribution and navigation metadata only. No change to compute, to the numbers, or to the browser. This does
not add citations to tiles that lack them (the field degrades to `null`); it surfaces what is already
authored. It does not reproduce copyrighted tables -- the `citation` object names the source and locator, the
same publisher-and-section reference the site already shows, never the table contents.

## 4. Wiring

`catalog.mjs` reads `spec.citation` and `spec.scope` from the retained descriptor (v1184) and the source
triple from the loaded examples map; a `related` resolver maps cross-link ids through `byId` to `{ id, name }`
and drops any dangling id (spec related-ids can point at never-landed tiles -- see the restoration-batch
note). Tests: a citation test asserting a known tile (`ramp-detail-check`) reports its ADA locator and its
related neighbors; a degradation test asserting a citation-less tile returns `citation.text: null` without
error; and an assertion that `related` never contains an id absent from the catalog.
