# roughlogic.com Specification v1260 -- Soil Permeability (Hydraulic Conductivity from a Permeameter Test) (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1259.md.
>
> **The gap (self-declared).** The `soil-phase-relations` tile's note names its own gap:
> *"it does not compute the permeability, the effective stress, or the compaction relative density."*
> This spec builds the permeability -- the hydraulic conductivity k from either standard lab permeameter test.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
bad method, a non-positive dimension/time, or a falling-head test with `h1 <= h2` (the head must fall) returns
`{ error }`. Citation discipline (v19/v22): Darcy's-law permeameter reductions per ASTM D2434 (constant head) and
ASTM D5084 (falling head), named, with the Terzaghi/Das drainage ranges; `GOVERNANCE.general`. Fully first-principles.
Permeameter labels in cm are added to the us-defaults allowlist (US geotechnical labs run these tests in metric and
report k in cm/s).

## 2. The tile

### 2.1 `soil-permeability` -- Hydraulic Conductivity from a Permeameter Test

```
Constant head (ASTM D2434, coarse):  k = Q L / (A h t)
Falling head  (ASTM D5084, fine):    k = (a L / (A t)) ln(h1 / h2)
  Q = volume collected, h = fixed head, a = standpipe area, h1/h2 = falling heads,
  L = sample length, A = sample cross-section, t = elapsed time
k in cm/s; 1 cm/s = 2834.6456 ft/day
Drainage class (Terzaghi/Das): >1e-1 gravel; 1e-3..1e-1 sand; 1e-5..1e-3 fine/silty sand;
  1e-7..1e-5 silt; <1e-7 practically impervious clay
```

**Inputs:** method (constant-head / falling-head), sample length L (cm), sample area A (cm2), time t (s), and per
method: Q (cm3) + h (cm) for constant head, or a (cm2) + h1 (cm) + h2 (cm) for falling head.

**Outputs:** hydraulic conductivity k (cm/s and ft/day), drainage class.

## 3. Worked example

Constant head -- Q 250 cm3, h 30 cm, t 60 s, L 12 cm, A 78.5 cm2:

```
k = 250 x 12 / (78.5 x 30 x 60) = 3000 / 141300 = 0.0212314 cm/s = 60.18 ft/day  (medium-permeability sand)
```

Falling head -- a 1.0 cm2, L 10 cm, A 30 cm2, t 120 s, h1 100 -> h2 90 cm:

```
k = (1.0 x 10 / (30 x 120)) x ln(100/90) = 0.00277778 x 0.105361 = 0.000292668 cm/s  (fine/silty sand)
```

## 4. Scope and non-goals

The two standard lab permeameter tests only; field pumping tests, anisotropy (kh vs kv), and the effective-stress and
relative-density gaps the sibling also names are out of scope. Report k at the test temperature and correct to 20 C for a
standard value; one lab specimen can miss field fabric, layering, and fractures, so field k often runs higher. An
engineering aid; the soil test data and the geotechnical engineer of record govern. calc-earthwork.js cap raised
38000 -> 42000 B (a per-tile split of this module remains the eventual preferred fix).
