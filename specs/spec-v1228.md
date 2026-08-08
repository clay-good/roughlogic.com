# roughlogic.com Specification v1228 -- Ideal Gas Law (PV = nRT) (calc-lab.js, Group T, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lab.js`** (Group T),
> no new module, group, or dependency. Inherits spec.md through spec-v1227.md.
>
> **The gap.** Family-completion: the lab basic-chemistry set has `mass-moles`, `molecular-weight`, and
> `molarity-dilution` but no gas law -- the member that links moles to a gas's pressure, volume, and temperature.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), an unknown solve_for, a non-positive required variable, or a temperature at/below
absolute zero returns `{ error }`. Citation discipline (v19/v22): the ideal gas law (general chemistry), by name,
`GOVERNANCE.lab`. **No copyrighted table is reproduced** -- first-principles chemistry; the state variables are the
user's own.

## 2. The tile

### 2.1 `ideal-gas-law` -- Ideal Gas Law (PV = nRT)

```
R = 0.0820573 L*atm/(mol*K);  T_K = T_C + 273.15
solve n : n = P V / (R T_K)
solve P : P = n R T_K / V
solve V : V = n R T_K / P
solve T : T_K = P V / (n R)
molar volume = V / n
```

**Inputs:** solve-for (n/P/V/T), pressure (atm), volume (L), moles, temperature (C).

**Outputs:** the solved variable, plus the molar volume.

## 3. Worked example

`solve_for = volume, pressure_atm = 1, moles = 1, temperature_c = 25`:

```
V = n R T / P = 1 x 0.0820573 x 298.15 / 1 = 24.465 L   (molar volume 24.47 L/mol)
```

At STP (1 atm, 22.414 L, 0 C) solving for moles returns 1.000 mol (the 22.4 L/mol molar volume).

## 4. Limitations

Ideal gas only -- real gases deviate at high pressure or near condensation (van der Waals or a compressibility factor Z
is separate). The gas density = P x molar_mass / (R x T) needs the molar mass, from the molecular-weight tile. A
first-principles chemistry aid; the measurement conditions and the gas's real behavior govern.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1228` pins PV = nRT solved all four ways, the STP molar volume, the temperature
  round-trip, Boyle's-law behavior (double P halves V), and the per-mode error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the 25 C molar-volume example and the STP moles
  cross-check).
- Formula checked against the ideal gas law (general chemistry; R = 0.0820573 L*atm/(mol*K)).
