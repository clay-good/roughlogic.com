# roughlogic.com Specification v344 -- Debt Yield (calc-realestate.js, Group X, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v344..v346 (the real-estate underwriting trio -- the lender
> and investor metrics the cap-rate/DSCR tile leaves out: the debt yield (this spec), the break-even occupancy (v345), and
> the fix-and-flip 70% max-offer rule (v346).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `cap-rate-dscr` computes NOI/value and NOI/debt-
> service, but the debt yield -- NOI divided by the loan amount -- is the leverage-independent lender metric that has
> largely replaced DSCR and LTV in commercial underwriting, and the catalog does not compute it. Adds one tile to the
> existing **`calc-realestate.js`** module (Group X); no new group, trade, or dependency. Inherits spec.md through
> spec-v343.md.
>
> **The gap, and the evidence for it.** Debt yield is the property's net operating income as a percentage of the loan
> amount, `DY = NOI / loan x 100` -- the return a lender would earn if it foreclosed and took the income, so it ignores the
> interest rate, amortization, and cap rate that DSCR and LTV depend on. For a property with `$120,000` NOI and a
> `$1,500,000` loan, `DY = 120,000/1,500,000 = 8.0%`; most commercial lenders set a floor of 9% to 10%, so this loan would
> be sized down until the debt yield clears the minimum. Because it strips out the financing assumptions, debt yield is the
> one ratio a lender cannot be talked out of with a lower rate or a longer amortization. `cap-rate-dscr` covers the
> value-and-coverage ratios; this tile adds the loan-sizing one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The net operating income and
the loan amount are currency; the debt yield and the lender minimum are dimensionless percentages; the maximum loan at a
target debt yield is currency. The v18/v21 contract: any non-finite input, or a loan amount at or below zero, returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the debt-yield definition by name; `editionNote`
names **the debt yield `DY = NOI / loan amount`, the maximum supportable loan `= NOI / DY_min`, the leverage-independence
(no rate/amortization/cap-rate inputs), and the common 9-10% lender floor, as compiled in the CRE underwriting
references**, and states that **this returns the debt yield and the loan the target debt yield supports -- it uses a
stabilized NOI (a pro-forma or in-place figure as entered), is a loan-sizing screen (the loan is the lesser of the LTV-,
DSCR-, and debt-yield-constrained amounts), and does not compute the NOI itself (`rental-worksheet`) or the DSCR/LTV
(`cap-rate-dscr`); and this is an underwriting aid, not a lending commitment** -- the lender's underwriting governs.

## 2. The tile

### 2.1 `debt-yield` -- Debt Yield

```
inputs:
  noi        $      net operating income (annual)
  loan       $      loan amount (for debt yield); OR
  dy_target  %      target minimum debt yield (for max loan)

DY = noi / loan * 100                              ; debt yield, %
max_loan = noi / (dy_target/100)                   ; loan the target DY supports, $
```

**Pinned worked example (NOI $120,000, loan $1,500,000).** `DY = 120,000/1,500,000 x 100 = 8.0%` -- below a typical 10%
lender floor. **Cross-check (size the loan to a 10% debt yield).** `max_loan = 120,000/0.10 = $1,200,000` -- the debt-yield
constraint caps the loan at $1.2M, $300K less than requested, regardless of how low the rate or how long the amortization,
the reason debt yield became the binding constraint in tight credit. The non-finite and non-positive error paths bracket
the result.

## 3. Wiring

A `tools-data.js` row (group `X`, trades `["real-estate","small-business"]`, matching `cap-rate-dscr`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the debt-yield definition, `editionNote` naming
`DY = NOI/loan`, `max_loan = NOI/DY_min`, the leverage-independence, the 9-10% floor, and the stabilized-NOI, loan-sizing-
screen caveats); `test/fixtures/worked-examples.json` (the debt-yield example + the max-loan cross-check);
`test/fixtures/compute-map.js` (`debt-yield` -> `computeDebtYield` in `../../calc-realestate.js`);
`scripts/related-tiles.mjs` (-> `cap-rate-dscr` / `rental-worksheet` / `break-even-occupancy` / `loan-payment`);
`data/search/aliases.json` ("debt yield", "debt yield ratio", "NOI over loan", "loan sizing", "lender debt yield", "CRE
debt yield", "minimum debt yield", "maximum loan amount", "debt yield underwriting"); the id appended to the existing
realestate renderers block in `app.js`; the `// dims:` annotation (`noi`/`loan`/`max_loan` currency, `DY`/`dy_target`
percent); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the `NOI/loan` and
`NOI/DY` forms, and the non-positive / non-finite error seams. No new module; re-pin `calc-realestate.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the max-loan assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `DY` / `max_loan` pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (NOI 120k, loan 1.5M -> 8.0%).

## 5. Roadmap position

Opens the real-estate underwriting batch (v344..v346) in `calc-realestate.js`, adding the loan-sizing metric to the
cap-rate/DSCR tile. The break-even occupancy (v345) and the 70% rule (v346) follow. A lesser-of LTV/DSCR/debt-yield loan-
sizing summary, a stressed-NOI sensitivity, and a chain from `rental-worksheet` NOI are the deliberate next follow-ons once
the trio lands.
