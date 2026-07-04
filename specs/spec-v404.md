# roughlogic.com Specification v404 -- Rental Total Return (Four Components) (calc-realestate.js, Group X, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.141.0; proposed 2026-07-03). Third and final tile of the real-estate-investing trio (v402 fix-and-flip -> v403 BRRRR
> refi -> v404 rental total return). `cash-on-cash` counts only the pre-tax cash flow; a rental actually returns four ways,
> and this tile sums all of them into the first-year total return an investor compares against the stock market.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A held rental builds wealth through four channels:
> cash flow (rent net of everything), equity buildup (the tenant paying down the loan principal), appreciation (the property
> gaining value), and the tax shield (depreciation reducing taxable income). The total return is their sum over the cash
> invested. `cash-on-cash` reports only the first channel and `rental-worksheet` reports Schedule E taxable income; neither
> sums the four sources into a total return. This adds the total-return tile to the existing **`calc-realestate.js`** module
> (Group X); no new group, trade, or dependency. Inherits spec.md through spec-v403.md.
>
> **The gap, and the evidence for it.** On `$50,000` of cash invested, a property returning `$3,000` cash flow (`6%`),
> `$2,500` first-year principal paydown (`5%`), `$7,500` appreciation (`15%`, a `3%` gain on a `$250,000` property), and
> `$1,500` of tax savings (`3%`) delivers a total first-year return of `3000 + 2500 + 7500 + 1500 = $14,500`, or `29.0%` of
> the cash invested. Cash flow alone (the `cash-on-cash` number) is only `6%` -- the other `23%` is the part investors miss.
> No tile does this; the catalog had the cash-flow slice but never the whole return.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The cash invested and the four
return components are currency (USD); the component and total returns are dimensionless (percent). The v18/v21 contract: any
non-finite input, or a non-positive cash invested, returns `{ error }`; any component may be negative (a cash-flow loss, a
depreciating market) and the total is signed, and the tile reports each component in dollars and as a percent of cash
invested plus the total. Citation discipline (v19/v22): `GOVERNANCE.general` over the four-component real-estate return by
name; `editionNote` names **the total-return model as the sum of cash flow, principal paydown (equity buildup),
appreciation, and the depreciation tax shield, each divided by cash invested, and notes that appreciation and the tax shield
are unrealized/deferred (not spendable cash)**, and states that **this returns the first-year total return decomposed into
its four sources, that appreciation is an estimate and the tax shield depends on the investor's bracket and depreciation
recapture at sale, and that it is an analysis aid, not a substitute for a tax advisor or an appraisal**.

## 2. The tile

### 2.1 `rental-total-return` -- Rental Total Return (Four Components)

```
inputs:
  cash_invested_usd    USD   total cash in the deal
  annual_cash_flow_usd USD   cash flow after all expenses and debt service
  principal_paydown_usd USD  first-year loan principal reduction
  appreciation_usd     USD   first-year value gain (rate * property value)
  tax_savings_usd      USD   depreciation tax shield

total = annual_cash_flow_usd + principal_paydown_usd + appreciation_usd + tax_savings_usd
each_pct  = component / cash_invested_usd
total_pct = total / cash_invested_usd
```

**Pinned worked example ($50k cash; $3k cash flow, $2.5k paydown, $7.5k appreciation, $1.5k tax).** components
`6% + 5% + 15% + 3%`; total `$14,500 = 29.0%` of cash invested, versus the `6%` cash-on-cash alone. **Cross-check (a flat
market).** Zero the appreciation and the total falls to `$7,000 = 14.0%` -- still more than double the cash-flow-only view,
from equity buildup and the tax shield. A non-positive cash invested takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `X`, trades `["real-estate", "small-business"]`, beside `cash-on-cash` / `rental-worksheet`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the four-component return, `editionNote` naming
the four sources, the per-component and total percents, and the unrealized-gain caveat); `test/fixtures/worked-examples.json`
(the four-source example + the flat-market cross-check); `test/fixtures/compute-map.js` (`rental-total-return` ->
`computeRentalTotalReturn` in `../../calc-realestate.js`); `scripts/related-tiles.mjs` (-> `cash-on-cash` /
`rental-worksheet` / `brrrr-refi` / `gross-rent-multiplier`); `data/search/aliases.json` ("rental total return", "total
return real estate", "four returns rental", "equity buildup", "appreciation return", "tax shield rental", "cash flow
appreciation paydown", "real estate total return", "first year return rental"); the id appended to the existing real-estate
renderers block in `app.js`; the `// dims:` annotation (currency amounts, returns dimensionless); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the signed total, and the non-positive / non-finite error
seams. No new module; re-pin `calc-realestate.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the four components + total wrap on a phone); render-no-nan +
a11y sweep, output read to the value ($50k cash -> $14,500, 29.0% total).

## 5. Roadmap position

Closes the real-estate-investing trio: v402 flips, v403 refinances and keeps, and v404 measures the long-term return of the
kept property. An after-tax IRR over a multi-year hold with a sale (including depreciation recapture) is the deliberate next
follow-on.
