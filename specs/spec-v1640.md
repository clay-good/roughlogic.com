# roughlogic.com Specification v1640 -- Vessel Metacentric Height and Righting Arm (`calc-mechanic.js`, Group K Mechanic - Auto, Marine, Aviation, marine, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, Mechanic - Auto, Marine, Aviation -- the existing category, hub `/groups/mechanic/`; marine and boatyard), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A boat's stability comes down to one distance: how far the metacentre sits above the centre of gravity. Positive and it rights itself; negative and it lolls or capsizes. Every load a yard adds to a vessel moves G, and that is the number a refit has to track.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive displacement, a KG at or above KM producing a negative metacentric height flag, or a non-positive tank dimension for a free surface correction returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the metacentric height and free surface relations with the approved stability booklet and the Coast Guard named as governing for inspected vessels, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`metacentric height gm`, `vessel stability calculation`, `free surface effect`, `kg after adding weight`, `boat lolling negative gm`.

## 2. The tile

### 2.1 `metacentric-height` -- Vessel Metacentric Height and Righting Arm

```
metacentric height  GM = KM - KG
KM                  from the hull form and draft, off the hydrostatic curves
KG                  the vertical centre of gravity of the loaded vessel
righting arm        GZ = GM x sin(theta) for small angles
free surface        a partly filled tank raises the effective KG; the correction is
                    the tank's free surface moment divided by displacement
added weight        new KG = (W x KG + w x kg) / (W + w)
negative GM         the vessel lolls to an angle of heel and is unstable upright
```

Every weight added to a vessel moves the centre of gravity toward it, and weights added high -- a radar arch, an
enclosure, a tender on the cabin top, ice on the rigging -- raise KG and reduce GM directly. Because GM is a
difference between two numbers of similar size, a modest change in KG is a large percentage change in stability,
which is why a refit that adds a few hundred pounds high can matter more than one that adds a ton low.

Free surface is the effect that surprises people, because it depends on the tank's WIDTH cubed and not on how much
liquid is in it. A wide shallow tank half full costs far more stability than a narrow deep one with the same
volume, and a flooded compartment with a free surface across the full beam can remove the stability of a vessel
that is otherwise floating fine. That is the mechanism behind a number of capsizes where the vessel was not
sinking.

Negative GM does not mean immediate capsize; it means the vessel is unstable upright and will loll to some angle
where it finds positive righting. A boat that lies over persistently to one side in calm water, and lies over to
the other side if pushed, is reporting a negative GM -- and it is one wave from a much worse outcome.

**Inputs:** displacement, KM from the hydrostatic curves at the loaded draft, KG of the vessel, each added weight with its vertical centre, and each slack tank with its dimensions and contents density

**Outputs:** the loaded KG including added weights, the free surface correction, the effective KG, the metacentric height, the righting arm at a stated angle, a positive or negative stability flag, and the maximum weight that may be added at a stated height while retaining a target GM

## 3. Worked example

A vessel displacing 42,000 lb with KM 2.6 ft and KG 3.1 ft... taking KM = 2.6 ft and KG = 2.1 ft:

```
GM = 2.6 - 2.1 = 0.50 ft
```

Positive and healthy. Now the yard adds a 900 lb hardtop with its centre 9.5 ft above the keel:

```
new KG = (42,000 x 2.1 + 900 x 9.5) / (42,000 + 900)
       = (88,200 + 8,550) / 42,900 = 2.255 ft
new GM = 2.6 - 2.255 = 0.345 ft
```

**A 900 lb addition -- roughly 2 percent of displacement -- has taken
31% of the metacentric height**, because it went on high. The same
900 lb in the bilge would have increased GM.

Free surface: a 10 ft wide, 4 ft long fuel tank slack costs a correction proportional to `10^3 x 4 / 12` divided
by displacement. Width cubed is the term that matters -- narrowing that tank to 5 ft with a baffle reduces the
free surface moment by a factor of eight for the same capacity, which is why baffles exist and why a baffle
removed during a repair is a stability change.

## 4. Scope and non-goals

A first-order small-angle stability calculation. GM describes initial stability only and says nothing about
the righting arm at large angles, the range of stability, or the angle of vanishing stability -- a vessel with
adequate GM can still have poor reserve stability and capsize when heeled far. A full assessment requires the
righting arm curve from the hull's hydrostatics at the actual loading condition. KM must come from the vessel's
hydrostatic curves at the correct draft and trim, and KG from an inclining experiment or the approved stability
booklet, not from an estimate. Free surface corrections must include every slack tank simultaneously. It does not
address damaged stability, wind heeling, icing, towing or lifting loads, or the passenger and load conditions that
regulated vessels are assessed against. For inspected vessels, stability is a regulated matter: the approved
stability letter or booklet, a naval architect, and the US Coast Guard govern; for uninspected vessels the
builder's information and ABYC guidance apply.
