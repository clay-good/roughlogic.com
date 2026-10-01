# roughlogic.com Specification v1899 -- US&R Box Crib Capacity and Height Limit (`calc-usar.js`, Group E Carpentry and Construction, collapse shoring, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-usar.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** A box crib's capacity is not the wood's column strength; it is the bearing at the points where one layer crosses the next, and its safe height depends on how many of those points are actually bearing. `wood-bearing-perpendicular` checks one bearing and `crane-ground-bearing` sizes mats under outriggers; no tile computes a crib's capacity or its height limit.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive member width, crib width, bearing stress, or load returns `{ error }`; a layup other than 2x2 or 3x3 (or an entered contact-point count below 3) returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): USACE *US&R Shoring Operations Guide* Ed. 5.0 (2021), cribbing design load formula (L = A x N x P, P = 500 psi for No. 1 and better Douglas Fir), species factors, and height-to-width ratios, cited by figure, named as the method, the US&R Structures Specialist named as governing, GOVERNANCE.structural.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`box crib capacity`, `cribbing load capacity`, `crib height to width ratio`, `4x4 crib design load`, `6x6 cribbing capacity`.

## 2. The tile

### 2.1 `usr-crib-capacity` -- US&R Box Crib Capacity and Height Limit

```
capacity    L = A x N x P x species factor
            A = bearing area of one contact point (in^2): 3.5^2 = 12.25 for
                4x4, 5.5^2 = 30.25 for 6x6
            N = contact points per layer: 4 for a 2x2 layup, 9 for 3x3
            P = 500 psi for No. 1 and better Douglas Fir
species     Southern Yellow Pine, Hem-Fir, SPF 0.85; Eastern softwoods,
            Western cedar, Western woods 0.75
height      maximum height = ratio x shortest crib width
            3:1 all contact points bearing
            2:1 lift-and-crib operations
            1.5:1 two of four corners bearing
            1:1 one of four corners bearing
practical   about 4 ft for 4x4 cribs and 6 ft for 6x6 cribs
slope       the crib should not exceed about 15 degrees from level
```

A crib fails by crushing the wood across the grain where the layers cross, so its capacity is the number of crossing
points times the area of each times the allowable bearing stress. That is why a 3x3 layup carries more than twice a
2x2 of the same timber: nine contact points instead of four. The guide's figures follow directly -- 24,000 lb for a 2x2
of 4x4s and 60,000 lb for a 2x2 of 6x6s -- and the crushing failure is slow and audible, which is the reason cribbing is
trusted in collapse work.

Height is a stability limit, and it tightens as the crib loses contact. A crib with every point bearing may stand to
three times its narrowest width; one used to follow a load up during lifting is held to two; one bearing on only two
of its four corners, as on a sloped or irregular surface, to one and a half; on one corner, to one. The guides add a
practical ceiling for each timber size, and the tile reports whichever limit governs.

The species factor applies to the whole capacity. The crib load should also be checked against the load per crib from
`collapse-floor-load`, and the surface under the crib must carry the same load spread over the crib's footprint.

**Inputs:** the timber size, the layup (2x2 or 3x3), the species group, the shortest crib width, the bearing condition, and optionally the load on the crib

**Outputs:** the contact-point area, the number of contact points, the crib capacity with species factor, the maximum height by ratio and by the practical limit (the governing one named), and the load-to-capacity ratio when a load is entered

## 3. Worked example

A 3x3 crib of 6x6 Spruce-Pine-Fir, 4 ft wide, all points bearing:

```
capacity  30.25 x 9 x 500 = 136,125 lb     (guide rounds to 135,000)
species   x 0.85 = 115,706 lb
height    3:1 x 4 ft = 12 ft by ratio; practical limit for 6x6 = 6 ft -> 6 ft governs
```

**About 116,000 lb of capacity, and 6 ft is the height limit** -- the practical ceiling, not the ratio.

**The same crib on a rubble slope with only two corners bearing:**

```
height  1.5:1 x 4 ft = 6 ft (equal to the practical limit)
```

**Also 6 ft -- but on one bearing corner it falls to 4 ft**, and a crib taller than that has to be widened, not stacked
higher.

**A 2x2 crib of 4x4 Douglas Fir:** 12.25 x 4 x 500 = 24,500 lb (guide: 24,000), height limit about 4 ft.

## 4. Scope and non-goals

A field capacity and height check by the US&R cribbing method. It does not check the surface under the crib, the load path above it, the effect of wedges or shims, crib stability under lateral load or aftershock, or proprietary plastic cribbing, which follows its manufacturer's ratings. The FOG lists a higher perpendicular-to-grain stress (625 psi) than the SOG's 500 psi cribbing value; the tile uses the SOG value and names it. It does not assess whether cribbing is the right system for the collapse. The US&R guides, the US&R Structures Specialist, and the incident's structural engineer govern.
