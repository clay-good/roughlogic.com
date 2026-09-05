# roughlogic.com Specification v1557 -- Dive No-Decompression Limit and Residual Nitrogen (`calc-diving.js`, Group P Field, Backcountry, and SAR, commercial diving, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-diving.js`**
> (Group P, Field, Backcountry, and SAR -- the existing category, hub `/groups/field/`; commercial diving and hyperbaric), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** The no-decompression limit is how long a diver may stay at depth and still ascend directly, and it comes from a table or an algorithm rather than from a formula. What a planner needs alongside it is the arithmetic around it: residual nitrogen from a previous dive, surface interval, and how quickly the limit shrinks with depth.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive depth, a negative bottom time or surface interval, or a residual nitrogen time exceeding the entered no-decompression limit returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the repetitive dive bookkeeping method with the operation designated tables and 29 CFR 1910 Subpart T named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`no decompression limit`, `residual nitrogen time`, `repetitive dive planning`, `adjusted bottom time`, `surface interval credit`.

## 2. The tile

### 2.1 `no-decompression-limit` -- Dive No-Decompression Limit and Residual Nitrogen

```
NDL              read from the applicable table or algorithm for the depth and mix
repetitive dive  a previous dive leaves residual nitrogen; the table's group and surface
                 interval give a residual nitrogen time to ADD to the next dive's bottom time
adjusted NDL     NDL at depth - residual nitrogen time
nitrox           enter the table at the equivalent air depth (`nitrox-ead`)
altitude         tables must be corrected; sea-level tables do not apply
```

The limit falls very steeply with depth, roughly as the square of it over the working range, so the difference
between 60 and 100 ft is not a proportional loss of time but a large one. That shape is why depth discipline
matters more than time discipline on a working dive, and why a few feet deeper than planned can consume the whole
margin.

Repetitive diving is where the arithmetic lives. A diver surfacing carries residual nitrogen that off-gasses over
the surface interval, and the table converts what is left into a residual nitrogen time -- minutes that count
against the next dive as though they had already been spent at that depth. The adjusted limit is the table's NDL
minus that residual, and on a short surface interval it can be a small fraction of the original.

**No formula produces an NDL.** Different tables and algorithms give materially different answers for the same
profile, they are validated as complete systems, and mixing a limit from one with a residual nitrogen figure from
another is not valid. This tile performs the bookkeeping around whichever table the operation uses; it does not
supply the table.

**Inputs:** planned depth, the no-decompression limit for that depth from the applicable table, the previous dive depth and time, the surface interval, the residual nitrogen time from the table, and the mix

**Outputs:** the adjusted no-decompression limit after residual nitrogen, the total bottom time credited, the remaining time available, the equivalent air depth entry when a nitrox mix is entered, and a flag when the profile exceeds the entered limit

## 3. Worked example

A second dive to 60 ft. The operation's table gives a 55 minute no-decompression limit at that depth. The
previous dive left the diver in a repetitive group whose residual nitrogen time at 60 ft, after a 45 minute
surface interval, is 21 minutes:

```
table NDL at 60 ft        = 55 min
residual nitrogen time    = 21 min
adjusted NDL              = 55 - 21 = 34 min
```

**34 minutes**, not 55. A diver planning to the table's headline number without the residual would be 21 minutes
into decompression obligation at the point they believed they still had time in hand.

Lengthen the surface interval to two hours and the residual falls -- suppose to 9 minutes -- and the adjusted
limit rises to 46 minutes. That trade, surface interval against bottom time, is the whole structure of a
repetitive dive plan.

On EAN32 the same 60 ft dive is planned at its equivalent air depth of
`((1-0.32)/0.79) x (60+33) - 33` = {((1-0.32)/0.79)*(60+33)-33:.0f} ft, and the table is entered there instead --
which is where the extra bottom time comes from.

## 4. Scope and non-goals

Bookkeeping around a table the user supplies. **It does not contain, generate, or substitute for a
decompression table or algorithm**, and it must not be used as one. Tables and algorithms are validated as
complete systems with their own ascent rates, stop requirements, repetitive group procedures, and exceptional
exposure rules; values from different systems are not interchangeable, and the operation's own table governs
absolutely. It does not handle decompression dives, omitted decompression, altitude diving, cold or strenuous
exposure adjustments, flying after diving, or the multi-level and multi-day profiles that most real diving
involves. It does not address oxygen exposure (`nitrox-mod`) or gas supply (`surface-air-consumption`).
Decompression illness can be permanently disabling or fatal, and no calculation makes a profile safe. Commercial
diving is a regulated occupation: 29 CFR 1910 Subpart T, the ADCI or IMCA standards as applicable, the employer's
dive manual and its designated tables, and the diving supervisor govern.
