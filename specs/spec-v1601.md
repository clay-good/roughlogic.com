# roughlogic.com Specification v1601 -- Vacuum Excavation Spoil Volume and Tank Fills (`calc-trenchless.js`, Group E Carpentry and Construction, trenchless, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trenchless.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; trenchless, hdd, and utility locating), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Potholing to expose a utility fills a spoil tank faster than crews expect, and a full tank stops the work until it is dumped. The volume is a box, the swell is real, and the number of tank fills is what schedules the day.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive length, width, depth, or tank capacity, or a swell factor below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the excavation volume and swell relations with the one-call statute and OSHA excavation standards named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`vacuum excavation spoil volume`, `potholing tank fills`, `hydro excavation spoil`, `daylighting volume`, `vac truck capacity potholes`.

## 2. The tile

### 2.1 `vacuum-excavation-spoil` -- Vacuum Excavation Spoil Volume and Tank Fills

```
excavated volume   V = length x width x depth / 27      (cu yd)
swell               loose volume = bank volume x (1 + swell factor); 20 to 40% for most soils
slurry              wet vacuum adds the water used; dry vacuum does not
tank fills          n = loose volume / tank capacity, rounded up
per-pothole         a typical utility pothole is small; the count is what adds up
disposal            spoil may be returnable to the hole, or may be a regulated waste
```

The individual pothole is small and the day's total is not. A single 12 by 12 inch keyhole to 5 feet is under a
tenth of a cubic yard, but a day of potholing a corridor is thirty of them plus the test pits, and the tank fills
up in the middle of the afternoon a long way from the dump site.

Swell is what makes the tank fill sooner than the arithmetic suggests. Soil excavated from a compacted bank
occupies substantially more volume loose, and a wet vacuum system adds the water used to cut, so the material
going into the tank can be well over half again the in-place volume. Planning on bank volume produces a schedule
that is optimistic by exactly that margin.

Disposal is the variable that changes the number most. Spoil that can go back in the hole is a short cycle;
spoil that must be hauled because it is slurry, or because it is contaminated, or because the jurisdiction does
not permit returning it, is a haul cycle per tank and a completely different day.

**Inputs:** pothole dimensions and depth, the number of potholes, the soil swell factor, the water added for wet vacuum, the spoil tank capacity, and whether spoil is returnable

**Outputs:** the bank volume per pothole and for the day, the loose volume with swell and added water, the number of tank fills, the potholes per tank fill, and the haul cycles required where the spoil is not returnable

## 3. Worked example

A test pit 8 ft by 4 ft to 5 ft:

```
bank volume  = 8 x 4 x 5 / 27 = 5.93 cu yd
with 30% swell            = 7.70 cu yd loose
```

In a 12 cu yd spoil tank that single pit is 64% of the tank.

Now the day. Twenty-four keyhole potholes at 12 in by 12 in to 5 ft:

```
each: 1 x 1 x 5 / 27       = 0.185 cu yd bank
24 potholes                = 4.44 cu yd bank
with 30% swell             = 5.78 cu yd
plus water for wet vacuum, say 200 gal = 1.0 cu yd
day total                  ~ 6.8 cu yd
```

Plus the test pit above: about 14.5 cu yd, so **two tank fills** in a 12 yd
truck -- one dump cycle in the middle of the day that has to be planned into the route rather than discovered.

If the spoil can go back in the holes, the second fill may not happen at all. That single question changes the
day's productivity more than anything else on this list.

## 4. Scope and non-goals

A volume calculation from dimensions the user supplies. Swell factors vary by soil and by moisture and are
approximate; wet vacuum slurry volume depends on operator technique and the soil's water demand and can be far
larger than an assumed figure. It does not address whether spoil may be returned to the excavation, which depends
on the jurisdiction, the utility owner's requirements, and whether the material is suitable and uncontaminated,
and it does not address disposal of contaminated spoil, which is a regulated waste. It does not address the
safety requirements around potholing near utilities: the one-call notification, the tolerance zone, the
prohibition on mechanical excavation within it, pressure and temperature limits for hydro excavation near
plastic and coated pipe (high-pressure water can cut a pipe or damage coating), and confined space and shoring
requirements for larger pits. The state one-call statute, the facility owner's requirements, OSHA excavation
standards, and the applicable disposal regulations govern.
