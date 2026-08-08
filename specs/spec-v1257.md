# roughlogic.com Specification v1257 -- Sheet-Metal Gauge to Decimal Thickness (calc-fab.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fab.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1256.md.
>
> **The gap.** No gauge->thickness converter exists; `awg-wire-geometry` covers wire only, and several tiles
> (`duct-metal-weight`, `metal-stud-takeoff`, `bend-springback`) consume a gauge number but assume the user knows the
> thickness. A reference tile, in the established mold of `awg-wire-geometry` / `color-codes` / `decimal-to-fraction`.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite gauge, an unknown material, or a gauge outside the material's standard range returns `{ error }`. Citation
discipline (v19/v22): the Manufacturers' Standard Gage (U.S. Act of Congress, March 3, 1893) for steel and the Brown &
Sharpe geometric formula for nonferrous, `GOVERNANCE.general`. The steel/galvanized values are a public-domain statutory
table (a reference tile like `awg-wire-geometry`); aluminum is the closed-form B&S formula.

## 2. The tile

### 2.1 `sheet-metal-gauge` -- Sheet-Metal Gauge to Decimal Thickness

```
Steel (MSG, uncoated):  table (thickness = weight / 41.82 lb-ft2-in); gauges 3-30
Galvanized (GSG):       table (MSG + zinc coating); gauges 8-30
Aluminum/brass/copper:  t = 0.005 x 92^((36 - n)/39) in (Brown & Sharpe); gauges 3-30
mm = in x 25.4
```

**Inputs:** gauge number, material (steel / galvanized / aluminum).

**Outputs:** decimal thickness (in and mm).

## 3. Worked example

`16 gauge`:

```
steel      = 0.0598 in  (= 2.5 lb/ft2 / 41.82)
galvanized = 0.0625 in  (MSG + zinc)
aluminum   = 0.005 x 92^((36-16)/39) = 0.0508 in
```

three different thicknesses for the same gauge number. Cross-check: 10 ga aluminum = 0.005 x 92^(26/39) = 0.1019 in,
matching the published nonferrous table.

## 4. Scope and non-goals

Higher gauge numbers are thinner. Stainless is commonly MSG but some mills use their own gauge -- confirm against the
mill certificate. A reference; the material spec and a caliper govern the delivered sheet. calc-fab.js cap raised
33000 -> 36000 B.
