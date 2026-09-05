# roughlogic.com Specification v1531 -- Drilling Mud Weight and Hydrostatic Pressure (`calc-oilgas.js`, Group E Carpentry and Construction, drilling, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-oilgas.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; oil, gas, and pipeline), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Hydrostatic pressure is the number that keeps a well from flowing, and it is 0.052 times mud weight times TRUE VERTICAL depth. Using measured depth instead of TVD on a deviated well overstates the pressure and is a well-control error, not an arithmetic one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive mud weight or true vertical depth returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the 0.052 hydrostatic relation with the true-vertical-depth requirement, and API well control standards named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`mud hydrostatic pressure`, `0.052 mud weight tvd`, `bottom hole pressure mud`, `pressure gradient ppg`, `equivalent mud weight from pressure`.

## 2. The tile

### 2.1 `mud-hydrostatic-pressure` -- Drilling Mud Weight and Hydrostatic Pressure

```
hydrostatic     P = 0.052 x MW x TVD          (psi, ppg, feet)
gradient        psi/ft = 0.052 x MW
overbalance     P_hyd - P_formation
equivalent MW   MW = P / (0.052 x TVD)
CRITICAL        TVD, never measured depth
```

The constant 0.052 is just unit conversion -- a pound per gallon over a foot of vertical column is 0.052 psi --
but the depth it multiplies is the entire point. Pressure comes from the vertical height of fluid, so a well
drilled to 12,000 ft measured depth that is only 9,800 ft true vertical has the hydrostatic of 9,800 ft, and a
crew that uses the measured depth believes it has {0.052*12.5*(12000-9800):.0f} psi more overbalance than it does.
On a high-angle or horizontal well that gap is enormous.

Everything in well control is built on this one line. Formation pressure expressed as an equivalent mud weight,
kick tolerance, the kill sheet, leak-off test results, and equivalent circulating density are all this relation
rearranged. Getting the sign of the comparison right is the whole job: hydrostatic above formation pressure is
overbalance and the well is static; below it and the well flows.

**Inputs:** mud weight, true vertical depth, and optionally the formation pressure or its equivalent mud weight and the measured depth for comparison

**Outputs:** the mud gradient in psi/ft, the hydrostatic pressure at the entered TVD, the overbalance or underbalance against a stated formation pressure, the equivalent mud weight of a stated pressure, and the hydrostatic that measured depth would wrongly imply

## 3. Worked example

12.5 ppg mud at 9,800 ft TVD:

```
gradient    = 0.052 x 12.5          = 0.650 psi/ft
hydrostatic = 0.650 x 9,800      = 6,370 psi
```

Against a formation pressure of 6,100 psi that is 270 psi of overbalance, or in mud weight terms a
formation equivalent of `6,100 / (0.052 x 9,800)` = 11.97 ppg against 12.5 ppg in the hole.

Now the error this tile exists to prevent. If the well is 12,000 ft measured depth and someone uses that instead
of TVD:

```
wrong hydrostatic = 0.650 x 12,000 = 7,800 psi
```

1,430 psi of pressure that is not there. A crew believing they have 1,700 psi of
overbalance when they have 270 psi has a much smaller margin than they think, and on a well where the
formation is closer to balance that difference is the kick.

## 4. Scope and non-goals

The static hydrostatic relation for a single uniform fluid column. It does not handle a column with more than
one fluid density, gas or cuttings in the annulus (both of which reduce hydrostatic and are how a well starts
flowing), or the equivalent circulating density while pumping, which is higher than static and is what fractures
formations. It does not compute formation pressure, fracture gradient, kick tolerance, or maximum allowable
annular surface pressure, and it is not a kill sheet (`kill-mud-weight`). Barite sag, temperature and pressure
effects on mud density, and swab and surge pressures during tripping all move the real bottom-hole pressure and
are not modeled. Well control is a licensed, certified discipline: the operator's drilling program, the well
control certification of the crew, IADC and API standards, and the regulator govern.
