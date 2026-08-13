# roughlogic.com Specification v1319 -- Ellipsoid Volume (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/construction), no new module or dependency. Inherits spec.md through spec-v1318.md.
>
> **The gap.** The catalog has a sphere (`spherical-cap-volume`) but no general **ellipsoid** -- the oblong,
> egg-like solid of an elliptical or oval tank, a stretched dome, an ellipsoidal float or pod, or a rugby-ball
> shape. This adds the ellipsoid volume (and the half-ellipsoid dome/bottom) from its three axis lengths.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive length, width, or height returns `{ error }`; no numeric field is ever `Infinity`. Citation
discipline (v19/v22): the ellipsoid volume `V = (4/3) pi a b c = pi L W H/6` (standard solid geometry; Machinery's
Handbook), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `ellipsoid-volume` -- Ellipsoid Volume (Oblong / Oval Solid)

```
a = L/2, b = W/2, c = H/2               semi-axes
V = (4/3) pi a b c = pi L W H / 6
half-ellipsoid (dome / dished bottom) = V/2
```

`L`, `W`, `H` are the three full axis lengths (long, wide, tall). Because the volume is `pi L W H/6`, it is exactly
half the box `L x W x H` times `pi/3` -- and when the three axes are equal it becomes a sphere, `(4/3) pi r^3`.
A half-ellipsoid is the shape of a 2:1 dished tank head or an oval dome, so the tile reports it too.

**Inputs:** length L, width W, height H (all ft, the three full axes).

**Outputs:** full ellipsoid volume (ft^3 and gallons) and the half-ellipsoid (dome) volume.

## 3. Worked example

An oval tank body 10 ft long, 6 ft wide, 4 ft tall:

```
V = pi x 10 x 6 x 4 / 6 = pi x 40 = 125.66 ft^3 = 940 gal
half-ellipsoid = 62.83 ft^3 (a dished head or dome of the same footprint)
```

The oval tank holds 125.7 ft^3 (940 gallons), and a matching dished head is half that. Make the three axes equal
(8 by 8 by 8) and it is a sphere: 268 ft^3, exactly `(4/3) pi 4^3`.

## 4. Scope and non-goals

The full and half ellipsoid volume; a partial fill to a depth, the surface area (no elementary closed form), and an
offset or truncated ellipsoid are separate. A takeoff aid; verify against the drawing.
