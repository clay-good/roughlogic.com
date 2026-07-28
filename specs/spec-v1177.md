# roughlogic.com Specification v1177 -- Drinking Fountain Heights and Count (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 94 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1176.md.
>
> **The gap.** `plumbing-fixture-count` says how many drinking fountains an occupancy owes under the
> plumbing code. Nothing said how many the ADA owes, which is a different rule with a different answer, or
> where the spouts go.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
bi-level flag, a non-integer or sub-one unit count, a non-positive spout height, or a negative location or
flow dimension return `{ error }`. Renderer: this module's `_simpleRenderer`. `check-shells` `GROUP_GZIP_CAP` raised 100 -> 112 KB (the Group E construction hub reached 102,658 B gz).

**Source.** 2010 ADA Standards for Accessible Design, 211.2 with its exception, 602.4, 602.5, 602.6, and
602.7. A US federal standard in the public domain, quoted directly.

## 2. The tile

### 2.1 `drinking-fountain-check` -- Drinking Fountain Heights and Count (211, 602)

```
inputs:  units_provided, bi_level, wheelchair_spout_in, standing_spout_in,
         spout_from_support_in, spout_from_front_in, water_flow_height_in
compute: count ok  <- units >= 2, OR one unit that complies with both sets
         wheelchair spout <= 36 in;  standing spout 38 to 43 in
         spout >= 15 in from the vertical support and <= 5 in from the front edge
         water stream >= 4 in high
outputs: count_ok, substitution_used, units_short, wheelchair_ok, wheelchair_excess_in,
         standing_ok, standing_too_low, standing_deficit_in, single_height, in_dead_band,
         dead_band_low_in, dead_band_high_in, support_ok, support_deficit_in, front_ok,
         front_excess_in, flow_ok, flow_deficit_in, passes, note
```

**One fountain is never enough.** 211.2 requires two -- one seated, one standing -- and a single unit
substitutes only where it complies with *both* sets, which is exactly what a bi-level hi-lo is. One ordinary
fountain satisfies neither half rather than half of it.

**The two windows do not touch, and the gap is where fountains get hung.** The wheelchair spout is 36 in
maximum and the standing spout 38 in minimum, so the default example at a comfortable-looking **37 in** is
1 in over one limit and 1 in under the other simultaneously. The fuzzer sweeps the dead band directly and
asserts nothing inside it satisfies either window, while 36 and 38 themselves each satisfy one.

**The standing half fails in the direction nobody checks.** Low reads as accessible, and under 38 in it is
not; the tile distinguishes too-low from too-high rather than reporting a bare fail.

**Three rules get skipped entirely**, and the cross-check fixture fails all three while passing the count
and the seated height: 15 in minimum from the **vertical support**, 5 in maximum from the front edge
**including bumpers** -- the phrase that catches a retrofit, since bumpers added later push a compliant
fountain out of tolerance without anyone touching the plumbing -- and a 4 in stream, which is what lets a
cup be filled under it.

## 3. Scope

A fixture screen, not a rough-in. Not checked: the clear floor space and forward approach the wheelchair
unit needs, and the knee and toe clearance under it, which are separate tiles; the angle of the water
stream, which the standard limits differently by spout position; controls and their operating force;
whether fountains are provided at all, and the distribution required where more than the minimum are
provided; wall-hung units as protruding objects, a frequent failure at the same fixture; bottle fillers,
which do not substitute for either unit; and state and local law and the plumbing code's fixture counts.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `knee-toe-clearance`,
`plumbing-fixture-count`, `reach-range`, and `protruding-object-check`. The tools-data row sits inside the
parsed Group E block, which has no exact count assertion. Fuzzer pins both fixtures, the count rule across
one, two, and five units with and without bi-level, both height windows at their seams, the dead band swept
directly with 36 and 38 proven to lie outside it, exact non-negative deficits on both sides of the standing
window, all three location and flow rules failing alone and passing at their boundaries with exact
deficits, every check failing independently, and every error seam.
