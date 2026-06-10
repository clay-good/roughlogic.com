# roughlogic.com Specification v29 — Pipe / Raceway Field-Layout Bench (3 New Tiles)

> **Implementation status: LANDED 2026-06-09 (stamps package 0.30.0).** v29 is
> a catalog-growth spec in the lineage of v15/v16/v17/v20/v23/v24/v25/v26/v27/v28.
> It inherits everything from spec.md through spec-v28.md and changes none of it.
>
> v29 lands the **first batch off the spec-v28 §7 long-term trades roadmap** —
> specifically §7.1 (electrician, deepen Group A) and §7.3 (pipefitter, deepen
> Group G), plus a Group B sibling for the existing thermal-expansion tile. It
> adds **3 new tiles** that deepen **existing** groups, so there is **no new
> group and no §1.1 maintainer-signoff gate** (that gate is specific to opening
> a new group, per spec-v28). **No new third-party dependencies, no new
> licenses, no telemetry, no AI, US standards only.**
>
> **The thesis.** v29 is deliberately small and high-confidence. The catalog's
> automated gates verify finiteness, dimensions, and contract totality but
> **not absolute formula correctness** (the standing catalog-correctness
> caveat). For safety-relevant trade math a wrong formula is both harmful and
> uncaught by any gate, so this batch is scoped to **first-principles thermal
> movement and field geometry** whose every worked example is hand-verifiable
> to the last digit, rather than code-table-transcription tiles (arc-flash PPE
> category, NEC Table 250.66 GEC sizing) where a transcription slip would be
> dangerous and silent. Those table-method tiles remain on the §7 roadmap for a
> reviewed change.
>
> **Count.** Measured against the live catalog of **549 tiles**, v29 reaches
> **552**. Distribution of new tiles: **B +1, A +1, G +1**. The group count
> stays at 24.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry,
  and reviewer-signoff apply to every new tile.
- The v18/v21 tile contract (totality, purity, domain honesty, magnitude
  safety, render faithfulness; no non-finite numeric field, ever) applies from
  the first commit; each new divisor/seam is guarded (v21 RC-1).
- The v19/v22 citation discipline applies to every new `citations.js` entry.
  ASME B31.1 / B31.9, NEC Article 352.44 (and Table 352.44), and ASTM C585 are
  cited **by name**; MSS SP-58 is cross-referenced.
- Tile ids below are kebab-case and were checked against all 549 live ids; none
  collide.
- **Module placement.** `calc-electrical.js` (99.3% of cap) and
  `calc-plumbing.js` (98.9%) are at their size budgets, so the three tiles land
  in a new `calc-pipefit.js` module with its own 5 KB cap. A tile's `group:`
  letter is independent of its module (the spec-v28 precedent): the three tiles
  are Groups B, A, and G but share one module.

## 2. New tiles

Each tile is Inputs / Output / Math / Citation / Edge cases / Tests.

### 2.1 `pipe-cold-spring` — Pipe Cold Spring (Cut-Short) — Group B

- **Inputs.** Material (sets coefficient α; carbon steel / copper / ductile
  iron / aluminum / PVC / CPVC / PEX, or a user-supplied α per °F), run length
  (ft), install temperature (°F), operating temperature (°F), cold-spring
  factor (%, default 50).
- **Output.** Free thermal growth ΔL (in), cold-spring gap / cut-short (in),
  residual movement (in), growth per 100 ft (in).
- **Math.** ΔL = α · (L·12) · |T_op − T_install|; gap = (factor/100)·ΔL;
  residual = ΔL − gap. Coefficients match
  `data/plumbing/thermal-expansion-coefficients.json` (the `pipe-expansion-loop`
  sibling) so the two tiles report identical free growth for the same material.
- **Citation.** ASME B31.1 Power Piping §119 / B31.9 Building Services Piping,
  by name; first-principles linear expansion.
- **Edge cases.** Run length ≤ 0 → error. Equal temps → 0 growth (finite, not
  an error). Cold-spring factor outside [0, 100] → error. The note carries the
  honest limitation: cold spring lowers the **hot reactions** but **not** the
  cyclic **stress range** (B31.1 §119.10 computes that on the full expansion;
  B31.1 credits two-thirds of the cold spring in the reaction). The piping
  engineer governs the flexibility analysis.
- **Worked example (hand-verified).** Carbon steel (α 6.5e-6), 100 ft, 50 °F →
  250 °F (ΔT 200): ΔL = 6.5e-6 · 1200 · 200 = **1.56 in**; 50% → **0.78 in**
  gap, **0.78 in** residual.

### 2.2 `raceway-expansion-fitting` — PVC Raceway Expansion Fitting — Group A

- **Inputs.** Conduit run length (ft), temperature range (°F), fitting rated
  travel (in, default 6); conduit coefficient defaults to the NEC Table 352.44
  PVC figure and is overridable.
- **Output.** Length change (in), per-100-ft change (in), fitting-required flag
  (≥ 0.25 in), fitting count.
- **Math.** ΔL = α · (L·12) · ΔT with α = 3.38e-5 in/in/°F (NEC Table 352.44,
  distinct from PVC pipe Sch-80 at 3.0e-5); requires a fitting where ΔL ≥
  0.25 in; fittings = ceil(ΔL / travel).
- **Citation.** NEC Article 352.44 and Table 352.44 (rigid PVC conduit), by
  name; first-principles linear expansion.
- **Edge cases.** Run length ≤ 0 → error; negative temperature range → error;
  below the 0.25 in threshold → no fitting required. The fitting piston is set
  per the manufacturer's temperature chart at the install temperature; the
  AHJ-adopted NEC edition governs.
- **Worked example (hand-verified).** 100 ft PVC, ΔT 100 °F: ΔL = 3.38e-5 ·
  1200 · 100 = **4.056 in** (Table 352.44 lists ≈ 4.1 in/100 ft at 100 °F);
  **1** fitting at 6 in travel.

### 2.3 `pipe-spacing-rack` — Insulated Pipe Rack Spacing — Group G

- **Inputs.** Pipe outside diameter (in), insulation thickness (in, default 0),
  clearance gap (in, default 1), number of pipes (default 2), rack/strut width
  (in, optional).
- **Output.** Insulated OD (in), center-to-center spacing (in), total bundle
  width (in), pipes that fit a given strut, remaining width (in).
- **Math.** Insulated OD = OD + 2·thickness; center-to-center = insulated OD +
  clearance; bundle width = n·(insulated OD) + (n−1)·clearance; pipes that fit =
  floor((rack width + clearance) / center-to-center).
- **Citation.** First-principles geometry; the insulated outside diameter
  follows the ASTM C585 nominal pipe-insulation dimensions, by name. The
  clearance allowance and the hanger / support span (MSS SP-58) are separate
  checks.
- **Edge cases.** Pipe OD ≤ 0 → error; insulation / clearance default to 0 / 1;
  pipe count floors to ≥ 1; a bundle wider than the rack flags how many fit and
  a negative remaining width.
- **Worked example (hand-verified).** 2.375 in OD + 1 in insulation = 4.375 in
  insulated OD; + 1 in clearance = **5.375 in** center-to-center; two pipes =
  **9.75 in** bundle; on a 24 in strut, 4 fit with 14.25 in remaining.

## 3. Wiring and gates

Per tile: `tools-data.js`, `tile-meta.js` (`_TILES`), `citations.js`,
`test/fixtures/worked-examples.json`, `test/fixtures/compute-map.js`,
`scripts/related-tiles.mjs`, `data/search/aliases.json` (3 each), `app.js`
`declare()`, the `// dims:` annotation, the regenerated v14 corpus +
tile-index, and a `test/unit/bounds-fuzzer.test.js` row. New-module wiring:
`app.js` declare block, `scripts/build.mjs` RUNTIME_FILES, `sw.js` precache,
and the `scripts/check-module-sizes.mjs` cap table. The Group-G block-scoped
citation count (=== 31) is unaffected — these tiles are appended in the
spec-v29 section after the original group blocks.

## 4. As-landed verification

`npm run lint` (every gate), `npm test` (5,478 unit tests), `npm run build`,
`npm run data:verify` (123), the worked-examples runner (557 fixtures), the
320px shell audit (552 tile shells / 578 URLs), the full Playwright integration
suite (1,221), and the axe-core a11y scan over the 3 new tiles (553) all green.

## 5. Roadmap position

This closes the first slice of spec-v28 §7.14's `v29 = §7.1–7.3` block (the
thermal-movement and geometry tiles). The remaining §7.1–7.3 candidates
(`cable-tray-ampacity`, `grounding-electrode-conductor`, `busway-sizing`,
`fixture-drainage-flow`, `grease-interceptor-gpm`, `storm-leader-sizing`,
`pipe-support-spacing`, `steam-trap-sizing`, …) stay on the roadmap; the
table-method and lookup-heavy ones carry an explicit hand-verification or
reviewed-table requirement before they land.
