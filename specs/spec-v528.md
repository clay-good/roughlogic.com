# roughlogic.com Specification v528 -- Blended Mortgage Rate (Two Loans) (calc-realestate.js, Group X, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-realestate.js`**
> (Group X, real estate); no new module, group, or dependency. Inherits spec.md through spec-v527.md.
>
> **The gap, and the evidence for it.** `piti` and `loan-payment` handle a single loan, but a common decision -- keep a
> low-rate first mortgage and add a second (a HELOC or a seller carry) versus refinance the whole balance into one new
> loan -- turns on the **blended** rate across both loans. The bench cannot compute it. The blended rate is the
> balance-weighted average of the two rates, and the catch is that it is a snapshot: it ignores the differing terms and
> amortization, and a variable-rate second (a HELOC that resets) makes the blend drift over time. Used correctly it
> answers exactly one question well -- is the weighted cost of debt if I add a second lower than the rate on a cash-out
> refinance of everything? The tile takes the two balances and rates and returns the blended rate, the combined balance,
> and the total monthly interest, so the keep-and-add option can be compared to a single-loan refinance rate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The loan balances and the
combined balance are carried as `dimensionless` (currency, matching the existing real-estate tiles); the interest rates
and the blended rate are `dimensionless` (percents); the monthly interest is `dimensionless` currency. The v18/v21
contract: any non-finite input, a negative balance or rate, or a combined balance of zero returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the weighted-average relation by name (weighted-average cost of debt);
`editionNote` names the **blended mortgage rate (balance-weighted average)**, prints
`blended = (bal1 x rate1 + bal2 x rate2) / (bal1 + bal2)` and `monthly_interest = (bal1 x rate1 + bal2 x rate2) / 1200`,
and states that **the blended rate is a balance-weighted snapshot that ignores the loans' differing terms and
amortization, a variable-rate second (a HELOC) makes the blend drift as its rate resets, this compares the cost of debt
of keeping a first and adding a second against a single cash-out refinance rate and is not a payment schedule, and the
actual loan documents govern** -- a comparison aid, not a payment plan.

## 2. The tile

### 2.1 `blended-mortgage-rate` -- The Weighted Cost of Debt for Keep-First-Add-Second vs Refinance

```
inputs:
  balance_1   $   first loan balance
  rate_1      %   first loan interest rate
  balance_2   $   second loan balance (HELOC / seller 2nd)
  rate_2      %   second loan interest rate

combined         = balance_1 + balance_2                                          [$]
blended_rate     = (balance_1 x rate_1 + balance_2 x rate_2) / combined           [%]
monthly_interest = (balance_1 x rate_1 + balance_2 x rate_2) / 1200               [$]
```

**Pinned worked example ($300,000 first at 4% plus a $100,000 second at 8%).** The combined balance is `$400,000`, and
the blended rate is `(300,000 x 4 + 100,000 x 8) / 400,000 = (1,200,000 + 800,000) / 400,000 = ` **5.00%** -- so keeping
the 4% first and adding the 8% second is a 5% weighted cost of debt, which beats a cash-out refinance only if the new
single rate is above 5%. The monthly interest is `2,000,000 / 1200 = ` **$1,667**. **Cross-check (a smaller second
barely moves the blend).** Shrink the second to `$40,000`: `blended = (1,200,000 + 320,000) / 340,000 = ` **4.47%** --
close to the first's rate, because the weighting follows the balances, so a small second hardly dilutes a big low-rate
first. The tile returns the blended rate, the combined balance, and the total monthly interest.

## 3. Wiring

A `tools-data.js` row (group `X`, trades `["real-estate"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the two-loan example + the small-
second cross-check); `test/fixtures/compute-map.js` (`blended-mortgage-rate` -> `computeBlendedMortgageRate` in
`../../calc-realestate.js`); `scripts/related-tiles.mjs` (-> `piti` / `mortgage-point-breakeven` / `loan-payment`);
`data/search/aliases.json` ("blended rate", "blended mortgage rate", "weighted average rate", "first and second
mortgage", "heloc blend", "combined rate", "cost of debt", "keep first add second"); the id appended to the real-estate
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the balance-weighting, the monthly-interest relation, and the error seams (non-finite,
negative balance / rate, zero combined). Hand-writes its renderer (mirroring the calc-realestate.js `piti` pattern).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the blended / combined / interest stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the two-loan example -> 5.00%).

## 5. Roadmap position

Adds the two-loan weighted rate beside `piti` and `mortgage-point-breakeven`. A keep-vs-refinance breakeven (the new
single rate at which a refinance beats the blend after closing costs) and an amortized-blend (accounting for the loans'
different balances over time) are deliberate future follow-ons. Further Group X growth stays evidence-driven.
