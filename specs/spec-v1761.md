# roughlogic.com Specification v1761 -- Photoperiod Lighting Hours and Blackout Schedule (`calc-greenhouse.js`, Group L Agriculture and Forestry, greenhouse and controlled-environment agriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-greenhouse.js`**
> (Group L Agriculture and Forestry, hub `/groups/agriculture/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Flowering in many crops is triggered by the length of the uninterrupted dark period, not by the amount of light, and the two are controlled by entirely different equipment. A few footcandles at the wrong hour undoes a blackout that cost a house full of fabric.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive PPFD or photoperiod, a photoperiod or dark period above 24 hours, or a pull and open time that do not define a dark period returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the photoperiodic dark-period convention and the daily light integral definition with the crop producer guide named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`photoperiod control greenhouse`, `blackout cloth schedule`, `night interruption lighting`, `short day long day crop`, `critical dark period`.

## 2. The tile

### 2.1 `photoperiod-blackout-schedule` -- Photoperiod Lighting Hours and Blackout Schedule

```
the signal       photoperiodic crops read the length of the UNINTERRUPTED DARK
                 period, not the light period -- the dark hours are the control
short day        flowers when the dark period exceeds a critical length; held
                 vegetative by BREAKING the night
long day         flowers when the dark period is short; brought into flower by
                 NIGHT INTERRUPTION or by day extension
blackout         pulled to create dark: dark hours = (24 - pull time) + open time
night break      commonly 4 hours across the middle of the night at a very low
                 intensity; 10 footcandles is a typical figure
DLI cost         the night break adds almost nothing to the daily light integral,
                 because it is a signal and not an energy input
light leak       a door gap, an exit sign, or a neighbouring house's lamps can
                 supply the few footcandles that break a night nobody meant to break
```

The dark period is the controlled variable and this is the fact the whole practice turns on. A grower who
thinks in day length will reason that a longer day means more light and better growth, and then be baffled
when a crop under supplemental lighting refuses to flower. The lamps did not add light so much as they removed
night, and for a short-day crop that is the difference between a saleable crop and a bench of foliage.

A night break is remarkably cheap because it carries no energy burden worth counting. Interrupting the dark
period needs an intensity low enough that the addition to the daily light integral is negligible, which means
the equipment is small, the power is trivial, and the whole intervention is a signal. That asymmetry --
enormous biological effect, negligible energy -- is what makes photoperiod control the most cost-effective
lever in ornamental production, and it is also what makes an accidental light leak so damaging.

Blackout is the harder half because darkness has to be complete and greenhouses are built to be transparent.
The fabric is the easy part; the gaps at the gutters, the ends, the doors, and around equipment penetrations
are where the practice fails, and a crop can be held vegetative on one side of a house and flowering on the
other by a single unsealed edge. Pulling blackout also seals the house against ventilation at the hottest part
of the afternoon, which is why blackout schedules and cooling schedules are one conversation.

**Inputs:** the crop's critical dark period and photoperiod class, the blackout pull and open times or the natural day length, the night interruption hours and intensity, and the supplemental PPFD and photoperiod for the light-integral comparison

**Outputs:** the uninterrupted dark hours the schedule produces, the resulting light period, whether the dark period satisfies the entered critical length, the daily light integral at the long and short photoperiods and the difference, and the light integral contributed by a night interruption

## 3. Worked example

A blackout pulled at 17:00 and opened at 08:00:

```
dark period = (24 - 17) + 8 = 15 hours uninterrupted
light period = 24 - 15 = 9 hours
```

**15 hours of dark clears the 12 to 13 hour critical period nearly every short-day crop needs**, with margin for
a crew that is a few minutes late on the pull.

**The light cost of that schedule is the part to look at.** At 400 micromol/m^2/s, the difference between a 16 hour
and an 11 hour photoperiod is:

```
16 h: DLI = 400 x 16 x 3600 / 1e6 = 23.04 mol/m^2/day
11 h: DLI = 400 x 11 x 3600 / 1e6 = 15.84 mol/m^2/day
```

**31 percent of the daily light integral, given up to get the flowering signal.** That is the real price of a
short-day schedule, and it is paid in growth rate, not in fabric.

**Now the other direction, and the number that makes photoperiod control worth doing.** A night interruption of
4 hours at about 2 micromol/m^2/s -- roughly 10 footcandles, a very dim lamp -- contributes:

```
DLI = 2 x 4 x 3600 / 1e6 = 0.0288 mol/m^2/day
```

**0.029 mol/m^2/day, which is 0.12 percent of the 23.0 mol crop budget.** Essentially nothing, for a complete
reversal of the flowering response. **The signal is free and the darkness is expensive**, and that asymmetry is
the whole economics of photoperiod control.

**It is also the warning.** If 2 micromol/m^2/s across four hours is enough to break a night on purpose, then a
security light, an exit sign, or the glow from the house next door is enough to break one by accident -- and
nothing in the crop's appearance will say so until it fails to flower.

## 4. Scope and non-goals

A schedule and light-integral calculation. It does not predict flowering: critical dark periods are crop and cultivar specific, they shift with temperature and with the plant's stage and maturity, and many crops are quantitative rather than absolute in their response -- the crop's producer guide is the only source for the critical period, and this tile takes it as an input. It does not address the spectral dependence of the photoperiodic response, which is red and far-red sensitive in ways a single intensity figure cannot carry, nor does it distinguish night interruption from day extension in effect. It does not design the blackout system, its seals, its drive, or the ventilation and cooling that a sealed house needs while the fabric is pulled, and it does not detect or quantify light leaks, which are the usual cause of failure and which are found by standing in the dark house rather than by calculating. The crop's producer guide, the blackout manufacturer's data, and the grower's own trial records govern.
