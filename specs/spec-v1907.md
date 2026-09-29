# roughlogic.com Specification v1907 -- FEMA Flood Debris Impact Load (`calc-floodfight.js`, Group E Carpentry and Construction, flood fight, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-floodfight.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** A flood carries debris -- pieces of other buildings, poles, tanks -- and FEMA's design method gives a single impact force from the object's weight, the water's speed, and three coefficients. `impact-load-factor` covers a dropped weight; no tile computes flood-borne debris impact.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive debris weight or flood depth returns `{ error }`; a negative velocity returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): FEMA P-55, *Coastal Construction Manual*, Volume II, Chapter 8 -- Equation 8.9 (debris impact load), Table 8-3 (depth coefficient), Table 8-4 (blockage coefficient), and the building structure coefficient values -- named as the method, ASCE 7 Chapter C5 cited by number, the engineer of record named as governing, GOVERNANCE.structural.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`flood debris impact force`, `debris impact load fema`, `waterborne debris load`, `flood impact on piles`, `coastal debris impact`.

## 2. The tile

### 2.1 `flood-debris-impact` -- FEMA Flood Debris Impact Load

```
impact     Fi = W x V x C_D x C_B x C_Str      (lb, at the still-water level)
W          debris weight, 1,000 lb recommended where the local debris is unknown
V          flood velocity; Eq. 8.9 approximates it as 1/2 x sqrt(g x ds),
           or enter a velocity within the Eq. 8.2 bounds
C_D        depth coefficient (Table 8-3): 1.0 in a floodway, Zone V, or Zone A
           deeper than 5 ft; in Zone A = 0.25 x (ds - 1), from 0 below 1 ft
           (0.375 at 2.5 ft, 0.75 at 4 ft -- the table's rows exactly)
C_B        blockage (Table 8-4), screening within 100 ft upstream:
           none, path > 30 ft 1.0; limited, 20 ft 0.6; moderate, 10 ft 0.2;
           dense, < 5 ft 0.0
C_Str      structure (s/ft): 0.2 timber pile or masonry column, 3 stories or
           less; 0.4 concrete pile or concrete/steel moment frame, 3 stories or
           less; 0.8 reinforced concrete foundation wall
```

FEMA's debris equation is an impulse turned into a force: a mass moving with the water, stopped by a structure whose
stiffness sets how quickly it stops. The structure coefficient carries that stiffness, and it is the counterintuitive
part -- a stiff reinforced concrete wall takes four times the force of a flexible timber pile from the same object,
because it stops it faster. The coefficients for depth and blockage reduce the velocity where shallow water or
upstream trees and buildings slow the debris down.

The recommended weight of 1,000 lb stands for a piece of a damaged building, a utility pole, a length of pile, or an
empty tank, and it is the right default where nothing better is known. On coasts with log debris the weight is much
larger, and local guidance governs. The velocity FEMA uses inside the equation is half the shallow-water wave speed,
which sits between the Equation 8.2 bounds; the tile uses it by default and accepts an entered value.

The depth coefficient's table rows fall on a straight line, and the tile uses the line so that depths between the rows
are handled consistently. The force acts at the still-water elevation, which is what an overturning or pile-bending
check needs.

**Inputs:** the debris weight, the flood zone, the still-water depth, the velocity (default from Eq. 8.9), the upstream screening, and the structure type

**Outputs:** the velocity used, the depth, blockage, and structure coefficients, the impact force, and its elevation

## 3. Worked example

A reinforced concrete foundation wall in Zone A with 4 ft of still water, no upstream screening, 1,000 lb debris:

```
V     1/2 x sqrt(32.2 x 4) = 5.67 ft/s
C_D   0.25 x (4 - 1) = 0.75        C_B 1.0        C_Str 0.8
Fi    1,000 x 5.67 x 0.75 x 1.0 x 0.8 = 3,405 lb at the still-water level
```

**About 3,400 lb** -- concentrated at one point, where the hydrostatic load of `flood-lateral-load` is spread over the
whole wall.

**The same debris against a timber-pile house:** C_Str 0.2 -> 851 lb, **a quarter of the concrete wall's force** from
the same object.

**A pile-supported house in Zone V with 8 ft of still water:** V = 1/2 x sqrt(32.2 x 8) = 8.02 ft/s; C_D = 1.0;
Fi = 1,000 x 8.02 x 1.0 x 1.0 x 0.2 = 1,605 lb.

## 4. Scope and non-goals

A debris impact estimate by FEMA P-55's simplified method. It does not address very large debris (logs, vessels, shipping containers), multiple simultaneous impacts, the local strength of the element struck, or tsunami loads, and it does not apply load factors or combinations. Local guidance on debris type and weight supersedes the default. It does not compute hydrostatic or hydrodynamic loads (`flood-lateral-load`). FEMA P-55, ASCE 7, and the engineer of record govern.
