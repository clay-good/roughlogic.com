# roughlogic.com Specification v1521 -- Rock Bolt Pattern and Support Pressure (`calc-mining.js`, Group E Carpentry and Construction, underground, 1 New Tile)

> **Status: LANDED 2026-09-05. Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A rock bolt pattern is usually specified as a spacing, but what it delivers is a support pressure -- bolt capacity spread over the area each bolt holds. Converting between the two is one division, and it is what lets a crew compare a pattern against what the ground actually needs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive bolt capacity, spacing, rock unit weight, or loosened-zone height returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the support-pressure conversion and dead-weight criterion with MSHA ground control named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`rock bolt support pressure`, `bolt pattern spacing ground support`, `rock bolt density`, `support pressure kpa bolts`, `dead weight rock bolt check`.

## 2. The tile

### 2.1 `rock-bolt-support-pressure` -- Rock Bolt Pattern and Support Pressure

```
support pressure   p = T_bolt / (s_1 x s_2)        (bolt capacity / area per bolt)
required spacing   s = sqrt( T_bolt / p_required )
bolt length        commonly 2 x spacing, or one third of the span, whichever governs
dead weight check  p must at least carry the loosened zone: p >= gamma x h_loose
```

Each bolt is responsible for the ground in its own tributary area, so the pressure it supplies is its capacity
divided by that area. The relation is what makes patterns comparable: a 5 ft pattern of 15 ton bolts and a 4 ft
pattern of 10 ton bolts are not the same, and the division says which is stronger in one line.

Two rules of thumb travel with it. Bolt length is tied to spacing -- roughly twice the spacing -- because bolts
closer together than half their length interact to build a compressed rock beam, which is the actual mechanism in
bedded ground, and bolts spaced further apart than that act as individual anchors and do not. And the minimum
useful check is dead weight: the pattern must at least hold up the loosened zone it is stitching, so support
pressure has to exceed the unit weight of the rock times the height of that zone. A pattern that fails the dead
weight check is not a pattern, whatever else the design says.

**Inputs:** bolt working capacity, bolt spacing in each direction, bolt length, the span, and the rock unit weight with the estimated loosened-zone height

**Outputs:** the support pressure in psf and psi, the area per bolt, the spacing required for a target support pressure, the dead-weight requirement for the entered loosened zone, a pass or fail against it, and the bolt length the spacing implies

## 3. Worked example

A 4 ft by 4 ft pattern of bolts with a 12,000 lb working capacity:

```
area per bolt    = 4 x 4        = 16 sq ft
support pressure = 12,000 / 16    = 750 psf = 5.21 psi
bolt length      ~ 2 x 4         = 8 ft
```

750 psf of support. Now the dead-weight check against a 6 ft loosened zone in 165 pcf rock:

```
required = 165 x 6 = 990 psf
supplied = 750 psf   -> FAILS, margin 0.76
```

Comfortable. Open the pattern to 5 ft and support pressure falls to `12,000 / 25` = 480 psf, and the margin
against the same loosened zone drops to 0.48 -- still adequate but with much less room, and at 6 ft
spacing (333 psf) the pattern is below the dead weight requirement and would not hold the loose ground it
is there to hold.

## 4. Scope and non-goals

A pressure conversion and a dead-weight screen. It is not a ground support design. It does not determine the
loosened-zone height, which depends on rock mass quality, span, stress, and excavation method, and which is the
input that dominates the answer; empirical systems such as Q, RMR, or the GSI-based approaches, or a numerical
analysis, are what establish it. It does not evaluate bolt type and anchorage (mechanical, resin, friction,
cable), corrosion protection and design life, pull testing and quality assurance, the interaction between bolts
and shotcrete or mesh, dynamic loading in burst-prone ground, or wedge and block analysis, which in jointed rock
usually governs bolt length and orientation rather than any pressure criterion. Ground support is a life-safety
system: MSHA ground control requirements, the site's ground control plan, and a qualified geotechnical engineer
govern.
