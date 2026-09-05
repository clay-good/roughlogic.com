# roughlogic.com Specification v1503 -- Wall Assembly Dew Point and Vapor Retarder Class (`calc-buildingperf.js`, Group C HVAC, building performance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-buildingperf.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; building performance and envelope diagnostics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Whether a wall assembly gets wet is decided at one plane: the inside face of the sheathing. If that surface sits below the dew point of the indoor air that reaches it, water condenses there, and the fix is either more exterior insulation or a tighter vapor retarder. The temperature at that plane is a simple R-value proportion.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive total R-value, an inboard R-value exceeding the total, a relative humidity outside zero to one hundred, or equal inside and outside temperatures returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the R-value proportion temperature relation and the code continuous-insulation ratio concept, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`sheathing dew point`, `vapor retarder class selection`, `condensation risk wall assembly`, `continuous insulation dew point`, `wall condensation check`.

## 2. The tile

### 2.1 `vapor-retarder-dewpoint` -- Wall Assembly Dew Point and Vapor Retarder Class

```
temperature at a plane   T_x = T_in - (R_inboard / R_total) x (T_in - T_out)
dew point                from indoor temperature and relative humidity
condensation risk        T_sheathing < T_dewpoint
required ratio           R_exterior / R_total >= (T_in - T_dew) / (T_in - T_out)
```

Temperature falls across an assembly in proportion to R-value, so the sheathing's temperature depends entirely
on how the insulation is SPLIT between outside it and inside it. Cavity insulation makes the sheathing colder,
because it keeps the heat inboard; exterior continuous insulation makes it warmer, because the sheathing now sits
inside the thermal envelope. That is the entire mechanism behind the code's minimum continuous-insulation ratios
by climate zone -- they are dew point calculations turned into a table.

The other lever is the vapor retarder, and the two are alternatives rather than partners. Keep the sheathing warm
enough with exterior insulation and the assembly can be vapor-open to the inside and dry inward, which is
resilient. Keep it cold and rely on a Class I retarder to stop vapor reaching it, and the assembly has no drying
path if it ever does get wet -- from a leak, from construction moisture, from anything. The first strategy fails
gracefully and the second does not, which is worth more than the arithmetic.

**Inputs:** indoor temperature and relative humidity, outdoor design temperature, the R-value of each layer with its position, and the plane to evaluate

**Outputs:** the temperature at the evaluated plane, the indoor dew point, the margin between them, a condensation risk flag, the minimum exterior R-value that clears the dew point, and the vapor retarder class implied if that exterior R is not provided

## 3. Worked example

A 2x6 wall: R-20 cavity, R-0.5 gypsum, R-0.6 sheathing plus siding, no exterior foam. Indoors 70 degF at 35%
RH (dew point 41.0 degF), outdoors 10 degF.

```
R_total          = 20 + 0.5 + 0.6 + films 0.85 = 21.95
R inboard of the sheathing inner face = 0.68 (film + gypsum) + 20 (cavity) = 20.68
T_sheathing      = 70 - (20.68 / 21.95) x (70 - 10) = 70 - 56.5 = 13.5 degF
dew point                                            = 41.0 degF
```

13.5 degF against a 41.0 degF dew point -- the sheathing is 27.5 degF below the dew point, and any indoor air
reaching it condenses. This wall depends entirely on its vapor retarder and on air sealing, with no margin.

Add R-10 continuous exterior insulation and redo it: R_total 31.95, inboard fraction 20.68/31.95, sheathing
temperature `70 - 0.647 x 60` = 31.2 degF. Still below the dew point. R-15 exterior gives
`70 - (20.68/36.95) x 60` = 36.4 degF, and R-20 exterior gives 39.4 degF -- approaching but not clearing 41.0 at
35% RH and 10 degF outdoors, which is why cold-climate codes pair a continuous-insulation ratio WITH an indoor
humidity assumption, and why running a house at 35% RH in January matters as much as the foam does.

## 4. Scope and non-goals

A steady-state, one-dimensional dew point check at design conditions. Real assemblies are transient and store
moisture: an assembly that condenses briefly during a cold snap and dries the rest of the year may perform well,
while this check flags it, and a hygrothermal simulation such as WUFI is what resolves that question. It does not
model air leakage, which carries far more moisture into an assembly than vapor diffusion does and is the actual
cause of most sheathing failures; it does not model solar-driven inward vapor drive in reservoir claddings, wind-
washing, or rain leakage. Thermal bridging through framing is ignored here and handled by
`framing-factor-whole-wall`. Material vapor permeance values must come from tested data. The adopted energy code
and the building science consultant govern.
