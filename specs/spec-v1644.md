# roughlogic.com Specification v1644 -- Dock Piling Embedment and Lateral Load (`calc-mechanic.js`, Group K Mechanic - Auto, Marine, Aviation, marine, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, Mechanic - Auto, Marine, Aviation -- the existing category, hub `/groups/mechanic/`; marine and boatyard), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A dock piling resists boat impact, wind on moored vessels, and ice by bending against the soil that holds it, and how deep it has to go is the same embedment problem as a fence post with much larger loads. Pilings driven to refusal are not necessarily pilings driven deep enough.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pile diameter, load, or lateral bearing value, or a load applied at or below the mudline returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the nonconstrained lateral embedment relation with the geotechnical investigation and a licensed engineer named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`dock piling embedment`, `pile lateral capacity dock`, `berthing load piling`, `pier pile depth`, `scour dock piling`.

## 2. The tile

### 2.1 `dock-piling-lateral` -- Dock Piling Embedment and Lateral Load

```
lateral capacity  from the soil's lateral resistance over the embedded depth
embedment         the nonconstrained case: d = 0.5 A (1 + sqrt(1 + 4.36 h / A))
                  with A = 2.34 P / (S1 b), the same form as IBC 1807.3
lateral load       from berthing energy, wind on moored vessels, current, and ice
moment             P x height above mudline; the piling is a cantilever from the soil
scour              lowers the effective mudline and reduces embedment; a real failure mode
marine borers      untreated or damaged timber loses section below the waterline
```

A piling is a cantilever fixed in soil, and its capacity depends on the soil's lateral bearing over the
embedded length rather than on how hard it was to drive. Driving to refusal establishes axial capacity against a
hard layer; it says nothing about lateral resistance in the soft material above, which is what resists a boat
pushing sideways. A piling that refused on a shallow hard stratum can be laterally inadequate.

The loads are larger than they look. Berthing energy is a vessel's mass times the square of its approach speed,
delivered over a short distance, and even a slow approach by a heavy boat is a substantial force; wind on a
moored vessel's windage acts continuously and multiplies across a row of slips. Ice, where it occurs, adds both
lateral load and uplift as it rises and falls with the tide.

Two site conditions degrade a correct design over time. Scour removes soil from around the piling and lowers the
effective mudline, which shortens the embedment and lengthens the cantilever simultaneously -- a double penalty.
And marine borers destroy untreated or damaged timber in the tidal and submerged zones, sometimes rapidly,
leaving a piling that looks sound above water and has lost its section below.

**Inputs:** pile diameter and material, the lateral load and its height above the mudline, the soil lateral bearing value, whether the top is restrained by a deck, the anticipated scour depth, and the water depth

**Outputs:** the applied moment at the mudline, the required embedment for the entered soil, the embedment with a stated scour allowance, the capacity of an existing embedment, and the lateral load a given piling and embedment supports

## 3. Worked example

A 12 in timber piling taking a 1,200 lb lateral load 6 ft above the mudline.

```
moment at mudline = 1,200 x 6 = 7,200 ft-lb
```

The required embedment follows the same nonconstrained relation the catalog uses for posts
(`pole-embedment-depth`), with the soil's lateral bearing entered from the geotechnical information for the site.

**The scour correction is what makes this a marine problem rather than a fence problem.** If 2 ft of scour is
anticipated around the piling:

```
effective mudline drops 2 ft
embedment loses 2 ft
cantilever gains 2 ft, so the moment rises to 1,200 x 8 = 9,600 ft-lb
```

The demand went up 33% and the resistance went down at the same time. A design that ignores
scour can be adequate on the day it is built and inadequate after one storm season.

Marine borers: in waters where they are active, an untreated or damaged timber pile can lose most of its section
in the tidal zone within a few years while appearing sound from the dock. Inspection below the waterline, not
above it, is what establishes the condition of a pile.

## 4. Scope and non-goals

A screening calculation using the same nonconstrained embedment form as building code post design. It does not
determine the lateral load, which for a dock includes berthing energy, wind and current on moored vessels, wave
loading, and ice, and which requires the design vessel and site exposure; berthing energy in particular depends
on approach speed, vessel mass, and the fender system's energy absorption. It does not evaluate the pile
structurally in bending, buckling, or connection to the deck, or address axial capacity and driving criteria,
which are separate. It does not model soil-structure interaction properly -- a p-y analysis is what a designed
marine structure uses. It does not address scour prediction, marine borer protection and treatment retention,
corrosion of steel piles, or the permitting that in-water work requires. The geotechnical investigation, ASCE
marine structures guidance, the applicable permits, and a licensed engineer govern.
