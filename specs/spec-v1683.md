# roughlogic.com Specification v1683 -- Mortar Batch Proportions by Type (ASTM C270) (`calc-masonry.js`, Group E Carpentry and Construction, masonry, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-masonry.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; masonry), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Mortar is specified by type and the type is a proportion, not a strength -- so batching by the mixer operator's habit rather than by the specified proportions produces mortar that is the wrong type regardless of how it tests. The proportions are a short table and they belong at the mixer.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive batch volume or proportion, or a sand proportion outside the standard range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): ASTM C270 proportion specification and the mortar type designations by name, with TMS 602 cited, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`mortar proportions astm c270`, `mortar type m s n o`, `mortar batch by volume`, `repointing mortar type`, `stronger mortar cracks brick`.

## 2. The tile

### 2.1 `mortar-batch-c270` -- Mortar Batch Proportions by Type (ASTM C270)

```
proportion spec   ASTM C270 gives volume proportions of cement, lime, and sand by type
type M            high compressive strength; below grade and in contact with earth
type S            good strength and flexural bond; the general exterior workhorse
type N            medium; general above-grade exterior and interior
type O            low strength; interior non-loadbearing and repointing soft masonry
sand              2.25 to 3 times the sum of the cementitious volumes
STRONGER IS NOT BETTER  a mortar harder than the unit cracks the unit rather than the joint
```

The counterintuitive rule is the important one: a stronger mortar is often a worse mortar. Mortar is meant to
be the sacrificial element, so that movement and stress crack the joint -- which is repointable -- rather than
the masonry unit, which is not. Repointing soft historic brick with a Type S or M mortar is a well-documented way
to destroy the brick, because the hard mortar transfers stress into the unit and the unit spalls. Type O, or a
lime mortar, exists for exactly that case.

The proportion versus property specification distinction matters at the mixer. C270 allows a mortar to be
specified either by proportion or by laboratory-tested properties, and the two are not interchangeable: a
proportion-specified mortar is batched to the volumes and not tested for strength, and field-tested mortar is
tested to a different standard with different acceptance than laboratory mortar. Field mortar tests routinely
come in below the laboratory values for the same mortar, and treating that as a failure is a common and expensive
misunderstanding.

Sand volume is the term most often abused because it is measured by shovel. The proportion range is broad and
running at the high end produces harsh, unworkable mortar that masons then correct with water -- which changes
everything.

**Inputs:** the mortar type, the specification basis (proportion or property), the batch size, the cement and lime proportions for the type, the sand proportion, and the unit type for the compatibility check

**Outputs:** the volume of each ingredient for the entered batch size, the bags of cement and lime, the sand volume in cubic feet and shovels, the sand proportion against the allowable range, and a compatibility flag where the mortar type is harder than appropriate for the unit

## 3. Worked example

A Type S mortar batch by the C270 proportion specification, using 1 bag of portland:

```
portland cement   1 volume    (1 cu ft per bag)
hydrated lime     1/2 volume  (0.5 cu ft)
sand              2.25 to 3 times the cementitious total
                  = 2.25 to 3 x 1.5 = 3.4 to 4.5 cu ft
```

So one bag of portland, half a bag equivalent of lime, and roughly 3.4 to 4.5 cubic feet of damp loose sand.

**The sand is the term that drifts.** Batched by shovel with no measure, a crew running at 5 or 6 cubic feet is
outside the specification, and the mortar is weak and boardy -- and the correction they will reach for is more
water, which weakens it further.

**The compatibility trap.** Repointing a 1900s building with soft, low-fired brick using this Type S mortar is a
recognized way to destroy the brick. The mortar is harder than the unit, so movement and freeze-thaw stress goes
into the brick face and spalls it, permanently. The correct mortar for that work is Type O or a lime mortar,
matched to the original -- which tests weaker and performs better.

And the field-testing point: mortar tested from the mixer to ASTM C780 will report lower strengths than the C270
laboratory values for the same mortar, because they are different tests. That is expected, not a failure, and
rejecting mortar on that basis is a common and expensive error.

## 4. Scope and non-goals

A batching calculation using proportions the user supplies. ASTM C270's proportion specification and property
specification are alternatives and are not interchangeable; the project specification states which applies and
that governs. Field-prepared mortar tested to ASTM C780 gives different values than laboratory mortar tested
under C270, and C780 results are for consistency monitoring rather than for acceptance against C270 strengths. It
does not address mortar selection, which depends on the masonry unit, the exposure, the structural requirements,
and for historic work on matching the original mortar's properties -- a matter for analysis and a conservation
specialist rather than a table. It does not address masonry cement or mortar cement, which are proprietary
products with their own designations, admixtures, colour, retempering limits, or cold and hot weather
requirements. ASTM C270, the project specification, TMS 602, and for historic work a preservation specialist
govern.
