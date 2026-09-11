# roughlogic.com Specification v1792 -- Landfill Daily Cover Soil Volume (`calc-waste.js`, Group M Water and Wastewater Operations, solid waste and landfill operations, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-waste.js`**
> (Group M Water and Wastewater Operations, hub `/groups/water/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Six inches of soil over the working face every night is a regulatory requirement, and it is also airspace the site can never sell. Over a year it is a meaningful fraction of the permitted volume, which is the whole economic case for an alternative cover.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive face area, cover depth, operating day count, or airspace value, or a negative alternative cover cost returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the daily cover volume takeoff and published cover airspace ranges with the operating permit and the state solid waste regulations named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`daily cover soil volume`, `landfill adc alternative daily cover`, `cover soil airspace cost`, `working face cover quantity`, `six inch daily cover`.

## 2. The tile

### 2.1 `daily-cover-volume` -- Landfill Daily Cover Soil Volume

```
requirement      six inches of earthen cover at the end of each operating day is
                 the common federal and state baseline; the approved permit is what
                 actually governs a given site
volume           cy/day = working face area x depth in feet / 27
annual           cy/day x operating days
airspace cost    the soil occupies permitted volume; at the site's airspace unit
                 value that is a real annual expense (`landfill-airspace-density`)
share            daily and intermediate cover commonly consume 15 to 25% of the
                 airspace a site spends
alternative      tarps, foams, sprays, and geosynthetic blankets are removable and
daily cover      consume no airspace, but each needs state approval as an ADC
what it is for   vectors, litter, odour, fire, and scavenging -- the cover is a
                 control measure, not merely a quantity
```

Daily cover is one of the few places a landfill pays twice for the same thing. The soil has to be bought or
borrowed, hauled, placed, and compacted, which is an operating cost; and it then occupies permitted volume
that would otherwise have held revenue-producing waste, which is a capital cost. The second is usually the
larger of the two and it does not appear on any daily cost report.

The working face area is the controlled variable and it controls several things at once. A smaller face takes
less cover, generates less leachate (`leachate-water-balance`), blows less litter, and is easier to compact
properly; a larger face is convenient for traffic and forgiving of a busy day. Sites choose a face size and
then discover it is the number driving several unrelated line items.

Alternative daily cover converts a capital cost into an operating one, which is why it is adopted almost
universally where it is permitted. A tarp that is pulled back each morning consumes no airspace at all, and the
saving is the airspace value of the soil it replaces. It is not automatic: a state has to approve the material
as meeting the cover's purpose, and some sites are required to place earthen cover regardless.

**Inputs:** the working face dimensions or area, the cover depth, the operating days per year, the airspace unit value, the annual waste tonnage and in-place density, and the annual cost of an alternative cover

**Outputs:** the cover volume per day and per year, its share of the total airspace consumed, the annual airspace value of the cover soil, the saving an alternative daily cover would produce, and the net after the alternative cover's own cost

## 3. Worked example

A 100 by 150 ft working face covered 6 in deep each night, 312 operating days a year:

```
face area = 100 x 150 = 15,000 sq ft
per day   = 15,000 x 0.50 / 27 = 277.8 cy
per year  = 277.8 x 312 = 86,667 cy
```

**86,667 cubic yards of soil a year, placed and then permanently buried.** Against the
416,667 cy of waste airspace this site consumes at 0.60 tons per cubic yard, that is:

```
share = 86,667 / (416,667 + 86,667) = 17.2% of everything consumed
```

**17% of the site's airspace is dirt.** At $8 a cubic yard of committed airspace:

```
annual airspace value = 86,667 x $8 = $693,333
```

**$693,333 a year, spent on soil**, before the cost of buying, hauling, and placing it.

**An approved alternative daily cover recovers nearly all of it.** A tarp system costing $5,000 a year to
buy and operate:

```
net saving = $693,333 - $5,000 = $688,333 per year
```

**$688,333 a year**, and the airspace it frees is 86,667 cy -- roughly 52,000 tons of additional
capacity at this site's density, or **about 0.21 years of extra site life for every year the tarp is used.**

**The cover is doing a job, though, and the arithmetic does not excuse it from doing it.** Vector, litter,
odour, fire, and scavenging control are why the requirement exists, and an alternative has to be approved as
meeting those purposes before any of this saving is available.

## 4. Scope and non-goals

A quantity and cost calculation. The cover requirement, the acceptable depth, and whether an alternative daily cover may be used at all are set by the operating permit and the state's solid waste rules, which vary substantially -- some states approve a long list of alternative covers, some approve few, and some require earthen cover under stated conditions regardless. The working face area is entered and in practice varies day to day with tonnage, weather, and traffic. It does not address the cover's function: vector, litter, odour, fire, and scavenging control are the reasons the requirement exists, and an alternative that saves airspace while failing those is not a saving. It does not account for intermediate cover, which is thicker, stays longer, and consumes more airspace again, or for the cover soil's effect on gas migration, leachate perching, and slope stability within the fill, which are engineering consequences of layering soil through a waste mass. It does not price the soil itself or the equipment and labour to place it. The operating permit, the state solid waste regulations, and the site engineer govern.
