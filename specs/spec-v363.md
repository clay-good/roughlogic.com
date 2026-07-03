# roughlogic.com Specification v363 -- Equipment Owning and Operating Hourly Rate (calc-accounting.js, Group R, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.127.0). Batch spec-v362..v364 (the contractor-business trio -- labor burden
> (v362), the equipment owning-and-operating hourly rate (this spec), overhead recovery (v364)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `cost-per-mile` gives a truck's per-mile cost, but a
> contractor rents or charges out equipment by the hour, and the owning-and-operating rate -- depreciation, interest,
> insurance, fuel, maintenance, and wear per operating hour -- is the number that sets an internal charge rate or a rental
> break-even. The catalog computes it for trucks by the mile, not equipment by the hour. Adds one tile to the existing
> **`calc-accounting.js`** module (Group R); no new group, trade, or dependency. Inherits spec.md through spec-v362.md.
>
> **The gap, and the evidence for it.** The equipment hourly rate splits into owning and operating costs. Owning:
> depreciation `= (purchase - salvage)/life_hours`, plus interest/insurance/taxes on the average investment. Operating:
> fuel, maintenance, and tires/wear per hour. For a `$50,000` skid steer with a `$10,000` salvage over a 5,000-hour life,
> depreciation is `40,000/5,000 = $8.00/hr`; interest, insurance, and tax at 8% of the `$30,000` average value over 1,000
> hr/yr add `$2.40/hr`, for `$10.40/hr` owning; fuel at 2 gal/hr x $4 = `$8.00`, maintenance `$4.00`, and wear `$1.00` give
> `$13.00/hr` operating -- a total `$23.40/hr` to own and run the machine, the rate an estimate must recover or a rental
> must beat. `cost-per-mile` does this for the road; this tile does it for the hour meter.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The purchase price and salvage
are currency; the life is in hours; the interest/insurance/tax rate is a dimensionless percentage of average value; the fuel
burn is a volume per hour and fuel price a currency per volume; the per-hour maintenance and wear are currency per hour;
the owning, operating, and total rates are currency per hour. The v18/v21 contract: any non-finite input, or a purchase
price, life, or annual-hours at or below zero, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over
the owning-and-operating (O&O) method by name; `editionNote` names **the owning cost = depreciation
`(purchase - salvage)/life_hours` plus interest/insurance/tax on the average investment `(purchase + salvage)/2`, the
operating cost = fuel + maintenance + tires/wear per hour, and the AED/Caterpillar-Handbook O&O method**, and states that
**this returns the equipment owning-and-operating hourly rate -- it uses straight-line depreciation over an hour-based life
(a usage-based or declining-balance schedule differs), the average-investment interest method, and the entered operating
components, and does not add the operator's labor (`labor-burden-rate`), mobilization, or overhead/profit (`overhead-
recovery-rate`, `markup`); and this is an estimating aid** -- the actual acquisition, financing, and maintenance costs
govern.

## 2. The tile

### 2.1 `equipment-hourly-rate` -- Equipment Owning and Operating Hourly Rate

```
inputs:
  purchase    $        purchase price
  salvage     $        salvage/residual value
  life_hr     hr       useful life in hours
  annual_hr   hr       hours operated per year
  iit_pct     %        interest + insurance + tax, % of average value per year
  fuel_gph    gal/hr   fuel burn
  fuel_price  $/gal    fuel price
  maint_hr    $/hr     maintenance per hour
  wear_hr     $/hr     tires/wear per hour

deprec = (purchase - salvage)/life_hr
iit = (iit_pct/100) * ((purchase + salvage)/2) / annual_hr
owning = deprec + iit
operating = fuel_gph*fuel_price + maint_hr + wear_hr
total = owning + operating
```

**Pinned worked example (a $50,000 skid steer, $10,000 salvage, 5,000-hr life, 1,000 hr/yr).**
`deprec = 40,000/5,000 = $8.00/hr`; `iit = 0.08 x 30,000/1,000 = $2.40/hr`; owning `= $10.40/hr`; operating
`= 2 x 4.00 + 4.00 + 1.00 = $13.00/hr`; total `= $23.40/hr`. **Cross-check (run it more, 2,000 hr/yr).** The interest term
halves (`iit = 0.08 x 30,000/2,000 = $1.20/hr`), so owning drops to `$9.20/hr` and the total to `$22.20/hr` -- using a
machine more spreads its fixed cost thinner, the utilization effect that makes an idle machine expensive. The non-finite
and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `R`, trades `["accounting","small-business","construction"]`, matching `cost-per-mile`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the O&O method, `editionNote` naming the
depreciation and average-investment terms, the operating components, the AED/Cat basis, and the straight-line, no-operator-
labor caveats); `test/fixtures/worked-examples.json` (the 1,000 hr example + the 2,000 hr cross-check);
`test/fixtures/compute-map.js` (`equipment-hourly-rate` -> `computeEquipmentHourlyRate` in `../../calc-accounting.js`);
`scripts/related-tiles.mjs` (-> `cost-per-mile` / `labor-burden-rate` / `straight-line-depreciation` /
`overhead-recovery-rate`); `data/search/aliases.json` ("equipment hourly rate", "owning and operating cost", "machine
hourly rate", "equipment cost per hour", "O&O rate", "internal charge rate equipment", "equipment rental break-even",
"depreciation per hour", "machine rate"); the id appended to the existing accounting renderers block in `app.js`; the
`// dims:` annotation (currency values currency, `life_hr`/`annual_hr` time, percentages/rates as noted); regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the depreciation and average-investment terms,
the utilization effect, and the non-positive / non-finite error seams. No new module; re-pin `calc-accounting.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the owning/operating split assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the owning / operating / total stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value ($50k skid steer -> $23.40/hr).

## 5. Roadmap position

Middle of the contractor-business batch (v362..v364) in `calc-accounting.js`, adding the equipment rate to the labor
burden. Overhead recovery (v364) follows. A usage-based (declining-balance) depreciation option, an operator-plus-machine
combined rate, and a rental-vs-own break-even are the deliberate next follow-ons once the trio lands.
