# roughlogic.com Specification v1902 -- OSHA Appendix C Timber Trench Shoring Lookup (`calc-usar.js`, Group E Carpentry and Construction, collapse shoring, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-usar.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** The catalog tells a crew whether a trench needs protection (`excavation-protection-trigger`) and how to slope or bench it (`trench-slope`, `excavation-bench-plan`), but not how to shore it. OSHA's Appendix C timber tables are federal text and in the public domain, and they answer the question a utility repair or a trench rescue asks first: what size crossbraces, wales, and uprights, at what spacing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a depth below 5 ft returns a routing note to `excavation-protection-trigger`; a depth above 20 ft returns `{ error }` with the note that App. C does not apply and a registered professional engineer must design the system; a width above 15 ft, or a soil type other than A, B, or C, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): 29 CFR 1926 Subpart P, Appendix C (Timber Shoring for Trenches), Tables C-1.1, C-1.2, and C-1.3 (actual-size mixed oak, bending strength not less than 850 psi) and Tables C-2.1 through C-2.3 (nominal-size Douglas fir), paragraphs (d)(2) (limitations) and (f) (examples) -- federal regulation, public domain, transcribed -- named as the rule, the competent person named as governing, GOVERNANCE.worker_safety.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`timber trench shoring`, `osha appendix c shoring`, `trench crossbrace size`, `trench shoring wales uprights`, `skip shoring spacing`.

## 2. The tile

### 2.1 `osha-timber-trench-shoring` -- OSHA Appendix C Timber Trench Shoring Lookup

```
lookup        soil type (A, B, C) x depth band (5-10, 10-15, 15-20 ft) x
              crossbrace horizontal spacing x trench width (up to 4, 6, 9,
              12, 15 ft) -> crossbrace size and vertical spacing, wale size and
              vertical spacing (or "not required"), upright size and maximum
              horizontal spacing ("close" = close sheeting)
pressure      the table's design basis, shown for context:
              Type A  Pa = 25 H + 72 psf
              Type B  Pa = 45 H + 72 psf
              Type C  Pa = 80 H + 72 psf        (all with a 2 ft surcharge)
crossbrace    tributary load = Pa x horizontal spacing x vertical spacing (lb)
limits        (d)(2)(ii): the tables do NOT apply with adjacent loads above a
              2 ft soil surcharge, more than 240 lb gravity load on a
              crossbrace, equipment over 20,000 lb, or a partly sloped trench
              unless its slope is flatter than 3H:1V or the members are chosen
              for the full depth
```

Appendix C is a lookup, and the tile's job is to make the lookup exact. The inputs are the soil type, the depth, the
width, and the crossbrace horizontal spacing the crew chooses; the output is every member of the system. Where the
table offers several arrangements for the same trench -- wider crossbrace spacing with heavier members and wales, or
closer spacing with lighter members and no wales -- the tile lists all of them, as OSHA's own examples do, because the
choice depends on the timber on hand and the work in the trench.

The pressure formulas are printed on each table and show why the soil type matters so much. At 13 ft, Type A soil is
designed for 397 psf, Type B for 657, and Type C for 1,112 -- nearly three times the Type A pressure. Type C soil
requires close sheeting, with no gaps between uprights, at every depth. The tile reports the pressure and the load each
crossbrace carries so that the sizes are not a black box.

The limitations are the part that must not be skipped. The tables assume no heavier surcharge than 2 ft of soil, no
equipment over 20,000 lb near the edge, and nothing heavier than 240 lb standing on a crossbrace; in a disaster
setting -- an excavator working beside the trench, a collapsed structure's debris, spoil piled at the edge -- one of
those is often exceeded, and the tile says so and routes the reader to an engineered design. The tables are for
actual-size mixed oak; the nominal-size Douglas fir tables are a separate set and are selected explicitly.

**Inputs:** the soil type (A, B, C), the trench depth, the trench width, the timber table set (actual-size oak or nominal Douglas fir), the crossbrace horizontal spacing (or "show all"), and whether any (d)(2)(ii) limitation is present

**Outputs:** every acceptable arrangement with its crossbrace, wale, and upright sizes and spacings, the design pressure, the tributary load per crossbrace, and any limitation flag

## 3. Worked example

**OSHA's own Example 1: Type A soil, 13 ft deep, 5 ft wide (Table C-1.1):**

```
Pa        25 x 13 + 72 = 397 psf
#B1       4x4 crossbraces at 6 ft horizontal, 4 ft vertical; no wales;
          3x8 uprights at 6 ft ("skip shoring")
          crossbrace load = 397 x 6 x 4 = 9,528 lb
#B2       4x6 crossbraces at 8 ft x 4 ft; 8x8 wales at 4 ft; 2x6 uprights at 4 ft
#B3       6x6 crossbraces at 10 ft x 4 ft; 8x10 wales at 4 ft; 2x6 uprights at 5 ft
#B4       6x6 crossbraces at 12 ft x 4 ft; 10x10 wales at 4 ft; 3x8 uprights at 6 ft
```

**Four acceptable arrangements, and the tile reproduces all four exactly as the regulation prints them.**

**The same trench in Type B soil (OSHA Example 2, Table C-1.2):**

```
Pa     45 x 13 + 72 = 657 psf
#B1    6x6 crossbraces at 6 ft x 5 ft; 8x8 wales at 5 ft; 2x6 uprights at 2 ft
```

**The pressure rises 65% and the uprights close from 6 ft to 2 ft apart.** In Type C the same depth is 1,112 psf and
close sheeting throughout.

## 4. Scope and non-goals

A lookup of OSHA's tabulated timber shoring for trenches up to 20 ft deep and 15 ft wide. It does not classify soil, which the competent person does under Appendix A; it does not cover hydraulic or pneumatic shoring, trench boxes and shields, sloping and benching (`trench-slope`, `excavation-bench-plan`), or any condition outside the Appendix C limitations, all of which require manufacturer tabulated data or a registered professional engineer's design under 1926.652. It does not address installation and removal sequence, which 1926.652(e) governs, or trench rescue operations beyond sizing the members. 29 CFR 1926 Subpart P and the competent person on site govern.
