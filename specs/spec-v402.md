# roughlogic.com Specification v402 -- Fix-and-Flip Profit and Return (calc-realestate.js, Group X, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.141.0; proposed 2026-07-03). First tile of a real-estate-investing trio (v402 fix-and-flip profit -> v403 BRRRR refi
> -> v404 rental total return). `max-offer-70-rule` gives the offer price for a flip; this tile runs the deal that follows --
> the full profit waterfall from purchase through rehab, holding, financing, and sale, with the return on cash.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A flip's profit is the after-repair value less every
> cost to get there: purchase, rehab, holding (taxes, utilities, insurance while owned), financing (points and interest),
> and selling (agent commission plus closing). The return on cash is that profit over the cash actually invested, and
> annualizing it by the hold period compares a fast flip to a slow one. `max-offer-70-rule` stops at the offer; nothing runs
> the profit. This adds the flip tile to the existing **`calc-realestate.js`** module (Group X); no new group, trade, or
> dependency. Inherits spec.md through spec-v401.md.
>
> **The gap, and the evidence for it.** On a `$300,000` ARV with `$180,000` purchase, `$40,000` rehab, `$8,000` holding,
> `$12,000` financing, and `6%` selling cost (`$18,000`), the all-in cost is `$258,000` and the net profit is
> `300000 - 258000 = $42,000`, a `14.0%` margin on ARV. On `$114,000` of cash invested (the rest financed) that is a
> `42000/114000 = 36.8%` return, and over a `6`-month hold it annualizes to `73.7%`. No tile does this; a flipper had the
> offer rule but no profit or return number.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. All money inputs and outputs
are currency (USD); the selling-cost rate is dimensionless (percent); the hold period is a time (months); the margin and
returns are dimensionless (percent). The v18/v21 contract: any non-finite input, or a non-positive ARV or cash invested, or
a non-positive hold period, returns `{ error }`; the selling cost may be entered as a percent of ARV or a dollar amount, the
profit is signed (a bad deal returns a loss), and the annualized return uses `12 / hold_months`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the flip pro-forma by name; `editionNote` names **the flip profit
`= ARV - (purchase + rehab + holding + financing + selling)`, selling cost as agent commission plus closing (commonly `6`
to `8%` of ARV), return on cash `= profit / cash invested`, and the annualized return `= return * 12 / hold_months`**, and
states that **this returns the flip profit, ARV margin, cash-on-cash return, and annualized return, that it assumes a sale
at ARV and requires honest rehab and holding estimates, and that it is an underwriting aid, not a substitute for a
contractor bid, an appraisal, or a tax advisor**.

## 2. The tile

### 2.1 `fix-flip-profit` -- Fix-and-Flip Profit and Return

```
inputs:
  arv_usd          USD   after-repair value (expected sale price)
  purchase_usd     USD   purchase price
  rehab_usd        USD   renovation budget
  holding_usd      USD   holding costs over the hold
  financing_usd    USD   points + interest
  selling_pct      %     selling cost as percent of ARV (agent + closing)
  cash_invested_usd USD  cash actually in the deal
  hold_months      mo    hold period

selling  = arv_usd * selling_pct/100
all_in   = purchase_usd + rehab_usd + holding_usd + financing_usd + selling
profit   = arv_usd - all_in
margin   = profit / arv_usd
roi      = profit / cash_invested_usd
annual   = roi * 12 / hold_months
```

**Pinned worked example ($300k ARV, $180k buy, $40k rehab, $8k holding, $12k financing, 6% sell, $114k cash, 6 mo).**
selling `$18,000`; all-in `$258,000`; profit `$42,000` (`14.0%` margin); `ROI = 42000/114000 = 36.8%`; annualized `73.7%`.
**Cross-check (thin deal).** Raise the purchase to `$210,000` and profit falls to `$12,000`, a `10.5%` cash return -- below
most flippers' threshold. A non-positive ARV, cash, or hold takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `X`, trades `["real-estate", "small-business"]`, beside `max-offer-70-rule`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the flip pro-forma, `editionNote` naming the profit, margin,
ROI, and annualized relations and the selling-cost convention); `test/fixtures/worked-examples.json` (the profitable example
+ the thin-deal cross-check); `test/fixtures/compute-map.js` (`fix-flip-profit` -> `computeFixFlipProfit` in
`../../calc-realestate.js`); `scripts/related-tiles.mjs` (-> `max-offer-70-rule` / `cash-on-cash` / `brrrr-refi` /
`closing-costs`); `data/search/aliases.json` ("fix and flip", "flip profit", "flip roi", "arv profit", "house flip
calculator", "flip return", "rehab profit", "flip deal analyzer", "after repair value profit"); the id appended to the
existing real-estate renderers block in `app.js`; the `// dims:` annotation (currency amounts, rates/margins dimensionless,
hold time); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the annualization,
and the non-positive / non-finite error seams. No new module; re-pin `calc-realestate.js` on the `check:module-sizes`
allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the profit / ROI / annualized set wraps on a phone);
render-no-nan + a11y sweep, output read to the value ($300k ARV / $258k all-in -> $42,000, 36.8% ROI).

## 5. Roadmap position

Opens the real-estate-investing trio: `brrrr-refi` (v403) is the flip's buy-and-hold cousin that refinances instead of
selling, and `rental-total-return` (v404) measures the long-term return once a property is kept. A rehab-cost-per-square-
foot estimator that feeds the rehab input is the deliberate next follow-on.
