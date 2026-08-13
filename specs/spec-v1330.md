# roughlogic.com Specification v1330 -- Cylindrical Wedge (Ungula) Volume (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop/fabrication/layout), no new module or dependency. Inherits spec.md through spec-v1329.md.
>
> **The gap.** `circular-sector` gives the plane pie-slice area and its own note flags the rest: "a cylindrical-wedge
> volume is separate." This adds that solid -- the ungula -- a right circular cylinder cut by a plane through a
> diameter of the base: a mitered round pipe or duct end cut, the wedge of liquid in a tilted horizontal cylinder,
> a cam, or a bar-stock wedge.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive base diameter or height returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the cylindrical-wedge (ungula) volume `(2/3) R^2 H = D^2 H/6` (standard solid geometry; Machinery's
Handbook), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `cylindrical-wedge-volume` -- Cylindrical Wedge (Ungula) Volume

```
V = (2/3) R^2 H = D^2 H / 6
```

A right circular cylinder of radius `R` (diameter `D`) is sliced by a plane that passes through a **diameter** of the
base and rises to a height `H` at the far side, so the base is a semicircle. Integrating the sloping top
`z = (H/R) y` over that semicircle gives `V = (H/R)(2R^3/3) = (2/3) R^2 H`. The result carries **no pi**: the pi of the
circular base cancels the integral of the linear top. The wedge is exactly `2/(3 pi) = 21.2%` of the full cylinder
`pi R^2 H` that boxes it, for every `D` and `H`.

**Inputs:** base (cylinder) diameter D (ft), wedge height at the far side H (ft).

**Outputs:** wedge volume (ft^3 and gal), semicircular base area, percent of the enclosing cylinder.

## 3. Worked example

A wedge with `D = 4 ft` (`R = 2 ft`) and `H = 3 ft`:

```
V = (2/3)(2^2)(3) = (2/3)(12) = 8.00 ft^3 = 59.8 gal
  = D^2 H/6 = 16 x 3/6 = 8.00 ft^3   (same value, no pi)
fraction = 8.00 / (pi x 2^2 x 3) = 8.00 / 37.70 = 21.2% of the enclosing cylinder
```

Scaling check: the volume is linear in `H` and quadratic in `D`, and the cylinder fraction is the constant
`2/(3 pi) = 21.22%` regardless of size -- a `D = 6 ft`, `H = 2 ft` wedge is `(2/3)(9)(2) = 12.0 ft^3`, still 21.2% of
its `56.55 ft^3` cylinder.

## 4. Scope and non-goals

The through-the-diameter cylindrical wedge (base a semicircle). An off-center chord cut, or a slant that clears the
far wall (a fully slanted cylinder), is separate. A shop and takeoff aid; verify critical dimensions on the work.
