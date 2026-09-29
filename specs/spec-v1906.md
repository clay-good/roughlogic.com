# roughlogic.com Specification v1906 -- Flood Hydrostatic and Hydrodynamic Load on a Wall (`calc-floodfight.js`, Group E Carpentry and Construction, flood fight, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-floodfight.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Floodwater against a wall pushes with a triangle of still-water pressure and, where it flows, with drag -- and the drag at the fast end of FEMA's velocity range can exceed the still-water load. `submerged-earth-pressure` covers backfill below a water table; no tile computes a flood's lateral load on a wall, door, or temporary barrier.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive flood depth or wall width returns `{ error }`; a negative velocity returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): FEMA P-55, *Coastal Construction Manual*, Volume II, Chapter 8 -- Equation 8.2 (design flood velocity), Equation 8.3 (lateral hydrostatic load), Equation 8.8 (hydrodynamic load), and Table 8-2 (drag coefficients) -- named as the method, ASCE 7 Chapter 5 cited by number, the engineer of record and the floodplain administrator named as governing, GOVERNANCE.structural.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`flood load on wall`, `hydrostatic pressure floodwater`, `hydrodynamic flood force`, `water pressure on flood barrier`, `flood force on door`.

## 2. The tile

### 2.1 `flood-lateral-load` -- Flood Hydrostatic and Hydrodynamic Load on a Wall

```
hydrostatic   f_sta = 1/2 x gamma_w x ds^2   (lb per ft of wall width)
              gamma_w = 62.4 pcf fresh, 64.0 pcf salt
              acts at ds/3 above the ground (2/3 ds below the surface)
              F_sta = f_sta x wall width
velocity      lower bound V = ds / t, t = 1 s        (Eq. 8.2a)
              upper bound V = sqrt(g x ds)           (Eq. 8.2b)
hydrodynamic  F_dyn = 1/2 x Cd x rho x V^2 x A        (Eq. 8.8)
              rho = 1.94 slugs/cu ft fresh, 1.99 salt; A = width x ds
              acts at ds/2
drag          Cd by w/ds (Table 8-2): 1-12: 1.25, 13-20: 1.3, 21-32: 1.4,
              33-40: 1.5, 41-80: 1.75, 81-120: 1.8, >120: 2.0;
              2.0 square/rectangular piles, 1.2 round piles
```

Still water pushes with a pressure that grows with depth, so the load is a triangle whose area is half the unit weight
times the depth squared, acting a third of the way up. That load is why the flood-resistant design rules require
openings in enclosure walls below the flood elevation: letting water in equalises the pressure, and a wall built to
keep water out has to resist the whole triangle. The tile gives the load per foot of wall and in total, and its point of
action for the overturning check.

Moving water adds drag. FEMA brackets the velocity between a lower bound of the depth per second and an upper bound
of the shallow-water wave speed, and the choice between them depends on the flood zone, the slope, and the distance
from the source; the tile computes both. Drag grows with the square of velocity, so the two bounds can differ
eightfold, and at the upper bound the hydrodynamic load exceeds the hydrostatic one.

The drag coefficient depends on the obstruction's shape, and FEMA's table indexes it by the ratio of width to depth.
The tile selects it automatically and allows the pile values to be chosen instead. The loads are unfactored; the
design load combinations and the flood load factors belong to the governing code.

**Inputs:** the still-water flood depth, the wall or obstruction width, fresh or salt water, the velocity basis (lower bound, upper bound, or entered), and the obstruction type

**Outputs:** the hydrostatic load per foot, total, and its height, the velocity at both bounds, the drag coefficient, the hydrodynamic load and its height, and the combined lateral load

## 3. Worked example

Fresh floodwater 4 ft deep against a 10 ft wide wall:

```
hydrostatic   0.5 x 62.4 x 4^2 = 499.2 lb/ft -> 4,992 lb at 1.33 ft
velocity      lower 4 / 1 = 4.0 ft/s; upper sqrt(32.2 x 4) = 11.35 ft/s
drag          w/ds = 10 / 4 = 2.5 -> Cd = 1.25
hydrodynamic  lower: 0.5 x 1.25 x 1.94 x 4.0^2 x 40 = 776 lb at 2.0 ft
              upper: 0.5 x 1.25 x 1.94 x 11.35^2 x 40 = 6,247 lb
```

**About 5,000 lb of still-water load, plus 776 lb of drag at the lower velocity -- or 6,247 lb at the upper.** At the
upper bound the drag exceeds the hydrostatic load, which is why the velocity choice has to be justified, not defaulted.

**A 20 ft wall against 6 ft of saltwater:** 0.5 x 64 x 36 x 20 = 23,040 lb of hydrostatic load alone -- the reason a
dry-floodproofed wall is engineered, not improvised.

## 4. Scope and non-goals

A load estimate from FEMA P-55's flood load equations. It does not include breaking-wave loads, debris impact (`flood-debris-impact`), buoyancy and uplift (`flood-uplift-cover-slab`), saturated-soil pressure on a basement wall, scour, or the load factors and combinations of ASCE 7 and the building code. It does not design the wall or barrier. The velocity bound is a design judgment that the floodplain administrator or engineer should confirm. FEMA P-55, ASCE 7, the engineer of record, and the floodplain administrator govern.
