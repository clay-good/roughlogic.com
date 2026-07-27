# roughlogic.com Specification v1029 -- Stone Countertop Overhang Support Check (calc-finish.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1028.md.
>
> **The gap, and the evidence for it.** Zero countertop hits in tools-data.js, aliases.json, or
> compute-map.js -- the only near-match is `t-beam-effective-flange-width`'s unrelated "edge beam slab
> overhang" alias. Discovery batch 3 called countertop "the strongest gap in the list" and flagged both
> halves CLEAR. This tile takes the half with real content in it; a slab-area takeoff is a separate
> candidate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
inputs, an overhang at or past the total depth (no bearing left), an unrecognized thickness, or a negative
override return `{ error }`. Citation discipline: stone-industry support guidance NAMED as guidance, not a
code section, with the explicit statement that published limits vary by fabricator and stone. No density
table shipped -- density is an input (170 pcf granite default), the "compute instead of recall" rule.
Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `countertop-overhang-support` -- Stone Countertop Overhang Support Check

```
inputs:  overhang_in, total_depth_in (25.5), thickness_cm (3 | 2), run_length_ft,
         bracket_spacing_in (24), density_pcf (170), unsupported_limit_override_in (0 = thickness rule)
compute: thickness_limit = override, else 10 in (3 cm) / 6 in (2 cm)
         one_third_limit = depth / 3
         governing_limit = MIN of the two   <- the point of the tile
         supported = overhang <= governing_limit
         psf = density x (thickness_cm x 0.393701) / 12
         overhang weight = psf x overhang/12 per lineal ft, x run for the total
         if unsupported: brackets = ceil(run x 12 / spacing) + 1, each 2/3 x overhang deep
outputs: thickness_limit_in, one_third_limit_in, governing_limit_in, governing_rule, supported,
         psf, overhang_weight_plf, overhang_weight_lb, brackets, bracket_depth_in, note
```

**Why both rules, and why the MIN.** Every source states the thickness limit and the one-third-of-depth
limit together, and which one governs FLIPS with the top: a 12-in overhang on a 36-in island is inside
one-third (12 in) but outside the 3 cm thickness limit (10 in), so it needs support; the same 12-in
overhang on a 30-in top fails both. A tile that implemented only one rule would pass jobs the industry
guidance fails.

**Source conflict, handled honestly.** The published unsupported figures are NOT uniform: the
thickness-based 6 in / 10 in pair appears across several independent stone-industry references, while at
least one fabricator's written guideline caps every overhang at a flat 8 in with brackets bearing no more
than 24 in of overhang and 36 in maximum between centers. The tile ships the corroborated thickness pair,
exposes the limit as an OVERRIDE input, makes bracket spacing an input (24 in default, 18-36 in range
named in the citation), and says in both the note and the citation that the fabricator's own written
guideline governs.

**Worked example (pinned).** 12-in overhang, 36-in depth, 3 cm, 8-ft run, 170 pcf: governing limit 10 in
by the thickness rule -> SUPPORT REQUIRED; slab 16.73 psf, 16.73 lb per lineal ft cantilevered, 133.9 lb
total; 5 brackets 8.0 in deep.

## 3. Scope limits

The cantilever rule only. A seated person on a bar top is a point load this does not cover; a seam inside
the overhang changes the problem entirely; both are named in the note. Bracket ATTACHMENT (studs or a
load-bearing frame, never cabinet boxes alone) is stated, not designed. Quartz, marble, and dense stones
differ in both density and manufacturer limit. The fabricator's written support guideline and the slab
manufacturer govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5. Fuzzer pins the worked example, BOTH governing regimes and
the exact crossover where depth/3 takes over from the thickness rule, the 2 cm limit, the override path,
the pass/fail seam at the limit, weight linearity in density and overhang, and error seams. Cap ledger:
calc-finish.js 15000 -> 18000 (was 95.9% after spec-v1028).
