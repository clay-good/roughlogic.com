# roughlogic.com Specification v1882 -- Total Coliform Routine and Repeat Sample Count (`calc-reliefwater.js`, Group M Water and Wastewater Operations, emergency water supply, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefwater.js`**
> (Group M Water and Wastewater Operations, hub `/groups/water/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Restoring a water system after a disaster ends in sampling, and the sampling load is a federal table plus a multiplier the operator has to hold in their head while the lab courier waits. The catalog has no coliform or sampling tile at all.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a population of 1,000 or fewer returns a routing note to 40 CFR 141.854 and the state rather than a count; a negative positive-sample count, or more positives than samples taken, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): 40 CFR 141.857(b) (the monitoring-frequency table, federal and public domain, reproduced), 141.858(a) (repeat monitoring), and 141.859(a) (treatment technique triggers) named as the rule, the state primacy agency named as governing, GOVERNANCE.water.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`coliform samples per month`, `revised total coliform rule sampling`, `rtcr repeat samples`, `bacteriological samples population`, `boil water notice sampling`.

## 2. The tile

### 2.1 `rtcr-coliform-samples` -- Total Coliform Routine and Repeat Sample Count

```
routine       samples per month by population served, 40 CFR 141.857(b):
              1,001-2,500 -> 2 ... 8,501-12,900 -> 10, 12,901-17,200 -> 15 ...
              41,001-50,000 -> 50 ... 3,960,001 or more -> 480  (32 bands)
repeat        at least 3 repeat samples per total-coliform-positive sample,
              all on the same day, within 24 h of notification  (141.858(a))
E. coli       every TC-positive sample is also analysed for E. coli (141.858(b))
Level 1       40 or more samples/month: more than 5.0% TC-positive
              fewer than 40 samples/month: 2 or more TC-positive
              OR any required repeat not taken                  (141.859(a)(1))
```

The routine count is a lookup and the repeat count is a multiplier, and both have to be right the first time
because a missed repeat is itself a Level 1 trigger. A system restored after a flood or a main break usually has a
boil-water notice in force, and lifting it runs through the same sampling framework: routine samples at the
population-based frequency, three repeats for every positive, and an E. coli analysis on every positive. The tile
turns a population and a count of positives into the number of bottles, the deadline, and whether a treatment
technique trigger has been crossed.

The Level 1 trigger changes character at 40 samples a month, and the tile shows where a system sits. A large system
is judged on a percentage; a small one is judged on a count, so two positives out of fifteen samples trigger an
assessment in a system where three out of fifty would not have -- 13.3% against 6.0%, and both trigger, but for
different reasons. A system that fails to collect every required repeat has triggered a Level 1 assessment
regardless of the results, which is the part most easily lost in the disorder after an event.

The table is reproduced because it is federal regulation and in the public domain, and because the bands are
not a formula: the step from 10 samples at 12,900 people to 15 at 12,901 is a regulatory choice, not a curve.

**Inputs:** the population served, the number of total-coliform-positive routine samples this month, and optionally the number of positive repeat samples

**Outputs:** the routine samples required per month, the repeat samples required and their deadline, the E. coli analyses required, the TC-positive percentage, and whether a Level 1 trigger is met and on which basis

## 3. Worked example

A town of 15,000 restoring service after a flood; 2 of its routine samples come back total-coliform-positive:

```
routine   15,000 is in 12,901-17,200 -> 15 samples per month
repeats   3 x 2 positives = 6 repeat samples, same day, within 24 h
E. coli   2 analyses on the positives
Level 1   15 < 40 samples, so the count rule applies: 2 positives -> TRIGGERED
          (2 / 15 = 13.3%)
```

**Six repeat bottles within 24 hours, and a Level 1 assessment is required** -- on the count rule, because the
system takes fewer than 40 samples a month.

**A city of 45,000 with 3 positives:**

```
routine   41,001-50,000 -> 50 samples    repeats 3 x 3 = 9
Level 1   50 >= 40, so the percentage rule applies: 3 / 50 = 6.0% > 5.0% -> TRIGGERED
```

**Both systems trigger, on different rules.** Had the city seen two positives, 4.0% would not have triggered; had
the town seen one, neither rule would have.

## 4. Scope and non-goals

A sampling-count aid under the federal Revised Total Coliform Rule. States with primacy may be more stringent, may extend the 24-hour repeat deadline for logistical reasons, and set their own requirements for returning to service after an emergency and lifting a boil-water notice; those decisions are the state's. It does not address systems serving 1,000 or fewer people (141.854), seasonal system start-up procedures, the placement of repeat samples relative to the positive site, the E. coli MCL determination itself (141.860), or the conduct of a Level 1 or Level 2 assessment. It is not a sample siting plan. 40 CFR 141 Subpart Y, the state primacy agency, and the operator of record govern.
