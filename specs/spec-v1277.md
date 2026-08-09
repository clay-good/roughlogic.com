# roughlogic.com Specification v1277 -- Governing Culvert Headwater (calc-drainage.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-08-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`**
> (Group B, civil drainage), no new module or dependency. Inherits spec.md through spec-v1276.md.
>
> **The gap (all four culvert tiles name it).** Every culvert tile -- inlet and outlet, circular and box --
> ends with the same sentence: "the ACTUAL headwater is the GREATER of inlet and outlet control." The catalog
> now computes each control separately but never runs both and picks the governing value, which is the single
> number a designer reads off. This capstone does exactly that for a circular barrel.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
whatever error the delegated inlet- or outlet-control compute returns is surfaced verbatim (a non-positive
diameter / discharge / length / Manning n, a negative slope or tailwater, or an unknown inlet configuration); no
numeric field is ever `Infinity`. Citation discipline (v19/v22): FHWA HDS-5 (FHWA-HIF-12-026) inlet- and
outlet-control procedure, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `culvert-headwater` -- Governing Culvert Headwater (FHWA HDS-5)

```
HW_inlet  = computeCulvertInletControl(...)          (spec-v1269)
HW_outlet = computeCulvertOutletControl(...)         (spec-v1275)
HW_design = max( HW_inlet, HW_outlet )               control = whichever is larger
```

The tile delegates to the two landed circular computes, so there is no duplicated physics. A single inlet-edge
selection maps to both the inlet-control Table A.1 constants and the outlet-control Ke entrance-loss value (one
physical inlet). Inlet control usually governs on steep barrels with a good entrance; outlet control takes over on
long, rough, or flat barrels and under a high tailwater.

**Inputs:** diameter (in), discharge Q (cfs), barrel slope So (ft/ft), barrel length L (ft), Manning n
(default 0.012), tailwater TW above the outlet invert (ft), and the shape/inlet edge.

**Outputs:** the governing headwater HW (ft above the inlet invert), which control governs, the inlet- and
outlet-control headwaters side by side, and HW/D (with the over-1.5 overtopping flag).

## 3. Worked example

36 in concrete pipe, square-edge headwall, 100 ft long on a 1% slope (n 0.012), passing 50 cfs with a 2 ft
tailwater:

```
HW_inlet  = 3.986 ft   (unsubmerged inlet control)
HW_outlet = 3.292 ft   (full-flow outlet control)
HW_design = 3.986 ft   -> INLET control governs, HW/D = 1.33
```

Cross-check: the same barrel as corrugated metal (n 0.024, headwall Ke 0.5) on a flatter 0.5% slope, 150 ft long,
under a 4 ft tailwater gives HW_inlet 3.959 ft but HW_outlet 7.272 ft, so outlet control governs at 7.27 ft
(HW/D 2.42, well over the 1.5 flag) -- the flatter, rougher, longer barrel with the deeper tailwater flips control
from the inlet to the barrel, which is the whole reason both checks are required.

## 4. Scope and non-goals

The governing (greater) of inlet and outlet control for a circular barrel, delegating to `culvert-inlet-control`
and `culvert-outlet-control`. Box culverts use `box-culvert-inlet-control` and `box-culvert-outlet-control`. Full
or nearly full flow is assumed for the outlet check. The nomographs carry about +/-10%; the engineer of record and
the DOT drainage manual govern.
