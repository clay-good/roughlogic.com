# roughlogic.com Specification v1173 -- NFIP Flood Opening Area (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 90 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1172.md.
>
> **The gap.** A dupe scan for "flood vent", "flood opening", and "crawl space vent" returned zero hits.
> `crawl-space-ventilation` sizes net free area for moisture under the IRC; nothing covered the flood rule,
> which is a different number for a different reason and is what a flood elevation certificate turns on.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
opening type, a non-positive enclosed area, a non-integer or negative opening count, a negative or
non-finite bottom height, a non-positive net free area on the non-engineered path, or a non-positive
coverage on the engineered path return `{ error }`. Renderer: this module's `_simpleRenderer`. `check-module-sizes` cap for citations.js raised 640000 -> 700000 (the ADA/OSHA batch took it to 641,068 B gz, 100.2%).

**Source.** 44 CFR 60.3(c)(5), the NFIP floodplain management criteria. A US federal regulation in the
public domain, quoted directly and confirmed against two independent reproductions of the section text.

## 2. The tile

### 2.1 `flood-opening-area` -- NFIP Flood Opening Area (60.3(c)(5))

```
inputs:  enclosed_area_sf, opening_type (non-engineered|engineered),
         net_free_area_per_opening_sqin, coverage_sf_per_opening,
         openings_provided, bottom_height_in
compute: non-engineered -> required net area = 1 sq in per sq ft;
                           openings = max(2, ceil(required / net free area per opening))
         engineered     -> openings = max(2, ceil(area / certified coverage)); no square-inch rule
         bottom of all openings <= 12 in above grade
outputs: required_net_area_sqin, provided_net_area_sqin, net_area_deficit_sqin,
         openings_for_area, openings_required, count_governed_by_minimum, count_ok,
         openings_short, area_ok, coverage_provided_sf, height_ok, height_excess_in, passes, note
```

**Three requirements, missed three different ways.** *Net free area is not the size of the hole* -- a block
vent with a louver and an insect screen passes a fraction of its gross opening, so the figure has to come
off the product listing rather than a tape measure. The default example is a 1,200 sq ft crawl space needing
**1,200 sq in**, which at 51 sq in per vent is **24 openings** rather than the 8 provided -- and it fails a
second time on height, because 16 in is measured to the **bottom**, exactly where a vent in the second
course of block already sits. No amount of extra net area fixes that; an opening above the water does
nothing.

**The two-opening minimum is independent of the area.** The cross-check fixture is a single 250 sq in vent
in a 200 sq ft enclosure: the square inches are satisfied outright and it still fails, because the point of
two openings is cross-flow *through* the enclosure rather than throughput *into* it. The tile flags when
the minimum rather than the area is governing.

**Engineered openings are a different animal** and the square-inch rule does not apply to them at all --
they are certified for the square feet each serves. The tile reports `null` for the net-area figures on
that path rather than a misleading number, and still applies the two-opening minimum. The note adds the
practical corollary: an engineered vent without its certification is a hole in a wall.

**The fuzzer verifies the advice, not just the arithmetic:** at four area-and-vent combinations it feeds the
reported required count back in and asserts the result passes.

## 3. Scope

A vent-area screen, not a floodplain determination. Not checked: which grade governs where interior and
exterior differ, a question for the floodplain administrator; the placement of openings, where FEMA guidance
calls for them on at least two walls of each enclosure; whether each separate enclosed area has its own
openings, which it must, since a partition creates a second enclosure; whether the enclosure is used solely
for parking, access, or storage; the certified-design alternative 60.3(c)(5) permits in place of these
criteria; whether coverings permit **automatic** entry and exit, which rules out anything a person has to
open; and the local floodplain ordinance, frequently stricter than the federal minimum.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `crawl-space-ventilation`,
`attic-ventilation`, `sump-basin-sizing`, and `footing-area`. The tools-data row sits inside the parsed
Group E block, which has no exact count assertion. Fuzzer pins both fixtures, the square-inch rule at five
areas, the count at six area-and-vent pairs, the two-opening minimum with its governing flag in both
directions, monotonicity and the floor of two across 82 sampled areas, the required-count round trip at
four combinations, the engineered path with `null` net-area outputs and the minimum still applying, the
12-in height seam failing on its own however much area is provided, and every error seam.
