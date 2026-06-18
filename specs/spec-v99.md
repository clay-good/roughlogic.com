# roughlogic.com Specification v99 -- Building Envelope Insulation (Group C, 2 New Tiles)

> **Implementation status: CLOSED -- landed 2026-06-18 (package 0.65.0; specs v90-v100 each targeted a minor individually but landed in one commit, so they stamp a single 0.65.0) (target catalog
> 655 -> 657; 25 groups; a minor stamp).** v99 inherits everything from spec.md through
> spec-v98.md and changes none of it. It adds two tiles to **Group C (HVAC)** and changes
> no existing tile's output. **No new group, no new dependencies, no telemetry, no AI, US
> standards only.** Both land in `calc-hvac.js` (the home of the insulation tiles
> `insulation-thickness` and `insulation-heat-loss`) -- see the §3 module note.
>
> **The gap, and the evidence for it.** Group C carries the building-load and insulation
> bench -- `manual-j-heating`/`manual-j-cooling`, `insulation-thickness` (the cylindrical
> conduction thickness for a pipe at a target surface temp), and `insulation-heat-loss`
> (the radial heat loss of a bare versus insulated pipe). What it does **not** have is the
> calculation an energy auditor, insulator, or builder runs on the *opaque envelope*: the
> **whole-assembly R-value** of a framed wall or ceiling by the parallel-path method,
> where the studs short-circuit the cavity insulation (the wall performs well below its
> center-of-cavity R), and the **blown-insulation coverage** -- the bags to order from the
> attic area and the manufacturer's bags-per-1,000-sq-ft figure at the target R, with the
> minimum installed thickness. A concept-check against the post-v98 live ids for
> assembly-r-value, r-value, parallel-path, blown-insulation, and insulation-coverage
> returned nothing. The existing insulation tiles are *pipe-radial* conduction; neither
> does a flat framed assembly nor an attic bag take-off. These two are the everyday
> envelope numbers the pipe tiles do not touch.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `assembly-r-value` carries series R-values (each
  hr-sq-ft-degF/Btu) summed along two paths, inverted to U-values (their reciprocal),
  area-weighted by a dimensionless framing factor, and inverted back to a whole-assembly
  R; `blown-insulation-coverage` carries an area over a thousand times a
  bags-per-thousand figure to a dimensionless bag count, and a target R over an R-per-inch
  to a thickness (length). Every constant -- the 1.25 R-per-inch of softwood framing, the
  air-film and finish-layer R-values, the framing factors, and the 1,000 sq ft chart
  basis -- is bundled and annotated; the U = 1/R reciprocal and the area-weighting are the
  dimensional core.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  negative R-value input, a non-positive stud depth, a non-positive area,
  bags-per-thousand, R-per-inch, or target R returns `{ error }`. A framing factor outside
  the half-open interval [0, 1) returns `{ error }` (a wall cannot be all framing). The
  bag count is `ceil` of a finite ratio. `assembly-r-value` also reports the
  center-of-cavity R (the cavity path alone) so the user can see how far thermal bridging
  pulls the whole-wall R below it.
- The v19/v22 citation discipline applies. Both use **`GOVERNANCE.general`** (these are
  building-science estimates, not a structural or life-safety design). Sources are named,
  never reproduced: the **ASHRAE Handbook of Fundamentals** parallel-path (isothermal-
  planes) method and its **standard air-film and material R-values** (an interior wall
  film about 0.68, an exterior winter film about 0.17, softwood framing about 1.25 per
  inch, half-inch gypsum about 0.45, and the per-inch R of common cavity insulations);
  the **DOE / typical framing factors** (about 0.25 for a 16 in on-center wall, 0.22 for
  24 in on-center); and the **manufacturer blown-insulation coverage charts** (the
  bags-per-1,000-sq-ft and the minimum settled thickness at each target R). The R-values,
  framing factor, and chart figures are representative defaults the user edits, read from
  the product's own data; the note states plainly that the bag's own label governs and
  that both the bag count and the minimum thickness must be met.
- Tile ids are kebab-case and checked against the post-v98 live ids. Neither collides with
  `insulation-thickness`, `insulation-heat-loss`, `manual-j-heating`, or any Group C tile
  (see Section 3).

## 2. The tiles

### 2.1 `assembly-r-value` -- Framed-Wall Whole-Assembly R-Value (parallel path) (Group C, calc-hvac.js)

The real R-value of a framed wall or ceiling, where the studs bridge the cavity
insulation. Sum the layers along the stud path and the cavity path, average the U-values
by the framing fraction, and invert -- the whole-wall R lands below the center-of-cavity R.

```
inputs:
  cavity_r        -    R of the cavity insulation (e.g. 13 for an R-13 batt)
  continuous_r    -    R of continuous insulation/sheathing outside the studs (both paths; default 0)
  stud_depth_in   L    stud depth (in; 3.5 for 2x4, 5.5 for 2x6); framing R = depth x 1.25
  framing_factor  -    fraction of the wall that is framing (default 0.25; 0.22 at 24 in o.c.)
  air_films_r     -    interior + exterior air films (default 0.85 = 0.68 + 0.17)
  finish_layers_r -    gypsum + structural sheathing + siding, summed (default 1.05)

common_r       = air_films_r + finish_layers_r + continuous_r        (both paths share these)
r_framing_path = common_r + stud_depth_in * 1.25
r_cavity_path  = common_r + cavity_r
u_framing      = 1 / r_framing_path
u_cavity       = 1 / r_cavity_path
u_assembly     = framing_factor * u_framing + (1 - framing_factor) * u_cavity
r_assembly     = 1 / u_assembly
r_center       = r_cavity_path                                       (center-of-cavity, for comparison)
```

Outputs: the framing-path and cavity-path R-values, the whole-assembly U and R, and the
center-of-cavity R with the percent the framing pulls the whole-wall R below it. The note
line states: a framed wall has two heat paths -- through the studs (about R-1.25 per inch
of softwood, so a 2x4 stud is only about R-4.4) and through the insulated cavity -- so the
wall performs *below* its center-of-cavity R; average the U-values weighted by the framing
fraction (about a quarter of a 16 in on-center wall is framing), never the R-values, which
overstates the wall; continuous insulation outside the studs counts on *both* paths, so it
buys more than its nominal R; and the air films and finishes are editable defaults from
the ASHRAE tables.

**Worked example (pinned).** A 2x4 wall, an R-13 cavity batt, no continuous insulation, a
3.5 in stud, a 0.25 framing factor, 0.85 films, 1.05 finishes: common = 0.85 + 1.05 + 0 =
**1.90**; framing path = 1.90 + 3.5 x 1.25 = **6.275**; cavity path = 1.90 + 13 =
**14.90**; U_framing = 0.1594, U_cavity = 0.0671; U_assembly = 0.25 x 0.1594 + 0.75 x
0.0671 = **0.0902**; R_assembly = **11.1**; center-of-cavity = **14.9**, so thermal
bridging costs about **25 percent**. Cross-check (add R-5 continuous exterior foam):
common = 6.90; framing path = 11.275, cavity path = 19.90; U_assembly = 0.25 x 0.0887 +
0.75 x 0.0503 = 0.0599; R_assembly = **16.7** (the continuous layer covers the studs, so
the wall gains more than 5). Cross-check (a 2x6 wall, R-19, a 5.5 in stud): framing path =
8.775, cavity path = 20.90; U_assembly = 0.25 x 0.1140 + 0.75 x 0.0478 = 0.0644;
R_assembly = **15.5**. Degenerate inputs (a negative R, stud_depth_in <= 0, a framing
factor not in [0, 1), non-finite) return an error.

### 2.2 `blown-insulation-coverage` -- Blown Insulation Bags and Thickness (Group C, calc-hvac.js)

The bags of blown insulation an attic needs at a target R, from the area and the
manufacturer's bags-per-1,000-sq-ft figure, with the minimum installed thickness.

```
inputs:
  area_sqft         L    attic floor area to cover (sq ft)
  bags_per_1000     -    bags per 1,000 sq ft at the target R (from the bag label)
  r_per_inch        -    settled R per inch of the product (default 3.5 for cellulose; ~2.5 blown FG)
  target_r          -    target R-value (e.g. 38, 49)

bags             = ceil(area_sqft / 1000 * bags_per_1000)
coverage_per_bag = 1000 / bags_per_1000                  (sq ft per bag at the target R)
min_thickness_in = target_r / r_per_inch
```

Outputs: the bags to buy, the coverage per bag at the target R, and the minimum installed
(settled) thickness. The note line states: blown-insulation coverage is brand-specific, so
read the bag's own *bags per 1,000 sq ft at this R-value* and its *minimum settled
thickness* -- both must be met, because a machine can hit the thickness while blowing too
few bags (under-dense, and it will settle short); cellulose runs about R-3.5 per inch and
blown fiberglass about R-2.5, so a target R sets the depth; settling is already in the
chart's settled-thickness column; and mark the joists to the target depth with a ruler or
rafter-ruler cards so the crew blows it even.

**Worked example (pinned).** A 1,200 sq ft attic, R-38, a cellulose label of 36 bags per
1,000 sq ft, R-3.5 per inch: bags = ceil(1,200 / 1,000 x 36) = ceil(43.2) = **44 bags**;
coverage per bag = 1,000 / 36 = **27.8 sq ft**; minimum thickness = 38 / 3.5 = **10.9 in**.
Cross-check (R-49, a label of 50 bags per 1,000): bags = ceil(1.2 x 50) = **60 bags**;
thickness = 49 / 3.5 = **14.0 in**. Cross-check (blown fiberglass to R-38, a label of 25
bags per 1,000 at R-2.5 per inch): bags = ceil(1.2 x 25) = **30 bags**; thickness = 38 /
2.5 = **15.2 in**. Degenerate inputs (area_sqft <= 0, bags_per_1000 <= 0, r_per_inch <= 0,
target_r <= 0, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the post-v98 live tiles. `insulation-thickness` solves the
*cylindrical conduction* thickness to hold a pipe's surface at a target temperature, and
`insulation-heat-loss` gives the *radial* heat loss of a bare versus insulated pipe -- both
are pipe geometry, not a flat framed assembly and not an attic bag take-off.
`manual-j-heating` and `manual-j-cooling` size the building load but do not break out a
single wall's parallel-path R or count blown-insulation bags. No live tile computes a
whole-assembly framed R-value or a blown-insulation coverage. **Both ship**, into
`calc-hvac.js`.

Per-tile wiring (each of the two): a `tools-data.js` row (group `C`, trades
`["hvac", "insulation", "energy-audit"]`); `tile-meta.js` `_TILES`; a `citations.js` entry
(the `GOVERNANCE.general` governance from Section 1; the formula string; assumptions
listing every bundled constant -- the air-film and finish R-values, the 1.25 R-per-inch of
framing, the framing factors, the U = 1/R reciprocal and area-weighting, and the
1,000-sq-ft chart basis with the settled-thickness note -- naming the ASHRAE Fundamentals,
DOE, and manufacturer-chart references without reproduction);
`test/fixtures/worked-examples.json` (every pinned example and cross-check);
`test/fixtures/compute-map.js` (module path `../../calc-hvac.js`);
`scripts/related-tiles.mjs` (`assembly-r-value` -> `insulation-heat-loss` /
`manual-j-heating` / `blown-insulation-coverage`; `blown-insulation-coverage` ->
`assembly-r-value` / `attic-ventilation` / `manual-j-heating`); `data/search/aliases.json`
(e.g. `assembly-r-value`: "r value", "wall r value", "parallel path", "thermal bridging",
"whole wall r"; `blown-insulation-coverage`: "blown insulation", "insulation bags", "attic
insulation", "cellulose bags", "insulation coverage"); the `app.js` `HVAC_RENDERERS`
declare gains both ids; the `// dims:` annotations; and the regenerated v14 corpus +
tile-index. A `test/unit/bounds-fuzzer.test.js` block pins both worked examples, the
average-U-not-R invariant (the whole-wall R below the center R), the continuous-insulation
both-paths seam, the framing-factor-range seam, the `ceil` bag count, and every error seam.

**Module note.** `calc-hvac.js` is the home of the insulation tiles, so both land there.
After the v89 refrigerant split it sits at about 38.2 KB gzipped against a 41,000 B cap
(~93 percent); the two small tiles fit within the headroom. If the as-built size crosses
the cap, this spec authorizes a documented bump to about **43,000 B** (the v67/v69
pattern) or relocation of a cohesive insulation/envelope bench into a new module (the
spec-v70..v89 precedent -- a `calc-envelope.js` is a natural future home for these and the
pipe-insulation tiles). Either way the module-size gate stays green. Group letter (`C`) is
independent of the module.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate, including the module-size, wiring,
sw-precache, dimensions, corpus, tile-contract, and README-count gates;
`check-readme-counts` agrees at **657 tiles** and the matching sitemap URL count);
`npm test` (+2 worked-example fixtures and their cross-checks; the new bounds-fuzzer
block); `npm run build` (657 tile shells, regenerated sitemap); `npm run data:verify`; the
worked-examples runner; the 320 px shell audit (the framing-path / cavity-path / whole-wall
lines and the bags / coverage / thickness lines all wrap, not scroll, on a phone); and the
full-catalog render-no-nan Chromium sweep plus the a11y gate, with the rendered output read
to the value (a 2x4 R-13 wall -> R-11.1 whole-wall versus R-14.9 center; a 1,200 sq ft
attic to R-38 at 36 bags/1,000 -> 44 bags, 10.9 in).

## 5. Roadmap position

v99 opens the opaque-envelope side of Group C, linking the new tiles to the load and pipe-
insulation bench (`assembly-r-value` feeds the wall U-factor a Manual J load consumes;
`blown-insulation-coverage` pairs with the v98 `attic-ventilation` for an attic job).
Further growth should stay evidence-driven (a named gap an auditor or insulator hits) --
candidates include a **window U-factor / area-weighted whole-wall** heat-loss roll-up, a
**continuous-insulation condensation (dew-point) ratio** check, and a **spray-foam board-
foot** yield tile; none ships without the field need. The standing module-cap watch returns
`calc-hvac.js` to the list, with the `calc-envelope.js` split named here as the relief.
