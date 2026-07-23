# roughlogic.com Specification v1014 -- Relative Density of a Cohesionless Soil (calc-earthwork.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-23). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1013.md. Beside
> `relative-compaction` and `soil-phase-relations`.
>
> **The gap, declared twice independently.** `computeRelativeCompaction` (`calc-earthwork.js:1656`): "it does not
> compute the optimum-moisture window, the one-point Proctor, or **the cohesionless relative density Dr**."
> `computeSoilPhaseRelations` (`calc-earthwork.js:1696`): "it does not compute the permeability, the effective stress,
> or **the compaction relative density**." The distinction those notes draw is real trade content: relative
> *compaction* (percent of Proctor) is the wrong specification for a clean sand; relative *density* against the
> loosest and densest index densities is. Dupe-check: the only `"relative density"` alias in the index is
> `"relative density of a pine stand"` (forestry, `reineke-sdi`); no `"density index"` entry; `compute-map.js` has no
> relative-density tile; `computeRelativeCompaction` returns `{gd_field, rc_pct, pass}` -- a ratio to a different
> denominator from a different test.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, worked-example registry, bounds-fuzzer, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input, a non-positive field density or minimum index density, a negative moisture, or a maximum index
density not exceeding the minimum returns `{ error }`. A Dr outside 0-100% is NOT an error and is NOT clamped -- it is
flagged, because it means the field density lies outside the index-test range and signals a testing or data problem.

## 2. The tile

### 2.1 `soil-relative-density` -- Relative Density (Density Index) of a Cohesionless Soil

```
inputs:
  field_wet_pcf     field density (pcf)
  w_pct             moisture content (%, 0 = the density is already dry)
  gamma_dmin_pcf    minimum index dry density, loosest (pcf)
  gamma_dmax_pcf    maximum index dry density, densest (pcf)

gamma_d = field_wet_pcf / (1 + w_pct/100)
Dr = 100 x gamma_dmax (gamma_d - gamma_dmin) / (gamma_d (gamma_dmax - gamma_dmin))
```

**Why no specific gravity is asked for.** Dr is defined on void ratios, `Dr = (e_max - e)/(e_max - e_min)`.
Substituting the phase relation `e = Gs gamma_w/gamma_d - 1` gives
`Dr = (1/gamma_dmin - 1/gamma_d) / (1/gamma_dmin - 1/gamma_dmax)` -- **Gs and gamma_w cancel completely** -- which
rearranges to the dry-density form above. This was derived, not recalled, and the fuzzer proves it empirically by
evaluating the void-ratio definition at Gs = 2.60, 2.65, 2.72, and 2.80 and asserting all four match the tile to
within 1e-6.

**Pinned worked example.** 117.6 pcf wet at 12% moisture: `gamma_d = 117.6/1.12 = ` **105.0 pcf**. Against index
densities of 90 and 115 pcf: `Dr = 115(105-90)/(105 x 25) = ` **65.7%**. Cross-check: a field dry density equal to the
maximum index density returns exactly **100%**, and one equal to the minimum returns exactly **0%**.

**Honest scope on the descriptive bands.** The tile labels the result very loose / loose / medium dense / dense / very
dense. These are terms in common professional use, **not a code requirement**, and the tile and its citation say so
explicitly. No ASTM designation is claimed for them; the citation covers only the Dr definition and its dry-density
reduction, both of which are shown so a reviewer can check them by hand.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`, beside `relative-compaction`); a `tile-meta.js` `_TILES`
entry (`E`); a `citations.js` entry (four assumptions, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the exact-100% endpoint);
`test/fixtures/compute-map.js`; `scripts/related-tiles.mjs` (-> `relative-compaction` / `soil-phase-relations` /
`liquefaction-screening` / `soil-bearing-capacity`); `data/search/aliases.json` (3 collision-checked search aliases
plus 2 question-corpus phrases), then `node scripts/build-alias-shards.mjs`; a hand-written renderer registered in
`EARTHWORK_RENDERERS` (this module's convention); the id added to the calc-earthwork declare list in `app.js`; the
`// dims:` annotation directly above the compute; a `bounds-fuzzer.test.js` block pinning the example, the
four-Gs equivalence proof, both exact endpoints, the monotonic directions, the out-of-range flags, and the band
boundaries; regenerated v14 corpus + tile-index + citation-strings. Home tile count 1,462 -> 1,463.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
worked-examples runner; render + output read to the value (117.6 pcf at 12% -> 105.0 pcf dry, Dr 65.7%).

## 5. Roadmap position

Completes the earthwork compaction-QC pair: relative compaction against a Proctor maximum for cohesive and
well-graded fills, relative density against index densities for clean sands. The note states plainly that the two
scales are not interchangeable and that a sand at 95% relative compaction can still be loose. Serves the earthwork
contractor and the testing agency. Seventh tile of the self-declared-gap campaign; see spec-v1008 through spec-v1013.
