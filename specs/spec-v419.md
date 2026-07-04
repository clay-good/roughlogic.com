# roughlogic.com Specification v419 -- Manure Nutrient Application Rate (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.146.0; proposed 2026-07-03). Third and final tile of the landscape/agriculture trio (v417 mulch/topsoil volume ->
> v418 grain drying energy -> v419 manure nutrient application). `npk-blend` blends commercial fertilizer to a soil-test
> target; this tile sizes a manure spreader to meet a crop's nitrogen need from a manure analysis, accounting for the fact
> that only part of manure nitrogen is available the first year.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Sizing a manure application is not the same as blending
> bagged fertilizer: much of manure nitrogen is organic and mineralizes slowly, so only a first-year availability fraction
> counts. The application rate is `tons/acre = crop_N_need / (total_N_per_ton * availability)`, and the phosphorus and
> potassium come along as byproducts at that rate. `npk-blend` handles commercial straights from a soil test; nothing does
> the manure availability math. This adds the manure tile to the existing **`calc-agriculture.js`** module (Group L); no new
> group, trade, or dependency. Inherits spec.md through spec-v418.md.
>
> **The gap, and the evidence for it.** For a crop needing `150 lb N/acre` from a manure testing `10 lb N/ton` at `50%`
> first-year availability, the available nitrogen is `10 * 0.50 = 5 lb/ton`, so the rate is `150 / 5 = 30 tons/acre`. At that
> rate a manure with `5 lb P2O5/ton` also lays down `150 lb P2O5/acre` -- often more phosphorus than the crop needs, the
> classic manure-management trade-off. No tile does this; `npk-blend` could not model manure availability.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The crop nutrient need is a
mass per area (lb/acre); the manure nutrient contents are mass per mass (lb/ton); the availability factor is dimensionless
(percent); the application rate is a mass per area (ton/acre). The v18/v21 contract: any non-finite input, or a non-positive
crop need, nutrient content, or availability, returns `{ error }`; the tile computes the rate from the nitrogen need by
default and reports the phosphorus and potassium delivered at that rate (flagging when they exceed a supplied crop need).
Citation discipline (v19/v22): `GOVERNANCE.general` over manure nutrient management by name; `editionNote` names **USDA NRCS
Practice 590 Nutrient Management, the available nitrogen `= total_N_per_ton * first_year_availability`, the application rate
`= crop_N_need / available_N_per_ton`, and the byproduct P2O5/K2O delivered at that rate**, and states that **this returns
the manure application rate to meet a nitrogen need, that availability factors come from manure type and application method
(MWPS/extension tables), that phosphorus often over-applies, and that it is a planning aid, not a substitute for a certified
nutrient management plan or a manure lab analysis**.

## 2. The tile

### 2.1 `manure-nutrient-application` -- Manure Nutrient Application Rate

```
inputs:
  crop_n_need_lb_acre   lb/acre   crop nitrogen requirement
  total_n_lb_ton        lb/ton    total nitrogen in the manure (book or lab)
  availability_pct      %         first-year N availability (mineralization)
  p2o5_lb_ton           lb/ton    manure phosphate content (optional)
  k2o_lb_ton            lb/ton    manure potash content (optional)

avail_n_per_ton = total_n_lb_ton * availability_pct/100
rate_ton_acre   = crop_n_need_lb_acre / avail_n_per_ton
p2o5_applied    = rate_ton_acre * p2o5_lb_ton
k2o_applied     = rate_ton_acre * k2o_lb_ton
```

**Pinned worked example (150 lb N/acre need, 10 lb N/ton manure, 50% availability).**
`available N = 10*0.50 = 5 lb/ton`; `rate = 150/5 = 30 tons/acre`. At `5 lb P2O5/ton` that delivers
`30*5 = 150 lb P2O5/acre`. **Cross-check (more available N).** A composted manure at `70%` availability gives
`7 lb N/ton`, dropping the rate to `150/7 = 21.4 tons/acre` -- higher availability, less manure hauled. A non-positive need,
content, or availability takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`, beside `npk-blend`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, NRCS 590 nutrient management, `editionNote` naming the available-N,
application-rate, and byproduct relations and the phosphorus-over-application note); `test/fixtures/worked-examples.json`
(the raw-manure example + the compost cross-check); `test/fixtures/compute-map.js` (`manure-nutrient-application` ->
`computeManureNutrientApplication` in `../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `npk-blend` /
`grain-drying-energy` / `mulch-topsoil-volume` / `livestock-dry-matter-intake`); `data/search/aliases.json` ("manure
application rate", "manure nutrient", "spreader rate", "manure nitrogen availability", "nutrient management manure",
"tons per acre manure", "manure spreading", "nrcs 590", "manure N P K"); the id appended to the existing agriculture
renderers block in `app.js`; the `// dims:` annotation (needs/contents mass per area or mass, availability dimensionless,
rate mass per area); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
byproduct outputs, and the non-positive / non-finite error seams. No new module; re-pin `calc-agriculture.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the byproduct outputs, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the rate / P2O5 / K2O set wraps on a phone);
render-no-nan + a11y sweep, output read to the value (150 lb N, 10 lb/ton, 50% -> 30 tons/acre).

## 5. Roadmap position

Closes the landscape/agriculture trio: v417 spreads bulk material, v418 dries grain, and v419 sizes manure to a nitrogen
need. A phosphorus-index / P-based application-limit mode and a manure-storage-volume tile are the deliberate next
follow-ons.
