# roughlogic.com Specification v1149 -- Excavation Protection and Egress Triggers (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1148.md.
>
> **The gap.** `trench-slope`, `excavation-bench-plan`, and `spoil-setback` all assume you already know a
> protective system is required. Nothing answered the prior question. A dupe scan for "protective system",
> "means of egress", and "lateral travel" returned zero hits.

Repository: github.com/clay-good/roughlogic.com -- US standards only. OSHA regulations are US federal law
in the public domain, so both provisions are quoted directly.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
depth, a negative length, or a negative or non-integer point count return `{ error }`. Renderer: this
module's `_simpleRenderer`.

## 2. The tile

### 2.1 `excavation-protection-trigger` -- Protective System and Egress Triggers

```
inputs:  depth_ft, trench_length_ft, egress_points, stable_rock, competent_person_exam
compute: 651(c)(2)  egress required at depth >= 4 ft, within 25 ft of LATERAL travel
                    each point serves 25 ft each way -> max(1, ceil(length / 50))
         652(a)(1)  cave-in protection required UNLESS entirely in stable rock
                    OR depth < 5 ft AND examined by a competent person
outputs: egress_required, max_lateral_travel_ft, has_length, egress_points_needed,
         egress_ok, worst_travel_ft, stable_rock, shallow_exception,
         shallow_but_unexamined, protection_required, egress_count_ok, note
```

**The two triggers sit at different depths, in the order people carry backwards.** Access bites first at
**4 ft**; cave-in protection at **5 ft**. So a 4.5-ft trench needs a ladder and may need no shoring at
all -- and it is common to hear the shallower number attached to the shoring instead. The fuzzer pins the
whole band from 4 to 4.99 ft.

**The shallow exception has two conditions, not one.** *Less than 5 ft* **and** *examined by a competent
person with no indication of a potential cave-in*. Remove the examination from the same 4.5-ft trench and
protection is required after all -- that is the cross-check fixture, and the tile names the case rather
than reporting a bare "not required." Stable rock, by contrast, exempts at any depth.

**25 ft is lateral travel**, measured along the trench, for someone who may be moving away from a
collapse -- which is why the number is small. Because each point serves 25 ft in each direction, one
ladder covers 50 ft of run, so a long trench is a spacing problem rather than a single-ladder problem.

**One thing deliberately not asserted.** The registered-professional-engineer approval associated with the
deeper design options lives in 652(b) and (c); I could not confirm it from the 652(a) text I read, so it
is named in the note as a separate determination rather than computed.

## 3. Scope

Not checked: which protective system is appropriate and its design; soil classification; competent-person
inspections; water accumulation, adjacent structures, and underground installations; atmospheric testing;
and the spoil-pile setback, which has its own tile.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `trench-slope`,
`excavation-bench-plan`, `spoil-setback`, and `excavation`. Fuzzer pins both fixtures, both trigger seams
including that 5 ft exactly is no longer "less than 5", the whole 4-to-5 ft band, the two-condition
exception flipping on the examination alone, stable rock exempting at any depth while examination alone
does not, the 50-ft-per-point count across five lengths, that providing the needed count brings worst-case
travel within 25 ft, the `null` paths when egress is not required or no length is given, and every error
seam. A dead `passes` expression and a no-op assertion were both removed during drafting.
