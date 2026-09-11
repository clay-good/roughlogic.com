# roughlogic.com Specification v1789 -- Landfill Airspace Consumption and In-Place Density (`calc-waste.js`, Group M Water and Wastewater Operations, solid waste and landfill operations, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-waste.js`**
> (Group M Water and Wastewater Operations, hub `/groups/water/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A landfill sells tonnage and spends airspace, and the exchange rate between them is the in-place density the compactor achieves. It is the single most valuable operating number on the site and it is set by how many passes the operator makes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive tonnage, density, or airspace value, or a negative cover ratio returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the airspace utilisation convention and published in-place density ranges for municipal solid waste with the site's own survey and scale records and the operating permit named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`landfill airspace consumption`, `in place density msw`, `airspace utilization factor`, `landfill compaction density`, `waste density pounds per cubic yard`.

## 2. The tile

### 2.1 `landfill-airspace-density` -- Landfill Airspace Consumption and In-Place Density

```
in-place density the compacted density achieved in the fill, commonly 1,000 to
                 1,600 lb per cubic yard; it is an OPERATING result, not a
                 property of the waste
waste airspace   cubic yards = tons / density in tons per cubic yard
cover airspace   daily and intermediate cover occupy airspace too, commonly 15 to
                 25% on top of the waste (`daily-cover-volume`)
total consumed   waste airspace + cover airspace
airspace         AUF = tons placed / total airspace consumed, the figure a site
utilisation      reports and benchmarks against
airspace value   the construction, cover, closure, and post-care cost the site has
                 committed per cubic yard -- typically several dollars
what moves it    compactor weight, number of passes, lift thickness, and moisture;
                 passes are the lever the operator controls daily
```

Airspace is the asset and tonnage is only the revenue, which is the reversal that makes this the most important
number at a landfill. A permitted site has a finite volume, and every cubic yard spent is gone; the waste that
fills it can be dense or loose, and the difference decides how many years of revenue the same hole produces.
A site that improves its density has extended its life without buying land, obtaining a permit, or building a
cell.

Density is an operating achievement rather than a property of the material. The same waste stream compacts to
very different densities depending on the machine's weight, the number of passes, the thickness of the lift,
and how wet the waste is -- so the number is a report card on the working face rather than a description of the
garbage. That is why a site tracks it weekly and why a compactor operator's habits are worth money.

Cover has to be counted alongside the waste or the arithmetic flatters the site. Soil placed daily takes up
airspace that could have held waste, and at ordinary cover ratios it is a substantial share of everything
consumed. A site reporting density on waste alone and capacity on total volume is mixing two bases and will
run out of airspace earlier than its projections say.

**Inputs:** the annual or cumulative tonnage, the in-place density, the cover to waste volume ratio, the airspace unit value, and optionally a second density for comparison

**Outputs:** the waste airspace consumed, the cover airspace, the total airspace, the airspace utilisation factor, the same figures at an improved density, the airspace saved, and its value

## 3. Worked example

A site placing 250,000 tons a year at 1,200 lb per cubic yard, with cover at 20% of the waste volume:

```
waste airspace = 250,000 / 0.60 = 416,667 cy
cover airspace = 416,667 x 0.20 = 83,333 cy
total          = 500,000 cy
AUF            = 250,000 / 500,000 = 0.500 tons per cy
```

**Now put two more passes on with the same compactor and reach 1,500 lb per cubic yard:**

```
waste airspace = 250,000 / 0.75 = 333,333 cy
cover airspace = 66,667 cy
total          = 400,000 cy
AUF            = 0.625 tons per cy
```

**100,000 cubic yards saved in a single year -- 20 percent of the airspace this site would otherwise have
spent**, for no capital and no permit, from a 25 percent improvement in compaction.

**At $8 a cubic yard of committed airspace cost that is worth $800,000 a year:**

```
value = 100,000 cy x $8 = $800,000
```

**Every year, from the working face.** No other decision on the site returns that much for that little, which is
why density is reported weekly and why a compactor operator making four passes instead of three is a
measurable line on the financial statement.

**And the cover is not a rounding item.** 83,333 cubic yards is 17 percent of everything consumed -- soil
occupying space that could have held waste, which is the whole case for alternative daily cover
(`daily-cover-volume`).

## 4. Scope and non-goals

A capacity accounting calculation. In-place density is entered and must be measured, not assumed: the reliable methods are a survey of the fill volume against scale-house tonnage over a period, or aerial and drone photogrammetry, and a density taken from a table is a placeholder. It varies across a site, between seasons, with the waste stream's composition and moisture, and with the operator on the machine. The cover ratio is likewise a site-specific measured figure. It does not account for settlement, which recovers airspace over time and is a separate calculation (`landfill-settlement-airspace`), nor for the volume occupied by the liner, the leachate collection layer, the gas collection system, or the final cap, all of which come out of the permitted volume before any waste is placed. It does not compute remaining site life, which depends on the permitted volume, the approved grades, and the tonnage forecast, and it takes no position on the airspace unit value, which is an accounting judgement about construction, closure, and post-closure care. The site's own survey and scale records, the operating permit and approved fill plan, and the site engineer govern.
