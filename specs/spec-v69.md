# roughlogic.com Specification v69 -- Surface Prep, Coatings, and Abatement (Groups E and D, 3 New Tiles)

> **Implementation status: OPEN (proposed 2026-06-13; targets package 0.63.0, a
> minor; catalog 621 -> 624, Group E +2, Group D +1).** v69 inherits everything
> from spec.md through spec-v68.md and changes none of it. It assumes v68 has
> landed (catalog base 621).
>
> v69 closes the dirty-jobs expansion (v65 -> v69) with the surface-prep and
> hazardous-material work that lives between demolition and finish: industrial
> coatings, abrasive blasting, and asbestos / lead abatement containment. The
> catalog has a residential `paint-coverage` tile and the restoration ventilation
> bench (`confined-space-vent`, `smoke-ejector-cfm`, `hepa-filter-life`), but it has
> never had the industrial coatings math (coverage from volume-solids and a target
> dry-film thickness), the blasting math (compressor air and abrasive consumption by
> nozzle), or the abatement take-off (containment poly, negative-air machines, and
> regulated-waste bags). These are dirty, regulated trades a painter, blaster, and
> abatement contractor run every day. **No new dependencies, no telemetry, no AI, US
> standards only.** The two surface-prep tiles land in `calc-construction.js`
> (Group E); the abatement tile lands in `calc-restoration.js` (Group D) next to the
> ventilation bench it builds on.
>
> **The gap, and the evidence for it.** A concept-check for
> volume-solids / DFT / WFT / theoretical-coverage / practical-coverage /
> abrasive-blast / nozzle-cfm / abrasive-consumption / abatement / containment /
> negative-air-machine / regulated-waste returned nothing. `paint-coverage` is a
> residential square-feet-per-gallon estimate with no volume-solids, no dry-film
> thickness, and no loss factor; it cannot size an industrial coat to a spec. No
> tile sizes blasting air or abrasive, and none sizes an abatement containment.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `coating-coverage-dft` carries a dimensionless
  volume-solids fraction and a film thickness (mils) producing a coverage
  (area-per-volume) and a volume (gallons); `abrasive-blast` carries a nozzle
  diameter and a pressure producing an air-flow rate (cfm) and a mass / mass-rate
  (lb, lb/hr, tons); `abatement-containment` carries lengths producing areas
  (`L^2`, poly square feet), a volume and an air-change rate producing a flow (cfm)
  and a machine count, and a debris volume producing a bag count.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive volume-solids, DFT, area, nozzle size, pressure, room dimension, or
  ACH returns `{ error }`. A volume-solids over 100% returns `{ error }`. Machine
  counts, bag counts, and load counts are `ceil` of finite ratios. Every coverage,
  flow, and quantity is a bounded function of finite inputs.
- The v19/v22 citation discipline applies, all three using **`GOVERNANCE.general`**.
  Sources are named, never reproduced: **SSPC / AMPP PA 2** (Procedure for
  Determining Conformance to Dry Coating Thickness Requirements) and the
  **SSPC / AMPP surface-preparation (SP) specifications** for blasting; the
  **1604 ft^2-mil-per-gallon** coverage constant; and for abatement,
  **EPA NESHAP 40 CFR 61 Subpart M** (asbestos), **EPA RRP 40 CFR 745** (lead in
  renovation), and **OSHA 29 CFR 1926.1101** (asbestos) / **1926.62** (lead). None
  is law the tile restates; the coating manufacturer's product data sheet, the
  blasting nozzle manufacturer's chart, and a licensed / certified abatement
  contractor govern.
- Tile ids are kebab-case and checked against the post-v68 live ids. None collides
  or duplicates `paint-coverage`, `sprayer-calibration`, `confined-space-vent`,
  `smoke-ejector-cfm`, or `hepa-filter-life` (see Section 3).

## 2. The tiles

### 2.1 `coating-coverage-dft` -- Coating Coverage from Volume-Solids and DFT (Group E, calc-construction.js)

An industrial coat is specified by its dry-film thickness, and the paint that
delivers it depends on how much of the can is solids. This tile turns volume-solids
and a target DFT into the theoretical and practical coverage, the gallons for an
area, and the wet-film thickness to check with a gauge during application.

```
inputs:
  vol_solids_pct  -     volume solids of the product (from the product data sheet)
  dft_mils        L     target dry-film thickness (mils)
  area_ft2        L^2   area to coat
  loss_pct        -     application / overspray / waste loss (default 35 for spray)

theoretical_cov_ft2_gal = 1604 * (vol_solids_pct/100) / dft_mils
practical_cov_ft2_gal   = theoretical_cov_ft2_gal * (1 - loss_pct/100)
gallons                 = area_ft2 / practical_cov_ft2_gal
wft_mils                = dft_mils / (vol_solids_pct/100)
```

Outputs: the theoretical coverage, the practical coverage after losses, the gallons
required, and the wet-film thickness to read on a wet gauge. The note line states:
1604 is the exact conversion (a gallon spread one mil thick covers 1604 ft^2 at
100% solids); the product data sheet's volume-solids is the governing number and
thinning lowers it; the loss factor is the honest difference between theory and the
job and 35% spray loss is a default, not a promise; DFT is verified with a gauge per
SSPC / AMPP PA 2 (a number of readings over the area), not assumed from the WFT; and
multiple coats and touch-up are not in this single-coat number.

**Worked example (pinned).** A coat at 60% volume-solids, 5.0 mil DFT, 2,000 ft^2,
35% loss: theoretical = 1604 x 0.60 / 5.0 = **192.5 ft^2/gal**; practical = 192.5 x
0.65 = **125.1 ft^2/gal**; gallons = 2,000 / 125.1 = **16.0 gal**; WFT = 5.0 / 0.60
= **8.33 mils**. Cross-check (high-solids 80%, same DFT and area): theoretical 256.6,
practical 166.8, gallons 12.0, WFT 6.25 mils (more solids, fewer gallons). Cross-
check (thicker 10 mil DFT, 60% solids): theoretical 96.2, practical 62.6, gallons
32.0. Degenerate inputs (solids <= 0 or > 100, DFT <= 0, area <= 0, loss < 0 or >=
100, non-finite) return an error.

### 2.2 `abrasive-blast` -- Abrasive Blast Air and Abrasive Consumption (Group E, calc-construction.js)

Blasting is sized by the nozzle: the bore and the pressure set the compressor air,
the abrasive consumption, and the production. This tile takes the nozzle and the
pressure and returns the air-flow, the compressor horsepower, and the abrasive
consumption, plus the total abrasive for an area at a given consumption.

```
inputs:
  nozzle_bore_in   L      nozzle orifice diameter (e.g. 3/8 in = 0.375)
  pressure_psi     F/L^2  blast pressure at the nozzle
  area_ft2         L^2    area to blast
  lb_per_ft2       -      abrasive consumption per ft^2 (from the spec / profile, default 8)

bundled representative values at 100 psi (the nozzle maker's chart governs):
  bore 3/16 in -> ~74 cfm, ~178 lb/hr     bore 1/4 in -> ~137 cfm, ~296 lb/hr
  bore 5/16 in -> ~196 cfm, ~530 lb/hr    bore 3/8 in -> ~283 cfm, ~768 lb/hr
  bore 7/16 in -> ~385 cfm, ~1032 lb/hr   bore 1/2 in -> ~503 cfm, ~1320 lb/hr

scale = pressure_psi / 100                       (approx linear scaling, with caveat)
cfm           = base_cfm(bore) * scale
compressor_hp = cfm / 4                           (~4 cfm per hp rule of thumb)
abrasive_lb_hr = base_lb_hr(bore) * scale
abrasive_lb   = area_ft2 * lb_per_ft2
abrasive_tons = abrasive_lb / 2000
```

Outputs: the nozzle air-flow (cfm), the compressor horsepower needed, the abrasive
consumption (lb/hr), and the total abrasive for the area (lb and tons). The note
line states: the bundled nozzle values are representative at 100 psi and the nozzle
manufacturer's chart is the real source; pressure scaling is approximate and nozzle
wear opens the bore and runs the numbers up over a shift; the abrasive-per-ft^2
swings widely with the surface, the profile spec, and the abrasive, and 8 lb/ft^2 is
a heavy-prep default; and blasting is silica / lead / dust-regulated work requiring
respiratory protection, containment, and air monitoring per OSHA.

**Worked example (pinned).** A 3/8 in nozzle at 100 psi, 3,000 ft^2 at 8 lb/ft^2:
cfm = 283 x 1.0 = **283 cfm**; compressor = 283 / 4 = **70.8 hp** (use a 75 hp /
~375 cfm machine for margin); abrasive consumption = **768 lb/hr**; total abrasive =
3,000 x 8 = 24,000 lb = **12.0 tons**. Cross-check (same nozzle at 120 psi): scale
1.2 -> cfm 340, compressor 84.9 hp, abrasive 922 lb/hr. Cross-check (1/2 in nozzle,
100 psi): cfm 503, compressor 125.8 hp. Degenerate inputs (bore <= 0, pressure <= 0,
area <= 0, lb_per_ft2 <= 0, non-finite) return an error.

### 2.3 `abatement-containment` -- Asbestos / Lead Containment, Negative Air, and Waste (Group D, calc-restoration.js)

An abatement containment is a sealed room held under negative pressure while the
hazardous material comes out into regulated bags. This tile takes the room
dimensions and returns the poly sheeting, the negative-air machines for the required
air changes, and the regulated-waste bag count.

```
inputs:
  room_len_ft    L      containment length
  room_wid_ft    L      containment width
  room_ht_ft     L      containment height
  ach_target     -      air changes per hour (asbestos practice default 4)
  nam_cfm        L^3/T  rated airflow of one negative-air (HEPA) machine (default 1500)
  debris_cy      L^3    volume of regulated debris to bag out
  floor_layers   -      poly layers on the floor (default 2)
  wall_layers    -      poly layers on the walls (default 1)

volume_cf   = room_len_ft * room_wid_ft * room_ht_ft
floor_sf    = room_len_ft * room_wid_ft
wall_sf     = 2 * (room_len_ft + room_wid_ft) * room_ht_ft
poly_sf     = (floor_sf * floor_layers + wall_sf * wall_layers) * 1.10     (10% laps/waste)
req_cfm     = volume_cf * ach_target / 60
nam_count   = ceil(req_cfm / nam_cfm)
waste_bags  = ceil(debris_cy * 27 / 4.4)        (4.4 ft^3 usable per 33-gal disposal bag)
```

Outputs: the poly sheeting (square feet, including a 10% lap/waste allowance), the
required exhaust airflow and the count of negative-air machines to deliver it, and
the regulated-waste bag count. The note line states: 4 air changes per hour and the
negative-pressure containment are industry practice for asbestos and the actual
negative pressure is verified continuously with a manometer, not assumed; this is a
take-off, not an abatement plan, and a licensed asbestos / certified lead (RRP)
contractor governs the design, the decon, and the air clearance; asbestos waste is
RACM and lead debris is regulated -- double-bagged, labeled, and manifested to a
permitted facility; and the worker-protection, monitoring, and clearance
requirements of OSHA 1926.1101 / 1926.62 and EPA NESHAP / RRP are not optional.

**Worked example (pinned).** A 20 ft x 15 ft x 9 ft containment, 4 ACH, 1,500 cfm
machines, 3 cy of debris, 2 floor layers, 1 wall layer: volume = 2,700 ft^3; floor =
300 ft^2, walls = 2 x 35 x 9 = 630 ft^2; poly = (300 x 2 + 630 x 1) x 1.10 = 1,230 x
1.10 = **1,353 ft^2**; required exhaust = 2,700 x 4 / 60 = **180 cfm**; machines =
ceil(180 / 1500) = **1**; waste bags = ceil(3 x 27 / 4.4) = ceil(18.4) = **19 bags**.
Cross-check (large room 40 x 30 x 12, 6 ACH, 1,000 cfm machines): volume 14,400 ->
required 1,440 cfm -> ceil(1,440 / 1,000) = **2** machines. Degenerate inputs (any
dimension <= 0, ACH <= 0, nam_cfm <= 0, debris < 0, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the post-v68 live tiles. `paint-coverage` is a residential
ft^2-per-gallon estimate with no volume-solids, no dry-film thickness, and no loss
factor; `coating-coverage-dft` is the industrial spec method (volume-solids x 1604 /
DFT, with WFT and a loss factor) it cannot do, and the two read as a residential /
industrial pair. `sprayer-calibration` (Group L) calibrates an agricultural boom
sprayer's output, unrelated to coating film build. The restoration ventilation bench
(`confined-space-vent`, `smoke-ejector-cfm`, `hepa-filter-life`) sizes airflow for a
drying or purge job; `abatement-containment` reuses the air-change idea but adds the
poly take-off, the negative-air machine count, and the regulated-waste bags none of
them computes, and it sits next to them in `calc-restoration.js`. No tile sizes
blasting air or abrasive. **All three ship.**

Per-tile wiring: `coating-coverage-dft` and `abrasive-blast` each get a
`tools-data.js` row (group `E`, trades `["carpentry"]` plus a new `"coatings"` trade
label; `abrasive-blast` also tags `"fabrication"` to match the existing steel-prep
audience); `abatement-containment` gets a row (group `D`, trades `["restoration"]`).
Each gets a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`; formula string; assumptions listing every bundled constant --
the 1604 coverage constant, the 35% spray-loss default, the representative nozzle
cfm / lb-hr table and the 4-cfm-per-hp and 8-lb/ft^2 defaults, and the 4 ACH /
1,500 cfm / 4.4 ft^3-per-bag / 2-floor-1-wall poly defaults -- and naming SSPC/AMPP
PA 2 and the SP specs, EPA NESHAP 40 CFR 61 Subpart M, EPA RRP 40 CFR 745, and OSHA
1926.1101 / 1926.62 by name without reproduction);
`test/fixtures/worked-examples.json` (every pinned example and cross-check);
`test/fixtures/compute-map.js` (`coating-coverage-dft` and `abrasive-blast` ->
`../../calc-construction.js`; `abatement-containment` -> `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (`coating-coverage-dft` -> `paint-coverage` /
`abrasive-blast` / `material-quantity`; `abrasive-blast` -> `coating-coverage-dft` /
`demo-debris` / `confined-space-vent`; `abatement-containment` ->
`mold-remediation-level` / `smoke-ejector-cfm` / `hepa-filter-life`);
`data/search/aliases.json` (e.g. `coating-coverage-dft`: "DFT", "dry film
thickness", "volume solids", "WFT", "coating coverage", "mils"; `abrasive-blast`:
"sandblasting", "abrasive blast", "blast nozzle", "grit", "compressor cfm", "surface
prep"; `abatement-containment`: "asbestos", "lead", "abatement", "containment",
"negative air", "poly", "RRP", "NESHAP"); the `app.js` `CONSTRUCTION_RENDERERS`
registers the two coatings renderers and `RESTORATION_RENDERERS` registers the
abatement renderer; the `// dims:` annotations; and the regenerated v14 corpus +
tile-index. A `test/unit/bounds-fuzzer.test.js` block pins every worked example, the
volume-solids-over-100 error seam, the pressure-scaled nozzle branch, the
two-machine abatement branch, and every other error seam.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate; the wiring lint reports the new
renderers across both `CONSTRUCTION_RENDERERS` and `RESTORATION_RENDERERS`; the
spec-v49 `check-readme-counts` gate agrees at **624 tiles** and the matching sitemap
URL count); `npm test` (+3 tiles' fixtures); `npm run build` (624 tile shells,
regenerated sitemap); `npm run data:verify`; the worked-examples runner (+3 fixtures
with cross-checks); the 320 px shell audit (the coverage / gallons / WFT, the cfm /
hp / abrasive lb-hr / tons, and the poly / cfm / machine / bag outputs all wrap, not
scroll, on a phone); and the full-catalog render-no-nan Chromium sweep plus the a11y
gate, with the rendered output read to the value (60% solids @ 5 mils over 2,000
ft^2 -> 125.1 ft^2/gal / 16.0 gal / 8.33 WFT; 3/8 in @ 100 psi -> 283 cfm / 768
lb/hr; 20 x 15 x 9 @ 4 ACH -> 1,353 ft^2 poly / 180 cfm / 1 machine / 19 bags).

## 5. Roadmap position

v69 closes the dirty-jobs expansion (v65 -> v69). Counting the run end to end: a new
Group Z (Rigging and Heavy Lift) with thirteen tiles for the crane-and-rigging crew
(v65 -> v66); a deepened earthwork bench in Group E (v67); a tree-care and arborist
rigging bench in Group L (v68); and the surface-prep, coatings, and abatement tiles
across Groups E and D (v69). A heavy-civil and industrial-services job now reads
across the catalog the way the work runs -- rig and set the steel, move and shape the
dirt, take down the trees, and prep, coat, and abate the surfaces. Further growth in
any of these benches should be evidence-driven (a named gap a working tradesperson
hits), not catalog-filling; the standing module-cap watch covers `calc-rigging.js`,
`calc-construction.js`, `calc-agriculture.js`, and `calc-restoration.js`, with the
already-authorized per-tile splits ready if any row crosses its byte cap.
