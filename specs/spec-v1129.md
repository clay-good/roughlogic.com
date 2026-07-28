# roughlogic.com Specification v1129 -- Crawl Space Ventilation (calc-finish.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1128.md.
>
> **The gap.** `attic-ventilation` does the roof with the IRC 1/150 and 1/300 rules, and
> `soffit-ridge-vent-count` places those vents. Nothing did the **floor**. IRC R408 is the same idea with
> different numbers and one much larger lever.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
area, ratio denominator, or per-vent area, or a negative or non-integer corner count return `{ error }`.
Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `crawl-space-ventilation` -- Crawl Space (Under-Floor) Ventilation Net Free Area

```
inputs:  floor_area_sf, base_ratio_denominator (150; WA 300), vapor_retarder,
         vent_net_free_sqin, corner_count
compute: ratio    = 1500 with an approved Class I retarder AND cross ventilation,
                    else the base denominator
         required = area / ratio, in sq ft then x144 for sq in
         vents    = max( ceil(required / per-vent net free area), corner count )
outputs: ratio_used, required_sf, required_sqin, vents_by_area, vents_required,
         corner_governs, provided_sqin, surplus_sqin, alt_ratio, alt_required_sqin,
         alt_vents, retarder, note
```

**The vapor retarder is the whole story.** Going from 1/150 to 1/1500 is a **ten-fold** reduction, bought
for the price of covering the ground -- which is where nearly all of a crawl space's moisture comes from.
A 1,500 sq ft crawl needs 1,440 sq in and **29** typical vents bare, and 144 sq in and **4** with the
retarder. Both fixtures are pinned side by side because the comparison is the tile's point.

**And then the corner rule takes over.** At four vents the area no longer governs -- the code wants an
opening within 3 ft of each corner regardless, so a small or well-sealed crawl space is set by its
corners. The tile reports which of the two is governing rather than just a number.

**Both conditions, not just the plastic.** The exception requires an approved Class I vapor retarder over
the ground **and** openings placed to provide cross ventilation. The note says so explicitly.

**Two further cautions in the note.** Areas are **net free** area -- a vent's mesh, louver, and frame eat
a large share of the rough opening, and only the net free area printed on the product counts. The code's
permitted coverings carry their own minimum sizes (hardware cloth of 0.035-in wire or heavier, wire mesh
no finer than 1/8 in), because finer mesh clogs and stops ventilating.

**The base ratio is genuinely not universal.** The base IRC says 1/150; Washington's adopted WAC
51-51-0408 says **1/300**. Rather than ship one number as if it were settled, the denominator is an
editable input, both values are named, and the note tells the user to check what their AHJ adopted. The
fuzzer pins the WA case explicitly.

## 3. Scope

An **unvented, conditioned** crawl space built to R408.3 -- continuous sealed Class I vapor retarder
lapped 6 in and carried up the stem wall, with conditioned air or a dehumidifier -- is a different and
often better assembly. This tile does not size it, and says so.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `attic-ventilation`,
`vapor-barrier-rolls`, and `soffit-ridge-vent-count`. Fuzzer pins both fixtures, the exact ten-fold ratio
between them, that each case reports the other correctly, four base denominators including Washington's
1/300 and that the retarder overrides every one of them with 1500, then sweeps 72 area/vent/corner/retarder
combinations asserting the vents always cover the requirement, the corner floor is never violated, the
governing flag agrees, and the sq-ft-to-sq-in identity holds. Plus linearity in area, monotonicity in vent
size, the zero-corner case, and every error seam. A stray `.slice()` artifact left in a renderer output
expression during drafting was caught and removed before wiring.
