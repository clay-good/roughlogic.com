# roughlogic.com Specification v1275 -- Culvert Headwater by Outlet Control (calc-drainage.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-08-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`**
> (Group B, civil drainage), no new module or dependency. Inherits spec.md through spec-v1274.md.
>
> **The gap (both siblings name it).** The `culvert-inlet-control` (spec-v1269) and `box-culvert-inlet-control`
> (spec-v1270) tiles each end with the same disclaimer: "outlet control (barrel friction, tailwater, length)
> is a separate calculation ... the actual headwater is the GREATER of inlet and outlet control." Neither tile
> computes it, so the catalog can find the inlet-control headwater but never the outlet-control one it must be
> compared against. This adds the second of the two required checks.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive diameter / discharge / length / Manning n, a negative slope or tailwater, or an unknown inlet
configuration returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): FHWA HDS-5
(FHWA-HIF-12-026) Appendix A full-flow outlet-control energy equation, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `culvert-outlet-control` -- Culvert Headwater by Outlet Control (FHWA HDS-5)

For a circular barrel flowing full, the head lost between the pond and the outlet is the sum of the entrance,
friction, and exit (velocity) losses, and the headwater is set by where that stack of losses lands the outlet
water surface:

```
A = pi D^2/4    R = D/4    V = Q/A                        (full barrel)
H = [1 + Ke + (29 n^2 L)/R^(4/3)] V^2/(2g)                (total head loss, HDS-5 English units)
ho = max( TW, (dc + D)/2 )                                (outlet water-surface head)
HW = H + ho - So L                                        (headwater above the inlet invert)
```

The `1` is the exit loss, `Ke` the entrance loss (HDS-5 table value for the inlet type), and the `29 n^2 L / R^(4/3)`
term is the full-flow Manning friction loss expressed as a multiple of the velocity head (29 = 2g / 1.486^2). The
critical depth `dc` is found from `g A_c^3 = Q^2 T_c` on the same circular-segment geometry the inlet-control tile
uses (capped at D). `So L` is the fall of the barrel invert over its length.

**Inputs:** diameter (in), discharge Q (cfs), barrel length L (ft), barrel slope So (ft/ft), Manning n
(default 0.012 concrete; ~0.024 CMP), tailwater depth TW above the outlet invert (ft), and the inlet
configuration (sets Ke: groove/projecting 0.2, square headwall 0.5, CMP mitered 0.7, CMP projecting 0.9, ...).

**Outputs:** HW (ft above the inlet invert), total head loss H (ft), full-barrel velocity V (fps), velocity head,
the friction multiple, critical depth dc, and the outlet head ho.

## 3. Worked example

36 in concrete pipe (n 0.012), 100 ft long on a 1% slope, square-edge headwall (Ke 0.5), passing 50 cfs with a
2 ft tailwater:

```
A = pi 3^2/4 = 7.069 ft2, V = 50/7.069 = 7.074 fps, V^2/2g = 0.777 ft
friction = 29 x 0.012^2 x 100 / 0.75^(4/3) = 0.613
H = (1 + 0.5 + 0.613) x 0.777 = 1.642 ft
dc = 2.301 ft, ho = max(2, (2.301 + 3)/2 = 2.651) = 2.651 ft
HW = 1.642 + 2.651 - 0.01 x 100 = 3.292 ft above the inlet invert
```

Cross-check: the same barrel as corrugated metal (n 0.024, CMP projecting Ke 0.9) quadruples the friction term to
2.451 and raises the headwater to 5.031 ft -- the rougher barrel and higher entrance loss both push outlet control.
A designer compares this 3.29 ft against the inlet-control headwater for the same barrel; the larger of the two
governs, and if HW comes out below the barrel crown the full-flow assumption is only approximate.

## 4. Scope and non-goals

The HDS-5 approximate full-flow outlet-control energy equation for a circular barrel; the companion inlet-control
tiles (`culvert-inlet-control`, `box-culvert-inlet-control`) give the other of the two checks, and the design
headwater is the greater. Full or nearly full flow is assumed (the standard hand-method form); a partly full barrel,
a hydraulic-jump backwater profile inside the barrel, and box/arch shapes are separate. The nomographs carry about
+/-10%; the engineer of record and the DOT drainage manual govern.
