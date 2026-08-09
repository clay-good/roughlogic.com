# roughlogic.com Specification v1276 -- Box Culvert Headwater by Outlet Control (calc-drainage.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-08-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`**
> (Group B, civil drainage), no new module or dependency. Inherits spec.md through spec-v1275.md.
>
> **The gap (the sibling names it).** The `culvert-outlet-control` tile (spec-v1275) computes outlet control for
> a circular barrel and its note says "circular barrels only." The box shape (`box-culvert-inlet-control`,
> spec-v1270) has its inlet-control check but no outlet-control companion, so a box design can find the greater of
> inlet and outlet control only for the circular case. This adds the rectangular outlet-control check.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive span / rise / discharge / length / Manning n, a negative slope or tailwater, or an unknown inlet
configuration returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): FHWA HDS-5
(FHWA-HIF-12-026) Chapter 3 full-flow outlet-control energy equation, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `box-culvert-outlet-control` -- Box Culvert Headwater by Outlet Control (FHWA HDS-5)

Same full-flow energy equation as the circular tile, with box geometry:

```
A = B x D    P = 2(B + D)    R = A/P    V = Q/A                (B = span, D = rise; full barrel)
H = [1 + Ke + (29 n^2 L)/R^(4/3)] V^2/(2g)                     (total head loss)
dc = (Q^2/(g B^2))^(1/3)  (capped at D)                        (rectangular critical depth, closed form)
ho = max( TW, (dc + D)/2 )
HW = H + ho - So L                                             (headwater above the inlet invert)
```

The only differences from the circular tile are the area `A = span x rise`, the full-flow hydraulic radius
`R = A/P` with `P = 2(span + rise)` (not `D/4`), and the closed-form rectangular critical depth. `D` is the box
rise.

**Inputs:** span (in), rise (in), discharge Q (cfs), barrel length L (ft), barrel slope So (ft/ft), Manning n
(default 0.012 concrete), tailwater TW above the outlet invert (ft), and the inlet configuration (sets Ke:
wingwall flares 30-75 deg 0.4, headwall square 0.5, headwall bevels 0.2, wingwall 0 deg 0.7, ...).

**Outputs:** HW (ft above the inlet invert), total head loss H (ft), full-barrel velocity V (fps), velocity head,
the friction multiple, critical depth dc, and the outlet head ho.

## 3. Worked example

6 x 4 ft box (n 0.012), 120 ft long on a 0.5% slope, 30-75 deg wingwall flares (Ke 0.4), passing 150 cfs with a
3 ft tailwater:

```
A = 24 ft2, P = 2(6+4) = 20 ft, R = 1.2 ft, V = 150/24 = 6.25 fps, V^2/2g = 0.607 ft
friction = 29 x 0.012^2 x 120 / 1.2^(4/3) = 0.393
H = (1 + 0.4 + 0.393) x 0.607 = 1.088 ft
dc = (150^2/(32.2 x 6^2))^(1/3) = 2.687 ft, ho = max(3, (2.687 + 4)/2 = 3.344) = 3.344 ft
HW = 1.088 + 3.344 - 0.005 x 120 = 3.831 ft above the inlet invert
```

Cross-check: an 8 x 5 ft box with 45 deg bevels (Ke 0.2) at 300 cfs heads up 4.955 ft; the larger box moves more
water at a lower velocity, so the friction and entrance losses stay small and the outlet head ho (set here by the
larger critical depth) dominates. The design headwater is the greater of this and the box inlet-control value.

## 4. Scope and non-goals

The HDS-5 approximate full-flow outlet-control energy equation for a rectangular box barrel; the box inlet-control
tile (`box-culvert-inlet-control`) gives the other of the two checks, and the design headwater is the greater. Full
or nearly full flow is assumed; a partly full barrel, an interior backwater profile, and arch/pipe-arch shapes are
separate. The nomographs carry about +/-10%; the engineer of record and the DOT drainage manual govern.
