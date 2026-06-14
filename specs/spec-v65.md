# roughlogic.com Specification v65 -- Rigging and Heavy Lift, the Lift-Planning Core (New Group Z, 7 New Tiles)

> **Implementation status: OPEN (proposed 2026-06-13; targets package 0.59.0, a
> minor; catalog 598 -> 605, new Group Z 0 -> 7).** v65 inherits everything from
> spec.md through spec-v64.md and changes none of it. It assumes the v58 -> v64
> batch has landed (catalog base 598).
>
> v65 opens **Group Z (Rigging and Heavy Lift)**, the first new group since the
> v12 allied-profession sweep (the v28 "Group Z" low-voltage tiles were folded
> into Group A and never occupied the letter). The catalog already touches rigging,
> but the touch is shallow and scattered: `crane-lift-quick` (Group E) does gross
> load / sling tension / percent-of-chart; `sling-angle` (Group F) does tension per
> leg; `rigging-check` (Group N) does WLL-at-angle for stage hardware; `pulley-ma-gen`
> and `rope-ma` (Group G / F) do mechanical advantage. None of them answers the
> questions a working crane-and-rigging crew asks on a real industrial pick:
> *where is the load's center of gravity and what does each pick point carry; what
> is the crane's NET capacity after the deduction stack; will the outriggers punch
> through the ground; and what does the wind do to a load in the air.* This spec
> stands up the planning core. **No new dependencies, no telemetry, no AI, US
> standards only.** All seven tiles land in a new `calc-rigging.js` module behind a
> new `RIGGING_RENDERERS` registry.
>
> **The gap, and the evidence for it.** A concept-check for
> center-of-gravity / pick-point-share / net-capacity / deduction-stack /
> ground-bearing / outrigger-pressure / crane-mat / tagline / tandem-lift /
> wind-on-load returned nothing. `crane-lift-quick` is a single gross-load percent
> check with no itemized deductions and no ground-bearing math; it explicitly defers
> to "the manufacturer's load chart" without helping the user assemble the number
> the chart is compared against. The center of gravity -- the first thing a rigger
> establishes before a pick -- has no tile at all.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `cg-load-share` carries weight (`F`) and length (`L`)
  producing weight shares (`F`); `crane-net-capacity` is force bookkeeping (`F`
  in, `F` out, dimensionless percent); `crane-ground-bearing` carries force (`F`)
  over area (`L^2`) producing pressure (`F/L^2`) and a required area (`L^2`);
  `sling-d-d-efficiency` is dimensionless ratio in, force out; `tagline-force` and
  `wind-on-load` carry a velocity-pressure term (`q = 0.00256 V^2`, the same
  constant the Group E `wind-pressure` tile uses) over a sail area (`L^2`) producing
  force (`F`); `tandem-lift-share` is the `cg-load-share` statics plus a
  dimensionless derate.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive total weight, span, area, float area, or chart capacity returns
  `{ error }`. `cg-load-share` flags (does not error on) a center of gravity that
  falls outside the two pick points -- that is a real, computable, unstable
  condition the rigger must see, not an input fault. Every percent and multiplier
  is a bounded ratio of finite quantities.
- The v19/v22 citation discipline applies. Every Group Z entry uses the existing
  **`GOVERNANCE.rigging`** notice ("Estimate. Head rigger and manufacturer
  working-load-limit charts govern. Inspect every piece of hardware before the
  show.") The sources are named, never reproduced: **ASME B30.5** (Mobile and
  Locomotive Cranes), **ASME B30.9** (Slings), **ASME B30.10** (Hooks),
  **OSHA 29 CFR 1926 Subpart CC** (Cranes and Derricks in Construction, incl.
  1926.1417 operation), the **Wire Rope Technical Board Wire Rope Users Manual**
  (D/d efficiency), and the crane manufacturer's load chart and outrigger-reaction
  data. None of these is law the tile restates; the load chart is the governing
  document and the tile says so on every screen.
- Tile ids are kebab-case and checked against the 598 live ids. The seven ids do
  not collide and are not concept-duplicates of `crane-lift-quick`, `sling-angle`,
  or `rigging-check` (see Section 3).

## 2. The tiles

### 2.1 `cg-load-share` -- Center of Gravity and Per-Pick-Point Load Share (Group Z, calc-rigging.js)

The first number on any rigging plan. A load is rarely balanced over its lift
points; the closer the center of gravity sits to one pick, the more that pick (and
its sling, hardware, and the crane) carries. This tile takes the total weight, the
span between two pick points, and the distance from the first pick point to the
center of gravity, and returns the share on each point.

```
inputs:
  total_weight_lb   F   total weight of the load (incl. any below-hook gear if known)
  span_in           L   center-to-center distance between the two pick points
  cg_from_p1_in     L   distance from pick point 1 to the center of gravity

d1 = cg_from_p1_in
d2 = span_in - d1
load_p1 = total_weight_lb * d2 / span_in     (the pick nearest the CG carries more)
load_p2 = total_weight_lb * d1 / span_in
imbalance_pct = abs(load_p1 - load_p2) / total_weight_lb * 100
cg_outside = (d1 < 0) OR (d1 > span_in)
```

Outputs: the load on pick point 1 and pick point 2, the percent imbalance, and a
clear flag when the center of gravity falls outside the two pick points (the load
will tip toward the overhung end and is not safe to lift on those points). The note
line states: the heavier sling, shackle, and hook must be sized to the *higher*
leg, not the average; a load that lifts crooked has its center of gravity off the
hook centerline and must be set down and re-rigged; and the published or estimated
weight is only as good as its source -- weigh it when in doubt.

**Worked example (pinned).** 12,000 lb skid, pick points 120 in apart, center of
gravity 40 in from pick point 1: d2 = 80 in, load_p1 = 12,000 x 80 / 120 =
**8,000 lb**, load_p2 = 12,000 x 40 / 120 = **4,000 lb**, imbalance =
(8,000 - 4,000) / 12,000 = **33.3%**, CG between the points (safe). Cross-check
(balanced): CG at 60 in -> 6,000 / 6,000, 0% imbalance. Cross-check (overhung): CG
at 130 in on a 120 in span -> `cg_outside` flag raised, the load tips off the far
end. Degenerate inputs (weight <= 0, span <= 0, non-finite) return an error.

### 2.2 `crane-net-capacity` -- Net Capacity After the Deduction Stack (Group Z, calc-rigging.js)

A load chart gives a gross capacity at a radius; what the load actually has to fit
inside is that gross figure minus everything hanging on the boom and below the
hook. This tile assembles the OSHA 1926.1417(o) deduction stack -- the items that
must be counted against capacity -- and compares the total hook load against it.

```
inputs:
  gross_chart_lb     F   capacity from the chart at the working radius and configuration
  hook_block_lb      F   weight of the hook block / overhaul ball
  jib_attach_lb      F   erected jib / boom extension and its reeving (0 if stowed and charted)
  wire_rope_lb       F   deduction for hoist rope weight (per the chart's note)
  below_hook_lb      F   slings, shackles, spreader bar, lifting beam, and devices
  load_weight_lb     F   the load itself

net_capacity_lb  = gross_chart_lb - hook_block_lb - jib_attach_lb - wire_rope_lb
total_hook_lb    = load_weight_lb + below_hook_lb
pct_of_net       = total_hook_lb / net_capacity_lb * 100
flag:  pct_of_net > 75  -> plan and document as a critical / engineered lift
       pct_of_net > 90  -> reduce radius, add crane, or re-stage; margin is gone
       pct_of_net > 100 -> STOP: over chart
```

Outputs: the net capacity available for the hook, the total hook load, the percent
of net capacity, and the 75 / 90 / 100 percent flags. The note line states: this is
arithmetic on numbers the user reads off the manufacturer's chart and rating
plate -- the chart, the configuration (boom length, radius, outrigger spread,
counterweight), and a qualified operator govern; structural vs. stability ratings
and a deration for out-of-level all live on the chart, not in this tile.

**Worked example (pinned).** Gross chart 30,000 lb at radius; hook block 800 lb,
no jib, wire rope deduction 400 lb, slings + shackles 600 lb, load 22,000 lb:
net = 30,000 - 800 - 0 - 400 = **28,800 lb**; total hook = 22,000 + 600 =
**22,600 lb**; percent = 22,600 / 28,800 = **78.5%** -> **critical-lift** flag
(over 75). Cross-check (lighter load 18,000 lb): total 18,600 / 28,800 = 64.6%, no
flag. Cross-check (over chart): load 30,000 lb -> total 30,600 / 28,800 = 106.3%,
**STOP** flag. Degenerate inputs (gross <= 0, net <= 0 after deductions,
non-finite) return an error.

### 2.3 `crane-ground-bearing` -- Outrigger / Crawler Ground Bearing Pressure and Mat Size (Group Z, calc-rigging.js)

Cranes turn over because the ground gives way, not because the chart was wrong. This
tile takes the worst-case outrigger float reaction (or crawler track reaction) and
the bearing area, returns the actual ground bearing pressure, compares it to an
allowable soil bearing the user supplies from a geotech report or table, and if it
is over, sizes the crane mat or cribbing needed to bring it under.

```
inputs:
  reaction_lb        F     maximum outrigger float (or crawler track) reaction
  bearing_area_ft2   L^2   contact area of the float / pad / track on the ground
  allowable_psf      F/L^2  allowable soil bearing pressure (from the report or table)

gbp_psf       = reaction_lb / bearing_area_ft2
pass          = gbp_psf <= allowable_psf
required_ft2  = reaction_lb / allowable_psf            (area needed to pass)
mat_side_ft   = sqrt(required_ft2)                     (square mat / cribbing side)
```

Outputs: the actual ground bearing pressure (psf), a pass / fail against the
allowable, the bearing area required to pass, and the side dimension of a square
mat or cribbing pad that delivers it. The note line states: the maximum reaction
comes from the manufacturer's outrigger-reaction chart for the lift quadrant, not
the static average -- the heaviest corner is during the swing; allowable soil
bearing must come from a geotechnical source, and "looks solid" is not a number;
voids, backfill, frost, slopes, and adjacent excavations all reduce capacity, and a
qualified person verifies the setup.

**Worked example (pinned).** Worst-corner reaction 60,000 lb on a 2.0 ft x 2.0 ft
float (4.0 ft^2); allowable soil bearing 3,000 psf: gbp = 60,000 / 4.0 =
**15,000 psf** -> **FAIL** (5x over). Required area = 60,000 / 3,000 = **20 ft^2**;
square mat side = sqrt(20) = **4.47 ft** (use a 5 ft x 5 ft mat or larger). Cross-
check (firm pad): same reaction on a 5 ft x 5 ft mat (25 ft^2) -> gbp = 2,400 psf
<= 3,000, **PASS**. Degenerate inputs (reaction <= 0, area <= 0, allowable <= 0,
non-finite) return an error.

### 2.4 `sling-d-d-efficiency` -- Wire-Rope Sling D/d Bend Efficiency (Group Z, calc-rigging.js)

A wire-rope sling choked or wrapped around a load loses capacity as the bend gets
tighter; the controlling number is the D/d ratio -- the diameter the sling bends
around (D) over the sling's own diameter (d). This tile returns the efficiency
factor from the Wire Rope Technical Board curve and the reduced working load limit.

```
inputs:
  rated_wll_lb   F     catalog working load limit of the sling (straight pull)
  bend_dia_in    L     diameter of the pin / load the sling bends around (D)
  sling_dia_in   L     diameter of the sling body (d)

ratio = bend_dia_in / sling_dia_in
efficiency = interpolated from the bundled WRTB D/d curve:
   D/d  1 ->0.50   2 ->0.65   3 ->0.70   4 ->0.75   6 ->0.83
   D/d  8 ->0.87  10 ->0.90  15 ->0.92  20 ->0.94  25+ ->1.00
reduced_wll_lb = rated_wll_lb * efficiency
```

Outputs: the D/d ratio, the bend efficiency factor, and the reduced working load
limit at that bend. The note line states: the bundled curve is for 6x19 / 6x37
wire-rope slings (synthetic round slings and web slings follow their own bend
factors); the rated WLL is the catalog straight-pull value; the sling angle factor
(`sling-angle`) and any choker-hitch reduction apply on top of this bend efficiency;
and a damaged or kinked sling is removed from service regardless of the math.

**Worked example (pinned).** A 10,000 lb-rated 6x19 sling bent around a 3 in pin,
sling diameter 1 in: D/d = 3, efficiency = **0.70**, reduced WLL = 10,000 x 0.70 =
**7,000 lb**. Cross-check (gentle bend, D/d = 10): efficiency 0.90 -> 9,000 lb.
Cross-check (sharp bend, D/d = 1): efficiency 0.50 -> 5,000 lb (half). Degenerate
inputs (rated WLL <= 0, either diameter <= 0, non-finite) return an error.

### 2.5 `wind-on-load` -- Wind Force and Swing Angle on a Suspended Load (Group Z, calc-rigging.js)

A load in the air is a sail. This tile takes the projected sail area, the wind
speed, and a shape coefficient, returns the lateral wind force and the resulting
swing angle of the suspended load, and reminds the user that the manufacturer's
in-service wind limit -- not this number -- decides whether the lift proceeds.

```
inputs:
  sail_area_ft2   L^2   projected area the wind sees (the worst face)
  wind_mph        L/T   sustained wind speed at the load
  shape_coef      -     drag / shape coefficient (flat panel ~1.2 to 2.0, default 1.6)
  load_weight_lb  F     weight of the suspended load

q_psf       = 0.00256 * wind_mph^2          (ASCE velocity pressure constant)
wind_lb     = q_psf * sail_area_ft2 * shape_coef
swing_deg   = atan(wind_lb / load_weight_lb) * 180 / pi
```

Outputs: the velocity pressure (psf), the lateral wind force (lb), and the swing
angle of the load off vertical. The note line states: large-area, light loads
(panels, tanks, ductwork, wind-turbine components) swing the most and are the most
dangerous; the manufacturer's maximum permissible in-service wind speed and the
load chart's wind / area limits govern -- many large lifts shut down well below
storm wind; gusts exceed the sustained number; and a tag line crew
(`tagline-force`) controls what is left.

**Worked example (pinned).** A 200 ft^2 panel, 20 mph wind, shape coefficient 1.6,
weighing 4,000 lb: q = 0.00256 x 20^2 = 1.024 psf; wind force = 1.024 x 200 x 1.6 =
**327.7 lb**; swing = atan(327.7 / 4,000) = **4.7 deg**. Cross-check (28 mph): q =
2.007 psf -> wind force 642 lb, swing 9.1 deg (force scales with the square of
speed). Degenerate inputs (area <= 0, weight <= 0, non-finite) return an error.

### 2.6 `tagline-force` -- Tag Line Pull to Control a Suspended Load (Group Z, calc-rigging.js)

The ground crew side of the wind problem. Given the lateral force on the load (from
wind, or a known offset) and the geometry of the tag line, this tile returns the
pull a tag-line handler must apply, the number of handlers at a safe per-person
limit, and the warning when the pull exceeds what people can safely hold.

```
inputs:
  lateral_force_lb   F     horizontal force to resist (e.g. wind_lb from wind-on-load)
  tagline_angle_deg  -     angle of the tag line above horizontal at the handler
  per_person_lb      F     safe sustained pull per handler (default 50 lb)

tag_tension_lb = lateral_force_lb / cos(tagline_angle_deg)
handlers       = ceil(tag_tension_lb / per_person_lb)
mechanical_help = tag_tension_lb > (per_person_lb * 2)   (rig a snatch block / winch)
```

Outputs: the tag-line tension required, the number of handlers needed at the
per-person limit, and a flag recommending a mechanically anchored tag (winch or
snatch block) when hand control is unsafe. The note line states: a tag line at a
shallow angle to horizontal pulls far harder than the lateral force it resists; tag
lines control rotation and position, they do not arrest a falling or runaway load;
handlers stand clear of the load's swing path and pinch points; and 50 lb sustained
per person is a planning default, not a maximum a tired crew can hold in gusts.

**Worked example (pinned).** Resisting a 328 lb wind force (from 2.5) on a tag line
at 30 deg above horizontal, 50 lb per person: tension = 328 / cos(30) = 328 / 0.866
= **378.7 lb**; handlers = ceil(378.7 / 50) = **8**; over 100 lb so a mechanical
tag is **recommended**. Cross-check (lower load, 60 lb lateral, tag near horizontal
10 deg): tension = 60.9 lb -> 2 handlers. Degenerate inputs (force < 0, angle <= 0
or >= 90, per_person <= 0, non-finite) return an error.

### 2.7 `tandem-lift-share` -- Two-Crane (Tandem) Lift Load Share (Group Z, calc-rigging.js)

Two cranes on one load split the weight by the center of gravity, exactly like
`cg-load-share`, but each crane must also be derated because tandem lifts add
dynamic and positional uncertainty no single chart accounts for. This tile returns
each crane's share, the derated chart capacity each crane must show, and a pass /
fail against the capacity the user enters.

```
inputs:
  total_weight_lb   F   total load weight (incl. below-hook gear)
  span_in           L   distance between the two crane pick points
  cg_from_c1_in     L   distance from crane 1's pick point to the center of gravity
  derate_pct        -   per-crane derate for the tandem lift (default 75, i.e. use 75% of chart)
  c1_chart_lb       F   crane 1 net capacity at its radius (from crane-net-capacity)
  c2_chart_lb       F   crane 2 net capacity at its radius

share_c1 = total_weight_lb * (span_in - cg_from_c1_in) / span_in
share_c2 = total_weight_lb * cg_from_c1_in / span_in
allow_c1 = c1_chart_lb * derate_pct / 100
allow_c2 = c2_chart_lb * derate_pct / 100
pass = (share_c1 <= allow_c1) AND (share_c2 <= allow_c2)
```

Outputs: each crane's share, each crane's derated allowable, and a combined pass /
fail. The note line states: a designated lift director controls a tandem lift; the
75% derate is a common planning default and the engineered lift plan or the more
restrictive manufacturer guidance governs; load shift during travel, boom-to-load
geometry, and out-of-level all change the share in real time; and a critical-lift
procedure with an engineered plan is standard for multi-crane work.

**Worked example (pinned).** 40,000 lb vessel, picks 300 in apart, center of
gravity 120 in from crane 1, 75% derate; crane 1 net 28,000 lb, crane 2 net 24,000
lb: share_c1 = 40,000 x 180 / 300 = **24,000 lb**, share_c2 = 40,000 x 120 / 300 =
**16,000 lb**; allow_c1 = 28,000 x 0.75 = 21,000 lb -> 24,000 > 21,000 **FAIL on
crane 1**; allow_c2 = 18,000 lb -> 16,000 <= 18,000 pass. Combined = **FAIL**, move
the pick point or upsize crane 1. Cross-check (CG centered at 150 in): 20,000 /
20,000, crane 1 20,000 <= 21,000 and crane 2 20,000 <= 18,000 -> crane 2 fails;
balancing the CG does not fix an undersized second crane. Degenerate inputs (weight
<= 0, span <= 0, derate <= 0, either chart <= 0, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the 598 live tiles. `crane-lift-quick` (Group E) is a
single gross-load percent-of-chart check with sling tension and no deduction stack,
no ground bearing, and no center-of-gravity input; `crane-net-capacity` itemizes
the OSHA 1926.1417(o) deduction stack `crane-lift-quick` omits, and the two read as
a quick-check / full-plan pair, not duplicates. `sling-angle` (Group F) returns the
angle multiplier on a leg; `sling-d-d-efficiency` returns the *bend* efficiency, an
independent reduction that stacks with the angle factor. `rigging-check` (Group N)
is a stage-hardware WLL-at-angle pass/fail; none of the seven new tiles reproduces
it. `wind-pressure` (Group E) is building-envelope velocity pressure; `wind-on-load`
applies the same `q = 0.00256 V^2` constant to a *suspended* load and adds the swing
angle. No tile computes center-of-gravity load share, net capacity after
deductions, ground bearing pressure, tag-line force, or tandem-lift share. **All
seven ship**, into the new `calc-rigging.js`.

New-group wiring (once, for Group Z): a new `calc-rigging.js` module; a new
`RIGGING_RENDERERS` registry declared in `app.js` parallel to the existing
per-module registries; `"Z"` appended to the `app.js` `GROUPS` array; `Z: "Rigging
and Heavy Lift"` added to the `app.js` `GROUP_NAMES` map (this is the string
`build-shells.mjs` reads via `loadGroupNames()` for the group shell and breadcrumb);
and the group shell / group-slug path (`groups/rigging-and-heavy-lift/`) generated
by the existing `build-shells.mjs` group loop with no code change beyond the new
group letter. A new `rigging` trade label is added to the trade registry alongside
the existing labels.

Per-tile wiring (each of the seven): a `tools-data.js` row (group `Z`, trades
`["rigging"]`); `tile-meta.js` `_TILES`; a `citations.js` entry
(`GOVERNANCE.rigging`; formula string; assumptions listing every bundled constant
and default -- the 0.00256 velocity-pressure constant, the WRTB D/d curve points,
the 75% tandem derate, the 50 lb per-person tag default, the 75 / 90 / 100 percent
flags -- and naming ASME B30.5 / B30.9 / B30.10, OSHA 1926 Subpart CC, and the
WRTB Wire Rope Users Manual by name without reproduction);
`test/fixtures/worked-examples.json` (every pinned example and cross-check in
Section 2); `test/fixtures/compute-map.js` (module path `../../calc-rigging.js`);
`scripts/related-tiles.mjs` (`cg-load-share` -> `tandem-lift-share` /
`crane-net-capacity` / `sling-angle`; `crane-net-capacity` -> `crane-lift-quick` /
`crane-ground-bearing` / `cg-load-share`; `crane-ground-bearing` ->
`crane-net-capacity` / `helical-pile` / `excavation-bench-plan`;
`sling-d-d-efficiency` -> `sling-angle` / `rigging-check` / `crane-net-capacity`;
`wind-on-load` -> `tagline-force` / `wind-pressure` / `crane-net-capacity`;
`tagline-force` -> `wind-on-load` / `pulley-ma-gen`; `tandem-lift-share` ->
`cg-load-share` / `crane-net-capacity`); `data/search/aliases.json` (e.g.
`cg-load-share`: "center of gravity", "pick point", "load share", "two point lift",
"unbalanced load"; `crane-net-capacity`: "load chart", "net capacity", "deduction",
"percent of chart", "critical lift"; `crane-ground-bearing`: "outrigger pressure",
"ground bearing", "crane mat", "cribbing", "soil bearing"; `sling-d-d-efficiency`:
"D over d", "bend efficiency", "wire rope sling", "choker"; `wind-on-load`: "wind
load", "sail area", "swing"; `tagline-force`: "tag line", "tagline", "load
control"; `tandem-lift-share`: "tandem lift", "two crane", "dual crane", "multi
crane"); the `app.js` `RIGGING_RENDERERS` registers all seven renderers; the
`// dims:` annotations; and the regenerated v14 corpus + tile-index. A
`test/unit/bounds-fuzzer.test.js` block pins every worked example, the CG-outside
flag, the 75 / 90 / 100 percent flags, the ground-bearing fail-and-resize path, and
every error seam.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar at implementation: `npm run lint` (every gate, including the
wiring-correctness lint that must report the new `RIGGING_RENDERERS` registry and
the seven new tile ids, and the spec-v49 `check-readme-counts` gate agreeing at
**605 tiles** and the matching sitemap URL count, one detail URL per new tile plus
the new group URL); `npm test` (unit suite, +7 tiles' fixtures); `npm run build`
(605 tile shells + the new Group Z group shell, regenerated sitemap);
`npm run data:verify`; the worked-examples runner (+7 fixtures with cross-checks);
the 320 px shell audit (every Group Z output must wrap, not scroll, on a phone --
the two pick-point loads, the net-capacity percent and flag, the ground-bearing
pass/fail and mat size, the D/d efficiency, the wind force and swing, the tag
tension and handler count, and the per-crane share / pass-fail all legible at
320 px); and the full-catalog render-no-nan Chromium sweep plus the a11y gate, with
the rendered output read to the value (12,000 lb at CG 40 / 120 -> 8,000 / 4,000 /
33.3%; 30,000 gross less deductions -> 28,800 net / 78.5% / critical; 60,000 lb on
4 ft^2 -> 15,000 psf FAIL / 4.47 ft mat).

## 5. Roadmap position

v65 stands up Group Z and gives the catalog a real rigging spine: establish the
center of gravity (`cg-load-share`), assemble the net capacity (`crane-net-capacity`),
verify the ground will hold the crane (`crane-ground-bearing`), reduce the sling for
its bend (`sling-d-d-efficiency`), and account for the weather in the air
(`wind-on-load` / `tagline-force`), with the multi-crane case covered
(`tandem-lift-share`). v66 completes the group with the hardware-selection,
below-the-hook, and material-handling tiles (shackle / eye-bolt selection, spreader
bar vs lifting beam, forklift derating, roller and jacking force, chain / lever
hoist, and the rigging-block redirect load). The `calc-rigging.js` module-cap watch
joins the standing list; if the thirteen Group Z rows cross the byte cap, a per-tile
split into a sibling `calc-heavylift.js` is authorized, mirroring the spec-v56
`calc-fab.js -> calc-layout.js` precedent. Further Group Z growth should be
evidence-driven (a named gap a working crew hits), not catalog-filling.
