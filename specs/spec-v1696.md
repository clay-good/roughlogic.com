# roughlogic.com Specification v1696 -- Crown Reduction Percentage and Leaf Area Loss (`calc-arborist.js`, Group L Agriculture and Forestry, arboriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`**
> (Group L, Agriculture and Forestry -- the existing category, hub `/groups/agriculture/`; arboriculture and landscape), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Removing a quarter of a crown's height removes far more than a quarter of its leaves, because leaf area concentrates in the outer canopy. Pruning specified as a percentage of height and executed as a percentage of leaves are different jobs, and over-removal is what kills mature trees slowly.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a reduction percentage outside zero to one hundred, or a non-positive crown dimension returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ANSI A300 pruning dose concept with the ISA pruning best management practices named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`crown reduction percentage`, `pruning dose leaf area`, `25 percent pruning limit`, `epicormic sprouting reduction`, `tree topping versus reduction`.

## 2. The tile

### 2.1 `crown-reduction-leaf-area` -- Crown Reduction Percentage and Leaf Area Loss

```
leaf area          concentrated in the outer canopy; the outer third of the crown
                   holds the large majority of it
reduction          a reduction of the crown's outer edge removes disproportionate leaf area
limits             ANSI A300 addresses pruning dose; removing more than about 25% of the
                   live crown in a season is widely regarded as excessive, and mature
                   and stressed trees tolerate far less
response           heavy reduction triggers epicormic sprouting -- weakly attached shoots
                   that must be managed for years
topping            not pruning; removes leaf area indiscriminately and creates decay
                   entry at every cut
```

The geometry is why a modest-sounding reduction is a large removal. Leaves are on the outside of the crown, so a
crown reduced by a small fraction of its radius loses a much larger fraction of its leaf surface -- and leaf area
is the tree's entire energy supply. A specification written as "reduce by 25 percent" is ambiguous between
dimension and leaf area, and the two differ by a factor that matters.

The tree's response makes over-removal self-compounding. A tree that loses too much foliage responds with
epicormic sprouts -- fast, weakly attached shoots from dormant buds -- which restore leaf area quickly and produce
a crown that is structurally worse than the one removed. Those sprouts then need managing for years, which is why
a heavy reduction is the beginning of a maintenance commitment rather than the end of a job.

Mature trees tolerate much less than young ones. A vigorous young tree can recover from a heavy reduction; a
mature or stressed tree has fewer reserves and a smaller capacity to respond, and the same percentage removal
that a young tree shrugs off can begin a decline that takes years to become visible and is not reversible when it
does.

Topping is the failure case worth naming: it is not a reduction technique, it removes leaf area without regard to
structure, and every heading cut is a decay entry point.

**Inputs:** crown height and spread before and after, the intended reduction expressed as dimension or as live crown removed, the tree age and vigour class, and the species tolerance

**Outputs:** the crown volume and approximate leaf area before and after, the leaf area removed as a percentage, the dimensional reduction against the leaf area reduction, that against the entered dose limit, and the reduction dimension that corresponds to a target leaf-area removal

## 3. Worked example

A crown 40 ft across reduced to 34 ft -- a 15 percent reduction in spread, which sounds modest.

Leaf area is concentrated in the outer canopy, so reducing the radius from 20 ft to 17 ft removes the outermost
shell of the crown, which holds a share of leaf area far above its share of volume:

```
volume ratio (as a sphere)  = (17/20)^3 = {(17/20)**3:.3f}, so 14% of volume removed
leaf area removed            -- substantially more, because the removed shell is the
                                outer shell where the leaves are
```

**A 15 percent dimensional reduction can be a 25 to 35 percent leaf area removal**, and the specification that
said "reduce 15 percent" and the work that removed a third of the tree's energy production are the same job.

The dose limits are on LIVE CROWN removed, not on dimension. A specification written in dimensions and a limit
written in leaf area do not talk to each other, and reconciling them before the climber leaves the ground is the
point.

The response: a mature tree taken to a third leaf area removal will sprout epicormically -- fast, weak shoots
that restore leaf area within a season and produce a crown with far worse attachment than the one removed. Those
sprouts then need thinning for several years, and the tree that was pruned once now needs pruning repeatedly.

Topping is not on this scale at all. It removes leaf area without regard to where cuts fall, leaves large heading
wounds that do not compartmentalize, and starts decay at every one.

## 4. Scope and non-goals

A geometric estimate of leaf-area removal. Crown geometry is not a sphere and leaf area distribution varies by
species, age, growing conditions, and previous pruning, so the relationship between dimensional reduction and
leaf area removal is indicative rather than precise. It does not specify a pruning dose, which depends on species,
age, vigour, season, site, and the objective, and which ANSI A300 addresses as a matter of professional judgment
rather than a fixed number. It does not address pruning cut placement, which determines whether wounds
compartmentalize, or the objectives -- clearance, risk reduction, structure, restoration -- that should drive the
specification. It does not evaluate whether reduction is the right treatment at all; many objectives are better
met by selective removal, cabling (`tree-cabling-rating`), or by managing the target rather than the tree. ANSI
A300 Part 1, the ISA best management practices for pruning, and a qualified arborist govern.
