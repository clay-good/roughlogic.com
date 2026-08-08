# roughlogic.com Specification v1212 -- Velocity Pressure Exposure Coefficient Kz (ASCE 7 §26.10) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1211.md.
>
> **The gap, and the evidence for it.** The `wind-pressure` and `wind-cc-pressure` tiles take Kz as an input, and
> `computeWindPressure`'s own comment names the gap: the built-in exposure kz is "only a fallback -- enter Kz for the
> actual mean roof height," a flat 3-value stub fixed at 30 ft (B 0.70, C 0.98, D 1.16). `computeWindCcPressure` even
> guards "The exposure coefficient Kz must be positive." No tile computed the height-dependent Kz.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), an exposure other than B/C/D, or a non-positive height returns `{ error }`.
Citation discipline (v19/v22): ASCE 7 §26.10.1 and the Table 26.10-1 exposure constants, by name, `GOVERNANCE.general`.
**No copyrighted table is reproduced** -- the two constants per exposure are a small published set (matching the existing
gust-factor and Kz-stub constants already in the module), and the height z is the user's own dimension.

## 2. The tile

### 2.1 `wind-velocity-pressure-exposure-coefficient` -- Velocity Pressure Exposure Coefficient Kz (ASCE 7 §26.10)

```
Kz = 2.01 (z/zg)^(2/alpha)      for 15 ft <= z <= zg
Kz = 2.01 (15/zg)^(2/alpha)     for z < 15 ft   (held at the 15 ft value)
```

Table 26.10-1 constants: B -> alpha 7.0, zg 1200 ft; C -> 9.5, 900; D -> 11.5, 700.

**Inputs:** exposure category (B/C/D) and height above ground `z_ft` (mean roof height for Kh).

**Outputs:** `kz`, the height used (after the 15 ft floor), zg, and alpha.

## 3. Worked example

`exposure = C, z_ft = 50`:

```
Kz = 2.01 (50/900)^(2/9.5) = 2.01 (0.05556)^0.2105 = 2.01 * 0.5441 = 1.094
```

About 11% above the 0.98 the flat 30 ft stub would use. At z = 30 ft the tile returns 0.982 (C), 0.701 (B), and 1.162
(D) -- reproducing the hard-coded stub exactly. Below 15 ft Kz is held at the z = 15 ft value.

## 4. Limitations

Scales the velocity pressure qz = 0.00256 Kz Kzt Kd Ke V^2. Use Kz at each height z for the windward wall and Kh (Kz at
the mean roof height) for the leeward, side, and roof surfaces and for all components and cladding. Above the gradient
height zg the tabulated range ends (flagged). A design aid, not a substitute for the engineer of record.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1212` pins the formula, the exact reproduction of the repo's 30 ft stub (0.70/0.98/1.16),
  the 15 ft floor, the height/exposure trends, the above-zg flag, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the 50 ft example and the 30 ft stub-reproduction
  cross-check).
- Formula checked against ASCE 7 §26.10.1 Eq. 26.10-1 and the Table 26.10-1 exposure constants.
