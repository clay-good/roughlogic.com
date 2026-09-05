# roughlogic.com Specification v1648 -- Elevator Traction Roping Ratio and Motor Torque (`calc-elevator.js`, Group E Carpentry and Construction, elevator, 1 New Tile)

> **Status: LANDED 2026-09-05. Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elevator.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; elevator and escalator), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A 2:1 roped elevator moves its car half as fast as its ropes and doubles the sheave's mechanical advantage, and every torque, speed, and rope-tension number in the machine room follows from that ratio. Reading a machine's rating without knowing the roping gives an answer off by a factor of two.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a roping ratio below one, a non-positive car speed, sheave diameter, or load returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the roping ratio relations with ASME A17.1 and the equipment manufacturer data named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`elevator roping ratio`, `2 to 1 roping elevator`, `sheave torque roping`, `rope speed car speed`, `machine rpm elevator sheave`.

## 2. The tile

### 2.1 `traction-roping-ratio` -- Elevator Traction Roping Ratio and Motor Torque

```
roping ratio     r = rope speed / car speed;  1:1, 2:1, and higher
rope speed       v_rope = r x v_car
sheave torque    T = (unbalanced load / r) x sheave radius
motor speed      rpm = v_rope x 12 / (pi x sheave diameter)
tension          each rope carries the suspended load divided by (r x number of ropes)
trade            2:1 halves the load per rope and doubles the rope speed and travel
```

The ratio is a mechanical advantage and it trades force for speed exactly as any block and tackle does. A 2:1
arrangement halves the tension each rope carries -- allowing smaller ropes or fewer of them -- and doubles the
rope speed, so the machine turns twice as fast for the same car speed and can therefore be a smaller, faster,
higher-torque-efficient unit. That is why 2:1 dominates in geared and machine-room-less installations while 1:1 is
common on high-speed gearless machines where rope speed would otherwise become excessive.

The consequences ripple through everything a mechanic touches. Rope travel is twice the car travel, so rope wear
and stretch accumulate twice as fast; the governor and safeties are arranged for the car's speed while the ropes
run at twice it; and the sheave sees twice the rope passes per trip, which is the fatigue driver in the grooves.

The arithmetic error worth preventing is a straightforward one: computing motor torque from the car load and the
sheave radius without dividing by the roping ratio overstates it by a factor of two on a 2:1 machine, and sizing
or diagnosing a drive on that basis produces confident nonsense.

**Inputs:** roping ratio, car speed, sheave diameter, the unbalanced load, the number of ropes, and the machine rated torque and speed

**Outputs:** the rope speed, the tension per rope, the sheave torque, the machine speed in rpm, the power at the entered load and speed, and the same quantities at an alternative roping ratio for comparison

## 3. Worked example

A car running 500 fpm on 2:1 roping with a 30 in sheave:

```
rope speed = 2 x 500        = 1,000 fpm
sheave rpm = 1,000 x 12 / (pi x 30) = 127 rpm
```

The machine turns at 127 rpm to move the car at 500 fpm. On 1:1 roping the same car speed
would need `500 x 12 / (pi x 30)` = 64 rpm -- half the speed and twice the torque for the
same power.

Torque with a 2,000 lb unbalanced load:

```
2:1 -> T = (2,000 / 2) x (30/24) ft = 1,250 ft-lb
1:1 -> T = (2,000 / 1) x (30/24) ft = 2,500 ft-lb
```

**Computing the 2:1 machine's torque without dividing by the ratio gives 2,500 ft-lb** -- double
the truth, and a drive or brake diagnosed against that number will look undersized when it is correct.

Rope tension: with five ropes on 2:1, each carries the suspended load divided by `2 x 5` = 10, against divided by
5 on 1:1. That is the reason 2:1 allows smaller ropes -- and the reason its ropes travel twice as far per trip and
wear accordingly.

## 4. Scope and non-goals

A kinematic and static relation. It does not size a machine, motor, brake, or drive, and it does not evaluate
traction, sheave groove pressure, or the bending fatigue that sheave diameter imposes on the ropes. It does not
account for compensation, rope weight variation over the travel, or the inertia of the rotating masses, which
matter for acceleration and for brake sizing. It does not address the governor and safety arrangement, which is
referenced to car speed and not rope speed, or the counterweight (`counterweight-balance`) whose overbalance sets
the unbalanced load this calculation uses. Roping arrangements beyond 2:1, underslung and machine-room-less
configurations, and belt suspension follow the same principle with different practical limits. Elevator equipment
is life-safety: ASME A17.1, the equipment manufacturer's data, the elevator authority having jurisdiction, and a
licensed elevator mechanic govern.
