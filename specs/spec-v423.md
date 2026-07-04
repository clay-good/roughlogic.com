# roughlogic.com Specification v423 -- Detention Billing and Opportunity Cost (calc-trucking.js, Group J, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.147.0; proposed 2026-07-03). First tile of an owner-operator finance trio (v423 detention billing -> v424 driver pay
> CPM vs percentage -> v425 invoice factoring cost). The catalog costs the truck (`cost-per-mile`, `load-profitability`) but
> never the detention a shipper owes when they hold a driver past free time -- both the billable charge and the revenue the
> tied-up truck lost.**
> In-scope catalog expansion under the spec-v106 trades-only charter. When a shipper or receiver holds a truck past the free
> time, the carrier bills detention: `billable = max(0, actual_hours - free_hours) * rate`. Beyond the invoice, the idle
> hours cost the truck the revenue it could have earned moving, an opportunity cost `= detention_hours * truck_revenue_per_hour`.
> `load-profitability` nets a load but ignores detention. This adds the detention tile to the existing **`calc-trucking.js`**
> module (Group J); no new group, trade, or dependency. Inherits spec.md through spec-v422.md.
>
> **The gap, and the evidence for it.** A driver held `5 hours` against `2 hours` free time at `$50/hr` detention bills
> `(5 - 2) * 50 = $150`; meanwhile those `3` idle hours, at a truck earning `$80/hr` on the road, cost `3 * 80 = $240` in
> lost revenue -- so the `$150` detention charge does not even cover the opportunity cost. Seeing both numbers is what tells
> an owner-operator whether to accept a facility's reputation for slow loading. No tile does this.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The free time, actual time, and
detention hours are times (hr); the detention rate is a rate (USD/hr); the truck revenue is a rate (USD/hr); the billable
charge and opportunity cost are currency (USD). The v18/v21 contract: any non-finite input, or a negative time or rate,
returns `{ error }`; billable detention is floored at zero (arriving within free time bills nothing), and the tile reports
the billable charge, the detention hours, and the opportunity cost. Citation discipline (v19/v22): `GOVERNANCE.general` over
carrier detention/accessorial billing by name; `editionNote` names **the standard detention accessorial (free time then a
per-hour rate), `billable = max(0, actual - free) * rate`, and the opportunity cost `= detention_hours *
truck_revenue_per_hour`**, and states that **this returns the billable detention and the lost-revenue opportunity cost, that
free time and rates are contract/tariff terms and detention must be documented, and that it is a business aid, not a
substitute for the rate confirmation or the carrier's tariff**.

## 2. The tile

### 2.1 `detention-demurrage-billing` -- Detention Billing and Opportunity Cost

```
inputs:
  free_hours          hr       free (no-charge) time
  actual_hours        hr       total time at the facility
  rate_usd_hr         USD/hr   detention rate after free time
  truck_rev_usd_hr    USD/hr   truck revenue per hour on the road (optional)

detention_hours = max(0, actual_hours - free_hours)
billable        = detention_hours * rate_usd_hr
opportunity     = detention_hours * truck_rev_usd_hr
```

**Pinned worked example (2 hr free, 5 hr actual, $50/hr, $80/hr truck).** `detention = 3 hr`; `billable = 3*50 = $150`;
`opportunity = 3*80 = $240` -- the detention charge does not cover the lost revenue. **Cross-check (within free time).** At
`actual = 1.5 hr` the detention hours are zero, so nothing bills and no opportunity cost accrues. A negative time or rate
takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `J`, trades `["trucking"]`, beside `load-profitability` / `cost-per-mile`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, carrier detention accessorial, `editionNote` naming the
billable and opportunity-cost relations and the documentation caveat); `test/fixtures/worked-examples.json` (the detention
example + the within-free-time cross-check); `test/fixtures/compute-map.js` (`detention-demurrage-billing` ->
`computeDetentionDemurrageBilling` in `../../calc-trucking.js`); `scripts/related-tiles.mjs` (-> `load-profitability` /
`cost-per-mile` / `driver-pay-cpm-vs-percentage` / `fuel-surcharge`); `data/search/aliases.json` ("detention billing",
"demurrage", "detention pay", "truck detention", "free time detention", "accessorial detention", "detention rate",
"shipper detention", "waiting time charge"); the id appended to the existing trucking renderers block in `app.js`; the
`// dims:` annotation (times time, rates USD/time, charges currency); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the zero-floor, and the negative / non-finite error seams. No new
module; re-pin `calc-trucking.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the zero-floor, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the billable / opportunity pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (2 free, 5 actual, $50 -> $150 billable, $240 opportunity).

## 5. Roadmap position

Opens the owner-operator finance trio: `driver-pay-cpm-vs-percentage` (v424) and `invoice-factoring-cost` (v425) round out
the carrier-business math. A layover-plus-detention combined accessorial and a per-facility detention-frequency tracker are
the deliberate next follow-ons.
