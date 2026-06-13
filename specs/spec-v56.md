# roughlogic.com Specification v56 — calc-fab.js Module Split (Platform Only)

> **Implementation status: CLOSED 2026-06-13 (package stamped 0.50.1, a
> patch; catalog holds at 583, wiring lint 31 renderer modules / 583 tile-id
> entries).** v56 is a platform-only / housekeeping spec in the lineage of
> spec-v36 (calc-cross split), spec-v39 (calc-electrical relief), and spec-v42
> (calc-gas split). It inherits everything from spec.md through spec-v55.md.
>
> **It adds no tiles, removes no tiles, and changes no calculator output.** The
> catalog holds at **583**; only the on-disk module layout changes. No new
> dependencies, no telemetry, no AI.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Why

`calc-fab.js` had grown to **19,260 B gzipped, 96.3% of its 20,000 B cap** after
the layout family expanded across spec-v32 / v37 / v38 / v44 / v47 / v55
(bolt-circle, sine-bar, thread-pitch, circular-arc, circle-from-3-points,
polygon-miter) on top of the original v26 pipefitter's bench, the v27 rigger's
center-of-gravity, the v33 decimal-to-fraction, and the v39 conduit suite. The
next layout tile, or even a citation reword, would have breached the cap, and the
spec-v36/v39/v42 precedent is clear: at ~96% the documented remediation is a
per-tile split, not another cap bump (continued cap-bumping is the anti-pattern
those splits exist to end).

## 2. The split

The eight **layout / shop-geometry** tiles -- pure coordinate, angle, and
measurement geometry -- move out of `calc-fab.js` into a new thematic module
**`calc-layout.js`** (Layout & shop-geometry bench):

| Tile | Spec | Group |
|---|---|---|
| `center-of-gravity-2point` | v27 | G |
| `bolt-circle` | v32 | G |
| `decimal-to-fraction` | v33 | G |
| `sine-bar` | v37 | G |
| `thread-pitch` | v38 | G |
| `circular-arc` | v44 | G |
| `circle-from-3-points` | v47 | G |
| `polygon-miter` | v55 | G |

`calc-fab.js` keeps the seven **pipe & conduit fabrication** tiles that bend and
fit a run: `pipe-fitting-takeout`, `pipe-miter-cut`, `pipe-template-wrap`,
`flange-bolt-torque` (v26, Group G) and `conduit-offset`, `conduit-saddle`,
`conduit-90-stub` (v39, Group A). All tiles keep their group letter (a tile's
group is independent of its module, the v28/v36/v39 precedent); ids, citations,
worked examples, dimensional annotations, and behavior are **byte-for-byte
unchanged**.

The cleavage is self-contained per the v36/v39 rule: the moved block references
no symbol defined above the cut except `_finiteGuard` (copied verbatim into the
new module) and the `ui-fields.js` helpers it imports. The two module-local
helpers the moved tiles use (`_bcGcd` for decimal-to-fraction, `_V38_COS30` for
thread-pitch) move with them; the v26 flange helpers (`_V26_*`,
`_v26crossSequence`) stay with their tile in `calc-fab.js`.

## 3. Sizes and wiring

After the split: `calc-fab.js` is **10,106 B gz** (cap lowered 20000 -> 13000 B,
77.7%, relief locked in) and `calc-layout.js` is **10,614 B gz** (new cap 13500
B, 78.6%). Both lazy-loaded, so the home-view payload is unaffected. Module count
**30 -> 31**.

Every reference is repointed and gated: the `app.js` declare (the eight tiles
move from the `FAB_RENDERERS` declare to a new `LAYOUT_RENDERERS` declare),
`scripts/build.mjs` `FILES`, `sw.js` `SHELL_ASSETS` precache, the module-size
caps in `scripts/check-module-sizes.mjs`, the test fixtures
(`test/fixtures/compute-map.js` repoints the eight to `../../calc-layout.js`,
`test/unit/bounds-fuzzer.test.js` repoints the eight imports,
`test/unit/calc-v27.test.js` repoints `computeCenterOfGravity2Point`), and the
regenerated v14 corpus + tile-index. The wiring lint reports **31 renderer
modules / 583 tile-id entries**; the v42-era README module-count references
(`30 group modules`, `30 per-group calculator modules`, the architecture diagram
node) update to 31.

## 4. As-landed verification (gate plan)

The same green bar: `npm run lint` (every gate; the wiring lint reports **31
renderer modules / 583 tile-id entries**; `check-readme-counts` agrees at 583
tiles / 31 modules / 609 sitemap URLs; `check-module-sizes` passes both new caps;
`check:dist` resolves the new module reference and `check:sw-precache` confirms it
is precached), `npm test` (the unit suite unchanged at **5,520**), `npm run build`
(583 tile + 24 group shells, 609-URL sitemap, 797 dist files), `npm run
data:verify`, `check:dist` / `check:shells` / `check:shell-mobile` (609 shells,
zero 320 px horizontal scroll), and a render-no-nan + a11y Chromium pass over the
eight moved tiles and a kept pipe / conduit tile confirming identical output
through the new module routing.

## 5. Roadmap position

The catalog holds at 583. The standing module-cap watch list after the split:
`tools-data.js` (95% of the 50000 B cap, the registry that grows one row per
tile), `calc-kitchen.js`, `calc-stage.js`, `calc-field.js`, and
`calc-construction.js` (94%) -- the next split candidate is `calc-construction.js`
if Group E keeps growing. `calc-fab.js` and `calc-layout.js` now both sit near
78% with headroom restored for the next pipe/conduit or layout tile respectively.
