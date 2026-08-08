# roughlogic.com Specification v1222 -- Compound Circular Curve (calc-civil.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-civil.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1221.md.
>
> **The gap.** A family-completion tile: the horizontal-alignment family now has the simple circular curve
> (`horizontal-curve`) and the spiral (`spiral-curve`); the compound curve -- two circular arcs of different radii
> turning the same way -- was the remaining canonical member (interchange ramps, intersection curb returns).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive radius or central angle, or a total deflection >= 180 deg returns
`{ error }`. Citation discipline (v19/v22): compound-curve geometry per the AASHTO Green Book and Ghilani & Wolf, by
name, `GOVERNANCE.engineer_of_record`. **No copyrighted table is reproduced** -- first-principles trig with the law of
sines.

## 2. The tile

### 2.1 `compound-curve` -- Compound Circular Curve

```
T1 = R1 tan(delta1/2);   T2 = R2 tan(delta2/2)         semi-tangents
L1 = R1 delta1_rad;      L2 = R2 delta2_rad            arc lengths
delta = delta1 + delta2
back tangent (PI to PC)    t1 = T1 + (T1 + T2) sin(delta2)/sin(delta)
forward tangent (PI to PT) t2 = T2 + (T1 + T2) sin(delta1)/sin(delta)
```

**Inputs:** R1, R2 (ft), delta1, delta2 (deg).

**Outputs:** the two semi-tangents, the back and forward tangents to the PI, the two arc lengths and total, total delta.

## 3. Worked example

`r1_ft = 500, delta1 = 30, r2_ft = 800, delta2 = 25`:

```
T1 = 500 tan(15) = 133.97 ft;  T2 = 800 tan(12.5) = 177.36 ft
delta = 55 deg
back tangent = 133.97 + 311.33 sin(25)/sin(55) = 294.60 ft
forward tangent = 177.36 + 311.33 sin(30)/sin(55) = 367.39 ft
total length = 261.80 + 349.07 = 610.87 ft
```

With equal radii and equal central angles (1,000 ft, 15 + 15 deg) the back tangent returns 267.95 ft = the simple-curve
tangent for a 30-deg deflection, confirming the reduction.

## 4. Limitations

The two arcs must turn the same direction (a reverse curve is a separate case). AASHTO limits the ratio of successive
compound radii to about 1.5:1 on the mainline to keep the steering/superelevation change gradual. A design aid; AASHTO
and the engineer of record govern.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1222` pins the semi-tangents, the law-of-sines PI tangents, the total length, the exact
  reduction to a simple curve at equal radii/angles, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the two-arc example and the simple-curve reduction).
- Formula checked against the AASHTO Green Book and Ghilani & Wolf compound-curve relations.
