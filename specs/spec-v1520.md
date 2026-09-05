# roughlogic.com Specification v1520 -- Shotcrete Rebound Loss and Material Yield (`calc-mining.js`, Group E Carpentry and Construction, underground, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Shotcrete rebound is material that hits the rock and falls off, and it is a quarter of what you shoot on a dry-mix overhead job. Ordering by in-place volume leaves a crew short mid-shift, and the correction is a division by one minus the rebound -- never a multiplication.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive area or thickness, or a rebound fraction outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the rebound yield relation with ACI 506 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`shotcrete rebound`, `gunite waste factor`, `shotcrete order quantity`, `rebound percentage shotcrete`, `sprayed concrete yield`.

## 2. The tile

### 2.1 `shotcrete-rebound-yield` -- Shotcrete Rebound Loss and Material Yield

```
in-place volume  V_ip = area x thickness / 12 / 27      (cu yd)
ordered volume   V_order = V_ip / (1 - rebound)
rebound loss     V_loss = V_order - V_ip
typical rebound  dry-mix overhead 20 to 35%, dry-mix wall 15 to 25%,
                 wet-mix overhead 10 to 20%, wet-mix wall 5 to 15%
```

The correction divides, and getting that backwards is the classic error: a 25% rebound does not mean ordering
25% more, it means ordering 33% more, because the rebound is a fraction of what is SHOT rather than of what
stays. The gap widens fast -- at 35% rebound the order is 54% above the in-place volume.

Rebound depends on things a crew controls. Wet-mix rebounds far less than dry-mix; overhead far more than walls;
nozzle distance and angle matter, with the nozzle held perpendicular and about three to five feet off being the
target; and shooting into a corner or against a rough face raises it. Rebound material must not be reused --
it has lost its cement fraction and incorporating it into the work is a known defect mechanism -- so it is
genuine loss and has to be removed from the invert.

For field use the useful direction is often backwards: given what has been shot, how much thickness is actually
in place. A crew that has shot 20 cubic yards on a dry-mix overhead has about 15 in place, and the thickness
check should reflect that rather than the delivery ticket.

**Inputs:** area to be covered, design thickness, mix type (wet or dry), orientation (wall, arch, or overhead), the rebound percentage, and any overbreak allowance

**Outputs:** the in-place volume, the volume to order, the rebound loss in cubic yards and as a percentage of the order, the in-place thickness achieved from a stated volume shot, and the volume per truck or batch

## 3. Worked example

1,200 sq ft of arch at 3 in design thickness, dry-mix overhead at 22% rebound:

```
in-place  = 1,200 x 3 / 12 / 27 = 11.11 cu yd
order     = 11.11 / (1 - 0.22)    = 14.25 cu yd
rebound loss                       = 3.13 cu yd
```

Order 14.2 cu yd to place 11.1. Note the arithmetic trap: adding 22% to the in-place volume
would give 13.56 cu yd and leave the crew 0.69 cu yd short -- most of a truck.

Switch to wet-mix at 15% rebound and the order falls to 13.07 cu yd, saving 1.17 cu yd of
material and the labour of mucking it out of the invert. That comparison is usually what justifies wet-mix on a
job of any size.

Reverse check: a crew that has shot 12 cu yd on this arch has `12 x (1 - 0.22)` = 9.36 cu yd in place,
which over 1,200 sq ft is 2.53 in average thickness -- short of the 3 in design.

## 4. Scope and non-goals

A quantity calculation from a rebound percentage the user supplies. Rebound is highly variable and depends on
mix design, accelerator, nozzle technique, air pressure, substrate roughness, and orientation; the ranges given
are conventions and a site trial panel is what establishes the real figure. It does not account for overbreak,
which on a blasted profile can add substantially to the volume needed to reach a minimum thickness everywhere and
which is usually the larger correction on an underground heading. It does not address mix design, accelerator
dosage, fibre content, curing, or the thickness verification and core testing the specification will require, and
it does not evaluate whether shotcrete is the correct support -- rock bolting and shotcrete are usually specified
together (`rock-bolt-support-pressure`). ACI 506, the project specification, the ground control plan, and the
engineer of record govern.
