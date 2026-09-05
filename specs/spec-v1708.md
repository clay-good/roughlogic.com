# roughlogic.com Specification v1708 -- Molded Part Shrinkage and Mold Dimension (`calc-process.js`, Group G Cross-Trade Utilities, plastics, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-process.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; plastics processing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A moulded part comes out smaller than the cavity that made it, and the mould has to be cut oversize by the shrinkage. The rate is a material property with a range rather than a value, and semi-crystalline materials shrink several times as much as amorphous ones.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a shrinkage rate outside a plausible range, or a non-positive part dimension returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the shrinkage allowance relation and the steel-safe convention with the material supplier data named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`mould shrinkage allowance`, `plastic shrink rate cavity`, `steel safe mould dimension`, `flow versus cross flow shrinkage`, `semi crystalline shrinkage`.

## 2. The tile

### 2.1 `mold-shrinkage-dimension` -- Molded Part Shrinkage and Mold Dimension

```
mould dimension   D_mould = D_part / (1 - S)      (S the shrinkage as a fraction)
                  or approximately D_part x (1 + S) for small S
shrinkage rate    amorphous (ABS, PC, PS) roughly 0.004 to 0.008 in/in
                  semi-crystalline (PP, PE, POM, nylon) roughly 0.010 to 0.025
anisotropy        flow direction and cross-flow shrinkage differ, especially in filled
                  and semi-crystalline materials
process           mould temperature, hold pressure, and hold time all move the actual
                  shrinkage within the published range
post-mould        some materials continue shrinking for hours or days after ejection
steel safe        cut the mould so corrections remove metal, not add it
```

The material class is the first-order fact. Semi-crystalline polymers shrink several times as much as amorphous
ones because the polymer chains pack into crystalline order as they cool, and that ordering takes up less volume.
So the same part in ABS and in polypropylene needs meaningfully different cavity dimensions, and a mould cut for
one will not make the part in the other.

Anisotropy is the second-order fact and it is what defeats a single shrinkage number. Material shrinks differently
along the flow direction than across it, particularly when it is filled -- glass fibres align with the flow and
restrain shrinkage in that direction while doing nothing across it -- so a flat part can come out of a
uniformly-cut cavity out of square. Getting that right requires knowing the flow pattern, which is what mould flow
analysis is for.

Process moves the result within the range. Higher hold pressure and longer hold time pack more material into the
cavity and reduce shrinkage; a hotter mould increases crystallinity in semi-crystalline materials and increases
it. So the same tool produces different dimensions on different process settings, which is why a validated
process is part of a dimensional specification rather than an afterthought.

Steel-safe is the practical discipline that follows from all this uncertainty: cut the cavity so that a wrong
guess is corrected by removing metal.

**Inputs:** the nominal part dimension, the material shrinkage rate in the flow and cross-flow directions, the material class, the direction of the dimension relative to flow, and the process conditions

**Outputs:** the cavity dimension for the entered shrinkage, the dimension range across the material shrinkage range, the difference between flow and cross-flow directions, the part dimension a stated cavity produces, and the steel-safe recommendation

## 3. Worked example

A 4.000 in nominal dimension in a material shrinking 0.018 in/in:

```
cavity = 4.000 / (1 - 0.018) = 4.0733 in
```

The mould is cut 0.0733 in oversize -- 73 thousandths on a four inch dimension.

**Material class first.** The same part in ABS at 0.005 in/in:

```
cavity = 4.000 / 0.995 = 4.0201 in
```

A difference of 53 thousandths between the two cavities. A mould cut for ABS and run in
polypropylene makes a part 53 thousandths undersize, which on a fitted part is a
scrapped tool.

**Anisotropy.** If this material shrinks 0.018 along the flow and 0.012 across it, a square feature cut uniformly
comes out rectangular:

```
flow direction cavity  = 4.0733
cross-flow cavity      = 4.0486
difference             = 25 thousandths
```

On a filled material the difference is larger still, and it is why glass-filled parts warp out of moulds cut on a
single shrinkage figure.

**Steel safe.** The range for this material might be 0.015 to 0.022 in/in, spanning
-29 thousandths of cavity dimension. Cutting to the LOW end of the shrinkage
range makes the cavity small and the part large -- and a part that is large is corrected by removing metal from
the cavity, which is possible. Cutting to the high end makes the part small, and correcting that means welding
and re-cutting.

## 4. Scope and non-goals

A shrinkage allowance calculation using rates the user supplies. Published shrinkage rates are ranges measured
on standard specimens under standard conditions, and the actual shrinkage of a specific part depends on wall
thickness, gate location and size, flow length, hold pressure and time, mould and melt temperature, and the
part's own constraint by the mould -- which is why the range is wide and why moulds are cut steel-safe and
corrected after sampling. Anisotropy between flow and cross-flow directions is significant in semi-crystalline
and filled materials and requires knowing the flow pattern. It does not address post-mould shrinkage, which
continues for hours or days in some materials and is what makes measuring a part straight out of the press
misleading, or annealing. It does not address warpage, which is differential shrinkage and is a separate and
harder problem. The material supplier's data, mould flow analysis, and the mould designer govern.
