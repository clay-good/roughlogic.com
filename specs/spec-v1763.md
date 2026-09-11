# roughlogic.com Specification v1763 -- Impressed-Current Anode Bed Resistance (`calc-corrosion.js`, Group E Carpentry and Construction, cathodic protection and corrosion control, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-corrosion.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** An impressed-current system's rectifier voltage is set by the resistance of the anode bed to earth, and `cathodic-anode-count-life` says in its own scope that it does not compute it. Anodes in a row do not simply parallel: each one sits in the others' field, and the bed is always more resistive than the arithmetic suggests.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive resistivity, length, diameter, spacing, or anode count, or a diameter at or above eight times the length returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Dwight single-anode relation and the Sunde multiple-anode relation with NACE / AMPP practice and a field resistivity survey named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`anode bed resistance`, `dwight equation anode`, `groundbed resistance to earth`, `sunde multiple anode`, `impressed current groundbed sizing`.

## 2. The tile

### 2.1 `anode-bed-resistance` -- Impressed-Current Anode Bed Resistance

```
single anode     Dwight: R = 0.00521 x rho / L x [ln(8L/d) - 1]
                 rho in ohm-cm, L and d in feet, R in ohms
the electrode    d is the diameter of the BACKFILL COLUMN, not the anode -- the coke
                 breeze is the electrode (`coke-breeze-backfill`)
N anodes         Sunde: R_N = 0.00521 rho / (N L) x
                 [ln(8L/d) - 1 + (2L/S) ln(0.656 N)]
                 where S is the centre-to-centre spacing
the extra term   (2L/S) ln(0.656 N) is the mutual interference; it is why N anodes
                 never give one-Nth of one anode's resistance
spacing          widening S shrinks the interference term; the usual guidance is at
                 least twice the anode length between anodes
soil             rho is measured in the field (`soil-resistivity-wenner`) and varies
                 by an order of magnitude with moisture and season
```

Resistance to earth is dominated by the soil immediately around the electrode, and that is what makes the
geometry behave the way it does. Nearly all of the voltage drop happens within a few diameters of the anode
column, where the current is squeezed into a small cross-section of earth. Once the current has spread out,
the remaining path contributes almost nothing, which is why a bed's resistance is set by the near field and
why doubling the distance to the structure changes it hardly at all.

The consequence for the designer is that length is the lever and diameter is not. Resistance falls roughly in
proportion to length, because a longer column presents more near-field surface to the soil; it falls only with
the logarithm of diameter, so a much fatter hole buys very little. A bed that is too resistive is fixed by
drilling deeper or adding anodes, not by augering wider.

The mutual interference term is the part that catches people who treat anodes as parallel resistors. Each
anode is pushing current into soil that its neighbours are also using, so they compete, and the bed's
resistance is higher -- often much higher -- than a single anode divided by the count. Ignoring the term
produces a rectifier voltage that is too low to drive the design current, and the system is discovered to be
underpowered only after it is energised.

**Inputs:** the soil resistivity, the anode or backfill column length and diameter, the number of anodes, and the centre-to-centre spacing

**Outputs:** the single-anode resistance to earth, the resistance of the multiple-anode bed, the naive parallel figure for comparison, the mutual interference penalty, and the resistance at an alternative spacing or column length

## 3. Worked example

A vertical anode column 10 ft long in a 8 in diameter augered hole, in soil at 5,000 ohm-cm:

```
R = 0.00521 x 5,000 / 10 x [ln(8 x 10 / 0.667) - 1]
  = 2.605 x [4.7875 - 1]
  = 9.87 ohms
```

**9.9 ohms from one anode.** Now put 10 of them in a row at 15 ft centres:

```
R_N = 0.00521 x 5,000 / (10 x 10) x [4.7875 - 1 + (2 x 10 / 15) x ln(0.656 x 10)]
    = 0.2605 x [3.7875 + 2.5080]
    = 1.640 ohms
```

**Treating them as parallel resistors would have said 0.987 ohms. The bed is 1.64 -- 66 percent higher.**
That entire difference is the interference term, ten anodes competing for the same soil, and a rectifier
sized on the parallel figure would be short of the voltage it needs to push the design current.

**Widening the spacing recovers part of it.** At 30 ft centres instead of 15:

```
R_N = 1.313 ohms
```

a 20 percent reduction for doubling the right-of-way the bed occupies, which is the trade that decides
most bed layouts.

**Length beats diameter, and it is not close.** Going from 10 ft to 20 ft of column takes a single anode from
9.9 to 5.8 ohms -- **41 percent lower for twice the depth.** Widening the hole does far less, because
diameter sits inside a logarithm: the whole geometry term only moves from 3.79 to
4.08 when the column narrows from 8 in to 6 in. **Drill deeper, do not auger wider.**

## 4. Scope and non-goals

A resistance-to-earth calculation for a conventional shallow bed. It does not design a deep anode bed, whose resistance follows a different relation and whose vent, casing, and gas-blocking details are the bulk of the engineering. It does not compute the current the structure requires (`cathodic-anode-count-life`), size the rectifier (`cp-rectifier-sizing`), or evaluate the distribution of that current along the structure (`pipeline-potential-attenuation`). Soil resistivity is entered and carries most of the uncertainty: it varies by an order of magnitude with moisture and temperature, so a bed measured in a wet spring is not the bed that must work in a dry August, and a layered soil is not represented by a single value at all. It does not address anode consumption or life, cable sizing, the header cable's own resistance, or interference with foreign structures (`stray-current-bond`). NACE / AMPP practice, a field resistivity survey, and a qualified corrosion engineer govern.
