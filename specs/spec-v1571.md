# roughlogic.com Specification v1571 -- Door Closer Size and Opening Force (ANSI A156.4) (`calc-doorhardware.js`, Group E Carpentry and Construction, door hardware, 1 New Tile)

> **Status: LANDED 2026-09-05. Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-doorhardware.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; door hardware and locksmithing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A door closer has to be strong enough to close and latch the door and weak enough that a person can open it, and those two requirements fight. The size comes off door width and conditions; the opening force is a code limit that a closer set too strong will fail.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive door width or weight, or a measured opening force at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): ANSI/BHMA A156.4 closer sizes and the ADA and IBC opening force limits by name, with NFPA 80 cited for fire doors, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`door closer size`, `door opening force ada`, `a156.4 closer sizing`, `5 pound opening force`, `closer spring adjustment`.

## 2. The tile

### 2.1 `door-closer-opening-force` -- Door Closer Size and Opening Force (ANSI A156.4)

```
closer size       from door width and weight, per ANSI/BHMA A156.4 size 1 through 6
                  wider and heavier doors, and exterior doors in wind, need larger sizes
opening force     ADA and IBC limits: 5 lbf interior non-fire door, 15 lbf exterior
                  fire doors: only enough to overcome the latch, but must still close and latch
adjustments       spring power, sweep speed, latch speed, backcheck -- independent of each other
closing time      accessibility requires a minimum sweep time from 90 to 12 degrees
```

The tension is real and it is not resolvable by adjustment alone. A closer sized down until the opening force
meets the 5 lbf limit may not have the power to close a door against its latch, its gasketing, and the building's
stack pressure -- and a fire door that does not latch is a failed fire door. When both cannot be met, the answer
is a lower-friction hinge set, a different latch, addressing the pressure difference across the door, or a power
operator, not a weaker spring.

The adjustments are commonly confused. Spring power sets the opening force; sweep speed and latch speed set how
fast it closes and are hydraulic, not spring; backcheck protects the door and the closer from being thrown open
into a wall. Slowing the sweep does not reduce opening force, and turning down the spring to make a door easier to
open changes the closing behaviour entirely.

Accessibility also imposes a minimum closing TIME -- the door must take at least a stated number of seconds to
swing from 90 degrees to 12 -- so a door tuned to slam shut fails even if its opening force is fine.

**Inputs:** door width and weight, interior or exterior location, whether the door is fire rated, the wind or stack pressure condition, the measured opening force, and the measured closing time

**Outputs:** the recommended closer size band for the door, the applicable opening force limit, the measured force against it, a pass or fail, the accessibility closing-time requirement, and a flag where the force limit and reliable latching conflict

## 3. Worked example

A 36 in interior non-fire door, measured opening force 6.5 lbf at the latch edge:

```
ADA / IBC interior limit = 5.0 lbf
measured                 = 6.5 lbf   -> FAILS by 1.5 lbf
```

The closer's spring comes down. But if reducing it to 5 lbf leaves the door failing to latch against its
gasketing, the correct answer is not to accept a non-latching door -- it is to reduce what the closer is fighting:
check the hinges for bind, check the latch and strike alignment, and check whether the room is pressurized
relative to the corridor, which is a mechanical problem masquerading as a hardware one.

The exterior case is looser and harder. A 36 in exterior door has a 15 lbf allowance, but it also faces wind, so
the closer is often sized up for closing power and then the opening force is checked in the worst wind condition
rather than on a calm day.

Fire door caveat: on a rated door the door MUST close and latch from any position. Adjusting a fire door's closer
below the power needed to do that is defeating a life-safety device, whatever the opening-force reading says.

## 4. Scope and non-goals

A sizing band and limit comparison. It does not select a specific closer, which is a manufacturer selection
based on door width, weight, mounting (regular arm, top jamb, parallel arm), and the pressure condition, and the
manufacturer's sizing chart governs. Opening force limits and how they are measured differ between the ADA
standards, the IBC, and NFPA 101, and fire doors are treated differently again; the adopted code governs. It does
not evaluate hinge condition, latch and strike alignment, gasketing drag, or the pressure difference across the
door, all of which change the measured force and are usually the real problem when a door is hard to open. It
does not address delayed egress, electrified hardware, or power operators. Fire door assemblies are life-safety
equipment: NFPA 80, the adopted building and accessibility codes, the door and closer manufacturers' listings,
and the AHJ govern.
