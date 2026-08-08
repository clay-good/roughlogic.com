# roughlogic.com Specification v1259 -- Reverse (S) Curve Between Parallel Tangents (calc-civil.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-civil.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1258.md.
>
> **The gap (self-declared).** The `compound-curve` tile's note names its own missing sibling:
> *"The two arcs must turn the SAME way (a reverse curve, turning opposite ways, is a separate case)."*
> This spec builds that separate case and completes the horizontal-alignment set
> (simple / spiral / compound / reverse).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-positive radius or offset, or an offset too large for the radii (`p >= 2(R1 + R2)`, outside the arccos domain)
returns `{ error }`. Citation discipline (v19/v22): reverse-curve geometry between parallel tangents per Ghilani &
Wolf, *Elementary Surveying*, and the AASHTO Green Book; `GOVERNANCE.engineer_of_record`. Fully first-principles
circular-curve trigonometry.

## 2. The tile

### 2.1 `reverse-curve` -- Reverse (S) Curve Between Parallel Tangents

```
Both arcs share the central angle (parallel tangents):
  I = arccos(1 - p / (R1 + R2))            p = perpendicular offset between tangents
Per arc:  T = R tan(I/2),  L = R x I (radians)
Tangent-point distance along the tangent direction:  d = (R1 + R2) sin I
```

**Inputs:** first radius R1 (ft), second radius R2 (ft), offset between the parallel tangents p (ft).

**Outputs:** central angle I (deg, shared by both arcs), semi-tangents T1/T2 (ft), tangent-point distance (ft),
each arc length (ft), total length (ft).

## 3. Worked example

Equal 500 ft radii, 60 ft offset:

```
I = arccos(1 - 60/1000) = arccos(0.94) = 19.948 deg
T = 500 tan(9.974 deg) = 87.93 ft
d = 1000 sin(19.948 deg) = 341.17 ft
L = 2 x 500 x 0.348167 rad = 348.17 ft
```

Cross-check, unequal radii 400/600, 50 ft offset: both arcs share I = 18.195 deg (the shared angle is what keeps the
outgoing tangent parallel); lengths split 127.02 / 190.54 ft in the 400:600 ratio.

## 4. Scope and non-goals

Parallel-tangent reverse curve only (the textbook crossover / lane-shift case), which fixes the two arcs to a common
central angle. Non-parallel reverse tangents and the stationing of the PRC are out of scope. A reverse curve leaves no
room for superelevation runout between the arcs, so AASHTO/AREMA want a tangent or spiral inserted at the PRC above low
speeds; the engineer of record governs. calc-civil.js stays under its 17000 B cap.
