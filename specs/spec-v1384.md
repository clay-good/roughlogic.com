# roughlogic.com Specification v1384 -- Flatbed Tarp Coverage, Count, and Weight (calc-trucking.js, Group J, trucking and logistics, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`**
> (Group J, trucking and logistics), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Tarping is planned by eye and discovered at the shipper. Whether the tarps on the truck actually cover the load is a width question (deck width plus twice the load height) and a length question (tarp length less the overlap, repeated), and neither is in the catalog -- nor is the tarp weight, which is a real handling and payload item.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive load dimension, tarp dimension, or overlap, an overlap at or above the tarp length, or a negative tarp weight, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the flatbed tarping practice of covering deck width plus twice the load height with a tuck allowance, and lapping successive tarps shingle-fashion toward the rear, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `flatbed-tarp-size` -- Flatbed Tarp Coverage, Count, and Weight

```
width needed   = load width + 2 x load height + 2 x tuck allowance
tarps needed   = ceil((load length - overlap) / (tarp length - overlap))
covered length = tarps x tarp length - (tarps - 1) x overlap
total weight   = tarps x weight each
```

The width requirement is the one people get wrong, because a tarp has to come down both sides: a load eight feet
wide and six feet tall needs twenty feet of tarp across, before any allowance for tucking under the edge of the
load and getting a bungee on it. A tarp sized to the deck width is not a tarp, it is a lid.

The length side is a shingling problem. Tarps overlap toward the rear so that road wind cannot get under a
leading edge, and each overlap costs its length from the run. Three tarps at twenty feet with four-foot laps do
not cover sixty feet; they cover fifty-two.

The weight line is not a footnote. A steel tarp runs 60 to 100 pounds, so a three-tarp load is a couple hundred
pounds of payload and, more to the point, a couple hundred pounds a driver has to get onto a load by hand -- which
is where tarping injuries come from.

**Inputs:** load length, width, and height above the deck; tarp length and width; overlap between tarps; tuck
allowance; tarp weight each.

**Outputs:** required tarp width, whether the tarps on hand are wide enough, tarps needed, covered length, and
total tarp weight.

## 3. Worked example

A 40 ft load, 8 ft wide, 6 ft above the deck, using 20 x 27 ft steel tarps with a 4 ft overlap and a 1 ft tuck
per side, tarps 65 lb each:

```
width needed = 8 + 2(6) + 2(1)          = 22 ft   -> 27 ft tarps clear it with 5 ft to spare
tarps needed = ceil((40 - 4)/(20 - 4))  = ceil(2.25) = 3 tarps
covered      = 3(20) - 2(4)             = 52 ft   -> covers the 40 ft load
weight       = 3 x 65                   = 195 lb
```

Two tarps would cover only 36 ft and leave four feet of the load in the weather, so three it is -- and the third
tarp is 65 lb of payload and 65 lb of lifting. Raise the load a foot and the width requirement goes to 24 ft,
still inside a 27 ft tarp; raise it three feet and it does not fit, and the answer is lumber tarps rather than a
bigger steel tarp.

## 4. Scope and non-goals

Coverage arithmetic. It does not tell you whether the load needs to be tarped at all, which is the shipper's
instruction and the commodity's requirement, and it does not address how the tarps are secured, which is what
keeps them on at 65 mph. It assumes a rectangular load with a flat top; a stepped, coiled, or irregular load needs
more tarp and more judgment. Tarp weights vary widely between lumber tarps, steel tarps, and smoke tarps. Fall
protection when working on top of a load is a real OSHA question and this tile takes no position on it. The
shipper, the commodity, and the driver govern.
