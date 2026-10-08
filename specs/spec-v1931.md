# roughlogic.com Specification v1931 -- Wood Bending Plus Axial Tension (NDS 3.9.1) (`calc-construction.js`, Group E, 1 New Tile)

> **Status: LANDED 2026-10-08. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group E, the
> NDS wood bench in `calc-construction.js`, no new dependency and no network call.
>
> **The gap.** `wood-combined-bending-axial` covers compression plus bending (3.9.2) and its note said
> "tension-plus-bending (3.9.1) are separate". No tile checked a truss bottom chord carrying a ceiling.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive tension,
area, section modulus, Ft', or Fb*, or a negative moment, returns `{ error }`. Citation: NDS 2018 3.9.1 by name,
GOVERNANCE.general. Aliases: `bending and axial tension wood`, `nds 3.9.1`, `truss bottom chord bending`,
`tension plus bending lumber`, `bottom chord ceiling load check`.

## 2. The tile

### 2.1 `wood-tension-bending` -- Wood Bending Plus Axial Tension (NDS 3.9.1)

| Quantity | Relation |
|---|---|
| Stresses | ft = T/A (net area at holes); fb = M/S |
| Tension face | ft/Ft' + fb/Fb* <= 1.0, Fb* = Fb' without CL (Eq. 3.9-1) |
| Compression face | (fb - ft)/Fb** <= 1.0, Fb** = Fb' without CV; blank = Fb* (Eq. 3.9-2) |

## 3. Worked example (registry row)

Missouri S&T CE 5260 Problem 7-5, D+S case: 2x6 No. 1 DF-L bottom chord, T 5,640 lb, M 3,000 in-lb, Ft' 1,009 psi,
Fb' 1,495 psi. Printed 0.943 and -0.192; the tile gives 0.9429 and -0.1920.
