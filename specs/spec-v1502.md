# roughlogic.com Specification v1502 -- Utility Bill Baseload and Weather-Sensitive Split (`calc-buildingperf.js`, Group C HVAC, building performance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-buildingperf.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; building performance and envelope diagnostics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A utility bill is one number covering a water heater, a refrigerator, and a furnace. Splitting it into a weather-independent baseload and a weather-driven heating or cooling term takes twelve months of bills and a straight line, and it is what tells an auditor whether the problem is the envelope or the appliances before anyone opens a truck.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: fewer than three monthly readings, a non-positive degree-day total, a negative energy figure, or a fitted slope below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the degree-day regression method with ASHRAE Guideline 14 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`utility bill disaggregation`, `baseload heating split`, `degree day regression bills`, `balance point from bills`, `energy signature analysis`.

## 2. The tile

### 2.1 `bill-disaggregation` -- Utility Bill Baseload and Weather-Sensitive Split

```
model            E_month = Baseload + Slope x DD_month(T_base)
baseload         the intercept: the energy used regardless of weather
slope            energy per degree-day; the envelope-plus-equipment term
balance point    the base temperature that maximizes fit
implied UA       UA ~ Slope x eta x 1000 / 24     (BTU/h per degF, for a heating fit)
```

Plot monthly energy against monthly degree-days and the points fall on a line. The intercept is everything the
weather does not drive -- water heating, refrigeration, lighting, plugs, standby -- and the slope is everything it
does. That single split reorders an audit: a house with a huge intercept and a modest slope does not need
insulation, it needs to find out what is running all the time, and no amount of air sealing will touch it.

The base temperature is a fitted parameter rather than 65 degF by convention. A well-insulated house with large
internal gains starts heating at a much lower outdoor temperature, and forcing a 65 degF base onto it produces a
bad fit and a misleading slope. Trying several base temperatures and keeping the one with the best correlation is
the standard method, and the resulting balance point is itself a diagnostic -- an unexpectedly high balance point
means the house starts needing heat early, which is a shell or a distribution problem.

**Inputs:** monthly energy use and the corresponding degree-days (or monthly average temperature and a base temperature to compute them), the fuel and its unit, the equipment efficiency, and the base temperatures to try

**Outputs:** the fitted baseload and slope, the correlation coefficient, the best-fit base temperature, the annual split between baseload and weather-driven energy, the implied building UA, and the savings a stated slope reduction would produce

## 3. Worked example

Twelve months of gas bills fitted against heating degree-days give a baseload of 310 therms per year
(25.8 per month) and a slope of 1.85 therms per heating degree-day, at a best-fit base of 60 degF. The
site had 1,240 HDD60 last year:

```
weather-driven = 1.85 x 1,240   = 2,294 therms
baseload                       = 310 therms
total                          = 2,604 therms
weather share                  = 88%
implied UA at 80% AFUE  = 1.85 x 0.80 x 100,000 / 24 = 6,167 BTU/h per degF
```

88% of this bill is the shell and the heating system, so envelope work is worth doing here. Had the
split come out the other way -- a 2,294 therm baseload and a 310 therm weather term -- the same house
would need a water heater and a refrigerator, not insulation, and an auditor who skipped this step would have
sold the wrong job.

Cut the slope 25% by air sealing and insulating and the annual saving is `0.25 x 2,294` = 574 therms,
about 22% of the total bill -- not 25%, because the baseload does not move.

## 4. Scope and non-goals

A two-parameter regression against degree-days. It assumes the relationship is linear and the occupancy and
equipment are unchanged over the fitting period; a vacancy, a new hot tub, a move-in, or a mid-year equipment
replacement breaks the fit and produces a confident-looking wrong answer. Monthly billing periods rarely align
with calendar months and the degree-days must match the actual read dates or the slope is biased. Cooling and
heating on the same electric meter need a three-parameter or change-point model, not this one. The implied UA is
a crude inference that lumps envelope, duct, and infiltration losses together and depends entirely on an assumed
equipment efficiency. It does not replace a measured blower door, duct test, or load calculation. ASHRAE
Guideline 14 and the auditing program standard govern any use of this for measured savings.
