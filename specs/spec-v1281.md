# roughlogic.com Specification v1281 -- Doubly-Reinforced Cracked Moment of Inertia (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, structural concrete), no new module or dependency. Inherits spec.md through spec-v1280.md.
>
> **The gap (the sibling names it).** `concrete-effective-inertia` (spec-v1237) computes the cracked inertia Icr
> for a *singly*-reinforced section and its note says "a T-beam or doubly-reinforced section uses the appropriate
> transformed Icr." Compression steel is common (continuous spans, deflection control) and changes both the
> cracked neutral axis and Icr. This adds the doubly-reinforced rectangular case.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive b / d / As / f'c, a negative As', or a d' not inside (0, d) when As' > 0, returns `{ error }`; no
numeric field is ever `Infinity`. Citation discipline (v19/v22): ACI 318-19 §19.2.2.1 modulus and the standard
elastic cracked-transformed-section analysis (Wight & MacGregor; PCA Notes on ACI 318), by name,
`GOVERNANCE.general`.

## 2. The tile

### 2.1 `concrete-cracked-inertia-doubly` -- Doubly-Reinforced Cracked Moment of Inertia (ACI 318-19)

```
n = Es/Ec,  Ec = 57000 sqrt(f'c),  Es = 29,000,000 psi
neutral axis c:   b c^2/2 + (n-1) As' (c - d') = n As (d - c)
Icr = b c^3/3 + (n-1) As' (c - d')^2 + n As (d - c)^2
```

Tension concrete is ignored (cracked); the compression steel is transformed with `(n-1) As'` (the `n-1` credits the
concrete it displaces), the tension steel with `n As`. With `As' = 0` this reduces **exactly** to the
singly-reinforced Icr that `concrete-effective-inertia` returns.

**Inputs:** width b (in), effective depth d (in), tension steel As (in^2), f'c (psi), compression steel As' (in^2,
0 if none), compression steel depth d' (in).

**Outputs:** cracked inertia Icr (in^4), neutral-axis depth kd (in), and the modular ratio n / Ec.

## 3. Worked example

12 x 20 in beam, d 17.5, As 3.0, f'c 4000, with As' 1.0 in^2 at d' 2.5:

```
Ec = 57000 sqrt(4000) = 3,605 ksi,  n = 29,000/3,605 = 8.044
c: 12 c^2/2 + (7.044)(1.0)(c - 2.5) = (8.044)(3.0)(17.5 - c)  ->  c = 6.35 in
Icr = 12(6.35)^3/3 + 7.044(6.35 - 2.5)^2 + 24.13(17.5 - 6.35)^2 = 4,129 in^4
```

Cross-check: drop the compression steel (As' 0) and the same section returns Icr 4,017 in^4 -- exactly the value
the singly-reinforced `concrete-effective-inertia` tile reports for this beam, so the two agree in the limit. The
compression steel raises the neutral axis (6.62 -> 6.35 in) and stiffens the cracked section, which is why adding
top bars cuts long-term deflection.

## 4. Scope and non-goals

The elastic cracked transformed moment of inertia for a doubly-reinforced *rectangular* section; a T-beam uses the
flanged transformed section, and creep is applied separately (`concrete-longterm-defl`). Feed this Icr into
`concrete-effective-inertia` (or a deflection check) for a doubly-reinforced beam. A design aid; the engineer of
record's stamped design governs.
