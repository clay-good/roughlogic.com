# roughlogic.com Specification v1621 -- Tilt-Up Panel Temporary Brace Load and Count (`calc-concrete.js`, Group E Carpentry and Construction, concrete, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; concrete placement and tilt-up), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A tilt-up panel stands on temporary braces until the roof and the floor slab tie it in, and during that window wind is the only significant load and the braces are the only thing resisting it. Brace count and spacing come from wind area, and it is the calculation behind the most consequential period in a tilt-up job.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive panel area, wind pressure, or brace attachment height, or a brace angle at or beyond ninety degrees returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the wind force and brace resolution relations with ACI 551, the brace manufacturer, and OSHA named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`tilt up brace load`, `panel bracing wind`, `temporary bracing tilt up`, `deadman anchor brace`, `erection wind speed panel`.

## 2. The tile

### 2.1 `tilt-up-brace-load` -- Tilt-Up Panel Temporary Brace Load and Count

```
wind force       F = panel area x design wind pressure
brace load       P = F x (height to resultant / brace attachment height) / cos(theta)
                 divided among the braces on that panel
brace angle      typically 45 to 60 degrees from horizontal; flatter braces carry less axial
                 load but need more floor space and a stronger deadman
deadman/anchor   the floor slab anchor is frequently the governing element, not the brace
erection wind    a reduced design wind speed applies during the temporary condition,
                 with a defined maximum wind speed for erection operations
```

The temporary condition is genuinely the design case for a tilt-up building. A panel standing free is a large
sail with a small base, and only the braces hold it -- so brace design uses a wind pressure appropriate to the
erection period and a defined shutdown wind speed above which panels are not set and, in some cases, additional
bracing is added to panels already standing.

The brace angle trades two things. A steeper brace takes more axial load for the same lateral force but needs
less floor area; a flatter one carries less axial load and pushes its anchor further out, where the slab may be
thinner or absent. Neither is universally right, and the constraint is usually the site rather than the
arithmetic.

The element that governs most often is not the brace. It is the floor slab anchor -- the deadman -- because the
slab has to have enough thickness, strength, and edge distance to develop the anchor, and a brace anchored to a
slab that is too green or too thin fails at the anchor with the brace intact. Slab age and thickness at the
anchor location are checked as carefully as the brace itself.

Braces come off only when the permanent lateral system is complete, and removing them early is a recognized
collapse mechanism.

**Inputs:** panel width and height, the erection design wind pressure, the brace attachment height, the brace angle, the number of braces per panel, and the slab thickness and age at the anchor

**Outputs:** the total wind force on the panel, the lateral load per brace, the axial load in each brace at the entered angle, the anchor load at the slab, the number of braces required for a stated brace capacity, and the brace load at an alternative angle

## 3. Worked example

A 24 ft by 24 ft panel with an erection design wind pressure of 12 psf:

```
wind force = 24 x 24 x 12 = 6,912 lb
```

With the resultant at mid-height (12 ft) and braces attached at 16 ft:

```
lateral force resisted by the braces = 6,912 x 12 / 16 = 5,184 lb
```

Split among three braces that is 1,728 lb of lateral load each, and at a 55 degree brace angle the axial
load in each brace is

```
1,728 / cos(55 deg) = 3,013 lb
```

**3,013 lb per brace.** Flatten the brace to 45 degrees and the axial load
falls to 2,444 lb, but the anchor moves further out into the slab -- which is
usually the reason the angle is what it is.

The anchor is the check that matters: 2,444 lb has to be developed in a floor
slab that may be only days old. Slab thickness, concrete strength on the day, edge distance, and the anchor's
rated capacity at that strength all have to be verified, and an anchor in green slab is the failure that drops a
panel.

And the wind number itself: this calculation is valid only up to the erection wind speed limit in the bracing
design. Above it, work stops.

## 4. Scope and non-goals

A screening calculation. Tilt-up bracing is designed by a specialty engineer to the brace manufacturer's rated
capacities, and it accounts for panel geometry and openings, the resultant location, brace and anchor
eccentricity, the sequence in which panels are set and braced, and the interaction between adjacent braced
panels. Erection design wind pressures and the maximum wind speed for erection operations come from the bracing
design and from the applicable standard, not from the building's permanent design wind loads. The floor slab
anchor frequently governs and depends on slab thickness, day-of-anchoring strength, edge and spacing distances,
and the anchor's tested capacity in those conditions. Braces must remain until the permanent lateral system is
complete, and premature removal is a recognized collapse mechanism. Tilt-up erection is among the most hazardous
concrete operations: the specialty bracing engineer, the brace manufacturer, ACI 551, TCA guidance, and OSHA
govern.
