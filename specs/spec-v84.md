# roughlogic.com Specification v84 -- Sprayer Nozzles, Drift, and Field Capacity (Group L, 3 New Tiles)

> **Implementation status: CLOSED -- LANDED 2026-06-16 (catalog 627 -> 630 of the
> combined 624 -> 634 v83-v85 expansion).** v84 inherits everything from spec.md
> through spec-v83.md and changes none of it. v83-v85 landed together in one commit
> stamping a single minor, **0.64.0** (rather than the spec's individual 0.65.0
> target). All three sprayer tiles (`nozzle-flow-pressure`, `spray-drift-buffer`,
> `sprayer-field-capacity`) ship in `calc-agriculture.js` with the full v14
> discipline; the new `landscaping` cross-trade is a free-string trade label; every
> gate is green.
>
> v84 deepens the spray-applicator bench in **Group L (Agriculture and Forestry)**.
> The catalog already calibrates a sprayer three ways -- `gpa-rate` (gallons per
> acre from a known nozzle flow, speed, and spacing), `sprayer-calibration` (the
> 1/128-acre catch method), and `tank-mix` (acres and product per tank) -- but it
> assumes you already know the nozzle flow, it never sizes the *downwind buffer* a
> drift-sensitive job needs, and it never tells you how *long* the field takes or
> how many *tanks* it costs. Those are the three numbers an applicator works out at
> the headland. **No new group, no new dependencies, no telemetry, no AI, US
> standards only.** All three land in `calc-agriculture.js` next to `gpa-rate`.
>
> **The gap, and the evidence for it.** A concept-check against the post-v83 live
> ids for nozzle-flow / pressure-vs-flow / tip-selection / drift / buffer / setback /
> field-capacity / acres-per-hour / spray-time returned nothing. `gpa-rate` takes
> the nozzle flow (GPM) as an *input*; nothing derives that flow from the tip's rated
> flow and the operating pressure (the square-root law that governs every tip change).
> Nothing computes a downwind drift buffer, and nothing computes effective field
> capacity. The single most common applicator mistake -- cranking pressure to change
> the rate, which barely moves the flow and makes the spray finer and driftier -- has
> no tile to correct it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `nozzle-flow-pressure` carries a volumetric flow scaled by
  the square root of a dimensionless pressure ratio; `spray-drift-buffer` produces a
  length (`L`, the buffer in feet) from a dimensionless base buffer scaled by
  dimensionless wind and height ratios; `sprayer-field-capacity` carries length
  (`L`, boom width) times speed to an area-rate (acres per hour) and a dimensionless
  time and tank count.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive rated flow, rated pressure, operating pressure, base buffer, wind
  speed, release height, boom width, ground speed, field efficiency, field area,
  tank volume, or GPA returns `{ error }`. The optional target-flow solve returns its
  required pressure only for a positive target; tanks-needed is `ceil` of a finite
  ratio.
- The v19/v22 citation discipline applies. `spray-drift-buffer` uses
  **`GOVERNANCE.pesticide`** ("Math aid for personal verification. The product label
  is the law (FIFRA); your state lead agency and the label's mandatory buffers and
  wind limits govern."); `nozzle-flow-pressure` and `sprayer-field-capacity` use
  **`GOVERNANCE.general`** with the same label-governs reminder. Sources are named,
  never reproduced: the **nozzle-flow square-root relation** (Q proportional to the
  square root of pressure, standard spray-nozzle hydraulics), **USDA / land-grant
  extension sprayer-calibration and drift-management guidance** (droplet-class and
  field-efficiency ranges, named generically), and the **EPA pesticide label and the
  Worker Protection Standard (40 CFR 170)**. None is law the tile restates; the label
  governs, and the base buffer, droplet class, and field efficiency are editable
  representative values, not regulatory numbers.
- Tile ids are kebab-case and checked against the post-v83 live ids. None collides
  with `gpa-rate`, `sprayer-calibration`, `tank-mix`, `pesticide-rei-phi`,
  `irrigation-requirement`, or `npk-blend` (see Section 3).

## 2. The tiles

### 2.1 `nozzle-flow-pressure` -- Nozzle Flow vs Pressure and Tip Selection (Group L, calc-agriculture.js)

A spray tip's flow follows the square root of its pressure, so pressure is a weak
lever: doubling the flow needs about four times the pressure and drives the droplets
finer. This tile gives the flow at a new pressure from the tip's catalog flow, and
solves for the pressure that hits a target flow, so the applicator changes *tips*,
not pressure, to change the rate.

```
inputs:
  rated_gpm    L^3   catalog flow of the tip at its rated pressure
  rated_psi    -     the pressure at which rated_gpm is published
  new_psi      -     the operating pressure
  target_gpm   -     optional: solve for the pressure that yields this flow (0 = off)

new_gpm   = rated_gpm * sqrt(new_psi / rated_psi)
req_psi   = target_gpm > 0 ? rated_psi * (target_gpm / rated_gpm)^2 : null
```

Outputs: the flow at the operating pressure, and when a target is entered, the
pressure that would yield it (with a flag if it falls outside a typical 15 to 60 psi
flat-fan band). The note line states: pressure changes flow only by its square root,
so it is a fine-tuning lever, not a rate knob -- to change the application rate, swap
to a different tip size; raising pressure also shrinks the droplets and increases
drift, so stay inside the tip's rated band; and the per-nozzle flow feeds `gpa-rate`
and `sprayer-calibration` to close on a target GPA.

**Worked example (pinned).** A tip rated 0.4 gpm at 40 psi, run at 60 psi: new gpm =
0.4 x sqrt(60 / 40) = 0.4 x sqrt(1.5) = 0.4 x 1.2247 = **0.49 gpm**. Cross-check
(drop to 20 psi): 0.4 x sqrt(0.5) = 0.4 x 0.7071 = **0.28 gpm**. Cross-check (solve
for a 0.6 gpm target from the same 0.4-at-40 tip): req psi = 40 x (0.6 / 0.4)^2 =
40 x 2.25 = **90 psi** -- well above a flat-fan band, which is exactly why you change
tips instead. Degenerate inputs (rated flow <= 0, rated pressure <= 0, operating
pressure <= 0, non-finite) return an error.

### 2.2 `spray-drift-buffer` -- Downwind Drift Buffer (Group L, calc-agriculture.js)

Spray drift grows with wind speed, release height, and finer droplets. This tile
scales an editable base buffer by those three factors to a recommended downwind
no-spray distance, as a relative planning aid -- it is explicit that the label's
mandatory buffer is the law.

```
inputs:
  base_buffer_ft   L    buffer at the reference conditions (default by droplet class below)
  droplet_class    -    sets the default base buffer at 10 mph and 20 in release:
                          Very Coarse 5, Coarse 10, Medium 20, Fine 40 (editable, representative)
  wind_mph         -    downwind wind speed
  boom_height_in   -    release height above the canopy (default 20)
  ref_height_in    -    reference release height for the base buffer (default 20)

buffer_ft = base_buffer_ft * (wind_mph / 10) * (boom_height_in / ref_height_in)
```

Outputs: the recommended downwind buffer (ft), with the droplet class, wind, and
release height restated. The note line states: this is a *relative* planning estimate
that grows with wind, release height, and finer droplets -- it is NOT the label's
required buffer, which is the law (FIFRA); do not spray when the wind carries toward
a sensitive area, during a temperature inversion, or above the label's maximum wind
speed; and coarser droplets and a lower boom cut drift far more than any buffer can
recover.

**Worked example (pinned).** Medium droplets (base 20 ft), 15 mph wind, 30 in boom,
20 in reference: buffer = 20 x (15 / 10) x (30 / 20) = 20 x 1.5 x 1.5 = **45 ft**.
Cross-check (Coarse droplets, base 10, 8 mph, 20 in boom): 10 x 0.8 x 1.0 = **8 ft**.
Cross-check (Fine droplets, base 40, 12 mph, 24 in boom): 40 x 1.2 x 1.2 = **57.6
ft**. Degenerate inputs (base buffer <= 0, wind <= 0, boom height <= 0, reference
height <= 0, non-finite) return an error.

### 2.3 `sprayer-field-capacity` -- Effective Field Capacity and Spray Time (Group L, calc-agriculture.js)

How long a field takes, and how many tank loads it costs, comes from the boom width,
the ground speed, and the field efficiency that overlap, turns, and refills eat up.
This tile gives the effective acres per hour, the spray time for a field, and the
tank count, pairing with `tank-mix` for the product.

```
inputs:
  boom_width_ft         L    effective swath width
  speed_mph             -    ground speed
  field_efficiency_pct  -    fraction of theoretical capacity actually achieved (default 70)
  field_acres           -    field size
  tank_gal              L^3  sprayer tank capacity
  gpa                   -    spray volume (gallons per acre)

theoretical_ac_hr = boom_width_ft * speed_mph / 8.25      (= width * speed * 5280 / 43560)
effective_ac_hr   = theoretical_ac_hr * field_efficiency_pct / 100
spray_time_hr     = field_acres / effective_ac_hr
acres_per_tank    = tank_gal / gpa
tanks_needed      = ceil(field_acres / acres_per_tank)
```

Outputs: the theoretical and effective acres per hour, the spray time for the field,
the acres per tank, and the number of tank loads. The note line states: theoretical
capacity assumes no overlap, turns, or refills, and the field efficiency (typically
60 to 80 percent for boom spraying) captures all of that loss; speed and pressure
are linked, so changing speed changes the GPA unless you re-calibrate (`gpa-rate`,
`nozzle-flow-pressure`); and the tank count pairs with `tank-mix` for the product to
load per tank.

**Worked example (pinned).** A 30 ft boom at 6 mph, 70 percent efficiency, 80 acres,
300 gal tank, 15 GPA: theoretical = 30 x 6 / 8.25 = **21.8 ac/hr**; effective =
21.8 x 0.70 = **15.3 ac/hr**; spray time = 80 / 15.3 = **5.2 hr**; acres per tank =
300 / 15 = 20; tanks = ceil(80 / 20) = **4**. Cross-check (40 ft boom, 8 mph, 75
percent, 160 acres): theoretical 38.8 ac/hr, effective 29.1 ac/hr, spray time
160 / 29.1 = **5.5 hr**. Cross-check (same field at 20 GPA): acres per tank 15,
tanks = ceil(80 / 15) = **6**. Degenerate inputs (boom <= 0, speed <= 0, efficiency
<= 0, field area <= 0, tank <= 0, GPA <= 0, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the post-v83 live tiles. `gpa-rate` computes GPA from a
*known* nozzle flow, speed, and spacing; `nozzle-flow-pressure` derives that nozzle
flow from the tip's rated flow and the operating pressure -- the upstream number
`gpa-rate` assumes. `sprayer-calibration` is the 1/128-acre catch method (a measured
calibration), not a pressure-vs-flow model. `tank-mix` gives acres and product per
tank; `sprayer-field-capacity` gives the *time* and the *tank count* for a field,
and feeds `tank-mix` the load count, it does not duplicate the product math.
`pesticide-rei-phi` is a re-entry / pre-harvest clock; no live tile computes a drift
buffer. No tile derives nozzle flow from pressure, a drift buffer, or field capacity.
**All three ship**, into `calc-agriculture.js`.

Per-tile wiring (each of the three): a `tools-data.js` row (group `L`, trades
`["agriculture", "landscaping"]`); `tile-meta.js` `_TILES`; a `citations.js` entry
(the governance noted in Section 1; the formula string; assumptions listing every
bundled constant -- the square-root flow law and the 15 to 60 psi flat-fan band, the
droplet-class base buffers 5 / 10 / 20 / 40 ft and the 20 in reference height, the
default 70 percent field efficiency and the 8.25 acres-per-hour divisor -- and naming
the nozzle-flow relation, the extension calibration and drift guidance, and the EPA
label / WPS without reproduction); `test/fixtures/worked-examples.json` (every pinned
example and cross-check); `test/fixtures/compute-map.js` (module path
`../../calc-agriculture.js`); `scripts/related-tiles.mjs` (`nozzle-flow-pressure` ->
`gpa-rate` / `sprayer-calibration` / `sprayer-field-capacity`; `spray-drift-buffer`
-> `gpa-rate` / `pesticide-rei-phi`; `sprayer-field-capacity` -> `tank-mix` /
`gpa-rate` / `nozzle-flow-pressure`); `data/search/aliases.json` (e.g.
`nozzle-flow-pressure`: "nozzle flow", "tip selection", "spray pressure", "GPM at
pressure", "tip size"; `spray-drift-buffer`: "spray drift", "buffer", "downwind
setback", "droplet size", "drift management"; `sprayer-field-capacity`: "field
capacity", "acres per hour", "spray time", "tanks needed", "swath"); the `app.js`
`AGRICULTURE_RENDERERS` registers all three; the `// dims:` annotations; and the
regenerated v14 corpus + tile-index. A `test/unit/bounds-fuzzer.test.js` block pins
every worked example, the optional target-pressure solve branch, the
outside-the-band flag, the `ceil` tank count, and every error seam.

**Module-cap note.** `calc-agriculture.js` is the cohesive home (it owns `gpa-rate`,
`sprayer-calibration`, and `tank-mix`) but has run near its size cap before; before
landing, build and run `scripts/check-module-sizes.mjs` and bump the documented cap
with a dated comment, or place the bench in a sibling module if it crosses cap.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate; `check-readme-counts` agrees at
**630 tiles** and the matching sitemap URL count); `npm test` (+3 fixtures);
`npm run build` (630 tile shells, regenerated sitemap); `npm run data:verify`; the
worked-examples runner (+3 fixtures with cross-checks); the 320 px shell audit (the
flow at pressure, the buffer distance, and the acres-per-hour / spray-time / tank
count all wrap, not scroll, on a phone); and the full-catalog render-no-nan Chromium
sweep plus the a11y gate, with the rendered output read to the value (0.4 gpm at 40
psi run at 60 -> 0.49 gpm; Medium / 15 mph / 30 in -> 45 ft; 30 ft / 6 mph / 70% ->
15.3 ac/hr and 4 tanks over 80 acres).

## 5. Roadmap position

v84 closes the applicator loop: pick the tip, hold the buffer, and budget the day.
It links the existing sprayer bench (`nozzle-flow-pressure` feeds `gpa-rate`,
`sprayer-field-capacity` feeds `tank-mix`) so an applicator reads across all five.
Further growth should be evidence-driven (a named gap a working applicator hits) --
candidates include an air-blast orchard-sprayer air-volume tile and a granular-
applicator calibration tile, neither shipping without a named field need.
