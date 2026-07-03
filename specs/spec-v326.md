# roughlogic.com Specification v326 -- Relative Compaction from Field Density and Proctor Maximum (calc-earthwork.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.115.0; proposed 2026-07-02). Batch spec-v326..v328 (the soil characterization/QC trio -- the earthwork
> and soil-testing numbers the volume-conversion tile never covers: the relative compaction of a placed lift (this spec),
> the soil phase relations (void ratio, porosity, saturation) (v327), and the Atterberg plasticity indices (v328).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `soil-swell-shrink` converts bank to compacted volume,
> but the field QC that accepts or rejects a lift -- the relative compaction from a nuclear-gauge or sand-cone field density
> against the Proctor maximum -- is the number an earthwork inspector reads all day, and the catalog has no tile for it.
> Adds one tile to the existing **`calc-earthwork.js`** module (Group E); no new group, trade, or dependency. Inherits
> spec.md through spec-v325.md.
>
> **The gap, and the evidence for it.** Relative compaction is the field dry density as a percentage of the laboratory
> Proctor maximum dry density: `RC = (gamma_d,field / gamma_d,max) x 100`, with the field dry density backed out of the
> measured wet density and moisture, `gamma_d,field = gamma_wet / (1 + w)`. For a field wet density of 128 pcf at 12%
> moisture against a Proctor maximum of 120 pcf, `gamma_d,field = 128/1.12 = 114.3 pcf` and `RC = 114.3/120 x 100 = 95.2%`
> -- passing a typical 95% structural-fill specification, and the pass/fail an inspector records at every test point. Drop
> the moisture reading or the density and the same soil can fail; the relationship, not a rule of thumb, decides it.
> `soil-swell-shrink` tracks the volume; this tile grades the compaction.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The field wet and dry
densities and the Proctor maximum dry density are unit weights (pcf); the moisture content `w` is a dimensionless percentage;
the relative compaction and the spec threshold are dimensionless percentages. The v18/v21 contract: any non-finite input,
or a density or `(1 + w)` at or below zero, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the
relative-compaction relation by name; `editionNote` names **the relative compaction `RC = (gamma_d,field/gamma_d,max) x 100`,
the field dry density `gamma_d,field = gamma_wet/(1 + w)`, the Proctor maximum from ASTM D698 (standard) or D1557 (modified),
and typical specs of 90 to 95% (structural fill often 95%, pavement subgrade higher)**, and states that **this returns the
relative compaction and the pass/fail against an entered spec -- it uses the entered Proctor maximum (which depends on the
standard vs modified test and the soil), takes the field density from a nuclear gauge or sand cone as entered, and does not
compute the optimum-moisture window, the one-point Proctor, or the relative density of a cohesionless soil (a different `Dr`
index); and this is a QC aid** -- the project geotechnical specification and the testing agency govern.

## 2. The tile

### 2.1 `relative-compaction` -- Relative Compaction from Field Density and Proctor Maximum

```
inputs:
  wet_pcf    pcf    field wet (total) density
  w_pct      %      field moisture content
  max_pcf    pcf    Proctor maximum dry density
  spec_pct   %      required relative compaction (default 95)

gd_field = wet_pcf / (1 + w_pct/100)             ; field dry density, pcf
RC = gd_field / max_pcf * 100                    ; relative compaction, %
pass = RC >= spec_pct
```

**Pinned worked example (128 pcf wet at 12% moisture, Proctor max 120 pcf, 95% spec).** `wet = 128`, `w = 12`, `max = 120`:
`gamma_d,field = 128/1.12 = 114.3 pcf`; `RC = 114.3/120 x 100 = 95.2% >= 95%` -> **pass**. **Cross-check (the same density,
wetter of optimum at 16%).** `gamma_d,field = 128/1.16 = 110.3 pcf`; `RC = 110.3/120 x 100 = 91.9% < 95%` -> **fail** -- the
same wet density fails when the extra water is not soil, the reason the moisture reading is as important as the density and
why over-wet fill is rejected. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","surveying"]`, matching `soil-swell-shrink`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the relative-compaction relation, `editionNote` naming
`RC = (gamma_d,field/gamma_d,max) x 100`, `gamma_d,field = gamma_wet/(1 + w)`, the D698/D1557 basis, the 90-95% specs, and
the enter-Proctor, not-Dr caveats); `test/fixtures/worked-examples.json` (the passing example + the over-wet fail cross-
check); `test/fixtures/compute-map.js` (`relative-compaction` -> `computeRelativeCompaction` in `../../calc-earthwork.js`);
`scripts/related-tiles.mjs` (-> `soil-swell-shrink` / `soil-phase-relations` / `bulk-density` / `soil-bearing-capacity`);
`data/search/aliases.json` ("relative compaction", "percent compaction", "field density test", "Proctor compaction",
"nuclear gauge compaction", "sand cone", "95 percent compaction", "dry density field", "compaction QC"); the id appended to
the existing earthwork renderers block in `app.js`; the `// dims:` annotation (densities unit weight, `w`/`RC`/`spec`
dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
moisture-back-out of dry density, the spec pass/fail, and the non-positive / non-finite error seams. No new module; re-pin
`calc-earthwork.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the moisture-backout assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `gd_field` / `RC` / pass stack wraps
on a phone); render-no-nan + a11y sweep, output read to the value (128 pcf at 12% -> 95.2%, pass).

## 5. Roadmap position

Opens the soil characterization/QC batch (v326..v328) in `calc-earthwork.js`, adding the field compaction grade to the
volume-conversion tile. The soil phase relations (v327) and the Atterberg indices (v328) follow. The optimum-moisture
window from the Proctor curve, the relative density `Dr` for cohesionless soils, and the one-point Proctor family-of-curves
method are the deliberate next follow-ons once the trio lands.
