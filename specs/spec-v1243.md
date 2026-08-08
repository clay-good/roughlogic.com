# roughlogic.com Specification v1243 -- Speed of Sound in Air vs Temperature (calc-stage.js, Group N, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`** (Group N),
> no new module, group, or dependency. Inherits spec.md through spec-v1242.md.
>
> **The gap.** Needed-input none produces: `time-alignment` and `ceiling-speaker-coverage` assume a fixed ~1130 ft/s;
> no tile computes the propagation speed from conditions.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite temperature or one at/below absolute zero (-459.67 F) returns `{ error }`. Citation discipline (v19/v22):
first-principles kinetic theory (c = sqrt(gamma R T / M)) with the NIST 331.3 m/s dry-air reference, `GOVERNANCE.general`.
**No table is reproduced.**

## 2. The tile

### 2.1 `speed-of-sound-air` -- Speed of Sound in Air vs Temperature

```
T_C = (T_F - 32) / 1.8
c   = 331.3 sqrt(1 + T_C/273.15) m/s        (dry air)
c_ftps = c x 3.28084
delay  = 1000 / c_ftps  ms per foot
```

**Inputs:** air temperature (F).

**Outputs:** the speed of sound in ft/s and m/s, and the propagation delay in ms per foot.

## 3. Worked example

`T_F = 68`:

```
T_C = 20
c   = 331.3 sqrt(1 + 20/273.15) = 343.2 m/s = 1,126 ft/s
delay = 1000 / 1126 = 0.888 ms/ft
```

Cross-check: 32 F gives 1,087 ft/s and 95 F gives 1,155 ft/s -- a ~6% swing, so a delay tower needs re-timing for the
day's temperature (the required delay is inversely proportional to c).

## 4. Scope and non-goals

Dry air; humidity raises c slightly (a small second-order term) and altitude alone does not change it (temperature
does). A first-principles aid feeding the time-alignment and ceiling-speaker-coverage tiles; the measured system tuning
governs.
