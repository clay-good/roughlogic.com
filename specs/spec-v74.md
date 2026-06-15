# roughlogic.com Specification v74 -- calc-hvac.js Cap-Relief Split (Velocity Bench)

> **Implementation status: CLOSED 2026-06-15 (package stamped 0.63.5, a patch;
> catalog holds at 624 tiles, 25 groups; modules 36 -> 37).** v74 inherits
> everything from spec.md through spec-v73.md and changes none of it. It is a
> platform-only / housekeeping spec in the same spirit as spec-v70, spec-v71,
> spec-v72, and spec-v73 (and spec-v10, spec-v36, spec-v39, spec-v42): it **adds
> no tiles, removes no tiles, and changes no calculator output** -- only the
> on-disk module layout changes.
>
> **The gap, and the evidence for it.** After v73 relieved `calc-plumbing.js`,
> the standing module-cap watch (spec-v73 §5) named `calc-hvac.js` as the next
> calc-module split candidate. It was the tightest remaining calculator module in
> the repo at **95.9% of its 61 KB gzip cap (58521 B)** -- and its own size-cap
> comment has flagged a per-tile split as the preferred long-term remediation
> since spec-v10 §H.1. Restoring headroom is what keeps the next Group C HVAC tile
> unblocked without another cap bump.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **spec-v23 velocity bench** -- two contiguous, self-contained tiles
-- is extracted from `calc-hvac.js` into a new module `calc-velocity.js`
(`VELOCITY_RENDERERS`):

| Tile id | Name | Source |
|---|---|---|
| `duct-velocity-pressure` | Duct Velocity Pressure (V = 4005 x sqrt(VP), standard air, either direction) | spec-v23 |
| `refrigerant-velocity` | Refrigerant Line Velocity and Oil-Return Window (ASHRAE Refrigeration Handbook) | spec-v23 |

**Both KEEP `group: "C"`** -- a tile's group letter is independent of the module
that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 / spec-v42 /
spec-v70 / spec-v71 / spec-v72 / spec-v73 precedent). Their ids, citations,
worked examples, dimensional annotations, and behavior are byte-for-byte
unchanged. The cut is exceptionally clean: the bench already carried its **own
scoped `./ui-fields.js` import block** (the `_v23h_*` aliases) and reaches
nothing outside it -- no shared module table, and unlike the v72/v73 benches it
never calls `_finiteGuard` (its compute functions do their own positive/finite
guards inline), so no guard helper is copied and the moved code is verbatim. The
remaining Group C HVAC tiles (the v20 economizer/pipe-loss/fan-BHP bench and the
v27 round-to-rect-duct tile that followed it in the source) stay in
`calc-hvac.js`.

## 2. As-landed sizes

- `calc-hvac.js`: **58521 B -> 56914 B** gzipped (the dist measurement); cap
  lowered 61000 -> **60000** to lock in the headroom (now ~95%).
- `calc-velocity.js` (new): **~2.7 KB** (2676 B) gzipped; cap **4000** (current +
  headroom). Lazy-loaded on first open of one of its tiles, so it is **not in
  the home-view first-paint payload** (the spec-v10 §H.2 budget is unaffected;
  it ticks 37401 B -> 37467 B only from the two-line `app.js` declare change).

## 3. Wiring repointed (every reference gated)

`app.js` (the two ids move from the `HVAC_RENDERERS` declare to a new
`VELOCITY_RENDERERS` declare for `./calc-velocity.js`); `scripts/build.mjs`
`FILES`; `sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower
the source cap, add the new module's cap); `scripts/check-dimensions.mjs`
(`GRADUATED_MODULES` gains `calc-velocity.js`, since the moved functions carry
full dimensional annotations); `test/fixtures/compute-map.js` (the two ids ->
`../../calc-velocity.js`); `test/unit/bounds-fuzzer.test.js` (the two compute-fn
and two render-fn imports repointed to a focused `calc-velocity.js` import);
`test/unit/calc-v23.test.js` (the two compute-fn imports repointed); and the
regenerated v14 corpus (`docs/derivations.md` -- the moved functions change file
attribution; the tile-index is tile-id-keyed and unchanged). `tools-data.js`,
`tile-meta.js`, `citations.js`, `test/fixtures/worked-examples.json`,
`docs/audit-trail.md`, `data/search/aliases.json`, and `scripts/related-tiles.mjs`
reference tiles by **id** (group-keyed, not module-keyed) and need **no change**.
The moved tiles use no `makeTextarea` field, so `scripts/check-multiline-inputs.mjs`
needs no attribution update. The README catalog-count gate
(`check-readme-counts`) agrees at **37 modules**; the wiring lint reports **37
renderer modules / 624 tile-id entries**.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates);
`npm test` (5,534 unit tests, unchanged -- the bounds-fuzzer and `calc-v23` rows
now import from the new module); `npm run build` (624 tile shells, 25 group
shells, regenerated sitemap); `npm run data:verify`; the full-catalog
render-no-nan Chromium sweep, the a11y gate, and the 320 px shell-mobile /
responsive-stress sweeps on both Chromium and WebKit (the two moved tiles render
identically from the new module). The moved tiles' pinned worked examples
(duct-velocity-pressure VP 0.25 in. w.c. -> 2002.5 fpm, and the inverse;
refrigerant-velocity 600 lb/hr through a 0.75 in line at 0.5 ft^3/lb on a suction
riser -> ~1630 fpm, within the oil-return window) re-verify to the digit.

## 5. Roadmap position

v74 is housekeeping, not growth. After it, `calc-hvac.js` has headroom for the
active Group C bench again. The standing module-cap watch continues on the
next-tightest registries and modules -- `tile-meta.js`, `citations.js`, and
`tools-data.js` (the flat per-tile registries, relieved by documented cap bumps
when a tile lands) and the next calc-module split candidates `calc-water.js`,
`calc-mechanic.js`, and `calc-restoration.js` (now the tightest renderer modules
at ~95-96% of cap). Further catalog growth should be evidence-driven (a named gap
a working tradesperson hits), not catalog-filling, per the spec-v69 §5 guidance.
