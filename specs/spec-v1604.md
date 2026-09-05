# roughlogic.com Specification v1604 -- Gravity Sewer Slope for Minimum Scour Velocity (`calc-trenchless.js`, Group E Carpentry and Construction, trenchless, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trenchless.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; trenchless, hdd, and utility locating), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A gravity sewer has to run fast enough to keep solids moving, and the minimum slope that achieves it comes from Manning solved for the scour velocity rather than from a table of nominal slopes. Flat sewers silt up, and re-laying a line is far more expensive than getting the slope right.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive diameter, roughness coefficient, or target velocity, or a computed slope at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Manning scour velocity relation and the tractive force alternative as standard sanitary sewer practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`minimum sewer slope`, `scour velocity sewer`, `manning minimum slope`, `sewer self cleansing velocity`, `tractive force sewer design`.

## 2. The tile

### 2.1 `sewer-scour-slope` -- Gravity Sewer Slope for Minimum Scour Velocity

```
Manning        V = (1.486 / n) R^(2/3) S^(1/2)
scour velocity 2.0 ft/s is the conventional minimum, at full or half-full flow
                (some agencies require 2.5 ft/s, and 3.0 ft/s for larger interceptors)
minimum slope  S = ( V n / (1.486 R^(2/3)) )^2
hydraulic radius at full flow R = D/4; at half full R = D/4 as well
tractive force the better modern criterion; based on shear stress, not velocity
```

The velocity criterion exists to keep grit and solids in suspension, and it is checked at the flow the sewer
actually sees rather than at full pipe -- which is the trap. A large-diameter sewer at the head of a system runs
at a small depth of flow for years before development fills it, and at that depth the velocity can be far below
scour even though the pipe at full flow would be fine. Sizing generously and sloping to the full-flow criterion
produces a line that silts.

The modern criterion is tractive force, which computes the shear stress the flow exerts on the invert rather than
its average velocity. It is a better predictor because it responds to the actual depth of flow, and it typically
requires steeper slopes on large pipes at low flows than the velocity rule does -- which is exactly the case where
the velocity rule is weakest.

The practical output for a designer or an inspector is the minimum slope for the pipe and roughness in front of
them, and the check of whether an as-built slope meets it. A line laid a hundredth of a foot per foot flat is a
maintenance liability for its whole life.

**Inputs:** pipe diameter, Manning roughness coefficient, the required scour velocity, the design depth of flow, and the actual slope for a check

**Outputs:** the minimum slope for the entered scour velocity at full and at the design depth, the velocity at the entered actual slope, a pass or fail against the criterion, the slope required at the lower of the two flow conditions, and the tractive force at the design flow

## 3. Worked example

An 8 in sewer, n = 0.013, requiring 2.0 ft/s:

```
R at full flow = D/4 = 0.6667/4 = 0.1667 ft
S = ( V n / (1.486 R^(2/3)) )^2
  = ( 2.0 x 0.013 / (1.486 x 0.3029) )^2
  = ( 0.0260 / 0.4500 )^2 = 0.00334 ft/ft
  = 0.33%
```

**0.33%**, or about 4.01 in per 100 ft -- which is
close to the 0.40% figure most agencies publish as the minimum for 8 in pipe, so the arithmetic and the table
agree here.

Now the case where they do not. A 24 in sewer at the head of a system:

```
R at full = (24/12)/4 = 0.500 ft
S_min at full flow = ( 2.0 x 0.013 / (1.486 x 0.500^(2/3)) )^2 = 0.077%
```

0.08% -- very flat, and it looks fine. But a 24 in pipe carrying early-development
flows runs a few inches deep, where the hydraulic radius is a fraction of 0.5 ft and the velocity at that slope
is well under 2 ft/s. **The pipe silts for a decade before the flow arrives**, and the tractive force criterion,
evaluated at the actual early flow, is what catches it.

## 4. Scope and non-goals

A Manning-based minimum slope calculation. The velocity criterion evaluated at full flow is the traditional
rule and it is weakest exactly where it matters most: large pipes at low early-development flows. The tractive
force criterion, evaluated at the minimum expected daily flow, is the better basis and many agencies now require
it. Manning's n for a sewer in service is not the new-pipe value -- slime growth, deposits, and joint condition
raise it -- and design values differ between agencies. It does not size the sewer for capacity, evaluate surcharge
or the hydraulic grade line, or address inflow and infiltration, which changes the flows the pipe actually sees.
It does not address minimum cover, bedding, deflection limits for flexible pipe, or the manhole and drop
structure requirements. The state and local sewer design standards, the wastewater agency's own criteria, and
the design engineer govern.
