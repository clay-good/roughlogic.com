# roughlogic.com Specification v1279 -- Concrete Immediate Deflection from Ie (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, structural concrete), no new module or dependency. Inherits spec.md through spec-v1278.md.
>
> **The gap (both siblings name it).** `concrete-effective-inertia` (spec-v1237) computes Ie and its note says
> "the immediate deflection is then (a load-case coefficient) w L^4 / (Ec Ie)"; `concrete-longterm-defl`
> (spec-v497) then *takes* that immediate deflection as a hand-entered input. Nothing computed the deflection
> itself, leaving a hole in the middle of the deflection chain. This fills it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive Ie / f'c / load / span, or an unknown support case, returns `{ error }`; no numeric field is ever
`Infinity`. Citation discipline (v19/v22): ACI 318-19 §24.2.3 immediate deflection and §19.2.2.1 modulus, by name,
`GOVERNANCE.general`.

## 2. The tile

### 2.1 `concrete-immediate-deflection` -- Immediate Elastic Deflection from Ie (ACI 318-19)

```
Ec = 57000 sqrt(f'c)                          (normalweight, §19.2.2.1)
delta = K w L^4 / (Ec Ie)                      (elastic beam deflection)
```

`K` is the support/loading coefficient: 5/384 simply supported under a uniform load, 1/384 fixed both ends, 1/8
cantilever, ~1/185 propped cantilever. `Ie` is the effective (Bischoff) moment of inertia from
`concrete-effective-inertia`, so the tiles chain: cracking-moment -> effective-inertia -> **immediate-deflection**
-> longterm-defl.

**Inputs:** effective inertia Ie (in^4), f'c (psi), service load w (kip/ft), span L (ft), and the support/loading
case.

**Outputs:** the immediate deflection (in), the span/deflection ratio L/delta (checked against the ACI Table 24.2.2
limits L/180, L/240, L/360, L/480), and Ec.

## 3. Worked example

Ie 4,662 in^4 (the value the Ie tile returns for a 12 x 20 in beam at f'c 4000), a 0.8 kip/ft service load on a
24 ft simply supported span:

```
Ec = 57000 sqrt(4000) = 3,605,000 psi = 3,605 ksi
delta = (5/384)(0.8/12 kip/in)(288 in)^4 / (3,605 x 4,662) = 0.355 in  ->  L/810
```

Cross-check: the same beam and load fixed at both ends deflects 0.071 in (L/4052), five times stiffer, because the
fixed-end coefficient is 1/384 against the simple-span 5/384. Feed the 0.355 in into `concrete-longterm-defl` for
the creep-and-shrinkage multiplier.

## 4. Scope and non-goals

The immediate elastic deflection for a prismatic reinforced-concrete member using the ACI effective inertia; Ie
itself comes from `concrete-effective-inertia`, and the long-term total from `concrete-longterm-defl`. Uniform-load
support cases (plus the cantilever); a point load or a non-prismatic member is separate. A design aid; the engineer
of record's stamped design governs.
