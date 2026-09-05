# roughlogic.com Specification v1630 -- Louver Free Area, Velocity, and Water Penetration (`calc-hvacsystems.js`, Group C HVAC, test and balance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; test and balance, controls, and acoustics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A louver's size is not its opening. Blades take up close to half the face, so a 4 by 4 ft louver passes air like a 7 sq ft opening, not a 16 sq ft one -- and the velocity through that free area is what decides whether rain comes in with the air.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive gross area or airflow, or a free area ratio outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the free-area velocity relation with AMCA 500-L water penetration testing named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`louver free area`, `louver face velocity`, `amca 500-l water penetration`, `louver sizing cfm`, `intake louver rain`.

## 2. The tile

### 2.1 `louver-free-area` -- Louver Free Area, Velocity, and Water Penetration

```
free area        A_free = gross area x free area ratio    (0.35 to 0.55 typical)
face velocity    V = CFM / A_free
water penetration each louver has a beginning-point-of-water-penetration velocity from
                 AMCA 500-L testing; above it, rain is carried through
intake vs relief intake louvers are limited by water penetration; relief louvers by
                 pressure drop and noise
pressure drop    rises with the square of free-area velocity
drainable        drainable-blade louvers tolerate much higher velocities before penetrating
```

Free area ratio is the number that turns a louver from a hole into a component. A conventional stationary
louver passes 35 to 50 percent of its gross face, so sizing on gross area overstates the opening by a factor of
two or more -- and the resulting velocity is double what was intended, which is how rain gets into a mechanical
room that was designed correctly on paper.

The limit that governs an intake is water penetration, and it is a tested property rather than a rule of thumb.
AMCA 500-L establishes the velocity at which a specific louver begins to pass water, and drainable-blade designs
carry that point far higher than conventional ones -- which is why a drainable louver can be smaller for the same
airflow, and why substituting a cheaper louver of the same size is a performance change.

Relief and exhaust louvers are a different problem. Water penetration matters less because air is leaving, so
they are limited instead by pressure drop and by the noise a high free-area velocity generates -- and a louver
sized to the velocity limit for an intake will be unnecessarily large for a relief application.

**Inputs:** louver width and height, the free area ratio, the airflow, the beginning point of water penetration velocity, the application (intake or relief), and the allowable pressure drop

**Outputs:** the gross and free area, the free-area face velocity at the entered airflow, the velocity against the water penetration point, the pressure drop, the louver size required to stay below the penetration velocity, and the airflow the installed louver supports

## 3. Worked example

A 4 ft by 4 ft louver with a 0.45 free area ratio, passing 3,600 cfm:

```
gross area = 4 x 4        = 16.0 sq ft
free area  = 16.0 x 0.45      = 7.20 sq ft
face velocity = 3,600 / 7.20 = 500 fpm
```

500 fpm through the free area. Against a conventional louver whose water penetration begins near
700 fpm, this is comfortable.

**Now size it on gross area instead**, which is the common error:

```
apparent velocity = 3,600 / 16.0 = 225 fpm
```

225 fpm looks like an even larger margin, and it is fiction -- the air does not know about the blades.
A designer who sizes to 700 fpm on gross area is actually running
`700 / 0.45` = 1556 fpm through the free area, well past the penetration point, and the mechanical room
gets wet in the first driving rain.

The drainable option: a drainable-blade louver with a penetration point near 1,000 fpm passes
`7.20 x 1,000` = 7,200 cfm through the same face -- 2.0 times the airflow, from the
same wall opening. That is usually a better answer than a bigger hole.

## 4. Scope and non-goals

A free-area and velocity calculation using ratings the user supplies. Free area ratio and the beginning point
of water penetration are tested values specific to a louver model and size, established under AMCA 500-L, and
they vary widely between products -- a generic ratio applied to a specific louver can be substantially wrong, and
smaller louvers have proportionally less free area than large ones of the same design. It does not evaluate wind-
driven rain performance, which is a separate AMCA test and a different criterion, or snow infiltration, which
conventional louvers do not address at all. It does not size the opening for the structural or architectural
requirements, evaluate bird and insect screens (which reduce free area further), or address the drain provisions
behind an intake louver. It does not compute pressure drop, which comes from the manufacturer's tested curve.
AMCA 500-L test data from the louver manufacturer and the design engineer govern.
