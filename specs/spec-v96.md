# roughlogic.com Specification v96 -- Concrete Contraction Joints and Rebar Lap Splices (Group E, 2 New Tiles)

> **Implementation status: CLOSED -- landed 2026-06-18 (package 0.65.0; specs v90-v100 each targeted a minor individually but landed in one commit, so they stamp a single 0.65.0) (target catalog
> 649 -> 651; 25 groups; a minor stamp).** v96 inherits everything from spec.md through
> spec-v95.md and changes none of it. It adds two tiles to **Group E (Carpentry and
> Construction)** and changes no existing tile's output. **No new group, no new
> dependencies, no telemetry, no AI, US standards only.** Both land in
> `calc-construction.js` (the home of the concrete-and-rebar bench -- `concrete`,
> `rebar`, `rebar-schedule`, `concrete-mix-design`, `footing-area`) -- see the §3 module
> note on the cap.
>
> **The gap, and the evidence for it.** Group E pours and reinforces concrete:
> `concrete` (slab, footing, column, and stem volumes), `concrete-mix-design` (the
> water/cement and aggregate proportions), `rebar` (linear feet from a slab and a
> spacing), `rebar-schedule` (cut length with bend allowance and weight by bar size),
> and `footing-area`. What it does **not** have are two of the most common pieces of
> field arithmetic a flatwork or concrete crew runs every day: **where to cut the
> contraction (control) joints** -- the spacing in feet (roughly two to three times the
> slab thickness in inches, capped), the joint depth (a quarter of the slab), and the
> resulting panel grid with its aspect-ratio check -- and **how long to lap the rebar**
> -- the tension lap-splice length as a multiple of the bar diameter (the jobsite "40 to
> 48 bar diameters" rule), with a 12 in floor. A concept-check against the post-v95 live
> ids for control-joint, contraction-joint, joint-spacing, lap-splice, rebar-lap, and
> splice-length returned nothing. `rebar` and `rebar-schedule` count and bend bar; they
> do not place joints or size a splice. These two close the gap between *how much*
> concrete and steel and *how it is detailed in the field*.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `control-joint-spacing` carries a thickness (length) times a
  dimensionless factor to a spacing (length), a thickness times a quarter to a depth
  (length), and slab lengths over the spacing to dimensionless panel counts and a
  dimensionless aspect ratio; `rebar-lap-splice` carries a bar diameter (length) times a
  dimensionless factor to a lap length (length), floored at a constant length. Every
  constant -- the 2-to-3 (default 2.5) spacing factor, the 18 ft maximum, the 1/4 joint
  depth, the #3..#11 bar diameters, the 40/48 lap factors, and the 12 in minimum lap --
  is bundled and annotated.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive slab thickness, spacing factor, maximum spacing, lap factor, or (when
  given) slab length or width returns `{ error }`. An unrecognized bar size returns
  `{ error }`. Panel counts are `ceil` of finite ratios; the slab-grid outputs are
  `null` when no slab length and width are given (the spacing and depth still compute).
  The lap length is the larger of the bar-diameter multiple and the 12 in minimum (the
  minimum governs for the smallest bars).
- The v19/v22 citation discipline applies. `control-joint-spacing` uses
  **`GOVERNANCE.general`** (joint layout is a construction-practice rule of thumb for
  crack control, not a structural design); `rebar-lap-splice` uses
  **`GOVERNANCE.structural`** (a splice carries tension load -- the same governance the
  load-bearing Group E tiles use). Sources are named, never reproduced: the **ACI 302.1R
  / ACI 360R** slab-on-ground guidance (spacing about 24 to 36 times the slab thickness,
  a panel aspect ratio kept under about 1.5 to 1, a joint depth of at least a quarter of
  the slab, sawn early); and the **ACI 318 development-and-splice** basis behind the
  field rule (a Class B tension lap is about 1.3 times the development length, which for
  typical Grade 60 bar in 4,000 psi normal-weight concrete lands the common jobsite lap
  near 40 to 48 bar diameters, never less than 12 in). The factors and the 18 ft cap are
  representative defaults the user edits; the **engineer of record and the project
  drawings govern** the actual splice and joint plan -- stated plainly in the note.
- Tile ids are kebab-case and checked against the post-v95 live ids. Neither collides
  with `rebar`, `rebar-schedule`, `concrete`, `concrete-mix-design`, or `footing-area`
  (see Section 3).

## 2. The tiles

### 2.1 `control-joint-spacing` -- Concrete Contraction (Control) Joint Layout (Group E, calc-construction.js)

Where to cut the joints in a slab so it cracks where you want it to: the spacing in
feet, the saw-cut depth, and -- when the slab dimensions are given -- the panel grid and
its aspect-ratio check.

```
inputs:
  slab_thickness_in  L    slab thickness (in)
  spacing_factor     -    feet of spacing per inch of thickness (default 2.5; range 2-3)
  max_spacing_ft     L    cap on joint spacing (ft; default 18)
  slab_length_ft     L    optional slab length, for the panel grid (ft; 0 = off)
  slab_width_ft      L    optional slab width, for the panel grid (ft; 0 = off)

spacing_ft  = min(spacing_factor * slab_thickness_in, max_spacing_ft)
depth_in    = 0.25 * slab_thickness_in
panels_long = slab_length_ft > 0 ? ceil(slab_length_ft / spacing_ft) : null
panels_wide = slab_width_ft  > 0 ? ceil(slab_width_ft  / spacing_ft) : null
panels      = (panels_long and panels_wide) ? panels_long * panels_wide : null
aspect      = (panels_long and panels_wide)
                ? max(slab_length_ft/panels_long, slab_width_ft/panels_wide)
                  / min(slab_length_ft/panels_long, slab_width_ft/panels_wide)
                : null
```

Outputs: the joint spacing (ft), the saw-cut depth (in), and -- when the slab is given --
the panels long and wide, the total panels, and the panel aspect ratio with a flag when
it exceeds about 1.5 to 1. The note line states: cut contraction joints at about two to
three times the slab thickness in feet (a 4 in slab joints every 8 to 12 ft), capped
near 15 to 18 ft so a panel does not crack mid-bay; keep panels close to square (under
about 1.5 to 1) -- a long, narrow panel cracks across the middle; cut at least a quarter
of the slab depth, early (within the first few hours, before the slab does its own
cracking); and this is a crack-control rule of thumb -- the structural drawings govern a
designed slab.

**Worked example (pinned).** A 4 in slab, a 2.5 factor, an 18 ft cap, a 40 ft x 24 ft
slab: spacing = min(2.5 x 4, 18) = min(10, 18) = **10 ft**; depth = 0.25 x 4 = **1.0
in**; panels long = ceil(40 / 10) = **4**, panels wide = ceil(24 / 10) = **3**, total =
**12 panels** of about 10 x 8 ft; aspect = 10 / 8 = **1.25** (under 1.5, ok).
Cross-check (a 6 in slab): spacing = min(15, 18) = **15 ft**, depth = **1.5 in**; on the
same slab, 40 / 15 -> **3** long (13.3 ft) and 24 / 15 -> **2** wide (12 ft), **6
panels**, aspect 13.3 / 12 = **1.11**. Cross-check (an 8 in slab at a 3.0 factor):
spacing = min(24, 18) = **18 ft** (the cap governs), depth = **2.0 in**. Degenerate
inputs (slab_thickness_in <= 0, spacing_factor <= 0, max_spacing_ft <= 0, non-finite)
return an error; slab_length_ft or slab_width_ft of 0 returns a `null` panel grid (the
spacing and depth still compute).

### 2.2 `rebar-lap-splice` -- Rebar Tension Lap-Splice Length (Group E, calc-construction.js)

How far to overlap two bars at a splice: the tension lap length as a multiple of the bar
diameter, the jobsite "40 to 48 bar diameters" rule, with a 12 in floor and a
feet-and-inches readout.

```
inputs:
  bar_size     -    bar designation (select #3..#11; db = bar number / 8 in for #3..#8,
                    plus #9 = 1.128, #10 = 1.270, #11 = 1.410 in)
  lap_factor   -    bar diameters of lap (default 48 for a Class B field lap; 40 = simple-case rule)
  min_lap_in   L    absolute minimum lap (in; default 12)

db      = bar_diameter_table[bar_size]
lap_in  = max(lap_factor * db, min_lap_in)
lap_ft_in = to_feet_inches(lap_in)
```

Outputs: the bar diameter, the lap length in inches and in feet-and-inches, and which
governed (the bar-diameter multiple or the 12 in minimum). The note line states: a
tension lap overlaps two bars so the load transfers through the concrete, and the field
rule is about 40 to 48 bar diameters for typical Grade 60 bar in 4,000 psi normal-weight
concrete (a Class B lap is roughly 1.3 times the development length); never lap less than
12 in; epoxy-coated bar, top bars with a lot of concrete below, lightweight concrete,
and bars bunched close together all *lengthen* the lap, while a compression lap is
shorter -- so treat this as a starting figure and confirm against the structural
drawings; and stagger adjacent splices, do not lap them all at one section.

**Worked example (pinned).** A #5 bar (db = 0.625 in), a 48-diameter Class B lap, a 12
in minimum: lap = max(48 x 0.625, 12) = max(30, 12) = **30 in** = **2 ft 6 in** (the
bar-diameter multiple governs). Cross-check (a #4 bar at the simpler 40-diameter rule):
max(40 x 0.5, 12) = max(20, 12) = **20 in**. Cross-check (a #3 bar at 48 diameters):
max(48 x 0.375, 12) = max(18, 12) = **18 in** (still the multiple). Cross-check (a #8 bar
at 48 diameters): 48 x 1.0 = **48 in** = **4 ft 0 in**. Degenerate inputs (an
unrecognized bar size, lap_factor <= 0, min_lap_in <= 0, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the post-v95 live tiles. `rebar` gives the linear feet of bar
from a slab and a spacing; `rebar-schedule` gives the cut length with a bend allowance
and the weight by bar size -- neither places contraction joints nor computes a splice
length. `concrete` and `concrete-mix-design` do volumes and proportions, not joint
layout. `footing-area` sizes a footing footprint, unrelated. No live tile lays out
contraction joints or sizes a tension lap splice. **Both ship**, into
`calc-construction.js`.

Per-tile wiring (each of the two): a `tools-data.js` row (group `E`, trades
`["concrete", "construction"]`); `tile-meta.js` `_TILES`; a `citations.js` entry (the
Section 1 governance -- `GOVERNANCE.general` for the joint tile, `GOVERNANCE.structural`
for the splice tile; the formula string; assumptions listing every bundled constant --
the 2.5 spacing factor and 18 ft cap, the 1/4 depth, the aspect-ratio threshold, the
#3..#11 bar diameters, the 40/48 lap factors, and the 12 in minimum -- naming the ACI
302.1R / 360R and ACI 318 references without reproduction, and stating the engineer of
record and drawings govern); `test/fixtures/worked-examples.json` (every pinned example
and cross-check); `test/fixtures/compute-map.js` (module path
`../../calc-construction.js`); `scripts/related-tiles.mjs` (`control-joint-spacing` ->
`concrete` / `rebar` / `square-footage`; `rebar-lap-splice` -> `rebar` /
`rebar-schedule` / `concrete`); `data/search/aliases.json` (e.g.
`control-joint-spacing`: "control joint", "contraction joint", "saw cut spacing",
"concrete joints", "crack control"; `rebar-lap-splice`: "rebar lap", "lap splice",
"splice length", "rebar overlap", "40 bar diameters"); the `app.js`
`CONSTRUCTION_RENDERERS` declare gains both ids; the `// dims:` annotations; and the
regenerated v14 corpus + tile-index. A `test/unit/bounds-fuzzer.test.js` block pins both
worked examples, the spacing cap seam, the `null` slab-grid branch, the aspect-ratio
flag, the min-lap-governs seam, and every other error seam.

**Module note.** `calc-construction.js` is the home of the concrete-and-rebar bench, so
both land there. It sits at its 62,000 B cap after the v94 fencing tiles; the two small
tiles here exceed the remaining headroom, so this spec authorizes the same path v94
already names: either the documented cap bump to about **64,000 B** (the v67/v69
pattern) or, if the maintainer prefers, relocating the cohesive **concrete-and-rebar
bench** into a new module (the spec-v70..v89 split precedent -- a natural companion to
the new `calc-finish.js` from v95). Either way the module-size gate stays green, and the
group letter (`E`) is independent of the module.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate, including the module-size, wiring,
sw-precache, dimensions, corpus, tile-contract, and README-count gates;
`check-readme-counts` agrees at **651 tiles** and the matching sitemap URL count);
`npm test` (+2 worked-example fixtures and their cross-checks; the new bounds-fuzzer
block); `npm run build` (651 tile shells, regenerated sitemap); `npm run data:verify`;
the worked-examples runner; the 320 px shell audit (the spacing / depth / panel-grid
lines and the bar-diameter / lap / feet-inches lines all wrap, not scroll, on a phone);
and the full-catalog render-no-nan Chromium sweep plus the a11y gate, with the rendered
output read to the value (a 4 in slab on 40 x 24 ft -> 10 ft joints, 1 in deep, 12
panels at 1.25 aspect; a #5 bar at 48 db -> 30 in / 2 ft 6 in).

## 5. Roadmap position

v96 details the concrete and steel the existing volume and quantity tiles size -- joint
layout and splice length, the two pieces of field arithmetic a flatwork crew runs after
the take-off. Further growth should stay evidence-driven (a named gap a concrete crew
hits) -- candidates include a **slab-on-grade load / thickness** check, a **dowel-bar
sizing** tile for construction joints, and a **concrete maturity / strength-gain** time
estimate; none ships without the field need. The standing module-cap watch keeps
`calc-construction.js` at the front of the list, with the concrete-and-rebar-bench split
named here as the relief if the bump is declined.
