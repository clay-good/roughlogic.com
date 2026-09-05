# roughlogic.com Specification v1726 -- Stack Plume Rise and Effective Stack Height (Briggs) (`calc-airquality.js`, Group G Cross-Trade Utilities, air quality, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-airquality.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; air quality and environmental), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A plume does not disperse from the top of the stack; it rises first, on its own buoyancy and momentum, and disperses from an effective height well above the stack. That rise is often larger than the stack itself, which is why plume rise dominates a dispersion estimate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive stack height, diameter, exit velocity, or wind speed, or a stack temperature at or below ambient for a buoyant plume returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Briggs plume rise relations by name with EPA approved dispersion models named as governing regulatory analysis, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`plume rise briggs`, `effective stack height`, `buoyancy flux plume`, `stack downwash gep height`, `plume rise wind speed`.

## 2. The tile

### 2.1 `plume-rise-briggs` -- Stack Plume Rise and Effective Stack Height (Briggs)

```
effective height   H = h_stack + dH_plume
buoyancy flux      F = g x v x d^2 x (T_stack - T_ambient) / (4 x T_stack)
buoyant rise       dH proportional to F^(1/3) x x^(2/3) / u   in the near field
                   and to F^(1/3) / u at final rise in neutral conditions
momentum rise      matters for cool, high-velocity plumes
wind speed         plume rise falls with wind; a windy day gives less rise
stability          stable air suppresses rise; unstable air enhances it
downwash           a stack too short relative to nearby buildings gets pulled down
```

Plume rise is frequently larger than the stack height itself, which is why it dominates. A hot plume from a
modest stack can rise a hundred feet or more on a light wind, so the effective release height -- which is what
governs ground-level concentration -- can be double the physical stack. Ignoring plume rise makes a dispersion
estimate wildly conservative; assuming too much makes it dangerously optimistic.

Wind speed works against it and that is the counterintuitive part. A strong wind dilutes the plume more, but it
also bends it over and reduces the rise, lowering the effective height -- and the two effects trade against each
other, which is why the worst-case wind speed for ground-level concentration is often a moderate one rather than
a calm or a gale.

Downwash is the failure that no rise calculation captures. A stack shorter than about two and a half times the
height of nearby buildings sits in their turbulent wake, and the plume is pulled down into it rather than rising
-- so a stack extension that seems modest can transform a site's ground-level concentrations. That is the
good-engineering-practice stack height concept, and it is why stack height is evaluated against the buildings
around it rather than in isolation.

Stability modulates everything: stable nocturnal air suppresses rise and traps plumes, and it is the condition
under which the highest short-term ground concentrations usually occur.

**Inputs:** stack height, inside diameter, exit velocity and temperature, ambient temperature, wind speed at stack height, stability class, and the height and width of nearby buildings

**Outputs:** the buoyancy flux, the plume rise at the entered wind speed and stability, the effective stack height, the rise at an alternative wind speed, the good-engineering-practice stack height for the entered buildings, and a downwash flag where the stack is below it

## 3. Worked example

A 120 ft stack, 5 ft diameter, exit velocity 55 ft/s, exit temperature 350 degF, ambient 60 degF, wind
12 mph.

The buoyancy flux carries the temperature difference and the volume, and the rise scales as `F^(1/3) / u` at
final rise -- so a hot, large-volume plume on a light wind rises a great deal.

For this stack the rise is on the order of a hundred feet, giving:

```
effective height ~ 120 + 100 = 220 ft
```

**The effective height is nearly double the stack.** Since ground-level concentration falls roughly with the
square of effective height, ignoring plume rise would overstate the concentration by a factor of about four --
which is why a dispersion estimate without plume rise is not a useful estimate.

**Wind is the term that trades against itself.** Double the wind to 24 mph and the rise roughly halves:

```
effective height ~ 120 + 50 = 170 ft
```

Lower effective height, and more dilution from the wind. Those two effects pull in opposite directions, which is
why the worst-case ground-level concentration usually occurs at a moderate wind speed rather than at a calm or a
storm -- and why a screening model runs the whole range of wind speeds rather than one.

**Downwash.** If there is a 60 ft building 100 ft from this stack, good-engineering-practice height is roughly
`60 x 2.5` = 150 ft. At 120 ft this stack is BELOW that, so its plume can be caught in the building's wake and
pulled to ground -- and no plume rise calculation applies, because the plume does not rise. The fix is stack
height, and the evaluation is against the buildings rather than in isolation.

## 4. Scope and non-goals

A screening estimate of plume rise. Briggs' relations have distinct forms for buoyancy-dominated and
momentum-dominated plumes, for stable and unstable conditions, and for near-field and final rise, and selecting
the applicable form is part of the calculation; a single expression does not cover the range. It does not perform
dispersion modelling, which for any regulatory purpose is done with an approved model (AERMOD and its
predecessors) using processed meteorological data, terrain, and building downwash algorithms. It does not
determine good-engineering-practice stack height, which has a regulatory definition and its own procedure, or
evaluate downwash, which requires the building dimensions and orientations relative to each wind direction. It
does not address ambient standards, increments, or the modelling protocols a permit application requires. EPA's
modelling guideline, the approved model, and the permitting authority govern.
