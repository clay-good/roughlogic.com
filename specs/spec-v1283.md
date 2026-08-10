# roughlogic.com Specification v1283 -- Flanged (T-Beam) Cracked Moment of Inertia (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, structural concrete), no new module or dependency. Inherits spec.md through spec-v1282.md.
>
> **The gap (two siblings name it).** `concrete-effective-inertia` (spec-v1237) computes the cracked inertia Icr
> for a singly-reinforced *rectangular* section; its note says "a T-beam or doubly-reinforced section uses the
> appropriate transformed Icr." `concrete-cracked-inertia-doubly` (spec-v1281) built the doubly-reinforced case
> and its note says "a T-beam uses the flanged transformed section." This builds that third case, completing the
> singly / doubly / **flanged** trio. It pairs with `t-beam-effective-flange-width`, which supplies the effective
> flange width b this tile consumes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive flange width b / flange thickness hf / web width bw / effective depth d / As / f'c, a web wider than
the flange, or a non-finite result returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): ACI 318-19 §19.2.2.1 modulus and the standard elastic cracked flanged transformed-section analysis
(Wight & MacGregor; PCA Notes on ACI 318), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `concrete-cracked-inertia-tee` -- Flanged (T-Beam) Cracked Moment of Inertia (ACI 318-19)

```
n = Es/Ec,  Ec = 57000 sqrt(f'c),  Es = 29,000,000 psi
Try the neutral axis inside the flange (rectangle of width b):  b c^2/2 = n As (d - c)
  if c <= hf it is valid:   Icr = b c^3/3 + n As (d - c)^2
Otherwise the neutral axis is in the web:
  bw c^2/2 + (b - bw) hf (c - hf/2) = n As (d - c)
  Icr = bw c^3/3 + (b - bw)[ hf^3/12 + hf (c - hf/2)^2 ] + n As (d - c)^2
```

Tension concrete is ignored (cracked). The compression zone is the full flange width b down to the flange
thickness hf, then only the web width bw below that; the tension steel is transformed with `n As`. Whether the
neutral axis lands in the flange or the web is decided automatically. With `bw = b` (or when the neutral axis stays
inside the flange) it reduces **exactly** to the singly-reinforced rectangular Icr that `concrete-effective-inertia`
returns.

**Inputs:** effective flange width b (in, from `t-beam-effective-flange-width`), flange thickness hf (in), web
width bw (in), effective depth d (in), tension steel As (in^2), f'c (psi).

**Outputs:** cracked inertia Icr (in^4), neutral-axis depth kd (in), where the neutral axis falls (flange or web),
and the modular ratio n / Ec.

## 3. Worked example

Effective flange b 48 in, hf 4 in, web bw 12 in, d 17.5 in, As 6.0 in^2, f'c 4000 psi:

```
Ec = 57000 sqrt(4000) = 3,605 ksi,  n = 8.044
Flange trial: b c^2/2 = n As(d-c) gives c = 5.08 in > hf 4 in, so the neutral axis is in the web.
Web: 12 c^2/2 + 36 x 4 (c - 2) = 48.26(17.5 - c)  ->  c = 5.08 in
Icr = 12(5.08)^3/3 + 36[4^3/12 + 4(5.08-2)^2] + 48.26(17.5-5.08)^2 = 9,528 in^4
```

Cross-check: set the web width equal to the flange (bw = b = 12) and the same bars return c 6.62 in, Icr 4,017 in^4
-- exactly the singly-reinforced rectangular value `concrete-effective-inertia` reports, so the flanged form agrees
in the rectangular limit. The wide compression flange raises the neutral axis and roughly doubles Icr over the bare
web, which is why a slab acting with the beam sharply cuts deflection.

## 4. Scope and non-goals

The elastic cracked transformed moment of inertia for a flanged (T-beam) section with tension steel only; a
doubly-reinforced T (compression steel in the flange) and creep are separate (`concrete-cracked-inertia-doubly`,
`concrete-longterm-defl`). Feed this Icr into `concrete-effective-inertia` (or a deflection check) for a T-beam. A
design aid; the engineer of record's stamped design governs.
