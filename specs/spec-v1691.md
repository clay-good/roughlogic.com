# roughlogic.com Specification v1691 -- Abatement Waste Volume and Container Count (`calc-demo.js`, Group D Water Damage and Mold Restoration, abatement, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-demo.js`**
> (Group D, Water Damage and Mold Restoration -- the existing category, hub `/groups/restoration/`; abatement and demolition), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Abatement waste is bulky, double-bagged, and heavy, and the container count is what schedules the disposal. The volume is the material plus the bagging air, and estimating on the material alone leaves a project short of containers on the last day.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive area, thickness, or bag volume, or a bulking factor below one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the bulked volume and container count method with the applicable EPA and state disposal regulations named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`abatement waste volume`, `asbestos bag count`, `disposal container count abatement`, `bulking factor removed material`, `regulated waste dumpster abatement`.

## 2. The tile

### 2.1 `abatement-waste-containers` -- Abatement Waste Volume and Container Count

```
in-place volume    area x thickness, converted to cubic yards
bulking            removed material occupies more volume than in place, and double
                   bagging adds more; a bulking factor of 1.5 to 2.5 is ordinary
bag count          bulked volume / usable bag volume; bags are not filled to capacity
                   because they must be sealed and handled
weight             wet material and any encapsulant add substantial weight
container          bags are placed in a lined dumpster or a lined trailer; the container's
                   volume, not its weight rating, usually governs
manifest           regulated waste requires manifesting and a permitted disposal facility
```

The bulking factor is the term estimates miss. Material removed from a wall or a pipe does not repack to its
in-place density, and double bagging it -- which the regulations require -- adds air around every bag. So the
volume leaving the site is well above the volume that was on the building, and a container count built on
in-place volume runs out.

Bags are also not filled to their nominal capacity. A bag has to be gooseneck-sealed and carried out through a
decontamination unit by a person in a suit, so its practical fill is well below its rated volume, and using the
rated volume overestimates how much each bag holds.

The weight matters for the container rather than for the bags. Wet material, encapsulant, and any plaster or
mortar attached to it make abatement waste heavy, and while container volume usually governs, a container filled
by volume with wet material can exceed its weight rating -- which is a transport problem discovered at the scale.

The disposal side is regulatory rather than arithmetic. Regulated asbestos-containing material goes to a
permitted facility under a manifest, and the disposal facility's requirements for packaging, labelling, and
notification are part of the plan rather than a detail at the end.

**Inputs:** the area and thickness of material to be removed, the bulking factor, the bag usable volume, the material density, the container volume and weight rating, and the disposal facility requirements

**Outputs:** the in-place volume, the bulked volume, the bag count, the total weight, the container count by volume and by weight with the governing one identified, and the manifest quantity

## 3. Worked example

3,200 sq ft of 0.5 in thick material to be removed:

```
in-place volume = 3,200 x 0.5/12 / 27 = 4.9 cu yd
```

Now bulk it. Removed and double bagged at a factor of 2.0:

```
bulked volume = 4.9 x 2.0 = 9.9 cu yd = 267 cu ft
```

**Twice the volume leaves the building as was on it**, which is the number the containers have to hold.

Bags at 6 cu ft nominal but a practical fill of 4 cu ft:

```
bags = 267 / 4 = 67 bags
```

67 bags, each of which is carried out through the decon unit by hand.

Containers: a 20 cu yd lined dumpster holds `20 / 9.9` -- so this job needs
1 container, and the sequencing of when they are
delivered and hauled is what determines whether the crew stops working.

Estimating on the in-place 4.9 cu yd would have called for one container and a bag count of
33 -- **half the real requirement**, and the shortfall appears on the last day of the job when the
containment is still up and the crew is standing.

## 4. Scope and non-goals

A volume estimate using a bulking factor the user supplies. Bulking factors vary widely with the material,
the removal method, and the packaging, and a project's own measured factor from early days of work is far better
than an assumed one. It does not address waste characterization and classification, which determines whether the
material is regulated and how it must be handled, or the packaging, labelling, marking, manifesting,
transportation, and disposal facility requirements, all of which are regulatory. It does not address the
decontamination of the waste on the way out of containment, which is a required procedure, or the handling of
water and filters, which are also regulated waste. Abatement waste disposal is a regulated activity: the
applicable EPA, DOT, and state regulations, the permitted disposal facility's acceptance criteria, and the
licensed contractor govern.
