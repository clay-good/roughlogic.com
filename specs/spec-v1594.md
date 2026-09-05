# roughlogic.com Specification v1594 -- LP-Gas Container Separation Distance (NFPA 58) (`calc-gas.js`, Group B Plumbing and Gas, propane, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-gas.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; propane and lp-gas service), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Where a propane tank may sit is set by its water capacity, and the distances to buildings, property lines, and ignition sources come off a table with hard steps. A tank placed by eye and discovered at inspection has to be moved, which means new pad, new piping, new everything.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive water capacity or measured distance, or a container type outside the tabulated range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): NFPA 58 container separation tables by name with the AHJ named as governing the adopted edition, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`propane tank separation distance`, `nfpa 58 tank placement`, `lp gas clearance to building`, `propane tank property line distance`, `tank setback requirements`.

## 2. The tile

### 2.1 `lp-container-separation` -- LP-Gas Container Separation Distance (NFPA 58)

```
separation      NFPA 58 tables give minimum distances by container water capacity
                 to buildings, to property lines, and between containers
steps            the distances step at capacity breakpoints (125, 250, 500, 2,000 gal, etc.)
                 so a small increase in tank size can move a tank a long way
other clearances to sources of ignition, to openings and window wells below the relief
                 discharge, to driveways, and to combustible materials
underground     different and generally shorter distances than aboveground
filling         the point of transfer has its own separation requirements
```

The distances are tabulated by water capacity and they step rather than scale, so the choice between a 500 and
a 1,000 gallon tank is not only a capacity decision -- it can move the tank across the yard. Checking the
separation for both candidate sizes before choosing is the cheap version of that conversation.

The clearance people forget is not to the building wall but to OPENINGS. The relief valve discharge has to be
clear of windows, doors, and any opening into a below-grade space, because propane is heavier than air and will
find a basement window well and stay there. That is a directional requirement -- where the relief points matters,
not only how far the tank sits.

The other quiet one is the point of transfer. The place the delivery hose connects has its own separation
requirements, which are frequently more restrictive than the tank's own, and a tank that complies while the truck
is absent can be non-compliant while it is being filled.

**Inputs:** container water capacity, aboveground or underground, the measured distances to the building, property line, nearest ignition source, and nearest opening, and the point of transfer location

**Outputs:** the required separation to each element for the entered capacity, each measured distance against its requirement with the margin, a pass or fail per element, the requirements at the next capacity breakpoint up and down, and a flag for relief discharge directed toward an opening

## 3. Worked example

A 500 gallon aboveground tank being sited. The NFPA 58 table for that capacity gives minimum distances to
important structures and property lines that must be read from the adopted edition; the tile compares each
measured distance against the entered requirement.

The shape of the problem, which is what a field user needs:

```
tank at 500 gal   -> one set of distances
tank at 1,000 gal -> the next step up, and a materially longer distance to the building
```

A yard that accommodates a 500 gallon tank may not accommodate a 1,000, and that is worth knowing before the
customer is told they can double their capacity. The reverse also holds: two 500 gallon tanks manifolded together
may be treated differently from one 1,000 gallon tank, and manifolding also helps vaporization
(`propane-vaporization-rate`), so it is a genuine option rather than a workaround.

The directional check that has no distance in the table: the relief valve discharge must not point at a window,
a door, or a below-grade opening. Propane is heavier than air, so a relief discharge above a basement window well
puts flammable vapour into a confined space, and no separation distance measured horizontally addresses it.

## 4. Scope and non-goals

A comparison against distances the user reads from the adopted NFPA 58 tables. **No table is shipped**: the
distances differ by container capacity, by whether the container is aboveground or underground, by service, and
by the edition of NFPA 58 the jurisdiction has adopted, and many jurisdictions amend them. It does not address
the many other placement requirements -- protection from vehicle impact, container support and foundation,
corrosion protection, security, clearance to overhead electrical conductors, and the separate requirements at the
point of transfer -- and it does not evaluate the piping, regulator location, or venting. It does not address
containers in buildings, on roofs, or in enclosures, each of which carries its own rules. LP-gas container siting
is a fire and life-safety matter: NFPA 58, the adopted fire and fuel gas codes, the AHJ, and the gas supplier
govern.
