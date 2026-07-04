# roughlogic.com Specification v444 -- Surety Bond Premium (Tiered Rate) (calc-accounting.js, Group R, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of a contractor-cost trio (v444 surety bond premium -> v445 workers-comp EMR
> -> v446 prevailing-wage fringe). Public and larger private jobs require performance and payment bonds, and their premium is
> a real line-item cost no tile computes -- a tiered rate applied to the contract value.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A surety charges the bond premium on a sliding
> per-thousand schedule: the first band of contract value at the highest rate, later bands at lower rates. Summed across the
> bands, the premium is what a contractor must fold into a bid to carry the bond. The catalog has markup and overhead tiles
> but nothing for the bond premium. This adds the bond tile to the existing **`calc-accounting.js`** module (Group R); no new
> group, trade, or dependency. Inherits spec.md through spec-v443.md.
>
> **The gap, and the evidence for it.** On a `$500,000` contract at a typical schedule (`$25` per `$1,000` on the first
> `$100,000`, `$15` on the next `$400,000`), the premium is `100*25 + 400*15 = 2,500 + 6,000 = $8,500`, an effective rate of
> `8500/500000 = 1.70%`. A contractor who forgot the bond in the bid gives up that `1.70%` of margin. No tile does this; the
> premium had to be estimated off the surety's rate sheet by hand.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The contract value and the
premium are currency (USD); the per-thousand rates are rates (USD per USD 1,000); the effective rate is dimensionless
(percent). The v18/v21 contract: any non-finite input, or a non-positive contract value, returns `{ error }`; the tile
applies the tiered per-thousand schedule (with sensible defaults, overridable) and reports the premium and the effective
rate. Citation discipline (v19/v22): `GOVERNANCE.general` over the surety bond premium by name; `editionNote` names **the
SFAA/surety class-rate structure, the tiered per-`$1,000`-of-contract schedule (a common Class A guide: `~$25` per `$1,000`
on the first `$100,000`, `~$15` on the next `$400,000`, `~$10` on the next `$2,000,000`), the premium as the sum across
bands, and the effective rate as premium over contract**, and states that **this returns the estimated bond premium, that
actual rates depend on the contractor's bonding credit and the surety, and that it is an estimating aid, not a substitute
for the surety's quote**.

## 2. The tile

### 2.1 `surety-bond-premium` -- Surety Bond Premium (Tiered Rate)

```
inputs:
  contract_usd    USD   contract value to be bonded
  rate1_per_k     USD   rate per $1,000 on the first $100,000 (default 25)
  rate2_per_k     USD   rate per $1,000 on the next $400,000 (default 15)
  rate3_per_k     USD   rate per $1,000 above $500,000 (default 10)

band1 = min(contract, 100000) / 1000 * rate1_per_k
band2 = min(max(contract - 100000, 0), 400000) / 1000 * rate2_per_k
band3 = max(contract - 500000, 0) / 1000 * rate3_per_k
premium = band1 + band2 + band3
effective_rate = premium / contract
```

**Pinned worked example ($500,000 contract, 25/15/10 schedule).** `band1 = 100*25 = 2,500`; `band2 = 400*15 = 6,000`;
`premium = $8,500`; effective rate `1.70%`. **Cross-check (a bigger job blends lower).** A `$2,500,000` contract adds
`band3 = 2000*10 = $20,000` to the `$8,500`, for `$28,500` -- an effective rate of `1.14%`, lower because the top band is
cheaper. A non-positive contract takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `R`, trades `["accounting", "small-business", "construction"]`, beside `markup` /
`wip-percent-complete`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, surety bond premium,
`editionNote` naming the tiered schedule and the effective-rate relation); `test/fixtures/worked-examples.json` (the
$500k example + the $2.5M cross-check); `test/fixtures/compute-map.js` (`surety-bond-premium` -> `computeSuretyBondPremium`
in `../../calc-accounting.js`); `scripts/related-tiles.mjs` (-> `markup` / `wip-percent-complete` /
`workers-comp-emr-premium` / `change-order-markup`); `data/search/aliases.json` ("bond premium", "surety bond", "performance
bond cost", "payment bond premium", "bid bond", "bond rate", "contract bond premium", "sfaa bond", "bonding cost"); the id
appended to the existing accounting renderers block in `app.js`; the `// dims:` annotation (currency amounts, rates per
thousand, effective rate dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the band sum, and the non-positive / non-finite error seams. No new module; re-pin `calc-accounting.js` on the
`check:module-sizes` allowlist, and bump the `calc-accounting.test.js` `ACCOUNTING_RENDERERS` exact-count assertion.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the `ACCOUNTING_RENDERERS` count bump, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the premium / effective-rate output wraps
on a phone); render-no-nan + a11y sweep, output read to the value ($500,000 -> $8,500, 1.70%).

## 5. Roadmap position

Opens the contractor-cost trio: `workers-comp-emr-premium` (v445) and `prevailing-wage-fringe` (v446) continue the bid-cost
build-up. A bid-bond vs performance-bond split and a bonding-capacity (aggregate program) tile are the deliberate next
follow-ons.
