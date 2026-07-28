# roughlogic.com Specification v1161 -- Sign Character Height and Viewing Distance (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 78 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1160.md.
>
> **The gap.** A dupe scan for "sign character", "letter height", and "signage height" returned zero hits.
> The catalog spaces work-zone signs (`advance-warning-sign-spacing`) but never sized the lettering on one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
baseline height or viewing distance, a negative provided height, or a baseline below 40 in return
`{ error }`. Renderer: this module's `_simpleRenderer`.

**Source.** 2010 ADA Standards for Accessible Design, 703.5.5 and Table 703.5.5. A US federal standard in
the public domain, quoted directly. No copyrighted table is involved.

## 2. The tile

### 2.1 `sign-character-height` -- Sign Character Height and Viewing Distance (703.5.5)

```
inputs:  baseline_height_in, viewing_distance_in, provided_character_height_in
compute: band by baseline height -- 40 to 70 in: base 5/8 in, threshold 72 in
                                    over 70 to 120 in: base 2 in, threshold 180 in
                                    over 120 in: base 3 in, threshold 252 in (21 ft)
         required = base + (max(0, viewing - threshold) / 12) x 1/8 in
         max viewing distance served = threshold + ((provided - base) / (1/8)) x 12
outputs: required_character_height_in, base_height_in, threshold_in, band, excess_in, added_in,
         distance_governs, ok, shortfall_in, max_viewing_distance_in, next_band_required_in,
         cliff_multiple, note
```

**The distance term is the one that gets dropped.** The default example is 5/8-in characters at 60 in above
the floor with 10 ft of approach: 5/8 is the *base*, and 48 in past the 72-in threshold adds 4 x 1/8 =
**0.5 in**, so the table demands **1.125 in** and the sign has half of it.

**The band boundaries are cliffs, not ramps.** At exactly 70 in the sign is still in the first band and
needs 1.125 in at that distance; at **70.1 in** it enters the second band, whose base is 2 in and whose
threshold is 180 in -- which 120 in does not reach -- so the requirement is a flat **2 in** and the same
characters are 0.875 in short. Nothing about the viewer changed. The tile reports what one band up would
cost from wherever the sign currently is, and returns `null` in the top band rather than inventing a
fourth. Note that 70 and 120 each belong to the *lower* band; the fuzzer pins both seams.

**Two measurement rules do the rest of the damage.** The height is measured to the **baseline** of the
characters, not the top or bottom of the panel, so a tall panel hung low can put its lettering in a
different band than the sign appears to occupy. And the viewing distance runs to whatever **obstruction
prevents further approach** -- not to wherever a person happens to stand. A counter, rail, or planter in
front of a sign is what sets the letter height, and removing one makes the distance *shorter*, which is the
opposite of the intuition. Character height is the uppercase "I", so it is cap height rather than the
panel, the lowercase, or the ascender.

**The inverse is reported and verified.** How far back a given character height actually serves in its
band; the fuzzer feeds that distance straight back in and asserts it complies, and that a foot past it does
not. Characters under the band's base height report `null` -- there is no distance at which they comply --
rather than a misleading zero.

## 3. Scope

A height check, not a sign design. Not checked: whether the sign needs visual characters, tactile
characters, or both, which turns on what it identifies; the raised-character and Braille requirements and
their own mounting range; stroke thickness, character width and spacing, line spacing, case, and the
restrictions on italic, script, and highly decorative fonts; finish, contrast, and glare; the location
requirement at doors; pictograms; and state and local accessibility law. The table has no row below 40 in,
so the tile returns an error there rather than extrapolating.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `accessible-parking-count`,
`accessible-toilet-compartment`, `ada-ramp-slope`, and `advance-warning-sign-spacing`. The tools-data row
sits inside the parsed Group E block, which has no exact count assertion. Fuzzer pins both fixtures, all
three bands with both boundaries on the correct side, fourteen required-height points across every band and
threshold, monotonicity in viewing distance across 300 samples in three bands, the cliff at the 70-in seam,
the next-band report and its `null` in the top band, the inverse round-trip in both directions at seven
height and provided-height combinations, the `null` for characters under the base height, exact equality
passing, and every error seam including the below-40-in case the table itself creates.
