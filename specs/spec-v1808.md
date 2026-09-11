# roughlogic.com Specification v1808 -- Perforated Floor Tile Airflow and Plenum Pressure (`calc-datacenter.js`, Group C HVAC, data centre and mission-critical facilities, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-datacenter.js`**
> (Group C HVAC, hub `/groups/hvac/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A perforated tile passes air in proportion to the square root of the plenum pressure under it, and the plenum pressure is set by how many tiles are open. Adding a tile in front of a hot rack takes air away from every other rack in the hall.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive tile area, plenum pressure, total airflow, or tile count, or an open-area fraction or discharge coefficient outside 0 to 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the orifice flow relation for perforated floor tiles with the tile manufacturer's measured flow data and an under-floor pressure survey named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`perforated floor tile airflow`, `raised floor plenum pressure`, `tile open area cfm`, `underfloor static pressure data center`, `high flow tile grate`.

## 2. The tile

### 2.1 `raised-floor-tile-airflow` -- Perforated Floor Tile Airflow and Plenum Pressure

```
tile flow        Q = 4005 x Cd x free area (sq ft) x sqrt(dP in inches w.c.)
                 with a discharge coefficient near 0.7 for a perforated tile
free area        a 2 x 2 ft tile is 4 sq ft gross; a 25% tile has 1.0 sq ft free,
                 a 56% grate has 2.24
square root      flow goes as the SQUARE ROOT of pressure, so pressure changes are
                 weak levers and area changes are strong ones
the plenum       total flow is fixed by the running fans, so pressure ADJUSTS to
                 whatever the open tile area demands
consequence      with total flow fixed, per-tile flow = total / tile count, and
                 plenum pressure falls as the SQUARE of the tile count
the trap         opening a tile to fix one hot rack reduces delivery at every
                 other tile in the hall
obstructions     cable, piping, and abandoned trays below the floor destroy the
                 uniformity this relation assumes
```

The square root is what makes plenum pressure a poor control handle and open area a good one. Doubling the
pressure under a tile buys only about forty percent more air, while doubling the tile's free area doubles the
flow outright -- so the effective interventions are changing tile type or tile count, not chasing fan speed.
It also means a hall's pressure map can vary considerably with relatively modest consequences for delivery,
which is why floors tolerate as much non-uniformity as they do.

The conservation constraint is the part operators discover the hard way. The fans move a fixed volume of air;
the floor merely distributes it. Open another tile and the total does not increase, so the same air is divided
among more openings and every tile delivers less. A site solving a hot spot by lifting tiles is
redistributing a shortage rather than fixing it, and the symptom migrates.

Under-floor obstruction is what breaks the model in practice, and it is invisible from above. Decades of
cable, abandoned trays, piping, and containment kerbs turn a plenum into a set of partly connected chambers
with very different pressures, so a tile near a cooling unit and one at the end of a row do not deliver the
same air at the same nominal setting. A pressure survey under the floor is the only way to know, and cleaning
the plenum is frequently the highest-return work available on an old floor.

**Inputs:** the tile gross area and percentage open, the discharge coefficient, the plenum static pressure, the total supply airflow, and the number of open tiles

**Outputs:** the free area, the airflow at the entered plenum pressure for a standard and a high-flow tile, the airflow at a reduced plenum pressure, the per-tile delivery implied by the total supply and tile count, the plenum pressure that delivery requires, and the same figures for an increased tile count

## 3. Worked example

A 2 by 2 ft tile at 25% open, on a plenum at 0.05 in w.c.:

```
free area = 4.0 x 0.25 = 1.00 sq ft
Q = 4005 x 0.70 x 1.00 x sqrt(0.05) = 627 cfm
```

**627 cfm, which is one rack's worth of air at about 4 kW** (`rack-power-density-airflow`). A high-flow
grate on the same plenum:

```
free area = 4.0 x 0.56 = 2.24 sq ft
Q = 1,404 cfm
```

**2.2 times the air, exactly the free-area ratio.** Compare that with pushing the pressure instead:

```
at 0.02 in w.c., the 25% tile passes 396 cfm
```

**Cutting the pressure by 60 percent costs only 37 percent of the flow**, because of the square root. **Area
is the lever; pressure is not.**

**Now the constraint that catches everyone.** The fans deliver 96,000 cfm and the floor only divides it:

```
150 open tiles: 640 cfm each, needing 0.052 in w.c.
```

Someone opens 50 more tiles to cool a hot rack:

```
200 open tiles: 480 cfm each, needing 0.029 in w.c.
```

**Every tile in the hall just went from 640 to 480 cfm -- a 25 percent reduction at every rack**, and the
plenum pressure fell from 0.052 to 0.029 in w.c., **a 44 percent drop, because pressure falls as the SQUARE of
the tile count when total flow is fixed.**

**The hot rack may now be fine and the hall is worse.** The correct fixes are a higher-flow tile at that
location, more supply airflow, or containment -- **not more openings, which redistribute a fixed quantity of
air and move the problem somewhere no one is looking.**

## 4. Scope and non-goals

An orifice-flow relation and a conservation argument. The discharge coefficient is entered and varies with the tile's perforation pattern, thickness, and any damper beneath it; manufacturers publish measured flow curves for their tiles and those govern. The relation assumes a uniform plenum pressure beneath the tile, which a real raised floor does not provide: under-floor obstructions, the velocity pressure near a cooling unit discharge, plenum depth, and leakage through cable cutouts, cabinet bases, and the floor perimeter all make the pressure field non-uniform, and floor leakage alone can account for a large share of the supply air. A tile directly in front of a unit can even experience negative pressure and draw air downward. It does not model the plenum, which is what computational fluid dynamics or an under-floor pressure survey is for, and the conservation argument here assumes constant fan output -- a hall with pressure-controlled variable speed fans responds differently and will increase airflow instead. It does not address rack inlet temperatures, which are the actual objective (`server-inlet-envelope`), design containment, or evaluate the floor's structural capacity for high-flow grates, which have less material and lower load ratings. The tile manufacturer's measured flow data, an under-floor pressure survey, and the mechanical designer govern.
