# roughlogic.com Specification v1298 -- Rack and Pinion Travel and Force (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group K, machinist/mechanic), no new module or dependency. Inherits spec.md through spec-v1297.md.
>
> **The gap.** The gear family has spur, worm, and planetary geometry, but not the **rack and pinion** -- the drive
> that turns pinion rotation into straight-line motion on a CNC gantry, a sliding gate, a steering rack, or a linear
> actuator. Its two numbers, how far the rack moves per pinion turn and how hard it pushes for a given torque, are
> what sizes the motor. This adds them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a pinion tooth count below 6, a non-positive diametral pitch / torque / speed returns `{ error }`; no numeric field
is ever `Infinity`. Citation discipline (v19/v22): the rack-and-pinion kinematics (linear travel = pi x pitch
diameter per revolution) and the tangential force `F = 2 T / PD` (Machinery's Handbook), by name,
`GOVERNANCE.general`.

## 2. The tile

### 2.1 `rack-and-pinion` -- Rack and Pinion Travel, Speed, and Force

```
PD = N / Pd                            pinion pitch diameter (teeth N, diametral pitch Pd)
travel per revolution = pi PD          the pinion's pitch circumference
travel per tooth = pi / Pd             the circular pitch
linear speed = pi PD x rpm             (in/min; divide by 12 for ft/min)
rack force F = 2 T / PD                tangential push from pinion torque T
```

The rack advances one pitch circumference per pinion turn, so a bigger pinion moves faster but pushes softer for the
same torque -- the fundamental trade in picking a pinion. The force is the torque divided by the pitch radius.

**Inputs:** pinion teeth N, diametral pitch Pd (teeth per in), pinion torque T (in-lbf), pinion speed (rpm).

**Outputs:** pitch diameter (in), travel per revolution and per tooth (in), linear speed (in/min and ft/min), and
the rack push force (lbf).

## 3. Worked example

A 20-tooth, 10-pitch pinion at 100 in-lbf and 500 rpm:

```
PD = 20/10 = 2.0 in
travel/rev = pi x 2.0 = 6.283 in,  travel/tooth = pi/10 = 0.314 in
linear speed = 6.283 x 500 = 3,142 in/min = 262 ft/min
rack force = 2 x 100 / 2.0 = 100 lbf
```

Double the pinion to a 40-tooth (PD 4 in) at the same torque and speed and the rack moves twice as fast, 524 ft/min,
but pushes half as hard, 50 lbf -- speed for force, the choice the tile makes visible.

## 4. Scope and non-goals

The ideal kinematics and static force of a rack and pinion; tooth bending/contact stress (the gear-stress tiles),
mesh efficiency, backlash, acceleration (inertia), and the rack support are separate. A design aid; Machinery's
Handbook and the drive maker govern.
