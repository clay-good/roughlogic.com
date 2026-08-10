# roughlogic.com Specification v1299 -- Universal Joint (Cardan) Speed Variation (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic), no new module or dependency. Inherits spec.md through spec-v1298.md.
>
> **The gap.** The driveline bench has `driveshaft-crit` and `driveshaft-max-length` (whirl speed), but nothing for
> the **Cardan error** -- the twice-per-revolution speed fluctuation a single universal joint introduces when it runs
> at an angle. It is why driveline angles are kept small and equal, why a steep U-joint angle shakes and howls, and
> why a double-Cardan or matched pair is used to cancel it. This adds the output speed swing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a joint angle outside 0-85 degrees, or a non-positive input speed returns `{ error }`; no numeric field is ever
`Infinity`. Citation discipline (v19/v22): the Cardan (Hooke) universal-joint velocity relation, output speed
ranging between `omega cos(beta)` and `omega / cos(beta)` (Machinery's Handbook; Shigley), by name,
`GOVERNANCE.general`.

## 2. The tile

### 2.1 `universal-joint-speed` -- Universal Joint (Cardan) Speed Variation

```
max output = input / cos(beta)          twice per revolution (at 0, 180 deg of input)
min output = input x cos(beta)          twice per revolution (at 90, 270 deg)
speed fluctuation = (1/cos(beta) - cos(beta)) = sin(beta) tan(beta)    fraction of input
```

A single Cardan joint at operating angle `beta` makes its output run ahead and then fall behind the input twice each
turn; the swing grows fast with angle. A second joint, phased 90 degrees and at an equal angle (a double-Cardan or a
matched two-joint shaft), reverses the error so the far output turns uniformly again.

**Inputs:** joint operating angle beta (deg), input speed (rpm).

**Outputs:** maximum and minimum output speed (rpm), the peak-to-peak speed fluctuation (% of input), and the
velocity-ratio limits.

## 3. Worked example

A single U-joint at 10 degrees, input 1,000 rpm:

```
max = 1000 / cos(10) = 1,015.4 rpm,  min = 1000 x cos(10) = 984.8 rpm
fluctuation = 1.0154 - 0.9848 = 0.0306 = 3.1% of input
```

At 10 degrees the output swings +/-1.5% twice a turn -- noticeable but livable. Open the angle to 30 degrees and the
swing explodes to nearly 29%, from 866 to 1,155 rpm, which no driveline tolerates. That is the reason U-joint
working angles are held to a few degrees and the two ends of a shaft are angled equally.

## 4. Scope and non-goals

The kinematic speed variation of a single Cardan joint at a constant angle; the induced torque pulsation and inertial
(secondary) shaking couple, the cancellation math for a specific double-Cardan geometry, and true constant-velocity
(CV) joints are separate. Match and phase the joints on a real shaft. A design aid; Machinery's Handbook / Shigley
and the driveline maker govern.
