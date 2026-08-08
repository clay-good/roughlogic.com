# roughlogic.com Specification v1239 -- Shear Flow and Connector Spacing (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steel.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1238.md.
>
> **The gap.** The steel connection set sizes bolts and welds but has no tile for the horizontal shear flow across the
> connected interfaces of a built-up member, which sets the fastener/weld spacing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
non-finite inputs, or a non-positive shear/area/centroid/inertia/connector-capacity, or fewer than one connector per
row, return `{ error }`. Citation discipline (v19/v22): first-principles mechanics of materials (Hibbeler / Gere / Roark),
`GOVERNANCE.general`. **No table is reproduced** -- the connector capacity R is entered (from AISC bolt/weld strength).

## 2. The tile

### 2.1 `shear-flow-connector-spacing` -- Shear Flow and Connector Spacing (Built-Up Beam)

```
Q = A y_bar            first moment of the connected element about the neutral axis
q = V Q / I            shear flow (V = section shear, I = whole-section moment of inertia)
s = n R / q            maximum connector spacing (n connectors per row, R capacity each)
```

**Inputs:** transverse shear V (kip), connected-element area A (in^2), its centroid distance from the neutral axis
y_bar (in), whole-section moment of inertia I (in^4), capacity per connector R (kip), connectors per row n.

**Outputs:** the first moment Q, the shear flow q, and the maximum connector spacing s.

## 3. Worked example

`V = 50 kip, A = 6 in^2, y_bar = 8 in, I = 800 in^4, R = 10 kip, n = 2`:

```
Q = 6 x 8 = 48 in^3
q = 50 x 48 / 800 = 3.0 kip/in
s = 2 x 10 / 3.0 = 6.67 in
```

Doubling the shear to 100 kip gives q = 6.0 kip/in and s = 3.33 in -- the spacing tightens where the shear is largest.

## 4. Scope and non-goals

Q uses the connected element on one side of the interface; the user computes A, y_bar, and I for the specific built-up
section (exactly as other steel tiles take section properties as inputs). The connector capacity R (bolt shear, weld
increment) comes from AISC and is entered. A design aid; the engineer of record governs.
