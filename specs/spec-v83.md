# roughlogic.com Specification v83 -- Onsite Septic and Pressure Distribution (Group B, 3 New Tiles)

> **Implementation status: CLOSED -- LANDED 2026-06-16 (catalog 624 -> 627 of the
> combined 624 -> 634 v83-v85 expansion).** v83 inherits everything from spec.md
> through spec-v82.md and changes none of it. v83, v84, and v85 landed together in
> one commit; rather than three discrete minors (0.64.0 / 0.65.0 / 0.66.0) the
> combined +10-tile expansion stamps a single minor, **0.64.0**. All three septic
> tiles (`septic-dose-tank`, `septic-pumpout-interval`, `septic-lpp-orifice`) ship
> in `calc-plumbing.js` with the full v14 discipline; every gate is green.
>
> v83 finishes the one trade the catalog names but only half-equips: the onsite
> septic installer and pumper. Group B already sizes the tank (`septic-tank`), the
> soil absorption area (`septic-drainfield`), and the grease interceptor
> (`grease-trap`). It says nothing about how the effluent gets *delivered* to a
> pressurized field, when the tank has to be *pumped out*, or what a low-pressure
> distribution lateral actually *flows*. Those are the three numbers a septic crew
> reaches for in the field. **No new group, no new dependencies, no telemetry, no
> AI, US standards only.** All three land in `calc-plumbing.js` next to
> `septic-tank`.
>
> **The gap, and the evidence for it.** A concept-check against the post-v82 live
> ids for dose-tank / drainback / doses-per-day / pump-out / pumping-frequency /
> sludge / scum / mound / sand-filter / LPP / squirt / orifice-distribution returned
> nothing. `septic-tank` is a static volume from bedrooms or flow; `septic-drainfield`
> is a soil absorption *area* from an application rate; `pump-tdh` and `pump-sizing`
> are general pump-head tiles. None computes a timed dose volume, a pump-out interval
> from accumulation, or the orifice flow and squirt height of a pressure-distribution
> lateral. The single most common onsite-system upgrade -- a pressurized or
> pump-to-mound field replacing a failed gravity bed -- has no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `septic-dose-tank` carries volume (`L^3`, gallons) in and
  out with dimensionless dose and ratio counts; `septic-pumpout-interval` carries
  volume (`L^3`) over a per-capita annual accumulation to a dimensionless count of
  years; `septic-lpp-orifice` carries length (`L`, orifice diameter and head)
  producing a volumetric flow (`L^3`-per-time, gpm) and dimensionless orifice counts.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive flow, tank volume, occupant count, accumulation rate, orifice
  diameter, squirt head, discharge coefficient, or lateral/orifice count returns
  `{ error }`. A fill fraction outside `(0, 1)` returns `{ error }`. Doses per day
  must be a positive finite number. The dose-to-void ratio is `null` (not infinity)
  when drainback is zero, and load/orifice counts are `ceil` of finite ratios.
- The v19/v22 citation discipline applies. All three tiles use
  **`GOVERNANCE.plumbing`** ("Math aid for personal verification. Your local onsite
  / septic code, the permitting authority, and a licensed installer or designer
  govern."). Sources are named, never reproduced: the **USEPA Onsite Wastewater
  Treatment Systems Manual (EPA 625/R-00/008)**, **university onsite-wastewater
  extension guidance** (pumping-frequency tables and low-pressure-pipe design,
  named generically), and the standard **orifice-discharge equation**. None is law
  the tile restates; the local code and the permit drawing govern, and application
  rates, dose counts, and accumulation rates are all set by the authority having
  jurisdiction.
- Tile ids are kebab-case and checked against the post-v82 live ids. None collides
  with `septic-tank`, `septic-drainfield`, `grease-trap`, `pump-tdh`, or
  `pump-sizing` (see Section 3).

## 2. The tiles

### 2.1 `septic-dose-tank` -- Pump / Dose Tank Volume and Daily Cycles (Group B, calc-plumbing.js)

A pressurized field is fed in timed doses, not a trickle. The dose tank pumps a
working volume each cycle; the laterals drain back into the tank when the pump
stops, so the pump moves the net dose plus the drainback every cycle. This tile
turns the design daily flow and a target dose count into the per-cycle and per-day
pumped volumes, and checks that the dose is large enough to pressurize the laterals.

```
inputs:
  daily_flow_gpd   L^3   design daily flow to the field
  doses_per_day    -     number of timed doses per day (default 4)
  drainback_gal    L^3   volume that drains back from the laterals after pump-off (default 0)

net_dose_gal       = daily_flow_gpd / doses_per_day        (effluent delivered to the field per cycle)
pumped_per_dose    = net_dose_gal + drainback_gal          (what the pump actually moves each cycle)
pumped_per_day     = pumped_per_dose * doses_per_day
void_ratio         = drainback_gal > 0 ? net_dose_gal / drainback_gal : null   (target >= 5)
```

Outputs: the net dose delivered to the field per cycle, the volume the pump moves
per cycle (net dose plus drainback), the doses per day, the total pumped per day,
and the dose-to-void ratio with a flag when it falls below 5. The note line states:
the dose should be at least about five times the volume of the laterals and manifold
that drains back, so the field pressurizes fully before the dose is spent; more,
smaller doses spread the load and rest the soil better than one big dose; the
drainback returns to the tank and is re-pumped, so it is pumping energy, not lost
flow; and the dose count, dose volume, and float settings on the permit drawing
govern.

**Worked example (pinned).** A 600 gpd field, 4 doses per day, 5 gal drainback:
net dose = 600 / 4 = **150 gal**; pumped per dose = 150 + 5 = **155 gal**; pumped
per day = 155 x 4 = **620 gal**; void ratio = 150 / 5 = **30** (>= 5, OK).
Cross-check (450 gpd, 6 doses, no drainback): net dose 75, pumped per dose 75,
pumped per day 450, ratio not applicable. Cross-check (600 gpd, 4 doses, 40 gal
drainback): net dose 150, pumped per dose 190, pumped per day 760, ratio 150 / 40 =
**3.75** (< 5, flag: raise the dose or cut the drainback). Degenerate inputs (flow
<= 0, doses <= 0, drainback < 0, non-finite) return an error.

### 2.2 `septic-pumpout-interval` -- Years Between Tank Pump-Outs (Group B, calc-plumbing.js)

Sludge settles and scum floats; when they fill enough of the tank, the clear zone
shrinks and solids carry over to the field and ruin it. This tile estimates the
years between pump-outs from the tank volume, the household size, and a per-capita
accumulation rate, and is loud that a measurement, not a calendar, governs.

```
inputs:
  tank_gal           L^3   working liquid volume of the tank
  people             -     household occupants
  accum_gal_pp_yr    -     net sludge + scum accumulation per person per year (default 30)
  fill_fraction      -     fraction of the tank that may fill before pumping (default 0.33)

allowed_gal = tank_gal * fill_fraction
years       = allowed_gal / (people * accum_gal_pp_yr)
```

Outputs: the years between pump-outs, the allowed accumulation volume, and the
annual accumulation. The note line states: accumulation varies widely with diet,
water use, and whether a garbage disposal is used (a disposal roughly doubles the
rate), so this is a planning estimate -- a sludge-judge or core measurement of the
actual sludge and scum depth governs the call; never let the sludge reach the outlet
baffle or solids wash into the field; and many states set a mandatory inspection or
pumping interval that overrides any estimate.

**Worked example (pinned).** A 1,000 gal tank, 4 people, 30 gal per person per year,
1/3 fill: allowed = 1,000 x 0.33 = **330 gal**; years = 330 / (4 x 30) = 330 / 120 =
**2.75 years**. Cross-check (1,500 gal tank, same household): allowed 495, years
495 / 120 = **4.1 years**. Cross-check (1,000 gal, 2 people): 330 / 60 = **5.5
years**. Cross-check (garbage disposal, accumulation 55, 1,000 gal, 4 people):
330 / 220 = **1.5 years**. Degenerate inputs (tank <= 0, people <= 0, accumulation
<= 0, fill fraction <= 0 or >= 1, non-finite) return an error.

### 2.3 `septic-lpp-orifice` -- Low-Pressure Lateral Orifice Flow and Squirt Height (Group B, calc-plumbing.js)

A low-pressure-pipe or mound field delivers effluent through small orifices drilled
along pressurized laterals; the residual pressure at each orifice (its "squirt
height") sets the per-orifice flow, and the sum sets the flow the pump must deliver.
This tile applies the orifice-discharge equation to size that distribution.

```
inputs:
  orifice_dia_in        L    orifice diameter (e.g. 0.1875 = 3/16 in, 0.25 = 1/4 in)
  squirt_ft             L    residual head at the orifice (squirt height; ~2.5 to 5 ft for LPP)
  cd                    -    orifice discharge coefficient (default 0.6)
  orifices_per_lateral  -    orifices per lateral
  num_laterals          -    number of laterals on the manifold

per_orifice_gpm = 19.63 * cd * orifice_dia_in^2 * sqrt(squirt_ft)    (Cd = 0.6 gives the familiar 11.79 coeff)
total_orifices  = orifices_per_lateral * num_laterals
system_gpm      = per_orifice_gpm * total_orifices
```

Outputs: the per-orifice flow (gpm), the squirt height restated (ft and approximate
psi), the total orifice count, and the system flow the pump must deliver (gpm). The
note line states: a uniform squirt end to end requires the manifold and laterals to
be sized so the distal-to-proximal flow varies by less than about ten percent (the
LPP ten-percent rule); the squirt height target is roughly 2.5 to 5 ft (about 1 to
2 psi) for LPP and higher for mound or drip systems; this system flow plus the
drainback sets the dose tank and pump (pair with `septic-dose-tank` and `pump-tdh`);
and orifice size, spacing, and lateral layout come from the permitted onsite design.

**Worked example (pinned).** A 1/4 in orifice (0.25), 5 ft squirt, Cd 0.6, 10
orifices per lateral on 4 laterals: per orifice = 19.63 x 0.6 x 0.0625 x sqrt(5) =
11.78 x 0.0625 x 2.2361 = **1.65 gpm**; total orifices = 40; system = 1.65 x 40 =
**65.8 gpm**. Cross-check (3/16 in orifice, same field): per orifice = 11.78 x
0.03516 x 2.2361 = **0.93 gpm**, system 0.93 x 40 = **37.0 gpm**. Cross-check (1/4
in, lower 2.5 ft squirt): per orifice = 11.78 x 0.0625 x 1.5811 = **1.16 gpm**,
system **46.6 gpm**. Degenerate inputs (diameter <= 0, squirt <= 0, Cd <= 0,
orifice or lateral count <= 0, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the post-v82 live tiles. `septic-tank` (Group B) is a static
tank volume from bedrooms or daily flow; `septic-dose-tank` is a *timed-dose* working
volume and cycle count, a different quantity and a pressurized-system audience.
`septic-drainfield` is a soil *absorption area* and trench length from an application
rate; `septic-lpp-orifice` is the *pressure-distribution* orifice flow and squirt
height that a pressurized field needs and a gravity trench does not. `pump-tdh` and
`pump-sizing` size a pump from head and flow; `septic-dose-tank` and
`septic-lpp-orifice` produce the *dose volume and the system flow* that feed those
pump tiles, they do not duplicate them. No tile computes a dose-tank cycle, a
pump-out interval from accumulation, or an LPP orifice flow. **All three ship**, into
`calc-plumbing.js`.

Per-tile wiring (each of the three): a `tools-data.js` row (group `B`, trades
`["plumbing"]`); `tile-meta.js` `_TILES`; a `citations.js` entry (`GOVERNANCE.plumbing`;
the formula string; assumptions listing every bundled constant -- the default 4
doses, the 5x dose-to-void target, the default 30 gal per person per year and 1/3
fill fraction, the 0.6 discharge coefficient and the 19.63 / 11.79 orifice
coefficient -- and naming EPA 625/R-00/008, the onsite-wastewater extension guidance,
and the orifice-discharge equation without reproduction);
`test/fixtures/worked-examples.json` (every pinned example and cross-check);
`test/fixtures/compute-map.js` (module path `../../calc-plumbing.js`);
`scripts/related-tiles.mjs` (`septic-dose-tank` -> `septic-lpp-orifice` / `pump-tdh` /
`septic-tank`; `septic-pumpout-interval` -> `septic-tank` / `grease-trap`;
`septic-lpp-orifice` -> `septic-dose-tank` / `pump-tdh` / `septic-drainfield`);
`data/search/aliases.json` (e.g. `septic-dose-tank`: "dose tank", "pump tank",
"timed dose", "drainback", "doses per day"; `septic-pumpout-interval`: "pump out",
"pumping frequency", "septic schedule", "sludge", "scum"; `septic-lpp-orifice`:
"low pressure pipe", "LPP", "squirt height", "orifice flow", "pressure distribution",
"mound"); the `app.js` `PLUMBING_RENDERERS` registers all three; the `// dims:`
annotations on the compute functions; and the regenerated v14 corpus + tile-index.
A `test/unit/bounds-fuzzer.test.js` block pins every worked example, the
zero-drainback `null`-ratio branch, the sub-5 void-ratio flag, the fill-fraction
bound, and every error seam.

**Module-cap note.** `calc-plumbing.js` is the cohesive home (it owns `septic-tank`
and `septic-drainfield`) but has run near its size cap before; before landing, build
and run `scripts/check-module-sizes.mjs` and bump the documented cap with a dated
comment, or place the bench in a sibling module if it crosses cap.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate; `check-readme-counts` agrees at
**627 tiles** and the matching sitemap URL count); `npm test` (+3 fixtures);
`npm run build` (627 tile shells, regenerated sitemap); `npm run data:verify`; the
worked-examples runner (+3 fixtures with cross-checks); the 320 px shell audit (the
dose volumes, the years-between-pumping, the per-orifice and system flows all wrap,
not scroll, on a phone); and the full-catalog render-no-nan Chromium sweep plus the
a11y gate, with the rendered output read to the value (600 gpd / 4 doses / 5 gal
drainback -> 150 / 155 / 620 / 30; 1,000 gal / 4 people -> 2.75 years; 1/4 in / 5 ft
/ 40 orifices -> 1.65 gpm / 65.8 gpm).

## 5. Roadmap position

v83 finishes the onsite-septic trade for the installer and pumper: deliver the dose,
schedule the pump-out, and size the pressure distribution. It links the existing
plumbing pump bench (`septic-dose-tank` and `septic-lpp-orifice` reference `pump-tdh`)
so a designer reads across both. Further septic growth should be evidence-driven (a
named gap an installer or designer hits) -- candidates include an aerobic-treatment-
unit (ATU) sizing tile and a drip-dispersal zone tile, neither shipping without a
named field need.
