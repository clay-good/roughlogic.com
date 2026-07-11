# roughlogic.com Specification v631 -- Level-Loop Misclosure Distribution (calc-survey.js, Group P, 1 New Tile)

> **Status: PROPOSED (2026-07-11). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-survey.js`** (Group P,
> survey), no new module, group, or dependency. Inherits spec.md through spec-v630.md.
>
> **The gap, and the evidence for it.** Spec-v311 (`differential-leveling`) reduces a level run and reports the loop
> misclosure, and its note says the same thing the tool description does: it "does not distribute the error back
> through the turning points (a proportional adjustment is a follow-on)." Reporting a 0.05 ft misclosure is only
> half the job; the surveyor still has to spread that error back across the benchmarks so the loop closes on its
> known elevation, and the standard way is the vertical analog of the compass rule the existing `traverse-closure`
> tile already applies to horizontal work: distribute the misclosure in proportion to the distance leveled to each
> point. The number this settles: a three-leg loop that closes 0.05 ft high across 2,000 ft of leveling puts a
> **-0.0125 ft** correction on the first turning point at 500 ft and the full **-0.05 ft** on the last, so every
> published elevation is consistent and the loop lands exactly on its known closing benchmark.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The elevations, leg
distances, corrections, and adjusted elevations are all `L` (feet). The v18/v21 contract: any non-finite value, a
mismatched count of elevations and distances, fewer than one point, a non-positive leg distance, or a zero total
distance returns `{ error }`, mirroring the array-input discipline of the `differential-leveling` sibling. Citation
discipline (v19/v22): the proportional (compass-rule) misclosure distribution by name, as compiled in the standard
surveying references (Ghilani/Wolf); the note states that **the misclosure is computed elevation minus the known
closing elevation, the correction to each point is minus the misclosure times the cumulative distance to that point
over the total distance (so the last point takes the full correction and closes exactly), and this is the
distance-weighted method that assumes error accumulates with the length leveled** -- a computational aid, the project
survey control and specifications govern.

## 2. The tile

### 2.1 `level-loop-adjustment` -- Distribute a Level-Loop Misclosure Back to the Benchmarks

```
inputs:
  elevs        ft (list)   computed elevations at each turning point, in loop order (last = closing point)
  dists        ft (list)   the distance leveled to reach each point (same count as elevs)
  known_close  ft          the known elevation of the closing (last) point

misclosure   = elevs[last] - known_close
cum_i        = sum(dists[0..i])
correction_i = -misclosure * cum_i / cum_total
adjusted_i   = elevs[i] + correction_i
```

**Pinned worked example (a three-leg loop closing 0.05 ft high).** Computed elevations 105.20, 108.60, 100.05 ft at
legs of 500, 800, 700 ft, known closing elevation 100.00 ft: `misclosure = 100.05 - 100.00 = ` **0.050 ft** over a
`cum_total = 2,000 ft`. The corrections are `-0.050 x 500/2000 = -0.0125`, `-0.050 x 1300/2000 = -0.0325`, and
`-0.050 x 2000/2000 = -0.050`, giving adjusted elevations **105.1875**, **108.5675**, and **100.0000 ft** -- the loop
now lands exactly on its known benchmark. **Cross-check (a clean loop).** With the last computed elevation already at
100.00 the misclosure is 0, every correction is 0, and the adjusted elevations equal the computed ones.

## 3. Wiring

A `tools-data.js` row (group `P`, trades `["survey"]`, beside `differential-leveling`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (compass-rule vertical adjustment / Ghilani-Wolf, the note per §1);
`test/fixtures/worked-examples.json` (both examples, the array output pinned by the final adjusted elevation and the
misclosure); `test/fixtures/compute-map.js` (`level-loop-adjustment` -> `computeLevelLoopAdjustment` in
`../../calc-survey.js`); `scripts/related-tiles.mjs` (-> `differential-leveling` / `traverse-closure` /
`grade-slope`); `data/search/aliases.json` ("level loop adjustment", "misclosure distribution", "balance a level
loop", "compass rule leveling", plus question rows); `SURVEY_RENDERERS["level-loop-adjustment"]` via a hand-written
renderer with two `makeTextarea` list inputs (mirroring `differential-leveling`) and the id added to the calc-survey
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index;
a `bounds-fuzzer.test.js` block pinning both examples, the exact-closure property (the last adjusted elevation equals
the known close), and the error seams (non-finite, mismatched counts, empty, non-positive distance, zero total). The
calc-survey.js gzip cap is at its limit; this landing raises it from 8,000 to 9,000 with a `check-module-sizes.mjs`
note (the established per-module cap-relief pattern). The `citations.test.js` "Group P audit" count (13) covers only
the tools-data.js "// Group P: Field" SAR/navigation block; the survey tiles sit in a separate "field-surveying"
block and are not counted, so this tile needs no count bump. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> misclosure 0.050 ft, last adjusted 100.0000 ft).

## 5. Roadmap position

Completes the differential-leveling pair spec-v311 opened: the run reduction reports the misclosure, and this
distributes it -- the vertical analog of the horizontal compass rule already in `traverse-closure`. Further Group P
growth stays evidence-driven.
