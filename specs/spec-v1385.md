# roughlogic.com Specification v1385 -- Trailer Deck Point Load and Dunnage Spread (calc-trucking.js, Group J, trucking and logistics, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`**
> (Group J, trucking and logistics), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** A flatbed deck is rated as a distributed load, and a machine sitting on four small feet is not distributed. Converting a concentrated load into the pounds per linear foot the deck actually sees -- and computing how much dunnage it takes to get under the rating -- is the calculation that decides whether a deck gets punched through, and it is not in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive load, dunnage length, or deck rating, or a bearing area of zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the distributed-capacity rating convention for trailer decks (pounds per linear foot over the deck length) and the load-spreading function of dunnage, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `deck-point-load-dunnage` -- Trailer Deck Point Load and Dunnage Spread

```
bearing pressure = load / total bearing area          (psf, no dunnage)
linear load      = load / dunnage bearing length      (plf, with dunnage)
required length  = load / deck rating (plf)
utilization      = linear load / deck rating
```

Trailer decks are rated in pounds per linear foot, because that is how the crossmembers under them are designed --
a 48 ft deck rated for 55,000 lb is carrying roughly 1,150 lb on every foot of its length, and it assumes the load
is spread that way. A 12,000 lb machine standing on four six-inch feet puts that weight into a square foot of deck
between two crossmembers, which is not what the deck was designed to do.

Dunnage exists to convert the point load back into a linear one. Timbers run across the deck, perpendicular to
the crossmembers, spread the load along the trailer's length, and the length of that bearing -- not its width, and
not the timber's cross-section -- is what divides the load. The tile's most useful output is the last one: how
many feet of dunnage bearing it takes to get the linear load under the deck's rating.

**Inputs:** concentrated load (lb), number and size of bearing feet, dunnage bearing length along the trailer
(ft), deck rating (plf), and the deck's own rated concentrated load if published.

**Outputs:** bare bearing pressure (psf), linear load with the dunnage as planned (plf), utilization against the
deck rating, and the dunnage bearing length required to reach 100% utilization.

## 3. Worked example

A 12,000 lb machine on a deck rated 1,200 plf, planned on two 8 ft timbers:

```
linear load     = 12,000 / 8        = 1,500 plf
utilization     = 1,500 / 1,200     = 125%   -> over
required length = 12,000 / 1,200    = 10.0 ft
```

Eight feet of dunnage is not enough and ten feet is exactly at the rating; twelve feet gives a comfortable 83%.
Without any dunnage at all -- four 6 x 6 in feet, one square foot of total bearing -- the machine puts 12,000 psf
into the deck plate, which is an order of magnitude past what any deck plate carries, and the feet go through.

## 4. Scope and non-goals

A screen against a published deck rating, and only along the trailer's length. It assumes the dunnage is stiff
enough to actually distribute the load, which a single 4x4 under a heavy machine is not -- undersized dunnage
bends and delivers the point load anyway. It does not check the dunnage timbers in bending, the deck plate
locally, the crossmember spacing under the specific bearing points, or the suspension and axle loads, which the
catalog's axle tiles handle. Deck ratings vary enormously between a standard flatbed, a drop deck, and a
double-drop or lowboy, and the rating is often lower over the drops and at the rear overhang. The trailer
manufacturer's load diagram governs.
