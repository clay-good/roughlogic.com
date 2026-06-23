# roughlogic.com Specification v145 -- Antimicrobial Coverage and Mixed-Solution Quantity (calc-restoration.js, Group D, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v141..v145.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one water-restoration tile turning a treated area and a label coverage
> rate into the gallons of mixed solution and the ounces of concentrate to load, the quantity companion
> to the existing dilution-ratio tile. Adds one tile to **`calc-restoration.js`** (Group D); no new
> module, group, or dependency. Inherits spec.md through spec-v144.md.
>
> **The gap, and the evidence for it.** `antimicrobial-dilution` gives the mix ratio (how much
> concentrate per gallon), but not how many gallons the job needs. The label states a coverage rate
> (square feet per gallon), and the tech sizing a Category 2 or 3 application has to multiply that out
> across the treated area and any second coat to know what to mix and how much concentrate to carry.
> It is one multiplication and one division, yet missing -- so product is over-mixed and wasted, or
> the crew runs short mid-application.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
treated area is `L^2`; the label coverage rate is `L^2/L^3` (ft^2 per gallon); the mixed-solution
volume is `L^3` (gallons); the concentrate dose is `L^3` (fluid ounces, via the 128 fl oz per gallon
constant); the coat count is `dimensionless`. The coverage rate and the per-gallon concentrate dose
are editable, read from the product label and the dilution tile. The v18/v21 contract: any non-finite
input, a non-positive area or coverage rate, or a coat count below 1 returns `{ error }`; the only
division is by the guarded-positive coverage rate. Citation discipline (v19/v22): `GOVERNANCE.general`
over the coverage-rate quantity method, by name; the **product label, the dwell/contact time, and
EPA registration govern** efficacy -- this tile sizes quantity only and makes no efficacy claim;
`antimicrobial-dilution` carries the ratio and `ppe` the handling.

## 2. The tile

### 2.1 `antimicrobial-coverage` -- Coverage and Mixed-Solution Quantity

```
inputs:
  treated_area_ft2       L^2            surface area to be treated
  coverage_ft2_per_gal   L^2/L^3        label coverage rate (default 200 ft^2/gal)
  coats                  dimensionless  application passes (default 1)
  concentrate_oz_per_gal L^3            concentrate per finished gallon, from the dilution tile (default 2)

mixed_solution_gal = treated_area_ft2 x coats / coverage_ft2_per_gal
concentrate_oz     = mixed_solution_gal x concentrate_oz_per_gal
water_gal          = mixed_solution_gal - concentrate_oz / 128
```

**Pinned worked example.** 400 ft^2 treated at 200 ft^2/gal, one coat, mixed at 2 oz concentrate per
gallon: `mixed = 400 x 1 / 200 = 2.0 gal`; `concentrate = 2.0 x 2 = 4.0 oz`;
`water = 2.0 - 4.0/128 = 1.97 gal`.
**Cross-check (a second coat doubles the mix).** Two coats: `mixed = 400 x 2 / 200 = 4.0 gal`,
`concentrate = 8.0 oz`, `water = 3.94 gal` -- twice the first-coat quantities, as expected. The label
coverage and contact time govern efficacy; this sizes the quantity.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the coverage-rate quantity method and the 128 fl oz/gal
constant, `editionNote` naming ANSI/IICRC S500, the label-and-contact-time-govern caveat, and the
quantity-only no-efficacy-claim scope); `test/fixtures/worked-examples.json` (example + cross-check);
`test/fixtures/compute-map.js` (`antimicrobial-coverage` -> `computeAntimicrobialCoverage` in
`../../calc-restoration.js`); `scripts/related-tiles.mjs` (-> `antimicrobial-dilution` /
`mold-remediation-level` / `ppe`); `data/search/aliases.json` ("antimicrobial coverage", "biocide
quantity", "gallons to mix", "coverage rate", "disinfectant amount", "how much antimicrobial"); the id
appended to the existing `RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check,
and error seams (non-finite, area/coverage <= 0, coats < 1). Raise the `calc-restoration.js` size cap
by ~20 percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the mixed-gallons, concentrate,
and water lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (400 ft^2 / 200
/ 1 coat / 2 oz -> 2.0 gal, 4.0 oz, 1.97 gal water).

## 5. Roadmap position

Closes the batch by giving the dilution-ratio tile its quantity partner, completing the apply-the-
product step after the demolition and drying fronts. Further Group D growth stays evidence-driven.
