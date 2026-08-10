# roughlogic.com Specification v1301 -- Plain Bearing Pressure and PV (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group K, machinist/mechanic), no new module or dependency. Inherits spec.md through spec-v1300.md.
>
> **The gap.** The catalog sizes ROLLING bearings by rating life (`bearing-l10-life`, `bearing-max-load`,
> `bearing-equivalent-load`) but has nothing for a **plain (sleeve/journal) bearing or bronze bushing**, which is
> sized on a completely different basis: the projected bearing pressure and the **PV factor** (pressure x surface
> speed), the product that governs frictional heat and wear. This adds the plain-bearing sizing check.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive load / diameter / length / speed returns `{ error }`; no numeric field is ever `Infinity`. Citation
discipline (v19/v22): the plain-bearing projected pressure `P = W/(L D)`, surface velocity `V = pi D N/12`, and the
PV factor (Machinery's Handbook; bearing-material PV limits), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `plain-bearing-pressure-pv` -- Plain (Sleeve) Bearing Pressure and PV

```
P = W / (L D)                projected bearing pressure (psi); L bearing length, D journal diameter
V = pi D N / 12              journal surface speed (ft/min)
PV = P V                     pressure-velocity factor (psi-ft/min)
```

`W` is the radial load, `D` the journal (shaft) diameter, `L` the bearing length, and `N` the speed. The projected
pressure uses the projected area `L x D`, not the wrapped area. The PV factor is the real limit: it must stay under
the bearing material's rated PV -- roughly 50,000 psi-ft/min for oil-impregnated sintered bronze, higher for
pressure-lubricated bronze and much lower for dry plastics -- because PV sets the heat generated per unit area.

**Inputs:** radial load W (lbf), journal diameter D (in), bearing length L (in), shaft speed (rpm).

**Outputs:** projected pressure (psi), surface velocity (ft/min), and the PV factor (psi-ft/min), with the
common material PV guideposts noted.

## 3. Worked example

An 800 lbf radial load on a 1.0 in journal in a 1.5 in-long bronze bushing at 300 rpm:

```
P  = 800 / (1.5 x 1.0) = 533 psi
V  = pi x 1.0 x 300 / 12 = 78.5 ft/min
PV = 533 x 78.5 = 41,900 psi-ft/min
```

The PV of 41,900 sits just under the ~50,000 limit for oil-impregnated bronze, so the bushing is workable but has
little margin -- lengthen it or slow it down for a longer life. Double the speed to 600 rpm and the PV blows past
83,000, out of range for that material.

## 4. Scope and non-goals

The static projected pressure and the PV screen for a plain journal bearing; the hydrodynamic film (Sommerfeld
number), the actual temperature rise, minimum film thickness, and the material's specific PV and pressure limits are
separate and are the bushing maker's. Rolling bearings use rating life (`bearing-l10-life`). A design aid;
Machinery's Handbook and the bearing maker govern.
