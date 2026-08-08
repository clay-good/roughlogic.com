# roughlogic.com Specification v1230 -- Nernst Equation (calc-lab.js, Group T, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lab.js`** (Group T),
> no new module, group, or dependency. Inherits spec.md through spec-v1229.md.
>
> **The gap.** Family-completion: the lab chemistry set (`ideal-gas-law`, `arrhenius-equation`, `molarity-dilution`,
> `henderson-hasselbalch`) has no electrochemistry member relating a cell potential to concentration.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive electron count n, a non-positive reaction quotient Q, or a
temperature at/below absolute zero returns `{ error }`. Citation discipline (v19/v22): the Nernst equation
(Nernst, 1889), by name, `GOVERNANCE.lab`. **No copyrighted table is reproduced** -- first-principles electrochemistry;
the standard potential, electron count, and reaction quotient are the user's own inputs.

## 2. The tile

### 2.1 `nernst-equation` -- Nernst Equation (Cell Potential vs Concentration)

```
E = E0 - (RT/nF) ln Q            R = 8.314 J/(mol*K), F = 96485 C/mol, T in kelvin
slope = RT ln(10) / (nF)         Nernst slope per decade of Q (0.05916/n V at 25 C)
```

**Inputs:** standard potential E0 (V), electrons transferred n, reaction quotient Q, temperature (C, default 25).

**Outputs:** cell/electrode potential E (V) and the Nernst slope (mV per decade of Q).

## 3. Worked example

`E0 = 1.10 V, n = 2, Q = 0.01, 25 C` (a Daniell cell away from standard conditions):

```
E     = 1.10 - (8.314 x 298.15 / (2 x 96485)) x ln(0.01) = 1.10 + 0.05917 = 1.1592 V
slope = 8.314 x 298.15 x ln(10) / (2 x 96485) = 0.02958 V = 29.58 mV/decade
```

Cross-check: at Q = 1 the potential equals E0 exactly (ln 1 = 0); a one-electron electrode at 25 C has the
0.05916 V (59 mV) slope per decade -- the familiar 59 mV per pH unit.

## 4. Scope and non-goals

Uses concentrations for activities and ignores liquid-junction potential and kinetic overpotential; accurate work at
high ionic strength uses activities. A first-principles chemistry aid; the measured electrochemistry governs.
