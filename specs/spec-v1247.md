# roughlogic.com Specification v1247 -- Dovetail Slide Measurement Over Rods (calc-shop.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v1246.md.
>
> **The gap.** The shop metrology set has thread measurement over wires (`thread-measure-wire`) and the gear-tooth
> caliper, but no dovetail check -- the everyday bench-inspection of a dovetail slide.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input, a non-positive dimension or rod diameter, an angle outside (0, 180), or a computed non-positive result
returns `{ error }`. Citation discipline (v19/v22): Machinery's Handbook ("Checking a Dovetail Slide"), by name,
`GOVERNANCE.general`. **No table is reproduced** -- pure trigonometry.

## 2. The tile

### 2.1 `dovetail-over-pins` -- Dovetail Slide Measurement Over Rods

```
offset  k = D (1 + cot(alpha/2))          alpha the included dovetail angle, D the rod diameter
Male (external):  over-rods = flat + k       inverse: flat = over-rods - k
Female (internal): over-rods = flat - k      inverse: flat = over-rods + k
```

**Inputs:** dovetail type (male / female), known dimension (flat width / measured over-rods), the known dimension (in),
rod diameter (in), included dovetail angle (deg).

**Outputs:** the offset k, and both the over-rods measurement and the flat width.

## 3. Worked example

`male, flat = 2.000 in, rods D = 0.500 in, alpha = 60 deg`:

```
k = 0.500 (1 + cot(30 deg)) = 0.500 (1 + 1.73205) = 1.36603 in
over-rods = 2.000 + 1.36603 = 3.366 in
```

Cross-checks: a female dovetail with a 2.500 in opening measures 2.500 - 1.366 = 1.134 in over the rods; feeding the
3.366 in male reading back (known = over-rods) recovers the 2.000 in flat.

## 4. Scope and non-goals

Use a rod small enough that it contacts the flank below the corner, not on the edge. First-principles trigonometry; the
print tolerance and a verified gauge govern.
