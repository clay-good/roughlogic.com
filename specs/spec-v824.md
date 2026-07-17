# roughlogic.com Specification v824 -- Riprap Layer Volume and Tonnage (calc-earthwork.js, Group E, 1 New Tile)

> **Status: LANDED 2026-07-16 (package 0.398.0).** Executed against the live catalog (1,272 -> 1,273 tiles), beside
> the just-landed `riprap-d50` (spec-v823); riprap-d50's related-tiles updated to cross-reference this tile. Single-tile spec.
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v823.md. Erosion-control sweep (entry 3), the
> order-quantity companion to `riprap-d50`.
>
> **The gap, and the evidence for it.** `riprap-d50` sizes the stone but nothing takes off the **tonnage** to order for a
> riprap layer. Grep confirmed no riprap-tonnage tile, and `aggregate` has no layer-thickness rule. The number this
> settles: a 500 sf outlet apron at 2 ft thick is **37 cy** and about **82.5 tons** of quarried stone -- and because
> placed riprap carries voids, ordering by a lower placed density is what keeps the delivery from overshooting.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`aggregate`, `pipe-bedding-backfill`): the area carries `L^2`, the thickness `L`, the unit weight
`M L^-3`, the volume `L^3`, and the tonnage `M`. The v18/v21 contract: a non-finite or non-positive area, thickness, or
unit weight returns `{ error }`. Citation discipline (v19/v22): the layer take-off identity by name (tons = area x
thickness x unit weight / 2000; cy = area x thickness / 27), `GOVERNANCE.general`; the note states that the layer should
be at least 1.5 x D50 thick (from `riprap-d50`), that a solid-rock unit weight of about 165 pcf overstates the delivered
tonnage because placed riprap holds voids (a placed density near 120-135 pcf is closer for ordering), and that a filter or
bedding layer under the riprap is taken off separately.

## 2. The tile

### 2.1 `riprap-tonnage` -- Riprap Layer Volume and Tonnage

```
inputs:
  area_sf      plan area of the riprap layer (ft^2)
  thickness_ft layer thickness (ft; at least 1.5 x D50)
  unit_wt_pcf  stone unit weight (pcf, default 165 solid)

volume_cy = area_sf * thickness_ft / 27
tons      = area_sf * thickness_ft * unit_wt_pcf / 2000
```

**Pinned worked example.** Area 500 sf, thickness 2 ft, unit weight 165 pcf:
`volume = 500 * 2 / 27 = ` **37.0 cy**; `tons = 500 * 2 * 165 / 2000 = ` **82.5 tons**. Cross-check: ordering at a placed
density of 130 pcf (voids counted) drops the delivery to `500 * 2 * 130 / 2000 = ` **65 tons** -- order to the placed
density, not the solid rock, or the last few loads sit unused.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` earthwork block beside
`riprap-d50`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a `citations.js`
entry (tons = area x thickness x unit weight / 2000, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the
pinned example plus the placed-density cross-check); `test/fixtures/compute-map.js` (`riprap-tonnage` ->
`computeRiprapTonnage`, module `../../calc-earthwork.js`); `scripts/related-tiles.mjs` (-> `riprap-d50` / `aggregate` /
`stockpile-volume`); `data/search/aliases.json` (5 collision-checked aliases: "riprap tonnage", "riprap volume", "rock
armor tonnage", "riprap layer cy", "riprap order quantity"); a hand-written renderer in the `EARTHWORK_RENDERERS` map
mirroring `_v67renderHaulCycleProduction` (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-earthwork declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the volume and tonnage and the error seams
(non-positive area, thickness, unit weight). The calc-earthwork.js gzip cap is watched at build. Verify at build,
including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,272 -> 1,273.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(500 * 2 * 165 / 2000 -> 82.5 tons).

## 5. Roadmap position

Third erosion-control tile: the order quantity that follows `riprap-d50`'s sizing, serving the site / utility crew
(construction / surveying). Stays evidence-driven; the plan sets the layer thickness.
