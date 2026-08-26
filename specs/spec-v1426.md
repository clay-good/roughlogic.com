# roughlogic.com Specification v1426 -- Glass Lite Wind Load, Deflection Limit, and Weight (calc-construction.js, Group E, specialty trades, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, specialty trades), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Glazing is not in the catalog at all. A glazier facing a large lite needs three numbers before ordering: the total wind load the lite has to carry, the deflection limit that governs the framing and the sealant, and the weight, which decides how it gets set. The thickness itself comes from a chart in a standard, and this tile is explicit that it does not replace that chart.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive lite dimension, design pressure, or glass thickness, or a deflection-limit divisor at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the glass-type strength factors of ASTM E1300 (annealed 1.0, heat-strengthened about 2, fully tempered about 4), the customary L/175 deflection limit for glass, and the nominal weight of soda-lime glass at about 13.1 lb per square foot per inch of thickness, cited by number and linked (no E1300 table is reproduced), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `glass-thickness-wind` -- Glass Lite Wind Load, Deflection Limit, and Weight

```
lite area          = width x height
total design load  = area x design wind pressure
aspect ratio       = long dimension / short dimension
deflection limit   = short span / limit divisor        (commonly L/175 for glass)
equivalent annealed pressure = design pressure / glass type factor
lite weight        = area x 13.1 lb/sq ft per inch x thickness
IGU weight         = sum of the lites plus the spacer and sealant allowance
```

Three separable questions, and only one of them needs a standard. **Load** is arithmetic: pressure times area, and
it is the number the framing, the anchors, and the structure behind them have to carry. **Deflection** governs the
glazing pocket and the sealant, because a lite that deflects past its bite comes out of the frame regardless of
whether it broke -- and the limit is set on the *short* span, which is where the curvature is. **Weight** decides
handling: a large insulating unit is a two-crew-and-a-vacuum-lifter problem long before it is a structural one,
and the catalog already has a suction-cup lifter tile that this feeds.

The glass-type factor is the fourth line and the honest one. Heat-strengthened glass carries roughly twice the
load of annealed at the same thickness, fully tempered roughly four times, and dividing the design pressure by the
factor gives the *equivalent annealed pressure* that a load-resistance chart is entered with. That chart is ASTM
E1300, it is a copyrighted compilation, and this tile does not reproduce it. It gets the reader to the door of the
chart with the right number in hand.

**Inputs:** lite width and height, design wind pressure (psf), glass type and its strength factor, deflection
limit divisor, glass thickness and number of lites.

**Outputs:** area, total design load, aspect ratio, allowable deflection, equivalent annealed pressure, lite and
assembly weight.

## 3. Worked example

A 5 ft x 8 ft lite of 1/4 in glass at a 30 psf design wind pressure:

```
area          = 40 sq ft
total load    = 40 x 30            = 1,200 lb on the frame and anchors
aspect ratio  = 8 / 5              = 1.6
deflection    = 60 in / 175        = 0.343 in allowable
weight        = 40 x 13.1 x 0.25   = 131 lb per lite; an IGU of two is about 275 lb with the spacer
```

Twelve hundred pounds into the perimeter framing, a third of an inch of allowable center deflection, and a unit
too heavy to set by hand. Then the type factor: at 30 psf design, annealed glass must be charted at 30 psf,
heat-strengthened at an equivalent 15 psf, and fully tempered at 7.5 psf -- which is usually the difference
between a thickness that is available and one that is not.

## 4. Scope and non-goals

**This tile does not select glass thickness.** Thickness comes from ASTM E1300's load-resistance charts, which
account for area, aspect ratio, support conditions, glass type, laminated and insulating construction, and the
probability of breakage the standard is written to -- none of which is reproducible by a formula and none of which
is reproduced here. It does not compute design wind pressure, which is an ASCE 7 calculation with exposure,
height, topographic, and component-and-cladding factors, and which for glazing includes the internal pressure and
the wind-borne debris provisions that govern in hurricane regions. It does not address glazing bite, setting
blocks, edge condition, thermal stress breakage, safety glazing requirements, or laminated interlayer behavior.
ASTM E1300, the glass fabricator, the structural engineer, and the AHJ govern.
