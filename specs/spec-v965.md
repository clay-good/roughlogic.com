# roughlogic.com Specification v965 -- Frost Penetration Depth (Stefan / Modified Berggren) (calc-geotech.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v964.md. Foundation / footing sweep, beside the
> accepted `soil-phase-relations` and `soil-bearing-capacity` tiles.
>
> **The gap, and the evidence for it.** The catalog has bearing, settlement, and slope tiles, but nothing on FROST depth
> -- the physics behind a footing's frost-protection embedment. Grep confirmed no frost / Stefan / Berggren / freezing-
> index tile (the "frost" hits are wind-chill frostbite and gas-cylinder frosting). The number this settles: a 15%-water
> soil in a 2,000 F-day climate reaches a Stefan depth of about **6.7 ft**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, mixing F-days, BTU units, and feet), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive freezing
index / conductivity / density / water content, or a lambda outside (0,1] returns `{ error }`. Citation discipline
(v19/v22): the Stefan / modified-Berggren method by name (US Army Corps / FHWA), `GOVERNANCE.general`; the note stresses
that Stefan over-predicts (it ignores soil heat capacity) so the Berggren lambda (~0.6-0.9, off the nomograph) corrects
it, that a DRIER soil freezes DEEPER, and -- critically -- that this computes the PHYSICS, not the code frost line: the
footing depth is set by the jurisdictional frost depth (IRC Table R301.2 / amendment), the geotech report, and the AHJ.

## 2. The tile

### 2.1 `frost-depth-berggren` -- Frost Penetration Depth (Stefan / Modified Berggren)

```
inputs:
  freezing_index_f_days    air-freezing index FI (F-days), default 2000
  frozen_conductivity_btu  frozen soil conductivity kf (BTU/hr-ft-F), default 1.0
  dry_density_pcf          dry density (pcf), default 100
  water_content_pct        water content (percent), default 15
  berggren_lambda          modified-Berggren coefficient lambda (0-1, ~0.8), default 0.8

volumetric_latent_heat_btu_ft3 = 144 x dry_density_pcf x (water_content_pct / 100)
stefan_depth_ft   = sqrt(48 x frozen_conductivity_btu x freezing_index_f_days / L)
berggren_depth_ft = berggren_lambda x stefan_depth_ft
```

**Pinned worked example.** FI 2,000 F-days, kf 1.0, 100 pcf, 15% water, lambda 0.8: `L = 144 x 100 x 0.15 = ` **2,160
BTU/ft^3**, `Stefan = sqrt(48 x 1 x 2000/2160) = ` **6.67 ft**, `Berggren = 0.8 x 6.67 = ` **5.33 ft**. Cross-check: a
drier soil (**8% water**) has a smaller L (1,152), so frost drives DEEPER, to `sqrt(48 x 2000/1152) = ` **9.13 ft**.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`, before `soil-phase-relations`); a `tile-meta.js` `_TILES`
entry (`E`); a `citations.js` entry (Stefan/Berggren, Army Corps/FHWA, `GOVERNANCE.general`); `test/fixtures/worked-
examples.json` (the base example plus the drier-soil cross-check, pinning L, Stefan, and Berggren); `test/fixtures/
compute-map.js` (`frost-depth-berggren` -> `computeFrostDepthBerggren`, module `../../calc-geotech.js`); `scripts/
related-tiles.mjs` (-> `soil-phase-relations` / `soil-bearing-capacity` / `footing-area`); `data/search/aliases.json` (5
collision-checked aliases: "frost depth", "frost penetration", "freezing index", "frost line depth", "berggren frost"),
then `node scripts/build-alias-shards.mjs`; the tile is rendered by the `_simpleRenderer` factory in the
`GEOTECH_RENDERERS` map, and the id added to the calc-geotech declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning L / Stefan / Berggren, the Berggren-below-Stefan relation, the drier-soil-deeper and colder-climate-sqrt
directions, and the error seams. The calc-geotech.js gzip cap and the Group E group shell are watched at build. Home tile
count 1,413 -> 1,414.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(FI 2000 / kf 1 / 100 pcf / 15% / 0.8 -> 6.67 ft Stefan, 5.33 ft Berggren).

## 5. Roadmap position

Foundation / footing physics beside `soil-phase-relations`, serving the foundation / footing crew (construction).
Deliberately the frost-penetration physics; the jurisdictional frost line (IRC Table R301.2 / amendment), the
geotechnical report, and the AHJ set the actual footing depth. Stays evidence-driven. Continues the geotechnical sweep at
1 new spec (v965).
