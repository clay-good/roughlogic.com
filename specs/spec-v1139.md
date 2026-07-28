# roughlogic.com Specification v1139 -- Dryer Exhaust Duct Length (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1138.md.
>
> **The gap.** A dupe scan for "dryer duct" and "dryer exhaust" returned zero hits, in a catalog that
> already has `hood-exhaust`, `combustion-air`, and a duct bench.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
run or ceiling, a negative equivalent length or transition length, or a negative or non-integer elbow
count return `{ error }`. Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `dryer-duct-length` -- Dryer Exhaust Duct Developed Length (IRC M1502.4.5)

```
inputs:  straight_run_ft, elbow_90_count, elbow_45_count, eq_len_90_ft, eq_len_45_ft,
         max_length_ft (35), transition_duct_ft
compute: fitting equivalent = n90 x eq90 + n45 x eq45
         developed length   = straight run + fitting equivalent
         compliant when developed <= max;  remaining = max - developed
         label required when developed > 35 ft (M1502.4.6)
outputs: fitting_equivalent_ft, developed_length_ft, within, over_by_ft,
         remaining_straight_ft, fitting_share_pct, has_elbows, equivalents_entered,
         label_required, transition_over, note
```

**The 35 ft everyone quotes is the least useful number in the section**, because fittings consume it. On
a short interior run the elbows are routinely more than half the total, and the tile reports that share
explicitly so the imbalance is visible rather than buried.

**The fixture pair is the whole argument.** The same 22 ft of duct with the same three 90s and two 45s
comes to **42 ft** on tight mitered elbows and **28 ft** on wide smooth ones. Identical routing, identical
fitting count, and compliance flips from 7 ft over to 7 ft to spare -- purely on elbow selection, which is
almost always cheaper than rerouting duct or opening a wall.

**Why no table is shipped.** M1502.4.5.2 says the size and maximum length are determined by the **dryer
manufacturer's** installation instructions, and the code's fitting table applies only *in their absence*.
Following the code's own priority settles the copyright question at the same time: both the ceiling and
the per-fitting equivalents are inputs, the defaults are starting points to replace with the actual
dryer's data, and Table M1502.4.5.1 is cited by number rather than reproduced.

**Two adjacent rules flagged rather than silently ignored.** Over 35 ft of equivalent length, M1502.4.6
wants the figure on a permanent tag within 6 ft of the connection -- and the fuzzer pins that this stays
tied to 35 even when a manufacturer allows a longer ceiling. And the flexible **transition** duct is a
separate listed assembly limited to 8 ft that is *not part of this length at all*, a distinction that
trips anyone who measures from the appliance.

## 3. Scope

Not checked: the 4-in nominal diameter and smooth-interior metal construction, support at 12 ft maximum
intervals, joints made in the direction of airflow with no fastener penetrating more than 1/8 in,
termination outdoors with a backdraft damper and no screen, the 3 ft separation from openings where the
manufacturer is silent, protective shield plates, or booster fans.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `hood-exhaust`, `duct-metal-weight`, and
`combustion-air`. Fuzzer pins both fixtures, the elbow-selection flip, the arithmetic identity across 54
run/count/equivalent combinations with over-and-remaining mutually exclusive, that an elbow entered with
a zero equivalent is flagged as optimistic while no elbows is not, that the label threshold stays at 35 ft
independent of an editable ceiling, the exact 8 ft transition seam and that it never enters the length,
and every error seam.
