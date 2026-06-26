# roughlogic.com Specification v198 -- Drying Completion Projection: Days to Goal From Monitored Moisture Drop (calc-restoration.js, Group D, 1 New Tile)

> **Status: LANDED 2026-06-26 (package 0.83.0; part of catalog 656 -> 664). Batch spec-v197..v198 (water-damage restoration, second pass), closing
> tile.** In-scope catalog expansion under the spec-v106 trades-only charter: one tile projecting how
> many days a material needs to reach its dry goal from the moisture-content drop observed between
> readings -- the completion forecast that turns the drying log into a schedule. Adds one tile to
> **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits spec.md through
> spec-v196.md.
>
> **The gap, and the evidence for it.** The catalog records boundary readings (`drying-log`), sets the
> goal (`drying-goal`, `dry-standard-mc`), and lists typical material drying times (`drying-times`), but
> never projects *this job's* finish from *this job's* trend: given today's reading, the goal, and the
> drop over the last day, how many days remain. That forecast is what schedules the pull and flags a
> stalled job, and there is no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
current, goal, and per-day moisture contents are percent of dry weight (`dimensionless`, consistent
with `dry-standard-mc` and `wood-emc`); the projected duration is `time` (days). The v18/v21 contract:
any non-finite input, a goal at or above the current reading, or a non-positive daily drop returns
`{ error }` (a zero or negative daily drop is reported as "not progressing -- reassess the plan", not a
divide); the only division is by the guarded-positive daily drop. Citation discipline (v19/v22):
`GOVERNANCE.general` over the linear-trend projection, by name; `editionNote` names ANSI/IICRC S500 and
states that **drying is non-linear and slows as it approaches the goal**, so a constant-rate projection
is a planning estimate that runs optimistic near the end, that the `drying-log` boundary readings and
the restorer's daily monitoring govern the actual endpoint, and that the dry standard is the unaffected
reference, not an absolute number.

## 2. The tile

### 2.1 `dry-time-projection` -- Days to Reach the Dry Goal From the Observed Drop

```
inputs:
  current_mc_pct    %    most recent moisture-content reading on the affected material
  goal_mc_pct       %    dry-standard / goal moisture content
  daily_drop_pct    %    moisture-content drop observed over the last 24 hours

remaining_pts   = current_mc_pct - goal_mc_pct
if daily_drop_pct <= 0:  -> "not progressing -- reassess airflow, dehumidification, and access"
else:
  days_to_goal  = remaining_pts / daily_drop_pct      # constant-rate estimate (optimistic near goal)
```

**Pinned worked example.** A material reading **28%**, goal **12%**, having dropped **4 points** in
the last day: `remaining = 28 - 12 = 16 points`; `days_to_goal = 16 / 4 = 4 days` to reach goal at the
current rate (expect a little longer as it slows near the end). **Cross-check (slowing / stalled).**
If the daily drop falls to **2 points**: `days_to_goal = 16 / 2 = 8 days`; and if the last reading
shows **no drop** (`daily_drop <= 0`), the tile returns **"not progressing -- reassess the plan"**
rather than a number. Drying is non-linear; the `drying-log` readings and S500 govern the real pull
date.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the linear-trend projection, `editionNote` naming
ANSI/IICRC S500 and the non-linear / monitoring-governs caveats);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`dry-time-projection` -> `computeDryTimeProjection` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `drying-log` / `dry-standard-mc` / `drying-times`);
`data/search/aliases.json` ("days to dry", "drying projection", "time to goal", "drying schedule",
"dry time estimate", "stalled drying"); the id appended to the existing `RESTORATION_RENDERERS` declare
in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning the 4-day example, the slowing cross-check, the not-progressing branch, and error seams
(non-finite, goal >= current, daily_drop handled as the non-divide branch). Raise the
`calc-restoration.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap if
needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the not-progressing branch); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
remaining points and days-to-goal wrap on a phone); render-no-nan + a11y sweep, output read to the
value (28 -> 12 at 4/day -> 4 days; at 2/day -> 8 days; 0/day -> not progressing).

## 5. Roadmap position

Closes the v197..v198 second-pass batch and turns the `drying-log` readings into a completion forecast
against `dry-standard-mc`. With this, the restoration trade is effectively saturated for everyday
IICRC S500/S520/S700 work. Further Group D growth stays evidence-driven.
