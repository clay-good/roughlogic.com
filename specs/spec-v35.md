# roughlogic.com Specification v35 — Small-Engine Bench (1 New Tile)

> **Implementation status: LANDED 2026-06-10 (stamps package 0.36.0).** v35 is a
> catalog-growth spec in the lineage of v15/v16/v17/v20/v23/v24/v25/v26/v27/v28/
> v29/v30/v31/v32/v33/v34. It inherits everything from spec.md through
> spec-v34.md and changes none of it.
>
> v35 deepens the existing **Group L (Agriculture and Forestry)** with one
> first-principles arithmetic tile. It adds **1 new tile** to an **existing**
> group, so there is **no new group and no §1.1 maintainer-signoff gate**. **No
> new third-party dependencies, no new licenses, no telemetry, no AI, US
> standards only.**
>
> **The thesis.** v35 continues the v29–v34 discipline: math that is **hand-
> verifiable to the last digit** — the mix identity `oil = fuel / ratio` plus
> the gallon/ounce/milliliter unit definitions. Pure arithmetic, **zero physical
> constants and no table transcription**.
>
> **The gap.** A concept-check against the 559 live tiles found no two-stroke /
> fuel-mix / gas-oil-ratio tile (`two-stroke`, `fuel-mix`, `oil-mix` all absent;
> `glycol-mix` covers coolant/antifreeze blends, a different concept). Mixing
> gas and oil to the right ratio is the single most common piece of math a
> chainsaw, string-trimmer, leaf-blower, or two-stroke-outboard operator does,
> and Group L (Agriculture and Forestry — the home of forestry chainsaw work and
> the sprayer/tank-mix tiles) is the natural fit.
>
> **Count.** Measured against the live catalog of **559 tiles**, v35 reaches
> **560**. Distribution: **L +1**. The group count stays at 24.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry,
  and reviewer-signoff apply to the new tile.
- The v18/v21 tile contract applies from the first commit; a non-positive ratio,
  a negative fuel amount, or a non-finite input returns `{ error }`.
- The v19/v22 citation discipline applies to the new `citations.js` entry; the
  tile is first-principles volume arithmetic (public domain), cited as such, and
  defers the ratio and oil grade to the equipment manufacturer.
- The tile id `two-stroke-mix` is kebab-case and was checked against all 559
  live ids; it does not collide.
- **Module placement.** The tile lands in `calc-agriculture.js`, a Group L home.
  The module sits at 96.5% of its 28,000 B gzip cap after the add, and the
  shared `tools-data.js` registry at 96.2% of its 46,000 B cap, so both caps are
  unchanged this spec. (Both are on the watch list for a future bump or split.)

## 2. New tile

Inputs / Output / Math / Citation / Edge cases / Tests.

### 2.1 `two-stroke-mix` — Two-Stroke Fuel Mix — Group L

- **Inputs.** Mix ratio (the X in X:1, gas:oil by volume), fuel amount, and the
  fuel unit (US gallons default, or liters).
- **Output.** The oil to add in fl oz and mL, and the per-gallon (oz/gal) and
  per-liter (mL/L) dose for the entered ratio.
- **Math.** `oil volume = fuel volume / ratio` in the entered unit, then
  converted: `1 US gallon = 128 fl oz`, `1 fl oz = 29.5735 mL`. Exact
  first-principles volume arithmetic.
- **Citation.** Two-stroke fuel/oil mixing by volume ratio; first-principles
  arithmetic, public domain. The ratio (50:1, 40:1, …) and oil grade
  (JASO/ISO) come from the equipment manual, which governs.
- **Edge cases.** Ratio ≤ 0 → error; a negative fuel amount → error; a
  non-finite input → error. Zero fuel is valid (zero oil).
- **Worked example (hand-verified).** 50:1 at 1 US gallon: `oil = (1/50)·128 = `
  **2.56 fl oz** = `2.56·29.5735 = ` **75.71 mL**; per-gallon dose `128/50 = `
  **2.56 oz/gal**. A 40:1 mix is `128/40 = ` **3.2 oz/gal**; 5 liters at 50:1 is
  `(5/50)·1000 = ` **100 mL**.

## 3. Wiring and gates

Per the tile: `tools-data.js` (a `spec-v35` section after the group blocks,
`group: "L"`), `tile-meta.js` (`_TILES`), `citations.js`,
`test/fixtures/worked-examples.json`, `test/fixtures/compute-map.js`,
`scripts/related-tiles.mjs`, `data/search/aliases.json` (4 aliases), the
`app.js` `AGRICULTURE_RENDERERS` declare list, the `// dims:` annotation, the
regenerated v14 corpus + tile-index, and a `test/unit/bounds-fuzzer.test.js`
row (pinning the 50:1 / 40:1 doses, the liter path, and the error cases).
Appended after the original Group L block, so the block-scoped citation count is
unaffected; the catalog-wide citation-coverage lint covers the new entry.

## 4. As-landed verification

`npm run lint` (every gate, including the v31 `check-multiline-inputs` gate),
`npm test` (5,497 unit tests), `npm run build`, `npm run data:verify` (123),
the worked-examples runner (565 fixtures), the 320px shell audit (560 tile
shells / 586 URLs), and the full Playwright integration suite all green.

## 5. Roadmap position

This adds one small-engine primitive. The remaining hand-verifiable layout /
machinist candidates (`sine-bar`, `thread-pitch`) stay on the roadmap; the
table-method tiles carry an explicit reviewed-table requirement before they
land. The standing housekeeping items also remain: `calc-cross.js` (96.6% of
cap), `calc-mechanic.js` (95.6%), and `calc-agriculture.js` (96.5%) are all
near cap, and a per-tile module split is the documented preferred remediation
before the next tile lands in any of them.
