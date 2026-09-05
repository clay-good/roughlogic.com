# roughlogic.com Specification v1494 -- Refrigeration Machinery Room Ventilation (ASHRAE 15) (`calc-refrigeration.js`, Group C HVAC, industrial refrigeration, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigeration.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; industrial and commercial refrigeration), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A refrigeration machinery room's emergency ventilation is sized off the largest single refrigerant charge in the room by a square-root relation, not by air changes. The catalog has ASHRAE 62.1 outdoor air and 62.2 whole-house rates; neither answers this, and this is the one that is a life-safety system.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive refrigerant charge, or a room volume or louver area at or below zero when those are entered returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ASHRAE 15 emergency ventilation relation Q = 100 sqrt(G) with IIAR 2 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`machinery room ventilation`, `ashrae 15 emergency ventilation`, `refrigerant room exhaust cfm`, `ammonia room ventilation`, `engine room refrigerant exhaust`.

## 2. The tile

### 2.1 `machinery-room-ventilation` -- Refrigeration Machinery Room Ventilation (ASHRAE 15)

```
emergency exhaust   Q = 100 x sqrt(G)        (cfm, G = mass of the largest system charge in lb)
detection setpoint  alarm and ventilation start at the refrigerant's stated concentration
continuous rate     a separate, much smaller rate for occupied heat removal
makeup air          the room must be able to admit what the fan removes
```

The square root is the important shape. Doubling the charge does not double the required ventilation -- it
multiplies it by 1.41 -- because the rate is aimed at diluting a credible release to a survivable concentration
rather than at handling the entire charge. And it is the LARGEST SINGLE SYSTEM's charge that governs, not the sum
of everything in the room, because the design event is one system failing rather than all of them.

The number that actually fails inspections is makeup air. A large exhaust fan in a tight room simply does not
move its rated flow: it depressurizes the room, the fan rides up its curve, and the delivered cfm is a fraction
of the design. Louver free area sized for the exhaust rate is part of the ventilation system, not a detail, and
`louver-free-area` sizes it. Detection is the other half -- ventilation that must be started by a person who has
already been overcome is not a safety system.

**Inputs:** the largest single refrigerant system charge in the room, the refrigerant type, the room volume, and optionally the louver free area and the available makeup path

**Outputs:** the required emergency exhaust in cfm, the equivalent air changes per hour for the room, the louver free area needed at a stated face velocity, and the charge that the installed fan capacity actually covers

## 3. Worked example

A machine room whose largest single ammonia system holds 2,400 lb:

```
Q = 100 x sqrt(2,400) = 100 x 49.0 = 4,899 cfm
```

4,899 cfm of emergency exhaust. In a 40 by 30 by 16 ft room (19,200 cu ft) that is
`4,899 x 60 / 19,200` = 15.3 air changes per hour, which is why sizing this room by air changes
rather than by charge would have produced a very different and much smaller fan.

Check the square-root shape: double the charge to 4,800 lb and the requirement rises only to
6,928 cfm, 1.41 times. Halve it and the fan is still 71% of the
original.

Makeup air: at a 500 fpm louver face velocity the room needs `4,899 / 500` = 10 sq ft of FREE area, which
after a typical 50% louver free-area fraction is about 20 sq ft of gross louver.

## 4. Scope and non-goals

The emergency exhaust rate from the code's square-root relation. It does not size the continuous ventilation
for occupied heat removal, which is a separate and independent requirement, and it does not design the detection
and alarm system, select sensor locations and setpoints, specify the refrigerant-vapor detector's alarm
concentrations, or address the electrical classification, self-closing tight-fitting doors, exit requirements,
and separation that a machinery room must also satisfy. It does not evaluate where the exhaust discharges, which
is governed and which matters. Different refrigerant safety groups carry different additional requirements, and
ammonia rooms in particular have provisions beyond the general case. This is a life-safety system: ASHRAE 15,
IIAR 2, the adopted mechanical and fire codes, and the AHJ govern.
