# roughlogic.com Specification v1242 -- Partition Mass-Law Transmission Loss (calc-stage.js, Group N, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`** (Group N),
> no new module, group, or dependency. Inherits spec.md through spec-v1241.md.
>
> **The gap.** The room-acoustics family (`room-acoustics`, `eyring-reverberation`, `room-absorption-target`,
> `decibel-converter`, `spl-distance-for-level`) handles reverberation and levels but has no partition/wall attenuation
> tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
non-finite inputs, a non-positive surface mass or frequency, or an unknown incidence return `{ error }`. Citation
discipline (v19/v22): first-principles panel acoustics (the mass law), Bies & Hansen / FHWA, `GOVERNANCE.general`.
**No table is reproduced** -- the closed-form mass-law TL, not the ASTM E413 STC rating.

## 2. The tile

### 2.1 `partition-mass-law-tl` -- Partition Mass-Law Transmission Loss

```
m (kg/m^2) = surface_mass (lb/ft^2) x 4.88243
TL = 20 log10(m f) - 47   (field / random incidence)
TL = 20 log10(m f) - 42   (normal incidence)
+6 dB per doubling of m or f
```

**Inputs:** surface mass (lb/ft^2), frequency (Hz), incidence (field / normal).

**Outputs:** the transmission loss TL (dB) and the surface mass in kg/m^2.

## 3. Worked example

`surface mass = 2.0 lb/ft^2 (1/2 in gypsum), f = 500 Hz, field incidence`:

```
m  = 2.0 x 4.88243 = 9.765 kg/m^2
TL = 20 log10(9.765 x 500) - 47 = 73.77 - 47 = 26.8 dB
```

Cross-check: doubling the mass to 4.0 lb/ft^2 gives 32.8 dB (+6 dB), and normal incidence gives 31.8 dB (+5 over field).

## 4. Scope and non-goals

The idealized mass law only -- it does not model the coincidence (critical-frequency) dip, the stiffness-controlled
low-frequency region, stud/cavity resonances, flanking, or leaks, and it is NOT the ASTM E413 STC single-number rating
(which needs the full third-octave TL spectrum). Use it to compare bare single-leaf partitions and to see the mass and
frequency trends; a lab-tested assembly rating and the acoustician govern. calc-stage.js module-size cap raised
32000 -> 35000 B.
