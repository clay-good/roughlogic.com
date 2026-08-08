# roughlogic.com Specification v1211 -- Gust-Effect Factor G (ASCE 7 §26.11) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1210.md.
>
> **The gap, and the evidence for it.** The `wind-pressure`, `wind-mwfrs-wall`, and `wind-solid-sign` tiles all take the
> gust-effect factor G as an input hard-defaulted to 0.85 (e.g. `computeWindMwfrsWall`: "The gust-effect factor G must be
> positive (0.85 rigid)"), and the MWFRS wall note names the gap: it "does not compute the roof MWFRS pressures, the
> flexible-building Gf, or the torsional patterns." No tile computed G. Needed-input plus sibling-gap.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), an exposure other than B/C/D, or a non-positive h or B returns `{ error }`.
Citation discipline (v19/v22): ASCE 7 §26.11.4 and the Table 26.11-1 exposure constants, by name, `GOVERNANCE.general`.
**No copyrighted table is reproduced** -- the four terrain constants per exposure are a small published set (like the
existing wind Kz exposure constants), and B and h are the user's own building dimensions.

## 2. The tile

### 2.1 `wind-gust-effect-factor` -- Gust-Effect Factor G (ASCE 7 §26.11)

```
zbar = max(0.6 h, zmin)
Iz   = c (33/zbar)^(1/6)                                turbulence intensity
Lz   = l (zbar/33)^eps                                  integral length scale (ft)
Q    = sqrt(1 / (1 + 0.63 ((B + h)/Lz)^0.63))           background response
G    = 0.925 (1 + 1.7 gQ Iz Q)/(1 + 1.7 gv Iz)          gQ = gv = 3.4
```

Table 26.11-1 constants: B -> c 0.30, l 320 ft, eps 1/3.0, zmin 30 ft; C -> 0.20, 500, 1/5.0, 15; D -> 0.15, 650,
1/8.0, 7.

**Inputs:** exposure category (B/C/D), mean roof height `h_ft`, and building width `b_ft` (normal to the wind).

**Outputs:** `g_factor`, the turbulence Iz, background Q, length scale Lz, and equivalent height zbar.

## 3. Worked example

`exposure = C, h_ft = 30, b_ft = 100`:

```
zbar = max(18, 15) = 18 ft
Iz   = 0.20 (33/18)^(1/6) = 0.221
Lz   = 500 (18/33)^(1/5)  = 442.9 ft
Q    = sqrt(1/(1 + 0.63 (130/442.9)^0.63)) = 0.880
G    = 0.925 (1 + 1.7*3.4*0.221*0.880)/(1 + 1.7*3.4*0.221) = 0.863
```

So the flat 0.85 default is close but slightly unconservative here. Rougher Exposure B floors zbar at zmin = 30 ft
(0.6*30 = 18 < 30) and gives G = 0.840.

## 4. Limitations

Rigid buildings only (fundamental frequency at or above 1 Hz; most low-rise buildings with h at most 60 ft and
h/least-width under about 4 qualify). A flexible or dynamically sensitive building needs the gust-effect factor Gf with
the resonant response factor R, which this does not compute. A design aid, not a substitute for the engineer of record.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1211` pins the rigid G, the intermediate Iz/Lz/Q factors, the zmin floor (Exposure B),
  the size trends (narrower B raises G), and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the Exposure C example and the Exposure B zmin-clamp
  cross-check).
- Formula checked against ASCE 7 §26.11.4 and the Table 26.11-1 exposure constants.
