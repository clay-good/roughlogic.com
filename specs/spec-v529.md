# roughlogic.com Specification v529 -- Economic Order Quantity (EOQ) (calc-accounting.js, Group R, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-accounting.js`**
> (Group R, accounting and small business); no new module, group, or dependency. Inherits spec.md through spec-v528.md.
>
> **The gap, and the evidence for it.** `inventory-turnover` is a ratio that looks backward; nothing in the bench sizes
> the order going forward. The Wilson EOQ model finds the order quantity that minimizes the **sum** of two costs that
> pull opposite ways: order too often and the per-order fixed cost (setup, freight, receiving) piles up; order too much
> at once and the holding cost (capital, storage, spoilage) piles up. `EOQ = sqrt(2 D S / H)` is the sweet spot. The
> catch the tile makes explicit is reassuring rather than alarming: the total-cost curve is **flat near the minimum**,
> so rounding the EOQ to a case or pallet quantity barely raises cost, but ordering wildly off it (hand-to-mouth, or a
> full truckload for a discount) does not. The tile takes the annual demand, the fixed cost per order, and the annual
> holding cost per unit, and returns the EOQ, the orders per year, the cycle time, and the total annual cost at the
> EOQ -- the order size a small business should default to.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The annual demand and the
EOQ are counts (`dimensionless`, in units); the order cost, the holding cost per unit, and the total annual cost are
carried as `dimensionless` currency (matching the existing accounting tiles); the orders per year is `dimensionless` and
the cycle time is a time (`T`, in days). The v18/v21 contract: any non-finite input, or a non-positive demand, order
cost, or holding cost returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the EOQ relations by
name (Wilson EOQ inventory model); `editionNote` names the **economic order quantity (Wilson model)**, prints
`EOQ = sqrt(2 x D x S / H)`, `orders_per_year = D / EOQ`, `cycle_days = 365 / orders_per_year`, and the total annual
cost `sqrt(2 x D x S x H)`, and states that **EOQ minimizes the sum of ordering and holding cost, the total-cost curve
is flat near the minimum so rounding to a case or pallet quantity barely hurts, the model assumes steady demand and no
quantity discounts (a discount tier needs a separate comparison), and the actual demand, lead time, and supplier terms
govern** -- a planning aid, not a purchasing policy.

## 2. The tile

### 2.1 `eoq-order-quantity` -- The Order Size That Minimizes Ordering Plus Holding Cost

```
inputs:
  annual_demand      units/yr   D, annual usage
  order_cost         $          S, fixed cost per order (setup + freight + receiving)
  holding_cost       $/unit/yr  H, annual carrying cost per unit

EOQ             = sqrt(2 x annual_demand x order_cost / holding_cost)     [units]
orders_per_year = annual_demand / EOQ                                     [orders/yr]
cycle_days      = 365 / orders_per_year                                   [days]
total_annual    = sqrt(2 x annual_demand x order_cost x holding_cost)     [$]   ordering + holding at EOQ
```

**Pinned worked example (12,000 units/yr, $50 per order, $3/unit/yr to hold).**
`EOQ = sqrt(2 x 12,000 x 50 / 3) = sqrt(400,000) = ` **632 units** per order, which is
`12,000 / 632 = ` **19 orders per year** (a cycle of about `365 / 19 = 19 days`), and the total annual ordering-plus-
holding cost at that quantity is `sqrt(2 x 12,000 x 50 x 3) = ` **$1,897**. **Cross-check (the curve is flat -- round
to a pallet).** Round the order up to a `640`-unit pallet: `orders = 18.75`, and the total cost rises to about
`18.75 x 50 + 320 x 3 = 937.5 + 960 = $1,897.5` -- essentially unchanged, the reassurance that a convenient round
quantity near the EOQ costs almost nothing extra. The tile returns the EOQ, the orders per year, the cycle time, and
the total annual cost.

## 3. Wiring

A `tools-data.js` row (group `R`, trades `["small-business", "accounting"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the EOQ example
+ the flat-curve rounding cross-check); `test/fixtures/compute-map.js` (`eoq-order-quantity` -> `computeEoqOrderQuantity`
in `../../calc-accounting.js`); `scripts/related-tiles.mjs` (-> `inventory-turnover` / `reorder-point` /
`equipment-hourly-rate`); `data/search/aliases.json` ("eoq", "economic order quantity", "wilson eoq", "order quantity",
"inventory ordering cost", "holding cost", "optimal order size", "reorder quantity"); the id appended to the accounting
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the sqrt relation, the total-cost identity (equals sqrt(2 D S H) at the EOQ), the flat
curve near the minimum, and the error seams (non-finite, non-positive demand / order cost / holding cost). Hand-writes
its renderer (mirroring the calc-accounting.js `inventory-turnover` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the EOQ / orders / cost stack wraps on a phone); render-no-nan + a11y on the new tile, output read
to the value (the 12,000-unit example -> 632 units, $1,897).

## 5. Roadmap position

Sizes the order that `reorder-point` (proposed next) then times, and complements `inventory-turnover` (the backward-
looking ratio). A quantity-discount EOQ (comparing the model against a price-break tier) and an EOQ-with-backorders
variant are deliberate future follow-ons. Further Group R growth stays evidence-driven.
