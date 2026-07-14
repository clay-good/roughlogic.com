# roughlogic.com Specification v721 -- Pitch Diameter from Three-Wire Measurement (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`** (Group G), no
> new module, group, or dependency. Inherits spec.md through spec-v720.md. Opens the sweep-11 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `thread-measure-wire` tile runs the three-wire method forward:
> from a pitch diameter E it returns the measurement over three wires M. But that is backwards from the bench -- **the
> machinist measures M on the micrometer and wants the pitch diameter E**. Solving `M = E + 3W - 1.51553 P` for E gives
> `E = M - 3W + 1.51553 P`. The number this settles: a **1/2-13** thread read at **M = 0.4900 in** over best wires gives
> **E = 0.4734 in**, which you compare to the thread-class limits for the fit.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`thread-measure-wire` sibling: the measurement, wire, pitch, and returned pitch diameter are `L` (in), and TPI is `T^-1`.
It reuses the sibling's 60-degree geometry -- best wire `W = 0.57735 P`, the acceptable 0.560P-0.650P range check, the
1.51553 constant -- and the inch (TPI) / metric (mm pitch) selector. The v18/v21 contract: any non-finite input, a
non-positive measurement, or a non-positive TPI / metric pitch returns `{ error }`; a computed pitch diameter that is not
positive (an inconsistent M / wire / pitch) also returns `{ error }`, and a wire outside the acceptable range is flagged,
not blocked. Citation discipline (v19/v22): the three-wire relation solved for the pitch diameter, `GOVERNANCE.general`
matching the sibling, first-principles geometry as in Machinery's Handbook; the note states that **this is the way the
method is used on the bench and the resulting E should be compared to the thread-class pitch-diameter limits**.

## 2. The tile

### 2.1 `thread-pitch-dia-from-wires` -- Pitch Diameter from Three-Wire Measurement

```
inputs:
  thread_standard              inch | metric
  tpi                          T^-1   threads per inch (inch standard, > 0)
  pitch_mm                     L      pitch in mm (metric standard, > 0)
  measurement_over_wires_in    L      measurement M read over three wires (> 0)
  wire_dia_in                  L      wire diameter (blank = best wire 0.57735 P)

P = 1/tpi (inch) or pitch_mm/25.4 (metric)
W = wire_dia_in, or best wire 0.57735 P if blank
E = measurement_over_wires_in - 3 W + 1.51553 P
```

**Pinned worked example.** 1/2-13 UNC, M = 0.4900 in, best wire: `P = 1/13 = 0.076923 in`, `W = 0.57735 x P = 0.044412
in`, `E = 0.4900 - 0.133235 + 0.116579 = ` **0.4734 in**; feeding E = 0.4734 in and the same wire back through
`thread-measure-wire` returns M = 0.4900 in, the input. The metric path (pitch in mm) works the same way.

## 3. Wiring

A `tools-data.js` row (group `G`, trades `["machinist","fabrication"]`) placed beside `thread-measure-wire` in the later
spec-v40 section, well past the Group G exact-32 audit block (the original Cross-Trade block); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (three-wire relation solved for the pitch diameter, `GOVERNANCE.general` matching the
sibling); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`thread-pitch-dia-from-wires` -> `computeThreadPitchDiaFromWires`); `scripts/related-tiles.mjs` (-> `thread-measure-wire`
/ `thread-pitch` / `bolt-proof-load` / `sine-bar`); `data/search/aliases.json` (5 collision-checked question aliases:
"pitch diameter from three wire measurement", "thread pitch diameter from mic reading", ...); the calc-shop `SHOP_RENDERERS`
map entry via a hand-written NON-exported renderer (the shared inch/metric select, an M field in place of the E field, the
best-wire default) and the id added to the calc-shop declare list in `app.js`; the `// dims:` annotation directly above
the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example,
the round-trip through `computeThreadMeasureWire` across a TPI/measurement sweep, the metric path, and the error seams. The
calc-shop.js gzip cap is raised 22000 -> 24500 B (the module was at 95.5%; this queue adds three shop inverse tiles).
Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,169 -> 1,170.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 0.4734 in pitch diameter
for a 1/2-13 thread read at 0.4900 in).

## 5. Roadmap position

Pairs the forward three-wire tile (`thread-measure-wire`, M from E) with its inverse (E from M), the way the method is
actually used at the bench. Opens the sweep-11 inverse queue; further Group G shop-math growth stays evidence-driven.
