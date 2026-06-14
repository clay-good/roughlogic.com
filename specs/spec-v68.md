# roughlogic.com Specification v68 -- Tree Care and Arborist Rigging (Group L, 5 New Tiles)

> **Implementation status: CLOSED 2026-06-13 (package stamped 0.62.0, a minor;
> catalog 616 -> 621, Group L +5; corpus 925, dims 928, fuzzer 925/925,
> derivation 621/621).** v68 inherits everything from spec.md
> through spec-v67.md and changes none of it. It assumes v67 has landed (catalog
> base 616).
>
> v68 deepens **Group L (Agriculture and Forestry)** into the one dirty, dangerous
> trade the catalog names but never equipped: production tree care. Group L has the
> stand-level forestry tiles (`timber-cruise` and the agronomy bench), but nothing
> for the climber and the ground crew taking a tree apart over a house. The numbers
> that keep that crew alive are the *weight of the piece on the rigging*, the *shock
> load when it is dropped and caught*, the *hinge that steers a felled tree*, the
> *friction wraps that let one groundie lower a heavy piece by hand*, and the *chip
> volume* the job produces. **No new group, no new dependencies, no telemetry, no
> AI, US standards only.** All five land in `calc-agriculture.js` next to
> `timber-cruise`.
>
> **The gap, and the evidence for it.** A concept-check for
> log-weight / limb-weight / green-density / tree-rigging / shock-load / dynamic-load /
> felling-hinge / notch / porta-wrap / friction-device / capstan / chipper / chips
> returned nothing. `timber-cruise` estimates standing board-foot volume for a stand;
> it says nothing about the weight of one piece on a lowering line, and nothing in
> the catalog computes a shock load. The single most lethal misjudgment in tree
> rigging -- a heavy piece dropped onto a static rope -- has no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `log-limb-weight` carries length (`L`) producing volume
  (`L^3`) and weight (`F`); `tree-rigging-shock` is force (`F`) in / force out with
  a dimensionless dynamic multiplier and a length-based stretch term;
  `felling-notch-hinge` carries length (`L`) producing lengths (notch depth, hinge
  thickness and width) and a dimensionless angle; `porta-wrap-friction` is force
  in / force out with a dimensionless capstan exponent; `chipper-debris` carries
  weight (`F`) producing a volume (`L^3`, loose cubic yards) and a dimensionless
  load count.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive weight, diameter, length, rope length, density, or wrap count
  returns `{ error }`. The shock-load stretch term is guarded against a zero
  denominator (zero elongation returns an error, since a truly static catch is
  unbounded and the tile must say so, not divide by zero). Load counts are `ceil`
  of finite ratios.
- The v19/v22 citation discipline applies. The rigging-load tiles
  (`tree-rigging-shock`, `porta-wrap-friction`) use **`GOVERNANCE.worker_safety`**
  ("Math aid for personal verification. Stop work and consult the qualified person
  on site if any number does not match the field condition."); `felling-notch-hinge`
  uses `GOVERNANCE.worker_safety`; `log-limb-weight` and `chipper-debris` use
  `GOVERNANCE.general`. Sources are named, never reproduced: **ANSI Z133-2017**
  (Arboricultural Operations -- Safety Requirements), the **ISA / arborist rigging
  research literature** (the dynamic-loading and friction-device work of Detter,
  Rust, and Donzelli, named generically), the **USDA FPL Wood Handbook** (green
  density by species), and standard capstan-friction mechanics. None is law the tile
  restates; the qualified arborist and a rigging-rated system govern.
- Tile ids are kebab-case and checked against the post-v67 live ids. None collides
  or duplicates `timber-cruise` or the Group Z rigging tiles (see Section 3).

## 2. The tiles

### 2.1 `log-limb-weight` -- Green Log and Limb Weight (Group L, calc-agriculture.js)

The load on the rigging is the weight of the wood, and green wood is heavy and
species-dependent. This tile takes the piece's dimensions and species and returns
its green weight -- the static load every downstream rigging number starts from.

```
inputs:
  butt_dia_in    L    diameter at the large end
  top_dia_in     L    diameter at the small end (= butt for a straight cylinder)
  length_ft      L    length of the piece
  species        -    selects a bundled green density (lb/ft^3), see below

green density (lb/ft^3, FPL green incl. moisture, bundled):
  red oak 64, white oak 62, sugar maple 58, ash 48, elm 54, hickory 63,
  douglas-fir 44, southern pine 52, eastern white pine 36, cottonwood 49,
  generic hardwood 58, generic softwood 45

r1 = butt_dia_in/24 ;  r2 = top_dia_in/24                 (radii in feet)
volume_ft3 = (pi/3) * length_ft * (r1^2 + r1*r2 + r2^2)   (frustum; cylinder when r1=r2)
weight_lb  = volume_ft3 * density
```

Outputs: the piece volume (cubic feet), its green weight, and the selected green
density. The note line states: green density varies with species, moisture, and
season and the bundled values are representative, not exact -- weigh or
conservatively over-estimate; a frustum (tapered log) is lighter than a cylinder of
the butt diameter, so a cylinder estimate is the safe side; included water makes
fresh wood far heavier than seasoned; and this weight is the *static* load that
`tree-rigging-shock` multiplies when the piece is dropped.

**Worked example (pinned).** A red oak log, 16 in butt, 16 in top (straight), 8 ft
long, density 64: r1 = r2 = 16/24 = 0.6667 ft; volume = (pi/3) x 8 x (0.4444 x 3) =
1.0472 x 8 x 1.3333 = **11.17 ft^3**; weight = 11.17 x 64 = **715 lb**. Cross-check
(tapered 20 in butt to 10 in top, 10 ft, white pine 36): r1 = 0.8333, r2 = 0.4167,
volume = 1.0472 x 10 x (0.6944 + 0.3472 + 0.1736) = 1.0472 x 10 x 1.2153 = 12.73
ft^3 -> 458 lb. Degenerate inputs (any diameter <= 0, length <= 0, non-finite)
return an error.

### 2.2 `tree-rigging-shock` -- Shock (Dynamic) Load on a Rigging Point (Group L, calc-agriculture.js)

A piece dropped and then caught on a lowering line hits the rigging with far more
force than its static weight; how much more depends on how far it falls and how much
the rope stretches. This tile estimates the peak dynamic load and the multiplier
over static weight, and it is loud about the danger.

```
inputs:
  static_weight_lb   F    weight of the piece (from log-limb-weight)
  drop_ft            L    free-fall distance before the line comes tight
  rope_length_ft     L    length of rope in the working system (rigging point to device)
  elong_pct          -    rope elongation at the working load (dynamic-rated rope ~5 to 20)

stretch_ft   = elong_pct/100 * rope_length_ft               (rope give under load)
peak_load_lb = static_weight_lb * (1 + sqrt(1 + 2*drop_ft/stretch_ft))
multiplier   = peak_load_lb / static_weight_lb
```

Outputs: the estimated peak load on the rigging point, sling, and block, and the
dynamic multiplier over static weight. The note line states: this energy estimate
assumes an elastic catch and *underestimates* a hard snub on low-stretch rope or a
metal-on-metal stop -- treat it as a floor, not a ceiling; the fall factor (drop
over rope length) is the lever, so a short fall on a long, stretchy rope is gentle
and a short rope with a long drop is brutal; the rigging point, sling, block, and
device must all be rated for the *peak*, with their own safety factor on top; and a
qualified arborist runs the system -- this is a planning aid, not a green light.

**Worked example (pinned).** A 500 lb piece, 3 ft drop, 30 ft of rope at 5%
elongation: stretch = 0.05 x 30 = 1.5 ft; peak = 500 x (1 + sqrt(1 + 6/1.5)) =
500 x (1 + sqrt(5)) = 500 x (1 + 2.236) = **1,618 lb**; multiplier = **3.24x**.
Cross-check (harder, 6 ft drop): peak = 500 x (1 + sqrt(1 + 8)) = 500 x 4 =
**2,000 lb**, 4.0x. Cross-check (gentler, 60 ft rope, more stretch): stretch 3.0 ft,
peak = 500 x (1 + sqrt(1 + 2)) = 500 x 2.732 = **1,366 lb**, 2.73x (more rope, lower
peak). Degenerate inputs (weight <= 0, drop < 0, rope length <= 0, elong <= 0,
non-finite) return an error.

### 2.3 `felling-notch-hinge` -- Felling Notch and Hinge Geometry (Group L, calc-agriculture.js)

The hinge is what steers a felled tree; cut it wrong and the tree goes where it
wants. This tile turns the felling-cut diameter into recommended notch depth, hinge
thickness, and hinge width for an open-face fell, with the Z133 cautions stated in
plain language.

```
inputs:
  cut_dia_in   L    diameter at the felling cut
  notch_pct    -    notch depth as a percent of diameter (default 22, range 20 to 25)
  open_face    -    open-face notch angle target (default 70 deg, "70 deg or more")

notch_depth_in   = cut_dia_in * notch_pct/100
hinge_thick_in   = cut_dia_in * 0.10                 (~10% of diameter)
hinge_width_in   = cut_dia_in * 0.80                 (~80% of diameter, full width)
back_cut_above_in = notch apex reference (back cut slightly above the notch apex)
```

Outputs: the recommended notch depth, the hinge thickness, the hinge width, and the
open-face angle target. The note line states: these are starting dimensions for a
sound, straight-grained stem on level ground -- lean, side-lean, rot, included bark,
spring poles, and a tree near a target all change the plan and many fells are not a
candidate for a simple open-face cut at all; the hinge holds and steers, it is never
cut through, and a bore (plunge) cut requires specific training; a defined retreat
path and a qualified faller are required by Z133; and a tree within striking
distance of a structure or line is a rigging or crane removal, not a fell.

**Worked example (pinned).** A 20 in cut diameter, 22% notch, 70 deg open face:
notch depth = 20 x 0.22 = **4.4 in**; hinge thickness = 20 x 0.10 = **2.0 in**;
hinge width = 20 x 0.80 = **16 in**; open-face angle **70 deg**. Cross-check (deeper
notch 25%): notch depth 5.0 in, hinge and width unchanged. Cross-check (12 in stem):
notch 2.64 in, hinge 1.2 in, width 9.6 in. Degenerate inputs (diameter <= 0,
notch_pct <= 0 or >= 100, non-finite) return an error.

### 2.4 `porta-wrap-friction` -- Friction-Device Hold Force by Wrap Count (Group L, calc-agriculture.js)

A porta-wrap or lowering bollard lets one groundie control a heavy piece because
each wrap of rope multiplies the friction; the capstan equation says the hand-side
force drops exponentially with the wraps. This tile returns the hand force by wrap
count so the crew can pick the right number.

```
inputs:
  load_lb     F    rope tension on the load side (the piece weight, or its shock peak)
  mu          -    rope-on-device friction coefficient (default 0.20)
  wraps       -    number of wraps on the device (the row to highlight)

beta(n)      = n * 2 * pi
hold_lb(n)   = load_lb * exp( -mu * beta(n) )       (capstan / Euler-Eytelwein)
table over n = 1, 2, 3, 4 wraps; the input `wraps` row is highlighted
```

Outputs: a small table of the hand-side hold force for 1 through 4 wraps, with the
selected wrap count highlighted, and the load-side tension restated. The note line
states: more wraps means less hand force but a harder, slower release and more heat
in the rope and device -- too many wraps can lock and shock the system on a moving
piece; the load side is the piece's *dynamic* tension under control, not just its
static weight, so pair this with `tree-rigging-shock`; the friction coefficient
depends on the device, the rope, glaze, and moisture; and a groundie keeps hands
clear of the device and never wraps a hand in the tail.

**Worked example (pinned).** Controlling an 800 lb load-side tension, friction 0.20:
1 wrap (beta 6.283) -> 800 x exp(-1.257) = **227 lb** hand force; 2 wraps -> 800 x
exp(-2.513) = **64.8 lb**; 3 wraps -> 800 x exp(-3.770) = **18.5 lb**; 4 wraps ->
800 x exp(-5.027) = **5.2 lb**. With `wraps = 3` highlighted, one groundie holds it
at about 18 lb. Cross-check (lower friction 0.15, 3 wraps): exp(-2.827) -> 47.3 lb.
Degenerate inputs (load <= 0, mu <= 0, wraps <= 0, non-finite) return an error.

### 2.5 `chipper-debris` -- Brush Chip Volume and Haul Loads (Group L, calc-agriculture.js)

A removal produces a pile of chips and brush that has to leave the site. This tile
converts the green weight of the wood (or an entered green tonnage) into loose chip
volume and the number of chip-truck or dump loads.

```
inputs:
  green_weight_lb   F    total green weight to chip (from log-limb-weight, summed)
  chip_density_lcy  -    bulk density of loose chips (lb per loose cy, default 550)
  box_capacity_cy   L^3  chip box / dump capacity per load (loose cy)

chip_volume_lcy = green_weight_lb / chip_density_lcy
loads           = ceil( chip_volume_lcy / box_capacity_cy )
```

Outputs: the loose chip volume (cubic yards) and the number of loads to haul it. The
note line states: bulk chip density swings with species, moisture, chip size, and
how heaped the box is -- 500 to 600 lb per loose cy is a typical green range and the
scale ticket governs; brush that is chipped is much denser than brush piled loose,
so chip volume is far smaller than the brush pile it came from; logs hauled as rounds
(not chipped) are weight, not chip volume; and disposal, recycling, or mulch reuse
is a site decision.

**Worked example (pinned).** 4,400 lb of green wood, chip density 550 lb/lcy, 15 cy
box: chip volume = 4,400 / 550 = **8.0 lcy**; loads = ceil(8.0 / 15) = **1**. Cross-
check (a big removal, 22,000 lb): chip volume = 40.0 lcy, loads = ceil(40 / 15) =
**3**. Cross-check (denser chips 600, same 22,000 lb): 36.7 lcy, 3 loads. Degenerate
inputs (weight <= 0, density <= 0, box capacity <= 0, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the post-v67 live tiles. `timber-cruise` (Group L) is a
stand-level board-foot volume estimate; `log-limb-weight` is a single-piece green
*weight* for rigging, a different quantity and audience. The Group Z rigging tiles
size *crane and hardware* systems; the arborist tiles size a *climbing and lowering*
system -- `tree-rigging-shock` computes the dynamic load no Group Z tile models
(the crane tiles assume a controlled, non-shock pick), and `porta-wrap-friction` is
the capstan equation for a lowering device, which `block-redirect-load` (the
resultant on a block) and `pulley-ma-gen` (mechanical advantage) do not cover.
`demo-debris` weighs structural demolition; `chipper-debris` is loose green chip
volume. No tile computes green wood weight, shock load, felling hinge geometry,
friction-device hold force, or chip volume. **All five ship**, into
`calc-agriculture.js`.

Per-tile wiring (each of the five): a `tools-data.js` row (group `L`, trades
`["agriculture"]` plus a new `"arboriculture"` trade label added to the registry for
all five); `tile-meta.js` `_TILES`; a `citations.js` entry (the governance noted in
Section 1; formula string; assumptions listing every bundled constant -- the green
density table, the 22% notch / 10% hinge / 80% width / 70 deg open-face defaults, the
0.20 friction default, the 5 to 20% elongation guidance, the 550 lb/lcy chip density
-- and naming ANSI Z133-2017, the FPL Wood Handbook, the arborist rigging research
literature, and capstan mechanics by name without reproduction);
`test/fixtures/worked-examples.json` (every pinned example and cross-check);
`test/fixtures/compute-map.js` (module path `../../calc-agriculture.js`);
`scripts/related-tiles.mjs` (`log-limb-weight` -> `tree-rigging-shock` /
`chipper-debris` / `timber-cruise`; `tree-rigging-shock` -> `log-limb-weight` /
`porta-wrap-friction` / `block-redirect-load`; `felling-notch-hinge` ->
`log-limb-weight` / `tree-rigging-shock`; `porta-wrap-friction` ->
`tree-rigging-shock` / `block-redirect-load` / `pulley-ma-gen`; `chipper-debris` ->
`log-limb-weight` / `demo-debris`); `data/search/aliases.json` (e.g.
`log-limb-weight`: "log weight", "limb weight", "green wood", "tree weight", "wood
density"; `tree-rigging-shock`: "shock load", "dynamic load", "rigging force", "drop
load", "fall factor"; `felling-notch-hinge`: "felling", "notch", "hinge", "open
face", "back cut"; `porta-wrap-friction`: "porta wrap", "lowering device", "friction
device", "bollard", "wraps", "capstan"; `chipper-debris`: "wood chips", "chipper",
"brush", "chip volume", "haul loads"); the `app.js` `AGRICULTURE_RENDERERS` registers
all five renderers; the `// dims:` annotations; and the regenerated v14 corpus +
tile-index. A `test/unit/bounds-fuzzer.test.js` block pins every worked example, the
frustum-vs-cylinder branch, the fall-factor sensitivity, the zero-elongation error
seam, the wrap-count table, and every other error seam.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate; the spec-v49
`check-readme-counts` gate agrees at **621 tiles** and the matching sitemap URL
count); `npm test` (+5 tiles' fixtures); `npm run build` (621 tile shells,
regenerated sitemap); `npm run data:verify`; the worked-examples runner (+5 fixtures
with cross-checks); the 320 px shell audit (the piece volume and weight, the shock
peak and multiplier, the notch / hinge / width dimensions, the four-row wrap table,
and the chip volume and loads all wrap, not scroll, on a phone -- the wrap table in
particular must stack legibly at 320 px); and the full-catalog render-no-nan
Chromium sweep plus the a11y gate, with the rendered output read to the value (16 in
x 8 ft red oak -> 11.17 ft^3 / 715 lb; 500 lb, 3 ft drop, 30 ft @ 5% -> 1,618 lb /
3.24x; 800 lb load-side, 3 wraps @ 0.20 -> ~18.5 lb).

## 5. Roadmap position

v68 equips the production tree crew the catalog had only gestured at: weigh the
piece, predict the shock when it is dropped, cut the hinge that steers a fell,
pick the wraps that let one person lower it, and size the chip haul. It links to the
new Group Z (`tree-rigging-shock` and `porta-wrap-friction` reference
`block-redirect-load`), so an arborist and a crane operator working the same removal
read across both groups. The dirty-jobs expansion finishes with v69 (surface prep,
coatings, and abatement). Further arborist growth should be evidence-driven (a named
gap a working climber or crew leader hits) -- candidates include a speed-line /
zip-line tension tile and a crane-assisted tree-pick weight-budget tile, neither
shipping without a named field need.
