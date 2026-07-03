# roughlogic.com Specification v311 -- Differential Leveling (HI Method) and Loop Misclosure (calc-survey.js, Group P, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.110.0; proposed 2026-07-02). Batch spec-v311..v313 (the field-surveying depth trio -- the leveling and
> taping computations the coordinate tiles never cover: differential leveling to carry an elevation (this spec), stadia
> tacheometry for distance and elevation (v312), and the temperature/slope corrections to a taped distance (v313).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog reduces horizontal traverses
> (`traverse-closure`, `area-by-coordinates`) but has no vertical-control tile -- differential leveling, the backsight/
> foresight bookkeeping that carries an elevation from a benchmark across a site and checks a loop for misclosure. Adds one
> tile to the existing **`calc-survey.js`** module (Group P); no new group, trade, or dependency. Inherits spec.md through
> spec-v310.md.
>
> **The gap, and the evidence for it.** Differential leveling carries elevation by the height-of-instrument method: at each
> setup, `HI = elevation + backsight`, and the next point's `elevation = HI - foresight`. Over a run, the elevation change
> equals `sum(BS) - sum(FS)`, and a level loop returning to a known elevation should close, its misclosure the check on the
> work. For a benchmark at 100.00 ft with backsights of 4.32 and 5.60 ft and foresights of 2.15 and 3.40 ft, the final
> elevation is `100.00 + (9.92 - 5.55) = 104.37 ft` -- the number a grader, a plumber setting invert elevations, or a
> foundation crew reads off the field book, and the running `sum(BS) - sum(FS)` is the arithmetic check every level circuit
> is balanced against. The coordinate tiles handle north-east; this tile handles up-down.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The benchmark elevation, the
backsight and foresight rod readings, the height of instrument, and the resulting elevations are lengths (ft); the
misclosure is a length (ft). The v18/v21 contract: any non-finite input, or a mismatch between the backsight and foresight
counts (each setup needs one of each, except the first BS and last FS), returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the differential-leveling method by name; `editionNote` names **the height-of-instrument method
`HI = elevation + BS`, `elevation = HI - FS`, the elevation change `sum(BS) - sum(FS)`, and the loop misclosure = computed
closing elevation - known closing elevation, as compiled in the standard surveying references (Ghilani/Wolf)**, and states
that **this returns the carried elevations and the loop misclosure -- it applies the arithmetic HI reduction, does not
distribute the misclosure back through the turning points (a proportional adjustment is a follow-on), assumes rod readings
already corrected for any rod/collimation error, and does not set an allowable-misclosure standard (`0.05 sqrt(miles)` or the
project spec governs); and this is a computational aid** -- the project survey control and specifications govern.

## 2. The tile

### 2.1 `differential-leveling` -- Differential Leveling (HI Method) and Loop Misclosure

```
inputs:
  bm_elev    ft     starting benchmark elevation
  bs[]       ft     backsight rod readings (in order)
  fs[]       ft     foresight rod readings (in order)
  known_close ft    known elevation to close on (optional, for misclosure)

sumBS = sum(bs) ; sumFS = sum(fs)
final_elev = bm_elev + sumBS - sumFS
per-turning-point: HI_i = elev_(i-1) + bs_i ; elev_i = HI_i - fs_i
misclosure = (known_close != null) ? final_elev - known_close : n/a
```

**Pinned worked example (a benchmark at 100.00 ft, two setups).** `bm = 100.00`; `bs = [4.32, 5.60]`, `fs = [2.15, 3.40]`:
setup 1, `HI = 100.00 + 4.32 = 104.32`, `TP1 = 104.32 - 2.15 = 102.17`; setup 2, `HI = 102.17 + 5.60 = 107.77`,
`final = 107.77 - 3.40 = 104.37 ft`. The check `sum(BS) - sum(FS) = 9.92 - 5.55 = 4.37` matches the `104.37 - 100.00` rise.
**Cross-check (close the loop on a known 104.40 ft).** With `known_close = 104.40`, the misclosure is
`104.37 - 104.40 = -0.03 ft` -- three hundredths low over the circuit, within a typical `0.05 sqrt(miles)` ordinary
tolerance for a short loop, the pass/fail the field book is balanced against. The non-finite and count-mismatch error paths
bracket the result.

## 3. Wiring

A `tools-data.js` row (group `P`, trades `["surveying","field"]`, matching `traverse-closure`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the HI leveling method, `editionNote` naming `HI = elev + BS`,
`elev = HI - FS`, `sum(BS) - sum(FS)`, the misclosure, and the no-adjustment, no-collimation, spec-governs caveats);
`test/fixtures/worked-examples.json` (the two-setup example + the loop-misclosure cross-check);
`test/fixtures/compute-map.js` (`differential-leveling` -> `computeDifferentialLeveling` in `../../calc-survey.js`);
`scripts/related-tiles.mjs` (-> `traverse-closure` / `stadia-distance` / `slope-from-level` / `drainage-invert`);
`data/search/aliases.json` ("differential leveling", "HI method", "backsight foresight", "level loop", "benchmark
elevation", "height of instrument", "level circuit misclosure", "carry elevation", "survey leveling"); the id appended to
the existing survey renderers block in `app.js`; the `// dims:` annotation (all lengths ft); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the per-turning-point HI reduction, the
`sum(BS) - sum(FS)` identity, the misclosure, and the count-mismatch / non-finite error seams. No new module; re-pin
`calc-survey.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the sum-identity assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the per-setup HI/elev rows and the
misclosure wrap on a phone); render-no-nan + a11y sweep, output read to the value (BM 100.00 -> 104.37 ft final).

## 5. Roadmap position

Opens the field-surveying depth batch (v311..v313) in `calc-survey.js`, adding vertical control to the horizontal traverse
tiles. Stadia tacheometry (v312) and taping corrections (v313) follow. A proportional misclosure adjustment across the
turning points, three-wire leveling with its stadia check, and a trigonometric-leveling variant are the deliberate next
follow-ons once the trio lands.
