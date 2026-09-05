# roughlogic.com Specification v1688 -- Suspended Scaffold Outrigger Counterweight (`calc-construction.js`, Group E Carpentry and Construction, scaffold, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; scaffold and shoring), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A suspended scaffold outrigger is a lever with the load on the long end, and the counterweight on the short end has to hold it down with a large factor of safety. The ratio of the arms multiplies the required weight, and it is a number that gets guessed at with fatal results.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive load, outboard or inboard arm, or factor of safety below one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the moment balance with the 4:1 factor and OSHA 1926 Subpart L and the qualified person named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`suspended scaffold counterweight`, `outrigger beam counterweight calculation`, `swing stage counterweight`, `4 to 1 counterweight scaffold`, `tieback suspended scaffold`.

## 2. The tile

### 2.1 `suspended-scaffold-counterweight` -- Suspended Scaffold Outrigger Counterweight

```
moment balance    W_load x outboard arm = W_counter x inboard arm
required weight   W_counter = W_load x (outboard / inboard) x FS
factor of safety  4:1 against overturning is the common requirement
counterweights    must be non-flowable, secured to the outrigger, and not be
                  material that can be removed for other use
tieback           required in addition to counterweights, to independent anchorage
suspended load    the full rated load of the platform, not its empty weight
```

The lever ratio is what makes the counterweight large. An outrigger reaching 18 inches inboard and 6 feet
outboard has a 4:1 disadvantage before the safety factor, so a 1,500 lb suspended load needs several times that
in counterweight -- and applying a 4:1 factor on top puts the requirement into thousands of pounds per outrigger.
Crews who have not run the arithmetic consistently underestimate it, because the physical weight looks absurd
next to the platform.

The load to use is the platform's RATED load, not what happens to be on it. The scaffold is designed to carry
that load and the counterweight has to hold it down whether or not today's crew intends to use it, and a
counterweight sized for two workers is inadequate the day someone stages material.

Two requirements sit alongside the weight and are not substitutes for it. Counterweights must be non-flowable and
secured -- sand bags, water containers, and loose material are prohibited because they leak, are removed, or are
borrowed for other work, and a counterweight that walks away is the classic failure. And a tieback to independent
structural anchorage is required in addition, so that the outrigger cannot slide or rotate even if the
counterweight is disturbed.

The anchorage the tieback goes to has its own requirement and is not a parapet clamp on a cornice.

**Inputs:** the platform rated load including workers and material, the outrigger outboard and inboard arm dimensions, the required factor of safety, the counterweight unit weight, and the tieback anchorage capacity

**Outputs:** the overturning moment, the required counterweight at the entered factor of safety, the number of counterweight units, the resisting moment provided, the actual factor of safety achieved, and the inboard arm that would reduce the counterweight to a target

## 3. Worked example

An outrigger with a 6 ft outboard reach and an 18 in (1.5 ft) inboard arm, carrying a
1,500 lb rated suspended load, at a 4:1 factor of safety:

```
lever ratio         = 6 / 1.5 = 4.0
counterweight       = 1,500 x 4.0 x 4 = 24,000 lb
```

**24,000 pounds per outrigger.** That is the number, and it is why properly counterweighted swing
stage setups have what looks like an absurd stack of weights on the roof.

Lengthening the inboard arm is the lever that reduces it. At a 4 ft inboard arm:

```
counterweight = 1,500 x (6/4) x 4 = 9,000 lb
```

15,000 lb less, from moving the fulcrum. Which is why outriggers are set as far back
from the parapet as the roof allows.

**The load to use is the RATED load.** Sizing on "two workers and their tools" and then staging a bundle of
material on the platform is how a correctly counterweighted setup becomes an under-counterweighted one without
anyone touching the weights.

And the counterweights themselves: non-flowable and secured to the outrigger. Sand bags leak, water drums get
emptied, and loose block gets borrowed for the job below -- every one of which has caused a fatal collapse. The
tieback to independent anchorage is required in addition, not instead.

## 4. Scope and non-goals

A statics calculation. Suspended scaffold systems are engineered assemblies and the outrigger beam, its
counterweight requirement, the tieback, the suspension ropes, the hoists, and the platform are designed and rated
together -- OSHA requires the supporting structure and the suspension system to be designed by a qualified person
and to carry the load with the specified factors, and the manufacturer's and designer's requirements govern
rather than a general moment balance. It does not evaluate the roof structure the outrigger and counterweights
bear on, which must carry a large concentrated load and is frequently the limiting element. It does not address
the tieback anchorage, the suspension ropes and their inspection, the hoists, the fall arrest system, which must
be independent of the scaffold's own support, or the competent person inspections required. Suspended scaffold
failures are fatal: OSHA 1926 Subpart L, the system manufacturer, and the qualified person who designed the
installation govern.
