# roughlogic.com Specification v1267 -- Differential-Pressure Flow Meter (calc-velocity.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-velocity.js`**
> (Group C), no new module or dependency. Inherits spec.md through spec-v1266.md.
>
> **The gap.** The `dp-flow-signal-scaling` tile linearizes a DP flow transmitter's 4-20 mA loop but explicitly
> leaves the primary element's discharge coefficient and beta ratio "baked into the transmitter's calibrated
> range" -- it never computes the physical flow. No orifice/venturi metering equation exists anywhere in the
> catalog (existing "orifice" tiles are gas-leak equivalent-diameter and septic effluent; pitot is velocity-head).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a bore >= pipe ID, a non-positive diameter/dP/density, or a Cd outside (0, 1.2] returns `{ error }`. Citation
discipline (v19/v22): the Bernoulli DP-flow primary-element equation (ISO 5167 defines the precise Cd; the equation
is public physics), `GOVERNANCE.general`. Verified by SI cross-computation.

## 2. The tile

### 2.1 `dp-flow-meter` -- Differential-Pressure Flow Meter (Orifice / Venturi)

```
Q = Cd A2 sqrt( 2 dP / (rho (1 - beta^4)) )      (incompressible liquid)
A2 = pi/4 d^2 (throat area);  beta = d/D (bore / pipe-ID ratio)
Cd ~ 0.61 square-edge orifice, 0.98 venturi, 0.97 flow nozzle (editable)
```

**Inputs:** pipe inside diameter (in), bore/throat diameter (in), differential pressure (psi), discharge coefficient
Cd, fluid density (lb/ft^3, water 62.4).

**Outputs:** flow (gpm), throat and pipe velocity (ft/s), beta ratio.

## 3. Worked example

2 in bore in a 4 in water line at 1 psi, Cd 0.61:

```
d = 0.0508 m, A2 = 0.0020268 m^2;  dP = 6894.76 Pa;  rho = 999.6 kg/m^3
beta = 0.5, 1 - beta^4 = 0.9375
Q = 0.61 x 0.0020268 x sqrt(2 x 6894.76 / (999.6 x 0.9375)) = 0.004744 m^3/s = 75.2 gpm
```

The same element as a venturi (Cd 0.98) flows 121 gpm -- flow is linear in Cd and tracks the square root of dP.

## 4. Scope and non-goals

Incompressible liquid only; a compressible gas needs a separate expansion factor Y (out of scope). Cd is a typical
editable value -- a precise Cd is a function of beta and Reynolds number from ISO 5167 or the meter's calibration.
A field/sizing estimate; the calibrated meter governs. calc-velocity.js cap raised 6000 -> 8500 B.
