# roughlogic.com Specification v424 -- Driver Pay: Cents-per-Mile vs Percentage (calc-trucking.js, Group J, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.147.0; proposed 2026-07-03). Second tile of the owner-operator finance trio (v423 detention billing -> v424 driver pay
> CPM vs percentage -> v425 invoice factoring cost). `cost-per-mile` costs the truck; this tile compares the two ways a
> driver actually gets paid -- cents-per-mile versus a percentage of the linehaul -- and finds the freight rate where they
> cross.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A driver is paid either a flat cents-per-mile or a
> percentage of the load's linehaul revenue. Over the same miles, CPM pay is `cpm * miles` and percentage pay is
> `pct * linehaul`; they are equal at a breakeven freight rate of `cpm / pct` dollars per mile, above which the percentage
> deal pays more. `cost-per-mile` and `load-profitability` cost the truck, not the driver-pay structure. This adds the
> pay-comparison tile to the existing **`calc-trucking.js`** module (Group J); no new group, trade, or dependency. Inherits
> spec.md through spec-v423.md.
>
> **The gap, and the evidence for it.** A driver offered `$0.60/mile` or `25%` of linehaul, running `1000 miles`: the CPM
> deal pays `0.60 * 1000 = $600`, and if the load's linehaul is `$2,500` (`$2.50/mile`), the percentage deal pays
> `0.25 * 2500 = $625` -- percentage wins. The two are equal at a freight rate of `0.60 / 0.25 = $2.40/mile`, so on any load
> paying more than `$2.40/mile` the percentage driver comes out ahead. No tile does this comparison.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The cents-per-mile rate is a
rate (USD/mi); the percentage is dimensionless; the miles are a length (mi); the linehaul revenue and the pay amounts are
currency (USD); the breakeven rate is a rate (USD/mi). The v18/v21 contract: any non-finite input, or a non-positive miles,
CPM, percentage, or linehaul, returns `{ error }`; the tile reports both pay amounts, which structure pays more for the
given load, and the breakeven freight rate `cpm / pct`. Citation discipline (v19/v22): `GOVERNANCE.general` over driver
compensation models by name; `editionNote` names **the cents-per-mile pay `= cpm * miles`, the percentage pay
`= pct * linehaul`, and the breakeven freight rate `= cpm / pct` (USD/mile) at which the two structures pay the same**, and
states that **this compares the two common driver-pay models for a single load, that per-diem, accessorials, and deadhead
pay are separate, and that it is a business aid, not a substitute for the pay agreement**.

## 2. The tile

### 2.1 `driver-pay-cpm-vs-percentage` -- Driver Pay: Cents-per-Mile vs Percentage

```
inputs:
  cpm_usd       USD/mi   cents-per-mile pay rate
  pct           %        percentage-of-linehaul pay rate
  miles         mi       loaded miles
  linehaul_usd  USD      load linehaul revenue

cpm_pay        = cpm_usd * miles
pct_pay        = (pct/100) * linehaul_usd
breakeven_rate = cpm_usd / (pct/100)      (USD/mile of linehaul)
```

**Pinned worked example ($0.60/mi or 25%, 1000 mi, $2,500 linehaul).** `CPM pay = 0.60*1000 = $600`;
`percentage pay = 0.25*2500 = $625`; percentage wins. `breakeven = 0.60/0.25 = $2.40/mile`, so above `$2.40/mile` the
percentage deal pays more. **Cross-check (a cheap load favors CPM).** At a `$1,800` linehaul (`$1.80/mile`) the percentage
pays only `$450`, below the `$600` CPM -- on light-paying freight, cents-per-mile protects the driver. A non-positive input
takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `J`, trades `["trucking"]`, beside `cost-per-mile` / `load-profitability`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, driver-pay models, `editionNote` naming the two pay formulas
and the breakeven rate); `test/fixtures/worked-examples.json` (the percentage-wins example + the CPM-wins cross-check);
`test/fixtures/compute-map.js` (`driver-pay-cpm-vs-percentage` -> `computeDriverPayCpmVsPercentage` in
`../../calc-trucking.js`); `scripts/related-tiles.mjs` (-> `cost-per-mile` / `load-profitability` /
`detention-demurrage-billing` / `deadhead-percent`); `data/search/aliases.json` ("driver pay", "cents per mile vs
percentage", "cpm vs percent", "driver pay comparison", "percentage of linehaul", "truck driver pay", "cpm breakeven",
"owner operator pay", "company driver pay"); the id appended to the existing trucking renderers block in `app.js`; the
`// dims:` annotation (cpm/breakeven rate, pct dimensionless, miles length, revenue/pay currency); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the breakeven relation, and the non-positive /
non-finite error seams. No new module; re-pin `calc-trucking.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the breakeven, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the two pay amounts + breakeven wrap on a phone);
render-no-nan + a11y sweep, output read to the value ($0.60/mi, 25%, 1000 mi -> $600 vs $625, $2.40/mi breakeven).

## 5. Roadmap position

The middle of the owner-operator finance trio: `detention-demurrage-billing` (v423) and `invoice-factoring-cost` (v425)
bracket the carrier-business math. A blended CPM-plus-accessorial and a solo-vs-team pay-split tile are the deliberate next
follow-ons.
