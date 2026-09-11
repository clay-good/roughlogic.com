# roughlogic.com Specification v1791 -- Leachate Generation from a Water Balance (`calc-waste.js`, Group M Water and Wastewater Operations, solid waste and landfill operations, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-waste.js`**
> (Group M Water and Wastewater Operations, hub `/groups/water/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Leachate is rainfall that got into the waste, so the quantity is a water balance over the open area and nothing else. The working face is the whole problem, and the peak after a storm is many times the average the treatment system was sized on.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive area, precipitation, or storm depth, runoff and evapotranspiration coefficients summing to 1 or more, or a negative capped infiltration rate returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the landfill water-balance relation and published runoff and evapotranspiration ranges with the HELP model and the site's own leachate records named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`leachate generation rate`, `landfill water balance`, `leachate per acre per day`, `open cell infiltration landfill`, `leachate storage sizing`.

## 2. The tile

### 2.1 `leachate-water-balance` -- Leachate Generation from a Water Balance

```
water balance    infiltration = precipitation - runoff - evapotranspiration,
                 applied over the area that is OPEN to the weather
runoff           a waste surface sheds poorly; 10 to 25% is typical against 60 to
                 90% on a capped and vegetated slope
evapotranspiration 25 to 40% of precipitation on an open working area, more in a
                 hot dry climate and far more under vegetation
volume           gal = infiltration (in) / 12 x area (sq ft) x 7.48
open vs capped   a final cap cuts infiltration by an order of magnitude; the
                 difference between an open cell and a capped one IS the design
peak             a single large storm delivers many days of average flow at once,
                 and storage rather than treatment capacity absorbs it
other sources    the waste's own moisture, consolidation water, and any liquids
                 accepted add to the rainfall term
```

Leachate quantity is an area problem and area is the only variable the site controls. The rainfall is what it
is and the runoff and evapotranspiration coefficients move within narrow bands, so the operating lever is how
many acres are open to the sky at any moment. A site that keeps its working face small and caps behind it
generates a fraction of the leachate of one that opens a large cell and fills it slowly, and that is an
operating discipline rather than an engineering feature.

The cap is the single largest intervention available and its effect is not incremental. An engineered final
cover takes infiltration from tens of inches a year to a couple, so closing an area converts it from the
site's dominant leachate source to a negligible one. That is why capping is sequenced as cells fill rather
than deferred to closure, and why deferring it is a decision to treat leachate for as long as the deferral
lasts.

Storage is what handles storms, not treatment capacity. Treatment plants are sized near an average and cannot
usefully be sized near a peak that occurs a few times a year, so the design pairs modest treatment with enough
tankage or pond volume to ride through an event and draw down afterwards. A site whose storage is sized on the
average discovers the difference during the first large storm, and the consequence is a discharge that was
not permitted.

**Inputs:** the open area, the annual precipitation, the runoff and evapotranspiration coefficients, the capped-area infiltration rate, and a design storm depth

**Outputs:** the annual infiltration depth, the leachate volume per year and per day, the rate per acre per day, the volume from a capped area of the same size, the reduction capping achieves, and the volume a design storm delivers

## 3. Worked example

A 20 acre open cell in a 40 in per year climate:

```
infiltration = 40 x (1 - 0.15 - 0.30) = 22 in/yr
area         = 20 ac x 43,560 = 871,200 sq ft
volume       = 22/12 x 871,200 x 7.48 = 11,947,887 gal/yr
             = 32,734 gpd, or 1,637 gpd per open acre
```

**1,637 gallons a day per open acre is the number to carry**, because it converts directly: every acre the
site opens adds that much to the treatment and hauling bill, and every acre it caps takes it away.

**Capping is not an improvement, it is a different order of magnitude:**

```
capped at 2 in/yr = 1,086,172 gal/yr = 2,976 gpd
```

**91 percent less leachate from the same 20 acres.** That is the entire case for capping cells as they
fill rather than at closure, and the cost of deferring a cap is 29,758 gallons a day of leachate
management for every year of the deferral.

**Now size the storage, not the plant.** A 2 in storm on the open cell:

```
2 in x (1 - 0.15 - 0.30) / 12 x 871,200 x 7.48 = 597,394 gal
```

**597,394 gallons from one storm, against a 32,734 gpd average -- 18 days of flow arriving in one.** A
treatment system sized on the average and given no storage has 18 days of catching up to do, and the
leachate has to be somewhere in the meantime. **Storage rides out the peak; treatment capacity cannot.**

## 4. Scope and non-goals

A planning-level water balance. It is a simple annual or event balance and not a soil-moisture routing model: the Hydrologic Evaluation of Landfill Performance model and its successors route precipitation through cover layers, drainage layers, and the waste itself on a daily time step, and they are what a permit application uses. Runoff and evapotranspiration coefficients are entered and vary with slope, cover material, vegetation, season, and storm intensity; the same site sheds very differently in summer and winter. It does not account for the waste's own moisture content and consolidation water, liquids accepted for disposal, run-on from adjacent areas, or the time lag between rainfall and leachate appearing at the sump, which can be months in a deep fill. It does not size the collection system, the sump, the pumps, the storage, or the treatment, address leachate strength and its variation with cell age, or take any position on discharge permits, pretreatment standards, or acceptance at a publicly owned treatment works. The HELP model or an equivalent routing analysis, the site's own measured leachate records, the operating and discharge permits, and the site engineer govern.
