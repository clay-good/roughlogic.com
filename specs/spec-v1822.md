# roughlogic.com Specification v1822 -- Damper Actuator Torque and Sizing (`calc-controls.js`, Group C HVAC, building automation and controls, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-controls.js`**
> (Group C HVAC, hub `/groups/hvac/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A damper actuator is sized from the damper's area times a torque factor, and the factor depends on whether the damper has seals. Specifying a low-leakage damper and then sizing its actuator from the ordinary table is the most common way an actuator fails to close what it was bought to close.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive damper dimension, torque factor, or safety factor, or an empty actuator size list returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the damper torque factor convention with the damper and actuator manufacturers' published torque and close-off data named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`damper actuator torque`, `inch pounds per square foot damper`, `low leakage damper actuator sizing`, `jackshaft multi section damper`, `damper close off torque`.

## 2. The tile

### 2.1 `damper-actuator-torque` -- Damper Actuator Torque and Sizing

```
damper area      width x height in square feet; a multi-section damper is usually
                 driven and sized SECTION by section
torque factor    in-lb per square foot; roughly 3 to 5 for an ordinary
                 low-pressure damper, 5 to 7 at higher velocity and pressure, and
                 7 to 10 or more for a low-leakage damper with blade and jamb seals
seals            are what make the difference; a sealed damper must compress its
                 seals to close, and that is torque the unsealed one never needs
required torque  area x factor, times a safety factor of about 1.5
selection        the next standard actuator above the requirement; typical sizes
                 are 35, 70, 140, and 180 in-lb
large dampers    beyond one actuator's capacity, either multiple actuators or a
                 jackshaft distributing one actuator's torque across sections
close-off        the actuator must also HOLD the blades shut against the pressure
                 across them, which is a separate published rating
```

Seals are the whole story in actuator sizing and they are specified by someone else. A low-leakage damper is
chosen for its leakage class -- for an outside air intake that must shut tight in freezing weather, or an
isolation damper that has to hold a pressure boundary -- and the specification travels to the damper schedule
and not necessarily to the actuator schedule. The seals then double the torque needed, and an actuator sized
from the ordinary table stalls short of closed.

The failure is characteristic and easy to misdiagnose. The damper strokes almost fully, the actuator sits at
its stall torque against the last few degrees of seal compression, and the control system reports the
commanded position rather than the achieved one. Leakage continues, the freeze stat trips or the space will
not hold pressure, and the actuator is eventually found warm and buzzing at ninety-eight percent closed.

Close-off is a separate rating from running torque and is the one that matters for an isolation damper. Moving
a damper through still air is a modest demand; holding it shut against a significant pressure difference,
with fan pressure trying to push it open, is another, and manufacturers publish the two separately. An
actuator adequate to stroke a damper can be inadequate to keep it closed once the fan starts.

**Inputs:** the damper width and height or area, the torque factor for the damper type and whether it has seals, the safety factor, the available actuator sizes, and optionally a second damper size

**Outputs:** the damper area, the required torque with and without seals, the design torque after the safety factor, the actuator size selected in each case, and for a large damper the number of actuators or the need for a jackshaft

## 3. Worked example

A 48 by 36 in damper with no seals, at 5 in-lb per square foot:

```
area   = 48 x 36 / 144 = 12 sq ft
torque = 12 x 5 = 60 in-lb
design = 60 x 1.5 = 90 in-lb  ->  select 140 in-lb
```

**Now specify the same damper as low-leakage, with blade and jamb seals:**

```
torque = 12 x 9 = 108 in-lb
design = 162 in-lb  ->  select 180 in-lb
```

**180 in-lb against 140 -- the seals moved the selection up a size**, and the leakage specification that
required them lives on the damper schedule rather than the actuator schedule. **That is the disconnect**: the
damper is correctly specified, the actuator is sized from the ordinary factor, and the two documents never
meet.

**The failure looks like a control problem rather than a torque problem.** The damper strokes to within a few
degrees of closed, the actuator sits at stall compressing the last of the seal, and **the control system
reports the position it commanded, not the position achieved.** What gets investigated is the freeze stat that
tripped or the pressure the space will not hold.

**A large damper exceeds any single actuator:**

```
96 by 72 in = 48 sq ft
design torque = 48 x 5 x 1.5 = 360 in-lb
largest available = 180 in-lb -> 2 actuators, or a jackshaft
```

**2 actuators, or one actuator driving a jackshaft** -- and a multi-section damper is normally sized and
driven section by section rather than as one area, which changes the arithmetic and is the manufacturer's
arrangement to specify.

**And none of this addresses close-off.** Stroking a damper through still air and holding it shut against fan
pressure are different demands with different published ratings. **An actuator adequate to stroke a damper can
be inadequate to keep it closed once the fan starts**, which is a separate line on the same datasheet.

## 4. Scope and non-goals

A sizing screen. Torque factors are entered and are properties of the specific damper: blade style, bearing type, linkage arrangement, frame size, air velocity and pressure across it, and the seal type all move the figure, and the damper manufacturer publishes the required torque for their product rather than leaving it to a table. It does not address close-off torque, which is separately rated and frequently governs for isolation service, or the actuator's spring-return requirement where a fail-safe position is needed -- a spring-return actuator delivers less torque than the same frame size without one. It does not size the actuator's power supply, address the control signal type, stroke time and whether it suits the sequence, or the mounting, linkage, and shaft coupling, which is where field installations actually fail. It does not address multi-section damper arrangements, jackshaft sizing and deflection, or the leakage class the damper was chosen for and how it is verified. The damper and actuator manufacturers' published torque and close-off data, the applicable leakage and smoke damper standards where they govern, and the controls engineer govern.
