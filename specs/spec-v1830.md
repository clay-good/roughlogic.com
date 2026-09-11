# roughlogic.com Specification v1830 -- Barge Draft, Displacement, and Deck Load (`calc-marine.js`, Group K Mechanic - Auto, Marine, Aviation, marine construction and dredging, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-marine.js`**
> (Group K Mechanic - Auto, Marine, Aviation, hub `/groups/mechanic/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A box barge floats by displacing its own weight, so draft and load are the same statement. Tons per inch of immersion is the number a loading foreman needs, and the barge sinks further in fresh water for a load that floated correctly in salt.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive length, beam, depth, or density, a block coefficient outside 0 to 1, or a loaded draft at or above the depth returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the displacement and tons-per-inch relations for a box-form hull with the vessel's own capacity plan and stability letter named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`barge draft displacement`, `tons per inch immersion`, `deck barge cargo capacity`, `fresh water allowance draft`, `block coefficient barge`.

## 2. The tile

### 2.1 `barge-draft-displacement` -- Barge Draft, Displacement, and Deck Load

```
displacement     the weight of water displaced equals the weight of the vessel:
                 W = L x B x draft x Cb x water density
block            Cb, the fraction of the enclosing box the hull actually occupies;
coefficient      a rake-ended deck barge runs about 0.90 to 0.97
water density    64.0 lb/cu ft sea water, 62.4 fresh -- a 2.6% difference that
                 shows up directly in draft
light draft      the barge empty; loaded draft is at its marks
cargo            loaded displacement - light displacement
tons per inch    TPI = L x B x Cb x density / (12 x 2,000); the working number on
                 a loading plan
freeboard        depth - draft; it is a stability and a regulatory quantity, not
                 spare capacity
fresh water      a barge loaded to its marks in salt water floats DEEPER in fresh
allowance        water and may exceed its marks on entering a river
```

Draft and load are one quantity seen from two sides, and that is what makes a barge simple to work with. Read
the draft marks and the load is known; add cargo and the new draft is arithmetic. Tons per inch is the
conversion, and because a barge is essentially a box with a nearly constant waterplane, it is close to constant
across the working range -- which is why a loading foreman can use a single number all day.

The density difference between salt and fresh water is small and its consequence is not. A barge displaces the
same weight of whatever it is in, so lighter water means more volume submerged and a deeper draft for the same
load. A tow loaded to its marks on the coast and taken up a river gains draft with no cargo added, and on a
controlling depth that is the difference between passing and grounding.

Freeboard is not spare capacity and reading it that way is how barges are overloaded. It is the margin against
waves coming aboard, the basis of the reserve buoyancy that keeps the vessel stable as it heels, and in most
services a regulated minimum. A barge with freeboard remaining is not a barge with capacity remaining, and the
load line, not the deck edge, is the limit.

**Inputs:** the barge length, beam, and depth, the block coefficient, the light and loaded drafts, and the water density for the service

**Outputs:** the light and loaded displacement, the cargo capacity, the tons per inch of immersion, the sinkage the cargo produces, the freeboard at the loaded draft, and the draft the same load would produce in fresh water

## 3. Worked example

A 195 by 35 by 12 ft deck barge at a block coefficient of 0.95, in sea water:

```
light at 1.5 ft:  195 x 35 x 1.5 x 0.95 x 64 / 2,000 = 311 tons
loaded at 8 ft: 1,660 tons
cargo = 1,660 - 311 = 1,349 tons
```

```
TPI = 195 x 35 x 0.95 x 64 / (12 x 2,000) = 17.3 tons per inch
check: 1,349 / 17.3 = 78.0 in = 6.5 ft of sinkage
```

**17.3 tons an inch is the number the loading foreman works with**, and it closes the loop exactly: the
1,349 tons of cargo sank the barge from 1.5 to 8 ft, which is 6.5 ft.

**Freeboard at the loaded draft is 4 ft**, and that is not spare capacity. It is the reserve buoyancy that
keeps the barge stable as it heels and the margin against boarding seas -- **the load line is the limit, not
the deck edge.**

**Now take the same loaded barge into fresh water:**

```
draft = 1,660 x 2,000 / (195 x 35 x 0.95 x 62.4) = 8.21 ft
```

**2.5 inches deeper, with nothing loaded.** The barge displaces the same weight and fresh water weighs
less, so more of the hull goes under. **A tow loaded to its marks on the coast arrives up the river drawing
2.5 in more than it left with**, and on a controlling depth that is the whole difference between passing and
grounding.

## 4. Scope and non-goals

A displacement calculation for a box-form barge. The block coefficient is entered and varies with the hull form, rake, and skeg arrangement; a vessel's own capacity plan, deadweight scale, and hydrostatic tables are the authority and they account for the hull's actual shape at every draft, which this does not. It does not address stability, which is the question that actually governs a loaded barge: metacentric height, the free surface effect of any liquid aboard, the heel from an off-centre or high load, and the vessel's stability letter and its limiting conditions are all outside this arithmetic, and a barge within its draft limits can be outside its stability limits. It does not address longitudinal strength, hogging and sagging from an uneven load, deck load limits and point loading on the deck plate, or trim and list from a load that is not centred. It does not address load lines, freeboard regulations, or the towing and manning requirements of the service. The vessel's own capacity plan, deadweight scale, and stability letter, the applicable load line and stability regulations, and a naval architect govern.
