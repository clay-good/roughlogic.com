# roughlogic.com Specification v1898 -- US&R Vertical Shore Post Capacity (`calc-usar.js`, Group E Carpentry and Construction, collapse shoring, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-usar.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Emergency vertical shores are designed with the US&R guides' own simplified column formula, measured on shore height, with species factors and bracing rules that belong to that method. `column-buckling-wood` applies the NDS column stability factor to one member; no tile reproduces the US&R design loads or turns them into a shore count.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive shore height, post width, post count, or load returns `{ error }`; an L/D above 50 returns `{ error }` (not permitted); no numeric field is ever `Infinity`. Citation discipline
(v19/v22): USACE *US&R Structures Specialist Field Operations Guide* (5th ed., 2006), "Structural Calculations -- Material Properties" (Fa = 480,000 psi / (L/D)^2; Fc = 1,100 psi; L/D limits), and USACE *US&R Shoring Operations Guide* Ed. 5.0 (2021), vertical shoring notes and design loads, cited by figure, named as the method, the US&R Structures Specialist named as governing, GOVERNANCE.structural.

**Relationship to an existing tile, disclosed.** `column-buckling-wood` computes a wood column's capacity by the NDS Cp method. This tile is kept because the US&R method is a distinct, simplified procedure used in the field -- a single Euler-type expression capped at Fc, taken on shore height rather than post length, with its own species factors and bracing rules -- and because its output is a shore-system check rather than a member capacity. The scope document records the overlap.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`vertical shore capacity`, `4x4 post shore load`, `usar post capacity`, `emergency shoring post`, `t-shore post load`.

## 2. The tile

### 2.1 `usr-vertical-shore-capacity` -- US&R Vertical Shore Post Capacity

```
slenderness   L/D = shore height (in) / post least width (in, actual)
stress        Fa = 480,000 psi / (L/D)^2, capped at Fc = 1,100 psi
              (the cap governs below L/D = 20.9)
post load     P = Fa x post area (actual)
species       No. 1 Douglas Fir 1.00; Southern Yellow Pine, Hem-Fir,
              Spruce-Pine-Fir 0.85; Eastern softwoods, Western cedar,
              Western woods 0.75
shore         n posts x P x species factor, against the load per shore
limits        L/D 25: beyond it a post may buckle before its cross-grain
              visibly crushes (no warning); L/D 50: maximum
bracing       lateral bracing for at least 2% of vertical capacity; 10% where
              aftershocks are possible
```

The US&R method is a field-reduced version of column design, and its virtue is that a structures specialist can do
it on a clipboard. The allowable stress falls with the square of slenderness, which is the Euler shape, and is capped
at the compression strength parallel to grain for short posts. The slenderness is taken on the shore's height rather
than the post's cut length, so the header and sole are counted. The formula reproduces the guide's published design
loads: 8,000, 5,000, and 3,500 lb for 4x4 posts in 8, 10, and 12 ft shores, and 20,000, 12,000, and 7,500 lb for 6x6
posts in 12, 16, and 20 ft shores.

The L/D of 25 is not a strength limit but a warning limit. Below it, an overloaded post crushes at its ends and
creaks, which gives the rescuers inside time to leave; above it, it can buckle suddenly. The guide's own headline
figure -- 8,000 lb for a 4x4 in an 8 ft shore -- sits at L/D 27.4, just past that line, and the tile shows the flag there
rather than suppressing it. Beyond L/D 50 the post is not used at all.

Species and grade matter as a factor on the whole shore, and the bracing requirement is a fraction of its capacity.
Two percent is the minimum lateral design force; where aftershocks are expected, the guides call for ten. The tile
reports both, because the bracing is what keeps a correctly sized shore standing when the ground moves again.

**Inputs:** the shore height, the post size (4x4, 6x6, or actual dimensions), the number of posts, the species group, the load per shore (from `collapse-floor-load` or entered), and whether aftershocks are expected

**Outputs:** the L/D, the allowable stress, the load per post, the shore capacity with species factor, the load-to-capacity ratio, the L/D 25 and 50 flags, and the lateral bracing design force

## 3. Worked example

A 3-post shore of No. 1 Douglas Fir 4x4s (3.5 in actual) at a 10 ft shore height, supporting 12,000 lb:

```
L/D     120 / 3.5 = 34.29        -> past 25: no crushing warning before buckling
Fa      480,000 / 34.29^2 = 408.3 psi
P       408.3 x 12.25 = 5,002 lb per post   (guide: 5,000)
shore   3 x 5,002 = 15,006 lb  -> 12,000 / 15,006 = 0.80, passes
bracing 2% = 300 lb; 10% with aftershocks = 1,501 lb
```

**15,000 lb of capacity for a 12,000 lb load, with 1,500 lb of bracing if aftershocks are expected** -- and the L/D flag
says this shore will not creak before it fails.

**The same shore in Hem-Fir:** 15,006 x 0.85 = 12,755 lb -- the ratio rises to 0.94, still passing, with little margin.

**A 6 ft shore of the same posts:** L/D 20.6, below the 20.9 crossover, so the 1,100 psi cap governs: 13,475 lb per
post -- **2.7 times the 10 ft figure**, which is why short shores are so much stronger than tall ones.

## 4. Scope and non-goals

A field capacity check by the US&R simplified method for solid-sawn posts under axial load. It does not design headers (the guides' rule of thumb is roughly 1 in of header depth per foot of span for wood floors), check header or sole bearing perpendicular to grain, address laced posts, pneumatic or proprietary struts (which follow their manufacturers' ratings), eccentric loads, or the capacity of the floor or ground beneath the sole. The FOG permits a stress increase for US&R shores that this method does not apply; the published design loads are reproduced without it. It is not a substitute for the structures specialist's judgment of the collapse. The US&R guides, the US&R Structures Specialist, and the incident's structural engineer govern.
