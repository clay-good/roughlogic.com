# roughlogic.com Specification v340 -- Nutrient-Based Manure Application Rate (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.119.0). Batch spec-v338..v340 (the farm-operations trio -- grain shrink (v338),
> dry-matter intake (v339), the manure application rate (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `npk-blend` sizes a commercial fertilizer blend from a
> soil test, but a livestock operation applies manure, whose nutrient-based agronomic rate -- the tons or gallons per acre
> that meet the crop's nitrogen (or phosphorus) need without over-applying -- is a nutrient-management-plan staple the
> catalog cannot compute. Adds one tile to the existing **`calc-agriculture.js`** module (Group L); no new group, trade, or
> dependency. Inherits spec.md through spec-v339.md.
>
> **The gap, and the evidence for it.** The agronomic manure rate is the crop's nutrient need divided by the plant-available
> nutrient the manure supplies per unit: `rate = crop_need / available_per_unit`. The plant-available nitrogen is only a
> fraction of the total (the ammonium plus a first-year mineralization of the organic N, less volatilization loss), so the
> availability factor matters. For a corn crop needing `150 lb N/acre` from a solid manure carrying `5 lb available N/ton`,
> the N-based rate is `150/5 = 30 ton/acre`; for a liquid manure at `25 lb available N/1,000 gal`, it is
> `150/25 x 1,000 = 6,000 gal/acre`. A phosphorus-based plan (where P is the limiting regulator) divides the crop P need by
> the available P instead, usually giving a much lower rate. `npk-blend` buys the nutrients; this tile spreads them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The crop nutrient need is a
mass per area (lb/acre); the available nutrient content is a mass per unit manure (lb/ton or lb/1,000 gal); the application
rate is manure per area (ton/acre or 1,000 gal/acre); the availability factor is a dimensionless fraction. The v18/v21
contract: any non-finite input, or a nutrient need or available content at or below zero, returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the nutrient-based application-rate method by name; `editionNote` names
**the agronomic rate `rate = crop_need / available_nutrient_per_unit`, the plant-available nitrogen as the ammonium plus a
first-year organic-N mineralization fraction less volatilization (often ~40 to 60% of total N available the first year),
and the N-based vs P-based (regulatory) rate distinction, per the USDA NRCS Code 590 nutrient-management standard**, and
states that **this returns the nutrient-based agronomic application rate -- it uses the entered plant-available nutrient
content (from a manure analysis and an availability factor for the application method/timing), does not itself compute the
availability factor or the incorporation/volatilization loss, and does not check the phosphorus-index or setback/water-
quality limits; and this is a planning aid, not a certified nutrient-management plan** -- the NRCS Code 590 plan, the manure
test, and the certified planner govern.

## 2. The tile

### 2.1 `manure-application-rate` -- Nutrient-Based Manure Application Rate

```
inputs:
  crop_need    lb/acre         crop nutrient (N or P2O5) requirement
  total_nutr   lb/unit         total nutrient in manure (lb/ton or lb/1000 gal)
  availability %               plant-available fraction (first-year)
  form         -               solid(ton) | liquid(1000 gal)

available_per_unit = total_nutr * availability/100
rate = crop_need / available_per_unit                 ; ton/acre or 1,000 gal/acre
applied_nutrient = rate * available_per_unit          ; = crop_need (closes the loop)
```

**Pinned worked example (150 lb N/acre corn, solid manure 10 lb total N/ton at 50% available).**
`available_per_unit = 10 x 0.50 = 5 lb N/ton`; `rate = 150/5 = 30 ton/acre` of manure meets the nitrogen need.
**Cross-check (a liquid manure, N-based).** Liquid at `50 lb total N/1,000 gal`, 50% available -> `25 lb N/1,000 gal`;
`rate = 150/25 = 6.0`, i.e. `6,000 gal/acre` -- the same 150 lb N delivered, the rate a drag-hose or tanker is calibrated
to. Were phosphorus the limiting regulator, dividing the crop's `60 lb P2O5/acre` by the manure's available P would give a
much lower rate, the case a P-index plan enforces. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`, matching `npk-blend`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the nutrient-based rate method, `editionNote` naming
`rate = crop_need/available_per_unit`, the first-year availability fraction, the N-vs-P basis, NRCS Code 590, and the
enter-availability, not-P-index, not-a-plan caveats); `test/fixtures/worked-examples.json` (the solid example + the liquid
cross-check); `test/fixtures/compute-map.js` (`manure-application-rate` -> `computeManureApplicationRate` in
`../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `npk-blend` / `livestock-dry-matter-intake` / `crop-yield` /
`irrigation-requirement`); `data/search/aliases.json` ("manure application rate", "manure spreading rate", "nutrient
management manure", "N based manure", "tons per acre manure", "manure nitrogen rate", "NRCS 590", "gallons per acre
manure", "land application manure"); the id appended to the existing agriculture renderers block in `app.js`; the
`// dims:` annotation (`crop_need` mass/area, `total_nutr` mass/unit, availability dimensionless, rate manure/area);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the availability factor, the
applied-equals-need loop closure, and the non-positive / non-finite error seams. No new module; re-pin
`calc-agriculture.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the loop-closure assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the available-per-unit / rate stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (150 lb N, 5 avail/ton -> 30 ton/acre).

## 5. Roadmap position

Closes the farm-operations batch (v338..v340) in `calc-agriculture.js`: grain settlement, feed intake, and manure land
application now stand beside the fertilizer-blend, ration, and irrigation tiles. A first-year availability-factor lookup by
manure type and application method, a phosphorus-index limit check, and a setback/water-quality screen are the deliberate
next follow-ons once the trio lands.
