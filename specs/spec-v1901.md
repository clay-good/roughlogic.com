# roughlogic.com Specification v1901 -- Steel Picket Anchor Lateral Capacity and Count (`calc-usar.js`, Group Z Rigging and Heavy Lift, collapse shoring, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-usar.js`**
> (Group Z Rigging and Heavy Lift, hub `/groups/rigging-and-heavy-lift/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Raker soles, rope anchors, and guy lines in the field are held by steel pickets driven into the ground, and a picket's capacity depends on the soil far more than on the picket: in sand a 1 in picket holds less than a tenth of what it holds in average clay. `guy-anchor-holding-capacity` covers an anchor pulled in tension; no tile gives the lateral design load of a driven picket or the number a load needs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive required force returns `{ error }`; a picket size or soil class outside the published set returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): USACE *US&R Structures Specialist Field Operations Guide* (5th ed., 2006), "Approximate Design Load of Pickets (Pins) in Soils", based on FHWA-IP-84-11, *Handbook on Design of Piles and Drilled Shafts Under Lateral Load* (1984), with design load at about 50% of capacity, cited by figure, named as the source, the US&R Structures Specialist or the rigging competent person named as governing, GOVERNANCE.rigging.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`picket anchor capacity`, `steel stake anchor load`, `picket holdfast`, `raker sole anchor pickets`, `how many pickets for anchor`.

## 2. The tile

### 2.1 `picket-anchor-soil` -- Steel Picket Anchor Lateral Capacity and Count

```
design load per picket, driven 36 in (FOG, from FHWA-IP-84-11, ~50% of capacity)
                     cohesive soil            cohesionless soil
                     poor  average  good      loose  medium  dense
1 in x 48 in pin     500    750    1,000       50     55      63   lb
3 in x 48 in pin   1,000  1,500    2,000      150    180     190   lb
count        ceil(required lateral force / design load per picket)
driving      the guide's standard pattern uses 1 in x 48 in pickets; the 2021
             SOG's minimum picket is 1 in x 36 in driven 24 in -- SHORTER than
             the table's 36 in basis, so its capacity is lower than tabulated
```

A driven picket resists a sideways pull by bearing on the soil in front of it, so the soil's strength sets the load.
The published design loads, taken from the Federal Highway Administration's lateral-load handbook at about half the
ultimate capacity, span a factor of twenty: a 1 in picket holds 1,000 lb in good cohesive soil and 50 lb in loose sand.
The practical meaning is that pickets are a clay-and-firm-ground method, and in granular soil a raker sole or a rope
anchor needs a different restraint altogether -- a deadman, a larger pin, or a connection to paving or structure.

The count is a division, but the table's basis has to match the field. The values assume a 48 in picket driven 36 in.
The 2021 guide allows a shorter minimum picket driven 24 in, which is fine for its prescribed standard patterns but
does not earn the tabulated capacity, and the tile says so when a shorter embedment is entered. Pickets in a group are
spaced far enough apart that they do not share the same soil wedge; the tile assumes the guide's standard spacing.

**Inputs:** the required lateral force, the picket diameter (1 in or 3 in), the soil type (cohesive or cohesionless), the soil class, and the embedment depth

**Outputs:** the design load per picket, the number of pickets required, the group capacity, and a flag when embedment is below the table's 36 in basis or the soil is cohesionless

## 3. Worked example

A raker sole restraint for the 1,520 lb horizontal force of `usr-raker-shore`, in average cohesive soil with 1 in
pickets driven 36 in:

```
per picket  750 lb
count       ceil(1,520 / 750) = 3 pickets  (group 2,250 lb)
standard    the guides' 4-picket pattern gives 4 x 750 = 3,000 lb
```

**Three pickets satisfy the load; the standard four-picket pattern gives roughly twice it.**

**The same restraint in medium sand:**

```
per picket  55 lb   count  ceil(1,520 / 55) = 28 pickets
3 in pins   180 lb  count  ceil(1,520 / 180) = 9 pins
```

**Twenty-eight pickets, which is not a picket anchor any more** -- the signal to use a deadman, a buried timber, or a
connection to paving, rather than to drive more steel.

## 4. Scope and non-goals

A lateral design-load lookup from the US&R guide's table and a count. It does not model picket groups in tandem or tied-back configurations beyond simple addition, uplift or combined loading, frozen, saturated, or disturbed ground, rock, or pickets driven into paving, all of which change the capacity. Soil classification is by field judgment and the table's broad classes. It does not design deadmen or earth anchors (`guy-anchor-holding-capacity`). The US&R guides, the US&R Structures Specialist, and the rigging competent person govern.
