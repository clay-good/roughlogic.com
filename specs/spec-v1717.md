# roughlogic.com Specification v1717 -- Stack Emission Rate and Potential to Emit (`calc-airquality.js`, Group G Cross-Trade Utilities, air quality, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-airquality.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; air quality and environmental), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Potential to emit is what determines whether a source needs a permit, and it is computed at maximum capacity operating continuously -- not at what the source actually does. That distinction is the single most consequential idea in air permitting and it catches people every time.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive emission rate or operating hours, or an hours limit exceeding 8,760 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the potential-to-emit concept and the 8,760 hour basis with the permitting authority named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`potential to emit calculation`, `pte 8760 hours`, `synthetic minor permit limit`, `major source threshold air`, `emission factor pounds per hour`.

## 2. The tile

### 2.1 `stack-emission-pte` -- Stack Emission Rate and Potential to Emit

```
emission rate      lb/h from the process and its emission factor
potential to emit  PTE = maximum hourly rate x 8,760 hours per year
                   at MAXIMUM design capacity, operating continuously
                   regardless of actual operating hours or production
controls           may be counted only if federally enforceable
limits             a permit condition limiting hours or throughput makes the limit
                   enforceable and reduces PTE -- this is a synthetic minor
thresholds         major source thresholds trigger far more onerous permitting
actual emissions   what is reported annually; different from PTE and used for fees
```

The 8,760 hours is what surprises everyone. A source that runs one shift a day, five days a week, still has a
potential to emit computed as though it ran every hour of the year at full capacity -- because it COULD, absent an
enforceable restriction. A boiler used for winter heating has a PTE based on year-round continuous firing, and a
generator used for four hours of testing a month has one based on continuous operation.

The way out is a synthetic minor limit, and understanding it is the practical value of the concept. If the source
accepts a federally enforceable permit condition limiting its hours, its throughput, or its fuel, the PTE is
recomputed against that limit -- and a source that would be a major source at 8,760 hours becomes a minor source
at a permitted 2,000. The trade is that the limit is enforceable, with recordkeeping and reporting obligations,
and exceeding it is a violation rather than a busy month.

Control equipment counts only when its operation is federally enforceable. A baghouse that is installed but not
required by any permit condition does not reduce PTE, because nothing obliges the operator to run it -- which is
why permits contain conditions requiring control operation and monitoring.

Actual emissions are a separate number, reported annually, used for fees and inventories, and routinely a small
fraction of PTE.

**Inputs:** the maximum hourly emission rate for each pollutant, any federally enforceable hours or throughput limit, the control efficiency and whether its operation is enforceable, the applicable major source thresholds, and the actual operating hours

**Outputs:** the potential to emit for each pollutant at 8,760 hours, the PTE under a stated enforceable limit, each against the major source threshold, the operating hours limit that would keep the source below the threshold, and the actual emissions for comparison

## 3. Worked example

A source emitting 5.5 lb/h of a pollutant, operating one shift, 2,000 hours a year:

```
actual emissions = 5.5 x 2,000 / 2,000 = 5.5 tons... 
```

taking the rate as 11.0 lb/h for clarity:

```
actual   = 11.0 x 2,000 / 2,000 = 11.0 tons per year
PTE      = 11.0 x 8,760 / 2,000 = 48.2 tons per year
```

**The source emits 11 tons and its potential to emit is 48 tons.** Against a 100 ton major source
threshold, the actual emissions are comfortably minor and **the PTE is not** -- and it is PTE that determines the
permit.

The way out:

```
hours limit for a 100 ton PTE = 100 x 2,000 / 11.0 = 18,182 hours per year
```

Accept a federally enforceable permit condition limiting operation to under 18,182 hours and the
source is a synthetic minor. The cost is that the limit is enforceable: hours are recorded, reported, and
exceeding them is a violation rather than a good quarter.

**And the control equipment caveat.** If a baghouse reduces this by 95 percent but no permit condition requires
it to operate, the PTE is computed WITHOUT the control -- because nothing obliges the operator to run it. Getting
credit for a control means accepting a condition requiring its operation and monitoring, which is again a
trade of flexibility for a lower PTE.

## 4. Scope and non-goals

A screening calculation. Potential to emit is a regulatory determination with substantial legal nuance: what
counts as federally enforceable, how emission units are aggregated into a source, whether fugitive emissions
count, and which thresholds apply depend on the pollutant, the source category, the attainment status of the area,
and the applicable state and federal programs. Emission factors from AP-42 or other compilations carry
uncertainty ratings and are not a substitute for source testing where accuracy matters. It does not address New
Source Review, PSD, Title V applicability, MACT or NSPS standards, or state permitting programs, each of which has
its own thresholds and its own definitions. Getting PTE wrong means either an unpermitted major source or an
unnecessary major source permit, and both are expensive. The applicable federal and state air regulations, the
permitting authority, and an air permitting professional govern.
