# roughlogic.com Specification v1914 -- FEMA Building and Contents Debris Estimate (`calc-debris.js`, Group E Carpentry and Construction, debris management, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-debris.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** A debris estimate for a street of destroyed houses, a mobile home park, or a flooded neighbourhood is built one structure at a time from FEMA's field formulas, and the formula for a two-story house has a trap: the vegetation multiplier applies to the first story only. `demo-debris` needs the volume as an input; no tile produces it from the footprint.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive dimension, story count, or structure count returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): FEMA-325, *Public Assistance Debris Management Guide* (2007), Chapter 6 (residential formula and Figure 6.3, flooded-home personal property, mobile home volumes, outbuilding formula, conversion factors), and FEMA 329, *Debris Estimating Field Guide* (2010) (the vegetative multiplier applies to first-story debris only), named as the method, FEMA Public Assistance named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`house debris cubic yards`, `destroyed home debris volume`, `mobile home debris`, `flooded house contents debris`, `fema debris estimating field guide`.

## 2. The tile

### 2.1 `structure-debris-estimate` -- FEMA Building and Contents Debris Estimate

```
single-family   L x W x S x 0.20 x VCM  (cy; L, W in ft, S stories)
                multi-story: the VCM applies to the FIRST story only:
                L x W x S x 0.20 + L x W x 0.20 x (VCM - 1)
VCM             none 1.0, light 1.1, medium 1.3, heavy 1.5
mobile home     single-wide 290 cy, double-wide 415 cy
flooded home    personal property 25-30 cy without a basement,
contents        45-50 cy with a basement
other building  L x W x H x 0.33 / 27  (cy; H in ft; 0.33 for air space)
tons            C&D 2 cy/ton; woody per wood type
```

The residential formula is a destroyed house's floor area times a debris depth of 0.2 cubic yards per square foot per
story, with a multiplier for the trees and shrubs that come down with it. It reproduces FEMA's table exactly -- a 2,000
square foot single-story house in a medium-canopy neighbourhood is 520 cubic yards -- and it is quick enough to walk a
street with.

The multi-story trap is in the field guide rather than the formula. The vegetation belongs to the lot, not to each
floor, so on a two-story house the multiplier is applied to the first story's debris only. Multiplying the whole house
by it overstates the estimate -- 624 cubic yards against 552 for a 30 x 40 ft two-story house -- and over a neighbourhood
that becomes a contract for debris that does not exist.

Mobile homes and flooded contents have their own figures because they behave differently: a mobile home has little
empty space and produces more debris for its size, and a flooded house that is still standing produces only its ruined
contents and finishes. Outbuildings and commercial structures use the volume formula with an allowance for the air
space inside.

**Inputs:** for each structure type, the count and the dimensions (length, width, stories or height), the vegetative cover, and for flooded homes whether a basement is present

**Outputs:** the debris volume per structure and in total, by type, and the tons at the C&D factor

## 3. Worked example

**A single-story 40 x 50 ft house, medium canopy, destroyed:**

```
40 x 50 x 1 x 0.20 x 1.3 = 520 cy      (FEMA Figure 6.3: 2,000 sf, medium = 520 cy)
```

**A two-story 30 x 40 ft house, medium canopy:**

```
correct   30 x 40 x 2 x 0.20 + 30 x 40 x 0.20 x 0.3 = 480 + 72 = 552 cy
naive     30 x 40 x 2 x 0.20 x 1.3 = 624 cy   (13% too high)
```

**A 100 x 60 ft outbuilding 20 ft high:** 100 x 60 x 20 x 0.33 / 27 = 1,467 cy = 733 tons at 2 cy/ton.

**A block of 12 flooded homes with basements:** 12 x 45 to 50 = 540 to 600 cy of contents -- **about one destroyed
house's worth of debris from twelve standing ones.**

## 4. Scope and non-goals

A field estimate by FEMA's published formulas and historical figures. It does not replace measured load tickets (`debris-load-ticket`), address hazardous materials, asbestos, household hazardous waste, white goods, or electronic waste that must be segregated, or apply to partially damaged structures beyond the flooded-contents figure. FEMA-325 is partly superseded by the Public Assistance Program and Policy Guide; the field formulas remain FEMA's published values. It does not forecast community-wide totals (`hurricane-debris-estimate`). FEMA Public Assistance and the applicant's debris management plan govern.
