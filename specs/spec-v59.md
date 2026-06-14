# roughlogic.com Specification v59 -- Remediation Chemistry and Air Sampling (2 New Tiles)

> **Implementation status: CLOSED 2026-06-13 (package stamped 0.53.0, a minor;
> catalog 586 -> 588, Group D 21 -> 23; wiring lint 31 renderer modules / 588
> tile-id entries; corpus 892, dims 895, fuzzer 892/892, derivation 588/588).**
> v59 inherits everything from
> spec.md through spec-v58.md and changes none of it. It assumes v58 has landed
> (catalog base 586).
>
> v59 deepens **Group D (Water Damage and Mold Restoration)** with two field
> calculators a technician runs with a sprayer in one hand and a phone in the
> other: **how much antimicrobial concentrate to mix** for a given area, and **how
> long to run an air-sampling cassette** to pull a target volume. Group D sizes the
> air-moving equipment but had no tile for the two consumable-and-time decisions
> that bracket the cleaning step. **No new group, no new dependencies, no
> telemetry, no AI, US standards only.** Both land in `calc-restoration.js`.
>
> **The gap, and the evidence for it.** A concept-check for
> dilution / mixing-ratio / oz-per-gallon / sample-volume / spore-trap / run-time
> returned nothing in the live catalog. The `dehumidifier`, `hepa-filter-life`, and
> `nam-sizing` tiles size hardware; none computes a chemical mix or a sampling run
> time. These are the two arithmetic operations a remediator most often does on a
> calculator app at the truck.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `antimicrobial-dilution` carries area (`L^2`), volume
  (`L^3`), and a dimensionless dilution ratio; `air-sample-volume` carries a flow
  rate (`L^3 T^-1`), a volume (`L^3`), and a time (`T`).
- The v18/v21 tile contract applies. `antimicrobial-dilution`: a non-positive
  area, non-positive coverage rate, non-positive tank size, a dilution ratio
  below 1, or any non-finite input returns `{ error }`; the tank count is bounded
  (ceil of a finite ratio) so no input builds an unbounded structure.
  `air-sample-volume`: a non-positive flow rate, non-positive target volume,
  sample count below 1, or any non-finite input returns `{ error }`.
- The v19/v22 citation discipline applies. **`antimicrobial-dilution` uses
  `GOVERNANCE.pesticide`** ("Read and follow the product label. The label is the
  law (FIFRA).") -- the single most important honesty seam on this tile: the
  dilution ratio and the coverage rate are read off the EPA-registered product
  label, and the tile's defaults are placeholders, not a recommendation. The
  citation also states the S520 principle that antimicrobials do not substitute
  for the physical removal of growth. `air-sample-volume` uses
  `GOVERNANCE.general`, naming ASTM D7391 (spore-trap method), the cassette
  manufacturer's instructions, and AIHA-accredited laboratory analysis.
- Tile ids are kebab-case and checked against the live ids: `antimicrobial-dilution`
  and `air-sample-volume` do not collide and are not concept-duplicates (§3).

## 2. The tiles

### 2.1 `antimicrobial-dilution` -- Antimicrobial Mix and Coverage (Group D, calc-restoration.js)

Given an area to treat, the label's dilution, the label's coverage rate, and the
sprayer tank size, return the finished-solution volume, the concentrate and water
split, the per-tank recipe, and the number of tank fills. Two dilution input modes
mirror how labels are written: **ounces of concentrate per gallon of finished
solution**, or a **ratio 1:N** (one part concentrate to N parts water).

```
inputs:
  affected_area_ft2     L^2
  coverage_ft2_per_gal  L^2 L^-3 -> L^-1   label coverage rate (default placeholder)
  tank_size_gal         L^3              pump-up / backpack sprayer capacity
  mode                  flag             "oz_per_gal" or "ratio"
  oz_per_gal            dimensionless    concentrate oz per finished gallon (mode A)
  ratio_N               dimensionless    1:N, one part concentrate to N parts water (mode B)

finished_gal   = affected_area_ft2 / coverage_ft2_per_gal
mode A: conc_oz_per_gal = oz_per_gal
mode B: conc_oz_per_gal = 128 / (N + 1)        128 fl oz per gallon
concentrate_oz_total = finished_gal x conc_oz_per_gal
water_gal_total      = finished_gal - concentrate_oz_total / 128
tanks_needed         = ceil(finished_gal / tank_size_gal)
per_tank_conc_oz     = conc_oz_per_gal x tank_size_gal
```

Outputs: finished-solution gallons, total concentrate (oz), total water (gal), the
per-tank concentrate dose (oz per full tank), and the number of tank fills. The
note line carries the FIFRA seam (read the label; the label is the law), the S520
principle (kill is not removal -- mold must be physically removed; antimicrobial
application follows cleaning, where the protocol calls for it), and the dwell-time
reminder (the label's contact time governs efficacy).

**Worked example (pinned).** 400 ft^2 to treat, label coverage 200 ft^2/gal, label
dilution 4 oz/gal (mode A), 1.5 gal pump sprayer: finished = 400/200 = **2.0 gal**;
concentrate = 2.0 x 4 = **8.0 oz**; water = 2.0 - 8/128 = **1.94 gal**; tanks =
ceil(2.0/1.5) = **2 fills**; per-tank dose = 4 x 1.5 = **6.0 oz** concentrate in a
full 1.5 gal tank. Cross-check (mode B, ratio 1:64): conc per gal = 128/65 =
**1.97 oz/gal**, so a 1.5 gal tank takes 1.97 x 1.5 = 2.95 oz concentrate.
Degenerate inputs (area <= 0, coverage <= 0, tank <= 0, N < 1, non-finite) return
an error.

### 2.2 `air-sample-volume` -- Air Sample Run Time and Volume (Group D, calc-restoration.js)

Spore-trap and culturable air sampling pull a target air volume at a fixed pump
flow rate; the run time is volume over flow. Over-sampling overloads the cassette
(an unreadable, over-loaded trap); under-sampling misses low counts. This tile
converts between flow, target volume, and run time, and totals a sampling event
(at least one outdoor control plus one per affected area).

```
inputs:
  flow_rate_lpm     L^3 T^-1   calibrated pump flow (default 15 L/min spore trap)
  target_volume_L   L^3        per-cassette target (default 75 L; spore traps 75-150 L)
  sample_count      dimensionless  cassettes in the event (>= 1; include outdoor control)

run_time_min   = target_volume_L / flow_rate_lpm
run_time_sec   = run_time_min x 60
total_volume_L = target_volume_L x sample_count
total_time_min = run_time_min x sample_count   (sequential, one pump)
```

Outputs: per-cassette run time (minutes and seconds), total sampled volume across
the event, and total pump run time if the cassettes are run sequentially on one
pump. The note line states: the calibrated flow on the rotameter governs (not the
nominal rating); the cassette manufacturer's instructions and ASTM D7391 set the
acceptable volume window for the medium; an AIHA-accredited laboratory governs the
analysis; and an outdoor control plus indoor comparison is the standard event
design.

**Worked example (pinned).** 15 L/min, 75 L target, 3 cassettes (1 outdoor + 2
indoor): run time = 75/15 = **5.0 min** (300 s) each; total volume = 75 x 3 =
**225 L**; total pump time = 5.0 x 3 = **15.0 min**. Cross-check (Andersen N6
culturable, 28.3 L/min, 28.3 L target): run time = 1.0 min. Degenerate inputs
(flow <= 0, target <= 0, count < 1, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the live catalog. `dehumidifier` / `nam-sizing` /
`hepa-filter-life` size hardware; none mixes a chemical or computes a sampling run
time. The lab group's dilution tiles (Group with `lab` governance) cover molarity
and serial dilution for the bench, not field-sprayer oz-per-gallon area coverage,
and carry a different governance seam; `antimicrobial-dilution` is a
restoration-field tile under `GOVERNANCE.pesticide`. No tile computes air-sample
run time. **Both ship**, into `calc-restoration.js`.

Per-tile wiring (each tile): a `tools-data.js` row (group `D`, trades
`["restoration"]`); `tile-meta.js` `_TILES`; a `citations.js` entry
(`antimicrobial-dilution`: FIFRA / EPA-registered-label primacy +
IICRC S520-2024 physical-removal principle, `GOVERNANCE.pesticide`, assumptions
listing the placeholder coverage and dilution defaults and the 128 fl oz/gal
constant; `air-sample-volume`: ASTM D7391 + cassette manufacturer instructions +
AIHA-LAP analysis, `GOVERNANCE.general`, assumptions listing the 15 L/min and 75 L
spore-trap defaults); `test/fixtures/worked-examples.json` (the pinned 400 ft^2
mix and the 15 L/min sampling event, plus the ratio and N6 cross-checks);
`test/fixtures/compute-map.js` (module path `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (`antimicrobial-dilution` -> `mold-remediation-level` /
`ppe` / `evaporation-load`; `air-sample-volume` -> `mold-remediation-level` /
`hepa-filter-life` / `mold-conditions`); `data/search/aliases.json`
(`antimicrobial-dilution`: "dilution", "mixing ratio", "oz per gallon", "biocide",
"disinfectant", "sprayer mix", "coverage"; `air-sample-volume`: "spore trap",
"air sample", "Air-O-Cell", "sampling time", "liters per minute", "clearance
sample"); the `// dims:` annotations; and the regenerated v14 corpus + tile-index.
A `test/unit/bounds-fuzzer.test.js` block pins both worked examples, the
mode-B ratio path, the N6 cross-check, and every error seam.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate; `check-readme-counts` must
agree at **588 tiles** and the matching sitemap URL count); `npm test` (+2 tests);
`npm run build` (588 tile shells + sitemap); `npm run data:verify`; the
worked-examples runner (+2 fixtures); the 320 px shell audit (the multi-output mix
recipe and the sampling outputs must wrap, not scroll horizontally, on a phone --
this tile is explicitly designed for one-handed use at the truck); and the
full-catalog render-no-nan Chromium sweep plus the a11y gate, with the rendered
output read to the value (400 ft^2 -> 2.0 gal / 8.0 oz / 2 fills / 6.0 oz per tank;
15 L/min -> 5.0 min / 225 L / 15.0 min).

## 5. Roadmap position

v59 brings Group D to 23 tiles and closes the consumable-and-time gap around the
cleaning step. The `GOVERNANCE.pesticide` seam on `antimicrobial-dilution` is the
key correctness property -- the tile is a mixing aid, not a product recommendation,
and the label governs. The `calc-restoration.js` module-cap watch from v58 carries
forward; if v58 + v59 together cross the byte cap, the authorized `calc-mold.js`
split lands here. v60 completes this Group D batch with water-loss documentation
(`moisture-dry-goal`, `flood-cut-quantity`).
