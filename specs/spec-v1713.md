# roughlogic.com Specification v1713 -- Casting Pour Weight, Gating Yield, and Charge (`calc-process.js`, Group G Cross-Trade Utilities, foundry, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-process.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; foundry and casting), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A casting weighs less than the metal poured to make it, because the gating, risers, and sprue solidify too and go back to the furnace. Yield is the ratio, and it determines the melt charge, the furnace time, and the real cost of every casting.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive casting or poured weight, or a casting weight exceeding the poured weight returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the casting yield definition and the poured-weight basis as standard foundry practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`casting yield foundry`, `pour weight versus casting weight`, `gating and riser weight`, `melt charge calculation`, `foundry returns ratio`.

## 2. The tile

### 2.1 `casting-pour-yield` -- Casting Pour Weight, Gating Yield, and Charge

```
casting yield      Y = casting weight / total poured weight
poured weight      casting + gating system + risers + sprue and pouring basin
typical yields     40 to 70% for sand casting; higher for investment and die casting
charge             the furnace charge is the poured weight, not the casting weight
returns            gating and risers are remelted, so the material is not lost -- but
                   the ENERGY to melt it is spent every cycle
risers             sized to feed shrinkage; larger risers mean lower yield and sound castings
                   the trade is direct and it is the foundry's central design problem
```

Yield is the foundry's central economic number because everything scales with poured weight rather than casting
weight. The furnace charge, the melt energy, the pouring time, the sand volume, and the cleaning labour all follow
the metal poured, while only the casting is sold. So a 50 percent yield job costs twice the melt energy per
saleable pound of a 100 percent one, and the difference is paid on every casting for the life of the pattern.

The risers are what set it and they cannot simply be reduced. A riser exists to feed the casting's solidification
shrinkage, and a riser too small feeds insufficiently and leaves shrinkage porosity in the casting -- which is a
scrap casting, and scrap is far more expensive than a low yield. So the design tension is real: bigger risers give
sound castings and lower yield, and the riser sizing (`riser-modulus-feeding`) is what resolves it rather than a
yield target.

The returns point is worth being precise about. Gating and risers are remelted and the metal is recovered, so the
material is not lost -- but the energy to melt it is spent every single cycle, and on an energy-intensive melt
that recurring cost is the real penalty of a low yield rather than any material loss. That is also why returns
handling, cleanliness, and the ratio of returns to virgin charge is a metallurgical concern as well as an
economic one.

**Inputs:** the casting weight, the gating and riser weights, the number of castings per mould, the melt loss percentage, the furnace capacity, and the energy per pound of melt

**Outputs:** the total poured weight, the casting yield, the furnace charge including melt loss, the number of moulds per heat, the melt energy per saleable pound, and the yield improvement a stated riser reduction would give

## 3. Worked example

A 280 lb casting with a gating system and risers weighing 170 lb:

```
poured weight = 280 + 170 = 450 lb
yield         = 280 / 450 = 0.622 = 62%
```

62 percent -- a normal sand casting yield.

**The energy consequence.** At 500 BTU per pound to melt and superheat:

```
per casting poured   = 450 x 500 = 225 kBTU
per saleable pound   = 804 BTU
```

804 BTU per pound of saleable casting, against 500 if the yield were perfect --
**61 percent more melt energy per pound sold**, every casting, forever.

Raise the yield to 70 percent by reducing riser volume:

```
poured = 280 / 0.70 = 400 lb
energy per saleable pound = 714 BTU
```

A 89 BTU per pound saving -- real money on a production casting.

**And the reason it is not simply done.** Those risers feed solidification shrinkage. Cut them too far and the
casting has shrinkage porosity, which is scrap -- and one scrap casting costs more than the energy saved on many
sound ones. The riser sizing is a feeding calculation (`riser-modulus-feeding`), not a yield target, and yield is
the outcome rather than the input.

The metal itself is not lost: gating and risers are remelted. It is the energy that is spent again each cycle.

## 4. Scope and non-goals

A ratio calculation. Yield is a consequence of the gating and feeding design rather than a target to be set,
and reducing riser volume to improve it without a feeding analysis produces shrinkage defects that cost far more
than the energy saved. It does not size gating or risers, evaluate feeding distance
(`riser-modulus-feeding`), or address directional solidification, chills, and insulating sleeves, all of which
change the riser volume needed for a sound casting. It does not address melt loss, which adds to the charge, or
the metallurgical consequences of returns ratio, which affects composition and cleanliness. It does not address
scrap rates, which dominate real cost far more than yield does. The foundry's methoding, solidification
simulation, and the metallurgist govern.
