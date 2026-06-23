# roughlogic.com Specification v153 -- Thermal/ULV Fog Deodorizer Dosage (calc-restoration.js, Group D, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v151..v156.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one fire-damage restoration tile sizing the deodorant a thermal or ULV
> fogging pass consumes, the counterpart to the ozone shock tile for odor that fogging reaches better.
> Adds one tile to **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits
> spec.md through spec-v152.md.
>
> **The gap, and the evidence for it.** Ozone (v148) oxidizes odor in an empty structure, but fogging
> deodorant -- a fine fog that penetrates the same porous paths the smoke took -- is the other half of
> the deodorization toolkit, and it is dosed by volume against a label rate in ounces per 1,000 cubic
> feet. A second pass after re-cleaning is common. The tech has to know how much deodorant to mix and
> carry per structure, and there is no tile for it; thermal fogging also carries its own caution (a hot
> fog from an open flame), which belongs on the card.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
structure volume is `L^3` (ft^3); the label dose rate is a volume per volume (`L^3` per 1,000 ft^3,
ounces); the treatment count is `dimensionless`; the deodorant quantity is `L^3` (ounces, and gallons
via the 128 fl oz/gal constant). The dose rate is editable from the product label. The v18/v21
contract: any non-finite input, a non-positive volume or dose rate, or a treatment count below 1
returns `{ error }`; there is no unguarded division. Citation discipline (v19/v22):
`GOVERNANCE.general` over the volume-based fogging dosage, by name; `editionNote` names ANSI/IICRC S700,
states the **label rate and dwell govern**, and that a thermal fogger produces a hot fog -- the space
is unoccupied, smoke detectors are managed, and a fire watch applies; ULV is the cold alternative. This
sizes quantity only.

## 2. The tile

### 2.1 `thermal-fog-deodorization` -- Fog Deodorizer Dosage

```
inputs:
  structure_volume_ft3   L^3            volume to treat (area x ceiling height)
  dose_oz_per_1000ft3    L^3            label dose rate (default 5 oz per 1,000 ft^3)
  treatments             dimensionless  fogging passes (default 1)

deodorant_oz  = (structure_volume_ft3 / 1000) x dose_oz_per_1000ft3 x treatments
deodorant_gal = deodorant_oz / 128
```

**Pinned worked example.** An 8,000 ft^3 structure at 5 oz per 1,000 ft^3, one pass:
`deodorant = (8000/1000) x 5 x 1 = 40 oz = 0.31 gal`.
**Cross-check (a second pass doubles the mix).** Two passes after re-cleaning:
`deodorant = (8000/1000) x 5 x 2 = 80 oz = 0.63 gal`. The label rate and dwell govern; with a thermal
fogger the structure is unoccupied and a fire watch applies; this sizes the quantity.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the volume-based dosage and the 128 fl oz/gal constant,
`editionNote` naming ANSI/IICRC S700, the label-and-dwell-govern caveat, and the thermal-fog hot-fog /
fire-watch caution); `test/fixtures/worked-examples.json` (example + cross-check);
`test/fixtures/compute-map.js` (`thermal-fog-deodorization` -> `computeThermalFogDeodorization` in
`../../calc-restoration.js`); `scripts/related-tiles.mjs` (-> `ozone-shock-treatment` /
`soot-cleaning-takeoff` / `smoke-ejector-cfm`); `data/search/aliases.json` ("thermal fog", "ULV
fogging", "deodorizer", "odor counteractant", "fogging dosage", "smoke odor"); the id appended to the
existing `RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus
+ tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check, and error seams
(non-finite, volume / dose <= 0, treatments < 1). Raise the `calc-restoration.js` size cap by ~20
percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the ounces and gallons lines
plus the fire-watch caution wrap on a phone); render-no-nan + a11y sweep, output read to the value
(8,000 ft^3 / 5 / 1 -> 40 oz, 0.31 gal).

## 5. Roadmap position

Completes the deodorization pair with ozone (v148) in the fire family, downstream of the residue-method
gate (v152). Further Group D growth stays evidence-driven.
