# roughlogic.com Specification v940 -- Anhydrous Ammonia Rate from Target Nitrogen (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`** (Group
> L), no new module, group, or dependency. Inherits spec.md through spec-v939.md. Fertilizer-rate sweep, beside the
> accepted `npk-blend` and `manure-nutrient-application` tiles.
>
> **The gap, and the evidence for it.** The catalog blends NPK into urea/DAP/potash (`npk-blend`) but nothing gives a
> single-product ANHYDROUS AMMONIA rate. Grep confirmed no anhydrous tile. Anhydrous is the most common corn-belt N
> source and is set by product rate. The number this settles: a 180 lb N/acre target is about **219.5 lb (42.6 gal)** of
> anhydrous per acre.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling
fertilizer tiles: the per-acre rates and tank/acre figures are carried as the module's domain-rate (dimensionless)
convention. The v18/v21 contract: a non-positive target nitrogen, or a negative tank size, returns `{ error }`; a zero
tank returns a null acres-per-tank. Citation discipline (v19/v22): the anhydrous grade and density by name (product = N /
0.82; gal/acre = lb/acre / 5.15; acres/tank = tank / gal-per-acre), `GOVERNANCE.general`; the note states that anhydrous
is 82-0-0 (82% N), that it is a pressurized, acutely hazardous liquid requiring a calibrated flow-monitored applicator
and the label's PPE / water / closed-transfer safety, and that the applicator calibration, the certified soil-test N
recommendation, and the co-op / label govern -- distinct from a multi-nutrient NPK blend.

## 2. The tile

### 2.1 `anhydrous-ammonia-rate` -- Anhydrous Ammonia Rate from Target Nitrogen

```
inputs:
  n_target_lb_per_ac   target nitrogen (lb N/acre)
  tank_gal             nurse-tank size (gal, 0 to skip acres/tank)

product_lb_per_ac  = n_target_lb_per_ac / 0.82        (82-0-0 grade)
product_gal_per_ac = product_lb_per_ac / 5.15         (~5.15 lb/gal liquid)
acres_per_tank     = tank_gal / product_gal_per_ac    (null if tank = 0)
```

**Pinned worked example.** 180 lb N/acre, 1,000-gal tank:
`product = 180 / 0.82 = ` **219.5 lb/acre**; `gal/acre = 219.5 / 5.15 = ` **42.6 gal/acre**; `acres/tank = 1,000 / 42.6
= ` **23.5 acres**. Cross-check: a 120 lb N/acre target is `120 / 0.82 = ` **146.3 lb/acre** (28.4 gal/acre) -- the
product tracks the N target divided by the 0.82 grade, and the gallons follow at the liquid density.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`, beside `tractor-ballast`); a `tile-meta.js` `_TILES` entry
(`L`); a `citations.js` entry (anhydrous grade and density, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 180 lb N example plus the 120 lb N cross-check, pinning the lb/acre, gal/acre,
and acres/tank); `test/fixtures/compute-map.js` (`anhydrous-ammonia-rate` -> `computeAnhydrousAmmoniaRate`, module
`../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `npk-blend` / `manure-nutrient-application` / `seed-rate`);
`data/search/aliases.json` (5 collision-checked aliases: "anhydrous ammonia rate", "nh3 rate", "anhydrous per acre",
"82-0-0 nitrogen rate", "anhydrous acres per tank"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer
in the `AGRICULTURE_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-agriculture
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the product rate, gal/acre, acres/tank, the null-tank seam, and
the error seams (non-positive N, negative tank, non-finite). The calc-agriculture.js gzip cap is watched at build.
Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint.
Home tile count 1,388 -> 1,389.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(180 / 0.82 -> 219.5 lb/acre, 42.6 gal/acre, 23.5 acres/1,000-gal tank).

## 5. Roadmap position

Fertilizer-rate tile beside `npk-blend`, serving the farmer / co-op applicator (agriculture). Deliberately a rate
estimate; the applicator calibration, the certified soil-test nitrogen recommendation, and the co-op / product label
govern the actual application, and anhydrous is a hazardous material handled per its certification. Stays
evidence-driven. Continues the fertilizer-rate sweep at 1 new spec (v940).
