# roughlogic.com Specification v1393 -- Hydrant Count and Spacing for a Required Fire Flow (calc-fire.js, Group F, fire-ground and fire protection, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, fire-ground and fire protection), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group F computes required fire flow four different ways and hydrant flow at 20 psi, but nothing turns a fire flow into the number of hydrants and the spacing that has to be provided. That is the site-plan question, and it is what a fire marshal reviews.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive fire flow, per-hydrant credit, frontage length, or spacing, or a maximum hose-lay distance below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the International Fire Code Appendix C hydrant number and spacing provisions and NFPA 1 / NFPA 24 for private hydrant placement, cited by number and linked (the IFC tables are cited, never reproduced), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `hydrant-spacing-count` -- Hydrant Count and Spacing for a Required Fire Flow

```
hydrants by flow    = ceil(required fire flow / credited flow per hydrant)
hydrants by frontage= ceil(frontage length / average spacing) + 1
governing count     = the larger of the two
actual spacing      = frontage / (count - 1)
max distance to one = actual spacing / 2
```

Two independent requirements, and the site has to satisfy both. The **flow** requirement is that enough hydrants
be reachable to deliver the required fire flow at once, at whatever each hydrant can actually be credited for --
which is set by the main, not by the hydrant, and is the number the flow test produces. The **spacing**
requirement is geometric: no point along the frontage may be farther than a specified distance from a hydrant,
which caps how far apart they can be regardless of how much water each one makes.

The IFC assigns both the average spacing and the maximum distance to a hydrant as a function of the required fire
flow, in a table. The tile does not reproduce that table -- it takes the spacing and distance values as inputs,
cites the section, and does the geometry, which is the part a fire marshal actually checks against the site plan.

**Inputs:** required fire flow (gpm), credited flow per hydrant (gpm), frontage or road length to be served (ft),
average spacing required (ft), maximum distance from any point to a hydrant (ft).

**Outputs:** hydrants required by flow, hydrants required by spacing, the governing count, the resulting actual
spacing, the maximum distance any point sits from a hydrant, and pass or fail against that limit.

## 3. Worked example

A site requiring 3,000 gpm of fire flow, hydrants credited at 1,000 gpm each, 1,200 ft of frontage, with an
average spacing of 400 ft and a 225 ft maximum distance to a hydrant:

```
by flow     = ceil(3,000 / 1,000)   = 3 hydrants
by frontage = ceil(1,200 / 400) + 1 = 4 hydrants
governing   = 4
actual spacing   = 1,200 / 3        = 400 ft
max distance     = 400 / 2          = 200 ft  -> under the 225 ft limit, passes
```

The spacing rule governs, not the flow rule -- a site can have all the water it needs and still be short a
hydrant. Now credit each hydrant at only 750 gpm, as a weaker main would: the flow requirement rises to 4
hydrants and the two requirements tie, with no margin on either. That is the case where a fifth hydrant, or a
looped main, is the real answer.

## 4. Scope and non-goals

Site geometry against values the user supplies. Required fire flow, average spacing, and maximum distance all
come from the adopted fire code -- IFC Appendix C and its tables, as amended locally -- and this tile neither
reproduces those tables nor determines which row applies; look them up and enter them. The credited flow per
hydrant is a flow-test result, not an assumption, and it depends on the main size, the looping, and the residual
pressure. The tile does not address hydrant type, thread compatibility, the distance from the hydrant to the FDC
(which many codes limit separately), obstruction, access, or freeze protection. The fire code as adopted, the
water purveyor, and the fire marshal govern.
