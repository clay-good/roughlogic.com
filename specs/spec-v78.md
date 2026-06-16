# roughlogic.com Specification v78 -- calc-plumbing.js Cap-Relief Split (Appliance / Service Bench)

> **Implementation status: CLOSED 2026-06-15 (package stamped 0.63.9, a patch;
> catalog holds at 624 tiles, 25 groups; modules 40 -> 41).** v78 inherits
> everything from spec.md through spec-v77.md and changes none of it. It is a
> platform-only / housekeeping spec in the same spirit as spec-v70 through
> spec-v77 (and spec-v10, spec-v36, spec-v39, spec-v42): it **adds no tiles,
> removes no tiles, and changes no calculator output** -- only the on-disk module
> layout changes.
>
> **The gap, and the evidence for it.** After v77 relieved `calc-restoration.js`,
> the standing module-cap watch (spec-v77 §5) named `calc-plumbing.js` as the next
> calc-module split candidate. It was the tightest remaining calculator module in
> the repo at **95.2% of its 57.5 KB gzip cap (54735 B)**. Restoring headroom is
> what keeps the next Group B plumbing tile unblocked without another cap bump.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **post-rough-in service bench** -- four contiguous, self-contained
tiles that sit at the very end of the source file (the spec-v63 + spec-v64 work) --
is extracted from `calc-plumbing.js` into a new module `calc-service.js`
(`SERVICE_RENDERERS`). These are the decisions a plumber makes at **appliance
hookup and final tie-in** rather than at supply/DWV rough-in, which is the
unifying theme:

| Tile id | Name | Source |
|---|---|---|
| `gas-appliance-demand` | Connected Load to CFH (`cfh = total connected BTU/hr / heating value`; full connected load with no diversity per IFGC 402.2, default 1,000 BTU/ft^3 natural gas / 2,516 BTU/ft^3 propane) | spec-v63 B |
| `tpr-discharge` | Water-Heater Relief Valve and Discharge Check (`rating_ok = valve_rating >= heater_input`; full-outlet discharge line, never reduced, plus the IPC 504.6 checklist) | spec-v63 B |
| `pipe-support-spacing` | Hanger Spacing and Count for a Run (`max_spacing = lookup(table, material, size, orientation)`; `hangers = ceil(run / max_spacing) + 1`) | spec-v64 B |
| `softener-sizing` | Grain Load, Regeneration Interval, and Salt (`comp_hardness = hardness + iron x 4`; `grain_load = people x use x comp_hardness`; `days_between = floor(capacity / grain_load)`) | spec-v64 B |

**All four KEEP `group: "B"`** -- a tile's group letter is independent of the
module that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 / spec-v42 /
spec-v70 .. spec-v77 precedent). Their ids, citations, worked examples,
dimensional annotations, and behavior are byte-for-byte unchanged. The cut is
clean: the bench reaches nothing outside its **own scoped `./ui-fields.js` import
block** (`DEBOUNCE_MS`, `debounce`, `makeNumber`, `makeTextarea`, `makeSelect`,
`makeOutputLine`, `attachExampleButton`, `fmt`) and the per-module
**`_finiteGuard`** -- which is copied verbatim into the new module (non-exported,
so it adds no v14 derivation-corpus row), exactly as the v72/v73/v76/v77 benches
did. The moved compute functions are verbatim, along with their local helper
tables (`GAS_HEATING_VALUE`, `TPR_OUTLET_LABEL`, `TPR_CHECKLIST`,
`SUPPORT_SPACING_TABLE`, `_supportLookup`). The remaining Group B plumbing tiles
(the supply/DWV sizing core, the v2/v3/v7/v9/v16/v20/v23/v26 benches, and the
v61 `wsfu-demand` / `supply-pressure-budget` demand pair) stay in
`calc-plumbing.js`.

## 2. As-landed sizes

- `calc-plumbing.js`: **54735 B -> 49490 B** gzipped; cap lowered 57500 ->
  **53000** to lock in the freed space (now ~93.4% of the new cap).
- `calc-service.js` (new): **~6.9 KB** (6947 B) gzipped; cap **8000** (current +
  headroom). Lazy-loaded on first open of one of its tiles, so it is **not in the
  home-view first-paint payload** (the spec-v10 §H.2 budget is unaffected; it
  ticks only from the `app.js` declare change).

## 3. Wiring repointed (every reference gated)

`app.js` (the four ids move from the `PLUMBING_RENDERERS` declare to a new
`SERVICE_RENDERERS` declare for `./calc-service.js`); `scripts/build.mjs` `FILES`;
`sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower the
source cap, add the new module's cap); `scripts/check-dimensions.mjs`
(`GRADUATED_MODULES` gains `calc-service.js`, since the moved functions carry full
dimensional annotations); `test/fixtures/compute-map.js` (the four ids ->
`../../calc-service.js`); `test/unit/bounds-fuzzer.test.js` (the two focused import
lines for the four moved compute fns repointed); and the regenerated v14 corpus
(`docs/derivations.md` -- the moved functions change file attribution; the
tile-index is tile-id-keyed and unchanged). `tools-data.js`, `tile-meta.js`,
`citations.js`, `test/fixtures/worked-examples.json`, `docs/audit-trail.md`, and
`scripts/related-tiles.mjs` reference tiles by **id** (group-keyed, not
module-keyed) and need **no change**. `gas-appliance-demand` is the bench's only
`makeTextarea` field (the appliance list), so it moves with the tile and
`scripts/check-multiline-inputs.mjs` finds it in the new module; the now-orphaned
`makeTextarea` import is dropped from the `calc-plumbing.js` import block (the
remaining tiles still use `makeText` / `makeCheckbox` / `makeSelect`, so no other
import is orphaned). The README catalog-count gate (`check-readme-counts`) agrees
at **41 modules**; the wiring lint reports **41 renderer modules / 624 tile-id
entries**.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, multiline-inputs, and
README-count gates); `npm test` (5,534 unit tests, unchanged -- the bounds-fuzzer
rows now import the four moved functions from the new module); `npm run build`
(624 tile shells, 25 group shells, regenerated sitemap); `npm run data:verify`;
the full-catalog render-no-nan Chromium sweep, the a11y gate, and the 320 px
shell-mobile / responsive-stress sweeps on both Chromium and WebKit (the four
moved tiles render identically from the new module). The moved tiles' pinned
worked examples (gas-appliance-demand 100k/40k/65k/35k BTU/hr natural gas -> 240
CFH; tpr-discharge 50k input vs 150k valve, 3/4 in outlet -> pass, 100k margin;
pipe-support-spacing copper 1 in / 24 ft horizontal -> 6 ft spacing, 5 hangers;
softener-sizing 4 people / 75 gal / 20 gpg / 2 ppm iron / 32000 grains / 15 lb ->
8400 grains/day, 3 days between) re-verify to the digit.

## 5. Roadmap position

v78 is housekeeping, not growth. After it, `calc-plumbing.js` has headroom for
the next Group B tile again. The standing module-cap watch continues on the
next-tightest registries and modules -- `tile-meta.js`, `citations.js`, and
`tools-data.js` (the flat per-tile registries, relieved by documented cap bumps
when a tile lands) and the next calc-module split candidates `calc-electrical.js`,
`calc-construction.js`, and `calc-hvac.js` (now among the tightest renderer
modules at ~95% of cap). Further catalog growth should be evidence-driven (a named
gap a working tradesperson hits), not catalog-filling, per the spec-v69 §5
guidance.
