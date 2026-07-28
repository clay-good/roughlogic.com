# roughlogic.com Specification v1151 -- Scaffold Platform and Planking (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1150.md.
>
> **The gap.** `scaffold-guardrail-check` (spec-v1148) does the rail; `scaffold-takeoff` counts frames and
> planks. Nothing checked the deck itself.

Repository: github.com/clay-good/roughlogic.com -- US standards only. OSHA is public domain, so the
provisions are quoted.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
length or width, or a negative gap or distance, return `{ error }`. Renderer: this module's
`_simpleRenderer`.

## 2. The tile

### 2.1 `scaffold-platform-check` -- Platform and Planking Check (OSHA 1926.451(b))

```
inputs:  plank_length_ft, platform_width_in, gap_between_units_in, gap_to_uprights_in,
         overhang_in, front_edge_gap_in, cantilever_designed, front_edge_protected
compute: gaps      max(both kinds) <= 1 in
         width     >= 18 in
         overhang  <= 12 in at length <= 10 ft;  <= 18 in above it
                   OR a cantilever designed not to tip
         front     <= 14 in from the face  OR front-edge guardrail and/or PFAS
outputs: worst_gap_in, gap_ok, gap_source, width_ok, width_deficit_in, long_plank,
         max_overhang_in, overhang_within, overhang_excess_in, overhang_ok,
         front_within, front_ok, passes, note
```

**The overhang limit follows the board, not the bay.** A platform 10 ft or less may not extend over its
support more than 12 in; one over 10 ft, not more than 18. So an identical **15-in overhang fails on an
8-ft plank and passes on a 16-ft one** -- the two fixtures are exactly that pair. Swapping one long plank
for two short ones tightens the allowable overhang with nothing else on the scaffold changing.

**Both limits carry the same escape** -- a cantilever designed and installed to support employees and
materials without tipping -- so a long overhang is a design question rather than a prohibition. The tile
reports the excess *and* excuses it, rather than erasing it; the fuzzer pins that the excess figure
survives the escape.

**The gap rule runs two ways.** No more than 1 in between adjacent units **and** no more than 1 in between
the platform and the **uprights**. The second is the forgotten one, because it is a gap against the frame
rather than between two boards -- and it is exactly where a foot goes. The tile reports which of the two
governs.

**One requirement deliberately not computed.** The *minimum* distance a plank must extend over the
centerline of its support works in the opposite direction from the maximums above and is what keeps a
plank from being levered off its bearer. I could not confirm it from a primary source, so no figure is
asserted and both the note and the citation say to read the paragraph for it.

## 3. Scope

Not checked: full planking between the front upright and the guardrail; unit overlap and end conditions;
plank grade, span, and rated load, which is strength rather than dimension; ties, bracing, and
foundations; outrigger and plastering/lathing front-edge figures; and the guardrail system.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `scaffold-guardrail-check`,
`scaffold-takeoff`, `scaffold-leg-load`, and `scaffold-mudsill-bearing`. Fuzzer pins both fixtures, the
length-driven limit at five lengths including 10 ft exactly, both overhang seams on each side of the
break, that either gap kind can govern and 1 in exactly is compliant, both escapes converting a failure
without changing the measurement, the width and front-edge seams, and every error seam.
