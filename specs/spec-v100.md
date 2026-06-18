# roughlogic.com Specification v100 -- Shop Fluid Mixing: 2K Paint Ratio and Cutting-Fluid Concentration (Group K, 2 New Tiles)

> **Implementation status: CLOSED -- landed 2026-06-18 (package 0.65.0; specs v90-v100 each targeted a minor individually but landed in one commit, so they stamp a single 0.65.0) (target catalog
> 657 -> 659; 25 groups; a minor stamp).** v100 inherits everything from spec.md through
> spec-v99.md and changes none of it. It adds two tiles to **Group K (Mechanic -- Auto,
> Marine, Aviation, and Machining)** and changes no existing tile's output. **No new
> group, no new dependencies, no telemetry, no AI, US standards only.** `paint-mix-ratio`
> lands in `calc-mechanic.js` (the auto/marine bench); `cutting-fluid-concentration`
> lands in `calc-machining.js` (the machining bench) -- see the §3 module note.
>
> **The gap, and the evidence for it.** Group K turns wrenches and runs the machine shop
> -- `cutting-speed-rpm`, `machining-time`, `material-removal-rate`, `tap-drill-size`,
> `tire-gearing`, `displacement-cr` -- but two everyday *fluid-mixing* numbers a body shop
> and a machine shop run are missing. There is no **2K paint mix-ratio** tile: from a
> ratio like 4:1 or 4:1:1 and a measured base-paint volume, the hardener and reducer to
> add and the total batch, in ounces and milliliters. And there is no **cutting-fluid
> concentration** tile: the running concentration from a refractometer Brix reading and
> the coolant's factor, and the concentrate to add (or the water to add) to bring a sump
> to a target. A concept-check against the post-v99 live ids for paint-mix, mix-ratio,
> cutting-fluid, coolant-concentration, and refractometer returned nothing. The generic
> `dilution` tile (Group G) gives a concentrate-and-diluent split from a *target
> strength* -- a two-component dilution, not an N-part paint ratio split of a fixed base
> and not a refractometer-read sump top-up; `glycol-mix` is an HVAC freeze-curve tile.
> Neither does these two shop mixes. These are daily numbers a painter and a machinist
> reach for.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `paint-mix-ratio` carries a base volume times a dimensionless
  part-ratio to component volumes (volume), summed to a total and converted ounces to
  milliliters; `cutting-fluid-concentration` carries a dimensionless Brix reading times a
  dimensionless factor to a percent, and a sump volume times a dimensionless
  concentration delta over a dimensionless complement to a concentrate (or water) volume.
  Every constant -- the 29.5735 mL per US fluid ounce, the refractometer factor basis, and
  the 100-percent neat-concentrate purity -- is bundled and annotated.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. For
  `paint-mix-ratio`: a non-positive base volume or paint-part returns `{ error }`; a
  negative hardener-part or reducer-part returns `{ error }`; a reducer-part of 0 returns
  a `null` reducer (a valid two-part mix). For `cutting-fluid-concentration`: a negative
  Brix, a non-positive factor or sump volume, or a target outside the open interval
  (0, 100) returns `{ error }`; when the current concentration equals the target the
  action is **"none"** and the dose is exactly zero (a valid result); the dilute branch
  (current above target) returns a water volume, the enrich branch (current below target)
  a concentrate volume.
- The v19/v22 citation discipline applies. Both use **`GOVERNANCE.general`** (these are
  shop mixing arithmetic; the handling cautions are stated as guidance, and the product
  data governs). Sources are named, never reproduced: the **paint manufacturer technical
  data sheet** (the mix ratio is *by volume*, the first number is the base/color, and the
  induction time of roughly 10 to 30 minutes and the pot life of roughly 1 to 4 hours at
  70 degrees F are off the TDS, not computed); the **US fluid-ounce to milliliter**
  conversion; and the **metalworking-fluid refractometer method** (concentration percent
  equals the Brix reading times the fluid's refractometer factor, with the factor and the
  maintenance range -- often about 6 to 10 percent for general machining -- on the
  coolant's data sheet). The factor, ratio, and ranges are inputs the user reads from the
  product; the note states the product data sheet governs.
- Tile ids are kebab-case and checked against the post-v99 live ids. Neither collides with
  `dilution` (Group G), `glycol-mix` (Group B), `tank-mix` (Group L), or any Group K tile
  (see Section 3).

## 2. The tiles

### 2.1 `paint-mix-ratio` -- 2K Paint Mix Ratio (Group K, calc-mechanic.js)

From a ratio and a measured base-paint volume, the hardener and reducer to add and the
total batch, the way a painter mixes off a stick: measure the color, then add the rest by
parts.

```
inputs:
  paint_volume_oz   L    measured base/color volume (fl oz)
  part_paint        -    paint parts of the ratio (the first number; default 4)
  part_hardener     -    hardener (activator) parts (default 1)
  part_reducer      -    reducer parts (default 0 = a two-part mix; 1 for a 4:1:1)

hardener_oz = paint_volume_oz * part_hardener / part_paint
reducer_oz  = part_reducer > 0 ? paint_volume_oz * part_reducer / part_paint : null
total_oz    = paint_volume_oz + hardener_oz + (reducer_oz or 0)
total_ml    = total_oz * 29.5735
```

Outputs: the hardener and (when present) reducer to add, the total batch in fluid ounces
and milliliters, and the ratio echoed back. The note line states: 2K mix ratios are *by
volume*, and the first number is the base/color -- a 4:1 adds one part hardener to four of
paint (20 percent), a 4:1:1 adds a part each of hardener and reducer; measure the color
first and add the rest by parts off a mixing stick or graduated cup; most products want a
short induction (sweat-in) of about 10 to 30 minutes after mixing and have a pot life of
roughly 1 to 4 hours at 70 degrees F that shortens with heat and extra hardener; and the
product data sheet governs the exact ratio, induction, and pot life.

**Worked example (pinned).** 16 fl oz of color at 4:1:1: hardener = 16 x 1 / 4 = **4 oz**;
reducer = 16 x 1 / 4 = **4 oz**; total = 16 + 4 + 4 = **24 oz** = 24 x 29.5735 = **709.8
mL**. Cross-check (a 4:1 two-part mix, reducer part 0): hardener = **4 oz**, reducer =
**null**, total = **20 oz** (591.5 mL). Cross-check (a 3:1 at 24 oz of color): hardener =
24 x 1 / 3 = **8 oz**, total = **32 oz** (946.4 mL). Degenerate inputs (paint_volume_oz
<= 0, part_paint <= 0, a negative hardener-part or reducer-part, non-finite) return an
error; part_reducer = 0 returns a `null` reducer (a valid two-part mix).

### 2.2 `cutting-fluid-concentration` -- Cutting-Fluid Concentration and Top-Up (Group K, calc-machining.js)

The running concentration of a coolant sump from a refractometer Brix reading and the
fluid's factor, and the concentrate to add (or water to add) to bring it to a target.

```
inputs:
  brix_reading       -    refractometer Brix reading
  refractometer_factor -  coolant-specific factor (from the data sheet; typically 1-4)
  sump_volume_gal    L    sump (tank) volume (gal)
  target_pct         -    target concentration (percent; in (0, 100); e.g. 8)

current_pct = brix_reading * refractometer_factor
if current_pct < target_pct:
    action     = "add concentrate"
    add_conc_gal = sump_volume_gal * (target_pct - current_pct) / (100 - target_pct)
elif current_pct > target_pct:
    action     = "add water"
    add_water_gal = sump_volume_gal * (current_pct - target_pct) / target_pct
else:
    action = "none", dose = 0
```

Outputs: the current concentration percent, the action (add concentrate, add water, or
none), and the volume to add. The note line states: read the concentration as the Brix
times the coolant's refractometer factor (on the data sheet, usually between 1 and 4 --
do not assume Brix *is* the concentration); keep the sump in the maker's range, often
about 6 to 10 percent for general machining -- too lean invites rust and bacteria (and the
sour smell), too rich leaves residue and can irritate skin; the concentrate figure here is
the *neat* deficit, but in practice add it as pre-mixed coolant, never neat concentrate
straight into the sump; and skim tramp oil and check the Brix at the same spot and
temperature each time.

**Worked example (pinned).** A Brix of 3.0, a factor of 2.0, a 50 gal sump, an 8 percent
target: current = 3.0 x 2.0 = **6.0 percent**; below target, so **add concentrate** = 50 x
(8 - 6) / (100 - 8) = 50 x 2 / 92 = **1.09 gal**. Cross-check (over-rich, a Brix of 5.0 at
the same factor): current = **10.0 percent**; above target, so **add water** = 50 x (10 -
8) / 8 = 50 x 0.25 = **12.5 gal**. Cross-check (on target, a Brix of 4.0 at factor 2.0):
current = **8.0 percent**, action **none**, dose **0**. Degenerate inputs (a negative
Brix, refractometer_factor <= 0, sump_volume_gal <= 0, target_pct <= 0 or >= 100,
non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the post-v99 live tiles. `dilution` (Group G) splits a batch into
concentrate and diluent from a *target strength* -- a generic two-component dilution, not
an N-part paint ratio that splits a fixed measured base, and not a refractometer-read sump
top-up that branches between adding concentrate and adding water. `glycol-mix` (Group B)
reads an HVAC freeze-point curve for antifreeze, a different domain and a different curve;
`tank-mix` (Group L) batches agricultural spray by acre. No live tile mixes 2K paint by
ratio or reads and corrects a cutting-fluid sump. **Both ship**: `paint-mix-ratio` into
`calc-mechanic.js`, `cutting-fluid-concentration` into `calc-machining.js`.

Per-tile wiring (each of the two): a `tools-data.js` row (group `K`; `paint-mix-ratio`
trades `["auto-body", "mechanic"]`, `cutting-fluid-concentration` trades `["machining",
"mechanic"]`); `tile-meta.js` `_TILES`; a `citations.js` entry (the `GOVERNANCE.general`
governance from Section 1; the formula string; assumptions listing every bundled constant
-- the by-volume ratio basis and the induction/pot-life note, the 29.5735 mL per fluid
ounce, the Brix-times-factor identity and the 6-to-10-percent range, and the neat-versus-
pre-mix caution -- naming the paint TDS and metalworking-fluid refractometer references
without reproduction); `test/fixtures/worked-examples.json` (every pinned example and
cross-check); `test/fixtures/compute-map.js` (`paint-mix-ratio` ->
`../../calc-mechanic.js`; `cutting-fluid-concentration` -> `../../calc-machining.js`);
`scripts/related-tiles.mjs` (`paint-mix-ratio` -> `dilution` /
`cutting-fluid-concentration` / `coating-coverage-dft`; `cutting-fluid-concentration` ->
`cutting-speed-rpm` / `dilution` / `paint-mix-ratio`); `data/search/aliases.json` (e.g.
`paint-mix-ratio`: "paint mixing ratio", "2k paint", "hardener", "reducer", "mix paint";
`cutting-fluid-concentration`: "cutting fluid", "coolant concentration", "refractometer",
"brix coolant", "machine coolant mix"); the `app.js` `MECHANIC_RENDERERS` declare gains
`paint-mix-ratio` and the `MACHINING_RENDERERS` declare gains
`cutting-fluid-concentration`; the `// dims:` annotations; and the regenerated v14 corpus
+ tile-index. A `test/unit/bounds-fuzzer.test.js` block pins both worked examples, the
`null` reducer branch, the three-way concentrate/water/none action branch, and every error
seam.

**Module note.** The two tiles split by trade across two existing modules:
`paint-mix-ratio` is an auto-body tile (`calc-mechanic.js`, at about 16.8 KB gzipped
against an 18,000 B cap -- it has the headroom for one small tile), and
`cutting-fluid-concentration` is a machine-shop tile (`calc-machining.js`, at about 3.1 KB
against a 4,000 B cap; this one tile may push it over, so this spec authorizes a documented
bump of the `calc-machining.js` cap to about **5,000 B**, the v67/v69 pattern). Group
letter (`K`) is independent of the module; both tiles keep `group: "K"`.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate, including the module-size, wiring,
sw-precache, dimensions, corpus, tile-contract, and README-count gates;
`check-readme-counts` agrees at **659 tiles** and the matching sitemap URL count);
`npm test` (+2 worked-example fixtures and their cross-checks; the new bounds-fuzzer
block); `npm run build` (659 tile shells, regenerated sitemap); `npm run data:verify`; the
worked-examples runner; the 320 px shell audit (the hardener / reducer / total lines and
the current-percent / action / dose lines all wrap, not scroll, on a phone); and the
full-catalog render-no-nan Chromium sweep plus the a11y gate, with the rendered output read
to the value (16 oz at 4:1:1 -> 4 oz hardener, 4 oz reducer, 24 oz / 709.8 mL; a Brix 3.0 x
2.0 in a 50 gal sump to 8 percent -> 1.09 gal concentrate, and the over-rich branch -> 12.5
gal water).

## 5. Roadmap position

v100 lands the two everyday shop-fluid mixes, linking `paint-mix-ratio` to the generic
`dilution` and `coating-coverage-dft` and `cutting-fluid-concentration` to the machining
bench. Further growth should stay evidence-driven (a named gap a body shop or machinist
hits) -- candidates include a **spray-gun transfer-efficiency / material-usage** estimate
(distinct from `coating-coverage-dft`'s dry-film coverage), a **tap-and-die thread-cutting
oil / honing** consumable, and a **sump-life / tramp-oil makeup** tracker; none ships
without the field need. The standing module-cap watch adds `calc-machining.js` after this
bump.
