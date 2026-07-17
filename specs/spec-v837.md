# roughlogic.com Specification v837 -- Asphalt Spread Rate and Yield Check (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v836.md. Paving sweep (entry 3), beside
> `asphalt-tonnage` and `asphalt-paving-speed`.
>
> **The gap, and the evidence for it.** `asphalt-tonnage` totals a job but nothing gives the **spread rate** (lb/sy) and
> **yield** (sy/ton) a paving crew checks load by load to catch a mat running thick or trucks running short. Grep confirmed
> no spread-rate / yield tile. The number this settles: a 2 in mat at 145 pcf lays **217.5 lb/sy** and yields **9.2 sy per
> ton** -- so if a truck of 20 tons covers far fewer than 184 sy, the screed is set too deep and the tonnage will overrun.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E paving
siblings (`asphalt-tonnage`, `asphalt-paving-speed`): the thickness carries `L`, the density `M L^-3`, the spread rate is
a mass-per-area `M L^-2` (lb/sy), and the yield is its inverse `L^2 M^-1` (sy/ton). The v18/v21 contract: a non-finite or
non-positive thickness or density returns `{ error }`. Citation discipline (v19/v22): the spread/yield identity by name
(spread lb/sy = thickness x density x 0.75, where 0.75 = 9 sf/sy over 12 in/ft; yield sy/ton = 2000 / spread),
`GOVERNANCE.general`; the note states that the mix design's compacted density governs (typically about 145 pcf for a
dense-graded mix), that crews check the roll-ahead yield load by load against the plan, and that a low yield means the mat
is running thick or the trucks are short.

## 2. The tile

### 2.1 `asphalt-spread-rate` -- Asphalt Spread Rate and Yield Check

```
inputs:
  thickness_in  compacted mat thickness (in)
  density_pcf   compacted HMA density (pcf, default 145)

spread_lb_per_sy = thickness_in * density_pcf * 0.75
yield_sy_per_ton = 2000 / spread_lb_per_sy
```

**Pinned worked example.** Thickness 2 in, density 145 pcf:
`spread = 2 * 145 * 0.75 = ` **217.5 lb/sy**; `yield = 2000 / 217.5 = ` **9.20 sy/ton**. Cross-check: a 3 in lift lays
`3 * 145 * 0.75 = ` **326.25 lb/sy** and yields `2000 / 326.25 = ` **6.13 sy/ton** -- half again the thickness, a third
less area per ton, which is the number the roll-ahead check watches.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, inside the `// Group E` construction block beside
`asphalt-tonnage`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (spread = thickness x density x 0.75; yield = 2000/spread, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the thicker-lift cross-check); `test/fixtures/compute-map.js`
(`asphalt-spread-rate` -> `computeAsphaltSpreadRate`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `asphalt-tonnage` / `asphalt-paving-speed` / `asphalt-tack-coat-quantity`); `data/search/aliases.json` (5
collision-checked aliases: "asphalt spread rate", "asphalt yield", "hma spread rate", "sy per ton asphalt", "paving
roll-ahead check"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `asphalt-tonnage` renderer
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the spread rate, the yield, and the error seams (non-positive thickness or density).
The calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,285 -> 1,286.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(2 * 145 * 0.75 -> 217.5 lb/sy, 9.20 sy/ton).

## 5. Roadmap position

Third paving tile: the QC yield metric that complements the `asphalt-tonnage` takeoff and `asphalt-paving-speed`
production, serving the paving crew (construction / carpentry). Next paving candidate: cold-planing (milling) production.
Stays evidence-driven; the mix design sets the density.
