# roughlogic.com Specification v1583 -- Lumber Kiln Drying Time and Moisture Removal (`calc-sawmill.js`, Group L Agriculture and Forestry, sawmill, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-sawmill.js`**
> (Group L, Agriculture and Forestry -- the existing category, hub `/groups/agriculture/`; sawmill and forest products), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Kiln time is set by the schedule and by thickness, and thickness dominates in a way that catches people out: drying time goes roughly as the square of thickness, so 8/4 stock takes about four times as long as 4/4, not twice.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive thickness or drying rate, or a final moisture content at or above the initial returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the schedule-rate time relation and the thickness scaling with the Forest Products Laboratory schedules named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`kiln drying time`, `lumber drying schedule days`, `thickness drying time`, `moisture points per day`, `kiln schedule duration`.

## 2. The tile

### 2.1 `kiln-drying-time` -- Lumber Kiln Drying Time and Moisture Removal

```
rate         schedule-driven, expressed as moisture-content points per day
time         t = (MC_initial - MC_final) / rate
thickness    drying time scales with thickness to roughly the power of 1.5 to 2
species      refractory species (oak, beech) dry far slower than permeable ones (pine, poplar)
steps        the schedule slows as the wood dries; the last points take the longest
conditioning equalizing and stress relief add days beyond the drying itself
```

The square-law on thickness is the fact worth carrying. Moisture has to diffuse to the surface, and doubling
the path more than doubles the time -- so a mill quoting an 8/4 order on twice the 4/4 schedule has underquoted by
a factor of two. It is also why 4/4 and 8/4 should not share a charge: the schedule that is safe for the thick
stock is wasteful for the thin, and the schedule that suits the thin stock will degrade the thick.

The other shape is that the rate is not constant. Above the fibre saturation point water moves freely and drying
is fast; below it, bound water moves by diffusion and the rate collapses. That is why the last twenty points take
longer than the first fifty, and why an average rate applied linearly badly underestimates the tail of a
schedule.

Equalizing and conditioning are separate and are not optional on stock that will be machined. Equalizing brings
the whole charge to a uniform moisture content; conditioning relieves the drying stresses that otherwise cause
boards to cup, pinch the saw, or move after machining. A schedule quoted without them is not a complete
schedule.

**Inputs:** species, thickness, initial and final moisture content, the schedule drying rate above and below fibre saturation, and the equalizing and conditioning durations

**Outputs:** the drying time in each rate regime, the total drying time, the time scaled to an alternative thickness, the equalizing and conditioning time, and the total charge cycle including load and unload

## 3. Worked example

Red oak 4/4 from 85% to 8% moisture content, on a schedule averaging 3.5 points per day above fibre saturation
(85 to 30) and 1.6 points per day below it (30 to 8):

```
above FSP: (85 - 30) / 3.5 = 15.7 days
below FSP: (30 -  8) / 1.6 = 13.8 days
drying total               = 29.5 days
equalize and condition     = 4 days
charge cycle               ~ 34 days
```

The last 22 points take almost as long as the first 55 -- that is the fibre saturation effect, and a linear
average of `77 / 29.5` = 2.6 points per day hides it entirely.

Now 8/4 of the same species. At a thickness exponent of 1.8:

```
scale factor = 2^1.8 = 3.48
drying total ~ 29.5 x 3.48 = 103 days
```

**Over three months**, against 29.5 days for 4/4. A mill that quoted 8/4 oak at "about twice the 4/4 time" has
committed to a delivery it cannot make, and the kiln is occupied for the whole of it.

## 4. Scope and non-goals

A time estimate from schedule rates the user supplies. It does not produce a drying schedule and must not be
used as one: schedules are species, thickness, and grade specific, are published by the Forest Products
Laboratory and by kiln manufacturers, and specify dry-bulb and wet-bulb temperatures step by step rather than a
rate. Running faster than the schedule causes surface checking, honeycomb, collapse, and casehardening, and none
of that is visible until the wood is machined. The thickness exponent is an approximation and varies by species
and by whether drying is diffusion or flow limited. It does not address air drying, pre-drying, sticker and
airflow requirements, kiln sample practice, or the moisture meter corrections needed for species and temperature.
The applicable drying schedule, the kiln manufacturer, and the mill's own kiln samples govern.
