# roughlogic.com Specification v327 -- Soil Phase Relations (Void Ratio, Porosity, Saturation) (calc-earthwork.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.115.0; proposed 2026-07-02). Batch spec-v326..v328 (the soil characterization/QC trio -- relative
> compaction (v326), the soil phase relations (this spec), the Atterberg indices (v328)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog uses unit weights throughout the geotech
> tiles but never resolves a soil into its three-phase makeup -- the void ratio, porosity, and degree of saturation that
> underlie settlement, permeability, and every compaction and bearing computation. Adds one tile to the existing
> **`calc-earthwork.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v326.md.
>
> **The gap, and the evidence for it.** From the total unit weight `gamma`, the water content `w`, and the specific gravity
> of solids `Gs`, the standard phase relations follow: the dry unit weight `gamma_d = gamma/(1 + w)`, the void ratio
> `e = Gs gamma_w/gamma_d - 1`, the porosity `n = e/(1 + e)`, and the degree of saturation `S = w Gs/e`. For a soil at
> `gamma = 120 pcf`, `w = 15%`, `Gs = 2.70`, `gamma_d = 120/1.15 = 104.3 pcf`, `e = 2.70 x 62.4/104.3 - 1 = 0.62`,
> `n = 0.62/1.62 = 0.38`, and `S = 0.15 x 2.70/0.62 = 66%` -- the void ratio a consolidation settlement needs, the porosity
> a seepage calc needs, and the saturation that says how much air is left to squeeze out. The unit-weight tiles use these
> implicitly; this tile makes them explicit.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The total and dry unit
weights are unit weights (pcf); the water content `w` and degree of saturation `S` are dimensionless percentages; the
specific gravity `Gs`, void ratio `e`, and porosity `n` are dimensionless; `gamma_w = 62.4 pcf`. The v18/v21 contract: any
non-finite input, a unit weight or `Gs` at or below zero, or a dry unit weight giving a non-positive void ratio (`e <= 0`,
an impossibly dense input) returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the soil phase
relations by name; `editionNote` names **the phase relations `gamma_d = gamma/(1 + w)`, `e = Gs gamma_w/gamma_d - 1`,
`n = e/(1 + e)`, `S = w Gs/e`, and `Gs ~ 2.65 to 2.72` for common soils, with `gamma_w = 62.4 pcf`, as compiled in the Das
and NAVFAC references**, and states that **this returns the void ratio, porosity, dry unit weight, and saturation from the
total unit weight, water content, and specific gravity -- it assumes the entered `Gs` (measure or estimate it by soil type),
uses `gamma_w = 62.4 pcf` (fresh water), and does not compute the permeability, the effective stress, or the compaction
relative density; and this is an engineering aid** -- the soil test data govern.

## 2. The tile

### 2.1 `soil-phase-relations` -- Soil Phase Relations (Void Ratio, Porosity, Saturation)

```
inputs:
  gamma_pcf   pcf    total (moist) unit weight
  w_pct       %      water content
  Gs          -      specific gravity of solids (~2.65-2.72)

gamma_w = 62.4 pcf
gamma_d = gamma_pcf / (1 + w_pct/100)            ; dry unit weight, pcf
e = Gs * gamma_w / gamma_d - 1                    ; void ratio
n = e / (1 + e)                                   ; porosity
S = (w_pct/100) * Gs / e * 100                    ; degree of saturation, %
```

**Pinned worked example (gamma = 120 pcf, w = 15%, Gs = 2.70).** `gamma_d = 120/1.15 = 104.3 pcf`;
`e = 2.70 x 62.4/104.3 - 1 = 1.615 - 1 = 0.615`; `n = 0.615/1.615 = 0.381`; `S = 0.15 x 2.70/0.615 x 100 = 65.9%`.
**Cross-check (saturate the same soil, S = 100%).** For full saturation `w = e/Gs = 0.615/2.70 = 22.8%`; recomputing at
`w = 22.8%` with the same solids gives `S = 100%` and a total unit weight of `128 pcf` -- the saturated unit weight the same
soil skeleton would have with its voids full of water, the upper bound on its moist weight. The non-finite, non-positive,
and `e <= 0` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","surveying"]`, matching the earthwork tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the phase relations, `editionNote` naming `gamma_d`, `e`,
`n`, `S`, the `Gs` range, `gamma_w = 62.4`, and the enter-Gs, fresh-water, not-permeability caveats);
`test/fixtures/worked-examples.json` (the base example + the saturated cross-check); `test/fixtures/compute-map.js`
(`soil-phase-relations` -> `computeSoilPhaseRelations` in `../../calc-earthwork.js`); `scripts/related-tiles.mjs` (->
`relative-compaction` / `soil-consolidation-settlement` / `bulk-density` / `soil-bearing-capacity`);
`data/search/aliases.json` ("soil phase relations", "void ratio", "porosity soil", "degree of saturation", "dry unit
weight", "specific gravity soil", "e n S soil", "three phase soil", "soil weight volume"); the id appended to the existing
earthwork renderers block in `app.js`; the `// dims:` annotation (unit weights unit weight, `w`/`S` percent, `Gs`/`e`/`n`
dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
`S = w Gs/e` identity, the saturated cross-check, and the non-positive / `e <= 0` / non-finite error seams. No new module;
re-pin `calc-earthwork.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the saturation identity assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `gamma_d` / `e` / `n` / `S` stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (120 pcf, 15%, Gs 2.70 -> e 0.62, S 66%).

## 5. Roadmap position

Middle of the soil characterization/QC batch (v326..v328) in `calc-earthwork.js`, resolving the soil into its phases behind
the compaction and settlement tiles. The Atterberg indices (v328) follow. The effective-stress profile, the saturated/
buoyant unit-weight family, and a permeability estimate (Hazen/Kozeny) from the void ratio are the deliberate next follow-
ons once the trio lands.
