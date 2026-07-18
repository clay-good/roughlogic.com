# roughlogic.com Specification v969 -- Pool Calcium Hardness Increase (Calcium Chloride) (calc-treatment.js, Group M, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`** (Group M),
> no new module, group, or dependency. Inherits spec.md through spec-v968.md. Pool-chemistry sweep, beside the accepted
> `pool-alkalinity-adjust`, `pool-salt-dose`, and `pool-chlorine-dose` tiles.
>
> **The gap, and the evidence for it.** The pool suite doses alkalinity, CYA, salt, and chlorine, but has no CALCIUM
> HARDNESS dose -- calcium appears only as an input to the LSI tile. Grep confirmed no calcium-chloride / hardness-
> increase tile. Every pool tech balances hardness. The number this settles: raising 20,000 gal by 20 ppm takes about
> **4.8 lb** of 77% calcium chloride.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ gallons, ppm_increase, product_purity_pct }` dimensionless annotation, matching the pool
dosing tiles), bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite
input, a non-positive volume or ppm, or a purity outside (0,100] returns `{ error }`. Citation discipline (v19/v22): the
calcium-hardness dose by name (mass balance with the CaCl2/CaCO3 molecular-weight conversion), `GOVERNANCE.general`; the
note states that hardness is reported as CaCO3 so the dose applies the 110.98/100.09 conversion, that calcium chloride is
exothermic (add to water, pump running), and that hardness only dilutes down -- the test kit, target hardness, product
label, and CPO practice govern.

## 2. The tile

### 2.1 `pool-calcium-hardness-dose` -- Pool Calcium Hardness Increase (Calcium Chloride)

```
inputs:
  gallons            pool volume (gal), default 20000
  ppm_increase       calcium hardness increase (ppm), default 20
  product_purity_pct calcium chloride content (percent: ~77 flake, ~94 anhydrous), default 77

calcium_chloride_lb = ppm_increase x gallons x 8.34e-6 x (110.98 / 100.09) / (product_purity_pct / 100)
calcium_chloride_oz = calcium_chloride_lb x 16
```

**Pinned worked example.** 20,000 gal, +20 ppm, 77% flake: `lb = 20 x 20000 x 8.34e-6 x (110.98/100.09) / 0.77 = ` **4.80
lb** -- about 1.2 lb per 10,000 gal per 10 ppm, the pool-shop rule of thumb. Cross-check: higher-purity **anhydrous
(94%)** needs less product for the same rise, `... / 0.94 = ` **3.94 lb**.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["pool-service", "water-operations"]`, beside `pool-salt-dose`); a
`tile-meta.js` `_TILES` entry (`M`); a `citations.js` entry (calcium-hardness mass balance, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 77% example plus the anhydrous cross-check, pinning the pounds); `test/
fixtures/compute-map.js` (`pool-calcium-hardness-dose` -> `computePoolCalciumHardnessDose`, module `../../calc-
treatment.js`); `scripts/related-tiles.mjs` (-> `pool-alkalinity-adjust` / `langelier-index` / `pool-chlorine-dose`);
`data/search/aliases.json` (5 collision-checked aliases: "calcium hardness dose", "pool calcium chloride", "raise
calcium hardness", "pool hardness dose", "calcium chloride pool"), then `node scripts/build-alias-shards.mjs`; the tile
is rendered by the `_rPool` factory in the `TREATMENT_RENDERERS` map, and the id added to the calc-treatment declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-
strings; a `bounds-fuzzer.test.js` block pinning the dose, the higher-purity-less-product direction, the ppm and gallon
linearity, the rule-of-thumb, and the error seams. The calc-treatment.js gzip cap and the Group M group shell are watched
at build (cap raised for this tile). Home tile count 1,417 -> 1,418.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(20,000 gal / +20 ppm / 77% -> 4.80 lb).

## 5. Roadmap position

Pool chemistry beside `pool-salt-dose`, serving the pool-service tech / water operator (pool-service / water-operations).
Deliberately the starting dose; the pool test kit, the target hardness (typically 200-400 ppm), the exothermic handling,
the product label, and NSPF CPO / health-code practice govern. Stays evidence-driven. Continues the pool-chemistry sweep
at 1 new spec (v969).
