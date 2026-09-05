# roughlogic.com Specification v1508 -- Blast Hole Burden and Spacing Layout (`calc-mining.js`, Group E Carpentry and Construction, blasting, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Burden is the single most consequential dimension in a blast, and it scales with hole diameter through a burden ratio. Getting it wrong in one direction leaves toe and blocky muck; in the other it throws rock. The starting values are simple ratios that a blaster then adjusts to the rock in front of them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive hole diameter, burden ratio, or bench height, or a spacing-to-burden ratio outside a plausible range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the standard burden-ratio and stiffness-ratio relations with MSHA named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`blast burden spacing`, `burden ratio hole diameter`, `stiffness ratio bench`, `drill pattern layout blasting`, `subdrill stemming ratio`.

## 2. The tile

### 2.1 `blast-burden-spacing` -- Blast Hole Burden and Spacing Layout

```
burden          B = K_b x d / 12       (d in inches, K_b typically 20 to 35)
spacing         S = 1.15 to 1.4 x B for a staggered pattern; 1.0 to 1.2 square
stiffness       H / B should exceed 2 (below 1.5 the bench behaves like a crater)
subdrill        J = 0.2 to 0.5 x B
stemming        T = 0.7 to 1.0 x B
```

Every dimension in a blast pattern is a multiple of either the hole diameter or the burden, which is why one
ratio propagates through the whole design. The burden ratio itself carries the rock and the explosive: a low
ratio near 20 suits hard rock or a low-energy product, a high one near 35 suits soft rock and a high-energy
product, and 25 is a common starting point for ANFO in medium rock.

Stiffness ratio is the check that stops a bad pattern before it is drilled. A bench whose height is less than
about twice the burden cannot break properly to the free face -- the charge behaves like a crater instead, venting
upward, and the result is airblast, flyrock, and poor fragmentation. On a shallow bench the answer is a smaller
diameter and a tighter pattern, not the same holes spread further apart, and this ratio is what makes that
argument quantitatively.

**Inputs:** hole diameter, burden ratio for the rock and explosive, bench height, the spacing-to-burden ratio and pattern type, and the subdrill and stemming ratios

**Outputs:** the burden, spacing, subdrill, and stemming; the stiffness ratio with a warning below 2; the pattern area and rock volume per hole; and the maximum hole diameter a given bench height supports at the entered ratios

## 3. Worked example

A 3.5 in hole at a burden ratio of 25:

```
B = 25 x 3.5 / 12      = 7.29 ft   -> use 7 ft
S = 1.15 x 7.29       = 8.39 ft   -> use 8 ft staggered
J = 0.3 x 7.29        = 2.19 ft subdrill
T = 0.7 x 7.29        = 5.10 ft stemming
```

On a 30 ft bench the stiffness ratio is `30 / 7.29` = 4.1 -- comfortably above 2, so the bench will break
properly.

Now the failing case. Drop the bench to 12 ft and keep the same 3.5 in holes: stiffness is `12 / 7.29` =
1.6, below the limit, and this pattern will vent rather than break. The fix is a smaller hole. At 2.5 in and
the same ratio the burden is 5.21 ft and stiffness becomes 2.3 -- workable. Spreading the
3.5 in holes further apart would make it worse, not better.

## 4. Scope and non-goals

Starting-point pattern geometry from published ratio ranges. These are a first design to be adjusted against
the rock actually in the face: jointing, bedding, mud seams, voids, and a variable free face all move the correct
burden more than the ratios do, and a burden that is right on one end of a bench can be wrong on the other. The
ratios assume a vertical or near-vertical hole to a clean free face with adequate relief; angled holes, choked
faces, presplit lines, trim rows, and secondary blasting all follow different rules. It does not design the
initiation sequence and timing, which controls relief, fragmentation, and vibration as much as the pattern does.
It does not evaluate flyrock, vibration, or airblast. Blasting is a licensed activity: the blaster in charge, the
state and federal explosives regulations, MSHA or OSHA jurisdiction, and the site's blast plan govern.
