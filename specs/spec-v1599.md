# roughlogic.com Specification v1599 -- HDD Downhole Annular Pressure and Frac-Out Screen (`calc-trenchless.js`, Group E Carpentry and Construction, trenchless, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trenchless.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; trenchless, hdd, and utility locating), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An inadvertent return -- fluid breaking to the surface through the ground -- is the failure that shuts down a bore and puts drilling mud in a creek. It happens when the annular pressure exceeds what the overlying soil can contain, and that limit is a depth-and-strength calculation done before the bore, not after the mud appears.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive depth, soil unit weight, or fluid density, or an annular friction loss below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the annular pressure and limiting pressure screening approach with the geotechnical investigation and permit conditions named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`hdd frac out risk`, `inadvertent return hdd`, `annular pressure directional drill`, `hydraulic fracture bore`, `drilling mud surface return`.

## 2. The tile

### 2.1 `hdd-annular-pressure` -- HDD Downhole Annular Pressure and Frac-Out Screen

```
annular pressure  P = hydrostatic (fluid column) + annular friction losses
limiting pressure  the Delft or Luger relation: the cavity expansion pressure the soil
                   can resist before hydraulic fracture, driven by depth and soil strength
simple screen      P_limit ~ soil overburden pressure x a factor, plus cohesion terms
factor of safety   the margin between operating and limiting pressure
critical locations shallow cover, the entry and exit, and any zone of weak or disturbed soil
```

The mechanism is hydraulic fracture. The fluid in the annulus has a pressure; the soil above it has a strength
and a weight. When the fluid pressure exceeds what the soil can resist, it opens a path and follows it, and the
path usually goes up. Because the resisting pressure grows with depth, the danger is always at the SHALLOW parts
of a bore -- the entry, the exit, and any high point -- not at the deepest point under the crossing, which is
where people instinctively worry.

Annular pressure is not just the mud column. Friction along the annulus adds to it, and that friction rises with
pump rate, with a viscous fluid, and with a hole that is not clean and is loading up with cuttings. So a bore
that was fine on the pilot can frac out during reaming, when the annulus is smaller relative to the flow and the
cuttings load is higher.

The practical controls follow directly: keep the pump rate no higher than hole cleaning requires, keep the fluid
properties right, ream in stages rather than one large pass, and maintain the deepest practical profile through
the sensitive zone. Monitoring for returns at the surface during the bore is the last line, not the plan.

**Inputs:** depth of cover along the profile, soil unit weight and strength parameters, drilling fluid density, pump rate and annular geometry for the friction estimate, and the required factor of safety

**Outputs:** the hydrostatic and friction components of annular pressure at each stated station, the limiting pressure from the soil at that depth, the factor of safety, the governing (shallowest critical) station, and the maximum fluid density or pump rate that maintains the entered safety factor

## 3. Worked example

A bore at 30 ft of cover in soil weighing 120 pcf, with 9.5 lb/gal drilling fluid:

```
soil overburden      = 120 x 30 / 144 = 25.0 psi
fluid hydrostatic    = 0.052 x 9.5 x 30 = 14.8 psi
annular friction     (from the mud program and hole geometry, say 15 psi)
annular pressure     ~ 29.8 psi
```

At 30 ft the overburden is 25.0 psi and the annular pressure is 29.8 psi -- a margin
exists, and the soil's own strength adds to the resistance beyond the simple overburden.

Now the shallow end. At 8 ft of cover:

```
soil overburden   = 120 x 8 / 144 = 6.7 psi
fluid hydrostatic = 0.052 x 9.5 x 8   = 4.0 psi
annular pressure  ~ 19.0 psi   -> EXCEEDS the overburden
```

**The shallow station is where it fracs out**, and it does so during reaming when the friction term is largest.
The controls are to reduce pump rate through that zone, stage the reaming, and if the geometry allows, deepen the
profile -- and to have containment and a response plan in place at the entry and exit regardless.

## 4. Scope and non-goals

A screening comparison, not a frac-out analysis. The limiting pressure depends on soil strength parameters,
cavity expansion behaviour, and the presence of weak layers, fractures, and pre-existing disturbance, and a
proper assessment uses the Delft or an equivalent method with parameters from a geotechnical investigation along
the actual alignment. The annular friction component depends on the mud rheology, flow rate, and annular
geometry and must come from a hydraulics calculation rather than an assumption; it is frequently the dominant
term. It does not predict where fluid will surface if a frac-out occurs, which depends on paths this analysis
cannot see. It does not substitute for an inadvertent returns response plan, containment, and monitoring, which
are typically permit conditions. A frac-out into a waterway is a reportable environmental release. The
geotechnical investigation, the permit conditions, the mud program, and the drilling contractor's engineer
govern.
