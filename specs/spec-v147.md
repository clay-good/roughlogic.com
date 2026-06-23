# roughlogic.com Specification v147 -- Dry-Sponge Soot Cleaning Takeoff and Seal Coat (calc-restoration.js, Group D, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v146..v150.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one fire-damage restoration tile turning soot-affected surface area
> into the dry-chem sponges, labor hours, and odor-seal primer the cleaning phase consumes. Adds one
> tile to **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits spec.md
> through spec-v146.md.
>
> **The gap, and the evidence for it.** Once the structural call is made (v146), the first restoration
> action on dry smoke is dry sponging -- a chemical sponge lifts loose soot before any wet cleaning,
> and a fouled sponge stops working, so the count is driven by affected area and a per-sponge coverage.
> Production rate sets the labor, and a sealing primer over the cleaned substrate is the common
> odor-control follow. These are routine takeoff quantities for a fire estimate, yet the catalog --
> which has demolition takeoffs for water (v136, v144) -- has nothing for soot.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
affected surface area and the per-sponge coverage are `L^2`; the production rate is `L^2/T` (ft^2/hr);
labor is `T` (hours); the sealer volume is `L^3` (gallons, via an editable ft^2/gal primer rate); the
seal-coat flag is `dimensionless`. The 300 ft^2/gal primer coverage follows `standard-sizes.js`
convention and is editable. The v18/v21 contract: any non-finite input, or a non-positive area,
sponge coverage, or production rate returns `{ error }`; the divisions are by the guarded-positive
coverage and production rate. Citation discipline (v19/v22): `GOVERNANCE.general` over the dry-sponge
cleaning takeoff, by name; **the residue type governs the method** -- dry sponging is for dry smoke,
and protein, wet, or fuel-oil residues need wet cleaning instead, so `editionNote` names that scope.
This is a quantity screen, not a cleaning protocol.

## 2. The tile

### 2.1 `soot-cleaning-takeoff` -- Dry-Sponge Soot Cleaning and Seal Coat

```
inputs:
  affected_sf          L^2            soot-affected wall + ceiling area
  sponge_coverage_sf   L^2            area per dry chem sponge before fouling (default 100)
  production_sf_per_hr  L^2/T         dry-sponging production rate (default 150)
  seal_coat            dimensionless  odor-seal primer to follow, 0/1 (default 1)
  primer_sf_per_gal    L^2            primer coverage (default 300)

dry_sponges  = ceil(affected_sf / sponge_coverage_sf)
labor_hours  = affected_sf / production_sf_per_hr
sealer_gal   = seal_coat ? affected_sf / primer_sf_per_gal : 0
```

**Pinned worked example.** 1,200 ft^2 of dry-smoke-affected surface, 100 ft^2/sponge, 150 ft^2/hr,
sealing: `dry_sponges = ceil(1200/100) = 12`; `labor = 1200/150 = 8.0 hr`; `sealer = 1200/300 = 4.0
gal`.
**Cross-check (heavy soot costs more on every line).** Heavier soot fouls sponges at 60 ft^2 and
slows production to 100 ft^2/hr: `dry_sponges = ceil(1200/60) = 20`; `labor = 1200/100 = 12.0 hr`;
sealer unchanged at 4.0 gal. The residue type governs the method; this sizes the dry-sponge quantity.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the dry-sponge takeoff and the 300 ft^2/gal primer,
`editionNote` naming ANSI/IICRC S700 fire and smoke restoration, the residue-type-governs caveat, and
the quantity-only scope); `test/fixtures/worked-examples.json` (example + cross-check);
`test/fixtures/compute-map.js` (`soot-cleaning-takeoff` -> `computeSootCleaningTakeoff` in
`../../calc-restoration.js`); `scripts/related-tiles.mjs` (-> `char-depth-capacity` /
`antimicrobial-coverage` / `ppe`); `data/search/aliases.json` ("soot cleaning", "dry sponge",
"chem sponge", "smoke residue", "odor seal", "fire cleanup labor"); the id appended to the existing
`RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check, the no-seal branch, and
error seams (non-finite, area/coverage/production <= 0). Raise the `calc-restoration.js` size cap by
~20 percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the no-seal branch); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the sponges,
labor, and sealer lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (1,200
ft^2 / 100 / 150 -> 12 sponges, 8.0 hr, 4.0 gal).

## 5. Roadmap position

Adds the cleaning-phase takeoff between the fire structural assessment (v146) and deodorization (v148),
mirroring the water demolition takeoffs. Further Group D growth stays evidence-driven.
