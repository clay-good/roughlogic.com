# roughlogic.com Specification v1715 -- Molding Sand Permeability and Vent Area (`calc-process.js`, Group G Cross-Trade Utilities, foundry, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-process.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; foundry and casting), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Molten metal entering a mould displaces air and generates steam and gas, and if that gas cannot get out it goes into the casting. Permeability is the sand's ability to pass it, and venting is the deliberate path -- and blows and pinholes are what happens when neither is enough.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive permeability number, vent area, or mould dimension returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the permeability and venting concepts with AFS sand testing and the binder supplier data named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`sand permeability foundry`, `mould venting gas defects`, `core venting blowholes`, `afs permeability number`, `green sand moisture blows`.

## 2. The tile

### 2.1 `sand-permeability-vent` -- Molding Sand Permeability and Vent Area

```
permeability      a measured sand property (AFS permeability number)
                  higher number means gas passes more easily
gas generation    from the moisture in green sand, from binders in chemically bonded
                  sand, and from core binders -- cores are often the worst offenders
vent area         deliberate vents in the cope and through the mould to atmosphere
trade             finer sand gives a better surface finish and LOWER permeability
                  coarser sand vents better and gives a rougher casting
defects           blowholes, pinholes, and in the worst case a blow that ejects metal
cores             a core surrounded by metal has no escape path except its own vents
                  and prints -- core venting is a separate and critical design
```

The trade between finish and permeability is the foundry's constant tension. Fine sand packs tightly, gives a
smooth casting surface, and passes gas poorly; coarse sand vents well and leaves a rough surface. Neither is right
in general, and the choice is made per casting -- which is why a foundry runs more than one sand system and why a
casting that gasses on a fine sand may be sound on a coarser one at the cost of finish.

Cores are the worst case and the one that produces the most defects. A core is surrounded by metal on nearly every
side, its binder decomposes and generates a large volume of gas the moment the metal arrives, and the only escape
is through the core itself to its prints and out. A core that is not vented, or whose vents are blocked by the
metal or by the core print fit, has nowhere to send that gas except into the casting -- and the defect appears as
blowholes near the cored surface.

Moisture is the green sand equivalent. Water in green sand flashes to steam instantly on contact with metal, and
steam occupies enormously more volume than the water did, so sand that is too wet generates gas faster than any
permeability can pass it. That is why green sand moisture is controlled tightly and why a rain-affected or
over-tempered sand produces blows.

**Inputs:** the sand permeability number, the sand type and moisture content, the mould and core dimensions, the binder type and its gas evolution, the vent count and area, and the casting geometry

**Outputs:** the gas evolution estimate for the entered sand and binder, the vent area provided against an indicative requirement, the permeability against the range for the casting type, a defect risk indication, and the effect of a stated change in sand fineness on both permeability and surface finish

## 3. Worked example

A casting with a large internal core in green sand.

The gas sources, in order of severity for this configuration:

```
core binder decomposition  -- the core is surrounded by metal; gas has one way out
green sand moisture        -- flashes to steam on contact
air displaced from the cavity -- the smallest term, and the one people think of first
```

**The core is the problem.** Its binder decomposes as soon as metal arrives, generating a volume of gas many
times the core's own volume, and the only escape is through the core's permeability to its prints and out of the
mould. A core with no vent passages, or with prints that seal against the mould, sends that gas into the metal --
and the blowholes appear on the cored surface where the casting is hardest to inspect.

Venting a core is therefore a design item: vent passages through the core body to the prints, and a print fit
that does not seal them. It is not something added when a casting gasses.

**The sand trade, made concrete:**

```
finer sand  -> better surface finish, lower permeability, more gas defects
coarser sand -> rougher surface, higher permeability, fewer gas defects
```

A casting that blows on a fine sand may run sound on a coarser one, and the customer's surface requirement is
what decides whether that is an acceptable answer or whether the venting has to solve it instead.

**Moisture**: green sand at excess moisture generates steam faster than any permeability passes it. Water
expands enormously on flashing, so over-tempered sand is a gas problem no venting fixes -- the control is at the
muller.

## 4. Scope and non-goals

A qualitative screening framework with an indicative vent comparison. Gas evolution from binders is measured by
standard tests and is binder-specific and quantity-specific; permeability is an AFS measured property of the
prepared sand, not a calculated one, and both must come from the foundry's own sand testing. It does not compute
gas volume or the vent area required, which depends on the binder system, the metal, the pouring rate, and the
mould geometry, and which foundry practice and simulation address. It does not address core design, print fit,
core coatings, or the sand system's other properties -- green strength, compactability, friability, and hot
strength -- which interact with permeability and with each other. It does not address the many other causes of
gas defects, including wet or rusty chills, damp inoculant, and inadequate metal degassing. The foundry's sand
laboratory, the binder supplier's data, and the metallurgist govern.
