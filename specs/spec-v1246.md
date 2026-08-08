# roughlogic.com Specification v1246 -- Osmolarity and Osmotic Pressure (calc-lab.js, Group T, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lab.js`** (Group T),
> no new module, group, or dependency. Inherits spec.md through spec-v1245.md.
>
> **The gap.** The lab chemistry set (`molarity-dilution`, `beer-lambert`, `henderson-hasselbalch`, ideal-gas /
> Arrhenius / Nernst / Clausius-Clapeyron) has no colligative-property tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive concentration or van't Hoff factor, or a temperature at/below
absolute zero returns `{ error }`. Citation discipline (v19/v22): the van't Hoff colligative-property relations, by name,
`GOVERNANCE.lab`. **No copyrighted table is reproduced** -- first-principles chemistry; the concentration and solute are
the user's inputs.

## 2. The tile

### 2.1 `osmolarity` -- Osmolarity and Osmotic Pressure (van't Hoff)

```
Osmolarity  Osm = i * C           i the van't Hoff factor (1 glucose/urea, 2 NaCl/KCl, 3 CaCl2/MgCl2/Na2SO4)
mOsm/L      = 1000 * Osm
Osmotic Pi  = Osm * R * T         R = 0.08206 L*atm/(mol*K), T in kelvin
```

**Inputs:** molar concentration C (mol/L), van't Hoff factor i, temperature (C).

**Outputs:** osmolarity (Osmol/L and mOsm/L) and osmotic pressure (atm).

## 3. Worked example

`C = 0.154 mol/L NaCl, i = 2, T = 37 C` (0.9% physiological saline):

```
Osm = 2 * 0.154 = 0.308 Osmol/L = 308 mOsm/L
Pi  = 0.308 * 0.08206 * 310.15 = 7.84 atm     (blood ~7.7-7.9 atm)
```

Cross-check: 0.154 M glucose (i = 1) is 154 mOsm/L -- half the NaCl value, since glucose does not dissociate.

## 4. Scope and non-goals

The ideal dilute-solution form: at higher concentration the real i falls below the nominal value (ion pairing) and an
osmotic coefficient corrects it. Osmolarity is per liter of solution (osmolality is per kg of solvent, slightly
different). A first-principles chemistry aid; the measured osmometer reading governs.
