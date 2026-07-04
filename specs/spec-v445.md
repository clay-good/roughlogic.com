# roughlogic.com Specification v445 -- Workers-Comp Premium and Experience Mod (calc-accounting.js, Group R, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Second tile of the contractor-cost trio (v444 surety bond premium -> v445 workers-comp
> EMR -> v446 prevailing-wage fringe). `labor-burden-rate` folds workers-comp in as a flat percent of wages; this tile
> isolates the piece a contractor actually controls -- the experience modification rate (EMR) and its dollar swing on the
> premium.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A workers-compensation premium is the manual premium
> (`payroll / 100 * class_rate`) times the experience modification rate (EMR), an insurer's factor above or below `1.0` that
> rewards a good safety record. The EMR swing is the dollar difference from a `1.0` mod, the amount a safety program earns or
> a bad year costs. `labor-burden-rate` buries this in a flat percentage; nothing exposes the EMR-driven premium. This adds
> the workers-comp tile to the existing **`calc-accounting.js`** module (Group R); no new group, trade, or dependency.
> Inherits spec.md through spec-v444.md.
>
> **The gap, and the evidence for it.** A `$500,000` payroll at an `$8.00` per `$100` class rate has a manual premium of
> `500000/100 * 8 = $40,000`; a `0.85` EMR (a clean safety record) brings it to `40000 * 0.85 = $34,000`, a `$6,000` saving
> versus a `1.0` mod, and the cost per `$100` of payroll falls from `$8.00` to `$6.80`. A `1.15` EMR would instead add
> `$6,000`. That swing is the direct dollar value of jobsite safety. No tile does this.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The payroll and the premiums
are currency (USD); the class rate is a rate (USD per USD 100 of payroll); the EMR is dimensionless. The v18/v21 contract:
any non-finite input, or a non-positive payroll, class rate, or EMR, returns `{ error }`; the tile reports the manual
premium, the EMR-modified premium, the swing from a `1.0` mod, and the modified cost per `$100` of payroll. Citation
discipline (v19/v22): `GOVERNANCE.general` over the workers-comp experience-rating premium by name; `editionNote` names
**the NCCI experience-rating structure, the manual premium `= payroll/100 * class_rate`, the modified premium
`= manual * EMR`, the EMR swing `= manual * (1 - EMR)`, and the class rate as the state/NCCI rate per `$100` of payroll by
classification code**, and states that **this returns the workers-comp premium and the EMR dollar swing, that class rates
and the EMR come from the carrier and the rating bureau, that schedule credits/debits and assessments are additional, and
that it is an estimating aid, not a substitute for the insurance quote**.

## 2. The tile

### 2.1 `workers-comp-emr-premium` -- Workers-Comp Premium and Experience Mod

```
inputs:
  payroll_usd    USD   annual payroll for the classification
  class_rate     USD   manual rate per $100 of payroll
  emr            -     experience modification rate

manual_premium = payroll_usd / 100 * class_rate
modified_premium = manual_premium * emr
emr_swing = manual_premium * (1 - emr)
cost_per_100 = modified_premium / (payroll_usd / 100)
```

**Pinned worked example ($500,000 payroll, $8.00/$100, EMR 0.85).** `manual = $40,000`; `modified = 40000*0.85 = $34,000`;
`swing = $6,000` saved; cost per `$100` of payroll `= $6.80`. **Cross-check (a bad safety year).** At `EMR 1.15` the modified
premium rises to `$46,000`, a `$6,000` penalty and `$9.20` per `$100` -- the same swing, the other direction. A non-positive
payroll, rate, or EMR takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `R`, trades `["accounting", "small-business", "construction"]`, beside `labor-burden-rate`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, NCCI experience rating, `editionNote` naming
the manual/modified premium, the EMR swing, and the class-rate definition); `test/fixtures/worked-examples.json` (the
0.85 example + the 1.15 cross-check); `test/fixtures/compute-map.js` (`workers-comp-emr-premium` ->
`computeWorkersCompEmrPremium` in `../../calc-accounting.js`); `scripts/related-tiles.mjs` (-> `labor-burden-rate` /
`surety-bond-premium` / `prevailing-wage-fringe` / `employer-payroll-tax`); `data/search/aliases.json` ("workers comp
premium", "experience mod", "emr", "workers compensation cost", "mod rate", "comp class rate", "emr swing", "workers comp
calculator", "safety savings comp"); the id appended to the existing accounting renderers block in `app.js`; the `// dims:`
annotation (currency amounts, class rate per hundred, EMR dimensionless); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the EMR swing, and the non-positive / non-finite error seams. No new
module; re-pin `calc-accounting.js` on the `check:module-sizes` allowlist, and bump the `calc-accounting.test.js`
`ACCOUNTING_RENDERERS` exact-count assertion. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the `ACCOUNTING_RENDERERS` count bump, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the manual / modified / swing set wraps
on a phone); render-no-nan + a11y sweep, output read to the value ($500,000, $8.00, 0.85 -> $34,000, $6,000 swing).

## 5. Roadmap position

The middle of the contractor-cost trio: `surety-bond-premium` (v444) and `prevailing-wage-fringe` (v446) bracket it. A
multi-class blended-premium mode and a safety-program ROI (EMR-improvement payback) tile are the deliberate next follow-ons.
