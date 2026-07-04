# roughlogic.com Specification v425 -- Invoice Factoring Cost and Effective APR (calc-trucking.js, Group J, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.147.0; proposed 2026-07-03). Third and final tile of the owner-operator finance trio (v423 detention billing ->
> v424 driver pay CPM vs percentage -> v425 invoice factoring cost). Owner-operators and small carriers factor their freight
> invoices for same-day cash; this tile shows what that cash costs -- the advance, the fee, the reserve, and the eye-opening
> effective annual rate.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A factoring company advances a percentage of an
> invoice now and charges a fee for it: `advance = invoice * advance_rate`, `fee = invoice * fee_rate`, and the reserve
> released later is `invoice - advance - fee`. Because the fee buys only a few weeks of cash, the effective annual rate is
> `fee_rate / advance_rate * (365 / days)` -- often far higher than a bank line. Nothing in the catalog computes factoring
> cost. This adds the factoring tile to the existing **`calc-trucking.js`** module (Group J); no new group, trade, or
> dependency. Inherits spec.md through spec-v424.md.
>
> **The gap, and the evidence for it.** Factoring a `$2,000` invoice at a `90%` advance and `3%` fee gives `$1,800` cash
> now, a `$60` fee, and `$140` reserve released when the customer pays. If the customer pays in `30 days`, the effective
> annual rate is `0.03/0.90 * (365/30) = 40.6%` -- the `3%` fee reads cheap until you annualize it. Seeing the APR is what
> tells an owner-operator whether factoring beats waiting `30 days` for the money. No tile does this.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The invoice amount and the
dollar outputs are currency (USD); the advance and fee rates are dimensionless (percent); the days are a time (days); the
effective APR is dimensionless (percent). The v18/v21 contract: any non-finite input, or a non-positive invoice, advance
rate, or days, or an advance rate at or above 100% (nothing held back is not factoring), returns `{ error }`; the tile
reports the advance, fee, reserve released, and the effective APR. Citation discipline (v19/v22): `GOVERNANCE.general` over
invoice factoring cost by name; `editionNote` names **the factoring math `advance = invoice * advance_rate`,
`fee = invoice * fee_rate`, `reserve = invoice - advance - fee`, and the effective annual rate
`= fee_rate / advance_rate * (365 / days)`, distinguishing recourse from non-recourse factoring**, and states that **this
returns the factoring proceeds and the annualized cost of the cash, that fee schedules can be flat or tiered by age and
recourse terms vary, and that it is a business aid, not a substitute for the factoring agreement**.

## 2. The tile

### 2.1 `invoice-factoring-cost` -- Invoice Factoring Cost and Effective APR

```
inputs:
  invoice_usd     USD   invoice (freight bill) amount
  advance_pct     %     advance rate (typ 90-97%)
  fee_pct         %     factoring fee (typ 1-5%)
  days_to_pay     days  time until the customer pays

advance     = invoice_usd * advance_pct/100
fee         = invoice_usd * fee_pct/100
reserve     = invoice_usd - advance - fee
apr_percent = (fee_pct/advance_pct) * (365/days_to_pay) * 100
```

**Pinned worked example ($2,000 invoice, 90% advance, 3% fee, 30 days).** `advance = $1,800`; `fee = $60`;
`reserve = 2000 - 1800 - 60 = $140`; `APR = (3/90)*(365/30)*100 = 40.6%`. **Cross-check (faster payment is cheaper).** If
the customer pays in `15 days` the same `3%` fee annualizes to `81.1%` -- the shorter the cash is out, the higher the
annualized cost of a fixed fee. A non-positive invoice or days, or an advance rate at/above 100%, takes the error path; the
non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `J`, trades `["trucking", "small-business"]`, beside `load-profitability` / `cost-per-mile`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, invoice factoring, `editionNote` naming the
advance/fee/reserve and effective-APR relations and the recourse distinction); `test/fixtures/worked-examples.json` (the
30-day example + the 15-day cross-check); `test/fixtures/compute-map.js` (`invoice-factoring-cost` ->
`computeInvoiceFactoringCost` in `../../calc-trucking.js`); `scripts/related-tiles.mjs` (-> `load-profitability` /
`cost-per-mile` / `driver-pay-cpm-vs-percentage` / `detention-demurrage-billing`); `data/search/aliases.json` ("invoice
factoring", "factoring cost", "freight factoring", "factoring apr", "accounts receivable factoring", "advance rate
factoring", "factoring fee", "owner operator factoring", "freight bill factoring"); the id appended to the existing trucking
renderers block in `app.js`; the `// dims:` annotation (currency amounts, rates dimensionless, days time); regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the APR relation, and the advance-rate /
non-positive / non-finite error seams. No new module; re-pin `calc-trucking.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the APR, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the advance / fee / reserve / APR set wraps on a phone);
render-no-nan + a11y sweep, output read to the value ($2,000, 90%, 3%, 30 d -> $1,800, 40.6% APR).

## 5. Roadmap position

Closes the owner-operator finance trio: v423 detention, v424 driver pay, and v425 the factoring that turns a slow-paying
invoice into today's cash. A recourse-vs-non-recourse fee comparison and a quick-pay-discount-vs-factoring tile are the
deliberate next follow-ons.
