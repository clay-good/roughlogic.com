# roughlogic.com Specification v88 -- calc-electrical.js Cap-Relief Split (Solar PV / Battery-Storage / EV-Charging Bench)

> **Implementation status: CLOSED 2026-06-17 (package stamped 0.64.3, a patch;
> catalog holds at 634 tiles, 25 groups; modules 47 -> 48).** v88 inherits
> everything from spec.md through spec-v87.md and changes none of it. It is a
> platform-only / housekeeping spec in the same spirit as spec-v70 through
> spec-v87 (and spec-v10, spec-v36, spec-v39, spec-v42): it **adds no tiles,
> removes no tiles, and changes no calculator output** -- only the on-disk
> module layout changes.
>
> **The gap, and the evidence for it.** After the v79 power-quality split
> (spec-v79), `calc-electrical.js` had climbed back to the front of the
> module-cap watch-list and was, after the v87 agriculture split, the tightest
> renderer module in the repo at **94.7% of its 58 KB gzip cap (54943 B)** --
> the named next renderer-split candidate in the spec-v87 §5 roadmap. Restoring
> headroom there keeps Group A unblocked for the next evidence-driven electrical
> tile without another cap bump.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **solar-PV / battery-storage / EV-charging electrification bench**
-- five tiles that model the generation, storage, and EV-charging side of Group
A, distinct from the branch-circuit, conductor, motor, transformer, and
service-load tiles that stay behind -- is extracted from `calc-electrical.js`
into a new module `calc-solar.js` (`SOLAR_RENDERERS`). The bench is unified by
domain (the modern electrification side of the trade) rather than by spec era:
two tiles are spec-v2, three are spec-v15.

| Tile id | Name | Source |
|---|---|---|
| `pv-string-sizing` | Solar PV string sizing: cold-Voc / warm-Vmp series-count limits for an inverter MPPT window | spec-v2 |
| `battery-runtime` | Battery runtime: `Ah x V x DoD / load_W`, with the Peukert form `t = C / I^k` when k > 1 | spec-v2 |
| `pv-interconnection-busbar` | PV interconnection 120% busbar rule (NEC 705.12(B)(3)) and the supply-side 705.11 path | spec-v15 |
| `off-grid-battery` | Off-grid battery bank sizing per IEEE 1013 / 1561 (daily load, autonomy, DoD, round-trip efficiency) | spec-v15 |
| `ev-charger-load` | EV charger continuous-load and panel impact per NEC Article 625 (125% rule, panel headroom) | spec-v15 |

**All five KEEP `group: "A"`** -- a tile's group letter is independent of the
module that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 / spec-v42 /
spec-v70 .. spec-v87 precedent). Their ids, citations, worked examples,
dimensional annotations, and behavior are byte-for-byte unchanged. The cut is
clean: the bench reaches nothing outside the `./ui-fields.js` helpers it imports
(`DEBOUNCE_MS`, `debounce`, `makeNumber`, `makeSelect`, `makeCheckbox`,
`makeOutputLine`, `attachExampleButton`, `fmt`), the single `ampacityFromPhysics`
primitive from `./pure-math.js` (used only by `ev-charger-load`'s
first-principles conductor pick), and the per-module **`_finiteGuard`** (copied
verbatim, non-exported so it adds no v14 derivation-corpus row; the helper also
remains in `calc-electrical.js`, which still uses it for its ~30 other tiles, so
the split leaves **no cross-module import**). The `ev-charger-load` tile owns its
module-local `_EV_BREAKER_SIZES` and `_EV_CU_AWG` tables, which move with it (no
other tile reads them). The bench uses no `./limitation-banner.js` import and no
`./standard-sizes.js` import, so nothing else in `calc-electrical.js` is affected.
The remaining Group A tiles (the v1 core -- ohms-law, wire-ampacity, voltage-drop,
conduit-fill, box-fill, breaker-sizing, motor-fla, transformer-sizing,
three-phase, copper-resistance, egc-sizing -- the v2 service-load /
generator-sizing / voltage-imbalance / gfci-afci / lighting-density set, the v3
pulling-tension / cable-bend-radius / pf-correction / phase-balance /
multi-load-vd / lv-dc-drop / poe-budget bench, the v7 transformer-kva /
short-circuit / generator-motor-starting / service-load-standard set, the v8
panel-rebalance, the v9 arc-flash / motor-branch / grounding-electrode trio, the
remaining v15 voltage-drop-reactance / power-triangle / ambient-ampacity-adjust /
service-load-optional tiles, and the v23 lux-to-footcandle) stay in
`calc-electrical.js`.

## 2. As-landed sizes

- `calc-electrical.js`: **54943 B -> 48734 B** gzipped; cap lowered 58000 ->
  **52000** to lock in the freed space (now ~93.7% of the new cap).
- `calc-solar.js` (new): **~8.8 KB** gzipped (8843 B); cap **10500** (current +
  ~19% headroom). Lazy-loaded on first open of one of its tiles, so it is **not
  in the home-view first-paint payload** (the spec-v10 §H.2 budget is
  essentially unaffected; it ticks only from the `app.js` declare change, 38388 B
  -> 38581 B, 37.5% -> 37.7% of the 100 KB budget).

## 3. Wiring repointed (every reference gated)

`app.js` (the five ids move from the `ELECTRICAL_RENDERERS` declare to a new
`SOLAR_RENDERERS` declare for `./calc-solar.js`); `scripts/build.mjs` `FILES`;
`sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower the
source cap, add the new module's cap); `scripts/check-dimensions.mjs`
(`GRADUATED_MODULES` gains `calc-solar.js`, since the moved functions carry full
`// dims:` annotations); `test/fixtures/compute-map.js` (the five ids ->
`../../calc-solar.js`); `test/unit/bounds-fuzzer.test.js` (the five moved compute
fns + their five render fns repointed to a new `../../calc-solar.js` import);
`test/unit/calc-electrical-v2.test.js` (pv-string-sizing + battery-runtime
compute fns + examples repointed); `test/unit/calc-electrical-v15.test.js`
(pv-interconnection-busbar + off-grid-battery + ev-charger-load compute fns +
examples repointed); `test/unit/first-principles.test.js` and
`test/unit/cross-tile-invariants.test.js` (the pv-string-sizing / battery-runtime
imports repointed); and the regenerated v14 corpus (`docs/derivations.md` -- the
moved functions change file attribution; the tile-index is tile-id-keyed and
unchanged). `tools-data.js`, `tile-meta.js`, `citations.js`,
`test/fixtures/worked-examples.json`, `docs/audit-trail.md`, and
`scripts/related-tiles.mjs` reference tiles by **id** (group-keyed, not
module-keyed) and need **no change**. The README catalog-count gate
(`check-readme-counts`) agrees at **48 modules**; the wiring lint reports **48
renderer modules / 634 tile-id entries**.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates);
`npm test` (5,538 unit tests, unchanged -- the bounds-fuzzer and per-era electrical
rows now import the five moved functions from the new module); `npm run build`
(634 tile shells, 25 group shells, 661-URL sitemap; 866 dist files, +1 for the
new module); `npm run data:verify`; the full-catalog render-no-nan Chromium
sweep, the a11y gate, and the 320 px shell-mobile / responsive-stress sweeps on
both Chromium and WebKit (the five moved tiles render identically from the new
module). The moved tiles' pinned worked examples (pv-string-sizing 40 Voc / 33
Vmp / 0.30% coeff / -10 C / 45 C / 200-480-600 V -> 44.20 cold Voc, 31.02 warm Vmp,
13 max / 7 min series; battery-runtime 100 Ah / 12 V / 80% / 120 W -> 8.0 hr;
pv-interconnection-busbar 200 A main / 200 A busbar / 40 A PV opposite-end ->
240 A sum at the 240 A limit, PASS; off-grid-battery 2400 Wh/day / 3 days / 0.5
DoD / 12 V / 0.85 eta -> 1412 Ah nameplate; ev-charger-load 48 A / 200 A main /
130 A existing -> 60 A circuit, 60 A breaker, 6 AWG, 190 A new total, 10 A / 5%
headroom) re-verify to the digit.

## 5. Roadmap position

v88 is housekeeping, not growth. After it, `calc-electrical.js` has headroom for
the next Group A tile again. The standing module-cap watch continues on the
next-tightest registries and modules -- `citations.js` (~98.8% of cap) and
`tools-data.js` (~97.8%), the flat per-tile registries relieved by documented cap
bumps when a tile lands, and the next calc-module split candidates
`calc-construction.js`, `calc-cross.js`, and `calc-hvac.js` (now among the
tightest renderer modules at ~93-94% of cap). Further catalog growth should be
evidence-driven (a named gap a working tradesperson hits), not catalog-filling,
per the spec-v69 §5 guidance.
