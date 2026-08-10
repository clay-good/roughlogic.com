# roughlogic.com Specification v1287 -- Corrected Endurance Limit (Marin Factors) (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group K, mechanic/machinist), no new module or dependency. Inherits spec.md through spec-v1286.md.
>
> **The gap (the sibling names it).** `fatigue-safety-factor` (spec-v1286) takes the *corrected* endurance limit Se
> as an input and its note says building Se "from the Marin factors" is separate. This builds it: the Shigley Marin
> equation `Se = ka kb kc kd ke Se'` that turns the ultimate strength into the real endurance limit, feeding the
> fatigue tile. Together they are the full stress-life fatigue workflow.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive ultimate strength, a diameter outside 0.11-10 in for a non-axial load, a non-positive temperature
factor, or an unknown surface/load/reliability returns `{ error }`; no numeric field is ever `Infinity`. Citation
discipline (v19/v22): the Marin modification factors and the rotating-beam endurance limit Se' = 0.5 Sut (Shigley,
*Mechanical Engineering Design*, Ch. 6), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `endurance-limit-marin` -- Corrected Endurance Limit (Shigley Marin Factors)

```
Se' = 0.5 Sut        (steel, Sut <= 200 ksi; else 100 ksi)
ka = a (Sut_ksi)^b   surface: ground 1.34/-0.085, machined 2.70/-0.265, hot-rolled 14.4/-0.718, forged 39.9/-0.995
kb = 0.879 d^-0.107  (0.11 <= d <= 2 in) or 0.91 d^-0.157 (2 < d <= 10 in), rotating bending/torsion; = 1 for axial
kc = 1 bending, 0.85 axial, 0.59 torsion
kd = temperature factor (input, default 1.0)
ke = reliability: 0.897 (90%), 0.868 (95%), 0.814 (99%), 0.753 (99.9%), 1.0 (50%)
Se = ka kb kc kd ke Se'
```

`Se'` is the rotating-beam (uncorrected) endurance limit; the five Marin factors knock it down for the real surface
finish, size, loading mode, temperature, and reliability. Output Se in psi feeds `fatigue-safety-factor` directly.

**Inputs:** ultimate strength Sut (psi), surface finish, diameter d (in), load type (bending / axial / torsion),
reliability (%), temperature factor kd.

**Outputs:** corrected endurance limit Se (psi), uncorrected Se' (psi), and each Marin factor ka / kb / kc / kd / ke.

## 3. Worked example

Sut 105,000 psi steel, machined, 1 in diameter, rotating bending, 99% reliability:

```
Se' = 0.5 x 105,000 = 52,500 psi
ka = 2.70 x 105^-0.265 = 0.787   kb = 0.879 x 1^-0.107 = 0.879   kc = 1   kd = 1   ke = 0.814
Se = 0.787 x 0.879 x 1 x 1 x 0.814 x 52,500 = 29,500 psi
```

That Se drops straight into `fatigue-safety-factor`: with sigma_a 25 ksi and sigma_m 30 ksi it gives a Goodman
factor of about 0.88, so a part that looked fine on the raw 52.5 ksi endurance limit is actually fatigue-unsafe once
the surface and reliability are honestly accounted for -- the whole point of the Marin correction.

## 4. Scope and non-goals

The steel rotating-beam endurance limit with the five Marin factors; the a/b surface constants and the reliability
factors are the standard Shigley tables. Non-steel materials (which may show no endurance knee), stress
concentration (Kf), and finite-life (S-N) reductions are separate. Feed Se into `fatigue-safety-factor`. A design
aid; Shigley and the engineer of record govern.
