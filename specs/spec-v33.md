# roughlogic.com Specification v33 — Shop-Math Bench (1 New Tile)

> **Implementation status: LANDED 2026-06-10 (stamps package 0.34.0).** v33 is
> a catalog-growth spec in the lineage of v15/v16/v17/v20/v23/v24/v25/v26/v27/
> v28/v29/v30/v31/v32. It inherits everything from spec.md through spec-v32.md
> and changes none of it.
>
> v33 deepens the existing **Group G (Cross-Trade Utilities)** with one
> first-principles arithmetic tile. It adds **1 new tile** to an **existing**
> group, so there is **no new group and no §1.1 maintainer-signoff gate**. **No
> new third-party dependencies, no new licenses, no telemetry, no AI, US
> standards only.**
>
> **The thesis.** v33 continues the v29–v32 discipline: the catalog's gates
> verify finiteness, dimensions, and contract totality but **not absolute
> formula correctness**, so this tile is scoped to math that is **hand-
> verifiable to the last digit** — nearest-1/N rounding, GCD reduction, and a
> feet-inch decomposition. Pure arithmetic, **zero physical constants and no
> table transcription** (the lowest-risk tile class in the catalog).
>
> **The gap.** A concept-check against the 557 live tiles found no fraction /
> feet-inch / decimal-inch / tape-measure tile (`fraction`, `feet-inch`,
> `decimal-inch`, `tape-measure`, `dimension-add` all absent). Converting a
> decimal reading to the nearest tape-measure fraction (and to feet-inches) is
> among the most common pieces of math every building trade does, and
> `unit-converter` does not cover it (it converts *between units*, not decimal
> to fraction-of-inch). Group G (Cross-Trade Utilities — the home of
> `unit-converter`, `geometry`, and `layout-squaring`) is the natural fit.
>
> **Count.** Measured against the live catalog of **557 tiles**, v33 reaches
> **558**. Distribution: **G +1**. The group count stays at 24.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry,
  and reviewer-signoff apply to the new tile.
- The v18/v21 tile contract applies from the first commit; a non-finite value or
  a non-binary denominator returns `{ error }` rather than leaking.
- The v19/v22 citation discipline applies to the new `citations.js` entry; the
  tile is first-principles arithmetic (public domain), cited as such.
- The tile id `decimal-to-fraction` is kebab-case and was checked against all
  557 live ids; it does not collide.
- **Module placement.** The tile lands in `calc-cross.js`, the home of the other
  Group G tiles. The module sits at 96.6% of its 41,000 B gzip cap after the
  add, so the cap is unchanged; a per-tile split of `calc-cross.js` remains the
  preferred long-term remediation (as the cap comment has noted since v26).

## 2. New tile

Inputs / Output / Math / Citation / Edge cases / Tests.

### 2.1 `decimal-to-fraction` — Decimal to Fraction — Group G

- **Inputs.** Decimal value (in) and the rounding denominator (a binary
  tape-measure / machinist-scale fraction: 1/2, 1/4, 1/8, 1/16 default, 1/32,
  1/64).
- **Output.** The nearest fraction as a reduced mixed number (e.g. `2-3/8 in`),
  the feet-inches form (e.g. `0' 2-3/8"`), and the rounding error (rounded minus
  exact). The numeric output slots `whole_in`, `numerator`,
  `reduced_denominator`, `decimal_value_in`, `error_in`, `feet`, `inch_in_ft`
  are exposed for the worked-example fixture.
- **Math.** `ticks = round(|value| · den)`; `whole = floor(ticks/den)`; the
  remaining `ticks − whole·den` over `den` is reduced by the GCD;
  `feet = floor(whole/12)`; `error = rounded − exact`. The sign is carried
  through. All exact first-principles arithmetic.
- **Citation.** First-principles arithmetic (nearest-1/N rounding, GCD
  reduction, feet-inch decomposition), public domain. Binary (power-of-two)
  denominators are the tape-measure / machinist-scale standard.
- **Edge cases.** A non-binary denominator (anything but 2/4/8/16/32/64) →
  error; a non-finite value → error (a blanked field reads as such and shows the
  guard message, not a `NaN`). Zero is valid (`0 in` / `0' 0"`); negative values
  carry a leading `-`.
- **Worked example (hand-verified).** 2.375 in to the nearest 1/16:
  `round(2.375·16) = 38` ticks; `whole = 2`; remainder `6/16` reduces (GCD 2) to
  `3/8`; so **`2-3/8 in` = `0' 2-3/8"`**, error **0**. Also 0.4375 → `7/16`;
  27.625 in → **`2' 3-5/8"`**; 0.51 to the nearest 1/2 → `1/2` with error
  **−0.01 in**.

## 3. Wiring and gates

Per the tile: `tools-data.js` (a `spec-v33` section after the group blocks,
`group: "G"`), `tile-meta.js` (`_TILES`), `citations.js`,
`test/fixtures/worked-examples.json`, `test/fixtures/compute-map.js`,
`scripts/related-tiles.mjs`, `data/search/aliases.json` (4 aliases), the
`app.js` `CROSS_RENDERERS` declare list, the `// dims:` annotation (with the
non-exported `_bcGcd` helper placed above the dims block per the v28 lesson),
the regenerated v14 corpus + tile-index, and a `test/unit/bounds-fuzzer.test.js`
row pinning the rounding, the GCD reduction, the feet-inch decomposition, the
sign, and the error. Appended after the original Group G block, so the
block-scoped citation count is unaffected; the catalog-wide citation-coverage
lint covers the new entry.

## 4. As-landed verification

`npm run lint` (every gate, including the v31 `check-multiline-inputs` gate),
`npm test` (5,491 unit tests), `npm run build`, `npm run data:verify` (123),
the worked-examples runner (563 fixtures), the 320px shell audit (558 tile
shells / 584 URLs), and the full Playwright integration suite all green.

## 5. Roadmap position

This adds one shop-math primitive. The remaining hand-verifiable layout /
machinist candidates (`sine-bar`, `thread-pitch`, `drill-point-depth`,
`fraction-to-decimal` as the inverse) stay on the roadmap; the table-method
tiles (standard tap-drill charts, recommended-SFM and feed-per-material charts)
carry an explicit reviewed-table requirement before they land, the same gate the
v29/v30 SMACNA and refrigerant-property tables carry.
