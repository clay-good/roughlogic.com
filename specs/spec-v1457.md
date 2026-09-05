# roughlogic.com Specification v1457 -- Transverse Wind Load on Conductor and Pole (`calc-lineworker.js`, Group W, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group W, overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** The load that governs a distribution structure on a windy day is not the conductor tension, it is the wind on the conductors and on the pole itself, and both land at different heights and become a moment. `pole-class-groundline-moment` needs those forces; nothing produces them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a negative wind pressure or speed, or a non-positive diameter, span, or pole height returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the projected-area wind relation and the wind-span convention as standard overhead line practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`wind load conductor`, `transverse wind pole`, `wind span load`, `conductor wind force`, `pole projected area wind`.

## 2. The tile

### 2.1 `transverse-wind-load-conductor` -- Transverse Wind Load on Conductor and Pole

```
wind pressure from speed   p = 0.00256 V^2 (psf, mph, round shape factor 1.0)
force on conductor         F_c = p x ( d / 12 ) x L_wind
force on pole              F_p = p x A_proj,  A_proj = ( (d_top + d_gl) / 2 / 12 ) x h
moment at groundline       M = sum( F_i h_i ),  pole wind acting at h/2
```

Wind on a conductor is pressure times projected area, and the projected area of a cylinder is simply its
diameter times its length -- so a conductor's wind load per foot is its diameter in inches over twelve, times the
pressure, and nothing else. The length that counts is the WIND SPAN, half the span on each side of the structure,
which is not the same as the ruling span and not the same as the weight span that carries vertical load. Getting
wind span and weight span confused is the standard error on an angle or a hillside structure.

The pole carries its own wind on a tapered projected area, and because it is distributed the resultant acts at
roughly mid-height. That force is small next to the conductors but its moment arm is not, and on a tall pole with
light conductor it can be the larger term. Under ice the conductor diameter grows and so does the wind area,
which is why the NESC district cases combine ice AND wind rather than checking them separately --
`nesc-district-loading` builds that combined case.

**Inputs:** wind pressure or wind speed, conductor diameter and wind span, the number of conductors and their attachment heights, and the pole top and groundline diameters with the height above ground

**Outputs:** the wind pressure, the force per foot and total force on each conductor, the force on the pole, and the total transverse force and groundline moment ready to hand to the pole-capacity check

## 3. Worked example

A 9 psf wind (about 59 mph) on one ACSR Drake conductor of 1.108 in diameter with a 400 ft wind
span, on a 45 ft pole standing 39 ft out of the ground, 8 in at the top and 12 in at the groundline:

```
F_c     = 9 x (1.108/12) x 400          = 332.4 lb   (0.8310 lb/ft)
A_proj  = ((8+12)/2/12) x 39          = 32.50 sq ft
F_p     = 9 x 32.50                = 292.5 lb, acting at 19.5 ft
M       = 332.4 x 38 + 292.5 x 19.5   = 18,335 ft-lb
```

The conductor contributes 12,631 ft-lb and the pole itself 5,704 ft-lb -- the pole is 31% of the total, which is
not a rounding error. Hand 18,335 ft-lb to `pole-class-groundline-moment` and the Class 3 pole in that example runs
16% utilized on wind alone, before any conductor tension or angle pull.

## 4. Scope and non-goals

Transverse wind at one pressure on a straight tangent structure, shape factor 1.0 for round members. It does
not apply the NESC overload capacity factors, gust response factors, or the span reduction factor that a
transmission design would use; it does not handle an angle structure, where the conductor tension contributes a
transverse resultant that usually dominates the wind, and it does not handle the longitudinal case at a deadend.
Crossarms, insulators, transformers, and equipment carry wind area that is not counted here. Ice on the conductor
changes both terms and is handled by `nesc-district-loading`. The NESC loading district and grade of
construction, the line design, and the utility's construction standard govern.
