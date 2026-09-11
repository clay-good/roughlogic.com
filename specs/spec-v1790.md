# roughlogic.com Specification v1790 -- Landfill Gas Generation (First-Order Decay) (`calc-waste.js`, Group M Water and Wastewater Operations, solid waste and landfill operations, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-waste.js`**
> (Group M Water and Wastewater Operations, hub `/groups/water/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Buried waste generates methane on a decaying exponential, so a landfill's gas output peaks the year it stops accepting waste and falls away for decades afterwards. A gas-to-energy project is financed against a curve, not a number.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive tonnage, methane yield, or decay constant, a non-positive placement period, or a methane fraction, collection efficiency, or generator efficiency outside 0 to 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the first-order decay generation model and the Clean Air Act default methane yield and decay constants with EPA LandGEM and the applicable Clean Air Act regulations named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`landfill gas generation`, `landgem first order decay`, `methane generation rate constant`, `lfg to energy sizing`, `landfill methane yield`.

## 2. The tile

### 2.1 `landfill-gas-generation` -- Landfill Gas Generation (First-Order Decay)

```
the model        each year's waste decays exponentially and the generations add:
                 Q = sum over placement years of k x L0 x M x e^(-k t)
methane yield    L0, the total methane a megagram of waste will ever produce; the
                 Clean Air Act default is 100 cubic metres per megagram
decay constant   k per year; roughly 0.02 for arid sites, 0.04 conventional, and
                 0.05 to 0.07 for wet or bioreactor sites
peak             at closure, when the sum has the most contributing years and none
                 has decayed far
decline          after closure the whole curve decays as e^(-k t); at k = 0.04 the
                 output halves in about 17 years
composition      landfill gas is roughly half methane and half carbon dioxide, with
                 trace constituents; the ENERGY is in the methane only
collection       a well field recovers perhaps 60 to 85% of what is generated; the
                 rest escapes or oxidises in the cover
```

Generation and collection are two different quantities and mixing them is the usual error in a project
proposal. The model predicts what the waste produces; the well field, the cover, the vacuum, and the site's
condition decide how much of it reaches the header. A project sized on generation is oversized by whatever the
collection efficiency turns out to be, and collection efficiency is the least certain number in the whole
calculation.

The shape of the curve is what a developer has to design around. Output climbs while the site fills, peaks the
year it closes, and then decays forever -- so the engine capacity that matches the peak is oversized for every
year after it, and the revenue declines on a schedule the physics fixes in advance. Projects handle this with
modular engines that can be removed as the gas falls, which is an equipment decision made from the decay
constant.

The decay constant is where the uncertainty lives and it is not a small uncertainty. It expresses how fast
the waste degrades, which depends overwhelmingly on moisture, and a factor of two or three between an arid
site and a wet one is ordinary. That factor moves both the peak and the duration, in opposite directions: a
high constant gives more gas sooner and less later, which is a different project entirely from a low one with
the same total yield.

**Inputs:** the annual waste tonnage and the years of placement, the methane yield per megagram, the decay constant, the methane fraction of the gas, the collection efficiency, the methane heating value, and the generator efficiency

**Outputs:** the methane generation in cubic metres and cubic feet per year, the flow in cubic feet per minute of methane and of landfill gas, the heat rate, the gross and collected electrical capacity, and the capacity remaining ten and twenty years after closure

## 3. Worked example

A site taking 250,000 tons a year for 20 years, at the Clean Air Act default yield and a conventional
decay constant:

```
mass/yr = 250,000 tons = 226,796 Mg
sum of e^(-0.04 t) for t = 0..19 = 14.0439
Q = 0.04 x 100 x 226,796 x 14.0439 = 12,740,458 m^3 CH4/yr
  = 449,925,452 cu ft/yr = 856 cfm of methane
```

**At 50% methane that is 1,712 cfm of landfill gas at the peak**, which is the year the site closes and the
largest flow the well field and the flare will ever see (`lfg-flare-capacity`).

**The energy in it:**

```
heat  = 856 cfm x 911 Btu/cu ft x 60 = 46.8 MMBtu/h
gross = 46.8 x 10^6 x 0.30 / 3,412 = 4,114 kW
```

**4.1 MW of generation -- if every cubic foot generated reached the engine.** It will not:

```
collected = 4,114 x 0.75 = 3,086 kW
```

**3.1 MW is the honest peak**, and the 25 percent difference is gas escaping through the cover, which is
also the site's methane emission and its regulatory exposure.

**Now the part that decides whether the project finances.** The peak is at closure and everything after it
decays:

```
10 years after closure: 3,086 x e^(-0.04 x 10) = 2,068 kW
20 years after closure: 3,086 x e^(-0.04 x 20) = 1,386 kW
```

**45 percent of the peak after twenty years.** An engine set sized for 3.1 MW runs at
67 percent of capacity a decade later and 45 percent two decades on. **The revenue curve is fixed by
the decay constant on the day the site closes**, which is why these projects are built in modules that come out
as the gas falls rather than as one large engine that never runs full again.

## 4. Scope and non-goals

A generation estimate from an empirical first-order model. The methane yield and decay constant are the whole answer and both are entered: the Clean Air Act defaults are regulatory values chosen for permitting consistency, not predictions for a particular site, and a site-specific constant fitted to measured recovery is what a project should be financed on. The decay constant depends overwhelmingly on moisture and can differ by a factor of three between an arid site and a bioreactor. The model predicts GENERATION; collection efficiency is separately entered, is the least certain figure in the calculation, and depends on well spacing, cover integrity, vacuum, and site condition. It does not design the well field, the header, the condensate system, or the blower, size or select an engine or a flare (`lfg-flare-capacity`), or address gas quality -- siloxanes, hydrogen sulfide, and moisture are what actually decide whether gas can go to an engine and are not in this model. It takes no position on the Clean Air Act new source performance standards, emission guidelines, or reporting thresholds that may require collection and control regardless of a project's economics. EPA LandGEM and the applicable Clean Air Act regulations, site-specific measured recovery data, and a qualified landfill gas engineer govern.
