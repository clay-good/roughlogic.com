# roughlogic.com Specification v1179 -- NFIP Substantial Improvement 50% Rule (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 96 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1178.md.
>
> **The gap.** A dupe scan for "substantial improvement", "substantial damage", "market value", and "50
> percent rule" returned zero hits. `flood-opening-area` (spec-v1173) opened the NFIP seam; this is the
> rule that decides whether that compliance work is required at all.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
historic flag, a non-positive market value, a negative cost or land value, a threshold outside 0 to 100
percent, or an exclusion exceeding the improvement cost return `{ error }`. Renderer: this module's
`_simpleRenderer`.

**Source.** 44 CFR 59.1, the NFIP definitions of substantial improvement and substantial damage. A US
federal regulation in the public domain, quoted directly.

## 2. The tile

### 2.1 `substantial-improvement-check` -- NFIP Substantial Improvement 50% Rule (59.1)

```
inputs:  market_value (of the STRUCTURE), improvement_cost, excluded_code_cost,
         prior_costs, threshold_pct, land_value (comparison only), historic_structure
compute: threshold = market value x percent
         countable = improvement cost - excluded code-correction work
         triggers where countable, or countable + prior, >= threshold
         historic structures excluded, subject to the designation proviso
outputs: threshold, countable_cost, cumulative_cost, ratio_pct, cumulative_ratio_pct,
         single_triggers, cumulative_triggers, cumulative_only, headroom, over_by,
         property_value, wrong_ratio_pct, land_share_pct, historic_excluded, triggers,
         federal_pct, note
```

**The denominator decides most of these, and it is the structure.** The default example is a $95,000 job
on a $180,000 house -- **52.8%**, over the threshold by $5,000, and the whole building must then be brought
into compliance. Measured against the $400,000 property including a $220,000 lot it reads as a harmless
**23.8%**, which is exactly how the figure comes out wrong when a tax assessment bundling land is used. The
fuzzer pins that land value never moves the verdict at any magnitude, and that the comparison figures
report `null` when no land is entered.

**The cumulative rule is the other trap.** The cross-check fixture is $60,000 -- 33.3% and safe on its own
-- which with $40,000 of prior work is over by $10,000 under the rolling-period rule many communities
adopt. The tile flags that case specifically as triggering cumulatively but not alone, because that is what
catches a house improved in stages.

**Both exclusions are narrow and are reported without hiding the arithmetic.** Code-correction work counts
out only where the violations have been **identified by the local code enforcement official** *and* the
work is the minimum necessary for safe living conditions -- two conditions, not one. A historic structure
is excluded only where the alteration will not preclude continued designation; the tile still reports the
ratio and the overage so the underlying numbers stay visible.

**Substantial damage runs the same 50% from the other direction**, and the note states the consequence that
surprises owners: a substantially damaged structure counts as substantially improved when it is repaired,
whatever anyone intended to spend.

## 3. Scope

A threshold screen, not a determination -- the community's floodplain administrator makes that call. Not
checked: what counts as cost, which communities define differently and which commonly includes materials,
labour, overhead, profit, and donated or discounted work at market rates while excluding plans, permits,
and site work outside the structure; how market value is established, whether by appraisal, adjusted
assessment, or replacement cost less depreciation, which changes the answer; whether the community has
adopted a threshold below 50 percent or a cumulative period, both common and both stricter; the base flood
elevation and freeboard the building would have to meet if triggered; whether the structure is in a Special
Flood Hazard Area at all; and the insurance consequences.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `flood-opening-area`, `material-cost`,
`footing-area`, and `crawl-space-ventilation`. The tools-data row sits inside the parsed Group E block,
which has no exact count assertion. Fuzzer pins both fixtures, that land value never moves the verdict
across four magnitudes with `null` comparisons when omitted, the threshold seam with equality triggering,
an editable percent at four values with a lower local threshold catching a job the federal one misses, the
cumulative rule and its flag in both directions, exact headroom and non-negative overage at four cost
splits, the code-correction exclusion applied before the ratio at three levels, the historic exclusion
overriding the verdict while the arithmetic still reports, ratios following market value exactly,
monotonicity in market value, and every error seam.
