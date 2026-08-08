# roughlogic.com Specification v1253 -- Truck Startable Grade (calc-trucking.js, Group J, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`** (Group J),
> no new module, group, or dependency. Inherits spec.md through spec-v1252.md.
>
> **The gap.** Trucking has `static-rollover-threshold` and `axle-load-distribution` but no grade/traction tile; the only
> grade-resistance math is off-highway rimpull in `calc-earthwork.js`, a different model.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input, a non-positive weight, a drive-axle weight exceeding gross, a friction coefficient outside (0, 1], or a
negative rolling-resistance coefficient returns `{ error }`. Citation discipline (v19/v22): first-principles Newtonian
statics (SAE J2188 gradeability), `GOVERNANCE.general`. **No table is reproduced.**

## 2. The tile

### 2.1 `truck-startability` -- Truck Startable Grade (Traction Limit)

```
tractive effort = mu x W_drive
max startable grade (%) = 100 (mu x (W_drive/W_gross) - f)
```

the small-angle form of `mu x W_drive >= W_gross (sin theta + f cos theta)`. mu ~ 0.6 dry / 0.3 wet / 0.15 ice; f ~ 0.012.

**Inputs:** gross combination weight (lb), drive-axle weight (lb), tire-road friction coefficient, rolling-resistance
coefficient.

**Outputs:** the maximum startable grade (%), the available tractive effort (lb), and the drive-axle weight fraction.

## 3. Worked example

`W_gross 80,000 lb, W_drive 34,000 lb, mu 0.6 (dry), f 0.012`:

```
drive fraction = 34,000 / 80,000 = 0.425
max grade = 100 (0.6 x 0.425 - 0.012) = 24.3%
tractive effort = 0.6 x 34,000 = 20,400 lb
```

Cross-check: the same rig on ice (mu 0.15) can start on only 5.2%; more drive-axle weight raises the limit.

## 4. Scope and non-goals

A STARTING (traction) limit, not a sustained-speed (power) limit. The small-angle field form is used; wheel slip, weight
transfer to the rear on the grade, and differential/traction-control behavior shift the real number. A planning estimate;
the driver, the surface, and the truck govern.
