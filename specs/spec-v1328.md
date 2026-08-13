# roughlogic.com Specification v1328 -- Flat-Top (Truncated-Cone) Stockpile Volume and Tonnage (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, construction/earthwork), no new module or dependency. Inherits spec.md through spec-v1327.md.
>
> **The gap.** `stockpile-volume` assumes a pile peaked to a sharp point, but a radial stacker or a bulldozer often
> leaves a **flat top** -- a truncated cone (frustum). This adds the volume and tonnage of that flat-topped pile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive base or density, a top diameter not smaller than the base (or negative), or a repose angle outside
0-90 degrees returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the
truncated-cone (frustum) stockpile geometry with the angle-of-repose relation (first-principles), by name,
`GOVERNANCE.general`.

## 2. The tile

### 2.1 `flat-top-stockpile-volume` -- Flat-Top (Truncated-Cone) Stockpile Volume and Tonnage

```
Rb = base_diameter/2,  Rt = top_diameter/2
height = (Rb - Rt) x tan(repose x pi/180)
volume = (pi height/3)(Rb^2 + Rb Rt + Rt^2)
volume_cy = volume/27,   tons = volume x density/2000
```

The material rests at its angle of repose, so the side slope fixes the height from the ring width `Rb - Rt`. The
volume is the cone frustum. Setting `top_diameter = 0` collapses it to the sharp conical `stockpile-volume` pile.

**Inputs:** base diameter (ft), flat-top diameter (ft), angle of repose (deg, default 37), loose bulk density (pcf,
default 100).

**Outputs:** volume (cy and ft^3), tonnage, and pile height.

## 3. Worked example

An 80 ft-base pile with a 20 ft flat top at a 37-degree repose, 100 pcf:

```
Rb = 40, Rt = 10;  height = (40 - 10) x tan(37) = 22.6 ft
volume = (pi x 22.6/3)(40^2 + 40 x 10 + 10^2) = 23.67 x 2,100 = 49,714 ft^3 = 1,841 cy = 2,486 tons
```

The flat-topped pile holds 1,841 cubic yards (2,486 tons). Drop the top diameter to zero and it is the sharp cone,
the value the `stockpile-volume` tile returns for the same base and repose.

## 4. Scope and non-goals

An idealized flat-topped pile: clean repose side slope, a level base and a level top. A pile peaked to a point is
the `stockpile-volume` tile; an elongated (windrow) pile is `windrow-stockpile-volume`; an irregular base or a
tilted top is separate. A survey volume governs for payment.
