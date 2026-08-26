# roughlogic.com Specification v1370 -- Chain Hoist Lift Time, Power, and Duty Cycle (calc-stage.js, Group N, stage and live production, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`**
> (Group N, stage and live production), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group N has counterweight fly-system balance and winch fleet angle but nothing for the electric chain hoist, which is how almost every modern production actually lifts. Lift time drives the load-in schedule, motor power drives the distro, and the duty-cycle rating -- which most users have never read -- drives how many lifts an hour the motor will survive.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive lift height, hoist speed, or capacity, or a duty-cycle fraction outside 0-1, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the mechanical-power relation P = W v / 33,000 and the intermittent-duty rating classes used for electric chain hoists, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `chain-hoist-lift-time` -- Chain Hoist Lift Time, Power, and Duty Cycle

```
lift time (min)   = lift height / hoist speed
hoisting hp       = load x speed / 33,000        (lb, ft/min)
allowed on-time   = duty cycle fraction x rating period
lifts per period  = allowed on-time / lift time
```

The first line is the schedule. A hundred trusses that each take four minutes to fly is not a number anyone
estimates correctly by eye, and hoist speed varies by an order of magnitude across the hoists on a truck --
16 ft/min for a standard motor, 32 or 64 for a high-speed one.

The third and fourth lines are the ones that surprise people. An electric chain hoist is rated for *intermittent*
duty: a common rating allows the motor to run 40% of a ten-minute period, four minutes on and six minutes off.
Run it harder and the motor overheats, and the failure is not graceful. On a long trim, one full-height lift can
consume most of the allowed on-time by itself, which is why a rig that has to come in and out repeatedly during a
show is planned around duty cycle, not around hoist count.

**Inputs:** lift height (ft), hoist speed (ft/min), load (lb), duty-cycle fraction and rating period (min),
number of hoists (for the aggregate power figure).

**Outputs:** lift time (min), hoisting horsepower per hoist and for the set, allowed on-time per period, and full
lifts available per period.

## 3. Worked example

A one-ton hoist at 16 ft/min taking a 2,000 lb load up a 60 ft trim, rated 40% duty over a ten-minute period:

```
lift time      = 60 / 16              = 3.75 min
hoisting hp    = 2,000 x 16 / 33,000  = 0.97 hp
allowed on-time= 0.40 x 10            = 4.0 min per 10 min
lifts / period = 4.0 / 3.75           = 1.07
```

One lift per ten minutes, and no margin. A show that needs the same rig in and out twice in a ten-minute window is
asking the motor for more than its rating, and the answer is a faster hoist or a shorter trim -- not a longer
button press. Note also that the hoisting horsepower is under one: chain hoist motors are small, and the number
that sizes the distro is the *inrush*, not this steady figure.

## 4. Scope and non-goals

Motion arithmetic only. This tile does not select a hoist, verify its capacity against the load, check the
rigging above it, or address the control system, the secondary safety, or the load-cell monitoring that a rig
over an occupied space requires. Hoisting horsepower is the useful mechanical output, not the motor's electrical
draw -- add the gearbox and motor efficiencies and the starting current to size a circuit, which the catalog's
motor and branch-circuit tiles do. Overhead lifting over people is governed by ANSI E1.6 and the local authority,
and is a rigger's call, not a calculator's. The hoist manufacturer and the AHJ govern.
