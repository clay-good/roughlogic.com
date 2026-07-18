# roughlogic.com Specification v918 -- Concrete Curing Compound Coverage (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v917.md. Concrete-finishing material-takeoff sweep,
> mirroring the accepted coverage/takeoff tiles (stucco-coverage, thinset-coverage, self-leveler-bags).
>
> **The gap, and the evidence for it.** The catalog has coverage takeoffs for stucco, thinset, self-leveler, and sealant
> but nothing for **curing compound**. Grep confirmed no curing-compound tile. Every slab pour ends with a membrane cure
> that has to be ordered. The number this settles: a 2,500 sf slab at one coat and 200 sf/gal takes **13 gal** (3 pails).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the sibling
coverage tiles: the slab area and coverage rate carry `L^2`, and the coats, waste, gallons, and pails are dimensionless.
The v18/v21 contract: a non-finite or non-positive slab area, coats, or coverage rate, or a negative waste, returns
`{ error }`. Citation discipline (v19/v22): the ASTM C309 coverage identity by name (gallons = ceil(area x coats /
coverage x (1 + waste)); pails = ceil(gallons / 5)), `GOVERNANCE.general`; the note states that coverage runs about 200
sf/gal but the product label governs, that a rough or tined finish, a second coat, and vertical faces all cut it, that
the compound is applied right after the surface bleed-water sheen leaves so the film seals the mix water in, and that a
dissipating-resin (Type 1-D) or white-pigmented (Type 2) compound is chosen per the job -- the product data sheet and the
spec govern the rate and the type.

## 2. The tile

### 2.1 `curing-compound-coverage` -- Concrete Curing Compound Coverage

```
inputs:
  slab_area_sf         slab area (sf)
  coats                number of coats (default 1)
  coverage_sf_per_gal  product coverage (sf/gal, default 200, label governs)
  waste_pct            overspray / waste (%, default 0)

gallons_exact  = slab_area_sf x coats / coverage_sf_per_gal x (100 + waste_pct)/100
gallons_needed = ceil(gallons_exact)
pails_5gal     = ceil(gallons_needed / 5)
```

**Pinned worked example.** 2,500 sf, 1 coat, 200 sf/gal, no waste:
`gallons = ceil(2500 x 1 / 200) = ceil(12.5) = ` **13 gal**; `pails = ceil(13/5) = ` **3**. Cross-check: a 3,200 sf slab
at 2 coats with 10% overspray is `ceil(3200 x 2 / 200 x 1.10) = ceil(35.2) = ` **36 gal** -- the second coat and the
overspray roughly triple the order over the single-coat case.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction"]`, beside `concrete-sawcut-footage`); a
`tile-meta.js` `_TILES` entry (`E`); a `citations.js` entry (ASTM C309 coverage, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the single-coat example plus the two-coat-with-waste cross-check, pinning the
gallons and pails); `test/fixtures/compute-map.js` (`curing-compound-coverage` -> `computeCuringCompoundCoverage`, module
`../../calc-concrete.js`); `scripts/related-tiles.mjs` (-> `concrete-evaporation-rate` / `concrete-strength-gain` /
`concrete`); `data/search/aliases.json` (5 collision-checked aliases: "curing compound coverage", "concrete curing
compound", "cure and seal coverage", "curing compound gallons", "membrane cure gallons"), then
`node scripts/build-alias-shards.mjs`; a `_simpleRenderer` in the `CONCRETE_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-concrete declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the exact and rounded gallons, the pails, the two-coat-with-waste case, and the error seams (non-positive area /
coats / coverage, negative waste, non-finite). The calc-concrete.js gzip cap is watched at build. Verify at build,
including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,366 -> 1,367.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(2500/200) -> 13 gal, 3 pails).

## 5. Roadmap position

Concrete-finishing material takeoff beside `concrete-sawcut-footage`, serving the concrete finisher / GC (concrete /
construction). Deliberately a material estimate; the product data sheet and the spec govern the rate and the compound
type. Stays evidence-driven. Continues the concrete-finishing takeoff sweep at 1 new spec (v918).
