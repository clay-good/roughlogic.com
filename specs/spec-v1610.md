# roughlogic.com Specification v1610 -- Skip Line Cycle Layout and Stripe Count (`calc-civil.js`, Group E Carpentry and Construction, traffic control, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-civil.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; traffic, work zone, and pavement), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Skip line is laid out on a cycle -- stripe plus gap -- and the stripe count for a run is a division that decides how much paint goes on the truck. Getting the cycle wrong by a foot over a mile is fifty stripes of material nobody ordered.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive stripe or gap length, or a run length shorter than one cycle returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the MUTCD skip pattern cycle convention with the agency standard drawings named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`skip line layout`, `broken lane line cycle`, `stripes per mile`, `pavement marking pattern`, `10 and 30 skip pattern`.

## 2. The tile

### 2.1 `skip-line-layout` -- Skip Line Cycle Layout and Stripe Count

```
cycle length    C = stripe length + gap length
                common: 10 ft stripe + 30 ft gap = 40 ft cycle (broken lane line)
stripes per mile n = 5,280 / C
painted length  L_paint = n x stripe length
paint quantity  from the painted length, stripe width, and application rate
                (`striping-paint-quantity` handles the material)
layout start    the first stripe's position sets the whole run; lay out from a fixed
                reference, not from where the truck happened to start
```

The arithmetic is trivial and the field consequences are not. On a 40 ft cycle a mile carries 132 stripes and
1,320 feet of paint -- exactly a quarter of the run painted, which is a useful mental check. Change the cycle to
the 15 ft stripe and 25 ft gap some agencies use and the mile carries the same 132 stripes but 1,980 feet of
paint, half again the material for an identical-looking line.

The layout reference matters more than the arithmetic. A skip line laid out from wherever the truck started
produces a stripe landing in the middle of an intersection or a driveway, and once a run is laid the whole
pattern is fixed. Laying out from a fixed point -- a joint, a station, an existing stripe on the adjoining
section -- is what keeps the pattern consistent across a project and across years of maintenance.

For a maintenance crew the useful inversion is counting: given the stripes on an existing run and its length, the
cycle in place, which tells them what pattern to match without guessing.

**Inputs:** stripe length, gap length, run length, the stripe width, the starting offset from a reference point, and the paint application rate

**Outputs:** the cycle length, the number of stripes in the run, the total painted length, the painted fraction of the run, the position of each stripe from the reference, and the cycle implied by a counted stripe count over a measured length

## 3. Worked example

A standard 10 ft stripe with a 30 ft gap:

```
cycle          = 10 + 30 = 40 ft
stripes/mile   = 5,280 / 40 = 132
painted length = 132 x 10 = 1,320 ft per mile
painted fraction = 10 / 40 = 25%
```

A quarter of the mile is paint -- 1,320 ft of stripe per mile of road.

Now a 15 ft stripe with a 25 ft gap, same 40 ft cycle:

```
stripes/mile   = 132  (unchanged)
painted length = 132 x 15 = 1,980 ft per mile
```

**660 more feet of paint per mile** for a pattern that a driver would struggle to
distinguish. On a 12 mile job that is 7,920 ft of additional stripe -- a material
difference that has to be on the estimate, and a reason to confirm the agency's pattern before ordering.

Reverse check for a maintenance crew: 99 stripes counted over 3,300 ft gives a cycle of
`3,300 / 99` = 33.3 ft, so the run in place is a 33 ft cycle and the new work should match it rather than
default to 40.

## 4. Scope and non-goals

Layout arithmetic for a uniform skip pattern. Marking patterns, stripe and gap lengths, widths, and colours are
set by the MUTCD and by the agency's own standards and vary by marking type and road class -- a lane line, a
centre line, an edge line, and a dotted extension through an intersection are different patterns with different
rules, and the tile does not select among them. It does not address the no-passing zones, arrows, symbols, and
transverse markings that a real striping job includes, or their layout. It does not compute material quantity,
which is `striping-paint-quantity`, or address retroreflectivity requirements, bead application, surface
preparation, temperature and moisture limits for application, or the removal of conflicting existing markings.
The adopted MUTCD and its state supplement, the agency's standard drawings, and the project specification
govern.
