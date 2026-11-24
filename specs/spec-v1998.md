# roughlogic.com Specification v1998 -- Lumber and Panel Weight (`calc-sawmill.js`, Group L, 1 New Tile)

> **Status: LANDED 2026-11-24 (proposed 2026-11-24). Single-tile spec.** In scope under the spec-v106 trades-only
> charter: Group L, beside `kiln-charge-water` and `log-truck-payload`, no new dependency.
>
> **The gap.** A free-text sweep asked "how much does a 20 ft 2x10 weigh" and "weight of a 4 by 8 sheet of 3/4
> plywood". Both came back `NO_MATCH`. The catalog weighs a log (`log-truck-payload`), scales a cord
> (`firewood-cord`) and tracks water through a kiln charge (`kiln-charge-water`), but nothing weighs a piece of
> dressed lumber or a panel -- the number a rigger needs for a pick, an estimator for a delivery, and a framer for
> a header he has to lift. `metal-weight` ("Metal Weight by Shape and Alloy") is the sibling pattern.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. The tile: `lumber-weight`

```
density     = G x 62.43 x (1 + MC/100)        lb/ft^3     (Wood Handbook Eq. 4-12)
volume/pc   = thickness_in x width_in / 144 x length_ft   ft^3
weight/pc   = volume/pc x density
total       = weight/pc x pieces
board feet  = thickness_in x width_in x length_ft / 12 x pieces   (nominal-size check only)
```

`G` is specific gravity on the **ovendry-mass** basis at the volume for the moisture content entered (Wood
Handbook Table 4-5: `Gx`). `62.43 lb/ft^3` is the density of water the handbook states. Dimensions are the
**dressed (actual)** size, not the nominal call-out: a 2x10 is 1.5 x 9.25 in.

Refused: pieces not a whole number 1 or more, any dimension not positive, `G` outside (0, 1.5],
moisture content outside [0, 300]%.

Advisory, not refused: above about 30% the handbook's fibre saturation point the volume stops changing, so a
green weight is the same arithmetic with a higher moisture content; the note says so.

## 2. Verification (USDA Forest Service Wood Handbook, FPL-GTR-190, Chapter 4)

Table 4-6b tabulates this very equation -- density (lb/ft^3) against `Gx` from 0.30 to 0.70 and moisture content
from 0% to 150%. **589 of its 590 cells are reproduced to within 0.2 lb/ft^3** by the relation above (the one
outlier is a digit the text extraction misread). Three cells are pinned as fixtures:

| `Gx` | MC | Table 4-6b | Equation |
| --- | --- | --- | --- |
| 0.50 | 12% | 34.9 | 0.50 x 62.43 x 1.12 = 34.96 |
| 0.40 | 0% | 25.0 | 0.40 x 62.43 = 24.97 |
| 0.70 | 60% | 69.9 | 0.70 x 62.43 x 1.60 = 69.92 |

The worked example is a 20 ft 2x10 at `G` 0.50 and 12% MC: 1.5 x 9.25 / 144 x 20 = 1.9271 ft^3 at 34.96 lb/ft^3
= **67.4 lb**.

## 3. Scope

Specific gravity is an **input**, not a bundled species table: the per-species values live in Wood Handbook
Tables 5-3 through 5-5, which this spec does not reproduce. The field's label states the range the handbook's own
Table 4-6b covers (0.30 to 0.70 spans most US species). Treated lumber carries retained chemical and water the
handbook's relation does not model; engineered members (LVL, LSL, I-joists) are weighed from the maker's
published unit weight, not from a specific gravity.
