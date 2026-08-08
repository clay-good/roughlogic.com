# roughlogic.com Specification v1255 -- Fixed-Orifice Target Superheat (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvac.js`** (Group C),
> no new module, group, or dependency. Inherits spec.md through spec-v1254.md.
>
> **The gap.** `superheat-subcool` and `refrigerant-charging` MEASURE superheat; no tile computes the TARGET a
> fixed-orifice system should be charged to (two aliases even point that question at the measurement tiles). This adds it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (calc-hvac is graduated -- the compute carries a `dims:` annotation), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: non-finite inputs return `{ error }`; a
zero/negative target and a below-55 F outdoor ambient are flagged (reported, not errored). Citation discipline (v19/v22):
the EPA 608 / manufacturer charging-chart field regression, `GOVERNANCE.mechanical`, clearly labeled empirical.

## 2. The tile

### 2.1 `fixed-orifice-target-superheat` -- Fixed-Orifice Target Superheat (Charging)

```
Target SH (F) = (3 x IDWB - 80 - ODT) / 2
IDWB = indoor return-air WET-bulb (F);  ODT = outdoor dry-bulb (F)
```

**Inputs:** indoor return-air wet-bulb (F), outdoor dry-bulb (F).

**Outputs:** the target superheat (F), with low-ambient and out-of-range flags.

## 3. Worked example

`IDWB = 63 F, ODT = 95 F` (hot day):

```
Target SH = (3 x 63 - 80 - 95) / 2 = (189 - 175) / 2 = 7 F
```

Cross-check: a milder 75 F outdoor day gives (189 - 80 - 75)/2 = 17 F -- 10 F higher, so the same system is charged to a
different superheat as the weather changes; each degree of outdoor temperature shifts the target half a degree.

## 4. Scope and non-goals

Fixed-orifice (piston/cap-tube) systems only -- a TXV holds superheat and is charged by subcooling instead. This is the
standard EPA 608 / manufacturer-chart charging method, an empirical regression of the charts (not first-principles),
valid roughly for outdoor >= 55 F and a positive target; below that, weigh in the charge. A field aid; the equipment's own
charging chart and the manufacturer govern.
