# roughlogic.com Specification v67 -- Earthwork and Excavation Deepening (Group E, 5 New Tiles)

> **Implementation status: CLOSED 2026-06-13 (package stamped 0.61.0, a minor;
> catalog 611 -> 616, Group E +5; corpus 920, dims 923, fuzzer 920/920,
> derivation 616/616).** v67 inherits everything from spec.md
> through spec-v66.md and changes none of it. It assumes v66 has landed (catalog
> base 611).
>
> v67 deepens **Group E (Carpentry and Construction)** on its dirtiest edge: moving
> dirt. Group E already sizes a single excavation (`excavation`,
> `excavation-bench-plan`) and the trench wall (`trench-slope`, shared with Group
> G), and it sizes the pad and footing materials (`aggregate`, `concrete`). What it
> has never had is the production and volume math that runs an earthmoving day:
> dirt swells when you dig it and shrinks when you compact it, so the truck volume
> is not the hole volume; a loader and a haul fleet have to be balanced or the
> expensive machine sits idle; an open pit fills with water that has to be pumped;
> the spoil pile has to be set back from the trench edge by code and its surcharge
> kept off the wall; and a pipe in a trench needs bedding, haunching, and backfill,
> not just "fill it in." **No new group, no new dependencies, no telemetry, no AI,
> US standards only.** All five land in `calc-construction.js` next to `excavation`.
>
> **The gap, and the evidence for it.** A concept-check for
> swell / shrinkage / bank-loose-compacted / load-factor / haul-cycle / production /
> fleet-match / dewatering / spoil-setback / surcharge / pipe-bedding / embedment
> returned nothing. `excavation` returns the cubic yards of a sloped hole (bank
> volume) and stops; nothing converts that to truck loads or placed fill, nothing
> balances a fleet, and nothing handles water or the spoil pile. `trench-slope` and
> `excavation-bench-plan` shape the wall but say nothing about what the spoil pile
> does to it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `soil-swell-shrink` is volume (`L^3`) in / volume out
  with dimensionless factors; `haul-cycle-production` carries volume and time
  producing a volume-rate (`L^3/T`) and a dimensionless truck count;
  `dewatering-rate` carries volume (`L^3`) over time (`T`) producing a flow rate
  (`L^3/T`, gpm); `spoil-setback` carries length (`L`) producing a setback length
  and a base width; `pipe-bedding-backfill` carries length and area producing
  volumes (`L^3`, cubic yards and tons).
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive volume, time, dimension, pump time, or trench width returns
  `{ error }`. Swell and shrinkage percentages are range-checked to physical bounds.
  Truck counts and load counts are `ceil` of finite ratios. Volumes are bounded.
- The v19/v22 citation discipline applies. The earthmoving production tiles use
  **`GOVERNANCE.general`** and name the **Caterpillar Performance Handbook**
  soil-conversion and production-estimating methods generically (the swell /
  shrinkage and load-factor concept, and the cycle-time production method);
  `spoil-setback` names **OSHA 29 CFR 1926.651(j)** (the 2 ft minimum spoil setback)
  and **Subpart P** (the competent-person and protective-system requirements);
  `pipe-bedding-backfill` names **ASTM D2321** (installation of thermoplastic pipe)
  and the typical municipal bedding detail. None is reproduced; the engineer of
  record, the geotech report, and the competent person govern.
- Tile ids are kebab-case and checked against the post-v66 live ids. None collides
  or duplicates `excavation`, `excavation-bench-plan`, `trench-slope`, or
  `aggregate` (see Section 3).

## 2. The tiles

### 2.1 `soil-swell-shrink` -- Bank / Loose / Compacted Volume Conversion (Group E, calc-construction.js)

Dirt changes volume three times on a job: in place (bank), in the truck (loose,
swelled), and back in the ground compacted. The hole is measured in bank yards but
the trucks haul loose yards and the fill is placed as compacted yards. This tile
converts among the three.

```
inputs:
  bank_cy     L^3   bank (in-place) cubic yards, e.g. from the excavation tile
  swell_pct   -     percent volume increase when excavated (sand ~12, common earth ~25, clay ~30, rock ~50+)
  shrink_pct  -     percent volume decrease when compacted vs bank (common earth ~10 to 20)

loose_cy        = bank_cy * (1 + swell_pct/100)        (truck / stockpile volume)
load_factor     = 1 / (1 + swell_pct/100)              (bank yd per loose yd)
compacted_cy    = bank_cy * (1 - shrink_pct/100)       (placed / compacted volume)
fill_shortage   = bank_cy - compacted_cy               (extra bank yd needed per bank yd placed)
```

Outputs: the loose volume to haul, the load factor (bank per loose), the compacted
volume placed, and the bank-to-compacted shortfall that tells a cut/fill estimator
how much extra borrow is needed. The note line states: swell and shrinkage are soil
properties from the geotech report or a published table, not constants -- wet clay,
dry sand, and shot rock differ widely; the load factor converts a loose truck
ticket back to bank yards for earned-quantity payment; and compaction to a spec
(percent of a Proctor maximum) is verified in the field, not assumed.

**Worked example (pinned).** 100 bank cy of common earth, swell 25%, shrinkage 15%:
loose = 100 x 1.25 = **125 cy** (the trucks haul 125, not 100); load factor =
1 / 1.25 = **0.80** (each loose yard is 0.80 bank yard); compacted = 100 x 0.85 =
**85 cy**; to place 100 cy of compacted fill needs 100 / 0.85 = **117.6 bank cy** of
borrow. Cross-check (sand, swell 12, shrink 10): loose 112 cy, load factor 0.893,
compacted 90 cy. Degenerate inputs (bank <= 0, swell < 0, shrink < 0 or >= 100,
non-finite) return an error.

### 2.2 `haul-cycle-production` -- Truck/Loader Haul-Cycle Production and Fleet Match (Group E, calc-construction.js)

A loader fills a truck in a minute or two; the truck then disappears for the round
trip. Too few trucks and the loader waits; too many and the trucks queue. This tile
returns the hauler production and the number of trucks that keep the loader working.

```
inputs:
  truck_cap_lcy   L^3   truck capacity, loose cubic yards
  load_min        T     time for the loader to fill one truck (minutes)
  haul_min        T     loaded haul time to the dump
  dump_min        T     dump / maneuver time
  return_min      T     empty return time
  spot_min        T     time to spot under the loader (default 0.5)
  eff_min_per_hr  T     working minutes per hour (default 50, the 50-minute-hour factor)

cycle_min        = load_min + haul_min + dump_min + return_min + spot_min
loads_per_hour   = eff_min_per_hr / cycle_min
production_lcy_hr = truck_cap_lcy * loads_per_hour
trucks_to_match  = ceil(cycle_min / load_min)          (keep the loader continuously busy)
fleet_production_lcy_hr = production_lcy_hr * trucks_to_match
```

Outputs: the full cycle time, loads per hour per truck, single-truck production, the
number of trucks that match the loader, and the matched fleet production. The note
line states: the 50-minute hour accounts for real-world delays and is a planning
default, not a guarantee; haul and return times grow with distance, grade, and
traffic and are the variable that moves the answer; the matched count keeps the
loader (the expensive machine) working -- one truck short idles the loader, one over
queues the trucks; and `soil-swell-shrink` converts the loose production back to
bank yards for the earned quantity.

**Worked example (pinned).** A 12 lcy truck, loader fills in 2.0 min, haul 8.0,
dump 1.5, return 6.0, spot 0.5, 50-minute hour: cycle = 2.0 + 8.0 + 1.5 + 6.0 + 0.5
= **18.0 min**; loads/hr = 50 / 18.0 = **2.78**; production = 12 x 2.78 =
**33.3 lcy/hr** per truck; trucks to match = ceil(18.0 / 2.0) = **9**; matched
fleet = 33.3 x 9 = **300 lcy/hr**. Cross-check (shorter haul 4.0 min, return 3.0):
cycle 11.0 min, 4.55 loads/hr, 54.5 lcy/hr per truck, trucks = ceil(11/2) = 6.
Degenerate inputs (capacity <= 0, load time <= 0, any time < 0, non-finite) return
an error.

### 2.3 `dewatering-rate` -- Excavation Dewatering Pump Rate (Group E, calc-construction.js)

An open excavation below the water table fills up. This tile sizes the pump rate to
draw the pit down in a target time and then hold it against a steady inflow, and
recommends a safety margin.

```
inputs:
  pit_len_ft     L    excavation length at the water surface
  pit_wid_ft     L    excavation width at the water surface
  drawdown_ft    L    depth of water to remove
  drawdown_min   T    time to draw it down (minutes)
  inflow_gpm     L^3/T steady inflow / seepage to hold against (gpm)
  safety_pct     -    pump-sizing margin (default 25)

drawdown_gal   = pit_len_ft * pit_wid_ft * drawdown_ft * 7.48052
pump_gpm       = drawdown_gal / drawdown_min + inflow_gpm
sized_gpm      = pump_gpm * (1 + safety_pct/100)
```

Outputs: the gallons to remove, the pump rate to draw down and hold, and the
safety-margined pump selection rate. The note line states: 7.48 gallons per cubic
foot is exact; the inflow is the number that actually matters and it must be
estimated from the soil, the head, and a pumping test, not guessed; discharge water
is managed for sediment and permitted discharge, not run into the storm drain;
dewatering changes effective stress and can destabilize the excavation wall and
adjacent foundations, which is a competent-person and engineering call; and the
pump's total dynamic head (`pump-tdh`) sets the actual pump model, this tile sets
only the flow.

**Worked example (pinned).** A 20 ft x 12 ft pit, draw down 3 ft in 30 min, steady
inflow 40 gpm, 25% margin: drawdown gallons = 20 x 12 x 3 x 7.48052 = **5,386 gal**;
pump rate = 5,386 / 30 + 40 = 179.5 + 40 = **219.5 gpm**; sized = 219.5 x 1.25 =
**274.4 gpm**. Cross-check (hold-only, drawdown done, inflow 40 gpm): pump 40 gpm,
sized 50 gpm. Degenerate inputs (any dimension <= 0, drawdown time <= 0, inflow < 0,
non-finite) return an error.

### 2.4 `spoil-setback` -- Spoil Pile Setback and Surcharge (Group E, calc-construction.js)

OSHA requires excavated spoil and equipment to be kept back from the trench edge, and
the spoil pile itself is a surcharge load that pushes the wall in. This tile returns
the required setback, the footprint of the spoil pile at its angle of repose, and the
total clear distance the spoil must start beyond.

```
inputs:
  trench_depth_ft   L   depth of the excavation
  spoil_height_ft   L   height of the spoil pile
  repose_deg        -   angle of repose of the spoil (loose earth ~30 to 37, default 34)
  min_setback_ft    L   code minimum from the edge (default 2, OSHA 1926.651(j)(2))

base_halfwidth_ft = spoil_height_ft / tan(repose_deg)         (toe spread of the pile)
setback_ft        = max(min_setback_ft, surcharge_setback)
   where surcharge_setback recommends >= trench_depth_ft when the pile is a surcharge
   on an unshored / sloped wall (the influence wedge reaches ~ the trench depth)
total_clear_ft    = setback_ft + base_halfwidth_ft            (edge to the pile crest line)
```

Outputs: the toe spread of the spoil pile, the governing setback (the larger of the
2 ft code minimum and the depth-based surcharge setback), and the total clear
distance from the trench edge to the start of the pile. The note line states: 2 ft
is the absolute code minimum, not a design -- a deep trench's failure wedge reaches
about one trench depth back, so a surcharge pile inside that zone must be set back
farther or the wall protected; the protective system (slope, bench, shield) is a
competent-person decision under Subpart P; and equipment, traffic, and stockpiled
pipe are surcharges too, not just the spoil.

**Worked example (pinned).** A 10 ft trench, spoil pile 4 ft high at 34 deg repose,
2 ft code minimum: base half-width = 4 / tan(34) = 4 / 0.6745 = **5.93 ft**;
surcharge setback recommends >= 10 ft (the trench depth) for a pile this close to a
10 ft wall, so governing setback = max(2, 10) = **10 ft**; total clear = 10 + 5.93 =
**15.93 ft** from the edge to the pile's toe-spread crest. Cross-check (shallow 3 ft
trench, same pile): surcharge setback ~3 ft but code floor 2 ft -> governing 3 ft,
total clear = 3 + 5.93 = 8.93 ft. Degenerate inputs (depth <= 0, spoil height <= 0,
repose <= 0 or >= 90, non-finite) return an error.

### 2.5 `pipe-bedding-backfill` -- Trench Bedding, Embedment, and Backfill Take-Off (Group E, calc-construction.js)

A pipe in a trench is not just buried; it sits on bedding stone, is haunched and
embedded in aggregate to the spring line or pipe crown, and only then backfilled.
This tile takes the trench and pipe dimensions and returns the bedding tons, the
embedment aggregate, and the backfill volume.

```
inputs:
  trench_width_ft   L    trench width
  pipe_od_in        L    pipe outside diameter
  bedding_depth_in  L    stone bedding depth below the pipe
  cover_ft          L    cover from the top of the pipe to finished grade
  length_ft         L    run length
  stone_density_tcy -    bedding stone density (tons per loose cy, default 1.4)

pipe_od_ft       = pipe_od_in / 12
bedding_cy       = trench_width_ft * (bedding_depth_in/12) * length_ft / 27
bedding_tons     = bedding_cy * stone_density_tcy
embed_area_ft2   = trench_width_ft * pipe_od_ft - (pi/4) * pipe_od_ft^2   (aggregate around the pipe)
embedment_cy     = embed_area_ft2 * length_ft / 27
backfill_cy      = trench_width_ft * cover_ft * length_ft / 27
```

Outputs: the bedding cubic yards and tons, the embedment (haunch-to-crown) aggregate
cubic yards, and the backfill cubic yards above the pipe. The note line states: the
embedment zone is the structural support for a flexible pipe and is placed and
compacted in lifts per ASTM D2321 / the project detail, not dumped; the bedding
density is a loose stone estimate and the supplier's ticket governs the actual
tonnage; the pipe zone aggregate excludes the pipe's own volume (the subtraction
above); and the trench width, bedding, and compaction all come from the approved
detail, not a rule of thumb.

**Worked example (pinned).** A 100 ft run, 24 in trench, 12 in OD pipe, 4 in
bedding, 3 ft cover, stone 1.4 tons/cy: pipe OD = 1.0 ft; bedding = 2.0 x (4/12) x
100 / 27 = **2.47 cy** -> 2.47 x 1.4 = **3.45 tons**; embedment area = 2.0 x 1.0 -
0.7854 x 1.0^2 = 2.0 - 0.785 = 1.215 ft^2 -> 1.215 x 100 / 27 = **4.50 cy**;
backfill = 2.0 x 3.0 x 100 / 27 = **22.2 cy**. Cross-check (wider 36 in trench, same
pipe): embedment area = 3.0 - 0.785 = 2.215 ft^2 -> 8.20 cy. Degenerate inputs
(trench width <= 0, pipe OD <= 0, any depth < 0, length <= 0, or pipe OD >= trench
width, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the post-v66 live tiles. `excavation` returns the bank cubic
yards of a sloped hole and stops; `soil-swell-shrink` is the conversion `excavation`
never does (bank -> loose -> compacted), and `haul-cycle-production` turns that loose
volume into trucks and an hourly rate -- neither overlaps the geometry tile.
`excavation-bench-plan` and `trench-slope` shape the wall; `spoil-setback` is about
what sits *next* to the wall (the OSHA setback and surcharge), a different question.
`aggregate` returns gravel cubic yards for a pad from area and depth;
`pipe-bedding-backfill` is the three-zone pipe-trench take-off (bedding, embedment
around the pipe, backfill), which `aggregate` does not model. `pump-tdh` /
`pump-sizing` (Group G) compute pump head; `dewatering-rate` computes the *flow* an
open pit needs and defers head to `pump-tdh`. **All five ship**, into
`calc-construction.js`.

Per-tile wiring (each of the five): a `tools-data.js` row (group `E`, trades
`["carpentry"]` plus `"surveying"` on `haul-cycle-production` and `soil-swell-shrink`
to match the existing civil-layout tile tagging); `tile-meta.js` `_TILES`; a
`citations.js` entry (`GOVERNANCE.general`; formula string; assumptions listing the
bundled defaults -- the 50-minute hour, the 0.5 min spot time, the 7.48052 gal/ft^3
constant, the 25% dewatering margin, the 34 deg repose default, the 2 ft OSHA
setback floor, the 1.4 ton/cy stone density -- and naming the Caterpillar
Performance Handbook method, OSHA 1926.651(j) / Subpart P, and ASTM D2321 by name
without reproduction); `test/fixtures/worked-examples.json` (every pinned example and
cross-check); `test/fixtures/compute-map.js` (module path
`../../calc-construction.js`); `scripts/related-tiles.mjs` (`soil-swell-shrink` ->
`excavation` / `haul-cycle-production` / `aggregate`; `haul-cycle-production` ->
`soil-swell-shrink` / `excavation` / `axle-load-distribution`; `dewatering-rate` ->
`pump-tdh` / `pump-sizing` / `excavation`; `spoil-setback` -> `trench-slope` /
`excavation-bench-plan` / `crane-ground-bearing`; `pipe-bedding-backfill` ->
`aggregate` / `trench-slope` / `excavation`); `data/search/aliases.json` (e.g.
`soil-swell-shrink`: "swell", "shrinkage", "bank yards", "loose yards", "compacted",
"load factor", "cut and fill"; `haul-cycle-production`: "haul cycle", "truck count",
"production rate", "fleet match", "cycle time"; `dewatering-rate`: "dewatering",
"pump rate", "pit pumping", "well point"; `spoil-setback`: "spoil pile", "setback",
"surcharge", "trench edge"; `pipe-bedding-backfill`: "pipe bedding", "embedment",
"haunching", "backfill", "trench"); the `app.js` `CONSTRUCTION_RENDERERS` registers
all five renderers; the `// dims:` annotations; and the regenerated v14 corpus +
tile-index. A `test/unit/bounds-fuzzer.test.js` block pins every worked example, the
fleet-match count, the hold-only dewatering branch, the code-floor-vs-surcharge
setback branch, the pipe-exceeds-trench error seam, and every other error seam.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate; the spec-v49
`check-readme-counts` gate agrees at **616 tiles** and the matching sitemap URL
count); `npm test` (+5 tiles' fixtures); `npm run build` (616 tile shells,
regenerated sitemap); `npm run data:verify`; the worked-examples runner (+5
fixtures with cross-checks); the 320 px shell audit (the three swell/shrink volumes,
the cycle / production / truck count, the dewatering rates, the setback and clear
distance, and the bedding / embedment / backfill volumes all wrap, not scroll, on a
phone); and the full-catalog render-no-nan Chromium sweep plus the a11y gate, with
the rendered output read to the value (100 bank cy @ 25/15 -> 125 loose / 0.80 LF /
85 compacted; 18.0 min cycle -> 2.78 loads/hr / 9 trucks; 10 ft trench / 4 ft pile
-> 10 ft setback / 15.93 ft clear).

## 5. Roadmap position

v67 turns Group E's earthwork from a single volume number into a production bench: a
dirt crew can size the hole, convert it to trucks and placed fill, balance the
haul fleet, pump the pit, keep the spoil off the wall, and bed the pipe. It pairs
cleanly with the new Group Z -- `spoil-setback` and `dewatering-rate` reference
`crane-ground-bearing` and the excavation tiles, so a site-prep day reads end to end
across the two groups. The dirty-jobs expansion continues: v68 adds tree-care and
arborist rigging (Group L), and v69 adds surface prep, coatings, and abatement.
Further earthwork growth should be evidence-driven (a named gap a working operator
or estimator hits) -- candidates include a mass-haul / grade-balance optimizer and a
compaction lift / pass-count tile, neither shipping without a named field need.
