# roughlogic.com Specification v41 — Machine Shop & Fab Bench, Batch 2 (2 New Tiles)

> **Implementation status: CLOSED 2026-06-11 (package stamped 0.40.0, a
> minor; catalog 572 -> 574, wiring lint 29 renderer modules / 574 tile-id
> entries).** v41 is a catalog-growth spec in the lineage of v15/v16/v17/v20/v23/
> v24/v25/v26/v27/v28/v29/v30/v31/v32/v33/v34/v35/v37/v38/v40. It inherits
> everything from spec.md through spec-v40.md and changes none of it.
>
> v41 is the second batch for the `calc-shop.js` Machine Shop & Fab bench stood
> up by spec-v40, drawing directly from that spec's own §5 roadmap. It adds **2
> new tiles to existing groups** — **Group K (Mechanic — Machinist sub-bench)
> +1**, **Group G (Cross-Trade Utilities) +1** — so there is **no new group, no
> new module, and no §1.1 maintainer-signoff gate**: both tiles live in the
> existing `calc-shop.js` module (the four platform wiring points are already in
> place from v40). **No new third-party dependencies, no new licenses, no
> telemetry, no AI, US standards only.**
>
> **The thesis.** v41 holds the v29–v40 discipline: math that is **hand-verifiable
> to the last digit**, with **zero table transcription** — the user supplies the
> diameter, the thread, the thickness; the tile does the geometry. Both tiles are
> first-principles geometry (public domain). `tap-drill-size` is explicit that the
> *named* letter / number drill is a chart lookup and reports only the nearest
> 1/64 in fraction — it computes the theoretical diameter and never hides a tap
> drill table.
>
> **The gap, and the deferrals.** spec-v40 §5 named four candidates for this
> batch. Two are clean first-principles tiles with no concept overlap and ship
> here:
>
> - **`tap-drill-size`** — the percent-of-full-thread closed form (`% = 76.98 ·
>   (D_major − D_drill) · TPI` for 60° threads) held over from spec-v38's roadmap.
> - **`rolled-blank`** — developed neutral-axis length to roll plate into a
>   cylinder or ring (`L = π · D_neutral`, k-factor-adjustable).
>
> Two are **deferred, each for a concept-overlap reason found on the live
> catalog**:
>
> - **`gas-cylinder-duration`** (shielding-gas runtime, `hours = ft³ / cfh`) —
>   **deferred.** The live catalog already carries **`o2-cylinder-duration`**
>   (Group V, EMS), which computes cylinder duration from pressure and flow. A
>   welding-gas duration is the same core concept (gas content ÷ flow = time) in a
>   different unit system; per the catalog's id-collision-free ≠ concept-free
>   discipline, it is held for a maintainer call rather than shipped as a near-dup
>   into a second domain.
> - **`weld-cost-per-foot`** (deposition / wire-cost / labor roll-up) —
>   **deferred** (as spec-v40 §5 already flagged): it overlaps **`weld-usage`**
>   (consumable weight and time by process) plus **`time-and-materials`**
>   (labor + material → billable) enough that a standalone tile is likely
>   redundant; better as a future enhancement to `weld-usage` if wanted.
>
> **Count.** Measured against the live catalog of **572 tiles**, v41 reaches
> **574**. Distribution: **K +1, G +1**. The group count stays at 24.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply to both new tiles.
- The v18/v21 tile contract applies from the first commit: any non-positive
  required dimension, a non-finite input, or an out-of-range k-factor returns
  `{ error }`; no tile throws, hangs, allocates without bound, or leaks a
  non-finite output field.
- The v19/v22 citation discipline applies to each new `citations.js` entry. Both
  tiles are first-principles geometry (public domain), cited as such with the
  governing-authority note (AHJ / licensed professional).
- Both tile ids are kebab-case and were checked against the 572 live ids; neither
  collides (`tap-drill-size`, `rolled-blank`) and neither duplicates an existing
  tile **by concept** (see the §5 concept-check, including the two deferrals).

## 2. The two tiles

### 2.1 `tap-drill-size` — Tap Drill Size (Group K, calc-shop.js)

For a 60° thread (Unified or ISO metric), the percent of full thread engaged by a
given hole is `% = 76.98 · (D_major − D_drill) · TPI`, where `TPI` is threads per
inch (metric: `25.4 / pitch_mm`) and all diameters are in inches. Solving for the
tap drill:

```
D_drill = D_major − % / (76.98 · TPI)
```

The 76.98 constant is `1 / 0.012990`, the published 60°-thread percent-of-thread
factor. Inputs: thread standard (inch → TPI; metric → pitch in mm), major
(nominal) diameter, and the target thread engagement (default 75%). Outputs: the
theoretical drill diameter (in and mm) and the **nearest 1/64 in fraction** with
its resulting percent. The tile is explicit that the *named* letter / number /
fraction drill is a chart lookup; it computes the exact diameter and gives only
the nearest fraction, advising the user to pick the closest drill at or just
above the theoretical size.

**Worked example (pinned).** 1/4-20 UNC, D_major 0.25 in, 75% → `D_drill =
0.25 − 75/(76.98·20) = 0.201286 in` (the standard #7 drill, 0.201 in); nearest
13/64 in = 0.203125 in = 72.17% thread. Cross-checks: M8×1.25 at 75% → 6.78 mm
(standard 6.8 mm); M6×1.0 at 75% → 5.03 mm (standard 5.0 mm).

### 2.2 `rolled-blank` — Rolled Plate Blank Length (Group G, calc-shop.js)

The developed flat length needed to roll plate into a cylinder or ring is the
circumference at the **neutral axis**:

```
L = π · D_neutral,  with neutral axis k·T from the inside face:
D_neutral = OD − 2T(1−k) = ID + 2kT
```

At the default `k = 0.5` (mid-thickness) this reduces to `L = π · (OD − T) =
π · (ID + T)`. Inputs: diameter reference (OD or ID), the diameter, plate
thickness `T`, and the neutral-axis k-factor (default 0.5, range 0–1). Outputs:
the developed blank length (in and mm) and the neutral-axis diameter. The notes
advise that tighter rolls / heavier plate move the neutral axis inward
(`k ≈ 0.33–0.45`) and that edge trim and any seam-weld gap are added separately.

**Worked example (pinned).** OD 12 in, T 0.25 in, k 0.5 → neutral 11.75 in,
`L = π · 11.75 = 36.913714 in`. Cross-check (ID 12 in, same T/k) → neutral
12.25 in, `L = π · 12.25 = 38.484510 in`.

## 3. Wiring (per tile)

Both tiles extend the existing `calc-shop.js` module, so the v40 platform wiring
(`scripts/build.mjs` FILES, `sw.js` SHELL_ASSETS, `scripts/check-module-sizes.mjs`
cap, the `app.js` `declare("./calc-shop.js", "SHOP_RENDERERS", […])` block) needs
only the two new ids appended — no new module points. Per tile: a `tools-data.js`
row (a `spec-v41` section after the v40 block, carrying its natural `group:`
letter K or G), `tile-meta.js` `_TILES`, `citations.js`,
`test/fixtures/worked-examples.json`, `test/fixtures/compute-map.js` (module path
`../../calc-shop.js`), `scripts/related-tiles.mjs` (`tap-drill-size` →
`thread-pitch` / `drill-point-depth` / `cutting-speed-rpm`; `rolled-blank` →
`bend-allowance` / `pipe-template-wrap` / `decimal-to-fraction`),
`data/search/aliases.json` (5 aliases each), the `// dims:` annotation, the
regenerated v14 corpus + tile-index, and a `test/unit/bounds-fuzzer.test.js` row
per tile pinning each worked example (both directions and unit systems where a
tile solves both) and the error seams. `calc-shop.js` sits at 83.7% of its 16 KB
gzip cap after this batch — no cap bump.

## 4. As-landed verification (gate plan)

On landing, the same green bar the recent tile specs cleared: `npm run lint`
(every gate, including the v31 `check-multiline-inputs` gate and the em-dash /
gzip-cap gates), `npm test` (the unit suite, +2 tests for the two tiles and their
error seams → 5,509 to 5,511), `npm run build`, the worked-examples runner
(+2 fixtures), the 320 px shell audit (574 tile shells), and the full-catalog
render-no-nan Chromium sweep plus the a11y and webkit/chromium responsive-stress
gates (both new tiles verified clean). The wiring lint reports **29 renderer
modules / 574 tile-id entries**.

## 5. Concept-check and roadmap position

Concept-checked against the 572 live tiles before implementing (id-collision-free
≠ concept-free):

- **`tap-drill-size`** — net-new. No tap-drill / percent-thread / thread-
  engagement tile exists; `thread-pitch` computes pitch/lead/height but no drill
  size; `drill-point-depth` is tip allowance, not tap drill. **Ships.**
- **`rolled-blank`** — net-new. `bend-allowance` is a single bend's arc length,
  `pipe-template-wrap` develops a cut ordinate template (not a blank length); no
  full-circumference developed-length tile exists. **Ships.**
- **`gas-cylinder-duration`** — concept-overlaps `o2-cylinder-duration` (cylinder
  duration from pressure + flow). **Deferred** (see header); a maintainer call.
- **`weld-cost-per-foot`** — overlaps `weld-usage` + `time-and-materials`.
  **Deferred** (see header).

v41 keeps the `calc-shop.js` bench growing at a conservative, concept-checked
cadence while the near-cap modules (`calc-electrical.js`, `calc-plumbing.js`,
`calc-agriculture.js`, `calc-mechanic.js`, `calc-hvac.js`, and the `tools-data.js`
registry) stay on the documented per-tile-split watch list. The next genuine
machinist / fabricator candidates remain the two deferred tiles above (pending the
maintainer's concept calls) and any further first-principles bench math that
survives a live concept-check.
