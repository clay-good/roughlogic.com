# roughlogic.com Specification v1913 -- USACE Hurricane Debris Estimating Model (`calc-debris.js`, Group E Carpentry and Construction, debris management, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-debris.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Before a single truck rolls, a county has to estimate how much debris a hurricane left -- for contracts, for disposal sites, and for the federal reimbursement request -- and the Corps of Engineers' model does it from population, storm category, and three multipliers. `demo-debris` converts a known volume to tons; no tile forecasts the volume.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive population or persons per household returns `{ error }`; a storm category outside 1-5 returns `{ error }`; a woody fraction outside 0-1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): FEMA-325, *Public Assistance Debris Management Guide* (2007), Appendix B, "USACE Hurricane Debris Estimating Model" (Steps 1 and 3), and Chapter 6 (volume-weight conversion factors and the plus-or-minus 30% accuracy), named as the method, FEMA Public Assistance and the applicant's debris management plan named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`hurricane debris estimate`, `usace debris model`, `how much debris from hurricane`, `debris cubic yards per household`, `fema debris forecast`.

## 2. The tile

### 2.1 `hurricane-debris-estimate` -- USACE Hurricane Debris Estimating Model

```
model        Q (cy) = H x C x V x B x S
households   H = population / 3 (carried unrounded)
C, cy/household by category   1: 2   2: 8   3: 26   4: 50   5: 80
V vegetation     light 1.1   medium 1.3   heavy 1.5
B commercial     light 1.0   medium 1.2   heavy 1.3
S precipitation  none to light 1.0   medium to heavy 1.3
                 (the model describes the wet-storm increase for category 3
                  and above; the tile flags S = 1.3 below category 3)
accuracy     plus or minus 30%
composition  default 30% clean woody, 70% mixed C&D (Hurricane Andrew);
             the guide notes Hurricane Fran was the reverse -- an input
             C&D split: 42% burnable after sorting, 5% soil, 15% metals,
             38% landfilled
tons         softwood 6 cy/ton, hardwood 4, mixed 4, C&D 2
```

The model is a household count times a per-household debris factor for the storm category, adjusted for trees,
commercial buildings, and rain. The category factor carries most of the spread -- a category 5 storm produces forty
times the debris per household of a category 1 -- and the multipliers can add up to about 150% on top. The result is a
planning number with a stated accuracy of thirty percent either way, and the tile shows the band rather than a single
figure.

The composition split decides the disposal plan. Clean woody debris can be ground or burned and reduced by 75 to 95
percent; construction and demolition debris has to be sorted, and most of it goes to a landfill. The guide's default
split is from one hurricane and it warns that another produced the reverse, so the tile takes the woody fraction as an
input. The C&D breakdown and the weight conversions turn the cubic yards into the tons that landfill contracts are
written in.

The tile carries the household count unrounded because the guide's own worked example does: rounding Harrison County's
households to 55,167 before multiplying gives 6,992,417 cy, and the printed 6,992,374 comes from the unrounded count.
The difference is trivial; the discipline of reproducing the printed example is not.

**Inputs:** the population of the affected area, the storm category, the vegetative cover, the commercial density, the precipitation, the woody fraction, and the wood type (hardwood, softwood, mixed)

**Outputs:** the households, the debris volume and its plus-or-minus 30% band, the woody and C&D volumes, the C&D breakdown, and the tons of each

## 3. Worked example

**The guide's example:** Harrison County, MS, population 165,500, category 4, heavy vegetation, heavy commercial,
wet storm:

```
Q = (165,500 / 3) x 50 x 1.5 x 1.3 x 1.3 = 6,992,375 cy    (guide prints 6,992,374)
```

**A county of 45,000, category 3, medium vegetation, light commercial, wet storm:**

```
H       15,000
Q       15,000 x 26 x 1.3 x 1.0 x 1.3 = 659,100 cy   (461,370 to 856,830)
woody   30% = 197,730 cy -> 49,433 tons at 4 cy/ton (hardwood)
C&D     70% = 461,370 cy -> 230,685 tons at 2 cy/ton
        burnable 193,775 cy   soil 23,068   metals 69,205   landfill 175,321
```

**About 660,000 cubic yards, and 230,000 tons of it is C&D** -- the part that needs sorting and landfill space. If the
storm's mix turns out to be the reverse, the landfill share drops by more than half, which is why the woody fraction
is revisited once the first loads are seen.

## 4. Scope and non-goals

A planning forecast by the USACE model with its stated accuracy. It does not replace field estimates or load-ticket quantities (`debris-load-ticket`), and it does not address tornado, flood, earthquake, or wildfire debris, which the model was not built for. FEMA-325 (2007) has been superseded in part by the Public Assistance Program and Policy Guide; the model's factors remain the published USACE values. It does not size disposal sites (`debris-management-site-sizing`) or estimate individual structures (`structure-debris-estimate`). FEMA Public Assistance, the state, and the applicant's debris management plan govern.
