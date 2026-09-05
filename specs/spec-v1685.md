# roughlogic.com Specification v1685 -- Masonry Cleaning Acid Dilution and Coverage (`calc-masonry.js`, Group E Carpentry and Construction, masonry, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-masonry.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; masonry), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Masonry cleaner is a concentrate diluted to a ratio, and the ratio is set by the unit rather than by the dirt. Too strong burns the mortar and the units, and on some masonry there is no safe acid concentration at all.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive area, coverage rate, or dilution ratio, or a dwell time outside the manufacturer range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the dilution and coverage arithmetic with the cleaner manufacturer instructions and a required test panel named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`masonry cleaner dilution`, `acid wash brick ratio`, `restoration cleaner coverage`, `prewet masonry cleaning`, `test panel masonry cleaning`.

## 2. The tile

### 2.1 `masonry-cleaning-dilution` -- Masonry Cleaning Acid Dilution and Coverage

```
dilution          parts water to parts concentrate, from the manufacturer for the unit type
coverage          square feet per gallon of DILUTED solution, from the manufacturer
concentrate       gallons of concentrate = area / coverage / (dilution + 1)
prewet            the wall is saturated before application so the cleaner stays on the
                  surface rather than being drawn into the masonry
dwell             a stated time; longer is not better and dries the cleaner in place
rinse             thorough and immediate; residual acid continues to work
NEVER on some units  acid attacks polished stone, limestone, marble, and some coloured
                  units; a test panel is required, not optional
```

The concentration is a property of the masonry rather than of the soiling. Acid-based cleaners attack the
cement paste in mortar and the surface of many units, so the correct dilution is the weakest that removes the
soiling, established on a test panel -- and strengthening it because the wall is dirty is the standard way to burn
a facade. The damage looks like efflorescence or a colour change and it is permanent.

Prewetting is what keeps the cleaner on the surface. Dry masonry draws the solution into itself, where it
attacks the mortar from within and leaves salts that migrate out for years afterward. Saturating the wall first
means the cleaner works on the face and rinses away, and skipping it is the difference between a cleaned wall and
a damaged one.

The units that must never see acid are a short list worth carrying: polished stone, limestone, marble, many
coloured and glazed units, and anything with a metallic finish or adjacent metal that the runoff will reach.
Aluminium windows below an acid-cleaned brick facade get etched by the rinse water, which is why masking and
runoff control are part of the job.

Rinsing is a quantity as well as an action. Residual cleaner keeps working, so the rinse volume and pressure are
specified, and an inadequate rinse produces damage that appears days later.

**Inputs:** the area to be cleaned, the cleaner and its dilution ratio for the unit type, the coverage rate of the diluted solution, the unit and mortar type, the dwell time, and the rinse water requirement

**Outputs:** the volume of diluted solution required, the concentrate and water quantities, the coverage at the entered rate, the rinse water volume, and a compatibility warning where the unit type is unsuitable for acid cleaning

## 3. Worked example

A 2,400 sq ft brick facade, cleaner diluted 1 part concentrate to 5 parts water, coverage 150 sq ft per
gallon of diluted solution:

```
diluted solution needed = 2,400 / 150 = 16.0 gallons
concentrate             = 16.0 / 6 = 2.7 gallons
water                   = 16.0 - 2.7 = 13.3 gallons
```

Plus prewet water and rinse water, which together are several times the solution volume and which have to be
available at the lift.

**The strengthening trap.** A crew finding the wall still dirty at 1:5 and mixing 1:3 to "get it clean" has
increased the acid concentration by two thirds. On the mortar joints that is enough to etch the paste, expose the
sand, and leave joints that look raked and weathered -- permanently, on a new building.

The correct response to a wall that will not clean at the specified dilution is a longer dwell within the
manufacturer's range, a second application, or a different cleaner -- established on a test panel, which is
required rather than advisory.

**And the units that must not see it at all.** If any part of this facade is limestone banding, cast stone, or
polished granite, acid cleaner will etch it and the damage cannot be reversed. Masking, runoff control, and
protection of aluminium windows below the work are part of the job, because the rinse water carries the cleaner
down the building.

## 4. Scope and non-goals

A quantity calculation. It does not select a cleaner or a dilution, which depend on the unit and mortar type,
the age of the masonry, the nature of the soiling, and the manufacturer's recommendations -- and which must be
proven on a test panel in an inconspicuous location before general application. It does not address the many
masonry types on which acid cleaners must not be used, or the protection of adjacent materials from runoff. It
does not address the disposal of the rinse water, which carries acid and dissolved material and is regulated in
most jurisdictions, or the personal protective equipment and eye protection that acid cleaning requires. It does
not address pressure washing parameters, which independently damage masonry when too aggressive. The cleaner
manufacturer's instructions, a test panel, the project specification, and for historic masonry a preservation
specialist govern.
