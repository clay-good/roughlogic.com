# roughlogic.com Specification v1524 -- Pipeline Maximum Allowable Operating Pressure (Barlow) (`calc-oilgas.js`, Group B Plumbing and Gas, pipelining, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-oilgas.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; oil, gas, and pipeline), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A pipeline's maximum allowable operating pressure is Barlow's equation with three multipliers that are not optional: a design factor set by what the line runs through, a joint factor set by how the pipe was made, and a temperature derating. Leaving the class-location factor out is how a line gets operated above what its route permits.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive yield strength, wall thickness, or diameter, or a design, joint, or temperature factor outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): Barlow with the 49 CFR 192 class-location design factors and the joint and temperature factors, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pipeline maop`, `barlow equation pressure`, `class location design factor`, `pipeline allowable pressure`, `49 cfr 192 maop`.

## 2. The tile

### 2.1 `pipeline-mao-barlow` -- Pipeline Maximum Allowable Operating Pressure (Barlow)

```
Barlow      P = 2 S t / D
design      P_mao = 2 S t F E T / D
S           specified minimum yield strength (psi)
F           design factor by class location: 0.72 Class 1, 0.60 Class 2,
            0.50 Class 3, 0.40 Class 4 (gas, 49 CFR 192)
E           longitudinal joint factor (1.00 seamless and ERW post-1970, lower for older)
T           temperature derating factor (1.00 to 250 degF, falling above)
```

Barlow gives the pressure at which the pipe wall reaches yield; the multipliers turn that into a pressure it
may actually be operated at. The design factor is the big one and it is a property of the ROUTE, not the pipe: as
development grows around a line, its class location changes, the allowable factor drops, and a pipeline that was
compliant at 0.72 in open country is not compliant at 0.50 once a subdivision is built beside it. That
recalculation -- triggered by population, not by anything happening to the steel -- is a routine and consequential
part of pipeline integrity management.

The joint factor catches older pipe. Pre-1970 ERW and furnace-welded pipe carry factors below 1.0 because their
seams are less reliable, and applying 1.0 to a 1950s line overstates its MAOP directly. Wall loss from corrosion
changes `t` and is evaluated separately by `corroded-pipe-b31g`, which is what actually governs an in-service
line with measured metal loss.

**Inputs:** pipe outside diameter, wall thickness, specified minimum yield strength, class location or the design factor, longitudinal joint factor, and temperature derating factor

**Outputs:** the yield pressure from Barlow, the MAOP with all factors applied, the hoop stress at a stated operating pressure as a percent of SMYS, the MAOP at each class location, and the wall thickness required for a target pressure

## 3. Worked example

A 12.75 in OD, 0.25 in wall, API 5L X52 gas line (52,000 psi SMYS) in Class 1 (F = 0.72), seamless (E = 1.00),
below 250 degF (T = 1.00):

```
Barlow yield = 2 x 52,000 x 0.25 / 12.75          = 2,039 psi
MAOP         = 2,039 x 0.72 x 1.00 x 1.00 = 1,468 psig
```

1,468 psig in Class 1. Now let a subdivision grow along it and the class location move to 3:

```
MAOP at F = 0.50 = 2,039 x 0.50 = 1,020 psig
```

The same pipe, unchanged, drops 449 psi of allowable pressure -- 31% -- because
of what was built beside it. An operator running at 1,468 psig is now over MAOP and the options are to reduce
pressure, replace the segment with heavier wall, or pressure-test to requalify.

Working backwards: to hold 1,468 psig in Class 3, the wall would need to be
`1,468 x 12.75 / (2 x 52,000 x 0.50)` = 0.360 in.

## 4. Scope and non-goals

The design-pressure relation for steel line pipe. It does not establish MAOP for an operating pipeline, which
under 49 CFR 192 and 195 is the lowest of the design pressure, the pressure-test-derived value, the highest
pressure the segment has safely operated at under grandfathering provisions, and any component or fitting rating
in the segment -- and a flange, valve, or fitting class frequently governs below the pipe. It does not evaluate
corroded or damaged pipe (`corroded-pipe-b31g`), dents, cracks, or seam anomalies; it does not address
overpressure protection, which is separately required; and it does not determine class location, which follows a
prescribed counting method along the route. Liquid lines follow 49 CFR 195 with different factors. The applicable
part of 49 CFR, the operator's integrity management program, and a qualified pipeline engineer govern.
