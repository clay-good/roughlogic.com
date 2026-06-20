# roughlogic.com Specification v103 -- Plumber/Well Disinfection Bench: New-Main Chlorination and Well Shock-Chlorination (New Module calc-disinfect.js, Group B, 2 New Tiles)

> **Implementation status: LANDED 2026-06-19 (catalog 663 -> 665; 25 groups; landed
> together with v101 + v102 as the field-service design bench pass, package 0.66.0, a
> minor stamp).** v103 inherits everything from spec.md through spec-v102.md and
> changes none of it. It adds two tiles to **Group B (Plumbing)** and changes no existing
> tile's output. **No new group, no new dependencies, no telemetry, no AI, US standards
> only.** Both tiles land in a new **`calc-disinfect.js`** bench (the chlorination a plumber
> or well contractor does on a new line or well), keeping `calc-plumbing.js` off its cap --
> see the §3 module note.
>
> **The gap, and the evidence for it.** Group B is the second-deepest group (53 rows) on the
> sizing, drainage, venting, and service side: `pipe-sizing`, `pipe-volume`, `wsfu-demand`,
> `vent-sizing-stack`, `backflow-sizing`, `water-heater-recovery`, and the rest. And Group M
> (Water/Wastewater operations) carries the *treatment-plant* chlorine chemistry:
> `disinfection-ct`, `chlorine-decay`, `chemical-feed-pump`, `coagulant-dose`. But there is
> no tile for the everyday job a plumber or well-and-pump contractor does: **disinfecting a
> newly installed water line or well** before it goes into service. A concept-check of the
> post-v102 live ids for `chlorinat`, `disinfect`, and `main disinfection` returned only the
> Group M plant tiles (`disinfection-ct` is a CT-contact compliance calc for a treatment
> barrier, not a pipe/well dosing job). Neither sizes the **pounds of hypochlorite for a new
> main** by AWWA C651 nor the **bleach for a well shock** by casing volume. These are daily
> numbers a contractor reaches for after a repair or a new install.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. Both tiles carry a pipe/well volume (a length times a diameter
  squared times the 0.0408 gallons-per-foot-per-square-inch geometric constant to a volume
  in gallons), then a volume (in million gallons) times a dose (milligrams per liter) times
  the 8.34 pounds-per-gallon water basis to a mass of available chlorine (pounds), then a
  divide by a dimensionless available-chlorine fraction to a product quantity. Every
  constant -- the 0.0408 gal per ft per in^2, the 8.34 lb per gallon, and the 1,000,000
  gallons per million gallons -- is bundled and annotated.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. For both:
  a non-positive diameter, length/water-column, dose/target-ppm, or available-chlorine
  percent returns `{ error }`; an available-chlorine percent outside the open interval
  (0, 100] returns `{ error }`. The product quantity is reported alongside the 100%-available
  chlorine weight so the result is independent of the chosen product strength.
- The v19/v22 citation discipline applies. Both use **`GOVERNANCE.general`** (these are
  dosing arithmetic; the standard and the local health authority govern, and the AHJ/state
  well code is the law). Sources are named, never reproduced: **AWWA C651** (Disinfecting
  Water Mains -- the dose/contact-time methods, e.g. roughly 25 mg/L held about 24 hours or
  about 50 mg/L held about 3 hours, and the requirement to flush and pass a bacteriological
  test before return to service, are stated, not quoted); and the **AWWA A100 / state
  private-well guidance** for well shock-chlorination (target concentrations of roughly 50
  to 200 ppm with a stated standing time). The note states that the standard, the local
  health department, and the AHJ govern the mandatory dose, contact time, dechlorination,
  and the required bacteriological clearance before the line or well is used.
- Tile ids are kebab-case and checked against the post-v102 live ids. Neither collides with
  `disinfection-ct` (Group M), `chlorine-decay` (Group M), `chemical-feed-pump` (Group M),
  `pool-turnover` (Group M), or any other live tile (see Section 3).

## 2. The tiles

### 2.1 `main-disinfection-chlorine` -- New Water Main Chlorination (Group B, calc-disinfect.js)

The chlorine to charge a newly installed or repaired water main, the AWWA C651 way: pipe
volume from the diameter and length, the available chlorine for the dose, and the product
weight at its strength.

```
inputs:
  diameter_in        L    pipe inside diameter (in)
  length_ft          L    length of main to disinfect (ft)
  dose_mg_l          -    chlorine dose (mg/L; default 25 for the ~24-hour method)
  product_pct        -    available-chlorine percent of the product (default 65 = HTH-type cal-hypo)

volume_gal           = 0.0408 * diameter_in^2 * length_ft
available_cl_lb      = (volume_gal / 1,000,000) * dose_mg_l * 8.34
product_lb           = available_cl_lb / (product_pct / 100)
```

Outputs: the pipe volume in gallons, the pounds of available (100%) chlorine for the dose,
and the pounds of product at the entered strength. The note line states: AWWA C651 sets the
method -- a common one is about 25 mg/L held about 24 hours, another about 50 mg/L held
about 3 hours; calcium hypochlorite (HTH-type) is roughly 65 to 70 percent available
chlorine by weight and sodium hypochlorite (liquid) is the trade percent on the label (for a
liquid, gallons are about the pounds divided by 8.34 times the product specific gravity);
the main must be flushed and pass a bacteriological test, and any chlorinated water must be
dechlorinated before discharge; the standard and the AHJ govern.

**Worked example (pinned).** An 8 in main, 1000 ft, at 25 mg/L with 65% cal-hypo: volume =
0.0408 x 64 x 1000 = **2611 gal**; available chlorine = (2611 / 1,000,000) x 25 x 8.34 =
**0.544 lb**; product = 0.544 / 0.65 = **0.837 lb** of cal-hypo. Cross-check (a 6 in main,
500 ft, the 50 mg/L / 3-hour method, 12.5% liquid): volume = 0.0408 x 36 x 500 = **734
gal**; available chlorine = (734 / 1,000,000) x 50 x 8.34 = **0.306 lb**; product = 0.306 /
0.125 = **2.45 lb** of 12.5% liquid (about a quarter gallon). Degenerate inputs
(diameter_in <= 0, length_ft <= 0, dose_mg_l <= 0, product_pct <= 0 or > 100, non-finite)
return an error.

### 2.2 `well-shock-chlorination` -- Well Shock-Chlorination (Group B, calc-disinfect.js)

The household bleach to shock-chlorinate a private well, from the casing diameter and the
standing water column: well water volume, the available chlorine for the target ppm, and the
bleach to pour in.

```
inputs:
  casing_diameter_in L    well casing inside diameter (in)
  water_column_ft    L    standing water column height (ft, static level to bottom)
  target_ppm         -    target chlorine concentration (ppm; default 100)
  bleach_pct         -    available chlorine of the bleach (percent; default 6)

well_volume_gal      = 0.0408 * casing_diameter_in^2 * water_column_ft
available_cl_lb      = (well_volume_gal / 1,000,000) * target_ppm * 8.34
bleach_gal           = well_volume_gal * target_ppm / (1,000,000 * (bleach_pct / 100))
```

Outputs: the well water volume in gallons, the pounds of available (100%) chlorine for the
target, and the bleach volume in gallons (with a quart/ounce echo for small amounts). The
note line states: a shock target is commonly about 50 to 200 ppm held overnight (often 12
to 24 hours), then pumped to waste until the chlorine clears and the well retested;
circulate the treated water back down the casing and through every fixture so the whole
system is dosed; use plain unscented household bleach (sodium hypochlorite, about 5 to 8.25
percent) -- this simplified count ignores the slight bleach specific gravity, so round up;
and the local health department and state well code govern the required procedure and the
bacteriological clearance.

**Worked example (pinned).** A 6 in casing with a 100 ft standing column, target 100 ppm, 6%
bleach: well volume = 0.0408 x 36 x 100 = **147 gal**; available chlorine = (147 /
1,000,000) x 100 x 8.34 = **0.122 lb**; bleach = 147 x 100 / (1,000,000 x 0.06) = **0.245
gal** (about 1 quart). Cross-check (a 4 in casing, 60 ft column, target 200 ppm, 8.25%
bleach): well volume = 0.0408 x 16 x 60 = **39.2 gal**; bleach = 39.2 x 200 / (1,000,000 x
0.0825) = **0.095 gal** (about 12 fl oz). Degenerate inputs (casing_diameter_in <= 0,
water_column_ft <= 0, target_ppm <= 0, bleach_pct <= 0 or > 100, non-finite) return an
error.

## 3. Concept-check and wiring

Concept-checked against the post-v102 live tiles. The Group M chlorine tiles are
treatment-plant operations: `disinfection-ct` is a USEPA SWTR CT-contact compliance check
for a disinfection barrier, `chlorine-decay` models first-order residual decay over time,
`chemical-feed-pump` sets a metering-pump output, `pool-turnover` is pool chemistry; none
doses a new pipe or a well by volume. `pipe-volume` (Group B) gives a pipe's volume but
does not carry chlorine dosing. No live tile sizes new-main or well disinfection chlorine.
**Both ship** into the new `calc-disinfect.js`.

Per-tile wiring (each of the two): a `tools-data.js` row (group `B`;
`main-disinfection-chlorine` trades `["plumbing", "water"]`, `well-shock-chlorination`
trades `["plumbing", "water"]`); `tile-meta.js` `_TILES`; a `citations.js` entry (the
`GOVERNANCE.general` governance from Section 1; the formula string; assumptions listing
every bundled constant -- the 0.0408 gal per ft per in^2, the 8.34 lb per gallon, the
1,000,000 gal per MG, and the dose/target conventions -- naming AWWA C651 and the AWWA
A100 / state private-well guidance without reproduction); `test/fixtures/worked-examples.json`
(every pinned example and cross-check); `test/fixtures/compute-map.js`
(`main-disinfection-chlorine` -> `../../calc-disinfect.js`; `well-shock-chlorination` ->
`../../calc-disinfect.js`); `scripts/related-tiles.mjs` (`main-disinfection-chlorine` ->
`pipe-volume` / `hydrostatic-test` / `well-shock-chlorination`; `well-shock-chlorination` ->
`pipe-volume` / `main-disinfection-chlorine` / `disinfection-ct`); `data/search/aliases.json`
(e.g. `main-disinfection-chlorine`: "disinfect water main", "chlorinate pipe", "AWWA C651",
"new main chlorination", "hypochlorite dose"; `well-shock-chlorination`: "shock chlorinate
well", "shock a well", "bleach in well", "well disinfection", "shock chlorination"); a new
`DISINFECT_RENDERERS` declare in `app.js` carrying both ids; the `// dims:` annotations; and
the regenerated v14 corpus + tile-index. A `test/unit/bounds-fuzzer.test.js` block pins both
worked examples, the dry-product vs liquid-product path, the quart/ounce echo, and every
error seam.

**Module note.** `calc-plumbing.js` sits at ~48.6 KB gzipped against its 52,000 B cap
(~93.5%, already in WARN territory), so two more Group B tiles do not belong there. Per
spec-v10 §H.1 the preferred remediation at a brushing cap is a per-bench split, the pattern
used by v73 (`calc-drainage.js`), v78 (`calc-service.js`), and v86 (`calc-septic.js`). This
spec creates **`calc-disinfect.js`**, a new pipe/well disinfection bench, with a cap of
**4,000 B** (current + ~20% headroom; the two small tiles build to roughly 2 to 3 KB
gzipped). It is lazy-loaded and not in the home-view first-paint payload. Group letter (`B`)
is independent of the module; both tiles keep `group: "B"`.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate, including the module-size, wiring,
sw-precache, dimensions, corpus, tile-contract, and README-count gates;
`check-readme-counts` agrees at **665 tiles** and the matching sitemap URL count, and the
new `calc-disinfect.js` cap is registered in `scripts/check-module-sizes.mjs`); `npm test`
(+2 worked-example fixtures and their cross-checks; the new bounds-fuzzer block); `npm run
build` (665 tile shells, regenerated sitemap); `npm run data:verify`; the worked-examples
runner; the 320 px shell audit (the volume / available-chlorine / product lines all wrap,
not scroll, on a phone); and the full-catalog render-no-nan Chromium sweep plus the a11y
gate, with the rendered output read to the value (an 8 in x 1000 ft main at 25 mg/L / 65%
cal-hypo -> 2611 gal, 0.544 lb chlorine, 0.837 lb product; a 6 in x 100 ft well at 100 ppm /
6% bleach -> 147 gal, 0.245 gal bleach).

## 5. Roadmap position

v103 opens a disinfection bench with the two dosing numbers the plumbing and water-ops
groups did not cover for a field contractor. Further growth should stay evidence-driven (a
named gap a contractor hits) -- candidates include a **flush-volume / discharge-time** helper
(volumes to flush before the bacteriological sample), a **dechlorination-agent dose** for the
discharge (sodium thiosulfate or similar before chlorinated water hits a stream or sewer),
and a **hydrostatic-test water volume + make-up** companion; none ships without the field
need. The standing module-cap watch adds `calc-disinfect.js` after this landing and keeps
`calc-plumbing.js` on the split-watch list.
