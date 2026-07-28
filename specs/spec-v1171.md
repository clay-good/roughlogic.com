# roughlogic.com Specification v1171 -- Handrail Height, Grip, and Extensions (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 88 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1170.md.
>
> **The gap.** `guard-handrail-check` carries the building-code side -- guard heights, the sphere rule, and
> a 34-38 in stair handrail. A dupe scan for "handrail extension", "handrail height", and "knee clearance"
> found nothing on the grip, the clearance behind it, or the extensions, which is where ADA 505 lives.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown grip
shape or flight type, a non-positive rail height, a negative clearance, a non-positive diameter where
circular, a non-positive perimeter or cross section where non-circular, a non-positive tread depth at a
stair, or a negative extension return `{ error }`. Renderer: this module's `_simpleRenderer`.

**Source.** 2010 ADA Standards for Accessible Design, 505.4, 505.5, 505.7.1, 505.7.2, 505.10.1, 505.10.2,
and 505.10.3. A US federal standard in the public domain, quoted directly.

## 2. The tile

### 2.1 `handrail-geometry` -- Handrail Height, Grip, and Extensions (505)

```
inputs:  rail_height_in, clearance_in, grip_shape, diameter_in, perimeter_in, cross_section_in,
         flight_type (stair|ramp), tread_depth_in, top_extension_in, bottom_extension_in
compute: height 34-38 in;  clearance >= 1 1/2 in
         circular grip 1 1/4 to 2 in diameter
         non-circular grip perimeter 4 to 6 1/4 in AND cross section <= 2 1/4 in
         top extension 12 in horizontal (stair and ramp)
         bottom extension: one TREAD DEPTH at a stair, 12 in at a ramp
outputs: height_ok, height_too_high, clearance_ok, clearance_deficit_in, diameter_ok,
         diameter_too_fat, perimeter_ok, cross_section_ok, grip_ok, required_top_extension_in,
         required_bottom_extension_in, top_ok, bottom_ok, top_deficit_in, bottom_deficit_in,
         extensions_ok, bottom_vs_flat_in, passes, note
```

**The height is a range, not a minimum.** A rail can be too *high*, and the tile distinguishes the two
directions rather than reporting a bare fail. It is measured to the top of the gripping surface above stair
**nosings**, not treads.

**The grip is a window in both directions.** The default example is a 2 1/2 in circular rail -- too fat to
grip, and not a generous handrail but a noncompliant one. A non-circular rail carries **two** conditions, so
a wide flat rail can meet the 4-to-6 1/4 in perimeter and fail the 2 1/4 in cross section; both are pinned
failing alone, and the unused grip family reports `null` rather than a verdict.

**The extensions are asymmetric, and that is the part that gets built wrong.** At the top of a stair the
rail extends a flat **12 in** horizontally from directly above the first riser nosing. At the bottom it
extends **at the slope of the flight for one tread depth** -- a function of the stair rather than a fixed
number. The cross-check fixture is a 13 in tread, where the assumed 12 in is an inch short at the bottom
while satisfying the top; on an 11 in tread the same 12 in is an inch wasted, and the tile prices the
difference in both directions. At a ramp both ends take the flat 12 in and the tread does not enter at all.

**The clearance behind the grip** is 1 1/2 in, and the note names the failure mode: a wall-mounted bracket
eats it without anyone noticing, because the rail looks clear until a hand wraps it.

## 3. Scope

A handrail dimension screen, not a stair design. Not checked: continuity under 505.6 along the tops and
sides of the gripping surface; whether handrails are required on this run and on how many sides; the 505.10
exceptions, including aisle handrails and extensions that would be hazardous or intrude into a circulation
path; structural capacity, which is a code load case rather than a dimension; the stair or ramp itself --
riser, tread, nosing profile, slope, landings, cross slope; guards, which are a different element; and state
and local accessibility law and the building code, which sets its own handrail rules for different reasons.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `guard-handrail-check`, `ada-ramp-slope`,
`stair-stringer-layout`, and `landing-check`. The tools-data row sits inside the parsed Group E block, which
has no exact count assertion. Fuzzer pins both fixtures, the height range at six points with the too-high
flag, the clearance seam with an exact deficit, the circular window at six diameters with too-fat
distinguished from too-thin and the non-monotonicity pinned directly, both non-circular conditions failing
alone with a wide flat rail proving they are independent, `null` for the unused grip family, the tread-driven
bottom extension at five tread depths with a hundredth short failing, the 12-in top extension never varying,
the ramp case ignoring the tread entirely, exact non-negative deficits with each end failing alone, all four
checks failing independently, and every error seam.
