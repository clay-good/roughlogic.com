# roughlogic.com Specification v1908 -- Flood-Head Uplift on a Slab, Hatch, or Manhole Cover (`calc-floodfight.js`, Group E Carpentry and Construction, flood fight, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-floodfight.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Water under head pushes up on whatever is in its way -- a basement slab when the groundwater rises, a manhole cover when the sewer surcharges -- and the numbers are larger than intuition expects: a 4 in slab floats under less than a foot of head. `pipe-flotation` covers a buried pipe; no tile compares uplift with a slab's or a cover's weight.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive head, area, or dimension returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): FEMA P-55, *Coastal Construction Manual*, Volume II, Equation 8.4 (vertical hydrostatic force), and the USACE St. Paul District *Flood Fight Handbook* (2016), Section 5.7 (manhole covers under head), named as the method, the engineer of record and the utility named as governing, GOVERNANCE.structural.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`basement slab uplift`, `manhole cover uplift force`, `hydrostatic uplift slab`, `floor slab floating groundwater`, `water pressure under slab`.

## 2. The tile

### 2.1 `flood-uplift-cover-slab` -- Flood-Head Uplift on a Slab, Hatch, or Manhole Cover

```
uplift pressure   p = gamma_w x h        (62.4 pcf fresh, 64.0 salt; h = head
                                          above the underside, ft)
uplift force      F = p x area           (round cover: pi/4 x D^2)
slab resistance   concrete 150 pcf = 12.5 psf per inch of thickness
net               p - slab psf (positive = the slab is pushed up)
floating head     h_float = slab psf / gamma_w
counterweight     F - cover weight, when positive
```

Uplift is the vertical half of hydrostatics, and it is simple enough to be forgotten. Water standing at a height
above the underside of a slab pushes up on every square foot with its unit weight times that height, and the slab
resists only with its own weight plus whatever holds it down. A 4 in slab weighs 50 psf, which 0.8 ft of water
matches; a basement pumped dry while the ground outside is still saturated can have several feet of head beneath it,
which is why floors heave and crack after floods and why basements are pumped down in stages (`basement-flood-pumpdown`).

A manhole cover is the same problem in a smaller area and a higher head. When a sewer surcharges, the water column in
the manhole pushes the cover up, and the handbook warns against weighing covers down with sandbags because the force
under any real head exceeds a ton. The tile computes the force and the counterweight a cover would need, which
usually shows why the handbook's advice -- ring the manhole with sandbags part way to reduce the head, or pump it --
is the only practical one.

The handbook's own example prints 2,060 lb for a 10 ft head on a 2 ft cover; at fresh water's 62.4 pcf it is 1,960 lb
(the printed figure implies 65.6 pcf). The tile reports the computed value and notes the difference, which errs on the
safe side.

**Inputs:** the head above the underside, fresh or salt water, the slab thickness or the cover diameter and weight, and the area for a slab

**Outputs:** the uplift pressure, the uplift force, the slab resistance and net pressure, the head at which the slab floats, and the counterweight a cover would need

## 3. Worked example

A 4 in basement slab with 3 ft of groundwater head beneath it after the basement was pumped dry:

```
uplift     62.4 x 3 = 187.2 psf
slab       4 x 12.5 = 50 psf
net        137.2 psf upward
floats at  50 / 62.4 = 0.80 ft of head
```

**The slab is pushed up with 137 psf more than it weighs -- it would lift under only 0.80 ft of head.** A 6 in slab
floats at 1.20 ft; slab weight alone is never the answer to a high water table.

**A 2 ft manhole cover under a 10 ft head:**

```
F = 62.4 x 10 x pi/4 x 2^2 = 1,960 lb      (handbook prints 2,060 lb)
```

**Nearly a ton on the cover** -- sandbags stacked on it will not hold it down, which is the handbook's point.

## 4. Scope and non-goals

A hydrostatic uplift estimate. It does not account for slab reinforcement, connection to walls or footings, pressure-relief systems, drainage beneath the slab, soil above a buried structure, dynamic surcharge in a sewer, or cover locking mechanisms. It does not assess structural capacity of a slab spanning between supports under uplift. FEMA P-55, the USACE Flood Fight Handbook, the engineer of record, and the utility govern.
