# roughlogic.com Specification v1810 -- Rack Upright Frame Capacity and Damage Derate (`calc-warehouse.js`, Group E Carpentry and Construction, warehouse racking and material handling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-warehouse.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** An upright frame's rating is written against a beam spacing, because the beams are what brace the column. Remove a beam level to fit a taller pallet and the unbraced length doubles -- and buckling capacity falls as the square of it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive unbraced length, moment of inertia, level count, load per level, or rated capacity returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Euler buckling relation shown as a trend and the tested-capacity requirement with ANSI MH16.1 and the rack manufacturer's tested capacities named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`rack upright frame capacity`, `beam spacing unbraced length rack`, `damaged upright derate`, `rack column buckling capacity`, `rack load plaque beam elevation`.

## 2. The tile

### 2.1 `rack-upright-capacity-derate` -- Rack Upright Frame Capacity and Damage Derate

```
what braces      the beams brace the columns; the unbraced length is the vertical
                 distance between beam levels, and the first level's elevation
                 above the floor is usually the critical one
buckling         P_cr = pi^2 E I / (K L)^2 -- capacity falls as the SQUARE of the
                 unbraced length
the rating       a manufacturer's frame capacity is stated AT a beam spacing; it
                 is not a property of the frame alone
removing a level doubling the spacing quarters the buckling capacity
real capacity    a perforated cold-formed column fails by local and distortional
                 buckling well below the Euler load; the standard requires
                 TESTED capacities, and Euler shows only the trend
damage           a dented, bowed, or torn column is not derated by a percentage --
                 ANSI MH16.1 requires it be unloaded and repaired or replaced
out-of-plumb     installation and impact both move a frame off plumb, and the
                 standard sets limits on how far
```

The beams are structure, not shelving, and that is the fact that makes rack reconfiguration dangerous. Every
beam level ties the two columns of a frame together and shortens the length over which each column can buckle.
Pull a level to fit an oversized load and the column above and below it becomes one long unbraced member, with
a capacity that falls with the square of the new length. Nothing looks different, no beam was overloaded, and
the frame's rating is no longer the number on the plaque.

That is also why the first beam elevation matters more than any other. The bottom column segment runs from the
floor to the first beam, and it carries the entire load of every level above it. Raising the first beam to
create a taller ground-level bay lengthens the most heavily loaded segment in the frame, which is the worst
place in the structure to add unbraced length.

Damage is treated differently from derating and the distinction is deliberate. A dented or bowed column has
lost section, gained an eccentricity, and has an unknown residual capacity, so the standard does not offer a
reduction factor -- it requires the frame be unloaded and the member repaired or replaced by an approved
method. A warehouse that marks damaged uprights and keeps loading them has substituted its own judgement for a
calculation nobody can make.

**Inputs:** the beam spacing or unbraced column length, the column moment of inertia and effective length factor, the number of loaded levels and the load per level, and the manufacturer's rated frame capacity

**Outputs:** the load per column and per frame, the margin against the rated capacity, the Euler buckling load at the entered spacing, the buckling load if a beam level is removed, and the ratio between the two

## 3. Worked example

A frame with 3 loaded levels at 5,000 lb per level, beams at 48 in centres:

```
load per column = 3 x 5,000 / 2 = 7,500 lb
load per frame  = 15,000 lb
rated capacity  = 24,000 lb at 48 in spacing
utilisation     = 62%
```

**62% of the rated frame capacity, which is a normal working figure.** The rating is tied to the 48 in
spacing, and here is why:

```
at 48 in unbraced: P_cr = pi^2 x 29,000,000 x 0.60 / 48^2 = 74,536 lb
at 96 in unbraced: P_cr = 18,634 lb
```

**Removing one beam level takes the buckling capacity to 25% of what it was -- a quarter, because the
length doubled and the relation is squared.** The frame that was 62% utilised is now carrying the same
load on a column with **75 percent less buckling resistance.**

**Nothing about that is visible.** The beams that remain look fine, the pallets sit where they always did, and
the load plaque still reads 24,000 lb -- **a number that described a configuration that no longer exists.**

**The Euler figures overstate the actual capacity considerably** and are shown only for the trend: a perforated
cold-formed rack column fails by local and distortional buckling well below the Euler load, which is why ANSI
MH16.1 requires TESTED capacities. The square-law dependence on unbraced length is what carries over.

**And damage is not a derate.** A dented or bowed column has lost section and gained an eccentricity that no
one can quantify from the aisle. **The standard requires it be unloaded and repaired or replaced**, not
downrated, and a facility marking damage and continuing to load it has replaced an engineering judgement with
an operational one.

## 4. Scope and non-goals

A screening comparison and a trend illustration. The Euler relation shown here is NOT a design capacity: perforated cold-formed rack columns are governed by local, distortional, and torsional-flexural buckling and by the perforation pattern, and ANSI MH16.1 requires capacities established by testing under the standard's procedures. The effective length factor for a rack column depends on the frame's bracing, the beam end connector stiffness, the base fixity, and whether the frame is braced against the building, and it is not 1.0 in general. It does not evaluate the frame as a whole -- overall stability, down-aisle and cross-aisle sway, second-order effects, and the interaction between the beams and columns are the substance of a rack design and none of them appear here. It does not assess damage, which is inspected against the standard's criteria by a qualified person and remedied by the manufacturer's approved method, nor out-of-plumb, base anchorage (`rack-base-plate-anchorage`), seismic design, or the load plaque requirements. Any reconfiguration of beam elevations is a change to the engineered design and requires the rack engineer's review. ANSI MH16.1 and the applicable building code, the rack manufacturer's tested capacities at the installed configuration, and the rack design engineer govern.
