# roughlogic.com Specification v535 -- Cell Culture Doubling Time (calc-lab.js, Group T, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lab.js`**
> (Group T, bench science and lab math); no new module, group, or dependency. Inherits spec.md through spec-v534.md.
>
> **The gap, and the evidence for it.** `od600-cell-count` gives a density at one timepoint but not a growth rate.
> Doubling time -- how long a culture takes to double -- comes from two counts and the time between them, and the bench
> has no tile for it. The relation is `Td = t x ln(2) / ln(N / N0)`, with the specific growth rate and the number of
> doublings as companions. The catch that makes or breaks the number is the growth phase: doubling time is only constant
> during **log (exponential) phase**. Measure across the lag phase or into stationary phase and the value is
> meaningless, because the culture is not doubling at a steady rate there. A second caution: if `N` is an optical-density
> reading rather than a true cell count, the ratio still works but assumes OD stays proportional to count, which breaks
> at high density. The tile takes the initial and final counts (or ODs) and the elapsed time, and returns the doubling
> time, the specific growth rate, and the number of doublings -- the growth-kinetics numbers a single density read
> cannot give.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The initial and final
counts (or ODs) are `dimensionless` (a ratio is taken, so units cancel); the elapsed time and the doubling time are
times (`T`); the specific growth rate is `T^-1`; the number of doublings is `dimensionless`. The v18/v21 contract: any
non-finite input, a non-positive initial or final count, a final count not greater than the initial (no growth to
measure), or a non-positive elapsed time returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over
the growth-kinetics relations by name (exponential growth / population doubling); `editionNote` names the
**exponential-growth doubling time**, prints `Td = elapsed x ln(2) / ln(N / N0)`, `mu = ln(N / N0) / elapsed`, and
`doublings = log2(N / N0)`, and states that **doubling time is constant only during log (exponential) phase so a
measurement spanning lag or stationary phase is meaningless, if N is an optical density the ratio assumes OD stays
proportional to cell count (which fails at high density), and the culture, medium, and conditions govern** -- an
analysis aid, not a validated growth assay.

## 2. The tile

### 2.1 `doubling-time` -- Growth Rate From Two Counts (Valid Only in Log Phase)

```
inputs:
  initial_count   -    starting count or OD (N0)
  final_count     -    ending count or OD (N)
  elapsed_time    h    time between the two readings

Td        = elapsed_time x ln(2) / ln(final_count / initial_count)      [h]
mu        = ln(final_count / initial_count) / elapsed_time              [1/h]
doublings = log2(final_count / initial_count)                           [-]
```

**Pinned worked example (a culture from 1e5 to 8e5 cells/mL in 24 hours).** The fold change is `8x`, so the number of
doublings is `log2(8) = ` **3.0**, the doubling time is `24 x ln(2) / ln(8) = 24 x 0.693 / 2.079 = ` **8.0 hours**, and
the specific growth rate is `ln(8) / 24 = ` **0.087 per hour**. **Cross-check (a slower culture doubles less often).** A
culture that only goes from 1e5 to 2e5 in the same 24 hours has `log2(2) = 1.0` doubling, so
`Td = 24 x ln(2) / ln(2) = ` **24 hours** -- one doubling in a day, a growth rate of `0.029 per hour`, the contrast that
shows the calculation is entirely driven by the fold change over the interval. The tile returns the doubling time, the
growth rate, and the number of doublings.

## 3. Wiring

A `tools-data.js` row (group `T`, trades `["lab"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 3-doublings example + the
1-doubling cross-check); `test/fixtures/compute-map.js` (`doubling-time` -> `computeDoublingTime` in
`../../calc-lab.js`); `scripts/related-tiles.mjs` (-> `od600-cell-count` / `cfu-plate-count` / `nucleic-acid-a260`);
`data/search/aliases.json` ("doubling time", "growth rate", "population doubling", "specific growth rate", "log phase
growth", "generation time", "cell culture doubling", "mu growth"); the id appended to the lab renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the ln(2)/ln-ratio relation, the doublings = log2 relation, and the error seams (non-finite, non-positive
counts, final <= initial, non-positive time). Hand-writes its renderer (mirroring the calc-lab.js `od600-cell-count`
pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the Td / mu / doublings stack wraps on a phone); render-no-nan + a11y on the new tile, output read
to the value (the 8x example -> 8.0 h, 3 doublings).

## 5. Roadmap position

Adds growth kinetics beside `od600-cell-count` (single-timepoint density) and `cfu-plate-count`. A multi-point
regression (fitting a growth rate across several readings) and a yield-and-time-to-target-density projector are
deliberate future follow-ons. Further Group T growth stays evidence-driven.
