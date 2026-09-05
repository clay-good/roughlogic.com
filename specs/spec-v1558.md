# roughlogic.com Specification v1558 -- Dive Surface Air Consumption and Gas Planning (`calc-diving.js`, Group P Field, Backcountry, and SAR, commercial diving, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-diving.js`**
> (Group P, Field, Backcountry, and SAR -- the existing category, hub `/groups/field/`; commercial diving and hyperbaric), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Surface air consumption is a diver's own breathing rate normalized to the surface, and it is the only number that makes gas planning arithmetic rather than guesswork. Once it is known, gas for any depth and duration is one multiplication -- and the reserve is not optional.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive consumption rate, depth, time, or cylinder volume, or a reserve exceeding the total gas returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the consumption-at-depth relation and the rock bottom reserve method, with 29 CFR 1910 Subpart T named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`surface air consumption`, `sac rate calculation`, `gas planning diving`, `rock bottom reserve gas`, `rmv breathing rate diver`.

## 2. The tile

### 2.1 `surface-air-consumption` -- Dive Surface Air Consumption and Gas Planning

```
SAC          = (psi used / minutes) x (cylinder factor) / P_ata      (psi/min at surface)
volumetric   RMV = SAC x cylinder volume / working pressure          (cu ft/min)
gas at depth = SAC x P_ata x time
rock bottom  the gas required to get the team to the surface from depth, including
             a shared-air ascent at a stated rate with a safety or deco stop
usable gas   total gas - rock bottom reserve
```

A diver's consumption at depth is their surface rate times the absolute pressure, because each breath contains
proportionally more gas. At 80 ft that multiplier is 3.4, so a diver who uses a cubic foot a minute at the surface
uses three and a half at depth -- which is why bottom time falls so much faster with depth than people expect.

The number worth building the plan around is not gas needed but gas RESERVED. Rock bottom is the volume required
for the whole team to reach the surface from the deepest point, at a controlled ascent rate, with a stop, sharing
gas -- and it is computed first and subtracted, so the usable gas is what remains. Planning to a fraction like
"turn at a third" is a shortcut that happens to approximate this on some dives and badly underestimates it on
others, particularly deep ones where the ascent itself consumes a great deal.

SAC is personal and it is not constant. It rises with work rate, cold, stress, and poor trim, and a rate measured
on a calm dive underestimates what a hard working dive will use. Measuring it on the actual kind of work is what
makes it trustworthy.

**Inputs:** measured pressure used and the time and depth it was used over, cylinder volume and working pressure, planned depth and bottom time, ascent rate and stop time, and team size for the reserve

**Outputs:** the surface air consumption in psi/min and volumetric terms, the consumption at the planned depth, the gas required for the planned dive, the rock bottom reserve for the team, the usable gas, and the maximum bottom time the usable gas supports

## 3. Worked example

A diver measured at 0.65 cu ft/min at the surface, planning 25 minutes at 80 ft:

```
P     = 1 + 80/33          = 3.42 ata
rate at depth = 0.65 x 3.42   = 2.23 cu ft/min
bottom gas    = 2.23 x 25   = 55.6 cu ft
```

56 cubic feet on the bottom. Now the reserve, which is computed BEFORE deciding the bottom time. For two
divers ascending from 80 ft at 30 ft/min with a 3 minute stop at 15 ft, at an elevated stress consumption of
1.0 cu ft/min each:

```
ascent time to the stop = 80 - 15 = 65 ft / 30 = 2.2 min at an average 2.44 ata
ascent gas, two divers  = 2 x 1.0 x 2.2 x 2.44 = 10.6 cu ft
stop gas, two divers    = 2 x 1.0 x 3 x 1.45          = 8.7 cu ft
rock bottom                                              = 19.3 cu ft
```

**19 cubic feet is not available for the dive.** With an
80 cu ft cylinder the usable gas is
61 cu ft, which at 2.23 cu ft/min is
27 minutes -- not the
36 minutes the cylinder's raw capacity suggests.

## 4. Scope and non-goals

A gas volume calculation. It is a planning aid and is not a dive plan, a decompression schedule, or a
substitute for the diving supervisor. It does not compute no-decompression limits or decompression obligation,
which constrain bottom time independently and often before gas does, and it does not address oxygen exposure. SAC
rates measured at rest badly understate working consumption, and a rate that has not been measured on comparable
work is a guess. The rock bottom calculation shown depends on assumptions about ascent rate, stop time, team size,
and elevated stress consumption that must be set to the operation's own procedures. It does not address gas
supply requirements for surface-supplied diving (`umbilical-air-supply`), which are separately specified, or the
reserve breathing supply that regulation requires. Commercial diving is a regulated occupation and running out of
gas at depth is a fatality mechanism: 29 CFR 1910 Subpart T, the ADCI or IMCA standards as applicable, the
employer's dive manual, and the diving supervisor govern.
