# roughlogic.com Specification v1576 -- Master Key System Depth and Bitting Capacity (`calc-doorhardware.js`, Group E Carpentry and Construction, locksmithing, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-doorhardware.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; door hardware and locksmithing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A master key system runs out of usable keys long before people expect, and the arithmetic that says how many it can hold is a product of the usable depths per position. Designing a system without it produces a master key that opens things it should not, years later, when the last available change key is issued.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a cut count below one, a usable depth count below two, or a mastered position count exceeding the cut count returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the progression capacity relation as standard master keying practice with the manufacturer specification named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`master key system capacity`, `bitting capacity locksmith`, `key progression count`, `how many change keys`, `two step progression master key`.

## 2. The tile

### 2.1 `master-key-bitting-capacity` -- Master Key System Depth and Bitting Capacity

```
theoretical      total = (usable depths)^(number of cuts)
master system    positions are split: some carry the master cut, some the change cut
two-step system  each mastered position gives a limited number of change values
usable depths    fewer than the physical depths, after MACS and adjacent-cut rules
progression      the change key differs from the master in the progressed positions only
practical yield  far below the theoretical, typically by an order of magnitude
```

The theoretical count is a power, and powers grow fast enough to be misleading. Six positions with six usable
depths gives 46,656 combinations, which sounds inexhaustible -- until the master key claims one value at each
mastered position, adjacent-cut and MACS rules
(`key-cut-macs-check`) eliminate a large fraction, keyway restrictions cut it again, and the requirement that
change keys not accidentally operate other cylinders cuts it further. The number of genuinely usable change keys
in a two-level system is a small fraction of the headline figure.

The failure this prevents is specific and expensive. A system designed without a proper progression eventually
issues a change key whose cuts, combined with the master wafer stack, operate a cylinder it was never meant to --
a cross-keying accident. Discovering that in a building with a thousand cylinders means rekeying the building.

The design decision the tile supports is how many positions to master. Mastering more positions gives more
change keys and less security; mastering fewer gives a tighter system with a smaller capacity, and the trade
should be made deliberately at the start rather than discovered at key three hundred.

**Inputs:** number of cut positions, usable depths per position after the cut rules, the number of positions to be mastered, the progression step, and the number of change keys required

**Outputs:** the theoretical combination count, the change keys available in a two-step progression at the entered mastering, the count at alternative numbers of mastered positions, the margin against the required key count, and a warning where the requirement approaches the capacity

## 3. Worked example

A 6-pin system with 4 usable depths per position after the cut rules:

```
theoretical total = 4^6 = 4,096
```

4,096 looks like plenty. Now master two positions with a two-step progression:

```
change keys per mastered position ~ (usable depths / 2) = 2
change keys available             ~ 2^2 = 4
```

**4 change keys**, not 4,096. That is the number the building has to live within, and a facility
with 40 doors and a plan to expand has already outgrown it.

Master three positions instead and capacity rises to 8 -- better, at the cost of a master key that
differs from every change key in only three places, which is a weaker system.

The design conclusion: this system needs either more pin positions, a larger usable depth set, more mastered
positions, or a multi-keyway approach, and that decision is made before the first cylinder is pinned. It cannot
be fixed afterward without rekeying everything.

## 4. Scope and non-goals

A capacity estimate for a simple two-level, two-step progression. Real master key system design is more
involved: multi-level systems with grand masters and great-grand masters, selective keying, cross-keying,
constant cuts, keyway families, and manufacturer-specific restricted keyways all change the arithmetic
substantially, and the usable depth count itself depends on the manufacturer's cut specification, MACS, and
adjacent-cut rules. It does not generate a bitting list, check for cross-keying conflicts, or verify that no
change key inadvertently operates another cylinder -- which is the actual work of system design and which is done
with a bitting chart or software, not a capacity number. It does not address high-security, interchangeable core,
or electronic credentials. Master key system design is a security function: the lock manufacturer's system
specification, a qualified locksmith or system designer, and the facility's key control policy govern.
