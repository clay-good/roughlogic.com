# roughlogic.com Specification v42 — calc-gas.js Module Split (Cap Relief)

> **Implementation status: CLOSED 2026-06-11 (package stamped 0.40.1, a
> patch; catalog unchanged at 574, modules 29 -> 30, wiring lint 30 renderer
> modules / 574 tile-id entries).** v42 is a platform-only cap-relief split in
> the lineage of spec-v36 (calc-cross -> calc-fab) and spec-v39 (calc-electrical
> conduit suite -> calc-fab). It inherits everything from spec.md through
> spec-v41.md and changes none of it.
>
> v42 **adds no tile, removes none, and changes no calculator output** (the
> catalog stays 574). It relocates the three self-contained fuel-gas tiles out of
> `calc-plumbing.js` — which had reached **98.9%** of its 50 KB gzip cap, the
> tightest module in the catalog and one citation reword from breaking the build —
> into a new thematic module `calc-gas.js` (the Fuel-Gas Piping bench). **No new
> third-party dependencies, no new licenses, no telemetry, no AI, US standards
> only.**
>
> **Why a split, why now.** The per-module size lint (spec-v10 §H.1) had been
> warning on `calc-plumbing.js` for several specs; the documented remediation is a
> per-tile split, not an indefinite cap bump. `calc-plumbing.js` is the
> founding-era Group B module with 39 tiles after this split; the fuel-gas tiles
> are the one cohesive, self-contained sub-bench that lifts out cleanly. Group B
> is literally "Plumbing **and Gas**", so the gas tiles form a crisp thematic
> module of their own.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. What moves

Three tiles, all keeping `group: "B"` (the group letter is independent of the
module — the v28/v36/v39 precedent — so a module may hold tiles of one group while
another module holds the rest of that group):

- **`gas-pipe-sizing`** — IFGC 2021 Table 402.4 / NFPA 54 sizing via the
  Spitzglass low-pressure formula `Q = 3550 · sqrt(d^5 · dP / (SG · L))`.
- **`gas-leak-rate`** — orifice leak estimate `Q = 3550 · c · A · sqrt(dP / SG)`.
- **`gas-pipe-pressure-drop`** — longhand Spitzglass pressure drop (the v20 B.3
  tile).

Their ids, citations, worked-example fixtures, and computed output are
**byte-for-byte unchanged**; only the module they live in changes.

### Shared symbols

- `GAS_PROPERTIES` (natural-gas / propane specific gravity + heating value) and
  the `spitzglassFlow` helper are used **only** by the gas tiles, so they move to
  `calc-gas.js`.
- `SCH40_ID_IN` (Schedule 40 steel inside diameters) is a small, stable reference
  table shared by `gas-pipe-sizing` **and** the water tiles (`friction-loss`,
  `pipe-volume`). It is **duplicated** in `calc-gas.js` so the gas module is
  self-contained, and the original stays in `calc-plumbing.js` for the water
  tiles. A nine-row constant table for steel pipe is the right thing to copy
  rather than cross-import.

## 2. Result

- `calc-plumbing.js`: ~49.5 KB → ~46.9 KB gz. The cap is lowered 50000 → 49000 B
  to lock in the relief (the v39 discipline: re-tighten the cap so the freed space
  cannot silently refill); now 95.7%.
- `calc-gas.js`: new, ~4.4 KB gz, cap 5500 B (80.2%).
- Module count **29 → 30**; catalog stays **574**; group count stays 24.
- Home-view payload moved 36,047 → 36,146 B (35.3% of the 100 KB budget) from the
  `app.js` declare change; `calc-gas.js` itself is lazy-loaded and is not in the
  first-paint payload.

## 3. Re-wiring (all gated)

Platform wiring for the new module: `app.js` (split the three ids out of the
`PLUMBING_RENDERERS` declare into a new `declare("./calc-gas.js",
"GAS_RENDERERS", […])`), `scripts/build.mjs` FILES, `sw.js` SHELL_ASSETS,
`scripts/check-module-sizes.mjs` (new `calc-gas.js` cap; lowered `calc-plumbing.js`
cap), and `test/fixtures/compute-map.js` (the three gas tiles' module path).

Test imports repointed to `calc-gas.js`: `bounds-fuzzer.test.js`,
`calc-plumbing.test.js`, `calc-plumbing-v2.test.js`, `calc-v20.test.js`,
`v8-phase-c-batch2.test.js`, and `cross-tile-invariants.test.js` (the compute /
render / `spitzglassFlow` imports), plus the two **source-text-assertion** tests
that read the gas citation / renderer code as text — `v8-phase-b.test.js` (the
IFGC citation) and `v8-renderer-wiring2.test.js` (the dP_achieved renderer row) —
repointed to read `calc-gas.js`. The v14 corpus is regenerated for the moved
functions' file attribution.

`tools-data.js`, `tile-meta.js`, `citations.js`, and the worked-example fixtures
reference tiles by id and are group-keyed, and the group letter did not change, so
they need no edit (the v39 precedent).

## 4. As-landed verification (gate plan)

The same green bar the recent specs cleared: `npm run lint` (every gate; the
wiring lint must report **30 renderer modules / 574 tile-id entries**; the
per-module size lint green after a build), `npm test` (the unit suite, unchanged
at 5,511), `npm run build` (574 tile + 24 group shells, 600-URL sitemap), `npm run
data:verify`, the 320 px shell audit, and a browser smoke-test of all three moved
tiles confirming identical output from the new module (NG 100k BTU / 50 ft → 97.1
ft³/hr at 1/2 in, 0.241 in WC achieved; 0.05 in orifice at 0.25 psi → 3.15
ft³/hr; 1000 CFH / 1.049 in / 100 ft → 16.73 in w.c.) with zero console errors.

## 5. Roadmap position

`calc-plumbing.js` remains a large Group B module at 95.7% of its (now tighter)
cap; it has no further clean self-contained sub-bench to lift out, so the next
relief there, if needed, is a more involved water-vs-drainage split. The standing
module-cap watch list otherwise carries `calc-mechanic.js`, `calc-water.js`,
`calc-agriculture.js`, `calc-hvac.js`, `calc-electrical.js`, and the `tools-data.js`
registry. Catalog growth can resume into the headroom modules (`calc-fab.js`,
`calc-shop.js`, `calc-gas.js`, and the rest) per the spec-v41 §5 concept-check
discipline.
