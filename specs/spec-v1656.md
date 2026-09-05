# roughlogic.com Specification v1656 -- Elevator Door Closing Force and Kinetic Energy (`calc-elevator.js`, Group E Carpentry and Construction, elevator, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elevator.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; elevator and escalator), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An elevator door closing on a person is limited by force and by kinetic energy, and the energy limit is the one that catches heavy doors. It is a mass and a speed, and it explains why a wide, heavy door has to close slowly.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive door mass or closing speed, or an energy limit at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ASME A17.1 door kinetic energy and force limits by name with the elevator authority named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`elevator door closing energy`, `door kinetic energy limit`, `a17.1 door force`, `door closing speed adjustment`, `reopening device inoperative closing`.

## 2. The tile

### 2.1 `door-closing-energy` -- Elevator Door Closing Force and Kinetic Energy

```
kinetic energy    KE = 0.5 x (W / g) x v^2
limit             ASME A17.1 limits the closing kinetic energy, with a lower limit
                  when the reopening device is not operating
closing force     separately limited, measured with a force gauge at the leading edge
mass              the whole moving door assembly, not just the panel
speed             average closing speed over a defined portion of the travel
consequence       energy goes as the SQUARE of speed, so a small speed reduction
                  buys a large energy reduction
```

Two independent limits apply and they fail differently. Closing force is a static measurement at the leading
edge and catches a door operator adjusted too hard. Kinetic energy is dynamic and catches a door that is heavy
rather than forceful -- a wide two-speed door with substantial panel mass can be within the force limit and well
outside the energy limit, because energy carries the mass term that force does not.

The square on speed is what makes it manageable. Reducing closing speed by 20 percent cuts kinetic energy by
36 percent, so a door that fails the energy limit can usually be brought into compliance by slowing it a little
rather than by lightening it -- at the cost of door time, which is why the adjustment is a compromise with the
building's traffic performance.

The reduced limit when the reopening device is inoperative is the provision that matters most in service. A door
running with its detector edge or light curtain out of service is required to close under a much lower energy
limit -- effectively nudging closed -- because the only thing preventing a strike is now the passenger. A door
that closes at full speed with a failed reopening device is a defect, not an inconvenience.

**Inputs:** the total moving door mass, the average closing speed, the applicable kinetic energy limits with and without the reopening device operating, and the measured closing force

**Outputs:** the kinetic energy at the entered mass and speed, the energy against both limits, a pass or fail on each, the closing speed required to meet the limit, the closing time that speed implies, and the measured force against its own limit

## 3. Worked example

A door assembly of 140 lb moving at 1.0 ft/s average closing speed:

```
KE = 0.5 x (140 / 32.174) x 1.0^2 = 2.18 ft-lb
```

Against the normal-operation limit this is checked directly; against the reduced limit that applies when the
reopening device is inoperative it is checked again, and the reduced limit is much lower.

**The speed lever.** If this door needs to come down to 4.0 ft-lb:

```
v = sqrt( 4.0 x 2 x 32.174 / 140 ) = 1.36 ft/s
```

A -36% speed reduction, because the energy carries the square. On a 42 in
opening that adds roughly
`42/12 x (1/1.36 - 1/1.0)` = -0.92 seconds to
each closing -- which across a day of service is real traffic capacity, and is the trade being made.

The mass side: a heavier door at the same speed fails proportionally. Adding a 20 lb panel upgrade takes this
door to `2.49` ft-lb without anything else changing, which is why door panel changes are
not cosmetic.

## 4. Scope and non-goals

A kinetic energy calculation. The applicable limits, the portion of travel over which the average speed is
measured, and the measurement procedure are set by the adopted edition of ASME A17.1, and the reduced limit that
applies with the reopening device inoperative is a separate value; both must be entered from the code. It does
not measure the door mass, which includes panels, hangers, linkage, and the portion of the operator that moves,
and which is commonly underestimated. It does not evaluate the closing force, which is a separate limit measured
with a calibrated gauge, or the reopening device's own performance and the code requirements for detector edges
and light curtains. It does not address door timing, dwell, or nudging operation, or the fire operation
requirements that change door behaviour. Elevator doors injure people: ASME A17.1 and A17.2, the door equipment
manufacturer, the elevator authority having jurisdiction, and a licensed elevator mechanic govern.
