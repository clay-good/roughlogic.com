# roughlogic.com Specification v1258 -- Van der Waals Real-Gas Pressure & Z Factor (calc-lab.js, Group T, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lab.js`** (Group T,
> bench science). No new module, group, or dependency. Inherits spec.md through spec-v1257.md.
>
> **The gap (self-declared).** The `ideal-gas-law` tile's note and citation both say the same thing:
> *"Real gases deviate at high pressure or near condensation (a van der Waals or compressibility Z correction is
> separate)."* This spec builds that separate correction and completes the gas-law pair.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: an
unknown gas, a non-positive mole count or volume, a sub-absolute-zero temperature, or an over-compressed state
(`V <= n*b`, where the molecules' own excluded volume exceeds the container) returns `{ error }`. Citation discipline
(v19/v22): the van der Waals equation of state (van der Waals, 1873) with the per-gas `a`/`b` constants from the
public-domain CRC Handbook of Chemistry & Physics; `GOVERNANCE.lab`. Fully first-principles and scipy-checkable.

## 2. The tile

### 2.1 `van-der-waals` -- Van der Waals Real-Gas Pressure & Z Factor

```
EOS:        (P + a n^2/V^2)(V - n b) = n R T
Pressure:   P_real = n R T / (V - n b) - a n^2 / V^2
Ideal:      P_ideal = n R T / V
Z:          Z = P_real V / (n R T)
Deviation:  (P_real - P_ideal) / P_ideal
R = 0.0820573 L*atm/(mol*K), T in kelvin (Tc + 273.15), a in L^2*atm/mol^2, b in L/mol
```

**Inputs:** gas (helium / hydrogen / nitrogen / oxygen / air / carbon-dioxide / methane / ammonia / water-vapor),
moles, volume (L), temperature (C).

**Outputs:** real pressure (atm), ideal pressure (atm), compressibility Z, percent deviation vs ideal, molar volume (L/mol).

**Constants** (CRC Handbook, `a` in L^2*atm/mol^2, `b` in L/mol): He 0.0346/0.0238, H2 0.2476/0.02661,
N2 1.370/0.0387, O2 1.382/0.03186, air 1.358/0.0364, CO2 3.640/0.04267, CH4 2.283/0.04278, NH3 4.225/0.03707,
H2O 5.536/0.03049.

## 3. Worked example

CO2, 1 mol in 1 L at 0 C:

```
P_real  = (1 x 0.0820573 x 273.15)/(1 - 0.04267) - 3.640/1 = 23.413 - 3.640 = 19.773 atm
P_ideal = 0.0820573 x 273.15 = 22.414 atm
Z       = 19.773 / 22.414 = 0.882   (attraction dominates near condensation, Z < 1)
```

Cross-check, helium same state: Z = 1.023 (a weakly-attracting gas reads harder to compress than ideal, Z > 1).

## 4. Scope and non-goals

Single-phase gas only; near the critical point or in the two-phase region a fuller equation of state and the real
measurement govern. Solved for pressure only (the natural forward direction); the inverse volume solve is a separate
cubic and out of scope. calc-lab.js cap raised 29000 -> 32000 B.
