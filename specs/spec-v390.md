# roughlogic.com Specification v390 -- Work-in-Progress Percent Complete and Over/Under Billing (calc-accounting.js, Group R, 1 New Tile)

> **Status: LANDED (2026-07-03, 0.137.0; proposed 2026-07-03). First tile of a contractor-billing trio (v390 WIP percent complete -> v391 change-order
> markup -> v392 retainage tracker). The catalog costs a job (`labor-burden-rate`, `equipment-hourly-rate`) and prices it
> (`markup`), but never runs the cost-to-cost percent-complete that recognizes revenue and flags the over/under billing a
> surety underwriter reads first.**
> In-scope catalog expansion under the spec-v106 trades-only charter. On a long job, revenue is recognized as the work is
> earned, not as it is billed. The cost-to-cost input method (ASC 606 / AICPA construction guide) measures progress as
> `percent complete = cost to date / estimated total cost`, earns `earned revenue = percent complete * contract value`, and
> compares it to billings: costs and earnings in excess of billings is an underbilling (an asset), billings in excess is an
> overbilling (a liability). `breakeven` is a single-period CVP; nothing does job-level revenue recognition. This adds the
> WIP tile to the existing **`calc-accounting.js`** module (Group R); no new group, trade, or dependency. Inherits spec.md
> through spec-v389.md.
>
> **The gap, and the evidence for it.** A `$500,000` contract with `$300,000` of cost to date against a `$400,000` estimated
> total is `300000/400000 = 75%` complete, so `earned revenue = 0.75 * 500000 = $375,000`. If only `$350,000` has been
> billed, the job is underbilled by `375000 - 350000 = $25,000` -- earned work not yet invoiced, an asset on the WIP
> schedule and a cash-flow flag. No tile computes this; a contractor filling out a bonding WIP schedule had to do it by
> hand.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The contract value, cost to
date, estimated total cost, and billings to date are currency (USD); the percent complete is dimensionless; the earned
revenue and the over/under billing are currency. The v18/v21 contract: any non-finite input, or a non-positive estimated
total cost or contract value, returns `{ error }`; percent complete is capped at `100%` (a cost overrun past the estimate
does not earn more than the contract) with an overrun flag, and the over/under billing is signed (positive = underbilling
asset, negative = overbilling liability). Citation discipline (v19/v22): `GOVERNANCE.general` over the cost-to-cost
percent-complete method by name; `editionNote` names **ASC 606 / AICPA construction accounting, the cost-to-cost input
method `percent complete = cost to date / estimated total cost`, `earned revenue = percent complete * contract value`, and
the over/under billing as `earned revenue - billings to date` (positive underbilled, negative overbilled)**, and states that
**this returns the WIP-schedule figures a surety and CPA rely on, that the estimated total cost must be a current honest
estimate (a low estimate overstates progress), and that it is an estimating aid, not a substitute for a CPA-prepared WIP or
GAAP financial statements**.

## 2. The tile

### 2.1 `wip-percent-complete` -- Work-in-Progress Percent Complete and Over/Under Billing

```
inputs:
  contract_usd        USD   total contract value
  cost_to_date_usd    USD   job cost incurred to date
  est_total_cost_usd  USD   estimated total cost at completion
  billed_to_date_usd  USD   amount billed to date

pct_complete   = min(cost_to_date_usd / est_total_cost_usd, 1.0)
earned_revenue = pct_complete * contract_usd
over_under     = earned_revenue - billed_to_date_usd     (+ underbilled asset, - overbilled liability)
```

**Pinned worked example ($500,000 contract, $300,000 cost, $400,000 est total, $350,000 billed).**
`percent complete = 300000/400000 = 75%`; `earned revenue = 0.75*500000 = $375,000`;
`over/under = 375000 - 350000 = +$25,000` underbilled. **Cross-check (overbilled front-loaded job).** Bill `$400,000` at the
same progress and `over/under = 375000 - 400000 = -$25,000` -- overbilled, a liability (borrowed against future work). A
cost past the estimate caps percent complete at `100%` and raises the overrun flag. The non-positive-estimate and
non-finite seams take the error path.

## 3. Wiring

A `tools-data.js` row (group `R`, trades `["accounting", "small-business", "construction"]`, beside `breakeven` /
`labor-burden-rate`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, ASC 606 cost-to-cost,
`editionNote` naming the percent-complete, earned-revenue, and over/under-billing relations); `test/fixtures/worked-examples.json`
(the underbilled example + the overbilled cross-check); `test/fixtures/compute-map.js` (`wip-percent-complete` ->
`computeWipPercentComplete` in `../../calc-accounting.js`); `scripts/related-tiles.mjs` (-> `breakeven` /
`labor-burden-rate` / `change-order-markup` / `retainage-tracker`); `data/search/aliases.json` ("work in progress", "WIP
schedule", "percent complete", "cost to cost", "earned revenue", "over under billing", "overbilling", "underbilling",
"revenue recognition construction"); the id appended to the existing accounting renderers block in `app.js`; the `// dims:`
annotation (currency amounts, percent dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the `100%` cap, the signed over/under, and the non-positive / non-finite error seams. No new module;
re-pin `calc-accounting.js` on the `check:module-sizes` allowlist, and bump the `calc-accounting.test.js`
`ACCOUNTING_RENDERERS` exact-count assertion. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the `ACCOUNTING_RENDERERS` count bump, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the earned / over-under pair wraps on a
phone); render-no-nan + a11y sweep, output read to the value ($300k/$400k/$500k/$350k -> 75%, $375,000, +$25,000).

## 5. Roadmap position

Opens the contractor-billing trio: `change-order-markup` (v391) prices the scope changes that move the contract value, and
`retainage-tracker` (v392) handles the retention withheld from the billings this tile compares against. A full multi-period
WIP schedule with gross-profit-fade tracking is the deliberate next follow-on.
