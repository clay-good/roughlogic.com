# roughlogic.com Specification v1254 -- Flat-Oval Duct Equivalent Round Diameter (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvac.js`** (Group C),
> no new module, group, or dependency. Inherits spec.md through spec-v1253.md.
>
> **The gap.** `round-to-rect-duct` covers the rectangular equivalent, but there is no flat-oval equivalent -- the shape
> used in tight plenum/ceiling runs. A tech with a flat-oval run has no way to find its equal-friction round size.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input, a non-positive axis, or a major axis smaller than the minor axis returns `{ error }`. Citation
discipline (v19/v22): ASHRAE Fundamentals (duct design) / SMACNA, by name, first-principles (the sibling
`round-to-rect-duct` uses the same basis). No structured table is reproduced.

## 2. The tile

### 2.1 `flat-oval-duct` -- Flat-Oval Duct Equivalent Round Diameter

```
A  = (pi/4) b^2 + b (a - b)          a = major axis, b = minor axis
P  = pi b + 2 (a - b)
De = 1.55 A^0.625 / P^0.25           equal-friction equivalent round diameter
```

**Inputs:** major axis a (in), minor axis b (in).

**Outputs:** equivalent round diameter, cross-section area, perimeter (and the aspect ratio).

## 3. Worked example

`a = 20 in, b = 10 in`:

```
A  = (pi/4)(10^2) + 10(20 - 10) = 78.54 + 100 = 178.54 in^2
P  = pi(10) + 2(10) = 51.42 in
De = 1.55 x 178.54^0.625 / 51.42^0.25 = 14.79 in
```

slightly under the 15.08 in equal-area round. Cross-check: a 10 x 10 flat oval is a 10 in round (De = 10.0).

## 4. Scope and non-goals

Equal-friction equivalence, not equal-velocity -- size the round for friction and the flat oval for the space. A design
aid; the duct-design method and the fabrication drawing govern.
