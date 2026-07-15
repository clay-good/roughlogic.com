# roughlogic.com Specification v846 -- Earthwork Production Unit Cost (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v845.md. Estimating sweep, joining the R-group
> `equipment-hourly-rate` to the E-group production tiles.
>
> **The gap, and the evidence for it.** The catalog gives an equipment hourly rate (`equipment-hourly-rate`) and hourly
> production (`dozer-production`, `haul-cycle-production`) but nothing joins them into the **unit cost** ($/cy) that a bid
> actually needs. Grep confirmed no unit-cost / dollar-per-cy tile. The number this settles: a dozer at $215/hr all-in
> moving 656 cy/hr costs **$0.33/cy** -- but let the production fall to 400 cy/hr on soft ground and the same machine costs
> **$0.54/cy**, a 63% jump the rate alone never shows.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the cost tiles
(`equipment-hourly-rate`, `material-cost`): the hourly rates and costs are dimensionless (dollars), the production rate is
dimensionless (cy/hr), the total volume carries `L^3`, and the unit cost is dimensionless (dollars per cy). The v18/v21
contract: a non-finite or non-positive production rate returns `{ error }`; a negative equipment rate, operator rate,
support rate, or total volume returns `{ error }`. Citation discipline (v19/v22): the unit-cost identity by name (unit
cost = (equipment + operator + support hourly rates) / production per hour), `GOVERNANCE.general`; the note states that the
equipment rate is the ownership-plus-operating rate from `equipment-hourly-rate` or the machine's cost records, that the
production comes from the production tiles, and that low production (soft ground, long haul, poor match) is what blows up
the unit price -- the number to attack is the production, not the rate.

## 2. The tile

### 2.1 `unit-cost-earthwork` -- Earthwork Production Unit Cost

```
inputs:
  equipment_rate_per_hr  equipment ownership + operating rate ($/hr)
  operator_rate_per_hr   operator wage + burden ($/hr)
  support_rate_per_hr    support equipment / labor ($/hr, default 0)
  production_cy_per_hr    production rate (cy/hr)
  total_cy               total quantity (cy, default 0 = skip)

hourly_cost      = equipment_rate_per_hr + operator_rate_per_hr + support_rate_per_hr
unit_cost_per_cy = hourly_cost / production_cy_per_hr
total_cost       = total_cy > 0 ? unit_cost_per_cy * total_cy : null
```

**Pinned worked example.** Equipment $150/hr, operator $65/hr, support $0, production 656 cy/hr:
`hourly = 150 + 65 = $215/hr`; `unit cost = 215 / 656 = ` **$0.328/cy**. Cross-check: production sliding to 400 cy/hr on
soft ground gives `215 / 400 = ` **$0.538/cy** -- the same machine and crew, 63% more per yard, because production, not
the rate, is in the denominator.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` earthwork block near
`haul-cycle-production`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (unit cost = hourly cost / production, `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the pinned example plus the low-production cross-check); `test/fixtures/compute-map.js` (`unit-cost-earthwork` ->
`computeUnitCostEarthwork`, module `../../calc-earthwork.js`); `scripts/related-tiles.mjs` (-> `equipment-hourly-rate` /
`dozer-production` / `haul-cycle-production`); `data/search/aliases.json` (5 collision-checked aliases: "earthwork unit
cost", "dollar per cy", "production unit cost", "cost per cubic yard", "equipment unit cost"); a hand-written renderer in
the `EARTHWORK_RENDERERS` map mirroring `_v67renderHaulCycleProduction` (non-exported, so no DOM-sentinel dims row), and
the id added to the calc-earthwork declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the hourly cost, the unit
cost, the total (and the null-when-skipped seam), and the error seams (non-positive production; negative rates or total).
The calc-earthwork.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,294 -> 1,295.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((150+65)/656 -> $0.328/cy).

## 5. Roadmap position

Estimating tile that joins `equipment-hourly-rate` (cost) with the production tiles (rate) into a bid unit price, serving
the earthwork estimator (construction / surveying). Stays evidence-driven; the cost records govern the rates.
