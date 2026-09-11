# roughlogic.com Specification v1760 -- Growing Substrate Volume for a Container Order (`calc-greenhouse.js`, Group L Agriculture and Forestry, greenhouse and controlled-environment agriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-greenhouse.js`**
> (Group L Agriculture and Forestry, hub `/groups/agriculture/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A nursery orders substrate in cubic yards or compressed bales and fills containers sized in trade gallons, and a trade gallon is not a gallon. The mismatch runs about forty percent, in the direction of ordering media that will not fit in the yard.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive container count or container volume, a negative allowance, or a non-positive bale yield returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the container filled-volume convention and bale expansion with the container and media manufacturers' published data named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`potting mix cubic yards`, `nursery container media volume`, `trade gallon container volume`, `substrate bale count`, `growing media takeoff`.

## 2. The tile

### 2.1 `substrate-container-volume` -- Growing Substrate Volume for a Container Order

```
container volume the FILLED volume of the container, in cubic inches -- a nursery
                 "#1" or "trade gallon" holds about 160 cu in, roughly 0.69 US gal,
                 NOT the 231 cu in of a true gallon
loose volume     cu ft = containers x cu in each / 1,728;  cu yd = cu ft / 27
allowance        add 5 to 15% for compaction in handling, spill, and the fill line
                 sitting below the rim
bulk delivery    sold by the loose cubic yard from a blower truck or super sack
compressed bale  a bale labelled by its COMPRESSED volume expands on opening; a
                 3.8 cu ft bale yields roughly 2.8 cu ft loose, so the label is not
                 the number to divide by
the error        using 231 cu in for a trade gallon over-orders by more than 40%
```

The trade gallon is a container size, not a volume, and it has not been a gallon for as long as anyone has
been selling one. Nursery container nomenclature descends from can sizes rather than from liquid measure, so a
#1 holds roughly two thirds of a US gallon, a #3 holds closer to two and a half, and the ratio is not even
consistent between manufacturers. The only safe practice is to use the published filled volume for the
specific container being bought.

Compression is the second trap and it points the other way, toward under-ordering. Bagged and baled media are
compressed for shipping and the label commonly states the compressed volume, so a yard that divides its
requirement by the label buys substantially less media than it needs. The expansion ratio depends on the mix
and on how hard it was pressed, and the supplier's own loose-yield figure is the one to use.

The allowance for handling is not padding. Media compacts when it is moved, blown, and dropped into a
container, and the fill line sits below the rim so the container waters rather than overflowing. A yard
filling to the rim in the calculation and to the fill line in the field will have media left over, which is a
better error than the alternative but still a planning miss.

**Inputs:** the container count, the filled volume per container or the container size, the compaction and spill allowance, and optionally the bale's compressed label volume and loose yield

**Outputs:** the loose volume in cubic feet and cubic yards, the volume including the allowance, the quantity to order, the bale or bag count, and the volume a true-gallon assumption would have produced

## 3. Worked example

An order to fill 5,000 nursery #1 containers, each holding about 160 cu in filled:

```
loose volume = 5,000 x 160 / 1,728 = 463.0 cu ft = 17.15 cu yd
with 10%      = 509.3 cu ft = 18.86 cu yd
order        = 19 cu yd bulk
```

**Or 182 compressed bales.** At a loose yield of 2.8 cu ft from a bale labelled 3.8 cu ft compressed,
509 cu ft needs 181.9 bales, so 182. **Dividing by the 3.8 cu ft on the label instead would have ordered
135 bales** -- 47 short, because the label describes the bale in the truck and not the media on the
bench.

**Now make the trade-gallon mistake.** Using 231 cu in, a true US gallon, for the same 5,000 containers:

```
volume = 5,000 x 231 / 1,728 x 1.10 = 735.2 cu ft = 27.23 cu yd
```

**27 cubic yards ordered against 19 actually needed -- 44 percent over**, which on a bulk delivery is
8.4 cubic yards of media sitting in a yard with nowhere to go. The two errors in this tile push in opposite
directions and a yard that makes both at once may arrive at roughly the right number for entirely the wrong
reasons, which is worse than either alone because it hides on the next order.

## 4. Scope and non-goals

A volume takeoff. The filled volume per container is entered, not derived: nursery container nomenclature is a trade convention rather than a measurement, the same nominal size varies between manufacturers, and the published filled volume for the specific container is the only reliable figure. The bale expansion ratio is likewise entered and varies with the mix and the compression. It does not select or blend a substrate, address the physical properties -- air-filled porosity, water-holding capacity, bulk density -- that decide whether a mix suits a crop and a container, or account for the media's own settling after the first irrigation, which is a real volume loss that shows up as a low fill line days later. It does not price the order, schedule the delivery, or address the storage and handling of bulk media. The container manufacturer's published filled volumes, the media supplier's loose-yield data, and the grower's own fill records govern.
