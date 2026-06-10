# roughlogic.com Specification v31 — Machinist Bench (1 New Tile)

> **Implementation status: LANDED 2026-06-10 (stamps package 0.32.0).** v31 is
> a catalog-growth spec in the lineage of v15/v16/v17/v20/v23/v24/v25/v26/v27/
> v28/v29/v30. It inherits everything from spec.md through spec-v30.md and
> changes none of it.
>
> v31 deepens the existing **Group K (Mechanic)** with one first-principles
> tile, the machinist's everyday speeds-and-feeds bench. It adds **1 new tile**
> to an **existing** group, so there is **no new group and no §1.1 maintainer-
> signoff gate**. **No new third-party dependencies, no new licenses, no
> telemetry, no AI, US standards only.**
>
> **The thesis.** v31 continues the v29/v30 discipline: the catalog's gates
> verify finiteness, dimensions, and contract totality but **not absolute
> formula correctness**, so this tile is scoped to math that is **hand-
> verifiable to the last digit** — the spindle-speed identity `RPM = 12·SFM/
> (π·D)` and the feed identity `IPM = RPM·flutes·chip-load`. **No code-table
> transcription:** the recommended surface speed (SFM) and chip load per tooth
> come from the tool manufacturer's chart and are **user-supplied** (the same
> treatment the catalog gives the conduit-bender deduct figures and the POH
> weight-and-balance limits), not bundled.
>
> **The gap.** A concept-check against the 555 live tiles found no
> cutting-speed / SFM / spindle-speed / feed-rate tile anywhere (`rpm` matched
> only `gear-mph-rpm` and `rcf-rpm`; no `sfm`, `feed-rate`, `tap-drill`, or
> `machining`). Spindle speed and feed are the single most-performed pieces of
> math a machinist or metal fabricator does at the machine, and Group K is the
> natural home (it already carries `hp-from-torque`, `volumetric-efficiency`,
> and `gear-mph-rpm`). The tile complements those without duplicating any.
>
> **Count.** Measured against the live catalog of **555 tiles**, v31 reaches
> **556**. Distribution: **K +1**. The group count stays at 24.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry,
  and reviewer-signoff apply to the new tile.
- The v18/v21 tile contract applies from the first commit; the new divisor seam
  is guarded (v21 RC-1): a zero or negative diameter and a zero surface speed
  both return `{ error }` rather than leaking a non-finite RPM.
- The v19/v22 citation discipline applies to the new `citations.js` entry.
  Machinery's Handbook (Industrial Press) is cited **by name** as the
  conventional reference for the speeds-and-feeds method; the math itself is
  first-principles cutting geometry.
- The tile id `cutting-speed-rpm` is kebab-case and was checked against all 555
  live ids; it does not collide.
- **Module placement.** The tile lands in `calc-mechanic.js`, the home of the
  other Group K tiles. The module was at 91.0% of its 18,500 B gzip cap; the
  cap is bumped to **19,500 B** with a dated comment (the sanctioned mechanism).
  No new module is created.

## 2. New tile

Inputs / Output / Math / Citation / Edge cases / Tests.

### 2.1 `cutting-speed-rpm` — Machining Speed and Feed — Group K

- **Inputs.** Surface speed (SFM), diameter (in — the cutter or drill for
  milling/drilling, the workpiece for turning), number of flutes/teeth
  (optional, for feed), chip load per tooth (in, optional, for feed).
- **Output.** Spindle speed (RPM); feed rate (IPM) when flutes and chip load
  are both entered; the notes carry the `12/π = 3.8197` constant and the
  milling-vs-turning diameter convention.
- **Math.** Surface speed relates to spindle speed by `SFM = π·D(in)·RPM/12`,
  so `RPM = 12·SFM/(π·D)`. Feed rate `IPM = RPM · flutes · chip-load-per-tooth`.
  Both are exact first-principles identities; the only judgment is the
  user-supplied SFM and chip load.
- **Citation.** First-principles cutting geometry; the speeds-and-feeds method
  as in Machinery's Handbook (Industrial Press), by name. SFM and chip load are
  user-supplied from the tool/material chart; the machine, fixturing, and
  rigidity govern the safe spindle speed.
- **Edge cases.** Zero/negative diameter → error; zero/negative surface speed →
  error; a non-finite input → error. The feed rate is suppressed (shown as a
  prompt, not an error) until both flutes and chip load are positive.
- **Worked example (hand-verified).** SFM 100, diameter 0.5 in: `RPM =
  12·100/(π·0.5) = 1200/1.5708 = ` **763.94 RPM**. With 2 flutes and 0.002
  in/tooth: feed `= 763.94·2·0.002 = ` **3.056 IPM** (subject to floating
  point; pinned at ±0.5 RPM / ±0.01 IPM).

## 3. Wiring and gates

Per the tile: `tools-data.js` (a `spec-v31` section after the group blocks,
`group: "K"`), `tile-meta.js` (`_TILES`), `citations.js`,
`test/fixtures/worked-examples.json`, `test/fixtures/compute-map.js`,
`scripts/related-tiles.mjs`, `data/search/aliases.json` (4 aliases), the
`app.js` `MECHANIC_RENDERERS` declare list, the `// dims:` annotation, the
regenerated v14 corpus + tile-index, a `test/unit/bounds-fuzzer.test.js` row,
`test/unit/calc-mechanic.test.js` compute tests, and the
`scripts/check-module-sizes.mjs` cap bump (18,500 → 19,500). Appended after the
original Group K block, so the block-scoped citation count (13) is unaffected;
the catalog-wide citation-coverage lint covers the new entry.

## 4. As-landed verification

`npm run lint` (every gate, including the v31 `check-multiline-inputs` gate),
`npm test` (5,489 unit tests), `npm run build`, `npm run data:verify` (123),
the worked-examples runner (561 fixtures), the 320px shell audit (556 tile
shells / 582 URLs), and the full Playwright integration suite all green.

## 5. Roadmap position

This opens the machinist bench at one tile. The remaining hand-verifiable
candidates (`tap-drill-size` from the 75%-thread `drill = major − pitch`
relation, `thread-pitch` lead/TPI, `bolt-circle` hole coordinates, `sine-bar`
setup height) stay on the roadmap; the table-method tiles (recommended-SFM and
feed-per-material charts) carry an explicit reviewed-table requirement before
they land, the same gate the v29/v30 SMACNA and refrigerant-property tables
carry.
