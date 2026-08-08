# roughlogic.com Specification v1223 -- NTC Thermistor Steinhart-Hart Equation (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`**
> (Group A), no new module, group, or dependency. Inherits spec.md through spec-v1222.md.
>
> **The gap.** Family-completion plus a named gap: the temperature-sensor family has the platinum RTD
> (`rtd-resistance-to-temp`) and the NTC beta equation (`thermistor-beta-temp`), whose own note says a wider or tighter
> job "uses the 3-constant Steinhart-Hart equation instead." No Steinhart-Hart tile existed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive resistance, non-finite coefficients, or coefficients giving no
positive temperature returns `{ error }`. Citation discipline (v19/v22): the Steinhart-Hart equation (Steinhart & Hart,
Deep-Sea Research, 1968), by name, `GOVERNANCE.general`. **No copyrighted table is reproduced** -- the equation is public
and A, B, C are the user's datasheet/calibration values.

## 2. The tile

### 2.1 `thermistor-steinhart-hart` -- NTC Thermistor Steinhart-Hart Equation (3-Constant)

```
1/T = A + B ln(R) + C (ln R)^3       (T in kelvin)
T_C = T - 273.15;  T_F = T_C x 9/5 + 32
```

**Inputs:** measured resistance R (ohms), coefficients A, B, C (from the datasheet or a 3-point calibration).

**Outputs:** temperature in K, C, and F.

## 3. Worked example

`resistance_ohms = 10000, A = 1.1253e-3, B = 2.3471e-4, C = 8.566e-8`:

```
ln R = ln(10000) = 9.21034
1/T = 1.1253e-3 + 2.3471e-4(9.21034) + 8.566e-8(9.21034)^3 = 3.35402e-3
T = 298.15 K = 25.00 C = 77.00 F
```

The same sensor reads about 2 C at 29 kohm and about 48 C at 3.9 kohm -- resistance and temperature move in opposite
directions (NTC).

## 4. Limitations

C is usually tiny (~1e-7); entering C = 0 gives the two-constant form. Accurate to about +/-0.01-0.02 C across a wide
span (about -50 to 150 C), better than the two-point beta equation. A lead-compensated reading is assumed; the datasheet
R-T table, the tolerance grade, and self-heating set the field accuracy. Distinct from a positive-coefficient platinum
RTD.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1223` pins the 3-constant equation, the 25 C reading at 10 kohm, the NTC direction
  (lower R -> higher T), monotonicity, the two-constant (C = 0) form, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the 25 C example and the 48 C cross-check).
- Formula checked against the Steinhart-Hart equation (Steinhart & Hart, 1968).
