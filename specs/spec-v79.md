# roughlogic.com Specification v79 -- calc-electrical.js Cap-Relief Split (Advanced AC Analysis Bench)

> **Implementation status: CLOSED 2026-06-16 (package stamped 0.63.10, a patch;
> catalog holds at 624 tiles, 25 groups; modules 41 -> 42).** v79 inherits
> everything from spec.md through spec-v78.md and changes none of it. It is a
> platform-only / housekeeping spec in the same spirit as spec-v70 through
> spec-v78 (and spec-v10, spec-v36, spec-v39, spec-v42): it **adds no tiles,
> removes no tiles, and changes no calculator output** -- only the on-disk module
> layout changes.
>
> **The gap, and the evidence for it.** After v78 relieved `calc-plumbing.js`, the
> standing module-cap watch (spec-v78 §5) named `calc-electrical.js` as the next
> calc-module split candidate. It was the tightest remaining calculator module in
> the repo at **95.1% of its 62 KB gzip cap (58989 B)**. Restoring headroom is
> what keeps the next Group A electrical tile unblocked without another cap bump.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **spec-v20 §A advanced AC analysis trio** -- three contiguous,
self-contained tiles that sit at the very end of the source file -- is extracted
from `calc-electrical.js` into a new module `calc-powerquality.js`
(`POWERQUALITY_RENDERERS`). The unifying theme is distinct from the basic Group A
core (Ohm's law, ampacity, conduit fill, breaker/service sizing): these three are
**how a real three-phase feeder behaves under demanding conditions** -- paralleled
sets, harmonic loading, and motor inrush.

| Tile id | Name | Source |
|---|---|---|
| `parallel-conductor-derate` | Parallel Conductor Ampacity (`I_total = I_single x N x F_ccc x F_ambient`; the NEC 310.15(C)(1) more-than-three current-carrying-conductor adjustment and the 1/0-AWG-minimum parallel rule per NEC 310.10) | spec-v20 A.1 |
| `neutral-current-3ph` | Three-Phase Neutral Current (`I_N = sqrt(Ia^2 + Ib^2 + Ic^2 - Ia*Ib - Ib*Ic - Ic*Ia)`, the phasor sum of three 120-degree-displaced currents, plus the harmonic-dominated case where triplens make the neutral a current-carrying conductor per NEC 310.15(E) / IEEE 519) | spec-v20 A.2 |
| `motor-vd-starting` | Motor Starting Voltage Dip (`V_drop = factor x K x LRC x L / cmils`; terminal voltage and % dip against a contactor-dropout limit, distinct from the steady-state voltage-drop tile) | spec-v20 A.3 |

**All three KEEP `group: "A"`** -- a tile's group letter is independent of the
module that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 / spec-v42 /
spec-v70 .. spec-v78 precedent). Their ids, citations, worked examples,
dimensional annotations, and behavior are byte-for-byte unchanged. The cut is
clean: the bench owns its local helper tables (`PARALLEL_PERMITTED`,
`PARALLEL_NOT_PERMITTED`, `cccAdjustmentFactor`) and reaches nothing outside its
**own scoped `./ui-fields.js` import block** (`DEBOUNCE_MS`, `debounce`,
`makeNumber`, `makeSelect`, `makeOutputLine`, `attachExampleButton`, `fmt`).
Unlike the v72/v76/v77/v78 benches, the three moved compute functions do **not**
use the per-module `_finiteGuard` (each does its own positive/finite guards
inline), so -- as with the v74 velocity and v75 treatment benches -- no guard
helper is copied into the new module. The remaining Group A electrical tiles (the
40-tile core in `calc-electrical.js`) are unchanged.

> **Note on pre-existing dead code (carried verbatim).** `PARALLEL_PERMITTED` is
> defined in the bench but never read (only `PARALLEL_NOT_PERMITTED` gates the
> parallel rule). This predates v79; per the verbatim-move discipline it travels
> with the bench unchanged rather than being pruned in a layout-only spec.

## 2. As-landed sizes

- `calc-electrical.js`: **58989 B -> 54943 B** gzipped; cap lowered 62000 ->
  **58000** to lock in the freed space (now ~94.7% of the new cap).
- `calc-powerquality.js` (new): **~5.2 KB** (5245 B) gzipped; cap **6500** (current
  + headroom). Lazy-loaded on first open of one of its tiles, so it is **not in the
  home-view first-paint payload** (the spec-v10 §H.2 budget is unaffected; it
  ticks only from the `app.js` declare change).

## 3. Wiring repointed (every reference gated)

`app.js` (the three ids move from the `ELECTRICAL_RENDERERS` declare to a new
`POWERQUALITY_RENDERERS` declare for `./calc-powerquality.js`); `scripts/build.mjs`
`FILES`; `sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower
the source cap, add the new module's cap); `scripts/check-dimensions.mjs`
(`GRADUATED_MODULES` gains `calc-powerquality.js`, since the moved functions carry
full dimensional annotations); `test/fixtures/compute-map.js` (the three ids ->
`../../calc-powerquality.js`); `test/unit/bounds-fuzzer.test.js` (the three focused
import lines for the moved compute fns repointed, and the v20 A.1/A.2/A.3 pin
test's label retitled to `calc-powerquality`); and the regenerated v14 corpus
(`docs/derivations.md` -- the moved functions change file attribution; the
tile-index is tile-id-keyed and unchanged). `tools-data.js`, `tile-meta.js`,
`citations.js`, `test/fixtures/worked-examples.json`, `docs/audit-trail.md`, and
`scripts/related-tiles.mjs` reference tiles by **id** (group-keyed, not
module-keyed) and need **no change**. No import is orphaned in `calc-electrical.js`
(the bench used only the shared unprefixed `ui-fields.js` block, which the
remaining 40 tiles still use). The README catalog-count gate
(`check-readme-counts`) agrees at **42 modules**; the wiring lint reports **42
renderer modules / 624 tile-id entries**.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates);
`npm test` (5,534 unit tests, unchanged -- the bounds-fuzzer rows now import the
three moved functions from the new module); `npm run build` (624 tile shells, 25
group shells, regenerated sitemap); `npm run data:verify`; the full-catalog
render-no-nan Chromium sweep, the a11y gate, and the 320 px shell-mobile /
responsive-stress sweeps on both Chromium and WebKit (the three moved tiles render
identically from the new module). The moved tiles' pinned worked examples
(parallel-conductor-derate 200 A single / 3 sets / 3/0 -> 600 A total, factor
1.00; neutral-current-3ph 100/80/60 A -> ~34.64 A neutral; motor-vd-starting 480 V
/ 250 ft / 250 kcmil / 180 A LRC three-phase, K=12.9 -> ~4.02 V drop, ~0.84% dip,
PASS) re-verify to the digit.

## 5. Roadmap position

v79 is housekeeping, not growth. After it, `calc-electrical.js` has headroom for
the next Group A tile again. The standing module-cap watch continues on the
next-tightest registries and modules -- `tile-meta.js`, `citations.js`, and
`tools-data.js` (the flat per-tile registries, relieved by documented cap bumps
when a tile lands) and the next calc-module split candidates `calc-construction.js`,
`calc-hvac.js`, and `calc-fire.js` (now among the tightest renderer modules at
~95% of cap). Further catalog growth should be evidence-driven (a named gap a
working tradesperson hits), not catalog-filling, per the spec-v69 §5 guidance.
