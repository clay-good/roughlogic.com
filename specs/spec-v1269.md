# roughlogic.com Specification v1269 -- Culvert Headwater by Inlet Control (calc-drainage.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`**
> (Group B, storm drainage / civil), no new module or dependency. Inherits spec.md through spec-v1268.md.
>
> **The gap.** The catalog has Manning gravity-flow, TR-55 hydrology, and orifice-outlet tiles, but **zero culvert
> coverage** (`grep culvert` = 0 across all modules). The first question a culvert design asks -- how high does
> the water pond at the entrance? -- had no home. This adds the inlet-control headwater, the standard FHWA HDS-5
> screen and the one that usually governs for a short, steep, or smooth-barrel culvert.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (calc-drainage.js is graduated to fail-on-missing), bounds-fuzzer, worked-example
registry, and reviewer-signoff apply. The v18/v21 contract: a non-positive diameter, a non-positive discharge, a
negative slope, or an unknown configuration returns `{ error }`; non-finite inputs are caught by the shared
`_finiteGuard`. Citation discipline (v19/v22): FHWA HDS-5 (FHWA-HIF-12-026), a public-domain US DOT reference,
`GOVERNANCE.general`.

## 2. The tile

### 2.1 `culvert-inlet-control` -- Culvert Headwater by Inlet Control (HDS-5), circular barrel

```
Unsubmerged (Form 1, Eq A.1):   HW/D = Hc/D + K [Q/(A sqrt D)]^M + Ks S
Submerged (Eq A.3):             HW/D = c [Q/(A sqrt D)]^2 + Y + Ks S
Ks = -0.5 (mitered inlets +0.7);  Ku = 1.0 (US customary)
Barrel: A = pi D^2/4;  critical depth from g A_c^3 = Q^2 T_c;  Hc = dc + Vc^2/2g
HW = (HW/D) D
```

Regime by flow factor Q/(A sqrt D): unsubmerged below 3.5, submerged above 4.0, a linear blend between.

**Inputs:** diameter (in), design discharge Q (cfs), barrel slope S (ft/ft), shape and inlet edge (6 circular
configurations -- concrete pipe square/groove-headwall/groove-projecting, CMP headwall/mitered/projecting).

**Outputs:** headwater HW (ft above the inlet invert), HW/D, flow regime + flow factor, critical depth dc and
specific head Hc.

**Constants:** HDS-5 Table A.1 (K, M, c, Y) for each circular row, transcribed from FHWA-HIF-12-026:

| Config | Form | K | M | c | Y |
|---|---|---|---|---|---|
| Concrete, square edge w/headwall | 1 | 0.0098 | 2.0 | 0.0398 | 0.67 |
| Concrete, groove end w/headwall | 1 | 0.0018 | 2.0 | 0.0292 | 0.74 |
| Concrete, groove end projecting | 1 | 0.0045 | 2.0 | 0.0317 | 0.69 |
| CMP, headwall | 1 | 0.0078 | 2.0 | 0.0379 | 0.69 |
| CMP, mitered to slope | 1 | 0.0210 | 1.33 | 0.0463 | 0.75 |
| CMP, projecting | 1 | 0.0340 | 1.50 | 0.0553 | 0.54 |

## 3. Worked examples

36 in concrete pipe, square edge with headwall, 30 cfs, 1% slope:

```
D = 3 ft, A = 7.0686 ft^2, flow factor = 30/(7.0686 x 1.7321) = 2.450  (< 3.5, unsubmerged)
critical depth (g A^3 = Q^2 T): dc = 1.774 ft, Hc = 2.512 ft, Hc/D = 0.8373
HW/D = 0.8373 + 0.0098 x 2.450^2 - 0.5 x 0.01 = 0.891, HW = 2.67 ft
```

Cross-check -- the same barrel as CMP projecting at 60 cfs (flow factor 4.90, submerged): HW/D = 0.0553 x 4.90^2 +
0.54 - 0.005 = 1.863, HW = 5.59 ft. Doubling the flow pushes the same pipe from weir to orifice control, and the
projecting CMP heads up more than the grooved concrete pipe.

**Validation.** The equation assembly (Form 1, submerged, and the Ks S slope term) reproduces the HDS-5 Appendix A
printed worked values exactly; the circular critical-depth solve returns Froude = 1.000000 at its root by
definition; the geometry matches the closed-form half-full circle area and top width. HW rises monotonically with
Q with no dip across the transition.

## 4. Scope and non-goals

Inlet control ONLY, circular barrels ONLY. The actual design headwater is the GREATER of inlet and outlet control;
outlet control (barrel friction, length, tailwater) is a separate calculation. Box, arch, and pipe-arch shapes
(HDS-5 Tables A.1-A.6) and tapered inlets are follow-ons. The HDS-5 nomographs themselves carry about +/-10%; a design aid, not a substitute for the engineer of record and the DOT drainage manual.
