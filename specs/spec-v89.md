# roughlogic.com Specification v89 -- calc-hvac.js Cap-Relief Split (Refrigerant-Circuit Bench)

> **Implementation status: CLOSED 2026-06-17 (package stamped 0.64.4, a patch;
> catalog holds at 634 tiles, 25 groups; modules 48 -> 49).** v89 inherits
> everything from spec.md through spec-v88.md and changes none of it. It is a
> platform-only / housekeeping spec in the same spirit as spec-v70 through
> spec-v88 (and spec-v10, spec-v36, spec-v39, spec-v42): it **adds no tiles,
> removes no tiles, and changes no calculator output** -- only the on-disk
> module layout changes.
>
> **The gap, and the evidence for it.** After the v81 building-systems split
> (spec-v81), `calc-hvac.js` had climbed back to the front of the module-cap
> watch-list and was, after the v88 electrical split, the tightest renderer
> module in the repo at **94.3% of its 47 KB gzip cap (44302 B)** -- the named
> next renderer-split candidate in the spec-v88 §5 roadmap. Restoring headroom
> there keeps Group C unblocked for the next evidence-driven HVAC tile without
> another cap bump.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **refrigerant-circuit bench** -- five tiles that model the
refrigerant side of an HVAC system (P-T state, superheat/subcool diagnostics,
refrigerant comparison, and line-set charge), distinct from the load-calc,
duct, psychrometric, and rotating-equipment tiles that stay behind -- is
extracted from `calc-hvac.js` into a new module `calc-refrigerant.js`
(`REFRIGERANT_RENDERERS`). The bench is unified by domain (the refrigerant
circuit) rather than by spec era: four tiles are spec-v2, one is spec-v7.

| Tile id | Name | Source |
|---|---|---|
| `refrigerant-pt` | Refrigerant P-T saturation lookup with the engineering-practice target-superheat band | spec-v2 |
| `superheat-subcool` | Superheat/subcool diagnostic with fixed-orifice and TXV/EEV charge verdicts | spec-v2 |
| `compare-refrigerants` | Side-by-side P-T view at a chosen pressure or temperature with manufacturer attribution | spec-v2 |
| `refrigerant-charge` | Line-set refrigerant charge estimator (oz per foot per refrigerant per diameter) | spec-v2 |
| `refrigerant-charging` | Full suction/liquid superheat-and-subcool charging diagnostic with a psig/psia toggle | spec-v7 |

**All five KEEP `group: "C"`** -- a tile's group letter is independent of the
module that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 / spec-v42 /
spec-v70 .. spec-v88 precedent). Their ids, citations, worked examples,
dimensional annotations, and behavior are byte-for-byte unchanged. The cut is
clean: the bench reaches nothing outside the `./ui-fields.js` helpers it imports
(`DEBOUNCE_MS`, `debounce`, `makeNumber`, `makeSelect`, `makeOutputLine`,
`attachExampleButton`, `fmt`), the single `interpolateRefrigerant` primitive
from `./pure-math.js` (the P-T linear interpolation used by the three lookup
tiles), and the per-module **`_finiteGuard`** (copied verbatim, non-exported so
it adds no v14 derivation-corpus row; the helper also remains in
`calc-hvac.js`, which still uses it for its ~30 other tiles, so the split leaves
**no cross-module import**). The bench owns its module-local `REFRIGERANTS`
(manufacturer P-T pairs), `CHARGE_OZ_PER_FT` (line-set charge), the
`REFRIGERANT_OAT_PRESETS` chip table, and the `REFRIGERANT_PT_TABLES_v7`
psia-keyed table (with its module-local `_interpRefSatT` helper and the
`_v8shScDiagnostic` superheat/subcool band classifier) -- all read only by these
five tiles, so they move with the bench. The bench uses no
`./limitation-banner.js`, `./context-band.js`, or `./standard-sizes.js` import,
so nothing else in `calc-hvac.js` is affected. The remaining Group C tiles (the
Manual J load-calc pair, the duct-sizing / static-pressure / duct-friction /
duct-leakage / round-to-rect / equivalent-length duct bench, the SEER/EER /
balance-point / SHR / cfm-per-ton / combustion-air / approach-delta-t set, the
outdoor-air-mix / wet-bulb / insulation / evaporative-cooling psychrometric
tiles, the affinity-laws / belt-pulley / air-receiver / fan-motor-bhp /
cooling-tower / NPSHa rotating-equipment bench, the geothermal-loop /
baseboard-output / pipe-heat-loss / economizer / SHR-latent / hood-exhaust /
outdoor-air-ventilation set) stay in `calc-hvac.js`. The unused
`interpolateRefrigerant` import is dropped from `calc-hvac.js`.

## 2. As-landed sizes

- `calc-hvac.js`: **44302 B -> 38163 B** gzipped; cap lowered 47000 ->
  **41000** to lock in the freed space (now ~93.1% of the new cap).
- `calc-refrigerant.js` (new): **~8.2 KB** gzipped (8248 B); cap **9800**
  (current + ~19% headroom). Lazy-loaded on first open of one of its tiles, so
  it is **not in the home-view first-paint payload** (the spec-v10 §H.2 budget
  ticks only from the `app.js` declare change).

## 3. Wiring repointed (every reference gated)

`app.js` (the five ids move from the `HVAC_RENDERERS` declare to a new
`REFRIGERANT_RENDERERS` declare for `./calc-refrigerant.js`); `scripts/build.mjs`
`FILES`; `sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower
the source cap, add the new module's cap); `scripts/check-dimensions.mjs`
(`GRADUATED_MODULES` gains `calc-refrigerant.js`, since the moved functions carry
full `// dims:` annotations); `test/fixtures/compute-map.js` (the five ids ->
`../../calc-refrigerant.js`); `test/unit/bounds-fuzzer.test.js` (the five moved
compute fns + the four exported render fns repointed to a new
`../../calc-refrigerant.js` import); `test/unit/calc-hvac.test.js`,
`test/unit/calc-hvac-v2.test.js`, `test/unit/calc-hvac-v7.test.js`,
`test/unit/calc-v23-enhancements.test.js`, `test/unit/calc-v27.test.js`,
`test/unit/v8-phase-c-batch3.test.js`, `test/unit/v8-phase-c-batch5.test.js`,
`test/unit/first-principles.test.js`, and `test/unit/cross-tile-invariants.test.js`
(the relevant refrigerant compute fns + examples repointed); the source-text
wiring/citation checks (`test/unit/v8-renderer-wiring2.test.js`,
`v8-renderer-wiring4.test.js`, `v8-preset-chips-batch3.test.js`,
`v8-phase-b.test.js` -- the refrigerant renderer markup, the
`REFRIGERANT_OAT_PRESETS` chip group, and the ASHRAE 15-2022 citation now read
`calc-refrigerant.js`); and the regenerated v14 corpus (`docs/derivations.md` --
the moved functions change file attribution; the tile-index is tile-id-keyed and
unchanged). `tools-data.js`, `tile-meta.js`, `citations.js`,
`test/fixtures/worked-examples.json`, `docs/audit-trail.md`, and
`scripts/related-tiles.mjs` reference tiles by **id** (group-keyed, not
module-keyed) and need **no change**. The README catalog-count gate
(`check-readme-counts`) agrees at **49 modules**; the wiring lint reports **49
renderer modules / 634 tile-id entries**.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates);
`npm test` (5,539 unit tests -- one new REFRIGERANT_RENDERERS row; the
bounds-fuzzer and per-era HVAC rows now import the five moved functions from the
new module); `npm run build` (634 tile shells, 25 group shells, 661-URL sitemap;
867 dist files, +1 for the new module); `npm run data:verify`; the full-catalog
render-no-nan Chromium sweep, the a11y gate, and the 320 px shell-mobile /
responsive-stress sweeps on both Chromium and WebKit (the five moved tiles render
identically from the new module). The moved tiles' pinned worked examples
(refrigerant-pt R-410A 118 psig -> 40 F sat; superheat-subcool R-410A 118 psig /
50 F line -> 10 F superheat; refrigerant-charge R-410A 3/8 x 25 ft + 3/4 x 25 ft
-> 56.25 oz; compare-refrigerants R-410A vs R-32 at 100 psig -> pressure_to_temp;
refrigerant-charging R-410A 130/350 psig suction/liquid -> superheat/subcool
diagnostic) re-verify to the digit.

## 5. Roadmap position

v89 is housekeeping, not growth. After it, `calc-hvac.js` has headroom for the
next Group C tile again. The standing module-cap watch continues on the
next-tightest registries and modules -- `citations.js` (~98.8% of cap) and
`tools-data.js` (~97.8%), the flat per-tile registries relieved by documented cap
bumps when a tile lands, and the next calc-module split candidates
`calc-construction.js` and `calc-cross.js` (the tightest remaining renderer
modules at ~93% of cap). Further catalog growth should be evidence-driven (a
named gap a working tradesperson hits), not catalog-filling, per the spec-v69 §5
guidance.
