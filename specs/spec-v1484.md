# roughlogic.com Specification v1484 -- Ammonia Refrigeration Charge Inventory and PSM Threshold (`calc-refrigeration.js`, Group C HVAC, industrial refrigeration, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigeration.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; industrial and commercial refrigeration), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** The single number that decides whether an ammonia plant sits under OSHA Process Safety Management and EPA Risk Management Program is its charge in pounds, and the threshold is 10,000. Plants drift across it during expansions without anyone adding up the vessels, and the arithmetic is a volume-times-density sum nobody has a tool for.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive vessel volume or density, a fill fraction outside zero to one, or an empty vessel list returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the 10,000 lb PSM threshold with 29 CFR 1910.119, 40 CFR 68, and IIAR 2 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`ammonia charge inventory`, `psm threshold ammonia`, `refrigerant charge 10000 lb`, `rmp ammonia calculation`, `r717 charge estimate`.

## 2. The tile

### 2.1 `ammonia-charge-inventory` -- Ammonia Refrigeration Charge Inventory and PSM Threshold

```
charge per vessel   m = V x fill_fraction x rho(T)
piping charge       m = V_pipe x rho x liquid_fraction_by_line_type
total charge        M = sum of all vessels, piping, and equipment
PSM / RMP threshold 10,000 lb of anhydrous ammonia
```

Charge is dominated by the liquid inventory: a high-pressure receiver, a recirculator package, and the wet
suction and liquid lines hold nearly all of it, while the vapor side holds almost nothing. Liquid density is
strongly temperature dependent, so a low-temperature recirculator's contents weigh meaningfully less per gallon
than the same volume in a warm receiver -- which is why a per-vessel sum at each vessel's own operating
temperature is the only honest way to do it.

The threshold is a cliff, not a slope. At 9,900 pounds a plant has ordinary obligations; at 10,001 it has a
written process safety management program, process hazard analyses, mechanical integrity, management of change,
and an EPA risk management plan with offsite consequence analysis. That makes the honest question during a
retrofit not "what is the charge" but "how much headroom is left," and a plant designing deliberately below the
threshold needs the number tracked, not estimated.

**Inputs:** each vessel with its volume, operating temperature, and liquid fill fraction; each pipe run with its size, length, and service; and the applicable threshold

**Outputs:** the charge per vessel and per line, the total system charge, the margin to the 10,000 lb threshold, the percent of threshold, and the additional volume that would cross it

## 3. Worked example

A plant with a 1,200 gal high-pressure receiver at 30% liquid and 85 degF (density 37.2 lb/cu ft), a 900 gal
recirculator at 60% liquid and minus 20 degF (density 42.4 lb/cu ft), and 780 cu ft of liquid and wet-return
piping averaging 25% liquid at 40.0 lb/cu ft:

```
receiver     1,200 gal / 7.481 = 160.4 cu ft x 0.30 x 37.2 = 1,790 lb
recirculator   900 gal / 7.481 = 120.3 cu ft x 0.60 x 42.4 = 3,060 lb
piping                            780 cu ft x 0.25 x 40.0 = 7,800 lb
total                                                      = 12,650 lb
```

Over the threshold by 2,650 lb, and the piping is the reason -- it holds more than both vessels together, which is
the result that surprises people and the one a vessel-only tally misses entirely. A plant that counted only its
receiver and recirculator would report 4,850 lb and believe itself exempt.

## 4. Scope and non-goals

A charge inventory for threshold screening. It is only as good as the liquid fill fractions entered, and those
are operating-condition estimates rather than measurements -- a recirculator's level varies with load, and wet
return lines carry a liquid fraction that depends on the overfeed rate. It does not perform the process hazard
analysis, offsite consequence analysis, or any other element of a PSM or RMP program; it tells you whether you
are in scope, not what to do about it. State and local thresholds may sit below the federal 10,000 lb, and
ammonia charge also triggers IIAR, ASHRAE 15, and fire code requirements at much lower quantities that have
nothing to do with PSM. A screening aid: the plant's process safety information, a qualified process safety
professional, IIAR 2, and 29 CFR 1910.119 govern.
