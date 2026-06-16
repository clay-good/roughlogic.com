# roughlogic.com Specification v80 -- calc-construction.js Cap-Relief Split (Site-Civil / Roadway-Geometry Bench)

> **Implementation status: CLOSED 2026-06-16 (package stamped 0.63.11, a patch;
> catalog holds at 624 tiles, 25 groups; modules 42 -> 43).** v80 inherits
> everything from spec.md through spec-v79.md and changes none of it. It is a
> platform-only / housekeeping spec in the same spirit as spec-v70 through
> spec-v79 (and spec-v10, spec-v36, spec-v39, spec-v42): it **adds no tiles,
> removes no tiles, and changes no calculator output** -- only the on-disk module
> layout changes.
>
> **The gap, and the evidence for it.** After v79 relieved `calc-electrical.js`, the
> standing module-cap watch (spec-v79 §5) named `calc-construction.js` as the next
> calc-module split candidate. It was the tightest remaining calculator module in
> the repo at **95.0% of its 66 KB gzip cap (62719 B)**. Restoring headroom is
> what keeps the next Group E construction tile unblocked without another cap bump.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **spec-v25 site-civil quartet** -- four contiguous, self-contained
tiles that sit together in the source file (after the v24 welding/metal/layout
block and before the v27 fillet-weld tile) -- is extracted from
`calc-construction.js` into a new module `calc-civil.js` (`CIVIL_RENDERERS`). The
unifying theme is distinct from the building-construction core (framing, concrete,
rebar, beams, fasteners): these four are **roadway and site-grading geometry** --
horizontal and vertical alignment curves, earthwork volume between stations, and
slope staking.

| Tile id | Name | Source |
|---|---|---|
| `horizontal-curve` | Horizontal (circular) curve geometry (arc definition `D = 5729.58 / R`; tangent `T = R*tan(d/2)`, curve length `L = R*delta_rad`, external, middle ordinate, long chord, and PC/PT stations per AASHTO Green Book / FM 5-233) | spec-v25 E |
| `vertical-curve` | Vertical (equal-tangent parabolic) curve (BVC/EVC stations and elevations, the crest/sag turning point `x_tp = -g1*L/(g2-g1)`, and elevation at any station) | spec-v25 E |
| `earthwork-end-area` | Average-end-area earthwork volume (`V = (interval/2)(A_i + A_{i+1})` summed over adjacent pairs, the optional prismoidal pair `V = (interval/6)(A1 + 4*mid + A2)`, and an optional swell/shrink factor; 27 ft^3 = 1 yd^3) | spec-v25 E |
| `slope-stake-cut-fill` | Slope-stake cut/fill and catch offset (`cut_fill = existing - design`; planar catch `catch_offset = offset_at_hinge + slope_ratio_h * |cut_fill|`) | spec-v25 E |

**All four KEEP `group: "E"`** -- a tile's group letter is independent of the
module that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 / spec-v42 /
spec-v70 .. spec-v79 precedent). Their ids, citations, worked examples,
dimensional annotations, and behavior are byte-for-byte unchanged. The cut is
clean: the bench reaches nothing outside its **own scoped `./ui-fields.js` import
block** (`DEBOUNCE_MS`, `debounce`, `makeNumber`, `makeSelect`, `makeOutputLine`,
`attachExampleButton`, `fmt`) and the per-module **`_finiteGuard`** -- which is
copied verbatim into the new module (non-exported, so it adds no v14
derivation-corpus row), exactly as the v72/v73/v76/v77/v78 benches did. The moved
compute functions are verbatim, along with their exported worked-example
constants. The remaining Group E construction tiles (the building core, the v2/v3
benches, the v7/v8/v9/v15/v20/v23 structural tiles, the v24/v27 welding tiles, and
the v69 coatings pair) stay in `calc-construction.js`.

> **Note on the `earthwork-end-area` comma-separated field.** Its end-area list is
> built with `makeNumber(..., { type: "text" })` (a single-line text input parsed
> by a local `parseAreas` splitter), not `makeTextarea` -- so the
> `scripts/check-multiline-inputs.mjs` gate does not apply to it. This predates
> v80 and travels with the tile unchanged.

## 2. As-landed sizes

- `calc-construction.js`: **62719 B -> 57861 B** gzipped; cap lowered 66000 ->
  **62000** to lock in the freed space (now ~93.3% of the new cap).
- `calc-civil.js` (new): **~6.6 KB** (6621 B) gzipped; cap **8000** (current +
  headroom). Lazy-loaded on first open of one of its tiles, so it is **not in the
  home-view first-paint payload** (the spec-v10 §H.2 budget is unaffected; it
  ticks only from the `app.js` declare change).

## 3. Wiring repointed (every reference gated)

`app.js` (the four ids move from the `CONSTRUCTION_RENDERERS` declare to a new
`CIVIL_RENDERERS` declare for `./calc-civil.js`); `scripts/build.mjs` `FILES`;
`sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower the
source cap, add the new module's cap); `scripts/check-dimensions.mjs`
(`GRADUATED_MODULES` gains `calc-civil.js`, since the moved functions carry full
dimensional annotations); `test/fixtures/compute-map.js` (the four ids ->
`../../calc-civil.js`); `test/unit/bounds-fuzzer.test.js` (the focused import line
for the four moved compute fns repointed); `test/unit/calc-v24-v25.test.js` (the
four civil compute fns split into a new `../../calc-civil.js` import, the welding
trio and `computeBendAllowance` staying on `calc-construction.js`); and the
regenerated v14 corpus (`docs/derivations.md` -- the moved functions change file
attribution; the tile-index is tile-id-keyed and unchanged). `tools-data.js`,
`tile-meta.js`, `citations.js`, `test/fixtures/worked-examples.json`,
`docs/audit-trail.md`, and `scripts/related-tiles.mjs` reference tiles by **id**
(group-keyed, not module-keyed) and need **no change**. No import is orphaned in
`calc-construction.js` (the bench used only the shared `ui-fields.js` imports and
`_finiteGuard`, which the remaining tiles still use; the `pure-math.js` and
`limitation-banner.js` imports are untouched). The README catalog-count gate
(`check-readme-counts`) agrees at **43 modules**; the wiring lint reports **43
renderer modules / 624 tile-id entries**.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates);
`npm test` (5,534 unit tests, unchanged -- the bounds-fuzzer and calc-v24-v25 rows
now import the four moved functions from the new module); `npm run build` (624
tile shells, 25 group shells, regenerated sitemap); `npm run data:verify`; the
full-catalog render-no-nan Chromium sweep, the a11y gate, and the 320 px
shell-mobile / responsive-stress sweeps on both Chromium and WebKit (the four
moved tiles render identically from the new module). The moved tiles' pinned
worked examples (horizontal-curve R=1000 ft / delta 30 deg / PI 5000 -> T ~268.0
ft, L ~523.6 ft; vertical-curve g1=3 / g2=-2 / L=400 / PVI sta 5000 elev 100 ->
crest at the turning point; earthwork-end-area 100/100 ft^2 at 100 ft interval ->
10,000 ft^3, ~370.4 yd^3; slope-stake-cut-fill 104.5 vs 100 ft at 2:1 -> 4.5 ft
cut, 9.0 ft catch offset) re-verify to the digit.

## 5. Roadmap position

v80 is housekeeping, not growth. After it, `calc-construction.js` has headroom for
the next Group E tile again. The standing module-cap watch continues on the
next-tightest registries and modules -- `tile-meta.js`, `citations.js`, and
`tools-data.js` (the flat per-tile registries, relieved by documented cap bumps
when a tile lands) and the next calc-module split candidates `calc-hvac.js`,
`calc-fire.js`, and `calc-cross.js` (now among the tightest renderer modules at
~93-95% of cap). Further catalog growth should be evidence-driven (a named gap a
working tradesperson hits), not catalog-filling, per the spec-v69 §5 guidance.
