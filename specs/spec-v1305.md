# roughlogic.com Specification v1305 -- Wire Rope Elastic Stretch (calc-rigging.js, Group Z, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`**
> (Group Z, rigging), no new module or dependency. Inherits spec.md through spec-v1304.md.
>
> **The gap.** The rigging bench sizes wire rope by strength (`wire-rope-diameter-for-wll`, `wire-rope-clips`) but
> has nothing for how much it **stretches** under load -- the elastic elongation a crane operator, elevator mechanic,
> or rigger needs for a level pick, a two-crane share, or hoist-rope travel. This adds the elastic stretch and flags
> the separate constructional (seating) stretch.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive load / length / diameter / modulus, or a metallic-area factor outside (0, 1] returns `{ error }`; no
numeric field is ever `Infinity`. Citation discipline (v19/v22): the wire-rope elastic elongation
`dL = P L / (A_m E_r)` with the metallic area `A_m = F d^2` and the effective rope modulus (Wire Rope Users Manual),
by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `wire-rope-stretch` -- Wire Rope Elastic Stretch Under Load

```
A_m = F d^2                            metallic (steel) area; F ~ 0.40 for 6x19/6x37 IWRC
dL = P L / (A_m E_r)                   elastic stretch (L in inches)
stretch % = dL / L
```

`P` is the line tension, `L` the rope length under tension, `d` the nominal rope diameter, `F` the fill factor that
turns the circle area into the steel area, and `E_r` the effective rope modulus (about 12,000,000 psi for a seated
6x19 or 6x37 IWRC rope -- lower than solid steel because the rope is a bundle of helixes). This is the ELASTIC
stretch only; a new rope also takes an initial constructional (seating) stretch of roughly 0.5-0.75% of length as the
strands nest, which is permanent and separate.

**Inputs:** line load P (lb), rope length under load L (ft), rope diameter d (in), effective rope modulus (psi,
default 12e6), metallic-area factor F (default 0.40).

**Outputs:** elastic stretch (in), stretch as a percent of length, and the metallic area used.

## 3. Worked example

A 1/2 in 6x19 IWRC rope, 100 ft under load, carrying 10,000 lb:

```
A_m = 0.40 x 0.5^2 = 0.10 in^2
dL  = 10,000 x (100 x 12) / (0.10 x 12,000,000) = 10.0 in  (0.83% of length)
```

A 100 ft rope stretches 10 in under a 10,000 lb line pull -- nearly a foot, enough to matter on a level pick or when
two cranes share a load. On top of that, a brand-new rope will seat another ~0.5-0.75% (roughly 6-9 in on 100 ft)
the first time it is loaded, which does not come back.

## 4. Scope and non-goals

The recoverable elastic stretch of a single rope by Hooke's law with an effective rope modulus; the initial
constructional (seating) stretch, thermal change, rotation/torque effects, and the true per-construction modulus and
fill factor (use the maker's data) are separate. Never exceed the rope's rated load. A rigging estimate; the wire
rope maker and the qualified rigger govern.
