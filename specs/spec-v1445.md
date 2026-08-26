# roughlogic.com Specification v1445 -- Water Extraction Volume, Time, and Waste-Tank Dumps (calc-restoration.js, Group D, restoration, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-restoration.js`**
> (Group D, restoration), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group D has 51 tiles about drying and none about the step that comes first. Extraction removes water hundreds of times faster than any dehumidifier can, so the volume extracted, the wand time it takes, and the number of waste-tank dumps are the numbers that plan day one of a loss -- and none of them is in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive area, extraction rate, or tank capacity, or a negative standing depth or absorption rate returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the standing-water volume relation (7.481 gallons per cubic foot) and the assembly absorption figures used in IICRC S500 extraction planning, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `water-extraction-rate` -- Water Extraction Volume, Time, and Waste-Tank Dumps

```
standing water   = area x depth in inches / 12 x 7.481      gallons
absorbed water   = area x assembly absorption rate           gallons per sq ft
total to extract = standing + absorbed
wand time        = total / effective extraction rate
tank dumps       = total / waste tank capacity
```

The first rule of water damage restoration is that every gallon extracted is a gallon the dehumidifiers never
have to evaporate, and the arithmetic makes the point brutally: a dehumidifier removing 10 gallons a day would
need two months to do what a wand does in two hours. Extraction is not a preliminary step, it is the step.

Two sources of water and they behave differently. **Standing** water is a straight volume calculation and comes
up fast. **Absorbed** water is held in the carpet, the pad, and the substrate, it comes up slowly, and it is what
determines whether a second and third pass is worth making -- which it almost always is, because the marginal
gallon from a slow pass is still hundreds of times cheaper than evaporating it.

The dumps line is the one that plans the day. A portable extractor's waste tank is small, so a large loss is
mostly walking, and knowing that up front is the difference between a truck-mount and a very long afternoon.

**Inputs:** affected area, standing water depth, assembly absorption rate (gal per sq ft for the carpet, pad, and
substrate combination), effective extraction rate at the wand (gpm), waste tank capacity.

**Outputs:** standing and absorbed volume, total gallons, wand time, number of tank dumps, and the equivalent
dehumidifier-days that extraction avoided.

## 3. Worked example

800 sq ft with 1 in of standing water over carpet and pad absorbing 0.15 gal per sq ft, wand extracting an
effective 5 gpm into a 100 gal waste tank:

```
standing  = 800 x (1/12) x 7.481   = 499 gal
absorbed  = 800 x 0.15             = 120 gal
total     = 619 gal
wand time = 619 / 5                = 124 min = 2.1 hr
dumps     = 619 / 100              = 6.2 -> 7 tank dumps
```

Two hours of wand time and seven trips to the drain. Now the comparison that justifies all of it: 619 gallons is
about 5,160 pounds of water. A large LGR dehumidifier pulling a real-world 15 gallons a day would take 41 days to
remove it. Extraction did it in an afternoon, and everything the drying equipment does afterward is the small
remainder.

## 4. Scope and non-goals

Volume and time planning. Absorption rates are assembly-specific -- carpet type, pad type and thickness, and
whether the substrate is concrete, plywood, or gypsum all change them by large factors, and the figure should be
established for the actual assembly rather than assumed. Effective extraction rate is far below a machine's
nameplate and depends on wand type, vacuum, hose length, and technique. The tile does not classify the loss, does
not determine whether materials are restorable or must be removed (the catalog's IICRC S500 class and category
tiles do that), and takes no position on **Category 2 and 3 water**, where the extracted liquid is contaminated
and its disposal is regulated -- see the separate disposal tile. IICRC S500, the local wastewater authority, and
the restorer's judgment govern.
