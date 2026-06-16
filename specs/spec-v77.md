# roughlogic.com Specification v77 -- calc-restoration.js Cap-Relief Split (Demolition / Abatement Bench)

> **Implementation status: CLOSED 2026-06-15 (package stamped 0.63.8, a patch;
> catalog holds at 624 tiles, 25 groups; modules 39 -> 40).** v77 inherits
> everything from spec.md through spec-v76.md and changes none of it. It is a
> platform-only / housekeeping spec in the same spirit as spec-v70 through
> spec-v76 (and spec-v10, spec-v36, spec-v39, spec-v42): it **adds no tiles,
> removes no tiles, and changes no calculator output** -- only the on-disk module
> layout changes.
>
> **The gap, and the evidence for it.** After v76 relieved `calc-mechanic.js`, the
> standing module-cap watch (spec-v76 §5) named `calc-restoration.js` as the next
> calc-module split candidate. It was tied for the tightest remaining calculator
> module in the repo at **95.2% of its 29 KB gzip cap (27605 B)**. Restoring
> headroom is what keeps the next Group D restoration tile unblocked without
> another cap bump.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **demolition / abatement bench** -- three contiguous, self-contained
tiles that sit at the very end of the source file -- is extracted from
`calc-restoration.js` into a new module `calc-demo.js` (`DEMO_RENDERERS`):

| Tile id | Name | Source |
|---|---|---|
| `moisture-dry-goal` | Dry Standard vs Affected Reading (a material is dry when its moisture content matches similar unaffected material in the same structure; `delta = affected - reference`, verdict on `delta <= acceptable_delta`) | spec-v60 D |
| `flood-cut-quantity` | Flood-Cut Demolition Take-Off (drywall area `run x (cut/12) x faces`, 4x8 sheet count `ceil(ft2 / 32)`, baseboard LF, batt-insulation area) | spec-v60 D |
| `abatement-containment` | Containment Poly, Negative Air, and Waste (poly `(floor x layers + wall x layers) x 1.10`, required exhaust `volume x ACH / 60`, NAM count, regulated-waste bags) | spec-v69 D |

**All three KEEP `group: "D"`** -- a tile's group letter is independent of the
module that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 / spec-v42 /
spec-v70 .. spec-v76 precedent). Their ids, citations, worked examples,
dimensional annotations, and behavior are byte-for-byte unchanged. The cut is
clean: the bench reaches nothing outside its **own scoped `./ui-fields.js` import
block** (`DEBOUNCE_MS`, `debounce`, `makeNumber`, `makeCheckbox`,
`makeOutputLine`, `attachExampleButton`, `fmt`) and the per-module
**`_finiteGuard`** -- which is copied verbatim into the new module (non-exported,
so it adds no v14 derivation-corpus row), exactly as the v72/v73/v76 benches did.
The moved compute functions are verbatim. The remaining Group D restoration tiles
(the v2 psychrometric core, the v3/v9/v16/v20/v23 drying-chamber and equipment
tiles, the v58/v59 mold-remediation and air-sampling bench) stay in
`calc-restoration.js`.

## 2. As-landed sizes

- `calc-restoration.js`: **27605 B -> 24339 B** gzipped; cap lowered 29000 ->
  **26000** to lock in the freed space (now ~93.6% of the new cap).
- `calc-demo.js` (new): **~4.8 KB** (4783 B) gzipped; cap **5500** (current +
  headroom). Lazy-loaded on first open of one of its tiles, so it is **not in the
  home-view first-paint payload** (the spec-v10 §H.2 budget is unaffected; it
  ticks only from the `app.js` declare change).

## 3. Wiring repointed (every reference gated)

`app.js` (the three ids move from the `RESTORATION_RENDERERS` declare to a new
`DEMO_RENDERERS` declare for `./calc-demo.js`); `scripts/build.mjs` `FILES`;
`sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower the
source cap, add the new module's cap); `scripts/check-dimensions.mjs`
(`GRADUATED_MODULES` gains `calc-demo.js`, since the moved functions carry full
dimensional annotations); `test/fixtures/compute-map.js` (the three ids ->
`../../calc-demo.js`); `test/unit/bounds-fuzzer.test.js` (the two focused import
lines for the three moved compute fns repointed); and the regenerated v14 corpus
(`docs/derivations.md` -- the moved functions change file attribution; the
tile-index is tile-id-keyed and unchanged). `tools-data.js`, `tile-meta.js`,
`citations.js`, `test/fixtures/worked-examples.json`, `docs/audit-trail.md`, and
`scripts/related-tiles.mjs` reference tiles by **id** (group-keyed, not
module-keyed) and need **no change**. The moved tiles use no `makeTextarea`
field, so `scripts/check-multiline-inputs.mjs` needs no attribution update. The
remaining `calc-restoration.js` keeps every `ui-fields.js` import (`makeCheckbox`
is still used by the staying `mold-remediation-level`; `makeText` / `makeSelect`
by other tiles), so no orphaned import results. The README catalog-count gate
(`check-readme-counts`) agrees at **40 modules**; the wiring lint reports **40
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
(moisture-dry-goal reference 12 / affected 35 / delta-allow 4 -> delta 23, 19 to
go, not at dry standard; flood-cut-quantity 60 LF run x 24 in cut, one side,
insulated -> 120 ft^2 drywall, 4 sheets, 60 LF base, 120 ft^2 batt;
abatement-containment 20 x 15 x 9 ft at 4 ACH on a 1500 cfm NAM with 3 cy debris)
re-verify to the digit.

## 5. Roadmap position

v77 is housekeeping, not growth. After it, `calc-restoration.js` has headroom for
the next Group D tile again. The standing module-cap watch continues on the
next-tightest registries and modules -- `tile-meta.js`, `citations.js`, and
`tools-data.js` (the flat per-tile registries, relieved by documented cap bumps
when a tile lands) and the next calc-module split candidates `calc-plumbing.js`,
`calc-electrical.js`, and `calc-construction.js` (now among the tightest renderer
modules at ~95% of cap). Further catalog growth should be evidence-driven (a named
gap a working tradesperson hits), not catalog-filling, per the spec-v69 §5
guidance.
