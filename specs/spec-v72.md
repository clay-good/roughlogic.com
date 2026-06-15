# roughlogic.com Specification v72 -- calc-electrical.js Cap-Relief Split (Feeder Bench)

> **Implementation status: CLOSED 2026-06-15 (package stamped 0.63.3, a patch;
> catalog holds at 624 tiles, 25 groups; modules 34 -> 35).** v72 inherits
> everything from spec.md through spec-v71.md and changes none of it. It is a
> platform-only / housekeeping spec in the same spirit as spec-v70 and spec-v71
> (and spec-v10, spec-v36, spec-v39): it **adds no tiles, removes no tiles, and
> changes no calculator output** -- only the on-disk module layout changes.
>
> **The gap, and the evidence for it.** After v71 relieved `calc-field.js`, the
> standing module-cap watch (spec-v71 §5) named `calc-electrical.js` as the next
> calc-module split candidate. It was the tightest renderer module in the repo at
> **96.7% of its 64.5 KB gzip cap (62418 B)** -- the largest calculator module,
> and its own size-cap comment has flagged a per-tile split as the preferred
> long-term remediation since spec-v15. Restoring headroom is what keeps the next
> Group A electrical tile unblocked without another cap bump.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **spec-v26 feeder / transformer-conductor overcurrent bench** -- two
contiguous, self-contained tiles at the tail of the module -- is extracted from
`calc-electrical.js` into a new module `calc-feeder.js` (`FEEDER_RENDERERS`):

| Tile id | Name | Source |
|---|---|---|
| `motor-feeder-multiple` | Feeder for Multiple Motors (NEC 430.24 conductor / 430.62 protection) | spec-v26 |
| `transformer-conductor-protection` | Transformer Conductor + Overcurrent Protection (NEC 450.3(B) / 240.21(C)) | spec-v26 |

**Both KEEP `group: "A"`** -- a tile's group letter is independent of the module
that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 / spec-v70 / spec-v71
precedent). Their ids, citations, worked examples, dimensional annotations, and
behavior are byte-for-byte unchanged. The cut is clean: the bench owns its NEC
240.6(A) standard-OCPD table (`_V26_STD_OCPD`) and its `_v26StdDown` / `_v26StdUp`
helpers, imports its own UI helpers from `./ui-fields.js`, and reaches nothing
above it in the source but the per-module `_finiteGuard` (copied into the new
module, non-exported, no v14 derivation-corpus row). The remaining Group A
electrical tiles stay in `calc-electrical.js`.

## 2. As-landed sizes

- `calc-electrical.js`: **62418 B -> 58989 B** gzipped (the dist measurement);
  cap lowered 64500 -> **62000** to lock in the headroom (now ~95%).
- `calc-feeder.js` (new): **~4.5 KB** (4577 B) gzipped; cap **6000** (current +
  headroom). Lazy-loaded on first open of one of its tiles, so it is **not in
  the home-view first-paint payload** (the spec-v10 §H.2 budget is unaffected).

## 3. Wiring repointed (every reference gated)

`app.js` (the two ids move from the `ELECTRICAL_RENDERERS` declare to a new
`FEEDER_RENDERERS` declare for `./calc-feeder.js`); `scripts/build.mjs` `FILES`;
`sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower the
source cap, add the new module's cap); `scripts/check-dimensions.mjs`
(`GRADUATED_MODULES` gains `calc-feeder.js`, since the moved functions carry full
dimensional annotations); `scripts/check-multiline-inputs.mjs` (attribution
comment for the relocated `_v26makeTextarea`); `test/fixtures/compute-map.js`
(the two ids -> `../../calc-feeder.js`); `test/unit/bounds-fuzzer.test.js` and
`test/unit/calc-v26.test.js` (the two compute-fn imports repointed); and the
regenerated v14 corpus (`docs/derivations.md` -- the moved functions change file
attribution; the tile-index is tile-id-keyed and unchanged). `tools-data.js`,
`tile-meta.js`, `citations.js`, `test/fixtures/worked-examples.json`, and
`scripts/related-tiles.mjs` reference tiles by **id** (group-keyed, not
module-keyed) and need **no change**. The README catalog-count gate
(`check-readme-counts`) agrees at **35 modules**; the wiring lint reports
**35 renderer modules / 624 tile-id entries**.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates);
`npm test` (5,534 unit tests, unchanged -- the feeder assertions in `calc-v26`
and the two bounds-fuzzer rows now import from the new module); `npm run build`
(624 tile shells, 25 group shells, regenerated sitemap); `npm run data:verify`;
the full-catalog render-no-nan Chromium sweep, the a11y gate, and the 320 px
shell-mobile / responsive-stress sweeps on both Chromium and WebKit (the two
moved tiles render identically from the new module). The moved tiles' pinned
worked examples (motor-feeder-multiple 28/16/10 A FLC, largest device 40 ->
conductor 61 A, feeder device 60 A; transformer-conductor-protection 45 kVA
3-phase 480->208 -> primary FLA 54.13 A, primary device 70 A) re-verify to the
digit.

## 5. Roadmap position

v72 is housekeeping, not growth. After it, `calc-electrical.js` has headroom for
the active Group A bench again. The standing module-cap watch continues on the
next-tightest registries and modules -- `tile-meta.js`, `citations.js`, and
`tools-data.js` (the flat per-tile registries, relieved by documented cap bumps
when a tile lands) and `calc-plumbing.js`, `calc-hvac.js` (the next calc-module
split candidates). Further catalog growth should be evidence-driven (a named gap
a working tradesperson hits), not catalog-filling, per the spec-v69 §5 guidance.
