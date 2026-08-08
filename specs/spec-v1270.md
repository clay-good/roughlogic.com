# roughlogic.com Specification v1270 -- Box Culvert Headwater by Inlet Control (calc-drainage.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`**
> (Group B, storm drainage / civil), no new module or dependency. Inherits spec.md through spec-v1269.md.
>
> **The gap.** spec-v1269 added `culvert-inlet-control` for a **circular** barrel and named the box as a follow-on.
> The concrete box is the other dominant culvert shape; this adds it, completing the two common cross-sections.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (calc-drainage.js graduated to fail-on-missing), bounds-fuzzer, worked-example registry,
and reviewer-signoff apply. The v18/v21 contract: a non-positive span, a non-positive rise, a non-positive
discharge, a negative slope, or an unknown configuration returns `{ error }`; non-finite inputs are caught by
`_finiteGuard`. Citation discipline (v19/v22): FHWA HDS-5 (FHWA-HIF-12-026), a public-domain US DOT reference,
`GOVERNANCE.general`.

## 2. The tile

### 2.1 `box-culvert-inlet-control` -- Box Culvert Headwater by Inlet Control (HDS-5)

```
Unsubmerged Form 1 (wingwall flares, Eq A.1): HW/D = Hc/D + K [Q/(A sqrt D)]^M + Ks S
Unsubmerged Form 2 (headwalls, Eq A.2):       HW/D = K [Q/(A sqrt D)]^M + Ks S
Submerged (Eq A.3):                           HW/D = c [Q/(A sqrt D)]^2 + Y + Ks S
Ks = -0.5;  Ku = 1.0 (US);  D = box RISE (interior height);  A = span x rise
Rectangular critical depth: dc = (Q^2/(g B^2))^(1/3),  Hc = 1.5 dc   (closed form, no iteration)
HW = (HW/D) D
```

Regime by flow factor Q/(A sqrt D): unsubmerged below 3.5, submerged above 4.0, a linear blend between.

**Inputs:** span/width B (in), rise/height D (in), discharge Q (cfs), barrel slope S (ft/ft), inlet edge (6
configs -- three Chart 8 wingwall flares [Form 1], three Chart 10 headwall chamfer/bevel treatments [Form 2]).

**Outputs:** headwater HW (ft above the inlet invert), HW/D, flow regime + form + flow factor, critical depth dc
and specific head Hc (Form 1 only).

**Constants:** HDS-5 Table A.1 concrete-box rows (FHWA-HIF-12-026):

| Config | Chart | Form | K | M | c | Y |
|---|---|---|---|---|---|---|
| Wingwall flares 30-75 deg | 8 | 1 | 0.026 | 1.0 | 0.0347 | 0.81 |
| Wingwall flares 90 and 15 deg | 8 | 1 | 0.061 | 0.75 | 0.0400 | 0.80 |
| Wingwall flares 0 deg | 8 | 1 | 0.061 | 0.75 | 0.0423 | 0.82 |
| 90 deg headwall, 3/4 in chamfers | 10 | 2 | 0.515 | 0.667 | 0.0375 | 0.79 |
| 90 deg headwall, 45 deg bevels | 10 | 2 | 0.495 | 0.667 | 0.0314 | 0.82 |
| 90 deg headwall, 33.7 deg bevels | 10 | 2 | 0.486 | 0.667 | 0.0252 | 0.865 |

## 3. Worked examples

6 x 4 ft box, 30-75 deg wingwall flares (Form 1), 150 cfs, 1% slope:

```
B = 6 ft, D = 4 ft, A = 24 ft^2, flow factor = 150/(24 x 2) = 3.125  (< 3.5, unsubmerged)
dc = (150^2/(32.2 x 36))^(1/3) = 2.6875 ft, Hc = 1.5 dc = 4.0312 ft, Hc/D = 1.0078
HW/D = 1.0078 + 0.026 x 3.125^1.0 - 0.005 = 1.0840, HW = 4.34 ft
```

Cross-check -- 8 x 5 ft box, 90 deg headwall with 45 deg bevels (Form 2, no critical depth), 300 cfs, 0.5% slope:
flow factor 3.354, HW/D = 0.495 x 3.354^0.667 - 0.0025 = 1.107, HW = 5.54 ft. The Form 2 headwall needs no
critical-depth calc, and the bevels (a lower K than a plain square headwall) hold the headwater down.

**Validation.** The equation forms and the Ks S slope term are identical to the circular tile (verified there
against HDS-5's printed Appendix A worked values); the box adds the rectangular closed-form critical depth
Hc = 1.5 dc, which the bounds test pins directly. HW rises monotonically with Q with no dip across the transition.

## 4. Scope and non-goals

Inlet control ONLY, rectangular boxes ONLY. The actual design headwater is the GREATER of inlet and outlet
control; outlet control is a separate calculation. Arch, pipe-arch, and embedded shapes (HDS-5 Tables A.2-A.6),
skewed and tapered inlets, and the South Dakota RCB set (Table A.3) are follow-ons. The HDS-5 nomographs carry
about +/-10%; a design aid, not a substitute for the engineer of record and the DOT drainage manual.
