# roughlogic.com Specification v1032 -- Masonry Lintel Bearing Length (calc-masonry.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-masonry.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1031.md (note: spec-v1030 is a concurrent session's plumbing split; numbering is shared).
>
> **The gap, and the evidence for it.** `masonry-lintel-loading` returns `{tri_h_ft, arching, W_lb,
> w_udl_plf}` -- load only. All eight lintel aliases point at it. Nothing computes what that load does at
> the support: the bearing length. Discovery batch 5 called it "a genuine, adjacent-not-duplicate
> follow-on," and it composes directly with the sibling's `w_udl_plf` output.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
span / depth / load / width / stress, or support centers closer than the clear span, return `{ error }`.
Citation discipline: TMS 402 (MSJC) section numbers only. Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `masonry-lintel-bearing` -- Masonry Lintel Bearing Length (TMS 402)

```
inputs:  clear_span_ft, lintel_depth_in (8), support_center_ft (0 = use clear span + depth),
         udl_plf (chain from masonry-lintel-loading), bearing_width_in (7.625),
         allowable_bearing_psi (USER, from the governing code edition and f'm)
compute: span_by_depth = clear + depth/12
         eff_span = min(span_by_depth, support_centers) when centers given   TMS 2.3.3.4.1
         reaction = udl x eff_span / 2
         required_area = reaction / allowable_bearing;  required_length = area / width
         governing = MAX(required_length, 4 in)                              TMS 2.3.3.4.3
outputs: span_by_depth_ft, eff_span_ft, span_capped, reaction_lb, required_area_in2,
         required_bearing_in, code_min_in, governing_bearing_in, code_min_governs, note
```

**What the tile is actually for.** For ordinary lintels the STRESS check is not the binding one -- the
pinned example (6-ft clear span, 8-in lintel, 500 plf, 7.625-in bearing width, 500 psi allowable) needs
0.44 in by stress and 4 in by code. A calculator that reported only the stress answer would tell a mason
that half an inch of bearing is fine. The tile reports both numbers, states which governs, and says so in
the note either way.

## 3. The coefficient this tile deliberately does NOT ship

The allowable bearing stress is a user input. Two provisions were verified in free authoritative sources
(the CMHA/NCMA lintel design manual, which reproduces the MSJC citations): effective span = clear span +
depth capped at support centers, and end bearing not less than 4 in. The allowable bearing STRESS was not:
secondary sources give one-fourth of f'm and one-third of f'm, and the lintel manual states `Fb = 1/3 f'm`
for FLEXURAL compression, which is a different quantity and an easy thing to conflate. Rather than pick,
the tile takes the designer's value and both the note and citation say why. This follows the campaign rule
that a coefficient which cannot be verified against a primary source becomes an input, not a guess.

## 4. Scope limits

Bearing only, uniform load only. Lintel flexure, shear, and deflection are separate checks, and so is the
capacity of the masonry BELOW the bearing (a bearing length that satisfies the lintel can still overstress
a narrow pier). Chain the arching dead load from `masonry-lintel-loading` and add floor, roof, and
superimposed loads. TMS 402 and the engineer of record govern.

## 5. Wiring

Standard single-tile wiring per spec-v1019 §5, with backlinks both ways to `masonry-lintel-loading`. The
fuzzer pins the worked example, the code-minimum-governs branch AND the stress-governs branch, the span
cap at support centers (including the seam where the two definitions coincide), reaction linearity, the
exact inverse relationship to allowable stress, and error seams. Cap ledger: calc-masonry.js
12500 -> 15000 (was at 93.8%).
