# roughlogic.com Specification v1126 -- Single-Ply Fastener and Plate Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1125.md.
>
> **The gap, self-declared.** `membrane-roof-takeoff`'s note ends: *"Fasteners, plates, and cover tape are
> taken off separately."* Third tile this session from the self-declared-gap grep.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
area or spacing, a zone share outside 0-100%, waste outside 0-50%, or a side lap wider than the roll
return `{ error }`. Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `membrane-fastener-takeoff` -- Mechanically Attached Single-Ply Fastener and Plate Takeoff

```
inputs:  roof_area_sf, roll_width_ft, sidelap_in, field_spacing_in, perimeter_spacing_in,
         perimeter_fraction_pct, field_seam_covered, waste_pct
compute: usable width = roll width - side lap        DELEGATED to membrane-roof-takeoff
         seam length  = area / usable width          the fastener rows ARE the seams
         perimeter seam = seam x share;  field seam = the rest
         fasteners = ceil(length x 12 / spacing) per zone; total x (1 + waste)
         plates = fasteners;  cover tape = seam x (1 + waste) only when fasteners are
                                            in the field of a sheet
outputs: usable_w_ft, seam_lf, perimeter_lf, field_lf, field_fasteners, perimeter_fasteners,
         base_fasteners, total_fasteners, plates, cover_tape_lf, covered,
         fasteners_per_square, avg_spacing_in, note
```

**Why the rows are the seams.** On a mechanically attached system the fasteners go through the **side lap**
and the next sheet is welded over them. So the row layout is the sheet layout, and the row spacing is the
**usable** width -- roll width minus lap -- not the nominal roll width. A 10-ft roll with a 6-in lap covers
9.5 ft, so an 8,000 sq ft roof has **842 LF** of seam, not 800. Sizing rows off the nominal width
undercounts the fasteners by 5.3%, and that is the trap this tile exists to catch.

**Sheet width is the biggest lever.** The cross-check fixture runs the same roof on a 12-ft sheet: 696 LF
of seam and 870 fasteners against 1,054 -- **17.5% fewer**, from sheet width alone.

**What is deliberately not built in.** The on-center spacing, the width of the perimeter and corner zones,
and the share of the roof they occupy come from the wind-uplift calculation and from the specific
assembly's FM or UL approval listing for that deck, insulation, and membrane. They are **inputs**. The
approval is what establishes the tested resistance; substituting a remembered number for it is how an
assembly ends up unapproved. No approval table or manufacturer spacing chart is reproduced -- none is
needed, because every spacing comes from the user.

**Cover tape is conditional and defaults to zero.** It is counted only when fasteners land in the field of
a sheet rather than in a lap the next sheet welds over. When every fastener is in a lap, zero is the right
answer and the tile says why.

**A dead expression caught before wiring.** The first draft computed a `rows` variable through an
expression that algebraically collapsed to 1 and was never returned. It is gone, along with its entry in
the `dims` annotation.

## 3. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `membrane-roof-takeoff` (which now links
forward), `roof-insulation-fasteners`, `tapered-roof-insulation`, and `roofing-squares`. `check-shells` GROUP_GZIP_CAP raised 88 -> 92 KB (the Group E construction hub crossed it at 90,305 B gz). Fuzzer pins both
fixtures, exact seam agreement with the delegated sheet tile across nine roll/lap combinations, that the
seam always exceeds the nominal-width figure, monotonic reduction in seams and fasteners as sheets widen,
that the two zone lengths always sum to the seam and that the 0% and 100% shares zero out the right
counter, that equal spacings make the zone share irrelevant, monotonicity in spacing with the density and
average-spacing identities, that plates always track fasteners and waste never changes the base count,
conditional cover tape, and every error seam.
