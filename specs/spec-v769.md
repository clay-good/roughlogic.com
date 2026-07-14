# roughlogic.com Specification v769 -- Total-Station Slope-to-Horizontal Reduction (calc-survey.js, Group P, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-survey.js`** (Group P),
> no new module, group, or dependency. Inherits spec.md through spec-v768.md. Explore sweep #18 (entry 1).
>
> **The gap, and the evidence for it.** A total station measures a **slope distance** and a vertical angle; every
> horizontal distance and elevation comes from reducing that slope shot -- yet no tile does it. `stadia-distance` uses a
> stadia interval (a different instrument), `taping-corrections` is a tape, and `cogo-forward-point` *consumes* a
> horizontal distance without producing one. The reduction is pure right-triangle trig: with a zenith angle `Z` (from
> vertical), `H = S sin Z` and `V = S cos Z`; with a vertical angle `a` (from horizontal), `H = S cos a` and `V = S sin a`.
> The number this settles: a **250 ft** slope shot at an **86 deg zenith** is **249.39 ft** horizontal and **17.44 ft** up.
> Grep confirmed no `slope distance` / `zenith` / `slope reduction` tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`stadia-distance` sibling: the slope, horizontal, and vertical distances and the instrument/reflector heights carry the
length treatment (`L`); the angle is dimensionless. The v18/v21 contract: a non-finite input (via `_finiteGuard`), a
non-positive slope distance, a zenith angle outside `(0, 180)`, or a vertical angle outside `(-90, 90)` returns
`{ error }`. Citation discipline (v19/v22): the right-triangle reduction by name (Ghilani, Elementary Surveying),
`GOVERNANCE.general` matching the sibling; the note states the zenith angle is from vertical (90 deg = level) and the
vertical angle from horizontal (0 deg = level), the ground-to-ground elevation adds the instrument height and subtracts
the reflector height, and no earth curvature/refraction or grid scale factor is applied.

## 2. The tile

### 2.1 `edm-slope-reduction` -- Total-Station Slope-to-Horizontal Reduction

```
inputs:
  angle_mode        "zenith" | "vertical"
  slope_distance_ft slope distance S (ft, > 0)
  angle_deg         zenith Z in (0,180) or vertical a in (-90,90)
  hi_ft             instrument height (ft, optional)
  hr_ft             reflector/rod height (ft, optional)

zenith:   H = S sin(Z) ; V = S cos(Z)
vertical: H = S cos(a) ; V = S sin(a)
elev_diff = V + hi_ft - hr_ft
```

**Pinned worked example.** zenith mode, S = 250 ft, Z = 86 deg:
`H = 250 sin86 = ` **249.39 ft**; `V = 250 cos86 = ` **17.44 ft**. A vertical angle `a = 90 - Z = 4 deg` gives the same H
and V. `H^2 + V^2 = S^2` for every shot, and a level sight (Z = 90) reduces to `H = S`, `V = 0` -- all pinned in the
fuzzer.

## 3. Wiring

A `tools-data.js` row (group `P`, trades `["surveying", "field"]`) placed with the survey-depth tiles **past the
exact-count-audited `// Group P: Field` .. `// Group Q` block** (beside `cogo-forward-point`), so the Group P audit count
is untouched; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (the reduction relations, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`edm-slope-reduction` ->
`computeEdmSlopeReduction`); `scripts/related-tiles.mjs` (-> `stadia-distance` / `cogo-forward-point` /
`differential-leveling`); `data/search/aliases.json` (5 collision-checked aliases: "slope distance to horizontal",
"total station slope reduction", ...); the calc-survey `SURVEY_RENDERERS` map entry via a hand-written renderer (an
angle-type select plus slope-distance, angle, and optional HI/HR fields) and the id added to the calc-survey declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the zenith/vertical equivalence, the H^2+V^2=S^2
identity, the HI/HR shift, and the error seams. The calc-survey.js gzip cap (raised to 12000 B in this spec) covers the
addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count
1,217 -> 1,218.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 249.39 ft horizontal and
17.44 ft up for a 250 ft slope shot at an 86 deg zenith).

## 5. Roadmap position

Supplies the reduction that turns a raw total-station slope shot into the horizontal distance `cogo-forward-point` and
`traverse-closure` consume and the elevation `differential-leveling` carries -- the front end of the survey toolkit.
Continues the post-inverse forward-coverage vein (Explore sweep #18). A curvature-and-refraction correction tile is the
natural next survey addition; it stays evidence-driven.
