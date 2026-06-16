# roughlogic.com Specification v81 -- calc-hvac.js Cap-Relief Split (Building-Systems HVAC Engineering Bench)

> **Implementation status: CLOSED 2026-06-16 (package stamped 0.63.12, a patch;
> catalog holds at 624 tiles, 25 groups; modules 43 -> 44).** v81 inherits
> everything from spec.md through spec-v80.md and changes none of it. It is a
> platform-only / housekeeping spec in the same spirit as spec-v70 through
> spec-v80 (and spec-v10, spec-v36, spec-v39, spec-v42): it **adds no tiles,
> removes no tiles, and changes no calculator output** -- only the on-disk module
> layout changes.
>
> **The gap, and the evidence for it.** After v80 relieved `calc-construction.js`, the
> standing module-cap watch (spec-v80 §5) named `calc-hvac.js` as the next
> calc-module split candidate. It was the tightest remaining calculator module in
> the repo at **94.9% of its 60 KB gzip cap (56914 B)**. Restoring headroom is
> what keeps the next Group C HVAC tile unblocked without another cap bump.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **spec-v16 "Group C expansion" batch** -- seven contiguous,
self-contained tiles that sit together in the source file (after the v9
outdoor-air / hood-exhaust / SHR-latent block and before the v20 economizer
block) -- is extracted from `calc-hvac.js` into a new module
`calc-hvacsystems.js` (`HVACSYSTEMS_RENDERERS`). The unifying theme is distinct
from the residential split-system core that stays behind (Manual J cooling and
heating loads, duct sizing, refrigerant P-T / superheat / subcool service): these
seven are **engineered building-systems calcs** -- central-plant chiller tonnage
and heat-exchanger sizing, hydronic boiler-distribution pipe sizing, compressor
short-cycle protection, humidification, filtration energy, and ventilation rate.

| Tile id | Name | Source |
|---|---|---|
| `chiller-tons` | Chiller tonnage from delta-T and GPM (`Q = GPM*500*dT` for water, with 30/50% propylene-glycol factors; required flow at a nameplate tonnage), per ASHRAE Fundamentals 2021 Ch. 31 | spec-v16 C.3 |
| `hx-lmtd-ntu` | Heat-exchanger log-mean temperature difference, heat duty, required UA, effectiveness, NTU, and capacity-rate ratio for counter-flow or parallel-flow, per the TEMA standards / Incropera | spec-v16 C.5 |
| `air-changes-hour` | Air changes per hour (`ACH = CFM*60/volume`), net delivered ACH and pressurization airflow from unequal supply/return, against ASHRAE 62.1 / 170 occupancy bands | spec-v16 C.9 |
| `boiler-pipe-sizing` | Hydronic distribution pipe sizing (`GPM = Q/(500*dT)`, the smallest copper/steel/PEX size at or below the velocity ceiling, velocity, Hazen-Williams head per 100 ft, pump head), per ASHRAE Systems and Equipment 2020 Ch. 13 | spec-v16 C.6 |
| `compressor-short-cycle` | Compressor short-cycle protection (cycles per hour from the ASHRAE/AHRI part-load cycling parabola, on/off time, minimum oil-return runtime and pressure-equalization delay), per Copeland AE Bulletin 17-1226 | spec-v16 C.8 |
| `humidifier-capacity` | Humidifier capacity (moisture addition lb/hr and gal/day, latent load) from supply CFM and the entering-to-target RH rise with altitude-corrected humidity ratios, per ASHRAE Fundamentals 2021 Ch. 1 | spec-v16 C.10 |
| `filter-pressure-drop` | Filter pressure drop by MERV / HEPA class (velocity-scaled, override-able cut-sheet defaults), the fan brake-HP at each, and the annual fan-energy / loading penalty over a clean filter, per ASHRAE 52.2-2017 | spec-v16 C.7 |

**All seven KEEP `group: "C"`** -- a tile's group letter is independent of the
module that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 / spec-v42 /
spec-v70 .. spec-v80 precedent). Their ids, citations, worked examples,
dimensional annotations, and behavior are byte-for-byte unchanged. The cut is
clean: the bench reaches nothing outside its **own scoped `./ui-fields.js` import
block** (`DEBOUNCE_MS`, `debounce`, `makeNumber`, `makeSelect`,
`makeOutputLine`, `attachExampleButton`, `fmt`), one **`./pure-math.js`** import
(`hazenWilliamsFrictionLoss`, used by `boiler-pipe-sizing`), the per-module
**`_finiteGuard`**, and two shared **spec-v9 psychrometric helpers**
(`_v9_satPressure_kPa`, `_v9_pressureAtAltitude_kPa`, used by
`humidifier-capacity`). The `_finiteGuard` and the two v9 helpers are copied
verbatim into the new module (non-exported, so they add no v14 derivation-corpus
row); the v9 helpers also remain in `calc-hvac.js`, which still uses them for its
v9 outdoor-air / wet-bulb tiles, so the split leaves **no cross-module import**.
The block also carries its own module-local `_v16h_*` helpers (`_v16h_readNum`,
`_v16h_HX_FLUIDS`, `_v16h_pipeVelocityFps`, `_v16h_humidityRatioFromRH`), which
travel with it unchanged. The moved compute functions are verbatim, along with
their exported worked-example constants and the exported lookup tables
(`CHILLER_FLUID_FACTORS`, `ACH_TARGET_BANDS`, `BOILER_PIPE_TABLE`,
`BOILER_PIPE_VMAX`, `COMPRESSOR_CYCLE_LIMITS`, `FILTER_DP_TABLE`). The remaining
Group C HVAC tiles (the v0 residential core, the v2/v3 benches, the v7/v8/v9
extensions, and the v20/v27 tiles) stay in `calc-hvac.js`; the spec-v23 velocity
bench is already in `calc-velocity.js` (spec-v74).

## 2. As-landed sizes

- `calc-hvac.js`: **56914 B -> 44005 B** gzipped; cap lowered 60000 ->
  **47000** to lock in the freed space (now ~93.6% of the new cap).
- `calc-hvacsystems.js` (new): **~14.7 KB** (14683 B) gzipped; cap **16500**
  (current + headroom). Lazy-loaded on first open of one of its tiles, so it is
  **not in the home-view first-paint payload** (the spec-v10 §H.2 budget is
  unaffected; it ticks only from the `app.js` declare change).

## 3. Wiring repointed (every reference gated)

`app.js` (the seven ids move from the `HVAC_RENDERERS` declare to a new
`HVACSYSTEMS_RENDERERS` declare for `./calc-hvacsystems.js`); `scripts/build.mjs`
`FILES`; `sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower
the source cap, add the new module's cap); `scripts/check-dimensions.mjs`
(`GRADUATED_MODULES` gains `calc-hvacsystems.js`, since the moved functions carry
full dimensional annotations); `test/fixtures/compute-map.js` (the seven ids ->
`../../calc-hvacsystems.js`); `test/unit/bounds-fuzzer.test.js` (the focused
import line for the seven moved compute fns repointed to a new
`../../calc-hvacsystems.js` import); `test/unit/calc-hvac-v16.test.js` (the whole
import block -- compute fns, worked-example constants, lookup tables, and the
renderer registry -- repointed to `../../calc-hvacsystems.js`, with the registry
import renamed `HVAC_RENDERERS` -> `HVACSYSTEMS_RENDERERS`); and the regenerated
v14 corpus (`docs/derivations.md` -- the moved functions change file attribution;
the tile-index is tile-id-keyed and unchanged). `tools-data.js`, `tile-meta.js`,
`citations.js`, `test/fixtures/worked-examples.json`, `docs/audit-trail.md`, and
`scripts/related-tiles.mjs` reference tiles by **id** (group-keyed, not
module-keyed) and need **no change**. No import is orphaned in `calc-hvac.js`
(the bench used only the shared `ui-fields.js` imports, `hazenWilliamsFrictionLoss`,
`_finiteGuard`, and the two v9 helpers -- all of which the remaining tiles still
use). The README catalog-count gate (`check-readme-counts`) agrees at **44
modules**; the wiring lint reports **44 renderer modules / 624 tile-id entries**.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates);
`npm test` (5,534 unit tests, unchanged -- the bounds-fuzzer and calc-hvac-v16
rows now import the seven moved functions from the new module); `npm run build`
(624 tile shells, 25 group shells, regenerated sitemap); `npm run data:verify`;
the full-catalog render-no-nan Chromium sweep, the a11y gate, and the 320 px
shell-mobile / responsive-stress sweeps on both Chromium and WebKit (the seven
moved tiles render identically from the new module). The moved tiles' pinned
worked examples (chiller-tons 240 gpm / 10 F water -> 100 tons; hx-lmtd-ntu the
counter-flow Incropera example; air-changes-hour 1000 CFM / 10,000 ft^3 -> 6.0
ACH; boiler-pipe-sizing 200 kBTU / 20 F -> 20 gpm and the velocity-limited size;
compressor-short-cycle the single-stage 50% part-load parabola;
humidifier-capacity 1000 CFM 20->40% RH; filter-pressure-drop the MERV 13
example) re-verify to the digit.

## 5. Roadmap position

v81 is housekeeping, not growth. After it, `calc-hvac.js` has headroom for the
next Group C tile again. The standing module-cap watch continues on the
next-tightest registries and modules -- `tile-meta.js`, `citations.js`, and
`tools-data.js` (the flat per-tile registries, relieved by documented cap bumps
when a tile lands) and the next calc-module split candidates `calc-fire.js`,
`calc-cross.js`, and `calc-agriculture.js` (now among the tightest renderer
modules at ~93-95% of cap). Further catalog growth should be evidence-driven (a
named gap a working tradesperson hits), not catalog-filling, per the spec-v69 §5
guidance.
