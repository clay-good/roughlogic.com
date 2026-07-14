# roughlogic.com Specification v742 -- Clarifier Surface Area for a Target SOR (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`** (Group M),
> no new module, group, or dependency. Inherits spec.md through spec-v741.md. Explore sweep #13 (entry 8).
>
> **The gap, and the evidence for it.** The `clarifier-surface-loading` tile runs the loading check forward: from a
> surface area it returns the surface overflow rate. The design question is the inverse -- **how big a clarifier a target
> SOR needs** at the design flow. From `SOR = flow x 1e6 / area`, `area = flow x 1e6 / target_SOR`, plus the equivalent
> circular diameter. The number this settles: **1 MGD** at **800 gpd/ft^2** needs **1,250 ft^2** (about a **40 ft**
> diameter).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`clarifier-surface-loading` sibling: the flow carries the sibling's dimensionless MGD treatment, the target SOR is
dimensionless (gpd/ft^2), the returned area is `L^2` (ft^2), and the equivalent diameter is `L` (ft). It reuses the
sibling's surface-overflow-rate relation, solved for the area. The v18/v21 contract: any non-finite input, a non-positive
flow, or a non-positive target SOR returns `{ error }`. Citation discipline (v19/v22): the SOR relation solved for the
area, `GOVERNANCE.water` matching the sibling; the note gives the typical **700-1000 gpd/ft^2** design ceilings (lower for
a secondary clarifier carrying floc), says to **size below the limit for peak flow**, and notes that a separate weir and
solids check governs alongside, with the state primacy agency governing compliance.

## 2. The tile

### 2.1 `clarifier-area-for-loading` -- Clarifier Surface Area for a Target SOR

```
inputs:
  flow_mgd              dimensionless design flow (MGD, > 0)
  target_sor_gpd_ft2    dimensionless target surface overflow rate (gpd/ft^2, > 0)

required_area_ft2 = flow_mgd x 1e6 / target_sor_gpd_ft2
equiv_diameter_ft = sqrt( 4 x required_area_ft2 / pi )
```

**Pinned worked example.** flow = 1.0 MGD, target SOR = 800 gpd/ft^2:
`area = 1.0 x 1e6 / 800 = ` **1,250 ft^2**, diameter = sqrt(4 x 1250 / pi) = 39.9 ft. Feeding 1,250 ft^2 back through
`clarifier-surface-loading` at 1 MGD returns an 800 gpd/ft^2 SOR, the target. A tighter 700 gpd/ft^2 target grows the area
to 1,429 ft^2.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water"]`) placed in the later spec-v405 Group M section (past the exact-34
`// Group M`..`// Group N` audit block, beside `filter-area-for-loading`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (SOR relation solved for the area, `GOVERNANCE.water` matching the sibling);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`clarifier-area-for-loading` ->
`computeClarifierAreaForLoading`); `scripts/related-tiles.mjs` (-> `clarifier-surface-loading` / `detention-basin-volume`
/ `bod-tss-loading-removal`); `data/search/aliases.json` (5 collision-checked question aliases: "clarifier area for sor",
"how big a clarifier", ...); the calc-treatment `TREATMENT_RENDERERS` map entry via a hand-written renderer (two number
fields) and the id added to the calc-treatment declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the
round-trip through `computeClarifierSurfaceLoading` across a flow/SOR sweep, the lower-SOR-more-area and
higher-flow-more-area monotonicity, and the error seams. The calc-treatment.js gzip cap (raised to 26000 B in this spec)
covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count
1,190 -> 1,191.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 1,250 ft^2 for 1 MGD at 800
gpd/ft^2).

## 5. Roadmap position

Pairs the forward clarifier tile (`clarifier-surface-loading`, rate from the area) with its inverse (the area for a rate),
the two halves of the clarifier-sizing question. Continues Explore sweep #13; further Group M treatment growth stays
evidence-driven.
