# roughlogic.com Specification v1608 -- Work Zone Longitudinal Buffer Space (`calc-civil.js`, Group E Carpentry and Construction, traffic control, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-civil.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; traffic, work zone, and pavement), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** The buffer space between the end of a work zone taper and the workers is not a convention, it is a stopping distance -- the room a driver who has not reacted needs to stop before reaching the crew. Compressing it to fit the site removes exactly the margin it exists to provide.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive approach speed, a friction factor at or below the grade magnitude, or a negative reaction time returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the stopping sight distance relation with the MUTCD buffer tables named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`work zone buffer space`, `longitudinal buffer mutcd`, `stopping distance work zone`, `shadow vehicle buffer`, `taper to work space distance`.

## 2. The tile

### 2.1 `work-zone-buffer` -- Work Zone Longitudinal Buffer Space

```
stopping sight distance  d = 1.47 V t + V^2 / (30 (f +/- G))
                         t the perception-reaction time, commonly 2.5 s
longitudinal buffer      the MUTCD tabulates it by speed; it approximates stopping distance
lateral buffer           separates the traffic lane from the work space
shadow vehicle           where the buffer cannot be provided, a truck-mounted attenuator
                         occupies it instead
grade                    a downgrade lengthens the distance; the sign of G matters
```

The buffer is stopping distance because that is the failure it protects against: a driver who missed the
advance warning, missed the taper, and is still travelling at approach speed when they finally see the work. Give
them the room to stop and the outcome is a near miss; take it away and it is a work zone intrusion.

The downgrade term is the one that gets left out, and it runs the wrong way. On a 4% downgrade the denominator
falls from `f + 0` to `f - 0.04`, which on a wet-pavement friction factor of 0.35 is a 12% reduction and a
correspondingly longer distance. Work zones on descending grades need more buffer, not the same buffer, and it is
the case where the site is often most constrained.

Where the buffer genuinely cannot be provided -- a short bridge, a tight urban block -- the MUTCD's answer is not
to shrink it silently but to occupy it with a shadow vehicle and a truck-mounted attenuator, so that the vehicle
absorbs the impact instead of the crew. That substitution is a deliberate engineering decision recorded in the
traffic control plan.

**Inputs:** approach speed, perception-reaction time, pavement friction factor, grade with sign, and the available distance between the taper and the work space

**Outputs:** the stopping sight distance at the entered speed and grade, the required longitudinal buffer, the available distance against it, the shortfall where one exists, and the speed at which the available distance would be adequate

## 3. Worked example

A work zone on a 55 mph approach, wet pavement friction 0.35, level grade:

```
d = 1.47 x 55 x 2.5 + 55^2 / (30 x 0.35)
  = 202 + 288 = 490 ft
```

About 490 ft of buffer. Now put the same zone on a 4% downgrade:

```
d = 202 + 55^2 / (30 x (0.35 - 0.04))
  = 202 + 325 = 527 ft
```

**37 ft more** on a 4% grade, and the crew is usually
working downhill of the taper because that is where the pavement is.

If the site offers only 350 ft between the end of the taper and the work space, the shortfall on that downgrade
is 177 ft. The options are a lower posted speed through the zone -- at 45 mph
the requirement falls to 383 ft -- or a shadow vehicle with an attenuator standing
in the buffer. Not simply moving the cones closer.

## 4. Scope and non-goals

A stopping-distance calculation. The MUTCD tabulates longitudinal buffer distances by speed and those tabulated
values, not this calculation, are what a traffic control plan is held to; the calculation explains where they
come from and shows the grade sensitivity the table does not. Friction factors are design values for wet
pavement and do not represent ice, loose gravel, or a milled surface, all of which are common in work zones. It
does not design a temporary traffic control plan: taper lengths (`traffic-taper-length`), advance warning sign
spacing, device spacing, lateral buffer, and the termination area are all separate requirements, and the plan as
a whole is what protects the crew. It does not address flagger operations, positive protection barriers, or
night work lighting. The adopted MUTCD and its state supplement, the agency's own work zone standards, and a
qualified traffic control designer govern.
