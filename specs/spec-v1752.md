# roughlogic.com Specification v1752 -- PPFD to Daily Light Integral (`calc-greenhouse.js`, Group L Agriculture and Forestry, greenhouse and controlled-environment agriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-greenhouse.js`**
> (Group L Agriculture and Forestry, hub `/groups/agriculture/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A light meter reads an instantaneous intensity, but a crop responds to the total photons it receives in a day. Daily light integral is the bridge between the two, and it is the number greenhouse light decisions are actually made on.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive PPFD or photoperiod, a photoperiod above 24 hours, or a transmission fraction outside 0 to 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the daily light integral definition and greenhouse transmission ranges with the horticultural literature and the crop producer guide named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`ppfd to dli`, `daily light integral greenhouse`, `mol per square meter per day`, `photosynthetic photon flux density`, `supplemental light dli target`.

## 2. The tile

### 2.1 `ppfd-daily-light-integral` -- PPFD to Daily Light Integral

```
PPFD             photosynthetic photon flux density, micromoles of PAR photons per
                 square meter per second -- an instantaneous reading
DLI              mol/m^2/day = PPFD x photoperiod hours x 3600 / 1,000,000
photoperiod      the hours the light is actually present, natural plus supplemental
glazing          a greenhouse transmits roughly 55 to 75% of outdoor PAR once the
                 structure, glazing, and any screen are counted
crop targets     roughly 6 to 10 for low-light foliage, 12 to 20 for most vegetable
                 and bedding crops, 25 to 35 for high-light fruiting crops
supplemental     the gap between the target and what the glazing delivers is what a
                 supplemental fixture set has to make up (`grow-light-fixture-count`)
NOT lux          a lux or footcandle meter is weighted to human vision and does not
                 read PAR; the conversion differs by light source
```

Daily light integral is a quantity, not an intensity, and that distinction is the whole point. A crop can be
given the same DLI by a bright short day or a dim long one, and for most crops it responds to the total --
which is why a winter greenhouse can be made productive by extending the photoperiod rather than by chasing
the summer's peak intensity, and why the supplemental lighting decision is an energy decision more than an
equipment one.

The seasonal swing is larger than growers expect and it is the reason supplemental lighting exists at all.
Outdoor DLI in the northern US falls by a factor of six or more between June and December, and the greenhouse
takes its transmission loss off the top of the already small winter number. A house that is drowning in light
in July is well below every crop target in December with the same glazing and no other change.

The lux trap deserves its own sentence. A footcandle or lux meter is weighted by the human eye's response,
which peaks in the green where photosynthesis does not, so the conversion between lux and PPFD depends
entirely on the spectrum of the source. Sunlight, high-pressure sodium, and a red-blue LED each have a
different factor, and a single conversion constant applied across them will be wrong by tens of percent for at
least two of the three.

**Inputs:** the PPFD, the photoperiod hours, and optionally the outdoor DLI and the glazing plus screen transmission, and the crop's target DLI

**Outputs:** the daily light integral, the DLI delivered inside the glazing from an outdoor figure, the shortfall against a crop target, and the supplemental PPFD needed to close it over the entered photoperiod

## 3. Worked example

A fixture set holding 400 micromol/m^2/s over a 16 hour photoperiod:

```
DLI = 400 x 16 x 3600 / 1,000,000 = 23.04 mol/m^2/day
```

**23.0 mol/m^2/day sits inside the 20 mol target band for most vegetable and bedding crops.** The arithmetic is
simple; the useful part is what it says about winter.

**December is the problem, and the glazing makes it worse.** An outdoor DLI of 6 mol/m^2/day in a northern
December arrives inside a house transmitting 65 percent as:

```
inside DLI = 6 x 0.65 = 3.9 mol/m^2/day
```

against a target of 20. The shortfall is 16.1 mol/m^2/day, and spreading it over a 16 hour photoperiod calls
for 280 micromol/m^2/s of supplemental light -- **about 70 percent of the whole design intensity above, needed
just to fill the winter gap.**

**In June the same house has the opposite problem.** An outdoor 45 mol/m^2/day arrives as 29.2 inside, which is
1.5 times the target -- and shading, not lighting, becomes the intervention (`shade-cloth-transmission`).

**Do not reach for the lux meter.** Full sun is roughly 10,000 footcandles and about 2,000 micromol/m^2/s, which
makes the sunlight factor near 0.20 micromol per footcandle. That factor is specific to sunlight's spectrum;
applied to a high-pressure sodium fixture or a red-blue LED array it is simply wrong, because the meter
weights green light the crop barely uses and discounts red light the crop uses most.

## 4. Scope and non-goals

A unit and photoperiod calculation. It does not predict crop growth, yield, or quality from a light integral, which depends on temperature, carbon dioxide, water, nutrition, and cultivar; DLI targets are a starting band from the horticultural literature and the crop's own producer guide governs. It does not convert between lux or footcandles and PPFD, because that conversion is spectrum-dependent and a single constant would be misleading -- a quantum sensor is the correct instrument. It does not account for the spatial non-uniformity of either sunlight or a fixture array, so a single PPFD figure stands in for a field that varies substantially across a bay. It does not size fixtures (`grow-light-fixture-count`) or address photoperiodic flowering response (`photoperiod-blackout-schedule`), which is a duration question rather than an integral one. The crop's producer guide and a calibrated quantum sensor govern.
