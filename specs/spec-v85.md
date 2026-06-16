# roughlogic.com Specification v85 -- Welding Gas, Cutting, and Consumable Cost (Group E, 4 New Tiles)

> **Implementation status: CLOSED -- LANDED 2026-06-16 (catalog 630 -> 634, the end
> of the combined 624 -> 634 v83-v85 expansion).** v85 inherits everything from
> spec.md through spec-v84.md and changes none of it. v83-v85 landed together in one
> commit stamping a single minor, **0.64.0** (rather than the spec's individual
> 0.66.0 target). All four welding tiles (`shielding-gas-runtime`,
> `oxyfuel-cutting-gas`, `weld-preheat-fuel`, `weld-cost-per-foot`) ship in
> `calc-fab.js` (no new module needed -- it was declared since spec-v36) with the
> full v14 discipline; every gate is green.
>
> v85 finishes the welding bench in **Group E (Carpentry and Construction)** on the
> side every shop estimator cares about: gas, cutting, preheat, and money. The
> catalog already does the metallurgy and the deposit -- `weld-usage` (deposit and
> consumable weight, arc minutes, and shielding-gas cubic feet for an arc deposit),
> `weld-heat-input`, `fillet-weld-strength`, `groove-weld-strength`,
> `weld-duty-cycle`, and `carbon-equivalent` (the preheat *temperature*). It says
> nothing about how long a gas cylinder lasts, what an oxy-fuel *cut* consumes, what
> *fuel* it takes to reach the preheat temperature, or what a foot of weld actually
> *costs*. Those are the numbers a shop runs to bid and to stock the truck. **No new
> group, no new dependencies, no telemetry, no AI, US standards only.** All four land
> in `calc-fab.js` (the fabrication bench), keeping the near-cap
> `calc-construction.js` from growing.
>
> **The gap, and the evidence for it.** A concept-check against the post-v84 live
> ids for shielding-gas-runtime / cylinder / oxy-fuel / cutting / acetylene /
> preheat-fuel / cost-per-foot returned nothing. `weld-usage` outputs a total gas
> *volume* in cubic feet, not a cylinder runtime, bottle count, or cost, and it
> models an arc *deposit*, not a cut. `carbon-equivalent` recommends a preheat
> temperature but never sizes the fuel to reach it. Nothing in the catalog turns weld
> consumables into dollars. The single number a shop owner asks first -- what does
> this weld cost per foot -- has no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `shielding-gas-runtime` carries a volumetric flow times a
  time to a gas volume (`L^3`) and a dimensionless cylinder count; `oxyfuel-cutting-gas`
  carries length over a cut speed to a time, then flows to gas volumes (`L^3`);
  `weld-preheat-fuel` carries weight (`F`) times a specific heat times a temperature
  difference (`Theta`) to an energy (Btu) and a fuel weight (`F`); `weld-cost-per-foot`
  carries a weight-per-length and a rate to a dimensionless cost per foot.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive flow, time, cylinder volume, cut length, cut speed, steel mass,
  efficiency, deposition rate, operating factor, or rate returns `{ error }`. A
  preheat temperature at or below the start temperature returns `{ error }` (no fuel
  is needed and the tile must say so, not return zero or a negative). Cylinder counts
  are `ceil` of finite ratios; the optional cost outputs are `null` when their rate
  input is left at zero.
- The v19/v22 citation discipline applies. `shielding-gas-runtime`,
  `oxyfuel-cutting-gas`, and `weld-preheat-fuel` use **`GOVERNANCE.worker_safety`**
  ("Math aid for personal verification. Compressed-gas, flashback, and hot-work
  hazards govern; follow the equipment maker's instructions and your site's hot-work
  permit."); `weld-cost-per-foot` uses **`GOVERNANCE.general`**. Sources are named,
  never reproduced: the **torch and regulator maker's tip and flow charts**, the
  **AWS welding cost and consumable references** (deposition efficiency and operating
  factor ranges, named generically), the **specific heat of carbon steel** (about
  0.11 Btu/lb-degF), and the **heating value of propane** (about 21,600 Btu/lb).
  None is law the tile restates; the equipment maker's chart and the WPS govern, and
  every flow, efficiency, and cost is an editable representative value.
- Tile ids are kebab-case and checked against the post-v84 live ids. None collides
  with `weld-usage`, `weld-heat-input`, `weld-duty-cycle`, `carbon-equivalent`,
  `fillet-weld-strength`, `groove-weld-strength`, or `metal-weight` (see Section 3).

## 2. The tiles

### 2.1 `shielding-gas-runtime` -- Shielding-Gas Cylinder Runtime, Count, and Cost (Group E, calc-fab.js)

`weld-usage` gives the total cubic feet of shielding gas a weld will use; this turns
a flow setting and the arc-on time into how long a cylinder lasts, how many cylinders
a job needs, and what the gas costs.

```
inputs:
  flow_cfh        -    gas flow setting (cubic feet per hour)
  arc_on_min      -    total arc-on time for the job (minutes)
  cylinder_ft3    -    usable gas in one cylinder (e.g. 251 for a "330" argon-mix, 145, 80)
  gas_cost        -    optional cost per full cylinder (0 = off)

gas_used_ft3        = flow_cfh * arc_on_min / 60
runtime_hr_per_cyl  = cylinder_ft3 / flow_cfh
cylinders_needed    = ceil(gas_used_ft3 / cylinder_ft3)
job_gas_cost        = gas_cost > 0 ? (gas_used_ft3 / cylinder_ft3) * gas_cost : null   (prorated)
```

Outputs: the gas used (cubic feet), the runtime per cylinder, the cylinders needed,
and the prorated gas cost for the job. The note line states: `weld-usage` gives the
gas volume from the weld geometry, this turns a flow setting and arc-on time into
bottle runtime, count, and cost; set the flow to the gun and the joint, not higher --
excess gas wastes money and causes turbulence and porosity, not better coverage; the
cylinder volume is the *usable* gas (a "330" cylinder holds about 251 cubic feet of
argon mix); and a draft steals coverage, so a windscreen beats cranking the flow.

**Worked example (pinned).** 35 cfh, 120 min arc-on, a 251 cubic-foot cylinder, 60
dollars per cylinder: gas used = 35 x 120 / 60 = **70 ft3**; runtime per cylinder =
251 / 35 = **7.2 hr**; cylinders = ceil(70 / 251) = **1**; gas cost = (70 / 251) x 60
= **16.73 dollars**. Cross-check (a long job, 480 min): gas used = 280 ft3, cylinders
= ceil(280 / 251) = **2**, cost (280 / 251) x 60 = **66.93 dollars**. Cross-check
(higher flow 45 cfh, 120 min): gas used 90 ft3, runtime per cylinder 251 / 45 =
**5.6 hr**. Degenerate inputs (flow <= 0, arc-on <= 0, cylinder <= 0, non-finite)
return an error.

### 2.2 `oxyfuel-cutting-gas` -- Oxy-Fuel Cutting Gas Consumption and Runtime (Group E, calc-fab.js)

Oxy-fuel cutting is a different process from the arc deposit `weld-usage` models: the
cutting oxygen does the work and the fuel gas only preheats. This tile gives the
oxygen and fuel consumed for a cut and the cylinder runtime for each, from the tip
flows, the cut length, and the travel speed.

```
inputs:
  oxygen_cfh      -    cutting-oxygen flow at the tip (from the tip chart)
  fuel_cfh        -    preheat fuel-gas flow (acetylene or propane)
  cut_length_in   L    total length of cut
  cut_speed_ipm   -    travel speed (inches per minute)
  oxygen_cyl_ft3  -    usable oxygen per cylinder (default 244)
  fuel_cyl_ft3    -    usable fuel per cylinder (default 330)

cut_time_min       = cut_length_in / cut_speed_ipm
oxygen_used_ft3    = oxygen_cfh * cut_time_min / 60
fuel_used_ft3      = fuel_cfh * cut_time_min / 60
oxygen_runtime_hr  = oxygen_cyl_ft3 / oxygen_cfh
fuel_runtime_hr    = fuel_cyl_ft3 / fuel_cfh
```

Outputs: the cut time, the oxygen and fuel consumed, and the runtime per cylinder for
each gas. The note line states: oxygen does the cutting by oxidizing the steel, so it
dominates consumption and runs out first; acetylene withdrawal is limited to about a
seventh of the cylinder volume per hour or the acetone solvent carries over -- run
propane or manifold the cylinders for a high draw; the tip chart from the torch maker
sets the real flows and speeds; and oxy-fuel cuts carbon steel only, not stainless or
aluminum.

**Worked example (pinned).** A 1/2 in plate tip: 55 cfh cutting oxygen, 12 cfh
acetylene, 240 in of cut at 16 ipm, a 244-cubic-foot oxygen cylinder and a
330-cubic-foot fuel cylinder: cut time = 240 / 16 = **15 min**; oxygen used = 55 x
15 / 60 = **13.75 ft3**; fuel used = 12 x 15 / 60 = **3.0 ft3**; oxygen runtime =
244 / 55 = **4.4 hr**; fuel runtime = 330 / 12 = **27.5 hr**. Cross-check (a 2 in
plate tip, 220 cfh oxygen, 25 cfh fuel, 60 in at 8 ipm): cut time 7.5 min, oxygen
used 220 x 0.125 = **27.5 ft3**, oxygen runtime 244 / 220 = **1.1 hr**. Degenerate
inputs (any flow <= 0, cut length <= 0, speed <= 0, cylinder <= 0, non-finite) return
an error.

### 2.3 `weld-preheat-fuel` -- Preheat Energy and Fuel to Temperature (Group E, calc-fab.js)

`carbon-equivalent` recommends a preheat temperature; this sizes the fuel to get
there. It heats a steel mass from ambient to the preheat temperature, accounting for
the low efficiency of an open torch on a plate.

```
inputs:
  steel_lb         F    mass to preheat (the joint region, not the whole part)
  start_temp_F     -    ambient / starting temperature
  preheat_temp_F   -    target preheat temperature (from carbon-equivalent or the WPS)
  efficiency_pct   -    torch-to-part heat efficiency (default 25 for an open propane torch)
  c_steel          -    specific heat of steel, Btu/lb-degF (default 0.11)
  propane_btu_lb   -    heating value of propane, Btu/lb (default 21600)

heat_needed_btu = steel_lb * c_steel * (preheat_temp_F - start_temp_F)
fuel_btu        = heat_needed_btu / (efficiency_pct / 100)
propane_lb      = fuel_btu / propane_btu_lb
propane_gal     = fuel_btu / 91500          (about 91,500 Btu per gallon of propane)
```

Outputs: the heat needed in the steel, the fuel energy after efficiency, and the
propane in pounds and gallons. The note line states: only the steel near the joint
needs to reach temperature, but heat conducts away fast, so the efficiency of an open
torch on a plate is low (roughly 15 to 30 percent) -- an enclosed heat, a heating
blanket, or induction is far higher; hold the preheat through the weld and verify the
interpass temperature with a crayon or pyrometer; and the preheat *temperature* comes
from `carbon-equivalent` or the WPS, this tile only sizes the *fuel* to reach it.

**Worked example (pinned).** 200 lb of steel from 70 to 300 degF at 25 percent
efficiency: heat needed = 200 x 0.11 x 230 = **5,060 Btu**; fuel = 5,060 / 0.25 =
**20,240 Btu**; propane = 20,240 / 21,600 = **0.94 lb** = 20,240 / 91,500 = **0.22
gal**. Cross-check (500 lb, 70 to 400 degF, 25 percent): heat 500 x 0.11 x 330 =
**18,150 Btu**, fuel 72,600 Btu, propane **3.36 lb**. Cross-check (higher 40 percent
efficiency, 200 lb, 70 to 300): fuel 5,060 / 0.40 = 12,650 Btu, propane **0.59 lb**.
Degenerate inputs (mass <= 0, efficiency <= 0, preheat at or below start, non-finite)
return an error.

### 2.4 `weld-cost-per-foot` -- All-In Welding Cost per Foot (Group E, calc-fab.js)

`weld-usage` gives the deposit weight and arc time; this turns them into dollars per
foot of weld, where labor and the operating factor -- not the filler -- usually
dominate.

```
inputs:
  deposit_lb_per_ft     F    filler deposited per foot of weld (weld-usage deposit_lb / length)
  deposition_eff_pct    -    consumable efficiency (SMAW ~62, GMAW solid ~95, FCAW ~82) (default 95)
  filler_cost_per_lb    -    cost of the consumable, dollars per pound
  deposition_rate_lb_hr -    arc deposition rate (pounds per hour)
  operating_factor_pct  -    arc-on time divided by clock time (default 30)
  labor_rate_per_hr     -    welder labor + overhead, dollars per hour
  gas_cost_per_ft       -    optional shielding-gas cost per foot (0 = off)

consumable_lb_per_ft = deposit_lb_per_ft / (deposition_eff_pct / 100)
filler_cost_ft       = consumable_lb_per_ft * filler_cost_per_lb
arc_hr_per_ft        = deposit_lb_per_ft / deposition_rate_lb_hr
labor_hr_per_ft      = arc_hr_per_ft / (operating_factor_pct / 100)
labor_cost_ft        = labor_hr_per_ft * labor_rate_per_hr
total_cost_ft        = filler_cost_ft + labor_cost_ft + gas_cost_per_ft
```

Outputs: the consumable per foot, the filler cost, the labor hours and cost per foot,
and the all-in total per foot. The note line states: labor and the operating factor
(arc-on time divided by clock time, typically 20 to 40 percent for manual welding and
higher for mechanized) usually dominate the cost, not the filler; the deposit per
foot comes from `weld-usage`; deposition efficiency is the stub, spatter, and slag
loss (SMAW about 60 to 65 percent, GMAW solid about 90 to 98 percent, FCAW about 80
to 85 percent); and a real bid adds shop overhead, grinding, tips, nozzles, and
power.

**Worked example (pinned).** 0.10 lb/ft deposit, 95 percent efficiency, 2.50 dollars
per pound filler, 8 lb/hr deposition, 30 percent operating factor, 65 dollars per
hour labor, 0.05 dollars per foot gas: consumable = 0.10 / 0.95 = 0.1053 lb/ft;
filler cost = 0.1053 x 2.50 = **0.26/ft**; arc time = 0.10 / 8 = 0.0125 hr; labor
time = 0.0125 / 0.30 = 0.0417 hr; labor cost = 0.0417 x 65 = **2.71/ft**; total =
0.26 + 2.71 + 0.05 = **3.02 dollars per foot**. Cross-check (raise the operating
factor to 50 percent): labor time 0.025 hr, labor cost 1.63/ft, total = 0.26 + 1.63
+ 0.05 = **1.94/ft** -- the operating factor moves the number more than anything.
Cross-check (SMAW, 62 percent efficiency, 3.00 dollars per pound stick, 4 lb/hr, 25
percent factor): consumable 0.161 lb/ft, filler 0.48/ft, arc 0.025 hr, labor 0.10 hr
x 65 = 6.50/ft, total about **7.03 dollars per foot**. Degenerate inputs (deposit
<= 0, efficiency <= 0, deposition rate <= 0, operating factor <= 0, non-finite)
return an error.

## 3. Concept-check and wiring

Concept-checked against the post-v84 live tiles. `weld-usage` outputs the deposit and
consumable *weight*, the arc *minutes*, and the shielding-gas *volume* for an arc
deposit; `shielding-gas-runtime` turns a flow and time into bottle *runtime, count,
and cost*, and `oxyfuel-cutting-gas` models the oxy-fuel *cutting* process, which
`weld-usage` does not. `carbon-equivalent` recommends a preheat *temperature*;
`weld-preheat-fuel` sizes the *fuel* to reach it. No live tile gives a welding cost
in dollars; `weld-cost-per-foot` does, consuming `weld-usage`'s deposit weight and
the operating factor. `weld-heat-input`, `weld-duty-cycle`, `fillet-weld-strength`,
`groove-weld-strength`, and `metal-weight` are all unrelated quantities. No tile
computes gas runtime, oxy-fuel cutting consumption, preheat fuel, or cost per foot.
**All four ship**, into `calc-fab.js`.

Per-tile wiring (each of the four): a `tools-data.js` row (group `E`, trades
`["welding", "fabrication"]`); `tile-meta.js` `_TILES`; a `citations.js` entry (the
governance noted in Section 1; the formula string; assumptions listing every bundled
constant -- the default cylinder volumes 251 / 244 / 330 cubic feet, the acetylene
one-seventh withdrawal limit, the 0.11 Btu/lb-degF steel specific heat and the 21,600
Btu/lb and 91,500 Btu/gal propane heating values, the 25 percent open-torch
efficiency, and the deposition-efficiency and operating-factor ranges -- and naming
the torch maker's tip charts, the AWS cost references, and the steel and propane
property values without reproduction); `test/fixtures/worked-examples.json` (every
pinned example and cross-check); `test/fixtures/compute-map.js` (module path
`../../calc-fab.js`); `scripts/related-tiles.mjs` (`shielding-gas-runtime` ->
`weld-usage` / `weld-cost-per-foot` / `weld-duty-cycle`; `oxyfuel-cutting-gas` ->
`weld-usage` / `metal-weight`; `weld-preheat-fuel` -> `carbon-equivalent` /
`weld-heat-input`; `weld-cost-per-foot` -> `weld-usage` / `shielding-gas-runtime` /
`weld-duty-cycle`); `data/search/aliases.json` (e.g. `shielding-gas-runtime`:
"shielding gas", "cylinder runtime", "argon", "CO2", "gas cost"; `oxyfuel-cutting-gas`:
"oxy fuel", "cutting torch", "acetylene", "propane cutting", "oxygen consumption";
`weld-preheat-fuel`: "preheat", "preheat fuel", "torch heat", "interpass", "propane
preheat"; `weld-cost-per-foot`: "weld cost", "cost per foot", "operating factor",
"deposition efficiency", "weld estimate"); the `app.js` `FAB_RENDERERS` registers all
four (a new `declare("./calc-fab.js", "FAB_RENDERERS", [ids])` if `calc-fab.js` is not
already declared); the `// dims:` annotations; and the regenerated v14 corpus +
tile-index. A `test/unit/bounds-fuzzer.test.js` block pins every worked example, the
`ceil` cylinder count, the preheat-at-or-below-start error seam, the `null`-cost
branch when a rate is zero, and every other error seam.

**Module note.** `calc-fab.js` is chosen as the home (fabrication consumables) to
keep the near-cap `calc-construction.js` -- which owns `weld-usage` -- from growing.
If `calc-fab.js` is not yet wired into `app.js`, `scripts/build.mjs` RUNTIME_FILES,
`sw.js` precache, and `scripts/check-module-sizes.mjs`, follow the new-module
checklist in the project notes; otherwise add to its existing declare. Group letter
(`E`) is independent of the module.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate; `check-readme-counts` agrees at
**634 tiles** and the matching sitemap URL count); `npm test` (+4 fixtures);
`npm run build` (634 tile shells, regenerated sitemap); `npm run data:verify`; the
worked-examples runner (+4 fixtures with cross-checks); the 320 px shell audit (the
gas used / runtime / count / cost, the cut times and consumption, the preheat energy
and propane, and the cost-per-foot breakdown all wrap, not scroll, on a phone); and
the full-catalog render-no-nan Chromium sweep plus the a11y gate, with the rendered
output read to the value (35 cfh / 120 min / 251 ft3 -> 70 ft3 and 16.73 dollars;
55 cfh oxygen / 240 in at 16 ipm -> 13.75 ft3; 200 lb / 70 to 300 degF / 25% -> 0.94
lb propane; 0.10 lb/ft at 30% factor -> about 3.02 dollars per foot).

## 5. Roadmap position

v85 finishes the welding bench on the business side: gas runtime, cutting
consumption, preheat fuel, and cost per foot. It links the existing bench
(`shielding-gas-runtime` and `weld-cost-per-foot` consume `weld-usage`;
`weld-preheat-fuel` consumes `carbon-equivalent`) so a welder and an estimator read
across the whole group. Further growth should be evidence-driven (a named gap a shop
hits) -- candidates include a plasma-cutting consumable-life tile and a
weld-distortion / shrinkage tile, neither shipping without a named field need.
