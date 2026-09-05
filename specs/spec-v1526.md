# roughlogic.com Specification v1526 -- Liquid Pipeline Friction Loss and Pump Station Spacing (`calc-oilgas.js`, Group B Plumbing and Gas, pipelining, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-oilgas.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; oil, gas, and pipeline), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A liquid line's pump stations sit where the pressure runs out, and that spacing is friction gradient plus elevation. Get it wrong and either the line cannot make rate or a station is built that a hydraulic profile would have shown was unnecessary.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive flow, diameter, length, or available head, or a friction gradient at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the steady-state hydraulic gradient method with 49 CFR 195 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pipeline pump station spacing`, `liquid pipeline hydraulic gradient`, `friction gradient per mile`, `pipeline profile head`, `crude line station count`.

## 2. The tile

### 2.1 `liquid-pipeline-station-spacing` -- Liquid Pipeline Friction Loss and Pump Station Spacing

```
friction gradient  h_f per mile from Darcy-Weisbach or Hazen-Williams
available head     H_avail = MAOP head - minimum suction head
elevation          add or subtract the static lift between stations
spacing            L = H_avail / (gradient + elevation gradient)
station count      n = ceil( total length / L )
```

Unlike gas, liquid is incompressible, so the pressure profile is a straight line falling at the friction
gradient, tilted by terrain. That makes the arithmetic simple and makes elevation matter enormously: a line
climbing 1,000 ft over a segment spends 1,000 ft of head on lift regardless of flow, and on a mountain crossing
the static term can exceed the friction term entirely.

Two constraints bracket every station. The discharge cannot exceed MAOP, and the suction must stay above the
minimum required to keep the pump out of cavitation and, on a hot or volatile product, above the vapour pressure
so the line does not slack. That second one is why a downhill segment can be a problem rather than a gift -- a
line running downhill faster than the friction can hold it back goes to slack flow, and the column separation and
rejoin that follows is a surge event. Surge is also why the tile is a screen: the transient pressures from a
valve closure or pump trip routinely exceed the steady-state profile everywhere.

**Inputs:** flow rate, pipe inside diameter, roughness, fluid density and viscosity, total length, elevation profile between points, MAOP, and the minimum required suction head

**Outputs:** the friction gradient per mile, the elevation gradient, the combined gradient, the maximum spacing between stations, the number of stations required, the discharge and suction pressures at each, and the flow achievable with one fewer station

## 3. Worked example

A 16 in crude line, 120 miles, moving 60,000 bbl/day, friction gradient 12 ft per mile, terminal 400 ft higher
than the origin. MAOP head 2,300 ft, minimum suction head 150 ft:

```
available head per station = 2,300 - 150            = 2,150 ft
elevation gradient         = 400 / 120              = 3.33 ft per mile
combined gradient          = 12 + 3.33              = 15.33 ft per mile
spacing                    = 2,150 / 15.33          = 140 miles
stations                   = ceil(120 / 140)        = 1
```

One station carries the whole line, because the available head exceeds what 120 miles of this gradient consumes.

Now raise throughput to 90,000 bbl/day. Friction goes roughly as the square of flow, so the gradient rises to
about `12 x (90/60)^2` = 27 ft per mile, combined 30.33, and the spacing falls to `2,150 / 30.33` = 71 miles --
**two stations**. That is the shape of the economics: capacity is bought with horsepower and stations, and
because friction is quadratic, the last increment of throughput is always the most expensive.

## 4. Scope and non-goals

A steady-state hydraulic screen using a friction gradient the user supplies. It does not compute the friction
factor, which depends on Reynolds number, roughness, and viscosity, and which for a crude line changes with
temperature and with batch; a heavy batch and a light batch produce different gradients in the same pipe. It does
not perform a transient surge analysis, and surge -- from valve closure, pump trip, or power failure -- routinely
produces pressures well above the steady profile and is what actually sets relief and control requirements on a
liquid line. It does not evaluate slack line or column separation on downhill segments, size pumps or drivers,
handle batched products with different properties, or address drag reducing agent. 49 CFR 195, the operator's
hydraulic and surge models, and a qualified pipeline engineer govern.
