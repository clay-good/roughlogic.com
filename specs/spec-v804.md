# roughlogic.com Specification v804 -- AWG Conductor Geometry (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`**
> (Group A), no new module, group, or dependency. Inherits spec.md through spec-v803.md. Fresh Explore sweep #24
> (entry 4, the last), surfacing conductor geometry the module already computes internally.
>
> **The gap, and the evidence for it.** `calc-electrical.js` imports `awgDiameterInches` / `awgAreaCmils` from
> `pure-math.js` to drive ampacity and voltage-drop, but **no tile surfaces the AWG geometry itself** -- the diameter,
> circular mils, and mm² an electrician looks up constantly. Grep confirmed no gauge-to-geometry tile exists (the helpers
> are internal-only). Converters are already in scope (`decimal-to-fraction`, `pressure-conversion`). The number this
> settles: #12 AWG is **0.0808 in, 6,530 circular mils, 3.31 mm²**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group A
electrical siblings (`wire-ampacity`, `voltage-drop`): the AWG size is dimensionless, the diameters carry `L`, and both
areas carry `L^2`. The compute reuses the existing `pure-math.js` helpers (`awgToNumber`, `awgDiameterInches`,
`awgAreaCmils`, `awgAreaM2`) rather than re-deriving. The v18/v21 contract: a non-finite numeric AWG (via `_finiteGuard`)
or an unparseable AWG string returns `{ error }`. Citation discipline (v19/v22): the AWG geometric definition (ASTM B258)
by name, `GOVERNANCE.general`; the note states that each 6-gauge step scales the diameter by ~2 (92^(6/39)), that the
aught sizes 1/0-4/0 are n = 0, -1, -2, -3, that circular mils are a diameter-squared unit, and that this is the bare,
solid-conductor size, not the over-insulation or stranded diameter.

## 2. The tile

### 2.1 `awg-wire-geometry` -- AWG Conductor Geometry (Diameter, Circular Mils, mm²)

```
inputs:
  awg   AWG size (a select 18..4/0); aught sizes 1/0..4/0 map to n = 0, -1, -2, -3

diameter_in  = 0.005 * 92^((36 - n)/39)
diameter_mm  = 25.4 * diameter_in
area_cmils   = (1000 * diameter_in)^2
area_mm2     = pi * (25.4 * diameter_in / 2)^2
```

**Pinned worked example.** #12 AWG: `n = 12`; `d = 0.005 x 92^((36-12)/39) = ` **0.0808 in** (2.05 mm), area
`(80.8)^2 = ` **6,530 circular mils** = **3.31 mm²**. Cross-check: 4/0 (n = -3) is exactly **0.460 in** and **211,600
circular mils** -- the textbook round values that anchor the scale.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`) beside `wire-ampacity`; a `tile-meta.js` `_TILES` entry
(`A`); a `citations.js` entry (ASTM B258 AWG definition, `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the #12 example plus the 4/0 cross-check); `test/fixtures/compute-map.js`
(`awg-wire-geometry` -> `computeAwgWireGeometry`); `scripts/related-tiles.mjs` (-> `wire-ampacity` / `conduit-fill` /
`voltage-drop`); `data/search/aliases.json` (5 collision-checked aliases: "awg wire diameter", "wire gauge to
diameter", "awg to circular mils", "conductor area by gauge", "awg to square mm"); the calc-electrical
`ELECTRICAL_RENDERERS` map entry via a non-exported renderer with an AWG select (the existing `awgOptions()`), and the
id added to the calc-electrical declare list in `app.js`; the `awgAreaM2` / `awgToNumber` imports added to the module;
the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the diameter/area, the aught sizes, the 6-gauge ratio, and the error seams. The
calc-electrical.js gzip cap is unchanged. Verify at build, including `check-shells`. Lazy-loaded, absent from home
first paint. Home tile count 1,252 -> 1,253.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (#12 -> 0.0808 in / 6,530 cmil / 3.31 mm²).

## 5. Roadmap position

Surfaces the AWG geometry the electrical module already computed internally, beside the ampacity and voltage-drop tiles
in Group A. Closes Explore sweep #24; the catalog is very saturated and the next batch needs a fresh sweep into a
less-mined domain. Stays evidence-driven.
