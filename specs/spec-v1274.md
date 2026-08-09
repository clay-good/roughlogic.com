# roughlogic.com Specification v1274 -- Gas (Compressible) Differential-Pressure Flow Meter (calc-velocity.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-08-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-velocity.js`**
> (Group C, air/velocity), no new module or dependency. Inherits spec.md through spec-v1273.md.
>
> **The gap (sibling names it).** The `dp-flow-meter` tile does the incompressible LIQUID case and its own note
> says "a compressible gas needs a separate expansion factor Y." This adds the gas case.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a bore >= pipe ID, a dP >= the upstream absolute pressure, a kappa <= 1, or a non-positive size / pressure / SG
returns `{ error }`. Citation discipline (v19/v22): ISO 5167-2, by name, `GOVERNANCE.general`. Computed in US units.

## 2. The tile

### 2.1 `gas-dp-flow-meter` -- Gas (Compressible) Differential-Pressure Flow Meter

```
beta = d/D;  p2 = p1 - dP;  tau = p2/p1
eps = 1 - (0.351 + 0.256 beta^4 + 0.93 beta^8)(1 - tau^(1/kappa))      (ISO 5167-2 expansibility)
rho1 = p1 MW / (R T)      MW = 28.9647 SG,  R = 10.7316 psia ft^3/(lbmol R),  T in R
qm = (Cd / sqrt(1 - beta^4)) eps (pi/4) d^2 sqrt(2 gc dP rho1)          gc = 32.174, dP in psf
scfm = qm / rho_std * 60      rho_std at 14.696 psia, 60 F
```

**Inputs:** pipe ID (in), bore (in), upstream static pressure (psia, absolute), differential (psi), upstream
temperature (F), gas specific gravity (vs air), isentropic exponent kappa, discharge coefficient Cd (default 0.61).

**Outputs:** expansion factor eps, standard flow (scfm), mass flow (lb/min) and actual flow (acfm), beta and
pressure ratio (flagged when p2/p1 < 0.75).

## 3. Worked example

Air (SG 1.0, kappa 1.4), 2 in orifice in a 4 in line, 100 psia, 60 F, 1 psi dP, Cd 0.61:

```
beta = 0.5;  tau = 0.99
eps = 1 - (0.351 + 0.256(0.0625) + 0.93(0.003906))(1 - 0.99^(1/1.4)) = 0.99735
rho1 = 100 x 28.9647 / (10.7316 x 519.67) = 0.5194 lb/ft^3
qm = (0.61/sqrt(0.9375)) x 0.99735 x (pi/4)(2/12)^2 x sqrt(2 x 32.174 x 144 x 0.5194) = 0.9510 lb/s
mass = 57.06 lb/min;  scfm = 747.6;  acfm = 109.9
```

Cross-check: raising the dP to 10 psi (p2/p1 0.90) drops eps to 0.9731 -- the expansion correction grows as the
pressure ratio falls; a heavier or colder gas is denser and passes more mass at the same dP.

## 4. Scope and non-goals

The orifice-plate expansibility form, valid for p2/p1 >= 0.75 (the tile flags below that, where flow may approach
choking). The venturi/nozzle expansion factor is a different closed form, and a precise Cd (a function of beta and
Reynolds number) comes from ISO 5167 or the meter's calibration. Distinct from the incompressible `dp-flow-meter`.
A field / sizing estimate; the calibrated meter governs.
