# roughlogic.com Specification v1159 -- Accessible Parking Space Count (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 76 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1158.md.
>
> **The gap.** A dupe scan for "accessible parking", "van accessible", and "parking space count" returned
> zero hits; `ada-ramp-slope` was the catalog's only ADA tile. Sitework and striping contractors lay out
> the lot, and the count is the first thing an inspector checks.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-integer
or non-positive space or facility count, a negative provided count, or a van count exceeding the
accessible count return `{ error }`. Renderer: this module's `_simpleRenderer`.

**Source.** 2010 ADA Standards for Accessible Design, 208.2 with Table 208.2 and 208.2.4. A US federal
standard in the public domain, quoted directly. No copyrighted table is involved.

## 2. The tile

### 2.1 `accessible-parking-count` -- Accessible Parking Space Count (2010 ADA Standards 208.2)

```
inputs:  total_spaces (in ONE facility), facility_count, provided_accessible, provided_van
compute: Table 208.2 by lot total -- 1-25:1, 26-50:2, 51-75:3, 76-100:4, 101-150:5, 151-200:6,
         201-300:7, 301-400:8, 401-500:9; 501-1,000: 2% of the total; 1,001+: 20 + 1 per 100
         or fraction over 1,000. Fractional results round UP.
         van = ceil(required / 6)  [208.2.4, "six or fraction of six"]
         site requirement = per-facility requirement x facility_count
outputs: required_accessible, required_van, required_car, branch, percent_raw,
         site_required_accessible, site_required_van, site_total_spaces, combined_required,
         split_penalty, accessible_ok, van_ok, accessible_short, van_short, van_only_failure,
         passes, note
```

**Two rules run, and the second is the one that gets skipped.** The table sets the count; 208.2.4 then
requires a van space "for every six or fraction of six" of them. **Fraction of six** is the operative
phrase: four accessible spaces still owe **one** van, and seven owe two. A van space is one *of* the
accessible spaces, not a fifth beyond them -- entering more vans than accessible spaces is an error, not a
generous lot. The default example is a 100-space lot striped with 4 accessible and no van: the right count
and the wrong mix, which is the common restripe finding, and the tile calls it out as such rather than
reporting a bare fail.

**Two branches of the table get missed, and one of them has a step.** From 501 to 1,000 spaces the rule
stops being a lookup and becomes 2% of the total. The last table row (401-500) gives 9, while 501 at 2% is
**10.02** and rounds up to **11** -- one space added to a 500-space lot adds *two* accessible spaces. Above
1,000 it is 20 plus one for each 100 or fraction over. Rounding is up throughout, because a count of
spaces cannot be fractional and rounding down would provide fewer than the standard requires. The fuzzer
pins all eighteen table seams, both branch boundaries, and that the required count never decreases as the
lot grows across 300 sampled sizes.

**The third error is the unit of counting.** The table applies **per parking facility**, not per site. Four
separate lots of 26 owe **8** accessible spaces where the same 104 spaces in one lot owe **5** -- so
splitting parking *raises* the requirement, which is the opposite of what people expect when they subdivide
a lot. The tile reports the combined-lot figure alongside the split one and names the penalty; a single
facility reports `null` for the comparison rather than a spurious zero.

## 3. Scope

A count, not a layout. Not checked: the geometry of the spaces under 502 -- space and access-aisle widths,
the wider space or wider aisle a van requires, the vertical clearance a van needs along its whole route in,
surface slope, and signage; whether spaces sit on the shortest accessible route and are dispersed among
entrances under 208.3; the higher ratios at hospital outpatient, rehabilitation, and residential facilities
under 208.2.1 through 208.2.3; and state and local requirements, several of which exceed these.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `ada-ramp-slope`,
`striping-paint-quantity`, `asphalt-paving-speed`, and `traffic-taper-length`. The tools-data row sits
inside the parsed Group E block, which has no exact count assertion. Fuzzer pins both fixtures, all
eighteen table rows and seams, the 500/501 step with its 10.02, the 2% and over-1,000 branches including
continuity at 1,000, monotonicity across 300 lot sizes, the ceil-by-six van share and that car plus van
always closes the sum, per-facility multiplication at five lot counts, the split penalty, and every error
seam including a van count exceeding the accessible count.
