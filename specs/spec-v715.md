# roughlogic.com Specification v715 -- Grease Interceptor Flow Capacity (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v714.md. Sweep-10 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `grease-trap` tile sizes the interceptor volume from a peak flow.
> The service question is the inverse -- **given an in-place interceptor, what peak flow is it rated to serve**. From
> `volume = peak_flow x retention x loading`, `peak_flow = volume / (retention x loading)`. The number this settles: a
> **1,000-gal** interceptor at 30 min retention and 1.25 loading serves **~26.7 gpm** -- compare it to the connected
> sinks' DFU flow to catch an undersized unit.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the `grease-trap`
sibling: the volume is `L^3` (gal), the retention is `T` (min), the loading factor is dimensionless, and the returned
peak flow is `L^3 T^-1` (gpm). The v18/v21 contract: any non-finite input, or a non-positive interceptor volume,
retention, or loading factor returns `{ error }`. Citation discipline (v19/v22): the PDI G101 / IPC 1003 sizing relation
solved for the flow, `GOVERNANCE.plumbing` matching the sibling; the note states that **the result should be compared to
the drainage-fixture-unit peak flow of the connected sinks and dishwasher (if the fixtures deliver more, the interceptor
is undersized), the retention (commonly 30 min) and loading factor come from the code, and the AHJ and plumbing code
govern**.

## 2. The tile

### 2.1 `grease-interceptor-flow-capacity` -- Grease Interceptor Flow Capacity

```
inputs:
  interceptor_volume_gal   L^3           interceptor volume (> 0)
  retention_minutes        T             retention time (> 0, default 30)
  loading_factor           dimensionless loading factor (> 0, default 1.25)

peak_flow_gpm = interceptor_volume_gal / (retention_minutes x loading_factor)
```

**Pinned worked example.** volume = 1,000 gal, retention = 30 min, loading = 1.25: `peak_flow = 1000 / (30 x 1.25) = ` **26.7
gpm**; feeding 26.7 gpm back through `grease-trap` returns a 1,000-gal required volume, the input. A longer retention or a
higher loading factor means the same interceptor serves a lower flow.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`) placed beside `grease-trap` (Group B is un-audited); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (sizing relation solved for the flow, `GOVERNANCE.plumbing`
matching the sibling); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`grease-interceptor-flow-capacity` -> `computeGreaseInterceptorFlowCapacity`); `scripts/related-tiles.mjs` (-> `grease-trap`
/ `sanitary-dfu` / `septic-tank`); `data/search/aliases.json` (5 collision-checked question aliases, including the existing
"gpm rating for a grease interceptor" retargeted from the forward tile to this inverse -- it now answers the question
directly); the calc-plumbing `RENDERERS` map entry via a hand-written NON-exported renderer (three number fields; kept
un-exported so it is not a corpus function needing fuzzer-sentinel coverage) and the id added to the calc-plumbing declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeGreaseTrap` across a
volume/retention/loading sweep, the longer-retention-lower-flow monotonicity, and the error seams. The calc-plumbing.js
gzip cap is raised 66000 -> 70000 B (the module was at 97.6%; this queue adds two plumbing inverse tiles). Verify at build,
including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,163 -> 1,164.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 26.7 gpm for a 1,000-gal
interceptor).

## 5. Roadmap position

Pairs the forward sizing tile (`grease-trap`, volume from a flow) with its inverse (flow from an interceptor volume), the
two halves of the grease-interceptor question. Further Group B plumbing growth stays evidence-driven.
