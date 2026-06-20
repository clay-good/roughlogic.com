# roughlogic.com Specification v112 -- Storage Water-Heater Sizing by First-Hour Rating and Peak-Hour Demand (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED 2026-06-20 (package 0.70.0, catalog 676 -> 687 across spec-v112..v119).** In-scope catalog expansion under
> the spec-v106 charter: one Tier-1 plumbing tile from first-principles thermodynamics and the
> public DOE / AHRI first-hour-rating method, AHJ-and-manufacturer governed, redo-not-harm. Adds
> one tile to **`calc-plumbing.js`** (Group B); no new module, group, or dependency. Inherits
> spec.md through spec-v111.md.
>
> **The gap, and the evidence for it.** The catalog computes water-heater recovery
> (`Water Heater Recovery Rate`) and tankless flow (`Tankless Water Heater GPM`) but never sizes a
> storage heater to the household's peak demand: the first-hour rating (usable storage plus one
> hour of recovery) checked against the peak-hour draw. That is the number a plumber needs to pick
> a tank.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Flow is `L^3 T^-1`, energy rate `M L^2 T^-3`, temperature difference `T`. Bundled constants
(8.33 lb/gal water, the default 0.70 usable-storage fraction) are annotated editable fields. The
v18/v21 contract: any non-finite input, or a non-positive tank, input rate, efficiency, or
temperature rise, returns `{ error }`; the only division is by a guarded-positive rise. Citation
discipline (v19/v22): `GOVERNANCE.general` over the recovery relation Q = 8.33 x gph x delta-T and
the DOE/AHRI first-hour-rating definition; the manufacturer's rated FHR and the AHJ govern.

## 2. The tile

### 2.1 `water-heater-storage-sizing` -- Storage Water-Heater First-Hour Rating vs Peak Demand

```
inputs:
  tank_gal           L^3            storage tank capacity
  input_btuh         M L^2 T^-3     burner / element input
  efficiency_pct     dimensionless  recovery efficiency (default 80)
  rise_F             T              temperature rise (set point minus inlet, default 90)
  usable_fraction    dimensionless  usable storage before temp drop (default 0.70)
  peak_hour_gal      L^3            peak-hour hot-water demand (for the verdict)

recovery_gph = input_btuh x efficiency_pct/100 / (8.33 x rise_F)
fhr_gph      = tank_gal x usable_fraction + recovery_gph
verdict: fhr_gph >= peak_hour_gal -> adequate ; else short by (peak_hour_gal - fhr_gph)
```

**Pinned worked example.** 50 gal tank, 40,000 BTU/hr, 80 percent, 90 F rise, 0.70 usable:
`recovery = 40000 x 0.80 / (8.33 x 90) = 42.7 gph`, `fhr = 50 x 0.70 + 42.7 = 77.7 gph`. Against
an 80 gal peak-hour demand -> short by 2.3 gph. **Cross-check:** the same tank with a 50,000 BTU/hr
input -> `recovery = 53.4`, `fhr = 88.4 gph` -> adequate. The manufacturer's rated FHR governs the
final selection.

## 3. Wiring

A `tools-data.js` row (group `B`, trade `["plumbing"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, formula string, constants listed);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`water-heater-storage-sizing` -> `computeWaterHeaterStorageSizing` in `../../calc-plumbing.js`);
`scripts/related-tiles.mjs` (-> `water-heater-recovery-rate` / `tankless-water-heater-gpm` /
`water-heater-thermal-expansion-tank`); `data/search/aliases.json` ("first hour rating", "fhr",
"size water heater", "peak hour demand", "storage heater sizing"); the id appended to the existing
`PLUMBING_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check, and error seams.
Raise the `calc-plumbing.js` `check-module-sizes.mjs` cap by ~20 percent if needed (dated
comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned to the
live total **+1 tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the FHR
and recovery lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (50 gal /
40k / 80% / 90 F -> 42.7 gph recovery, 77.7 gph FHR).

## 5. Roadmap position

Completes the storage-heater selection math alongside the existing recovery and expansion tiles.
Further Group B growth stays evidence-driven.
