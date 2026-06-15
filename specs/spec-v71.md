# roughlogic.com Specification v71 -- calc-field.js Cap-Relief Split (Surveying Module)

> **Implementation status: CLOSED 2026-06-15 (package stamped 0.63.2, a patch;
> catalog holds at 624 tiles, 25 groups; modules 33 -> 34).** v71 inherits
> everything from spec.md through spec-v70.md and changes none of it. It is a
> platform-only / housekeeping spec in the same spirit as spec-v70 (and
> spec-v10, spec-v36, spec-v39): it **adds no tiles, removes no tiles, and
> changes no calculator output** -- only the on-disk module layout changes.
>
> **The gap, and the evidence for it.** After v70 relieved `calc-construction.js`,
> the standing module-cap watch (spec-v70 §5) named `calc-field.js` as the next
> calc-module split candidate. It was the tightest renderer module in the repo at
> **96.8% of its 22 KB gzip cap (21304 B)** -- its own size-cap comment has
> flagged a per-tile split as the preferred long-term remediation since spec-v10
> §H.1, and after the v9 NCEI WMM2025 magnetic-model port and the v25 surveying
> tiles it had no headroom left for the next Group P tile. Restoring headroom is
> what keeps the next evidence-driven Group P / field tile unblocked.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **spec-v25 surveying coordinate-geometry bench** -- two contiguous,
self-contained tiles -- is extracted from `calc-field.js` into a new module
`calc-survey.js` (`SURVEY_RENDERERS`):

| Tile id | Name | Source |
|---|---|---|
| `area-by-coordinates` | Area by Coordinates (shoelace, FM 5-233) | spec-v25 |
| `traverse-closure` | Traverse Closure and Adjustment (latitude/departure, compass-rule) | spec-v25 |

**Both KEEP `group: "P"`** -- a tile's group letter is independent of the module
that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 / spec-v70
precedent). Their ids, citations, worked examples, dimensional annotations, and
behavior are byte-for-byte unchanged. The remaining Group P field/backcountry/SAR
tiles (`pacing-distance`, `bearing-conversion`, `slope-avalanche`,
`backcountry-needs`, `utm-conversion`, `solar-times`, `lightning-countdown`,
`magnetic-declination`, `search-probability`, `hiking-time`) stay in
`calc-field.js`. The surveying pair is a single clean contiguous cut: it sat
between the `search-probability` tile and the v52 `hiking-time` tile, so the
extraction takes only the surveying bench.

## 2. As-landed sizes

- `calc-field.js`: **21304 B -> 18830 B** gzipped; cap lowered 22000 ->
  **20000** to lock in the headroom (now ~94%).
- `calc-survey.js` (new): **~3.8 KB** (3833 B) gzipped; cap **5000** (current +
  headroom). Lazy-loaded on first open of one of its tiles, so it is **not in
  the home-view first-paint payload** (the spec-v10 §H.2 budget is unaffected).

## 3. Wiring repointed (every reference gated)

`app.js` (the two ids move from the `FIELD_RENDERERS` declare to a new
`SURVEY_RENDERERS` declare for `./calc-survey.js`); `scripts/build.mjs` `FILES`;
`sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower the
source cap, add the new module's cap); `scripts/check-dimensions.mjs`
(`GRADUATED_MODULES` gains `calc-survey.js`, since the moved functions carry full
dimensional annotations); `scripts/check-multiline-inputs.mjs` (attribution
comment); `test/fixtures/compute-map.js` (the two ids -> `../../calc-survey.js`);
`test/unit/bounds-fuzzer.test.js` and `test/unit/calc-v24-v25.test.js` (the two
compute-fn imports repointed); and the regenerated v14 corpus
(`docs/derivations.md` -- the moved functions change file attribution; the
tile-index is tile-id-keyed and unchanged). `tools-data.js`, `tile-meta.js`,
`citations.js`, `test/fixtures/worked-examples.json`, and
`scripts/related-tiles.mjs` reference tiles by **id** (group-keyed, not
module-keyed) and need **no change**. The README catalog-count gate
(`check-readme-counts`) agrees at **34 modules**; the wiring lint reports
**34 renderer modules / 624 tile-id entries**.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, and README-count gates); `npm test`
(5,534 unit tests, unchanged -- the surveying assertions in `calc-v24-v25` and
the two bounds-fuzzer rows now import from the new module); `npm run build` (624
tile shells, 25 group shells, regenerated sitemap); `npm run data:verify`; the
full-catalog render-no-nan Chromium sweep, the a11y gate, and the 320 px
shell-mobile / responsive-stress sweeps on both Chromium and WebKit (the two
moved tiles render identically from the new module). The moved tiles' pinned
worked examples (area-by-coordinates 100x100 square -> 10000 ft2 / 0.2296 ac;
traverse-closure rectangle 100/200/100/200 -> perfect closure) re-verify to the
digit.

## 5. Roadmap position

v71 is housekeeping, not growth. After it, `calc-field.js` has headroom for the
active Group P bench again. The standing module-cap watch continues on the
next-tightest registries and modules -- `tile-meta.js`, `citations.js`, and
`tools-data.js` (the flat per-tile registries, relieved by documented cap bumps
when a tile lands) and `calc-electrical.js`, `calc-plumbing.js`, `calc-hvac.js`
(the next calc-module split candidates). Further catalog growth should be
evidence-driven (a named gap a working tradesperson hits), not catalog-filling,
per the spec-v69 §5 guidance.
