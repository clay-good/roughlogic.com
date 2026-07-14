# roughlogic.com Specification v771 -- Leveling Curvature-and-Refraction Correction (calc-survey.js, Group P, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-survey.js`** (Group P),
> no new module, group, or dependency. Inherits spec.md through spec-v770.md. Explore sweep #18 (entry 4).
>
> **The gap, and the evidence for it.** Both `stadia-distance` and the new `edm-slope-reduction` explicitly say they do
> **not** apply the earth curvature-and-refraction correction -- yet no tile computes it. With `K` the sight distance in
> thousands of feet, curvature makes a distant point read `0.0239 K^2` ft too high and refraction bends the line back
> `0.0033 K^2` ft, leaving a net `h_cr = 0.0206 K^2` ft subtracted from the far rod. The number this settles: a **2,000 ft**
> leveling sight is **0.0824 ft**. Grep confirmed no `curvature` / `refraction` tile exists (only the two that name it as
> skipped).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the survey
siblings: the sight distance and the corrections carry `L`. The v18/v21 contract: a non-finite input (via `_finiteGuard`)
or a non-positive sight distance returns `{ error }`. Citation discipline (v19/v22): the `0.0206 K^2` (ft) / `0.574 M^2`
(mi) correction by name (Ghilani, Elementary Surveying), `GOVERNANCE.general`; the note states that balanced backsight/
foresight distances cancel the correction in differential leveling, that it matters for long or unbalanced sights and
reciprocal/trig leveling, and that the `0.0206` coefficient assumes the standard refraction coefficient `k ~ 0.14`.

## 2. The tile

### 2.1 `leveling-curvature-refraction` -- Leveling Curvature-and-Refraction Correction

```
inputs:
  sight_distance_ft   sight distance (ft, > 0)

K              = sight_distance_ft / 1000        (thousands of feet)
curvature_ft   = 0.0239 K^2
refraction_ft  = 0.0033 K^2
correction_ft  = 0.0206 K^2    (= curvature - refraction; subtract from far rod)
```

**Pinned worked example.** sight = 2,000 ft, `K = 2.0`:
`curvature = 0.0239 x 4 = 0.0956 ft`, `refraction = 0.0033 x 4 = 0.0132 ft`, `correction = 0.0206 x 4 = ` **0.0824 ft**.
The mile form checks: 1 mile (5,280 ft) gives `0.574 M^2 = 0.574 ft`. The correction is quadratic in distance -- double
the sight, quadruple the correction -- all pinned in the fuzzer.

## 3. Wiring

A `tools-data.js` row (group `P`, trades `["surveying", "field"]`) placed with the survey-depth tiles **past the
exact-count-audited `// Group P: Field` .. `// Group Q` block** (beside `edm-slope-reduction`), so the Group P audit count
is untouched; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (the correction, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`leveling-curvature-refraction`
-> `computeLevelingCurvatureRefraction`); `scripts/related-tiles.mjs` (-> `differential-leveling` / `edm-slope-reduction`
/ `stadia-distance`); `data/search/aliases.json` (5 collision-checked aliases: "curvature and refraction correction",
"earth curvature correction", ...); the calc-survey `SURVEY_RENDERERS` map entry via a hand-written renderer (one
sight-distance field) and the id added to the calc-survey declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the
example, the curvature/refraction split, the mile form, the quadratic scaling, and the error seams. The calc-survey.js
gzip cap (raised to 13500 B in this spec) covers the addition. Verify at build, including `check-shells`. Lazy-loaded,
absent from home first paint. Home tile count 1,219 -> 1,220.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 0.0824 ft for a 2,000 ft
sight).

## 5. Roadmap position

Completes the leveling/reduction cluster: `differential-leveling` carries the elevation, `edm-slope-reduction` reduces the
slope shot, and this supplies the curvature-and-refraction correction both name as out of their scope. Continues the
post-inverse forward-coverage vein (Explore sweep #18). A reciprocal-leveling tile is the natural next survey addition; it
stays evidence-driven.
