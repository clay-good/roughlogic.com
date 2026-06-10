# roughlogic.com Specification v37 — Sine-Bar Bench (1 New Tile)

> **Implementation status: LANDED 2026-06-10 (stamps package 0.37.0).** v37 is a
> catalog-growth spec in the lineage of v15/v16/v17/v20/v23/v24/v25/v26/v27/v28/
> v29/v30/v31/v32/v33/v34/v35. It inherits everything from spec.md through
> spec-v36.md and changes none of it.
>
> v37 deepens the existing **Group G (Cross-Trade Utilities)** with one
> first-principles trigonometry tile. It adds **1 new tile** to an **existing**
> group, so there is **no new group and no §1.1 maintainer-signoff gate**. **No
> new third-party dependencies, no new licenses, no telemetry, no AI, US
> standards only.**
>
> **The thesis.** v37 continues the v29–v35 discipline: math that is **hand-
> verifiable to the last digit** — the sine-bar identity `sin(theta) = H / L`
> and its two rearrangements. Pure trigonometry, **zero table transcription**.
>
> **The gap.** A concept-check against the 560 live tiles found no sine-bar /
> sine-plate / gauge-block-angle tile. The catalog's other "angle" tiles are
> unrelated concepts: `power-triangle` (AC phasor), `sling-angle` (rigging load
> multiplier), `ladder-angle` (the 4:1 placement rule), and `wind-triangle` (the
> E6B wind-correction angle). Setting a precise angle with a sine bar and a
> gauge-block stack is the everyday precision-angle method on a machinist's or
> inspector's surface plate, and Group G (Cross-Trade Utilities — now also the
> home, via `calc-fab.js`, of the `bolt-circle` and fabrication-layout tiles) is
> the natural fit.
>
> **Count.** Measured against the live catalog of **560 tiles**, v37 reaches
> **561**. Distribution: **G +1**. The group count stays at 24.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry,
  and reviewer-signoff apply to the new tile.
- The v18/v21 tile contract applies from the first commit; a non-positive bar
  length, a stack height greater than the bar length (`arcsin` domain), a target
  angle outside 0..90 deg, or a non-finite input returns `{ error }`.
- The v19/v22 citation discipline applies to the new `citations.js` entry; the
  tile is first-principles trigonometry (public domain), cited as such, and
  defers the achievable accuracy to the gauge-block grade and surface-plate
  flatness.
- The tile id `sine-bar` is kebab-case and was checked against all 560 live ids;
  it does not collide.
- **Module placement.** The tile lands in `calc-fab.js` (the Fabrication &
  Layout bench split out of `calc-cross.js` at v36). It is the first net-new
  tile in that module since the split; the module moves from ~62% to ~64% of its
  16,000 B gzip cap, so the cap is unchanged. The tile keeps `group: "G"` (a
  tile's group letter is independent of its module, the spec-v28 precedent), so
  it joins the cross-trade group alongside `bolt-circle`. The shared
  `tools-data.js` registry grows one row, within its cap.

## 2. New tile

Inputs / Output / Math / Citation / Edge cases / Tests.

### 2.1 `sine-bar` — Sine Bar Angle Setup — Group G

- **Inputs.** A solve-for mode (angle from a stack, or stack for a target
  angle), the sine bar length (the center-to-center roll distance, commonly 5 in
  or 10 in; default 5), the gauge-block stack height, and the target angle.
- **Output.** The set angle (deg) and the gauge-block stack height (in) — one is
  echoed from the input and the other is computed, depending on the mode.
- **Math.** A sine bar of length `L` set on a stack of height `H` tilts so that
  `sin(theta) = H / L`. Solve angle: `theta = arcsin(H / L)`. Solve stack:
  `H = L · sin(theta)`. First-principles right-triangle trigonometry.
- **Citation.** Sine bar / sine plate angle setup; the standard precision-angle
  relation as in Machinery's Handbook (Industrial Press), by name;
  first-principles trigonometry, public domain. The gauge-block grade and
  surface-plate flatness govern the achievable accuracy.
- **Edge cases.** Bar length ≤ 0 → error; in angle mode a stack height greater
  than the bar length (`sin theta` would exceed 1) → error, and a negative stack
  → error; in stack mode a target angle outside 0..90 deg → error; a non-finite
  input → error. A note flags that above ~45 deg the stack height changes little
  per degree, so a sine plate or angle blocks are preferred for steep setups.
- **Worked example (hand-verified).** A 5 in sine bar on a 2.5 in stack:
  `theta = arcsin(2.5 / 5) = arcsin(0.5) = ` **30.0000 deg**. Reversing, a target
  of 30 deg on a 5 in bar: `H = 5 · sin(30°) = ` **2.5000 in**. A 10 in bar at
  10 deg: `H = 10 · sin(10°) = ` **1.7365 in**.

## 3. Wiring and gates

Per the tile: `tools-data.js` (a `spec-v37` section after the group blocks,
`group: "G"`), `tile-meta.js` (`_TILES`), `citations.js`,
`test/fixtures/worked-examples.json`, `test/fixtures/compute-map.js`,
`scripts/related-tiles.mjs`, `data/search/aliases.json` (4 aliases), the
`app.js` `FAB_RENDERERS` declare list, the `// dims:` annotation, the
regenerated v14 corpus + tile-index, and a `test/unit/bounds-fuzzer.test.js`
row (pinning the 30 deg / 2.5 in pair both ways, the 10 in / 10 deg path, the
stack-equals-length 90 deg case, and the error cases). Appended after the
original Group G block, so the block-scoped citation count is unaffected; the
catalog-wide citation-coverage lint covers the new entry.

## 4. As-landed verification

`npm run lint` (every gate, including the v31 `check-multiline-inputs` gate),
`npm test` (5,498 unit tests), `npm run build`, `npm run data:verify` (123),
the worked-examples runner (566 fixtures), the 320px shell audit (561 tile
shells / 587 URLs), and the full-catalog render-no-nan Chromium sweep
(`sine-bar` verified clean) all green.

## 5. Roadmap position

This adds one precision-layout primitive and is the first tile to use the
`calc-fab.js` headroom the v36 split created. The remaining hand-verifiable
machinist / layout candidates (`thread-pitch`, `tap-drill-size`) stay on the
roadmap; the table-method tiles carry an explicit reviewed-table requirement
before they land. The standing housekeeping items remain: `calc-mechanic.js`
(95.6% of cap), `calc-agriculture.js` (96.5%), and the `tools-data.js` registry
are near cap, and a per-tile module split is the documented preferred
remediation before the next tile lands in any of them.
