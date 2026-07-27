# roughlogic.com Specification v1102 -- Work Zone Advance Warning Sign Spacing (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1101.md.
>
> **The gap, and the evidence for it.** `traffic-taper-length` computes the taper and nothing places the
> signs that warn drivers it is coming. Zero hits for "advance warning", "sign spacing", "ttc", or
> "flagger station" in tools-data.js or aliases.json; the only near-match is `hand-signals`, a non-numeric
> flagger reference. Discovery batch 1: CLEAR.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: unknown road
type, a sign count outside 1-3 or non-integer, or a negative speed return `{ error }`. Renderer:
`_simpleRenderer`.

**Citation discipline -- why reproducing this table is allowed.** The charter's rule 2 bars reproducing a
copyrighted table. MUTCD Table 6C-1 is from the FHWA Manual on Uniform Traffic Control Devices, **a work of
the US government and therefore public domain**, so the four rows are shipped verbatim rather than
paraphrased or hidden behind an input. The table was extracted from the FHWA PDF itself (mutcd.fhwa.dot.gov),
not from a secondary summary.

## 2. The tile

### 2.1 `advance-warning-sign-spacing` -- Work Zone Advance Warning Sign Spacing (MUTCD 6C-1)

```
inputs:  road_type (urban-low | urban-high | rural | expressway), sign_count (1-3, default 3),
         speed_mph (0 = skip the placement cross-check)
table:   urban-low   100 / 100 / 100        urban-high  350 / 350 / 350
         rural       500 / 500 / 500        expressway  1000 / 1500 / 2640     (A / B / C, feet)
compute: positions upstream of the transition = [A, A+B, A+B+C], truncated to sign_count
         first_sign (the farthest upstream, and the FIRST one a driver sees) = last position
         rural guidance cross-check: 8 x speed <= first_sign <= 12 x speed
         open-highway guidance: advance warning area >= 1,500 ft
outputs: road_label, a_ft, b_ft, c_ft, positions_ft, sign_count, first_sign_ft, total_ft,
         open_highway_ok, speed_rule_min_ft, speed_rule_max_ft, speed_rule_ok, note
```

**The reversal the tile exists to fix.** The letters read backward from the way a crew sets signs: A is the
distance from the transition to the sign CLOSEST to the work, and the THIRD sign -- the one farthest
upstream -- is the first a driver encounters. Quoting the standard: "The third sign is the first one in a
three-sign series encountered by a driver approaching a TTC zone." Reporting A/B/C alone invites someone to
place the first sign 500 ft out and stop. The tile therefore reports cumulative distances measured upstream
from the transition, so the last number is where the advance warning area begins.

**Worked example (pinned).** Rural, three signs, 55 mph: signs at 500, 1,000, and 1,500 ft upstream; the
area opens 1,500 ft ahead of the taper, which meets both the open-highway guidance and the 8-12x rule
(440-660 ft). Expressway cross-check: 1,000 / 2,500 / 5,140 ft -- over a mile of advance warning, matching
the published expressway example.

## 3. Scope limits

Suggested distances. The urban speed category is "determined by highway agency" per the table's own
footnote; site distance, sight lines, and intersections routinely force adjustment. The taper is the
separate `traffic-taper-length` tile; buffer space, channelizing-device spacing, and flagger stations are
not modeled. The MUTCD as adopted by your state and the agency's traffic control plan govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `traffic-taper-length`. Fuzzer pins all
four table rows verbatim, the cumulative position arithmetic, truncation at 1 and 2 signs, the expressway
row being the only one with unequal A/B/C, the 8-12x check on both sides, the 1,500-ft open-highway flag,
and error seams.
