# roughlogic.com Specification v477 -- Vertical Distribution of Seismic Forces (ASCE 7-22 12.8.3 / 12.8.4) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-08; PROPOSED same day). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter, and the follow-on both spec-v226 §5 and
> spec-v383's header explicitly deferred: "a vertical force-distribution tile (`Fx = Cvx*V`, §12.8.3) that supplies the
> per-story `Vx` is the deliberate next follow-on." Adds one tile to **`calc-construction.js`** (Group E); no new module,
> group, or dependency. Inherits spec.md through spec-v476.md.
>
> **The gap, and the evidence for it.** The catalog runs the equivalent-lateral-force procedure from the mapped
> accelerations to the base of the building and stops there: `seismic-design-spectral-acceleration` (v381) makes SDS/SD1,
> `seismic-base-shear` (v226) makes V, and `seismic-story-drift` (v382) / `seismic-pdelta-stability` (v383) consume the
> *per-story* forces the chain never computes. The missing middle is the standard post-base-shear hand calc every EOR
> runs: distribute V up the height as `Fx = Cvx x V` with `Cvx = wx hx^k / Sum(wi hi^k)` (Eqs. 12.8-11/-12) and take the
> story shears `Vx = Sum Fi, i = x..n` (Eq. 12.8-13). The exponent k is the whole story: a stiff short-period building
> (k = 1) loads its floors in proportion to w x h, while a taller flexible one (k -> 2) shifts force sharply toward the
> roof -- the same 3-story example moves its roof force from 88.9 to 97.5 kips just by softening from T = 0.4 s to
> T = 1.06 s. Without this tile the drift and P-delta tiles have no in-catalog source for their story shear.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The base shear and the
per-level forces and story shears are forces (kips); the period is a time (s); the level list, the distribution
exponent k, the Cvx factors, and the wi hi^k sum (a weight times a non-integer power of height) annotate
`dimensionless`. The v18/v21 contract: a non-positive or non-finite base shear or period, an empty level list, a
non-finite or non-positive level weight, or level heights that fail to increase bottom-up, returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the distribution by name; `editionNote` names **ASCE 7-22
§12.8.3 (Eqs. 12.8-11 and 12.8-12) and §12.8.4 (Eq. 12.8-13)**, gives the k rule verbatim in substance (k = 1 at or
below T = 0.5 s, k = 2 at or above 2.5 s, linear interpolation between -- and the standard permits k = 2 outright in
the interpolation band as the conservative-for-overturning choice), and states that **the distribution assumes the
ELF procedure applies (§12.8 permits it only within the §12.6 structural-system and irregularity limits), the weights
are the effective seismic weights per §12.7.2, the heights are from the base, and the engineer of record's analysis
governs** -- a design aid, not a lateral-analysis substitute. The multi-line level input follows the
`check-multiline-inputs` rule: a `makeTextarea` field, one `weight,height` pair per line, bottom-up.

## 2. The tile

### 2.1 `seismic-vertical-distribution` -- Fx = Cvx x V and the Story Shears Vx

```
inputs:
  base_shear_kip   kips   the ELF base shear V (from seismic-base-shear)
  period_s         s      the fundamental period T used for the base shear
  stories                 one level per line, bottom-up: "weight_kips,height_ft" (height from the base)

k    = 1                     for T <= 0.5 s
     = 2                     for T >= 2.5 s
     = 1 + (T - 0.5) / 2     between (linear interpolation; k = 2 outright also permitted)
Cvx  = wx hx^k / Sum(wi hi^k)          (Eq. 12.8-12)
Fx   = Cvx x V                          (Eq. 12.8-11)
Vx   = Sum Fi for i = x..n              (Eq. 12.8-13; shear at level x = forces at and above)
```

**Pinned worked example (3-story, V = 200 kips, T = 0.4 s -> k = 1).** Levels bottom-up 1,000 kips at 12 ft,
1,000 kips at 24 ft, 800 kips at 36 ft: `Sum wi hi = 64,800`; `Cvx = 0.1852 / 0.3704 / 0.4444`;
`Fx = ` **37.0 / 74.1 / 88.9 kips** bottom-up; story shears `Vx = ` **200.0 / 163.0 / 88.9 kips** -- the base story
carries the full V (the built-in check: Sum Fx = V), and the shear steps down by exactly the floor force at each level.
**Cross-check (the same building softened to T = 1.06 s -> k = 1.28).** The interpolated exponent (the SEAOC / Tedds
verification example's k at that period): `Sum wi hi^k = 161,050`; `Fx = ` **29.9 / 72.6 / 97.5 kips**; `Vx = 200.0 /
170.1 / 97.5 kips` -- the longer period shifts nearly 10 kips of the same 200 up to the roof, which is why the k
exponent, not just V, decides the upper-story connections.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, the distribution, `editionNote` per §1); `test/fixtures/worked-examples.json` (the k = 1 example
+ the k = 1.28 cross-check, pinning k, the wi hi^k sum, the roof force, and the base story shear);
`test/fixtures/compute-map.js` (`seismic-vertical-distribution` -> `computeSeismicVerticalDistribution` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `seismic-base-shear` / `seismic-story-drift` /
`seismic-pdelta-stability`); `data/search/aliases.json` ("vertical distribution seismic", "seismic story forces",
"Cvx", "story shear", "ASCE 12.8.3", "equivalent lateral force distribution", "k exponent seismic", "seismic force per
floor"); the id appended to the construction renderers declare in `app.js`; the `// dims:` annotation; regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples (full per-level arrays), the Sum Fx = V
identity, the k boundaries (0.5 / 2.5), and the error seams (non-finite / non-positive V or T, empty list, bad row,
non-increasing heights). Lazy-loaded, absent from home first paint. The hand-written renderer (textarea per the
`check-multiline-inputs` rule) mirrors `occupant-load`.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit (the per-level force / story-shear stacks wrap on a phone); render-no-nan + a11y
on the new tile, output read to the value (200 kips at T = 0.4 s -> 37.0 / 74.1 / 88.9 kips, base shear check 200.0).

## 5. Roadmap position

Completes the in-catalog ELF chain: spectral accelerations (v381) -> base shear (v226) -> **per-story forces and story
shears (this tile)** -> story drift (v382) -> P-delta stability (v383). The overturning-moment accumulation (§12.8.5's
story overturning from the same Fx set) and the redundancy / overstrength factors named by spec-v226 §5 stay deliberate
future follow-ons. Further Group E growth stays evidence-driven.
