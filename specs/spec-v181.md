# roughlogic.com Specification v181 -- Noncoincident Loads: Larger of Heating vs Air-Conditioning (NEC 220.60) (calc-service.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v179..v187 (electrician trade, second pass).** In-scope
> catalog expansion under the spec-v106 trades-only charter: one tile applying NEC 220.60, which lets a
> service/feeder load calculation omit the smaller of two loads that cannot operate at the same time --
> most commonly electric heat versus air-conditioning. Adds one tile to **`calc-service.js`** (Group
> A); no new module, group, or dependency. Inherits spec.md through spec-v178.md.
>
> **The gap, and the evidence for it.** Every dwelling and light-commercial service calc reaches the
> heat-vs-cooling line, where 220.60 permits counting only the larger because they are noncoincident.
> The catalog's load tiles never expose it, so the electrician either double-counts (oversizing the
> service) or applies the rule from memory. It is a one-line decision with real money attached and no
> tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The two
load inputs and the result are power (VA, carried dimensionless in VA); the omitted amount is the
smaller. The v18/v21 contract: any non-finite input, or a negative load, returns `{ error }`; there
are no divisions. Citation discipline (v19/v22): `GOVERNANCE.electrical`, edition `NEC 2023 220.60
(noncoincident loads)`, `editionNote` `NEC_DISCLOSURE`, with the note that the loads must be genuinely
incapable of simultaneous operation (a heat pump's compressor *plus* supplemental electric heat **can**
run together and is the documented exception -- those are added, not compared), and that the AHJ judges
whether two loads are truly noncoincident.

## 2. The tile

### 2.1 `noncoincident-load` -- 220.60 Larger-of Two Noncoincident Loads

```
inputs:
  load_a_va        VA   first noncoincident load (e.g. electric heat)
  load_b_va        VA   second noncoincident load (e.g. air-conditioning)
  both_can_run     dimensionless  0/1 -- set 1 for heat pump compressor + supplemental heat (add both)

if both_can_run == 1:
  counted_va = load_a_va + load_b_va         # exception: simultaneous operation -> add
else:
  counted_va = max(load_a_va, load_b_va)     # 220.60: count the larger, omit the smaller
omitted_va  = (both_can_run == 1) ? 0 : min(load_a_va, load_b_va)
```

**Pinned worked example.** Electric heat 9,000 VA versus air-conditioning 6,000 VA, which cannot run
together: `counted = max(9,000, 6,000) = 9,000 VA`, `omitted = 6,000 VA`. The service calc carries
9 kVA, not 15 kVA. **Cross-check (the exception).** A heat-pump compressor of 6,000 VA with 9,000 VA
of supplemental electric strip heat that energizes *with* the compressor: `both_can_run = 1` ->
`counted = 6,000 + 9,000 = 15,000 VA` (nothing omitted), because they are coincident. The AHJ judges
noncoincidence.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 220.60, the larger-of rule and the
simultaneous-operation exception named, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`noncoincident-load` -> `computeNoncoincidentLoad` in `../../calc-service.js`);
`scripts/related-tiles.mjs` (-> `service-load` / `hvac-equipment-circuit` / `commercial-lighting-load`);
`data/search/aliases.json` ("noncoincident", "220.60", "heat vs ac", "larger of", "omit smaller
load", "heat pump supplemental"); the id appended to the existing `SERVICE_RENDERERS` declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning the larger-of example, the simultaneous-operation exception, and error seams (non-finite,
load < 0). Raise the `calc-service.js` size cap by ~20 percent if needed (dated comment); bump the
`citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the exception path); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the counted
and omitted lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (9k vs 6k ->
9k counted, 6k omitted; exception -> 15k).

## 5. Roadmap position

Adds the noncoincident-load rule to the load family (`service-load`, `commercial-lighting-load`) and
ties to `hvac-equipment-circuit`. Further Group A growth stays evidence-driven.
