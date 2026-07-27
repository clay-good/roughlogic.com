# roughlogic.com Specification v1105 -- Fan Sheave Change for a Target CFM (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvac.js`**
> (Group C), no new module, group, or dependency. Inherits spec.md through spec-v1104.md.
>
> **The gap, and the evidence for it.** `fan-affinity-laws` requires BOTH `n1` and `n2` -- it cannot solve
> for the speed needed to hit an airflow, let alone the sheave that delivers it. `affinity-laws` takes a
> ratio. `belt-pulley` computes driven rpm from known diameters, and `vbelt-drive` returns a ratio and belt
> length. No tile returns a required sheave diameter for an airflow target. Discovery batch 6 confirmed the
> gap and warned it is a two-tile composition -- which is exactly why the missing piece is worth landing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
airflow / speed / sheave, or negative power or static pressure, return `{ error }`. Optional inputs
(`current_bhp`, `motor_hp`, `current_sp_inwg`) accept 0 to skip their checks rather than erroring.
Renderer: hand-written non-exported (module convention).

## 2. The tile

### 2.1 `fan-sheave-for-target-cfm` -- Fan Sheave Change for a Target CFM

```
inputs:  current_cfm (MEASURED), target_cfm, current_fan_rpm, motor_rpm (1750),
         drive_sheave_in (motor sheave PITCH dia), current_bhp (0=skip), motor_hp (0=skip),
         current_sp_inwg (0=skip)
compute: ratio            = target / current
         required_fan_rpm = current_rpm x ratio                  Q ~ N
         driven_sheave    = motor_rpm x drive_sheave / fan_rpm   the fan sheave, held fixed
         new_drive_sheave = drive_sheave x ratio
         check_fan_rpm    = motor_rpm x new_drive / driven       must reproduce required_fan_rpm
         new_sp  = sp x ratio^2;   new_bhp = bhp x ratio^3
         flags: motor_overloaded (new_bhp > motor_hp), over_motor_rpm
outputs: ratio, required_fan_rpm, new_drive_sheave_in, driven_sheave_in, check_fan_rpm,
         new_bhp, new_sp_inwg, bhp_increase_pct, motor_overloaded, over_motor_rpm, note
```

**The tile exists for the motor check.** Airflow follows speed one-for-one, but brake horsepower follows
the CUBE. The pinned example is deliberately the failure case: going 8,000 to 9,600 cfm -- only 20% more
air -- swaps a 4.0-in drive sheave for a 4.8-in, and takes 3.0 bhp to **5.18 bhp, which overloads the 5 hp
motor**. That is the most common way a well-meant airflow fix cooks a motor or trips the overloads, and a
sheave calculation that stopped at the diameter would walk the user straight into it.

The cross-check fixture pins the same law paying off in the other direction: cutting to 6,000 cfm needs a
3.0-in sheave and drops power 57.8%.

## 3. Scope limits, all stated in the note

Sheaves come in fixed increments and adjustable sheaves have a limited range -- take the next available
size and re-measure. Enter PITCH diameter, not outside diameter. A faster fan raises static pressure with
the square, so noise and leakage rise faster than airflow, and the belt and bearings see more load. Same
fan on the same system curve; if the system changed, the fan curve governs. Measure the current airflow
rather than trusting the nameplate, and verify after the change.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `fan-affinity-laws`. Two structural pins
in the fuzzer: a **belt-drive round trip** (the returned sheave, run back through the drive ratio,
reproduces the required speed) and a **cross-implementation check** (feeding this tile's computed speed
into the landed `computeFanAffinityLaws` reproduces the target CFM, the new BHP, and the new static
pressure exactly). Plus exact power-law exponents across a ratio sweep, the identity at ratio 1, the
skip-on-zero behavior of the optional inputs, and both flags.
