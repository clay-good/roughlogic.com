# roughlogic.com Specification v1148 -- Scaffold Guardrail System Check (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1147.md.
>
> **The gap, self-declared.** `scaffold-takeoff`'s description ends: *"Guardrails, ties, screw jacks, and
> access are taken off separately."* A dupe scan for "guardrail height", "midrail", and "toeboard"
> returned zero hits.

Repository: github.com/clay-good/roughlogic.com -- US standards only. OSHA regulations are US federal law
in the public domain, so the values are quoted directly rather than paraphrased around.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
top rail height or tolerance, or a negative height or capacity, return `{ error }`. Renderer: this
module's `_simpleRenderer`.

## 2. The tile

### 2.1 `scaffold-guardrail-check` -- Scaffold Guardrail System Check

```
inputs:  top_rail_height_in, midrail_height_in, toeboard_height_in, scaffold_type,
         toprail_capacity_lb, midrail_capacity_lb, midrail_tolerance_in
compute: top edge   38 in <= h <= 45 in (post-2000 scaffolds)
         midrail    target = top / 2, "approximately midway" tested against a set band
         capacity   200 lbf top rail generally, 100 lbf single/two-point suspension;
                    150 lbf midrail ONLY where the top rail requirement is 200
         toeboard   >= 3.5 in from its top edge to the walking/working surface
outputs: top_ok, top_low, midrail_target_in, midrail_offset_in, midrail_ok, toeboard_ok,
         suspension, required_toprail_lb, required_midrail_lb, toprail_cap_ok,
         midrail_cap_ok, passes, note
```

**The midrail is specified by relation, not by a number.** "Approximately midway between the top edge and
the platform surface" means the target **moves with the top rail** -- and a shop standard set for a 45-in
rail puts the midrail at 22.5 in, which sits **3.5 in high** under a 38-in rail. Both rail heights are in
range and the midrail is unchanged; only one arrangement satisfies the relation. The fixtures pin exactly
that pair. Because the standard gives no dimension, the tile computes the target and tests it against a
band the user sets, and says the band is its own judgment rather than a code value.

**The capacities are paired, not independent.** 200 lbf on the top rail generally, 100 lbf for
single- and two-point adjustable suspension scaffolds, and 150 lbf on the midrail **only** where the top
rail requirement is 200. On a suspension scaffold the 150 figure does not apply and the tile returns
`null` rather than inventing a requirement.

**A low rail is not a paperwork problem.** The height may exceed 45 in where conditions warrant provided
every other criterion is still met, but the standard does not allow a top edge under 36 in at all -- so
the tile distinguishes too-low from too-high rather than reporting one "out of range."

**And whether a toeboard is required is a different question** -- falling-object protection under
1926.451(h), turning on whether anyone works or passes below. The tile checks the 3.5-in height and
declines the trigger.

## 3. Scope

Not checked: whether guardrails are required at all; cross-bracing used as a rail, which has its own
height windows; gaps at ladder access, hoist areas, and end frames; the deflection limit; posts,
connections, and puncture/laceration hazards; personal fall arrest as a substitute; erection and
dismantling; and the competent-person judgments the standard reserves.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `scaffold-takeoff`, `scaffold-leg-load`,
`scaffold-mudsill-bearing`, and `guard-post-load`. Fuzzer pins both fixtures, the moving target at four
rail heights, the same midrail passing under one rail and failing under another, that widening the band
changes the verdict without moving the target, both ends of the height window and the too-low
distinction, the paired capacities including the suspension `null`, that omitted capacities are not
failures, the toeboard seam, and every error seam.
