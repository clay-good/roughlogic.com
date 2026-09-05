# roughlogic.com Specification v1740 -- Stormwater Water Quality Volume and Treatment Sizing (`calc-drainage.js`, Group E Carpentry and Construction, groundwater, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; groundwater and stormwater), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Stormwater treatment is sized on the small storms that carry most of the annual pollutant load rather than on the flood, which is a different design storm and often a different facility. The water quality volume is a rainfall depth over a runoff coefficient, and it is much smaller than a detention volume.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive drainage area or rainfall depth, or an impervious fraction outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the water quality volume method and volumetric runoff coefficient with the applicable stormwater manual named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`water quality volume stormwater`, `wqv first inch runoff`, `volumetric runoff coefficient`, `stormwater treatment sizing`, `drawdown time bmp`.

## 2. The tile

### 2.1 `water-quality-volume` -- Stormwater Water Quality Volume and Treatment Sizing

```
water quality volume  WQV = P x Rv x A     converted to cubic feet
P                     the water quality rainfall depth, commonly 1.0 to 1.5 in
                      set by the state or local manual
Rv                    the volumetric runoff coefficient, commonly 0.05 + 0.009 x (% impervious)
A                     the contributing drainage area
distinction           the WQV treats the frequent small storms; detention and flood
                      control size on much larger events
drawdown              treatment facilities have a required drawdown time -- often 24 to
                      48 hours -- so the volume is available for the next storm
```

The design storm is the conceptual point. Most of the annual pollutant load from a watershed is carried by
frequent small storms rather than by the rare large one, so a facility sized to treat the first inch of runoff
captures the large majority of the annual load -- while a detention basin sized for a 25-year flood does very
little for water quality because it passes the small storms through. They are different objectives, different
volumes, and often different facilities, and conflating them produces a pond that satisfies neither.

The runoff coefficient makes the arithmetic sensitive to imperviousness in the way development actually works. A
wooded site has a coefficient near 0.05 and produces almost no runoff from a small storm; the same site paved has
a coefficient near 0.95 and produces nearly all of it. So the water quality volume for a development is
overwhelmingly a function of how much of it is hard surface, which is exactly the lever that low-impact design
pulls.

Drawdown time is the requirement that makes the volume useful more than once. A facility that holds its water
quality volume for a week is full when the next storm arrives, so the standards specify a drawdown -- long enough
for settling to occur, short enough that the storage is restored -- and an outlet sized for it is part of the
design rather than an afterthought.

**Inputs:** the contributing drainage area, the impervious percentage, the water quality rainfall depth from the applicable manual, the required drawdown time, and the facility type

**Outputs:** the volumetric runoff coefficient, the water quality volume in cubic feet and acre-feet, the volume at an alternative imperviousness, the outlet size implied by the drawdown requirement, and the comparison against a detention volume for a larger design storm

## 3. Worked example

A 2.4 acre site at 65 percent impervious, with a 1.0 in water quality rainfall depth:

```
Rv  = 0.05 + 0.009 x 65 = 0.635
WQV = 1.0 in x 0.635 x 2.4 ac x 3,630 = 5,532 cu ft
```

**5,532 cubic feet** -- about 0.13 acre-feet.

**Now the imperviousness lever.** Reduce the site to 40 percent impervious through low-impact design:

```
Rv  = 0.05 + 0.009 x 40 = 0.410
WQV = 3,572 cu ft
```

**35 percent less volume to treat**, from the site plan rather than from
the facility. That is why disconnecting impervious area, and treating it at the source, is so much cheaper than
building the pond it would otherwise require.

**And the distinction from detention.** A basin sized for a 25-year storm on this site is many times this volume
-- and it does very little for water quality, because it passes the small frequent storms that carry most of the
annual pollutant load straight through. The two objectives need different sizing and often different facilities,
and a basin designed for one and claimed for the other satisfies neither.

**Drawdown.** The facility has to empty its 5,532 cu ft within the required time -- often
24 to 48 hours -- so the storage is restored before the next storm and so settling has time to occur. The outlet
that achieves it is a design element, not a detail.

## 4. Scope and non-goals

A volume calculation using a rainfall depth and coefficient from the applicable manual. The water quality
rainfall depth, the runoff coefficient formula, the required drawdown time, and the acceptable facility types are
set by the state or local stormwater manual and vary substantially between jurisdictions -- the governing manual's
own methods must be used. It does not size a facility, design its outlet structure, or address the pretreatment,
soil, groundwater separation, and infiltration rate requirements that infiltration practices carry. It does not
address channel protection, overbank flood, or extreme flood volumes, which are separate design storms with their
own criteria. It does not address the permit obligations -- construction and post-construction stormwater permits,
maintenance agreements, and inspection -- that accompany a facility. The applicable state or local stormwater
manual, the permitting authority, and the design engineer govern.
