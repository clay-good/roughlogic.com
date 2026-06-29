# roughlogic.com Specification v146 -- Fire-Exposed Wood Member Char Depth and Residual Capacity (calc-restoration.js, Group D, 1 New Tile)

> **Status: LANDED (2026-06-29, package 0.85.0; was PROPOSED 2026-06-23). Vetted-novel subset of the fire & smoke restoration batch. Batch spec-v146..v150.** In-scope catalog expansion under the
> spec-v106 trades-only charter: the first fire-*damage* restoration tile (the existing `calc-fire.js`
> family is firefighting hydraulics, not damage assessment), screening whether a charred wood member
> kept enough sound section to carry load. Adds one tile to **`calc-restoration.js`** (Group D); no new
> module, group, or dependency. Inherits spec.md through spec-v145.md.
>
> **The gap, and the evidence for it.** After a fire, the call on every exposed beam and post is
> whether it stays or goes, and that turns on how deep the char ran. Wood chars at a roughly known
> rate (the AWC/NDS one-dimensional nominal rate, about 1.5 in/hr), and beneath the char is a
> heat-degraded zero-strength layer; what remains is sound. Heavy timber survives fire precisely
> because the residual section is large, while dimensional lumber is consumed -- but no tile turns the
> exposure time and member size into the residual cross-section and the bending-capacity fraction that
> drives the keep-or-replace call.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Exposure
time is `T` (minutes); nominal and residual widths and depths and the char depth are `L`; the
exposed-face counts are `dimensionless`; the residual area is `L^2`; the section-modulus ratio is
`dimensionless`. The 1.5 in/hr nominal char rate and the 0.2 in zero-strength layer are editable
inputs (species and density shift them). The v18/v21 contract: any non-finite input, a non-positive
exposure, member dimension, or char rate, or a face count below 0 returns `{ error }`; a residual
dimension that computes to zero or below is reported as `consumed` with zero residual capacity, not a
negative number. Citation discipline (v19/v22): `GOVERNANCE.general` over the AWC/NDS char model and
the zero-strength layer, by name; this screens **bending section only** -- a structural engineer
governs, and connections, splitting, char-line judgment, and the load path are out of scope.

## 2. The tile

### 2.1 `char-depth-capacity` -- Char Depth and Residual Bending Capacity

```
inputs:
  exposure_min        T              fire exposure duration
  nominal_width_in    L              original member width b (actual, e.g. 5.5)
  nominal_depth_in    L              original member depth d (actual, e.g. 9.5)
  faces_across_width  dimensionless  charred faces reducing the width (default 2)
  faces_across_depth  dimensionless  charred faces reducing the depth (default 1)
  char_rate_in_hr     L/T            nominal one-dimensional char rate (default 1.5)
  zero_strength_in    L              heat-degraded zero-strength layer (default 0.2)

char_depth_in    = char_rate_in_hr x (exposure_min / 60)
effective_char_in = char_depth_in + zero_strength_in
residual_width_in = nominal_width_in - effective_char_in x faces_across_width   # floored at 0 -> consumed
residual_depth_in = nominal_depth_in - effective_char_in x faces_across_depth   # floored at 0 -> consumed
residual_area_in2 = residual_width_in x residual_depth_in
section_modulus_ratio = (residual_width_in x residual_depth_in^2) / (nominal_width_in x nominal_depth_in^2)
```

**Pinned worked example.** A 6x10 heavy-timber beam (5.5 x 9.5 in actual) exposed 30 min on the
bottom and both sides (2 width faces, 1 depth face): `char = 1.5 x 0.5 = 0.75 in`;
`effective = 0.95 in`; `residual_width = 5.5 - 0.95x2 = 3.6 in`; `residual_depth = 9.5 - 0.95 = 8.55
in`; `area = 30.8 in^2`; `S_ratio = (3.6 x 8.55^2)/(5.5 x 9.5^2) = 263.2/496.4 = 0.53` -- about
**53 percent** of bending capacity remains, the reason heavy timber is rated for fire.
**Cross-check (capacity falls fast with time).** Double the exposure to 60 min: `effective = 1.7 in`,
`residual 2.1 x 7.8 in`, `S_ratio = 127.8/496.4 = 0.26` -- half the time held 53 percent, twice the
time holds 26 percent. The engineer governs; this screens the bending section.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration", "construction"]`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the char rate, zero-strength layer, and
section-modulus ratio, `editionNote` naming the AWC National Design Specification char provisions and
the engineer-governs / bending-only caveats); `test/fixtures/worked-examples.json` (example +
cross-check); `test/fixtures/compute-map.js` (`char-depth-capacity` -> `computeCharDepthCapacity` in
`../../calc-restoration.js`); `scripts/related-tiles.mjs` (-> `category3-removal-scope` /
`flood-cut-takeoff` / `ppe`); `data/search/aliases.json` ("char depth", "fire damaged lumber",
"residual capacity", "charring rate", "heavy timber fire", "keep or replace beam"); the id appended to
the existing `RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check, the consumed
(residual <= 0) branch, and error seams (non-finite, exposure/dimension/rate <= 0, faces < 0). Raise
the `calc-restoration.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js`
cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the consumed branch); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the char,
residual, and ratio lines wrap on a phone); render-no-nan + a11y sweep, output read to the value
(30 min / 5.5 x 9.5 -> 0.95 in effective char, 0.53 section ratio).

## 5. Roadmap position

Opens the fire-damage restoration family with the structural assessment that precedes any cleaning,
pairing with the cleaning (v147) and deodorization (v148) tiles. Further Group D growth stays
evidence-driven.
