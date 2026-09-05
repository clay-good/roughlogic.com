# roughlogic.com Specification v1695 -- Tree Trunk Strength Loss and Failure Screen (`calc-arborist.js`, Group L Agriculture and Forestry, arboriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`**
> (Group L, Agriculture and Forestry -- the existing category, hub `/groups/agriculture/`; arboriculture and landscape), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A hollow tree is not necessarily a hazardous tree, because a hollow cylinder retains most of its strength. The percentage of section lost is a geometric calculation and it is the first quantitative step in a tree risk assessment -- with the important caveat that it is a screen and not a verdict.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive trunk diameter, a hollow diameter at or above the trunk diameter, or an opening width exceeding the circumference returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the moment-of-inertia strength loss relation with ANSI A300 Part 9 and the ISA tree risk methodology named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`tree strength loss hollow`, `trunk decay percentage`, `tree risk hollow trunk`, `moment of inertia tree hollow`, `open cavity strength loss`.

## 2. The tile

### 2.1 `trunk-strength-loss` -- Tree Trunk Strength Loss and Failure Screen

```
strength loss    based on the moment of inertia lost, not the area lost
formula          loss % = (d^4 + R x (D^4 - d^4)) / D^4 ... for a hollow with an opening
simple hollow    loss % = (d / D)^4 x 100     (concentric hollow, no opening)
key insight      a hollow occupying half the diameter loses only about 6% of strength
opening          a longitudinal opening in the shell reduces strength far more than a
                 closed hollow of the same size
thresholds       a commonly cited screening threshold is one third of strength lost,
                 but it is a screen and not a criterion for removal
```

The fourth power is why hollow trees stand. Bending strength depends on the moment of inertia, which scales as
the fourth power of diameter, so the wood near the outside does almost all the work and the wood at the centre
does almost none. A hollow occupying half the trunk's diameter removes half the diameter's worth of centre wood
and about six percent of the strength -- a result that is deeply counterintuitive and that saves a great many
sound trees from being removed.

The opening changes everything. A closed hollow is a tube, and a tube is efficient; cut a longitudinal opening in
it and it is no longer a tube, it can no longer resist torsion or ovalization, and its strength falls
dramatically. So a cavity with a large open face is a much more serious finding than a larger closed hollow, and
the two must not be assessed with the same number.

The thresholds are screening tools and they are widely misused. A percentage of strength loss says nothing about
the load the tree actually carries -- its height, crown area, exposure, lean, and the wind it sees -- or about the
target beneath it. A high-strength-loss tree in a forest with no target is not a hazard; a modest-loss tree over
a playground in an exposed position may be. Strength loss feeds a risk assessment; it is not one.

**Inputs:** the trunk diameter at the defect, the hollow or decayed diameter, the width of any longitudinal opening, the shell thickness at its thinnest, and the height and crown dimensions for the loading context

**Outputs:** the strength loss for a closed hollow, the strength loss with the entered opening, the residual shell thickness as a fraction of radius, the loss against a stated screening threshold, and the hollow diameter at which the threshold is reached

## 3. Worked example

A 30 in diameter trunk with a closed hollow 15 in across:

```
loss = (15 / 30)^4 x 100 = (0.50)^4 x 100 = 6.2%
```

**6.2 percent.** Half the diameter is hollow and the tree has lost about six percent of its
bending strength, because the fourth power puts nearly all the strength in the outer wood.

The hollow has to get much larger before it matters:

```
20 in hollow: (0.67)^4 = 19.8%
24 in hollow: (0.80)^4 = 41.0%
27 in hollow: (0.90)^4 = 65.6%
```

A one-third strength loss is not reached until the hollow is about 23 in -- more than three
quarters of the diameter.

**The opening is the finding that changes it.** The same 24 in hollow with a 10 in wide longitudinal opening is
not a tube any more: it cannot resist torsion, the shell can ovalize, and the strength loss is far above the
41 percent the closed calculation gives. A cavity with a large open face is a more serious defect
than a bigger closed one.

And the number is not the assessment. This tree's risk depends on its height and crown, its exposure, its lean,
whether anything is beneath it, and how often -- and a 6 percent loss in an exposed
leaning tree over an occupied structure is a different matter from the same loss in a sheltered one over
nothing.

## 4. Scope and non-goals

A geometric strength-loss calculation. It is one input to a tree risk assessment and not a risk assessment or a
removal criterion. It assumes a sound shell of uniform thickness around a hollow, which real decay is not --
decay is irregular, its boundary is not where a probe suggests, and incipient decay in apparently sound wood
carries reduced strength that no dimension captures. It does not account for reaction wood, included bark,
codominant stems, root plate condition, previous failures, or the many defects that cause failures more often
than trunk hollows do. It does not evaluate the load, which depends on height, crown area, exposure, lean, and
wind, or the target and its occupancy, and those are what convert a defect into a risk. Advanced assessment tools
-- resistance drilling, sonic tomography, static pull testing -- exist because visual and geometric methods are
limited. ANSI A300 Part 9, the ISA Tree Risk Assessment methodology, and a qualified arborist govern.
