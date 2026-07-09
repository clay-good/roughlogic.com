# roughlogic.com Specification v530 -- Reorder Point and Safety Stock (calc-accounting.js, Group R, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-accounting.js`**
> (Group R, accounting and small business); no new module, group, or dependency. Inherits spec.md through spec-v529.md.
>
> **The gap, and the evidence for it.** `eoq-order-quantity` sizes the order; this tile times it. The reorder point is
> the on-hand level that triggers a new order so stock does not run out before it arrives, and it has two parts:
> the demand expected during the lead time, plus a safety-stock buffer against demand that runs hot. The catch is the
> buffer's economics. Safety stock scales with the **square root** of the lead time and with the service level's
> z-score, so chasing the last few points of coverage is expensive: moving from 95% to 99% service roughly doubles the
> buffer for a 4-point gain. A small business that sets safety stock by gut either stocks out (too little) or ties up
> cash in a warehouse (too much). The tile takes the average daily demand, the lead time, the demand variability, and
> the target service level, and returns the safety stock, the reorder point, and the z-score used -- the trigger level
> that balances stockout risk against carrying cost.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The average daily demand
and the demand standard deviation are rates (units per day, carried as `dimensionless` counts per day); the lead time is
a time (`T`, in days); the safety stock and reorder point are counts (`dimensionless`); the service level and its
z-score are `dimensionless`. The v18/v21 contract: any non-finite input, a negative average demand or standard
deviation, a non-positive lead time, or a service level outside `(0, 100)` returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the reorder-point relations by name (standard service-level inventory control);
`editionNote` names the **reorder point and safety stock (service-level model)**, prints
`z = inverse_normal(service_level / 100)`, `safety_stock = z x demand_sd x sqrt(lead_time)`, and
`reorder_point = average_demand x lead_time + safety_stock`, and states that **safety stock scales with the square root
of the lead time and with the service-level z-score so the last few points of service cost a disproportionate buffer
(95% to 99% roughly doubles it), the model assumes normally distributed demand and a fixed lead time (variable lead time
adds a second variance term), and the actual demand pattern and supplier reliability govern** -- a planning aid, not an
inventory policy.

## 2. The tile

### 2.1 `reorder-point` -- The Trigger Level, and Why 99% Service Costs Double the Buffer

```
inputs:
  avg_daily_demand   units/day   average demand per day
  lead_time_days     days        supplier lead time
  demand_sd          units/day   standard deviation of daily demand
  service_level_pct  %           target in-stock service level (e.g. 95)

z             = inverse_normal(service_level_pct / 100)                    [-]   (95% -> 1.645, 99% -> 2.326)
safety_stock  = z x demand_sd x sqrt(lead_time_days)                       [units]
reorder_point = avg_daily_demand x lead_time_days + safety_stock           [units]
```

**Pinned worked example (100 units/day average, 7-day lead time, sd 20/day, 95% service).** The z-score for 95% is
**1.645**, so the safety stock is `1.645 x 20 x sqrt(7) = 1.645 x 20 x 2.646 = ` **87 units**, and the reorder point is
`100 x 7 + 87 = ` **787 units** -- when stock drops to 787, reorder. **Cross-check (99% service nearly doubles the
buffer).** Raise the target to 99% (`z = 2.326`): `safety_stock = 2.326 x 20 x 2.646 = ` **123 units**, and the reorder
point climbs to `700 + 123 = ` **823 units** -- 36 more units of buffer for the last 4 points of service, the
diminishing return that the square-root and z scaling produce. The tile returns the z-score, the safety stock, and the
reorder point.

## 3. Wiring

A `tools-data.js` row (group `R`, trades `["small-business", "accounting"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 95% example
+ the 99% cross-check); `test/fixtures/compute-map.js` (`reorder-point` -> `computeReorderPoint` in
`../../calc-accounting.js`); `scripts/related-tiles.mjs` (-> `eoq-order-quantity` / `inventory-turnover` /
`equipment-hourly-rate`); `data/search/aliases.json` ("reorder point", "safety stock", "service level inventory", "rop",
"z score safety stock", "lead time demand", "stockout buffer", "when to reorder"); the id appended to the accounting
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the z-lookup at 95/99%, the sqrt(lead-time) scaling, the ROP = demand-during-lead + buffer
relation, and the error seams (non-finite, negative demand / sd, non-positive lead time, service level out of range).
Hand-writes its renderer (mirroring the calc-accounting.js pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the safety-stock / ROP stack wraps on a phone); render-no-nan + a11y on the new tile, output read
to the value (the 95% example -> 87 units safety, 787 ROP).

## 5. Roadmap position

Times the order that `eoq-order-quantity` sizes -- together they answer "how much" and "when" -- and complements
`inventory-turnover`. A variable-lead-time model (adding the lead-time variance term) and a periodic-review (order-up-to)
variant are deliberate future follow-ons. Further Group R growth stays evidence-driven.
