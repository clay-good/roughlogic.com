# roughlogic.com Specification v531 -- Units-of-Production Depreciation (calc-accounting.js, Group R, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-accounting.js`**
> (Group R, accounting and small business); no new module, group, or dependency. Inherits spec.md through spec-v530.md.
>
> **The gap, and the evidence for it.** The bench has the time-based depreciation methods -- `straight-line-depreciation`,
> `declining-balance-depreciation`, `macrs-depreciation` -- but not the **activity** method, which depreciates by usage
> instead of calendar time. For a machine, truck, or tool whose wear tracks hours or miles, units-of-production gives a
> truer book expense: a rate per unit times the units actually used. Two catches make it worth its own tile. An **idle**
> asset takes zero depreciation that period (time-based methods keep expensing it), which matters for a seasonal
> business, and the book value can **never fall below salvage** even if the asset is run past its estimated unit life.
> The tile takes the cost, salvage, total estimated lifetime units, units used this period, and accumulated units, and
> returns the rate per unit, the period depreciation, and the ending book value floored at salvage -- the GAAP/book
> figure for usage-driven assets and a natural input to income forecasting.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The cost, salvage, period
depreciation, and book value are carried as `dimensionless` currency (matching the existing depreciation tiles); the
total, period, and accumulated units are counts (`dimensionless`); the rate per unit is `dimensionless` currency per
unit. The v18/v21 contract: any non-finite input, a non-positive cost, a negative salvage, a salvage at or above cost, a
non-positive total-unit estimate, or negative period/accumulated units returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the activity-method relations by name (GAAP; IRS Pub 946 activity method);
`editionNote` names the **units-of-production depreciation**, prints `rate = (cost - salvage) / total_units`,
`period_depreciation = rate x period_units`, and `book_value = max(cost - rate x accumulated_units, salvage)`, and
states that **depreciation tracks usage not calendar time so an idle asset takes zero expense that period, book value is
floored at salvage and cannot go below it even past the estimated unit life, this is a GAAP/book and income-forecasting
method not the tax MACRS method for most assets, and the accounting policy and tax rules govern** -- a bookkeeping aid,
not tax advice.

## 2. The tile

### 2.1 `units-of-production-depr` -- Depreciation by Usage, Floored at Salvage

```
inputs:
  cost_basis          $       depreciable cost
  salvage_value       $       estimated salvage
  total_units         units   total estimated lifetime units (hours / miles / pieces)
  period_units        units   units used this period
  accumulated_units   units   units used to date (including this period)

rate                = (cost_basis - salvage_value) / total_units                 [$/unit]
period_depreciation = rate x period_units                                        [$]
book_value          = max(cost_basis - rate x accumulated_units, salvage_value)  [$]
```

**Pinned worked example (a $50,000 machine, $5,000 salvage, 100,000-unit life, 8,000 units this period).** The rate is
`(50,000 - 5,000) / 100,000 = ` **$0.45 per unit**, so this period's depreciation is `0.45 x 8,000 = ` **$3,600**. After
`8,000` accumulated units the book value is `50,000 - 0.45 x 8,000 = ` **$46,400**. **Cross-check (the salvage floor
holds past the unit life).** Run the machine to `110,000` accumulated units (past its 100,000 estimate):
`cost - rate x accumulated = 50,000 - 0.45 x 110,000 = 50,000 - 49,500 = 500`, which is below salvage, so the book value
is floored at **$5,000** -- you cannot depreciate below salvage no matter how hard the asset is used. The tile returns
the rate per unit, the period depreciation, and the floored book value.

## 3. Wiring

A `tools-data.js` row (group `R`, trades `["accounting", "small-business"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the usage
example + the salvage-floor cross-check); `test/fixtures/compute-map.js` (`units-of-production-depr` ->
`computeUnitsOfProductionDepr` in `../../calc-accounting.js`); `scripts/related-tiles.mjs` (->
`straight-line-depreciation` / `declining-balance-depreciation` / `macrs-depreciation`); `data/search/aliases.json`
("units of production depreciation", "activity method depreciation", "usage depreciation", "depreciation per unit",
"machine hours depreciation", "mileage depreciation", "pub 946 activity", "book value usage"); the id appended to the
accounting renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the rate-per-unit, the salvage floor holding past unit life, and
the error seams (non-finite, non-positive cost / total units, negative salvage / units, salvage >= cost). Hand-writes
its renderer (mirroring the calc-accounting.js `straight-line-depreciation` pattern). Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the rate / period / book-value stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the machine example -> $0.45/unit, $3,600).

## 5. Roadmap position

Adds the activity method to the depreciation family (`straight-line`, `declining-balance`, `macrs`), giving usage-driven
assets a truer book expense and feeding `equipment-hourly-rate` (which carries depreciation into an hourly cost). A
group-depreciation schedule and a units-remaining book-value projector are deliberate future follow-ons. Further Group R
growth stays evidence-driven.
