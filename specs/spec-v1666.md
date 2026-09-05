# roughlogic.com Specification v1666 -- Radiographic Exposure Time and Source-to-Film Distance (`calc-inspection.js`, Group E Carpentry and Construction, welding inspection, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-inspection.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; welding inspection and ndt), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Radiographic exposure time follows the inverse square law, so moving the source further from the film to improve geometry costs time as the square of the distance. It is the trade every shot is set on, and the arithmetic lets a technician change one and correct the other.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive distance, exposure time, source size, or thickness, or an elapsed time exceeding a plausible source life returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the inverse square and geometric unsharpness relations with 10 CFR Part 34 and the radiation safety officer named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`radiographic exposure time distance`, `inverse square law radiography`, `source decay exposure correction`, `geometric unsharpness sfd`, `ir-192 half life exposure`.

## 2. The tile

### 2.1 `radiographic-exposure-sfd` -- Radiographic Exposure Time and Source-to-Film Distance

```
inverse square    I proportional to 1 / d^2, so t2 = t1 x (d2 / d1)^2
source decay      exposure time rises as the source decays; corrected by its half life
                  Ir-192 half life about 74 days; Co-60 about 5.27 years
geometric unsharpness  Ug = F x t / d      (F source size, t specimen thickness,
                  d source to specimen distance)
minimum SFD       set by the unsharpness limit in the applicable code
trade             a longer distance improves unsharpness and costs exposure time as d^2
```

The two relations pull against each other and that is the whole exposure setup. Geometric unsharpness improves
in direct proportion to source-to-film distance, and exposure time worsens as the square of it, so doubling the
distance halves the unsharpness and quadruples the shot. The code sets a maximum unsharpness, which sets a minimum
distance, and the technician works at or just above it -- further only when the geometry demands it.

Source decay is the term that catches a crew mid-campaign. An Ir-192 source loses half its activity in about 74
days, so a technique that took four minutes when the source was fresh takes eight minutes two and a half months
later, and a technique sheet without a decay correction produces underexposed film. The correction is a lookup or
a simple exponential and it belongs on every shot.

Co-60's long half life makes decay a non-issue over a campaign but its higher energy makes it worse for thin
material and much more difficult to shield, which is why Ir-192 dominates general work and why the choice of
source is a geometry-and-shielding decision rather than a convenience.

**Inputs:** the reference exposure time and distance, the new distance, the source type and its activity and reference date, the elapsed time, the source physical size, the specimen thickness, and the unsharpness limit

**Outputs:** the exposure time at the new distance, the decay-corrected exposure time for the elapsed time since the reference date, the geometric unsharpness at the entered geometry, the minimum source-to-film distance for the unsharpness limit, and the exposure time at that minimum distance

## 3. Worked example

A technique calling for 60 seconds at 24 in source-to-film distance, moved to 36 in for better
geometry:

```
t2 = 60 x (36 / 24)^2 = 60 x 2.25 = 135 seconds
```

**135 seconds instead of 60** -- 2.25 times the shot for a 50 percent distance increase. That is
what the geometry improvement costs.

The unsharpness it bought, for a 0.120 in source on 0.75 in material:

```
at 24 in: Ug = 0.120 x 0.75 / 24 = 0.0037 in
at 36 in: Ug = 0.120 x 0.75 / 36 = 0.0025 in
```

A 33% reduction in unsharpness for 2.2x the exposure. Whether
that is worth it depends on the code's unsharpness limit for the thickness -- if 0.0037 in already
passes, the 24 in distance is the right choice.

**Source decay.** The same 135 second technique, 60 days later on an Ir-192 source:

```
activity ratio = 0.5^(60/74) = 0.570
corrected time = 135 / 0.570 = 237 seconds
```

102 seconds longer, from nothing but the calendar. A technique sheet used without the
decay correction underexposes.

## 4. Scope and non-goals

Exposure and geometry relations. It does not produce a radiographic technique: film or detector type, screens,
source selection, energy, density and sensitivity requirements, penetrameter selection and placement, and the
acceptance of the resulting radiograph are all governed by the applicable code and the written procedure, and a
calculated exposure is a starting point to be confirmed on a shot. **This is ionizing radiation work.**
Industrial radiography is licensed, the source is a serious radiation hazard, and the restricted-area boundary,
survey requirements, personnel dosimetry, source security, and emergency procedures are regulatory obligations --
`radiography-boundary` addresses one part of that and does not cover the rest. Radiographers are licensed and
qualified individually. The applicable inspection code, the written radiographic procedure, the NRC or Agreement
State licence conditions, 10 CFR Part 34, and the radiation safety officer govern.
