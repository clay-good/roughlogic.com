# roughlogic.com Specification v1824 -- Hot-Dip Galvanised Coating Weight and Thickness (`calc-finishing.js`, Group G Cross-Trade Utilities, metal finishing and galvanizing, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finishing.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A galvanised coating is specified in microns and bought in pounds of zinc, and the two are joined by a fixed density. Because the zinc follows surface area and the job is priced by weight, light sections consume several times the zinc per ton that heavy ones do.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive coating thickness, tonnage, or surface area per ton returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the zinc density conversion and ASTM A123 coating grades with ASTM A123 and the fabricator's own surface area takeoff named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`galvanized coating weight`, `astm a123 coating grade microns`, `zinc pickup per ton steel`, `oz per square foot galvanizing`, `surface area per ton structural steel`.

## 2. The tile

### 2.1 `galvanize-coating-weight` -- Hot-Dip Galvanised Coating Weight and Thickness

```
the conversion   zinc density fixes it: 1 mil over 1 sq ft is 0.5940 oz of zinc
coating grade    ASTM A123 specifies coating thickness in microns by material
                 category and steel thickness; grade 85 is 85 microns
thickness        mils = microns / 25.4
coating weight   oz per sq ft = mils x 0.5940
zinc for a job   surface area x coating weight; the AREA is what consumes zinc
surface per ton  the variable that decides everything: roughly 100 to 150 sq ft
                 per ton for heavy structural shapes and 300 to 500 for light
                 angle, grating, and fabricated assemblies
zinc pickup      zinc weight as a percentage of steel weight; it is a
                 SURFACE-AREA quantity reported against a WEIGHT basis
what it is not   a uniform coating; A123 thickness is an average with minimums,
                 and corners, edges, and thick sections differ
```

Coating weight and coating thickness are the same statement in different units, and the conversion is a
material constant rather than a process figure. Zinc has a fixed density, so a mil of it over a square foot
weighs what it weighs regardless of how it got there. Specifications use thickness because that is what
corrosion life depends on and what a magnetic gauge measures; galvanizers think in weight because that is what
they buy and what they lose to the kettle.

The economics of the trade sit entirely in the surface-area-to-weight ratio, and it is why galvanizing prices
look strange to fabricators. A galvanizer's zinc consumption, kettle time, and handling all track surface area,
while the customer's purchase order is written in tons. Two loads of identical weight can differ by a factor of
three or four in the zinc they take, which is why light sections, grating, and thin fabricated assemblies carry
different pricing and why minimum charges exist.

Thickness is specified as an average with a minimum, not as a uniform value, and that is a property of the
process rather than a tolerance. The coating forms by reaction between molten zinc and steel, and its thickness
depends on the steel's silicon and phosphorus content, its thickness, the bath temperature, and the immersion
time. Reactive steels grow thick dull-grey coatings that meet the specification and do not look like the
bright ones beside them, and that is metallurgy rather than a defect.

**Inputs:** the specified coating grade in microns or the coating weight, the steel tonnage, the surface area per ton, and optionally a second surface-area-to-weight ratio for comparison

**Outputs:** the coating thickness in mils, the coating weight in ounces per square foot, the total surface area, the zinc required for the job, the zinc pickup as a percentage of steel weight, and the same pickup for a heavier section

## 3. Worked example

A 5 ton load of light angle specified to ASTM A123 grade 85, at 400 sq ft per ton:

```
thickness = 85 / 25.4 = 3.35 mils
weight    = 3.35 x 0.5940 = 1.99 oz per sq ft
area      = 5 x 400 = 2,000 sq ft
zinc      = 2,000 x 1.99 / 16 = 248 lb
pickup    = 248 / 10,000 = 2.48% of the steel weight
```

**Now run the same grade on heavy structural shapes at 120 sq ft per ton:**

```
per ton: zinc = 120 x 1.99 / 16 = 14.9 lb, pickup = 0.75%
light:   zinc = 50 lb per ton, pickup = 2.48%
```

**3.3 times the zinc per ton, for the same specification and the same grade of coating.** The steel weighs
the same, the coating is the same thickness, and **the light load consumes 35 more pounds of zinc for every
ton through the kettle.**

**That is why galvanising prices look strange to a fabricator.** The purchase order is written in tons and the
galvanizer's cost is in square feet -- zinc, kettle time, handling, and racking all follow area. **Two loads of
identical weight can differ by a factor of three or four in what they cost to coat**, which is what minimum
charges and light-section pricing exist to recover.

**And the coating is an average, not a uniform value.** A123 specifies a mean thickness with minimums, and the
coating grows by reaction with the steel -- so **a silicon-reactive steel produces a thick, dull grey coating
that meets the specification and looks nothing like the bright pieces beside it on the same rack.** That is
metallurgy, not a defect, and it is the single most common galvanising complaint.

## 4. Scope and non-goals

A quantity and conversion calculation. Surface area per ton is entered and is the dominant input: it must come from the fabricator's own takeoff or the galvanizer's estimate for the actual pieces, since the range across real work spans a factor of four or more and no table substitutes for the drawings. It does not specify the coating: ASTM A123 assigns a coating grade from the material category and the steel thickness, with different requirements for fasteners under A153 and for sheet under other standards, and the specification governs. It does not predict the coating thickness achieved, which depends on the steel's silicon and phosphorus content, the bath temperature and chemistry, immersion time, and withdrawal rate, and which is measured on the finished work rather than calculated. It does not address the galvanizer's total zinc consumption, which includes kettle losses to dross, ash, and skimmings well beyond what leaves on the steel, or the design requirements for venting and draining holes, distortion, warping, and embrittlement that govern whether a fabrication can be galvanised at all. ASTM A123 and the applicable coating standard, the fabricator's own surface area takeoff, and the galvanizer govern.
