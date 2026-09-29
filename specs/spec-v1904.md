# roughlogic.com Specification v1904 -- USACE Sandbag Levee Bags and Sand (`calc-floodfight.js`, Group G Cross-Trade Utilities, flood fight, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-floodfight.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** The first order a flood fight places is for sandbags and sand, and the count rises with the square of the height -- a 3 ft wall takes more than seven times the bags of a 1 ft wall per foot. Nothing in the catalog mentions sandbags or levees.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive height, length, or bag fill weight returns `{ error }`; a height above 5 ft returns the bags with a flag that 5 ft is the practical limit; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): USACE St. Paul District, *Flood Fight Handbook* (2016), Sections 2.3 and 2.5 and Table 2.1, and the USACE sandbag guidance of about 40 lb of sand per bag, named as the method, the local emergency manager and the USACE district named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`how many sandbags`, `sandbag wall calculator`, `sandbag levee quantity`, `tons of sand for sandbags`, `flood sandbags per foot`.

## 2. The tile

### 2.1 `sandbag-levee-quantity` -- USACE Sandbag Levee Bags and Sand

```
bags per ft    N = 1.5 H + 4.5 H^2      (H in ft; reproduces USACE Table 2.1
                                          exactly: 6, 21, 45, 78, 120 bags/ft
                                          at 1-5 ft)
total bags     N x levee length
sand           bags x fill weight (default 40 lb) / 2,000 = tons
base width     3 x H (the levee's base is three times its height)
limits         3 ft preferred maximum; 5 ft practical limit -- above it, use
               another method
```

A sandbag levee is a pyramid, so its cross-section grows with the square of its height. The USACE table gives the
bags per linear foot for heights of one to five feet, and the quadratic fits every row exactly: a term for the cap and
a term for the triangular body. Written as a formula, the table extends to any length and to intermediate heights
without interpolation, and it shows why raising a levee is so expensive -- the third foot costs 24 bags per foot and the
fifth costs 42.

The base is three times the height, which is what gives the levee its stability, and the tile reports it so that the
footprint is known before bagging starts: a 3 ft levee needs 9 ft of ground, which is often more than the space between
a house and a property line. The handbook's preferred limit is 3 ft and its practical limit 5 ft; above that, sandbags are
the wrong tool and an earth levee (`emergency-earth-levee-section`) or a manufactured barrier is used instead.

Sand is ordered by the ton, so the tile converts bags to tons at the fill weight. Bags are filled one-half to
two-thirds full, about 35 to 40 lb; the 40 lb default keeps them light enough to pass hand to hand for hours, and a
heavier fill wears out a volunteer line.

**Inputs:** the levee height, the levee length, and the bag fill weight

**Outputs:** the bags per linear foot, the total bags, the tons of sand, the base width, and the height flag

## 3. Worked example

A 3 ft sandbag levee 500 ft long in front of a neighbourhood:

```
bags per ft  1.5 x 3 + 4.5 x 9 = 4.5 + 40.5 = 45
total        45 x 500 = 22,500 bags
sand         22,500 x 40 / 2,000 = 450 tons
base         3 x 3 = 9 ft
```

**22,500 bags and 450 tons of sand** -- which matches the USACE figure for a levee of this size -- on a 9 ft wide
footprint.

**The same length at 2 ft:** 21 x 500 = 10,500 bags, 210 tons. **One foot less height saves more than half the bags.**
That is why the height is set from the forecast crest plus freeboard, not rounded up for comfort.

## 4. Scope and non-goals

A quantity estimate for a sandbag levee built to the USACE cross-section. It does not assess the foundation, seepage and sand boils, the levee's stability against the water load (`flood-lateral-load`), or the forecast crest and freeboard, which the National Weather Service and local officials provide. It does not count labour, filling equipment, plastic sheeting, or bag type, and it does not apply to single-row sandbag walls against a structure. The USACE Flood Fight Handbook, the local emergency manager, and the USACE district govern.
