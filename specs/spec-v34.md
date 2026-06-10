# roughlogic.com Specification v34 — Drilling Bench (1 New Tile)

> **Implementation status: LANDED 2026-06-10 (stamps package 0.35.0).** v34 is a
> catalog-growth spec in the lineage of v15/v16/v17/v20/v23/v24/v25/v26/v27/v28/
> v29/v30/v31/v32/v33. It inherits everything from spec.md through spec-v33.md
> and changes none of it.
>
> v34 deepens the existing **Group K (Mechanic)** with one first-principles
> drill-geometry tile. It adds **1 new tile** to an **existing** group, so there
> is **no new group and no §1.1 maintainer-signoff gate**. **No new third-party
> dependencies, no new licenses, no telemetry, no AI, US standards only.**
>
> **The thesis.** v34 continues the v29–v33 discipline: the catalog's gates
> verify finiteness, dimensions, and contract totality but **not absolute
> formula correctness**, so this tile is scoped to math that is **hand-
> verifiable to the last digit** — the drill-point tip allowance
> `(diameter/2)/tan(point angle/2)`. Pure trigonometry, **zero physical
> constants and no table transcription** (the point angle is user-supplied).
>
> **The gap.** A concept-check against the 558 live tiles found no drill /
> point-length / tip-allowance tile (`drill`, `point-length`, `drill-tip` all
> absent). A twist drill's conical point makes the full-diameter shoulder
> shallower than the tip, and accounting for that is a routine machinist /
> fabricator question for blind holes and shoulder depths. Group K (Mechanic —
> the home of `cutting-speed-rpm`, `hp-from-torque`, and `gear-mph-rpm`) is the
> natural fit, and it pairs with the v31 `cutting-speed-rpm` tile.
>
> **Count.** Measured against the live catalog of **558 tiles**, v34 reaches
> **559**. Distribution: **K +1**. The group count stays at 24.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry,
  and reviewer-signoff apply to the new tile.
- The v18/v21 tile contract applies from the first commit; a zero/negative
  diameter, a point angle outside (0, 180) degrees, and a non-finite input all
  return `{ error }` rather than leaking.
- The v19/v22 citation discipline applies to the new `citations.js` entry;
  Machinery's Handbook (Industrial Press) is cited **by name** for the
  drill-point relation, with the math first-principles trigonometry.
- The tile id `drill-point-depth` is kebab-case and was checked against all 558
  live ids; it does not collide.
- **Module placement.** The tile lands in `calc-mechanic.js`, the Group K home.
  The module sits at 95.6% of its 19,500 B gzip cap after the add, so the cap is
  unchanged. The shared `tools-data.js` catalog registry grew one row past its
  44,000 B cap, so that cap is bumped to **46,000 B** with a dated comment;
  `tools-data.js` is lazy-loaded and is not part of the home-view payload, so the
  spec-v10 §H.2 first-paint budget is unaffected.

## 2. New tile

Inputs / Output / Math / Citation / Edge cases / Tests.

### 2.1 `drill-point-depth` — Drill Point Depth — Group K

- **Inputs.** Drill diameter (in), point angle (deg, default 118; 118 is the
  general-purpose grind, 135 is for harder materials), and the desired
  full-diameter depth (in, optional).
- **Output.** The point length (tip allowance) and, when a full-diameter depth
  is entered, the tip (drill-to) depth = full depth + point length. The renderer
  also shows the point length as a multiple of the diameter (about 0.3x at
  118 degrees).
- **Math.** `point length = (diameter/2) / tan(point angle / 2)`; the conical
  point is treated as an ideal cone. `tip depth = full-diameter depth + point
  length`. Exact first-principles trigonometry.
- **Citation.** Drill-point geometry; the 118 / 135-degree drill-point relation
  as in Machinery's Handbook (Industrial Press), by name; first-principles. Web
  thinning, drift, and the machine depth stop govern the actual hole.
- **Edge cases.** Diameter ≤ 0 → error; point angle ≤ 0 or ≥ 180 → error; a
  non-finite input → error. The tip depth is `null` (a prompt, not an error)
  until a full-diameter depth is entered.
- **Worked example (hand-verified).** 0.5 in drill, 118-degree point: `point
  length = (0.25)/tan(59°) = 0.25/1.66428 = ` **0.1502 in** (about 0.30 ×
  diameter, the well-known rule of thumb). To reach a 1.0 in full-diameter
  depth, advance the tip to `1.0 + 0.1502 = ` **1.1502 in**.

## 3. Wiring and gates

Per the tile: `tools-data.js` (a `spec-v34` section after the group blocks,
`group: "K"`), `tile-meta.js` (`_TILES`), `citations.js`,
`test/fixtures/worked-examples.json`, `test/fixtures/compute-map.js`,
`scripts/related-tiles.mjs`, `data/search/aliases.json` (4 aliases), the
`app.js` `MECHANIC_RENDERERS` declare list, the `// dims:` annotation, the
regenerated v14 corpus + tile-index, a `test/unit/bounds-fuzzer.test.js` row,
`test/unit/calc-mechanic.test.js` compute tests, and the
`scripts/check-module-sizes.mjs` `tools-data.js` cap bump (44,000 → 46,000).
Appended after the original Group K block, so the block-scoped citation count
(13) is unaffected; the catalog-wide citation-coverage lint covers the entry.

## 4. As-landed verification

`npm run lint` (every gate, including the v31 `check-multiline-inputs` gate),
`npm test` (5,497 unit tests), `npm run build`, `npm run data:verify` (123),
the worked-examples runner (564 fixtures), the 320px shell audit (559 tile
shells / 585 URLs), and the full Playwright integration suite all green.

## 5. Roadmap position

This adds one drill-geometry primitive. The remaining hand-verifiable layout /
machinist candidates (`sine-bar`, `thread-pitch`, the `fraction-to-decimal`
inverse) stay on the roadmap; the table-method tiles (standard tap-drill charts,
recommended-SFM and feed-per-material charts) carry an explicit reviewed-table
requirement before they land, the same gate the v29/v30 SMACNA and
refrigerant-property tables carry. A standing housekeeping item also remains:
`calc-cross.js` (96.6% of cap) is flagged for a per-tile split before another
Group G tile lands there.
