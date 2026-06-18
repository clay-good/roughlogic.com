# roughlogic.com Specification v93 -- Pool and Spa Chemical Balance (Group M, 3 New Tiles)

> **Implementation status: CLOSED -- landed 2026-06-18 (package 0.65.0; specs v90-v100 each targeted a minor individually but landed in one commit, so they stamp a single 0.65.0) (target catalog
> 642 -> 645; 25 groups; a minor stamp).** v93 inherits everything from spec.md
> through spec-v92.md and changes none of it. It adds three tiles to **Group M
> (Water and Wastewater Operations)** and changes no existing tile's output. **No new
> group, no new dependencies, no telemetry, no AI, US standards only.** All three
> land in `calc-treatment.js` (the home of the v75 water-treatment chemistry bench,
> which already holds `langelier-index` -- see the §3 module note on the cap bump).
>
> **The gap, and the evidence for it.** The catalog already does part of pool
> chemistry: `pool-turnover` (required pump flow and the chlorine product to dose a
> free-chlorine target -- cal-hypo, trichlor, or liquid bleach), `langelier-index`
> (the LSI saturation balance from pH, temperature, calcium hardness, alkalinity, and
> TDS), `disinfection-ct`, `chlorine-decay`, and `chemical-feed-pump`. What it does
> **not** have is the rest of the start-up-and-balance sequence a pool service tech
> runs on every account: the **total-alkalinity adjustment** (the buffer you set
> *before* pH, with sodium bicarbonate to raise or muriatic acid to lower), the
> **cyanuric-acid (stabilizer) dose** (raise with cyanuric acid, lower only by
> dilution), and the **salt dose** for a salt-chlorine generator (raise with pool
> salt, lower by dilution). A concept-check against the post-v92 live ids for
> pool-alkalinity, alkalinity-adjust, pool-cya, cyanuric, pool-salt, and stabilizer
> returned nothing. `pool-turnover` doses *chlorine* and `langelier-index` *reports*
> balance; neither doses alkalinity, stabilizer, or salt. These three close the loop
> on the chemistry a pool tech balances by hand on a route, and the catalog has none
> of them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. All three carry a volume (gallons) and a concentration
  change (ppm) to a chemical mass or volume: `pool-alkalinity-adjust` a dose in pounds
  (bicarbonate) or fluid ounces (acid); `pool-cya-dose` a dose in pounds and ounces
  (cyanuric acid) or a dilution volume; `pool-salt-dose` a dose in pounds and 40-lb
  bags or a dilution volume. The dilution branches carry a dimensionless fraction
  times a volume to a drain volume. Every dosing constant -- the per-10,000-gallon
  bicarbonate and acid rates, the cyanuric-acid rate, the 8.34 lb-per-gallon water
  mass -- is bundled and annotated.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive volume returns `{ error }`. A negative current or target
  concentration returns `{ error }`; a zero current concentration is valid for
  *raising* (an unstabilized or fresh pool) but the *dilution* (lower) branch requires
  a current concentration strictly greater than the target (you cannot dilute down
  from zero). When the target equals the current value the action is **"none"** and
  the dose is exactly zero (a valid result, not an error). Doses are reported as
  finite quantities; the chemical *bags* in `pool-salt-dose` are `ceil` of a finite
  ratio.
- The v19/v22 citation discipline applies. All three use
  **`GOVERNANCE.worker_safety`** (these are chemical-handling doses -- muriatic acid,
  chlorine-generator salt, and cyanuric acid are hazards, and the maker's label and
  SDS govern; the same governance class the hazardous-handling tiles use). Sources
  are named, never reproduced: the **NSPF CPO Handbook / ANSI-APSP-ICC** dosing
  tables (the per-10,000-gallon bicarbonate, acid, cyanuric-acid, and salt rates and
  the typical target ranges), the **mass-balance identity** for salt (gallons x 8.34
  lb/gal x ppm-change / 1,000,000) and the **dilution identity** (drained fraction =
  1 - target/current), and the **31.45 percent (20 degree Baume) muriatic acid**
  strength the acid rate assumes. The target *ranges* (TA ~80-120 ppm, CYA ~30-50 ppm
  outdoors, salt ~3,000-3,500 ppm) are stated as representative starting points the
  tech edits, and the doses are explicitly **starting doses to add in portions,
  circulate, and retest**, not exact one-shot amounts -- the maker's label governs.
- Tile ids are kebab-case and checked against the post-v92 live ids. None collides
  with `pool-turnover`, `langelier-index`, `chlorine-decay`, `disinfection-ct`, or
  `chemical-feed-pump` (see Section 3).

## 2. The tiles

### 2.1 `pool-alkalinity-adjust` -- Total-Alkalinity Adjustment Dose (Group M, calc-treatment.js)

Total alkalinity is the water's pH buffer, so a tech sets it before pH. This gives the
sodium bicarbonate to raise it or the muriatic acid to lower it, by pool volume and
the ppm change.

```
inputs:
  gallons          -    pool volume (gallons)
  current_ta_ppm   -    measured total alkalinity (ppm)
  target_ta_ppm    -    target total alkalinity (ppm)

delta_ppm  = target_ta_ppm - current_ta_ppm
vol_factor = gallons / 10000
if delta_ppm > 0:   action = "raise"
                    bicarb_lb = 1.5 * vol_factor * (delta_ppm / 10)        (sodium bicarbonate)
elif delta_ppm < 0: action = "lower"
                    acid_floz = 25  * vol_factor * (abs(delta_ppm) / 10)   (31.45% / 20 Baume muriatic)
else:               action = "none", dose = 0
```

Outputs: the action (raise, lower, or none), the ppm change, and the dose -- pounds of
sodium bicarbonate to raise, or fluid ounces of 31.45 percent muriatic acid to lower.
The note line states: set total alkalinity (the buffer) before pH, because a stable
TA keeps pH from bouncing; about 1.5 lb of sodium bicarbonate per 10,000 gallons
raises TA roughly 10 ppm, and about 25 fl oz of 31.45 percent (20 degree Baume)
muriatic acid per 10,000 gallons lowers it roughly 10 ppm (acid lowers pH too); target
TA is typically 80 to 120 ppm, lower for salt or plaster pools and higher for vinyl;
these are starting doses -- add in portions, circulate, and retest before adding more;
and always add acid to water, never water to acid.

**Worked example (pinned).** A 20,000-gallon pool, current TA 60 ppm, target 100 ppm:
delta = +40 ppm; vol factor = 2.0; action = **raise**; bicarbonate = 1.5 x 2.0 x (40 /
10) = **12 lb**. Cross-check (lowering, current 140, target 100): delta = -40 ppm,
action = **lower**, acid = 25 x 2.0 x 4 = **200 fl oz** (about 1.56 gal). Cross-check
(a 10,000-gallon pool, 60 -> 80): 1.5 x 1.0 x 2 = **3 lb**. Degenerate inputs (gallons
<= 0, a negative current or target, non-finite) return an error; target = current
returns action **none** and a zero dose.

### 2.2 `pool-cya-dose` -- Cyanuric Acid (Stabilizer) Dose (Group M, calc-treatment.js)

Cyanuric acid shields free chlorine from sunlight. This gives the cyanuric acid to
raise CYA, or -- since CYA only leaves by dilution -- the fraction and gallons of water
to replace to lower it.

```
inputs:
  gallons          -    pool volume (gallons)
  current_cya_ppm  -    measured cyanuric acid (ppm; 0 for a fresh/unstabilized pool)
  target_cya_ppm   -    target cyanuric acid (ppm)

delta_ppm  = target_cya_ppm - current_cya_ppm
vol_factor = gallons / 10000
if delta_ppm > 0:   action = "raise"
                    cya_lb = 0.81 * vol_factor * (delta_ppm / 10)   (~13 oz per 10 ppm per 10,000 gal)
                    cya_oz = cya_lb * 16
elif delta_ppm < 0: action = "dilute"   (requires current_cya_ppm > target_cya_ppm > = 0)
                    drain_fraction = 1 - target_cya_ppm / current_cya_ppm
                    drain_gallons  = drain_fraction * gallons
else:               action = "none", dose = 0
```

Outputs: the action (raise, dilute, or none); to raise, the cyanuric acid in pounds
and ounces; to lower, the fraction and gallons of water to drain and replace. The note
line states: cyanuric acid (stabilizer or conditioner) protects free chlorine from
the sun, but too much "locks up" chlorine and forces a higher free-chlorine target;
about 13 oz of cyanuric acid per 10,000 gallons raises CYA roughly 10 ppm; CYA comes
down only by dilution or slow natural loss, so to halve it you replace about half the
water; target CYA is typically 30 to 50 ppm for an outdoor chlorine pool (often near
zero indoors); and add stabilizer slowly through the skimmer -- it dissolves slowly and
can sit on plaster and etch it.

**Worked example (pinned).** A 15,000-gallon pool, current CYA 20 ppm, target 40 ppm:
delta = +20 ppm; vol factor = 1.5; action = **raise**; cyanuric acid = 0.81 x 1.5 x
(20 / 10) = **2.43 lb** (about **38.9 oz**). Cross-check (lowering, current 80, target
40): action = **dilute**, drain fraction = 1 - 40 / 80 = 0.50, drain = **7,500 gal**.
Cross-check (a fresh 30,000-gallon pool, 0 -> 30): 0.81 x 3.0 x 3 = **7.29 lb**.
Degenerate inputs (gallons <= 0, a negative current or target, a dilute request from a
current of 0, non-finite) return an error; target = current returns action **none**.

### 2.3 `pool-salt-dose` -- Salt Dose for a Salt-Chlorine Generator (Group M, calc-treatment.js)

A salt-chlorine generator needs the water at the salt level on the cell's spec plate.
This gives the pool salt to add to reach a target, or the water to replace to lower an
over-salted pool, by a straight mass balance.

```
inputs:
  gallons          -    pool volume (gallons)
  current_salt_ppm -    measured salt (ppm)
  target_salt_ppm  -    target salt for the cell (ppm; typically 3,000-3,500)

delta_ppm = target_salt_ppm - current_salt_ppm
if delta_ppm > 0:   action = "add"
                    salt_lb   = gallons * 8.34 * delta_ppm / 1000000     (8.34 lb/gal water)
                    salt_bags = ceil(salt_lb / 40)                       (40-lb bags)
elif delta_ppm < 0: action = "dilute"   (requires current_salt_ppm > target_salt_ppm)
                    drain_fraction = 1 - target_salt_ppm / current_salt_ppm
                    drain_gallons  = drain_fraction * gallons
else:               action = "none", dose = 0
```

Outputs: the action (add, dilute, or none); to raise, the salt in pounds and 40-lb
bags; to lower, the fraction and gallons of water to replace. The note line states: a
salt-chlorine generator needs the salt at the level on the cell's spec plate,
typically about 3,000 to 3,500 ppm; the salt to add is the volume times 8.34 lb per
gallon times the ppm rise divided by a million; salt leaves only by splash-out,
backwash, and dilution, so to lower it you replace water; use pool-grade NaCl (99
percent or better), broadcast it, brush it off the floor, and run the pump -- do not run
the generator until it has dissolved; and too little salt underproduces chlorine while
too much can corrode fittings and trip the cell.

**Worked example (pinned).** A 20,000-gallon pool, current 2,000 ppm, target 3,200
ppm: delta = +1,200 ppm; salt = 20,000 x 8.34 x 1,200 / 1,000,000 = **200.16 lb**;
bags = ceil(200.16 / 40) = **6** (40-lb bags). Cross-check (a small lift, 10,000 gal,
2,800 -> 3,200, delta 400): salt = 10,000 x 8.34 x 400 / 1,000,000 = **33.36 lb** =
**1** bag. Cross-check (an over-salted 20,000-gallon pool, 4,000 -> 3,200): action =
**dilute**, drain fraction = 1 - 3,200 / 4,000 = 0.20, drain = **4,000 gal**.
Degenerate inputs (gallons <= 0, a negative current, a non-positive target, a dilute
request from a current at or below target, non-finite) return an error; target =
current returns action **none**.

## 3. Concept-check and wiring

Concept-checked against the post-v92 live tiles. `pool-turnover` sizes the pump flow
and doses *chlorine* to a free-chlorine target; it does not touch alkalinity, CYA, or
salt. `langelier-index` *reports* the LSI balance from measured pH, hardness, and
alkalinity; it doses nothing. `chlorine-decay`, `disinfection-ct`, and
`chemical-feed-pump` are residual-decay, CT-compliance, and metering-pump tiles,
unrelated to these batch doses. No live tile doses total alkalinity, cyanuric acid, or
generator salt. **All three ship**, into `calc-treatment.js`.

Per-tile wiring (each of the three): a `tools-data.js` row (group `M`, trades
`["water-operations", "pool-service"]` -- "water-operations" is the Group M trade tag;
"pool-service" is added as a discovery alias for the pool-tech audience these tiles
serve); `tile-meta.js` `_TILES`; a `citations.js` entry (the
`GOVERNANCE.worker_safety` governance from Section 1; the formula string; assumptions
listing every bundled constant -- the 1.5-lb bicarbonate and 25-fl-oz acid
per-10,000-gallon rates, the 31.45 percent muriatic strength, the 13-oz cyanuric-acid
rate, the 8.34 lb/gal water mass, the dilution identity, and the TA/CYA/salt target
ranges -- naming the NSPF CPO Handbook and the ANSI-APSP-ICC standards without
reproduction, and stating the doses are starting amounts to add in portions and
retest); `test/fixtures/worked-examples.json` (every pinned example and cross-check);
`test/fixtures/compute-map.js` (module path `../../calc-treatment.js`);
`scripts/related-tiles.mjs` (`pool-alkalinity-adjust` -> `pool-turnover` /
`langelier-index` / `pool-cya-dose`; `pool-cya-dose` -> `pool-turnover` /
`pool-alkalinity-adjust` / `pool-salt-dose`; `pool-salt-dose` -> `pool-turnover` /
`pool-cya-dose` / `langelier-index`); `data/search/aliases.json` (e.g.
`pool-alkalinity-adjust`: "pool alkalinity", "total alkalinity", "baking soda dose",
"muriatic acid", "lower alkalinity"; `pool-cya-dose`: "cyanuric acid", "stabilizer",
"conditioner", "cya", "lower cya"; `pool-salt-dose`: "pool salt", "salt water pool",
"swg salt", "salt chlorine generator", "lower salt"); the `app.js`
`TREATMENT_RENDERERS` declare gains all three ids; the `// dims:` annotations; and the
regenerated v14 corpus + tile-index. A `test/unit/bounds-fuzzer.test.js` block pins
every worked example, the three-way action branch (raise/lower-or-dilute/none), the
`ceil` bag count, the dilute-from-zero and dilute-at-or-below-target error seams, and
every other error seam.

**Module note.** `calc-treatment.js` (the v75 water-treatment chemistry bench, home of
`langelier-index`) is the natural home -- pool chemical balance is treatment
chemistry. It is at ~4.7 KB gzipped against a 6,000 B cap; the three tiles push it
over, so this spec **raises the `calc-treatment.js` cap** in
`scripts/check-module-sizes.mjs` to about **8,000 B** (current plus the three tiles
plus documented headroom). `pool-turnover` stays in `calc-water.js`; these tiles
reference it by **id** (group-keyed, not module-keyed), so no relocation is needed.
Group letter (`M`) is independent of the module.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates;
`check-readme-counts` agrees at **645 tiles** and the matching sitemap URL count);
`npm test` (+3 worked-example fixtures and their cross-checks; the new bounds-fuzzer
block); `npm run build` (645 tile shells, regenerated sitemap); `npm run
data:verify`; the worked-examples runner; the 320 px shell audit (the action / ppm
change / dose lines and the dilution fraction / gallons lines all wrap, not scroll, on
a phone); and the full-catalog render-no-nan Chromium sweep plus the a11y gate, with
the rendered output read to the value (20,000 gal 60 -> 100 TA -> 12 lb bicarbonate;
15,000 gal 20 -> 40 CYA -> 2.43 lb; 20,000 gal 2,000 -> 3,200 salt -> 200.16 lb / 6
bags; and the dilute branches -> 7,500 gal and 4,000 gal).

## 5. Roadmap position

v93 closes the pool-chemistry loop in Group M, linking the new doses to the existing
bench (`pool-alkalinity-adjust` precedes the `langelier-index` balance check, and all
three sit beside `pool-turnover`'s chlorine dose for a full start-up sequence).
Further growth should stay evidence-driven (a named gap a pool tech or operator hits)
-- candidates include a calcium-hardness adjustment dose, a phosphate / chlorine-demand
("breakpoint") shock-dose tile, and a filter-backwash water-loss tile; none ships
without the field need. The standing module-cap watch adds `calc-treatment.js` after
this bump.
