# roughlogic.com Specification v1511 -- Blast Hole Stemming Length and Flyrock Screen (`calc-mining.js`, Group E Carpentry and Construction, blasting, 1 New Tile)

> **Status: LANDED 2026-09-05. Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Short stemming is the single most common cause of flyrock, and flyrock is what kills people at blasting sites. The check is one ratio a blaster can run at the collar with a tape: stemming length against burden, and the stemming-to-diameter ratio underneath it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive burden or hole diameter, or a stemming length at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the stemming-to-burden and stemming-to-diameter ratio conventions with MSHA named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`stemming length blasting`, `flyrock stemming ratio`, `blast collar distance`, `stemming to burden ratio`, `stemming stone size`.

## 2. The tile

### 2.1 `blast-stemming-length` -- Blast Hole Stemming Length and Flyrock Screen

```
stemming length     T = 0.7 to 1.0 x B          (0.7 B typical, 1.0 B where flyrock matters)
by diameter         T >= 20 x d / 12            (a common minimum, d in inches)
governing           use the LARGER of the two
flyrock risk        rises sharply as T / B falls below 0.7
stemming material   angular crushed stone, roughly d/10 to d/20 in size, NOT drill cuttings
```

Stemming is the plug that keeps explosive gases in the hole long enough to break rock instead of blowing out
the top. When it is too short, the gases take the path of least resistance straight up, and everything above the
charge leaves at speed. The collar region is also where the burden is least confined, so it is doubly the place
where things go wrong.

The material matters nearly as much as the length. Angular crushed stone sized around a tenth to a twentieth of
the hole diameter locks and holds; drill cuttings, which are free and right there, fluidize and blow out, and
using them is a documented contributor to flyrock incidents. The tile reports the recommended stemming stone size
alongside the length because in the field those two decisions are made at the same moment, by the same person,
standing at the collar.

One more field reality: this check should be run against the SHORTEST stemming in the shot, not the average. One
short hole is enough.

**Inputs:** burden, hole diameter, the proposed stemming length, and the stemming material type

**Outputs:** the recommended stemming length from both the burden and the diameter rules, the governing (larger) value, the achieved stemming-to-burden ratio, a flyrock-risk flag below 0.7, and the recommended stemming stone size range

## 3. Worked example

An 8 ft burden with 3.5 in holes:

```
by burden    T = 0.7 x 8      = 5.6 ft   (1.0 x B = 8.0 ft where flyrock matters)
by diameter  T = 20 x 3.5 / 12 = 5.8 ft
governing                       = 5.8 ft
stemming stone: 3.5 / 20 to 3.5 / 10 = 0.18 to 0.35 in -> a clean 1/4 in angular chip
```

5.8 ft of stemming, minimum. Now the failure case, which is the one worth carrying to the
field: a hole loaded to 4 ft of stemming on the same 8 ft burden has a ratio of `0.50` -- half the
recommended value. That hole will vent, and the material above the charge is going somewhere.

Where a nearby structure, road, or occupied area is in play, the practice is to move toward 1.0 x B
(8.0 ft here) rather than 0.7, accept the slightly worse fragmentation at the collar, and deal with the
oversize at the crusher instead of on the neighbour's roof.

## 4. Scope and non-goals

A stemming-length screen from published ratio ranges. It does not predict flyrock distance or throw, which
depends on rock structure, the presence of voids and mud seams, face burden variation (a face that has sloughed
leaves a hole with far less burden than the drill pattern says), initiation timing, and confinement -- and face
burden variation, not the design burden, is the usual real cause. Measuring the actual face profile before
loading is what catches that, and no calculation substitutes for it. The tile does not design blast area
security, determine the blast danger zone or evacuation radius, or address mats and covers. It does not evaluate
airblast (`blast-airblast-overpressure`) or vibration. Blasting is a licensed activity and flyrock is a fatality
mechanism: the blaster in charge, the state and federal explosives regulations, MSHA or OSHA jurisdiction, and
the site's blast plan govern.
