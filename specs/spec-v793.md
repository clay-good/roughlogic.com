# roughlogic.com Specification v793 -- Fresh Concrete Temperature (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v792.md. Explore sweep #22 (entry 5).
>
> **The gap, and the evidence for it.** Hot-weather concreting turns on the **fresh (batch) concrete temperature**, and
> the catalog's `concrete-evaporation-rate` tile takes that temperature as an input without a way to compute it. The ACI
> 305.1 heat balance is `T = [0.22(Ta Wa + Tc Wc) + Tw Ww + Twa Wwa] / [0.22(Wa + Wc) + Ww + Wwa]`. The number this
> settles: aggregate **3000 lb @ 80F**, cement **564 lb @ 150F**, **240 lb of 70F** mix water, and **60 lb** of aggregate
> moisture batch to **85.8F**. Grep confirmed no fresh-concrete-temperature / batch-water tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
concrete siblings (`concrete-evaporation-rate`): the ingredient weights carry `M`, the ingredient and result
temperatures carry `T` (temperature, the token the HVAC tiles use for Fahrenheit). The specific heats (0.22 for solids,
1.0 for water) are the standard ACI constants, the same tabulated-property pattern the catalog uses throughout. The
v18/v21 contract: a non-finite input (via `_finiteGuard`), a non-positive aggregate, cement, or added-water weight, a
negative aggregate-moisture weight, or a non-finite temperature returns `{ error }`. Citation discipline (v19/v22): ACI
305.1 hot-weather fresh-concrete temperature by name (PCA *Design and Control of Concrete Mixtures*),
`GOVERNANCE.general` matching the siblings; the note states the heat-balance basis, that the mix water is the cheapest
cooling lever (four times the solids' heat capacity; ice credits 144 Btu/lb of fusion), that the aggregate free moisture
rides at the aggregate temperature, that ACI 305 commonly caps placing near 90F (flagged), and that the static balance
omits hydration heat and mixer friction.

## 2. The tile

### 2.1 `fresh-concrete-temp` -- Fresh Concrete Temperature (ACI 305.1)

```
inputs:
  agg_weight_lb, agg_temp_f              coarse+fine aggregate (lb, F)
  cement_weight_lb, cement_temp_f        cementitious (lb, F)
  water_weight_lb, water_temp_f          added (mix) water (lb, F)
  agg_moisture_weight_lb                 free surface moisture on the aggregate (lb, at agg temp)

T = [0.22(Ta Wa + Tc Wc) + Tw Ww + Ta Wwa] / [0.22(Wa + Wc) + Ww + Wwa]
hot = T > 90 F
```

**Pinned worked example.** Aggregate 3000 lb @ 80F, cement 564 lb @ 150F, water 240 lb @ 70F, aggregate moisture 60 lb:
numerator `= 0.22(3000x80 + 564x150) + 240x70 + 80x60 = 0.22(324600) + 16800 + 4800 = 93012`; denominator `= 0.22(3564) +
300 = 1084.08`; `T = 93012 / 1084.08 = ` **85.8 F**. Chilling the mix water pulls the batch down the most per pound;
above 90F the hot-weather flag trips.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction"]`) beside `concrete-evaporation-rate` (Group E rows
are spec-interleaved and carry an explicit `group:` field); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (ACI
305.1 / PCA, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/
compute-map.js` (`fresh-concrete-temp` -> `computeFreshConcreteTemp`); `scripts/related-tiles.mjs` (->
`concrete-evaporation-rate` / `concrete-strength-gain` / `concrete-maturity`); `data/search/aliases.json` (5
collision-checked aliases: "fresh concrete temperature", "how much ice to cool concrete", "aci 305 placing
temperature", ...); the calc-concrete `CONCRETE_RENDERERS` map entry via the `_simpleRenderer` factory (non-exported, so
no DOM-sentinel row) and the id added to the calc-concrete declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the
heat balance, the water-leverage direction, the hot flag, and the error seams. The calc-concrete.js gzip cap is unchanged
(the addition fits under the current cap). Verify at build, including `check-shells`. Lazy-loaded, absent from home first
paint. Home tile count 1,241 -> 1,242.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned batch -> 85.8 F).

## 5. Roadmap position

Fills the fresh-concrete-temperature gap the `concrete-evaporation-rate` tile assumes, completing the hot-weather-pour
pair on the concrete bench. Continues Explore sweep #22 (the aviation cluster -- glidepath descent rate, coordinated-turn
radius, climb-gradient rate of climb -- is queued next and, because calc-mechanic.js is at its size cap, is the natural
seed for a new `calc-flightops.js` module). An ice-substitution / target-temperature inverse is the natural companion; it
stays evidence-driven.
