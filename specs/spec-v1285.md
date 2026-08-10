# roughlogic.com Specification v1285 -- Rolling-Bearing Dynamic Equivalent Load P (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic/machinist), no new module or dependency. Inherits spec.md through spec-v1284.md.
>
> **The gap (a needed input nothing produces).** `bearing-l10-life` (ISO 281) and `bearing-max-load` both take the
> *equivalent dynamic load P* as a given input -- but combining the actual radial load Fr and the thrust load Fa
> into that single P (`P = X Fr + Y Fa`) is the standard ISO 281 step upstream of both, and no tile computes it. A
> bearing carrying thrust runs at a P higher than its radial load, so skipping this step silently under-rates the
> life. This adds the deep-groove ball-bearing equivalent-load calculation that feeds the two life tiles.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive radial load Fr or static rating C0, or a negative thrust Fa, returns `{ error }`; no numeric field is
ever `Infinity`. Citation discipline (v19/v22): the ISO 281 dynamic equivalent load `P = X Fr + Y Fa` with the
standard single-row deep-groove ball-bearing X/Y/e table vs Fa/C0 (ISO 281; SKF General Catalogue; Shigley), by
name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `bearing-equivalent-load` -- Rolling-Bearing Dynamic Equivalent Load P (ISO 281)

```
r = Fa / C0                                    thrust vs static rating
interpolate e and Y from the ISO 281 single-row deep-groove ball table on r:
  Fa/C0:  0.025  0.04  0.07  0.13  0.25  0.50
  e:      0.22   0.24  0.27  0.31  0.37  0.44
  Y:      2.0    1.8   1.6   1.4   1.2   1.0        (X = 0.56 above e)
if Fa/Fr <= e:   P = Fr                         (X = 1, Y = 0; radial governs)
else:            P = 0.56 Fr + Y Fa
```

The e-ratio is the thrust-to-radial ratio at which the bearing starts to carry the thrust as extra equivalent load.
Below it the pure radial load governs; above it the 0.56/Y combination applies. With `Fa = 0` the result is exactly
`P = Fr`. Feed the result into `bearing-l10-life` or `bearing-max-load`.

**Inputs:** radial load Fr (lbf), thrust (axial) load Fa (lbf), basic static load rating C0 (lbf).

**Outputs:** equivalent dynamic load P (lbf), the e-ratio and X / Y factors used, and whether the thrust governs.

## 3. Worked example

Deep-groove ball bearing, Fr 1,000 lbf, Fa 500 lbf, C0 5,000 lbf:

```
Fa/C0 = 0.10  ->  interpolate e = 0.29, Y = 1.5
Fa/Fr = 0.50 > e  ->  P = 0.56 x 1,000 + 1.5 x 500 = 1,310 lbf
```

Cross-check: drop the thrust (Fa 0) and P = Fr = 1,000 lbf exactly -- the same P the `bearing-l10-life` example
feeds in for its 1,190 hr result, so the two tiles chain cleanly. The 500 lbf of thrust raises P by 31%, which by
the cube law cuts the L10 life to roughly (1000/1310)^3 = 44% of the pure-radial life.

## 4. Scope and non-goals

Single-row radial deep-groove ball bearings (the most common case and the one whose X/Y/e table is standard);
angular-contact, tapered-, and spherical-roller bearings use the bearing-specific factors from the maker's
catalogue and are separate. Rotating inner ring assumed (rotation factor V = 1). Feed P into `bearing-l10-life`.
A planning estimate; ISO 281 and the bearing maker's catalogue govern.
