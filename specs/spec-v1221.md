# roughlogic.com Specification v1221 -- Spiral (Transition) Curve Layout (calc-civil.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-civil.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1220.md.
>
> **The gap.** A family-completion tile: the horizontal-alignment family has the simple circular curve
> (`horizontal-curve`), its deflection stakeout (`curve-deflection-stakeout`), the vertical curves, and
> `superelevation` -- but not the spiral/transition (clothoid) curve that superelevation is run in over.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive R or Ls, a delta outside (0, 180), or a spiral too long for the
deflection (2 theta_s > delta) returns `{ error }`. Citation discipline (v19/v22): spiral geometry per the AASHTO Green
Book and Ghilani & Wolf, by name, `GOVERNANCE.engineer_of_record`. **No copyrighted table is reproduced** -- the
relations are standard route-surveying geometry and the inputs are the alignment's own values.

## 2. The tile

### 2.1 `spiral-curve` -- Spiral (Transition) Curve Layout

```
theta_s = Ls / (2R)                                spiral angle (rad)
p       = Ls^2 / (24R)                              throw / shift
k       = Ls/2 - Ls^3 / (240 R^2)
Ts      = (R + p) tan(delta/2) + k                  total tangent (PI to TS)
Es      = (R + p) / cos(delta/2) - R                external
SC deflection = theta_s / 3
circular central = delta - 2 theta_s
total length = 2 Ls + R (delta - 2 theta_s)
```

**Inputs:** radius R at the SC (ft), spiral length Ls (ft), total deflection angle delta (deg).

**Outputs:** spiral angle, throw, k, total tangent, external, SC deflection, circular central angle, total length.

## 3. Worked example

`radius_ft = 1000, spiral_length_ft = 250, delta_deg = 20`:

```
theta_s = 250/2000 = 0.125 rad = 7.162 deg
p       = 250^2/24000 = 2.604 ft
k       = 125 - 250^3/(240e6) = 124.935 ft
Ts      = (1002.604) tan(10) + 124.935 = 301.72 ft
Es      = 1002.604/cos(10) - 1000 = 18.07 ft
circular central = 20 - 2(7.162) = 5.676 deg;  total = 599 ft
```

The SC is staked from the TS at a deflection of theta_s/3 = 2.39 deg.

## 4. Limitations

Symmetric equal spirals at both ends and the standard series approximation for the throw and k (valid where Ls is small
relative to R, as for highway spirals; a railroad or very sharp spiral may want the exact clothoid). The spiral length Ls
comes from a superelevation-runoff or comfort criterion (a separate design step). A design aid; AASHTO and the engineer
of record govern.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1221` pins theta_s, throw, k, tangent/external, the circular-arc split, the total length,
  the SC deflection, the longer-spiral trend, and the error seams (including 2 theta_s > delta).
- Two worked-example rows in `test/fixtures/worked-examples.json` (the main geometry and the SC-deflection cross-check).
- Formula checked against the AASHTO Green Book and Ghilani & Wolf route-surveying spiral relations.
