# roughlogic.com Specification v32 — Layout-Geometry Bench (1 New Tile)

> **Implementation status: LANDED 2026-06-10 (stamps package 0.33.0).** v32 is
> a catalog-growth spec in the lineage of v15/v16/v17/v20/v23/v24/v25/v26/v27/
> v28/v29/v30/v31. It inherits everything from spec.md through spec-v31.md and
> changes none of it.
>
> v32 deepens the existing **Group G (Cross-Trade Utilities)** with one
> first-principles layout tile. It adds **1 new tile** to an **existing** group,
> so there is **no new group and no §1.1 maintainer-signoff gate**. **No new
> third-party dependencies, no new licenses, no telemetry, no AI, US standards
> only.**
>
> **The thesis.** v32 continues the v29/v30/v31 discipline: the catalog's gates
> verify finiteness, dimensions, and contract totality but **not absolute
> formula correctness**, so this tile is scoped to math that is **hand-
> verifiable to the last digit** — the circle-of-holes coordinate identities
> `x = cx + R·cos`, `y = cy + R·sin`, the spacing `360/N`, and the adjacent
> chord `2·R·sin(180/N)`. Pure trigonometry, **no code-table transcription**.
>
> **The gap.** A concept-check against the 556 live tiles found no bolt-circle /
> circle-of-holes / hole-pattern tile (`bolt-circle`, `bolt-pattern`,
> `hole-pattern` all absent). Laying out a circle of bolt holes is among the
> most common fabrication / millwright / machinist layout tasks, and Group G
> (Cross-Trade Utilities — the home of `rolling-offset`, `layout-squaring`, and
> `center-of-gravity-2point`) is the natural fit. It complements the existing
> `flange-bolt-torque` (which torques a known pattern) by laying the pattern
> out.
>
> **Count.** Measured against the live catalog of **556 tiles**, v32 reaches
> **557**. Distribution: **G +1**. The group count stays at 24.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry,
  and reviewer-signoff apply to the new tile.
- The v18/v21 tile contract applies from the first commit; the new seam is
  guarded (v21 RC-1): a zero or negative diameter, a hole count below 1 or above
  360, and any non-finite input all return `{ error }` rather than leaking a
  bad coordinate or building an unbounded array.
- The v19/v22 citation discipline applies to the new `citations.js` entry.
  Machinery's Handbook (Industrial Press) is cited **by name** as the
  conventional reference for the circle-of-holes geometry; the math itself is
  first-principles trigonometry.
- The tile id `bolt-circle` is kebab-case and was checked against all 556 live
  ids; it does not collide.
- **Module placement.** The tile lands in `calc-cross.js`, the home of the other
  Group G tiles. The module was at 93.3% of its 40,000 B gzip cap; the cap is
  bumped to **41,000 B** with a dated comment (the sanctioned mechanism). No new
  module is created. (A per-tile split of `calc-cross.js` remains the preferred
  long-term remediation, as the cap comment notes.)

## 2. New tile

Inputs / Output / Math / Citation / Edge cases / Tests.

### 2.1 `bolt-circle` — Bolt Circle Layout — Group G

- **Inputs.** Bolt circle diameter (in), number of holes (N), start angle (deg,
  default 0, measured from the +X axis), center X (in, default 0), center Y (in,
  default 0).
- **Output.** Per-hole coordinates (X, Y in), the angular spacing (`360/N`), the
  adjacent center-to-center chord (`2·R·sin(180/N)`), and the radius. The chord
  is `null` for a single hole (no adjacent hole).
- **Math.** `R = dia/2`; hole `i` (1-indexed) sits at angle `start + (i-1)·(360/
  N)`; `X_i = cx + R·cos(angle)`, `Y_i = cy + R·sin(angle)`; chord `= 2·R·
  sin(180/N)`. All exact first-principles trigonometry.
- **Citation.** First-principles trigonometry; the circle-of-holes coordinate
  geometry as in Machinery's Handbook (Industrial Press), by name. Confirm the
  hole pattern, datum, and tolerance against the drawing before drilling.
- **Edge cases.** Diameter ≤ 0 → error; N < 1 → error; N > 360 → error (an
  unbounded array guard); a non-finite input → error. A single hole reports a
  `null` chord (shown as "single hole"), not an error.
- **Worked example (hand-verified).** 8 in bolt circle, 6 holes, start 0 deg,
  center (0, 0): `R = 4`; spacing `360/6 = ` **60 deg**; chord `= 2·4·sin(30°)
  = 8·0.5 = ` **4.000 in**; first hole at `(4·cos0, 4·sin0) = ` **(4.000,
  0.000)**, second at `(4·cos60, 4·sin60) = ` **(2.000, 3.464)**.

## 3. Wiring and gates

Per the tile: `tools-data.js` (a `spec-v32` section after the group blocks,
`group: "G"`), `tile-meta.js` (`_TILES`), `citations.js`,
`test/fixtures/worked-examples.json`, `test/fixtures/compute-map.js`,
`scripts/related-tiles.mjs`, `data/search/aliases.json` (4 aliases), the
`app.js` `CROSS_RENDERERS` declare list, the `// dims:` annotation, the
regenerated v14 corpus + tile-index, a `test/unit/bounds-fuzzer.test.js` row
(pinning the radius, chord, spacing, and the first two hole coordinates), and
the `scripts/check-module-sizes.mjs` cap bump (40,000 → 41,000). Appended after
the original Group G block, so the block-scoped citation count is unaffected;
the catalog-wide citation-coverage lint covers the new entry.

## 4. As-landed verification

`npm run lint` (every gate, including the v31 `check-multiline-inputs` gate),
`npm test` (5,490 unit tests), `npm run build`, `npm run data:verify` (123),
the worked-examples runner (562 fixtures), the 320px shell audit (557 tile
shells / 583 URLs), and the full Playwright integration suite all green.

## 5. Roadmap position

This adds one layout-geometry primitive. The remaining hand-verifiable layout /
machinist candidates (`tap-drill-size`, `thread-pitch`, `sine-bar`,
`drill-point-depth`, `dividing-head`) stay on the roadmap; the table-method
tiles (recommended-SFM and feed-per-material charts, standard tap-drill charts)
carry an explicit reviewed-table requirement before they land, the same gate the
v29/v30 SMACNA and refrigerant-property tables carry.
