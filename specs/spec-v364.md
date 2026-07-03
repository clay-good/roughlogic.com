# roughlogic.com Specification v364 -- Overhead Recovery Rate (calc-accounting.js, Group R, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v362..v364 (the contractor-business trio -- labor burden
> (v362), equipment rate (v363), the overhead recovery rate (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog computes markup and margin, but not how a
> contractor recovers indirect overhead -- the office rent, admin salaries, trucks, and insurance that no single job pays
> for -- by spreading it across billable hours or as a markup on direct cost. Under-recovering overhead is the quiet way a
> busy contractor loses money, and no tile computes the recovery rate. Adds one tile to the existing **`calc-accounting.js`**
> module (Group R); no new group, trade, or dependency. Inherits spec.md through spec-v363.md.
>
> **The gap, and the evidence for it.** Overhead is recovered two equivalent ways: as a rate per billable hour,
> `overhead/hr = annual_overhead / annual_billable_hours`, or as a markup on direct cost, `overhead% = annual_overhead /
> annual_direct_cost`. For a shop with `$200,000` of annual overhead and 8,000 billable field hours, every billed hour must
> carry `200,000/8,000 = $25` of overhead; equivalently, on `$500,000` of annual direct cost, the overhead markup is
> `200,000/500,000 = 40%`. Miss it -- bid the job at direct cost plus a thin profit -- and the overhead comes out of the
> profit, then out of pocket. This is the number that must ride on top of the burdened labor and equipment rates before any
> profit is added. `markup` sets the profit; this tile sets the overhead the profit is added after.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The annual overhead, annual
direct cost, and a job's direct cost are currency; the annual billable hours are in hours; the overhead rate per hour is
currency per hour; the overhead markup is a dimensionless percentage. The v18/v21 contract: any non-finite input, or annual
billable hours or annual direct cost at or below zero, returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the overhead-recovery methods by name; `editionNote` names **the per-hour recovery
`overhead/hr = annual_overhead/annual_billable_hours`, the markup recovery `overhead% = annual_overhead/annual_direct_cost`,
the equivalence of the two bases, and that overhead is recovered before profit (a separate markup), per the construction
estimating references**, and states that **this returns the overhead recovery rate on the chosen basis -- it uses the
entered annual overhead and the billable-hours or direct-cost base (choose the base that matches how the estimate is built),
assumes the base is representative of the coming year (an over- or under-billed year misrecovers), and does not add profit
(`markup`) or the direct labor/equipment cost (`labor-burden-rate`, `equipment-hourly-rate`); and this is an estimating
aid** -- the actual overhead and volume govern.

## 2. The tile

### 2.1 `overhead-recovery-rate` -- Overhead Recovery Rate

```
inputs:
  annual_overhead   $     total annual indirect overhead
  basis             -     per-hour | markup
  billable_hours    hr    annual billable field hours (per-hour basis)
  annual_direct     $     annual direct cost (markup basis)
  job_direct        $     a job's direct cost (optional, to apply)

per-hour: rate_hr = annual_overhead / billable_hours
markup:   overhead_pct = annual_overhead / annual_direct * 100
apply:    job_overhead = job_direct * overhead_pct/100   (markup basis)
```

**Pinned worked example ($200,000 overhead, 8,000 billable hours).**
`rate = 200,000/8,000 = $25/hr` -- every billed field hour carries $25 of overhead. On the markup basis with `$500,000` of
annual direct cost, `overhead% = 200,000/500,000 = 40%`, so a job with `$10,000` of direct cost must add `$4,000` of
overhead. **Cross-check (a leaner overhead, $150,000, same volume).** `rate = 150,000/8,000 = $18.75/hr`; markup
`= 150,000/500,000 = 30%` -- cutting overhead $50,000 drops the recovery a quarter, directly widening the competitive
margin, the reason overhead control wins bids. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `R`, trades `["accounting","small-business","construction"]`, matching `markup-vs-margin`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the overhead-recovery methods, `editionNote`
naming both bases, their equivalence, the recover-before-profit rule, and the representative-year, no-profit caveats);
`test/fixtures/worked-examples.json` (the $200k example + the leaner cross-check); `test/fixtures/compute-map.js`
(`overhead-recovery-rate` -> `computeOverheadRecoveryRate` in `../../calc-accounting.js`); `scripts/related-tiles.mjs` (->
`labor-burden-rate` / `equipment-hourly-rate` / `markup` / `markup-vs-margin`); `data/search/aliases.json` ("overhead
recovery", "overhead rate", "overhead markup", "overhead per hour", "indirect cost recovery", "overhead allocation",
"burden rate overhead", "overhead per billable hour", "recover overhead"); the id appended to the existing accounting
renderers block in `app.js`; the `// dims:` annotation (currency values currency, `billable_hours` time, `overhead_pct`
percent, `rate_hr` currency/hour); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the two bases, the job-application, and the non-positive / non-finite error seams. No new module; re-pin
`calc-accounting.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the two-basis assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `rate_hr` / `overhead_pct` / job overhead stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value ($200k, 8,000 hr -> $25/hr, 40%).

## 5. Roadmap position

Closes the contractor-business batch (v362..v364) in `calc-accounting.js`: labor burden, equipment rate, and overhead
recovery now assemble the full cost stack a bid rides on, with `markup` adding the profit on top. A complete bid-rate
builder chaining burden + equipment + overhead + profit, an over/under-recovery variance tracker, and a two-rate (field vs
shop) overhead split are the deliberate next follow-ons once the trio lands.
