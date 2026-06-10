# roughlogic.com Specification v30 — Metal / Air / Refrigerant Bench (3 New Tiles)

> **Implementation status: LANDED 2026-06-09 (stamps package 0.31.0).** v30 is
> a catalog-growth spec in the lineage of v15/v16/v17/v20/v23/v24/v25/v26/v27/v28/v29.
> It inherits everything from spec.md through spec-v29.md and changes none of it.
>
> v30 lands the spec-v28 §7.14 **`v30 = §7.4–7.6`** block — welder / metal
> fabricator (§7.4), sheet-metal / HVAC installer (§7.5), and refrigeration
> tech (§7.6). It adds **3 new tiles** that deepen **existing** groups, so
> there is **no new group and no §1.1 maintainer-signoff gate**. **No new
> third-party dependencies, no new licenses, no telemetry, no AI, US standards
> only.**
>
> **The thesis.** v30 continues the v29 discipline: the catalog's gates verify
> finiteness, dimensions, and contract totality but **not absolute formula
> correctness**, so this batch is scoped to math that is **hand-verifiable to
> the last digit** — the groove-weld shear case (the unambiguous AISC Table
> J2.5 `0.60·FEXX` line, the same resistance factors the v27 fillet tile uses),
> a pressure-drop sum, and a gauge-to-absolute pressure ratio. No code-table
> transcription (the §7.5 SMACNA gauge tables and the §7.6 refrigerant-property
> line-sizing tables stay on the roadmap for a reviewed change).
>
> **Count.** Measured against the live catalog of **552 tiles**, v30 reaches
> **555**. Distribution of new tiles: **E +1, C +2**. The group count stays at
> 24.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry,
  and reviewer-signoff apply to every new tile.
- The v18/v21 tile contract applies from the first commit; each new
  divisor/seam is guarded (v21 RC-1): the compression ratio guards a
  full-vacuum suction, and the weld capacity guards a zero throat/length.
- The v19/v22 citation discipline applies to every new `citations.js` entry.
  AWS D1.1, AISC 360 §J2 (Table J2.5), ACCA Manual D, SMACNA, and the ASHRAE
  Handbook (Refrigeration) are cited **by name**.
- Tile ids below are kebab-case and were checked against all 552 live ids;
  none collide.
- **Module placement.** `calc-construction.js` (93.9% of cap) and
  `calc-hvac.js` (95.9%) — the natural homes for the weld and HVAC tiles — are
  at their size budgets and flagged "plan a split", so the three tiles land in
  a new `calc-metalair.js` module with its own 6 KB cap. The `tile-meta.js`
  `_TILES` registry cap was bumped 7000 → 8000 (it grows one row per tile). A
  tile's `group:` letter is independent of its module (the v28/v29 precedent).

## 2. New tiles

Each tile is Inputs / Output / Math / Citation / Edge cases / Tests.

### 2.1 `groove-weld-strength` — Groove Weld Strength — Group E

- **Inputs.** Weld type (CJP / PJP), effective throat (in, PJP) or thinner part
  thickness (in, CJP), weld length (in), electrode (E60–E110), method
  (ASD / LRFD), applied load (lb, optional).
- **Output.** Effective throat (in), unit strength (lb/in), shear capacity
  (lb), utilization (when a load is entered).
- **Math.** Effective throat: CJP = thinner connected part thickness; PJP = the
  WPS effective throat. AISC 360 Table J2.5 weld-metal shear `Fnw = 0.60·FEXX`;
  ASD allowable `0.30·FEXX`, LRFD design `0.75·0.60·FEXX`; capacity =
  stress · throat · length. (The same resistance factors as the v27 fillet
  tile, applied to the groove throat rather than `0.707·leg`.)
- **Citation.** AWS D1.1 Structural Welding Code and AISC 360 §J2, by name;
  first-principles.
- **Edge cases.** Zero length / zero throat → error. CJP with no base thickness
  → error. The note flags that a CJP weld with matching filler develops the
  base metal in tension/compression normal to the axis (the shear capacity
  shown governs the shear case), and that the PJP throat is read off the
  qualified WPS. The WPS, weld inspector, and engineer of record govern.
- **Worked example (hand-verified).** PJP, effective throat 0.25 in, 6 in long,
  E70, LRFD: `0.75·0.60·70 = 31.5` ksi; `31.5 · 1000 · 0.25 · 6 = ` **47,250
  lb** (subject to floating-point; pinned at ±1 lb).

### 2.2 `duct-static-pressure-total` — Total External Static Pressure — Group C

- **Inputs.** A component list (label, pressure drop in in. w.c.) and the
  blower rated ESP (in. w.c.).
- **Output.** Total external static pressure (in. w.c.), remaining vs rating,
  within-rating pass/fail, the per-component breakdown.
- **Math.** TESP = sum of every external resistance the blower drives (filter,
  registers, grilles, wet coil, dampers, and the supply/return duct-run
  friction); remaining = rated − TESP; within rating when TESP ≤ rated.
- **Citation.** ACCA Manual D and the ASHRAE / SMACNA duct-design practice, by
  name; first-principles pressure accounting.
- **Edge cases.** Empty list → error; a negative component drop → error; a
  blank rating suppresses the verdict (not an error). Component drops are
  user-supplied; the blower fan table governs the delivered CFM at this static.
- **Worked example (hand-verified).** filter 0.10 + supply registers 0.03 +
  return grille 0.03 + wet coil 0.30 + supply duct 0.10 + return duct 0.08 =
  **0.64 in. w.c.** vs a 0.50 in. w.c. rating → **−0.14 over**, fails.

### 2.3 `compression-ratio-refrig` — Refrigeration Compression Ratio — Group C

- **Inputs.** Suction pressure (psig), discharge pressure (psig), atmospheric
  pressure (psia, default 14.696, adjustable for altitude).
- **Output.** Suction absolute (psia), discharge absolute (psia), compression
  ratio, high-ratio flag.
- **Math.** CR = absolute discharge / absolute suction =
  `(discharge_psig + atm) / (suction_psig + atm)`; high-ratio flag above ~10:1.
- **Citation.** ASHRAE Handbook (Refrigeration) compressor-performance
  fundamentals, by name; first-principles.
- **Edge cases.** A suction at or below a full vacuum (absolute ≤ 0) → error; a
  discharge below suction → error. The note reminds the user to use the site
  atmospheric pressure at altitude (not 14.7) and that ~10:1 is the single-
  stage concern threshold (discharge temperature, volumetric-efficiency loss).
  The compressor manufacturer's envelope governs.
- **Worked example (hand-verified).** suction 70 psig, discharge 260 psig, atm
  14.696: `274.696 / 84.696 = ` **3.243:1**.

## 3. Wiring and gates

Per tile: `tools-data.js`, `tile-meta.js` (`_TILES`), `citations.js`,
`test/fixtures/worked-examples.json`, `test/fixtures/compute-map.js`,
`scripts/related-tiles.mjs`, `data/search/aliases.json` (3 each), `app.js`
`declare()`, the `// dims:` annotation, the regenerated v14 corpus +
tile-index, and a `test/unit/bounds-fuzzer.test.js` row. New-module wiring:
`app.js` declare block, `scripts/build.mjs` RUNTIME_FILES, `sw.js` precache,
and the `scripts/check-module-sizes.mjs` cap table (plus the tile-meta cap
bump). All three tiles are appended in the spec-v30 section after the original
group blocks, so the block-scoped citation counts are unaffected.

## 4. As-landed verification

`npm run lint` (every gate), `npm test` (5,482 unit tests), `npm run build`,
`npm run data:verify` (123), the worked-examples runner (560 fixtures), the
320px shell audit (555 tile shells / 581 URLs), the full Playwright integration
suite (1,227), and the axe-core a11y scan over the 3 new tiles (556) all green.

## 5. Roadmap position

This closes the §7.4–7.6 block at one tile per trade. The remaining candidates
(`weld-distortion-shrinkage`, `preheat-interpass`, `duct-gauge-reinforcement`,
`register-throw-spread`, `refrigerant-line-sizing`, `refrigerant-charge-line-
length`, …) stay on the roadmap; the SMACNA-gauge and refrigerant-property
tiles carry an explicit reviewed-table requirement before they land. Next in
sequence is **v31 = §7.7–7.10** (the finishes trades — masonry, painting,
flooring, insulation — mostly Group E/C deepening).
