# roughlogic.com Specification v1268 -- Radiant Heat Exchange (calc-cross.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group G, cross-trade), no new module or dependency. Inherits spec.md through spec-v1267.md.
>
> **The gap.** The Stefan-Boltzmann law is embedded inside the insulation and ampacity thermal models but exists
> nowhere as a standalone tool. A general two-surface radiant-exchange calc (radiant-panel sizing, hot-surface
> heat loss, freeze protection) has no home.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive area, an emissivity or view factor outside (0, 1], or a sub-absolute-zero temperature returns
`{ error }`. Citation discipline (v19/v22): the Stefan-Boltzmann law (sigma from NIST/CODATA), first-principles
physics, `GOVERNANCE.general`. SI cross-checked.

## 2. The tile

### 2.1 `radiant-heat-exchange` -- Radiant Heat Exchange (Stefan-Boltzmann)

```
q = eps F sigma A (T_s^4 - T_surr^4)
sigma = 0.1714e-8 BTU/(hr ft^2 R^4);  T in absolute Rankine (F + 459.67)
q in BTU/hr;  W = BTU/hr / 3.412142;  positive = net loss from the surface
```

**Inputs:** surface area (ft^2), emissivity (0-1), surface temperature (F), surroundings/facing-surface
temperature (F), view factor (0-1, default 1).

**Outputs:** net radiant heat (BTU/hr and W), the two absolute temperatures (R), direction (loss / gain).

## 3. Worked example

10 ft^2, eps 0.9, 200 F surface, 70 F room, F = 1:

```
T_s = 659.67 R, T_surr = 529.67 R
q = 0.9 x 1 x 0.1714e-8 x 10 x (659.67^4 - 529.67^4) = 1,707 BTU/hr = 500 W  (net loss)
```

SI cross-check (sigma = 5.6704e-8 W/m^2 K^4): 499.8 W = 1,705 BTU/hr, agreeing within the constant's rounding. A
shiny eps 0.05 surface sheds only 95 BTU/hr; a 40 F surface in the same 70 F room GAINS heat (negative q).

## 4. Scope and non-goals

Radiation only -- the total surface heat transfer adds convection and conduction. This is the NET exchange between
two temperatures, not an absolute emission. A precise emissivity and view factor (for two partly-facing surfaces)
come from radiation-heat-transfer references; F = 1 is the small-object-in-a-large-room case. A first-principles
estimate; the real emissivity, geometry, and full heat balance govern.
