# roughlogic.com Specification v1402 -- Drill Speed, Feed, Power, and Torque (calc-machining.js, Group E, machining and fabrication, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group E, machining and fabrication), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog has cutting speed for milling and turning, material removal rate, spindle power, and tool life, but drilling -- the most common machining operation there is -- has only a tap-drill size tile. Drilling has its own speed and feed convention (inches per revolution, not per tooth) and its own power and torque consequences, and none of it is in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive drill diameter, surface speed, or feed per revolution, or a unit power or efficiency at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the surface-speed relation RPM = 3.82 SFM / D, the unit-power (hp per cubic inch per minute) method, and the torque relation T = 63,025 hp / RPM, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `drill-feed-thrust` -- Drill Speed, Feed, Power, and Torque

```
RPM          = 3.82 x SFM / diameter
feed rate    = feed per revolution x RPM        (in/min)
removal rate = pi (D/2)^2 x feed rate           (cubic in/min, full hole)
power at cut = removal rate x unit power for the material
motor power  = power at cut / spindle efficiency
torque       = 63,025 x power at cut / RPM
```

Drilling is fed in inches per revolution rather than per tooth, because a drill's two lips both cut on the same
revolution and the feed is what determines chip thickness on each. The removal rate is the full hole cross-section
times the feed rate -- a drill cuts the entire circle, which is why a drill of a given diameter removes far more
material per minute than an end mill of the same diameter.

The torque line is the one that matters on a hand-fed machine or a mag drill. Power is modest and torque is not:
a half-inch drill in steel is under a horsepower and over seventy inch-pounds, and the torque rises with the
*square* of diameter at constant surface speed. A one-inch drill at the same surface speed and feed per
revolution takes four times the torque, which is why a drill press that handles a half-inch bit throws the work
out of the vise with a one-inch one.

**Inputs:** drill diameter (in), surface speed (SFM), feed per revolution (IPR), unit power for the material
(hp per cubic inch per minute), spindle efficiency.

**Outputs:** spindle RPM, feed rate (IPM), material removal rate, power at the cut and at the motor, and spindle
torque.

## 3. Worked example

A 0.500 in HSS drill in mild steel at 80 SFM and 0.006 IPR, unit power 1.0, spindle efficiency 80%:

```
RPM          = 3.82 x 80 / 0.500      = 611 RPM
feed rate    = 0.006 x 611            = 3.67 IPM
removal rate = pi x 0.25^2 x 3.67     = 0.72 cubic in/min
power at cut = 0.72 x 1.0             = 0.72 hp
motor power  = 0.72 / 0.80            = 0.90 hp
torque       = 63,025 x 0.72 / 611    = 74.2 in-lb
```

Under a horsepower, but seventy-four inch-pounds is over six foot-pounds of reaction the operator or the fixture
has to hold, and it arrives instantly when the drill breaks through. Double the diameter to 1.000 in at the same
surface speed and feed per revolution: the RPM halves to 306, the removal rate goes to 1.44 cubic in/min, and the
torque climbs to 297 in-lb -- nearly twenty-five foot-pounds, and no one holds that by hand.

## 4. Scope and non-goals

Twist drilling a full-diameter hole in solid material. Unit power is a material property that varies with
hardness, feed, and tool wear -- published values are typical, and a dull drill can take twice the power of a
sharp one. The tile does not model peck cycles, deep-hole chip evacuation (which limits feed long before power
does past about four diameters of depth), through-coolant, pilot holes, or the very different behavior of
spade, indexable, and gun drills. It does not check whether the fixture, the machine, or the operator can hold
the reaction torque, which is the actual safety question. Machinery's Handbook, the tool manufacturer's data,
and the machinist govern.
