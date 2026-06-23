# roughlogic.com Specification v151 -- Material Moisture-Content Dry Standard and Drying Goal (calc-restoration.js, Group D, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v151..v156.** In-scope catalog expansion under the
> spec-v106 trades-only charter: the daily monitoring metric the catalog still lacks -- whether a
> material's moisture reading has reached its drying goal relative to an unaffected dry standard. Adds
> one tile to **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits
> spec.md through spec-v150.md.
>
> **The gap, and the evidence for it.** The catalog has `drying-goal` (a target indoor GPP from
> atmospheric conditions) and `wood-emc` (the equilibrium moisture content wood trends toward), but
> neither is the number a tech writes on the moisture map twice a day: the pin-meter reading on the
> affected material, compared to the dry standard taken on an unaffected like-material, plus the small
> tolerance that defines "dry." S500 builds the whole monitoring and demobilization decision on that
> comparison -- reach the goal and the equipment comes out -- yet no tile computes the goal or the
> points remaining.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
reference (dry standard), affected, and goal moisture contents and the tolerance and points-remaining
are `dimensionless` (percent moisture content); the met result is boolean. The v18/v21 contract: any
non-finite input, or a negative reference, affected, or tolerance returns `{ error }`; there is no
division. Citation discipline (v19/v22): `GOVERNANCE.general` over the dry-standard / drying-goal
concept and the within-tolerance rule, by name; `editionNote` names ANSI/IICRC S500 and notes that
**the dry standard must be a calibrated reading on an unaffected like-material** and that meter scales
are material-specific -- this is a screen, the meter and the unaffected reference govern.

## 2. The tile

### 2.1 `dry-standard-mc` -- Material Dry Standard and Drying Goal

```
inputs:
  reference_mc_pct  dimensionless  dry standard: MC of an unaffected like-material
  affected_mc_pct   dimensionless  current reading on the drying material
  tolerance_points  dimensionless  acceptable points above the dry standard (default 4)

goal_mc_pct      = reference_mc_pct + tolerance_points
points_remaining = max(0, affected_mc_pct - goal_mc_pct)
met              = affected_mc_pct <= goal_mc_pct
```

**Pinned worked example.** An unaffected oak baseboard reads 12 percent (the dry standard), the
affected run reads 22 percent, tolerance 4: `goal = 12 + 4 = 16 percent`;
`points_remaining = 22 - 16 = 6`; `met = false` -- keep drying.
**Cross-check (the demob trigger).** A later reading of 15 percent: `15 <= 16` -> `met = true`,
`points_remaining = 0` -- the goal is reached and the equipment can come out. The unaffected reference
and meter calibration govern; this is the monitoring screen.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the dry-standard / drying-goal and tolerance rule,
`editionNote` naming ANSI/IICRC S500, the calibrated-unaffected-reference and material-specific-scale
caveats); `test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`dry-standard-mc` -> `computeDryStandardMc` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `wood-emc` / `drying-goal` / `drying-log`);
`data/search/aliases.json` ("dry standard", "drying goal", "moisture content", "pin meter", "MC
reading", "demobilization"); the id appended to the existing `RESTORATION_RENDERERS` declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning the example, cross-check, the met boundary, and error seams (non-finite, reference /
affected / tolerance < 0). Raise the `calc-restoration.js` size cap by ~20 percent if needed (dated
comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the met boundary); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the goal and
points-remaining lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (12 / 22
/ 4 -> goal 16, 6 remaining, not met).

## 5. Roadmap position

Adds the material-MC monitoring metric beside the atmospheric `drying-goal` and the `drying-log`,
completing the daily drying-progress read. Further Group D growth stays evidence-driven.
