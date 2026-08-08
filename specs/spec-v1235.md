# roughlogic.com Specification v1235 -- Clausius-Clapeyron (calc-lab.js, Group T, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lab.js`** (Group T),
> no new module, group, or dependency. Inherits spec.md through spec-v1234.md.
>
> **The gap.** Family-completion: the lab phys-chem set (`ideal-gas-law`, `arrhenius-equation`, `nernst-equation`) has
> no phase-equilibrium member relating vapor pressure to temperature.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive pressure, or equal temperatures returns `{ error }`. Citation
discipline (v19/v22): the Clausius-Clapeyron equation, by name, `GOVERNANCE.lab`. **No copyrighted table is
reproduced** -- first-principles thermodynamics; the vapor pressures and temperatures are the user's own measurements.

## 2. The tile

### 2.1 `clausius-clapeyron` -- Clausius-Clapeyron (Enthalpy of Vaporization)

```
ln(P2/P1) = -(dHvap/R)(1/T2 - 1/T1)
dHvap = R ln(P2/P1) / (1/T1 - 1/T2)        R = 8.314 J/(mol*K), T in kelvin
slope of ln(P) vs 1/T = -dHvap/R
```

Only the pressure RATIO enters, so P1 and P2 may be in any consistent unit.

**Inputs:** vapor pressure P1, temperature 1 (C), vapor pressure P2, temperature 2 (C).

**Outputs:** the molar enthalpy of vaporization (kJ/mol and J/mol) and the ln(P) vs 1/T slope.

## 3. Worked example

`P1 = 760 mmHg at 100 C, P2 = 525.9 mmHg at 90 C` (water):

```
dHvap = 8.314 x ln(525.9/760) / (1/373.15 - 1/363.15) = 41,483 J/mol = 41.48 kJ/mol
```

close to the tabulated 40.7 kJ/mol. Cross-check: the identical ratio in kPa (101.325 -> 70.11) returns the same
41.49 kJ/mol, confirming the unit-agnostic ratio form.

## 4. Scope and non-goals

Assumes dHvap constant over the interval and an ideal vapor with negligible liquid volume (a curved ln(P) vs 1/T plot
signals variation). To predict a vapor pressure at a third temperature or a boiling point at a new pressure, apply the
same equation with the enthalpy found here. calc-lab.js module-size cap raised 26000 -> 29000 B.
