# roughlogic.com Specification v480 -- Seismic Overturning Moment (ASCE 7-22 12.8.5) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter, and the seismic follow-on spec-v477 §5 named
> explicitly ("the §12.8.5 overturning accumulation ... [is a] deliberate future follow-on"). Adds one tile to
> **`calc-construction.js`** (Group E); no new module, group, or dependency. Inherits spec.md through spec-v479.md.
>
> **The gap, and the evidence for it.** The equivalent-lateral-force chain is otherwise complete: `seismic-base-shear`
> (V), `seismic-vertical-distribution` (the story forces Fx, spec-v477), `seismic-story-drift`, and
> `seismic-pdelta-stability`. What the chain never produced is the number the foundation and the hold-downs are sized
> against: the seismic overturning moment. ASCE 7-22 §12.8.5 requires the structure to resist the overturning caused by
> those same Fx forces, and the moment is their direct accumulation -- about the base, `M0 = Sum(Fi hi)`; about any
> level x, `Mx = Sum over i above x of Fi (hi - hx)`. The base moment is the design demand for the footing, the
> soil-bearing check, and the shear-wall tie-downs; the per-level moments are what each diaphragm's collectors and the
> wall below it carry. §12.13.4 then permits a 25% reduction of the ELF overturning moment at the soil-foundation
> interface (the equivalent-lateral-force method overstates the simultaneous peak), so the tile reports both the full
> moment and the reduced foundation moment. This closes the load path from the base shear to the footing that the
> catalog's four other ELF tiles left open.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The base shear and story
forces are forces (`M L T^-2`), the heights are lengths (`L`), the overturning moments are moments (`M L^2 T^-2`), and
the period is a time (`T`); the exponent k, the level list, and the reduction factor annotate `dimensionless` (matching
the sibling `seismic-vertical-distribution` precedent). The v18/v21 contract: an empty or non-array level list, a
non-positive base shear or period, any non-finite level input, a non-positive level weight, or heights that do not
strictly increase bottom-up returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the
accumulation by name; `editionNote` names **ASCE 7-22 §12.8.5 (Overturning)** with the distribution exponent k from
§12.8.3 (Eq. 12.8-12, k = 1 at or below 0.5 s, k = 2 at or above 2.5 s, linear between), states the base moment
`M0 = Sum(Fi hi)` and the per-level moment `Mx = Sum Fi (hi - hx)`, names the **§12.13.4 25% reduction of the ELF
overturning moment at the soil-foundation interface** as the source of the reduced foundation moment, and states that
**the story forces come from the same §12.8.3 distribution the `seismic-vertical-distribution` tile computes (V and T
are entered here, or read from `seismic-base-shear`), the weights are the effective seismic weights per §12.7.2, the
25% reduction applies at the soil interface for the ELF procedure (not to the structure above), and the resisting dead
load, the foundation stability, and the shear-wall hold-down design are separate checks** -- a design aid, not a
lateral-analysis substitute; the engineer of record governs.

## 2. The tile

### 2.1 `seismic-overturning-moment` -- The ASCE 7 §12.8.5 Overturning the Footing Resists

```
inputs:
  base_shear_kip   kips   seismic base shear V (from seismic-base-shear)
  period_s         s      fundamental period T (sets the distribution exponent k)
  stories          list   one level per line, bottom-up: weight(kips),height(ft) from the base

k    = 1 for T <= 0.5 s, 2 for T >= 2.5 s, 1 + (T - 0.5)/2 between      [ASCE 7 12.8.3]
Cvx  = wx hx^k / Sum(wi hi^k)          Fx = Cvx x V                     [Eq. 12.8-12 / 12.8-11]
M0   = Sum(Fi hi)                                                       [base overturning moment, kip-ft]
Mx   = Sum over i above x of Fi (hi - hx)                               [overturning moment about level x]
M0_foundation = 0.75 x M0                                              [ASCE 7 12.13.4 soil-interface 25% reduction]
```

**Pinned worked example (three-story building, short period).** V = 200 kips, T = 0.4 s (k = 1), levels bottom-up
(1,000 kips, 12 ft), (1,000 kips, 24 ft), (800 kips, 36 ft): the distribution gives `Fx = 37.0 / 74.1 / 88.9 kips`
(the `seismic-vertical-distribution` result), so the base overturning moment is
`M0 = 37.037 x 12 + 74.074 x 24 + 88.889 x 36 = ` **5,422 kip-ft**, the moments about the two floor levels above the
base are **3,022** and **1,067 kip-ft**, and the reduced foundation moment is `0.75 x 5,422 = ` **4,067 kip-ft**.
**Cross-check (two-story, interpolated k).** V = 100 kips, T = 1.0 s puts `k = 1 + (1.0 - 0.5)/2 = 1.25`, so the taller
level draws more force: levels (500, 10), (400, 20) give `Fx = 34.5 / 65.5 kips` and
`M0 = 34.45 x 10 + 65.55 x 20 = ` **1,655 kip-ft** (reduced foundation **1,242 kip-ft**) -- the period lifting the
centroid of the force, and with it the overturning, is the whole reason the exponent interpolates.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the three-story example + the
two-story interpolated cross-check, pinning M0 and the reduced foundation moment); `test/fixtures/compute-map.js`
(`seismic-overturning-moment` -> `computeSeismicOverturningMoment` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `seismic-vertical-distribution` / `seismic-base-shear` / `shearwall-overturning`);
`data/search/aliases.json` ("overturning moment", "seismic overturning", "overturning", "foundation overturning",
"asce 7 12.8.5", "base moment seismic", "overturning stability", "seismic foundation moment"); the id appended to the
construction renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the reduced-moment identity, and the error seams (empty list,
non-finite, V / T / weight <= 0, non-increasing heights). Hand-writes its renderer mirroring the sibling
`seismic-vertical-distribution` (two `makeNumber` fields and one `makeTextarea` bottom-up level list per the
`check-multiline-inputs` rule). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit (the Fx / per-level-moment / base-moment stack wraps on a phone); render-no-nan +
a11y on the new tile, output read to the value (the three-story example -> 5,422 kip-ft base, 4,067 reduced).

## 5. Roadmap position

Closes the equivalent-lateral-force load path from the base shear to the footing: `seismic-base-shear` (V) ->
`seismic-vertical-distribution` (Fx) -> this (the overturning the foundation resists), beside `seismic-story-drift` and
`seismic-pdelta-stability` on the serviceability side. The §12.3.4 redundancy / overstrength factors and a resisting
dead-load stability-ratio check (the FS against overturning) are deliberate future follow-ons. Further Group E growth
stays evidence-driven.
