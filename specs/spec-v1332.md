# roughlogic.com Specification v1332 -- Belt Drive Center Distance for a Standard Belt (calc-cross.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-08-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group G, cross-trade mechanical), no new module or dependency. Inherits spec.md through spec-v1331.md.
>
> **The gap.** The `vbelt-drive` and `belt-pulley` tiles run the belt-length equation FORWARD: enter the center
> distance, get the belt length. But V-belts come in standard (stock) lengths, so once you pick sheaves and a belt off
> the shelf you must solve the equation the other way for the center distance -- the number that sets the motor slide
> base. No tile did that inverse.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive diameter or length, or a belt too short to admit a real center distance, returns `{ error }`; no numeric
field is ever `Infinity`. Citation discipline (v19/v22): the inverse of the ANSI/RMA IP-20 / IP-22 belt-length
equation (Gates Industrial Drive Design Manual, public), by name, `GOVERNANCE.mechanical`.

## 2. The tile

### 2.1 `belt-center-distance` -- Belt Drive Center Distance (for a Standard Belt)

```
A = L - (pi/2)(D + d)
C = [A + sqrt(A^2 - 2(D - d)^2)] / 4
wrap on small sheave = 180 - 2 asin((D - d) / 2C)   degrees
```

`D` and `d` are the large and small sheave pitch diameters and `L` the belt pitch length. The forward equation
`L = 2C + (pi/2)(D+d) + (D-d)^2/(4C)` is quadratic in `C`: `8C^2 - 4AC + (D-d)^2 = 0`, whose physical (larger,
`+`) root is the formula above. The small-sheave wrap angle is reported because a V-belt's HP rating is tabulated at
180 degrees and derates below it (roughly 20% down at 120 degrees). Inputs are auto-sorted, so the order of the two
diameters does not matter.

**Inputs:** large sheave pitch diameter D (in), small sheave pitch diameter d (in), belt pitch length L (in).

**Outputs:** center distance (in), wrap angle on the small and large sheaves (deg).

## 3. Worked example

`D = 10 in`, `d = 4 in`, standard belt `L = 62.44 in`:

```
A = 62.44 - (pi/2)(14) = 40.449
C = [40.449 + sqrt(40.449^2 - 2 x 36)] / 4 = [40.449 + 39.549] / 4 = 20.00 in
wrap (small) = 180 - 2 asin(6/40) = 162.75 deg
```

This inverts the `vbelt-drive` forward result exactly: that tile at `C = 20 in` returns `L = 62.4411 in`. Equal-sheave
check: with `D = d = 6 in` the cross-term vanishes, `L = 2C + pi D`, so `L = 48.85 in` gives `C = 15.00 in` and the
wrap is exactly 180 degrees.

## 4. Scope and non-goals

The nominal (theoretical) center distance and wrap angle. A real drive still needs the RMA/ISO take-up allowance --
room to move the motor IN to slip the belt on and OUT to tension it and follow stretch -- which comes from the
belt-section table and is separate. Forward belt length is `vbelt-drive` / `belt-pulley`. A design aid; the drive
manufacturer's tables govern the final selection.
