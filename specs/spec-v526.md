# roughlogic.com Specification v526 -- Net Effective Rent (Lease Concessions) (calc-realestate.js, Group X, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-realestate.js`**
> (Group X, real estate); no new module, group, or dependency. Inherits spec.md through spec-v525.md.
>
> **The gap, and the evidence for it.** `rent-roll-vacancy` and `rental-worksheet` handle income and vacancy but neither
> nets lease concessions down to the rate a tenant actually pays. Landlords quote the high **face** rent and then bury
> months of free rent and tenant-improvement credits to move a deal, so the number on the term sheet is not the number
> to compare between competing offers. Net effective rent spreads the concessions across the full term: a five-year
> lease at a high face rate with several months free can carry an effective rate 10 to 20% below face. The tile takes
> the face rent, the term, the free-rent months, and any one-time credit, and returns the net effective rent, the total
> savings, and the percent discount off face -- the apples-to-apples number for choosing between a low-face/no-
> concession deal and a high-face/big-concession one. It reports a straight-line (undiscounted) effective rent, not a
> present-value one, which is the common broker convention.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Every quantity is carried
as `dimensionless` to the lint (currency rents, credits, and savings are not physical dimensions, matching the existing
real-estate tiles), with the lease term and free-rent period as month counts. The v18/v21 contract: any non-finite
input, a non-positive face rent or term, a free-rent period at or above the term, or a negative one-time credit returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the net-effective-rent relation by name (Appraisal
Institute income approach; standard commercial-lease concession practice); `editionNote` names the **net effective rent
(straight-line concession spread)**, prints `paid = face_rent x (term - free_months)`,
`NER = (paid - one_time_credit) / term`, and `discount_pct = (1 - NER / face_rent) x 100`, and states that **the face
rent is the quoted rate before concessions and the net effective rent is the rate actually paid after free rent and
credits are spread over the full term, this is a straight-line average not a present-value (discounted) effective rent,
escalations and operating-expense pass-throughs change the picture, and the executed lease governs** -- a comparison
aid, not lease terms.

## 2. The tile

### 2.1 `net-effective-rent` -- The Rate a Tenant Actually Pays After the Free Rent Is Buried

```
inputs:
  face_rent          $/period   quoted face (base) rent per period ($/SF/yr or $/mo)
  term_periods       -          lease term in the same period units
  free_periods       -          free-rent periods granted
  one_time_credit    $          one-time TI / concession credit spread over the term (0 if none)

paid         = face_rent x (term_periods - free_periods)                 [$]
NER          = (paid - one_time_credit) / term_periods                   [$/period]
total_saving = face_rent x term_periods - (paid - one_time_credit)       [$]
discount_pct = (1 - NER / face_rent) x 100                                [%]
```

**Pinned worked example (a $40/SF face rent, 120-month term, 10 months free).** The tenant pays
`40 x (120 - 10) = $4,400/SF` over the term, so `NER = 4,400 / 120 = ` **$36.67/SF/yr** -- a discount of
`(1 - 36.67/40) x 100 = ` **8.3%** off the quoted face rate, the number that actually compares to a competing offer.
**Cross-check (a TI credit deepens the effective discount).** Add a one-time `$5/SF` improvement credit spread over the
term: `NER = (4,400 - 5) / 120 = ` **$36.63/SF/yr** -- a slightly larger effective concession, and on a big credit the
gap from face widens fast. The tile returns the net effective rent, the total savings, and the percent discount.

## 3. Wiring

A `tools-data.js` row (group `X`, trades `["real-estate"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the free-rent example + the
TI-credit cross-check); `test/fixtures/compute-map.js` (`net-effective-rent` -> `computeNetEffectiveRent` in
`../../calc-realestate.js`); `scripts/related-tiles.mjs` (-> `rent-roll-vacancy` / `rental-worksheet` /
`commercial-load-factor`); `data/search/aliases.json` ("net effective rent", "lease concessions", "free rent",
"effective rent", "face vs effective rent", "ti allowance", "concession spread", "commercial lease rate"); the id
appended to the real-estate renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-
index; a `bounds-fuzzer.test.js` block pinning both examples, the concession spread, the discount percent, and the error
seams (non-finite, non-positive face / term, free >= term, negative credit). Hand-writes its renderer (mirroring the
calc-realestate.js `rental-worksheet` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the paid / NER / discount stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the 10-months-free example -> $36.67/SF, 8.3% discount).

## 5. Roadmap position

Adds the concession-adjusted rate beside `rent-roll-vacancy` (income) and points at `commercial-load-factor` (the
rentable/usable adjustment that stacks on top). A present-value (discounted) effective-rent variant and a stepped-
escalation schedule are deliberate future follow-ons. Further Group X growth stays evidence-driven.
