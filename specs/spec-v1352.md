# roughlogic.com Specification v1352 -- Freezing Time by Plank's Equation (calc-kitchen.js, Group O, kitchen and food service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group O has a cooling curve for the FDA two-stage cool-down and a sous-vide pasteurization tile, but nothing that answers how long a product takes to freeze. Freezing time is what sizes a blast freezer, sets a production schedule, and decides whether a walk-in freezer can be used as one. It is a conduction problem with a well-known closed form and no tile computes it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive thickness, density, latent heat, surface coefficient, or conductivity, or a freezing point at or below the ambient temperature, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): Plank's freezing-time equation with the standard slab / cylinder / sphere shape constants (classical food-engineering result; ASHRAE Refrigeration Handbook), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `freezing-time-plank` -- Freezing Time by Plank's Equation

```
t = (rho x Lf / (Tf - Ta)) x (P a / h + R a^2 / k)

shape       P      R
slab       1/2    1/8
cylinder   1/4    1/16
sphere     1/6    1/24
```

Plank's equation splits freezing time into the two resistances that actually control it. The `P a / h` term is the
surface resistance -- how hard it is to get heat off the product, which is airflow. The `R a^2 / k` term is the
internal resistance -- how hard it is to get heat out of the middle, which is thickness, and it enters *squared*.
Halving the thickness cuts the internal term by four. Doubling the air velocity only helps the surface term, and
on a thick product the surface term is the smaller half to begin with. That is the whole design lesson of a blast
freezer, and it falls straight out of the two terms.

`Lf` is the latent heat of the product's water, not of pure water: 143.4 BTU/lb times the moisture fraction.
`Tf` is the initial freezing point, which for meat and most produce is a few degrees below 32 F because of
dissolved solids.

**Inputs:** characteristic dimension a (ft -- slab thickness, cylinder or sphere diameter), shape, product density
(lb/ft3), latent heat of the product (BTU/lb), initial freezing point (F), freezing-medium temperature (F),
surface heat-transfer coefficient h (BTU/hr-ft2-F), frozen thermal conductivity k (BTU/hr-ft-F).

**Outputs:** freezing time (hr), and the surface and internal resistance terms separately so the reader can see
which one controls.

## 3. Worked example

A 3 in (0.25 ft) beef slab, 74% moisture so `Lf = 106 BTU/lb`, `rho = 65 lb/ft3`, freezing point 28 F, blast
freezer at -10 F, air-blast `h = 3.0`, frozen `k = 0.9`:

```
driving term = 65 x 106 / (28 - (-10)) = 6,890 / 38 = 181.3
surface      = 0.5 x 0.25 / 3.0        = 0.04167
internal     = 0.125 x 0.25^2 / 0.9    = 0.00868
t            = 181.3 x (0.04167 + 0.00868) = 9.13 hr
```

The surface term is roughly five times the internal term here, so this product is airflow-limited: raising `h`
from 3.0 to 6.0 (a real blast freezer instead of a still one) cuts the time to 5.35 hr, and shaving the slab to
2 in gets to 5.74 hr -- the two levers are worth about the same on a 3 in slab. Double the slab to 6 in and the
time goes to 21.4 hr, more than double, because the internal term grew fourfold while the surface term only
doubled. That is the crossover: past about 4 in, thickness is the lever.

## 4. Scope and non-goals

Plank's equation assumes the product enters *at* its freezing point and computes only the latent-heat removal. It
does not include the sensible heat of cooling a warm product down to freezing, or of subcooling the frozen product
to storage temperature; both must be added separately, and a product entering warm takes meaningfully longer. It
assumes constant properties, a single freezing point rather than a range, and a uniform surface coefficient. It is
a first-order sizing figure, widely understood to be optimistic; ASHRAE and the equipment manufacturer govern.
