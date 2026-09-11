# roughlogic.com Specification v1757 -- Greenhouse Crop Transpiration and Water Use (`calc-greenhouse.js`, Group L Agriculture and Forestry, greenhouse and controlled-environment agriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-greenhouse.js`**
> (Group L Agriculture and Forestry, hub `/groups/agriculture/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Nearly all the water applied in a greenhouse leaves through the leaves, and it leaves carrying heat. The same calculation therefore sizes the irrigation system, explains most of the house's cooling, and produces the humidity load the dehumidification has to remove.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive area or solar input, a latent fraction outside 0 to 1, or a leaching fraction at or above 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the latent-heat energy balance and the heat of vaporisation of water with the horticultural literature and the crop producer guide named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`greenhouse water use`, `crop transpiration rate`, `greenhouse irrigation demand`, `latent heat transpiration`, `greenhouse humidity load`.

## 2. The tile

### 2.1 `greenhouse-transpiration-water` -- Greenhouse Crop Transpiration and Water Use

```
energy basis     transpiration is driven by the radiation the crop absorbs, so the
                 water use follows from an energy balance rather than a soil model
solar in         Btu/day = daily solar through the glazing x floor area
latent fraction  the share of absorbed radiation that leaves as evaporated water;
                 about 0.4 to 0.7 for a full, well-watered crop and far lower for a
                 young crop or bare benches
water            lb/day = solar x latent fraction / 1,050 Btu per lb
volume           gal/day = lb / 8.345
applied          irrigation must exceed transpiration by the leaching fraction:
                 applied = transpiration / (1 - LF)  (`leaching-fraction-runoff-ec`)
humidity         every pound transpired enters the house air and must leave through
                 ventilation or dehumidification
peak vs average  the peak hour runs several times the daily average, and the
                 irrigation system is sized on the peak
```

Transpiration is an energy quantity before it is a water quantity, and treating it that way is what makes a
greenhouse estimate tractable. The radiation that enters the house has to go somewhere: some warms the air and
the structure, and a large share is spent evaporating water out of the leaves. That is why water use tracks
sunlight far more closely than it tracks the calendar, and why a cloudy week and a bright week at the same
temperature call for very different irrigation.

The cooling credit is the same number read the other way, and it is the fact that ties this tile to the
ventilation ones. Water leaving the leaves carries roughly a thousand Btu with every pound, and that heat
never appears as a temperature rise. A full crop is a substantial evaporative cooler running for free, which
is why an empty house or a freshly transplanted one runs hotter than the same house in full production
(`fan-pad-evaporative-cooling` shows the same effect from the air side).

The humidity is the third face of one calculation and the one that surprises people in tight houses. All that
water goes into the air. In a ventilated summer house it leaves with the air and nobody notices. In a closed
winter house, or a sealed indoor room, the same pounds per day become a dehumidification load that is
frequently larger than anything else in the building, and a room designed without it condenses on its own
walls.

**Inputs:** the floor or canopy area, the daily solar radiation through the glazing or the peak intensity, the latent fraction for the crop and stage, the leaching fraction, and optionally the irrigation hours per day

**Outputs:** the daily transpiration in pounds and gallons, the water use per square foot, the irrigation volume including the leaching fraction, the peak-hour rate the system must deliver, and the moisture load entering the house air in pounds and pints per day

## 3. Worked example

The 2,880 sq ft house with a full crop, 1,500 Btu per square foot per day arriving through the glazing and a
latent fraction of 0.50:

```
energy in     = 1,500 x 2,880 = 4,320,000 Btu/day
water         = 4,320,000 x 0.50 / 1,050 = 2,057 lb/day
volume        = 2,057 / 8.345 = 247 gal/day
per sq ft     = 0.0856 gal/sq ft/day
```

**247 gallons a day from a house of this size**, or 0.086 gal per square foot -- squarely inside the 0.05 to 0.15
band growers quote, which is the check that the energy route gives a sane answer.

**The irrigation system has to deliver more than that.** At a 20% leaching fraction:

```
applied = 247 / (1 - 0.20) = 308 gal/day
```

**And it has to deliver it on the peak hour, not the daily average.** At a peak intensity of 188 Btu/h per
square foot:

```
peak = 188 x 0.50 x 2,880 / 1,050 = 258 lb/h = 30.9 gal/h
```

Spread over a 12 hour day the average is 20.5 gal/h, so **the peak hour is 1.5 times the average** -- and a
system sized on the daily total divided by the day length is short by that factor exactly when the crop needs
it most.

**Every one of those pounds goes into the house air.** 2,057 lb/day is about 1,972 pints a day of moisture
released inside the structure. A ventilated house blows it outside without anyone noticing. **A sealed house
has to remove 1,972 pints a day**, which is a dehumidification load larger than most people size for, and it
is the reason closed and indoor growing rooms fail on humidity before they fail on anything else.

## 4. Scope and non-goals

An energy-balance estimate. The latent fraction carries most of the uncertainty and is not a constant: it depends on leaf area, crop stage, stomatal behaviour, air movement, and vapor pressure deficit (`vapor-pressure-deficit`), and a value chosen for a full canopy will badly overstate a newly transplanted one. It does not model the soil or substrate water balance, root-zone depletion, or the timing of irrigation events, and it does not compute runoff quality or nutrient movement (`leaching-fraction-runoff-ec`). It does not size irrigation hardware, emitters, or pumps, and it does not size dehumidification equipment -- it reports the moisture load only. It assumes a well-watered crop; a crop under water stress transpires far less and runs hotter, which changes both answers at once. The crop's producer guide, measured substrate and leachate readings, and the irrigation designer govern.
