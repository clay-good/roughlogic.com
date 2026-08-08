# roughlogic.com Specification v1237 -- Concrete Effective Moment of Inertia Ie (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1236.md.
>
> **The gap.** Double vein: `concrete-cracking-moment` names Mcr as "the value behind the effective-moment-of-inertia
> (Ie) deflection analysis," and `concrete-longterm-defl` (spec-v497) takes the immediate deflection as a hand-entered
> input -- but no tile derives Ie (and thus the immediate deflection).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
non-finite inputs, a non-positive b/h/d/As/f'c/Ma, or d >= h return `{ error }`. Citation discipline (v19/v22): ACI
318-19 §24.2.3.5 (Bischoff), with fr from §19.2.3.1 and Ec from §19.2.2.1, `GOVERNANCE.general`. **No table is
reproduced.** The tile reuses the module's established conventions (Ec = 57000 sqrt(f'c), fr = 7.5 lambda sqrt(f'c)).

## 2. The tile

### 2.1 `concrete-effective-inertia` -- Concrete Effective Moment of Inertia Ie (ACI 318-19 Bischoff)

```
Ig  = b h^3 / 12                         yt = h/2
fr  = 7.5 lambda sqrt(f'c)               Mcr = fr Ig / yt
n   = Es/Ec,  Ec = 57000 sqrt(f'c),  Es = 29,000,000 psi
rho = As/(b d),  kd = d (sqrt((rho n)^2 + 2 rho n) - rho n)
Icr = b kd^3/3 + n As (d - kd)^2
Ma <= (2/3) Mcr  ->  Ie = Ig                                   (Eq 24.2.3.5b)
Ma >  (2/3) Mcr  ->  Ie = Icr / [1 - (Mcr/Ma)^2 (1 - Icr/Ig)]  (Eq 24.2.3.5a)
```

**Inputs:** width b, total depth h, effective depth d, tension steel As, f'c, service moment Ma (kip-ft), lambda.

**Outputs:** Ig, Icr, the cracking moment Mcr, and the effective inertia Ie (with its ratio to Ig).

## 3. Worked example

`b = 12 in, h = 20 in, d = 17.5 in, As = 3.0 in^2, f'c = 4000 psi, Ma = 60 kip-ft`:

```
Ig  = 12 x 20^3 / 12 = 8,000 in^4       Mcr = 31.62 kip-ft
n   = 29,000,000 / (57000 sqrt(4000)) = 8.04      kd = 6.62 in
Icr = 12(6.62)^3/3 + 8.04(3.0)(17.5-6.62)^2 = 4,017 in^4
Ma 60 > (2/3)(31.62) = 21.1  ->  cracked
Ie  = 4017 / [1 - (31.62/60)^2 (1 - 4017/8000)] = 4,662 in^4  (58% of Ig)
```

Cross-check: at Ma = 15 kip-ft (< 21.1) the section is uncracked and Ie = Ig = 8,000 in^4; at very high Ma, Ie -> Icr.

## 4. Scope and non-goals

Singly-reinforced rectangular section (compression steel and T-flanges use the appropriate transformed Icr). The 2019
Bischoff form predicts larger deflections than the removed Branson cubic, especially for lightly reinforced slabs. The
immediate deflection (a load-case coefficient) w L^4/(Ec Ie) then feeds `concrete-longterm-defl`. A design aid; the
engineer of record governs.
