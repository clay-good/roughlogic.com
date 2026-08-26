# roughlogic.com Specification v1397 -- Map Scale: Distance, Area, and Representative Fraction (calc-field.js, Group P, field, backcountry, and SAR, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-field.js`**
> (Group P, field, backcountry, and SAR), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group P navigates by UTM, declination, pacing, and Naismith's rule but has no map-scale tile. Converting a measured distance on paper into ground distance, and a measured area into acres, is the most basic map skill there is, and the area conversion -- where the scale enters squared -- is the one people get wrong by a factor of thousands.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive representative fraction, measured length, or measured area, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the representative-fraction scale definition and the squared relationship for areas, with the standard USGS quadrangle scales, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `map-scale-conversion` -- Map Scale: Distance, Area, and Representative Fraction

```
ground ft per map inch = RF / 12
ground distance        = measured inches x RF / 12
ground area            = measured square inches x (RF / 12)^2
acres per square inch  = (RF / 12)^2 / 43,560
```

A representative fraction of 1:24,000 means one unit on the map is 24,000 of the same units on the ground -- and
because the fraction is unitless, the conversion to feet per inch is just dividing by twelve. The standard USGS
7.5-minute quadrangle at 1:24,000 gives 2,000 ft per inch, which is where the old "one inch equals about a third
of a mile" rule comes from.

Area is where it goes wrong. Scale enters area *squared*, so a map at twice the scale denominator does not cover
twice the ground per square inch, it covers four times. On a 1:24,000 quad one square inch is nearly 92 acres; on
a 1:100,000 sheet the same square inch is over 1,590 acres, seventeen times more, for a scale that is only about
four times smaller. Anyone estimating a burn area, a search segment, or a parcel off a map without squaring the
scale will be off by a large multiple.

**Inputs:** representative fraction (or a stated scale such as 1 in = 200 ft), measured map distance (in),
measured map area (sq in).

**Outputs:** ground feet per map inch, ground distance in feet and miles, ground area in square feet and acres,
and acres per square inch at that scale.

## 3. Worked example

A 1:24,000 USGS quadrangle, with 3.5 in measured along a route and a 2.4 sq in polygon planimetered off it:

```
ft per inch = 24,000 / 12          = 2,000 ft
distance    = 3.5 x 2,000          = 7,000 ft = 1.33 mi
acres/sq in = 2,000^2 / 43,560     = 91.83 acres
area        = 2.4 x 91.83          = 220.4 acres
```

Now take the same 2.4 sq in off a 1:100,000 sheet: `(100,000/12)^2 / 43,560 = 1,594` acres per square inch, so
the polygon is 3,826 acres -- seventeen times the area, from the same pencil marks. The scale is not a detail.

## 4. Scope and non-goals

Planimetric conversion on a flat map. It does not account for terrain: a route crossing steep ground is longer on
the ground than on the map, and the catalog's slope-distance and hiking-time tiles are where that is handled. Map
scale is exact only on the projection's standard lines; on a small-scale map the scale varies measurably across
the sheet, and on a large-scale quad it does not. Paper maps stretch and photocopies rescale, so measure the
printed bar scale rather than trusting the printed fraction. The map's own scale bar and datum govern.
