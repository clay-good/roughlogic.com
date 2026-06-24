# roughlogic.com Specification v205 -- Expansion Joint / Loop Guide Spacing (EJMA 4D/14D) (calc-pipefit.js, Group B, 1 New Tile)

> **Status: LANDED 2026-06-24 (package 0.82.0; part of catalog 653 -> 656). Batch spec-v204..v206 (plumbing/pipefitting -- the deferred
> process/specialized cluster: branch reinforcement, expansion guide spacing, medical gas demand).**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-pipefit.js`** (Group B); no new module, group, or dependency. Inherits spec.md through
> spec-v204.md.
>
> **The gap, and the evidence for it.** The catalog sizes the expansion-absorbing element -- the loop leg
> (`pipe-expansion-loop`) and the cold-spring gap (`pipe-cold-spring`) -- but never places the guides that
> keep the pipe aligned into it. An expansion joint or loop without guides buckles sideways instead of
> compressing, and the rule every fitter follows is fixed: the first guide goes within four pipe diameters
> of the joint and the second within fourteen diameters of the first, so the run stays a column and feeds
> straight into the element. The catalog has the loop and the cold spring but not the guide placement that
> makes either one work.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The pipe
outside diameter and the resulting first-guide and second-guide distances are a length (`L`, in, also
shown in ft); the 4 and 14 diameter multipliers are `dimensionless`. The v18/v21 contract: any non-finite
input or a non-positive diameter returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general`
over the 4-diameter / 14-diameter placement rule by name; `editionNote` names the **Expansion Joint
Manufacturers Association (EJMA)** standard and the manufacturer installation guides, and states that
**the 4D/14D rule places the first two guides; intermediate guide spacing beyond the second guide comes
from the EJMA table or the pipe-column stability calc (user-supplied / manufacturer), and the anchor and
joint selection govern** -- this places the planning guides, it does not design the anchor loads.

## 2. The tile

### 2.1 `expansion-guide-spacing` -- First and Second Guide Placement (4D / 14D)

```
inputs:
  pipe_od_in    L   pipe outside diameter, in
  d1_mult       dimensionless   first-guide multiplier (default 4)
  d2_mult       dimensionless   second-guide multiplier (default 14)

first_guide_in  = d1_mult x pipe_od_in              # max distance from the joint/loop to guide 1
second_guide_in = d2_mult x pipe_od_in              # max distance from guide 1 to guide 2
# guide 2 distance from the joint = first_guide_in + second_guide_in
```

**Pinned worked example.** A 4 in line (OD 4.5 in) into an axial expansion joint:
`first_guide = 4 x 4.5 = 18 in` from the joint; `second_guide = 14 x 4.5 = 63 in` past the first guide
(81 in from the joint). Beyond guide 2, intermediate guides follow the EJMA spacing table.
**Cross-check (smaller pipe, proportionally closer guides).** A 2 in line (OD 2.375 in):
`first_guide = 4 x 2.375 = 9.5 in`; `second_guide = 14 x 2.375 = 33.25 in`. The distances scale directly
with the pipe diameter; the multipliers are the fixed rule.

## 3. Wiring

A `tools-data.js` row (group `B`, trade `["pipefitting"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the 4D/14D rule, `editionNote` naming EJMA and the
intermediate-spacing / anchor-governs caveats); `test/fixtures/worked-examples.json` (example +
cross-check); `test/fixtures/compute-map.js` (`expansion-guide-spacing` -> `computeExpansionGuideSpacing`
in `../../calc-pipefit.js`); `scripts/related-tiles.mjs` (-> `pipe-expansion-loop` / `pipe-cold-spring` /
`pipe-spacing-rack`); `data/search/aliases.json` ("expansion guide", "guide spacing", "4D 14D",
"expansion joint guides", "pipe guide", "alignment guide"); the id appended to the existing pipefit
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the example, the cross-check, and error seams (non-finite, OD <= 0,
non-positive multiplier). Raise the `calc-pipefit.js` size cap by ~20 percent if needed (dated comment).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the two guide distances wrap on a phone);
render-no-nan + a11y sweep, output read to the value (4 in OD -> 18 in and 63 in).

## 5. Roadmap position

Completes the thermal-expansion family: size the growth (`pipe-expansion`), absorb it
(`pipe-expansion-loop` / `pipe-cold-spring`), and guide the pipe into the element (this). An anchor-load
estimate and an intermediate-guide column-stability calc stay evidence-driven follow-ons.
