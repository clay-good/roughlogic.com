# roughlogic.com Specification v1678 -- Cryogenic Tank Boil-Off Rate and Hold Time (`calc-hvacsystems.js`, Group C HVAC, mechanical insulation, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; mechanical insulation), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A cryogenic tank is always boiling, and the rate is what its insulation lets in. Boil-off sets the hold time, the vent sizing, and how long a tank can sit before it starts venting product -- and it is a fixed percentage per day that scales with the tank.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive tank volume, boil-off rate, or latent heat, or a vapour space at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the boil-off and hold time relations with CGA standards and NFPA 55 named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`cryogenic boil off rate`, `ner tank cryogenic`, `liquid nitrogen hold time`, `vacuum jacket lost vacuum`, `cryogenic vent rate`.

## 2. The tile

### 2.1 `cryogenic-boiloff` -- Cryogenic Tank Boil-Off Rate and Hold Time

```
boil-off rate     a percentage of contents per day, from the tank's rated performance
heat leak         Q = boil-off mass x latent heat of vaporization
hold time         the time until the tank reaches its relief pressure with the vent closed
                  from the vapour space, the pressure rise, and the boil-off
normal evaporation rate  the manufacturer's tested figure, typically well under 1% per day
                  for a vacuum-jacketed tank
insulation loss   a vacuum jacket that has lost vacuum boils off at many times the rate
consequence       product loss, and eventually venting a flammable or asphyxiating gas
```

Boil-off is the direct measure of a cryogenic tank's insulation and it is the number a user actually
experiences: a tank rated at a quarter percent a day loses that much product every day it sits, whether or not
anyone draws from it. On a tank that is used slowly, boil-off can exceed consumption, and the economics of tank
size run backwards from the usual intuition -- a larger tank has a better surface-to-volume ratio and a lower
percentage boil-off, so oversizing helps rather than hurts.

Hold time is the operationally useful derivative. With the vent closed the boil-off pressurizes the vapour space
until relief lifts, and how long that takes depends on the vapour space volume and the pressure span available. It
is why a full tank has a shorter hold time than a partly full one -- less vapour space to absorb the same boil-off
-- which is the opposite of what people assume.

The failure mode to recognize is a lost vacuum. A vacuum-jacketed tank whose annulus has lost its vacuum boils
off at many times its rated figure, and the symptoms are frost or condensation on the outer jacket, a sharply
increased vent rate, and a tank that will not hold pressure. That is not a leak to chase at a fitting; it is a
tank that needs to be evacuated or replaced.

**Inputs:** tank volume and contents, the normal evaporation rate, the fluid latent heat and density, the vapour space fraction, the relief pressure and current pressure, and the withdrawal rate

**Outputs:** the daily boil-off in volume and mass, the equivalent heat leak, the hold time to relief pressure at the entered vapour space, the hold time at an alternative fill level, and the boil-off rate implied by an observed vent rate

## 3. Worked example

An 11,000 gallon liquid nitrogen tank with a 0.25% per day normal evaporation rate:

```
boil-off = 11,000 x 0.0025 = 27.5 gallons per day
```

28 gallons a day, every day, whether the tank is used or not. Over a month that is
825 gallons -- and on a site whose consumption is lower than that, **boil-off exceeds use** and the tank
is losing more than the process takes.

That is the argument for tank sizing running counter to intuition: a larger tank has less surface area per unit
volume, so its percentage boil-off is lower. Two half-size tanks lose more than one full-size tank holding the
same total.

**Hold time and fill level.** A tank at 90 percent full has a small vapour space, so the same boil-off
pressurizes it quickly and relief lifts sooner. The same tank at 40 percent full has a much larger vapour space
and holds for considerably longer. A full tank is not a tank with more margin -- it has less.

**The lost vacuum.** If this tank starts boiling off at 2 percent a day rather than 0.25, the annulus has
lost its vacuum. Frost or sweating on the outer jacket confirms it. That is a tank problem, not a fitting leak,
and the tank comes out of service -- an insulated vessel that is no longer insulated will vent continuously and,
on a flammable or asphyxiating product, that is a hazard rather than an expense.

## 4. Scope and non-goals

A boil-off and hold-time estimate from a rated evaporation rate the user supplies. The normal evaporation rate
is a manufacturer figure measured under defined conditions with the tank at a stated fill and pressure, and real
boil-off varies with fill level, ambient temperature, solar exposure, and the condition of the vacuum jacket. It
does not size relief devices, which are a mandatory safety system and must cover the fire case as well as normal
boil-off, and it does not address the pressure building coil, economizer, or the withdrawal behaviour that
changes tank pressure during use. It does not address the asphyxiation hazard of cryogenic gases in confined or
poorly ventilated spaces, which is the leading cause of cryogenic fatalities, or the cold burn and material
embrittlement hazards. The tank manufacturer's data and operating instructions, CGA standards, NFPA 55, and the
gas supplier govern.
