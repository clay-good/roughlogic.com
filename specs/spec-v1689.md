# roughlogic.com Specification v1689 -- Slab Shoring and Reshoring Load Distribution (`calc-construction.js`, Group E Carpentry and Construction, scaffold, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; scaffold and shoring), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A freshly poured slab is carried by the shores beneath it, and those shores stand on slabs that are themselves young. The load distributes through the stack, and removing shores in the wrong order or too early loads a slab beyond what it can carry at its age.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a level count below one, a non-positive slab load or capacity, or a strength at loading below the entered minimum returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the shored-stack load distribution concept with ACI 347 and OSHA 1926 Subpart Q named, and the engineer of record named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`shoring reshoring load distribution`, `multi story slab shoring`, `backshore versus reshore`, `construction load young slab`, `stripping sequence slab`.

## 2. The tile

### 2.1 `shoring-reshoring-load` -- Slab Shoring and Reshoring Load Distribution

```
load distribution   a slab poured on shores transmits its load down through the levels
                    below, shared according to the relative stiffness of each level
reshoring           shores replaced after stripping, carrying only the loads applied AFTER
                    they are placed -- they do not pick up the slab's own weight
backshoring         shores replaced without allowing the slab to deflect; they do carry
                    a share of the existing load
levels required     enough levels that no slab carries more than it can at its age
strength            the slab's strength at the time of loading, from field-cured cylinders
sequence            the stripping and reshoring sequence is a designed procedure
```

The distinction between reshoring and backshoring is the one that gets lost and it changes the arithmetic
completely. A reshore is installed after the slab above has been stripped and allowed to deflect and carry its own
weight, so it carries only loads added afterwards. A backshore is installed without permitting that deflection --
typically by stripping and reshoring in small areas -- so it continues to carry a share of the slab's own dead
load. Treating a backshore as a reshore, or the reverse, misallocates the load through the whole stack.

The consequence is a slab loaded beyond its capacity at its age. A young slab has a fraction of its 28-day
strength, and construction loads -- the wet concrete above plus the forms plus the crew and equipment -- are often
the largest loads the slab will ever see. Multi-storey construction failures during placement are a recognized
category and shoring sequence is usually at the centre of them.

The strength to use is field-cured cylinders that experienced the same conditions as the slab, not
laboratory-cured ones. A slab poured in cold weather is far behind the lab cylinders that sat in a warm curing
tank, and stripping to a laboratory strength on a cold-weather pour is stripping to a strength the slab does not
have.

**Inputs:** the slab dead load and construction live load, the number of shored and reshored levels, whether the shores are reshores or backshores, the slab strength at each age, the slab capacity at that strength, and the stripping sequence

**Outputs:** the load carried by each level in the stack, each against the slab capacity at its age, the governing level, the number of levels required to keep every slab within capacity, and a flag where a level is overloaded

## 3. Worked example

A slab being poured on a three-level shoring stack: the new slab on shores, and two levels of reshores below.

The new pour's load -- wet concrete plus forms plus construction live load -- goes into the shores and down
through the levels below, shared according to the relative stiffness of each slab.

```
level 1 (directly below): youngest of the supporting slabs, and takes the largest share
level 2:                  older and stiffer, takes less
level 3:                  older still
```

**The governing check is at level 1**, which is both the youngest supporting slab and the most heavily loaded --
and its capacity is whatever its field-cured cylinders say it has TODAY, not its 28-day design strength.

The reshore-versus-backshore distinction changes the whole distribution. If those levels were stripped and
allowed to deflect before the shores went back, each slab is already carrying its own dead load and the reshores
carry only the new construction load. If they were backshored -- stripped and reshored in small areas without
allowing deflection -- the shores are still carrying a share of the dead load too, and the stack is loaded quite
differently.

Getting that wrong is not conservative in a predictable direction: it can under-count the load on a level or
over-count it, and the design of the sequence depends on which it is.

The cold weather trap: laboratory cylinders in a warm tank at 4,000 psi say nothing about a slab poured at 38
degF. Field-cured cylinders that saw the same conditions are what authorize stripping.

## 4. Scope and non-goals

A screening discussion. Shoring and reshoring for multi-storey construction is an engineered system: ACI 347
gives the requirements, the load distribution through a shored stack depends on the relative stiffnesses and on
the construction sequence, and the design of the shoring, the stripping sequence, and the reshoring must be
performed by a qualified engineer for the specific structure. It does not compute the load distribution, which
requires a stiffness analysis of the stack. It does not determine construction loads, evaluate the shores
themselves or their bracing, address the slab's capacity at age, or determine stripping strengths -- which come
from field-cured cylinders representing the actual member and from the engineer of record. It does not address
post-tensioned construction, where stressing sequence interacts with shoring. Formwork and shoring failures
during concrete placement are a recognized fatality category: ACI 347, OSHA 1926 Subpart Q, the shoring designer,
and the engineer of record govern.
