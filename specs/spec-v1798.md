# roughlogic.com Specification v1798 -- Collection Vehicle Payload and Compaction Ratio (`calc-waste.js`, Group J Trucking and Logistics, solid waste collection and transfer, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-waste.js`**
> (Group J Trucking and Logistics, hub `/groups/trucking/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A refuse body is sized in cubic yards and a chassis is limited in pounds, and on a single-axle truck the pounds run out first. The crew fills the body because that is what they can see, and the truck crosses the scale overweight.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive body volume, loose density, compaction ratio, or gross vehicle weight rating, or a tare weight at or above the rating returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the payload comparison between volumetric and chassis capacity with the vehicle manufacturer's ratings and the applicable weight limits named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`refuse truck payload`, `collection vehicle compaction ratio`, `garbage truck overweight axle`, `refuse body cubic yards payload`, `gvwr refuse collection`.

## 2. The tile

### 2.1 `collection-vehicle-payload` -- Collection Vehicle Payload and Compaction Ratio

```
loose density    waste as set out, roughly 150 to 250 lb per cubic yard
compaction ratio the body's packer achieves roughly 2:1 to 4:1 on ordinary
                 residential waste; wet or dense waste compacts less
in-body density  loose density x compaction ratio
body payload     body cubic yards x in-body density -- what the BODY will hold
chassis payload  GVWR - tare weight -- what the TRUCK may legally carry
governing        the LOWER of the two; on many single-axle bodies it is the chassis
fill to legal    chassis payload / in-body density, in cubic yards -- commonly well
                 short of a full body
axle limits      GVWR is not the only limit; individual axle ratings and the bridge
                 formula apply, and a rear-loaded body loads the rear axle hardest
```

Volume is visible and weight is not, which is the whole reason this goes wrong. A crew can see the body filling
and has no instrument telling them what it weighs, so the natural stopping point is a full body. On a truck
whose chassis runs out before its body does, the natural stopping point is overweight, and the first
indication is a scale ticket or an enforcement stop.

Whether the body or the chassis governs is a specification decision made when the truck was ordered, and it
can go either way. A large body on a single rear axle is chassis-limited and will never be filled legally. A
tandem chassis under a modest body is volume-limited and will be filled every time without approaching its
weight rating. Matching the two is the point of the specification, and a mismatched truck wastes either
capacity or compliance for its whole service life.

Waste density is the variable that moves the boundary underneath a fleet. Wet weeks, yard waste season, a
change in what is collected separately, or a route with different housing all change the loose density and the
compaction the packer achieves, so a truck that is comfortably volume-limited in January can be weight-limited
in May with nothing altered. That is why scale data by route matters more than a nameplate capacity.

**Inputs:** the body volume, the loose waste density, the packer's compaction ratio, the chassis gross vehicle weight rating and tare weight, and optionally a second chassis and body for comparison

**Outputs:** the in-body density, the body's volumetric payload, the chassis legal payload, which of the two governs, the body volume that corresponds to the legal payload, the overload a full body would produce, and the same comparison for a second configuration

## 3. Worked example

A 25 cy body on a single rear axle chassis, 200 lb per cubic yard loose at 3:1 compaction:

```
in-body density = 200 x 3 = 600 lb/cy
body payload    = 25 x 600 = 15,000 lb = 7.5 tons
chassis payload = 33,000 GVWR - 21,000 tare = 12,000 lb = 6.0 tons
```

**The body holds 7.5 tons and the truck may carry 6.0.** The chassis governs, by 3,000 lb.

**So the legal fill is not a full body:**

```
fill to legal = 12,000 / 600 = 20.0 cy = 80% of the body
```

**80% of a body that looks nowhere near full.** A crew filling to the pack panel puts
3,000 lb over the rating on the road -- **9 percent overweight**, with no gauge, no warning, and nothing
visible to say so.

**Specify the chassis and the body together and the problem disappears.** A tandem at 54,000 lb GVWR and
28,000 lb tare under a 31 cy body:

```
chassis payload = 26,000 lb = 13.0 tons
body payload    = 31 x 600 = 18,600 lb = 9.3 tons
```

**Now the BODY governs**, at 9.3 tons against 13.0 tons of legal capacity. **The crew can fill it completely
and the truck is still 7,400 lb inside its rating** -- which is the configuration to buy, because it
removes the judgement from the crew entirely.

**And the boundary moves with the weather.** Wet waste at 250 lb per cubic yard loose takes the single-axle
truck's legal fill down to 16.0 cy, **20 percent less body than in a dry week**, with nothing about
the truck or the route changed.

## 4. Scope and non-goals

A payload comparison. Loose density and compaction ratio are entered and both vary substantially with the waste stream, the season, the moisture, the collection method, and the packer's condition -- route scale data is the only reliable source, and a nameplate compaction ratio is a marketing figure achieved under favourable conditions. Gross vehicle weight rating is not the only legal limit: individual axle ratings, the federal bridge formula, state and local weight limits, seasonal frost-law restrictions, and posted bridge limits all apply, and a vehicle inside its GVWR can still be over an axle limit because a rear-loaded body distributes weight unevenly. Tare weight changes over a vehicle's life with equipment, fuel, and accumulated material in the body, and a truck weighed empty at delivery is not the truck on the road. It does not address route design or the number of loads a route requires (`collection-route-productivity`), vehicle specification beyond the weight comparison, or the operational and safety consequences of running overweight. The vehicle manufacturer's ratings, the applicable federal, state, and local weight limits, the fleet's own scale records, and the fleet manager govern.
