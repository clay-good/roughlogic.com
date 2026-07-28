# roughlogic.com Specification v1125 -- Gear Tooth Dynamic (Barth) Bending Stress (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-mechanic.js`** (Group K), no new module, group, or dependency. Inherits spec.md through
> spec-v1124.md.
>
> **The gap, in the sibling's own words.** `gear-tooth-bending-stress` closes with: *"This is the STATIC
> Lewis stress: it does not apply the velocity (Barth) dynamic factor ... so it runs optimistic at speed."*
> Second tile this session found by the self-declared-gap grep.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
power, speed, pitch, or face width, fewer than 6 teeth, a negative Y override or Sut, or an unknown tooth
system return `{ error }`. Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `gear-dynamic-tooth-stress` -- Gear Tooth Dynamic (Barth) Bending Stress

```
inputs:  horsepower, rpm, number_of_teeth, diametral_pitch_1_in, face_width_in, tooth_system,
         y_diametral_override (0 = derive), tooth_cut (cut|cast), is_idler, sut_psi
compute: D = T/Pd;  torque = 63,025 HP / rpm;  Wt = 2 torque / D;  V = pi D N / 12
         Kv = (1200 + V)/1200 cut or milled,  (600 + V)/600 cast or crude
         static sigma  -> DELEGATED to computeGearToothBendingStress
         dynamic sigma = static x Kv x (1.42 if idler)
         allowable = Sut/3 when entered;  SF = allowable / dynamic
outputs: pitch_diameter_in, torque_inlb, wt_lb, velocity_fpm, kv, kv_base, cast,
         static_stress_psi, lewis_Y_diametral, y_source, idler, ki, dynamic_stress_psi,
         dynamic_penalty_pct, allowable_psi, safety_factor, undercut_flag, note
```

**How much the velocity matters.** On the pinned example the pitch line runs 1,407 ft/min, Kv comes out
**2.17**, and the bending stress goes from 3,752 psi to **8,152 psi** -- the same tooth under the same
load, just moving. That is the entire reason the static Lewis number cannot be used on a running drive.

**It starts a step earlier.** The sibling wants a tangential load; this one takes horsepower and rpm, which
is what a person actually has, and does the torque-to-load conversion itself. That removes the step where
most of the arithmetic errors happen.

**Verification.** The published example -- 43 teeth, 20 deg full involute, 8 diametral pitch, 0.5 in wide,
4 HP at 1,000 rpm, giving **8,152 psi** -- is reproduced to 8,152.16 with Y entered as the 0.4 read off
the form-factor chart. The whole intermediate chain matches too: 5.375 in pitch diameter, 252.1 in-lb,
93.8 lb, 1,407.2 ft/min.

**Delegation, not duplication.** The static stress comes from `computeGearToothBendingStress`; the fuzzer
pins exact agreement across four tooth counts and all three tooth systems, so a future correction to the
Lewis form factor propagates here automatically. The second fixture shows the derived Y (0.41717) is not
the same as the chart's 0.4, and says so rather than pretending they agree.

**The idler case.** An idler is driven on one flank and drives on the other, so its teeth see a fully
reversed cycle. The 1.42 factor rides on top of Kv; the fuzzer pins that it is exactly 1.42 and that it
does **not** touch the static stress.

## 3. Honest limits, in the note and the citation

Barth is an approximation and a conservative one -- it is the ancestor of the AGMA dynamic factor, which is
tailored to a measured quality number and typically lands between 1 and 1.8, so this reads high against a
good gear. `Sut/3` is a rough allowable for when no material value is on hand, not a rated endurance limit.
Not modeled: the AGMA application, size, load-distribution, and rim-thickness factors, the geometry factor
J that corrects Y for stress concentration, and any surface-durability (pitting) check -- which frequently
governs before bending does. No AGMA table, quality chart, or geometry curve is reproduced; none is used.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `gear-tooth-bending-stress` (which now
links forward), `spur-gear-geometry`, `gear-undercut-backlash`, and `motor-shaft-torque`. Fuzzer pins the
published example and its whole intermediate chain, the Kv definition for both qualities across five
speeds, that cast is always penalized harder and that only Kv differs between the two, exact agreement
with the delegated Lewis stress across twelve combinations, override behavior, the exact 1.42 idler factor
and that it is not a static effect, load scaling with power and the speed trade-off at fixed power, the
Sut/3 allowable and that omitting Sut yields `null` rather than a fabricated number, and every error seam.
