# roughlogic.com Specification v1917 -- FEMA Hazardous Tree, Hanger, and Stump Screen with Extraction Volume (`calc-debris.js`, Group L Agriculture and Forestry, debris management, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-debris.js`**
> (Group L Agriculture and Forestry, hub `/groups/agriculture/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** After a storm, tree crews on public property work to FEMA's thresholds: which leaning trees qualify, which hanging limbs, and which uprooted stumps are extracted rather than flush-cut -- and an extracted stump is paid by a cubic-yard volume from a formula that includes its root ball. `stump-grinding-volume` covers a flush grind; no tile applies the thresholds or the extraction volume.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive diameter or measurement returns `{ error }`; a root-ball exposure or crown-damage percent outside 0-100 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): FEMA-325, *Public Assistance Debris Management Guide* (2007), Chapter 3 (hazardous trees, hanging limbs, and hazardous stumps), and Appendix G, DAP9523.11 stump conversion (stump diameter measured 2 ft above ground; root ball diameter 3.6 times the stump diameter; root ball height 31 in), named as the method, with the current Public Assistance Program and Policy Guide named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`fema hazardous tree criteria`, `stump extraction cubic yards`, `hanger limb removal fema`, `leaning tree 30 degrees`, `stump conversion table`.

## 2. The tile

### 2.1 `hazard-tree-stump-screen` -- FEMA Hazardous Tree, Hanger, and Stump Screen with Extraction Volume

```
tree        caused by the disaster, an immediate threat, diameter at breast
            height >= 6 in, AND one of: > 50% of the crown damaged or
            destroyed; a split trunk or broken branches exposing heartwood;
            fallen or uprooted in a public-use area; leaning > 30 degrees
lean        angle = atan(horizontal offset of the top / height), degrees
            < 50% of the root ball exposed -> cut flush at ground level
hanger      on improved public property, > 2 in diameter at the break, still
            hanging and threatening a public-use area
stump       >= 50% of the root ball exposed, > 24 in diameter measured 24 in
            above ground, on improved public property or right-of-way, an
            immediate threat -> eligible for extraction
volume      [(D^2 x 0.7854 x 24) + ((3.6 D)^2 x 0.7854 x 31)] / 46,656 cy
            (D in inches; the 24 in stump length reproduces every row of the
            conversion table; the table text does not state it)
fill        the extraction volume is also the fill to restore the hole
```

The criteria are a checklist, and the tile applies them in order so that a crew can document each tree the way the
reimbursement request will be reviewed. The lean is the one measurement that needs arithmetic: the horizontal offset
of the top from the base and the height give the angle, and the threshold is thirty degrees. A qualifying tree with
less than half its root ball exposed is cut flush, and the stump is not separately paid.

An uprooted stump over 24 inches is different: it is extracted, and the volume paid is the stump and its root ball, not
the flush-cut stub. FEMA's conversion table gives that volume by diameter, built from field findings -- a root ball 3.6
times the stump diameter and 31 inches deep. The table's text does not say how long a length of stump it includes; a
24 inch length reproduces every row, and the tile uses it and says so. The same volume is the fill needed for the hole,
which FEMA asks for in the documentation.

The criteria come from the 2007 debris guide. The current Public Assistance Program and Policy Guide carries them
forward, and it governs where the two differ; the tile names both.

**Inputs:** for a tree, the diameter at breast height, the crown damage percent, split trunk or exposed heartwood, fallen in a public-use area, the lean measurements, and the root-ball exposure; for a hanger, the diameter at the break and the location; for a stump, the diameter 24 in above ground, the root-ball exposure, and the location

**Outputs:** the eligibility result for each criterion, the lean angle, the flush-cut or extraction determination, the extraction volume in cubic yards, and the fill volume

## 3. Worked example

**An uprooted oak on a public right-of-way, 36 in in diameter 24 in above ground, 70% of the root ball exposed:**

```
stump criteria   >= 50% exposed, > 24 in -> eligible for extraction
volume           (1,296 x 0.7854 x 24 + 129.6^2 x 0.7854 x 31) / 46,656
                 = (24,429 + 408,943) / 46,656 = 9.29 cy   (table: 9.3)
fill             about 9.3 cy
```

**9.3 cubic yards for one stump -- and 94% of it is root ball.** A 48 in stump is 16.5 cy, matching the table.

**A leaning tree whose top is displaced 6 ft at a point 8 ft up the trunk:**

```
lean = atan(6 / 8) = 36.9 degrees > 30 -> meets the lean criterion
```

With 30% of its root ball exposed it is cut flush, and the stump stays.

## 4. Scope and non-goals

A documentation aid applying FEMA's published criteria and stump conversion. Eligibility is determined by FEMA and the state from the applicant's documentation, and the criteria in the Public Assistance Program and Policy Guide in force at the time of the disaster govern. It does not assess tree risk as an arborist would, address private-property trees except limbs over a public right-of-way, or price the work. It does not compute flush-grind volumes (`stump-grinding-volume`) or chip volumes (`chipper-debris`). FEMA Public Assistance, the state, and a qualified arborist govern.
