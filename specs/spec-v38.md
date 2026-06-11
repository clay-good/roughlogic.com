# roughlogic.com Specification v38 — Thread-Pitch Bench (1 New Tile)

> **Implementation status: LANDED 2026-06-11 (stamps package 0.38.0).** v38 is a
> catalog-growth spec in the lineage of v15/v16/v17/v20/v23/v24/v25/v26/v27/v28/
> v29/v30/v31/v32/v33/v34/v35/v37. It inherits everything from spec.md through
> spec-v37.md and changes none of it.
>
> v38 deepens the existing **Group G (Cross-Trade Utilities)** with one
> first-principles thread-geometry tile. It adds **1 new tile** to an **existing**
> group, so there is **no new group and no §1.1 maintainer-signoff gate**. **No
> new third-party dependencies, no new licenses, no telemetry, no AI, US
> standards only.**
>
> **The thesis.** v38 continues the v29–v37 discipline: math that is **hand-
> verifiable to the last digit** — the thread relations `P = 1 / TPI`,
> `lead = P · starts`, and the 60-degree fundamental height `H = P · sqrt(3) / 2`.
> Pure arithmetic and 60-degree geometry, **zero table transcription** (the user
> supplies the TPI or the metric pitch; there is no thread-chart lookup).
>
> **The gap.** A concept-check against the 561 live tiles found no thread-pitch /
> threads-per-inch / lead tile. `roof-pitch` is the roofing rise-over-run slope;
> `flange-bolt-torque` reads a thread *series* (UNC/8UN) to pick a tensile-area
> constant but does not compute pitch or lead; `fastener-pullout`,
> `deck-ledger-fasteners`, and `screw-conveyor` are unrelated concepts. Reading a
> thread pitch off a TPI count (or a metric designation), and the lead of a
> multi-start thread, is everyday machinist / fabricator setup math, and Group G
> (Cross-Trade Utilities — now also the home, via `calc-fab.js`, of `sine-bar`,
> `bolt-circle`, and the fabrication-layout tiles) is the natural fit.
>
> **Count.** Measured against the live catalog of **561 tiles**, v38 reaches
> **562**. Distribution: **G +1**. The group count stays at 24.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry,
  and reviewer-signoff apply to the new tile.
- The v18/v21 tile contract applies from the first commit; a non-positive TPI
  (inch mode), a non-positive pitch (metric mode), a number of starts below 1,
  or a non-finite input returns `{ error }`.
- The v19/v22 citation discipline applies to the new `citations.js` entry; the
  tile is first-principles 60-degree thread geometry (public domain), cited as
  such, and defers the truncated working depth and the tap-drill size to the
  thread form and class.
- The tile id `thread-pitch` is kebab-case and was checked against all 561 live
  ids; it does not collide.
- **Module placement.** The tile lands in `calc-fab.js` (the Fabrication &
  Layout bench, the natural home alongside `sine-bar` and `bolt-circle`), using
  the headroom the v36 split created (the module moves from ~64% to ~66% of its
  16,000 B gzip cap, so the cap is unchanged). It keeps `group: "G"` (a tile's
  group letter is independent of its module, the spec-v28 precedent). The shared
  `tools-data.js` registry grows one row, within its cap.

## 2. New tile

Inputs / Output / Math / Citation / Edge cases / Tests.

### 2.1 `thread-pitch` — Thread Pitch and Lead — Group G

- **Inputs.** A thread standard (inch UN/UNC/UNF — enter threads-per-inch; or
  ISO metric — enter the pitch in mm), the TPI or the metric pitch, and the
  number of thread starts (default 1).
- **Output.** The pitch (in and mm), the threads-per-inch, the lead (axial
  advance per turn, in and mm), and the 60-degree sharp-V fundamental height
  (in and mm).
- **Math.** Unified (UN/UNC/UNF) inch threads and ISO metric threads share a
  60-degree included angle. Inch pitch `P = 1 / TPI`; metric pitch is the
  millimetre value directly, with `TPI = 25.4 / P_mm`. The lead is
  `lead = P · starts`. The fundamental sharp-V triangle height is
  `H = P · cos(30°) = P · sqrt(3) / 2`. First-principles geometry.
- **Citation.** Thread pitch, lead, and 60-degree form as in Machinery's
  Handbook (Industrial Press), by name; first-principles geometry, public
  domain. The truncated thread depth and the tap-drill size are thread-form- and
  class-specific and are not computed here.
- **Edge cases.** TPI ≤ 0 (inch mode) → error; pitch ≤ 0 (metric mode) → error;
  starts < 1 → error; a non-finite input → error. A note flags that the lead
  equals the pitch on a single-start thread and a multiple of it on a multi-start
  thread, and that the sharp-V height is the theoretical fundamental triangle,
  not the truncated working depth. Acme, buttress, and pipe-thread forms are out
  of scope (noted).
- **Worked example (hand-verified).** A 1/4-20 UNC thread (20 TPI):
  `P = 1 / 20 = ` **0.050000 in** = **1.2700 mm**; lead (1 start) = **0.050 in**;
  `H = 0.050 · sqrt(3)/2 = ` **0.0433013 in**. A metric M8×1.25 thread:
  `TPI = 25.4 / 1.25 = ` **20.32**, pitch = **0.0492126 in**. A 2-start, 8 TPI
  thread: pitch = **0.125 in**, lead = `0.125 · 2 = ` **0.250 in**.

## 3. Wiring and gates

Per the tile: `tools-data.js` (a `spec-v38` section after the group blocks,
`group: "G"`), `tile-meta.js` (`_TILES`), `citations.js`,
`test/fixtures/worked-examples.json`, `test/fixtures/compute-map.js`,
`scripts/related-tiles.mjs`, `data/search/aliases.json` (4 aliases), the
`app.js` `FAB_RENDERERS` declare list, the `// dims:` annotation, the
regenerated v14 corpus + tile-index, and a `test/unit/bounds-fuzzer.test.js`
row (pinning the 1/4-20 inch path both directions, the metric M8×1.25 path, the
2-start lead, and the error cases). Appended after the original Group G block,
so the block-scoped citation count is unaffected; the catalog-wide
citation-coverage lint covers the new entry.

## 4. As-landed verification

`npm run lint` (every gate, including the v31 `check-multiline-inputs` gate),
`npm test` (5,499 unit tests), `npm run build`, `npm run data:verify` (123),
the worked-examples runner (567 fixtures), the 320px shell audit (562 tile
shells / 588 URLs), and the full-catalog render-no-nan Chromium sweep
(`thread-pitch` verified clean) all green.

## 5. Roadmap position

This adds one more precision-layout primitive on the `calc-fab.js` headroom the
v36 split created. The remaining table-method machinist candidate
(`tap-drill-size`) stays on the roadmap and carries an explicit reviewed-table
requirement before it lands, because the tap-drill diameter for a given
thread/class is a chart lookup, not a hand-verifiable closed form. The standing
housekeeping items remain: `calc-mechanic.js` (95.6% of cap),
`calc-agriculture.js` (96.5%), `calc-electrical.js` (99.3%), and the
`tools-data.js` registry are near cap, and a per-tile module split is the
documented preferred remediation before the next tile lands in any of them.
