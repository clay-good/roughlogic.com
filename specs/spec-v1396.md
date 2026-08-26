# roughlogic.com Specification v1396 -- Grade Rod, Cut, and Fill from an Instrument Setup (calc-survey.js, Group P, field, survey, and SAR, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-survey.js`**
> (Group P, field, survey, and SAR), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog has differential leveling by the height-of-instrument method for running a level loop, but not the everyday use of that same setup: turning a rod reading into a cut or a fill against a design elevation. The two are one subtraction apart and the sign convention is the thing crews get backward.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive rod reading or backsight, a benchmark elevation of zero when none is supplied, or a design elevation above the height of instrument, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the height-of-instrument (HI) leveling method and the grade-rod convention (grade rod = HI minus design elevation), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `grade-rod-cut-fill` -- Grade Rod, Cut, and Fill from an Instrument Setup

```
HI          = benchmark elevation + backsight
grade rod   = HI - design elevation
ground elev = HI - ground rod
cut or fill = grade rod - ground rod
              positive -> CUT that much
              negative -> FILL that much
```

Set the instrument, shoot the benchmark, and the height of instrument is fixed for the setup. From then on, one
number -- the grade rod -- carries the entire design: it is the rod reading that *would* be observed if the rod
were standing on finished grade. Every subsequent shot is compared against it, and the difference is the cut or
fill, with no elevation arithmetic at all.

The sign is where crews go wrong, and it is worth stating plainly: a rod reading *smaller* than the grade rod
means the rod is standing *higher* than design, because the rod reads down from a fixed instrument. Smaller
reading, higher ground, cut. It reads backward the first hundred times.

**Inputs:** benchmark elevation, backsight rod reading, design (finished grade) elevation, and one or more
ground rod readings.

**Outputs:** height of instrument, grade rod, ground elevation at each shot, and the cut or fill at each with its
label.

## 3. Worked example

Benchmark at elevation 100.00 ft, backsight reads 5.20, design grade 98.50:

```
HI        = 100.00 + 5.20 = 105.20
grade rod = 105.20 - 98.50 = 6.70
```

Now shoot the ground and read 4.90:

```
ground elevation = 105.20 - 4.90 = 100.30
cut or fill      = 6.70 - 4.90   = +1.80  ->  CUT 1.80 ft
```

Confirm it independently: the ground is at 100.30 and design is 98.50, so 1.80 ft has to come off. Shoot a low
spot reading 7.55 instead and the answer is `6.70 - 7.55 = -0.85`, a fill of 0.85 ft -- the ground there sits at
97.65, below design. One grade rod, every shot on the setup.

## 4. Scope and non-goals

One instrument setup. The moment the instrument moves, the height of instrument changes and a new backsight to a
turning point or benchmark is required -- carrying a stale HI to a new setup is the classic blunder, and the
catalog's differential leveling and loop-misclosure tiles are how a multi-setup run is kept honest. The tile does
not apply curvature and refraction (its own tile in this group), does not correct for instrument collimation
error, and does not check the level's calibration by a two-peg test, which should precede any work that matters.
It assumes rod readings in the same units and datum as the design. The plans and the party chief govern.
