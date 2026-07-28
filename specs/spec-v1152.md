# roughlogic.com Specification v1152 -- Temporary Stairway Check (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1151.md.
>
> **The gap.** `landing-check` (spec-v1133) and the stair-code tile cover finished stairs under the IRC
> and IBC. The **construction** stairway is governed by OSHA Subpart X and differently, and nothing
> covered it.

Repository: github.com/clay-good/roughlogic.com -- US standards only. OSHA is public domain, so the
provisions are quoted.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
or non-integer riser count, a non-positive riser or tread, or a negative rise, variation, or height
return `{ error }`. Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `temporary-stairway-check` -- Temporary Stairway Check (OSHA 1926.1052)

```
inputs:  riser_count, total_rise_in, riser_height_in, tread_depth_in,
         riser_variation_in, tread_variation_in, stairrail_height_in, landing_depth_in
compute: angle       = atan(riser / tread);  required 30 to 50 degrees
         rail needed <- risers >= 4 OR rise > 30 in   (whichever comes FIRST)
         rail height >= 36 in to the tread surface
         uniformity  max(riser variation, tread variation) <= 1/4 in ACROSS the flight
         landing     >= 30 in in the direction of travel
outputs: angle_deg, angle_ok, too_shallow, total_rise_used_in, by_risers, by_height,
         rail_required, trigger, worst_variation_in, uniform_ok, variation_source,
         rail_height_ok, landing_ok, passes, note
```

**"Whichever is less" means whichever comes first.** Four or more risers **or** rising more than 30 in --
either alone triggers the rail. A three-riser flight climbing 32 in is caught by the *rise* despite
failing the riser count, which is the first fixture. Reading it as requiring **both** exempts flights the
standard covers, and that is the common error.

**The angle is bounded on both sides.** Too shallow is a violation, not a courtesy: a run under 30 degrees
is a ramp with steps in it, and people trip on it precisely because it does not read as stairs. The
cross-check fixture is a 23.96-degree flight that fails on geometry while triggering **no** rail at all --
the two requirements are independent, and passing one says nothing about the other.

**Uniformity is a variation across the flight, not a tolerance per step.** Not over 1/4 in in any stairway
system, so individually reasonable steps still fail if the first and last differ -- and the step people
fall on is the odd one, not the average one.

## 3. Scope

Not checked: the 22-in landing width; handrail height and clearance, which differ from the stairrail
figures; midrails and openings; whether a stairway is required at all rather than a ladder or ramp; the
prohibition on unfilled metal pan treads; temporary treads and landings; spiral and alternating tread
devices; and finished-stair geometry, which has its own tiles.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `landing-check`,
`stair-stringer-layout`, `scaffold-guardrail-check`, and `guard-handrail-check`. Fuzzer pins both
fixtures, the trigger across five riser/rise combinations including 30 in exactly not being "more than
30", the fallback from riser count when no rise is entered, both angle bounds with too-shallow
distinguished from too-steep, the uniformity seam and which of the two variations governs, that a required
rail with no height entered cannot pass, the landing seam, and every error seam. A fixture angle was
corrected from 44.128194 to the computed 44.127543 when the fuzzer caught the mismatch.
