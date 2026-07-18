# roughlogic.com Specification v944 -- Motor Across-the-Line Acceleration Time (calc-motor.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-motor.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v943.md. Motor install/start sweep, beside the
> accepted `motor-locked-rotor-kva`, `reduced-voltage-starter`, and `rotary-phase-converter-sizing` tiles.
>
> **The gap, and the evidence for it.** The motor module solves torque, slip, poles, overload, locked-rotor kVA, fault
> contribution, reduced-voltage starting, and phase-converter sizing, but nothing gives the **acceleration time** -- how
> long a motor takes to bring its load up to speed across the line, the number that decides whether the start finishes
> inside the motor's safe stall time or trips the overload. Grep confirmed no acceleration/inertia/WK^2 tile. The number
> this settles: a 100 lb-ft^2 inertia reaching 1,750 rpm on 50 lb-ft of net torque takes **11.4 s**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input, or a non-positive inertia, speed change, or net accelerating torque (the load out-torques the motor, so
it never starts), returns `{ error }`. Citation discipline (v19/v22): the acceleration-time formula by name (the
rotational form of F = m x a; t = WK^2 x dN / (308 x T_net)), `GOVERNANCE.general`; the note states that WK^2 is the
total inertia reflected to the motor shaft (inertia reflects as the square of any gear/belt ratio), that T_net is the
AVERAGE net accelerating torque from the two speed-torque curves (a single average is a screen; the honest method
integrates over speed), and that a long start heats the rotor and must be checked against the motor's thermal-limit
(stall-time) curve -- the motor curves, the reflected load inertia, and the drive govern.

## 2. The tile

### 2.1 `motor-acceleration-time` -- Motor Across-the-Line Acceleration Time

```
inputs:
  inertia_lbft2         total inertia WK^2 reflected to the motor shaft (lb-ft^2), default 100
  speed_change_rpm      speed change dN (rpm, usually 0 -> rated), default 1750
  net_accel_torque_lbft average net accelerating torque T_net = motor torque - load torque (lb-ft), default 50

accel_time_s = inertia_lbft2 x speed_change_rpm / (308 x net_accel_torque_lbft)
```

The 308 constant folds the rad/s (2*pi/60) and gravitational (g = 32.174 ft/s^2) conversions in the rotational form of
Newton's second law.

**Pinned worked example.** WK^2 = 100 lb-ft^2, dN = 1,750 rpm, T_net = 50 lb-ft:
`t = 100 x 1750 / (308 x 50) = ` **11.4 s**. Cross-check: doubling the inertia to **200 lb-ft^2** doubles the start to
**22.7 s** (linear in inertia); doubling the net torque to 100 lb-ft halves it to 5.7 s.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical", "machinist"]`, beside `rotary-phase-converter-sizing`); a
`tile-meta.js` `_TILES` entry (`A`); a `citations.js` entry (rotational F = m a, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the base example plus the doubled-inertia cross-check, pinning the time);
`test/fixtures/compute-map.js` (`motor-acceleration-time` -> `computeMotorAccelerationTime`, module `../../calc-motor.js`);
`scripts/related-tiles.mjs` (-> `reduced-voltage-starter` / `motor-shaft-torque` / `motor-locked-rotor-kva`);
`data/search/aliases.json` (5 collision-checked aliases: "motor acceleration time", "motor starting time", "motor run up
time", "wk2 acceleration", "motor accel time"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the
`MOTOR_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-motor declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the base time, the linear-in-inertia / linear-in-speed / inverse-in-torque
scalings, and the error seams (non-positive inertia / speed / net torque, non-finite). The calc-motor.js gzip cap is
watched at build (raised for this tile). Home tile count 1,392 -> 1,393.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(100 lb-ft^2 / 1750 rpm / 50 lb-ft -> 11.4 s).

## 5. Roadmap position

Motor install/start beside `reduced-voltage-starter`, serving the electrician / motor tech / millwright (electrical /
machinist). Deliberately a screen; the motor's speed-torque and thermal-damage curves, the reflected load inertia, and
the drive govern. Stays evidence-driven. Continues the motor install-ops sweep at 1 new spec (v944).
