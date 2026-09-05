# roughlogic.com Specification v1568 -- Condensate Pump Flash and NPSH Margin (`calc-steamplant.js`, Group C HVAC, steam plant, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steamplant.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; steam plant and commercial laundry), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A condensate pump handling water at or near boiling has almost no margin against flashing, and when it flashes the pump cavitates, loses prime, and hammers itself apart. The available suction head is a subtraction, and the vapour pressure term is the one that makes it tight.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive static head or flow, a negative friction head, or a computed available head at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the net positive suction head relation for saturated liquid as standard steam plant practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`condensate pump npsh`, `hot well pump cavitation`, `npsh available saturated condensate`, `boiler feed pump suction`, `flashing condensate pump`.

## 2. The tile

### 2.1 `condensate-pump-flash-npsh` -- Condensate Pump Flash and NPSH Margin

```
NPSH available   NPSHa = h_atm + h_static - h_friction - h_vapor
                 for a vented receiver at saturation, h_atm and h_vapor cancel
so               NPSHa ~ h_static - h_friction        for saturated condensate
NPSH required    from the pump curve at the operating flow
margin           NPSHa must exceed NPSHr, with margin; 2 to 3 ft is a common minimum
flash            hot condensate through a trap flashes; the receiver must vent it
```

For water at saturation the atmospheric pressure term and the vapour pressure term are equal and cancel
exactly, which leaves the available suction head as nothing but the static height of liquid above the pump minus
the friction getting there. That is why hot condensate pumps are mounted low with short, oversized, straight
suction piping and a generous static leg -- there is no atmospheric cushion to draw on, and every foot of friction
in the suction line is a foot taken directly from the margin.

Two field failures follow. A suction strainer that is fouling adds friction and eats the margin invisibly until
the pump starts cavitating; the symptom is intermittent noise and a slow loss of capacity, and the cause is
upstream of the pump. And a receiver that cannot vent its flash steam pressurizes slightly, which raises the
saturation temperature of the water in it, which puts the liquid right back at saturation at the new pressure --
so a restricted or undersized receiver vent defeats the whole arrangement.

The tile's field job is the subtraction plus the honest statement of how little margin there is, so a pump that
is cavitating gets diagnosed at the suction rather than replaced.

**Inputs:** static height of liquid above the pump centreline, suction line size, length and fittings for friction, flow rate, water temperature and the receiver pressure, and the pump NPSH required at that flow

**Outputs:** the available net positive suction head, the required head from the entered pump curve point, the margin, a cavitation risk flag, the maximum suction friction the arrangement tolerates, and the static height needed for a target margin

## 3. Worked example

A condensate pump with the receiver water line 6 ft above the pump centreline, saturated condensate, and 1.8
ft of friction in the suction piping at the operating flow:

```
NPSHa = 6.0 - 1.8 = 4.2 ft        (atmospheric and vapour pressure cancel at saturation)
pump NPSHr at flow = 3.0 ft
margin             = 1.2 ft
```

**1.2 ft of margin.** That is thin, and it is the whole reason these pumps are troublesome.

Now foul the suction strainer so friction rises from 1.8 to 3.5 ft:

```
NPSHa  = 6.0 - 3.5 = 2.5 ft
margin = 2.5 - 3.0 = -0.5 ft   -> the pump is cavitating
```

Nothing changed at the pump. A cold-water pump with 34 ft of atmospheric head to draw on would not have noticed
1.7 ft of extra friction; this one fails on it. Which is why the first thing to check on a noisy condensate pump
is the suction strainer, not the impeller.

To restore 3 ft of margin the receiver would have to sit `3.0 + 3.0 + 3.5` = 9.5 ft above the pump.

## 4. Scope and non-goals

An available-suction-head calculation for saturated liquid. It assumes the liquid in the receiver is at
saturation for the receiver pressure, which is the conservative and usual case for hot condensate; sub-cooled
condensate has additional margin equal to the sub-cooling expressed as head. It does not compute the suction
friction, which must be entered and which changes with strainer condition and flow, and it does not evaluate the
transient case when a large slug of hot condensate arrives and the receiver level or pressure moves quickly,
which is often when a marginal pump actually fails. It does not size the pump, the receiver, the vent, or the
traps upstream, and it does not address flash steam recovery. Pump NPSH required must come from the
manufacturer's curve at the actual flow, and margin requirements above the curve value are a design decision. The
pump manufacturer's data and the system designer govern.
