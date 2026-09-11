# roughlogic.com Specification v1775 -- Anode Coke Breeze Backfill Quantity and Column (`calc-corrosion.js`, Group E Carpentry and Construction, cathodic protection and corrosion control, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-corrosion.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** The carbonaceous backfill around an impressed-current anode is not packing material -- it is the electrode. Its column dimensions set the bed's resistance to earth, and the quantity has to be ordered against the hole, not the anode.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive hole or anode dimension, an anode diameter at or above the hole diameter, an anode longer than the hole, or a non-positive density, bag weight, or anode count returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the column-volume takeoff and the carbonaceous backfill density range with NACE / AMPP practice and the anode and backfill manufacturers' data named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`coke breeze backfill quantity`, `carbonaceous backfill anode`, `anode column volume`, `calcined petroleum coke cp`, `groundbed backfill bags`.

## 2. The tile

### 2.1 `coke-breeze-backfill` -- Anode Coke Breeze Backfill Quantity and Column

```
the electrode    current leaves the anode into the coke and the COKE into the soil,
                 so the backfill column is the electrode of record
                 (`anode-bed-resistance` uses the column diameter, not the anode's)
column volume    V = pi/4 x d_hole^2 x L_hole
anode volume     V = pi/4 x d_anode^2 x L_anode -- subtracted, because the anode
                 occupies part of the hole
backfill         V_backfill = V_column - V_anode, per anode
mass             calcined petroleum coke breeze runs roughly 65 to 75 lb per cu ft
                 as placed; tamping raises it and matters to the result
consumption      the coke is consumed in preference to the anode, which is why an
                 impressed-current anode in coke outlasts the same anode in soil
the lever        resistance falls with LENGTH, not with diameter -- diameter sits
                 inside a logarithm and does almost nothing
```

Calling it backfill is the source of most of the confusion. The material has a resistivity a thousand times
below the soil's, so once current has crossed from the anode into the coke it has effectively already spread
out, and the electrochemical interface that matters is the coke-to-soil boundary at the outside of the column.
That is why the Dwight and Sunde relations take the hole diameter: the column is the anode as far as the earth
is concerned.

The coke also carries the consumption, and that is the second reason it is there. Oxidation happens
preferentially at the carbon rather than at the anode surface, so an anode packed in coke loses metal far more
slowly than the same anode in direct contact with soil. A poorly filled column with voids leaves the anode
touching soil at those points, and the consumption concentrates exactly there.

The dimensional lever is counterintuitive and it is worth carrying into the field. Resistance is roughly
inverse to column length and only logarithmic in diameter, so deepening a hole pays and widening it does not.
A contractor who cannot reach depth and offers a wider auger instead is offering almost nothing, and the
correct response is another anode rather than a fatter one.

**Inputs:** the hole diameter and depth, the anode diameter and length, the number of anodes, the backfill density as placed, the bag weight, and a waste allowance

**Outputs:** the column volume, the anode volume, the backfill volume and weight per anode, the totals for the bed in cubic feet, pounds and tons, the bag count with and without the waste allowance, and the resistance effect of changing the column diameter or the hole depth

## 3. Worked example

Ten anodes, each 2 in by 5 ft, in 8 in augered holes 10 ft deep:

```
column  = pi/4 x 0.6667^2 x 10  = 3.4907 cu ft
anode   = pi/4 x 0.1667^2 x 5  = 0.1091 cu ft
backfill= 3.4907 - 0.1091 = 3.3816 cu ft per anode
weight  = 3.3816 x 70 lb/cu ft = 236.7 lb per anode
```

For the bed of 10:

```
volume = 33.8 cu ft     weight = 2,367 lb = 1.18 tons
bags   = 2,367 / 50 = 48 bags, or 53 with a 10% allowance
```

**Subtracting the anode matters less than it looks here** -- 0.109 cu ft against a 3.491 cu ft hole is
3 percent -- but it is the right arithmetic, and on a large-diameter anode in a tight hole it is not small.

**Now the part that decides the bed's performance.** From `anode-bed-resistance` at 5,000 ohm-cm, changing the
column geometry:

```
8 in hole,  10 ft deep:  R = 9.87 ohms
 6 in hole,  10 ft deep:  R = 10.62 ohms   (+8%)
10 in hole,  10 ft deep:  R = 9.29 ohms   (-6%)
8 in hole,  20 ft deep:  R = 5.84 ohms   (-41%)
```

**Widening the hole from 6 in to 10 in -- nearly tripling the backfill volume -- buys 13 percent.** Doubling the
depth buys **41 percent.** The diameter sits inside a logarithm and the length does not, and that single fact
should decide every argument about a difficult hole.

**Order to the hole and fill it completely.** Voids are where the anode touches soil, and that is where it is
consumed -- so the allowance is not padding, it is the margin that keeps the column full after the material
settles and is tamped.

## 4. Scope and non-goals

A quantity takeoff and a geometry comparison. The as-placed density is entered and varies with the material's grading, its moisture, and how thoroughly it is tamped -- and tamping is what closes the voids, so the same order can fill a bed well or badly. It does not specify the backfill material: calcined petroleum coke, metallurgical coke, and graphite-based products differ in resistivity, consumption behaviour, and gas evolution, and the anode manufacturer's recommendation governs the pairing. It does not compute the bed's resistance (`anode-bed-resistance`) or the anode's consumption and life (`cathodic-anode-count-life`), and it does not address the venting a gas-evolving bed requires, the casing and centralising of a deep bed, the header cable and its splices, or the handling and respiratory precautions the dust calls for. It takes no position on drilling, permitting, or the disposal of cuttings. NACE / AMPP practice, the anode and backfill manufacturers' data, and a qualified corrosion engineer govern.
