# roughlogic.com Specification v156 -- Mold Surface Remediation Labor and HEPA Vacuuming (calc-restoration.js, Group D, 1 New Tile)

> **Status: LANDED (2026-07-01, package 0.89.0; was PROPOSED 2026-06-23, DEFERRED 2026-06-29: held back as conceptually adjacent to live water and mold tiles when the fire and smoke subset v141/v146-v148/v152-v154 landed at 0.85.0). Batch spec-v151..v156.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one mold-remediation tile sizing the labor to clean a remediated
> surface area, the multi-pass HEPA-vacuum and damp-wipe work that the existing scope and chemistry
> tiles never quantify. Adds one tile to **`calc-restoration.js`** (Group D); no new module, group, or
> dependency. Inherits spec.md through spec-v155.md.
>
> **The gap, and the evidence for it.** `mold-remediation-level` sets the scope tier and
> `antimicrobial-coverage` (v145) sizes the chemistry, but the cost driver between them -- the labor to
> physically clean the surfaces -- has no tile. S520 source removal is a multi-pass operation: HEPA
> vacuum, damp wipe, HEPA vacuum again, at a production rate the substrate and access set, split across
> the crew. The estimator needs the labor hours and the crew calendar time, and the catalog gives the
> tier and the product quantity but not the hours.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
affected area is `L^2`; the production rate is `L^2/T` (ft^2/hr); the pass count and crew size are
`dimensionless`; the labor and crew calendar hours are `T`. The defaults (100 ft^2/hr production, 2
passes, crew of 2) are editable. The v18/v21 contract: any non-finite input, a non-positive area,
production rate, or crew size, or a pass count below 1 returns `{ error }`; the divisions are by the
guarded-positive production rate and crew size. Citation discipline (v19/v22): `GOVERNANCE.general` over
the source-removal multi-pass cleaning and the labor method, by name; `editionNote` names ANSI/IICRC
S520 and states that **the Condition, substrate, and access govern** the production rate and that
non-cleanable porous materials are removed, not cleaned -- this is a labor screen, not a remediation
protocol.

## 2. The tile

### 2.1 `mold-cleaning-labor` -- Surface Remediation Labor and HEPA Vacuuming

```
inputs:
  affected_sf          L^2            cleanable mold-affected surface area
  production_sf_per_hr  L^2/T         HEPA-vac + damp-wipe production per pass (default 100)
  passes               dimensionless  cleaning passes, e.g. vac / wipe / vac (default 2)
  crew_size            dimensionless  technicians on the task (default 2)

labor_hours = affected_sf x passes / production_sf_per_hr
crew_hours  = labor_hours / crew_size
```

**Pinned worked example.** 500 ft^2 of cleanable surface at 100 ft^2/hr, 2 passes, crew of 2:
`labor_hours = 500 x 2 / 100 = 10.0 hr`; `crew_hours = 10.0 / 2 = 5.0 hr` on the clock.
**Cross-check (a third pass adds half again).** Three passes, same crew: `labor_hours = 500 x 3 / 100 =
15.0 hr`; `crew_hours = 15.0 / 2 = 7.5 hr`. The Condition, substrate, and access govern the production
rate; porous non-cleanables are removed, not counted here; this is the labor screen.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the source-removal multi-pass labor method, `editionNote`
naming ANSI/IICRC S520, the Condition/substrate-governs caveat, and the remove-don't-clean-porous
scope); `test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`mold-cleaning-labor` -> `computeMoldCleaningLabor` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `mold-remediation-level` / `antimicrobial-coverage` / `ppe`);
`data/search/aliases.json` ("mold cleaning labor", "HEPA vacuum", "damp wipe", "source removal",
"remediation hours", "mold scrubbing"); the id appended to the existing `RESTORATION_RENDERERS` declare
in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning the example, cross-check, and error seams (non-finite, area / production / crew <= 0,
passes < 1). Raise the `calc-restoration.js` size cap by ~20 percent if needed (dated comment); bump the
`citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the labor and crew lines wrap on
a phone); render-no-nan + a11y sweep, output read to the value (500 ft^2 / 100 / 2 / 2 -> 10.0 labor
hr, 5.0 crew hr).

## 5. Roadmap position

Closes the batch by giving the mold family its labor estimate between the scope tier
(`mold-remediation-level`) and the chemistry quantity (v145). Further Group D growth stays
evidence-driven.
