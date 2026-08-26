# roughlogic.com Specification v1446 -- Category 3 Loss Disposal Volume, Containers, and Routing (calc-restoration.js, Group D, restoration, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-restoration.js`**
> (Group D, restoration), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group D takes off flood cuts, containment, and pack-outs but never sizes the waste stream they produce. On a Category 3 loss that stream is contaminated, its liquid and solid fractions go to different places, and both the container count and the disposal routing are decisions that get made badly on the truck.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive area, thickness, or container volume, or a negative bulking factor returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the loose-volume bulking convention for demolition debris and the IICRC S500 handling requirements for Category 3 materials, with local wastewater and solid-waste authority routing cited as governing, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `sewage-loss-disposal` -- Category 3 Loss Disposal Volume, Containers, and Routing

```
in-place volume  = sum over materials of (area x thickness)
loose volume     = in-place volume x bulking factor
bag count        = loose volume / bag capacity
dumpster check   = loose volume against the container's cubic capacity
liquid volume    = extracted gallons (routed separately)
```

Demolition debris does not stay the size it was on the wall. Carpet and pad in particular bulk enormously when
they are cut out and rolled -- a bulking factor of two to three is ordinary -- and a takeoff done on in-place
thickness will underestimate the container by that factor. The tile computes both so the dumpster is sized on the
loose number.

The routing split is the part that is specific to Category 3. **Solids** are bagged, sealed, and removed through
the containment as regulated by the S500 and by whatever the local solid waste authority requires; on a sewage
loss many jurisdictions treat them as ordinary construction debris and some do not, and the difference is worth a
phone call before the truck is loaded. **Liquid** extracted from a Category 3 loss goes to the **sanitary** sewer
with the wastewater authority's approval -- never to a storm drain, never to the ground, and never to a
watercourse. That is not a preference; discharging contaminated water to storm is an enforceable violation in
essentially every jurisdiction in the country.

**Inputs:** for each material, the area and thickness removed; bulking factor per material; bag capacity;
dumpster size; extracted liquid volume.

**Outputs:** in-place and loose volume per material and total, bag count, dumpster utilization, and the liquid
volume flagged for sanitary routing.

## 3. Worked example

A sewage loss with 500 sq ft of carpet and pad removed and 120 sq ft of 1/2 in drywall from a 2 ft flood cut, with
620 gallons extracted:

```
drywall in place   = 120 x 0.0417 ft       = 5.0 cubic ft
carpet and pad     = 500 x 0.0417 ft       = 20.8 cubic ft in place
bulked at 3x                                = 62.5 cubic ft loose
total loose (with the drywall)              = about 80 cubic ft
bags at 33 gal (4.41 cubic ft each)         = 19 bags
10 cubic yard dumpster = 270 cubic ft       -> 30% utilized
liquid                                       = 620 gal to sanitary, with authority approval
```

Nineteen contractor bags and a 10 yard box that is mostly empty -- which is the useful finding, because the box
was going to be ordered by habit. The liquid is the bigger number by weight and it does not go in the box at all.

## 4. Scope and non-goals

Volume and container arithmetic. **Disposal routing is a local regulatory question and this tile does not answer
it.** Whether Category 3 solids may go to a construction and demolition landfill, whether the extracted liquid may
be discharged to the sanitary sewer and under what pretreatment or notification conditions, and whether any of it
is a regulated waste all depend on the jurisdiction and on what is actually in the water. Bulking factors are
estimates and vary with how the material is cut and rolled. The tile does not address worker protection for
Category 3 work -- respiratory protection, gloves, eye protection, and decontamination are required and are
governed by the S500 and by OSHA -- containment, or the biocide and cleaning steps that follow demolition. It
does not address asbestos or lead, which must be ruled out before any demolition in an older building and which
have entirely separate disposal rules. IICRC S500, the local wastewater and solid-waste authorities, OSHA, and
the AHJ govern.
