# roughlogic.com Specification v1905 -- USACE Emergency Earth Levee Section and Seepage Creep Check (`calc-floodfight.js`, Group G Cross-Trade Utilities, flood fight, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-floodfight.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** An emergency earth levee is built to a handful of USACE rules -- side slopes by material, a top width, and on a pervious foundation a minimum base width against seepage -- and the base width that satisfies the slopes can be half what the seepage rule requires. `windrow-stockpile-volume` gives the volume of a trapezoid; no tile applies the levee rules or the creep check.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive height, top width, length, or slope ratio returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): USACE St. Paul District, *Flood Fight Handbook* (2016), Section 3.3 (emergency levee sections by foundation and fill material, and the creep ratio criterion L = C x H with C = 9 for fine gravel and 15 for fine sand), named as the method, the USACE district and the local emergency manager named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`emergency levee design`, `earth levee cross section`, `levee fill yards`, `levee creep ratio`, `flood fight levee`.

## 2. The tile

### 2.1 `emergency-earth-levee-section` -- USACE Emergency Earth Levee Section and Seepage Creep Check

```
sections   sand fill:  1V:3H riverside, 1V:5H landside, 10 ft top width
           clay fill:  1V:2.5H both sides (top width entered; 10 ft default)
base       B = top + (z_river + z_land) x H
fill       (top + B) / 2 x H x length / 27  (cubic yards, in place)
creep      clay section on a SAND foundation: bottom width L >= C x H
           C = 9 fine gravel, 15 fine sand
           short -> a berm, 3 ft or thicker, on the land or river side to
           lengthen the seepage path
```

The handbook gives each combination of fill and foundation its own section. Sand fill is flatter because it is
weaker and more pervious -- one on three toward the river, one on five toward the land -- with a ten-foot top that
leaves room for equipment to raise it if the crest forecast rises. Clay fill stands steeper at one on two and a half.
The tile builds the section, reports the base width and the fill volume per length, and lets the top width change for
the equipment on hand.

The creep criterion is the part that decides whether the section is adequate at all. Water under head seeps through a
sand foundation beneath the levee, and if the path is too short it carries soil with it and the levee fails from below
-- the sand boils that flood fighters watch for. The handbook sets the minimum path as a multiple of the head: nine
times the height over fine gravel and fifteen over fine sand. A steep clay section on a sand foundation often falls
short, and the handbook's remedy is a berm that lengthens the path without raising the levee. The tile reports the
shortfall as the berm width needed.

The fill volume is in-place; loose or truck volume is larger by the soil's swell, which `dump-truck-loads` and the
earthwork tiles handle.

**Inputs:** the levee height, the fill material, the foundation material, the top width, and the length

**Outputs:** the side slopes, the base width, the cross-section area, the fill volume in cubic yards, the creep check (where it applies) with the required bottom width and the berm shortfall

## 3. Worked example

A 4 ft emergency levee, 100 ft long:

```
sand fill      B = 10 + (3 + 5) x 4 = 42 ft
               area = (10 + 42) / 2 x 4 = 104 sq ft
               fill = 104 x 100 / 27 = 385.2 cy per 100 ft
clay fill      B = 10 + (2.5 + 2.5) x 4 = 30 ft
               area = 80 sq ft   fill = 296.3 cy per 100 ft
```

**The clay section saves almost 90 cubic yards per 100 ft.**

**But on a fine-sand foundation the clay section needs a creep check:**

```
required  L = 15 x 4 = 60 ft
provided  30 ft          shortfall 30 ft -> a berm 3 ft or thicker
```

**The clay levee's base is half what the seepage path requires** -- a 30 ft berm is needed, and the fill it takes can
erase the saving. On fine gravel the requirement is 9 x 4 = 36 ft, still 6 ft short.

## 4. Scope and non-goals

A section-geometry and creep-ratio check to the USACE emergency flood fight rules. It does not design a permanent levee, analyse slope stability or through-seepage, address clay layers over sand (which the handbook notes may need a berm against rupture), compaction, or the design of the berm beyond its length. The crest height comes from the forecast plus freeboard, which officials set. It does not count sandbags (`sandbag-levee-quantity`). The USACE Flood Fight Handbook, the USACE district, and the local emergency manager govern.
