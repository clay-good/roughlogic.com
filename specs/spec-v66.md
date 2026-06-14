# roughlogic.com Specification v66 -- Rigging and Heavy Lift, Hardware and Below-the-Hook (Group Z, 6 New Tiles)

> **Implementation status: OPEN (proposed 2026-06-13; targets package 0.60.0, a
> minor; catalog 605 -> 611, Group Z 7 -> 13).** v66 inherits everything from
> spec.md through spec-v65.md and changes none of it. It assumes v65 has landed
> (catalog base 605, Group Z stood up with its `calc-rigging.js` module and
> `RIGGING_RENDERERS` registry).
>
> v66 completes the rigging bench v65 opened. v65 covered the *lift plan* -- where
> the load balances, what the crane can carry, whether the ground holds, and what
> the wind does. v66 covers the *iron between the hook and the load*: selecting and
> derating the hardware (shackles and eye bolts), choosing and sizing a below-the-
> hook spreader bar or lifting beam, derating a forklift for an off-center or
> attachment-handled load, finding the push force to walk a machine on rollers or
> jack it up an incline, sizing a hand chain / lever hoist, and the force a rigging
> block and its anchor see when a line changes direction. **No new group, no new
> dependencies, no telemetry, no AI, US standards only.** All six land in the
> existing `calc-rigging.js`.
>
> **The gap, and the evidence for it.** With v65 landed, a concept-check for
> shackle-derate / eye-bolt-angle / spreader-bar / lifting-beam / forklift-derate /
> load-center / roller-force / jacking / chain-hoist / lever-hoist / come-along /
> block-redirect returned nothing in Group Z and nothing concept-equivalent
> elsewhere. `rigging-check` (Group N) is a stage-hardware WLL pass/fail with no
> eye-bolt angular derate and no below-the-hook member; `pulley-ma-gen` is
> mechanical advantage, not the resultant force on the block's anchor. The hardware
> a rigger actually reaches for had no selection tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `shackle-eyebolt-wll` is force in / force out with a
  dimensionless angular derate; `spreader-beam` carries force (`F`) and length
  (`L`) producing a force (bar compression) and a moment (`F*L`, lifting beam);
  `forklift-capacity-derate` is force with a length-ratio derate; `roller-jack-force`
  is force with a dimensionless rolling coefficient and a trig incline term;
  `chain-lever-hoist` is force / a dimensionless mechanical advantage producing a
  force and a length (chain travel); `block-redirect-load` is force with a
  trig direction-change term producing a force.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive load, rated capacity, span, mechanical advantage, or rolling
  coefficient returns `{ error }`. Angles are range-checked (0 to 90 for the
  eye-bolt and incline angles, 0 to 180 for the block direction change). Every
  derate and resultant is a bounded function of finite inputs.
- The v19/v22 citation discipline applies. Every entry uses **`GOVERNANCE.rigging`**.
  The sources are named, never reproduced: **ASME B30.26** (Rigging Hardware --
  shackles, links, turnbuckles), **ASME B18.15 / manufacturer data** (eye bolts),
  **ASME BTH-1** (Design of Below-the-Hook Lifting Devices) and **ASME B30.20**
  (Below-the-Hook Lifting Devices), **ASME B56.1** (Powered Industrial Trucks),
  **ASME B30.16** (Overhead Hoists) and **ASME B30.21** (Lever Hoists), and
  **ASME B30.9** (Slings). The manufacturer's rating plate and chart govern.
- Tile ids are kebab-case and checked against the post-v65 live ids. None collides
  or duplicates `rigging-check`, `sling-angle`, `sling-d-d-efficiency`, or
  `pulley-ma-gen` (see Section 3).

## 2. The tiles

### 2.1 `shackle-eyebolt-wll` -- Hardware WLL and Angular Derate (Group Z, calc-rigging.js)

A shackle is rated for an in-line pull; an eye bolt loses capacity fast the moment
the pull comes off its axis. This tile takes the leg load and the angle of pull,
returns the working load limit the hardware must carry (with the design factor made
explicit), and the derated capacity of an in-place piece at that angle.

```
inputs:
  leg_load_lb     F   the tension in this leg (from sling-angle / cg-load-share)
  rated_wll_lb    F   catalog WLL of the shackle or eye bolt being checked
  angle_deg       -   angle of pull off the in-line / vertical axis (0 = in-line)
  hardware        -   "shackle" | "shoulder_eyebolt"
  design_factor   -   reported only (default 5:1); MBS = rated_wll * design_factor

required_wll_lb = leg_load_lb                       (the WLL must meet/exceed the leg load)
derate (shackle, side-load, ASME B30.26 manufacturer chart):
   0 deg ->1.00   45 deg ->0.70   90 deg ->0.50
derate (shoulder eye bolt, angle of pull from the bolt axis):
   0 deg ->1.00   15 deg ->0.75   30 deg ->0.55   45 deg ->0.30   60+ deg ->0.15
derated_capacity_lb = rated_wll_lb * derate(angle)
pass = derated_capacity_lb >= leg_load_lb
```

Outputs: the WLL the hardware must carry, the derate factor at the pull angle, the
derated capacity, and a pass / fail. The note line states: shackles are loaded in
line through the bow and pin -- a side load follows the manufacturer's reduced
chart; an eye bolt pulled at an angle can lose more than half its rating and an
angular pull on a plain (non-shoulder) eye bolt is not permitted; the 5:1 design
factor is on the WLL, not a license to load to the minimum breaking strength; and
every piece is inspected and the manufacturer's exact chart governs.

**Worked example (pinned).** A shoulder eye bolt rated 7,000 lb, leg load 3,000 lb,
pull 45 deg off axis: derate = **0.30**, derated capacity = 7,000 x 0.30 =
**2,100 lb** -> 2,100 < 3,000, **FAIL** (the angular pull undersizes a bolt that
looked adequate in-line). Cross-check (in-line, 0 deg): capacity 7,000 >= 3,000,
PASS. Cross-check (shackle, 45 deg side load, rated 5,000 lb, leg 3,000 lb): derate
0.70 -> 3,500 >= 3,000, PASS. Degenerate inputs (leg <= 0, rated <= 0, angle < 0 or
> 90, non-finite) return an error.

### 2.2 `spreader-beam` -- Spreader Bar vs Lifting Beam Below the Hook (Group Z, calc-rigging.js)

Two ways to pick a wide load from a single hook: a spreader bar (slings angle in to
a top point, the bar is in compression) or a lifting beam (slings hang straight, the
beam is in bending). This tile takes the load and the geometry and returns the
governing internal force for each, the top sling tension, and the headroom.

```
inputs:
  load_lb        F   total load, split equally to the two end pick points (W/2 each)
  bar_length_ft  L   end-to-end length between the two lower pick points (S)
  top_height_ft  L   vertical height from the bar to the master link (h)

half = load_lb / 2
sling_angle_deg   = atan( top_height_ft / (bar_length_ft / 2) ) * 180/pi
top_sling_tension = half / sin(sling_angle_deg)          (each top sling)
bar_compression   = half / tan(sling_angle_deg)          (spreader bar, axial)
beam_moment_ftlb  = half * (bar_length_ft / 2)           (lifting beam, vertical slings)
headroom_ft       = top_height_ft                        (the height the rig consumes)
```

Outputs: the sling angle at the bar end, the top sling tension, the spreader-bar
axial compression, the lifting-beam bending moment, and the headroom consumed. The
note line states: a spreader bar keeps the slings off the load and carries axial
compression -- it must be checked for buckling, not just stress; a lifting beam
needs more headroom but lets the slings hang vertical; both are engineered
below-the-hook devices marked with a rated capacity, and ASME BTH-1 / B30.20 and
the device's rating plate govern -- this tile sizes the demand, not the device.

**Worked example (pinned).** 10,000 lb load on a 10 ft spreader bar, top point 6 ft
above the bar: half = 5,000 lb; sling angle = atan(6 / 5) = **50.2 deg**; top sling
tension = 5,000 / sin(50.2) = **6,510 lb** each; bar compression = 5,000 / tan(50.2)
= **4,170 lb**; as a lifting beam instead, moment = 5,000 x 5 = **25,000 ft-lb**;
headroom = **6 ft**. Cross-check (flatter top, 3 ft height): sling angle 31.0 deg,
top tension 9,710 lb (slings pull much harder at a shallow angle), bar compression
8,320 lb. Degenerate inputs (load <= 0, bar length <= 0, top height <= 0,
non-finite) return an error.

### 2.3 `forklift-capacity-derate` -- Load-Center and Attachment Derating (Group Z, calc-rigging.js)

A forklift is rated for a load whose center of gravity sits at a stated distance
from the fork face (24 in is typical). A deeper load, or an attachment, moves the
center of gravity forward and the safe capacity drops. This tile derates the rated
capacity to the actual load center and flags an overload.

```
inputs:
  rated_cap_lb   F   capacity from the data plate at the rated load center
  rated_lc_in    L   the data-plate rated load center (commonly 24 in)
  actual_lc_in   L   the actual horizontal distance from the fork face to the load CG
  load_lb        F   the load to be handled
  attach_note    -   reported only: attachments reduce capacity and shift the CG

net_capacity_lb = rated_cap_lb * rated_lc_in / actual_lc_in     (data-plate method)
pass = load_lb <= net_capacity_lb
margin_pct = (net_capacity_lb - load_lb) / net_capacity_lb * 100
```

Outputs: the net capacity at the actual load center, a pass / fail against the load,
and the remaining margin. The note line states: the truck's capacity plate is the
legal rating and an attachment changes the plate -- a derated plate must be fitted
by the dealer for any attachment; raising the load, tilting forward, soft ground,
and grade all reduce real capacity further; and a load whose center of gravity is
beyond the rated load center tips the truck forward before the rear wheels can do
anything about it.

**Worked example (pinned).** A 5,000 lb @ 24 in truck handling a deep load whose
center sits 36 in out, load 3,000 lb: net = 5,000 x 24 / 36 = **3,333 lb**; 3,000 <=
3,333, **PASS** with margin = (3,333 - 3,000) / 3,333 = **10.0%**. Cross-check (load
at rated 24 in): net 5,000, margin 40%. Cross-check (heavier deep load 3,600 lb at
36 in): 3,600 > 3,333, **FAIL**. Degenerate inputs (rated cap <= 0, either load
center <= 0, load <= 0, non-finite) return an error.

### 2.4 `roller-jack-force` -- Push / Pull Force on Rollers, Skates, or an Incline (Group Z, calc-rigging.js)

Walking a machine across a floor on roller skates, or jacking it up a ramp, takes a
force set by the rolling resistance and the grade. This tile returns the steady push
force, the higher breakaway force, the added grade component, and the number of
skates the load needs.

```
inputs:
  load_lb         F   total weight on the rollers / skates
  roll_coef       -   rolling resistance coefficient (steel roller on steel ~0.01,
                      machinery skate ~0.02 to 0.05, default 0.03)
  incline_deg     -   ramp / floor slope (0 = level)
  skate_cap_lb    F   rated capacity of one roller skate

roll_force_lb     = load_lb * roll_coef * cos(incline_deg)
grade_force_lb    = load_lb * sin(incline_deg)
push_steady_lb    = roll_force_lb + grade_force_lb
push_breakaway_lb = push_steady_lb * 1.5                 (startup / stiction allowance)
skates_needed     = ceil(load_lb / skate_cap_lb)
```

Outputs: the steady push force, the breakaway force, the grade component alone, and
the number of skates required by capacity. The note line states: the rolling
coefficient depends on the skate, the floor, and debris -- a single chip under a
roller stops the move; on any grade the load wants to run away and must be
controlled with a winch or come-along on the downhill side, never by hand; skate
count is sized by capacity *and* by keeping the load stable on at least three points;
and the floor's own capacity (slab, plate, dunnage) must be verified for the
concentrated wheel load.

**Worked example (pinned).** A 12,000 lb machine on skates (coef 0.03) across a
level floor, skate capacity 5,000 lb: roll force = 12,000 x 0.03 x cos(0) =
**360 lb**; grade = 0; steady push = **360 lb**; breakaway = 360 x 1.5 = **540 lb**;
skates = ceil(12,000 / 5,000) = **3**. Cross-check (5 deg ramp): roll force 358.6
lb, grade = 12,000 x sin(5) = 1,046 lb, steady push = **1,405 lb** (the grade
dominates), control on the downhill side required. Degenerate inputs (load <= 0,
coef <= 0, incline < 0 or >= 90, skate cap <= 0, non-finite) return an error.

### 2.5 `chain-lever-hoist` -- Hand Chain / Lever Hoist Effort and Chain Travel (Group Z, calc-rigging.js)

A chain hoist or lever hoist (come-along) trades hand force for distance through its
mechanical advantage. This tile returns the hand effort to lift a load, the hand
chain (or lever stroke) travel per foot of lift, and a pass / fail against the
hoist's rated capacity.

```
inputs:
  load_lb        F   the load on the hoist
  rated_wll_lb   F   the hoist's rated working load limit
  mech_adv       -   the hoist mechanical advantage (gear + chain-fall ratio)
  efficiency     -   drivetrain efficiency (default 0.85)
  lift_ft        L   the distance the load must be raised

hand_pull_lb       = load_lb / (mech_adv * efficiency)
hand_chain_travel  = lift_ft * mech_adv                  (feet of hand chain per lift)
pass = load_lb <= rated_wll_lb
```

Outputs: the hand-pull force, the hand-chain (or lever) travel for the lift, and a
pass / fail against the rated WLL. The note line states: ASME B30.16 / B30.21 limit
the effort one person may apply -- a load that needs a cheater bar or a second
person on the lever is overloaded, stop; the hoist's rated WLL is the ceiling
regardless of the leverage available; the hand chain is long because the advantage
is high, and the load drops fast if the brake is defeated; and the hoist, its hooks,
and its chain are inspected before the lift.

**Worked example (pinned).** Lifting 2,000 lb with a 2,000 lb-rated hoist of
mechanical advantage 32, efficiency 0.85, raising it 4 ft: hand pull = 2,000 /
(32 x 0.85) = **73.5 lb**; hand chain travel = 4 x 32 = **128 ft**; 2,000 <= 2,000,
**PASS** (at the limit -- no margin, treat as overloaded for any dynamic). Cross-
check (over capacity, 2,400 lb load): hand pull 88.2 lb but 2,400 > 2,000, **FAIL**.
Cross-check (lower advantage 16): hand pull 147 lb (over a one-person limit), travel
64 ft. Degenerate inputs (load <= 0, rated <= 0, mech_adv <= 0, efficiency <= 0,
non-finite) return an error.

### 2.6 `block-redirect-load` -- Resultant Force on a Rigging Block (Group Z, calc-rigging.js)

When a line runs over a block or sheave and changes direction, the block and its
anchor sling carry the *resultant* of the two line parts -- up to twice the line
tension when the line doubles back. This tile returns that resultant from the line
tension and the direction-change angle.

```
inputs:
  line_tension_lb   F   tension in the line running through the block
  direction_chg_deg -   the angle the line direction changes (0 = straight through,
                        90 = right-angle turn, 180 = doubled back)

resultant_lb = 2 * line_tension_lb * sin(direction_chg_deg / 2)
```

Outputs: the resultant force on the block and its anchor sling, and the
direction-change angle restated. The note line states: a block that turns the line
180 deg sees twice the line tension on its anchor -- size the block, the anchor
sling, and the attachment point for the *resultant*, not the line tension; the
block's rated capacity is for the resultant load; and shock loading (a line snapping
taut) multiplies this further -- see `tagline-force` and the arborist rigging tiles.

**Worked example (pinned).** A line at 3,000 lb tension turning 90 deg through a
block: resultant = 2 x 3,000 x sin(45) = 2 x 3,000 x 0.7071 = **4,243 lb**. Cross-
check (doubled back, 180 deg): resultant = 2 x 3,000 x sin(90) = **6,000 lb**
(twice the line tension). Cross-check (gentle redirect, 30 deg): resultant = 2 x
3,000 x sin(15) = **1,553 lb**. Degenerate inputs (tension <= 0, angle < 0 or > 180,
non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the post-v65 live tiles. `rigging-check` (Group N) is a
stage-hardware WLL-at-angle pass/fail and carries no eye-bolt angular derate, no
shackle side-load chart, and no below-the-hook member; `shackle-eyebolt-wll` adds
the hardware-specific angular derate it lacks. `sling-angle` and
`sling-d-d-efficiency` (Group Z) reduce a *sling*; this batch sizes the *hardware*
and the *below-the-hook device*. `pulley-ma-gen` and `rope-ma` return mechanical
advantage; `chain-lever-hoist` applies a given advantage to find hand effort and
chain travel, and `block-redirect-load` returns the resultant on the block's anchor
(a force, not an advantage). No tile sizes a spreader bar / lifting beam, derates a
forklift to its load center, or finds roller / jacking force. **All six ship**, into
the existing `calc-rigging.js`.

Per-tile wiring (each of the six): a `tools-data.js` row (group `Z`, trades
`["rigging"]`); `tile-meta.js` `_TILES`; a `citations.js` entry
(`GOVERNANCE.rigging`; formula string; assumptions listing every bundled constant
and default -- the shackle and shoulder-eye-bolt derate tables, the 5:1 design
factor, the 0.85 hoist efficiency default, the 0.03 rolling-coefficient default, the
1.5 breakaway factor -- and naming ASME B30.26 / B18.15 / BTH-1 / B30.20 / B56.1 /
B30.16 / B30.21 by the relevant standard without reproduction);
`test/fixtures/worked-examples.json` (every pinned example and cross-check);
`test/fixtures/compute-map.js` (module path `../../calc-rigging.js`);
`scripts/related-tiles.mjs` (`shackle-eyebolt-wll` -> `sling-angle` /
`rigging-check` / `cg-load-share`; `spreader-beam` -> `cg-load-share` /
`sling-angle` / `crane-net-capacity`; `forklift-capacity-derate` ->
`pallet-loadout` / `axle-load-distribution` / `crane-net-capacity`;
`roller-jack-force` -> `block-redirect-load` / `chain-lever-hoist` / `ramp-slope`;
`chain-lever-hoist` -> `pulley-ma-gen` / `rope-ma` / `block-redirect-load`;
`block-redirect-load` -> `roller-jack-force` / `chain-lever-hoist` / `tagline-force`);
`data/search/aliases.json` (e.g. `shackle-eyebolt-wll`: "shackle", "eye bolt",
"hoist ring", "side load", "WLL", "derate"; `spreader-beam`: "spreader bar",
"lifting beam", "below the hook", "spreader"; `forklift-capacity-derate`: "forklift
capacity", "load center", "data plate", "attachment", "derate"; `roller-jack-force`:
"rollers", "skates", "machinery move", "jacking", "push force"; `chain-lever-hoist`:
"chain hoist", "come along", "lever hoist", "chain fall"; `block-redirect-load`:
"snatch block", "redirect", "block load", "sheave"); the `app.js` `RIGGING_RENDERERS`
registers all six renderers; the `// dims:` annotations; and the regenerated v14
corpus + tile-index. A `test/unit/bounds-fuzzer.test.js` block pins every worked
example, the eye-bolt FAIL path, the lifting-beam moment branch, the forklift
overload, the on-grade roller case, and every error seam.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate; the wiring lint reports the six
new Group Z renderers / tile ids; the spec-v49 `check-readme-counts` gate agrees at
**611 tiles** and the matching sitemap URL count); `npm test` (+6 tiles' fixtures);
`npm run build` (611 tile shells + the Group Z group shell, regenerated sitemap);
`npm run data:verify`; the worked-examples runner (+6 fixtures with cross-checks);
the 320 px shell audit (the hardware pass/fail and derate, the four spreader-beam
outputs, the forklift net capacity, the roller push / breakaway / skate count, the
hoist hand pull and chain travel, and the block resultant all wrap, not scroll, on a
phone); and the full-catalog render-no-nan Chromium sweep plus the a11y gate, with
the rendered output read to the value (eye bolt 7,000 @ 45 deg -> 2,100 / FAIL;
10,000 on a 10 ft bar @ 6 ft top -> 6,510 top / 4,170 bar; 3,000 lb line @ 90 deg
-> 4,243 resultant).

## 5. Roadmap position

v66 closes the Group Z founding batch at 13 tiles: the hook-to-load iron now has a
home next to the lift plan from v65. A rigger can move through the catalog the way
the work moves -- establish the center of gravity, size the crane and the ground,
reduce the slings, pick the hardware and the below-the-hook device, and handle the
load on the ground with hoists, blocks, and rollers. The `calc-rigging.js`
module-cap watch carries forward; the authorized `calc-heavylift.js` split lands if
the thirteen rows cross the byte cap. With this batch Group Z is broad and
well-rounded; further growth should be evidence-driven (a named gap a working crew
hits) -- a candidate backlog includes derrick / gin-pole math, jacking-tower
staging, and SPMT axle-load distribution, none of which ships without a named field
need. The dirty-jobs expansion continues outside Group Z: v67 deepens earthwork and
excavation (Group E), v68 adds tree-care and arborist rigging (Group L), and v69
adds surface prep, coatings, and abatement.
