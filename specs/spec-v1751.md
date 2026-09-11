# roughlogic.com Specification v1751 -- Greenhouse Fan-and-Pad Evaporative Cooling (`calc-greenhouse.js`, Group L Agriculture and Forestry, greenhouse and controlled-environment agriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-greenhouse.js`**
> (Group L Agriculture and Forestry, hub `/groups/agriculture/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A fan-and-pad house is sized by an airflow per square foot of floor, a pad area from a face velocity, and a saturation efficiency -- and then the air warms on its way down the house, so the crop at the fan end never sees the pad temperature.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive floor area, airflow, face velocity, or pad height, a wet-bulb temperature above the dry bulb, or a saturation efficiency outside 0 to 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the airflow rule, the pad face-velocity relation, and the saturation-efficiency definition with NGMA greenhouse design practice and the equipment manufacturers' data named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`fan and pad greenhouse cooling`, `evaporative pad sizing`, `greenhouse pad and fan airflow`, `cellulose pad face velocity`, `greenhouse temperature rise pad to fan`.

## 2. The tile

### 2.1 `fan-pad-evaporative-cooling` -- Greenhouse Fan-and-Pad Evaporative Cooling

```
airflow          about 8 cfm per sq ft of floor for a house up to roughly 100 ft
                 pad-to-fan, corrected for elevation, light, and temperature
pad area         A = airflow / face velocity; about 150 fpm for 4 in aspen and
                 250 to 400 fpm for 6 in cellulose
pad water        recirculated at roughly 0.5 gpm per linear foot of 6 in pad,
                 with a bleed to control salts
leaving air      T_pad = T_db - eff x (T_db - T_wb); eff about 0.85 for 6 in
                 cellulose, lower for thin or fouled pads
rise             the air warms as it crosses the house: dT = q_sensible / (1.08 x cfm)
crop effect      a transpiring crop converts much of the solar gain to latent heat,
                 so the sensible rise depends on the crop, not just the glazing
wet bulb         the pad can never go below the outdoor wet-bulb temperature, which
                 is the hard floor on the whole system
```

The pad is an approach to the wet-bulb temperature and nothing more. On a dry day the wet bulb sits far below
the dry bulb and a pad does spectacular work; on a humid day the same pad in the same house does very little,
because the air is already close to saturation and there is no evaporative potential to harvest. That is why
fan-and-pad is the standard in the arid West and a disappointment in the humid Southeast, and it is a property
of the climate rather than of the equipment.

The rise across the house is the number growers feel and specifiers forget. Air entering at the pad picks up
the house's sensible heat gain on its way to the fans, so the crop at the fan end is several degrees warmer
than the crop at the pad, and a house long enough will deliver air at the fan end that is no cooler than
outside. The 8 cfm per square foot rule is really a maximum-length rule in disguise: it holds the rise to a
tolerable figure for a house of ordinary length, and a longer house needs either more airflow or a mid-house
inlet.

A transpiring crop is doing a large share of the cooling, which is the fact that makes an empty house
dangerous. Water leaving the leaves carries heat away as latent heat that never appears as a temperature rise,
so a mature well-watered crop can halve the sensible gain the air has to absorb. Start the same house up with
bare benches, or with a young crop whose leaf area is small, and the rise roughly doubles -- the house runs
hotter with nothing in it than it does full.

**Inputs:** the floor area and pad-to-fan length, the airflow per square foot, the pad face velocity and pad height, the outdoor dry-bulb and wet-bulb temperatures, the pad saturation efficiency, and the house sensible heat gain or the solar input and crop latent fraction

**Outputs:** the total airflow, the pad face area and length, the pad water recirculation rate, the air temperature leaving the pad, the temperature rise to the fan end, the resulting fan-end air temperature, and the rise with no crop transpiring

## 3. Worked example

The same 30 by 96 ft house, 2,880 sq ft, in a dry climate at 95 degF dry bulb and 75 degF wet bulb:

```
airflow      = 8 cfm/sq ft x 2,880 = 23,040 cfm
pad area     = 23,040 / 250 fpm = 92.2 sq ft
pad length   = 92.2 / 5 ft high = 18.4 ft of pad
T at pad     = 95 - 0.85 x (95 - 75) = 78.0 degF
```

**A 18 ft run of 5 ft pad delivers 78 degF air into a 95 degF afternoon.** That is a 17 degF drop, and it is
the number that sells evaporative cooling. It is also the best the system will ever do, because 75 degF is the
wet bulb and the pad cannot go below it no matter how large it is.

**The crop does not get 78 degF air. It gets a gradient.** With 188 Btu/h per square foot entering through the
glazing and a well-watered crop sending about 50 percent of it back as latent heat, the sensible gain the air
must absorb is 270,720 Btu/h:

```
rise = 270,720 / (1.08 x 23,040) = 10.9 degF
air at the fans = 78.0 + 10.9 = 88.9 degF
```

So the pad end runs 78 degF and the fan end runs 89 degF -- still 6 degF below outside, but the house has a
11 degF gradient across it, and a uniform crop is being grown in two different climates.

**Empty the house and the rise doubles.** With no crop transpiring, the whole 188 Btu/h per square foot arrives as
sensible heat and the rise becomes 21.8 degF, putting the fan end at 99.8 degF -- **within 5 degF of the outside air the
system is supposed to be cooling.** The crop is not a load on the cooling system; it is part of it.

## 4. Scope and non-goals

A sizing and performance estimate. The airflow rule is a starting point that NGMA and the fan manufacturers correct for elevation, light intensity, and house temperature, and those corrections matter above a few thousand feet. It does not compute the pad's pressure drop or select the fans against it (`fan-system-effect` addresses installed fan performance generally), size the sump, pump, or bleed rate beyond the recirculation estimate, or address pad fouling, algae, and water treatment, which are what actually degrade saturation efficiency in service. It does not predict the house temperature under a control sequence or handle a mid-house inlet, a two-stage arrangement, or horizontal airflow fans. The pad cannot cool below the outdoor wet bulb, and in a humid climate the system may not be appropriate at all. NGMA design practice, the pad and fan manufacturers' data, and the greenhouse designer govern.
