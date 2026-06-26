# roughlogic.com Specification v195 -- Water Category Deterioration Timeline Reference (IICRC S500) (calc-restoration.js, Group D, 1 New Tile)

> **Status: LANDED 2026-06-26 (package 0.83.0; part of catalog 656 -> 664). Batch spec-v188..v196 (water-damage restoration).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one reference tile applying the IICRC S500
> principle that water category is determined at the time of remediation -- not fixed by its source --
> so clean water left wet over time and temperature reclassifies to a higher category. Adds one tile to
> **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits spec.md through
> spec-v187.md.
>
> **The gap, and the evidence for it.** The catalog defines the categories and classes
> (`water-classes`) but treats category as static. S500 is explicit that a Category 1 loss left
> standing, warm, or in contact with contaminated materials degrades to Category 2 or 3 -- the reason a
> two-day-old "clean" loss is not handled as clean. That time-and-temperature reclassification drives
> PPE, disposal, and disinfection decisions, and no tile carries it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. This is
a reference-lookup tile (the `water-classes` / `mold-conditions` pattern): the origin category,
elapsed wet time (`time`, hours), a warm-temperature flag, and a contact-with-contaminant flag select
the likely current category. There is no numeric formula beyond threshold comparisons on the elapsed
time. The v18/v21 contract: an unrecognized origin category, or a negative elapsed time, returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the category-at-time-of-
remediation principle, by name; `editionNote` names ANSI/IICRC S500 and states that **category is a
professional determination made at the time of restoration, not by the source alone**, that elevated
temperature and contact with contaminated materials accelerate the shift, that the amplification window
commonly cited is on the order of 48-72 hours under favorable conditions, and that **when in doubt the
higher category is assumed** -- the restorer and S500 govern.

## 2. The tile

### 2.1 `category-deterioration` -- S500 Category Reclassification Over Time

```
inputs:
  origin_category    select   "Category 1 (clean)" | "Category 2 (gray)" | "Category 3 (black)"
  elapsed_hours      time     hours the loss has stood wet
  warm_environment   dimensionless  0/1 -- temperatures favoring microbial amplification
  contacted_contaminant dimensionless 0/1 -- contacted soil/sewage/contaminated materials

likely_category = escalate(origin_category) when:
   contacted_contaminant == 1                          -> escalate toward Category 3
   origin Category 1 and elapsed_hours >= 48-72 (sooner if warm) -> reclassify to Category 2 (or 3)
   origin Category 2 left wet/warm                      -> may reach Category 3
otherwise remains at origin
note: when uncertain, assume the higher category
```

**Pinned worked example.** A **Category 1** supply-line loss discovered **72 hours** later in a
**warm** structure: under S500 the standing time and temperature have driven microbial amplification,
so it is **reclassified to Category 2** (gray) -- it is no longer handled as clean water, and PPE,
disinfection, and disposal escalate accordingly. **Cross-check (still clean / contaminant contact).**
The same Category 1 loss found at **12 hours** in a cool, dry space with no contaminant contact
**remains Category 1**; but a Category 1 loss that **contacted sewage or soil** is escalated toward
**Category 3** regardless of the clock. When in doubt, the higher category is assumed; the restorer
and S500 govern.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the category-at-time-of-remediation principle,
`editionNote` naming ANSI/IICRC S500 and the temperature/contact/when-in-doubt-higher caveats);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`category-deterioration` -> `computeCategoryDeterioration` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `water-classes` / `mold-conditions` / `ppe`);
`data/search/aliases.json` ("category deterioration", "category over time", "clean to gray", "water
reclassification", "48 72 hours", "category at time of restoration"); the id appended to the existing
`RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the 72-hour-warm escalation, the 12-hour-clean and
contaminant-contact cross-checks, and error seams (unrecognized category, elapsed < 0). Raise the
`calc-restoration.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap if
needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the contaminant-contact path); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
likely-category and rationale wrap on a phone); render-no-nan + a11y sweep, output read to the value
(Cat 1 / 72 h / warm -> Cat 2; Cat 1 / 12 h / cool -> Cat 1; contaminant contact -> Cat 3).

## 5. Roadmap position

Adds the time dimension to `water-classes` and feeds `ppe` and the disinfection family. Further Group
D growth stays evidence-driven.
