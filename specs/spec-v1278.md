# roughlogic.com Specification v1278 -- Governing Box Culvert Headwater (calc-drainage.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-08-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`**
> (Group B, civil drainage), no new module or dependency. Inherits spec.md through spec-v1277.md.
>
> **The gap (the box tiles name it).** `culvert-headwater` (spec-v1277) reports the governing (greater of inlet
> and outlet) headwater for a circular barrel. The box inlet- and outlet-control tiles each say "the actual
> headwater is the greater of inlet and outlet control," but nothing ran both for a box and reported that value.
> This is the box companion.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
whatever error the delegated box inlet- or outlet-control compute returns is surfaced verbatim; no numeric field is
ever `Infinity`. Citation discipline (v19/v22): FHWA HDS-5 (FHWA-HIF-12-026) box inlet- and outlet-control
procedure, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `box-culvert-headwater` -- Governing Box Culvert Headwater (FHWA HDS-5)

```
HW_inlet  = computeBoxCulvertInletControl(...)       (spec-v1270)
HW_outlet = computeBoxCulvertOutletControl(...)       (spec-v1276)
HW_design = max( HW_inlet, HW_outlet )                control = whichever is larger
```

The tile delegates to the two landed box computes. Because the box inlet-control and outlet-control tiles key their
inlet edges slightly differently (Table A.1 rows vs Ke rows), one map pairs each physical inlet with the right key
in each. `D` is the box rise.

**Inputs:** span (in), rise (in), discharge Q (cfs), barrel slope So (ft/ft), barrel length L (ft), Manning n
(default 0.012), tailwater TW above the outlet invert (ft), and the inlet edge treatment.

**Outputs:** the governing headwater HW (ft above the inlet invert), which control governs, the inlet- and
outlet-control headwaters side by side, and HW/D (with the over-1.5 overtopping flag).

## 3. Worked example

6 x 4 ft box, 30-75 deg wingwall flares, 100 ft on a 1% slope (n 0.012), passing 150 cfs with a 2 ft tailwater:

```
HW_inlet  = 4.336 ft   (unsubmerged inlet control, Form 1)
HW_outlet = 3.392 ft   (full-flow outlet control)
HW_design = 4.336 ft   -> INLET control governs, HW/D = 1.08
```

Cross-check: the same box on a flatter 0.4% slope, 200 ft long, rougher (n 0.02), with 45 deg bevels and a 4 ft
tailwater gives HW_inlet 4.226 ft but HW_outlet 5.031 ft, so outlet control governs at 5.03 ft (HW/D 1.26) -- the
flatter, longer, rougher barrel under the deeper tailwater flips control to the barrel.

## 4. Scope and non-goals

The governing (greater) of box inlet and outlet control, delegating to `box-culvert-inlet-control` and
`box-culvert-outlet-control`. Circular barrels use `culvert-headwater`. Full or nearly full flow is assumed for the
outlet check. The nomographs carry about +/-10%; the engineer of record and the DOT drainage manual govern.
