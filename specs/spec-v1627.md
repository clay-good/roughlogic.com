# roughlogic.com Specification v1627 -- Valve Actuator Close-Off Pressure and Torque (`calc-hvacsystems.js`, Group C HVAC, test and balance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; test and balance, controls, and acoustics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A control valve has to shut against the pressure the pump can produce, and an actuator sized on the valve's Cv rather than on its close-off rating leaks by. The symptom is a coil that stays warm with the valve commanded shut, and it is a rating check rather than a repair.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive differential pressure, seat area, or actuator rating returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the close-off force relation with the valve and actuator manufacturer selection tables named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`valve close off pressure`, `actuator sizing control valve`, `valve leaking by shut`, `close off rating differential`, `spring return close off`.

## 2. The tile

### 2.1 `valve-actuator-close-off` -- Valve Actuator Close-Off Pressure and Torque

```
close-off pressure  the differential pressure the actuator can hold the valve shut against
required            the maximum differential the valve can see, which is the pump shutoff
                    head when every other valve on the system is closed
seat force          F = differential pressure x effective seat area
torque, rotary      close-off for a ball or butterfly valve is expressed as torque
worst case          not the design differential -- the differential at minimum system flow
spring return       a spring-return actuator's close-off is lower than the same actuator
                    driven; the spring is what must hold it
```

The differential a valve must close against is not the differential it sees at design flow. As other valves on
the system close, the pump rides up its curve and the pressure across the remaining valves rises toward the
pump's shutoff head -- so the worst case for close-off is minimum system flow, which is the condition a designer
computing at design flow never looks at. On a system with a large number of two-way valves and no differential
pressure control, that rise can be substantial.

The consequence of getting it wrong is subtle rather than dramatic. The valve strokes, the actuator reports
closed, and a small flow continues past the seat -- so a coil stays warm, a zone overheats in cooling season, and
the problem reads as a control fault. Checking the actuator's close-off rating against the actual differential is
the thing that identifies it, and it is a nameplate comparison rather than a diagnosis.

Spring-return actuators deserve particular attention because their close-off in the spring direction is set by
the spring, not by the motor, and is often much lower than the driven rating. A valve that closes reliably on
command and leaks on a power failure is exactly that.

**Inputs:** valve size and type, the effective seat area or the manufacturer close-off table, the pump shutoff head and system static, the differential at minimum flow, the actuator close-off or torque rating, and whether it is spring return

**Outputs:** the seat force at the entered differential, the required close-off pressure at minimum system flow, the actuator rating against it in both the driven and spring directions, the margin, and a flag where the rating is exceeded

## 3. Worked example

A 2 in globe valve with an effective seat area of about 12 sq in, on a system whose pump develops
45 psi differential at minimum flow:

```
seat force = 45 x 12 = 540 lb
```

The actuator has to develop 540 lb to hold that valve shut. An actuator rated for a 20 psi close-off on
this valve develops only `20 x 12` = 240 lb and **will not close it** -- the valve will float off its
seat and pass flow with the actuator fully commanded.

The trap in the numbers: at DESIGN flow the differential across this valve might be 8 psi, and an actuator
selected on that basis looks generous. It is the minimum-flow condition, when everything else on the branch has
closed and the pump has ridden up to near shutoff, that produces the 45 psi -- and that is the condition in
which the valve is most likely to be commanded closed.

Spring return: if this is a spring-return actuator whose driven close-off is 45 psi and whose spring close-off is
25 psi, it holds on command and leaks on a power failure or a fire alarm shutdown, which is precisely when a
closed valve matters most.

## 4. Scope and non-goals

A force and rating comparison using manufacturer data the user supplies. Close-off ratings are specific to the
valve body, size, trim, and actuator combination and come from the manufacturer's selection tables; the seat-area
calculation shown is an approximation of what those tables encode and is not a substitute for them. Rotary valves
are rated in torque rather than pressure and follow a different selection path. It does not size the valve for
control, which is a Cv and authority question (`valve-authority`), and a valve correctly sized for close-off can
still control badly. It does not evaluate the actual differential the valve will see, which requires a system
analysis at minimum flow including the effect of differential pressure control valves or variable-speed pumping
where present. It does not address fail-safe position requirements, which are a design and life-safety matter.
The valve and actuator manufacturer's selection data and the design engineer govern.
