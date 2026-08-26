# roughlogic.com Specification v1407 -- Bearing Regrease Quantity and Relubrication Interval (calc-shop.js, Group G, shop and industrial, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop and industrial), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes bearing life, dynamic equivalent load, and sleeve-bearing PV, but nothing about the thing that actually kills most bearings, which is lubrication -- too little, too much, or too late. The quantity is a simple function of bearing size and the interval is a published relation in speed and bore, and neither is in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive outside diameter, width, bore, or speed, or a computed interval at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the grease-quantity relation G = 0.005 x D x B (grams, millimetres) and the standard relubrication-interval relation for grease-lubricated rolling bearings, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `bearing-regrease` -- Bearing Regrease Quantity and Relubrication Interval

```
grease quantity (g) = 0.005 x outside diameter (mm) x width (mm)
interval (hours)    = K x [ 14,000,000 / (rpm x sqrt(bore in mm)) - 4 x bore in mm ]
                      K adjusts for bearing type, load, temperature, and orientation
```

Two numbers and both are commonly wrong in the field. **Quantity** is proportional to the bearing's outside
diameter times its width -- essentially to the free volume inside it -- and it comes out much smaller than people
expect. Over-greasing is not conservative: excess grease is churned by the rolling elements, it heats, and it
either bleeds out or cooks into a varnish that starves the bearing. A great many "lubrication failures" are
over-lubrication.

**Interval** falls with speed and with bore. The relation gives the interval for a horizontal, moderately loaded
bearing at normal temperature, and the correction factor `K` cuts it hard from there: roughly halve it for every
15 degrees Celsius above about 70 C, halve it again for a vertical shaft, and cut it substantially for heavy load,
contamination, or vibration. Two identical bearings in different service can have intervals a factor of ten apart.

**Inputs:** bearing outside diameter, width, and bore (mm), operating speed, bearing type, and the correction
factors for temperature, orientation, load, and environment.

**Outputs:** grease quantity in grams, base relubrication interval, corrected interval, and the interval expressed
in operating days at a stated duty.

## 3. Worked example

A 6310 deep-groove ball bearing -- 110 mm outside diameter, 27 mm wide, 50 mm bore -- at 1,800 rpm, horizontal,
normal temperature and load:

```
quantity = 0.005 x 110 x 27                              = 14.9 g
interval = 14,000,000 / (1,800 x sqrt(50)) - 4 x 50
         = 1,100 - 200                                   = 900 hours
```

Fifteen grams every nine hundred hours -- about five weeks of continuous running, or a quarter of a year on a
single shift. Now put the same bearing on a vertical shaft in a hot room: halving for the orientation and halving
again for temperature takes it to about 225 hours, monthly on a single shift, and a lubrication schedule built on
the base number would be four times too slow.

## 4. Scope and non-goals

Grease-lubricated rolling bearings in ordinary service. The interval relation is an industry approximation for a
standard bearing type on a horizontal shaft at moderate load and temperature; the correction factors are judgment
calls and the bearing manufacturer's own relubrication chart or software should be used where it exists. The tile
does not select a grease -- base oil viscosity, thickener type, and compatibility with what is already in the
bearing all matter, and **mixing incompatible greases can destroy a bearing faster than not greasing it at all**.
It does not address oil lubrication, sealed-for-life bearings (which must not be regreased), grease relief and
purge arrangements, or automatic lubricators. The bearing manufacturer governs.
