# roughlogic.com Specification v391 -- Change Order Price with Overhead and Profit (calc-accounting.js, Group R, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Second tile of the contractor-billing trio (v390 WIP -> v391 change-order markup ->
> v392 retainage). `markup` prices a bid from cost by a single percentage; this tile prices a scope *change* the way a
> contract allows it -- direct cost, then the overhead-and-profit markup (commonly "10 and 10") the AIA A201 permits on a
> change order, with the effect on the contract total.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A change order is not priced like a bid; the contract
> (AIA A201 §7) allows the added *direct* cost of the changed work plus a stated overhead-and-profit markup. The common
> "10 and 10" applies overhead on the direct cost, then profit on cost-plus-overhead: `price = direct * (1 + overhead) *
> (1 + profit)`. `markup` gives a generic price-from-cost with one percentage; it does not layer the two-tier O&P a change
> order uses or report the new contract total. This adds the change-order tile to the existing **`calc-accounting.js`**
> module (Group R); no new group, trade, or dependency. Inherits spec.md through spec-v390.md.
>
> **The gap, and the evidence for it.** A change adding `$10,000` of direct cost (labor, material, equipment) at `10%`
> overhead and `10%` profit prices at `10000 * 1.10 * 1.10 = $12,100`; the `$2,100` markup is a `17.4%` net margin on the
> change-order price. The additive alternative (`10% + 10% = 20%` on cost) would price at `$12,000` -- the tile reports the
> compounded result and notes the difference, because which one applies is a contract term. No tile does this; a contractor
> pricing a CO reached for the generic `markup` and lost the two-tier structure.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The direct cost and the
current contract total are currency (USD); the overhead and profit rates are dimensionless (percent). The v18/v21 contract:
any non-finite input, or a negative direct cost or a negative rate, returns `{ error }`; the tile computes the compounded
overhead-then-profit price by default, reports the markup dollars, the margin percent, and the new contract total, and
carries the additive-method value as a secondary figure. Citation discipline (v19/v22): `GOVERNANCE.general` over
change-order pricing by name; `editionNote` names **AIA A201 §7 change-order pricing, the compounded overhead-and-profit
markup `price = direct * (1 + overhead) * (1 + profit)`, the common "10 and 10" rates, the additive alternative
`direct * (1 + overhead + profit)`, and margin `= markup / price`**, and states that **this returns the change-order price
and its effect on the contract total, that the actual O&P rates and whether they compound or add are contract terms, and
that it is an estimating aid, not a substitute for the contract's changes clause or a signed change order**.

## 2. The tile

### 2.1 `change-order-markup` -- Change Order Price with Overhead and Profit

```
inputs:
  direct_cost_usd     USD   added direct cost of the changed work (labor + material + equipment)
  overhead_pct        %     overhead markup (default 10)
  profit_pct          %     profit markup (default 10)
  current_contract_usd USD  contract total before this change (optional)

price      = direct_cost_usd * (1 + overhead_pct/100) * (1 + profit_pct/100)     (compounded)
markup     = price - direct_cost_usd
margin_pct = markup / price * 100
new_contract = current_contract_usd + price
```

**Pinned worked example ($10,000 direct, 10% and 10%).** `price = 10000*1.10*1.10 = $12,100`; markup `$2,100`;
`margin = 2100/12100 = 17.4%`. **Cross-check (additive method).** `10000*(1 + 0.10 + 0.10) = $12,000` -- `$100` less than
the compounded price, the difference the contract's wording decides. Applied to a `$500,000` contract the new total becomes
`$512,100`. A negative direct cost or rate takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `R`, trades `["accounting", "small-business", "construction"]`, beside `markup` /
`wip-percent-complete`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, AIA A201 §7,
`editionNote` naming the compounded and additive O&P formulas, the "10 and 10" default, and the margin relation);
`test/fixtures/worked-examples.json` (the compounded example + the additive cross-check); `test/fixtures/compute-map.js`
(`change-order-markup` -> `computeChangeOrderMarkup` in `../../calc-accounting.js`); `scripts/related-tiles.mjs` (->
`markup` / `wip-percent-complete` / `retainage-tracker` / `labor-burden-rate`); `data/search/aliases.json` ("change order
markup", "change order pricing", "overhead and profit", "10 and 10", "O&P markup", "AIA change order", "CO price", "scope
change cost", "contract change pricing"); the id appended to the existing accounting renderers block in `app.js`; the
`// dims:` annotation (currency amounts, rates dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the compounded-vs-additive difference, and the negative / non-finite error seams. No new
module; re-pin `calc-accounting.js` on the `check:module-sizes` allowlist, and bump the `calc-accounting.test.js`
`ACCOUNTING_RENDERERS` exact-count assertion. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the `ACCOUNTING_RENDERERS` count bump, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the price / margin / new-total wraps on a
phone); render-no-nan + a11y sweep, output read to the value ($10,000 / 10% / 10% -> $12,100, 17.4%).

## 5. Roadmap position

The middle of the contractor-billing trio: it moves the contract value that `wip-percent-complete` (v390) recognizes revenue
against, and its price flows into the billings that `retainage-tracker` (v392) withholds retention from. A labor-burden
tie-in that builds the direct cost from crew hours is the deliberate next follow-on.
