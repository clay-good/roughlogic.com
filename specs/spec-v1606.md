# roughlogic.com Specification v1606 -- Water Main Flushing Volume and Duration (`calc-water.js`, Group M Water and Wastewater Operations, municipal water, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`**
> (Group M, Water and Wastewater Operations -- the existing category, hub `/groups/water/`; municipal water and collection systems), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Flushing a main means moving enough water fast enough to scour it, and both parts matter: a slow flush that moves three pipe volumes does very little. The target is a velocity, and the hydrant and the main together decide whether it is achievable.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive diameter, length, or target velocity, or a flush duration at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the pipe volume constant and the unidirectional flushing scour velocity convention with AWWA guidance named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`water main flushing`, `unidirectional flushing velocity`, `flush duration pipe volumes`, `hydrant flushing flow`, `main scour velocity`.

## 2. The tile

### 2.1 `main-flushing-duration` -- Water Main Flushing Volume and Duration

```
pipe volume     gal/ft = 0.0408 x d^2;  V = gal/ft x length
flush velocity  2.5 to 5.0 ft/s is the conventional scour range for unidirectional flushing
flow for a velocity  Q (gpm) = 2.448 x d^2 x V      (d inches, V ft/s)
duration        commonly 3 or more pipe volumes, or until clear and stable
                turbidity and chlorine residual are the field endpoints
dechlorination  discharge is regulated; chlorinated water to a stream needs treatment
```

Velocity is the thing that scours and volume is the thing that flushes the material away, and a program needs
both. Opening a hydrant and letting it run moves a lot of water at a low velocity in a large main, which
mobilizes very little; unidirectional flushing -- closing valves so the flow is forced through a single defined
path -- is what gets the velocity up, and it is the reason UDF programs outperform conventional flushing on the
same water.

The flow required rises with the square of diameter, which is what limits large mains: a 12 inch main at 3 ft/s
needs over a thousand gpm, which is more than a single hydrant outlet will comfortably pass, so the flush path
has to be arranged to get it or the velocity target is not met.

The endpoint is measured rather than timed. Turbidity falling and stabilizing, and chlorine residual recovering,
are what say the main is clean; a fixed duration is a starting estimate. And the discharge itself is regulated --
chlorinated water reaching a stream is a fish kill and a violation, so dechlorination is part of the job rather
than an afterthought.

**Inputs:** main diameter and length, the target flush velocity, the available hydrant flow, the number of pipe volumes required, and the discharge location and dechlorination method

**Outputs:** the pipe volume, the flow required for the target velocity, the velocity achieved at the available hydrant flow, the duration for the entered number of pipe volumes, the total water discharged, and a flag where the available flow cannot reach the scour velocity

## 3. Worked example

A 1,200 ft run of 8 in main:

```
gal/ft      = 0.0408 x 8^2 = 2.61 gal/ft
pipe volume = 2.61 x 1,200 = 3,133 gallons
flow for 3 ft/s = 2.448 x 8^2 x 3 = 470 gpm
duration for 3 pipe volumes at that flow = 3 x 3,133 / 470 = 20 minutes
total discharged = 9,400 gallons
```

20 minutes and 9,400 gallons -- both worth knowing before opening the hydrant, because
that discharge has to go somewhere and be dechlorinated.

Now the failure case. On a 12 in main the flow for 3 ft/s is `2.448 x 144 x 3` = 1,058 gpm. A single
2.5 in hydrant outlet will not pass that at normal system pressure, so opening one hydrant on a 12 in main
produces perhaps 1 ft/s and scours almost nothing -- the crew flushes for an hour, discharges thousands of
gallons, and the main is no cleaner. **Unidirectional flushing with valves closed to force the path** is what
makes the velocity, and it is the difference between a program that works and one that only uses water.

## 4. Scope and non-goals

A volume and velocity calculation. It does not design a flushing program: unidirectional flushing requires a
valve-by-valve sequence developed from the distribution model and validated in the field, and running it without
that sequence can dislodge material into service areas or cause low-pressure events. It does not evaluate whether
the system can sustain the flush flow without dropping below minimum pressure, which is a regulatory limit and a
backflow risk. It does not address the water quality endpoints -- turbidity, chlorine residual, colour -- which
are what actually determine when to stop, or the customer notification a flushing program requires. It does not
address discharge permitting, dechlorination, erosion control at the discharge point, or the reporting that a
chlorinated discharge may trigger. AWWA flushing guidance, the state drinking water primacy agency, the discharge
permit, and the utility's own program govern.
