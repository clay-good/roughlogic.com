# roughlogic.com Specification v403 -- BRRRR Cash-Out Refinance and Capital Left In (calc-realestate.js, Group X, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Second tile of the real-estate-investing trio (v402 fix-and-flip -> v403 BRRRR refi ->
> v404 rental total return). The flip's buy-and-hold cousin: instead of selling, the investor refinances at the after-repair
> value, pulls cash back out, and keeps the property as a rental. This tile computes how much cash the refi returns and how
> much stays trapped in the deal.**
> In-scope catalog expansion under the spec-v106 trades-only charter. In the BRRRR strategy (buy, rehab, rent, refinance,
> repeat), a cash-out refinance at a target loan-to-value of the after-repair value returns capital so it can be redeployed.
> The new loan is `refi_LTV * ARV`, the cash returned is that loan less any existing balance paid off, and the capital left
> in the deal is the total invested minus the cash returned. When the cash returned exceeds the investment, all capital is
> recovered and the cash-on-cash return is effectively infinite. `cash-on-cash` assumes a fixed cash stake; nothing computes
> the trapped capital after a refinance. This adds the BRRRR tile to the existing **`calc-realestate.js`** module (Group X);
> no new group, trade, or dependency. Inherits spec.md through spec-v402.md.
>
> **The gap, and the evidence for it.** A property with `$200,000` ARV and `$140,000` all-in invested, refinanced at a
> `75%` LTV, produces a new loan of `0.75 * 200000 = $150,000`. With no existing loan to pay off, the cash returned is
> `$150,000` and the capital left in is `140000 - 150000 = -$10,000` -- the investor pulled out `$10,000` more than went in,
> recovering all capital plus a bit, an infinite cash-on-cash return. Push the investment to `$160,000` and `$10,000` stays
> trapped; at a `$2,400/yr` cash flow that is a `24%` return on the remaining stake. No tile does this; `cash-on-cash`
> could not model the refinance that defines BRRRR.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. All money inputs and outputs
are currency (USD); the refi LTV is dimensionless (percent); the annual cash flow is currency; the post-refi return is
dimensionless (percent). The v18/v21 contract: any non-finite input, or a non-positive ARV or total invested, or an LTV
outside `0 to 100%`, returns `{ error }`; the capital left in is signed (negative means over-recovered), the tile flags the
infinite-return case when it is at or below zero, and the post-refi cash-on-cash is computed only when capital left in is
positive. Citation discipline (v19/v22): `GOVERNANCE.general` over the BRRRR refinance by name; `editionNote` names **the
BRRRR method, the new loan `= refi_LTV * ARV`, cash returned `= new loan - existing payoff`, capital left in `= total
invested - cash returned`, and post-refi cash-on-cash `= annual cash flow / capital left in` (infinite when capital left in
<= 0)**, and states that **this returns the refinance proceeds and trapped capital, that a `70` to `75%` seasoned LTV and an
appraisal at ARV are assumptions, and that it is an underwriting aid, not a substitute for a lender's terms or an
appraisal**.

## 2. The tile

### 2.1 `brrrr-refi` -- BRRRR Cash-Out Refinance and Capital Left In

```
inputs:
  arv_usd            USD   after-repair value (appraised)
  total_invested_usd USD   all-in cash (purchase + rehab + costs)
  refi_ltv_pct       %     cash-out refinance loan-to-value
  existing_payoff_usd USD  existing loan balance to pay off (default 0)
  annual_cash_flow_usd USD annual cash flow after the new payment (optional)

new_loan     = arv_usd * refi_ltv_pct/100
cash_returned = new_loan - existing_payoff_usd
capital_left  = total_invested_usd - cash_returned
coc = capital_left > 0 ? annual_cash_flow_usd / capital_left : Infinity (all capital recovered)
```

**Pinned worked example ($200k ARV, $140k invested, 75% LTV, no payoff).** new loan `$150,000`; cash returned `$150,000`;
capital left `140000 - 150000 = -$10,000` -> all capital recovered, infinite cash-on-cash. **Cross-check (some capital
stays).** At `$160,000` invested, capital left is `$10,000`; with `$2,400/yr` cash flow the post-refi return is
`2400/10000 = 24%`. An LTV outside `0 to 100%`, or a non-positive ARV/investment, takes the error path; the non-finite seam
is covered.

## 3. Wiring

A `tools-data.js` row (group `X`, trades `["real-estate", "small-business"]`, beside `cash-on-cash` / `fix-flip-profit`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the BRRRR method, `editionNote` naming the new
loan, cash returned, capital left, and post-refi CoC relations and the infinite-return case);
`test/fixtures/worked-examples.json` (the all-recovered example + the capital-remains cross-check);
`test/fixtures/compute-map.js` (`brrrr-refi` -> `computeBrrrrRefi` in `../../calc-realestate.js`); `scripts/related-tiles.mjs`
(-> `cash-on-cash` / `fix-flip-profit` / `rental-total-return` / `cap-rate-dscr`); `data/search/aliases.json` ("brrrr",
"cash out refinance", "brrrr calculator", "capital left in deal", "refinance rental", "infinite return real estate", "brrrr
refi", "pull cash out rental", "seasoned refinance"); the id appended to the existing real-estate renderers block in
`app.js`; the `// dims:` annotation (currency amounts, LTV/return dimensionless); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the infinite-return flag, the signed capital-left, and the
out-of-range-LTV / non-finite error seams. No new module; re-pin `calc-realestate.js` on the `check:module-sizes`
allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the infinite-return case, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the new-loan / capital-left / CoC set wraps on a
phone); render-no-nan + a11y sweep, output read to the value ($200k ARV, 75% LTV -> $150,000 loan, -$10,000 left).

## 5. Roadmap position

The middle of the real-estate-investing trio: it turns a `fix-flip-profit` (v402) deal into a keep-and-refinance, and the
property it leaves behind is measured over time by `rental-total-return` (v404). A DSCR-limited refinance mode (loan capped
by the rent-supported debt service) is the deliberate next follow-on.
